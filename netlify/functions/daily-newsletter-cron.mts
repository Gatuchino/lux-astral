// Boletín diario automático (Netlify Scheduled Function) -- 2026-09-11, a
// pedido de Christian (el boletín de las 8:30am no se mandó porque nunca
// existió un disparo automático: solo el botón manual "Enviar boletín de
// hoy" en Setup, ver la nota en booking.mts).
//
// Este archivo dispara la acción "send-daily-newsletter" de booking.mts
// cada 15 minutos. Netlify Scheduled Functions solo aceptan cron en UTC
// (no hay forma de decirle "hora de Chile" acá), así que en vez de eso
// esta función pregunta seguido y es la acción del lado de booking.mts la
// que decide si YA es la hora real configurada en Setup (usando el huso
// horario IANA America/Santiago, que ajusta el horario de verano solo,
// sin tener que tocar este cron dos veces al año). El tope de "una vez
// por día" ya existente evita que se mande de nuevo en el siguiente tick.
//
// Se autentica con CRON_SECRET en vez de un login real (no hay navegador
// acá para loguearse como administrador). Sin CRON_SECRET configurado en
// las variables de entorno de Netlify, este disparo automático no hace
// nada -- el botón manual en Setup sigue funcionando igual, con la sesión
// de administración normal.
export default async () => {
  const cronSecret = Netlify.env.get("CRON_SECRET");
  if (!cronSecret) {
    console.log("[daily-newsletter-cron] CRON_SECRET no configurado -- nada que hacer.");
    return;
  }
  const base = (Netlify.env.get("URL") || Netlify.env.get("DEPLOY_PRIME_URL") || "").replace(/\/$/, "");
  if (!base) {
    console.error("[daily-newsletter-cron] No se pudo determinar la URL del sitio (falta URL/DEPLOY_PRIME_URL).");
    return;
  }
  try {
    const res = await fetch(`${base}/.netlify/functions/booking`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "send-daily-newsletter", cronSecret }),
    });
    const data = await res.json().catch(() => ({}));
    console.log("[daily-newsletter-cron]", res.status, JSON.stringify(data));
  } catch (e: any) {
    console.error("[daily-newsletter-cron] fallo:", e?.message || e);
  }
};

export const config = {
  schedule: "*/15 * * * *",
};
