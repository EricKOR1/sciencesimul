/* m2-milky-way · 3D 우리은하 모형
   바깥에서 본 막대 나선 은하(원반·팽대부·헤일로)와, 태양계 자리에서 본 하늘(은하수 띠)을 오가며 확인해요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const TAU = Math.PI * 2, DEG = Math.PI / 180;
  const GR = 50;                         // 은하 반지름 5만 광년 (단위: 천 광년)
  const SUN_R = 26;                      // 태양계: 중심에서 약 2.6만 광년 (수업: 약 3만 광년)
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
    autoRotate: 0.1,
    build(ctx) {
      const { THREE, root, camera, label, info, controls, orbit } = ctx;
      const R = rng(2024);
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
      const labSun = label('☀ 태양계', sunMesh, { color: 'rgba(120,80,0,.92)', offset: [0, 3.5, 0], size: LS });
      const labCen = label('은하 중심', [0, 0, 0], { color: 'rgba(60,40,0,.85)', offset: [0, 6, 0], size: LS });
      const labDist = label('약 3만 광년', [0, 0, 0], { color: 'rgba(90,70,0,.9)', offset: [0, -3, 0], size: LS });
      const labDia = label('지름 약 10만 광년', [0, 0, GR], { color: 'rgba(20,40,90,.9)', offset: [0, 3, 3], size: LS });
      const labOpen = label('산개 성단', opens[3], { color: 'rgba(20,80,130,.92)', offset: [0, 3.2, 0], size: LS });
      const labGlob = label('구상 성단', fixedGlob, { color: 'rgba(130,70,10,.92)', offset: [0, 3.6, 0], size: LS });
      const labHalo = label('헤일로', G(-28, -18, 26), { color: 'rgba(120,50,30,.8)', size: LS });
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
        labSun.show(out); labCen.show(out); labDia.show(out); labDist.show(out); distLine.visible = out;
        labOpen.show(out && showOpen); labGlob.show(out && showGlob); labHalo.show(out && showHalo);
        labBand.show(!out); labUp.show(!out); labGC.show(!out);
        if (!out) {
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
          info('<b>바깥에서 본 우리은하</b><br>중심에 <b>막대</b>가 있는 <b>나선</b> 모양이고, 지름은 약 <b>10만 광년</b>이에요. 원반은 아주 얇고 중심부만 볼록해요.<br>' +
            '태양계는 중심에서 약 3만 광년(관측값 약 2.6만 광년) 떨어진 나선팔 위에 있어요.');
        } else {
          info('<b>☀ 태양계에서 본 하늘</b><br>태양계는 원반 <b>안쪽</b>에 있어서, 원반 방향으로는 별이 겹쳐 <b>은하수 띠</b>로 보여요. 원반 위·아래 방향은 별이 적어요.<br>끌어서 둘러봐요.');
        }
      }

      const viewSeg = controls.segment('보는 곳', [{ value: 'out', label: '🌌 바깥에서' }, { value: 'sun', label: '☀ 태양계에서' }], 'out', (v) => { if (v === 'sun') toSun(); else toOut(); sideBtns(); });
      const upB = controls.button('⬆ 위에서', () => { if (mode === 'out') { orbit.phi = 0.06; orbit.theta = 0; } });
      const sideB = controls.button('➡ 옆에서', () => { if (mode === 'out') { orbit.phi = 1.5; orbit.theta = 0.3; } });
      const openB = controls.button('산개 성단 ✓', () => { showOpen = !showOpen; openB.classList.toggle('on', showOpen); openB.textContent = '산개 성단 ' + (showOpen ? '✓' : '✕'); applyVis(); updateLabels(); }); openB.classList.add('on');
      const globB = controls.button('구상 성단 ✓', () => { showGlob = !showGlob; globB.classList.toggle('on', showGlob); globB.textContent = '구상 성단 ' + (showGlob ? '✓' : '✕'); applyVis(); updateLabels(); }); globB.classList.add('on');
      const haloB = controls.button('헤일로 ✓', () => { showHalo = !showHalo; haloB.classList.toggle('on', showHalo); haloB.textContent = '헤일로 ' + (showHalo ? '✓' : '✕'); applyVis(); updateLabels(); }); haloB.classList.add('on');
      function sideBtns() { const o = mode === 'out'; upB.style.display = o ? '' : 'none'; sideB.style.display = o ? '' : 'none'; }
      sideBtns();

      function readLesson() { // 수업에서 학생이 ☀를 놓았다면 그 자리를 따라가요 (읽기만)
        try {
          const s = sim && sim.S && sim.S.sun;
          if (s && s.mode === 'placed' && isFinite(s.gx) && isFinite(s.gy) && Math.hypot(s.gx, s.gy) > 3) { sun = { x: s.gx, y: s.gy }; } else sun = { x: sunBase[0], y: sunBase[1] };
        } catch (e) { sun = { x: sunBase[0], y: sunBase[1] }; }
        let bi = 0, bd = 1e9; // 태양 바깥쪽 가까이의 산개 성단 하나에 이름표
        opens.forEach((o, i) => { const d = Math.hypot(o[0] - sun.x * 1.3, o[2] + sun.y * 1.3); if (d < bd) { bd = d; bi = i; } });
        labOpen.obj = opens[bi];
        placeSun(); labDist.obj = [sunMesh.position.x * 0.55, 0, sunMesh.position.z * 0.55];
        distLine.geometry.setFromPoints([new THREE.Vector3(0, 0, 0), sunMesh.position.clone()]);
        localCloud.position.set(sunMesh.position.x, sunMesh.position.y, sunMesh.position.z);
        updateLabels();
      }
      readLesson(); applyVis(); text();

      return {
        update() {
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
