// Nota semanal del blog, automatica (Netlify Scheduled Function) -- idea
// #9 de la auditoria de marketing, a pedido de Christian: "que se
// prepare con Groq y se publique automatico en la pagina todos los
// viernes a las 10:00 am (hora Chile)".
//
// Mismo patron que daily-newsletter-cron.mts / session-reminder-cron.mts:
// este archivo solo dispara la accion "generate-weekly-blog-post" de
// booking.mts, autenticandose con CRON_SECRET. Corre cada 15 minutos
// (no una sola vez a las 10:00 en punto) porque Netlify programa en UTC
// y Chile cambia de huso horario en el año (DST) -- en vez de calcular
// ese offset a mano, dejamos que booking.mts chequee la hora real de
// Santiago en cada tick y solo actue si es viernes 10:00-10:59 y todavia
// no se publico nada esta semana (store.blogAutomation.lastPostedWeekKey).
// Asi nunca se desfasa ni duplica, pase lo que pase con el cambio de hora.
export default async () => {
  const cronSecret = Netlify.env.get("CRON_SECRET");
  if (!cronSecret) {
    console.log("[weekly-blog-cron] CRON_SECRET no configurado -- nada que hacer.");
    return;
  }
  const base = (Netlify.env.get("URL") || Netlify.env.get("DEPLOY_PRIME_URL") || "").replace(/\/$/, "");
  if (!base) {
    console.error("[weekly-blog-cron] No se pudo determinar la URL del sitio (falta URL/DEPLOY_PRIME_URL).");
    return;
  }
  try {
    const res = await fetch(`${base}/.netlify/functions/booking`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "generate-weekly-blog-post", cronSecret }),
    });
    const data = await res.json().catch(() => ({}));
    console.log("[weekly-blog-cron]", res.status, JSON.stringify(data));
  } catch (e: any) {
    console.error("[weekly-blog-cron] fallo:", e?.message || e);
  }
};

export const config = {
  schedule: "*/15 * * * *",
};
