/* hq-transformer · 3D 변압기 (철심 · 1차 코일 · 2차 코일 · 철심 속 선속)
   교류 → 1차 코일의 전류가 변해 철심의 선속이 변하고, 2차 코일에 전압이 유도돼요. V₁ : V₂ = N₁ : N₂. 직류는 선속이 변하지 않아 유도 전압이 0이에요. */
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
  const COPPER = 0xe39a45, COIL2 = 0x3ec9b6;

  window.SciSim3D.attach({
    title: '변압기 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: 13.5 * KD, theta: 0.4, phi: 1.22, min: 6, max: 28 },
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, controls } = ctx;
      const h = H3(ctx); const { V3, mat, glass, anchor, sphere, box, cyl, tube, grab, mkArrow, setArrow, mkSeg, setSeg, showCtl } = h;
      const labs = {}; const L = (sc, text, obj, o) => { const l = label(text, obj, o); const raw = l.set; let last = text; l.set = (t) => { if (t !== last) { last = t; raw(t); } }; (labs[sc] = labs[sc] || []).push(l); return l; };
      let lastInfo = ''; const info = (hh) => { if (hh !== lastInfo) { lastInfo = hh; ctx.info(hh); } };
      const lessonS = () => (window.__sim && window.__sim.S) || null;
      const st = { N1: 4, N2: 8, ac: true, sw: false, T1: 0, T2: 0 };
      const turnsOf = (N) => Math.max(2, Math.round(2 + 10 * Math.sqrt(N / 1000)));
      const CX = 2.4, CYh = 2.0, TH = 1.0;                                 // 철심 중심선 사각형의 반폭 · 반높이 · 굵기
      const coreMat = mat(0x8e9bb0, { metalness: 0.85, roughness: 0.32, emissive: 0x4f8cff, emissiveIntensity: 0 });
      const mk = (w, hh, d, x, y) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), coreMat); m.position.set(x, y, 0); root.add(m); return m; };
      mk(2 * CX + TH, TH, TH, 0, CYh); mk(2 * CX + TH, TH, TH, 0, -CYh); mk(TH, 2 * CYh + TH, TH, -CX, 0); mk(TH, 2 * CYh + TH, TH, CX, 0);
      /* 코일 */
      const coils = [null, null];
      function helix(cx, color, n) {
        const pts = [], seg = 36, R = 0.82, H = 3.0;
        for (let i = 0; i <= n * seg; i++) { const s = i / seg, a = s * Math.PI * 2; pts.push(new V3(cx + R * Math.cos(a), -H / 2 + H * s / n, R * Math.sin(a))); }
        const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n * seg * 2, 0.07, 8, false), mat(color, { metalness: 0.5, roughness: 0.35 }));
        m.userData.ends = [pts[0], pts[pts.length - 1]]; return m;
      }
      function build(i) {
        if (coils[i]) { root.remove(coils[i]); coils[i].geometry.dispose(); }
        coils[i] = helix(i === 0 ? -CX : CX, i === 0 ? COPPER : COIL2, i === 0 ? st.N1 : st.N2); root.add(coils[i]);
      }
      build(0); build(1);
      /* 전원 · 전구 · 도선 */
      const src = new THREE.Group(); const srcBox = box(1.6, 0.9, 0.9, 0x374151, { roughness: 0.5 }); src.add(srcBox);
      const srcFace = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.55), h.basic(0x0f172a)); srcFace.position.z = 0.46; src.add(srcFace);
      const wavePts = []; for (let i = 0; i <= 30; i++) wavePts.push(new V3(-0.55 + 1.1 * i / 30, 0.18 * Math.sin(i / 30 * Math.PI * 2), 0.47));
      const wave = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(wavePts), 40, 0.02, 6, false), h.basic(0x7dd3fc)); src.add(wave);
      const wavePts2 = [new V3(-0.55, 0, 0.47), new V3(0.55, 0, 0.47)];
      const flat = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(wavePts2), 2, 0.02, 6, false), h.basic(0x7dd3fc));
      src.add(flat); src.position.set(-CX - 2.0, -3.7, 0); root.add(src);
      const bulb = sphere(0.55, 0xfff3c4, { roughness: 0.15, emissive: 0xffd24d, emissiveIntensity: 0, transparent: true, opacity: 0.9 });
      const glow = new THREE.Mesh(new THREE.SphereGeometry(1.0, 24, 16), glass(0xffe27a, 0)); bulb.add(glow);
      const foot = cyl(0.3, 0.4, 0.5, 0x6b7280, { metalness: 0.5 }); foot.position.y = -0.7; bulb.add(foot);
      bulb.position.set(CX + 2.8, -3.0, 0); root.add(bulb);
      const wire = (pts, c) => { const m = tube(pts, 0.04, c || COPPER, { mo: { metalness: 0.4 } }); root.add(m); return m; };
      const e0 = coils[0].userData.ends, e1 = coils[1].userData.ends;
      const wires = [];
      function wiring() {
        wires.forEach((w) => { root.remove(w); w.geometry.dispose(); }); wires.length = 0;
        const a = coils[0].userData.ends, b = coils[1].userData.ends;
        wires.push(wire([a[0], new V3(a[0].x - 0.4, -2.4, 0.2), new V3(src.position.x - 0.5, src.position.y + 0.55, 0.2)], COPPER));
        wires.push(wire([a[1], new V3(a[1].x - 0.8, 2.6, 0.2), new V3(-CX - 3.4, 0.5, 0.2), new V3(src.position.x + 0.5, src.position.y + 0.55, 0.2)], COPPER));
        wires.push(wire([b[0], new V3(b[0].x + 0.4, -2.4, 0.2), new V3(bulb.position.x - 0.25, bulb.position.y - 0.6, 0.1)], COIL2));
        wires.push(wire([b[1], new V3(b[1].x + 0.8, 2.6, 0.2), new V3(bulb.position.x + 3.0, 0.3, 0.2), new V3(bulb.position.x + 0.25, bulb.position.y - 0.6, 0.1)], COIL2));
      }
      wiring();
      /* 철심 속 선속 (움직이는 화살촉) */
      const NC = 22, cones = new THREE.InstancedMesh(new THREE.ConeGeometry(0.17, 0.5, 14), mat(0x7fb6ff, { emissive: 0x4f9bff, emissiveIntensity: 0.9, roughness: 0.3 }), NC); root.add(cones);
      const path = [new V3(-CX, -CYh, 0), new V3(CX, -CYh, 0), new V3(CX, CYh, 0), new V3(-CX, CYh, 0)];
      const segLen = [2 * CX, 2 * CYh, 2 * CX, 2 * CYh], PL = segLen.reduce((a, b) => a + b, 0);
      const pP = new V3(), pT = new V3(), Mx = new THREE.Matrix4(), Qq = new THREE.Quaternion(), One = new V3(1, 1, 1);
      function pathAt(u) {
        let d = ((u % 1) + 1) % 1 * PL, i = 0; while (d > segLen[i]) { d -= segLen[i]; i++; }
        const a = path[i], b = path[(i + 1) % 4]; pT.subVectors(b, a).normalize(); pP.copy(a).addScaledVector(pT, d); return i;
      }
      const lP = L('tr', '', anchor(root, -CX - 1.3, 2.4, 0), { color: '#c2410c', size: 13 }), lS = L('tr', '', anchor(root, CX + 1.3, 2.4, 0), { color: '#0f766e', size: 13 });
      const lCore = L('tr', '철심', anchor(root, 0, CYh + 0.75, 0), { color: '#475569', size: 13 });
      const lFlux = L('tr', '철심 속 자기선속', anchor(root, 0, 0.0, 0.6), { color: '#2563eb', size: 12 });
      const lSrc = L('tr', '', src, { color: '#0369a1', size: 12, offset: [0, 0.9, 0] }), lBulb = L('tr', '', bulb, { color: '#a16207', size: 13, offset: [0, 1.3, 0] });
      /* 모형 전체(철심·코일·전원·전구)를 한 묶음으로 보이게/숨기게 해요 */
      const modelObjs = root.children.slice();
      let coilKey = '';
      function setTurns(n1, n2) { if (n1 === st.T1 && n2 === st.T2) return; st.T1 = n1; st.T2 = n2; st.N1 = n1; st.N2 = n2; build(0); build(1); wiring(); }
      setTurns(4, 8);
      function updTr(S, sim) {
        const a = S.a, n1 = sim.TR.n1, n2 = sim.TR.n2, V1 = sim.TR.V1, V2 = V1 * n2 / n1, mk = S.gate === 'mt2';
        setTurns(turnsOf(n1), turnsOf(n2)); st.ac = a.src === 'ac'; st.sw = a.sw;
        lP.set('1차 코일 N₁ = ' + n1 + '회'); lS.set('2차 코일 N₂ = ' + n2 + '회');
        lSrc.set((st.ac ? '교류 ' : '직류 ') + V1 + ' V · 스위치 ' + (a.sw ? '닫힘' : '열림'));
        lBulb.set(st.ac && a.sw ? 'V₂ = ' + V2 + ' V' : 'V₂ = 0 V');
        info(mk ? '<b>변압기</b>: 교류와 직류에서 2차 전구가 어떻게 되는지 비교해 보세요. 직류로 스위치를 켜는 순간과 켜 둔 뒤를 견주어 봐요.' :
          '<b>변압기</b> (N₁ : N₂ = ' + n1 + ' : ' + n2 + ', V₁ = ' + V1 + ' V)<br>' + (a.sw ? (st.ac ? '교류: 선속이 계속 변해서 2차 코일에 전압이 유도돼요. V₂ = V₁ × N₂/N₁ = ' + V2 + ' V (승압)' : '직류: 선속이 변하지 않아 유도 전압이 생기지 않고 전구가 꺼져요.') : '스위치를 켜면 1차 코일에 전류가 흘러요.'));
      }
      function updRatio(S, sim) {
        const r = S.r, V2 = sim.rV2(), I1 = sim.rI1(), mk = S.gate === 'mr2';
        setTurns(turnsOf(r.N1), turnsOf(r.N2)); st.ac = true; st.sw = true;
        lP.set('1차 코일 N₁ = ' + r.N1 + '회'); lS.set('2차 코일 N₂ = ' + r.N2 + '회');
        lSrc.set('교류 V₁ = ' + r.V1 + ' V'); lBulb.set('V₂ = ' + (Math.round(V2 * 100) / 100) + ' V · I₂ = ' + r.I2 + ' A');
        const kind = r.N2 > r.N1 ? '승압' : r.N2 < r.N1 ? '강압' : '같은 전압';
        info('<b>권선비: V₁ : V₂ = N₁ : N₂</b><br>N₁ : N₂ = ' + r.N1 + ' : ' + r.N2 + ' → V₂ = ' + (Math.round(V2 * 100) / 100) + ' V (<b>' + kind + '</b>)<br>이상적인 변압기: V₁I₁ = V₂I₂ → I₁ = ' + (mk ? '?' : (Math.round(I1 * 1000) / 1000) + ' A') + '<br>(그림의 코일 감은 수는 비율을 보기 좋게 줄여 그렸어요)');
      }

      /* ================= 송전 (P = VI, 손실 I²R) ================= */
      const gG = new THREE.Group(); root.add(gG);
      const plant = box(1.8, 1.3, 1.4, 0x64748b, { roughness: 0.6 }); plant.position.set(-8.2, 0.65, 0); gG.add(plant);
      const stack = cyl(0.2, 0.28, 1.6, 0x475569, {}, 16); stack.position.set(-8.7, 2.1, 0); gG.add(stack);
      const city = new THREE.Group(); [[0, 1.0, 0.9], [1.1, 1.8, 0.9], [2.2, 1.3, 0.9], [0.6, 0.9, -1.2], [1.8, 1.5, -1.2]].forEach((b, i) => { const m = box(0.9, b[1], 0.9, [0x94a3b8, 0xa8b3c7, 0x8794ab][i % 3], { roughness: 0.6 }); m.position.set(b[0], b[1] / 2, b[2]); city.add(m); const wnd = box(0.5, 0.1, 0.02, 0xffe27a, { emissive: 0xffd24d, emissiveIntensity: 0.9 }); wnd.position.set(b[0], b[1] * 0.6, b[2] + 0.46); city.add(wnd); }); city.position.set(6.4, 0, 0); gG.add(city);
      const tw1 = box(0.9, 1.0, 0.9, 0x7c8aa0, { metalness: 0.4 }), tw2 = box(0.9, 1.0, 0.9, 0x7c8aa0, { metalness: 0.4 }); tw1.position.set(-6.5, 0.5, 0); tw2.position.set(5.0, 0.5, 0); gG.add(tw1, tw2);
      const pyl = []; for (let i = 0; i < 6; i++) { const x = -4.6 + i * 1.95, g = new THREE.Group(); const m = box(0.14, 3.6, 0.14, 0x64748b, { metalness: 0.5 }); m.position.y = 1.8; const arm = box(1.1, 0.12, 0.12, 0x64748b, { metalness: 0.5 }); arm.position.y = 3.3; g.add(m, arm); g.position.set(x, 0, 0); gG.add(g); pyl.push(g); }
      const lineM = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 10), mat(0x8da2c4, { emissive: 0xff3b1a, emissiveIntensity: 0, roughness: 0.5 })); lineM.rotation.z = Math.PI / 2; lineM.scale.y = 11.4; lineM.position.set(0.3, 3.35, 0); gG.add(lineM);
      const lineGlow = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 11.4, 16), new THREE.MeshBasicMaterial({ color: 0xff5a2a, transparent: true, opacity: 0, depthWrite: false })); lineGlow.rotation.z = Math.PI / 2; lineGlow.position.set(0.3, 3.35, 0); gG.add(lineGlow);
      const NG = 40, gDots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 10, 8), mat(0xffe14d, { emissive: 0xffd400, emissiveIntensity: 0.9 }), NG); gG.add(gDots);
      L('grid', '발전소', anchor(gG, -8.2, 2.2, 0), { color: '#475569', size: 13 }); L('grid', '도시', anchor(gG, 7.2, 2.6, 0), { color: '#475569', size: 13 });
      L('grid', '승압', tw1, { color: '#c2410c', size: 12, offset: [0, 0.9, 0] }); L('grid', '강압', tw2, { color: '#0f766e', size: 12, offset: [0, 0.9, 0] });
      const lGrid = L('grid', '', anchor(gG, 0.3, 4.4, 0), { color: '#a16207', size: 14 }), lHeat = L('grid', '', anchor(gG, 0.3, 2.6, 0), { color: '#b91c1c', size: 13 });
      let gFlow = 0;
      function updGrid(S, sim, dt) {
        const G = sim.GRID, vi = S.g.vi, V = G.volts[vi], I = G.P / V, loss = I * I * G.R, frac = Math.min(1, loss / G.P), mk = S.gate === 'mg2';
        const heat = Math.min(1, Math.pow(frac, 0.5) * 1.4);
        lineM.material.emissiveIntensity = heat * 1.6; lineGlow.material.opacity = heat * 0.55; lineM.material.color.setHex(heat > 0.35 ? 0xd6a58f : 0x8da2c4);
        lGrid.set('송전 전압 ' + V + ' V · 송전 전력 P = ' + G.P + ' W'); lHeat.set(mk ? '선로 손실 ?' : 'I = ' + (Math.round(I * 10) / 10) + ' A · 손실 ' + Math.round(loss) + ' W (' + Math.round(frac * 100) + ' %)');
        const n = Math.max(3, Math.min(NG, Math.round(Math.sqrt(I) * 2.2))), spd = 0.25;
        gFlow = (gFlow + dt * spd) % 1;
        for (let i = 0; i < NG; i++) { if (i >= n) { M4s.makeScale(0, 0, 0); } else { const u = ((i / n + gFlow) % 1); M4s.makeTranslation(-5.4 + 11.4 * u, 3.35 + 0.0, 0.0); } gDots.setMatrixAt(i, M4s); }
        gDots.instanceMatrix.needsUpdate = true;
        info('<b>송전: 고전압으로 손실을 줄여요</b><br>P = VI → 같은 전력(' + G.P + ' W)도 전압이 높으면 전류가 작아요.<br>' + (mk ? '송전 전압 ' + V + ' V → 손실 P손실 = I²R 을 직접 계산해 보세요.' : 'V = ' + V + ' V → I = P/V = ' + (Math.round(I * 100) / 100) + ' A → 손실 P손실 = I²R = ' + Math.round(loss * 10) / 10 + ' W (송전선 저항 R = ' + G.R + ' Ω)<br>전류가 작을수록 선로가 덜 뜨거워요.'));
      }
      const M4s = new THREE.Matrix4();

      /* ================= 인덕터 (자체 유도) ================= */
      const gD = new THREE.Group(); root.add(gD);
      const batt = box(1.0, 1.6, 0.8, 0x374151, { roughness: 0.5 }); batt.position.set(-5.2, 0, 0); gD.add(batt);
      const bPlus = box(0.3, 0.2, 0.3, 0xe2464b, {}); bPlus.position.set(-5.2, 0.9, 0); gD.add(bPlus);
      const coilD = new THREE.Group(); gD.add(coilD); coilD.position.set(-0.2, 0, 0);
      (function () { const pts = [], n = 9, seg = 30, R = 0.9, H = 4.2; for (let i = 0; i <= n * seg; i++) { const s2 = i / seg, a = s2 * Math.PI * 2; pts.push(new V3(-H / 2 + H * s2 / n, R * Math.cos(a), R * Math.sin(a))); } coilD.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n * seg, 0.07, 8, false), mat(COPPER, { metalness: 0.5, roughness: 0.35 }))); }());
      const ironC = cyl(0.62, 0.62, 4.5, 0x8e9bb0, { metalness: 0.85, roughness: 0.3, transparent: true, opacity: 0.95 }); ironC.rotation.z = Math.PI / 2; coilD.add(ironC);
      const swBase = box(1.3, 0.12, 0.5, 0x64748b, {}); swBase.position.set(-3.3, -2.0, 0); gD.add(swBase);
      const swArm = box(1.1, 0.08, 0.1, 0xcbd5e1, { metalness: 0.7 }); swArm.geometry.translate(0.55, 0, 0); swArm.position.set(-3.9, -1.9, 0); gD.add(swArm);
      const bulbD = sphere(0.6, 0xfff3c4, { roughness: 0.15, emissive: 0xffd24d, emissiveIntensity: 0, transparent: true, opacity: 0.92 }); bulbD.position.set(4.4, 0, 0); gD.add(bulbD);
      const spark = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), new THREE.MeshBasicMaterial({ color: 0xfff1a8 })); spark.position.set(-2.8, -1.9, 0); spark.visible = false; gD.add(spark);
      const wr = (pts) => { const m = tube(pts, 0.04, 0xe39a45, { mo: { metalness: 0.4 } }); gD.add(m); return m; };
      wr([new V3(-5.2, 0.9, 0), new V3(-5.2, 2.2, 0), new V3(-2.3, 2.2, 0), new V3(-2.3, 0, 0)]);
      wr([new V3(1.9, 0, 0), new V3(2.6, 2.2, 0), new V3(4.4, 2.2, 0), new V3(4.4, 0.6, 0)]);
      wr([new V3(4.4, -0.6, 0), new V3(4.4, -2.0, 0), new V3(-2.8, -2.0, 0)]);
      wr([new V3(-5.2, -0.9, 0), new V3(-5.2, -2.0, 0), new V3(-4.3, -2.0, 0), new V3(-3.9, -1.9, 0)]);
      const ND = 22, dD = new THREE.InstancedMesh(new THREE.ConeGeometry(0.13, 0.34, 10), mat(0xffe14d, { emissive: 0xffd400, emissiveIntensity: 0.8 }), ND); gD.add(dD);
      const loopD = [new V3(-5.2, 2.2, 0), new V3(-2.3, 2.2, 0), new V3(-2.3, 0, 0), new V3(1.9, 0, 0), new V3(2.6, 2.2, 0), new V3(4.4, 2.2, 0), new V3(4.4, -2.0, 0), new V3(-4.3, -2.0, 0), new V3(-5.2, -2.0, 0), new V3(-5.2, 2.2, 0)];
      const segLD = []; let totLD = 0; for (let i = 0; i < loopD.length - 1; i++) { const d = loopD[i].distanceTo(loopD[i + 1]); segLD.push(d); totLD += d; }
      const L_I = L('ind', '', anchor(gD, -0.2, 1.6, 0), { color: '#a16207', size: 13 }), L_B = L('ind', '전지 12 V', batt, { color: '#475569', size: 12, offset: [0, 1.2, 0] }), L_Co = L('ind', '인덕터 (코일)', coilD, { color: '#b45309', size: 12, offset: [0, 1.4, 0] }), L_Bu = L('ind', '전구', bulbD, { color: '#a16207', size: 12, offset: [0, 1.0, 0] }), L_Sw = L('ind', '스위치', swBase, { color: '#475569', size: 12, offset: [0, -0.5, 0] }), L_Ir = L('ind', '철심', ironC, { color: '#475569', size: 12, offset: [0, 0.2, 0.9] });
      let dFlow = 0;
      function updInd(S, sim, dt) {
        const s = S.i, IND = sim.IND, Iv = Math.max(0, s.I), frac = Math.min(1, Iv / IND.I0);
        ironC.visible = s.core; L_Ir.show(s.core && !!labs.ind.on);
        swArm.rotation.z = s.closed ? 0 : 0.5;
        bulbD.material.emissiveIntensity = Math.min(1.5, (s.glow != null ? s.glow : frac) * 1.6); 
        spark.visible = s.flash > 0.05; spark.scale.setScalar(0.6 + 1.6 * s.flash + 0.3 * Math.sin(performance.now() / 40));
        dFlow = (dFlow + dt * 0.35 * frac) % 1;
        for (let i = 0; i < ND; i++) {
          if (frac < 0.03) { M4s.makeScale(0, 0, 0); dD.setMatrixAt(i, M4s); continue; }
          let d = ((i / ND + dFlow) % 1) * totLD, k = 0; while (d > segLD[k]) { d -= segLD[k]; k++; if (k >= segLD.length) { k = segLD.length - 1; break; } }
          const a = loopD[k], b = loopD[k + 1], dir = b.clone().sub(a).normalize(); const pos = a.clone().addScaledVector(dir, d); const q = new THREE.Quaternion().setFromUnitVectors(h.Yax, dir); M4s.compose(pos, q, new V3(1, 1, 1)); dD.setMatrixAt(i, M4s);
        }
        dD.instanceMatrix.needsUpdate = true;
        L_I.set('I = ' + Iv.toFixed(2) + ' A' + (s.closed ? '' : s.opening ? ' (줄어드는 중)' : ''));
        const mk = S.gate === 'mi2';
        info('<b>인덕터: 전류의 변화를 방해해요</b><br>' + (s.closed ? '스위치를 닫으면 전류가 <b>천천히</b> 늘어요 (자체 유도로 증가를 방해). 철심이 있으면 L이 커서 더 천천히 늘어요.' : s.opening ? '스위치를 열면 전류가 갑자기 줄어들려 하고, 코일이 이를 방해해 큰 유도 기전력(ε = −LΔI/Δt)을 만들어 스파크가 튀어요.' : '스위치가 열려 있어요. 스위치를 닫았다가 열어 보세요.') + '<br>인덕터 L = ' + (s.core ? IND.Lcore : IND.Lair) + ' H (철심 ' + (s.core ? '있음' : '없음') + ')' + (mk ? '' : ' · 코일 전압 ' + (Math.abs(s.vL) < 0.5 ? '0' : s.vL.toFixed(0)) + ' V'));
      }

      /* ================= 장면 · 2D 상태 따라가기 ================= */
      let lastSc = '', lastFlux = 0, phaseT = 0;
      function show(sc) {
        const tr = sc === 'tr' || sc === 'ratio';
        modelObjs.forEach((o) => { o.visible = tr; }); cones.visible = tr; coils.forEach((c) => c && (c.visible = tr)); wires.forEach((w) => (w.visible = tr)); src.visible = bulb.visible = tr;
        gG.visible = sc === 'grid'; gD.visible = sc === 'ind';
        Object.keys(labs).forEach((k) => { labs[k].on = k === sc || (k === 'tr' && tr); labs[k].forEach((l) => l.show(k === sc || (k === 'tr' && tr))); });
        const o = ctx.orbit; o.tx = o.ty = o.tz = 0; o.theta = 0.4; o.phi = 1.22; o.dist = (sc === 'grid' ? 21 : sc === 'ind' ? 15 : 13.5) * KD; if (sc === 'grid') { o.phi = 1.35; o.ty = 1.4; } if (sc === 'ind') o.phi = 1.35;
      }
      return {
        update(dt, t) {
          dt = Math.min(dt, 0.05);
          const sim = window.__sim; if (!sim) return; const S = sim.S, sc = S.mode;
          if (sc !== lastSc) { lastSc = sc; show(sc); }
          if (sc === 'tr') updTr(S, sim); else if (sc === 'ratio') updRatio(S, sim); else if (sc === 'grid') updGrid(S, sim, dt); else updInd(S, sim, dt);
          if (sc === 'tr' || sc === 'ratio') {
            const a = S.a, V2 = sc === 'tr' ? sim.TR.V1 * sim.TR.n2 / sim.TR.n1 : sim.rV2();
            phaseT += dt; const acOn = sc === 'ratio' || a.src === 'ac';
            const flux = sc === 'ratio' ? Math.sin(phaseT * 3.2) : (a.sw ? (a.src === 'ac' ? -Math.cos(a.phase) : 0.9) : 0);
            const live = sc === 'ratio' || a.sw;
            coreMat.emissiveIntensity = live ? 0.1 + 0.55 * Math.abs(flux) : 0.04;
            const dflux = (flux - lastFlux) / Math.max(dt, 1e-3); lastFlux = flux;
            const dc = !acOn;
            const off = dc ? (t * 0.06) % 1 : 0.07 * flux, dir = dc ? 1 : (Math.sign(dflux) || 1);
            for (let i = 0; i < NC; i++) { pathAt(i / NC + off); Qq.setFromUnitVectors(h.Yax, pT.clone().multiplyScalar(dc ? 1 : dir)); Mx.compose(pP, Qq, One); cones.setMatrixAt(i, Mx); }
            cones.instanceMatrix.needsUpdate = true; cones.visible = live; cones.material.emissiveIntensity = 0.35 + 0.65 * Math.abs(dc ? 1 : flux);
            const lit = sc === 'ratio' ? Math.min(1.25, V2 / 110) : (a.src === 'ac' && a.sw ? (a.lit != null ? a.lit : 1) : 0);
            const b = sc === 'ratio' ? (lit * (0.85 + 0.15 * Math.abs(Math.cos(phaseT * 3.2)))) : lit;
            bulb.material.emissiveIntensity = b * 1.6; glow.material.opacity = Math.min(0.5, b * 0.35);
            wave.visible = acOn; flat.visible = !acOn;
          }
        },
        sync() {},
      };
    },
  });
})();
