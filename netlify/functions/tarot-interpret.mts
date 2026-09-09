// Netlify Function (Node) con respuesta en streaming.
//
// Historia: esto arranco siendo una Function clasica con limite de 10s
// (sync) para responder -- las lecturas Tipo 3/4/5 (maxTokens 1900-2400)
// tardan mas que eso y la plataforma cortaba con un 504. Se probo mover
// esto a una Edge Function (Deno) para aprovechar su limite de 40s, pero
// el 500 opaco persistio de forma identica (~37s) incluso reescribiendo
// el codigo para mandar los headers antes de llamar a la IA -- algo en
// ese runtime no se comportaba como documentado y no hay logs a mano
// para diagnosticarlo mas.
//
// Solucion real: las Functions clasicas de Netlify (este mismo runtime
// Node que ya usan booking.mts y tarot-tts.mts sin problemas) SI
// soportan devolver un ReadableStream como body -- y cuando lo hacen,
// el limite pasa de 10s a 60s de ejecucion (ver docs.netlify.com/build/
// functions/api). No hace falta Edge Functions para esto: se logra
// streameando la respuesta de Anthropic (SSE) tal cual se generaba en
// la version edge, pero corriendo en el runtime Node ya probado.
import { getStore } from "@netlify/blobs";

const READING_TICKET_TTL_MS = 2 * 60 * 60 * 1000; // 2 horas -- espejo de booking.mts

async function loadBookingStoreForTicket() {
  const store = getStore({ name: "booking", consistency: "strong" });
  const raw = await store.get("state", { type: "json" });
  if (!raw || typeof raw !== "object") return { readingTickets: {} as Record<string, any> };
  if (!raw.readingTickets || typeof raw.readingTickets !== "object") raw.readingTickets = {};
  return raw;
}
async function saveBookingStoreForTicket(data: any) {
  const store = getStore({ name: "booking", consistency: "strong" });
  await store.setJSON("state", data);
}
async function consumeReadingTicket(ticketId: string | undefined, isFollowUp: boolean) {
  if (!ticketId) return { ok: false, error: "Falta el ticket de la lectura." };
  const store = await loadBookingStoreForTicket();
  const ticket = store.readingTickets[ticketId];
  if (!ticket || Date.now() - ticket.createdAt > READING_TICKET_TTL_MS) {
    return { ok: false, error: "Tu sesion de lectura vencio o no es valida -- volve a intentarlo desde el principio." };
  }
  if (isFollowUp) {
    if (ticket.followUpsUsed >= ticket.maxFollowUps) {
      return { ok: false, error: "Ya usaste todas las preguntas de seguimiento que permite tu plan para esta lectura." };
    }
    ticket.followUpsUsed += 1;
    await saveBookingStoreForTicket(store);
  }
  return { ok: true };
}

// ---- Proveedores de IA soportados (elegidos desde el panel de Setup) ----
async function apiError(res: Response) {
  let detail = "";
  try { detail = await res.text(); } catch (e) {}
  const err: any = new Error("API error " + res.status);
  err.status = res.status;
  err.detail = detail;
  return err;
}

// Streaming real (SSE) para Anthropic -- evita esperar la respuesta
// completa antes de empezar a responder. Los headers de la Response
// salen apenas devolvemos el ReadableStream (ver nota mas abajo), y el
// cuerpo se va llenando a medida que llegan los tokens: como la Response
// es streaming, esta Function usa el limite de 60s (no el de 10s de las
// respuestas normales), asi que alcanza sin problema para una lectura
// Tipo 5.
function streamAnthropic(prompt: string, maxTokens: number, model: string, apiKey: string): ReadableStream<Uint8Array> {
  // Esta funcion NO es async y NO espera al fetch de Anthropic antes de
  // devolver el stream -- esa espera se hace adentro de start(), que
  // corre DESPUES de que handler() ya devolvio la Response al cliente.
  // Asi los headers salen de inmediato y el body se va llenando en
  // vivo, sin importar cuanto tarde Anthropic en conectar o generar.
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  let buffer = "";

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const upstream = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({ model, max_tokens: maxTokens, stream: true, messages: [{ role: "user", content: prompt }] }),
        });
        if (!upstream.ok || !upstream.body) {
          const errText = await upstream.text().catch(() => "");
          controller.enqueue(encoder.encode(`[ANTHROPIC_ERROR ${upstream.status}]: ${errText || "sin detalle"}`));
          controller.close();
          return;
        }
        reader = upstream.body.getReader();
      } catch (e: any) {
        controller.enqueue(encoder.encode(`[EDGE_FETCH_ERROR]: ${String((e && e.stack) || (e && e.message) || e)}`));
        controller.close();
      }
    },
    async pull(controller) {
      if (!reader) {
        controller.close();
        return;
      }
      try {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          return;
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // la ultima linea puede venir incompleta
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;
          try {
            const evt = JSON.parse(jsonStr);
            if (evt.type === "content_block_delta" && evt.delta && evt.delta.type === "text_delta") {
              controller.enqueue(encoder.encode(evt.delta.text));
            } else if (evt.type === "error") {
              controller.enqueue(encoder.encode(`\n\n[ANTHROPIC_STREAM_ERROR: ${JSON.stringify(evt.error || evt)}]`));
            }
          } catch (parseErr) {
            // linea SSE incompleta o de un evento que no nos interesa -- se ignora
          }
        }
      } catch (pullErr: any) {
        controller.enqueue(encoder.encode(`\n\n[EDGE_STREAM_ERROR: ${String((pullErr && pullErr.stack) || (pullErr && pullErr.message) || pullErr)}]`));
        controller.close();
      }
    },
    cancel() {
      try {
        reader && reader.cancel();
      } catch (e) {}
    },
  });
}

// OpenAI, GLM y Gemini "piensan" antes de responder (razonamiento oculto que
// gasta del mismo cupo de tokens que la respuesta visible). Con un cupo chico
// el modelo se queda sin lugar para escribir y la respuesta sale cortada a la
// mitad. Anthropic (llamada estándar, sin razonamiento extendido) no lo necesita.
function effectiveMaxTokens(providerId: string, requested: number) {
  const base = requested || 700;
  if (providerId === "anthropic") return base;
  return Math.max(base, 2000);
}

const PROVIDERS: Record<string, {
  envKey: string;
  defaultModel: string;
  allowedModels: Set<string>;
  call: (prompt: string, maxTokens: number, model: string, apiKey: string) => Promise<string>;
}> = {
  anthropic: {
    envKey: "ANTHROPIC_API_KEY",
    defaultModel: "claude-haiku-4-5-20251001",
    allowedModels: new Set(["claude-haiku-4-5-20251001", "claude-sonnet-5", "claude-opus-5", "claude-fable-5-1"]),
    async call(prompt, maxTokens, model, apiKey) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: "user", content: prompt }] }),
      });
      if (!res.ok) throw await apiError(res);
      const data = await res.json();
      return (data.content || []).map((b: any) => b.text || "").join("").trim();
    },
  },
  openai: {
    envKey: "OPENAI_API_KEY",
    defaultModel: "gpt-5.6-luna",
    allowedModels: new Set(["gpt-5.6-luna", "gpt-5.6-terra", "gpt-6-astra"]),
    async call(prompt, maxTokens, model, apiKey) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model, max_completion_tokens: maxTokens, messages: [{ role: "user", content: prompt }] }),
      });
      if (!res.ok) throw await apiError(res);
      const data = await res.json();
      return ((data.choices || [])[0]?.message?.content || "").trim();
    },
  },
  glm: {
    envKey: "GLM_API_KEY",
    defaultModel: "glm-4.5-flash",
    allowedModels: new Set(["glm-4.5-flash", "glm-4.6", "glm-5.3"]),
    async call(prompt, maxTokens, model, apiKey) {
      const res = await fetch("https://api.z.ai/api/paas/v4/chat/completions", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
        // "thinking: disabled" - algunos modelos GLM lo respetan (glm-4.x);
        // en los que no (glm-5.3 tiene razonamiento siempre activo) el cupo
        // extra de effectiveMaxTokens es el que evita el corte.
        body: JSON.stringify({ model, max_tokens: maxTokens, thinking: { type: "disabled" }, messages: [{ role: "user", content: prompt }] }),
      });
      if (!res.ok) throw await apiError(res);
      const data = await res.json();
      return ((data.choices || [])[0]?.message?.content || "").trim();
    },
  },
  gemini: {
    envKey: "GEMINI_API_KEY",
    defaultModel: "gemini-2.5-flash",
    allowedModels: new Set(["gemini-2.5-flash", "gemini-3.5-flash", "gemini-2.5-pro"]),
    async call(prompt, maxTokens, model, apiKey) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      const generationConfig: any = { maxOutputTokens: maxTokens };
      // Los modelos "flash" permiten apagar el razonamiento oculto (no hace
      // falta para escribir una interpretación de tarot). "pro" no lo permite.
      if (!model.includes("pro")) generationConfig.thinkingConfig = { thinkingBudget: 0 };
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig }),
      });
      if (!res.ok) throw await apiError(res);
      const data = await res.json();
      const parts = data.candidates?.[0]?.content?.parts || [];
      return parts.map((p: any) => p.text || "").join("").trim();
    },
  },
};

async function handler(req: Request, context: any) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  let payload;
  try {
    payload = await req.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: "JSON inválido en el body." }), { status: 400 });
  }

  const { prompt, maxTokens, model, provider, ticketId, isFollowUp } = payload || {};
  if (!prompt || typeof prompt !== "string") {
    return new Response(JSON.stringify({ error: 'Falta "prompt" en el body.' }), { status: 400 });
  }
  const ticketCheck = await consumeReadingTicket(ticketId, !!isFollowUp);
  if (!ticketCheck.ok) {
    return new Response(JSON.stringify({ error: ticketCheck.error }), { status: 403 });
  }

  const providerId = provider && PROVIDERS[provider] ? provider : "anthropic";
  const prov = PROVIDERS[providerId];
  const apiKey = Netlify.env.get(prov.envKey);
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: `Falta ${prov.envKey} en las variables de entorno de Netlify (para usar ${providerId}).` }),
      { status: 500 }
    );
  }
  const chosenModel = prov.allowedModels.has(model) ? model : prov.defaultModel;

  try {
    if (providerId === "anthropic") {
      // Streaming real: devolvemos la Response YA, sin esperar a Anthropic --
      // el fetch de verdad ocurre adentro del stream (ver streamAnthropic).
      const stream = streamAnthropic(prompt, effectiveMaxTokens(providerId, maxTokens), chosenModel, apiKey);
      return new Response(stream, {
        status: 200,
        headers: { "content-type": "text/plain; charset=utf-8", "x-tarot-runtime": "node-stream" },
      });
    }
    // OpenAI / GLM / Gemini: se sigue esperando la respuesta completa
    // (todavia no tienen el streaming implementado), pero se envuelve en
    // un stream de un solo pedazo para que el cliente lea siempre igual
    // sin importar el proveedor.
    const text = await prov.call(prompt, effectiveMaxTokens(providerId, maxTokens), chosenModel, apiKey);
    const oneShotStream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(text));
        controller.close();
      },
    });
    return new Response(oneShotStream, {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8", "x-tarot-runtime": "node-stream" },
    });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: `No se pudo contactar a ${providerId}.`, detail: e?.detail || String((e && e.message) || e) }),
      { status: e?.status || 502 }
    );
  }
}

// Envoltorio de seguridad: cualquier excepcion no prevista queda como un
// 500 con el mensaje real en vez de la pagina de error generica de
// Netlify -- asi el banner de error que ya existe en Reading.jsx puede
// mostrar la causa concreta.
export default async (req: Request, context: any) => {
  try {
    return await handler(req, context);
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: "Error interno en tarot-interpret.", detail: String((e && e.stack) || (e && e.message) || e) }),
      { status: 500, headers: { "content-type": "application/json", "x-tarot-runtime": "node-stream" } }
    );
  }
};

