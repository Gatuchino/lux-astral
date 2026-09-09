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
  try { adminPassword = localStorage.getItem('arcana_setup_password') || ''; } catch {}
  try { setupToken = JSON.parse(sessionStorage.getItem('arcana_setup_session') || 'null')?.token || ''; } catch {}
  const res = await fetch('/.netlify/functions/booking', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action, adminPassword, setupToken, ...payload }),
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

window.arcanaFetchTarotistas = async function () {
  const res = await fetch('/.netlify/functions/booking?action=tarotistas');
  if (!res.ok) throw new Error('No se pudo cargar el Marketplace.');
  return res.json(); // { tarotists, settings }
};

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

// Suscripciones (Planes de Precios) — cobro recurrente real con PayPal
// Subscriptions, identificado por email (sin cuentas/login todavía).
window.arcanaSubscriptionPlans = async function () {
  const res = await fetch('/.netlify/functions/booking?action=subscription-plans');
  if (!res.ok) throw new Error('No se pudieron cargar los planes.');
  return res.json(); // { plans: {luna_month, luna_year, oraculo_month, oraculo_year} | null, paypalClientId }
};
window.arcanaConfirmSubscription = (opts) => arcanaBookingCall('confirm-subscription', opts); // { subscriptionId, customerEmail, planKey, billing } -> { status, isSubscriber }
window.arcanaSubscriberStatus = async function (email) {
  const res = await fetch('/.netlify/functions/booking?action=subscriber-status&email=' + encodeURIComponent(email));
  if (!res.ok) throw new Error('No se pudo verificar la suscripción.');
  return res.json(); // { isSubscriber, planKey, billing }
};
// Panel de Setup: crea (una sola vez) el Producto + los 4 Planes en PayPal.
window.arcanaProvisionSubscriptionPlans = () => arcanaBookingCall('provision-subscription-plans', {});

// Acceso a lecturas (Vela/Luna/Estrella/Oráculo) — antes de generar una
// interpretación con IA, se pregunta al backend si se puede (según el plan
// o el límite del plan Vela gratis) y con qué tipo de respuesta.
window.arcanaReadingAccess = (opts) => arcanaBookingCall('reading-access', opts); // { email, spread } -> { allowed, responseType, planKey } (o error con .reason)

// Historial de lecturas + Cofre de Respuestas (2026-09-08) — antes vivían
// solo en localStorage (se perdían al cambiar de dispositivo, y sin
// filtro por email se mezclaban si dos perfiles usaban el mismo
// navegador). Ahora quedan en el servidor, atadas al email de la socia.
window.arcanaListReadings = (email) => arcanaBookingCall('list-readings', { email }); // -> { readings, migrated }
window.arcanaSaveReading = (email, reading) => arcanaBookingCall('save-reading', { email, reading }); // -> { reading }
window.arcanaUpdateReading = (email, id, patch) => arcanaBookingCall('update-reading', { email, id, patch }); // -> { reading }
window.arcanaDeleteReading = (email, id) => arcanaBookingCall('delete-reading', { email, id }); // -> { ok }
// Migración de una sola vez de lo que haya en localStorage — el server
// ignora el pedido si ya migró antes a esta socia (store.readingsMigrated).
window.arcanaImportReadings = (email, readings) => arcanaBookingCall('import-readings', { email, readings }); // -> { readings }

// Sesión de video mensual gratis del plan Oráculo — sin pasar por PayPal.
window.arcanaCheckoutFree = (opts) => arcanaBookingCall('checkout-free', opts);

window.arcanaMyBookings = async function (email) {
  const res = await fetch('/.netlify/functions/booking?action=my-bookings&email=' + encodeURIComponent(email));
  if (!res.ok) throw new Error('No se pudo buscar tus reservas.');
  return res.json(); // { bookings }
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
window.arcanaCancelSubscription = (opts) => arcanaBookingCall('cancel-subscription', opts); // { email, reason, reasonDetail } -> { ok, emailSent, emailError }
// Oferta de retención (25% off por un ciclo más) que se ofrece al cancelar.
window.arcanaApplyRetentionOffer = (email) => arcanaBookingCall('apply-retention-offer', { email }); // -> { ok, needsApproval, approveUrl }
// Encuesta de calificación y buzón de sugerencias — van a comentarios@luxastral.com.
window.arcanaSubmitAppRating = (opts) => arcanaBookingCall('submit-app-rating', opts); // { rating, email?, comment? }
window.arcanaSubmitSuggestion = (opts) => arcanaBookingCall('submit-suggestion', opts); // { message, email? }
window.arcanaActivateMembership = (token) => arcanaBookingCall('activate-membership', { token }); // -> { email, planKey, source }
window.arcanaNewsletterOptIn = (email, optIn) => arcanaBookingCall('newsletter-optin', { email, optIn });
window.arcanaSendNewsletterNow = (force) => arcanaBookingCall('send-daily-newsletter', { force: !!force, origin: window.location.origin });
window.arcanaSendAnnouncement = (subject, html) => arcanaBookingCall('send-announcement', { subject, html });
window.arcanaListMemberships = async function () {
  const res = await fetch('/.netlify/functions/booking?action=list-memberships');
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
window.arcanaPowerUserStatus = async function (email) {
  if (!email) return { isPowerUser: false };
  const res = await fetch('/.netlify/functions/booking?action=power-user-status&email=' + encodeURIComponent(email));
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

// Registro liviano de accesos y secciones visitadas (nunca preguntas ni
// interpretaciones). Fire-and-forget: si falla, no interrumpe nada.
window.arcanaLogEvent = (email, page) => arcanaBookingCall('log-event', { email: email || '', page });

