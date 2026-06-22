import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * Animated 3D backdrop for the auth screens (login/register/…).
 * Raw three.js — a drifting rose/cream particle field plus two slow wireframe
 * solids, with gentle mouse parallax. Renders over the crimson CSS gradient
 * behind it. Respects prefers-reduced-motion (draws one static frame) and
 * fully disposes its GPU resources on unmount.
 */
export default function AuthBackground({ className = '' }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    let width = mount.clientWidth || window.innerWidth;
    let height = mount.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.z = 14;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch {
      return; // no WebGL — the CSS gradient behind still looks good
    }
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    mount.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    // ── Particle field ──────────────────────────────────────────────
    const COUNT = 650;
    const positions = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT * 3; i++) positions[i] = (Math.random() - 0.5) * 42;
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0xffe4e6, size: 0.085, transparent: true, opacity: 0.85, depthWrite: false,
    });
    const points = new THREE.Points(pGeo, pMat);
    group.add(points);

    // ── Wireframe focal solids ──────────────────────────────────────
    const wires = [];
    const addWire = (geo, color, opacity, scale, pos) => {
      const w = new THREE.LineSegments(
        new THREE.WireframeGeometry(geo),
        new THREE.LineBasicMaterial({ color, transparent: true, opacity }),
      );
      w.scale.setScalar(scale);
      w.position.set(...pos);
      geo.dispose();
      group.add(w);
      wires.push(w);
      return w;
    };
    const ico = addWire(new THREE.IcosahedronGeometry(3.2, 1), 0xfda4af, 0.55, 1, [4, -0.5, 0]);
    const ico2 = addWire(new THREE.IcosahedronGeometry(2, 0), 0xfff1f2, 0.4, 1, [-6, 3.5, -5]);

    // ── Interaction + resize ────────────────────────────────────────
    let mx = 0, my = 0;
    const onMove = (e) => {
      mx = (e.clientX / window.innerWidth) - 0.5;
      my = (e.clientY / window.innerHeight) - 0.5;
    };
    window.addEventListener('pointermove', onMove);

    const onResize = () => {
      width = mount.clientWidth || window.innerWidth;
      height = mount.clientHeight || window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', onResize);

    // ── Loop ────────────────────────────────────────────────────────
    let raf = 0;
    let t = 0;
    const tick = () => {
      t += 0.0016;
      points.rotation.y = t * 0.5;
      points.rotation.x = Math.sin(t * 0.4) * 0.1;
      ico.rotation.x += 0.0016;
      ico.rotation.y += 0.0022;
      ico2.rotation.x -= 0.0011;
      ico2.rotation.y += 0.0015;
      group.rotation.y += (mx * 0.45 - group.rotation.y) * 0.04;
      group.rotation.x += (my * 0.3 - group.rotation.x) * 0.04;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };

    if (reduce) renderer.render(scene, camera);
    else tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('resize', onResize);
      pGeo.dispose();
      pMat.dispose();
      wires.forEach((w) => { w.geometry.dispose(); w.material.dispose(); });
      renderer.dispose();
      renderer.domElement.parentNode?.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className={className} aria-hidden="true" />;
}
