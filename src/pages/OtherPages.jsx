// Combined page module: Chart, Moon, Marketplace, Philosophy, Profile, Pricing

// =========== Chart ===========
function ChartPage({ lang }) {
  const t = window.I18N[lang];
  const [form, setForm] = React.useState({ date: '1990-03-14', time: '09:41', place: '' });
  const [chart, setChart] = React.useState(null);

  const generate = (e) => {
    e.preventDefault();
    const d = new Date(form.date);
    // deterministic pseudo-astrology based on date
    const seed = d.getDate() + d.getMonth() * 31;
    const signs = ['Aries', 'Tauro', 'Géminis', 'Cáncer', 'Leo', 'Virgo', 'Libra', 'Escorpio', 'Sagitario', 'Capricornio', 'Acuario', 'Piscis'];
    const signsEn = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
    const glyphs = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
    const sunI = d.getMonth();
    setChart({
      sun: { i: sunI, deg: d.getDate() },
      moon: { i: (sunI + 4) % 12, deg: (seed * 3) % 30 },
      rising: { i: (sunI + 7) % 12, deg: (seed * 5) % 30 },
      venus: { i: (sunI + 2) % 12, deg: (seed * 7) % 30 },
      mars: { i: (sunI + 9) % 12, deg: (seed * 11) % 30 },
      mercury: { i: (sunI + 1) % 12, deg: (seed * 13) % 30 },
      signs, signsEn, glyphs,
    });
  };

  const planetRow = (label, p) => (
    <div className="ch-planet-row">
      <div className="ch-planet-label eyebrow">{label}</div>
      <div className="ch-planet-value">
        <span className="ch-planet-glyph">{chart.glyphs[p.i]}</span>
        <span className="italic">{lang === 'es' ? chart.signs[p.i] : chart.signsEn[p.i]} · {p.deg}°</span>
      </div>
    </div>
  );

  return (
    <div className="page chart-page">
      <div className="page-head">
        <div className="eyebrow">— {t.nav_chart} —</div>
        <h1 className="page-title">{t.chart_h}</h1>
        <p className="page-sub italic">{t.chart_sub}</p>
      </div>

      <div className="chart-container">
        <form className="chart-form" onSubmit={generate}>
          <div className="form-field">
            <label>{t.chart_form_date}</label>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          </div>
          <div className="form-field">
            <label>{t.chart_form_time}</label>
            <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
          </div>
          <div className="form-field">
            <label>{t.chart_form_place}</label>
            <input type="text" placeholder={t.chart_form_place_ph} value={form.place} onChange={(e) => setForm({ ...form, place: e.target.value })} />
          </div>
          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }}>
            {t.chart_generate} ✦
          </button>
        </form>

        {chart && (
          <div className="chart-result">
            <div className="chart-wheel">
              <svg viewBox="0 0 300 300">
                <defs>
                  <radialGradient id="wheelBg">
                    <stop offset="0%" stopColor="#1a1438" />
                    <stop offset="100%" stopColor="#0f0a24" />
                  </radialGradient>
                </defs>
                <circle cx="150" cy="150" r="140" fill="url(#wheelBg)" stroke="#d4a85a" strokeWidth="1" opacity="0.9"/>
                <circle cx="150" cy="150" r="105" fill="none" stroke="#d4a85a" strokeWidth="0.6" opacity="0.4"/>
                <circle cx="150" cy="150" r="70" fill="none" stroke="#d4a85a" strokeWidth="0.5" opacity="0.3"/>
                {[...Array(12)].map((_, i) => {
                  const a = (i * 30 - 90) * Math.PI / 180;
                  const x1 = 150 + Math.cos(a) * 70;
                  const y1 = 150 + Math.sin(a) * 70;
                  const x2 = 150 + Math.cos(a) * 140;
                  const y2 = 150 + Math.sin(a) * 140;
                  const tx = 150 + Math.cos(a + Math.PI/12) * 122;
                  const ty = 150 + Math.sin(a + Math.PI/12) * 122;
                  return (
                    <g key={i}>
                      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#d4a85a" strokeWidth="0.5" opacity="0.4"/>
                      <text x={tx} y={ty} fontFamily="Cinzel" fontSize="14" fill="#d4a85a" textAnchor="middle" dominantBaseline="middle">
                        {chart.glyphs[i]}
                      </text>
                    </g>
                  );
                })}
                {/* Planet dots */}
                {[
                  { p: chart.sun,     sym: '☉', size: 6 },
                  { p: chart.moon,    sym: '☽', size: 5 },
                  { p: chart.venus,   sym: '♀', size: 4 },
                  { p: chart.mars,    sym: '♂', size: 4 },
                  { p: chart.mercury, sym: '☿', size: 4 },
                ].map((pd, idx) => {
                  const a = ((pd.p.i * 30 + pd.p.deg) - 90) * Math.PI / 180;
                  const r = 88 + idx * 2;
                  const x = 150 + Math.cos(a) * r;
                  const y = 150 + Math.sin(a) * r;
                  return (
                    <g key={idx}>
                      <circle cx={x} cy={y} r={pd.size} fill="#f0e2c0" opacity="0.9"/>
                      <text x={x} y={y + 1} fontFamily="Cinzel" fontSize="9" fill="#0f0a24" textAnchor="middle" dominantBaseline="middle">
                        {pd.sym}
                      </text>
                    </g>
                  );
                })}
                <circle cx="150" cy="150" r="42" fill="#0f0a24" stroke="#d4a85a" strokeWidth="0.6"/>
                <text x="150" y="145" fontFamily="Cinzel" fontSize="32" fill="#d4a85a" textAnchor="middle" dominantBaseline="middle">
                  {chart.glyphs[chart.sun.i]}
                </text>
                <text x="150" y="175" fontFamily="Cormorant Garamond" fontStyle="italic" fontSize="12" fill="#f0e2c0" textAnchor="middle">
                  {lang === 'es' ? chart.signs[chart.sun.i] : chart.signsEn[chart.sun.i]}
                </text>
              </svg>
            </div>
            <div className="chart-planets">
              {planetRow(t.chart_sun, chart.sun)}
              {planetRow(t.chart_moon, chart.moon)}
              {planetRow(t.chart_rising, chart.rising)}
              {planetRow(t.chart_venus, chart.venus)}
              {planetRow(t.chart_mars, chart.mars)}
              {planetRow(t.chart_mercury, chart.mercury)}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .chart-page { max-width: 1100px; }
        .page-head { text-align: center; margin-bottom: 48px; }
        .page-head .eyebrow { margin-bottom: 16px; }
        .page-title { font-size: clamp(40px, 5vw, 64px); font-weight: 400; margin-bottom: 12px; }
        .page-sub { font-size: 20px; color: var(--ink-soft); }

        .chart-container {
          display: grid;
          grid-template-columns: 360px 1fr;
          gap: 48px;
          align-items: start;
        }
        .chart-form {
          background: rgba(26, 20, 56, 0.4);
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 32px;
        }
        .chart-result {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px;
          align-items: center;
        }
        .chart-wheel { max-width: 320px; }
        .chart-wheel svg { width: 100%; height: auto; }
        .chart-planets { display: flex; flex-direction: column; gap: 12px; }
        .ch-planet-row {
          padding: 14px 18px;
          background: rgba(26, 20, 56, 0.4);
          border: 1px solid var(--line);
          border-radius: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .ch-planet-label { font-size: 10px; color: var(--ink-soft); letter-spacing: 0.22em; }
        .ch-planet-value {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 16px;
        }
        .ch-planet-glyph { font-family: 'Cinzel', serif; font-size: 22px; color: var(--gold); }

        @media (max-width: 900px) {
          .chart-container { grid-template-columns: 1fr; }
          .chart-result { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}

// =========== Moon ===========
function MoonPage({ lang }) {
  const t = window.I18N[lang];
  // simple lunar-phase approximation based on today
  const now = new Date();
  const lp = getLunarPhase(now);
  const phases_es = ['Luna nueva', 'Cuarto creciente', 'Luna llena', 'Cuarto menguante'];
  const phases_en = ['New moon', 'Waxing moon', 'Full moon', 'Waning moon'];
  const rituals_es = [
    'Enciende una vela. Escribe una intención en un papel pequeño. Guárdalo cerca hasta la próxima luna llena.',
    'Da un paseo al atardecer. Nombra en voz baja tres cosas que están creciendo en tu vida.',
    'Prepara una infusión caliente. Escribe una carta a tu yo del pasado — no la envíes. Léela en silencio.',
    'Ordena un cajón. Al soltar lo que no usas, haces sitio para lo que llegará.',
  ];
  const rituals_en = [
    'Light a candle. Write one intention on a small piece of paper. Keep it near you until the next full moon.',
    'Take a walk at dusk. Name three things quietly that are growing in your life.',
    'Brew a warm infusion. Write a letter to your past self — don\'t send it. Read it silently.',
    'Tidy one drawer. In letting go of what you don\'t use, you make room for what will come.',
  ];
  const currentPhase = Math.floor(lp / 25) % 4;
  const currentPhaseName = lang === 'es' ? phases_es[currentPhase] : phases_en[currentPhase];
  const ritualText = lang === 'es' ? rituals_es[currentPhase] : rituals_en[currentPhase];
  const week = [...Array(7)].map((_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() + i - 3);
    return { d, phase: getLunarPhase(d) };
  });

  return (
    <div className="page moon-page">
      <div className="page-head">
        <div className="eyebrow">— {t.nav_moon} —</div>
        <h1 className="page-title">{t.moon_h}</h1>
        <p className="page-sub italic">{t.moon_sub}</p>
      </div>

      <div className="moon-hero">
        <div className="moon-visual">
          <div className="moon-orb" style={{ '--illum': lp }}>
            <div className="moon-shadow" />
          </div>
        </div>
        <div className="moon-info">
          <div className="eyebrow">✦ {currentPhaseName}</div>
          <h2 className="moon-percent">{Math.round(lp)}%</h2>
          <p className="moon-line italic">
            "{lang === 'es' ? 'Iluminada en este momento' : 'Illuminated at this moment'}"
          </p>
        </div>
      </div>

      <div className="moon-section">
        <div className="eyebrow" style={{ marginBottom: 12 }}>— {t.moon_week_h} —</div>
        <div className="moon-week">
          {week.map((w, i) => (
            <div key={i} className={`moon-day ${i === 3 ? 'today' : ''}`}>
              <div className="moon-day-small" style={{ '--illum': w.phase }}>
                <div className="moon-day-shadow" />
              </div>
              <div className="moon-day-label">
                {t.day_of_week[w.d.getDay()]} · {w.d.getDate()}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="moon-section">
        <div className="eyebrow" style={{ marginBottom: 12 }}>— {t.moon_ritual_h} —</div>
        <div className="moon-ritual italic">"{ritualText}"</div>
      </div>

      <style>{`
        .moon-page { max-width: 1000px; }
        .page-head { text-align: center; margin-bottom: 48px; }
        .page-head .eyebrow { margin-bottom: 16px; }
        .page-title { font-size: clamp(40px, 5vw, 64px); font-weight: 400; margin-bottom: 12px; }
        .page-sub { font-size: 20px; color: var(--ink-soft); }

        .moon-hero {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 64px;
          align-items: center;
          margin-bottom: 64px;
          padding: 48px;
          background: linear-gradient(135deg, rgba(90, 58, 138, 0.15), rgba(15, 10, 36, 0.5));
          border: 1px solid var(--line);
          border-radius: 20px;
        }
        .moon-visual { display: flex; justify-content: center; }
        .moon-orb {
          width: 220px;
          height: 220px;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, #fff8e0 0%, #f0e2c0 60%, #d4c8a0 100%);
          box-shadow: 0 0 60px rgba(240, 226, 192, 0.35), inset -20px -20px 40px rgba(0, 0, 0, 0.3);
          position: relative;
          overflow: hidden;
        }
        .moon-shadow {
          position: absolute;
          inset: 0;
          background: var(--bg);
          border-radius: 50%;
          transform: translateX(calc((100% - var(--illum) * 2%) * 1));
          transition: transform 1.2s ease;
          opacity: 0.92;
        }
        .moon-percent {
          font-size: clamp(64px, 8vw, 96px);
          font-weight: 400;
          margin: 12px 0;
          color: var(--gold);
          letter-spacing: 0;
          font-family: 'Cormorant Garamond', serif;
          font-style: italic;
        }
        .moon-line { font-size: 20px; color: var(--ink); }

        .moon-section { margin-bottom: 48px; text-align: center; }
        .moon-week {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 8px;
          margin-top: 16px;
        }
        .moon-day {
          padding: 16px 8px;
          background: rgba(26, 20, 56, 0.4);
          border: 1px solid var(--line);
          border-radius: 8px;
          text-align: center;
        }
        .moon-day.today { border-color: var(--gold); background: rgba(212, 168, 90, 0.08); }
        .moon-day-small {
          width: 36px;
          height: 36px;
          margin: 0 auto 8px;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, #fff8e0, #f0e2c0);
          position: relative;
          overflow: hidden;
        }
        .moon-day-shadow {
          position: absolute;
          inset: 0;
          background: var(--bg-2);
          border-radius: 50%;
          transform: translateX(calc((100% - var(--illum) * 2%) * 1));
        }
        .moon-day-label {
          font-family: 'Cinzel', serif;
          font-size: 10px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--ink-soft);
        }
        .moon-day.today .moon-day-label { color: var(--gold); }

        .moon-ritual {
          font-size: 22px;
          padding: 32px;
          background: rgba(26, 20, 56, 0.4);
          border-left: 3px solid var(--gold);
          border-radius: 0 12px 12px 0;
          line-height: 1.5;
          color: var(--ink);
          text-align: left;
          max-width: 720px;
          margin: 16px auto 0;
          text-wrap: pretty;
        }

        @media (max-width: 800px) {
          .moon-hero { grid-template-columns: 1fr; text-align: center; padding: 32px; }
        }
      `}</style>
    </div>
  );
}

// Approximate lunar phase 0..100 (0 = new, 50 = full, 100 = ~new again)
function getLunarPhase(date) {
  const synodicMonth = 29.530588853;
  const knownNew = new Date('2000-01-06T18:14:00Z').getTime();
  const diff = (date.getTime() - knownNew) / (1000 * 60 * 60 * 24);
  const cycle = ((diff % synodicMonth) + synodicMonth) % synodicMonth;
  // Illumination: 0 at new, 50 at first quarter, 100 at full, 50 at third quarter
  const norm = cycle / synodicMonth; // 0..1
  const illum = norm < 0.5
    ? norm * 2 * 100
    : (1 - (norm - 0.5) * 2) * 100;
  return illum;
}

// =========== Marketplace: Lux Astral — Live ===========
// El código de acceso ahora lo genera el backend al confirmar el pago
// (booking.accessCode) y se valida contra la API, no contra localStorage
// — ver src/pages/VideoCall.jsx y arcanaJoinSession.
function MarketplacePage({ lang, setRoute, profile }) {
  const t = window.I18N[lang];
  // El hero usaba una imagen vieja (assets/live-sessions-logo.png) con el
  // logo/marca anterior ("Arcana Tarot") baked-in del rebranding a Lux
  // Astral — se reemplaza por el mismo componente ArcanaLogo que usa el
  // Nav, así queda siempre sincronizado con la marca actual.
  const Logo = window.ArcanaLogo;

  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState(false);
  const [tarotists, setTarotists] = React.useState([]);
  const [settings, setSettings] = React.useState({ sessionBasePrice: 22, planDiscounts: { luna: 10, estrella: 15, oraculo: 20 } });

  const [active, setActive] = React.useState(null); // tarotista siendo agendada
  const [slotId, setSlotId] = React.useState(null);
  // 2026-09-09 (a pedido de Christian): el email de la reserva ya no es
  // un campo de texto libre -- se toma SIEMPRE de la cuenta autenticada
  // (profile.email), así nadie puede escribir el email de otra socia
  // para pagar con su descuento (el backend además lo re-verifica: ver
  // requireUserAuth en la acción "checkout"). El nombre sí se puede
  // editar (es solo un dato de cortesía para la tarotista).
  const [form, setForm] = React.useState({ name: profile.name || '', email: profile.email || '' });
  const [bookError, setBookError] = React.useState('');
  // Suscripción de la cuenta autenticada — se verifica en vivo contra
  // PayPal (ver arcanaSubscriberStatus en src/data/booking.js).
  const [subCheck, setSubCheck] = React.useState({ checking: false, isSubscriber: false, planKey: null, oraculoFreeSlotAvailable: false, checkedEmail: '' });

  const [confirmState, setConfirmState] = React.useState('idle'); // idle | confirming | paid | cancelled | error
  const [confirmed, setConfirmed] = React.useState(null);

  // El pago se hace con el botón de PayPal (JS SDK), montado dentro del
  // modal de reserva — no hay redirect a otro sitio, se abre un popup de
  // PayPal. El SDK se inyecta dinámicamente porque el client-id recién se
  // conoce en runtime (viene del backend, ver load()).
  const [paypalReady, setPaypalReady] = React.useState(false);
  const [paypalSdkLoaded, setPaypalSdkLoaded] = React.useState(false);
  const paypalClientIdRef = React.useRef('');
  const paypalSdkLoadingRef = React.useRef(false);
  const paypalButtonBoxRef = React.useRef(null);
  const paypalRenderedForRef = React.useRef(null); // id de la tarotista para la que ya se montó el botón
  // createOrder/onApprove del botón necesitan ver siempre el horario y el
  // formulario más recientes sin tener que re-montar el botón en cada
  // tecla — por eso viven en un ref en vez de en el closure del render.
  const bookingCtxRef = React.useRef({ tarotistId: null, slotId: null, customerName: '', customerEmail: '', isSubscriber: false, lang });

  const load = React.useCallback(() => {
    setLoading(true);
    setLoadError(false);
    window.arcanaFetchTarotistas()
      .then((data) => {
        setTarotists(data.tarotists || []);
        if (data.settings) setSettings(data.settings);
        if (data.paypalClientId) paypalClientIdRef.current = data.paypalClientId;
        setPaypalReady(!!data.paypalClientId);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => { load(); }, [load]);

  React.useEffect(() => {
    bookingCtxRef.current = {
      tarotistId: active ? active.id : null,
      slotId,
      customerName: form.name,
      customerEmail: profile.email || '',
      isSubscriber: subCheck.isSubscriber,
      lang,
    };
  }, [active, slotId, form, lang, subCheck]);

  // Verifica si la cuenta autenticada tiene una suscripción activa — ya
  // no depende de lo que la visitante escriba, así nadie puede tipear el
  // email de otra socia para ver/usar su descuento (el backend igual lo
  // re-verifica del lado del servidor antes de cobrar).
  React.useEffect(() => {
    if (!profile.token) {
      setSubCheck({ checking: false, isSubscriber: false, planKey: null, oraculoFreeSlotAvailable: false, checkedEmail: '' });
      return undefined;
    }
    let cancelled = false;
    setSubCheck((s) => ({ ...s, checking: true }));
    window.arcanaSubscriberStatus()
      .then((res) => {
        if (cancelled) return;
        setSubCheck({
          checking: false, isSubscriber: !!res.isSubscriber, planKey: res.planKey || null,
          oraculoFreeSlotAvailable: !!res.oraculoFreeSlotAvailable, checkedEmail: profile.email || '',
        });
      })
      .catch(() => {
        if (cancelled) return;
        setSubCheck({ checking: false, isSubscriber: false, planKey: null, oraculoFreeSlotAvailable: false, checkedEmail: profile.email || '' });
      });
    return () => { cancelled = true; };
  }, [profile.token]);

  React.useEffect(() => {
    if (!paypalReady) return;
    if (window.paypal) { setPaypalSdkLoaded(true); return; }
    if (paypalSdkLoadingRef.current) return;
    paypalSdkLoadingRef.current = true;
    const s = document.createElement('script');
    s.src = 'https://www.paypal.com/sdk/js?client-id=' + encodeURIComponent(paypalClientIdRef.current) + '&currency=USD&intent=capture';
    s.onload = () => setPaypalSdkLoaded(true);
    s.onerror = () => setBookError(lang === 'es' ? 'No se pudo cargar PayPal.' : 'Could not load PayPal.');
    document.body.appendChild(s);
  }, [paypalReady]);

  // Monta el botón real de PayPal dentro del modal cuando está todo listo.
  // createOrder crea la orden en el backend (precio ya calculado ahí, nunca
  // confiamos en el precio del navegador) y onApprove pide capturarla —
  // recién en ese momento se mueve la plata de verdad.
  React.useEffect(() => {
    if (!active || !paypalSdkLoaded || !window.paypal || !paypalButtonBoxRef.current) return;
    if (subCheck.oraculoFreeSlotAvailable) return; // esta sesión sale gratis, no hace falta botón de PayPal
    const renderKey = active.id + ':' + subCheck.oraculoFreeSlotAvailable;
    if (paypalRenderedForRef.current === renderKey) return;
    paypalRenderedForRef.current = renderKey;
    paypalButtonBoxRef.current.innerHTML = '';
    window.paypal.Buttons({
      style: { layout: 'vertical', color: 'gold', label: 'pay' },
      createOrder: () => {
        const ctx = bookingCtxRef.current;
        if (!ctx.slotId || !profile.token) {
          setBookError((t.market_book_error_prefix || '') + (lang === 'es' ? 'Elegí un horario primero.' : 'Choose a time first.'));
          return Promise.reject(new Error('missing-fields'));
        }
        setBookError('');
        return window.arcanaCreateCheckout({
          tarotistId: ctx.tarotistId, slotId: ctx.slotId, customerName: ctx.customerName,
          customerEmail: ctx.customerEmail, isSubscriber: ctx.isSubscriber, lang: ctx.lang,
        }).then((res) => res.orderId);
      },
      onApprove: (data) => {
        setActive(null);
        setConfirmState('confirming');
        return window.arcanaConfirmBooking(data.orderID)
          .then((res) => {
            if (res.status === 'paid') {
              setConfirmed(res);
              setConfirmState('paid');
              load();
            } else {
              setConfirmState('error');
            }
          })
          .catch(() => setConfirmState('error'));
      },
      onCancel: () => { setConfirmState('cancelled'); },
      onError: () => {
        setBookError((t.market_book_error_prefix || '') + (lang === 'es' ? 'Ocurrió un error con PayPal.' : 'Something went wrong with PayPal.'));
      },
    }).render(paypalButtonBoxRef.current);
  }, [active, paypalSdkLoaded, subCheck.oraculoFreeSlotAvailable]);

  const [freeBookingBusy, setFreeBookingBusy] = React.useState(false);
  const bookFreeOraculoSlot = () => {
    const ctx = bookingCtxRef.current;
    if (!ctx.slotId || !profile.token) {
      setBookError((t.market_book_error_prefix || '') + (lang === 'es' ? 'Elegí un horario primero.' : 'Choose a time first.'));
      return;
    }
    setBookError('');
    setFreeBookingBusy(true);
    window.arcanaCheckoutFree({
      tarotistId: ctx.tarotistId, slotId: ctx.slotId, customerName: ctx.customerName, customerEmail: ctx.customerEmail, lang: ctx.lang,
    })
      .then((res) => {
        setActive(null);
        setConfirmed(res);
        setConfirmState('paid');
        load();
      })
      .catch((e) => setBookError(e.message || (lang === 'es' ? 'No se pudo reservar la sesión gratis.' : 'Could not book the free session.')))
      .finally(() => setFreeBookingBusy(false));
  };

  const openBooking = (tr) => {
    setActive(tr);
    setSlotId(null);
    setForm({ name: profile.name || '', email: profile.email || '' });
    setBookError('');
  };
  const closeBooking = () => { setActive(null); paypalRenderedForRef.current = null; };
  const closeConfirm = () => { setConfirmState('idle'); setConfirmed(null); };

  const basePrice = active ? (Number(active.rate) || settings.sessionBasePrice) : 0;
  const discountPct = (subCheck.isSubscriber && subCheck.planKey && settings.planDiscounts) ? (settings.planDiscounts[subCheck.planKey] || 0) : 0;
  const displayPrice = subCheck.oraculoFreeSlotAvailable
    ? 0
    : discountPct
      ? Math.round(basePrice * (1 - discountPct / 100) * 100) / 100
      : basePrice;

  const formatSlot = (iso) => {
    try {
      return new Date(iso).toLocaleString(lang === 'es' ? 'es-CL' : 'en-US', {
        weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      });
    } catch { return iso; }
  };

  return (
    <div className="page market-page-live">
      <div className="page-head market-hero-band">
        <img src="assets/live-sessions-photo.jpg" alt="" aria-hidden="true" className="market-hero-photo" />
        <div className="market-hero-overlay" aria-hidden="true"></div>
        <div className="market-hero-inner">
          <div className="market-hero-logo">
            <Logo variant="lockup" size={52} tagline={lang === 'es' ? 'Tarot' : 'Tarot'} />
          </div>
          <div className="eyebrow">— {t.nav_marketplace} —</div>
          <h1 className="page-title">{t.market_h}</h1>
          <p className="page-sub italic">{t.market_sub}</p>
          <button
            className="btn btn-ghost"
            style={{ marginTop: 10 }}
            onClick={() => setRoute && setRoute({ page: 'mybookings' })}
          >
            {t.market_view_bookings_link}
          </button>
        </div>
      </div>

      {loading && <div className="market-status italic">{t.market_loading}</div>}
      {!loading && loadError && <div className="market-status market-status-error italic">{t.market_load_error}</div>}
      {!loading && !loadError && tarotists.length === 0 && (
        <div className="market-status italic">{t.market_book_no_slots}</div>
      )}

      {!loading && !loadError && tarotists.map((tr) => {
        const price = Number(tr.rate) || settings.sessionBasePrice;
        return (
          <div className="live-hero" key={tr.id}>
            <div className="live-hero-l">
              <div className="live-orb" style={{ background: `radial-gradient(circle at 30% 30%, ${tr.color}, ${tr.color}55 60%, ${tr.color}11)` }}>
                <span>{tr.initials}</span>
              </div>
              <div className={`chip ${tr.status}`}>
                <span className="dot"></span>{tr.status === 'online' ? t.market_online : t.market_busy}
              </div>
            </div>

            <div className="live-hero-r">
              <div className="live-name">{tr.name}</div>
              <div className="live-spec italic">{lang === 'es' ? tr.specialty_es : tr.specialty_en}</div>
              <div className="live-style">{lang === 'es' ? tr.style_es : tr.style_en}</div>

              <div className="live-stats">
                <div>
                  <div className="eyebrow">{t.market_years}</div>
                  <div className="live-stat-v">{tr.years}</div>
                </div>
                <div>
                  <div className="eyebrow">{t.market_readings}</div>
                  <div className="live-stat-v">{(tr.readings || 0).toLocaleString()}</div>
                </div>
                <div>
                  <div className="eyebrow">{lang === 'es' ? 'Valoración' : 'Rating'}</div>
                  <div className="live-stat-v" style={{ color: 'var(--gold)' }}>★ {(tr.rating || 5).toFixed(1)}</div>
                </div>
              </div>

              <div className="live-cta-row">
                <div className="live-rate">
                  <span className="live-rate-currency">$</span>
                  <span className="live-rate-value">{price}</span>
                  <span className="live-rate-unit">/ 30 min</span>
                </div>
                <button className="btn btn-primary btn-lg" onClick={() => openBooking(tr)}>
                  {t.market_book} →
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {/* Cómo funciona */}
      <div className="live-how">
        <div className="live-how-h eyebrow">— {t.market_how_h} —</div>
        <div className="live-how-steps">
          <div className="live-how-step">
            <div className="live-how-num">01</div>
            <div className="live-how-body italic">{t.market_how_1}</div>
          </div>
          <div className="live-how-step">
            <div className="live-how-num">02</div>
            <div className="live-how-body italic">{t.market_how_2}</div>
          </div>
          <div className="live-how-step">
            <div className="live-how-num">03</div>
            <div className="live-how-body italic">{t.market_how_3}</div>
          </div>
        </div>
      </div>

      {/* Modal — Agendar */}
      {active && (
        <div className="modal-overlay" onClick={closeBooking}>
          <div className="modal live-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeBooking}>✕</button>
            <div className="eyebrow" style={{ marginBottom: 8 }}>— {t.market_book_h} —</div>
            <h2 className="live-modal-h">{active.name}</h2>

            <div className="live-modal-block">
              <div className="eyebrow" style={{ marginBottom: 10 }}>{t.market_book_choose_slot}</div>
              {(!active.availability || active.availability.length === 0) ? (
                <div className="live-pay-note italic">{t.market_book_no_slots}</div>
              ) : (
                <div className="live-slots">
                  {active.availability.map((s) => (
                    <button
                      key={s.id}
                      className={`live-slot-btn ${slotId === s.id ? 'is-active' : ''}`}
                      onClick={() => setSlotId(s.id)}
                    >{formatSlot(s.startsAt)}</button>
                  ))}
                </div>
              )}
            </div>

            <div className="live-modal-block">
              <div className="form-field">
                <label>{t.market_book_name}</label>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="form-field">
                <label>{t.market_book_email}</label>
                <input type="email" value={form.email} readOnly disabled title={lang === 'es' ? 'Es el email de tu cuenta.' : 'This is your account email.'} />
              </div>
              {!!profile.token && (
                <div className="live-subscriber-check">
                  {subCheck.checking
                    ? (lang === 'es' ? 'Verificando suscripción…' : 'Checking subscription…')
                    : subCheck.oraculoFreeSlotAvailable
                      ? (lang === 'es' ? '✦ Suscripción Oráculo — tu sesión gratis de este mes está disponible' : '✦ Oráculo subscription — your free session this month is available')
                      : subCheck.isSubscriber
                        ? (lang === 'es' ? `✦ Suscripción activa (${subCheck.planKey}) — ${discountPct}% de descuento aplicado` : `✦ Active subscription (${subCheck.planKey}) — ${discountPct}% discount applied`)
                        : (lang === 'es' ? 'Sin suscripción activa con este email.' : 'No active subscription with this email.')}
                </div>
              )}
              <div className="live-pay-note italic">{t.market_book_subscriber_note}</div>
            </div>

            <div className="live-total">
              <div className="eyebrow">{t.market_book_total}</div>
              <div className="live-total-v">
                <span className="live-rate-currency">$</span>
                <span className="live-total-num">{displayPrice}</span>
                <span className="live-rate-unit">USD</span>
              </div>
            </div>

            {bookError && <div className="live-pay-note italic" style={{ color: '#e08080' }}>{bookError}</div>}

            {(!slotId || !profile.token) && (
              <div className="live-pay-note italic">{t.market_book_pay_hint}</div>
            )}

            {subCheck.oraculoFreeSlotAvailable ? (
              <button className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={freeBookingBusy || !slotId} onClick={bookFreeOraculoSlot}>
                {freeBookingBusy
                  ? (lang === 'es' ? 'Reservando…' : 'Booking…')
                  : (lang === 'es' ? 'Reservar gratis (incluida en tu plan)' : 'Book for free (included in your plan)')}
              </button>
            ) : (
              <>
                {!paypalSdkLoaded && <div className="live-pay-note italic">{t.market_book_processing}</div>}
                <div ref={paypalButtonBoxRef} className="live-paypal-box" />
              </>
            )}
          </div>
        </div>
      )}

      {/* Confirmando el pago (capturando la orden contra la API de PayPal) */}
      {confirmState === 'confirming' && (
        <div className="modal-overlay">
          <div className="modal live-modal live-paying" onClick={(e) => e.stopPropagation()}>
            <div className="live-paying-spinner">
              <span /><span /><span /><span /><span /><span /><span /><span />
            </div>
            <div className="eyebrow" style={{ color: 'var(--gold)' }}>{t.market_confirming}</div>
          </div>
        </div>
      )}

      {/* Pago cancelado */}
      {confirmState === 'cancelled' && (
        <div className="modal-overlay" onClick={closeConfirm}>
          <div className="modal live-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeConfirm}>✕</button>
            <p className="italic" style={{ marginTop: 20 }}>{t.market_cancel_notice}</p>
          </div>
        </div>
      )}

      {/* No se pudo confirmar */}
      {confirmState === 'error' && (
        <div className="modal-overlay" onClick={closeConfirm}>
          <div className="modal live-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeConfirm}>✕</button>
            <p className="italic" style={{ marginTop: 20 }}>{t.market_load_error}</p>
          </div>
        </div>
      )}

      {/* Modal — Confirmación */}
      {confirmState === 'paid' && confirmed && (
        <div className="modal-overlay">
          <div className="modal live-modal live-paid" onClick={(e) => e.stopPropagation()}>
            <div className="live-paid-icon">✦</div>
            <div className="eyebrow" style={{ color: 'var(--gold)', marginBottom: 8 }}>— {t.market_paid_h} —</div>
            <h2 className="live-modal-h">{t.market_paid_sub}</h2>

            <div className="live-paid-when">
              <div className="eyebrow">{t.market_paid_when}</div>
              <div className="live-paid-when-v">{confirmed.when ? formatSlot(confirmed.when) : ''}</div>
            </div>

            <div className="live-code-block user">
              <div className="eyebrow" style={{ color: 'var(--gold)', marginBottom: 8 }}>{t.market_paid_your_code}</div>
              <div className="live-code-row">
                <div className="live-code">{confirmed.accessCode}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 10, marginTop: 24 }}>
              {(() => {
                const joinFrom = confirmed.videoJoinFrom ? new Date(confirmed.videoJoinFrom).getTime() : 0;
                const canJoinNow = !joinFrom || Date.now() >= joinFrom;
                if (confirmed.videoRoomUrl && canJoinNow) {
                  return (
                    <button
                      className="btn btn-primary btn-lg"
                      style={{ width: '100%' }}
                      onClick={() => { closeConfirm(); setRoute && setRoute({ page: 'videocall', accessCode: confirmed.accessCode }); }}
                    >
                      {t.market_paid_enter} →
                    </button>
                  );
                }
                if (confirmed.videoRoomUrl && !canJoinNow) {
                  return <div className="live-code-note italic">{t.market_paid_too_early}</div>;
                }
                if (confirmed.meetingLink) {
                  return (
                    <a
                      className="btn btn-primary btn-lg"
                      style={{ width: '100%', textAlign: 'center', textDecoration: 'none' }}
                      href={confirmed.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t.market_paid_enter} →
                    </a>
                  );
                }
                return <div className="live-code-note italic">{t.market_paid_join_fallback}</div>;
              })()}
              <button
                className="btn btn-ghost"
                style={{ width: '100%' }}
                onClick={() => { closeConfirm(); setRoute && setRoute({ page: 'mybookings' }); }}
              >
                {t.market_paid_view_bookings}
              </button>
              <button
                className="btn btn-ghost"
                style={{ width: '100%' }}
                onClick={() => { closeConfirm(); setRoute && setRoute({ page: 'home' }); }}
              >
                {t.market_paid_later}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .market-page-live { max-width: 1100px; }
        .page-head { text-align: center; margin-bottom: 56px; }
        .page-head .eyebrow { margin-bottom: 16px; }
        .page-title { font-size: clamp(40px, 5vw, 68px); font-weight: 400; margin-bottom: 14px; }
        .page-sub { font-size: 20px; color: var(--ink-soft); max-width: 620px; margin: 0 auto; }

        .market-hero-band {
          position: relative;
          overflow: hidden;
          border-radius: 24px;
          border: 1px solid var(--line);
          padding: 64px 32px 48px;
          isolation: isolate;
        }
        .market-hero-photo {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: right center;
          z-index: -2;
        }
        .market-hero-overlay {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 32% 45%, rgba(15,10,36,0.55), rgba(15,10,36,0.9) 62%),
            linear-gradient(90deg, rgba(15,10,36,0.94) 0%, rgba(15,10,36,0.82) 48%, rgba(15,10,36,0.38) 82%, rgba(15,10,36,0.55) 100%);
          z-index: -1;
        }
        .market-hero-inner { position: relative; }
        .market-hero-logo {
          display: flex;
          justify-content: center;
          margin: 0 auto 20px;
          filter: drop-shadow(0 0 30px rgba(212,168,90,0.2));
        }
        @media (max-width: 640px) {
          .market-hero-band { padding: 44px 20px 36px; }
        }

        .market-status { text-align: center; padding: 40px 0; font-size: 17px; color: var(--ink-soft); }
        .market-status-error { color: #e08080; }

        /* Hero */
        .live-hero {
          display: grid;
          grid-template-columns: 260px 1fr;
          gap: 40px;
          background: linear-gradient(180deg, rgba(26, 20, 56, 0.55) 0%, rgba(15, 10, 36, 0.35) 100%);
          border: 1px solid var(--line);
          border-radius: 22px;
          padding: 44px;
          margin-bottom: 24px;
        }
        .live-hero-l {
          display: flex; flex-direction: column; align-items: center; gap: 18px;
        }
        .live-orb {
          width: 200px; height: 200px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Cinzel', serif;
          font-size: 60px;
          letter-spacing: 0.12em;
          color: var(--bg);
          border: 1px solid rgba(255,255,255,0.15);
          box-shadow: 0 0 60px rgba(212, 168, 90, 0.22);
          animation: liveOrb 5s ease-in-out infinite;
        }
        @keyframes liveOrb {
          0%,100% { transform: scale(1); box-shadow: 0 0 60px rgba(212, 168, 90, 0.22); }
          50%     { transform: scale(1.015); box-shadow: 0 0 90px rgba(212, 168, 90, 0.32); }
        }
        .live-hero-r { display: flex; flex-direction: column; justify-content: center; }
        .live-name {
          font-family: 'Cinzel', serif;
          font-size: 28px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
        .live-spec {
          font-family: 'Cormorant Garamond', serif;
          font-size: 22px;
          color: var(--gold);
          margin-top: 6px;
        }
        .live-style {
          font-size: 15px;
          color: var(--ink-soft);
          margin-top: 6px;
          font-family: 'Cormorant Garamond', serif;
          font-style: italic;
        }
        .live-stats {
          display: grid;
          grid-template-columns: repeat(3, auto);
          gap: 32px;
          padding: 22px 0;
          margin-top: 18px;
          border-top: 1px solid var(--line);
          border-bottom: 1px solid var(--line);
        }
        .live-stats .eyebrow { font-size: 9px !important; color: var(--ink-mute); margin-bottom: 4px; }
        .live-stat-v {
          font-family: 'Cinzel', serif;
          font-size: 22px;
          color: var(--ink);
        }
        .live-cta-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          margin-top: 22px;
          flex-wrap: wrap;
        }
        .live-rate { color: var(--ink); }
        .live-rate-currency { font-family: 'Cinzel', serif; font-size: 15px; color: var(--gold); }
        .live-rate-value { font-family: 'Cinzel', serif; font-size: 30px; color: var(--gold); margin: 0 3px; }
        .live-rate-unit { font-family: 'Cormorant Garamond', serif; font-style: italic; font-size: 15px; color: var(--ink-soft); }

        /* Cómo funciona */
        .live-how {
          text-align: center;
          margin-top: 20px;
        }
        .live-how-h { margin-bottom: 28px; color: var(--gold); }
        .live-how-steps {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }
        .live-how-step {
          padding: 28px 22px;
          border: 1px solid var(--line);
          border-radius: 14px;
          background: rgba(26, 20, 56, 0.25);
        }
        .live-how-num {
          font-family: 'Cinzel', serif;
          font-size: 22px;
          color: var(--gold);
          letter-spacing: 0.16em;
          margin-bottom: 12px;
        }
        .live-how-body {
          font-family: 'Cormorant Garamond', serif;
          font-size: 18px;
          color: var(--ink-soft);
          line-height: 1.5;
          text-wrap: pretty;
        }

        /* Modales */
        .live-modal { max-width: 520px; padding: 38px 40px; }
        .live-modal-h {
          font-family: 'Cinzel', serif;
          font-size: 24px;
          letter-spacing: 0.06em;
          font-weight: 400;
          margin-bottom: 24px;
        }
        .live-modal-block { margin-bottom: 26px; }
        .live-slots { display: flex; flex-wrap: wrap; gap: 8px; }
        .live-day-btn, .live-slot-btn, .live-method-btn {
          background: transparent;
          border: 1px solid var(--line);
          color: var(--ink-soft);
          padding: 10px 16px;
          border-radius: 30px;
          font-family: 'Cinzel', serif;
          font-size: 11px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          cursor: pointer;
          transition: border-color 0.2s, color 0.2s, background 0.2s;
        }
        .live-day-btn.is-active, .live-slot-btn.is-active, .live-method-btn.is-active {
          border-color: var(--gold);
          color: var(--gold);
          background: rgba(212, 168, 90, 0.08);
        }
        .live-subscriber-check {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
          color: var(--ink-soft);
          margin-top: 16px;
          cursor: pointer;
        }
        .live-pay-note {
          margin-top: 10px;
          font-size: 13px;
          color: var(--ink-mute);
        }
        .live-total {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 18px 0;
          border-top: 1px dashed var(--line);
          border-bottom: 1px dashed var(--line);
          margin-bottom: 22px;
        }
        .live-total-v { display: flex; align-items: baseline; }
        .live-total-num { font-family: 'Cinzel', serif; font-size: 30px; color: var(--gold); margin: 0 4px; }
        .live-paypal-box { min-height: 45px; margin-top: 4px; }

        /* Procesando */
        .live-paying {
          text-align: center;
          padding: 60px 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }
        .live-paying-spinner {
          position: relative;
          width: 40px;
          height: 40px;
        }
        .live-paying-spinner span {
          position: absolute;
          left: 50%; top: 0;
          width: 3px;
          height: 8px;
          background: var(--gold);
          border-radius: 2px;
          transform-origin: center 20px;
          opacity: 0.3;
          animation: liveSpin 1s linear infinite;
        }
        .live-paying-spinner span:nth-child(1) { transform: rotate(0deg); animation-delay: -0.875s; }
        .live-paying-spinner span:nth-child(2) { transform: rotate(45deg); animation-delay: -0.75s; }
        .live-paying-spinner span:nth-child(3) { transform: rotate(90deg); animation-delay: -0.625s; }
        .live-paying-spinner span:nth-child(4) { transform: rotate(135deg); animation-delay: -0.5s; }
        .live-paying-spinner span:nth-child(5) { transform: rotate(180deg); animation-delay: -0.375s; }
        .live-paying-spinner span:nth-child(6) { transform: rotate(225deg); animation-delay: -0.25s; }
        .live-paying-spinner span:nth-child(7) { transform: rotate(270deg); animation-delay: -0.125s; }
        .live-paying-spinner span:nth-child(8) { transform: rotate(315deg); animation-delay: 0s; }
        @keyframes liveSpin { 0% { opacity: 1; } 100% { opacity: 0.15; } }

        /* Pagado */
        .live-paid { padding: 40px 40px; max-width: 560px; }
        .live-paid-icon {
          font-family: 'Cinzel', serif;
          font-size: 30px;
          color: var(--gold);
          text-align: center;
          margin-bottom: 8px;
        }
        .live-paid-when {
          text-align: center;
          padding: 18px 0;
          border-top: 1px dashed var(--line);
          border-bottom: 1px dashed var(--line);
          margin: 20px 0 26px;
        }
        .live-paid-when-v {
          font-family: 'Cinzel', serif;
          font-size: 18px;
          letter-spacing: 0.1em;
          color: var(--ink);
          margin-top: 6px;
        }
        .live-code-block {
          padding: 18px 20px;
          border: 1px solid var(--line);
          border-radius: 12px;
          margin-bottom: 14px;
          background: rgba(15, 10, 36, 0.4);
        }
        .live-code-block.user { border-color: var(--gold); background: rgba(212, 168, 90, 0.06); }
        .live-code-row {
          display: flex;
          align-items: center;
          gap: 12px;
          justify-content: space-between;
        }
        .live-code {
          font-family: 'Cinzel', serif;
          font-size: 26px;
          letter-spacing: 0.12em;
          color: var(--gold);
          user-select: all;
        }
        .live-code-note {
          margin-top: 8px;
          font-size: 13px;
          color: var(--ink-mute);
          text-wrap: pretty;
        }

        .btn:disabled { opacity: 0.4; cursor: not-allowed; }

        /* Responsive */
        @media (max-width: 780px) {
          .live-hero { grid-template-columns: 1fr; gap: 24px; padding: 32px 22px; text-align: center; }
          .live-hero-r { align-items: center; }
          .live-stats { grid-template-columns: repeat(3, 1fr); gap: 12px; padding: 18px 0; }
          .live-cta-row { flex-direction: column; }
          .live-orb { width: 140px; height: 140px; font-size: 42px; }
          .live-how-steps { grid-template-columns: 1fr; }
          .live-modal { padding: 28px 22px; }
          .live-slots { justify-content: flex-start; }
          .live-code { font-size: 20px; }
        }
      `}</style>
    </div>
  );
}

// =========== Philosophy ===========
function PhilosophyPage({ lang }) {
  const t = window.I18N[lang];
  return (
    <div className="page phil-page">
      <div className="page-head">
        <div className="eyebrow">✦</div>
        <h1 className="page-title">{t.phil_h}</h1>
      </div>
      <div className="phil-body">
        <p className="phil-lead">{t.phil_p1}</p>
        <p>{t.phil_p2}</p>
        <p>{t.phil_p3}</p>
        <p className="phil-lead">{t.phil_p4}</p>
        <div className="phil-signed">{t.phil_signed}</div>
      </div>
      <style>{`
        .phil-page { max-width: 760px; }
        .page-head { text-align: center; margin-bottom: 48px; }
        .page-head .eyebrow { color: var(--gold); font-size: 24px; margin-bottom: 24px; }
        .page-title { font-size: clamp(40px, 5vw, 64px); font-weight: 400; }
        .phil-body {
          font-family: 'Cormorant Garamond', serif;
          font-size: 21px;
          line-height: 1.7;
          color: var(--ink);
        }
        .phil-body p { margin-bottom: 28px; text-wrap: pretty; }
        .phil-lead {
          font-style: italic;
          font-size: 28px;
          line-height: 1.4;
          color: var(--gold);
          text-align: center;
          margin: 40px 0 !important;
        }
        .phil-signed {
          margin-top: 48px;
          padding-top: 24px;
          border-top: 1px solid var(--line);
          font-family: 'Cinzel', serif;
          font-size: 11px;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: var(--ink-soft);
          text-align: center;
        }
      `}</style>
    </div>
  );
}

// =========== Contact ===========
function ContactPage({ lang }) {
  const t = window.I18N[lang];
  const es = lang === 'es';
  const [form, setForm] = React.useState({ name: '', email: '', message: '' });
  const [status, setStatus] = React.useState('idle'); // idle | sending | sent | error
  const [error, setError] = React.useState('');

  const onSubmit = (e) => {
    e.preventDefault();
    const email = form.email.trim();
    const message = form.message.trim();
    if (!email || !email.includes('@')) { setStatus('error'); setError(t.contact_error_email); return; }
    if (!message) { setStatus('error'); setError(t.contact_error_message); return; }
    setStatus('sending');
    setError('');
    window.arcanaSendContactMessage({ name: form.name.trim(), email, message })
      .then(() => { setStatus('sent'); setForm({ name: '', email: '', message: '' }); })
      .catch((e) => { setStatus('error'); setError(e.message || t.contact_error_default); });
  };

  return (
    <div className="page contact-page">
      <div className="page-head">
        <div className="eyebrow">✦</div>
        <h1 className="page-title">{t.contact_h}</h1>
        <p className="contact-sub">{t.contact_sub}</p>
      </div>

      {status === 'sent' ? (
        <div className="contact-success">{t.contact_success}</div>
      ) : (
        <form className="contact-form" onSubmit={onSubmit}>
          <div className="form-field">
            <label>{t.contact_name_label}</label>
            <input
              type="text"
              placeholder={t.contact_name_ph}
              value={form.name}
              maxLength={80}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="form-field">
            <label>{t.contact_email_label}</label>
            <input
              type="email"
              placeholder={t.contact_email_ph}
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
          </div>
          <div className="form-field">
            <label>{t.contact_message_label}</label>
            <textarea
              placeholder={t.contact_message_ph}
              value={form.message}
              maxLength={3000}
              rows={6}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              required
            />
          </div>
          {status === 'error' && <div className="contact-error">{error}</div>}
          <button className="btn btn-primary" type="submit" disabled={status === 'sending'}>
            {status === 'sending' ? t.contact_sending : t.contact_submit} ✦
          </button>
        </form>
      )}

      <div className="contact-direct">
        <span>{t.contact_direct_lead}</span>{' '}
        <span>{t.contact_direct_cta} <a href="mailto:contacto@luxastral.com">contacto@luxastral.com</a></span>
      </div>

      <style>{`
        .contact-page { max-width: 560px; }
        .contact-sub {
          margin-top: 16px;
          font-size: 16px;
          line-height: 1.6;
          color: var(--ink-soft);
          text-align: center;
        }
        .contact-form { display: flex; flex-direction: column; gap: 16px; margin-top: 8px; }
        .contact-form textarea {
          width: 100%;
          resize: vertical;
          font-family: inherit;
          font-size: 15px;
          line-height: 1.5;
          padding: 12px 14px;
          border-radius: 10px;
          border: 1px solid var(--line);
          background: var(--panel, rgba(255,255,255,0.03));
          color: inherit;
        }
        .contact-form button { align-self: center; margin-top: 8px; }
        .contact-error {
          color: #e08080;
          font-size: 13.5px;
          text-align: center;
        }
        .contact-success {
          text-align: center;
          font-size: 17px;
          line-height: 1.6;
          color: var(--gold);
          padding: 32px 16px;
          border: 1px solid var(--line);
          border-radius: 14px;
        }
        .contact-direct {
          text-align: center;
          margin-top: 40px;
          padding-top: 24px;
          border-top: 1px solid var(--line);
          font-size: 14px;
          color: var(--ink-soft);
        }
        .contact-direct a { color: var(--gold); }
      `}</style>
    </div>
  );
}

// =========== Profile ===========
function buildMonthGrid(year, month) {
  // Grilla de 6 semanas (Lunes primero), siempre completa para que el
  // calendario no salte de alto entre meses.
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const cursor = new Date(year, month, 1 - startOffset);
  const weeks = [];
  for (let w = 0; w < 6; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const y = cursor.getFullYear(), m = cursor.getMonth(), day = cursor.getDate();
      const dateKey = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      week.push({ day, dateKey, inMonth: m === month });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

function ProfilePage({ lang, profile, updateProfile, readings, setRoute, planInfo, deleteReading, updateReading, onSignOut, requireAuth }) {
  const { TarotCard } = window;
  const t = window.I18N[lang];
  const es = lang === 'es';
  const fileInputRef = React.useRef(null);

  const [editing, setEditing] = React.useState(false);
  const [draftName, setDraftName] = React.useState(profile.name || '');
  const [draftEmail, setDraftEmail] = React.useState(profile.email || '');
  const [draftGender, setDraftGender] = React.useState(profile.gender || null);
  const [photoBusy, setPhotoBusy] = React.useState(false);
  const [photoError, setPhotoError] = React.useState('');

  const startEdit = () => {
    setDraftName(profile.name || '');
    setDraftEmail(profile.email || '');
    setDraftGender(profile.gender || null);
    setEditing(true);
  };
  const saveEdit = () => {
    // El email no se edita desde acá -- es la identidad de la cuenta
    // (ver src/data/profile.js / la acción "update-account" del backend).
    updateProfile({ name: draftName, gender: draftGender });
    setEditing(false);
  };

  const onPickPhoto = () => fileInputRef.current && fileInputRef.current.click();
  const onPhotoFile = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setPhotoError(es ? 'Elegí un archivo de imagen.' : 'Please choose an image file.');
      return;
    }
    setPhotoBusy(true);
    setPhotoError('');
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = 320;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale, h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        updateProfile({ photo: dataUrl });
        setPhotoBusy(false);
      };
      img.onerror = () => {
        setPhotoBusy(false);
        setPhotoError(es ? 'No se pudo procesar la imagen.' : 'Could not process the image.');
      };
      img.src = reader.result;
    };
    reader.onerror = () => {
      setPhotoBusy(false);
      setPhotoError(es ? 'No se pudo leer el archivo.' : 'Could not read the file.');
    };
    reader.readAsDataURL(file);
  };
  const removePhoto = () => updateProfile({ photo: null });
  const handleSignOut = () => {
    if (window.confirm(t.profile_signout_confirm)) onSignOut && onSignOut();
  };

  // Insignia de plan — ahora se resuelve una sola vez en App.jsx y se
  // comparte con ReadingPage (guardado automático del historial).
  const planLabel = planInfo && planInfo.isSubscriber
    ? ({ luna: 'Luna', estrella: 'Estrella', oraculo: 'Oráculo' }[planInfo.planKey] || planInfo.planKey)
    : null;
  // El Cofre de Respuestas es un beneficio solo de Estrella y Oráculo.
  const isCofreEligible = !!(planInfo && planInfo.isSubscriber && ['estrella', 'oraculo'].includes(planInfo.planKey));

  // 2026-09-10 (rediseño del Cofre a pedido de Christian): el Cofre ya no
  // se muestra apilado debajo del historial -- ahora es una pestaña propia
  // dentro del Perfil, con su propio espacio y su propia identidad visual.
  const [profileTab, setProfileTab] = React.useState('historial');

  // ===== Historial: búsqueda/filtros + cajón de temas =====
  const [historySearch, setHistorySearch] = React.useState('');
  const [historyFrom, setHistoryFrom] = React.useState('');
  const [historyTo, setHistoryTo] = React.useState('');
  const [historyTag, setHistoryTag] = React.useState('');
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [viewReading, setViewReading] = React.useState(null);

  // ===== Califica la Aplicación =====
  const [rateOpen, setRateOpen] = React.useState(false);
  const [rateValue, setRateValue] = React.useState(0);
  const [rateComment, setRateComment] = React.useState('');
  const [rateBusy, setRateBusy] = React.useState(false);
  const [rateDone, setRateDone] = React.useState(false);
  const [rateError, setRateError] = React.useState('');
  const closeRate = () => { setRateOpen(false); setRateValue(0); setRateComment(''); setRateDone(false); setRateError(''); };
  const submitRating = () => {
    if (!rateValue || rateBusy) return;
    setRateBusy(true); setRateError('');
    window.arcanaSubmitAppRating({ rating: rateValue, email: profile.email || '', comment: rateComment })
      .then(() => setRateDone(true))
      .catch((e) => setRateError(e.message || (es ? 'No se pudo enviar. Probá de nuevo.' : 'Could not send. Please try again.')))
      .finally(() => setRateBusy(false));
  };

  // ===== Sugerencias =====
  const [suggestOpen, setSuggestOpen] = React.useState(false);
  const [suggestText, setSuggestText] = React.useState('');
  const [suggestBusy, setSuggestBusy] = React.useState(false);
  const [suggestDone, setSuggestDone] = React.useState(false);
  const [suggestError, setSuggestError] = React.useState('');
  const closeSuggest = () => { setSuggestOpen(false); setSuggestText(''); setSuggestDone(false); setSuggestError(''); };
  const submitSuggestion = () => {
    if (!suggestText.trim() || suggestBusy) return;
    setSuggestBusy(true); setSuggestError('');
    window.arcanaSubmitSuggestion({ message: suggestText.trim(), email: profile.email || '' })
      .then(() => setSuggestDone(true))
      .catch((e) => setSuggestError(e.message || (es ? 'No se pudo enviar. Probá de nuevo.' : 'Could not send. Please try again.')))
      .finally(() => setSuggestBusy(false));
  };

  // ===== Cancelar Membresía — 1) motivo -> 2) oferta de retención (25% off
  // un ciclo más) -> acepta (queda en el plan con descuento) o declina
  // (cancela de verdad contra PayPal) =====
  const CANCEL_REASONS = [
    { key: 'too_expensive', es: 'Es muy caro', en: "It's too expensive" },
    { key: 'not_using', es: 'No lo estoy usando', en: "I'm not using it" },
    { key: 'missing_features', es: 'Le faltan funciones que necesito', en: 'Missing features I need' },
    { key: 'found_alternative', es: 'Encontré otra alternativa', en: 'Found another alternative' },
    { key: 'other', es: 'Otro motivo', en: 'Other reason' },
  ];
  const [cancelStep, setCancelStep] = React.useState(null); // null | 'reason' | 'offer' | 'offer-done' | 'cancelled'
  const [cancelReason, setCancelReason] = React.useState('');
  const [cancelDetail, setCancelDetail] = React.useState('');
  const [cancelBusy, setCancelBusy] = React.useState(false);
  const [cancelError, setCancelError] = React.useState('');
  const [offerNeedsApproval, setOfferNeedsApproval] = React.useState(false);
  const openCancelFlow = () => { setCancelStep('reason'); setCancelReason(''); setCancelDetail(''); setCancelError(''); setOfferNeedsApproval(false); };
  const closeCancelFlow = () => { setCancelStep(null); setCancelBusy(false); setCancelError(''); };
  const cancelReasonLabel = () => {
    const found = CANCEL_REASONS.find((r) => r.key === cancelReason);
    return found ? found[es ? 'es' : 'en'] : cancelReason;
  };
  const goToOffer = () => { if (cancelReason) setCancelStep('offer'); };
  const acceptRetentionOffer = () => {
    if (cancelBusy) return;
    setCancelBusy(true); setCancelError('');
    window.arcanaApplyRetentionOffer()
      .then((res) => {
        setOfferNeedsApproval(!!res.needsApproval);
        if (res.needsApproval && res.approveUrl) window.open(res.approveUrl, '_blank', 'noopener');
        setCancelStep('offer-done');
      })
      .catch((e) => setCancelError(e.message || (es ? 'No se pudo aplicar la oferta. Probá de nuevo.' : 'Could not apply the offer. Please try again.')))
      .finally(() => setCancelBusy(false));
  };
  const declineOfferAndCancel = () => {
    if (cancelBusy) return;
    setCancelBusy(true); setCancelError('');
    window.arcanaCancelSubscription({ reason: cancelReasonLabel(), reasonDetail: cancelDetail.trim() })
      .then(() => { setCancelStep('cancelled'); setPlanInfo(null); })
      .catch((e) => setCancelError(e.message || (es ? 'No se pudo cancelar. Probá de nuevo o escribinos a comentarios@luxastral.com.' : 'Could not cancel. Please try again or write to comentarios@luxastral.com.')))
      .finally(() => setCancelBusy(false));
  };

  // Agenda / calendario — notas cortas por día, 100% local.
  const [agenda, setAgenda] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem('vela_agenda') || '{}'); } catch (e) { return {}; }
  });
  const today = new Date();
  const [calYear, setCalYear] = React.useState(today.getFullYear());
  const [calMonth, setCalMonth] = React.useState(today.getMonth());
  const [selectedDay, setSelectedDay] = React.useState(null);
  const [noteDraft, setNoteDraft] = React.useState('');
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const weeks = React.useMemo(() => buildMonthGrid(calYear, calMonth), [calYear, calMonth]);
  const weekdayLabels = es ? ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'] : ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  const goPrevMonth = () => {
    const m = calMonth - 1;
    if (m < 0) { setCalMonth(11); setCalYear(calYear - 1); } else setCalMonth(m);
  };
  const goNextMonth = () => {
    const m = calMonth + 1;
    if (m > 11) { setCalMonth(0); setCalYear(calYear + 1); } else setCalMonth(m);
  };
  const selectDay = (dateKey) => {
    setSelectedDay(dateKey);
    setNoteDraft(agenda[dateKey] || '');
  };
  const saveNote = (clear) => {
    if (!selectedDay) return;
    const next = { ...agenda };
    const value = clear ? '' : noteDraft;
    if (value.trim()) next[selectedDay] = value.trim();
    else delete next[selectedDay];
    setAgenda(next);
    setNoteDraft(value);
    try { localStorage.setItem('vela_agenda', JSON.stringify(next)); } catch (e) {}
  };

  const stats = computeStats(readings);
  const [bundleBusy, setBundleBusy] = React.useState(false);
  const downloadAll = () => {
    setBundleBusy(true);
    try { window.arcanaExportReadingsBundlePDF(readings.slice().reverse(), lang); }
    finally { setBundleBusy(false); }
  };
  const downloadOne = (reading) => window.arcanaExportReadingPDF(reading, lang);

  // Lecturas archivadas (con tema/tag) van al cajón, aparte del listado
  // principal, que muestra el resto ordenado por fecha o por "relevancia"
  // (coincidencias del término buscado) cuando hay una búsqueda activa.
  const mainReadings = readings.filter((r) => !r.tag);
  const archivedReadings = readings.filter((r) => r.tag);
  const allTags = Array.from(new Set(archivedReadings.map((r) => r.tag))).sort();
  const inDateRange = (r) => {
    const d = r.date.slice(0, 10);
    if (historyFrom && d < historyFrom) return false;
    if (historyTo && d > historyTo) return false;
    return true;
  };
  const searchScore = (r, term) => {
    if (!term) return 1;
    const hay = `${r.question || ''} ${r.interpretation || ''} ${spreadName(r.spread, t)}`.toLowerCase();
    if (!hay.includes(term)) return 0;
    let count = 0, idx = 0;
    while ((idx = hay.indexOf(term, idx)) !== -1) { count++; idx += term.length; }
    return count;
  };
  const term = historySearch.trim().toLowerCase();
  let visibleMain = mainReadings
    .filter(inDateRange)
    .map((r) => ({ r, score: searchScore(r, term) }))
    .filter((x) => x.score > 0);
  visibleMain.sort(term ? (a, b) => b.score - a.score : (a, b) => new Date(b.r.date) - new Date(a.r.date));
  visibleMain = visibleMain.map((x) => x.r);
  const archivedByTag = {};
  archivedReadings
    .filter(inDateRange)
    .filter((r) => !historyTag || r.tag === historyTag)
    .filter((r) => searchScore(r, term) > 0)
    .forEach((r) => { (archivedByTag[r.tag] = archivedByTag[r.tag] || []).push(r); });
  Object.keys(archivedByTag).forEach((tag) => archivedByTag[tag].sort((a, b) => new Date(b.date) - new Date(a.date)));
  const cofreReadings = readings.filter((r) => r.special).sort((a, b) => new Date(b.date) - new Date(a.date));

  const onAskAgain = (r) => setRoute({ page: 'reading', spread: r.spread, resumeReading: r });
  const onDeleteReading = (id) => {
    if (window.confirm(t.profile_history_delete_confirm)) deleteReading(id);
  };
  const onArchive = (id, tag) => updateReading(id, { tag: tag || null });
  const onToggleSpecial = (id, val, label) => updateReading(id, { special: val, specialLabel: val ? (label || null) : null });

  // 2026-09-10 (a pedido de Christian): Perfil ya se puede visitar sin
  // login (navegar el sitio es libre) -- pero no hay nada que mostrar
  // sin una cuenta real, así que invitamos a registrarse/iniciar sesión
  // en vez de renderizar el resto de esta página vacío/roto.
  if (!(profile && profile.loggedIn)) {
    return (
      <div className="page profile-page">
        <div className="profile-hero" style={{ textAlign: 'center' }}>
          <h1 className="welcome-h">{t.profile_login_required_h}</h1>
          <p className="italic" style={{ marginTop: 10 }}>{t.profile_login_required_body}</p>
          <button
            className="btn btn-primary btn-lg"
            style={{ marginTop: 22 }}
            onClick={() => requireAuth && requireAuth(() => setRoute({ page: 'profile' }))}
          >
            {t.profile_login_required_cta}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page profile-page">
      <div className="profile-hero">
        <div className="profile-avatar-wrap">
          <div
            className="profile-avatar"
            style={profile.photo ? { backgroundImage: `url(${profile.photo})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
          >
            {!profile.photo && (profile.name || '✦').charAt(0).toUpperCase()}
          </div>
          <button className="profile-avatar-edit" onClick={onPickPhoto} disabled={photoBusy} title={es ? 'Cambiar foto' : 'Change photo'}>
            {photoBusy ? '…' : '📷'}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onPhotoFile} />
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div className="eyebrow">— {t.profile_h} —</div>
          <h1 className="profile-name">{profile.name || (es ? 'Buscador/a de Lux Astral' : 'Lux Astral seeker')}</h1>
          <div className="profile-pills">
            {profile.email && <span className="profile-pill">{profile.email}</span>}
            <span className={`profile-pill ${planLabel ? 'is-gold' : ''}`}>
              {planLabel ? `✦ ${es ? 'Miembro' : 'Member'} ${planLabel}` : (es ? 'Plan Vela (gratis)' : 'Vela plan (free)')}
            </span>
          </div>
          {photoError && <p style={{ color: '#e08080', fontSize: 13, marginTop: 8 }}>{photoError}</p>}
          {profile.photo && !editing && (
            <button className="profile-link-btn" onClick={removePhoto}>{es ? 'Quitar foto' : 'Remove photo'}</button>
          )}
        </div>
        {!editing && (
          <button className="btn btn-ghost" onClick={startEdit}>✎ {es ? 'Editar perfil' : 'Edit profile'}</button>
        )}
      </div>

      {editing && (
        <div className="profile-edit-form">
          <div className="form-field">
            <label>{es ? '¿Cómo quieres que te llamemos?' : 'What should we call you?'}</label>
            <input type="text" value={draftName} onChange={(e) => setDraftName(e.target.value)} maxLength={40} />
          </div>
          <div className="form-field">
            <label>Email</label>
            <input type="email" value={draftEmail} readOnly disabled title={es ? 'Es el email de tu cuenta.' : 'This is your account email.'} />
          </div>
          <div className="form-field">
            <label>{t.onb_gender_label}</label>
            <div className="profile-chips">
              {[
                { id: 'femenino', label: t.onb_gender_femenino },
                { id: 'masculino', label: t.onb_gender_masculino },
                { id: 'no-binario', label: t.onb_gender_no_binario },
                { id: 'prefiero-no-decir', label: t.onb_gender_prefiero_no_decir },
              ].map((g) => (
                <button
                  key={g.id}
                  type="button"
                  className={`profile-chip ${draftGender === g.id ? 'is-selected' : ''}`}
                  onClick={() => setDraftGender(draftGender === g.id ? null : g.id)}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-primary" onClick={saveEdit}>✓ {es ? 'Guardar cambios' : 'Save changes'}</button>
            <button className="btn btn-ghost" onClick={() => setEditing(false)}>{es ? 'Cancelar' : 'Cancel'}</button>
          </div>
        </div>
      )}

      <div className="profile-stats">
        <div className="profile-stat">
          <div className="profile-stat-ico">✦</div>
          <div className="profile-stat-value">{stats.count}</div>
          <div className="profile-stat-label">{t.profile_stats_readings}</div>
        </div>
        <div className="profile-stat">
          <div className="profile-stat-ico">☾</div>
          <div className="profile-stat-value">{stats.days}</div>
          <div className="profile-stat-label">{t.profile_stats_days}</div>
        </div>
        <div className="profile-stat">
          <div className="profile-stat-ico">🂡</div>
          <div className="profile-stat-value italic" style={{ fontSize: 22 }}>
            {stats.topCard ? (lang === 'es' ? stats.topCard.name_es : stats.topCard.name_en) : '—'}
          </div>
          <div className="profile-stat-label">{t.profile_stats_favorite}</div>
        </div>
      </div>

      <div className="profile-agenda">
        <div className="profile-agenda-head">
          <div className="eyebrow">— {es ? 'Tu agenda' : 'Your agenda'} —</div>
          <button className="btn btn-primary" onClick={() => setRoute({ page: 'marketplace' })}>
            ✦ {es ? 'Agendar una consulta' : 'Book a session'}
          </button>
        </div>
        <div className="profile-cal">
          <div className="profile-cal-nav">
            <button className="profile-cal-arrow" onClick={goPrevMonth}>‹</button>
            <div className="profile-cal-label">{t.month_names[calMonth]} {calYear}</div>
            <button className="profile-cal-arrow" onClick={goNextMonth}>›</button>
          </div>
          <div className="profile-cal-grid profile-cal-weekdays">
            {weekdayLabels.map((w) => <div key={w} className="profile-cal-weekday">{w}</div>)}
          </div>
          {weeks.map((week, wi) => (
            <div className="profile-cal-grid" key={wi}>
              {week.map((cell, ci) => (
                <button
                  key={ci}
                  className={`profile-cal-day ${!cell.inMonth ? 'is-outside' : ''} ${cell.dateKey === todayKey ? 'is-today' : ''} ${cell.dateKey === selectedDay ? 'is-selected' : ''}`}
                  onClick={() => selectDay(cell.dateKey)}
                >
                  {cell.day}
                  {agenda[cell.dateKey] && <span className="profile-cal-dot" />}
                </button>
              ))}
            </div>
          ))}
        </div>
        {selectedDay && (
          <div className="profile-agenda-note">
            <div className="profile-agenda-note-date">
              {new Date(selectedDay + 'T00:00:00').toLocaleDateString(es ? 'es-CL' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
            <textarea
              placeholder={es ? 'Anotá algo para este día…' : 'Jot something down for this day…'}
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              maxLength={280}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => saveNote(false)}>{es ? 'Guardar nota' : 'Save note'}</button>
              {agenda[selectedDay] && (
                <button className="profile-link-btn" onClick={() => saveNote(true)}>{es ? 'Borrar' : 'Delete'}</button>
              )}
            </div>
          </div>
        )}
      </div>

      {isCofreEligible && (
        <div className="profile-tabs">
          <button
            className={`profile-tab-btn${profileTab === 'historial' ? ' is-active' : ''}`}
            onClick={() => setProfileTab('historial')}
          >
            📜 {es ? 'Mi historial' : 'My history'}
          </button>
          <button
            className={`profile-tab-btn profile-tab-btn-cofre${profileTab === 'cofre' ? ' is-active' : ''}`}
            onClick={() => setProfileTab('cofre')}
          >
            ✦ {t.profile_cofre_h}
          </button>
        </div>
      )}

      {profileTab === 'historial' && (
      <div className="profile-history">
        <div className="profile-history-head">
          <div className="eyebrow">— {t.profile_history_h} —</div>
          {readings.length > 0 && (
            <button className="btn btn-ghost" onClick={downloadAll} disabled={bundleBusy}>
              ⇩ {es ? 'Descargar todo en PDF' : 'Download all as PDF'}
            </button>
          )}
        </div>
        {readings.length === 0 ? (
          <div className="profile-empty">
            <p className="italic">"{t.profile_empty}"</p>
            <button className="btn btn-primary" onClick={() => setRoute({ page: 'readings' })}>
              {t.profile_empty_cta} ✦
            </button>
          </div>
        ) : (
          <React.Fragment>
            <div className="profile-history-filters">
              <input
                type="text"
                className="profile-history-search"
                placeholder={t.profile_history_search_ph}
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
              />
              <input type="date" value={historyFrom} onChange={(e) => setHistoryFrom(e.target.value)} title={t.profile_history_from} />
              <input type="date" value={historyTo} onChange={(e) => setHistoryTo(e.target.value)} title={t.profile_history_to} />
              {allTags.length > 0 && (
                <select value={historyTag} onChange={(e) => setHistoryTag(e.target.value)}>
                  <option value="">{t.profile_history_tag_all}</option>
                  {allTags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
                </select>
              )}
            </div>
            {visibleMain.length === 0 ? (
              <p className="italic" style={{ color: 'var(--ink-soft)', padding: '12px 0' }}>{t.profile_history_no_results}</p>
            ) : term ? (
              // Con una busqueda activa el orden es por relevancia, no por
              // fecha -- agrupar por tiempo aqui mezclaria el criterio y
              // confundiria mas de lo que ordena. Se deja la lista plana.
              <div className="profile-history-list">
                {visibleMain.map((r) => (
                  <HistoryRow
                    key={r.id}
                    r={r}
                    lang={lang}
                    t={t}
                    es={es}
                    isCofreEligible={isCofreEligible}
                    onDelete={onDeleteReading}
                    onArchive={onArchive}
                    onView={setViewReading}
                    onAskAgain={onAskAgain}
                    onToggleSpecial={onToggleSpecial}
                  />
                ))}
              </div>
            ) : (
              groupReadingsByTime(visibleMain, es).map((group) => (
                <div key={group.label} className="profile-history-group">
                  <div className="profile-history-group-h">{group.label}</div>
                  <div className="profile-history-list">
                    {group.items.map((r) => (
                      <HistoryRow
                        key={r.id}
                        r={r}
                        lang={lang}
                        t={t}
                        es={es}
                        isCofreEligible={isCofreEligible}
                        onDelete={onDeleteReading}
                        onArchive={onArchive}
                        onView={setViewReading}
                        onAskAgain={onAskAgain}
                        onToggleSpecial={onToggleSpecial}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
            {archivedReadings.length > 0 && (
              <div className="profile-drawer">
                <button className="profile-drawer-toggle" onClick={() => setDrawerOpen((v) => !v)}>
                  🗂 {t.profile_drawer_h} ({archivedReadings.length}) {drawerOpen ? '▲' : '▼'}
                </button>
                {drawerOpen && (
                  <div className="profile-drawer-body">
                    {Object.keys(archivedByTag).length === 0 ? (
                      <p className="italic" style={{ color: 'var(--ink-soft)' }}>{t.profile_history_no_results}</p>
                    ) : (
                      Object.keys(archivedByTag).sort().map((tag) => (
                        <div key={tag} className="profile-drawer-group">
                          <div className="profile-drawer-group-h">🗂 {tag} <span>({archivedByTag[tag].length})</span></div>
                          <div className="profile-history-list">
                            {archivedByTag[tag].map((r) => (
                              <HistoryRow
                                key={r.id}
                                r={r}
                                lang={lang}
                                t={t}
                                es={es}
                                isCofreEligible={isCofreEligible}
                                onDelete={onDeleteReading}
                                onArchive={onArchive}
                                onView={setViewReading}
                                onAskAgain={onAskAgain}
                                onToggleSpecial={onToggleSpecial}
                              />
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </React.Fragment>
        )}
      </div>
      )}

      {profileTab === 'cofre' && isCofreEligible && (
        <CofreSection
          key={cofreReadings.length /* fuerza remount -> reanima la apertura si cambia el contenido */}
          cofreReadings={cofreReadings}
          lang={lang}
          t={t}
          es={es}
          onView={setViewReading}
          onToggleSpecial={onToggleSpecial}
          updateReading={updateReading}
        />
      )}

      {/* ===== Tu opinión y tu cuenta ===== */}
      <div className="profile-account-actions">
        <div className="eyebrow">— {es ? 'Tu opinión y tu cuenta' : 'Your feedback and your account'} —</div>
        <div className="profile-account-btns">
          <button className="btn btn-ghost" onClick={() => setRateOpen(true)}>
            ⭐ {es ? 'Califica la Aplicación' : 'Rate the App'}
          </button>
          <button className="btn btn-ghost" onClick={() => setSuggestOpen(true)}>
            💬 {es ? 'Sugerencias' : 'Suggestions'}
          </button>
          <button className="btn btn-ghost" onClick={() => setRoute({ page: 'pricing' })}>
            ✦ {es ? 'Mejorar mi plan' : 'Upgrade'}
          </button>
          <button className="btn btn-ghost" onClick={handleSignOut}>
            {t.profile_signout}
          </button>
          {planInfo && planInfo.isSubscriber && (
            <button className="btn btn-ghost profile-cancel-btn" onClick={openCancelFlow}>
              {es ? 'Cancelar Membresía' : 'Cancel Membership'}
            </button>
          )}
        </div>
      </div>

      {/* ===== Modal: Ver lectura guardada ===== */}
      {viewReading && (
        <div className="modal-overlay" onClick={() => setViewReading(null)}>
          <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setViewReading(null)}>✕</button>
            <ReadingViewModal reading={viewReading} lang={lang} t={t} es={es} />
          </div>
        </div>
      )}

      {/* ===== Modal: Califica la Aplicación ===== */}
      {rateOpen && (
        <div className="modal-overlay" onClick={closeRate}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeRate}>✕</button>
            {!rateDone ? (
              <>
                <h2 className="live-modal-h">{es ? 'Califica la Aplicación' : 'Rate the App'}</h2>
                <p className="italic" style={{ marginBottom: 20 }}>
                  {es ? '¿Qué te está pareciendo Lux Astral? Tu opinión nos ayuda a mejorar.' : 'How has Lux Astral been for you? Your feedback helps us improve.'}
                </p>
                <div className="rating-stars">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`rating-star ${n <= rateValue ? 'is-filled' : ''}`}
                      onClick={() => setRateValue(n)}
                      aria-label={String(n)}
                    >★</button>
                  ))}
                </div>
                <div className="form-field" style={{ marginTop: 18 }}>
                  <label>{es ? 'Comentario (opcional)' : 'Comment (optional)'}</label>
                  <textarea value={rateComment} onChange={(e) => setRateComment(e.target.value)} maxLength={1000} />
                </div>
                {rateError && <p className="italic" style={{ color: '#e08080', marginBottom: 12 }}>{rateError}</p>}
                <button className="btn btn-primary" style={{ width: '100%' }} onClick={submitRating} disabled={!rateValue || rateBusy}>
                  {rateBusy ? (es ? 'Enviando…' : 'Sending…') : (es ? 'Enviar calificación' : 'Send rating')}
                </button>
              </>
            ) : (
              <>
                <h2 className="live-modal-h">{es ? '¡Gracias por tu calificación!' : 'Thanks for your rating!'}</h2>
                <p className="italic" style={{ marginBottom: 20 }}>
                  {es ? 'La leemos con cariño — nos ayuda a mejorar Lux Astral.' : "We read every one — it helps us improve Lux Astral."}
                </p>
                <button className="btn btn-ghost" style={{ width: '100%' }} onClick={closeRate}>{es ? 'Cerrar' : 'Close'}</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ===== Modal: Sugerencias ===== */}
      {suggestOpen && (
        <div className="modal-overlay" onClick={closeSuggest}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeSuggest}>✕</button>
            {!suggestDone ? (
              <>
                <h2 className="live-modal-h">{es ? 'Sugerencias' : 'Suggestions'}</h2>
                <p className="italic" style={{ marginBottom: 20 }}>
                  {es ? '¿Qué te gustaría ver en Lux Astral? Leemos todo lo que nos escriben.' : "What would you like to see in Lux Astral? We read everything."}
                </p>
                <div className="form-field">
                  <label>{es ? 'Tu sugerencia' : 'Your suggestion'}</label>
                  <textarea value={suggestText} onChange={(e) => setSuggestText(e.target.value)} maxLength={2000} autoFocus />
                </div>
                {suggestError && <p className="italic" style={{ color: '#e08080', marginBottom: 12 }}>{suggestError}</p>}
                <button className="btn btn-primary" style={{ width: '100%' }} onClick={submitSuggestion} disabled={!suggestText.trim() || suggestBusy}>
                  {suggestBusy ? (es ? 'Enviando…' : 'Sending…') : (es ? 'Enviar sugerencia' : 'Send suggestion')}
                </button>
              </>
            ) : (
              <>
                <h2 className="live-modal-h">{es ? '¡Gracias por tu sugerencia!' : 'Thanks for your suggestion!'}</h2>
                <button className="btn btn-ghost" style={{ width: '100%' }} onClick={closeSuggest}>{es ? 'Cerrar' : 'Close'}</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ===== Cancelar Membresía — flujo de 2 ventanas ===== */}
      {cancelStep === 'reason' && (
        <div className="modal-overlay" onClick={closeCancelFlow}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeCancelFlow}>✕</button>
            <h2 className="live-modal-h">{es ? 'Cancelar membresía' : 'Cancel membership'}</h2>
            <p className="italic" style={{ marginBottom: 18 }}>
              {es ? 'Antes de irte, ¿nos contás por qué?' : 'Before you go, could you tell us why?'}
            </p>
            <div className="cancel-reasons">
              {CANCEL_REASONS.map((r) => (
                <label key={r.key} className={`cancel-reason-opt ${cancelReason === r.key ? 'is-selected' : ''}`}>
                  <input type="radio" name="cancel-reason" value={r.key} checked={cancelReason === r.key} onChange={() => setCancelReason(r.key)} />
                  {r[es ? 'es' : 'en']}
                </label>
              ))}
            </div>
            <div className="form-field" style={{ marginTop: 16 }}>
              <label>{es ? 'Contanos más (opcional)' : 'Tell us more (optional)'}</label>
              <textarea value={cancelDetail} onChange={(e) => setCancelDetail(e.target.value)} maxLength={1000} />
            </div>
            <button className="btn btn-primary" style={{ width: '100%', marginTop: 6 }} onClick={goToOffer} disabled={!cancelReason}>
              {es ? 'Continuar' : 'Continue'}
            </button>
            <button className="btn btn-ghost" style={{ width: '100%', marginTop: 10 }} onClick={closeCancelFlow}>
              {es ? 'Mejor no, seguir con mi plan' : "Actually, keep my plan"}
            </button>
          </div>
        </div>
      )}

      {cancelStep === 'offer' && (
        <div className="modal-overlay" onClick={closeCancelFlow}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeCancelFlow}>✕</button>
            <h2 className="live-modal-h">{es ? 'Antes de que te vayas…' : 'Before you go…'}</h2>
            <p className="italic" style={{ marginBottom: 22 }}>
              {es
                ? 'Te ofrecemos 25% de descuento en tu próximo cobro. Después de ese ciclo, volvés al precio normal — sin ningún paso extra.'
                : "We'd like to offer you 25% off your next charge. After that cycle, you're back to the normal price — no extra steps."}
            </p>
            {cancelError && <p className="italic" style={{ color: '#e08080', marginBottom: 12 }}>{cancelError}</p>}
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={acceptRetentionOffer} disabled={cancelBusy}>
              {cancelBusy ? (es ? 'Aplicando…' : 'Applying…') : (es ? 'Sí, quiero el descuento' : 'Yes, I want the discount')}
            </button>
            <button className="btn btn-ghost" style={{ width: '100%', marginTop: 10 }} onClick={declineOfferAndCancel} disabled={cancelBusy}>
              {cancelBusy ? (es ? 'Cancelando…' : 'Cancelling…') : (es ? 'No gracias, cancelar membresía' : 'No thanks, cancel membership')}
            </button>
          </div>
        </div>
      )}

      {cancelStep === 'offer-done' && (
        <div className="modal-overlay" onClick={closeCancelFlow}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeCancelFlow}>✕</button>
            <h2 className="live-modal-h">{es ? '¡Listo!' : 'All set!'}</h2>
            <p className="italic" style={{ marginBottom: 20 }}>
              {offerNeedsApproval
                ? (es
                  ? 'Se abrió una pestaña de PayPal para confirmar el cambio — completala ahí. Si no la aprobás, tu membresía sigue exactamente como está, sin ningún cobro de más.'
                  : 'A PayPal tab opened to confirm the change — please complete it there. If you don’t approve it, your membership stays exactly as it is, with no extra charge.')
                : (es
                  ? 'Tu próximo cobro tendrá 25% de descuento. Después vuelve al precio normal.'
                  : 'Your next charge will have 25% off. After that it returns to the normal price.')}
            </p>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={closeCancelFlow}>{es ? 'Cerrar' : 'Close'}</button>
          </div>
        </div>
      )}

      {cancelStep === 'cancelled' && (
        <div className="modal-overlay" onClick={closeCancelFlow}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeCancelFlow}>✕</button>
            <h2 className="live-modal-h">{es ? 'Membresía cancelada' : 'Membership cancelled'}</h2>
            <p className="italic" style={{ marginBottom: 20 }}>
              {es ? 'Tu membresía fue cancelada. Podés volver cuando quieras.' : "Your membership has been cancelled. You're welcome back any time."}
            </p>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={closeCancelFlow}>{es ? 'Cerrar' : 'Close'}</button>
          </div>
        </div>
      )}

      <style>{`
        .profile-page { max-width: 1100px; }
        .profile-account-actions {
          margin-top: 56px;
          padding-top: 32px;
          border-top: 1px solid var(--line);
        }
        .profile-account-btns {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 18px;
        }
        .profile-cancel-btn { color: var(--ink-soft); border-color: var(--line); }
        .profile-cancel-btn:hover { color: #e08080; border-color: #e08080; }
        .rating-stars { display: flex; gap: 8px; }
        .rating-star {
          background: none; border: none; cursor: pointer;
          font-size: 34px; line-height: 1; color: var(--line);
          transition: color .15s, transform .15s;
        }
        .rating-star:hover { transform: scale(1.1); }
        .rating-star.is-filled { color: var(--gold); }
        .cancel-reasons { display: flex; flex-direction: column; gap: 10px; }
        .cancel-reason-opt {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 14px; border: 1px solid var(--line); border-radius: 8px;
          font-size: 14px; cursor: pointer;
        }
        .cancel-reason-opt input { accent-color: var(--gold); }
        .cancel-reason-opt.is-selected { border-color: var(--gold); background: rgba(212,168,90,.08); }
        .live-modal-h {
          font-family: 'Cinzel', serif;
          font-size: 24px;
          letter-spacing: 0.06em;
          font-weight: 400;
          margin-bottom: 20px;
        }
        .profile-hero {
          display: flex; align-items: flex-start; gap: 24px;
          margin-bottom: 32px; flex-wrap: wrap;
        }
        .profile-avatar-wrap { position: relative; flex-shrink: 0; }
        .profile-avatar {
          width: 88px; height: 88px; border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, var(--gold), var(--gold-deep));
          display: flex; align-items: center; justify-content: center;
          font-family: 'Cinzel', serif; font-size: 36px;
          color: var(--bg);
          box-shadow: 0 0 40px var(--gold-glow);
        }
        .profile-avatar-edit {
          position: absolute; bottom: -2px; right: -2px;
          width: 30px; height: 30px; border-radius: 50%;
          background: var(--bg); border: 1px solid var(--line);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; font-size: 13px;
        }
        .profile-avatar-edit:hover { border-color: var(--gold); }
        .profile-name { font-size: 34px; font-weight: 400; letter-spacing: 0.04em; margin: 4px 0 10px; }
        .profile-pills { display: flex; gap: 8px; flex-wrap: wrap; }
        .profile-pill {
          display: inline-block; padding: 5px 12px; border-radius: 999px;
          border: 1px solid var(--line); font-size: 12px; color: var(--ink-soft);
        }
        .profile-pill.is-gold { border-color: var(--gold); color: var(--gold); }
        .profile-link-btn {
          background: none; border: none; color: var(--ink-soft); text-decoration: underline;
          font-size: 12px; cursor: pointer; padding: 6px 0; margin-top: 4px;
        }
        .profile-link-btn:hover { color: var(--gold); }
        .profile-edit-form {
          background: rgba(26, 20, 56, 0.4); border: 1px solid var(--line); border-radius: 12px;
          padding: 24px; margin-bottom: 32px; max-width: 480px;
        }
        .profile-chips { display: flex; gap: 8px; flex-wrap: wrap; }
        .profile-chip {
          padding: 8px 14px; border-radius: 999px; border: 1px solid var(--line);
          background: transparent; color: var(--ink-soft); font-size: 13px; cursor: pointer;
        }
        .profile-chip.is-selected { border-color: var(--gold); color: var(--gold); background: rgba(212,168,90,.1); }
        .profile-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 40px;
        }
        .profile-stat {
          background: rgba(26, 20, 56, 0.4);
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 22px;
          text-align: center;
        }
        .profile-stat-ico { font-size: 18px; color: var(--gold); opacity: .8; margin-bottom: 6px; }
        .profile-stat-value {
          font-family: 'Cinzel', serif;
          font-size: 34px;
          color: var(--gold);
          margin-bottom: 6px;
        }
        .profile-stat-label {
          font-family: 'Cinzel', serif;
          font-size: 10px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--ink-soft);
        }
        .profile-agenda { margin-bottom: 48px; }
        .profile-agenda-head { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; }
        .profile-cal {
          background: rgba(26, 20, 56, 0.4); border: 1px solid var(--line); border-radius: 12px; padding: 20px; max-width: 460px;
        }
        .profile-cal-nav { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
        .profile-cal-label { font-family: 'Cinzel', serif; font-size: 14px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--gold); }
        .profile-cal-arrow {
          width: 28px; height: 28px; border-radius: 50%; border: 1px solid var(--line); background: transparent;
          color: var(--ink); cursor: pointer;
        }
        .profile-cal-arrow:hover { border-color: var(--gold); color: var(--gold); }
        .profile-cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
        .profile-cal-weekdays { margin-bottom: 6px; }
        .profile-cal-weekday { text-align: center; font-size: 10px; letter-spacing: 0.1em; color: var(--ink-soft); text-transform: uppercase; }
        .profile-cal-day {
          position: relative; aspect-ratio: 1; border-radius: 8px; border: 1px solid transparent;
          background: transparent; color: var(--ink); font-size: 13px; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
        }
        .profile-cal-day.is-outside { color: var(--ink-soft); opacity: .35; }
        .profile-cal-day:hover { border-color: var(--line); }
        .profile-cal-day.is-today { border-color: var(--gold); }
        .profile-cal-day.is-selected { background: rgba(212,168,90,.18); border-color: var(--gold); }
        .profile-cal-dot { position: absolute; bottom: 4px; width: 4px; height: 4px; border-radius: 50%; background: var(--gold); }
        .profile-agenda-note {
          margin-top: 16px; max-width: 460px; background: rgba(26, 20, 56, 0.3); border: 1px dashed var(--line);
          border-radius: 12px; padding: 18px;
        }
        .profile-agenda-note-date { font-family: 'Cinzel', serif; font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--gold); margin-bottom: 10px; }
        .profile-agenda-note textarea {
          width: 100%; min-height: 70px; background: rgba(0,0,0,.15); border: 1px solid var(--line); border-radius: 8px;
          color: var(--ink); padding: 10px; font-family: inherit; font-size: 14px; margin-bottom: 12px; resize: vertical;
        }
        .profile-history-head { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; }
        .profile-empty {
          text-align: center;
          padding: 64px 32px;
          background: rgba(26, 20, 56, 0.3);
          border: 1px dashed var(--line);
          border-radius: 12px;
        }
        .profile-empty p { font-size: 22px; color: var(--ink-soft); margin-bottom: 24px; }
        .profile-history-list { display: flex; flex-direction: column; gap: 12px; }
        .profile-history-group + .profile-history-group { margin-top: 30px; }
        .profile-history-group-h {
          font-family: 'Cinzel', serif; font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase;
          color: var(--gold); margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px dashed var(--line);
        }
        .history-row {
          display: flex; gap: 20px; align-items: center;
          background: rgba(26, 20, 56, 0.4);
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 20px;
        }
        .history-cards { display: flex; gap: 6px; flex-shrink: 0; }
        .history-body { flex: 1; }
        .history-date {
          font-family: 'Cinzel', serif;
          font-size: 12px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--gold);
          margin-bottom: 4px;
        }
        .history-spread {
          font-family: 'Cinzel', serif;
          font-size: 14px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .history-q { color: var(--ink-soft); margin-top: 6px; font-size: 16px; }
        .profile-history-pdf {
          flex-shrink: 0; width: 38px; height: 38px; border-radius: 50%; border: 1px solid var(--line); background: transparent;
          color: var(--ink-soft); cursor: pointer; font-size: 16px;
        }
        .profile-history-pdf:hover { border-color: var(--gold); color: var(--gold); }
        .profile-history-filters {
          display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 18px;
        }
        .profile-history-search {
          flex: 1; min-width: 220px; background: rgba(15, 10, 36, 0.5); border: 1px solid var(--line); border-radius: 8px;
          padding: 10px 14px; color: var(--ink); font-family: inherit; font-size: 14px;
        }
        .profile-history-filters input[type="date"], .profile-history-filters select {
          background: rgba(15, 10, 36, 0.5); border: 1px solid var(--line); border-radius: 8px;
          padding: 10px 12px; color: var(--ink); font-family: inherit; font-size: 13px;
        }
        .history-chips { display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
        .history-chip {
          font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; font-family: 'Cinzel', serif;
          border: 1px solid var(--line); border-radius: 20px; padding: 4px 10px; color: var(--ink-soft);
        }
        .history-chip.is-special { border-color: var(--gold); color: var(--gold); }
        .history-inline-form { display: flex; gap: 8px; margin-top: 10px; align-items: center; flex-wrap: wrap; }
        .history-inline-form input {
          flex: 1; min-width: 160px; background: rgba(0,0,0,.15); border: 1px solid var(--line); border-radius: 8px;
          padding: 8px 10px; color: var(--ink); font-family: inherit; font-size: 13px;
        }
        .history-inline-form button { flex-shrink: 0; padding: 8px 12px; font-size: 12px; }
        .history-actions { display: flex; gap: 6px; flex-shrink: 0; flex-wrap: wrap; }
        .history-action-btn {
          width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--line); background: transparent;
          color: var(--ink-soft); cursor: pointer; font-size: 14px;
        }
        .history-action-btn:hover { border-color: var(--gold); color: var(--gold); }
        .history-action-danger:hover { border-color: #d98a8a; color: #d98a8a; }
        .profile-drawer { margin-top: 28px; border-top: 1px dashed var(--line); padding-top: 20px; }
        .profile-drawer-toggle {
          background: transparent; border: 1px solid var(--line); border-radius: 10px; color: var(--ink-soft);
          font-family: 'Cinzel', serif; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase;
          padding: 12px 18px; cursor: pointer; width: 100%; text-align: left;
        }
        .profile-drawer-toggle:hover { border-color: var(--gold); color: var(--gold); }
        .profile-drawer-body { margin-top: 16px; display: flex; flex-direction: column; gap: 22px; }
        .profile-drawer-group-h {
          font-family: 'Cinzel', serif; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase;
          color: var(--gold); margin-bottom: 10px;
        }
        .profile-drawer-group-h span { color: var(--ink-soft); text-transform: none; letter-spacing: 0; font-family: inherit; }
        .profile-tabs { display: flex; gap: 10px; margin: 8px 0 32px; flex-wrap: wrap; }
        .profile-tab-btn {
          background: transparent; border: 1px solid var(--line); border-radius: 999px; color: var(--ink-soft);
          font-family: 'Cinzel', serif; font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase;
          padding: 12px 22px; cursor: pointer; transition: border-color .2s, color .2s, background .2s;
        }
        .profile-tab-btn:hover { border-color: var(--gold); color: var(--gold); }
        .profile-tab-btn.is-active { background: rgba(212,168,90,.14); border-color: var(--gold); color: var(--gold); }
        .profile-tab-btn-cofre.is-active { background: rgba(180,140,240,.14); border-color: #b48cf0; color: #d9c6ff; }

        /* ===== Cofre de Respuestas -- espacio propio ===== */
        @keyframes cofre-portal-open {
          0% { opacity: 0; transform: scale(0.96) translateY(10px); filter: brightness(0.6); }
          60% { opacity: 1; filter: brightness(1.15); }
          100% { opacity: 1; transform: scale(1) translateY(0); filter: brightness(1); }
        }
        @keyframes cofre-particle-float {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          15% { opacity: .8; }
          85% { opacity: .6; }
          100% { transform: translateY(-40px) translateX(6px); opacity: 0; }
        }
        .cofre-portal {
          position: relative; overflow: hidden; margin: 8px 0 48px; border-radius: 20px;
          border: 1px solid var(--cofre-accent-soft, rgba(212,168,90,.35));
          background:
            radial-gradient(ellipse at 50% -10%, var(--cofre-accent-soft, rgba(212,168,90,.22)) 0%, transparent 60%),
            linear-gradient(180deg, rgba(20, 14, 42, 0.9) 0%, rgba(12, 8, 26, 0.96) 100%);
          box-shadow: 0 0 60px -20px var(--cofre-accent-soft, rgba(212,168,90,.35)) inset, 0 20px 50px -30px rgba(0,0,0,.6);
          animation: cofre-portal-open 900ms ease-out both;
          padding-bottom: 8px;
        }
        .cofre-particles { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
        .cofre-particle {
          position: absolute; border-radius: 50%; background: var(--cofre-accent, var(--gold));
          box-shadow: 0 0 6px 1px var(--cofre-accent, var(--gold));
          animation-name: cofre-particle-float; animation-timing-function: ease-in-out; animation-iteration-count: infinite;
        }
        .cofre-hero { position: relative; padding: 52px 32px 28px; text-align: center; }
        .cofre-hero .eyebrow { color: var(--cofre-accent, var(--gold)); }
        .cofre-hero-sub { max-width: 480px; margin: 10px auto 0; color: var(--ink-soft); font-size: 16px; }
        .cofre-hero-count { margin: 14px auto 0; font-family: 'Cinzel', serif; font-size: 13px; letter-spacing: 0.06em; color: var(--ink); }
        .cofre-controls { display: flex; flex-wrap: wrap; gap: 14px; align-items: center; justify-content: center; margin-top: 24px; }
        .cofre-seal-picker { display: flex; gap: 8px; align-items: center; }
        .cofre-seal-swatch {
          width: 22px; height: 22px; border-radius: 50%; border: 2px solid rgba(255,255,255,.25); cursor: pointer; padding: 0;
          transition: transform .15s, border-color .15s;
        }
        .cofre-seal-swatch:hover { transform: scale(1.15); }
        .cofre-seal-swatch.is-active { border-color: #fff; box-shadow: 0 0 0 2px var(--cofre-accent, var(--gold)); }
        .cofre-sound-toggle, .cofre-view-toggle, .cofre-grimoire-btn { font-size: 12px; }

        .cofre-echo {
          position: relative; margin: 0 32px 28px; padding: 16px 20px; border-radius: 12px; cursor: pointer;
          border: 1px dashed var(--cofre-accent, var(--gold)); background: var(--cofre-accent-soft, rgba(212,168,90,.12));
          display: flex; flex-direction: column; gap: 6px; transition: background .2s;
        }
        .cofre-echo:hover { background: var(--cofre-accent-soft, rgba(212,168,90,.22)); }
        .cofre-echo-tag { font-family: 'Cinzel', serif; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--cofre-accent, var(--gold)); }
        .cofre-echo-q { color: var(--ink); }

        .cofre-grid {
          position: relative; display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 20px; padding: 4px 32px 36px;
        }
        .cofre-gem {
          position: relative; border-radius: 16px; padding: 20px 20px 16px; cursor: pointer;
          border: 1px solid var(--cofre-accent-soft, rgba(212,168,90,.3));
          background: linear-gradient(160deg, rgba(255,255,255,.04) 0%, rgba(0,0,0,.15) 100%), rgba(26, 20, 56, 0.45);
          transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
        }
        .cofre-gem:hover {
          transform: translateY(-3px);
          border-color: var(--cofre-accent, var(--gold));
          box-shadow: 0 0 24px -6px var(--cofre-accent, var(--gold));
        }
        .cofre-gem.is-anchor { border-color: var(--cofre-accent, var(--gold)); box-shadow: 0 0 0 1px var(--cofre-accent, var(--gold)) inset; }
        .cofre-gem-anchor-badge {
          position: absolute; top: -11px; left: 16px; background: var(--cofre-accent, var(--gold)); color: #201434;
          font-family: 'Cinzel', serif; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase;
          padding: 4px 10px; border-radius: 999px; font-weight: 700;
        }
        .cofre-gem-cards { display: flex; gap: 4px; margin-bottom: 12px; }
        .cofre-gem-date { font-family: 'Cinzel', serif; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--cofre-accent, var(--gold)); margin-bottom: 8px; }
        .cofre-gem-snippet { color: var(--ink); font-size: 15px; line-height: 1.5; min-height: 44px; }
        .cofre-gem-resonance { margin-top: 10px; font-size: 12px; color: var(--cofre-accent, var(--gold)); }
        .cofre-gem-note-preview { margin-top: 10px; font-size: 12px; color: var(--ink-soft); }
        .cofre-gem-actions { display: flex; gap: 6px; margin-top: 14px; }
        .cofre-gem-action-btn {
          width: 32px; height: 32px; border-radius: 50%; border: 1px solid var(--line); background: transparent;
          color: var(--ink-soft); cursor: pointer; font-size: 13px;
        }
        .cofre-gem-action-btn:hover, .cofre-gem-action-btn.is-active { border-color: var(--cofre-accent, var(--gold)); color: var(--cofre-accent, var(--gold)); }
        .cofre-gem-note-form { margin-top: 12px; display: flex; flex-direction: column; gap: 8px; }
        .cofre-gem-note-form textarea {
          width: 100%; min-height: 60px; background: rgba(0,0,0,.2); border: 1px solid var(--line); border-radius: 8px;
          color: var(--ink); padding: 10px; font-family: inherit; font-size: 13px; resize: vertical;
        }
        .cofre-gem-note-form button { align-self: flex-end; font-size: 12px; padding: 6px 14px; }

        .cofre-constellation { padding: 8px 32px 36px; }
        .cofre-star { cursor: pointer; transition: r .15s; }
        .cofre-star:hover { filter: brightness(1.3); }
        .cofre-constellation-caption { text-align: center; color: var(--ink-soft); margin-top: 12px; }

        .profile-cofre-empty { text-align: center; color: var(--ink-soft); padding: 12px 32px 40px; }
        .modal-wide { max-width: 640px; }
        .reading-view-cards { display: flex; gap: 10px; flex-wrap: wrap; margin: 18px 0 24px; }
        .reading-view-interp { color: var(--ink); line-height: 1.7; margin-bottom: 20px; }
        .reading-view-interp p { margin-bottom: 14px; }
        .reading-view-actions { margin-top: 20px; display: flex; justify-content: flex-end; }
        @media (max-width: 640px) {
          .profile-hero { flex-direction: column; }
          .profile-stats { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}

// Agrupa un listado de lecturas (ya ordenado por fecha descendente) en
// baldes de tiempo -- Hoy / Ayer / Esta semana / Este mes / <Mes Año> --
// para que el historial del perfil se vea ordenado de un vistazo en vez
// de una lista plana. Solo tiene sentido cuando el orden es por fecha
// (no durante una busqueda por relevancia, ver uso en profile-history).
const HISTORY_MONTHS_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const HISTORY_MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function historyBucketLabel(date, now, es) {
  const startOfDay = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);
  if (diffDays === 0) return es ? 'Hoy' : 'Today';
  if (diffDays === 1) return es ? 'Ayer' : 'Yesterday';
  if (diffDays >= 2 && diffDays <= 6) return es ? 'Esta semana' : 'This week';
  if (date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()) {
    return es ? 'Este mes' : 'This month';
  }
  const monthName = es ? HISTORY_MONTHS_ES[date.getMonth()] : HISTORY_MONTHS_EN[date.getMonth()];
  const capitalized = es ? monthName.charAt(0).toUpperCase() + monthName.slice(1) : monthName;
  return `${capitalized} ${date.getFullYear()}`;
}
function groupReadingsByTime(list, es) {
  const now = new Date();
  const groups = [];
  const byLabel = new Map();
  list.forEach((r) => {
    const label = historyBucketLabel(new Date(r.date), now, es);
    if (!byLabel.has(label)) {
      const g = { label, items: [] };
      byLabel.set(label, g);
      groups.push(g);
    }
    byLabel.get(label).items.push(r);
  });
  return groups;
}

// ===== Cofre de Respuestas -- rediseno 2026-09-10 (a pedido de Christian) =====
// El Cofre dejo de reusar HistoryRow/profile-history-list: ahora es un
// espacio propio, con su propia identidad visual y funciones que el
// historial comun no tiene (notas privadas, ancla del mes, resonancia
// entre lecturas, vista Constelacion, sello personalizable, sonido). No
// requiere cambios de backend -- cofreNote y anchorMonth se guardan con
// el mismo updateReading(id, patch) generico que ya existia.

const COFRE_SEALS = {
  dorado: { label_es: 'Dorado', label_en: 'Gold', accent: '#d4a85a', soft: 'rgba(212,168,90,.28)' },
  amatista: { label_es: 'Amatista', label_en: 'Amethyst', accent: '#b48cf0', soft: 'rgba(180,140,240,.28)' },
  rosa: { label_es: 'Rosa', label_en: 'Rose', accent: '#e08fae', soft: 'rgba(224,143,174,.28)' },
  medianoche: { label_es: 'Medianoche', label_en: 'Midnight', accent: '#6f8cf0', soft: 'rgba(111,140,240,.28)' },
};

function cofreReadLocal(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v == null ? fallback : v;
  } catch (e) { return fallback; }
}
function cofreWriteLocal(key, value) {
  try { localStorage.setItem(key, value); } catch (e) {}
}

// Frase evocadora para la "joya" -- la etiqueta que le puso la usuaria si
// tiene una, si no la primera oracion de la interpretacion, si no la
// pregunta que hizo.
function cofreSnippet(r, es) {
  if (r.specialLabel) return r.specialLabel;
  const text = (r.interpretation || '').split('\n\n')[0] || '';
  const idx = text.search(/[.!?]/);
  const firstSentence = (idx >= 0 ? text.slice(0, idx + 1) : text).trim();
  if (firstSentence) {
    return firstSentence.length > 92 ? firstSentence.slice(0, 89).trim() + '…' : firstSentence;
  }
  if (r.question) return r.question;
  return es ? 'Un fragmento de tu camino.' : 'A fragment of your path.';
}

// Cuantas otras lecturas del Cofre comparten al menos una carta con cada
// lectura -- el "eco" entre respuestas guardadas.
function cofreComputeResonance(list) {
  const map = new Map();
  list.forEach((a) => {
    const aIds = new Set((a.picked || []).map((p) => p.id));
    let count = 0;
    list.forEach((b) => {
      if (a.id === b.id) return;
      if ((b.picked || []).some((p) => aIds.has(p.id))) count++;
    });
    map.set(a.id, count);
  });
  return map;
}

function cofreMonthKey(date) {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${d.getMonth()}`;
}

// Campanita suave (arpegio de 3 tonos) al abrir una joya -- generada con
// Web Audio, sin depender de ningun archivo de audio externo.
function cofrePlayChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    [660, 880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t0 = now + i * 0.07;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(0.05, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.9);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 1);
    });
    setTimeout(() => { try { ctx.close(); } catch (e) {} }, 1300);
  } catch (e) { /* silencioso -- es solo un adorno sensorial */ }
}

function CofreSection({ cofreReadings, lang, t, es, onView, onToggleSpecial, updateReading }) {
  const [seal, setSeal] = React.useState(() => cofreReadLocal('arcana_cofre_seal', 'dorado'));
  const [soundOn, setSoundOn] = React.useState(() => cofreReadLocal('arcana_cofre_sound', '1') !== '0');
  const [viewMode, setViewMode] = React.useState('joyas');
  const [echoReading, setEchoReading] = React.useState(null);

  const chooseSeal = (key) => { setSeal(key); cofreWriteLocal('arcana_cofre_seal', key); };
  const toggleSound = () => { setSoundOn((v) => { cofreWriteLocal('arcana_cofre_sound', v ? '0' : '1'); return !v; }); };

  // Eco del Cofre: una vez por mes, si hay algo guardado, trae de vuelta
  // una lectura al azar como un pequeno recordatorio.
  React.useEffect(() => {
    if (!cofreReadings.length) return;
    const key = 'arcana_cofre_echo_last';
    const monthKey = cofreMonthKey(new Date());
    if (cofreReadLocal(key, '') === monthKey) return;
    const pick = cofreReadings[Math.floor(Math.random() * cofreReadings.length)];
    setEchoReading(pick);
    cofreWriteLocal(key, monthKey);
    // eslint-disable-next-line
  }, []);

  const resonance = React.useMemo(() => cofreComputeResonance(cofreReadings), [cofreReadings]);
  const thisMonthKey = cofreMonthKey(new Date());
  const anchorId = React.useMemo(
    () => (cofreReadings.find((r) => r.anchorMonth === thisMonthKey) || {}).id || null,
    [cofreReadings, thisMonthKey]
  );

  const openReading = (r) => { if (soundOn) cofrePlayChime(); onView(r); };
  const setAnchor = (r) => {
    const nextValue = r.anchorMonth === thisMonthKey ? null : thisMonthKey;
    cofreReadings.forEach((other) => {
      if (other.id !== r.id && other.anchorMonth === thisMonthKey) updateReading(other.id, { anchorMonth: null });
    });
    updateReading(r.id, { anchorMonth: nextValue });
  };
  const setNote = (id, note) => updateReading(id, { cofreNote: note });

  const sealInfo = COFRE_SEALS[seal] || COFRE_SEALS.dorado;
  const particles = React.useMemo(() => (
    Array.from({ length: 16 }, () => ({
      left: Math.round(Math.random() * 100),
      top: Math.round(Math.random() * 100),
      delay: (Math.random() * 6).toFixed(2),
      dur: (7 + Math.random() * 6).toFixed(2),
      size: (2 + Math.random() * 3).toFixed(1),
    }))
  ), []);

  return (
    <div className="cofre-portal" style={{ '--cofre-accent': sealInfo.accent, '--cofre-accent-soft': sealInfo.soft }}>
      <div className="cofre-particles" aria-hidden="true">
        {particles.map((p, i) => (
          <span key={i} className="cofre-particle" style={{ left: `${p.left}%`, top: `${p.top}%`, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s`, width: `${p.size}px`, height: `${p.size}px` }} />
        ))}
      </div>

      <div className="cofre-hero">
        <div className="eyebrow">— ✦ {t.profile_cofre_h} —</div>
        <p className="italic cofre-hero-sub">{t.profile_cofre_sub}</p>
        <p className="cofre-hero-count">
          {cofreReadings.length === 0
            ? (es ? 'Tu Cofre todavía está vacío.' : 'Your Chest is still empty.')
            : (es
                ? `Tu Cofre guarda ${cofreReadings.length} fragmento${cofreReadings.length === 1 ? '' : 's'} de tu camino.`
                : `Your Chest holds ${cofreReadings.length} fragment${cofreReadings.length === 1 ? '' : 's'} of your path.`)}
        </p>

        <div className="cofre-controls">
          <div className="cofre-seal-picker" role="group" aria-label={es ? 'Sello del Cofre' : 'Chest seal'}>
            {Object.keys(COFRE_SEALS).map((key) => (
              <button
                key={key}
                className={`cofre-seal-swatch${seal === key ? ' is-active' : ''}`}
                style={{ background: COFRE_SEALS[key].accent }}
                title={es ? COFRE_SEALS[key].label_es : COFRE_SEALS[key].label_en}
                onClick={() => chooseSeal(key)}
              />
            ))}
          </div>
          <button className="btn btn-ghost cofre-sound-toggle" onClick={toggleSound}>
            {soundOn ? '🔔' : '🔕'} {es ? (soundOn ? 'Sonido activo' : 'Sonido silenciado') : (soundOn ? 'Sound on' : 'Sound off')}
          </button>
          {cofreReadings.length > 1 && (
            <button className="btn btn-ghost cofre-view-toggle" onClick={() => setViewMode((v) => (v === 'joyas' ? 'constelacion' : 'joyas'))}>
              {viewMode === 'joyas' ? `✨ ${es ? 'Ver Constelación' : 'View Constellation'}` : `💎 ${es ? 'Ver Joyas' : 'View Gems'}`}
            </button>
          )}
          <button className="btn btn-ghost cofre-grimoire-btn" onClick={() => window.arcanaExportGrimoire(cofreReadings, lang)}>
            📖 {es ? 'Descargar mi Grimorio' : 'Download my Grimoire'}
          </button>
        </div>
      </div>

      {echoReading && (
        <div className="cofre-echo" onClick={() => { openReading(echoReading); setEchoReading(null); }}>
          <span className="cofre-echo-tag">✦ {es ? 'Tu Cofre te recuerda esto hoy' : 'Your Chest reminds you of this today'}</span>
          <span className="cofre-echo-q italic">"{cofreSnippet(echoReading, es)}"</span>
        </div>
      )}

      {cofreReadings.length === 0 ? (
        <p className="italic profile-cofre-empty">{t.profile_cofre_empty}</p>
      ) : viewMode === 'constelacion' ? (
        <CofreConstellation readings={cofreReadings} t={t} es={es} onView={openReading} />
      ) : (
        <div className="cofre-grid">
          {cofreReadings.map((r) => (
            <CofreGem
              key={r.id}
              r={r}
              lang={lang}
              t={t}
              es={es}
              isAnchor={r.id === anchorId}
              resonantCount={resonance.get(r.id) || 0}
              onOpen={() => openReading(r)}
              onToggleSpecial={onToggleSpecial}
              onSetAnchor={() => setAnchor(r)}
              onSetNote={(note) => setNote(r.id, note)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CofreGem({ r, lang, t, es, isAnchor, resonantCount, onOpen, onToggleSpecial, onSetAnchor, onSetNote }) {
  const { TarotCard } = window;
  const cards = r.picked.map((p) => window.TAROT_CARDS.all.find((c) => c.id === p.id)).filter(Boolean);
  const d = new Date(r.date);
  const [noteOpen, setNoteOpen] = React.useState(false);
  const [noteDraft, setNoteDraft] = React.useState(r.cofreNote || '');

  return (
    <div className={`cofre-gem${isAnchor ? ' is-anchor' : ''}`} onClick={onOpen}>
      {isAnchor && <div className="cofre-gem-anchor-badge">📌 {es ? 'Ancla del mes' : "Month's anchor"}</div>}
      <div className="cofre-gem-cards">
        {cards.slice(0, 3).map((c, i) => (
          <div key={i} className="cofre-gem-card" style={{ width: 40 }}>
            <TarotCard card={c} lang={lang} revealed={true} compact={true} />
          </div>
        ))}
      </div>
      <div className="cofre-gem-date">{d.getDate()} {t.month_names[d.getMonth()]}, {d.getFullYear()}</div>
      <div className="cofre-gem-snippet italic">"{cofreSnippet(r, es)}"</div>
      {resonantCount > 0 && (
        <div className="cofre-gem-resonance">
          ✦ {es ? `Resuena con ${resonantCount} lectura${resonantCount === 1 ? '' : 's'} más` : `Resonates with ${resonantCount} more reading${resonantCount === 1 ? '' : 's'}`}
        </div>
      )}
      {r.cofreNote && !noteOpen && (
        <div className="cofre-gem-note-preview italic">🖋 "{r.cofreNote.length > 60 ? r.cofreNote.slice(0, 57) + '…' : r.cofreNote}"</div>
      )}
      <div className="cofre-gem-actions" onClick={(e) => e.stopPropagation()}>
        <button className={`cofre-gem-action-btn${isAnchor ? ' is-active' : ''}`} title={es ? 'Marcar como ancla del mes' : "Mark as this month's anchor"} onClick={onSetAnchor}>📌</button>
        <button className="cofre-gem-action-btn" title={es ? 'Nota privada' : 'Private note'} onClick={() => setNoteOpen((v) => !v)}>🖋</button>
        <button className="cofre-gem-action-btn" title={t.profile_cofre_remove} onClick={() => onToggleSpecial(r.id, false, null)}>✦✕</button>
      </div>
      {noteOpen && (
        <div className="cofre-gem-note-form" onClick={(e) => e.stopPropagation()}>
          <textarea
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder={es ? 'Cómo te sentiste al leer esto...' : 'How this felt to read...'}
            maxLength={280}
          />
          <button className="btn btn-ghost" onClick={() => { onSetNote(noteDraft.trim()); setNoteOpen(false); }}>✓ {es ? 'Guardar' : 'Save'}</button>
        </div>
      )}
    </div>
  );
}

function CofreConstellation({ readings, t, es, onView }) {
  const sorted = readings.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
  const w = 720, h = 260, pad = 30;
  const minT = sorted.length ? new Date(sorted[0].date).getTime() : 0;
  const maxT = sorted.length ? new Date(sorted[sorted.length - 1].date).getTime() : 1;
  const span = Math.max(1, maxT - minT);
  const hashY = (id) => {
    let hv = 0;
    const s = String(id);
    for (let i = 0; i < s.length; i++) hv = (hv * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(hv) % 100;
  };
  const points = sorted.map((reading) => {
    const t0 = new Date(reading.date).getTime();
    const x = pad + ((t0 - minT) / span) * (w - pad * 2);
    const y = pad + (hashY(reading.id) / 100) * (h - pad * 2);
    return { reading, x, y };
  });
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const lastId = points.length ? points[points.length - 1].reading.id : null;

  return (
    <div className="cofre-constellation">
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} role="img" aria-label={es ? 'Mapa de tus lecturas guardadas en el tiempo' : 'Map of your saved readings over time'}>
        <path d={pathD} fill="none" stroke="var(--cofre-accent, var(--gold))" strokeOpacity="0.35" strokeWidth="1.5" />
        {points.map((p) => (
          <circle
            key={p.reading.id}
            cx={p.x}
            cy={p.y}
            r={p.reading.id === lastId ? 7 : 5.5}
            fill="var(--cofre-accent, var(--gold))"
            className="cofre-star"
            onClick={() => onView(p.reading)}
          >
            <title>{`${spreadName(p.reading.spread, t)} — ${new Date(p.reading.date).toLocaleDateString(es ? 'es-CL' : 'en-US')}`}</title>
          </circle>
        ))}
      </svg>
      <p className="italic cofre-constellation-caption">{es ? 'El mapa de tu camino a través del tiempo.' : 'The map of your path through time.'}</p>
    </div>
  );
}

function HistoryRow({ r, lang, t, es, isCofreEligible, onDelete, onArchive, onView, onAskAgain, onToggleSpecial, cofreMode }) {
  const { TarotCard } = window;
  const cards = r.picked.map((p) => window.TAROT_CARDS.all.find((c) => c.id === p.id)).filter(Boolean);
  const d = new Date(r.date);
  const [tagOpen, setTagOpen] = React.useState(false);
  const [tagDraft, setTagDraft] = React.useState(r.tag || '');
  const [specialOpen, setSpecialOpen] = React.useState(false);
  const [specialDraft, setSpecialDraft] = React.useState(r.specialLabel || '');
  return (
    <div className="history-row">
      <div className="history-cards">
        {cards.slice(0, 5).map((c, i) => (
          <div key={i} style={{ width: 44 }}>
            <TarotCard card={c} lang={lang} revealed={true} compact={true} />
          </div>
        ))}
      </div>
      <div className="history-body">
        <div className="history-date">
          {d.getDate()} {t.month_names[d.getMonth()]}, {d.getFullYear()}
        </div>
        <div className="history-spread">{spreadName(r.spread, t)}</div>
        {r.question && <div className="history-q italic">"{r.question}"</div>}
        {(r.tag || r.special) && (
          <div className="history-chips">
            {r.tag && <span className="history-chip">🗂 {r.tag}</span>}
            {r.special && <span className="history-chip is-special">✦ {r.specialLabel || (es ? 'Especial' : 'Special')}</span>}
          </div>
        )}
        {tagOpen && (
          <div className="history-inline-form">
            <input value={tagDraft} onChange={(e) => setTagDraft(e.target.value)} placeholder={t.profile_history_tag_ph} maxLength={30} />
            <button className="btn btn-ghost" onClick={() => { onArchive(r.id, tagDraft.trim()); setTagOpen(false); }}>✓</button>
            <button className="btn btn-ghost" onClick={() => setTagOpen(false)}>✕</button>
          </div>
        )}
        {specialOpen && (
          <div className="history-inline-form">
            <input value={specialDraft} onChange={(e) => setSpecialDraft(e.target.value)} placeholder={t.profile_cofre_label_ph} maxLength={30} />
            <button className="btn btn-ghost" onClick={() => { onToggleSpecial(r.id, true, specialDraft.trim()); setSpecialOpen(false); }}>✓</button>
            <button className="btn btn-ghost" onClick={() => setSpecialOpen(false)}>✕</button>
          </div>
        )}
      </div>
      <div className="history-actions">
        <button className="history-action-btn" title={t.profile_history_view} onClick={() => onView(r)}>👁</button>
        <button className="history-action-btn" title={t.profile_history_ask_again} onClick={() => onAskAgain(r)}>↻</button>
        <button className="history-action-btn" title={es ? 'Descargar en PDF' : 'Download as PDF'} onClick={() => window.arcanaExportReadingPDF(r, lang)}>⇩</button>
        {!cofreMode && (
          r.tag ? (
            <button className="history-action-btn" title={t.profile_history_unarchive} onClick={() => onArchive(r.id, null)}>🗂✕</button>
          ) : (
            <button className="history-action-btn" title={t.profile_history_archive} onClick={() => setTagOpen((v) => !v)}>🗂</button>
          )
        )}
        {isCofreEligible && (
          r.special ? (
            <button className="history-action-btn" title={t.profile_cofre_remove} onClick={() => onToggleSpecial(r.id, false, null)}>✦✕</button>
          ) : (
            <button className="history-action-btn" title={t.profile_cofre_add} onClick={() => setSpecialOpen((v) => !v)}>✦</button>
          )
        )}
        <button className="history-action-btn history-action-danger" title={t.profile_history_delete} onClick={() => onDelete(r.id)}>✕</button>
      </div>
    </div>
  );
}

function ReadingViewModal({ reading, lang, t, es }) {
  const { TarotCard } = window;
  const cards = reading.picked.map((p) => window.TAROT_CARDS.all.find((c) => c.id === p.id)).filter(Boolean);
  const d = new Date(reading.date);
  return (
    <div className="reading-view">
      <div className="eyebrow">— {spreadName(reading.spread, t)} —</div>
      <h2 className="live-modal-h">{d.getDate()} {t.month_names[d.getMonth()]}, {d.getFullYear()}</h2>
      {reading.question && <p className="italic" style={{ marginBottom: 18 }}>"{reading.question}"</p>}
      <div className="reading-view-cards">
        {cards.map((c, i) => (
          <div key={i} style={{ width: 72 }}>
            <TarotCard card={c} lang={lang} revealed={true} compact={true} />
          </div>
        ))}
      </div>
      {reading.interpretation ? (
        <div className="reading-view-interp">
          {reading.interpretation.split('\n\n').map((para, i) => <p key={i}>{para}</p>)}
        </div>
      ) : (
        <p className="italic" style={{ color: 'var(--ink-soft)' }}>
          {es ? 'Esta lectura se guardó antes de que quedara registrada la interpretación.' : 'This reading was saved before interpretations were recorded.'}
        </p>
      )}
      {(reading.followUps || []).map((f, i) => (
        <div key={i} className="reveal-followup-item">
          <div className="reveal-followup-q">— {f.question}</div>
          <div className="reveal-followup-a italic">{f.answer}</div>
        </div>
      ))}
      <div className="reading-view-actions">
        <button className="btn btn-ghost" onClick={() => window.arcanaExportReadingPDF(reading, lang)}>⇩ {es ? 'Descargar en PDF' : 'Download as PDF'}</button>
      </div>
    </div>
  );
}

function computeStats(readings) {
  if (!readings.length) return { count: 0, days: 0, topCard: null };
  const dates = readings.map((r) => new Date(r.date).getTime());
  const min = Math.min(...dates);
  const days = Math.max(1, Math.floor((Date.now() - min) / (1000 * 60 * 60 * 24)));
  const count = readings.length;
  const freq = {};
  readings.forEach((r) => r.picked.forEach((p) => { freq[p.id] = (freq[p.id] || 0) + 1; }));
  const topId = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0];
  const topCard = topId ? window.TAROT_CARDS.all.find((c) => c.id === +topId) : null;
  return { count, days, topCard };
}

function spreadName(spread, t) {
  return {
    daily: t.reading_daily_name,
    three: t.reading_three_name,
    love: t.reading_love_name,
    celtic: t.reading_celtic_name,
    work: t.reading_work_name,
    free: t.reading_free_name,
    decision: t.reading_decision_name,
    six: t.reading_six_name,
    year: t.reading_year_name,
  }[spread] || spread;
}

// =========== Pricing ===========
function PricingPage({ lang, setRoute, profile }) {
  const t = window.I18N[lang];
  const go = (page) => { if (typeof setRoute === 'function') setRoute({ page }); };
  const [billing, setBilling] = React.useState('year'); // 'month' | 'year'
  const [openFaq, setOpenFaq] = React.useState(0);

  // Suscripción real con PayPal (cobro recurrente) — identificada por
  // email, sin cuentas/login. Ver acciones "subscription-plans" /
  // "confirm-subscription" en local-server.js / booking.mts.
  const [plansConfig, setPlansConfig] = React.useState({ plans: null, paypalClientId: '' });
  const [subOpen, setSubOpen] = React.useState(null); // { key: 'luna'|'oraculo', billing } mientras el modal está abierto
  // 2026-09-09 (a pedido de Christian): el email de la suscripción ya no
  // es un campo de texto libre -- se toma SIEMPRE de la cuenta
  // autenticada, así la suscripción queda atada a quien realmente paga
  // (el backend además lo re-verifica: ver requireUserAuth en la acción
  // "confirm-subscription").
  const [subEmail, setSubEmail] = React.useState(profile.email || '');
  const [subError, setSubError] = React.useState('');
  const [subState, setSubState] = React.useState('idle'); // idle | confirming | done | error
  const [subSdkLoaded, setSubSdkLoaded] = React.useState(false);
  const subSdkLoadingRef = React.useRef(false);
  const subButtonBoxRef = React.useRef(null);
  const subRenderedForRef = React.useRef(null);
  const subCtxRef = React.useRef({ email: '', planKey: '', billing: '' });

  React.useEffect(() => {
    window.arcanaSubscriptionPlans().then(setPlansConfig).catch(() => {});
  }, []);

  // El botón de suscripción necesita el SDK de PayPal cargado con
  // intent=subscription (distinto del intent=capture que usa el
  // Marketplace para pagos de una sola sesión) — por eso se carga acá de
  // nuevo con otros parámetros, marcado con una bandera global para no
  // pisar/confundirse si el navegador ya cargó el otro.
  React.useEffect(() => {
    if (!plansConfig.paypalClientId) return undefined;
    if (window.paypal && window.__arcanaPaypalSdkKind === 'subscription') { setSubSdkLoaded(true); return undefined; }
    if (subSdkLoadingRef.current) return undefined;
    subSdkLoadingRef.current = true;
    const s = document.createElement('script');
    s.src = 'https://www.paypal.com/sdk/js?client-id=' + encodeURIComponent(plansConfig.paypalClientId) + '&vault=true&intent=subscription';
    s.onload = () => { window.__arcanaPaypalSdkKind = 'subscription'; subSdkLoadingRef.current = false; setSubSdkLoaded(true); };
    s.onerror = () => { subSdkLoadingRef.current = false; setSubError(lang === 'es' ? 'No se pudo cargar PayPal.' : 'Could not load PayPal.'); };
    document.body.appendChild(s);
    return undefined;
  }, [plansConfig.paypalClientId]);

  React.useEffect(() => {
    subCtxRef.current = { email: profile.email || '', planKey: subOpen ? subOpen.key : '', billing: subOpen ? subOpen.billing : '' };
  }, [profile.email, subOpen]);

  React.useEffect(() => {
    if (!subOpen || !subSdkLoaded || !window.paypal || !subButtonBoxRef.current) return;
    const renderKey = subOpen.key + ':' + subOpen.billing;
    if (subRenderedForRef.current === renderKey) return;
    const planField = subOpen.key + '_' + (subOpen.billing === 'year' ? 'year' : 'month');
    const planId = plansConfig.plans ? plansConfig.plans[planField] : null;
    if (!planId) return;
    subRenderedForRef.current = renderKey;
    subButtonBoxRef.current.innerHTML = '';
    window.paypal.Buttons({
      style: { layout: 'vertical', color: 'gold', label: 'subscribe' },
      createSubscription: (data, actions) => {
        if (!profile.token) {
          setSubError(lang === 'es' ? 'Tenés que iniciar sesión primero.' : 'You need to sign in first.');
          return Promise.reject(new Error('missing-session'));
        }
        setSubError('');
        return actions.subscription.create({ plan_id: planId });
      },
      onApprove: (data) => {
        const ctx = subCtxRef.current;
        setSubState('confirming');
        return window.arcanaConfirmSubscription({
          subscriptionId: data.subscriptionID, planKey: ctx.planKey, billing: ctx.billing,
        })
          .then((res) => {
            if (res.isSubscriber) {
              // Pantalla de bienvenida compartida (ad-honores y pagas terminan
              // en la misma) — ver WelcomePage en OtherPages.jsx.
              setRoute({ page: 'welcome', email: ctx.email, planKey: res.planKey || ctx.planKey, source: 'paypal' });
            } else {
              setSubState('error');
            }
          })
          .catch(() => setSubState('error'));
      },
      onError: () => setSubError(lang === 'es' ? 'Ocurrió un error con PayPal.' : 'Something went wrong with PayPal.'),
    }).render(subButtonBoxRef.current);
  }, [subOpen, subSdkLoaded, plansConfig.plans]);

  const openSubscribe = (planKey) => {
    setSubOpen({ key: planKey, billing });
    setSubEmail(profile.email || '');
    setSubError('');
    setSubState('idle');
    subRenderedForRef.current = null;
  };
  const closeSubscribe = () => { setSubOpen(null); subRenderedForRef.current = null; };

  const prices = {
    vela:     { month: 0,  year: 0   },
    luna:     { month: 6,  year: 60  },  // 60/12 = 5, save 2 months
    estrella: { month: 9,  year: 90  },  // 90/12 = 7.5, save 2 months
    oraculo:  { month: 24, year: 240 },  // 240/12 = 20, save 2 months
  };

  const priceLabel = (planKey) => {
    const p = prices[planKey][billing];
    if (p === 0) return { big: t.pricing_free_price, small: t.pricing_free_price_sub, currency: false };
    // yearly: show monthly equivalent as headline (rounded), yearly total as sub
    if (billing === 'year') {
      const perMonth = Math.round((p / 12) * 10) / 10;
      return { big: perMonth, small: `${t.pricing_currency}${p} ${t.pricing_per_year}`, currency: true, unit: t.pricing_per_month };
    }
    return { big: p, small: '', currency: true, unit: t.pricing_per_month };
  };

  const faqs = [
    { q: t.pricing_faq_1_q, a: t.pricing_faq_1_a },
    { q: t.pricing_faq_2_q, a: t.pricing_faq_2_a },
    { q: t.pricing_faq_3_q, a: t.pricing_faq_3_a },
    { q: t.pricing_faq_4_q, a: t.pricing_faq_4_a },
  ];

  const plans = [
    {
      key: 'vela',
      name: t.plan_vela_name,
      tag: t.plan_vela_tag,
      desc: t.plan_vela_desc,
      cta: t.plan_vela_cta,
      features: [t.plan_vela_f1, t.plan_vela_f2, t.plan_vela_f3, t.plan_vela_f4, t.plan_vela_f5],
      featured: false,
      sigil: '✦',
    },
    {
      key: 'luna',
      name: t.plan_luna_name,
      tag: t.plan_luna_tag,
      desc: t.plan_luna_desc,
      cta: t.plan_luna_cta,
      features: [t.plan_luna_f1, t.plan_luna_f2, t.plan_luna_f3, t.plan_luna_f4, t.plan_luna_f5, t.plan_luna_f6],
      featured: true,
      popular: t.plan_luna_popular,
      sigil: '☾',
    },
    {
      key: 'estrella',
      name: t.plan_estrella_name,
      tag: t.plan_estrella_tag,
      desc: t.plan_estrella_desc,
      cta: t.plan_estrella_cta,
      features: [t.plan_estrella_f1, t.plan_estrella_f2, t.plan_estrella_f3, t.plan_estrella_f4, t.plan_estrella_f5, t.plan_estrella_f6],
      featured: false,
      sigil: '☆',
    },
    {
      key: 'oraculo',
      name: t.plan_oraculo_name,
      tag: t.plan_oraculo_tag,
      desc: t.plan_oraculo_desc,
      cta: t.plan_oraculo_cta,
      features: [t.plan_oraculo_f1, t.plan_oraculo_f2, t.plan_oraculo_f3, t.plan_oraculo_f4, t.plan_oraculo_f5, t.plan_oraculo_f6],
      featured: false,
      sigil: '✧',
    },
  ];

  return (
    <div className="page pricing-page">
      <div className="page-head">
        <div className="eyebrow">{t.pricing_eyebrow}</div>
        <h1 className="page-title">{t.pricing_title}</h1>
        <p className="page-sub italic">{t.pricing_intro}</p>

        <div className="billing-toggle" role="tablist" aria-label="billing period">
          <button
            className={`bt-opt ${billing === 'month' ? 'is-active' : ''}`}
            onClick={() => setBilling('month')}
            role="tab"
            aria-selected={billing === 'month'}
          >{t.pricing_billing_month}</button>
          <button
            className={`bt-opt ${billing === 'year' ? 'is-active' : ''}`}
            onClick={() => setBilling('year')}
            role="tab"
            aria-selected={billing === 'year'}
          >
            {t.pricing_billing_year}
            <span className="bt-save">{t.pricing_year_save}</span>
          </button>
        </div>
      </div>

      <div className="plans-grid">
        {plans.map((plan) => {
          const price = priceLabel(plan.key);
          return (
            <div key={plan.key} className={`plan-card ${plan.featured ? 'is-featured' : ''}`}>
              {plan.featured && <div className="plan-badge">{plan.popular}</div>}
              <div className="plan-sigil" aria-hidden>{plan.sigil}</div>
              <div className="plan-name">{plan.name}</div>
              <div className="plan-tag italic">{plan.tag}</div>

              <div className="plan-price">
                {price.currency && <span className="pp-currency">{t.pricing_currency}</span>}
                <span className="pp-big">{price.big}</span>
                {price.unit && <span className="pp-unit">{price.unit}</span>}
              </div>
              <div className="plan-price-sub">{price.small || '\u00a0'}</div>

              <p className="plan-desc">{plan.desc}</p>

              <button
                className={`btn ${plan.featured ? 'btn-primary' : 'btn-ghost'} btn-lg plan-cta`}
                onClick={() => (plan.key === 'vela' ? go('marketplace') : openSubscribe(plan.key))}
              >
                {plan.cta}
              </button>

              <ul className="plan-features">
                {plan.features.map((f, i) => (
                  <li key={i}>
                    <span className="feat-check" aria-hidden>✦</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="market-strip">
        <div className="ms-body">
          <div className="eyebrow" style={{ marginBottom: 10 }}>— {t.nav_marketplace || (lang === 'es' ? 'Tarotistas' : 'Readers')} —</div>
          <h3 className="ms-h">{t.pricing_market_h}</h3>
          <p className="ms-sub italic">{t.pricing_market_sub}</p>
        </div>
        <div className="ms-side">
          <div className="ms-rate">{t.pricing_market_rate}</div>
          <button className="btn btn-ghost" onClick={() => go('marketplace')}>{t.pricing_market_cta} →</button>
        </div>
      </div>

      <div className="faq-block">
        <div className="eyebrow" style={{ textAlign: 'center', marginBottom: 12 }}>— FAQ —</div>
        <h2 className="faq-h">{t.pricing_faq_h}</h2>
        <div className="faq-list">
          {faqs.map((f, i) => {
            const open = openFaq === i;
            return (
              <div key={i} className={`faq-item ${open ? 'is-open' : ''}`}>
                <button className="faq-q" onClick={() => setOpenFaq(open ? -1 : i)} aria-expanded={open}>
                  <span>{f.q}</span>
                  <span className="faq-icon" aria-hidden>{open ? '−' : '+'}</span>
                </button>
                <div className="faq-a-wrap">
                  <p className="faq-a italic">{f.a}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {subOpen && (
        <div className="modal-overlay" onClick={closeSubscribe}>
          <div className="modal live-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeSubscribe}>✕</button>
            {subState === 'done' ? (
              <>
                <div className="eyebrow" style={{ marginBottom: 8 }}>✦</div>
                <h2 className="live-modal-h">{lang === 'es' ? 'Suscripción activa' : 'Subscription active'}</h2>
                <p className="italic" style={{ marginTop: 10 }}>
                  {lang === 'es'
                    ? 'Ya puedes usar tu descuento al reservar una sesión con ese mismo email.'
                    : 'You can now use your discount when booking a session with that same email.'}
                </p>
                <button className="btn btn-primary btn-lg" style={{ marginTop: 18 }} onClick={closeSubscribe}>
                  {lang === 'es' ? 'Listo' : 'Done'}
                </button>
              </>
            ) : (
              <>
                <div className="eyebrow" style={{ marginBottom: 8 }}>
                  — {plans.find((p) => p.key === subOpen.key)?.name} —
                </div>
                <h2 className="live-modal-h">
                  {subOpen.billing === 'year' ? t.pricing_billing_year : t.pricing_billing_month}
                </h2>
                <div className="live-modal-block">
                  <div className="form-field">
                    <label>{t.market_book_email}</label>
                    <input type="email" value={subEmail} readOnly disabled title={lang === 'es' ? 'Es el email de tu cuenta.' : 'This is your account email.'} />
                  </div>
                  {!plansConfig.plans && (
                    <div className="live-pay-note italic">
                      {lang === 'es' ? 'Los planes todavía no están configurados en PayPal.' : 'Plans are not configured in PayPal yet.'}
                    </div>
                  )}
                  {subError && <div className="live-pay-note italic" style={{ color: '#e08080' }}>{subError}</div>}
                  {plansConfig.paypalClientId && plansConfig.plans && !subSdkLoaded && (
                    <div className="live-pay-note italic">{t.market_book_processing}</div>
                  )}
                  {subState === 'error' && (
                    <div className="live-pay-note italic" style={{ color: '#e08080' }}>
                      {lang === 'es' ? 'No se pudo confirmar la suscripción.' : 'Could not confirm the subscription.'}
                    </div>
                  )}
                  <div ref={subButtonBoxRef} className="live-paypal-box" />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="pricing-footer">
        <div className="pf-star" aria-hidden>✦</div>
        <p className="pf-quote italic">{t.pricing_footer_quote}</p>
      </div>

      <style>{`
        .pricing-page { max-width: 1320px; }
        .pricing-page .page-head { text-align: center; margin-bottom: 44px; }
        .pricing-page .page-head .eyebrow { margin-bottom: 16px; }
        .pricing-page .page-title { font-size: clamp(40px, 5vw, 64px); font-weight: 400; margin-bottom: 14px; }
        .pricing-page .page-sub { font-size: 20px; color: var(--ink-soft); max-width: 620px; margin: 0 auto; }

        /* Billing toggle */
        .billing-toggle {
          display: inline-flex;
          gap: 4px;
          margin-top: 36px;
          padding: 5px;
          border: 1px solid var(--line);
          border-radius: 999px;
          background: rgba(26, 20, 56, 0.4);
        }
        .bt-opt {
          background: transparent;
          border: none;
          color: var(--ink-soft);
          font-family: 'Cinzel', serif;
          font-size: 11px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          padding: 10px 22px;
          border-radius: 999px;
          cursor: pointer;
          transition: all 0.25s ease;
          display: inline-flex;
          align-items: center;
          gap: 10px;
        }
        .bt-opt:hover { color: var(--ink); }
        .bt-opt.is-active {
          background: var(--gold);
          color: var(--bg);
        }
        .bt-save {
          font-family: 'Cormorant Garamond', serif;
          font-style: italic;
          font-size: 11px;
          letter-spacing: 0.02em;
          text-transform: none;
          opacity: 0.85;
        }
        .bt-opt.is-active .bt-save { color: var(--bg); opacity: 0.75; }

        /* Plans */
        .plans-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 18px;
          align-items: stretch;
        }
        @media (max-width: 1180px) { .plans-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 640px) { .plans-grid { grid-template-columns: 1fr; max-width: 480px; margin: 0 auto; } }

        .plan-card {
          background: rgba(26, 20, 56, 0.45);
          border: 1px solid var(--line);
          border-radius: 18px;
          padding: 36px 30px 32px;
          display: flex;
          flex-direction: column;
          position: relative;
          transition: border-color .3s, transform .3s;
        }
        .plan-card:hover { border-color: var(--line-strong); }

        .plan-card.is-featured {
          border-color: var(--gold);
          background:
            linear-gradient(180deg, rgba(212,168,90,0.06) 0%, rgba(26,20,56,0.45) 40%),
            rgba(26, 20, 56, 0.55);
          box-shadow: 0 30px 80px -30px rgba(212, 168, 90, 0.35);
        }

        .plan-badge {
          position: absolute;
          top: -14px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--gold);
          color: var(--bg);
          font-family: 'Cinzel', serif;
          font-size: 10px;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          padding: 6px 16px;
          border-radius: 999px;
          white-space: nowrap;
        }

        .plan-sigil {
          font-family: 'Cinzel', serif;
          font-size: 24px;
          color: var(--gold);
          text-align: center;
          margin-bottom: 12px;
          opacity: 0.85;
        }
        .plan-name {
          font-family: 'Cinzel', serif;
          font-size: 22px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          text-align: center;
        }
        .plan-tag {
          font-size: 16px;
          color: var(--ink-soft);
          text-align: center;
          margin-top: 6px;
          margin-bottom: 24px;
        }

        .plan-price {
          display: flex;
          align-items: baseline;
          justify-content: center;
          gap: 4px;
          color: var(--ink);
        }
        .pp-currency {
          font-family: 'Cinzel', serif;
          font-size: 20px;
          color: var(--gold);
          margin-right: 2px;
        }
        .pp-big {
          font-family: 'Cinzel', serif;
          font-size: 56px;
          font-weight: 500;
          color: var(--ink);
          line-height: 1;
        }
        .plan-card.is-featured .pp-big { color: var(--gold); }
        .pp-unit {
          font-family: 'Cormorant Garamond', serif;
          font-style: italic;
          font-size: 16px;
          color: var(--ink-soft);
          margin-left: 4px;
        }
        .plan-price-sub {
          text-align: center;
          font-family: 'Cormorant Garamond', serif;
          font-style: italic;
          font-size: 13px;
          color: var(--ink-mute);
          margin-top: 4px;
          min-height: 20px;
        }

        .plan-desc {
          text-align: center;
          font-size: 15px;
          line-height: 1.6;
          color: var(--ink-soft);
          margin: 22px 0 24px;
          font-family: 'Cormorant Garamond', serif;
        }

        .plan-cta { width: 100%; margin-bottom: 24px; }

        .plan-features {
          list-style: none;
          padding: 24px 0 0;
          margin: 0;
          border-top: 1px solid var(--line);
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .plan-features li {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          font-family: 'Cormorant Garamond', serif;
          font-size: 15px;
          line-height: 1.45;
          color: var(--ink);
        }
        .feat-check {
          color: var(--gold);
          font-size: 12px;
          line-height: 1.6;
          flex-shrink: 0;
          opacity: 0.9;
        }

        /* Marketplace strip */
        .market-strip {
          margin-top: 64px;
          padding: 36px 40px;
          border: 1px solid var(--line);
          border-radius: 16px;
          background:
            radial-gradient(circle at 90% 50%, rgba(90, 58, 138, 0.18) 0%, transparent 60%),
            rgba(26, 20, 56, 0.35);
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 32px;
          align-items: center;
        }
        @media (max-width: 760px) {
          .market-strip { grid-template-columns: 1fr; text-align: center; padding: 28px; }
          .market-strip .eyebrow { text-align: center; }
        }
        .ms-h {
          font-family: 'Cinzel', serif;
          font-size: 26px;
          font-weight: 400;
          letter-spacing: 0.06em;
          margin-bottom: 8px;
        }
        .ms-sub { font-size: 16px; color: var(--ink-soft); max-width: 560px; }
        .ms-side { display: flex; flex-direction: column; gap: 12px; align-items: flex-end; }
        @media (max-width: 760px) { .ms-side { align-items: center; } }
        .ms-rate {
          font-family: 'Cinzel', serif;
          font-size: 12px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--gold);
        }

        /* FAQ */
        .faq-block { margin-top: 96px; max-width: 780px; margin-left: auto; margin-right: auto; }
        .faq-h {
          font-family: 'Cinzel', serif;
          font-size: clamp(28px, 3.4vw, 40px);
          font-weight: 400;
          text-align: center;
          margin-bottom: 32px;
        }
        .faq-list { display: flex; flex-direction: column; }
        .faq-item {
          border-top: 1px solid var(--line);
        }
        .faq-item:last-child { border-bottom: 1px solid var(--line); }
        .faq-q {
          width: 100%;
          background: transparent;
          border: none;
          color: var(--ink);
          text-align: left;
          padding: 22px 4px;
          font-family: 'Cinzel', serif;
          font-size: 15px;
          letter-spacing: 0.08em;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 24px;
          transition: color .2s;
        }
        .faq-q:hover { color: var(--gold); }
        .faq-icon {
          font-family: 'Cinzel', serif;
          font-size: 22px;
          color: var(--gold);
          line-height: 1;
          width: 22px;
          text-align: center;
        }
        .faq-a-wrap {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows .35s ease;
        }
        .faq-item.is-open .faq-a-wrap { grid-template-rows: 1fr; }
        .faq-a {
          overflow: hidden;
          font-size: 17px;
          line-height: 1.6;
          color: var(--ink-soft);
          padding: 0 4px 22px;
          margin: 0;
        }

        /* Footer quote */
        .pricing-footer {
          margin-top: 96px;
          text-align: center;
          padding: 40px 20px 20px;
        }
        .pf-star {
          font-family: 'Cinzel', serif;
          color: var(--gold);
          font-size: 20px;
          margin-bottom: 18px;
          opacity: 0.9;
        }
        .pf-quote {
          font-size: 22px;
          color: var(--ink);
          max-width: 640px;
          margin: 0 auto;
          line-height: 1.5;
        }
      `}</style>
    </div>
  );
}

function MerchPage({ lang }) {
  const t = window.I18N[lang];
  const es = lang === 'es';
  const items = (window.getMerchItems && window.getMerchItems()) || [];
  const shippingZones = (window.getShippingZones && window.getShippingZones()) || [];

  return (
    <div className="page merch-page">
      <div className="page-head">
        <div className="eyebrow">✦ {t.merch_eyebrow}</div>
        <h1 className="page-title">{t.merch_title}</h1>
        <p className="page-sub italic">{t.merch_intro}</p>
      </div>

      <div className="merch-hero">
        <img src="assets/merch-hero.jpg" alt={t.merch_title} className="merch-hero-img" />
      </div>

      <div className="merch-grid">
        {items.map((item) => (
          <div key={item.key} className="merch-card">
            <div className="merch-card-name">{es ? item.name_es : item.name_en}</div>
            <div className="merch-card-desc italic">{es ? item.desc_es : item.desc_en}</div>
            <div className="merch-card-price">
              <span className="merch-card-currency">{t.pricing_currency}</span>{item.price}
            </div>
          </div>
        ))}
      </div>

      <div className="merch-shipping">
        <h2 className="merch-shipping-h">{t.merch_shipping_h}</h2>
        <p className="merch-shipping-intro italic">{t.merch_shipping_intro}</p>
        <table className="merch-shipping-table">
          <tbody>
            {shippingZones.map((zone) => (
              <tr key={zone.key}>
                <td className="merch-shipping-zone">{es ? zone.name_es : zone.name_en}</td>
                <td className="merch-shipping-price">
                  <span className="merch-card-currency">{t.pricing_currency}</span>{zone.price}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="merch-shipping-note italic">{t.merch_shipping_note}</p>
      </div>

      <p className="merch-note italic">{t.merch_note}</p>

      <style>{`
        .merch-page { max-width: 1200px; }
        .merch-page .page-head { text-align: center; margin-bottom: 36px; }
        .merch-page .page-head .eyebrow { margin-bottom: 16px; }
        .merch-page .page-title { font-size: clamp(36px, 5vw, 56px); font-weight: 400; margin-bottom: 14px; }
        .merch-page .page-sub { font-size: 19px; color: var(--ink-soft); max-width: 600px; margin: 0 auto; }

        .merch-hero {
          margin: 0 0 48px;
          border-radius: 18px;
          overflow: hidden;
          border: 1px solid var(--line);
          box-shadow: 0 30px 80px rgba(0,0,0,0.35);
        }
        .merch-hero-img { width: 100%; height: auto; display: block; }

        .merch-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 20px;
        }
        .merch-card {
          background: rgba(26, 20, 56, 0.4);
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 22px 20px;
          transition: border-color 0.25s ease, transform 0.25s ease;
        }
        .merch-card:hover { border-color: var(--gold); transform: translateY(-3px); }
        .merch-card-name {
          font-family: 'Cinzel', serif;
          font-size: 15px;
          letter-spacing: 0.02em;
          color: var(--ink);
          margin-bottom: 8px;
        }
        .merch-card-desc {
          font-size: 15px;
          color: var(--ink-soft);
          line-height: 1.45;
          margin-bottom: 16px;
          min-height: 44px;
        }
        .merch-card-price {
          font-family: 'Cinzel', serif;
          font-size: 20px;
          color: var(--gold);
        }
        .merch-card-currency { opacity: 0.75; margin-right: 2px; }

        .merch-shipping {
          margin-top: 48px;
          padding: 28px 26px;
          background: rgba(26, 20, 56, 0.35);
          border: 1px solid var(--line);
          border-radius: 14px;
        }
        .merch-shipping-h {
          font-family: 'Cinzel', serif;
          font-size: 22px;
          font-weight: 400;
          color: var(--ink);
          margin-bottom: 8px;
          text-align: center;
        }
        .merch-shipping-intro {
          text-align: center;
          font-size: 15px;
          color: var(--ink-soft);
          max-width: 480px;
          margin: 0 auto 20px;
        }
        .merch-shipping-table {
          width: 100%;
          max-width: 460px;
          margin: 0 auto;
          border-collapse: collapse;
        }
        .merch-shipping-table tr {
          border-bottom: 1px solid var(--line);
        }
        .merch-shipping-table tr:last-child { border-bottom: none; }
        .merch-shipping-zone {
          padding: 12px 6px;
          font-size: 15px;
          color: var(--ink);
        }
        .merch-shipping-price {
          padding: 12px 6px;
          text-align: right;
          font-family: 'Cinzel', serif;
          font-size: 17px;
          color: var(--gold);
        }
        .merch-shipping-note {
          text-align: center;
          margin-top: 16px;
          font-size: 13px;
          color: var(--ink-soft);
          opacity: 0.85;
        }

        .merch-note {
          text-align: center;
          margin-top: 40px;
          font-size: 15px;
          color: var(--ink-soft);
        }

        @media (max-width: 640px) {
          .merch-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); }
        }
      `}</style>
    </div>
  );
}

function MyBookingsPage({ lang, setRoute }) {
  const t = window.I18N[lang];
  const [email, setEmail] = React.useState('');
  const [bookings, setBookings] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState('');

  const search = (e) => {
    if (e) e.preventDefault();
    if (!email.includes('@')) { setErr(t.mybookings_err_email); return; }
    setErr('');
    setLoading(true);
    window.arcanaMyBookings(email)
      .then((res) => setBookings(res.bookings || []))
      .catch(() => setErr(t.market_load_error))
      .finally(() => setLoading(false));
  };

  const formatWhen = (iso) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleString(lang === 'es' ? 'es-CL' : 'en-US', {
        weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      });
    } catch { return iso; }
  };

  const sorted = bookings
    ? [...bookings].sort((a, b) => new Date(a.when || 0) - new Date(b.when || 0))
    : [];

  return (
    <div className="page mybookings-page">
      <div className="page-head">
        <div className="eyebrow">{t.mybookings_eyebrow}</div>
        <h1>{t.mybookings_h}</h1>
        <p className="italic">{t.mybookings_sub}</p>
      </div>

      <form className="mybookings-search" onSubmit={search}>
        <div className="form-field" style={{ flex: 1, minWidth: 220 }}>
          <input
            type="email"
            placeholder={t.mybookings_email_ph}
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
          />
        </div>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? t.mybookings_searching : t.mybookings_search_cta}
        </button>
      </form>
      {err && <div className="live-code-note italic" style={{ color: '#e08080' }}>{err}</div>}

      {bookings && sorted.length === 0 && !err && (
        <p className="italic mybookings-empty">{t.mybookings_none}</p>
      )}

      <div className="mybookings-list">
        {sorted.map((b) => {
          const now = Date.now();
          const from = b.videoJoinFrom ? new Date(b.videoJoinFrom).getTime() : null;
          const until = b.videoJoinUntil ? new Date(b.videoJoinUntil).getTime() : null;
          let status = 'ready';
          if (from && now < from) status = 'early';
          else if (until && now > until) status = 'done';

          return (
            <div className="mybookings-item" key={b.id}>
              <div className="mybookings-item-main">
                <div className="mybookings-item-name">{b.tarotistName}</div>
                <div className="mybookings-item-when italic">{formatWhen(b.when)}</div>
                <div className="mybookings-item-code">{b.accessCode}</div>
              </div>
              <div className="mybookings-item-action">
                {status === 'ready' && (
                  <button
                    className="btn btn-primary"
                    onClick={() => setRoute && setRoute({ page: 'videocall', accessCode: b.accessCode })}
                  >
                    {t.mybookings_join} →
                  </button>
                )}
                {status === 'early' && (
                  <div className="italic mybookings-status">{t.mybookings_from} {formatWhen(b.videoJoinFrom)}</div>
                )}
                {status === 'done' && (
                  <div className="italic mybookings-status">{t.mybookings_finished}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .mybookings-page { max-width: 720px; }
        .mybookings-search {
          display: flex; gap: 10px; flex-wrap: wrap; margin: 24px 0 8px; align-items: flex-end;
        }
        .mybookings-empty { text-align: center; margin-top: 32px; color: var(--ink-soft); }
        .mybookings-list { display: grid; gap: 12px; margin-top: 24px; }
        .mybookings-item {
          display: flex; justify-content: space-between; align-items: center; gap: 16px;
          flex-wrap: wrap;
          border: 1px solid rgba(212,168,90,.25);
          border-radius: 12px;
          padding: 14px 18px;
          background: rgba(255,255,255,.02);
        }
        .mybookings-item-name { font-family: 'Cinzel', serif; color: var(--gold); }
        .mybookings-item-when { font-size: 14px; color: var(--ink-soft); margin-top: 2px; }
        .mybookings-item-code { font-size: 12px; opacity: .6; margin-top: 4px; letter-spacing: .05em; }
        .mybookings-status { font-size: 13px; color: var(--ink-soft); }
      `}</style>
    </div>
  );
}

// =========== Welcome (bienvenida compartida: ad-honores + suscripción paga) ===========
// Aplica a las membresías ad-honores otorgadas desde Setup (llega acá vía
// ?activate=TOKEN en la URL, ver App.jsx) y a las suscripciones pagas
// reales de PayPal (PricingPage navega directo con email/planKey después
// de confirmar el pago). Ver acciones "activate-membership" /
// "newsletter-optin" en local-server.js / booking.mts.
function WelcomePage({ lang, setRoute, token, verifyToken, email: routeEmail, planKey: routePlanKey, source: routeSource, onAuthenticated }) {
  const t = window.I18N[lang];
  const es = lang === 'es';
  const Logo = window.ArcanaLogo;
  const [state, setState] = React.useState((token || verifyToken) ? 'loading' : 'ready'); // loading | ready | error
  const [info, setInfo] = React.useState(
    (token || verifyToken) ? null : { email: routeEmail, planKey: routePlanKey, source: routeSource }
  );
  const [optIn, setOptIn] = React.useState(false);
  const [optInSaved, setOptInSaved] = React.useState(false);
  const [nameDraft, setNameDraft] = React.useState('');
  const [nameSaved, setNameSaved] = React.useState(false);
  const hasName = !!(window.getArcanaProfile().name);

  React.useEffect(() => {
    if (!token) return;
    window.arcanaActivateMembership(token)
      .then((res) => { setInfo(res); setState('ready'); })
      .catch(() => setState('error'));
  }, [token]);

  // 2026-09-10 (a pedido de Christian): este es el primer acceso ya
  // logeado después de confirmar el email de un signup nuevo (ver
  // App.jsx, ruta ?verify=TOKEN). Reusa toda esta pantalla de bienvenida
  // -- mismo texto/beneficios que ya mostraba para membresías ad-honores
  // -- solo que acá la cuenta recién se crea y se logea en este momento.
  React.useEffect(() => {
    if (!verifyToken) return;
    window.arcanaVerifyEmail(verifyToken)
      .then((res) => {
        const profile = window.saveArcanaSession(res);
        if (onAuthenticated) onAuthenticated(profile);
        setInfo({ email: profile.email, planKey: 'vela', source: 'verified-signup' });
        setState('ready');
      })
      .catch(() => setState('error'));
  }, [verifyToken]);

  // El email de la membresía (ad-honores o suscripción paga) alimenta el
  // Perfil local — así el nombre que carguen acá viaja con el resto de sus
  // datos, sin pedirle nada dos veces.
  React.useEffect(() => {
    if (info && info.email) window.saveArcanaProfile({ email: info.email });
  }, [info && info.email]);

  const saveName = () => {
    const val = nameDraft.trim();
    if (!val) return;
    window.saveArcanaProfile({ name: val });
    setNameSaved(true);
  };

  const saveOptIn = (checked) => {
    setOptIn(checked);
    if (!info || !info.email) return;
    window.arcanaNewsletterOptIn(info.email, checked)
      .then(() => { setOptInSaved(true); setTimeout(() => setOptInSaved(false), 1800); })
      .catch(() => {});
  };

  const planKey = info && info.planKey;
  const planName = { luna: 'Luna', estrella: 'Estrella', oraculo: 'Oráculo', vela: 'Vela' }[planKey] || planKey;
  const featureKeys = ['f1', 'f2', 'f3', 'f4', 'f5', 'f6'].filter((k) => t['plan_' + planKey + '_' + k]);

  return (
    <div className="welcome-page">
      <div className="welcome-card">
        {Logo && <Logo variant="lockup" />}
        {state === 'loading' && (
          <p className="italic" style={{ marginTop: 24 }}>{es ? 'Activando tu membresía…' : 'Activating your membership…'}</p>
        )}
        {state === 'error' && (
          <>
            <h1 className="welcome-h" style={{ marginTop: 20 }}>{es ? 'Este link ya no es válido' : 'This link is no longer valid'}</h1>
            <p className="italic" style={{ marginTop: 10 }}>
              {es ? 'Pedile a quien te lo mandó que te comparta uno nuevo.' : 'Ask whoever sent it to you for a new one.'}
            </p>
            <button className="btn btn-primary btn-lg" style={{ marginTop: 22 }} onClick={() => setRoute({ page: 'home' })}>
              {es ? 'Ir al inicio' : 'Go home'}
            </button>
          </>
        )}
        {state === 'ready' && info && (
          <>
            <div className="eyebrow" style={{ marginTop: 18 }}>✦ {es ? 'Bienvenida a Lux Astral' : 'Welcome to Lux Astral'} ✦</div>
            <h1 className="welcome-h">
              {es ? `Ya eres miembro ${planName}` : `You're now a ${planName} member`}
            </h1>
            {!hasName && !nameSaved && (
              <div className="welcome-name-field">
                <label>{es ? '¿Cómo quieres que te llamemos?' : 'What should we call you?'}</label>
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <input
                    type="text"
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    placeholder={es ? 'Tu nombre' : 'Your name'}
                    maxLength={40}
                  />
                  <button className="btn btn-ghost" onClick={saveName} disabled={!nameDraft.trim()}>
                    {es ? 'Guardar' : 'Save'}
                  </button>
                </div>
              </div>
            )}
            {nameSaved && (
              <p className="italic" style={{ marginTop: 8, fontSize: 13, opacity: .8 }}>
                ✓ {es ? `¡Un gusto, ${nameDraft}!` : `Lovely to meet you, ${nameDraft}!`}
              </p>
            )}
            <p className="italic" style={{ marginTop: 10, opacity: .85 }}>
              {info.source === 'honorary'
                ? (es ? 'Tu membresía es un obsequio de Lux Astral — sin costo, con todos los beneficios.' : 'Your membership is a gift from Lux Astral — free, with every benefit included.')
                : (es ? '¡Gracias por sumarte! Ya puedes disfrutar todos los beneficios de tu plan.' : "Thank you for joining! You can now enjoy all of your plan's benefits.")}
            </p>
            {featureKeys.length > 0 && (
              <ul className="welcome-features">
                {featureKeys.map((k) => <li key={k}>✦ {t['plan_' + planKey + '_' + k]}</li>)}
              </ul>
            )}
            <label className="welcome-optin">
              <input type="checkbox" checked={optIn} onChange={(e) => saveOptIn(e.target.checked)} />
              <span>
                {es ? 'Quiero recibir el boletín diario y novedades de Lux Astral por email.' : 'I want to receive the daily newsletter and Lux Astral updates by email.'}
                {optInSaved && <em style={{ marginLeft: 6, opacity: .7 }}>✓ {es ? 'guardado' : 'saved'}</em>}
              </span>
            </label>
            <button className="btn btn-primary btn-lg" style={{ marginTop: 22 }} onClick={() => setRoute({ page: 'home' })}>
              {es ? 'Comenzar' : 'Get started'}
            </button>
          </>
        )}
      </div>
      <style>{`
        .welcome-page {
          min-height: 100vh; display: flex; align-items: center; justify-content: center;
          padding: 32px 16px; background: radial-gradient(circle at 50% 0%, rgba(212,168,90,.08), transparent 60%);
        }
        .welcome-card {
          max-width: 480px; width: 100%; text-align: center;
          border: 1px solid rgba(212,168,90,.35); border-radius: 20px;
          padding: 40px 32px; background: rgba(255,255,255,.02);
          box-shadow: 0 0 60px rgba(212,168,90,.08);
        }
        .welcome-h { font-family: 'Cinzel', serif; color: var(--gold); font-size: 26px; margin-top: 10px; }
        .welcome-features { list-style: none; padding: 0; margin: 20px 0; text-align: left; display: grid; gap: 8px; font-size: 14px; color: var(--ink-soft); }
        .welcome-optin { display: flex; gap: 10px; align-items: flex-start; text-align: left; font-size: 13px; margin-top: 22px; opacity: .9; cursor: pointer; }
        .welcome-optin input { margin-top: 3px; }
        .welcome-name-field { text-align: left; margin-top: 16px; }
        .welcome-name-field label { display: block; font-size: 13px; color: var(--ink-soft); margin-bottom: 2px; }
        .welcome-name-field input {
          flex: 1; background: rgba(0,0,0,.15); border: 1px solid var(--line); border-radius: 8px;
          color: var(--ink); padding: 9px 12px; font-family: inherit; font-size: 14px;
        }
      `}</style>
    </div>
  );
}

Object.assign(window, {
  ChartPage, MoonPage, MarketplacePage, PhilosophyPage, ProfilePage, PricingPage, MerchPage, MyBookingsPage, WelcomePage,
});
