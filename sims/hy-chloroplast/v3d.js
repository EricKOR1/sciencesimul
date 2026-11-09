/* hy-chloroplast · 진짜 3D 엽록체 (단면 · 그라나 · 스트로마 틸라코이드 · ATP 합성 효소)
   2D 차시의 '3D 단면 모형'과 같은 이름·색·치수 (외막 120×58×58, 내막 90 %, 그라나 6개, 스트로마 틸라코이드 6줄). */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const narrow = window.innerWidth < 600 || window.innerHeight > window.innerWidth * 1.1;
  const CA = 1.2, CB = 0.58, CC = 0.58, KI = 0.9;      // 외막 반축, 내막 비율
  const DS = 0.086, DR = 0.135, DT = 0.052;            // 틸라코이드 판의 간격 · 반지름 · 두께
  const GR = [[-0.72, -0.04, 0.08, 5], [-0.38, 0.04, -0.16, 6], [-0.04, -0.02, 0.17, 5], [0.30, 0.05, -0.12, 6], [0.62, -0.03, 0.10, 4], [-0.08, 0, -0.27, 4]];
  const LAM = [[0, 1], [1, 2], [2, 3], [3, 4], [1, 5], [5, 3]];
  const STA = [[-0.94, 0, 0, 0.07], [0.86, 0.02, -0.06, 0.08], [0.14, -0.34, -0.04, 0.09]];
  const DNAC = [-0.30, -0.33, 0.02];
  const COL = { outer: 0xa8561f, inner: 0xc2255c, stroma: 0x65a30d, granum: 0x15803d, lamella: 0x0d9488, lumen: 0xca8a04, starch: 0x64748b, dna: 0x2563eb, ribo: 0x7c3aed };
  const hex = (n) => '#' + n.toString(16).padStart(6, '0');
  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  const reduce = () => !!(window.SciSim && window.SciSim.reduceMotion);

  window.SciSim3D.attach({
    title: '엽록체 3D 단면',
    label: '🧊 3D 입체',
    hint: '드래그: 돌리기 · 두 손가락/휠: 확대',
    camera: { dist: narrow ? 3.9 : 2.85, target: narrow ? [0, 0.25, 0] : [0, 0, 0], theta: 0.38, phi: 1.42, min: 2, max: 9 },
    autoRotate: 0,
    levels: [0],   // 1단계(모형 조립 · 단면 이름: 3D 막대의 부품 · 자리 단추와 핀). 2단계(색소 분리) · 3단계(2D 단면 핀 · 흡수 스펙트럼) · 4단계(추론)는 2D 화면이에요
    build(ctx) {
      /* 3D 화면 위 작은 판(기록표 · 카드 등): 2D 캔버스에만 그려지던 것을 3D 단계에서도 보이게 해요 */
      function v3pan(cls) {
        if (!document.getElementById('v3pan-css')) { const s = document.createElement('style'); s.id = 'v3pan-css'; s.textContent =
          '.v3pan{position:absolute;z-index:2;padding:6px 9px;border-radius:12px;background:rgba(8,12,24,.8);border:1px solid rgba(255,255,255,.16);color:#fff;font-size:12px;font-weight:700;line-height:1.35;pointer-events:none;max-width:48%}' +
          '.v3pan:empty{display:none}.v3pan.tr{right:10px;top:10px}.v3pan.bl{left:10px;bottom:10px}.v3pan .h{font-weight:900;margin-bottom:3px;font-size:12.5px}.v3pan .chip{display:inline-block;margin:1px 2px;padding:0 6px;border-radius:7px;background:rgba(255,255,255,.16);color:#eef3ff}.v3pan .chip.sel{background:#ffd34d;color:#1b2333}.v3pan.card{background:#fffdf7;color:#1b2333;border-top:5px solid var(--kc,#ffd34d);white-space:normal;max-width:min(260px,46%)}.v3pan.card .s{font-size:11.5px;font-weight:600;color:#475569}' +
          '.v3pan table{border-collapse:collapse}.v3pan th,.v3pan td{padding:1px 5px;text-align:center;white-space:nowrap}.v3pan th{color:#b9c6e4;text-align:left;font-weight:800}.v3pan td.e{color:#56658a}.v3pan .ok{color:#7ee2a8}.v3pan .hi{color:#ffd34d}' +
          '@media (max-width:599px){.v3pan{font-size:10.5px;padding:4px 6px;max-width:58%}.v3pan.tr{top:auto;bottom:30px;right:8px}.v3pan.bl{left:8px;bottom:8px;max-width:42%}.v3pan th,.v3pan td{padding:0 3px}.v3pan .h{font-size:11px}}';
          document.head.appendChild(s); }
        const el = document.createElement('div'); el.className = 'v3pan ' + (cls || 'tr'); ctx.renderer.domElement.parentElement.appendChild(el);
        let last = ''; el.put = (html) => { if (html !== last) { last = html; el.innerHTML = html; } }; return el;
      }
      const { THREE, root, label, info, controls, renderer } = ctx;
      renderer.localClippingEnabled = true;
      if (narrow) root.rotation.z = Math.PI / 2;
      const V = THREE.Vector3;
      const plane = new THREE.Plane(new V(0, 0, -1), 0.62);        // z > c 는 잘려요
      const planes = [plane];
      let mode = 'name', cut = 0.7;
      const R = rng(58);
      const mats = [];
      function M(color, o) { const m = new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.55, metalness: 0.02, clippingPlanes: planes }, o || {})); mats.push(m); return m; }
      function glass(color, opa, o) { return M(color, Object.assign({ transparent: true, opacity: opa, side: THREE.DoubleSide, depthWrite: false, roughness: 0.8 }, o || {})); }
      function ell(k, color, opa, order) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(1, 56, 36), glass(color, opa)); m.scale.set(CA * k, CB * k, CC * k); m.renderOrder = order; root.add(m); return m;
      }

      /* 막과 스트로마 */
      ell(KI * 0.995, 0x9fd04a, 0.26, 1);
      ell(KI, COL.inner, 0.14, 2);
      ell(1, 0xd8924f, 0.2, 3);
      const rimG = new THREE.Group(); root.add(rimG);
      const rimM = { o: new THREE.MeshStandardMaterial({ color: 0x7a3a12, roughness: 0.5 }), i: new THREE.MeshStandardMaterial({ color: 0xe0407a, roughness: 0.5 }) };
      function rim(k, c, rad, mat) {
        const f = 1 - (c / (CC * k)) ** 2; if (f <= 0.01) return null;
        const a = CA * k * Math.sqrt(f), b = CB * k * Math.sqrt(f), pts = [];
        for (let i = 0; i < 80; i++) { const t = (i / 80) * Math.PI * 2; pts.push(new V(a * Math.cos(t), b * Math.sin(t), c)); }
        return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 120, rad, 6, true), mat);
      }
      function rebuildRim() {
        while (rimG.children.length) { const o = rimG.children.pop(); o.geometry.dispose(); }
        const c = plane.constant, a = rim(1, c, 0.014, rimM.o), b = rim(KI, c, 0.011, rimM.i);
        if (a) rimG.add(a); if (b) rimG.add(b);
      }

      /* 그라나 (틸라코이드 판을 쌓은 것) · 틸라코이드 내부 */
      const gDisc = new THREE.CylinderGeometry(DR, DR, DT, 36), gLum = new THREE.CylinderGeometry(DR * 0.9, DR * 0.9, DT * 0.5, 30);
      const mDisc = M(COL.granum, { roughness: 0.5, transparent: true, opacity: 0.55, depthWrite: false }), mLum = M(0xfde68a, { roughness: 0.4, emissive: 0x6b4a00, emissiveIntensity: 0.25 });
      const discs = [], stacks = [];
      GR.forEach((g, gi) => {
        const st = [];
        for (let j = 0; j < g[3]; j++) {
          const y = g[1] + (j - (g[3] - 1) / 2) * DS;
          const d = new THREE.Mesh(gDisc, mDisc); d.position.set(g[0], y, g[2]); root.add(d);
          const l = new THREE.Mesh(gLum, mLum); l.position.copy(d.position); root.add(l);
          const o = { x: g[0], y, z: g[2], gi, j }; discs.push(o); st.push(o);
        }
        stacks.push(st);
      });
      /* 스트로마 틸라코이드 (그라나를 잇는 막) */
      const mLam = M(COL.lamella, { roughness: 0.45 }), mLamIn = M(0xfde68a, { emissive: 0x6b4a00, emissiveIntensity: 0.25 });
      LAM.forEach((l) => {
        const a = stacks[l[0]], c = stacks[l[1]];
        const ya = a.reduce((p, q) => (Math.abs(q.y - ((GR[l[0]][1] + GR[l[1]][1]) / 2 + 0.04)) < Math.abs(p.y - ((GR[l[0]][1] + GR[l[1]][1]) / 2 + 0.04)) ? q : p));
        const yc = c.reduce((p, q) => (Math.abs(q.y - ((GR[l[0]][1] + GR[l[1]][1]) / 2 + 0.04)) < Math.abs(q.y - 0 + 0 - ((GR[l[0]][1] + GR[l[1]][1]) / 2 + 0.04)) ? q : p));
        const A = new V(ya.x, ya.y, ya.z), B = new V(yc.x, yc.y, yc.z), d = B.clone().sub(A), len = d.length();
        [[0.03, mLam], [0.014, mLamIn]].forEach(([r, mt]) => {
          const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 12), mt); m.position.copy(A).add(B).multiplyScalar(0.5);
          m.quaternion.setFromUnitVectors(new V(0, 1, 0), d.clone().normalize()); root.add(m);
        });
      });

      /* 녹말 알갱이 · DNA · 리보솜 */
      const mSta = M(0xf1f5f9, { roughness: 0.35 }), starch = [];
      STA.forEach((q) => { const m = new THREE.Mesh(new THREE.SphereGeometry(q[3], 20, 14), mSta); m.position.set(q[0], q[1], q[2]); root.add(m); starch.push({ m, r: q[3] }); });
      const pts = []; for (let j = 0; j < 60; j++) { const f = (j / 60) * Math.PI * 2, r = 0.11 + 0.02 * Math.sin(3 * f); pts.push(new V(DNAC[0] + r * Math.cos(f), DNAC[1] + 0.02 * Math.sin(2 * f), DNAC[2] + r * Math.sin(f))); }
      const dna = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 80, 0.016, 8, true), M(COL.dna, { roughness: 0.4 }));
      dna.rotation.x = 0.0; root.add(dna);
      const gRibo = new THREE.SphereGeometry(0.032, 12, 10), mRibo = M(COL.ribo, { roughness: 0.4 }), ribos = [];
      { const out = [new V(0.48, 0.28, 0.16)]; let guard = 0;
        while (out.length < 12 && guard++ < 600) {
          const X = (R() - 0.5) * 2 * 1.12, Y = (R() - 0.5) * 1.0, Z = (R() - 0.5) * 1.0;
          if ((X / (CA * 0.86)) ** 2 + (Y / (CB * 0.86)) ** 2 + (Z / (CC * 0.86)) ** 2 > 1) continue;
          if (GR.some((g) => Math.hypot(X - g[0], Z - g[2]) < DR + 0.07 && Math.abs(Y - g[1]) < g[3] * DS / 2 + 0.08)) continue;
          if (STA.some((q) => Math.hypot(X - q[0], Y - q[1], Z - q[2]) < q[3] + 0.06)) continue;
          if (Math.hypot(X - DNAC[0], Y - DNAC[1], Z - DNAC[2]) < 0.2) continue;
          if (out.some((q) => q.distanceTo(new V(X, Y, Z)) < 0.17)) continue;
          out.push(new V(X, Y, Z));
        }
        out.forEach((p) => { const m = new THREE.Mesh(gRibo, mRibo); m.position.copy(p); root.add(m); ribos.push(m); }); }

      /* ATP 합성 효소: 틸라코이드 막의 가장자리에 박혀 머리가 스트로마 쪽을 향해요 */
      const gBase = new THREE.CylinderGeometry(0.05, 0.05, 0.03, 14), gStalk = new THREE.CylinderGeometry(0.012, 0.012, 0.075, 8), gHead = new THREE.SphereGeometry(0.052, 16, 12), gRot = new THREE.BoxGeometry(0.014, 0.05, 0.014);
      const mBase = M(0xfde68a), mHead = M(0xfbbf24, { roughness: 0.35 }), mRot = M(0xb45309), mStalk = M(0xd97706);
      const syns = [];
      function addSyn(pos, dir) {
        const g = new THREE.Group(); g.position.copy(pos); g.quaternion.setFromUnitVectors(new V(0, 1, 0), dir); g.scale.setScalar(0.62);
        g.add(new THREE.Mesh(gBase, mBase));
        const s = new THREE.Mesh(gStalk, mStalk); s.position.y = 0.05; g.add(s);
        const h = new THREE.Mesh(gHead, mHead); h.position.y = 0.11; g.add(h);
        const r = new THREE.Mesh(gRot, mRot); g.children[0].add(r);
        root.add(g); const o = { g, pos: pos.clone(), dir: dir.clone(), rot: r, ph: R() * 6, tip: pos.clone().addScaledVector(dir, 0.07) }; syns.push(o); return o;
      }
      stacks.forEach((st) => st.forEach((d) => {
        const n = (R() < 0.45) ? 1 : 0;
        for (let i = 0; i < n; i++) {
          const a = R() * Math.PI * 2, dir = new V(Math.cos(a), 0, Math.sin(a));
          addSyn(new V(d.x + dir.x * DR, d.y, d.z + dir.z * DR), dir);
        }
      }));
      // 이름표용 (잘 보이는 곳)
      const labelSyn = addSyn(new V(-0.38 - 0.0, 0.04 - 0.0, -0.16 + DR), new V(0, 0, 1));
      labelSyn.pos.set(-0.38, 0.04 - DS * 0.5 - 0.0, -0.16 + DR);
      labelSyn.g.position.copy(labelSyn.pos); labelSyn.tip = labelSyn.pos.clone().addScaledVector(labelSyn.dir, 0.07);

      /* 글자 알갱이 · 빛 알갱이 */
      function textTex(text, fg, bg, w, h) {
        const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
        g.fillStyle = bg; g.beginPath(); g.arc(h / 2, h / 2, h / 2 - 2, 0, 7); g.fill();
        if (w > h) { g.fillRect(h / 2, 2, w - h, h - 4); g.beginPath(); g.arc(w - h / 2, h / 2, h / 2 - 2, 0, 7); g.fill(); }
        g.fillStyle = fg; g.font = '800 ' + Math.round(h * 0.5) + 'px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 2);
        return new THREE.CanvasTexture(c);
      }
      const T = { H: textTex('H⁺', '#7c2d12', '#fdba74', 64, 64), ATP: textTex('ATP', '#713f12', '#facc15', 128, 64), CO2: textTex('CO₂', '#0f172a', '#bae6fd', 128, 64), GLU: textTex('포도당', '#14532d', '#bbf7d0', 192, 64), SUN: textTex('☀', '#a16207', '#fef08a', 64, 64) };
      const sprites = (tex, w, h) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, clippingPlanes: planes })); s.scale.set(w, h, 1); root.add(s); return s; };
      const killS = (s) => { root.remove(s); s.material.dispose(); };

      // 틸라코이드 내부의 H⁺ (판 안쪽)
      const hLum = [];
      discs.forEach((d, i) => { if (i % 2 === 0) { const s = sprites(T.H, 0.1, 0.1); hLum.push({ s, d, ox: (R() - 0.5) * 1.3 * DR, oz: (R() - 0.5) * 1.3 * DR, ph: R() * 6 }); } });
      // 빛 (왼쪽 위에서 비스듬히 들어와요)
      const photons = [];
      for (let i = 0; i < 12; i++) { const s = sprites(T.SUN, 0.12, 0.12); photons.push({ s, u: R(), x: -1.3 + R() * 2.6, z: (R() - 0.5) * 1.0 }); }
      const LD = new V(0.35, -1, 0).normalize();
      const beams = new THREE.Group(); root.add(beams); beams.visible = false;
      for (let i = 0; i < 5; i++) {
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.9, 6), new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.45, depthWrite: false, clippingPlanes: planes }));
        b.position.set(-0.75 + i * 0.4 + 0.2, 0.55, -0.25 + (i % 3) * 0.2); b.quaternion.setFromUnitVectors(new V(0, 1, 0), LD.clone().negate()); beams.add(b);
      }

      /* 이름표 */
      const A = (x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); root.add(o); return o; };
      const nameDefs = [
        ['외막', 'outer', [1.02, 0.30, 0]], ['내막', 'inner', [-0.92, 0.27, 0]], ['스트로마', 'stroma', [0.50, -0.33, -0.1]], ['그라나', 'granum', [-0.04, 0.24, 0.17]],
        ['스트로마 틸라코이드', 'lamella', [-0.21, 0.06, 0.0]], ['틸라코이드 내부', 'lumen', [0.62, -0.03, 0.235]], ['녹말 알갱이', 'starch', [0.86, 0.02, -0.06]], ['DNA', 'dna', [-0.30, -0.33, 0.02]], ['리보솜', 'ribo', [0.48, 0.28, 0.16]],
      ];
      const names = nameDefs.map(([t, k, p]) => { const o = A(p[0], p[1], p[2]); const L = label(t, o, { color: hex(COL[k]), size: 12 }); L.pz = p[2]; return L; });
      names[0].off = [0.05, 0.1, 0]; names[1].off = [-0.0, 0.08, 0]; names[5].off = [0.09, 0, 0]; names[3].off = [0, 0.07, 0];
      const synO = A(0, 0, 0), labSyn = label('ATP 합성 효소', synO, { color: '#b45309', size: 12 });
      const labLum = label('H⁺ 쌓임 (틸라코이드 내부)', A(0.62, -0.03, 0.235), { color: '#c2410c', size: 12 });
      const labStr = label('ATP 만들어져요 (스트로마)', A(0.5, -0.36, -0.05), { color: '#4d7c0f', size: 12 });
      const labCo = label('CO₂ → 포도당 (스트로마)', A(0.5, -0.36, -0.05), { color: '#4d7c0f', size: 12 });
      const labSun = label('☀ 빛', A(-0.9, 0.62, 0.0), { color: '#a16207', size: 12 });

      function applyViz() {
        const c = plane.constant, name = mode === 'name';
        names.forEach((L, i) => L.show(name && L.pz < c - 0.02 && asmName(i)));
        asmMarks();
        const vis = labelSyn.pos.z < c - 0.02;
        synO.position.copy(labelSyn.tip);
        labSyn.show(mode === 'light' && vis);
        labLum.show(mode === 'light'); labStr.show(mode === 'light'); labCo.show(mode === 'calvin'); labSun.show(mode === 'light');
        labLum.obj.position.set(0.62, 0.12, 0.2); labStr.obj.position.set(0.3, -0.32, -0.05); labCo.obj.position.set(0.3, -0.32, -0.05); labSun.obj.position.set(-0.95, 0.5, 0.0);
        writeInfo();
      }
      function writeInfo() {
        const ah = asmHtml(); if (ah) { info(ah); return; }
        if (mode === 'name') info('<b>이중막</b>(외막·내막) 안쪽 액체가 <b style="color:#b6e36a">스트로마</b>예요. 스트로마에는 틸라코이드가 동전처럼 쌓인 <b style="color:#4ade80">그라나</b>가 있고, <b style="color:#5eead4">스트로마 틸라코이드</b>가 그라나를 이어요.<br>납작한 주머니 안쪽은 <b style="color:#fcd34d">틸라코이드 내부</b>예요.');
        else if (mode === 'light') info('<b>명반응 (막에서)</b>: 틸라코이드 막의 색소가 <b>빛</b>을 흡수하고 전자가 전달되면서 틸라코이드 <b>내부</b>에 H⁺가 쌓여요.<br>H⁺가 <b style="color:#fbbf24">ATP 합성 효소</b>(머리는 <b>스트로마</b> 쪽)를 지나 나올 때 <b>ATP</b>가 만들어져요.');
        else info('<b>탄소 고정 (스트로마에서)</b>: 스트로마의 <b>효소</b>가 CO₂로 <b>포도당</b>을 만들어요. 명반응에서 만든 ATP를 써요.<br>남는 포도당은 <b>녹말 알갱이</b>로 임시 저장해요.');
      }
      function setCut(v) { cut = v; plane.constant = 0.62 - 0.6 * v; rebuildRim(); applyViz(); }
      /* 단면 정도는 2D 3D 모형 화면(S.b.sT)과 같이 움직여요 */
      const cutR = controls.range('단면', 0, 100, 1, Math.round(cut * 100), (v) => { setCut(v / 100); const L = ctx.lesson(); if (L && L.bCut && L.S.mode === 'build') L.bCut(v / 100); }, (v) => v + ' %');
      let usePlayer = false, accP = 0;
      const segV = controls.segment('보기', [{ value: 'name', label: '구조 이름' }, { value: 'light', label: '명반응(틸라코이드 막)' }, { value: 'calvin', label: '탄소 고정(스트로마)' }], mode, (v) => { mode = v; usePlayer = false; applyViz(); });
      /* ▶ 명반응 → 탄소 고정 한 번 보기 (빛 흡수 → H⁺ 쌓임 → ATP 합성 → CO₂ 고정 → 포도당 · 녹말) */
      let player = null;
      player = controls.player({
        duration: 12, loop: true, autoplay: false, label: '광합성 과정',
        phases: [[0, '빛 흡수'], [0.15, 'H⁺ 쌓임'], [0.3, 'ATP 합성'], [0.5, 'CO₂ 고정'], [0.75, '포도당 · 녹말']],
        onFrame(p) {
          if (p === 0 && !(player && player.playing) && !usePlayer) return;
          usePlayer = true;
          const m = p < 0.5 ? 'light' : 'calvin';
          accP = p < 0.5 ? Math.min(1, p / 0.28) : 0;
          if (m !== mode) { mode = m; segV.set(m); applyViz(); }
        },
      });
      /* ---- 1단계 조립 · 이름 붙이기: 2D의 부품 카드(bPlace) · 단면 핀과 같은 상태 ----
         ? 자리 번호는 부품 순서와 다르게 섞어 두어요. 부품을 고르고(◀ ▶) 자리 단추를 누르면 2D의 bPlace가 판정해요. */
      const MP = [4, 7, 1, 9, 3, 6, 2, 8, 5], CIRC = '123456789';
      const LB = () => { const L = ctx.lesson(); return L && L.S && L.S.mode === 'build' && L.S.b ? L : null; };
      const asmOn = () => { const L = LB(); return !!(L && !L.S.b.nameMode && L.S.b.placed.some((x) => !x)); };
      const pinOn = () => { const L = LB(); return !!(L && L.S.b.nameMode); };
      function asmName(i) { const L = LB(); if (!L) return true; if (L.S.b.nameMode) return false; return !!L.S.b.placed[i]; }
      const qLabs = nameDefs.map((d, i) => { const L = label('? ' + CIRC[MP[i] - 1], A(d[2][0], d[2][1], Math.min(d[2][2], -0.02)), { color: '#b45309', size: 12 }); L.show(false); return L; });
      const PIN = [[0, [1.02, 0.30, -0.03]], [2, [0.50, -0.33, -0.1]], [1, [-0.92, 0.27, -0.03]], [5, [0.30, 0.07, -0.1]], [3, [-0.38, 0.22, -0.1]]];
      const pinLabs = PIN.map((q, k) => { const L = label('핀 ' + '①②③④⑤'[k], A(q[1][0], q[1][1], q[1][2]), { color: '#1d4ed8', size: 12 }); L.show(false); return L; });
      function asmMarks() {
        const L = LB(), on = asmOn(), pn = pinOn();
        qLabs.forEach((q, i) => q.show(on && !L.S.b.placed[i]));
        pinLabs.forEach((q) => q.show(pn));
      }
      function asmHtml() {
        const L = LB(); if (!L) return '';
        if (L.S.b.cmp) return '<b>⚙️ 미토콘드리아와 비교</b><br><b>공통</b>: 이중막(외막 + 내막) · 안쪽에 기질/스트로마 · 고리 DNA와 70S 리보솜으로 일부 단백질을 스스로 만들어요.<br><b>다른 점</b>: 미토콘드리아는 내막이 안으로 접힌 크리스타, 엽록체는 내막과 따로 있는 틸라코이드 막(그라나)이에요.';
        if (pinOn()) return '<b>세로 단면</b> · 핀 ①~⑤가 가리키는 구조의 이름을 오른쪽 목록에서 골라요.<br>이중막(외막 · 내막) · 스트로마 · 틸라코이드 · 그라나의 자리를 살펴봐요.';
        if (!asmOn()) return '';
        const b = L.S.b, n = b.placed.filter(Boolean).length, P = L.PARTS[b.sel];
        return '<b>엽록체 조립 ' + n + ' / 9</b><br>' + (P && !b.placed[b.sel] ? '고른 부품: <b>' + P.name + '</b> · ' + P.clue + '<br>알맞은 <b>?</b> 자리의 번호 단추를 눌러요.' : '<b>부품 ◀ ▶</b>로 부품 카드를 골라요.');
      }
      function pickPart(d) {
        const L = LB(); if (!L) return; const b = L.S.b, ts = b.tok.filter((t) => !b.placed[t.pi]); if (!ts.length) return;
        let k = ts.findIndex((t) => t.pi === b.sel); k = k < 0 ? (d > 0 ? 0 : ts.length - 1) : (k + d + ts.length) % ts.length;
        b.sel = ts[k].pi; asmSig = '';
      }
      function putPart(i) {
        const L = LB(); if (!L || !L.bPlace) return; const b = L.S.b;
        if (b.sel < 0 || b.placed[b.sel]) { pickPart(1); }
        const t = b.tok.find((q) => q.pi === b.sel); if (!t) return;
        const ok = L.bPlace(t, i);
        if (ok) { const ts = b.tok.filter((q) => !b.placed[q.pi]); b.sel = ts.length ? ts[0].pi : -1; }
        else b.sel = t.pi;
        asmSig = '';
      }
      const ctlBox = renderer.domElement.closest('.v3-wrap').querySelector('.v3-ctl'), nA0 = ctlBox.children.length;
      controls.text('<b>부품</b>'); controls.button('◀', () => pickPart(-1)); controls.button('▶', () => pickPart(1)); controls.text('<b>자리</b>');
      const slotBtn = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => { const i = MP.indexOf(k); const bt = controls.button('? ' + CIRC[k - 1], () => putPart(i)); return { bt, i }; });
      const asmEls = Array.prototype.slice.call(ctlBox.children, nA0);
      let asmSig = null;
      function asmTick() {
        const L = LB(), b = L && L.S.b, sg = !L ? 'x' : (b.nameMode ? 'n' : 'a') + b.placed.map((x) => (x ? 1 : 0)).join('') + b.sel + (b.cmp ? 'c' : '');
        if (sg === asmSig) return; asmSig = sg;
        const on = asmOn();
        asmEls.forEach((e) => { e.style.display = on ? '' : 'none'; });
        if (on) slotBtn.forEach((q) => { q.bt.style.display = b.placed[q.i] ? 'none' : ''; });
        applyViz();
      }
      /* 부품 카드: 고른 부품 카드와 남은 · 놓은 부품을 3D 화면에도 보여 줘요 (2D의 부품 카드 줄과 같아요) */
      const cardP = v3pan('bl card'), trayP = v3pan('tr');
      function drawParts() {
        const L = LB(), on = asmOn(); if (!L || !on) { cardP.put(''); trayP.put(''); return; }
        const b = L.S.b, P = L.PARTS[b.sel];
        if (P) cardP.style.setProperty('--kc', P.col || '#ffd34d');
        cardP.put(P && !b.placed[b.sel] ? '<div class="h">🧩 ' + P.name + '</div><div class="s">' + P.clue + '</div><div class="s">→ 알맞은 <b>?</b> 자리 단추를 눌러요</div>' : '');
        trayP.put('<div class="h">🧩 부품 카드 ' + b.placed.filter(Boolean).length + ' / ' + b.placed.length + '</div>' + b.tok.map((t) => { const q = L.PARTS[t.pi]; return '<span class="chip' + (t.pi === b.sel && !b.placed[t.pi] ? ' sel' : '') + '">' + (b.placed[t.pi] ? '✅ ' : '') + q.name + '</span>'; }).join(''));
      }
      setCut(cut);
      let lastMode2d = null, lastSt = null, lastTh = null;
      function poll() {
        const L = ctx.lesson(); if (!L || !L.S) return;
        const m = L.S.mode;
        if (m !== lastMode2d) {          // 2D 화면이 바뀌면 같은 내용으로: 3D 모형 → 구조 이름, 구조와 기능 → 명반응(막)
          lastMode2d = m;
          const nm = m === 'func' ? 'light' : m === 'build' ? 'name' : null;
          if (nm && nm !== mode) { mode = nm; usePlayer = false; segV.set(nm); applyViz(); }
        }
        if (m === 'build' && L.S.b && L.S.b.th !== lastTh) { if (lastTh != null && ctx.orbit) ctx.orbit.theta = L.S.b.th + 0.03; lastTh = L.S.b.th; }   // 🔄 한 바퀴 · ↺ 정면
        asmTick(); drawParts();
        if (m === 'build' && L.S.b && L.S.b.sT !== lastSt) { lastSt = L.S.b.sT; if (Math.abs(L.S.b.sT - cut) > 1e-3) { cutR.set(Math.round(L.S.b.sT * 100)); setCut(L.S.b.sT); } }
      }

      /* 움직임 */
      const toks = [], atps = [], cos = [], glus = [];
      let sp1 = 0, sp2 = 0, sp3 = 0, acc = 0;
      return {
        sync() { poll(); },
        update(dt, t) {
          poll();
          const c = plane.constant, slow = reduce() ? 0.2 : 1, light = mode === 'light', calvin = mode === 'calvin';
          beams.visible = light;
          acc = usePlayer ? accP : light ? Math.min(1, acc + dt * 0.5) : Math.max(0, acc - dt * 0.8);
          // 빛 알갱이
          photons.forEach((p, i) => {
            const on = light;
            p.u += dt * 0.28 * slow; if (p.u > 1) { p.u = 0; p.x = -1.3 + R() * 2.6; p.z = (R() - 0.5) * 1.0; }
            p.s.position.set(p.x + LD.x * (p.u * 1.7), 0.85 + LD.y * (p.u * 1.7), p.z);
            p.s.material.opacity = on ? Math.min(1, p.u * 6) * Math.max(0, 1 - Math.max(0, p.u - 0.8) * 5) : 0;
            p.s.visible = on && p.s.position.z < c && p.s.position.y > -0.55;
          });
          // 틸라코이드 내부의 H⁺ : 빛이 있으면 점점 많아져요
          hLum.forEach((h, i) => {
            const thr = i / hLum.length, a = light ? Math.max(0, Math.min(1, (acc * 1.25 - thr * 0.9) * 3)) : 0;
            h.s.position.set(h.d.x + h.ox + 0.01 * Math.sin(t * 2 + h.ph), h.d.y, h.d.z + h.oz + 0.01 * Math.cos(t * 1.7 + h.ph));
            h.s.material.opacity = a; h.s.visible = a > 0.02 && h.s.position.z < c;
          });
          // H⁺가 ATP 합성 효소로 나와 ATP 만들기
          if (light && acc > 0.5) {
            sp1 -= dt;
            const vs = syns.filter((q) => q.pos.z < c - 0.1);
            if (sp1 <= 0 && vs.length) { sp1 = 0.5 + R() * 0.4; const q = vs[(R() * vs.length) | 0]; toks.push({ q, t: 0, s: sprites(T.H, 0.085, 0.085) }); }
          }
          for (let i = toks.length - 1; i >= 0; i--) {
            const k = toks[i]; k.t += dt * 0.9;
            const a = k.q.pos.clone().addScaledVector(k.q.dir, -0.1), b = k.q.pos.clone().addScaledVector(k.q.dir, 0.22);
            k.s.position.copy(a).lerp(b, k.t); k.s.material.opacity = k.t > 0.8 ? Math.max(0, 1 - (k.t - 0.8) / 0.2) : 1; k.s.visible = k.s.position.z < c;
            if (k.t >= 1) { const s = sprites(T.ATP, 0.2, 0.1); s.position.copy(k.q.tip).addScaledVector(k.q.dir, 0.12); atps.push({ s, t: 0, d: k.q.dir.clone(), life: 1.4 }); killS(k.s); toks.splice(i, 1); }
          }
          // 탄소 고정 : ATP 가 스트로마로, CO₂ 가 들어와 포도당 → 녹말
          if (calvin) {
            sp2 -= dt; sp3 -= dt;
            if (sp2 <= 0 && cos.length < 5) { sp2 = 0.8 + R(); const s = sprites(T.CO2, 0.16, 0.08); const p0 = new V(-0.2 + R() * 0.8, 0.3, -0.25 + R() * 0.3); cos.push({ s, p0, p1: new V(p0.x + (R() - 0.5) * 0.3, -0.18 + R() * 0.1, p0.z), t: 0 }); }
            if (sp3 <= 0 && glus.length < 3) { sp3 = 2.2 + R() * 1.5; const q = starch[(R() * starch.length) | 0]; const s = sprites(T.GLU, 0.22, 0.075); glus.push({ s, from: new V(0.3, -0.2, -0.05), to: q.m.position.clone(), st: q, t: 0 }); }
          }
          for (let i = cos.length - 1; i >= 0; i--) { const k = cos[i]; k.t += dt * 0.35; k.s.position.copy(k.p0).lerp(k.p1, Math.min(1, k.t)); k.s.material.opacity = k.t < 0.15 ? k.t / 0.15 : (k.t > 0.85 ? Math.max(0, (1 - k.t) / 0.15) : 1); k.s.visible = k.s.position.z < c; if (k.t >= 1 || !calvin) { killS(k.s); cos.splice(i, 1); } }
          for (let i = glus.length - 1; i >= 0; i--) {
            const k = glus[i]; k.t += dt * 0.28; k.s.position.copy(k.from).lerp(k.to, Math.min(1, k.t)); k.s.material.opacity = k.t > 0.88 ? Math.max(0, (1 - k.t) / 0.12) : 1; k.s.visible = k.s.position.z < c;
            if (k.t >= 1 || !calvin) { if (k.t >= 1) { k.st.m.scale.setScalar(Math.min(1.35, k.st.m.scale.x + 0.05)); } killS(k.s); glus.splice(i, 1); }
          }
          for (let i = atps.length - 1; i >= 0; i--) {
            const a = atps[i]; a.t += dt / a.life; a.s.position.addScaledVector(a.d, dt * 0.12); a.s.position.y -= dt * 0.04;
            a.s.material.opacity = Math.max(0, 1 - a.t * a.t); a.s.visible = a.s.position.z < c;
            if (a.t >= 1) { killS(a.s); atps.splice(i, 1); }
          }
          // 녹말 알갱이는 탄소 고정 화면이 아니면 천천히 원래 크기로
          if (!calvin) starch.forEach((q) => { const sc = q.m.scale.x; if (sc > 1.0) q.m.scale.setScalar(Math.max(1, sc - dt * 0.05)); });
          const w = light && acc > 0.4 ? 6 : 0;
          syns.forEach((q) => { q.ph += w * dt; q.rot.rotation.y = q.ph; });
        },
      };
    },
  });
})();
