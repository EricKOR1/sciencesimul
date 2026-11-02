/* hm-kepler-gravity · 3D 케플러 법칙
   타원 궤도: 태양은 한 초점. 같은 시간 동안 쓸고 지나간 넓이는 같아요(제2법칙). T² ∝ a³(제3법칙, 단위: 년·AU).
   궤도는 케플러 방정식(M = E − e·sinE)으로 계산해요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches), KD = PHN ? 1.3 : 1;
  const LV = () => (typeof window.SciSimLevel === 'number' ? window.SciSimLevel : 0);
  const TAU = Math.PI * 2, clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  function tools(THREE) {
    const V3 = THREE.Vector3, Y = new V3(0, 1, 0);
    const M = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0.1 }, o || {}));
    const glass = (c, op) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.2, metalness: 0, transparent: true, opacity: op == null ? 0.25 : op, depthWrite: false });
    function mkArrow(col, rad) {
      const g = new THREE.Group(), m = M(col, { roughness: 0.4 });
      const sh = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 1, 12), m), hd = new THREE.Mesh(new THREE.ConeGeometry(rad * 2.6, rad * 6, 16), m);
      g.add(sh, hd); g.userData = { sh, hd, rad }; return g;
    }
    function setArrow(g, a, b) {
      const d = new V3().subVectors(b, a), len = d.length(), { sh, hd, rad } = g.userData;
      if (len < 1e-3) { g.visible = false; return; }
      g.visible = true; const hl = Math.min(len * 0.5, rad * 6);
      sh.scale.y = Math.max(0.001, len - hl); sh.position.y = (len - hl) / 2;
      hd.scale.y = hl / (rad * 6); hd.position.y = len - hl / 2;
      g.position.copy(a); g.quaternion.setFromUnitVectors(Y, d.normalize());
    }
    function tube(pts, r, col, o, closed) {
      const c = new THREE.CatmullRomCurve3(pts, !!closed);
      return new THREE.Mesh(new THREE.TubeGeometry(c, Math.max(24, pts.length * 3), r, 8, !!closed), (o && o.basic) ? new THREE.MeshBasicMaterial({ color: col, transparent: !!o.op, opacity: o.op || 1 }) : M(col, o));
    }
    function disc(r, col, y, op) { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 64), new THREE.MeshStandardMaterial({ color: col, roughness: 0.9, transparent: op != null, opacity: op == null ? 1 : op })); m.rotation.x = -Math.PI / 2; m.position.y = y || 0; m.receiveShadow = true; return m; }
    function grid(w, d, step, col, y, op) {
      const pts = []; for (let x = -w / 2; x <= w / 2 + 1e-6; x += step) pts.push(x, 0, -d / 2, x, 0, d / 2); for (let z = -d / 2; z <= d / 2 + 1e-6; z += step) pts.push(-w / 2, 0, z, w / 2, 0, z);
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: op == null ? 0.3 : op })); l.position.y = y || 0; return l;
    }
    function arc(r, a0, a1, rad, col, n) { // xz 평면 위의 호
      const pts = []; n = n || 40; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; pts.push(new V3(r * Math.cos(a), 0, r * Math.sin(a))); }
      return tube(pts, rad, col);
    }
    return { V3, Y, M, glass, mkArrow, setArrow, tube, disc, grid, arc };
  }
  const KDX = PHN ? 1.55 : 1;
  window.SciSim3D.attach({
    title: '케플러 법칙 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: 9 * KDX, theta: 0.3, phi: 0.95, min: 4, max: 26 },
    autoRotate: 0,
    levels: [0, 1],
    build(ctx) {
      const { THREE, root, label, info, controls, scene } = ctx;
      const { V3, M, tube, mkArrow, setArrow } = tools(THREE);
      const st = { a: 2.4, e: 0.55, wedge: true, M0: 0, spd: 1 };
      /* 태양 · 조명: 태양이 광원이에요 */
      const sun = new THREE.Mesh(new THREE.SphereGeometry(0.42, 40, 28), new THREE.MeshBasicMaterial({ color: 0xffd45a })); root.add(sun);
      const halo = new THREE.Mesh(new THREE.SphereGeometry(0.62, 32, 20), new THREE.MeshBasicMaterial({ color: 0xffa726, transparent: true, opacity: 0.25, depthWrite: false })); root.add(halo);
      const pl = new THREE.PointLight(0xfff1cf, 2.4, 0, 0); scene.add(pl); scene.add(new THREE.AmbientLight(0x6070a0, 0.65));
      const planet = new THREE.Mesh(new THREE.SphereGeometry(0.22, 32, 24), M(0x3b82f6, { roughness: 0.55 })); root.add(planet);
      const vA = mkArrow(0xffffff, 0.03); root.add(vA);
      let orbit = null; const wedgeG = new THREE.Group(); root.add(wedgeG);
      const lS = label('태양 (초점)', sun, { color: '#b45309', size: 12, offset: [0, 0.75, 0] }), lP = label('행성', planet, { color: '#2f6df6', size: 12, offset: [0, 0.4, 0] });
      const lPe = label('근일점', [0, 0, 0], { color: '#7c3aed', size: 12 }), lAp = label('원일점', [0, 0, 0], { color: '#0f766e', size: 12 });
      const SC = 1.45;                                   // 1 AU = 1.45 세계 단위
      const T = () => Math.pow(st.a, 1.5);
      function kep(Mm) { let E = Mm; for (let i = 0; i < 12; i++) E -= (E - st.e * Math.sin(E) - Mm) / (1 - st.e * Math.cos(E)); return E; }
      function pos(Mm, out) { const E = kep(Mm), a = st.a * SC, b = a * Math.sqrt(1 - st.e * st.e); return out.set(a * (Math.cos(E) - st.e), 0, -b * Math.sin(E)); }
      function rebuild() {
        if (orbit) { root.remove(orbit); orbit.geometry.dispose(); }
        const pts = []; const o = new V3(); for (let i = 0; i < 120; i++) pts.push(pos(i / 120 * TAU, o).clone());
        orbit = tube(pts, 0.018, 0x8fb0ff, { basic: true, op: 0.8 }, true); root.add(orbit);
        const a = st.a * SC, c = a * st.e; lPe.obj = [a - c, 0, 0]; lPe.off = [0.05, 0, -0.5]; lAp.obj = [-a - c, 0, 0]; lAp.off = [-0.05, 0, -0.5];
        wedgeG.children.slice().forEach((w) => { wedgeG.remove(w); w.geometry.dispose(); });
        const dM = TAU / 12, cols = [0xff8a65, 0x4dd0e1, 0xba68c8];
        [[0.0, 0], [0.5, 1], [0.0, 2]].forEach(([_, k]) => {
          const M0 = k === 0 ? -dM * 0.0 : k === 1 ? Math.PI - dM * 0.5 : TAU * 0.28;   // 근일점 부근 · 원일점 부근 · 중간
          const sh = []; const p = new V3(); const n = 14;
          const verts = [0, 0, 0];
          for (let i = 0; i <= n; i++) { pos(M0 + dM * i / n, p); verts.push(p.x - 0, 0.015, p.z); }
          // 태양(초점)이 원점이 되도록 평행 이동: 지금 pos는 이미 태양이 원점
          const idx = []; for (let i = 1; i <= n; i++) idx.push(0, i + 1, i);
          const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3)); g.setIndex(idx); g.computeVertexNormals();
          const mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: cols[k], transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false })); wedgeG.add(mesh);
        });
        wedgeG.visible = st.wedge;
        txt();
      }
      function txt() {
        info('<b>궤도 긴반지름 ' + st.a.toFixed(1) + ' AU · 공전 주기 ' + T().toFixed(1) + '년</b><br>T² ÷ a³ = <b>' + (T() * T() / (st.a * st.a * st.a)).toFixed(2) + '</b> (늘 같아요)<br>같은 색 부채꼴은 같은 시간에 쓸고 간 넓이로, 넓이가 모두 같아요.');
      }
      controls.range('긴반지름 a', 1, 4, 0.2, st.a, (v) => { st.a = v; rebuild(); }, (v) => v.toFixed(1) + ' AU');
      controls.range('납작한 정도 e', 0, 0.8, 0.05, st.e, (v) => { st.e = v; rebuild(); }, (v) => v.toFixed(2));
      const wb = controls.button('같은 넓이 ✓', () => { st.wedge = !st.wedge; wb.classList.toggle('on', st.wedge); wb.textContent = '같은 넓이 ' + (st.wedge ? '✓' : '✕'); wedgeG.visible = st.wedge; }); wb.classList.add('on');
      rebuild();
      const pp = new V3(), pq = new V3();
      return {
        update(dt, t) {
          st.M0 += TAU / T() * dt * 1.5;
          pos(st.M0, pp); planet.position.copy(pp); planet.rotation.y += dt;
          pos(st.M0 + 0.02, pq); setArrow(vA, pp, pp.clone().addScaledVector(pq.clone().sub(pp).normalize(), 0.3 + 1.0 * pq.clone().sub(pp).length() * 5)); 
          halo.scale.setScalar(1 + 0.03 * Math.sin(t * 2));
        },
        sync() {},
      };
    },
  });
})();
