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
    build(ctx) {
      const { THREE, root, camera, label, info, controls } = ctx;
      const V = THREE.Vector3;
      const P = (lat, lon, r) => new V(r * Math.cos(lat * D2R) * Math.sin(lon * D2R), r * Math.sin(lat * D2R), r * Math.cos(lat * D2R) * Math.cos(lon * D2R));
      let view = 'both', focus = 'all', hemi = 'N', spin = true;

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
        for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(cone, new THREE.MeshStandardMaterial({ color: c.col, emissive: c.col, emissiveIntensity: 0.55, roughness: 0.4 })); root.add(m); parts.push({ m, t: i / 8 }); }
        loops.push({ c, sg, curve, tube, parts });
      }));
      // 상승·하강 이름표 (북반구)
      const marks = [[0, '↑ 상승 기류', '0° · 구름·비', 'up'], [30, '↓ 하강 기류', '30° · 맑고 건조', 'down'], [60, '↑ 상승 기류', '60° · 구름·비', 'up'], [90, '↓ 하강 기류', '극(90°) · 맑고 건조', 'down']];
      const markLabs = marks.map(([la, a, b, k]) => {
        const o = new THREE.Object3D(); o.position.set(1.5 * Math.cos(la * D2R), 1.5 * Math.sin(la * D2R), 0); root.add(o);
        const L = label(narrow ? a.replace(' 기류', '') + ' ' + (la === 90 ? '극' : la + '°') : a + '<br><span style="font-weight:700;font-size:11px">' + b + '</span>', o, { color: k === 'up' ? 'rgba(22,101,52,.92)' : 'rgba(30,64,175,.92)', size: 12 });
        L.off = narrow ? [la === 90 ? 0.0 : 0.3, la === 90 ? 0.14 : 0, 0] : [la === 90 ? 0.42 : 0.38, la === 90 ? 0.12 : 0, 0]; return L;
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

      const wp = new V(), nrm = new V(), eastV = new V(), northV = new V(), head = new V(), up = new V(0, 1, 0);
      function layout() {
        const showCells = view !== 'wind', showWind = view !== 'cell';
        loops.forEach((L) => {
          const on = showCells && (hemi === 'both' || L.sg > 0) && (focus === 'all' || focus === L.c.id);
          L.tube.visible = showCells && (hemi === 'both' || L.sg > 0);
          L.tube.material.opacity = on ? 0.6 : 0.12;
          L.parts.forEach((p) => { p.m.visible = on; });
        });
        arrows.forEach((a) => { a.m.visible = showWind && (hemi === 'both' || a.sg > 0) && (focus === 'all' || WINDS[a.k] === WINDS[CELLS.find((c) => c.id === focus).wind]); });
        markLabs.forEach((L) => L.show(showCells && focus === 'all'));
        cellLabs.forEach((L, i) => L.show(showCells && (focus === 'all' || focus === CELLS[i].id)));
        windLabs.forEach((L) => { L.show2 = showWind && (focus === 'all' || WINDS[L.k] === WINDS[CELLS.find((c) => c.id === focus).wind]); });
        writeInfo();
      }
      function writeInfo() {
        const parts = [];
        const c = CELLS.find((x) => x.id === focus), W2 = c && WINDS[c.wind];
        if (focus === 'all') {
          parts.push('<b>순환 3개</b>가 위도마다 세로 고리를 이뤄요.<br><b style="color:#86efac">상승</b> 0°·60° (구름·비) · <b style="color:#93c5fd">하강</b> 30°·극 (맑고 건조)');
          if (view !== 'cell') parts.push('지표 바람: <b>무역풍·편서풍·극동풍</b> (비스듬히 불어요)');
        } else if (focus === 'h') parts.push('<b style="color:#38bdf8">저위도 순환</b>: 적도에서 <b>상승</b> → 높은 곳에서 30° 쪽으로 이동 → 30°에서 <b>하강</b> → 지표에서 적도로 되돌아와요. 지표 바람은 <b>무역풍</b>이에요.');
        else if (focus === 'f') parts.push('<b style="color:#a78bfa">중위도 순환</b>: 30°에서 <b>하강</b> → 지표에서 60° 쪽으로 이동 → 60°에서 <b>상승</b> → 높은 곳에서 30° 쪽으로 되돌아가요. 지표 바람은 <b>편서풍</b>이에요.');
        else parts.push('<b style="color:#fbbf24">고위도 순환</b>: 60°에서 <b>상승</b> → 높은 곳에서 극으로 이동 → 극에서 <b>하강</b> → 지표에서 60° 쪽으로 되돌아와요. 지표 바람은 <b>극동풍</b>이에요.');
        if (hemi === 'both' && focus === 'all') parts.push('<span style="color:#ffd34d">남반구</span>는 거울처럼 대칭이고, 지표 바람은 북반구와 반대로 비스듬히 불어요 (무역풍은 남동풍).');
        else if (W2 && view !== 'cell') parts.push(W2.name + ': 북반구에서 <b>' + W2.sub + '</b>');
        parts.push('<span style="color:#fca5a5">●</span> 우리나라 (약 37°N, 편서풍 지역)');
        info(parts.join('<br>'));
      }
      controls.segment('보기', [{ value: 'both', label: '순환 + 바람' }, { value: 'cell', label: '상승·하강 순환' }, { value: 'wind', label: '지표 바람' }], view, (v) => { view = v; layout(); });
      controls.segment('순환', [{ value: 'all', label: '전체' }, { value: 'h', label: '저위도' }, { value: 'f', label: '중위도' }, { value: 'p', label: '고위도' }], focus, (v) => { focus = v; layout(); });
      controls.segment('반구', [{ value: 'N', label: '북반구' }, { value: 'both', label: '양쪽' }], hemi, (v) => { hemi = v; layout(); });
      const spB = controls.button('🌍 자전 ✓', () => { spin = !spin; spB.classList.toggle('on', spin); spB.textContent = '🌍 자전 ' + (spin ? '✓' : '✕'); }); spB.classList.add('on');
      layout();

      return {
        sync() {
          const s = window.__sim && window.__sim.S;
          if (s && ['all', 'h', 'f', 'p'].indexOf(s.focus) >= 0 && s.focus !== focus) { focus = s.focus; layout(); }
        },
        update(dt, t) {
          if (spin) earth.rotation.y += 0.22 * dt;            // 서 → 동 (북극 위에서 보면 반시계 방향)
          const sl = window.SciSim && window.SciSim.reduceMotion ? 0.2 : 1;
          loops.forEach((L) => {
            if (!L.parts[0].m.visible) return;
            L.parts.forEach((p) => {
              p.t = (p.t + dt * 0.1 * sl) % 1;
              const pos = L.curve.getPointAt(p.t), tg = L.curve.getTangentAt(p.t);
              p.m.position.copy(pos); p.m.quaternion.setFromUnitVectors(up, tg);
            });
          });
          arrows.forEach((a) => {
            if (!a.m.visible) return;
            const s = ((t * 0.12 * sl + a.ph) % 1);
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
          kor.getWorldPosition(wp); nrm.copy(wp).normalize(); korLab.show(nrm.dot(camera.position.clone().sub(wp).normalize()) > 0.2);
        },
      };
    },
  });
  if (v3 && v3.button) { v3.button.style.alignSelf = 'flex-start'; v3.button.style.marginTop = '2px'; }
})();
