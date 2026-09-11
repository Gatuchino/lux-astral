// Carta rápida — modo ligero de una sola carta (idea #3 de la auditoría de
// producto, a pedido de Christian). A diferencia de la tirada "Carta del
// día" (spread: 'daily'), que pasa por pregunta → barajar → interpretación
// con IA como cualquier lectura completa, esta página es instantánea, sin
// pregunta, sin costo de IA (usa el significado estático que cards.js ya
// trae) y se puede repetir todas las veces que la usuaria quiera, sin
// tocar el cupo de lecturas gratis ni el flujo de pago.
function QuickCardPage({ lang, setRoute }) {
  const { TarotCard } = window;
  const t = window.I18N[lang];
  const es = lang === 'es';

  const [draw, setDraw] = React.useState(null); // { card, reversed } | null
  const [revealed, setRevealed] = React.useState(false);
  const [shareState, setShareState] = React.useState('idle'); // idle | busy | done | error

  const drawCard = () => {
    const all = window.TAROT_CARDS.all;
    const card = all[Math.floor(Math.random() * all.length)];
    const reversed = Math.random() < 0.28; // misma probabilidad que el resto de las lecturas
    setRevealed(false);
    setDraw({ card, reversed });
    // pequeño delay para que se vea el giro de la carta, igual que en las
    // demás lecturas (RevealSlot / TarotCard ya traen la animación 3D).
    window.setTimeout(() => setRevealed(true), 260);
  };

  const meaning = draw
    ? (draw.reversed
        ? (es ? draw.card.reversed_es : draw.card.reversed_en)
        : (es ? draw.card.upright_es : draw.card.upright_en))
    : null;
  const keywords = draw ? (es ? draw.card.keywords_es : draw.card.keywords_en) : null;

  const handleShareImage = async () => {
    if (!draw || shareState === 'busy') return;
    setShareState('busy');
    try {
      const dateLabel = new Date().toLocaleDateString(es ? 'es-CL' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' });
      const blob = await window.renderReadingShareCard({
        picked: [{ card: draw.card, reversed: draw.reversed }],
        positions: [es ? 'Carta rápida' : 'Quick card'],
        question: null,
        dateLabel,
        lang,
        logoSrc: 'assets/logo-mark.png',
      });
      const result = await window.shareOrDownloadImage(blob, `lux-astral-carta-rapida-${new Date().toISOString().slice(0, 10)}.png`, {
        title: 'Lux Astral',
        text: es ? 'Mi carta rápida en Lux Astral' : 'My quick card on Lux Astral',
      });
      setShareState(result === 'cancelled' ? 'idle' : 'done');
      if (result !== 'cancelled') window.setTimeout(() => setShareState('idle'), 2400);
    } catch (e) {
      setShareState('error');
      window.setTimeout(() => setShareState('idle'), 2800);
    }
  };

  return (
    <div className="page quickcard-page">
      <div className="page-head">
        <div className="eyebrow">— {es ? 'Modo ligero' : 'Quick mode'} —</div>
        <h1 className="page-title">{es ? 'Carta rápida' : 'Quick card'}</h1>
        <p className="page-sub italic">
          {es
            ? 'Sin preguntas, sin espera: una carta y su significado, al instante. Sacá las que quieras.'
            : 'No questions, no waiting: one card and its meaning, instantly. Draw as many as you like.'}
        </p>
      </div>

      <div className="quickcard-stage">
        {!draw ? (
          <button className="quickcard-back" onClick={drawCard} aria-label={es ? 'Sacar una carta' : 'Draw a card'}>
            <div className="quickcard-back-inner">
              <span className="quickcard-back-glyph">✦</span>
              <span className="quickcard-back-label">{es ? 'Toca para sacar una carta' : 'Tap to draw a card'}</span>
            </div>
          </button>
        ) : (
          <div className="quickcard-result">
            <div className="quickcard-card-wrap">
              <TarotCard card={draw.card} lang={lang} revealed={revealed} reversed={draw.reversed} />
            </div>
            {revealed && (
              <div className="quickcard-info">
                <div className="quickcard-name">
                  {es ? draw.card.name_es : draw.card.name_en}
                  {draw.reversed && <span className="quickcard-reversed"> · {es ? 'invertida' : 'reversed'}</span>}
                </div>
                {keywords && keywords.length > 0 && (
                  <div className="quickcard-keywords">{keywords.join(' · ')}</div>
                )}
                <p className="quickcard-meaning italic">"{meaning}"</p>
                <div className="quickcard-actions">
                  <button className="btn btn-ghost" onClick={drawCard}>
                    {es ? '↻ Sacar otra' : '↻ Draw another'}
                  </button>
                  <button className="btn btn-ghost" onClick={handleShareImage} disabled={shareState === 'busy'}>
                    {shareState === 'busy'
                      ? (es ? 'Generando…' : 'Generating…')
                      : shareState === 'done'
                      ? `✓ ${es ? 'Listo' : 'Done'}`
                      : shareState === 'error'
                      ? (es ? 'No se pudo generar' : "Couldn't generate")
                      : `🖼 ${es ? 'Compartir imagen' : 'Share image'}`}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="quickcard-upsell">
        <p className="italic">
          {es
            ? '¿Querés que esta carta se conecte con una pregunta real y una interpretación completa?'
            : 'Want this card connected to a real question and a full interpretation?'}
        </p>
        <button className="btn btn-primary" onClick={() => setRoute({ page: 'readings' })}>
          {es ? 'Ver lecturas completas' : 'See full readings'} ✦
        </button>
      </div>

      <style>{`
        .quickcard-page { max-width: 640px; text-align: center; }
        .page-head { margin-bottom: 40px; }
        .page-title { font-size: clamp(36px, 5vw, 56px); font-weight: 400; margin-bottom: 12px; }
        .page-sub { font-size: 18px; color: var(--ink-soft); max-width: 480px; margin: 0 auto; }

        .quickcard-stage {
          display: flex;
          justify-content: center;
          align-items: flex-start;
          min-height: 320px;
          margin-bottom: 44px;
        }
        .quickcard-back {
          width: 220px;
          height: 340px;
          border-radius: 16px;
          border: 1px solid var(--line-strong);
          background:
            radial-gradient(circle at 50% 38%, rgba(212,168,90,0.16), transparent 60%),
            var(--bg-2);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          transition: transform 0.3s cubic-bezier(0.2,0.7,0.2,1), box-shadow 0.3s, border-color 0.3s;
        }
        .quickcard-back:hover {
          transform: translateY(-4px);
          border-color: var(--gold);
          box-shadow: 0 20px 44px -20px var(--gold-glow);
        }
        .quickcard-back-inner { display: flex; flex-direction: column; align-items: center; gap: 14px; }
        .quickcard-back-glyph { font-size: 36px; color: var(--gold); }
        .quickcard-back-label {
          font-family: 'Cinzel', serif;
          font-size: 11px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--ink-soft);
        }

        .quickcard-result { display: flex; flex-direction: column; align-items: center; gap: 28px; width: 100%; }
        .quickcard-card-wrap { width: 200px; }
        .quickcard-info { max-width: 480px; }
        .quickcard-name {
          font-family: 'Cinzel', serif;
          font-size: 22px;
          letter-spacing: 0.04em;
          color: var(--ink);
          margin-bottom: 8px;
        }
        .quickcard-reversed { color: var(--rose); font-size: 14px; letter-spacing: 0.1em; text-transform: uppercase; }
        .quickcard-keywords {
          font-size: 12px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--gold);
          margin-bottom: 16px;
        }
        .quickcard-meaning { font-size: 19px; color: var(--ink-soft); margin-bottom: 22px; }
        .quickcard-actions { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }

        .quickcard-upsell {
          border-top: 1px solid var(--line);
          padding-top: 32px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }
        .quickcard-upsell p { color: var(--ink-soft); font-size: 16px; max-width: 420px; }

        @media (max-width: 560px) {
          .quickcard-back { width: 180px; height: 280px; }
          .quickcard-card-wrap { width: 170px; }
        }
      `}</style>
    </div>
  );
}

window.QuickCardPage = QuickCardPage;
