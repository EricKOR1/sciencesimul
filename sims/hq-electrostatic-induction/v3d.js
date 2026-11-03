/* hq-electrostatic-induction · 3D 정전기 유도와 유전 분극 (금속 막대 속 전자 · 검전기 · 유전체)
   도체 안의 자유전자는 대전체 쪽으로(−일 때는 반대쪽으로) 움직여요. 유전체의 분자는 전기장 방향으로 늘어서 표면에 분극 전하가 생기고, 안쪽 전기장이 약해져요. */
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
  const POS = 0xff5a5f, NEG = 0x4d8dff;
  const PX = 0.015;                                                  // 2D 화면 1px = 3D 0.015 (차폐·터치스크린 장면)
  const g3 = (x) => String(parseFloat((x * (1 + 1e-12)).toPrecision(3)));
  const GLV = { bare: { dc: 3.0, name: '맨손', col: 0xf0c8a0 }, cond: { dc: 2.6, name: '도체 장갑', col: 0x7aa7d8 }, plain: { dc: 0.2, name: '일반 장갑 (절연체)', col: 0x9aa5b8 } };
  const SMOOTH = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };

  window.SciSim3D.attach({
    title: '정전기 유도와 분극 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대 · 값은 왼쪽 조작판에서 바꿔요',
    camera: { dist: 12 * KD, theta: 0.12, phi: 1.25, min: 5, max: 30 },
    autoRotate: 0,
    levels: [0, 1, 2],
    build(ctx) {
      const { THREE, root, label, controls } = ctx;
      const h = H3(ctx); const { V3, mat, glass, mkArrow, setArrow, arrowSet, mkSeg, setSeg, anchor, sphere, box, cyl, grab, showCtl } = h;
      const LS = () => window.__sim || null;
      const labs = {};
      const L = (sc, text, obj, o) => { const l = label(text, obj, o); const raw = l.set; let last = text; l.set = (t) => { if (t !== last) { last = t; raw(t); } }; (labs[sc] = labs[sc] || []).push(l); return l; };
      let lastInfo = ''; const info = (hh) => { if (hh !== lastInfo) { lastInfo = hh; ctx.info(hh); } };
      const bgc = (l, c) => { if (l.bgv !== c) { l.bgv = c; l.el.style.background = c; } };
      const st = { indP: -1, indUser: false, scP: -1, scUser: false, paP: -1, paUser: false, moP: -1, moUser: false, toP: -1, toUser: false };
      const gI = new THREE.Group(), gE = new THREE.Group(), gSh = new THREE.Group(), gPa = new THREE.Group(), gD = new THREE.Group(), gT = new THREE.Group(); root.add(gI, gE, gSh, gPa, gD, gT);
      const M4 = new THREE.Matrix4(), Pv = new V3();

      /* ================= ① 금속 막대의 정전기 유도 ================= */
      const NX = 14, NI = NX * 4;
      const ions = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 14, 10), mat(POS, { roughness: 0.4, emissive: POS, emissiveIntensity: 0.25 }), NI);
      const els = new THREE.InstancedMesh(new THREE.SphereGeometry(0.085, 14, 10), mat(NEG, { roughness: 0.4, emissive: NEG, emissiveIntensity: 0.45 }), NI);
      gI.add(ions, els);
      const rodMat = { metalness: 0.7, roughness: 0.25, transparent: true, opacity: 0.28, depthWrite: false };
      const rodL = cyl(0.72, 0.72, 3.1, 0xb8c2d4, rodMat); rodL.rotation.z = Math.PI / 2; gI.add(rodL);
      const rodR = cyl(0.72, 0.72, 3.1, 0xb8c2d4, rodMat); rodR.rotation.z = Math.PI / 2; gI.add(rodR);
      const ball = sphere(0.8, POS, { roughness: 0.3, emissive: POS, emissiveIntensity: 0.35 }); gI.add(ball);
      const ballHalo = new THREE.Mesh(new THREE.SphereGeometry(1.15, 24, 16), glass(POS, 0.14)); ball.add(ballHalo);
      const cellPos = [];
      for (let i = 0; i < NX; i++) for (let k = 0; k < 4; k++) cellPos.push([-3 + 6 * (i + 0.5) / NX, k < 2 ? 0.26 : -0.26, k % 2 ? 0.26 : -0.26]);
      const aBall = anchor(gI), lBall = L('induce', '', aBall, { color: '#c0392b', size: 14 });
      const aRA = anchor(gI), aRB = anchor(gI);
      const lRA = L('induce', '금속 막대 A', aRA, { color: '#516079', size: 12 }), lRB = L('induce', '금속 막대 B', aRB, { color: '#516079', size: 12 });
      const aNear = anchor(gI), aFar = anchor(gI), lNear = L('induce', '', aNear, { color: '#2f6df6', size: 13 }), lFar = L('induce', '', aFar, { color: '#c0392b', size: 13 });
      L('induce', '고정된 양이온 (+)', anchor(gI, 0, -1.25, 0), { color: '#c0392b', size: 12 }); L('induce', '자유전자 (−)', anchor(gI, 0, -1.7, 0), { color: '#2f6df6', size: 12 });
      const aQA = anchor(gI), aQB = anchor(gI), lQA = L('induce', '', aQA, { color: '#667', size: 13 }), lQB = L('induce', '', aQB, { color: '#667', size: 13 });
      function updInduce(S, sim) {
        const ind = S.ind, c = sim.counts(), G1 = sim.G1;
        let sign = ind.sign, f = ind.sA, bxN = (ind.bx - G1.bx0) / (G1.bx1 - G1.bx0), split = ind.sepGoal, sep = ind.sep;
        if (st.indUser) { const b = Math.sin(Math.PI * st.indP); bxN = b; f = Math.pow(Math.max(0, (b - 0.15) / 0.85), 2); split = false; sep = 0; }
        const gap = 0.6 + 3.9 * (1 - Math.max(0, Math.min(1, bxN)));
        const dx = split ? Math.max(sep, 0) * 0.75 : 0;
        const xs = -sign * f * 1.35;
        const bx = -3.4 - gap - 0.2 - (split ? 0 : 0);
        const colB = sign > 0 ? POS : NEG;
        ball.position.set(bx, 0, 0); ball.material.color.setHex(colB); ball.material.emissive.setHex(colB); ballHalo.material.color.setHex(colB);
        aBall.position.set(bx, 1.35, 0); lBall.set(sign > 0 ? '+ 대전체' : '− 대전체'); bgc(lBall, sign > 0 ? '#c0392b' : '#2f6df6');
        // 막대 A(왼쪽), B(오른쪽)
        const xa = -1.65 - dx, xb = 1.65 + dx;
        rodL.position.set(xa, 0, 0); rodR.position.set(xb, 0, 0);
        aRA.position.set(xa, -0.95, 0); aRB.position.set(xb, -0.95, 0);
        for (let i = 0; i < NI; i++) { const p = cellPos[i]; Pv.set(p[0] + (p[0] < 0 ? -dx : dx), p[1], p[2]); M4.makeTranslation(Pv.x, Pv.y, Pv.z); ions.setMatrixAt(i, M4); }
        ions.instanceMatrix.needsUpdate = true;
        if (!split) {
          const lo = -3.05, hi = 3.05;
          for (let i = 0; i < NI; i++) {
            const p = cellPos[i]; let x = p[0] + xs, pile = 0;
            if (x < lo) { pile = Math.min(1, (lo - x) / 1.0); x = lo + (i % 3) * 0.12 + 0.02; } else if (x > hi) { pile = Math.min(1, (x - hi) / 1.0); x = hi - (i % 3) * 0.12 - 0.02; }
            Pv.set(x, p[1] * (1 + pile * 0.25), p[2]); M4.makeTranslation(Pv.x, Pv.y, Pv.z); els.setMatrixAt(i, M4);
          }
        } else {
          // 분리한 뒤: 각 막대가 가진 전자 수는 그대로 (2D의 e 단위 전하 QA, QB에 맞춰요)
          const nL = Math.max(2, Math.min(NI - 2, Math.round(NI / 2 - c.QA * (NI / 2) / 12)));
          const place = (n, x0, x1, off) => { for (let j = 0; j < n; j++) { const u = (j + 0.5) / n, k = j % 4; Pv.set(x0 + (x1 - x0) * u, k < 2 ? 0.26 : -0.26, k % 2 ? 0.26 : -0.26); M4.makeTranslation(Pv.x, Pv.y, Pv.z); els.setMatrixAt(off + j, M4); } };
          place(nL, -3.05 - dx, -0.1 - dx, 0); place(NI - nL, 0.1 + dx, 3.05 + dx, nL);
        }
        els.instanceMatrix.needsUpdate = true;
        const near = !split && f > 0.25, neg = sign > 0;
        lNear.show(near); lFar.show(near);
        lNear.set(neg ? '− (전자 많음)' : '+ (전자 부족)'); lFar.set(neg ? '+ (전자 부족)' : '− (전자 많음)');
        bgc(lNear, neg ? '#2f6df6' : '#c0392b'); bgc(lFar, neg ? '#c0392b' : '#2f6df6');
        aNear.position.set(-2.4 - dx, 1.2, 0); aFar.position.set(2.4 + dx, 1.2, 0);
        lQA.show(split); lQB.show(split); aQA.position.set(xa, 1.2, 0); aQB.position.set(xb, 1.2, 0);
        const fe = (q) => (q === 0 ? '중성' : (q > 0 ? '+' : '−') + Math.abs(q) + ' e');
        lQA.set('막대 A ' + fe(c.QA)); lQB.set('막대 B ' + fe(c.QB)); bgc(lQA, c.QA > 0 ? '#c0392b' : c.QA < 0 ? '#2f6df6' : '#667'); bgc(lQB, c.QB > 0 ? '#c0392b' : c.QB < 0 ? '#2f6df6' : '#667');
        info('<b>🎈 대전체를 가까이 하면 금속 막대 속 전자는?</b><br>' + (split ? '막대를 떼면 각각 대전된 채 남아요. 두 막대 전체: ' + fe(c.QA + c.QB) + (c.QA + c.QB === 0 ? ' → 합은 0 (전하량 보존)' : '') :
          f < 0.1 ? '대전체가 멀리 있어요. 막대 속 전자는 고르게 퍼져 있고 전체가 중성이에요.' : (sign > 0 ? '전자가 대전체 쪽으로 끌려와요' : '전자가 대전체에게 밀려 멀어져요') + '.<br>Q = (양이온 수 − 전자 수) × e : A ' + fe(c.QA) + ', B ' + fe(c.QB)));
      }

      /* ================= ② 검전기로 하는 유도 대전 ================= */
      const jar = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 3.6, 36, 1, true), glass(0xbfd6ff, 0.12)); jar.position.y = -0.1; gE.add(jar);
      const base = cyl(1.8, 1.9, 0.25, 0x7b8798, { metalness: 0.4 }); base.position.y = -1.95; gE.add(base);
      const stem = cyl(0.08, 0.08, 2.6, 0xc9a24a, { metalness: 0.8, roughness: 0.3 }, 14); stem.position.y = 0.55; gE.add(stem);
      const topBall = sphere(0.55, 0xd4af37, { metalness: 0.85, roughness: 0.25 }); topBall.position.y = 1.95; gE.add(topBall);
      const leafL = new THREE.Group(), leafR = new THREE.Group(); leafL.position.y = leafR.position.y = -0.75; gE.add(leafL, leafR);
      const lfG = new THREE.BoxGeometry(0.34, 1.25, 0.03); lfG.translate(0, -0.62, 0);
      const lfM = new THREE.Mesh(lfG, mat(0xf0d36a, { metalness: 0.8, roughness: 0.25 })), lfM2 = lfM.clone(); lfM2.material = lfM.material.clone();
      leafL.add(lfM); leafR.add(lfM2);
      const rod = new THREE.Group(); const rodBody = cyl(0.22, 0.22, 3.2, 0xe9edf5, { roughness: 0.3, metalness: 0.1 }); rodBody.rotation.z = Math.PI / 2; rodBody.position.x = -1.6;
      const rodTip = sphere(0.3, POS, { emissive: POS, emissiveIntensity: 0.4 }); rod.add(rodBody, rodTip); rod.position.set(-6, 2.3, 0); gE.add(rod);
      const gnd = new THREE.Group(); const gw = cyl(0.04, 0.04, 2.0, 0x7b8798, { metalness: 0.5 }); gnd.add(gw); [0.7, 0.5, 0.3].forEach((w, i) => { const b = box(w * 1.4, 0.05, 0.05, 0x7b8798); b.position.y = -1.1 - i * 0.12; gnd.add(b); });
      gnd.position.set(2.1, -1.0, 0); gE.add(gnd);
      const wire = mkSeg(0x7b8798, 0.03, { }); gE.add(wire);
      const swArm = cyl(0.03, 0.03, 1.0, 0x7b8798, { metalness: 0.5 }, 8); swArm.rotation.z = Math.PI / 2; swArm.position.set(0.5, -1.95, 0); gE.add(swArm);
      const NDOT = 30, dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.09, 12, 8), mat(0xffffff, { roughness: 0.35, emissive: 0xffffff, emissiveIntensity: 0.5 }), NDOT); gE.add(dots);
      const aRod = anchor(rod, -3.2, 0.5, 0), lRod = L('scope', '', aRod, { color: '#c0392b', size: 13 });
      L('scope', '금속박', anchor(gE, 0, -2.3, 0.9), { color: '#a16207', size: 12 });
      const aTop = anchor(gE, 0, 2.8, 0), lTop = L('scope', '', aTop, { color: '#475569', size: 12 });
      L('scope', '접지', anchor(gE, 2.1, -2.7, 0), { color: '#475569', size: 12 });
      const aQt = anchor(gE, 0, -3.3, 0), lQt = L('scope', '', aQt, { color: '#a16207', size: 13 });
      let leafAng = 0, leafTarget = 0;
      function updScope(S, sim) {
        const s = S.sc; let sv = sim.scS(), grounded = s.grounded, Qd = s.Qd, Ql = s.Ql, Qt = s.Qt, sign = s.sign, leaf = s.leaf;
        if (st.scUser) { // ▶ 유도 대전 순서 (가까이 → 접지 → 접지 해제 → 막대 치우기)
          const p = st.scP; sign = -1;
          sv = p < 0.12 ? SMOOTH(p / 0.12) : p < 0.78 ? 1 : 1 - SMOOTH((p - 0.78) / 0.14);
          grounded = p > 0.3 && p < 0.55;
          Qt = p < 0.3 ? 0 : p < 0.45 ? -sign * 6 * SMOOTH((p - 0.3) / 0.15) : -sign * 6;
          if (p > 0.92) Qt = -sign * 6;
          Ql = Qt / 2 + sign * 3 * sv; Qd = Qt - Ql; leaf = 38 * Math.min(1, Math.abs(Ql) / 3);
        }
        const rodX = -1.35 + (-6.2 + 1.35) * (1 - sv);
        rod.position.x = Math.min(rodX, -0.9); st.rodX = rod.position.x;
        leafTarget = Math.max(0, Math.min(0.75, leaf / 38 * 0.75));
        rodTip.material.color.setHex(sign > 0 ? POS : NEG); rodTip.material.emissive.setHex(sign > 0 ? POS : NEG);
        lRod.set(sign > 0 ? '+ 대전된 막대' : '− 대전된 막대'); bgc(lRod, sign > 0 ? '#c0392b' : '#2f6df6');
        // 전하 점 (금속판 Qd, 금박 Ql)
        let k = 0; const col = new THREE.Color();
        const put = (p, q) => { Pv.copy(p); M4.makeTranslation(Pv.x, Pv.y, Pv.z); dots.setMatrixAt(k, M4); dots.setColorAt(k, col.set(q > 0 ? POS : NEG)); k++; };
        const nT = Math.min(6, Math.round(Math.abs(Qd) * 1.5)), nL = Math.min(3, Math.round(Math.abs(Ql) * 0.9));
        for (let i = 0; i < nT; i++) { const a = i / nT * Math.PI * 2 + 0.3; put(new V3(0.62 * Math.cos(a) * 0.9, 1.95 + 0.62 * Math.sin(a) * 0.9 * (i % 2 ? 1 : 0.5), 0.6 * Math.sin(a)), Qd); }
        for (const sg of [-1, 1]) for (let i = 0; i < nL; i++) { const lp = 0.3 + i * 0.32; put(new V3(sg * Math.sin(leafAng) * lp + sg * 0.09, -0.75 - Math.cos(leafAng) * lp, 0.0), Ql); }
        for (; k < NDOT; k++) { M4.makeScale(0, 0, 0); dots.setMatrixAt(k, M4); }
        dots.instanceMatrix.needsUpdate = true; if (dots.instanceColor) dots.instanceColor.needsUpdate = true;
        lTop.show(nT > 0 && labs.scope && labs.scope.on); lTop.set(Qd < 0 ? '전자가 모여요 (−)' : '전자가 빠져요 (+)'); bgc(lTop, Qd < 0 ? '#2f6df6' : '#c0392b');
        swArm.visible = !grounded;
        setSeg(wire, new V3(0.9, -1.95, 0), new V3(2.1, -1.95, 0)); wire.visible = grounded;
        lQt.set('검전기 전체 Qt = ' + (Math.abs(Qt) < 0.05 ? '0 (중성)' : (Qt > 0 ? '+' : '−') + g3(Math.abs(Qt)) + ' e'));
        let txt;
        const done = Math.abs(Qt) >= 0.3 && sv < 0.05;
        if (S.gate === 'm2') txt = '막대를 검전기에 가까이 했다가, 접지하고, 접지를 끊고, 막대를 치우는 동작들이 있어요. <b>일어나는 순서</b>를 2D의 문제에서 골라 보세요.';
        else if (sv < 0.05 && Math.abs(Qt) < 0.3) txt = '<b>중성 검전기</b>: 금속박이 닫혀 있어요.<br>대전된 막대를 <b>접촉하지 않고</b> 가까이 가져가 보세요.';
        else if (sv >= 0.05 && !grounded && Math.abs(Qt) < 0.3) txt = '<b>막대를 가까이</b>: 금속판에는 반대 부호, 금박에는 <b>막대와 같은 부호</b>의 전하가 모여 벌어져요.';
        else if (grounded) txt = '<b>접지 연결</b>: 전자가 땅으로 빠져나가거나 땅에서 들어와 검전기 전체가 대전돼요.';
        else if (sv >= 0.05) txt = '<b>접지를 끊었어요</b>: 검전기에 남은 전하는 그대로예요. 이제 막대를 멀리 치우면...';
        else txt = '<b>유도 대전 완성!</b> 금박이 <b>막대와 반대 부호</b>로 대전되어 벌어졌어요. (Qt = ' + (Qt > 0 ? '+' : '−') + g3(Math.abs(Qt)) + ' e)';
        info('<b>🔌 유도 대전</b> — 금속판 ' + g3(Qd) + ' e · 금박 ' + g3(Ql) + ' e<br>' + txt);
      }

      /* ================= ②′ 정전 차폐 (금속 상자 · 플라스틱 상자) ================= */
      const SB = { bx0: 270, bx1: 530, by0: 200, by1: 400, wt: 14 };
      const BC = { x: (SB.bx0 + SB.bx1) / 2, y: (SB.by0 + SB.by1) / 2 };
      const BW = (SB.bx1 - SB.bx0) * PX, BH = (SB.by1 - SB.by0) * PX;
      const shWall = box(BW, BH, 3.2, 0xcbd5e1, { metalness: 0.85, roughness: 0.3, transparent: true, opacity: 0.3, depthWrite: false }); gSh.add(shWall);
      const shIn = box(BW - 2 * SB.wt * PX, BH - 2 * SB.wt * PX, 3.1, 0x0b1224, { transparent: true, opacity: 0.0 }); gSh.add(shIn);
      const shArr = arrowSet(7 * 5 * 3, 0.03); gSh.add(shArr.group);
      const shCh = []; for (let i = 0; i < 14; i++) { const m = sphere(0.1, i < 7 ? NEG : POS, { emissive: i < 7 ? NEG : POS, emissiveIntensity: 0.5 }); gSh.add(m); shCh.push(m); }
      const shProbe = sphere(0.16, 0xffd166, { emissive: 0xffb300, emissiveIntensity: 0.6 }); gSh.add(shProbe);
      const aShP = anchor(gSh), lShP = L('shield', '', aShP, { color: '#26324a', size: 13 }), aShB = anchor(gSh, 0, BH / 2 + 0.6, 0), lShB = L('shield', '', aShB, { color: '#516079', size: 13 });
      const aShE = anchor(gSh, -BW / 2 - 2.2, BH / 2 + 1.3, 0); L('shield', '바깥 전기장 E → (오른쪽)', aShE, { color: '#1e40af', size: 12 });
      function updShield(S, sim, t) {
        const s = S.sc, plastic = s.box === 'plastic', mc = s.ind, r = sim.shieldE();
        shWall.material.color.setHex(plastic ? 0xfad7a0 : 0xcbd5e1); shWall.material.metalness = plastic ? 0.0 : 0.85; shWall.material.opacity = plastic ? 0.22 : 0.32;
        let k = 0; const off = ((t || 0) * 0.9) % 1;
        for (let iy = -2; iy <= 2; iy++) for (let iz = -1; iz <= 1; iz++) for (let ix = 0; ix < 7; ix++, k++) {
          const x = (-3.9 + (ix + off) * 1.25), y = iy * 0.95, z = iz * 1.1;
          const inBox = Math.abs(y) < BH / 2 - 0.05 && x > -BW / 2 - 0.3 && x < BW / 2 + 0.3;
          const len = 0.85 * (inBox && !plastic ? 0 : 1);
          if (len < 0.05) shArr.hide(k); else shArr.set(k, new V3(x, y, z), new V3(1, 0, 0), len, 0x5b9bff);
        }
        shArr.flush();
        shCh.forEach((m, i) => { const left = i < 7, row = (left ? i : i - 7) - 3; m.visible = !plastic && mc > 0.05; m.position.set((left ? -1 : 1) * (BW / 2 + 0.02), row * (BH / 7.5), 0.9 * Math.sin(row * 2.1)); m.scale.setScalar(mc); });
        const pr = s.probe; shProbe.position.set((pr.x - BC.x) * PX, -(pr.y - BC.y) * PX, 0);
        aShP.position.set(shProbe.position.x, shProbe.position.y - 0.45, 0);
        lShP.set('탐침 E = ' + (r.E ? g3(r.E) + ' N/C' : '0') + (r.inside ? ' (상자 속)' : ' (상자 밖)'));
        lShB.set(plastic ? '플라스틱 상자 (전기장이 통과)' : '금속 상자 (E = 0)');
        info('<b>📦 정전 차폐: 큰 전기장 속의 상자</b><br>' + (plastic ? '플라스틱 상자는 전기장이 안으로 그대로 들어와요.' : '금속 상자는 바깥 표면에 유도 전하가 생겨 속의 전기장을 0으로 만들어요.') + '<br>탐침 위치: ' + (r.inside ? '상자 속' : '상자 밖') + ' → E = ' + (r.E ? g3(r.E) + ' N/C' : '0'));
      }

      /* ================= ③ 종이 조각이 끌려오는 과정 ================= */
      const rodP = cyl(0.3, 0.3, 4.2, 0xe9edf5, { roughness: 0.3 }); rodP.rotation.z = Math.PI / 2; gPa.add(rodP);
      const rodHalo = new THREE.Mesh(new THREE.SphereGeometry(0.6, 20, 14), glass(NEG, 0.0)); gPa.add(rodHalo);
      const rodCh = []; for (let i = 0; i < 7; i++) { const m = sphere(0.12, NEG, { emissive: NEG, emissiveIntensity: 0.6 }); m.position.set(-1.8 + i * 0.6, 0.0, 0.32); rodP.parent.add(m); rodCh.push(m); }
      const paper = new THREE.Group(); gPa.add(paper);
      const paperB = box(4.4, 0.4, 2.4, 0xf4f1e8, { roughness: 0.8, transparent: true, opacity: 0.55, depthWrite: false }); paper.add(paperB);
      const pT = box(4.4, 0.03, 2.4, POS, { transparent: true, opacity: 0, depthWrite: false, emissive: POS, emissiveIntensity: 0.7 }), pBt = box(4.4, 0.03, 2.4, NEG, { transparent: true, opacity: 0, depthWrite: false, emissive: NEG, emissiveIntensity: 0.7 });
      pT.position.y = 0.2; pBt.position.y = -0.2; paper.add(pT, pBt);
      const pm = []; for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) {
        const g = new THREE.Group(); g.position.set(-1.8 + i * 0.72, 0, -0.8 + j * 0.8);
        const bar = cyl(0.03, 0.03, 0.26, 0xaab4c8, {}, 8), a = sphere(0.075, POS, { emissive: POS, emissiveIntensity: 0.4 }), b = sphere(0.075, NEG, { emissive: NEG, emissiveIntensity: 0.4 }); a.position.y = 0.13; b.position.y = -0.13; g.add(bar, a, b);
        g.userData = { rnd: new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28)), ph: Math.random() * 6.28 }; paper.add(g); pm.push(g);
      }
      const fUp = mkArrow(0xf26b3a, 0.06), fDn = mkArrow(0x2f6df6, 0.05); gPa.add(fUp, fDn);
      const aFu = anchor(gPa), aFd = anchor(gPa), lFu = L('paper', '', aFu, { color: '#9a3412', size: 12 }), lFd = L('paper', '', aFd, { color: '#1e40af', size: 12 });
      const aRodP = anchor(gPa, 0, 3.4, 0); L('paper', '(−) 대전된 막대', aRodP, { color: '#2f6df6', size: 13 });
      const aPap = anchor(gPa), lPap = L('paper', '종이 조각', aPap, { color: '#7c6f55', size: 12 });
      const aPT = anchor(gPa), aPB = anchor(gPa), lPT = L('paper', '(+) 분극 전하', aPT, { color: '#c0392b', size: 11 }), lPB = L('paper', '(−) 분극 전하', aPB, { color: '#2f6df6', size: 11 });
      const PCAP = ['아직 아무 일도 없어요. 막대가 종이에 다가와요 (닿지 않아요).', '① 분자들이 막대의 전기장에 맞춰 (+) 끝이 위로 향해 정렬돼요.', '② 종이 윗면(막대 쪽)에 (+), 아랫면에 (−) 분극 전하가 나타나요.', '③ 가까운 (+)가 받는 인력이 먼 (−)가 받는 반발력보다 커요.', '④ 알짜힘이 위쪽이라 종이가 끌려와 막대에 붙었어요!'];
      function updPaper(S, sim, t) {
        let sF = S.de.stF; if (st.paUser) sF = st.paP * 4;
        const al = SMOOTH(sF), surf = SMOOTH(sF - 1), fo = SMOOTH(sF - 2), rise = SMOOTH(sF - 3);
        const rodY = 2.6, baseY = -1.6, py = baseY + (rodY - 0.6 - baseY) * rise;
        rodP.position.set(0, rodY, 0); rodHalo.position.copy(rodP.position); rodCh.forEach((m) => { m.position.y = rodY; });
        paper.position.set(0, py, 0);
        pT.material.opacity = 0.7 * surf; pBt.material.opacity = 0.7 * surf;
        const tq = new THREE.Quaternion(), q0 = new THREE.Quaternion();
        pm.forEach((g) => { const wob = new THREE.Quaternion().copy(g.userData.rnd).multiply(tq.setFromAxisAngle(new V3(0.3, 1, 0.2).normalize(), t * 0.8 + g.userData.ph)); g.quaternion.copy(wob).slerp(q0.identity(), al); });
        const up = 0.4 + 1.3 * fo, dn = 0.25 + 0.4 * fo;
        setArrow(fUp, new V3(-1.2, py + 0.25, 0.9), new V3(-1.2, py + 0.25 + up, 0.9)); fUp.visible = fo > 0.05 && rise < 0.5;
        setArrow(fDn, new V3(1.2, py - 0.25, 0.9), new V3(1.2, py - 0.25 - dn * 0.5, 0.9)); fDn.visible = fo > 0.05 && rise < 0.5;
        aFu.position.set(-1.2, py + 0.5 + up, 0.9); aFd.position.set(1.2, py - 0.8, 0.9); lFu.set('가까운 (+)가 받는 인력 ↑ (큼)'); lFd.set('먼 (−)가 받는 반발력 ↓ (작음)');
        aPap.position.set(0, py - 0.65, 1.3); aPT.position.set(2.7, py + 0.2, 0); aPB.position.set(2.7, py - 0.2, 0);
        lFu.show(fUp.visible && labs.paper.on); lFd.show(fDn.visible && labs.paper.on); lPT.show(surf > 0.5 && labs.paper.on); lPB.show(surf > 0.5 && labs.paper.on);
        info('<b>🧻 종이 조각이 끌려오는 과정</b><br>' + PCAP[Math.min(4, Math.round(sF))] + '<br>진행 ' + Math.min(4, Math.round(sF)) + ' / 4 단계');
      }

      /* ================= ③′ 유전체와 분극 (분자 모형 · 축전기) ================= */
      const pTop = box(7.4, 0.14, 5, 0xc9d1e0, { metalness: 0.6, roughness: 0.3 }), pBot = box(7.4, 0.14, 5, 0xc9d1e0, { metalness: 0.6, roughness: 0.3 }); pTop.position.y = 1.6; pBot.position.y = -1.6; gD.add(pTop, pBot);
      const slab = new THREE.Group(); gD.add(slab);
      const slabBody = box(6.6, 2.6, 4.2, 0xfde68a, { transparent: true, opacity: 0.22, depthWrite: false, roughness: 0.2 }); slab.add(slabBody);
      const surfT = box(6.6, 0.05, 4.2, NEG, { transparent: true, opacity: 0, depthWrite: false, emissive: NEG, emissiveIntensity: 0.6 }), surfB = box(6.6, 0.05, 4.2, POS, { transparent: true, opacity: 0, depthWrite: false, emissive: POS, emissiveIntensity: 0.6 });
      surfT.position.y = 1.3; surfB.position.y = -1.3; slab.add(surfT, surfB);
      const mols = [];
      for (let i = 0; i < 5; i++) for (let k = 0; k < 3; k++) for (let j = 0; j < 2; j++) {
        const g = new THREE.Group(); g.position.set(-2.4 + i * 1.2, -0.5 + j * 1.0, -1.3 + k * 1.3);
        const bar = cyl(0.05, 0.05, 0.5, 0xaab4c8, { metalness: 0.2 }, 8);
        const pP = sphere(0.14, POS, { emissive: POS, emissiveIntensity: 0.35 }), pN = sphere(0.14, NEG, { emissive: NEG, emissiveIntensity: 0.35 }); pP.position.y = -0.26; pN.position.y = 0.26;
        const nuc = sphere(0.1, POS, { emissive: POS, emissiveIntensity: 0.4 }), cloud = new THREE.Mesh(new THREE.SphereGeometry(0.3, 18, 12), glass(NEG, 0.35));
        const np = new THREE.Group(); np.add(nuc, cloud); g.add(bar, pP, pN, np);
        g.userData = { bar, pP, pN, np, cloud, rnd: new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28)), a: 0, ph: Math.random() * 6.28 };
        slab.add(g); mols.push(g);
      }
      const NQ = 36; const qPlus = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 12, 8), mat(POS, { emissive: POS, emissiveIntensity: 0.5 }), NQ), qMinus = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 12, 8), mat(NEG, { emissive: NEG, emissiveIntensity: 0.5 }), NQ); gD.add(qPlus, qMinus);
      const eArr = arrowSet(15, 0.04); gD.add(eArr.group);
      const aSl = anchor(slab, 0, 0, 2.3), lSl = L('diel', '', aSl, { color: '#7c3aed', size: 12 });
      const aSt = anchor(slab, 0, 1.45, 2.1), lSt = L('diel', '유전체 표면의 − 분극 전하', aSt, { color: '#2f6df6', size: 11 }), aSb = anchor(slab, 0, -1.45, 2.1), lSb = L('diel', '유전체 표면의 + 분극 전하', aSb, { color: '#c0392b', size: 11 });
      const aCt = anchor(gD, -3.2, 1.9, 2.4), aCb = anchor(gD, -3.2, -1.9, 2.4), lCt = L('diel', '+ 극판', aCt, { color: '#c0392b', size: 13 }), lCb = L('diel', '− 극판', aCb, { color: '#2f6df6', size: 13 });
      const aCV = anchor(gD, 3.4, 0, 0), lCV = L('diel', '', aCV, { color: '#0f766e', size: 12 });
      const polarQ = new THREE.Quaternion();
      function updDiel(S, sim) { /* 분자·화살표는 매 프레임 animDiel에서 */ }
      let dielA = 0, dielF = 0;
      function animDiel(S, sim, dt, t) {
        const d = S.de, cap = d.sub === 'cap', cv = sim.capVals(), k = d.kd;
        let slabOn = cap ? k > 1.02 : true;
        let fieldOn = cap ? 1 : (st.moUser ? SMOOTH(Math.sin(Math.PI * st.moP) * 1.6) : 1);
        const polar = d.mol === 'polar';
        const cc = new THREE.Color().setHSL(0.12, 0.6 + 0.3 * Math.min(1, Math.log(Math.max(1, k)) / Math.log(80)), 0.82 - 0.3 * Math.min(1, Math.log(Math.max(1, k)) / Math.log(80)));
        slabBody.material.color.copy(cc); slab.visible = slabOn;
        const pc = cap ? 0xc9d1e0 : 0xc9d1e0; pTop.material.color.setHex(POS); pBot.material.color.setHex(NEG); pTop.material.emissive.setHex(POS); pBot.material.emissive.setHex(NEG); pTop.material.emissiveIntensity = pBot.material.emissiveIntensity = 0.25 * fieldOn;
        // 극판 전하 (Q에 비례, 최대 36개)
        const Qn = cap ? Math.round(Math.max(4, Math.min(36, 4 * d.Qd))) : 8;
        for (let i = 0; i < NQ; i++) {
          if (i < Qn) { const u = (i + 0.5) / Qn, x = -3 + 6 * ((i * 0.618) % 1), z = -2 + 4 * u; M4.makeTranslation(x, 1.45, z); qPlus.setMatrixAt(i, M4); M4.makeTranslation(x, -1.45, z); qMinus.setMatrixAt(i, M4); }
          else { M4.makeScale(0, 0, 0); qPlus.setMatrixAt(i, M4); qMinus.setMatrixAt(i, M4); }
        }
        qPlus.instanceMatrix.needsUpdate = qMinus.instanceMatrix.needsUpdate = true;
        // 전기장 화살표: 연결(V 일정) → E 일정, 전지를 뗀 뒤(Q 일정) → E = E₀ / κ
        const Erel = cap ? (cv.Ein / 1e4) : (1 / Math.max(1, k));
        let kk = 0;
        for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++, kk++) { const len = 2.55 * Math.min(1.1, Erel) * fieldOn; if (len < 0.05) eArr.hide(kk); else eArr.set(kk, new V3(-2.8 + i * 1.4, 1.45, -1.4 + j * 1.4), new V3(0, -1, 0), len, slabOn ? 0x35d6c0 : 0xffd25a); }
        eArr.flush();
        const a0 = Math.min(1, 0.3 + 0.7 * (1 - 1 / Math.max(1, k)));
        mols.forEach((g) => {
          const aTarget = (slabOn ? a0 : 0) * fieldOn; g.userData.a += (aTarget - g.userData.a) * (1 - Math.exp(-dt * 4)); const a = g.userData.a;
          g.userData.bar.visible = g.userData.pP.visible = g.userData.pN.visible = polar; g.userData.np.visible = !polar;
          if (polar) {
            const tq = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.sin(t * 1.3 + g.userData.ph) * 0.3, 0, Math.cos(t * 1.1 + g.userData.ph) * 0.3));
            const wob = new THREE.Quaternion().copy(g.userData.rnd).multiply(new THREE.Quaternion().setFromAxisAngle(new V3(0.3, 1, 0.2).normalize(), t * 0.8 + g.userData.ph));
            g.quaternion.copy(wob).slerp(polarQ.identity(), a);
          } else { g.quaternion.identity(); g.userData.cloud.position.y = 0.17 * a; }
        });
        const sp = (1 - 1 / Math.max(1, k)) * Math.min(1, fieldOn * 1.2);
        surfT.material.opacity = 0.6 * sp; surfB.material.opacity = 0.6 * sp;
        lSt.show(slabOn && sp > 0.15 && labs.diel.on); lSb.show(slabOn && sp > 0.15 && labs.diel.on);
        lSl.set(slabOn ? '유전체 κ = ' + Math.round(k) : '진공 (κ = 1)'); aSl.position.set(0, slabOn ? 0 : 0, 2.3);
        lCV.set(cap ? 'E = V/d = ' + g3(cv.Ein) + ' V/m' : 'E → E/κ'); lCV.show(cap && labs.diel.on);
        if (cap) info('<b>🔋 평행판 축전기</b> (C₀ = 100 pF, 10 V, Q₀ = 1.0 nC) — ' + (d.conn ? '전지를 연결한 채' : '전지를 뗀 채 (Q 고정)') + '<br>κ = ' + cv.k + ' → ' + (S.gate === 'num3' ? 'C = ?' : 'C = κC₀ = ' + cv.C + ' pF') + '<br>Q = ' + (cv.Q >= 100 ? Math.round(cv.Q) : cv.Q.toFixed(1)) + ' nC, V = ' + g3(cv.V) + ' V, 안쪽 E = ' + g3(cv.Ein) + ' V/m<br>유전체의 분극 전하가 안쪽 전기장을 약하게 해요.');
        else info(polar ? '<b>극성 분자</b>: 전기장이 걸리면 + 끝이 −판 쪽을 향해 늘어서요.<br>표면에 분극 전하가 생겨 안쪽 전기장이 <b>1/κ</b>로 약해져요 (κ = ' + Math.round(k) + ').' : '<b>무극성 분자</b>: 전기장이 걸리면 전자 구름이 +판 쪽으로 쏠려 <b>유도 쌍극자</b>가 돼요.<br>안쪽 전기장이 <b>1/κ</b>로 약해져요 (κ = ' + Math.round(k) + ').');
      }

      /* ================= ④ 정전식 터치스크린 ================= */
      const TS = { x0: 110, x1: 690, y0: 120, y1: 400, cols: 7, rows: 5, sg: 66 };
      const TW = (TS.x1 - TS.x0) * 0.016, TH = (TS.y1 - TS.y0) * 0.016;
      const glassP = box(TW + 1, 0.16, TH + 1, 0x1e293b, { metalness: 0.3, roughness: 0.3 }); glassP.position.y = -0.1; gT.add(glassP);
      const nodes = []; for (let r = 0; r < TS.rows; r++) for (let c = 0; c < TS.cols; c++) {
        const x = (-TW / 2 + (c + 0.5) * TW / TS.cols), z = (-TH / 2 + (r + 0.5) * TH / TS.rows);
        const m = sphere(0.14, 0x38bdf8, { emissive: 0x38bdf8, emissiveIntensity: 0.3 }); m.position.set(x, 0.05, z); gT.add(m); nodes.push({ m, x, z, c, r });
      }
      for (let c = 0; c < TS.cols; c++) { const s = mkSeg(0x475569, 0.015, {}); setSeg(s, new V3(-TW / 2 + (c + 0.5) * TW / TS.cols, 0.04, -TH / 2), new V3(-TW / 2 + (c + 0.5) * TW / TS.cols, 0.04, TH / 2)); gT.add(s); }
      for (let r = 0; r < TS.rows; r++) { const s = mkSeg(0x475569, 0.015, {}); setSeg(s, new V3(-TW / 2, 0.04, -TH / 2 + (r + 0.5) * TH / TS.rows), new V3(TW / 2, 0.04, -TH / 2 + (r + 0.5) * TH / TS.rows)); gT.add(s); }
      const finger = new THREE.Group(); gT.add(finger);
      const fTip = sphere(0.55, 0xf0c8a0, { roughness: 0.6 }), fBody = cyl(0.55, 0.55, 2.2, 0xf0c8a0, { roughness: 0.6 }); fBody.position.y = 1.1; finger.add(fTip, fBody);
      const fGlove = new THREE.Mesh(new THREE.SphereGeometry(0.66, 24, 16), mat(0x9aa5b8, { roughness: 0.9, transparent: true, opacity: 0.9 })); finger.add(fGlove);
      const aTf = anchor(gT, 0, 3.0, 0), lTf = L('touch', '', aTf, { color: '#475569', size: 13 });
      const aTr = anchor(gT), lTr = L('touch', '', aTr, { color: '#0e7490', size: 12 });
      function updTouch(S, sim, t) {
        const tc = S.ap.touch, gl = GLV[tc.glove];
        let fx = (tc.x - (TS.x0 + TS.x1) / 2) * 0.016, fz = (tc.y - (TS.y0 + TS.y1) / 2) * 0.016;
        if (st.toUser) { const p = st.toP; fx = -TW / 2 + 0.6 + (TW - 1.2) * (0.5 - 0.5 * Math.cos(Math.PI * 2 * p)); fz = Math.sin(Math.PI * 2 * p * 2) * TH * 0.32; }
        finger.position.set(fx, 0.6 + (tc.glove === 'plain' ? 0.18 : 0.04), fz);
        fTip.material.color.setHex(0xf0c8a0); fBody.material.color.setHex(0xf0c8a0);
        fGlove.visible = tc.glove !== 'bare'; fGlove.material.color.setHex(gl.col);
        let best = null;
        nodes.forEach((n) => { const d = Math.hypot((n.x - fx) / 0.016, (n.z - fz) / 0.016), dc = gl.dc * Math.exp(-Math.pow(d / TS.sg, 2)); n.dc = dc; const s = 0.6 + 1.8 * Math.min(1, dc / 3); n.m.scale.setScalar(s); n.m.material.emissiveIntensity = 0.2 + 0.9 * Math.min(1, dc / 3); n.m.material.color.setHex(dc > 0.5 ? 0xfacc15 : 0x38bdf8); n.m.material.emissive.setHex(dc > 0.5 ? 0xfacc15 : 0x38bdf8); if (!best || dc > best.dc) best = n; });
        aTf.position.set(fx, 3.0, fz); lTf.set(gl.name);
        aTr.position.set(best.x, 0.9, best.z); lTr.set('ΔC 최대 ' + best.dc.toFixed(1) + ' pF'); lTr.show(!!labs.touch.on);
        info('<b>🖐 정전식 터치스크린: 전극 사이의 정전 용량 변화</b><br>손가락: ' + gl.name + ' → ΔC 최대 ' + best.dc.toFixed(1) + ' pF<br>' + (best.dc >= 0.5 ? '터치 위치: 열 ' + (best.c + 1) + ', 행 ' + (best.r + 1) : '터치를 인식하지 못해요') + '<br>' + (S.ap.sub === 'cards' ? '(사례를 분류하는 카드 활동은 2D 화면에서 해요)' : '손가락을 끌어 움직여 보세요 (2D 화면)'));
      }

      /* ▶ 재생 */
      let built = false, sig = '';
      const plInd = grab('induce', () => controls.player({ duration: 8, loop: true, autoplay: false, label: '대전체 오가기', phases: [[0, '멀리'], [0.15, '가까이 → 전자 이동'], [0.55, '멀어지며 원래대로']], onFrame(p) { if (!built) return; st.indP = p; st.indUser = true; sig = ''; } }));
      const plSc = grab('scope', () => controls.player({ duration: 12, loop: true, autoplay: false, label: '유도 대전 순서', phases: [[0, '막대를 가까이'], [0.3, '접지'], [0.55, '접지 끊기'], [0.78, '막대 치우기']], onFrame(p) { if (!built) return; st.scP = p; st.scUser = true; sig = ''; } }));
      const plPa = grab('paper', () => controls.player({ duration: 10, loop: true, autoplay: false, label: '끌려오는 과정', phases: [[0, '다가옴'], [0.25, '① 분자 정렬'], [0.5, '② 분극 전하'], [0.62, '③ 알짜힘'], [0.78, '④ 끌려 올라감']], onFrame(p) { if (!built) return; st.paP = p; st.paUser = true; sig = ''; } }));
      const plMo = grab('mol', () => controls.player({ duration: 6, loop: true, autoplay: false, label: '전기장 걸었다 끊기', phases: [[0, '전기장 없음'], [0.2, '분자가 정렬'], [0.7, '전기장 끊기']], onFrame(p) { if (!built) return; st.moP = p; st.moUser = true; } }));
      const plTo = grab('touch', () => controls.player({ duration: 8, loop: true, autoplay: false, label: '손가락 훑기', phases: [[0, '화면 위를 지나는 손가락']], onFrame(p) { if (!built) return; st.toP = p; st.toUser = true; sig = ''; } }));
      built = true;

      function sceneOf(S) { return S.mode === 'induce' ? 'induce' : S.mode === 'electro' ? S.sc.sub : S.mode === 'dielec' ? S.de.sub : 'touch'; }
      const CAM = { induce: [10, 1.25], scope: [12, 1.25], shield: [14, 1.2], paper: [11, 1.2], mol: [12.5, 1.25], cap: [12.5, 1.25], touch: [14, 0.95] };
      let last = '';
      function show(sc) {
        gI.visible = sc === 'induce'; gE.visible = sc === 'scope'; gSh.visible = sc === 'shield'; gPa.visible = sc === 'paper'; gD.visible = sc === 'mol' || sc === 'cap'; gT.visible = sc === 'touch';
        const key = (sc === 'mol' || sc === 'cap') ? 'diel' : sc;
        Object.keys(labs).forEach((k) => { labs[k].on = k === key; labs[k].forEach((l) => l.show(k === key)); });
        showCtl(sc); ctx.orbit.tx = 0; ctx.orbit.ty = 0; ctx.orbit.theta = 0.12; ctx.orbit.phi = CAM[sc][1]; ctx.orbit.dist = CAM[sc][0] * KD;
        st.indUser = st.scUser = st.paUser = st.moUser = st.toUser = false; [plInd, plSc, plPa, plMo, plTo].forEach((p) => p.pause());
      }
      let ind2d = '', sc2d = '', pa2d = '', to2d = '';
      return {
        update(dt, t) {
          const sim = LS(); if (!sim) return; const S = sim.S, sc = sceneOf(S);
          if (sc !== last) { last = sc; sig = ''; show(sc); }
          if (sc === 'induce') { const k = [S.ind.bx, S.ind.sign, S.ind.sepGoal, S.ind.sep, S.ind.sA].join(); if (k !== ind2d) { if (st.indUser && ind2d) { st.indUser = false; plInd.pause(); } ind2d = k; sig = ''; } }
          if (sc === 'scope') { const k = [S.sc.xt, S.sc.grounded, S.sc.sign].join(); if (k !== sc2d) { if (st.scUser && sc2d) { st.scUser = false; plSc.pause(); } sc2d = k; } }
          if (sc === 'paper') { const k = String(S.de.stage); if (k !== pa2d) { if (st.paUser && pa2d) { st.paUser = false; plPa.pause(); } pa2d = k; sig = ''; } }
          if (sc === 'touch') { const k = [S.ap.touch.x, S.ap.touch.y].join(); if (k !== to2d) { if (st.toUser && to2d) { st.toUser = false; plTo.pause(); } to2d = k; } }
          if (sc === 'induce') { ballHalo.scale.setScalar(1 + 0.05 * Math.sin(t * 3)); const s2 = [S.ind.bx, S.ind.sign, S.ind.sepGoal, S.ind.sep, S.ind.sA, st.indP, st.indUser, S.ind.els.length ? S.ind.els[0].x : 0].join(); if (s2 !== sig) { sig = s2; updInduce(S, sim); } }
          else if (sc === 'scope') { leafAng += (leafTarget - leafAng) * (1 - Math.exp(-dt * 8)); leafL.rotation.z = leafAng; leafR.rotation.z = -leafAng; updScope(S, sim); }
          else if (sc === 'shield') updShield(S, sim, t);
          else if (sc === 'paper') updPaper(S, sim, t);
          else if (sc === 'touch') updTouch(S, sim, t);
          else animDiel(S, sim, dt, t);
        },
        sync() { sig = ''; },
      };
    },
  });
})();
