/* h1-scale-space · 3D 공간의 규모 (양성자에서 관측 가능한 우주까지)
   크기가 10배씩 커질 때마다 보이는 세계가 달라져요. 대상을 골라 모양을 돌려 보고, 앞 대상보다 몇 배 큰지 확인해요.
   ※ 모형은 보기 좋게 같은 크기로 그렸어요. 실제 크기는 이름표의 길이를 보세요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const OB = [
    { id: 'proton', n: '양성자', m: 1e-15, t: '약 10⁻¹⁵ m', e: -15 }, { id: 'hatom', n: '수소 원자', m: 1e-10, t: '약 10⁻¹⁰ m', e: -10 },
    { id: 'dna', n: 'DNA의 폭', m: 2e-9, t: '약 2×10⁻⁹ m', e: -9 }, { id: 'virus', n: '바이러스', m: 1e-7, t: '약 10⁻⁷ m', e: -7 },
    { id: 'rbc', n: '적혈구', m: 7e-6, t: '약 7×10⁻⁶ m', e: -5 }, { id: 'hair', n: '머리카락 굵기', m: 1e-4, t: '약 10⁻⁴ m', e: -4 },
    { id: 'ant', n: '개미', m: 5e-3, t: '약 5×10⁻³ m', e: -2 }, { id: 'human', n: '사람 키', m: 1.7, t: '약 1.7 m', e: 0 },
    { id: 'everest', n: '에베레스트산 높이', m: 8.8e3, t: '약 8.8×10³ m', e: 4 }, { id: 'earth', n: '지구 지름', m: 1.3e7, t: '약 1.3×10⁷ m', e: 7 },
    { id: 'sun', n: '태양 지름', m: 1.4e9, t: '약 1.4×10⁹ m', e: 9 }, { id: 'esdist', n: '지구–태양 거리', m: 1.5e11, t: '약 1.5×10¹¹ m', e: 11 },
    { id: 'proxima', n: '가장 가까운 별까지', m: 4e16, t: '약 4×10¹⁶ m (4.2광년)', e: 17 }, { id: 'milkyway', n: '우리은하 지름', m: 9.5e20, t: '약 9.5×10²⁰ m (10만 광년)', e: 21 },
    { id: 'universe', n: '관측 가능한 우주', m: 9e26, t: '약 9×10²⁶ m (930억 광년)', e: 27 },
  ];
  const NOTE = {
    proton: '원자핵을 이루는 입자예요.', hatom: '핵은 원자보다 약 10만 배 작아요. 핵 둘레를 전자 구름이 감싸요.', dna: '이중 나선의 지름이에요.', virus: '전자 현미경으로 볼 수 있어요.',
    rbc: '광학 현미경으로 볼 수 있어요.', hair: '맨눈으로 겨우 보이는 크기예요.', ant: '몸길이 5 mm 정도예요.', human: '우리가 몸으로 느끼는 크기예요.', everest: '지구에서 가장 높은 산이에요.',
    earth: '약 1만 3천 km예요.', sun: '지구 지름의 약 109배예요.', esdist: '빛이 약 8분 20초 걸려요. (크기는 과장해서 그렸어요)', proxima: '빛으로 4.2년 걸려요. (별 크기는 과장했어요)',
    milkyway: '태양계는 은하 안쪽 가장자리에 있어요.', universe: '은하들이 그물처럼 이어져 있어요.',
  };

  window.SciSim3D.attach({
    title: '공간의 규모 3D',
    camera: { dist: PHN ? 14.5 : 11.5, theta: 0.5, phi: 1.2, min: 4, max: 22 },
    levels: [0],
    autoRotate: 0.3,
    build(ctx) {
      const { THREE, scene, root, label, info, controls } = ctx;
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.45, metalness: 0.05 }, o || {}));
      const V = THREE.Vector3;
      let idx = 7, cur = null, pop = 0, upd = null;
      const labs = [];
      const hash = (x, y, z) => { const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return h - Math.floor(h); };
      const rnd = (() => { let a = 12345; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; })();
      const tube = (pts, r, col, o) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 6, r, 8), std(col, o));
      const pointsOf = (arr, cols, size) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); return new THREE.Points(g, new THREE.PointsMaterial({ size, vertexColors: true, sizeAttenuation: true, transparent: true, opacity: 0.95, depthWrite: false })); };


      // ---- 환경: 별이 있는 배경 · 빛나는 받침판 (대상이 바뀌어도 그대로)
      { const cv = document.createElement('canvas'); cv.width = 16; cv.height = 256; const g = cv.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#0a1230'); gr.addColorStop(0.55, '#16224a'); gr.addColorStop(1, '#0a0f22'); g.fillStyle = gr; g.fillRect(0, 0, 16, 256);
        const sky = new THREE.Mesh(new THREE.SphereGeometry(40, 32, 20), new THREE.MeshBasicMaterial({ map: (() => { const tx = new THREE.CanvasTexture(cv); if (THREE.sRGBEncoding) tx.encoding = THREE.sRGBEncoding; return tx; })(), side: THREE.BackSide, depthWrite: false })); sky.renderOrder = -2; root.add(sky);
        const sa = [], sc = []; const rr = (() => { let a = 777; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; })();
        for (let i = 0; i < 700; i++) { const v = new V(rr() - 0.5, rr() - 0.5, rr() - 0.5).normalize().multiplyScalar(30 + rr() * 6); sa.push(v.x, v.y, v.z); const c = 0.5 + rr() * 0.5; sc.push(c * 0.85, c * 0.9, c); }
        const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sa, 3)); sg.setAttribute('color', new THREE.Float32BufferAttribute(sc, 3));
        const stars = new THREE.Points(sg, new THREE.PointsMaterial({ size: 0.16, vertexColors: true, sizeAttenuation: true, transparent: true, opacity: 0.85, depthWrite: false })); root.add(stars);
        const plat = new THREE.Mesh(new THREE.CylinderGeometry(4.3, 4.5, 0.2, 72), new THREE.MeshStandardMaterial({ color: 0x18264a, roughness: 0.35, metalness: 0.6 })); plat.position.y = -3.4; root.add(plat);
        [4.2, 3.0, 1.8].forEach((r, k) => { const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.025, 8, 96), new THREE.MeshBasicMaterial({ color: k % 2 ? 0x3b6ea8 : 0x4fd1c5 })); t.rotation.x = Math.PI / 2; t.position.y = -3.28; root.add(t); }); }
      const BUILD = {
        proton() { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.SphereGeometry(2.1, 48, 32), std(0xf0786a, { transparent: true, opacity: 0.35, depthWrite: false, roughness: 0.2 })));
          const q = [0xff5a52, 0xffd34d, 0x4aa3ff].map((c) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.55, 28, 20), std(c, { roughness: 0.25, emissive: c, emissiveIntensity: 0.3 })); g.add(m); return m; });
          upd = (t) => q.forEach((m, i) => { const a = t * 1.3 + i * 2.094; m.position.set(Math.cos(a) * 0.9, Math.sin(a * 1.3 + i) * 0.5, Math.sin(a) * 0.9); }); return g; },
        hatom() { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 16), std(0xff5a52, { emissive: 0xff2a20, emissiveIntensity: 0.8 })));
          [2.3, 1.7, 1.1].forEach((r, i) => g.add(new THREE.Mesh(new THREE.SphereGeometry(r, 40, 28), new THREE.MeshStandardMaterial({ color: 0x6aa8ff, transparent: true, opacity: 0.09, depthWrite: false, roughness: 0.4 }))));
          const e = new THREE.Mesh(new THREE.SphereGeometry(0.14, 20, 14), std(0x62b4ff, { emissive: 0x1a5fb0, emissiveIntensity: 0.9 })); g.add(e); labs.push(label('핵 (점처럼 작아요)', [0, 0, 0], { size: 12, offset: [0.3, -0.5, 0] }));
          { const orb = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.012, 6, 80), new THREE.MeshBasicMaterial({ color: 0x62b4ff, transparent: true, opacity: 0.35 })); orb.rotation.x = Math.PI / 2; g.add(orb); }
          upd = (t) => { const a = t * 2.4; e.position.set(Math.cos(a) * 1.7, Math.sin(a * 0.7) * 0.8, Math.sin(a) * 1.7); }; return g; },
        dna() { const g = new THREE.Group(), A = [], B = []; const N = 40;
          for (let i = 0; i < N; i++) { const y = (i / (N - 1) - 0.5) * 6, a = i * 0.55; A.push(new V(Math.cos(a) * 0.9, y, Math.sin(a) * 0.9)); B.push(new V(-Math.cos(a) * 0.9, y, -Math.sin(a) * 0.9));
            if (i % 2 === 0) { const col = [0x6fd36b, 0xf0556a, 0xffd34d, 0x4aa3ff][(i / 2) % 4]; const d = B[i].clone().sub(A[i]); const r = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, d.length(), 8), std(col)); r.position.copy(A[i]).add(B[i]).multiplyScalar(0.5); r.quaternion.setFromUnitVectors(new V(0, 1, 0), d.normalize()); g.add(r); } }
          g.add(tube(A, 0.1, 0x9fb4e8), tube(B, 0.1, 0xff9a8a)); g.rotation.z = 0.3; labs.push(label('지름 약 2 nm', [1.4, 0, 0], { size: 12 })); upd = (t) => { g.rotation.y = t * 0.0; }; return g; },
        virus() { const g = new THREE.Group(); const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5, 1), std(0x8a7bf0, { flatShading: true, roughness: 0.4 })); g.add(core);
          const ico = new THREE.IcosahedronGeometry(1, 1).attributes.position; const seen = new Set();
          for (let i = 0; i < ico.count; i++) { const v = new V().fromBufferAttribute(ico, i).normalize(); const k = v.toArray().map((x) => x.toFixed(2)).join(); if (seen.has(k)) continue; seen.add(k);
            const s = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 8), std(0xe0d8ff)); s.position.copy(v).multiplyScalar(1.7); s.quaternion.setFromUnitVectors(new V(0, 1, 0), v); const h = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), std(0xff6b8a)); h.position.copy(v).multiplyScalar(2.05); g.add(s, h); } return g; },
        rbc() { const pts = []; const z = (r) => 0.9 * Math.sqrt(Math.max(0, 1 - r * r)) * (0.0518 + 2.0026 * r * r - 4.491 * r * r * r * r) * 3.2;
          for (let k = 0; k <= 28; k++) { const r = k / 28; pts.push(new THREE.Vector2(Math.max(0.001, r * 2.5), -Math.max(0, z(r)) * 1.2)); } for (let k = 28; k >= 0; k--) { const r = k / 28; pts.push(new THREE.Vector2(Math.max(0.001, r * 2.5), Math.max(0, z(r)) * 1.2)); }
          const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 64), std(0xe53935, { roughness: 0.4 })); m.rotation.x = 0.9; const g = new THREE.Group(); g.add(m); upd = (t) => { m.rotation.z = t * 0.5; }; return g; },
        hair() { const g = new THREE.Group(); const c = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 7, 40), std(0x3a2a22, { roughness: 0.5 })); c.rotation.z = Math.PI / 2 - 0.35; g.add(c);
          for (let i = -6; i <= 6; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.025, 8, 40), std(0x6a5446)); r.position.set(i * 0.5 * Math.cos(0.35), -i * 0.5 * Math.sin(0.35) * -1, 0); r.rotation.y = Math.PI / 2; r.rotation.x = 0; r.rotation.z = 0; r.quaternion.setFromUnitVectors(new V(0, 0, 1), new V(Math.cos(0.35), Math.sin(0.35), 0)); r.position.set(i * 0.5 * Math.cos(0.35), i * 0.5 * Math.sin(0.35), 0); g.add(r); }
          labs.push(label('굵기 약 0.1 mm', [0, 0.9, 0], { size: 12 })); return g; },
        ant() { const g = new THREE.Group(); const c = 0x3a2d28; [[-1.5, 0.0, 0.7, 0.9], [-0.2, 0.05, 0.55, 0.55], [1.35, 0.1, 0.5, 0.45]].forEach((s, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), std(c, { roughness: 0.3 })); m.position.set(s[0], s[1], 0); m.scale.set(s[2] + (i === 0 ? 0.35 : 0), s[3] * 0.8, s[3] * 0.8); g.add(m); });
          for (let i = 0; i < 3; i++) for (const sgn of [-1, 1]) { const p = [new V(-0.5 + i * 0.5, 0, sgn * 0.3), new V(-0.7 + i * 0.5, -0.3, sgn * 1.1), new V(-0.9 + i * 0.6, -1.0, sgn * 1.4)]; g.add(tube(p, 0.04, 0x2a201c)); }
          [-1, 1].forEach((sgn) => g.add(tube([new V(2.2, 0.2, sgn * 0.1), new V(2.8, 0.7, sgn * 0.4), new V(3.1, 1.0, sgn * 0.7)], 0.03, 0x2a201c))); g.position.y = 0.4; g.rotation.y = 0.0; labs.push(label('몸길이 약 5 mm', [0, 1.6, 0], { size: 12 })); return g; },
        human() { const g = new THREE.Group(); const sk = 0xf2c9a0, cl = 0x3b82f6, pn = 0x2a3550; const add = (geo, col, x, y, z) => { const m = new THREE.Mesh(geo, std(col, { roughness: 0.55 })); m.position.set(x, y, z); g.add(m); return m; };
          add(new THREE.SphereGeometry(0.42, 28, 20), sk, 0, 1.9, 0); add(new THREE.CylinderGeometry(0.45, 0.4, 1.4, 20), cl, 0, 0.95, 0); add(new THREE.CylinderGeometry(0.17, 0.15, 1.7, 14), pn, -0.22, -0.55, 0); add(new THREE.CylinderGeometry(0.17, 0.15, 1.7, 14), pn, 0.22, -0.55, 0);
          const a1 = add(new THREE.CylinderGeometry(0.11, 0.1, 1.3, 12), cl, -0.62, 0.9, 0); a1.rotation.z = 0.15; const a2 = add(new THREE.CylinderGeometry(0.11, 0.1, 1.3, 12), cl, 0.62, 0.9, 0); a2.rotation.z = -0.15; g.position.y = -0.1; labs.push(label('키 약 1.7 m', [1.4, 0.9, 0], { size: 12 })); return g; },
        everest() { const geo = new THREE.ConeGeometry(2.9, 3.8, 48, 14); const p = geo.attributes.position, col = []; const c1 = new THREE.Color(0x7a6a5a), c2 = new THREE.Color(0xffffff);
          for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), n = (hash(x * 2.1, y * 2.1, z * 2.1) - 0.5) * 0.28 * (1 - (y + 1.9) / 3.8); p.setXYZ(i, x * (1 + n), y, z * (1 + n)); const k = Math.max(0, Math.min(1, (y - 0.4) / 0.9)); const c = c1.clone().lerp(c2, k); col.push(c.r, c.g, c.b); }
          geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.computeVertexNormals(); const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true })); m.position.y = 0.1; const g = new THREE.Group(); g.add(m); labs.push(label('높이 약 8.8 km', [0, 2.3, 0], { size: 12 })); return g; },
        earth() { const geo = new THREE.SphereGeometry(2.3, 96, 64), p = geo.attributes.position, col = []; for (let i = 0; i < p.count; i++) { const x = p.getX(i) / 2.3, y = p.getY(i) / 2.3, z = p.getZ(i) / 2.3;
            const h = hash(Math.floor(x * 5), Math.floor(y * 5), Math.floor(z * 5)) * 0.5 + (hash(x * 1.9 + 3, y * 1.9, z * 1.9) + hash(x * 4.1, y * 4.1 + 2, z * 4.1)) * 0.25; const land = Math.sin(x * 2.2 + 1) * Math.cos(y * 3 + z * 1.6) + Math.sin(z * 2.6 - x) * 0.7 + (h - 0.5) * 1.1 > 0.35; const ice = Math.abs(y) > 0.9;
            const c = ice ? new THREE.Color(0xf2f6fb) : land ? new THREE.Color(0x4f9f58).lerp(new THREE.Color(0xb0a070), hash(x * 7, y * 7, z * 7)) : new THREE.Color(0x1f6cc0); col.push(c.r, c.g, c.b); }
          geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.65 })); const g = new THREE.Group(); g.add(m); const cl = new THREE.Mesh(new THREE.SphereGeometry(2.36, 48, 32), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, roughness: 1, depthWrite: false })); g.add(cl); g.add(new THREE.Mesh(new THREE.SphereGeometry(2.55, 48, 32), new THREE.MeshBasicMaterial({ color: 0x7ab8ff, transparent: true, opacity: 0.08, side: THREE.BackSide, depthWrite: false }))); upd = (t) => { m.rotation.y = t * 0.3; cl.rotation.y = t * 0.38; }; return g; },
        sun() { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.SphereGeometry(2.3, 64, 40), new THREE.MeshBasicMaterial({ color: 0xffc247 })));
          [2.55, 2.95, 3.5].forEach((r, i) => g.add(new THREE.Mesh(new THREE.SphereGeometry(r, 40, 28), new THREE.MeshBasicMaterial({ color: 0xff9a2a, transparent: true, opacity: 0.16 - i * 0.04, depthWrite: false })))); const e = new THREE.Mesh(new THREE.SphereGeometry(0.21, 24, 16), std(0x4f9fff)); g.add(e);
          labs.push(label('지구 (109개를 늘어놓으면 태양 지름)', e, { size: 12, offset: [0, 0.5, 0] })); upd = (t) => { e.position.set(Math.cos(t * 0.8) * 3.9, 0, Math.sin(t * 0.8) * 3.9); }; return g; },
        esdist() { const g = new THREE.Group(); const s = new THREE.Mesh(new THREE.SphereGeometry(1.0, 48, 32), new THREE.MeshBasicMaterial({ color: 0xffc247 })); s.position.x = -3.2; g.add(s);
          const glow = new THREE.Mesh(new THREE.SphereGeometry(1.5, 32, 20), new THREE.MeshBasicMaterial({ color: 0xff9a2a, transparent: true, opacity: 0.18, depthWrite: false })); glow.position.copy(s.position); g.add(glow);
          const e = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 16), std(0x4f9fff)); e.position.x = 3.2; g.add(e);
          const pts = []; for (let i = 0; i <= 64; i++) { const a = i / 64 * Math.PI * 2; pts.push(new V(-3.2 + Math.cos(a) * 6.4, 0, Math.sin(a) * 6.4)); } g.add(tube(pts, 0.015, 0x8fb4ff, { transparent: true, opacity: 0.5 }));
          const line = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 5.2, 8), new THREE.MeshBasicMaterial({ color: 0xffe9a0 })); line.rotation.z = Math.PI / 2; line.position.x = -0.1; g.add(line);
          labs.push(label('빛으로 약 8분 20초', [-0.1, 0.5, 0], { size: 12, color: 'rgba(255,211,77,.92)' })); labs[labs.length - 1].el.style.color = '#1b2333'; labs.push(label('지구', e, { size: 12, offset: [0, 0.4, 0] }), label('태양', s, { size: 12, offset: [0, 1.4, 0] })); return g; },
        proxima() { const g = new THREE.Group(); const a = new THREE.Mesh(new THREE.SphereGeometry(0.55, 32, 24), new THREE.MeshBasicMaterial({ color: 0xffc247 })), b = new THREE.Mesh(new THREE.SphereGeometry(0.35, 32, 24), new THREE.MeshBasicMaterial({ color: 0xff5a3c })); a.position.x = -3.4; b.position.x = 3.4; g.add(a, b);
          const arr = [], cols = []; for (let i = 0; i < 700; i++) { const v = new V(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize().multiplyScalar(6 + rnd() * 4); arr.push(v.x, v.y, v.z); const c = 0.55 + rnd() * 0.45; cols.push(c, c, c); } g.add(pointsOf(arr, cols, 0.07));
          const line = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 6.8, 8), new THREE.MeshBasicMaterial({ color: 0xffe9a0 })); line.rotation.z = Math.PI / 2; g.add(line);
          labs.push(label('4.2광년 (빛으로 4.2년)', [0, 0.5, 0], { size: 12, color: 'rgba(255,211,77,.92)' })); labs[labs.length - 1].el.style.color = '#1b2333'; labs.push(label('태양', a, { size: 12, offset: [0, 0.9, 0] }), label('프록시마', b, { size: 12, offset: [0, 0.8, 0] })); return g; },
        milkyway() { const g = new THREE.Group(), arr = [], cols = []; const c1 = new THREE.Color(0xfff0c8), c2 = new THREE.Color(0x8fb4ff);
          for (let i = 0; i < 9000; i++) { const arm = i % 2, r = Math.pow(rnd(), 0.6) * 4.6, a = r * 1.15 + arm * Math.PI + (rnd() - 0.5) * (0.35 + r * 0.06); const bulge = rnd() < 0.2; const rr = bulge ? rnd() * 1.1 : r; const aa = bulge ? rnd() * 6.283 : a; arr.push(Math.cos(aa) * rr, (rnd() - 0.5) * (bulge ? 0.9 : 0.18 * (1 - r / 5.5) + 0.04), Math.sin(aa) * rr); const c = (bulge ? c1 : c1.clone().lerp(c2, Math.min(1, r / 4.6))); cols.push(c.r, c.g, c.b); }
          g.add(pointsOf(arr, cols, 0.045)); const sun = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffe066 })); sun.position.set(Math.cos(2.6) * 3.0, 0.02, Math.sin(2.6) * 3.0); g.add(sun); labs.push(label('태양계', sun, { size: 12, offset: [0, 0.6, 0], color: 'rgba(255,211,77,.92)' })); labs[labs.length - 1].el.style.color = '#1b2333'; upd = (t) => { g.rotation.y = t * 0.0; }; g.rotation.x = 0.35; return g; },
        universe() { const g = new THREE.Group(), arr = [], cols = []; const nodes = []; for (let i = 0; i < 46; i++) nodes.push(new V(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(7.5));
          for (let i = 0; i < 6500; i++) { const a = nodes[(rnd() * nodes.length) | 0]; let p; if (rnd() < 0.6) { const b = nodes[(rnd() * nodes.length) | 0]; if (a.distanceTo(b) < 4.2) p = a.clone().lerp(b, rnd()); else p = a.clone(); } else p = a.clone(); p.add(new V(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(0.55)); if (p.length() > 4.4) continue; arr.push(p.x, p.y, p.z); const c = new THREE.Color().setHSL(0.6 + rnd() * 0.12, 0.6, 0.6 + rnd() * 0.3); cols.push(c.r, c.g, c.b); }
          g.add(pointsOf(arr, cols, 0.05)); g.add(new THREE.Mesh(new THREE.SphereGeometry(4.5, 40, 28), new THREE.MeshBasicMaterial({ color: 0x3a4a9a, transparent: true, opacity: 0.08, depthWrite: false, side: THREE.DoubleSide }))); labs.push(label('점 하나가 은하 무리', [0, 4.9, 0], { size: 12 })); return g; },
      };

      function select(i, quiet, from2d) {
        idx = Math.max(0, Math.min(OB.length - 1, i)); const o = OB[idx];
        if (cur) { root.remove(cur); cur.traverse((x) => { if (x.geometry) x.geometry.dispose(); }); }
        labs.forEach((l) => l.show(false)); labs.length = 0; upd = null;
        cur = BUILD[o.id](); root.add(cur); pop = quiet ? 1 : 0;
        labs.forEach((l) => { if (Array.isArray(l.obj)) { l.off = l.off.map((x, k) => x + l.obj[k]); l.obj = cur; } });
        const prev = idx > 0 ? OB[idx - 1] : null; const ratio = prev ? Math.round(Math.log10(o.m / prev.m)) : 0;
        info('<b>' + o.n + '</b> · ' + o.t + '<br>' + NOTE[o.id] + (prev ? '<br>앞의 <b>' + prev.n + '</b>보다 약 <b>10<sup>' + ratio + '</sup>배</b> 커요.' : ''));
        rng && rng.set(idx);
        if (!from2d && !quiet) { const L = window.__sim; if (L && L.setExp && L.OBJ && L.OBJ[idx]) L.setExp(L.OBJ[idx].le, true); }
        const cnt = document.querySelector('.v3-scale-cnt'); if (cnt) cnt.textContent = '';
      }
      const rng = controls.range('대상', 0, OB.length - 1, 1, idx, (v) => select(v), (v) => OB[v].n);
      controls.button('◀ 더 작게', () => select(idx - 1)); controls.button('더 크게 ▶', () => select(idx + 1));
      let lastNear = (window.__sim && window.__sim.S && window.__sim.S.nearId) || null;
      if (lastNear) { const k = OB.findIndex((o) => o.id === lastNear); if (k >= 0) idx = k; }
      select(idx, true);
      const N = OB.length;
      controls.player({ duration: 15, loop: true, autoplay: false, label: '줌 여행',
        phases: OB.map((o, i) => [i / N, o.n]),
        onFrame(p) { const k = Math.min(N - 1, Math.floor(p * N)); if (k !== idx) select(k); } });
      return {
        update(dt, t) {
          pop = Math.min(1, pop + dt * 2.2); const s = 1 - Math.pow(1 - pop, 3); cur.scale.setScalar(0.2 + 0.8 * s);
          if (upd) upd(t);
          const q = window.__sim && window.__sim.S && window.__sim.S.nearId; if (q && q !== lastNear) { lastNear = q; const k = OB.findIndex((o) => o.id === q); if (k >= 0 && k !== idx) select(k, false, true); }
        },
        sync() {},
      };
    },
  });
})();
