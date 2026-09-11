// Blog editorial (idea #9 de la auditoria de marketing) -- lista de notas
// (BlogPage) y el detalle de una nota (BlogPostPage). El contenido vive en
// el store del servidor (store.blogPosts, ver netlify/functions/booking.mts)
// en vez de un archivo estatico -- asi las notas que genera solas el cron
// semanal (weekly-blog-cron.mts, todos los viernes 10am hora Chile) aparecen
// sin necesidad de un deploy nuevo. Sigue el patron "autocontenido por
// archivo" del resto del sitio (CSS propio, sin depender de clases
// globales de otras paginas).

function blogPostsSorted(list) {
  const arr = (list || []).slice();
  arr.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return arr;
}

function blogDateLabel(dateStr, lang) {
  try {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString(lang === 'es' ? 'es-CL' : 'en-US', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch (e) {
    return dateStr;
  }
}

// Imagen del banco de recursos de tarot (las mismas que se usan en las
// respuestas de lectura): la carta real (assets/cards/) para las notas de
// "un arcano por semana", o un icono ornamental tematico (assets/reading-icons/)
// para el resto. `size` decide si es la miniatura de la tarjeta de lista
// o el hero grande de la nota abierta.
function BlogImage({ post, lang, size }) {
  if (!post || !post.image) return null;
  const alt = (post.imageAlt && (post.imageAlt[lang] || post.imageAlt.es)) || '';
  const isCard = post.imageKind === 'card';
  return (
    <div className={`blog-img-frame blog-img-frame-${size} ${isCard ? 'is-card' : 'is-icon'}`}>
      <img src={post.image} alt={alt} className={isCard ? 'blog-img-card' : 'blog-img-icon'} loading="lazy" />
    </div>
  );
}

function useBlogPosts() {
  const [posts, setPosts] = React.useState(null); // null = cargando
  const [error, setError] = React.useState('');
  React.useEffect(() => {
    window.arcanaBlogPosts()
      .then((data) => setPosts(data.posts || []))
      .catch((e) => setError(e.message || 'No se pudieron cargar las notas.'));
  }, []);
  return { posts, error };
}

function BlogPage({ lang, setRoute }) {
  const t = window.I18N[lang];
  const { posts, error } = useBlogPosts();
  const sorted = posts ? blogPostsSorted(posts) : null;

  return (
    <div className="page blog-page">
      <div className="page-head">
        <div className="eyebrow">{t.blog_eyebrow}</div>
        <h1 className="page-title">{t.blog_h}</h1>
        <p className="page-sub italic">{t.blog_sub}</p>
      </div>

      {error && <p style={{ textAlign: 'center', color: '#e08080' }}>{error}</p>}
      {!error && sorted === null && (
        <p className="italic" style={{ textAlign: 'center', color: 'var(--ink-mute)' }}>
          {lang === 'es' ? 'Cargando…' : 'Loading…'}
        </p>
      )}
      {!error && sorted && sorted.length === 0 && (
        <p className="italic" style={{ textAlign: 'center', color: 'var(--ink-mute)' }}>{t.blog_empty}</p>
      )}

      {sorted && sorted.length > 0 && (
        <div className="blog-grid">
          {sorted.map((p) => {
            const c = p[lang] || p.es;
            return (
              <article key={p.slug} className="blog-card" onClick={() => setRoute({ page: 'blogpost', slug: p.slug })}>
                <BlogImage post={p} lang={lang} size="card" />
                <div className="blog-card-body">
                  <div className="blog-card-meta">
                    <span className="blog-tag">{c.tag}</span>
                    <span className="blog-dot">·</span>
                    <span>{blogDateLabel(p.date, lang)}</span>
                  </div>
                  <h2 className="blog-card-title">{c.title}</h2>
                  <p className="blog-card-dek">{c.dek}</p>
                  <div className="blog-card-cta">
                    {t.blog_read_more} → <span className="blog-card-time">{(p.readMin && (p.readMin[lang] || p.readMin.es)) || 4} {t.blog_min_read}</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <style>{`
        .blog-page { max-width: 960px; }
        .blog-grid {
          display: flex;
          flex-direction: column;
          gap: 22px;
          margin-top: 48px;
        }
        .blog-card {
          display: flex;
          gap: 0;
          border: 1px solid var(--line);
          border-radius: 14px;
          background: rgba(26, 20, 56, 0.28);
          cursor: pointer;
          overflow: hidden;
          transition: border-color 0.2s ease, transform 0.2s ease;
        }
        .blog-card:hover {
          border-color: var(--gold);
          transform: translateY(-2px);
        }
        .blog-card-body {
          padding: 24px 28px;
          flex: 1;
          min-width: 0;
        }
        .blog-card-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: 'Cinzel', serif;
          font-size: 11px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--gold);
          margin-bottom: 12px;
        }
        .blog-dot { color: var(--ink-mute); }
        .blog-card-title {
          font-family: 'Cinzel', serif;
          font-size: clamp(19px, 2.2vw, 24px);
          font-weight: 500;
          letter-spacing: 0.01em;
          color: var(--ink);
          margin: 0 0 10px;
          text-wrap: balance;
        }
        .blog-card-dek {
          font-size: 15px;
          line-height: 1.55;
          color: var(--ink-soft);
          margin: 0 0 16px;
        }
        .blog-card-cta {
          font-size: 13px;
          color: var(--gold);
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .blog-card-time { color: var(--ink-mute); }

        /* ---- Imagen: card art (retrato real) vs icono ornamental ---- */
        .blog-img-frame {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }
        .blog-img-frame-card {
          width: 150px;
          background: radial-gradient(circle at 50% 35%, rgba(212,168,90,0.16), rgba(15,10,36,0.55) 70%);
        }
        .blog-img-frame-card.is-card { padding: 16px 12px; }
        .blog-img-card {
          width: 100%;
          height: 100%;
          object-fit: contain;
          border-radius: 8px;
          box-shadow: 0 8px 28px rgba(0,0,0,0.45);
        }
        .blog-img-frame-card.is-icon {
          background: radial-gradient(circle at 50% 45%, rgba(212,168,90,0.22), rgba(15,10,36,0.5) 72%);
        }
        .blog-img-icon {
          width: 92px;
          height: 92px;
          object-fit: contain;
          filter: drop-shadow(0 6px 18px rgba(212,168,90,0.25));
        }
        @media (max-width: 640px) {
          .blog-card { flex-direction: column; }
          .blog-img-frame-card { width: 100%; height: 140px; }
          .blog-card-body { padding: 20px; }
        }
      `}</style>
    </div>
  );
}

function BlogPostPage({ lang, setRoute, slug }) {
  const t = window.I18N[lang];
  const es = lang === 'es';
  const { posts, error } = useBlogPosts();
  const post = posts ? posts.find((p) => p.slug === slug) : null;

  React.useEffect(() => { window.scrollTo({ top: 0 }); }, [slug]);

  if (error) {
    return (
      <div className="page blog-post-page">
        <p style={{ textAlign: 'center', color: '#e08080' }}>{error}</p>
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <button className="btn btn-ghost" onClick={() => setRoute({ page: 'blog' })}>← {t.blog_back}</button>
        </div>
        <style>{BLOG_POST_STYLES}</style>
      </div>
    );
  }

  if (posts === null) {
    return (
      <div className="page blog-post-page">
        <p className="italic" style={{ textAlign: 'center', color: 'var(--ink-mute)' }}>
          {es ? 'Cargando…' : 'Loading…'}
        </p>
        <style>{BLOG_POST_STYLES}</style>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="page blog-post-page">
        <p className="italic" style={{ textAlign: 'center', color: 'var(--ink-mute)' }}>{t.blog_empty}</p>
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <button className="btn btn-ghost" onClick={() => setRoute({ page: 'blog' })}>← {t.blog_back}</button>
        </div>
        <style>{BLOG_POST_STYLES}</style>
      </div>
    );
  }

  const c = post[lang] || post.es;
  const others = blogPostsSorted(posts).filter((p) => p.slug !== post.slug).slice(0, 3);

  return (
    <div className="page blog-post-page">
      <button className="blog-back-link" onClick={() => setRoute({ page: 'blog' })}>← {t.blog_back}</button>

      <article className="blog-post">
        <BlogImage post={post} lang={lang} size="hero" />
        <div className="blog-post-meta">
          <span className="blog-tag">{c.tag}</span>
          <span className="blog-dot">·</span>
          <span>{blogDateLabel(post.date, lang)}</span>
          <span className="blog-dot">·</span>
          <span>{(post.readMin && (post.readMin[lang] || post.readMin.es)) || 4} {t.blog_min_read}</span>
        </div>
        <h1 className="blog-post-title">{c.title}</h1>
        <p className="blog-post-dek italic">{c.dek}</p>
        <div className="blog-post-body">
          {c.body.map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      </article>

      <div className="blog-post-cta">
        <h3>{t.blog_cta_h}</h3>
        <p className="italic">{t.blog_cta_body}</p>
        <button className="btn btn-primary btn-lg" onClick={() => setRoute({ page: 'readings' })}>
          {es ? 'Empezar una lectura' : 'Begin a reading'} ✦
        </button>
      </div>

      {others.length > 0 && (
        <div className="blog-more">
          <div className="eyebrow" style={{ marginBottom: 18 }}>{es ? '— Más notas —' : '— More notes —'}</div>
          <div className="blog-more-grid">
            {others.map((p) => {
              const oc = p[lang] || p.es;
              return (
                <button key={p.slug} className="blog-more-card" onClick={() => setRoute({ page: 'blogpost', slug: p.slug })}>
                  <BlogImage post={p} lang={lang} size="mini" />
                  <span className="blog-more-body">
                    <span className="blog-tag">{oc.tag}</span>
                    <span className="blog-more-title">{oc.title}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <style>{BLOG_POST_STYLES}</style>
    </div>
  );
}

const BLOG_POST_STYLES = `
  .blog-post-page { max-width: 760px; }
  .blog-back-link {
    background: none;
    border: none;
    color: var(--gold);
    font-size: 13px;
    cursor: pointer;
    padding: 0;
    margin-bottom: 32px;
  }
  .blog-post-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: 'Cinzel', serif;
    font-size: 11px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--gold);
    margin: 28px 0 18px;
  }
  .blog-tag {
    padding: 3px 10px;
    border: 1px solid var(--gold);
    border-radius: 999px;
  }
  .blog-dot { color: var(--ink-mute); }
  .blog-post-title {
    font-family: 'Cinzel', serif;
    font-size: clamp(30px, 4.2vw, 46px);
    font-weight: 500;
    letter-spacing: 0.01em;
    color: var(--ink);
    margin: 0 0 18px;
    text-wrap: balance;
  }
  .blog-post-dek {
    font-family: 'Cormorant Garamond', serif;
    font-size: 21px;
    color: var(--ink-soft);
    margin: 0 0 40px;
    max-width: 640px;
  }
  .blog-post-body {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .blog-post-body p {
    font-size: 18px;
    line-height: 1.7;
    color: var(--ink);
    text-wrap: pretty;
    margin: 0;
  }
  .blog-post-cta {
    margin-top: 64px;
    padding: 40px 32px;
    text-align: center;
    border-top: 1px solid var(--line);
    border-bottom: 1px solid var(--line);
  }
  .blog-post-cta h3 {
    font-family: 'Cinzel', serif;
    font-size: clamp(22px, 2.6vw, 30px);
    font-weight: 400;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    margin: 0 0 8px;
  }
  .blog-post-cta p { color: var(--ink-soft); margin: 0 0 24px; }
  .blog-more { margin-top: 56px; }
  .blog-more-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
    gap: 14px;
  }
  .blog-more-card {
    text-align: left;
    padding: 0;
    border: 1px solid var(--line);
    border-radius: 12px;
    background: rgba(26, 20, 56, 0.28);
    cursor: pointer;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .blog-more-card:hover { border-color: var(--gold); }
  .blog-more-body {
    padding: 14px 16px 18px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .blog-more-card .blog-tag {
    align-self: flex-start;
    font-family: 'Cinzel', serif;
    font-size: 10px;
    letter-spacing: 0.14em;
    color: var(--gold);
  }
  .blog-more-title {
    font-family: 'Cinzel', serif;
    font-size: 15px;
    color: var(--ink);
    line-height: 1.4;
  }

  /* ---- Imagen hero grande (nota abierta) ---- */
  .blog-img-frame-hero {
    width: 100%;
    height: clamp(220px, 34vw, 360px);
    border-radius: 16px;
    border: 1px solid var(--line);
  }
  .blog-img-frame-hero.is-card {
    background: radial-gradient(circle at 50% 38%, rgba(212,168,90,0.2), rgba(15,10,36,0.6) 72%);
    padding: 24px;
  }
  .blog-img-frame-hero.is-card .blog-img-card {
    max-height: 100%;
    box-shadow: 0 16px 48px rgba(0,0,0,0.5);
  }
  .blog-img-frame-hero.is-icon {
    background: radial-gradient(circle at 50% 45%, rgba(212,168,90,0.26), rgba(15,10,36,0.55) 74%);
  }
  .blog-img-frame-hero.is-icon .blog-img-icon {
    width: clamp(140px, 22vw, 220px);
    height: clamp(140px, 22vw, 220px);
    filter: drop-shadow(0 10px 30px rgba(212,168,90,0.3));
  }

  /* ---- Imagen mini (tarjetas "más notas") ---- */
  .blog-img-frame-mini {
    width: 100%;
    height: 96px;
  }
  .blog-img-frame-mini.is-card {
    background: radial-gradient(circle at 50% 35%, rgba(212,168,90,0.16), rgba(15,10,36,0.55) 70%);
    padding: 10px;
  }
  .blog-img-frame-mini.is-icon {
    background: radial-gradient(circle at 50% 45%, rgba(212,168,90,0.2), rgba(15,10,36,0.5) 72%);
  }
  .blog-img-frame-mini .blog-img-icon {
    width: 56px;
    height: 56px;
  }
`;

window.BlogPage = BlogPage;
window.BlogPostPage = BlogPostPage;
