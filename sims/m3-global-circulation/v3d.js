/* m3-global-circulation · 3D 지구본에서 보는 대기 대순환
   북반구·남반구의 세 순환(저위도 0~30° · 중위도 30~60° · 고위도 60~90°)을 세로 고리로, 위도별 지표 바람을 지구본 위 화살표로 보여 줘요.
   (2D 차시와 같은 이름·색: 저위도 #38bdf8 · 중위도 #a78bfa · 고위도 #fbbf24, 무역풍 #0ea5e9 · 편서풍 #8b5cf6 · 극동풍 #f59e0b) */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const narrow = window.innerWidth < 600 || window.innerHeight > window.innerWidth * 1.1;
  const D2R = Math.PI / 180;
  const CELLS = [
    { id: 'h', name: '저위도 순환', m: 15, w: 15, dir: 1, col: '#38bdf8', wind: 'trade' },
    { id: 'f', name: '중위도 순환', m: 45, w: 15, dir: -1, col: '#a78bfa', wind: 'west' },
    { id: 'p', name: '고위도 순환', m: 75, w: 15, dir: 1, col: '#fbbf24', wind: 'east' },
  ];
  // 지표 바람: 북반구는 2D 차시와 같아요 (무역풍 북동풍 · 편서풍 남서풍 · 극동풍 북동풍). v = (동, 북) 진행 방향
  const WINDS = {
    trade: { name: '무역풍', sub: '북동풍', col: '#0ea5e9', lat: 15, N: [-0.7, -0.7], S: [-0.7, 0.7], subS: '남동풍' },
    west: { name: '편서풍', sub: '남서풍', col: '#8b5cf6', lat: 45, N: [0.7, 0.7], S: [0.7, -0.7], subS: '북서풍' },
    east: { name: '극동풍', sub: '북동풍', col: '#f59e0b', lat: 75, N: [-0.7, -0.7], S: [-0.7, 0.7], subS: '남동풍' },
  };
  const LAND = {
    na: [[-165, 65], [-155, 71], [-125, 70], [-95, 72], [-80, 73], [-62, 60], [-55, 50], [-67, 45], [-76, 38], [-81, 31], [-80, 25], [-84, 30], [-90, 29], [-97, 25], [-97, 20], [-90, 18], [-87, 21], [-83, 15], [-79, 9], [-86, 11], [-93, 15], [-105, 20], [-110, 24], [-114, 31], [-118, 34], [-124, 40], [-125, 48], [-135, 58], [-150, 60], [-165, 60]],
    sa: [[-79, 9], [-72, 12], [-62, 10], [-50, 0], [-35, -5], [-39, -15], [-48, -26], [-58, -38], [-65, -45], [-70, -54], [-75, -48], [-73, -37], [-71, -20], [-76, -13], [-81, -5], [-80, 2]],
    eu: [[-10, 36], [-9, 43], [-2, 48], [5, 52], [10, 57], [5, 62], [15, 69], [30, 71], [60, 69], [80, 73], [110, 77], [140, 72], [170, 70], [180, 66], [165, 60], [155, 57], [142, 52], [135, 43], [128, 38], [127, 35], [122, 30], [120, 24], [110, 20], [106, 10], [100, 13], [103, 2], [98, 8], [92, 22], [88, 22], [80, 15], [77, 8], [72, 20], [67, 25], [57, 25], [57, 15], [52, 16], [44, 12], [34, 28], [35, 35], [27, 37], [23, 36], [12, 38], [8, 44], [3, 43], [-5, 36]],
    af: [[-17, 21], [-10, 30], [0, 35], [10, 37], [32, 31], [34, 28], [43, 12], [51, 12], [40, -5], [40, -15], [35, -25], [27, -34], [18, -34], [12, -17], [13, -5], [9, 3], [-8, 4], [-17, 14]],
    au: [[114, -22], [122, -18], [131, -12], [142, -11], [146, -19], [153, -26], [150, -37], [138, -35], [130, -32], [115, -34]],
    gl: [[-55, 60], [-40, 60], [-20, 70], [-20, 81], [-60, 82], [-72, 77], [-55, 68]],
    an: [[-180, -70], [180, -70], [180, -90], [-180, -90]],
  };

  const v3 = window.SciSim3D.attach({
    host: '.stage-card',
    button: '#ctrlCard',      // 실험 화면 위쪽에는 빈 곳이 없어서 조작 카드 맨 아래에 놓아요
    title: '대기 대순환 3D 지구본',
    hint: '드래그: 돌리기 · 두 손가락/휠: 확대',
    camera: { dist: narrow ? 7.4 : 4.8, theta: 0.3, phi: 1.42, target: narrow ? [0.45, 0.22, 0] : [0.4, 0.22, 0], min: 2.6, max: 11 },
    autoRotate: 0,
    levels: [1, 3],               // 2단계(순환 모형: 위치 표시는 3D 막대의 단추로)·4단계(열 운반·날씨 이동)는 3D. 1단계(위도별 에너지 그래프 읽기)·3단계(바람 카드 끌어 놓기)는 2D
    build(ctx) {
      const { THREE, root, camera, label, info, controls } = ctx;
      const V = THREE.Vector3;
      const P = (lat, lon, r) => new V(r * Math.cos(lat * D2R) * Math.sin(lon * D2R), r * Math.sin(lat * D2R), r * Math.cos(lat * D2R) * Math.cos(lon * D2R));
      const BANDS_N = ['저위도', '중위도', '고위도']; let bandSig = 99, view = 'cell', focus = 'all', hemi = 'N', spin = true, scene = 'flash', circ = true, circA = 1, latV = 0, tp = 0, sig = '';

      /* ---- 지구 (자전하는 그룹) ---- */
      const earth = new THREE.Group(); root.add(earth);
      const W = 1024, H = 512, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      const g = cv.getContext('2d');
      g.fillStyle = '#1f5f93'; g.fillRect(0, 0, W, H);
      const X = (lon) => (lon / 360 + 0.25) * W, Y = (lat) => (90 - lat) / 180 * H;
      g.fillStyle = '#5f9a4e'; g.strokeStyle = '#3f7a3a'; g.lineWidth = 1;
      Object.keys(LAND).forEach((k) => { for (let s = -1; s <= 1; s++) { g.beginPath(); LAND[k].forEach((p, i) => { const x = X(p[0]) + s * W, y = Y(p[1]); if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.closePath(); g.fillStyle = k === 'an' || k === 'gl' ? '#e8eef5' : '#5f9a4e'; g.fill(); g.stroke(); } });
      // 위도 띠 (2D 차시의 저·중·고위도 색)
      [[0, 30, '#38bdf8'], [30, 60, '#a78bfa'], [60, 90, '#fbbf24']].forEach(([a, b, c]) => { [1, -1].forEach((sg) => { g.fillStyle = c; g.globalAlpha = 0.2; const y0 = Y(sg > 0 ? b : -a), y1 = Y(sg > 0 ? a : -b); g.fillRect(0, y0, W, y1 - y0); }); });
      g.globalAlpha = 1; g.strokeStyle = 'rgba(255,255,255,.55)';
      [-60, -30, 0, 30, 60].forEach((la) => { g.lineWidth = la === 0 ? 2.4 : 1.2; g.beginPath(); g.moveTo(0, Y(la)); g.lineTo(W, Y(la)); g.stroke(); });
      g.lineWidth = 0.7; g.strokeStyle = 'rgba(255,255,255,.25)'; for (let lo = -180; lo < 180; lo += 30) { const x = X(lo); g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); g.beginPath(); g.moveTo(x + W, 0); g.lineTo(x + W, H); g.stroke(); }
      const tex = new THREE.CanvasTexture(cv); tex.anisotropy = 4;
      if ('encoding' in tex) tex.encoding = THREE.sRGBEncoding;
      earth.add(new THREE.Mesh(new THREE.SphereGeometry(1, 64, 40), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, metalness: 0 })));
      // 우리나라 (37°N 127.5°E)
      const kor = new THREE.Mesh(new THREE.SphereGeometry(0.02, 12, 10), new THREE.MeshBasicMaterial({ color: 0xef4444 })); kor.position.copy(P(37, 127.5, 1.01)); earth.add(kor);
      // 대기 (과장해서 두껍게)
      const atm = new THREE.Mesh(new THREE.SphereGeometry(1.45, 48, 32), new THREE.MeshBasicMaterial({ color: 0x7ab8ff, transparent: true, opacity: 0.05, side: THREE.BackSide, depthWrite: false }));
      root.add(atm);
      /* ---- 손전등 장면(위도별 에너지): 같은 빛이 위도에 따라 얼마나 퍼지는지 ---- */
      const beam = new THREE.Group(); root.add(beam);
      const beamBox = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 1), new THREE.MeshBasicMaterial({ color: 0xfff2a8, transparent: true, opacity: 0.32, depthWrite: false })); beam.add(beamBox);
      const spotMat = new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide });
      let spot = null; const sunLab = label('☀ 햇빛', [0, 0.1, 3.0], { color: 'rgba(161,98,7,.92)', size: 13 });
      function setBeam(lat) {
        const yc = Math.min(0.9, Math.sin(Math.min(lat, 90) * D2R)), h = 0.1, zc = Math.sqrt(1 - yc * yc);
        beamBox.position.set(0, yc, (zc + 3.2) / 2); beamBox.scale.z = 3.2 - zc;
        const yh = Math.min(1, yc + h), yl = Math.max(-1, yc - h), th0 = Math.acos(yh), th1 = Math.acos(yl), thc = (th0 + th1) / 2, d = Math.min(1.3, Math.asin(Math.min(1, h / Math.max(0.05, Math.sin(thc)))));
        if (spot) { root.remove(spot); spot.geometry.dispose(); }
        spot = new THREE.Mesh(new THREE.SphereGeometry(1.006, 28, 8, Math.PI / 2 - d, 2 * d, th0, th1 - th0), spotMat); root.add(spot);
      }
      // 적도·극축
      const axis = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 2.7, 6), new THREE.MeshBasicMaterial({ color: 0xcbd5e1, transparent: true, opacity: 0.5 })); root.add(axis);

      /* ---- 세 순환 (세로 고리, 공간에 고정) ---- */
      const loops = [];   // {cell, sg, curve, tube, parts[]}
      const cone = new THREE.ConeGeometry(0.032, 0.11, 8);
      function loopPt(c, u, sg) {
        const lat = (c.m - c.dir * c.w * Math.cos(u)) * sg, r = 1.25 + 0.2 * Math.sin(u);
        return new V(r * Math.cos(lat * D2R), r * Math.sin(lat * D2R), 0);
      }
      CELLS.forEach((c) => [1, -1].forEach((sg) => {
        const pts = []; for (let i = 0; i < 72; i++) pts.push(loopPt(c, (i / 72) * Math.PI * 2, sg));
        const curve = new THREE.CatmullRomCurve3(pts, true);
        const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 120, 0.011, 6, true), new THREE.MeshBasicMaterial({ color: c.col, transparent: true, opacity: 0.55 }));
        root.add(tube);
        const parts = [];
        for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(cone, new THREE.MeshStandardMaterial({ color: c.col, emissive: c.col, emissiveIntensity: 0.55, roughness: 0.4 })); root.add(m); parts.push({ m, t: i / 8, i }); }
        loops.push({ c, sg, curve, tube, parts });
      }));
      // 상승·하강 이름표 (북반구)
      const marks = [[0, '↑ 상승 기류', '0° · 구름·비', 'up'], [30, '↓ 하강 기류', '30° · 맑고 건조', 'down'], [60, '↑ 상승 기류', '60° · 구름·비', 'up'], [90, '↓ 하강 기류', '극(90°) · 맑고 건조', 'down']];
      const markLabs = marks.map(([la, a, b, k]) => {
        const o = new THREE.Object3D(); o.position.set(1.5 * Math.cos(la * D2R), 1.5 * Math.sin(la * D2R), 0); root.add(o);
        const L = label(narrow ? a.replace(' 기류', '') + ' ' + (la === 90 ? '극' : la + '°') : a + '<br><span style="font-weight:700;font-size:11px">' + b + '</span>', o, { color: k === 'up' ? 'rgba(22,101,52,.92)' : 'rgba(30,64,175,.92)', size: 12 });
        L.off = narrow ? [la === 90 ? 0.0 : 0.3, la === 90 ? 0.14 : 0, 0] : [la === 90 ? 0.42 : 0.38, la === 90 ? 0.12 : 0, 0]; L.full = L.el.innerHTML; L.bg = L.el.style.background; return L;
      });
      const cellLabs = CELLS.map((c) => { const o = new THREE.Object3D(); o.position.set(1.5 * Math.cos(c.m * D2R), 1.5 * Math.sin(c.m * D2R), 0.0); root.add(o); const L = label(narrow ? c.name.slice(0, 3) : c.name, o, { color: c.col, size: 12 }); L.el.style.color = '#10172a'; L.off = [narrow ? 0.2 : 0.3, 0, 0]; return L; });

      /* ---- 지표 바람 (지구와 함께 도는 화살표) ---- */
      const arrows = [];   // {band, sg, lat0, lon0, ve, vn, m, s}
      const arrowGeo = new THREE.ConeGeometry(0.03, 0.12, 8);
      Object.keys(WINDS).forEach((k) => {
        const w = WINDS[k];
        [1, -1].forEach((sg) => {
          const v = sg > 0 ? w.N : w.S, n = Math.hypot(v[0], v[1]);
          const NL = k === 'east' ? 6 : 8;
          for (let i = 0; i < NL; i++) {
            const lon0 = (i / NL) * 360 + (k === 'west' ? 20 : k === 'east' ? 40 : 0);
            for (let j = 0; j < 2; j++) {
              const m = new THREE.Mesh(arrowGeo, new THREE.MeshStandardMaterial({ color: w.col, emissive: w.col, emissiveIntensity: 0.6, roughness: 0.4 }));
              earth.add(m); arrows.push({ k, sg, lat0: w.lat * sg, lon0, ve: v[0] / n, vn: v[1] / n, m, ph: j * 0.5 + (i % 2) * 0.25 });
            }
          }
        });
      });
      const ARC = 0.42;   // 화살표가 한 번에 움직이는 거리 (라디안)
      // 바람 이름표 (지구에 붙어 같이 돌아요)
      const windLabs = Object.keys(WINDS).map((k) => {
        const w = WINDS[k], o = new THREE.Object3D(); o.position.copy(P(w.lat, 8, 1.03)); earth.add(o);
        const L = label(w.name + ' <span style="font-weight:700">(' + w.sub + ')</span>', o, { color: w.col, size: 12 }); L.k = k; L.o = o; L.off = [0, 0.07, 0]; return L;
      });
      const korLab = label('우리나라', kor, { color: 'rgba(185,28,28,.92)', size: 12 }); korLab.off = [0, 0.06, 0];

      /* ---- 열 운반(role): 저위도의 남는 열 → 고위도, 위도별 에너지 남음(+)/부족(−) ---- */
      const NPK = 14, packI = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 12, 8), new THREE.MeshStandardMaterial({ color: 0xfb923c, emissive: 0xea580c, emissiveIntensity: 0.8, roughness: 0.4 }), NPK * 2); root.add(packI); packI.visible = false;
      const packLab = label('🔥 저위도의 남는 열 → 고위도로', [1.5 * Math.cos(40 * D2R) + 0.2, 1.5 * Math.sin(40 * D2R) + 0.28, 0], { color: 'rgba(120,53,15,.9)', size: 12 }); packLab.show(false);
      const BAND = [[0, 30, 15], [30, 60, 45], [60, 90, 75]];
      const bandM = BAND.map((b, i) => { const th0 = (90 - b[1]) * D2R, th1 = (90 - b[0]) * D2R; const m = new THREE.Mesh(new THREE.SphereGeometry(1.012, 48, 6, 0, Math.PI * 2, th0, th1 - th0), new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.3, depthWrite: false })); earth.add(m); m.visible = false; return m; });
      const bandLab = BAND.map((b, i) => { const o = new THREE.Object3D(); o.position.set(1.04 * Math.cos(b[2] * D2R), 1.04 * Math.sin(b[2] * D2R), 0); root.add(o); const L = label('', o, { size: 13, color: 'rgba(21,128,61,.92)' }); L.off = [-0.12, 0, 0]; L.show(false); return L; });
      /* ---- 날씨 이동(sat): 구름과 황사가 편서풍을 타고 서 → 동 (지구에 붙어 있어요) ---- */
      const NCL = 7, cloudGrp = []; const puffG2 = new THREE.SphereGeometry(1, 12, 8), cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0.92 });
      const SYSV = [[0.2, 0.15], [0.55, 0.3], [0.9, 0.5], [0.35, 0.7], [0.75, 0.85], [0.05, 0.45], [0.65, 0.58]];
      for (let i = 0; i < NCL; i++) { const g = new THREE.Group(); for (let j = 0; j < 4; j++) { const m = new THREE.Mesh(puffG2, cloudMat); m.userData = { dx: (j - 1.5) * 0.035, dz: ((j * 7) % 3 - 1) * 0.02, r: 0.03 + (j % 2) * 0.012 }; g.add(m); } earth.add(g); g.visible = false; cloudGrp.push(g); }
      const NDU = 26, dustI = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshStandardMaterial({ color: 0xe0b050, roughness: 1, transparent: true, opacity: 0.6 }), NDU); earth.add(dustI); dustI.visible = false;
      const dustSeed = []; for (let i = 0; i < NDU; i++) dustSeed.push({ a: Math.random() * 6.28, d: Math.sqrt(Math.random()), r: 0.016 + Math.random() * 0.018 });
      const gobi = new THREE.Object3D(); gobi.position.copy(P(42, 104, 1.01)); earth.add(gobi);
      const gobiLab = label('황사 발원지(사막)', gobi, { color: 'rgba(146,98,12,.92)', size: 12 }); gobiLab.off = [0, 0.06, 0]; gobiLab.show(false);
      const westO = new THREE.Object3D(); westO.position.copy(P(47, 118, 1.03)); earth.add(westO);
      const westLab = label('편서풍: 서쪽 → 동쪽', westO, { color: '#8b5cf6', size: 12 }); westLab.off = [0, 0.1, 0]; westLab.show(false);
      let faced = false;
      const dm2 = new THREE.Object3D(), tN = new V(), tE = new V();
      const wp = new V(), nrm = new V(), eastV = new V(), northV = new V(), head = new V(), up = new V(0, 1, 0);
      function layout() {
        const S = ((ctx.lesson() || {}).S) || {};
        scene = S.scene || 'flash'; focus = scene === 'cells' ? (S.focus || 'all') : 'all'; circ = S.circ !== false; circA = S.circA == null ? 1 : S.circA; latV = S.lat || 0;
        view = scene === 'wind' ? 'wind' : scene === 'role' ? 'both' : scene === 'cells' ? 'cell' : 'none';
        const rl = scene === 'role', st = scene === 'sat';
        const showCells = view === 'cell' || view === 'both', showWind = view === 'wind' || view === 'both';
        const fl = scene === 'flash'; if (typeof plRow !== 'undefined' && plRow) plRow.style.display = fl ? 'none' : ''; beam.visible = fl; if (spot) spot.visible = fl; sunLab.show(fl);
        if (fl) setBeam(latV);
        packI.visible = rl; packLab.show(rl && circ); bandM.forEach((m) => { m.visible = rl; }); bandLab.forEach((L) => L.show(rl));
        cloudGrp.forEach((g) => { g.visible = st; }); dustI.visible = st; gobiLab.show(st); westLab.show2 = st; if (!st) westLab.show(false); if (st && !faced) faced = true; if (!st) faced = false;
        if (typeof globeRow !== 'undefined') globeRow.forEach((e) => { e.style.display = st || fl ? 'none' : ''; });
        if (typeof circRow !== 'undefined') { circRow.forEach((e) => { e.style.display = rl ? '' : 'none'; }); sceneRow.forEach((e) => { e.style.display = (rl || st) && (S.lv >= 3 || S.free) ? '' : 'none'; }); if (st && plRow) plRow.style.display = 'none'; }
        const dim = scene === 'role' && !circ; 
        loops.forEach((L) => {
          const on = showCells && (hemi === 'both' || L.sg > 0) && (focus === 'all' || focus === L.c.id);
          L.tube.visible = showCells && (hemi === 'both' || L.sg > 0);
          L.tube.material.opacity = dim ? 0.1 : on ? 0.6 : 0.12;
          L.parts.forEach((p) => { p.m.visible = on && !dim; });
        });
        const fw = focus === 'all' ? null : WINDS[CELLS.find((c) => c.id === focus).wind];
        arrows.forEach((a) => { a.m.visible = showWind && (hemi === 'both' || a.sg > 0) && (!fw || WINDS[a.k] === fw); });
        markLabs.forEach((L) => L.show(showCells && focus === 'all' && scene === 'cells'));
        cellLabs.forEach((L, i) => L.show(showCells && (focus === 'all' || focus === CELLS[i].id)));
        windLabs.forEach((L) => { L.show2 = showWind && (!fw || WINDS[L.k] === fw); });
        korLab.show2 = scene !== 'flash';
        writeInfo(S);
      }
      const f0 = (v) => (v >= 0 ? '+' : '') + Math.round(v);
      function writeInfo(S) {
        const parts = [];
        const c = CELLS.find((x) => x.id === focus), W2 = c && WINDS[c.wind];
        if (scene === 'flash') {
          const k = 1 / Math.max(0.05, Math.cos(Math.min(latV, 87) * D2R));
          parts.push('<b>🔦 위도 ' + Math.round(latV) + '°</b>에 같은 빛을 비춰요.<br>빛이 퍼지는 넓이는 적도의 약 <b>' + k.toFixed(1) + '배</b>' + (latV < 8 ? ' (적도: 빛이 가장 모여요)' : ''));
          parts.push('<span style="color:#fcd34d">고위도일수록 같은 빛이 넓게 퍼져서 단위 면적당 받는 태양 에너지가 적어요.</span>');
        } else if (scene === 'role') {
          parts.push('위도별 에너지: 저위도 <b>' + f0(S.surpA ? S.surpA[0] : 0) + '</b> · 중위도 <b>' + f0(S.surpA ? S.surpA[1] : 0) + '</b> · 고위도 <b>' + f0(S.surpA ? S.surpA[2] : 0) + '</b>');
          parts.push(circ ? '<b>🌀 대기 대순환 작동</b>: 열이 저위도에서 고위도로 옮겨져요.<br>에너지가 남는 저위도와 부족한 고위도의 차이가 줄어요.' : '<b>⏸ 대순환이 멈춘다고 가정</b>: 열이 옮겨지지 않아 저위도는 더 남고 고위도는 더 부족해져요.');
          if (circ) parts.push('지표 바람: <b>무역풍·편서풍·극동풍</b>');
        } else if (scene === 'sat') {
          parts.push('<b>🛰️ 날씨 이동</b>: 중위도에서는 <b>편서풍</b>이 불어 구름과 <b style="color:#fcd34d">황사</b>가 <b>서쪽에서 동쪽</b>으로 움직여요.<br>그래서 우리나라(약 37°N) 날씨는 서쪽에서부터 바뀌어요.');
        } else if (focus === 'all' && scene === 'cells') {
          parts.push(markAsk ? '<b>순환 3개</b>가 위도마다 세로 고리를 이뤄요.<br>고리의 화살표를 따라가 보고, 공기가 <b>올라가는 곳</b>과 <b>내려오는 곳</b>을 아래 <b>표시</b> 단추로 정해요.' : '<b>순환 3개</b>가 위도마다 세로 고리를 이뤄요.<br><b style="color:#86efac">상승</b> 0°·60° (구름·비) · <b style="color:#93c5fd">하강</b> 30°·극 (맑고 건조)');
        } else if (scene === 'wind') {
          parts.push('<b>무역풍(북동풍)</b> 0~30° · <b>편서풍(남서풍)</b> 30~60° · <b>극동풍(북동풍)</b> 60~90°<br>북반구에서 지표 바람은 비스듬히 불어요.');
        } else if (focus === 'h') parts.push('<b style="color:#38bdf8">저위도 순환</b>: 적도에서 <b>상승</b> → 높은 곳에서 30° 쪽으로 이동 → 30°에서 <b>하강</b> → 지표에서 적도로 되돌아와요. 지표 바람은 <b>무역풍</b>이에요.');
        else if (focus === 'f') parts.push('<b style="color:#a78bfa">중위도 순환</b>: 30°에서 <b>하강</b> → 지표에서 60° 쪽으로 이동 → 60°에서 <b>상승</b> → 높은 곳에서 30° 쪽으로 되돌아가요. 지표 바람은 <b>편서풍</b>이에요.');
        else if (focus === 'p') parts.push('<b style="color:#fbbf24">고위도 순환</b>: 60°에서 <b>상승</b> → 높은 곳에서 극으로 이동 → 극에서 <b>하강</b> → 지표에서 60° 쪽으로 되돌아와요. 지표 바람은 <b>극동풍</b>이에요.');
        if (scene !== 'flash' && hemi === 'both') parts.push('<span style="color:#ffd34d">남반구</span>는 거울처럼 대칭이에요. 지표 바람은 북반구와 반대로 비스듬히 불어요.');
        if (scene !== 'flash') parts.push('<span style="color:#fca5a5">●</span> 우리나라 (약 37°N, 편서풍 지역)');
        info(parts.join('<br>'));
      }
      const ctlHost = ctx.controls.text('').parentNode, tail = (fn) => { const n0 = ctlHost.children.length; fn(); return Array.from(ctlHost.children).slice(n0); };
      let spB = null;
      const globeRow = tail(() => {      // 반구 · 자전: 날씨 이동(지구본을 우리나라 쪽으로 고정)에서는 숨겨요
        controls.segment('반구', [{ value: 'N', label: '북반구' }, { value: 'both', label: '양쪽' }], hemi, (v) => { hemi = v; sig = ''; });
        spB = controls.button('🌍 자전 ✓', () => { spin = !spin; spB.classList.toggle('on', spin); spB.textContent = '🌍 자전 ' + (spin ? '✓' : '✕'); }); spB.classList.add('on');
      });
      /* ▶ 공기의 순환 한 바퀴 (한 고리를 따라 상승 → 이동 → 하강 → 지표에서 되돌아옴) */
      const plr = controls.player({
        duration: 10, loop: true, autoplay: true, label: '공기 순환',
        phases: [[0, '상승 기류'], [0.12, '높은 곳에서 이동'], [0.42, '하강 기류'], [0.56, '지표 부근에서 이동'], [0.92, '상승 기류']],
        onFrame(p) { tp = p; },
      });
      const plRow = Array.from(ctx.controls.text('').parentNode.querySelectorAll('.v3-player'))[0];
      const sceneRow = tail(() => controls.segment('화면', [{ value: 'role', label: '🔥 열 운반' }, { value: 'sat', label: '🛰️ 날씨 이동' }], 'role', (v) => { const b = document.querySelector('#sceneSeg button[data-s="' + v + '"]'); if (b) b.click(); }));
      const circRow = tail(() => controls.segment('대순환', [{ value: '0', label: '⏸ 멈춘다고 가정' }, { value: '1', label: '🌀 작동' }], '1', (v) => { const b = document.querySelector('#circSeg button[data-c="' + v + '"]'); if (b) b.click(); }));
      /* 📍 상승·하강 표시(2단계): 2D 단면의 동그라미 누르기(markLat)와 같아요. 누를 때마다 ? → ↑ → ↓ */
      const MK = [[0, '0°'], [30, '30°'], [60, '60°'], [90, '극']];
      let mkBtns = [], markAsk = false;
      const markRow = tail(() => { controls.text('<b>표시</b>'); mkBtns = MK.map(([la, nm]) => controls.button(nm + ' ?', () => { const L = ctx.lesson(); if (L && L.markLat) L.markLat(la); })); });
      function markSync(S) {
        const on = scene === 'cells' && S.lv === 1 && !S.free;
        markRow.forEach((e) => { e.style.display = on ? '' : 'none'; });
        /* 표시하는 동안에는 정답 이름표 대신 학생이 고른 표시를 보여 줘요 (모두 맞히면 원래 이름표) */
        const allOK = marks.every(([la, , , k]) => (S.marks || {})[la] === k), ask = on && !allOK;
        markLabs.forEach((L, i) => { const [la, , , k] = marks[i], v = (S.marks || {})[la], nm = la === 90 ? '극' : la + '°';
          const h = ask ? (v ? (v === 'up' ? '↑ 상승' : '↓ 하강') + ' ' + nm : nm + ' ?') : L.full;
          if (L.el.innerHTML !== h) { L.el.innerHTML = h; L.el.style.background = ask ? (v === 'up' ? 'rgba(22,101,52,.92)' : v === 'down' ? 'rgba(30,64,175,.92)' : 'rgba(51,65,85,.92)') : L.bg; } });
        markAsk = ask;
        if (on) mkBtns.forEach((b, i) => { const v = (S.marks || {})[MK[i][0]], tx = MK[i][1] + ' ' + (v === 'up' ? '↑' : v === 'down' ? '↓' : '?'); if (b.textContent !== tx) b.textContent = tx; b.classList.toggle('on', !!v); });
      }
      layout();

      return {
        update(dt, t) {
          const S = ((ctx.lesson() || {}).S) || {};
          const ns = [S.scene, S.focus, S.circ, Math.round(S.lat || 0), hemi, markAsk].join('|');
          if (ns !== sig) { sig = ns; layout(); }
          markSync(S);
          if (spin && scene !== 'flash' && scene !== 'sat') earth.rotation.y += 0.22 * dt;            // 서 → 동 (북극 위에서 보면 반시계 방향)
          else if (scene === 'flash') earth.rotation.y = 0;
          const run = !(scene === 'role' && !circ);
          if (scene === 'role') {
            const pk = S.packets || [], ca = S.circA == null ? 1 : S.circA;
            for (let i = 0; i < NPK * 2; i++) {
              const q = pk[i % NPK], sg = i < NPK ? 1 : -1; let sc2 = 0;
              if (q && (i < NPK || hemi === 'both')) { const u = q.u, lat = (4 + u * 82) * sg, r = 1.52 + Math.sin(u * 9) * 0.02; dm2.position.set(r * Math.cos(lat * D2R), r * Math.sin(lat * D2R), 0); sc2 = Math.sin(u * Math.PI) * ca; }
              dm2.scale.setScalar(Math.max(0.0001, sc2)); dm2.rotation.set(0, 0, 0); dm2.updateMatrix(); packI.setMatrixAt(i, dm2.matrix);
            } packI.instanceMatrix.needsUpdate = true;
            const sa = S.surpA || [3, -2, -4];
            bandM.forEach((m, i) => { const v = sa[i]; m.material.color.set(v >= 0 ? 0x22c55e : 0xef4444); m.material.opacity = 0.2 + 0.5 * Math.min(1, Math.abs(v) / 44) + 0.08; bandLab[i].set(BANDS_N[i] + ' <b>' + f0(v) + '</b>'); bandLab[i].el.style.background = v >= 0 ? 'rgba(21,128,61,.92)' : 'rgba(185,28,28,.92)'; });
            if (circ !== (S.circ !== false) || Math.abs(circA - (S.circA == null ? 1 : S.circA)) > 0.02) { sig = ''; }
            else if (Math.round(sa[2]) !== bandSig) { bandSig = Math.round(sa[2]); writeInfo(S); }
          }
          if (scene !== 'sat') { earth.rotation.x = 0; earth.scale.setScalar(1); atm.scale.setScalar(1); }
          if (scene === 'sat') {
            earth.scale.setScalar(narrow ? 1.9 : 1.55); earth.rotation.x = 0.6; atm.scale.setScalar(1.3);
            if (faced === true) { const az = Math.atan2(camera.position.x, camera.position.z); earth.rotation.y = az - 127.5 * D2R + 0.0; faced = 'done'; }
            cloudGrp.forEach((g, i) => {
              const sv = SYSV[i], u = ((sv[0] + t * 0.022) % 1.4) - 0.2, lon = 95 + u * 55, lat = 58 - sv[1] * 36, fade = Math.max(0, Math.min(1, (u + 0.2) * 5, (1.2 - u) * 5));
              g.position.copy(P(lat, lon, 1.012)); tN.set(-Math.sin(lat * D2R) * Math.sin(lon * D2R), Math.cos(lat * D2R), -Math.sin(lat * D2R) * Math.cos(lon * D2R)); tE.set(Math.cos(lon * D2R), 0, -Math.sin(lon * D2R));
              g.children.forEach((m) => { m.position.copy(tE).multiplyScalar(m.userData.dx * 2.2).addScaledVector(tN, m.userData.dz * 2.2); m.scale.set(m.userData.r * 1.8 * fade, m.userData.r * 0.55 * fade, m.userData.r * 1.5 * fade); m.lookAt(g.position.clone().multiplyScalar(2)); });
              g.lookAt(g.position.clone().multiplyScalar(2));
            });
            const cyc = 16, p = (t % cyc) / cyc, e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2, a = Math.sin(p * Math.PI), clat = 42 + (37.2 - 42) * e, clon = 104 + (128 - 104) * e, spread = (0.02 + p * 0.06);
            const cP = P(clat, clon, 1.012); const nN = new V(-Math.sin(clat * D2R) * Math.sin(clon * D2R), Math.cos(clat * D2R), -Math.sin(clat * D2R) * Math.cos(clon * D2R)), nE = new V(Math.cos(clon * D2R), 0, -Math.sin(clon * D2R));
            dustSeed.forEach((q, i) => { dm2.position.copy(cP).addScaledVector(nE, Math.cos(q.a) * q.d * spread * 1.6).addScaledVector(nN, Math.sin(q.a) * q.d * spread); dm2.scale.setScalar(Math.max(0.0001, q.r * a * 1.3)); dm2.rotation.set(0, 0, 0); dm2.updateMatrix(); dustI.setMatrixAt(i, dm2.matrix); }); dustI.instanceMatrix.needsUpdate = true;
            westO.getWorldPosition(wp); nrm.copy(wp).normalize(); westLab.show(nrm.dot(camera.position.clone().sub(wp).normalize()) > 0.2);
            gobi.getWorldPosition(wp); nrm.copy(wp).normalize(); gobiLab.show(p < 0.9 && nrm.dot(camera.position.clone().sub(wp).normalize()) > 0.2);
          }
          loops.forEach((L) => {
            if (!L.parts[0].m.visible) return;
            L.parts.forEach((p) => {
              p.t = ((run ? tp : 0) + p.i / 8) % 1;
              const pos = L.curve.getPointAt(p.t), tg = L.curve.getTangentAt(p.t);
              p.m.position.copy(pos); p.m.quaternion.setFromUnitVectors(up, tg);
            });
          });
          arrows.forEach((a) => {
            if (!a.m.visible) return;
            const s = ((run ? tp : 0) + a.ph) % 1;
            const lat = a.lat0 + a.vn * ARC * s / D2R, lon = a.lon0 + a.ve * ARC * s / Math.cos(a.lat0 * D2R) / D2R;
            a.m.position.copy(P(lat, lon, 1.02));
            const la = lat * D2R, lo = lon * D2R;
            eastV.set(Math.cos(lo), 0, -Math.sin(lo));
            northV.set(-Math.sin(la) * Math.sin(lo), Math.cos(la), -Math.sin(la) * Math.cos(lo));
            head.copy(eastV).multiplyScalar(a.ve).addScaledVector(northV, a.vn).normalize();
            a.m.quaternion.setFromUnitVectors(up, head);
            const k = Math.sin(Math.PI * s); a.m.scale.setScalar(0.35 + 0.65 * k);
          });
          windLabs.forEach((L) => { L.o.getWorldPosition(wp); nrm.copy(wp).normalize(); L.show(!!L.show2 && nrm.dot(camera.position.clone().sub(wp).normalize()) > 0.25 && (hemi === 'both' || true)); });
          kor.getWorldPosition(wp); nrm.copy(wp).normalize(); korLab.show(korLab.show2 !== false && nrm.dot(camera.position.clone().sub(wp).normalize()) > 0.2);
        },
      };
    },
  });
  if (v3 && v3.button) { v3.button.style.alignSelf = 'flex-start'; v3.button.style.marginTop = '2px'; }
})();
