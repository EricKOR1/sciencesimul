/* m3-pressure-wind · 3D 바람의 순환 (해륙풍 · 계절풍)
   더워진 쪽 공기는 팽창해 위로 올라가 저기압, 차가운 쪽은 공기가 가라앉아 고기압이 돼요. 바람은 고기압 → 저기압으로 불어요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const TAU = Math.PI * 2, cl01 = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  /* 2D 차시와 같은 식 (해륙풍: 하루 시각에 따른 땅·바다 온도) */
  const tLand = (h) => 21 + 9 * Math.sin(TAU * (h - 8) / 24);
  const tSea = (h) => 21 + 0.8 * Math.sin(TAU * (h - 11) / 24);
  const sstep = (a0, b0, x) => { const t = cl01((x - a0) / (b0 - a0), 0, 1); return t * t * (3 - 2 * t); };
  const bright = (h) => sstep(5.5, 8.5, h) * (1 - sstep(17, 20, h));
  const hourLabel = (h) => { h = Math.round(h) % 24; return h === 0 ? '밤 12시' : h < 12 ? '오전 ' + h + '시' : h === 12 ? '낮 12시' : h < 18 ? '오후 ' + (h - 12) + '시' : h < 21 ? '저녁 ' + (h - 12) + '시' : '밤 ' + (h - 12) + '시'; };
  window.SciSim3D.attach({
    host: '.stage-card',
    title: '바람의 순환 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHN ? 19 : 14.5, theta: 0.3, phi: 1.28, min: 7, max: 30, target: [0, 1.4, 0] },
    autoRotate: 0,
    levels: [0, 1, 2, 3],
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      const V3 = THREE.Vector3, C = THREE.Color;
      let age = 0, tp = 0, sig = '', c = null, run = false, partsOn = true;
      const sm = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.7, metalness: 0 }, o || {}));
      const MT = ctx.mats;   // 실제 같은 재질 (유리 · 물 · 수은 · 나무 · 돌)
      const D = 5;
      const mkTex = (w, h, draw, rx, ry) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); const tx = new THREE.CanvasTexture(cv); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; if (rx) tx.repeat.set(rx, ry || rx); tx.anisotropy = 4; return tx; };
      let rs = 11; const rnd = () => { rs = (rs * 16807) % 2147483647; return rs / 2147483647; };
      const woodTex = mkTex(512, 256, (x, w, h) => { x.fillStyle = '#b98a55'; x.fillRect(0, 0, w, h); for (let i = 0; i < 90; i++) { const y = rnd() * h; x.strokeStyle = 'rgba(' + (70 + rnd() * 40) + ',' + (40 + rnd() * 30) + ',20,' + (0.08 + rnd() * 0.15) + ')'; x.lineWidth = 0.6 + rnd() * 2; x.beginPath(); x.moveTo(0, y); for (let k = 1; k <= 8; k++) x.lineTo(k * w / 8, y + Math.sin(k + i) * 3); x.stroke(); } x.strokeStyle = 'rgba(60,35,15,.35)'; x.lineWidth = 2; for (let k = 1; k < 4; k++) { x.beginPath(); x.moveTo(0, k * h / 4); x.lineTo(w, k * h / 4); x.stroke(); } }, 1.6, 1);
      const sandTex = mkTex(256, 256, (x, w, h) => { x.fillStyle = '#e8d3a0'; x.fillRect(0, 0, w, h); for (let i = 0; i < 2400; i++) { const v = 150 + rnd() * 90 | 0; x.fillStyle = 'rgba(' + v + ',' + (v * 0.85 | 0) + ',' + (v * 0.55 | 0) + ',.5)'; x.fillRect(rnd() * w, rnd() * h, 1.5, 1.5); } }, 2, 1.6);
      const waveTex = mkTex(256, 256, (x, w, h) => { x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h); x.strokeStyle = 'rgba(120,180,240,.35)'; x.lineWidth = 2; for (let j = 0; j < 14; j++) { x.beginPath(); for (let i = 0; i <= 32; i++) { const X = i * w / 32, Y = (j + 0.5) * h / 14 + Math.sin(i * 0.8 + j * 2) * 5; i ? x.lineTo(X, Y) : x.moveTo(X, Y); } x.stroke(); } }, 2, 1.5);
      /* 바다 · 육지 */
      const seaM = new THREE.MeshPhysicalMaterial({ color: 0x1d6fb5, map: waveTex, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.1, transparent: true, opacity: 0.93 });
      const sea = new THREE.Mesh(new THREE.BoxGeometry(D, 1.2, 4.2, 40, 1, 12), seaM); sea.position.set(-D / 2, -0.6, 0); root.add(sea);
      const seaTop = sea.geometry.attributes.position; const seaY0 = []; for (let i = 0; i < seaTop.count; i++) seaY0.push(seaTop.getY(i));
      const landM = sm(0xd8b873, { roughness: 0.95, map: sandTex }); const land = new THREE.Mesh(new THREE.BoxGeometry(D, 1.2, 4.2), landM); land.position.set(D / 2, -0.6, 0); root.add(land);
      const hills = new THREE.Group(); [[1.5, 1.0, 0.8], [2.4, 0.6, -0.9], [3.4, 1.3, 0.2], [4.2, 0.7, -0.4]].forEach((q) => { const m = new THREE.Mesh(new THREE.ConeGeometry(q[1] * 0.9, q[1] * 1.1, 24), sm(0x3f7d3a, { roughness: 0.9 })); m.position.set(q[0], q[1] * 0.55, q[2]); hills.add(m); m.material.flatShading = true; m.material.color.setHex(0x5b6b55); m.geometry = new THREE.ConeGeometry(q[1] * 0.9, q[1] * 1.1, 7, 1); m.rotation.y = q[0]; const cap = new THREE.Mesh(new THREE.ConeGeometry(q[1] * 0.28, q[1] * 0.34, 7), sm(0xf8fafc, { roughness: 0.8, flatShading: true })); cap.position.y = q[1] * 0.38; cap.rotation.y = q[0]; m.add(cap); }); root.add(hills);
      [[0.5, 1.3], [1.0, -1.5], [1.9, 1.6], [2.8, -1.7], [3.0, 1.3], [3.8, -1.4], [4.5, 1.5], [4.4, -1.7], [0.7, -0.3]].forEach((q, i) => { const tr = new THREE.Group(), kk = 0.8 + (i % 3) * 0.15; const tk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.3, 6), sm(0x6b4423)); tk.position.y = 0.15; tr.add(tk); [0.3, 0.55].forEach((yy, j) => { const cn = new THREE.Mesh(new THREE.ConeGeometry(0.28 - j * 0.07, 0.5, 8), sm(0x2f7d46, { roughness: 0.85 })); cn.position.y = 0.3 + yy; tr.add(cn); }); tr.scale.setScalar(kk); tr.position.set(q[0], 0, q[1]); hills.add(tr); });
      const boat = new THREE.Group(); { const hull = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.18, 0.34), sm(0xf8fafc, { roughness: 0.4 })); hull.position.y = 0.08; boat.add(hull); const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.8, 6), sm(0x475569)); mast.position.y = 0.55; boat.add(mast); const sailG = new THREE.Shape(); sailG.moveTo(0, 0); sailG.lineTo(0.5, 0); sailG.lineTo(0, 0.7); const sail = new THREE.Mesh(new THREE.ShapeGeometry(sailG), sm(0xfef3c7, { side: THREE.DoubleSide, roughness: 0.9 })); sail.position.set(0.03, 0.2, 0); boat.add(sail); boat.position.set(-3.4, 0.62, 0.9); root.add(boat); }
      const snow0 = null;
      const snow = new THREE.Mesh(new THREE.BoxGeometry(D - 0.1, 0.08, 4.1), sm(0xf1f5f9, { roughness: 0.9 })); snow.position.set(D / 2, 0.04, 0); root.add(snow);
      /* 열기 · 냉기 표시 (땅 위 반투명 판) */
      const heatM = new THREE.MeshBasicMaterial({ color: 0xff3a1a, transparent: true, opacity: 0.0, depthWrite: false }); const heat = new THREE.Mesh(new THREE.BoxGeometry(D, 0.06, 4.2), heatM); heat.position.set(D / 2, 0.06, 0); root.add(heat);
      const heat2 = new THREE.Mesh(new THREE.BoxGeometry(D, 0.06, 4.2), new THREE.MeshBasicMaterial({ color: 0xff5a2a, transparent: true, opacity: 0, depthWrite: false })); heat2.position.set(-D / 2, 0.07, 0); root.add(heat2);
      /* 해 · 달 */
      const sun = new THREE.Mesh(new THREE.SphereGeometry(0.7, 28, 20), new THREE.MeshBasicMaterial({ color: 0xffd34d })); sun.position.set(2.6, 5.4, -2); root.add(sun); ctx.halo(sun, 0xffd34d, 3.2, 0.6);   // 햇빛 번짐
      const moon = new THREE.Mesh(new THREE.SphereGeometry(0.55, 28, 20), sm(0xe2e8f0, { emissive: 0x94a3b8, emissiveIntensity: 0.5 })); moon.position.set(2.6, 5.4, -2); root.add(moon);
      /* 순환 고리 */
      const RX = 4.2, CY = 2.3, RY = 1.5;
      const loopAt = (a) => new V3(RX * Math.cos(a) * 0.95, CY + RY * Math.sin(a), 0.0);
      const loopPts = []; for (let i = 0; i <= 96; i++) loopPts.push(loopAt(i / 96 * Math.PI * 2));
      const ring = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(loopPts, true), 160, 0.035, 8, true), new THREE.MeshBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.35 })); root.add(ring);
      const N = 46, parts = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 14, 10), new THREE.MeshStandardMaterial({ roughness: 0.4, emissiveIntensity: 0.3 }), N); root.add(parts);
      for (let i = 0; i < N; i++) parts.setColorAt(i, new C(0xffffff));
      const arrows = []; for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.6, 14), sm(0xffd34d, { emissive: 0x6b4a00, emissiveIntensity: 0.5, roughness: 0.4 })); root.add(m); arrows.push(m); }
      const dm = new THREE.Object3D(), cw = new C(), cc = new C(0x7dd3fc), ch = new C(0xff8a4a);
      const labH = label('', [0, 0, 0], { size: 14 }), labL = label('', [0, 0, 0], { size: 14 });
      const labTs = label('', [-D / 2, 0.3, 2.3], { color: 'rgba(14,116,144,.92)', size: 13 }), labTl = label('', [D / 2, 0.3, 2.3], { color: 'rgba(180,83,9,.92)', size: 13 });
      const labW = label('', [0, 0.45, 2.4], { color: 'rgba(30,41,59,.92)', size: 14 });

      /* ===== 앞 단계 실험: 컵 뒤집기 · 찌그러지는 페트병 · 토리첼리 실험 (2D와 같은 값) ===== */
      const mainG = new THREE.Group(); Array.from(root.children).forEach((o) => mainG.add(o)); root.add(mainG);
      const skyC = document.createElement('canvas'); skyC.width = 4; skyC.height = 256; { const x = skyC.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#2f7fd0'); g.addColorStop(0.55, '#8cc8f2'); g.addColorStop(0.62, '#e8f3fb'); g.addColorStop(1, '#e8f3fb'); x.fillStyle = g; x.fillRect(0, 0, 4, 256); }
      const sky = new THREE.Mesh(new THREE.SphereGeometry(45, 24, 16), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(skyC), side: THREE.BackSide, depthWrite: false, color: 0xffffff })); sky.renderOrder = -10; root.add(sky);
      const ground = new THREE.Mesh(new THREE.CircleGeometry(40, 48), new THREE.MeshStandardMaterial({ color: 0x1c2636, roughness: 0.9 })); ground.rotation.x = -Math.PI / 2; ground.position.y = -1.25; ground.receiveShadow = true; root.add(ground);
      const skyDay = new C(0xffffff), skyNight = new C(0x1a2038), skyLab = new C(0x55657d), skyTmp = new C();
      let dayA = 1;
      const mainLabs = [labH, labL, labTs, labTl, labW];
      const expG = new THREE.Group(); root.add(expG); expG.visible = false;
      const cupG = new THREE.Group(), btG = new THREE.Group(), tbG = new THREE.Group(); expG.add(cupG, btG, tbG);
      const tableM = new THREE.Mesh(new THREE.BoxGeometry(11, 0.24, 5), sm(0xc9a27c, { roughness: 0.55, map: woodTex })); tableM.position.y = -0.12; tableM.receiveShadow = true; expG.add(tableM);
      { const apr = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.5, 4.6), MT.wood(0x8a6a48)); apr.position.y = -0.5; expG.add(apr); [[-5, -2.1], [5, -2.1], [-5, 2.1], [5, 2.1]].forEach((q) => { const lg = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.0, 0.4), sm(0x6a4c30, { roughness: 0.7 })); lg.position.set(q[0], -1.0, q[1]); expG.add(lg); });
        const wall = new THREE.Mesh(new THREE.PlaneGeometry(40, 18), sm(0xcfdae6, { roughness: 0.95 })); wall.position.set(0, 6, -6); expG.add(wall);
        const win = new THREE.Mesh(new THREE.PlaneGeometry(6, 4), new THREE.MeshBasicMaterial({ color: 0xcfeaff })); win.position.set(-6, 6.5, -5.95); expG.add(win);
        const wf = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(6, 4)), new THREE.LineBasicMaterial({ color: 0xffffff })); wf.position.copy(win.position); expG.add(wf);
        const sh = new THREE.Mesh(new THREE.BoxGeometry(7, 0.12, 0.8), sm(0x8b6a45, { roughness: 0.7, map: woodTex })); sh.position.set(6, 5.2, -5.5); expG.add(sh);
        [[4.2, 0x38bdf8], [5.4, 0xfb923c], [6.6, 0x4ade80], [7.6, 0xf472b6]].forEach((q, i) => { const bt = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.9 + (i % 2) * 0.3, 16), sm(q[1], { transparent: true, opacity: 0.6, roughness: 0.1 })); bt.position.set(q[0] + 0.4, 5.26 + 0.5 + (i % 2) * 0.15, -5.5); expG.add(bt); });
      }
      // 실험실 책상 · 벽 · 창문 · 선반은 배경: 자동 맞춤이 컵 · 페트병 · 유리관에 맞춰요
      expG.children.forEach((o) => { if (o !== cupG && o !== btG && o !== tbG) o.traverse((m) => { if (m.isMesh || m.isLine) m.userData.v3bg = true; }); });
      const ARM = { shaft: new THREE.CylinderGeometry(1, 1, 1, 10).rotateX(Math.PI / 2).translate(0, 0, 0.5), head: new THREE.ConeGeometry(1, 1, 14).rotateX(Math.PI / 2).translate(0, 0, 0.5) };
      function mkArr(col, parent) { const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: col, roughness: 0.5, transparent: true }); g.add(new THREE.Mesh(ARM.shaft, m), new THREE.Mesh(ARM.head, m)); g.userData.m = m; parent.add(g); return g; }
      function setArr(g, from, to, w, al) { const d = to.clone().sub(from), L = d.length(); g.position.copy(from); if (L > 1e-4) g.lookAt(to); const hl = Math.min(L * 0.5, 0.15 + w * 4); g.children[0].scale.set(w, w, Math.max(0.001, L - hl)); g.children[1].position.z = L - hl; g.children[1].scale.set(w * 2.6, w * 2.6, hl); g.userData.m.opacity = al; g.visible = al > 0.02 && L > 0.02; }
      const expLabs = [];
      const EL = (txt, obj, col, size) => { const l = label(txt, obj, { size: size || 12, color: col || 'rgba(15,23,42,.9)' }); l.show(false); expLabs.push(l); return l; };
      /* -- 컵 -- */
      const cupAnchor = new THREE.Group(); cupAnchor.position.set(0, 2.5, 0); cupG.add(cupAnchor);
      const glass = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.0, 2.6, 48, 1, true), MT.glass({ opacity: 0.24 })); cupAnchor.add(glass);
      const cupBot = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.08, 48), MT.glass({ opacity: 0.4 })); cupBot.position.y = -1.3; cupAnchor.add(cupBot);
      const cupWater = new THREE.Mesh(new THREE.CylinderGeometry(1.12, 0.98, 2.5, 48), MT.liquid(0x3f95e0, { opacity: 0.58 })); cupWater.position.y = -0.03; cupAnchor.add(cupWater);
      const paperM = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.05, 2.7), MT.fabric(0xfffdf6)); paperM.position.y = 1.33; cupAnchor.add(paperM);
      const hand = new THREE.Group(); { const palm = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.3, 1.2), sm(0xf6c9a8, { roughness: 0.7, transparent: true })); hand.add(palm); for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.55, 4, 8), sm(0xf6c9a8, { roughness: 0.7, transparent: true })); f.rotation.z = Math.PI / 2; f.position.set(1.0, 0, -0.45 + i * 0.3); hand.add(f); } hand.position.y = 1.75; cupAnchor.add(hand); }
      const airA = [0, 1, 2, 3, 4].map(() => mkArr(0x2563eb, cupG)), airS = [0, 1, 2, 3, 4, 5, 6, 7].map(() => mkArr(0x60a5fa, cupG)), wtA = mkArr(0xef4444, cupG);
      const cupL = [EL('대기압 — 모든 방향에서 눌러요', [0, 5.6, 0], 'rgba(37,99,235,.92)', 13), EL('물의 무게 (작아요)', [1.6, 1.3, 0], 'rgba(185,28,28,.9)'), EL('종이', [0, 0, 0], 'rgba(100,116,139,.92)')];
      const cupBtns = [];
      const cupAng = controls.range('🔄 컵 돌리기', 0, 180, 1, 0, (v) => { const L = ctx.lesson(); if (L && L.angUI) L.angUI.set(v); }, (v) => v + '°');
      const handB = controls.button('🖐️ 손 떼기', () => { const b = document.getElementById('handBtn'); if (b) b.click(); });
      /* -- 페트병 -- */
      const BU = 0.017;
      const btHW = (yy, c) => { let w; if (yy < 14) w = 50 * (0.74 + 0.26 * Math.sqrt(Math.max(0, 1 - Math.pow((14 - yy) / 14, 2)))); else if (yy <= 176) w = 50; else if (yy <= 212) { const k = (yy - 176) / 36; w = 50 + (15 - 50) * k * k * (3 - 2 * k); } else w = 15; if (yy > 8 && yy < 205) { const k = Math.max(0, Math.min(1.1, c)), dent = 0.5 + 0.5 * Math.sin(yy * 0.075 + 1.0); w *= 1 - k * (0.2 + 0.32 * dent) * (yy > 176 ? 0.6 : 1); } return w; };
      const NPR = 64, NSEG = 28, bGeo = new THREE.LatheGeometry(Array.from({ length: NPR }, (_, j) => new THREE.Vector2(1, j / (NPR - 1) * 252 * BU)), NSEG);
      const bottle = new THREE.Mesh(bGeo, MT.glass({ tint: 0xd6efff, opacity: 0.3 })); btG.add(bottle);   // 페트병: 맑고 반짝이게
      const bWater = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 1, 36), MT.liquid(0xff8a4a, { opacity: 0.7 })); btG.add(bWater);
      const bCap = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.28, 28), MT.plastic(0x2563eb, { roughness: 0.3 })); btG.add(bCap);
      const NBA = 34, bAir = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), NBA); btG.add(bAir);
      const bSeed = Array.from({ length: NBA }, (_, i) => ({ a: i * 2.4, r: Math.sqrt(((i * 37) % 100) / 100) * 0.7, y: 0.25 + ((i * 53) % 100) / 100 * 2.9, ph: i * 1.7, k: 0.6 + (i % 5) * 0.2 }));
      const bOut = [0, 1, 2, 3, 4, 5].map(() => mkArr(0x2563eb, btG)), bIn = [0, 1, 2, 3, 4, 5].map(() => mkArr(0xf97316, btG));
      const btL = [EL('바깥 공기 (대기압)', [-2.0, 2.4, 0.5], 'rgba(37,99,235,.92)'), EL('병 속 공기', [0, 1.3, 0], 'rgba(194,65,12,.92)')];
      const btB = controls.button('♨️ 뜨거운 물 붓기', () => { const b = document.getElementById('btBtn'); if (b && !b.disabled) b.click(); });
      /* -- 토리첼리 실험 -- */
      const CM = 0.06, TL = 95 * CM;
      const dish = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.3, 0.7, 48), MT.glass({ opacity: 0.32 })); dish.position.set(0, 0.35, 0); tbG.add(dish);
      const merc = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.5, 48), MT.metal('chrome', { roughness: 0.06 })); merc.position.set(0, 0.25, 0); tbG.add(merc);   // 수은: 거울처럼 반짝여요
      const pivot = new THREE.Group(); pivot.position.set(0, 0.1, 0); tbG.add(pivot);
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, TL + 0.3, 28, 1, true), MT.glass({ opacity: 0.28 })); tube.position.y = (TL + 0.3) / 2 - 0.3; pivot.add(tube);
      const hgCol = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 1, 24), MT.metal('chrome', { roughness: 0.06 })); pivot.add(hgCol);
      const rule = new THREE.Group(); tbG.add(rule); rule.position.set(-1.3, 0.5, 0.2); { const bar = new THREE.Mesh(new THREE.BoxGeometry(0.2, 100 * CM, 0.05), sm(0xf8fafc)); bar.position.y = 50 * CM; rule.add(bar); for (let cm = 0; cm <= 100; cm += 10) { const tk = new THREE.Mesh(new THREE.BoxGeometry(cm % 50 === 0 ? 0.38 : 0.26, 0.02, 0.06), sm(0x475569)); tk.position.set(0.12, cm * CM, 0.02); rule.add(tk); } }
      const lvl = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.02, 0.02), new THREE.MeshBasicMaterial({ color: 0xef4444 })); lvl.position.x = 0; tbG.add(lvl);
      const lvl76 = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.015, 0.015), new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.8 })); lvl76.position.set(0, 0.5 + 76 * CM, 0); tbG.add(lvl76);
      const mtn = new THREE.Mesh(new THREE.ConeGeometry(2.0, 4.6, 7), MT.stone(0x55604a, { cracks: true, repeat: 2, bump: 0.05 })); mtn.position.set(4.6, 2.2, -1.0); tbG.add(mtn);   // 산: 바위 질감
      const flag = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), sm(0xef4444)); tbG.add(flag);
      const tAir = [0, 1, 2].map(() => mkArr(0x2563eb, tbG));
      const tbDots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }), 46); tbG.add(tbDots);
      const tbL = [EL('1기압 = 76 cm', [-1.9, 0.5 + 76 * CM, 0], 'rgba(217,119,6,.95)'), EL('', [1.9, 1, 0], 'rgba(239,68,68,.95)'), EL('진공 (텅 빈 곳)', [0.9, 5.6, 0], 'rgba(71,85,105,.92)'), EL('대기압', [0, 2.3, 0], 'rgba(37,99,235,.92)'), EL('', [4.6, 5, 0], 'rgba(30,41,59,.92)')];
      const altR = controls.range('⛰️ 높이', 0, 8000, 100, 0, (v) => { const L = ctx.lesson(); if (L && L.setAlt) L.setAlt(v); }, (v) => v.toLocaleString('ko-KR') + ' m');
      const tiltR = controls.range('관 기울이기', 0, 35, 1, 0, (v) => { const L = ctx.lesson(); if (L && L.setTilt) L.setTilt(v); }, (v) => v + '°');
      const hostE = ctx.controls.text('').parentNode;
      let cupEls = null, btEls = [btB], tbEls = null, otherEls = null;
      const initEls = () => { const kidsE = Array.from(hostE.children), findE = (txt) => kidsE.findIndex((e) => e.textContent.indexOf(txt) === 0); cupEls = kidsE.slice(findE('🔄 컵 돌리기'), findE('🔄 컵 돌리기') + 3); tbEls = kidsE.slice(findE('⛰️ 높이'), findE('⛰️ 높이') + 4); otherEls = kidsE.filter((e) => !cupEls.includes(e) && !btEls.includes(e) && !tbEls.includes(e)); };
      const showEls = (els, v) => els.forEach((e) => { e.style.display = v ? '' : 'none'; });
      const expUI = (sc) => { if (!cupEls) initEls(); showEls(cupEls, sc === 'cup'); showEls(btEls, sc === 'bottle'); showEls(tbEls, sc === 'tube'); const main = !(sc === 'cup' || sc === 'bottle' || sc === 'tube'); otherEls.forEach((e) => { e.style.display = main ? '' : 'none'; }); };
      let lastExp = null, expSig = '';
      const pressAt = (m) => 1013.25 * Math.pow(1 - 2.25577e-5 * m, 5.25588), cmHgAt = (m) => 76 * pressAt(m) / 1013.25;
      const V = (x, y, z) => new V3(x, y, z);
      function expFrame(S, sc, dt, t) {
        if (sc === 'cup') {
          const c = S.cup, th = c.angS * Math.PI / 180, mx = Math.sin(th), my = Math.cos(th);
          cupAnchor.rotation.z = -th; cupAnchor.position.set(0, 2.5, 0); paperM.position.x = 0; paperM.position.y = 1.33 + Math.sin(t * 38) * c.quiver * 0.02;
          hand.position.set(-1.6 * c.hand, 1.75 + 0.9 * c.hand, 0); hand.visible = c.hand < 0.98; hand.traverse((m) => { if (m.material) m.material.opacity = 1 - c.hand; });
          const aA = 0.3 + 0.7 * c.hand, pulse = Math.sin(t * 5) * 0.15, tx = Math.cos(th), ty = -Math.sin(th), ctr = V(0, 2.5, 0);
          airA.forEach((g, k) => { const o = (k - 2) * 0.55, p0 = ctr.clone().add(V(mx * (2.6 + pulse) + tx * o, my * (2.6 + pulse) + ty * o, 0)), p1 = ctr.clone().add(V(mx * 1.75 + tx * o * 0.9, my * 1.75 + ty * o * 0.9, 0)); setArr(g, p0, p1, 0.06, aA * (k === 2 ? 1 : 0.85)); });
          airS.forEach((g, i) => { const a = th + Math.PI / 2 + i * (Math.PI * 2 / 8), dx = Math.cos(a), dy = Math.sin(a), dot = dx * mx + dy * my; setArr(g, ctr.clone().add(V(dx * 2.45, dy * 2.45, 0)), ctr.clone().add(V(dx * 2.0, dy * 2.0, 0)), 0.05, dot > 0.55 || c.hand <= 0.5 ? 0 : 0.5 * (c.hand - 0.5) * 2); });
          const pp = ctr.clone().add(V(mx * 1.45, my * 1.45, 0)); setArr(wtA, pp.clone().add(V(0.8, 0.1, 0.9)), pp.clone().add(V(0.8, -0.7, 0.9)), 0.05, 0.9);
          cupL[0].obj = [0, 5.7, 0]; cupL[0].show(c.hand > 0.6); cupL[1].obj = [pp.x + 1.6, pp.y - 0.3, 0.9]; cupL[1].show(c.hand > 0.6); cupL[2].obj = [pp.x - mx * 0 - 1.7 * tx, pp.y - 1.7 * ty, 0]; cupL[2].show(false);
          cupAng.set(Math.round(c.ang)); handB.textContent = c.held ? '🖐️ 손 떼기' : '🖐️ 손 다시 받치기';
          const key = [c.held, c.inv, c.angS > 90, c.hand > 0.6].join('|');
          if (key !== expSig) { expSig = key; info('<b>컵을 뒤집어도 종이가 안 떨어져요</b><br>' + (c.hand > 0.6 ? '손을 떼도 종이가 붙어 있어요! <b>대기압</b>이 모든 방향에서 눌러서 종이를 받쳐요. 물의 무게보다 공기가 미는 힘이 훨씬 커요.' : c.angS > 90 ? '손이 받치고 있어요. 손을 떼 볼까요?' : '컵 돌리기 슬라이더로 컵을 뒤집어 보세요.')); }
        } else if (sc === 'bottle') {
          const b = S.bt, c = Math.max(0, Math.min(1.08, b.c.value)), hot = Math.max(0, Math.min(1, (b.T - 30) / 38));
          const pos = bGeo.attributes.position;
          for (let i = 0; i <= NSEG; i++) for (let j = 0; j < NPR; j++) { const yy = j / (NPR - 1) * 252, ph = i / NSEG * Math.PI * 2, r = btHW(yy, c) * BU * (1 + c * 0.1 * Math.sin(3 * ph + yy * 0.05)); pos.setXYZ(i * NPR + j, Math.sin(ph) * r, yy * BU, Math.cos(ph) * r); }
          pos.needsUpdate = true; bGeo.computeVertexNormals();
          const wl = b.water * 252 * BU / 0.16 * 0.16; bWater.visible = b.water > 0.01; bWater.scale.set(1, Math.max(0.01, wl), 1); bWater.position.y = wl / 2 + 0.05; bWater.material.color.setRGB(1, 0.62 - 0.3 * hot, 0.35 - 0.2 * hot);
          bCap.position.y = 252 * BU + 0.28 + (1 - b.capT) * 1.2; bCap.visible = b.capT > 0.02;
          const spd = Math.sqrt((b.T + 273) / 298);
          for (let i = 0; i < NBA; i++) { const q = bSeed[i], a = q.a + t * q.k * spd * 2.0, r = q.r * (1 - c * 0.3); dm.position.set(Math.cos(a) * r * 0.9, q.y * (1 - 0.05 * c) + Math.sin(t * 3 * q.k * spd + q.ph) * 0.12, Math.sin(a) * r * 0.9); dm.scale.setScalar(1); dm.updateMatrix(); bAir.setMatrixAt(i, dm.matrix); } bAir.instanceMatrix.needsUpdate = true; bAir.material.color.setRGB(1, 1 - 0.55 * hot, 1 - 0.8 * hot);
          const pin = b.stage >= 2 ? (b.T + 273) / (b.Tseal + 273) : 1;
          bOut.forEach((g, i) => { const a = i / 6 * Math.PI * 2 + 0.3, r1 = 1.75 + Math.sin(t * 5) * 0.07, r0 = 1.0 - c * 0.2, y = 1.9; setArr(g, V(Math.cos(a) * r1, y, Math.sin(a) * r1), V(Math.cos(a) * (r0 + 0.2), y, Math.sin(a) * (r0 + 0.2)), 0.05, 0.9); });
          bIn.forEach((g, i) => { const a = i / 6 * Math.PI * 2 + 0.3 + 0.52, len = 0.5 * pin, r0 = 0.15, y = 1.9; setArr(g, V(Math.cos(a) * r0, y, Math.sin(a) * r0), V(Math.cos(a) * (r0 + len), y, Math.sin(a) * (r0 + len)), 0.045, b.stage >= 1 ? 0.9 : 0.55); });
          btL[0].show(true); btL[1].show(true);
          btB.textContent = (document.getElementById('btBtn') || {}).textContent || btB.textContent; btB.disabled = !!(document.getElementById('btBtn') && document.getElementById('btBtn').disabled);
          const key = b.stage + '|' + b.done + '|' + Math.round(b.T / 5);
          if (key !== expSig) { expSig = key; info('<b>찌그러지는 페트병</b><br>' + (b.done ? '병이 찌그러졌어요! 병 속 공기가 식어 <b>안쪽 압력이 줄어서</b>, 바깥 <b>대기압</b>이 병을 눌렀어요.' : b.stage === 3 ? '찬물로 식히는 중이에요. 병 속 공기 입자가 느려져 안쪽에서 미는 힘이 약해져요.' : b.stage === 2 ? '뚜껑을 닫았어요. 이제 병 속 공기를 식혀 볼까요?' : b.stage === 1 ? '뜨거운 물로 병 속 공기를 데워요. 공기 입자가 빨라져요.' : '아래 버튼을 차례로 눌러 실험해 보세요.')); }
        } else {
          const b = S.tb, th = b.tiltS * Math.PI / 180, h = b.h.value, cs = Math.cos(th), k = Math.max(0, Math.min(1, b.altS / 8000));
          pivot.rotation.z = -th; const sLen = Math.min(h / Math.max(0.3, cs), 95) * CM; hgCol.scale.set(1, Math.max(0.01, sLen + 0.3), 1); hgCol.position.y = (sLen + 0.3) / 2 - 0.3;
          const topY = 0.5 + h * CM; lvl.position.y = topY; lvl.material.color.set(0xef4444);
          tbL[1].obj = [1.9, topY, 0]; tbL[1].set('수직 높이 ' + h.toFixed(1) + ' cm'); tbL[1].show(true); tbL[0].show(true);
          const dens = pressAt(b.altS) / 1013.25, len = 0.5 + 0.9 * dens, pu = Math.sin(t * 5) * 0.06;
          tAir.forEach((g, i) => { const x = [-0.9, 0.3, 0.9][i]; setArr(g, V(x, 2.0 + len + pu, 0.6), V(x, 0.78 + pu * 0.3, 0.6), 0.06, 0.95); });
          tbL[3].obj = [0, 2.25 + len, 0.6]; tbL[3].show(true);
          const vac = 95 * CM - sLen; tbL[2].obj = [0.9, 0.1 + sLen + vac / 2, 0]; tbL[2].show(vac > 0.5);
          { const fy = 0.3 + k * 4.0; flag.position.set(mtn.position.x - 2.0 * (1 - fy / 4.6) - 0.1, fy, mtn.position.z + 0.5); } tbL[4].obj = [flag.position.x + 1.0, flag.position.y + 0.5, flag.position.z]; tbL[4].set('해발 ' + (Math.round(b.altS / 10) * 10).toLocaleString('ko-KR') + ' m'); tbL[4].show(true);
          b.dots.forEach((d, i) => { if (i >= 46) return; dm.position.set((d.x / 800 - 0.5) * 11, 0.6 + d.y / 400 * 6 + Math.sin(t * 0.5 + d.ph) * 0.05, -1.4 + (i % 4) * 0.2); dm.scale.setScalar(Math.max(0.0001, d.a * 2)); dm.updateMatrix(); tbDots.setMatrixAt(i, dm.matrix); }); tbDots.instanceMatrix.needsUpdate = true;
          altR.set(b.alt); tiltR.set(b.tilt);
          const key = Math.round(h * 2) + '|' + Math.round(b.tiltS);
          if (key !== expSig) { expSig = key; info('<b>토리첼리 실험</b> · 수은 기둥의 수직 높이 <b>' + h.toFixed(1) + ' cm</b><br>' + (b.altS > 300 ? '높이 올라갈수록 대기압이 낮아져서 수은 기둥이 낮아져요.' : b.tiltS > 1 ? '관을 기울여도 수직 높이는 76 cm로 그대로예요. (관 속 길이만 길어져요)' : '해수면에서 수은 기둥은 약 76 cm예요. 이것이 1기압이에요.')); }
        }
      }

      /* 지금 2D 장면에서 상황을 읽어요 */
      function read() {
        const S = (ctx.lesson() || {}).S || {}, sc = S.scene;
        if (sc === 'coast' && S.co) {
          const h = S.co.hourS, tl = tLand(h), ts = tSea(h), w = cl01((tl - ts) / 8, -1, 1);
          const hide = !!S.co.guessActive && Math.abs(w) > 0.2 && (Math.round(h) % 24 >= 22 || Math.round(h) % 24 <= 5);
          return { k: 'coast', L: '육지', Sn: '바다', Tl: tl, Ts: ts, warm: w >= 0, str: Math.abs(w) > 0.2 ? Math.abs(w) : 0, hide, day: bright(h) > 0.4, big: false,
            t: hourLabel(h), wind: w > 0.2 ? '해풍 (바다 → 육지)' : w < -0.2 ? '육풍 (육지 → 바다)' : '바람이 거의 없어요', note: '낮에는 육지가 바다보다 빨리 데워지고, 밤에는 빨리 식어요.' };
        }
        if (sc === 'monsoon' && S.mo) {
          const sum = S.mo.sum !== false;
          return { k: 'monsoon', L: '대륙', Sn: '해양', Tl: sum ? 30 : -8, Ts: sum ? 22 : 6, warm: sum, str: 1, hide: false, day: sum, big: true, snow: !sum,
            t: sum ? '여름' : '겨울', wind: sum ? '남동 계절풍' : '북서 계절풍', note: sum ? '여름: 뜨거운 대륙은 저기압, 바다는 고기압이에요.' : '겨울: 차가운 대륙은 고기압, 바다는 저기압이에요.' };
        }
        const k = (S.tk) || { Ts: 25, Tw: 25, lamp: false }, dT = k.Ts - k.Tw;
        return { k: 'tank', L: '모래', Sn: '물', Tl: k.Ts, Ts: k.Tw, warm: true, str: cl01((dT - 0.5) / 6, 0, 1), hide: false, day: !!k.lamp, big: false, lamp: !!k.lamp, smoke: !!k.smoke,
          t: k.lamp ? '전등 켬' : '전등 끔', wind: '연기가 물 → 모래 쪽으로 흘러요', note: '수조 모형: 전등을 켜면 모래가 물보다 빨리 데워져요.' };
      }
      function apply() {
        const dir = c.warm ? 1 : -1, calm = c.str <= 0 || c.hide;
        landM.color.set(c.warm ? (c.big ? 0xa9803d : 0xb98d45) : 0x6f8396); snow.visible = !!c.snow; if (c.k === 'tank') landM.color.set(0xd9b36a);
        hills.visible = c.k !== 'tank'; heatM.opacity = c.warm && !calm ? 0.16 : 0; heat2.material.opacity = 0;
        sun.visible = c.day || c.lamp; moon.visible = !c.day && c.k === 'coast';
        const hi = c.warm ? -D / 2 : D / 2, lo = c.warm ? D / 2 : -D / 2;
        labH.obj = [hi, 4.3, 0]; labL.obj = [lo, 4.3, 0];
        labH.set('고기압 (공기가 내려와요)'); labL.set('저기압 (공기가 올라가요)'); labH.show(!calm); labL.show(!calm);
        labH.el.style.background = 'rgba(37,99,235,.92)'; labL.el.style.background = 'rgba(220,38,38,.92)';
        labTl.set(c.L + ' ' + Math.round(c.Tl) + '°C'); labTs.set(c.Sn + ' ' + Math.round(c.Ts) + '°C');
        labW.set(c.hide ? '바람이 어느 쪽으로 불까요?' : calm ? '바람이 거의 없어요' : c.wind + ' (지표: ' + (c.warm ? c.Sn + ' → ' + c.L : c.L + ' → ' + c.Sn) + ')');
        let h = '<b>' + c.t + '</b> · ' + c.note + '<br>';
        if (c.hide) h += '<span style="color:#fcd34d">밤에는 바람이 어느 쪽으로 불지 맞혀 보세요.</span>';
        else if (calm) h += c.L + '와 ' + c.Sn + '의 온도 차가 작아서 바람이 거의 불지 않아요.';
        else h += '따뜻한 ' + (c.warm ? c.L : c.Sn) + ': 공기가 올라가 <b>저기압</b>, ' + (c.warm ? c.Sn : c.L) + ': 공기가 내려와 <b>고기압</b>.<br>지표에서는 고기압 → 저기압으로 <b>' + c.wind + '</b>이 불어요.';
        if (c.k === 'tank') h += c.smoke ? '<br><span style="color:#e5e7eb">회색 점: 향 연기가 공기를 따라 움직여요.</span>' : '<br><span style="color:#fcd34d">🌫️ 향 연기를 피우면 공기가 흐르는 모습이 보여요.</span>';
        info(h);
        ring.visible = !calm; arrows.forEach((m) => { m.visible = !calm; });
      }
      const sb = controls.button('입자 ✓', () => { partsOn = !partsOn; parts.visible = partsOn; sb.textContent = '입자 ' + (partsOn ? '✓' : '✕'); }); sb.classList.add('on');
      /* 밤바람 맞히기(해륙풍): 2D의 맞히기 카드 누르기(setGuess)와 같아요 */
      const g0 = hostE.children.length;
      controls.text('<b>밤바람</b>');
      const gBtns = [['toLand', '바다 → 육지'], ['toSea', '육지 → 바다']].map(([id, tx]) => { const b = controls.button(tx, () => { const L = ctx.lesson(); if (L && L.setGuess) L.setGuess(id); }); b.dataset.g = id; return b; });
      const guessRow = Array.from(hostE.children).slice(g0);
      /* ▶ 공기의 순환: 따뜻한 쪽에서 올라가 높은 곳에서 차가운 쪽으로 → 내려와 → 지표에서 따뜻한 쪽으로 */
      controls.player({
        duration: 14, loop: true, autoplay: true, label: '공기 순환',
        phases: [[0, '따뜻한 쪽에서 상승'], [0.12, '높은 곳에서 이동'], [0.37, '차가운 쪽에서 하강'], [0.62, '지표에서 바람이 불어요'], [0.87, '다시 상승']],
        onFrame(p) { tp = p; },
      });
      c = read(); apply();
      return {
        update(dt, t) {
          { const S0 = (ctx.lesson() || {}).S, sc0 = S0 && S0.scene, isE = sc0 === 'cup' || sc0 === 'bottle' || sc0 === 'tube';
            if (isE !== expG.visible || lastExp === null || (isE && sc0 !== lastExp)) {
              expG.visible = isE; mainG.visible = !isE; lastExp = isE ? sc0 : ''; expSig = ''; expUI(isE ? sc0 : ''); cupG.visible = sc0 === 'cup'; btG.visible = sc0 === 'bottle'; tbG.visible = sc0 === 'tube';
              expLabs.forEach((l) => l.show(false)); if (isE) mainLabs.forEach((l) => l.show(false)); else sig = '';
              orbit.tx = 0; orbit.ty = isE ? (sc0 === 'tube' ? 3.1 : sc0 === 'bottle' ? 2.2 : 2.6) : 1.4; orbit.dist = isE ? (sc0 === 'tube' ? (PHN ? 24 : 17) : (PHN ? 16 : 8.8)) : (PHN ? 19 : 14.5); if (ctx.refit) ctx.refit(0.4);
            }
            if (isE) { sky.material.color.copy(skyLab); expFrame(S0, sc0, dt, t); return; } }
          const n = read(), ns = [n.k, n.warm, Math.round(n.Tl), Math.round(n.Ts), n.str > 0, n.hide, n.day, n.snow, n.smoke].join('|');
          { const S1 = (ctx.lesson() || {}).S || {}, ga = !!(S1.co && S1.co.guessActive && S1.scene === 'coast');
            guessRow.forEach((e) => { e.style.display = ga ? '' : 'none'; }); if (ga) gBtns.forEach((b) => b.classList.toggle('on', S1.co.guess === b.dataset.g));
            const tk = n.k === 'tank'; sb.style.display = tk ? 'none' : ''; parts.visible = tk ? !!n.smoke : partsOn; }   // 수조: 입자 = 향 연기 (향 연기를 피울 때만)
          if (ns !== sig) { sig = ns; c = n; apply(); } else c.str = n.str;
          const dir = c.warm ? 1 : -1, calm = c.str <= 0 || c.hide, base = c.warm ? 0 : Math.PI;
          for (let i = 0; i < N; i++) {
            const a = base + i / N * Math.PI * 2 + (calm ? 0 : dir * Math.PI * 2 * tp), p = loopAt(a); p.z = Math.sin(i * 7.1) * 1.4; p.y += Math.sin(i * 3.3) * 0.18;
            dm.position.copy(p); dm.scale.setScalar(calm ? 0.6 : 1); dm.updateMatrix(); parts.setMatrixAt(i, dm.matrix);
            const wl = c.warm ? Math.cos(a) : -Math.cos(a);
            if (c.k === 'tank') cw.set(0xd1d5db); else cw.copy(cc).lerp(ch, calm ? 0.5 : Math.max(0, Math.min(1, 0.5 + 0.5 * wl))); parts.setColorAt(i, cw);
          }
          parts.instanceMatrix.needsUpdate = true; if (parts.instanceColor) parts.instanceColor.needsUpdate = true;
          arrows.forEach((m, i) => { const a = base + i / 4 * Math.PI * 2 + dir * Math.PI * 2 * tp, p = loopAt(a), q = loopAt(a + 0.05 * dir); m.position.copy(p); const d = q.sub(p).normalize(); m.quaternion.setFromUnitVectors(new V3(0, 1, 0), d); });
          for (let i = 0; i < seaTop.count; i++) { if (seaY0[i] > 0) seaTop.setY(i, 0.6 + Math.sin(seaTop.getX(i) * 2.2 + t * 1.6) * 0.04 + Math.sin(seaTop.getZ(i) * 3 + t) * 0.03); }
          seaTop.needsUpdate = true;
          sun.position.y = 5.2 + Math.sin(t * 0.8) * 0.08;
          boat.position.y = 0.6 + Math.sin(t * 1.4) * 0.05; boat.rotation.z = Math.sin(t * 1.4 + 1) * 0.06; boat.visible = c.k !== 'tank';
          dayA += ((c.day ? 1 : 0) - dayA) * Math.min(1, dt * 2); sky.material.color.copy(skyNight).lerp(skyDay, dayA);
        },
      };
    },
  });
})();
