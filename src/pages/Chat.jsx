// Chat 1:1 with a tarotist (live session, mocked)
function ChatPage({ lang, setRoute, tarotistId }) {
  const t = window.I18N[lang];
  const variants = React.useContext(window.ArcanaVariantsCtx);
  const variant = variants?.chat || 'classic'; // classic | paper | minimal
  const tarotist =
    window.TAROTISTS.find((x) => x.id === tarotistId) || window.TAROTISTS[0];

  // Session state
  const [elapsed, setElapsed] = React.useState(0);          // seconds
  const [msgs, setMsgs] = React.useState(() => [
    {
      from: 'reader',
      at: Date.now() - 4000,
      text: t.chat_greeting,
    },
  ]);
  const [draft, setDraft] = React.useState('');
  const [typing, setTyping] = React.useState(false);
  const [cardPickerOpen, setCardPickerOpen] = React.useState(false);
  const listRef = React.useRef(null);

  // ---------- Voz: escuchar los mensajes de la tarotista (ElevenLabs) ----------
  const voiceOn = !!(window.arcanaVoiceEnabled && window.arcanaVoiceEnabled());
  const [speakingIdx, setSpeakingIdx] = React.useState(null);
  const [speakLoadingIdx, setSpeakLoadingIdx] = React.useState(null);
  const speakAudioRef = React.useRef(null);
  const stopSpeaking = () => {
    if (speakAudioRef.current) {
      speakAudioRef.current.pause();
      speakAudioRef.current.currentTime = 0;
    }
    setSpeakingIdx(null);
  };
  const speakMsg = async (idx, text) => {
    if (speakingIdx === idx) { stopSpeaking(); return; }
    stopSpeaking();
    setSpeakLoadingIdx(idx);
    try {
      const url = await window.arcanaFetchSpeech(text);
      const audio = new Audio(url);
      speakAudioRef.current = audio;
      audio.onended = () => setSpeakingIdx((k) => (k === idx ? null : k));
      audio.onerror = () => setSpeakingIdx((k) => (k === idx ? null : k));
      setSpeakLoadingIdx(null);
      setSpeakingIdx(idx);
      await audio.play();
    } catch (e) {
      setSpeakLoadingIdx(null);
    }
  };
  React.useEffect(() => () => { if (speakAudioRef.current) speakAudioRef.current.pause(); }, []);

  // ---------- Dictado por voz para el campo de texto (Web Speech API, gratis) ----------
  const [dictating, setDictating] = React.useState(false);
  const dictationRef = React.useRef(null);
  const dictationSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  const toggleDictation = () => {
    if (dictating) {
      if (dictationRef.current) dictationRef.current.stop();
      return;
    }
    const rec = window.arcanaCreateDictation(lang, {
      onResult: (text) => setDraft((d) => (d ? d.trim() + ' ' + text : text)),
      onEnd: () => setDictating(false),
      onError: () => setDictating(false),
    });
    if (!rec) return;
    dictationRef.current = rec;
    setDictating(true);
    rec.start();
  };

  // Tick timer
  React.useEffect(() => {
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Auto-scroll
  React.useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [msgs, typing]);

  const mmss = (s) => {
    const m = Math.floor(s / 60), r = s % 60;
    return String(m).padStart(2, '0') + ':' + String(r).padStart(2, '0');
  };

  const scriptedReplies = lang === 'es' ? [
    'Respira. Cuéntame qué preguntabas cuando abriste el chat.',
    'Interesante. Quedémonos con esa carta un momento — ¿qué te dice esa imagen antes de que te la interprete?',
    'Voy a tomarme un instante para leerla contigo. Espera un momento.',
    'Lo que aparece es más suave de lo que temes. La carta pide pausa, no retirada.',
    '¿Quieres que barajemos una segunda para complementar, o dejamos que esta respire?',
  ] : [
    'Breathe. Tell me what you were asking when the chat opened.',
    'Interesting. Let\'s sit with that card a moment — what does the image say before I interpret it?',
    'Give me a moment to read it with you. One second.',
    'What appears is gentler than you fear. The card asks for pause, not retreat.',
    'Do you want us to shuffle a second one to complement, or let this one breathe?',
  ];
  const replyRef = React.useRef(0);

  const fallbackReply = () => {
    const reply = scriptedReplies[replyRef.current % scriptedReplies.length];
    replyRef.current++;
    return reply;
  };

  // Respuesta real por IA — misma función serverless que usa Reading.jsx.
  // Si falla (offline, sin deploy, sin API key), cae a las respuestas
  // guionadas de siempre. cardNote: nota opcional cuando el mensaje que
  // se está respondiendo fue compartir una carta, no texto.
  const requestReply = async (history, cardNote) => {
    const transcript = history
      .filter((m) => m.text || m.card)
      .map((m) => {
        const who = m.from === 'me' ? (lang === 'es' ? 'Consultante' : 'Querent') : 'Lux Astral';
        if (m.text) return `${who}: ${m.text}`;
        const cname = lang === 'es' ? m.card.name_es : m.card.name_en;
        return lang === 'es' ? `${who}: [compartió la carta: ${cname}]` : `${who}: [shared the card: ${cname}]`;
      })
      .join('\n');

    const profile = (window.getArcanaProfile && window.getArcanaProfile()) || { name: null, gender: null };
    const genderLine = window.arcanaGenderInstruction ? window.arcanaGenderInstruction(profile.gender, lang) : '';
    const nameLine = window.arcanaNameInstruction ? window.arcanaNameInstruction(profile.name, lang) : '';

    const prompt = lang === 'es'
      ? `Eres "Lux Astral — Live", una persona tarotista, experta y cálida, con ${tarotist.years} años de experiencia y estilo ${tarotist.style_es}. Estás en un chat en vivo 1:1 con quien consulta. Escribes en español, en segunda persona, tono cercano y honesto — nunca genérico ni new-age vacío. Nada de emoji. ${genderLine} ${nameLine} Respuestas cortas, como en un chat real: 1 a 3 frases, a veces con una pregunta de vuelta para profundizar. No firmes el mensaje ni repitas tu nombre.

Conversación hasta ahora:
${transcript}
${cardNote ? `\n${cardNote}` : ''}

Responde solo con tu próximo mensaje como Lux Astral, nada más.`
      : `You are "Lux Astral — Live", a warm expert tarot reader with ${tarotist.years} years of experience and a ${tarotist.style_en} style. You're in a live 1:1 chat with a querent. Write in English, second person, close and honest tone — never generic or empty new-age talk. No emoji. ${genderLine} ${nameLine} Short replies, like a real chat: 1 to 3 sentences, sometimes a question back to go deeper. Don't sign the message or repeat your name.

Conversation so far:
${transcript}
${cardNote ? `\n${cardNote}` : ''}

Reply with only your next message as Lux Astral, nothing else.`;

    const model = localStorage.getItem('arcana_setup_model') || undefined;
    const provider = localStorage.getItem('arcana_setup_provider') || undefined;
    const res = await fetch('/.netlify/functions/tarot-interpret', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt, maxTokens: 220, model, provider }),
    });
    if (!res.ok) throw new Error('chat reply failed (' + res.status + ')');
    const data = await res.json();
    const text = typeof data.text === 'string' ? data.text.trim() : '';
    if (!text) throw new Error('empty reply');
    return text;
  };

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    const nextMsgs = [...msgs, { from: 'me', at: Date.now(), text }];
    setMsgs(nextMsgs);
    setDraft('');
    setTimeout(() => setTyping(true), 500);
    requestReply(nextMsgs)
      .catch(() => fallbackReply())
      .then((reply) => {
        setTyping(false);
        setMsgs((m) => [...m, { from: 'reader', at: Date.now(), text: reply }]);
      });
  };

  const sendCard = (card) => {
    const nextMsgs = [...msgs, { from: 'me', at: Date.now(), card }];
    setMsgs(nextMsgs);
    setCardPickerOpen(false);
    setTimeout(() => setTyping(true), 500);
    const cname = lang === 'es' ? card.name_es : card.name_en;
    const cardNote = lang === 'es'
      ? `(Quien consulta acaba de compartir la carta "${cname}" sin escribir nada más — reacciona a esa carta puntualmente y preguntale qué sintió al elegirla.)`
      : `(The querent just shared the card "${cname}" without writing anything else — react to that specific card and ask what they felt choosing it.)`;
    requestReply(nextMsgs, cardNote)
      .catch(() => {
        const name = lang === 'es' ? card.name_es : card.name_en;
        return lang === 'es'
          ? `Ah — ${name}. Cuéntame qué sentiste al elegirla.`
          : `Ah — ${name}. Tell me what you felt when you picked it.`;
      })
      .then((reply) => {
        setTyping(false);
        setMsgs((m) => [...m, { from: 'reader', at: Date.now(), text: reply }]);
      });
  };

  const majors = window.TAROT_CARDS.major.slice(0, 12);

  return (
    <div className={`chat-shell chat-v-${variant}`}>
      {/* Top bar */}
      <header className="chat-top">
        <button className="chat-back-btn" onClick={() => setRoute({ page: 'marketplace' })}>
          ← {t.chat_back}
        </button>
        <div className="chat-partner">
          <div className="chat-avatar" style={{ background: `radial-gradient(circle at 30% 30%, ${tarotist.color}, ${tarotist.color}55)` }}>
            {tarotist.initials}
          </div>
          <div>
            <div className="chat-partner-name">{tarotist.name}</div>
            <div className="chat-partner-status">
              <span className="dot online-dot" /> {t.chat_online} ·{' '}
              <span className="italic">{lang === 'es' ? tarotist.style_es : tarotist.style_en}</span>
            </div>
          </div>
        </div>
        <div className="chat-timer">
          <div className="chat-timer-label eyebrow">{t.chat_session_h}</div>
          <div className="chat-timer-clock">{mmss(elapsed)}</div>
        </div>
      </header>

      {/* Message list */}
      <div className="chat-messages" ref={listRef}>
        <div className="chat-day-sep">
          <span>{t.chat_disclaimer}</span>
        </div>
        {msgs.map((m, i) => (
          <div key={i} className={`chat-row ${m.from === 'me' ? 'me' : 'them'}`}>
            {m.from === 'reader' && (
              <div className="chat-avatar chat-avatar-sm" style={{ background: `radial-gradient(circle at 30% 30%, ${tarotist.color}, ${tarotist.color}55)` }}>
                {tarotist.initials}
              </div>
            )}
            <div className="chat-bubble">
              {m.card ? (
                <div className="chat-shared-card">
                  <div className="chat-shared-card-art"
                       style={{ backgroundImage: `url('assets/tarot-${['moon','sun'][i % 2]}.jpg')` }} />
                  <div className="chat-shared-card-body">
                    <div className="chat-shared-card-eyebrow eyebrow">
                      {lang === 'es' ? 'Carta compartida' : 'Card shared'}
                    </div>
                    <div className="chat-shared-card-name">
                      {lang === 'es' ? m.card.name_es : m.card.name_en}
                    </div>
                    <div className="chat-shared-card-quote italic">
                      "{lang === 'es' ? m.card.upright_es : m.card.upright_en}"
                    </div>
                  </div>
                </div>
              ) : (
                <div className="chat-text">{m.text}</div>
              )}
              <div className="chat-time">
                {new Date(m.at).toLocaleTimeString(lang === 'es' ? 'es' : 'en', { hour: '2-digit', minute: '2-digit' })}
                {voiceOn && m.from === 'reader' && m.text && (
                  <button
                    className="chat-icon-btn"
                    style={{ width: 22, height: 22, fontSize: 11, marginLeft: 8, verticalAlign: 'middle' }}
                    onClick={() => speakMsg(i, m.text)}
                    disabled={speakLoadingIdx === i}
                    title={lang === 'es' ? 'Escuchar' : 'Listen'}
                    aria-label={lang === 'es' ? 'Escuchar' : 'Listen'}
                  >
                    {speakingIdx === i ? '⏹' : speakLoadingIdx === i ? '…' : '🔊'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {typing && (
          <div className="chat-row them">
            <div className="chat-avatar chat-avatar-sm" style={{ background: `radial-gradient(circle at 30% 30%, ${tarotist.color}, ${tarotist.color}55)` }}>
              {tarotist.initials}
            </div>
            <div className="chat-bubble chat-bubble-typing">
              <span className="dot-a" /><span className="dot-a" /><span className="dot-a" />
              <span className="chat-typing-label italic">{t.chat_typing}</span>
            </div>
          </div>
        )}
      </div>

      {/* Card picker overlay */}
      {cardPickerOpen && (
        <div className="chat-cardpicker" onClick={() => setCardPickerOpen(false)}>
          <div className="chat-cardpicker-inner" onClick={(e) => e.stopPropagation()}>
            <div className="eyebrow" style={{ marginBottom: 20, textAlign: 'center' }}>{t.chat_pick_card}</div>
            <div className="chat-cardpicker-grid">
              {majors.map((c, i) => (
                <button
                  key={i}
                  className="chat-cardpicker-card"
                  style={{ backgroundImage: `url('assets/tarot-${i % 2 === 0 ? 'sun' : 'moon'}.jpg')` }}
                  onClick={() => sendCard(c)}
                  title={lang === 'es' ? c.name_es : c.name_en}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Composer */}
      <footer className="chat-composer">
        <button
          className="chat-icon-btn"
          onClick={() => setCardPickerOpen(true)}
          title={t.chat_send_card}
          aria-label={t.chat_send_card}
        >✦</button>
        <input
          className="chat-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t.chat_placeholder}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
        />
        {dictationSupported && (
          <button
            className="chat-icon-btn"
            onClick={toggleDictation}
            title={lang === 'es' ? 'Dictar por voz' : 'Dictate by voice'}
            aria-label={lang === 'es' ? 'Dictar por voz' : 'Dictate by voice'}
            style={dictating ? { color: 'var(--gold)', borderColor: 'var(--gold)' } : undefined}
          >{dictating ? '●' : '🎙'}</button>
        )}
        <button
          className="chat-video-btn"
          onClick={() => setRoute({ page: 'videocall', tarotistId: tarotist.id })}
          title={lang === 'es' ? 'Ir a videollamada' : 'Switch to video'}
          aria-label={lang === 'es' ? 'Ir a videollamada' : 'Switch to video'}
        >⌕</button>
        <button className="btn btn-primary chat-send-btn" onClick={send} disabled={!draft.trim()}>
          {t.chat_send}
        </button>
      </footer>

      <style>{`
        .chat-shell {
          position: relative;
          max-width: 900px;
          margin: 0 auto;
          height: calc(100vh - 90px);
          display: flex;
          flex-direction: column;
          padding: 24px 24px 20px;
          gap: 16px;
        }
        .chat-top {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 20px;
          padding: 16px 20px;
          background: rgba(26, 20, 56, 0.55);
          border: 1px solid var(--line);
          border-radius: 14px;
          backdrop-filter: blur(20px);
        }
        .chat-back-btn {
          justify-self: start;
          background: transparent;
          border: none;
          color: var(--ink-soft);
          cursor: pointer;
          font-family: 'Cinzel', serif;
          font-size: 10px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          padding: 6px 12px;
          border-radius: 30px;
        }
        .chat-back-btn:hover { color: var(--gold); background: rgba(212,168,90,0.06); }
        .chat-partner { display: flex; align-items: center; gap: 12px; }
        .chat-avatar {
          width: 44px; height: 44px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Cinzel', serif;
          color: var(--bg);
          font-size: 13px;
          letter-spacing: 0.1em;
          border: 1px solid rgba(255,255,255,0.15);
          flex-shrink: 0;
        }
        .chat-avatar-sm { width: 32px; height: 32px; font-size: 10px; }
        .chat-partner-name {
          font-family: 'Cinzel', serif;
          font-size: 14px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
        .chat-partner-status {
          font-size: 13px;
          color: var(--ink-soft);
          margin-top: 4px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .online-dot {
          display: inline-block;
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #7ac47a;
          box-shadow: 0 0 8px #7ac47a;
        }
        .chat-timer {
          justify-self: end;
          text-align: right;
        }
        .chat-timer-label { font-size: 9px !important; color: var(--ink-mute); }
        .chat-timer-clock {
          font-family: 'Cinzel', serif;
          font-size: 22px;
          letter-spacing: 0.14em;
          color: var(--gold);
          margin-top: 2px;
        }

        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 20px 8px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .chat-day-sep {
          text-align: center;
          font-size: 12px;
          color: var(--ink-mute);
          margin: 4px 0 8px;
          font-style: italic;
          letter-spacing: 0.02em;
        }
        .chat-row {
          display: flex;
          gap: 10px;
          align-items: flex-end;
          max-width: 78%;
        }
        .chat-row.them { align-self: flex-start; }
        .chat-row.me { align-self: flex-end; flex-direction: row-reverse; }
        .chat-bubble {
          padding: 12px 16px;
          border-radius: 14px;
          position: relative;
        }
        .chat-row.them .chat-bubble {
          background: rgba(26, 20, 56, 0.7);
          border: 1px solid var(--line);
          border-bottom-left-radius: 4px;
        }
        .chat-row.me .chat-bubble {
          background: linear-gradient(135deg, rgba(212, 168, 90, 0.18), rgba(212, 168, 90, 0.08));
          border: 1px solid var(--line-strong);
          border-bottom-right-radius: 4px;
        }
        .chat-text {
          font-family: 'Cormorant Garamond', serif;
          font-size: 17px;
          line-height: 1.45;
          color: var(--ink);
          text-wrap: pretty;
        }
        .chat-time {
          font-family: 'Cinzel', serif;
          font-size: 9px;
          letter-spacing: 0.14em;
          color: var(--ink-mute);
          text-transform: uppercase;
          margin-top: 6px;
          text-align: right;
        }
        .chat-bubble-typing {
          display: inline-flex;
          gap: 4px;
          align-items: center;
          padding: 14px 16px;
        }
        .chat-bubble-typing .dot-a {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: var(--gold);
          opacity: 0.4;
          animation: chatDot 1.4s infinite ease-in-out;
        }
        .chat-bubble-typing .dot-a:nth-child(2) { animation-delay: 0.15s; }
        .chat-bubble-typing .dot-a:nth-child(3) { animation-delay: 0.3s; }
        @keyframes chatDot {
          0%, 80%, 100% { opacity: 0.3; transform: translateY(0); }
          40% { opacity: 1; transform: translateY(-3px); }
        }
        .chat-typing-label { font-size: 13px; color: var(--ink-soft); margin-left: 6px; }

        .chat-shared-card {
          display: flex;
          gap: 14px;
          align-items: stretch;
          max-width: 340px;
        }
        .chat-shared-card-art {
          width: 74px;
          aspect-ratio: 2/3;
          background-size: cover;
          background-position: center;
          border: 1px solid var(--gold);
          border-radius: 4px;
          flex-shrink: 0;
        }
        .chat-shared-card-body { flex: 1; min-width: 0; }
        .chat-shared-card-eyebrow { font-size: 9px !important; margin-bottom: 6px; }
        .chat-shared-card-name {
          font-family: 'Cinzel', serif;
          font-size: 14px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--gold);
          margin-bottom: 6px;
        }
        .chat-shared-card-quote {
          font-size: 14px;
          line-height: 1.4;
          color: var(--ink-soft);
        }

        .chat-composer {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 16px;
          background: rgba(26, 20, 56, 0.7);
          border: 1px solid var(--line);
          border-radius: 40px;
          backdrop-filter: blur(20px);
        }
        .chat-icon-btn, .chat-video-btn {
          flex-shrink: 0;
          width: 40px; height: 40px;
          border-radius: 50%;
          border: 1px solid var(--line);
          background: transparent;
          color: var(--gold);
          font-family: 'Cinzel', serif;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .chat-icon-btn:hover, .chat-video-btn:hover { background: rgba(212,168,90,0.1); border-color: var(--gold); }
        .chat-input {
          flex: 1;
          background: transparent;
          border: none;
          color: var(--ink);
          font-family: 'Cormorant Garamond', serif;
          font-size: 17px;
          padding: 8px 4px;
        }
        .chat-input:focus { outline: none; }
        .chat-input::placeholder { color: var(--ink-mute); font-style: italic; }
        .chat-send-btn {
          padding: 12px 22px !important;
          border-radius: 30px !important;
        }
        .chat-send-btn:disabled { opacity: 0.4; pointer-events: none; }

        .chat-cardpicker {
          position: fixed;
          inset: 0;
          background: rgba(5, 3, 15, 0.85);
          backdrop-filter: blur(10px);
          z-index: 200;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          animation: fadeIn 0.25s ease;
        }
        .chat-cardpicker-inner {
          background: var(--bg-2);
          border: 1px solid var(--line-strong);
          border-radius: 20px;
          padding: 32px;
          max-width: 720px;
          max-height: 80vh;
          overflow-y: auto;
        }
        .chat-cardpicker-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 12px;
        }
        .chat-cardpicker-card {
          aspect-ratio: 2/3;
          background-size: cover;
          background-position: center;
          border: 1px solid var(--gold);
          border-radius: 5px;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          background-color: transparent;
        }
        .chat-cardpicker-card:hover {
          transform: translateY(-4px) scale(1.03);
          box-shadow: 0 12px 24px -8px rgba(212, 168, 90, 0.4);
        }

        /* ── Variant: paper ─────────────────────────────────────
           Warmer, letter-like bubbles — feels handwritten. */
        .chat-v-paper .chat-row.them .chat-bubble {
          background: linear-gradient(180deg, rgba(240, 226, 192, 0.06) 0%, rgba(240, 226, 192, 0.02) 100%);
          border-color: var(--line-strong);
          border-radius: 14px 14px 14px 2px;
        }
        .chat-v-paper .chat-row.me .chat-bubble {
          background: linear-gradient(180deg, rgba(212, 168, 90, 0.22), rgba(212, 168, 90, 0.10));
          border-color: rgba(212, 168, 90, 0.55);
          border-radius: 14px 14px 2px 14px;
        }
        .chat-v-paper .chat-text {
          font-family: 'Cormorant Garamond', serif;
          font-style: italic;
          font-size: 18px;
          line-height: 1.55;
        }

        /* ── Variant: minimal ───────────────────────────────────
           Only a hairline under each message. No bubbles. */
        .chat-v-minimal .chat-row { max-width: 92%; align-items: flex-start; }
        .chat-v-minimal .chat-avatar-sm { display: none; }
        .chat-v-minimal .chat-bubble {
          background: transparent !important;
          border: none !important;
          border-radius: 0 !important;
          padding: 4px 0 12px !important;
          border-bottom: 1px solid var(--line) !important;
          min-width: 0;
          flex: 1;
        }
        .chat-v-minimal .chat-row.me .chat-bubble { text-align: right; }
        .chat-v-minimal .chat-text {
          font-size: 17px;
          color: var(--ink);
        }
        .chat-v-minimal .chat-row.them .chat-text::before {
          content: attr(data-who);
        }
        .chat-v-minimal .chat-row.me .chat-text {
          color: var(--gold);
        }
        .chat-v-minimal .chat-time {
          text-transform: uppercase;
          font-size: 9px;
        }
        .chat-v-minimal .chat-bubble-typing {
          border: none !important;
          background: transparent !important;
          padding: 8px 0 12px !important;
          border-bottom: 1px solid var(--line) !important;
        }

        /* Tablet */
        @media (max-width: 820px) {
          .chat-shell { padding: 16px; gap: 12px; }
          .chat-top { padding: 12px 14px; gap: 12px; }
          .chat-partner-name { font-size: 13px; }
          .chat-partner-status { font-size: 12px; }
          .chat-timer-clock { font-size: 18px; }
          .chat-cardpicker-grid { grid-template-columns: repeat(4, 1fr); }
        }

        /* Phone */
        @media (max-width: 640px) {
          .chat-shell {
            height: calc(100vh - 60px);
            padding: 10px 10px 12px;
            gap: 10px;
          }
          .chat-top {
            grid-template-columns: auto 1fr auto;
            gap: 10px;
            padding: 10px 12px;
            border-radius: 12px;
          }
          .chat-back-btn {
            justify-self: start;
            font-size: 0;
            padding: 6px 8px;
            color: var(--gold);
          }
          .chat-back-btn::before {
            content: '←';
            font-size: 20px;
            font-family: system-ui, sans-serif;
            letter-spacing: 0;
          }
          .chat-partner { min-width: 0; }
          .chat-partner-name {
            font-size: 12px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            max-width: 40vw;
          }
          .chat-partner-status { font-size: 11px; }
          .chat-partner-status .italic { display: none; }
          .chat-avatar { width: 36px; height: 36px; font-size: 11px; }
          .chat-timer-label { display: none; }
          .chat-timer-clock { font-size: 15px; }
          .chat-messages { padding: 12px 4px; gap: 12px; }
          .chat-row { max-width: 88%; }
          .chat-text { font-size: 16px; }
          .chat-shared-card { max-width: 260px; }
          .chat-shared-card-art { width: 60px; }
          .chat-shared-card-name { font-size: 12px; }
          .chat-shared-card-quote { font-size: 13px; }
          .chat-composer { padding: 10px 12px; gap: 8px; border-radius: 30px; }
          .chat-icon-btn, .chat-video-btn { width: 36px; height: 36px; font-size: 14px; }
          .chat-input { font-size: 16px; /* prevents iOS zoom */ }
          .chat-send-btn { padding: 10px 16px !important; font-size: 10px !important; }
          .chat-cardpicker { padding: 12px; }
          .chat-cardpicker-inner { padding: 20px; }
          .chat-cardpicker-grid { grid-template-columns: repeat(3, 1fr); gap: 8px; }
        }
      `}</style>
    </div>
  );
}

window.ChatPage = ChatPage;
