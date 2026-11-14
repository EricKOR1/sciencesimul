/* he-deep-circulation · 3D 지구본 위의 해양 컨베이어 벨트
   북대서양과 남극 근처에서 차갑고 짠 물이 가라앉아 깊은 바다를 천천히 흐르고, 인도양·태평양에서 올라와 표층 해류로 돌아와요.
   지구본을 투명하게 해서 표층 흐름(주황)과 심층 흐름(파랑)을 함께 봐요. 담수(빙하 녹은 물)가 늘어나면 침강이 약해져요.
   2D 실험의 담수 유입량(S.F)과 침강 세기 함수(strengthF)를 읽어 따라가요(읽기 전용).
   3D는 3단계(순환 연결)에서 보여 줘요. 수조 · 단면 장면 코드는 2D와 같은 값으로 그리는 예비 장면이에요. */
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
    levels: [2],           // 0단계(수조 실험) · 1단계(단면 카드 끌기) · 3단계(인과 사슬 카드 끌기)는 2D 화면에서 해요
    camera: { dist: PHONE ? 15.5 : 12.2, theta: 0.2, phi: 1.1, min: 5.5, max: 22 },
    autoRotate: 0.12,
    build(ctx) {
      if (ctx.THREE.ColorManagement) ctx.THREE.ColorManagement.legacyMode = false;     // 색을 보이는 그대로(sRGB) 쓰도록 맞춰요
      const { THREE, root, label, info, controls, mats } = ctx;
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
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0.05 }, o || {}));
      const tex = earthTex(THREE);
      root.add(new THREE.Mesh(new THREE.SphereGeometry(R * 0.82, 48, 32), std(0x0f2a52, { roughness: 0.9 })));
      const shell = new THREE.Mesh(new THREE.SphereGeometry(R, 96, 64), new THREE.MeshPhysicalMaterial({ map: tex, transparent: true, roughness: 0.38, metalness: 0.0, clearcoat: 0.5, clearcoatRoughness: 0.25, depthWrite: false })); shell.renderOrder = 3; root.add(shell);
      /* 우주 배경 · 대기 빛무리 · 지구본 받침(자오선 고리 · 축 · 나무 받침) */
      const spaceDome = FX.dome('#02040c', '#07102a', '#0d1a3a', 520), labDome = FX.dome('#1b2a48', '#2b3e63', '#40557c', 0); labDome.visible = false;
      { const halo = FX.glow('90,170,255', R * 3.1, 0.55); halo.renderOrder = -1; root.add(halo);
        const brass = mats.metal('brass', { roughness: 0.26 });
        const mer = new THREE.Mesh(new THREE.TorusGeometry(R * 1.14, 0.06, 12, 96), brass); mer.rotation.y = 0.0; mer.rotation.z = 0; mer.position.set(0, 0, 0); root.add(mer);
        const axis = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, R * 2.5, 10), brass); root.add(axis);
        [-1, 1].forEach((sg) => { const cap = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), brass); cap.position.y = sg * R * 1.25; root.add(cap); });
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.9, 14), brass); post.position.y = -R * 1.14 - 0.3; root.add(post);
        const foot = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.8, 0.28, 40), new THREE.MeshStandardMaterial({ map: FX.wood([1.2, 1.2]), roughness: 0.5 })); foot.position.y = -R * 1.14 - 0.9; foot.receiveShadow = true; root.add(foot); }
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

      /* 순환 연결 단계: 번호 옆에 학생이 고른 이름을 보여 줘요 (2D와 같아요: 맞으면 초록, 아니면 회색) */
      const LBK = [LB.sf, LB.n, LB.dp, LB.up], LBT = LBK.map((l) => l.el.textContent), LBB = LBK.map((l) => l.el.style.background);
      function pickLabels(sw) {
        const on = ctx.level === 2 && sw && sw.S, pk = (on && sw.S.loopPick) || {}, ans = (sw && sw.LOOP_LEG) || [];
        LBK.forEach((l, k) => {
          const tx = on ? '①②③④'[k] + (pk[k] ? ' ' + pk[k] : '') : LBT[k];
          if (l.el.textContent === tx) return; l.set(tx);
          l.el.style.background = on && pk[k] ? (ans[k] && pk[k] === ans[k][0] ? 'rgba(21,128,61,.92)' : 'rgba(71,85,105,.92)') : LBB[k];
        });
      }

      /* 상태 */
      let F = 0, str = 1, showS = true, showD = true;
      const SIM = () => window.__sim;
      const calc = (f) => { try { const s = SIM(); if (s && s.strengthF) return s.strengthF(f); } catch (e) {} return clamp(1 - f / 6.5, 0, 1); };
      let lastSimF = null; try { const s = SIM(); if (s && s.S) { F = s.S.F || 0; lastSimF = s.S.F; } } catch (e) {}
      const rF = { set() {} };   // 담수 유입량은 2D 단계(순환과 기후)의 슬라이더 값을 따라가요
      const bS = controls.button('표층 ✓', () => { showS = !showS; bS.classList.toggle('on', showS); bS.textContent = '표층 ' + (showS ? '✓' : '✕'); apply(); }); bS.classList.add('on');
      const bD = controls.button('심층 ✓', () => { showD = !showD; bD.classList.toggle('on', showD); bD.textContent = '심층 ' + (showD ? '✓' : '✕'); apply(); }); bD.classList.add('on');
      function apply() {
        FL.forEach((f) => { f.mesh.visible = f.kind === 'surf' ? showS : showD; });
        [sinkN, sinkS, rN, rS].forEach((m) => (m.visible = showD)); [upI, upP].forEach((m) => (m.visible = showD));
        LB.sf.show(showS); LB.dp.show(showD); LB.up.show(showD); LB.s.show(showD); LB.n.show(true);
      }
      function refresh() {
        str = ctx.level === 2 ? 1 : calc(F); const pc = Math.round(str * 100);
        FL.forEach((f) => { f.mat.opacity = f.kind === 'surf' ? 0.55 + 0.4 * str : 0.2 + 0.7 * str; });
        let sal = null; try { const s = SIM(); if (s && s.salF) sal = s.salF(F); } catch (e) {}
        if (ctx.level === 2) { info('<b>순환 고리</b>: 노란 입자가 ① → ② → ③ → ④ 순서로 한 바퀴 돌아요.<br>주황 관 = 표층 해류 · 파란 관 = 심층 해류<br>한 바퀴 약 1000년 (예시). 시간 눈금 슬라이더를 올려 보세요.'); return; }
        info('침강 세기 <b>' + pc + '%</b> · 담수 유입 ' + F.toFixed(1) + (sal != null ? ' · 표층 염분 ' + sal.toFixed(2) + ' psu' : '') + '<br>' + (pc === 0 ? '표층수가 가벼워져 <b>침강이 멈췄어요</b>. 북상하는 따뜻한 해류도 약해져요.' : pc < 60 ? '담수가 섞여 염분이 낮아지면 침강이 <b>약해져요</b>.' : '차갑고 <b>짠</b> 물이 무거워 가라앉고, 순환이 이어져요.'));
      }
      /* ▶ 순환 고리: 노란 입자가 ① 표층 난류 → ② 침강 → ③ 심층 이동 → ④ 느린 상승으로 한 바퀴 (구간별 시간 몫은 2D와 같아요) */
      const LEG = (() => { try { const s = SIM(); if (s && s.LOOP_LEG) return s.LOOP_LEG.map((l) => l[1]); } catch (e) {} return [0.05, 0.02, 0.6, 0.33]; })();
      const YEARS = 1000, cum = [0]; LEG.forEach((w, i) => cum.push(cum[i] + w));
      const NAMES = ['① 구간', '② 구간', '③ 구간', '④ 구간'];   // 이름은 학생이 고르는 미션이라 번호만 보여 줘요
      const vS = new THREE.Vector3(), vE = new THREE.Vector3(), vT = new THREE.Vector3();
      const surfEnd = FL[0].curve.getPointAt(1), nadwStart = FL[1].curve.getPointAt(0);
      const bead = new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 14), new THREE.MeshBasicMaterial({ color: 0xfde047 })); grp.add(bead); ctx.halo(bead, 0xffe066, 1.1, 0.7);
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

      /* ================= 1단계 침강 실험(tank) · 2단계 단면 모형(sect): 2D와 같은 값으로 보여 줘요 ================= */
      const gG = new THREE.Group(); while (root.children.length) gG.add(root.children[0]); root.add(gG);
      const gTk = new THREE.Group(), gSc = new THREE.Group(); root.add(gTk, gSc); gTk.visible = gSc.visible = false;
      const chromeM = mats.metal('chrome');
      const benchG = (w, d, y, rep) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.4, d), new THREE.MeshStandardMaterial({ map: FX.wood(rep), roughness: 0.55 })); b.position.y = y; b.receiveShadow = true; const e = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, 0.08, d + 0.04), new THREE.MeshStandardMaterial({ color: 0x6b4a2b, roughness: 0.6 })); e.position.y = y + 0.14; const g2 = new THREE.Group(); g2.add(b, e); return g2; };
      const probe = controls.text(''); probe.style.display = 'none'; const ctlEl = probe.parentElement;
      const globeEls = Array.prototype.filter.call(ctlEl.children, (e) => e !== probe);
      const grab = (fn) => { const n0 = ctlEl.children.length; const r = fn(); return { r, els: Array.prototype.slice.call(ctlEl.children, n0) }; };
      const shw = (g2, on) => g2.els.forEach((e) => { e.style.display = on ? '' : 'none'; });
      const MT = (c, o) => std(c, o);
      /* --- tank --- */
      const TW = 8.2, TH = 3.6, TD = 2.4;
      { const gl = new THREE.Mesh(new THREE.BoxGeometry(TW, TH, TD), mats.glass({ opacity: 0.12 })); gTk.add(gl);
        const ed = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(TW, TH, TD)), new THREE.LineBasicMaterial({ color: 0x9ab4d6 })); gTk.add(ed);
        const wt = new THREE.Mesh(new THREE.BoxGeometry(TW - 0.06, TH * 0.92, TD - 0.06), MT(0xbfe0f5, { transparent: true, opacity: 0.35, roughness: 0.15, depthWrite: false })); wt.position.y = -TH * 0.04; gTk.add(wt); }
      { gTk.add(benchG(TW + 5, TD + 4, -TH / 2 - 0.25, [3.5, 1.4]));
        [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => { const po = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, TH + 0.1, 10), chromeM); po.position.set(sx * TW / 2, 0, sz * TD / 2); gTk.add(po); }));
        [TH / 2, -TH / 2].forEach((y) => { [-1, 1].forEach((sz) => { const b = new THREE.Mesh(new THREE.BoxGeometry(TW, 0.07, 0.07), chromeM); b.position.set(0, y, sz * TD / 2); gTk.add(b); }); [-1, 1].forEach((sx) => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, TD), chromeM); b.position.set(sx * TW / 2, y, 0); gTk.add(b); }); });
        const surf = new THREE.Mesh(new THREE.PlaneGeometry(TW - 0.06, TD - 0.06), new THREE.MeshBasicMaterial({ color: 0xe6f4ff, transparent: true, opacity: 0.35, depthWrite: false })); surf.rotation.x = -Math.PI / 2; surf.position.y = -TH * 0.04 + TH * 0.46 - 0.02; gTk.add(surf); }
      const plate = new THREE.Mesh(new THREE.BoxGeometry(1.1, TH * 0.9, TD * 0.9), MT(0xe2e8f0, { roughness: 0.4, metalness: 0.3 })); plate.position.set(-TW / 2 - 0.7, 0, 0); gTk.add(plate);
      const iceC = [0, 1, 2].map((i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), MT(0xffffff, { transparent: true, opacity: 0.8 })); m.position.set(-TW / 2 - 0.7 + (i % 2 ? 0.1 : -0.1), 0.9 - i * 0.9, TD * 0.46); m.rotation.set(0.4, 0.5, 0.2 * i); gTk.add(m); return m; });
      const fun = new THREE.Mesh(new THREE.ConeGeometry(0.6, 0.9, 20, 1, true), MT(0xcbd5e1, { side: THREE.DoubleSide })); fun.rotation.z = Math.PI; fun.position.set(-TW / 2 + 1.0, TH / 2 + 1.0, 0); gTk.add(fun);
      const funL = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.15, 0.7, 16), MT(0x3b82f6, { transparent: true, opacity: 0.85 })); funL.position.set(-TW / 2 + 1.0, TH / 2 + 1.05, 0); gTk.add(funL);
      { const rx = -TW / 2 + 2.6, rz = -TD / 2 - 0.7, ry0 = -TH / 2 - 0.05, rh = TH + 2.6, fy = TH / 2 + 1.0, fx = -TW / 2 + 1.0;
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, rh, 12), chromeM); rod.position.set(rx, ry0 + rh / 2, rz); gTk.add(rod);
        const fo = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.8, 0.12, 24), new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.5, metalness: 0.5 })); fo.position.set(rx, ry0 + 0.06, rz); gTk.add(fo);
        const a0 = new THREE.Vector3(rx, fy, rz), a1 = new THREE.Vector3(fx, fy, 0), dd = a1.clone().sub(a0), arm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, dd.length(), 10), chromeM); arm.position.copy(a0).addScaledVector(dd, 0.5); arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dd.normalize()); gTk.add(arm);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.035, 8, 28), chromeM); ring.rotation.x = Math.PI / 2; ring.position.set(fx, fy + 0.12, 0); gTk.add(ring);
        const cl = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), chromeM); cl.position.copy(a0); gTk.add(cl); }
      const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 8), MT(0x2563eb, { emissive: 0x1d4ed8, emissiveIntensity: 0.4 })); gTk.add(stream);
      const NDY = 240, dyeM = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 10, 8), MT(0x1d4ed8, { emissive: 0x1e3a8a, emissiveIntensity: 0.5 }), NDY); dyeM.frustumCulled = false; dyeM.instanceMatrix.setUsage(THREE.DynamicDrawUsage); gTk.add(dyeM);
      const layB = new THREE.Mesh(new THREE.BoxGeometry(1, 1, TD - 0.2), MT(0x2563eb, { transparent: true, opacity: 0.25, depthWrite: false })); gTk.add(layB);
      const layT = new THREE.Mesh(new THREE.BoxGeometry(1, 1, TD - 0.2), MT(0x60a5fa, { transparent: true, opacity: 0.22, depthWrite: false })); gTk.add(layT);
      const lTkA = label('수조 속 물 20 °C · 34.5 psu', [TW / 2 - 1.5, TH / 2 + 0.55, 0], { color: 'rgba(100,116,139,.92)' }), lTkB = label('', [-TW / 2 + 3.0, TH / 2 + 1.1, 0], { color: 'rgba(37,99,235,.92)' }), lCold = label('냉각', [-TW / 2 - 0.7, -TH / 2 - 0.5, 0], { color: 'rgba(3,105,161,.92)' }), lPole = label('극 (찬 바다)', [-TW / 2 + 0.9, -TH / 2 - 0.5, 0], { color: 'rgba(3,105,161,.92)' }), lEq = label('적도 쪽', [TW / 2 - 0.9, -TH / 2 - 0.5, 0], { color: 'rgba(180,83,9,.92)' });
      [lTkA, lTkB, lCold, lPole, lEq].forEach((l) => l.show(false));
      const Md = new THREE.Matrix4();
      const setIn = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; e.dispatchEvent(new Event('input')); } };
      const tkT = grab(() => controls.range('부을 물의 수온', 0, 25, 1, 20, (v) => setIn('sTp', v), (v) => v + ' °C'));
      const tkS = grab(() => controls.range('염분', 33, 38, 0.5, 34.5, (v) => setIn('sSp', v), (v) => v.toFixed(1) + ' psu'));
      const tkPour = grab(() => controls.button('💧 붓기 시작', () => { const b = document.getElementById('bPour'); if (b) b.click(); }));
      const tkRst = grab(() => controls.button('↺ 다시 하기', () => { const b = document.getElementById('bTpReset'); if (b) b.click(); }));
      function updTank(w) {
        const g = w.tkG(), tp = w.S.tp, DYs = w.DY, d = w.tpDelta(), TA = 20, SA = 34.5;
        for (let i = 0; i < NDY; i++) {
          const q = DYs[i];
          if (!q) { Md.makeScale(0.0001, 0.0001, 0.0001); dyeM.setMatrixAt(i, Md); continue; }
          Md.makeTranslation(((q.x - g.ix) / g.iw - 0.5) * TW, (0.5 - (q.y - g.iy) / g.ih) * TH * 0.92 - TH * 0.04, (q.o - 0.5) * (TD - 0.7)); dyeM.setMatrixAt(i, Md);
        }
        dyeM.instanceMatrix.needsUpdate = true;
        const fr = (tp.front - g.ix) / g.iw, ft = (tp.frontTop - g.ix) / g.iw;
        layB.visible = fr > 0.03; if (layB.visible) { const wd = fr * TW, hh = TH * 0.92 * 0.3; layB.scale.set(wd, hh, 1); layB.position.set(-TW / 2 + wd / 2, -TH / 2 + hh / 2 + 0.1, 0); }
        layT.visible = ft > 0.03; if (layT.visible) { const wd = ft * TW, hh = TH * 0.92 * 0.18; layT.scale.set(wd, hh, 1); layT.position.set(-TW / 2 + wd / 2, TH * 0.44 - hh / 2, 0); }
        const cold = Math.max(0, Math.min(1, (TA - tp.T) / 20)); plate.material.color.set(new THREE.Color(0xe2e8f0).lerp(new THREE.Color(0x38bdf8), cold)); iceC.forEach((m) => { m.material.opacity = 0.35 + 0.55 * cold; });
        stream.visible = tp.pour; if (tp.pour) { const y0 = TH / 2 + 0.6, y1 = TH / 2 - 0.2; stream.scale.set(1, y0 - y1, 1); stream.position.set(-TW / 2 + 1.0, (y0 + y1) / 2, 0); }
        funL.material.color.set(d < 0 ? 0xf59e0b : 0x3b82f6);
        lTkA.show(true); lTkB.show(true); lTkB.set('부은 물 ' + tp.T + ' °C · ' + tp.S.toFixed(1) + ' psu'); [lCold, lPole, lEq].forEach((l) => l.show(true));
        tkT.r.set(tp.T); tkS.r.set(tp.S); tkPour.els.forEach((e) => { e.classList.toggle('on', !!tp.pour); });
        const ra = w.RHO(TA, SA), rp = w.RHO(tp.T, tp.S);
        const msg = !tp.pour ? '조건을 정하고 <b>💧 붓기 시작</b>을 눌러요.' : d > 0 ? '부은 물이 더 무거워요 → 가라앉아 바닥을 따라 반대쪽으로 흘러요.' : d < 0 ? '부은 물이 더 가벼워요 → 위로 떠올라 표면을 따라 퍼져요.' : '밀도가 같아서 가라앉지도 뜨지도 않고 제자리에서 퍼져요.';
        return '<b>수조 실험: 한쪽 끝을 냉각하고 짠물을 부어요</b><br>' + msg + '<br>밀도 ' + (ra != null ? '수조 속 물 ' + (Math.round(ra * 10) / 10) + ' · 부은 물 ' + (Math.round(rp * 10) / 10) + ' kg/m³ ' : '') + (d > 0 ? '(부은 물이 ' + d.toFixed(1) + ' 더 무거워요)' : d < 0 ? '(부은 물이 ' + (-d).toFixed(1) + ' 더 가벼워요)' : '(같아요)');
      }
      /* --- sect: 남북 바다 단면 --- */
      const SWd = 10, SHt = 4.6, SDp = 1.0, sx = (lat) => (lat / 90) * (SWd / 2), sy = (dep) => SHt / 2 - (dep / 5000) * SHt;
      { const cv = document.createElement('canvas'); cv.width = 4; cv.height = 128; const c2 = cv.getContext('2d'), gr = c2.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, '#8fd8f5'); gr.addColorStop(0.35, '#3b9fd6'); gr.addColorStop(1, '#17386e'); c2.fillStyle = gr; c2.fillRect(0, 0, 4, 128);
        const seaP = new THREE.Mesh(new THREE.BoxGeometry(SWd, SHt, SDp), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, opacity: 0.88 })); gSc.add(seaP);
        const ed = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(SWd, SHt, SDp)), new THREE.LineBasicMaterial({ color: 0x9ab4d6 })); gSc.add(ed);
        [-1, 1].forEach((sg) => { const ic = new THREE.Mesh(new THREE.BoxGeometry(SWd * 0.04, 0.16, SDp), MT(0xffffff)); ic.position.set(sg * (SWd / 2 - SWd * 0.02), SHt / 2 + 0.05, 0); gSc.add(ic); }); }
      gSc.add(benchG(SWd + 3, SDp + 3, -SHt / 2 - 0.4, [3, 1]));
      { const bk = new THREE.Mesh(new THREE.PlaneGeometry(SWd + 3, SHt + 2), new THREE.MeshStandardMaterial({ color: 0x24324f, roughness: 0.9 })); bk.position.z = -SDp / 2 - 0.5; gSc.add(bk);
        [-1, 1].forEach((sx) => { const po = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, SHt + 0.2, 10), chromeM); po.position.set(sx * SWd / 2, 0, SDp / 2); gSc.add(po); }); }
      const BANDD = { mid: [600, 1500, '중층 (약 1000 m)'], deep: [2000, 4000, '심층 (2000~4000 m)'], bot: [4200, 5000, '저층 (4000 m 아래)'] };
      Object.keys(BANDD).forEach((k) => { const [d0, d1, nm] = BANDD[k]; const m = new THREE.Mesh(new THREE.BoxGeometry(SWd, sy(d0) - sy(d1), SDp * 0.9), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, depthWrite: false })); m.position.set(0, (sy(d0) + sy(d1)) / 2, 0); gSc.add(m); const l = label(nm, [SWd / 2, (sy(d0) + sy(d1)) / 2, 0], { color: 'rgba(15,40,80,.8)', size: 11.5, offset: [1.1, 0, 0] }); l.show(false); BANDD[k].push(l); });
      const MKS = ['nadw', 'aabw', 'aaiw'], MCOL = { aabw: 0x7c3aed, nadw: 0x2563eb, aaiw: 0x16a34a };
      const siteR = MKS.map((k) => { const m = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.04, 8, 28), new THREE.MeshBasicMaterial({ color: 0xfde047 })); m.rotation.x = Math.PI / 2; gSc.add(m); return m; });
      const siteL = MKS.map((k) => { const l = label('', [0, 0, 0], { color: 'rgba(15,40,80,.85)', size: 12 }); l.show(false); return l; });
      const massB = MKS.map((k) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 18), MT(MCOL[k], { emissive: MCOL[k], emissiveIntensity: 0.3 })); m.visible = false; gSc.add(m); const st = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1, 8), MT(MCOL[k], { transparent: true, opacity: 0.5 })); st.visible = false; gSc.add(st); const sp = new THREE.Mesh(new THREE.BoxGeometry(1, 0.7, SDp * 0.6), MT(MCOL[k], { transparent: true, opacity: 0.5, depthWrite: false })); sp.visible = false; gSc.add(sp); const l = label('', [0, 0, 0], { color: 'rgba(255,255,255,.92)', size: 12 }); l.el.style.color = '#1e293b'; l.show(false); return { m, st, sp, l }; });
      const lSc = label('단순화한 남북 바다 단면 (대륙 없음) · 깊이 0~5000 m', [0, SHt / 2 + 0.55, 0], { color: 'rgba(30,41,59,.9)' }); lSc.show(false);
      function updSect(w) {
        const so = w.S.cards, sp = w.S.spread, M = w.MASSES, SEPf = w.SEP;
        MKS.forEach((k, i) => {
          const m = M[k], c = so.find((q) => q.id === k), x = sx(m.siteLat);
          siteR[i].visible = !c.placed; siteR[i].position.set(x, SHt / 2 + 0.05, SDp / 2); siteR[i].rotation.z = 0; siteR[i].scale.setScalar(1 + 0.12 * Math.sin(performance.now() / 300 + i));
          siteL[i].show(true); siteL[i].obj = [x, SHt / 2 + 0.45 + (k === 'aaiw' ? 0.45 : 0), 0]; siteL[i].set((m.siteLat < 0 ? '남위 ' : '북위 ') + Math.abs(m.siteLat) + '°');
          const B = massB[i]; B.m.visible = B.st.visible = !!c.placed; B.l.show(!!c.placed);
          if (c.placed) { const dep = Math.max(0, Math.min(5000, (c.my - SEPf.y0) / (SEPf.y1 - SEPf.y0) * 5000)), y = sy(dep); B.m.position.set(x, y, SDp * 0.3); B.st.scale.set(1, Math.max(0.01, SHt / 2 - y), 1); B.st.position.set(x, (SHt / 2 + y) / 2, SDp * 0.3); B.l.obj = [x + (m.siteLat > 0 ? -1.3 : 1.3), y, 0.3]; B.l.set(m.name); }
        });
        const SP = [['aabw', -70, 40], ['aaiw', -50, 30], ['nadw', 60, -55]];
        SP.forEach(([k, a, b]) => { const i = MKS.indexOf(k), B = massB[i], sm = sp * sp * (3 - 2 * sp); B.sp.visible = sp > 0.01; if (B.sp.visible) { const x0 = sx(a), x1 = sx(a + (b - a) * sm), wd = Math.abs(x1 - x0), yc = sy(M[k].band === 'bot' ? 4600 : M[k].band === 'deep' ? 3000 : 1000); B.sp.scale.set(Math.max(0.01, wd), 1, 1); B.sp.position.set((x0 + x1) / 2, yc, 0); } });
        Object.keys(BANDD).forEach((k) => BANDD[k][3].show(true)); lSc.show(true);
        const un = so.filter((c) => !c.placed);
        return '<b>단순화한 남북 바다 단면</b> (노란 고리 = 침강 위치)<br>놓은 수괴 ' + (3 - un.length) + ' / 3 · 밀도가 클수록 더 깊이 가라앉아요.' + (un.length ? '<br>' + un.map((c) => M[c.id].name + ' (' + M[c.id].T + ' °C · ' + M[c.id].S.toFixed(1) + ' psu)').join('<br>') : '<br>모두 놓았어요. ✔ 확인하기를 눌러요.') + '';
      }
      let forceInfo = true, lastHtml = '', scnNow = '';
      ctx.onLevel(() => { forceInfo = true; scnNow = ''; });
      function applyScn(k) {
        if (k === scnNow) return; scnNow = k; forceInfo = true;
        const tk = k === 'tank', sc = k === 'sect';
        gG.visible = !(tk || sc); gTk.visible = tk; gSc.visible = sc; spaceDome.visible = !(tk || sc); labDome.visible = tk || sc;
        globeEls.forEach((e) => { e.style.display = tk || sc ? 'none' : ''; });
        shw(tkT, tk); shw(tkS, tk); shw(tkPour, tk); shw(tkRst, tk);
        if (tk || sc) { Object.keys(LB).forEach((q) => LB[q].show(false)); bl.show(false); }
        else { apply(); showLoop(lastU); refresh(); }
        if (!tk) [lTkA, lTkB, lCold, lPole, lEq].forEach((l) => l.show(false));
        if (!sc) { siteL.forEach((l) => l.show(false)); massB.forEach((b) => b.l.show(false)); Object.keys(BANDD).forEach((q) => BANDD[q][3].show(false)); lSc.show(false); }
        const o = ctx.orbit;
        if (tk) { o.theta = 0.05; o.phi = 1.4; o.tx = 0; o.ty = 0.3; o.tz = 0; o.dist = PHONE ? 19 : 14; }
        else if (sc) { o.theta = 0.05; o.phi = 1.45; o.tx = 0; o.ty = 0; o.tz = 0; o.dist = PHONE ? 20 : 13.5; }
        else { o.theta = 0.2; o.phi = 1.1; o.tx = 0; o.ty = 0; o.tz = 0; o.dist = PHONE ? 15.5 : 12.2; }
      }
      const dm = new THREE.Object3D(), tmp = new THREE.Vector3();
      return {
        update(dt, t) {
          const sw = SIM(), vw = sw && sw.S ? sw.S.view : 'loop';
          applyScn(vw === 'tank' || vw === 'sect' ? vw : 'globe');
          if (vw === 'tank' || vw === 'sect') {
            const h = vw === 'tank' ? updTank(sw) : updSect(sw);
            if (h !== lastHtml || forceInfo) { lastHtml = h; forceInfo = false; info(h); }
            ctx.orbit.theta = 0.05; return;
          }
          pickLabels(sw);
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
