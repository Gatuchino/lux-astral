// About / brand-story page — "Sobre nosotros"
function AboutPage({ lang, setRoute }) {
  const t = window.I18N[lang];

  const pillars = [
    { k: 1, h: t.about_promise_pillar_1_h, b: t.about_promise_pillar_1_body },
    { k: 2, h: t.about_promise_pillar_2_h, b: t.about_promise_pillar_2_body },
    { k: 3, h: t.about_promise_pillar_3_h, b: t.about_promise_pillar_3_body },
    { k: 4, h: t.about_promise_pillar_4_h, b: t.about_promise_pillar_4_body },
  ];
  const beliefs = [t.about_belief_1, t.about_belief_2, t.about_belief_3, t.about_belief_4];
  const teamRoles = [t.about_team_role_1, t.about_team_role_2, t.about_team_role_3, t.about_team_role_4];

  return (
    <div className="page about">
      {/* ============ Hero ============ */}
      <section className="ab-hero">
        <div className="eyebrow">{t.about_eyebrow}</div>
        <div className="ab-logo-hero">
          <img src="assets/logo-full.png" alt="Lux Astral" className="ab-logo-full" />
        </div>
        <h1 className="ab-h ab-h-visually-hidden">Lux Astral</h1>
        <div className="ab-tagline italic">{t.about_tagline}</div>
        <p className="ab-lead">{t.about_lead}</p>
      </section>

      {/* ============ Name ============ */}
      <section className="ab-section ab-name">
        <div className="ab-col-label eyebrow">{lang === 'es' ? '— Origen —' : '— Origin —'}</div>
        <div className="ab-col-body">
          <h2 className="ab-section-h">{t.about_name_h}</h2>
          <p className="ab-body">{t.about_name_body}</p>
          <div className="ab-etymology">
            <div className="ety-word">arcanum</div>
            <div className="ety-lat italic">latín, s.m.</div>
            <div className="ety-def">
              {lang === 'es'
                ? '“secreto, misterio; lo que se guarda para revelar sólo a quien está listo.”'
                : '“secret, mystery; that which is kept, to be revealed only to those ready.”'}
            </div>
          </div>
        </div>
      </section>

      {/* ============ Promise / pillars ============ */}
      <section className="ab-section ab-promise">
        <div className="ab-col-label eyebrow">{lang === 'es' ? '— Nuestra promesa —' : '— Our promise —'}</div>
        <div className="ab-col-body">
          <h2 className="ab-section-h">{t.about_promise_h}</h2>
          <p className="ab-body">{t.about_promise_body}</p>
          <div className="pillars">
            {pillars.map((p) => (
              <div key={p.k} className="pillar">
                <div className="pillar-num">{String(p.k).padStart(2, '0')}</div>
                <div className="pillar-h">{p.h}</div>
                <div className="pillar-b italic">{p.b}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ Beliefs ============ */}
      <section className="ab-beliefs">
        <div className="eyebrow" style={{ textAlign: 'center', marginBottom: 16 }}>
          {lang === 'es' ? '— Manifiesto —' : '— Manifesto —'}
        </div>
        <h2 className="ab-section-h" style={{ textAlign: 'center', marginBottom: 40 }}>{t.about_beliefs_h}</h2>
        <ol className="beliefs-list">
          {beliefs.map((b, i) => (
            <li key={i}>
              <span className="belief-num">{String(i + 1).padStart(2, '0')}</span>
              <span className="belief-text italic">"{b}"</span>
            </li>
          ))}
        </ol>
      </section>

      {/* ============ Team ============ */}
      <section className="ab-section">
        <div className="ab-col-label eyebrow">{lang === 'es' ? '— Equipo —' : '— Team —'}</div>
        <div className="ab-col-body">
          <h2 className="ab-section-h">{t.about_team_h}</h2>
          <p className="ab-body">{t.about_team_body}</p>
          <ul className="team-roles">
            {teamRoles.map((r, i) => (
              <li key={i} className="team-role-pill">{r}</li>
            ))}
          </ul>
          <div className="ab-signed">{t.about_signed}</div>
        </div>
      </section>

      {/* ============ CTA / contact ============ */}
      <section className="ab-cta">
        <div className="eyebrow">{lang === 'es' ? '— Contacto —' : '— Contact —'}</div>
        <h3 className="ab-cta-h">{t.about_cta_h}</h3>
        <p className="ab-cta-body italic">{t.about_cta_body}</p>
        <div style={{ marginTop: 28, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => setRoute({ page: 'readings' })}>
            {lang === 'es' ? 'Empezar una lectura' : 'Begin a reading'} ✦
          </button>
          <button className="btn btn-ghost" onClick={() => setRoute({ page: 'contact' })}>
            {t.nav_contact} →
          </button>
          <button className="btn btn-ghost" onClick={() => setRoute({ page: 'philosophy' })}>
            {t.nav_philosophy} →
          </button>
        </div>
      </section>

      <style>{`
        .about { max-width: 1120px; }
        .ab-hero {
          text-align: center;
          padding: 40px 20px 80px;
          position: relative;
        }
        .ab-hero::after {
          content: '';
          display: block;
          width: 80px;
          height: 1px;
          background: var(--gold);
          opacity: 0.4;
          margin: 60px auto 0;
        }
        .ab-logo-hero {
          display: inline-flex;
          margin: 12px 0 8px;
        }
        .ab-logo-full {
          display: block;
          width: min(420px, 82vw);
          height: auto;
          filter: drop-shadow(0 0 50px rgba(212,168,90,0.16));
        }
        .ab-h-visually-hidden {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
        .ab-h {
          font-family: 'Cinzel', serif;
          font-size: clamp(56px, 8vw, 96px);
          font-weight: 500;
          letter-spacing: 0.18em;
          color: var(--ink);
          margin: 0 0 20px;
        }
        .ab-tagline {
          font-family: 'Cormorant Garamond', serif;
          font-size: 22px;
          color: var(--gold);
          margin-bottom: 32px;
        }
        .ab-lead {
          font-size: 20px;
          line-height: 1.55;
          color: var(--ink);
          max-width: 720px;
          margin: 0 auto;
          text-wrap: pretty;
        }

        .ab-section {
          display: grid;
          grid-template-columns: 220px 1fr;
          gap: 64px;
          padding: 72px 0;
          border-top: 1px solid var(--line);
          align-items: start;
        }
        .ab-col-label {
          position: sticky;
          top: 100px;
          color: var(--gold);
        }
        .ab-section-h {
          font-family: 'Cinzel', serif;
          font-size: clamp(28px, 3.2vw, 40px);
          font-weight: 400;
          letter-spacing: 0.04em;
          margin-bottom: 24px;
          text-transform: uppercase;
        }
        .ab-body {
          font-size: 19px;
          line-height: 1.6;
          color: var(--ink);
          margin-bottom: 28px;
          text-wrap: pretty;
          max-width: 720px;
        }

        .ab-etymology {
          margin-top: 24px;
          padding: 28px 32px;
          border-left: 2px solid var(--gold);
          background: rgba(26, 20, 56, 0.4);
          border-radius: 0 8px 8px 0;
          max-width: 560px;
        }
        .ety-word {
          font-family: 'Cinzel', serif;
          font-size: 24px;
          letter-spacing: 0.12em;
          color: var(--gold);
          text-transform: lowercase;
        }
        .ety-lat {
          font-size: 14px;
          color: var(--ink-mute);
          margin-top: 2px;
        }
        .ety-def {
          margin-top: 12px;
          font-family: 'Cormorant Garamond', serif;
          font-style: italic;
          font-size: 17px;
          line-height: 1.5;
          color: var(--ink-soft);
        }

        .pillars {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
          margin-top: 40px;
        }
        .pillar {
          padding: 24px;
          border: 1px solid var(--line);
          border-radius: 10px;
          background: rgba(26, 20, 56, 0.3);
        }
        .pillar-num {
          font-family: 'Cinzel', serif;
          font-size: 11px;
          letter-spacing: 0.3em;
          color: var(--gold);
          margin-bottom: 16px;
        }
        .pillar-h {
          font-family: 'Cinzel', serif;
          font-size: 15px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 10px;
        }
        .pillar-b {
          font-size: 16px;
          line-height: 1.5;
          color: var(--ink-soft);
        }

        .ab-beliefs {
          padding: 96px 0;
          border-top: 1px solid var(--line);
        }
        .beliefs-list {
          list-style: none;
          padding: 0;
          margin: 0 auto;
          max-width: 760px;
          display: flex;
          flex-direction: column;
          gap: 32px;
        }
        .beliefs-list li {
          display: flex;
          gap: 24px;
          align-items: flex-start;
        }
        .belief-num {
          font-family: 'Cinzel', serif;
          font-size: 12px;
          letter-spacing: 0.3em;
          color: var(--gold);
          padding-top: 8px;
          flex-shrink: 0;
          min-width: 40px;
        }
        .belief-text {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(20px, 2.2vw, 26px);
          line-height: 1.45;
          color: var(--ink);
          text-wrap: pretty;
        }

        .team-roles {
          list-style: none;
          padding: 0;
          margin: 4px 0 28px;
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        .team-role-pill {
          font-family: 'Cinzel', serif;
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--ink-soft);
          border: 1px solid var(--line);
          border-radius: 999px;
          padding: 8px 16px;
          background: rgba(26, 20, 56, 0.3);
        }
        .ab-signed {
          margin-top: 24px;
          font-family: 'Cinzel', serif;
          font-size: 12px;
          letter-spacing: 0.24em;
          color: var(--gold);
          text-transform: uppercase;
        }

        .ab-cta {
          margin: 40px auto 0;
          padding: 64px 32px;
          text-align: center;
          border-top: 1px solid var(--line);
          border-bottom: 1px solid var(--line);
        }
        .ab-cta-h {
          font-family: 'Cinzel', serif;
          font-size: clamp(28px, 3vw, 40px);
          font-weight: 400;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          margin: 12px 0;
        }
        .ab-cta-body {
          font-size: 20px;
          color: var(--ink-soft);
          max-width: 520px;
          margin: 0 auto;
        }

        @media (max-width: 900px) {
          .ab-section { grid-template-columns: 1fr; gap: 20px; padding: 48px 0; }
          .ab-col-label { position: static; }
          .pillars { grid-template-columns: 1fr; gap: 16px; }
          .ab-hero { padding: 20px 0 48px; }
        }
      `}</style>
    </div>
  );
}

window.AboutPage = AboutPage;
