// Readings selector page — grid of available spreads
function ReadingsPage({ lang, setRoute }) {
  const t = window.I18N[lang];
  const spreads = [
    { key: 'daily',  name: t.reading_daily_name,  desc: t.reading_daily_desc,  n: 1,  time: 2,  positions_es: ['Mensaje'],                                             positions_en: ['Message'] },
    { key: 'three',  name: t.reading_three_name,  desc: t.reading_three_desc,  n: 3,  time: 6,  positions_es: ['Pasado','Presente','Futuro'],                          positions_en: ['Past','Present','Future'] },
    { key: 'love',   name: t.reading_love_name,   desc: t.reading_love_desc,   n: 5,  time: 10, positions_es: ['Tú','El otro','Vínculo','Reto','Camino'],              positions_en: ['You','The other','Bond','Challenge','Path'] },
    { key: 'celtic', name: t.reading_celtic_name, desc: t.reading_celtic_desc, n: 10, time: 20, positions_es: ['Presente','Cruz','Base','Pasado','Corona','Futuro','Yo','Entorno','Esperanzas','Resultado'],
                                                                                              positions_en: ['Present','Cross','Base','Past','Crown','Future','Self','Environment','Hopes','Outcome'] },
    { key: 'work',     name: t.reading_work_name,     desc: t.reading_work_desc,     n: 4,  time: 8,  positions_es: ['Situación Actual','Obstáculo','Acción a Tomar','Resultado Probable'],
                                                                                                      positions_en: ['Current Situation','Obstacle','Action to Take','Likely Outcome'] },
    { key: 'free',     name: t.reading_free_name,     desc: t.reading_free_desc,     n: 3,  time: 6,  positions_es: ['Tu Pregunta','Consejo','Resultado'],
                                                                                                      positions_en: ['Your Question','Advice','Outcome'] },
    { key: 'decision', name: t.reading_decision_name, desc: t.reading_decision_desc, n: 5,  time: 10, positions_es: ['Situación','Opción A','Opción B','Lo que no ves','Consejo'],
                                                                                                      positions_en: ['Situation','Option A','Option B',"What you don't see",'Advice'] },
    { key: 'six',      name: t.reading_six_name,      desc: t.reading_six_desc,      n: 6,  time: 12, positions_es: ['Situación','Causa Raíz','Lo que Debes Soltar','Lo que Debes Abrazar','Acción','Resultado'],
                                                                                                      positions_en: ['Situation','Root Cause','What to Release','What to Embrace','Action','Outcome'] },
    { key: 'year',     name: t.reading_year_name,     desc: t.reading_year_desc,     n: 12, time: 22, positions_es: ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],
                                                                                                      positions_en: ['January','February','March','April','May','June','July','August','September','October','November','December'] },
  ];

  return (
    <div className="page readings-page">
      <div className="page-head readings-hero-band">
        <img src="assets/live-sessions-photo.jpg" alt="" aria-hidden="true" className="readings-hero-photo" />
        <div className="readings-hero-overlay" aria-hidden="true"></div>
        <div className="readings-hero-inner">
          <div className="eyebrow">— {t.nav_readings} —</div>
          <h1 className="page-title">{t.readings_h}</h1>
          <p className="page-sub italic">{t.readings_sub}</p>
        </div>
      </div>

      <div className="spreads-detailed">
        {spreads.map((s) => (
          <div key={s.key} className="spread-detail">
            <div className="spread-detail-left">
              <div className="spread-num">{String(s.n).padStart(2, '0')} · {t.reading_cards_count}</div>
              <h2 className="spread-detail-name">{s.name}</h2>
              <p className="spread-detail-desc italic">{s.desc}</p>
              <div className="spread-detail-meta">
                <span className="chip gold">{s.n} {t.reading_cards_count}</span>
                <span className="chip">{s.time} {t.reading_time}</span>
              </div>
              <div className="spread-detail-positions">
                {(lang === 'es' ? s.positions_es : s.positions_en).map((p, i) => (
                  <span key={i} className="position-chip">
                    <em>{i + 1}</em> {p}
                  </span>
                ))}
              </div>
              <button className="btn btn-primary btn-lg" onClick={() => setRoute({ page: 'reading', spread: s.key })}>
                {t.reading_begin} ✦
              </button>
            </div>
            <div className="spread-detail-right">
              <div className="spread-preview" data-count={s.n}>
                {[...Array(s.n)].map((_, i) => (
                  <div key={i} className="preview-card" style={previewCardStyle(s.key, i, s.n)} />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .page-head { text-align: center; margin-bottom: 64px; }
        .page-head .eyebrow { margin-bottom: 16px; }
        .page-title {
          font-size: clamp(40px, 5vw, 64px);
          font-weight: 400;
          margin-bottom: 12px;
        }
        .page-sub { font-size: 20px; color: var(--ink-soft); }

        .readings-hero-band {
          position: relative;
          overflow: hidden;
          border-radius: 24px;
          border: 1px solid var(--line);
          padding: 64px 32px;
          isolation: isolate;
        }
        .readings-hero-photo {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: right center;
          z-index: -2;
        }
        .readings-hero-overlay {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 32% 45%, rgba(15,10,36,0.55), rgba(15,10,36,0.9) 62%),
            linear-gradient(90deg, rgba(15,10,36,0.94) 0%, rgba(15,10,36,0.82) 48%, rgba(15,10,36,0.38) 82%, rgba(15,10,36,0.55) 100%);
          z-index: -1;
        }
        .readings-hero-inner { position: relative; }
        @media (max-width: 640px) {
          .readings-hero-band { padding: 44px 20px; }
        }

        .spreads-detailed { display: flex; flex-direction: column; gap: 48px; }
        .spread-detail {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 64px;
          align-items: center;
          padding: 48px;
          border: 1px solid var(--line);
          border-radius: 16px;
          background: linear-gradient(180deg, rgba(26, 20, 56, 0.35) 0%, transparent 100%);
          transition: border-color 0.3s;
        }
        .spread-detail:hover { border-color: var(--line-strong); }
        .spread-num {
          font-family: 'Cinzel', serif;
          font-size: 12px;
          letter-spacing: 0.3em;
          color: var(--gold);
          margin-bottom: 20px;
        }
        .spread-detail-name {
          font-size: clamp(28px, 3.5vw, 44px);
          font-weight: 400;
          letter-spacing: 0.04em;
          margin-bottom: 16px;
        }
        .spread-detail-desc {
          font-size: 20px;
          color: var(--ink-soft);
          margin-bottom: 24px;
          max-width: 480px;
        }
        .spread-detail-meta { display: flex; gap: 8px; margin-bottom: 24px; }
        .spread-detail-positions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 32px;
        }
        .position-chip {
          font-family: 'Cormorant Garamond', serif;
          font-size: 14px;
          color: var(--ink-soft);
          padding: 6px 12px;
          background: rgba(15, 10, 36, 0.6);
          border-radius: 4px;
          border: 1px solid var(--line);
        }
        .position-chip em {
          font-style: normal;
          color: var(--gold);
          margin-right: 6px;
          font-family: 'Cinzel', serif;
          font-size: 10px;
          letter-spacing: 0.15em;
        }

        .spread-detail-right {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 440px;
        }
        .spread-preview {
          position: relative;
          width: 100%;
          height: 400px;
        }
        .preview-card {
          position: absolute;
          width: 124px;
          aspect-ratio: 2 / 3;
          background-image: url('assets/cards/back.jpg');
          background-size: cover;
          background-position: center;
          border: 2px solid var(--gold);
          border-radius: 9px;
          box-shadow: 0 16px 34px -10px rgba(0, 0, 0, 0.65);
        }

        @media (max-width: 900px) {
          .spread-detail { grid-template-columns: 1fr; padding: 32px 24px; gap: 32px; }
          .spread-detail-right { min-height: 340px; }
        }
      `}</style>
    </div>
  );
}

// Compute preview layout positions per spread type
function previewCardStyle(spread, i, n) {
  if (spread === 'daily') {
    return { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' };
  }
  if (spread === 'three') {
    const positions = [-132, 0, 132];
    return { left: '50%', top: '50%', transform: `translate(calc(-50% + ${positions[i]}px), -50%)` };
  }
  if (spread === 'love') {
    const positions = [
      { x: -208, y: 52 }, { x: -104, y: -52 }, { x: 0, y: 0 }, { x: 104, y: -52 }, { x: 208, y: 52 }
    ];
    const p = positions[i];
    return { left: '50%', top: '50%', transform: `translate(calc(-50% + ${p.x}px), calc(-50% + ${p.y}px))` };
  }
  if (spread === 'celtic') {
    const positions = [
      { x: -40, y: 0, r: 0 },       // 1 present
      { x: -40, y: 0, r: 90 },      // 2 cross
      { x: -40, y: 118, r: 0 },     // 3 base
      { x: -146, y: 0, r: 0 },      // 4 past
      { x: -40, y: -118, r: 0 },    // 5 crown
      { x: 67, y: 0, r: 0 },        // 6 future
      { x: 199, y: 118, r: 0 },     // 7 self
      { x: 199, y: 40, r: 0 },      // 8 env
      { x: 199, y: -40, r: 0 },     // 9 hopes
      { x: 199, y: -118, r: 0 },    // 10 outcome
    ];
    const p = positions[i];
    return {
      left: '50%',
      top: '50%',
      width: '96px',
      transform: `translate(calc(-50% + ${p.x}px), calc(-50% + ${p.y}px)) rotate(${p.r}deg)`,
    };
  }
  // Fallback genérico en abanico para las tiradas nuevas (work/free/decision/six),
  // que no tienen un layout artesanal propio como celtic o love. Antes quedaban
  // notablemente más chicas (88px) que el resto (124px) — ahora casi a la par,
  // solo un poco más chicas cuantas más cartas hay, para que no se amontonen.
  if (n <= 6) {
    const widthByCount = { 3: 118, 4: 106, 5: 96, 6: 88 };
    const spacingByCount = { 3: 132, 4: 104, 5: 82, 6: 65 };
    const width = widthByCount[n] || 100;
    const spacing = spacingByCount[n] || 90;
    const center = (n - 1) / 2;
    const x = (i - center) * spacing;
    const y = Math.abs(i - center) * 12;
    return { left: '50%', top: '50%', width: `${width}px`, transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` };
  }
  // 12 cartas (year): dos filas de 6, en abanico compacto
  const perRow = 6;
  const row = Math.floor(i / perRow);
  const col = i % perRow;
  const rowCenter = (perRow - 1) / 2;
  const x = (col - rowCenter) * 62;
  const y = (row - 0.5) * 135;
  return { left: '50%', top: '50%', width: '90px', transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` };
}

window.ReadingsPage = ReadingsPage;
