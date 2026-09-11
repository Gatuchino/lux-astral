// Blog editorial (idea #9 de la auditoria de marketing) -- lista de notas
// (BlogPage) y el detalle de una nota (BlogPostPage). Contenido en
// src/data/blogPosts.js, escrito en es/en. Sigue el patron "autocontenido
// por archivo" del resto del sitio (CSS propio, sin depender de clases
// globales de otras paginas).

function blogPostsSorted() {
  const list = (window.BLOG_POSTS || []).slice();
  list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return list;
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

function BlogPage({ lang, setRoute }) {
  const t = window.I18N[lang];
  const es = lang === 'es';
  const posts = blogPostsSorted();

  return (
    <div className="page blog-page">
      <div className="page-head">
        <div className="eyebrow">{t.blog_eyebrow}</div>
        <h1 className="page-title">{t.blog_h}</h1>
        <p className="page-sub italic">{t.blog_sub}</p>
      </div>

      {posts.length === 0 ? (
        <p className="italic" style={{ textAlign: 'center', color: 'var(--ink-mute)' }}>{t.blog_empty}</p>
      ) : (
        <div className="blog-grid">
          {posts.map((p) => {
            const c = p[lang] || p.es;
            return (
              <article key={p.slug} className="blog-card" onClick={() => setRoute({ page: 'blogpost', slug: p.slug })}>
                <div className="blog-card-meta">
                  <span className="blog-tag">{c.tag}</span>
                  <span className="blog-dot">·</span>
                  <span>{blogDateLabel(p.date, lang)}</span>
                </div>
                <h2 className="blog-card-title">{c.title}</h2>
                <p className="blog-card-dek">{c.dek}</p>
                <div className="blog-card-cta">
                  {t.blog_read_more} → <span className="blog-card-time">{p.readMin[lang] || p.readMin.es} {t.blog_min_read}</span>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <style>{`
        .blog-page { max-width: 920px; }
        .blog-grid {
          display: flex;
          flex-direction: column;
          gap: 20px;
          margin-top: 48px;
        }
        .blog-card {
          padding: 28px 32px;
          border: 1px solid var(--line);
          border-radius: 12px;
          background: rgba(26, 20, 56, 0.28);
          cursor: pointer;
          transition: border-color 0.2s ease, transform 0.2s ease;
        }
        .blog-card:hover {
          border-color: var(--gold);
          transform: translateY(-2px);
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
          font-size: clamp(20px, 2.4vw, 26px);
          font-weight: 500;
          letter-spacing: 0.01em;
          color: var(--ink);
          margin: 0 0 10px;
          text-wrap: balance;
        }
        .blog-card-dek {
          font-size: 15.5px;
          line-height: 1.55;
          color: var(--ink-soft);
          margin: 0 0 16px;
          max-width: 640px;
        }
        .blog-card-cta {
          font-size: 13px;
          color: var(--gold);
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .blog-card-time { color: var(--ink-mute); }
        @media (max-width: 640px) {
          .blog-card { padding: 22px 20px; }
        }
      `}</style>
    </div>
  );
}

function BlogPostPage({ lang, setRoute, slug }) {
  const t = window.I18N[lang];
  const es = lang === 'es';
  const post = (window.BLOG_POSTS || []).find((p) => p.slug === slug);

  React.useEffect(() => { window.scrollTo({ top: 0 }); }, [slug]);

  if (!post) {
    return (
      <div className="page blog-post-page">
        <p className="italic" style={{ textAlign: 'center', color: 'var(--ink-mute)' }}>{t.blog_empty}</p>
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <button className="btn btn-ghost" onClick={() => setRoute({ page: 'blog' })}>← {t.blog_back}</button>
        </div>
      </div>
    );
  }

  const c = post[lang] || post.es;
  const others = blogPostsSorted().filter((p) => p.slug !== post.slug).slice(0, 3);

  return (
    <div className="page blog-post-page">
      <button className="blog-back-link" onClick={() => setRoute({ page: 'blog' })}>← {t.blog_back}</button>

      <article className="blog-post">
        <div className="blog-post-meta">
          <span className="blog-tag">{c.tag}</span>
          <span className="blog-dot">·</span>
          <span>{blogDateLabel(post.date, lang)}</span>
          <span className="blog-dot">·</span>
          <span>{post.readMin[lang] || post.readMin.es} {t.blog_min_read}</span>
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
                  <span className="blog-tag">{oc.tag}</span>
                  <span className="blog-more-title">{oc.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
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
          margin-bottom: 18px;
        }
        .blog-tag {
          padding: 3px 10px;
          border: 1px solid var(--gold);
          border-radius: 999px;
        }
        .blog-dot { color: var(--ink-mute); }
        .blog-post-title {
          font-family: 'Cinzel', serif;
          font-size: clamp(32px, 4.4vw, 48px);
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
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 14px;
        }
        .blog-more-card {
          text-align: left;
          padding: 18px 20px;
          border: 1px solid var(--line);
          border-radius: 10px;
          background: rgba(26, 20, 56, 0.28);
          cursor: pointer;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .blog-more-card:hover { border-color: var(--gold); }
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
      `}</style>
    </div>
  );
}

window.BlogPage = BlogPage;
window.BlogPostPage = BlogPostPage;
