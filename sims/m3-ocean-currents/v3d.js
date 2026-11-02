/* m3-ocean-currents · 3D 지구본의 표층 해류
   표층 해류는 지속적으로 부는 바람(무역풍·편서풍)이 만들어요. 북태평양에서는 시계 방향으로 돌고, 저위도에서 고위도로 가는 해류는 난류(빨강), 고위도에서 저위도로 오는 해류는 한류(파랑)예요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const D2R = Math.PI / 180;
  const LAND = {
    na: [[-165, 65], [-155, 71], [-125, 70], [-95, 72], [-80, 73], [-62, 60], [-55, 50], [-67, 45], [-76, 38], [-81, 31], [-80, 25], [-84, 30], [-90, 29], [-97, 25], [-97, 20], [-90, 18], [-87, 21], [-83, 15], [-79, 9], [-86, 11], [-93, 15], [-105, 20], [-110, 24], [-114, 31], [-118, 34], [-124, 40], [-125, 48], [-135, 58], [-150, 60], [-165, 60]],
    sa: [[-79, 9], [-72, 12], [-62, 10], [-50, 0], [-35, -5], [-39, -15], [-48, -26], [-58, -38], [-65, -45], [-70, -54], [-75, -48], [-73, -37], [-71, -20], [-76, -13], [-81, -5], [-80, 2]],
    eu: [[-10, 36], [-9, 43], [-2, 48], [5, 52], [10, 57], [5, 62], [15, 69], [30, 71], [60, 69], [80, 73], [110, 77], [140, 72], [170, 70], [180, 66], [165, 60], [155, 57], [142, 52], [135, 43], [128, 38], [127, 35], [122, 30], [120, 24], [110, 20], [106, 10], [100, 13], [103, 2], [98, 8], [92, 22], [88, 22], [80, 15], [77, 8], [72, 20], [67, 25], [57, 25], [57, 15], [52, 16], [44, 12], [34, 28], [35, 35], [27, 37], [23, 36], [12, 38], [8, 44], [3, 43], [-5, 36]],
    af: [[-17, 21], [-10, 30], [0, 35], [10, 37], [32, 31], [34, 28], [43, 12], [51, 12], [40, -5], [40, -15], [35, -25], [27, -34], [18, -34], [12, -17], [13, -5], [9, 3], [-8, 4], [-17, 14]],
    au: [[114, -22], [122, -18], [131, -12], [142, -11], [146, -19], [153, -26], [150, -37], [138, -35], [130, -32], [115, -34]],
    gl: [[-55, 60], [-40, 60], [-20, 70], [-20, 81], [-60, 82], [-72, 77], [-55, 68]],
    an: [[-180, -70], [180, -70], [180, -90], [-180, -90]],
  };
  // [이름, 종류(w 난류 / c 한류), 지역, 경유점(경도, 위도)]
  const CUR = [
    ['북적도 해류', 'w', 'np', [[-108, 11], [-135, 12], [-160, 13], [180, 13], [155, 14], [128, 14]]],
    ['쿠로시오 해류', 'w', 'np', [[128, 14], [127, 23], [131, 29], [137, 33], [144, 36]]],
    ['북태평양 해류', 'w', 'np', [[144, 36], [162, 40], [180, 42], [-160, 44], [-140, 46], [-128, 45]]],
    ['캘리포니아 해류', 'c', 'np', [[-128, 45], [-126, 38], [-120, 30], [-113, 22], [-108, 11]]],
    ['동한 난류', 'w', 'kr', [[130, 33], [130, 36], [131.5, 39], [133, 42]]],
    ['리만 해류', 'c', 'kr', [[140, 50], [136, 45], [131, 41], [129.5, 37.5]]],
    ['북적도 해류', 'w', 'na', [[-18, 12], [-40, 13], [-60, 14], [-76, 16]]],
    ['멕시코 만류', 'w', 'na', [[-76, 16], [-86, 22], [-80, 27], [-76, 34], [-68, 40], [-56, 43]]],
    ['북대서양 해류', 'w', 'na', [[-56, 43], [-40, 48], [-22, 52], [-8, 52]]],
    ['카나리아 해류', 'c', 'na', [[-9, 46], [-14, 36], [-18, 26], [-20, 16], [-18, 12]]],
    ['남적도 해류', 'w', 'sp', [[-92, -4], [-125, -6], [-160, -7], [180, -7], [152, -6]]],
    ['동오스트레일리아 해류', 'w', 'sp', [[152, -6], [154, -20], [153, -32], [160, -38]]],
    ['남태평양 해류', 'w', 'sp', [[160, -38], [180, -42], [-150, -42], [-110, -42], [-84, -40]]],
    ['페루 해류', 'c', 'sp', [[-84, -40], [-77, -30], [-79, -16], [-86, -4]]],
    ['남적도 해류', 'w', 'sa', [[8, -4], [-14, -5], [-34, -6]]],
    ['브라질 해류', 'w', 'sa', [[-34, -6], [-38, -20], [-47, -30], [-52, -37]]],
    ['남대서양 해류', 'w', 'sa', [[-52, -37], [-30, -41], [-5, -40], [10, -34]]],
    ['벵겔라 해류', 'c', 'sa', [[10, -34], [13, -24], [9, -14], [8, -4]]],
    ['남극 순환류', 'c', 'an', (function () { const a = []; for (let l = -180; l <= 180; l += 20) a.push([l, -57]); return a; })()],
  ];
  const WINDS = [[-15, 'W', '무역풍'], [45, 'E', '편서풍'], [75, 'W', '극동풍'], [-15, 'W', ''], [-45, 'E', ''], [-75, 'W', '']];
  const FOCUS = { np: [-172, '북태평양'], na: [-45, '북대서양'], sp: [-150, '남태평양'], kr: [135, '우리나라'] };
  window.SciSim3D.attach({
    host: '.stage-card',
    title: '표층 해류 3D 지구본',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHN ? 17 : 12.8, theta: 0, phi: 1.3, min: 6.5, max: 22, target: [0, 0.3, 0] },
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, camera, label, info, controls } = ctx;
      const V3 = THREE.Vector3, R = 4;
      const P = (lat, lon, r) => new V3(r * Math.cos(lat * D2R) * Math.sin(lon * D2R), r * Math.sin(lat * D2R), r * Math.cos(lat * D2R) * Math.cos(lon * D2R));
      let focus = 'np', all = false, showWind = false, names = true, turn = 0, targetRot = 0, spin = false;
      const earth = new THREE.Group(); root.add(earth);
      const W = 1024, H = 512, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
      const og = g.createLinearGradient(0, 0, 0, H); og.addColorStop(0, '#1d5a8f'); og.addColorStop(0.5, '#1b6aa5'); og.addColorStop(1, '#1d5a8f'); g.fillStyle = og; g.fillRect(0, 0, W, H);
      const X = (lon) => (lon / 360 + 0.25) * W, Y = (lat) => (90 - lat) / 180 * H;
      Object.keys(LAND).forEach((k) => { for (let s = -1; s <= 1; s++) { g.beginPath(); LAND[k].forEach((p, i) => { const x = X(p[0]) + s * W, y = Y(p[1]); if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.closePath(); g.fillStyle = k === 'an' || k === 'gl' ? '#e8eef5' : '#5a9a4a'; g.fill(); g.strokeStyle = '#3f7a3a'; g.lineWidth = 1; g.stroke(); } });
      g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 1; [-60, -30, 0, 30, 60].forEach((la) => { g.beginPath(); g.moveTo(0, Y(la)); g.lineTo(W, Y(la)); g.stroke(); });
      for (let lo = -180; lo < 180; lo += 30) { g.beginPath(); g.moveTo(X(lo), 0); g.lineTo(X(lo), H); g.stroke(); }
      const tex = new THREE.CanvasTexture(cv); tex.anisotropy = 4; if ('encoding' in tex) tex.encoding = THREE.sRGBEncoding;
      earth.add(new THREE.Mesh(new THREE.SphereGeometry(R, 96, 64), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, metalness: 0 })));
      /* 해류 */
      const WARM = 0xe0381f, COLD = 0x1b8cf0, MAJOR = ['쿠로시오 해류', '캘리포니아 해류', '멕시코 만류', '카나리아 해류', '동오스트레일리아 해류', '페루 해류', '브라질 해류', '벵겔라 해류', '남극 순환류'];
      const items = [];
      CUR.forEach((c, i) => {
        const pts = c[3].map((q) => P(q[1], q[0], R * 1.012));
        const dense = new THREE.CatmullRomCurve3(pts, c[2] === 'an').getPoints(pts.length * 12).map((p) => p.normalize().multiplyScalar(R * 1.012));
        const curve = new THREE.CatmullRomCurve3(dense, c[2] === 'an');
        const col = c[1] === 'w' ? WARM : COLD;
        const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, dense.length * 2, c[2] === 'kr' ? 0.026 : 0.034, 8, c[2] === 'an'), new THREE.MeshStandardMaterial({ color: col, roughness: 0.35, emissive: col, emissiveIntensity: 0.12 }));
        earth.add(tube);
        const arrows = []; const na = c[2] === 'an' ? 4 : 2;
        for (let k = 0; k < na; k++) { const m = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.22, 12), new THREE.MeshStandardMaterial({ color: 0xfef3c7, emissive: col, emissiveIntensity: 0.25, roughness: 0.4 })); earth.add(m); arrows.push(m); }
        const anchor = new THREE.Object3D(); anchor.position.copy(curve.getPoint(0.5)).multiplyScalar(1.03); earth.add(anchor);
        const lb = label(c[0] + (c[1] === 'w' ? ' (난류)' : ' (한류)'), anchor, { color: c[1] === 'w' ? 'rgba(185,28,28,.92)' : 'rgba(3,105,161,.92)', size: 12 });
        items.push({ c, curve, tube, arrows, anchor, lb, col, i });
      });
      /* 바람 고리 */
      const windG = new THREE.Group(); earth.add(windG);
      WINDS.forEach((w, i) => { const pts = []; for (let k = 0; k <= 72; k++) pts.push(P(w[0], k * 5 - 180, R * 1.03)); const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 144, 0.012, 6, true), new THREE.MeshBasicMaterial({ color: 0xe5e7eb, transparent: true, opacity: 0.55 })); windG.add(m);
        for (let k = 0; k < 8; k++) { const cn = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 10), new THREE.MeshBasicMaterial({ color: 0xffffff })); cn.userData = { lat: w[0], dir: w[1] === 'E' ? 1 : -1, k }; windG.add(cn); } });
      windG.visible = false;
      const windL = [label('무역풍 (동 → 서)', [0, 0, 0], { size: 12, color: 'rgba(51,65,85,.92)' }), label('편서풍 (서 → 동)', [0, 0, 0], { size: 12, color: 'rgba(51,65,85,.92)' })];
      const wA = [new THREE.Object3D(), new THREE.Object3D()]; wA[0].position.copy(P(15, -90, R * 1.05)); wA[1].position.copy(P(45, -90, R * 1.05)); wA.forEach((a) => earth.add(a)); windL[0].obj = wA[0]; windL[1].obj = wA[1]; windL.forEach((l) => l.show(false));
      /* 우리나라 표시 */
      const kor = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 10), new THREE.MeshBasicMaterial({ color: 0xfde047 })); kor.position.copy(P(36.5, 127.8, R * 1.01)); earth.add(kor);
      const korA = new THREE.Object3D(); korA.position.copy(P(36.5, 127.8, R * 1.06)); earth.add(korA); const korL = label('우리나라', korA, { size: 12, color: 'rgba(15,23,42,.9)', offset: [0, 0.1, 0] });
      const wv = new V3(), cam = new V3();
      const inFocus = (it) => all || it.c[2] === focus || (focus === 'np' && it.c[2] === 'kr' ? false : false);
      function setView(v) { focus = v; targetRot = -FOCUS[v][0] * D2R; apply(); }
      function apply() {
        items.forEach((it) => { const on = all || it.c[2] === focus; it.tube.visible = on; it.arrows.forEach((m) => { m.visible = on; }); it.show = on; });
        const f = FOCUS[focus];
        const kr = focus === 'kr';
        info(all ? '<b>세계의 표층 해류</b><br>대양마다 큰 순환이 있어요. 북반구는 <b>시계 방향</b>, 남반구는 <b>시계 반대 방향</b>으로 돌아요.' : focus === 'np' ? '<b>북태평양 순환</b>: 무역풍 → 북적도 해류(서쪽), 대륙에 막혀 쿠로시오 해류(북쪽), 편서풍 → 북태평양 해류(동쪽), 캘리포니아 해류(남쪽).<br>시계 방향으로 돌아요.' : kr ? '<b>우리나라 주변</b>: 난류(동한 난류)는 북쪽으로, 한류(리만 해류)는 남쪽으로 흘러요.' : '<b>' + f[1] + ' 순환</b><br>저위도의 난류는 고위도로, 고위도의 한류는 저위도로 열을 옮겨요.');
      }
      controls.segment('바다', Object.keys(FOCUS).map((k) => ({ value: k, label: FOCUS[k][1] })), focus, (v) => { all = false; allB.classList.remove('on'); setView(v); });
      const allB = controls.button('전체 해류', () => { all = !all; allB.classList.toggle('on', all); apply(); }); 
      const wB = controls.button('바람 ✕', () => { showWind = !showWind; wB.textContent = '바람 ' + (showWind ? '✓' : '✕'); wB.classList.toggle('on', showWind); windG.visible = showWind; windL.forEach((l) => l.show(showWind && names)); });
      const nb = controls.button('이름 ✓', () => { names = !names; nb.textContent = '이름 ' + (names ? '✓' : '✕'); nb.classList.toggle('on', names); });
      nb.classList.add('on');
      setView('np'); earth.rotation.y = targetRot;
      return {
        update(dt, t) {
          let d = targetRot - earth.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); earth.rotation.y += d * Math.min(1, dt * 3.2);
          camera.getWorldPosition(cam);
          const facing = (a) => { a.getWorldPosition(wv); return wv.dot(cam) > R * R * 0.92; };
          items.forEach((it) => {
            const on = it.show; it.lb.show(on && names && facing(it.anchor) && (!all || MAJOR.indexOf(it.c[0]) >= 0 || it.c[2] === focus));
            if (!on) return;
            const n = it.arrows.length;
            it.arrows.forEach((m, k) => { const u = (t * 0.05 + k / n) % 1, p = it.curve.getPointAt(u), q = it.curve.getPointAt((u + 0.01) % 1); m.position.copy(p); const dir = q.clone().sub(p).normalize(); m.quaternion.setFromUnitVectors(new V3(0, 1, 0), dir); });
          });
          korL.show(names && facing(korA)); wA.forEach((a, i) => windL[i].show(showWind && names && facing(a)));
          if (windG.visible) windG.children.forEach((m) => { const u = m.userData; if (!u || u.lat == null) return; const lon = ((t * 12 * u.dir + u.k * 45) % 360) - 180; m.position.copy(P(u.lat, lon, R * 1.03)); const q = P(u.lat, lon + 3 * u.dir, R * 1.03); m.quaternion.setFromUnitVectors(new V3(0, 1, 0), q.sub(m.position).normalize()); });
        },
      };
    },
  });
})();
