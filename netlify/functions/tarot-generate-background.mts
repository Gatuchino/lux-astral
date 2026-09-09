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
  let payload: any;
  try {
    payload = await req.json();
  } catch (e) {
    return; // el llamador no lee esta respuesta -- ver comentario arriba
  }
  const { jobId, prompts, maxTokensList, model, provider } = payload || {};
  if (!jobId || !Array.isArray(prompts) || prompts.length === 0) return;

  const providerId = provider && PROVIDERS[provider] ? provider : "anthropic";
  const prov = PROVIDERS[providerId];
  const apiKey = Netlify.env.get(prov.envKey);
  if (!apiKey) {
    await jobsStore().setJSON(jobId, {
      status: "error",
      error: `Falta ${prov.envKey} en las variables de entorno de Netlify (para usar ${providerId}).`,
      createdAt: Date.now(),
    });
    return;
  }
  const chosenModel = prov.allowedModels.has(model) ? model : prov.defaultModel;

  // Si vino mas de un prompt (lectura Tipo 3/4/5 dividida en grupos para
  // acortar la espera), se generan en PARALELO y se unen en orden -- ver
  // Reading.jsx (requestLLMInterpretation) para como se arman los grupos.
  try {
    const texts = await Promise.all(
      prompts.map((p: string, i: number) =>
        prov.call(p, effectiveMaxTokens(providerId, (maxTokensList && maxTokensList[i]) || 700), chosenModel, apiKey)
      )
    );
    const text = texts.map((t) => (t || "").trim()).filter(Boolean).join("\n\n");
    await jobsStore().setJSON(jobId, { status: "done", text, createdAt: Date.now() });
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
