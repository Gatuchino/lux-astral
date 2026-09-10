// Background Function -- hace la llamada real a la IA (puede tardar
// bastante en lecturas Tipo 3/4/5) sin el limite de 10s/60s de una
// Function normal: las Background Functions de Netlify corren hasta
// 15 minutos, PERO no le devuelven la respuesta al cliente que las
// invoco -- por eso el resultado se guarda en Netlify Blobs (store
// "tarot-jobs", una entrada por jobId) y el cliente lo va a buscar
// sondeando (poll) via tarot-interpret.mts con ese mismo jobId.
//
// Ver netlify/functions/tarot-interpret.mts para el lado "start"/"poll"
// de este flujo, y src/pages/Reading.jsx (funcion pollJob) para el lado
// cliente.
import { getStore } from "@netlify/blobs";

function jobsStore() {
  return getStore({ name: "tarot-jobs", consistency: "strong" });
}

async function apiError(res: Response) {
  let detail = "";
  try { detail = await res.text(); } catch (e) {}
  const err: any = new Error("API error " + res.status);
  err.status = res.status;
  err.detail = detail;
  return err;
}

// 2026-09-10 (a pedido de Christian): registro de uso/costo de IA para el
// panel de Setup ("Uso de IA y costos"). Precios en USD por millon de
// tokens (input/output), tomados de las tarifas publicadas por cada
// proveedor a esta fecha -- editables desde Setup (store.settings.aiPricing
// pisa estos valores por defecto sin tocar codigo cuando cambien las
// tarifas). ElevenLabs cobra por caracter, no por token.
const DEFAULT_AI_PRICING: Record<string, any> = {
  anthropic: {
    "claude-haiku-4-5-20251001": { in: 1, out: 5 },
    "claude-sonnet-5": { in: 2, out: 10 },
    "claude-opus-5": { in: 5, out: 25 },
    "claude-fable-5-1": { in: 10, out: 50 },
  },
  openai: {
    "gpt-5.6-luna": { in: 1, out: 6 },
    "gpt-5.6-terra": { in: 2.5, out: 15 },
    "gpt-6-astra": { in: 10, out: 50 },
  },
  glm: {
    "glm-4.5-flash": { in: 0, out: 0 },
    "glm-4.6": { in: 0.6, out: 2.2 },
    "glm-5.3": { in: 1.4, out: 4.4 },
  },
  gemini: {
    "gemini-2.5-flash": { in: 0.3, out: 2.5 },
    "gemini-3.5-flash": { in: 1.5, out: 9 },
    "gemini-2.5-pro": { in: 1.25, out: 10 },
  },
  groq: {
    "llama-3.3-70b-versatile": { in: 0, out: 0 },
  },
  elevenlabs: { perCharUsd: 0.00005 },
};

function calcAiCostUsd(pricing: any, provider: string, model: string, inputTokens: number, outputTokens: number, characters?: number) {
  if (provider === "elevenlabs") {
    const per = pricing?.elevenlabs?.perCharUsd ?? DEFAULT_AI_PRICING.elevenlabs.perCharUsd;
    return (characters || 0) * per;
  }
  const rates = pricing?.[provider]?.[model] || DEFAULT_AI_PRICING[provider]?.[model] || { in: 0, out: 0 };
  return ((inputTokens || 0) / 1e6) * rates.in + ((outputTokens || 0) / 1e6) * rates.out;
}

function bookingStore() {
  return getStore({ name: "booking", consistency: "strong" });
}

async function logAiUsage(entry: { kind: string; provider: string; model: string; inputTokens?: number; outputTokens?: number; characters?: number }) {
  // Fire-and-forget desde el llamador: si esto falla, nunca debe tumbar la
  // entrega de la lectura -- ver el try/catch en el handler mas abajo.
  const store = bookingStore();
  const raw = (await store.get("state", { type: "json" })) as any;
  const data = raw && typeof raw === "object" ? raw : {};
  if (!Array.isArray(data.aiUsageLog)) data.aiUsageLog = [];
  const pricing = data.settings?.aiPricing;
  const costUsd = calcAiCostUsd(pricing, entry.provider, entry.model, entry.inputTokens || 0, entry.outputTokens || 0, entry.characters || 0);
  data.aiUsageLog.push({
    id: crypto.randomUUID(),
    ts: Date.now(),
    kind: String(entry.kind || "").slice(0, 40),
    provider: String(entry.provider || "").slice(0, 20),
    model: String(entry.model || "").slice(0, 60),
    inputTokens: entry.inputTokens || 0,
    outputTokens: entry.outputTokens || 0,
    characters: entry.characters || 0,
    costUsd,
  });
  const cutoff = Date.now() - 180 * 24 * 60 * 60 * 1000; // 180 dias
  data.aiUsageLog = data.aiUsageLog.filter((e: any) => e.ts >= cutoff);
  if (data.aiUsageLog.length > 20000) data.aiUsageLog = data.aiUsageLog.slice(data.aiUsageLog.length - 20000);
  await store.setJSON("state", data);
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

type CallResult = { text: string; inputTokens: number; outputTokens: number };

const PROVIDERS: Record<string, {
  envKey: string;
  defaultModel: string;
  allowedModels: Set<string>;
  call: (prompt: string, maxTokens: number, model: string, apiKey: string) => Promise<CallResult>;
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
      const text = (data.content || []).map((b: any) => b.text || "").join("").trim();
      return { text, inputTokens: data.usage?.input_tokens || 0, outputTokens: data.usage?.output_tokens || 0 };
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
      const text = ((data.choices || [])[0]?.message?.content || "").trim();
      return { text, inputTokens: data.usage?.prompt_tokens || 0, outputTokens: data.usage?.completion_tokens || 0 };
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
        body: JSON.stringify({ model, max_tokens: maxTokens, thinking: { type: "disabled" }, messages: [{ role: "user", content: prompt }] }),
      });
      if (!res.ok) throw await apiError(res);
      const data = await res.json();
      const text = ((data.choices || [])[0]?.message?.content || "").trim();
      return { text, inputTokens: data.usage?.prompt_tokens || 0, outputTokens: data.usage?.completion_tokens || 0 };
    },
  },
  gemini: {
    envKey: "GEMINI_API_KEY",
    defaultModel: "gemini-2.5-flash",
    allowedModels: new Set(["gemini-2.5-flash", "gemini-3.5-flash", "gemini-2.5-pro"]),
    async call(prompt, maxTokens, model, apiKey) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      const generationConfig: any = { maxOutputTokens: maxTokens };
      if (!model.includes("pro")) generationConfig.thinkingConfig = { thinkingBudget: 0 };
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig }),
      });
      if (!res.ok) throw await apiError(res);
      const data = await res.json();
      const parts = data.candidates?.[0]?.content?.parts || [];
      const text = parts.map((p: any) => p.text || "").join("").trim();
      return { text, inputTokens: data.usageMetadata?.promptTokenCount || 0, outputTokens: data.usageMetadata?.candidatesTokenCount || 0 };
    },
  },
  // 2026-09-10: respaldo gratuito para usuarias sin plan pago (ver el
  // ruteo mas abajo) -- Groq no cobra por este modelo, sin tarjeta.
  groq: {
    envKey: "GROQ_API_KEY",
    defaultModel: "llama-3.3-70b-versatile",
    allowedModels: new Set(["llama-3.3-70b-versatile"]),
    async call(prompt, maxTokens, model, apiKey) {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: "user", content: prompt }] }),
      });
      if (!res.ok) throw await apiError(res);
      const data = await res.json();
      const text = ((data.choices || [])[0]?.message?.content || "").trim();
      return { text, inputTokens: data.usage?.prompt_tokens || 0, outputTokens: data.usage?.completion_tokens || 0 };
    },
  },
};

export default async (req: Request, context: any) => {
  let payload: any;
  try {
    payload = await req.json();
  } catch (e) {
    return; // el llamador no lee esta respuesta -- ver comentario arriba
  }
  const { jobId, prompts, maxTokensList, model, provider, readingType, isFollowUp, isFreeUser } = payload || {};
  if (!jobId || !Array.isArray(prompts) || prompts.length === 0) return;

  // 2026-09-10 (a pedido de Christian): las usuarias sin plan pago (Vela,
  // o la lectura gratis diaria) SIEMPRE van a un modelo gratuito -- nunca
  // al que el navegador haya mandado en "provider"/"model" (esa decision
  // es del backend, a partir de isFreeUser, que a su vez sale del ticket
  // emitido en reading-access -- el cliente no puede falsearla). Primero
  // GLM-4.5-Flash (gratis en Z.ai, misma cuenta que ya tenes); si falla o
  // no esta configurada esa clave, reintenta automaticamente con Groq
  // (tambien gratis) antes de rendirse. Las usuarias con plan pago siguen
  // usando el proveedor/modelo que elijas en Setup, como antes.
  let providerId: string;
  let chosenModel: string;
  if (isFreeUser) {
    providerId = "glm";
    chosenModel = "glm-4.5-flash";
  } else {
    providerId = provider && PROVIDERS[provider] ? provider : "anthropic";
    const prov = PROVIDERS[providerId];
    chosenModel = prov.allowedModels.has(model) ? model : prov.defaultModel;
  }

  const callProvider = async (pid: string, mdl: string) => {
    const prov = PROVIDERS[pid];
    const apiKey = Netlify.env.get(prov.envKey);
    if (!apiKey) {
      const err: any = new Error(`Falta ${prov.envKey} en las variables de entorno de Netlify (para usar ${pid}).`);
      err.isConfig = true;
      throw err;
    }
    // Si vino mas de un prompt (lectura Tipo 3/4/5 dividida en grupos para
    // acortar la espera), se generan en PARALELO y se unen en orden -- ver
    // Reading.jsx (requestLLMInterpretation) para como se arman los grupos.
    return Promise.all(
      prompts.map((p: string, i: number) =>
        prov.call(p, effectiveMaxTokens(pid, (maxTokensList && maxTokensList[i]) || 700), mdl, apiKey)
      )
    );
  };

  try {
    let results;
    try {
      results = await callProvider(providerId, chosenModel);
    } catch (e) {
      if (isFreeUser && providerId === "glm") {
        // Respaldo automatico: Z.ai no dio abasto (rate-limit) o no esta
        // configurada la clave -- probamos con Groq antes de fallar.
        providerId = "groq";
        chosenModel = PROVIDERS.groq.defaultModel;
        results = await callProvider(providerId, chosenModel);
      } else {
        throw e;
      }
    }
    // Separador entre partes generadas en paralelo (ver Reading.jsx,
    // requestLLMInterpretation): el cliente lo usa para dibujar un
    // separador ornamental entre bloques de la lectura. Si solo hubo un
    // prompt (Tipo 1/2, o respuesta de seguimiento) no aparece ningun
    // separador -- el texto queda igual que antes.
    const text = results.map((r) => (r.text || "").trim()).filter(Boolean).join("\n\n§§ARCANA-SECTION§§\n\n");
    await jobsStore().setJSON(jobId, { status: "done", text, createdAt: Date.now() });

    // 2026-09-10: registro de uso/costo para el panel de Setup -- con el
    // proveedor/modelo REALMENTE usado (importa si hubo respaldo a Groq).
    // Nunca debe interrumpir la entrega de la lectura (ya se guardo
    // arriba) -- por eso va en su propio try/catch, despues.
    try {
      const inputTokens = results.reduce((sum, r) => sum + (r.inputTokens || 0), 0);
      const outputTokens = results.reduce((sum, r) => sum + (r.outputTokens || 0), 0);
      const kind = isFollowUp ? "reading-followup" : `reading-tipo-${readingType || "?"}`;
      await logAiUsage({ kind, provider: providerId, model: chosenModel, inputTokens, outputTokens });
    } catch (e) {
      // silencioso -- el usuario ya tiene su lectura, no hay nada que mostrarle.
    }
  } catch (e: any) {
    await jobsStore().setJSON(jobId, {
      status: "error",
      error: `No se pudo contactar a ${providerId}.`,
      detail: e?.detail || String((e && e.message) || e),
      createdAt: Date.now(),
    });
  }
};

export const config = {
  background: true,
};
