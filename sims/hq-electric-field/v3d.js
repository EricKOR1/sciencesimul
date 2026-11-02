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
          const hl = Math.min(len * 0.55, rad * 6.5), hr = rad * 2.7;
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
    function sphere(r, c, o) { return new THREE.Mesh(new THREE.SphereGeometry(r, 36, 24), mat(c, o)); }
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
  const MODE2SC = { force: 'force', field: 'field', graph: 'field', sum: 'sum' };

  window.SciSim3D.attach({
    title: '전기력과 전기장 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: 12.5 * KD, theta: 0.15, phi: 1.2, min: 5, max: 28 },
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const h = H3(ctx); const { V3, mat, mkArrow, setArrow, arrowSet, mkSeg, setSeg, anchor, sphere, fib, grab, showCtl, toggleBtn } = h;
      const lessonS = () => (window.__sim && window.__sim.S) || null;
      const S0 = lessonS();
      const st = {
        sc: S0 ? (MODE2SC[S0.mode] || 'force') : 'force',
        qa: S0 && S0.f1 ? S0.f1.qa : 2, qb: S0 && S0.f1 ? S0.f1.qb : 3, d: 4,
        Q: 1, sgn: 1, qp: 2, rt: 2.6, test: true, pre: 'b', px: 0, sum3d: false,
      };
      const gF = new THREE.Group(), gE = new THREE.Group(), gS = new THREE.Group(); root.add(gF, gE, gS);
      const colOf = (q) => (q > 0 ? POS : q < 0 ? NEG : 0x9aa3b2);
      function charge(g, q0) {
        const m = sphere(0.5, colOf(q0), { roughness: 0.3, emissive: colOf(q0), emissiveIntensity: 0.35 });
        const halo = new THREE.Mesh(new THREE.SphereGeometry(0.75, 24, 16), h.glass(colOf(q0), 0.18));
        m.add(halo); g.add(m); m.userData.halo = halo; return m;
      }
      function paint(m, q, sc) {
        m.material.color.setHex(colOf(q)); m.material.emissive.setHex(colOf(q)); m.userData.halo.material.color.setHex(colOf(q));
        const r = q === 0 ? 0.3 : 0.28 + 0.12 * Math.sqrt(Math.abs(q)); m.scale.setScalar(r / 0.5 * (sc || 1));
      }
      const sgnStr = (q) => (q > 0 ? '+' : q < 0 ? '−' : '0');

      /* ================= ① 전기력 ================= */
      const cA = charge(gF, st.qa), cB = charge(gF, st.qb);
      const fA = mkArrow(0xffb020, 0.075), fB = mkArrow(0xffb020, 0.075); gF.add(fA, fB);
      const dl = mkSeg(0xaab4c8, 0.02, { basic: true, mo: { transparent: true, opacity: 0.6 } }); gF.add(dl);
      const lA = label('', cA, { color: '#c0392b', size: 15, offset: [0, 0.95, 0] }), lB = label('', cB, { color: '#2f6df6', size: 15, offset: [0, 0.95, 0] });
      const aFA = anchor(gF), aFB = anchor(gF), lFA = label('힘 F', aFA, { color: '#b7791f', size: 13 }), lFB = label('힘 F', aFB, { color: '#b7791f', size: 13 });
      const aR = anchor(gF), lR = label('거리 r', aR, { color: '#556', size: 12 });
      const FREF = 6 / 16;
      function updForce() {
        const { qa, qb, d } = st, xA = -d / 2, xB = d / 2;
        cA.position.set(xA, 0, 0); cB.position.set(xB, 0, 0); paint(cA, qa); paint(cB, qb);
        const F = Math.abs(qa * qb) / (d * d), len = Math.min(5, 1.7 * F / FREF);
        const rep = qa * qb > 0, none = qa * qb === 0;
        const rA = cA.scale.x * 0.5, rB = cB.scale.x * 0.5;
        const dirA = rep ? -1 : 1, dirB = rep ? 1 : -1;     // +x 방향 부호
        if (none || len < 0.05) { fA.visible = fB.visible = false; } else {
          const a0 = new V3(xA + dirA * rA, 0, 0), b0 = new V3(xB + dirB * rB, 0, 0);
          setArrow(fA, a0, a0.clone().add(new V3(dirA * len, 0, 0))); setArrow(fB, b0, b0.clone().add(new V3(dirB * len, 0, 0)));
        }
        lFA.show(!none && len >= 0.05); lFB.show(!none && len >= 0.05);
        aFA.position.set(xA + dirA * (rA + len + 0.3), 0.55, 0); aFB.position.set(xB + dirB * (rB + len + 0.3), 0.55, 0);
        setSeg(dl, new V3(xA + rA, -0.9, 0), new V3(xB - rB, -0.9, 0)); aR.position.set(0, -0.9, 0); lR.off = [0, -0.25, 0];
        lA.set(qa === 0 ? '0' : (qa > 0 ? '+' : '−') + Math.abs(qa) + 'q'); lB.set(qb === 0 ? '0' : (qb > 0 ? '+' : '−') + Math.abs(qb) + 'q');
        lA.el.style.background = qa > 0 ? '#c0392b' : qa < 0 ? '#2f6df6' : '#667'; lB.el.style.background = qb > 0 ? '#c0392b' : qb < 0 ? '#2f6df6' : '#667';
        info('<b>' + (none ? '전하가 없으면 힘이 없어요.' : rep ? '같은 부호 → 서로 밀어내요 (척력)' : '다른 부호 → 서로 끌어당겨요 (인력)') + '</b><br>힘의 크기 ∝ |q₁q₂| ÷ r² = ' + Math.abs(qa * qb) + ' ÷ ' + (d * d) + '<br>두 힘은 크기가 같고 방향이 반대예요.');
      }

      /* ================= ② 점전하의 전기장 ================= */
      const src = charge(gE, 1);
      const shells = [1.5, 3.0, 4.5], NS = 34;
      const dirs = fib(NS);
      const eArr = arrowSet(NS * shells.length, 0.05); gE.add(eArr.group);
      const shellMesh = shells.map((r) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 36, 24), h.glass(0x8fb4ff, 0.045, { roughness: 0.4 })); gE.add(m); return m; });
      const tc = sphere(0.2, 0xffd166, { roughness: 0.3, emissive: 0xffb300, emissiveIntensity: 0.5 }); gE.add(tc);
      const aF = mkArrow(0xff8a2b, 0.07), aE = mkArrow(0x35d6c0, 0.045); gE.add(aF, aE);
      const lQ = label('Q', src, { color: '#c0392b', size: 15, offset: [0, 0.95, 0] });
      const lT = label('시험 전하 q′', tc, { color: '#b7791f', size: 12, offset: [0, 0.4, 0] });
      const aFa = anchor(gE), aEa = anchor(gE);
      const lFt = label('F = q′E', aFa, { color: '#c2410c', size: 13 });
      const lEt = label('E', aEa, { color: '#0f766e', size: 13 });
      const lr = [1.5, 3.0, 4.5].map((r, i) => label(i === 0 ? 'r' : i === 1 ? '2r → E ¼' : '3r → E ⅑', anchor(gE, r * 0.2, r * 0.97, 0), { color: '#475569', size: 11 }));
      const tmp = new V3(), tdir = new V3(0.8, 0.45, 0.4).normalize();
      function updField() {
        paint(src, st.sgn * st.Q, 1.2);
        lQ.set((st.sgn > 0 ? '+' : '−') + st.Q + 'q'); lQ.el.style.background = st.sgn > 0 ? '#c0392b' : '#2f6df6';
        let k = 0;
        shells.forEach((r, si) => {
          dirs.forEach((dv) => {
            const E = st.Q * (1.5 / r) * (1.5 / r), len = 1.2 * E, p = tmp.copy(dv).multiplyScalar(r);
            const col = new THREE.Color().setHSL(0.13 - 0.07 * Math.min(1, E * 0.5), 0.85, 0.5 + 0.1 * Math.min(1, E));
            // 화살표 방향: +전하는 밖으로, −전하는 안으로
            if (st.sgn > 0) eArr.set(k, p, dv, len, col.getHex());
            else eArr.set(k, p.clone().addScaledVector(dv, len), dv.clone().negate(), len, col.getHex());
            k++;
          });
        });
        eArr.flush();
        // 시험 전하
        const r = st.rt, E = st.Q * Math.pow(1.5 / r, 2);
        tc.visible = st.test; tc.position.copy(tdir).multiplyScalar(r); tc.scale.setScalar(0.8 + 0.25 * st.qp);
        const fl = 1.2 * E * st.qp, el = 1.2 * E;
        const side = tdir.clone().cross(new V3(0, 1, 0)).normalize().multiplyScalar(0.22);
        if (st.test) {
          const o = tc.position.clone(), s = st.sgn;
          setArrow(aF, o.clone().addScaledVector(tdir, s * 0.2), o.clone().addScaledVector(tdir, s * (0.2 + fl)));
          setArrow(aE, o.clone().add(side).addScaledVector(tdir, s * 0.05), o.clone().add(side).addScaledVector(tdir, s * (0.05 + el)));
          aFa.position.copy(o).addScaledVector(tdir, s * (0.2 + fl)); aEa.position.copy(o).add(side).addScaledVector(tdir, s * (0.05 + el));
        } else { aF.visible = aE.visible = false; }
        lT.show(st.test); lFt.show(st.test && aF.visible); lEt.show(st.test && aE.visible && st.qp !== 1);
        lT.set('시험 전하 +' + st.qp + "q′");
        info('<b>전기장 E = F ÷ q′</b> — 시험 전하가 없어도 전하 둘레의 공간에 있어요.<br>' + (st.sgn > 0 ? '+전하의 E는 밖으로' : '−전하의 E는 안으로') + ', 거리가 2배면 E는 ¼, 3배면 ⅑ (∝ 1/r²).' +
          (st.test ? '<br>q′ = ' + st.qp + '배 → 힘 F도 ' + st.qp + '배, 같은 곳의 E는 그대로예요.' : ''));
      }

      /* ================= ③ 전기장의 합 ================= */
      const PRESET = { a: [1, 4], b: [2, 2], c: [2, -2] };
      const sA = charge(gS, 1), sB = charge(gS, 1);
      const GX = 11, GY = 8, grid = [];
      for (let i = 0; i < GX; i++) for (let j = 0; j < GY; j++) grid.push([-5 + i, -3.5 + j]);
      const gArr = arrowSet(grid.length * 2, 0.045); gS.add(gArr.group);
      const probe = sphere(0.17, 0xffffff, { roughness: 0.3, emissive: 0xffffff, emissiveIntensity: 0.4 }); gS.add(probe);
      const e1 = mkArrow(0xff7a7a, 0.05), e2 = mkArrow(0x7aa8ff, 0.05), eS = mkArrow(0xffe14d, 0.075); gS.add(e1, e2, eS);
      const pg1 = mkSeg(0xaab4c8, 0.015, { basic: true, mo: { transparent: true, opacity: 0.55 } }), pg2 = mkSeg(0xaab4c8, 0.015, { basic: true, mo: { transparent: true, opacity: 0.55 } }); gS.add(pg1, pg2);
      const zero = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.035, 12, 36), mat(0x3ddc84, { emissive: 0x3ddc84, emissiveIntensity: 0.7 })); gS.add(zero);
      const lP = label('P', probe, { color: '#475569', size: 13, offset: [0, -0.35, 0] });
      const aE1 = anchor(gS), aE2 = anchor(gS), aES = anchor(gS);
      const lE1 = label('E₁', aE1, { color: '#c0392b', size: 12 }), lE2 = label('E₂', aE2, { color: '#2f6df6', size: 12 }), lES = label('합 E', aES, { color: '#a16207', size: 13 });
      const lSa = label('', sA, { color: '#c0392b', size: 14, offset: [0, 0.9, 0] }), lSb = label('', sB, { color: '#2f6df6', size: 14, offset: [0, 0.9, 0] });
      const lZ = label('E = 0인 점', zero, { color: '#16a34a', size: 12, offset: [0, 0.55, 0] });
      let qs = [0, 0], pos = [new V3(-2.4, 0, 0), new V3(2.4, 0, 0)];
      function eAt(p, i) { // i번 전하가 p에 만드는 전기장 (k = 1)
        const d = new V3().subVectors(p, pos[i]), r2 = Math.max(0.05, d.lengthSq()); return d.normalize().multiplyScalar(qs[i] / r2);
      }
      function updSum() {
        const pr = PRESET[st.pre]; qs = [pr[0], pr[1]];
        pos = st.pre === 'a' ? [new V3(-2.4, 0, 0), new V3(2.4, 0, 0)] : [new V3(-2.4, 0, 0), new V3(2.4, 0, 0)];
        [sA, sB].forEach((m, i) => { m.position.copy(pos[i]); paint(m, qs[i], 1); });
        lSa.set((qs[0] > 0 ? '+' : '−') + Math.abs(qs[0]) + 'q'); lSb.set((qs[1] > 0 ? '+' : '−') + Math.abs(qs[1]) + 'q');
        lSa.el.style.background = qs[0] > 0 ? '#c0392b' : '#2f6df6'; lSb.el.style.background = qs[1] > 0 ? '#c0392b' : '#2f6df6';
        const P = new V3(st.px, 1.7, 0); probe.position.copy(P);
        // 바닥 격자 화살표
        let k = 0;
        const planes = st.sum3d ? 2 : 1;
        for (let pl = 0; pl < 2; pl++) for (let g = 0; g < grid.length; g++, k++) {
          if (pl >= planes) { gArr.hide(k); continue; }
          const p = pl === 0 ? new V3(grid[g][0], grid[g][1], 0) : new V3(grid[g][0], 0, grid[g][1]);
          if (pl === 1 && Math.abs(grid[g][1]) < 0.01) { gArr.hide(k); continue; }
          const near = Math.min(p.distanceTo(pos[0]), p.distanceTo(pos[1])) < 0.9;
          const E = eAt(p, 0).add(eAt(p, 1)), m = E.length();
          if (near || m < 1e-3) { gArr.hide(k); continue; }
          const len = Math.min(0.95, Math.max(0.36, 0.5 * Math.pow(m, 0.42)));
          const c = new THREE.Color().setHSL(0.62 - 0.55 * Math.min(1, Math.pow(m, 0.4) / 1.6), 0.8, 0.55);
          gArr.set(k, p.clone().addScaledVector(E.normalize(), -len / 2), E, len, c.getHex());
        }
        gArr.flush();
        // 점 P의 E₁, E₂, 합
        const E1 = eAt(P, 0), E2 = eAt(P, 1), Es = E1.clone().add(E2), sc = 4;
        const cl = (v) => (v.length() > 3.4 ? v.clone().setLength(3.4) : v);
        const a1 = P.clone().add(cl(E1.clone().multiplyScalar(sc))), a2 = P.clone().add(cl(E2.clone().multiplyScalar(sc))), as = P.clone().add(cl(Es.clone().multiplyScalar(sc)));
        setArrow(e1, P, a1); setArrow(e2, P, a2); setArrow(eS, P, as);
        setSeg(pg1, a1, P.clone().add(cl(E1.clone().multiplyScalar(sc))).add(cl(E2.clone().multiplyScalar(sc)))); setSeg(pg2, a2, P.clone().add(cl(E1.clone().multiplyScalar(sc))).add(cl(E2.clone().multiplyScalar(sc))));
        aE1.position.copy(a1); aE2.position.copy(a2); aES.position.copy(as); lES.off = [0, 0.3, 0];
        // E = 0 인 점 (같은 부호일 때 두 전하 사이)
        let zp = null;
        if (qs[0] * qs[1] > 0) { const a = Math.sqrt(Math.abs(qs[0])), b = Math.sqrt(Math.abs(qs[1])); zp = new V3(pos[0].x + (pos[1].x - pos[0].x) * a / (a + b), 0, 0); }
        zero.visible = !!zp; lZ.show(!!zp); if (zp) { zero.position.copy(zp); zero.rotation.y = Math.PI / 2; }
        const msg = st.pre === 'c' ? '다른 부호(쌍극자)는 두 전하 사이에서 E가 모두 같은 쪽을 향해 <b>더 세져요</b>. E = 0인 점이 없어요.'
          : st.pre === 'b' ? '같은 크기의 같은 부호는 가운데에서 E가 서로 <b>상쇄</b>돼 0이에요.' : '크기가 다른 같은 부호는 <b>작은 전하 쪽</b>에 E = 0인 점이 생겨요.';
        info('<b>E합 = E₁ + E₂ (벡터의 합)</b><br>노란 화살표가 두 화살표를 이은 평행사변형의 대각선이에요.<br>' + msg);
      }

      /* ================= 조작 ================= */
      const sceneSeg = controls.segment('보기', [{ value: 'force', label: '⚡ 전기력' }, { value: 'field', label: '🧭 전기장' }, { value: 'sum', label: '➕ 전기장 합' }], st.sc, (v) => { st.sc = v; show(); });
      const rq = (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v) + 'q';
      grab('force', () => controls.range('전하 A', -3, 3, 1, st.qa, (v) => { st.qa = v; updForce(); }, rq));
      grab('force', () => controls.range('전하 B', -3, 3, 1, st.qb, (v) => { st.qb = v; updForce(); }, rq));
      grab('force', () => controls.range('거리 r', 3, 7, 1, st.d, (v) => { st.d = v; updForce(); }, (v) => v.toFixed(0)));
      grab('field', () => controls.button('🔁 +/− 바꾸기', () => { st.sgn = -st.sgn; updField(); }));
      grab('field', () => controls.range('전하량', 1, 3, 1, st.Q, (v) => { st.Q = v; updField(); }, (v) => v + 'q'));
      grab('field', () => controls.range('q′', 1, 3, 1, st.qp, (v) => { st.qp = v; updField(); }, (v) => v + 'q′'));
      grab('field', () => controls.range('시험 전하 거리', 1.5, 4.5, 0.25, st.rt, (v) => { st.rt = v; updField(); }, (v) => (v / 1.5).toFixed(1) + 'r'));
      toggleBtn('field', '시험 전하', true, (on) => { st.test = on; updField(); });
      const preSeg = grab('sum', () => controls.segment('', [{ value: 'a', label: '+q, +4q' }, { value: 'b', label: '+2q, +2q' }, { value: 'c', label: '+2q, −2q' }], st.pre, (v) => { st.pre = v; updSum(); }));
      grab('sum', () => controls.range('점 P', -4, 4, 0.25, st.px, (v) => { st.px = v; updSum(); }, (v) => 'x = ' + v.toFixed(1)));
      toggleBtn('sum', '입체 격자', false, (on) => { st.sum3d = on; updSum(); });

      function show() {
        gF.visible = st.sc === 'force'; gE.visible = st.sc === 'field'; gS.visible = st.sc === 'sum';
        [lA, lB, lR].forEach((l) => l.show(st.sc === 'force'));
        if (st.sc !== 'force') { lFA.show(false); lFB.show(false); }
        [lQ, lr[0], lr[1], lr[2]].forEach((l) => l.show(st.sc === 'field'));
        if (st.sc !== 'field') { lT.show(false); lFt.show(false); lEt.show(false); }
        [lP, lE1, lE2, lES, lSa, lSb].forEach((l) => l.show(st.sc === 'sum'));
        if (st.sc !== 'sum') lZ.show(false);
        sceneSeg.set(st.sc); showCtl(st.sc);
        if (st.sc === 'force') updForce(); else if (st.sc === 'field') updField(); else updSum();
        ctx.orbit.tx = 0; ctx.orbit.ty = 0; ctx.orbit.dist = (st.sc === 'force' ? 9 : st.sc === 'field' ? 12.5 : 12) * KD;
      }
      show();
      let lastMode = S0 ? S0.mode : '';
      return {
        update(dt, t) {
          const S = lessonS();
          if (S && S.mode !== lastMode) { lastMode = S.mode; const sc = MODE2SC[S.mode]; if (sc && sc !== st.sc) { st.sc = sc; show(); } }
          if (st.sc === 'sum' && zero.visible) { const s = 1 + 0.12 * Math.sin(t * 4); zero.scale.setScalar(s); }
          if (st.sc === 'field') { gE.rotation.y += dt * 0.18; const s = 1 + 0.04 * Math.sin(t * 2); src.userData.halo.scale.setScalar(s); }
        },
        sync() {},
      };
    },
  });
})();
