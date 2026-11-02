/* h1-renewable · 3D 태양광 패널과 풍력 발전기
   ① 태양광: 햇빛(고도 50°)이 패널에 수직으로 닿을수록(입사각이 작을수록) 전기가 많아요. 패널 기울기 40°가 가장 좋아요. 받는 빛 = 1000 W/m² × cos(입사각) × (1 − 0.75 × 구름/100), 효율 20 %.
   ② 풍력: 풍속 3 m/s 미만은 발전 못 하고, 3~12 m/s에서는 출력이 풍속의 세제곱에 비례하고, 12 m/s 이상은 정격 출력 2.00 MW. (2D 실험의 모형과 같은 식이에요) */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const DEG = Math.PI / 180, ELEV = 50;

  window.SciSim3D.attach({
    title: '3D 태양광 · 풍력',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHN ? 17 : 11, theta: 0.25, phi: 1.3, target: [0.5, 1.2, 0], min: 6, max: 26 },
    autoRotate: 0,
    levels: [0, 1],
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3, Y = new V3(0, 1, 0);
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.55, metalness: 0.1 }, o || {}));
      const D0 = (window.__sim && window.__sim.DV) || {};
      const st = { sub: D0.sub === 'wind' ? 'wind' : 'solar', angle: typeof D0.angle === 'number' ? D0.angle : 0, cloud: typeof D0.cloud === 'number' ? D0.cloud : 60, wind: typeof D0.wind === 'number' ? D0.wind : 6, ang: 0, om: 0, t: 0, last: { a: D0.angle, c: D0.cloud, w: D0.wind, sub: D0.sub } };
      const solarP = () => { const inc = Math.abs(90 - ELEV - st.angle); const irr = Math.max(0, 1000 * Math.cos(inc * DEG) * (1 - 0.75 * st.cloud / 100)); return { inc, irr, p: irr * 0.2 }; };
      const windP = () => { const v = st.wind; return v < 3 ? 0 : v >= 12 ? 2 : 2 * Math.pow(v / 12, 3); };

      /* ---------- 바닥 ---------- */
      const ground = new THREE.Mesh(new THREE.CylinderGeometry(7.2, 7.4, 0.3, 64), mat(0x5b8f45, { roughness: 1, metalness: 0 })); ground.position.y = -0.15; ground.receiveShadow = true; root.add(ground);

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
        const g = new THREE.Group(), L = 5.2, sh = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, L, 8), rayM), hd = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.3, 12), rayM);
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
        const p = sunDir.clone().multiplyScalar(4.1 + k * 0.1).add(new V3(0, PY + 0.2, (k - 1) * 1.3)); c.position.copy(p); c.userData.k = k; clouds.add(c);
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

      /* ---------- 조작 ---------- */
      const seg = controls.segment('보기', [{ value: 'solar', label: '☀ 태양광' }, { value: 'wind', label: '🌬 풍력' }], st.sub, (v) => { st.sub = v; show(); });
      const rA = controls.range('패널 기울기', 0, 90, 1, Math.round(st.angle), (v) => { st.angle = v; show(true); }, (v) => v + '°' + (v === 40 ? ' (가장 좋아요)' : ''));
      const rC = controls.range('구름', 0, 100, 10, Math.round(st.cloud), (v) => { st.cloud = v; show(true); }, (v) => v + '%');
      const rW = controls.range('풍속', 0, 20, 1, Math.round(st.wind), (v) => { st.wind = v; show(true); }, (v) => v + ' m/s');
      const probe = controls.text(''); probe.style.display = 'none'; const ctlRow = probe.parentElement;
      function show() {
        const so = st.sub === 'solar';
        gS.visible = so; gW.visible = !so; slabs.forEach((l) => l.show(so)); wlabs.forEach((l) => l.show(!so));
        const ch = Array.from(ctlRow.children);
        // [보기 라벨, 버튼, 버튼, 기울기 라벨, 슬라이더, 구름 라벨, 슬라이더, 풍속 라벨, 슬라이더]
        ch.forEach((el, i) => { if (i >= 3 && i <= 6) el.style.display = so ? '' : 'none'; if (i === 7 || i === 8) el.style.display = so ? 'none' : ''; });
        if (so) {
          const s = solarP(); pivot.rotation.z = st.angle * DEG; placeRays();
          nrm.visible = nrmH.visible = true;
          clouds.children.forEach((c, k) => { c.visible = st.cloud > 15 + k * 25; c.scale.setScalar(0.7 + st.cloud / 100 * 0.8); });
          rayM.opacity = 0.25 + 0.65 * (1 - 0.75 * st.cloud / 100);
          panelM.emissiveIntensity = 0.05 + s.irr / 1000 * 0.9;
          labInc.set('입사각 ' + Math.round(s.inc) + '°'); labInc.obj = pivotPoint(); labInc.off = [0, 0, 0];
          info('햇빛이 패널에 <b>수직</b>으로 닿을수록(입사각이 작을수록) 전기가 많이 나와요.<br>지금 입사각 <b>' + Math.round(s.inc) + '°</b> · 구름 ' + st.cloud + '% → 약 <b>' + Math.round(s.p) + ' W</b> (패널 1 m²)');
        } else {
          const p = windP(), v = st.wind;
          info(v < 3 ? '풍속이 <b>3 m/s</b>보다 약하면 날개가 거의 돌지 않아 발전하지 못해요.' : '풍속 <b>' + v + ' m/s</b> → 출력 약 <b>' + (Math.round(p * 100) / 100).toFixed(2) + ' MW</b><br>출력은 풍속의 <b>세제곱</b>에 비례하고, 12 m/s 이상이면 정격 출력(2.00 MW)이에요.');
        }
      }
      const pivotPoint = () => new V3(0, PY + 1.6, 0).add(new V3(-Math.sin(st.angle * DEG), Math.cos(st.angle * DEG), 0).multiplyScalar(0.0));
      show();

      return {
        update(dt, t) {
          st.t += dt;
          const D = window.__sim && window.__sim.DV;
          if (D) {
            if (D.sub !== st.last.sub && (D.sub === 'solar' || D.sub === 'wind')) { st.last.sub = D.sub; st.sub = D.sub; seg.set(D.sub); show(); }
            if (D.angle !== st.last.a) { st.last.a = D.angle; st.angle = D.angle; rA.set(Math.round(D.angle)); show(); }
            if (D.cloud !== st.last.c) { st.last.c = D.cloud; st.cloud = D.cloud; rC.set(Math.round(D.cloud)); show(); }
            if (D.wind !== st.last.w) { st.last.w = D.wind; st.wind = D.wind; rW.set(Math.round(D.wind)); show(); }
          }
          if (st.sub === 'solar') {
            const pulse = 0.5 + 0.5 * Math.sin(t * 3);
            rays.forEach((g, i) => { g.userData.mat.opacity = g.userData.mat.opacity; });
            sGlow.scale.setScalar(4.3 + Math.sin(t * 2) * 0.15);
            clouds.children.forEach((c) => { c.position.y = PY + 0.2 + Math.sin(t * 0.6 + c.userData.k) * 0.05; });
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
