// Reporte mensual automático (Netlify Scheduled Function) -- ver la
// acción "send-monthly-admin-report" en booking.mts para toda la lógica
// real (arma los 3 resúmenes de Inteligencia Artificial, Experiencia de
// lectura y Negocio y datos, y manda el email con Resend a las cuentas
// de store.settings.powerUsers). Este archivo solo dispara esa acción
// una vez al mes, autenticándose con CRON_SECRET en vez de un login real
// (acá no hay navegador para loguearse con usuario/contraseña).
//
// Sin CRON_SECRET configurado en las variables de entorno de Netlify,
// este disparo automático no hace nada -- el botón manual "Generar
// reporte" en Setup sigue funcionando igual, con la sesión de
// administración normal.
export default async () => {
  const cronSecret = Netlify.env.get("CRON_SECRET");
  if (!cronSecret) {
    console.log("[monthly-admin-report] CRON_SECRET no configurado -- nada que hacer.");
    return;
  }
  const base = (Netlify.env.get("URL") || Netlify.env.get("DEPLOY_PRIME_URL") || "").replace(/\/$/, "");
  if (!base) {
    console.error("[monthly-admin-report] No se pudo determinar la URL del sitio (falta URL/DEPLOY_PRIME_URL).");
    return;
  }
  try {
    const res = await fetch(`${base}/.netlify/functions/booking`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "send-monthly-admin-report", cronSecret }),
    });
    const data = await res.json().catch(() => ({}));
    console.log("[monthly-admin-report]", res.status, JSON.stringify(data));
  } catch (e: any) {
    console.error("[monthly-admin-report] fallo:", e?.message || e);
  }
};

export const config = {
  schedule: "0 13 1 * *", // el 1 de cada mes, 13:00 UTC (~9-10am hora de Chile)
};
