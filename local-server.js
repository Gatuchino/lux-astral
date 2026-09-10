#!/usr/bin/env node
// Servidor local de desarrollo para Arcana — sirve los archivos estáticos
// y emula la función serverless /.netlify/functions/tarot-interpret con
// la misma lógica que corre en Netlify (mismo modelo, mismo prompt).
// Cero dependencias externas — solo Node.js (18+).
//
// Uso:
//   node local-server.js
//   → abrir http://localhost:8888/Arcana.html
//
// Lee ANTHROPIC_API_KEY desde el archivo .env (misma carpeta) o desde
// la variable de entorno si ya está seteada en la terminal.

const http = require('http');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const crypto = require('crypto');

const PORT = process.env.PORT || 8888;
const ROOT = __dirname;

function loadEnv() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (!(key in process.env)) process.env[key] = val;
  }
}
loadEnv();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.jsx': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// ---- Proveedores de IA soportados (elegidos desde el panel de Setup) ----
async function apiError(res) {
  let detail = '';
  try { detail = await res.text(); } catch (e) {}
  const err = new Error('API error ' + res.status);
  err.status = res.status;
  err.detail = detail;
  return err;
}

// OpenAI, GLM y Gemini "piensan" antes de responder (razonamiento oculto que
// gasta del mismo cupo de tokens que la respuesta visible). Con un cupo chico
// el modelo se queda sin lugar para escribir y la respuesta sale cortada a la
// mitad. Anthropic (llamada estándar, sin razonamiento extendido) no lo necesita.
function effectiveMaxTokens(providerId, requested) {
  const base = requested || 700;
  if (providerId === 'anthropic') return base;
  return Math.max(base, 2000);
}

const PROVIDERS = {
  anthropic: {
    envKey: 'ANTHROPIC_API_KEY',
    defaultModel: 'claude-haiku-4-5-20251001',
    allowedModels: new Set(['claude-haiku-4-5-20251001', 'claude-sonnet-5', 'claude-opus-5', 'claude-fable-5-1']),
    async call(prompt, maxTokens, model, apiKey) {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] }),
      });
      if (!res.ok) throw await apiError(res);
      const data = await res.json();
      const text = (data.content || []).map((b) => b.text || '').join('').trim();
      return { text, inputTokens: data.usage?.input_tokens || 0, outputTokens: data.usage?.output_tokens || 0 };
    },
  },
  openai: {
    envKey: 'OPENAI_API_KEY',
    defaultModel: 'gpt-5.6-luna',
    allowedModels: new Set(['gpt-5.6-luna', 'gpt-5.6-terra', 'gpt-6-astra']),
    async call(prompt, maxTokens, model, apiKey) {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model, max_completion_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] }),
      });
      if (!res.ok) throw await apiError(res);
      const data = await res.json();
      const text = ((data.choices || [])[0]?.message?.content || '').trim();
      return { text, inputTokens: data.usage?.prompt_tokens || 0, outputTokens: data.usage?.completion_tokens || 0 };
    },
  },
  glm: {
    envKey: 'GLM_API_KEY',
    defaultModel: 'glm-4.5-flash',
    allowedModels: new Set(['glm-4.5-flash', 'glm-4.6', 'glm-5.3']),
    async call(prompt, maxTokens, model, apiKey) {
      const res = await fetch('https://api.z.ai/api/paas/v4/chat/completions', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
        // "thinking: disabled" - algunos modelos GLM lo respetan (glm-4.x);
        // en los que no (glm-5.3 tiene razonamiento siempre activo) el cupo
        // extra de effectiveMaxTokens es el que evita el corte.
        body: JSON.stringify({ model, max_tokens: maxTokens, thinking: { type: 'disabled' }, messages: [{ role: 'user', content: prompt }] }),
      });
      if (!res.ok) throw await apiError(res);
      const data = await res.json();
      const text = ((data.choices || [])[0]?.message?.content || '').trim();
      return { text, inputTokens: data.usage?.prompt_tokens || 0, outputTokens: data.usage?.completion_tokens || 0 };
    },
  },
  gemini: {
    envKey: 'GEMINI_API_KEY',
    defaultModel: 'gemini-2.5-flash',
    allowedModels: new Set(['gemini-2.5-flash', 'gemini-3.5-flash', 'gemini-2.5-pro']),
    async call(prompt, maxTokens, model, apiKey) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      const generationConfig = { maxOutputTokens: maxTokens };
      // Los modelos "flash" permiten apagar el razonamiento oculto (no hace
      // falta para escribir una interpretación de tarot). "pro" no lo permite.
      if (!model.includes('pro')) generationConfig.thinkingConfig = { thinkingBudget: 0 };
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig }),
      });
      if (!res.ok) throw await apiError(res);
      const data = await res.json();
      const parts = data.candidates?.[0]?.content?.parts || [];
      const text = parts.map((p) => p.text || '').join('').trim();
      return { text, inputTokens: data.usageMetadata?.promptTokenCount || 0, outputTokens: data.usageMetadata?.candidatesTokenCount || 0 };
    },
  },
};

// tarot-interpret local sigue el mismo contrato "iniciador + sondeo" que
// la version de Netlify (netlify/functions/tarot-interpret.mts +
// tarot-generate-background.mts), aunque aca no hace falta background
// function real: el servidor local no tiene limite de duracion de
// respuesta, asi que el POST inicial dispara la llamada a la IA (sin
// esperarla) y responde YA con {jobId}; el primer sondeo del cliente la
// encuentra resuelta (o resolviendose) en este Map en memoria.
const localInterpretJobs = new Map(); // jobId -> { status, text?, error?, detail?, createdAt }

async function handleInterpret(req, res) {
  let body = '';
  req.on('data', (chunk) => (body += chunk));
  req.on('end', async () => {
    let payload;
    try {
      payload = JSON.parse(body || '{}');
    } catch (e) {
      res.writeHead(400, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'JSON inválido.' }));
      return;
    }

    // ---- Modo "poll" ----
    if (payload && payload.jobId) {
      const job = localInterpretJobs.get(payload.jobId);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(job || { status: 'error', error: 'El trabajo no existe o expiro.' }));
      return;
    }

    // ---- Modo "start" ----
    const { prompts, maxTokensList, model, provider, ticketId, isFollowUp, readingType } = payload || {};
    if (!Array.isArray(prompts) || prompts.length === 0 || !prompts.every((p) => typeof p === 'string' && p)) {
      res.writeHead(400, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'Falta "prompts" (array).' }));
      return;
    }
    // 2026-09-08: nunca se gasta un llamado a la IA sin haber pasado antes
    // por reading-access (que valida el plan real / el cupo gratis diario y
    // emite este ticket) -- ver RESPONSE_TYPE_MAX_FOLLOWUPS mas arriba.
    const ticketStore = loadBookingStore();
    pruneReadingTickets(ticketStore);
    const ticket = ticketId ? ticketStore.readingTickets[ticketId] : null;
    if (!ticket) {
      res.writeHead(403, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'Tu sesion de lectura vencio o no es valida -- volve a intentarlo desde el principio.' }));
      return;
    }
    if (isFollowUp) {
      if (ticket.followUpsUsed >= ticket.maxFollowUps) {
        res.writeHead(403, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'Ya usaste todas las preguntas de seguimiento que permite tu plan para esta lectura.' }));
        return;
      }
      ticket.followUpsUsed += 1;
      saveBookingStore(ticketStore);
    }
    const providerId = PROVIDERS[provider] ? provider : 'anthropic';
    const prov = PROVIDERS[providerId];
    const apiKey = process.env[prov.envKey];
    const jobId = crypto.randomUUID();
    if (!apiKey) {
      const msg = `Falta ${prov.envKey} (agregala al archivo .env en esta carpeta para usar ${providerId}).`;
      console.error('[tarot-interpret]', msg);
      localInterpretJobs.set(jobId, { status: 'error', error: msg, createdAt: Date.now() });
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ jobId }));
      return;
    }
    const chosenModel = prov.allowedModels.has(model) ? model : prov.defaultModel;
    localInterpretJobs.set(jobId, { status: 'pending', createdAt: Date.now() });
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ jobId }));
    // Si vino mas de un prompt (lectura Tipo 3/4/5 dividida en grupos), se
    // generan en paralelo y se unen en orden -- mismo contrato que
    // tarot-generate-background.mts en produccion.
    try {
      const results = await Promise.all(
        prompts.map((p, i) => prov.call(p, effectiveMaxTokens(providerId, (maxTokensList && maxTokensList[i]) || 700), chosenModel, apiKey))
      );
      // Mismo separador que tarot-generate-background.mts en produccion
      // (ver comentario alli) -- para que el front dibuje el divisor
      // ornamental entre partes tambien en desarrollo local.
      const text = results.map((r) => (r.text || '').trim()).filter(Boolean).join('\n\n§§ARCANA-SECTION§§\n\n');
      localInterpretJobs.set(jobId, { status: 'done', text, createdAt: Date.now() });
      try {
        const inputTokens = results.reduce((sum, r) => sum + (r.inputTokens || 0), 0);
        const outputTokens = results.reduce((sum, r) => sum + (r.outputTokens || 0), 0);
        const kind = isFollowUp ? 'reading-followup' : `reading-tipo-${readingType || '?'}`;
        const usageStore = loadBookingStore();
        logAiUsage(usageStore, { kind, provider: providerId, model: chosenModel, inputTokens, outputTokens });
        saveBookingStore(usageStore);
      } catch (e) {
        // silencioso -- el usuario ya tiene su lectura, no hay nada que mostrarle.
      }
    } catch (e) {
      console.error('[tarot-interpret]', providerId, chosenModel, e.status || '', e.detail || e.message || e);
      localInterpretJobs.set(jobId, {
        status: 'error',
        error: `No se pudo contactar a ${providerId}.`,
        detail: e.detail || String((e && e.message) || e),
        createdAt: Date.now(),
      });
    }
  });
}

// ---- ElevenLabs text-to-speech (botón "Escuchar") ----
const ELEVENLABS_DEFAULT_VOICE = '21m00Tcm4TlvDq8ikWAM'; // voz premade cálida, cambiable desde Setup
// ElevenLabs cobra por caracter y eleven_multilingual_v2 admite hasta 10.000
// por request — dejamos margen (9000) y, si igual hay que recortar, lo hacemos
// en el último punto/salto de línea antes del límite, no a mitad de palabra.
const ELEVENLABS_MAX_CHARS = 9000;
function clipForSpeech(text, maxChars) {
  if (text.length <= maxChars) return text;
  const slice = text.slice(0, maxChars);
  const lastBreak = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('\n'));
  return lastBreak > maxChars * 0.5 ? slice.slice(0, lastBreak + 1) : slice;
}

async function handleTTS(req, res) {
  let body = '';
  req.on('data', (chunk) => (body += chunk));
  req.on('end', async () => {
    let payload;
    try {
      payload = JSON.parse(body || '{}');
    } catch (e) {
      res.writeHead(400, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'JSON inválido.' }));
      return;
    }
    const { text, voiceId } = payload || {};
    if (!text || typeof text !== 'string') {
      res.writeHead(400, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'Falta "text".' }));
      return;
    }
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      const msg = 'Falta ELEVENLABS_API_KEY (agregala al archivo .env en esta carpeta para usar la voz).';
      console.error('[tarot-tts]', msg);
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: msg }));
      return;
    }
    const vId = (typeof voiceId === 'string' && voiceId.trim()) || ELEVENLABS_DEFAULT_VOICE;
    const clipped = clipForSpeech(text, ELEVENLABS_MAX_CHARS);
    try {
      // Endpoint /stream (en vez del endpoint normal) + modelo eleven_flash_v2_5
      // (en vez de eleven_multilingual_v2): ElevenLabs empieza a mandarnos audio
      // apenas lo genera, y nosotros lo reenviamos al navegador a medida que
      // llega, en vez de esperar el audio completo antes de mandar nada. Esto
      // es lo que baja el "quiero escuchar y tarda 15-20s" — el modelo Flash
      // también genera más rápido (sacrifica un poco de calidad de voz por
      // velocidad) y sigue soportando español sin problema.
      const elRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${vId}/stream`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'xi-api-key': apiKey, accept: 'audio/mpeg' },
        body: JSON.stringify({ text: clipped, model_id: 'eleven_flash_v2_5' }),
      });
      if (!elRes.ok) throw await apiError(elRes);
      try {
        const usageStore = loadBookingStore();
        logAiUsage(usageStore, { kind: 'tts', provider: 'elevenlabs', model: 'eleven_flash_v2_5', characters: clipped.length });
        saveBookingStore(usageStore);
      } catch (e) {
        // silencioso -- nunca debe afectar la entrega del audio.
      }
      res.writeHead(200, { 'content-type': 'audio/mpeg' });
      Readable.fromWeb(elRes.body).pipe(res);
    } catch (e) {
      console.error('[tarot-tts]', e.status || '', e.detail || e.message || e);
      res.writeHead(e.status || 502, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'No se pudo generar el audio.', detail: e.detail || String((e && e.message) || e) }));
    }
  });
}

// =====================================================================
// Reservas de sesiones de video (Marketplace real) — PayPal (Orders API
// v2, cobramos directo con nuestra cuenta Business) + store compartido en
// un JSON local (en producción esto mismo vive en Netlify Blobs, ver
// netlify/functions/booking.mts). Cero dependencias: PayPal se llama por
// fetch crudo (misma filosofía que el resto del server).
// =====================================================================
const BOOKING_STORE_PATH = path.join(ROOT, 'data', 'booking-store.json');
const DEFAULT_SETTINGS = { sessionBasePrice: 22, planDiscounts: { luna: 10, estrella: 15, oraculo: 20 }, platformCommissionPct: 25 };

// 2026-09-08 (a pedido de Christian): panel de Setup con acceso real por
// email + contraseña, no solo un gate cosmético. store.settings.powerUsers
// es la lista de correos autorizados; store.settings.setupPasswordHash es
// un hash sha256 de la contraseña (nunca se guarda en texto plano). El
// login (acción "setup-login") verifica ambas cosas y devuelve un token de
// sesión corto (store.setupSessions) que el navegador manda de ahí en más
// en vez de repetir la contraseña en cada llamada. Semilla inicial: solo
// cdiaz.delaigue@gmail.com, contraseña "Oficina123$" — el propio usuario
// puede cambiarla o agregar otros correos una vez adentro (ver acciones
// setup-change-password / setup-add-power-user / setup-remove-power-user).
const DEFAULT_POWER_USERS = ['cdiaz.delaigue@gmail.com'];

// 2026-09-08 (boletín diario, a pedido de Christian): la carta que usa el
// boletín es SIEMPRE la misma "carta del día" que ve cualquier usuaria en
// la plataforma (misma fórmula determinística que App.jsx) — la IA no
// elige otra, solo escribe la interpretación/consejo a partir de esa
// carta real. Todo lo demás (horario de envío, fechas especiales tipo
// Navidad/Año Nuevo, y el template HTML) es configurable desde Setup —
// ver store.settings.newsletter*. El template arranca desde
// templates/newsletter-daily.html (el diseño que mandó Christian) y
// desde ahí se puede editar/reemplazar sin tocar código. El disparo
// AUTOMÁTICO (cron / scheduled function) queda pendiente de la decisión
// de hosting — por ahora el envío es manual, con los botones de Setup.
const NEWSLETTER_TEMPLATE_PATH = path.join(ROOT, 'templates', 'newsletter-daily.html');
const DEFAULT_NEWSLETTER_SCHEDULE = { hour: 8, minute: 0, daysOfWeek: [0, 1, 2, 3, 4, 5, 6] };
const DEFAULT_NEWSLETTER_SPECIAL_DATES = [
  { date: '01-01', label_es: 'Año Nuevo', label_en: 'New Year' },
  { date: '05-01', label_es: 'Día del Trabajo', label_en: 'Labor Day' },
  { date: '12-25', label_es: 'Navidad', label_en: 'Christmas' },
];
function loadDefaultNewsletterTemplate() {
  try {
    return fs.readFileSync(NEWSLETTER_TEMPLATE_PATH, 'utf8');
  } catch (e) {
    return '';
  }
}
const DEFAULT_SETUP_PASSWORD = 'Oficina123$';
const SETUP_SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 horas
// Variable de entorno legacy, opcional: si Christian la define, también
// sirve como contraseña maestra de respaldo (no reemplaza el sistema de
// arriba, solo se suma como capa extra).
const ARCANA_SETUP_PASSWORD = process.env.ARCANA_SETUP_PASSWORD || '';

// 2026-09-09 (a pedido de Christian) -- ver booking.mts para el detalle
// completo comentado: cuentas reales con email + contrasena, obligatorias
// desde el primer ingreso. store.users / store.userSessions y
// requireUserAuth() cierran el hueco donde cualquiera podia escribir el
// email de otra socia y el backend se lo creia.
const USER_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias
// 2026-09-10 (a pedido de Christian) -- ver booking.mts para el detalle
// completo comentado: verificacion de email real. El signup ya no crea
// la cuenta ni una sesion -- guarda un "pendingSignup" y manda un email
// con un link; la cuenta recien se crea cuando se confirma ese link
// (accion "verify-email").
const PENDING_SIGNUP_TTL_MS = 48 * 60 * 60 * 1000; // 48 horas

function hashSetupPassword(pw) {
  return crypto.createHash('sha256').update(String(pw || '')).digest('hex');
}
function isPowerUser(store, email) {
  const e = (email || '').trim().toLowerCase();
  return !!e && Array.isArray(store.settings.powerUsers) && store.settings.powerUsers.includes(e);
}
function pruneSetupSessions(store) {
  const now = Date.now();
  for (const token of Object.keys(store.setupSessions)) {
    if (now - store.setupSessions[token].createdAt > SETUP_SESSION_TTL_MS) delete store.setupSessions[token];
  }
}
// Devuelve el email autorizado si `payload` (POST) o un objeto equivalente
// armado desde query params (GET) trae un setupToken válido y vigente de
// alguien que sigue en la lista de power users, o si coincide la
// contraseña legacy de ARCANA_SETUP_PASSWORD. null si no está autorizado.
function isAdminAuthorized(store, payload) {
  pruneSetupSessions(store);
  const token = payload && payload.setupToken;
  const session = token ? store.setupSessions[token] : null;
  if (session && isPowerUser(store, session.email)) return session.email;
  if (ARCANA_SETUP_PASSWORD && payload && payload.adminPassword === ARCANA_SETUP_PASSWORD) return 'admin';
  return null;
}
function requireAdmin(store, payload, actionName) {
  const email = isAdminAuthorized(store, payload);
  if (email) {
    logEvent(store, { email, type: 'admin-action', detail: { action: actionName } });
    saveBookingStore(store);
  }
  return email;
}

// 2026-09-10 (a pedido de Christian): panel "Uso de IA y costos" en Setup
// -- ver el comentario completo en netlify/functions/booking.mts (misma
// lógica acá). Registro de cada consulta a un proveedor de IA con sus
// tokens (o caracteres, para ElevenLabs) y el costo USD calculado con la
// tarifa vigente (store.settings.aiPricing, editable desde Setup, pisa
// estos valores por defecto).
const DEFAULT_AI_PRICING = {
  anthropic: {
    'claude-haiku-4-5-20251001': { in: 1, out: 5 },
    'claude-sonnet-5': { in: 2, out: 10 },
    'claude-opus-5': { in: 5, out: 25 },
    'claude-fable-5-1': { in: 10, out: 50 },
  },
  openai: {
    'gpt-5.6-luna': { in: 1, out: 6 },
    'gpt-5.6-terra': { in: 2.5, out: 15 },
    'gpt-6-astra': { in: 10, out: 50 },
  },
  glm: {
    'glm-4.5-flash': { in: 0, out: 0 },
    'glm-4.6': { in: 0.6, out: 2.2 },
    'glm-5.3': { in: 1.4, out: 4.4 },
  },
  gemini: {
    'gemini-2.5-flash': { in: 0.3, out: 2.5 },
    'gemini-3.5-flash': { in: 1.5, out: 9 },
    'gemini-2.5-pro': { in: 1.25, out: 10 },
  },
  elevenlabs: { perCharUsd: 0.00005 },
};
function calcAiCostUsd(pricing, provider, model, inputTokens, outputTokens, characters) {
  if (provider === 'elevenlabs') {
    const per = pricing?.elevenlabs?.perCharUsd ?? DEFAULT_AI_PRICING.elevenlabs.perCharUsd;
    return (characters || 0) * per;
  }
  const rates = pricing?.[provider]?.[model] || DEFAULT_AI_PRICING[provider]?.[model] || { in: 0, out: 0 };
  return ((inputTokens || 0) / 1e6) * rates.in + ((outputTokens || 0) / 1e6) * rates.out;
}
function logAiUsage(store, entry) {
  if (!Array.isArray(store.aiUsageLog)) store.aiUsageLog = [];
  const costUsd = calcAiCostUsd(store.settings?.aiPricing, entry.provider, entry.model, entry.inputTokens || 0, entry.outputTokens || 0, entry.characters || 0);
  store.aiUsageLog.push({
    id: crypto.randomUUID(),
    ts: Date.now(),
    kind: String(entry.kind || '').slice(0, 40),
    provider: String(entry.provider || '').slice(0, 20),
    model: String(entry.model || '').slice(0, 60),
    inputTokens: entry.inputTokens || 0,
    outputTokens: entry.outputTokens || 0,
    characters: entry.characters || 0,
    costUsd,
  });
  const cutoff = Date.now() - 180 * 24 * 60 * 60 * 1000;
  store.aiUsageLog = store.aiUsageLog.filter((e) => e.ts >= cutoff);
  if (store.aiUsageLog.length > 20000) store.aiUsageLog = store.aiUsageLog.slice(store.aiUsageLog.length - 20000);
}
function buildAiUsageSummary(store) {
  const log = Array.isArray(store.aiUsageLog) ? store.aiUsageLog : [];
  const dayKey = (ts) => new Date(ts).toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });
  const bump = (map, key, e) => {
    if (!map[key]) map[key] = { queries: 0, inputTokens: 0, outputTokens: 0, characters: 0, costUsd: 0 };
    map[key].queries += 1;
    map[key].inputTokens += e.inputTokens || 0;
    map[key].outputTokens += e.outputTokens || 0;
    map[key].characters += e.characters || 0;
    map[key].costUsd += e.costUsd || 0;
  };
  const byDay = {};
  const byMonth = {};
  const byKind = {};
  const byModel = {};
  const totals = { queries: 0, inputTokens: 0, outputTokens: 0, characters: 0, costUsd: 0 };
  log.forEach((e) => {
    const dk = dayKey(e.ts);
    bump(byDay, dk, e);
    bump(byMonth, dk.slice(0, 7), e);
    bump(byKind, e.kind || 'otro', e);
    bump(byModel, `${e.provider || '?'} / ${e.model || '?'}`, e);
    totals.queries += 1;
    totals.inputTokens += e.inputTokens || 0;
    totals.outputTokens += e.outputTokens || 0;
    totals.characters += e.characters || 0;
    totals.costUsd += e.costUsd || 0;
  });
  const today = dayKey(Date.now());
  const month = today.slice(0, 7);
  const recent = log.slice().sort((a, b) => b.ts - a.ts).slice(0, 80);
  return {
    totals,
    todayCostUsd: (byDay[today] && byDay[today].costUsd) || 0,
    monthCostUsd: (byMonth[month] && byMonth[month].costUsd) || 0,
    byDay, byMonth, byKind, byModel, recent,
    pricing: store.settings?.aiPricing || {},
    defaultPricing: DEFAULT_AI_PRICING,
  };
}
// 2026-09-08 (a pedido de Christian): panel "Informes" en Setup — accesos
// por usuario, tiempo aproximado en la plataforma, secciones visitadas, y
// los movimientos de negocio (altas/bajas de membresía, ingresos). Nunca
// incluye el contenido de una lectura ni las preguntas que hizo alguien —
// eso sigue siendo confidencial de cada usuaria, según pidió Christian.
function buildReports(store) {
  const events = Array.isArray(store.eventLog) ? store.eventLog : [];
  const SESSION_GAP_MS = 30 * 60 * 1000; // más de 30 min sin actividad = nueva sesión
  const byEmail = {};
  events.forEach((e) => {
    if (!e.email) return;
    if (!byEmail[e.email]) byEmail[e.email] = [];
    byEmail[e.email].push(e);
  });
  const users = Object.keys(byEmail).map((email) => {
    const evs = byEmail[email].slice().sort((a, b) => a.ts - b.ts);
    let sessions = 0;
    let totalMs = 0;
    let sessionStart = null;
    let lastTs = null;
    const pages = new Set();
    evs.forEach((e) => {
      if (e.type === 'page-visit' && e.detail && e.detail.page) pages.add(e.detail.page);
      if (sessionStart === null || e.ts - lastTs > SESSION_GAP_MS) {
        if (sessionStart !== null) totalMs += lastTs - sessionStart;
        sessions += 1;
        sessionStart = e.ts;
      }
      lastTs = e.ts;
    });
    if (sessionStart !== null) totalMs += lastTs - sessionStart;
    return {
      email,
      lastAccess: evs[evs.length - 1].ts,
      sessions,
      minutesOnPlatform: Math.round(totalMs / 60000),
      pagesVisited: Array.from(pages),
      eventCount: evs.length,
    };
  }).sort((a, b) => b.lastAccess - a.lastAccess);
  const movements = events
    .filter((e) => e.type !== 'page-visit' && e.type !== 'admin-action' && e.type !== 'setup-login')
    .slice().sort((a, b) => b.ts - a.ts).slice(0, 200);
  const adminActions = events
    .filter((e) => e.type === 'admin-action' || e.type === 'setup-login')
    .slice().sort((a, b) => b.ts - a.ts).slice(0, 200);
  return { users, movements, adminActions, totalEvents: events.length };
}
function logEvent(store, { email, type, detail }) {
  if (!Array.isArray(store.eventLog)) store.eventLog = [];
  store.eventLog.push({
    id: crypto.randomUUID(),
    ts: Date.now(),
    email: (email || '').trim().toLowerCase(),
    type: String(type || '').slice(0, 40),
    detail: detail && typeof detail === 'object' ? detail : {},
  });
  // Tope simple para que el archivo no crezca sin límite: nos quedamos con
  // los últimos 5000 eventos, y de paso podamos lo más viejo que 90 días.
  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
  store.eventLog = store.eventLog.filter((e) => e.ts >= cutoff);
  if (store.eventLog.length > 5000) store.eventLog = store.eventLog.slice(store.eventLog.length - 5000);
}

function hashAccountPassword(pw, saltHex) {
  const salt = saltHex ? Buffer.from(saltHex, 'hex') : crypto.randomBytes(16);
  const hash = crypto.pbkdf2Sync(String(pw || ''), salt, 100000, 32, 'sha256');
  return { hash: hash.toString('hex'), salt: salt.toString('hex') };
}
function verifyAccountPassword(pw, saltHex, hashHex) {
  if (!saltHex || !hashHex) return false;
  const { hash } = hashAccountPassword(pw, saltHex);
  return hash === hashHex;
}
function findUserByEmail(store, email) {
  const e = (email || '').trim().toLowerCase();
  return store.users.find((u) => u.email === e) || null;
}
function pruneUserSessions(store) {
  const now = Date.now();
  for (const token of Object.keys(store.userSessions)) {
    if (now - store.userSessions[token].createdAt > USER_SESSION_TTL_MS) delete store.userSessions[token];
  }
}
function prunePendingSignups(store) {
  const now = Date.now();
  for (const email of Object.keys(store.pendingSignups)) {
    if (now - store.pendingSignups[email].createdAt > PENDING_SIGNUP_TTL_MS) delete store.pendingSignups[email];
  }
}
function requireUserAuth(store, payload) {
  pruneUserSessions(store);
  const token = payload && payload.sessionToken;
  const session = token ? store.userSessions[token] : null;
  if (!session) return null;
  const user = findUserByEmail(store, session.email);
  if (!user) return null;
  return user.email;
}
function publicUser(store, email) {
  const user = findUserByEmail(store, email);
  if (!user) return null;
  return { email: user.email, name: user.name || '', gender: user.gender || null, photo: user.photo || null, createdAt: user.createdAt || null };
}

function loadBookingStore() {
  try {
    const raw = fs.readFileSync(BOOKING_STORE_PATH, 'utf8');
    const store = JSON.parse(raw);
    if (!store.settings) store.settings = { ...DEFAULT_SETTINGS };
    if (!store.settings.planDiscounts) store.settings.planDiscounts = { ...DEFAULT_SETTINGS.planDiscounts };
    if (!Array.isArray(store.tarotists)) store.tarotists = [];
    if (!Array.isArray(store.bookings)) store.bookings = [];
    if (!Array.isArray(store.subscribers)) store.subscribers = [];
    if (!store.freeReadingUsage || typeof store.freeReadingUsage !== 'object') store.freeReadingUsage = {};
    if (!store.readingTickets || typeof store.readingTickets !== 'object') store.readingTickets = {};
    if (!store.readingsByEmail || typeof store.readingsByEmail !== 'object') store.readingsByEmail = {};
    if (!store.readingsMigrated || typeof store.readingsMigrated !== 'object') store.readingsMigrated = {};
    if (!store.feedback || typeof store.feedback !== 'object') store.feedback = { ratings: [], suggestions: [] };
    if (!Array.isArray(store.settings.powerUsers) || !store.settings.powerUsers.length) {
      store.settings.powerUsers = [...DEFAULT_POWER_USERS];
    }
    if (!store.settings.setupPasswordHash) {
      store.settings.setupPasswordHash = hashSetupPassword(DEFAULT_SETUP_PASSWORD);
    }
    if (!store.setupSessions || typeof store.setupSessions !== 'object') store.setupSessions = {};
    if (!Array.isArray(store.eventLog)) store.eventLog = [];
    if (!Array.isArray(store.aiUsageLog)) store.aiUsageLog = [];
    if (!Array.isArray(store.users)) store.users = [];
    if (!store.userSessions || typeof store.userSessions !== 'object') store.userSessions = {};
    if (!store.pendingSignups || typeof store.pendingSignups !== 'object') store.pendingSignups = {};
    if (!store.settings.newsletterTemplate) store.settings.newsletterTemplate = loadDefaultNewsletterTemplate();
    if (!store.settings.newsletterSchedule || typeof store.settings.newsletterSchedule !== 'object') {
      store.settings.newsletterSchedule = { ...DEFAULT_NEWSLETTER_SCHEDULE };
    }
    if (!Array.isArray(store.settings.newsletterSpecialDates)) {
      store.settings.newsletterSpecialDates = [...DEFAULT_NEWSLETTER_SPECIAL_DATES];
    }
    if (typeof store.settings.siteBaseUrl !== 'string') store.settings.siteBaseUrl = '';
    return store;
  } catch (e) {
    // Primera vez: sembrar con la tarotista propia del sitio (sin horarios
    // todavía — se cargan desde Setup) para que el Marketplace no salga vacío.
    return {
      tarotists: [
        {
          id: 'arcana-live',
          name: 'Lux Astral — Live',
          initials: 'LA',
          specialty_es: 'Lectura ceremonial en vivo',
          specialty_en: 'Live ceremonial reading',
          style_es: 'Rider-Waite · Cruz Celta · lectura pausada',
          style_en: 'Rider-Waite · Celtic Cross · unhurried',
          color: '#d4a85a',
          status: 'online',
          rate: DEFAULT_SETTINGS.sessionBasePrice,
          meetingLink: '',
          rating: 5.0,
          years: 1,
          readings: 0,
          availability: [],
        },
      ],
      bookings: [],
      subscribers: [],
      freeReadingUsage: {},
      readingTickets: {},
      readingsByEmail: {},
      readingsMigrated: {},
      feedback: { ratings: [], suggestions: [] },
      settings: {
        ...DEFAULT_SETTINGS,
        powerUsers: [...DEFAULT_POWER_USERS],
        setupPasswordHash: hashSetupPassword(DEFAULT_SETUP_PASSWORD),
        newsletterTemplate: loadDefaultNewsletterTemplate(),
        newsletterSchedule: { ...DEFAULT_NEWSLETTER_SCHEDULE },
        newsletterSpecialDates: [...DEFAULT_NEWSLETTER_SPECIAL_DATES],
        siteBaseUrl: '',
      },
      setupSessions: {},
      eventLog: [],
      aiUsageLog: [],
      users: [],
      userSessions: {},
      pendingSignups: {},
    };
  }
}

function saveBookingStore(store) {
  fs.mkdirSync(path.dirname(BOOKING_STORE_PATH), { recursive: true });
  fs.writeFileSync(BOOKING_STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
}

function genId(prefix) {
  return prefix + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
}
function genBookingAccessCode() {
  const hex = '0123456789ABCDEF';
  let s = '';
  for (let i = 0; i < 6; i++) s += hex[Math.floor(Math.random() * 16)];
  return 'LUX-' + s;
}

// Un slot está disponible si nadie lo pagó todavía y no está "reservado en
// caliente" (alguien yendo hacia PayPal ahora mismo, cae solo a los 15 min
// si abandona el pago — evita doble venta sin necesitar un cron job).
function slotIsAvailable(slot) {
  if (slot.booked) return false;
  if (slot.reservedUntil && new Date(slot.reservedUntil).getTime() > Date.now()) return false;
  return true;
}

function publicTarotists(store) {
  return store.tarotists.map((tr) => ({
    ...tr,
    availability: tr.availability.filter((s) => new Date(s.startsAt).getTime() > Date.now()),
  }));
}

// PayPal: nosotros somos el vendedor (no un Merchant of Record como
// Paddle) — cobramos directo con la Orders API v2. Flujo: creamos una
// "order" con el precio ya calculado (checkout), el botón de PayPal en
// el navegador la usa para abrir el popup de pago, y cuando el cliente
// aprueba, el frontend nos pide capturarla (confirm). Nunca confiamos en
// que el navegador "diga" que se pagó — la captura es lo que de verdad
// mueve el dinero, y la hacemos siempre contra la API de PayPal.
function paypalApiBase() {
  return (process.env.PAYPAL_ENV || 'sandbox') === 'production'
    ? 'https://api-m.paypal.com/'
    : 'https://api-m.sandbox.paypal.com/';
}

let paypalTokenCache = { token: null, expiresAt: 0 };

async function paypalGetAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    const err = new Error('Faltan PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET (agregalos al archivo .env en esta carpeta para poder cobrar sesiones de video).');
    err.isConfig = true;
    throw err;
  }
  if (paypalTokenCache.token && paypalTokenCache.expiresAt > Date.now() + 30000) {
    return paypalTokenCache.token;
  }
  const res = await fetch(paypalApiBase() + 'v1/oauth2/token', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'),
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error_description || 'No se pudo autenticar con PayPal');
    err.status = res.status;
    err.detail = data;
    throw err;
  }
  paypalTokenCache = { token: data.access_token, expiresAt: Date.now() + (data.expires_in || 300) * 1000 };
  return data.access_token;
}

async function paypalFetch(pathSuffix, { method = 'GET', json: jsonBody } = {}) {
  const token = await paypalGetAccessToken(); // tira err.isConfig si faltan las credenciales
  const headers = { Authorization: 'Bearer ' + token };
  let body;
  if (jsonBody !== undefined) {
    headers['content-type'] = 'application/json';
    body = JSON.stringify(jsonBody);
  }
  const res = await fetch(paypalApiBase() + pathSuffix, { method, headers, body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error((data.message) || 'Error de PayPal');
    err.status = res.status;
    err.detail = data;
    throw err;
  }
  return data;
}

// =====================================================================
// Suscripciones (PayPal Subscriptions/Billing API) — cobro recurrente
// real. Identificamos a la suscriptora por email (sin login todavía,
// mismo patrón que usan las reservas). En vez de webhooks (necesitan un
// endpoint HTTPS público que este server local no tiene), verificamos el
// estado en vivo contra PayPal cada vez que importa (al pagar una sesión
// con descuento, o cuando el panel de Setup pide la lista).
// =====================================================================
const SUBSCRIPTION_PLAN_DEFS = [
  { key: 'luna_month', name: 'Lux Astral — Luna (mensual)', value: '6.00', unit: 'MONTH' },
  { key: 'luna_year', name: 'Lux Astral — Luna (anual)', value: '60.00', unit: 'YEAR' },
  { key: 'estrella_month', name: 'Lux Astral — Estrella (mensual)', value: '9.00', unit: 'MONTH' },
  { key: 'estrella_year', name: 'Lux Astral — Estrella (anual)', value: '90.00', unit: 'YEAR' },
  { key: 'oraculo_month', name: 'Lux Astral — Oráculo (mensual)', value: '24.00', unit: 'MONTH' },
  { key: 'oraculo_year', name: 'Lux Astral — Oráculo (anual)', value: '240.00', unit: 'YEAR' },
];

// Idempotente: si ya guardamos los IDs de los planes en settings, no vuelve
// a crear nada en PayPal (crear el mismo plan dos veces generaría duplicados
// visibles para las clientas). Solo se llama cuando Christian aprieta el
// botón de "Provisionar planes" en Setup.
async function paypalEnsureSubscriptionPlans(store) {
  // Idempotente POR PLAN (no todo-o-nada) — así si se agrega un plan nuevo
  // (ej. Estrella) más adelante, "Provisionar" solo crea el que falta y no
  // duplica los que ya existen en la cuenta de PayPal de Christian.
  let productId = store.settings.paypalProductId;
  if (!productId) {
    const product = await paypalFetch('v1/catalogs/products', {
      method: 'POST',
      json: { name: 'Lux Astral — Membresía', type: 'SERVICE', category: 'SOFTWARE' },
    });
    productId = product.id;
    store.settings.paypalProductId = productId;
  }
  const planIds = { ...(store.settings.paypalPlanIds || {}) };
  for (const def of SUBSCRIPTION_PLAN_DEFS) {
    if (planIds[def.key]) continue; // ya existe, no lo recreamos
    const plan = await paypalFetch('v1/billing/plans', {
      method: 'POST',
      json: {
        product_id: productId,
        name: def.name,
        billing_cycles: [{
          frequency: { interval_unit: def.unit, interval_count: 1 },
          tenure_type: 'REGULAR',
          sequence: 1,
          total_cycles: 0,
          pricing_scheme: { fixed_price: { value: def.value, currency_code: 'USD' } },
        }],
        payment_preferences: { auto_bill_outstanding: true, setup_fee_failure_action: 'CONTINUE', payment_failure_threshold: 2 },
      },
    });
    planIds[def.key] = plan.id;
  }
  store.settings.paypalPlanIds = planIds;
  return planIds;
}

// Plan de retención (oferta al cancelar): 25% off por UN ciclo de
// facturación y después vuelve solo al precio normal — se modela con un
// plan de PayPal de 2 ciclos (esto es nativo de la Billing API, no
// necesita ningún cron para "revertir" el precio después). Se crea la
// primera vez que hace falta (idempotente, igual que los planes
// normales) — no requiere apretar nada en Setup.
async function paypalEnsureRetentionPlan(store, planKey, billing) {
  const def = SUBSCRIPTION_PLAN_DEFS.find((d) => d.key === `${planKey}_${billing}`);
  if (!def) throw new Error(`Plan desconocido: ${planKey}_${billing}`);
  const retainKey = `${planKey}_${billing}_retain`;
  const ids = { ...(store.settings.paypalRetentionPlanIds || {}) };
  if (ids[retainKey]) return ids[retainKey];

  let productId = store.settings.paypalProductId;
  if (!productId) {
    const product = await paypalFetch('v1/catalogs/products', {
      method: 'POST',
      json: { name: 'Lux Astral — Membresía', type: 'SERVICE', category: 'SOFTWARE' },
    });
    productId = product.id;
    store.settings.paypalProductId = productId;
  }
  const fullPrice = Number(def.value);
  const discounted = (Math.round(fullPrice * 0.75 * 100) / 100).toFixed(2);
  const plan = await paypalFetch('v1/billing/plans', {
    method: 'POST',
    json: {
      product_id: productId,
      name: `${def.name} — retención (25% off, 1 ciclo)`,
      billing_cycles: [
        {
          frequency: { interval_unit: def.unit, interval_count: 1 },
          tenure_type: 'REGULAR',
          sequence: 1,
          total_cycles: 1, // un solo ciclo con descuento
          pricing_scheme: { fixed_price: { value: discounted, currency_code: 'USD' } },
        },
        {
          frequency: { interval_unit: def.unit, interval_count: 1 },
          tenure_type: 'REGULAR',
          sequence: 2,
          total_cycles: 0, // de ahí en más, indefinido al precio normal
          pricing_scheme: { fixed_price: { value: def.value, currency_code: 'USD' } },
        },
      ],
      payment_preferences: { auto_bill_outstanding: true, setup_fee_failure_action: 'CONTINUE', payment_failure_threshold: 2 },
    },
  });
  ids[retainKey] = plan.id;
  store.settings.paypalRetentionPlanIds = ids;
  saveBookingStore(store);
  return plan.id;
}

// Verifica en vivo contra PayPal si un email tiene una suscripción activa.
// Si PayPal falla momentáneamente (red, mantenimiento), no rompemos el
// checkout: confiamos en el último estado que guardamos.
async function verifySubscriberByEmail(store, email) {
  const key = (email || '').trim().toLowerCase();
  if (!key) return false;
  const sub = store.subscribers.find((s) => s.email === key);
  if (!sub) return false;
  // Membresías ad-honores (otorgadas a mano desde Setup, sin PayPal de por
  // medio) — su estado vive 100% en nuestro store, nunca llamamos a PayPal.
  if (sub.source === 'honorary') return sub.status === 'ACTIVE';
  if (!sub.subscriptionId) return false;
  try {
    const data = await paypalFetch(`v1/billing/subscriptions/${sub.subscriptionId}`);
    sub.status = data.status;
    sub.updatedAt = new Date().toISOString();
    return data.status === 'ACTIVE';
  } catch (e) {
    if (!e.isConfig) console.error('[booking:subscriber-check]', e.status || '', e.detail || e.message);
    return sub.status === 'ACTIVE';
  }
}

// =====================================================================
// Planes y límites de uso (Vela/Luna/Estrella/Oráculo) — 2026-09-07,
// a pedido de Christian: el plan gratis (Vela) ya no es ilimitado.
// =====================================================================
// 2026-09-08, a pedido de Christian: Luna y Estrella ahora ELIGEN su tipo de
// respuesta (dentro de un rango según su plan) en vez de tener uno fijo.
// Oráculo no elige: el Tipo 5 (sesión completa) es exclusivo de Oráculo.
const PLAN_RESPONSE_TYPE_OPTIONS = {
  luna: ['1', '2', '3'],
  estrella: ['1', '2', '3', '4'],
  oraculo: ['5'],
};
// Si no llega una preferencia válida (o algo fuera de rango para el plan),
// usamos el tipo más completo que le corresponda a ese plan.
const PLAN_RESPONSE_TYPE_DEFAULT = { luna: '3', estrella: '4', oraculo: '5' };
const FREE_ALLOWED_SPREADS = ['daily', 'three'];
const FREE_RESPONSE_TYPE = '2';
const FREE_DAILY_LIMIT = 1;

// 2026-09-08, a pedido de Christian (auditoria): antes, tarot-interpret
// (el endpoint que de verdad le pide la respuesta a la IA) no sabia nada
// de planes ni limites -- se podia llamar directo, saltandose reading-access
// por completo (cupo gratis diario incluido) y pidiendo preguntas de
// seguimiento sin tope. Ahora reading-access emite un "ticket" corto que
// tarot-interpret exige y valida antes de gastar un llamado a la IA.
// RESPONSE_TYPE_MAX_FOLLOWUPS es espejo de RESPONSE_TYPES en Reading.jsx.
const RESPONSE_TYPE_MAX_FOLLOWUPS = { '1': 0, '2': 0, '3': 0, '4': 2, '5': 5 };
const READING_TICKET_TTL_MS = 2 * 60 * 60 * 1000; // 2 horas, alcanza para una conversacion de lectura

function pruneReadingTickets(store) {
  const now = Date.now();
  for (const id of Object.keys(store.readingTickets)) {
    if (now - store.readingTickets[id].createdAt > READING_TICKET_TTL_MS) delete store.readingTickets[id];
  }
}
function issueReadingTicket(store, email, responseType) {
  pruneReadingTickets(store);
  const ticketId = crypto.randomUUID();
  store.readingTickets[ticketId] = {
    email,
    responseType,
    maxFollowUps: RESPONSE_TYPE_MAX_FOLLOWUPS[responseType] || 0,
    followUpsUsed: 0,
    createdAt: Date.now(),
  };
  return ticketId;
}

// Antes usaban toISOString() (UTC) — el cupo gratis diario y la sesión
// mensual de Oráculo se reseteaban a medianoche UTC, que para Chile es
// 20-21h de la tarde, no medianoche real. Ahora se calcula en hora de
// Santiago (Intl maneja el offset vigente automáticamente).
function todayKey() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' }); // YYYY-MM-DD, hora Chile
}
function monthKey() {
  return todayKey().slice(0, 7); // YYYY-MM, hora Chile
}

// Decide si una lectura se puede generar y con qué tipo de respuesta —
// según el plan (si el email tiene suscripción activa) o el límite del
// plan Vela (gratis) si no. Muta store.freeReadingUsage cuando corresponde
// (cuenta la consulta gratis del día), por eso quien llama debe guardar el
// store después.
async function resolveReadingAccess(store, email, spread, preferredResponseType) {
  const key = (email || '').trim().toLowerCase();
  if (!key || !key.includes('@')) {
    return { allowed: false, reason: 'email-required' };
  }
  const isSub = await verifySubscriberByEmail(store, key);
  const sub = isSub ? store.subscribers.find((s) => s.email === key) : null;
  if (isSub && sub && PLAN_RESPONSE_TYPE_OPTIONS[sub.planKey]) {
    // El navegador puede sugerir un tipo (lo que eligió la usuaria en
    // pantalla), pero nunca confiamos en eso solo: si no es una opción
    // válida para su plan, usamos el default de ese plan.
    const options = PLAN_RESPONSE_TYPE_OPTIONS[sub.planKey];
    const responseType = options.includes(preferredResponseType)
      ? preferredResponseType
      : PLAN_RESPONSE_TYPE_DEFAULT[sub.planKey];
    const ticketId = issueReadingTicket(store, key, responseType);
    return { allowed: true, responseType, planKey: sub.planKey, responseTypeOptions: options, ticketId };
  }
  // Plan Vela (gratis): 1 consulta al día, solo carta del día o tirada de 3.
  if (!FREE_ALLOWED_SPREADS.includes(spread)) {
    return { allowed: false, reason: 'spread-not-allowed' };
  }
  const today = todayKey();
  const usage = store.freeReadingUsage[key];
  const countToday = usage && usage.date === today ? usage.count : 0;
  if (countToday >= FREE_DAILY_LIMIT) {
    return { allowed: false, reason: 'daily-limit' };
  }
  store.freeReadingUsage[key] = { date: today, count: countToday + 1 };
  const ticketId = issueReadingTicket(store, key, FREE_RESPONSE_TYPE);
  return { allowed: true, responseType: FREE_RESPONSE_TYPE, planKey: 'vela', ticketId };
}

// Oráculo incluye 1 sesión de video gratis por mes de facturación — se
// verifica siempre en el servidor (nunca se confía en lo que mande el
// navegador) contra `sub.lastFreeSessionMonth`.
async function checkOraculoFreeSlot(store, email) {
  const key = (email || '').trim().toLowerCase();
  const isSub = await verifySubscriberByEmail(store, key);
  const sub = isSub ? store.subscribers.find((s) => s.email === key) : null;
  if (!isSub || !sub || sub.planKey !== 'oraculo') return { eligible: false };
  const mk = monthKey();
  if (sub.lastFreeSessionMonth === mk) return { eligible: false, sub, monthKey: mk };
  return { eligible: true, sub, monthKey: mk };
}

// =====================================================================
// Membresías ad-honores + newsletter (Resend) — 2026-09-07, a pedido de
// Christian: poder regalar Luna/Estrella a mano desde Setup, un flujo de
// activación con página de bienvenida (para regaladas Y para las que
// pagan de verdad), y un boletín diario opcional por email. Cero SDK:
// Resend se llama con fetch crudo, misma filosofía que PayPal/Daily.
// =====================================================================
const HONORARY_PLAN_KEYS = ['luna', 'estrella', 'oraculo'];

async function resendSend(to, subject, html, opts = {}) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    const err = new Error('Falta RESEND_API_KEY (agregala al archivo .env en esta carpeta para poder mandar emails).');
    err.isConfig = true;
    throw err;
  }
  const from = process.env.RESEND_FROM || 'Lux Astral <hola@luxastral.com>';
  const body = { from, to: [to], subject, html };
  if (opts.replyTo) body.reply_to = opts.replyTo;
  if (opts.attachments && opts.attachments.length) {
    body.attachments = opts.attachments.map((a) => ({
      filename: a.filename,
      content: a.content,
      ...(a.contentType ? { content_type: a.contentType } : {}),
      ...(a.contentId ? { content_id: a.contentId } : {}),
    }));
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || 'Error de Resend');
    err.status = res.status;
    err.detail = data;
    throw err;
  }
  return data;
}

function verifyEmailHtml(verifyUrl, es) {
  const title = es ? 'Confirmá tu email' : 'Confirm your email';
  const body = es
    ? 'Hacé clic abajo para confirmar tu cuenta en Lux Astral y empezar a usarla.'
    : 'Click below to confirm your Lux Astral account and start using it.';
  const cta = es ? 'Confirmar mi email' : 'Confirm my email';
  return `<div style="font-family:Georgia,serif;background:#0f0a24;color:#f0e2c0;padding:32px;text-align:center;">
    <h1 style="color:#d4a85a;font-size:22px;">${title}</h1>
    <p style="font-size:15px;line-height:1.6;max-width:420px;margin:16px auto;">${body}</p>
    <a href="${verifyUrl}" style="display:inline-block;margin-top:16px;padding:12px 28px;background:#d4a85a;color:#0f0a24;text-decoration:none;border-radius:8px;font-weight:bold;">${cta}</a>
  </div>`;
}

function registrationNotifyHtml(name, email) {
  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  return `<div style="font-family:Georgia,serif;background:#0f0a24;color:#f0e2c0;padding:32px;">
    <h1 style="color:#d4a85a;font-size:20px;">Nuevo registro en Lux Astral</h1>
    <p style="font-size:15px;line-height:1.6;">
      <strong>Nombre:</strong> ${esc(name || '(sin nombre)')}<br/>
      <strong>Email:</strong> ${esc(email)}
    </p>
  </div>`;
}

function contactMessageHtml(name, email, message) {
  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  return `<div style="font-family:Georgia,serif;background:#0f0a24;color:#f0e2c0;padding:32px;">
    <h1 style="color:#d4a85a;font-size:20px;">Nuevo mensaje de contacto</h1>
    <p style="font-size:15px;line-height:1.6;">
      <strong>Nombre:</strong> ${esc(name || '(sin nombre)')}<br/>
      <strong>Email:</strong> ${esc(email)}
    </p>
    <p style="font-size:15px;line-height:1.7;white-space:pre-wrap;border-top:1px solid #3a3060;padding-top:16px;margin-top:16px;">${esc(message)}</p>
  </div>`;
}

function activationEmailHtml(planKey, activationUrl, es) {
  const planName = { luna: 'Luna', estrella: 'Estrella' }[planKey] || planKey;
  const title = es ? `¡Te regalamos una membresía ${planName}!` : `You've been gifted a ${planName} membership!`;
  const body = es
    ? `Alguien de Lux Astral te otorgó una membresía <strong>${planName}</strong>, sin costo. Hacé clic abajo para activarla y ver tu bienvenida.`
    : `Someone at Lux Astral gifted you a <strong>${planName}</strong> membership, free of charge. Click below to activate it and see your welcome.`;
  const cta = es ? 'Activar mi membresía' : 'Activate my membership';
  return `<div style="font-family:Georgia,serif;background:#0f0a24;color:#f0e2c0;padding:32px;text-align:center;">
    <h1 style="color:#d4a85a;font-size:22px;">${title}</h1>
    <p style="font-size:15px;line-height:1.6;max-width:420px;margin:16px auto;">${body}</p>
    <a href="${activationUrl}" style="display:inline-block;margin-top:16px;padding:12px 28px;background:#d4a85a;color:#0f0a24;text-decoration:none;border-radius:8px;font-weight:bold;">${cta}</a>
  </div>`;
}

// Carga src/data/cards.js (un IIFE que arma window.TAROT_CARDS) en un
// sandbox mínimo de Node, para reusar exactamente los mismos datos que
// usa el cliente (nombre, keywords) sin duplicarlos a mano.
let _tarotCardsCache = null;
function loadTarotCardsData() {
  if (_tarotCardsCache) return _tarotCardsCache;
  const code = fs.readFileSync(path.join(ROOT, 'src', 'data', 'cards.js'), 'utf8');
  const sandbox = {};
  const fn = new Function('window', code + '\n;return window.TAROT_CARDS;');
  _tarotCardsCache = fn(sandbox);
  return _tarotCardsCache;
}

// assets/cards/NN-slug.jpg — el prefijo NN (id con cero a la izquierda) es
// estable; el slug varía respecto de card.key (ej. id 2 = "priestess" en
// cards.js, pero el archivo es "02-high-priestess.jpg"), así que buscamos
// por prefijo en vez de intentar reconstruir el nombre de archivo.
function cardImageFilename(id) {
  try {
    const dir = path.join(ROOT, 'assets', 'cards');
    const prefix = String(id).padStart(2, '0') + '-';
    const files = fs.readdirSync(dir);
    return files.find((f) => f.startsWith(prefix)) || null;
  } catch (e) {
    return null;
  }
}

// Misma fórmula determinística que App.jsx (dailyCard) — mismo día, misma
// carta, para toda la plataforma. Se calcula en hora de Santiago (mismo
// criterio que todayKey()) para que coincida con el resto de los resets
// diarios del sitio.
function computeDailyMajorCard() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago', year: 'numeric', month: 'numeric', day: 'numeric',
  }).formatToParts(new Date());
  const get = (t) => Number(parts.find((p) => p.type === t).value);
  const year = get('year');
  const month = get('month') - 1; // 0-indexed, igual que Date#getMonth()
  const day = get('day');
  const key = `${year}-${month}-${day}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  const cards = loadTarotCardsData();
  const idx = Math.abs(hash) % cards.major.length;
  const monthDay = `${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return { card: cards.major[idx], monthDay };
}

function findSpecialDate(store, monthDay) {
  const list = Array.isArray(store.settings.newsletterSpecialDates) ? store.settings.newsletterSpecialDates : [];
  return list.find((d) => d && d.date === monthDay) || null;
}

// Sustitución simple {{clave}} → valor. Si falta una clave, deja el
// placeholder tal cual (más fácil de detectar un typo en el template que
// un textito vacío).
function renderNewsletterTemplate(template, vars) {
  return String(template || '').replace(/\{\{(\w+)\}\}/g, (m, key) => (key in vars ? String(vars[key]) : m));
}

// Contenido del boletín diario. La carta es SIEMPRE la carta del día real
// de la plataforma (nunca la inventa la IA) — la IA solo redacta la
// interpretación y el consejo a partir de esa carta (y, si corresponde,
// de la fecha especial configurada en Setup). El resultado se inyecta en
// el template HTML (store.settings.newsletterTemplate, editable desde
// Setup) reemplazando los {{placeholders}}.
async function generateNewsletterContent(store, siteBaseUrl) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const err = new Error('Falta ANTHROPIC_API_KEY para generar el boletín.');
    err.isConfig = true;
    throw err;
  }
  const { card, monthDay } = computeDailyMajorCard();
  const special = findSpecialDate(store, monthDay);
  const cardNameDisplay = card.name_es;
  const keywords = (card.keywords_es || []).join(' · ').toUpperCase();
  const specialNote = special
    ? `Hoy es una fecha especial: ${special.label_es}. Sin dejar de hablar de la carta indicada, que el CONSEJO del día tenga en cuenta ese espíritu.`
    : '';
  const prompt = `Sos la voz de Lux Astral, una plataforma de tarot elegante y cálida, editorial (no "esotérico recargado"). La carta del día YA está definida: "${cardNameDisplay}" (palabras clave: ${keywords}). No elijas otra carta, escribí sobre esta.
${specialNote}
Escribí en español, tono cálido y místico pero sobrio, sin markdown ni negritas:
1) INTERPRETACION: 2 a 3 frases breves interpretando "${cardNameDisplay}" para hoy, en segunda persona.
2) FRASE: una frase corta e inspiradora (menos de 14 palabras) para citar entre comillas.
3) CONSEJO_TITULO: un título de 2 a 4 palabras para un consejo práctico del día.
4) CONSEJO: 2 a 3 frases breves con un consejo práctico y positivo para afrontar el día, conectado con la carta.
Respondé EXACTAMENTE en este formato, sin nada antes ni después:
INTERPRETACION: <texto>
---
FRASE: <texto>
---
CONSEJO_TITULO: <texto>
---
CONSEJO: <texto>`;
  const aiResult = await PROVIDERS.anthropic.call(prompt, 900, PROVIDERS.anthropic.defaultModel, apiKey);
  const text = aiResult.text;
  try {
    const usageStore = loadBookingStore();
    logAiUsage(usageStore, { kind: 'newsletter', provider: 'anthropic', model: PROVIDERS.anthropic.defaultModel, inputTokens: aiResult.inputTokens, outputTokens: aiResult.outputTokens });
    saveBookingStore(usageStore);
  } catch (e) {
    // silencioso -- nunca debe impedir el envío del boletín.
  }
  const parts = text.split('---').map((p) => p.trim());
  const pick = (label, fallback) => {
    const p = parts.find((x) => x.toUpperCase().startsWith(label + ':'));
    const v = p ? p.slice(p.indexOf(':') + 1).trim() : '';
    return v || fallback;
  };
  const interpretacion = pick('INTERPRETACION', text.trim());
  const frase = pick('FRASE', '');
  const consejoTitulo = pick('CONSEJO_TITULO', 'Un consejo para hoy');
  const consejo = pick('CONSEJO', '');

  const base = (siteBaseUrl || '').replace(/\/$/, '');
  const cardFile = cardImageFilename(card.id);
  const fechaLarga = new Intl.DateTimeFormat('es-CL', {
    timeZone: 'America/Santiago', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date());
  const fechaCapitalizada = fechaLarga.charAt(0).toUpperCase() + fechaLarga.slice(1);

  const template = store.settings.newsletterTemplate || loadDefaultNewsletterTemplate();
  const html = renderNewsletterTemplate(template, {
    fecha_larga: fechaCapitalizada,
    nombre_carta: cardNameDisplay.toUpperCase(),
    palabras_clave: keywords,
    interpretacion_carta: interpretacion,
    frase_destacada: frase,
    titulo_consejo: consejoTitulo,
    consejo_dia: consejo,
    url_imagen_carta: cardFile ? `${base}/assets/cards/${cardFile}` : '',
    url_imagen_consejo: `${base}/assets/newsletter/consejo.jpg`,
    url_sitio: base,
  });
  return { cardName: cardNameDisplay, html };
}

function newsletterEmailHtml(cardName, bodyHtml) {
  return `<div style="font-family:Georgia,serif;background:#0f0a24;color:#f0e2c0;padding:32px;">
    <p style="color:#b3a8c8;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Lux Astral · Boletín diario</p>
    <h1 style="color:#d4a85a;font-size:22px;margin-top:4px;">${cardName}</h1>
    <div style="font-size:15px;line-height:1.7;">${bodyHtml}</div>
    <p style="margin-top:28px;font-size:11px;color:#6b6188;">Recibís esto porque activaste el boletín diario en tu perfil de Lux Astral.</p>
  </div>`;
}

// Daily.co: cada sesión pagada tiene su propia sala de video embebida.
// Cero SDK — un solo POST con fetch crudo, igual que con PayPal/Paddle/Stripe.
// Si no hay DAILY_API_KEY configurada (o falla la creación de la sala), no
// rompemos el flujo de pago: la reserva queda igual confirmada y se usa el
// link manual (Zoom/Meet) que la tarotista cargó en Setup, como antes.
function dailyFetch(pathSuffix, { method = 'GET', json: jsonBody } = {}) {
  const key = process.env.DAILY_API_KEY;
  if (!key) {
    const err = new Error('Falta DAILY_API_KEY.');
    err.isConfig = true;
    return Promise.reject(err);
  }
  const headers = { Authorization: 'Bearer ' + key };
  let body;
  if (jsonBody !== undefined) {
    headers['content-type'] = 'application/json';
    body = JSON.stringify(jsonBody);
  }
  return fetch('https://api.daily.co/v1/' + pathSuffix, { method, headers, body }).then(async (res) => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error((data.info) || data.error || 'Error de Daily');
      err.status = res.status;
      err.detail = data;
      throw err;
    }
    return data;
  });
}

// Crea la sala una sola vez por reserva (idempotente — si ya tiene
// videoRoomUrl, no hace nada) y calcula la ventana en la que se puede
// entrar: desde 10 minutos antes del horario hasta el fin de la sesión
// + 20 minutos de margen.
async function ensureVideoRoom(booking, tr, slot) {
  if (booking.videoRoomUrl || !slot) return;
  const startMs = new Date(slot.startsAt).getTime();
  const durationMin = slot.durationMin || 30;
  const nbf = Math.floor((startMs - 10 * 60 * 1000) / 1000);
  const exp = Math.floor((startMs + durationMin * 60 * 1000 + 20 * 60 * 1000) / 1000);
  try {
    const room = await dailyFetch('rooms', {
      method: 'POST',
      json: {
        name: 'lux-' + booking.id,
        privacy: 'public',
        properties: {
          nbf, exp,
          max_participants: 2,
          enable_chat: true,
          enable_screenshare: false,
          eject_at_room_exp: true,
        },
      },
    });
    booking.videoRoomUrl = room.url;
  } catch (e) {
    if (!e.isConfig) console.error('[booking:daily]', e.status || '', e.detail || e.message);
    // sin sala de Daily -> el frontend cae al link manual de la tarotista
  }
  booking.videoJoinFrom = new Date(nbf * 1000).toISOString();
  booking.videoJoinUntil = new Date(exp * 1000).toISOString();
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, obj) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(obj));
}

async function handleBooking(req, res, url) {
  try {
    if (req.method === 'GET') {
      const action = url.searchParams.get('action');
      const store = loadBookingStore();
      if (action === 'tarotistas') {
        return sendJson(res, 200, {
          tarotists: publicTarotists(store),
          settings: store.settings,
          paypalClientId: process.env.PAYPAL_CLIENT_ID || '',
        });
      }
      if (action === 'my-bookings') {
        const email = (url.searchParams.get('email') || '').trim().toLowerCase();
        const list = store.bookings
          .filter((b) => b.status === 'paid' && b.customerEmail.toLowerCase() === email)
          .map((b) => {
            const tr = store.tarotists.find((x) => x.id === b.tarotistId);
            const slot = tr && tr.availability.find((s) => s.id === b.slotId);
            return {
              id: b.id, accessCode: b.accessCode, amount: b.amount,
              tarotistName: tr ? tr.name : '', when: slot ? slot.startsAt : null,
              durationMin: slot ? slot.durationMin : null,
              videoJoinFrom: b.videoJoinFrom || null, videoJoinUntil: b.videoJoinUntil || null,
            };
          });
        return sendJson(res, 200, { bookings: list });
      }
      if (action === 'admin-sessions') {
        if (!isAdminAuthorized(store, { setupToken: url.searchParams.get('setupToken') || '' })) return sendJson(res, 401, { error: 'Contraseña de administración incorrecta o faltante.' });
        // Panel interno (Setup) — todas las sesiones pagadas próximas, con
        // el link directo a la sala para que la tarotista entre sin código.
        const now = Date.now();
        const list = store.bookings
          .filter((b) => b.status === 'paid')
          .map((b) => {
            const tr = store.tarotists.find((x) => x.id === b.tarotistId);
            const slot = tr && tr.availability.find((s) => s.id === b.slotId);
            return {
              id: b.id, tarotistName: tr ? tr.name : '', customerName: b.customerName, customerEmail: b.customerEmail,
              when: slot ? slot.startsAt : null, videoRoomUrl: b.videoRoomUrl || '', meetingLink: tr ? tr.meetingLink : '',
            };
          })
          .filter((b) => b.when && new Date(b.when).getTime() > now - 60 * 60 * 1000)
          .sort((a, b) => new Date(a.when) - new Date(b.when));
        return sendJson(res, 200, { sessions: list });
      }
      if (action === 'get-ai-usage-summary') {
        if (!isAdminAuthorized(store, { setupToken: url.searchParams.get('setupToken') || '' })) return sendJson(res, 401, { error: 'Contraseña de administración incorrecta o faltante.' });
        return sendJson(res, 200, buildAiUsageSummary(store));
      }
      if (action === 'subscription-plans') {
        return sendJson(res, 200, { plans: store.settings.paypalPlanIds || null, paypalClientId: process.env.PAYPAL_CLIENT_ID || '' });
      }
      if (action === 'subscriber-status') {
        const email = requireUserAuth(store, { sessionToken: url.searchParams.get('sessionToken') || '' });
        if (!email) return sendJson(res, 401, { error: 'Sesión vencida — iniciá sesión de nuevo.' });
        const isSub = await verifySubscriberByEmail(store, email);
        const sub = store.subscribers.find((s) => s.email === email);
        const oraculoFreeSlotAvailable = !!(isSub && sub && sub.planKey === 'oraculo' && sub.lastFreeSessionMonth !== monthKey());
        saveBookingStore(store);
        return sendJson(res, 200, {
          isSubscriber: isSub,
          planKey: isSub && sub ? sub.planKey : null,
          billing: isSub && sub ? sub.billing : null,
          oraculoFreeSlotAvailable,
        });
      }
      if (action === 'list-memberships') {
        if (!isAdminAuthorized(store, { setupToken: url.searchParams.get('setupToken') || '' })) return sendJson(res, 401, { error: 'Contraseña de administración incorrecta o faltante.' });
        // Panel interno (Setup) — lista de membresías (ad-honores + pagas)
        // para el admin de "Membresías" y el conteo del boletín.
        const list = store.subscribers.map((s) => ({
          email: s.email, planKey: s.planKey, source: s.source || 'paypal', status: s.status,
          newsletterOptIn: !!s.newsletterOptIn, activatedAt: s.activatedAt || null,
          honoraryGrantedAt: s.honoraryGrantedAt || null, updatedAt: s.updatedAt || null,
        }));
        return sendJson(res, 200, { subscribers: list });
      }
      if (action === 'join') {
        const code = (url.searchParams.get('code') || '').trim().toUpperCase();
        const booking = store.bookings.find((b) => b.accessCode === code);
        if (!booking || booking.status !== 'paid') {
          return sendJson(res, 404, { error: 'Código no válido o la reserva no está pagada.' });
        }
        const tr = store.tarotists.find((x) => x.id === booking.tarotistId);
        const slot = tr && tr.availability.find((s) => s.id === booking.slotId);
        const now = Date.now();
        const from = booking.videoJoinFrom ? new Date(booking.videoJoinFrom).getTime() : null;
        const until = booking.videoJoinUntil ? new Date(booking.videoJoinUntil).getTime() : null;
        const tarotistName = tr ? tr.name : '';
        const when = slot ? slot.startsAt : null;
        if (from && now < from) {
          return sendJson(res, 200, { status: 'too-early', joinFrom: booking.videoJoinFrom, tarotistName, when });
        }
        if (until && now > until) {
          return sendJson(res, 200, { status: 'expired', tarotistName, when });
        }
        return sendJson(res, 200, {
          status: 'ready', tarotistName, when,
          videoRoomUrl: booking.videoRoomUrl || '',
          meetingLink: tr ? tr.meetingLink : '',
        });
      }
      if (action === 'power-user-status') {
        const email = requireUserAuth(store, { sessionToken: url.searchParams.get('sessionToken') || '' });
        return sendJson(res, 200, { isPowerUser: email ? isPowerUser(store, email) : false });
      }
      if (action === 'whoami') {
        const email = requireUserAuth(store, { sessionToken: url.searchParams.get('sessionToken') || '' });
        if (!email) return sendJson(res, 401, { error: 'Sesión vencida — iniciá sesión de nuevo.' });
        return sendJson(res, 200, { ok: true, email, user: publicUser(store, email) });
      }
      return sendJson(res, 404, { error: 'Acción GET desconocida.' });
    }

    if (req.method !== 'POST') {
      return sendJson(res, 405, { error: 'Método no permitido.' });
    }

    const payload = await readJsonBody(req);
    const action = payload.action;
    const store = loadBookingStore();

    if (action === 'signup') {
      const email = (payload.email || '').trim().toLowerCase();
      const pw = String(payload.password || '');
      const name = (payload.name || '').trim().slice(0, 80);
      const gender = payload.gender ? String(payload.gender).slice(0, 20) : null;
      const lang = payload.lang === 'en' ? 'en' : 'es';
      if (!email || !email.includes('@')) return sendJson(res, 400, { error: 'Escribí un email válido.' });
      if (pw.length < 6) return sendJson(res, 400, { error: 'La contraseña tiene que tener al menos 6 caracteres.' });
      if (findUserByEmail(store, email)) {
        return sendJson(res, 409, { error: 'Ya existe una cuenta con ese email. Iniciá sesión.' });
      }
      prunePendingSignups(store);
      const { hash, salt } = hashAccountPassword(pw);
      const verifyToken = crypto.randomUUID();
      store.pendingSignups[email] = { passwordHash: hash, passwordSalt: salt, name, gender, verifyToken, createdAt: Date.now() };
      saveBookingStore(store);
      const base = (payload.origin || '').replace(/\/$/, '');
      const verifyUrl = `${base}/Arcana.html?verify=${verifyToken}`;
      let emailSent = false;
      let emailError = '';
      try {
        await resendSend(
          email,
          lang === 'en' ? "Confirm your email — Lux Astral" : 'Confirmá tu email — Lux Astral',
          verifyEmailHtml(verifyUrl, lang !== 'en')
        );
        emailSent = true;
      } catch (e) {
        emailError = e.isConfig ? e.message : (e.detail && e.detail.message) || e.message || 'No se pudo enviar el email.';
      }
      return sendJson(res, 200, { ok: true, pendingVerification: true, emailSent, emailError });
    }

    if (action === 'verify-email') {
      const token = String(payload.token || '');
      if (!token) return sendJson(res, 400, { error: 'Falta el token de verificación.' });
      prunePendingSignups(store);
      const matchedEmail = Object.keys(store.pendingSignups).find((e) => store.pendingSignups[e].verifyToken === token);
      if (!matchedEmail) return sendJson(res, 404, { error: 'Este link ya no es válido.' });
      const pending = store.pendingSignups[matchedEmail];
      delete store.pendingSignups[matchedEmail];
      store.users.push({
        email: matchedEmail, passwordHash: pending.passwordHash, passwordSalt: pending.passwordSalt,
        name: pending.name || '', gender: pending.gender || null, photo: null, createdAt: new Date().toISOString(),
      });
      pruneUserSessions(store);
      const sessionToken = crypto.randomUUID();
      store.userSessions[sessionToken] = { email: matchedEmail, createdAt: Date.now() };
      logEvent(store, { email: matchedEmail, type: 'signup', detail: {} });
      saveBookingStore(store);
      try {
        await resendSend(
          'registros@luxastral.com',
          `Nuevo registro: ${pending.name || matchedEmail}`,
          registrationNotifyHtml(pending.name || '', matchedEmail)
        );
      } catch (e) {
        console.error('No se pudo enviar la notificacion de registro:', e);
      }
      return sendJson(res, 200, { ok: true, token: sessionToken, user: publicUser(store, matchedEmail) });
    }

    if (action === 'login') {
      const email = (payload.email || '').trim().toLowerCase();
      const pw = String(payload.password || '');
      const user = findUserByEmail(store, email);
      if (!user || !verifyAccountPassword(pw, user.passwordSalt, user.passwordHash)) {
        prunePendingSignups(store);
        if (!user && store.pendingSignups[email]) {
          return sendJson(res, 401, { error: 'Todavía no confirmaste tu email — revisá tu bandeja de entrada (o spam) y hacé clic en el link que te mandamos.' });
        }
        return sendJson(res, 401, { error: 'Email o contraseña incorrectos.' });
      }
      pruneUserSessions(store);
      const token = crypto.randomUUID();
      store.userSessions[token] = { email, createdAt: Date.now() };
      logEvent(store, { email, type: 'login', detail: {} });
      saveBookingStore(store);
      return sendJson(res, 200, { ok: true, token, user: publicUser(store, email) });
    }

    if (action === 'logout') {
      const token = payload && payload.sessionToken;
      if (token) delete store.userSessions[token];
      saveBookingStore(store);
      return sendJson(res, 200, { ok: true });
    }

    if (action === 'update-account') {
      const email = requireUserAuth(store, payload);
      if (!email) return sendJson(res, 401, { error: 'Sesión vencida — iniciá sesión de nuevo.' });
      const user = findUserByEmail(store, email);
      const patch = payload.patch || {};
      if (typeof patch.name === 'string') user.name = patch.name.trim().slice(0, 80);
      if (patch.gender !== undefined) user.gender = patch.gender ? String(patch.gender).slice(0, 20) : null;
      if (patch.photo !== undefined) user.photo = patch.photo ? String(patch.photo).slice(0, 400000) : null;
      saveBookingStore(store);
      return sendJson(res, 200, { ok: true, user: publicUser(store, email) });
    }

    if (action === 'change-account-password') {
      const email = requireUserAuth(store, payload);
      if (!email) return sendJson(res, 401, { error: 'Sesión vencida — iniciá sesión de nuevo.' });
      const user = findUserByEmail(store, email);
      const currentPw = String(payload.currentPassword || '');
      const newPw = String(payload.newPassword || '');
      if (!verifyAccountPassword(currentPw, user.passwordSalt, user.passwordHash)) {
        return sendJson(res, 401, { error: 'La contraseña actual no es correcta.' });
      }
      if (newPw.length < 6) return sendJson(res, 400, { error: 'La contraseña nueva tiene que tener al menos 6 caracteres.' });
      const { hash, salt } = hashAccountPassword(newPw);
      user.passwordHash = hash;
      user.passwordSalt = salt;
      saveBookingStore(store);
      return sendJson(res, 200, { ok: true });
    }

    if (action === 'save-tarotist') {
      if (!requireAdmin(store, payload, action)) return sendJson(res, 401, { error: 'Contraseña de administración incorrecta o faltante.' });
      const tr = payload.tarotist || {};
      if (!tr.name || !tr.name.trim()) return sendJson(res, 400, { error: 'Falta el nombre.' });
      let entry = store.tarotists.find((x) => x.id === tr.id);
      if (entry) {
        Object.assign(entry, tr);
      } else {
        entry = {
          id: tr.id || genId('custom'),
          initials: tr.name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase(),
          rating: 5.0, years: 1, readings: 0, status: 'online', availability: [],
          ...tr,
        };
        store.tarotists.push(entry);
      }
      saveBookingStore(store);
      return sendJson(res, 200, { tarotist: entry });
    }

    if (action === 'delete-tarotist') {
      if (!requireAdmin(store, payload, action)) return sendJson(res, 401, { error: 'Contraseña de administración incorrecta o faltante.' });
      store.tarotists = store.tarotists.filter((x) => x.id !== payload.id);
      saveBookingStore(store);
      return sendJson(res, 200, { ok: true });
    }

    if (action === 'add-slot') {
      if (!requireAdmin(store, payload, action)) return sendJson(res, 401, { error: 'Contraseña de administración incorrecta o faltante.' });
      const tr = store.tarotists.find((x) => x.id === payload.tarotistId);
      if (!tr) return sendJson(res, 404, { error: 'Tarotista no encontrada.' });
      const slot = { id: genId('slot'), startsAt: payload.startsAt, durationMin: payload.durationMin || 30, booked: false };
      tr.availability.push(slot);
      saveBookingStore(store);
      return sendJson(res, 200, { slot });
    }

    if (action === 'add-slots-bulk') {
      if (!requireAdmin(store, payload, action)) return sendJson(res, 401, { error: 'Contraseña de administración incorrecta o faltante.' });
      // Horarios recurrentes: el navegador calcula las fechas (en el huso
      // horario de quien administra Setup) y manda la lista ya armada —
      // acá solo las guardamos, sin volver a hacer matemática de fechas.
      const tr = store.tarotists.find((x) => x.id === payload.tarotistId);
      if (!tr) return sendJson(res, 404, { error: 'Tarotista no encontrada.' });
      const incoming = Array.isArray(payload.slots) ? payload.slots : [];
      const added = incoming
        .filter((s) => s && s.startsAt)
        .map((s) => ({ id: genId('slot'), startsAt: s.startsAt, durationMin: s.durationMin || 30, booked: false }));
      tr.availability.push(...added);
      saveBookingStore(store);
      return sendJson(res, 200, { added: added.length });
    }

    if (action === 'remove-slot') {
      if (!requireAdmin(store, payload, action)) return sendJson(res, 401, { error: 'Contraseña de administración incorrecta o faltante.' });
      const tr = store.tarotists.find((x) => x.id === payload.tarotistId);
      if (!tr) return sendJson(res, 404, { error: 'Tarotista no encontrada.' });
      const slot = tr.availability.find((s) => s.id === payload.slotId);
      if (slot && slot.booked) return sendJson(res, 400, { error: 'Ese horario ya tiene una reserva pagada, no se puede borrar.' });
      tr.availability = tr.availability.filter((s) => s.id !== payload.slotId);
      saveBookingStore(store);
      return sendJson(res, 200, { ok: true });
    }

    if (action === 'save-settings') {
      if (!requireAdmin(store, payload, action)) return sendJson(res, 401, { error: 'Contraseña de administración incorrecta o faltante.' });
      store.settings = { ...store.settings, ...payload.settings };
      saveBookingStore(store);
      return sendJson(res, 200, { settings: store.settings });
    }

    if (action === 'provision-subscription-plans') {
      if (!requireAdmin(store, payload, action)) return sendJson(res, 401, { error: 'Contraseña de administración incorrecta o faltante.' });
      // Botón de Setup — crea el Producto + los 4 Planes en PayPal UNA vez.
      // Si ya existen (guardados en settings), no crea nada de nuevo.
      try {
        const plans = await paypalEnsureSubscriptionPlans(store);
        saveBookingStore(store);
        return sendJson(res, 200, { plans });
      } catch (e) {
        if (e.isConfig) return sendJson(res, 500, { error: e.message });
        console.error('[booking:provision-plans]', e.status || '', e.detail || e.message);
        return sendJson(res, 502, { error: 'No se pudieron crear los planes en PayPal.', detail: e.detail });
      }
    }

    if (action === 'confirm-subscription') {
      // El botón de PayPal en Precios ya creó la suscripción (createSubscription)
      // y la clienta la aprobó en el popup — acá la verificamos en vivo contra
      // PayPal (nunca confiamos en lo que dice el navegador) y la guardamos
      // asociada a su email.
      const { subscriptionId } = payload;
      const email = requireUserAuth(store, payload);
      if (!email) return sendJson(res, 401, { error: 'Sesión vencida — iniciá sesión de nuevo.' });
      if (!subscriptionId) {
        return sendJson(res, 400, { error: 'Faltan datos de la suscripción.' });
      }
      let sub;
      try {
        sub = await paypalFetch(`v1/billing/subscriptions/${subscriptionId}`);
      } catch (e) {
        if (e.isConfig) return sendJson(res, 500, { error: e.message });
        return sendJson(res, 502, { error: 'No se pudo verificar la suscripción con PayPal.', detail: e.detail });
      }
      const okStatuses = ['ACTIVE', 'APPROVAL_PENDING', 'APPROVED'];
      if (!okStatuses.includes(sub.status)) {
        return sendJson(res, 200, { status: sub.status, isSubscriber: false });
      }
      // 2026-09-08 (auditoría): antes se guardaba el planKey/billing que
      // mandaba el navegador sin verificarlo contra la suscripción real de
      // PayPal -- se podía pagar el plan más barato y decirle al servidor
      // que era el más caro. Ahora el plan real se DERIVA del plan_id que
      // devuelve PayPal (nunca se confía en lo que manda el navegador).
      const planIds = store.settings.paypalPlanIds || {};
      const matchedKey = Object.keys(planIds).find((k) => planIds[k] === sub.plan_id);
      if (!matchedKey) {
        console.error('[confirm-subscription] plan_id de PayPal no coincide con ningún plan provisionado:', sub.plan_id, 'email:', email);
        return sendJson(res, 409, { error: 'No pudimos verificar qué plan pagaste — escribinos a comentarios@luxastral.com.' });
      }
      const [realPlanKey, realBillingRaw] = matchedKey.split('_');
      const realBilling = realBillingRaw === 'year' ? 'year' : 'month';
      let entry = store.subscribers.find((s) => s.email === email);
      if (!entry) {
        entry = { email, source: 'paypal', newsletterOptIn: false };
        store.subscribers.push(entry);
      }
      entry.subscriptionId = subscriptionId;
      entry.planKey = realPlanKey;
      entry.billing = realBilling;
      entry.status = sub.status;
      entry.updatedAt = new Date().toISOString();
      if (typeof entry.newsletterOptIn !== 'boolean') entry.newsletterOptIn = false;
      if (sub.status === 'ACTIVE') {
        logEvent(store, { email, type: 'income', detail: { planKey: realPlanKey, billing: realBilling } });
      }
      saveBookingStore(store);
      return sendJson(res, 200, { status: sub.status, isSubscriber: sub.status === 'ACTIVE', planKey: entry.planKey });
    }

    if (action === 'cancel-subscription') {
      // Botón "Cancelar Membresía" en Perfil — cancela de verdad contra
      // PayPal (para membresías ad-honores, que no tienen PayPal de por
      // medio, solo desactiva localmente, igual que revoke-membership).
      // Guarda el motivo que dio la clienta y avisa por email a
      // comentarios@luxastral.com (best-effort: si Resend no está
      // configurado o falla, la cancelación igual queda hecha).
      const email = requireUserAuth(store, payload);
      if (!email) return sendJson(res, 401, { error: 'Sesión vencida — iniciá sesión de nuevo.' });
      const reason = (payload.reason || '').trim().slice(0, 60);
      const reasonDetail = (payload.reasonDetail || '').trim().slice(0, 1000);
      const isActive = await verifySubscriberByEmail(store, email);
      const entry = store.subscribers.find((s) => s.email === email);
      if (!entry || !isActive) return sendJson(res, 404, { error: 'No encontramos una membresía activa con ese email.' });

      if (entry.source !== 'honorary') {
        if (!entry.subscriptionId) {
          return sendJson(res, 400, { error: 'Esta membresía no tiene una suscripción de PayPal asociada.' });
        }
        try {
          await paypalFetch(`v1/billing/subscriptions/${entry.subscriptionId}/cancel`, {
            method: 'POST',
            json: { reason: reason || 'Cancelado por la clienta desde su perfil.' },
          });
        } catch (e) {
          if (e.isConfig) return sendJson(res, 500, { error: e.message });
          console.error('[booking:cancel-subscription]', e.status || '', e.detail || e.message);
          return sendJson(res, 502, { error: 'No se pudo cancelar la suscripción con PayPal.', detail: e.detail });
        }
      }
      entry.status = 'CANCELLED';
      entry.cancelReason = reason || null;
      entry.cancelReasonDetail = reasonDetail || null;
      entry.cancelledAt = new Date().toISOString();
      entry.updatedAt = new Date().toISOString();
      logEvent(store, { email, type: 'subscription-cancelled', detail: { planKey: entry.planKey, reason } });
      saveBookingStore(store);

      let emailSent = false;
      let emailError = '';
      try {
        await resendSend(
          'comentarios@luxastral.com',
          `Cancelación de membresía — ${email}`,
          `<div style="font-family:Georgia,serif;padding:16px;">
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Plan:</strong> ${entry.planKey || '—'} (${entry.billing || '—'})</p>
            <p><strong>Motivo:</strong> ${reason || '(sin especificar)'}</p>
            ${reasonDetail ? `<p><strong>Detalle:</strong> ${reasonDetail}</p>` : ''}
          </div>`
        );
        emailSent = true;
      } catch (e) {
        emailError = e.isConfig ? e.message : (e.detail && e.detail.message) || e.message || 'No se pudo enviar el email.';
      }
      return sendJson(res, 200, { ok: true, emailSent, emailError });
    }

    if (action === 'apply-retention-offer') {
      // 2° ventana del flujo de cancelación: la clienta acepta el 25% de
      // descuento por un ciclo más. Cambiamos su suscripción al plan de
      // retención (ver paypalEnsureRetentionPlan) — PayPal aplica el
      // nuevo precio recién en el próximo cobro, nunca de inmediato ni
      // con prorrateo. Si la clienta pagó con su cuenta de PayPal (no con
      // tarjeta directa), PayPal exige que vuelva a aprobar el cambio: en
      // ese caso devolvemos el link de aprobación para abrirlo en una
      // pestaña nueva; si no lo aprueba, sigue facturándose como antes
      // (no hay riesgo de cobrar mal).
      const email = requireUserAuth(store, payload);
      if (!email) return sendJson(res, 401, { error: 'Sesión vencida — iniciá sesión de nuevo.' });
      const isActive = await verifySubscriberByEmail(store, email);
      const entry = store.subscribers.find((s) => s.email === email);
      if (!entry || !isActive) return sendJson(res, 404, { error: 'No encontramos una membresía activa con ese email.' });
      if (entry.source === 'honorary' || !entry.subscriptionId) {
        return sendJson(res, 400, { error: 'Esta membresía no admite la oferta de descuento (no tiene suscripción de PayPal).' });
      }
      const planKey = entry.planKey;
      const billing = entry.billing === 'year' ? 'year' : 'month';
      let retainPlanId;
      try {
        retainPlanId = await paypalEnsureRetentionPlan(store, planKey, billing);
      } catch (e) {
        if (e.isConfig) return sendJson(res, 500, { error: e.message });
        console.error('[booking:apply-retention-offer:ensure-plan]', e.status || '', e.detail || e.message);
        return sendJson(res, 502, { error: 'No se pudo preparar la oferta con PayPal.', detail: e.detail });
      }
      let revised;
      try {
        revised = await paypalFetch(`v1/billing/subscriptions/${entry.subscriptionId}/revise`, {
          method: 'POST',
          json: { plan_id: retainPlanId },
        });
      } catch (e) {
        if (e.isConfig) return sendJson(res, 500, { error: e.message });
        console.error('[booking:apply-retention-offer:revise]', e.status || '', e.detail || e.message);
        return sendJson(res, 502, { error: 'No se pudo aplicar la oferta en PayPal.', detail: e.detail });
      }
      entry.retentionOfferAppliedAt = new Date().toISOString();
      entry.updatedAt = new Date().toISOString();
      saveBookingStore(store);

      const approveLink = revised && Array.isArray(revised.links) ? revised.links.find((l) => l.rel === 'approve') : null;
      return sendJson(res, 200, { ok: true, needsApproval: !!approveLink, approveUrl: approveLink ? approveLink.href : null });
    }

    if (action === 'submit-app-rating') {
      // Botón "Califica la Aplicación" — encuesta breve (estrellas +
      // comentario opcional). Se guarda en el store para que Christian la
      // pueda ver aunque el email falle, y se manda a comentarios@luxastral.com.
      const rating = Math.max(1, Math.min(5, Math.round(Number(payload.rating) || 0)));
      if (!rating) return sendJson(res, 400, { error: 'Falta la calificación.' });
      const email = (payload.email || '').trim();
      const comment = (payload.comment || '').trim().slice(0, 1000);
      store.feedback.ratings.push({ rating, email: email || null, comment: comment || null, at: new Date().toISOString() });
      saveBookingStore(store);
      let emailSent = false;
      let emailError = '';
      try {
        await resendSend(
          'comentarios@luxastral.com',
          `Nueva calificación de la app: ${rating}/5`,
          `<div style="font-family:Georgia,serif;padding:16px;">
            <p><strong>Calificación:</strong> ${rating}/5</p>
            ${email ? `<p><strong>Email:</strong> ${email}</p>` : ''}
            ${comment ? `<p><strong>Comentario:</strong> ${comment}</p>` : ''}
          </div>`
        );
        emailSent = true;
      } catch (e) {
        emailError = e.isConfig ? e.message : (e.detail && e.detail.message) || e.message || 'No se pudo enviar el email.';
      }
      return sendJson(res, 200, { ok: true, emailSent, emailError });
    }

    if (action === 'submit-suggestion') {
      // Botón "Sugerencias" — texto libre a comentarios@luxastral.com.
      const message = (payload.message || '').trim().slice(0, 2000);
      if (!message) return sendJson(res, 400, { error: 'Escribí tu sugerencia primero.' });
      const email = (payload.email || '').trim();
      store.feedback.suggestions.push({ message, email: email || null, at: new Date().toISOString() });
      saveBookingStore(store);
      let emailSent = false;
      let emailError = '';
      try {
        await resendSend(
          'comentarios@luxastral.com',
          'Nueva sugerencia desde el sitio',
          `<div style="font-family:Georgia,serif;padding:16px;">
            ${email ? `<p><strong>Email:</strong> ${email}</p>` : ''}
            <p style="white-space:pre-wrap;">${message}</p>
          </div>`
        );
        emailSent = true;
      } catch (e) {
        emailError = e.isConfig ? e.message : (e.detail && e.detail.message) || e.message || 'No se pudo enviar el email.';
      }
      return sendJson(res, 200, { ok: true, emailSent, emailError });
    }

    if (action === 'send-contact-message') {
      const name = (payload.name || '').trim().slice(0, 80);
      const email = (payload.email || '').trim().toLowerCase();
      const message = (payload.message || '').trim().slice(0, 3000);
      if (!email || !email.includes('@')) return sendJson(res, 400, { error: 'Escribí un email válido.' });
      if (!message) return sendJson(res, 400, { error: 'Escribí tu mensaje primero.' });
      let emailSent = false;
      let emailError = '';
      try {
        await resendSend(
          'contacto@luxastral.com',
          `Nuevo mensaje de contacto${name ? ' de ' + name : ''}`,
          contactMessageHtml(name, email, message),
          { replyTo: email }
        );
        emailSent = true;
      } catch (e) {
        emailError = e.isConfig ? e.message : (e.detail && e.detail.message) || e.message || 'No se pudo enviar el email.';
      }
      if (!emailSent) return sendJson(res, 502, { error: emailError || 'No se pudo enviar tu mensaje.' });
      return sendJson(res, 200, { ok: true });
    }

    if (action === 'grant-honorary-membership') {
      const grantedBy = requireAdmin(store, payload, action);
      if (!grantedBy) return sendJson(res, 401, { error: 'Contraseña de administración incorrecta o faltante.' });
      // Setup → "Membresías": otorgar Luna o Estrella ad-honores (sin
      // pago, sin PayPal de por medio) a un email. Genera un token de
      // activación de un solo uso — la persona hace clic en el link (se
      // lo pasa Christian a mano, o se lo mandamos por email si hay
      // RESEND_API_KEY) y llega a la página de bienvenida.
      const { email: rawEmail, planKey, origin, sendEmail, lang } = payload;
      const email = (rawEmail || '').trim().toLowerCase();
      if (!email || !email.includes('@')) return sendJson(res, 400, { error: 'Falta un email válido.' });
      if (!HONORARY_PLAN_KEYS.includes(planKey)) {
        return sendJson(res, 400, { error: 'Las membresías ad-honores son solo para Luna, Estrella u Oráculo.' });
      }
      let entry = store.subscribers.find((s) => s.email === email);
      if (!entry) {
        entry = { email };
        store.subscribers.push(entry);
      }
      entry.planKey = planKey;
      entry.source = 'honorary';
      entry.status = 'ACTIVE';
      entry.subscriptionId = null;
      entry.billing = 'honorary';
      entry.activationToken = entry.activationToken || genId('act');
      entry.activatedAt = entry.activatedAt || null;
      if (typeof entry.newsletterOptIn !== 'boolean') entry.newsletterOptIn = false;
      entry.honoraryGrantedAt = entry.honoraryGrantedAt || new Date().toISOString();
      entry.updatedAt = new Date().toISOString();
      logEvent(store, { email, type: 'membership-granted', detail: { planKey, by: grantedBy } });
      saveBookingStore(store);
      const base = (origin || '').replace(/\/$/, '');
      const activationUrl = `${base}/Arcana.html?activate=${entry.activationToken}`;
      let emailSent = false;
      let emailError = '';
      if (sendEmail) {
        try {
          await resendSend(
            email,
            lang === 'en' ? "You've been gifted a Lux Astral membership" : 'Te regalamos una membresía en Lux Astral',
            activationEmailHtml(planKey, activationUrl, lang !== 'en')
          );
          emailSent = true;
        } catch (e) {
          emailError = e.isConfig ? e.message : (e.detail && e.detail.message) || e.message || 'No se pudo enviar el email.';
        }
      }
      return sendJson(res, 200, { activationUrl, activationToken: entry.activationToken, emailSent, emailError });
    }

    if (action === 'revoke-membership') {
      const revokedBy = requireAdmin(store, payload, action);
      if (!revokedBy) return sendJson(res, 401, { error: 'Contraseña de administración incorrecta o faltante.' });
      const email = (payload.email || '').trim().toLowerCase();
      const entry = store.subscribers.find((s) => s.email === email && s.source === 'honorary');
      if (!entry) return sendJson(res, 404, { error: 'No se encontró una membresía ad-honores con ese email.' });
      entry.status = 'CANCELLED';
      entry.updatedAt = new Date().toISOString();
      logEvent(store, { email, type: 'membership-revoked', detail: { planKey: entry.planKey, by: revokedBy } });
      saveBookingStore(store);
      return sendJson(res, 200, { ok: true });
    }

    if (action === 'activate-membership') {
      const token = (payload.token || '').trim();
      const entry = store.subscribers.find((s) => s.activationToken === token);
      if (!entry) return sendJson(res, 404, { error: 'El link de activación no es válido.' });
      if (!entry.activatedAt) entry.activatedAt = new Date().toISOString();
      saveBookingStore(store);
      return sendJson(res, 200, { email: entry.email, planKey: entry.planKey, source: entry.source || 'paypal' });
    }

    if (action === 'newsletter-optin') {
      const email = (payload.email || '').trim().toLowerCase();
      const optIn = !!payload.optIn;
      const entry = store.subscribers.find((s) => s.email === email);
      if (!entry) return sendJson(res, 404, { error: 'No encontramos una membresía con ese email.' });
      entry.newsletterOptIn = optIn;
      entry.updatedAt = new Date().toISOString();
      saveBookingStore(store);
      return sendJson(res, 200, { ok: true, newsletterOptIn: optIn });
    }

    if (action === 'send-daily-newsletter') {
      if (!requireAdmin(store, payload, action)) return sendJson(res, 401, { error: 'Contraseña de administración incorrecta o faltante.' });
      // Botón manual en Setup (el disparo automático queda pendiente de la
      // decisión de hosting) — usa SIEMPRE la carta del día real de la
      // plataforma (nunca una inventada), la IA solo redacta el texto, y
      // arma el email con el template de Setup. Como mucho una vez por
      // día salvo que se pida "force" (para poder probarlo).
      const today = todayKey();
      if (store.settings.lastNewsletterSentDate === today && !payload.force) {
        return sendJson(res, 200, { skipped: true, reason: 'already-sent-today' });
      }
      const siteBaseUrl = (store.settings.siteBaseUrl || payload.origin || '').replace(/\/$/, '');
      let content;
      try {
        content = await generateNewsletterContent(store, siteBaseUrl);
      } catch (e) {
        return sendJson(res, e.isConfig ? 500 : 502, { error: e.message || 'No se pudo generar el boletín.' });
      }
      const recipients = store.subscribers.filter((s) => s.newsletterOptIn && s.status === 'ACTIVE');
      let sent = 0;
      const failed = [];
      for (const sub of recipients) {
        try {
          await resendSend(sub.email, `Lux Astral · ${content.cardName}`, content.html);
          sent++;
        } catch (e) {
          console.error('[newsletter] fallo el envio a', sub.email, '->', e.message, e.detail || '');
          failed.push({ email: sub.email, error: e.message });
        }
      }
      store.settings.lastNewsletterSentDate = today;
      saveBookingStore(store);
      return sendJson(res, 200, { sent, failed, total: recipients.length, cardName: content.cardName, preview: content.html });
    }

    if (action === 'save-ai-pricing') {
      if (!requireAdmin(store, payload, action)) return sendJson(res, 401, { error: 'Contraseña de administración incorrecta o faltante.' });
      const incoming = payload.pricing && typeof payload.pricing === 'object' ? payload.pricing : {};
      store.settings.aiPricing = incoming;
      saveBookingStore(store);
      return sendJson(res, 200, { ok: true, pricing: store.settings.aiPricing });
    }

    if (action === 'send-announcement') {
      if (!requireAdmin(store, payload, action)) return sendJson(res, 401, { error: 'Contraseña de administración incorrecta o faltante.' });
      // Novedades/productos — texto libre (o HTML subido como .zip, con
      // imágenes embebidas) que Christian arma en Setup, se manda a quien
      // se suscribió al boletín (misma lista). "raw": true significa que
      // bodyHtml ya es un email HTML completo (viene del .zip) y no hay
      // que envolverlo en el template de novedades.
      const { subject, html: bodyHtml, images, raw } = payload;
      if (!subject || !bodyHtml) return sendJson(res, 400, { error: 'Falta el asunto o el contenido.' });
      const imgs = (Array.isArray(images) ? images : []).slice(0, 20);
      const totalB64 = imgs.reduce((sum, im) => sum + (im && im.base64 ? im.base64.length : 0), 0);
      if (totalB64 > 25 * 1024 * 1024) {
        return sendJson(res, 400, { error: 'Las imágenes del .zip pesan demasiado para mandarlas por email (límite ~18 MB reales, tope de Resend). Achicalas o sacá alguna.' });
      }
      const attachments = imgs
        .filter((im) => im && im.base64 && im.filename && im.cid)
        .map((im) => ({ filename: String(im.filename).slice(0, 120), content: im.base64, contentType: im.contentType || undefined, contentId: String(im.cid).slice(0, 100) }));
      const html = raw ? bodyHtml : newsletterEmailHtml(subject, bodyHtml);
      const recipients = store.subscribers.filter((s) => s.newsletterOptIn && s.status === 'ACTIVE');
      let sent = 0;
      const failed = [];
      for (const sub of recipients) {
        try {
          await resendSend(sub.email, subject, html, { attachments });
          sent++;
        } catch (e) {
          console.error('[announcement] fallo el envio a', sub.email, '->', e.message, e.detail || '');
          failed.push({ email: sub.email, error: e.message });
        }
      }
      saveBookingStore(store);
      return sendJson(res, 200, { sent, failed, total: recipients.length });
    }

    if (action === 'reading-access') {
      // Antes de generar una lectura con IA: decide si se puede (según el
      // plan de la suscriptora, o el límite del plan Vela) y con qué tipo
      // de respuesta — así nunca se gasta un llamado a la IA de más.
      const email = requireUserAuth(store, payload);
      if (!email) return sendJson(res, 401, { error: 'Sesión vencida — iniciá sesión de nuevo.' });
      const { spread, preferredResponseType } = payload;
      const result = await resolveReadingAccess(store, email, spread, preferredResponseType);
      saveBookingStore(store);
      return sendJson(res, result.allowed ? 200 : 403, result);
    }

    // ---------------------------------------------------------------
    // Historial de lecturas + Cofre de Respuestas (2026-09-08, auditoria).
    // Antes vivian solo en localStorage del navegador: se perdian al
    // cambiar de dispositivo pese a ser un beneficio pago, y sin filtro
    // por email se mezclaban si dos perfiles usaban el mismo navegador.
    // Ahora quedan en el servidor, atadas al email de la socia.
    // ---------------------------------------------------------------
    if (action === 'list-readings') {
      const email = requireUserAuth(store, payload);
      if (!email) return sendJson(res, 401, { error: 'Sesión vencida — iniciá sesión de nuevo.' });
      const list = store.readingsByEmail[email] || [];
      return sendJson(res, 200, { readings: list, migrated: !!store.readingsMigrated[email] });
    }

    if (action === 'save-reading') {
      const email = requireUserAuth(store, payload);
      if (!email) return sendJson(res, 401, { error: 'Sesión vencida — iniciá sesión de nuevo.' });
      const reading = payload.reading;
      if (!reading || typeof reading !== 'object') {
        return sendJson(res, 400, { error: 'Faltan datos de la lectura.' });
      }
      const isSub = await verifySubscriberByEmail(store, email);
      if (!isSub) return sendJson(res, 403, { error: 'Guardar el historial es un beneficio de las socias con plan.' });
      if (!store.readingsByEmail[email]) store.readingsByEmail[email] = [];
      const saved = { ...reading, id: reading.id || genId('r'), email };
      store.readingsByEmail[email].push(saved);
      saveBookingStore(store);
      return sendJson(res, 200, { reading: saved });
    }

    if (action === 'update-reading') {
      const email = requireUserAuth(store, payload);
      if (!email) return sendJson(res, 401, { error: 'Sesión vencida — iniciá sesión de nuevo.' });
      const { id, patch: readingPatch } = payload;
      if (!id || !readingPatch || typeof readingPatch !== 'object') {
        return sendJson(res, 400, { error: 'Faltan datos para actualizar la lectura.' });
      }
      const list = store.readingsByEmail[email] || [];
      const idx = list.findIndex((r) => r.id === id);
      if (idx === -1) return sendJson(res, 404, { error: 'No encontramos esa lectura.' });
      list[idx] = { ...list[idx], ...readingPatch };
      saveBookingStore(store);
      return sendJson(res, 200, { reading: list[idx] });
    }

    if (action === 'delete-reading') {
      const email = requireUserAuth(store, payload);
      if (!email) return sendJson(res, 401, { error: 'Sesión vencida — iniciá sesión de nuevo.' });
      const { id } = payload;
      if (!id) return sendJson(res, 400, { error: 'Faltan datos para borrar la lectura.' });
      const list = store.readingsByEmail[email] || [];
      store.readingsByEmail[email] = list.filter((r) => r.id !== id);
      saveBookingStore(store);
      return sendJson(res, 200, { ok: true });
    }

    if (action === 'import-readings') {
      // Migracion de una sola vez: si el navegador todavia tiene lecturas
      // viejas guardadas solo en localStorage (de antes de este cambio),
      // las sube al servidor la primera vez que las ve. readingsMigrated
      // evita que se repita en cada carga de pagina.
      const email = requireUserAuth(store, payload);
      if (!email) return sendJson(res, 401, { error: 'Sesión vencida — iniciá sesión de nuevo.' });
      const incoming = Array.isArray(payload.readings) ? payload.readings : [];
      if (!store.readingsMigrated[email]) {
        const isSub = await verifySubscriberByEmail(store, email);
        if (isSub && incoming.length) {
          if (!store.readingsByEmail[email]) store.readingsByEmail[email] = [];
          const existingIds = new Set(store.readingsByEmail[email].map((r) => r.id));
          incoming.forEach((r) => {
            if (r && r.id && !existingIds.has(r.id)) {
              store.readingsByEmail[email].push({ ...r, email });
              existingIds.add(r.id);
            }
          });
        }
        store.readingsMigrated[email] = true;
        saveBookingStore(store);
      }
      return sendJson(res, 200, { readings: store.readingsByEmail[email] || [] });
    }

    if (action === 'checkout-free') {
      // La sesión de video mensual gratis del plan Oráculo — sin pasar por
      // PayPal para nada, pero verificando de nuevo en el servidor (nunca
      // confiamos en que el navegador diga "tengo derecho a esto gratis").
      // El email SIEMPRE se deriva del sessionToken, no del customerEmail
      // que manda el navegador (ver requireUserAuth).
      const { tarotistId, slotId, customerName } = payload;
      const email = requireUserAuth(store, payload);
      if (!email) return sendJson(res, 401, { error: 'Sesión vencida — iniciá sesión de nuevo.' });
      const tr = store.tarotists.find((x) => x.id === tarotistId);
      if (!tr) return sendJson(res, 404, { error: 'Tarotista no encontrada.' });
      const slot = tr.availability.find((s) => s.id === slotId);
      if (!slot || !slotIsAvailable(slot)) return sendJson(res, 409, { error: 'Ese horario ya no está disponible.' });
      const oraculoCheck = await checkOraculoFreeSlot(store, email);
      if (!oraculoCheck.eligible) {
        return sendJson(res, 403, { error: 'Esta sesión gratis ya no está disponible para tu suscripción este mes.' });
      }
      const bookingId = genId('bk');
      const booking = {
        id: bookingId, tarotistId, slotId, customerName: customerName || '', customerEmail: email,
        amount: 0, currency: 'usd', status: 'paid', paypalOrderId: null,
        createdAt: new Date().toISOString(), confirmedAt: new Date().toISOString(),
        accessCode: genBookingAccessCode(), isSubscriber: true, freeOraculoSlot: true,
      };
      slot.booked = true;
      delete slot.reservedUntil;
      store.bookings.push(booking);
      oraculoCheck.sub.lastFreeSessionMonth = oraculoCheck.monthKey;
      await ensureVideoRoom(booking, tr, slot);
      saveBookingStore(store);
      return sendJson(res, 200, {
        status: 'paid', tarotistName: tr.name, when: slot.startsAt,
        meetingLink: tr.meetingLink, accessCode: booking.accessCode, amount: 0,
        videoRoomUrl: booking.videoRoomUrl || '', videoJoinFrom: booking.videoJoinFrom || null,
      });
    }

    if (action === 'checkout') {
      const { tarotistId, slotId, customerName, lang } = payload;
      const email = requireUserAuth(store, payload);
      if (!email) return sendJson(res, 401, { error: 'Sesión vencida — iniciá sesión de nuevo.' });
      const tr = store.tarotists.find((x) => x.id === tarotistId);
      if (!tr) return sendJson(res, 404, { error: 'Tarotista no encontrada.' });
      const slot = tr.availability.find((s) => s.id === slotId);
      if (!slot || !slotIsAvailable(slot)) return sendJson(res, 409, { error: 'Ese horario ya no está disponible.' });

      // Ya no confiamos en un checkbox que marca la clienta, ni en el email
      // que escribe: el email SIEMPRE se deriva del sessionToken (ver
      // requireUserAuth) -- así nadie puede tipear el email de otra socia
      // para pagar con su descuento.
      const isSubscriber = await verifySubscriberByEmail(store, email);
      const subEntry = isSubscriber ? store.subscribers.find((s) => s.email === email) : null;
      const discountPct = subEntry ? (store.settings.planDiscounts[subEntry.planKey] || 0) : 0;
      const base = Number(tr.rate) || store.settings.sessionBasePrice;
      const price = discountPct
        ? Math.round(base * (1 - discountPct / 100) * 100) / 100
        : base;

      const bookingId = genId('bk');
      slot.reservedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      const booking = {
        id: bookingId, tarotistId, slotId, customerName: customerName || '', customerEmail: email,
        amount: price, currency: 'usd', status: 'pending', paypalOrderId: null, createdAt: new Date().toISOString(),
        isSubscriber,
      };
      store.bookings.push(booking);
      saveBookingStore(store);

      const es = lang !== 'en';
      const sessionLabel = es
        ? `Sesión con ${tr.name} — ${new Date(slot.startsAt).toLocaleString('es-CL')}`
        : `Session with ${tr.name} — ${new Date(slot.startsAt).toLocaleString('en-US')}`;

      let order;
      try {
        order = await paypalFetch('v2/checkout/orders', {
          method: 'POST',
          json: {
            intent: 'CAPTURE',
            purchase_units: [{
              custom_id: bookingId,
              description: sessionLabel.slice(0, 127), // PayPal limita este campo a 127 caracteres
              amount: { currency_code: 'USD', value: price.toFixed(2) },
            }],
          },
        });
      } catch (e) {
        if (e.isConfig) return sendJson(res, 500, { error: e.message });
        console.error('[booking:checkout]', e.status || '', e.detail || e.message);
        return sendJson(res, 502, { error: 'No se pudo iniciar el pago con PayPal.', detail: e.detail });
      }

      booking.paypalOrderId = order.id;
      saveBookingStore(store);
      return sendJson(res, 200, { orderId: order.id, bookingId });
    }

    if (action === 'test-book-free') {
      if (!requireAdmin(store, payload, action)) return sendJson(res, 401, { error: 'Contraseña de administración incorrecta o faltante.' });
      // SOLO para pruebas locales de Christian — probar la pantalla de
      // videollamada (cliente y tarotista) sin pasar por PayPal de verdad.
      // A propósito NO existe en netlify/functions/booking.mts, así que
      // nunca queda disponible para clientes reales en el sitio publicado.
      const { tarotistId, slotId } = payload;
      const tr = store.tarotists.find((x) => x.id === tarotistId);
      if (!tr) return sendJson(res, 404, { error: 'Tarotista no encontrada.' });
      const slot = tr.availability.find((s) => s.id === slotId);
      if (!slot || !slotIsAvailable(slot)) return sendJson(res, 409, { error: 'Ese horario ya no está disponible.' });

      const bookingId = genId('bk');
      const booking = {
        id: bookingId, tarotistId, slotId,
        customerName: 'Prueba (sin pago)', customerEmail: 'prueba@luxastral.com',
        amount: 0, currency: 'usd', status: 'paid', paypalOrderId: 'TEST-' + bookingId,
        createdAt: new Date().toISOString(), confirmedAt: new Date().toISOString(),
        accessCode: genBookingAccessCode(),
      };
      slot.booked = true;
      delete slot.reservedUntil;
      store.bookings.push(booking);
      await ensureVideoRoom(booking, tr, slot);
      saveBookingStore(store);

      return sendJson(res, 200, {
        status: 'paid', tarotistName: tr.name, when: slot.startsAt,
        meetingLink: tr.meetingLink, accessCode: booking.accessCode, amount: 0,
        videoRoomUrl: booking.videoRoomUrl || '', videoJoinFrom: booking.videoJoinFrom || null,
      });
    }

    if (action === 'confirm') {
      const { orderId } = payload;
      const booking = store.bookings.find((b) => b.paypalOrderId === orderId);
      if (!booking) return sendJson(res, 404, { error: 'Reserva no encontrada.' });
      const tr = store.tarotists.find((x) => x.id === booking.tarotistId);
      const slot = tr && tr.availability.find((s) => s.id === booking.slotId);

      if (booking.status === 'paid') {
        await ensureVideoRoom(booking, tr, slot);
        saveBookingStore(store);
        return sendJson(res, 200, {
          status: 'paid', tarotistName: tr ? tr.name : '', when: slot ? slot.startsAt : null,
          meetingLink: tr ? tr.meetingLink : '', accessCode: booking.accessCode, amount: booking.amount,
          videoRoomUrl: booking.videoRoomUrl || '', videoJoinFrom: booking.videoJoinFrom || null,
        });
      }

      // El cliente ya aprobó el pago en el popup de PayPal (por eso el
      // frontend llama acá) — capturar es el paso que de verdad mueve la
      // plata; PayPal no cobra hasta este momento.
      let capture;
      try {
        capture = await paypalFetch(`v2/checkout/orders/${orderId}/capture`, { method: 'POST' });
      } catch (e) {
        if (e.isConfig) return sendJson(res, 500, { error: e.message });
        return sendJson(res, 502, { error: 'No se pudo confirmar el pago con PayPal.', detail: e.detail });
      }

      if (capture.status !== 'COMPLETED') {
        return sendJson(res, 200, { status: capture.status || 'pending' });
      }

      booking.status = 'paid';
      booking.confirmedAt = new Date().toISOString();
      booking.accessCode = genBookingAccessCode();
      if (slot) { slot.booked = true; delete slot.reservedUntil; }
      await ensureVideoRoom(booking, tr, slot);
      logEvent(store, { email: booking.customerEmail, type: 'income', detail: { kind: 'booking', tarotistId: booking.tarotistId, amount: booking.amount } });
      saveBookingStore(store);

      return sendJson(res, 200, {
        status: 'paid', tarotistName: tr ? tr.name : '', when: slot ? slot.startsAt : null,
        meetingLink: tr ? tr.meetingLink : '', accessCode: booking.accessCode, amount: booking.amount,
        videoRoomUrl: booking.videoRoomUrl || '', videoJoinFrom: booking.videoJoinFrom || null,
      });
    }

    if (action === 'setup-login') {
      // Login real del panel de Setup: correo tiene que estar en la lista
      // de power users Y la contraseña tiene que coincidir (se compara
      // por hash, la contraseña en texto plano nunca se guarda).
      const email = (payload.email || '').trim().toLowerCase();
      const pw = String(payload.password || '');
      if (!email || !email.includes('@')) return sendJson(res, 400, { error: 'Falta un email válido.' });
      if (!isPowerUser(store, email)) {
        return sendJson(res, 403, { error: 'Ese correo no tiene acceso al panel de configuración.' });
      }
      if (hashSetupPassword(pw) !== store.settings.setupPasswordHash) {
        return sendJson(res, 401, { error: 'Contraseña incorrecta.' });
      }
      pruneSetupSessions(store);
      const token = crypto.randomUUID();
      store.setupSessions[token] = { email, createdAt: Date.now() };
      logEvent(store, { email, type: 'setup-login', detail: {} });
      saveBookingStore(store);
      return sendJson(res, 200, { ok: true, token, email, powerUsers: store.settings.powerUsers });
    }

    if (action === 'setup-whoami') {
      // El navegador llama esto al montar Setup si ya tiene una sesión
      // guardada — confirma que el token sigue vigente y de paso trae la
      // lista de power users actualizada (por si otra persona la cambió).
      const adminEmail = isAdminAuthorized(store, payload);
      if (!adminEmail) return sendJson(res, 401, { error: 'Sesión vencida — iniciá sesión de nuevo.' });
      return sendJson(res, 200, { ok: true, email: adminEmail, powerUsers: store.settings.powerUsers });
    }

    if (action === 'setup-change-password') {
      const adminEmail = requireAdmin(store, payload, action);
      if (!adminEmail) return sendJson(res, 401, { error: 'Contraseña de administración incorrecta o faltante.' });
      const newPassword = String(payload.newPassword || '');
      if (newPassword.length < 6) return sendJson(res, 400, { error: 'La contraseña tiene que tener al menos 6 caracteres.' });
      store.settings.setupPasswordHash = hashSetupPassword(newPassword);
      saveBookingStore(store);
      return sendJson(res, 200, { ok: true });
    }

    if (action === 'setup-add-power-user') {
      const adminEmail = requireAdmin(store, payload, action);
      if (!adminEmail) return sendJson(res, 401, { error: 'Contraseña de administración incorrecta o faltante.' });
      const email = (payload.email || '').trim().toLowerCase();
      if (!email || !email.includes('@')) return sendJson(res, 400, { error: 'Falta un email válido.' });
      if (!store.settings.powerUsers.includes(email)) store.settings.powerUsers.push(email);
      saveBookingStore(store);
      return sendJson(res, 200, { ok: true, powerUsers: store.settings.powerUsers });
    }

    if (action === 'setup-remove-power-user') {
      const adminEmail = requireAdmin(store, payload, action);
      if (!adminEmail) return sendJson(res, 401, { error: 'Contraseña de administración incorrecta o faltante.' });
      const email = (payload.email || '').trim().toLowerCase();
      if (store.settings.powerUsers.length <= 1) {
        return sendJson(res, 400, { error: 'Tiene que quedar al menos un correo con acceso.' });
      }
      store.settings.powerUsers = store.settings.powerUsers.filter((e) => e !== email);
      saveBookingStore(store);
      return sendJson(res, 200, { ok: true, powerUsers: store.settings.powerUsers });
    }

    if (action === 'log-event') {
      // Registro liviano de accesos y secciones visitadas, para el panel
      // de Informes — nunca incluye contenido de lecturas ni preguntas,
      // solo qué sección se visitó y cuándo.
      const authEmail = requireUserAuth(store, payload);
      const email = authEmail || (payload.email ? String(payload.email).trim().toLowerCase() : '');
      const page = String(payload.page || '').slice(0, 60);
      if (page) {
        logEvent(store, { email, type: 'page-visit', detail: { page } });
        saveBookingStore(store);
      }
      return sendJson(res, 200, { ok: true });
    }

    return sendJson(res, 404, { error: 'Acción desconocida.' });
  } catch (e) {
    console.error('[booking]', e);
    sendJson(res, 500, { error: 'Error interno.', detail: String((e && e.message) || e) });
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/.netlify/functions/tarot-interpret' && req.method === 'POST') {
    handleInterpret(req, res);
    return;
  }

  if (url.pathname === '/.netlify/functions/tarot-tts' && req.method === 'POST') {
    handleTTS(req, res);
    return;
  }

  if (url.pathname === '/.netlify/functions/booking') {
    handleBooking(req, res, url);
    return;
  }

  let filePath = decodeURIComponent(url.pathname);
  if (filePath === '/') filePath = '/Arcana.html';
  const fullPath = path.join(ROOT, filePath);

  if (!fullPath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(fullPath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('404 Not Found: ' + filePath);
      return;
    }
    const ext = path.extname(fullPath).toLowerCase();
    res.writeHead(200, { 'content-type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log('\n  Arcana — servidor local de desarrollo');
  console.log(`  -> http://localhost:${PORT}/Arcana.html\n`);
  console.log('  (Ctrl+C para detener)\n');
});
