// Reservas de sesiones de video (Marketplace real) — mismo comportamiento
// que local-server.js pero con Netlify Blobs como store compartido
// persistente (en local no hay Blobs disponible, por eso local-server.js
// usa un JSON en disco en su lugar — ver ese archivo para la referencia
// completa de cada acción, acá es la misma lógica). El cobro es con
// PayPal (Orders API v2): cobramos directo con nuestra cuenta Business.
import { getStore } from "@netlify/blobs";

const DEFAULT_SETTINGS = { sessionBasePrice: 22, planDiscounts: { luna: 10, estrella: 15, oraculo: 20 }, platformCommissionPct: 25 };

// 2026-09-08 (a pedido de Christian) -- ver local-server.js para el
// detalle completo comentado: panel de Setup con acceso real por email +
// contraseña. store.settings.powerUsers es la lista de correos
// autorizados; store.settings.setupPasswordHash es un hash sha256 de la
// contraseña (nunca se guarda en texto plano). Semilla inicial: solo
// cdiaz.delaigue@gmail.com, contraseña "Oficina123$".
const DEFAULT_POWER_USERS = ["cdiaz.delaigue@gmail.com"];

// 2026-09-08 (boletín diario) -- ver local-server.js para el comentario
// completo. La carta es SIEMPRE la carta del día real de la plataforma
// (misma fórmula determinística que App.jsx), la IA solo redacta el
// texto. El template y los datos de las cartas se leen del propio sitio
// desplegado (fetch a su origin) porque esta función no tiene acceso al
// filesystem del repo -- solo a lo que ella misma importa. Eso también
// resuelve solo la migración de dominio/hosting: usa siempre el origin
// real de la request (o el que se configure a mano en Setup).
const DEFAULT_NEWSLETTER_SCHEDULE = { hour: 8, minute: 0, daysOfWeek: [0, 1, 2, 3, 4, 5, 6] };
const DEFAULT_NEWSLETTER_SPECIAL_DATES = [
  { date: "01-01", label_es: "Año Nuevo", label_en: "New Year" },
  { date: "05-01", label_es: "Día del Trabajo", label_en: "Labor Day" },
  { date: "12-25", label_es: "Navidad", label_en: "Christmas" },
];
// assets/cards/NN-slug.jpg -- lista fija de las 22 cartas mayores (las
// únicas que puede salir como carta del día), evita tener que listar el
// directorio (no disponible vía fetch a un sitio estático).
const MAJOR_CARD_IMAGES: Record<number, string> = {
  0: "00-the-fool.jpg", 1: "01-the-magician.jpg", 2: "02-high-priestess.jpg",
  3: "03-the-empress.jpg", 4: "04-the-emperor.jpg", 5: "05-the-hierophant.jpg",
  6: "06-the-lovers.jpg", 7: "07-the-chariot.jpg", 8: "08-strength.jpg",
  9: "09-the-hermit.jpg", 10: "10-wheel-of-fortune.jpg", 11: "11-justice.jpg",
  12: "12-the-hanged-man.jpg", 13: "13-death.jpg", 14: "14-temperance.jpg",
  15: "15-the-devil.jpg", 16: "16-the-tower.jpg", 17: "17-the-star.jpg",
  18: "18-the-moon.jpg", 19: "19-the-sun.jpg", 20: "20-judgement.jpg",
  21: "21-the-world.jpg",
};
const DEFAULT_SETUP_PASSWORD = "Oficina123$";
const SETUP_SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 horas
// Variable de entorno legacy, opcional: si Christian la define en Netlify,
// sirve como contraseña maestra de respaldo (capa extra, no reemplaza lo
// de arriba).
const ARCANA_SETUP_PASSWORD = Netlify.env.get("ARCANA_SETUP_PASSWORD") || "";

async function hashSetupPassword(pw: string): Promise<string> {
  const enc = new TextEncoder().encode(String(pw || ""));
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function isPowerUser(store: any, email: string) {
  const e = (email || "").trim().toLowerCase();
  return !!e && Array.isArray(store.settings.powerUsers) && store.settings.powerUsers.includes(e);
}
function pruneSetupSessions(store: any) {
  const now = Date.now();
  for (const token of Object.keys(store.setupSessions)) {
    if (now - store.setupSessions[token].createdAt > SETUP_SESSION_TTL_MS) delete store.setupSessions[token];
  }
}
// Devuelve el email autorizado (via token de sesion vigente de un power
// user, o la contraseña legacy de ARCANA_SETUP_PASSWORD) o null.
function isAdminAuthorized(store: any, payload: any): string | null {
  pruneSetupSessions(store);
  const token = payload && payload.setupToken;
  const session = token ? store.setupSessions[token] : null;
  if (session && isPowerUser(store, session.email)) return session.email;
  if (ARCANA_SETUP_PASSWORD && payload && payload.adminPassword === ARCANA_SETUP_PASSWORD) return "admin";
  return null;
}
function requireAdmin(store: any, payload: any, actionName: string): string | null {
  const email = isAdminAuthorized(store, payload);
  if (email) {
    logEvent(store, { email, type: "admin-action", detail: { action: actionName } });
  }
  return email;
}
function logEvent(store: any, { email, type, detail }: { email: string; type: string; detail?: any }) {
  if (!Array.isArray(store.eventLog)) store.eventLog = [];
  store.eventLog.push({
    id: crypto.randomUUID(),
    ts: Date.now(),
    email: (email || "").trim().toLowerCase(),
    type: String(type || "").slice(0, 40),
    detail: detail && typeof detail === "object" ? detail : {},
  });
  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
  store.eventLog = store.eventLog.filter((e: any) => e.ts >= cutoff);
  if (store.eventLog.length > 5000) store.eventLog = store.eventLog.slice(store.eventLog.length - 5000);
}
// 2026-09-08 (a pedido de Christian): panel "Informes" en Setup -- ver
// local-server.js para el detalle completo comentado (misma lógica acá).
function buildReports(store: any) {
  const events = Array.isArray(store.eventLog) ? store.eventLog : [];
  const SESSION_GAP_MS = 30 * 60 * 1000;
  const byEmail: Record<string, any[]> = {};
  events.forEach((e: any) => {
    if (!e.email) return;
    if (!byEmail[e.email]) byEmail[e.email] = [];
    byEmail[e.email].push(e);
  });
  const users = Object.keys(byEmail).map((email) => {
    const evs = byEmail[email].slice().sort((a, b) => a.ts - b.ts);
    let sessions = 0;
    let totalMs = 0;
    let sessionStart: number | null = null;
    let lastTs = 0;
    const pages = new Set<string>();
    evs.forEach((e: any) => {
      if (e.type === "page-visit" && e.detail && e.detail.page) pages.add(e.detail.page);
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
    .filter((e: any) => e.type !== "page-visit" && e.type !== "admin-action" && e.type !== "setup-login")
    .slice().sort((a: any, b: any) => b.ts - a.ts).slice(0, 200);
  const adminActions = events
    .filter((e: any) => e.type === "admin-action" || e.type === "setup-login")
    .slice().sort((a: any, b: any) => b.ts - a.ts).slice(0, 200);
  return { users, movements, adminActions, totalEvents: events.length };
}

function seedStore() {
  return {
    tarotists: [
      {
        id: "arcana-live",
        name: "Lux Astral — Live",
        initials: "LA",
        specialty_es: "Lectura ceremonial en vivo",
        specialty_en: "Live ceremonial reading",
        style_es: "Rider-Waite · Cruz Celta · lectura pausada",
        style_en: "Rider-Waite · Celtic Cross · unhurried",
        color: "#d4a85a",
        status: "online",
        rate: DEFAULT_SETTINGS.sessionBasePrice,
        meetingLink: "",
        rating: 5.0,
        years: 1,
        readings: 0,
        availability: [] as any[],
      },
    ],
    bookings: [] as any[],
    subscribers: [] as any[],
    freeReadingUsage: {} as Record<string, any>,
    readingTickets: {} as Record<string, any>,
    readingsByEmail: {} as Record<string, any[]>,
    readingsMigrated: {} as Record<string, boolean>,
    feedback: { ratings: [] as any[], suggestions: [] as any[] },
    settings: {
      ...DEFAULT_SETTINGS,
      powerUsers: [...DEFAULT_POWER_USERS] as string[],
      setupPasswordHash: "" as string, // se completa async al primer loadStore()
      newsletterTemplate: "" as string, // "" = usa templates/newsletter-daily.html del sitio
      newsletterSchedule: { ...DEFAULT_NEWSLETTER_SCHEDULE },
      newsletterSpecialDates: [...DEFAULT_NEWSLETTER_SPECIAL_DATES],
      siteBaseUrl: "" as string,
    },
    setupSessions: {} as Record<string, any>,
    eventLog: [] as any[],
  };
}

async function loadStore() {
  const store = getStore({ name: "booking", consistency: "strong" });
  const raw = await store.get("state", { type: "json" });
  if (!raw) {
    const fresh = seedStore();
    fresh.settings.setupPasswordHash = await hashSetupPassword(DEFAULT_SETUP_PASSWORD);
    return fresh;
  }
  if (!raw.settings) raw.settings = { ...DEFAULT_SETTINGS };
  if (!raw.settings.planDiscounts) raw.settings.planDiscounts = { ...DEFAULT_SETTINGS.planDiscounts };
  if (!Array.isArray(raw.tarotists)) raw.tarotists = [];
  if (!Array.isArray(raw.bookings)) raw.bookings = [];
  if (!Array.isArray(raw.subscribers)) raw.subscribers = [];
  if (!raw.freeReadingUsage || typeof raw.freeReadingUsage !== "object") raw.freeReadingUsage = {};
  if (!raw.readingTickets || typeof raw.readingTickets !== "object") raw.readingTickets = {};
  if (!raw.readingsByEmail || typeof raw.readingsByEmail !== "object") raw.readingsByEmail = {};
  if (!raw.readingsMigrated || typeof raw.readingsMigrated !== "object") raw.readingsMigrated = {};
  if (!raw.feedback || typeof raw.feedback !== "object") raw.feedback = { ratings: [], suggestions: [] };
  if (!Array.isArray(raw.settings.powerUsers) || !raw.settings.powerUsers.length) {
    raw.settings.powerUsers = [...DEFAULT_POWER_USERS];
  }
  if (!raw.setupSessions || typeof raw.setupSessions !== "object") raw.setupSessions = {};
  if (!Array.isArray(raw.eventLog)) raw.eventLog = [];
  if (!raw.settings.setupPasswordHash) {
    raw.settings.setupPasswordHash = await hashSetupPassword(DEFAULT_SETUP_PASSWORD);
  }
  if (typeof raw.settings.newsletterTemplate !== "string") raw.settings.newsletterTemplate = "";
  if (!raw.settings.newsletterSchedule || typeof raw.settings.newsletterSchedule !== "object") {
    raw.settings.newsletterSchedule = { ...DEFAULT_NEWSLETTER_SCHEDULE };
  }
  if (!Array.isArray(raw.settings.newsletterSpecialDates)) {
    raw.settings.newsletterSpecialDates = [...DEFAULT_NEWSLETTER_SPECIAL_DATES];
  }
  if (typeof raw.settings.siteBaseUrl !== "string") raw.settings.siteBaseUrl = "";
  return raw;
}

async function saveStore(data: any) {
  const store = getStore({ name: "booking", consistency: "strong" });
  await store.setJSON("state", data);
}

function genId(prefix: string) {
  return prefix + "-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
}
function genBookingAccessCode() {
  const hex = "0123456789ABCDEF";
  let s = "";
  for (let i = 0; i < 6; i++) s += hex[Math.floor(Math.random() * 16)];
  return "LUX-" + s;
}
function slotIsAvailable(slot: any) {
  if (slot.booked) return false;
  if (slot.reservedUntil && new Date(slot.reservedUntil).getTime() > Date.now()) return false;
  return true;
}
function publicTarotists(store: any) {
  return store.tarotists.map((tr: any) => ({
    ...tr,
    availability: tr.availability.filter((s: any) => new Date(s.startsAt).getTime() > Date.now()),
  }));
}

function paypalApiBase(): string {
  return (Netlify.env.get("PAYPAL_ENV") || "sandbox") === "production"
    ? "https://api-m.paypal.com/"
    : "https://api-m.sandbox.paypal.com/";
}

let paypalTokenCache: { token: string | null; expiresAt: number } = { token: null, expiresAt: 0 };

async function paypalGetAccessToken(): Promise<string> {
  const clientId = Netlify.env.get("PAYPAL_CLIENT_ID");
  const clientSecret = Netlify.env.get("PAYPAL_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    const err: any = new Error("Faltan PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET en las variables de entorno de Netlify.");
    err.isConfig = true;
    throw err;
  }
  if (paypalTokenCache.token && paypalTokenCache.expiresAt > Date.now() + 30000) {
    return paypalTokenCache.token;
  }
  const res = await fetch(paypalApiBase() + "v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(clientId + ":" + clientSecret).toString("base64"),
      "content-type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data: any = await res.json();
  if (!res.ok) {
    const err: any = new Error(data.error_description || "No se pudo autenticar con PayPal");
    err.status = res.status;
    err.detail = data;
    throw err;
  }
  paypalTokenCache = { token: data.access_token, expiresAt: Date.now() + (data.expires_in || 300) * 1000 };
  return data.access_token;
}

async function paypalFetch(pathSuffix: string, opts: { method?: string; json?: any } = {}) {
  const token = await paypalGetAccessToken();
  const headers: Record<string, string> = { Authorization: "Bearer " + token };
  let body: string | undefined;
  if (opts.json !== undefined) {
    headers["content-type"] = "application/json";
    body = JSON.stringify(opts.json);
  }
  const res = await fetch(paypalApiBase() + pathSuffix, { method: opts.method || "GET", headers, body });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err: any = new Error(data.message || "Error de PayPal");
    err.status = res.status;
    err.detail = data;
    throw err;
  }
  return data;
}

// Suscripciones (PayPal Subscriptions/Billing API) — ver local-server.js
// para la explicación completa; misma lógica acá (cobro recurrente real,
// identificado por email, verificado en vivo contra PayPal en vez de
// depender de webhooks).
const SUBSCRIPTION_PLAN_DEFS = [
  { key: "luna_month", name: "Lux Astral — Luna (mensual)", value: "6.00", unit: "MONTH" },
  { key: "luna_year", name: "Lux Astral — Luna (anual)", value: "60.00", unit: "YEAR" },
  { key: "estrella_month", name: "Lux Astral — Estrella (mensual)", value: "9.00", unit: "MONTH" },
  { key: "estrella_year", name: "Lux Astral — Estrella (anual)", value: "90.00", unit: "YEAR" },
  { key: "oraculo_month", name: "Lux Astral — Oráculo (mensual)", value: "24.00", unit: "MONTH" },
  { key: "oraculo_year", name: "Lux Astral — Oráculo (anual)", value: "240.00", unit: "YEAR" },
];

async function paypalEnsureSubscriptionPlans(store: any) {
  // Idempotente por plan — ver local-server.js para la explicación completa.
  let productId = store.settings.paypalProductId;
  if (!productId) {
    const product: any = await paypalFetch("v1/catalogs/products", {
      method: "POST",
      json: { name: "Lux Astral — Membresía", type: "SERVICE", category: "SOFTWARE" },
    });
    productId = product.id;
    store.settings.paypalProductId = productId;
  }
  const planIds: Record<string, string> = { ...(store.settings.paypalPlanIds || {}) };
  for (const def of SUBSCRIPTION_PLAN_DEFS) {
    if (planIds[def.key]) continue;
    const plan: any = await paypalFetch("v1/billing/plans", {
      method: "POST",
      json: {
        product_id: productId,
        name: def.name,
        billing_cycles: [{
          frequency: { interval_unit: def.unit, interval_count: 1 },
          tenure_type: "REGULAR",
          sequence: 1,
          total_cycles: 0,
          pricing_scheme: { fixed_price: { value: def.value, currency_code: "USD" } },
        }],
        payment_preferences: { auto_bill_outstanding: true, setup_fee_failure_action: "CONTINUE", payment_failure_threshold: 2 },
      },
    });
    planIds[def.key] = plan.id;
  }
  store.settings.paypalPlanIds = planIds;
  return planIds;
}

// Plan de retención (oferta al cancelar): 25% off por UN ciclo de
// facturación y después vuelve solo al precio normal — ver la versión
// comentada en local-server.js para el detalle completo.
async function paypalEnsureRetentionPlan(store: any, planKey: string, billing: string) {
  const def = SUBSCRIPTION_PLAN_DEFS.find((d) => d.key === `${planKey}_${billing}`);
  if (!def) throw new Error(`Plan desconocido: ${planKey}_${billing}`);
  const retainKey = `${planKey}_${billing}_retain`;
  const ids: Record<string, string> = { ...(store.settings.paypalRetentionPlanIds || {}) };
  if (ids[retainKey]) return ids[retainKey];

  let productId = store.settings.paypalProductId;
  if (!productId) {
    const product: any = await paypalFetch("v1/catalogs/products", {
      method: "POST",
      json: { name: "Lux Astral — Membresía", type: "SERVICE", category: "SOFTWARE" },
    });
    productId = product.id;
    store.settings.paypalProductId = productId;
  }
  const fullPrice = Number(def.value);
  const discounted = (Math.round(fullPrice * 0.75 * 100) / 100).toFixed(2);
  const plan: any = await paypalFetch("v1/billing/plans", {
    method: "POST",
    json: {
      product_id: productId,
      name: `${def.name} — retención (25% off, 1 ciclo)`,
      billing_cycles: [
        {
          frequency: { interval_unit: def.unit, interval_count: 1 },
          tenure_type: "REGULAR",
          sequence: 1,
          total_cycles: 1,
          pricing_scheme: { fixed_price: { value: discounted, currency_code: "USD" } },
        },
        {
          frequency: { interval_unit: def.unit, interval_count: 1 },
          tenure_type: "REGULAR",
          sequence: 2,
          total_cycles: 0,
          pricing_scheme: { fixed_price: { value: def.value, currency_code: "USD" } },
        },
      ],
      payment_preferences: { auto_bill_outstanding: true, setup_fee_failure_action: "CONTINUE", payment_failure_threshold: 2 },
    },
  });
  ids[retainKey] = plan.id;
  store.settings.paypalRetentionPlanIds = ids;
  await saveStore(store);
  return plan.id;
}

async function verifySubscriberByEmail(store: any, email: string) {
  const key = (email || "").trim().toLowerCase();
  if (!key) return false;
  const sub = store.subscribers.find((s: any) => s.email === key);
  if (!sub) return false;
  // Membresías ad-honores (otorgadas a mano desde Setup, sin PayPal de por
  // medio) — su estado vive 100% en nuestro store, nunca llamamos a PayPal.
  if (sub.source === "honorary") return sub.status === "ACTIVE";
  if (!sub.subscriptionId) return false;
  try {
    const data: any = await paypalFetch(`v1/billing/subscriptions/${sub.subscriptionId}`);
    sub.status = data.status;
    sub.updatedAt = new Date().toISOString();
    return data.status === "ACTIVE";
  } catch (e: any) {
    if (!e.isConfig) console.error("[booking:subscriber-check]", e.status || "", e.detail || e.message);
    return sub.status === "ACTIVE";
  }
}

// Planes y límites de uso — ver local-server.js para la explicación
// completa; misma lógica acá. 2026-09-08: Luna y Estrella eligen su tipo
// de respuesta dentro de un rango; Oráculo no elige (Tipo 5 exclusivo).
const PLAN_RESPONSE_TYPE_OPTIONS: Record<string, string[]> = {
  luna: ["1", "2", "3"],
  estrella: ["1", "2", "3", "4"],
  oraculo: ["5"],
};
const PLAN_RESPONSE_TYPE_DEFAULT: Record<string, string> = { luna: "3", estrella: "4", oraculo: "5" };
const FREE_ALLOWED_SPREADS = ["daily", "three"];
const FREE_RESPONSE_TYPE = "2";
const FREE_DAILY_LIMIT = 1;

// 2026-09-08: ver local-server.js para el detalle completo comentado --
// misma logica de "reading tickets" aca, para que tarot-interpret.mts
// (funcion separada) pueda validar el mismo ticket via el store de Blobs
// compartido.
const RESPONSE_TYPE_MAX_FOLLOWUPS: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 2, "5": 5 };
const READING_TICKET_TTL_MS = 2 * 60 * 60 * 1000; // 2 horas

function pruneReadingTickets(store: any) {
  const now = Date.now();
  for (const id of Object.keys(store.readingTickets)) {
    if (now - store.readingTickets[id].createdAt > READING_TICKET_TTL_MS) delete store.readingTickets[id];
  }
}
function issueReadingTicket(store: any, email: string, responseType: string) {
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

// Antes usaban toISOString() (UTC) — ver local-server.js para el detalle;
// misma corrección acá: hora de Santiago, no UTC.
function todayKey() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });
}
function monthKey() {
  return todayKey().slice(0, 7);
}

async function resolveReadingAccess(store: any, email: string, spread: string, preferredResponseType?: string) {
  const key = (email || "").trim().toLowerCase();
  if (!key || !key.includes("@")) {
    return { allowed: false, reason: "email-required" };
  }
  const isSub = await verifySubscriberByEmail(store, key);
  const sub = isSub ? store.subscribers.find((s: any) => s.email === key) : null;
  if (isSub && sub && PLAN_RESPONSE_TYPE_OPTIONS[sub.planKey]) {
    const options = PLAN_RESPONSE_TYPE_OPTIONS[sub.planKey];
    const responseType = preferredResponseType && options.includes(preferredResponseType)
      ? preferredResponseType
      : PLAN_RESPONSE_TYPE_DEFAULT[sub.planKey];
    const ticketId = issueReadingTicket(store, key, responseType);
    return { allowed: true, responseType, planKey: sub.planKey, responseTypeOptions: options, ticketId };
  }
  if (!FREE_ALLOWED_SPREADS.includes(spread)) {
    return { allowed: false, reason: "spread-not-allowed" };
  }
  const today = todayKey();
  const usage = store.freeReadingUsage[key];
  const countToday = usage && usage.date === today ? usage.count : 0;
  if (countToday >= FREE_DAILY_LIMIT) {
    return { allowed: false, reason: "daily-limit" };
  }
  store.freeReadingUsage[key] = { date: today, count: countToday + 1 };
  const ticketId = issueReadingTicket(store, key, FREE_RESPONSE_TYPE);
  return { allowed: true, responseType: FREE_RESPONSE_TYPE, planKey: "vela", ticketId };
}

async function checkOraculoFreeSlot(store: any, email: string) {
  const key = (email || "").trim().toLowerCase();
  const isSub = await verifySubscriberByEmail(store, key);
  const sub = isSub ? store.subscribers.find((s: any) => s.email === key) : null;
  if (!isSub || !sub || sub.planKey !== "oraculo") return { eligible: false } as any;
  const mk = monthKey();
  if (sub.lastFreeSessionMonth === mk) return { eligible: false, sub, monthKey: mk } as any;
  return { eligible: true, sub, monthKey: mk } as any;
}

// =====================================================================
// Membresías ad-honores + newsletter (Resend) — ver local-server.js para
// el comentario completo, misma lógica acá (Netlify.env.get en vez de
// process.env, Blobs en vez de JSON en disco).
// =====================================================================
const HONORARY_PLAN_KEYS = ["luna", "estrella", "oraculo"];

async function resendSend(to: string, subject: string, html: string) {
  const key = Netlify.env.get("RESEND_API_KEY");
  if (!key) {
    const err: any = new Error("Falta RESEND_API_KEY (agregala a las variables de entorno del sitio en Netlify para poder mandar emails).");
    err.isConfig = true;
    throw err;
  }
  const from = Netlify.env.get("RESEND_FROM") || "Lux Astral <hola@luxastral.com>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err: any = new Error(data.message || "Error de Resend");
    err.status = res.status;
    err.detail = data;
    throw err;
  }
  return data;
}

function activationEmailHtml(planKey: string, activationUrl: string, es: boolean) {
  const planName = ({ luna: "Luna", estrella: "Estrella" } as Record<string, string>)[planKey] || planKey;
  const title = es ? `¡Te regalamos una membresía ${planName}!` : `You've been gifted a ${planName} membership!`;
  const body = es
    ? `Alguien de Lux Astral te otorgó una membresía <strong>${planName}</strong>, sin costo. Hacé clic abajo para activarla y ver tu bienvenida.`
    : `Someone at Lux Astral gifted you a <strong>${planName}</strong> membership, free of charge. Click below to activate it and see your welcome.`;
  const cta = es ? "Activar mi membresía" : "Activate my membership";
  return `<div style="font-family:Georgia,serif;background:#0f0a24;color:#f0e2c0;padding:32px;text-align:center;">
    <h1 style="color:#d4a85a;font-size:22px;">${title}</h1>
    <p style="font-size:15px;line-height:1.6;max-width:420px;margin:16px auto;">${body}</p>
    <a href="${activationUrl}" style="display:inline-block;margin-top:16px;padding:12px 28px;background:#d4a85a;color:#0f0a24;text-decoration:none;border-radius:8px;font-weight:bold;">${cta}</a>
  </div>`;
}

// src/data/cards.js es un IIFE que arma window.TAROT_CARDS -- esta función
// no tiene filesystem del repo (solo lo que ella misma importa), así que
// lo trae por fetch desde el propio sitio desplegado (mismo archivo que
// ya carga el cliente) y lo evalúa en un sandbox mínimo.
let _tarotCardsCache: any = null;
async function loadTarotCardsData(origin: string) {
  if (_tarotCardsCache) return _tarotCardsCache;
  const res = await fetch(`${origin}/src/data/cards.js`);
  if (!res.ok) throw new Error("No se pudo leer src/data/cards.js desde " + origin);
  const code = await res.text();
  const sandbox: any = {};
  const fn = new Function("window", code + "\n;return window.TAROT_CARDS;");
  _tarotCardsCache = fn(sandbox);
  return _tarotCardsCache;
}

// Misma fórmula determinística que App.jsx (dailyCard) -- mismo día,
// misma carta, para toda la plataforma. Se calcula en hora de Santiago
// (mismo criterio que todayKey()).
async function computeDailyMajorCard(origin: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago", year: "numeric", month: "numeric", day: "numeric",
  }).formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const year = get("year");
  const month = get("month") - 1; // 0-indexed, igual que Date#getMonth()
  const day = get("day");
  const key = `${year}-${month}-${day}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  const cards = await loadTarotCardsData(origin);
  const idx = Math.abs(hash) % cards.major.length;
  const monthDay = `${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return { card: cards.major[idx], monthDay };
}

function findSpecialDate(store: any, monthDay: string) {
  const list = Array.isArray(store.settings.newsletterSpecialDates) ? store.settings.newsletterSpecialDates : [];
  return list.find((d: any) => d && d.date === monthDay) || null;
}

// Igual que src/data/cards.js: sustitución simple {{clave}} -> valor.
function renderNewsletterTemplate(template: string, vars: Record<string, string>) {
  return String(template || "").replace(/\{\{(\w+)\}\}/g, (m, key) => (key in vars ? String(vars[key]) : m));
}

// El template también vive en el sitio desplegado (templates/newsletter-daily.html,
// mismo publish directory que sirve src/data/cards.js) -- se usa solo si
// Setup todavía no guardó uno propio en store.settings.newsletterTemplate.
async function loadDefaultNewsletterTemplate(origin: string) {
  try {
    const res = await fetch(`${origin}/templates/newsletter-daily.html`);
    if (!res.ok) return "";
    return await res.text();
  } catch (e) {
    return "";
  }
}

// Contenido del boletín diario. La carta es SIEMPRE la carta del día real
// de la plataforma (nunca la inventa la IA) -- la IA solo redacta la
// interpretación y el consejo a partir de esa carta (y, si corresponde,
// de la fecha especial configurada en Setup). El resultado se inyecta en
// el template HTML (store.settings.newsletterTemplate, editable desde
// Setup) reemplazando los {{placeholders}}.
async function generateNewsletterContent(store: any, siteBaseUrl: string) {
  const apiKey = Netlify.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    const err: any = new Error("Falta ANTHROPIC_API_KEY para generar el boletín.");
    err.isConfig = true;
    throw err;
  }
  const base = (siteBaseUrl || "").replace(/\/$/, "");
  if (!base) {
    const err: any = new Error("Falta la URL del sitio (siteBaseUrl) para armar el boletín -- configurala en Setup o abrí el botón de envío desde el propio sitio.");
    err.isConfig = true;
    throw err;
  }
  const { card, monthDay } = await computeDailyMajorCard(base);
  const special = findSpecialDate(store, monthDay);
  const cardNameDisplay = card.name_es;
  const keywords = (card.keywords_es || []).join(" · ").toUpperCase();
  const specialNote = special
    ? `Hoy es una fecha especial: ${special.label_es}. Sin dejar de hablar de la carta indicada, que el CONSEJO del día tenga en cuenta ese espíritu.`
    : "";
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
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 900, messages: [{ role: "user", content: prompt }] }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    const err: any = new Error("Error de Anthropic al generar el boletín.");
    err.status = res.status;
    err.detail = detail;
    throw err;
  }
  const data: any = await res.json();
  const text = (data.content || []).map((b: any) => b.text || "").join("").trim();
  const parts = text.split("---").map((p: string) => p.trim());
  const pick = (label: string, fallback: string) => {
    const p = parts.find((x: string) => x.toUpperCase().startsWith(label + ":"));
    const v = p ? p.slice(p.indexOf(":") + 1).trim() : "";
    return v || fallback;
  };
  const interpretacion = pick("INTERPRETACION", text);
  const frase = pick("FRASE", "");
  const consejoTitulo = pick("CONSEJO_TITULO", "Un consejo para hoy");
  const consejo = pick("CONSEJO", "");

  const cardFile = MAJOR_CARD_IMAGES[card.id] || "";
  const fechaLarga = new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago", weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).format(new Date());
  const fechaCapitalizada = fechaLarga.charAt(0).toUpperCase() + fechaLarga.slice(1);

  const template = store.settings.newsletterTemplate || await loadDefaultNewsletterTemplate(base);
  const html = renderNewsletterTemplate(template, {
    fecha_larga: fechaCapitalizada,
    nombre_carta: cardNameDisplay.toUpperCase(),
    palabras_clave: keywords,
    interpretacion_carta: interpretacion,
    frase_destacada: frase,
    titulo_consejo: consejoTitulo,
    consejo_dia: consejo,
    url_imagen_carta: cardFile ? `${base}/assets/cards/${cardFile}` : "",
    url_imagen_consejo: `${base}/assets/newsletter/consejo.jpg`,
    url_sitio: base,
  });
  return { cardName: cardNameDisplay, html };
}

function newsletterEmailHtml(cardName: string, bodyHtml: string) {
  return `<div style="font-family:Georgia,serif;background:#0f0a24;color:#f0e2c0;padding:32px;">
    <p style="color:#b3a8c8;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Lux Astral · Boletín diario</p>
    <h1 style="color:#d4a85a;font-size:22px;margin-top:4px;">${cardName}</h1>
    <div style="font-size:15px;line-height:1.7;">${bodyHtml}</div>
    <p style="margin-top:28px;font-size:11px;color:#6b6188;">Recibís esto porque activaste el boletín diario en tu perfil de Lux Astral.</p>
  </div>`;
}

// Daily.co: misma lógica que local-server.js (ver ese archivo para el
// comentario completo) — sala embebida por sesión pagada, con fallback
// silencioso al link manual de la tarotista si no hay DAILY_API_KEY.
async function dailyFetch(pathSuffix: string, opts: { method?: string; json?: any } = {}) {
  const key = Netlify.env.get("DAILY_API_KEY");
  if (!key) {
    const err: any = new Error("Falta DAILY_API_KEY.");
    err.isConfig = true;
    throw err;
  }
  const headers: Record<string, string> = { Authorization: "Bearer " + key };
  let body: string | undefined;
  if (opts.json !== undefined) {
    headers["content-type"] = "application/json";
    body = JSON.stringify(opts.json);
  }
  const res = await fetch("https://api.daily.co/v1/" + pathSuffix, { method: opts.method || "GET", headers, body });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err: any = new Error(data.info || data.error || "Error de Daily");
    err.status = res.status;
    err.detail = data;
    throw err;
  }
  return data;
}

async function ensureVideoRoom(booking: any, tr: any, slot: any) {
  if (booking.videoRoomUrl || !slot) return;
  const startMs = new Date(slot.startsAt).getTime();
  const durationMin = slot.durationMin || 30;
  const nbf = Math.floor((startMs - 10 * 60 * 1000) / 1000);
  const exp = Math.floor((startMs + durationMin * 60 * 1000 + 20 * 60 * 1000) / 1000);
  try {
    const room: any = await dailyFetch("rooms", {
      method: "POST",
      json: {
        name: "lux-" + booking.id,
        privacy: "public",
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
  } catch (e: any) {
    if (!e.isConfig) console.error("[booking:daily]", e.status || "", e.detail || e.message);
  }
  booking.videoJoinFrom = new Date(nbf * 1000).toISOString();
  booking.videoJoinUntil = new Date(exp * 1000).toISOString();
}

function json(status: number, obj: any) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}

export default async (req: Request) => {
  const url = new URL(req.url);

  try {
    if (req.method === "GET") {
      const action = url.searchParams.get("action");
      const store = await loadStore();
      if (action === "tarotistas") {
        return json(200, {
          tarotists: publicTarotists(store),
          settings: store.settings,
          paypalClientId: Netlify.env.get("PAYPAL_CLIENT_ID") || "",
        });
      }
      if (action === "my-bookings") {
        const email = (url.searchParams.get("email") || "").trim().toLowerCase();
        const list = store.bookings
          .filter((b: any) => b.status === "paid" && b.customerEmail.toLowerCase() === email)
          .map((b: any) => {
            const tr = store.tarotists.find((x: any) => x.id === b.tarotistId);
            const slot = tr && tr.availability.find((s: any) => s.id === b.slotId);
            return {
              id: b.id, accessCode: b.accessCode, amount: b.amount,
              tarotistName: tr ? tr.name : "", when: slot ? slot.startsAt : null,
              durationMin: slot ? slot.durationMin : null,
              videoJoinFrom: b.videoJoinFrom || null, videoJoinUntil: b.videoJoinUntil || null,
            };
          });
        return json(200, { bookings: list });
      }
      if (action === "admin-sessions") {
        if (!isAdminAuthorized(store, { setupToken: url.searchParams.get("setupToken") || "" })) return json(401, { error: "Contraseña de administración incorrecta o faltante." });
        const now = Date.now();
        const list = store.bookings
          .filter((b: any) => b.status === "paid")
          .map((b: any) => {
            const tr = store.tarotists.find((x: any) => x.id === b.tarotistId);
            const slot = tr && tr.availability.find((s: any) => s.id === b.slotId);
            return {
              id: b.id, tarotistName: tr ? tr.name : "", customerName: b.customerName, customerEmail: b.customerEmail,
              when: slot ? slot.startsAt : null, videoRoomUrl: b.videoRoomUrl || "", meetingLink: tr ? tr.meetingLink : "",
            };
          })
          .filter((b: any) => b.when && new Date(b.when).getTime() > now - 60 * 60 * 1000)
          .sort((a: any, b: any) => new Date(a.when).getTime() - new Date(b.when).getTime());
        return json(200, { sessions: list });
      }
      if (action === "subscription-plans") {
        return json(200, { plans: store.settings.paypalPlanIds || null, paypalClientId: Netlify.env.get("PAYPAL_CLIENT_ID") || "" });
      }
      if (action === "subscriber-status") {
        const email = (url.searchParams.get("email") || "").trim().toLowerCase();
        const isSub = await verifySubscriberByEmail(store, email);
        const sub = store.subscribers.find((s: any) => s.email === email);
        const oraculoFreeSlotAvailable = !!(isSub && sub && sub.planKey === "oraculo" && sub.lastFreeSessionMonth !== monthKey());
        await saveStore(store);
        return json(200, {
          isSubscriber: isSub,
          planKey: isSub && sub ? sub.planKey : null,
          billing: isSub && sub ? sub.billing : null,
          oraculoFreeSlotAvailable,
        });
      }
      if (action === "list-memberships") {
        if (!isAdminAuthorized(store, { setupToken: url.searchParams.get("setupToken") || "" })) return json(401, { error: "Contraseña de administración incorrecta o faltante." });
        const list = store.subscribers.map((s: any) => ({
          email: s.email, planKey: s.planKey, source: s.source || "paypal", status: s.status,
          newsletterOptIn: !!s.newsletterOptIn, activatedAt: s.activatedAt || null,
          honoraryGrantedAt: s.honoraryGrantedAt || null, updatedAt: s.updatedAt || null,
        }));
        return json(200, { subscribers: list });
      }
      if (action === "join") {
        const code = (url.searchParams.get("code") || "").trim().toUpperCase();
        const booking = store.bookings.find((b: any) => b.accessCode === code);
        if (!booking || booking.status !== "paid") {
          return json(404, { error: "Código no válido o la reserva no está pagada." });
        }
        const tr = store.tarotists.find((x: any) => x.id === booking.tarotistId);
        const slot = tr && tr.availability.find((s: any) => s.id === booking.slotId);
        const now = Date.now();
        const from = booking.videoJoinFrom ? new Date(booking.videoJoinFrom).getTime() : null;
        const until = booking.videoJoinUntil ? new Date(booking.videoJoinUntil).getTime() : null;
        const tarotistName = tr ? tr.name : "";
        const when = slot ? slot.startsAt : null;
        if (from && now < from) {
          return json(200, { status: "too-early", joinFrom: booking.videoJoinFrom, tarotistName, when });
        }
        if (until && now > until) {
          return json(200, { status: "expired", tarotistName, when });
        }
        return json(200, {
          status: "ready", tarotistName, when,
          videoRoomUrl: booking.videoRoomUrl || "",
          meetingLink: tr ? tr.meetingLink : "",
        });
      }
      if (action === "power-user-status") {
        const email = (url.searchParams.get("email") || "").trim().toLowerCase();
        return json(200, { isPowerUser: isPowerUser(store, email) });
      }
      if (action === "get-reports") {
        if (!isAdminAuthorized(store, { setupToken: url.searchParams.get("setupToken") || "" })) {
          return json(401, { error: "Contraseña de administración incorrecta o faltante." });
        }
        return json(200, buildReports(store));
      }
      return json(404, { error: "Acción GET desconocida." });
    }

    if (req.method !== "POST") return json(405, { error: "Método no permitido." });

    let payload: any;
    try {
      payload = await req.json();
    } catch {
      return json(400, { error: "JSON inválido." });
    }
    const action = payload.action;
    const store = await loadStore();

    if (action === "save-tarotist") {
      if (!requireAdmin(store, payload, action)) return json(401, { error: "Contraseña de administración incorrecta o faltante." });
      const tr = payload.tarotist || {};
      if (!tr.name || !tr.name.trim()) return json(400, { error: "Falta el nombre." });
      let entry = store.tarotists.find((x: any) => x.id === tr.id);
      if (entry) {
        Object.assign(entry, tr);
      } else {
        entry = {
          id: tr.id || genId("custom"),
          initials: tr.name.trim().split(/\s+/).map((w: string) => w[0]).slice(0, 2).join("").toUpperCase(),
          rating: 5.0, years: 1, readings: 0, status: "online", availability: [],
          ...tr,
        };
        store.tarotists.push(entry);
      }
      await saveStore(store);
      return json(200, { tarotist: entry });
    }

    if (action === "delete-tarotist") {
      if (!requireAdmin(store, payload, action)) return json(401, { error: "Contraseña de administración incorrecta o faltante." });
      store.tarotists = store.tarotists.filter((x: any) => x.id !== payload.id);
      await saveStore(store);
      return json(200, { ok: true });
    }

    if (action === "add-slot") {
      if (!requireAdmin(store, payload, action)) return json(401, { error: "Contraseña de administración incorrecta o faltante." });
      const tr = store.tarotists.find((x: any) => x.id === payload.tarotistId);
      if (!tr) return json(404, { error: "Tarotista no encontrada." });
      const slot = { id: genId("slot"), startsAt: payload.startsAt, durationMin: payload.durationMin || 30, booked: false };
      tr.availability.push(slot);
      await saveStore(store);
      return json(200, { slot });
    }

    if (action === "add-slots-bulk") {
      if (!requireAdmin(store, payload, action)) return json(401, { error: "Contraseña de administración incorrecta o faltante." });
      const tr = store.tarotists.find((x: any) => x.id === payload.tarotistId);
      if (!tr) return json(404, { error: "Tarotista no encontrada." });
      const incoming = Array.isArray(payload.slots) ? payload.slots : [];
      const added = incoming
        .filter((s: any) => s && s.startsAt)
        .map((s: any) => ({ id: genId("slot"), startsAt: s.startsAt, durationMin: s.durationMin || 30, booked: false }));
      tr.availability.push(...added);
      await saveStore(store);
      return json(200, { added: added.length });
    }

    if (action === "remove-slot") {
      if (!requireAdmin(store, payload, action)) return json(401, { error: "Contraseña de administración incorrecta o faltante." });
      const tr = store.tarotists.find((x: any) => x.id === payload.tarotistId);
      if (!tr) return json(404, { error: "Tarotista no encontrada." });
      const slot = tr.availability.find((s: any) => s.id === payload.slotId);
      if (slot && slot.booked) return json(400, { error: "Ese horario ya tiene una reserva pagada, no se puede borrar." });
      tr.availability = tr.availability.filter((s: any) => s.id !== payload.slotId);
      await saveStore(store);
      return json(200, { ok: true });
    }

    if (action === "save-settings") {
      if (!requireAdmin(store, payload, action)) return json(401, { error: "Contraseña de administración incorrecta o faltante." });
      store.settings = { ...store.settings, ...payload.settings };
      await saveStore(store);
      return json(200, { settings: store.settings });
    }

    if (action === "provision-subscription-plans") {
      if (!requireAdmin(store, payload, action)) return json(401, { error: "Contraseña de administración incorrecta o faltante." });
      try {
        const plans = await paypalEnsureSubscriptionPlans(store);
        await saveStore(store);
        return json(200, { plans });
      } catch (e: any) {
        if (e.isConfig) return json(500, { error: e.message });
        console.error("[booking:provision-plans]", e.status || "", e.detail || e.message);
        return json(502, { error: "No se pudieron crear los planes en PayPal.", detail: e.detail });
      }
    }

    if (action === "confirm-subscription") {
      const { subscriptionId, customerEmail, planKey, billing } = payload;
      const email = (customerEmail || "").trim().toLowerCase();
      if (!subscriptionId || !email || !email.includes("@")) {
        return json(400, { error: "Faltan datos de la suscripción." });
      }
      let sub: any;
      try {
        sub = await paypalFetch(`v1/billing/subscriptions/${subscriptionId}`);
      } catch (e: any) {
        if (e.isConfig) return json(500, { error: e.message });
        return json(502, { error: "No se pudo verificar la suscripción con PayPal.", detail: e.detail });
      }
      const okStatuses = ["ACTIVE", "APPROVAL_PENDING", "APPROVED"];
      if (!okStatuses.includes(sub.status)) {
        return json(200, { status: sub.status, isSubscriber: false });
      }
      // 2026-09-08 (auditoría) -- ver local-server.js para el detalle
      // completo comentado: el plan real se DERIVA del plan_id que
      // devuelve PayPal, nunca se confía en el planKey/billing que manda
      // el navegador (evita pagar el plan más barato y quedar con el más
      // caro).
      const planIds: Record<string, string> = store.settings.paypalPlanIds || {};
      const matchedKey = Object.keys(planIds).find((k) => planIds[k] === sub.plan_id);
      if (!matchedKey) {
        console.error("[confirm-subscription] plan_id de PayPal no coincide con ningún plan provisionado:", sub.plan_id, "email:", email);
        return json(409, { error: "No pudimos verificar qué plan pagaste — escribinos a comentarios@luxastral.com." });
      }
      const [realPlanKey, realBillingRaw] = matchedKey.split("_");
      const realBilling = realBillingRaw === "year" ? "year" : "month";
      let entry = store.subscribers.find((s: any) => s.email === email);
      if (!entry) {
        entry = { email, source: "paypal", newsletterOptIn: false };
        store.subscribers.push(entry);
      }
      entry.subscriptionId = subscriptionId;
      entry.planKey = realPlanKey;
      entry.billing = realBilling;
      entry.status = sub.status;
      entry.updatedAt = new Date().toISOString();
      if (typeof entry.newsletterOptIn !== "boolean") entry.newsletterOptIn = false;
      if (sub.status === "ACTIVE") {
        logEvent(store, { email, type: "income", detail: { planKey: realPlanKey, billing: realBilling } });
      }
      await saveStore(store);
      return json(200, { status: sub.status, isSubscriber: sub.status === "ACTIVE", planKey: entry.planKey });
    }

    if (action === "cancel-subscription") {
      // Botón "Cancelar Membresía" en Perfil — ver local-server.js para
      // el detalle completo comentado (misma lógica acá).
      const email = (payload.email || "").trim().toLowerCase();
      if (!email) return json(400, { error: "Falta el email." });
      const reason = (payload.reason || "").trim().slice(0, 60);
      const reasonDetail = (payload.reasonDetail || "").trim().slice(0, 1000);
      const isActive = await verifySubscriberByEmail(store, email);
      const entry = store.subscribers.find((s: any) => s.email === email);
      if (!entry || !isActive) return json(404, { error: "No encontramos una membresía activa con ese email." });

      if (entry.source !== "honorary") {
        if (!entry.subscriptionId) {
          return json(400, { error: "Esta membresía no tiene una suscripción de PayPal asociada." });
        }
        try {
          await paypalFetch(`v1/billing/subscriptions/${entry.subscriptionId}/cancel`, {
            method: "POST",
            json: { reason: reason || "Cancelado por la clienta desde su perfil." },
          });
        } catch (e: any) {
          if (e.isConfig) return json(500, { error: e.message });
          console.error("[booking:cancel-subscription]", e.status || "", e.detail || e.message);
          return json(502, { error: "No se pudo cancelar la suscripción con PayPal.", detail: e.detail });
        }
      }
      entry.status = "CANCELLED";
      entry.cancelReason = reason || null;
      entry.cancelReasonDetail = reasonDetail || null;
      entry.cancelledAt = new Date().toISOString();
      entry.updatedAt = new Date().toISOString();
      logEvent(store, { email, type: "subscription-cancelled", detail: { planKey: entry.planKey, reason } });
      await saveStore(store);

      let emailSent = false;
      let emailError = "";
      try {
        await resendSend(
          "comentarios@luxastral.com",
          `Cancelación de membresía — ${email}`,
          `<div style="font-family:Georgia,serif;padding:16px;">
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Plan:</strong> ${entry.planKey || "—"} (${entry.billing || "—"})</p>
            <p><strong>Motivo:</strong> ${reason || "(sin especificar)"}</p>
            ${reasonDetail ? `<p><strong>Detalle:</strong> ${reasonDetail}</p>` : ""}
          </div>`
        );
        emailSent = true;
      } catch (e: any) {
        emailError = e.isConfig ? e.message : (e.detail && e.detail.message) || e.message || "No se pudo enviar el email.";
      }
      return json(200, { ok: true, emailSent, emailError });
    }

    if (action === "apply-retention-offer") {
      const email = (payload.email || "").trim().toLowerCase();
      if (!email) return json(400, { error: "Falta el email." });
      const isActive = await verifySubscriberByEmail(store, email);
      const entry = store.subscribers.find((s: any) => s.email === email);
      if (!entry || !isActive) return json(404, { error: "No encontramos una membresía activa con ese email." });
      if (entry.source === "honorary" || !entry.subscriptionId) {
        return json(400, { error: "Esta membresía no admite la oferta de descuento (no tiene suscripción de PayPal)." });
      }
      const planKey = entry.planKey;
      const billing = entry.billing === "year" ? "year" : "month";
      let retainPlanId: string;
      try {
        retainPlanId = await paypalEnsureRetentionPlan(store, planKey, billing);
      } catch (e: any) {
        if (e.isConfig) return json(500, { error: e.message });
        console.error("[booking:apply-retention-offer:ensure-plan]", e.status || "", e.detail || e.message);
        return json(502, { error: "No se pudo preparar la oferta con PayPal.", detail: e.detail });
      }
      let revised: any;
      try {
        revised = await paypalFetch(`v1/billing/subscriptions/${entry.subscriptionId}/revise`, {
          method: "POST",
          json: { plan_id: retainPlanId },
        });
      } catch (e: any) {
        if (e.isConfig) return json(500, { error: e.message });
        console.error("[booking:apply-retention-offer:revise]", e.status || "", e.detail || e.message);
        return json(502, { error: "No se pudo aplicar la oferta en PayPal.", detail: e.detail });
      }
      entry.retentionOfferAppliedAt = new Date().toISOString();
      entry.updatedAt = new Date().toISOString();
      await saveStore(store);

      const approveLink = revised && Array.isArray(revised.links) ? revised.links.find((l: any) => l.rel === "approve") : null;
      return json(200, { ok: true, needsApproval: !!approveLink, approveUrl: approveLink ? approveLink.href : null });
    }

    if (action === "submit-app-rating") {
      const rating = Math.max(1, Math.min(5, Math.round(Number(payload.rating) || 0)));
      if (!rating) return json(400, { error: "Falta la calificación." });
      const email = (payload.email || "").trim();
      const comment = (payload.comment || "").trim().slice(0, 1000);
      store.feedback.ratings.push({ rating, email: email || null, comment: comment || null, at: new Date().toISOString() });
      await saveStore(store);
      let emailSent = false;
      let emailError = "";
      try {
        await resendSend(
          "comentarios@luxastral.com",
          `Nueva calificación de la app: ${rating}/5`,
          `<div style="font-family:Georgia,serif;padding:16px;">
            <p><strong>Calificación:</strong> ${rating}/5</p>
            ${email ? `<p><strong>Email:</strong> ${email}</p>` : ""}
            ${comment ? `<p><strong>Comentario:</strong> ${comment}</p>` : ""}
          </div>`
        );
        emailSent = true;
      } catch (e: any) {
        emailError = e.isConfig ? e.message : (e.detail && e.detail.message) || e.message || "No se pudo enviar el email.";
      }
      return json(200, { ok: true, emailSent, emailError });
    }

    if (action === "submit-suggestion") {
      const message = (payload.message || "").trim().slice(0, 2000);
      if (!message) return json(400, { error: "Escribí tu sugerencia primero." });
      const email = (payload.email || "").trim();
      store.feedback.suggestions.push({ message, email: email || null, at: new Date().toISOString() });
      await saveStore(store);
      let emailSent = false;
      let emailError = "";
      try {
        await resendSend(
          "comentarios@luxastral.com",
          "Nueva sugerencia desde el sitio",
          `<div style="font-family:Georgia,serif;padding:16px;">
            ${email ? `<p><strong>Email:</strong> ${email}</p>` : ""}
            <p style="white-space:pre-wrap;">${message}</p>
          </div>`
        );
        emailSent = true;
      } catch (e: any) {
        emailError = e.isConfig ? e.message : (e.detail && e.detail.message) || e.message || "No se pudo enviar el email.";
      }
      return json(200, { ok: true, emailSent, emailError });
    }

    if (action === "grant-honorary-membership") {
      const grantedBy = requireAdmin(store, payload, action);
      if (!grantedBy) return json(401, { error: "Contraseña de administración incorrecta o faltante." });
      const { email: rawEmail, planKey, origin, sendEmail, lang } = payload;
      const email = (rawEmail || "").trim().toLowerCase();
      if (!email || !email.includes("@")) return json(400, { error: "Falta un email válido." });
      if (!HONORARY_PLAN_KEYS.includes(planKey)) {
        return json(400, { error: "Las membresías ad-honores son solo para Luna o Estrella." });
      }
      let entry = store.subscribers.find((s: any) => s.email === email);
      if (!entry) {
        entry = { email };
        store.subscribers.push(entry);
      }
      entry.planKey = planKey;
      entry.source = "honorary";
      entry.status = "ACTIVE";
      entry.subscriptionId = null;
      entry.billing = "honorary";
      entry.activationToken = entry.activationToken || genId("act");
      entry.activatedAt = entry.activatedAt || null;
      if (typeof entry.newsletterOptIn !== "boolean") entry.newsletterOptIn = false;
      entry.honoraryGrantedAt = entry.honoraryGrantedAt || new Date().toISOString();
      entry.updatedAt = new Date().toISOString();
      logEvent(store, { email, type: "membership-granted", detail: { planKey, by: grantedBy } });
      await saveStore(store);
      const base = (origin || "").replace(/\/$/, "");
      const activationUrl = `${base}/Arcana.html?activate=${entry.activationToken}`;
      let emailSent = false;
      let emailError = "";
      if (sendEmail) {
        try {
          await resendSend(
            email,
            lang === "en" ? "You've been gifted a Lux Astral membership" : "Te regalamos una membresía en Lux Astral",
            activationEmailHtml(planKey, activationUrl, lang !== "en")
          );
          emailSent = true;
        } catch (e: any) {
          emailError = e.isConfig ? e.message : (e.detail && e.detail.message) || e.message || "No se pudo enviar el email.";
        }
      }
      return json(200, { activationUrl, activationToken: entry.activationToken, emailSent, emailError });
    }

    if (action === "revoke-membership") {
      const revokedBy = requireAdmin(store, payload, action);
      if (!revokedBy) return json(401, { error: "Contraseña de administración incorrecta o faltante." });
      const email = (payload.email || "").trim().toLowerCase();
      const entry = store.subscribers.find((s: any) => s.email === email && s.source === "honorary");
      if (!entry) return json(404, { error: "No se encontró una membresía ad-honores con ese email." });
      entry.status = "CANCELLED";
      entry.updatedAt = new Date().toISOString();
      logEvent(store, { email, type: "membership-revoked", detail: { planKey: entry.planKey, by: revokedBy } });
      await saveStore(store);
      return json(200, { ok: true });
    }

    if (action === "activate-membership") {
      const token = (payload.token || "").trim();
      const entry = store.subscribers.find((s: any) => s.activationToken === token);
      if (!entry) return json(404, { error: "El link de activación no es válido." });
      if (!entry.activatedAt) entry.activatedAt = new Date().toISOString();
      await saveStore(store);
      return json(200, { email: entry.email, planKey: entry.planKey, source: entry.source || "paypal" });
    }

    if (action === "newsletter-optin") {
      const email = (payload.email || "").trim().toLowerCase();
      const optIn = !!payload.optIn;
      const entry = store.subscribers.find((s: any) => s.email === email);
      if (!entry) return json(404, { error: "No encontramos una membresía con ese email." });
      entry.newsletterOptIn = optIn;
      entry.updatedAt = new Date().toISOString();
      await saveStore(store);
      return json(200, { ok: true, newsletterOptIn: optIn });
    }

    if (action === "send-daily-newsletter") {
      if (!requireAdmin(store, payload, action)) return json(401, { error: "Contraseña de administración incorrecta o faltante." });
      // Botón manual en Setup (el disparo automático queda pendiente de la
      // decisión de hosting) -- usa SIEMPRE la carta del día real de la
      // plataforma (nunca una inventada), la IA solo redacta el texto.
      const today = todayKey();
      if (store.settings.lastNewsletterSentDate === today && !payload.force) {
        return json(200, { skipped: true, reason: "already-sent-today" });
      }
      const siteBaseUrl = (store.settings.siteBaseUrl || payload.origin || "").replace(/\/$/, "");
      let content: any;
      try {
        content = await generateNewsletterContent(store, siteBaseUrl);
      } catch (e: any) {
        return json(e.isConfig ? 500 : 502, { error: e.message || "No se pudo generar el boletín." });
      }
      const recipients = store.subscribers.filter((s: any) => s.newsletterOptIn && s.status === "ACTIVE");
      let sent = 0;
      const failed: string[] = [];
      for (const sub of recipients) {
        try {
          await resendSend(sub.email, `Lux Astral · ${content.cardName}`, content.html);
          sent++;
        } catch (e) {
          failed.push(sub.email);
        }
      }
      store.settings.lastNewsletterSentDate = today;
      await saveStore(store);
      return json(200, { sent, failed, total: recipients.length, cardName: content.cardName, preview: content.html });
    }

    if (action === "send-announcement") {
      if (!requireAdmin(store, payload, action)) return json(401, { error: "Contraseña de administración incorrecta o faltante." });
      const { subject, html: bodyHtml } = payload;
      if (!subject || !bodyHtml) return json(400, { error: "Falta el asunto o el contenido." });
      const recipients = store.subscribers.filter((s: any) => s.newsletterOptIn && s.status === "ACTIVE");
      const html = newsletterEmailHtml(subject, bodyHtml);
      let sent = 0;
      const failed: string[] = [];
      for (const sub of recipients) {
        try {
          await resendSend(sub.email, subject, html);
          sent++;
        } catch (e) {
          failed.push(sub.email);
        }
      }
      await saveStore(store);
      return json(200, { sent, failed, total: recipients.length });
    }

    if (action === "reading-access") {
      const { email, spread, preferredResponseType } = payload;
      const result = await resolveReadingAccess(store, email, spread, preferredResponseType);
      await saveStore(store);
      return json(result.allowed ? 200 : 403, result);
    }

    // Historial de lecturas + Cofre de Respuestas -- ver local-server.js
    // para el detalle completo comentado (misma logica aca).
    if (action === "list-readings") {
      const email = (payload.email || "").trim().toLowerCase();
      if (!email || !email.includes("@")) return json(400, { error: "Falta un email válido." });
      const list = store.readingsByEmail[email] || [];
      return json(200, { readings: list, migrated: !!store.readingsMigrated[email] });
    }

    if (action === "save-reading") {
      const email = (payload.email || "").trim().toLowerCase();
      const reading = payload.reading;
      if (!email || !email.includes("@") || !reading || typeof reading !== "object") {
        return json(400, { error: "Faltan datos de la lectura." });
      }
      const isSub = await verifySubscriberByEmail(store, email);
      if (!isSub) return json(403, { error: "Guardar el historial es un beneficio de las socias con plan." });
      if (!store.readingsByEmail[email]) store.readingsByEmail[email] = [];
      const saved = { ...reading, id: reading.id || genId("r"), email };
      store.readingsByEmail[email].push(saved);
      await saveStore(store);
      return json(200, { reading: saved });
    }

    if (action === "update-reading") {
      const email = (payload.email || "").trim().toLowerCase();
      const { id, patch: readingPatch } = payload;
      if (!email || !id || !readingPatch || typeof readingPatch !== "object") {
        return json(400, { error: "Faltan datos para actualizar la lectura." });
      }
      const list = store.readingsByEmail[email] || [];
      const idx = list.findIndex((r: any) => r.id === id);
      if (idx === -1) return json(404, { error: "No encontramos esa lectura." });
      list[idx] = { ...list[idx], ...readingPatch };
      await saveStore(store);
      return json(200, { reading: list[idx] });
    }

    if (action === "delete-reading") {
      const email = (payload.email || "").trim().toLowerCase();
      const { id } = payload;
      if (!email || !id) return json(400, { error: "Faltan datos para borrar la lectura." });
      const list = store.readingsByEmail[email] || [];
      store.readingsByEmail[email] = list.filter((r: any) => r.id !== id);
      await saveStore(store);
      return json(200, { ok: true });
    }

    if (action === "import-readings") {
      const email = (payload.email || "").trim().toLowerCase();
      const incoming = Array.isArray(payload.readings) ? payload.readings : [];
      if (!email || !email.includes("@")) return json(400, { error: "Falta un email válido." });
      if (!store.readingsMigrated[email]) {
        const isSub = await verifySubscriberByEmail(store, email);
        if (isSub && incoming.length) {
          if (!store.readingsByEmail[email]) store.readingsByEmail[email] = [];
          const existingIds = new Set(store.readingsByEmail[email].map((r: any) => r.id));
          incoming.forEach((r: any) => {
            if (r && r.id && !existingIds.has(r.id)) {
              store.readingsByEmail[email].push({ ...r, email });
              existingIds.add(r.id);
            }
          });
        }
        store.readingsMigrated[email] = true;
        await saveStore(store);
      }
      return json(200, { readings: store.readingsByEmail[email] || [] });
    }

    if (action === "checkout-free") {
      const { tarotistId, slotId, customerName, customerEmail } = payload;
      const tr = store.tarotists.find((x: any) => x.id === tarotistId);
      if (!tr) return json(404, { error: "Tarotista no encontrada." });
      const slot = tr.availability.find((s: any) => s.id === slotId);
      if (!slot || !slotIsAvailable(slot)) return json(409, { error: "Ese horario ya no está disponible." });
      const email = (customerEmail || "").trim().toLowerCase();
      if (!email || !email.includes("@")) return json(400, { error: "Falta un email válido." });
      const oraculoCheck: any = await checkOraculoFreeSlot(store, email);
      if (!oraculoCheck.eligible) {
        return json(403, { error: "Esta sesión gratis ya no está disponible para tu suscripción este mes." });
      }
      const bookingId = genId("bk");
      const booking = {
        id: bookingId, tarotistId, slotId, customerName: customerName || "", customerEmail: email,
        amount: 0, currency: "usd", status: "paid", paypalOrderId: null,
        createdAt: new Date().toISOString(), confirmedAt: new Date().toISOString(),
        accessCode: genBookingAccessCode(), isSubscriber: true, freeOraculoSlot: true,
      };
      slot.booked = true;
      delete slot.reservedUntil;
      store.bookings.push(booking);
      oraculoCheck.sub.lastFreeSessionMonth = oraculoCheck.monthKey;
      await ensureVideoRoom(booking, tr, slot);
      await saveStore(store);
      return json(200, {
        status: "paid", tarotistName: tr.name, when: slot.startsAt,
        meetingLink: tr.meetingLink, accessCode: booking.accessCode, amount: 0,
        videoRoomUrl: booking.videoRoomUrl || "", videoJoinFrom: booking.videoJoinFrom || null,
      });
    }

    if (action === "checkout") {
      const { tarotistId, slotId, customerName, customerEmail, lang } = payload;
      const tr = store.tarotists.find((x: any) => x.id === tarotistId);
      if (!tr) return json(404, { error: "Tarotista no encontrada." });
      const slot = tr.availability.find((s: any) => s.id === slotId);
      if (!slot || !slotIsAvailable(slot)) return json(409, { error: "Ese horario ya no está disponible." });
      if (!customerEmail || !customerEmail.includes("@")) return json(400, { error: "Falta un email válido." });

      const isSubscriber = await verifySubscriberByEmail(store, customerEmail);
      const subEntry = isSubscriber ? store.subscribers.find((s: any) => s.email === (customerEmail || "").trim().toLowerCase()) : null;
      const discountPct = subEntry ? (store.settings.planDiscounts[subEntry.planKey] || 0) : 0;
      const base = Number(tr.rate) || store.settings.sessionBasePrice;
      const price = discountPct
        ? Math.round(base * (1 - discountPct / 100) * 100) / 100
        : base;

      const bookingId = genId("bk");
      slot.reservedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      const booking = {
        id: bookingId, tarotistId, slotId, customerName: customerName || "", customerEmail,
        amount: price, currency: "usd", status: "pending", paypalOrderId: null, createdAt: new Date().toISOString(),
        isSubscriber,
      };
      store.bookings.push(booking);
      await saveStore(store);

      const es = lang !== "en";
      const sessionLabel = es
        ? `Sesión con ${tr.name} — ${new Date(slot.startsAt).toLocaleString("es-CL")}`
        : `Session with ${tr.name} — ${new Date(slot.startsAt).toLocaleString("en-US")}`;

      let order: any;
      try {
        order = await paypalFetch("v2/checkout/orders", {
          method: "POST",
          json: {
            intent: "CAPTURE",
            purchase_units: [{
              custom_id: bookingId,
              description: sessionLabel.slice(0, 127),
              amount: { currency_code: "USD", value: price.toFixed(2) },
            }],
          },
        });
      } catch (e: any) {
        if (e.isConfig) return json(500, { error: e.message });
        return json(502, { error: "No se pudo iniciar el pago con PayPal.", detail: e.detail });
      }

      booking.paypalOrderId = order.id;
      await saveStore(store);
      return json(200, { orderId: order.id, bookingId });
    }

    if (action === "confirm") {
      const { orderId } = payload;
      const booking = store.bookings.find((b: any) => b.paypalOrderId === orderId);
      if (!booking) return json(404, { error: "Reserva no encontrada." });
      const tr = store.tarotists.find((x: any) => x.id === booking.tarotistId);
      const slot = tr && tr.availability.find((s: any) => s.id === booking.slotId);

      if (booking.status === "paid") {
        await ensureVideoRoom(booking, tr, slot);
        await saveStore(store);
        return json(200, {
          status: "paid", tarotistName: tr ? tr.name : "", when: slot ? slot.startsAt : null,
          meetingLink: tr ? tr.meetingLink : "", accessCode: booking.accessCode, amount: booking.amount,
          videoRoomUrl: booking.videoRoomUrl || "", videoJoinFrom: booking.videoJoinFrom || null,
        });
      }

      let capture: any;
      try {
        capture = await paypalFetch(`v2/checkout/orders/${orderId}/capture`, { method: "POST" });
      } catch (e: any) {
        if (e.isConfig) return json(500, { error: e.message });
        return json(502, { error: "No se pudo confirmar el pago con PayPal.", detail: e.detail });
      }

      if (capture.status !== "COMPLETED") {
        return json(200, { status: capture.status || "pending" });
      }

      booking.status = "paid";
      booking.confirmedAt = new Date().toISOString();
      booking.accessCode = genBookingAccessCode();
      if (slot) { slot.booked = true; delete slot.reservedUntil; }
      await ensureVideoRoom(booking, tr, slot);
      logEvent(store, { email: booking.customerEmail, type: "income", detail: { kind: "booking", tarotistId: booking.tarotistId, amount: booking.amount } });
      await saveStore(store);

      return json(200, {
        status: "paid", tarotistName: tr ? tr.name : "", when: slot ? slot.startsAt : null,
        meetingLink: tr ? tr.meetingLink : "", accessCode: booking.accessCode, amount: booking.amount,
        videoRoomUrl: booking.videoRoomUrl || "", videoJoinFrom: booking.videoJoinFrom || null,
      });
    }

    if (action === "setup-login") {
      const email = (payload.email || "").trim().toLowerCase();
      const pw = String(payload.password || "");
      if (!email || !email.includes("@")) return json(400, { error: "Falta un email válido." });
      if (!isPowerUser(store, email)) {
        return json(403, { error: "Ese correo no tiene acceso al panel de configuración." });
      }
      if ((await hashSetupPassword(pw)) !== store.settings.setupPasswordHash) {
        return json(401, { error: "Contraseña incorrecta." });
      }
      pruneSetupSessions(store);
      const token = crypto.randomUUID();
      store.setupSessions[token] = { email, createdAt: Date.now() };
      logEvent(store, { email, type: "setup-login", detail: {} });
      await saveStore(store);
      return json(200, { ok: true, token, email, powerUsers: store.settings.powerUsers });
    }

    if (action === "setup-whoami") {
      const adminEmail = isAdminAuthorized(store, payload);
      if (!adminEmail) return json(401, { error: "Sesión vencida — iniciá sesión de nuevo." });
      return json(200, { ok: true, email: adminEmail, powerUsers: store.settings.powerUsers });
    }

    if (action === "setup-change-password") {
      const adminEmail = requireAdmin(store, payload, action);
      if (!adminEmail) return json(401, { error: "Contraseña de administración incorrecta o faltante." });
      const newPassword = String(payload.newPassword || "");
      if (newPassword.length < 6) return json(400, { error: "La contraseña tiene que tener al menos 6 caracteres." });
      store.settings.setupPasswordHash = await hashSetupPassword(newPassword);
      await saveStore(store);
      return json(200, { ok: true });
    }

    if (action === "setup-add-power-user") {
      const adminEmail = requireAdmin(store, payload, action);
      if (!adminEmail) return json(401, { error: "Contraseña de administración incorrecta o faltante." });
      const email = (payload.email || "").trim().toLowerCase();
      if (!email || !email.includes("@")) return json(400, { error: "Falta un email válido." });
      if (!store.settings.powerUsers.includes(email)) store.settings.powerUsers.push(email);
      await saveStore(store);
      return json(200, { ok: true, powerUsers: store.settings.powerUsers });
    }

    if (action === "setup-remove-power-user") {
      const adminEmail = requireAdmin(store, payload, action);
      if (!adminEmail) return json(401, { error: "Contraseña de administración incorrecta o faltante." });
      const email = (payload.email || "").trim().toLowerCase();
      if (store.settings.powerUsers.length <= 1) {
        return json(400, { error: "Tiene que quedar al menos un correo con acceso." });
      }
      store.settings.powerUsers = store.settings.powerUsers.filter((e: string) => e !== email);
      await saveStore(store);
      return json(200, { ok: true, powerUsers: store.settings.powerUsers });
    }

    if (action === "log-event") {
      const email = (payload.email || "").trim().toLowerCase();
      const page = String(payload.page || "").slice(0, 60);
      if (page) {
        logEvent(store, { email, type: "page-visit", detail: { page } });
        await saveStore(store);
      }
      return json(200, { ok: true });
    }

    return json(404, { error: "Acción desconocida." });
  } catch (e: any) {
    console.error("[booking]", e);
    return json(500, { error: "Error interno.", detail: String((e && e.message) || e) });
  }
};
