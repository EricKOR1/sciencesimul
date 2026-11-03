/* he-deep-circulation · 3D 지구본 위의 해양 컨베이어 벨트
   북대서양과 남극 근처에서 차갑고 짠 물이 가라앉아 깊은 바다를 천천히 흐르고, 인도양·태평양에서 올라와 표층 해류로 돌아와요.
   지구본을 투명하게 해서 표층 흐름(주황)과 심층 흐름(파랑)을 함께 봐요. 담수(빙하 녹은 물)가 늘어나면 침강이 약해져요.
   2D 실험의 담수 유입량(S.F)과 침강 세기 함수(strengthF)를 읽어 따라가요(읽기 전용). */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const R = 3.2, DEG = Math.PI / 180;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const ll = (lat, lon, r) => new (window.THREE.Vector3)(Math.cos(lat * DEG) * Math.cos(lon * DEG) * r, Math.sin(lat * DEG) * r, -Math.cos(lat * DEG) * Math.sin(lon * DEG) * r);

  /* 아주 단순화한 대륙 (위도, 경도 → 경도, 위도) */
  const LAND = [
    [[-168, 66], [-140, 70], [-95, 72], [-80, 68], [-62, 58], [-55, 50], [-67, 44], [-76, 35], [-81, 25], [-97, 20], [-88, 15], [-80, 8], [-85, 12], [-105, 22], [-118, 32], [-124, 42], [-125, 50], [-140, 60], [-165, 60]],
    [[-55, 60], [-45, 60], [-20, 70], [-20, 82], [-60, 82], [-70, 76]],
    [[-80, 8], [-60, 10], [-50, 0], [-35, -6], [-40, -22], [-58, -38], [-66, -55], [-74, -50], [-72, -30], [-80, -5]],
    [[-10, 36], [-9, 43], [0, 50], [10, 56], [22, 66], [30, 71], [60, 70], [100, 78], [140, 72], [180, 68], [170, 60], [140, 50], [125, 40], [122, 30], [110, 20], [105, 10], [100, 2], [95, 15], [80, 10], [72, 20], [58, 25], [50, 30], [35, 36], [28, 41], [10, 44], [0, 38]],
    [[-17, 15], [-10, 35], [10, 37], [32, 31], [43, 12], [51, 12], [40, -10], [35, -25], [20, -35], [12, -18], [9, 0], [-8, 4]],
    [[114, -22], [130, -12], [142, -11], [153, -26], [147, -39], [130, -32], [115, -34]],
    [[95, -3], [105, -6], [120, -9], [140, -8], [150, -6], [130, 0], [110, 2]],
  ];
  function earthTex(THREE) {
    const W = 1024, H = 512, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
    const X = (lon) => (lon + 180) / 360 * W, Y = (lat) => (90 - lat) / 180 * H;
    g.clearRect(0, 0, W, H);
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(70,130,190,.42)'); gr.addColorStop(0.5, 'rgba(40,110,185,.34)'); gr.addColorStop(1, 'rgba(70,130,190,.42)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1; for (let lo = -180; lo <= 180; lo += 30) { g.beginPath(); g.moveTo(X(lo), 0); g.lineTo(X(lo), H); g.stroke(); } for (let la = -60; la <= 60; la += 30) { g.beginPath(); g.moveTo(0, Y(la)); g.lineTo(W, Y(la)); g.stroke(); }
    LAND.forEach((p) => { g.beginPath(); p.forEach((v, i) => (i ? g.lineTo(X(v[0]), Y(v[1])) : g.moveTo(X(v[0]), Y(v[1])))); g.closePath(); g.fillStyle = 'rgba(112,158,96,1)'; g.fill(); g.strokeStyle = 'rgba(70,110,64,1)'; g.lineWidth = 2; g.stroke(); });
    g.fillStyle = 'rgba(240,247,252,1)'; g.fillRect(0, Y(-90), W, Y(-70) - Y(-90)); g.fillRect(0, 0, W, Y(80)); g.beginPath(); [[-55, 60], [-45, 60], [-20, 70], [-20, 82], [-60, 82], [-70, 76]].forEach((v, i) => (i ? g.lineTo(X(v[0]), Y(v[1])) : g.moveTo(X(v[0]), Y(v[1])))); g.fill();
    const t = new THREE.CanvasTexture(c); if ('encoding' in t) t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t;
  }
  const SURF = [[40, -170], [30, 160], [8, 130], [-5, 115], [-15, 95], [-25, 70], [-35, 35], [-34, 18], [-22, 4], [-5, -12], [8, -30], [20, -58], [30, -78], [40, -58], [50, -40], [60, -28]];
  const NADW = [[62, -28], [50, -40], [35, -50], [15, -40], [0, -30], [-20, -30], [-40, -35], [-55, -30], [-62, -5], [-60, 30], [-58, 70]];
  const IND = [[-58, 70], [-40, 75], [-20, 70], [0, 65], [12, 60]];
  const PAC = [[-58, 70], [-56, 120], [-55, 170], [-50, -150], [-30, -135], [-10, -135], [10, -140], [30, -150], [40, -170]];
  const AABW = [[-72, -42], [-62, -45], [-45, -40], [-25, -33], [0, -30], [15, -35]];

  window.SciSim3D.attach({
    title: '해양 컨베이어 벨트 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    levels: [2, 3],        // 0·1단계(수조 실험·단면 카드)는 2D 화면에서 해요
    camera: { dist: PHONE ? 14 : 10.5, theta: 0.2, phi: 1.1, min: 5.5, max: 22 },
    autoRotate: 0.12,
    build(ctx) {
      if (ctx.THREE.ColorManagement) ctx.THREE.ColorManagement.legacyMode = false;     // 색을 보이는 그대로(sRGB) 쓰도록 맞춰요
      const { THREE, root, label, info, controls } = ctx;
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0.05 }, o || {}));
      const tex = earthTex(THREE);
      root.add(new THREE.Mesh(new THREE.SphereGeometry(R * 0.82, 48, 32), std(0x0f2a52, { roughness: 0.9 })));
      const shell = new THREE.Mesh(new THREE.SphereGeometry(R, 96, 64), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.55, metalness: 0.0, depthWrite: false })); shell.renderOrder = 3; root.add(shell);
      const grp = new THREE.Group(); root.add(grp);
      const mkCurve = (pts, r) => new THREE.CatmullRomCurve3(pts.map((p) => ll(p[0], p[1], r)), false, 'centripetal');
      const FL = [
        { id: 'surf', curve: mkCurve(SURF, R * 1.018), col: 0xff7a3d, n: 30, rad: 0.05, kind: 'surf' },
        { id: 'nadw', curve: mkCurve(NADW, R * 0.9), col: 0x4aa8ff, n: 24, rad: 0.05, kind: 'deep' },
        { id: 'ind', curve: mkCurve(IND, R * 0.9), col: 0x4aa8ff, n: 10, rad: 0.04, kind: 'deep' },
        { id: 'pac', curve: mkCurve(PAC, R * 0.9), col: 0x4aa8ff, n: 20, rad: 0.04, kind: 'deep' },
        { id: 'aabw', curve: mkCurve(AABW, R * 0.86), col: 0xa78bfa, n: 12, rad: 0.045, kind: 'deep' },
      ];
      FL.forEach((f) => { f.mat = new THREE.MeshBasicMaterial({ color: f.col, transparent: true, opacity: 0.85 }); f.mesh = new THREE.Mesh(new THREE.TubeGeometry(f.curve, 160, f.rad, 8, false), f.mat); grp.add(f.mesh); });
      /* 침강 · 용승 연결선 */
      const rad = (lat, lon, r1, r2, col) => { const a = ll(lat, lon, r1), b = ll(lat, lon, r2), d = b.clone().sub(a), m = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, d.length(), 10), new THREE.MeshBasicMaterial({ color: col })); m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); grp.add(m); return m; };
      const sinkN = rad(62, -28, R * 1.018, R * 0.9, 0xffffff), sinkS = rad(-72, -42, R * 1.0, R * 0.86, 0xc4b5fd), upI = rad(12, 60, R * 0.9, R * 1.018, 0x9fe6ff), upP = rad(40, -170, R * 0.9, R * 1.018, 0x9fe6ff);
      const ring = (lat, lon, col) => { const m = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 8, 36), new THREE.MeshBasicMaterial({ color: col })); const p = ll(lat, lon, R * 1.025); m.position.copy(p); m.lookAt(p.clone().multiplyScalar(2)); grp.add(m); return m; };
      const rN = ring(62, -28, 0xffffff), rS = ring(-72, -42, 0xc4b5fd);
      /* 흐르는 알갱이 */
      const NT = FL.reduce((a, f) => a + f.n, 0), dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.085, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }), NT); grp.add(dots);
      const cc = new THREE.Color(); let k0 = 0; FL.forEach((f) => { f.k0 = k0; for (let i = 0; i < f.n; i++) { cc.set(f.id === 'surf' ? 0xffd9a8 : f.id === 'aabw' ? 0xe4dcff : 0xcfeaff); dots.setColorAt(k0 + i, cc); } k0 += f.n; });

      const LB = {
        n: label('② 침강 (북대서양 심층수)', ll(62, -28, R * 1.03).toArray(), { size: 12, offset: [0, 0.35, 0] }), s: label('남극 저층수 침강', ll(-72, -42, R * 1.03).toArray(), { size: 12, offset: [0, -0.3, 0] }),
        sf: label('① 표층 난류(북상)', ll(20, -58, R * 1.03).toArray(), { size: 12, color: 'rgba(170,70,10,.92)' }), dp: label('③ 심층 이동(남하)', ll(-30, -33, R * 0.9).toArray(), { size: 12, color: 'rgba(15,80,170,.92)' }),
        up: label('④ 느린 상승', ll(12, 60, R * 1.03).toArray(), { size: 11.5, color: 'rgba(15,100,150,.9)' }),
      };

      /* 상태 */
      let F = 0, str = 1, showS = true, showD = true;
      const SIM = () => window.__sim;
      const calc = (f) => { try { const s = SIM(); if (s && s.strengthF) return s.strengthF(f); } catch (e) {} return clamp(1 - f / 6.5, 0, 1); };
      let lastSimF = null; try { const s = SIM(); if (s && s.S) { F = s.S.F || 0; lastSimF = s.S.F; } } catch (e) {}
      const rF = controls.range('담수 유입', 0, 10, 0.5, F, (v) => { F = v; refresh(); try { const s = SIM(); if (s && s.setF) { s.setF(v); lastSimF = v; } } catch (e) {} }, (v) => v.toFixed(1) + ' (빙하 담수)');
      const bS = controls.button('표층 ✓', () => { showS = !showS; bS.classList.toggle('on', showS); bS.textContent = '표층 ' + (showS ? '✓' : '✕'); apply(); }); bS.classList.add('on');
      const bD = controls.button('심층 ✓', () => { showD = !showD; bD.classList.toggle('on', showD); bD.textContent = '심층 ' + (showD ? '✓' : '✕'); apply(); }); bD.classList.add('on');
      function apply() {
        FL.forEach((f) => { f.mesh.visible = f.kind === 'surf' ? showS : showD; });
        [sinkN, sinkS, rN, rS].forEach((m) => (m.visible = showD)); [upI, upP].forEach((m) => (m.visible = showD));
        LB.sf.show(showS); LB.dp.show(showD); LB.up.show(showD); LB.s.show(showD); LB.n.show(true);
      }
      function refresh() {
        str = calc(F); const pc = Math.round(str * 100);
        let sal = null; try { const s = SIM(); if (s && s.salF) sal = s.salF(F); } catch (e) {}
        if (ctx.level === 2) { info('<b>순환 고리</b>: ① 표층 난류(북상) → ② 침강 → ③ 심층 이동(남하) → ④ 느린 상승<br>한 바퀴 약 1000년 (예시). ▶ 를 눌러 노란 입자를 돌려 보세요.'); return; }
        FL.forEach((f) => { f.mat.opacity = f.kind === 'surf' ? 0.55 + 0.4 * str : 0.2 + 0.7 * str; });
        info('침강 세기 <b>' + pc + '%</b> · 담수 유입 ' + F.toFixed(1) + (sal != null ? ' · 표층 염분 ' + sal.toFixed(2) + ' psu' : '') + '<br>' + (pc === 0 ? '표층수가 가벼워져 <b>침강이 멈췄어요</b>. 북상하는 따뜻한 해류도 약해져요.' : pc < 60 ? '담수가 섞여 염분이 낮아지면 침강이 <b>약해져요</b>.' : '차갑고 <b>짠</b> 물이 무거워 가라앉고, 순환이 이어져요.'));
      }
      /* ▶ 순환 고리: 노란 입자가 ① 표층 난류 → ② 침강 → ③ 심층 이동 → ④ 느린 상승으로 한 바퀴 (구간별 시간 몫은 2D와 같아요) */
      const LEG = (() => { try { const s = SIM(); if (s && s.LOOP_LEG) return s.LOOP_LEG.map((l) => l[1]); } catch (e) {} return [0.05, 0.02, 0.6, 0.33]; })();
      const YEARS = 1000, cum = [0]; LEG.forEach((w, i) => cum.push(cum[i] + w));
      const NAMES = ['① 표층 난류(북상)', '② 침강', '③ 심층 이동(남하)', '④ 느린 상승'];
      const vS = new THREE.Vector3(), vE = new THREE.Vector3(), vT = new THREE.Vector3();
      const surfEnd = FL[0].curve.getPointAt(1), nadwStart = FL[1].curve.getPointAt(0);
      const bead = new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 14), new THREE.MeshBasicMaterial({ color: 0xfde047 })); grp.add(bead);
      const trailM = new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.35 }), trail = [];
      for (let i = 0; i < 10; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.12 - i * 0.008, 10, 8), trailM); grp.add(m); trail.push(m); }
      const bl = label('', [0, 0, 0], { size: 12.5, color: 'rgba(120,80,0,.95)', offset: [0, 0.4, 0] }); bl.obj = bead;
      function loopPos(u, out) {
        u = ((u % 1) + 1) % 1; let k = 0; while (k < 3 && u >= cum[k + 1]) k++;
        const q = (u - cum[k]) / LEG[k];
        if (k === 0) FL[0].curve.getPointAt(q, out);
        else if (k === 1) { out.copy(surfEnd).lerp(nadwStart, q); }
        else if (k === 2) FL[1].curve.getPointAt(q, out);
        else { FL[3].curve.getPointAt(q, out); out.setLength(R * (0.9 + 0.118 * q * q * (3 - 2 * q))); }
        return k;
      }
      let lastLoop = null, lastU = 0, syncing = false;
      function showLoop(u) {
        lastU = u; const k = loopPos(u, vT); bead.position.copy(vT);
        for (let i = 0; i < trail.length; i++) { loopPos(u - (i + 1) * 0.006, vS); trail[i].position.copy(vS); }
        bl.set(NAMES[k] + ' · ' + Math.round(u * YEARS).toLocaleString() + '년째');
        bead.visible = bl.visible = ctx.level === 2; trail.forEach((m) => (m.visible = ctx.level === 2)); bl.show(ctx.level === 2);
      }
      const pl = controls.player({
        duration: 20, loop: true, autoplay: false, label: '한 바퀴 돌리기',
        phases: [[0, NAMES[0]], [cum[1], NAMES[1]], [cum[2], NAMES[2]], [cum[3], NAMES[3]]],
        onFrame(p) { showLoop(p); if (!syncing && ctx.level === 2) { try { const s = SIM(); if (s && s.S) { s.S.loopT = p * YEARS; lastLoop = s.S.loopT; } } catch (e) {} } },
      });
      apply(); refresh(); showLoop(0);
      ctx.onLevel(() => { refresh(); showLoop(lastU); });
      const dm = new THREE.Object3D(), tmp = new THREE.Vector3();
      return {
        update(dt, t) {
          try { const s = SIM(); if (s && s.S && ctx.level === 2 && !pl.playing && s.S.loopT !== lastLoop) { syncing = true; pl.set((s.S.loopT % YEARS) / YEARS); syncing = false; lastLoop = s.S.loopT; } } catch (e) {}
          try { const s = SIM(); if (s && s.S && s.S.F !== lastSimF) { lastSimF = s.S.F; F = s.S.F; rF.set(F); refresh(); } } catch (e) {}
          FL.forEach((f) => {
            for (let i = 0; i < f.n; i++) {
              const u = (i / f.n + t * 0.05 * (0.2 + 0.8 * str)) % 1; f.curve.getPointAt(u, tmp); dm.position.copy(tmp);
              const vis = (f.kind === 'surf' ? showS : showD) && (f.kind === 'surf' || i < Math.ceil(f.n * str)); dm.scale.setScalar(vis ? 1 : 0.0001); dm.updateMatrix(); dots.setMatrixAt(f.k0 + i, dm.matrix);
            }
          });
          dots.instanceMatrix.needsUpdate = true;
          [rN, rS].forEach((m, i) => m.scale.setScalar(1 + 0.15 * Math.sin(t * 3 + i * 2)));
        },
        sync() {},
      };
    },
  });
})();
