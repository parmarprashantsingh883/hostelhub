import { Link } from 'react-router-dom';
import { useRef } from 'react';
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import { BedDouble, IndianRupee, QrCode } from 'lucide-react';
import { LogoMark, LogoMono } from '../../components/brand/Logo';

gsap.registerPlugin(SplitText, useGSAP);

const PROOF = [
  { icon: BedDouble, label: 'Live occupancy' },
  { icon: IndianRupee, label: 'UPI rent & receipts' },
  { icon: QrCode, label: 'Visitor QR passes' },
];

/**
 * Two-pane auth shell: a clean white form on the left, and a branded photo
 * panel on the right (a real co-living room, lightly brand-tinted) with the
 * wordmark and motto. One GSAP timeline choreographs the entrance — a gentle
 * Ken Burns on the photo, SplitText mask reveals for the title and motto, and
 * staggered form fields. Reduced-motion renders the finished frame.
 */
export default function AuthShell({ title, subtitle, children, footer }) {
  const rootRef = useRef(null);
  const titleRef = useRef(null);
  const mottoRef = useRef(null);
  const photoRef = useRef(null);

  useGSAP(
    (_ctx, contextSafe) => {
      const q = gsap.utils.selector(rootRef);

      const build = () => {
        const mm = gsap.matchMedia();
        mm.add(
          { motion: '(prefers-reduced-motion: no-preference)', reduced: '(prefers-reduced-motion: reduce)' },
          (ctx) => {
            if (ctx.conditions.reduced) return undefined; // markup already IS the final frame

            const titleSplit = SplitText.create(titleRef.current, { type: 'lines', mask: 'lines' });
            const mottoSplit = mottoRef.current ? SplitText.create(mottoRef.current, { type: 'lines', mask: 'lines' }) : null;

            // stagger the page-specific form children; fall back to the block
            const formItems = q('.auth-body form > *');
            const bodyTargets = formItems.length ? formItems : q('.auth-body > *');

            const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

            tl.from(photoRef.current, { scale: 1.12, duration: 2.4, ease: 'power2.out' }, 0)
              // left — the form
              .from(q('.auth-logo'), { y: 14, autoAlpha: 0, duration: 0.5 }, 0.1)
              .from(titleSplit.lines, { yPercent: 112, duration: 0.7, stagger: 0.1, ease: 'power4.out' }, 0.2)
              .from(q('.auth-sub'), { y: 10, autoAlpha: 0, duration: 0.4 }, '-=0.35')
              // fromTo + clearProps: explicit end values so the last stagger
              // target (submit button) is never left stranded invisible
              .fromTo(bodyTargets, { y: 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5, stagger: 0.07, clearProps: 'all' }, '-=0.25')
              .from(q('.auth-footer'), { autoAlpha: 0, duration: 0.4 }, '-=0.2')
              // right — wordmark + motto
              .from(q('.auth-wordmark'), { y: -10, autoAlpha: 0, duration: 0.5 }, 0.15);

            if (mottoSplit) {
              tl.from(mottoSplit.lines, { yPercent: 112, duration: 0.7, stagger: 0.1, ease: 'power4.out' }, 0.6)
                .from(q('.auth-proof'), { y: 10, autoAlpha: 0, duration: 0.4, stagger: 0.07 }, 0.9);
            }

            // idle — slow Ken Burns drift after the entrance settles
            gsap.to(photoRef.current, { scale: 1.05, duration: 18, delay: 2.6, yoyo: true, repeat: -1, ease: 'sine.inOut' });

            return () => {
              titleSplit.revert();
              mottoSplit?.revert();
            };
          },
        );
      };

      // Build synchronously when fonts are already loaded — a fonts.ready
      // .then() lands in StrictMode's effect/cleanup gap and can strand a
      // stagger target invisible.
      let cancelled = false;
      let built = false;
      const safeBuild = contextSafe(() => { if (!cancelled && !built) { built = true; build(); } });
      if (!document.fonts || document.fonts.status === 'loaded') safeBuild();
      else document.fonts.ready.then(safeBuild);
      return () => { cancelled = true; };
    },
    { scope: rootRef },
  );

  return (
    <div ref={rootRef} className="grid min-h-screen bg-white lg:grid-cols-2 dark:bg-sidebar">
      {/* ───────────────── FORM (left) ───────────────── */}
      <div className="flex items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-sm">
          <Link to="/" className="auth-logo group mb-10 inline-flex items-center gap-2.5">
            <LogoMark size={40} className="transition-transform group-hover:scale-105" />
            <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">Quarters</span>
          </Link>
          <h1 ref={titleRef} className="text-[26px] font-extrabold leading-tight tracking-tight text-slate-900 dark:text-white">{title}</h1>
          {subtitle && <p className="auth-sub mt-1.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
          <div className="auth-body mt-8">{children}</div>
          {footer && <div className="auth-footer mt-6 text-center text-sm text-slate-500">{footer}</div>}
        </div>
      </div>

      {/* ───────────────── BRAND PANEL (right) ───────────────── */}
      <div className="relative hidden flex-col overflow-hidden bg-brand-900 p-10 lg:flex">
        {/* a real co-living room, lightly tinted to the brand (Pexels — free license) */}
        <img ref={photoRef} src="/auth-room.jpg" alt="" className="absolute inset-0 h-full w-full object-cover will-change-transform" />
        {/* gentle blue tint — keeps the brand feel without darkening the photo */}
        <div className="absolute inset-0 bg-brand-500/12 mix-blend-multiply" />
        {/* legibility scrims only where text sits: bottom (motto) + left (wordmark) */}
        <div className="absolute inset-0 bg-gradient-to-t from-brand-900/72 via-brand-900/5 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-900/40 via-transparent to-transparent" />

        {/* wordmark */}
        <div className="auth-wordmark relative flex items-center gap-2.5">
          <LogoMono size={30} className="text-white drop-shadow" />
          <span className="text-lg font-extrabold tracking-tight text-white drop-shadow">Quarters</span>
        </div>

        {/* spacer keeps the motto pinned to the bottom */}
        <div className="flex-1" />

        {/* motto + proof */}
        <div className="relative">
          <p ref={mottoRef} className="font-display text-[30px] font-semibold leading-[1.1] text-white drop-shadow-[0_2px_10px_rgba(11,16,24,0.5)]">
            Run your property,<br />not the paperwork.
          </p>
          <p className="auth-proof mt-2.5 text-sm text-white/80">The operating system for modern PGs &amp; hostels.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {PROOF.map(({ icon: Icon, label }) => (
              <span key={label} className="auth-proof inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white ring-1 ring-white/20 backdrop-blur-sm">
                <Icon className="h-3.5 w-3.5" /> {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
