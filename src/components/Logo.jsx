// Lux Astral — brand mark. Uses the studio-illustrated moon/star medallion
// artwork (assets/logo-mark.png for the icon, assets/logo-full.png for the
// full lockup with wordmark + tagline already drawn in). Two variants:
//   <ArcanaLogo variant="mark" />       -> icon only (square medallion)
//   <ArcanaLogo variant="lockup" />     -> icon + typed wordmark (default)
//
// Kept as `ArcanaLogo` / `window.ArcanaLogo` internally so every existing
// call site (Nav, Onboarding, About, Home) keeps working unchanged.

function ArcanaLogo({
  variant = 'lockup',
  size = 40,
  color = 'currentColor',
  accent = '#d4a85a',
  wordmark = 'LUX ASTRAL',
  tagline,   // optional: small text under the wordmark, e.g. "Tarot"
  className = '',
  style = {},
}) {
  const S = size;
  const gold = accent;
  const ink  = color;

  const mark = (
    <img
      src="assets/logo-mark.png"
      alt={variant === 'mark' ? wordmark : ''}
      aria-hidden={variant === 'lockup' ? 'true' : undefined}
      width={S}
      height={S}
      style={{ display: 'block', flexShrink: 0, width: S, height: S, objectFit: 'contain' }}
    />
  );

  if (variant === 'mark') {
    return (
      <span className={className}
            style={{ display: 'inline-flex', color: ink, ...style }}
            aria-label={wordmark}>
        {mark}
      </span>
    );
  }

  const compact = wordmark.length > 6;

  // Lockup: icon + typed wordmark on the right (crisp at any size, unlike
  // baking the text into the raster logo).
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: Math.max(8, S * 0.28),
        color: ink,
        ...style,
      }}
      aria-label={wordmark + (tagline ? ' — ' + tagline : '')}
    >
      {mark}
      <span style={{ display: 'inline-flex', flexDirection: 'column', lineHeight: 1 }}>
        <span style={{
          fontFamily: 'Cinzel, serif',
          fontWeight: 500,
          fontSize: Math.round(S * (compact ? 0.4 : 0.52)),
          letterSpacing: compact ? '0.1em' : '0.22em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}>
          {wordmark}
        </span>
        {tagline && (
          <span style={{
            fontFamily: 'Cinzel, serif',
            fontWeight: 400,
            fontSize: Math.round(S * 0.22),
            letterSpacing: '0.42em',
            textTransform: 'uppercase',
            color: gold,
            marginTop: Math.round(S * 0.14),
            opacity: 0.8,
          }}>
            {tagline}
          </span>
        )}
      </span>
    </span>
  );
}

window.ArcanaLogo = ArcanaLogo;
