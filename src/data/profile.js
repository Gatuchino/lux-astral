// Perfil de la cuenta real de la visitante (nombre, género, email, foto),
// usado para personalizar las respuestas de la IA, los saludos del sitio
// y la sección de Perfil.
//
// 2026-09-09 (a pedido de Christian): antes esto vivía 100% en
// localStorage y el "email" era un dato de texto libre sin verificar —
// cualquiera podía escribir el email de otra persona y el backend se lo
// creía. Ahora la fuente de verdad es una cuenta real (email + contraseña,
// ver netlify/functions/booking.mts) y acá solo guardamos una CACHE local
// de la sesión vigente: token + los datos públicos de la cuenta (nombre,
// género, foto). El email nunca se edita desde acá -- es la identidad de
// la cuenta, la define el signup. Clave localStorage: 'vela_session'.
//
// Quien entra sin sesión vigente ve el login/signup obligatorio (ver
// App.jsx) -- no hay más "visitante anónima" con solo nombre y género.
window.getArcanaProfile = function () {
  let session = null;
  try { session = JSON.parse(localStorage.getItem('vela_session') || 'null'); } catch (e) {}
  if (!session || !session.token || !session.email) {
    return { name: null, email: null, gender: null, photo: null, token: null, loggedIn: false };
  }
  return {
    name: session.name || null,
    email: session.email || null,
    gender: session.gender || null,
    photo: session.photo || null,
    token: session.token,
    loggedIn: true,
  };
};

// Guarda la sesión completa (token + datos de cuenta) que devuelve el
// backend al hacer signup/login/whoami -- acepta tanto la respuesta cruda
// ({ token, user: {email, name, gender, photo} }) como un objeto ya plano.
window.saveArcanaSession = function (session) {
  if (!session || !session.token) return window.getArcanaProfile();
  const u = session.user || {};
  const next = {
    token: session.token,
    email: ((session.email || u.email || '') + '').trim().toLowerCase() || null,
    name: session.name || u.name || null,
    gender: session.gender || u.gender || null,
    photo: session.photo || u.photo || null,
  };
  try { localStorage.setItem('vela_session', JSON.stringify(next)); } catch (e) {}
  return window.getArcanaProfile();
};

// Actualiza localmente nombre/género/foto (mergea con lo que ya había).
// Solo toca la caché local -- quien llama es responsable de persistirlo
// también en el servidor (ver window.arcanaUpdateAccount en booking.js,
// usado desde App.jsx). El email NO se puede cambiar desde acá.
window.saveArcanaProfile = function (patch) {
  let session = null;
  try { session = JSON.parse(localStorage.getItem('vela_session') || 'null'); } catch (e) {}
  if (!session || !session.token) return window.getArcanaProfile();
  const next = Object.assign({}, session);
  if (patch && typeof patch === 'object') {
    if ('name' in patch) next.name = (patch.name || '').trim() || null;
    if ('gender' in patch) next.gender = patch.gender || null;
    if ('photo' in patch) next.photo = patch.photo || null;
  }
  try { localStorage.setItem('vela_session', JSON.stringify(next)); } catch (e) {}
  return window.getArcanaProfile();
};

// Cierra la sesión: borra el token y los datos de cuenta guardados
// localmente (además de los resabios de versiones viejas del perfil), asi
// que la próxima vez la persona ve el login otra vez. No toca el idioma
// elegido. Las lecturas y el plan quedan guardados en el servidor atados a
// la cuenta, asi que no se pierden -- reaparecen al volver a iniciar
// sesión con el mismo email.
window.clearArcanaProfile = function () {
  try { localStorage.removeItem('vela_session'); } catch (e) {}
  try { localStorage.removeItem('vela_onboarding'); } catch (e) {}
  try { localStorage.removeItem('vela_user'); } catch (e) {}
  try { localStorage.removeItem('vela_route'); } catch (e) {}
  return window.getArcanaProfile();
};

// Línea de instrucción para prompts de IA: cómo tratar el género de quien consulta.
// gender: 'femenino' | 'masculino' | 'no-binario' | 'prefiero-no-decir' | null
window.arcanaGenderInstruction = function (gender, lang) {
  const es = lang === 'es';
  if (gender === 'femenino') {
    return es
      ? 'Quien consulta se identifica como mujer — puedes usar adjetivos y vocativos en femenino si suena natural (por ejemplo "querida" está bien aquí).'
      : 'The person consulting identifies as a woman — feminine forms of address are fine if they sound natural.';
  }
  if (gender === 'masculino') {
    return es
      ? 'Quien consulta se identifica como hombre — puedes usar adjetivos y vocativos en masculino si suena natural (por ejemplo "querido" está bien aquí).'
      : 'The person consulting identifies as a man — masculine forms of address are fine if they sound natural.';
  }
  return es
    ? 'No uses vocativos ni adjetivos marcados por género (como "querida", "querido") para dirigirte a quien consulta — mantené un lenguaje neutro en todo momento.'
    : "Don't use gendered terms of address (like \"dear\" implying a gender) — keep the language neutral at all times.";
};

// Línea de instrucción para usar el nombre de quien consulta, si lo dio.
window.arcanaNameInstruction = function (name, lang) {
  if (!name) return '';
  return lang === 'es'
    ? `Quien consulta prefiere que le llamen "${name}" — usá ese nombre de vez en cuando, sin abusar de él.`
    : `The person consulting prefers to be called "${name}" — use that name occasionally, without overusing it.`;
};
