/* hq-optical-instruments · 3D 렌즈를 지나는 평행광 (볼록·오목 렌즈 · 구면 수차 · 색수차 · 스크린의 상)
   볼록 렌즈는 평행광을 초점에 모으고, 오목 렌즈는 퍼뜨려요. 실제 구면 렌즈는 가장자리를 지난 빛이 더 일찍 모이고(구면 수차), 색마다 굴절률이 달라 초점이 달라요(색수차). */
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
  const MODE2SC = {};
  window.SciSim3D.attach({
    title: '렌즈와 광선 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: 19 * KD, theta: 0.4, phi: 1.15, min: 7, max: 34, target: [1.5, 0, 0] },
    autoRotate: 0,
    levels: [0, 3],
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const h = H3(ctx); const { V3, mat, glass, anchor, sphere, box, cyl, tube } = h;
      const lessonS = () => (window.__sim && window.__sim.S) || null;
      const S0 = lessonS();
      const st = { type: S0 && S0.pt && S0.pt.part === 'concave' ? 'concave' : 'convex', ap: 2.0, chroma: false, real: true, xs: 5 };
      const R = 5, HMAX = 2.1, NR = 1.5;
      const IDX = { r: 1.485, g: 1.515, b: 1.55 };
      /* 렌즈 모양 (회전체) */
      let lensMesh = null;
      const sag = (rho) => R - Math.sqrt(R * R - rho * rho);
      function buildLens() {
        if (lensMesh) { root.remove(lensMesh); lensMesh.geometry.dispose(); }
        const pts = [], N = 24, convex = st.type === 'convex', t = convex ? 1.2 : 0.35;
        const xf = (rho) => (convex ? -t / 2 + sag(rho) : -t / 2 - sag(rho)), xr = (rho) => (convex ? t / 2 - sag(rho) : t / 2 + sag(rho));
        for (let i = 0; i <= N; i++) { const rho = HMAX * i / N; pts.push(new THREE.Vector2(rho, xf(rho))); }
        for (let i = N; i >= 0; i--) { const rho = HMAX * i / N; pts.push(new THREE.Vector2(rho, xr(rho))); }
        const g = new THREE.LatheGeometry(pts, 64); g.rotateZ(-Math.PI / 2);
        lensMesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xbfe6ff, roughness: 0.06, metalness: 0.0, transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false }));
        root.add(lensMesh);
      }
      /* 광학 축 · 초점 */
      const axis = tube([new V3(-7.5, 0, 0), new V3(11, 0, 0)], 0.012, 0x94a3b8, { seg: 2, rs: 6, basic: true, mo: { transparent: true, opacity: 0.55 } }); root.add(axis);
      const fp = sphere(0.1, 0xffe14d, { emissive: 0xffc800, emissiveIntensity: 1 }); root.add(fp);
      const fvirt = sphere(0.1, 0xffe14d, { emissive: 0xffc800, emissiveIntensity: 1, transparent: true, opacity: 0.55 }); root.add(fvirt);
      /* 광선 (InstancedMesh) */
      const NRAY = 4 * 8 * 3 + 3, NSEG = NRAY * 4;
      const segG = new THREE.CylinderGeometry(1, 1, 1, 6); segG.translate(0, 0.5, 0);
      const segs = new THREE.InstancedMesh(segG, new THREE.MeshBasicMaterial({ color: 0xffffff }), NSEG); root.add(segs);
      const Mx = new THREE.Matrix4(), Qq = new THREE.Quaternion(), Pp = new V3(), Ss = new V3(), Cc = new THREE.Color(), zero = new THREE.Matrix4().makeScale(0, 0, 0);
      for (let i = 0; i < NSEG; i++) { segs.setMatrixAt(i, zero); segs.setColorAt(i, Cc.set(0xffffff)); }
      let nseg = 0;
      function seg(a, b, col, rad) { const d = new V3().subVectors(b, a), l = d.length(); if (l < 1e-4 || nseg >= NSEG) return; Qq.setFromUnitVectors(h.Yax, d.multiplyScalar(1 / l)); Ss.set(rad, l, rad); Mx.compose(a, Qq, Ss); segs.setMatrixAt(nseg, Mx); segs.setColorAt(nseg, Cc.set(col)); nseg++; }
      /* 스크린과 점 */
      const scr = new THREE.Mesh(new THREE.CircleGeometry(2.4, 48), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8, transparent: true, opacity: 0.8, side: THREE.DoubleSide })); scr.rotation.y = Math.PI / 2; root.add(scr);
      const scrR = new THREE.Mesh(new THREE.RingGeometry(2.4, 2.5, 48), mat(0x94a3b8, { metalness: 0.4 })); scrR.rotation.y = Math.PI / 2; root.add(scrR);
      const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), NRAY); root.add(dots);
      const lLens = label('', lensMesh || root, { color: '#0369a1', size: 13 });
      const aL = anchor(root, 0, 2.7, 0); lLens.obj = aL;
      const aF = anchor(root, 0, 0.55, 0), lF = label('초점 F', aF, { color: '#a16207', size: 13 });
      const aS = anchor(root, 0, -2.9, 0), lS = label('스크린', aS, { color: '#475569', size: 12 });
      const aLight = anchor(root, -6.2, 1.6, 0), lLight = label('평행광', aLight, { color: '#475569', size: 12 });
      const aBlur = anchor(root, 0, 2.9, 0), lBlur = label('', aBlur, { color: '#b45309', size: 12 });
      /* 광선 추적 (벡터 스넬 법칙) */
      function refract(d, n, eta) { // n은 광선이 오는 쪽을 향함, eta = n1/n2
        const c = -n.dot(d), k = 1 - eta * eta * (1 - c * c); if (k < 0) return null;
        return d.clone().multiplyScalar(eta).addScaledVector(n, eta * c - Math.sqrt(k)).normalize();
      }
      function hitSphere(p, d, c, vx) { // 구와 직선의 두 교점 중 꼭짓점 x(vx)에 가까운 쪽
        const oc = p.clone().sub(c), b = oc.dot(d), cc = oc.dot(oc) - R * R, disc = b * b - cc; if (disc < 0) return null;
        const s1 = -b - Math.sqrt(disc), s2 = -b + Math.sqrt(disc), p1 = p.clone().addScaledVector(d, s1), p2 = p.clone().addScaledVector(d, s2);
        return Math.abs(p1.x - vx) < Math.abs(p2.x - vx) ? p1 : p2;
      }
      function trace(y0, z0, n) {
        const convex = st.type === 'convex', t = convex ? 1.2 : 0.35;
        const p0 = new V3(-6.5, y0, z0), d0 = new V3(1, 0, 0);
        const cF = new V3(convex ? -t / 2 + R : -t / 2 - R, 0, 0), cR = new V3(convex ? t / 2 - R : t / 2 + R, 0, 0);
        const A = hitSphere(p0, d0, cF, -t / 2); if (!A) return null;
        let nA = A.clone().sub(cF).normalize(); if (nA.dot(d0) > 0) nA.negate();
        const d1 = refract(d0, nA, 1 / n); if (!d1) return null;
        const B = hitSphere(A, d1, cR, t / 2); if (!B) return null;
        let nB = B.clone().sub(cR).normalize(); if (nB.dot(d1) < 0) nB.negate(); nB.negate();            // 바깥쪽에서 안쪽 방향이 아닌, 광선이 오는 쪽(안쪽)을 향하게
        nB = B.clone().sub(cR).normalize(); if (nB.dot(d1) > 0) nB.negate();
        const d2 = refract(d1, nB, n); if (!d2) return null;
        return { p0, A, B, d2 };
      }
      let hits = [];
      function build() {
        nseg = 0; hits = [];
        const convex = st.type === 'convex', ap = st.ap, cols = st.chroma ? [['r', 0xff5a5a], ['g', 0x4ade80], ['b', 0x6aa8ff]] : [['g', 0xfff3b0]];
        const f = R / (2 * (NR - 1));
        const rings = [0.35, 0.68, 1.0], na = 8;
        const rays = [[0, 0]]; rings.forEach((q) => { for (let a = 0; a < na; a++) rays.push([ap * q * Math.cos(a / na * Math.PI * 2 + 0.2), ap * q * Math.sin(a / na * Math.PI * 2 + 0.2)]); });
        const XE = 9, th = 0.02;
        cols.forEach(([k, col]) => {
          const n = st.chroma ? IDX[k] : NR;
          rays.forEach(([y, z]) => {
            if (!st.real) {
              const P = new V3(-6.5, y, z), M = new V3(0, y, z);
              seg(P, M, col, th);
              if (convex) { const F = new V3(f, 0, 0), d = F.clone().sub(M).normalize(), e = M.clone().addScaledVector(d, (XE - 0) / d.x); seg(M, e, col, th); hits.push([M, d, col]); }
              else { const F = new V3(-f, 0, 0), d = M.clone().sub(F).normalize(), e = M.clone().addScaledVector(d, XE / d.x); seg(M, e, col, th); hits.push([M, d, col]); seg(M, F, 0xfbbf24, th * 0.6); }
              return;
            }
            const T = trace(y, z, n); if (!T) return;
            seg(T.p0, T.A, col, th); seg(T.A, T.B, col, th);
            const e = T.B.clone().addScaledVector(T.d2, (XE - T.B.x) / T.d2.x); seg(T.B, e, col, th); hits.push([T.B, T.d2, col]);
          });
        });
        segs.instanceMatrix.needsUpdate = true; segs.instanceColor.needsUpdate = true;
        for (let i = nseg; i < NSEG; i++) segs.setMatrixAt(i, zero); segs.instanceMatrix.needsUpdate = true;
        placeScreen();
      }
      function placeScreen() {
        const convex = st.type === 'convex', f = R / (2 * (NR - 1));
        scr.visible = scrR.visible = convex; lS.show(convex); fp.visible = convex; fvirt.visible = !convex; lF.show(true);
        fp.position.set(f, 0, 0); fvirt.position.set(-f, 0, 0); aF.position.set(convex ? f : -f, 0.55, 0); lF.set(convex ? '초점 F' : '허초점 F′');
        scr.position.set(st.xs, 0, 0); scrR.position.set(st.xs, 0, 0); aS.position.set(st.xs, -2.9, 0);
        let sum = 0, cnt = 0, M2 = new THREE.Matrix4(), C = new THREE.Color(); let k = 0;
        hits.forEach(([B, d, col]) => {
          if (!convex) return;
          const s = (st.xs - B.x) / d.x, p = B.clone().addScaledVector(d, s);
          M2.makeTranslation(p.x - 0.02, p.y, p.z); dots.setMatrixAt(k, M2); dots.setColorAt(k, C.set(col)); k++;
          sum += p.y * p.y + p.z * p.z; cnt++;
        });
        for (; k < NRAY; k++) dots.setMatrixAt(k, zero);
        dots.instanceMatrix.needsUpdate = true; if (dots.instanceColor) dots.instanceColor.needsUpdate = true;
        const rms = cnt ? Math.sqrt(sum / cnt) : 0;
        lBlur.show(convex); lBlur.set(rms < 0.1 ? '상이 선명해요' : '번진 크기 ' + rms.toFixed(1)); lBlur.el.style.background = rms < 0.1 ? '#15803d' : '#c2410c';
        aBlur.position.set(st.xs, 2.9, 0);
        const ab = st.real ? (st.chroma ? '색마다 초점이 달라 가장자리에 <b>무지개 번짐</b>(색수차)이 생겨요.' : '가장자리 빛이 <b>더 가까운 곳</b>에서 모여요 (구면 수차). 조리개를 줄이면 줄어요.') : '이상적인 렌즈는 모든 빛을 한 점 F에 모아요.';
        info(convex ? '<b>볼록 렌즈</b>는 평행광을 모아요.<br>' + ab + '<br>스크린을 앞뒤로 움직여 가장 선명한 곳을 찾아보세요.' : '<b>오목 렌즈</b>는 평행광을 퍼뜨려요.<br>퍼진 빛의 연장선은 렌즈 앞쪽의 허초점 F′에서 나온 것처럼 보여요.<br>상을 스크린에 맺을 수는 없어요.');
      }
      const typeSeg = controls.segment('렌즈', [{ value: 'convex', label: '볼록' }, { value: 'concave', label: '오목' }], st.type, (v) => { st.type = v; buildLens(); build(); });
      controls.range('조리개', 0.8, 2.0, 0.2, st.ap, (v) => { st.ap = v; build(); }, (v) => '지름 ' + (v / 2).toFixed(1) + '배');
      controls.range('스크린 위치', 3, 9, 0.25, st.xs, (v) => { st.xs = v; placeScreen(); }, (v) => v.toFixed(1));
      h.toggleBtn('*', '구면 수차 보기', true, (on) => { st.real = on; build(); });
      h.toggleBtn('*', '색수차', false, (on) => { st.chroma = on; build(); });
      buildLens(); build();
      aL.position.set(0, 2.55, 0); lLens.set('렌즈');
      return { update() {}, sync() {} };
    },
  });
})();
