// Cliente para el Marketplace real (reservas de video con tarotistas +
// pago con PayPal). Habla con /.netlify/functions/booking (o su
// equivalente en local-server.js, misma ruta) — ver ese archivo para el
// detalle de cada acción. Sin dependencias, fetch crudo.
//
// El pago se hace con el botón de PayPal (JS SDK, inyectado dinámicamente
// por MarketplacePage una vez que sabemos el paypalClientId) — no
// navegamos a otra página, se abre un popup de PayPal. El backend crea la
// orden (con el precio ya calculado, nunca confiamos en el precio del
// navegador) y devuelve un orderId que el createOrder del botón le pasa a
// PayPal. Cuando el cliente aprueba el pago, onApprove llama a
// arcanaConfirmBooking(orderId), que captura la orden contra la API de
// PayPal (recién ahí se mueve la plata de verdad).

async function arcanaBookingCall(action, payload) {
  // 2026-09-08: el panel de Setup ahora tiene login real (correo +
  // contraseña, ver acción "setup-login"). Una vez adentro, el navegador
  // guarda un token corto en sessionStorage y lo manda en cada llamada —
  // el servidor lo exige en las acciones administrativas. adminPassword
  // se sigue mandando también, solo por compatibilidad con la variable de
  // entorno legacy ARCANA_SETUP_PASSWORD (opcional, no se usa si nadie la
  // configuró).
  let adminPassword = '';
  let setupToken = '';
  let sessionToken = '';
  try { adminPassword = localStorage.getItem('arcana_setup_password') || ''; } catch {}
  try { setupToken = JSON.parse(sessionStorage.getItem('arcana_setup_session') || 'null')?.token || ''; } catch {}
  try { sessionToken = JSON.parse(localStorage.getItem('vela_session') || 'null')?.token || ''; } catch {}
  const res = await fetch('/.netlify/functions/booking', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action, adminPassword, setupToken, sessionToken, ...payload }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json.error || 'Error de red.');
    err.detail = json.detail;
    err.reason = json.reason;
    throw err;
  }
  return json;
}

// 2026-09-09: token de la cuenta real de la usuaria (ver src/data/profile.js
// -- window.saveArcanaSession). Las acciones GET (que no tienen body JSON)
// lo mandan como query param; las POST lo mandan solas via arcanaBookingCall.
function arcanaSessionToken() {
  try { return JSON.parse(localStorage.getItem('vela_session') || 'null')?.token || ''; } catch { return ''; }
}

window.arcanaFetchTarotistas = async function () {
  const res = await fetch('/.netlify/functions/booking?action=tarotistas');
  if (!res.ok) throw new Error('No se pudo cargar el Marketplace.');
  return res.json(); // { tarotists, settings }
};

// Cuentas reales (email + contraseña), obligatorias desde el primer
// ingreso -- ver App.jsx (gate de autenticación) y AuthModal.jsx.
// 2026-09-10: el signup ya no crea sesión al toque -- manda un email de
// verificación y devuelve { ok, pendingVerification: true }; la cuenta
// (y la sesión) recién se crea cuando se confirma el link con
// arcanaVerifyEmail. `origin` (window.location.origin) es necesario para
// armar ese link -- el backend no tiene forma de saber solo el dominio
// donde vive el sitio publicado.
// Programa de referidos (idea #8 de la auditoria de marketing): si esta
// visitante llego por un link ?ref=CODIGO, App.jsx guarda ese codigo en
// localStorage -- lo mandamos solo si el signup no trae uno explicito.
window.arcanaSignup = (opts) => {
  let storedRef = '';
  try { storedRef = localStorage.getItem('vela_ref_code') || ''; } catch (e) {}
  return arcanaBookingCall('signup', { origin: window.location.origin, refCode: storedRef, ...opts });
}; // { email, password, name, gender, lang, refCode? } -> { ok, pendingVerification, emailSent }
window.arcanaReferralInfo = async function () {
  const res = await fetch('/.netlify/functions/booking?action=referral-info&sessionToken=' + encodeURIComponent(arcanaSessionToken()));
  if (!res.ok) throw new Error('No se pudo cargar tu link de referidos.');
  return res.json(); // { code, link, referredCount, rewardedCount, bonusAvailable }
};
window.arcanaLogin = (opts) => arcanaBookingCall('login', opts); // { email, password } -> { ok, token, user }
window.arcanaVerifyEmail = (token) => arcanaBookingCall('verify-email', { token }); // -> { ok, token, user }
window.arcanaLogout = () => arcanaBookingCall('logout', {});
window.arcanaWhoAmI = async function () {
  const token = arcanaSessionToken();
  if (!token) return null;
  const res = await fetch('/.netlify/functions/booking?action=whoami&sessionToken=' + encodeURIComponent(token));
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return null;
  return json; // { ok, email, user }
};
window.arcanaUpdateAccount = (patch) => arcanaBookingCall('update-account', { patch }); // -> { ok, user }
window.arcanaChangeAccountPassword = (currentPassword, newPassword) =>
  arcanaBookingCall('change-account-password', { currentPassword, newPassword });

window.arcanaSaveTarotist = (tarotist) => arcanaBookingCall('save-tarotist', { tarotist });
window.arcanaDeleteTarotist = (id) => arcanaBookingCall('delete-tarotist', { id });
window.arcanaAddSlot = (tarotistId, startsAt, durationMin) =>
  arcanaBookingCall('add-slot', { tarotistId, startsAt, durationMin });
window.arcanaRemoveSlot = (tarotistId, slotId) => arcanaBookingCall('remove-slot', { tarotistId, slotId });
window.arcanaSaveBookingSettings = (settings) => arcanaBookingCall('save-settings', { settings });

// isSubscriber ya no se manda desde el navegador: el backend verifica en
// vivo contra PayPal si el email de la clienta tiene una suscripción
// activa (ver acción "checkout" en local-server.js / booking.mts).
window.arcanaCreateCheckout = (opts) => arcanaBookingCall('checkout', opts); // -> { orderId, bookingId }
window.arcanaConfirmBooking = (orderId) => arcanaBookingCall('confirm', { orderId }); // captura la orden en PayPal

// Regalos canjeables (idea #9 de la auditoria de producto): el comprador
// paga un plan por PayPal como cualquier checkout de una sola vez y
// recibe un codigo que otra persona canjea con arcanaRedeemGift.
window.arcanaGiftCheckout = (opts) => arcanaBookingCall('gift-checkout', opts); // { planKey, billing, recipientEmail?, recipientName?, message? } -> { orderId, giftId }
window.arcanaGiftConfirm = (orderId, lang) => arcanaBookingCall('gift-confirm', { orderId, lang }); // captura la orden en PayPal -> { status, code, planKey, billing, emailSent }
window.arcanaRedeemGift = (code) => arcanaBookingCall('redeem-gift', { code }); // -> { ok, planKey, expiresAt }

// Notificaciones push (idea #10 de la auditoria de producto): recordatorio
// de sesion reservada. arcanaPushSubscribe hace todo el flujo de punta a
// punta (Service Worker + permiso del navegador + suscripcion en el
// backend) -- ver push-sw.js para lo que se muestra cuando llega.
window.arcanaPushVapidKey = async function () {
  const res = await fetch('/.netlify/functions/booking?action=push-vapid-key');
  if (!res.ok) throw new Error('No se pudo obtener la clave VAPID.');
  return res.json(); // { publicKey }
};
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}
window.arcanaPushSubscribe = async function () {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Este navegador no soporta notificaciones push.');
  }
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Permiso de notificaciones denegado.');
  const { publicKey } = await window.arcanaPushVapidKey();
  if (!publicKey) throw new Error('Las notificaciones push todavía no están configuradas.');
  const reg = await navigator.serviceWorker.register('/push-sw.js');
  const existing = await reg.pushManager.getSubscription();
  const sub = existing || (await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  }));
  const json = sub.toJSON();
  await arcanaBookingCall('push-subscribe', { subscription: { endpoint: json.endpoint, keys: json.keys } });
  return true;
};
window.arcanaPushUnsubscribe = async function () {
  if (!('serviceWorker' in navigator)) return true;
  const reg = await navigator.serviceWorker.getRegistration('/push-sw.js');
  const sub = reg && (await reg.pushManager.getSubscription());
  if (sub) {
    await arcanaBookingCall('push-unsubscribe', { endpoint: sub.endpoint });
    await sub.unsubscribe();
  }
  return true;
};
window.arcanaPushIsSubscribed = async function () {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  const reg = await navigator.serviceWorker.getRegistration('/push-sw.js');
  if (!reg) return false;
  const sub = await reg.pushManager.getSubscription();
  return !!sub;
};

// Suscripciones (Planes de Precios) — cobro recurrente real con PayPal
// Subscriptions, identificado por email (sin cuentas/login todavía).
window.arcanaSubscriptionPlans = async function () {
  const res = await fetch('/.netlify/functions/booking?action=subscription-plans');
  if (!res.ok) throw new Error('No se pudieron cargar los planes.');
  return res.json(); // { plans: {luna_month, luna_year, oraculo_month, oraculo_year} | null, paypalClientId, planPrices }
};
// Panel de Setup: cambia el precio de un plan (ej. planKey='luna', billing='month').
// Si el plan ya estaba provisionado en PayPal, el backend desactiva el plan
// viejo (no toca a quien ya esta suscripta) y crea uno nuevo con el precio
// nuevo para las altas de aca en adelante.
window.arcanaUpdatePlanPrice = (planKey, billing, value) => arcanaBookingCall('update-plan-price', { planKey, billing, value });
window.arcanaConfirmSubscription = (opts) => arcanaBookingCall('confirm-subscription', opts); // { subscriptionId } -> { status, isSubscriber } (el email se deriva de la sesión)
window.arcanaSubscriberStatus = async function () {
  const res = await fetch('/.netlify/functions/booking?action=subscriber-status&sessionToken=' + encodeURIComponent(arcanaSessionToken()));
  if (!res.ok) throw new Error('No se pudo verificar la suscripción.');
  return res.json(); // { isSubscriber, planKey, billing }
};
// Panel de Setup: crea (una sola vez) el Producto + los 4 Planes en PayPal.
window.arcanaProvisionSubscriptionPlans = () => arcanaBookingCall('provision-subscription-plans', {});

// Acceso a lecturas (Vela/Luna/Estrella/Oráculo) — antes de generar una
// interpretación con IA, se pregunta al backend si se puede (según el plan
// o el límite del plan Vela gratis) y con qué tipo de respuesta.
window.arcanaReadingAccess = (opts) => arcanaBookingCall('reading-access', opts); // { spread, preferredResponseType } -> { allowed, responseType, planKey } (o error con .reason; el email se deriva de la sesión)

// Historial de lecturas + Cofre de Respuestas (2026-09-08) — antes vivían
// solo en localStorage (se perdían al cambiar de dispositivo, y sin
// filtro por email se mezclaban si dos perfiles usaban el mismo
// navegador). Ahora quedan en el servidor, atadas al email de la socia.
window.arcanaListReadings = () => arcanaBookingCall('list-readings', {}); // -> { readings, migrated }
window.arcanaSaveReading = (reading) => arcanaBookingCall('save-reading', { reading }); // -> { reading }
window.arcanaUpdateReading = (id, patch) => arcanaBookingCall('update-reading', { id, patch }); // -> { reading }
window.arcanaDeleteReading = (id) => arcanaBookingCall('delete-reading', { id }); // -> { ok }
// Migración de una sola vez de lo que haya en localStorage — el server
// ignora el pedido si ya migró antes a esta socia (store.readingsMigrated).
window.arcanaImportReadings = (readings) => arcanaBookingCall('import-readings', { readings }); // -> { readings }

// Carta Astral real (2026-09-11) — geocodifica el lugar de nacimiento,
// decide el acceso a la interpretación de IA según el plan (mismo
// sistema de tickets que arcanaReadingAccess) y guarda/lista/actualiza/
// borra la carta como un registro más en el perfil de la socia — ver
// local-server.js / booking.mts (acciones geo-lookup, chart-access,
// list-charts, save-chart, update-chart, delete-chart) y
// src/data/astro-calc.js (el cálculo real en sí, corre en el navegador).
window.arcanaGeoLookup = (place) => arcanaBookingCall('geo-lookup', { place }); // -> { lat, lon, timezone, displayName } (o { error })
window.arcanaChartAccess = () => arcanaBookingCall('chart-access', {}); // -> { allowed, responseType, planKey, ticketId } (o error con .reason; el email se deriva de la sesión)
window.arcanaListCharts = () => arcanaBookingCall('list-charts', {}); // -> { charts }
window.arcanaSaveChart = (chart) => arcanaBookingCall('save-chart', { chart }); // -> { chart }
window.arcanaUpdateChart = (id, patch) => arcanaBookingCall('update-chart', { id, patch }); // -> { chart }
window.arcanaDeleteChart = (id) => arcanaBookingCall('delete-chart', { id }); // -> { ok }

// Sesión de video mensual gratis del plan Oráculo — sin pasar por PayPal.
window.arcanaCheckoutFree = (opts) => arcanaBookingCall('checkout-free', opts);

window.arcanaMyBookings = async function (email) {
  const res = await fetch('/.netlify/functions/booking?action=my-bookings&email=' + encodeURIComponent(email));
  if (!res.ok) throw new Error('No se pudo buscar tus reservas.');
  return res.json(); // { bookings }
};

// Reseña pública de una sesión en vivo ya tomada (idea #7 de la
// auditoría de producto) -- ver acciones "submit-review" y
// "tarotist-reviews" en booking.mts/local-server.js.
window.arcanaSubmitReview = (opts) => arcanaBookingCall('submit-review', opts); // { bookingId, rating, comment } -> { review }
window.arcanaTarotistReviews = async function (tarotistId) {
  const res = await fetch('/.netlify/functions/booking?action=tarotist-reviews&tarotistId=' + encodeURIComponent(tarotistId));
  if (!res.ok) throw new Error('No se pudieron cargar las reseñas.');
  return res.json(); // { count, avg, reviews: [{ rating, comment, date, customerFirstName }] }
};

// Videollamada (Daily.co embebido): dado el código de acceso, el backend
// dice si la sesión ya se puede abrir. Ver ensureVideoRoom/acción "join"
// en local-server.js / booking.mts para el detalle de la ventana horaria.
window.arcanaJoinSession = async function (accessCode) {
  const res = await fetch('/.netlify/functions/booking?action=join&code=' + encodeURIComponent(accessCode));
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Código no válido.');
  return json; // { status: 'ready'|'too-early'|'expired', videoRoomUrl?, meetingLink?, tarotistName, when, joinFrom? }
};

// Horarios recurrentes: Setup arma la lista de fechas (en el huso horario
// de quien administra) y la manda de una — evita cargar horario por
// horario a mano.
window.arcanaAddSlotsBulk = (tarotistId, slots) => arcanaBookingCall('add-slots-bulk', { tarotistId, slots });

// Panel interno de Setup: lista de sesiones pagadas próximas con link
// directo a la sala (sin pasar por el código de acceso del cliente).
// SOLO para pruebas locales (ver acción "test-book-free" en local-server.js):
// crea una reserva ya pagada (monto 0, sin PayPal) para poder ver la
// pantalla de la videollamada de punta a punta. No existe en producción.
window.arcanaTestBookFree = (tarotistId, slotId) => arcanaBookingCall('test-book-free', { tarotistId, slotId });

// Membresías ad-honores + newsletter (Resend) — ver local-server.js /
// booking.mts para el detalle de cada acción.
window.arcanaGrantMembership = (opts) => arcanaBookingCall('grant-honorary-membership', opts); // { email, planKey, origin, sendEmail, lang } -> { activationUrl, emailSent, emailError }
window.arcanaRevokeMembership = (email) => arcanaBookingCall('revoke-membership', { email });

// Cancelar membresía real desde Perfil — cancela de verdad contra PayPal
// (o desactiva local si es ad-honores) y guarda el motivo.
window.arcanaCancelSubscription = (opts) => arcanaBookingCall('cancel-subscription', opts); // { reason, reasonDetail } -> { ok, emailSent, emailError } (el email se deriva de la sesión)
// Oferta de retención (25% off por un ciclo más) que se ofrece al cancelar.
window.arcanaApplyRetentionOffer = () => arcanaBookingCall('apply-retention-offer', {}); // -> { ok, needsApproval, approveUrl }
// Encuesta de calificación y buzón de sugerencias — van a comentarios@luxastral.com.
window.arcanaSubmitAppRating = (opts) => arcanaBookingCall('submit-app-rating', opts); // { rating, email?, comment? }
window.arcanaSubmitSuggestion = (opts) => arcanaBookingCall('submit-suggestion', opts); // { message, email? }
window.arcanaSendContactMessage = (opts) => arcanaBookingCall('send-contact-message', opts); // { name?, email, message } -> { ok } ; va a contacto@luxastral.com
window.arcanaActivateMembership = (token) => arcanaBookingCall('activate-membership', { token }); // -> { email, planKey, source }
window.arcanaNewsletterOptIn = (email, optIn) => arcanaBookingCall('newsletter-optin', { email, optIn });
window.arcanaSendNewsletterNow = (force) => arcanaBookingCall('send-daily-newsletter', { force: !!force, origin: window.location.origin });
window.arcanaSendAnnouncement = ({ subject, html, images, raw }) => arcanaBookingCall('send-announcement', { subject, html, images, raw }); // images: [{cid, filename, contentType, base64}] -- ver zip de HTML en Setup
window.arcanaListMemberships = async function () {
  const setupToken = (() => { try { return JSON.parse(sessionStorage.getItem('arcana_setup_session') || 'null')?.token || ''; } catch { return ''; } })();
  const res = await fetch('/.netlify/functions/booking?action=list-memberships&setupToken=' + encodeURIComponent(setupToken));
  if (!res.ok) throw new Error('No se pudo cargar la lista de membresías.');
  return res.json(); // { subscribers }
};

window.arcanaAdminSessions = async function () {
  const setupToken = (() => { try { return JSON.parse(sessionStorage.getItem('arcana_setup_session') || 'null')?.token || ''; } catch { return ''; } })();
  const res = await fetch('/.netlify/functions/booking?action=admin-sessions&setupToken=' + encodeURIComponent(setupToken));
  if (!res.ok) throw new Error('No se pudo cargar las sesiones.');
  return res.json(); // { sessions }
};

// ---------------------------------------------------------------------
// Panel de Setup — acceso real (correo + contraseña) y el panel de
// Informes (2026-09-08, a pedido de Christian).
// ---------------------------------------------------------------------

// Visibilidad del ícono ⚙: solo dice si ESE correo puntual está en la
// lista de power users, sin exponer la lista ni la contraseña.
window.arcanaPowerUserStatus = async function () {
  const token = arcanaSessionToken();
  if (!token) return { isPowerUser: false };
  const res = await fetch('/.netlify/functions/booking?action=power-user-status&sessionToken=' + encodeURIComponent(token));
  if (!res.ok) return { isPowerUser: false };
  return res.json(); // { isPowerUser }
};

window.arcanaSetupLogin = (email, password) => arcanaBookingCall('setup-login', { email, password }); // -> { ok, token, email, powerUsers }
window.arcanaSetupWhoAmI = () => arcanaBookingCall('setup-whoami', {}); // -> { ok, email, powerUsers } (401 si el token vencio)
window.arcanaSetupChangePassword = (newPassword) => arcanaBookingCall('setup-change-password', { newPassword });
window.arcanaSetupAddPowerUser = (email) => arcanaBookingCall('setup-add-power-user', { email }); // -> { ok, powerUsers }
window.arcanaSetupRemovePowerUser = (email) => arcanaBookingCall('setup-remove-power-user', { email }); // -> { ok, powerUsers }

// Reportes de acceso: por usuaria (última visita, sesiones, minutos
// aproximados en la plataforma, secciones visitadas) y movimientos de
// negocio (ingresos, altas/bajas de membresía). Nunca incluye contenido
// de lecturas ni preguntas — eso sigue siendo confidencial.
window.arcanaGetReports = async function () {
  const setupToken = (() => { try { return JSON.parse(sessionStorage.getItem('arcana_setup_session') || 'null')?.token || ''; } catch { return ''; } })();
  const res = await fetch('/.netlify/functions/booking?action=get-reports&setupToken=' + encodeURIComponent(setupToken));
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'No se pudieron cargar los informes.');
  return json; // { users, movements, adminActions, totalEvents }
};

// Uso de IA y costos (a pedido de Christian, 2026-09-10): consultas por
// tipo (lecturas por Tipo 1-5, seguimientos, boletín, voz ElevenLabs),
// tokens/caracteres por consulta, modelos usados, y costo USD estimado
// por día/mes según la tarifa vigente de cada proveedor.
window.arcanaGetAiUsageSummary = async function () {
  const setupToken = (() => { try { return JSON.parse(sessionStorage.getItem('arcana_setup_session') || 'null')?.token || ''; } catch { return ''; } })();
  const res = await fetch('/.netlify/functions/booking?action=get-ai-usage-summary&setupToken=' + encodeURIComponent(setupToken));
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'No se pudo cargar el uso de IA.');
  return json; // { totals, todayCostUsd, monthCostUsd, byDay, byMonth, byKind, byModel, recent, pricing, defaultPricing }
};
window.arcanaSaveAiPricing = (pricing) => arcanaBookingCall('save-ai-pricing', { pricing }); // -> { ok, pricing }

// Reporte de "Experiencia de lectura" (a pedido de Christian, 2026-09-10):
// que tiradas se piden mas, que tipos de respuesta (1 a 5) se piden mas,
// y cuantas preguntas de seguimiento hace la gente en promedio.
window.arcanaGetExperienciaSummary = async function () {
  const setupToken = (() => { try { return JSON.parse(sessionStorage.getItem('arcana_setup_session') || 'null')?.token || ''; } catch { return ''; } })();
  const res = await fetch('/.netlify/functions/booking?action=get-experiencia-summary&setupToken=' + encodeURIComponent(setupToken));
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'No se pudo cargar el resumen de experiencia de lectura.');
  return json; // { initialReadings, followUps, avgFollowUpsPerReading, bySpread, byResponseType }
};
// Boton "Enviar prueba ahora" en Setup -- el envio automatico mensual real
// lo dispara netlify/functions/monthly-admin-report.mts (Netlify Scheduled
// Function), esto es solo para probarlo sin esperar al dia 1.
window.arcanaSendMonthlyReportNow = (force) => arcanaBookingCall('send-monthly-admin-report', { force: !!force }); // -> { sent, failed, total, month } | { skipped, reason }

// Registro liviano de accesos y secciones visitadas (nunca preguntas ni
// interpretaciones). Fire-and-forget: si falla, no interrumpe nada.
window.arcanaLogEvent = (page) => arcanaBookingCall('log-event', { page }); // el email se deriva de la sesión si hay una activa

