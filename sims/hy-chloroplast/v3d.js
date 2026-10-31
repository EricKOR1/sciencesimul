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
    build(ctx) {
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
        names.forEach((L) => L.show(name && L.pz < c - 0.02));
        const vis = labelSyn.pos.z < c - 0.02;
        synO.position.copy(labelSyn.tip);
        labSyn.show(mode === 'light' && vis);
        labLum.show(mode === 'light'); labStr.show(mode === 'light'); labCo.show(mode === 'calvin'); labSun.show(mode === 'light');
        labLum.obj.position.set(0.62, 0.12, 0.2); labStr.obj.position.set(0.3, -0.32, -0.05); labCo.obj.position.set(0.3, -0.32, -0.05); labSun.obj.position.set(-0.95, 0.5, 0.0);
        writeInfo();
      }
      function writeInfo() {
        if (mode === 'name') info('<b>이중막</b>(외막·내막) 안쪽 액체가 <b style="color:#b6e36a">스트로마</b>예요. 스트로마에는 틸라코이드가 동전처럼 쌓인 <b style="color:#4ade80">그라나</b>가 있고, <b style="color:#5eead4">스트로마 틸라코이드</b>가 그라나를 이어요.<br>납작한 주머니 안쪽은 <b style="color:#fcd34d">틸라코이드 내부</b>예요.');
        else if (mode === 'light') info('<b>명반응 (막에서)</b>: 틸라코이드 막의 색소가 <b>빛</b>을 흡수하고 전자가 전달되면서 틸라코이드 <b>내부</b>에 H⁺가 쌓여요.<br>H⁺가 <b style="color:#fbbf24">ATP 합성 효소</b>(머리는 <b>스트로마</b> 쪽)를 지나 나올 때 <b>ATP</b>가 만들어져요.');
        else info('<b>탄소 고정 (스트로마에서)</b>: 스트로마의 <b>효소</b>가 CO₂로 <b>포도당</b>을 만들어요. 명반응에서 만든 ATP를 써요.<br>남는 포도당은 <b>녹말 알갱이</b>로 임시 저장해요.');
      }
      function setCut(v) { cut = v; plane.constant = 0.62 - 0.6 * v; rebuildRim(); applyViz(); }
      const cutR = controls.range('단면', 0, 100, 1, Math.round(cut * 100), (v) => setCut(v / 100), (v) => v + ' %');
      controls.segment('보기', [{ value: 'name', label: '구조 이름' }, { value: 'light', label: '명반응(막)' }, { value: 'calvin', label: '탄소 고정(스트로마)' }], mode, (v) => { mode = v; applyViz(); });
      setCut(cut);

      /* 움직임 */
      const toks = [], atps = [], cos = [], glus = [];
      let sp1 = 0, sp2 = 0, sp3 = 0, acc = 0;
      return {
        sync() {
          const s = window.__sim && window.__sim.S;
          if (s && s.b && typeof s.b.sT === 'number' && s.b.sT > 0.05) { cutR.set(Math.round(s.b.sT * 100)); setCut(s.b.sT); }
        },
        update(dt, t) {
          const c = plane.constant, slow = reduce() ? 0.2 : 1, light = mode === 'light', calvin = mode === 'calvin';
          beams.visible = light;
          acc = light ? Math.min(1, acc + dt * 0.5) : Math.max(0, acc - dt * 0.8);
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
