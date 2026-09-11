// Combined page module: Chart, Moon, Marketplace, Philosophy, Profile, Pricing

// =========== Chart ===========
const CHART_SIGNS_ES = ['Aries', 'Tauro', 'Géminis', 'Cáncer', 'Leo', 'Virgo', 'Libra', 'Escorpio', 'Sagitario', 'Capricornio', 'Acuario', 'Piscis'];
const CHART_SIGNS_EN = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
const CHART_GLYPHS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
const CHART_POINT_ORDER = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
const CHART_POINT_LABELS_ES = { sun: 'Sol', moon: 'Luna', mercury: 'Mercurio', venus: 'Venus', mars: 'Marte', jupiter: 'Júpiter', saturn: 'Saturno', uranus: 'Urano', neptune: 'Neptuno', pluto: 'Plutón' };
const CHART_POINT_LABELS_EN = { sun: 'Sun', moon: 'Moon', mercury: 'Mercury', venus: 'Venus', mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturn', uranus: 'Uranus', neptune: 'Neptune', pluto: 'Pluto' };
const CHART_POINT_SYMBOLS = { sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂', jupiter: '♃', saturn: '♄', uranus: '♅', neptune: '♆', pluto: '♇' };

// Carta Astral real (2026-09-11, a pedido de Christian): reemplaza el
// cálculo pseudo-random de antes por src/data/astro-calc.js (efemérides
// real vía astronomy-engine) + geocodificación real del lugar de
// nacimiento (acción "geo-lookup", ver local-server.js / booking.mts).
// La interpretación de IA reutiliza el mismo sistema de tickets/tipos de
// respuesta que las lecturas de tarot (ver PLAN_RESPONSE_TYPE_DEFAULT en
// el backend) -- la proporcionalidad que pidió Christian: Vela ve la
// carta pero sin interpretación, Luna tipo 3 (moderada), Estrella tipo 4
// (mayor + 2 preguntas), Oráculo tipo 5 (extensa + 5 preguntas). Ya no es
// efímera: las socias con plan pago la ven guardada en su Perfil (ver
// AstralChartsSection más abajo).
const CHART_RESPONSE_TYPES = {
  '3': {
    maxTokens: 1500, maxFollowUps: 0,
    instr_es: 'Escribe una interpretación moderada de esta carta astral, de 3 a 4 párrafos: describe la personalidad y el momento de vida que sugiere esta combinación (Sol, Luna, Ascendente y los demás planetas), conectando los puntos entre sí en vez de listarlos uno por uno. Tono cálido, cercano, sin tecnicismos innecesarios. Máximo 450 palabras.',
    instr_en: 'Write a moderate interpretation of this birth chart, 3 to 4 paragraphs: describe the personality and life moment suggested by this combination (Sun, Moon, Ascendant and the other planets), connecting the points to each other rather than listing them one by one. Warm, close tone, without unnecessary jargon. Maximum 450 words.',
  },
  '4': {
    maxTokens: 1900, maxFollowUps: 2,
    instr_es: 'Escribe una interpretación más elaborada de esta carta astral, de varios párrafos: dedica atención en profundidad al Sol, la Luna y el Ascendente, y después conecta el resto de los planetas en sus signos, mostrando tensiones y afinidades entre ellos. Actúas como una astróloga real en una sesión en vivo: esta es la lectura inicial de una conversación que puede seguir con hasta 2 preguntas de quien consulta. Máximo 800 palabras.',
    instr_en: 'Write a more elaborate interpretation of this birth chart, several paragraphs: give in-depth attention to the Sun, Moon and Ascendant, then connect the rest of the planets by sign, showing tensions and affinities between them. You act as a real astrologer in a live session: this is the opening reading of a conversation that may continue with up to 2 questions from the querent. Maximum 800 words.',
  },
  '5': {
    maxTokens: 2400, maxFollowUps: 5,
    instr_es: 'Escribe un informe astrológico muy elaborado y extenso, con el máximo detalle posible: desarrolla el Sol, la Luna, el Ascendente y cada planeta en su signo, sus vínculos y matices, y qué retrato de conjunto arma toda la carta. Actúas como una astróloga real en una sesión en vivo, generosa en tiempo y detalle. Esta lectura puede seguir con hasta 5 preguntas de quien consulta antes de cerrar. Sé extensa y minuciosa.',
    instr_en: 'Write a very elaborate and extensive astrological report, with as much detail as possible: develop the Sun, Moon, Ascendant and each planet in its sign, their links and nuances, and what overall portrait the whole chart paints. You act as a real astrologer in a live session, generous with time and detail. This reading may continue with up to 5 questions from the querent before closing. Be extensive and thorough.',
  },
};

function buildChartDescription(chart, lang) {
  const SIGNS = lang === 'es' ? CHART_SIGNS_ES : CHART_SIGNS_EN;
  const LABELS = lang === 'es' ? CHART_POINT_LABELS_ES : CHART_POINT_LABELS_EN;
  const lines = [];
  if (chart.ascendant) lines.push(`- ${lang === 'es' ? 'Ascendente' : 'Ascendant'}: ${SIGNS[chart.ascendant.signIndex]} ${chart.ascendant.deg.toFixed(1)}°`);
  CHART_POINT_ORDER.forEach((key) => {
    const p = chart.planets[key];
    if (p) lines.push(`- ${LABELS[key]}: ${SIGNS[p.signIndex]} ${p.deg.toFixed(1)}°`);
  });
  if (chart.midheaven) lines.push(`- ${lang === 'es' ? 'Medio Cielo' : 'Midheaven'}: ${SIGNS[chart.midheaven.signIndex]} ${chart.midheaven.deg.toFixed(1)}°`);
  return lines.join('\n');
}

async function requestChartInterpretation({ chart, lang, responseType, ticketId }) {
  const RT = CHART_RESPONSE_TYPES[responseType] || CHART_RESPONSE_TYPES['3'];
  const profile = (window.getArcanaProfile && window.getArcanaProfile()) || { name: null, gender: null };
  const genderLine = window.arcanaGenderInstruction ? window.arcanaGenderInstruction(profile.gender, lang) : '';
  const nameLine = window.arcanaNameInstruction ? window.arcanaNameInstruction(profile.name, lang) : '';
  const description = buildChartDescription(chart, lang);
  const polarNote_es = chart.polarWarning ? '\n(No se pudo calcular el Ascendente ni el Medio Cielo con precisión por la latitud extrema del lugar de nacimiento -- concentra el análisis en los planetas.)' : '';
  const polarNote_en = chart.polarWarning ? '\n(The Ascendant and Midheaven could not be calculated precisely due to the extreme latitude of the birthplace -- focus the analysis on the planets.)' : '';

  const prompt = lang === 'es'
    ? `Eres una astróloga experta y cálida. Escribes en español, en segunda persona, sin emoji ni titulares. ${genderLine} ${nameLine}\n\n${RT.instr_es}\n\nCarta astral real (posiciones tropicales calculadas para el momento y lugar de nacimiento):\n${description}\n${polarNote_es}`
    : `You are a warm, expert astrologer. You write in English, second person, no emoji or headings.\n\n${RT.instr_en}\n\nReal birth chart (tropical positions calculated for the birth moment and place):\n${description}\n${polarNote_en}`;

  const model = localStorage.getItem('arcana_setup_model') || undefined;
  const provider = localStorage.getItem('arcana_setup_provider') || undefined;
  return startJob(
    { prompts: [prompt], maxTokensList: [RT.maxTokens], model, provider, ticketId, readingType: responseType },
    'chart interpretation request failed'
  );
}

async function requestChartFollowUpReply({ chart, lang, interpretation, followUps, newQuestion, ticketId }) {
  const description = buildChartDescription(chart, lang);
  const historyList = followUps.map((f, i) => (lang === 'es'
    ? `Pregunta ${i + 1}: ${f.question}\nRespuesta: ${f.answer}`
    : `Question ${i + 1}: ${f.question}\nAnswer: ${f.answer}`)).join('\n\n');
  const prompt = lang === 'es'
    ? `Eres la misma astróloga experta y cálida de esta conversación. Escribes en español, en segunda persona, sin emoji ni titulares.\n\nCarta astral real:\n${description}\n\nYa diste esta lectura inicial:\n${interpretation || ''}\n${historyList ? `\nConversación hasta ahora:\n${historyList}\n` : ''}\nQuien consulta ahora pregunta: "${newQuestion}"\n\nResponde como la misma astróloga, en 1 a 3 párrafos, cálida, honesta y específica a la pregunta.`
    : `You are the same warm expert astrologer from this conversation. You write in English, second person, no emoji or headings.\n\nReal birth chart:\n${description}\n\nYou already gave this initial reading:\n${interpretation || ''}\n${historyList ? `\nConversation so far:\n${historyList}\n` : ''}\nThe querent now asks: "${newQuestion}"\n\nReply as the same astrologer, in 1 to 3 paragraphs, warm, honest and specific to the question.`;

  const model = localStorage.getItem('arcana_setup_model') || undefined;
  const provider = localStorage.getItem('arcana_setup_provider') || undefined;
  return startJob(
    { prompts: [prompt], maxTokensList: [900], model, provider, ticketId, isFollowUp: true },
    'chart follow-up request failed'
  );
}

function ChartPage({ lang, profile, planInfo, setRoute, requireAuth, saveChart, updateChart }) {
  const t = window.I18N[lang];
  const es = lang === 'es';
  const [form, setForm] = React.useState({ date: '1990-03-14', time: '09:41', place: '' });
  const [chart, setChart] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [savedId, setSavedId] = React.useState(null);

  const isSubscriber = !!(planInfo && planInfo.isSubscriber);

  // ----- Interpretación de IA (misma lógica de tickets que las lecturas) -----
  const [access, setAccess] = React.useState(null); // { responseType, planKey, ticketId } tras chart-access
  const [interpretation, setInterpretation] = React.useState(null);
  const [interpretBusy, setInterpretBusy] = React.useState(false);
  const [interpretError, setInterpretError] = React.useState('');
  const [followUps, setFollowUps] = React.useState([]);
  const [followUpDraft, setFollowUpDraft] = React.useState('');
  const [followUpBusy, setFollowUpBusy] = React.useState(false);
  const [followUpError, setFollowUpError] = React.useState('');

  const generate = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    setChart(null);
    setSavedId(null);
    setAccess(null);
    setInterpretation(null);
    setFollowUps([]);
    setInterpretError('');
    setFollowUpError('');
    try {
      let lat, lon, timeZone, displayName;
      const place = form.place.trim();
      if (place) {
        try {
          const geo = await window.arcanaGeoLookup(place);
          if (geo && !geo.error) {
            lat = geo.lat; lon = geo.lon; timeZone = geo.timezone; displayName = geo.displayName;
          } else {
            setError(t.chart_place_not_found);
          }
        } catch (geoErr) {
          setError(t.chart_place_not_found);
        }
      }
      const result = window.ArcanaAstro.computeAstralChart({ dateStr: form.date, timeStr: form.time, lat, lon, timeZone });
      setChart(result);
      if (isSubscriber && profile && profile.token) {
        const record = {
          id: 'ac_' + Date.now(),
          date: new Date().toISOString(),
          lang,
          birthDate: form.date,
          birthTime: form.time,
          birthPlace: displayName || place,
          timezone: timeZone || '',
          result,
          interpretation: null,
          followUps: [],
        };
        saveChart(record);
        setSavedId(record.id);
      }
    } catch (err) {
      setError((err && err.message) || (es ? 'No se pudo calcular la carta.' : 'Could not calculate the chart.'));
    } finally {
      setBusy(false);
    }
  };

  const runInterpretation = async () => {
    if (!profile || !profile.token) { requireAuth(() => {}); return; }
    if (interpretBusy || !chart) return;
    setInterpretBusy(true);
    setInterpretError('');
    try {
      const acc = await window.arcanaChartAccess();
      if (!acc.allowed) {
        throw new Error(acc.reason === 'requires-paid-plan' ? t.chart_ai_locked_vela : t.chart_ai_error_generic);
      }
      setAccess(acc);
      const text = await requestChartInterpretation({ chart, lang, responseType: acc.responseType, ticketId: acc.ticketId });
      setInterpretation(text);
      if (savedId) updateChart(savedId, { interpretation: text });
    } catch (err) {
      setInterpretError((err && err.message) || t.chart_ai_error_generic);
    } finally {
      setInterpretBusy(false);
    }
  };

  const askFollowUp = async () => {
    const q = followUpDraft.trim();
    if (!q || followUpBusy || !access) return;
    setFollowUpBusy(true);
    setFollowUpError('');
    try {
      const answer = await requestChartFollowUpReply({ chart, lang, interpretation, followUps, newQuestion: q, ticketId: access.ticketId });
      const next = [...followUps, { question: q, answer }];
      setFollowUps(next);
      setFollowUpDraft('');
      if (savedId) updateChart(savedId, { followUps: next });
    } catch (err) {
      setFollowUpError((err && err.message) || (es ? 'No se pudo obtener una respuesta. Intentá de nuevo.' : 'Could not get a reply. Try again.'));
    } finally {
      setFollowUpBusy(false);
    }
  };

  const RT = access ? CHART_RESPONSE_TYPES[access.responseType] : null;

  const planetRow = (label, p) => (
    <div className="ch-planet-row">
      <div className="ch-planet-label eyebrow">{label}</div>
      <div className="ch-planet-value">
        <span className="ch-planet-glyph">{CHART_GLYPHS[p.signIndex]}</span>
        <span className="italic">{es ? CHART_SIGNS_ES[p.signIndex] : CHART_SIGNS_EN[p.signIndex]} · {p.deg.toFixed(1)}°</span>
      </div>
    </div>
  );

  return (
    <div className="page chart-page">
      <div className="page-head chart-hero-band">
        <img src="assets/astral-chart-scene.jpg" alt="" aria-hidden="true" className="chart-hero-photo" />
        <div className="chart-hero-overlay" aria-hidden="true" />
        <div className="chart-hero-inner">
          <div className="eyebrow">— {t.nav_chart} —</div>
          <h1 className="page-title">{t.chart_h}</h1>
          <p className="page-sub italic">{t.chart_sub}</p>
        </div>
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
          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={busy}>
            {busy ? (es ? 'Calculando…' : 'Calculating…') : <>{t.chart_generate} ✦</>}
          </button>
          {error && <p className="reveal-followup-error" style={{ marginTop: 12 }}>{error}</p>}
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
                        {CHART_GLYPHS[i]}
                      </text>
                    </g>
                  );
                })}
                {/* Ascendente / Medio Cielo -- eje real de la carta */}
                {chart.ascendant && [
                  { p: chart.ascendant, label: 'ASC' },
                  ...(chart.midheaven ? [{ p: chart.midheaven, label: 'MC' }] : []),
                ].map((axis, idx) => {
                  const lonAbs = axis.p.signIndex * 30 + axis.p.deg;
                  const a = (lonAbs - 90) * Math.PI / 180;
                  const x2 = 150 + Math.cos(a) * 140;
                  const y2 = 150 + Math.sin(a) * 140;
                  const tx = 150 + Math.cos(a) * 152;
                  const ty = 150 + Math.sin(a) * 152;
                  return (
                    <g key={`axis-${idx}`}>
                      <line x1="150" y1="150" x2={x2} y2={y2} stroke="#f0e2c0" strokeWidth="1.1" opacity="0.85"/>
                      <text x={tx} y={ty} fontFamily="Cinzel" fontSize="9" fill="#f0e2c0" textAnchor="middle" dominantBaseline="middle">
                        {axis.label}
                      </text>
                    </g>
                  );
                })}
                {/* Puntos planetarios */}
                {CHART_POINT_ORDER.map((key, idx) => {
                  const p = chart.planets[key];
                  if (!p) return null;
                  const a = ((p.signIndex * 30 + p.deg) - 90) * Math.PI / 180;
                  const r = 84 + (idx % 5) * 4;
                  const x = 150 + Math.cos(a) * r;
                  const y = 150 + Math.sin(a) * r;
                  return (
                    <g key={key}>
                      <circle cx={x} cy={y} r={key === 'sun' ? 6 : key === 'moon' ? 5 : 4} fill="#f0e2c0" opacity="0.9"/>
                      <text x={x} y={y + 1} fontFamily="Cinzel" fontSize="9" fill="#0f0a24" textAnchor="middle" dominantBaseline="middle">
                        {CHART_POINT_SYMBOLS[key]}
                      </text>
                    </g>
                  );
                })}
                <circle cx="150" cy="150" r="42" fill="#0f0a24" stroke="#d4a85a" strokeWidth="0.6"/>
                <text x="150" y="145" fontFamily="Cinzel" fontSize="32" fill="#d4a85a" textAnchor="middle" dominantBaseline="middle">
                  {CHART_GLYPHS[chart.planets.sun.signIndex]}
                </text>
                <text x="150" y="175" fontFamily="Cormorant Garamond" fontStyle="italic" fontSize="12" fill="#f0e2c0" textAnchor="middle">
                  {es ? CHART_SIGNS_ES[chart.planets.sun.signIndex] : CHART_SIGNS_EN[chart.planets.sun.signIndex]}
                </text>
              </svg>
            </div>
            <div className="chart-planets">
              {chart.ascendant && planetRow(t.chart_rising, chart.ascendant)}
              {planetRow(t.chart_sun, chart.planets.sun)}
              {planetRow(t.chart_moon, chart.planets.moon)}
              {planetRow(t.chart_mercury, chart.planets.mercury)}
              {planetRow(t.chart_venus, chart.planets.venus)}
              {planetRow(t.chart_mars, chart.planets.mars)}
              {planetRow(t.chart_jupiter, chart.planets.jupiter)}
              {planetRow(t.chart_saturn, chart.planets.saturn)}
              {planetRow(t.chart_uranus, chart.planets.uranus)}
              {planetRow(t.chart_neptune, chart.planets.neptune)}
              {planetRow(t.chart_pluto, chart.planets.pluto)}
              {chart.midheaven && planetRow(t.chart_midheaven, chart.midheaven)}
            </div>
          </div>
        )}

        {chart && chart.polarWarning && (
          <p className="italic" style={{ color: 'var(--ink-soft)', marginTop: 8 }}>{t.chart_polar_note}</p>
        )}
        {chart && savedId && (
          <p className="italic" style={{ color: 'var(--ink-soft)', marginTop: 8 }}>{t.chart_saved_note}</p>
        )}

        {chart && (
          <div className="chart-ai-card">
            <div className="eyebrow">— {t.chart_ai_h} —</div>
            {!interpretation && !interpretBusy && (
              <p className="italic chart-ai-lead">{t.chart_ai_lead}</p>
            )}

            {!profile || !profile.token ? (
              <div className="chart-ai-locked">
                <p>{t.chart_ai_locked_guest}</p>
                <button className="btn btn-primary" onClick={() => requireAuth(() => {})}>{t.chart_ai_locked_guest_cta}</button>
              </div>
            ) : !isSubscriber ? (
              <div className="chart-ai-locked">
                <p>{t.chart_ai_locked_vela}</p>
                <button className="btn btn-primary" onClick={() => setRoute({ page: 'pricing' })}>{t.chart_ai_locked_vela_cta}</button>
              </div>
            ) : !interpretation ? (
              <div>
                <button className="btn btn-primary btn-lg" onClick={runInterpretation} disabled={interpretBusy}>
                  {interpretBusy ? t.chart_ai_busy : t.chart_ai_cta}
                </button>
                {interpretError && <p className="reveal-followup-error" style={{ marginTop: 12 }}>{interpretError}</p>}
              </div>
            ) : (
              <div className="chart-ai-text">
                {renderInterpretationBlocks(interpretation)}

                {followUps.map((f, i) => (
                  <div key={i} className="reveal-followup-item">
                    <div className="reveal-followup-q">— {f.question}</div>
                    <div className="reveal-followup-a italic">{f.answer}</div>
                  </div>
                ))}

                {RT && RT.maxFollowUps > 0 && (
                  followUps.length < RT.maxFollowUps ? (
                    <div className="reveal-followup-input" style={{ marginTop: 16 }}>
                      <textarea
                        className="form-field"
                        value={followUpDraft}
                        onChange={(e) => setFollowUpDraft(e.target.value)}
                        placeholder={t.chart_ai_followup_ph}
                        disabled={followUpBusy}
                        rows={2}
                      />
                      <div className="reveal-followup-actions">
                        <button className="btn btn-primary" onClick={askFollowUp} disabled={followUpBusy || !followUpDraft.trim()}>
                          {followUpBusy ? t.chart_ai_followup_busy : t.chart_ai_followup_cta}
                        </button>
                      </div>
                      {followUpError && <p className="reveal-followup-error">{followUpError}</p>}
                    </div>
                  ) : (
                    <p className="italic reveal-followup-done">{t.chart_ai_followup_done}</p>
                  )
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .chart-page { max-width: 1100px; }
        .page-head { text-align: center; margin-bottom: 48px; }
        .page-head .eyebrow { margin-bottom: 16px; }
        .page-title { font-size: clamp(40px, 5vw, 64px); font-weight: 400; margin-bottom: 12px; }
        .page-sub { font-size: 20px; color: var(--ink-soft); }

        .chart-hero-band {
          position: relative;
          overflow: hidden;
          isolation: isolate;
          border-radius: 24px;
          border: 1px solid var(--line);
          padding: 64px 32px 56px;
        }
        .chart-hero-photo {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: 50% 38%;
          z-index: -2;
        }
        .chart-hero-overlay {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 50% 40%, rgba(15,10,36,0.5), rgba(15,10,36,0.9) 70%),
            rgba(15,10,36,0.5);
          z-index: -1;
        }
        .chart-hero-inner { position: relative; }
        @media (max-width: 640px) {
          .chart-hero-band { padding: 44px 20px 36px; }
        }

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
          grid-column: 2;
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

        .chart-ai-card {
          grid-column: 2;
          background: rgba(26, 20, 56, 0.4);
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 32px;
        }
        .chart-ai-lead { color: var(--ink-soft); margin-bottom: 16px; }
        .chart-ai-locked p { margin-bottom: 16px; color: var(--ink-soft); }
        .chart-ai-text p { margin-bottom: 14px; line-height: 1.7; }

        @media (max-width: 900px) {
          .chart-container { grid-template-columns: 1fr; }
          .chart-result { grid-column: 1; grid-template-columns: 1fr; }
          .chart-ai-card { grid-column: 1; }
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
        <img src="assets/moon-phases-arc.jpg" alt="" aria-hidden="true" className="moon-hero-photo" />
        <div className="moon-hero-overlay" aria-hidden="true" />
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
          position: relative;
          overflow: hidden;
          isolation: isolate;
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
        .moon-hero-photo {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: 50% 22%;
          z-index: -2;
        }
        .moon-hero-overlay {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 26% 50%, rgba(15,10,36,0.45), rgba(15,10,36,0.88) 68%),
            linear-gradient(120deg, rgba(15,10,36,0.85) 0%, rgba(15,10,36,0.55) 45%, rgba(15,10,36,0.82) 100%);
          z-index: -1;
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

  const load = React.useCallback(() => {
    setLoading(true);
    setLoadError(false);
    window.arcanaFetchTarotistas()
      .then((data) => {
        setTarotists(data.tarotists || []);
        if (data.settings) setSettings(data.settings);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => { load(); }, [load]);

  // 2026-09-10 (a pedido de Christian): "Reservar" ya no abre un popup de
  // pago encima de la vitrina de tarotistas -- navega a una pantalla
  // propia y dedicada (SessionCheckoutPage, más abajo en este archivo)
  // con 2 pasos: elegir horario + ver qué incluye la sesión, y recién
  // después el resumen comercial y el pago. Mismo criterio que ya se usa
  // para "elegir un plan" en Planes.
  const openBooking = (tr) => {
    setRoute({ page: 'sessioncheckout', tarotistId: tr.id });
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
                  <span className="live-rate-unit">/ 45 min</span>
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

        .btn:disabled { opacity: 0.4; cursor: not-allowed; }

        /* Responsive */
        @media (max-width: 780px) {
          .live-hero { grid-template-columns: 1fr; gap: 24px; padding: 32px 22px; text-align: center; }
          .live-hero-r { align-items: center; }
          .live-stats { grid-template-columns: repeat(3, 1fr); gap: 12px; padding: 18px 0; }
          .live-cta-row { flex-direction: column; }
          .live-orb { width: 140px; height: 140px; font-size: 42px; }
          .live-how-steps { grid-template-columns: 1fr; }
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

function ProfilePage({ lang, profile, updateProfile, readings, charts, setRoute, planInfo, deleteReading, updateReading, deleteChart, onSignOut, requireAuth }) {
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
  // Carta Astral real (2026-09-11): a diferencia del Cofre (solo Estrella/Oraculo), esta seccion es para cualquier plan pago.
  const isSubscriberForCharts = !!(planInfo && planInfo.isSubscriber);

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

      {(isCofreEligible || isSubscriberForCharts) && (
        <div className="profile-tabs">
          <button
            className={`profile-tab-btn${profileTab === 'historial' ? ' is-active' : ''}`}
            onClick={() => setProfileTab('historial')}
          >
            📜 {es ? 'Mi historial' : 'My history'}
          </button>
          {isSubscriberForCharts && (
            <button
              className={`profile-tab-btn${profileTab === 'carta' ? ' is-active' : ''}`}
              onClick={() => setProfileTab('carta')}
            >
              🔮 {t.profile_charts_tab}
            </button>
          )}
          {isCofreEligible && (
            <button
              className={`profile-tab-btn profile-tab-btn-cofre${profileTab === 'cofre' ? ' is-active' : ''}`}
              onClick={() => setProfileTab('cofre')}
            >
              ✦ {t.profile_cofre_h}
            </button>
          )}
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

      {profileTab === 'carta' && isSubscriberForCharts && (
        <AstralChartsSection charts={charts || []} lang={lang} t={t} es={es} onDelete={(id) => { if (window.confirm(t.profile_charts_delete_confirm)) deleteChart(id); }} />
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

// Carta Astral guardada (2026-09-11, a pedido de Christian): "un cuadro
// de Carta Astral donde le puede hacer seguimiento y revisar cuando lo
// estime conveniente" -- lista simple (mismo lenguaje visual que el
// historial de lecturas), cada carta expandible para ver su
// interpretación de IA y las preguntas de seguimiento ya hechas.
function AstralChartsSection({ charts, lang, t, es, onDelete }) {
  const [openId, setOpenId] = React.useState(null);
  const sorted = [...charts].sort((a, b) => new Date(b.date) - new Date(a.date));
  const SIGNS = lang === 'es' ? CHART_SIGNS_ES : CHART_SIGNS_EN;

  return (
    <div className="profile-history">
      <div className="profile-history-head">
        <div className="eyebrow">— {t.profile_charts_h} —</div>
      </div>
      {sorted.length === 0 ? (
        <div className="profile-empty">
          <p className="italic">{t.profile_charts_empty}</p>
        </div>
      ) : (
        <div className="profile-history-list">
          {sorted.map((c) => {
            const d = new Date(c.date);
            const r = c.result || {};
            const sunSign = r.planets && r.planets.sun ? SIGNS[r.planets.sun.signIndex] : '—';
            const moonSign = r.planets && r.planets.moon ? SIGNS[r.planets.moon.signIndex] : '—';
            const ascSign = r.ascendant ? SIGNS[r.ascendant.signIndex] : null;
            const isOpen = openId === c.id;
            return (
              <div key={c.id} className="history-row">
                <div className="history-body">
                  <div className="history-date">
                    {d.getDate()} {t.month_names[d.getMonth()]}, {d.getFullYear()}
                  </div>
                  <div className="history-spread">
                    {c.birthPlace ? `${c.birthDate} · ${c.birthPlace}` : c.birthDate}
                  </div>
                  <div className="italic" style={{ fontSize: 14, marginTop: 4 }}>
                    ☉ {sunSign} · ☽ {moonSign}{ascSign ? ` · ASC ${ascSign}` : ''}
                  </div>
                  {isOpen && (
                    <div style={{ marginTop: 14 }}>
                      {c.interpretation ? (
                        renderInterpretationBlocks(c.interpretation)
                      ) : (
                        <p className="italic" style={{ color: 'var(--ink-soft)' }}>
                          {es ? 'Todavía no le pediste una interpretación a la IA para esta carta.' : "You haven't asked AI for an interpretation of this chart yet."}
                        </p>
                      )}
                      {(c.followUps || []).map((f, i) => (
                        <div key={i} style={{ marginTop: 12 }}>
                          <div style={{ fontWeight: 600 }}>— {f.question}</div>
                          <div className="italic">{f.answer}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="history-actions">
                  <button className="history-action-btn" title={isOpen ? t.profile_charts_hide : t.profile_charts_view} onClick={() => setOpenId(isOpen ? null : c.id)}>
                    {isOpen ? '▲' : '👁'}
                  </button>
                  <button className="history-action-btn" title={es ? 'Borrar' : 'Delete'} onClick={() => onDelete(c.id)}>🗑</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
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
// Precios de los 3 planes pagos + metadata de tarjeta (nombre, features,
// etc) -- compartido entre PricingPage (la vitrina) y PlanCheckoutPage (el
// flujo de suscripción en 3 pasos), para no duplicar los mismos textos.
// 2026-09-10 (a pedido de Christian): estos valores por defecto ya no son
// la fuente de verdad -- son solo el respaldo mientras carga
// plansConfig.planPrices (que viene de store.settings.planPrices, editable
// desde Setup > Planes). Si el Power User cambia un precio ahi, la
// pantalla lo refleja solo.
const DEFAULT_PLAN_PRICES = {
  luna_month: 6, luna_year: 60,
  estrella_month: 9, estrella_year: 90,
  oraculo_month: 24, oraculo_year: 240,
};
function planPriceFor(plansConfig, key) {
  const raw = plansConfig.planPrices && plansConfig.planPrices[key];
  const n = raw != null ? Number(raw) : DEFAULT_PLAN_PRICES[key];
  return Number.isFinite(n) ? n : DEFAULT_PLAN_PRICES[key];
}
function buildPlanCards(t) {
  return [
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
      highlightFeature: 1, // f2: la sesión de video gratis -- lo que justifica el precio de Oráculo
      sigil: '✧',
    },
  ];
}

// CSS compartida por las pantallas de checkout (planes y sesiones) --
// un solo lugar para el look de "pantalla dedicada, no popup" que pidió
// Christian, en vez de duplicar el mismo bloque en cada componente.
const CHECKOUT_STYLES = `

        .checkout-page {
          min-height: 100vh;
          display: flex;
          justify-content: center;
          padding: 48px 16px 64px;
          background: radial-gradient(circle at 50% 0%, rgba(212,168,90,.08), transparent 60%);
        }
        .checkout-card {
          max-width: 640px;
          width: 100%;
        }
        .checkout-exit {
          background: transparent;
          border: none;
          color: var(--ink-soft);
          font-family: 'Cinzel', serif;
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          cursor: pointer;
          padding: 6px 0;
          margin-bottom: 24px;
        }
        .checkout-exit:hover { color: var(--gold); }

        .checkout-steps {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-bottom: 32px;
        }
        .checkout-step { display: flex; align-items: center; gap: 8px; opacity: 0.5; }
        .checkout-step.is-active, .checkout-step.is-done { opacity: 1; }
        .checkout-step-dot {
          width: 24px; height: 24px;
          border-radius: 50%;
          border: 1px solid var(--line-strong);
          display: flex; align-items: center; justify-content: center;
          font-family: 'Cinzel', serif;
          font-size: 11px;
          color: var(--ink-soft);
        }
        .checkout-step.is-active .checkout-step-dot { border-color: var(--gold); color: var(--gold); }
        .checkout-step.is-done .checkout-step-dot { background: var(--gold); border-color: var(--gold); color: var(--bg); }
        .checkout-step-label {
          font-family: 'Cinzel', serif;
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--ink-soft);
        }
        .checkout-step.is-active .checkout-step-label { color: var(--ink); }
        .checkout-step:not(:last-child)::after {
          content: '';
          width: 20px;
          height: 1px;
          background: var(--line);
          margin-left: 6px;
        }

        .checkout-hero {
          position: relative;
          overflow: hidden;
          border-radius: 20px;
          border: 1px solid var(--line);
          padding: 56px 32px;
          text-align: center;
          background-size: cover;
          background-position: center;
          isolation: isolate;
        }
        .checkout-hero-overlay {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 50% 40%, rgba(15,10,36,0.55), rgba(15,10,36,0.92) 75%),
            rgba(15,10,36,0.55);
          z-index: -1;
        }
        .checkout-h {
          font-family: 'Cinzel', serif;
          font-size: clamp(30px, 4vw, 40px);
          font-weight: 400;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin: 10px 0 6px;
        }
        .checkout-tag { color: var(--ink-soft); font-size: 16px; }

        .checkout-body { margin-top: 28px; }
        .checkout-hero + .checkout-body { margin-top: 24px; }
        .checkout-h2 {
          font-family: 'Cinzel', serif;
          font-size: clamp(24px, 3vw, 30px);
          font-weight: 400;
          margin-bottom: 8px;
        }
        .checkout-sub { color: var(--ink-soft); font-size: 16px; margin-bottom: 24px; }
        .checkout-lead {
          font-family: 'Cormorant Garamond', serif;
          font-size: 19px;
          line-height: 1.6;
          color: var(--ink);
          margin-bottom: 20px;
        }
        .checkout-features {
          list-style: none;
          padding: 20px 0;
          margin: 0 0 20px;
          border-top: 1px solid var(--line);
          border-bottom: 1px solid var(--line);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .checkout-features li {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          font-family: 'Cormorant Garamond', serif;
          font-size: 16px;
          color: var(--ink);
        }
        .checkout-features .cf-check { color: var(--gold); font-size: 12px; line-height: 1.7; flex-shrink: 0; }
        .checkout-features li.is-highlight {
          margin: 0 -14px;
          padding: 10px 14px;
          background: linear-gradient(90deg, rgba(212,168,90,0.16), rgba(212,168,90,0.04));
          border: 1px solid rgba(212,168,90,0.4);
          border-radius: 10px;
          color: var(--gold);
        }
        .checkout-features li.is-highlight span:last-child { font-weight: 600; }
        .checkout-trust { color: var(--ink-mute); font-size: 14px; margin-bottom: 26px; }
        .checkout-cta { width: 100%; }

        .checkout-billing {
          display: inline-flex;
          gap: 4px;
          padding: 5px;
          border: 1px solid var(--line);
          border-radius: 999px;
          background: rgba(26, 20, 56, 0.4);
          margin-bottom: 24px;
        }
        .checkout-bt-opt {
          background: transparent;
          border: none;
          color: var(--ink-soft);
          font-family: 'Cinzel', serif;
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          padding: 9px 18px;
          border-radius: 999px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .checkout-bt-opt.is-active { background: var(--gold); color: var(--bg); }
        .checkout-bt-save { font-family: 'Cormorant Garamond', serif; font-style: italic; font-size: 11px; opacity: .85; text-transform: none; }

        .checkout-price-block {
          padding: 24px;
          border: 1px solid var(--line);
          border-radius: 16px;
          background: rgba(26, 20, 56, 0.35);
          margin-bottom: 24px;
        }
        .checkout-price { display: flex; align-items: baseline; gap: 4px; }
        .cp-currency { font-family: 'Cinzel', serif; font-size: 20px; color: var(--gold); }
        .cp-big { font-family: 'Cinzel', serif; font-size: 44px; font-weight: 500; color: var(--gold); line-height: 1; }
        .cp-unit { font-family: 'Cormorant Garamond', serif; font-style: italic; font-size: 15px; color: var(--ink-soft); margin-left: 4px; }
        .checkout-price-note { margin-top: 12px; font-size: 15px; line-height: 1.6; color: var(--ink-soft); }

        .checkout-switch { margin-bottom: 28px; }
        .checkout-switch-row { display: flex; gap: 10px; flex-wrap: wrap; }
        .checkout-switch-btn {
          background: transparent;
          border: 1px solid var(--line);
          color: var(--ink-soft);
          font-family: 'Cinzel', serif;
          font-size: 11px;
          letter-spacing: 0.08em;
          padding: 10px 16px;
          border-radius: 10px;
          cursor: pointer;
        }
        .checkout-switch-btn:hover { border-color: var(--gold); color: var(--gold); }

        .checkout-summary {
          border: 1px solid var(--line);
          border-radius: 16px;
          padding: 18px 22px;
          margin-bottom: 22px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .checkout-summary div { display: flex; justify-content: space-between; font-size: 15px; }
        .checkout-summary span { color: var(--ink-soft); }
        .checkout-summary strong { color: var(--ink); font-weight: 500; }

        .checkout-policies {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          font-size: 14px;
          color: var(--ink-soft);
          cursor: pointer;
          margin-bottom: 18px;
        }
        .checkout-policies input { margin-top: 3px; }
        .checkout-policies-link {
          background: none;
          border: none;
          padding: 0;
          color: var(--gold);
          text-decoration: underline;
          cursor: pointer;
          font-size: inherit;
          font-family: inherit;
        }
        .checkout-paypal-locked {
          text-align: center;
          padding: 20px;
          border: 1px dashed var(--line);
          border-radius: 12px;
          color: var(--ink-mute);
          font-size: 14px;
        }
        .live-pay-note {
          margin-top: 10px;
          font-size: 13px;
          color: var(--ink-mute);
        }
        .live-paypal-box { min-height: 45px; margin-top: 10px; }

        .checkout-nav-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 24px;
          gap: 12px;
        }

        @media (max-width: 560px) {
          .checkout-hero { padding: 40px 20px; }
          .checkout-nav-row { flex-direction: column-reverse; align-items: stretch; }
        }
`;

function PricingPage({ lang, setRoute, profile }) {
  const t = window.I18N[lang];
  const go = (page) => { if (typeof setRoute === 'function') setRoute({ page }); };
  const [billing, setBilling] = React.useState('year'); // 'month' | 'year'
  const [openFaq, setOpenFaq] = React.useState(0);

  // Precios + PayPal client id (para el cuadro de Sesiones y para calcular
  // los precios que se muestran acá). El flujo de suscripción en sí
  // (cargar el SDK, mostrar el botón de PayPal, confirmar) ya no vive acá
  // -- 2026-09-10 (a pedido de Christian): elegir un plan ya no abre un
  // popup de pago encima de la vitrina, sino que navega a una pantalla
  // propia y dedicada (PlanCheckoutPage, más abajo en este archivo) con
  // 3 pasos: confirmación del plan, detalle comercial, y recién ahí el
  // pago -- se siente más serio para algo que involucra dinero.
  const [plansConfig, setPlansConfig] = React.useState({ plans: null, paypalClientId: '', planPrices: null });

  React.useEffect(() => {
    window.arcanaSubscriptionPlans().then(setPlansConfig).catch(() => {});
  }, []);

  const openSubscribe = (planKey) => {
    setRoute({ page: 'plancheckout', planKey, billing });
  };

  const planPrice = (key) => planPriceFor(plansConfig, key);
  const prices = {
    vela:     { month: 0, year: 0 },
    luna:     { month: planPrice('luna_month'), year: planPrice('luna_year') },
    estrella: { month: planPrice('estrella_month'), year: planPrice('estrella_year') },
    oraculo:  { month: planPrice('oraculo_month'), year: planPrice('oraculo_year') },
  };

  // Precio de la sesión paga con tarotista (45 min) -- mismo valor real que
  // se cobra en el Marketplace (store.settings.sessionBasePrice), así este
  // cuadro nunca queda desactualizado si Christian cambia el precio en Setup.
  const sessionPriceRaw = plansConfig.sessionBasePrice;
  const sessionPrice = Number.isFinite(Number(sessionPriceRaw)) ? Number(sessionPriceRaw) : 29;

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

  const plans = buildPlanCards(t);

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
                  <li key={i} className={i === plan.highlightFeature ? 'is-highlight' : ''}>
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
          <ul className="ms-features">
            {[t.pricing_sessions_f1, t.pricing_sessions_f2, t.pricing_sessions_f3, t.pricing_sessions_f4, t.pricing_sessions_f5].map((f, i) => (
              <li key={i}>
                <span className="feat-check" aria-hidden>✦</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <p className="ms-note italic">{t.pricing_sessions_note}</p>
        </div>
        <div className="ms-side">
          <div className="ms-price">
            <span className="ms-price-currency">{t.pricing_currency}</span>
            <span className="ms-price-big">{sessionPrice}</span>
            <span className="ms-price-unit">{t.pricing_market_price_unit}</span>
          </div>
          <div className="ms-rate">{t.pricing_market_duration}</div>
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

      <div className="pricing-footer">
        <div className="pf-star" aria-hidden>✦</div>
        <p className="pf-quote italic">{t.pricing_footer_quote}</p>
        <button className="pf-policies-link" onClick={() => go('policies')}>
          {lang === 'es' ? 'Políticas de Lux Astral' : 'Lux Astral Policies'}
        </button>
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

        /* Feature destacada (ej: la sesión gratis de Oráculo, el gatillante
           del precio del plan) -- resalte sutil en dorado sin romper el
           layout de la lista. */
        .plan-features li.is-highlight {
          margin: 0 -12px;
          padding: 10px 12px;
          background: linear-gradient(90deg, rgba(212,168,90,0.16), rgba(212,168,90,0.04));
          border: 1px solid rgba(212,168,90,0.4);
          border-radius: 10px;
          color: var(--gold);
        }
        .plan-features li.is-highlight .feat-check { opacity: 1; }
        .plan-features li.is-highlight span:last-child { font-weight: 600; }

        /* Marketplace strip -- cuadro de Sesiones completas pagas, separado
           de lo que ya trae el plan Oráculo (sesión gratis de 15 min). El
           precio viene siempre en vivo de store.settings.sessionBasePrice
           (mismo valor real que se cobra en el Marketplace), nunca hardcodeado. */
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
        .ms-features {
          list-style: none;
          margin: 22px 0 0;
          padding: 20px 0 0;
          border-top: 1px solid var(--line);
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px 24px;
          max-width: 560px;
        }
        @media (max-width: 760px) { .ms-features { grid-template-columns: 1fr; text-align: left; } }
        .ms-features li {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          font-family: 'Cormorant Garamond', serif;
          font-size: 15px;
          line-height: 1.4;
          color: var(--ink);
        }
        .ms-note {
          margin-top: 18px;
          font-size: 14px;
          color: var(--ink-mute);
          max-width: 560px;
        }
        .ms-side { display: flex; flex-direction: column; gap: 10px; align-items: flex-end; }
        @media (max-width: 760px) { .ms-side { align-items: center; } }
        .ms-price {
          display: flex;
          align-items: baseline;
          gap: 4px;
        }
        .ms-price-currency {
          font-family: 'Cinzel', serif;
          font-size: 18px;
          color: var(--gold);
        }
        .ms-price-big {
          font-family: 'Cinzel', serif;
          font-size: 40px;
          font-weight: 500;
          color: var(--gold);
          line-height: 1;
        }
        .ms-price-unit {
          font-family: 'Cormorant Garamond', serif;
          font-style: italic;
          font-size: 14px;
          color: var(--ink-soft);
          margin-left: 2px;
        }
        .ms-rate {
          font-family: 'Cinzel', serif;
          font-size: 12px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--ink-soft);
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
        .pf-policies-link {
          background: none;
          border: none;
          margin-top: 22px;
          color: var(--ink-mute);
          font-family: 'Cinzel', serif;
          font-size: 11px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          text-decoration: underline;
          cursor: pointer;
        }
        .pf-policies-link:hover { color: var(--gold); }
      `}</style>
    </div>
  );
}

// Contenido de las Politicas de Lux Astral -- compartido entre la pantalla
// completa (PoliciesPage, accesible en cualquier momento) y el modal que
// se abre desde el paso de pago del checkout (PlanCheckoutPage), asi el
// texto vive en un solo lugar.
// 2026-09-10 (a pedido de Christian): "cuando haga clic en el pago debe
// hacer clic en aceptar las politicas de Lux Astral (tienes que
// crearlas)". Este es un borrador razonable para lanzar -- cubre
// suscripciones/cobros recurrentes, cancelacion, reembolsos, sesiones en
// vivo y datos personales, pero no reemplaza una revision legal real
// (por ejemplo contra la Ley del Consumidor chilena) antes de tratarlo
// como definitivo.
function PoliciesContent({ lang }) {
  const es = lang === 'es';
  const sections = es ? [
    {
      h: 'Qué es Lux Astral',
      p: 'Lux Astral es una plataforma de tarot: lecturas generadas con inteligencia artificial y sesiones en vivo con tarotistas humanas. El contenido tiene fines de entretenimiento y autoconocimiento — no reemplaza asesoría médica, legal, financiera ni psicológica profesional.',
    },
    {
      h: 'Suscripciones y cobros',
      p: 'Los planes pagos (Luna, Estrella, Oráculo) se cobran de forma recurrente a través de PayPal, en el ciclo que elijas (mensual o anual). El cobro se renueva automáticamente al final de cada ciclo hasta que canceles — nunca cobramos nada que no hayas aceptado ver antes en pantalla.',
    },
    {
      h: 'Cancelación',
      p: 'Podés cancelar cuando quieras desde tu perfil, sin llamadas ni formularios. Tu cuenta vuelve al plan gratuito Vela y tu historial de lecturas se conserva; los beneficios del plan pago siguen activos hasta el final del período que ya pagaste.',
    },
    {
      h: 'Reembolsos',
      p: 'Como regla general, los cobros ya realizados no son reembolsables, salvo que la ley aplicable en tu país indique lo contrario. Si creés que hubo un error de cobro, escribinos a contacto@luxastral.com y lo revisamos.',
    },
    {
      h: 'Sesiones en vivo con tarotistas',
      p: 'La sesión mensual incluida en el plan Oráculo dura 15 minutos. Las sesiones pagas por separado son de 45 minutos, sin límite de preguntas ni tipo de tirada. Se agendan según la disponibilidad real de cada tarotista mostrada en el Marketplace.',
    },
    {
      h: 'Tus datos',
      p: 'Usamos tu email y los datos de tu perfil únicamente para dar el servicio: identificarte, guardar tu historial de lecturas y procesar pagos a través de PayPal. No vendemos tus datos a terceros.',
    },
    {
      h: 'Cambios a estas políticas',
      p: 'Podemos actualizar estas políticas con el tiempo. Si hacemos un cambio importante, te lo vamos a avisar dentro de la plataforma antes de que entre en vigencia.',
    },
    {
      h: 'Contacto',
      p: 'Cualquier duda sobre tu suscripción, un cobro o estas políticas, escribinos a contacto@luxastral.com.',
    },
  ] : [
    {
      h: 'What Lux Astral is',
      p: 'Lux Astral is a tarot platform: AI-generated readings and live sessions with human readers. The content is for entertainment and self-reflection purposes — it does not replace professional medical, legal, financial, or psychological advice.',
    },
    {
      h: 'Subscriptions and billing',
      p: 'Paid plans (Luna, Estrella, Oráculo) are billed on a recurring basis through PayPal, on the cycle you choose (monthly or yearly). The charge renews automatically at the end of each cycle until you cancel — we never charge anything you haven’t already seen and agreed to on screen.',
    },
    {
      h: 'Cancellation',
      p: 'You can cancel any time from your profile, no calls or forms. Your account returns to the free Vela plan and your reading history is kept; paid plan benefits stay active until the end of the period you already paid for.',
    },
    {
      h: 'Refunds',
      p: 'As a general rule, charges already made are non-refundable, unless the law applicable in your country says otherwise. If you think there was a billing error, write to us at contacto@luxastral.com and we’ll look into it.',
    },
    {
      h: 'Live sessions with readers',
      p: "Oráculo's included monthly session lasts 15 minutes. Sessions booked separately are 45 minutes, with no limit on questions or spread type. They're scheduled based on each reader's real availability shown in the Marketplace.",
    },
    {
      h: 'Your data',
      p: "We use your email and profile data only to provide the service: identifying you, saving your reading history, and processing payments through PayPal. We don't sell your data to third parties.",
    },
    {
      h: 'Changes to these policies',
      p: "We may update these policies over time. If we make an important change, we'll let you know inside the platform before it takes effect.",
    },
    {
      h: 'Contact',
      p: 'Any question about your subscription, a charge, or these policies — write to us at contacto@luxastral.com.',
    },
  ];
  return (
    <div className="policies-content">
      <div className="eyebrow" style={{ marginBottom: 8 }}>✦</div>
      <h2 className="policies-h">{es ? 'Políticas de Lux Astral' : 'Lux Astral Policies'}</h2>
      <p className="italic policies-updated">
        {es ? 'Última actualización: septiembre de 2026.' : 'Last updated: September 2026.'}
      </p>
      {sections.map((s, i) => (
        <div key={i} className="policies-section">
          <h3>{s.h}</h3>
          <p>{s.p}</p>
        </div>
      ))}
    </div>
  );
}

function PoliciesPage({ lang, setRoute }) {
  return (
    <div className="page policies-page">
      <PoliciesContent lang={lang} />
      <style>{`
        .policies-page { max-width: 720px; }
        .policies-h {
          font-family: 'Cinzel', serif;
          font-size: clamp(30px, 4vw, 42px);
          font-weight: 400;
          margin-bottom: 8px;
        }
        .policies-updated { color: var(--ink-mute); font-size: 14px; margin-bottom: 32px; }
        .policies-section {
          padding: 20px 0;
          border-top: 1px solid var(--line);
        }
        .policies-section h3 {
          font-family: 'Cinzel', serif;
          font-size: 16px;
          letter-spacing: 0.04em;
          color: var(--gold);
          margin-bottom: 8px;
        }
        .policies-section p {
          font-size: 16px;
          line-height: 1.7;
          color: var(--ink-soft);
        }
      `}</style>
    </div>
  );
}

// Flujo de suscripcion en 3 pasos -- pantalla propia y dedicada, no un
// popup encima de la vitrina de Planes.
// 2026-09-10 (a pedido de Christian): "cuando se hace clic aparece de
// inmediato una ventana con el PayPal, eso es muy brusco... cuando se
// trata de pagar hay que ser muy serios". Antes de llegar al boton de
// PayPal la persona pasa por: 1) confirmacion calida del plan elegido y
// sus beneficios, 2) el detalle comercial completo (precio, ciclo,
// posibilidad de elegir otro plan), y recien 3) el pago, que ademas exige
// aceptar las Politicas de Lux Astral antes de mostrar el boton real.
function PlanCheckoutPage({ lang, setRoute, profile, planKey: routePlanKey, billing: routeBilling }) {
  const t = window.I18N[lang];
  const es = lang === 'es';
  const [step, setStep] = React.useState('intro'); // intro | details | payment
  const [selectedPlanKey, setSelectedPlanKey] = React.useState(routePlanKey || 'luna');
  const [selectedBilling, setSelectedBilling] = React.useState(routeBilling === 'month' ? 'month' : 'year');
  const [plansConfig, setPlansConfig] = React.useState({ plans: null, paypalClientId: '', planPrices: null });
  const [policiesAccepted, setPoliciesAccepted] = React.useState(false);
  const [policiesOpen, setPoliciesOpen] = React.useState(false);
  const [subEmail, setSubEmail] = React.useState(profile.email || '');
  const [subError, setSubError] = React.useState('');
  const [subState, setSubState] = React.useState('idle'); // idle | confirming | error
  const [subSdkLoaded, setSubSdkLoaded] = React.useState(false);
  const subSdkLoadingRef = React.useRef(false);
  const subButtonBoxRef = React.useRef(null);
  const subRenderedForRef = React.useRef(null);
  const subCtxRef = React.useRef({ email: '', planKey: '', billing: '' });

  React.useEffect(() => {
    window.arcanaSubscriptionPlans().then(setPlansConfig).catch(() => {});
  }, []);

  // Si alguien llega sin haber elegido un plan (link roto, refresh raro
  // antes de que el estado se hidrate), volvemos a la vitrina en vez de
  // mostrar una pantalla vacía.
  React.useEffect(() => {
    if (!routePlanKey) setRoute({ page: 'pricing' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => { setSubEmail(profile.email || ''); }, [profile.email]);

  // El SDK de PayPal (intent=subscription) recien se carga al llegar al
  // paso de pago -- no antes, para no gastar esa llamada de red mientras
  // la persona todavia esta leyendo/decidiendo.
  React.useEffect(() => {
    if (step !== 'payment') return undefined;
    if (!plansConfig.paypalClientId) return undefined;
    if (window.paypal && window.__arcanaPaypalSdkKind === 'subscription') { setSubSdkLoaded(true); return undefined; }
    if (subSdkLoadingRef.current) return undefined;
    subSdkLoadingRef.current = true;
    const s = document.createElement('script');
    s.src = 'https://www.paypal.com/sdk/js?client-id=' + encodeURIComponent(plansConfig.paypalClientId) + '&vault=true&intent=subscription';
    s.onload = () => { window.__arcanaPaypalSdkKind = 'subscription'; subSdkLoadingRef.current = false; setSubSdkLoaded(true); };
    s.onerror = () => { subSdkLoadingRef.current = false; setSubError(es ? 'No se pudo cargar PayPal.' : 'Could not load PayPal.'); };
    document.body.appendChild(s);
    return undefined;
  }, [step, plansConfig.paypalClientId]);

  React.useEffect(() => {
    subCtxRef.current = { email: profile.email || '', planKey: selectedPlanKey, billing: selectedBilling };
  }, [profile.email, selectedPlanKey, selectedBilling]);

  // El cuadro del botón de PayPal se desmonta cada vez que se sale del
  // paso de pago o se destilda "acepto las políticas" (son renders
  // condicionales, no display:none) -- si no se limpia esta marca acá, al
  // volver a montarse el guard de abajo cree que ya estaba dibujado
  // (mismo plan/ciclo) y deja el cuadro vacío en vez de volver a llamar a
  // paypal.Buttons().render().
  React.useEffect(() => {
    if (step !== 'payment' || !policiesAccepted) subRenderedForRef.current = null;
  }, [step, policiesAccepted]);

  React.useEffect(() => {
    if (step !== 'payment' || !policiesAccepted || !subSdkLoaded || !window.paypal || !subButtonBoxRef.current) return;
    const renderKey = selectedPlanKey + ':' + selectedBilling;
    if (subRenderedForRef.current === renderKey) return;
    const planField = selectedPlanKey + '_' + (selectedBilling === 'year' ? 'year' : 'month');
    const planId = plansConfig.plans ? plansConfig.plans[planField] : null;
    if (!planId) return;
    subRenderedForRef.current = renderKey;
    subButtonBoxRef.current.innerHTML = '';
    window.paypal.Buttons({
      style: { layout: 'vertical', color: 'gold', label: 'subscribe' },
      createSubscription: (data, actions) => {
        if (!profile.token) {
          setSubError(es ? 'Tenés que iniciar sesión primero.' : 'You need to sign in first.');
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
              // en la misma) — ver WelcomePage en este archivo.
              setRoute({ page: 'welcome', email: ctx.email, planKey: res.planKey || ctx.planKey, source: 'paypal' });
            } else {
              setSubState('error');
            }
          })
          .catch(() => setSubState('error'));
      },
      onError: () => setSubError(es ? 'Ocurrió un error con PayPal.' : 'Something went wrong with PayPal.'),
    }).render(subButtonBoxRef.current);
  }, [step, policiesAccepted, subSdkLoaded, plansConfig.plans, selectedPlanKey, selectedBilling]);

  if (!routePlanKey) return null;

  const plans = buildPlanCards(t);
  const plan = plans.find((p) => p.key === selectedPlanKey) || plans[1];
  const otherPlans = plans.filter((p) => p.key !== 'vela' && p.key !== selectedPlanKey);
  const price = planPriceFor(plansConfig, selectedPlanKey + '_' + selectedBilling);
  const priceUnit = selectedBilling === 'year' ? t.pricing_per_year : t.pricing_per_month;
  const HERO_IMG = { luna: 'assets/tarot-moon.jpg', estrella: 'assets/tarot-sun.jpg', oraculo: 'assets/cofre-bg.jpg' }[selectedPlanKey] || 'assets/tarot-moon.jpg';

  const steps = [
    { key: 'intro', label: es ? 'Tu plan' : 'Your plan' },
    { key: 'details', label: es ? 'Detalles' : 'Details' },
    { key: 'payment', label: es ? 'Pago' : 'Payment' },
  ];
  const stepIdx = steps.findIndex((s) => s.key === step);

  const pickPlan = (key) => {
    setSelectedPlanKey(key);
    setStep('intro');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="checkout-page">
      <div className="checkout-card">
        <button className="checkout-exit" onClick={() => setRoute({ page: 'pricing' })}>
          ← {es ? 'Volver a Planes' : 'Back to Plans'}
        </button>

        <div className="checkout-steps" role="tablist">
          {steps.map((s, i) => (
            <div key={s.key} className={`checkout-step ${i === stepIdx ? 'is-active' : ''} ${i < stepIdx ? 'is-done' : ''}`}>
              <span className="checkout-step-dot">{i < stepIdx ? '✓' : i + 1}</span>
              <span className="checkout-step-label">{s.label}</span>
            </div>
          ))}
        </div>

        {step === 'intro' && (
          <>
            <div className="checkout-hero" style={{ backgroundImage: `url(${HERO_IMG})` }}>
              <div className="checkout-hero-overlay" />
              <div className="checkout-hero-inner">
                <div className="eyebrow">✦ {es ? '¡Excelente elección!' : 'Excellent choice!'} ✦</div>
                <h1 className="checkout-h">{plan.name}</h1>
                <p className="checkout-tag italic">{plan.tag}</p>
              </div>
            </div>
            <div className="checkout-body">
              <p className="checkout-lead">
                {es
                  ? `¡Qué bueno que te has decidido a optar por un plan! El plan ${plan.name} ${plan.desc.charAt(0).toLowerCase()}${plan.desc.slice(1)}`
                  : `Great to see you're ready to take this step! The ${plan.name} plan ${plan.desc.charAt(0).toLowerCase()}${plan.desc.slice(1)}`}
              </p>
              <ul className="checkout-features">
                {plan.features.map((f, i) => (
                  <li key={i} className={i === plan.highlightFeature ? 'is-highlight' : ''}>
                    <span className="cf-check" aria-hidden>✦</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <p className="checkout-trust italic">
                {es
                  ? 'Es una decisión que te va a traer claridad y compañía en el camino — y podés cambiar de opinión cuando quieras.'
                  : "It's a decision that brings clarity and companionship along the way — and you can change your mind any time."}
              </p>
              <button className="btn btn-primary btn-lg checkout-cta" onClick={() => setStep('details')}>
                {es ? 'Continuar' : 'Continue'} →
              </button>
            </div>
          </>
        )}

        {step === 'details' && (
          <div className="checkout-body">
            <h2 className="checkout-h2">{es ? 'Los detalles, sin letra chica' : 'The details, no fine print'}</h2>
            <p className="checkout-sub italic">
              {es
                ? 'Tenés derecho a saber exactamente qué vas a pagar y qué vas a recibir.'
                : "You have the right to know exactly what you'll pay and what you'll get."}
            </p>

            <div className="checkout-billing" role="tablist">
              <button className={`checkout-bt-opt ${selectedBilling === 'month' ? 'is-active' : ''}`} onClick={() => setSelectedBilling('month')}>
                {t.pricing_billing_month}
              </button>
              <button className={`checkout-bt-opt ${selectedBilling === 'year' ? 'is-active' : ''}`} onClick={() => setSelectedBilling('year')}>
                {t.pricing_billing_year}
                <span className="checkout-bt-save">{t.pricing_year_save}</span>
              </button>
            </div>

            <div className="checkout-price-block">
              <div className="checkout-price">
                <span className="cp-currency">{t.pricing_currency}</span>
                <span className="cp-big">{price}</span>
                <span className="cp-unit">{priceUnit}</span>
              </div>
              <p className="checkout-price-note">
                {es
                  ? `Se te va a cobrar ${t.pricing_currency}${price} ${selectedBilling === 'year' ? 'una vez al año' : 'cada mes'}, de forma automática, hasta que canceles. Podés cancelar cuando quieras desde tu perfil, sin llamadas ni formularios.`
                  : `You'll be charged ${t.pricing_currency}${price} ${selectedBilling === 'year' ? 'once a year' : 'every month'}, automatically, until you cancel. You can cancel any time from your profile, no calls or forms.`}
              </p>
            </div>

            {otherPlans.length > 0 && (
              <div className="checkout-switch">
                <div className="eyebrow" style={{ marginBottom: 10 }}>{es ? '¿Preferís revisar otro plan?' : 'Want to check a different plan?'}</div>
                <div className="checkout-switch-row">
                  {otherPlans.map((p) => (
                    <button key={p.key} className="checkout-switch-btn" onClick={() => pickPlan(p.key)}>
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="checkout-nav-row">
              <button className="btn btn-ghost" onClick={() => setStep('intro')}>← {es ? 'Volver' : 'Back'}</button>
              <button className="btn btn-primary btn-lg" onClick={() => setStep('payment')}>
                {es ? 'Acepto y continúo' : 'I agree and continue'} →
              </button>
            </div>
          </div>
        )}

        {step === 'payment' && (
          <div className="checkout-body">
            <h2 className="checkout-h2">{es ? 'Pago seguro con PayPal' : 'Secure payment with PayPal'}</h2>
            <p className="checkout-sub italic">
              {es
                ? 'Vas a pagar a través de PayPal: es simple y rápido. No necesitás tener cuenta — también podés pagar con tarjeta.'
                : "You'll pay through PayPal: simple and fast. You don't need an account — you can also pay by card."}
            </p>

            <div className="checkout-summary">
              <div><span>{es ? 'Plan' : 'Plan'}</span><strong>{plan.name}</strong></div>
              <div><span>{es ? 'Ciclo' : 'Billing'}</span><strong>{selectedBilling === 'year' ? t.pricing_billing_year : t.pricing_billing_month}</strong></div>
              <div><span>{es ? 'Total' : 'Total'}</span><strong>{t.pricing_currency}{price} {priceUnit}</strong></div>
              <div><span>{t.market_book_email}</span><strong>{subEmail || '—'}</strong></div>
            </div>

            <label className="checkout-policies">
              <input type="checkbox" checked={policiesAccepted} onChange={(e) => setPoliciesAccepted(e.target.checked)} />
              <span>
                {es ? 'He leído y acepto ' : 'I have read and accept the '}
                <button type="button" className="checkout-policies-link" onClick={() => setPoliciesOpen(true)}>
                  {es ? 'las Políticas de Lux Astral' : 'Lux Astral Policies'}
                </button>
                {es ? '.' : '.'}
              </span>
            </label>

            {!profile.token && (
              <div className="live-pay-note italic">
                {es ? 'Tenés que iniciar sesión con tu cuenta antes de pagar.' : 'You need to sign in to your account before paying.'}
              </div>
            )}
            {!plansConfig.plans && (
              <div className="live-pay-note italic">
                {es ? 'Los planes todavía no están configurados en PayPal.' : 'Plans are not configured in PayPal yet.'}
              </div>
            )}
            {subError && <div className="live-pay-note italic" style={{ color: '#e08080' }}>{subError}</div>}
            {subState === 'error' && (
              <div className="live-pay-note italic" style={{ color: '#e08080' }}>
                {es ? 'No se pudo confirmar la suscripción.' : 'Could not confirm the subscription.'}
              </div>
            )}
            {subState === 'confirming' && (
              <div className="live-pay-note italic">{es ? 'Confirmando tu suscripción…' : 'Confirming your subscription…'}</div>
            )}

            {policiesAccepted ? (
              <>
                {plansConfig.paypalClientId && plansConfig.plans && !subSdkLoaded && (
                  <div className="live-pay-note italic">{t.market_book_processing}</div>
                )}
                <div ref={subButtonBoxRef} className="live-paypal-box" />
              </>
            ) : (
              <div className="checkout-paypal-locked italic">
                {es ? 'Aceptá las políticas para habilitar el pago.' : 'Accept the policies to enable payment.'}
              </div>
            )}

            <div className="checkout-nav-row">
              <button className="btn btn-ghost" onClick={() => setStep('details')}>← {es ? 'Volver' : 'Back'}</button>
            </div>
          </div>
        )}
      </div>

      {policiesOpen && (
        <div className="modal-overlay" onClick={() => setPoliciesOpen(false)}>
          <div className="modal" style={{ maxWidth: 640, maxHeight: '80vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setPoliciesOpen(false)}>✕</button>
            <PoliciesContent lang={lang} />
          </div>
        </div>
      )}

      <style>{CHECKOUT_STYLES}</style>
    </div>
  );
}

// CSS propio de SessionCheckoutPage -- el orbe de la tarotista, los
// horarios disponibles, y las pantallas de "procesando"/"pagado" que
// antes vivían en el modal de reserva de MarketplacePage. El resto del
// look (cabecera de pasos, hero, features, resumen, políticas) viene de
// CHECKOUT_STYLES, compartido con el checkout de planes.
const SESSION_EXTRA_STYLES = `
  .session-orb {
    width: 96px; height: 96px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Cinzel', serif;
    font-size: 30px;
    letter-spacing: 0.1em;
    color: var(--bg);
    margin: 0 auto 16px;
    border: 1px solid rgba(255,255,255,0.15);
    box-shadow: 0 0 40px rgba(212, 168, 90, 0.22);
  }
  .live-slots { display: flex; flex-wrap: wrap; gap: 8px; }
  .live-slot-btn {
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
  .live-slot-btn.is-active {
    border-color: var(--gold);
    color: var(--gold);
    background: rgba(212, 168, 90, 0.08);
  }

  .session-paying {
    text-align: center;
    padding: 60px 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
  }
  .session-paying-spinner { position: relative; width: 40px; height: 40px; }
  .session-paying-spinner span {
    position: absolute;
    left: 50%; top: 0;
    width: 3px;
    height: 8px;
    background: var(--gold);
    border-radius: 2px;
    transform-origin: center 20px;
    opacity: 0.3;
    animation: sessionSpin 1s linear infinite;
  }
  .session-paying-spinner span:nth-child(1) { transform: rotate(0deg); animation-delay: -0.875s; }
  .session-paying-spinner span:nth-child(2) { transform: rotate(45deg); animation-delay: -0.75s; }
  .session-paying-spinner span:nth-child(3) { transform: rotate(90deg); animation-delay: -0.625s; }
  .session-paying-spinner span:nth-child(4) { transform: rotate(135deg); animation-delay: -0.5s; }
  .session-paying-spinner span:nth-child(5) { transform: rotate(180deg); animation-delay: -0.375s; }
  .session-paying-spinner span:nth-child(6) { transform: rotate(225deg); animation-delay: -0.25s; }
  .session-paying-spinner span:nth-child(7) { transform: rotate(270deg); animation-delay: -0.125s; }
  .session-paying-spinner span:nth-child(8) { transform: rotate(315deg); animation-delay: 0s; }
  @keyframes sessionSpin { 0% { opacity: 1; } 100% { opacity: 0.15; } }

  .session-paid-icon {
    font-family: 'Cinzel', serif;
    font-size: 30px;
    color: var(--gold);
    text-align: center;
    margin-bottom: 8px;
  }
  .session-paid-when {
    text-align: center;
    padding: 18px 0;
    border-top: 1px dashed var(--line);
    border-bottom: 1px dashed var(--line);
    margin: 20px 0 26px;
  }
  .session-paid-when-v {
    font-family: 'Cinzel', serif;
    font-size: 18px;
    letter-spacing: 0.1em;
    color: var(--ink);
    margin-top: 6px;
  }
  .session-code-block {
    padding: 18px 20px;
    border: 1px solid var(--gold);
    border-radius: 12px;
    margin-bottom: 14px;
    background: rgba(212, 168, 90, 0.06);
    text-align: center;
  }
  .session-code {
    font-family: 'Cinzel', serif;
    font-size: 26px;
    letter-spacing: 0.12em;
    color: var(--gold);
    user-select: all;
  }
  .session-code-note {
    margin-top: 8px;
    font-size: 13px;
    color: var(--ink-mute);
    text-wrap: pretty;
  }
`;

// Reserva de una sesión en vivo con una tarotista, en 2 pantallas propias
// antes del pago -- mismo contexto visual que el checkout de planes.
// 2026-09-10 (a pedido de Christian): "ahora hay que hacer lo mismo para
// el pago de las sesiones. Dos pantallas, en el mismo contexto de los
// planes, antes del pago." Pantalla 1: quién es la tarotista, qué incluye
// la sesión (mismos beneficios que ya se muestran en Planes) y el
// horario. Pantalla 2: el resumen comercial completo y recién ahí el
// pago -- con el mismo candado de "Políticas de Lux Astral" que el
// checkout de planes.
function SessionCheckoutPage({ lang, setRoute, profile, tarotistId }) {
  const t = window.I18N[lang];
  const es = lang === 'es';

  const [phase, setPhase] = React.useState('booking'); // booking | confirming | cancelled | error | paid
  const [step, setStep] = React.useState('intro'); // intro | payment (solo durante "booking")
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState(false);
  const [tarotist, setTarotist] = React.useState(null);
  const [settings, setSettings] = React.useState({ sessionBasePrice: 29, planDiscounts: { luna: 10, estrella: 15, oraculo: 20 } });
  const [slotId, setSlotId] = React.useState(null);
  const [form, setForm] = React.useState({ name: profile.name || '' });
  const [bookError, setBookError] = React.useState('');
  const [policiesAccepted, setPoliciesAccepted] = React.useState(false);
  const [policiesOpen, setPoliciesOpen] = React.useState(false);
  const [subCheck, setSubCheck] = React.useState({ checking: false, isSubscriber: false, planKey: null, oraculoFreeSlotAvailable: false });
  const [confirmed, setConfirmed] = React.useState(null);
  const [freeBookingBusy, setFreeBookingBusy] = React.useState(false);

  const paypalClientIdRef = React.useRef('');
  const [paypalSdkLoaded, setPaypalSdkLoaded] = React.useState(false);
  const paypalSdkLoadingRef = React.useRef(false);
  const paypalButtonBoxRef = React.useRef(null);
  const paypalRenderedForRef = React.useRef(null);
  const bookingCtxRef = React.useRef({ tarotistId: null, slotId: null, customerName: '', customerEmail: '', isSubscriber: false, lang });

  React.useEffect(() => {
    if (!tarotistId) { setRoute({ page: 'marketplace' }); return; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!tarotistId) return;
    setLoading(true);
    setLoadError(false);
    window.arcanaFetchTarotistas()
      .then((data) => {
        const tr = (data.tarotists || []).find((x) => x.id === tarotistId);
        if (!tr) { setLoadError(true); return; }
        setTarotist(tr);
        if (data.settings) setSettings(data.settings);
        if (data.paypalClientId) paypalClientIdRef.current = data.paypalClientId;
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [tarotistId]);

  React.useEffect(() => {
    if (!profile.token) {
      setSubCheck({ checking: false, isSubscriber: false, planKey: null, oraculoFreeSlotAvailable: false });
      return undefined;
    }
    let cancelled = false;
    setSubCheck((s) => ({ ...s, checking: true }));
    window.arcanaSubscriberStatus()
      .then((res) => {
        if (cancelled) return;
        setSubCheck({
          checking: false, isSubscriber: !!res.isSubscriber, planKey: res.planKey || null,
          oraculoFreeSlotAvailable: !!res.oraculoFreeSlotAvailable,
        });
      })
      .catch(() => { if (!cancelled) setSubCheck({ checking: false, isSubscriber: false, planKey: null, oraculoFreeSlotAvailable: false }); });
    return () => { cancelled = true; };
  }, [profile.token]);

  React.useEffect(() => {
    bookingCtxRef.current = {
      tarotistId: tarotist ? tarotist.id : null,
      slotId,
      customerName: form.name,
      customerEmail: profile.email || '',
      isSubscriber: subCheck.isSubscriber,
      lang,
    };
  }, [tarotist, slotId, form, lang, subCheck]);

  // El SDK de PayPal (intent=capture, distinto del intent=subscription que
  // usa el checkout de planes) recién se carga al llegar al paso de pago.
  React.useEffect(() => {
    if (step !== 'payment' || phase !== 'booking') return undefined;
    if (!paypalClientIdRef.current) return undefined;
    if (window.paypal && window.__arcanaPaypalSdkKind === 'capture') { setPaypalSdkLoaded(true); return undefined; }
    if (paypalSdkLoadingRef.current) return undefined;
    paypalSdkLoadingRef.current = true;
    const s = document.createElement('script');
    s.src = 'https://www.paypal.com/sdk/js?client-id=' + encodeURIComponent(paypalClientIdRef.current) + '&currency=USD&intent=capture';
    s.onload = () => { window.__arcanaPaypalSdkKind = 'capture'; paypalSdkLoadingRef.current = false; setPaypalSdkLoaded(true); };
    s.onerror = () => { paypalSdkLoadingRef.current = false; setBookError(es ? 'No se pudo cargar PayPal.' : 'Could not load PayPal.'); };
    document.body.appendChild(s);
    return undefined;
  }, [step, phase]);

  // Mismo cuidado que en PlanCheckoutPage: el cuadro del botón se
  // desmonta al salir del paso de pago o al destildar las políticas
  // (renders condicionales, no display:none) -- hay que limpiar la marca
  // para que vuelva a dibujarse al remontarse.
  React.useEffect(() => {
    if (step !== 'payment' || !policiesAccepted) paypalRenderedForRef.current = null;
  }, [step, policiesAccepted]);

  React.useEffect(() => {
    if (step !== 'payment' || !policiesAccepted || !paypalSdkLoaded || !window.paypal || !paypalButtonBoxRef.current) return;
    if (subCheck.oraculoFreeSlotAvailable) return; // esta sesión sale gratis, no hace falta botón de PayPal
    const renderKey = (tarotist ? tarotist.id : '') + ':' + slotId;
    if (paypalRenderedForRef.current === renderKey) return;
    paypalRenderedForRef.current = renderKey;
    paypalButtonBoxRef.current.innerHTML = '';
    window.paypal.Buttons({
      style: { layout: 'vertical', color: 'gold', label: 'pay' },
      createOrder: () => {
        const ctx = bookingCtxRef.current;
        if (!ctx.slotId || !profile.token) {
          setBookError(es ? 'Elegí un horario primero.' : 'Choose a time first.');
          return Promise.reject(new Error('missing-fields'));
        }
        setBookError('');
        return window.arcanaCreateCheckout({
          tarotistId: ctx.tarotistId, slotId: ctx.slotId, customerName: ctx.customerName,
          customerEmail: ctx.customerEmail, isSubscriber: ctx.isSubscriber, lang: ctx.lang,
        }).then((res) => res.orderId);
      },
      onApprove: (data) => {
        setPhase('confirming');
        return window.arcanaConfirmBooking(data.orderID)
          .then((res) => {
            if (res.status === 'paid') { setConfirmed(res); setPhase('paid'); }
            else { setPhase('error'); }
          })
          .catch(() => setPhase('error'));
      },
      onCancel: () => { setPhase('cancelled'); },
      onError: () => { setBookError(es ? 'Ocurrió un error con PayPal.' : 'Something went wrong with PayPal.'); },
    }).render(paypalButtonBoxRef.current);
  }, [step, policiesAccepted, paypalSdkLoaded, subCheck.oraculoFreeSlotAvailable, tarotist, slotId]);

  const bookFreeOraculoSlot = () => {
    const ctx = bookingCtxRef.current;
    if (!ctx.slotId || !profile.token) {
      setBookError(es ? 'Elegí un horario primero.' : 'Choose a time first.');
      return;
    }
    setBookError('');
    setFreeBookingBusy(true);
    window.arcanaCheckoutFree({
      tarotistId: ctx.tarotistId, slotId: ctx.slotId, customerName: ctx.customerName, customerEmail: ctx.customerEmail, lang: ctx.lang,
    })
      .then((res) => { setConfirmed(res); setPhase('paid'); })
      .catch((e) => setBookError(e.message || (es ? 'No se pudo reservar la sesión gratis.' : 'Could not book the free session.')))
      .finally(() => setFreeBookingBusy(false));
  };

  const formatSlot = (iso) => {
    try {
      return new Date(iso).toLocaleString(es ? 'es-CL' : 'en-US', {
        weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      });
    } catch { return iso; }
  };

  if (!tarotistId) return null;

  if (loading) {
    return <div className="checkout-page"><div className="checkout-card"><div className="market-status italic">{t.market_loading}</div></div></div>;
  }
  if (loadError || !tarotist) {
    return (
      <div className="checkout-page">
        <div className="checkout-card">
          <div className="market-status market-status-error italic">{t.market_load_error}</div>
          <button className="btn btn-ghost" style={{ marginTop: 16 }} onClick={() => setRoute({ page: 'marketplace' })}>
            ← {es ? 'Volver al Marketplace' : 'Back to Marketplace'}
          </button>
        </div>
        <style>{CHECKOUT_STYLES}</style>
      </div>
    );
  }

  const basePrice = Number(tarotist.rate) || settings.sessionBasePrice;
  const discountPct = (subCheck.isSubscriber && subCheck.planKey && settings.planDiscounts) ? (settings.planDiscounts[subCheck.planKey] || 0) : 0;
  const displayPrice = subCheck.oraculoFreeSlotAvailable
    ? 0
    : discountPct
      ? Math.round(basePrice * (1 - discountPct / 100) * 100) / 100
      : basePrice;
  const chosenSlot = tarotist.availability && tarotist.availability.find((s) => s.id === slotId);

  const sessionFeatures = [t.pricing_sessions_f1, t.pricing_sessions_f2, t.pricing_sessions_f3, t.pricing_sessions_f4, t.pricing_sessions_f5];

  const steps = [
    { key: 'intro', label: es ? 'Tu sesión' : 'Your session' },
    { key: 'payment', label: es ? 'Pago' : 'Payment' },
  ];
  const stepIdx = steps.findIndex((s) => s.key === step);

  return (
    <div className="checkout-page">
      <div className="checkout-card">
        {phase === 'booking' && (
          <>
            <button className="checkout-exit" onClick={() => setRoute({ page: 'marketplace' })}>
              ← {es ? 'Volver al Marketplace' : 'Back to Marketplace'}
            </button>

            <div className="checkout-steps" role="tablist">
              {steps.map((s, i) => (
                <div key={s.key} className={`checkout-step ${i === stepIdx ? 'is-active' : ''} ${i < stepIdx ? 'is-done' : ''}`}>
                  <span className="checkout-step-dot">{i < stepIdx ? '✓' : i + 1}</span>
                  <span className="checkout-step-label">{s.label}</span>
                </div>
              ))}
            </div>

            {step === 'intro' && (
              <>
                <div className="checkout-hero" style={{ backgroundImage: 'url(assets/live-sessions-table.jpg)' }}>
                  <div className="checkout-hero-overlay" />
                  <div className="checkout-hero-inner">
                    <div
                      className="session-orb"
                      style={{ background: `radial-gradient(circle at 30% 30%, ${tarotist.color}, ${tarotist.color}55 60%, ${tarotist.color}11)` }}
                    >
                      <span>{tarotist.initials}</span>
                    </div>
                    <div className="eyebrow">✦ {es ? '¡Excelente elección!' : 'Excellent choice!'} ✦</div>
                    <h1 className="checkout-h">{tarotist.name}</h1>
                    <p className="checkout-tag italic">
                      {es ? tarotist.specialty_es : tarotist.specialty_en}
                    </p>
                  </div>
                </div>
              <div className="checkout-body">
                <p className="checkout-lead">
                  {es
                    ? `Vas a agendar una sesión completa en vivo con ${tarotist.name}. Esto es lo que incluye:`
                    : `You're about to book a full live session with ${tarotist.name}. Here's what it includes:`}
                </p>
                <ul className="checkout-features">
                  {sessionFeatures.map((f, i) => (
                    <li key={i}>
                      <span className="cf-check" aria-hidden>✦</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <div className="eyebrow" style={{ marginTop: 8, marginBottom: 10 }}>{t.market_book_choose_slot}</div>
                {(!tarotist.availability || tarotist.availability.length === 0) ? (
                  <div className="live-pay-note italic">{t.market_book_no_slots}</div>
                ) : (
                  <div className="live-slots">
                    {tarotist.availability.map((s) => (
                      <button
                        key={s.id}
                        className={`live-slot-btn ${slotId === s.id ? 'is-active' : ''}`}
                        onClick={() => setSlotId(s.id)}
                      >{formatSlot(s.startsAt)}</button>
                    ))}
                  </div>
                )}

                <button className="btn btn-primary btn-lg checkout-cta" style={{ marginTop: 24 }} disabled={!slotId} onClick={() => setStep('payment')}>
                  {es ? 'Continuar' : 'Continue'} →
                </button>
              </div>
              </>
            )}

            {step === 'payment' && (
              <div className="checkout-body">
                <h2 className="checkout-h2">{es ? 'Confirmá tu sesión' : 'Confirm your session'}</h2>
                <p className="checkout-sub italic">
                  {es
                    ? 'Revisá los detalles antes de pagar.'
                    : 'Review the details before you pay.'}
                </p>

                <div className="form-field">
                  <label>{t.market_book_name}</label>
                  <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                </div>

                <div className="checkout-summary">
                  <div><span>{es ? 'Tarotista' : 'Reader'}</span><strong>{tarotist.name}</strong></div>
                  <div><span>{es ? 'Horario' : 'Time'}</span><strong>{chosenSlot ? formatSlot(chosenSlot.startsAt) : '—'}</strong></div>
                  <div><span>{es ? 'Duración' : 'Duration'}</span><strong>45 min</strong></div>
                  <div><span>{t.market_book_email}</span><strong>{profile.email || '—'}</strong></div>
                  <div><span>{es ? 'Total' : 'Total'}</span><strong>{t.pricing_currency}{displayPrice} USD</strong></div>
                </div>

                {!!profile.token && (
                  <p className="live-pay-note italic">
                    {subCheck.checking
                      ? (es ? 'Verificando suscripción…' : 'Checking subscription…')
                      : subCheck.oraculoFreeSlotAvailable
                        ? (es ? '✦ Suscripción Oráculo — tu sesión gratis de este mes está disponible.' : '✦ Oráculo subscription — your free session this month is available.')
                        : subCheck.isSubscriber
                          ? (es ? `✦ Suscripción activa (${subCheck.planKey}) — ${discountPct}% de descuento ya aplicado.` : `✦ Active subscription (${subCheck.planKey}) — ${discountPct}% discount already applied.`)
                          : (es ? 'Sin suscripción activa con este email.' : 'No active subscription with this email.')}
                  </p>
                )}

                <label className="checkout-policies" style={{ marginTop: 18 }}>
                  <input type="checkbox" checked={policiesAccepted} onChange={(e) => setPoliciesAccepted(e.target.checked)} />
                  <span>
                    {es ? 'He leído y acepto ' : 'I have read and accept the '}
                    <button type="button" className="checkout-policies-link" onClick={() => setPoliciesOpen(true)}>
                      {es ? 'las Políticas de Lux Astral' : 'Lux Astral Policies'}
                    </button>.
                  </span>
                </label>

                {!profile.token && (
                  <div className="live-pay-note italic">
                    {es ? 'Tenés que iniciar sesión con tu cuenta antes de pagar.' : 'You need to sign in to your account before paying.'}
                  </div>
                )}
                {bookError && <div className="live-pay-note italic" style={{ color: '#e08080' }}>{bookError}</div>}

                {policiesAccepted ? (
                  subCheck.oraculoFreeSlotAvailable ? (
                    <button
                      className="btn btn-primary btn-lg"
                      style={{ width: '100%', marginTop: 8 }}
                      disabled={freeBookingBusy || !slotId}
                      onClick={bookFreeOraculoSlot}
                    >
                      {freeBookingBusy
                        ? (es ? 'Reservando…' : 'Booking…')
                        : (es ? 'Reservar gratis (incluida en tu plan)' : 'Book for free (included in your plan)')}
                    </button>
                  ) : (
                    <>
                      {!paypalSdkLoaded && <div className="live-pay-note italic">{t.market_book_processing}</div>}
                      <div ref={paypalButtonBoxRef} className="live-paypal-box" />
                    </>
                  )
                ) : (
                  <div className="checkout-paypal-locked italic">
                    {es ? 'Aceptá las políticas para habilitar el pago.' : 'Accept the policies to enable payment.'}
                  </div>
                )}

                <div className="checkout-nav-row">
                  <button className="btn btn-ghost" onClick={() => setStep('intro')}>← {es ? 'Volver' : 'Back'}</button>
                </div>
              </div>
            )}
          </>
        )}

        {phase === 'confirming' && (
          <div className="session-paying">
            <div className="session-paying-spinner">
              <span /><span /><span /><span /><span /><span /><span /><span />
            </div>
            <div className="eyebrow" style={{ color: 'var(--gold)' }}>{t.market_confirming}</div>
          </div>
        )}

        {phase === 'cancelled' && (
          <div className="checkout-body" style={{ textAlign: 'center' }}>
            <p className="italic">{t.market_cancel_notice}</p>
            <button className="btn btn-ghost" style={{ marginTop: 16 }} onClick={() => setPhase('booking')}>
              ← {es ? 'Volver' : 'Back'}
            </button>
          </div>
        )}

        {phase === 'error' && (
          <div className="checkout-body" style={{ textAlign: 'center' }}>
            <p className="italic">{t.market_load_error}</p>
            <button className="btn btn-ghost" style={{ marginTop: 16 }} onClick={() => setPhase('booking')}>
              ← {es ? 'Volver' : 'Back'}
            </button>
          </div>
        )}

        {phase === 'paid' && confirmed && (
          <div className="checkout-body">
            <div className="session-paid-icon">✦</div>
            <div className="eyebrow" style={{ color: 'var(--gold)', marginBottom: 8, textAlign: 'center' }}>— {t.market_paid_h} —</div>
            <h2 className="checkout-h2" style={{ textAlign: 'center' }}>{t.market_paid_sub}</h2>

            <div className="session-paid-when">
              <div className="eyebrow">{t.market_paid_when}</div>
              <div className="session-paid-when-v">{confirmed.when ? formatSlot(confirmed.when) : ''}</div>
            </div>

            <div className="session-code-block">
              <div className="eyebrow" style={{ color: 'var(--gold)', marginBottom: 8 }}>{t.market_paid_your_code}</div>
              <div className="session-code">{confirmed.accessCode}</div>
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
                      onClick={() => setRoute({ page: 'videocall', accessCode: confirmed.accessCode })}
                    >
                      {t.market_paid_enter} →
                    </button>
                  );
                }
                if (confirmed.videoRoomUrl && !canJoinNow) {
                  return <div className="session-code-note italic">{t.market_paid_too_early}</div>;
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
                return <div className="session-code-note italic">{t.market_paid_join_fallback}</div>;
              })()}
              <button className="btn btn-ghost" style={{ width: '100%' }} onClick={() => setRoute({ page: 'mybookings' })}>
                {t.market_paid_view_bookings}
              </button>
              <button className="btn btn-ghost" style={{ width: '100%' }} onClick={() => setRoute({ page: 'home' })}>
                {t.market_paid_later}
              </button>
            </div>
          </div>
        )}
      </div>

      {policiesOpen && (
        <div className="modal-overlay" onClick={() => setPoliciesOpen(false)}>
          <div className="modal" style={{ maxWidth: 640, maxHeight: '80vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setPoliciesOpen(false)}>✕</button>
            <PoliciesContent lang={lang} />
          </div>
        </div>
      )}

      <style>{CHECKOUT_STYLES + SESSION_EXTRA_STYLES}</style>
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
