/* he-enso · 3D 적도 태평양 단면과 해안 용승
   [워커 순환] 무역풍이 따뜻한 표층수를 서쪽으로 밀어 모으면, 서쪽은 수온 약층이 깊고 비구름이 생기고 동쪽은 찬 물이 올라와요(용승).
   엘니뇨·라니냐에서는 이 구조가 어떻게 달라지는지 입체 단면으로 봐요. (p: -1 라니냐 · 0 정상 · +1 엘니뇨, 수치는 실험의 예시 값)
   [해안 용승] 해안과 나란한 바람 → 에크만 수송으로 표층수가 바다 쪽으로 밀리고 아래의 찬 물이 올라와요.
   2D 실험의 값(S.mode, S.dir, S.ws, S.pW·pS·pT·pR)을 그대로 따라가요. 조작은 2D 옆 조작판에서 하고, ▶는 그 조작판(바람 방향 · 무역풍 세기 · 진행 단계)을 대신 움직여 줘요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const lerp = (a, b, t) => a + (b - a) * t;
  const A = (a, p) => (p <= 0 ? lerp(a[1], a[0], -p) : lerp(a[1], a[2], p));          // [라니냐, 정상, 엘니뇨]
  const TA = { sstW: [29.5, 29.0, 28.5], sstC: [26.0, 27.0, 28.5], sstE: [22.4, 24.0, 26.4], thW: [200, 150, 100], thE: [30, 50, 90], slope: [70, 50, 10], upw: [0.9, 0.6, 0.2], rainX: [0.12, 0.22, 0.62], walk: [1.2, 1.0, 0.5] };
  const XL = 6, ZD = 1.6, SC = 0.0125, YB = -3.1;

  window.SciSim3D.attach({
    title: '적도 태평양 단면 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    levels: [0, 1, 2],
    camera: { dist: PHONE ? 20 : 13.8, theta: 0.42, phi: 1.2, min: 7, max: 30, target: [0, -0.2, 0] },
    autoRotate: 0,
    build(ctx) {
      if (ctx.THREE.ColorManagement) ctx.THREE.ColorManagement.legacyMode = false;     // 색을 보이는 그대로(sRGB) 쓰도록 맞춰요
      const { THREE, root, label, info, controls } = ctx;
      /* ---- 장면 꾸미기 도우미: 나무 · 암석 무늬, 하늘 · 우주 배경, 빛 번짐 (모양만 꾸며요) ---- */
      const FX = (() => {
        const scn = ctx.scene; let sd = 7; const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
        const mk = (w, h, draw, rep) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (rep) t.repeat.set(rep[0], rep[1]); if ('encoding' in t) t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t; };
        const wood = (rep) => mk(256, 256, (g, w, h) => { g.fillStyle = '#b98a58'; g.fillRect(0, 0, w, h); for (let i = 0; i < 80; i++) { const y = rnd() * h; g.strokeStyle = 'rgba(' + (70 + rnd() * 40 | 0) + ',38,12,' + (0.07 + rnd() * 0.15) + ')'; g.lineWidth = 0.6 + rnd() * 2.2; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x * 0.03 + i) * 3 * rnd()); g.stroke(); } g.fillStyle = 'rgba(60,30,10,.18)'; for (let k = 1; k < 4; k++) g.fillRect(0, k * 64, w, 2); }, rep);
        const grain = (rep, amt) => mk(128, 128, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); for (let i = 0; i < 1100; i++) { const v = 150 + rnd() * 80 | 0; g.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',' + (amt || 0.35) + ')'; g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 3, 1 + rnd() * 2.2); } }, rep);
        const dome = (top, mid, bot, stars) => {
          const t = mk(8, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, top); gr.addColorStop(0.5, mid); gr.addColorStop(1, bot); g.fillStyle = gr; g.fillRect(0, 0, w, h); }); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
          const m = new THREE.Mesh(new THREE.SphereGeometry(90, 32, 16), new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, depthWrite: false })); m.renderOrder = -10; m.raycast = () => {}; scn.add(m);
          if (stars) { const pos = []; for (let i = 0; i < stars; i++) { const u = rnd() * 2 - 1, a = rnd() * 6.283, q = Math.sqrt(1 - u * u); pos.push(Math.cos(a) * q * 85, u * 85, Math.sin(a) * q * 85); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); const p = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xcfdcff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.8, depthWrite: false })); p.renderOrder = -9; p.raycast = () => {}; m.add(p); }
          return m;
        };
        const glowTex = (rgb) => mk(128, 128, (g, w, h) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(' + rgb + ',1)'); gr.addColorStop(0.35, 'rgba(' + rgb + ',.35)'); gr.addColorStop(1, 'rgba(' + rgb + ',0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
        const glow = (rgb, size, op) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(rgb), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: op == null ? 0.8 : op })); s.scale.setScalar(size); s.raycast = () => {}; return s; };
        const spiral = (rgb) => mk(256, 256, (g, w, h) => { g.clearRect(0, 0, w, h); const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, 'rgba(255,248,230,1)'); gr.addColorStop(0.12, 'rgba(' + rgb + ',.75)'); gr.addColorStop(0.5, 'rgba(' + rgb + ',.2)'); gr.addColorStop(1, 'rgba(' + rgb + ',0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); for (let arm = 0; arm < 2; arm++) for (let i = 0; i < 260; i++) { const f = i / 260, a = f * 5.2 + arm * Math.PI, r = 14 + f * 108, x = 128 + Math.cos(a) * r + (rnd() - 0.5) * 12 * f, y = 128 + Math.sin(a) * r + (rnd() - 0.5) * 12 * f; g.fillStyle = 'rgba(255,255,255,' + (0.5 * (1 - f) + 0.06) + ')'; g.beginPath(); g.arc(x, y, 1 + rnd() * 2.4 * (1 - f * 0.5), 0, 6.283); g.fill(); } });
        return { rnd, mk, wood, grain, dome, glow, glowTex, spiral };
      })();
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0.02 }, o || {}));
      const walkG = new THREE.Group(), coastG = new THREE.Group(); root.add(walkG, coastG);

      /* ---------- 색 도우미 ---------- */
      const ramp = (T) => { const t = Math.max(0, Math.min(1, (T - 21) / 9)); const a = new THREE.Color(0x3a7bd5), b = new THREE.Color(0xffd166), c = new THREE.Color(0xff5a36); return t < 0.5 ? a.lerp(b, t * 2) : b.lerp(c, (t - 0.5) * 2); };
      function arrow(parent, col, len, rad) {
        const g = new THREE.Group(), m = std(col, { emissive: col, emissiveIntensity: 0.35 });
        const sh = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 1, 12), m), hd = new THREE.Mesh(new THREE.ConeGeometry(rad * 2.4, rad * 5, 16), m);
        g.add(sh, hd); g.userData = { sh, hd, rad, len }; parent.add(g); setArrow(g, len); return g;
      }
      function setArrow(g, len) { const u = g.userData, L = Math.max(0.02, len), hh = u.rad * 5; u.sh.scale.set(1, Math.max(0.01, L - hh), 1); u.sh.position.y = (L - hh) / 2; u.hd.position.y = L - hh / 2; g.visible = len > 0.05; }

      /* ================= 워커 순환 ================= */
      const warmM = new THREE.MeshPhysicalMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.28, clearcoat: 0.6, clearcoatRoughness: 0.25 }), coldM = std(0x143f8c, { roughness: 0.4, map: FX.grain([3, 2], 0.2) });
      FX.dome('#2c6db4', '#7db4e4', '#d3e8f4', 0);
      const warm = new THREE.Mesh(new THREE.BufferGeometry(), warmM), cold = new THREE.Mesh(new THREE.BufferGeometry(), coldM);
      walkG.add(warm, cold);
      const thTube = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: 0xfff3b0 })); walkG.add(thTube);
      const thTube2 = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: 0xfff3b0 })); walkG.add(thTube2);
      /* 바닥판 */
      const base = new THREE.Mesh(new THREE.BoxGeometry(XL * 2 + 0.5, 0.5, ZD * 2 + 0.5), std(0xffffff, { map: FX.wood([3, 0.5]), roughness: 0.55 })); base.position.y = YB - 0.25; base.receiveShadow = true; walkG.add(base);
      /* 유리 수조 틀 + 해수면 반짝임 */
      { const GH = 0.45 - YB, glassBox = new THREE.BoxGeometry(XL * 2, GH, ZD * 2);
        const gl = new THREE.Mesh(glassBox, new THREE.MeshPhysicalMaterial({ color: 0xdff1ff, transparent: true, opacity: 0.07, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide })); gl.position.y = YB + GH / 2; walkG.add(gl);
        const ed = new THREE.LineSegments(new THREE.EdgesGeometry(glassBox), new THREE.LineBasicMaterial({ color: 0xeaf4ff, transparent: true, opacity: 0.8 })); ed.position.copy(gl.position); walkG.add(ed);
        const sun = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 16), new THREE.MeshBasicMaterial({ color: 0xfff1b0 })); sun.position.set(-XL + 1.3, 5.2, -ZD - 1.5); walkG.add(sun); const sg = FX.glow('255,236,160', 5.2, 0.9); sg.position.copy(sun.position); walkG.add(sg); }
      /* 남미 · 인도네시아 육지 (양 끝) */
      [-1, 1].forEach((s) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, ZD * 2), std(s < 0 ? 0x5b8c4a : 0x8a6a45, { roughness: 0.9, map: FX.grain([1, 1], 0.5) })); m.position.set(s * (XL + 0.25), 0.1, 0); walkG.add(m);
        const rockM = std(0xa08a70, { roughness: 0.95, map: FX.grain([1, 1], 0.6) }), snowM = std(0xf4f8fc, { roughness: 0.7 }), treeM = std(s < 0 ? 0x2f7a3c : 0x3b6b34, { roughness: 0.9 }), trunkM = std(0x6b4a2b, { roughness: 0.9 });
        if (s > 0) [[0.2, 0.9, -0.9, 1.5], [0.3, 1.2, 0.1, 2.0], [0.15, 0.8, 1.0, 1.3]].forEach((c) => { const mt = new THREE.Mesh(new THREE.ConeGeometry(c[1], c[3], 8), rockM); mt.position.set(XL + c[0] + 0.1, 0.35 + c[3] / 2, c[2]); walkG.add(mt); const cap = new THREE.Mesh(new THREE.ConeGeometry(c[1] * 0.42, c[3] * 0.32, 8), snowM); cap.position.set(mt.position.x, 0.35 + c[3] * 0.84, c[2]); walkG.add(cap); });
        else [[-0.1, -0.9], [0.15, 0.2], [-0.2, 0.95], [0.1, -0.2]].forEach((c, i) => { const hill = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 8, 0, 6.283, 0, 1.6), treeM); hill.position.set(-XL - 0.25 + c[0], 0.35, c[1]); hill.scale.set(1, 0.8 + 0.3 * (i % 2), 1.2); walkG.add(hill); const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.4, 6), trunkM); tr.position.set(-XL - 0.3 + c[0], 0.6, c[1] + 0.35); walkG.add(tr); const lf = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.35, 8), treeM); lf.position.set(tr.position.x, 0.95, tr.position.z); walkG.add(lf); });
      });
      const ths = (p) => ({ dW: A(TA.thW, p) * SC, dE: A(TA.thE, p) * SC, sl: A(TA.slope, p) * 0.0035 });
      const yTh = (x, q) => -(lerp(q.dW, q.dE, (x + XL) / (2 * XL)));
      const ySf = (x, q) => q.sl * (-x / XL);
      function build(pS, pT) {
        const q = ths(pT), N = 36, top = [], th = [];
        for (let i = 0; i <= N; i++) { const x = -XL + (2 * XL * i) / N; top.push([x, ySf(x, q)]); th.push([x, yTh(x, q) + 0.0]); }
        const sh = new THREE.Shape(); sh.moveTo(top[0][0], top[0][1]); top.forEach((v) => sh.lineTo(v[0], v[1])); for (let i = N; i >= 0; i--) sh.lineTo(th[i][0], th[i][1]); sh.closePath();
        const sh2 = new THREE.Shape(); sh2.moveTo(th[0][0], th[0][1]); th.forEach((v) => sh2.lineTo(v[0], v[1])); sh2.lineTo(XL, YB); sh2.lineTo(-XL, YB); sh2.closePath();
        const ex = { depth: ZD * 2, bevelEnabled: false, steps: 1, curveSegments: 4 };
        const g1 = new THREE.ExtrudeGeometry(sh, ex), g2 = new THREE.ExtrudeGeometry(sh2, ex);
        g1.translate(0, 0, -ZD); g2.translate(0, 0, -ZD);
        const pos = g1.attributes.position, col = new Float32Array(pos.count * 3);
        const sstW = A(TA.sstW, pS), sstC = A(TA.sstC, pS), sstE = A(TA.sstE, pS), c = new THREE.Color();
        for (let i = 0; i < pos.count; i++) { const f = (pos.getX(i) + XL) / (2 * XL), T = f < 0.5 ? lerp(sstW, sstC, f * 2) : lerp(sstC, sstE, (f - 0.5) * 2); c.copy(ramp(T)); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
        g1.setAttribute('color', new THREE.BufferAttribute(col, 3));
        warm.geometry.dispose(); cold.geometry.dispose(); warm.geometry = g1; cold.geometry = g2;
        [thTube, thTube2].forEach((t, k) => { t.geometry.dispose(); t.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(th.map((v) => new THREE.Vector3(v[0], v[1], (k ? -1 : 1) * (ZD + 0.01)))), 40, 0.035, 6, false); });
        return q;
      }
      /* 공기 순환 고리 + 입자 */
      const loopM = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.5 })); walkG.add(loopM);
      const NP = 28, parts = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }), NP); walkG.add(parts);
      const cloudG = new THREE.Group(); walkG.add(cloudG);
      { let s = 3; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
        for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.45 + r() * 0.35, 20, 14), std(0xf6f9fd, { roughness: 1, transparent: true, opacity: 0.95, emissive: 0x9fb4cc, emissiveIntensity: 0.25 })); m.position.set((r() - 0.5) * 2.0, 2.2 + r() * 0.5 + (i % 3) * 0.12, (r() - 0.5) * 2.0); m.scale.y = 0.68; cloudG.add(m); } }
      const NR = 40, rain = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.014, 0.014, 0.4, 5), new THREE.MeshBasicMaterial({ color: 0xaed4ff, transparent: true, opacity: 0.8 }), NR); walkG.add(rain);
      const rseed = []; for (let i = 0; i < NR; i++) rseed.push([Math.random() - 0.5, Math.random() - 0.5, Math.random()]);
      const upA = [0, 1, 2].map((i) => { const a = arrow(walkG, 0x7fd8ff, 1, 0.045); a.position.set(3.7 + i * 0.7 - 0.0, YB + 0.3, (i - 1) * 0.9); return a; });
      const wind = arrow(walkG, 0xffffff, 1.4, 0.055); wind.rotation.z = Math.PI / 2; wind.position.set(2.8, 0.75, ZD + 0.1);       // 무역풍 (동 → 서)
      const w2 = arrow(walkG, 0xffffff, 1.4, 0.055); w2.rotation.z = Math.PI / 2; w2.position.set(2.8, 0.75, -ZD - 0.1);
      const L = {
        w: label('서태평양', [-XL + 0.3, 0.55, ZD], { size: 12 }), e: label('동태평양 (페루 연안)', [XL - 0.2, 0.9, ZD], { size: 12 }),
        th: label('수온 약층', [0, 0, ZD], { size: 12, color: 'rgba(120,90,0,.9)' }), trade: label('무역풍', wind, { size: 12, offset: [-0.2, 0.55, 0] }),
        cloud: label('상승 기류 · 비구름', cloudG, { size: 12, offset: [0, 1.5, 0] }), up: label('용승', upA[1], { size: 12, offset: [0, 0.9, 0], color: 'rgba(15,100,150,.92)' }),
        warmL: label('따뜻한 표층수', [-3.8, -0.15, ZD], { size: 11.5, color: 'rgba(160,50,10,.9)' }), coldL: label('찬 심층수', [0, -2.3, ZD], { size: 11.5, color: 'rgba(20,50,130,.92)' }),
      };
      L.th.obj = [0, -1, ZD];

      /* ================= 해안 용승 ================= */
      const CX = 3.0, CZ = 2.0, CD = 3.0;
      const cWarmM = new THREE.MeshPhysicalMaterial({ color: 0xf0701a, roughness: 0.28, clearcoat: 0.6 }), cColdM = std(0x1747a0, { roughness: 0.4, map: FX.grain([3, 2], 0.2) });
      const cWarm = new THREE.Mesh(new THREE.BufferGeometry(), cWarmM), cCold = new THREE.Mesh(new THREE.BufferGeometry(), cColdM); coastG.add(cWarm, cCold);
      const landSh = new THREE.Shape(); landSh.moveTo(CX, -CD); landSh.lineTo(CX, 0); landSh.lineTo(CX + 2.6, 0.55); landSh.lineTo(CX + 2.8, 0.55); landSh.lineTo(CX + 2.8, -CD); landSh.closePath();
      const land = new THREE.Mesh(new THREE.ExtrudeGeometry(landSh, { depth: CZ * 2, bevelEnabled: false }), std(0xb89463, { roughness: 0.95, map: FX.grain([0.5, 0.5], 0.5) })); land.position.z = -CZ; coastG.add(land);
      { const treeM = std(0x3b7a3c, { roughness: 0.9 }), trunkM = std(0x6b4a2b, { roughness: 0.9 }); [[CX + 0.9, 0.2, -1.2], [CX + 1.5, 0.35, 0.3], [CX + 1.2, 0.3, 1.3], [CX + 2.1, 0.5, -0.4], [CX + 0.6, 0.0, 0.5]].forEach((c) => { const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.45, 6), trunkM); tr.position.set(c[0], c[1] + 0.25, c[2]); coastG.add(tr); const lf = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.6, 8), treeM); lf.position.set(c[0], c[1] + 0.68, c[2]); coastG.add(lf); }); const cs = FX.glow('255,236,160', 3.6, 0.85); cs.position.set(-5.5, 5.2, -2); coastG.add(cs); }
      const cBase = new THREE.Mesh(new THREE.BoxGeometry(XL + CX + 2.9, 0.3, CZ * 2 + 0.2), std(0xffffff, { map: FX.wood([3, 0.5]), roughness: 0.55 })); cBase.position.set((CX + 2.8 - XL) / 2, -CD - 0.15, 0); coastG.add(cBase);
      const wf = (x, u) => { const q = Math.max(0, Math.min(1, (x - (CX - 2.6)) / 2.6)), f = q * q * (3 - 2 * q); return u >= 0 ? 0.8 * (1 - 0.97 * u * f) : 0.8 + (-u) * 1.5 * f; };
      function buildCoast(u) {
        const N = 30, tw = []; for (let i = 0; i <= N; i++) { const x = -XL + (CX + XL) * i / N; tw.push([x, -wf(x, u)]); }
        const s1 = new THREE.Shape(); s1.moveTo(-XL, 0); s1.lineTo(CX, 0); for (let i = N; i >= 0; i--) s1.lineTo(tw[i][0], tw[i][1]); s1.closePath();
        const s2 = new THREE.Shape(); s2.moveTo(tw[0][0], tw[0][1]); tw.forEach((v) => s2.lineTo(v[0], v[1])); s2.lineTo(CX, -CD); s2.lineTo(-XL, -CD); s2.closePath();
        const ex = { depth: CZ * 2, bevelEnabled: false, curveSegments: 4 };
        cWarm.geometry.dispose(); cCold.geometry.dispose(); cWarm.geometry = new THREE.ExtrudeGeometry(s1, ex); cCold.geometry = new THREE.ExtrudeGeometry(s2, ex); cWarm.position.z = cCold.position.z = -CZ;
      }
      const cWind = arrow(coastG, 0xffffff, 2.6, 0.07); cWind.position.set(CX - 1.3, 1.0, -1.9);
      const ek = [0, 1, 2].map((i) => { const a = arrow(coastG, 0xffd166, 1.4, 0.06); a.rotation.z = Math.PI / 2; a.position.set(CX - 0.2, 0.12, -1.2 + i * 1.2); return a; });
      const dv = [0, 1, 2].map((i) => { const a = arrow(coastG, 0x9fe6ff, 1.5, 0.06); a.position.set(CX - 0.9, -2.4, -1.2 + i * 1.2); return a; });
      const deep = arrow(coastG, 0x7fb2ff, 2.0, 0.06); deep.rotation.z = -Math.PI / 2; deep.position.set(-0.6, -2.5, CZ + 0.1);
      const cl = {
        land: label('육지', [CX + 1.4, 0.7, 0], { size: 12 }), wind: label('바람', cWind, { size: 12, offset: [0, 0.4, 0] }), ek: label('표층수 이동', ek[1], { size: 11.5, offset: [-0.6, 0.5, 0] }),
        dv: label('', dv[1], { size: 12, offset: [0, 1.0, 0] }), cold: label('찬 심층수', [-3.4, -2.2, CZ], { size: 11.5, color: 'rgba(20,50,130,.92)' }), warmL: label('따뜻한 표층수', [-3.4, -0.35, CZ], { size: 11.5, color: 'rgba(160,50,10,.9)' }),
      };

      /* ================= 상태 (2D 실험의 값을 그대로 따라가요) · ▶ ================= */
      /* 2D와 같은 값: S.pW(바람) · S.pS(표층 수온) · S.pT(수온 약층) · S.pR(용승·강수·워커 순환) — 진행 단계마다 따로 변해요. 조작은 2D 옆 조작판에서 하고, ▶는 그 조작판을 대신 눌러 줘요 */
      let view = 'walk', pW = 0, pS = 0, pT = 0, pR = 0, uC = 2, lastMode = null, lastCb = -9, infoKey = '', ready = false;
      const rd = () => { try { const s = window.__sim && window.__sim.S; return s || null; } catch (e) { return null; } };
      const NAME_EL = ['정상 상태', '① 무역풍 약화', '② 난수 동쪽으로', '③ 수온 약층 변화', '④ 용승 약화·강수 이동'], NAME_LA = ['정상 상태', '① 무역풍 강화', '② 난수 서쪽에 더 모임', '③ 수온 약층 변화', '④ 용승 강화·강수 서쪽'];
      function setView(v) {
        view = v; walkG.visible = v === 'walk'; coastG.visible = v === 'coast';
        Object.values(L).forEach((l) => l.show(v === 'walk')); Object.values(cl).forEach((l) => l.show(v === 'coast'));
        ctx.orbit.tx = v === 'walk' ? 0 : -0.8; ctx.orbit.ty = v === 'walk' ? -0.2 : -1.0;
        if (v === 'coast') { ctx.orbit.theta = 0.75; ctx.orbit.phi = 1.15; ctx.orbit.dist = PHONE ? 23 : 15.5; } else { ctx.orbit.theta = 0.42; ctx.orbit.phi = 1.2; ctx.orbit.dist = PHONE ? 20 : 13.8; }
        infoKey = '';
      }
      function updInfo() {
        const S = rd(), l = window.__sim, m = S && S.mode;
        let key, html;
        if (view === 'coast') {
          const dir = S ? S.dir : 'N', ws = S ? S.ws : 2, up = uC > 0.2, dn = uC < -0.2;
          key = 'c' + dir + ws + (up ? 'u' : dn ? 'd' : 'n');
          html = (dir === '0' ? '<b>바람 없음</b>' : '<b>해안을 따라 ' + (dir === 'N' ? '북쪽' : '남쪽') + '으로 · 세기 ' + ws + '</b>') + '<br>' + (up ? '표층수가 바다 쪽으로 밀려 아래의 <b>찬 심층수가 올라와요(용승)</b>. 영양염이 풍부해 좋은 어장이 돼요.' : dn ? '표층수가 해안에 모여 아래로 <b>가라앉아요(침강)</b>. 산소를 심층으로 운반해요.' : '바람이 없으면 표층수가 움직이지 않아요.');
        } else if (m === 'enso') {
          const el = S.sign > 0, st = S.stage || 0;
          key = 'e' + el + st; html = '<b>' + (el ? '엘니뇨' : '라니냐') + '</b> · ' + (el ? NAME_EL : NAME_LA)[st] + '<br>' + (el ? '무역풍이 약해져 서쪽의 따뜻한 해수가 동쪽으로 퍼지고, 동태평양 용승이 약해지고, 비구름이 동쪽으로 와요.' : '무역풍이 강해져 서쪽에 따뜻한 해수가 더 모이고, 동태평양 용승이 강해져요.');
        } else {
          const mm = l && l.mv ? l.mv() : null;
          key = 'n' + (mm ? mm.pct + '|' + Math.round(mm.thW) + '|' + Math.round(mm.thE) : '');
          html = mm ? '<b>무역풍 평소의 ' + mm.pct + ' %</b><br>수온 약층 깊이 서쪽 약 ' + Math.round(mm.thW) + ' m · 동쪽 약 ' + Math.round(mm.thE) + ' m, 서쪽 해수면이 동쪽보다 약 ' + Math.round(mm.slope) + ' cm 높아요.' : '<b>정상</b>: 무역풍이 따뜻한 물을 서쪽으로 밀어요. 서쪽은 비가 많고, 동쪽은 찬 물이 올라와요.';
        }
        if (key !== infoKey) { infoKey = key; info(html); }
      }
      function readSim() {
        const S = rd(); if (!S) return;
        if (S.mode !== lastMode) { lastMode = S.mode; setView(S.mode === 'coast' ? 'coast' : 'walk'); }
        pW = S.pW || 0; pS = S.pS || 0; pT = S.pT || 0; pR = S.pR || 0; if (typeof S.Us === 'number') uC = S.Us;
      }
      readSim(); if (!rd()) setView('walk');
      /* ▶ : 2D 조작판의 버튼·슬라이더를 대신 움직여 줘요 (바람 방향 · 무역풍 세기 · 진행 단계) */
      const $q = (q) => document.querySelector(q);
      const setRange = (q, v) => { const e = $q(q); if (e && +e.value !== v) { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); } };
      const pctAt = (p) => { const v = p < 0.25 ? 100 + 50 * (p / 0.25) : p < 0.5 ? 150 - 50 * ((p - 0.25) / 0.25) : p < 0.75 ? 100 - 60 * ((p - 0.5) / 0.25) : 40 + 60 * ((p - 0.75) / 0.25); return Math.max(40, Math.min(150, Math.round(v / 10) * 10)); };
      const pl = controls.player({
        duration: 12, loop: true, autoplay: false, label: '재생',
        onFrame(p) {
          if (!ready) return; const S = rd(); if (!S) return;
          if (S.mode === 'coast') { const d = p < 1 / 3 ? 'N' : p < 2 / 3 ? '0' : 'S', b = $q('#wdBtns .opt[data-d="' + d + '"]'); if (S.dir !== d && b) b.click(); }
          else if (S.mode === 'normal') setRange('#sTr', pctAt(p));
          else if (S.mode === 'enso') setRange('#sPh', Math.min(4, Math.floor(p * 5)));
        },
      });
      ready = true;
      const loopPts = (q) => {
        const xu = -XL + 2 * XL * A(TA.rainX, pR), xd = 5.0, xm = (xu + xd) / 2, y0 = 0.45 + q.sl * 0.2;
        return [[xd, y0], [xm, y0 - 0.08], [xu + 0.25, y0], [xu - 0.05, 1.5], [xu, 2.75], [xm, 2.95], [xd, 2.75], [xd + 0.2, 1.5]].map((v) => new THREE.Vector3(v[0], v[1], 0));
      };
      let curve = null, q0 = null, xu = 0;
      const dm = new THREE.Object3D(), tmp = new THREE.Vector3();
      function applyP() {
        q0 = build(pS, pT); const pts = loopPts(q0); curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal'); xu = pts[3].x;
        loopM.geometry.dispose(); loopM.geometry = new THREE.TubeGeometry(curve, 80, 0.035, 6, true);
        cloudG.position.x = xu; cloudG.position.y = 0; L.cloud.obj = cloudG;
        const up = A(TA.upw, pR); upA.forEach((a, i) => setArrow(a, 0.35 + up * 1.4)); const wd = A(TA.walk, pW); setArrow(wind, 0.5 + wd * 1.0); setArrow(w2, 0.5 + wd * 1.0);
        wind.position.x = 2.8 + (0.5 + wd) * 0.5; w2.position.x = wind.position.x;
        L.w.obj = [-XL + 0.3, 0.6, ZD]; L.th.obj = [0, yTh(0, q0) + 0.0, ZD];
      }
      let bS = pS, bT = pT, bR = pR, bW = pW;
      applyP(); updInfo();

      return {
        update(dt, t) {
          readSim();
          if (Math.abs(pS - bS) > 0.003 || Math.abs(pT - bT) > 0.003 || Math.abs(pR - bR) > 0.003 || Math.abs(pW - bW) > 0.003) { bS = pS; bT = pT; bR = pR; bW = pW; applyP(); }
          updInfo();
          if (view === 'walk') {
            const sp = (0.045 + 0.05 * A(TA.walk, pR));
            for (let i = 0; i < NP; i++) { const u = (i / NP + t * sp) % 1; curve.getPointAt(u, tmp); dm.position.copy(tmp); dm.position.z = ((i * 37) % 7 - 3) * 0.3; dm.scale.setScalar(0.8); dm.updateMatrix(); parts.setMatrixAt(i, dm.matrix); }
            parts.instanceMatrix.needsUpdate = true;
            const rn = Math.min(1, 0.4 + A([0.9, 0.7, 0.9], pR)); const nvis = Math.round(NR * rn);
            for (let i = 0; i < NR; i++) { const s = rseed[i], f = (t * 0.9 + s[2]) % 1; dm.position.set(xu + s[0] * 2.0, 2.0 - f * 2.0, s[1] * 2.6); dm.scale.setScalar(i < nvis ? 1 : 0.0001); dm.updateMatrix(); rain.setMatrixAt(i, dm.matrix); }
            rain.instanceMatrix.needsUpdate = true;
            upA.forEach((a, i) => { a.position.y = YB + 0.25 + 0.12 * Math.sin(t * 2 + i); });
          } else {
            const u = uC / 3;
            if (Math.abs(u - lastCb) > 0.004) { lastCb = u; buildCoast(u); }
            const au = Math.abs(uC);
            setArrow(cWind, au > 0.1 ? 0.8 + 0.45 * au : 0); cWind.rotation.x = uC > 0 ? Math.PI / 2 : -Math.PI / 2; cWind.position.z = uC > 0 ? -1.9 : 1.9;
            ek.forEach((a, i) => { setArrow(a, au > 0.1 ? 0.5 + 0.3 * au : 0); a.rotation.z = uC > 0 ? Math.PI / 2 : -Math.PI / 2; a.position.x = uC > 0 ? CX - 0.1 : CX - 1.8; });
            dv.forEach((a, i) => { setArrow(a, au > 0.1 ? 0.5 + 0.25 * au : 0); a.rotation.z = uC > 0 ? 0 : Math.PI; const ph = (t * 0.5 + i * 0.33) % 1; a.position.y = uC > 0 ? -2.6 + ph * 1.2 : -0.3 - ph * 0.5 + 0.9; a.position.x = CX - 0.9; });
            setArrow(deep, uC > 0.1 ? 1.2 + 0.3 * au : 0); deep.position.x = -0.6 + (uC > 0 ? ((t * 0.3) % 1) * 0.6 : 0);
            cl.dv.set(uC > 0.1 ? '용승 ↑ (찬 물)' : uC < -0.1 ? '침강 ↓' : ''); cl.dv.show(au > 0.1); cl.wind.show(au > 0.1); cl.ek.show(au > 0.1); cl.cold.show(true);
          }
        },
        sync() { readSim(); },
      };
    },
  });
})();
