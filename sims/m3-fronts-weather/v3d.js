/* m3-fronts-weather · 3D 전선 단면과 고기압·저기압
   한랭 전선: 찬 공기가 따뜻한 공기 밑을 파고들어 적운형 구름·소나기. 온난 전선: 따뜻한 공기가 찬 공기 위로 완만하게 올라가 층운형 구름·약한 비. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const H = 3.6, XW = 7, DZ = 3.4, XH = 2.03;     // 대기 높이, 반폭, 단면 깊이, 우리 동네 위치
  window.SciSim3D.attach({
    host: '.stage-card',
    title: '전선과 고·저기압 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHN ? 21 : 16, theta: 0.35, phi: 1.25, min: 7, max: 32, target: [0, 1.5, 0] },
    autoRotate: 0,
    levels: [1],              // 2단계(수조 모형·전선 만들기)만 3D. 기단 카드·공기 흐름 ? 칸·일기도 카드는 화면을 끌거나 눌러야 해서 2D
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3, C = THREE.Color;
      let mode = 'cold', f = -5, sc = 'front', sig = '', tkSig = '', wmSegs = null;
      const MT = ctx.mats, lc = (h) => new THREE.Color(h).convertSRGBToLinear();   // 화면에서 색이 바래지 않게 (찬 공기 파랑 · 따뜻한 공기 주황이 또렷하게)
      const sm = (c, o) => { const q = Object.assign({ color: lc(c), roughness: 0.6, metalness: 0 }, o || {}); if (typeof q.emissive === 'number') q.emissive = lc(q.emissive); return new THREE.MeshStandardMaterial(q); };
      const gnd = new THREE.Mesh(new THREE.BoxGeometry(XW * 2 + 0.6, 0.4, DZ + 0.4), MT.stone(lc(0x2f6a2c), { repeat: 6, bump: 0.04 })); gnd.position.y = -0.2; gnd.userData.v3bg = true; root.add(gnd);   // 땅은 배경: 자동 맞춤이 공기 덩어리 · 전선면에 맞춰요
      const home = new THREE.Group(); const hb = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.7), sm(0xf1f5f9)); hb.position.y = 0.25; const hr = new THREE.Mesh(new THREE.ConeGeometry(0.6, 0.45, 4), sm(0xdc2626)); hr.position.y = 0.72; hr.rotation.y = Math.PI / 4; home.add(hb, hr); home.position.set(XH, 0, 0.9); root.add(home);
      label('우리 동네', home, { offset: [0, 1.0, 0], size: 13, color: 'rgba(15,23,42,.9)' });
      const fronts = new THREE.Group(); root.add(fronts);
      const hl = new THREE.Group(); root.add(hl);
      const coldM = MT.liquid(lc(0x3b82f6), { opacity: 0.52, extra: { roughness: 0.14 } }), warmM = MT.liquid(lc(0xf59e0b), { opacity: 0.44, extra: { roughness: 0.14 } });
      const edgeM = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
      function slab(pts, mat) { const sh = new THREE.Shape(pts.map((p) => new THREE.Vector2(p[0], p[1]))); const g = new THREE.ExtrudeGeometry(sh, { depth: DZ, bevelEnabled: false }); g.translate(0, 0, -DZ / 2); const m = new THREE.Mesh(g, mat); const e = new THREE.LineSegments(new THREE.EdgesGeometry(g), edgeM); const gg = new THREE.Group(); gg.add(m, e); return gg; }
      const sub = new THREE.Group(); root.add(sub);
      function clearG(g) { while (g.children.length) g.remove(g.children[0]); }
      const cloudM = sm(0xf8fafc, { roughness: 0.95 }), darkM = sm(0x94a3b8, { roughness: 0.95 });
      const puffG = new THREE.SphereGeometry(1, 20, 14);
      const rainI = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.015, 0.015, 0.35, 5), new THREE.MeshBasicMaterial({ color: 0x9bd4ff, transparent: true, opacity: 0.85 }), 140); root.add(rainI);
      const rseed = []; for (let i = 0; i < 140; i++) rseed.push({ k: Math.random(), x: Math.random(), z: (Math.random() - 0.5) * (DZ - 0.3) });
      const airs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 12, 8), sm(0xfb923c, { emissive: 0xc2410c, emissiveIntensity: 0.5 }), 24); root.add(airs);
      const dm = new THREE.Object3D();
      let zone = [0, 0], ptype = 'none', bnd = (y) => 0, mass = null;
      const wL = label('', [0, 0, 0], { color: 'rgba(180,83,9,.92)', size: 13 }), cL = label('', [0, 0, 0], { color: 'rgba(29,78,216,.92)', size: 13 }), fL = label('', [0, 0, 0], { size: 13, color: 'rgba(15,23,42,.92)' });
      function buildFront() {
        clearG(fronts); fronts.visible = true; hl.visible = false;
        const cold = mode === 'cold', k = cold ? 0.55 : 2.0, Hh = cold ? H : 2.2;
        const x0 = f;
        let coldPts, warmPts;
        if (cold) { bnd = (y) => x0 - k * y; coldPts = [[-XW, 0], [x0, 0], [x0 - k * Hh, Hh], [-XW, Hh]]; warmPts = [[x0, 0], [XW, 0], [XW, Hh], [x0 - k * Hh, Hh]]; }
        else { bnd = (y) => x0 + k * y; coldPts = [[x0, 0], [XW, 0], [XW, Hh], [x0 + k * Hh, Hh]]; warmPts = [[-XW, 0], [x0, 0], [x0 + k * Hh, Hh], [-XW, Hh]]; }
        const cp = coldPts.map((p) => [Math.max(-XW, Math.min(XW, p[0])), p[1]]), wp = warmPts.map((p) => [Math.max(-XW, Math.min(XW, p[0])), p[1]]);
        fronts.add(slab(cp, coldM), slab(wp, warmM));
        // 위로 덮은 따뜻한 공기 (전선면 위쪽)
        /* 구름 */
        if (cold) { // 적란운: 전선 앞쪽에 높게
          const cx = x0 - 0.2;
          [[0, 0.9, 1.0], [0.5, 1.6, 0.9], [0.1, 2.3, 0.85], [0.6, 3.0, 0.7], [0.0, 3.4, 0.55], [-0.5, 1.2, 0.8], [1.2, 0.8, 0.7]].forEach((q, i) => { const m = new THREE.Mesh(puffG, i > 2 ? cloudM : darkM); m.position.set(cx + q[0], q[1], (i % 3 - 1) * 0.5); m.scale.set(q[2] * 1.0, q[2] * 0.8, q[2] * 1.2); fronts.add(m); });
          const an = new THREE.Mesh(puffG, cloudM); an.position.set(cx + 1.2, 3.5, 0); an.scale.set(1.5, 0.28, 1.1); fronts.add(an);
          zone = [x0 - 1.24, x0 + 0.57]; ptype = 'heavy';
        } else { // 층운: 전선면을 따라 넓게
          for (let i = 0; i < 10; i++) { const y = 0.45 + i * 0.17, x = bnd(y) + 0.5 + (i % 2) * 0.3; const m = new THREE.Mesh(puffG, i > 6 ? cloudM : darkM); m.position.set(x, y + 0.2, 0); m.scale.set(1.2, 0.17, 1.5); m.rotation.z = Math.atan(1 / k) * 0.7; fronts.add(m); }
          zone = [x0, x0 + 3.38]; ptype = 'light';
        }
        wL.obj = cold ? [XW - 2.4, 3.1, 0] : [-XW + 2, 2.8, 0]; wL.set('따뜻한 공기'); wL.show(true); home.visible = true;
        cL.obj = cold ? [-XW + 2, 1.0, 1.7] : [XW - 1.6, 0.6, 1.7]; cL.set('찬 공기'); cL.show(true);
        fL.obj = [x0, 0.1, DZ / 2 + 0.2]; fL.set(cold ? '한랭 전선 ▲' : '온난 전선 ●'); fL.show(true);
        fL.el.style.background = cold ? 'rgba(191,219,254,.95)' : 'rgba(254,202,202,.95)';
        weather();
      }
      /* 고기압 · 저기압 */
      const hlP = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 10, 8), sm(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.3 }), 90); hl.add(hlP);
      const hlSeed = []; for (let i = 0; i < 90; i++) hlSeed.push({ a: Math.random() * 6.28, k: Math.random(), s: i % 2 });
      function buildHL() {
        clearG(hl); hl.add(hlP); fronts.visible = false; hl.visible = true;
        [[-3.6, 'H'], [3.6, 'L']].forEach(([x, t]) => {
          const cyl = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 3.8, 40, 1, true), sm(t === 'H' ? 0x3b82f6 : 0xef4444, { transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide })); cyl.position.set(x, 1.9, 0); hl.add(cyl);
          if (t === 'L') [[0, 2.7, 0.6], [0.7, 3.1, 0.5], [-0.6, 3.2, 0.55], [0.1, 3.5, 0.6]].forEach((q) => { const m = new THREE.Mesh(puffG, cloudM); m.position.set(x + q[0], q[1], (q[0]) * 0.4); m.scale.set(q[2] * 1.4, q[2] * 0.8, q[2] * 1.2); hl.add(m); });
          label(t === 'H' ? '고기압 (맑음)' : '저기압 (구름·비)', [x, 4.2, 0], { color: t === 'H' ? 'rgba(37,99,235,.92)' : 'rgba(220,38,38,.92)', size: 14 });
        });
        wL.show(false); cL.show(false); fL.show(false);
        info('<b>고기압</b>: 공기가 내려오며 구름이 사라져 <b>맑아요</b>. 지표에서 시계 방향으로 불어 나가요.<br><b>저기압</b>: 공기가 올라가며 구름이 생겨 <b>흐리고 비</b>가 와요. 시계 반대 방향으로 불어 들어와요.');
      }
      function weather() {
        const cold = mode === 'cold', fx = 40 + (f + 5) / 10 * 740, TOWN = 560; let t, w;      // 2D 차시와 같은 기준 (그림 속 위치 px)
        if (cold) { w = fx > TOWN + 92 ? '맑고 쌀쌀해요' : fx >= TOWN - 42 ? '소나기가 와요' : fx > TOWN - 330 ? '구름이 늘어나요' : '맑고 따뜻해요'; t = fx > TOWN ? 12 : 24; if (fx > TOWN + 92) t = 12; }
        else { w = fx > TOWN ? '맑아지고 따뜻해요' : fx >= TOWN - 250 ? '지속적인 비가 와요' : fx > TOWN - 560 ? '구름이 늘어나요' : '맑고 쌀쌀해요'; t = fx > TOWN ? 24 : 12; }
        const wet = w === '소나기가 와요' || w === '지속적인 비가 와요';
        info('<b>' + (cold ? '한랭 전선 (▲)' : '온난 전선 (●)') + '</b> · ' + (cold ? '적운형 구름 · 좁은 지역 소나기' : '층운형 구름 · 넓은 지역에 지속적인 비') + '<br>우리 동네: ' + (wet ? '<span style="color:#7dd3fc">' + w + '</span>' : w) + ' · 기온 약 <b>' + t + '°C</b>');
      }

      /* ===== 지도 장면: 우리나라 주변 기단(mass) · 일기도·위성·레이더(wmap) — 2D 그림과 같은 좌표 ===== */
      const MS = 0.0125, mapG = new THREE.Group(); root.add(mapG); mapG.visible = false;
      mapG.rotation.x = 0.62; mapG.position.set(0, 2.5, -0.3); if (PHN) mapG.scale.setScalar(1.0);
      const mx = (x) => (x - 400) * MS, mz = (y) => (y - 270) * MS;
      const shapeOf = (pts) => new THREE.Shape(pts.map((q) => new THREE.Vector2(mx(q[0]), -mz(q[1]))));
      const mkLand = (pts, depth, mat) => { const g = new THREE.ExtrudeGeometry(shapeOf(pts), { depth, bevelEnabled: false }); g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, mat); mapG.add(m); return m; };
      const seaM = sm(0x143f70, { roughness: 0.55 }), landM = sm(0x4f7343, { roughness: 0.9 }), korM = sm(0x6f9660, { roughness: 0.9 });
      const sea = new THREE.Mesh(new THREE.PlaneGeometry(800 * MS, 540 * MS), seaM); sea.rotation.x = -Math.PI / 2; sea.position.y = -0.02; mapG.add(sea);
      let MP = null;     // window.__sim.MAP (처음 한 번 읽어요)
      const landParts = [];
      const kp = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), sm(0xfbbf24, { emissive: 0xb45309, emissiveIntensity: 0.4 })); mapG.add(kp);
      const kpL = label('우리나라', kp, { offset: [0, -0.1, 0], size: 13, color: 'rgba(15,23,42,.92)' });
      const mapTxt = [['대륙', 70, 300], ['태평양', 742, 334], ['동해', 588, 276], ['황해', 472, 396]].map((q) => label(q[0], [0, 0, 0], { size: 12, color: 'rgba(30,64,120,.6)' }));
      /* -- 기단 -- */
      const massG = new THREE.Group(); mapG.add(massG); massG.visible = false;
      const domeG = new THREE.SphereGeometry(1, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2);
      const arrowShaft = new THREE.CylinderGeometry(1, 1, 1, 10).rotateX(Math.PI / 2).translate(0, 0, 0.5), arrowHead = new THREE.ConeGeometry(1, 1, 14).rotateX(Math.PI / 2).translate(0, 0, 0.5);
      function mkArrow(col, parent) { const g = new THREE.Group(); const m = new THREE.MeshStandardMaterial({ color: col, roughness: 0.5, transparent: true }); const a = new THREE.Mesh(arrowShaft, m), b = new THREE.Mesh(arrowHead, m); g.add(a, b); g.userData = { a, b, m }; (parent || massG).add(g); return g; }
      function setArrow(g, x0, z0, x1, z1, y, w, al) {
        const dx = x1 - x0, dz = z1 - z0, L = Math.hypot(dx, dz), hl2 = Math.min(L * 0.5, 0.2 + w * 4);
        g.position.set(x0, y, z0); g.rotation.set(0, Math.atan2(dx, dz), 0); g.userData.a.scale.set(w, w, Math.max(0.01, L - hl2)); g.userData.b.position.z = L - hl2; g.userData.b.scale.set(w * 2.6, w * 2.6, hl2); g.userData.m.opacity = al; g.visible = al > 0.02 && L > 0.05;
      }
      const massObj = [], massDust = new THREE.Object3D();
      const mReady = () => !!MP && massObj.length > 0;
      function initMass() {
        MP.AIR.forEach((a, i) => {
          const col = new C(a.col), humid = a.prop.indexOf('다습') >= 0;
          const dome = new THREE.Mesh(domeG, sm(col, { transparent: true, opacity: 0.4, roughness: 0.3, depthWrite: false, emissive: col, emissiveIntensity: 0.35 })); massG.add(dome);
          const ring = new THREE.Mesh(new THREE.TorusGeometry(86 * MS, 0.025, 8, 48), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 })); ring.rotation.x = Math.PI / 2; ring.position.set(mx(a.home[0]), 0.05, mz(a.home[1])); massG.add(ring);
          const rl = label(PHN ? MP.AIR[i].where : MP.AIR[i].where + ' (발원지)', ring, { offset: [0, 0.2, 0], size: 12, color: 'rgba(15,23,42,.78)' });
          const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(humid ? 0.06 : 0.04, 8, 6), new THREE.MeshBasicMaterial({ color: humid ? 0xe0f2fe : 0xfff1c2 }), 14); massG.add(dots);
          const seed = []; for (let j = 0; j < 14; j++) { const an = Math.random() * 6.28, d = Math.sqrt(Math.random()) * 0.75; seed.push({ x: Math.cos(an) * d, z: Math.sin(an) * d * 0.85, y: 0.15 + Math.random() * 0.5, ph: Math.random() * 6 }); }
          const lab = label(PHN ? '<b>' + a.short + '</b>' : '<b>' + a.name + '</b> · ' + a.prop, dome, { offset: [0, 0.75, 0], size: 13, color: 'rgba(15,23,42,.9)' });
          massObj.push({ a, dome, ring, rl, dots, seed, lab, arrow: mkArrow(col, massG) });
        });
        const ms = new THREE.MeshBasicMaterial({ color: 0x7c3aed, transparent: true, opacity: 0 });
        const cv = new THREE.CatmullRomCurve3([[470, 304], [580, 250], [720, 268]].map((q) => new V3(mx(q[0]), 0.35, mz(q[1]))));
        massObj.jang = new THREE.Mesh(new THREE.TubeGeometry(cv, 30, 0.05, 8), ms); massG.add(massObj.jang);
        massObj.jangL = label('두 기단이 만나는 곳: 장마 전선', [mx(640), 0.9, mz(300)], { size: 13, color: 'rgba(124,58,237,.92)' }); massObj.jangL.show(false);
      }
      /* -- 일기도·위성·레이더 -- */
      const wmG = new THREE.Group(); mapG.add(wmG); wmG.visible = false;
      const FH = (f, x, y) => 0.95 + (f(x, y) - 1010) * 0.03;
      const sfG = new THREE.PlaneGeometry(800 * MS, 540 * MS, 80, 54); sfG.rotateX(-Math.PI / 2); sfG.setAttribute('color', new THREE.BufferAttribute(new Float32Array(sfG.attributes.position.count * 3), 3));
      const sfM = new THREE.Mesh(sfG, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false })); wmG.add(sfM);
      const chartG = new THREE.Group(); wmG.add(chartG);        // 곡면 · 등압선 · 바람 · 고/저 · 전선
      chartG.add(sfM);
      const isoG = new THREE.Group(), windG = new THREE.Group(), frontG = new THREE.Group(), hlLabs = [], abLabs = [];
      chartG.add(isoG, windG, frontG);
      const isoM = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
      const symC = new THREE.InstancedMesh(new THREE.ConeGeometry(0.11, 0.26, 3), sm(0x1d4ed8, { roughness: 0.4 }), 16), symW = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), sm(0xdc2626, { roughness: 0.4 }), 16);
      frontG.add(symC, symW);
      const frLab = [label('한랭 전선', [0, 0, 0], { size: 12, color: 'rgba(29,78,216,.95)' }), label('온난 전선', [0, 0, 0], { size: 12, color: 'rgba(220,38,38,.95)' })];
      const cloudG = new THREE.Group(), rainG = new THREE.Group(); wmG.add(cloudG, rainG);
      const abM = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), sm(0x1b2333)); const abPts = [0, 1, 2].map(() => { const m = abM.clone(); wmG.add(m); return m; });
      let wmSig = '', cloudI = null, rainI2 = null;
      function contour(f, level) {
        const pos = [], st = 10, nx = 80, ny = 54, g = [];
        for (let j = 0; j <= ny; j++) { const r = []; for (let i = 0; i <= nx; i++) r.push(f(i * st, j * st)); g.push(r); }
        const y = FH(f, 0, 0) - FH(f, 0, 0) + 0.95 + (level - 1010) * 0.03 + 0.03;
        for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
          const v00 = g[j][i], v10 = g[j][i + 1], v11 = g[j + 1][i + 1], v01 = g[j + 1][i], X = i * st, Y = j * st;
          const idx = (v00 >= level ? 1 : 0) | (v10 >= level ? 2 : 0) | (v11 >= level ? 4 : 0) | (v01 >= level ? 8 : 0); if (idx === 0 || idx === 15) continue;
          const T = [X + st * (level - v00) / (v10 - v00), Y], R = [X + st, Y + st * (level - v10) / (v11 - v10)], B = [X + st * (level - v01) / (v11 - v01), Y + st], Lf = [X, Y + st * (level - v00) / (v01 - v00)];
          const seg = (a, b) => pos.push(mx(a[0]), y, mz(a[1]), mx(b[0]), y, mz(b[1]));
          switch (idx) { case 1: case 14: seg(Lf, T); break; case 2: case 13: seg(T, R); break; case 3: case 12: seg(Lf, R); break; case 4: case 11: seg(R, B); break; case 5: seg(Lf, T); seg(R, B); break; case 6: case 9: seg(T, B); break; case 7: case 8: seg(Lf, B); break; case 10: seg(T, R); seg(Lf, B); break; }
        }
        return pos;
      }
      const rr0 = (seed) => { let q = seed * 9301 + 49297; return () => { q = (q * 9301 + 49297) % 233280; return q / 233280; }; };
      function buildWm(mp, layer) {
        const f = MP.FIELD[mp], P = sfG.attributes.position, Cc = sfG.attributes.color, col = new C();
        for (let i = 0; i < P.count; i++) { const x = P.getX(i) / MS + 400, y = P.getZ(i) / MS + 270, v = f(x, y); P.setY(i, FH(f, x, y)); const t = Math.max(-1, Math.min(1, (v - 1010) / 28)); if (t < 0) col.set(0xef4444).lerp(new C(0xf8fafc), 1 + t); else col.set(0xf8fafc).lerp(new C(0x3b82f6), t); col.convertSRGBToLinear(); Cc.setXYZ(i, col.r, col.g, col.b); }
        P.needsUpdate = true; Cc.needsUpdate = true;
        while (isoG.children.length) { isoG.children[0].geometry.dispose(); isoG.remove(isoG.children[0]); }
        for (let L = 968; L <= 1048; L += 4) { const pos = contour(f, L); if (!pos.length) continue; const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); isoG.add(new THREE.LineSegments(g, isoM)); }
        /* 바람: 기압이 높은 곳 → 낮은 곳 (등압선 간격이 좁을수록 길고 굵게) */
        while (windG.children.length) windG.remove(windG.children[0]);
        for (let gy = 70; gy < 440; gy += 90) for (let gx = 55; gx < 780; gx += 100) {
          const dx = (f(gx + 4, gy) - f(gx - 4, gy)) / 8, dy = (f(gx, gy + 4) - f(gx, gy - 4)) / 8, g = Math.hypot(dx, dy); if (g < 0.06) continue;
          const Ln = Math.max(12, Math.min(54, g * 360)) * MS * 1.2, ux = -dx / g, uy = -dy / g, ar = mkArrow(0x0f172a, windG), x0 = mx(gx) - ux * Ln / 2, z0 = mz(gy) - uy * Ln / 2;
          setArrow(ar, x0, z0, x0 + ux * Ln, z0 + uy * Ln, FH(f, gx, gy) + 0.12, 0.018 + Math.min(g * 8, 3) * 0.006, 0.95);
        }
        hlLabs.forEach((l) => l.show(false)); hlLabs.length = 0;
        const cs = MP.CENT[mp]; Object.keys(cs).forEach((k) => { const p = cs[k], isH = k[0] === 'H', v = Math.round(f(p[0], p[1])); const l = label((isH ? '고' : '저') + ' <b>' + v + '</b>', [mx(p[0]), FH(f, p[0], p[1]) + 0.35, mz(p[1])], { size: 14, color: isH ? 'rgba(29,78,216,.95)' : 'rgba(220,38,38,.95)' }); hlLabs.push(l); });
        const spr = mp === 'spr'; frontG.visible = spr; frLab.forEach((l) => l.show(spr && layer === 'chart'));
        if (spr) { frLab[0].obj = [mx(262), 0.45, mz(424)]; frLab[1].obj = [mx(640), 0.45, mz(408)]; }
        while (frontG.children.length > 2) { frontG.children[2].geometry.dispose(); frontG.remove(frontG.children[2]); }
        if (spr) [[MP.COLD_FRONT, 0x1d4ed8], [MP.WARM_FRONT, 0xdc2626]].forEach(([pts, cc]) => { const cv = new THREE.CatmullRomCurve3(pts.map((q) => new V3(mx(q[0]), 0.22, mz(q[1])))); frontG.add(new THREE.Mesh(new THREE.TubeGeometry(cv, 60, 0.045, 8), sm(cc, { roughness: 0.4 }))); });
        /* 위성 구름 · 레이더 비 (2D 영상과 같은 자리) */
        [cloudG, rainG].forEach((g) => { while (g.children.length) { g.children[0].geometry && g.children[0].geometry.dispose(); g.remove(g.children[0]); } });
        const pl = [], pr = [], R = rr0(mp === 'win' ? 31 : 47), R2 = rr0(mp === 'win' ? 61 : 73), at = MP.ptAt;
        if (mp === 'win') {
          for (let i = 0; i < 130; i++) { const a = i * 0.13 * 2.2, rr = 14 + i * 1.1; pl.push([735 + Math.cos(a) * rr, 235 + Math.sin(a) * rr * 0.85, 16 + R() * 16, 0.5]); }
          for (let i = 0; i < 40; i++) pl.push([640 + R() * 160, 90 + R() * 280, 22 + R() * 24, 0.3]);
          for (let s2 = 0; s2 < 11; s2++) { const x0 = 330 + s2 * 14 + R() * 20, y0 = 190 + s2 * 18 + R() * 14; for (let i = 0; i < 12; i += 2) pl.push([x0 + i * 14, y0 + i * 9, 12 + R() * 8, 0.6]); }
          for (let s2 = 0; s2 < 11; s2++) { const x0 = 330 + s2 * 14 + R2() * 20, y0 = 190 + s2 * 18 + R2() * 14; for (let i = 0; i < 12; i += 2) pr.push([x0 + i * 14, y0 + i * 9, 9 + R2() * 8, R2() < 0.3 ? 0x34d399 : 0x9bd8ff]); }
          for (let i = 0; i < 60; i++) { const a = R2() * 6.28, rr = Math.sqrt(R2()) * 120; pr.push([735 + Math.cos(a) * rr, 235 + Math.sin(a) * rr * 0.8, 12 + R2() * 14, R2() < 0.2 ? 0x22c55e : 0x9bd8ff]); }
        } else {
          for (let i = 0; i < 120; i++) { const a = i * 0.14 * 2 + 1, rr = 10 + i * 0.9; pl.push([430 + Math.cos(a) * rr, 250 + Math.sin(a) * rr * 0.85, 15 + R() * 14, 0.5]); }
          for (let i = 0; i < 50; i++) { const q = at(MP.COLD_FRONT, MP.CF_L, R() * MP.CF_L[MP.CF_L.length - 1]); pl.push([q.x - 12 + (R() - 0.5) * 36, q.y + (R() - 0.5) * 36, 14 + R() * 12, 0.7]); }
          for (let i = 0; i < 70; i++) { const q = at(MP.WARM_FRONT, MP.WF_L, R() * MP.WF_L[MP.WF_L.length - 1]); pl.push([q.x + (R() - 0.5) * 70, q.y - 20 - R() * 90, 24 + R() * 20, 0.55]); }
          for (let i = 0; i < 80; i++) { const q = at(MP.WARM_FRONT, MP.WF_L, R2() * MP.WF_L[MP.WF_L.length - 1]); pr.push([q.x + (R2() - 0.5) * 50, q.y - 15 - R2() * 70, 18 + R2() * 16, R2() < 0.3 ? 0x22c55e : 0x86efac]); }
          for (let i = 0; i < 50; i++) { const q = at(MP.COLD_FRONT, MP.CF_L, R2() * MP.CF_L[MP.CF_L.length - 1]); pr.push([q.x - 6 + (R2() - 0.5) * 26, q.y + (R2() - 0.5) * 26, 14 + R2() * 8, R2() < 0.5 ? 0xfacc15 : R2() < 0.5 ? 0xf97316 : 0x22c55e]); }
          for (let i = 0; i < 24; i++) pr.push([395 + R2() * 60, 230 + R2() * 50, 12 + R2() * 10, 0x22c55e]);
        }
        const ci = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), sm(0xffffff, { roughness: 1, transparent: true, opacity: 0.9 }), pl.length), d = new THREE.Object3D();
        pl.forEach((q, i) => { d.position.set(mx(q[0]), 0.28 + q[3] * 0.25, mz(q[1])); d.scale.set(q[2] * MS * 1.5, q[2] * MS * 0.7, q[2] * MS * 1.4); d.updateMatrix(); ci.setMatrixAt(i, d.matrix); }); cloudG.add(ci);
        const ri = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 0.05, 16), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.85 }), pr.length);
        pr.forEach((q, i) => { d.position.set(mx(q[0]), 0.14, mz(q[1])); d.scale.set(q[2] * MS, 1, q[2] * MS); d.updateMatrix(); ri.setMatrixAt(i, d.matrix); ri.setColorAt(i, new C(q[3])); }); rainG.add(ri);
        const tg = (window.__sim && window.__sim.SETS && window.__sim.SETS[mp]) ? window.__sim.SETS[mp].targets : [];
        abLabs.forEach((l) => l.show(false)); abLabs.length = 0;
        tg.forEach((t, i) => { abPts[i].position.set(mx(t.x), 0.18, mz(t.y)); abLabs.push(label(t.label, abPts[i], { offset: [0, 0.4, 0], size: 14, color: 'rgba(15,23,42,.92)' })); });
      }
      function mapScene(n) {
        if (!MP) { const L = ctx.lesson(); MP = L && L.MAP; if (!MP) return; }
        if (!landParts.length) {
          landParts.push(mkLand(MP.CONT, 0.1, landM), mkLand(MP.KOREA, 0.16, korM)); MP.ISLES.forEach((p) => landParts.push(mkLand(p, 0.1, landM)));
          kp.position.set(mx(MP.KP[0]), 0.28, mz(MP.KP[1])); mapTxt.forEach((l, i) => { const q = [['대륙', 70, 300], ['태평양', 742, 334], ['동해', 588, 276], ['황해', 472, 396]][i]; l.obj = [mx(q[1]), 0.2, mz(q[2])]; });
          initMass();
        }
        massG.visible = n === 'mass'; wmG.visible = n === 'wmap'; kp.visible = n === 'mass'; kpL.show(n === 'mass'); wmSig = '';
        mapTxt.forEach((l) => l.show(n === 'mass' && !PHN));
        if (n !== 'mass') { massObj.forEach((o) => { o.rl.show(false); o.lab.show(false); }); massObj.jangL.show(false); }
        if (n !== 'wmap') { hlLabs.forEach((l) => l.show(false)); abLabs.forEach((l) => l.show(false)); frLab.forEach((l) => l.show(false)); }
      }
      function mapFrame(S, t, dt) {
        if (!MP) return;
        if (sc === 'mass') {
          seaM.color.set(0x143f70); landM.color.set(0x4f7343);
          const m = S.mass, sea2 = m.season && MP.SEASONS[m.season];
          let any = false;
          massObj.forEach((o, i) => {
            const b = m.blobs[i], a = o.a, k = b.inf, rv = b.rev, R = a.R * (1 + 0.3 * k); any = any || rv > 0.5;
            o.dome.visible = rv > 0.02; o.dome.position.set(mx(b.x), 0, mz(b.y)); o.dome.scale.set(R * 1.08 * MS * (1 + 0.03 * Math.sin(t * 0.9 + b.ph)), R * MS * 0.55, R * 0.9 * MS); o.dome.material.opacity = rv * (0.5 + 0.3 * k);
            o.ring.visible = rv < 0.5; o.rl.show(rv < 0.5);
            o.lab.show(rv > 0.5); o.dots.visible = rv > 0.02;
            for (let j = 0; j < o.seed.length; j++) { const q = o.seed[j]; massDust.position.set(mx(b.x) + q.x * R * MS * 1.0, q.y * R * MS * 0.5 + Math.sin(t * 1.4 + q.ph) * 0.03, mz(b.y) + q.z * R * MS); massDust.scale.setScalar(rv); massDust.updateMatrix(); o.dots.setMatrixAt(j, massDust.matrix); } o.dots.instanceMatrix.needsUpdate = true;
            const dx = MP.KP[0] - b.x, dy = MP.KP[1] - b.y, L2 = Math.hypot(dx, dy) || 1;
            setArrow(o.arrow, mx(b.x + dx / L2 * R * 0.55), mz(b.y + dy / L2 * R * 0.55), mx(MP.KP[0] - dx / L2 * 34), mz(MP.KP[1] - dy / L2 * 34), 0.3, 0.035 + 0.04 * k, k > 0.15 && rv > 0.02 ? Math.min(0.95, k * 1.3) * rv : 0);
          });
          const ear = m.blobs[1].inf * m.blobs[2].inf; massObj.jang.material.opacity = Math.min(1, ear * 2.2); massObj.jang.visible = ear > 0.2; massObj.jangL.show(ear > 0.2);
          const key = (m.season || '') + '|' + any + '|' + (S.mass.revealAll ? 1 : 0);
          if (key !== wmSig) { wmSig = key; info(any ? (sea2 ? '<b>' + sea2.icon + ' ' + sea2.name + '</b> — ' + sea2.text + '<br>' + sea2.note : '<b>우리나라 주변의 기단</b><br>계절을 눌러 우리나라에 영향을 주는 기단을 확인해요.') : '<b>기단의 발원지</b><br>점선 원은 기단이 만들어지는 곳이에요.<br>기단 카드를 발원지에 맞게 놓으면 기단이 나타나요.'); }
        } else if (sc === 'wmap') {
          const w = S.wm, mp = w.map, layer = w.layer, sg = mp + '|' + layer;
          if (sg !== wmSig) {
            const mpChanged = !wmSig || wmSig.split('|')[0] !== mp; wmSig = sg;
            if (mpChanged) buildWm(mp, layer);
            chartG.visible = layer === 'chart'; cloudG.visible = layer === 'sat'; rainG.visible = layer === 'radar';
            frLab.forEach((l) => l.show(mp === 'spr' && layer === 'chart')); hlLabs.forEach((l) => l.show(layer === 'chart'));
            const dark = layer !== 'chart'; seaM.color.set(layer === 'sat' ? 0x0b1b30 : layer === 'radar' ? 0x0a121b : 0x143f70); landM.color.set(layer === 'sat' ? 0x3d4a33 : layer === 'radar' ? 0x18231d : 0x4f7343); korM.color.set(dark ? 0x66725a : 0x6f9660);
            info('<b>' + (mp === 'win' ? '겨울' : '봄') + ' 예시 ' + (layer === 'chart' ? '일기도' : layer === 'sat' ? '위성 영상' : '레이더 영상') + '</b> (예시 자료)<br>' +
              (layer === 'chart' ? '기압이 높을수록 곡면이 높아요. 등압선이 촘촘할수록 바람이 세요.' + (mp === 'spr' ? '<br>한랭 전선 ▲ · 온난 전선 ●' : '') : layer === 'sat' ? '하얀 곳 = 구름이 많은 곳' : '초록 → 노랑 → 빨강 = 비가 강한 곳') + '');
          }
          if (chartG.visible && frontG.visible) {
            const ph = w.phase, gap = 36; let ci2 = 0, wi = 0;
            [[MP.COLD_FRONT, MP.CF_L, 'cold'], [MP.WARM_FRONT, MP.WF_L, 'warm']].forEach(([pts, Lg, ty]) => {
              const total = Lg[Lg.length - 1];
              for (let d = 14 + (ph % 1) * gap; d < total - 10; d += gap) {
                const q = MP.ptAt(pts, Lg, d), nx = q.ty, ny = -q.tx;   // 2D와 같은 쪽 (nsign -1)
                if (ty === 'cold') { if (ci2 >= 16) break; massDust.position.set(mx(q.x + nx * 15 * 0.7), 0.3, mz(q.y + ny * 15 * 0.7)); massDust.rotation.set(Math.PI / 2, 0, 0); massDust.rotation.z = Math.atan2(nx, ny) + 0; massDust.rotation.set(0, 0, 0); massDust.quaternion.setFromUnitVectors(new V3(0, 1, 0), new V3(nx, 0.0001, ny).normalize()); massDust.scale.setScalar(1); massDust.updateMatrix(); symC.setMatrixAt(ci2++, massDust.matrix); }
                else { if (wi >= 16) break; massDust.position.set(mx(q.x), 0.24, mz(q.y)); massDust.rotation.set(0, 0, 0); massDust.quaternion.identity(); massDust.scale.setScalar(1); massDust.updateMatrix(); symW.setMatrixAt(wi++, massDust.matrix); }
              }
            });
            symC.count = ci2; symW.count = wi; symC.instanceMatrix.needsUpdate = symW.instanceMatrix.needsUpdate = true; massDust.quaternion.identity();
          }
          if (cloudG.visible) cloudG.position.x = Math.sin(t * 0.25) * 0.04;
        }
      }

      /* 수조 모형 (칸막이를 빼면 찬물은 아래로, 따뜻한 물은 위로) */
      const tank = new THREE.Group(); root.add(tank); tank.visible = false;
      const TW = 3.5, TH = 2.4;
      const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(TW * 2, TH, DZ)), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 })); frame.position.y = TH / 2; tank.add(frame);
      const tkLive = new THREE.Group(); tank.add(tkLive);
      const part = new THREE.Mesh(new THREE.BoxGeometry(0.06, TH, DZ), MT.plastic(0xdfe5ee, { roughness: 0.25, extra: { transparent: true, opacity: 0.85 } })); part.position.set(0, TH / 2, 0); tank.add(part);
      /* 수조 꾸밈: 유리 벽 · 받침판 · 칸막이 손잡이 */
      { const gl = new THREE.Mesh(new THREE.BoxGeometry(TW * 2 + 0.08, TH + 0.25, DZ + 0.08), MT.glass({ opacity: 0.1 })); gl.position.y = TH / 2 + 0.12; gl.userData.v3bg = true; gl.renderOrder = 3; tank.add(gl);
        const bs = new THREE.Mesh(new THREE.BoxGeometry(TW * 2 + 0.5, 0.06, DZ + 0.5), MT.plastic(lc(0x2a3142), { roughness: 0.5 })); bs.position.y = 0.025; bs.userData.v3bg = true; tank.add(bs);
        const hd = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, DZ * 0.5), MT.plastic(lc(0xdc2626))); hd.position.y = TH / 2 + 0.07; hd.userData.v3bg = true; part.add(hd); }
      const tkW = label('따뜻한 물', [-TW + 0.2, TH + 0.2, 0], { color: 'rgba(180,83,9,.92)', size: 13 }), tkC = label('찬물', [TW - 0.2, TH + 0.2, 0], { color: 'rgba(29,78,216,.92)', size: 13 });
      function buildTank(o) {
        clearG(tkLive); const e = 0.0001;
        const h1 = TH + (1.1 - TH) * o, xl = -TW * o, x4 = xl;
        const cold = [[xl, 0], [TW, 0], [TW, h1], [x4, h1]];
        const warm = [[-TW, 0], [xl, 0], [x4, h1], [TW, h1], [TW, TH], [-TW, TH]];
        const clean = (pts) => pts.filter((p, i) => { const q = pts[(i + 1) % pts.length]; return Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) > e; });
        tkLive.add(slab(clean(warm), warmM), slab(clean(cold), coldM));
        part.visible = o < 0.02;
      }
      function setScene(n) {
        sc = n; const isTank = n === 'tank', isHL = n === 'column', isMap = n === 'mass' || n === 'wmap', isFr = !isTank && !isHL && !isMap;
        gnd.visible = !isMap; tank.visible = isTank; fronts.visible = isFr; hl.visible = isHL; home.visible = isFr; mapG.visible = isMap;
        tkW.show(isTank); tkC.show(isTank); rainI.visible = isFr; airs.visible = isFr;
        if (isHL) { buildHL(); } else if (isTank || isMap) { wL.show(false); cL.show(false); fL.show(false); } else buildFront();
        if (typeof pMass !== 'undefined') { pMass.row.forEach((e) => { e.style.display = n === 'mass' ? '' : 'none'; }); pWm.row.forEach((e) => { e.style.display = n === 'wmap' ? '' : 'none'; }); }
        mapScene(isMap ? n : '');
        pTank.row.forEach((e) => { e.style.display = isTank ? '' : 'none'; }); pFront.row.forEach((e) => { e.style.display = isFr ? '' : 'none'; });
      }
      /* ▶ 재생: 수조(칸막이 빼기) · 전선 이동 — 2D 화면의 값도 같이 움직여요 */
      const host = controls.text('').parentNode;
      const grab = (fn) => { const n0 = host.children.length; const r = fn(); return { api: r, row: Array.from(host.children).slice(n0) }; };
      const pTank = grab(() => controls.player({
        duration: 9, loop: true, label: '칸막이 빼기',
        phases: [[0, '칸막이가 있어요'], [0.06, '칸막이를 뺐어요'], [0.15, '찬물은 아래로 · 따뜻한 물은 위로']],
        onFrame(p) { const L = ctx.lesson(); if (!L || !L.tankAction || !L.S) return; const k = L.S.tk; if (p > 0.05 && !k.released) L.tankAction(); else if (p < 0.02 && k.released) L.tankAction(); },
      }));
      const pFront = grab(() => controls.player({
        duration: 12, loop: true, label: '전선 이동',
        phases: [[0, '전선이 다가와요'], [0.55, '우리 동네를 지나가요'], [0.8, '전선이 지나갔어요']],
        onFrame(p) { const L = ctx.lesson(); if (!L || !L.frUI || !L.S) return; L.S.fr.play = false; L.S.fr.x = p * 100; L.frUI.set(p * 100); },
      }));
      const SEAS = ['win', 'spr', 'ear', 'sum'];
      const pMass = grab(() => controls.player({
        duration: 16, loop: true, label: '계절 바뀜',
        phases: [[0, '겨울 · 시베리아 기단'], [0.25, '봄·가을 · 양쯔강 기단'], [0.5, '초여름 · 장마'], [0.75, '여름 · 북태평양 기단']],
        onFrame(p) { const L = ctx.lesson(); if (!L || !L.setSeason || !L.S) return; const k = SEAS[Math.min(3, Math.floor(p * 4))]; if (L.S.mass.season !== k) L.setSeason(k); },
      }));
      const pWm = grab(() => {
        const sg1 = controls.segment('예시', [{ value: 'win', label: '❄️ 겨울' }, { value: 'spr', label: '🌸 봄' }], 'win', (v) => { const L = ctx.lesson(); if (L && L.setMap) L.setMap(v); });
        const sg2 = controls.segment('보기', [{ value: 'chart', label: '🗺️ 일기도' }, { value: 'sat', label: '🛰️ 위성' }, { value: 'radar', label: '📡 레이더' }], 'chart', (v) => { const L = ctx.lesson(); if (L && L.setLayer) L.setLayer(v); });
        return { sg1, sg2 };
      });
      wmSegs = pWm.api;
      pTank.row.forEach((e) => { e.style.display = 'none'; }); pMass.row.forEach((e) => { e.style.display = 'none'; }); pWm.row.forEach((e) => { e.style.display = 'none'; });
      setScene('front');
      return {
        update(dt, t) {
          const L = ctx.lesson(), S = L && L.S;
          if (S) {
            const ns = S.scene === 'tank' ? 'tank' : S.scene === 'column' ? 'column' : S.scene === 'mass' || S.scene === 'wmap' ? S.scene : 'front';
            if (ns !== sc) { sc = ns; setScene(ns); }
            if (sc === 'front') { const m = S.fr.type === 'warm' ? 'warm' : 'cold', nf = -5 + S.fr.xS / 10, k = m + '|' + nf.toFixed(2); if (k !== sig) { sig = k; mode = m; f = nf; buildFront(); } }
            else if (sc === 'tank') { const o = Math.round(S.tk.open * 50) / 50; if (o !== tkO) { tkO = o; buildTank(o); info('<b>수조 모형</b> · 왼쪽은 따뜻한 물, 오른쪽은 찬물이에요.<br>' + (S.tk.released ? '칸막이를 빼니 <span style="color:#93c5fd">찬물(파랑)은 아래로</span>, <span style="color:#fdba74">따뜻한 물(주황)은 위로</span> 움직여요.' : '🧹 칸막이를 빼고 어떻게 움직이는지 관찰해요.')); } else if (S.tk.released !== tkSig) { tkSig = S.tk.released; } }
          }
          if (sc === 'mass' || sc === 'wmap') { if (S) { mapFrame(S, t, dt); if (sc === 'wmap' && wmSegs) { wmSegs.sg1.set(S.wm.map); wmSegs.sg2.set(S.wm.layer); } } }
          if (sc === 'front') {
            const rain = ptype !== 'none';
            for (let i = 0; i < rseed.length; i++) { const q = rseed[i], u = (q.k + t * (ptype === 'heavy' ? 1.4 : 0.8)) % 1; const x = zone[0] + q.x * (zone[1] - zone[0]), top = ptype === 'heavy' ? 2.4 : Math.max(0.5, 0.35 + (x - f) / 2.0 * 0.9);
              dm.position.set(x, top - u * top, q.z); dm.scale.setScalar(rain && (ptype === 'heavy' || i % 2 === 0) && x > -XW && x < XW ? 1 : 0.001); dm.updateMatrix(); rainI.setMatrixAt(i, dm.matrix); }
            rainI.instanceMatrix.needsUpdate = true; rainI.visible = true;
            for (let i = 0; i < 24; i++) { const u = (i / 24 + t * 0.12) % 1, y = 0.2 + u * (mode === 'cold' ? 3.3 : 2.0), x = bnd(y) + (mode === 'cold' ? 0.25 : 0.3) + Math.sin(i) * 0.1; dm.position.set(x, y, (i % 5 - 2) * 0.55); dm.scale.setScalar(1); dm.updateMatrix(); airs.setMatrixAt(i, dm.matrix); } airs.instanceMatrix.needsUpdate = true; airs.visible = true;
          } else if (sc === 'column') {
            rainI.visible = false; airs.visible = false;
            for (let i = 0; i < hlSeed.length; i++) {
              const q = hlSeed[i], hi = q.s === 0, x = hi ? -3.6 : 3.6, u = (q.k + t * 0.12) % 1;
              // 고기압: 위 중심에서 내려와 지표에서 시계 방향으로 퍼져요. 저기압: 지표에서 반시계 방향으로 모여 중심에서 올라가요.
              let r, y, a;
              if (hi) { if (u < 0.45) { const w = u / 0.45; r = 0.3 + 0.2 * w; y = 3.5 - w * 3.2; a = q.a - w * 0.6; } else { const w = (u - 0.45) / 0.55; r = 0.5 + w * 1.7; y = 0.3 + 0.1 * w; a = q.a - 0.6 - w * 2.4; } }
              else { if (u < 0.55) { const w = u / 0.55; r = 2.2 - w * 1.8; y = 0.3 + 0.1 * w; a = q.a + w * 2.6; } else { const w = (u - 0.55) / 0.45; r = 0.4 - w * 0.1; y = 0.4 + w * 3.2; a = q.a + 2.6 + w * 0.8; } }
              dm.position.set(x + r * Math.cos(a), y, r * Math.sin(a)); dm.scale.setScalar(1); dm.updateMatrix(); hlP.setMatrixAt(i, dm.matrix);
            }
            hlP.instanceMatrix.needsUpdate = true;
          }
        },
      };
    },
  });
})();
