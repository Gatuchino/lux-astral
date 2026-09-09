// Reading — the core flow (v2)
// question → shuffle → pick → reveal + interpret
//
// Improvements over v1:
//  - Fixed dangling `const [revealedIdx, setRevealedIdx] = [null, null]` bug
//  - Sequential reveal by tapping each card (with "Reveal all" fallback)
//  - "Undo last" + "Shuffle again" during pick
//  - Save button gives feedback and disables itself
//  - "Copy reading" button — copies a formatted text summary
//  - "Another interpretation" — re-asks the LLM with a fresh angle
//  - Celtic Cross uses the classical geometric layout, not a flat grid
function ReadingPage({ lang, setRoute, spread, saveReading, planInfo, profile, updateReading, resumeReading }) {
  const { TarotCard } = window;
  const t = window.I18N[lang];
  const SPREAD_SIZE = { daily: 1, three: 3, love: 5, celtic: 10, work: 4, free: 3, decision: 5, six: 6, year: 12 }[spread] || 3;
  const positions_es = {
    daily:    ['Mensaje del día'],
    three:    ['Pasado', 'Presente', 'Futuro'],
    love:     ['Tú', 'El otro', 'Vínculo', 'Reto', 'Camino'],
    celtic:   ['Presente','Cruz','Base','Pasado','Corona','Futuro','Tú misma','Entorno','Esperanzas','Resultado'],
    work:     ['Situación Actual','Obstáculo','Acción a Tomar','Resultado Probable'],
    free:     ['Tu Pregunta','Consejo','Resultado'],
    decision: ['Situación','Opción A','Opción B','Lo que no ves','Consejo'],
    six:      ['Situación','Causa Raíz','Lo que Debes Soltar','Lo que Debes Abrazar','Acción','Resultado'],
    year:     ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],
  }[spread] || ['Pasado','Presente','Futuro'];
  const positions_en = {
    daily:    ["Today's message"],
    three:    ['Past', 'Present', 'Future'],
    love:     ['You', 'The other', 'Bond', 'Challenge', 'Path'],
    celtic:   ['Present','Cross','Base','Past','Crown','Future','Self','Environment','Hopes','Outcome'],
    work:     ['Current Situation','Obstacle','Action to Take','Likely Outcome'],
    free:     ['Your Question','Advice','Outcome'],
    decision: ['Situation','Option A','Option B',"What you don't see",'Advice'],
    six:      ['Situation','Root Cause','What to Release','What to Embrace','Action','Outcome'],
    year:     ['January','February','March','April','May','June','July','August','September','October','November','December'],
  }[spread] || ['Past','Present','Future'];
  const positions = lang === 'es' ? positions_es : positions_en;

  const isPaid = !!(planInfo && planInfo.isSubscriber);
  // "Volver a ver" / "Volver a preguntar" desde el historial de Perfil: si
  // viene una lectura guardada (resumeReading) arrancamos directo en el
  // paso "reveal" con sus cartas/interpretación/preguntas ya cargadas, sin
  // pasar de nuevo por pregunta → barajar → elegir.
  const [step, setStep] = React.useState(() => (resumeReading ? 'reveal' : 'question')); // question | shuffle | pick | reveal
  const [question, setQuestion] = React.useState(() => (resumeReading ? (resumeReading.question || '') : ''));
  const [deck, setDeck] = React.useState([]);
  const [picked, setPicked] = React.useState(() => {
    if (!resumeReading) return [];
    return resumeReading.picked
      .map((p) => ({ card: (window.TAROT_CARDS.all || []).find((c) => c.id === p.id), reversed: p.reversed }))
      .filter((p) => p.card);
  }); // {card, reversed}
  const [flipped, setFlipped] = React.useState(() => (resumeReading ? Array(resumeReading.picked.length).fill(true) : [])); // array of booleans per picked
  const [interpretation, setInterpretation] = React.useState(() => (
    resumeReading && resumeReading.interpretation
      ? { base: resumeReading.interpretation, llm: resumeReading.interpretation }
      : null
  ));
  const [thinking, setThinking] = React.useState(false);
  const [saveState, setSaveState] = React.useState(() => (resumeReading ? 'saved' : 'idle'));   // idle | saved
  const [saveUpsell, setSaveUpsell] = React.useState(false); // aviso "esto es para planes pagos" al clickear sin ser socia
  const [shareState, setShareState] = React.useState('idle'); // idle | copied
  const [regenCount, setRegenCount] = React.useState(0);

  // ---------- Tipo de respuesta: lo decide el backend según el plan ----------
  // (antes era una preferencia local sin límites; ahora depende del email:
  // suscriptora -> tipo fijo de su plan, sin suscripción -> plan Vela
  // gratis con tipo 2 y máximo 1 consulta al día, ver arcanaReadingAccess).
  const [email, setEmail] = React.useState(() => {
    try { return localStorage.getItem('arcana_reading_email') || ''; } catch { return ''; }
  });
  const [responseType, setResponseType] = React.useState('2');
  // Ticket corto que emite reading-access y que tarot-interpret exige antes
  // de gastar un llamado a la IA (2026-09-08, auditoria) -- sin esto no se
  // puede generar ni la lectura inicial ni una pregunta de seguimiento.
  const [ticketId, setTicketId] = React.useState(null);
  const [accessChecking, setAccessChecking] = React.useState(false);
  const [accessError, setAccessError] = React.useState('');
  const RT = RESPONSE_TYPES[responseType] || RESPONSE_TYPES['1'];

  // ---------- Elegir tipo de respuesta (solo Luna y Estrella) ----------
  // Oráculo no elige: tiene el Tipo 5 fijo (única opción de su plan). El
  // backend vuelve a validar esto siempre — ver PLAN_RESPONSE_TYPE_OPTIONS
  // en local-server.js, nunca confiamos en lo que mande el navegador.
  const rtOptions = (planInfo && planInfo.planKey && PLAN_RT_OPTIONS[planInfo.planKey]) || null;
  const showRTPicker = !!(rtOptions && rtOptions.length > 1);
  const [responseTypePref, setResponseTypePref] = React.useState(() => {
    try { return localStorage.getItem('arcana_response_type_pref') || ''; } catch { return ''; }
  });
  const selectedRT = rtOptions
    ? (rtOptions.includes(responseTypePref) ? responseTypePref : rtOptions[rtOptions.length - 1])
    : responseTypePref;
  const chooseResponseType = (v) => {
    setResponseTypePref(v);
    try { localStorage.setItem('arcana_response_type_pref', v); } catch { /* no crítico */ }
  };
  const [extraCards, setExtraCards] = React.useState([]); // {card, reversed, label}
  const [followUps, setFollowUps] = React.useState(() => (resumeReading ? (resumeReading.followUps || []).map((f) => ({ ...f })) : [])); // {question, answer}
  const [followUpDraft, setFollowUpDraft] = React.useState('');
  const [followUpBusy, setFollowUpBusy] = React.useState(false);
  const [followUpError, setFollowUpError] = React.useState('');

  // ---------- Voz: escuchar la interpretación en voz alta (ElevenLabs) ----------
  const [speakingKey, setSpeakingKey] = React.useState(null); // qué texto se está reproduciendo ('main' | índice de followup | null)
  const [speakLoadingKey, setSpeakLoadingKey] = React.useState(null);
  const [speakError, setSpeakError] = React.useState('');
  const speakAudioRef = React.useRef(null);
  const voiceOn = !!(window.arcanaVoiceEnabled && window.arcanaVoiceEnabled());
  const stopSpeaking = () => {
    if (speakAudioRef.current) {
      speakAudioRef.current.pause();
      speakAudioRef.current.currentTime = 0;
    }
    setSpeakingKey(null);
  };
  const speakText = async (key, text) => {
    if (speakingKey === key) { stopSpeaking(); return; }
    stopSpeaking();
    setSpeakError('');
    setSpeakLoadingKey(key);
    try {
      const url = await window.arcanaFetchSpeech(text);
      const audio = new Audio(url);
      speakAudioRef.current = audio;
      audio.onended = () => setSpeakingKey((k) => (k === key ? null : k));
      audio.onerror = () => {
        setSpeakingKey((k) => (k === key ? null : k));
        setSpeakError(lang === 'es' ? 'No se pudo reproducir el audio.' : 'Could not play the audio.');
      };
      setSpeakLoadingKey(null);
      setSpeakingKey(key);
      await audio.play();
    } catch (e) {
      setSpeakLoadingKey(null);
      setSpeakError(lang === 'es' ? 'No se pudo generar la voz. Revisá la configuración de ElevenLabs en Setup.' : 'Could not generate the voice. Check the ElevenLabs setup.');
    }
  };
  React.useEffect(() => () => { if (speakAudioRef.current) speakAudioRef.current.pause(); }, []);

  // ---------- Dictado por voz para la pregunta de seguimiento (Web Speech API, gratis) ----------
  const [dictating, setDictating] = React.useState(false);
  const dictationRef = React.useRef(null);
  const fanScrollRef = React.useRef(null);
  const dictationSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  const toggleDictation = () => {
    if (dictating) {
      if (dictationRef.current) dictationRef.current.stop();
      return;
    }
    const rec = window.arcanaCreateDictation(lang, {
      onResult: (text) => setFollowUpDraft((d) => (d ? d.trim() + ' ' + text : text)),
      onEnd: () => setDictating(false),
      onError: () => setDictating(false),
    });
    if (!rec) return;
    dictationRef.current = rec;
    setDictating(true);
    rec.start();
  };

  // ---------- Deck helpers ----------
  const shuffleDeck = () => {
    const cards = window.TAROT_CARDS.all.slice();
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards;
  };
  const startShuffle = () => {
    setDeck(shuffleDeck());
    setPicked([]);
    setFlipped([]);
    setStep('shuffle');
  };

  // Puerta de acceso antes de barajar: verifica el email contra el backend
  // (plan real, o el límite del plan Vela gratis) y recién ahí arranca la
  // baraja — así nunca se gasta un llamado a la IA de más si no corresponde.
  const beginReading = () => {
    const em = (email || '').trim().toLowerCase();
    if (!em.includes('@')) {
      setAccessError(lang === 'es' ? 'Escribí tu email para continuar.' : 'Enter your email to continue.');
      return;
    }
    try { localStorage.setItem('arcana_reading_email', em); } catch { /* localStorage no disponible, no es crítico */ }
    setAccessError('');
    setAccessChecking(true);
    window.arcanaReadingAccess({ email: em, spread, preferredResponseType: selectedRT })
      .then((res) => {
        setResponseType(res.responseType || '2');
        setTicketId(res.ticketId || null);
        startShuffle();
      })
      .catch((e) => {
        let msg;
        if (e.reason === 'spread-not-allowed') {
          msg = lang === 'es'
            ? 'Esta tirada es solo para planes de pago — con el plan gratis podés hacer la carta del día o la tirada de 3 cartas.'
            : 'This spread is only for paid plans — the free plan can do the daily card or the 3-card spread.';
        } else if (e.reason === 'daily-limit') {
          msg = lang === 'es'
            ? 'Ya usaste tu consulta gratis de hoy — volvé mañana, o suscribite para consultas ilimitadas.'
            : "You've already used today's free reading — come back tomorrow, or subscribe for unlimited readings.";
        } else {
          msg = lang === 'es' ? 'No pudimos verificar tu acceso, probá de nuevo.' : 'Could not verify your access, please try again.';
        }
        setAccessError(msg);
      })
      .finally(() => setAccessChecking(false));
  };
  const reshuffle = () => {
    setDeck(shuffleDeck());
    setPicked([]);
    setFlipped([]);
  };

  const onCardPick = (card) => {
    if (picked.find((p) => p.card.id === card.id)) return;
    if (picked.length >= SPREAD_SIZE) return;
    const reversed = Math.random() < 0.28;
    const next = [...picked, { card, reversed }];
    setPicked(next);
    if (next.length === SPREAD_SIZE) {
      setTimeout(() => {
        setFlipped(Array(SPREAD_SIZE).fill(false));
        setStep('reveal');
      }, 350);
    }
  };
  const undoLast = () => {
    setPicked(picked.slice(0, -1));
  };

  // Sequential reveal helpers
  const flipCard = (i) => {
    setFlipped((prev) => {
      const next = prev.slice();
      next[i] = true;
      return next;
    });
  };
  const revealAll = () => {
    setFlipped(Array(SPREAD_SIZE).fill(true));
  };
  const allFlipped = flipped.length && flipped.every(Boolean);

  // "Volver a preguntar": al reanudar una lectura guardada, pedimos en
  // silencio el tipo de respuesta real (responseType) según el plan
  // actual, para que el cuadro de "pregunta de seguimiento" habilite la
  // cantidad correcta de preguntas — sin esto se queda en el default (0
  // preguntas) y el cuadro no aparecería. No consume el límite diario del
  // plan gratis: eso solo se descuenta cuando NO hay suscripción activa, y
  // acá solo se llega con lecturas que ya guardó una socia de pago.
  React.useEffect(() => {
    if (!resumeReading) return;
    const em = (profile && profile.email) || email || '';
    if (!em.includes('@')) return;
    window.arcanaReadingAccess({ email: em, spread, preferredResponseType: selectedRT })
      .then((res) => {
        if (res && res.responseType) setResponseType(res.responseType);
        if (res && res.ticketId) setTicketId(res.ticketId);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Centra el scroll del abanico de 78 cartas al entrar al paso "pick",
  // para que arranque mostrando el centro del mazo (como antes) pero
  // ahora el usuario puede deslizar hacia los lados y ver el mazo completo.
  React.useEffect(() => {
    if (step !== 'pick') return;
    const el = fanScrollRef.current;
    if (!el) return;
    el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
  }, [step]);

  // Kick off interpretation ONCE all cards are flipped
  React.useEffect(() => {
    if (step !== 'reveal') return;
    if (!allFlipped) return;
    if (thinking) return;
    if (interpretation) return; // already computed
    runInterpretation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, allFlipped]);

  const runInterpretation = async (angle = null) => {
    setThinking(true);
    const base = buildBaseInterpretation({ picked, positions, lang, question });
    try {
      const llmText = await requestLLMInterpretation({ picked, positions, lang, question, spread, angle, responseType, ticketId });
      setInterpretation({ base, llm: llmText, error: null });
    } catch (e) {
      // No tragarnos el error: si la IA falla mostramos por qué en vez de
      // fingir que el resumen de respaldo (base) es la interpretación real.
      const msg = (e && e.message) || (lang === 'es' ? 'Error desconocido.' : 'Unknown error.');
      setInterpretation({ base, llm: null, error: msg });
    } finally {
      setThinking(false);
    }
  };
  const regenerate = () => {
    setInterpretation(null);
    setFollowUps([]);
    setExtraCards([]);
    setFollowUpError('');
    const angles_es = ['más práctico y accionable', 'más suave y contemplativo', 'más honesto y directo', 'con foco en el vínculo con otros', 'con foco en lo que hay que soltar'];
    const angles_en = ['more practical and actionable', 'gentler and more contemplative', 'more honest and direct', 'focused on relationships with others', 'focused on what needs releasing'];
    const angles = lang === 'es' ? angles_es : angles_en;
    const angle = angles[(regenCount + 1) % angles.length];
    setRegenCount(regenCount + 1);
    runInterpretation(angle);
  };

  // ---------- Tipos 4/5: cartas adicionales y preguntas de seguimiento ----------
  const drawExtraCard = () => {
    const usedIds = new Set([...picked.map((p) => p.card.id), ...extraCards.map((p) => p.card.id)]);
    const pool = (window.TAROT_CARDS.all || []).filter((c) => !usedIds.has(c.id));
    if (!pool.length) return;
    const card = pool[Math.floor(Math.random() * pool.length)];
    const reversed = Math.random() < 0.28;
    const label = lang === 'es' ? `Carta adicional ${extraCards.length + 1}` : `Extra card ${extraCards.length + 1}`;
    setExtraCards([...extraCards, { card, reversed, label }]);
  };

  const askFollowUp = async () => {
    const q = followUpDraft.trim();
    if (!q || followUpBusy) return;
    setFollowUpBusy(true);
    setFollowUpError('');
    try {
      const answer = await requestFollowUpReply({ picked, extraCards, positions, lang, question, spread, interpretation, followUps, newQuestion: q, responseType, ticketId });
      setFollowUps((prev) => [...prev, { question: q, answer }]);
      setFollowUpDraft('');
    } catch (e) {
      setFollowUpError((e && e.message) || (lang === 'es' ? 'No se pudo obtener una respuesta. Intentá de nuevo.' : 'Could not get a reply. Try again.'));
    } finally {
      setFollowUpBusy(false);
    }
  };

  const exportReadingPDF = () => {
    const jspdfNs = window.jspdf;
    if (!jspdfNs || !jspdfNs.jsPDF) {
      alert(lang === 'es' ? 'No se pudo cargar el generador de PDF. Revisá tu conexión y volvé a intentar.' : 'Could not load the PDF generator. Check your connection and try again.');
      return;
    }
    const { jsPDF } = jspdfNs;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const marginX = 48;
    const maxWidth = 500;
    let y = 64;
    const addText = (text, size = 11, gapAfter = 14, bold = false) => {
      doc.setFontSize(size);
      doc.setFont(undefined, bold ? 'bold' : 'normal');
      const lines = doc.splitTextToSize(String(text || ''), maxWidth);
      lines.forEach((line) => {
        if (y > 760) { doc.addPage(); y = 64; }
        doc.text(line, marginX, y);
        y += size * 1.35;
      });
      y += gapAfter;
    };
    addText('LUX ASTRAL', 18, 4, true);
    addText(new Date().toLocaleDateString(lang === 'es' ? 'es-CL' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }), 10, 16);
    if (question) addText(`"${question}"`, 11, 16);
    [...picked, ...extraCards].forEach((p, i) => {
      const name = lang === 'es' ? p.card.name_es : p.card.name_en;
      const label = p.label || positions[i] || '';
      const orientation = p.reversed ? (lang === 'es' ? 'invertida' : 'reversed') : (lang === 'es' ? 'al derecho' : 'upright');
      addText(`${label} — ${name} (${orientation})`, 12, 2, true);
    });
    y += 8;
    addText(lang === 'es' ? 'INTERPRETACIÓN' : 'INTERPRETATION', 13, 8, true);
    addText(interpretation ? (interpretation.llm || interpretation.base) : '', 11, 16);
    followUps.forEach((f, i) => {
      addText(`${lang === 'es' ? 'Pregunta' : 'Question'} ${i + 1}: ${f.question}`, 11, 4, true);
      addText(f.answer, 11, 14);
    });
    doc.save(`lux-astral-lectura-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // ---------- Save / share ----------
  const handleSave = () => {
    // El guardado automático del historial es solo para socias con plan
    // pago — a quien no lo es, este botón le muestra un aviso en vez de
    // guardar la lectura.
    if (!isPaid) { setSaveUpsell(true); return; }
    if (saveState === 'saved') return;
    const reading = {
      id: 'r_' + Date.now(),
      date: new Date().toISOString(),
      spread,
      question,
      picked: picked.map((p) => ({ id: p.card.id, reversed: p.reversed })),
      lang,
      // Se guarda también la interpretación y las preguntas de seguimiento
      // (antes se perdían al salir de la pantalla) para que el historial de
      // Perfil pueda mostrarlas y ofrecer la descarga en PDF.
      interpretation: interpretation ? (interpretation.llm || interpretation.base) : null,
      followUps: followUps.map((f) => ({ question: f.question, answer: f.answer })),
    };
    saveReading(reading);
    setSaveState('saved');
  };
  // Guardado automático del historial — solo socias con plan pago, y solo
  // para lecturas nuevas (al reanudar una ya guardada, saveState arranca
  // en 'saved' y esto no hace nada). Se dispara una vez apenas la
  // interpretación está lista.
  React.useEffect(() => {
    if (resumeReading) return;
    if (!isPaid) return;
    if (!interpretation) return;
    if (saveState === 'saved') return;
    handleSave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interpretation, isPaid]);
  // "Volver a preguntar": cada pregunta de seguimiento nueva se guarda de
  // vuelta en ESA misma lectura del historial, en vez de crear una lectura
  // nueva.
  const resumeFollowUpsRef = React.useRef(followUps.length);
  React.useEffect(() => {
    if (!resumeReading) return;
    if (followUps.length === resumeFollowUpsRef.current) return; // sin cambios reales
    resumeFollowUpsRef.current = followUps.length;
    updateReading(resumeReading.id, { followUps: followUps.map((f) => ({ question: f.question, answer: f.answer })) });
  }, [followUps]);
  const handleShare = async () => {
    const text = buildShareText({ picked, positions, lang, question, spread, interpretation, t });
    try {
      await navigator.clipboard.writeText(text);
      setShareState('copied');
      setTimeout(() => setShareState('idle'), 2400);
    } catch (e) {
      // fallback: create a temp textarea
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch {}
      document.body.removeChild(ta);
      setShareState('copied');
      setTimeout(() => setShareState('idle'), 2400);
    }
  };

  // ---------- Renders ----------
  if (step === 'question') return renderQuestion();
  if (step === 'shuffle')  return renderShuffle();
  if (step === 'pick')     return renderPick();
  return renderReveal();

  // ------- Step 1: QUESTION -------
  function renderQuestion() {
    return (
      <div className="page reading-page">
        <FlowHeader step={1} label={t.q_step_label} setRoute={setRoute} lang={lang} />
        <div className="q-wrap">
          <div className="eyebrow" style={{ marginBottom: 20 }}>
            ✦ {getSpreadName(spread, t)}
          </div>
          <h1 className="q-h">{t.q_h}</h1>
          <p className="q-sub italic">{t.q_sub}</p>
          <div className="q-form">
            <textarea
              placeholder={t.q_placeholder}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              autoFocus
            />
            <div className="q-hint">"{t.q_hint}"</div>
            <div className="form-field" style={{ marginTop: 18, maxWidth: 360 }}>
              <label>{lang === 'es' ? 'Tu email' : 'Your email'}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
              />
              <div className="q-hint" style={{ marginTop: 4 }}>
                {lang === 'es'
                  ? 'Lo usamos para aplicar tu plan (o el límite diario del plan gratis).'
                  : "We use it to apply your plan (or the free plan's daily limit)."}
              </div>
            </div>
            {showRTPicker && (
              <div className="form-field" style={{ marginTop: 18, maxWidth: 460 }}>
                <label>{lang === 'es' ? 'Tipo de respuesta' : 'Response type'}</label>
                <div className="rt-options">
                  {rtOptions.map((v) => {
                    const meta = RT_PICKER_LABELS[v];
                    return (
                      <label key={v} className={`rt-option ${selectedRT === v ? 'is-selected' : ''}`}>
                        <input
                          type="radio"
                          name="responseType"
                          value={v}
                          checked={selectedRT === v}
                          onChange={() => chooseResponseType(v)}
                        />
                        <span>
                          <span className="rt-option-label">{lang === 'es' ? meta.label_es : meta.label_en}</span>
                          <span className="rt-option-desc">{lang === 'es' ? meta.desc_es : meta.desc_en}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
            {accessError && (
              <div className="q-hint italic" style={{ color: '#e08080' }}>{accessError}</div>
            )}
            <div className="q-actions">
              <button className="btn btn-ghost" disabled={accessChecking} onClick={() => { setQuestion(''); beginReading(); }}>
                {t.q_skip}
              </button>
              <button className="btn btn-primary btn-lg" disabled={accessChecking} onClick={beginReading}>
                {accessChecking ? (lang === 'es' ? 'Verificando…' : 'Checking…') : <>{t.q_cta} ✦</>}
              </button>
            </div>
          </div>
        </div>
        <ReadingStyles />
      </div>
    );
  }

  // ------- Step 2: SHUFFLE -------
  function renderShuffle() {
    return (
      <div className="page reading-page">
        <FlowHeader step={2} label={t.shuffle_step_label} setRoute={setRoute} lang={lang} />
        <div className="shuffle-wrap">
          <div className="eyebrow" style={{ marginBottom: 16 }}>✦ {t.shuffle_h}</div>
          <p className="shuffle-sub italic">{t.shuffle_sub}</p>
          {question && (
            <div className="shuffle-question italic">"{question}"</div>
          )}
          <div className="shuffle-stage">
            {[...Array(9)].map((_, i) => (
              <div
                key={i}
                className="shuffle-card"
                style={{
                  '--i': i,
                  '--delay': `${i * 0.12}s`,
                }}
              />
            ))}
          </div>
          <button
            className="btn btn-primary btn-lg"
            style={{ marginTop: 40 }}
            onClick={() => setStep('pick')}
          >
            {t.shuffle_ready} ✦
          </button>
        </div>
        <ReadingStyles />
      </div>
    );
  }

  // ------- Step 3: PICK -------
  function renderPick() {
    // Se muestra el mazo completo (78 cartas reales, ya barajado) en un
    // abanico horizontal scrolleable — antes solo se mostraban las
    // primeras 22, lo que daba la sensación de que el mazo estaba
    // "arreglado". Ahora todas son visibles y elegibles, deslizando.
    // FAN_SPACING vive ADENTRO de renderPick (y no afuera, al nivel de
    // ReadingPage) a propósito: el dispatcher de arriba (`if (step==='pick')
    // return renderPick();`) se ejecuta ANTES, en el orden del archivo, de
    // donde estaba declarada antes esta constante — con la forma en que
    // Babel-standalone transpila `const` acá (a `var`, sin TDZ real), eso
    // hacía que FAN_SPACING fuera `undefined` la primera vez que se leía
    // dentro del .map(), y todo el abanico terminaba en NaN (todas las
    // cartas colapsadas en el mismo punto). Ver arcana-tiradas-reverso.md.
    const FAN_SPACING = 36; // px entre el centro de cada carta en el abanico
    const totalFan = deck.length;
    const fanCards = deck;
    const fanWidth = totalFan * FAN_SPACING + 220;
    const remaining = SPREAD_SIZE - picked.length;
    const heading = SPREAD_SIZE === 1
      ? t.pick_h_1
      : t.pick_h_n.replace('{n}', SPREAD_SIZE);
    return (
      <div className="page reading-page">
        <FlowHeader step={3} label={t.pick_step_label} setRoute={setRoute} lang={lang} />
        <div className="pick-wrap">
          <div className="eyebrow" style={{ marginBottom: 12 }}>✦ {getSpreadName(spread, t)}</div>
          <h2 className="pick-h">{heading}</h2>
          <p className="pick-sub italic">{t.pick_sub}</p>
          <div className="pick-counter">
            <span className="pick-counter-n">{picked.length}</span>
            <span className="pick-counter-sep">/</span>
            <span className="pick-counter-total">{SPREAD_SIZE}</span>
            {remaining > 0 && (
              <span className="pick-counter-remaining">— {remaining} {t.pick_remaining}</span>
            )}
          </div>

          {/* Slot indicator: dots + labels */}
          <div className="pick-slots">
            {positions.map((pos, i) => (
              <div key={i} className={`pick-slot ${picked[i] ? 'is-filled' : ''} ${!picked[i] && i === picked.length ? 'is-current' : ''}`}>
                <div className="pick-slot-dot" />
                <div className="pick-slot-label">{pos}</div>
              </div>
            ))}
          </div>

          {/* Utility row */}
          <div className="pick-utility">
            <button
              className="btn btn-ghost btn-sm"
              onClick={undoLast}
              disabled={picked.length === 0}
            >
              ← {t.pick_undo}
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={reshuffle}
              disabled={picked.length === SPREAD_SIZE}
            >
              ↻ {t.pick_reshuffle}
            </button>
          </div>

          {/* Mazo completo, en abanico scrolleable */}
          <div className="pick-fan-scroll" ref={fanScrollRef}>
            <div className="pick-fan" style={{ width: `${fanWidth}px` }}>
              {fanCards.map((c, i) => {
                const isChosen = picked.find((p) => p.card.id === c.id);
                const center = (totalFan - 1) / 2;
                const frac = (i - center) / center; // -1..1, posición relativa dentro del mazo
                const angle = frac * 12 + Math.sin(i * 0.85) * 3.5;
                const yOff = Math.abs(frac) * 22 + Math.abs(Math.sin(i * 0.6)) * 10;
                const x = (i - center) * FAN_SPACING;
                return (
                  <div
                    key={c.id}
                    className={`pick-fan-card ${isChosen ? 'is-chosen' : ''}`}
                    style={{
                      '--x': `${x}px`,
                      transform: `translateX(${x}px) translateY(${yOff}px) rotate(${angle}deg)`,
                      zIndex: i,
                    }}
                    onClick={() => onCardPick(c)}
                  >
                    <div className="pick-fan-card-inner" />
                  </div>
                );
              })}
            </div>
          </div>
          <div className="pick-fan-hint">
            {lang === 'es' ? '← desliza para ver el mazo completo →' : '← scroll to see the whole deck →'}
          </div>

          {picked.length === SPREAD_SIZE && (
            <button
              className="btn btn-primary btn-lg"
              style={{ marginTop: 32 }}
              onClick={() => { setFlipped(Array(SPREAD_SIZE).fill(false)); setStep('reveal'); }}
            >
              {t.pick_reveal} ✦
            </button>
          )}
        </div>
        <ReadingStyles />
      </div>
    );
  }

  // ------- Step 4: REVEAL -------
  function renderReveal() {
    const date = new Date();
    const dateStr = formatDate(date, lang);
    const flippedCount = flipped.filter(Boolean).length;
    const isCeltic = spread === 'celtic';

    return (
      <div className="page reading-page reading-reveal">
        <div className="reveal-head">
          <div className="eyebrow">✦ {t.result_reading_for}</div>
          <h1 className="reveal-h">{dateStr}</h1>
          {question && <p className="reveal-question italic">"{question}"</p>}
        </div>

        {/* Progressive hint / reveal-all button */}
        {!allFlipped && (
          <div className="reveal-hint-row">
            <span className="reveal-hint italic">{t.reveal_tap_hint} · {flippedCount}/{SPREAD_SIZE}</span>
            <button className="btn btn-ghost btn-sm" onClick={revealAll}>
              {t.reveal_reveal_all}
            </button>
          </div>
        )}

        {isCeltic ? (
          <CelticLayout picked={picked} flipped={flipped} onFlip={flipCard} positions={positions} lang={lang} t={t} />
        ) : (
          <div className="reveal-cards" data-count={SPREAD_SIZE}>
            {picked.map((p, i) => (
              <RevealSlot
                key={p.card.id}
                idx={i}
                card={p.card}
                reversed={p.reversed}
                position={positions[i]}
                revealed={!!flipped[i]}
                onFlip={() => flipCard(i)}
                lang={lang}
                t={t}
              />
            ))}
          </div>
        )}

        {/* Interpretation */}
        {allFlipped && (
          <div className="reveal-interp">
            <div className="reveal-interp-head">
              <div className="eyebrow">✦ {t.result_interpretation}</div>
              {interpretation && !thinking && (
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {voiceOn && (
                    <button
                      className="reveal-regen"
                      onClick={() => speakText('main', interpretation.llm || interpretation.base)}
                      disabled={speakLoadingKey === 'main'}
                    >
                      {speakingKey === 'main' ? `⏹ ${lang === 'es' ? 'Detener' : 'Stop'}` : speakLoadingKey === 'main' ? (lang === 'es' ? 'Generando…' : 'Generating…') : `🔊 ${lang === 'es' ? 'Escuchar' : 'Listen'}`}
                    </button>
                  )}
                  <button className="reveal-regen" onClick={regenerate}>
                    ↻ {t.result_regenerate}
                  </button>
                </div>
              )}
            </div>
            {thinking && <AstralRain lang={lang} t={t} />}
            {interpretation && !thinking && (
              <div className="reveal-interp-body">
                {interpretation.error && (
                  <p className="reveal-followup-error">
                    {lang === 'es'
                      ? `No pudimos generar la interpretación con IA (mostramos un resumen básico de respaldo). Detalle: ${interpretation.error}`
                      : `We couldn't generate the AI interpretation (showing a basic backup summary instead). Detail: ${interpretation.error}`}
                  </p>
                )}
                <div className="reveal-interp-llm">
                  {(interpretation.llm || interpretation.base).split('\n\n').map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
                {speakError && <p className="reveal-followup-error">{speakError}</p>}
              </div>
            )}
          </div>
        )}

        {/* Cartas adicionales sacadas durante la conversación (tipos 4 y 5) */}
        {allFlipped && interpretation && !thinking && extraCards.length > 0 && (
          <div className="reveal-extra">
            <div className="eyebrow">✦ {lang === 'es' ? 'Cartas adicionales' : 'Extra cards'}</div>
            <div className="reveal-extra-row">
              {extraCards.map((p, i) => (
                <RevealSlot
                  key={i}
                  idx={i}
                  card={p.card}
                  reversed={p.reversed}
                  position={p.label}
                  revealed={true}
                  onFlip={() => {}}
                  lang={lang}
                  t={t}
                  size={140}
                />
              ))}
            </div>
          </div>
        )}

        {/* Preguntas de seguimiento (tipos 4 y 5) */}
        {allFlipped && interpretation && !thinking && RT.maxFollowUps > 0 && (
          <div className="reveal-followup">
            {followUps.map((f, i) => (
              <div key={i} className="reveal-followup-item">
                <div className="reveal-followup-q">— {f.question}</div>
                <div className="reveal-followup-a italic">{f.answer}</div>
                {voiceOn && (
                  <button
                    className="reveal-regen"
                    style={{ marginTop: 10, fontSize: 9, padding: '6px 12px' }}
                    onClick={() => speakText(`followup-${i}`, f.answer)}
                    disabled={speakLoadingKey === `followup-${i}`}
                  >
                    {speakingKey === `followup-${i}`
                      ? `⏹ ${lang === 'es' ? 'Detener' : 'Stop'}`
                      : speakLoadingKey === `followup-${i}`
                      ? (lang === 'es' ? 'Generando…' : 'Generating…')
                      : `🔊 ${lang === 'es' ? 'Escuchar' : 'Listen'}`}
                  </button>
                )}
              </div>
            ))}
            {followUps.length < RT.maxFollowUps ? (
              <div className="reveal-followup-input">
                <textarea
                  className="form-field"
                  value={followUpDraft}
                  onChange={(e) => setFollowUpDraft(e.target.value)}
                  placeholder={lang === 'es' ? 'Hacé una pregunta de seguimiento...' : 'Ask a follow-up question...'}
                  disabled={followUpBusy}
                  rows={2}
                />
                <div className="reveal-followup-actions">
                  {dictationSupported && (
                    <button
                      className={`btn btn-ghost ${dictating ? 'is-selected' : ''}`}
                      onClick={toggleDictation}
                      disabled={followUpBusy}
                      title={lang === 'es' ? 'Dictar por voz' : 'Dictate by voice'}
                    >
                      {dictating ? `● ${lang === 'es' ? 'Escuchando…' : 'Listening…'}` : `🎙 ${lang === 'es' ? 'Dictar' : 'Dictate'}`}
                    </button>
                  )}
                  {RT.allowExtraCards && (
                    <button className="btn btn-ghost" onClick={drawExtraCard} disabled={followUpBusy}>
                      🃏 {lang === 'es' ? 'Sacar una carta más' : 'Draw one more card'}
                    </button>
                  )}
                  <button className="btn btn-primary" onClick={askFollowUp} disabled={followUpBusy || !followUpDraft.trim()}>
                    {followUpBusy ? (lang === 'es' ? 'Consultando…' : 'Asking…') : (lang === 'es' ? 'Preguntar' : 'Ask')}
                  </button>
                </div>
                {followUpError && <p className="reveal-followup-error">{followUpError}</p>}
              </div>
            ) : (
              <p className="italic reveal-followup-done">
                {lang === 'es'
                  ? 'Llegaste al máximo de preguntas de seguimiento para este tipo de lectura.'
                  : "You've reached the max follow-up questions for this reading type."}
              </p>
            )}
          </div>
        )}

        {/* Informe descargable en PDF (tipo 5) */}
        {allFlipped && interpretation && !thinking && RT.pdf && (
          <div className="reveal-pdf">
            <button className="btn btn-ghost" onClick={exportReadingPDF}>
              ⇩ {lang === 'es' ? 'Descargar informe en PDF' : 'Download PDF report'}
            </button>
          </div>
        )}

        {allFlipped && (
          <div className="reveal-actions-wrap">
            <div className="reveal-actions">
              <button
                className={`btn ${saveState === 'saved' ? 'btn-ghost' : 'btn-primary'}`}
                onClick={handleSave}
                disabled={saveState === 'saved'}
              >
                {saveState === 'saved' ? `✓ ${t.result_saved}` : `✦ ${t.result_save}`}
              </button>
              <button className="btn btn-ghost" onClick={handleShare}>
                {shareState === 'copied' ? `✓ ${t.result_shared}` : `⧉ ${t.result_share}`}
              </button>
              <button className="btn btn-ghost" onClick={() => setRoute({ page: 'readings' })}>
                {t.result_new}
              </button>
              <button className="btn btn-ghost" onClick={() => setRoute({ page: resumeReading ? 'profile' : 'home' })}>
                {t.back}
              </button>
            </div>
            {saveUpsell && !isPaid && (
              <p className="italic reveal-save-upsell">
                {t.result_save_paid_only}{' '}
                <a href="#" onClick={(e) => { e.preventDefault(); setRoute({ page: 'pricing' }); }}>
                  {lang === 'es' ? 'Ver planes' : 'See plans'} →
                </a>
              </p>
            )}
          </div>
        )}
        <ReadingStyles />
      </div>
    );
  }
}

// ============ Sub-components ============
function FlowHeader({ step, label, setRoute, lang }) {
  const t = window.I18N[lang];
  return (
    <div className="flow-head">
      <button className="flow-back" onClick={() => setRoute({ page: 'readings' })}>
        ← {t.back}
      </button>
      <div className="flow-steps">
        {[1, 2, 3].map((s) => (
          <div key={s} className={`flow-step ${s <= step ? 'is-done' : ''} ${s === step ? 'is-current' : ''}`}>
            <div className="flow-step-dot" />
            {s < 3 && <div className="flow-step-line" />}
          </div>
        ))}
      </div>
      <div className="flow-label">{label}</div>
    </div>
  );
}

// One reveal slot — a card + position label + meaning. Tap to flip.
function RevealSlot({ idx, card, reversed, position, revealed, onFlip, lang, t, size }) {
  const { TarotCard } = window;
  const meaning = lang === 'es'
    ? (reversed ? card.reversed_es : card.upright_es)
    : (reversed ? card.reversed_en : card.upright_en);
  const name = lang === 'es' ? card.name_es : card.name_en;
  return (
    <div className="reveal-card-wrap" style={{ animationDelay: `${idx * 0.12}s` }}>
      <div className="reveal-card-pos">
        {String(idx + 1).padStart(2, '0')} · {position}
      </div>
      <div className={`reveal-card ${revealed ? 'is-revealed' : ''}`} onClick={!revealed ? onFlip : undefined} style={size ? { maxWidth: size } : {}}>
        <TarotCard card={card} lang={lang} revealed={revealed} reversed={reversed} />
      </div>
      {revealed && (
        <>
          <div className="reveal-card-name">
            {name}
            {reversed && (
              <span className="reveal-card-reversed"> · {t.card_reversed}</span>
            )}
          </div>
          <div className="reveal-card-meaning italic">
            "{meaning}"
          </div>
        </>
      )}
    </div>
  );
}

// Celtic Cross layout — classical geometry (10 cards)
//   Cross:       [1]center, [2]crossing horizontally, [3]below, [4]left, [5]above, [6]right
//   Staff:       [7]bottom, [8]above 7, [9]above 8, [10]top
function CelticLayout({ picked, flipped, onFlip, positions, lang, t }) {
  // Grid geometry: 6 cols × 4 rows
  const cellSize = { w: 140, h: 210 };
  const gap = 16;
  const placements = [
    // [col, row]  (0-indexed) — using center-of-card
    [1, 1.5],   // 0 Present (center)
    [1, 1.5],   // 1 Cross (horizontal, on top of 0)
    [1, 3],     // 2 Base (below)
    [0, 1.5],   // 3 Past (left)
    [1, 0],     // 4 Crown (above)
    [2, 1.5],   // 5 Future (right)
    [4, 3],     // 6 Self (staff bottom)
    [4, 2],     // 7 Environment
    [4, 1],     // 8 Hopes
    [4, 0],     // 9 Outcome
  ];
  return (
    <div className="celtic-layout">
      <div className="celtic-stage" style={{ width: (5 * (cellSize.w + gap) + cellSize.w), height: (4 * (cellSize.h + gap)) }}>
        {picked.map((p, i) => {
          const [col, row] = placements[i];
          const isCross = i === 1;
          const x = col * (cellSize.w + gap);
          const y = row * (cellSize.h / 1.5 + gap / 2);
          return (
            <div
              key={p.card.id}
              className={`celtic-slot ${isCross ? 'is-cross' : ''}`}
              style={{ left: x, top: y, width: cellSize.w }}
            >
              <div className="celtic-slot-pos">{String(i + 1).padStart(2, '0')} · {positions[i]}</div>
              <div className={`reveal-card ${flipped[i] ? 'is-revealed' : ''}`} onClick={!flipped[i] ? () => onFlip(i) : undefined}>
                <window.TarotCard card={p.card} lang={lang} revealed={!!flipped[i]} reversed={p.reversed} />
              </div>
              {flipped[i] && (
                <div className="celtic-slot-name">
                  {lang === 'es' ? p.card.name_es : p.card.name_en}
                  {p.reversed && <span className="reveal-card-reversed"> · {t.card_reversed}</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Below the layout, expanded per-card meanings once flipped */}
      <div className="celtic-meanings">
        {picked.map((p, i) => {
          if (!flipped[i]) return null;
          const meaning = lang === 'es'
            ? (p.reversed ? p.card.reversed_es : p.card.upright_es)
            : (p.reversed ? p.card.reversed_en : p.card.upright_en);
          return (
            <div key={p.card.id} className="celtic-meaning-row">
              <div className="celtic-meaning-pos">
                {String(i + 1).padStart(2, '0')} · {positions[i]}
              </div>
              <div className="celtic-meaning-body">
                <div className="celtic-meaning-name">
                  {lang === 'es' ? p.card.name_es : p.card.name_en}
                </div>
                <div className="celtic-meaning-text italic">"{meaning}"</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============ Helpers ============
function getSpreadName(spread, t) {
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
  }[spread] || t.reading_three_name;
}

function formatDate(date, lang) {
  const day = date.getDate();
  const month = window.I18N[lang].month_names[date.getMonth()];
  const year = date.getFullYear();
  if (lang === 'es') return `${day} de ${month}, ${year}`;
  return `${month.charAt(0).toUpperCase() + month.slice(1)} ${day}, ${year}`;
}

// ============ Astral Rain — animación de espera mientras la IA interpreta ============
// A pedido de Christian (2026-09-08): reemplaza el indicador de "pensando" (3 puntitos)
// por una "lluvia astral" de estrellas y lunas doradas cayendo con distinta profundidad,
// velocidad y trayectoria, más un cometa ocasional y el isotipo Luna-Estrella respirando
// en el centro con el texto de estado rotando. Todo se genera al azar en cada montaje
// (cada vez que arranca una interpretación), así ninguna espera se ve igual a otra.
const ASTRAL_PHRASE_KEYS = ['astral_status_1', 'astral_status_2', 'astral_status_3', 'astral_status_4'];
const ASTRAL_SWAY_KEYS = ['A', 'B', 'C', 'D'];
const ASTRAL_KINDS = ['star8', 'star8', 'star4', 'moon']; // más estrellas que lunas

function astralRandom(min, max) { return min + Math.random() * (max - min); }
function astralPick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function generateAstralParticles() {
  const count = Math.floor(astralRandom(15, 26)); // 15–25 simultáneas
  const particles = [];
  for (let i = 0; i < count; i++) {
    // reparte el ancho en franjas (con jitter) para que queden "muy separadas"
    const slot = ((i + astralRandom(0.12, 0.88)) / count) * 100;
    const depth = Math.random(); // 0 = muy cerca (grande y borrosa) · 1 = muy lejos (chica y nítida)
    const near = depth < 0.3;
    const size = Math.round(14 + (1 - depth) * 58); // 14–72px
    let blur = 0;
    if (near) blur = Math.round(astralRandom(2, 5) * 10) / 10;
    else if (depth < 0.55) blur = Math.round(astralRandom(0, 1.4) * 10) / 10;
    particles.push({
      id: i,
      kind: astralPick(ASTRAL_KINDS),
      swayKey: astralPick(ASTRAL_SWAY_KEYS),
      swayAmp: Math.round(astralRandom(14, 46)),
      left: Math.min(96, Math.max(2, slot)),
      size,
      blur,
      duration: Math.round(near ? astralRandom(11, 17) : astralRandom(20, 34)),
      delay: -Math.round(astralRandom(0, 26)), // arrancan ya "en vuelo", desincronizadas
      peakOpacity: Math.round(astralRandom(0.45, 0.95) * 100) / 100,
      front: Math.random() < 0.3, // pasa por delante del isotipo central (con más blur)
      twinkleDuration: Math.round(astralRandom(2, 4.5) * 10) / 10,
    });
  }
  return particles;
}

function AstralParticleIcon({ kind }) {
  if (kind === 'moon') {
    return (
      <svg viewBox="0 0 100 100" style={{ display: 'block', width: '100%', height: '100%' }}>
        <path d="M60 6 A46 46 0 1 0 60 94 A34 34 0 1 1 60 6 Z" fill="currentColor" />
      </svg>
    );
  }
  const d = kind === 'star4'
    ? 'M50 2 C54 40 60 46 98 50 C60 54 54 60 50 98 C46 60 40 54 2 50 C40 46 46 40 50 2 Z'
    : 'M50 0 L59 37 L100 50 L59 63 L50 100 L41 63 L0 50 L41 37 Z';
  return (
    <svg viewBox="0 0 100 100" style={{ display: 'block', width: '100%', height: '100%' }}>
      <path d={d} fill="currentColor" />
    </svg>
  );
}

function AstralComet() {
  const topPct = React.useMemo(() => astralRandom(6, 50), []);
  const duration = React.useMemo(() => astralRandom(7, 11), []);
  return <div className="astral-comet" style={{ top: `${topPct}%`, animationDuration: `${duration}s` }} />;
}

function AstralRain({ lang, t }) {
  const particles = React.useMemo(() => generateAstralParticles(), []);
  const [comets, setComets] = React.useState([]);
  const [phraseIdx, setPhraseIdx] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    const phraseTimer = setInterval(() => {
      setPhraseIdx((i) => (i + 1) % ASTRAL_PHRASE_KEYS.length);
    }, 2800);

    let cometTimer = null;
    function scheduleComet() {
      const wait = astralRandom(4000, 9000);
      cometTimer = setTimeout(() => {
        if (cancelled) return;
        const id = Date.now() + Math.random();
        setComets((c) => [...c, id]);
        setTimeout(() => { if (!cancelled) setComets((c) => c.filter((x) => x !== id)); }, 11000);
        scheduleComet();
      }, wait);
    }
    scheduleComet();

    return () => { cancelled = true; clearInterval(phraseTimer); if (cometTimer) clearTimeout(cometTimer); };
  }, []);

  return (
    <div className="astral-rain">
      <div className="astral-rain-field">
        {particles.map((p) => (
          <div
            key={p.id}
            className="astral-particle"
            style={{
              left: `${p.left}%`,
              width: p.size,
              height: p.size,
              '--sway': `${p.swayAmp}px`,
              '--peak': p.peakOpacity,
              filter: p.blur ? `blur(${p.blur}px)` : undefined,
              zIndex: p.front ? 8 : 2,
              animationName: `astralSway${p.swayKey}, astralTwinkle`,
              animationDuration: `${p.duration}s, ${p.twinkleDuration}s`,
              animationDelay: `${p.delay}s, 0s`,
              animationTimingFunction: 'linear, ease-in-out',
              animationIterationCount: 'infinite, infinite',
            }}
          >
            <AstralParticleIcon kind={p.kind} />
          </div>
        ))}
        {comets.map((id) => <AstralComet key={id} />)}
      </div>
      <div className="astral-rain-center">
        <img src="assets/logo-mark.png" alt="" className="astral-rain-logo" />
        <div className="astral-rain-status italic">{t[ASTRAL_PHRASE_KEYS[phraseIdx]]}</div>
      </div>
    </div>
  );
}

function buildBaseInterpretation({ picked, positions, lang, question }) {
  const lines = [];
  picked.forEach((p, i) => {
    const name = lang === 'es' ? p.card.name_es : p.card.name_en;
    const meaning = lang === 'es'
      ? (p.reversed ? p.card.reversed_es : p.card.upright_es)
      : (p.reversed ? p.card.reversed_en : p.card.upright_en);
    lines.push(`${positions[i]} — ${name}. ${meaning}`);
  });
  const intro = lang === 'es'
    ? (question
        ? `Sobre tu pregunta — "${question}" — las cartas te responden con lo siguiente:`
        : 'Las cartas hablan así:')
    : (question
        ? `On your question — "${question}" — the cards respond with the following:`
        : 'The cards speak this way:');
  return intro + '\n\n' + lines.join('\n\n');
}

// Mapa de tipos permitidos por plan (espejo del PLAN_RESPONSE_TYPE_OPTIONS
// de local-server.js, solo para poder mostrar el selector antes de llamar
// al backend — el backend es quien valida de verdad).
const PLAN_RT_OPTIONS = {
  luna: ['1', '2', '3'],
  estrella: ['1', '2', '3', '4'],
  oraculo: ['5'],
};

// Etiquetas cortas para el selector de tipo de respuesta que ven las
// usuarias de plan Luna/Estrella al iniciar una lectura. Oráculo no elige
// (tiene el Tipo 5 fijo), por eso acá no hace falta la del Tipo 5.
const RT_PICKER_LABELS = {
  '1': {
    label_es: 'Tipo 1 — Simple', label_en: 'Type 1 — Simple',
    desc_es: 'Respuesta breve y directa, en 3 párrafos.',
    desc_en: 'A short, direct answer in 3 paragraphs.',
  },
  '2': {
    label_es: 'Tipo 2 — Moderada', label_en: 'Type 2 — Moderate',
    desc_es: 'Un poco más de profundidad (2 a 4 párrafos).',
    desc_en: 'A bit more depth (2 to 4 paragraphs).',
  },
  '3': {
    label_es: 'Tipo 3 — Elaborada', label_en: 'Type 3 — Elaborate',
    desc_es: 'Cada carta explicada en detalle, con una conclusión final.',
    desc_en: 'Each card explained in detail, with a final conclusion.',
  },
  '4': {
    label_es: 'Tipo 4 — Conversación', label_en: 'Type 4 — Conversation',
    desc_es: 'Lectura inicial muy elaborada + hasta 2 preguntas de seguimiento.',
    desc_en: 'A very elaborate opening reading + up to 2 follow-up questions.',
  },
};

// ---------- Tipos de respuesta configurables desde el panel de Setup ----------
const RESPONSE_TYPES = {
  '1': {
    maxTokens: 700, maxFollowUps: 0, allowExtraCards: false, pdf: false,
    instr_es: `Escribe una interpretación de 3 párrafos:
1. Un párrafo que teja las cartas entre sí y responda directamente a la pregunta (o al ánimo general si no hubo pregunta).
2. Un párrafo que baje a lo práctico: qué observar, qué evitar, qué invitar.
3. Un párrafo de cierre breve, casi como una frase de despedida.
Sé específica con la pregunta. No repitas los nombres de las cartas mecánicamente. Máximo 250 palabras.`,
    instr_en: `Write a 3-paragraph interpretation:
1. A paragraph that weaves the cards together and answers the question directly (or addresses the overall mood if no question).
2. A paragraph that gets practical: what to watch, what to avoid, what to invite in.
3. A short closing paragraph, almost a parting line.
Be specific to the question. Don't just list the card names mechanically. Maximum 250 words.`,
  },
  '2': {
    maxTokens: 1100, maxFollowUps: 0, allowExtraCards: false, pdf: false,
    instr_es: `Escribe una interpretación de entre 2 y 4 párrafos: un poco más de profundidad y matiz que una lectura rápida, conectando las cartas entre sí y con la pregunta, sin irte por las ramas. Sé específica con la pregunta. Máximo 400 palabras.`,
    instr_en: `Write an interpretation of 2 to 4 paragraphs: a bit more depth and nuance than a quick reading, connecting the cards to each other and to the question, without rambling. Be specific to the question. Maximum 400 words.`,
  },
  '3': {
    maxTokens: 1900, maxFollowUps: 0, allowExtraCards: false, pdf: false,
    instr_es: `Escribe una interpretación elaborada de 4 párrafos o más: dedicá un párrafo (o un bloque bien diferenciado) a cada carta de la tirada explicando su significado en el contexto de la pregunta, y cerrá con un párrafo de conclusión que una todo. Máximo 700 palabras.`,
    instr_en: `Write an elaborate interpretation of 4 or more paragraphs: dedicate one paragraph (or a clearly separate block) to each card in the spread, explaining its meaning in context of the question, and close with a concluding paragraph that ties it all together. Maximum 700 words.`,
  },
  '4': {
    maxTokens: 1900, maxFollowUps: 2, allowExtraCards: true, pdf: false,
    instr_es: `Escribe una interpretación elaborada, de varios párrafos, cubriendo cada carta en profundidad y cómo se conectan entre sí y con la pregunta. Actuás como una tarotista real en una sesión en vivo: si sentís que hace falta más contexto para cerrar bien, podés invitar con calidez a quien consulta a contarte más o a sacar una carta más antes de tu conclusión final. Esta es la lectura inicial de una conversación que puede seguir con preguntas de quien consulta. Máximo 900 palabras.`,
    instr_en: `Write an elaborate, multi-paragraph interpretation, covering each card in depth and how they connect to each other and the question. You act as a real tarot reader in a live session: if you feel more context would help you close well, you may warmly invite the querent to share more or draw one more card before your final conclusion. This is the opening reading of a conversation that may continue with the querent's questions. Maximum 900 words.`,
  },
  '5': {
    maxTokens: 2400, maxFollowUps: 5, allowExtraCards: true, pdf: true,
    instr_es: `Escribe un informe de lectura muy elaborado y extenso, con el máximo detalle posible: desarrollá cada carta a fondo, sus cruces y matices, y cómo responden a la pregunta. Actuás como una tarotista real en una sesión en vivo, generosa en tiempo y detalle: si hace falta, invitá con calidez a quien consulta a sacar una o más cartas adicionales o a contarte más antes de cerrar. Esta lectura puede seguir con hasta 3 preguntas de quien consulta antes del informe final. Sé extensa y minuciosa.`,
    instr_en: `Write a very elaborate and extensive reading report, with as much detail as possible: develop each card thoroughly, its crossings and nuances, and how it answers the question. You act as a real tarot reader in a live session, generous with time and detail: if needed, warmly invite the querent to draw one or more extra cards or share more before closing. This reading may continue with up to 3 questions from the querent before the final report. Be extensive and thorough.`,
  },
};

// La edge function de tarot-interpret devuelve el texto como stream plano
// (no como { text } en JSON) para poder mandar los headers de la
// respuesta apenas arranca la generacion, sin esperar a que termine --
// asi lecturas largas (Tipo 3/4/5) no chocan con ningun limite de tiempo
// de la plataforma. Esta funcion junta el stream completo en un string,
// con un respaldo por si el navegador no expone res.body como stream.
async function readTextStream(res) {
  if (res.body && typeof res.body.getReader === 'function') {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let text = '';
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return text.trim();
  }
  // Respaldo (navegadores viejos sin ReadableStream en fetch): tratar
  // como texto plano de una.
  const text = await res.text();
  return text.trim();
}

async function requestLLMInterpretation({ picked, positions, lang, question, spread, angle, responseType, ticketId }) {
  const RT = RESPONSE_TYPES[responseType] || RESPONSE_TYPES['1'];
  const profile = (window.getArcanaProfile && window.getArcanaProfile()) || { name: null, gender: null };
  const genderLine = window.arcanaGenderInstruction ? window.arcanaGenderInstruction(profile.gender, lang) : '';
  const nameLine = window.arcanaNameInstruction ? window.arcanaNameInstruction(profile.name, lang) : '';
  const cardsList = picked.map((p, i) => {
    const name = lang === 'es' ? p.card.name_es : p.card.name_en;
    const meaning = lang === 'es'
      ? (p.reversed ? p.card.reversed_es : p.card.upright_es)
      : (p.reversed ? p.card.reversed_en : p.card.upright_en);
    const kw = (lang === 'es' ? p.card.keywords_es : p.card.keywords_en).join(', ');
    const orientation = p.reversed
      ? (lang === 'es' ? 'invertida' : 'reversed')
      : (lang === 'es' ? 'al derecho' : 'upright');
    return `- Posición ${i + 1} (${positions[i]}): ${name} — ${orientation}. Palabras clave: ${kw}. Significado base: ${meaning}`;
  }).join('\n');

  const angleLine_es = angle ? `Esta vez, dale un tono ${angle}.` : '';
  const angleLine_en = angle ? `This time, give it a ${angle} tone.` : '';

  const prompt = lang === 'es'
    ? `Eres una persona experta en tarot, con voz cálida, honesta y algo poética. Escribes en español, en segunda persona ("tú"). Nada de emoji. Nada de titulares tipo "Introducción". Habla como quien conversa después de una taza de té. ${genderLine} ${nameLine}

Quien consulta hizo esta pregunta: ${question ? `"${question}"` : 'una pregunta silenciosa (sin especificar)'}

Sacamos esta tirada de tarot (${spread}):
${cardsList}

${RT.instr_es}

${angleLine_es}`
    : `You are an expert tarot reader with a warm, honest, slightly poetic voice. You write in English, in second person ("you"). No emoji. No section headings. Speak like someone conversing after a cup of tea.

The querent asked: ${question ? `"${question}"` : 'a silent question (unspecified)'}

We drew this ${spread} spread:
${cardsList}

${RT.instr_en}

${angleLine_en}`;

  const model = localStorage.getItem('arcana_setup_model') || undefined;
  const provider = localStorage.getItem('arcana_setup_provider') || undefined;
  const res = await fetch('/.netlify/functions/tarot-interpret', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt, maxTokens: RT.maxTokens, model, provider, ticketId, isFollowUp: false }),
  });
  if (!res.ok) {
    let detail = '';
    try {
      const errData = await res.json();
      detail = [errData.error, errData.detail].filter(Boolean).join(' — ');
    } catch (e) {}
    throw new Error(detail || 'llm request failed (' + res.status + ')');
  }
  return readTextStream(res);
}

async function requestFollowUpReply({ picked, extraCards, positions, lang, question, spread, interpretation, followUps, newQuestion, responseType, ticketId }) {
  const RT = RESPONSE_TYPES[responseType] || RESPONSE_TYPES['1'];
  const profile = (window.getArcanaProfile && window.getArcanaProfile()) || { name: null, gender: null };
  const genderLine = window.arcanaGenderInstruction ? window.arcanaGenderInstruction(profile.gender, lang) : '';
  const nameLine = window.arcanaNameInstruction ? window.arcanaNameInstruction(profile.name, lang) : '';
  const cardLine = (p, i, label) => {
    const name = lang === 'es' ? p.card.name_es : p.card.name_en;
    const meaning = lang === 'es'
      ? (p.reversed ? p.card.reversed_es : p.card.upright_es)
      : (p.reversed ? p.card.reversed_en : p.card.upright_en);
    const orientation = p.reversed
      ? (lang === 'es' ? 'invertida' : 'reversed')
      : (lang === 'es' ? 'al derecho' : 'upright');
    return `- ${label}: ${name} — ${orientation}. ${meaning}`;
  };
  const cardsList = picked.map((p, i) => cardLine(p, i, positions[i])).join('\n');
  const extraList = extraCards.map((p, i) => cardLine(p, i, p.label)).join('\n');
  const historyList = followUps.map((f, i) => (lang === 'es'
    ? `Pregunta ${i + 1}: ${f.question}\nRespuesta: ${f.answer}`
    : `Question ${i + 1}: ${f.question}\nAnswer: ${f.answer}`)).join('\n\n');

  const prompt = lang === 'es'
    ? `Eres la misma persona experta en tarot, cálida, de esta conversación. Escribes en español, en segunda persona, sin emoji ni titulares. ${genderLine} ${nameLine}

Tirada original (${spread}):
${cardsList}
${extraList ? `\nCartas adicionales sacadas durante la conversación:\n${extraList}\n` : ''}
Ya diste esta lectura inicial:
${interpretation ? (interpretation.llm || interpretation.base) : ''}
${historyList ? `\nConversación hasta ahora:\n${historyList}\n` : ''}
Quien consulta ahora pregunta: "${newQuestion}"

Respondé como la misma tarotista, en 1 a 3 párrafos, cálida, honesta y específica a la pregunta. ${RT.allowExtraCards ? 'Si de verdad hace falta más contexto para responder bien, podés invitarla a sacar una carta más.' : ''}`
    : `You are the same warm expert tarot reader from this conversation. You write in English, second person, no emoji or headings.

Original spread (${spread}):
${cardsList}
${extraList ? `\nExtra cards drawn during the conversation:\n${extraList}\n` : ''}
You already gave this initial reading:
${interpretation ? (interpretation.llm || interpretation.base) : ''}
${historyList ? `\nConversation so far:\n${historyList}\n` : ''}
The querent now asks: "${newQuestion}"

Reply as the same reader, in 1 to 3 paragraphs, warm, honest and specific to the question. ${RT.allowExtraCards ? 'If you genuinely need more context to answer well, you may invite them to draw one more card.' : ''}`;

  const model = localStorage.getItem('arcana_setup_model') || undefined;
  const provider = localStorage.getItem('arcana_setup_provider') || undefined;
  const res = await fetch('/.netlify/functions/tarot-interpret', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt, maxTokens: 900, model, provider, ticketId, isFollowUp: true }),
  });
  if (!res.ok) {
    let detail = '';
    try {
      const errData = await res.json();
      detail = [errData.error, errData.detail].filter(Boolean).join(' — ');
    } catch (e) {}
    throw new Error(detail || 'follow-up request failed (' + res.status + ')');
  }
  return readTextStream(res);
}

function buildShareText({ picked, positions, lang, question, spread, interpretation, t }) {
  const date = formatDate(new Date(), lang);
  const header = t.share_header.replace('{date}', date);
  const lines = [header, ''];
  if (question) lines.push(`"${question}"`, '');
  lines.push(getSpreadName(spread, t).toUpperCase(), '');
  picked.forEach((p, i) => {
    const name = lang === 'es' ? p.card.name_es : p.card.name_en;
    const orient = p.reversed
      ? (lang === 'es' ? ' (invertida)' : ' (reversed)')
      : '';
    lines.push(`${String(i + 1).padStart(2, '0')} · ${positions[i]} — ${name}${orient}`);
  });
  if (interpretation) {
    lines.push('', '—', '');
    lines.push(interpretation.llm || interpretation.base);
  }
  lines.push('', t.share_from_vela);
  return lines.join('\n');
}

// ============ Styles ============
function ReadingStyles() {
  return (
    <style>{`
      .reading-page { max-width: 1200px; }

      .flow-head {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        align-items: center;
        gap: 24px;
        margin-bottom: 64px;
      }
      .flow-back {
        justify-self: start;
        background: transparent;
        border: none;
        color: var(--ink-soft);
        font-family: 'Cinzel', serif;
        font-size: 11px;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        cursor: pointer;
        padding: 8px 0;
      }
      .flow-back:hover { color: var(--gold); }
      .flow-label {
        justify-self: end;
        font-family: 'Cinzel', serif;
        font-size: 10px;
        letter-spacing: 0.28em;
        text-transform: uppercase;
        color: var(--ink-mute);
      }
      .flow-steps { display: flex; align-items: center; }
      .flow-step { display: flex; align-items: center; }
      .flow-step-dot {
        width: 10px; height: 10px; border-radius: 50%;
        background: var(--bg-3);
        border: 1px solid var(--line);
        transition: all 0.3s;
      }
      .flow-step.is-done .flow-step-dot { background: var(--gold); border-color: var(--gold); }
      .flow-step.is-current .flow-step-dot { box-shadow: 0 0 0 4px rgba(212, 168, 90, 0.2); }
      .flow-step-line {
        width: 48px; height: 1px; background: var(--line);
        margin: 0 6px;
      }
      .flow-step.is-done .flow-step-line { background: var(--gold); }

      /* --- Question --- */
      .q-wrap {
        max-width: 640px;
        margin: 0 auto;
        text-align: center;
        padding: 32px 0;
      }
      .q-h { font-size: clamp(32px, 4vw, 48px); font-weight: 400; margin-bottom: 16px; }
      .q-sub { font-size: 19px; color: var(--ink-soft); margin-bottom: 40px; text-wrap: pretty; }
      .q-form textarea {
        width: 100%;
        min-height: 130px;
        background: rgba(15, 10, 36, 0.5);
        border: 1px solid var(--line);
        border-radius: 12px;
        padding: 20px 24px;
        color: var(--ink);
        font-family: 'Cormorant Garamond', serif;
        font-size: 22px;
        font-style: italic;
        line-height: 1.5;
        resize: vertical;
        text-align: center;
        transition: border-color 0.3s;
      }
      .q-form textarea:focus { outline: none; border-color: var(--gold); }
      .q-form textarea::placeholder { color: var(--ink-mute); }
      .q-hint {
        font-family: 'Cormorant Garamond', serif;
        font-style: italic;
        color: var(--ink-mute);
        margin: 24px 0 32px;
        font-size: 16px;
      }
      .q-actions {
        display: flex;
        gap: 16px;
        justify-content: center;
        flex-wrap: wrap;
      }
      .rt-options {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-top: 8px;
      }
      .rt-option {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 12px 16px;
        border: 1px solid var(--line);
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.2s;
        text-align: left;
      }
      .rt-option:hover { border-color: var(--gold); }
      .rt-option.is-selected { border-color: var(--gold); background: rgba(212, 168, 90, 0.06); }
      .rt-option input[type="radio"] { margin-top: 4px; accent-color: var(--gold); flex-shrink: 0; }
      .rt-option-label { display: block; font-family: 'Cinzel', serif; font-size: 14px; color: var(--ink); margin-bottom: 2px; }
      .rt-option-desc { display: block; color: var(--ink-soft); font-size: 14px; line-height: 1.4; }

      /* --- Shuffle (cleaner, single fanning deck) --- */
      .shuffle-wrap {
        text-align: center;
        padding: 32px 0;
      }
      .shuffle-sub { font-size: 19px; color: var(--ink-soft); margin-bottom: 20px; }
      .shuffle-question {
        font-size: 22px;
        color: var(--ink);
        margin-bottom: 40px;
        max-width: 600px;
        margin-left: auto;
        margin-right: auto;
      }
      .shuffle-stage {
        position: relative;
        width: 320px;
        height: 320px;
        margin: 20px auto;
        display: flex;
        justify-content: center;
        align-items: center;
      }
      .shuffle-card {
        position: absolute;
        width: 130px;
        aspect-ratio: 2 / 3;
        background-image: url('assets/cards/back.jpg');
        background-size: cover;
        background-position: center;
        border: 1.5px solid var(--gold);
        border-radius: 8px;
        box-shadow: 0 12px 28px -8px rgba(0, 0, 0, 0.6);
        animation: shufflePulse 3.6s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        animation-delay: var(--delay);
        transform-origin: center bottom;
      }
      @keyframes shufflePulse {
        0%   { transform: translateX(0)   rotate(0deg)   scale(1); opacity: 0.9; }
        25%  { transform: translateX(calc(-40px + var(--i) * 10px)) rotate(-8deg) scale(0.98); opacity: 1; }
        50%  { transform: translateX(0)   rotate(0deg)   scale(1); opacity: 0.8; }
        75%  { transform: translateX(calc(40px - var(--i) * 10px))  rotate(8deg)  scale(0.98); opacity: 1; }
        100% { transform: translateX(0)   rotate(0deg)   scale(1); opacity: 0.9; }
      }

      /* --- Pick --- */
      .pick-wrap { text-align: center; padding: 24px 0; }
      .pick-h { font-size: clamp(28px, 3.4vw, 40px); font-weight: 400; margin-bottom: 12px; }
      .pick-sub { font-size: 18px; color: var(--ink-soft); margin-bottom: 20px; }
      .pick-counter {
        display: inline-flex;
        align-items: baseline;
        gap: 8px;
        font-family: 'Cinzel', serif;
        color: var(--gold);
        letter-spacing: 0.15em;
        margin-bottom: 20px;
      }
      .pick-counter-n { font-size: 36px; }
      .pick-counter-sep { font-size: 20px; opacity: 0.5; }
      .pick-counter-total { font-size: 20px; opacity: 0.7; }
      .pick-counter-remaining {
        font-family: 'Cormorant Garamond', serif;
        font-style: italic;
        color: var(--ink-mute);
        font-size: 16px;
        letter-spacing: 0;
        margin-left: 12px;
      }

      /* Slot dots + labels along the top */
      .pick-slots {
        display: flex;
        gap: 8px;
        justify-content: center;
        margin: 16px 0 20px;
        flex-wrap: wrap;
      }
      .pick-slot {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        min-width: 88px;
        padding: 8px 10px;
        border-radius: 10px;
        border: 1px solid transparent;
        transition: all 0.3s;
      }
      .pick-slot-dot {
        width: 12px; height: 12px; border-radius: 50%;
        background: transparent;
        border: 1.5px solid var(--line-strong);
        transition: all 0.3s;
      }
      .pick-slot.is-filled .pick-slot-dot {
        background: var(--gold);
        border-color: var(--gold);
        box-shadow: 0 0 12px var(--gold-glow);
      }
      .pick-slot.is-current .pick-slot-dot {
        border-color: var(--gold);
        box-shadow: 0 0 0 4px rgba(212, 168, 90, 0.15);
      }
      .pick-slot-label {
        font-family: 'Cinzel', serif;
        font-size: 9px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--ink-mute);
      }
      .pick-slot.is-filled .pick-slot-label { color: var(--gold); }
      .pick-slot.is-current .pick-slot-label { color: var(--ink); }

      .pick-utility {
        display: flex;
        gap: 12px;
        justify-content: center;
        margin-bottom: 8px;
      }
      .btn-sm { padding: 8px 16px; font-size: 10px; letter-spacing: 0.18em; }
      .btn:disabled { opacity: 0.35; cursor: not-allowed; }
      .btn:disabled:hover { transform: none; box-shadow: none; background: transparent; color: var(--ink); border-color: var(--line-strong); }

      .pick-fan-scroll {
        width: 100%;
        overflow-x: auto;
        overflow-y: hidden;
        padding: 70px 24px 24px;
        margin: 32px auto 0;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: thin;
        scrollbar-color: var(--gold-deep) transparent;
      }
      .pick-fan-hint {
        text-align: center;
        font-family: 'Cormorant Garamond', serif;
        font-style: italic;
        color: var(--ink-mute);
        font-size: 14px;
        margin-top: -8px;
        letter-spacing: 0.02em;
      }
      .pick-fan {
        position: relative;
        height: 280px;
        display: flex;
        justify-content: center;
        align-items: center;
      }
      .pick-fan-card {
        position: absolute;
        width: 110px;
        aspect-ratio: 2 / 3;
        cursor: pointer;
        transition: transform 0.45s cubic-bezier(0.2, 0.7, 0.2, 1);
        transform-origin: bottom center;
      }
      .pick-fan-card:hover {
        transform: translateX(var(--x, 0)) translateY(-40px) rotate(0deg) scale(1.05) !important;
        z-index: 100 !important;
      }
      .pick-fan-card.is-chosen { opacity: 0.2; pointer-events: none; }
      .pick-fan-card-inner {
        width: 100%;
        height: 100%;
        background-image: url('assets/cards/back.jpg');
        background-size: cover;
        background-position: center;
        border: 1.5px solid var(--gold);
        border-radius: 8px;
        box-shadow: 0 12px 28px -8px rgba(0, 0, 0, 0.6);
        position: relative;
      }

      /* --- Reveal --- */
      .reading-reveal { max-width: 1160px; }
      .reveal-head { text-align: center; margin-bottom: 40px; }
      .reveal-h { font-size: clamp(32px, 4vw, 48px); font-weight: 400; margin: 12px 0; }
      .reveal-question {
        font-size: 22px;
        color: var(--ink-soft);
        max-width: 640px;
        margin: 12px auto 0;
        text-wrap: pretty;
      }

      .reveal-hint-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        max-width: 720px;
        margin: 0 auto 24px;
        padding: 10px 20px;
        border: 1px solid var(--line);
        border-radius: 40px;
        background: rgba(26, 20, 56, 0.3);
      }
      .reveal-hint {
        font-family: 'Cormorant Garamond', serif;
        font-size: 16px;
        color: var(--ink-soft);
      }

      .reveal-cards {
        display: grid;
        gap: 32px;
        margin-bottom: 48px;
      }
      .reveal-cards[data-count="1"] { grid-template-columns: minmax(0, 320px); justify-content: center; }
      .reveal-cards[data-count="3"] { grid-template-columns: repeat(3, 1fr); }
      .reveal-cards[data-count="4"] { grid-template-columns: repeat(4, 1fr); }
      .reveal-cards[data-count="5"] { grid-template-columns: repeat(5, 1fr); }
      .reveal-cards[data-count="6"] { grid-template-columns: repeat(3, 1fr); }
      .reveal-cards[data-count="12"] { grid-template-columns: repeat(4, 1fr); }
      .reveal-card-wrap {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 10px;
        animation: cardEntry 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
      }
      @keyframes cardEntry {
        from { opacity: 0; transform: translateY(30px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .reveal-card-pos {
        font-family: 'Cinzel', serif;
        font-size: 10px;
        letter-spacing: 0.22em;
        color: var(--gold);
        text-transform: uppercase;
      }
      .reveal-card {
        width: 100%;
        max-width: 200px;
        cursor: pointer;
        transition: transform 0.3s;
      }
      .reveal-card:not(.is-revealed):hover {
        transform: translateY(-6px) scale(1.02);
      }
      .reveal-card.is-revealed { cursor: default; }
      .reveal-card-name {
        font-family: 'Cinzel', serif;
        font-size: 13px;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        color: var(--ink);
        margin-top: 4px;
      }
      .reveal-card-reversed {
        font-family: 'Cormorant Garamond', serif;
        font-style: italic;
        color: var(--rose);
        text-transform: lowercase;
        letter-spacing: 0;
      }
      .reveal-card-meaning {
        font-size: 15px;
        color: var(--ink-soft);
        line-height: 1.45;
        max-width: 220px;
        text-wrap: pretty;
      }

      /* --- Celtic Cross layout --- */
      .celtic-layout {
        max-width: 100%;
        margin: 0 auto 48px;
        overflow-x: auto;
        padding: 24px 0;
      }
      .celtic-stage {
        position: relative;
        margin: 0 auto;
        min-width: 780px;
      }
      .celtic-slot {
        position: absolute;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        animation: cardEntry 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
      }
      .celtic-slot .reveal-card { max-width: 140px; }
      .celtic-slot.is-cross { transform: rotate(90deg); z-index: 2; }
      .celtic-slot-pos {
        font-family: 'Cinzel', serif;
        font-size: 9px;
        letter-spacing: 0.2em;
        color: var(--gold);
        text-transform: uppercase;
      }
      .celtic-slot-name {
        font-family: 'Cinzel', serif;
        font-size: 10px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--ink);
        text-align: center;
        max-width: 140px;
      }
      .celtic-slot.is-cross .celtic-slot-pos,
      .celtic-slot.is-cross .celtic-slot-name { display: none; }

      .celtic-meanings {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        margin-bottom: 48px;
      }
      .celtic-meaning-row {
        display: grid;
        grid-template-columns: 90px 1fr;
        gap: 14px;
        padding: 14px 16px;
        background: rgba(26, 20, 56, 0.4);
        border: 1px solid var(--line);
        border-radius: 10px;
      }
      .celtic-meaning-pos {
        font-family: 'Cinzel', serif;
        font-size: 10px;
        letter-spacing: 0.2em;
        color: var(--gold);
        text-transform: uppercase;
        align-self: start;
        padding-top: 3px;
      }
      .celtic-meaning-name {
        font-family: 'Cinzel', serif;
        font-size: 12px;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        margin-bottom: 4px;
      }
      .celtic-meaning-text {
        font-size: 15px;
        color: var(--ink-soft);
        line-height: 1.45;
        text-wrap: pretty;
      }

      /* --- Interpretation panel --- */
      .reveal-interp {
        padding: 40px 48px;
        border: 1px solid var(--line-strong);
        border-radius: 16px;
        background: linear-gradient(180deg, rgba(26, 20, 56, 0.5) 0%, rgba(15, 10, 36, 0.2) 100%);
      }
      .reveal-interp-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        margin-bottom: 20px;
        flex-wrap: wrap;
      }
      .reveal-regen {
        background: transparent;
        border: 1px solid var(--line);
        color: var(--ink-soft);
        font-family: 'Cinzel', serif;
        font-size: 10px;
        letter-spacing: 0.22em;
        text-transform: uppercase;
        padding: 8px 16px;
        border-radius: 30px;
        cursor: pointer;
        transition: all 0.25s;
      }
      .reveal-regen:hover {
        color: var(--gold);
        border-color: var(--gold);
        background: rgba(212, 168, 90, 0.06);
      }
      .reveal-interp-body {
        max-width: 680px;
        margin: 0 auto;
        text-align: left;
      }
      .reveal-interp-llm p {
        font-family: 'Cormorant Garamond', serif;
        font-size: 19px;
        line-height: 1.65;
        color: var(--ink);
        margin-bottom: 18px;
        text-wrap: pretty;
      }
      .reveal-interp-llm p:first-child::first-letter {
        font-family: 'Cinzel', serif;
        font-size: 3.2em;
        float: left;
        line-height: 0.85;
        padding: 6px 10px 0 0;
        color: var(--gold);
      }

      .reveal-thinking {
        font-size: 19px;
        color: var(--gold);
        padding: 24px 0;
        display: inline-flex;
        align-items: center;
      }
      .thinking-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--gold);
        margin: 0 3px;
        display: inline-block;
        animation: thinkPulse 1.4s ease-in-out infinite;
      }
      .thinking-dot:nth-child(2) { animation-delay: 0.2s; }
      .thinking-dot:nth-child(3) { animation-delay: 0.4s; }
      @keyframes thinkPulse {
        0%, 60%, 100% { opacity: 0.3; transform: scale(1); }
        30% { opacity: 1; transform: scale(1.4); }
      }

      .reveal-extra {
        margin-top: 24px;
        padding: 24px 32px;
        border: 1px solid var(--line);
        border-radius: 16px;
      }
      .reveal-extra-row {
        display: flex;
        gap: 20px;
        flex-wrap: wrap;
        justify-content: center;
        margin-top: 12px;
      }
      .reveal-followup {
        margin-top: 24px;
        padding: 24px 32px;
        border: 1px solid var(--line);
        border-radius: 16px;
      }
      .reveal-followup-item {
        margin-bottom: 18px;
        padding-bottom: 18px;
        border-bottom: 1px solid var(--line);
      }
      .reveal-followup-item:last-child {
        border-bottom: none;
      }
      .reveal-followup-q {
        font-family: 'Cinzel', serif;
        font-size: 12px;
        letter-spacing: 0.08em;
        color: var(--gold);
        margin-bottom: 8px;
      }
      .reveal-followup-a {
        font-family: 'Cormorant Garamond', serif;
        font-size: 18px;
        line-height: 1.6;
        color: var(--ink);
      }
      .reveal-followup-input textarea {
        width: 100%;
        min-height: 64px;
        resize: vertical;
      }
      .reveal-followup-actions {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
        margin-top: 12px;
        flex-wrap: wrap;
      }
      .reveal-followup-error {
        color: #d98a8a;
        font-size: 13px;
        margin-top: 10px;
      }
      .reveal-followup-done {
        text-align: center;
        color: var(--ink-soft);
      }
      .reveal-pdf {
        margin-top: 20px;
        display: flex;
        justify-content: center;
      }

      .reveal-actions-wrap {
        margin-top: 40px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 14px;
      }
      .reveal-actions {
        display: flex;
        gap: 14px;
        justify-content: center;
        flex-wrap: wrap;
      }
      .reveal-save-upsell {
        color: var(--ink-mute);
        font-size: 14px;
        text-align: center;
      }
      .reveal-save-upsell a { color: var(--gold); text-decoration: none; }
      .reveal-save-upsell a:hover { text-decoration: underline; }

      /* ===== Astral Rain (animación de espera durante la interpretación IA) ===== */
      .astral-rain {
        position: relative;
        width: 100%;
        min-height: 420px;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        border-radius: 16px;
        background: radial-gradient(ellipse at 50% 30%, rgba(212, 168, 90, 0.08) 0%, transparent 60%), var(--bg);
      }
      .astral-rain-field {
        position: absolute;
        inset: 0;
        overflow: hidden;
      }
      .astral-particle {
        position: absolute;
        top: -60px;
        color: var(--gold);
        opacity: 0;
        pointer-events: none;
        will-change: transform, opacity;
        animation-fill-mode: both;
      }
      @keyframes astralSwayA {
        0%   { transform: translateY(-8vh) translateX(0) rotate(0deg); opacity: 0; }
        6%   { opacity: var(--peak); }
        50%  { transform: translateY(58vh) translateX(calc(var(--sway) * 1)) rotate(160deg); }
        88%  { opacity: var(--peak); }
        100% { transform: translateY(128vh) translateX(calc(var(--sway) * -0.4)) rotate(320deg); opacity: 0; }
      }
      @keyframes astralSwayB {
        0%   { transform: translateY(-8vh) translateX(0) rotate(0deg); opacity: 0; }
        6%   { opacity: var(--peak); }
        45%  { transform: translateY(52vh) translateX(calc(var(--sway) * -1)) rotate(-140deg); }
        88%  { opacity: var(--peak); }
        100% { transform: translateY(128vh) translateX(calc(var(--sway) * 0.6)) rotate(-300deg); opacity: 0; }
      }
      @keyframes astralSwayC {
        0%   { transform: translateY(-8vh) translateX(0) rotate(0deg); opacity: 0; }
        6%   { opacity: var(--peak); }
        30%  { transform: translateY(34vh) translateX(calc(var(--sway) * 0.7)) rotate(90deg); }
        60%  { transform: translateY(76vh) translateX(calc(var(--sway) * -0.8)) rotate(200deg); }
        88%  { opacity: var(--peak); }
        100% { transform: translateY(128vh) translateX(calc(var(--sway) * 0.3)) rotate(340deg); opacity: 0; }
      }
      @keyframes astralSwayD {
        0%   { transform: translateY(-8vh) translateX(0) rotate(0deg); opacity: 0; }
        6%   { opacity: var(--peak); }
        55%  { transform: translateY(60vh) translateX(calc(var(--sway) * -0.6)) rotate(-110deg); }
        88%  { opacity: var(--peak); }
        100% { transform: translateY(128vh) translateX(calc(var(--sway) * 0.9)) rotate(-260deg); opacity: 0; }
      }
      @keyframes astralTwinkle {
        0%, 100% { filter: brightness(0.75); }
        50% { filter: brightness(1.35); }
      }
      .astral-comet {
        position: absolute;
        left: -14%;
        width: 130px;
        height: 3px;
        z-index: 6;
        animation-name: astralComet;
        animation-timing-function: linear;
        animation-fill-mode: both;
        pointer-events: none;
      }
      .astral-comet::before {
        content: '';
        position: absolute;
        right: 0;
        top: 50%;
        width: 9px;
        height: 9px;
        margin-top: -4px;
        border-radius: 50%;
        background: #fff8e8;
        box-shadow: 0 0 14px 4px rgba(255, 248, 232, 0.9);
      }
      .astral-comet::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(90deg, transparent 0%, rgba(212, 168, 90, 0.55) 100%);
        border-radius: 2px;
      }
      @keyframes astralComet {
        0%   { transform: translateX(0) translateY(0); opacity: 0; }
        8%   { opacity: 0.85; }
        92%  { opacity: 0.85; }
        100% { transform: translateX(128vw) translateY(6vh); opacity: 0; }
      }
      .astral-rain-center {
        position: relative;
        z-index: 4;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 22px;
      }
      .astral-rain-logo {
        width: 96px;
        height: 96px;
        object-fit: contain;
        border-radius: 50%;
        animation: astralBreathe 4.5s ease-in-out infinite;
      }
      @keyframes astralBreathe {
        0%, 100% { transform: scale(1); filter: drop-shadow(0 0 10px var(--gold-glow)); }
        50% { transform: scale(1.07); filter: drop-shadow(0 0 26px var(--gold-glow)); }
      }
      .astral-rain-status {
        color: var(--ink-soft);
        font-family: 'Cormorant Garamond', serif;
        font-size: 18px;
        letter-spacing: 0.02em;
        min-height: 26px;
        text-align: center;
      }

      @media (max-width: 900px) {
        .reveal-cards[data-count="3"] { grid-template-columns: 1fr; }
        .reveal-cards[data-count="4"] { grid-template-columns: repeat(2, 1fr); }
        .reveal-cards[data-count="5"] { grid-template-columns: repeat(2, 1fr); }
        .reveal-cards[data-count="6"] { grid-template-columns: repeat(2, 1fr); }
        .reveal-cards[data-count="12"] { grid-template-columns: repeat(3, 1fr); }
        .pick-fan { height: 230px; }
        .pick-fan-card { width: 80px; }
        .pick-fan-scroll { padding: 56px 16px 16px; }
        .celtic-meanings { grid-template-columns: 1fr; }
        .astral-rain { min-height: 320px; }
        .astral-rain-logo { width: 72px; height: 72px; }
        .astral-rain-status { font-size: 16px; }
      }
    `}</style>
  );
}

window.ReadingPage = ReadingPage;
