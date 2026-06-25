import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Slim top progress bar that animates on every route change — the familiar
 * SaaS navigation cue. Purely visual; respects reduced motion by skipping.
 */
export default function RouteProgress() {
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    setVisible(true);
    setWidth(8);
    const t1 = setTimeout(() => setWidth(75), 60);    // quick jump
    const t2 = setTimeout(() => setWidth(100), 320);  // complete
    const t3 = setTimeout(() => setVisible(false), 560); // fade out
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [pathname]);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <div
        className="h-full rounded-r-full bg-gradient-to-r from-brand-500 to-brand-400 shadow-[0_0_8px_rgba(37,99,235,0.6)] transition-[width] duration-300 ease-out"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
