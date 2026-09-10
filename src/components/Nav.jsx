// Nav bar with routing + language toggle + auth CTA
// Cada sección tiene un ícono propio (medallón dorado ilustrado por
// Christian) en assets/nav/ — "Planes" es la excepción: no vino en el set
// de íconos, así que usa el mismo glifo ✦ que ya se usa como adorno en el
// resto del sitio (eyebrows, botones) para no inventar un ícono nuevo que
// no coincida con el estilo real de la marca.
const NAV_ICONS = {
  home:        'assets/nav/nav-home.png',
  readings:    'assets/nav/nav-readings.png',
  library:     'assets/nav/nav-library.png',
  chart:       'assets/nav/nav-chart.png',
  moon:        'assets/nav/nav-moon.png',
  marketplace: 'assets/nav/nav-marketplace.png',
  merch:       'assets/nav/nav-merch.png',
  about:       'assets/nav/nav-about.png',
};

function Nav({ route, setRoute, lang, setLang, profile, isPowerUser, onOpenAuth }) {
  const t = window.I18N[lang];
  const Logo = window.ArcanaLogo;
  const links = [
    ['home',        t.nav_home],
    ['readings',    t.nav_readings],
    ['library',     t.nav_library],
    ['chart',       t.nav_chart],
    ['moon',        t.nav_moon],
    ['marketplace', t.nav_marketplace],
    ['merch',       t.nav_merch],
    ['about',       t.nav_about],
    ['pricing',     t.nav_pricing],
  ];
  return (
    <nav className="nav">
      <div className="nav-brand" onClick={() => setRoute({ page: 'home' })} role="button" tabIndex={0}>
        <Logo variant="lockup" size={32} tagline="Tarot" />
      </div>
      <div className="nav-links">
        {links.map(([key, label]) => (
          <button
            key={key}
            className={`nav-link ${route.page === key ? 'is-active' : ''}`}
            onClick={() => setRoute({ page: key })}
          >
            {NAV_ICONS[key] ? (
              <img src={NAV_ICONS[key]} alt="" aria-hidden="true" className="nav-link-icon" />
            ) : (
              <span className="nav-link-icon nav-link-icon-glyph" aria-hidden="true">✦</span>
            )}
            {label}
          </button>
        ))}
      </div>
      <div className="nav-right">
        {isPowerUser && (
          <button
            className={`nav-setup-btn ${route.page === 'setup' ? 'is-active' : ''}`}
            title={lang === 'es' ? 'Configuración de la plataforma' : 'Platform setup'}
            onClick={() => setRoute({ page: 'setup' })}
          >
            ⚙
          </button>
        )}
        <div className="lang-toggle">
          <button className={lang === 'es' ? 'is-active' : ''} onClick={() => setLang('es')}>ES</button>
          <button className={lang === 'en' ? 'is-active' : ''} onClick={() => setLang('en')}>EN</button>
        </div>
        {profile && profile.loggedIn ? (
          <button
            className="btn btn-ghost"
            style={{ padding: '6px 16px 6px 6px', display: 'flex', alignItems: 'center', gap: 8 }}
            onClick={() => setRoute({ page: 'profile' })}
          >
            <span
              style={{
                width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'Cinzel', serif", fontSize: 12, color: 'var(--bg)',
                background: (profile && profile.photo)
                  ? `center/cover url(${profile.photo})`
                  : 'radial-gradient(circle at 30% 30%, var(--gold), var(--gold-deep))',
              }}
            >
              {!(profile && profile.photo) && ((profile && profile.name) || '✦').charAt(0).toUpperCase()}
            </span>
            {(profile && profile.name) || t.nav_profile}
          </button>
        ) : (
          <button
            className="btn btn-ghost"
            style={{ padding: '6px 16px', display: 'flex', alignItems: 'center', gap: 8 }}
            onClick={() => onOpenAuth && onOpenAuth()}
          >
            {t.nav_login}
          </button>
        )}
      </div>
    </nav>
  );
}

window.Nav = Nav;
