// Perfil local del visitante (nombre, género, email, foto), usado para
// personalizar las respuestas de la IA, los saludos del sitio y la nueva
// sección de Perfil. Vive 100% en el navegador (localStorage) — no hay
// backend ni base de datos real de usuarios.
//
// Fuente única de verdad: la misma clave 'vela_onboarding' que ya se
// completaba en el Onboarding (nombre + género) — ahora también guarda
// email y foto, y se puede editar en cualquier momento desde Perfil.
//
// Migración: si existe un 'vela_user' viejo (del login falso que ya no
// se usa) y todavía no hay nombre/email en vela_onboarding, se absorben
// esos datos una sola vez para no perder lo que la persona ya había
// cargado.
window.getArcanaProfile = function () {
  let onboarding = null;
  let legacyUser = null;
  try { onboarding = JSON.parse(localStorage.getItem('vela_onboarding') || 'null'); } catch (e) {}
  try { legacyUser = JSON.parse(localStorage.getItem('vela_user') || 'null'); } catch (e) {}

  let name = (onboarding && onboarding.displayName) || null;
  let email = (onboarding && onboarding.email) || null;
  let gender = (onboarding && onboarding.gender) || null;
  const photo = (onboarding && onboarding.photo) || null;

  // Migración de una sola vez desde el viejo login falso.
  if (legacyUser && (!name || !email)) {
    const patch = {};
    if (!name && legacyUser.name) patch.displayName = legacyUser.name;
    if (!email && legacyUser.email) patch.email = legacyUser.email;
    if (!gender && legacyUser.gender) patch.gender = legacyUser.gender;
    if (Object.keys(patch).length > 0) {
      const merged = Object.assign({}, onboarding || {}, patch);
      try { localStorage.setItem('vela_onboarding', JSON.stringify(merged)); } catch (e) {}
      name = merged.displayName || name;
      email = merged.email || email;
      gender = merged.gender || gender;
    }
  }

  return { name, email, gender, photo };
};

// Actualiza el perfil local (nombre, email, género y/o foto) — mergea con
// lo que ya había, nunca lo pisa entero. Devuelve el perfil actualizado.
window.saveArcanaProfile = function (patch) {
  let onboarding = null;
  try { onboarding = JSON.parse(localStorage.getItem('vela_onboarding') || 'null'); } catch (e) {}
  const next = Object.assign({}, onboarding || { completedAt: new Date().toISOString() });
  if (patch && typeof patch === 'object') {
    if ('name' in patch) next.displayName = (patch.name || '').trim() || null;
    if ('email' in patch) next.email = (patch.email || '').trim() || null;
    if ('gender' in patch) next.gender = patch.gender || null;
    if ('photo' in patch) next.photo = patch.photo || null;
  }
  try { localStorage.setItem('vela_onboarding', JSON.stringify(next)); } catch (e) {}
  return window.getArcanaProfile();
};

// Cierra la sesión local: borra el perfil guardado (nombre, email, género,
// foto) y el resabio del login viejo, para que la próxima vez la persona
// entre como visitante nueva (vuelve a pasar por Onboarding). No toca el
// idioma elegido. Las lecturas quedan guardadas en el servidor por email,
// así que no se pierden si vuelve a cargar el mismo email más adelante.
window.clearArcanaProfile = function () {
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
      ? 'Quien consulta se identifica como mujer — podés usar adjetivos y vocativos en femenino si suena natural (por ejemplo "querida" está bien acá).'
      : 'The person consulting identifies as a woman — feminine forms of address are fine if they sound natural.';
  }
  if (gender === 'masculino') {
    return es
      ? 'Quien consulta se identifica como hombre — podés usar adjetivos y vocativos en masculino si suena natural (por ejemplo "querido" está bien acá).'
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
