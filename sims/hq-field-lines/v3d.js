/* hq-field-lines · 3D 전기력선과 등전위면 (점전하 · 쌍극자 · 같은 부호 · 평행판)
   전기력선은 +에서 나와 −로 들어가고 서로 만나지 않아요. 등전위면은 전기력선에 수직이고, 같은 등전위면 위에서 전하를 옮기는 일은 0이에요. */
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
  const POS = 0xff5a5f, NEG = 0x4d8dff, U = 0.02;                 // 2D 화면 1px = 3D 0.02
  const potHex = (f) => { f = Math.max(0, Math.min(1, f)); const a = f < 0.5 ? [0x4a, 0x7b, 0xe0] : [0xf6, 0xf2, 0xea], b = f < 0.5 ? [0xf6, 0xf2, 0xea] : [0xe2, 0x57, 0x4c], t = f < 0.5 ? f * 2 : (f - 0.5) * 2; return (Math.round(a[0] + (b[0] - a[0]) * t) << 16) | (Math.round(a[1] + (b[1] - a[1]) * t) << 8) | Math.round(a[2] + (b[2] - a[2]) * t); };
  const SUPM = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '-': '⁻' };
  const sup = (n) => String(n).replace(/[0-9-]/g, (c) => SUPM[c]);
  function sci(x, d) { if (!x || !isFinite(x)) return '0'; d = d == null ? 1 : d; const sg = x < 0 ? '−' : ''; x = Math.abs(x) * (1 + 1e-12); let e = Math.floor(Math.log10(x)), m = x / Math.pow(10, e); m = Number(m.toFixed(d)); if (m >= 10) { m /= 10; e++; } return sg + m.toFixed(d) + '×10' + sup(e); }
  const g3 = (x) => String(parseFloat((x * (1 + 1e-12)).toPrecision(3)));
  const E_CH = 1.6e-19, M_E = 9.11e-31, M_P = 1.67e-27;
  const CMU = 0.5;                                                 // 등전위면 장면: 1 cm = 0.5
  const PLU = 0.7;                                                 // 평행판 장면: 1 cm = 0.7

  window.SciSim3D.attach({
    title: '전기력선과 등전위면 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대 · 값은 옆 조작판에서 바꿔요',
    camera: { dist: 14 * KD, theta: 0.2, phi: 1.3, min: 5, max: 30 },
    autoRotate: 0,
    levels: [3],   // 1~3단계는 캔버스에서 방향을 가리키거나 점 X·Y, 십자(✚)를 끌어야 해서 2D, 4단계(그림 해석)는 3D
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const h = H3(ctx); const { V3, mat, mkArrow, setArrow, arrowSet, mkSeg, setSeg, anchor, sphere, fib, grab, showCtl } = h;
      const LS = () => window.__sim || null;
      const labs = {};
      const L = (sc, text, obj, o) => { const l = label(text, obj, o); (labs[sc] = labs[sc] || []).push(l); return l; };
      const bg = (l, c) => { l.el.style.background = c; };
      const st = { u: 0, plUser: false, tcP: -1, tcUser: false };
      const gL = new THREE.Group(), gQ = new THREE.Group(), gP = new THREE.Group(); root.add(gL, gQ, gP);
      const lineMat = mat(0xffd25a, { emissive: 0xffb300, emissiveIntensity: 0.55, roughness: 0.4 });
      const coneMat = mat(0xffe9a0, { emissive: 0xffc84d, emissiveIntensity: 0.6, roughness: 0.4 });

      /* ---------- 전기력선 (3차원에서 직접 따라가요) ---------- */
      function fld(ch, p) {
        let ex = 0, ey = 0, ez = 0;
        for (let i = 0; i < ch.length; i++) { const c = ch[i], dx = p.x - c.x, dy = p.y - c.y, dz = p.z - c.z, r2 = Math.max(dx * dx + dy * dy + dz * dz, 0.04 * 0.04 * 100), r = Math.sqrt(r2), k = c.q / (r2 * r); ex += dx * k; ey += dy * k; ez += dz * k; }
        return new V3(ex, ey, ez);
      }
      function trace(ch, p0, sgn, stopR, maxR) {
        const pts = [p0.clone()], p = p0.clone(), hh = 0.07;
        for (let n = 0; n < 900; n++) {
          const e = fld(ch, p); if (e.length() < 1e-9) break; e.normalize().multiplyScalar(sgn);
          const e2 = fld(ch, p.clone().addScaledVector(e, hh / 2)).normalize().multiplyScalar(sgn);
          p.addScaledVector(e2, hh); pts.push(p.clone());
          if (p.length() > maxR) break;
          if (ch.some((c) => c.q * sgn < 0 && Math.hypot(p.x - c.x, p.y - c.y, p.z - c.z) < stopR)) break;
        }
        return pts;
      }
      function addLine(g, pts, reverse) {
        const sub = pts.filter((_, i) => i % 3 === 0 || i === pts.length - 1); if (sub.length < 3) return;
        const curve = new THREE.CatmullRomCurve3(sub);
        g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, Math.min(200, sub.length * 2), 0.024, 6, false), lineMat));
        [0.5].forEach((u) => { const c = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.27, 12), coneMat); c.position.copy(curve.getPointAt(u)); const tg = curve.getTangentAt(u); c.quaternion.setFromUnitVectors(h.Yax, tg.multiplyScalar(reverse ? -1 : 1)); g.add(c); });
      }
      /* 그림 하나(점전하·쌍극자·두 전하·도체)를 3D로 만들어 둬요: key → { group, ch } */
      const figs = {};
      const gx = (sim, p) => new V3((p.x - sim.CX) / sim.PS * U, -(p.y - sim.CY) / sim.PS * U, 0);
      function buildFig(key, def, sim) {
        const g = new THREE.Group(); g.visible = false; gL.add(g);
        const ch = def.ch.map((c) => { const p = gx(sim, c); return { x: p.x, y: p.y, z: 0, q: c.q }; });
        const rec = { g, ch, charges: [], pts: {}, def };
        if (def.kind === 'spheroid') {
          const a = def.a / sim.PS * U, b = def.b / sim.PS * U, cy = -(def.cy - sim.CY) / sim.PS * U;
          const el = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), mat(0xcbd5e1, { metalness: 0.7, roughness: 0.3 })); el.scale.set(b, a, b); el.position.y = cy; g.add(el);
          const cc = []; const M = 21, c0 = Math.sqrt(a * a - b * b); for (let i = 0; i < M; i++) cc.push({ x: 0, y: cy - c0 + 2 * c0 * i / (M - 1), z: 0, q: 1 / M * 3 });
          for (let k = 0; k < 9; k++) {
            const sy = -a + (k + 0.5) * 2 * a / 9, rr = b * Math.sqrt(Math.max(0, 1 - (sy / a) * (sy / a))), n = 3 + Math.round(5 * Math.sqrt(1 - (sy / a) * (sy / a)));
            for (let j = 0; j < n; j++) {
              const an = Math.PI * 2 * (j + (k % 2) * 0.5) / n, nx = Math.cos(an) * rr / (b * b), ny = sy / (a * a), nz = Math.sin(an) * rr / (b * b), nl = Math.hypot(nx, ny, nz);
              const p0 = new V3(Math.cos(an) * rr + nx / nl * 0.05, cy + sy + ny / nl * 0.05, Math.sin(an) * rr + nz / nl * 0.05);
              addLine(g, trace(cc, p0, 1, 0, 6.5), false);
            }
          }
          rec.spheroid = { a, b, cy };
        } else {
          const pos = ch.filter((c) => c.q > 0), neg = ch.filter((c) => c.q < 0);
          ch.forEach((c, i) => {
            const r = (Math.abs(c.q) > 1 ? 0.34 : 0.28), m = sphere(r, 0x8a94a6, { roughness: 0.3, emissive: 0x8a94a6, emissiveIntensity: 0.4 }); m.position.set(c.x, c.y, 0); g.add(m);
            const l = L('lines:' + key, '?', m, { color: '#64748b', size: 15, offset: [0, 0.55, 0] }); rec.charges.push({ l, m, q: c.q });
          });
          (pos.length ? pos : neg).forEach((c) => {
            const N = Math.round(Math.abs(c.q) * 12), r0 = (Math.abs(c.q) > 1 ? 0.34 : 0.28) + 0.04;
            fib(N).forEach((dv) => addLine(g, trace(ch, new V3(c.x, c.y, 0).addScaledVector(dv, r0), pos.length ? 1 : -1, r0 + 0.02, 7), !pos.length));
          });
        }
        Object.keys(def.pts).forEach((k) => {
          const p = def.pts[k], m = sphere(0.1, 0x475569, { roughness: 0.5 }); m.position.copy(gx(sim, p)); g.add(m);
          const l = L('lines:' + key, k, m, { color: '#26324a', size: 14, offset: [0.28, 0.28, 0] });
          rec.pts[k] = { m, l, arrow: mkArrow(0xf26b3a, 0.05) }; rec.pts[k].arrow.visible = false; g.add(rec.pts[k].arrow);
        });
        // 등전위선 단면 (그림 가·나·다): 2D의 등전위선을 그대로 가져와 z = 0 면에 놓아요
        if (def.cont && def.cont.length) {
          const FR = sim.FR, W = 1000, Hc = Math.round(1000 * (FR.y1 - FR.y0) / (FR.x1 - FR.x0)), cv = document.createElement('canvas'); cv.width = W; cv.height = Hc;
          const c2 = cv.getContext('2d'), sc = W / (FR.x1 - FR.x0); c2.scale(sc, sc); c2.translate(-FR.x0, -FR.y0); c2.lineWidth = 3.5 / sc * 1;
          const vmin = def.cont[0].lv, vmax = def.cont[def.cont.length - 1].lv;
          def.cont.forEach((c, i) => { const f = def.cont.length > 1 ? (c.lv - vmin) / (vmax - vmin) : 0.5; c2.strokeStyle = '#ffffff'; c2.globalAlpha = 0.9; c2.stroke(c.path); });
          const tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding;
          const wU = (FR.x1 - FR.x0) / sim.PS * U, hU = (FR.y1 - FR.y0) / sim.PS * U;
          const pl = new THREE.Mesh(new THREE.PlaneGeometry(wU, hU), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
          pl.position.copy(gx(sim, { x: (FR.x0 + FR.x1) / 2, y: (FR.y0 + FR.y1) / 2 })); g.add(pl); rec.plane = pl;
          rec.vlabs = def.cont.map((c) => ({ lv: c.lv, row: c.row, labs: c.labs }));
          // 2D처럼 등전위선마다 전위 눈금(V)을 붙여요
          def.cont.forEach((c) => { if (c.row == null || !c.labs || !c.labs.length) return; const x = c.lv < -1e-9 ? Math.min.apply(null, c.labs) : c.lv > 1e-9 ? Math.max.apply(null, c.labs) : c.labs[0]; const q = gx(sim, { x, y: c.row }); L('lines:' + key, Math.round(c.lv) + ' V', anchor(g, q.x, q.y, q.z), { color: '#26324a', size: 11 }); });
        }
        figs[key] = rec; return rec;
      }

      /* ---------- 등전위면 (점전하 +1.0 nC, V = kq/r) ---------- */
      const gE = new THREE.Group(); gQ.add(gE);
      const q0 = sphere(0.3, POS, { roughness: 0.3, emissive: POS, emissiveIntensity: 0.4 }); gE.add(q0);
      L('equi', '+1.0 nC', q0, { color: '#c0392b', size: 13, offset: [0, 0.6, 0] });
      const RADS = [3, 6, 9, 12], VS = [300, 150, 100, 75];
      const shellM = RADS.map((r, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r * CMU, 48, 32), h.glass(potHex(1 - i / 3 * 0.5 - 0.0), 0.12, { roughness: 0.4 })); gE.add(m); return m; });
      RADS.forEach((r, i) => L('equi', VS[i] + ' V · ' + r + ' cm', anchor(gE, r * CMU * 0.72, r * CMU * 0.72 * 0.95, 0), { color: '#b45309', size: 12 }));
      const rad = arrowSet(30, 0.03); gE.add(rad.group);
      fib(30).forEach((dv, i) => rad.set(i, dv.clone().multiplyScalar(1.2), dv, 0.45, 0xffd25a)); rad.flush();
      const pX = sphere(0.15, 0xf26b3a, { emissive: 0xf26b3a, emissiveIntensity: 0.5 }), pY = sphere(0.15, 0x16a34a, { emissive: 0x16a34a, emissiveIntensity: 0.5 }); gE.add(pX, pY);
      const lX = L('equi', 'X', pX, { color: '#f26b3a', size: 13, offset: [0, 0.4, 0] }), lY = L('equi', 'Y', pY, { color: '#16a34a', size: 13, offset: [0, 0.4, 0] });
      const tcB = sphere(0.14, 0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.6 }); gE.add(tcB);
      const lTc = L('equi', '시험 전하 2.0 nC', tcB, { color: '#475569', size: 12, offset: [0, -0.4, 0] });
      const tcTrail = []; for (let i = 0; i < 24; i++) { const t = sphere(0.04, 0xffffff, { roughness: 0.6 }); gE.add(t); tcTrail.push(t); }
      const polar3 = (rcm, ang) => new V3(Math.cos(ang) * rcm * CMU, -Math.sin(ang) * rcm * CMU, 0);
      const A0 = -30 * Math.PI / 180;
      function tcPos3(mode, s) { return mode === 'arc' ? polar3(3, A0 + Math.PI * 2 * s) : mode === 'rad' ? polar3(3 + 9 * s, A0) : polar3(3, A0); }
      function updEqui(S, sim) {
        const l = S.l2, E2 = sim.E2, bi = l.band, mk = S.gate === 'm2b';
        const toP = (m) => new V3((m.x - E2.cx) / E2.px * CMU, -(m.y - E2.cy) / E2.px * CMU, 0);
        pX.position.copy(toP(l.X)); pY.position.copy(toP(l.Y));
        const vX = sim.Vof(l.X), vY = sim.Vof(l.Y);
        lX.set('X ' + vX + ' V'); lY.set('Y ' + vY + ' V');
        shellM.forEach((m, i) => { m.material.opacity = (i === bi || i === bi + 1) ? 0.26 : 0.1; });
        let tm = l.tc.mode, ts = l.tc.s;
        if (st.tcUser) { const p = st.tcP; if (p < 0.4) { tm = 'arc'; ts = p / 0.4; } else if (p < 0.75) { tm = 'rad'; ts = (p - 0.4) / 0.35; ts = ts * ts * (3 - 2 * ts); } else { tm = 'rad'; ts = 1 - (p - 0.75) / 0.25; ts = ts * ts * (3 - 2 * ts); } }
        const tp = tcPos3(tm, ts); tcB.position.copy(tp);
        const rcm = Math.hypot(tp.x, tp.y) / CMU, Vt = 900 / rcm, Uj = 2.0e-9 * Vt;
        lTc.set('시험 전하 2.0 nC · U = ' + sci(Uj) + ' J');
        tcTrail.forEach((t, i) => { const f = (i + 1) / tcTrail.length; t.visible = (tm === 'arc' || tm === 'rad') && ts > 0.02; if (t.visible) t.position.copy(tcPos3(tm, ts * f)); });
        const dV = IVd(sim, bi);
        info('<b>🎯 등전위면: 전위와 전기장</b> — 점전하 +1.0 nC, V = kq/r (= 9.0 V·m ÷ r)<br>X = ' + vX + ' V, Y = ' + vY + ' V → 전위차 ΔV = ' + Math.abs(vX - vY) + ' V<br>구간 ' + RADS[bi] + '~' + RADS[bi + 1] + ' cm: ΔV = ' + dV[0] + ' V − ' + dV[1] + ' V = ' + (dV[0] - dV[1]) + ' V, Δr = 3 cm<br>E ≈ ΔV / Δr = ' + (mk ? '?' : sci((dV[0] - dV[1]) / 0.03) + ' V/m') +
          '<br>' + (tm === 'arc' ? (ts >= 1 ? 'U가 그대로 → 한 일 W = 0' : 'U가 변하지 않아요…') : tm === 'rad' ? (ts >= 1 ? 'W = qΔV = ' + sci(2.0e-9 * 225) + ' J' : 'U가 줄어들고 있어요…') : '▶ 재생이나 2D의 버튼으로 시험 전하를 옮겨 보세요'));
      }
      const IVd = (sim, i) => sim.IV[i];

      /* ---------- 평행판 ---------- */
      const topP = h.box(6.8, 0.16, 5, 0xe2574c, { roughness: 0.35, metalness: 0.5 }), botP = h.box(6.8, 0.16, 5, 0x2f6df6, { roughness: 0.35, metalness: 0.5 }); gP.add(topP, botP);
      const pArr = arrowSet(25, 0.03); gP.add(pArr.group);
      const eqPl = []; for (let i = 0; i < 11; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 4.6), h.glass(0xffb070, 0.13)); m.rotation.x = Math.PI / 2; gP.add(m); const a = anchor(gP); eqPl.push({ m, a, l: L('plates', '', a, { color: '#b45309', size: 12 }) }); }
      const aTop = anchor(gP), aBot = anchor(gP), lTop = L('plates', '', aTop, { color: '#c0392b', size: 13 }), lBot = L('plates', '', aBot, { color: '#2f6df6', size: 13 });
      const ele = sphere(0.2, NEG, { emissive: NEG, emissiveIntensity: 0.4 }), pro = sphere(0.2, POS, { emissive: POS, emissiveIntensity: 0.4 }); gP.add(ele, pro);
      const fE = mkArrow(0xf26b3a, 0.05), fPr = mkArrow(0xf26b3a, 0.05); gP.add(fE, fPr);
      const lEle = L('plates', '전자', ele, { color: '#2f6df6', size: 12, offset: [0.55, 0, 0] }), lPro = L('plates', '양성자', pro, { color: '#c0392b', size: 12, offset: [0.65, 0, 0] });
      const aF1 = anchor(gP), aF2 = anchor(gP); const lF1 = L('plates', 'F', aF1, { color: '#9a3412', size: 12 }), lF2 = L('plates', 'F', aF2, { color: '#9a3412', size: 12 });
      const probe = new THREE.Group(); [[0.3, 0.04, 0.04], [0.04, 0.3, 0.04], [0.04, 0.04, 0.3]].forEach((s) => probe.add(h.box(s[0], s[1], s[2], 0x26324a, { roughness: 0.4 }))); gP.add(probe);
      const aPr = anchor(gP), lPr = L('plates', '', aPr, { color: '#26324a', size: 13 });
      const dSeg = mkSeg(0x16a34a, 0.03), aD = anchor(gP), lD = L('plates', '', aD, { color: '#0b7a41', size: 12 }); gP.add(dSeg);
      function updPlates(S, sim) {
        const l = S.l3, V = l.V, d = l.d, E = V / (d / 100), gap = d * PLU, step = Math.ceil(V / 6), mk = S.gate === 'num3', r = l.run;
        const tp = Math.sqrt(2 * Math.pow(d / 100, 2) * M_E / (E_CH * V));
        topP.position.y = gap / 2 + 0.08; botP.position.y = -gap / 2 - 0.08;
        let k = 0;
        for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++, k++) pArr.set(k, new V3(i * 1.2, gap / 2 - 0.1, j * 0.9), new V3(0, -1, 0), gap - 0.25, 0x35d6c0);
        pArr.flush();
        eqPl.forEach((e, i) => { const v = step * (i + 1), on = v < V - 1e-9; e.m.visible = on; e.l.show(on && gP.visible); if (on) { const y = -gap / 2 + v / V * gap; e.m.position.y = y; e.a.position.set(3.45, y, 2.4); e.l.set(v + ' V'); } });
        aTop.position.set(-3.0, gap / 2 + 0.5, 2.2); aBot.position.set(-3.0, -gap / 2 - 0.5, 2.2); lTop.set('(+)판  ' + V + ' V'); lBot.set('(−)판  0 V');
        const u = st.plUser ? st.u : Math.max(0, Math.min(1, r.t / tp));
        const gp = gap * 46 / PLU;                                     // 2D 픽셀 간격
        const fE0 = (9 + (gp - 18) * u * u) / gp, fP0 = (9 + (gp - 18) * u * u / (M_P / M_E)) / gp;
        ele.position.set(-1.2, -gap / 2 + fE0 * gap, 0); pro.position.set(1.2, gap / 2 - fP0 * gap, 0);
        setArrow(fE, ele.position.clone().add(new V3(0, 0.3, 0)), ele.position.clone().add(new V3(0, 1.2, 0))); setArrow(fPr, pro.position.clone().add(new V3(0, -0.3, 0)), pro.position.clone().add(new V3(0, -1.2, 0)));
        aF1.position.copy(ele.position).add(new V3(0.4, 0.75, 0)); aF2.position.copy(pro.position).add(new V3(0.4, -0.75, 0));
        const pr = l.probe, f = (sim.plGeom().bot - pr.y) / sim.plGeom().g;
        probe.position.set((pr.x - (sim.PL.x0 + sim.PL.x1) / 2) * 0.02, -gap / 2 + f * gap, 0);
        aPr.position.set(probe.position.x + 0.9, probe.position.y + 0.3, 0); lPr.set('E = ' + (mk ? '?' : g3(E) + ' V/m'));
        setSeg(dSeg, new V3(-3.2, -gap / 2, 0), new V3(-3.2, gap / 2, 0)); aD.position.set(-3.55, 0, 0); lD.set('d = ' + g3(d) + ' cm');
        const F = E_CH * E, ae = F / M_E, ap = F / M_P, gapc = step / V * d;
        info('<b>🔋 평행판 사이의 균일한 전기장</b><br>인접한 선: ΔV = ' + step + ' V, 간격 ' + g3(gapc) + ' cm<br>E = ΔV / Δd = ' + (mk ? '?' : step + ' / ' + g3(gapc / 100) + ' = ' + g3(E) + ' V/m') + '<br>판 전체: E = V / d = ' + (mk ? '?' : V + ' / ' + g3(d / 100) + ' = ' + g3(E) + ' V/m') + '<br>F = eE = ' + (mk ? '?' : sci(F) + ' N') + ', 가속도 전자 ' + (mk ? '?' : sci(ae) + ' m/s²') + ', 양성자 ' + (mk ? '?' : sci(ap) + ' m/s²') +
          (u > 0 ? '<br>전자 운동 에너지 ' + g3(V * u * u) + ' eV, 양성자 ' + (V * u * u / (M_P / M_E) < 0.01 ? sci(V * u * u / (M_P / M_E), 1) : g3(V * u * u / (M_P / M_E))) + ' eV' : '<br>▶ 재생이나 2D의 [▶ 전자·양성자 놓기]로 놓아 보세요'));
      }

      /* ---------- ▶ 재생 ---------- */
      let built = false;
      const plEq = grab('equi', () => controls.player({
        duration: 10, loop: true, autoplay: false, label: '시험 전하 옮기기',
        phases: [[0, '같은 등전위면 위로 (W = 0)'], [0.4, '75 V 면까지 바깥으로 (W = qΔV)'], [0.75, '되돌아오기']],
        onFrame(p) { if (!built) return; st.tcP = p; st.tcUser = true; sig = ''; },
      }));
      const plPl = grab('plates', () => controls.player({
        duration: 5, loop: true, autoplay: false, label: '전자·양성자 놓기',
        phases: [[0, '놓는 순간'], [0.35, '가속 중'], [0.9, '도착']],
        onFrame(p) { if (!built) return; st.u = Math.min(1, p / 0.9); st.plUser = true; sig = ''; },
      }));
      built = true;

      const MODES = { read: 'read', equi: 'equi', plates: 'plates', fig: 'fig' };
      const camD = { lines: 13, equi: 13, plates: 13 };
      const TIPS = { a: ['전기력선의 화살표 방향으로 전하의 부호를 알 수 있어요', '선이 빽빽한 곳 = E가 큰 곳, 등전위선 눈금 = 전위 V'], b: ['선이 서로 밀려나는 곳(선이 없는 곳)이 E = 0인 점이에요', '같은 등전위선 위의 두 점은 전위가 같아요'], c: ['도체 표면은 등전위면이고, 전기력선은 표면에 수직으로 나와요', '선이 빽빽한 뾰족한 끝에서 E가 가장 세요'] };
      let sig = '', lastKey = '';
      function curKey(S) { return S.mode === 'read' ? 'read' + S.l1.fig : S.mode === 'fig' ? 'fig' + S.l4.fig : S.mode; }
      function showKey(key, S, sim) {
        const lines = key.indexOf('read') === 0 || key.indexOf('fig') === 0;
        gL.visible = lines; gQ.visible = key === 'equi'; gP.visible = key === 'plates';
        Object.keys(labs).forEach((k) => labs[k].forEach((l) => l.show(k === key || (k === 'lines:' + key))));
        if (lines) {
          const def = S.mode === 'read' ? sim.FIG1[S.l1.fig] : sim.A4[S.l4.fig];
          const fk = S.mode === 'read' ? 'r' + S.l1.fig : 'f' + S.l4.fig;
          Object.keys(figs).forEach((k) => { figs[k].g.visible = k === fk; Object.keys(labs).forEach(() => {}); });
          if (!figs[fk]) buildFig(fk, def, sim);
          figs[fk].g.visible = true;
          Object.keys(labs).forEach((k) => { if (k.indexOf('lines:') === 0) labs[k].forEach((l) => l.show(k === 'lines:' + fk)); });
        } else Object.keys(labs).forEach((k) => { if (k.indexOf('lines:') === 0) labs[k].forEach((l) => l.show(false)); });
        showCtl(key === 'equi' ? 'equi' : key === 'plates' ? 'plates' : '__none');
        ctx.orbit.tx = 0; ctx.orbit.ty = 0; ctx.orbit.theta = 0.2; ctx.orbit.phi = key === 'plates' ? 1.15 : 1.3; ctx.orbit.dist = (key === 'plates' ? 12 : 13) * KD;
      }
      function updLines(S, sim) {
        const fk = S.mode === 'read' ? 'r' + S.l1.fig : 'f' + S.l4.fig, rec = figs[fk]; if (!rec) return;
        const rev = S.mode === 'read' && (S.l1.reveal || (sim.game && sim.game.free));       // 2D처럼 부호는 그림을 읽어서 알아내요 (정답을 알려 주기 전에는 ?)
        rec.charges.forEach((c) => { const col = rev ? (c.q > 0 ? POS : NEG) : 0x8a94a6; c.m.material.color.setHex(col); c.m.material.emissive.setHex(col); c.l.set(rev ? (c.q > 0 ? '+' : '−') : '?'); c.l.el.style.background = rev ? (c.q > 0 ? '#c0392b' : '#2f6df6') : '#64748b'; });
        if (S.mode === 'read') {
          const a = S.l1.ang[S.l1.fig], f = sim.FIG1[S.l1.fig];
          ['A', 'B', 'C'].forEach((k) => {
            const p = rec.pts[k], an = a[k], ok = an != null && sim.ptOK(S.l1.fig, k), c = ok ? 0x16a34a : 0xf26b3a;
            p.m.material.color.setHex(ok ? 0x16a34a : 0x475569); p.l.el.style.background = S.l1.sel === k ? '#f26b3a' : '#26324a';
            if (an != null) { const o = p.m.position.clone(); setArrow(p.arrow, o, o.clone().add(new V3(Math.cos(an), -Math.sin(an), 0).multiplyScalar(1.0))); p.arrow.userData.m.color.setHex(c); } else p.arrow.visible = false;
          });
          info('<b>🗺️ 완성된 전기력선 그림 — 점 A, B, C에서 전기장을 읽어요</b> (그림 ' + S.l1.fig + ': ' + f.name + ')<br>① 선은 (+)에서 나와 (−)로 들어가요<br>② 선의 접선 방향 = 그 점의 전기장 방향<br>③ 선이 빽빽한 곳일수록 전기장이 세요<br>방향 화살표는 왼쪽 2D 화면에서 정해요.');
        } else {
          const k = S.l4.fig; ['A', 'B', 'C'].forEach((n) => { rec.pts[n].arrow.visible = false; });
          info('<b>🔍 처음 보는 그림 — ' + sim.A4[k].name + '</b> (' + (k === 'c' ? '도체' : '등전위선 V 눈금') + ')<br>• ' + TIPS[k][0] + '<br>• ' + TIPS[k][1] + '<br>흰 선: 등전위선(단면)' + (rec.vlabs && k !== 'c' ? ' — ' + rec.vlabs.map((v) => Math.round(v.lv) + ' V').join(', ') : ''));
        }
      }
      return {
        update(dt, t) {
          const sim = LS(); if (!sim) return; const S = sim.S, key = curKey(S);
          if (key !== lastKey) { lastKey = key; sig = ''; showKey(key, S, sim); if (key === 'equi') { st.tcUser = false; plEq.pause(); } if (key === 'plates') { st.plUser = false; plPl.pause(); } }
          const r = S.l3.run;
          if (S.mode === 'plates' && r.st === 'run' && st.plUser) { st.plUser = false; plPl.pause(); }
          if (S.mode === 'equi' && S.l2.tc.mode && st.tcUser && S.l2.tc.s > 0 && S.l2.tc.s < 0.03) { st.tcUser = false; plEq.pause(); }
          let d;
          if (S.mode === 'read') d = [S.l1.fig, S.l1.sel, JSON.stringify(S.l1.ang[S.l1.fig]), S.gate, S.l1.reveal, !!(sim.game && sim.game.free)];
          else if (S.mode === 'fig') d = [S.l4.fig];
          else if (S.mode === 'equi') d = [S.l2.X.x, S.l2.X.y, S.l2.Y.x, S.l2.Y.y, S.l2.band, S.l2.tc.mode, S.l2.tc.s, S.gate, st.tcP, st.tcUser];
          else d = [S.l3.V, S.l3.d, S.l3.probe.x, S.l3.probe.y, r.st, r.t, st.u, st.plUser, S.gate];
          const s2 = d.join('|');
          if (s2 !== sig) { sig = s2; if (S.mode === 'equi') updEqui(S, sim); else if (S.mode === 'plates') updPlates(S, sim); else updLines(S, sim); }
          if (S.mode === 'plates') probe.rotation.y += dt * 0.5;
        },
        sync() { sig = ''; },
      };
    },
  });
})();
