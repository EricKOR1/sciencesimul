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
  const MODE2SC = { induce: 'induce', electro: 'scope', dielec: 'diel', apply: 'diel' };

  window.SciSim3D.attach({
    title: '정전기 유도와 분극 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: 12 * KD, theta: 0.35, phi: 1.18, min: 5, max: 26 },
    autoRotate: 0,
    levels: [0, 1, 2],
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const h = H3(ctx); const { V3, mat, glass, mkArrow, setArrow, arrowSet, anchor, sphere, box, cyl, grab, showCtl, toggleBtn } = h;
      const lessonS = () => (window.__sim && window.__sim.S) || null;
      const S0 = lessonS();
      const st = {
        sc: S0 ? (MODE2SC[S0.mode] || 'induce') : 'induce',
        sgn: 1, gap: 1.2, split: false, e: 0, f: 0,                     // 유도
        rodNear: false, ground: false, Qnet: 0, rodX: -6,               // 검전기
        on: true, ins: 1, mol: 'polar', kappa: 3,                       // 유전체
      };
      const gI = new THREE.Group(), gE = new THREE.Group(), gD = new THREE.Group(); root.add(gI, gE, gD);

      /* ================= ① 금속 막대의 정전기 유도 ================= */
      const NX = 14, NI = NX * 4;
      const ionG = new THREE.SphereGeometry(0.1, 14, 10), elG = new THREE.SphereGeometry(0.085, 14, 10);
      const ions = new THREE.InstancedMesh(ionG, mat(POS, { roughness: 0.4, emissive: POS, emissiveIntensity: 0.25 }), NI);
      const els = new THREE.InstancedMesh(elG, mat(NEG, { roughness: 0.4, emissive: NEG, emissiveIntensity: 0.45 }), NI);
      gI.add(ions, els);
      const rodL = cyl(0.72, 0.72, 6.6, 0xb8c2d4, { metalness: 0.7, roughness: 0.25, transparent: true, opacity: 0.28, depthWrite: false }); rodL.rotation.z = Math.PI / 2; gI.add(rodL);
      const rodR = cyl(0.72, 0.72, 3.3, 0xb8c2d4, { metalness: 0.7, roughness: 0.25, transparent: true, opacity: 0.28, depthWrite: false }); rodR.rotation.z = Math.PI / 2; rodR.visible = false; gI.add(rodR);
      const ball = sphere(0.8, POS, { roughness: 0.3, emissive: POS, emissiveIntensity: 0.35 }); gI.add(ball);
      const ballHalo = new THREE.Mesh(new THREE.SphereGeometry(1.15, 24, 16), glass(POS, 0.14)); ball.add(ballHalo);
      const cellPos = [];
      for (let i = 0; i < NX; i++) for (let k = 0; k < 4; k++) cellPos.push([-3 + 6 * (i + 0.5) / NX, k < 2 ? 0.26 : -0.26, k % 2 ? 0.26 : -0.26]);
      const M4 = new THREE.Matrix4(), Pv = new V3();
      const aBall = anchor(gI, 0, 1.2, 0), lBall = label('', aBall, { color: '#c0392b', size: 14 });
      const aNear = anchor(gI, -3, 1.2, 0), aFar = anchor(gI, 3, 1.2, 0);
      const lNear = label('', aNear, { color: '#2f6df6', size: 13 }), lFar = label('', aFar, { color: '#c0392b', size: 13 });
      const lIon = label('고정된 양이온 (+)', anchor(gI, 0, -1.25, 0), { color: '#c0392b', size: 12 }), lEl = label('자유전자 (−)', anchor(gI, 0, -1.7, 0), { color: '#2f6df6', size: 12 });
      const aSplitL = anchor(gI, -4.2, 1.2, 0), aSplitR = anchor(gI, 4.2, 1.2, 0), lSL = label('', aSplitL, { color: '#475569', size: 13 }), lSR = label('', aSplitR, { color: '#475569', size: 13 });
      function updInduce() {
        const sep = st.split ? 1.0 : 0;
        const f = st.gap >= 4.5 ? 0 : Math.max(0, Math.min(1, 1 - (st.gap - 0.6) / 3.9));
        st.f = f;
        const xs = -st.sgn * f * 1.35;                                      // +막대 → 전자가 왼쪽으로
        const bx = -3.5 - st.gap - 0.2;
        ball.position.set(bx, 0, 0); ball.material.color.setHex(st.sgn > 0 ? POS : NEG); ball.material.emissive.setHex(st.sgn > 0 ? POS : NEG); ballHalo.material.color.setHex(st.sgn > 0 ? POS : NEG);
        aBall.position.set(bx, 1.35, 0); lBall.set(st.sgn > 0 ? '+ 대전체' : '− 대전체'); lBall.el.style.background = st.sgn > 0 ? '#c0392b' : '#2f6df6';
        const half = (i) => (cellPos[i][0] < 0 ? 0 : 1);
        const eN = [0, 0];                                                  // 반쪽의 전자 수
        for (let i = 0; i < NI; i++) {
          const c = cellPos[i], dx = (c[0] < 0 ? -sep : sep) * 0.75;
          Pv.set(c[0] + dx, c[1], c[2]); M4.makeTranslation(Pv.x, Pv.y, Pv.z); ions.setMatrixAt(i, M4);
        }
        ions.instanceMatrix.needsUpdate = true;
        if (!st.split) {
          const lo = -3.05, hi = 3.05;
          for (let i = 0; i < NI; i++) {
            const c = cellPos[i]; let x = c[0] + xs, pile = 0;
            if (x < lo) { pile = Math.min(1, (lo - x) / 1.0); x = lo + (i % 3) * 0.12 + 0.02; } else if (x > hi) { pile = Math.min(1, (x - hi) / 1.0); x = hi - (i % 3) * 0.12 - 0.02; }
            Pv.set(x, c[1] * (1 + pile * 0.25), c[2]); M4.makeTranslation(Pv.x, Pv.y, Pv.z); els.setMatrixAt(i, M4);
          }
        } else {
          // 분리한 뒤: 각 반쪽이 가진 전자 수는 그대로 (전하량 보존)
          const nL = NI / 2 + st.e, nR = NI - nL, xL = -sep * 0.75, xR = sep * 0.75;
          const place = (n, x0, x1, off) => { for (let j = 0; j < n; j++) { const u = (j + 0.5) / n, k = j % 4, x = x0 + (x1 - x0) * u; Pv.set(x, k < 2 ? 0.26 : -0.26, k % 2 ? 0.26 : -0.26); M4.makeTranslation(Pv.x, Pv.y, Pv.z); els.setMatrixAt(off + j, M4); } };
          place(nL, -3.05 + xL, -0.1 + xL, 0); place(nR, 0.1 + xR, 3.05 + xR, nL);
        }
        els.instanceMatrix.needsUpdate = true;
        rodL.visible = !st.split; rodR.visible = st.split;
        if (st.split) { rodL.visible = true; rodL.scale.set(1, 0.5, 1); rodL.position.set(-1.65 - 0.75, 0, 0); rodR.position.set(1.65 + 0.75, 0, 0); } else { rodL.scale.set(1, 1, 1); rodL.position.set(0, 0, 0); }
        lNear.show(!st.split && f > 0.25); lFar.show(!st.split && f > 0.25);
        const neg = st.sgn > 0;                                             // 대전체가 +면 가까운 쪽이 −
        lNear.set(neg ? '− (전자 많음)' : '+ (전자 부족)'); lFar.set(neg ? '+ (전자 부족)' : '− (전자 많음)');
        lNear.el.style.background = neg ? '#2f6df6' : '#c0392b'; lFar.el.style.background = neg ? '#c0392b' : '#2f6df6';
        lSL.show(st.split); lSR.show(st.split);
        if (st.split) { const q = -st.e; const aq = Math.abs(q); lSL.set(q === 0 ? '중성' : (q < 0 ? '− 대전 (−' + aq + ')' : '+ 대전 (+' + aq + ')')); lSR.set(q === 0 ? '중성' : (q > 0 ? '− 대전 (−' + aq + ')' : '+ 대전 (+' + aq + ')')); lSL.el.style.background = q < 0 ? '#2f6df6' : q > 0 ? '#c0392b' : '#667'; lSR.el.style.background = q > 0 ? '#2f6df6' : q < 0 ? '#c0392b' : '#667'; }
        aSplitL.position.set(-3.6 - sep * 0.75, 1.2, 0); aSplitR.position.set(3.6 + sep * 0.75, 1.2, 0);
        aNear.position.set(-2.4, 1.2, 0); aFar.position.set(2.4, 1.2, 0);
        const head = st.split ? '<b>둘로 나눈 뒤 대전체를 치워도 각각 대전된 채예요.</b><br>전자는 새로 생기거나 사라지지 않고 <b>옮겨 간 것</b>이에요 (전하량 보존).' :
          f < 0.1 ? '<b>대전체가 멀리 있어요.</b><br>막대 속 전자는 고르게 퍼져 있고 전체가 중성이에요.' : '<b>대전체 쪽 끝</b>이 ' + (neg ? '−' : '+') + ', 반대쪽 끝이 ' + (neg ? '+' : '−') + ' 로 대전돼요.<br>가까울수록 전자가 더 많이 이동해요. 막대의 알짜 전하는 여전히 0이에요.';
        info(head + (st.split ? '' : '<br>접촉하지 않아도 일어나는 <b>정전기 유도</b>예요.'));
      }
      /* 분리할 때의 전자 수 기억 */
      function splitNow(on) {
        if (on) { st.e = Math.round(st.sgn * st.f * 8); /* +막대 → 가까운 쪽(왼쪽) 전자 증가 */ }
        st.split = on; updInduce();
      }

      /* ================= ② 검전기로 하는 유도 대전 ================= */
      const jar = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 3.6, 36, 1, true), glass(0xbfd6ff, 0.12)); jar.position.y = -0.1; gE.add(jar);
      const base = cyl(1.8, 1.9, 0.25, 0x7b8798, { metalness: 0.4 }); base.position.y = -1.95; gE.add(base);
      const stem = cyl(0.08, 0.08, 2.6, 0xc9a24a, { metalness: 0.8, roughness: 0.3 }, 14); stem.position.y = 0.55; gE.add(stem);
      const topBall = sphere(0.55, 0xd4af37, { metalness: 0.85, roughness: 0.25 }); topBall.position.y = 1.95; gE.add(topBall);
      const leafL = new THREE.Group(), leafR = new THREE.Group(); leafL.position.y = leafR.position.y = -0.75; gE.add(leafL, leafR);
      const lfG = new THREE.BoxGeometry(0.05, 1.2, 0.5); lfG.translate(0, -0.6, 0);
      const lfM = new THREE.Mesh(lfG, mat(0xf0d36a, { metalness: 0.8, roughness: 0.25 })), lfM2 = lfM.clone(); lfM2.material = lfM.material.clone();
      leafL.add(lfM); leafR.add(lfM2);
      const rod = new THREE.Group(); const rodBody = cyl(0.22, 0.22, 3.2, 0xe9edf5, { roughness: 0.3, metalness: 0.1 }); rodBody.rotation.z = Math.PI / 2; rodBody.position.x = -1.6;
      const rodTip = sphere(0.3, POS, { emissive: POS, emissiveIntensity: 0.4 }); rod.add(rodBody, rodTip); rod.position.set(-6, 2.3, 0); gE.add(rod);
      const gnd = new THREE.Group(); const gw = cyl(0.04, 0.04, 2.0, 0x7b8798, { metalness: 0.5 }); gw.position.y = -0.0;
      gnd.add(gw); [0.7, 0.5, 0.3].forEach((w, i) => { const b = box(w * 1.4, 0.05, 0.05, 0x7b8798); b.position.y = -1.1 - i * 0.12; gnd.add(b); });
      gnd.position.set(2.1, -1.0, 0); gE.add(gnd);
      const swArm = cyl(0.03, 0.03, 1.0, 0x7b8798, { metalness: 0.5 }, 8); swArm.rotation.z = Math.PI / 2; swArm.position.set(0.5, -1.95, 0); gE.add(swArm);
      const NDOT = 26, dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.09, 12, 8), mat(0xffffff, { roughness: 0.35, emissive: 0xffffff, emissiveIntensity: 0.5 }), NDOT); gE.add(dots);
      const aRod = anchor(rod, -3.2, 0.5, 0), lRod = label('', aRod, { color: '#c0392b', size: 13 });
      const aLeaf = anchor(gE, 0, -2.3, 0.9), lLeaf = label('금속박', aLeaf, { color: '#a16207', size: 12 });
      const aTop = anchor(gE, 0, 2.8, 0), lTop = label('', aTop, { color: '#475569', size: 12 });
      const aGnd = anchor(gE, 2.1, -2.7, 0), lGnd = label('접지', aGnd, { color: '#475569', size: 12 });
      let leafAng = 0;
      function leafCharge() { const T = st.rodNear ? -st.sgn : 0; if (st.ground) { st.Qnet = T; return 0; } return st.Qnet - T; }
      function updScope() {
        const T = st.rodNear ? -st.sgn : 0, L = leafCharge();
        // 전하 점 그리기
        let k = 0; const col = new THREE.Color();
        const put = (p, q) => { Pv.copy(p); M4.makeTranslation(Pv.x, Pv.y, Pv.z); dots.setMatrixAt(k, M4); dots.setColorAt(k, col.set(q > 0 ? POS : NEG)); k++; };
        const nT = T !== 0 ? 5 : 0, nL = L !== 0 ? 3 : 0;
        for (let i = 0; i < nT; i++) { const a = i / nT * Math.PI * 2 + 0.3; put(new V3(0.62 * Math.cos(a) * 0.9, 1.95 + 0.62 * Math.sin(a) * 0.9 * (i % 2 ? 1 : 0.5), 0.6 * Math.sin(a)), T); }
        st.leafTarget = Math.max(0, Math.min(0.75, Math.abs(L) * 0.55)); const ang = leafAng;
        for (const sgn of [-1, 1]) for (let i = 0; i < nL; i++) { const lp = 0.3 + i * 0.32; put(new V3(sgn * Math.sin(ang) * lp + sgn * 0.09, -0.75 - Math.cos(ang) * lp, 0.0), L); }
        for (; k < NDOT; k++) { M4.makeScale(0, 0, 0); dots.setMatrixAt(k, M4); }
        dots.instanceMatrix.needsUpdate = true; if (dots.instanceColor) dots.instanceColor.needsUpdate = true;
        rodTip.material.color.setHex(st.sgn > 0 ? POS : NEG); rodTip.material.emissive.setHex(st.sgn > 0 ? POS : NEG);
        lRod.set(st.sgn > 0 ? '+ 대전된 막대' : '− 대전된 막대'); lRod.el.style.background = st.sgn > 0 ? '#c0392b' : '#2f6df6';
        lTop.show(T !== 0); lTop.set(T < 0 ? '전자가 모여요 (−)' : '전자가 빠져요 (+)'); lTop.el.style.background = T < 0 ? '#2f6df6' : '#c0392b';
        lGnd.show(true);
        swArm.visible = !st.ground; gnd.visible = true;
        let txt;
        if (!st.rodNear && st.Qnet === 0) txt = '<b>중성 검전기</b>: 금속박이 닫혀 있어요.<br>대전된 막대를 <b>접촉하지 않고</b> 가까이 가져가 보세요.';
        else if (st.rodNear && !st.ground && st.Qnet === 0) txt = '<b>막대를 가까이</b>: 위쪽 구에 반대 전하, 금속박에 <b>막대와 같은 부호</b>가 모여 벌어져요.<br>이제 <b>접지</b>를 연결해 보세요.';
        else if (st.rodNear && st.ground) txt = '<b>접지 연결</b>: 금속박의 전하가 땅으로 빠져나가(또는 땅에서 들어와) 금속박이 닫혀요.<br>접지를 먼저 끊은 다음 막대를 치우세요.';
        else if (st.rodNear) txt = '<b>접지를 끊었어요</b>: 이제 막대를 멀리 치우면...<br>검전기에 남은 전하가 금속박으로 퍼져요.';
        else txt = '<b>유도 대전 완성!</b> 금속박이 <b>막대와 반대 부호</b>로 대전되어 벌어졌어요.<br>' + (L < 0 ? '전자가 땅에서 들어와 − 대전' : '전자가 땅으로 빠져 + 대전') + '되었어요.';
        info(txt);
      }

      /* ================= ③ 유전체와 분극 ================= */
      const pTop = box(7.4, 0.14, 5, 0xc9d1e0, { metalness: 0.6, roughness: 0.3 }), pBot = box(7.4, 0.14, 5, 0xc9d1e0, { metalness: 0.6, roughness: 0.3 }); pTop.position.y = 1.6; pBot.position.y = -1.6; gD.add(pTop, pBot);
      const slab = new THREE.Group(); gD.add(slab);
      const slabBody = box(6.6, 2.6, 4.2, 0xd8b4ff, { transparent: true, opacity: 0.2, depthWrite: false, roughness: 0.2 }); slab.add(slabBody);
      const surfT = box(6.6, 0.05, 4.2, NEG, { transparent: true, opacity: 0, depthWrite: false, emissive: NEG, emissiveIntensity: 0.6 }), surfB = box(6.6, 0.05, 4.2, POS, { transparent: true, opacity: 0, depthWrite: false, emissive: POS, emissiveIntensity: 0.6 });
      surfT.position.y = 1.3; surfB.position.y = -1.3; slab.add(surfT, surfB);
      const mols = [];
      const MX = 5, MZ = 3, MY = 2;
      for (let i = 0; i < MX; i++) for (let k = 0; k < MZ; k++) for (let j = 0; j < MY; j++) {
        const g = new THREE.Group(); g.position.set(-2.4 + i * 1.2, -0.5 + j * 1.0, -1.3 + k * 1.3);
        const bar = cyl(0.05, 0.05, 0.5, 0xaab4c8, { metalness: 0.2 }, 8);
        const pP = sphere(0.14, POS, { emissive: POS, emissiveIntensity: 0.35 }), pN = sphere(0.14, NEG, { emissive: NEG, emissiveIntensity: 0.35 }); pP.position.y = -0.26; pN.position.y = 0.26;   // + 끝이 아래(전기장 방향)
        g.add(bar, pP, pN);
        // 무극성 분자: 핵 + 전자 구름
        const nuc = sphere(0.1, POS, { emissive: POS, emissiveIntensity: 0.4 }), cloud = new THREE.Mesh(new THREE.SphereGeometry(0.3, 18, 12), glass(NEG, 0.35)); cloud.position.y = 0;
        const np = new THREE.Group(); np.add(nuc, cloud);
        g.add(np);
        g.userData = { bar, pP, pN, np, cloud, rnd: new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28)), a: 0, ph: Math.random() * 6.28, home: g.position.clone() };
        slab.add(g); mols.push(g);
      }
      const eArr = arrowSet(15, 0.04); gD.add(eArr.group);
      const aPT = anchor(gD, -3.0, 1.6, 2.6), aPB = anchor(gD, -3.0, -1.6, 2.6);
      const lPT = label('+', aPT, { color: '#c0392b', size: 14 }), lPB = label('−', aPB, { color: '#2f6df6', size: 14 });
      const aSl = anchor(slab, 0, 0, 2.3), lSl = label('유전체', aSl, { color: '#7c3aed', size: 12 });
      const aSt = anchor(slab, 0, 1.45, 2.1), lSt = label('표면에 − 분극 전하', aSt, { color: '#2f6df6', size: 11 }), aSb = anchor(slab, 0, -1.45, 2.1), lSb = label('표면에 + 분극 전하', aSb, { color: '#c0392b', size: 11 });
      const aE0 = anchor(gD, 3.6, 0.2, 0), lE0 = label('E', aE0, { color: '#0f766e', size: 12 });
      let slabX = 0;
      function updDiel() {
        gD.visible = st.sc === 'diel';
        pTop.material.color.setHex(st.on ? POS : 0xc9d1e0); pBot.material.color.setHex(st.on ? NEG : 0xc9d1e0);
        pTop.material.emissive.setHex(st.on ? POS : 0); pBot.material.emissive.setHex(st.on ? NEG : 0); pTop.material.emissiveIntensity = pBot.material.emissiveIntensity = 0.25;
        lPT.show(st.on); lPB.show(st.on);
        info(st.mol === 'polar'
          ? '<b>극성 분자</b>: 전기장이 없으면 제멋대로, 전기장이 걸리면 + 끝이 −판 쪽을 향해 늘어서요.<br>유전체 표면에 분극 전하가 생겨 안쪽 전기장이 <b>1/κ</b>로 약해져요.<br>그래서 같은 전압에서 축전기에 더 많은 전하가 저장돼요 (C = κC₀).'
          : '<b>무극성 분자</b>: 전기장이 걸리면 전자 구름이 +판 쪽으로 살짝 쏠려 <b>유도 쌍극자</b>가 돼요.<br>이후는 같아요. 표면에 분극 전하가 생기고 안쪽 전기장이 <b>1/κ</b>로 약해져요 (κ = ' + st.kappa + ').');
        mols.forEach((g) => { g.userData.bar.visible = g.userData.pP.visible = g.userData.pN.visible = st.mol === 'polar'; g.userData.np.visible = st.mol !== 'polar'; });
      }
      const polarQ = new THREE.Quaternion(), tq = new THREE.Quaternion(), wob = new THREE.Quaternion(), eul = new THREE.Euler();

      /* ================= 조작 ================= */
      const seg = controls.segment('보기', [{ value: 'induce', label: '🎈 정전기 유도' }, { value: 'scope', label: '🔌 검전기' }, { value: 'diel', label: '🧻 유전 분극' }], st.sc, (v) => go(v));
      grab('induce', () => controls.button('🔁 대전체 +/−', () => { st.sgn = -st.sgn; if (st.split) st.split = false, tSplit.set(false); updInduce(); }));
      grab('induce', () => controls.range('대전체 거리', 0.6, 4.5, 0.3, st.gap, (v) => { st.gap = v; updInduce(); }, (v) => (v >= 4.5 ? '멀리' : v.toFixed(1))));
      const tSplit = toggleBtn('induce', '둘로 나누기', false, (on) => splitNow(on));
      grab('scope', () => controls.button('🔁 막대 +/−', () => { st.sgn = -st.sgn; st.Qnet = 0; st.ground = false; tG.set(false); updScope(); }));
      const bNear = grab('scope', () => controls.button('막대 가까이', () => { st.rodNear = !st.rodNear; bNear.textContent = st.rodNear ? '막대 치우기' : '막대 가까이'; updScope(); }));
      const tG = toggleBtn('scope', '접지', false, (on) => { st.ground = on; updScope(); });
      grab('scope', () => controls.button('↺ 처음으로', () => { st.rodNear = false; st.ground = false; st.Qnet = 0; tG.set(false); bNear.textContent = '막대 가까이'; updScope(); }));
      toggleBtn('diel', '전압 연결', true, (on) => { st.on = on; updDiel(); });
      grab('diel', () => controls.segment('', [{ value: 'polar', label: '극성 분자' }, { value: 'non', label: '무극성 분자' }], st.mol, (v) => { st.mol = v; updDiel(); }));
      grab('diel', () => controls.range('유전체 넣기', 0, 1, 0.05, st.ins, (v) => { st.ins = v; }, (v) => Math.round(v * 100) + '%'));
      grab('diel', () => controls.range('유전 상수 κ', 1.5, 6, 0.5, st.kappa, (v) => { st.kappa = v; updDiel(); }, (v) => v.toFixed(1)));
      function go(sc) {
        st.sc = sc; seg.set(sc); showCtl(sc);
        gI.visible = sc === 'induce'; gE.visible = sc === 'scope'; gD.visible = sc === 'diel';
        [lBall, lNear, lFar, lIon, lEl, lSL, lSR].forEach((l) => l.show(sc === 'induce'));
        [lRod, lLeaf, lTop, lGnd].forEach((l) => l.show(sc === 'scope'));
        [lPT, lPB, lSl, lSt, lSb, lE0].forEach((l) => l.show(sc === 'diel'));
        if (sc === 'induce') updInduce(); else if (sc === 'scope') updScope(); else updDiel();
        ctx.orbit.dist = (sc === 'diel' ? 12.5 : sc === 'scope' ? 12 : 11) * KD;
      }
      go(st.sc);
      let lastMode = S0 ? S0.mode : '';
      return {
        update(dt, t) {
          const S = lessonS();
          if (S && S.mode !== lastMode) { lastMode = S.mode; const sc = MODE2SC[S.mode]; if (sc && sc !== st.sc) go(sc); }
          if (st.sc === 'induce') { ballHalo.scale.setScalar(1 + 0.05 * Math.sin(t * 3)); }
          if (st.sc === 'scope') {
            const tx = st.rodNear ? -1.35 : -6.2; rod.position.x += (tx - rod.position.x) * (1 - Math.exp(-dt * 5));
            rod.position.x = Math.min(rod.position.x, -0.9);
            leafAng += ((st.leafTarget || 0) - leafAng) * (1 - Math.exp(-dt * 6)); leafL.rotation.z = leafAng; leafR.rotation.z = -leafAng;
            // 점 위치도 금속박 각도에 맞게 매 프레임 다시 놓기
            if (Math.abs((st.leafTarget || 0) - leafAng) > 0.002) updScope();
          }
          if (st.sc === 'diel') {
            const tx = -(1 - st.ins) * 7.2; slabX += (tx - slabX) * (1 - Math.exp(-dt * 6)); slab.position.x = slabX;
            let k = 0;
            for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++, k++) {
              const x = -2.8 + i * 1.4, z = -1.4 + j * 1.4, inSlab = Math.abs(x - slabX) < 3.3;
              const E0 = st.on ? 1 : 0, len = st.on ? (inSlab ? 2.6 / st.kappa : 2.6) * 0.95 : 0;
              eArr.set(k, new V3(x, 1.45, z), new V3(0, -1, 0), len * 0.95, inSlab ? 0x35d6c0 : 0xffd25a);
            }
            eArr.flush();
            let inside = 0, tot = 0;
            mols.forEach((g) => {
              const wx = g.userData.home.x + slabX, inPl = Math.abs(wx) < 3.55;
              const aTarget = st.on && inPl ? 1 : 0; g.userData.a += (aTarget - g.userData.a) * (1 - Math.exp(-dt * 4)); const a = g.userData.a;
              if (st.mol === 'polar') {
                tq.setFromEuler(eul.set(Math.sin(t * 1.3 + g.userData.ph) * 0.3, 0, Math.cos(t * 1.1 + g.userData.ph) * 0.3));
                wob.copy(g.userData.rnd); wob.multiply(tq.setFromAxisAngle(new V3(0.3, 1, 0.2).normalize(), t * 0.8 + g.userData.ph));
                g.quaternion.copy(wob).slerp(polarQ.identity(), a);
              } else { g.quaternion.identity(); g.userData.cloud.position.y = 0.16 * a * (3 / st.kappa) * 0.9 + 0.0; g.userData.cloud.position.y = 0.17 * a; }
              if (inPl) { inside += a; tot++; }
            });
            const cov = tot ? inside / tot : 0;
            surfT.material.opacity = 0.55 * cov * (1 - 1 / st.kappa) * 1.6; surfB.material.opacity = surfT.material.opacity;
            lSt.show(cov > 0.5); lSb.show(cov > 0.5);
            lSl.show(true);
          }
        },
        sync() {},
      };
    },
  });
})();
