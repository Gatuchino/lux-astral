// Arcana Tarot — App root
// Variant context — read by pages, driven by the Tweaks panel.
window.ArcanaVariantsCtx = window.ArcanaVariantsCtx || React.createContext({
  library: 'flow', chat: 'classic', videocall: 'focus',
});

const ARCANA_VARIANT_DEFAULTS = /*EDITMODE-BEGIN*/{
  "library": "flow",
  "chat": "paper",
  "videocall": "split"
}/*EDITMODE-END*/;

function App() {
  const {
    Nav, Starfield,
    HomePage, ReadingsPage, ReadingPage, LibraryPage,
    ChartPage, MoonPage, MarketplacePage, PhilosophyPage,
    ProfilePage, PricingPage, OnboardingPage,
    ChatPage, VideoCallPage, AboutPage, SetupPage, MyBookingsPage, WelcomePage,
    TweaksPanel, TweakSection, TweakRadio, useTweaks,
  } = window;
  const [lang, setLangState] = React.useState(() => localStorage.getItem('vela_lang') || 'es');

  // Variants — plain React state as fallback source of truth.
  // If useTweaks starter loaded, we use it for persistence. Otherwise plain state.
  const [variants, _setVariants] = React.useState(ARCANA_VARIANT_DEFAULTS);
  const setVariant = React.useCallback((keyOrEdits, val) => {
    const edits = typeof keyOrEdits === 'object' && keyOrEdits !== null
      ? keyOrEdits : { [keyOrEdits]: val };
    _setVariants((prev) => ({ ...prev, ...edits }));
    // Persist via host if available
    try { window.parent.postMessage({ type: '__edit_mode_set_keys', edits }, '*'); } catch {}
  }, []);

  // 2026-09-09: el punto de entrada ya no depende de un "onboarding"
  // local -- la cuenta real (signup/login, ver el portón más abajo) es
  // ahora lo primero que ve cualquier visitante. Una vez autenticada,
  // entra directo a "home".
  const [route, setRouteState] = React.useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const activateToken = params.get('activate');
      if (activateToken) {
        // Limpiamos el query string para que un refresh no vuelva a
        // disparar la activación (es inofensivo si pasa, pero prolijo).
        try { window.history.replaceState({}, '', window.location.pathname); } catch {}
        return { page: 'welcome', token: activateToken };
      }
    } catch {}
    try {
      const saved = JSON.parse(localStorage.getItem('vela_route') || 'null');
      if (saved) return saved;
    } catch {}
    return { page: 'home' };
  });
  // Perfil local del visitante (nombre, género, email, foto) — ya no
  // depende de ningún login: se completa en Onboarding y se puede editar
  // en cualquier momento desde Perfil.
  const [profile, setProfileState] = React.useState(() => window.getArcanaProfile());
  // 2026-09-09 (a pedido de Christian): cuentas reales obligatorias desde
  // el primer ingreso -- ver AuthModal.jsx y netlify/functions/booking.mts
  // (acciones signup/login/whoami). Antes cualquiera podía escribir
  // cualquier email en un campo de texto y el backend se lo creía; ahora
  // antes de mostrar nada validamos el token guardado contra el servidor
  // (mismo patrón que ya usaba Setup.jsx para su propia sesión de admin).
  const [authChecked, setAuthChecked] = React.useState(false);
  React.useEffect(() => {
    if (!profile.token) { setAuthChecked(true); return; }
    let cancelled = false;
    window.arcanaWhoAmI()
      .then((res) => {
        if (cancelled) return;
        setProfileState(res && res.ok ? window.saveArcanaSession(res) : window.clearArcanaProfile());
        setAuthChecked(true);
      })
      .catch(() => {
        if (cancelled) return;
        setProfileState(window.clearArcanaProfile());
        setAuthChecked(true);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const updateProfile = (patch) => {
    const next = window.saveArcanaProfile(patch);
    setProfileState(next);
    if (next.token) {
      window.arcanaUpdateAccount(patch).catch((e) => console.error('[Arcana] no se pudo guardar el perfil en el servidor', e));
    }
    return next;
  };
  // Cerrar sesión: limpia el perfil local (nombre, email, foto, género) y
  // vuelve a Onboarding, como si fuera una visitante nueva. Las lecturas
  // ya guardadas en el servidor no se tocan -- vuelven a aparecer si carga
  // el mismo email de nuevo.
  const signOut = () => {
    window.arcanaLogout().catch(() => {});
    setProfileState(window.clearArcanaProfile());
    setReadings([]);
    setPlanInfo(null);
    setRoute({ page: 'home' });
  };
  const [readings, setReadings] = React.useState([]);
  // Estado del plan (suscriptora o no, y qué plan) — se resuelve una sola
  // vez acá arriba a partir del email del perfil, y se comparte con
  // ReadingPage (guardado automático del historial, solo para pago) y
  // ProfilePage (insignia de plan, Cofre de Respuestas Estrella/Oráculo).
  // Antes ProfilePage lo pedía por su cuenta con su propio efecto —
  // unificado acá para no repetir el llamado.
  const [planInfo, setPlanInfo] = React.useState(null);
  React.useEffect(() => {
    if (!profile.token) { setPlanInfo(null); return; }
    let cancelled = false;
    window.arcanaSubscriberStatus()
      .then((res) => { if (!cancelled) setPlanInfo(res); })
      .catch(() => { if (!cancelled) setPlanInfo(null); });
    return () => { cancelled = true; };
  }, [profile.token]);

  // 2026-09-08 (a pedido de Christian): el ícono ⚙ de Configuración ahora
  // solo se muestra si el email del perfil actual está en la lista de
  // power users del servidor — nadie más lo ve. Entrar igual pide
  // contraseña (ver Setup.jsx); esto solo controla si el botón aparece.
  const [isPowerUser, setIsPowerUser] = React.useState(false);
  React.useEffect(() => {
    if (!profile.token) { setIsPowerUser(false); return; }
    let cancelled = false;
    window.arcanaPowerUserStatus()
      .then((res) => { if (!cancelled) setIsPowerUser(!!(res && res.isPowerUser)); })
      .catch(() => { if (!cancelled) setIsPowerUser(false); });
    return () => { cancelled = true; };
  }, [profile.token]);

  // Registro liviano de accesos y secciones visitadas para el panel de
  // Informes (nunca el contenido de una lectura ni las preguntas — eso
  // sigue siendo confidencial de cada usuaria). Se dispara con cada
  // cambio de página; si falla no interrumpe nada.
  React.useEffect(() => {
    window.arcanaLogEvent(route.page).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.page]);

  // Historial de lecturas + Cofre de Respuestas (2026-09-08, auditoría):
  // antes vivían solo en localStorage — se perdían al cambiar de
  // dispositivo pese a ser un beneficio pago, y sin ningún filtro por
  // email se mezclaban si dos perfiles usaban el mismo navegador. Ahora
  // quedan en el servidor, atadas al email — solo tiene sentido pedirlas
  // para socias de pago (gratis nunca tuvo nada guardado). La primera vez
  // que vemos a una socia de pago con lecturas viejas en localStorage (de
  // antes de este cambio) las subimos una sola vez.
  const isSubscriber = !!(planInfo && planInfo.isSubscriber);
  React.useEffect(() => {
    if (!profile.token || !isSubscriber) { setReadings([]); return undefined; }
    let cancelled = false;
    window.arcanaListReadings()
      .then((res) => {
        if (cancelled) return;
        if (!res.migrated) {
          let local = [];
          try { local = JSON.parse(localStorage.getItem('vela_readings') || '[]'); } catch { /* nada que migrar */ }
          if (local.length) {
            window.arcanaImportReadings(local)
              .then((res2) => { if (!cancelled) setReadings(res2.readings || []); })
              .catch(() => { if (!cancelled) setReadings(res.readings || []); });
            return;
          }
        }
        setReadings(res.readings || []);
      })
      .catch(() => { if (!cancelled) setReadings([]); });
    return () => { cancelled = true; };
  }, [profile.token, isSubscriber]);

  const setLang = (l) => {
    setLangState(l);
    localStorage.setItem('vela_lang', l);
  };
  const setRoute = (r) => {
    setRouteState(r);
    localStorage.setItem('vela_route', JSON.stringify(r));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const saveReading = (reading) => {
    setReadings((prev) => [...prev, reading]);
    if (profile.token) {
      window.arcanaSaveReading(reading).catch((e) => console.error('[Arcana] no se pudo guardar la lectura en el servidor', e));
    }
  };
  // Eliminar una lectura del historial (acción individual desde Perfil).
  const deleteReading = (id) => {
    setReadings((prev) => prev.filter((r) => r.id !== id));
    if (profile.token) {
      window.arcanaDeleteReading(id).catch((e) => console.error('[Arcana] no se pudo borrar la lectura en el servidor', e));
    }
  };
  // Actualizar campos de una lectura guardada: se usa para archivarla bajo
  // un tema (tag), sacarla del cajón (tag: null), marcarla/desmarcarla como
  // especial en el Cofre de Respuestas (special/specialLabel), y para que
  // "Volver a preguntar" pueda ir sumando nuevas preguntas de seguimiento
  // a esa misma lectura guardada en vez de crear una nueva.
  const updateReading = (id, patch) => {
    setReadings((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    if (profile.token) {
      window.arcanaUpdateReading(id, patch).catch((e) => console.error('[Arcana] no se pudo actualizar la lectura en el servidor', e));
    }
  };
  // Daily card — deterministic per day
  const dailyCard = React.useMemo(() => {
    const today = new Date();
    const key = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
    let hash = 0;
    for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
    const idx = Math.abs(hash) % window.TAROT_CARDS.major.length;
    return window.TAROT_CARDS.major[idx];
  }, []);

  // 2026-09-09: portón de entrada obligatorio -- nadie ve ninguna página
  // (ni siquiera Home) sin una cuenta real vigente. Mientras se valida el
  // token guardado no se muestra nada más que el fondo animado, para
  // evitar el parpadeo de "Home" antes de caer al login.
  if (!authChecked) {
    return (
      <window.ArcanaVariantsCtx.Provider value={variants}>
        <Starfield />
      </window.ArcanaVariantsCtx.Provider>
    );
  }
  if (!profile.loggedIn) {
    return (
      <window.ArcanaVariantsCtx.Provider value={variants}>
        <Starfield />
        <window.AuthModal
          lang={lang}
          dismissible={false}
          onClose={() => {}}
          onAuth={(p) => { setProfileState(p); setRoute({ page: 'home' }); }}
        />
      </window.ArcanaVariantsCtx.Provider>
    );
  }

  // Fullscreen routes: skip Nav for immersive flows
  const fullscreenRoutes = ['onboarding', 'chat', 'videocall', 'welcome'];
  const isFullscreen = fullscreenRoutes.includes(route.page);

  // Route rendering
  let page;
  switch (route.page) {
    case 'home':        page = <HomePage lang={lang} setRoute={setRoute} dailyCard={dailyCard} />; break;
    case 'readings':    page = <ReadingsPage lang={lang} setRoute={setRoute} />; break;
    case 'reading':     page = <ReadingPage lang={lang} setRoute={setRoute} spread={route.spread || 'three'} saveReading={saveReading} planInfo={planInfo} profile={profile} updateReading={updateReading} resumeReading={route.resumeReading || null} />; break;
    case 'library':     page = <LibraryPage lang={lang} />; break;
    case 'chart':       page = <ChartPage lang={lang} />; break;
    case 'moon':        page = <MoonPage lang={lang} />; break;
    case 'marketplace': page = <MarketplacePage lang={lang} setRoute={setRoute} profile={profile} />; break;
    case 'philosophy':  page = <PhilosophyPage lang={lang} />; break;
    case 'about':       page = <AboutPage lang={lang} setRoute={setRoute} />; break;
    case 'merch':        page = <MerchPage lang={lang} setRoute={setRoute} />; break;
    case 'profile':     page = <ProfilePage lang={lang} profile={profile} updateProfile={updateProfile} readings={readings} setRoute={setRoute} planInfo={planInfo} deleteReading={deleteReading} updateReading={updateReading} onSignOut={signOut} />; break;
    case 'pricing':     page = <PricingPage lang={lang} setRoute={setRoute} profile={profile} />; break;
    case 'onboarding':  page = <OnboardingPage lang={lang} setRoute={setRoute} />; break;
    case 'chat':        page = <ChatPage lang={lang} setRoute={setRoute} tarotistId={route.tarotistId} />; break;
    case 'videocall':   page = <VideoCallPage lang={lang} setRoute={setRoute} accessCode={route.accessCode} />; break;
    case 'mybookings':  page = <MyBookingsPage lang={lang} setRoute={setRoute} />; break;
    case 'setup':        page = <SetupPage lang={lang} setRoute={setRoute} variants={variants} setVariant={setVariant} profile={profile} isPowerUser={isPowerUser} />; break;
    case 'welcome':     page = <WelcomePage lang={lang} setRoute={setRoute} token={route.token} email={route.email} planKey={route.planKey} source={route.source} />; break;
    default:            page = <HomePage lang={lang} setRoute={setRoute} dailyCard={dailyCard} />;
  }

  // Tweaks panel — only shows when the host's Tweaks toggle is active.
  const tweaksUI = (TweaksPanel && TweakSection && TweakRadio) ? (
    <TweaksPanel title="Arcana — Variantes">
      <TweakSection label={lang === 'es' ? 'Biblioteca' : 'Library'}>
        <TweakRadio
          label={lang === 'es' ? 'Estilo de rejilla' : 'Grid style'}
          value={variants.library}
          options={[
            { value: 'flow',      label: lang === 'es' ? 'Fluido'    : 'Flow' },
            { value: 'dense',     label: lang === 'es' ? 'Denso'     : 'Dense' },
            { value: 'editorial', label: lang === 'es' ? 'Editorial' : 'Editorial' },
          ]}
          onChange={(v) => setVariant('library', v)}
        />
      </TweakSection>
      <TweakSection label={lang === 'es' ? 'Chat con tarotista' : 'Chat'}>
        <TweakRadio
          label={lang === 'es' ? 'Burbujas' : 'Bubbles'}
          value={variants.chat}
          options={[
            { value: 'classic', label: lang === 'es' ? 'Clásico' : 'Classic' },
            { value: 'paper',   label: lang === 'es' ? 'Pergamino' : 'Paper' },
            { value: 'minimal', label: lang === 'es' ? 'Mínimo'  : 'Minimal' },
          ]}
          onChange={(v) => setVariant('chat', v)}
        />
      </TweakSection>
      <TweakSection label={lang === 'es' ? 'Videollamada' : 'Video call'}>
        <TweakRadio
          label={lang === 'es' ? 'Composición' : 'Composition'}
          value={variants.videocall}
          options={[
            { value: 'focus',  label: lang === 'es' ? 'Retrato' : 'Focus' },
            { value: 'split',  label: lang === 'es' ? 'Split'    : 'Split' },
            { value: 'ritual', label: lang === 'es' ? 'Ritual'   : 'Ritual' },
          ]}
          onChange={(v) => setVariant('videocall', v)}
        />
      </TweakSection>
    </TweaksPanel>
  ) : null;

  // Expose variants globally so pages can read them.
  window.__arcanaVariants = variants;

  return (
    <window.ArcanaVariantsCtx.Provider value={variants}>
      <Starfield />
      {!isFullscreen && (
        <Nav
          route={route}
          setRoute={setRoute}
          lang={lang}
          setLang={setLang}
          profile={profile}
          isPowerUser={isPowerUser}
        />
      )}
      <main key={route.page + (route.spread || '') + (route.tarotistId || '')}>
        {page}
      </main>
      {tweaksUI}
    </window.ArcanaVariantsCtx.Provider>
  );
}

window.App = App;
