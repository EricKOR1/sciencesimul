/* hq-electric-field · 3D 점전하의 전기장 (전기력 · 전기장 · 전기장의 합)
   전기력 F = kq₁q₂/r², 전기장 E = F/q′ = kq/r² (+전하는 밖으로, −전하는 안으로), 여러 전하의 E는 벡터합. */
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
  const POS = 0xff5a5f, NEG = 0x4d8dff, K = 9.0e9;
  const SUPM = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '-': '⁻' };
  const sup = (n) => String(n).replace(/[0-9-]/g, (c) => SUPM[c]);
  function sci(x, d) {
    if (!x || !isFinite(x)) return '0';
    d = d == null ? 1 : d;
    const sg = x < 0 ? '−' : ''; x = Math.abs(x) * (1 + 1e-12);
    let e = Math.floor(Math.log10(x)), m = x / Math.pow(10, e);
    m = Number(m.toFixed(d)); if (m >= 10) { m /= 10; e++; }
    return sg + m.toFixed(d) + '×10' + sup(e);
  }
  const f3 = (x) => (x >= 1000 || (x > 0 && x < 0.001) ? sci(x, 2) : (x * (1 + 1e-12)).toPrecision(3));
  const sgn = (q) => (q > 0 ? '+' : '−');
  const PRE = {
    a: [{ x: 0, y: 0, q: 2e-6 }, { x: 0.6, y: 0, q: 8e-6 }],
    b: [{ x: -0.3, y: 0, q: 2e-6 }, { x: 0.3, y: 0, q: 2e-6 }],
    c: [{ x: -0.3, y: 0, q: 2e-6 }, { x: 0.3, y: 0, q: -2e-6 }],
  };
  const PP = { b: { x: 0, y: 0.4 }, c: { x: 0, y: 0.4 } };
  function evec(c, P) {
    const dx = P.x - c.x, dy = P.y - c.y, r2 = dx * dx + dy * dy, r = Math.sqrt(r2), E = K * Math.abs(c.q) / r2, s = Math.sign(c.q);
    return { x: s * E * dx / r, y: s * E * dy / r, m: E, r };
  }
  const dirWord = (v) => (Math.hypot(v.x, v.y) < 1e3 ? '없음 (0)' : Math.abs(v.x) > Math.abs(v.y) ? (v.x > 0 ? '오른쪽(+x)' : '왼쪽(−x)') : (v.y > 0 ? '위쪽(+y)' : '아래쪽(−y)'));

  window.SciSim3D.attach({
    title: '점전하의 전기장 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대 · 값은 옆 조작판에서 바꿔요',
    camera: { dist: 12.5 * KD, theta: 0.15, phi: 1.2, min: 5, max: 28 },
    autoRotate: 0,
    levels: [3],   // 1~3단계는 표 기록·시험 전하 끌어 놓기·E–r 그래프가 캔버스에 있어서 2D, 4단계(전기장의 합)는 3D
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const h = H3(ctx); const { V3, mat, mkArrow, setArrow, arrowSet, mkSeg, setSeg, anchor, sphere, fib, grab, showCtl } = h;
      const LS = () => window.__sim || null;
      const st = { sc: 'force', sumT: 1, sumUser: false, inkT: 0, pre: '' };
      const gF = new THREE.Group(), gE = new THREE.Group(), gG = new THREE.Group(), gS = new THREE.Group(), gI = new THREE.Group();
      root.add(gF, gE, gG, gS, gI);
      const labs = {}; // 장면별 라벨 (장면을 바꿀 때 켜고 끔)
      const L = (sc, text, obj, o) => { const l = label(text, obj, o); (labs[sc] = labs[sc] || []).push(l); return l; };
      const colOf = (q) => (q > 0 ? POS : NEG);
      function charge(g, q0, r) {
        const m = sphere(r || 0.3, colOf(q0), { roughness: 0.3, emissive: colOf(q0), emissiveIntensity: 0.35 });
        const halo = new THREE.Mesh(new THREE.SphereGeometry(1.5 * (r || 0.3), 24, 16), h.glass(colOf(q0), 0.18));
        m.add(halo); g.add(m); m.userData.halo = halo; return m;
      }
      function paint(m, q, r) {
        m.material.color.setHex(colOf(q)); m.material.emissive.setHex(colOf(q)); m.userData.halo.material.color.setHex(colOf(q));
        m.scale.setScalar(r / m.geometry.parameters.radius);
      }
      const dash = (g, a, b, col, op) => { const s = mkSeg(col || 0xaab4c8, 0.015, { basic: true, mo: { transparent: true, opacity: op || 0.55 } }); setSeg(s, a, b); g.add(s); return s; };
      function ruler(g, x0, x1, y, n, sc) { // 0.1 m 눈금자
        g.add(Object.assign(mkSeg(0x8da2c4, 0.025), {}));
        const bar = g.children[g.children.length - 1]; setSeg(bar, new V3(x0, y, 0), new V3(x1, y, 0));
        for (let u = 0; u <= n; u++) { const x = x0 + (x1 - x0) * u / n, t = u % 5 ? 0.08 : 0.16; const tk = mkSeg(0x8da2c4, 0.02); setSeg(tk, new V3(x, y - t, 0), new V3(x, y + t, 0)); g.add(tk); }
        [0, 0.5, 1].forEach((u) => { const a = anchor(g, x0 + (x1 - x0) * u, y - 0.38, 0); L(sc, u.toFixed(u === 0.5 ? 1 : 0) + ' m', a, { color: '#8da2c4', size: 11 }); });
      }
      const bg = (l, c) => { l.el.style.background = c; };

      /* ================= ① 전기력 (A, B는 +전하, μC · m) ================= */
      const FU = 8, FQ = (q) => 0.14 + 0.035 * q;                       // 1 m = 8, 전하 반지름
      gF.position.x = -FU / 2;
      const cA = charge(gF, 1, 0.3), cB = charge(gF, 1, 0.3);
      const fA = mkArrow(0xf26b3a, 0.08), fB = mkArrow(0xf26b3a, 0.08); gF.add(fA, fB);
      ruler(gF, 0, FU, -1.2, 10, 'force');
      const rSeg = mkSeg(0xf26b3a, 0.05); gF.add(rSeg);
      const rBall = sphere(0.1, 0xf26b3a); gF.add(rBall);
      const aqA = anchor(gF), aqB = anchor(gF), aFA = anchor(gF), aFB = anchor(gF), aR = anchor(gF);
      const lqA = L('force', '', aqA, { color: '#c0392b', size: 13 }), lqB = L('force', '', aqB, { color: '#c0392b', size: 13 });
      const lFA = L('force', '', aFA, { color: '#b7791f', size: 13 }), lFB = L('force', '', aFB, { color: '#b7791f', size: 13 });
      const lR = L('force', '', aR, { color: '#516079', size: 12 });
      function updForce(S, sim) {
        const f = S.f1, F = K * f.qa * f.qb * 1e-12 / (f.r * f.r), mk = S.gate === 'num1';
        const xA = 0, xB = f.r * FU, rA = FQ(f.qa), rB = FQ(f.qb);
        cA.position.set(xA, 0, 0); cB.position.set(xB, 0, 0); paint(cA, 1, rA); paint(cB, 1, rB);
        const len = Math.max(0.3, 0.02 * (22 + 24 * Math.log10(F / 1e-3)));      // 2D처럼 로그 눈금으로 줄여 그려요
        setArrow(fA, new V3(xA - rA - 0.05, 1.0, 0), new V3(xA - rA - 0.05 - len, 1.0, 0));
        setArrow(fB, new V3(xB + rB + 0.05, 1.0, 0), new V3(xB + rB + 0.05 + len, 1.0, 0));
        aFA.position.set(xA - rA - len / 2, 1.55, 0); aFB.position.set(xB + rB + len / 2, 1.55, 0);
        aqA.position.set(xA, rA + 0.55, 0); aqB.position.set(xB, rB + 0.55, 0);
        const ft = mk ? '?' : f3(F) + ' N';
        lFA.set('A가 받는 힘 ' + ft); lFB.set('B가 받는 힘 ' + ft);
        lqA.set('A ' + f.qa.toFixed(1) + ' μC'); lqB.set('B ' + f.qb.toFixed(1) + ' μC');
        setSeg(rSeg, new V3(xA, -1.2, 0), new V3(xB, -1.2, 0)); rBall.position.set(xB, -1.2, 0);
        aR.position.set(xB / 2, -0.75, 0); lR.set('r = ' + f.r.toFixed(2) + ' m');
        const show = f.done || (sim.game && sim.game.free);
        info('<b>⚡ 두 전하 사이에 작용하는 전기력</b><br>A, B 모두 + 전하 → 서로 밀어내요. 두 힘은 크기가 같고 방향이 반대예요.<br>(화살표는 로그 눈금으로 줄여 그렸어요)' +
          (show ? '<br><b>F = k·qA·qB / r²</b> = ' + (mk ? '?' : f3(F) + ' N') : '<br>💭 전하량과 거리를 바꾸며 힘의 규칙을 찾아요.'));
      }

      /* ================= ② 전기장 (q = ±1 μC, 시험 전하 q′ nC) ================= */
      const EU = 7.5, PXU = 0.018;                                  // 1 m = 7.5, 화살표 1px → 0.018
      const src = charge(gE, 1, 0.32);
      const RINGS = [0.15, 0.3, 0.6], NS = 30, dirs = fib(NS);
      const eMap = arrowSet(NS * RINGS.length, 0.035); gE.add(eMap.group);
      RINGS.forEach((r) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r * EU, 36, 24), h.glass(0x8fb4ff, 0.04, { roughness: 0.4 })); gE.add(m); });
      const lRing = RINGS.map((r) => L('field', r.toFixed(2) + ' m', anchor(gE, r * EU * 0.8, r * EU * 0.6, 0), { color: '#cbd5e1', size: 11 }));
      const probe = sphere(0.17, 0xffd166, { roughness: 0.3, emissive: 0xffb300, emissiveIntensity: 0.5 }); gE.add(probe);
      const ghost = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 8, 24), h.basic(0x9aa3b2)); gE.add(ghost);
      const aE = mkArrow(0x2563eb, 0.06), aF = mkArrow(0xf26b3a, 0.06); gE.add(aE, aF);
      const aqS = anchor(gE), aEa = anchor(gE), aFa = anchor(gE), aPq = anchor(gE);
      const lqS = L('field', '', aqS, { color: '#c0392b', size: 14 });
      const lEa = L('field', '', aEa, { color: '#1e40af', size: 13 }), lFa = L('field', '', aFa, { color: '#9a3412', size: 13 }), lPq = L('field', '', aPq, { color: '#b7791f', size: 12 });
      function updField(S, sim) {
        const f = S.f2, g = sim.f2Geo(), mk = S.gate === 'num2';
        const s = f.q > 0 ? 1 : -1; paint(src, s, 0.32);
        src.position.set(0, 0, 0); aqS.position.set(0, 0.8, 0); lqS.set('q = ' + sgn(f.q) + '1.0 μC'); bg(lqS, s > 0 ? '#c0392b' : '#2f6df6');
        // 지도 화살표: 전하에서 바깥(+) / 안쪽(−) 방향, 센 곳일수록 진하고 굵게
        let k = 0;
        RINGS.forEach((rr) => {
          const E = K * 1e-6 / (rr * rr), w = Math.min(1, Math.max(0, (Math.log10(E) - 3.6) / 2.4)), len = 0.4 + 0.3 * w;
          const col = new THREE.Color().setHSL(0.6, 0.55 + 0.4 * w, 0.62 - 0.12 * w).getHex();
          dirs.forEach((dv) => {
            const p = dv.clone().multiplyScalar(rr * EU), d = dv.clone().multiplyScalar(s);
            eMap.set(k++, p.clone().addScaledVector(d, -len / 2), d, len, col);
          });
        });
        eMap.flush();
        // 시험 전하 위치: 2D 화면에서의 위치를 그대로 옮겨요
        const R2 = sim.R2, P = new V3((f.px - R2.cx) / R2.pxm * EU, -(f.py - R2.cy) / R2.pxm * EU, 0);
        const u = new V3(g.ux, -g.uy, 0), perp = new V3(-u.y, u.x, 0), fl = f.fly > 0.98;
        probe.visible = f.has; ghost.visible = !f.has; probe.position.copy(P); ghost.position.copy(P);
        const pr = f.qp > 0 ? 0xffd166 : 0x7ab6ff; probe.material.color.setHex(pr); probe.material.emissive.setHex(f.qp > 0 ? 0xffb300 : 0x3b82f6);
        const e0 = P.clone().addScaledVector(u, 0.3).addScaledVector(perp, 0.2);
        const LE = Math.min(170, g.E / 1e5 * 62) * PXU;
        setArrow(aE, e0, e0.clone().addScaledVector(u, LE)); aE.visible = fl;
        aE.userData.m.transparent = true; aE.userData.m.opacity = f.has ? 1 : 0.4;
        aEa.position.copy(e0).addScaledVector(u, LE / 2).addScaledVector(perp, 0.45); lEa.set('E = ' + sci(g.E) + ' N/C'); lEa.show(fl);
        const sF = g.sF, full = Math.abs(g.qp * 1e9) * g.E / 1e5 * 62; let lf = Math.min(170, full) * PXU;
        if (sF < 0) lf = Math.min(lf, Math.max(0.3, g.rpx / R2.pxm * EU - 0.7));
        const f0 = P.clone().addScaledVector(u, sF * 0.3).addScaledVector(perp, -0.2);
        setArrow(aF, f0, f0.clone().addScaledVector(u, sF * lf)); aF.visible = f.has && fl;
        aFa.position.copy(f0).addScaledVector(u, sF * lf / 2).addScaledVector(perp, -0.45); lFa.set('F = ' + (mk ? '?' : sci(g.F) + ' N')); lFa.show(f.has && fl);
        aPq.position.copy(P).add(new V3(0, -0.45, 0)); lPq.set(f.has ? 'q′ = ' + sgn(f.qp) + Math.abs(f.qp) + ' nC' : '시험 전하 없음'); lPq.show(true);
        const dirW = f.q > 0 ? '바깥쪽' : '안쪽';
        info('<b>🧭 전하 q 주변의 전기장</b><br>① E = k|q|/r² = ' + sci(g.E) + ' N/C (' + dirW + ' 방향, r = ' + g.r.toFixed(2) + ' m)<br>' +
          (f.has ? '② F = q′E = ' + (mk ? '?' : sci(g.F) + ' N') + '<br>③ F / q′ = ' + (mk ? '?' : sci(g.F / Math.abs(g.qp)) + ' N/C') : '시험 전하를 치워도 파란 전기장 화살표는 그 자리에 그대로예요.'));
      }

      /* ================= ③ 거리 관계 (E–r 그래프, 측정 위치) ================= */
      const GW = 8, GH = 5, GX = (r) => r * GW, GY = (E) => E / 20 * GH;          // r: 0~1 m, E: 0~20 (×10⁵ N/C)
      gG.position.set(-GW / 2, 0.2, 0);
      const GC = { 1: 0xe2464b, 2: 0x8b5cf6, '-1': 0x2f6df6 };
      for (let v = 0; v <= 20; v += 5) { dash(gG, new V3(0, GY(v), 0), new V3(GW, GY(v), 0), v === 0 ? 0x8da2c4 : 0x5b6b8c, v === 0 ? 1 : 0.5); L('graph', String(v), anchor(gG, -0.3, GY(v), 0), { color: '#8da2c4', size: 11 }); }
      for (let i = 0; i <= 10; i++) { dash(gG, new V3(GX(i / 10), 0, 0), new V3(GX(i / 10), GH, 0), i === 0 ? 0x8da2c4 : 0x5b6b8c, i === 0 ? 1 : 0.35); if (i % 2 === 0) L('graph', (i / 10).toFixed(1), anchor(gG, GX(i / 10), -0.3, 0), { color: '#8da2c4', size: 11 }); }
      L('graph', 'r (m)', anchor(gG, GW + 0.3, -0.3, 0), { color: '#516079', size: 12 }); L('graph', 'E (×10⁵ N/C)', anchor(gG, 0.9, GH + 0.35, 0), { color: '#516079', size: 12 });
      const Eof = (q, r) => K * Math.abs(q) * 1e-6 / (r * r);
      const curves = {};
      [1, 2, -1].forEach((q) => {
        const pts = []; for (let r = 0.1; r <= 1.0001; r += 0.01) pts.push(new V3(GX(r), GY(Eof(q, r) / 1e5), q === -1 ? 0.12 : 0));
        if (q !== -1) { const m = h.tube(pts, 0.05, GC[q], { seg: 120, rs: 8 }); m.geometry.userData = { n: m.geometry.index.count }; gG.add(m); curves[q] = [m]; }
        else { curves[q] = []; for (let i = 0; i + 5 < pts.length; i += 8) { const m = h.tube(pts.slice(i, i + 6), 0.045, GC[q], { seg: 8, rs: 6 }); m.userData.r1 = 0.1 + (i + 5) * 0.01; gG.add(m); curves[q].push(m); } }
      });
      const pinPool = []; const pinAt = (i) => { if (!pinPool[i]) { const m = sphere(0.11, 0xffffff, { roughness: 0.3 }); gG.add(m); pinPool[i] = m; } return pinPool[i]; };
      const cur = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.04, 10, 28), h.basic(0xffffff)); gG.add(cur);
      const vL = mkSeg(0xe5e7eb, 0.015, { basic: true, mo: { transparent: true, opacity: 0.7 } }), hL = mkSeg(0xe5e7eb, 0.015, { basic: true, mo: { transparent: true, opacity: 0.7 } }); gG.add(vL, hL);
      // 측정 위치 줄 (전하 q와 측정점, E 화살표)
      const SY = -2.3;
      const gs = new THREE.Group(); gG.add(gs); ruler(gs, 0, GW, SY, 10, 'graph');
      const qG = charge(gG, 1, 0.26); qG.position.set(0, SY, 0);
      const mp = sphere(0.14, 0xffb400, { emissive: 0xffb400, emissiveIntensity: 0.4 }); gG.add(mp);
      const aG = mkArrow(0x2563eb, 0.06); gG.add(aG);
      const aqG = anchor(gG, 0, SY + 0.6, 0), aEG = anchor(gG), aCur = anchor(gG);
      const lqG = L('graph', '', aqG, { color: '#c0392b', size: 13 }), lEG = L('graph', '', aEG, { color: '#1e40af', size: 13 });
      function updGraph(S, sim) {
        const f = S.f3, mk = S.gate === 'num3', q = f.q, E = Eof(q, f.r), dirn = q > 0 ? 1 : -1;
        [1, 2, -1].forEach((k) => {
          const t = S.f3.curveT[k] || 0, ms = curves[k];
          if (k !== -1) { ms[0].visible = t > 0.01; ms[0].geometry.setDrawRange(0, Math.floor(ms[0].geometry.userData.n * t / 3) * 3); }
          else ms.forEach((m) => { m.visible = t > 0.01 && m.userData.r1 <= 0.1 + 0.9 * t; });
        });
        let n = 0; const used = [];
        [1, 2, -1].forEach((k) => (f.pts[k] || []).forEach((p) => {
          if (mk && Math.abs(p.r - 0.15) < 1e-6) return;
          const m = pinAt(n++); m.visible = true; m.material.color.setHex(GC[k]); m.material.emissive.setHex(GC[k]);
          m.position.set(GX(p.r), GY(p.E / 1e5) + (1 - (p.drop == null ? 1 : p.drop)) * 1.2, k === -1 ? 0.12 : 0);
        }));
        for (let i = n; i < pinPool.length; i++) pinPool[i].visible = false;
        cur.position.set(GX(f.r), mk ? 0 : GY(E / 1e5), 0.05); cur.material.color.setHex(GC[q]);
        setSeg(vL, new V3(GX(f.r), 0, 0), new V3(GX(f.r), mk ? 0 : GY(E / 1e5), 0)); setSeg(hL, new V3(0, mk ? 0 : GY(E / 1e5), 0), new V3(mk ? 0 : GX(f.r), mk ? 0 : GY(E / 1e5), 0));
        // 아래 줄
        paint(qG, q, 0.26); lqG.set('q = ' + sgn(q) + Math.abs(q) + ' μC'); bg(lqG, q > 0 ? '#c0392b' : '#2f6df6');
        mp.position.set(GX(f.r), SY, 0);
        let len = Math.min(2.4, E / 1e5 * 0.7); if (dirn < 0) len = Math.min(len, Math.max(0.2, GX(f.r) - 0.8));
        const a0 = new V3(GX(f.r), SY + 0.85, 0);
        setArrow(aG, a0, a0.clone().add(new V3(dirn * len, 0, 0))); aG.visible = !mk;
        aEG.position.set(GX(f.r) + dirn * len / 2, SY + 1.35, 0); lEG.set('E = ' + (mk ? '?' : sci(E) + ' N/C'));
        const rows = [];
        [q].forEach((k) => (f.pts[k] || []).filter((p) => !(mk && Math.abs(p.r - 0.15) < 1e-6)).sort((a, b) => a.r - b.r).slice(0, 6).forEach((p) => rows.push('r ' + p.r.toFixed(2) + ' m · E ' + f3(p.E / 1e5) + ' · E·r² ' + f3(p.E * p.r * p.r / 1e3))));
        info('<b>📈 거리에 따른 전기장의 세기</b> (q = ' + sgn(q) + Math.abs(q) + ' μC)<br>측정 위치 r = ' + f.r.toFixed(2) + ' m' + (mk ? '' : ' → E = ' + sci(E) + ' N/C') +
          (rows.length ? '<br><span style="font-size:12px">E(×10⁵)·E·r²(×10³)<br>' + rows.join('<br>') + '</span>' : '<br>📌 점 찍기를 누르면 측정값이 쌓여요.') + (rows.length >= 3 ? '<br>E·r²는 늘 같아요' : ''));
      }

      /* ================= ④ 전기장의 합 (a·b·c 배치, 잉크젯) ================= */
      const SU = 6, SEc = { a: 0.4, b: 1.65 }, SEMAX = { a: 3.2, b: 2.8 };
      const sg = new THREE.Group(); gS.add(sg);
      for (let x = -0.6; x <= 1.4001; x += 0.1) dash(sg, new V3(x * SU, -0.3 * SU, 0), new V3(x * SU, 0.9 * SU, 0), Math.abs(x) < 1e-6 ? 0x8da2c4 : 0x5b6b8c, Math.abs(x) < 1e-6 ? 0.8 : 0.3);
      for (let y = -0.3; y <= 0.9001; y += 0.1) dash(sg, new V3(-0.6 * SU, y * SU, 0), new V3(1.4 * SU, y * SU, 0), Math.abs(y) < 1e-6 ? 0x8da2c4 : 0x5b6b8c, Math.abs(y) < 1e-6 ? 0.8 : 0.3);
      const xl = []; for (let x = -0.4; x <= 1.001; x += 0.2) xl.push(L('sum', (Math.round(x * 10) / 10).toFixed(1), anchor(sg, x * SU, -0.3 * SU - 0.3, 0), { color: '#8da2c4', size: 10.5 }));
      L('sum', 'x (m)', anchor(sg, 1.4 * SU, -0.3 * SU - 0.3, 0), { color: '#516079', size: 11 });
      const sA = charge(gS, 1, 0.3), sB = charge(gS, 1, 0.3);
      const aSa = anchor(gS), aSb = anchor(gS), lSa = L('sum', '', aSa, { color: '#c0392b', size: 13 }), lSb = L('sum', '', aSb, { color: '#c0392b', size: 13 });
      const pP = sphere(0.14, 0x16a34a, { emissive: 0x16a34a, emissiveIntensity: 0.6 }); gS.add(pP);
      const ringP = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.04, 10, 28), h.basic(0x3ddc84)); gS.add(ringP);
      const lP = L('sum', 'P', pP, { color: '#0b7a41', size: 14, offset: [0, -0.4, 0] });
      const e1 = mkArrow(0x2563eb, 0.06), e2 = mkArrow(0x0d9488, 0.06), eS = mkArrow(0x7c3aed, 0.09); gS.add(e1, e2, eS);
      const pgA = dash(gS, new V3(), new V3(1, 0, 0), 0x2563eb, 0.8), pgB = dash(gS, new V3(), new V3(1, 0, 0), 0x0d9488, 0.8);
      const dl1 = dash(gS, new V3(), new V3(1, 0, 0), 0x9fb0d4, 0.7), dl2 = dash(gS, new V3(), new V3(1, 0, 0), 0x9fb0d4, 0.7);
      const aE1 = anchor(gS), aE2 = anchor(gS), aES = anchor(gS), aD1 = anchor(gS), aD2 = anchor(gS);
      const lE1 = L('sum', '', aE1, { color: '#1e40af', size: 12 }), lE2 = L('sum', '', aE2, { color: '#0f766e', size: 12 }), lES = L('sum', '', aES, { color: '#5b21b6', size: 13 });
      const lD1 = L('sum', '0.50 m', aD1, { color: '#8da2c4', size: 11 }), lD2 = L('sum', '0.50 m', aD2, { color: '#8da2c4', size: 11 });
      const clampV = (v, mx) => (v.length() > mx ? v.clone().setLength(mx) : v);
      function updSum(S, sim) {
        const f = S.f4, pre = f.pre, ch = PRE[pre], mk = S.gate === 'num4', T = st.sumT;
        const cx = pre === 'a' ? 0.3 : 0, cy = pre === 'a' ? 0 : 0.2;
        gS.position.set(-cx * SU, -cy * SU, 0);
        [sA, sB].forEach((m, i) => { m.position.set(ch[i].x * SU, ch[i].y * SU, 0); paint(m, ch[i].q, 0.2 + 0.07 * Math.sqrt(Math.abs(ch[i].q) * 1e6)); });
        [[aSa, lSa, 0], [aSb, lSb, 1]].forEach(([a, l, i]) => { a.position.set(ch[i].x * SU, ch[i].y * SU - 0.75, 0); l.set(sgn(ch[i].q) + Math.abs(ch[i].q) * 1e6 + ' μC'); bg(l, ch[i].q > 0 ? '#c0392b' : '#2f6df6'); });
        const P = pre === 'a' ? { x: f.px, y: 0 } : PP[pre], Pv = new V3(P.x * SU, P.y * SU, 0);
        pP.position.copy(Pv); ringP.position.copy(Pv);
        const v1 = evec(ch[0], P), v2 = evec(ch[1], P), net = { x: v1.x + v2.x, y: v1.y + v2.y }, m = Math.hypot(net.x, net.y);
        const sc = pre === 'a' ? SEc.a : SEc.b, mx = pre === 'a' ? SEMAX.a : SEMAX.b;
        const vec = (v) => new V3(v.x, v.y, 0).multiplyScalar(sc / 1e5);
        [pgA, pgB, dl1, dl2].forEach((s) => (s.visible = false)); lD1.show(false); lD2.show(false);
        lE1.show(true); lE2.show(true); lES.show(true);
        if (pre === 'a') {
          const o1 = new V3(0, 0.3, 0), o2 = new V3(0, 0.6, 0), o3 = new V3(0, -0.8, 0);
          const d1 = clampV(vec(v1), mx), d2 = clampV(vec(v2), mx), d3 = clampV(vec(net), mx);
          setArrow(e1, Pv.clone().add(o1), Pv.clone().add(o1).add(d1)); setArrow(e2, Pv.clone().add(o2), Pv.clone().add(o2).add(d2)); setArrow(eS, Pv.clone().add(o3), Pv.clone().add(o3).add(d3));
          aE1.position.copy(Pv).add(o1).addScaledVector(d1, 0.5).add(new V3(0, 0.3, 0)); aE2.position.copy(Pv).add(o2).addScaledVector(d2, 0.5).add(new V3(0, 0.3, 0));
          aES.position.copy(Pv).add(o3).addScaledVector(d3, 0.5).add(new V3(0, -0.4, 0));
          lE1.set('E₁ ' + sci(v1.m)); lE2.set('E₂ ' + sci(v2.m)); lES.set(m < 1e3 ? 'E합 = 0' : 'E합 ' + sci(m)); bg(lES, m < 1e3 ? '#16a34a' : '');
          lE1.show(e1.visible); lE2.show(e2.visible); eS.visible = m >= 1e3; ringP.material.color.setHex(m < 1e3 ? 0x3ddc84 : 0x3ddc84);
          info('<b>➕ 여러 전하의 전기장은 벡터로 더해요</b><br>P의 위치 x = ' + f.px.toFixed(2) + ' m (r₁ = ' + v1.r.toFixed(2) + ' m, r₂ = ' + v2.r.toFixed(2) + ' m)<br>E₁ = k(2 μC)/r₁² = ' + sci(v1.m) + ' N/C (' + dirWord(v1) + ')<br>E₂ = k(8 μC)/r₂² = ' + sci(v2.m) + ' N/C (' + dirWord(v2) + ')<br>' +
            (m < 1e3 ? '<b>E합 = 0</b> → 크기는 같고 방향이 반대로 상쇄돼요!' : 'E합 = ' + sci(m) + ' N/C (' + dirWord(net) + ')'));
        } else {
          const d1 = clampV(vec(v1), mx), d2 = clampV(vec(v2), mx), dn = clampV(vec(net), mx);
          setArrow(e1, Pv, Pv.clone().add(d1)); setArrow(e2, Pv, Pv.clone().add(d2));
          const k2 = Math.min(1, Math.max(0, (T - 0.35) / 0.4)), k3 = Math.min(1, Math.max(0, (T - 0.75) / 0.25));
          if (k2 > 0) { // 평행사변형: E₁, E₂의 점선 복사본이 반대편 꼭짓점으로 미끄러져 와요
            const e1p = Pv.clone().add(d1), e2p = Pv.clone().add(d2);
            setSeg(pgA, e2p.clone().sub(Pv).multiplyScalar(k2).add(Pv), e2p.clone().sub(Pv).multiplyScalar(k2).add(e1p));
            setSeg(pgB, e1p.clone().sub(Pv).multiplyScalar(k2).add(Pv), e1p.clone().sub(Pv).multiplyScalar(k2).add(e2p));
            pgA.visible = pgB.visible = true;
          }
          if (k3 > 0 && m > 1e3) { setArrow(eS, Pv, Pv.clone().addScaledVector(dn, k3)); eS.visible = true; } else eS.visible = false;
          aE1.position.copy(Pv).add(d1).addScaledVector(d1.clone().normalize(), 0.45); aE2.position.copy(Pv).add(d2).addScaledVector(d2.clone().normalize(), 0.45);
          aES.position.copy(Pv).addScaledVector(dn, k3).add(new V3(Math.abs(dn.x) < 0.2 ? 0.9 : dn.x > 0 ? 0.7 : -0.7, dn.y > 0 ? 0.3 : -0.3, 0));
          lE1.set('E₁'); lE2.set('E₂'); lES.set('E合 ' + (mk ? '?' : sci(m, 2))); bg(lES, ''); lES.show(k3 > 0.95 && m > 1e3);
          ch.forEach((c, i) => { const s = i ? dl2 : dl1; setSeg(s, new V3(c.x * SU, c.y * SU, 0), Pv); s.visible = true; (i ? lD2 : lD1).show(true); (i ? aD2 : aD1).position.set((c.x * SU + Pv.x) / 2 + (c.x < 0 ? -0.5 : 0.5), (c.y * SU + Pv.y) / 2, 0); });
          info('<b>➕ 여러 전하의 전기장은 벡터로 더해요</b><br>점 P(0, 0.40 m)에서 E₁과 E₂를 더해요 (▶ 벡터 더하기)<br>E₁ = ' + sci(v1.m) + ' N/C, E₂ = ' + sci(v2.m) + ' N/C<br>' +
            (pre === 'b' ? 'x 성분은 서로 상쇄, y 성분만 남아요.' : 'y 성분은 서로 상쇄, x 성분만 남아요.') + '<br>E합 = ' + (mk ? '?' : sci(m, 2) + ' N/C, ' + dirWord(net)));
        }
        gS.userData.net = net;
      }

      /* 잉크젯 프린터: 판 길이 200, 판 사이 108, 종이까지 250 (2D와 같은 비율, 1px = 0.025) */
      const IU = 0.025, PLEN = 200 * IU, PGAP = 108 * IU, PAP = 250 * IU, YEX = 1.5, XN = -2.6, DU = 8, LP = 200;
      gI.position.x = -4.3;
      const plT = h.box(PLEN, 0.15, 1.6, 0xe2574c), plB = h.box(PLEN, 0.15, 1.6, 0x2f6df6);
      plT.position.set(PLEN / 2, PGAP / 2 + 0.075, 0); plB.position.set(PLEN / 2, -PGAP / 2 - 0.075, 0); gI.add(plT, plB);
      const nz = h.box(0.9, 1.1, 1.0, 0x64748b); nz.position.set(XN - 0.5, 0, 0); gI.add(nz);
      const paper = h.box(0.1, 7.5, 1.8, 0xf8fafc); paper.position.set(PLEN + PAP, 0, 0); gI.add(paper);
      for (let i = 0; i < 6; i++) { const a = mkArrow(0x60a5fa, 0.035); setArrow(a, new V3(0.5 + i * 0.85, PGAP / 2 - 0.2, 0), new V3(0.5 + i * 0.85, -PGAP / 2 + 0.2, 0)); a.userData.m.transparent = true; a.userData.m.opacity = 0.55; gI.add(a); }
      const drop = sphere(0.17, 0x2f6df6, { emissive: 0x2f6df6, emissiveIntensity: 0.4 }); gI.add(drop);
      const trail = []; for (let i = 0; i < 28; i++) { const t = sphere(0.05, 0x9fb0d4, { roughness: 0.6 }); t.material.transparent = true; t.material.opacity = 0.5; gI.add(t); trail.push(t); }
      const dots = []; for (let i = 0; i < 40; i++) { const d = sphere(0.1, 0x111827, { roughness: 0.6 }); d.visible = false; gI.add(d); dots.push(d); }
      L('ink', '(+)판', anchor(gI, PLEN / 2, PGAP / 2 + 0.6, 0), { color: '#fecaca', size: 12 }); L('ink', '(−)판', anchor(gI, PLEN / 2, -PGAP / 2 - 0.6, 0), { color: '#bfdbfe', size: 12 });
      L('ink', '노즐', anchor(gI, XN - 0.5, 0.95, 0), { color: '#e2e8f0', size: 12 }); L('ink', '종이', anchor(gI, PLEN + PAP, 4.1, 0), { color: '#e2e8f0', size: 12 });
      L('ink', 'E ↓', anchor(gI, PLEN / 2, 0, 0.5), { color: '#bfdbfe', size: 13 });
      const aIq = anchor(gI, PLEN / 2, -PGAP / 2 - 1.5, 0), lIq = L('ink', '', aIq, { color: '#bfdbfe', size: 13 });
      const inkYpx = (x, q) => { const a = DU * q / (LP * LP); if (x <= 0) return 0; if (x <= LP) return a * x * x; return a * LP * LP + 2 * a * LP * (x - LP); };
      const xu = (u) => u / IU;           // 3D 좌표 → 2D 픽셀
      const inkAt = (x3, q) => new V3(x3, inkYpx(xu(x3), q) * IU * YEX, 0);
      function updInk(S, sim) {
        const q = S.f4.ink.q, p = st.inkT, XE = PLEN + PAP;
        const x = XN + p * (XE - XN), pos = inkAt(x, q);
        drop.position.copy(pos); drop.material.color.setHex(q ? 0x2f6df6 : 0x475569); drop.material.emissive.setHex(q ? 0x2f6df6 : 0x475569);
        trail.forEach((t, i) => { const xx = XN + (i + 1) / trail.length * (XE - XN); t.position.copy(inkAt(xx, q)); });
        const ds = S.f4.ink.dots; dots.forEach((d, i) => { const dd = ds[ds.length - 1 - i]; d.visible = !!dd; if (dd) d.position.set(XE - 0.1, (sim.INK.yc - dd.y) * IU * YEX, 0.2 * (i % 3 - 1)); });
        lIq.set('방울의 전하량 −' + q + ' 단위');
        info('<b>🖨️ 쓰임: 잉크젯 프린터</b> — 전기장이 방울을 휘게 해요<br>방울의 전하량 −' + q + ' 단위 → ' + (q ? '위쪽 (+)판 쪽으로 휘어요' : '곧게 나아가요 (힘 = 0)') + '<br>힘 F = qE ∝ q → 전하량이 클수록 더 많이 휘어요<br>(방울은 (−)로 대전되어 (+)판 쪽으로 힘을 받아요)');
      }

      /* ▶ 재생 */
      let built = false;
      const plSum = grab('sumbc', () => controls.player({
        duration: 6, loop: true, autoplay: false, label: '벡터 더하기',
        phases: [[0, 'E₁, E₂ 두 화살표'], [0.35, '평행사변형'], [0.75, 'E합']],
        onFrame(p) { if (!built) return; st.sumT = p; st.sumUser = true; },
      }));
      const plInk = grab('ink', () => controls.player({
        duration: 4, loop: true, autoplay: false, label: '방울 쏘기',
        phases: [[0, '노즐'], [0.25, '판 사이 전기장'], [0.65, '종이로']],
        onFrame(p) { if (!built) return; st.inkT = p; },
      }));
      built = true;

      const labelSets = { force: 'force', field: 'field', graph: 'graph', sum: 'sum', ink: 'ink' };
      function scene(S) { return S.mode === 'graph' ? 'graph' : S.mode === 'field' ? 'field' : S.mode === 'sum' ? (S.f4.pre === 'd' ? 'ink' : 'sum') : 'force'; }
      const camD = { force: 11, field: 12.5, graph: 15, sum: 13, ink: 17 };
      function showScene(sc, S) {
        gF.visible = sc === 'force'; gE.visible = sc === 'field'; gG.visible = sc === 'graph'; gS.visible = sc === 'sum'; gI.visible = sc === 'ink';
        Object.keys(labs).forEach((k) => labs[k].forEach((l) => l.show(k === sc)));
        let cs = sc === 'sum' ? (S.f4.pre === 'a' ? '' : 'sumbc') : sc === 'ink' ? 'ink' : '';
        showCtl(cs);
        ctx.orbit.tx = 0; ctx.orbit.ty = sc === 'graph' ? 1.3 : 0; ctx.orbit.dist = camD[sc] * KD; ctx.orbit.theta = 0.1; ctx.orbit.phi = sc === 'field' ? 1.2 : 1.42;
        if (sc === 'ink') { plInk.set(0); }
      }
      let sig = '', lastSc = '', lastPre = '';
      return {
        update(dt, t) {
          const sim = LS(); if (!sim) return; const S = sim.S;
          const sc = scene(S);
          if (S.f4.pre !== lastPre) { lastPre = S.f4.pre; st.sumUser = false; plSum.pause(); }
          if (!st.sumUser) st.sumT = S.f4.sumT;
          if (sc !== lastSc) { lastSc = sc; sig = ''; showScene(sc, S); }
          const d = sc === 'force' ? [S.f1.qa, S.f1.qb, S.f1.r, S.f1.done, S.gate, !!(sim.game && sim.game.free)] : sc === 'field' ? [S.f2.q, S.f2.qp, S.f2.has, S.f2.px, S.f2.py, S.f2.fly > 0.98, S.gate] :
            sc === 'graph' ? [S.f3.q, S.f3.r, S.gate, S.f3.pts[1].length, S.f3.pts[2].length, S.f3.pts[-1].length, S.f3.curveT[1], S.f3.curveT[2], S.f3.curveT[-1], S.f3.pts[1].map((p) => p.drop).join()] :
            sc === 'sum' ? [S.f4.pre, S.f4.px, st.sumT, S.gate] : [S.f4.ink.q, st.inkT, S.f4.ink.dots.length];
          const s2 = d.join('|');
          if (s2 !== sig) {
            sig = s2;
            if (sc === 'force') updForce(S, sim); else if (sc === 'field') updField(S, sim); else if (sc === 'graph') updGraph(S, sim); else if (sc === 'sum') updSum(S, sim); else updInk(S, sim);
          }
          if (sc === 'field') src.userData.halo.scale.setScalar(1 + 0.04 * Math.sin(t * 2));
          if (sc === 'sum') { const s = 1 + 0.1 * Math.sin(t * 4); ringP.scale.setScalar(s); }
          if (sc === 'graph') cur.scale.setScalar(1 + 0.1 * Math.sin(t * 5));
        },
        sync() { sig = ''; },
      };
    },
  });
})();
