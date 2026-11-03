/* hq-tunneling · 3D 터널 효과 (파동 함수의 나선 · 장벽 속에서 지수적으로 줄어드는 진폭 · 입자의 통과 확률)
   전자의 파동 함수 ψ를 (x, Re ψ, Im ψ)로 그리면 나선이에요. 장벽 안에서 진폭이 줄지만 0이 되지 않아 반대쪽에서 작은 진폭이 이어져요. 통과 확률 T = |ψ(오른쪽)|² (입사 = 1). */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  /* ---------- 공통 도우미 (모형 만들기) ---------- */
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches), KD = PHN ? 1.45 : 1;
  function H3(ctx) {
    const { THREE, root } = ctx;
    const V3 = THREE.Vector3, Yax = new V3(0, 1, 0);
    const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0.1 }, o || {}));
    const basic = (c, o) => new THREE.MeshBasicMaterial(Object.assign({ color: c }, o || {}));
    const glass = (c, op, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.25, metalness: 0.0, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide }, o || {}));
    /* 화살표 하나: setArrow(g, 시작점, 끝점) */
    function mkArrow(col, rad, o) {
      const g = new THREE.Group(); const m = (o && o.basic) ? basic(col) : mat(col, { roughness: 0.4, emissive: col, emissiveIntensity: 0.12 });
      const sh = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 1, 12), m);
      const hd = new THREE.Mesh(new THREE.ConeGeometry(rad * 2.6, rad * 6, 18), m);
      g.add(sh, hd); g.userData = { sh, hd, rad, m }; return g;
    }
    function setArrow(g, a, b) {
      const d = new V3().subVectors(b, a), len = d.length(); const { sh, hd, rad } = g.userData;
      if (len < 1e-3) { g.visible = false; return g; }
      g.visible = true; const hl = Math.min(len * 0.5, rad * 6);
      sh.scale.y = Math.max(0.001, len - hl); sh.position.y = (len - hl) / 2;
      hd.scale.y = hl / (rad * 6); hd.position.y = len - hl / 2;
      g.position.copy(a); g.quaternion.setFromUnitVectors(Yax, d.normalize()); return g;
    }
    /* 많은 화살표 (InstancedMesh): set(i, 위치, 방향, 길이, 색) 뒤에 flush() */
    function arrowSet(n, rad, o) {
      o = o || {};
      const sg = new THREE.CylinderGeometry(1, 1, 1, 8); sg.translate(0, 0.5, 0);
      const hg = new THREE.ConeGeometry(1, 1, 14); hg.translate(0, 0.5, 0);
      const m = mat(0xffffff, { roughness: 0.45, emissive: 0xffffff, emissiveIntensity: 0.18 });
      const sh = new THREE.InstancedMesh(sg, m, n), hd = new THREE.InstancedMesh(hg, m, n);
      const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new V3(), S = new V3(), C = new THREE.Color();
      const zero = new THREE.Matrix4().makeScale(0, 0, 0);
      for (let i = 0; i < n; i++) { sh.setMatrixAt(i, zero); hd.setMatrixAt(i, zero); sh.setColorAt(i, C.set(0xffffff)); hd.setColorAt(i, C); }
      const grp = new THREE.Group(); grp.add(sh, hd);
      return {
        group: grp, n,
        set(i, p, dir, len, col) {
          if (len < 0.02) { sh.setMatrixAt(i, zero); hd.setMatrixAt(i, zero); return; }
          const hl = Math.min(len * 0.55, rad * 6.5), hr = Math.min(rad * 2.7, hl * 0.5);
          Q.setFromUnitVectors(Yax, dir);
          S.set(rad, Math.max(0.001, len - hl), rad); M.compose(p, Q, S); sh.setMatrixAt(i, M);
          P.copy(dir).multiplyScalar(len - hl).add(p); S.set(hr, hl, hr); M.compose(P, Q, S); hd.setMatrixAt(i, M);
          if (col != null) { C.set(col); sh.setColorAt(i, C); hd.setColorAt(i, C); }
        },
        hide(i) { sh.setMatrixAt(i, zero); hd.setMatrixAt(i, zero); },
        flush() { sh.instanceMatrix.needsUpdate = hd.instanceMatrix.needsUpdate = true; if (sh.instanceColor) sh.instanceColor.needsUpdate = hd.instanceColor.needsUpdate = true; },
      };
    }
    /* 가는 막대(선분): setSeg(m, a, b) */
    function mkSeg(col, rad, o) { return new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 1, 8), (o && o.basic) ? basic(col, o.mo) : mat(col, o && o.mo)); }
    function setSeg(m, a, b) { const d = new V3().subVectors(b, a), l = d.length(); if (l < 1e-3) { m.visible = false; return m; } m.visible = true; m.scale.y = l; m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(Yax, d.normalize()); return m; }
    function anchor(g, x, y, z) { const o = new THREE.Object3D(); o.position.set(x || 0, y || 0, z || 0); g.add(o); return o; }
    function sphere(r, c, o) { return new THREE.Mesh(new THREE.SphereGeometry(r, r < 0.35 ? 22 : 36, r < 0.35 ? 14 : 24), mat(c, o)); }
    function tube(pts, r, c, o) {
      const curve = Array.isArray(pts) ? new THREE.CatmullRomCurve3(pts) : pts;
      return new THREE.Mesh(new THREE.TubeGeometry(curve, (o && o.seg) || 80, r, (o && o.rs) || 8, !!(o && o.closed)), (o && o.basic) ? basic(c, o.mo) : mat(c, o && o.mo));
    }
    function box(w, h, d, c, o) { return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c, o)); }
    function cyl(rt, rb, h, c, o, seg) { return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 32), mat(c, o)); }
    function fib(n) { // 구 위에 고르게 퍼진 방향
      const out = [], ga = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < n; i++) { const y = 1 - (i + 0.5) / n * 2, r = Math.sqrt(1 - y * y), a = ga * i; out.push(new V3(Math.cos(a) * r, y, Math.sin(a) * r)); }
      return out;
    }
    /* 장면별 조작 줄: grab(장면, 만들기) → 나중에 showCtl(장면) */
    const bar = ctx.renderer.domElement.parentNode.parentNode.querySelector('.v3-ctl');
    const ctlBy = {};
    function grab(sc, fn) { const b = bar.children.length; const r = fn(); (ctlBy[sc] = ctlBy[sc] || []).push.apply(ctlBy[sc], [].slice.call(bar.children, b)); return r; }
    function showCtl(sc) { Object.keys(ctlBy).forEach((k) => ctlBy[k].forEach((n) => { n.style.display = (k === sc || k === '*') ? '' : 'none'; })); }
    function toggleBtn(sc, text, on, fn) {
      const b = grab(sc, () => ctx.controls.button('', () => { on = !on; draw(); fn(on); }));
      const draw = () => { b.textContent = text + (on ? ' ✓' : ' ✕'); b.classList.toggle('on', on); };
      draw(); return { set(v) { on = v; draw(); }, get on() { return on; } };
    }
    return { V3, Yax, mat, basic, glass, mkArrow, setArrow, arrowSet, mkSeg, setSeg, anchor, sphere, tube, box, cyl, fib, grab, showCtl, toggleBtn };
  }
  /* 복소수 [re, im] */
  const cadd = (a, b) => [a[0] + b[0], a[1] + b[1]], csub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const cmul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
  const cdiv = (a, b) => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; };
  const cs = (a, s) => [a[0] * s, a[1] * s], cexp = (th) => [Math.cos(th), Math.sin(th)], cabs2 = (a) => a[0] * a[0] + a[1] * a[1];

  window.SciSim3D.attach({
    title: '터널 효과 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: 16.5 * KD, theta: 0.45, phi: 1.22, min: 8, max: 34, target: [0.5, 0.0, 0] },
    autoRotate: 0,
    levels: [0, 1],
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const h = H3(ctx); const { V3, mat, glass, anchor, sphere, box, cyl, tube } = h;
      const st = { E: 3, V0: 5, L: 1.4, auto: true };
      const XL = -9, XR = 9, YB = -2.5;
      /* 장벽 */
      const barr = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), glass(0xffb347, 0.3, { emissive: 0xff9a2b, emissiveIntensity: 0.2 })); root.add(barr);
      const barrE = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color: 0xffd08a })); barr.add(barrE);
      const axis = tube([new V3(XL, 0, 0), new V3(XR + 1, 0, 0)], 0.015, 0x94a3b8, { seg: 2, rs: 6, basic: true, mo: { transparent: true, opacity: 0.5 } }); root.add(axis);
      /* 나선 (구간별 색) */
      const gHelix = new THREE.Group(); root.add(gHelix);
      const cols = [0x4da3ff, 0xffb347, 0x3ddc84];
      const mats = cols.map((c) => mat(c, { emissive: c, emissiveIntensity: 0.35, roughness: 0.35 }));
      let meshes = [], areas = [], wall = null;
      const back = new THREE.Mesh(new THREE.PlaneGeometry(2 * XR, 4), new THREE.MeshBasicMaterial({ color: 0x1a2340, transparent: true, opacity: 0.55, side: THREE.DoubleSide })); back.position.set(0, YB + 1.2, -3.4); root.add(back);
      const aSh = anchor(root, 0, 0, 0);
      const lI = label('입사파', anchor(root, -5.5, 1.7, 0), { color: '#1d4ed8', size: 13 }), lB = label('장벽 속: 지수적으로 감소', aSh, { color: '#b45309', size: 12 }), lT = label('투과파 (작은 진폭)', anchor(root, 5.5, 1.1, 0), { color: '#15803d', size: 13 });
      const lPr = label('확률 밀도 |ψ|²', anchor(root, -6.2, YB + 2.6, -3.4), { color: '#475569', size: 12 });
      const lBall = label('', anchor(root, 0, 0, 0), { color: '#a16207', size: 12 });
      function solve() {
        const k = Math.sqrt(st.E), kap = Math.sqrt(st.V0 - st.E), L = st.L;
        const ik = [0, k];
        const psiL = [1, 0], dpsiL = cmul(ik, psiL);
        const II = (x) => { const c = Math.cosh(kap * (x - L)), s = Math.sinh(kap * (x - L)); return [cadd(cs(psiL, c), cs(dpsiL, s / kap)), cadd(cs(psiL, kap * s), cs(dpsiL, c))]; };
        const [p0, d0] = II(0);
        const q = cdiv(d0, ik), a = cs(cadd(p0, q), 0.5), b = cs(csub(p0, q), 0.5);
        const an = a;
        const norm = (z) => cdiv(z, an);
        const bn = norm(b), t = norm(psiL);
        const psi = (x) => {
          if (x < 0) return cadd(cexp(k * x), cmul(bn, cexp(-k * x)));
          if (x <= L) return norm(II(x)[0]);
          return cmul(t, cexp(k * (x - L)));
        };
        return { psi, T: cabs2(t), R: cabs2(bn), k };
      }
      let sol = solve();
      function sample(x0, x1, step) { const out = []; for (let x = x0; x <= x1 + 1e-9; x += step) out.push(x); return out; }
      function rebuild() {
        sol = solve();
        meshes.forEach((m) => { gHelix.remove(m); m.geometry.dispose(); }); meshes = [];
        areas.forEach((m) => { root.remove(m); m.geometry.dispose(); }); areas = [];
        const L = st.L, S = 1.0;
        const parts = [[XL, 0, 0], [0, L, 1], [L, L + (XR - L), 2]];
        const stepFor = (i) => (i === 1 ? Math.max(0.02, L / 40) : 0.06);
        parts.forEach((pr, i) => {
          const xs = sample(pr[0], pr[1], stepFor(i)); if (xs.length < 3) return;
          const pts = xs.map((x) => { const z = sol.psi(x); return new V3(x, z[0] * S, z[1] * S); });
          const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), Math.min(900, xs.length * 2), 0.05, 8, false), mats[i]); gHelix.add(m); meshes.push(m);
        });
        // 확률 밀도 영역 (뒷벽)
        const all = []; parts.forEach((pr, i) => sample(pr[0], pr[1], stepFor(i)).forEach((x) => all.push(x)));
        const shp = new THREE.Shape(); shp.moveTo(all[0], YB);
        all.forEach((x) => { const z = sol.psi(x); shp.lineTo(x, YB + 0.62 * cabs2(z)); }); shp.lineTo(all[all.length - 1], YB); shp.lineTo(all[0], YB);
        const am = new THREE.Mesh(new THREE.ShapeGeometry(shp), new THREE.MeshBasicMaterial({ color: 0x6ee7b7, transparent: true, opacity: 0.8, side: THREE.DoubleSide })); am.position.z = -3.38; root.add(am); areas.push(am);
        barr.scale.set(Math.max(0.05, L), 6.4, 4.2); barr.position.set(L / 2, 0.45, 0);
        aSh.position.set(L / 2, 1.9, 0); lB.show(true);
        const T = sol.T;
        info('<b>E = ' + st.E.toFixed(1) + ' < V₀ = ' + st.V0.toFixed(1) + '</b> — 고전 입자라면 장벽을 넘을 수 없어요.<br>파동 함수는 장벽 속에서 <b>지수적으로 줄지만 0이 아니라서</b> 반대쪽으로 새어 나와요.<br>통과 확률 T ≈ <b>' + (T >= 0.1 ? (T * 100).toFixed(0) : (T * 100).toFixed(1)) + ' %</b> · 장벽이 두껍거나 높을수록 T가 급격히 줄어요.');
      }
      /* 입자 (확률로 통과) */
      const LANE = 3.1, balls = [];
      for (let i = 0; i < 5; i++) { const m = sphere(0.24, 0x7dd3fc, { emissive: 0x38bdf8, emissiveIntensity: 0.8, transparent: true, opacity: 0.95 }); m.visible = false; root.add(m); balls.push({ m, on: false, x: 0, v: 1, dir: 1, pass: false, decided: false }); }
      let spawn = 0.4, tries = 0, passes = 0, T2d = null, lsig = '';
      function resetCount() { tries = passes = 0; balls.forEach((b) => { b.on = false; b.m.visible = false; }); }
      rebuild();
      return {
        update(dt, t) {
          dt = Math.min(dt, 0.05);
          { const sim = window.__sim; if (sim && sim.S) { const S = sim.S, P = S.pr; let g = S.mode;
              if (S.mode === 'prob') g += '|' + P.v + '|' + P.vh + '|' + P.part;
              if (g !== lsig) { lsig = g;
                if (S.mode === 'prob') {
                  const dV = +P.vh, m = P.part === 'p' ? 1836.15 : 1, d = P.v / 10, kap2 = 5.123 * Math.sqrt(dV * m);
                  st.E = 3; st.V0 = 5; st.L = Math.max(0.3, Math.min(3.4, kap2 * d / Math.sqrt(2))); T2d = Math.exp(-2 * kap2 * d); rebuild(); resetCount();
                  info('<b>장벽과 확률</b>: ' + (P.part === 'p' ? '양성자' : '전자') + ', 장벽 높이 ' + dV.toFixed(1) + ' eV, 두께 ' + d.toFixed(1) + ' nm<br>모형 통과 확률 T = ' + (T2d >= 0.01 ? (T2d * 100).toFixed(1) + ' %' : T2d.toExponential(1)) + ' — 두꺼울수록 급격히 줄어요 (그림의 두께는 비율에 맞게 줄여 그렸어요).');
                } else { T2d = null; st.E = 3; st.V0 = 5; st.L = 1.4; rebuild(); resetCount(); }
              } } }
          gHelix.rotation.x = -t * 1.4;                                      // 위상 e^{−iEt}: 나선이 돌아요
          spawn -= dt; if (spawn <= 0) { spawn = 0.9; const b = balls.find((q) => !q.on); if (b) { b.on = true; b.x = XL + 1; b.dir = 1; b.decided = false; b.pass = false; b.m.visible = true; b.m.material.color.setHex(0x7dd3fc); b.m.material.emissive.setHex(0x38bdf8); } }
          balls.forEach((b) => {
            if (!b.on) return;
            b.x += b.dir * 6 * dt;
            if (!b.decided && b.dir > 0 && b.x >= 0) { b.decided = true; tries++; b.pass = Math.random() < (T2d != null ? T2d : sol.T); if (b.pass) { passes++; b.m.material.color.setHex(0x4ade80); b.m.material.emissive.setHex(0x22c55e); } }
            if (b.decided && b.pass && b.x > st.L && b.dir > 0) { /* 통과: 계속 직진 */ }
            if (b.decided && !b.pass && b.dir > 0 && b.x >= 0) { b.x = 0; b.dir = -1; b.m.material.color.setHex(0xfb7185); b.m.material.emissive.setHex(0xe11d48); }
            b.m.position.set(b.x, LANE, 0);
            b.m.scale.setScalar(b.decided && b.pass && b.x > 0 && b.x < st.L ? 0.55 : 1);
            if (b.x > XR || b.x < XL - 0.5) { b.on = false; b.m.visible = false; }
          });
          lBall.set('시도 ' + tries + '회 중 통과 ' + passes + '회'); lBall.obj = aSh; lBall.off = [0, 1.7, 0];
        },
        sync() { lsig = ''; },
      };
    },
  });
})();
