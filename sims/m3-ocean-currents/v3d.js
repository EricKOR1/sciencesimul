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
  // 2D 차시와 같은 북태평양 순환: 북적도 해류 · 쿠로시오 해류 · 북태평양 해류 · 캘리포니아 해류 (경유점은 2D 지도의 KEYS)
  const KEYS0 = [[241, 16], [225, 15.2], [205, 14.6], [185, 14.4], [165, 14.8], [145, 15.4], [131, 16.2], [126.5, 17.5], [124.8, 20.5], [124.8, 23.8], [126.8, 26.6], [130, 29.6], [134, 31.6], [138, 33], [143, 35.2], [150, 37.8], [160, 40.2], [172, 42], [186, 43.3], [200, 44], [214, 44.3], [228, 45], [231.5, 41], [234.5, 36], [238.5, 30], [242, 24], [243, 19.5]];
  const SEG = [0, 7, 14, 21, 27];
  const NAMES = [['북적도 해류', 'w'], ['쿠로시오 해류', 'w'], ['북태평양 해류', 'w'], ['캘리포니아 해류', 'c']];
  const WINDS = [[15, 'W', '무역풍'], [45, 'E', '편서풍']];
  const FOCUS = { np: [-172, '북태평양'] };
  window.SciSim3D.attach({
    host: '.stage-card',
    title: '표층 해류 3D 지구본',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHN ? 17 : 12.8, theta: 0, phi: 1.3, min: 6.5, max: 22, target: [0, 0.3, 0] },
    autoRotate: 0,
    levels: [1, 2, 3],          // 단계 1(수조에 바람 불기)은 2D 실험이에요
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
      const K = (window.__sim && window.__sim.KEYS) || KEYS0;
      const CUR = NAMES.map((q, i) => [q[0], q[1], 'np', K.slice(SEG[i], SEG[i + 1] + 1).concat(i === 3 ? [K[0]] : [])]);
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
      const wA = [new THREE.Object3D(), new THREE.Object3D()]; wA[0].position.copy(P(15, -172, R * 1.05)); wA[1].position.copy(P(45, -172, R * 1.05)); wA.forEach((a) => earth.add(a)); windL[0].obj = wA[0]; windL[1].obj = wA[1]; windL.forEach((l) => l.show(false));
      /* 우리나라 표시 */
      const kor = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 10), new THREE.MeshBasicMaterial({ color: 0xfde047 })); kor.position.copy(P(36.5, 127.8, R * 1.01)); earth.add(kor);
      const korA = new THREE.Object3D(); korA.position.copy(P(36.5, 127.8, R * 1.06)); earth.add(korA); const korL = label('우리나라', korA, { size: 12, color: 'rgba(15,23,42,.9)', offset: [0, 0.1, 0] });
      /* 도시 (해류가 기후에 미치는 영향) · 표류병 */
      const cityM = [['도쿄', 139.7, 35.7, 27, 0xe8470f], ['샌프란시스코', 237.6, 37.8, 17, 0x2563eb]].map((c) => {
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 10), new THREE.MeshBasicMaterial({ color: c[4] })); m.position.copy(P(c[2], c[1], R * 1.015)); earth.add(m);
        const a = new THREE.Object3D(); a.position.copy(P(c[2], c[1], R * 1.07)); earth.add(a);
        return { c, m, a, L: label(c[0] + ' 8월 ' + c[3] + '°C', a, { size: 12, color: 'rgba(15,23,42,.9)', offset: [0, 0.12, 0] }) };
      });
      const bottle = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10), new THREE.MeshStandardMaterial({ color: 0xfde047, emissive: 0xfacc15, emissiveIntensity: 0.6 })); bottle.visible = false; earth.add(bottle);
      const wv = new V3(), cam = new V3();
      const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
      const frOf = (p) => [smooth(0.25, 0.5, p), smooth(0.5, 0.8, p), smooth(0.25, 0.5, p), smooth(0.55, 0.85, p)];     // 2D 차시와 같은 단계별 나타남
      const PH = ['① 바람', '② 해류 생성', '③ 대륙에 막혀 꺾임', '④ 순환 완성'];
      let sig = '', pIn = 1, offA = 0, sc = 0;
      const idxN = items.map((it) => it.tube.geometry.index.count);
      /* ▶ 해류가 순환을 만드는 과정 (2D 화면의 진행 슬라이더도 같이 움직여요) */
      const pl = controls.player({
        duration: 15, loop: true, label: '순환 만들기',
        phases: [[0, '시작 전'], [0.05, PH[0]], [0.25, PH[1]], [0.5, PH[2]], [0.8, PH[3]]],
        onFrame(p) { pIn = p; const L = ctx.lesson(); if (L && L.S && L.S.scene === 1 && L.S2) { L.S2.playing = false; L.S2.p = p; if (L.GYRE) L.GYRE.set(Math.round(p * 100)); } },
      });
      const wB = controls.button('바람 ✓', () => { showWind = !showWind; wB.textContent = '바람 ' + (showWind ? '✓' : '✕'); wB.classList.toggle('on', showWind); });
      const nb = controls.button('이름 ✓', () => { names = !names; nb.textContent = '이름 ' + (names ? '✓' : '✕'); nb.classList.toggle('on', names); });
      nb.classList.add('on'); wB.classList.add('on'); showWind = true;
      targetRot = -FOCUS.np[0] * D2R; earth.rotation.y = targetRot;
      function text(L) {
        if (sc === 0) return '<b>수조에 바람 불기</b>는 2D 화면에서 해 봐요.<br>지속적으로 부는 바람(무역풍·편서풍)이 표층 해류를 만들어요. 북태평양의 해류를 지구본으로 살펴봐요.';
        if (sc === 1) { const ph = pIn < 0.05 ? -1 : pIn < 0.25 ? 0 : pIn < 0.5 ? 1 : pIn < 0.8 ? 2 : 3; return '<b>북태평양의 순환</b> · 진행 <b>' + Math.round(pIn * 100) + '%</b> · ' + (ph < 0 ? '시작 전' : '<b>' + PH[ph] + '</b>') + '<br>북적도 해류(동→서) → 쿠로시오 해류(북쪽) → 북태평양 해류(서→동) → 캘리포니아 해류(남쪽): <b>시계 방향</b>으로 돌아요.'; }
        if (sc === 2) return '<b>난류와 한류</b><br><span style="color:#fca5a5">난류(빨강)</span>: 저위도에서 고위도로 흘러요 (북적도 · 쿠로시오 · 북태평양 해류)<br><span style="color:#93c5fd">한류(파랑)</span>: 고위도에서 저위도로 흘러요 (캘리포니아 해류)';
        const off = L && L.S4 && L.S4.off; return '<b>해류가 기후에 미치는 영향</b><br>도쿄(쿠로시오 해류: 난류) 8월 평균 27°C · 샌프란시스코(캘리포니아 해류: 한류) 17°C' + (off ? '<br><span style="color:#fcd34d">해류를 끄면 열이 옮겨지지 않아요.</span>' : '');
      }
      return {
        update(dt, t) {
          const L = ctx.lesson(), S = L && L.S; sc = S ? S.scene : 1;
          let d = targetRot - earth.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); earth.rotation.y += d * Math.min(1, dt * 3.2);
          if (sc === 1 && L.S2) { if (!pl.playing && Math.abs(L.S2.p - pl.p) > 0.003) pl.set(L.S2.p); }
          const p = sc === 1 ? pIn : 1; const fr = frOf(p);
          offA = sc === 3 && L && L.S4 ? L.S4.offA || 0 : 0;
          const ns = [sc, Math.round(p * 100), names, showWind, Math.round(offA * 10), L && L.S4 ? L.S4.off : 0].join('|');
          camera.getWorldPosition(cam);
          const facing = (a) => { a.getWorldPosition(wv); return wv.dot(cam) > R * R * 0.92; };
          items.forEach((it, i) => {
            const f = fr[i] * (1 - 0.85 * offA); it.show = f > 0.02;
            it.tube.visible = it.show; it.tube.geometry.setDrawRange(0, Math.max(6, Math.floor(f * idxN[i] / 6) * 6)); it.tube.material.opacity = 1; it.tube.material.transparent = false;
            it.lb.show(it.show && f > 0.6 && names && facing(it.anchor));
            const n = it.arrows.length;
            it.arrows.forEach((m, k) => { m.visible = it.show && f > 0.5; const u = (t * 0.05 + k / n) % 1, pp = it.curve.getPointAt(u), q = it.curve.getPointAt((u + 0.01) % 1); m.position.copy(pp); const dir = q.clone().sub(pp).normalize(); m.quaternion.setFromUnitVectors(new V3(0, 1, 0), dir); });
          });
          const windOn = showWind && (sc === 0 || (sc === 1 && p >= 0.05));
          windG.visible = windOn; windL.forEach((l, i) => l.show(windOn && names && facing(wA[i])));
          cityM.forEach((q) => { const on = sc === 3 && (!(L && L.S4) || L.S4.city === 2 || L.S4.city === (q.c[0] === '도쿄' ? 0 : 1) || L.S4.seen.has(q.c[0] === '도쿄' ? 0 : 1)); q.m.visible = on; q.L.show(on && names && facing(q.a)); });
          korL.show(false); kor.visible = false;
          const bt = sc === 2 && L && L.S3 && L.S3.bottle; bottle.visible = !!bt;
          if (bt && L.mx) { const k = L.mx(1) - L.mx(0), lon = 110 + bt.x / k, lat = 58 - (bt.y - (L.my(58))) / (L.my(57) - L.my(58)); bottle.position.copy(P(lat, lon, R * 1.02)); }
          if (ns !== sig) { sig = ns; info(text(L)); }
          if (windG.visible) windG.children.forEach((m) => { const u = m.userData; if (!u || u.lat == null) return; const lon = ((t * 12 * u.dir + u.k * 45) % 360) - 180; m.position.copy(P(u.lat, lon, R * 1.03)); const q = P(u.lat, lon + 3 * u.dir, R * 1.03); m.quaternion.setFromUnitVectors(new V3(0, 1, 0), q.sub(m.position).normalize()); });
        },
      };
    },
  });
})();
