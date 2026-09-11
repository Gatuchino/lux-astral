// Recordatorio de sesion reservada (Netlify Scheduled Function) -- idea
// #10 de la auditoria de producto, a pedido de Christian: notificacion
// push (no email) antes de que empiece una sesion en vivo ya reservada.
//
// Mismo patron que daily-newsletter-cron.mts: este archivo solo dispara
// la accion "send-session-reminders" de booking.mts cada 15 minutos,
// autenticandose con CRON_SECRET (no hay navegador aca para loguearse
// como administrador). Es la accion del lado de booking.mts la que
// decide, para cada reserva pagada, si la sesion empieza dentro de la
// proxima hora y si todavia no se le mando el recordatorio (booking.
// reminderSentAt evita reenvios en el siguiente tick).
//
// Sin CRON_SECRET Y sin las claves VAPID (VAPID_PUBLIC_KEY/
// VAPID_PRIVATE_KEY) configuradas en las variables de entorno de
// Netlify, este disparo no manda nada -- ni error, simplemente no hace
// nada (ver vapidReady() en booking.mts).
export default async () => {
  const cronSecret = Netlify.env.get("CRON_SECRET");
  if (!cronSecret) {
    console.log("[session-reminder-cron] CRON_SECRET no configurado -- nada que hacer.");
    return;
  }
  const base = (Netlify.env.get("URL") || Netlify.env.get("DEPLOY_PRIME_URL") || "").replace(/\/$/, "");
  if (!base) {
    console.error("[session-reminder-cron] No se pudo determinar la URL del sitio (falta URL/DEPLOY_PRIME_URL).");
    return;
  }
  try {
    const res = await fetch(`${base}/.netlify/functions/booking`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "send-session-reminders", cronSecret }),
    });
    const data = await res.json().catch(() => ({}));
    console.log("[session-reminder-cron]", res.status, JSON.stringify(data));
  } catch (e: any) {
    console.error("[session-reminder-cron] fallo:", e?.message || e);
  }
};

export const config = {
  schedule: "*/15 * * * *",
};
