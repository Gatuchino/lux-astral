// Onboarding — 5 pasos para nuevos usuarios
function OnboardingPage({ lang, setRoute, onFinish }) {
  const t = window.I18N[lang];
  const Logo = window.ArcanaLogo;
  const total = 5;
  const [step, setStep] = React.useState(0);
  const [displayName, setDisplayName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [gender, setGender] = React.useState(null); // femenino | masculino | no-binario | prefiero-no-decir | null
  const [pace, setPace] = React.useState(null);      // solo | human | both
  const [interests, setInterests] = React.useState([]);
  const [dailyRitual, setDailyRitual] = React.useState(null); // true | false

  const toggleInterest = (id) => {
    setInterests((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const finish = () => {
    const prefs = {
      displayName: displayName.trim() || null,
      email: email.trim() || null,
      gender,
      pace,
      interests,
      dailyRitual,
      completedAt: new Date().toISOString(),
    };
    try { localStorage.setItem('vela_onboarding', JSON.stringify(prefs)); } catch {}
    if (onFinish) onFinish(prefs);
    setRoute({ page: 'home' });
  };

  const next = () => {
    if (step >= total - 1) return finish();
    setStep(step + 1);
  };
  const back = () => setStep(Math.max(0, step - 1));

  // Enable "next" per step
  const canNext = React.useMemo(() => {
    if (step === 0) return true;
    if (step === 1) return true; // nombre y género son opcionales
    if (step === 2) return pace !== null;
    if (step === 3) return interests.length > 0;
    if (step === 4) return dailyRitual !== null;
    return true;
  }, [step, pace, interests, dailyRitual]);

  return (
    <div className="onb-shell">
      {/* Top bar */}
      <div className="onb-top">
        <div className="onb-brand"><Logo variant="lockup" size={28} tagline="Tarot" /></div>
        <button className="onb-skip" onClick={() => finish()}>{t.onb_skip} →</button>
      </div>

      {/* Progress */}
      <div className="onb-progress">
        <div className="onb-progress-track">
          <div className="onb-progress-fill" style={{ width: `${((step + 1) / total) * 100}%` }} />
        </div>
        <div className="onb-progress-label">
          {t.onb_step.replace('{i}', step + 1).replace('{n}', total)}
        </div>
      </div>

      {/* Slides */}
      <div className="onb-body">
        {step === 0 && (
          <div className="onb-slide onb-slide-1" key="s0">
            <div className="onb-eyebrow eyebrow">{t.onb_1_eyebrow}</div>
            <h1 className="onb-h">{t.onb_1_title}</h1>
            <p className="onb-body-text">{t.onb_1_body}</p>
            <div className="onb-hero-visual">
              <div className="onb-hero-card" style={{ backgroundImage: "url('assets/tarot-moon.jpg')" }} />
              <div className="onb-hero-card onb-hero-card-2" style={{ backgroundImage: "url('assets/tarot-sun.jpg')" }} />
              <div className="onb-hero-card onb-hero-card-3" style={{ backgroundImage: "url('assets/tarot-moon.jpg')" }} />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="onb-slide" key="s1">
            <div className="onb-eyebrow eyebrow">{t.onb_name_eyebrow}</div>
            <h1 className="onb-h">{t.onb_name_title}</h1>
            <p className="onb-body-text">{t.onb_name_body}</p>
            <div className="onb-name-field" style={{ marginTop: 32 }}>
              <input
                type="text"
                className="onb-name-input"
                placeholder={t.onb_name_placeholder}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={40}
              />
            </div>
            <div className="onb-gender-field" style={{ marginTop: 32 }}>
              <div className="onb-gender-label">{t.onb_gender_label}</div>
              <div className="onb-chips" style={{ marginTop: 12 }}>
                {[
                  { id: 'femenino', label: t.onb_gender_femenino },
                  { id: 'masculino', label: t.onb_gender_masculino },
                  { id: 'no-binario', label: t.onb_gender_no_binario },
                  { id: 'prefiero-no-decir', label: t.onb_gender_prefiero_no_decir },
                ].map((g) => (
                  <button
                    key={g.id}
                    className={`onb-chip ${gender === g.id ? 'is-selected' : ''}`}
                    onClick={() => setGender(gender === g.id ? null : g.id)}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="onb-name-field" style={{ marginTop: 32 }}>
              <div className="onb-gender-label">{t.onb_email_label}</div>
              <input
                type="email"
                className="onb-name-input"
                style={{ marginTop: 12 }}
                placeholder={t.onb_email_placeholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={120}
              />
              <p className="italic" style={{ marginTop: 10, fontSize: 13, opacity: .75 }}>{t.onb_email_hint}</p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="onb-slide" key="s2">
            <div className="onb-eyebrow eyebrow">{t.onb_2_eyebrow}</div>
            <h1 className="onb-h">{t.onb_2_title}</h1>
            <p className="onb-body-text">{t.onb_2_body}</p>
            <div className="onb-options" style={{ marginTop: 40 }}>
              {[
                { id: 'solo',  h: t.onb_2_opt_solo,  d: t.onb_2_opt_solo_desc,  ico: '✦' },
                { id: 'human', h: t.onb_2_opt_human, d: t.onb_2_opt_human_desc, ico: '☾' },
                { id: 'both',  h: t.onb_2_opt_both,  d: t.onb_2_opt_both_desc,  ico: '✧' },
              ].map((o) => (
                <button
                  key={o.id}
                  className={`onb-opt ${pace === o.id ? 'is-selected' : ''}`}
                  onClick={() => setPace(o.id)}
                >
                  <span className="onb-opt-ico">{o.ico}</span>
                  <span className="onb-opt-txt">
                    <span className="onb-opt-h">{o.h}</span>
                    <span className="onb-opt-d italic">{o.d}</span>
                  </span>
                  <span className="onb-opt-check" aria-hidden="true">✓</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="onb-slide" key="s3">
            <div className="onb-eyebrow eyebrow">{t.onb_3_eyebrow}</div>
            <h1 className="onb-h">{t.onb_3_title}</h1>
            <p className="onb-body-text">{t.onb_3_body}</p>
            <div className="onb-chips" style={{ marginTop: 32 }}>
              {[
                { id: 'love',    label: t.onb_3_int_love },
                { id: 'career',  label: t.onb_3_int_career },
                { id: 'growth',  label: t.onb_3_int_growth },
                { id: 'grief',   label: t.onb_3_int_grief },
                { id: 'spirit',  label: t.onb_3_int_spirit },
                { id: 'curious', label: t.onb_3_int_curious },
              ].map((c) => (
                <button
                  key={c.id}
                  className={`onb-chip ${interests.includes(c.id) ? 'is-selected' : ''}`}
                  onClick={() => toggleInterest(c.id)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="onb-slide" key="s4">
            <div className="onb-eyebrow eyebrow">{t.onb_4_eyebrow}</div>
            <h1 className="onb-h">{t.onb_4_title}</h1>
            <p className="onb-body-text">{t.onb_4_body}</p>
            <div className="onb-options" style={{ marginTop: 40 }}>
              {[
                { id: true,  h: t.onb_4_opt_yes, d: t.onb_4_opt_yes_desc, ico: '☾' },
                { id: false, h: t.onb_4_opt_no,  d: t.onb_4_opt_no_desc,  ico: '·' },
              ].map((o) => (
                <button
                  key={String(o.id)}
                  className={`onb-opt ${dailyRitual === o.id ? 'is-selected' : ''}`}
                  onClick={() => setDailyRitual(o.id)}
                >
                  <span className="onb-opt-ico">{o.ico}</span>
                  <span className="onb-opt-txt">
                    <span className="onb-opt-h">{o.h}</span>
                    <span className="onb-opt-d italic">{o.d}</span>
                  </span>
                  <span className="onb-opt-check" aria-hidden="true">✓</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <div className="onb-nav">
        <button
          className="btn btn-ghost"
          style={{ visibility: step === 0 ? 'hidden' : 'visible' }}
          onClick={back}
        >
          ← {t.onb_back}
        </button>
        <button
          className="btn btn-primary btn-lg"
          disabled={!canNext}
          onClick={next}
          style={{ opacity: canNext ? 1 : 0.4, pointerEvents: canNext ? 'auto' : 'none' }}
        >
          {step === total - 1 ? (t.onb_finish + ' ✦') : (t.onb_next + ' →')}
        </button>
      </div>

      <style>{`
        .onb-shell {
          min-height: 100vh;
          max-width: 720px;
          margin: 0 auto;
          padding: 32px 32px 48px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          position: relative;
          z-index: 10;
        }
        /* Ensure main containers stretch full height when onboarding is active */
        main:has(.onb-shell) { min-height: 100vh; }
        .onb-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .onb-skip {
          background: transparent;
          border: none;
          color: var(--ink-mute);
          cursor: pointer;
          font-family: 'Cinzel', serif;
          font-size: 10px;
          letter-spacing: 0.24em;
          text-transform: uppercase;
        }
        .onb-skip:hover { color: var(--gold); }
        .onb-progress {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .onb-progress-track {
          flex: 1;
          height: 2px;
          background: rgba(212, 168, 90, 0.15);
          border-radius: 2px;
          overflow: hidden;
        }
        .onb-progress-fill {
          height: 100%;
          background: var(--gold);
          transition: width 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .onb-progress-label {
          font-family: 'Cinzel', serif;
          font-size: 10px;
          letter-spacing: 0.24em;
          color: var(--ink-mute);
          text-transform: uppercase;
        }
        .onb-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          padding: 24px 0 12px;
          opacity: 1;
          min-height: 0;
        }
        .onb-slide {
          animation: onbFade 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @media (min-height: 780px) {
          .onb-body { justify-content: center; }
        }
        @keyframes onbFade {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .onb-slide { width: 100%; }
        .onb-eyebrow { margin-bottom: 16px; }
        .onb-h {
          font-family: 'Cinzel', serif;
          font-size: clamp(32px, 4.5vw, 52px);
          font-weight: 400;
          letter-spacing: 0.03em;
          margin-bottom: 16px;
          line-height: 1.1;
        }
        .onb-body-text {
          font-size: 19px;
          line-height: 1.55;
          color: var(--ink-soft);
          max-width: 560px;
          text-wrap: pretty;
        }
        .onb-hero-visual {
          position: relative;
          margin: 40px auto 0;
          height: 220px;
          width: 100%;
          max-width: 480px;
        }
        @media (max-height: 720px) {
          .onb-hero-visual { display: none; }
        }
        .onb-hero-card {
          position: absolute;
          width: 128px;
          aspect-ratio: 2/3;
          background-size: cover;
          background-position: center;
          border: 1.5px solid var(--gold);
          border-radius: 6px;
          box-shadow: 0 24px 48px -12px rgba(0,0,0,0.5);
          left: 50%;
          top: 0;
          transform: translateX(-50%) rotate(-4deg);
        }
        .onb-hero-card-2 {
          transform: translateX(calc(-50% - 96px)) rotate(-14deg);
        }
        .onb-hero-card-3 {
          transform: translateX(calc(-50% + 96px)) rotate(14deg);
        }

        .onb-options {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .onb-opt {
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 18px 22px;
          background: rgba(26, 20, 56, 0.35);
          border: 1px solid var(--line);
          border-radius: 12px;
          color: var(--ink);
          text-align: left;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.25s;
        }
        .onb-opt:hover { border-color: var(--line-strong); background: rgba(26, 20, 56, 0.55); }
        .onb-opt.is-selected {
          border-color: var(--gold);
          background: rgba(212, 168, 90, 0.08);
          box-shadow: 0 0 0 1px var(--gold) inset;
        }
        .onb-opt-ico {
          flex-shrink: 0;
          font-size: 22px;
          color: var(--gold);
          font-family: 'Cinzel', serif;
          width: 32px;
          text-align: center;
        }
        .onb-opt-txt { flex: 1; display: flex; flex-direction: column; gap: 4px; }
        .onb-opt-h {
          font-family: 'Cinzel', serif;
          font-size: 14px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .onb-opt-d {
          font-size: 16px;
          color: var(--ink-soft);
        }
        .onb-opt-check {
          flex-shrink: 0;
          width: 24px; height: 24px;
          border-radius: 50%;
          border: 1px solid var(--line);
          display: flex; align-items: center; justify-content: center;
          color: transparent;
          font-size: 12px;
          transition: all 0.2s;
        }
        .onb-opt.is-selected .onb-opt-check {
          background: var(--gold);
          border-color: var(--gold);
          color: var(--bg);
        }

        .onb-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        .onb-chip {
          padding: 12px 20px;
          background: transparent;
          border: 1px solid var(--line);
          border-radius: 40px;
          color: var(--ink-soft);
          font-family: 'Cormorant Garamond', serif;
          font-size: 17px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .onb-chip:hover { border-color: var(--line-strong); color: var(--ink); }
        .onb-chip.is-selected {
          background: var(--gold);
          border-color: var(--gold);
          color: var(--bg);
          font-weight: 500;
        }

        .onb-name-input {
          width: 100%;
          max-width: 420px;
          padding: 16px 20px;
          background: rgba(26, 20, 56, 0.35);
          border: 1px solid var(--line);
          border-radius: 12px;
          color: var(--ink);
          font-family: 'Cormorant Garamond', serif;
          font-size: 18px;
          transition: border-color 0.2s;
        }
        .onb-name-input:focus {
          outline: none;
          border-color: var(--gold);
        }
        .onb-name-input::placeholder { color: var(--ink-mute); }
        .onb-gender-label {
          font-family: 'Cinzel', serif;
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--ink-mute);
        }

        .onb-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 24px;
          border-top: 1px solid var(--line);
        }
      `}</style>
    </div>
  );
}

window.OnboardingPage = OnboardingPage;
