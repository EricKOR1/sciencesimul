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
    levels: [1, 2, 3],   // 1단계는 캔버스 축의 눈금으로 상의 위치 b를 읽어야 해서 2D
    build(ctx) {
      const { THREE, root: root0, label, controls } = ctx;
      const h = H3(ctx); const { V3, mat, glass, anchor, sphere, box, cyl, tube, mkSeg, setSeg, mkArrow, setArrow, showCtl } = h;
      const labs = {}; const L = (sc, text, obj, o) => { const l = label(text, obj, o); const raw = l.set; let last = text; l.set = (t) => { if (t !== last) { last = t; raw(t); } }; (labs[sc] = labs[sc] || []).push(l); return l; };
      let lastInfo = ''; const info = (hh) => { if (hh !== lastInfo) { lastInfo = hh; ctx.info(hh); } };
      const root = new THREE.Group(); root0.add(root);                      // 렌즈 광선 장면
      const gO = new THREE.Group(); root0.add(gO);                           // 거울 · 프리즘 · 작도 · 망원경 · 현미경
      const st = { type: 'convex', ap: 2.0, chroma: false, real: true, xs: 5, A: Infinity, disp: 1 };
      const R = 5, HMAX = 2.1, NR = 1.5;
      const IDX = { r: 1.485, g: 1.515, b: 1.55 };
      const idxOf = (k) => 1.515 + (IDX[k] - 1.515) * st.disp;
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
      const lLens = L('lens', '', root, { color: '#0369a1', size: 13 });
      const aL = anchor(root, 0, 2.7, 0); lLens.obj = aL;
      const aF = anchor(root, 0, 0.55, 0), lF = L('lens', '초점 F', aF, { color: '#a16207', size: 13 });
      const aS = anchor(root, 0, -2.9, 0), lS = L('lens', '스크린', aS, { color: '#475569', size: 12 });
      const aLight = anchor(root, -6.2, 1.6, 0), lLight = L('lens', '평행광', aLight, { color: '#475569', size: 12 });
      const aBlur = anchor(root, 0, 2.9, 0), lBlur = L('lens', '', aBlur, { color: '#b45309', size: 12 });
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
        let p0 = new V3(-6.5, y0, z0), d0 = new V3(1, 0, 0);
        if (isFinite(st.A)) { const S0p = new V3(-st.A, 0, 0), tgt = new V3(-t / 2, y0, z0); d0 = tgt.clone().sub(S0p).normalize(); p0 = tgt.clone().addScaledVector(d0, (-6.5 - tgt.x) / d0.x); }
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
      let hits = [], infoFn = null, sharpFn = null;   // sharpFn: 2D와 같은 '선명' 판정 (카메라 · 구면 수차)
      function build() {
        nseg = 0; hits = [];
        const convex = st.type === 'convex', ap = st.ap, cols = st.chroma ? [['r', 0xff5a5a], ['g', 0x4ade80], ['b', 0x6aa8ff]] : [['g', 0xfff3b0]];
        const f = R / (2 * (NR - 1));
        const rings = [0.35, 0.68, 1.0], na = 8;
        const rays = [[0, 0]]; rings.forEach((q) => { for (let a = 0; a < na; a++) rays.push([ap * q * Math.cos(a / na * Math.PI * 2 + 0.2), ap * q * Math.sin(a / na * Math.PI * 2 + 0.2)]); });
        const XE = 9, th = 0.02;
        cols.forEach(([k, col]) => {
          const n = st.chroma ? idxOf(k) : NR;
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
        const sharp = sharpFn ? sharpFn() : rms < 0.1; lBlur.show(convex); lBlur.set(sharp ? '상이 선명해요' : '번진 크기 ' + rms.toFixed(1)); lBlur.el.style.background = sharp ? '#15803d' : '#c2410c';
        aBlur.position.set(st.xs, 2.9, 0);
        const ab = st.real ? (st.chroma ? '색마다 초점이 달라 가장자리에 <b>무지개 번짐</b>(색수차)이 생겨요.' : '가장자리 빛이 <b>더 가까운 곳</b>에서 모여요 (구면 수차). 조리개를 줄이면 줄어요.') : '이상적인 렌즈는 모든 빛을 한 점 F에 모아요.';
        info(infoFn ? infoFn(rms, convex) : (convex ? '<b>볼록 렌즈</b>는 평행광을 모아요.<br>' + ab + '<br>스크린을 앞뒤로 움직여 가장 선명한 곳을 찾아보세요.' : '<b>오목 렌즈</b>는 평행광을 퍼뜨려요.<br>퍼진 빛의 연장선은 렌즈 앞쪽의 허초점 F′에서 나온 것처럼 보여요.<br>상을 스크린에 맺을 수는 없어요.'));
      }
      /* ================= 렌즈 이외의 장면 (거울 · 프리즘 · 작도 · 망원경 · 현미경 · 쌍안경) ================= */
      const FU = 5;                                                   // 초점거리 F = 10 cm → 5 (1 cm = 0.5)
      let oKey = '';
      const oSegs = [], oLab = [0, 1, 2, 3, 4, 5].map(() => { const a = anchor(gO), l = L('other', '', a, { color: '#475569', size: 12 }); return { a, l }; });
      function oClear() { oSegs.forEach((m) => { gO.remove(m); m.geometry.dispose(); }); oSegs.length = 0; for (let i = gO.children.length - 1; i >= 0; i--) { const c = gO.children[i]; if (c.userData && c.userData.tmp) { gO.remove(c); c.traverse((q) => { if (q.geometry) q.geometry.dispose(); }); } } }
      function seg2(a, b, col, rad, op) { const m = mkSeg(col, rad || 0.03, { basic: true, mo: op != null ? { transparent: true, opacity: op } : undefined }); setSeg(m, a, b); gO.add(m); oSegs.push(m); return m; }
      function poly(pts, col, rad, op) { for (let i = 0; i < pts.length - 1; i++) seg2(pts[i], pts[i + 1], col, rad, op); }
      const A = (o, q) => { if (q.position) o.position.copy(q.position); if (q.rotation) o.rotation.copy(q.rotation); return o; };
      function tmp(o) { o.userData.tmp = true; gO.add(o); return o; }
      function setLab(i, text, x, y, color) { const o = oLab[i]; o.a.position.set(x, y, 0); o.l.set(text); if (color) o.l.el.style.background = color; o.l.show(!!(labs.other && labs.other.on) && !!text); }
      const v = (x, y) => new V3(x, y, 0);
      function oScene(S, sim) {
        const m = S.mode;
        let key = '', kind = '';
        if (m === 'parts') kind = S.pt.view === 'draw' ? 'draw' : (S.pt.part === 'convex' || S.pt.part === 'concave' ? 'lens' : S.pt.part === 'prism' ? 'prism:' + S.pt.prism : S.pt.part);
        else if (m === 'scope') kind = 'scope:' + S.sc.view;
        else if (m === 'aber') kind = S.ab.view === 'b' && S.ab.el === 'mirror' ? 'cmirror' : 'lens';
        else kind = 'lens';
        key = kind + '|' + (kind === 'draw' ? S.pt.a + '|' + S.pt.ans : kind.indexOf('scope') === 0 ? S.sc.tube + '|' + S.sc.mic : '') + '|' + S.gate;
        return { kind, key };
      }
      function buildOther(kind, S, sim) {
        oClear(); for (let i = 0; i < oLab.length; i++) setLab(i, '');
        const W = 0xfff3b0, ys = [-1.6, -0.9, 0.9, 1.6], ctl = ctx.orbit; ctl.tx = 0; ctl.ty = 0; ctl.theta = 0.3; ctl.phi = 1.35; ctl.dist = 15 * KD;
        if (kind === 'cmirror' || kind === 'vmirror') {
          const cc = kind === 'cmirror', f = FU;
          const mp = []; for (let i = -12; i <= 12; i++) { const y = i * 0.2; mp.push(v(cc ? -y * y / (4 * f) : y * y / (4 * f), y)); }
          tmp(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(mp), 40, 0.07, 6, false), mat(0xe2e8f0, { metalness: 0.9, roughness: 0.15 })));
          const F = cc ? v(-f, 0) : v(f, 0);
          ys.forEach((y) => { const M = v(cc ? -y * y / (4 * f) : y * y / (4 * f), y); seg2(v(-9, y), M, W, 0.03);
            if (cc) { const d = F.clone().sub(M).normalize(); seg2(M, M.clone().addScaledVector(d, 7), W, 0.03); } else { const d = M.clone().sub(F).normalize(); seg2(M, M.clone().addScaledVector(d, 7), W, 0.03); seg2(M, F, 0xfbbf24, 0.015, 0.55); } });
          tmp(A(new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8), mat(0xffe14d, { emissive: 0xffc800, emissiveIntensity: 1 })), { position: F }));
          setLab(0, cc ? '초점 F (빛이 모여요)' : '허초점 F′ (퍼진 빛의 연장선)', F.x, 0.7, '#a16207'); setLab(1, cc ? '오목 거울' : '볼록 거울', 0, 2.6, '#0369a1'); setLab(2, '평행광', -7, 2.1);
          info(cc ? '<b>오목 거울</b>은 평행광을 한 점 F에 모아요 (초점거리 10 cm).<br>반사의 법칙으로 빛이 반사돼요. 망원경·손전등에 써요.' : '<b>볼록 거울</b>은 평행광을 퍼뜨려요.<br>퍼진 빛의 연장선은 거울 뒤쪽의 한 점에서 나온 것처럼 보여요. 자동차 측면 거울에 써요.');
        } else if (kind === 'pmirror') {
          tmp(new THREE.Mesh(new THREE.BoxGeometry(0.14, 4.4, 1.6), mat(0xe2e8f0, { metalness: 0.9, roughness: 0.15 })));
          const th = 0.5; // 비스듬히 입사
          [-1.2, 0, 1.2].forEach((y) => { const M = v(0, y), d = v(Math.cos(th), Math.sin(th)); seg2(M.clone().addScaledVector(d, -6), M, W, 0.03); seg2(M, M.clone().add(v(-d.x * 6, d.y * 6)), W, 0.03); });
          seg2(v(-3, 0), v(0, 0), 0x94a3b8, 0.012, 0.6); setLab(0, '평면 거울', 0, 2.6, '#0369a1'); setLab(1, '입사각 = 반사각', -3.5, 2.4, '#0f766e');
          info('<b>평면 거울</b>: 반사의 법칙(입사각 = 반사각)대로 빛이 반사돼요. 평행광은 평행한 채 반사되고, 모으거나 퍼뜨리지 않아요.');
        } else if (kind.indexOf('prism') === 0) {
          const tir = kind === 'prism:tir', sh = new THREE.Shape();
          if (tir) { sh.moveTo(-2, -2); sh.lineTo(2, -2); sh.lineTo(-2, 2); sh.lineTo(-2, -2); } else { sh.moveTo(-2.2, -1.9); sh.lineTo(2.2, -1.9); sh.lineTo(0, 1.9); sh.lineTo(-2.2, -1.9); }
          const pm = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 1.6, bevelEnabled: false }), glass(0x9fd8ff, 0.4, { roughness: 0.05 })); pm.position.z = -0.8; tmp(pm);
          if (tir) {
            poly([v(-1, -6), v(-1, 1), v(-6, 1)], W, 0.045);
            setLab(0, '직각 프리즘 (45°-45°-90°)', 1.8, -2.7, '#0369a1'); setLab(1, '빗변에서 전반사 (입사각 45° > 임계각 약 42°)', -1.0, 2.9, '#0f766e'); setLab(2, '입사광', -1, -5.4, '#475569');
            info('<b>전반사</b>: 빛이 유리에서 공기로 나갈 때 입사각이 임계각(약 42°)보다 크면 모두 반사돼요. 직각 프리즘으로 빛의 방향을 90° 꺾어요 (쌍안경·잠망경).');
          } else {
            const ns = [1.50, 1.52, 1.54, 1.57, 1.60, 1.63, 1.66], cs = [0xff4d4d, 0xff9f43, 0xffe14d, 0x4ade80, 0x4aa8ff, 0x6366f1, 0xa855f7];
            const ref2 = (d, n, eta) => { const c = -n.dot(d), k = 1 - eta * eta * (1 - c * c); if (k < 0) return null; return d.clone().multiplyScalar(eta).addScaledVector(n, eta * c - Math.sqrt(k)).normalize(); };
            const lN = v(-0.866, 0.5), rN = v(0.866, 0.5), y0 = -0.5, d0 = v(1, 0), tL = (y0 + 1.9) / 3.8, A = v(-2.2 + 2.2 * tL, y0);
            seg2(v(-7, y0), A, 0xffffff, 0.05);
            ns.forEach((n, i) => {
              const d1 = ref2(d0, lN, 1 / n); if (!d1) return;
              const Bx = v(2.2, -1.9), Cx = v(0, 1.9), e = Cx.clone().sub(Bx), den = d1.x * e.y - d1.y * e.x;
              const t1 = ((Bx.x - A.x) * e.y - (Bx.y - A.y) * e.x) / den, B = A.clone().addScaledVector(d1, t1);
              const d2 = ref2(d1, rN.clone().negate(), n); if (!d2) return;
              seg2(A, B, cs[i], 0.02, 0.8); seg2(B, B.clone().addScaledVector(d2, 6), cs[i], 0.035);
            });
            setLab(0, '프리즘', 0, 2.5, '#0369a1'); setLab(1, '백색광', -5.6, 0.2, '#475569'); setLab(2, '빨강이 가장 적게, 보라가 가장 많이 꺾여요', 3.5, -2.6, '#7c3aed');
            info('<b>프리즘의 분산</b>: 백색광이 색마다 굴절률이 달라 여러 색으로 갈라져요. 빨강은 덜 꺾이고 보라는 더 많이 꺾여요. (색에 따른 차이는 보기 쉽게 실제보다 크게 그렸어요.)');
          }
        } else if (kind === 'draw') {
          const a = S.pt.a * 0.5, f = FU, bcm = S.pt.a * 10 / (S.pt.a - 10), b = bcm * 0.5, hO = 1.5, ans = !!S.pt.ans, mk = S.show.numB;
          const lm = new THREE.Mesh(new THREE.LatheGeometry((function () { const pts = [], N = 16; for (let i = 0; i <= N; i++) pts.push(new THREE.Vector2(2.4 * i / N, -0.55 + 0.55 * (i / N) * (i / N) * 0.0 - 0.45 * (i / N) * (i / N))); for (let i = N; i >= 0; i--) pts.push(new THREE.Vector2(2.4 * i / N, 0.55 + 0.45 * (i / N) * (i / N))); return pts; }()), 48), new THREE.MeshStandardMaterial({ color: 0xbfe6ff, roughness: 0.06, transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide })); lm.rotation.z = -Math.PI / 2; lm.scale.set(0.5, 1, 1); tmp(lm);
          seg2(v(-a - 2.5, 0), v(b + 3.5, 0), 0x94a3b8, 0.012, 0.6);
          const O = v(-a, hO); tmp(A(new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 10), mat(0xff6b6b, { emissive: 0xff3b3b, emissiveIntensity: 0.5 })), { position: O.clone() }));
          seg2(v(-a, 0), O, 0xff6b6b, 0.05);
          const I = v(b, -hO * b / a), L1 = v(0, hO), L2 = v(0, 0);
          // 세 광선: ① 축에 나란히 → 초점 ② 렌즈 중심 → 직진 ③ 앞 초점 통과 → 나란히
          const ext = (P, Q, len) => { const d = Q.clone().sub(P).normalize(); return Q.clone().addScaledVector(d, len); };
          seg2(O, L1, 0xffd34d, 0.03); seg2(L1, ext(L1, I, 0.8), 0xffd34d, 0.03);
          seg2(O, ext(O, L2, 0.0), 0x4ade80, 0.03); seg2(L2, ext(O, I, 0.8).clone().setX(I.x + 0.8), 0x4ade80, 0.03);
          const Ff = v(-f, 0), d3 = Ff.clone().sub(O).normalize(), L3 = O.clone().addScaledVector(d3, (0 - O.x) / d3.x); seg2(O, L3, 0x60a5fa, 0.03); seg2(L3, v(b + 0.8, L3.y), 0x60a5fa, 0.03);
          [v(-f, 0), v(f, 0), v(-2 * f, 0)].forEach((P, i) => tmp(A(new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), mat(0xffe14d, { emissive: 0xffc800, emissiveIntensity: 1 })), { position: P })));
          if (ans) tmp(A(new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 10), mat(0x7dd3fc, { emissive: 0x38bdf8, emissiveIntensity: 0.6 })), { position: I.clone(), rotation: new THREE.Euler(0, 0, Math.PI) })), seg2(v(I.x, 0), I, 0x7dd3fc, 0.05);
          setLab(0, '물체 (a = ' + S.pt.a + ' cm)', -a, hO + 0.7, '#c2410c'); setLab(1, '앞 초점 F', -f, -0.7, '#a16207'); setLab(2, '뒤 초점 F', f, -0.7, '#a16207'); setLab(3, '볼록 렌즈 (f = 10 cm)', 0, 2.8, '#0369a1');
          setLab(4, ans ? '상 (b = ' + (Math.round(bcm * 10) / 10) + ' cm, 거꾸로 선 실상)' : (mk ? '상의 위치 b = ?' : '세 광선이 만나는 곳이 상이에요'), I.x, I.y - 0.7, '#0f766e');
          ctl.dist = Math.max(16, 8 + a + b * 0.5) * KD; ctl.tx = (b - a) / 2;
          info('<b>세 광선으로 상의 위치 구하기</b><br>① 축에 나란한 광선 → 뒤 초점 F를 지나요 ② 렌즈 중심을 지나는 광선은 직진 ③ 앞 초점을 지난 광선 → 축에 나란히.<br>세 광선이 만나는 곳에 상이 맺혀요.' + (ans ? '<br>렌즈 식 1/a + 1/b = 1/f → b = ' + (Math.round(bcm * 10) / 10) + ' cm' : ''));
        } else if (kind.indexOf('scope') === 0) {
          const sv = kind.split(':')[1], fo = 10, tube = S.sc.tube, fe = 1.0, mk = S.gate === 'x';
          const mkLens = (x, r, thick) => { const mm = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 18), new THREE.MeshStandardMaterial({ color: 0xbfe6ff, roughness: 0.06, transparent: true, opacity: 0.45, depthWrite: false })); mm.scale.set(thick, 1, 1 * 0.5); mm.position.set(x, 0, 0); return tmp(mm); };
          if (sv === 'refr' || sv === 'refl') {
            const eyeX = fo + fe + (tube - 1010) * 0.12;
            if (sv === 'refr') {
              mkLens(0, 2.2, 0.28); mkLens(eyeX, 0.5, 0.18);
              tmp(A(new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, eyeX + 1.2, 28, 1, true), mat(0x64748b, { metalness: 0.5, side: THREE.DoubleSide, transparent: true, opacity: 0.18, depthWrite: false })), { rotation: new THREE.Euler(0, 0, Math.PI / 2), position: v(eyeX / 2 - 0.1, 0) }));
              [0.05, -0.05].forEach((sl, si) => {
                const col = si ? 0x7dd3fc : 0xfff3b0;
                [-1.8, -0.9, 0, 0.9, 1.8].forEach((hh) => {
                  seg2(v(-6, hh - sl * 6), v(0, hh), col, 0.025, 0.85);
                  const inSl = (sl * fo - hh) / fo, y1 = hh + inSl * eyeX;
                  seg2(v(0, hh), v(eyeX, y1), col, 0.025, 0.85);
                  if (Math.abs(y1) < 0.5) { const outSl = inSl - y1 / fe, o2 = v(1, outSl).normalize(); seg2(v(eyeX, y1), v(eyeX, y1).addScaledVector(o2, 4.5), col, 0.025, 0.9); }
                });
              });
              setLab(0, '대물렌즈 (긴 초점거리)', 0, 2.9, '#0369a1'); setLab(1, '접안렌즈 (짧은 초점거리)', eyeX, 1.2, '#0f766e'); setLab(2, '두 별에서 온 평행광', -4.5, 2.2, '#475569'); setLab(3, '경통 길이 ' + tube + ' mm' + (Math.abs(tube - 1010) <= 2 ? ' → 평행광으로 나와요 (선명)' : ' → 초점이 어긋나요'), eyeX / 2, -2.9, Math.abs(tube - 1010) <= 2 ? '#15803d' : '#b45309');
              ctl.dist = 22 * KD; ctl.tx = 5;
              info('<b>굴절 망원경</b>: 긴 초점거리의 대물렌즈가 먼 천체의 상을 만들고, 짧은 초점거리의 접안렌즈가 이를 확대해요. 두 렌즈 사이의 거리(경통 길이 ' + tube + ' mm)가 f₀ + fₑ(= 1010 mm)에 맞을 때 가장 선명해요.' + (mk ? '' : ''));
            } else {
              tmp(A(new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 0.2, 40, 1), mat(0xe2e8f0, { metalness: 0.9, roughness: 0.15 })), { rotation: new THREE.Euler(0, 0, Math.PI / 2), position: v(10, 0) }));
              [-1.6, -0.8, 0.8, 1.6].forEach((hh) => { const M = v(10 - hh * hh / 40, hh); seg2(v(-4, hh), M, W, 0.025); const dd = v(0, 0).sub(M).normalize(); seg2(M, M.clone().addScaledVector(dd, 6.0), W, 0.025); });
              tmp(A(new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.0, 0.7), mat(0xe2e8f0, { metalness: 0.9 })), { position: v(3.6, 0), rotation: new THREE.Euler(0, 0, Math.PI / 4) }));
              setLab(0, '오목 반사경 (주경)', 10.2, 2.9, '#0369a1'); setLab(1, '평면 보조 거울', 3.6, 1.0, '#475569'); setLab(2, '접안렌즈', 3.6, 3.3, '#0f766e');
              ctl.tx = 3; ctl.dist = 20 * KD;
              info('<b>반사 망원경</b>: 오목 거울로 빛을 모으고 작은 거울로 옆쪽 접안렌즈로 보내요. 굴절 망원경과 무엇이 다른지 비교해 봐요.');
            }
          } else if (sv === 'mic') {
            const xo = 0, xe = 11;
            mkLens(xo, 0.9, 0.25); mkLens(xe, 1.4, 0.22);
            tmp(A(new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, xe + 1, 24, 1, true), mat(0x64748b, { metalness: 0.5, side: THREE.DoubleSide, transparent: true, opacity: 0.18, depthWrite: false })), { rotation: new THREE.Euler(0, 0, Math.PI / 2), position: v(xe / 2, 0) }));
            const O = v(-1.6, 0.35), Ii = v(5, -1.9);
            tmp(A(new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.35, 10), mat(0xff6b6b, { emissive: 0xff3b3b, emissiveIntensity: 0.5 })), { position: O.clone() }));
            seg2(v(-1.6, 0), O, 0xff6b6b, 0.04); seg2(v(5, 0), Ii, 0x7dd3fc, 0.05);
            seg2(O, v(0, O.y), 0xffd34d, 0.025); seg2(v(0, O.y), Ii, 0xffd34d, 0.025); seg2(O, Ii, 0x4ade80, 0.025);
            seg2(Ii, v(xe, -1.4), 0xffd34d, 0.02, 0.7); seg2(Ii, v(xe, 0.4), 0x4ade80, 0.02, 0.7); seg2(v(xe, -1.4), v(xe + 4, -2.6), 0xffd34d, 0.025); seg2(v(xe, 0.4), v(xe + 4, 0.4 + 0.0), 0x4ade80, 0.025);
            setLab(0, '시료 (대물렌즈 초점 가까이)', -1.6, 1.4, '#c2410c'); setLab(1, '대물렌즈 (f 짧음)', 0, 1.9, '#0369a1'); setLab(2, '확대된 실상 (경통 속)', 5, -2.7, '#0f766e'); setLab(3, '접안렌즈 → 허상을 봐요', xe, 2.3, '#0f766e');
            ctl.tx = 5; ctl.dist = 22 * KD;
            info('<b>현미경</b>: 대물렌즈가 시료의 <b>확대된 실상</b>을 만들고, 접안렌즈가 그것을 다시 <b>확대된 허상</b>으로 보여 줘요. 전체 배율 = 대물렌즈 배율 × 접안렌즈 배율 (대물렌즈 ×' + S.sc.mic + ', 접안렌즈 ×10).' + (S.show.numM ? '' : ''));
          } else {
            const mk2 = (x, y, rot) => { const sh = new THREE.Shape(); sh.moveTo(-1.2, -1.2); sh.lineTo(1.2, -1.2); sh.lineTo(-1.2, 1.2); sh.lineTo(-1.2, -1.2); const pm = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 1.2, bevelEnabled: false }), glass(0x9fd8ff, 0.4, { roughness: 0.05 })); pm.position.set(x, y, -0.6); pm.rotation.z = rot; return tmp(pm); };
            mk2(-1.0, -0.5, Math.PI / 4 * 0 + Math.PI / 2 * 0); mk2(1.6, 1.4, Math.PI);
            poly([v(-6, -1.7), v(-1.0 + 0.0, -1.7), v(-1.0, 0.7), v(2.6, 0.7), v(2.6, 3.0), v(9, 3.0)], W, 0.04);
            setLab(0, '직각 프리즘 2개 (전반사)', 0.8, -2.6, '#0369a1'); setLab(1, '대물렌즈 쪽', -5, -1.1, '#475569'); setLab(2, '접안렌즈 쪽', 8, 3.8, '#0f766e'); ctl.dist = 17 * KD; ctl.tx = 2.5;
            info('<b>쌍안경 속 프리즘</b>: 직각 프리즘 두 개가 빛을 전반사로 두 번 꺾어 상의 위아래·좌우를 바로잡고, 경통을 짧게 만들어 줘요.');
          }
        }
      }
      /* ================= 2D 상태 따라가기 ================= */
      function lensParams(S, sim) {
        const m = S.mode; infoFn = null; sharpFn = null;
        if (m === 'aber') {
          const A = S.ab;
          if (A.view === 'a') { Object.assign(st, { type: 'convex', ap: 2.0 * A.apD / 100, real: true, chroma: false, A: Infinity, xs: 5, disp: 1 }); sharpFn = () => { try { return !!sim.abState().spOK; } catch (e) { return false; } }; infoFn = (rms) => '<b>🌫️ 가장자리 빛이 더 가까운 곳에 모여요</b> (구면 수차)<br>렌즈에서 쓰는 부분 ' + Math.round(A.apD) + ' % → 점의 번짐 ' + rms.toFixed(2) + '<br>조리개를 줄이면(가운데만 쓰면) 번짐이 줄고 상이 선명해져요 (대신 어두워져요).'; }
          else { Object.assign(st, { type: 'convex', ap: 1.4, real: true, chroma: true, A: Infinity, xs: 5, disp: A.el === 'doublet' ? 0.12 : 1 }); infoFn = () => '<b>🌫️ 색에 따라 초점이 달라요</b> (색수차)<br>' + (A.el === 'doublet' ? '볼록 + 오목 렌즈를 붙이면 색에 따른 초점 차이가 거의 없어져요.' : '볼록렌즈 한 장은 파란빛이 빨간빛보다 렌즈에 더 가까운 곳에 모여 가장자리에 색 번짐이 생겨요.') + ' (색에 따른 차이는 실제보다 크게 그렸어요.)'; }
        } else if (m === 'camera') {
          const C = S.cm, a = { far: Infinity, mid: 5000, near: 500 }[C.subj] * 0.1;
          Object.assign(st, { type: 'convex', ap: C.apD / 20, real: true, chroma: false, A: a, xs: C.bs.value * 0.1, disp: 1 });
          sharpFn = () => { try { return !!sim.camState().sharpSub; } catch (e) { return false; } };
          infoFn = (rms) => '<b>📸 카메라: 렌즈와 센서의 거리 b = ' + C.bs.value.toFixed(1) + ' mm</b> (초점거리 50 mm)<br>피사체: ' + { far: '먼 풍경 (∞)', mid: '5 m', near: '0.5 m' }[C.subj] + ' · 조리개 ' + (C.ap === 'big' ? '크게' : '작게') + '<br>' + (sharpFn() ? '센서에 상이 <b>선명하게</b> 맺혀요.' : '센서가 상이 맺히는 곳에서 어긋나 상이 <b>번져요</b> (번짐 ' + rms.toFixed(2) + '). 렌즈를 앞뒤로 움직여 초점을 맞춰요.') + '<br>가까운 피사체일수록 렌즈를 센서에서 멀리(b를 크게) 해야 해요.';
        } else {
          const part = S.pt.part; Object.assign(st, { type: part === 'concave' ? 'concave' : 'convex', ap: 1.8, real: false, chroma: false, A: Infinity, xs: 5, disp: 1 });
        }
        st.rk = [st.type, st.ap.toFixed(2), st.real, st.chroma, st.A, st.xs.toFixed(2), st.disp].join();
      }
      let curScene = '', lensKey = '', otherKey = '';
      function showScene(isLens) {
        root.visible = isLens; gO.visible = !isLens;
        Object.keys(labs).forEach((k) => { labs[k].on = (k === 'lens') === isLens; labs[k].forEach((l) => l.show((k === 'lens') === isLens)); });
        if (isLens) { const o = ctx.orbit; o.tx = 1.5; o.ty = 0; o.theta = 0.4; o.phi = 1.15; o.dist = 19 * KD; }
        lensKey = ''; otherKey = '';
      }
      buildLens(); build(); aL.position.set(0, 2.55, 0); lLens.set('렌즈');
      return {
        update(dt, t) {
          const sim = window.__sim; if (!sim) return; const S = sim.S, o = oScene(S, sim), isLens = o.kind === 'lens' || o.kind === 'lens:camera' || S.mode === 'camera';
          const sc = isLens ? 'lens' : 'other'; if (sc !== curScene) { curScene = sc; showScene(isLens); }
          if (isLens) {
            lensParams(S, sim);
            if (st.rk !== lensKey) { const tChanged = !lensKey || lensKey.split(',')[0] !== st.type; lensKey = st.rk; if (tChanged) buildLens(); build(); lLens.set(S.mode === 'camera' ? '카메라 렌즈 (f = 50 mm)' : st.type === 'convex' ? '볼록 렌즈' : '오목 렌즈'); }
          } else if (o.key !== otherKey) { otherKey = o.key; buildOther(o.kind, S, sim); }
        },
        sync() { lensKey = ''; otherKey = ''; },
      };
    },
  });
})();
