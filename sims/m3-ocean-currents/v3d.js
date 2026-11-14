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
    levels: [0, 2, 3],          // 1단계(수조) · 3단계(표류병 · 난류와 한류) · 4단계(기후)는 3D. 2단계(이름 카드를 지도에 끌어 놓기)는 2D
    build(ctx) {
      const { THREE, root, camera, label, info, controls, orbit } = ctx;
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
      earth.add(new THREE.Mesh(new THREE.SphereGeometry(R, 96, 64), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, metalness: 0 })));
      const MT = ctx.mats, lc = (h) => new THREE.Color(h).convertSRGBToLinear();   // 화면에서 색이 바래지 않게 (난류 빨강 · 한류 파랑이 또렷하게)
      ctx.halo(earth, 0x62aaff, R * 3.0, 0.4);   // 대기의 푸른 빛 번짐
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
        const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, dense.length * 2, c[2] === 'kr' ? 0.026 : 0.034, 8, c[2] === 'an'), new THREE.MeshStandardMaterial({ color: lc(col), roughness: 0.3, emissive: lc(col), emissiveIntensity: 0.18 }));
        earth.add(tube);
        const arrows = []; const na = c[2] === 'an' ? 4 : 2;
        for (let k = 0; k < na; k++) { const m = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.22, 12), new THREE.MeshStandardMaterial({ color: 0xfef3c7, emissive: lc(col), emissiveIntensity: 0.3, roughness: 0.4 })); earth.add(m); arrows.push(m); }
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
      /* 해류 끄기(생각 실험): 2D 지도처럼 '저위도: 더 뜨거워요 · 고위도: 더 추워요'를 지구본에 띄워요 */
      const offLab = [[10, 175, '저위도: 더 뜨거워요', 'rgba(220,38,38,.95)'], [52, 185, '고위도: 더 추워요', 'rgba(29,78,216,.95)'], [31, 180, '🌊 해류 없음', 'rgba(30,41,59,.9)']].map(([la, lo, t, c]) => { const a = new THREE.Object3D(); a.position.copy(P(la, lo, R * 1.04)); earth.add(a); const L = label(t, a, { size: 13, color: c }); L.show(false); return { a, L }; });
      const korA = new THREE.Object3D(); korA.position.copy(P(36.5, 127.8, R * 1.06)); earth.add(korA); const korL = label('우리나라', korA, { size: 12, color: 'rgba(15,23,42,.9)', offset: [0, 0.1, 0] });
      /* 도시 (해류가 기후에 미치는 영향) · 표류병 */
      const cityM = [['도쿄', 139.7, 35.7, 27, 0xe8470f], ['샌프란시스코', 237.6, 37.8, 17, 0x2563eb]].map((c) => {
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 10), new THREE.MeshBasicMaterial({ color: c[4] })); m.position.copy(P(c[2], c[1], R * 1.015)); earth.add(m);
        const a = new THREE.Object3D(); a.position.copy(P(c[2], c[1], R * 1.07)); earth.add(a);
        return { c, m, a, L: label(c[0] + ' 8월 ' + c[3] + '°C', a, { size: 12, color: 'rgba(15,23,42,.9)', offset: [0, 0.12, 0] }) };
      });
      const bottle = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10), new THREE.MeshStandardMaterial({ color: 0xfde047, emissive: 0xfacc15, emissiveIntensity: 0.6 })); bottle.visible = false; earth.add(bottle);
      const bottleL = label('🍾 표류병', bottle, { size: 12, color: 'rgba(161,98,7,.95)', offset: [0, 0.22, 0] }); bottleL.show(false);
      const TRN = 400, trPos = new Float32Array(TRN * 3), trGeo = new THREE.BufferGeometry(); trGeo.setAttribute('position', new THREE.BufferAttribute(trPos, 3)); trGeo.setDrawRange(0, 0);
      const trail = new THREE.Line(trGeo, new THREE.LineDashedMaterial({ color: 0xfff7cc, dashSize: 0.04, gapSize: 0.04 })); trail.frustumCulled = false; earth.add(trail);   // 표류병이 지나간 길 (2D 흔적과 같아요)

      /* ===== 단계 1: 수조에 바람 불기 (2D 실험과 같은 값: 바람 세기 · 방향 · 종이 조각 · 물속 흐름) ===== */
      const tankG = new THREE.Group(); root.add(tankG); tankG.visible = false;
      const U = 55, TXc = (px) => (px - 400) / U, TYc = (py) => (482 - py) / U, TWd = 500 / U, TD = 2.2, WH = TYc(334);
      const sm = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: lc(c), roughness: 0.5, metalness: 0 }, o || {}));
      tankG.add(new THREE.Mesh(new THREE.BoxGeometry(TWd, WH, TD), MT.liquid(lc(0x38a0e0), { opacity: 0.4 })).translateY(WH / 2));
      { const gl = new THREE.Mesh(new THREE.BoxGeometry(TWd + 0.06, TYc(292), TD + 0.06), MT.glass({ opacity: 0.1 })); gl.position.y = TYc(292) / 2; gl.userData.v3bg = true; gl.renderOrder = 3; tankG.add(gl); }   // 수조의 유리 벽
      const glassBox = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(TWd, TYc(292), TD)), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 })); glassBox.position.y = TYc(292) / 2; tankG.add(glassBox);
      const surfG = new THREE.PlaneGeometry(TWd, TD, 50, 4); surfG.rotateX(-Math.PI / 2);
      const surf = new THREE.Mesh(surfG, sm(0x8fd0ff, { transparent: true, opacity: 0.55, roughness: 0.1, side: THREE.DoubleSide, depthWrite: false })); tankG.add(surf);
      const base = new THREE.Mesh(new THREE.BoxGeometry(TWd + 14, 0.2, 5), MT.wood(0xd9c7a8, { repeat: 2 })); base.position.y = -0.1; tankG.add(base);
      const ruler = new THREE.Mesh(new THREE.BoxGeometry(TWd, 0.04, 0.4), MT.plastic(lc(0xf2c14e))); ruler.position.set(0, 0.02, TD / 2 + 0.3); tankG.add(ruler);
      const rlA = new THREE.Object3D(); rlA.position.set(0, 0.2, TD / 2 + 0.7); tankG.add(rlA);   // 눈금자 이름표: 수조를 볼 때만 보여요
      const rl = label('0 ~ 30 cm', rlA, { size: 11, color: 'rgba(107,74,0,.9)' });
      const fan = new THREE.Group(); tankG.add(fan);
      { const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.0, 16), MT.metal('steel', { roughness: 0.28 })); stand.position.set(0, 1.5 - 0, 0); fan.add(stand);
        const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.6, 32), MT.plastic(0xdfe5ec, { roughness: 0.3 })); motor.rotation.z = Math.PI / 2; motor.position.set(-0.1, 3.2, 0); fan.add(motor);
        const hub = new THREE.Group(); hub.position.set(0.35, 3.2, 0); fan.add(hub); fan.userData.hub = hub;
        for (let k = 0; k < 4; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.85, 0.32), MT.plastic(lc(0x7fb6fb), { roughness: 0.2, extra: { transparent: true, opacity: 0.9 } })); b.position.y = 0.45; const gg = new THREE.Group(); gg.rotation.x = k * Math.PI / 2; gg.add(b); hub.add(gg); } }
      const fanL = label('선풍기', fan, { offset: [0, 4.2, 0], size: 12, color: 'rgba(27,35,51,.85)' });
      const NST = 18, strI = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.025, 0.025), new THREE.MeshBasicMaterial({ color: 0xf1f5f9, transparent: true, opacity: 0.7 }), NST); tankG.add(strI);
      const NFP = 80, fpI = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }), NFP); tankG.add(fpI);
      const pap = [0, 1, 2, 3, 4, 5, 6].map((i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.22), sm(new THREE.Color().setHSL((i * 0.15) % 1, 0.7, 0.55), { roughness: 0.6, transparent: true })); m.userData.z = (i % 3 - 1) * 0.55 + (i % 2) * 0.12; tankG.add(m); return m; });
      const dmT = new THREE.Object3D(), stZ = Array.from({ length: NST }, (_, i) => (i % 6 - 2.5) * 0.3), fpZ = Array.from({ length: NFP }, (_, i) => ((i * 37) % 100 / 100 - 0.5) * (TD - 0.3));
      const WN = ['꺼짐', '약', '중', '강'];
      const wSeg = controls.segment('바람 세기', WN.map((n, i) => ({ value: i, label: n })), 0, (v) => { const L = ctx.lesson(); if (L && L.setWind) L.setWind(v); });
      const fB = controls.button('↔ 바람 방향 바꾸기', () => { const L = ctx.lesson(); if (L && L.flipDir) L.flipDir(); });
      const hostW = ctx.controls.text('').parentNode; const kidsW = Array.from(hostW.children); const wi = kidsW.findIndex((e) => e.textContent === '바람 세기'); const tankEls = kidsW.slice(wi, wi + 6).concat([fB]);
      const showTankCtl = (v) => tankEls.forEach((e) => { e.style.display = v ? '' : 'none'; });
      let tSig = '';
      function tankFrame(L, t) {
        const S1 = L.S1, w = S1.w, v = L.vcmOf(w), dir = S1.dir, vpx = v;
        wSeg.set(S1.wind);
        fan.position.x = TXc(S1.fanDir > 0 ? 62 : 738); fan.scale.set(S1.fanDir, S1.fanA, S1.fanA); fan.userData.hub.rotation.x = S1.blade; fanL.show(S1.fanA > 0.5);
        const amp = 0.015 + 0.02 * w, p = surfG.attributes.position;
        const hAt = (x3) => { const px = x3 * U + 400, slope = -dir * (px - 400) * 0.011 * w * 1.5; return WH - slope / U + Math.sin(x3 * 2.8 - t * 2 * (0.6 + 0.4 * w) * dir) * amp + Math.sin(x3 * 6 + t * 1.3) * amp * 0.45; };
        for (let i = 0; i < p.count; i++) p.setY(i, hAt(p.getX(i)));
        p.needsUpdate = true; surfG.computeVertexNormals();
        L.S1.papers.forEach((q, i) => { const m = pap[i]; const x3 = TXc(q.x); m.position.set(x3, hAt(x3) + 0.04 + Math.sin(q.ph) * 0.01, m.userData.z); m.rotation.y = q.rot * 2; m.rotation.z = Math.sin(q.ph * 0.8) * 0.08; m.material.opacity = q.a; m.visible = q.a > 0.03; });
        S1.fp.forEach((q, i) => { if (i >= NFP) return; const l = Math.abs(v) * q.k * 2.4 / U * 1.6; dmT.position.set(TXc(q.x), Math.min(TYc(q.y), hAt(TXc(q.x)) - 0.05), fpZ[i]); dmT.scale.set(1 + l * 18, 1, 1); dmT.rotation.set(0, 0, 0); dmT.updateMatrix(); fpI.setMatrixAt(i, dmT.matrix); }); fpI.instanceMatrix.needsUpdate = true;
        const wa = Math.max(0, Math.min(1, w / 3)) * S1.fanA;
        S1.streaks.forEach((s, i) => { const fx = S1.fanDir > 0 ? 82 : 718, x0 = fx + S1.fanDir * (30 + s.u * 560); dmT.position.set(TXc(x0), TYc(s.y) + 0.25, stZ[i % stZ.length]); dmT.scale.set(Math.max(0.0001, s.len / U * (0.6 + 0.4 * w) * (wa > 0.02 ? 1 : 0)), 1, 1); dmT.rotation.set(0, 0, 0); dmT.updateMatrix(); strI.setMatrixAt(i, dmT.matrix); }); strI.instanceMatrix.needsUpdate = true; strI.material.opacity = 0.2 + 0.6 * wa;
        const key = S1.wind + '|' + dir + '|' + Math.round(v * 10);
        if (key !== tSig) { tSig = key; info('<b>수조에 바람 불기</b> · 바람 <b>' + WN[S1.wind] + '</b><br>종이 조각의 속력 <b>' + v.toFixed(1) + ' cm/s</b> · 물이 흐르는 방향 <b>' + (S1.w < 0.3 ? '—' : dir > 0 ? '→ 오른쪽' : '← 왼쪽') + '</b><br><span style="opacity:.85">바람이 셀수록 물이 빨리 흘러요. 수면 가까이는 빠르고 깊을수록 느려요.</span>'); }
      }
      const wv = new V3(), cam = new V3();
      const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
      const frOf = (p) => [smooth(0.25, 0.5, p), smooth(0.5, 0.8, p), smooth(0.25, 0.5, p), smooth(0.55, 0.85, p)];     // 2D 차시와 같은 단계별 나타남
      const PH = ['① 바람', '② 해류 생성', '③ 대륙에 막혀 꺾임', '④ 순환 완성'];
      let sig = '', pIn = 1, offA = 0, sc = 0, lastSc = -1;
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
        if (sc === 0) return '<b>수조에 바람 불기</b><br>지속적으로 부는 바람(무역풍·편서풍)이 표층 해류를 만들어요.';
        if (sc === 1) { const ph = pIn < 0.05 ? -1 : pIn < 0.25 ? 0 : pIn < 0.5 ? 1 : pIn < 0.8 ? 2 : 3; return '<b>북태평양의 순환</b> · 진행 <b>' + Math.round(pIn * 100) + '%</b> · ' + (ph < 0 ? '시작 전' : '<b>' + PH[ph] + '</b>') + '<br>북적도 해류(동→서) → 쿠로시오 해류(북쪽) → 북태평양 해류(서→동) → 캘리포니아 해류(남쪽): <b>시계 방향</b>으로 돌아요.'; }
        if (sc === 2) return '<b>난류와 한류</b><br><span style="color:#fca5a5">난류(빨강)</span>: 저위도에서 고위도로 따뜻한 물을 옮겨요<br><span style="color:#93c5fd">한류(파랑)</span>: 고위도에서 저위도로 차가운 물을 옮겨요';
        const off = L && L.S4 && L.S4.off; return '<b>해류가 기후에 미치는 영향</b><br>도쿄(쿠로시오 해류: 난류) 8월 평균 27°C · 샌프란시스코(캘리포니아 해류: 한류) 17°C' + (off ? '<br><span style="color:#fcd34d">해류를 끄면 열이 옮겨지지 않아요.</span>' : '');
      }
      return {
        update(dt, t) {
          const L = ctx.lesson(), S = L && L.S; sc = S ? S.scene : 1;
          if (sc !== lastSc) { lastSc = sc; const tk = sc === 0; tankG.visible = tk; earth.visible = !tk; wSeg.set(0); const hostT = ctx.controls.text('').parentNode; Array.from(hostT.children).forEach((e) => { if (e.classList.contains('v3-player')) e.style.display = sc === 1 ? '' : 'none'; else if (e === wB) e.style.display = sc === 1 ? '' : 'none'; else if (e === nb) e.style.display = tk ? 'none' : ''; }); sig = ''; orbit.tx = 0; orbit.ty = tk ? 1.6 : 0.3; orbit.dist = tk ? (PHN ? 19 : 13.5) : (PHN ? 17 : 12.8); if (tk) { korL.show(false); items.forEach((it) => it.lb.show(false)); windL.forEach((l) => l.show(false)); cityM.forEach((q) => q.L.show(false)); } showTankCtl(tk); }
          if (sc === 0) { if (L && L.S1) tankFrame(L, t); return; }
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
          offLab.forEach((q) => q.L.show(sc === 3 && offA > 0.5 && facing(q.a)));
          const bt = sc === 2 && L && L.S3 && L.S3.bottle; bottle.visible = !!bt; bottleL.show(!!bt && facing(bottle)); trail.visible = !!bt;
          const toG = (q, r) => { const k = L.mx(1) - L.mx(0), lon = 110 + q.x / k, lat = 58 - (q.y - (L.my(58))) / (L.my(57) - L.my(58)); return P(lat, lon, r); };
          if (bt && L.mx) { bottle.position.copy(toG(bt, R * 1.02));
            const tr = L.S3.trail || [], n = Math.min(TRN, tr.length), o = tr.length - n;
            for (let i = 0; i < n; i++) { const v = toG(tr[o + i], R * 1.012); trPos[i * 3] = v.x; trPos[i * 3 + 1] = v.y; trPos[i * 3 + 2] = v.z; }
            trGeo.setDrawRange(0, n); trGeo.attributes.position.needsUpdate = true; if (n > 1) trail.computeLineDistances(); }
          if (ns !== sig) { sig = ns; info(text(L)); }
          if (windG.visible) windG.children.forEach((m) => { const u = m.userData; if (!u || u.lat == null) return; const lon = ((t * 12 * u.dir + u.k * 45) % 360) - 180; m.position.copy(P(u.lat, lon, R * 1.03)); const q = P(u.lat, lon + 3 * u.dir, R * 1.03); m.quaternion.setFromUnitVectors(new V3(0, 1, 0), q.sub(m.position).normalize()); });
        },
      };
    },
  });
})();
