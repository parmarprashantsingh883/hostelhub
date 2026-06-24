/* Quarters brand mark — inline SVG so it ships with the bundle.
   The mark is a 2×2 grid of rounded tiles (four "quarters" / rooms) with a
   small tail on the lower-right tile that reads as a Q.
   LogoMark    → navy gradient tile (sidebar, app icon, splash)
   LogoMono    → flat, inherits currentColor (print, dark headers)
   LogoWordmark→ mark + "Quarters" lockup (auth page, footer) */

function GridMark({ light = false }) {
  // Four rounded tiles + a Q-tail on the bottom-right one.
  const fill = light ? 'currentColor' : '#ffffff';
  return (
    <g>
      <rect x="16" y="16" width="13" height="13" rx="3.6" fill={fill} />
      <rect x="35" y="16" width="13" height="13" rx="3.6" fill={fill} opacity={light ? 1 : 0.92} />
      <rect x="16" y="35" width="13" height="13" rx="3.6" fill={fill} opacity={light ? 1 : 0.92} />
      <rect x="35" y="35" width="13" height="13" rx="3.6" fill={fill} />
      <path d="M44 44 L53 53" stroke={fill} strokeWidth="5" strokeLinecap="round" />
    </g>
  );
}

export function LogoMark({ size = 40, className = '', ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} aria-label="Quarters" role="img" {...rest}>
      <defs>
        <linearGradient id="q-tile" x1="6" y1="4" x2="58" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#3a4a66" />
          <stop offset="1" stopColor="#161d2b" />
        </linearGradient>
        <linearGradient id="q-shine" x1="32" y1="0" x2="32" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.22" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#q-tile)" />
      <rect width="64" height="34" rx="16" fill="url(#q-shine)" />
      <GridMark />
    </svg>
  );
}

export function LogoMono({ size = 40, className = '', ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} aria-label="Quarters" role="img" {...rest}>
      <GridMark light />
    </svg>
  );
}

export function LogoWordmark({ height = 40, showTagline = true, className = '', ...rest }) {
  const vw = showTagline ? 312 : 214;
  return (
    <svg width={height * (vw / 64)} height={height} viewBox={`0 0 ${vw} 64`} fill="none" className={className} aria-label="Quarters" role="img" {...rest}>
      <defs>
        <linearGradient id="qw-tile" x1="6" y1="4" x2="58" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#3a4a66" />
          <stop offset="1" stopColor="#161d2b" />
        </linearGradient>
        <linearGradient id="qw-shine" x1="32" y1="0" x2="32" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.22" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#qw-tile)" />
      <rect width="64" height="34" rx="16" fill="url(#qw-shine)" />
      <GridMark />

      <text x="80" y={showTagline ? 36 : 42} fontFamily="'Plus Jakarta Sans', Inter, system-ui, sans-serif" fontWeight="800" fontSize="27" letterSpacing="-0.8" fill="#0F172A">
        Quarters
      </text>
      {showTagline && (
        <text x="81" y="52" fontFamily="'Plus Jakarta Sans', Inter, system-ui, sans-serif" fontWeight="600" fontSize="9" letterSpacing="1.6" fill="#64748b">
          PROPERTY&#160;&#160;OS&#160;&#160;FOR&#160;&#160;PGs&#160;&#160;&amp;&#160;&#160;HOSTELS
        </text>
      )}
    </svg>
  );
}

export default LogoMark;
