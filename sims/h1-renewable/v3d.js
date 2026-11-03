/* h1-renewable · 3D 태양광 패널 · 풍력 발전기 · 연료 전지 (2D의 '장치' 실험과 같아요)
   ① 태양광: 햇빛(고도 50°)이 패널에 수직으로 닿을수록(입사각이 작을수록) 전기가 많아요. 패널 기울기 40°가 가장 좋아요. 받는 빛 = 1000 W/m² × cos(입사각) × (1 − 0.75 × 구름/100), 효율 20 %.
   ② 풍력: 풍속 3 m/s 미만은 발전 못 하고, 3~12 m/s에서는 출력이 풍속의 세제곱에 비례하고, 12 m/s 이상은 정격 출력 2.00 MW.
   ③ 연료 전지: 수소 + 산소 → 물 + 전기. 수소와 산소가 둘 다 있어야 전기가 나와요 (전기 출력 = 수소 공급량 %, 최대 1.00 kW).
   2D의 DV 상태(장치 · 기울기 · 구름 · 풍속 · 수소 · 산소)를 그대로 따라가고, 3D의 슬라이더 · 단추 · ▶ 재생은 2D 슬라이더를 바꿔요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const DEG = Math.PI / 180, ELEV = 50;

  window.SciSim3D.attach({
    title: '3D 태양광 · 풍력 · 연료 전지',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHN ? 14 : 9.5, theta: 0.25, phi: 1.3, target: [0.2, 1.6, 0], min: 6, max: 26 },
    autoRotate: 0,
    levels: [1],
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3, Y = new V3(0, 1, 0);
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ envMapIntensity: 0.6, color: c, roughness: 0.55, metalness: 0.1 }, o || {}));
      const D0 = (window.__sim && window.__sim.DV) || {};
      const st = { h2: typeof D0.h2 === 'number' ? D0.h2 : 0, o2: !!D0.o2, sub: D0.sub === 'wind' || D0.sub === 'fc' ? D0.sub : 'solar', angle: typeof D0.angle === 'number' ? D0.angle : 0, cloud: typeof D0.cloud === 'number' ? D0.cloud : 60, wind: typeof D0.wind === 'number' ? D0.wind : 6, ang: 0, om: 0, t: 0, last: { a: D0.angle, c: D0.cloud, w: D0.wind, sub: D0.sub, h: D0.h2, o: D0.o2 } };
      const solarP = () => { const inc = Math.abs(90 - ELEV - st.angle); const irr = Math.max(0, 1000 * Math.cos(inc * DEG) * (1 - 0.75 * st.cloud / 100)); return { inc, irr, p: irr * 0.2 }; };
      const windP = () => { const v = st.wind; return v < 3 ? 0 : v >= 12 ? 2 : 2 * Math.pow(v / 12, 3); };

      /* ---------- 바닥 ---------- */
      const ground = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.8, 0.3, 64), new THREE.MeshLambertMaterial({ color: 0x3f7a33 })); ground.position.y = -0.15; ground.receiveShadow = true; root.add(ground);

      /* ================= ① 태양광 ================= */
      const gS = new THREE.Group(); root.add(gS);
      const sunDir = new V3(-Math.cos(ELEV * DEG), Math.sin(ELEV * DEG), 0);      // 태양 쪽 방향 (왼쪽 위)
      const PW = 3.2, PH = 2.2, PY = 1.1;
      const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, PY, 12), mat(0x8a93a6, { metalness: 0.7, roughness: 0.35 })); stand.position.y = PY / 2; stand.castShadow = true; gS.add(stand);
      const pivot = new THREE.Group(); pivot.position.y = PY; gS.add(pivot);
      // 패널 (태양 전지 격자 무늬)
      const pc = document.createElement('canvas'); pc.width = 256; pc.height = 176; { const g = pc.getContext('2d'); g.fillStyle = '#16327a'; g.fillRect(0, 0, 256, 176); g.strokeStyle = '#6f93d8'; g.lineWidth = 2; for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32, 176); g.stroke(); } for (let j = 0; j <= 6; j++) { g.beginPath(); g.moveTo(0, j * 29.3); g.lineTo(256, j * 29.3); g.stroke(); } g.strokeStyle = '#c9d6f5'; g.lineWidth = 1; for (let i = 0; i < 8; i++) { g.beginPath(); g.moveTo(i * 32 + 16, 0); g.lineTo(i * 32 + 16, 176); g.stroke(); } }
      const ptex = new THREE.CanvasTexture(pc); ptex.anisotropy = 4;
      const panelM = new THREE.MeshStandardMaterial({ map: ptex, roughness: 0.25, metalness: 0.35, emissive: 0x2a6bff, emissiveMap: ptex, emissiveIntensity: 0.1 });
      const panel = new THREE.Mesh(new THREE.BoxGeometry(PW, 0.1, PH), [mat(0xaab4c6, { metalness: 0.7 }), mat(0xaab4c6, { metalness: 0.7 }), panelM, mat(0x8a93a6), mat(0xaab4c6), mat(0xaab4c6)]);
      panel.position.y = 0.06; panel.castShadow = true; pivot.add(panel);
      // 법선(패널에 수직인 선) + 입사각
      const nrm = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 2.2, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 })); nrm.position.y = 1.2; pivot.add(nrm);
      const nrmH = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 10), nrm.material); nrmH.position.y = 2.3; pivot.add(nrmH);
      // 햇빛 화살표
      const rays = [];
      const rayM = new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0.85 });
      for (let i = 0; i < 5; i++) {
        const g = new THREE.Group(), L = 5.2, sh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, L, 8), rayM), hd = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.36, 12), rayM);
        sh.position.y = L / 2; hd.position.y = 0.0; hd.rotation.x = Math.PI; g.add(sh, hd);
        g.userData = { off: (i - 2) * 0.62, mat: rayM }; gS.add(g); rays.push(g);
      }
      function placeRays() {
        const c = new V3(0, PY + 0.1, 0);
        rays.forEach((g) => {
          const perp = new V3(0, 0, g.userData.off); // z 방향으로 나란히
          const tip = c.clone().add(perp).addScaledVector(new V3(-Math.sin(st.angle * DEG), Math.cos(st.angle * DEG), 0), 0);  // 패널 위의 점 근처
          g.position.copy(tip).addScaledVector(sunDir, 0.15);
          g.quaternion.setFromUnitVectors(Y, sunDir);
          g.scale.y = 1;
          // 화살촉이 패널에 닿도록: 그룹 원점 = 화살촉 (끝점)
        });
      }
      // 태양
      const sunM = new THREE.Mesh(new THREE.SphereGeometry(0.7, 28, 20), new THREE.MeshBasicMaterial({ color: 0xffd23f })); sunM.position.copy(sunDir).multiplyScalar(7.4).add(new V3(0, PY, 0)); gS.add(sunM);
      const gt = document.createElement('canvas'); gt.width = gt.height = 128; { const g = gt.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,225,130,1)'); gr.addColorStop(0.3, 'rgba(255,190,60,.5)'); gr.addColorStop(1, 'rgba(255,160,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }
      const sGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(gt), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); sGlow.scale.set(4.5, 4.5, 1); sGlow.position.copy(sunM.position); gS.add(sGlow);
      // 구름
      const clouds = new THREE.Group(); gS.add(clouds);
      for (let k = 0; k < 3; k++) {
        const c = new THREE.Group();
        [[0, 0, 0, 0.5], [0.5, 0.05, 0.1, 0.4], [-0.5, 0, -0.1, 0.38], [0.15, 0.3, 0, 0.38]].forEach((q) => { const m = new THREE.Mesh(new THREE.SphereGeometry(q[3], 16, 12), mat(0xdfe5f1, { roughness: 1, transparent: true, opacity: 0.95 })); m.position.set(q[0], q[1], q[2]); c.add(m); });
        const p = sunDir.clone().multiplyScalar(4.9 + k * 0.25).add(new V3(0, PY + 0.2, (k - 1) * 1.5)); c.position.copy(p); c.userData.k = k; clouds.add(c);
      }
      const labSun = label('☀ 햇빛', sunM, { size: 12.5, offset: [0, 1.2, 0] });
      const labPanel = label('태양광 패널', [0, PY + 0.2, 0], { size: 12.5, offset: [1.9, -0.2, 0] });
      const labNorm = label('수직선', pivot, { size: 11.5, offset: [0, 2.7, 0] });
      const labInc = label('입사각', [0, PY + 1.3, 0], { size: 12, color: 'rgba(160,100,0,.95)' });

      /* ================= ② 풍력 ================= */
      const gW = new THREE.Group(); root.add(gW);
      const TH = 4.4;
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.2, TH, 24), mat(0xf1f4f9, { roughness: 0.4 })); tower.position.y = TH / 2; tower.castShadow = true; gW.add(tower);
      const nac = new THREE.Group(); nac.position.set(0, TH + 0.1, 0); gW.add(nac);
      const nBody = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.0, 24), mat(0xf1f4f9, { roughness: 0.35 })); nBody.rotation.z = Math.PI / 2; nBody.position.x = 0.3; nBody.castShadow = true; nac.add(nBody);
      const nose = new THREE.Mesh(new THREE.SphereGeometry(0.32, 24, 16), mat(0xe8edf5, { roughness: 0.3 })); nose.position.x = -0.22; nac.add(nose);
      const rotor = new THREE.Group(); rotor.position.x = -0.5; nac.add(rotor);
      for (let i = 0; i < 3; i++) {
        const arm = new THREE.Group(); arm.rotation.x = i * Math.PI * 2 / 3; rotor.add(arm);
        const bl = new THREE.Mesh(new THREE.ConeGeometry(0.2, 3.1, 4), mat(0xf6f8fb, { roughness: 0.3 })); bl.scale.set(0.18, 1, 1); bl.position.y = 1.75; bl.rotation.x = 0.0; bl.rotation.y = 0.0; bl.castShadow = true; arm.add(bl);
        bl.geometry.rotateY(Math.PI / 4); bl.rotation.x = 0.15;
      }
      // 발전기 속 (투명한 덮개 안의 회전 자석 · 코일)
      const gen = new THREE.Group(); gen.position.set(0.55, 0, 0); nac.add(gen);
      const gMag = new THREE.Group(); gen.add(gMag);
      const gN = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.4, 16, 1, false, 0, Math.PI), mat(0xe2464b, { emissive: 0xe2464b, emissiveIntensity: 0.3 })), gS2 = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.4, 16, 1, false, Math.PI, Math.PI), mat(0x3b6ff0, { emissive: 0x3b6ff0, emissiveIntensity: 0.3 }));
      gN.rotation.z = gS2.rotation.z = Math.PI / 2; gMag.add(gN, gS2);
      for (let i = 0; i < 3; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.035, 8, 24), mat(0xe39a45, { metalness: 0.6 })); r.rotation.y = Math.PI / 2; r.position.x = -0.14 + i * 0.14; gen.add(r); }
      nBody.material = new THREE.MeshStandardMaterial({ color: 0xdfe8f5, transparent: true, opacity: 0.35, roughness: 0.2, depthWrite: false });
      // 바람 입자
      const winds = []; for (let i = 0; i < 22; i++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.7, 6), new THREE.MeshBasicMaterial({ color: 0xeaf4ff, transparent: true, opacity: 0.7 })); m.rotation.z = Math.PI / 2; m.userData = { y: 1.2 + Math.random() * 4.4, z: (Math.random() - 0.5) * 4.5, ph: Math.random() }; gW.add(m); winds.push(m); }
      const labWT = label('풍력 발전기', [0, TH + 1.1, 0], { size: 12.5 }), labBl = label('날개', [-0.5, TH + 1.9, 0], { size: 12, offset: [-0.2, 0, 0] }), labGen = label('발전기', [0.55, TH + 0.1, 0], { size: 12, offset: [0.5, -0.65, 0] }), labWind = label('바람 →', [-3.4, 3.4, 0], { size: 12.5 });
      gW.position.x = 0; gW.rotation.y = 0;
      const wlabs = [labWT, labBl, labGen, labWind], slabs = [labSun, labPanel, labNorm, labInc];

      /* ================= ③ 연료 전지 ================= */
      const gF = new THREE.Group(); root.add(gF);
      const FX = 1.7, FH = 2.4, FD = 2.0;       // 방 하나의 크기
      const chamberM = (c) => new THREE.MeshStandardMaterial({ color: c, transparent: true, opacity: 0.2, roughness: 0.2, depthWrite: false, side: THREE.DoubleSide });
      const chL = new THREE.Mesh(new THREE.BoxGeometry(FX, FH, FD), chamberM(0x3b82f6)); chL.position.set(-1.35, FH / 2 + 0.1, 0); gF.add(chL);
      const chR = new THREE.Mesh(new THREE.BoxGeometry(FX, FH, FD), chamberM(0xef4444)); chR.position.set(1.35, FH / 2 + 0.1, 0); gF.add(chR);
      const mem = new THREE.Mesh(new THREE.BoxGeometry(0.28, FH, FD), mat(0xf4c542, { roughness: 0.6 })); mem.position.set(0, FH / 2 + 0.1, 0); gF.add(mem);
      [-0.3, 0.3].forEach((x) => { const e = new THREE.Mesh(new THREE.BoxGeometry(0.1, FH, FD), mat(0x374151, { metalness: 0.5 })); e.position.set(x, FH / 2 + 0.1, 0); gF.add(e); });
      const fWire = new THREE.CatmullRomCurve3([new V3(-0.45, FH + 0.1, 0), new V3(-0.45, FH + 1.3, 0), new V3(-0.8, FH + 1.9, 0), new V3(0, FH + 2.0, 0), new V3(0.8, FH + 1.9, 0), new V3(0.45, FH + 1.3, 0), new V3(0.45, FH + 0.1, 0)], false, 'catmullrom', 0.1);
      gF.add(new THREE.Mesh(new THREE.TubeGeometry(fWire, 60, 0.04, 8, false), mat(0x2a2f3a, { metalness: 0.4 })));
      const fLamp = new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 16), new THREE.MeshStandardMaterial({ color: 0xfff1b0, transparent: true, opacity: 0.8, emissive: 0xffd23f, emissiveIntensity: 0, roughness: 0.25 })); fLamp.position.set(0, FH + 2.0, 0); gF.add(fLamp);
      const fPipeL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.6, 12), mat(0xaab4c6, { metalness: 0.6 })); fPipeL.rotation.z = Math.PI / 2; fPipeL.position.set(-3.1, 1.1, 0); gF.add(fPipeL);
      const fPipeR = fPipeL.clone(); fPipeR.position.x = 3.1; gF.add(fPipeR);
      const valve = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.5), mat(0xdc2626)); valve.position.set(2.5, 1.1, 0); gF.add(valve);
      const molOf = (c) => { const g = new THREE.Group(); [-0.1, 0.1].forEach((x) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), mat(c, { roughness: 0.4 })); m.position.x = x; g.add(m); }); gF.add(g); return g; };
      const h2s = [], o2s = [];
      for (let i = 0; i < 14; i++) { const g = molOf(0x60a5fa); g.userData = { ph: Math.random() * 6.28, x: -1.35 + (Math.random() - 0.5) * 1.1, y: 0.3 + Math.random() * 2.0, z: (Math.random() - 0.5) * 1.3 }; h2s.push(g); }
      for (let i = 0; i < 6; i++) { const g = molOf(0xf87171); g.userData = { ph: Math.random() * 6.28, x: 1.35 + (Math.random() - 0.5) * 1.1, y: 0.3 + Math.random() * 2.0, z: (Math.random() - 0.5) * 1.3 }; o2s.push(g); }
      const eTok = [], hTok = [];
      for (let i = 0; i < 8; i++) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfacc15 })); e.userData.ph = i / 8; gF.add(e); eTok.push(e); }
      for (let i = 0; i < 5; i++) { const h = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), new THREE.MeshBasicMaterial({ color: 0xf472b6 })); h.userData.ph = i / 5; gF.add(h); hTok.push(h); }
      const drops = []; for (let i = 0; i < 4; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshBasicMaterial({ color: 0x38bdf8 })); d.userData.ph = i / 4; gF.add(d); drops.push(d); }
      const flabs = [label('연료극 (−)', chL, { size: 12.5, offset: [0, -1.55, 0.9] }), label('공기극 (+)', chR, { size: 12.5, offset: [0, -1.55, 0.9] }), label('전해질막', mem, { size: 12, offset: [0, 1.45, 0.3] }),
        label('수소(H₂) 공급', fPipeL, { size: 12, color: '#1d4ed8', offset: [0, 0.5, 0] }), label('공기(산소 O₂) 공급', fPipeR, { size: 12, color: '#b91c1c', offset: [0, 0.5, 0] }),
        label('물(H₂O)', [2.1, 0.0, 0.5], { size: 12, color: '#0369a1' }), label('e⁻', [0, FH + 2.5, 0], { size: 12 })];
      const noO2 = label('✕ 산소가 없어요', chR, { size: 12.5, color: '#b91c1c', offset: [0, 0.2, 0] });

      /* ---------- 조작 (2D 슬라이더를 대신 움직여 줘요) ---------- */
      const L2 = () => (ctx.lesson && ctx.lesson()) || null;
      const setDom = (id, v) => { const el = document.getElementById(id); if (el) { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); } };
      const probe = controls.text(''); probe.style.display = 'none'; const ctlRow = probe.parentElement;
      const grab = (fn) => { const before = new Set(ctlRow.children); fn(); return Array.from(ctlRow.children).filter((c) => !before.has(c)); };
      let seg, rA, rC, rW, rH, o2B, internal = true, plS, plW, plF;
      seg = controls.segment('장치', [{ value: 'solar', label: '☀ 태양광' }, { value: 'wind', label: '🌬 풍력' }, { value: 'fc', label: '🔋 연료 전지' }], st.sub, (v) => { st.sub = v; const L = L2(); if (L && L.setDev) L.setDev(v); show(); });
      const gSo = grab(() => {
        rA = controls.range('패널 기울기', 0, 90, 1, Math.round(st.angle), (v) => { st.angle = v; setDom('sAngle', v); show(true); }, (v) => v + '°' + (v === 40 ? ' (가장 좋아요)' : ''));
        rC = controls.range('구름', 0, 100, 5, Math.round(st.cloud), (v) => { st.cloud = v; setDom('sCloud', v); show(true); }, (v) => v + '%');
        plS = controls.player({ duration: 10, loop: true, label: '기울기 바꿔 보기', phases: [[0, '수평(0°)'], [0.22, '최적 40° 근처'], [0.45, '수직(90°)'], [0.72, '다시 수평으로']],
          onFrame(p) { if (internal) return; const u = p < 0.5 ? p / 0.5 : 1 - (p - 0.5) / 0.5, v = Math.round(90 * u); if (v !== st.angle) { st.angle = v; setDom('sAngle', v); rA.set(v); show(true); } } });
      });
      const gWi = grab(() => {
        rW = controls.range('풍속', 0, 20, 1, Math.round(st.wind), (v) => { st.wind = v; setDom('sWind', v); show(true); }, (v) => v + ' m/s');
        plW = controls.player({ duration: 10, loop: true, label: '풍속 바꿔 보기', phases: [[0, '약한 바람'], [0.25, '3 m/s부터 발전'], [0.5, '12 m/s 이상은 정격'], [0.75, '다시 약해져요']],
          onFrame(p) { if (internal) return; const u = p < 0.5 ? p / 0.5 : 1 - (p - 0.5) / 0.5, v = Math.round(20 * u); if (v !== st.wind) { st.wind = v; setDom('sWind', v); rW.set(v); show(true); } } });
      });
      const gFc = grab(() => {
        rH = controls.range('수소 공급량', 0, 100, 5, st.h2, (v) => { st.h2 = v; setDom('sH2', v); show(true); }, (v) => v + ' %');
        o2B = controls.button('💨 공기(산소) 공급', () => { const b = document.getElementById('bO2'); if (b) b.click(); });
        plF = controls.player({ duration: 8, loop: true, label: '수소 늘리기', phases: [[0, '수소 적게'], [0.5, '수소 최대(100 %)'], [0.5001, '']].slice(0, 2),
          onFrame(p) { if (internal) return; const u = p < 0.5 ? p / 0.5 : 1 - (p - 0.5) / 0.5, v = Math.round(20 * u) * 5; if (v !== st.h2) { st.h2 = v; setDom('sH2', v); rH.set(v); show(true); } } });
      });
      internal = false;
      const pivotPoint = () => new V3(-0.2, PY + 0.4, 0).add(new V3(-Math.sin(st.angle * DEG), Math.cos(st.angle * DEG), 0).multiplyScalar(1.0));
      const setInfo = (h) => { if (h !== setInfo.h) { setInfo.h = h; info(h); } };
      function show() {
        const so = st.sub === 'solar', wi = st.sub === 'wind', fc = st.sub === 'fc';
        gS.visible = so; gW.visible = wi; gF.visible = fc; slabs.forEach((l) => l.show(so)); wlabs.forEach((l) => l.show(wi)); flabs.forEach((l) => l.show(fc)); noO2.show(fc && !st.o2);
        gSo.forEach((e) => { e.style.display = so ? '' : 'none'; }); gWi.forEach((e) => { e.style.display = wi ? '' : 'none'; }); gFc.forEach((e) => { e.style.display = fc ? '' : 'none'; });
        if (so) {
          const s = solarP(); pivot.rotation.z = st.angle * DEG; placeRays();
          nrm.visible = nrmH.visible = true;
          clouds.children.forEach((c, k) => { c.visible = st.cloud > 15 + k * 25; c.scale.setScalar(0.45 + st.cloud / 100 * 0.35); });
          rayM.opacity = 0.4 + 0.55 * (1 - 0.75 * st.cloud / 100);
          panelM.emissiveIntensity = 0.05 + s.irr / 1000 * 0.9;
          labInc.set('입사각 ' + Math.round(s.inc) + '°'); labInc.obj = pivotPoint(); labInc.off = [-0.9, 0.2, 0];
          setInfo('햇빛이 패널에 <b>수직</b>으로 닿을수록(입사각이 작을수록) 전기가 많이 나와요.<br>지금 입사각 <b>' + Math.round(s.inc) + '°</b> · 구름 ' + st.cloud + '% → 약 <b>' + Math.round(s.p) + ' W</b> (패널 1 m²)');
        } else if (wi) {
          const p = windP(), v = st.wind;
          setInfo(v < 3 ? '풍속이 <b>3 m/s</b>보다 약하면 날개가 거의 돌지 않아 발전하지 못해요.' : '풍속 <b>' + v + ' m/s</b> → 출력 약 <b>' + (Math.round(p * 100) / 100).toFixed(2) + ' MW</b><br>출력은 풍속의 <b>세제곱</b>에 비례하고, 12 m/s 이상이면 정격 출력(2.00 MW)이에요.');
        } else {
          const pw = st.o2 ? st.h2 / 100 : 0;
          setInfo(st.o2 ? '<b>수소 + 산소 → 물 + 전기</b><br>수소는 연료극에서 전자를 잃고(산화), 전자는 외부 회로로 흘러 전기를 만들어요. 산소는 전자를 얻어(환원) 수소 이온과 만나 물이 돼요.<br>수소 ' + st.h2 + ' % → 전기 출력 <b>' + pw.toFixed(2) + ' kW</b>' : '<b>산소가 없어요.</b> 수소와 산소가 <b>둘 다</b> 있어야 전기가 만들어져요. 💨 공기(산소) 공급을 켜 보세요.');
        }
      }
      show();

      return {
        update(dt, t) {
          st.t += dt;
          const D = window.__sim && window.__sim.DV;
          if (D) {
            if (D.sub !== st.last.sub && (D.sub === 'solar' || D.sub === 'wind' || D.sub === 'fc')) { st.last.sub = D.sub; st.sub = D.sub; seg.set(D.sub); show(); }
            if (D.angle !== st.last.a) { st.last.a = D.angle; st.angle = D.angle; rA.set(Math.round(D.angle)); show(); }
            if (D.cloud !== st.last.c) { st.last.c = D.cloud; st.cloud = D.cloud; rC.set(Math.round(D.cloud)); show(); }
            if (D.wind !== st.last.w) { st.last.w = D.wind; st.wind = D.wind; rW.set(Math.round(D.wind)); show(); }
            if (D.h2 !== st.last.h) { st.last.h = D.h2; st.h2 = D.h2; rH.set(Math.round(D.h2)); show(); }
            if (D.o2 !== st.last.o) { st.last.o = D.o2; st.o2 = D.o2; o2B.classList.toggle('on', st.o2); o2B.textContent = st.o2 ? '💨 공기(산소) 공급: 켜짐' : '💨 공기(산소) 공급: 꺼짐'; show(); }
          }
          if (st.sub === 'solar') {
            const pulse = 0.5 + 0.5 * Math.sin(t * 3);
            rays.forEach((g, i) => { g.userData.mat.opacity = g.userData.mat.opacity; });
            sGlow.scale.setScalar(4.3 + Math.sin(t * 2) * 0.15);
            clouds.children.forEach((c) => { c.position.y = PY + 0.2 + Math.sin(t * 0.6 + c.userData.k) * 0.05; });
          } else if (st.sub === 'fc') {
            const pw = st.o2 ? st.h2 / 100 : 0, nH = Math.round(st.h2 / 100 * 14), nO = st.o2 ? 6 : 0;
            h2s.forEach((g, i) => { const u = g.userData; g.visible = i < nH; g.position.set(u.x + Math.sin(t * 0.8 + u.ph) * 0.3, u.y + Math.sin(t * 1.1 + u.ph * 2) * 0.2, u.z + Math.cos(t * 0.7 + u.ph) * 0.2); g.rotation.set(t + u.ph, t * 0.7, 0); });
            o2s.forEach((g, i) => { const u = g.userData; g.visible = i < nO; g.position.set(u.x + Math.sin(t * 0.8 + u.ph) * 0.3, u.y + Math.sin(t * 1.1 + u.ph * 2) * 0.2, u.z + Math.cos(t * 0.7 + u.ph) * 0.2); g.rotation.set(t * 0.9 + u.ph, t * 0.6, 0); });
            fLamp.material.emissiveIntensity = pw * 2.2; valve.visible = !st.o2; noO2.show(st.sub === 'fc' && !st.o2);
            eTok.forEach((e) => { const u = (t * (0.15 + pw * 0.5) + e.userData.ph) % 1; e.position.copy(fWire.getPointAt(u)); e.visible = pw > 0.02; });
            hTok.forEach((h) => { const u = (t * (0.15 + pw * 0.4) + h.userData.ph) % 1; h.position.set(-0.5 + u * 1.0, 0.7 + h.userData.ph * 1.2, (h.userData.ph - 0.5) * 0.8); h.visible = pw > 0.02; });
            drops.forEach((d) => { const u = (t * 0.4 + d.userData.ph) % 1; d.position.set(2.1, 0.55 - u * 0.5, 0.5 + (d.userData.ph - 0.5) * 0.4); d.visible = pw > 0.02; d.scale.setScalar(1 - u * 0.4); });
          } else {
            const v = st.wind, target = v < 3 ? 0 : Math.min(v, 12) * 0.5 + (v > 12 ? 0.4 : 0);
            st.om += (target - st.om) * Math.min(1, dt * 1.6); st.ang += st.om * dt;
            rotor.rotation.x = st.ang; gMag.rotation.x = st.ang * 4;
            const sp = 1 + v * 0.35;
            winds.forEach((m) => { const u = m.userData; m.position.set(-4.5 + ((t * 0.18 * sp + u.ph) % 1) * 9, u.y, u.z); m.visible = v > 0.5; m.scale.set(0.5 + v * 0.08, 1, 1); });
          }
        },
        sync() {},
      };
    },
  });
})();
