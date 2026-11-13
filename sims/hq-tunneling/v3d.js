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
    const glass = (c, op, o) => ctx.mats.glass({ tint: c, opacity: op, extra: o });
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
    levels: [0, 1, 3],
    build(ctx) {
      const { THREE, controls } = ctx;
      /* ---- 여러 장면 도우미 (2D 장면 S.mode에 맞춰 그룹 · 이름표 · 재생 줄을 바꿔요) ---- */
      const root = new THREE.Group(); ctx.root.add(root);
      const G = { barrier: root }, K = { cur: '', labs: [], pls: [] };
      const label = (text, obj, o, sc) => {
        const L = ctx.label(text, obj, o), sh = L.show; L._own = true; L._sc = sc || 'barrier';
        L._ap = () => sh(L._own && K.cur === L._sc); L.show = (v) => { L._own = v; L._ap(); }; K.labs.push(L); L._ap(); return L;
      };
      const mkPlayer = (sc, o) => {
        const p = controls.player(o), rs = document.querySelectorAll('.v3-player'), row = rs[rs.length - 1];
        K.pls.push({ sc, p, row }); row.style.display = sc === K.cur ? '' : 'none'; return p;
      };
      const newScene = (k) => { const g = new THREE.Group(); g.visible = false; ctx.root.add(g); G[k] = g; return g; };
      const CAMS = { barrier: { dist: 16.5 * KD, theta: 0.45, phi: 1.22, min: 8, max: 34, tx: 0.5, ty: 0, tz: 0 } };
      function setScene(k) {
        if (k === K.cur) return; K.cur = k;
        Object.keys(G).forEach((n) => (G[n].visible = n === k));
        K.labs.forEach((L) => L._ap());
        K.pls.forEach((x) => { const on = x.sc === k; x.row.style.display = on ? '' : 'none'; if (!on) x.p.pause(); });
        const c = CAMS[k]; if (c) Object.assign(ctx.orbit, c, { tx: c.tx || 0, ty: c.ty || 0, tz: c.tz || 0 });
      }
      let barrierInfo = null; const info = (hh) => ctx.info(hh);
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
        const w2 = window.__sim, T = T2d != null ? T2d : (w2 && w2.log10T ? Math.pow(10, w2.log10T(0.2, 1, 1)) : sol.T);   // 2D 아래 칸의 ‘전자 모형 확률’과 같은 값
        info('<b>E = ' + st.E.toFixed(1) + ' < V₀ = ' + st.V0.toFixed(1) + '</b> — 고전 입자라면 장벽을 넘을 수 없어요.<br>파동 함수는 장벽 속에서 <b>지수적으로 줄지만 0이 아니라서</b> 반대쪽으로 새어 나와요.<br>통과 확률 T ≈ <b>' + (T >= 0.1 ? (T * 100).toFixed(0) : (T * 100).toFixed(1)) + ' %</b> · 장벽이 두껍거나 높을수록 T가 급격히 줄어요.');
      }
      /* 입자 (확률로 통과) */
      const LANE = 3.1, balls = [];
      for (let i = 0; i < 40; i++) { const m = sphere(0.24, 0x7dd3fc, { emissive: 0x38bdf8, emissiveIntensity: 0.8, transparent: true, opacity: 0.95, roughness: 0.25 }); m.visible = false; root.add(m); ctx.halo(m, 0x6fd0ff, 1.5, 0.45); balls.push({ m, on: false, x: 0, v: 1, dir: 1, pass: false, decided: false }); }
      let spawn = 0.4, tries = 0, passes = 0, T2d = null, lsig = '';
      function resetCount() { tries = passes = 0; balls.forEach((b) => { b.on = false; b.m.visible = false; }); }
      /* 고전 입자(공): 2D의 “공 굴리기”와 함께 굴러가 장벽 앞에서 되돌아와요 */
      const cBall = new THREE.Mesh(new THREE.SphereGeometry(0.42, 40, 28), ctx.mats.plastic(0xe08a06, { extra: { emissive: 0xb45309, emissiveIntensity: 0.2 } })); cBall.visible = false; root.add(cBall);
      let cRef = null, cT = 0;
      /* 전자: 2D의 “전자 1개 / 100개”로 쏜 전자(S.cq.shots)를 그대로 따라가요 */
      function mirrorShots(Q) {
        const x0 = XL + 1;
        balls.forEach((b, i) => {
          const sh = Q.shots[i]; if (!sh) { b.m.visible = false; b.on = false; return; }
          b.m.visible = true; b.on = false;
          let x, ref = false, ps = false;
          if (sh.t < 0.45) x = x0 + (0 - x0) * (sh.t / 0.45);
          else { const q = (sh.t - 0.45) / 0.55; if (sh.pass) { ps = true; x = st.L + (XR - st.L) * q; } else { ref = true; x = -(0 - x0) * q * 0.85; } }
          b.m.material.color.setHex(ps ? 0x4ade80 : ref ? 0xfb7185 : 0x7dd3fc); b.m.material.emissive.setHex(ps ? 0x22c55e : ref ? 0xe11d48 : 0x38bdf8);
          b.m.position.set(x, LANE, (sh.dy || 0) / 14 * 0.8); b.m.scale.setScalar(1);
        });
      }
      function updBall(Q, dt) {
        if (Q.ball && Q.ball !== cRef) { cRef = Q.ball; cT = 0; }
        if (!cRef || cT > 3.2) { cBall.visible = false; return; }
        cT += dt; const x0 = XL + 1, xs = -1.3, u = Math.min(1, cT / 3.2), k = u < 0.5 ? Math.sin(u * Math.PI) : Math.sin(u * Math.PI);
        cBall.visible = true; cBall.position.set(x0 + (xs - x0) * k, LANE - 1.0, -1.2); cBall.rotation.z = -cBall.position.x * 2;
      }
      const Mx = new THREE.Matrix4(), ZM = new THREE.Matrix4().makeScale(0, 0, 0);
      /* =====================================================================
         새 장면: 터널링 현미경(stm) · 트랜지스터 누설(leak) · 플래시 메모리(flash) · 알파 붕괴와 핵융합(nat)
         ===================================================================== */
      const sceneKey = () => { const L = window.__sim; const S = L && L.S; if (!S) return 'barrier'; if (S.mode === 'stm') return 'stm'; if (S.mode === 'dev') return S.dv.sub || 'leak'; return 'barrier'; };
      const LB = 'rgba(8,12,24,.78)', Yv = h.Yax;
      const MT = ctx.mats;
      const rbox = (w, h, d, r) => { r = Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3); const s = new THREE.Shape(), x = w / 2 - r, y = h / 2 - r; s.absarc(x, y, r, 0, Math.PI / 2); s.absarc(-x, y, r, Math.PI / 2, Math.PI); s.absarc(-x, -y, r, Math.PI, 1.5 * Math.PI); s.absarc(x, -y, r, 1.5 * Math.PI, 2 * Math.PI); const g = new THREE.ExtrudeGeometry(s, { depth: d - 2 * r, bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelOffset: -r, bevelSegments: 3, curveSegments: 6 }); g.translate(0, 0, -(d - 2 * r) / 2); return g; };   // 모서리가 둥근 상자
      const stdM = (w, hh, d, c, o) => new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), mat(c, o));
      const sphM = (r, c, o) => new THREE.Mesh(new THREE.SphereGeometry(r, 22, 16), mat(c, o));
      const eM = () => { const m = sphM(0.14, 0xffb400, { emissive: 0xffb400, emissiveIntensity: 1 }); ctx.halo(m, 0xffc23a, 0.9, 0.5); return m; };
      const lerp = (a, b, u) => a + (b - a) * u, cl = (v, a, b) => Math.min(b, Math.max(a, v));
      const mmM = (g, m) => { g.add(m); return m; };

      /* ============ ③ 주사 터널링 현미경 ============ */
      const gT = newScene('stm'); CAMS.stm = { dist: PHN ? 21 : 15, theta: 0.5, phi: 1.2, min: 6, max: 34, tx: 0, ty: 2.0, tz: 0 };
      const SCN = 4, AT = (window.__sim && window.__sim.AT) || { cols: 7, rows: 4, sp: 0.25, ox: 0.125, oy: 0.125, W: 1.75, H: 1.0, hA: 0.10 };
      const SX = (nm) => (nm - AT.W / 2) * SCN, SZ = (nm) => (nm - AT.H / 2) * SCN, rA = 0.085;
      const slab = mmM(gT, new THREE.Mesh(rbox(AT.W * SCN + 0.9, 0.8, AT.H * SCN + 0.9, 0.06), MT.metal(0x3f4c69, { brushed: true }))); slab.position.set(0, -0.4 - 0.0, 0);
      const stAt = [];
      for (let i = 0; i < AT.cols; i++) for (let j = 0; j < AT.rows; j++) {
        const vac = window.__sim && i === window.__sim.VAC[0] && j === window.__sim.VAC[1];
        const m = vac ? new THREE.Mesh(new THREE.SphereGeometry(rA * SCN, 14, 10), h.basic(0x9aa6b8, { transparent: true, opacity: 0.22, wireframe: true })) : new THREE.Mesh(new THREE.SphereGeometry(rA * SCN, 32, 22), MT.plastic(0x4a6cc8, { roughness: 0.25 }));
        m.position.set(SX(AT.ox + AT.sp * i), (AT.hA - rA) * SCN, SZ(AT.oy + AT.sp * j)); gT.add(m); stAt.push(m);
      }
      const tipG = new THREE.Group(); gT.add(tipG);
      const tipCone = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.8, 40), MT.metal('chrome', { roughness: 0.14 })); tipCone.rotation.x = Math.PI; tipCone.position.y = 0.9; tipG.add(tipCone);
      const tipRod = mmM(tipG, new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 2.0, 32), MT.metal('steel', { brushed: true }))); { const col = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.16, 32), MT.metal('brass')); col.position.y = 1.86; tipG.add(col); } tipRod.position.y = 2.8;
      const NTE = 14, tElM = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 10, 8), h.basic(0xffb400), NTE); tElM.frustumCulled = false; gT.add(tElM);
      const gapA = h.mkArrow(0xe2464b, 0.025), gapA2 = h.mkArrow(0xe2464b, 0.025); gT.add(gapA, gapA2);
      const scrN = 70, scrM = 40, scCv = document.createElement('canvas'); scCv.width = scrN; scCv.height = scrM; const scX = scCv.getContext('2d'), scTex = new THREE.CanvasTexture(scCv); scTex.magFilter = THREE.NearestFilter;
      const scrPl = new THREE.Mesh(new THREE.PlaneGeometry(6.3, 3.6), new THREE.MeshBasicMaterial({ map: scTex, side: THREE.DoubleSide })); scrPl.position.set(0, 4.4, -3.8); gT.add(scrPl);
      const scrFr = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(6.4, 3.7, 0.1)), new THREE.LineBasicMaterial({ color: 0x7f93bd })); scrFr.position.copy(scrPl.position); gT.add(scrFr); { const bz = new THREE.Mesh(rbox(6.7, 4.0, 0.18, 0.06), MT.plastic(0x161b28)); bz.position.copy(scrPl.position); bz.position.z -= 0.12; gT.add(bz); }
      const lsScr = label('', scrPl, { color: LB, size: 12, offset: [0, 2.1, 0] }, 'stm'), lsTip = label('', tipG, { color: 'rgba(8,12,24,.85)', size: 12, offset: [1.4, 3.7, 0] }, 'stm');
      const lsGap = label('', tipG, { color: 'rgba(192,53,59,.92)', size: 12, offset: [1.3, 0.6, 0] }, 'stm'), lsSt = label('', tipG, { color: 'rgba(20,160,88,.92)', size: 12, offset: [-1.5, 3.7, 0] }, 'stm');
      label('표면의 원자 (점선 원 = 빠진 원자)', [0, -1.2, 2.2], { color: LB, size: 12 }, 'stm');
      const stP = { on: false, gap: 0.5 }; let stSig = '', stK = -1, stEl = 0;
      const curOf = (gap) => 3.0 * Math.pow(10, -(gap - 0.5) / 0.1), fmtI = (I) => (I >= 1 ? I.toFixed(1) + ' nA' : I >= 0.001 ? Math.round(I * 1000) + ' pA' : (I * 1000).toFixed(1) + ' pA');
      function updStm(dt, t) {
        const L = window.__sim, S = L.S, St = S.st, sc = St.scan;
        const sig = St.gapV + '|' + (sc ? sc.mode : '') + '|' + (sc && sc.on); if (sig !== stSig) { stSig = sig; if (stP.on) { stP.on = false; plSt.pause(); } }
        // 탐침 상태 (2D의 tipState와 같은 규칙)
        const hAt = L.hAt, hPark = hAt(L.atX(3), L.atY(1)); let x = L.atX(3), y = L.atY(1), z, gap, I, scanning = false;
        if (sc && (sc.on || sc.done)) {
          const k = Math.min(sc.k, L.NXP * L.NYP - 1), ix = k % L.NXP, iy = Math.floor(k / L.NXP); x = sc.done ? L.atX(3) : (ix + 0.5) * 0.025; y = sc.done ? L.atY(1) : (iy + 0.5) * 0.025; const hh = hAt(x, y);
          if (sc.mode === 'cc') { z = hh + 0.5; gap = 0.5; I = 3.0; } else { z = sc.z; gap = sc.z - hh; I = curOf(gap); } scanning = sc.on;
        } else { gap = St.gapV / 100; z = gap + hPark; I = curOf(gap); }
        if (stP.on) { gap = stP.gap; z = gap + hAt(x, y); I = curOf(gap); }
        tipG.position.set(SX(x), z * SCN, SZ(y));
        const surf = hAt(x, y) * SCN, apex = z * SCN;
        // 터널 전자: 2D가 만든 전자(St.el)를 따라가요 (재생 중에는 3D에서 따로 만들어요)
        const els = stP.on ? null : St.el; let n = 0;
        if (els) els.forEach((e) => { if (n < NTE) { const ey = lerp(apex, surf + 0.1, e.t); Mx.makeTranslation(SX(x) + e.dx * SCN * 0.6, ey, SZ(y)); tElM.setMatrixAt(n++, Mx); } });
        else { stEl += dt * cl(4 * Math.sqrt(Math.max(I, 0.0005)), 0.3, 20); for (let i = 0; i < NTE; i++) { const u = ((stEl * 0.4 + i / NTE) % 1); if (i < Math.min(NTE, 2 + Math.round(Math.log10(I * 1000 + 1) * 3))) { Mx.makeTranslation(SX(x) + Math.sin(i * 2.3) * 0.15, lerp(apex, surf + 0.1, u), SZ(y)); tElM.setMatrixAt(n++, Mx); } } }
        for (let i = n; i < NTE; i++) tElM.setMatrixAt(i, ZM); tElM.instanceMatrix.needsUpdate = true;
        if (apex - surf > 0.5) { h.setArrow(gapA, new V3(SX(x) + 0.75, surf, SZ(y)), new V3(SX(x) + 0.75, apex, SZ(y))); h.setArrow(gapA2, new V3(SX(x) + 0.75, apex, SZ(y)), new V3(SX(x) + 0.75, surf, SZ(y))); } else gapA.visible = gapA2.visible = false;
        // 전류 지도 (2D가 그리는 이미지를 그대로)
        const kk = sc ? sc.k : -2; if (kk !== stK || (St.guess && true)) {
          stK = kk; scX.fillStyle = '#1b1410'; scX.fillRect(0, 0, scrN, scrM);
          if (sc) for (let k = 0; k < sc.k; k++) { const v = sc.img[k]; if (v < 0) continue; scX.fillStyle = 'rgb(' + Math.round(40 + 215 * v) + ',' + Math.round(25 + 175 * v * v + 25 * v) + ',' + Math.round(20 + 70 * Math.pow(v, 3)) + ')'; scX.fillRect(k % scrN, Math.floor(k / scrN), 1, 1); }
          if (St.guess) { scX.strokeStyle = '#4ee0ff'; scX.lineWidth = 1; scX.beginPath(); scX.arc(St.guess.x / AT.W * scrN, St.guess.y / AT.H * scrM, 3, 0, 6.3); scX.stroke(); }
          scTex.needsUpdate = true;
        }
        const mc = sc ? sc.mode : St.mode;
        lsScr.set(sc ? '전류 지도: 밝을수록 ' + (mc === 'ch' ? '전류가 커요' : '표면이 높아요') + (sc.done ? ' · 스캔 완료' : ' · ' + Math.round(sc.k / (L.NXP * L.NYP) * 100) + '%') : '“스캔 시작”을 누르면 이미지가 그려져요');
        lsTip.set('탐침 전류 I = ' + fmtI(I) + (sc && mc === 'cc' && (sc.on || sc.done) ? ' (일정)' : '')); lsGap.set('거리 ' + gap.toFixed(2) + ' nm'); lsSt.set(scanning ? '스캔 중' : sc && sc.done ? '스캔 완료' : '탐침 고정'); lsSt.el.style.background = scanning ? 'rgba(20,160,88,.92)' : 'rgba(93,104,121,.92)';
        lsGap.obj = [SX(x), (surf + apex) / 2, SZ(y)];
        info('뾰족한 탐침을 표면에 <b>0.5 nm</b>쯤 가까이 대면 전자가 틈을 <b>터널링</b>해 전류가 흘러요. 거리가 <b>0.1 nm</b> 늘 때마다 전류가 <b>1/10</b>로 줄어요.<br>' + (mc === 'ch' ? '탐침 높이를 고정하고 훑으면 원자 위에서 전류가 커요.' : '전류를 일정하게 유지하도록 탐침을 오르내리면 그 높이가 곧 표면 모양이에요.') + '');
      }

      /* ============ ④-1 트랜지스터 누설 ============ */
      const gLk = newScene('leak'); CAMS.leak = { dist: PHN ? 17 : 11.5, theta: 0.5, phi: 1.2, min: 6, max: 30, tx: 0.8, ty: 0.5 };
      const OXS = 0.5, TW = 5.4, TD = 3.2;
      const gate = mmM(gLk, new THREE.Mesh(rbox(TW, 0.9, TD, 0.05), MT.metal(0x8b96aa, { brushed: true })));
      const oxide = mmM(gLk, new THREE.Mesh(new THREE.BoxGeometry(TW, 1, TD), MT.glass({ tint: 0xfac85a, opacity: 0.5, extra: { emissive: 0xff6a3d, emissiveIntensity: 0 } })));
      const sil = mmM(gLk, new THREE.Mesh(rbox(TW, 1.6, TD, 0.05), MT.ceramic(0x6d81ab)));
      const heat = new THREE.Mesh(new THREE.SphereGeometry(3.0, 20, 14), h.basic(0xff6a3d, { transparent: true, opacity: 0, depthWrite: false })); gLk.add(heat);
      const NSE = 9, siE = new THREE.InstancedMesh(new THREE.SphereGeometry(0.16, 12, 8), mat(0x3867f4, { emissive: 0x2040c0, emissiveIntensity: 0.5 }), NSE); gLk.add(siE);
      const NTL = 40, tnE = new THREE.InstancedMesh(new THREE.SphereGeometry(0.22, 12, 8), h.basic(0xffb400), NTL); tnE.frustumCulled = false; gLk.add(tnE);
      const lkBar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1, 0.5), h.basic(0xf2a03a)); gLk.add(lkBar);
      const lkFr = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.55, 4, 0.55)), new THREE.LineBasicMaterial({ color: 0x8a96b8 })); lkFr.position.set(5.2, 0, 0); gLk.add(lkFr);
      const lkTh = stdM(1.1, 0.05, 0.7, 0xe2464b); lkTh.position.set(5.2, -2 + 4 * 0.75, 0); gLk.add(lkTh);
      label('금속 게이트', gate, { color: LB, size: 12, offset: [-1.7, 0.1, 1.8] }, 'leak'); const llOx = label('', oxide, { color: 'rgba(122,74,0,.92)', size: 12, offset: [2.0, 0, 1.8] }, 'leak'); label('실리콘 (전자가 많아요)', sil, { color: LB, size: 12, offset: [-1.2, -0.6, 1.8] }, 'leak');
      label('과열 경고 기준 ×1000', lkTh, { color: 'rgba(226,70,75,.92)', size: 11, offset: [0, 0.3, 0] }, 'leak'); const llLk = label('', lkBar, { color: LB, size: 12, offset: [0, 0, 0] }, 'leak'); label('누설 전류 (5 nm = 1)', [5.2, -2.6, 0], { color: LB, size: 12 }, 'leak');
      const lkP = { on: false, t: 5 }; let lkSig = '';
      const leakOf = (t) => Math.pow(10, 5 - t);
      function updLeak(dt, t) {
        const L = window.__sim, V = L.S.dv; if (V.t !== lkSig) { lkSig = V.t; if (lkP.on) { lkP.on = false; plLk.pause(); } }
        const tn = lkP.on ? lkP.t : V.t, Lk = leakOf(tn), warn = Lk >= 1000 - 1e-9, oh = tn * OXS;
        gate.position.set(0, oh / 2 + 0.45, 0); oxide.scale.y = Math.max(0.05, oh); oxide.position.set(0, 0, 0); sil.position.set(0, -oh / 2 - 0.8, 0); oxide.geometry.dispose; oxide.scale.y = Math.max(0.05, oh);
        gate.position.y = oh / 2 + 0.45; sil.position.y = -oh / 2 - 0.8;
        oxide.material.emissiveIntensity = Lk > 30 ? Math.min(0.9, Math.log10(Lk) / 4.5) : 0; heat.material.opacity = Lk > 30 ? Math.min(0.1, Math.log10(Lk) / 4.5 * 0.14) : 0;
        for (let i = 0; i < NSE; i++) { Mx.makeTranslation(-2.2 + 0.55 * i, -oh / 2 - 0.2 + 0.12 * Math.sin(t * 1.6 + i * 1.7) + (i % 2) * 0.28, (i % 3 - 1) * 0.8); siE.setMatrixAt(i, Mx); } siE.instanceMatrix.needsUpdate = true;
        let n = 0; const els = lkP.on ? null : V.el;
        if (els) els.forEach((e) => { if (n < NTL) { Mx.makeTranslation(-TW / 2 + 0.3 + (TW - 0.6) * e.x, -oh / 2 + oh * e.t, ((e.x * 7) % 1 - 0.5) * 2.4); tnE.setMatrixAt(n++, Mx); } });
        else { const cnt = Math.min(NTL, Math.round(2 + 6 * Math.log10(Lk + 1))); for (let i = 0; i < cnt; i++) { const u = ((t * 0.9 + i / cnt) % 1); Mx.makeTranslation(-TW / 2 + 0.3 + (TW - 0.6) * ((i * 0.37) % 1), -oh / 2 + oh * u, ((i * 0.53) % 1 - 0.5) * 2.4); tnE.setMatrixAt(n++, Mx); } }
        for (let i = n; i < NTL; i++) tnE.setMatrixAt(i, ZM); tnE.instanceMatrix.needsUpdate = true;
        lkBar.scale.y = Math.max(0.03, 4 * Math.log10(Lk) / 4); lkBar.position.set(5.2, -2 + lkBar.scale.y / 2, 0); lkBar.material.color.set(warn ? 0xe2464b : 0xf2a03a);
        llOx.set('절연막 ' + tn.toFixed(1) + ' nm'); llLk.set('누설 ×' + Number(Lk.toPrecision(1)).toLocaleString('ko-KR') + (warn ? ' 🔥' : '')); llLk.obj = [5.2, -2 + lkBar.scale.y + 0.4, 0]; llLk.el.style.background = warn ? 'rgba(226,70,75,.92)' : 'rgba(20,160,88,.92)';
        info('게이트 절연막이 몇 nm로 얇아지면 전자가 절연막을 <b>터널링</b>해 새어요. 두께가 줄수록 누설이 급격히 늘어 <b>열이 나요</b>.<br>누설 <b>×' + Number(Lk.toPrecision(1)).toLocaleString('ko-KR') + '</b> (5 nm일 때 = 1) · ' + (warn ? '<b>🔥 과열 경고</b>' : '정상 범위'));
      }

      /* ============ ④-2 플래시 메모리 ============ */
      const gFl = newScene('flash'); CAMS.flash = { dist: PHN ? 16 : 11, theta: 0.45, phi: 1.2, min: 6, max: 28, tx: 0.9, ty: 0.3 };
      const FW = 5.6, FD = 3.0;
      const cGate = mmM(gFl, new THREE.Mesh(rbox(FW, 0.8, FD, 0.05), MT.metal(0x8b96aa, { brushed: true }))); cGate.position.y = 2.1;
      const fGate = mmM(gFl, stdM(FW - 0.9, 1.0, FD - 0.4, 0x8a5cf6, { transparent: true, opacity: 0.88 })); fGate.position.y = 0.9;
      const tOx = mmM(gFl, stdM(FW - 0.9, 0.32, FD - 0.4, 0xfac85a, { transparent: true, opacity: 0.9 })); tOx.position.y = 0.24;
      const fSil = mmM(gFl, new THREE.Mesh(rbox(FW, 1.8, FD, 0.05), MT.ceramic(0x6d81ab))); fSil.position.y = -0.9 - 0.1;
      const NFE = 6, flE = new THREE.InstancedMesh(new THREE.SphereGeometry(0.17, 12, 8), mat(0x3867f4, { emissive: 0x2040c0, emissiveIntensity: 0.6 }), NFE); gFl.add(flE);
      const bitBox = new THREE.Mesh(rbox(1.5, 1.5, 0.5, 0.1), MT.plastic(0x9aa5b8)); bitBox.position.set(5.6, 0.6, 0); gFl.add(bitBox);
      label('제어 게이트', cGate, { color: LB, size: 12, offset: [-1.6, 0.1, 1.7] }, 'flash'); label('부유 게이트 (전자를 가둬 저장)', fGate, { color: 'rgba(91,45,184,.92)', size: 12, offset: [-0.9, 0, 1.7] }, 'flash'); label('얇은 절연막 (터널링)', tOx, { color: 'rgba(122,74,0,.92)', size: 12, offset: [1.3, 0, 1.7] }, 'flash'); label('실리콘 (전자가 있어요)', fSil, { color: LB, size: 12, offset: [-0.8, -0.3, 1.7] }, 'flash');
      const lfBit = label('', bitBox, { color: 'rgba(8,12,24,.0)', size: 40, offset: [0, 0, 0.4] }, 'flash'); lfBit.el.style.background = 'transparent'; lfBit.el.style.border = '0'; lfBit.el.style.boxShadow = 'none';
      const lfTxt = label('', bitBox, { color: LB, size: 12, offset: [0, -1.3, 0] }, 'flash'); label('저장된 정보', bitBox, { color: LB, size: 12, offset: [0, 1.2, 0] }, 'flash');
      const flP = { on: false, bit: 0, busy: null, tp: 0 };
      function flashPose(bit, busy, q) {
        // 6개 전자의 높이 (0 = 실리콘 쪽, 1 = 부유 게이트 쪽)
        const out = []; for (let i = 0; i < 6; i++) {
          let u;
          if (busy === 'w') u = cl(q * 1.4 - i * 0.12, 0, 1); else if (busy === 'e') u = 1 - cl(q * 1.4 - i * 0.12, 0, 1); else u = bit === 1 ? 1 : 0;
          out.push(u);
        } return out;
      }
      let flSig = '';
      function updFlash(dt, t) {
        const L = window.__sim, F = L.S.dv.flash; const sg = F.bit + '|' + (F.busy || ''); if (sg !== flSig) { flSig = sg; if (flP.on) { flP.on = false; plFl.pause(); } }
        const st = flP.on ? flP : { bit: F.bit, busy: F.busy, tp: F.tp }, q = st.busy ? st.tp : 0, us = flashPose(st.bit, st.busy, q);
        for (let i = 0; i < NFE; i++) { const ex = -FW / 2 + 1.1 + (FW - 2.2) * (i + 0.5) / NFE, yS = -0.35 + (i % 2) * 0.22, yF = 0.62 + (i % 2) * 0.12, u = us[i]; Mx.makeTranslation(ex, lerp(yS, yF, u) + (u > 0 && u < 1 ? 0.08 * Math.sin(t * 20) : 0), ((i % 3) - 1) * 0.7); flE.setMatrixAt(i, Mx); } flE.instanceMatrix.needsUpdate = true;
        tOx.material.emissive.set(st.busy ? 0xff9a2b : 0x000000); tOx.material.emissiveIntensity = st.busy ? 0.6 : 0;
        const bitNow = st.busy ? (st.busy === 'w' ? 0 : 1) : st.bit; bitBox.material.color.set(bitNow ? 0x14a058 : 0x9aa5b8);
        lfBit.set('<span style="font-size:42px;font-weight:900;color:#fff;text-shadow:0 2px 6px rgba(0,0,0,.5)">' + bitNow + '</span>'); lfTxt.set(st.bit === 1 ? '전자가 갇혀 있어요 → 1' : '전자가 없어요 → 0');
        info(st.busy ? (st.busy === 'w' ? '전자가 절연막을 <b>터널링</b>해 부유 게이트로 들어가요…' : '전자가 절연막을 <b>터널링</b>해 실리콘으로 돌아가요…') : (st.bit === 1 ? '부유 게이트에 전자가 <b>갇혀</b> 있어요 → <b>1</b>. 전원이 꺼져도 유지돼요.' : '전자가 실리콘에 있어요 → <b>0</b>.') + '<br>한계: 반복해서 쓰면 절연막이 서서히 망가져요.');
      }

      /* ============ ④-3 알파 붕괴와 별의 핵융합 ============ */
      const gNt = newScene('nat'); CAMS.nat = { dist: PHN ? 19 : 12, theta: 0.4, phi: 1.2, min: 6, max: 30, tx: 0.2, ty: 0 };
      const nucS = new THREE.Mesh(new THREE.SphereGeometry(1.1, 28, 20), mat(0xffaa5a, { transparent: true, opacity: 0.35, emissive: 0xff8a2b, emissiveIntensity: 0.3, depthWrite: false })); gNt.add(nucS);
      const barS = new THREE.Mesh(new THREE.SphereGeometry(2.2, 32, 22), mat(0xa78be6, { transparent: true, opacity: 0.26, emissive: 0x7a5bc8, emissiveIntensity: 0.2, depthWrite: false })); gNt.add(barS);
      const barE = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.SphereGeometry(2.2, 12, 8)), new THREE.LineBasicMaterial({ color: 0xa78be6, transparent: true, opacity: 0.6 })); gNt.add(barE);
      const alpha = sphM(0.3, 0xe2464b, { emissive: 0xe2464b, emissiveIntensity: 0.8, transparent: true }); gNt.add(alpha);
      const aHalo = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 12), h.basic(0xffb400, { transparent: true, opacity: 0.4, depthWrite: false })); gNt.add(aHalo);
      label('핵 (알파 입자가 갇혀 있어요)', nucS, { color: LB, size: 12, offset: [-1.2, -1.7, 0.6] }, 'nat'); label('장벽', barS, { color: 'rgba(91,63,176,.92)', size: 12, offset: [0, 2.7, 0] }, 'nat'); label('핵 밖', [5.0, -0.3, 0], { color: LB, size: 12 }, 'nat');
      const lnMsg = label('', [1.0, -3.2, 0], { color: 'rgba(93,104,121,.95)', size: 12 }, 'nat'); const lnA = label('알파 입자', alpha, { color: 'rgba(226,70,75,.92)', size: 12, offset: [0, 0.65, 0] }, 'nat');
      const FU = new THREE.Group(); FU.position.set(-5.4, 0, 0); gNt.add(FU);
      const fp1 = sphM(0.45, 0xe2464b, { emissive: 0xe2464b, emissiveIntensity: 0.5 }), fp2 = sphM(0.45, 0xe2464b, { emissive: 0xe2464b, emissiveIntensity: 0.5 }); FU.add(fp1, fp2);
      const fGl = new THREE.Mesh(new THREE.SphereGeometry(1.4, 16, 12), h.basic(0xffb400, { transparent: true, opacity: 0.15, depthWrite: false })); FU.add(fGl);
      label('별의 핵융합 예고: p⁺ 둘', FU, { color: LB, size: 12, offset: [0, -1.9, 0] }, 'nat');
      const ntP = { on: false, t: 0 }; let ntSig = null;
      function updNat(dt, t) {
        const L = window.__sim, N = L.S.dv.nat; const sg = N.run ? 1 : 0; if (sg !== ntSig) { ntSig = sg; if (ntP.on && sg) { ntP.on = false; plNt.pause(); } }
        const rt = ntP.on ? ntP.t : (N.run ? N.run.t : -1); let r = 0, alp = 1, msg = '“▶ 시연 보기”를 눌러 보세요', col = 'rgba(93,104,121,.95)', ang = t * 6.5;
        let pos = new V3();
        if (rt < 0) { pos.set(0, 0, 0); } else if (rt < 2.6) { pos.set(0.55 * Math.sin(rt * 6.5), 0.3 * Math.sin(rt * 9.1), 0.3 * Math.cos(rt * 7.3)); msg = '아주 많이 시도하는 중… (대부분 튕겨서 되돌아와요)'; }
        else if (rt < 3.2) { const u = (rt - 2.6) / 0.6; pos.set(lerp(0.55, 2.5, u), 0, 0); alp = 0.45; msg = '장벽 속으로 스며들어요…'; col = 'rgba(122,91,200,.95)'; }
        else { const u = cl((rt - 3.2) / 0.9, 0, 1); pos.set(lerp(2.5, 5.4, u), 0, 0); msg = '터널링으로 핵 밖에 나왔어요!'; col = 'rgba(20,160,88,.95)'; }
        alpha.position.copy(pos); alpha.material.opacity = alp; aHalo.position.copy(pos); aHalo.material.opacity = 0.4 * alp;
        lnMsg.set(msg); lnMsg.el.style.background = col;
        const sw = Math.sin(t * 2.4) * 0.3; fp1.position.set(-0.9 + sw, 0, 0); fp2.position.set(0.9 - sw, 0, 0); fGl.material.opacity = 0.15 + 0.08 * Math.sin(t * 4);
        info('<b>알파 붕괴</b>: 핵 속의 알파 입자는 에너지가 장벽보다 낮은데도 아주 가끔 장벽을 <b>터널링</b>해 튀어나와요.<br><b>별의 핵융합</b>(다음 차시): 양성자 둘이 서로 밀어내는 장벽을 터널링해 융합해요. 터널 효과가 없다면 태양은 빛나지 못해요.');
      }

      const plSt = mkPlayer('stm', { duration: 8, loop: true, autoplay: false, label: '탐침 멀리 보내기', phases: [[0, '0.40 nm (가까이)'], [0.5, '0.60 nm'], [0.95, '0.80 nm (멀리)']], onFrame(p) { stP.on = true; stP.gap = 0.4 + 0.4 * p; } });
      const plLk = mkPlayer('leak', { duration: 8, loop: true, autoplay: false, label: '절연막 얇게', phases: [[0, '5 nm (두꺼움)'], [0.5, '3 nm'], [0.9, '1 nm (얇음)']], onFrame(p) { lkP.on = true; lkP.t = 5 - 4 * p; } });
      const plFl = mkPlayer('flash', { duration: 10, loop: true, autoplay: false, label: '쓰기 → 지우기', phases: [[0, '0 저장'], [0.1, '쓰기 (전자가 들어가요)'], [0.5, '1 저장'], [0.6, '지우기 (전자가 나와요)']], onFrame(p) { flP.on = true; if (p < 0.1) { flP.bit = 0; flP.busy = null; } else if (p < 0.5) { flP.bit = 0; flP.busy = 'w'; flP.tp = (p - 0.1) / 0.4; } else if (p < 0.6) { flP.bit = 1; flP.busy = null; } else if (p < 0.95) { flP.bit = 1; flP.busy = 'e'; flP.tp = (p - 0.6) / 0.35; } else { flP.bit = 0; flP.busy = null; } } });
      const plNt = mkPlayer('nat', { duration: 8, loop: true, autoplay: false, label: '알파 붕괴 보기', phases: [[0, '핵 속에 갇혀 있어요'], [0.6, '장벽 속으로'], [0.77, '핵 밖으로']], onFrame(p) { ntP.on = true; ntP.t = p * 5.2; } });
      const updMap = { stm: updStm, leak: updLeak, flash: updFlash, nat: updNat };
      rebuild();
      setScene(updMap[sceneKey()] ? sceneKey() : 'barrier');
      return {
        update(dt, t) {
          dt = Math.min(dt, 0.05);
          { const k = sceneKey(), base = updMap[k] ? k : 'barrier'; if (base !== K.cur) { setScene(base); lsig = ''; } if (base !== 'barrier') { updMap[base](dt, t); return; } }
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
          const Qc = window.__sim && window.__sim.S && window.__sim.S.mode === 'cq' ? window.__sim.S.cq : null;
          if (Qc) { mirrorShots(Qc); updBall(Qc, dt); lBall.set('공: 넘은 횟수 ' + Qc.bPass + ' / ' + Qc.bTry + '번 · 전자: 반대편 ' + Qc.eP + ' / ' + Qc.eN + '개'); lBall.obj = aSh; lBall.off = [0, 1.7, 0]; return; }
          cBall.visible = false;
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
