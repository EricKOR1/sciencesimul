/* hm-ideal-gas · 3D 기체 분자 모형과 이상 기체 법칙
   2D 실험(window.__sim)의 장면을 그대로 입체로 보여 줘요: 🔬 기체 모형(부피 V · 온도 T → 압력 P) · 📟 센서 실험(등온 · 정압 · 정적) · 🧮 PV = nRT.
   분자가 벽(피스톤)에 부딪히는 힘이 압력이에요. 온도는 분자의 평균 운동 에너지에 비례해요. 값은 옆 조작판이 정하고 3D는 따라가요. 🛞 타이어 · 🤿 잠수와 풍선 · 🎈 열기구도 입체로 보여 줘요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches), KD = PHN ? 1.3 : 1;
  const LV = () => (typeof window.SciSimLevel === 'number' ? window.SciSimLevel : 0);
  const TAU = Math.PI * 2, clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  function tools(THREE) {
    const V3 = THREE.Vector3, Y = new V3(0, 1, 0);
    const M = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0.1 }, o || {}));
    const glass = (c, op) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.2, metalness: 0, transparent: true, opacity: op == null ? 0.25 : op, depthWrite: false });
    function mkArrow(col, rad) {
      const g = new THREE.Group(), m = M(col, { roughness: 0.4 });
      const sh = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 1, 12), m), hd = new THREE.Mesh(new THREE.ConeGeometry(rad * 2.6, rad * 6, 16), m);
      g.add(sh, hd); g.userData = { sh, hd, rad }; return g;
    }
    function setArrow(g, a, b) {
      const d = new V3().subVectors(b, a), len = d.length(), { sh, hd, rad } = g.userData;
      if (len < 1e-3) { g.visible = false; return; }
      g.visible = true; const hl = Math.min(len * 0.5, rad * 6);
      sh.scale.y = Math.max(0.001, len - hl); sh.position.y = (len - hl) / 2;
      hd.scale.y = hl / (rad * 6); hd.position.y = len - hl / 2;
      g.position.copy(a); g.quaternion.setFromUnitVectors(Y, d.normalize());
    }
    function tube(pts, r, col, o, closed) {
      const c = new THREE.CatmullRomCurve3(pts, !!closed);
      return new THREE.Mesh(new THREE.TubeGeometry(c, Math.max(24, pts.length * 3), r, 8, !!closed), (o && o.basic) ? new THREE.MeshBasicMaterial({ color: col, transparent: !!o.op, opacity: o.op || 1 }) : M(col, o));
    }
    function disc(r, col, y, op) { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 64), new THREE.MeshStandardMaterial({ color: col, roughness: 0.9, transparent: op != null, opacity: op == null ? 1 : op })); m.rotation.x = -Math.PI / 2; m.position.y = y || 0; m.receiveShadow = true; return m; }
    function grid(w, d, step, col, y, op) {
      const pts = []; for (let x = -w / 2; x <= w / 2 + 1e-6; x += step) pts.push(x, 0, -d / 2, x, 0, d / 2); for (let z = -d / 2; z <= d / 2 + 1e-6; z += step) pts.push(-w / 2, 0, z, w / 2, 0, z);
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: op == null ? 0.3 : op })); l.position.y = y || 0; return l;
    }
    function arc(r, a0, a1, rad, col, n) { // xz 평면 위의 호
      const pts = []; n = n || 40; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; pts.push(new V3(r * Math.cos(a), 0, r * Math.sin(a))); }
      return tube(pts, rad, col);
    }
    return { V3, Y, M, glass, mkArrow, setArrow, tube, disc, grid, arc };
  }
  const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
  window.SciSim3D.attach({
    title: '기체 분자와 압력 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대 · 값은 옆 조작판에서 바꿔요',
    camera: { dist: 12.5 * KD, theta: 0.65, phi: 1.1, min: 5, max: 28, target: [0, 0, 0] },
    autoRotate: 0,
    levels: [0, 1, 2, 3],
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      const { V3, M, mkArrow, setArrow } = tools(THREE);
      const sim = () => ctx.lesson();
      const NMAX = 200, LX = 6, LY = 3.4, LZ = 3.4;
      const pos = new Float32Array(NMAX * 3), vel = new Float32Array(NMAX * 3);
      const im = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 14, 10), M(0xffffff, { roughness: 0.3 }), NMAX); im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(NMAX * 3), 3); im.frustumCulled = false; root.add(im);
      const box = new THREE.Mesh(new THREE.BoxGeometry(1, LY, LZ), new THREE.MeshStandardMaterial({ color: 0x9ec5ff, transparent: true, opacity: 0.1, roughness: 0.1, side: THREE.DoubleSide, depthWrite: false })); root.add(box);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, LY, LZ)), new THREE.LineBasicMaterial({ color: 0xbcd4ff, transparent: true, opacity: 0.6 })); root.add(edges);
      const pis = new THREE.Mesh(new THREE.BoxGeometry(0.22, LY + 0.1, LZ + 0.1), M(0x64748b, { metalness: 0.6 })); root.add(pis);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3, 16), M(0x94a3b8, { metalness: 0.7 })); rod.rotation.z = Math.PI / 2; root.add(rod);
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.1, 1.1), M(0xe2464b)); root.add(handle);
      const gauge = new THREE.Group(); root.add(gauge);
      const gb = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3, 0.3), M(0x334155)); gb.position.y = 1.5; gauge.add(gb);
      const gf = new THREE.Mesh(new THREE.BoxGeometry(0.34, 1, 0.34), M(0xff6b6b, { emissive: 0x7f1d1d })); gauge.add(gf); gauge.position.set(-3.2, -LY / 2, 1.5);
      const lP = label('압력 P', gb, { color: '#e2464b', size: 13 }), lPis = label('피스톤(부피)', pis, { color: '#475569', size: 12 }); lP.off = [0, 1.9, 0]; lPis.off = [0, LY / 2 + 0.4, 0];
      const colS = new THREE.Color(0x60a5fa), colF = new THREE.Color(0xff7b54), tc = new THREE.Color(), m4 = new THREE.Matrix4();
      for (let i = 0; i < NMAX; i++) { pos[i * 3] = (Math.random() - 0.5) * LX * 0.9; pos[i * 3 + 1] = (Math.random() - 0.5) * LY * 0.9; pos[i * 3 + 2] = (Math.random() - 0.5) * LZ * 0.9; const a = Math.random() * 6.283, b = Math.acos(2 * Math.random() - 1); vel[i * 3] = Math.sin(b) * Math.cos(a); vel[i * 3 + 1] = Math.cos(b); vel[i * 3 + 2] = Math.sin(b) * Math.sin(a); }
      let acc = 0, hits = 0, Ps = 0, Pshown = 0, last = '';
      /* ================= 🛞 타이어 · 🤿 잠수와 풍선 · 🎈 열기구 (S.ap) ================= */
      const clk = { t: 0, dt: 0 };
      const gT = new THREE.Group(), gD = new THREE.Group(), gH = new THREE.Group(); root.add(gT, gD, gH);
      const APPG = { tire: gT, dive: gD, hot: gH }, ALAB = { tire: [], dive: [], hot: [] };
      const reg = (k, l) => { ALAB[k].push(l); return l; };
      const hideApp = (A) => !!(!(A.game && A.game.free) && A.S.flags.app);
      const Q0 = new THREE.Quaternion(), vq = new V3(), vs3 = new V3();
      // --- 타이어
      const road = new THREE.Mesh(new THREE.BoxGeometry(12, 0.3, 4), M(0x9aa5b5, { roughness: 0.9 })); road.position.set(0, -0.15, 0); gT.add(road);
      const wheel = new THREE.Group(); wheel.position.y = 2.1; gT.add(wheel);
      const tireM = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.5, 20, 56), M(0x2b3445, { roughness: 0.8 })); wheel.add(tireM);
      const rimM = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.5, 40), M(0xc8d0dc, { metalness: 0.6, roughness: 0.3 })); rimM.rotation.x = Math.PI / 2; wheel.add(rimM);
      for (let i = 0; i < 5; i++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.1, 0.12), M(0x8a95a8)); const a = i * TAU / 5 + 0.3; sp.position.set(Math.cos(a) * 0.6, Math.sin(a) * 0.6, 0.3); sp.rotation.z = a - Math.PI / 2; wheel.add(sp); }
      const NTI = 90, tireAir = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), NTI); tireAir.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(NTI * 3), 3); tireAir.frustumCulled = false; wheel.add(tireAir);
      const tm = []; for (let i = 0; i < NTI; i++) tm.push({ th: Math.random() * TAU, ph: Math.random() * TAU, v: (Math.random() - 0.5) * 2, wp: 1 + Math.random() * 2, r: 0.15 + Math.random() * 0.25 });
      tireM.material.transparent = true; tireM.material.opacity = 0.55; tireM.material.depthWrite = false;
      const dialT = new THREE.Group(); dialT.position.set(4.2, 2.4, 0); gT.add(dialT);
      const dFace = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.2, 40), M(0xf8fafc)); dFace.rotation.x = Math.PI / 2; dialT.add(dFace);
      const dRing = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.08, 10, 40), M(0x334155)); dialT.add(dRing);
      const needle = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.0, 0.06), M(0xe2464b)); needle.geometry.translate(0, 0.5, 0); needle.position.z = 0.15; dialT.add(needle);
      for (let i = 0; i <= 8; i++) { const a = -Math.PI * 0.75 + i * Math.PI * 1.5 / 8, tk = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, 0.04), M(0x334155)); tk.position.set(Math.sin(a) * 1.0, Math.cos(a) * 1.0, 0.12); tk.rotation.z = -a; dialT.add(tk); }
      const thT = new THREE.Group(); thT.position.set(-4.2, 0, 0); gT.add(thT);
      const thTube = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 3.6, 16), new THREE.MeshStandardMaterial({ color: 0xe5e7eb, transparent: true, opacity: 0.5 })); thTube.position.y = 1.9; thT.add(thTube);
      const thHg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1, 12), M(0xe2464b, { emissive: 0x7f1d1d })); thT.add(thHg);
      const thBulb = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 10), M(0xe2464b, { emissive: 0x7f1d1d })); thBulb.position.y = 0.15; thT.add(thBulb);
      const NSN = 60, snow = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }), NSN); snow.frustumCulled = false; gT.add(snow);
      const lTt = reg('tire', label('', thT, { color: '#2563eb', size: 13, offset: [0, 2.3, 0] })), lTg = reg('tire', label('', dialT, { color: '#e2464b', size: 13, offset: [0, -1.7, 0] })), lTp = reg('tire', label('', dialT, { color: '#475569', size: 12, offset: [0, -2.3, 0] })), lTw = reg('tire', label('⚠️ 타이어 경고등', dialT, { color: '#d97706', size: 13, offset: [0, 1.8, 0] })), lTa = reg('tire', label('타이어 안 공기 (부피 일정)', wheel, { color: '#1d4ed8', size: 12, offset: [0, -2.4, 0] }));
      function tireScene(A, S) {
        const a = S.ap, Pabs = A.tireAbs(a.tc), gauge = Pabs - 100, hide = hideApp(A), sq = clamp((220 - gauge) / 120, 0, 0.35), TKt = a.tc + 273;
        wheel.scale.y = 1 - sq * 0.2; wheel.position.y = 2.2 * (1 - sq * 0.2) + 0.0 - 0.1 * 0; wheel.position.y = 2.2 * (1 - sq * 0.2);
        const spd = Math.sqrt(TKt / 300) * 1.4, pr = clamp((Pabs - 150) / 250, 0, 1);
        for (let i = 0; i < NTI; i++) { const m = tm[i]; m.th += m.v * spd * 0.8 * clk.dt; const r = m.r * (0.6 + 0.4 * Math.sin(clk.t * m.wp * spd + m.ph)), ph2 = m.ph + clk.t * m.wp * spd * 0.7, R = 1.7 + r * Math.cos(ph2), y = r * Math.sin(ph2); vq.set(R * Math.cos(m.th), R * Math.sin(m.th), y * 0.9); vs3.setScalar(0.8 + pr * 0.6); m4.compose(vq, Q0, vs3); tireAir.setMatrixAt(i, m4); tc.set(0x60a5fa).lerp(new THREE.Color(0xef4444), pr); tireAir.setColorAt(i, tc); }
        tireAir.instanceMatrix.needsUpdate = true; tireAir.instanceColor.needsUpdate = true;
        const ang = -Math.PI * 0.75 + clamp(hide ? 220 : gauge, 0, 400) / 400 * Math.PI * 1.5; needle.rotation.z = ang - 0; needle.rotation.z = -(Math.PI * 0.75) * 0 + (-(ang)) * 1; needle.rotation.z = -ang;
        const th = clamp((a.tc + 20) / 60, 0.02, 1) * 3.4; thHg.scale.y = th; thHg.position.y = 0.15 + th / 2; const cold = a.tc < 5; thHg.material.color.set(cold ? 0x2563eb : 0xe2464b); thBulb.material.color.set(cold ? 0x2563eb : 0xe2464b);
        snow.visible = a.tc < 3; if (a.tc < 3) for (let i = 0; i < NSN; i++) { vq.set(-5 + (i * 7.3) % 10, 5 - ((i * 0.37 + clk.t * 0.8) % 5), -1.5 + (i * 1.7) % 3); vs3.setScalar(1); m4.compose(vq, Q0, vs3); snow.setMatrixAt(i, m4); } snow.instanceMatrix.needsUpdate = true;
        lTt.set((a.tc < 0 ? '−' : '') + Math.abs(a.tc) + ' °C (' + TKt + ' K)'); lTg.set('계기압 ' + (hide ? '?' : f1(gauge) + ' kPa')); lTp.set('절대 압력 ' + (hide ? '?' : f1(Pabs) + ' kPa'));
        lTw.show(!hide && gauge < 200);
        info('<b>🛞 타이어: 부피가 일정할 때</b> · 27 °C에서 계기압 220 kPa (절대 압력 320 kPa)<br>절대 압력은 절대 온도에 비례해요: P/T = 일정 → ' + (hide ? '320 kPa × (T / 300 K) = ?' : '320 × ' + TKt + ' / 300 = ' + f1(Pabs) + ' kPa') + '<br>계기압 = 절대 압력 − 대기압(100 kPa) = ' + (hide ? '?' : f1(gauge) + ' kPa') + ' · 추우면 압력이 줄어 경고등이 켜져요.');
      }
      // --- 잠수 + 풍선
      const WXL = -3.6, WH = 4.6;
      const sea = new THREE.Mesh(new THREE.BoxGeometry(5.2, WH, 3), new THREE.MeshStandardMaterial({ color: 0x3b9bea, transparent: true, opacity: 0.35, depthWrite: false })); sea.position.set(WXL, WH / 2, 0); gD.add(sea);
      const seaEdge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(5.2, WH, 3)), new THREE.LineBasicMaterial({ color: 0xdbeafe, transparent: true, opacity: 0.6 })); seaEdge.position.copy(sea.position); gD.add(seaEdge);
      [0, 5, 10].forEach((m) => { const y = WH - 0.5 - m / 10 * 3.6, t = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.02, 0.02), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 })); t.position.set(WXL, y, 1.5); gD.add(t); reg('dive', label(m + ' m', [WXL - 2.8, y, 1.5], { color: '#0369a1', size: 11 })); });
      const diver = new THREE.Group(); { const hd = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), M(0xf2c9a0)); hd.position.y = 0.0; const mk = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.4), M(0x1e293b)); mk.position.set(0, 0.05, 0.12); const bd = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.7, 14), M(0x334155)); bd.position.y = -0.55; diver.add(hd, mk, bd); } diver.scale.setScalar(1.7); gD.add(diver);
      const lung = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), M(0xff8a9a, { roughness: 0.3, emissive: 0x4a0d19 })); gD.add(lung);
      const BXL = 3.6, ground = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.3, 3), M(0x6b8f5c)); ground.position.set(BXL, -0.15, 0); gD.add(ground);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), M(0xef4444, { roughness: 0.2 })); gD.add(ball); const str = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1, 0.03), M(0x475569)); gD.add(str);
      const lDs = reg('dive', label('', diver, { color: '#075985', size: 12, offset: [0, 0.9, 0] })), lDl = reg('dive', label('', lung, { color: '#e11d48', size: 13 })), lDb = reg('dive', label('', ball, { color: '#dc2626', size: 13 })), lDh = reg('dive', label('', [BXL, WH + 0.2, 0], { color: '#475569', size: 12 })), lDw = reg('dive', label('🤿 잠수', [WXL, WH + 0.3, 0], { color: '#0369a1', size: 12 }));
      function diveScene(A, S) {
        const a = S.ap, hide = hideApp(A), lv = A.lungV(a.dd), b = A.balAt(a.dh / 100);
        const dy = WH - 0.7 - a.dd / 10 * 3.4; diver.position.set(WXL, dy + 0.4, 0); lung.position.set(WXL + 1.2, dy - 0.5, 0.1); lung.scale.setScalar(0.35 * Math.cbrt(lv / 6));
        const br = 0.7 + Math.cbrt(b.V / 10) * 0.7, by = br + 0.6 + (a.dh / 100) * 2.6; ball.position.set(BXL, by, 0); ball.scale.setScalar(br); str.scale.y = by - br; str.position.set(BXL, (by - br) / 2, 0);
        lDs.set('수심 ' + a.dd + ' m · ' + (1 + a.dd / 10).toFixed(1) + '기압'); lDl.set('폐 속 공기 ' + (hide ? '?' : f1(lv) + ' L')); lDl.off = [0, 0.55 + 0.35 * Math.cbrt(lv / 6), 0]; lDb.set('풍선 ' + (hide ? '?' : f1(b.V) + ' L')); lDb.off = [0, br + 0.35, 0];
        lDh.set('🎈 헬륨 풍선: ' + b.P.toFixed(2).replace(/0$/, '') + '기압, ' + Math.round(b.Tk) + ' K');
        info('<b>🤿 잠수</b> · ' + (hide ? 'P₁V₁ = P₂V₂ → V₂ = ?' : '2기압 × 6 L = ' + (1 + a.dd / 10).toFixed(1) + '기압 × ' + f1(lv) + ' L (보일 법칙, 온도 일정)') + (lv > 12 && !hide ? '<br>폐가 12 L를 넘으면 위험해요. 올라오며 숨을 내쉬어야 해요!' : '') + '<br><b>🎈 풍선</b> · 지상 (1.0기압, 300 K) 10 L → 상공 (' + b.P.toFixed(2) + '기압, ' + Math.round(b.Tk) + ' K): ' + (hide ? 'V₂ = ?' : '<b>' + f1(b.V) + ' L</b>') + '<br>압력이 줄면 부피가 커지고, 온도가 낮아지면 부피가 줄어요.');
      }
      // --- 열기구
      const grdH = new THREE.Mesh(new THREE.BoxGeometry(12, 0.3, 5), M(0x7dbb6c, { roughness: 1 })); grdH.position.y = -0.15; gH.add(grdH);
      const envH = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), M(0xf59e0b, { roughness: 0.5 })); gH.add(envH);
      const stripe = new THREE.Mesh(new THREE.SphereGeometry(1.003, 40, 28, 0, TAU, 0, Math.PI), new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.18 })); envH.add(stripe);
      const basketH = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.9), M(0xa3763f)); gH.add(basketH);
      const burnH = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.8, 12), new THREE.MeshBasicMaterial({ color: 0xffa94d })); gH.add(burnH);
      const ropeH = [0, 1, 2, 3].map(() => { const r = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1, 0.03), M(0x475569)); gH.add(r); return r; });
      const paxH = []; for (let i = 0; i < 6; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), M([0xf2c9a0, 0xe8b98c, 0xf6d7b8][i % 3])); gH.add(p); paxH.push(p); }
      const aLift = mkArrow(0x14a058, 0.07), aMass = mkArrow(0xe2464b, 0.07); gH.add(aLift, aMass);
      const lHl = reg('hot', label('', aLift, { color: '#14753f', size: 12 })), lHm = reg('hot', label('', aMass, { color: '#b91c1c', size: 12 })), lHr = reg('hot', label('', [3.4, 4.4, 0], { color: '#334155', size: 12 })), lHi = reg('hot', label('', [3.4, 3.7, 0], { color: '#c2410c', size: 12 })), lHk = reg('hot', label('', envH, { color: '#14753f', size: 13 }));
      const rhoA = (Tk) => 101300 * 0.029 / (8.31 * Tk);
      function hotScene(A, S) {
        const a = S.ap, h = A.hotCalc(), br = 0.9 + Math.cbrt(a.hV / 1500) * 0.8, bh = 0.35 + a.alt * 2.3, cx = 0;
        envH.scale.set(br * 0.92, br, br * 0.92); envH.position.set(cx, bh + 0.9 + br, 0); envH.material.color.set(tc.set(0xf59e0b).lerp(new THREE.Color(0xef4444), clamp((a.hT - 80) / 40, 0, 1)));
        basketH.position.set(cx, bh + 0.3, 0); burnH.position.set(cx, bh + 0.95, 0); burnH.scale.set(1, (0.6 + (a.hT - 80) * 0.02) * (1 + 0.1 * Math.sin(clk.t * 40)), 1);
        ropeH.forEach((r, i) => { const sx = i % 2 ? 1 : -1, sz = i < 2 ? 1 : -1, x1 = sx * 0.4, z1 = sz * 0.4, x2 = sx * br * 0.5, y2 = bh + 0.9 + br * 0.15; const len = Math.hypot(x2 - x1, y2 - (bh + 0.6)), mx = (x1 + x2) / 2; r.scale.y = len; r.position.set(cx + mx, (bh + 0.6 + y2) / 2, z1 * 0.6); r.rotation.z = -Math.atan2(x2 - x1, y2 - (bh + 0.6)); });
        paxH.forEach((p, i) => { p.visible = i < a.hP && i < 6; p.position.set(cx - 0.3 + (i % 3) * 0.3, bh + 0.7, i < 3 ? 0.15 : -0.15); });
        const k = 0.012, ll = clamp(h.lift * k, 0.2, 2.6), lm = clamp(h.mass * k, 0.2, 2.6), ax = cx + br + 0.9, ay = bh + 0.9 + br;
        setArrow(aLift, new V3(ax, ay, 0), new V3(ax, ay + ll, 0)); setArrow(aMass, new V3(ax + 0.9, ay, 0), new V3(ax + 0.9, ay - lm, 0));
        lHl.set('양력 ' + fN(h.lift) + ' kg'); lHm.set('총 질량 ' + fN(h.mass) + ' kg'); lHl.off = [0, 0.2, 0]; lHm.off = [0, -0.2, 0];
        lHr.set('바깥 공기 (293 K) ρ = ' + rhoA(293).toFixed(2) + ' kg/m³'); lHi.set('풍선 안 (' + (a.hT + 273) + ' K) ρ = ' + rhoA(a.hT + 273).toFixed(2) + ' kg/m³');
        lHk.set(h.ok ? '✅ 떠올라요!' : h.net > 0 ? '여유 ' + fN(h.net) + ' kg' : '양력 부족'); lHk.off = [0, 0, 0]; lHk.show(true);
        const msg = h.ok ? '양력이 총 질량보다 ' + fN(h.net) + ' kg 커요. 떠올라요!' : (h.net >= 20 ? '승객이 4명이 아니에요. 승객 4명으로 맞춰 주세요.' : h.net > 0 ? '떠오르지만 여유가 ' + fN(h.net) + ' kg로 부족해요 (20 kg 이상 필요).' : '양력이 총 질량보다 작아 못 떠요.');
        info('<b>🎈 열기구 설계</b> · 승객 ' + a.hP + '명 · 풍선 안 ' + a.hT + ' °C · 부피 ' + fN(a.hV) + ' m³<br>양력 = (ρ바깥 − ρ안) × V ≈ <b>' + fN(h.lift) + ' kg</b> · 총 질량 ' + fN(h.mass) + ' kg (장비 330 + 승객 ' + a.hP + ' × 80)<br>' + msg + '<br>밀도 ρ = PM/(RT): 온도가 높으면 밀도가 작아져 위로 떠요.');
      }
      const fN = (v) => Math.round(v).toLocaleString('en-US');
      const APP_CAM = { tire: [0, 2.2, 0, 1.3, 0.35, PHN ? 17 : 13], dive: [0, 2.3, 0, 1.3, 0.2, PHN ? 19 : 14], hot: [0, 2.6, 0, 1.3, 0.3, PHN ? 17 : 13] };
      let curApp = '';
      return {
        update(dt) {
          const A = sim(); if (!A || !A.S) return; const S = A.S; clk.t += dt; clk.dt = Math.min(dt, 0.05);
          let vf, TK, n, P, txt;
          if (S.mode === 'model') { const m = S.m; vf = m.V / 40; TK = m.T; n = 100; P = 100 * 20 / 300 * m.T / m.V; txt = '<b>🔬 기체 모형: 충돌이 만드는 압력</b><br>부피 V = ' + m.V + ' mL · 온도 T = ' + m.T + ' K (' + (m.T - 273) + ' °C) → 압력 P = <b>' + f1(P) + ' kPa</b><br>부피를 줄이면 벽에 부딪히는 횟수가 늘고, 온도를 높이면 분자가 빨라져 횟수와 세기가 커져요.'; }
          else if (S.mode === 'sensor') { const ex = S.sx.exp, rd = A.sxRead(ex, S.sx.x[ex]); vf = rd.V / 40; TK = rd.TK; n = 100; P = rd.P; txt = '<b>📟 센서 실험 · ' + A.EXPS[ex].name + '</b> (' + (ex === 'iso' ? '온도 일정' : ex === 'isob' ? '압력 일정' : '부피 일정') + ')<br>V = ' + f1(rd.V) + ' mL · P = ' + f1(rd.P) + ' kPa · t = ' + Math.round(rd.t) + ' °C (' + Math.round(rd.TK) + ' K)<br>' + (ex === 'iso' ? 'P와 V는 반비례 (PV 일정).' : ex === 'isob' ? 'V–t 직선을 낮은 온도로 연장하면 V = 0이 되는 온도가 있어요 (절대 영도).' : 'P–t 직선을 낮은 온도로 연장하면 P = 0이 되는 온도가 있어요 (절대 영도).'); }
          else if (S.mode === 'eq') { const o = A.igSolve(); const VL = o.syr ? o.V : o.V; vf = clamp(VL / 50, 0.15, 1); TK = o.T; n = clamp(o.n * 100, 20, 200); P = o.P; txt = '<b>🧮 PV = nRT</b> (R = 8.31 J/(mol·K))<br>P = ' + f1(o.P) + ' kPa · V = ' + (o.V < 1 ? f1(o.V * 1000) + ' mL' : f1(o.V) + ' L') + ' · T = ' + f1(o.T) + ' K · n = ' + (o.n < 0.01 ? f1(o.n * 1e4) + ' × 10⁻⁴ mol' : o.n.toFixed(2) + ' mol') + '<br>세 값을 정하면 나머지 하나가 계산돼요 (분자가 많을수록 · 온도가 높을수록 · 부피가 작을수록 압력이 커요).'; }
          else {
            im.visible = box.visible = edges.visible = pis.visible = rod.visible = handle.visible = gauge.visible = false; lP.show(false); lPis.show(false);
            const am = APPG[S.mode] ? S.mode : 'tire'; Object.keys(APPG).forEach((k) => { APPG[k].visible = k === am; ALAB[k].forEach((l) => l.show(k === am)); });
            if (curApp !== am) { curApp = am; const c = APP_CAM[am]; Object.assign(orbit, { tx: c[0], ty: c[1], tz: c[2], phi: c[3], theta: c[4], dist: c[5] * KD }); }
            if (am === 'tire') tireScene(A, S); else if (am === 'dive') diveScene(A, S); else hotScene(A, S);
            return;
          }
          if (curApp) { curApp = ''; Object.keys(APPG).forEach((k) => { APPG[k].visible = false; ALAB[k].forEach((l) => l.show(false)); Object.assign(orbit, { tx: 0, ty: 0, tz: 0, phi: 1.1, theta: 0.65, dist: 12.5 * KD }); }); }
          im.visible = box.visible = edges.visible = pis.visible = rod.visible = handle.visible = gauge.visible = true; lP.show(true); lPis.show(true);
          vf = clamp(vf, 0.2, 1); if (txt !== last) { last = txt; info(txt); }
          const s = Math.sqrt(TK / 300) * 3.2, VL = LX * vf, x0 = -LX / 2, x1 = x0 + VL, hy = LY / 2, hz = LZ / 2; let imp = 0; const nn = Math.round(clamp(n, 20, NMAX));
          for (let i = 0; i < NMAX; i++) {
            const k = i * 3;
            if (i < nn) {
              pos[k] += vel[k] * s * dt; pos[k + 1] += vel[k + 1] * s * dt; pos[k + 2] += vel[k + 2] * s * dt;
              if (pos[k] > x1 - 0.1) { pos[k] = x1 - 0.1; vel[k] = -Math.abs(vel[k]); imp += 2 * Math.abs(vel[k]) * s; } else if (pos[k] < x0 + 0.1) { pos[k] = x0 + 0.1; vel[k] = Math.abs(vel[k]); imp += 2 * Math.abs(vel[k]) * s; }
              if (pos[k + 1] > hy - 0.1) { pos[k + 1] = hy - 0.1; vel[k + 1] = -Math.abs(vel[k + 1]); } else if (pos[k + 1] < -hy + 0.1) { pos[k + 1] = -hy + 0.1; vel[k + 1] = Math.abs(vel[k + 1]); }
              if (pos[k + 2] > hz - 0.1) { pos[k + 2] = hz - 0.1; vel[k + 2] = -Math.abs(vel[k + 2]); } else if (pos[k + 2] < -hz + 0.1) { pos[k + 2] = -hz + 0.1; vel[k + 2] = Math.abs(vel[k + 2]); }
              tc.copy(colS).lerp(colF, clamp((TK - 250) / 300, 0, 1)); m4.makeTranslation(pos[k], pos[k + 1], pos[k + 2]); im.setMatrixAt(i, m4); im.setColorAt(i, tc);
            } else { m4.makeScale(0, 0, 0); im.setMatrixAt(i, m4); }
          }
          im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
          box.scale.x = VL; box.position.x = x0 + VL / 2; edges.scale.x = VL; edges.position.x = x0 + VL / 2; pis.position.x = x1 + 0.11; rod.position.x = x1 + 1.5; handle.position.x = x1 + 3.1;
          const h = clamp(P / 300 * 2.8, 0.05, 2.9); gf.scale.y = h; gf.position.y = h / 2 + 0.05; void acc; void hits; void Ps; void Pshown;
        },
        sync() {},
      };
    },
  });
})();
