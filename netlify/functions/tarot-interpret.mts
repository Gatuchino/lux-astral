// Function clasica de Netlify -- ahora funciona como "iniciador + sondeo"
// (start/poll) en vez de hacer la llamada a la IA directamente:
//
//   1) El cliente hace POST con { prompt, ticketId, ... } (sin jobId) ->
//      esta funcion valida el ticket, crea un jobId, dispara (sin esperar
//      el resultado) la Background Function tarot-generate-background.mts,
//      y responde RAPIDO con { jobId }.
//   2) El cliente hace POST con { jobId } cada ~2s -> esta funcion lee el
//      estado del trabajo desde el store de Blobs "tarot-jobs" y lo
//      devuelve tal cual ({status: "pending"|"done"|"error", ...}).
//
// Esto evita por completo los limites de duracion de una respuesta HTTP
// normal (10s clasica / 40s header edge), porque la llamada a la IA real
// corre en la Background Function, que tiene hasta 15 minutos.
//
// Ver netlify/functions/tarot-generate-background.mts para el lado que
// efectivamente llama a la IA, y src/pages/Reading.jsx (funcion pollJob)
// para el lado cliente.
import { getStore } from "@netlify/blobs";

const READING_TICKET_TTL_MS = 2 * 60 * 60 * 1000;

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

function jobsStore() {
  return getStore({ name: "tarot-jobs", consistency: "strong" });
}

async function handler(req: Request, context: any) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }
  let payload: any;
  try {
    payload = await req.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: "JSON invalido en el body." }), { status: 400 });
  }

  // ---- Modo "poll" ----
  if (payload && payload.jobId) {
    const job = await jobsStore().get(payload.jobId, { type: "json" });
    if (!job) {
      return new Response(JSON.stringify({ status: "error", error: "El trabajo no existe o expiro." }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response(JSON.stringify(job), { status: 200, headers: { "content-type": "application/json" } });
  }

  // ---- Modo "start" ----
  const { prompts, maxTokensList, model, provider, ticketId, isFollowUp } = payload || {};
  if (!Array.isArray(prompts) || prompts.length === 0 || !prompts.every((p: any) => typeof p === "string" && p)) {
    return new Response(JSON.stringify({ error: 'Falta "prompts" (array) en el body.' }), { status: 400 });
  }
  const ticketCheck = await consumeReadingTicket(ticketId, !!isFollowUp);
  if (!ticketCheck.ok) {
    return new Response(JSON.stringify({ error: ticketCheck.error }), { status: 403 });
  }

  const jobId = crypto.randomUUID();
  await jobsStore().setJSON(jobId, { status: "pending", createdAt: Date.now() });

  try {
    // Las N partes (1 si no hay division en grupos) se generan en paralelo
    // dentro de la Background Function -- ver tarot-generate-background.mts.
    const bgUrl = new URL("/.netlify/functions/tarot-generate-background", req.url).toString();
    await fetch(bgUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jobId, prompts, maxTokensList, model, provider }),
    });
  } catch (e: any) {
    await jobsStore().setJSON(jobId, {
      status: "error",
      error: "No se pudo iniciar la generacion: " + String((e && e.message) || e),
      createdAt: Date.now(),
    });
  }

  return new Response(JSON.stringify({ jobId }), { status: 200, headers: { "content-type": "application/json" } });
}

export default async (req: Request, context: any) => {
  try {
    return await handler(req, context);
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: "Error interno en tarot-interpret.", detail: String((e && e.stack) || (e && e.message) || e) }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
};
