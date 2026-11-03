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
    levels: [1],              // 단계 2(수조 모형·전선 만들기)에서 3D로 시작해요. 기단 지도·공기 흐름 맞히기·일기도는 2D 화면에서 해요
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3, C = THREE.Color;
      let mode = 'cold', f = -5, sc = 'front', sig = '', tkSig = '';
      const sm = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.6, metalness: 0 }, o || {}));
      const gnd = new THREE.Mesh(new THREE.BoxGeometry(XW * 2 + 0.6, 0.4, DZ + 0.4), sm(0x2f6a2c, { roughness: 0.95 })); gnd.position.y = -0.2; root.add(gnd);
      const home = new THREE.Group(); const hb = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.7), sm(0xf1f5f9)); hb.position.y = 0.25; const hr = new THREE.Mesh(new THREE.ConeGeometry(0.6, 0.45, 4), sm(0xdc2626)); hr.position.y = 0.72; hr.rotation.y = Math.PI / 4; home.add(hb, hr); home.position.set(XH, 0, 0.9); root.add(home);
      label('우리 동네', home, { offset: [0, 1.0, 0], size: 13, color: 'rgba(15,23,42,.9)' });
      const fronts = new THREE.Group(); root.add(fronts);
      const hl = new THREE.Group(); root.add(hl);
      const coldM = sm(0x3b82f6, { transparent: true, opacity: 0.5, roughness: 0.3, depthWrite: false }), warmM = sm(0xf59e0b, { transparent: true, opacity: 0.4, roughness: 0.3, depthWrite: false });
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
      /* 수조 모형 (칸막이를 빼면 찬물은 아래로, 따뜻한 물은 위로) */
      const tank = new THREE.Group(); root.add(tank); tank.visible = false;
      const TW = 3.5, TH = 2.4;
      const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(TW * 2, TH, DZ)), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 })); frame.position.y = TH / 2; tank.add(frame);
      const tkLive = new THREE.Group(); tank.add(tkLive);
      const part = new THREE.Mesh(new THREE.BoxGeometry(0.06, TH, DZ), sm(0xe2e8f0, { transparent: true, opacity: 0.8 })); part.position.set(0, TH / 2, 0); tank.add(part);
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
        sc = n; const isTank = n === 'tank', isHL = n === 'column';
        tank.visible = isTank; fronts.visible = !isTank && !isHL; hl.visible = isHL; home.visible = !isTank && !isHL;
        tkW.show(isTank); tkC.show(isTank); rainI.visible = !isTank && !isHL; airs.visible = !isTank && !isHL;
        if (isHL) { buildHL(); } else if (isTank) { wL.show(false); cL.show(false); fL.show(false); } else buildFront();
        pTank.row.forEach((e) => { e.style.display = isTank ? '' : 'none'; }); pFront.row.forEach((e) => { e.style.display = !isTank && !isHL ? '' : 'none'; });
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
      pTank.row.forEach((e) => { e.style.display = 'none'; });
      setScene('front');
      return {
        update(dt, t) {
          const L = ctx.lesson(), S = L && L.S;
          if (S) {
            const ns = S.scene === 'tank' ? 'tank' : S.scene === 'column' ? 'column' : 'front';
            if (ns !== sc) { sc = ns; setScene(ns); }
            if (sc === 'front') { const m = S.fr.type === 'warm' ? 'warm' : 'cold', nf = -5 + S.fr.xS / 10, k = m + '|' + nf.toFixed(2); if (k !== sig) { sig = k; mode = m; f = nf; buildFront(); } }
            else if (sc === 'tank') { const o = Math.round(S.tk.open * 50) / 50; if (o !== tkO) { tkO = o; buildTank(o); info('<b>수조 모형</b> · 왼쪽은 따뜻한 물, 오른쪽은 찬물이에요.<br>' + (S.tk.released ? '칸막이를 빼니 <span style="color:#93c5fd">찬물(파랑)은 아래로</span>, <span style="color:#fdba74">따뜻한 물(주황)은 위로</span> 움직여요.' : '🧹 칸막이를 빼고 어떻게 움직이는지 관찰해요.')); } else if (S.tk.released !== tkSig) { tkSig = S.tk.released; } }
          }
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
