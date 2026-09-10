// Proxy serverless a ElevenLabs para el botón "Escuchar" (texto a voz).
// La API key vive solo en las variables de entorno de Netlify, nunca en
// el navegador.
//
// POST body: { text: string, voiceId?: string }
// Respuesta: audio/mpeg (binario)

import { getStore } from "@netlify/blobs";

// 2026-09-10 (a pedido de Christian): registro de uso/costo de IA para el
// panel de Setup -- ver el mismo bloque (y su comentario completo) en
// netlify/functions/tarot-generate-background.mts. ElevenLabs cobra por
// caracter, no por token.
const ELEVENLABS_DEFAULT_PRICE_PER_CHAR = 0.00005; // eleven_flash_v2_5, USD/caracter
async function logAiUsage(entry: { kind: string; provider: string; model: string; characters: number }) {
  try {
    const store = getStore({ name: "booking", consistency: "strong" });
    const raw = (await store.get("state", { type: "json" })) as any;
    const data = raw && typeof raw === "object" ? raw : {};
    if (!Array.isArray(data.aiUsageLog)) data.aiUsageLog = [];
    const per = data.settings?.aiPricing?.elevenlabs?.perCharUsd ?? ELEVENLABS_DEFAULT_PRICE_PER_CHAR;
    data.aiUsageLog.push({
      id: crypto.randomUUID(),
      ts: Date.now(),
      kind: entry.kind,
      provider: entry.provider,
      model: entry.model,
      inputTokens: 0,
      outputTokens: 0,
      characters: entry.characters,
      costUsd: entry.characters * per,
    });
    const cutoff = Date.now() - 180 * 24 * 60 * 60 * 1000;
    data.aiUsageLog = data.aiUsageLog.filter((e: any) => e.ts >= cutoff);
    if (data.aiUsageLog.length > 20000) data.aiUsageLog = data.aiUsageLog.slice(data.aiUsageLog.length - 20000);
    await store.setJSON("state", data);
  } catch (e) {
    // silencioso -- nunca debe afectar la entrega del audio.
  }
}

const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // voz premade cálida de ElevenLabs, cambiable desde Setup
// ElevenLabs cobra por caracter y eleven_multilingual_v2 admite hasta 10.000
// por request — dejamos margen (9000) y, si igual hay que recortar, lo hacemos
// en el último punto/salto de línea antes del límite, no a mitad de palabra.
const MAX_CHARS = 9000;
function clipForSpeech(text: string, maxChars: number) {
  if (text.length <= maxChars) return text;
  const slice = text.slice(0, maxChars);
  const lastBreak = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("\n"));
  return lastBreak > maxChars * 0.5 ? slice.slice(0, lastBreak + 1) : slice;
}

async function apiError(res: Response) {
  let detail = "";
  try { detail = await res.text(); } catch (e) {}
  const err: any = new Error("API error " + res.status);
  err.status = res.status;
  err.detail = detail;
  return err;
}

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

  const { text, voiceId } = payload || {};
  if (!text || typeof text !== "string") {
    return new Response(JSON.stringify({ error: 'Falta "text" en el body.' }), { status: 400 });
  }

  const apiKey = Netlify.env.get("ELEVENLABS_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Falta ELEVENLABS_API_KEY en las variables de entorno de Netlify." }),
      { status: 500 }
    );
  }

  const vId = (typeof voiceId === "string" && voiceId.trim()) || DEFAULT_VOICE_ID;
  const clipped = clipForSpeech(text, MAX_CHARS);

  try {
    // Endpoint /stream (en vez del endpoint normal) + modelo eleven_flash_v2_5
    // (en vez de eleven_multilingual_v2): ElevenLabs empieza a mandarnos audio
    // apenas lo genera, y nosotros reenviamos ese stream tal cual al navegador
    // en vez de esperar el audio completo antes de mandar nada (las Functions
    // v2 de Netlify soportan devolver un ReadableStream directo, sin config
    // especial). Esto es lo que baja el "quiero escuchar y tarda 15-20s" — el
    // modelo Flash también genera más rápido (sacrifica un poco de calidad de
    // voz por velocidad) y sigue soportando español sin problema.
    const elRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${vId}/stream`, {
      method: "POST",
      headers: { "content-type": "application/json", "xi-api-key": apiKey, accept: "audio/mpeg" },
      body: JSON.stringify({ text: clipped, model_id: "eleven_flash_v2_5" }),
    });
    if (!elRes.ok) throw await apiError(elRes);
    // No se espera (fire-and-forget): no debe demorar el streaming del audio.
    logAiUsage({ kind: "tts", provider: "elevenlabs", model: "eleven_flash_v2_5", characters: clipped.length });
    return new Response(elRes.body, {
      status: 200,
      headers: { "content-type": "audio/mpeg" },
    });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: "No se pudo generar el audio.", detail: e?.detail || String((e && e.message) || e) }),
      { status: e?.status || 502 }
    );
  }
};
