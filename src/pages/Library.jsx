// Library — encyclopedia of all 78 cards (v2)
// Improvements over v1:
//  - Text search by name / keywords
//  - Keyboard nav in modal (← → to change card, Esc to close)
//  - Random card button
//  - Hover shows the name over the grid
//  - Major arcana grouped in three arcs (Beginnings / Trials / Transformations)
//  - Modal has prev/next buttons + position "3 / 22", element line, and a
//    short "when it appears" narrative built from the keywords
function LibraryPage({ lang }) {
  const { TarotCard } = window;
  const t = window.I18N[lang];
  const variants = React.useContext(window.ArcanaVariantsCtx);
  const variant = variants?.library || 'flow'; // flow | dense | editorial
  const [tab, setTab] = React.useState('major');
  const [suit, setSuit] = React.useState('cups');
  const [selected, setSelected] = React.useState(null); // card id
  const [query, setQuery] = React.useState('');

  const majorGroups = React.useMemo(() => ([
    { key: 'beginnings',      label: t.library_group_beginnings,      range: [0, 7] },
    { key: 'trials',          label: t.library_group_trials,          range: [8, 14] },
    { key: 'transformations', label: t.library_group_transformations, range: [15, 21] },
  ]), [t]);

  // Which cards are visible right now
  const visibleCards = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = tab === 'major'
      ? window.TAROT_CARDS.major
      : window.TAROT_CARDS.minor.filter((c) => c.suit === suit);
    if (!q) return base;
    return base.filter((c) => {
      const hay = [
        c.name_es, c.name_en,
        ...(c.keywords_es || []), ...(c.keywords_en || []),
      ].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [tab, suit, query]);

  // Full ordered list for prev/next inside the modal — respects current filter/tab
  const modalList = visibleCards;
  const selectedCard = selected != null
    ? window.TAROT_CARDS.all.find((c) => c.id === selected) || null
    : null;
  const selectedIdx = selectedCard ? modalList.findIndex((c) => c.id === selectedCard.id) : -1;

  const openCard = (c) => setSelected(c.id);
  const closeModal = React.useCallback(() => setSelected(null), []);
  const gotoDelta = React.useCallback((delta) => {
    if (!modalList.length) return;
    const cur = modalList.findIndex((c) => c.id === selected);
    const next = ((cur < 0 ? 0 : cur) + delta + modalList.length) % modalList.length;
    setSelected(modalList[next].id);
  }, [modalList, selected]);

  // ---------- Ver imagen en grande (lightbox sobre el modal) ----------
  const [zoomOpen, setZoomOpen] = React.useState(false);
  const closeZoom = React.useCallback(() => setZoomOpen(false), []);
  React.useEffect(() => { setZoomOpen(false); }, [selected]); // cambiar de carta cierra el zoom

  // Keyboard nav inside modal
  React.useEffect(() => {
    if (selected == null) return;
    const onKey = (e) => {
      if (e.key === 'Escape') { zoomOpen ? closeZoom() : closeModal(); return; }
      if (zoomOpen) return; // flechas navegan cartas solo con el zoom cerrado
      if (e.key === 'ArrowRight') { gotoDelta(1); }
      if (e.key === 'ArrowLeft')  { gotoDelta(-1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, gotoDelta, closeModal, zoomOpen, closeZoom]);

  const pickRandom = () => {
    const pool = window.TAROT_CARDS.all;
    const c = pool[Math.floor(Math.random() * pool.length)];
    if (c.id < 22) { setTab('major'); }
    else { setTab('minor'); setSuit(c.suit); }
    setQuery('');
    setSelected(c.id);
  };

  // Helper: derive element + "call" phrase for the modal narrative
  const elementFor = (c) => {
    if (c.id < 22) return t.library_element_ether;
    const map = {
      cups: t.library_element_water,
      wands: t.library_element_fire,
      swords: t.library_element_air,
      pentacles: t.library_element_earth,
    };
    return map[c.suit] || t.library_element_ether;
  };
  const callFor = (c) => {
    // deterministic pick per card id
    const opts = [t.library_call_beginning, t.library_call_pause, t.library_call_choose, t.library_call_release, t.library_call_arrive];
    return opts[c.id % opts.length];
  };

  const renderGridForRange = (range) => {
    const [a, b] = range;
    const items = visibleCards.filter((c) => c.id >= a && c.id <= b);
    if (!items.length) return null;
    return items.map((c) => (
      <button key={c.id} className="lib-item" onClick={() => openCard(c)} aria-label={lang === 'es' ? c.name_es : c.name_en}>
        <TarotCard card={c} lang={lang} revealed={true} compact={true} />
        <div className="lib-item-name">{lang === 'es' ? c.name_es : c.name_en}</div>
      </button>
    ));
  };

  return (
    <div className={`page library-page lib-v-${variant}`}>
      <div className="page-head">
        <div className="eyebrow">— {t.nav_library} —</div>
        <h1 className="page-title">{t.library_h}</h1>
        <p className="page-sub italic">{t.library_sub}</p>
        <a
          className="lib-book-link"
          href="Arcana - Mazo Completo.html"
          target="_blank"
          rel="noopener noreferrer"
        >
          {t.library_book_link} →
        </a>
      </div>

      {/* Controls: tabs + search + random */}
      <div className="lib-controls">
        <div className="lib-tabs">
          <button className={`lib-tab ${tab === 'major' ? 'is-active' : ''}`} onClick={() => setTab('major')}>
            {t.library_tab_major} <span className="lib-tab-count">— 22</span>
          </button>
          <button className={`lib-tab ${tab === 'minor' ? 'is-active' : ''}`} onClick={() => setTab('minor')}>
            {t.library_tab_minor} <span className="lib-tab-count">— 56</span>
          </button>
        </div>

        <div className="lib-search-wrap">
          <span className="lib-search-icon">✦</span>
          <input
            type="search"
            className="lib-search"
            placeholder={t.library_search_ph}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button className="lib-search-clear" onClick={() => setQuery('')} aria-label="clear">✕</button>
          )}
        </div>

        <button className="lib-random-btn" onClick={pickRandom} title={t.library_random}>
          <span className="lib-random-glyph">✦</span>
          <span className="lib-random-label">{t.library_random}</span>
        </button>
      </div>

      {tab === 'minor' && (
        <div className="lib-suits">
          {window.TAROT_CARDS.suits.map((s) => {
            const glyph = { cups: '♥', pentacles: '◈', swords: '⚔', wands: '⚝' }[s.key] || '✦';
            return (
              <button
                key={s.key}
                className={`lib-suit ${suit === s.key ? 'is-active' : ''}`}
                onClick={() => setSuit(s.key)}
              >
                <span className="lib-suit-glyph">{glyph}</span>
                <span className="lib-suit-name">{lang === 'es' ? s.name_es : s.name_en}</span>
                <span className="lib-suit-theme italic">{lang === 'es' ? s.theme_es : s.theme_en}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Grid — grouped for major, flat for minor */}
      {visibleCards.length === 0 ? (
        <div className="lib-empty italic">"{t.library_no_results}"</div>
      ) : tab === 'major' ? (
        majorGroups.map((g) => {
          const groupItems = visibleCards.filter((c) => c.id >= g.range[0] && c.id <= g.range[1]);
          if (!groupItems.length) return null;
          return (
            <section key={g.key} className="lib-group">
              <div className="lib-group-head">
                <div className="lib-group-eyebrow">
                  <span>{String(g.range[0]).padStart(2, '0')} — {String(g.range[1]).padStart(2, '0')}</span>
                  <span className="lib-group-label">{g.label}</span>
                </div>
                <div className="lib-group-rule" />
              </div>
              <div className="lib-grid">{renderGridForRange(g.range)}</div>
            </section>
          );
        })
      ) : (
        <div className="lib-grid">
          {visibleCards.map((c) => (
            <button key={c.id} className="lib-item" onClick={() => openCard(c)} aria-label={lang === 'es' ? c.name_es : c.name_en}>
              <TarotCard card={c} lang={lang} revealed={true} compact={true} />
              <div className="lib-item-name">{lang === 'es' ? c.name_es : c.name_en}</div>
            </button>
          ))}
        </div>
      )}

      <div className="lib-footer-count">
        {t.library_count_all.replace('{n}', visibleCards.length)}
      </div>

      {/* Modal */}
      {selectedCard && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal lib-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal} aria-label={t.card_close}>✕</button>

            {/* Prev/Next hovering arrows */}
            <button
              className="lib-modal-nav prev"
              onClick={() => gotoDelta(-1)}
              aria-label={t.library_prev_card}
              disabled={modalList.length < 2}
            >‹</button>
            <button
              className="lib-modal-nav next"
              onClick={() => gotoDelta(1)}
              aria-label={t.library_next_card}
              disabled={modalList.length < 2}
            >›</button>

            <div className="lib-modal-grid">
              <div
                className="lib-modal-card lib-modal-card-zoomable"
                onClick={() => setZoomOpen(true)}
                title={t.library_view_large}
              >
                <TarotCard card={selectedCard} lang={lang} revealed={true} />
                <div className="lib-modal-card-zoom-hint">⤢ {t.library_view_large}</div>
              </div>
              <div className="lib-modal-body">
                <div className="lib-modal-eyebrow-row">
                  <div className="eyebrow">
                    {selectedCard.id < 22
                      ? `${window.toRoman(selectedCard.id)} · ${t.library_tab_major}`
                      : `${t.library_tab_minor}`}
                  </div>
                  {selectedIdx >= 0 && (
                    <div className="lib-modal-pos">
                      {t.library_position
                        .replace('{i}', selectedIdx + 1)
                        .replace('{n}', modalList.length)}
                    </div>
                  )}
                </div>

                <h2 className="lib-modal-name">{lang === 'es' ? selectedCard.name_es : selectedCard.name_en}</h2>

                <div className="lib-modal-meta">
                  <div className="lib-modal-meta-item">
                    <span className="lib-modal-meta-l">{t.library_element}</span>
                    <span className="lib-modal-meta-v">{elementFor(selectedCard)}</span>
                  </div>
                </div>

                <div className="lib-modal-kw">
                  {(lang === 'es' ? selectedCard.keywords_es : selectedCard.keywords_en).map((k, i) => (
                    <span key={i} className="chip gold">{k}</span>
                  ))}
                </div>

                <div className="lib-modal-section">
                  <div className="lib-modal-section-h">{t.card_upright}</div>
                  <p className="italic">"{lang === 'es' ? selectedCard.upright_es : selectedCard.upright_en}"</p>
                </div>
                <div className="lib-modal-section">
                  <div className="lib-modal-section-h" style={{ color: 'var(--rose)' }}>{t.card_reversed}</div>
                  <p className="italic">"{lang === 'es' ? selectedCard.reversed_es : selectedCard.reversed_en}"</p>
                </div>

                <div className="lib-modal-section">
                  <div className="lib-modal-section-h">{t.library_when_appears}</div>
                  <p>
                    {t.library_when_upright
                      .replace('{kw}', (lang === 'es' ? selectedCard.keywords_es : selectedCard.keywords_en).join(', '))
                      .replace('{call}', callFor(selectedCard))}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox: imagen de la carta en grande, sobre el modal */}
      {zoomOpen && selectedCard && (
        <div className="img-lightbox-overlay" onClick={closeZoom}>
          <button className="modal-close img-lightbox-close" onClick={closeZoom} aria-label={t.card_close}>✕</button>
          <img
            className="img-lightbox-img"
            src={window.getCardArtUrl(selectedCard)}
            alt={lang === 'es' ? selectedCard.name_es : selectedCard.name_en}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <style>{`
        .library-page { max-width: 1400px; }
        .page-head { text-align: center; margin-bottom: 40px; }
        .page-head .eyebrow { margin-bottom: 16px; }
        .page-title { font-size: clamp(40px, 5vw, 64px); font-weight: 400; margin-bottom: 12px; }
        .page-sub { font-size: 20px; color: var(--ink-soft); }
        .lib-book-link {
          display: inline-block;
          margin-top: 16px;
          font-family: 'Cinzel', serif;
          font-size: 11px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--gold);
          text-decoration: none;
          border-bottom: 1px solid var(--line-strong);
          padding-bottom: 2px;
          transition: color 0.2s, border-color 0.2s;
        }
        .lib-book-link:hover { color: var(--ink); border-color: var(--gold); }

        /* Controls row */
        .lib-controls {
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 16px;
          align-items: center;
          margin-bottom: 24px;
          padding: 14px;
          background: rgba(26, 20, 56, 0.35);
          border: 1px solid var(--line);
          border-radius: 60px;
        }
        .lib-tabs {
          display: flex;
          gap: 4px;
        }
        .lib-tab {
          background: transparent;
          border: 1px solid transparent;
          color: var(--ink-soft);
          font-family: 'Cinzel', serif;
          font-size: 11px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          padding: 10px 18px;
          border-radius: 30px;
          cursor: pointer;
          transition: all 0.3s;
          white-space: nowrap;
        }
        .lib-tab:hover { color: var(--ink); }
        .lib-tab.is-active { background: var(--gold); color: var(--bg); border-color: var(--gold); }
        .lib-tab-count { opacity: 0.7; font-weight: 400; }
        .lib-tab.is-active .lib-tab-count { opacity: 0.8; }

        .lib-search-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .lib-search-icon {
          position: absolute;
          left: 18px;
          color: var(--gold);
          font-size: 12px;
          opacity: 0.7;
          pointer-events: none;
        }
        .lib-search {
          width: 100%;
          background: rgba(15, 10, 36, 0.5);
          border: 1px solid var(--line);
          border-radius: 30px;
          padding: 10px 40px 10px 40px;
          color: var(--ink);
          font-family: 'Cormorant Garamond', serif;
          font-size: 17px;
          font-style: italic;
          transition: border-color 0.2s;
        }
        .lib-search:focus {
          outline: none;
          border-color: var(--gold);
        }
        .lib-search::placeholder { color: var(--ink-mute); }
        .lib-search::-webkit-search-cancel-button { display: none; }
        .lib-search-clear {
          position: absolute;
          right: 12px;
          background: transparent;
          border: none;
          color: var(--ink-mute);
          cursor: pointer;
          padding: 6px 10px;
          border-radius: 20px;
          font-size: 14px;
        }
        .lib-search-clear:hover { color: var(--ink); }

        .lib-random-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: transparent;
          border: 1px solid var(--line-strong);
          color: var(--ink);
          font-family: 'Cinzel', serif;
          font-size: 10.5px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          padding: 10px 18px;
          border-radius: 30px;
          cursor: pointer;
          transition: all 0.25s;
          white-space: nowrap;
        }
        .lib-random-btn:hover {
          background: rgba(212, 168, 90, 0.06);
          border-color: var(--gold);
          color: var(--gold);
        }
        .lib-random-glyph { color: var(--gold); font-size: 14px; }

        /* Suit selector */
        .lib-suits {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 10px;
          margin-bottom: 32px;
        }
        .lib-suit {
          background: rgba(26, 20, 56, 0.4);
          border: 1px solid var(--line);
          color: var(--ink);
          padding: 16px 18px;
          border-radius: 12px;
          cursor: pointer;
          text-align: left;
          transition: all 0.3s;
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 4px 14px;
          align-items: start;
        }
        .lib-suit:hover { border-color: var(--line-strong); }
        .lib-suit.is-active { border-color: var(--gold); background: rgba(212, 168, 90, 0.08); }
        .lib-suit-glyph {
          font-family: 'Cinzel', serif;
          font-size: 22px;
          color: var(--gold);
          grid-row: 1 / 3;
          align-self: center;
          width: 32px;
          text-align: center;
        }
        .lib-suit-name {
          font-family: 'Cinzel', serif;
          font-size: 13px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }
        .lib-suit-theme {
          font-family: 'Cormorant Garamond', serif;
          font-size: 13px;
          letter-spacing: 0;
          text-transform: none;
          color: var(--ink-mute);
        }

        /* Groups (major arcana arcs) */
        .lib-group { margin-bottom: 40px; }
        .lib-group-head {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 18px;
        }
        .lib-group-eyebrow {
          display: inline-flex;
          gap: 14px;
          align-items: baseline;
          font-family: 'Cinzel', serif;
          font-size: 11px;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: var(--gold);
          white-space: nowrap;
        }
        .lib-group-label {
          color: var(--ink);
          font-size: 12px;
          letter-spacing: 0.22em;
        }
        .lib-group-rule {
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, var(--line-strong), transparent);
        }

        /* Grid — base (flow) */
        .lib-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
          gap: 18px;
        }
        .lib-item {
          background: transparent;
          border: none;
          padding: 0;
          cursor: pointer;
          position: relative;
          transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
          text-align: center;
        }
        .lib-item:hover { transform: translateY(-6px); }
        .lib-item-name {
          margin-top: 8px;
          font-family: 'Cinzel', serif;
          font-size: 9px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--ink-soft);
          opacity: 0;
          transform: translateY(-4px);
          transition: opacity 0.3s, transform 0.3s, color 0.3s;
          text-wrap: pretty;
          line-height: 1.35;
        }
        .lib-item:hover .lib-item-name,
        .lib-item:focus-visible .lib-item-name {
          opacity: 1;
          transform: translateY(0);
          color: var(--gold);
        }

        /* ── Variant: dense ─────────────────────────────────────
           Compact rows, name always visible under each card. */
        .lib-v-dense .lib-grid {
          grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
          gap: 12px 10px;
        }
        .lib-v-dense .lib-item-name {
          opacity: 1;
          transform: none;
          font-size: 8.5px;
          margin-top: 6px;
          color: var(--ink-mute);
          letter-spacing: 0.14em;
        }
        .lib-v-dense .lib-item:hover .lib-item-name { color: var(--gold); }
        .lib-v-dense .lib-group { margin-bottom: 30px; }

        /* ── Variant: editorial ─────────────────────────────────
           Larger cards, more air, index number visible. */
        .lib-v-editorial .lib-grid {
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 28px 24px;
        }
        .lib-v-editorial .lib-item {
          padding: 14px 12px 16px;
          border: 1px solid transparent;
          border-radius: 10px;
          transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1),
                      border-color 0.3s, background 0.3s;
        }
        .lib-v-editorial .lib-item:hover {
          transform: translateY(-4px);
          border-color: var(--line);
          background: rgba(26, 20, 56, 0.35);
        }
        .lib-v-editorial .lib-item-name {
          opacity: 1;
          transform: none;
          font-size: 10.5px;
          margin-top: 14px;
          color: var(--ink);
          letter-spacing: 0.2em;
        }
        .lib-v-editorial .lib-group { margin-bottom: 56px; }
        .lib-v-editorial .lib-group-head { margin-bottom: 28px; }

        .lib-empty {
          text-align: center;
          font-size: 22px;
          color: var(--ink-soft);
          padding: 80px 24px;
          border: 1px dashed var(--line);
          border-radius: 12px;
        }
        .lib-footer-count {
          text-align: center;
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid var(--line);
          font-family: 'Cinzel', serif;
          font-size: 10px;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: var(--ink-mute);
        }

        /* Modal — richer, with prev/next arrows */
        .lib-modal { max-width: 780px; padding: 40px 40px 36px; overflow: visible; }
        .lib-modal-grid { display: grid; grid-template-columns: 220px 1fr; gap: 40px; align-items: start; }
        .lib-modal-card { width: 220px; position: relative; }
        .lib-modal-card-zoomable { cursor: zoom-in; }
        .lib-modal-card-zoom-hint {
          position: absolute;
          left: 50%;
          bottom: -6px;
          transform: translate(-50%, 100%);
          white-space: nowrap;
          font-family: 'Cinzel', serif;
          font-size: 9px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--ink-soft);
          opacity: 0;
          transition: opacity 0.2s;
          pointer-events: none;
        }
        .lib-modal-card-zoomable:hover .lib-modal-card-zoom-hint { opacity: 1; }
        .img-lightbox-overlay {
          position: fixed;
          inset: 0;
          background: rgba(3, 2, 10, 0.92);
          backdrop-filter: blur(6px);
          z-index: 1100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
          cursor: zoom-out;
          animation: fadeIn 0.25s ease;
        }
        .img-lightbox-img {
          max-width: min(90vw, 640px);
          max-height: 90vh;
          width: auto;
          height: auto;
          border-radius: 12px;
          box-shadow: 0 30px 90px rgba(0, 0, 0, 0.6);
          cursor: default;
        }
        .img-lightbox-close {
          position: fixed;
          top: 20px;
          right: 24px;
          color: var(--ink);
          background: rgba(255, 255, 255, 0.06);
        }

        .lib-modal-eyebrow-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 12px;
          margin-bottom: 4px;
        }
        .lib-modal-pos {
          font-family: 'Cinzel', serif;
          font-size: 10px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--ink-mute);
        }
        .lib-modal-name { font-size: 32px; margin: 8px 0 14px; font-weight: 400; letter-spacing: 0.04em; }
        .lib-modal-meta {
          display: flex;
          gap: 20px;
          padding: 10px 0;
          border-top: 1px solid var(--line);
          border-bottom: 1px solid var(--line);
          margin-bottom: 18px;
        }
        .lib-modal-meta-item {
          display: inline-flex;
          align-items: baseline;
          gap: 10px;
        }
        .lib-modal-meta-l {
          font-family: 'Cinzel', serif;
          font-size: 10px;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: var(--ink-mute);
        }
        .lib-modal-meta-v {
          font-family: 'Cormorant Garamond', serif;
          font-style: italic;
          font-size: 16px;
          color: var(--gold);
        }
        .lib-modal-kw { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 24px; }
        .lib-modal-section { margin-bottom: 20px; }
        .lib-modal-section-h {
          font-family: 'Cinzel', serif;
          font-size: 10px;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: var(--gold);
          margin-bottom: 8px;
        }
        .lib-modal-section p { font-size: 17px; line-height: 1.55; color: var(--ink); text-wrap: pretty; }

        .lib-modal-nav {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(15, 10, 36, 0.9);
          border: 1px solid var(--line-strong);
          color: var(--ink);
          width: 44px;
          height: 44px;
          border-radius: 50%;
          cursor: pointer;
          font-family: 'Cinzel', serif;
          font-size: 24px;
          line-height: 1;
          transition: all 0.25s;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 0 3px;
        }
        .lib-modal-nav:hover:not(:disabled) {
          background: var(--gold);
          color: var(--bg);
          border-color: var(--gold);
        }
        .lib-modal-nav:disabled { opacity: 0.3; cursor: not-allowed; }
        .lib-modal-nav.prev { left: -22px; }
        .lib-modal-nav.next { right: -22px; }

        /* Tablet — collapse controls into stacked rows */
        @media (max-width: 820px) {
          .lib-controls {
            grid-template-columns: 1fr;
            border-radius: 22px;
            padding: 12px;
            gap: 10px;
          }
          .lib-tabs { justify-content: center; }
          .lib-random-btn { justify-content: center; }
          .lib-modal-grid { grid-template-columns: 1fr; gap: 24px; }
          .lib-modal { padding: 32px 24px 28px; max-width: 92vw; }
          .lib-modal-card { margin: 0 auto; width: 180px; }
          .lib-modal-nav.prev { left: 8px; }
          .lib-modal-nav.next { right: 8px; }
          .lib-modal-nav { width: 38px; height: 38px; font-size: 20px; }
          .lib-modal-name { font-size: 26px; }
          .lib-suits { grid-template-columns: repeat(2, 1fr); }
        }

        /* Phone — retitle head, shrink grid tiles, hide non-essentials */
        @media (max-width: 560px) {
          .library-page { padding-left: 16px; padding-right: 16px; }
          .page-head { text-align: left; margin-bottom: 28px; }
          .page-title { font-size: 34px; }
          .page-sub { font-size: 16px; }
          .lib-tab { padding: 8px 12px; font-size: 10px; }
          .lib-tab-count { display: none; }
          .lib-random-label { display: none; }
          .lib-random-btn { width: 44px; height: 44px; padding: 0; justify-content: center; }
          .lib-suits { grid-template-columns: 1fr 1fr; gap: 8px; }
          .lib-suit { padding: 12px; gap: 2px 10px; }
          .lib-suit-glyph { font-size: 18px; width: 24px; }
          .lib-suit-name { font-size: 11px; }
          .lib-suit-theme { font-size: 12px; }
          .lib-grid { grid-template-columns: repeat(auto-fill, minmax(88px, 1fr)); gap: 12px; }
          .lib-v-dense .lib-grid { grid-template-columns: repeat(3, 1fr); gap: 10px 8px; }
          .lib-v-editorial .lib-grid { grid-template-columns: 1fr 1fr; gap: 20px 14px; }
          .lib-v-editorial .lib-item { padding: 10px 8px 12px; }
          /* Names always visible on touch (no hover) */
          .lib-item-name { opacity: 1; transform: none; }
          .lib-group-head { flex-wrap: wrap; gap: 10px; }
          .lib-group-eyebrow { font-size: 10px; gap: 10px; }
          .lib-modal { padding: 24px 18px 22px; }
          .lib-modal-card { width: 150px; }
          .lib-modal-name { font-size: 22px; margin-top: 6px; }
          .lib-modal-section p { font-size: 15px; }
          .lib-modal-meta { flex-direction: column; gap: 6px; }
          .lib-search { font-size: 15px; padding: 9px 36px; }
        }
      `}</style>
    </div>
  );
}

window.LibraryPage = LibraryPage;
