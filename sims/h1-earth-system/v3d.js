/* h1-earth-system · 3D 지구시스템 (지권·수권·기권·생물권·외권)
   권역을 하나씩 골라 층 구조를 단면으로 보고, 지구시스템을 움직이는 에너지원(태양·지구 내부·달)을 확인해요.
   ※ 대기·바다의 두께는 보기 쉽도록 크게 늘려 그렸어요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const R = 2.5;
  // 3D 값 잡음으로 대륙 모양을 만들어요 (구 위에서 이음매 없음)
  function hash(x, y, z) { let h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return h - Math.floor(h); }
  function vnoise(x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
    const l = (a, b, t) => a + (b - a) * t; let r = 0;
    const c = (dx, dy, dz) => hash(xi + dx, yi + dy, zi + dz);
    return l(l(l(c(0, 0, 0), c(1, 0, 0), u), l(c(0, 1, 0), c(1, 1, 0), u), v), l(l(c(0, 0, 1), c(1, 0, 1), u), l(c(0, 1, 1), c(1, 1, 1), u), v), w);
  }
  function fbm(x, y, z) { return vnoise(x, y, z) * 0.55 + vnoise(x * 2.1, y * 2.1, z * 2.1) * 0.28 + vnoise(x * 4.3, y * 4.3, z * 4.3) * 0.17; }

  window.SciSim3D.attach({
    title: '지구시스템 3D',
    camera: { dist: PHN ? 15 : 14.5, theta: -2.35, phi: 1.2, min: 6, max: 30 },
    levels: [2],
    autoRotate: 0,
    build(ctx) {
      const { THREE, scene, root, label, info, controls, orbit } = ctx;
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.6, metalness: 0 }, o || {}));
      // 직접 조명: 태양
      const sunPos = new THREE.Vector3(-8.6, 3.2, 4.4);
      const sunL = new THREE.DirectionalLight(0xfff2d8, 1.3); sunL.position.copy(sunPos); scene.add(sunL);
      scene.add(new THREE.HemisphereLight(0x9fb8ff, 0x20243a, 0.3));
      const NZ = ctx.mats.tex('noise');
      let mode = 'all', energy = true;

      /* ---------- 지구 표면 무늬 ---------- */
      const TW = 512, TH = 256, cv = document.createElement('canvas'); cv.width = TW; cv.height = TH;
      const cx = cv.getContext('2d'), img = cx.createImageData(TW, TH), mask = new Uint8Array(TW * TH);
      const cvO = document.createElement('canvas'); cvO.width = TW; cvO.height = TH; const cxO = cvO.getContext('2d'), imgO = cxO.createImageData(TW, TH);
      for (let y = 0; y < TH; y++) {
        const lat = (0.5 - y / TH) * Math.PI;
        for (let x = 0; x < TW; x++) {
          const lon = (x / TW) * Math.PI * 2, px = Math.cos(lat) * Math.cos(lon), py = Math.sin(lat), pz = Math.cos(lat) * Math.sin(lon);
          const h = fbm(px * 1.9 + 3.1, py * 1.9 + 1.7, pz * 1.9 + 5.3), i = (y * TW + x) * 4;
          const land = h > 0.545, ice = Math.abs(lat) > 1.3 - (fbm(px * 6, py * 6, pz * 6) - 0.5) * 0.3;
          mask[y * TW + x] = land ? 1 : 0;
          let r, g, b;
          if (ice) { r = 238; g = 244; b = 250; }
          else if (land) { const t = Math.min(1, (h - 0.545) / 0.16); const dry = Math.abs(lat) < 0.55 && fbm(px * 3 + 9, py * 3, pz * 3) > 0.52; r = (dry ? 178 : 40) + t * (dry ? -26 : 62); g = (dry ? 148 : 118) - t * (dry ? 34 : 26); b = (dry ? 92 : 44) + t * 16; }
          else { r = 12; g = 58; b = 128; }
          img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
          // 바다 겹: 바다는 푸르게(불투명), 육지는 투명
          const dp = Math.max(0, 0.545 - h) / 0.3; imgO.data[i] = 8 + 16 * (1 - dp); imgO.data[i + 1] = 46 + 50 * (1 - dp); imgO.data[i + 2] = 112 + 62 * (1 - dp); imgO.data[i + 3] = ice ? 0 : (land ? 0 : 255);
        }
      }
      cx.putImageData(img, 0, 0); cxO.putImageData(imgO, 0, 0);
      const texG = new THREE.CanvasTexture(cv), texO = new THREE.CanvasTexture(cvO);
      [texG, texO].forEach((t) => { if ('outputEncoding' in t) t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; });

      const earth = new THREE.Group(); root.add(earth);
      const ground = new THREE.Mesh(new THREE.SphereGeometry(R, 96, 64), std(0xffffff, { map: texG, roughness: 0.9, bumpMap: texG, bumpScale: 0.035 })); earth.add(ground);
      const ocean = new THREE.Mesh(new THREE.SphereGeometry(R + 0.012, 96, 64), std(0xffffff, { map: texO, transparent: true, roughness: 0.3, metalness: 0.15, depthWrite: false })); earth.add(ocean);
      const cvC = document.createElement('canvas'); cvC.width = 256; cvC.height = 128; { const cc = cvC.getContext('2d'), im = cc.createImageData(256, 128);
        for (let y = 0; y < 128; y++) { const lat = (0.5 - y / 128) * Math.PI; for (let x = 0; x < 256; x++) { const lon = x / 256 * Math.PI * 2, px = Math.cos(lat) * Math.cos(lon), py = Math.sin(lat), pz = Math.cos(lat) * Math.sin(lon), h = fbm(px * 2.6 + 11, py * 3.4 + 4, pz * 2.6 + 8), a = Math.max(0, Math.min(1, (h - 0.5) / 0.14)), i = (y * 256 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = a * 190; } }
        cc.putImageData(im, 0, 0); }
      const texC = new THREE.CanvasTexture(cvC);
      const cloud = new THREE.Mesh(new THREE.SphereGeometry(R + 0.07, 64, 40), std(0xffffff, { map: texC, transparent: true, opacity: 0.82, roughness: 1, depthWrite: false }));
      earth.add(cloud);
      // 얇은 대기 빛무리 (전체 보기)
      const halo = [0.12, 0.26, 0.42].map((d, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(R + d, 48, 32), new THREE.MeshBasicMaterial({ color: 0x7db4ff, transparent: true, opacity: 0.1 - i * 0.025, depthWrite: false, side: THREE.BackSide })); earth.add(m); return m; });
      const sAtm = new THREE.Mesh(new THREE.SphereGeometry(R + 0.13, 64, 40), new THREE.MeshStandardMaterial({ color: 0x8fc0ff, transparent: true, opacity: 0.16, depthWrite: false, roughness: 0.3 })); earth.add(sAtm);

      /* ---------- 단면(쐐기를 잘라낸 층) ---------- */
      const wedge = 3 * Math.PI / 2;
      function cutaway(layers, withShell) {
        const g = new THREE.Group();
        layers.forEach((ly, i) => {
          const mat = () => std(ly.c, { transparent: ly.o != null && ly.o < 1, opacity: ly.o == null ? 1 : ly.o, depthWrite: !(ly.o != null && ly.o < 1), emissive: ly.e ? ly.c : 0x000000, emissiveIntensity: ly.e || 0, side: THREE.DoubleSide, roughness: ly.e ? 0.5 : 0.8, bumpMap: ly.o == null ? NZ : null, bumpScale: 0.03 });   // 암석·물질의 거친 결
          const sph = new THREE.Mesh(new THREE.SphereGeometry(ly.r1, 64, 40, 0, wedge), ly.map ? std(0xffffff, { map: ly.map, side: THREE.DoubleSide, roughness: 0.85 }) : mat());
          if (i === layers.length - 1 || ly.surface) g.add(sph);
          [Math.PI / 2, Math.PI].forEach((rot) => { const ring = new THREE.Mesh(new THREE.RingGeometry(ly.r0, ly.r1, 64, 1, -Math.PI / 2, Math.PI), mat()); ring.rotation.y = rot; g.add(ring); });
        });
        return g;
      }
      const ROCK = [
        { r0: 0, r1: R * 0.19, c: 0xffe27a, e: 0.6, n: '내핵 (고체)' }, { r0: R * 0.19, r1: R * 0.55, c: 0xff9a3c, e: 0.4, n: '외핵 (액체)' },
        { r0: R * 0.55, r1: R * 0.93, c: 0xb9442d, e: 0.15, n: '맨틀' }, { r0: R * 0.93, r1: R, c: 0x8a7a68, n: '지각', map: texG },
      ];
      const OCN = [
        { r0: 0, r1: 2.2, c: 0x6b6f7c, n: '해저' }, { r0: 2.2, r1: 2.42, c: 0x0b3f8a, n: '심해층' },
        { r0: 2.42, r1: 2.48, c: 0x1f7ad0, n: '수온 약층' }, { r0: 2.48, r1: 2.53, c: 0x58c8ff, n: '혼합층', o: 0.95 },
      ];
      const ATM = [
        { r0: R, r1: R + 0.28, c: 0x7fb8ff, o: 0.5, n: '대류권' }, { r0: R + 0.28, r1: R + 0.58, c: 0x6a8cff, o: 0.45, n: '성층권' },
        { r0: R + 0.58, r1: R + 0.88, c: 0x7a6bff, o: 0.38, n: '중간권' }, { r0: R + 0.88, r1: R + 1.3, c: 0xb06bff, o: 0.3, n: '열권' },
      ];
      const cutRock = cutaway(ROCK); { const hg = ctx.halo(cutRock, 0xffd98a, R * 0.95, 0.5); hg.position.set(-0.05, 0, 0.05); }   // 뜨거운 핵의 빛
      const cutOcn = cutaway(OCN), cutAtm = cutaway(ATM.map((a) => Object.assign({ surface: true }, a)));
      earth.add(cutRock, cutOcn, cutAtm);
      cutOcn.children[0].material.side = THREE.DoubleSide;
      const baseOcn = new THREE.Mesh(new THREE.SphereGeometry(2.2, 48, 32, 0, wedge), std(0x6b6f7c, { side: THREE.DoubleSide })); earth.add(baseOcn);

      /* ---------- 생물권: 육지의 식물 · 바다의 생물 ---------- */
      const bio = new THREE.Group(); earth.add(bio);
      const tGeo = new THREE.ConeGeometry(0.06, 0.16, 8), sGeo = new THREE.IcosahedronGeometry(0.045, 1);
      const tMat = std(0x2fa84a, { roughness: 0.5 }), fMat = std(0xffb84a, { roughness: 0.4, emissive: 0x6a3a00, emissiveIntensity: 0.4 });
      const nT = 420, nF = 160, trees = new THREE.InstancedMesh(tGeo, tMat, nT), fish = new THREE.InstancedMesh(sGeo, fMat, nF); bio.add(trees, fish);
      const dm = new THREE.Object3D(); let ti = 0, fi = 0, tries = 0;
      while ((ti < nT || fi < nF) && tries++ < 20000) {
        const lat = Math.asin(Math.random() * 2 - 1), lon = Math.random() * Math.PI * 2; if (Math.abs(lat) > 1.15) continue;
        const x = Math.floor((lon / (Math.PI * 2)) * TW) % TW, y = Math.min(TH - 1, Math.floor((0.5 - lat / Math.PI) * TH)), isL = mask[y * TW + x];
        const dir = new THREE.Vector3(Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon));
        if (isL && ti < nT) { dm.position.copy(dir).multiplyScalar(R + 0.06); dm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); dm.scale.setScalar(1); dm.updateMatrix(); trees.setMatrixAt(ti++, dm.matrix); }
        else if (!isL && fi < nF) { dm.position.copy(dir).multiplyScalar(R + 0.03); dm.quaternion.identity(); dm.scale.setScalar(1); dm.updateMatrix(); fish.setMatrixAt(fi++, dm.matrix); }
      }
      bio.visible = false;

      /* ---------- 에너지원: 태양 · 지구 내부 · 달 ---------- */
      const en = new THREE.Group(); root.add(en);
      const sunG = new THREE.Group(), coreG = new THREE.Group(), moonG = new THREE.Group(); en.add(sunG, coreG, moonG);
      const sunTex = (() => { const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d'); let sd = 77; const r = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
        g.fillStyle = '#ffb21f'; g.fillRect(0, 0, 512, 256);
        for (let i = 0; i < 2400; i++) { const q = 2 + r() * 6; g.globalAlpha = 0.18 + r() * 0.25; g.fillStyle = r() < 0.55 ? '#ffe27a' : (r() < 0.6 ? '#ff8a12' : '#fff3b8'); g.beginPath(); g.ellipse(r() * 512, r() * 256, q * 1.5, q, r() * 3, 0, 7); g.fill(); }
        for (let i = 0; i < 6; i++) { const x = r() * 512, y = 70 + r() * 116, q = 3 + r() * 5; g.globalAlpha = 0.5; g.fillStyle = '#c2560a'; g.beginPath(); g.ellipse(x, y, q * 2.2, q * 1.5, 0, 0, 7); g.fill(); g.globalAlpha = 0.85; g.fillStyle = '#5a2504'; g.beginPath(); g.ellipse(x, y, q * 1.1, q * 0.8, 0, 0, 7); g.fill(); }
        const t = new THREE.CanvasTexture(c); if (THREE.sRGBEncoding) t.encoding = THREE.sRGBEncoding; return t; })();   // 태양 겉면: 쌀알 무늬 · 흑점
      const sun = new THREE.Mesh(new THREE.SphereGeometry(1.25, 48, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, map: sunTex })); ctx.halo(sun, 0xffc866, 6.5, 0.6); sun.position.copy(sunPos).multiplyScalar(1.12); sunG.add(sun);
      const sunGlow = new THREE.Mesh(new THREE.SphereGeometry(1.8, 32, 20), new THREE.MeshBasicMaterial({ color: 0xffc04a, transparent: true, opacity: 0.18, depthWrite: false })); sunGlow.position.copy(sun.position); sunG.add(sunGlow);
      const mcv = document.createElement('canvas'); mcv.width = 256; mcv.height = 128; { const mc = mcv.getContext('2d'); mc.fillStyle = '#b9bcc4'; mc.fillRect(0, 0, 256, 128); for (let i = 0; i < 70; i++) { const x = (i * 97) % 256, y = (i * 53 + i * i) % 128, r = 2 + (i * 7) % 9; mc.fillStyle = 'rgba(90,94,104,' + (0.18 + (i % 4) * 0.07) + ')'; mc.beginPath(); mc.arc(x, y, r, 0, 7); mc.fill(); mc.strokeStyle = 'rgba(235,238,245,.35)'; mc.beginPath(); mc.arc(x - 1, y - 1, r, 3.4, 5.2); mc.stroke(); } for (let i = 0; i < 5; i++) { mc.fillStyle = 'rgba(80,84,96,.35)'; mc.beginPath(); mc.ellipse(30 + i * 48, 40 + (i * 31) % 60, 22, 14, 0.4 * i, 0, 7); mc.fill(); } }
      const moon = new THREE.Mesh(new THREE.SphereGeometry(0.55, 40, 28), std(0xc9c9c9, { map: new THREE.CanvasTexture(mcv), roughness: 0.95, bumpMap: NZ, bumpScale: 0.02 })); moonG.add(moon);
      { const N = 260, pos = new Float32Array(N * 3); for (let i = 0; i < N; i++) { const u = Math.random() * 2 - 1, a = Math.random() * 6.283, r = 22 + Math.random() * 14, q = Math.sqrt(1 - u * u); pos[i * 3] = Math.cos(a) * q * r; pos[i * 3 + 1] = u * r; pos[i * 3 + 2] = Math.sin(a) * q * r; }
        const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); root.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.14, transparent: true, opacity: 0.85, depthWrite: false }))); root.children[root.children.length - 1].userData.v3bg = true;   /* 별·먼지는 배경 */ }
      const orbitRing = new THREE.Mesh(new THREE.TorusGeometry(5.4, 0.012, 6, 120), new THREE.MeshBasicMaterial({ color: 0x8fa3c8, transparent: true, opacity: 0.4 })); orbitRing.rotation.x = Math.PI / 2; orbitRing.position.y = 0.9; moonG.add(orbitRing); orbitRing.userData.v3bg = true;   // 궤도선은 배경: 자동 맞춤이 지구에 맞춰요
      const sat = new THREE.Group(); { const bd = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.22), std(0xd9b35a, { metalness: 0.85, roughness: 0.35 })); sat.add(bd); const dish = new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2.4), std(0xe6e9ee, { metalness: 0.6, roughness: 0.3, side: THREE.DoubleSide })); dish.rotation.x = Math.PI; dish.position.y = -0.15; sat.add(dish); [-1, 1].forEach((sg) => { const pn = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.01, 0.16), std(0x1e40af, { metalness: 0.5, roughness: 0.25, emissive: 0x0a1f66, emissiveIntensity: 0.4 })); pn.position.x = sg * 0.28; sat.add(pn); }); }
      root.add(sat);
      function arrow(from, to, col, rad) {
        const g = new THREE.Group(), d = to.clone().sub(from), len = d.length(), hl = Math.min(len * 0.4, rad * 7);
        const sh = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, len - hl, 12), new THREE.MeshBasicMaterial({ color: col })); sh.position.y = (len - hl) / 2;
        const hd = new THREE.Mesh(new THREE.ConeGeometry(rad * 2.6, hl, 16), new THREE.MeshBasicMaterial({ color: col })); hd.position.y = len - hl / 2;
        g.add(sh, hd); g.position.copy(from); g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return g;
      }
      const sd = sunPos.clone().normalize();
      [[0, 0, 0], [0, 0.9, 0.5], [0, -0.9, 0.4]].forEach((o) => { const off = new THREE.Vector3(...o); sunG.add(arrow(sunPos.clone().multiplyScalar(0.74).add(off), sunPos.clone().multiplyScalar(0.42).add(off), 0xffd34d, 0.07)); });
      const inner = [new THREE.Vector3(0.6, -0.5, -1).normalize(), new THREE.Vector3(0.9, 0.4, -0.7).normalize(), new THREE.Vector3(0.2, -0.9, -0.5).normalize()];
      inner.forEach((d) => coreG.add(arrow(d.clone().multiplyScalar(R + 0.15), d.clone().multiplyScalar(R + 1.15), 0xff7a3c, 0.06)));
      // 에너지원 이름표: 꺼져 있어도 보이고, 눌러서 켜고 끌 수 있어요 (2D에서 그림을 누르는 것과 같아요)
      const tapSrc = (k) => () => { const L = lesson(); if (mode === 'all' && L && L.toggleSrc && L.S && (L.S.mode === 'energy' || L.S.mode === 'pair')) L.toggleSrc(k); };
      const lSun = label('태양 에너지', sun, { offset: [0, 2.3, 0], color: 'rgba(180,120,0,.92)', tap: tapSrc('sun') });
      const lIn = label('지구 내부 에너지', [inner[0].x * (R + 1.2), inner[0].y * (R + 1.2), inner[0].z * (R + 1.2)], { color: 'rgba(200,80,30,.92)', tap: tapSrc('core') });
      const lMoon = label('달 · 조력 에너지', moon, { offset: [0, 0.9, 0], color: 'rgba(80,90,120,.92)', tap: tapSrc('moon') });
      const lOut = label('외권 (우주)', sat, { size: 12, offset: [0, 0.45, 0] });

      const labs = [];
      function clearLabs() { labs.forEach((l) => l.show(false)); }
      const anch = [];
      function lab(i, t, p, o) { if (!labs[i]) labs[i] = label('', [0, 0, 0], { size: 12 }); if (!anch[i]) { anch[i] = new THREE.Object3D(); earth.add(anch[i]); } const l = labs[i], oo = o || [0, 0, 0]; anch[i].position.set(p[0] + oo[0], p[1] + oo[1], p[2] + oo[2]); l.set(t); l.obj = anch[i]; l.off = [0, 0, 0]; l.show(true); return l; }
      function setMode(m) {
        mode = m; clearLabs();
        const isCut = m === 'geo' || m === 'hyd' || m === 'atm';
        ground.visible = m === 'all' || m === 'bio' || m === 'atm'; ocean.visible = m === 'all' || m === 'bio' || m === 'atm';
        cloud.visible = m === 'all' || m === 'bio'; sAtm.visible = m === 'all' || m === 'bio'; halo.forEach((h) => { h.visible = m === 'all' || m === 'bio'; });
        cutRock.visible = m === 'geo'; cutOcn.visible = m === 'hyd'; baseOcn.visible = m === 'hyd'; cutAtm.visible = m === 'atm'; bio.visible = m === 'bio';
        en.visible = m === 'all'; lOut.show(m === 'all');
        orbit.dist = (PHN ? 15 : 14.5) * (m === 'all' ? (PHN ? 1.02 : 0.92) : 0.72);   // 휴대폰 '전체': 달까지 화면에 들어오게
        if (ctx.refit) ctx.refit(0.3);
        if (isCut || m === 'all' || m === 'bio') { orbit.theta = isCut ? -2.35 : 0.2; }
        if (m === 'geo') { ROCK.forEach((ly, i) => lab(i, ly.n, [0, 0, 0], [-(ly.r0 + ly.r1) / 2 * (i === 3 ? 1.0 : 1), (i % 2 ? 0.28 : -0.28) * (i === 3 ? 0 : 1) + (i === 3 ? 0.55 : 0), 0.05])); info('<b>지권</b>: 지각 · 맨틀 · 외핵 · 내핵으로 이루어져요. 외핵만 액체예요.'); }
        else if (m === 'hyd') { OCN.slice(1).forEach((ly, i) => lab(i, ly.n, [0, 0, 0], [-(ly.r0 + ly.r1) / 2, 0.2 * (i % 2 ? 1 : -1) , 0.05])); info('<b>수권</b>: 바다는 깊이에 따라 혼합층 · 수온 약층 · 심해층으로 나뉘어요. (두께는 크게 그렸어요)'); }
        else if (m === 'atm') { ATM.forEach((ly, i) => lab(i, ly.n, [0, 0, 0], [-(ly.r0 + ly.r1) / 2, 0.15 * (i % 2 ? 1 : -1), 0.05])); info('<b>기권</b>: 높이에 따른 기온 변화로 대류권 · 성층권 · 중간권 · 열권으로 나뉘어요.'); }
        else if (m === 'bio') { info('<b>생물권</b>: 육지와 바다, 대기 아래쪽에 걸쳐 생물이 살아요. 초록 점은 식물, 주황 점은 바다 생물이에요.'); lab(0, '지구에서 생물이 사는 곳', [0, R + 0.4, 0], [0, 0, 0]); }
        else { info('<b>지구시스템</b>: 지권 · 수권 · 기권 · 생물권 · 외권이 서로 영향을 주고받아요. 에너지원은 태양, 지구 내부, 달이에요.'); }
        segG.set(m);
      }
      const segG = controls.segment('권역', [{ value: 'all', label: '전체' }, { value: 'atm', label: '기권' }, { value: 'hyd', label: '수권' }, { value: 'geo', label: '지권' }, { value: 'bio', label: '생물권' }], mode, (v) => { setMode(v); lastWant = v; const L = lesson(); if (L && L.S && L.S.mode === 'layers' && (v === 'geo' || v === 'atm' || v === 'hyd') && L.setSub) L.setSub(v); });
      const lesson = () => window.__sim || null;
      let lastWant = '', lastKey = '', demoP = 0, moonA = 0.5;
      // 조석: 달을 켜면 바닷물이 달 쪽과 반대쪽으로 부풀어요
      const tide = new THREE.Mesh(new THREE.SphereGeometry(R + 0.05, 64, 40), new THREE.MeshBasicMaterial({ color: 0x3aa0ff, transparent: true, opacity: 0.28, depthWrite: false })); root.add(tide);
      const tideLab = label('밀물·썰물 (바닷물이 부풀어요)', [0, -R - 0.9, 0], { size: 12 }); tideLab.show(false);
      function wantMode() {
        const L = lesson(), S = L && L.S; if (!S) return null;
        return S.mode === 'layers' && (S.sub === 'geo' || S.sub === 'atm' || S.sub === 'hyd') ? S.sub : (S.mode === 'sort' ? 'bio' : 'all');
      }
      // 태양 · 달 · 지구를 눌러 에너지원 켜기 (2D의 그림 누르기와 같아요)
      const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(); let down = null; const rd = ctx.renderer.domElement;
      rd.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
      rd.addEventListener('pointerup', (e) => {
        if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) { down = null; return; } down = null;
        const L = lesson(); if (mode !== 'all' || !L || !L.toggleSrc || !L.S || (L.S.mode !== 'energy' && L.S.mode !== 'pair')) return;
        const r = rd.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, ctx.camera);
        const hit = ray.intersectObjects([sun, moon, ground], false)[0];
        if (hit) L.toggleSrc(hit.object === sun ? 'sun' : hit.object === moon ? 'moon' : 'core');
      });
      const pl = controls.player({
        duration: 10, loop: true, autoplay: false, label: '자전과 조석',
        phases: [[0, '지구 자전 (하루)'], [0.5, '밀물·썰물이 한 번 더']],
        onFrame(p) { demoP = p; },
      });
      /* 짝짓기(에너지원과 현상): 현상 카드를 하나씩 골라 에너지원 단추로 놓아요 (2D 상자와 같은 결과) */
      const probe = controls.text(''); probe.style.display = 'none'; const ctlRow = probe.parentElement;
      const before = new Set(ctlRow.children);
      let pcI = 0;
      const pcard = () => { const L = lesson(); return L && L.PAIR && L.PAIR.items.length ? L.PAIR.items[pcI % L.PAIR.items.length] : null; };
      const cardTx = controls.text('');
      controls.button('◀', () => { const L = lesson(); if (L && L.PAIR) { const n = L.PAIR.items.length; pcI = (pcI + n - 1) % n; lastPair = ''; syncPair(); } });
      controls.button('▶ 다음 카드', () => { const L = lesson(); if (L && L.PAIR) { pcI = (pcI + 1) % L.PAIR.items.length; lastPair = ''; syncPair(); } });
      [['sun', '☀️ 태양'], ['core', '🌋 지구 내부'], ['moon', '🌙 달']].forEach(([k, t]) => controls.button(t + '에 놓기', () => {
        const L = lesson(), c = pcard(); if (!L || !L.pairPut || !c) return;
        if (L.pairPut(c, k)) { const n = L.PAIR.items.length, nx = L.PAIR.items.findIndex((q, j) => j > pcI % n && !q.slot); const nx2 = nx >= 0 ? nx : L.PAIR.items.findIndex((q) => !q.slot); if (nx2 >= 0) pcI = nx2; }
        lastPair = ''; syncPair();
      }));
      const pairEls = Array.from(ctlRow.children).filter((c) => !before.has(c));
      let lastPair = '';
      function syncPair() {
        const L = lesson(), on = !!(L && L.S && L.S.mode === 'pair' && L.PAIR);
        pairEls.forEach((e) => { e.style.display = on ? '' : 'none'; });
        if (!on) { if (lastPair) { lastPair = ''; lastKey = ''; } return; }
        const P = L.PAIR, c = pcard(), nm = { sun: '☀️ 태양', core: '🌋 지구 내부', moon: '🌙 달' };
        const key = pcI + '|' + P.items.map((q) => (q.slot ? q.slot.key : '-')).join(',') + (L.S.pairOK > 0.5 ? 'ok' : '');
        if (key === lastPair) return; lastPair = key;
        cardTx.innerHTML = '현상 카드 ' + (pcI % P.items.length + 1) + ' / ' + P.items.length + ': <b style="color:#fff">' + (c ? c.ico + ' ' + c.label : '') + '</b>' + (c && c.slot ? ' (' + nm[c.slot.key] + ')' : '');
        const rows = ['sun', 'core', 'moon'].map((k) => nm[k] + ': ' + (P.items.filter((q) => q.slot && q.slot.key === k).map((q) => q.label).join(', ') || '—'));
        info('<b>에너지원과 현상 짝짓기</b> (놓은 카드 ' + P.placed() + ' / ' + P.items.length + ')<br>' + rows.join('<br>') + '<br>카드를 고르고 에너지원 단추를 눌러 놓아요. 다 놓으면 ✔ 확인하기를 눌러요.');
      }
      setMode('all');
      return {
        update(dt, t) {
          const L = lesson(), S = L && L.S, demo = demoP > 0 || pl.playing;
          syncPair();
          const w = wantMode(); if (w && w !== lastWant) { lastWant = w; if (w !== mode) setMode(w); }
          if (demo) { earth.rotation.y = demoP * Math.PI * 2; if (mode !== 'all' && mode !== 'bio') earth.rotation.y = 0; }
          else if (mode === 'all' || mode === 'bio') { earth.rotation.y = t * 0.12; cloud.rotation.y = t * 0.03; }
          else earth.rotation.y = Math.sin(t * 0.4) * 0.12;
          const a = demo ? moonA : t * 0.25; if (!demo) moonA = a;
          moon.position.set(Math.cos(a) * 5.4, 0.9, Math.sin(a) * 5.4); moon.rotation.y = t * 0.1;
          // 에너지원: 2D에서 켠 것만 보여요
          const src = S ? S.src : { sun: false, core: false, moon: false }, show = mode === 'all';
          const srcMode = !!(S && S.mode === 'energy');   // 에너지원 단계: 꺼진 태양도 흐리게 보여서 누를 수 있어요
          sunG.visible = show && !!src.sun; void srcMode;
          coreG.visible = show && src.core; moonG.visible = show;
          const lt = (l, on, a, b) => { const t2 = on ? a : b; if (l.txt !== t2) { l.txt = t2; l.set(t2); } };
          lt(lSun, src.sun, '태양 에너지', '☀️ 태양 (꺼짐 · 눌러 켜요)'); lt(lIn, src.core, '지구 내부 에너지', '🌋 지구 내부 (꺼짐 · 눌러 켜요)'); lt(lMoon, src.moon, '달 · 조력 에너지', '🌙 달 (꺼짐 · 눌러 켜요)');
          lSun.show(show && !!src.sun);   // 태양은 화면 밖 가장자리라 꺼진 이름표는 보이지 않게 해요 (오른쪽 ☀️ 태양 버튼으로 켜요) lIn.show(show && (src.core || srcMode)); lMoon.show(show && (src.moon || srcMode));
          moon.material.emissive.setHex(src.moon ? 0x555a66 : 0x000000);
          const tOn = show && src.moon && !(S && S.srcA && S.srcA.moon < 0.05); tide.visible = tOn; tideLab.show(tOn);
          if (tOn) { const md = new THREE.Vector3(moon.position.x, 0, moon.position.z).normalize(), k = S && S.srcA ? S.srcA.moon : 1; tide.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), md); tide.scale.set(1 + 0.09 * k, 1 - 0.03 * k, 1 - 0.03 * k); }
          const key = (S ? (src.sun ? 1 : 0) + ',' + (src.core ? 1 : 0) + ',' + (src.moon ? 1 : 0) : '') + mode;
          if (key !== lastKey && mode === 'all' && !(S && S.mode === 'pair')) { lastKey = key; const on = [src.sun && '태양', src.core && '지구 내부', src.moon && '달'].filter(Boolean); info('<b>지구시스템</b>: 지권 · 수권 · 기권 · 생물권 · 외권이 서로 영향을 주고받아요.<br>에너지원: 태양 복사 에너지 · 지구 내부 에너지 · 조석 에너지(달)' + (S && (S.mode === 'energy' || S.mode === 'pair') ? '<br>켠 에너지원: <b>' + (on.length ? on.join(' · ') : '없음 (옆 버튼이나 그림을 눌러 켜요)') + '</b>' : '')); }
          else if (mode !== 'all') lastKey = '';
          sunGlow.scale.setScalar(1 + Math.sin(t * 2) * 0.03);
          { const sa = t * 0.45; sat.position.set(Math.cos(sa) * (R + 1.5), Math.sin(sa) * 0.9, Math.sin(sa) * (R + 1.5) * 0.8); sat.rotation.y = -sa; sat.visible = mode === 'all'; orbitRing.visible = mode === 'all'; }
        },
        sync() {},
      };
    },
  });
})();
