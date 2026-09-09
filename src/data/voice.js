// Voz: "escuchar" (texto a voz vía ElevenLabs, a través de nuestro propio
// proxy serverless para no exponer la API key) y "dictar" (voz a texto vía
// Web Speech API del navegador — gratis, no usa ElevenLabs).
// Todo es opcional: si ELEVENLABS_API_KEY no está configurada del lado del
// servidor, arcanaFetchSpeech() falla y quien llama debe mostrar un aviso.

window.ARCANA_VOICE_DEFAULTS = {
  enabledKey: 'arcana_setup_voice_enabled',
  voiceIdKey: 'arcana_setup_voice_id',
  // Voz premade de ElevenLabs ("Rachel"), cálida y neutra — cambiable desde
  // Setup pegando cualquier Voice ID de la biblioteca de voces de Christian.
  defaultVoiceId: '21m00Tcm4TlvDq8ikWAM',
};

window.arcanaVoiceEnabled = function () {
  const v = localStorage.getItem(window.ARCANA_VOICE_DEFAULTS.enabledKey);
  return v === null ? true : v === 'true';
};

window.arcanaVoiceId = function () {
  return localStorage.getItem(window.ARCANA_VOICE_DEFAULTS.voiceIdKey) || window.ARCANA_VOICE_DEFAULTS.defaultVoiceId;
};

// Pide el audio de un texto a nuestro proxy (nunca expone la API key de
// ElevenLabs en el navegador) y devuelve un object URL listo para <audio>.
window.arcanaFetchSpeech = async function (text, voiceId) {
  const res = await fetch('/.netlify/functions/tarot-tts', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text, voiceId: voiceId || window.arcanaVoiceId() }),
  });
  if (!res.ok) {
    let detail = '';
    try { detail = (await res.json()).error || ''; } catch (e) {}
    throw new Error(detail || ('TTS error ' + res.status));
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
};

// Dictado por voz: envuelve SpeechRecognition/webkitSpeechRecognition del
// navegador. Devuelve null si el navegador no lo soporta (ej. Firefox de
// escritorio) — quien llama debe ocultar el botón de micrófono en ese caso.
window.arcanaCreateDictation = function (lang, handlers) {
  const h = handlers || {};
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  const rec = new SR();
  rec.lang = lang === 'es' ? 'es-CL' : 'en-US';
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  rec.onresult = function (e) {
    const text = Array.from(e.results).map(function (r) { return r[0].transcript; }).join(' ');
    if (h.onResult) h.onResult(text);
  };
  rec.onerror = function (e) { if (h.onError) h.onError(e); };
  rec.onend = function () { if (h.onEnd) h.onEnd(); };
  return rec;
};
