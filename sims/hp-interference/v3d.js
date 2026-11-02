/* hp-interference · 3D 파동의 간섭 (물결 · 이중 슬릿)
   두 파원에서 나온 물결이 겹쳐요. 경로차가 파장의 정수배면 보강(마루+마루), 반정수배면 상쇄(마루+골)예요.
   '세기' 보기: 시간 평균 세기를 높이로 보여 줘요(밝은 무늬 = 높은 곳). 앞쪽 스크린의 막대가 무늬의 밝기예요.
   무늬 간격 Δx = λL/d. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches), KD = PHN ? 1.3 : 1;
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
  window.SciSim3D.attach({
    title: '파동의 간섭 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: 12 * KD, theta: 0.0, phi: 0.92, min: 5, max: 28, target: [0, 0, 1.0] },
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const { V3, M } = tools(THREE);
      const st = { lam: 1.0, d: 2.4, view: 'wave', t: 0 };
      const W = 11, D = 9, NX = 110, NZ = 90;
      const geo = new THREE.PlaneGeometry(W, D, NX, NZ); geo.rotateX(-Math.PI / 2); geo.translate(0, 0, 0.5);
      const pos = geo.attributes.position, col = new Float32Array(pos.count * 3); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const surf = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.28, metalness: 0.15, side: THREE.DoubleSide })); surf.receiveShadow = true; root.add(surf);
      const s1 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.7, 16), M(0xffb020, { emissive: 0x7a4a00 })), s2 = s1.clone();
      s1.position.y = s2.position.y = 0.2; root.add(s1, s2);
      const wallL = new THREE.Mesh(new THREE.BoxGeometry(W, 0.9, 0.2), M(0x64748b, { metalness: 0.3 })); wallL.position.set(0, 0.1, -D / 2 + 0.5 - 0.1); root.add(wallL);
      // 스크린 (앞쪽): 세기 막대
      const NB = 61, SCZ = D / 2 + 0.5 + 0.5, bars = new THREE.InstancedMesh(new THREE.BoxGeometry(W / NB * 0.9, 1, 0.25), M(0xfff3b0, { emissive: 0xfff3b0, emissiveIntensity: 0.35, roughness: 0.4 }), NB); root.add(bars);
      const scr = new THREE.Mesh(new THREE.BoxGeometry(W + 0.3, 0.15, 0.4), M(0x475569)); scr.position.set(0, -0.05, SCZ); root.add(scr);
      const l1 = label('파원 S₁', s1, { color: '#b45309', size: 12, offset: [0, 0.6, 0] }), l2 = label('파원 S₂', s2, { color: '#b45309', size: 12, offset: [0, 0.6, 0] });
      const lB = label('보강', [0, 0, 0], { color: '#15803d', size: 12 }), lD = label('상쇄', [0, 0, 0], { color: '#dc2626', size: 12 }), lS = label('스크린: 밝기', [0, -0.1, SCZ], { color: '#475569', size: 12, offset: [3.4, 0, 0.35] });
      const SZ = -D / 2 + 0.5;                 // 파원 z 위치
      const cA = new THREE.Color(0x1d6fd6), cB = new THREE.Color(0x0b2a52), cC = new THREE.Color(0xdff1ff);
      const tc = new THREE.Color();
      const kk = () => TAU / st.lam;
      function intensity(x, z) { const r1 = Math.hypot(x + st.d / 2, z - SZ), r2 = Math.hypot(x - st.d / 2, z - SZ), k = kk(); const re = Math.cos(k * r1) / Math.sqrt(r1 + 1) + Math.cos(k * r2) / Math.sqrt(r2 + 1), im = Math.sin(k * r1) / Math.sqrt(r1 + 1) + Math.sin(k * r2) / Math.sqrt(r2 + 1); return (re * re + im * im); }
      function txt() {
        const L = SCZ - SZ, dx = st.lam * L / st.d;
        info(st.view === 'wave'
          ? '<b>두 물결이 겹쳐요</b><br>마루와 마루가 만나면 <b style="color:#4ade80">보강</b>, 마루와 골이 만나면 <b style="color:#f87171">상쇄</b>예요.<br>파원 간격 d = ' + st.d.toFixed(1) + ' · 파장 λ = ' + st.lam.toFixed(1)
          : '<b>세기 무늬</b> (시간 평균)<br>밝은 띠 간격 Δx = λL/d ≈ <b>' + dx.toFixed(1) + '</b><br>λ가 크거나 d가 작을수록 무늬 간격이 넓어져요.');
        lB.obj = [0, 0.15, 3.0]; lB.off = [0, 0.3, 0];
        // 첫 상쇄선(경로차 λ/2) 위치
        const th = Math.asin(Math.min(0.99, st.lam / 2 / st.d)); lD.obj = [Math.tan(th) * (3.0 - SZ), 0.1, 3.0]; lD.off = [0, 0.3, 0];
        lB.show(true); lD.show(st.lam / 2 < st.d * 0.99);
      }
      function refreshView() { const inten = st.view === 'int'; ['wave'].forEach(() => {}); bars.visible = true; txt(); }
      controls.segment('보기', [{ value: 'wave', label: '🌊 물결' }, { value: 'int', label: '📊 세기 무늬' }], st.view, (v) => { st.view = v; txt(); });
      controls.range('파장 λ', 0.6, 1.6, 0.1, st.lam, (v) => { st.lam = v; txt(); }, (v) => v.toFixed(1));
      controls.range('파원 간격 d', 1.2, 4.0, 0.2, st.d, (v) => { st.d = v; txt(); }, (v) => v.toFixed(1));
      txt();
      const m4 = new THREE.Matrix4(); const px = pos.array, cl = col;
      return {
        update(dt) {
          st.t += dt; const k = kk(), w = 3.2, inten = st.view === 'int', A = 0.17;
          s1.position.x = -st.d / 2; s1.position.z = SZ; s2.position.x = st.d / 2; s2.position.z = SZ;
          for (let i = 0; i < pos.count; i++) {
            const x = px[i * 3], z = px[i * 3 + 2];
            let y, c = 0;
            if (inten) { const I = intensity(x, z); y = Math.min(0.9, I * 0.28); c = clamp(I / 3.4, 0, 1); }
            else {
              const r1 = Math.hypot(x + st.d / 2, z - SZ), r2 = Math.hypot(x - st.d / 2, z - SZ);
              const e1 = Math.exp(-r1 * 0.06) / Math.sqrt(1 + r1 * 0.35), e2 = Math.exp(-r2 * 0.06) / Math.sqrt(1 + r2 * 0.35);
              const f1 = r1 < w * st.t / k ? 1 : 0, f2 = r2 < w * st.t / k ? 1 : 0;
              y = A * 2.2 * (e1 * f1 * Math.sin(k * r1 - w * st.t) + e2 * f2 * Math.sin(k * r2 - w * st.t)); c = clamp(0.5 + y / (A * 4.4), 0, 1);
            }
            px[i * 3 + 1] = y;
            if (inten) tc.copy(cB).lerp(cC, c); else tc.copy(cB).lerp(cA, Math.min(1, c * 1.7)).lerp(cC, Math.max(0, c - 0.55) * 2.2);
            cl[i * 3] = tc.r; cl[i * 3 + 1] = tc.g; cl[i * 3 + 2] = tc.b;
          }
          pos.needsUpdate = true; geo.attributes.color.needsUpdate = true; geo.computeVertexNormals();
          if (st.t > 6 && st.t < 6.1) st.t = 6.1; 
          for (let i = 0; i < NB; i++) { const x = -W / 2 + W * (i + 0.5) / NB; const I = intensity(x, SCZ - 0.3), h = Math.max(0.02, Math.min(1.6, I * 0.45)); m4.makeScale(1, h, 1).setPosition(x, h / 2, SCZ); bars.setMatrixAt(i, m4); }
          bars.instanceMatrix.needsUpdate = true;
        },
        sync() {},
      };
    },
  });
})();
