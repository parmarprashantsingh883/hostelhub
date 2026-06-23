/* HostelHub brand mark — inline SVG so it ships with the bundle.
   LogoMark    → gradient tile (sidebar, app icon, splash)
   LogoMono    → flat outline, inherits color (print, dark headers)
   LogoWordmark→ mark + "HostelHub" lockup (auth page, footer) */

export function LogoMark({ size = 40, className = '', ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} aria-label="HostelHub" role="img" {...rest}>
      <defs>
        <linearGradient id="hh-tile" x1="4" y1="4" x2="60" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#6e8099" />
          <stop offset="1" stopColor="#1a2336" />
        </linearGradient>
        <linearGradient id="hh-shine" x1="32" y1="0" x2="32" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.3" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#hh-tile)" />
      <rect width="64" height="36" rx="16" fill="url(#hh-shine)" />
      <g stroke="#ffffff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M12 32 L32 14 L52 32" />
        <path d="M18 30 V50" />
        <path d="M46 30 V50" />
        <path d="M18 40 H46" />
      </g>
      <circle cx="49" cy="15" r="2.6" fill="#f4f6f9" />
    </svg>
  );
}

export function LogoMono({ size = 40, className = '', ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} aria-label="HostelHub" role="img" {...rest}>
      <g stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M12 32 L32 14 L52 32" />
        <path d="M18 30 V50" />
        <path d="M46 30 V50" />
        <path d="M18 40 H46" />
      </g>
      <circle cx="49" cy="15" r="2.6" fill="currentColor" />
    </svg>
  );
}

export function LogoWordmark({ height = 40, showTagline = true, className = '', ...rest }) {
  const vw = showTagline ? 280 : 210;
  return (
    <svg width={height * (vw / 64)} height={height} viewBox={`0 0 ${vw} 64`} fill="none" className={className} aria-label="HostelHub" role="img" {...rest}>
      <defs>
        <linearGradient id="hw-tile" x1="4" y1="4" x2="60" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#6e8099" />
          <stop offset="1" stopColor="#1a2336" />
        </linearGradient>
        <linearGradient id="hw-shine" x1="32" y1="0" x2="32" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.3" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#hw-tile)" />
      <rect width="64" height="36" rx="16" fill="url(#hw-shine)" />
      <g stroke="#ffffff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M12 32 L32 14 L52 32" />
        <path d="M18 30 V50" />
        <path d="M46 30 V50" />
        <path d="M18 40 H46" />
      </g>
      <circle cx="49" cy="15" r="2.6" fill="#f4f6f9" />

      <text x="80" y={showTagline ? 36 : 42} fontFamily="'Plus Jakarta Sans', Inter, system-ui, sans-serif" fontWeight="800" fontSize="26" letterSpacing="-0.6" fill="#0F172A">
        Hostel<tspan fill="#243047">Hub</tspan>
      </text>
      {showTagline && (
        <text x="80" y="52" fontFamily="'Plus Jakarta Sans', Inter, system-ui, sans-serif" fontWeight="600" fontSize="10" letterSpacing="2" fill="#243047">
          SMART&#160;&#160;PG&#160;&#160;&amp;&#160;&#160;HOSTEL&#160;&#160;MANAGEMENT
        </text>
      )}
    </svg>
  );
}

export default LogoMark;
