import { useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import { ArrowRight, DoorOpen, UserPlus, Receipt } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

/**
 * The Rent Blueprint — an architect's elevation of a PG where the dimensions
 * are rupees. On desktop the band pins and scroll scrubs the story: the
 * linework draws itself, a scanline sweeps the building floor by floor,
 * occupied beds ink in blue, every floor gets a dimension-line annotation
 * with its rent, vacancies are flagged in amber as leaks, and the ledger
 * total counts up — all consistent with the drawing's own scale
 * (1 bed : ₹7,000/mo). Mobile plays once on entry; reduced-motion gets the
 * finished drawing.
 */

// ── Drawing data — internally consistent: 24/28 beds = 86%, ₹7,000/bed ──
const RENT_PER_BED = 7000;
const FLOORS = [
  { id: 'F4', beds: 7, occupied: 6, y: 64 },
  { id: 'F3', beds: 7, occupied: 6, y: 148 },
  { id: 'F2', beds: 7, occupied: 5, y: 232 },
  { id: 'F1', beds: 7, occupied: 7, y: 316 },
];
const TOTAL_BEDS = FLOORS.reduce((n, f) => n + f.beds, 0);
const TOTAL_OCC = FLOORS.reduce((n, f) => n + f.occupied, 0);
const TOTAL_RENT = TOTAL_OCC * RENT_PER_BED;
const PCT = Math.round((TOTAL_OCC / TOTAL_BEDS) * 100);
const inr = (n) => `₹${n.toLocaleString('en-IN')}`;

// building box in SVG units
const BX = 36, BW = 330, ROOF_Y = 40, GROUND_Y = 400, FLOOR_H = 84;
// which bed slots sit vacant per floor (deterministic, scattered)
const VACANT = { F4: [2], F3: [5], F2: [1, 4], F1: [] };

const INK = 'rgba(148,178,222,0.8)';   // blueprint linework
const INK_DIM = 'rgba(148,178,222,0.35)';
const BRAND = '#60a5fa';
const AMBER = '#e8a35c';

const BULLETS = [
  { icon: DoorOpen, t: 'A live bed map', d: 'Sellable-bed math per floor — maintenance beds don’t count as stock.' },
  { icon: UserPlus, t: 'A move-in pipeline', d: 'Enquiry → visit → token → allocated, each stage one drag away.' },
  { icon: Receipt, t: 'Rent that follows the bed', d: 'The moment a bed fills, its rent, deposit and receipts exist.' },
];

/** One side-view bed glyph: headboard + frame. ~30×16 units. */
function BedGlyph({ x, y, vacant }) {
  const stroke = vacant ? AMBER : INK;
  return (
    <g className={`bp-bed ${vacant ? 'bp-bed-vacant' : 'bp-bed-occ'}`} transform={`translate(${x} ${y})`}>
      <line x1="1" y1="0" x2="1" y2="16" stroke={stroke} strokeWidth="1.4" pathLength="1" className="bp-draw" />
      <rect
        x="1.5" y="6" width="26" height="8" rx="2.5"
        stroke={stroke} strokeWidth="1.1" fill={BRAND} fillOpacity="0"
        strokeDasharray={vacant ? '3 2.6' : undefined} pathLength="1"
        className={`bp-draw ${vacant ? '' : 'bp-mattress'}`}
      />
    </g>
  );
}

export default function EngineSection() {
  const sectionRef = useRef(null);
  const headlineRef = useRef(null);
  const rentRef = useRef(null);
  const pctRef = useRef(null);
  const leakRef = useRef(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(sectionRef);
      // the leak figure is a fixed fact of the drawing — only rent and % count up
      const setTotals = (occ) => {
        if (rentRef.current) rentRef.current.textContent = inr(occ * RENT_PER_BED);
        if (pctRef.current) pctRef.current.textContent = `${Math.round((occ / TOTAL_BEDS) * 100)}%`;
      };

      const build = () => {
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
              gsap.set(q('.bp-mattress'), { fillOpacity: 0.4 });
              gsap.set(q('.bp-scan'), { autoAlpha: 0 });
              setTotals(TOTAL_OCC);
              return;
            }

            const split = SplitText.create(headlineRef.current, { type: 'lines', mask: 'lines' });

            // every stroke starts undrawn (pathLength normalises all shapes to 1)
            gsap.set(q('.bp-draw'), { strokeDasharray: '1 1', strokeDashoffset: 1 });
            gsap.set(q('.bp-floor'), { opacity: 0.22 });
            gsap.set(q('.bp-note'), { autoAlpha: 0, x: 16 });
            gsap.set(q('.bp-leak'), { autoAlpha: 0 });
            gsap.set(q('.bp-title'), { autoAlpha: 0 });
            gsap.set(q('.bp-totals'), { autoAlpha: 0, y: 14 });

            const counting = { occ: 0 };
            const tl = gsap.timeline({
              defaults: { ease: 'power2.out' },
              scrollTrigger: desktop
                ? { trigger: sectionRef.current, start: 'top top', end: '+=170%', pin: true, scrub: 1 }
                : { trigger: sectionRef.current, start: 'top 60%', once: true },
            });

            // 1 — headline + copy
            tl.from(split.lines, { yPercent: 115, duration: 0.9, stagger: 0.14, ease: 'power4.out' })
              .from(q('.eng-copy'), { y: 24, autoAlpha: 0, duration: 0.55 }, '-=0.5')
              .from(q('.eng-bullet'), { y: 20, autoAlpha: 0, duration: 0.45, stagger: 0.1 }, '-=0.3')
              .from(q('.eng-cta'), { y: 14, autoAlpha: 0, duration: 0.4 }, '-=0.25');

            // 2 — the drawing draws itself: shell, slabs, title block
            tl.to(q('.bp-shell .bp-draw'), { strokeDashoffset: 0, duration: 1.1, stagger: 0.08, ease: 'power1.inOut' }, 0.3)
              .to(q('.bp-title'), { autoAlpha: 1, duration: 0.5 }, '>-0.3');

            // 3 — the scan: sweep the scanline roof→ground; each floor inks as it passes
            const scanDur = 4.2;
            tl.addLabel('scan')
              .fromTo(q('.bp-scan'), { attr: { transform: `translate(0 ${ROOF_Y})` } },
                { attr: { transform: `translate(0 ${GROUND_Y})` }, duration: scanDur, ease: 'none' }, 'scan')
              .to(counting, {
                occ: TOTAL_OCC, duration: scanDur, ease: 'none', snap: { occ: 1 },
                onUpdate: () => setTotals(counting.occ),
              }, 'scan')
              .to(q('.bp-totals'), { autoAlpha: 1, y: 0, duration: 0.5 }, 'scan');

            FLOORS.forEach((f, i) => {
              const at = `scan+=${(i / FLOORS.length) * scanDur + 0.15}`;
              tl.to(q(`.bp-floor-${f.id}`), { opacity: 1, duration: 0.4 }, at)
                .to(q(`.bp-floor-${f.id} .bp-draw`), { strokeDashoffset: 0, duration: 0.55, stagger: 0.045, ease: 'power1.inOut' }, at)
                .to(q(`.bp-floor-${f.id} .bp-bed-occ .bp-mattress`), { fillOpacity: 0.4, duration: 0.35, stagger: 0.05 }, `${at}+=0.3`)
                .to(q(`.bp-note-${f.id}`), { autoAlpha: 1, x: 0, duration: 0.45 }, `${at}+=0.35`)
                .to(q(`.bp-floor-${f.id} .bp-leak`), { autoAlpha: 1, duration: 0.35 }, `${at}+=0.55`);
            });

            // 4 — scanline fades, leak summary lands
            tl.to(q('.bp-scan'), { autoAlpha: 0, duration: 0.3 }, `scan+=${scanDur}`)
              .from(q('.bp-leaktotal'), { autoAlpha: 0, y: 10, duration: 0.5 }, '>-0.1');

            return () => split.revert();
          },
        );
        ScrollTrigger.refresh();
      };

      // fonts.ready resolves after StrictMode's first-pass teardown — the
      // cancelled flag stops that stale pass from building a second trigger.
      let cancelled = false;
      const safeBuild = () => { if (!cancelled) build(); };
      if (document.fonts?.ready) document.fonts.ready.then(safeBuild);
      else safeBuild();
      return () => { cancelled = true; };
    },
    { scope: sectionRef },
  );

  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-[#04060d] text-white">
      {/* blueprint grid paper */}
      <div
        className="absolute inset-0 opacity-[0.55]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(96,140,200,0.055) 0 1px, transparent 1px 26px), repeating-linear-gradient(90deg, rgba(96,140,200,0.055) 0 1px, transparent 1px 26px), repeating-linear-gradient(0deg, rgba(96,140,200,0.10) 0 1px, transparent 1px 130px), repeating-linear-gradient(90deg, rgba(96,140,200,0.10) 0 1px, transparent 1px 130px)',
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_70%_at_60%_45%,transparent_40%,#04060d_100%)]" />

      <div className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-14 px-5 py-24 lg:grid-cols-[0.9fr_1.1fr] lg:py-0">
        {/* ── Copy ── */}
        <div>
          <p className="eng-copy font-mono text-[11px] uppercase tracking-[0.22em] text-brand-400">
            The occupancy engine · drg. no. QTR-01
          </p>
          <h2 ref={headlineRef} className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Your building,
            <br />
            <span className="text-brand-400">measured in rent.</span>
          </h2>
          <p className="eng-copy mt-5 max-w-md text-[15.5px] leading-relaxed text-slate-400">
            Quarters reads your property like an architect reads a drawing — floor by floor,
            bed by bed. Occupied beds ink in blue. Vacant ones get flagged for exactly what
            they cost you, down to the rupee.
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
              Survey your building <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* ── The blueprint ── */}
        <div className="relative mx-auto w-full max-w-[560px]">
          <svg viewBox="0 0 560 470" className="w-full" aria-hidden="true">
            {/* shell: parapet, walls, ground, slabs */}
            <g className="bp-shell" fill="none">
              <rect x={BX} y={ROOF_Y} width={BW} height={GROUND_Y - ROOF_Y} stroke={INK} strokeWidth="1.6" pathLength="1" className="bp-draw" />
              {/* parapet + water tank silhouette */}
              <path d={`M${BX + 24} ${ROOF_Y} v-14 h34 v14`} stroke={INK} strokeWidth="1.3" pathLength="1" className="bp-draw" />
              <path d={`M${BX + 240} ${ROOF_Y} v-22 h44 v22`} stroke={INK} strokeWidth="1.3" pathLength="1" className="bp-draw" />
              {/* ground line, extended like a site line */}
              <line x1="8" y1={GROUND_Y} x2="552" y2={GROUND_Y} stroke={INK} strokeWidth="1.6" pathLength="1" className="bp-draw" />
              <line x1="8" y1={GROUND_Y + 6} x2="552" y2={GROUND_Y + 6} stroke={INK_DIM} strokeWidth="1" strokeDasharray="7 5" pathLength="1" className="bp-draw" />
              {/* floor slabs */}
              {FLOORS.slice(0, -1).map((f) => (
                <line key={f.id} x1={BX} y1={f.y + FLOOR_H} x2={BX + BW} y2={f.y + FLOOR_H} stroke={INK_DIM} strokeWidth="1.2" pathLength="1" className="bp-draw" />
              ))}
              {/* entrance — kept below the F1 bed row */}
              <path d={`M${BX + 146} ${GROUND_Y} v-17 h38 v17`} stroke={INK} strokeWidth="1.3" pathLength="1" className="bp-draw" />
            </g>

            {/* floors: beds + dimension annotations */}
            {FLOORS.map((f) => {
              const slotW = (BW - 40) / f.beds;
              const vacant = VACANT[f.id];
              const floorRent = f.occupied * RENT_PER_BED;
              const leak = (f.beds - f.occupied) * RENT_PER_BED;
              return (
                <g key={f.id} className={`bp-floor bp-floor-${f.id}`}>
                  {Array.from({ length: f.beds }, (_, b) => (
                    <BedGlyph key={b} x={BX + 22 + b * slotW + (slotW - 28) / 2} y={f.y + FLOOR_H - 38} vacant={vacant.includes(b)} />
                  ))}
                  {/* floor id, drawn like a level marker */}
                  <text x={BX - 24} y={f.y + FLOOR_H - 8} className="font-mono" fontSize="10" fill={INK_DIM}>{f.id}</text>
                  {/* dimension line to the right: tick + extension */}
                  <g className={`bp-note bp-note-${f.id}`}>
                    <line x1={BX + BW + 6} y1={f.y + 10} x2={BX + BW + 26} y2={f.y + 10} stroke={INK_DIM} strokeWidth="1" />
                    <line x1={BX + BW + 26} y1={f.y + 10} x2={BX + BW + 26} y2={f.y + FLOOR_H - 10} stroke={INK_DIM} strokeWidth="1" />
                    <line x1={BX + BW + 6} y1={f.y + FLOOR_H - 10} x2={BX + BW + 26} y2={f.y + FLOOR_H - 10} stroke={INK_DIM} strokeWidth="1" />
                    <text x={BX + BW + 36} y={f.y + FLOOR_H / 2 - 6} className="font-mono" fontSize="11" fill="#cbd7ea">
                      {f.occupied}/{f.beds} beds
                    </text>
                    <text x={BX + BW + 36} y={f.y + FLOOR_H / 2 + 10} className="font-mono" fontSize="11" fill={BRAND}>
                      {inr(floorRent)}
                    </text>
                    {leak > 0 && (
                      <text x={BX + BW + 36} y={f.y + FLOOR_H / 2 + 26} className="bp-leak font-mono" fontSize="10" fill={AMBER}>
                        −{inr(leak)} vacant
                      </text>
                    )}
                  </g>
                </g>
              );
            })}

            {/* scanline */}
            <g className="bp-scan" transform={`translate(0 ${ROOF_Y})`}>
              <line x1="14" y1="0" x2="546" y2="0" stroke={BRAND} strokeWidth="1.2" opacity="0.9" />
              <rect x="14" y="-26" width="532" height="26" fill="url(#scanGlow)" />
              <text x="14" y="-8" className="font-mono" fontSize="9" fill={BRAND} opacity="0.9">SCANNING…</text>
            </g>
            <defs>
              <linearGradient id="scanGlow" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0" stopColor={BRAND} stopOpacity="0.22" />
                <stop offset="1" stopColor={BRAND} stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* title block — like a real drawing */}
            <g className="bp-title font-mono">
              <rect x="330" y="424" width="222" height="40" fill="none" stroke={INK_DIM} strokeWidth="1" />
              <line x1="330" y1="444" x2="552" y2="444" stroke={INK_DIM} strokeWidth="1" />
              <line x1="478" y1="424" x2="478" y2="464" stroke={INK_DIM} strokeWidth="1" />
              <text x="338" y="437" fontSize="9" fill={INK_DIM}>QUARTERS · ELEVATION A</text>
              <text x="486" y="437" fontSize="9" fill={INK_DIM}>QTR-01</text>
              <text x="338" y="457" fontSize="9" fill="#cbd7ea">SCALE · 1 BED : {inr(RENT_PER_BED)}/MO</text>
              <text x="486" y="457" fontSize="9" fill="#34d399">● LIVE</text>
            </g>
          </svg>

          {/* totals ledger — counts up with the scan */}
          <div className="bp-totals mt-3 flex items-end justify-between select-none">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">Collected / month</p>
              <p className="mt-1 font-display text-3xl font-semibold leading-none text-white tabular-nums sm:text-4xl">
                <span ref={rentRef}>₹0</span>
              </p>
            </div>
            <p className="pb-0.5 font-mono text-[11px] text-slate-400">
              <span ref={pctRef} className="text-brand-300">0%</span> occupied
              <span ref={leakRef} className="bp-leaktotal text-[#e8a35c]"> · −{inr((TOTAL_BEDS - TOTAL_OCC) * RENT_PER_BED)}/mo leaking</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
