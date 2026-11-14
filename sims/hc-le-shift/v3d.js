/* hc-le-shift · 3D 평형의 이동
   2D 실험(주사기 속 기체 · 물 중탕 속 N₂O₄ ⇌ 2NO₂)의 입자를 그대로 입체로 보여 줘요. 압력(부피)과 온도는 2D 조작이 그대로 이어져요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const phone = window.matchMedia && window.matchMedia('(max-width: 599px)').matches;
  window.SciSim3D.attach({
    title: '평형 이동 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대 · 부피와 온도에 따라 입자 수가 바뀌어요',
    camera: { dist: phone ? 14 : 11, theta: 0.55, phi: 1.2, min: 5, max: 26, target: [0.4, 1.4, 0] },
    autoRotate: 0.08,
    levels: [1, 2],
    build(ctx) {
      const { THREE, root, label, info, mats } = ctx;
      const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
      const SG = new THREE.SphereGeometry(1, 18, 12);
      const SPC = { N2O4: 0x7c8db5, NO2: 0xa65b1e, H2: 0xaab4cc, I2: 0x8b3fd1, HI: 0xd97706, Fe: 0xd9941a, SCN: 0x3867f4, FeSCN: 0xc81e3a };
      const SR = { N2O4: [0.2, 0.14], NO2: [0.14, 0.14], H2: [0.1, 0.1], I2: [0.2, 0.17], HI: [0.15, 0.13] };
      const pm = {}; const matOf = (k) => pm[k] || (pm[k] = new THREE.MeshStandardMaterial({ color: SPC[k] || 0xffffff, roughness: 0.24, metalness: 0, envMapIntensity: 1.2 }));   // 입자 모형: 매끈한 공 (입자가 많아 가벼운 재질)
      const pool = []; for (let i = 0; i < 140; i++) { const m = new THREE.Mesh(SG, matOf('NO2')); m.visible = false; root.add(m); pool.push(m); }
      const floor = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mats.stone(0x0f131c, { repeat: 4, bump: 0.01, extra: { roughness: 0.85, envMapIntensity: 0.35 } })); floor.receiveShadow = true; floor.scale.set(15, 0.1, 9); floor.position.y = -0.06; root.add(floor); floor.userData.v3bg = true;
      const glassMat = new THREE.MeshStandardMaterial({ color: 0x9ec5ff, transparent: true, opacity: 0.1, roughness: 0.15, depthWrite: false });
      const edgeMat = new THREE.LineBasicMaterial({ color: 0xcfe0ff, transparent: true, opacity: 0.75 });
      const unit = new THREE.BoxGeometry(1, 1, 1), unitE = new THREE.EdgesGeometry(unit);
      const cylX = new THREE.CylinderGeometry(0.5, 0.5, 1, 48).rotateZ(Math.PI / 2), cylXE = new THREE.EdgesGeometry(cylX, 30);   // x축 방향 원기둥 (주사기 몸통 · 피스톤)

      /* 주사기 */
      const gS = new THREE.Group(); root.add(gS);
      const gasBox = new THREE.Mesh(cylX, new THREE.MeshStandardMaterial({ color: 0xa65b1e, transparent: true, opacity: 0.1, roughness: 0.2, depthWrite: false })), gasEdge = new THREE.LineSegments(cylXE, edgeMat);
      const piston = new THREE.Mesh(cylX, mats.rubber(0x2a2f38));   // 고무 피스톤
      const rod = new THREE.Mesh(cylX, mats.metal('steel', { brushed: true }));
      const grip = new THREE.Mesh(cylX, mats.plastic(0x5b34c4));   // 누름판
      const noz = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 1, 32).rotateZ(-Math.PI / 2), mats.glass({ opacity: 0.35 }));
      gS.add(gasBox, gasEdge, piston, rod, grip, noz);
      const barrel = new THREE.Mesh(cylX, mats.glass({ opacity: 0.12 })), barrelE = new THREE.LineSegments(cylXE, new THREE.LineBasicMaterial({ color: 0xdbe8ff, transparent: true, opacity: 0.7 })); barrel.renderOrder = 4; gS.add(barrel, barrelE);
      { // 눈금 · 손가락 걸이 · 받침대 (주사기 몸통은 x0 = -4.3 에서 길이 7.4)
        const tickM = new THREE.MeshBasicMaterial({ color: 0xe8eefa, transparent: true, opacity: 0.8 });
        for (let i = 0; i <= 14; i++) { const tk = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.012, i % 2 ? 0.25 : 0.5), tickM); tk.position.set(-4.3 + 0.3 + i * 0.5, 1.5 + 1.18, 0); tk.rotation.x = 0; gS.add(tk); }
        const flange = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.5, 4.0), mats.plastic(0xdfe5ee, { extra: { transparent: true, opacity: 0.75 } })); flange.position.set(-4.3 + 7.45, 1.5, 0); gS.add(flange);
        [-3.3, 1.9].forEach((x) => { const st = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.36, 2.0), mats.wood(0x8a6a4c)); st.position.set(x, 0.18, 0); st.castShadow = true; gS.add(st);
          const cr = new THREE.Mesh(new THREE.TorusGeometry(1.24, 0.06, 10, 48, Math.PI), mats.metal('steel')); cr.rotation.set(0, Math.PI / 2, Math.PI); cr.position.set(x, 1.5, 0); gS.add(cr); }); }
      const sLab = label('', [0, 0, 0], { size: 12.5 });
      /* 물 중탕 */
      const gT = new THREE.Group(); root.add(gT);
      const bath = new THREE.Mesh(unit, mats.liquid(0x4aa3ff, { opacity: 0.32 })), bathE = new THREE.Group();   // 물 (온도에 따라 색이 바뀜) + 유리 수조
      // 플라스크 속 기체 색: NO₂(갈색)가 많을수록 진해져요 (2D 플라스크의 색 변화와 같아요)
      const flask = new THREE.Mesh(new THREE.SphereGeometry(0.5, 48, 32), new THREE.MeshStandardMaterial({ color: 0xa65b1e, transparent: true, opacity: 0.1, roughness: 0.2, depthWrite: false })), flaskE = new THREE.Group();   // 둥근 플라스크 속 기체 색
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.2, 20), mats.emissive(0xff7a1a, 1.6, { extra: { transparent: true, opacity: 0.9 } })); ctx.halo(flame, 0xff8a3a, 2.4, 0.7);
      const ice = [0, 1, 2].map((i) => { const m = new THREE.Mesh(unit, mats.ice()); m.scale.set(0.5, 0.5, 0.5); m.rotation.set(0.3 * i, 0.5 * i, 0.2); return m; });
      gT.add(bath, bathE, flask, flaskE, flame, ice[0], ice[1], ice[2]);
      const tLab = label('', [0, 0, 0], { size: 12.5 });
      const fLab = label('플라스크 (N₂O₄ ⇌ 2NO₂)', [0, 0, 0], { size: 11.5 }); fLab.show(false);
      const BW = 5.2, BH = 3.4, BD = 3.6, FW = 2.6, FH = 2.2, FD = 2.2;
      bath.scale.set(BW, BH, BD); bath.position.y = BH / 2;
      { // 유리 수조: 벽 두께 · 테두리 · 수면 · 받침
        const tank = new THREE.Mesh(new THREE.BoxGeometry(BW + 0.16, BH + 0.5, BD + 0.16), mats.glass({ opacity: 0.12 })); tank.position.y = (BH + 0.5) / 2; tank.renderOrder = 4; bathE.add(tank);
        const te = new THREE.LineSegments(new THREE.EdgesGeometry(tank.geometry), new THREE.LineBasicMaterial({ color: 0xe6f1ff, transparent: true, opacity: 0.6 })); te.position.copy(tank.position); bathE.add(te);
        const surf = new THREE.Mesh(new THREE.PlaneGeometry(BW, BD), mats.liquid(0x9bd0ff, { opacity: 0.3, extra: { side: THREE.DoubleSide } })); surf.rotation.x = -Math.PI / 2; surf.position.y = BH + 0.005; surf.renderOrder = 2; bathE.add(surf);
        const pad = new THREE.Mesh(new THREE.BoxGeometry(BW + 0.5, 0.08, BD + 0.5), mats.rubber(0x20242c)); pad.position.y = -0.02; bathE.add(pad); }
      flask.scale.setScalar(3.2); flask.position.y = 0.6 + FH / 2;
      { const sh = new THREE.Mesh(new THREE.SphereGeometry(1.64, 48, 32), mats.glass({ opacity: 0.16 })); sh.position.y = 0.6 + FH / 2; sh.renderOrder = 3; flaskE.add(sh);   // 플라스크 유리
        const nk = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 1.1, 32, 1, true), mats.glass({ opacity: 0.2 })); nk.position.y = 0.6 + FH / 2 + 1.55 + 0.4; flaskE.add(nk);
        const lip = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.05, 10, 36), mats.glass({ opacity: 0.35 })); lip.rotation.x = Math.PI / 2; lip.position.y = nk.position.y + 0.55; flaskE.add(lip);
        const stp = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.3, 0.35, 28), mats.rubber(0x3a3f48)); stp.position.y = nk.position.y + 0.65; flaskE.add(stp); }
      flame.position.set(0, -0.1, 0); flame.rotation.x = Math.PI;
      ice.forEach((m, i) => m.position.set(-1.5 + i * 0.1, 0.9 + i * 0.7, 1.0 - i * 0.5));
      const colT = (T) => new THREE.Color(0x6bb8ff).lerp(new THREE.Color(0xff8a5c), clamp(T / 100, 0, 1));

      const mapPs = (ves, Rx, put, n0) => {
        const r = ves.r, pad = ves.pad, w = Math.max(1, r.w - 2 * pad), h = Math.max(1, r.h - 2 * pad);
        let i = 0;
        ves.ps.forEach((p) => {
          if (i >= pool.length) return; if (p.zz === undefined) p.zz = Math.random();
          const u = clamp((p.x - r.x - pad) / w, 0, 1), v = clamp((p.y - r.y - pad) / h, 0, 1), m = pool[i++];
          m.visible = true; m.material = matOf(p.k); const sz = SR[p.k] || [0.15, 0.13]; m.scale.set(sz[0], sz[1], sz[1]); put(m, u, v, p.zz); m.rotation.z = p.a || 0;
        });
        for (; i < pool.length; i++) pool[i].visible = false;
      };
      const fq = (v) => (v >= 10 ? v.toFixed(0) : v >= 1 ? v.toFixed(1) : v >= 0.1 ? v.toFixed(2) : v.toPrecision(2));

      return {
        update(dt, t) {
          const Z = ctx.lesson(); if (!Z) return;
          const S = Z.S, mode = S.mode, PS = Z.PS, TS = Z.TS;
          const tempScene = mode === 'temp';
          gS.visible = !tempScene; gT.visible = tempScene; sLab.show(!tempScene); tLab.show(tempScene); fLab.show(tempScene);
          if (!tempScene) {
            const V = PS.V, rx = PS.rx, Lg = 3.6 * V, x0 = -4.3, H = 2.2, x1 = x0 + Lg;
            gasBox.scale.set(Lg, H, H); gasBox.position.set(x0 + Lg / 2, 1.5, 0); gasEdge.scale.copy(gasBox.scale); gasEdge.position.copy(gasBox.position);
            barrel.scale.set(7.4, H + 0.15, H + 0.15); barrel.position.set(x0 + 3.7, 1.5, 0); barrelE.scale.copy(barrel.scale); barrelE.position.copy(barrel.position);
            piston.scale.set(0.3, H - 0.08, H - 0.08); piston.position.set(x1 + 0.15, 1.5, 0);
            rod.scale.set(2.4, 0.22, 0.22); rod.position.set(x1 + 1.5, 1.5, 0); grip.scale.set(0.35, 1.3, 1.3); grip.position.set(x1 + 2.8, 1.5, 0);
            noz.scale.set(0.5, 0.35, 0.35); noz.position.set(x0 - 0.3, 1.5, 0);
            const tint = rx.id === 'n2o4' ? 0xa65b1e : 0x8b3fd1; gasBox.material.color.setHex(tint);
            const cNO = rx.sp.length > 1 ? PS.vessel.count(rx.sp[1].k) : 0; gasBox.material.opacity = 0.06 + 0.3 * clamp(cNO / 28, 0, 1);
            mapPs(PS.vessel, rx, (m, u, v, z) => m.position.set(x0 + 0.15 + u * (Lg - 0.3), 1.5 + (v - 0.5) * (H - 0.4), (z - 0.5) * (H - 0.4)));
            sLab.obj = [x0 + Lg / 2, 3.1, 0];
            const cnt = rx.sp.map((s) => s.k), names = { N2O4: 'N₂O₄', NO2: 'NO₂', H2: 'H₂', I2: 'I₂', HI: 'HI' };
            sLab.set('부피 V = ' + V.toFixed(2) + ' L');
            info('<b>' + rx.eq + '</b> (일정한 온도) · K = ' + fq(rx.K) + '<br>' + cnt.map((k) => names[k] + ' <b>' + PS.vessel.count(k) + '개</b>').join(' · ') + '<br>부피 V = <b>' + V.toFixed(2) + ' L</b> — 압축 · 팽창 단추로 부피를 바꾸면 입자 수가 새 평형으로 달라져요.');
            return;
          }
          // 온도 (물 중탕)
          const T = TS.T, ves = TS.vessel, K = Z.Kt(T);
          bath.material.color.copy(colT(T)); flame.visible = TS.bath >= 80; ice.forEach((m) => { m.visible = TS.bath <= 5; });
          flame.scale.y = 1 + Math.sin(t * 11) * 0.12;
          mapPs(ves, Z.RXN, (m, u, v, z) => m.position.set((u - 0.5) * (FW - 0.5), 0.6 + 0.25 + v * (FH - 0.5), (z - 0.5) * (FD - 0.5)));
          const nA = ves.count('N2O4'), nB = ves.count('NO2');
          flask.material.opacity = 0.06 + 0.34 * clamp(nB / 30, 0, 1); fLab.obj = [FW / 2 + 0.2, 0.6 + FH + 0.25, FD / 2]; fLab.show(true);
          tLab.obj = [0, BH + 0.5, 0]; tLab.set('물 중탕 ' + Math.round(T) + ' °C');
          info('<b>N₂O₄(g) ⇌ 2NO₂(g)</b> · 물 중탕 <b>' + Math.round(T) + ' °C</b> (설정 ' + TS.bath + ' °C)<br>N₂O₄(무색) <b>' + nA + '개</b> · NO₂(갈색) <b>' + nB + '개</b> · K = <b>' + fq(K) + '</b><br>온도가 바뀌면 평형 상수 K 자체가 변해서 평형이 이동해요.');
        },
      };
    },
  });
})();
