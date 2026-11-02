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
  const POS = 0xff5a5f, NEG = 0x4d8dff;
  const MODE2SC = { read: 'dip', equi: 'dip', plates: 'plates', fig: 'same' };

  window.SciSim3D.attach({
    title: '전기력선과 등전위면 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: 14 * KD, theta: 0.35, phi: 1.12, min: 5, max: 28 },
    autoRotate: 0.1,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const h = H3(ctx); const { V3, mat, mkArrow, setArrow, arrowSet, mkSeg, setSeg, anchor, sphere, fib, tube, grab, showCtl, toggleBtn } = h;
      const lessonS = () => (window.__sim && window.__sim.S) || null;
      const S0 = lessonS();
      const st = { sc: S0 ? (MODE2SC[S0.mode] || 'dip') : 'dip', lines: true, equi: true, V: 6, d: 3 };
      const PRES = { single: [[0, 1]], dip: [[-2.2, 1], [2.2, -1]], same: [[-2.2, 1], [2.2, 1]] };
      const gC = new THREE.Group(), gP = new THREE.Group(); root.add(gC, gP);
      const gLines = new THREE.Group(), gEq = new THREE.Group(), gCh = new THREE.Group(); gC.add(gLines, gEq, gCh);

      /* ---------- 점전하들의 전기장 (축 대칭: x축 위에 전하) ---------- */
      let chs = PRES.dip;
      function Efield(x, r) {
        let ex = 0, er = 0;
        chs.forEach((c) => { const dx = x - c[0], r2 = dx * dx + r * r + 1e-6, i3 = c[1] / (r2 * Math.sqrt(r2)); ex += dx * i3; er += r * i3; });
        return [ex, er];
      }
      function trace(x0, r0, sgn) {
        const pts = [[x0, r0]]; let x = x0, r = r0; const hh = 0.07;
        for (let n = 0; n < 700; n++) {
          let [a, b] = Efield(x, r); let m = Math.hypot(a, b); if (m < 1e-9) break; a = sgn * a / m; b = sgn * b / m;
          let [a2, b2] = Efield(x + a * hh / 2, r + b * hh / 2); m = Math.hypot(a2, b2); a2 = sgn * a2 / m; b2 = sgn * b2 / m;
          x += a2 * hh; r += b2 * hh; pts.push([x, r]);
          if (Math.hypot(x, r) > 6.6) break;
          if (chs.some((c) => c[1] * sgn < 0 && Math.hypot(x - c[0], r) < 0.42)) break;
        }
        return pts;
      }
      const lineMat = mat(0xffd25a, { emissive: 0xffb300, emissiveIntensity: 0.55, roughness: 0.4 });
      const coneMat = mat(0xffe9a0, { emissive: 0xffc84d, emissiveIntensity: 0.6, roughness: 0.4 });
      function clear(g) { while (g.children.length) { const o = g.children.pop(); o.traverse((q) => { if (q.geometry) q.geometry.dispose(); }); } }
      function rot(pt, ang) { return new V3(pt[0], pt[1] * Math.cos(ang), pt[1] * Math.sin(ang)); }
      function addLine(g, pts3, sgn, reverse) {
        const sub = pts3.filter((_, i) => i % 3 === 0 || i === pts3.length - 1); if (sub.length < 3) return;
        const curve = new THREE.CatmullRomCurve3(sub);
        g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, Math.min(220, sub.length * 2), 0.028, 6, false), lineMat));
        [0.5].forEach((u) => {
          const p = curve.getPointAt(u), tg = curve.getTangentAt(u);
          const c = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3, 12), coneMat); c.position.copy(p);
          c.quaternion.setFromUnitVectors(h.Yax, tg.multiplyScalar(reverse ? -1 : 1)); g.add(c);
        });
      }
      let planeTex = null, planeMesh = null;
      const shellList = [];
      function makeLines() {
        clear(gLines); clear(gCh);
        // 전하 구
        chs.forEach((c, i) => {
          const m = sphere(0.42, c[1] > 0 ? POS : NEG, { roughness: 0.3, emissive: c[1] > 0 ? POS : NEG, emissiveIntensity: 0.4 }); m.position.set(c[0], 0, 0); gCh.add(m);
        });
        if (st.sc === 'single') {
          fib(26).forEach((dv) => {
            const pts = []; for (let k = 0; k <= 8; k++) pts.push(dv.clone().multiplyScalar(0.45 + k * 0.55));
            const curve = new THREE.CatmullRomCurve3(pts);
            gLines.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.026, 6, false), lineMat));
            [0.38, 0.75].forEach((u) => { const c = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.27, 12), coneMat); c.position.copy(curve.getPointAt(u)); c.quaternion.setFromUnitVectors(h.Yax, dv); gLines.add(c); });
          });
        } else {
          const NS = 6, NR = 6;
          chs.forEach((c) => {
            if (c[1] < 0) return;
            for (let k = 0; k < NS; k++) {
              const a = Math.PI * (k + 0.5) / NS;
              for (let q = 0; q < NR; q++) {
                const ang = (q + (k % 2) * 0.5) / NR * Math.PI * 2;
                const pts = trace(c[0] + 0.42 * Math.cos(a), 0.42 * Math.sin(a), 1);
                addLine(gLines, pts.map((p) => rot(p, ang)), 1, false);
              }
            }
            // 축 위의 선 (양쪽)
            [0, Math.PI].forEach((a) => {
              const tr = trace(c[0] + 0.42 * Math.cos(a), 1e-3, 1);
              if (st.sc === 'same' && Math.cos(a) > 0 && c[0] < 0) return;
              if (st.sc === 'same' && Math.cos(a) < 0 && c[0] > 0) return;
              addLine(gLines, tr.map((p) => new V3(p[0], 0, 0)), 1, false);
            });
          });
        }
      }
      function drawPlane() {
        const W = 480, H = 320, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
        const img = g.createImageData(W, H), Vg = new Float32Array(W * H);
        const dv = 0.4;
        for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
          const x = (i / W - 0.5) * 12, y = (0.5 - j / H) * 8; let v = 0;
          chs.forEach((c) => { v += c[1] / Math.sqrt((x - c[0]) * (x - c[0]) + y * y + 0.05); }); Vg[j * W + i] = v;
        }
        for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
          const v = Vg[j * W + i], o = (j * W + i) * 4, av = Math.min(1, Math.abs(v) / 2.5);
          let r, gg, b, a;
          if (v >= 0) { r = 255; gg = 120; b = 70; } else { r = 70; gg = 130; b = 255; }
          a = 40 + 120 * av;
          const f = Math.floor(v / dv), fr = i + 1 < W ? Math.floor(Vg[j * W + i + 1] / dv) : f, fd = j + 1 < H ? Math.floor(Vg[(j + 1) * W + i] / dv) : f;
          if ((f !== fr || f !== fd) && Math.abs(v) < 3.2) { r = 255; gg = 255; b = 255; a = 235; }
          img.data[o] = r; img.data[o + 1] = gg; img.data[o + 2] = b; img.data[o + 3] = a;
        }
        g.putImageData(img, 0, 0);
        if (!planeTex) { planeTex = new THREE.CanvasTexture(cv); } else { planeTex.image = cv; }
        planeTex.encoding = THREE.sRGBEncoding; planeTex.needsUpdate = true;
        if (!planeMesh) { planeMesh = new THREE.Mesh(new THREE.PlaneGeometry(12, 8), new THREE.MeshBasicMaterial({ map: planeTex, transparent: true, depthWrite: false, side: THREE.DoubleSide })); gEq.add(planeMesh); }
        planeMesh.material.map = planeTex; planeMesh.material.needsUpdate = true;
      }
      const shells = [1.3, 2.4, 3.5].map((r, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 32), h.glass([0xff9a5a, 0xffb77a, 0xffd0a3][i], 0.14)); gEq.add(m); return m; });
      const aSh = anchor(gEq, 0.7, 1.0, 0), lSh = label('등전위면', aSh, { color: '#b45309', size: 12 });
            const lPos = label('+', gCh, { color: '#c0392b', size: 15 }), lNeg = label('−', gCh, { color: '#2f6df6', size: 15 });
      const lpPos = anchor(gC), lpNeg = anchor(gC);
      lPos.obj = lpPos; lNeg.obj = lpNeg;
      // 등전위면 위로 움직이는 시험 전하 (단일 전하일 때)
      const tcS = sphere(0.14, 0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.5 }); gEq.add(tcS);
      const lTc = label('이동해도 일 0', tcS, { color: '#475569', size: 12, offset: [0, 0.4, 0] });

      function setPreset(sc) {
        st.sc = sc; chs = PRES[sc];
        makeLines();
        const pos = chs.filter((c) => c[1] > 0)[0], neg = chs.filter((c) => c[1] < 0)[0];
        lpPos.position.set(pos[0], 0.85, 0); lNeg.show(!!neg); if (neg) lpNeg.position.set(neg[0], 0.85, 0);
        if (sc === 'same') { lpPos.position.set(chs[0][0], 0.85, 0); }
        lPos.set('+'); lNeg.set('−'); lPos.el.style.background = '#c0392b'; lNeg.el.style.background = '#2f6df6';
        if (sc !== 'single') drawPlane();
        applyVis();
      }
      function applyVis() {
        const sp = ['single', 'dip', 'same'].indexOf(st.sc) >= 0;
        gC.visible = sp; gP.visible = !sp;
        gLines.visible = st.lines;
        gEq.visible = st.equi; if (planeMesh) planeMesh.visible = st.sc !== 'single';
        shells.forEach((s) => (s.visible = st.sc === 'single')); tcS.visible = st.sc === 'single';
        lSh.show(sp && st.equi && st.sc === 'single'); lTc.show(sp && st.equi && st.sc === 'single');
        lPos.show(sp); lNeg.show(sp && st.sc === 'dip');
        [lTop, lBot, lEfld].forEach((l) => l.show(!sp)); lq.show(!sp); lEq.forEach((l) => l.show(!sp && st.equi));
        const txt = { single: '<b>점전하</b>: 전기력선은 +에서 사방으로 뻗어요.<br>등전위면은 전하를 중심으로 한 <b>구</b>이고, 전기력선과 늘 수직이에요.<br>구 위에서 전하를 옮길 때 전기력이 하는 일은 0이에요.',
          dip: '<b>+와 − 한 쌍</b>: 전기력선은 +에서 나와 −로 들어가요.<br>흰 선은 같은 전위의 곡선(등전위면의 단면)이에요. 전기력선과 직각으로 만나요.<br>선이 촘촘한 곳일수록 전기장이 세요.',
          same: '<b>같은 부호의 두 전하</b>: 전기력선이 서로 밀어내며 휘어요.<br>두 전하 가운데에서는 전기장이 0이고, 선이 만나지 않아요.<br>멀리서 보면 하나의 큰 전하처럼 보여요.' };
        if (sp) info(txt[st.sc]);
      }

      /* ---------- 평행판 ---------- */
      const topP = h.box(6, 0.14, 6, POS, { roughness: 0.35, metalness: 0.5 }), botP = h.box(6, 0.14, 6, NEG, { roughness: 0.35, metalness: 0.5 }); gP.add(topP, botP);
      const pArr = arrowSet(25, 0.035); gP.add(pArr.group);
      const eqP = [0.25, 0.5, 0.75].map((f, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 5.6), h.glass(0xffb070, 0.16)); m.rotation.x = Math.PI / 2; gP.add(m); return m; });
      const aTop = anchor(gP), aBot = anchor(gP), aEq = [anchor(gP), anchor(gP), anchor(gP)], aSide = anchor(gP);
      const lTop = label('+ 극판', aTop, { color: '#c0392b', size: 13 }), lBot = label('− 극판', aBot, { color: '#2f6df6', size: 13 });
      const lEq = aEq.map((a) => label('', a, { color: '#b45309', size: 12 })); const lEfld = label('균일한 전기장', aSide, { color: '#0f766e', size: 12 });
      const q = sphere(0.22, 0xffd166, { emissive: 0xffb300, emissiveIntensity: 0.5 }); gP.add(q); const lq = label('+q', q, { color: '#a16207', size: 12, offset: [0, 0.4, 0] });
      let qy = 0, qv = 0;
      function updPlates() {
        const d = st.d, V = st.V, E = V / d;
        topP.position.y = d / 2; botP.position.y = -d / 2;
        let k = 0;
        for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++, k++) {
          const len = Math.min(d - 0.35, 0.34 * E + 0.35);
          pArr.set(k, new V3(i * 1.1, d / 2 - 0.12, j * 1.1), new V3(0, -1, 0), len, 0x35d6c0);
        }
        pArr.flush();
        eqP.forEach((m, i) => { const f = [0.25, 0.5, 0.75][i]; m.position.y = d / 2 - f * d; aEq[i].position.set(2.7, d / 2 - f * d, 2.7); lEq[i].set((V * (1 - f)).toFixed(1).replace('.0', '') + ' V'); });
        aTop.position.set(-2.8, d / 2 + 0.3, 2.8); aBot.position.set(-2.8, -d / 2 - 0.3, 2.8); aSide.position.set(0, 0, 3.0);
        lEq.forEach((l, i) => l.show(st.equi && gP.visible)); eqP.forEach((m) => (m.visible = st.equi));
        if (!gP.visible) return;
        info('<b>평행판 사이는 균일한 전기장</b> E = ΔV ÷ d = ' + V + ' ÷ ' + d + ' = <b>' + E.toFixed(1) + '</b><br>등전위면은 판과 나란한 평면이고, 간격이 일정해요.<br>+q는 전기장 방향(위→아래)으로 가속돼요 (일 W = qΔV).');
      }

      /* ---------- 조작 ---------- */
      const seg = controls.segment('보기', [{ value: 'single', label: '＋ 하나' }, { value: 'dip', label: '＋− 한 쌍' }, { value: 'same', label: '＋＋' }, { value: 'plates', label: '🔋 평행판' }], st.sc, (v) => go(v));
      toggleBtn('*', '전기력선', true, (on) => { st.lines = on; applyVis(); });
      toggleBtn('*', '등전위면', true, (on) => { st.equi = on; applyVis(); if (st.sc === 'plates') updPlates(); });
      grab('plates', () => controls.range('전압 V', 2, 12, 1, st.V, (v) => { st.V = v; updPlates(); }, (v) => v + ' V'));
      grab('plates', () => controls.range('판 간격 d', 2, 5, 0.5, st.d, (v) => { st.d = v; qy = 0; qv = 0; updPlates(); }, (v) => v.toFixed(1)));
      function go(sc) {
        seg.set(sc);
        if (sc === 'plates') { st.sc = 'plates'; gC.visible = false; gP.visible = true; applyVis(); updPlates(); qy = 0; qv = 0; ctx.orbit.dist = 15 * KD; ctx.orbit.phi = 1.4; }
        else { setPreset(sc); ctx.orbit.dist = 14 * KD; }
        showCtl(sc === 'plates' ? 'plates' : '__none');
      }
      go(st.sc);
      let lastMode = S0 ? S0.mode : '';
      return {
        update(dt, t) {
          const S = lessonS();
          if (S && S.mode !== lastMode) { lastMode = S.mode; const sc = MODE2SC[S.mode]; if (sc && sc !== st.sc) go(sc); }
          if (st.sc === 'single' && tcS.visible) { const a = t * 0.9; tcS.position.set(2.4 * Math.cos(a) * Math.cos(0.5), 2.4 * Math.sin(0.5), 2.4 * Math.sin(a) * Math.cos(0.5)); }
          if (st.sc === 'plates') {
            const d = st.d, E = st.V / d; qv += E * 2.2 * dt; qy += qv * dt;
            if (qy > d - 0.4) { qy = 0; qv = 0; }
            q.position.set(0, d / 2 - 0.3 - qy, 0); q.visible = true; lq.show(true);
          } else { q.visible = false; lq.show(false); }
        },
        sync() {},
      };
    },
  });
})();
