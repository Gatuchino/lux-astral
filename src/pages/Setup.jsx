// Setup — panel interno de configuración de Arcana.
//
// 2026-09-08 (a pedido de Christian): panel con acceso real. El ícono ⚙
// del menú solo aparece si el email del perfil actual está en la lista de
// power users (ver Nav.jsx / App.jsx) — nadie más lo ve. Y aunque alguien
// llegue directo a esta ruta, esta pantalla pide correo + contraseña de
// verdad contra el servidor (acción "setup-login"); ver también las
// acciones setup-change-password / setup-add-power-user /
// setup-remove-power-user, que solo funcionan ya logueado.
// Etiquetas del panel de Informes para cada tipo de movimiento registrado.
const MOVEMENT_TYPE_LABELS = {
  income: { es: 'Ingreso', en: 'Income' },
  'membership-granted': { es: 'Membresía otorgada', en: 'Membership granted' },
  'membership-revoked': { es: 'Membresía revocada', en: 'Membership revoked' },
  'subscription-cancelled': { es: 'Suscripción cancelada', en: 'Subscription cancelled' },
};
// Etiquetas legibles para el "tipo" de cada consulta de IA registrada
// (ver logAiUsage en booking.mts / local-server.js). reading-tipo-N son
// los 5 tipos de respuesta de una lectura (ver RESPONSE_TYPES en
// Reading.jsx); el resto son los otros puntos donde se llama a una IA.
const AI_USAGE_KIND_LABELS = {
  'reading-tipo-1': { es: 'Lectura · Tipo 1', en: 'Reading · Type 1' },
  'reading-tipo-2': { es: 'Lectura · Tipo 2', en: 'Reading · Type 2' },
  'reading-tipo-3': { es: 'Lectura · Tipo 3', en: 'Reading · Type 3' },
  'reading-tipo-4': { es: 'Lectura · Tipo 4', en: 'Reading · Type 4' },
  'reading-tipo-5': { es: 'Lectura · Tipo 5', en: 'Reading · Type 5' },
  'reading-followup': { es: 'Pregunta de seguimiento', en: 'Follow-up question' },
  newsletter: { es: 'Boletín diario', en: 'Daily newsletter' },
  tts: { es: 'Voz (ElevenLabs)', en: 'Voice (ElevenLabs)' },
};
const AI_USAGE_PROVIDER_LABELS = { anthropic: 'Anthropic', openai: 'OpenAI', glm: 'GLM (Z.ai)', gemini: 'Google Gemini', groq: 'Groq', elevenlabs: 'ElevenLabs' };

function SetupPage({ lang, setRoute, variants, setVariant, profile, isPowerUser }) {
  const t = window.I18N[lang];
  const es = lang === 'es';

  const readJSON = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  };
  const writeJSON = (key, val) => {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  };

  // ---------- Sesión del panel (login real: correo + contraseña) ----------
  const [session, setSession] = React.useState(() => {
    try { return JSON.parse(sessionStorage.getItem('arcana_setup_session') || 'null'); } catch { return null; }
  });
  const [loginEmail, setLoginEmail] = React.useState(() => (profile && profile.email) || '');
  const [loginPassword, setLoginPassword] = React.useState('');
  const [loginError, setLoginError] = React.useState('');
  const [loginLoading, setLoginLoading] = React.useState(false);
  const doLogin = () => {
    setLoginError('');
    setLoginLoading(true);
    window.arcanaSetupLogin(loginEmail, loginPassword)
      .then((res) => {
        const next = { email: res.email, token: res.token };
        try { sessionStorage.setItem('arcana_setup_session', JSON.stringify(next)); } catch {}
        setSession(next);
        setPowerUsers(res.powerUsers || []);
        setLoginPassword('');
      })
      .catch((e) => setLoginError((e && e.message) || (es ? 'No se pudo entrar.' : "Couldn't log in.")))
      .finally(() => setLoginLoading(false));
  };
  const doLogout = () => {
    try { sessionStorage.removeItem('arcana_setup_session'); } catch {}
    setSession(null);
  };

  // ---------- Cambiar contraseña del panel (ya logueada/o) ----------
  const [newPassword, setNewPassword] = React.useState('');
  const [pwSaved, setPwSaved] = React.useState(false);
  const [pwError, setPwError] = React.useState('');
  const savePassword = () => {
    setPwError('');
    window.arcanaSetupChangePassword(newPassword)
      .then(() => { setPwSaved(true); setNewPassword(''); setTimeout(() => setPwSaved(false), 1800); })
      .catch((e) => setPwError((e && e.message) || (es ? 'No se pudo guardar.' : "Couldn't save.")));
  };

  // ---------- Cuentas con acceso (power users reales, server-side) ----------
  const [powerUsers, setPowerUsers] = React.useState([]);
  const [adminInput, setAdminInput] = React.useState('');
  const [adminError, setAdminError] = React.useState('');
  const addAdmin = () => {
    const email = adminInput.trim();
    if (!email) return;
    setAdminError('');
    window.arcanaSetupAddPowerUser(email)
      .then((res) => { setPowerUsers(res.powerUsers || []); setAdminInput(''); })
      .catch((e) => setAdminError((e && e.message) || (es ? 'No se pudo agregar.' : "Couldn't add.")));
  };
  const removeAdmin = (email) => {
    setAdminError('');
    window.arcanaSetupRemovePowerUser(email)
      .then((res) => setPowerUsers(res.powerUsers || []))
      .catch((e) => setAdminError((e && e.message) || (es ? 'No se pudo quitar.' : "Couldn't remove.")));
  };
  React.useEffect(() => {
    if (!session) return;
    let cancelled = false;
    window.arcanaSetupWhoAmI()
      .then((res) => { if (!cancelled) setPowerUsers(res.powerUsers || []); })
      .catch(() => { if (!cancelled) doLogout(); }); // token vencido u otra sesión cambió la lista: pide login de nuevo
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // ---------- Informes: accesos, tiempo en plataforma, movimientos ----------
  const [reports, setReports] = React.useState(null);
  const [reportsLoading, setReportsLoading] = React.useState(false);
  const [reportsError, setReportsError] = React.useState('');
  const loadReports = () => {
    if (!session) return;
    setReportsLoading(true);
    setReportsError('');
    window.arcanaGetReports()
      .then((res) => setReports(res))
      .catch((e) => setReportsError((e && e.message) || (es ? 'No se pudieron cargar los informes.' : "Couldn't load reports.")))
      .finally(() => setReportsLoading(false));
  };
  React.useEffect(() => { if (session) loadReports(); }, [session]);

  // ---------- Uso de IA y costos ----------
  const [aiUsage, setAiUsage] = React.useState(null);
  const [aiUsageLoading, setAiUsageLoading] = React.useState(false);
  const [aiUsageError, setAiUsageError] = React.useState('');
  const [aiPricingDraft, setAiPricingDraft] = React.useState(null);
  const [aiPricingSaving, setAiPricingSaving] = React.useState(false);
  const [aiPricingSaved, setAiPricingSaved] = React.useState(false);
  const loadAiUsage = () => {
    if (!session) return;
    setAiUsageLoading(true);
    setAiUsageError('');
    window.arcanaGetAiUsageSummary()
      .then((res) => {
        setAiUsage(res);
        const merged = {};
        const providers = new Set([...Object.keys(res.defaultPricing || {}), ...Object.keys(res.pricing || {})]);
        providers.forEach((prov) => {
          merged[prov] = { ...(res.defaultPricing?.[prov] || {}), ...(res.pricing?.[prov] || {}) };
        });
        setAiPricingDraft(merged);
      })
      .catch((e) => setAiUsageError((e && e.message) || (es ? 'No se pudo cargar el uso de IA.' : "Couldn't load AI usage.")))
      .finally(() => setAiUsageLoading(false));
  };
  React.useEffect(() => { if (session) loadAiUsage(); }, [session]);
  const saveAiPricing = () => {
    setAiPricingSaving(true);
    window.arcanaSaveAiPricing(aiPricingDraft)
      .then(() => {
        setAiPricingSaved(true);
        setTimeout(() => setAiPricingSaved(false), 1800);
      })
      .catch((e) => setAiUsageError((e && e.message) || (es ? 'No se pudo guardar la tarifa.' : "Couldn't save pricing.")))
      .finally(() => setAiPricingSaving(false));
  };
  const fmtUsd = (n) => '$' + (n || 0).toLocaleString(es ? 'es-CL' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  const fmtInt = (n) => (n || 0).toLocaleString(es ? 'es-CL' : 'en-US');

  // ---------- Tarotistas (roster compartido — Netlify Blobs en prod,
  // JSON local en local-server.js. Ver src/data/booking.js) ----------
  const [sharedTarotists, setSharedTarotists] = React.useState([]);
  const [bookingSettings, setBookingSettings] = React.useState({
    sessionBasePrice: 22,
    planDiscounts: { luna: 10, estrella: 15, oraculo: 20 },
    platformCommissionPct: 25,
    newsletterTemplate: '',
    newsletterSchedule: { hour: 8, minute: 0, daysOfWeek: [0, 1, 2, 3, 4, 5, 6] },
    newsletterSpecialDates: [],
    siteBaseUrl: '',
  });
  // Planes de suscripción reales (PayPal Subscriptions) — se provisionan
  // (crean) UNA sola vez con el botón de abajo; después solo se muestran.
  const [subPlans, setSubPlans] = React.useState(null); // {luna_month, luna_year, oraculo_month, oraculo_year} | null
  const [subPlansLoading, setSubPlansLoading] = React.useState(false);
  const [subPlansError, setSubPlansError] = React.useState('');
  const [trLoading, setTrLoading] = React.useState(true);
  const [trError, setTrError] = React.useState(false);
  const [settingsSaved, setSettingsSaved] = React.useState(false);
  const [trForm, setTrForm] = React.useState({ name: '', specialty_es: '', specialty_en: '', rate: 22, color: '#d4a85a', meetingLink: '' });
  const [slotDraft, setSlotDraft] = React.useState({});
  const [recurDraft, setRecurDraft] = React.useState({});
  const [sessions, setSessions] = React.useState([]);
  const [sessionsLoading, setSessionsLoading] = React.useState(true);
  const [testBooking, setTestBooking] = React.useState(null); // resultado de "probar sin pagar"

  const loadTarotists = () => {
    setTrLoading(true);
    setTrError(false);
    window.arcanaFetchTarotistas()
      .then((data) => {
        setSharedTarotists(data.tarotists || []);
        if (data.settings) setBookingSettings(data.settings);
      })
      .catch(() => setTrError(true))
      .finally(() => setTrLoading(false));
  };
  React.useEffect(() => { loadTarotists(); }, []);

  const loadSessions = () => {
    setSessionsLoading(true);
    window.arcanaAdminSessions()
      .then((data) => setSessions(data.sessions || []))
      .catch(() => setSessions([]))
      .finally(() => setSessionsLoading(false));
  };
  React.useEffect(() => { loadSessions(); }, []);

  // Horario recurrente: las fechas se calculan acá (hora local de quien
  // administra Setup) y se mandan ya armadas — el backend solo las guarda.
  const nextWeekdayDate = (weekday, hh, mm) => {
    const d = new Date();
    d.setHours(hh, mm, 0, 0);
    const diff = (weekday - d.getDay() + 7) % 7;
    d.setDate(d.getDate() + diff);
    if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 7);
    return d;
  };
  const addRecurringFor = (tarotistId) => {
    const draft = recurDraft[tarotistId] || {};
    const weekday = Number(draft.weekday ?? 2);
    const [hh, mm] = (draft.time || '10:00').split(':').map(Number);
    const durationMin = Number(draft.durationMin) || 30;
    const weeks = Math.max(1, Number(draft.weeks) || 4);
    const first = nextWeekdayDate(weekday, hh, mm);
    const slots = [];
    for (let i = 0; i < weeks; i++) {
      const d = new Date(first);
      d.setDate(d.getDate() + i * 7);
      slots.push({ startsAt: d.toISOString(), durationMin });
    }
    window.arcanaAddSlotsBulk(tarotistId, slots)
      .then(loadTarotists)
      .catch((e) => alert(e.message));
  };
  const WEEKDAY_OPTIONS = es
    ? [[1,'Lunes'],[2,'Martes'],[3,'Miércoles'],[4,'Jueves'],[5,'Viernes'],[6,'Sábado'],[0,'Domingo']]
    : [[1,'Monday'],[2,'Tuesday'],[3,'Wednesday'],[4,'Thursday'],[5,'Friday'],[6,'Saturday'],[0,'Sunday']];

  const addTarotist = () => {
    if (!trForm.name.trim()) return;
    window.arcanaSaveTarotist({
      name: trForm.name.trim(),
      specialty_es: trForm.specialty_es.trim() || 'Lectura general',
      specialty_en: trForm.specialty_en.trim() || 'General reading',
      rate: Number(trForm.rate) || bookingSettings.sessionBasePrice,
      color: trForm.color,
      meetingLink: trForm.meetingLink.trim(),
    })
      .then(() => {
        setTrForm({ name: '', specialty_es: '', specialty_en: '', rate: 22, color: '#d4a85a', meetingLink: '' });
        loadTarotists();
      })
      .catch((e) => alert(e.message));
  };
  const removeTarotist = (id) => {
    window.arcanaDeleteTarotist(id).then(loadTarotists).catch((e) => alert(e.message));
  };
  const saveTarotistField = (tr, field, value) => {
    window.arcanaSaveTarotist({ ...tr, [field]: value }).then(loadTarotists).catch((e) => alert(e.message));
  };
  const addSlotFor = (tarotistId) => {
    const val = slotDraft[tarotistId];
    if (!val) return;
    const iso = new Date(val).toISOString();
    window.arcanaAddSlot(tarotistId, iso, 30)
      .then(() => { setSlotDraft((d) => ({ ...d, [tarotistId]: '' })); loadTarotists(); })
      .catch((e) => alert(e.message));
  };
  const removeSlot = (tarotistId, slotId) => {
    window.arcanaRemoveSlot(tarotistId, slotId).then(loadTarotists).catch((e) => alert(e.message));
  };
  // Prueba sin pago: crea una reserva ya "pagada" (monto 0) para poder ver
  // la pantalla de la videollamada, tanto del lado cliente como del lado
  // tarotista (esta última aparece abajo en "Sesiones próximas"). Nunca
  // toca PayPal ni existe en el sitio publicado (ver local-server.js).
  const testBookFree = (tarotistId, slotId) => {
    window.arcanaTestBookFree(tarotistId, slotId)
      .then((res) => { setTestBooking(res); loadTarotists(); loadSessions(); })
      .catch((e) => alert(e.message));
  };
  const saveBookingSettings = () => {
    window.arcanaSaveBookingSettings(bookingSettings)
      .then(() => { setSettingsSaved(true); setTimeout(() => setSettingsSaved(false), 1800); })
      .catch((e) => alert(e.message));
  };
  const provisionSubPlans = () => {
    setSubPlansLoading(true);
    setSubPlansError('');
    window.arcanaProvisionSubscriptionPlans()
      .then((res) => setSubPlans(res.plans))
      .catch((e) => setSubPlansError(e.message))
      .finally(() => setSubPlansLoading(false));
  };
  React.useEffect(() => {
    window.arcanaSubscriptionPlans().then((res) => { if (res.plans) setSubPlans(res.plans); }).catch(() => {});
  }, []);

  // ---------- Membresías (ad-honores + newsletter) ----------
  const [memberships, setMemberships] = React.useState([]);
  const [membershipsLoading, setMembershipsLoading] = React.useState(true);
  const [grantForm, setGrantForm] = React.useState({ email: '', planKey: 'luna' });
  const [grantLoading, setGrantLoading] = React.useState(false);
  const [grantResult, setGrantResult] = React.useState(null); // { activationUrl, emailSent, emailError } | { error }
  const [newsletterSending, setNewsletterSending] = React.useState(false);
  const [newsletterResult, setNewsletterResult] = React.useState(null);
  const [announceForm, setAnnounceForm] = React.useState({ subject: '', body: '' });
  const [announceSending, setAnnounceSending] = React.useState(false);
  const [announceResult, setAnnounceResult] = React.useState(null);
  // 2026-09-10: 'texto' (parrafos simples) o 'html' (subis un .zip con un
  // .html + imagenes, se mandan como adjuntos con Content-ID -- ver
  // parseAnnouncementZip / resendSend).
  const [announceMode, setAnnounceMode] = React.useState('text');
  const [announceZipName, setAnnounceZipName] = React.useState('');
  const [announceZipParsing, setAnnounceZipParsing] = React.useState(false);
  const [announceZipError, setAnnounceZipError] = React.useState('');
  const [announceHtml, setAnnounceHtml] = React.useState('');
  const [announcePreviewHtml, setAnnouncePreviewHtml] = React.useState('');
  const [announceImages, setAnnounceImages] = React.useState([]);
  const [newSpecialDate, setNewSpecialDate] = React.useState({ date: '', label_es: '', label_en: '' });
  const [showPreview, setShowPreview] = React.useState(false);

  const loadMemberships = () => {
    setMembershipsLoading(true);
    window.arcanaListMemberships()
      .then((res) => setMemberships(res.subscribers || []))
      .catch(() => {})
      .finally(() => setMembershipsLoading(false));
  };
  React.useEffect(() => { loadMemberships(); }, []);

  const grantMembership = () => {
    const email = grantForm.email.trim();
    if (!email || !email.includes('@')) {
      setGrantResult({ error: es ? 'Escribí un email válido.' : 'Enter a valid email.' });
      return;
    }
    setGrantLoading(true);
    setGrantResult(null);
    window.arcanaGrantMembership({
      email, planKey: grantForm.planKey, origin: window.location.origin, sendEmail: true, lang,
    })
      .then((res) => { setGrantResult(res); setGrantForm({ email: '', planKey: 'luna' }); loadMemberships(); })
      .catch((e) => setGrantResult({ error: e.message }))
      .finally(() => setGrantLoading(false));
  };
  const revokeMembership = (email) => {
    window.arcanaRevokeMembership(email).then(loadMemberships).catch((e) => alert(e.message));
  };
  const copyActivationLink = (url) => {
    try { navigator.clipboard.writeText(url); } catch {}
  };

  const sendNewsletterNow = (force) => {
    setNewsletterSending(true);
    setNewsletterResult(null);
    window.arcanaSendNewsletterNow(force)
      .then((res) => setNewsletterResult(res))
      .catch((e) => setNewsletterResult({ error: e.message }))
      .finally(() => setNewsletterSending(false));
  };
  // Wrapper local del mismo diseño que arma newsletterEmailHtml() en el
  // backend (booking.mts / local-server.js) -- SOLO para que la vista
  // previa del modo "texto" muestre exactamente lo que se va a mandar.
  // Si cambia uno hay que cambiar el otro.
  const announcementPreviewWrap = (subject, bodyHtml) => `<div style="font-family:Georgia,serif;background:#0f0a24;color:#f0e2c0;padding:32px;">
    <p style="color:#b3a8c8;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Lux Astral · Boletín diario</p>
    <h1 style="color:#d4a85a;font-size:22px;margin-top:4px;">${subject}</h1>
    <div style="font-size:15px;line-height:1.7;">${bodyHtml}</div>
    <p style="margin-top:28px;font-size:11px;color:#6b6188;">Recibís esto porque activaste el boletín diario en tu perfil de Lux Astral.</p>
  </div>`;
  const guessImageContentType = (filename) => {
    const ext = (filename.split('.').pop() || '').toLowerCase();
    return { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp' }[ext] || 'application/octet-stream';
  };
  const stripScripts = (html) => html.replace(/<script[\s\S]*?<\/script>/gi, '');
  // Lee un .zip exportado de un editor de emails (HTML + carpeta de
  // imágenes), encuentra el .html adentro, y reemplaza cada <img src="...">
  // que apunte a una imagen del propio zip por "cid:imgN" -- esas imágenes
  // se mandan como adjuntos con Content-ID (ver resendSend en el backend),
  // que es la forma correcta y compatible de incrustar imágenes en un
  // email (a diferencia de pegarlas como data: URI, que varios clientes de
  // correo como Outlook no muestran bien).
  const parseAnnouncementZip = (file) => {
    if (!file) return;
    setAnnounceZipError('');
    setAnnounceZipParsing(true);
    setAnnounceZipName(file.name);
    window.JSZip.loadAsync(file)
      .then(async (zip) => {
        const entries = Object.keys(zip.files).filter((n) => !zip.files[n].dir);
        const htmlName = entries.find((n) => /index\.html?$/i.test(n)) || entries.find((n) => /\.html?$/i.test(n));
        if (!htmlName) throw new Error(es ? 'El .zip no tiene ningún archivo .html adentro.' : 'The .zip has no .html file inside.');
        const imageEntries = entries.filter((n) => /\.(png|jpe?g|gif|webp|bmp)$/i.test(n));
        let html = stripScripts(await zip.files[htmlName].async('string'));
        const images = [];
        let idx = 0;
        html = html.replace(/(<img\b[^>]*\bsrc\s*=\s*["'])([^"']+)(["'])/gi, (match, pre, src, post) => {
          if (/^(https?:|data:|cid:)/i.test(src)) return match;
          let decoded = src;
          try { decoded = decodeURIComponent(src); } catch {}
          decoded = decoded.replace(/^\.?\//, '');
          const found = imageEntries.find((n) => n === decoded || n.endsWith('/' + decoded) || n.split('/').pop() === decoded.split('/').pop());
          if (!found) return match;
          let existing = images.find((im) => im._entry === found);
          if (!existing) {
            existing = { cid: `img${idx++}`, filename: found.split('/').pop(), _entry: found };
            images.push(existing);
          }
          return `${pre}cid:${existing.cid}${post}`;
        });
        await Promise.all(images.map(async (im) => {
          im.base64 = await zip.files[im._entry].async('base64');
          im.contentType = guessImageContentType(im.filename);
          delete im._entry;
        }));
        setAnnounceHtml(html);
        setAnnounceImages(images);
        let preview = html;
        images.forEach((im) => { preview = preview.split(`cid:${im.cid}`).join(`data:${im.contentType};base64,${im.base64}`); });
        setAnnouncePreviewHtml(preview);
      })
      .catch((e) => {
        setAnnounceZipError((e && e.message) || (es ? 'No se pudo leer el .zip.' : "Couldn't read the .zip."));
        setAnnounceHtml('');
        setAnnouncePreviewHtml('');
        setAnnounceImages([]);
      })
      .finally(() => setAnnounceZipParsing(false));
  };
  const announceTextBodyHtml = `<p>${announceForm.body.replace(/\n/g, '</p><p>')}</p>`;
  const announcePreviewFull = announceMode === 'html'
    ? announcePreviewHtml
    : announcementPreviewWrap(announceForm.subject || (es ? '(sin asunto)' : '(no subject)'), announceTextBodyHtml);
  const announceCanSend = announceMode === 'html'
    ? !!(announceForm.subject.trim() && announceHtml)
    : !!(announceForm.subject.trim() && announceForm.body.trim());
  const sendAnnouncementNow = () => {
    if (!announceCanSend) return;
    setAnnounceSending(true);
    setAnnounceResult(null);
    const payload = announceMode === 'html'
      ? { subject: announceForm.subject, html: announceHtml, images: announceImages, raw: true }
      : { subject: announceForm.subject, html: announceTextBodyHtml };
    window.arcanaSendAnnouncement(payload)
      .then((res) => {
        setAnnounceResult(res);
        setAnnounceForm({ subject: '', body: '' });
        setAnnounceHtml(''); setAnnouncePreviewHtml(''); setAnnounceImages([]); setAnnounceZipName('');
      })
      .catch((e) => setAnnounceResult({ error: e.message }))
      .finally(() => setAnnounceSending(false));
  };
  const toggleNewsletterDay = (day) => {
    setBookingSettings((s) => {
      const days = s.newsletterSchedule?.daysOfWeek || [];
      const next = days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort();
      return { ...s, newsletterSchedule: { ...s.newsletterSchedule, daysOfWeek: next } };
    });
  };
  const addSpecialDate = () => {
    if (!/^\d{2}-\d{2}$/.test(newSpecialDate.date) || !newSpecialDate.label_es.trim()) return;
    setBookingSettings((s) => ({
      ...s,
      newsletterSpecialDates: [...(s.newsletterSpecialDates || []), { ...newSpecialDate }],
    }));
    setNewSpecialDate({ date: '', label_es: '', label_en: '' });
  };
  const removeSpecialDate = (date) => {
    setBookingSettings((s) => ({
      ...s,
      newsletterSpecialDates: (s.newsletterSpecialDates || []).filter((d) => d.date !== date),
    }));
  };
  const uploadNewsletterTemplate = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setBookingSettings((s) => ({ ...s, newsletterTemplate: String(reader.result || '') }));
    reader.readAsText(file);
  };
  const newsletterOptInCount = memberships.filter((m) => m.newsletterOptIn && m.status === 'ACTIVE').length;
  const formatSlot = (iso) => {
    try {
      return new Date(iso).toLocaleString(es ? 'es-CL' : 'en-US', {
        weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      });
    } catch { return iso; }
  };

  // ---------- Merchandising: precios editables ----------
  const MERCH_PRICES_KEY = window.MERCH_PRICES_KEY || 'arcana_setup_merch_prices';
  const merchItems = window.MERCH_ITEMS || [];
  const [merchPrices, setMerchPrices] = React.useState(() => readJSON(MERCH_PRICES_KEY, {}));
  const [merchSaved, setMerchSaved] = React.useState(false);
  const setMerchPriceDraft = (key, value) => {
    setMerchPrices((prev) => ({ ...prev, [key]: value }));
  };
  const saveMerchPrices = () => {
    const cleaned = {};
    Object.keys(merchPrices).forEach((key) => {
      const n = Number(merchPrices[key]);
      if (merchPrices[key] !== '' && merchPrices[key] != null && !isNaN(n)) cleaned[key] = n;
    });
    setMerchPrices(cleaned);
    writeJSON(MERCH_PRICES_KEY, cleaned);
    setMerchSaved(true);
    setTimeout(() => setMerchSaved(false), 1800);
  };

  // ---------- Envíos: tarifas editables por zona ----------
  const SHIPPING_PRICES_KEY = window.SHIPPING_PRICES_KEY || 'arcana_setup_shipping_prices';
  const shippingZonesSetup = window.SHIPPING_ZONES || [];
  const [shippingPrices, setShippingPrices] = React.useState(() => readJSON(SHIPPING_PRICES_KEY, {}));
  const [shippingSaved, setShippingSaved] = React.useState(false);
  const setShippingPriceDraft = (key, value) => {
    setShippingPrices((prev) => ({ ...prev, [key]: value }));
  };
  const saveShippingPrices = () => {
    const cleaned = {};
    Object.keys(shippingPrices).forEach((key) => {
      const n = Number(shippingPrices[key]);
      if (shippingPrices[key] !== '' && shippingPrices[key] != null && !isNaN(n)) cleaned[key] = n;
    });
    setShippingPrices(cleaned);
    writeJSON(SHIPPING_PRICES_KEY, cleaned);
    setShippingSaved(true);
    setTimeout(() => setShippingSaved(false), 1800);
  };

  // ---------- API / proveedor y modelo de IA para las lecturas ----------
  const PROVIDERS = [
    {
      id: 'anthropic', label: 'Anthropic (Claude)', keyEnv: 'ANTHROPIC_API_KEY',
      models: [
        { value: 'claude-haiku-4-5-20251001', label_es: 'Claude Haiku 4.5 — rápido y económico', label_en: 'Claude Haiku 4.5 — fast and inexpensive' },
        { value: 'claude-sonnet-5', label_es: 'Claude Sonnet 5 — equilibrio velocidad/calidad', label_en: 'Claude Sonnet 5 — balance of speed and quality' },
        { value: 'claude-opus-5', label_es: 'Claude Opus 5 — máxima calidad', label_en: 'Claude Opus 5 — highest quality' },
        { value: 'claude-fable-5-1', label_es: 'Claude Fable 5.1 — razonamiento más profundo', label_en: 'Claude Fable 5.1 — deeper reasoning' },
      ],
    },
    {
      id: 'openai', label: 'OpenAI (GPT)', keyEnv: 'OPENAI_API_KEY',
      models: [
        { value: 'gpt-5.6-luna', label_es: 'GPT-5.6 Luna — rápido y económico', label_en: 'GPT-5.6 Luna — fast and inexpensive' },
        { value: 'gpt-5.6-terra', label_es: 'GPT-5.6 Terra — equilibrio velocidad/calidad', label_en: 'GPT-5.6 Terra — balance of speed and quality' },
        { value: 'gpt-6-astra', label_es: 'GPT-6 Astra — máxima calidad', label_en: 'GPT-6 Astra — highest quality' },
      ],
    },
    {
      id: 'glm', label: 'GLM (Zhipu / Z.ai)', keyEnv: 'GLM_API_KEY',
      models: [
        { value: 'glm-4.5-flash', label_es: 'GLM-4.5 Flash — rápido y económico', label_en: 'GLM-4.5 Flash — fast and inexpensive' },
        { value: 'glm-4.6', label_es: 'GLM-4.6 — equilibrio velocidad/calidad', label_en: 'GLM-4.6 — balance of speed and quality' },
        { value: 'glm-5.3', label_es: 'GLM-5.3 — máxima calidad', label_en: 'GLM-5.3 — highest quality' },
      ],
    },
    {
      id: 'gemini', label: 'Google Gemini', keyEnv: 'GEMINI_API_KEY',
      models: [
        { value: 'gemini-2.5-flash', label_es: 'Gemini 2.5 Flash — rápido y económico', label_en: 'Gemini 2.5 Flash — fast and inexpensive' },
        { value: 'gemini-3.5-flash', label_es: 'Gemini 3.5 Flash — equilibrio velocidad/calidad', label_en: 'Gemini 3.5 Flash — balance of speed and quality' },
        { value: 'gemini-2.5-pro', label_es: 'Gemini 2.5 Pro — máxima calidad', label_en: 'Gemini 2.5 Pro — highest quality' },
      ],
    },
  ];
  const [provider, setProviderRaw] = React.useState(() => localStorage.getItem('arcana_setup_provider') || 'anthropic');
  const currentProvider = PROVIDERS.find((p) => p.id === provider) || PROVIDERS[0];
  const [model, setModel] = React.useState(() => localStorage.getItem('arcana_setup_model') || currentProvider.models[0].value);
  const saveModel = (v) => {
    setModel(v);
    localStorage.setItem('arcana_setup_model', v);
  };
  const saveProvider = (id) => {
    setProviderRaw(id);
    localStorage.setItem('arcana_setup_provider', id);
    const prov = PROVIDERS.find((p) => p.id === id) || PROVIDERS[0];
    if (!prov.models.some((m) => m.value === model)) {
      saveModel(prov.models[0].value);
    }
  };

  // ---------- Voz (ElevenLabs): escuchar interpretaciones y mensajes ----------
  const [voiceEnabled, setVoiceEnabledRaw] = React.useState(() => {
    const v = localStorage.getItem('arcana_setup_voice_enabled');
    return v === null ? true : v === 'true';
  });
  const saveVoiceEnabled = (v) => {
    setVoiceEnabledRaw(v);
    localStorage.setItem('arcana_setup_voice_enabled', String(v));
  };
  const [voiceId, setVoiceIdRaw] = React.useState(() => localStorage.getItem('arcana_setup_voice_id') || (window.ARCANA_VOICE_DEFAULTS ? window.ARCANA_VOICE_DEFAULTS.defaultVoiceId : '21m00Tcm4TlvDq8ikWAM'));
  const saveVoiceId = (v) => {
    setVoiceIdRaw(v);
    localStorage.setItem('arcana_setup_voice_id', v);
  };
  const [voiceTestState, setVoiceTestState] = React.useState('idle'); // idle | loading | playing | error
  const voiceTestAudioRef = React.useRef(null);
  const testVoice = async () => {
    if (voiceTestState === 'playing') {
      if (voiceTestAudioRef.current) voiceTestAudioRef.current.pause();
      setVoiceTestState('idle');
      return;
    }
    setVoiceTestState('loading');
    try {
      const sample = es
        ? 'Las cartas ya están sobre la mesa. Respira hondo, y vamos a ver qué tienen para decirte hoy.'
        : "The cards are already on the table. Take a deep breath, and let's see what they have to say to you today.";
      const url = await window.arcanaFetchSpeech(sample, voiceId);
      const audio = new Audio(url);
      voiceTestAudioRef.current = audio;
      audio.onended = () => setVoiceTestState('idle');
      audio.onerror = () => setVoiceTestState('error');
      setVoiceTestState('playing');
      await audio.play();
    } catch (e) {
      setVoiceTestState('error');
    }
  };

  // ---------- Tipo de respuesta de la interpretación ----------
  const RESPONSE_TYPES = [
    {
      value: '1',
      label_es: 'Tipo 1 — Simple', label_en: 'Type 1 — Simple',
      desc_es: 'Una respuesta corta y directa, de 3 párrafos breves. Es la que ya venía funcionando.',
      desc_en: 'A short, direct answer in 3 brief paragraphs. This is the one already in use.',
    },
    {
      value: '2',
      label_es: 'Tipo 2 — Moderada', label_en: 'Type 2 — Moderate',
      desc_es: 'Entre 2 y 4 párrafos, con algo más de profundidad que la simple.',
      desc_en: '2 to 4 paragraphs, with a bit more depth than the simple type.',
    },
    {
      value: '3',
      label_es: 'Tipo 3 — Elaborada', label_en: 'Type 3 — Elaborate',
      desc_es: '4 párrafos o más, con la interpretación de cada carta por separado y una conclusión final.',
      desc_en: '4 or more paragraphs, interpreting each card individually plus a final conclusion.',
    },
    {
      value: '4',
      label_es: 'Tipo 4 — Conversación', label_en: 'Type 4 — Conversation',
      desc_es: 'Respuesta inicial muy elaborada y, después, la consultante puede hacer preguntas de seguimiento (hasta 2) y la IA puede invitar a sacar una carta más para completar el contexto.',
      desc_en: 'A very elaborate opening reading, then the querent can ask follow-up questions (up to 2) and the AI may invite drawing one more card for extra context.',
    },
    {
      value: '5',
      label_es: 'Tipo 5 — Sesión completa', label_en: 'Type 5 — Full session',
      desc_es: 'El máximo: informe muy extenso y detallado, hasta 5 preguntas de seguimiento, posibilidad de sacar cartas adicionales, y un informe final descargable en PDF.',
      desc_en: 'The maximum: a very extensive, detailed report, up to 5 follow-up questions, the option to draw extra cards, and a final downloadable PDF report.',
    },
  ];
  const [responseType, setResponseType] = React.useState(() => localStorage.getItem('arcana_setup_response_type') || '1');
  const saveResponseType = (v) => {
    setResponseType(v);
    localStorage.setItem('arcana_setup_response_type', v);
  };

  // ---------- Respaldo de datos locales ----------
  const exportData = () => {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith('vela_') || k.startsWith('arcana_'));
    const dump = {};
    keys.forEach((k) => { dump[k] = localStorage.getItem(k); });
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `arcana-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  const resetAll = () => {
    const msg = es
      ? '¿Seguro que quieres borrar toda la configuración y los datos guardados en este navegador? Esta acción no se puede deshacer.'
      : 'Are you sure you want to erase all configuration and data saved in this browser? This cannot be undone.';
    if (!window.confirm(msg)) return;
    Object.keys(localStorage)
      .filter((k) => k.startsWith('vela_') || k.startsWith('arcana_'))
      .forEach((k) => localStorage.removeItem(k));
    window.location.reload();
  };

  if (!session) {
    return (
      <div className="page setup-page">
        <div className="setup-gate">
          <div className="eyebrow">✦ {es ? 'Panel interno' : 'Internal panel'}</div>
          <h1 className="page-title" style={{ fontSize: 'clamp(28px, 3.6vw, 40px)' }}>
            {es ? 'Acceso restringido' : 'Restricted access'}
          </h1>
          <p className="setup-sub italic">
            {es ? 'Ingresá con un correo autorizado y la contraseña del panel.' : 'Sign in with an authorized email and the panel password.'}
          </p>
          <input
            type="email"
            className="setup-gate-input"
            value={loginEmail}
            onChange={(e) => { setLoginEmail(e.target.value); setLoginError(''); }}
            placeholder={es ? 'Correo' : 'Email'}
            autoFocus
          />
          <input
            type="password"
            className="setup-gate-input"
            value={loginPassword}
            onChange={(e) => { setLoginPassword(e.target.value); setLoginError(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') doLogin(); }}
            placeholder={es ? 'Contraseña' : 'Password'}
            style={{ marginTop: 10 }}
          />
          {loginError && (
            <p className="setup-gate-error">{loginError}</p>
          )}
          <button className="btn btn-primary" onClick={doLogin} disabled={loginLoading} style={{ marginTop: 14 }}>
            {loginLoading ? (es ? 'Entrando…' : 'Signing in…') : (es ? 'Entrar' : 'Enter')}
          </button>
        </div>
        <style>{`
          .setup-gate { max-width: 380px; margin: 90px auto; text-align: center; }
          .setup-gate-input {
            width: 100%; margin-top: 18px; padding: 12px 16px; border-radius: 10px;
            border: 1px solid var(--line); background: rgba(255,255,255,0.03); color: var(--ink);
            font-size: 15px; text-align: center;
          }
          .setup-gate-error { color: #e08a8a; font-size: 13px; margin-top: 8px; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="page setup-page">
      <div className="setup-head">
        <div className="eyebrow">✦ {es ? 'Panel interno' : 'Internal panel'}</div>
        <h1 className="page-title" style={{ fontSize: 'clamp(32px, 4vw, 48px)' }}>
          {es ? 'Configuración de Lux Astral' : 'Lux Astral setup'}
        </h1>
        <p className="setup-sub italic">
          {es
            ? 'Acá se administra la plataforma: cuentas, salón en vivo, tarotistas, el modelo de IA que interpreta las lecturas, y el aspecto visual del sitio.'
            : "This is where the platform is managed: accounts, the live room, readers, the AI model behind readings, and the site's look."}
        </p>
      </div>

      <div className="setup-warning" style={{ borderColor: 'rgba(120,200,140,.4)' }}>
        <span className="setup-warning-icon">🔒</span>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <strong>{es ? 'Sesión activa' : 'Active session'}</strong>
            <p>{es ? 'Entraste como ' : 'Signed in as '}<strong>{session.email}</strong>.</p>
          </div>
          <button className="btn btn-ghost" onClick={doLogout}>{es ? 'Cerrar sesión' : 'Sign out'}</button>
        </div>
      </div>

      {testBooking && (
        <div className="setup-warning" style={{ borderColor: 'rgba(120,200,140,.4)' }}>
          <span className="setup-warning-icon">🧪</span>
          <div style={{ flex: 1 }}>
            <strong>{es ? 'Reserva de prueba creada (sin pago)' : 'Test booking created (no payment)'}</strong>
            <p>
              {es ? 'Código de acceso: ' : 'Access code: '}<strong>{testBooking.accessCode}</strong>
              {' — '}
              {testBooking.videoRoomUrl
                ? (es ? 'sala de Daily.co creada.' : 'Daily.co room created.')
                : (es ? 'no se pudo crear la sala (revisá DAILY_API_KEY); queda el link manual de la tarotista si tiene uno cargado.' : "couldn't create the room (check DAILY_API_KEY); falls back to the reader's manual link if set.")}
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary"
                onClick={() => setRoute && setRoute({ page: 'videocall', accessCode: testBooking.accessCode })}
              >
                {es ? 'Ver como clienta →' : 'View as customer →'}
              </button>
              <span className="italic" style={{ fontSize: 12, alignSelf: 'center', opacity: .75 }}>
                {es ? 'Como tarotista: bajá a "Sesiones próximas" y abrí la sala desde ahí.' : 'As the reader: scroll down to "Upcoming sessions" and open the room from there.'}
              </span>
              <button className="btn btn-ghost" onClick={() => setTestBooking(null)}>{es ? 'Cerrar' : 'Dismiss'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Cambiar contraseña del panel ---------- */}
      <SetupSection
        title={es ? 'Cambiar contraseña del panel' : 'Change panel password'}
        desc={es
          ? 'La contraseña que pediste al entrar. Cambiarla acá afecta a todos los correos con acceso.'
          : "The password you used to sign in. Changing it here affects every email with access."}
      >
        <div className="setup-row">
          <div className="form-field" style={{ maxWidth: 320, marginBottom: 0 }}>
            <label>{es ? 'Nueva contraseña' : 'New password'}</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setPwError(''); }}
              placeholder={es ? 'Mínimo 6 caracteres' : 'At least 6 characters'}
            />
          </div>
          <button className="btn btn-primary" onClick={savePassword}>
            {pwSaved ? (es ? 'Guardada ✓' : 'Saved ✓') : (es ? 'Guardar' : 'Save')}
          </button>
        </div>
        {pwError && <p className="setup-gate-error">{pwError}</p>}
      </SetupSection>

      {/* ---------- Cuentas con acceso (power users reales) ---------- */}
      <SetupSection
        title={es ? 'Cuentas y accesos' : 'Accounts & access'}
        desc={es
          ? 'Correos habilitados para entrar a este panel — solo estos ven el ícono ⚙ y pueden loguearse.'
          : 'Emails allowed into this panel — only these see the ⚙ icon and can sign in.'}
      >
        <div className="setup-row">
          <div className="form-field" style={{ maxWidth: 320, marginBottom: 0 }}>
            <label>{es ? 'Correo' : 'Email'}</label>
            <input
              type="email"
              value={adminInput}
              onChange={(e) => setAdminInput(e.target.value)}
              placeholder="nombre@correo.com"
              onKeyDown={(e) => e.key === 'Enter' && addAdmin()}
            />
          </div>
          <button className="btn btn-ghost" onClick={addAdmin}>{es ? 'Agregar' : 'Add'}</button>
        </div>
        {adminError && <p className="setup-gate-error">{adminError}</p>}
        {powerUsers.length === 0 ? (
          <p className="setup-empty italic">{es ? 'Cargando…' : 'Loading…'}</p>
        ) : (
          <ul className="setup-list">
            {powerUsers.map((a) => (
              <li key={a}>
                <span>{a}{a === session.email ? (es ? ' (vos)' : ' (you)') : ''}</span>
                {powerUsers.length > 1 && (
                  <button className="setup-remove" onClick={() => removeAdmin(a)}>✕</button>
                )}
              </li>
            ))}
          </ul>
        )}
      </SetupSection>

      {/* ---------- Informes: accesos, tiempo en plataforma, movimientos ---------- */}
      <SetupSection
        title={es ? 'Informes' : 'Reports'}
        desc={es
          ? 'Accesos por usuaria, tiempo aproximado en la plataforma, secciones visitadas, y los movimientos de negocio (ingresos, altas y bajas de membresía). Las conversaciones de cada lectura (preguntas y respuestas) siguen siendo confidenciales — acá nunca aparece ese contenido.'
          : "Accesses per user, approximate time on the platform, sections visited, and business movements (income, membership changes). Each reading's conversation (questions and answers) stays confidential — that content never shows up here."}
      >
        <div className="setup-row" style={{ marginBottom: 12 }}>
          <button className="btn btn-ghost" onClick={loadReports} disabled={reportsLoading}>
            {reportsLoading ? (es ? 'Actualizando…' : 'Refreshing…') : (es ? 'Actualizar' : 'Refresh')}
          </button>
          {reports && (
            <span className="italic" style={{ fontSize: 12, opacity: .6, alignSelf: 'center' }}>
              {es ? `${reports.totalEvents} eventos registrados` : `${reports.totalEvents} events logged`}
            </span>
          )}
        </div>
        {reportsError && <p className="setup-gate-error">{reportsError}</p>}

        <h4 style={{ fontSize: 13, margin: '4px 0 8px', opacity: .8 }}>{es ? 'Accesos por usuaria' : 'Accesses per user'}</h4>
        {!reports || reports.users.length === 0 ? (
          <p className="setup-empty italic">{es ? 'Todavía no hay accesos registrados.' : 'No accesses logged yet.'}</p>
        ) : (
          <table style={{ width: '100%', fontSize: 12.5, borderCollapse: 'collapse', marginBottom: 20 }}>
            <thead>
              <tr style={{ opacity: .6, textAlign: 'left' }}>
                <th style={{ padding: '4px 6px' }}>Email</th>
                <th style={{ padding: '4px 6px' }}>{es ? 'Último acceso' : 'Last access'}</th>
                <th style={{ padding: '4px 6px' }}>{es ? 'Sesiones' : 'Sessions'}</th>
                <th style={{ padding: '4px 6px' }}>{es ? 'Minutos en la plataforma' : 'Minutes on platform'}</th>
                <th style={{ padding: '4px 6px' }}>{es ? 'Secciones visitadas' : 'Sections visited'}</th>
              </tr>
            </thead>
            <tbody>
              {reports.users.map((u) => (
                <tr key={u.email} style={{ borderTop: '1px solid rgba(255,255,255,.08)' }}>
                  <td style={{ padding: '4px 6px' }}>{u.email}</td>
                  <td style={{ padding: '4px 6px' }}>{new Date(u.lastAccess).toLocaleString(es ? 'es-CL' : 'en-US')}</td>
                  <td style={{ padding: '4px 6px' }}>{u.sessions}</td>
                  <td style={{ padding: '4px 6px' }}>{u.minutesOnPlatform}</td>
                  <td style={{ padding: '4px 6px' }}>{u.pagesVisited.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <h4 style={{ fontSize: 13, margin: '4px 0 8px', opacity: .8 }}>{es ? 'Movimientos (ingresos y membresías)' : 'Movements (income & memberships)'}</h4>
        {!reports || reports.movements.length === 0 ? (
          <p className="setup-empty italic">{es ? 'Todavía no hay movimientos registrados.' : 'No movements logged yet.'}</p>
        ) : (
          <table style={{ width: '100%', fontSize: 12.5, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ opacity: .6, textAlign: 'left' }}>
                <th style={{ padding: '4px 6px' }}>{es ? 'Fecha' : 'Date'}</th>
                <th style={{ padding: '4px 6px' }}>Email</th>
                <th style={{ padding: '4px 6px' }}>{es ? 'Tipo' : 'Type'}</th>
                <th style={{ padding: '4px 6px' }}>{es ? 'Detalle' : 'Detail'}</th>
              </tr>
            </thead>
            <tbody>
              {reports.movements.map((m) => (
                <tr key={m.id} style={{ borderTop: '1px solid rgba(255,255,255,.08)' }}>
                  <td style={{ padding: '4px 6px' }}>{new Date(m.ts).toLocaleString(es ? 'es-CL' : 'en-US')}</td>
                  <td style={{ padding: '4px 6px' }}>{m.email}</td>
                  <td style={{ padding: '4px 6px' }}>{(MOVEMENT_TYPE_LABELS[m.type] && MOVEMENT_TYPE_LABELS[m.type][es ? 'es' : 'en']) || m.type}</td>
                  <td style={{ padding: '4px 6px' }}>
                    {m.detail && m.detail.planKey ? `${m.detail.planKey}${m.detail.billing ? ' · ' + m.detail.billing : ''}` : ''}
                    {m.detail && m.detail.kind === 'booking' ? (es ? `Sesión reservada${m.detail.amount ? ' · $' + m.detail.amount : ''}` : `Booked session${m.detail.amount ? ' · $' + m.detail.amount : ''}`) : ''}
                    {m.detail && m.detail.reason ? ` (${m.detail.reason})` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SetupSection>

      {/* ---------- Salón de chat y videoconferencia ---------- */}
      <SetupSection
        title={es ? 'Salón de chat y videoconferencia' : 'Chat room & video conference'}
        desc={es
          ? 'Las sesiones de video ahora se abren en salas de Daily.co creadas automáticamente por cada reserva pagada — ya no hay un código fijo de tarotista. Los clientes entran con el código que reciben al pagar (o desde "Mis reservas"); la tarotista entra directo desde la sección "Sesiones próximas" más abajo, sin código.'
          : 'Video sessions now open in Daily.co rooms created automatically per paid booking — there is no fixed reader code anymore. Customers join with the code they get when paying (or from "My bookings"); the reader joins directly from the "Upcoming sessions" section below, no code needed.'}
      >
        <p className="setup-hint italic">
          {es
            ? 'Falta configurar DAILY_API_KEY en el .env para que las salas se generen — sin eso, se usa el link manual de Zoom/Meet que cargues arriba en cada tarotista.'
            : "DAILY_API_KEY still needs to be set in .env for rooms to be created — without it, the manual Zoom/Meet link you set above for each reader is used instead."}
        </p>
      </SetupSection>

      {/* ---------- Tarotistas ---------- */}
      <SetupSection
        title={es ? 'Tarotistas' : 'Readers'}
        desc={es
          ? 'Roster compartido: lo que agregues o cambies acá lo ve cualquiera que entre al Marketplace, no solo vos. El link de videollamada (Zoom/Meet personal de cada tarotista) es lo que recibe el cliente al pagar — sin eso, la sesión no tiene por dónde entrar.'
          : 'Shared roster: whatever you add or change here shows up for anyone visiting the Marketplace, not just you. The video call link (each reader’s personal Zoom/Meet room) is what the customer gets after paying — without it, there’s nowhere for the session to happen.'}
      >
        {trLoading && <p className="setup-hint italic">{es ? 'Cargando…' : 'Loading…'}</p>}
        {!trLoading && trError && <p className="setup-hint italic">{es ? 'No se pudo cargar el roster. Revisa que local-server.js esté corriendo.' : "Couldn't load the roster. Check that local-server.js is running."}</p>}

        {!trLoading && !trError && (
          <div className="setup-tarotist-list">
            {sharedTarotists.map((tr) => (
              <div className="setup-tarotist-row" key={tr.id} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="setup-tarotist-swatch" style={{ background: tr.color }}>{tr.initials}</div>
                  <div className="setup-tarotist-info" style={{ flex: 1 }}>
                    <div className="setup-tarotist-name">{tr.name}</div>
                    <div className="setup-tarotist-spec italic">{es ? tr.specialty_es : tr.specialty_en}</div>
                  </div>
                  <button className="setup-remove" onClick={() => removeTarotist(tr.id)}>✕</button>
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                  <div className="form-field" style={{ marginBottom: 0, maxWidth: 110 }}>
                    <label style={{ fontSize: 11 }}>{es ? 'Tarifa (USD)' : 'Rate (USD)'}</label>
                    <input
                      type="number"
                      defaultValue={tr.rate}
                      onBlur={(e) => { const n = Number(e.target.value); if (!isNaN(n) && n !== tr.rate) saveTarotistField(tr, 'rate', n); }}
                    />
                  </div>
                  <div className="form-field" style={{ marginBottom: 0, flex: 1, minWidth: 220 }}>
                    <label style={{ fontSize: 11 }}>{es ? 'Link de videollamada (Zoom/Meet)' : 'Video call link (Zoom/Meet)'}</label>
                    <input
                      defaultValue={tr.meetingLink}
                      placeholder="https://meet.google.com/xxx-xxxx-xxx"
                      onBlur={(e) => { if (e.target.value.trim() !== tr.meetingLink) saveTarotistField(tr, 'meetingLink', e.target.value.trim()); }}
                    />
                  </div>
                </div>

                <div style={{ marginTop: 10 }}>
                  <div className="eyebrow" style={{ fontSize: 10, marginBottom: 6 }}>{es ? 'Horarios' : 'Time slots'}</div>
                  {(!tr.availability || tr.availability.length === 0) && (
                    <p className="setup-hint italic" style={{ margin: '0 0 8px' }}>{es ? 'Sin horarios cargados todavía.' : 'No time slots yet.'}</p>
                  )}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                    {(tr.availability || []).map((slot) => (
                      <span key={slot.id} className="setup-slot-chip">
                        {formatSlot(slot.startsAt)}{slot.booked ? ' 🔒' : ''}
                        {!slot.booked && (
                          <button
                            title={es ? 'Probar videollamada sin pagar' : 'Test video call without paying'}
                            onClick={() => testBookFree(tr.id, slot.id)}
                          >🧪</button>
                        )}
                        {!slot.booked && <button onClick={() => removeSlot(tr.id, slot.id)}>✕</button>}
                      </span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="datetime-local"
                      value={slotDraft[tr.id] || ''}
                      onChange={(e) => setSlotDraft((d) => ({ ...d, [tr.id]: e.target.value }))}
                      style={{ maxWidth: 200 }}
                    />
                    <button className="btn btn-ghost" onClick={() => addSlotFor(tr.id)}>+ {es ? 'Horario' : 'Slot'}</button>
                  </div>

                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed rgba(212,168,90,.25)' }}>
                    <div className="eyebrow" style={{ fontSize: 10, marginBottom: 6 }}>{es ? 'Horario recurrente' : 'Recurring schedule'}</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <select
                        value={recurDraft[tr.id]?.weekday ?? 2}
                        onChange={(e) => setRecurDraft((d) => ({ ...d, [tr.id]: { ...d[tr.id], weekday: e.target.value } }))}
                      >
                        {WEEKDAY_OPTIONS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
                      </select>
                      <input
                        type="time"
                        value={recurDraft[tr.id]?.time ?? '10:00'}
                        onChange={(e) => setRecurDraft((d) => ({ ...d, [tr.id]: { ...d[tr.id], time: e.target.value } }))}
                        style={{ maxWidth: 110 }}
                      />
                      <input
                        type="number" min="15" step="5"
                        value={recurDraft[tr.id]?.durationMin ?? 30}
                        onChange={(e) => setRecurDraft((d) => ({ ...d, [tr.id]: { ...d[tr.id], durationMin: e.target.value } }))}
                        style={{ maxWidth: 70 }}
                        title={es ? 'Duración (min)' : 'Duration (min)'}
                      />
                      <span className="italic" style={{ fontSize: 12 }}>{es ? 'por' : 'for'}</span>
                      <input
                        type="number" min="1" max="12"
                        value={recurDraft[tr.id]?.weeks ?? 4}
                        onChange={(e) => setRecurDraft((d) => ({ ...d, [tr.id]: { ...d[tr.id], weeks: e.target.value } }))}
                        style={{ maxWidth: 55 }}
                      />
                      <span className="italic" style={{ fontSize: 12 }}>{es ? 'semanas' : 'weeks'}</span>
                      <button className="btn btn-ghost" onClick={() => addRecurringFor(tr.id)}>+ {es ? 'Agregar recurrente' : 'Add recurring'}</button>
                    </div>
                    <div className="setup-hint italic" style={{ marginTop: 4, fontSize: 11 }}>
                      {es ? 'Se calculan con tu hora local actual.' : 'Calculated using your current local time.'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="setup-tarotist-form" style={{ marginTop: 18 }}>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label>{es ? 'Nombre' : 'Name'}</label>
            <input value={trForm.name} onChange={(e) => setTrForm({ ...trForm, name: e.target.value })} />
          </div>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label>{es ? 'Especialidad (ES)' : 'Specialty (ES)'}</label>
            <input value={trForm.specialty_es} onChange={(e) => setTrForm({ ...trForm, specialty_es: e.target.value })} />
          </div>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label>Specialty (EN)</label>
            <input value={trForm.specialty_en} onChange={(e) => setTrForm({ ...trForm, specialty_en: e.target.value })} />
          </div>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label>{es ? 'Tarifa (USD)' : 'Rate (USD)'}</label>
            <input type="number" value={trForm.rate} onChange={(e) => setTrForm({ ...trForm, rate: e.target.value })} />
          </div>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label>{es ? 'Link de videollamada' : 'Video call link'}</label>
            <input value={trForm.meetingLink} onChange={(e) => setTrForm({ ...trForm, meetingLink: e.target.value })} placeholder="https://meet.google.com/xxx-xxxx-xxx" />
          </div>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label>{es ? 'Color' : 'Color'}</label>
            <input type="color" value={trForm.color} onChange={(e) => setTrForm({ ...trForm, color: e.target.value })} style={{ padding: 4, height: 44 }} />
          </div>
          <button className="btn btn-ghost" onClick={addTarotist} style={{ alignSelf: 'end' }}>
            + {es ? 'Agregar tarotista' : 'Add reader'}
          </button>
        </div>
      </SetupSection>

      {/* ---------- Sesiones próximas: acceso directo a la sala para la tarotista ---------- */}
      <SetupSection
        title={es ? 'Sesiones próximas' : 'Upcoming sessions'}
        desc={es
          ? 'Para que la tarotista entre directo a la sala el día de la sesión, sin código de acceso — esto es solo para este panel interno, no lo ve el cliente.'
          : 'So the reader can jump straight into the room on session day, no access code needed — this is only for this internal panel, customers never see it.'}
      >
        {sessionsLoading && <p className="setup-hint italic">{es ? 'Cargando…' : 'Loading…'}</p>}
        {!sessionsLoading && sessions.length === 0 && (
          <p className="setup-hint italic">{es ? 'No hay sesiones pagadas próximas.' : 'No upcoming paid sessions.'}</p>
        )}
        <div style={{ display: 'grid', gap: 8 }}>
          {sessions.map((s) => (
            <div
              key={s.id}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                border: '1px solid rgba(212,168,90,.2)', borderRadius: 8, padding: '8px 12px',
              }}
            >
              <div>
                <div style={{ fontSize: 13 }}>{s.tarotistName} · {formatSlot(s.when)}</div>
                <div className="italic" style={{ fontSize: 11, opacity: .7 }}>{s.customerName || s.customerEmail}</div>
              </div>
              {(s.videoRoomUrl || s.meetingLink) ? (
                <a className="btn btn-ghost" href={s.videoRoomUrl || s.meetingLink} target="_blank" rel="noopener noreferrer">
                  {es ? 'Abrir sala' : 'Open room'} →
                </a>
              ) : (
                <span className="italic" style={{ fontSize: 11, opacity: .6 }}>{es ? 'Sala aún no generada' : 'Room not created yet'}</span>
              )}
            </div>
          ))}
        </div>
        <button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={loadSessions}>{es ? 'Actualizar' : 'Refresh'}</button>
      </SetupSection>

      {/* ---------- Envíos y sesiones: precio base, descuento, comisión ---------- */}
      <SetupSection
        title={es ? 'Precio y comisión de sesiones de video' : 'Video session price and commission'}
        desc={es
          ? 'Precio base por sesión de 30 min (si una tarotista no tiene tarifa propia, se usa este), el % de descuento de cada plan de suscripción, y el % de comisión de la plataforma — hoy es solo informativo, los pagos a las tarotistas todavía son manuales. La sesión mensual gratis de Oráculo se aplica aparte, ver la sección de Suscripciones.'
          : "Base price for a 30-min session (used when a reader has no rate of her own), each subscription plan's discount %, and the platform's commission % — informational for now, payouts to readers are still manual. Oráculo's free monthly session is applied separately, see the Subscriptions section."}
      >
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <div className="form-field" style={{ marginBottom: 0, maxWidth: 160 }}>
            <label>{es ? 'Precio base (USD)' : 'Base price (USD)'}</label>
            <input
              type="number"
              value={bookingSettings.sessionBasePrice}
              onChange={(e) => setBookingSettings((s) => ({ ...s, sessionBasePrice: Number(e.target.value) }))}
            />
          </div>
          <div className="form-field" style={{ marginBottom: 0, maxWidth: 160 }}>
            <label>{es ? 'Descuento Luna (%)' : 'Luna discount (%)'}</label>
            <input
              type="number"
              value={bookingSettings.planDiscounts.luna}
              onChange={(e) => setBookingSettings((s) => ({ ...s, planDiscounts: { ...s.planDiscounts, luna: Number(e.target.value) } }))}
            />
          </div>
          <div className="form-field" style={{ marginBottom: 0, maxWidth: 160 }}>
            <label>{es ? 'Descuento Estrella (%)' : 'Estrella discount (%)'}</label>
            <input
              type="number"
              value={bookingSettings.planDiscounts.estrella}
              onChange={(e) => setBookingSettings((s) => ({ ...s, planDiscounts: { ...s.planDiscounts, estrella: Number(e.target.value) } }))}
            />
          </div>
          <div className="form-field" style={{ marginBottom: 0, maxWidth: 160 }}>
            <label>{es ? 'Descuento Oráculo (%)' : 'Oráculo discount (%)'}</label>
            <input
              type="number"
              value={bookingSettings.planDiscounts.oraculo}
              onChange={(e) => setBookingSettings((s) => ({ ...s, planDiscounts: { ...s.planDiscounts, oraculo: Number(e.target.value) } }))}
            />
          </div>
          <div className="form-field" style={{ marginBottom: 0, maxWidth: 160 }}>
            <label>{es ? 'Comisión plataforma (%)' : 'Platform commission (%)'}</label>
            <input
              type="number"
              value={bookingSettings.platformCommissionPct}
              onChange={(e) => setBookingSettings((s) => ({ ...s, platformCommissionPct: Number(e.target.value) }))}
            />
          </div>
        </div>
        <button className="btn btn-primary" onClick={saveBookingSettings} style={{ marginTop: 6 }}>
          {settingsSaved ? (es ? 'Guardado ✓' : 'Saved ✓') : (es ? 'Guardar' : 'Save')}
        </button>
      </SetupSection>

      {/* ---------- Planes de suscripción (PayPal Subscriptions) ---------- */}
      <SetupSection
        title={es ? 'Planes de suscripción (PayPal)' : 'Subscription plans (PayPal)'}
        desc={es
          ? 'Crea (una sola vez) el Producto y los 6 Planes de cobro recurrente en PayPal (Luna, Estrella y Oráculo, mensual y anual) que se muestran en la página de Precios. Los precios salen del código de esa página — para cambiarlos hay que avisarme.'
          : "Creates (once) the recurring-billing Product and 6 Plans in PayPal (Luna, Estrella and Oráculo, monthly and yearly) shown on the Pricing page. Prices come from that page's code — ask me to change them."}
      >
        {(() => {
          const ALL_PLAN_KEYS = ['luna_month', 'luna_year', 'estrella_month', 'estrella_year', 'oraculo_month', 'oraculo_year'];
          const missing = ALL_PLAN_KEYS.filter((k) => !(subPlans && subPlans[k]));
          return (
            <>
              {subPlans && (
                <div className="italic" style={{ fontSize: 12.5, opacity: .75, lineHeight: 1.7, marginBottom: missing.length ? 10 : 0 }}>
                  {es ? 'Ya creados en PayPal:' : 'Already created in PayPal:'}<br />
                  {subPlans.luna_month && <>Luna: {subPlans.luna_month} · {subPlans.luna_year}<br /></>}
                  {subPlans.estrella_month && <>Estrella: {subPlans.estrella_month} · {subPlans.estrella_year}<br /></>}
                  {subPlans.oraculo_month && <>Oráculo: {subPlans.oraculo_month} · {subPlans.oraculo_year}<br /></>}
                </div>
              )}
              {missing.length > 0 && (
                <button className="btn btn-primary" onClick={provisionSubPlans} disabled={subPlansLoading}>
                  {subPlansLoading
                    ? (es ? 'Creando…' : 'Creating…')
                    : subPlans
                      ? (es ? 'Crear los planes que faltan' : 'Create the missing plans')
                      : (es ? 'Provisionar planes en PayPal' : 'Provision plans in PayPal')}
                </button>
              )}
            </>
          );
        })()}
        {subPlansError && <div className="italic" style={{ fontSize: 12, color: '#e08080', marginTop: 8 }}>{subPlansError}</div>}
      </SetupSection>

      {/* ---------- Membresías ad-honores ---------- */}
      <SetupSection
        title={es ? 'Membresías' : 'Memberships'}
        desc={es
          ? 'Otorgá una membresía Luna, Estrella u Oráculo sin costo (ad-honores) a un email. La persona recibe un link de activación (por email si Resend está configurado, o lo copiás y se lo mandás vos) que termina en una página de bienvenida.'
          : "Grant a free (honorary) Luna, Estrella or Oráculo membership to an email. The person gets an activation link (by email if Resend is configured, or you copy it and send it yourself) that ends on a welcome page."}
      >
        <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="email"
            placeholder={es ? 'email@ejemplo.com' : 'email@example.com'}
            value={grantForm.email}
            onChange={(e) => setGrantForm((f) => ({ ...f, email: e.target.value }))}
            style={{ flex: '1 1 220px' }}
          />
          <select value={grantForm.planKey} onChange={(e) => setGrantForm((f) => ({ ...f, planKey: e.target.value }))}>
            <option value="luna">Luna</option>
            <option value="estrella">Estrella</option>
            <option value="oraculo">Oráculo</option>
          </select>
          <button className="btn btn-primary" onClick={grantMembership} disabled={grantLoading}>
            {grantLoading ? (es ? 'Otorgando…' : 'Granting…') : (es ? 'Otorgar membresía' : 'Grant membership')}
          </button>
        </div>
        {grantResult && grantResult.error && (
          <div className="italic" style={{ fontSize: 12, color: '#e08080', marginTop: 8 }}>{grantResult.error}</div>
        )}
        {grantResult && grantResult.activationUrl && (
          <div className="italic" style={{ fontSize: 12.5, opacity: .85, marginTop: 10, lineHeight: 1.6 }}>
            {grantResult.emailSent
              ? (es ? '✓ Le mandamos el link de activación por email.' : "✓ We emailed the activation link.")
              : (es ? 'No se mandó el email automático (revisá RESEND_API_KEY) — copiá este link y mandaselo vos:' : "The email wasn't sent automatically (check RESEND_API_KEY) — copy this link and send it yourself:")}
            <div className="row" style={{ gap: 6, marginTop: 6 }}>
              <input readOnly value={grantResult.activationUrl} style={{ flex: 1, fontSize: 11.5 }} onFocus={(e) => e.target.select()} />
              <button className="btn btn-secondary" onClick={() => copyActivationLink(grantResult.activationUrl)}>{es ? 'Copiar' : 'Copy'}</button>
            </div>
            {grantResult.emailError && <div style={{ color: '#e08080', marginTop: 4 }}>{grantResult.emailError}</div>}
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          {membershipsLoading ? (
            <div className="italic" style={{ fontSize: 12.5, opacity: .6 }}>{es ? 'Cargando…' : 'Loading…'}</div>
          ) : memberships.length === 0 ? (
            <div className="italic" style={{ fontSize: 12.5, opacity: .6 }}>{es ? 'Todavía no hay membresías.' : 'No memberships yet.'}</div>
          ) : (
            <table style={{ width: '100%', fontSize: 12.5, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ opacity: .6, textAlign: 'left' }}>
                  <th style={{ padding: '4px 6px' }}>Email</th>
                  <th style={{ padding: '4px 6px' }}>Plan</th>
                  <th style={{ padding: '4px 6px' }}>{es ? 'Origen' : 'Source'}</th>
                  <th style={{ padding: '4px 6px' }}>{es ? 'Estado' : 'Status'}</th>
                  <th style={{ padding: '4px 6px' }}>{es ? 'Boletín' : 'Newsletter'}</th>
                  <th style={{ padding: '4px 6px' }}></th>
                </tr>
              </thead>
              <tbody>
                {memberships.map((m) => (
                  <tr key={m.email} style={{ borderTop: '1px solid rgba(255,255,255,.08)' }}>
                    <td style={{ padding: '4px 6px' }}>{m.email}</td>
                    <td style={{ padding: '4px 6px', textTransform: 'capitalize' }}>{m.planKey}</td>
                    <td style={{ padding: '4px 6px' }}>{m.source === 'honorary' ? (es ? 'Ad-honores' : 'Honorary') : 'PayPal'}</td>
                    <td style={{ padding: '4px 6px' }}>{m.status}</td>
                    <td style={{ padding: '4px 6px' }}>{m.newsletterOptIn ? '✓' : '—'}</td>
                    <td style={{ padding: '4px 6px' }}>
                      {m.source === 'honorary' && m.status === 'ACTIVE' && (
                        <button className="btn btn-secondary" style={{ fontSize: 11 }} onClick={() => revokeMembership(m.email)}>
                          {es ? 'Revocar' : 'Revoke'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </SetupSection>

      {/* ---------- Newsletter y novedades ---------- */}
      <SetupSection
        title={es ? 'Newsletter y novedades' : 'Newsletter and updates'}
        desc={es
          ? `Boletín diario generado con IA (carta del día + mensaje corto) para quienes activaron el boletín en su bienvenida. Hoy hay ${newsletterOptInCount} suscriptas activas al boletín. Requiere RESEND_API_KEY configurada.`
          : `AI-generated daily newsletter (card of the day + short message) for whoever opted in on their welcome page. Currently ${newsletterOptInCount} active newsletter subscribers. Requires RESEND_API_KEY.`}
      >
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => sendNewsletterNow(false)} disabled={newsletterSending}>
            {newsletterSending ? (es ? 'Enviando…' : 'Sending…') : (es ? 'Enviar boletín de hoy' : "Send today's newsletter")}
          </button>
          <button className="btn btn-secondary" onClick={() => sendNewsletterNow(true)} disabled={newsletterSending} title={es ? 'Ignora el límite de una vez por día (para probar)' : 'Ignores the once-a-day limit (for testing)'}>
            {es ? 'Forzar reenvío' : 'Force resend'}
          </button>
        </div>
        {newsletterResult && (
          <div className="italic" style={{ fontSize: 12.5, opacity: .85, marginTop: 8, lineHeight: 1.6 }}>
            {newsletterResult.error && <span style={{ color: '#e08080' }}>{newsletterResult.error}</span>}
            {newsletterResult.skipped && (es ? 'Ya se mandó hoy — usá "Forzar reenvío" si querés mandarlo de nuevo.' : 'Already sent today — use "Force resend" to send it again.')}
            {typeof newsletterResult.sent === 'number' && (
              es ? `Enviado a ${newsletterResult.sent} de ${newsletterResult.total} suscriptas — "${newsletterResult.cardName}".`
                 : `Sent to ${newsletterResult.sent} of ${newsletterResult.total} subscribers — "${newsletterResult.cardName}".`
            )}
            {Array.isArray(newsletterResult.failed) && newsletterResult.failed.length > 0 && (
              <div style={{ color: '#e08080', marginTop: 4 }}>
                {newsletterResult.failed.map((f, i) => (
                  <div key={i}>{typeof f === 'string' ? f : `${f.email}: ${f.error}`}</div>
                ))}
              </div>
            )}
            {newsletterResult.preview && (
              <div style={{ marginTop: 8 }}>
                <button className="btn btn-secondary" onClick={() => setShowPreview((v) => !v)} style={{ fontSize: 12 }}>
                  {showPreview ? (es ? 'Ocultar vista previa' : 'Hide preview') : (es ? 'Ver vista previa del email' : 'View email preview')}
                </button>
                {showPreview && (
                  <iframe
                    title="newsletter-preview"
                    srcDoc={newsletterResult.preview}
                    style={{ width: '100%', height: 700, border: '1px solid rgba(255,255,255,.15)', borderRadius: 8, marginTop: 8, background: '#fff' }}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* ---- Configuración: horario, fechas especiales, template, URL del sitio ---- */}
        <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,.1)' }}>
          <div className="italic" style={{ fontSize: 12.5, opacity: .75, marginBottom: 10 }}>
            {es
              ? 'Configuración del boletín automático. La carta siempre es la misma "carta del día" de la plataforma — esto define el horario/días de envío, fechas especiales (el contenido se ajusta ese día) y el diseño del email. El disparo 100% automático todavía no está activo (depende de dónde quede alojado el sitio); por ahora se manda con los botones de arriba.'
              : 'Automated newsletter settings. The card is always the platform\'s own "card of the day" — this configures send time/days, special dates (content adapts that day), and the email design. Fully automatic sending isn\'t live yet (depends on final hosting); for now it\'s sent with the buttons above.'}
          </div>

          <div className="form-field" style={{ marginBottom: 10, maxWidth: 420 }}>
            <label>{es ? 'URL pública del sitio (para las imágenes del email)' : "Site's public URL (for the email images)"}</label>
            <input
              placeholder="https://luxastral.com"
              value={bookingSettings.siteBaseUrl || ''}
              onChange={(e) => setBookingSettings((s) => ({ ...s, siteBaseUrl: e.target.value }))}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 10 }}>
            <div className="form-field" style={{ marginBottom: 0, maxWidth: 110 }}>
              <label>{es ? 'Hora' : 'Hour'}</label>
              <input
                type="number" min="0" max="23"
                value={bookingSettings.newsletterSchedule?.hour ?? 8}
                onChange={(e) => setBookingSettings((s) => ({ ...s, newsletterSchedule: { ...s.newsletterSchedule, hour: Number(e.target.value) } }))}
              />
            </div>
            <div className="form-field" style={{ marginBottom: 0, maxWidth: 110 }}>
              <label>{es ? 'Minuto' : 'Minute'}</label>
              <input
                type="number" min="0" max="59"
                value={bookingSettings.newsletterSchedule?.minute ?? 0}
                onChange={(e) => setBookingSettings((s) => ({ ...s, newsletterSchedule: { ...s.newsletterSchedule, minute: Number(e.target.value) } }))}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
            {(es ? ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']).map((label, day) => {
              const active = (bookingSettings.newsletterSchedule?.daysOfWeek || []).includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  className={active ? 'btn btn-primary' : 'btn btn-secondary'}
                  style={{ padding: '4px 10px', fontSize: 12 }}
                  onClick={() => toggleNewsletterDay(day)}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="italic" style={{ fontSize: 12.5, opacity: .75, marginBottom: 6 }}>
            {es ? 'Fechas especiales (el contenido del consejo se ajusta ese día):' : "Special dates (the day's advice adapts on these):"}
          </div>
          {(bookingSettings.newsletterSpecialDates || []).map((d) => (
            <div key={d.date} className="row" style={{ gap: 8, alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontFamily: 'monospace', fontSize: 12.5, opacity: .8, minWidth: 46 }}>{d.date}</span>
              <span style={{ fontSize: 12.5 }}>{es ? d.label_es : (d.label_en || d.label_es)}</span>
              <button className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => removeSpecialDate(d.date)}>
                {es ? 'Quitar' : 'Remove'}
              </button>
            </div>
          ))}
          <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
            <input
              placeholder="MM-DD"
              value={newSpecialDate.date}
              onChange={(e) => setNewSpecialDate((f) => ({ ...f, date: e.target.value }))}
              style={{ width: 80 }}
            />
            <input
              placeholder={es ? 'Nombre (ej. Navidad)' : 'Label (e.g. Christmas)'}
              value={newSpecialDate.label_es}
              onChange={(e) => setNewSpecialDate((f) => ({ ...f, label_es: e.target.value, label_en: f.label_en || e.target.value }))}
              style={{ width: 180 }}
            />
            <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={addSpecialDate}>
              {es ? 'Agregar fecha' : 'Add date'}
            </button>
          </div>

          <div className="italic" style={{ fontSize: 12.5, opacity: .75, marginBottom: 6 }}>
            {es
              ? 'Diseño del email (HTML con {{placeholders}}). Podés editarlo acá o subir un archivo .html para reemplazarlo:'
              : 'Email design (HTML with {{placeholders}}). Edit it here, or upload an .html file to replace it:'}
          </div>
          <input
            type="file"
            accept=".html,text/html"
            onChange={(e) => uploadNewsletterTemplate(e.target.files && e.target.files[0])}
            style={{ marginBottom: 8, fontSize: 12.5 }}
          />
          <textarea
            value={bookingSettings.newsletterTemplate || ''}
            onChange={(e) => setBookingSettings((s) => ({ ...s, newsletterTemplate: e.target.value }))}
            placeholder={es ? '(vacío = usa el diseño original de templates/newsletter-daily.html)' : '(empty = uses the original design from templates/newsletter-daily.html)'}
            rows={8}
            style={{ width: '100%', fontFamily: 'monospace', fontSize: 11.5, marginBottom: 10 }}
          />

          <button className="btn btn-primary" onClick={saveBookingSettings}>
            {settingsSaved ? (es ? 'Guardado ✓' : 'Saved ✓') : (es ? 'Guardar configuración del boletín' : 'Save newsletter settings')}
          </button>
        </div>

        <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,.1)' }}>
          <div className="italic" style={{ fontSize: 12.5, opacity: .75, marginBottom: 8 }}>
            {es ? 'Mandar una novedad / producto puntual a la misma lista:' : 'Send a one-off update / product announcement to the same list:'}
          </div>

          <div className="setup-row" style={{ marginBottom: 10, gap: 8 }}>
            <button
              className={announceMode === 'text' ? 'btn btn-primary' : 'btn btn-ghost'}
              onClick={() => setAnnounceMode('text')}
              style={{ fontSize: 12.5 }}
            >
              {es ? 'Texto simple' : 'Plain text'}
            </button>
            <button
              className={announceMode === 'html' ? 'btn btn-primary' : 'btn btn-ghost'}
              onClick={() => setAnnounceMode('html')}
              style={{ fontSize: 12.5 }}
            >
              {es ? 'HTML (subir .zip)' : 'HTML (upload .zip)'}
            </button>
          </div>

          <input
            placeholder={es ? 'Asunto' : 'Subject'}
            value={announceForm.subject}
            onChange={(e) => setAnnounceForm((f) => ({ ...f, subject: e.target.value }))}
            style={{ width: '100%', marginBottom: 8 }}
          />

          {announceMode === 'text' ? (
            <textarea
              placeholder={es ? 'Mensaje…' : 'Message…'}
              value={announceForm.body}
              onChange={(e) => setAnnounceForm((f) => ({ ...f, body: e.target.value }))}
              rows={4}
              style={{ width: '100%', marginBottom: 8 }}
            />
          ) : (
            <div style={{ marginBottom: 8 }}>
              <p className="setup-hint italic" style={{ marginBottom: 6 }}>
                {es
                  ? 'Subí un .zip con un archivo .html (el diseño completo del email) y su carpeta de imágenes -- las imágenes se detectan solas y se mandan incrustadas en el email, no como links externos.'
                  : 'Upload a .zip with an .html file (the full email design) and its images folder -- images are detected automatically and embedded in the email, not linked externally.'}
              </p>
              <input
                type="file"
                accept=".zip,application/zip"
                onChange={(e) => parseAnnouncementZip(e.target.files && e.target.files[0])}
                style={{ fontSize: 12.5 }}
              />
              {announceZipParsing && <p className="italic" style={{ fontSize: 12, opacity: .7, marginTop: 6 }}>{es ? 'Leyendo el .zip…' : 'Reading the .zip…'}</p>}
              {announceZipError && <p className="setup-gate-error" style={{ marginTop: 6 }}>{announceZipError}</p>}
              {!announceZipError && announceZipName && announceHtml && (
                <p className="italic" style={{ fontSize: 12, opacity: .7, marginTop: 6 }}>
                  {es
                    ? `${announceZipName} · ${announceImages.length} imagen(es) incrustada(s).`
                    : `${announceZipName} · ${announceImages.length} embedded image(s).`}
                </p>
              )}
            </div>
          )}

          {(announceMode === 'text' ? announceForm.body.trim() : announceHtml) && (
            <div style={{ marginBottom: 10 }}>
              <div className="italic" style={{ fontSize: 12, opacity: .6, marginBottom: 4 }}>{es ? 'Vista previa:' : 'Preview:'}</div>
              <iframe
                title="announcement-preview"
                srcDoc={announcePreviewFull}
                sandbox=""
                style={{ width: '100%', height: 360, border: '1px solid rgba(255,255,255,.15)', borderRadius: 8, background: '#fff' }}
              />
            </div>
          )}

          <button className="btn btn-primary" onClick={sendAnnouncementNow} disabled={announceSending || !announceCanSend}>
            {announceSending ? (es ? 'Enviando…' : 'Sending…') : (es ? 'Enviar novedad' : 'Send update')}
          </button>
          {announceResult && (
            <div className="italic" style={{ fontSize: 12.5, opacity: .85, marginTop: 8 }}>
              {announceResult.error
                ? <span style={{ color: '#e08080' }}>{announceResult.error}</span>
                : (es ? `Enviado a ${announceResult.sent} de ${announceResult.total} suscriptas.` : `Sent to ${announceResult.sent} of ${announceResult.total} subscribers.`)}
            </div>
          )}
        </div>
      </SetupSection>

      {/* ---------- Merchandising: precios ---------- */}
      <SetupSection
        title={es ? 'Merchandising' : 'Merchandise'}
        desc={es
          ? 'Precios de los productos que se muestran en la sección Tienda. Cambian acá, sin tocar código.'
          : "Prices for the products shown on the Shop page. Change them here, no code needed."}
      >
        <div className="setup-merch-list">
          {merchItems.map((item) => (
            <div className="setup-row" key={item.key} style={{ alignItems: 'center', marginBottom: 10 }}>
              <div style={{ flex: 1, fontFamily: 'Cinzel, serif', fontSize: 13, letterSpacing: '0.02em' }}>
                {es ? item.name_es : item.name_en}
              </div>
              <div className="form-field" style={{ maxWidth: 140, marginBottom: 0 }}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={merchPrices[item.key] !== undefined ? merchPrices[item.key] : item.price}
                  onChange={(e) => setMerchPriceDraft(item.key, e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
        <button className="btn btn-primary" onClick={saveMerchPrices} style={{ marginTop: 6 }}>
          {merchSaved ? (es ? 'Guardado ✓' : 'Saved ✓') : (es ? 'Guardar precios' : 'Save prices')}
        </button>
        <p className="setup-hint italic">
          {es
            ? 'Precios en USD (mismo criterio que el resto del sitio). No hay pasarela de pago real todavía — la Tienda muestra el catálogo y pide escribir a hola@luxastral.com para comprar.'
            : "Prices in USD (same convention as the rest of the site). There's no real payment gateway yet — the Shop page shows the catalog and asks people to write to hola@luxastral.com to buy."}
        </p>
      </SetupSection>

      {/* ---------- Envíos: tarifas por zona ---------- */}
      <SetupSection
        title={es ? 'Envíos' : 'Shipping'}
        desc={es
          ? 'Tarifa plana por zona, mostrada en la Tienda. Ajusta acá cuando confirmes precios reales con tu courier.'
          : 'Flat rate per zone, shown on the Shop page. Adjust here once you confirm real rates with your courier.'}
      >
        <div className="setup-merch-list">
          {shippingZonesSetup.map((zone) => (
            <div className="setup-row" key={zone.key} style={{ alignItems: 'center', marginBottom: 10 }}>
              <div style={{ flex: 1, fontFamily: 'Cinzel, serif', fontSize: 13, letterSpacing: '0.02em' }}>
                {es ? zone.name_es : zone.name_en}
              </div>
              <div className="form-field" style={{ maxWidth: 140, marginBottom: 0 }}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={shippingPrices[zone.key] !== undefined ? shippingPrices[zone.key] : zone.price}
                  onChange={(e) => setShippingPriceDraft(zone.key, e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
        <button className="btn btn-primary" onClick={saveShippingPrices} style={{ marginTop: 6 }}>
          {shippingSaved ? (es ? 'Guardado ✓' : 'Saved ✓') : (es ? 'Guardar tarifas' : 'Save rates')}
        </button>
        <p className="setup-hint italic">
          {es
            ? 'Tarifas referenciales — confírmalas con tu courier real antes de anunciarlas a clientes.'
            : 'Reference rates — confirm them with your real courier before announcing them to customers.'}
        </p>
      </SetupSection>

      {/* ---------- API para las lecturas ---------- */}
      <SetupSection
        title={es ? 'API para las lecturas' : 'API for readings'}
        desc={es
          ? 'Proveedor y modelo de IA que interpreta las tiradas y responde en el chat — aplica solo a las usuarias con plan pago (Luna, Estrella, Oráculo). Las usuarias sin plan (Vela) y las lecturas gratis del día usan automáticamente GLM-4.5-Flash (gratis, Z.ai) con respaldo automático en Groq si falla, sin importar lo que elijas acá. Cada proveedor necesita su propia clave configurada del lado del servidor (.env en local, variables de entorno en Netlify).'
          : 'AI provider and model that interprets spreads and replies in chat — applies only to paying members (Luna, Estrella, Oráculo). Free-tier (Vela) users and daily free readings automatically use GLM-4.5-Flash (free, Z.ai) with automatic Groq fallback if it fails, regardless of what you pick here. Each provider needs its own key configured server-side (.env locally, environment variables on Netlify).'}
      >
        <div className="form-field" style={{ maxWidth: 480, marginBottom: 8 }}>
          <label>{es ? 'Proveedor' : 'Provider'}</label>
          <select value={provider} onChange={(e) => saveProvider(e.target.value)}>
            {PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </div>
        <div className="form-field" style={{ maxWidth: 480, marginBottom: 8 }}>
          <label>{es ? 'Modelo' : 'Model'}</label>
          <select value={model} onChange={(e) => saveModel(e.target.value)}>
            {currentProvider.models.map((m) => (
              <option key={m.value} value={m.value}>{es ? m.label_es : m.label_en}</option>
            ))}
          </select>
        </div>
        <p className="setup-hint italic">
          {es
            ? `Este proveedor necesita la variable ${currentProvider.keyEnv} configurada en el servidor. Un modelo más potente da lecturas más ricas pero es más lento y más caro por consulta.`
            : `This provider needs the ${currentProvider.keyEnv} variable configured server-side. A more powerful model gives richer readings but is slower and costs more per request.`}
        </p>
      </SetupSection>

      {/* ---------- Voz (ElevenLabs) ---------- */}
      <SetupSection
        title={es ? 'Voz (ElevenLabs)' : 'Voice (ElevenLabs)'}
        desc={es
          ? 'Permite escuchar las interpretaciones y los mensajes del chat en voz alta, y dictar las preguntas por voz. El texto a voz usa ElevenLabs (necesita ELEVENLABS_API_KEY del lado del servidor); el dictado usa el reconocimiento de voz del propio navegador, sin costo.'
          : "Lets you listen to interpretations and chat messages out loud, and dictate questions by voice. Text-to-speech uses ElevenLabs (needs ELEVENLABS_API_KEY server-side); dictation uses the browser's own speech recognition, at no cost."}
      >
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, cursor: 'pointer' }}>
          <input type="checkbox" checked={voiceEnabled} onChange={(e) => saveVoiceEnabled(e.target.checked)} />
          <span>{es ? 'Activar botón de "Escuchar" en lecturas y chat' : 'Enable "Listen" button in readings and chat'}</span>
        </label>
        <div className="form-field" style={{ maxWidth: 480, marginBottom: 8 }}>
          <label>Voice ID</label>
          <input value={voiceId} onChange={(e) => saveVoiceId(e.target.value)} placeholder="21m00Tcm4TlvDq8ikWAM" disabled={!voiceEnabled} />
        </div>
        <button className="btn btn-ghost" onClick={testVoice} disabled={!voiceEnabled || voiceTestState === 'loading'}>
          {voiceTestState === 'playing' ? `⏹ ${es ? 'Detener' : 'Stop'}` : voiceTestState === 'loading' ? (es ? 'Generando…' : 'Generating…') : `🔊 ${es ? 'Probar voz' : 'Test voice'}`}
        </button>
        {voiceTestState === 'error' && (
          <p className="reveal-followup-error" style={{ marginTop: 10 }}>
            {es
              ? 'No se pudo generar el audio. Revisá que ELEVENLABS_API_KEY esté en el .env (y que reiniciaste el servidor) y que el Voice ID sea válido.'
              : 'Could not generate audio. Check that ELEVENLABS_API_KEY is in .env (and that you restarted the server) and that the Voice ID is valid.'}
          </p>
        )}
        <p className="setup-hint italic">
          {es
            ? 'Para elegir una voz dulce y armoniosa: entrá a elevenlabs.io → Voice Library, buscá una que te guste, copiá su Voice ID y pegalo acá arriba.'
            : 'To pick a sweet, harmonious voice: go to elevenlabs.io → Voice Library, find one you like, copy its Voice ID and paste it above.'}
        </p>
      </SetupSection>

      {/* ---------- Uso de IA y costos ---------- */}
      <SetupSection
        title={es ? 'Uso de IA y costos' : 'AI usage and costs'}
        desc={es
          ? 'Registro de cada consulta a un proveedor de IA (lecturas por tipo, preguntas de seguimiento, boletín diario, y voz de ElevenLabs): tokens (o caracteres) consumidos y costo USD estimado, según la tarifa de cada proveedor configurada abajo.'
          : "Log of every AI provider call (readings by type, follow-up questions, daily newsletter, and ElevenLabs voice): tokens (or characters) consumed and estimated USD cost, using each provider's rate configured below."}
      >
        <div className="setup-row" style={{ marginBottom: 12 }}>
          <button className="btn btn-ghost" onClick={loadAiUsage} disabled={aiUsageLoading}>
            {aiUsageLoading ? (es ? 'Actualizando…' : 'Refreshing…') : (es ? 'Actualizar' : 'Refresh')}
          </button>
          {aiUsage && (
            <span className="italic" style={{ fontSize: 12, opacity: .6, alignSelf: 'center' }}>
              {es
                ? `Hoy: ${fmtUsd(aiUsage.todayCostUsd)} · Este mes: ${fmtUsd(aiUsage.monthCostUsd)} · ${fmtInt(aiUsage.totals.queries)} consultas (últimos 180 días)`
                : `Today: ${fmtUsd(aiUsage.todayCostUsd)} · This month: ${fmtUsd(aiUsage.monthCostUsd)} · ${fmtInt(aiUsage.totals.queries)} queries (last 180 days)`}
            </span>
          )}
        </div>
        {aiUsageError && <p className="setup-gate-error">{aiUsageError}</p>}

        <h4 style={{ fontSize: 13, margin: '4px 0 8px', opacity: .8 }}>{es ? 'Consultas por tipo' : 'Queries by type'}</h4>
        {!aiUsage || Object.keys(aiUsage.byKind).length === 0 ? (
          <p className="setup-empty italic">{es ? 'Todavía no hay consultas registradas.' : 'No queries logged yet.'}</p>
        ) : (
          <table style={{ width: '100%', fontSize: 12.5, borderCollapse: 'collapse', marginBottom: 20 }}>
            <thead>
              <tr style={{ opacity: .6, textAlign: 'left' }}>
                <th style={{ padding: '4px 6px' }}>{es ? 'Tipo' : 'Type'}</th>
                <th style={{ padding: '4px 6px' }}>{es ? 'Consultas' : 'Queries'}</th>
                <th style={{ padding: '4px 6px' }}>Tokens in</th>
                <th style={{ padding: '4px 6px' }}>Tokens out</th>
                <th style={{ padding: '4px 6px' }}>{es ? 'Caracteres' : 'Characters'}</th>
                <th style={{ padding: '4px 6px' }}>{es ? 'Costo' : 'Cost'}</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(aiUsage.byKind).sort((a, b) => aiUsage.byKind[b].costUsd - aiUsage.byKind[a].costUsd).map((k) => {
                const row = aiUsage.byKind[k];
                const label = (AI_USAGE_KIND_LABELS[k] && AI_USAGE_KIND_LABELS[k][es ? 'es' : 'en']) || k;
                return (
                  <tr key={k} style={{ borderTop: '1px solid rgba(255,255,255,.08)' }}>
                    <td style={{ padding: '4px 6px' }}>{label}</td>
                    <td style={{ padding: '4px 6px' }}>{fmtInt(row.queries)}</td>
                    <td style={{ padding: '4px 6px' }}>{fmtInt(row.inputTokens)}</td>
                    <td style={{ padding: '4px 6px' }}>{fmtInt(row.outputTokens)}</td>
                    <td style={{ padding: '4px 6px' }}>{fmtInt(row.characters)}</td>
                    <td style={{ padding: '4px 6px' }}>{fmtUsd(row.costUsd)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <h4 style={{ fontSize: 13, margin: '4px 0 8px', opacity: .8 }}>{es ? 'Modelos usados' : 'Models used'}</h4>
        {!aiUsage || Object.keys(aiUsage.byModel).length === 0 ? (
          <p className="setup-empty italic">{es ? 'Todavía no hay consultas registradas.' : 'No queries logged yet.'}</p>
        ) : (
          <table style={{ width: '100%', fontSize: 12.5, borderCollapse: 'collapse', marginBottom: 20 }}>
            <thead>
              <tr style={{ opacity: .6, textAlign: 'left' }}>
                <th style={{ padding: '4px 6px' }}>{es ? 'Modelo' : 'Model'}</th>
                <th style={{ padding: '4px 6px' }}>{es ? 'Consultas' : 'Queries'}</th>
                <th style={{ padding: '4px 6px' }}>Tokens in</th>
                <th style={{ padding: '4px 6px' }}>Tokens out</th>
                <th style={{ padding: '4px 6px' }}>{es ? 'Costo' : 'Cost'}</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(aiUsage.byModel).sort((a, b) => aiUsage.byModel[b].costUsd - aiUsage.byModel[a].costUsd).map((k) => {
                const row = aiUsage.byModel[k];
                return (
                  <tr key={k} style={{ borderTop: '1px solid rgba(255,255,255,.08)' }}>
                    <td style={{ padding: '4px 6px' }}>{k}</td>
                    <td style={{ padding: '4px 6px' }}>{fmtInt(row.queries)}</td>
                    <td style={{ padding: '4px 6px' }}>{fmtInt(row.inputTokens)}</td>
                    <td style={{ padding: '4px 6px' }}>{fmtInt(row.outputTokens)}</td>
                    <td style={{ padding: '4px 6px' }}>{fmtUsd(row.costUsd)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <h4 style={{ fontSize: 13, margin: '4px 0 8px', opacity: .8 }}>{es ? 'Costo por día (últimos 14 días)' : 'Cost by day (last 14 days)'}</h4>
        {!aiUsage || Object.keys(aiUsage.byDay).length === 0 ? (
          <p className="setup-empty italic">{es ? 'Todavía no hay costos registrados.' : 'No costs logged yet.'}</p>
        ) : (
          <table style={{ width: '100%', fontSize: 12.5, borderCollapse: 'collapse', marginBottom: 20 }}>
            <thead>
              <tr style={{ opacity: .6, textAlign: 'left' }}>
                <th style={{ padding: '4px 6px' }}>{es ? 'Fecha' : 'Date'}</th>
                <th style={{ padding: '4px 6px' }}>{es ? 'Consultas' : 'Queries'}</th>
                <th style={{ padding: '4px 6px' }}>{es ? 'Costo' : 'Cost'}</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(aiUsage.byDay).sort((a, b) => (a < b ? 1 : -1)).slice(0, 14).map((d) => {
                const row = aiUsage.byDay[d];
                return (
                  <tr key={d} style={{ borderTop: '1px solid rgba(255,255,255,.08)' }}>
                    <td style={{ padding: '4px 6px' }}>{d}</td>
                    <td style={{ padding: '4px 6px' }}>{fmtInt(row.queries)}</td>
                    <td style={{ padding: '4px 6px' }}>{fmtUsd(row.costUsd)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <h4 style={{ fontSize: 13, margin: '4px 0 8px', opacity: .8 }}>{es ? 'Costo por mes' : 'Cost by month'}</h4>
        {!aiUsage || Object.keys(aiUsage.byMonth).length === 0 ? (
          <p className="setup-empty italic">{es ? 'Todavía no hay costos registrados.' : 'No costs logged yet.'}</p>
        ) : (
          <table style={{ width: '100%', fontSize: 12.5, borderCollapse: 'collapse', marginBottom: 20 }}>
            <thead>
              <tr style={{ opacity: .6, textAlign: 'left' }}>
                <th style={{ padding: '4px 6px' }}>{es ? 'Mes' : 'Month'}</th>
                <th style={{ padding: '4px 6px' }}>{es ? 'Consultas' : 'Queries'}</th>
                <th style={{ padding: '4px 6px' }}>{es ? 'Costo' : 'Cost'}</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(aiUsage.byMonth).sort((a, b) => (a < b ? 1 : -1)).map((mth) => {
                const row = aiUsage.byMonth[mth];
                return (
                  <tr key={mth} style={{ borderTop: '1px solid rgba(255,255,255,.08)' }}>
                    <td style={{ padding: '4px 6px' }}>{mth}</td>
                    <td style={{ padding: '4px 6px' }}>{fmtInt(row.queries)}</td>
                    <td style={{ padding: '4px 6px' }}>{fmtUsd(row.costUsd)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <h4 style={{ fontSize: 13, margin: '4px 0 8px', opacity: .8 }}>{es ? 'Últimas consultas (detalle)' : 'Recent queries (detail)'}</h4>
        {!aiUsage || aiUsage.recent.length === 0 ? (
          <p className="setup-empty italic">{es ? 'Todavía no hay consultas registradas.' : 'No queries logged yet.'}</p>
        ) : (
          <div style={{ maxHeight: 340, overflowY: 'auto', marginBottom: 20 }}>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ opacity: .6, textAlign: 'left' }}>
                  <th style={{ padding: '4px 6px' }}>{es ? 'Fecha/hora' : 'Date/time'}</th>
                  <th style={{ padding: '4px 6px' }}>{es ? 'Tipo' : 'Type'}</th>
                  <th style={{ padding: '4px 6px' }}>{es ? 'Proveedor / modelo' : 'Provider / model'}</th>
                  <th style={{ padding: '4px 6px' }}>{es ? 'Tokens in → out' : 'Tokens in → out'}</th>
                  <th style={{ padding: '4px 6px' }}>{es ? 'Caracteres' : 'Characters'}</th>
                  <th style={{ padding: '4px 6px' }}>{es ? 'Costo' : 'Cost'}</th>
                </tr>
              </thead>
              <tbody>
                {aiUsage.recent.map((e) => (
                  <tr key={e.id} style={{ borderTop: '1px solid rgba(255,255,255,.08)' }}>
                    <td style={{ padding: '4px 6px' }}>{new Date(e.ts).toLocaleString(es ? 'es-CL' : 'en-US')}</td>
                    <td style={{ padding: '4px 6px' }}>{(AI_USAGE_KIND_LABELS[e.kind] && AI_USAGE_KIND_LABELS[e.kind][es ? 'es' : 'en']) || e.kind}</td>
                    <td style={{ padding: '4px 6px' }}>{(AI_USAGE_PROVIDER_LABELS[e.provider] || e.provider)} / {e.model}</td>
                    <td style={{ padding: '4px 6px' }}>{e.characters ? '—' : `${fmtInt(e.inputTokens)} → ${fmtInt(e.outputTokens)}`}</td>
                    <td style={{ padding: '4px 6px' }}>{e.characters ? fmtInt(e.characters) : '—'}</td>
                    <td style={{ padding: '4px 6px' }}>{fmtUsd(e.costUsd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h4 style={{ fontSize: 13, margin: '4px 0 8px', opacity: .8 }}>{es ? 'Tarifas por proveedor (USD)' : 'Provider rates (USD)'}</h4>
        <p className="setup-hint italic" style={{ marginBottom: 10 }}>
          {es
            ? 'Precios por millón de tokens (input/output), tomados de la tarifa publicada por cada proveedor. Editalos acá si cambian -- se usan para calcular el costo de las consultas nuevas (las ya registradas no se recalculan).'
            : "Prices per million tokens (input/output), taken from each provider's published rate. Edit here if they change -- used to calculate the cost of new queries (already-logged ones are not recalculated)."}
        </p>
        {!aiPricingDraft ? (
          <p className="setup-empty italic">{es ? 'Cargando…' : 'Loading…'}</p>
        ) : (
          <>
            <table style={{ width: '100%', fontSize: 12.5, borderCollapse: 'collapse', marginBottom: 10 }}>
              <thead>
                <tr style={{ opacity: .6, textAlign: 'left' }}>
                  <th style={{ padding: '4px 6px' }}>{es ? 'Modelo' : 'Model'}</th>
                  <th style={{ padding: '4px 6px' }}>{es ? '$ / 1M tokens (in)' : '$ / 1M tokens (in)'}</th>
                  <th style={{ padding: '4px 6px' }}>{es ? '$ / 1M tokens (out)' : '$ / 1M tokens (out)'}</th>
                </tr>
              </thead>
              <tbody>
                {['anthropic', 'openai', 'glm', 'gemini', 'groq'].map((prov) => (
                  Object.keys(aiPricingDraft[prov] || {}).map((mdl) => (
                    <tr key={prov + '/' + mdl} style={{ borderTop: '1px solid rgba(255,255,255,.08)' }}>
                      <td style={{ padding: '4px 6px' }}>{AI_USAGE_PROVIDER_LABELS[prov]} — {mdl}</td>
                      <td style={{ padding: '4px 6px' }}>
                        <input type="number" step="0.01" min="0" style={{ width: 90 }}
                          value={aiPricingDraft[prov][mdl].in}
                          onChange={(e) => setAiPricingDraft((prev) => ({ ...prev, [prov]: { ...prev[prov], [mdl]: { ...prev[prov][mdl], in: Number(e.target.value) } } }))} />
                      </td>
                      <td style={{ padding: '4px 6px' }}>
                        <input type="number" step="0.01" min="0" style={{ width: 90 }}
                          value={aiPricingDraft[prov][mdl].out}
                          onChange={(e) => setAiPricingDraft((prev) => ({ ...prev, [prov]: { ...prev[prov], [mdl]: { ...prev[prov][mdl], out: Number(e.target.value) } } }))} />
                      </td>
                    </tr>
                  ))
                ))}
                {aiPricingDraft.elevenlabs && (
                  <tr style={{ borderTop: '1px solid rgba(255,255,255,.08)' }}>
                    <td style={{ padding: '4px 6px' }}>ElevenLabs — {es ? '$ / 1000 caracteres' : '$ / 1000 characters'}</td>
                    <td style={{ padding: '4px 6px' }} colSpan={2}>
                      <input type="number" step="0.001" min="0" style={{ width: 90 }}
                        value={Number((aiPricingDraft.elevenlabs.perCharUsd * 1000).toFixed(4))}
                        onChange={(e) => setAiPricingDraft((prev) => ({ ...prev, elevenlabs: { perCharUsd: Number(e.target.value) / 1000 } }))} />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <button className="btn btn-ghost" onClick={saveAiPricing} disabled={aiPricingSaving}>
              {aiPricingSaving ? (es ? 'Guardando…' : 'Saving…') : aiPricingSaved ? (es ? '✓ Guardado' : '✓ Saved') : (es ? 'Guardar tarifas' : 'Save rates')}
            </button>
          </>
        )}
      </SetupSection>

      {/* ---------- Tipo de respuesta ---------- */}
      <SetupSection
        title={es ? 'Tipo de respuesta' : 'Response type'}
        desc={es
          ? 'Ya no aplica a las lecturas de las clientas — desde que existen los planes (Vela/Luna/Estrella/Oráculo), el tipo de respuesta lo decide el backend automáticamente según el plan del email de quien consulta. Este control ya no afecta nada del sitio publicado, queda solo de referencia.'
          : "No longer applies to customer readings — now that plans exist (Vela/Luna/Estrella/Oráculo), the response type is decided automatically by the backend based on the querent's plan. This control no longer affects anything on the live site — kept for reference only."}
      >
        <div className="setup-response-types">
          {RESPONSE_TYPES.map((rt) => (
            <label key={rt.value} className={`setup-response-type ${responseType === rt.value ? 'is-selected' : ''}`}>
              <input
                type="radio"
                name="response-type"
                value={rt.value}
                checked={responseType === rt.value}
                onChange={() => saveResponseType(rt.value)}
              />
              <div>
                <div className="setup-response-type-label">{es ? rt.label_es : rt.label_en}</div>
                <div className="setup-response-type-desc">{es ? rt.desc_es : rt.desc_en}</div>
              </div>
            </label>
          ))}
        </div>
        <p className="setup-hint italic">
          {es
            ? 'Los tipos 4 y 5 usan más tokens (y por lo tanto cuestan un poco más por lectura). El tipo 5 necesita que la librería de PDF cargue bien en el navegador para el botón de descarga.'
            : 'Types 4 and 5 use more tokens (so they cost a bit more per reading). Type 5 needs the PDF library to load correctly in the browser for the download button.'}
        </p>
      </SetupSection>

      {/* ---------- Aspectos visuales ---------- */}
      <SetupSection
        title={es ? 'Aspectos visuales' : 'Visual style'}
        desc={es
          ? 'La variante de diseño usada en cada sección de la app.'
          : 'The design variant used in each section of the app.'}
      >
        <div className="setup-visual-grid">
          <VisualPicker
            label={es ? 'Biblioteca' : 'Library'}
            value={variants?.library}
            onChange={(v) => setVariant && setVariant('library', v)}
            options={[
              { value: 'flow', label: es ? 'Fluido' : 'Flow' },
              { value: 'dense', label: es ? 'Denso' : 'Dense' },
              { value: 'editorial', label: 'Editorial' },
            ]}
          />
          <VisualPicker
            label={es ? 'Chat con tarotista' : 'Chat'}
            value={variants?.chat}
            onChange={(v) => setVariant && setVariant('chat', v)}
            options={[
              { value: 'classic', label: es ? 'Clásico' : 'Classic' },
              { value: 'paper', label: es ? 'Pergamino' : 'Paper' },
              { value: 'minimal', label: es ? 'Mínimo' : 'Minimal' },
            ]}
          />
          <VisualPicker
            label={es ? 'Videollamada' : 'Video call'}
            value={variants?.videocall}
            onChange={(v) => setVariant && setVariant('videocall', v)}
            options={[
              { value: 'focus', label: es ? 'Retrato' : 'Focus' },
              { value: 'split', label: 'Split' },
              { value: 'ritual', label: es ? 'Ritual' : 'Ritual' },
            ]}
          />
        </div>
      </SetupSection>

      {/* ---------- Respaldo de datos ---------- */}
      <SetupSection
        title={es ? 'Respaldo de datos' : 'Data backup'}
        desc={es
          ? 'Todo lo que la app guarda vive en este navegador (no hay base de datos). Exportalo antes de borrar historial de navegación o cambiar de equipo.'
          : "Everything the app saves lives in this browser (there's no database). Export it before clearing browsing data or switching computers."}
      >
        <div className="setup-row">
          <button className="btn btn-ghost" onClick={exportData}>⇩ {es ? 'Exportar datos' : 'Export data'}</button>
          <button className="btn btn-ghost setup-danger" onClick={resetAll}>{es ? 'Restablecer todo' : 'Reset everything'}</button>
        </div>
      </SetupSection>

      {/* ---------- Próximamente ---------- */}
      <SetupSection
        title={es ? 'Próximamente' : 'Coming soon'}
        desc={es ? 'Ideas para siguientes vueltas de este panel.' : 'Ideas for the next passes on this panel.'}
      >
        <ul className="setup-soon-list">
          <li>{es ? 'Registro de actividad — quién cambió qué y cuándo.' : 'Activity log — who changed what and when.'}</li>
          <li>{es ? 'Notificaciones por correo (nuevas lecturas, pagos, códigos usados).' : 'Email notifications (new readings, payments, codes used).'}</li>
          <li>{es ? 'Edición de planes y precios desde acá, sin tocar código.' : 'Edit plans and pricing here, without touching code.'}</li>
          <li>{es ? 'Moderación de mensajes del chat en vivo.' : 'Moderation of live chat messages.'}</li>
        </ul>
      </SetupSection>

      <style>{`
        .setup-page { max-width: 900px; }
        .setup-head { margin-bottom: 28px; }
        .setup-sub { font-size: 18px; color: var(--ink-soft); margin-top: 10px; max-width: 640px; }
        .setup-warning {
          display: flex; gap: 14px; align-items: flex-start;
          background: rgba(212, 168, 90, 0.08);
          border: 1px solid rgba(212, 168, 90, 0.35);
          border-radius: 12px;
          padding: 18px 20px;
          margin-bottom: 40px;
        }
        .setup-warning-icon { font-size: 20px; color: var(--gold); line-height: 1.4; }
        .setup-warning strong {
          font-family: 'Cinzel', serif; font-size: 12px; letter-spacing: 0.1em;
          text-transform: uppercase; color: var(--gold);
        }
        .setup-warning p { margin-top: 6px; color: var(--ink-soft); font-size: 15px; line-height: 1.5; }

        .setup-section {
          background: rgba(26, 20, 56, 0.35);
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 28px 28px 30px;
          margin-bottom: 24px;
        }
        .setup-section-head { margin-bottom: 18px; }
        .setup-section-title {
          font-family: 'Cinzel', serif; font-size: 20px; font-weight: 500;
          letter-spacing: 0.02em; color: var(--ink);
        }
        .setup-section-desc { color: var(--ink-soft); font-size: 15px; margin-top: 6px; max-width: 620px; }

        .setup-row { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; }
        .setup-hint { color: var(--ink-soft); font-size: 14px; margin-top: 12px; }

        .setup-response-types { display: flex; flex-direction: column; gap: 10px; }
        .setup-response-type {
          display: flex; align-items: flex-start; gap: 12px;
          padding: 14px 16px; border: 1px solid var(--line); border-radius: 12px;
          cursor: pointer; transition: all 0.2s;
        }
        .setup-response-type:hover { border-color: var(--gold); }
        .setup-response-type.is-selected { border-color: var(--gold); background: rgba(212, 168, 90, 0.06); }
        .setup-response-type input[type="radio"] { margin-top: 4px; accent-color: var(--gold); }
        .setup-response-type-label { font-family: 'Cinzel', serif; font-size: 14px; color: var(--ink); margin-bottom: 4px; }
        .setup-response-type-desc { color: var(--ink-soft); font-size: 14px; line-height: 1.5; }
        .setup-empty { color: var(--ink-soft); font-size: 15px; }

        .setup-list { list-style: none; margin-top: 16px; display: flex; flex-direction: column; gap: 8px; }
        .setup-list li {
          display: flex; align-items: center; justify-content: space-between;
          background: rgba(15, 10, 36, 0.4);
          border: 1px solid var(--line);
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 15px;
        }
        .setup-remove {
          background: none; border: none; color: var(--ink-soft);
          cursor: pointer; font-size: 14px; padding: 4px 8px; border-radius: 6px;
          transition: color 0.15s, background 0.15s;
        }
        .setup-remove:hover { color: #e08a8a; background: rgba(224, 138, 138, 0.1); }

        .setup-tarotist-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 22px; }
        .setup-tarotist-row {
          display: flex; align-items: center; gap: 14px;
          background: rgba(15, 10, 36, 0.4);
          border: 1px solid var(--line);
          border-radius: 10px;
          padding: 12px 16px;
        }
        .setup-tarotist-row.is-builtin { border-color: rgba(212, 168, 90, 0.35); }
        .setup-slot-chip {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(212, 168, 90, 0.08);
          border: 1px solid var(--line);
          border-radius: 20px;
          padding: 4px 10px;
          font-size: 12px;
          color: var(--ink-soft);
        }
        .setup-slot-chip button {
          background: none; border: none; color: var(--ink-mute); cursor: pointer; font-size: 11px; padding: 0;
        }
        .setup-slot-chip button:hover { color: #e08a8a; }
        .setup-tarotist-swatch {
          width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Cinzel', serif; font-size: 14px; color: #1a1438;
        }
        .setup-tarotist-info { flex: 1; }
        .setup-tarotist-name { font-family: 'Cinzel', serif; font-size: 15px; letter-spacing: 0.02em; }
        .setup-tarotist-spec { font-size: 13px; color: var(--ink-soft); margin-top: 2px; }
        .setup-tag {
          font-family: 'Cinzel', serif; font-size: 10px; letter-spacing: 0.14em;
          text-transform: uppercase; color: var(--gold);
          border: 1px solid rgba(212, 168, 90, 0.4);
          border-radius: 999px; padding: 4px 10px;
        }
        .setup-tarotist-form {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 14px;
          padding-top: 18px;
          border-top: 1px dashed var(--line);
        }

        .setup-visual-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
        }
        .setup-visual-card {
          background: rgba(15, 10, 36, 0.4);
          border: 1px solid var(--line);
          border-radius: 10px;
          padding: 16px;
        }
        .setup-visual-label {
          font-family: 'Cinzel', serif; font-size: 11px; letter-spacing: 0.16em;
          text-transform: uppercase; color: var(--ink-soft); margin-bottom: 10px;
        }
        .setup-visual-options { display: flex; gap: 8px; flex-wrap: wrap; }
        .setup-visual-opt {
          background: transparent; border: 1px solid var(--line); border-radius: 8px;
          padding: 8px 12px; font-size: 13px; color: var(--ink); cursor: pointer;
          transition: border-color 0.15s, color 0.15s, background 0.15s;
        }
        .setup-visual-opt:hover { border-color: var(--gold); }
        .setup-visual-opt.is-active { background: var(--gold); border-color: var(--gold); color: var(--bg); }

        .setup-danger:hover { border-color: #e08a8a; color: #e08a8a; }

        .setup-soon-list { list-style: none; display: flex; flex-direction: column; gap: 10px; }
        .setup-soon-list li {
          font-size: 15px; color: var(--ink-soft); padding-left: 20px; position: relative;
        }
        .setup-soon-list li::before {
          content: '✦'; position: absolute; left: 0; color: var(--gold); opacity: 0.6; font-size: 12px;
        }
      `}</style>
    </div>
  );
}

function SetupSection({ title, desc, children }) {
  return (
    <section className="setup-section">
      <div className="setup-section-head">
        <h2 className="setup-section-title">{title}</h2>
        {desc && <p className="setup-section-desc">{desc}</p>}
      </div>
      <div className="setup-section-body">{children}</div>
    </section>
  );
}

function VisualPicker({ label, value, onChange, options }) {
  return (
    <div className="setup-visual-card">
      <div className="setup-visual-label">{label}</div>
      <div className="setup-visual-options">
        {options.map((o) => (
          <button
            key={o.value}
            className={`setup-visual-opt ${value === o.value ? 'is-active' : ''}`}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

window.SetupPage = SetupPage;
