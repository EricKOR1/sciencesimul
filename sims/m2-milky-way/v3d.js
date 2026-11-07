/* m2-milky-way · 3D 우리은하 모형
   바깥에서 본 막대 나선 은하(원반·팽대부·헤일로)와, 태양계 자리에서 본 하늘(은하수 띠)을 오가며 확인해요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const TAU = Math.PI * 2, DEG = Math.PI / 180;
  const GR = 50;                         // 은하 반지름 5만 광년 (단위: 천 광년)
  const SUN_R = 30;                      // 태양계: 중심에서 약 3만 광년 (수업과 같아요)
  const KK = Math.tan(17 * DEG), R0 = 7, TH = Math.log(GR / R0) / KK;

  function rng(seed) {
    return function () {
      seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(r) { let u = 0; while (u < 1e-9) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * r()); }
  // 은하 좌표(x, y, z: 천 광년) → 화면 좌표 (위쪽이 y)
  const G = (x, y, z) => [x, z, -y];
  const armPos = (a, th) => { const r = R0 * Math.exp(KK * th), ang = th + a * Math.PI / 2; return [r * Math.cos(ang), r * Math.sin(ang)]; };

  const asp = window.innerWidth < 600 ? window.innerWidth / Math.max(300, window.innerHeight - 190) : 1.4;
  const FIT = Math.max(1, 1.3 / asp), LS = window.innerWidth < 600 ? 11 : 12.5;

  const v3 = window.SciSim3D.attach({
    host: '.stage-card',
    title: '우리은하 3D 모형',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: 118 * FIT, theta: 0.5, phi: 0.95, fov: 45, min: 25, max: 330 },
    autoRotate: 0,
    levels: [1],                     // 2단계(은하 모형): ☀는 아래 [☀ 태양계 위치] 막대로 놓아요. 1·3·4단계는 하늘 누르기 · 카드 놓기라 2D
    build(ctx) {
      const { THREE, root, camera, label, info, controls, orbit } = ctx;
      const R = rng(2024); let bgStars = null, hazeM = null;
      const sim = window.__sim || null;

      /* ---- 둥근 점 무늬 ---- */
      const cv = document.createElement('canvas'); cv.width = cv.height = 64;
      const c2 = cv.getContext('2d'); const gr = c2.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      c2.fillStyle = gr; c2.fillRect(0, 0, 64, 64);
      const dot = new THREE.CanvasTexture(cv);

      function cloud(pts, hex, size, bright, extra) {
        const n = pts.length, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), base = new THREE.Color(hex);
        for (let i = 0; i < n; i++) {
          const p = pts[i], k = (0.7 + 0.3 * R()) * bright;
          pos[i * 3] = p[0]; pos[i * 3 + 1] = p[1]; pos[i * 3 + 2] = p[2];
          col[i * 3] = base.r * k; col[i * 3 + 1] = base.g * k; col[i * 3 + 2] = base.b * k;
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
        const mat = new THREE.PointsMaterial(Object.assign({ size, map: dot, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: false }, extra || {}));
        const m = new THREE.Points(geo, mat); m.frustumCulled = false; return m;
      }

      /* ---- 별 무리 만들기 ---- */
      const disc = [], arms = [], armsHi = [], bulge = [], bar = [], halo = [], local = [];
      for (let i = 0; i < 12000; i++) { // 팔 사이 원반
        const rr = Math.min(GR, -Math.log(1 - R() * 0.97) * 15 + 2), ang = R() * TAU;
        disc.push(G(rr * Math.cos(ang), rr * Math.sin(ang), gauss(R) * 0.95));
      }
      for (let a = 0; a < 4; a++) { // 막대 끝에서 시작하는 4개의 팔
        const n = a % 2 === 0 ? 3600 : 2000;
        for (let i = 0; i < n; i++) {
          const th = Math.pow(R(), 0.8) * TH, rr = R0 * Math.exp(KK * th), ang = th + a * Math.PI / 2, sc = 0.75 + 0.032 * rr;
          const p = G(rr * Math.cos(ang) + gauss(R) * sc, rr * Math.sin(ang) + gauss(R) * sc, gauss(R) * 0.7);
          (R() < 0.12 ? armsHi : arms).push(p);
        }
      }
      for (let i = 0; i < 2600; i++) bulge.push(G(gauss(R) * 3.4, gauss(R) * 3.4, gauss(R) * 2.9));
      for (let i = 0; i < 1800; i++) { const u = (R() * 2 - 1) * 9; bar.push(G(u, gauss(R) * 1.5 + u * 0.05, gauss(R) * 1.4)); }
      for (let i = 0; i < 1000; i++) { // 헤일로: 공 모양, 성기게
        const rr = 6 + Math.pow(R(), 0.8) * 40, t = Math.acos(R() * 2 - 1), p = R() * TAU;
        halo.push(G(rr * Math.sin(t) * Math.cos(p), rr * Math.sin(t) * Math.sin(p), rr * Math.cos(t) * 0.9));
      }
      const sunBase = armPos(0, Math.log(SUN_R / R0) / KK);
      let sun = { x: sunBase[0], y: sunBase[1] };

      const dDisc = cloud(disc, '#ffe9c9', 1.7, 0.42), dArms = cloud(arms, '#a9c4ff', 2.0, 0.62), dArmsHi = cloud(armsHi, '#dbe7ff', 3.4, 0.8);
      const dBulge = cloud(bulge, '#ffcf70', 2.2, 0.55), dBar = cloud(bar, '#ffc45e', 2.2, 0.5), dHalo = cloud(halo, '#ff9c78', 1.8, 0.55);
      const galaxy = new THREE.Group(); galaxy.add(dDisc, dArms, dArmsHi, dBulge, dBar, dHalo); root.add(galaxy);
      // 중심부의 은은한 빛
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color: 0xffc766, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
      glow.scale.set(26, 26, 1); root.add(glow);

      /* ---- 산개 성단(원반·나선팔) / 구상 성단(헤일로·중심부) ---- */
      const opens = [], globs = [];
      for (let i = 0; i < 34; i++) {
        const a = i % 4, th = 0.8 + R() * (TH - 1.1), q = armPos(a, th);
        opens.push(G(q[0] + gauss(R) * 1.1, q[1] + gauss(R) * 1.1, gauss(R) * 0.35));
      }
      const fixedGlob = G(14, 8, 22); globs.push(fixedGlob);
      for (let i = 0; i < 24; i++) {
        const rr = 4 + Math.pow(R(), 0.9) * 42, t = Math.acos(R() * 2 - 1), p = R() * TAU;
        globs.push(G(rr * Math.sin(t) * Math.cos(p), rr * Math.sin(t) * Math.sin(p), rr * Math.cos(t) * 0.9));
      }
      const openPts = cloud(opens, '#5ec8ff', 11, 1.0), globPts = cloud(globs, '#ffa94d', 12, 1.0);
      root.add(openPts, globPts);
      
      /* ---- 배경 별 + 은하 원반의 푸른 빛 번짐 ---- */
      { const bp = []; for (let i = 0; i < 1800; i++) { const u = R() * 2 - 1, a = R() * TAU, q = Math.sqrt(1 - u * u), r = 420 + R() * 40; bp.push([Math.cos(a) * q * r, u * r, Math.sin(a) * q * r]); }
        const bs = cloud(bp, '#cfdcff', 2.2, 0.8); root.add(bs); bgStars = bs;
        const hc = document.createElement('canvas'); hc.width = hc.height = 256; const hx = hc.getContext('2d'); const hg = hx.createRadialGradient(128, 128, 4, 128, 128, 128);
        hg.addColorStop(0, 'rgba(255,214,150,.55)'); hg.addColorStop(0.18, 'rgba(150,185,255,.22)'); hg.addColorStop(0.6, 'rgba(90,130,255,.09)'); hg.addColorStop(1, 'rgba(60,90,220,0)'); hx.fillStyle = hg; hx.fillRect(0, 0, 256, 256);
        hazeM = new THREE.Mesh(new THREE.PlaneGeometry(GR * 2.3, GR * 2.3), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(hc), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); hazeM.rotation.x = -Math.PI / 2; hazeM.position.y = -0.3; root.add(hazeM); }
      /* ---- 눈금: 반지름 5만 광년 둘레, 지름 선, 태양 궤도 ---- */
      function circle(r, hex, op) {
        const pts = []; for (let i = 0; i <= 96; i++) { const a = i / 96 * TAU; pts.push(new THREE.Vector3(r * Math.cos(a), 0, r * Math.sin(a))); }
        return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: hex, transparent: true, opacity: op }));
      }
      const outline = circle(GR, 0x8fb4ff, 0.45);
      const ruler = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, -GR), new THREE.Vector3(0, 0, GR)]), new THREE.LineBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.8 }));
      const orbitRing = circle(SUN_R, 0xffd34d, 0.55);
      const guides = new THREE.Group(); guides.add(outline, ruler, orbitRing); root.add(guides);

      /* ---- 태양계 ---- */
      const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(1.1, 20, 14), new THREE.MeshBasicMaterial({ color: 0xffd34d }));
      const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color: 0xffe08a, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
      sunGlow.scale.set(7, 7, 1); sunMesh.add(sunGlow); root.add(sunMesh);
      function placeSun() { const p = G(sun.x, sun.y, 0); sunMesh.position.set(p[0], p[1], p[2]); orbitRing.scale.setScalar(Math.hypot(sun.x, sun.y) / SUN_R); }

      /* ---- 태양에서 볼 때만 보이는 주변 별 ---- */
      const nearStars = (function () {
        const pts = []; for (let i = 0; i < 7000; i++) {
          const d = 0.4 + Math.pow(R(), 1.6) * 9, p = R() * TAU;
          pts.push([d * Math.cos(p), gauss(R) * 0.55, d * Math.sin(p)]);
        }
        return pts;
      })();
      const localCloud = cloud(nearStars, '#fff1dc', 1.8, 0.55); localCloud.visible = false; root.add(localCloud);

      /* ---- 이름표 ---- */
      // 은하 좌표에 놓인 이름표는 은하(root)가 돌면 함께 돌도록 root의 자식 '닻'에 붙여요
      const anchor = (p) => { const o = new THREE.Object3D(); o.position.set(p[0], p[1], p[2]); root.add(o); return o; };
      const labSun = label('☀ 태양계', sunMesh, { color: 'rgba(120,80,0,.92)', offset: [0, 3.5, 0], size: LS });
      const labCen = label('은하 중심', [0, 0, 0], { color: 'rgba(60,40,0,.85)', offset: [0, 6, 0], size: LS });
      const anDist = anchor([0, 0, 0]), anOpen = anchor(opens[3]);
      const labDist = label('약 3만 광년', anDist, { color: 'rgba(90,70,0,.9)', offset: [0, -3, 0], size: LS });
      const labDia = label('지름 약 10만 광년', anchor([0, 0, GR]), { color: 'rgba(20,40,90,.9)', offset: [0, 3, 3], size: LS });
      const labOpen = label('산개 성단', anOpen, { color: 'rgba(20,80,130,.92)', offset: [0, 3.2, 0], size: LS });
      const labGlob = label('구상 성단', anchor(fixedGlob), { color: 'rgba(130,70,10,.92)', offset: [0, 3.6, 0], size: LS });
      const labHalo = label('헤일로', anchor(G(-28, -18, 26)), { color: 'rgba(120,50,30,.8)', size: LS });
      const distLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(1, 0, 0)]), new THREE.LineBasicMaterial({ color: 0xffd34d }));
      root.add(distLine);
      // 태양에서 볼 때의 이름표
      const labBand = label('은하수 띠 (원반 방향)', [0, 0, 0], { color: 'rgba(30,50,110,.9)', size: LS });
      const labUp = label('원반 위쪽: 별이 적어요', [0, 0, 0], { color: 'rgba(20,30,60,.85)', size: LS });
      const labGC = label('은하 중심 방향 (궁수자리)', [0, 0, 0], { color: 'rgba(100,70,0,.92)', size: LS });

      /* ---- 상태 ---- */
      let mode = 'out', showOpen = true, showGlob = true, showHalo = true, saved = null;

      function sunDir() { const p = G(sun.x, sun.y, 0); return { x: p[0], z: p[2] }; }
      function updateLabels() {
        const out = mode === 'out';
        labSun.show(out && !hideSun); labCen.show(out); labDia.show(out); labDist.show(out && !hideSun); distLine.visible = out && !hideSun;
        labOpen.show(out && showOpen); labGlob.show(out && showGlob); labHalo.show(out && showHalo);
        labBand.show(mode === 'sun'); labUp.show(mode === 'sun'); labGC.show(mode === 'sun');
        if (mode === 'sun') {
          const p = G(sun.x, sun.y, 0), L = Math.hypot(p[0], p[2]) || 1, ux = -p[0] / L, uz = -p[2] / L; // 중심 방향
          // 중심의 반대 방향(은하수가 희미한 쪽)에 '띠' 이름표, 위쪽에 '원반 위쪽'
          labGC.obj = [0, 0, 0]; labGC.off = [0, 4, 0];
          labBand.obj = [p[0] - ux * 30 + uz * 28, 0, p[2] - uz * 30 - ux * 28]; labBand.off = [0, 0.8, 0];
          labUp.obj = [p[0] + ux * 12, 18, p[2] + uz * 12]; labUp.off = [0, 0, 0];
        }
      }
      function toSun() {
        saved = { theta: orbit.theta, phi: orbit.phi, dist: orbit.dist, tx: orbit.tx, ty: orbit.ty, tz: orbit.tz };
        mode = 'sun';
        const d = sunDir(); orbit.theta = Math.atan2(d.x, d.z); orbit.phi = 1.52; orbit.dist = 1;
        camera.fov = 78; camera.updateProjectionMatrix();
        galaxy.visible = true; guides.visible = false; sunMesh.visible = false; localCloud.visible = true; glow.visible = false;
        applyVis(); updateLabels(); text();
      }
      function toOut() {
        mode = 'out';
        if (saved) Object.assign(orbit, saved);
        camera.fov = 45; camera.updateProjectionMatrix();
        guides.visible = true; sunMesh.visible = true; localCloud.visible = false; glow.visible = true;
        applyVis(); updateLabels(); text();
      }
      function applyVis() { openPts.visible = showOpen; globPts.visible = showGlob; dHalo.visible = showHalo; }
      function text() {
        if (mode === 'out') {
          info('<b>바깥에서 본 우리은하</b><br>위에서, 옆에서 보며 모양을 살펴보세요. 지름은 약 <b>10만 광년</b>이에요.<br>' +
            '태양계는 중심에서 약 <b>3만 광년</b> 떨어진 곳에 있어요. 우리은하는 천천히 <b>회전</b>해요.');
        } else {
          info('<b>☀ 태양계에서 본 하늘</b><br>태양계는 원반 <b>안쪽</b>에 있어서, 원반 방향으로는 별이 겹쳐 <b>은하수 띠</b>로 보여요. 원반 위·아래 방향은 별이 적어요.<br>끌어서 둘러봐요.');
        }
      }

      const viewSeg = controls.segment('보는 곳', [{ value: 'out', label: '🌌 바깥에서' }, { value: 'sun', label: '☀ 태양계에서' }], 'out', (v) => { if (v === 'sun') toSun(); else toOut(); sideBtns(); });
      // 위에서 / 옆에서: 실험의 [위에서 · 옆에서]와 같은 조작 (실험 화면도 같이 바뀌어요)
      const upB = controls.button('⬆ 위에서', () => { if (mode === 'out') { if (sim && sim.setView) sim.setView('top'); else { orbit.phi = 0.06; } } });
      const sideB = controls.button('➡ 옆에서', () => { if (mode === 'out') { if (sim && sim.setView) sim.setView('side'); else { orbit.phi = 1.5; } } });
      // ▶ 재생: 우리은하가 천천히 한 바퀴 회전해요 (2D 모형도 같이 돌아요)
      let pl = null;
      pl = controls.player({
        duration: 40, loop: true, autoplay: false, label: '은하 회전',
        phases: [[0, '위에서 보면 시계 반대 방향'], [0.5, '반 바퀴']],
        onFrame(p) { if (!pl || mode !== 'out') return; const S = sim && sim.S; if (S) { S.yaw = p * 360; S.yawV = 0; S.pause = 2; } },
      });
      const openB = controls.button('산개 성단 ✓', () => { showOpen = !showOpen; openB.classList.toggle('on', showOpen); openB.textContent = '산개 성단 ' + (showOpen ? '✓' : '✕'); applyVis(); updateLabels(); }); openB.classList.add('on');
      const globB = controls.button('구상 성단 ✓', () => { showGlob = !showGlob; globB.classList.toggle('on', showGlob); globB.textContent = '구상 성단 ' + (showGlob ? '✓' : '✕'); applyVis(); updateLabels(); }); globB.classList.add('on');
      const haloB = controls.button('헤일로 ✓', () => { showHalo = !showHalo; haloB.classList.toggle('on', showHalo); haloB.textContent = '헤일로 ' + (showHalo ? '✓' : '✕'); applyVis(); updateLabels(); }); haloB.classList.add('on');
      function sideBtns() { const o = mode === 'out'; upB.style.display = o ? '' : 'none'; sideB.style.display = o ? '' : 'none'; try { nebBtns.forEach((e) => { e.style.display = xMode === 'neb' ? '' : 'none'; }); const rows = barEl.querySelectorAll('.v3-player'); if (rows[0]) rows[0].style.display = xMode ? 'none' : ''; if (rows[1]) rows[1].style.display = xMode ? '' : 'none'; } catch (e) { /* 아직 만들기 전 */ } }
      // ☀ 태양계 위치 (2단계 미션): 막대를 움직이면 2D 모형의 ☀도 같은 자리에 놓여요
      const sunAng = Math.atan2(sunBase[1], sunBase[0]);
      const fmtKly = (v) => (v < 0.5 ? '중심' : '약 ' + (v / 10).toFixed(1).replace(/\.0$/, '') + '만 광년');
      let sunR = null; const sunCtl = [];
      { const bar0 = ctx.renderer.domElement.closest('.v3-wrap').querySelector('.v3-ctl'), before = bar0.children.length; sunR = controls.range('☀ 태양계 위치: 중심에서', 0, 50, 1, 0, (v) => { if (sim && sim.placeSunAt) sim.placeSunAt(v, sunAng); }, fmtKly); sunCtl.push(...[...bar0.children].slice(before)); }
      let sunCtlOn = true;
      const sunTask = () => { try { const g = sim && sim.game && sim.game(), m = g && g.current && g.current(); return !!(m && m._sunTask && g.phase === 'active'); } catch (e) { return false; } };
      let hideSun = false;
      sideBtns();

      let lastSunKey = '';
      function readLesson() { // 수업에서 학생이 ☀를 놓았다면 그 자리를 따라가요 (읽기만)
        { const q = sim && sim.S && sim.S.sun, st = sunTask(); const key = q ? q.mode + ':' + (q.gx || 0).toFixed(1) + ':' + (q.gy || 0).toFixed(1) + st : ''; if (key === lastSunKey) return; lastSunKey = key;
          const placed = !!(q && q.mode === 'placed'); hideSun = !placed && st;
          if (placed && document.activeElement !== sunCtl[1]) sunR.set(Math.round(Math.hypot(q.gx, q.gy))); }
        try {
          const s = sim && sim.S && sim.S.sun;
          if (s && s.mode === 'placed' && isFinite(s.gx) && isFinite(s.gy) && Math.hypot(s.gx, s.gy) > 3) { sun = { x: s.gx, y: s.gy }; } else sun = { x: sunBase[0], y: sunBase[1] };
        } catch (e) { sun = { x: sunBase[0], y: sunBase[1] }; }
        let bi = 0, bd = 1e9; // 태양 바깥쪽 가까이의 산개 성단 하나에 이름표
        opens.forEach((o, i) => { const d = Math.hypot(o[0] - sun.x * 1.3, o[2] + sun.y * 1.3); if (d < bd) { bd = d; bi = i; } });
        anOpen.position.set(opens[bi][0], opens[bi][1], opens[bi][2]);
        placeSun(); labDist.set(fmtKly(Math.hypot(sun.x, sun.y))); sunMesh.visible = mode === 'out' && !hideSun; anDist.position.set(sunMesh.position.x * 0.55, 0, sunMesh.position.z * 0.55);
        distLine.geometry.setFromPoints([new THREE.Vector3(0, 0, 0), sunMesh.position.clone()]);
        localCloud.position.set(sunMesh.position.x, sunMesh.position.y, sunMesh.position.z);
        updateLabels();
      }
      // 2단계(은하 모형)에서는 성단 · 헤일로를 감춰요: 성단의 종류와 위치는 3단계 카드 미션에서 직접 찾아요
      const clBtns = [openB, globB, haloB];
      function clusterStep() { const hide = ctx.level === 1; clBtns.forEach((b) => { b.style.display = hide ? 'none' : ''; }); showOpen = showGlob = showHalo = !hide; clBtns.forEach((b) => { b.classList.toggle('on', !hide); b.textContent = b.textContent.replace(/[✓✕]$/, hide ? '✕' : '✓'); }); applyVis(); updateLabels(); }
      ctx.onLevel(clusterStep); clusterStep();
      readLesson(); applyVis(); text();

      /* ===== 장면 cluster(성단 비교) · nebula(성운): 2D와 같은 내용을 입체로 — 산개 성단 vs 구상 성단 / 방출 · 반사 · 암흑 성운 ===== */
      const gX = new THREE.Group(); gX.visible = false; root.add(gX);
      const barEl = renderer0().closest('.v3-wrap').querySelector('.v3-ctl');
      function renderer0() { return ctx.renderer.domElement; }
      const rnd2 = rng(77);
      const gaussP = (n, sx, sy, sz, cx, cy, cz) => { const a = []; for (let i = 0; i < n; i++) a.push([cx + gauss(rnd2) * sx, cy + gauss(rnd2) * sy, cz + gauss(rnd2) * sz]); return a; };
      // 산개 성단: 별 수가 적고 모양이 불규칙, 푸른 젊은 별
      const openC = cloud(gaussP(150, 1.5, 1.1, 1.0, -4.6, 0, 0).concat(gaussP(60, 0.7, 0.5, 0.5, -3.6, 0.6, 0.3)), '#a9ccff', 9, 1.0, {}); gX.add(openC);
      // 구상 성단: 별이 아주 많고 공 모양, 가운데가 빽빽한 붉은 늙은 별
      const globPts2 = []; for (let i = 0; i < 1500; i++) { const r = 2.6 * Math.pow(rnd2(), 0.55) * Math.pow(rnd2(), 0.3), u = rnd2() * 2 - 1, a = rnd2() * 6.283, q = Math.sqrt(1 - u * u); globPts2.push([4.6 + r * q * Math.cos(a), r * u, r * q * Math.sin(a)]); }
      const globC = cloud(globPts2, '#ffbf80', 5, 0.95, {}); gX.add(globC);
      const cluLab = [label('산개 성단', [-4.6, 2.8, 0], { color: 'rgba(20,80,130,.92)', size: LS }), label('구상 성단', [4.6, 3.3, 0], { color: 'rgba(130,70,10,.92)', size: LS }),
        label('별 수 적음(수십~수천 개) · 모양이 불규칙 · 푸른 젊은 별 · 원반(나선팔)에 있어요', [-4.6, -2.7, 0], { color: 'rgba(20,80,130,.92)', size: LS - 1.5 }),
        label('별 수 많음(수만~수십만 개) · 공 모양 · 붉은 늙은 별 · 헤일로·중심부에 있어요', [4.6, -3.3, 0], { color: 'rgba(130,70,10,.92)', size: LS - 1.5 })];
      cluLab.forEach((l) => l.show(false));
      // 성운: 가스 구름 + 별 + 빛의 길
      const nebG = new THREE.Group(); gX.add(nebG);
      const NEBC = [
        { name: '방출 성운', col: '#ff5a78', star: '#9fc4ff', txt: '<b>방출 성운</b>: 뜨거운 별빛(자외선)을 받은 가스가 <b>스스로 빛</b>을 내요. 주로 <b>붉게</b> 보여요. 예) 오리온 대성운', arrow: '#ff6a8a', rays: '스스로 빛을 내요' },
        { name: '반사 성운', col: '#6aa8ff', star: '#fff2d0', txt: '<b>반사 성운</b>: 주변 별빛을 먼지가 <b>반사</b>해서 보여요. 주로 <b>푸르게</b> 보여요.', arrow: '#6aa8ff', rays: '별빛을 반사해요' },
        { name: '암흑 성운', col: '#0a0b10', star: '#ffffff', txt: '<b>암흑 성운</b>: 짙은 가스와 먼지가 뒤쪽의 빛을 <b>가려서</b> 어둡게 보여요. 예) 말머리 성운', arrow: '#ffe08a', rays: '뒤쪽의 빛을 가려요' },
      ];
      const nebPts = [gaussP(900, 1.6, 1.2, 1.0, 0, 0, 0)].map((p) => p)[0];
      const nebCl = NEBC.map((n, i) => { const m = cloud(nebPts, n.col, i === 2 ? 26 : 16, i === 2 ? 1 : 0.22, i === 2 ? { blending: THREE.NormalBlending, opacity: 0.92 } : {}); m.visible = false; nebG.add(m); return m; });
      const backStars = cloud((() => { const a = []; for (let i = 0; i < 160; i++) a.push([-3.2 + rnd2() * 6.4, -2.6 + rnd2() * 5.2, -2.5 - rnd2() * 0.5]); return a; })(), '#e8f0ff', 5, 1, {}); backStars.visible = false; nebG.add(backStars);
      const starM = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), new THREE.MeshBasicMaterial({ color: 0x9fc4ff })); nebG.add(starM);
      const starGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color: 0xbfd6ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); starGlow.scale.set(2.2, 2.2, 1); nebG.add(starGlow);
      const eyeM = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 12), new THREE.MeshStandardMaterial({ color: 0x4f8cff, emissive: 0x1b3aa8, emissiveIntensity: 0.4 })); eyeM.position.set(7.0, 0, 0); nebG.add(eyeM);
      function mkAr(col, rad) { const g = new THREE.Group(), m = new THREE.MeshBasicMaterial({ color: col }); const sh = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 1, 8), m), hd = new THREE.Mesh(new THREE.ConeGeometry(rad * 2.4, rad * 6, 12), m); g.add(sh, hd); g.userData = { sh, hd, rad, m }; return g; }
      function setAr(g, a, b) { const d = new THREE.Vector3().subVectors(b, a), len = d.length(), { sh, hd, rad } = g.userData; if (len < 1e-3) { g.visible = false; return; } g.visible = true; const hl = Math.min(len * 0.5, rad * 6); sh.scale.y = Math.max(0.001, len - hl); sh.position.y = (len - hl) / 2; hd.scale.y = hl / (rad * 6); hd.position.y = len - hl / 2; g.position.copy(a); g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); }
      const arIn = mkAr(0xffe08a, 0.05), arOut = mkAr(0xff6a8a, 0.05); nebG.add(arIn, arOut);
      const arIn2 = mkAr(0xffe08a, 0.04), arOut2 = mkAr(0xff6a8a, 0.04); nebG.add(arIn2, arOut2);
      const nebA1 = new THREE.Object3D(), nebA3 = new THREE.Object3D(); nebA1.position.set(0, 2.4, 0); nebA3.position.set(3.2, 0.9, 0); nebG.add(nebA1, nebA3);
      const nebLab = [label('별', starM, { size: LS, offset: [0, -0.5, 0] }), label('가스·먼지 구름', nebA1, { size: LS }), label('지구에서 보는 쪽 (관측자)', eyeM, { size: LS, offset: [0, 0.6, 0] }), label('', nebA3, { size: LS - 1, color: 'rgba(120,60,0,.9)' })];
      nebLab.forEach((l) => l.show(false));
      const nebBtns = [];
      { const before = barEl.children.length; controls.segment('성운 종류', NEBC.map((n, i) => ({ value: i, label: n.name })), 0, (v) => { if (sim && sim.setNeb) sim.setNeb(v); nebK = v; }); [...barEl.children].slice(before).forEach((e) => nebBtns.push(e)); }
      let nebK = 0, xMode = '', savedX = null, xHid = [];
      let plx = null, xP = 0, xPlay = false;
      { const before = barEl.children.length; plx = controls.player({ duration: 16, loop: true, autoplay: false, label: '살펴보기', phases: [[0, '']], onFrame(p) { xPlay = true; xP = p; } }); }
      sideBtns();   // 성운 단추 · '살펴보기' 막대는 성단 · 성운 장면에서만 보여요
      function enterX(m) {
        if (xMode === m) return;
        if (!xMode) { savedX = { theta: orbit.theta, phi: orbit.phi, dist: orbit.dist, tx: orbit.tx, ty: orbit.ty, tz: orbit.tz, fov: camera.fov }; xHid = root.children.filter((c) => c !== gX && c.visible); xHid.forEach((c) => { c.visible = false; }); }
        xMode = m; mode = 'x'; gX.visible = true; xPlay = false; if (plx.playing) plx.pause();
        orbit.theta = 0; orbit.phi = 1.35; orbit.dist = (m === 'clu' ? 17 : 15) * (window.innerWidth < 600 ? 1.55 : 1); orbit.tx = 0; orbit.ty = 0; orbit.tz = 0; camera.fov = 45; camera.updateProjectionMatrix();
        openC.visible = globC.visible = m === 'clu'; nebG.visible = m === 'neb'; cluLab.forEach((l) => l.show(m === 'clu')); if (m === 'clu') nebLab.forEach((l) => l.show(false));
        updateLabels(); sideBtns(); lastXtxt = '';
      }
      function leaveX() {
        if (!xMode) return;
        xMode = ''; gX.visible = false; xHid.forEach((c) => { c.visible = true; }); xHid = []; if (savedX) { Object.assign(orbit, savedX); camera.fov = savedX.fov || 45; camera.updateProjectionMatrix(); }
        mode = 'out'; cluLab.forEach((l) => l.show(false)); nebLab.forEach((l) => l.show(false)); applyVis(); updateLabels(); sideBtns(); text();
      }
      let lastXtxt = ''; const setX = (h) => { if (h !== lastXtxt) { lastXtxt = h; info(h); } };
      function updX(dt, t) {
        const S = sim && sim.S, ph = document.querySelector('.v3-player .v3-ph');
        if (xMode === 'clu') {
          let tx = 0, dist = 17 * (window.innerWidth < 600 ? 1.55 : 1);
          if (xPlay) { const p = xP; tx = p < 0.4 ? -4.6 : p < 0.5 ? -4.6 + 9.2 * (p - 0.4) / 0.1 : 4.6; dist = 8 * (window.innerWidth < 600 ? 1.55 : 1); orbit.tx += (tx - orbit.tx) * Math.min(1, dt * 4); orbit.dist += (dist - orbit.dist) * Math.min(1, dt * 3); if (ph) ph.textContent = p < 0.45 ? '산개 성단' : '구상 성단'; }
          else if (ph) ph.textContent = '';
          openC.rotation.y += dt * 0.15; globC.rotation.y += dt * 0.1; openC.position.x = 0; 
          setX('<b>산개 성단 vs 구상 성단</b><br><b style="color:#9fc4ff">산개 성단</b>: 별이 수십~수천 개로 적고 모양이 <b>불규칙</b>해요. 푸른빛의 <b>젊은 별</b>이 많고 은하 <b>원반(나선팔)</b>에 있어요. 예) 플레이아데스(M45)<br><b style="color:#ffbf80">구상 성단</b>: 별이 수만~수십만 개로 많고 <b>공 모양</b>이에요. 붉은빛의 <b>늙은 별</b>이 많고 은하 <b>헤일로·중심부</b>에 있어요. 예) M13');
        } else if (xMode === 'neb') {
          const k = xPlay ? Math.min(2, Math.floor(xP * 3)) : (S && S.neb != null ? S.neb : nebK), N = NEBC[k];
          if (xPlay && sim && sim.setNeb && sim.S && sim.S.neb !== k) sim.setNeb(k);
          nebCl.forEach((m, i) => { m.visible = i === k; }); backStars.visible = k === 2;
          starM.visible = starGlow.visible = k !== 2; starM.material.color.set(N.star); starGlow.material.color.set(N.star); starGlow.scale.setScalar(2.0 + 0.2 * Math.sin(t * 3));
          starM.position.set(k === 1 ? -2.6 : 0, k === 1 ? 0.2 : 0, 0.2); starGlow.position.copy(starM.position);
          nebG.children.forEach(() => {});
          const q = (Math.sin(t * 2.2) + 1) / 2;
          // 빛의 길: 방출 = 별 → 가스 (자외선, 파랑) 그리고 가스 → 지구 (붉은 빛) / 반사 = 별 → 먼지 → 지구 (반사) / 암흑 = 뒤쪽 별빛이 구름에 막혀요
          const y0 = k === 2 ? 1.2 : 0;
          if (k === 0) { setAr(arIn, new THREE.Vector3(0.3, 0.3, 0.2), new THREE.Vector3(1.6, 0.9, 0.2)); arIn.userData.m.color.set('#9fc4ff'); setAr(arOut, new THREE.Vector3(2.2, 0.0, 0.2), new THREE.Vector3(6.2, 0.0, 0.2)); arOut.userData.m.color.set('#ff6a8a'); arIn2.visible = arOut2.visible = false; }
          else if (k === 1) { setAr(arIn, new THREE.Vector3(-2.2, 0.2, 0.2), new THREE.Vector3(-0.2, 0.2, 0.2)); arIn.userData.m.color.set('#fff2d0'); setAr(arOut, new THREE.Vector3(1.0, 0.0, 0.2), new THREE.Vector3(6.2, 0.0, 0.2)); arOut.userData.m.color.set('#6aa8ff'); arIn2.visible = arOut2.visible = false; }
          else { setAr(arIn, new THREE.Vector3(-3.0, 0.9, -0.6), new THREE.Vector3(-1.0, 0.9, -0.6)); arIn.userData.m.color.set('#ffe08a'); setAr(arIn2, new THREE.Vector3(-3.0, -0.6, -0.6), new THREE.Vector3(-1.0, -0.6, -0.6)); arIn2.userData.m.color.set('#ffe08a'); arOut.visible = arOut2.visible = false; }
          nebLab[0].show(k !== 2); nebLab[0].set(k === 0 ? '뜨거운 별' : '별'); nebLab[1].show(true); nebA1.position.set(0, 2.2, 0); nebLab[1].set(N.name + (k === 2 ? ' (짙은 가스·먼지)' : '')); nebLab[2].show(true);
          nebLab[3].show(true); nebLab[3].set(k === 2 ? '뒤쪽 별빛이 가려져 어두워요' : N.rays); nebA3.position.set(k === 2 ? 3.0 : 3.8, k === 2 ? 0.0 : 0.9, 0);
          if (ph) ph.textContent = xPlay ? N.name : '';
          setX(N.txt + '<br>빛이 어떻게 되는지에 따라 <b>방출 · 반사 · 암흑 성운</b>으로 나눠요.');
        }
      }
      let lastTiltT = null, k0 = 0;
      return {
        update(dt, tm) {
          const S = sim && sim.S;
          { const want = S && S.scene === 'cluster' ? 'clu' : S && S.scene === 'nebula' ? 'neb' : ''; if (want && want !== xMode) enterX(want); else if (!want && xMode) leaveX(); }
          { const w = !!(S && S.scene === 'disc' && !xMode && mode === 'out'); if (w !== sunCtlOn) { sunCtlOn = w; sunCtl.forEach((e) => { e.style.display = w ? '' : 'none'; }); } }
          if (xMode) { updX(dt, tm); return; }
          if (S && (k0++ % 3) === 0 && mode === 'out') {
            // 2D의 회전각 · 위/옆 보기를 따라가요 (재생 중에는 3D가 2D를 이끌어요)
            root.rotation.y = (S.yaw || 0) * DEG;
            if (S.tiltT !== lastTiltT || Math.abs((S.tilt || 0) - (S.tiltT || 0)) > 0.5) { lastTiltT = S.tiltT; orbit.phi = 0.06 + Math.max(0, Math.min(90, S.tilt || 0)) / 90 * 1.44; }
            readLesson();
          }
          if (mode === 'sun') root.rotation.y = 0;
          if (hazeM) hazeM.visible = mode === 'out';
          if (mode === 'sun') { // 카메라를 태양 자리에 두고, 끌면 보는 방향만 바꿔요
            const p = Math.max(0.05, Math.min(Math.PI - 0.05, orbit.phi)), d = 1;
            orbit.dist = d;
            orbit.tx = sunMesh.position.x - d * Math.sin(p) * Math.sin(orbit.theta);
            orbit.ty = sunMesh.position.y - d * Math.cos(p);
            orbit.tz = sunMesh.position.z - d * Math.sin(p) * Math.cos(orbit.theta);
          }
        },
        sync() { readLesson(); },
      };
    },
  });
})();
