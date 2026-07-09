import { Link } from 'react-router-dom';
import { useRef } from 'react';
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import { BedDouble, IndianRupee, QrCode, Check, TrendingUp, UserPlus } from 'lucide-react';
import { LogoMark, LogoMono } from '../../components/brand/Logo';

gsap.registerPlugin(SplitText, useGSAP);

const PROOF = [
  { icon: BedDouble, label: 'Live occupancy' },
  { icon: IndianRupee, label: 'UPI rent & receipts' },
  { icon: QrCode, label: 'Visitor QR passes' },
];

// Mini 6-month revenue bars for the product snapshot (height %, last = current).
const BARS = [38, 50, 46, 64, 78, 95];

// Live-notification carousel — cycles like real events coming in.
const TOASTS = [
  { icon: Check, tone: 'bg-emerald-100 text-emerald-600', text: 'Rent received · ₹6,200' },
  { icon: UserPlus, tone: 'bg-brand-50 text-brand-600', text: 'New enquiry · Priya S.' },
  { icon: BedDouble, tone: 'bg-emerald-100 text-emerald-600', text: 'Move-in · Bed 204·B' },
];

/**
 * Two-pane auth shell: a clean white form on the left, a branded product
 * panel on the right. One GSAP master timeline choreographs the entrance —
 * Ken Burns on the room photo, SplitText mask reveals for the title and
 * motto, staggered form fields, the occupancy ring drawing while both
 * counters run, revenue bars rising, and a live toast carousel that keeps
 * cycling. Reduced-motion renders the finished frame (all tweens are
 * from-tweens over final-state markup).
 */
export default function AuthShell({ title, subtitle, children, footer }) {
  const rootRef = useRef(null);
  const titleRef = useRef(null);
  const mottoRef = useRef(null);
  const photoRef = useRef(null);
  const ringRef = useRef(null);
  const pctRef = useRef(null);
  const amtRef = useRef(null);

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

            gsap.set(q('.auth-toast'), { autoAlpha: 0 });

            const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

            tl.from(photoRef.current, { scale: 1.14, duration: 2.4, ease: 'power2.out' }, 0)
              // left — the form
              .from(q('.auth-logo'), { y: 14, autoAlpha: 0, duration: 0.5 }, 0.1)
              .from(titleSplit.lines, { yPercent: 112, duration: 0.7, stagger: 0.1, ease: 'power4.out' }, 0.2)
              .from(q('.auth-sub'), { y: 10, autoAlpha: 0, duration: 0.4 }, '-=0.35')
              // fromTo + clearProps: explicit end values — .from() capture on
              // the submit button was recording an already-hidden end-state
              .fromTo(bodyTargets, { y: 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5, stagger: 0.07, clearProps: 'all' }, '-=0.25')
              .from(q('.auth-footer'), { autoAlpha: 0, duration: 0.4 }, '-=0.2')
              // right — the product panel
              .from(q('.auth-wordmark'), { y: -10, autoAlpha: 0, duration: 0.5 }, 0.15)
              .from(q('.auth-card'), { y: 34, autoAlpha: 0, scale: 0.96, duration: 0.8 }, 0.35)
              .fromTo(ringRef.current, { strokeDashoffset: 264 }, { strokeDashoffset: 21, duration: 1.1, ease: 'power2.inOut' }, 0.7)
              .from(q('.auth-bar'), { height: 0, duration: 0.5, stagger: 0.06 }, 0.8)
              .to(q('.auth-toast-0'), { autoAlpha: 1, duration: 0.01 }, 1.1)
              .from(q('.auth-toast-0'), { y: -12, scale: 0.9, duration: 0.5, ease: 'back.out(1.8)' }, 1.1)
              .from(q('.auth-chip'), { y: 12, autoAlpha: 0, duration: 0.5 }, 1.3);

            if (mottoSplit) {
              tl.from(mottoSplit.lines, { yPercent: 112, duration: 0.7, stagger: 0.1, ease: 'power4.out' }, 0.9)
                .from(q('.auth-proof'), { y: 10, autoAlpha: 0, duration: 0.4, stagger: 0.07 }, 1.2);
            }

            // counters run alongside the ring draw
            const nums = { p: 0, a: 0 };
            tl.to(nums, {
              p: 92, a: 124000, duration: 1.1, ease: 'power2.inOut',
              onUpdate: () => {
                if (pctRef.current) pctRef.current.textContent = `${Math.round(nums.p)}%`;
                if (amtRef.current) amtRef.current.textContent = `₹${(nums.a / 100000).toFixed(2)}L`;
              },
            }, 0.7);

            // idle — slow Ken Burns drift after the entrance settles
            gsap.to(photoRef.current, { scale: 1.06, duration: 18, delay: 2.6, yoyo: true, repeat: -1, ease: 'sine.inOut' });

            // live toast carousel: 0 → 1 → 2 → 0 …
            const cycle = gsap.timeline({ repeat: -1, delay: 4.5 });
            TOASTS.forEach((_, i) => {
              const cur = q(`.auth-toast-${i}`);
              const next = q(`.auth-toast-${(i + 1) % TOASTS.length}`);
              cycle
                .to(cur, { y: -10, autoAlpha: 0, scale: 0.94, duration: 0.35, ease: 'power2.in' }, `+=${i === 0 ? 0 : 4}`)
                .fromTo(next, { y: 12, scale: 0.94 }, { y: 0, autoAlpha: 1, scale: 1, duration: 0.45, ease: 'back.out(1.8)' }, '<0.15');
            });
            cycle.to({}, { duration: 4 }); // hold the last before looping

            return () => {
              titleSplit.revert();
              mottoSplit?.revert();
            };
          },
        );
      };

      // When fonts are already loaded, build SYNCHRONOUSLY — a fonts.ready
      // .then() here lands in the microtask gap between StrictMode's first
      // effect and its cleanup, producing a doomed duplicate build whose
      // revert can strand the last stagger target invisible.
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
        {/* a real co-living room, tinted to the brand (Pexels — free/commercial license) */}
        <img ref={photoRef} src="/auth-room.jpg" alt="" className="absolute inset-0 h-full w-full object-cover will-change-transform" />
        <div className="absolute inset-0 bg-brand-800/55 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-900/92 via-brand-900/35 to-brand-900/45" />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 120% at 50% 38%, transparent 50%, rgba(11,16,24,0.6) 100%)' }} />
        <div className="pointer-events-none absolute -left-24 bottom-8 h-72 w-72 rounded-full bg-brand-400/20 blur-3xl" />

        {/* wordmark */}
        <div className="auth-wordmark relative flex items-center gap-2.5">
          <LogoMono size={30} className="text-white" />
          <span className="text-lg font-extrabold tracking-tight text-white">Quarters</span>
        </div>

        {/* signature — the animated product snapshot (occupancy ring + revenue) */}
        <div className="relative flex flex-1 items-center justify-center py-8">
          <div className="animate-float-soft relative w-full max-w-sm">
            <div className="auth-card relative">
              {/* stacked-card depth behind the main card */}
              <div aria-hidden className="absolute -bottom-2.5 left-3.5 right-3.5 h-full rounded-2xl bg-white/15 ring-1 ring-white/10 backdrop-blur-sm" />

              {/* main product card — solid white so it reads as a real app screen */}
              <div className="relative rounded-2xl bg-white p-5 shadow-[0_34px_90px_-26px_rgba(0,0,0,0.6)] ring-1 ring-black/5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-900">This month</span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:hidden" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span> Live
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-5">
                  {/* occupancy ring (GSAP draws it while the counters run) */}
                  <div className="relative h-[88px] w-[88px] shrink-0">
                    <svg viewBox="0 0 100 100" className="h-[88px] w-[88px] -rotate-90">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="#eef1f5" strokeWidth="11" />
                      <circle
                        ref={ringRef}
                        cx="50" cy="50" r="42" fill="none" stroke="#2563eb" strokeWidth="11" strokeLinecap="round"
                        strokeDasharray="264" strokeDashoffset="21"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span ref={pctRef} className="text-xl font-extrabold tracking-tight text-slate-900 tabular-nums">92%</span>
                      <span className="text-[10px] font-medium text-slate-400">occupied</span>
                    </div>
                  </div>
                  {/* revenue + mini bars */}
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Collected</p>
                    <span ref={amtRef} className="block text-2xl font-extrabold tracking-tight text-slate-900 tabular-nums">₹1.24L</span>
                    <div className="mt-2 flex h-9 items-end gap-1.5">
                      {BARS.map((h, i) => (
                        <span
                          key={i}
                          style={{ height: `${h}%` }}
                          className={`auth-bar w-2.5 rounded-sm ${i === BARS.length - 1 ? 'bg-brand-600' : 'bg-brand-200'}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                  <span className="text-slate-400">Sunrise PG · 22 beds</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-600"><TrendingUp className="h-3.5 w-3.5" /> +8% vs last month</span>
                </div>
              </div>

              {/* live-notification carousel (stacked; GSAP crossfades them) */}
              {TOASTS.map(({ icon: Icon, tone, text }, i) => (
                <div
                  key={text}
                  className={`auth-toast auth-toast-${i} absolute -right-3 -top-4 flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-[0_16px_36px_-12px_rgba(0,0,0,0.4)] ring-1 ring-black/5 ${i > 0 ? 'motion-reduce:hidden' : ''}`}
                  style={i > 0 ? { opacity: 0 } : undefined}
                >
                  <span className={`grid h-6 w-6 place-items-center rounded-full ${tone}`}>
                    <Icon className="h-3.5 w-3.5" strokeWidth={2.6} />
                  </span>
                  <span className="whitespace-nowrap text-xs font-semibold text-slate-700">{text}</span>
                </div>
              ))}

              {/* bottom-left proof chip */}
              <div className="auth-chip absolute left-1 top-full mt-3 flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-[0_16px_36px_-12px_rgba(0,0,0,0.4)] ring-1 ring-black/5">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-50 text-brand-600">
                  <TrendingUp className="h-3.5 w-3.5" />
                </span>
                <div className="leading-tight">
                  <p className="text-[10px] font-medium text-slate-400">On-time rent</p>
                  <p className="text-xs font-bold text-slate-800">98% this month</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* motto + proof */}
        <div className="relative">
          <p ref={mottoRef} className="font-display text-[30px] font-semibold leading-[1.1] text-white">
            Run your property,<br />not the paperwork.
          </p>
          <p className="auth-proof mt-2.5 text-sm text-white/70">The operating system for modern PGs &amp; hostels.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {PROOF.map(({ icon: Icon, label }) => (
              <span key={label} className="auth-proof inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/85 ring-1 ring-white/15">
                <Icon className="h-3.5 w-3.5" /> {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
