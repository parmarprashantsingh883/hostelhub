import { useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import { ArrowRight, BedDouble, DoorOpen, UserPlus, Receipt, Banknote } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

/**
 * The occupancy engine — a GSAP ScrollTrigger showcase. On desktop the band
 * pins and the whole story is scrubbed by the scroll wheel: the headline
 * rises out of line masks (SplitText), the glass card settles in from 3D
 * perspective, beds cascade alight while the % counter tracks them 1:1, the
 * toast and rent chip snap in and the sparkline draws itself. Mobile gets the
 * same timeline played once on entry (no pin); reduced-motion gets the final
 * frame. After the story, a slow swap loop keeps the board alive — one bed
 * checks out as another checks in, so the count stays honest.
 */

const TOTAL = 36;
const TARGET = 29; // ≈ 81%
// 11 is coprime with 36 → a full deterministic scatter of the grid
const ORDER = Array.from({ length: TOTAL }, (_, i) => (i * 11 + 5) % TOTAL);

const LIT = { backgroundColor: '#5b9bf6', boxShadow: '0 0 10px rgba(96,165,250,0.5)', scale: 1, opacity: 1 };
const DIM = { backgroundColor: 'rgba(255,255,255,0.06)', boxShadow: '0 0 0px rgba(96,165,250,0)', scale: 0.82, opacity: 1 };

const glass =
  'rounded-2xl bg-white/[0.07] ring-1 ring-white/15 backdrop-blur-xl shadow-[0_24px_60px_-24px_rgba(0,0,0,0.75)]';

const BULLETS = [
  { icon: DoorOpen, t: 'A live bed map', d: 'Sellable-bed math per floor — maintenance beds don’t count as stock.' },
  { icon: UserPlus, t: 'A move-in pipeline', d: 'Enquiry → visit → token → allocated, each stage one drag away.' },
  { icon: Receipt, t: 'Rent that follows the bed', d: 'The moment a bed fills, its rent, deposit and receipts exist.' },
];

export default function EngineSection() {
  const sectionRef = useRef(null);
  const headlineRef = useRef(null);
  const cardRef = useRef(null);
  const dotRefs = useRef([]);
  const pctRef = useRef(null);
  const bedsRef = useRef(null);
  const sparkRef = useRef(null);
  const spotRef = useRef(null);

  const { contextSafe } = useGSAP(
    () => {
      // cursor spotlight — buttery via quickTo, no React re-renders
      const sx = gsap.quickTo(spotRef.current, '--sx', { duration: 0.4, ease: 'power2.out' });
      const sy = gsap.quickTo(spotRef.current, '--sy', { duration: 0.4, ease: 'power2.out' });
      const onMove = (e) => {
        const r = sectionRef.current.getBoundingClientRect();
        sx(e.clientX - r.left);
        sy(e.clientY - r.top);
      };
      sectionRef.current.addEventListener('pointermove', onMove);

      const litEls = ORDER.slice(0, TARGET).map((i) => dotRefs.current[i]);
      const spark = sparkRef.current;
      const sparkLen = spark.getTotalLength();
      const setCount = (n) => {
        if (pctRef.current) pctRef.current.textContent = `${Math.round((n / TOTAL) * 100)}%`;
        if (bedsRef.current) bedsRef.current.textContent = n;
      };

      // fonts must be loaded before SplitText measures lines
      const build = contextSafe(() => {
        const mm = gsap.matchMedia();

        mm.add(
          {
            desktop: '(min-width: 1024px) and (prefers-reduced-motion: no-preference)',
            mobile: '(max-width: 1023.98px) and (prefers-reduced-motion: no-preference)',
            reduced: '(prefers-reduced-motion: reduce)',
          },
          (ctx) => {
            const { desktop, reduced } = ctx.conditions;

            if (reduced) {
              gsap.set(litEls, LIT);
              gsap.set(spark, { strokeDashoffset: 0 });
              setCount(TARGET);
              return;
            }

            const split = SplitText.create(headlineRef.current, { type: 'lines', mask: 'lines' });
            gsap.set(dotRefs.current, DIM);
            gsap.set(spark, { strokeDasharray: sparkLen, strokeDashoffset: sparkLen });

            const counting = { beds: 0 };
            const tl = gsap.timeline({
              defaults: { ease: 'power3.out' },
              scrollTrigger: desktop
                ? { trigger: sectionRef.current, start: 'top top', end: '+=160%', pin: true, scrub: 1 }
                : { trigger: sectionRef.current, start: 'top 62%', once: true },
              onComplete: startSwapLoop,
              // scrubbed timelines re-complete when scrolled back through
              onStart: stopSwapLoop,
            });

            tl.from(split.lines, { yPercent: 115, duration: 0.9, stagger: 0.14, ease: 'power4.out' })
              .from('.eng-copy', { y: 26, autoAlpha: 0, duration: 0.6 }, '-=0.55')
              .from('.eng-bullet', { y: 22, autoAlpha: 0, duration: 0.5, stagger: 0.12 }, '-=0.35')
              .from('.eng-cta', { y: 16, autoAlpha: 0, duration: 0.45 }, '-=0.3')
              .from(
                cardRef.current,
                { y: 110, autoAlpha: 0, rotateX: 10, transformPerspective: 900, transformOrigin: '50% 100%', duration: 1.1 },
                0.35,
              )
              .to(litEls, { ...LIT, duration: 0.3, ease: 'power2.out', stagger: 0.05 }, '>-0.25')
              .to(
                counting,
                { beds: TARGET, duration: 0.05 * TARGET + 0.3, ease: 'none', snap: { beds: 1 }, onUpdate: () => setCount(counting.beds) },
                '<',
              )
              .from('.eng-toast', { y: -26, autoAlpha: 0, scale: 0.9, duration: 0.5, ease: 'back.out(1.8)' }, '>-0.3')
              .from('.eng-chip', { y: 26, autoAlpha: 0, scale: 0.9, duration: 0.5, ease: 'back.out(1.8)' }, '>-0.3')
              .to(spark, { strokeDashoffset: 0, duration: 0.8, ease: 'power2.inOut' }, '<');

            return () => split.revert();
          },
        );
        ScrollTrigger.refresh();
      });

      // ── the live swap loop — one checks out, another checks in ─────
      let swapTl = null;
      function startSwapLoop() {
        if (swapTl) return;
        swapTl = gsap.timeline({ repeat: -1, repeatDelay: 2.6, delay: 1.2 });
        const litSet = ORDER.slice(0, TARGET);
        const dimSet = ORDER.slice(TARGET);
        // rotate through a few fixed pairs — deterministic, no drift
        [[0, 0], [7, 2], [14, 4], [21, 6]].forEach(([li, di]) => {
          const out = dotRefs.current[litSet[li]];
          const inn = dotRefs.current[dimSet[di % dimSet.length]];
          swapTl
            .to(out, { ...DIM, duration: 0.6, ease: 'power2.inOut' }, '+=2.4')
            .to(inn, { ...LIT, duration: 0.6, ease: 'power2.inOut' }, '<0.25')
            .to(inn, { ...DIM, duration: 0.6, ease: 'power2.inOut' }, '+=2.4')
            .to(out, { ...LIT, duration: 0.6, ease: 'power2.inOut' }, '<0.25');
        });
      }
      function stopSwapLoop() {
        swapTl?.kill();
        swapTl = null;
      }

      // fonts.ready resolves after StrictMode's first-pass teardown — the
      // cancelled flag stops that stale pass from building a second trigger.
      let cancelled = false;
      if (document.fonts?.ready) document.fonts.ready.then(() => { if (!cancelled) build(); });
      else build();

      const el = sectionRef.current;
      return () => {
        cancelled = true;
        el?.removeEventListener('pointermove', onMove);
      };
    },
    { scope: sectionRef },
  );

  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-[#04060d] text-white">
      {/* dot grid + cursor spotlight */}
      <div
        className="absolute inset-0 opacity-40"
        style={{ backgroundImage: 'radial-gradient(rgba(148,163,184,0.22) 1px, transparent 1px)', backgroundSize: '28px 28px' }}
      />
      <div
        ref={spotRef}
        className="pointer-events-none absolute inset-0"
        style={{
          '--sx': '-9999px',
          '--sy': '-9999px',
          background: 'radial-gradient(500px circle at var(--sx) var(--sy), rgba(37,99,235,0.15), transparent 65%)',
        }}
      />

      <div className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-16 px-5 py-24 lg:grid-cols-[0.95fr_1.05fr] lg:py-0">
        {/* ── Copy ── */}
        <div>
          <p className="eng-copy font-mono text-[11px] uppercase tracking-[0.22em] text-brand-400">The occupancy engine</p>
          <h2 ref={headlineRef} className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Every bed, live.
            <br />
            <span className="text-brand-400">Watch them fill.</span>
          </h2>
          <p className="eng-copy mt-5 max-w-md text-[15.5px] leading-relaxed text-slate-400">
            This is how Quarters sees your property — floor by floor, bed by bed, in real
            time. Vacant beds stay dark; every move-in lights one up. An empty bed can
            never hide from you again.
          </p>
          <ul className="mt-8 space-y-4">
            {BULLETS.map(({ icon: Icon, t, d }) => (
              <li key={t} className="eng-bullet flex items-start gap-3.5">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10 backdrop-blur">
                  <Icon className="h-4.5 w-4.5 text-brand-400" strokeWidth={2} />
                </span>
                <span>
                  <span className="block text-[15px] font-semibold text-white">{t}</span>
                  <span className="block text-sm leading-relaxed text-slate-400">{d}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="eng-cta">
            <Link
              to="/register"
              className="mt-9 inline-flex h-12 items-center gap-2 rounded-full bg-brand-600 px-7 font-semibold text-white shadow-[0_10px_30px_-8px_rgba(37,99,235,0.7)] transition-all hover:-translate-y-0.5 hover:bg-brand-500"
            >
              See your beds live <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* ── Product cluster ── */}
        <div className="relative mx-auto w-full max-w-[460px] px-2 py-10 sm:px-6">
          <div ref={cardRef} className={`relative z-10 p-6 ${glass}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400">Live occupancy</p>
                <p className="mt-1 text-sm font-semibold text-white">Floor 2 · West wing</p>
              </div>
              <div className="text-right">
                <p ref={pctRef} className="font-display text-3xl font-semibold leading-none text-white tabular-nums">0%</p>
                <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-brand-300">beds filled</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-12 gap-[7px]">
              {Array.from({ length: TOTAL }, (_, i) => (
                <span
                  key={i}
                  ref={(el) => { dotRefs.current[i] = el; }}
                  className="aspect-square rounded-[5px] bg-white/[0.06] ring-1 ring-inset ring-white/10"
                />
              ))}
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
              <span className="flex items-center gap-2 text-xs text-slate-300">
                <BedDouble className="h-3.5 w-3.5 text-brand-300" /> <span ref={bedsRef} className="tabular-nums">0</span>&nbsp;of {TOTAL} beds
              </span>
              <span className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                live
              </span>
            </div>
          </div>

          <div className={`eng-toast absolute -right-2 -top-6 z-20 flex items-center gap-2.5 px-4 py-3 sm:-right-8 ${glass}`}>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-400/20 text-emerald-300">
              <UserPlus className="h-4 w-4" />
            </span>
            <span>
              <span className="block text-xs font-semibold text-white">Move-in confirmed</span>
              <span className="block text-[11px] text-slate-400">Bed 204·B — deposit received</span>
            </span>
          </div>

          <div className={`eng-chip absolute -bottom-7 -left-2 z-20 flex items-center gap-3 px-4 py-3 sm:-left-8 ${glass}`}>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-500/25 text-brand-300">
              <Banknote className="h-4 w-4" />
            </span>
            <span>
              <span className="block text-xs font-semibold text-white">₹86,400 collected</span>
              <span className="block text-[11px] text-slate-400">this month · on autopilot</span>
            </span>
            <svg viewBox="0 0 64 20" className="ml-1 h-5 w-16 text-brand-400" fill="none" aria-hidden="true">
              <path ref={sparkRef} d="M1 16 L9 13 L17 14 L25 9 L33 11 L41 6 L49 8 L57 3 L63 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <circle cx="63" cy="4" r="2" fill="currentColor" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
