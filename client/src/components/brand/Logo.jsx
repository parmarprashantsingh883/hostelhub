/* Quarters brand mark — inline SVG so it ships with the bundle.
   Graphite & Ember: a graphite rounded tile with a faint ember corner glow,
   a bold white ring, and an ember Q-tail — an ownable "Q" for Quarters.
   LogoMark    → the graphite tile (sidebar, app icon, splash)
   LogoMono    → flat Q in currentColor (print, dark headers)
   LogoWordmark→ mark + "Quarters" lockup (auth page, footer) */

const GRAPHITE = '#18181b';
const EMBER = '#f97316';

/** The Q glyph (ring + ember tail), drawn inside a 64×64 box. */
function QGlyph({ ring = '#ffffff', tail = EMBER }) {
  return (
    <g>
      <circle cx="30" cy="31" r="13.5" fill="none" stroke={ring} strokeWidth="6.5" />
      {/* Q-tail — a short bold stroke off the lower-right of the ring */}
      <path d="M38.4 39.4 L49 50" stroke={tail} strokeWidth="6.5" strokeLinecap="round" />
    </g>
  );
}

/** The graphite app-icon tile with the ember-glow + Q. */
function TileMark({ idPrefix = 'q' }) {
  return (
    <>
      <defs>
        <radialGradient id={`${idPrefix}-glow`} cx="0.82" cy="0.16" r="0.7">
          <stop offset="0" stopColor={EMBER} stopOpacity="0.5" />
          <stop offset="0.55" stopColor={EMBER} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${idPrefix}-sheen`} x1="32" y1="0" x2="32" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.10" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill={GRAPHITE} />
      <rect width="64" height="64" rx="16" fill={`url(#${idPrefix}-glow)`} />
      <rect width="64" height="34" rx="16" fill={`url(#${idPrefix}-sheen)`} />
      <QGlyph />
    </>
  );
}

export function LogoMark({ size = 40, className = '', ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} aria-label="Quarters" role="img" {...rest}>
      <TileMark idPrefix="qm" />
    </svg>
  );
}

export function LogoMono({ size = 40, className = '', ...rest }) {
  // Flat glyph inheriting currentColor; ember tail stays as the one accent.
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} aria-label="Quarters" role="img" {...rest}>
      <QGlyph ring="currentColor" tail={EMBER} />
    </svg>
  );
}

export function LogoWordmark({ height = 40, showTagline = true, className = '', ...rest }) {
  const vw = showTagline ? 312 : 214;
  return (
    <svg width={height * (vw / 64)} height={height} viewBox={`0 0 ${vw} 64`} fill="none" className={className} aria-label="Quarters" role="img" {...rest}>
      <TileMark idPrefix="qw" />

      <text x="80" y={showTagline ? 36 : 42} fontFamily="'Plus Jakarta Sans', Inter, system-ui, sans-serif" fontWeight="800" fontSize="27" letterSpacing="-0.8" fill="#18181b">
        Quarters
      </text>
      {showTagline && (
        <text x="81" y="52" fontFamily="'Plus Jakarta Sans', Inter, system-ui, sans-serif" fontWeight="600" fontSize="9" letterSpacing="1.6" fill="#71717a">
          PROPERTY&#160;&#160;OS&#160;&#160;FOR&#160;&#160;PGs&#160;&#160;&amp;&#160;&#160;HOSTELS
        </text>
      )}
    </svg>
  );
}

export default LogoMark;
