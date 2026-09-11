// Home / Landing
function HomePage({ lang, setRoute, dailyCard }) {
  const { TarotCard } = window;
  const t = window.I18N[lang];
  const spreads = [
    { key: 'daily',  name: t.reading_daily_name,  desc: t.reading_daily_desc,  n: 1,  time: 2  },
    { key: 'three',  name: t.reading_three_name,  desc: t.reading_three_desc,  n: 3,  time: 6  },
    { key: 'love',   name: t.reading_love_name,   desc: t.reading_love_desc,   n: 5,  time: 10 },
    { key: 'celtic', name: t.reading_celtic_name, desc: t.reading_celtic_desc, n: 10, time: 20 },
  ];
  const tarotists = window.TAROTISTS.slice(0, 4);
  const profile = (window.getArcanaProfile && window.getArcanaProfile()) || { name: null };

  return (
    <div className="page home">
      {/* ============ Logo hero ============ */}
      <div className="home-logo-hero">
        <img src="assets/logo-full.png" alt="Lux Astral" className="home-logo-hero-img" />
      </div>

      {/* ============ Hero ============ */}
      <section className="hero">
        <div className="hero-copy">
          {profile.name && (
            <div className="hero-greeting">{t.home_greeting.replace('{name}', profile.name)}</div>
          )}
          <div className="eyebrow">✦ {t.home_eyebrow}</div>
          <h1 className="hero-title">
            {t.home_title_1}<br/>
            <em>{t.home_title_2}</em><br/>
            <span className="hero-title-small">— {t.home_title_3}</span>
          </h1>
          <p className="hero-intro">{t.home_intro}</p>
          <div className="hero-ctas">
            <button className="btn btn-primary btn-lg" onClick={() => setRoute({ page: 'readings' })}>
              {t.home_cta_begin} ✦
            </button>
            <button className="btn btn-ghost btn-lg" onClick={() => setRoute({ page: 'reading', spread: 'daily' })}>
              {t.home_cta_daily}
            </button>
          </div>
          <button className="home-quickcard-link" onClick={() => setRoute({ page: 'quickcard' })}>
            🃏 {lang === 'es' ? 'O sacá una carta rápida, sin preguntas' : 'Or draw a quick card, no questions'}
          </button>
        </div>
        <div className="hero-daily">
          <div className="daily-label eyebrow">— {t.home_today} —</div>
          <div className="daily-card-wrap">
            <TarotCard card={dailyCard} lang={lang} revealed={true} />
          </div>
          <div className="daily-name">
            {lang === 'es' ? dailyCard.name_es : dailyCard.name_en}
          </div>
          <div className="daily-meaning">
            "{lang === 'es' ? dailyCard.upright_es : dailyCard.upright_en}"
          </div>
          <div className="daily-hint">{t.home_today_hint}</div>
        </div>
      </section>

      {/* ============ Guide strip (optimistic framing) ============ */}
      <section className="philosophy-strip guide-strip">
        <div className="eyebrow">✦ {t.home_guide_h}</div>
        <p className="philosophy-body italic">"{t.home_guide_body}"</p>
      </section>

      {/* ============ Readings ============ */}
      <section className="section">
        <div className="section-head">
          <div className="eyebrow">— Tiradas —</div>
          <h2 className="section-title">{t.home_readings_h}</h2>
          <p className="section-sub">{t.home_readings_sub}</p>
        </div>
        <div className="spreads-grid">
          {spreads.map((s) => (
            <div
              key={s.key}
              className="spread-card"
              onClick={() => setRoute({ page: 'reading', spread: s.key })}
            >
              <div className="spread-num">{String(s.n).padStart(2, '0')}</div>
              <div className="spread-name">{s.name}</div>
              <div className="spread-desc">{s.desc}</div>
              <div className="spread-meta">
                <span>{s.n} {t.reading_cards_count}</span>
                <span>·</span>
                <span>{s.time} {t.reading_time}</span>
              </div>
              <div className="spread-arrow">→</div>
            </div>
          ))}
        </div>
      </section>

      {/* ============ Marketplace preview ============ */}
      <section className="section">
        <div className="section-head">
          <div className="eyebrow">— {t.nav_marketplace} —</div>
          <h2 className="section-title">{t.home_marketplace_h}</h2>
          <p className="section-sub">{t.home_marketplace_sub}</p>
        </div>
        <div className="tarotists-grid">
          {tarotists.map((tr) => (
            <div key={tr.id} className="tarotist-card" onClick={() => setRoute({ page: 'marketplace' })}>
              <div className="tarotist-avatar" style={{ background: `radial-gradient(circle at 30% 30%, ${tr.color}, ${tr.color}55)` }}>
                {tr.initials}
              </div>
              <div className="tarotist-name">{tr.name}</div>
              <div className="tarotist-spec italic">{lang === 'es' ? tr.specialty_es : tr.specialty_en}</div>
              <div className={`chip ${tr.status}`}><span className="dot"></span> {tr.status === 'online' ? t.market_online : t.market_busy}</div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <button className="btn btn-ghost" onClick={() => setRoute({ page: 'marketplace' })}>
            {lang === 'es' ? 'Ver todos los tarotistas' : 'See all readers'} →
          </button>
        </div>
      </section>

      {/* ============ Philosophy strip ============ */}
      <section className="philosophy-strip">
        <div className="eyebrow">✦ {t.home_philosophy_h}</div>
        <p className="philosophy-body italic">"{t.home_philosophy_body}"</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => setRoute({ page: 'about' })}>
            {t.nav_about} →
          </button>
          <button className="btn btn-ghost" onClick={() => setRoute({ page: 'philosophy' })}>
            {t.home_philosophy_cta} →
          </button>
        </div>
      </section>

      {/* ============ Footer ============ */}
      <footer className="site-footer">
        <div className="footer-brand-lockup">
          {window.ArcanaLogo && React.createElement(window.ArcanaLogo, { variant: 'lockup', size: 36, tagline: 'Tarot' })}
        </div>
        <div className="footer-tagline italic">{t.home_footer_tagline}</div>
        <div className="footer-links">
          <a href="#" onClick={(e) => { e.preventDefault(); setRoute({ page: 'about' }); }}>{t.nav_about}</a>
          <a href="#" onClick={(e) => { e.preventDefault(); setRoute({ page: 'blog' }); }}>{t.nav_blog}</a>
          <a href="#" onClick={(e) => { e.preventDefault(); setRoute({ page: 'philosophy' }); }}>{t.nav_philosophy}</a>
          <a href="#" onClick={(e) => { e.preventDefault(); setRoute({ page: 'library' }); }}>{t.nav_library}</a>
          <a href="#" onClick={(e) => { e.preventDefault(); setRoute({ page: 'pricing' }); }}>{t.pricing_h}</a>
          <a href="#" onClick={(e) => { e.preventDefault(); setRoute({ page: 'contact' }); }}>{t.nav_contact}</a>
        </div>
      </footer>

      <style>{`
        .home { max-width: 1400px; }

        .home-logo-hero {
          display: flex;
          justify-content: center;
          padding: 12px 0 8px;
        }
        .home-logo-hero-img {
          width: min(60vw, 320px);
          height: auto;
          filter: drop-shadow(0 20px 50px rgba(0,0,0,0.45));
        }
        @media (max-width: 720px) {
          .home-logo-hero-img { width: min(70vw, 240px); }
        }

        .hero {
          display: grid;
          grid-template-columns: 1.35fr 1fr;
          gap: 96px;
          align-items: center;
          padding: 40px 0 96px;
          min-height: 70vh;
        }
        .hero-copy .eyebrow { margin-bottom: 32px; }
        .hero-greeting {
          font-family: 'Cormorant Garamond', serif;
          font-size: 17px;
          font-style: italic;
          color: var(--ink-soft);
          margin-bottom: 8px;
        }
        .hero-title {
          font-size: clamp(52px, 6.5vw, 92px);
          line-height: 0.95;
          letter-spacing: 0.02em;
          font-weight: 400;
          margin-bottom: 32px;
        }
        .hero-title em {
          display: inline-block;
          margin: 4px 0;
        }
        .hero-title-small {
          display: block;
          font-family: 'Cormorant Garamond', serif;
          font-style: italic;
          font-size: 0.35em;
          text-transform: none;
          letter-spacing: 0.005em;
          color: var(--ink-soft);
          margin-top: 8px;
        }
        .hero-intro {
          font-size: 20px;
          line-height: 1.55;
          color: var(--ink-soft);
          max-width: 520px;
          margin-bottom: 40px;
          text-wrap: pretty;
        }
        .hero-ctas { display: flex; gap: 16px; flex-wrap: wrap; }
        .home-quickcard-link {
          background: none;
          border: none;
          cursor: pointer;
          margin-top: 18px;
          padding: 0;
          font-family: 'Cormorant Garamond', serif;
          font-style: italic;
          font-size: 15px;
          color: var(--ink-soft);
          text-decoration: underline;
          text-underline-offset: 3px;
          text-decoration-color: var(--line-strong);
        }
        .home-quickcard-link:hover { color: var(--gold); }

        .hero-daily {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 40px;
          position: relative;
        }
        .hero-daily::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 50% 30%, rgba(212, 168, 90, 0.12) 0%, transparent 60%);
          pointer-events: none;
        }
        .daily-label { color: var(--gold); margin-bottom: 20px; }
        .daily-card-wrap {
          width: 220px;
          margin-bottom: 24px;
          animation: cardHover 5s ease-in-out infinite;
        }
        @keyframes cardHover {
          0%, 100% { transform: translateY(0) rotate(-1deg); }
          50% { transform: translateY(-8px) rotate(1deg); }
        }
        .daily-name {
          font-family: 'Cinzel', serif;
          font-size: 18px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          margin-bottom: 12px;
          color: var(--gold);
        }
        .daily-meaning {
          font-family: 'Cormorant Garamond', serif;
          font-style: italic;
          font-size: 18px;
          line-height: 1.45;
          color: var(--ink);
          max-width: 340px;
          text-wrap: pretty;
        }
        .daily-hint {
          font-size: 12px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--ink-mute);
          margin-top: 20px;
          font-family: 'Cinzel', serif;
        }

        /* Sections */
        .section { padding: 80px 0; }
        .section-head { text-align: center; margin-bottom: 56px; }
        .section-head .eyebrow { margin-bottom: 16px; }
        .section-title {
          font-size: clamp(36px, 4.5vw, 56px);
          font-weight: 400;
          letter-spacing: 0.05em;
          margin-bottom: 12px;
        }
        .section-sub {
          font-size: 18px;
          color: var(--ink-soft);
          font-style: italic;
        }

        .spreads-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 20px;
        }
        .spread-card {
          background: linear-gradient(180deg, rgba(26, 20, 56, 0.6) 0%, rgba(15, 10, 36, 0.4) 100%);
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 36px 28px;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
          overflow: hidden;
        }
        .spread-card:hover {
          transform: translateY(-4px);
          border-color: var(--gold);
          box-shadow: 0 24px 40px -20px rgba(0, 0, 0, 0.5);
        }
        .spread-card::before {
          content: '';
          position: absolute;
          top: -20%;
          right: -20%;
          width: 200px;
          height: 200px;
          background: radial-gradient(circle, var(--gold-glow), transparent 70%);
          opacity: 0;
          transition: opacity 0.4s;
        }
        .spread-card:hover::before { opacity: 1; }
        .spread-num {
          font-family: 'Cinzel', serif;
          font-size: 12px;
          letter-spacing: 0.3em;
          color: var(--gold);
          margin-bottom: 20px;
        }
        .spread-name {
          font-family: 'Cinzel', serif;
          font-size: 20px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          margin-bottom: 10px;
          color: var(--ink);
        }
        .spread-desc {
          font-family: 'Cormorant Garamond', serif;
          font-style: italic;
          font-size: 16px;
          line-height: 1.5;
          color: var(--ink-soft);
          margin-bottom: 24px;
        }
        .spread-meta {
          display: flex;
          gap: 8px;
          font-size: 12px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--ink-mute);
          font-family: 'Cinzel', serif;
        }
        .spread-arrow {
          position: absolute;
          bottom: 28px;
          right: 28px;
          color: var(--gold);
          font-size: 22px;
          opacity: 0.6;
          transition: transform 0.3s, opacity 0.3s;
        }
        .spread-card:hover .spread-arrow { transform: translateX(4px); opacity: 1; }

        .tarotists-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 20px;
        }
        .tarotist-card {
          background: rgba(26, 20, 56, 0.4);
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 28px 20px;
          text-align: center;
          cursor: pointer;
          transition: transform 0.3s, border-color 0.3s;
        }
        .tarotist-card:hover { transform: translateY(-3px); border-color: var(--line-strong); }
        .tarotist-avatar {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          margin: 0 auto 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Cinzel', serif;
          font-size: 20px;
          letter-spacing: 0.1em;
          color: var(--bg);
          box-shadow: 0 0 30px rgba(212, 168, 90, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.15);
        }
        .tarotist-name {
          font-family: 'Cinzel', serif;
          font-size: 14px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-bottom: 6px;
        }
        .tarotist-spec {
          font-size: 15px;
          color: var(--ink-soft);
          margin-bottom: 12px;
        }

        .philosophy-strip {
          margin: 96px 0 64px;
          padding: 72px 48px;
          text-align: center;
          border-top: 1px solid var(--line);
          border-bottom: 1px solid var(--line);
        }
        .philosophy-strip.guide-strip {
          margin: 24px 0 0;
          padding: 56px 48px;
        }
        .philosophy-body {
          font-size: clamp(22px, 2.4vw, 32px);
          line-height: 1.4;
          max-width: 860px;
          margin: 24px auto 32px;
          color: var(--ink);
          text-wrap: pretty;
        }

        .site-footer {
          margin-top: 96px;
          padding-top: 40px;
          border-top: 1px solid var(--line);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          color: var(--ink-mute);
        }
        .footer-brand-lockup {
          color: var(--ink);
          margin-bottom: 4px;
        }
        .footer-tagline { font-size: 15px; }
        .footer-links {
          display: flex;
          gap: 24px;
          margin-top: 12px;
        }
        .footer-links a {
          color: var(--ink-mute);
          text-decoration: none;
          font-family: 'Cinzel', serif;
          font-size: 10px;
          letter-spacing: 0.24em;
          text-transform: uppercase;
        }
        .footer-links a:hover { color: var(--gold); }

        @media (max-width: 900px) {
          .hero { grid-template-columns: 1fr; gap: 48px; padding: 24px 0 48px; }
          .hero-daily { padding: 24px; }
          .section { padding: 48px 0; }
        }
      `}</style>
    </div>
  );
}

window.HomePage = HomePage;
