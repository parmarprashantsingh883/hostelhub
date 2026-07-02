import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

/**
 * The living building — a slender night tower where every window is a bed.
 * Dark windows are vacancies; over time they "move in" and light up, the same
 * story the occupancy board tells with data. The camera auto-fits the whole
 * silhouette (roofline to street), bloom is restrained, and a few windows run
 * warm — a building people live in, not an LED wall. The loop pauses offscreen
 * and prefers-reduced-motion gets one static frame.
 */

const FLOORS = 12;
const FRONT_COLS = 8;
const SIDE_COLS = 4;
const GAP_X = 0.56;
const GAP_Y = 0.62;

const DIM = new THREE.Color('#101b31');
const COOL = ['#5b93f5', '#7fb0ff', '#3f7bf0', '#a8c8ff'].map((c) => new THREE.Color(c));
const WARM = new THREE.Color('#e8a35c');
// Most homes glow cool blue (brand); roughly one in eight runs warm.
const litColorFor = (i) => (i % 8 === 3 ? WARM : COOL[i % COOL.length]);

export default function OccupancyTower({ className = '' }) {
  const mountRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ── Renderer / scene / camera ─────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#070b14');
    scene.fog = new THREE.Fog('#070b14', 22, 48);

    const W = FRONT_COLS * GAP_X + 0.7;
    const H = FLOORS * GAP_Y + 1.0;
    const D = SIDE_COLS * GAP_X + 0.7;

    const camera = new THREE.PerspectiveCamera(32, mount.clientWidth / mount.clientHeight, 0.1, 120);
    const lookAt = new THREE.Vector3(0, H * 0.46, 0);
    const camDir = new THREE.Vector3(0.62, 0.36, 1).normalize();
    const camBase = new THREE.Vector3();

    /** Keep the whole tower in frame — roofline, street and sky margin —
     *  whatever the container's aspect ratio is. */
    const fitCamera = () => {
      const wpx = mount.clientWidth || 1;
      const hpx = mount.clientHeight || 1;
      camera.aspect = wpx / hpx;
      camera.updateProjectionMatrix();
      const fovV = THREE.MathUtils.degToRad(camera.fov);
      const halfH = H * 0.64; // half-height + head/foot room
      const halfW = Math.hypot(W, D) * 0.60;
      const dV = halfH / Math.tan(fovV / 2);
      const dH = halfW / (Math.tan(fovV / 2) * camera.aspect);
      const dist = Math.max(dV, dH) + 1.5;
      camBase.copy(lookAt).addScaledVector(camDir, dist);
      camera.position.copy(camBase);
      camera.lookAt(lookAt);
    };
    fitCamera();

    // ── Building body ─────────────────────────────────────────
    const disposables = [];
    const track = (obj) => { disposables.push(obj); return obj; };

    const bodyMat = track(new THREE.MeshStandardMaterial({ color: '#0c1424', roughness: 0.85, metalness: 0.15 }));
    const slabMat = track(new THREE.MeshStandardMaterial({ color: '#15223d', roughness: 0.9 }));

    const body = new THREE.Mesh(track(new THREE.BoxGeometry(W, H, D)), bodyMat);
    body.position.y = H / 2;
    scene.add(body);

    // Thin floor slabs give the shaft its architecture.
    const slabGeo = track(new THREE.BoxGeometry(W + 0.12, 0.07, D + 0.12));
    for (let f = 0; f <= FLOORS; f++) {
      const slab = new THREE.Mesh(slabGeo, slabMat);
      slab.position.y = 0.66 + f * GAP_Y;
      scene.add(slab);
    }

    // Rooftop silhouette — water tank, stair hut, antenna.
    const roofMat = track(new THREE.MeshStandardMaterial({ color: '#182544', roughness: 0.9 }));
    const roofY = H + 0.02;
    const tank = new THREE.Mesh(track(new THREE.CylinderGeometry(0.38, 0.38, 0.66, 18)), roofMat);
    tank.position.set(-W / 5, roofY + 0.33, -D / 8);
    scene.add(tank);
    const hut = new THREE.Mesh(track(new THREE.BoxGeometry(1.05, 0.6, 0.85)), roofMat);
    hut.position.set(W / 6, roofY + 0.3, D / 10);
    scene.add(hut);
    const mast = new THREE.Mesh(track(new THREE.CylinderGeometry(0.02, 0.02, 1.3, 8)), roofMat);
    mast.position.set(-W / 5, roofY + 1.2, -D / 8);
    scene.add(mast);
    const beacon = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.05, 10, 10)),
      track(new THREE.MeshBasicMaterial({ color: '#ff6b6b' })),
    );
    beacon.position.set(-W / 5, roofY + 1.88, -D / 8);
    scene.add(beacon);

    // Entrance — a modest lit canopy, not a floating slab.
    const canopy = new THREE.Mesh(track(new THREE.BoxGeometry(1.3, 0.08, 0.5)), slabMat);
    canopy.position.set(0, 0.86, D / 2 + 0.24);
    scene.add(canopy);
    const doorGlow = new THREE.Mesh(
      track(new THREE.PlaneGeometry(0.85, 0.5)),
      track(new THREE.MeshBasicMaterial({ color: '#8a5a24' })),
    );
    doorGlow.position.set(0, 0.42, D / 2 + 0.011);
    scene.add(doorGlow);

    // ── Windows (instanced) ───────────────────────────────────
    const winGeo = track(new THREE.PlaneGeometry(0.27, 0.38));
    const winMat = track(new THREE.MeshBasicMaterial({ color: '#ffffff' }));
    const total = FLOORS * (FRONT_COLS + SIDE_COLS);
    const windows = new THREE.InstancedMesh(winGeo, winMat, total);

    const dummy = new THREE.Object3D();
    let idx = 0;
    for (let f = 0; f < FLOORS; f++) {
      const y = 1.02 + f * GAP_Y;
      for (let c = 0; c < FRONT_COLS; c++) {
        dummy.position.set((c - (FRONT_COLS - 1) / 2) * GAP_X, y, D / 2 + 0.01);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        windows.setMatrixAt(idx++, dummy.matrix);
      }
      for (let c = 0; c < SIDE_COLS; c++) {
        dummy.position.set(W / 2 + 0.01, y, (c - (SIDE_COLS - 1) / 2) * GAP_X);
        dummy.rotation.set(0, Math.PI / 2, 0);
        dummy.updateMatrix();
        windows.setMatrixAt(idx++, dummy.matrix);
      }
    }

    // Half the beds start filled; the story moves it toward a healthy 82%.
    const lit = new Array(total).fill(false);
    const color = new THREE.Color();
    for (let i = 0; i < total; i++) {
      const on = Math.random() < 0.5;
      lit[i] = on;
      color.copy(on ? litColorFor(i) : DIM);
      windows.setColorAt(i, color);
    }
    windows.instanceColor.needsUpdate = true;
    scene.add(windows);

    // ── Ground + ambience ─────────────────────────────────────
    const ground = new THREE.Mesh(
      track(new THREE.PlaneGeometry(120, 120)),
      track(new THREE.MeshStandardMaterial({ color: '#05080f', roughness: 1 })),
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // A soft pool of street light at the base grounds the tower.
    const pool = new THREE.Mesh(
      track(new THREE.CircleGeometry(4.2, 40)),
      track(new THREE.MeshBasicMaterial({ color: '#0e1a33', transparent: true, opacity: 0.85 })),
    );
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = 0.005;
    scene.add(pool);

    // Distant city dots on the horizon.
    const cityCount = 300;
    const cityPos = new Float32Array(cityCount * 3);
    for (let i = 0; i < cityCount; i++) {
      const r = 18 + Math.random() * 22;
      const a = Math.random() * Math.PI * 2;
      cityPos[i * 3] = Math.cos(a) * r;
      cityPos[i * 3 + 1] = 0.05 + Math.random() * 2.6;
      cityPos[i * 3 + 2] = Math.sin(a) * r;
    }
    const cityGeo = track(new THREE.BufferGeometry());
    cityGeo.setAttribute('position', new THREE.BufferAttribute(cityPos, 3));
    const city = new THREE.Points(cityGeo, track(new THREE.PointsMaterial({ color: '#28395f', size: 0.05, sizeAttenuation: true })));
    scene.add(city);

    // Drifting night particles.
    const dustCount = 110;
    const dustPos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      dustPos[i * 3] = (Math.random() - 0.5) * 26;
      dustPos[i * 3 + 1] = Math.random() * 14;
      dustPos[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    const dustGeo = track(new THREE.BufferGeometry());
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dust = new THREE.Points(
      dustGeo,
      track(new THREE.PointsMaterial({ color: '#43619e', size: 0.05, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false })),
    );
    scene.add(dust);

    scene.add(new THREE.AmbientLight('#22304f', 1.5));
    const key = new THREE.DirectionalLight('#8fb4ff', 0.55);
    key.position.set(6, 12, 8);
    scene.add(key);
    const rim = new THREE.DirectionalLight('#2a4a8f', 0.35);
    rim.position.set(-8, 6, -6);
    scene.add(rim);

    // ── Bloom — a glow, not a glare ───────────────────────────
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(mount.clientWidth, mount.clientHeight), 0.5, 0.85, 0.32,
    );
    composer.addPass(bloom);

    // ── Move-in / move-out story ──────────────────────────────
    const transitions = []; // { i, from, to, t0 }
    const TRANS_MS = 1500;
    const litCount = () => lit.filter(Boolean).length;

    const toggleWindow = (turnOn) => {
      const pool2 = [];
      for (let i = 0; i < total; i++) if (lit[i] !== turnOn) pool2.push(i);
      if (!pool2.length) return;
      const i = pool2[(Math.random() * pool2.length) | 0];
      const from = new THREE.Color();
      windows.getColorAt(i, from);
      const to = turnOn ? litColorFor(i).clone() : DIM.clone();
      lit[i] = turnOn;
      transitions.push({ i, from, to, t0: performance.now() });
    };

    let storyTimer = null;
    if (!reduceMotion) {
      storyTimer = setInterval(() => {
        const fill = litCount() / total;
        if (fill < 0.82) toggleWindow(true); // a move-in
        if (Math.random() < 0.16 && fill > 0.42) toggleWindow(false); // an occasional move-out
      }, 1100);
    }

    // ── Pointer parallax ──────────────────────────────────────
    const pointer = { x: 0, y: 0 };
    const onPointer = (e) => {
      const r = mount.getBoundingClientRect();
      pointer.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
      pointer.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
    };
    mount.addEventListener('pointermove', onPointer);

    // ── Visibility-aware render loop ──────────────────────────
    let raf = 0;
    let visible = true;
    let running = false;

    const renderFrame = (now) => {
      for (let t = transitions.length - 1; t >= 0; t--) {
        const tr = transitions[t];
        const k = Math.min(1, (now - tr.t0) / TRANS_MS);
        const e = 1 - (1 - k) ** 3;
        color.copy(tr.from).lerp(tr.to, e);
        windows.setColorAt(tr.i, color);
        if (k >= 1) transitions.splice(t, 1);
      }
      if (transitions.length) windows.instanceColor.needsUpdate = true;

      const ts = now * 0.001;
      camera.position.x = camBase.x + Math.sin(ts * 0.1) * 0.22 + pointer.x * 0.55;
      camera.position.y = camBase.y + Math.cos(ts * 0.08) * 0.12 - pointer.y * 0.35;
      camera.lookAt(lookAt);

      const p = dustGeo.attributes.position.array;
      for (let i = 0; i < dustCount; i++) {
        p[i * 3 + 1] += 0.003;
        if (p[i * 3 + 1] > 14) p[i * 3 + 1] = 0;
      }
      dustGeo.attributes.position.needsUpdate = true;

      composer.render();
    };

    const loop = (now) => {
      if (!visible || document.hidden) { running = false; return; }
      renderFrame(now);
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (running || reduceMotion) return;
      running = true;
      raf = requestAnimationFrame(loop);
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
    }, { threshold: 0.05 });
    io.observe(mount);
    const onVis = () => { if (!document.hidden) start(); };
    document.addEventListener('visibilitychange', onVis);

    renderFrame(performance.now());
    setReady(true);
    start();

    // ── Resize ────────────────────────────────────────────────
    const ro = new ResizeObserver(() => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      composer.setSize(w, h);
      fitCamera();
      if (reduceMotion) renderFrame(performance.now());
    });
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(raf);
      if (storyTimer) clearInterval(storyTimer);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      mount.removeEventListener('pointermove', onPointer);
      windows.dispose();
      disposables.forEach((d) => d.dispose?.());
      composer.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      className={`h-full w-full overflow-hidden rounded-3xl transition-opacity duration-700 ${ready ? 'opacity-100' : 'opacity-0'} ${className}`}
    />
  );
}
