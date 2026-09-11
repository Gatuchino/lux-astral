// Dashboard unificado -- idea #6 de la auditoría de producto (a pedido de
// Christian): un panel personal que junta luna, carta del día, próximas
// sesiones y el patrón de "Tu evolución" en una sola pantalla, SIN costo
// de IA (fase lunar y carta del día ya son cálculo puro/determinístico,
// "Tu evolución" es un conteo sobre datos que el perfil ya trae, y las
// próximas sesiones son un fetch plano de datos, no una llamada al LLM).
// Distinto -- y sin tocar -- la idea pendiente del informe combinado
// Tarot+Carta-Astral por IA, que sigue esperando una estimación de costo
// de tokens antes de arrancar.
function DashboardPage({ lang, setRoute, profile, planInfo, readings, dailyCard, requireAuth }) {
  const { TarotCard } = window;
  const t = window.I18N[lang];
  const es = lang === 'es';

  // Panel personal -> exige sesión, igual que Perfil/Carta Astral.
  React.useEffect(() => {
    if (!profile || !profile.loggedIn) {
      requireAuth && requireAuth(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile && profile.loggedIn]);

  const now = new Date();
  const moon = getExactMoonPhase(now);
  const phases_es = ['Luna nueva', 'Cuarto creciente', 'Luna llena', 'Cuarto menguante'];
  const phases_en = ['New moon', 'Waxing moon', 'Full moon', 'Waning moon'];
  const currentPhaseName = es ? phases_es[moonPhaseBucket(moon.angle)] : phases_en[moonPhaseBucket(moon.angle)];

  const [bookings, setBookings] = React.useState({ status: 'idle', list: [] });
  React.useEffect(() => {
    if (!profile || !profile.email) return;
    let cancelled = false;
    setBookings({ status: 'pending', list: [] });
    window.arcanaMyBookings(profile.email)
      .then((data) => {
        if (cancelled) return;
        const nowMs = Date.now();
        const upcoming = (data.bookings || [])
          .filter((b) => b.when && new Date(b.when).getTime() > nowMs - 60 * 60 * 1000)
          .sort((a, b) => new Date(a.when) - new Date(b.when));
        setBookings({ status: 'ok', list: upcoming });
      })
      .catch(() => { if (!cancelled) setBookings({ status: 'error', list: [] }); });
    return () => { cancelled = true; };
  }, [profile && profile.email]);
  const nextBooking = bookings.list[0] || null;

  const evoFreq = React.useMemo(() => computeCardFrequency(readings), [readings]);
  const evoTop = React.useMemo(() => {
    const ranked = Array.from(evoFreq.entries())
      .map(([id, data]) => ({ id, ...data, card: window.TAROT_CARDS.all.find((c) => c.id === id) }))
      .filter((x) => x.card && x.count > 1)
      .sort((a, b) => b.count - a.count);
    return ranked[0] || null;
  }, [evoFreq]);

  if (!profile || !profile.loggedIn) {
    return (
      <div className="page dashboard-page dashboard-gate">
        <p className="italic">{es ? 'Iniciá sesión para ver tu panel personal.' : 'Sign in to see your personal dashboard.'}</p>
      </div>
    );
  }

  return (
    <div className="page dashboard-page">
      <div className="page-head">
        <div className="eyebrow">— {es ? 'Tu panel' : 'Your dashboard'} —</div>
        <h1 className="page-title">
          {es ? `Hola, ${profile.name || ''}` : `Hi, ${profile.name || ''}`}
        </h1>
        <p className="page-sub italic">
          {now.toLocaleDateString(es ? 'es-CL' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      <div className="dash-grid">
        {/* Luna */}
        <div className="dash-card">
          <div className="dash-card-h">🌙 {es ? 'Luna hoy' : 'Moon today'}</div>
          <div className="dash-card-big">{Math.round(moon.k * 100)}%</div>
          <div className="dash-card-sub">{currentPhaseName}</div>
          <button className="dash-card-link" onClick={() => setRoute({ page: 'moon' })}>
            {es ? 'Ver más →' : 'See more →'}
          </button>
        </div>

        {/* Carta del día */}
        <div className="dash-card">
          <div className="dash-card-h">🃏 {es ? 'Carta del día' : 'Card of the day'}</div>
          <div className="dash-card-daily">
            <div className="dash-card-daily-art"><TarotCard card={dailyCard} lang={lang} revealed={true} compact={true} /></div>
            <div>
              <div className="dash-card-sub" style={{ marginBottom: 4 }}>
                {es ? dailyCard.name_es : dailyCard.name_en}
              </div>
              <div className="dash-card-mini italic">"{(es ? dailyCard.upright_es : dailyCard.upright_en)}"</div>
            </div>
          </div>
          <button className="dash-card-link" onClick={() => setRoute({ page: 'quickcard' })}>
            {es ? 'Sacar otra carta →' : 'Draw another →'}
          </button>
        </div>

        {/* Próxima sesión */}
        <div className="dash-card">
          <div className="dash-card-h">🕯️ {es ? 'Próxima sesión' : 'Next session'}</div>
          {bookings.status === 'pending' ? (
            <div className="dash-card-mini italic">{es ? 'Cargando…' : 'Loading…'}</div>
          ) : nextBooking ? (
            <>
              <div className="dash-card-sub">{nextBooking.tarotistName}</div>
              <div className="dash-card-mini">
                {new Date(nextBooking.when).toLocaleString(es ? 'es-CL' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </div>
            </>
          ) : (
            <div className="dash-card-mini italic">
              {es ? 'No tenés sesiones reservadas todavía.' : "You don't have any sessions booked yet."}
            </div>
          )}
          <button className="dash-card-link" onClick={() => setRoute({ page: 'marketplace' })}>
            {nextBooking ? (es ? 'Ver todas →' : 'See all →') : (es ? 'Reservar una →' : 'Book one →')}
          </button>
        </div>

        {/* Tu evolución */}
        <div className="dash-card">
          <div className="dash-card-h">📈 {es ? 'Tu evolución' : 'Your evolution'}</div>
          {evoTop ? (
            <>
              <div className="dash-card-sub">{es ? evoTop.card.name_es : evoTop.card.name_en}</div>
              <div className="dash-card-mini">
                {es ? `Apareció ${evoTop.count} veces en tus lecturas guardadas.` : `Came up ${evoTop.count} times in your saved readings.`}
              </div>
            </>
          ) : (
            <div className="dash-card-mini italic">
              {es ? 'Todavía no hay un patrón -- seguí guardando lecturas.' : "No pattern yet -- keep saving readings."}
            </div>
          )}
          <button className="dash-card-link" onClick={() => setRoute({ page: 'profile' })}>
            {es ? 'Ver en tu perfil →' : 'See in your profile →'}
          </button>
        </div>
      </div>

      <div className="dash-quick">
        <div className="eyebrow" style={{ marginBottom: 16 }}>— {es ? 'Accesos rápidos' : 'Quick actions'} —</div>
        <div className="dash-quick-row">
          <button className="btn btn-primary" onClick={() => setRoute({ page: 'readings' })}>{es ? 'Comenzar una lectura' : 'Begin a reading'} ✦</button>
          <button className="btn btn-ghost" onClick={() => setRoute({ page: 'chart' })}>{es ? 'Mi Carta Astral' : 'My Astral Chart'}</button>
          <button className="btn btn-ghost" onClick={() => setRoute({ page: 'profile' })}>{es ? 'Mi historial y Cofre' : 'My history & Chest'}</button>
        </div>
      </div>

      <style>{`
        .dashboard-page { max-width: 1040px; }
        .dashboard-gate { text-align: center; padding: 80px 0; }
        .page-head { text-align: center; margin-bottom: 44px; }
        .page-title { font-size: clamp(34px, 5vw, 52px); font-weight: 400; margin-bottom: 10px; }
        .page-sub { font-size: 17px; color: var(--ink-soft); text-transform: capitalize; }

        .dash-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 20px;
          margin-bottom: 48px;
        }
        .dash-card {
          background: linear-gradient(160deg, rgba(90,58,138,0.1), rgba(15,10,36,0.4));
          border: 1px solid var(--line);
          border-radius: 16px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .dash-card-h {
          font-family: 'Cinzel', serif;
          font-size: 11px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--gold);
          margin-bottom: 4px;
        }
        .dash-card-big { font-family: 'Cinzel', serif; font-size: 34px; color: var(--ink); }
        .dash-card-sub { font-size: 16px; color: var(--ink); }
        .dash-card-mini { font-size: 14px; color: var(--ink-soft); line-height: 1.4; }
        .dash-card-daily { display: flex; align-items: center; gap: 14px; }
        .dash-card-daily-art { width: 52px; flex-shrink: 0; }
        .dash-card-link {
          margin-top: auto;
          padding-top: 10px;
          background: none;
          border: none;
          cursor: pointer;
          text-align: left;
          font-size: 13px;
          letter-spacing: 0.04em;
          color: var(--gold);
        }
        .dash-card-link:hover { color: var(--ink); }

        .dash-quick { border-top: 1px solid var(--line); padding-top: 32px; text-align: center; }
        .dash-quick-row { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }
      `}</style>
    </div>
  );
}

window.DashboardPage = DashboardPage;
