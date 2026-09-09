// Edge Function (Deno) -- version de tarot-interpret que corre en el borde
// de Netlify en vez de en una Function serverless clasica.
//
// Por que: las Functions clasicas de Netlify tienen un limite duro de 10s
// (sync, hasta 26s con soporte) para responder. Las lecturas Tipo 3/4/5
// (maxTokens 1900-2400) tardan mas que eso en generarse y la plataforma
// cortaba la respuesta con un 504 -- eso es lo que Christian vio como
// "el resumen basico de respaldo" en vez de la interpretacion real.
// Las Edge Functions tienen un limite de tiempo de respuesta de headers
// de 40s, y el tiempo que se pasa esperando un fetch() (como esta llamada
// a la IA) NO cuenta contra el limite de CPU de la edge function -- por
// eso alcanza para las respuestas largas sin cambiar el contrato con el
// cliente (sigue devolviendo el mismo { text } que antes).
//
// Intercepta el mismo path que usaba la Function original
// (/.netlify/functions/tarot-interpret, ver "config" al final de este
// archivo) asi que src/pages/Reading.jsx no necesita ningun cambio.
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

export default async (req: Request, context: any) => {
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
    const text = await prov.call(prompt, effectiveMaxTokens(providerId, maxTokens), chosenModel, apiKey);
    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: `No se pudo contactar a ${providerId}.`, detail: e?.detail || String((e && e.message) || e) }),
      { status: e?.status || 502 }
    );
  }
};

export const config = {
  path: "/.netlify/functions/tarot-interpret",
};
