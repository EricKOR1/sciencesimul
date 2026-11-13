/* m1-solar-members · 3D 태양계 구성 천체
   태양(별) 둘레를 행성 8개가 돌고, 화성과 목성 사이에는 소행성대, 바깥쪽에는 왜소행성(명왕성 등)이 있어요.
   혜성은 길쭉한 궤도로 돌며 태양에 가까워지면 꼬리가 생기고, 꼬리는 항상 태양의 반대쪽을 향해요.
   (크기와 거리는 보기 좋게 줄이고 고른 모형이에요 — 실제 비율이 아니에요.)
   1단계(둘러보기)만 3D예요: 천체를 누르면 천체 카드가 열려 카드 모으기 미션이 함께 진행돼요.
   분류 바구니에 카드 끌기 · 소행성대 확대 창 · 혜성 끌기 · 탐사 일지(2~4단계)는 지도 화면이에요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN0 = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  window.SciSim3D.attach({
    host: (window.matchMedia && window.matchMedia('(max-width: 599px)').matches) ? '.sc-tall' : '.sc-wide',
    title: '태양계 천체 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: 26 * (PHN0 ? 1.05 : 1), theta: 0.3, phi: 0.95, fov: 45, target: [0, 0, 0], min: 6, max: 60 },
    autoRotate: 0.05,
    levels: [0],   // 1단계(태양계 둘러보기: 천체 카드 모으기 · 스스로 빛나는 천체)만 3D
    build(ctx) {
      const { THREE, scene, root, label, info, controls, camera, renderer, orbit } = ctx;
      /* ---------- 공통 도구 ---------- */
      const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
      const V3 = THREE.Vector3, Yax = new V3(0, 1, 0);
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0.05 }, o || {}));
      const glass = (c, op, o) => mat(c || 0xbfe3ff, Object.assign({ transparent: true, opacity: op || 0.16, roughness: 0.12, metalness: 0, depthWrite: false, side: THREE.DoubleSide }, o || {}));
      const rnd = (() => { let s = 12345; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
      const _m = new THREE.Matrix4(), _c = new THREE.Color();
      function spheres(N, r, color, seg) {
        const m = new THREE.InstancedMesh(new THREE.SphereGeometry(r, seg || 16, Math.round((seg || 16) * 0.75)), mat(color, { roughness: 0.55, metalness: 0 }), N);
        m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; m.castShadow = true;
        for (let i = 0; i < N; i++) m.setColorAt(i, _c.set(0xffffff));
        root.add(m); return m;
      }
      function put(m, i, x, y, z, s) { s = s === undefined ? 1 : s; _m.makeScale(s, s, s); _m.setPosition(x, y, z); m.setMatrixAt(i, _m); }
      function tint(m, i, hex) { m.setColorAt(i, _c.set(hex)); }
      function flush(m) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
      function tubeMesh(pts, r, color, o) {
        const curve = new THREE.CatmullRomCurve3(pts.map((p) => new V3(p[0], p[1], p[2])));
        return new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(8, pts.length * 10), r, 10, false), mat(color, o));
      }
      function mkArrow(col, rad) {
        const g = new THREE.Group(), m = mat(col, { roughness: 0.4 });
        const sh = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 1, 12), m), hd = new THREE.Mesh(new THREE.ConeGeometry(rad * 2.4, rad * 6, 16), m);
        g.add(sh, hd); g.userData = { sh, hd, rad }; return g;
      }
      function setArrow(g, a, b) {
        const d = new V3().subVectors(b, a), len = d.length(); const { sh, hd, rad } = g.userData;
        if (len < 1e-3) { g.visible = false; return; }
        g.visible = true; const hl = Math.min(len * 0.5, rad * 6);
        sh.scale.y = Math.max(0.001, len - hl); sh.position.y = (len - hl) / 2;
        hd.scale.y = hl / (rad * 6); hd.position.y = len - hl / 2;
        g.position.copy(a); g.quaternion.setFromUnitVectors(Yax, d.normalize());
      }
      function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); if (THREE.sRGBEncoding) t.encoding = THREE.sRGBEncoding; return t; }
      /* 눈금이 있는 둥근 계기판 (0 ~ max, 270도) */
      function makeDial(R, max, unit, tickStep, labStep) {
        const g = new THREE.Group();
        const body = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.34, 48), mat(0x8b95a7, { metalness: 0.6, roughness: 0.3 })); body.rotation.x = Math.PI / 2; g.add(body);
        const tex = canvasTex(256, 256, (c, w) => {
          c.fillStyle = '#f7f9fc'; c.beginPath(); c.arc(128, 128, 126, 0, 7); c.fill();
          c.strokeStyle = '#334155'; c.fillStyle = '#1f2937'; c.textAlign = 'center'; c.textBaseline = 'middle';
          for (let v = 0; v <= max + 1e-6; v += tickStep) {
            const a = (-225 + 270 * v / max) * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a), big = Math.abs(v / labStep - Math.round(v / labStep)) < 1e-6;
            c.lineWidth = big ? 5 : 2.5; c.beginPath(); c.moveTo(128 + ca * 104, 128 - sa * 104); c.lineTo(128 + ca * (big ? 84 : 92), 128 - sa * (big ? 84 : 92)); c.stroke();
            if (big) { c.font = '800 26px sans-serif'; c.fillText(String(Math.round(v * 10) / 10), 128 + ca * 62, 128 - sa * 62); }
          }
          c.font = '800 20px sans-serif'; c.fillStyle = '#2563eb'; c.fillText(unit, 128, 200);
        });
        const face = new THREE.Mesh(new THREE.CircleGeometry(R * 0.93, 48), new THREE.MeshBasicMaterial({ map: tex })); face.position.z = 0.18; g.add(face);
        const needle = new THREE.Group(); needle.position.z = 0.24;
        const nb = new THREE.Mesh(new THREE.BoxGeometry(R * 0.7, 0.07, 0.04), mat(0xe11d48, { roughness: 0.4 })); nb.position.x = R * 0.3; needle.add(nb);
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 16), mat(0x475569, { metalness: 0.5 })); cap.rotation.x = Math.PI / 2; needle.add(cap);
        g.add(needle);
        g.userData.set = (v) => { needle.rotation.z = (-225 + 270 * Math.max(0, Math.min(max, v)) / max) * Math.PI / 180; };
        g.userData.set(0); return g;
      }
      /* 사방으로 빛나는 별 모양 빛 번짐 */
      function glowSprite(size, inner, mid) { const tex = canvasTex(128, 128, (c) => { const g = c.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, inner || 'rgba(255,235,160,1)'); g.addColorStop(0.25, mid || 'rgba(255,190,60,.55)'); g.addColorStop(1, 'rgba(255,160,0,0)'); c.fillStyle = g; c.fillRect(0, 0, 128, 128); });
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); s.scale.set(size, size, 1); return s; }
      function starField(n, R) { const pos = []; for (let i = 0; i < n; i++) { const u = rnd() * 2 - 1, a = rnd() * 6.283, r = Math.sqrt(1 - u * u); pos.push(Math.cos(a) * r * R, u * R, Math.sin(a) * r * R); }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); const sp = new THREE.Points(g, new THREE.PointsMaterial({ color: 0x9fb4e8, size: 1.5, sizeAttenuation: false, transparent: true, opacity: 0.55 })); sp.userData.v3bg = true; return sp; }
      /* 행성 겉면 무늬 (가로 줄무늬 / 점무늬) */
      function bandTex(cols, seed) { return canvasTex(256, 128, (c, w, h) => { let s = seed || 3; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
        const n = cols.length; for (let i = 0; i < 16; i++) { c.fillStyle = cols[Math.floor(r() * n)]; c.fillRect(0, i * h / 16, w, h / 16 + 1); }
        c.globalAlpha = 0.25; for (let i = 0; i < 60; i++) { c.fillStyle = cols[Math.floor(r() * n)]; c.beginPath(); c.ellipse(r() * w, r() * h, 8 + r() * 25, 2 + r() * 4, 0, 0, 7); c.fill(); } c.globalAlpha = 1; }); }

      /* 행성 겉면 (실제처럼): 띠·구름·대륙·충돌 구덩이·극관을 작은 캔버스에 그려요 */
      function planetTex(kind, cols, seed) { return canvasTex(512, 256, (c, w, h) => { let s = seed || 3; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
        const n = cols.length, blob = (x, y, rx, ry, col, a) => { c.globalAlpha = a; c.fillStyle = col; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, 7); c.fill(); if (x < rx) { c.beginPath(); c.ellipse(x + w, y, rx, ry, 0, 0, 7); c.fill(); } if (x > w - rx) { c.beginPath(); c.ellipse(x - w, y, rx, ry, 0, 0, 7); c.fill(); } c.globalAlpha = 1; };
        c.fillStyle = cols[0]; c.fillRect(0, 0, w, h);
        if (kind === 'gas' || kind === 'ice' || kind === 'jupiter') {   // 가스 행성: 부드러운 가로 띠 + 소용돌이
          const gasy = kind !== 'ice', N = gasy ? 22 : 9; for (let i = 0; i < N; i++) { const y0 = i * h / N, g = c.createLinearGradient(0, y0, 0, y0 + h / N + 1); g.addColorStop(0, cols[Math.floor(r() * n)]); g.addColorStop(1, cols[Math.floor(r() * n)]); c.fillStyle = g; c.fillRect(0, y0, w, h / N + 1); }
          for (let i = 0; i < (gasy ? 260 : 60); i++) blob(r() * w, r() * h, 10 + r() * 46, 1 + r() * 3.2, cols[Math.floor(r() * n)], gasy ? 0.22 : 0.1);
        } else if (kind === 'earth') {            // 지구: 바다 + 대륙 + 구름 + 극지방 얼음
          const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#1a4f9c'); g.addColorStop(0.5, '#1f66c4'); g.addColorStop(1, '#1a4f9c'); c.fillStyle = g; c.fillRect(0, 0, w, h);
          for (let k = 0; k < 9; k++) { const cx = r() * w, cy = 50 + r() * 150; for (let i = 0; i < 22; i++) blob(cx + (r() - 0.5) * 90, cy + (r() - 0.5) * 60, 8 + r() * 24, 6 + r() * 16, r() < 0.3 ? '#8a7a45' : (r() < 0.5 ? '#2f8a4a' : '#3d9a52'), 0.9); }
          c.fillStyle = '#eef4fa'; c.fillRect(0, 0, w, 12); c.fillRect(0, h - 14, w, 14); for (let i = 0; i < 40; i++) { blob(r() * w, 10 + r() * 8, 14 + r() * 20, 5, '#eef4fa', 0.9); blob(r() * w, h - 14 - r() * 6, 14 + r() * 20, 5, '#eef4fa', 0.9); }
          for (let i = 0; i < 150; i++) blob(r() * w, 20 + r() * (h - 40), 8 + r() * 34, 1.5 + r() * 5, '#ffffff', 0.2 + r() * 0.3);
        } else {                                  // 암석 천체: 얼룩 + 충돌 구덩이
          for (let i = 0; i < 240; i++) blob(r() * w, r() * h, 6 + r() * 40, 4 + r() * 22, cols[Math.floor(r() * n)], 0.2);
          if (kind === 'venus') for (let i = 0; i < 120; i++) blob(r() * w, r() * h, 30 + r() * 70, 2 + r() * 5, cols[Math.floor(r() * n)], 0.25);
          if (kind === 'crater') for (let i = 0; i < 70; i++) { const x = r() * w, y = r() * h, q = 2 + r() * 9; blob(x, y, q, q * 0.9, 'rgba(0,0,0,1)', 0.22); blob(x - q * 0.2, y - q * 0.2, q * 0.7, q * 0.62, cols[Math.floor(r() * n)], 0.5); }
          if (kind === 'mars') { for (let i = 0; i < 26; i++) blob(r() * w, 60 + r() * 130, 14 + r() * 40, 5 + r() * 14, '#6e2f1c', 0.3); c.fillStyle = '#f3ece6'; for (let i = 0; i < 30; i++) { blob(r() * w, 5 + r() * 5, 16 + r() * 20, 5, '#f3ece6', 0.9); blob(r() * w, h - 4 - r() * 4, 14 + r() * 16, 4, '#f3ece6', 0.9); } }
        }
        if (kind === 'jupiter') { blob(350, 168, 30, 15, '#a8452c', 0.85); blob(350, 168, 20, 9, '#c2603c', 0.8); } }); }
      /* 태양 겉면: 쌀알 무늬 + 흑점 */
      const sunTex = canvasTex(512, 256, (c, w, h) => { let s = 77; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
        c.fillStyle = '#ffb21f'; c.fillRect(0, 0, w, h);
        for (let i = 0; i < 2600; i++) { const q = 2 + r() * 6; c.globalAlpha = 0.18 + r() * 0.25; c.fillStyle = r() < 0.55 ? '#ffe27a' : (r() < 0.6 ? '#ff8a12' : '#fff3b8'); c.beginPath(); c.ellipse(r() * w, r() * h, q * 1.5, q, r() * 3, 0, 7); c.fill(); }
        for (let i = 0; i < 7; i++) { const x = r() * w, y = 70 + r() * 116, q = 3 + r() * 5; c.globalAlpha = 0.5; c.fillStyle = '#c2560a'; c.beginPath(); c.ellipse(x, y, q * 2.2, q * 1.5, 0, 0, 7); c.fill(); c.globalAlpha = 0.85; c.fillStyle = '#5a2504'; c.beginPath(); c.ellipse(x, y, q * 1.1, q * 0.8, 0, 0, 7); c.fill(); } c.globalAlpha = 1; });

      scene.add(new THREE.AmbientLight(0x8fa0d8, 0.34));
      const sunLight = new THREE.PointLight(0xfff0cc, 1.25, 0, 0); root.add(sunLight);
      root.add(starField(420, 90));
      { const s2 = starField(90, 88); s2.material.size = 2.6; s2.material.color.set(0xe8efff); s2.material.opacity = 0.8; root.add(s2); const s3 = starField(60, 86); s3.material.size = 2.2; s3.material.color.set(0xffd9a8); s3.material.opacity = 0.6; root.add(s3); }
      const rOf = (a) => 0.8 + 2.3 * Math.log(1 + 2 * a);          // 거리(AU) → 화면 반지름 (로그 모양으로 줄임)
      const st = { play: true, names: true, focus: 'all', t: 0 };

      /* 태양 */
      const sun = new THREE.Mesh(new THREE.SphereGeometry(1.15, 48, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, map: sunTex })); root.add(sun);
      const glow = glowSprite(8); root.add(glow);
      ctx.halo(sun, 0xffd27a, 4.6, 0.55);   // 코로나처럼 번지는 빛
      const sunLab = label('태양', sun, { size: 13, offset: [0, 1.7, 0], color: 'rgba(120,70,0,.9)' });

      /* 행성 */
      const PL = [
        { n: '수성', a: 0.39, r: 0.27, col: ['#7d7870', '#96908a', '#6a665f', '#857f76'], P: 0.24, k: 'in', tx: 'crater' },
        { n: '금성', a: 0.72, r: 0.37, col: ['#d9b877', '#c9a25c', '#e6cf9c', '#b98f4e'], P: 0.62, k: 'in', tx: 'venus', atm: 0xf2d79a },
        { n: '지구', a: 1.0, r: 0.39, col: ['#2f7fd8', '#4caf6a', '#2f7fd8', '#f2f6fa'], P: 1, k: 'in', tx: 'earth', atm: 0x6fb4ff },
        { n: '화성', a: 1.52, r: 0.3, col: ['#b5532f', '#a34726', '#c9744a', '#8f3d22'], P: 1.9, k: 'in', tx: 'mars' },
        { n: '목성', a: 5.2, r: 0.85, col: ['#c9a074', '#b0764a', '#e6d6bb', '#9c6238', '#d9bd96'], P: 11.9, k: 'out', tx: 'jupiter' },
        { n: '토성', a: 9.5, r: 0.72, col: ['#d9c38a', '#c4aa70', '#e6d6a8', '#b89c62'], P: 29, k: 'out', ring: true, tx: 'gas' },
        { n: '천왕성', a: 19.2, r: 0.5, col: ['#7fcfd6', '#6cc0ca', '#92dbe0'], P: 84, k: 'out', tx: 'ice', atm: 0x9fe8ee },
        { n: '해왕성', a: 30.1, r: 0.48, col: ['#2a4bc0', '#3a62dc', '#2340a8', '#4a74e6'], P: 165, k: 'out', tx: 'ice', atm: 0x5c86ff },
      ];
      const orbitMat = (c, o) => new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: o });
      function orbitLine(rx, rz, c, o, tilt) { const pts = []; for (let i = 0; i <= 128; i++) { const a = i / 128 * 6.2832; pts.push(new V3(Math.cos(a) * rx, 0, Math.sin(a) * rz)); }
        const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), orbitMat(c, o)); if (tilt) l.rotation.x = tilt; return l; }
      const planets = [];
      PL.forEach((p, i) => {
        const R = rOf(p.a); p.R = R;
        root.add(orbitLine(R, R, 0x6f86c9, 0.4));
        const m = new THREE.Mesh(new THREE.SphereGeometry(p.r, 48, 32), mat(0xffffff, { map: planetTex(p.tx, p.col, 3 + i * 5), roughness: p.tx === 'earth' ? 0.55 : 0.85, metalness: 0 }));
        if (p.atm) { const at = new THREE.Mesh(new THREE.SphereGeometry(p.r * 1.07, 32, 24), new THREE.MeshBasicMaterial({ color: p.atm, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, side: THREE.BackSide, depthWrite: false })); at.raycast = () => {}; m.add(at); }   // 얇은 대기층
        if (p.ring) {   // 토성 고리: 여러 겹의 띠와 틈 (카시니 간극)
          const ri = p.r * 1.3, ro = p.r * 2.25, rgG = new THREE.RingGeometry(ri, ro, 128, 1), pa = rgG.attributes.position, uv = rgG.attributes.uv;
          for (let k = 0; k < pa.count; k++) uv.setXY(k, (Math.hypot(pa.getX(k), pa.getY(k)) - ri) / (ro - ri), 0.5);
          const rt = canvasTex(256, 4, (c) => { let s = 9; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; for (let x = 0; x < 256; x++) { const u = x / 256; let a = 0.55 + 0.4 * r(); if (u < 0.12) a *= 0.35; if (u > 0.62 && u < 0.7) a = 0.04; if (u > 0.95) a *= 0.4; const v = Math.round(190 + r() * 45); c.fillStyle = 'rgba(' + v + ',' + Math.round(v * 0.9) + ',' + Math.round(v * 0.68) + ',' + a.toFixed(2) + ')'; c.fillRect(x, 0, 1, 4); } });
          const rg = new THREE.Mesh(rgG, new THREE.MeshStandardMaterial({ color: 0xffffff, map: rt, transparent: true, side: THREE.DoubleSide, roughness: 0.8, depthWrite: false, emissive: 0x4a3f28, emissiveIntensity: 0.5 })); rg.rotation.x = Math.PI / 2 - 0.45; m.add(rg); }
        root.add(m); p.m = m; p.ph = i * 1.3 + 0.5; p.lab = label(p.n, m, { size: 11.5, offset: [0, p.r + 0.55, 0] }); planets.push(p);
      });

      /* 위성: 달(지구) · 이오 · 유로파 · 가니메데 · 칼리스토(목성) — 2D와 같은 천체, 거리와 크기는 보기 좋게 */
      const MOONS = [
        { n: '달', host: '지구', d: 0.75, r: 0.1, P: 0.5, c: 0xa9a9a6, ph: 0.6 },
        { n: '이오', host: '목성', d: 1.25, r: 0.075, P: 0.36, c: 0xc9b24a, ph: 0.2 },
        { n: '유로파', host: '목성', d: 1.55, r: 0.07, P: 0.7, c: 0xb8ae98, ph: 2.1 },
        { n: '가니메데', host: '목성', d: 1.9, r: 0.1, P: 1.3, c: 0x8a7e6e, ph: 3.9 },
        { n: '칼리스토', host: '목성', d: 2.3, r: 0.09, P: 2.3, c: 0x625a50, ph: 5.3 },
      ];
      const MOON_ID = { '달': 'moon', '이오': 'io', '유로파': 'europa', '가니메데': 'ganymede', '칼리스토': 'callisto' };
      MOONS.forEach((m) => { m.id = MOON_ID[m.n]; m.hostP = PL.find((p) => p.n === m.host); m.m = new THREE.Mesh(new THREE.SphereGeometry(m.r, 24, 18), mat(m.c, { roughness: 0.95, metalness: 0, bumpMap: ctx.mats.tex('noise'), bumpScale: 0.01 })); root.add(m.m); m.lab = label(m.n, m.m, { size: 10.5, offset: [0, m.r + 0.4, 0], color: 'rgba(70,70,70,.88)' }); });

      /* 소행성대 (화성과 목성 사이) */
      const NA = 520, belt = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.05, 0), mat(0xffffff, { roughness: 1, metalness: 0, flatShading: true }), NA); belt.frustumCulled = false; root.add(belt);
      { const ROCK = [0x7a6f62, 0x8c8172, 0x655c52, 0x94897c, 0x6f6a66]; for (let i = 0; i < NA; i++) belt.setColorAt(i, _c.set(ROCK[i % ROCK.length])); belt.instanceColor.needsUpdate = true; }
      const BP = []; for (let i = 0; i < NA; i++) { const a = rnd() * 6.283, r = rOf(2.2 + rnd() * 1.1); BP.push([r, a, (rnd() - 0.5) * 0.35, 0.6 + 0.8 * rnd(), 0.6 + 0.8 * rnd(), rnd() * 6.3]); }
      const beltLab = label('소행성대', [rOf(2.7) * 0.7, 0.4, -rOf(2.7) * 0.7], { size: 12, color: 'rgba(80,70,50,.88)' });
      const _bm = new THREE.Matrix4(), _bq = new THREE.Quaternion(), _bp = new V3(), _bs = new V3(), BPOS = new Float32Array(NA * 3);

      /* 왜소행성 (세레스 · 명왕성 · 에리스) */
      const DW = [{ id: 'ceres', n: '세레스', a: 2.77, r: 0.1, e: 0.08, P: 4.6, c: 0xb8aea0, ph: 2, cols: ['#8f867a', '#a39a8c', '#7a7268'] }, { id: 'pluto', n: '명왕성', a: 39.5, r: 0.16, e: 0.25, P: 248, c: 0xd8b99a, ph: 4, tilt: 0.3, cols: ['#b89878', '#d0b698', '#8f7258', '#e0d0b8'] }, { id: 'eris', n: '에리스', a: 68, r: 0.17, e: 0.44, P: 558, c: 0xe9e4da, ph: 1, tilt: 0.7, cols: ['#c9c4ba', '#dedad0', '#b0aba2'] }];
      DW.forEach((d) => { const R = rOf(d.a); d.R = R;
        const sx = R, sz = R * (1 - d.e * 0.3); const l = orbitLine(sx, sz, 0xc9a7ff, 0.42, d.tilt); l.position.x = -R * d.e * 0.5; root.add(l); d.l = l;
        d.m = new THREE.Mesh(new THREE.SphereGeometry(d.r, 24, 18), mat(0xffffff, { map: planetTex('crater', d.cols, 11 + d.ph), roughness: 0.95, metalness: 0 })); root.add(d.m); d.lab = label(d.n, d.m, { size: 11, offset: [0, 0.55, 0], color: 'rgba(90,50,150,.9)' }); });

      /* 혜성: 길쭉한 궤도 + 태양 반대쪽 꼬리 */
      const CA = 9.5, CE = 0.86, CB = CA * Math.sqrt(1 - CE * CE), CC = CA * CE;
      const cometOrbit = (() => { const pts = []; for (let i = 0; i <= 160; i++) { const a = i / 160 * 6.2832; pts.push(new V3(CA * Math.cos(a) - CC, 0, CB * Math.sin(a))); } const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), orbitMat(0x7fe0ff, 0.5)); l.rotation.y = 0.7; l.rotation.x = 0.12; return l; })();
      root.add(cometOrbit);
      const comet = new THREE.Group(); const nucleus = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), mat(0xb9c4cf, { roughness: 0.95, metalness: 0, flatShading: true })); nucleus.scale.set(1.25, 0.85, 0.95); comet.add(nucleus);
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      tail.geometry.translate(0, -0.5, 0); comet.add(tail); // 꼬리: -y 방향(원점이 머리)
      const cHead = glowSprite(1.1, 'rgba(210,245,255,1)', 'rgba(130,210,255,.5)'); comet.add(cHead); root.add(comet);
      const cLab = label('혜성', comet, { size: 12, offset: [0, 0.7, 0], color: 'rgba(20,90,120,.9)' });
      const cLab2 = label('꼬리는 태양의 반대쪽', comet, { size: 11, offset: [0, -0.9, 0], color: 'rgba(20,90,120,.9)' });
      let cT = 1.2;
      const cm = new V3(), cq = new THREE.Quaternion(), dirv = new V3();
      function placeComet(M) { // M: 평균근점이각 근사 (케플러 방정식 풀이)
        let E = M; for (let k = 0; k < 6; k++) E = M + CE * Math.sin(E);
        const lx = CA * (Math.cos(E) - CE), lz = -CB * Math.sin(E);  // 북쪽에서 보면 시계 반대 방향
        cm.set(lx, 0, lz); cm.applyAxisAngle(new V3(1, 0, 0), 0.12); cm.applyAxisAngle(new V3(0, 1, 0), 0.7); comet.position.copy(cm);
        const d = cm.length(); dirv.copy(cm).normalize(); cq.setFromUnitVectors(new V3(0, -1, 0), dirv); comet.quaternion.copy(cq);
        const len = Math.max(0.01, Math.min(5.2, 6.5 / (d * d + 1.2) * 4)), vis = d < 8.5 ? 1 : 0.0;
        tail.scale.set(Math.max(0.2, Math.min(1.1, len / 4)), len * (vis ? 1 : 0.0001), Math.max(0.2, Math.min(1.1, len / 4))); tail.visible = d < 8.5;
        return d;
      }

      /* 보기 */
      function applyFocus() {
        const f = st.focus;
        planets.forEach((p) => { p.m.visible = p.lab.visible = f === 'all' || f === 'planet'; }); MOONS.forEach((m) => { m.m.visible = m.lab.visible = f === 'all' || f === 'planet'; });
        belt.visible = beltLab.visible = f === 'all' || f === 'small'; DW.forEach((d) => { d.m.visible = d.l.visible = d.lab.visible = f === 'all' || f === 'small'; });
        comet.visible = cometOrbit.visible = f === 'all' || f === 'small'; cLab.visible = cLab2.visible = comet.visible;
        beltLab.show(st.names && belt.visible); cLab.show(st.names && comet.visible); cLab2.show(st.names && comet.visible);
        planets.forEach((p) => p.lab.show(st.names && p.m.visible)); MOONS.forEach((m) => m.lab.show(st.names && m.m.visible)); DW.forEach((d) => d.lab.show(st.names && d.m.visible)); sunLab.show(st.names);
        text();
      }
      let shown = null;   // 지금 보여 주는 천체 카드 (2D의 S.card)
      /* 천체 카드 · 모은 카드 판: 2D 지도 옆의 카드와 '모은 종류'를 3D 화면에도 똑같이 보여 줘요 */
      const vEl = renderer.domElement.parentElement;
      const cssId = 'sm3d-cards';
      if (!document.getElementById(cssId)) { const st2 = document.createElement('style'); st2.id = cssId; st2.textContent =
        '.sm-card{position:absolute;left:10px;bottom:10px;width:min(230px,58%);padding:10px 12px;border-radius:14px;background:#fffdf7;color:#1b2333;box-shadow:0 6px 22px rgba(0,0,0,.45);border-top:6px solid var(--kc,#999);pointer-events:none;transform-origin:left bottom;transition:transform .25s cubic-bezier(.3,1.6,.6,1),opacity .2s}' +
        '.sm-card.off{opacity:0;transform:scale(.85)}.sm-card .t{font-weight:900;font-size:16px}.sm-card .b{display:inline-block;margin:4px 0 6px;padding:1px 8px;border-radius:999px;color:#fff;font-weight:800;font-size:12px;background:var(--kc,#999)}.sm-card .l{font-size:12.5px;line-height:1.45}' +
        '.sm-tray{position:absolute;right:10px;top:10px;padding:6px 8px;border-radius:12px;background:rgba(8,12,24,.72);color:#fff;font-size:12px;font-weight:800;pointer-events:none;max-width:46%}.sm-tray .h{margin-bottom:4px}.sm-tray .c{display:inline-block;margin:2px;padding:2px 7px;border-radius:8px;background:rgba(255,255,255,.12);color:#9aa6bd}.sm-tray .c.on{background:var(--kc);color:#fff}' +
        '@media (max-width:599px){.sm-card{width:48%;padding:6px 8px;bottom:8px}.sm-card .t{font-size:13px}.sm-card .b{font-size:11px;margin:2px 0 3px}.sm-card .l{font-size:11px}.sm-tray{top:auto;bottom:30px;right:8px;font-size:10.5px;max-width:46%;padding:4px 6px}.sm-tray .c{padding:1px 5px;margin:1px}}';
        document.head.appendChild(st2); }
      const cardEl = document.createElement('div'); cardEl.className = 'sm-card off'; vEl.appendChild(cardEl);
      const trayEl = document.createElement('div'); trayEl.className = 'sm-tray'; vEl.appendChild(trayEl);
      let traySig = '';
      function drawTray() {
        const L = ctx.lesson(); if (!L || !L.kindList) { trayEl.style.display = 'none'; return; }
        const got = L.gotKinds(), sig = got.join(','); if (sig === traySig) return; traySig = sig;
        trayEl.innerHTML = '<div class="h">🪪 모은 카드 ' + got.length + ' / 6</div>' + L.kindList().map((q) => '<span class="c' + (got.includes(q.k) ? ' on' : '') + '" style="--kc:' + q.col + '">' + (got.includes(q.k) ? '✅ ' : '') + q.name + '</span>').join('');
      }
      function drawCard() {
        const L = ctx.lesson(), c = shown && L && L.cardInfo ? L.cardInfo(shown) : null;
        if (!c) { cardEl.classList.add('off'); return; }
        cardEl.style.setProperty('--kc', c.col || '#999');
        cardEl.innerHTML = '<div class="t">' + c.name + '</div><div class="b">' + c.badge + '</div><div class="l">' + c.lines.join('<br>') + '</div>';
        cardEl.classList.add('off'); void cardEl.offsetWidth; cardEl.classList.remove('off');
      }
      function text() {
        const L = ctx.lesson(), c = shown && L && L.cardInfo ? L.cardInfo(shown) : null;
        drawCard(); drawTray();
        if (c) { info('천체를 눌러 <b>카드</b>를 모아요. 지금 카드: <b>' + c.name + '</b> (' + c.badge + ')'); return; }
        const t = { all: '가운데 <b>태양</b> 둘레를 <b>행성</b> 8개와 소행성·혜성 같은 작은 천체들이 돌아요.<br>바깥쪽 보라색 궤도에는 <b>왜소행성</b>이 있어요. 천체나 이름표를 누르면 천체 카드가 열려요.', planet: '<b>행성</b> 8개는 태양 둘레를 거의 같은 평면에서 같은 방향으로 돌아요.<br><b>위성</b>은 행성 둘레를 돌아요: 지구의 달, 목성의 이오·유로파·가니메데·칼리스토.', small: '<b>소행성</b>(베스타·아포피스 등)은 화성~목성 사이에 많이 모여 있어요. <b>왜소행성</b>은 행성보다 작고 공전 궤도 근처를 정리하지 못했어요.<br><b>혜성</b>은 태양에 가까워지면 꼬리가 생기고, 꼬리는 항상 <b>태양의 반대쪽</b>을 향해요.' }[st.focus];
        info(t);
      }
      controls.segment('', [{ value: 'all', label: '전체' }, { value: 'planet', label: '행성' }, { value: 'small', label: '소행성·혜성' }], 'all', (v) => { st.focus = v; applyFocus(); });
      /* ▶ 공전: 한 바퀴 재생 시간 D초 동안 모든 천체가 '정수 바퀴'를 돌도록 속도를 맞춰서, 끝에서 처음으로 돌아갈 때 끊김 없이 이어져요 (빠르기 비율은 그대로 두었어요) */
      const D = 240, TAU2 = Math.PI * 2;
      const rev = (omega) => Math.max(1, Math.round(omega * D / TAU2)) * TAU2 / D;
      planets.forEach((p) => { p.w = rev(0.8 / Math.pow(p.P, 0.62)); });
      DW.forEach((d) => { d.w = rev(0.8 / Math.pow(d.P, 0.62)); });
      MOONS.forEach((m) => { m.w = rev(1.0 / m.P * 0.9); });
      const BW = []; for (let i = 0; i < NA; i++) BW.push(rev(0.12 / Math.pow(BP[i][0], 0.5) * BP[i][3]));
      const cW = rev(0.28);
      const pl = controls.player({ duration: D, loop: true, autoplay: true, label: '공전', phases: [[0, '한 바퀴 재생 (끊김 없이 반복)']], onFrame() {} });
      const nB = controls.button('🏷 이름표', () => { st.names = !st.names; nB.classList.toggle('on', st.names); applyFocus(); }); nB.classList.add('on');
      applyFocus();

      const PLANET_ID = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
      /* 이름표를 눌러도 그 천체의 카드가 열려요 (행성은 작고 계속 돌아서 이름표가 누르기 쉬워요) */
      const tapId = (id) => () => { const L = ctx.lesson(); if (L && L.tapBody3D) L.tapBody3D(id); };
      sunLab.tap(tapId('sun'));
      planets.forEach((p, i) => p.lab.tap(tapId(PLANET_ID[i])));
      MOONS.forEach((m) => m.lab.tap(tapId(m.id)));
      DW.forEach((d) => d.lab.tap(tapId(d.id)));
      cLab.tap(tapId('comet')); beltLab.tap(tapId('asteroid'));
      /* 천체 누르기: 화면에서 가장 가까운 천체의 카드를 열어요 (지도에서 누른 것과 같아요) */
      { const dom = renderer.domElement, viewEl = dom.parentElement, q = new V3(); let down = null;
        const near = (pos, R, ex, ey) => { q.copy(pos).project(camera); if (q.z > 1) return 1e9; return Math.hypot((q.x + 1) / 2 * R.width - ex, (1 - q.y) / 2 * R.height - ey); };
        viewEl.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
        viewEl.addEventListener('pointerup', (e) => {
          if (!down) return; const mv = Math.hypot(e.clientX - down.x, e.clientY - down.y); down = null; if (mv > 6) return;
          if (e.target && e.target.closest && e.target.closest('.v3-lab, .v3-ctl, .v3-info, .sm-card, .sm-tray')) return;   // 이름표를 누른 것은 이름표의 천체로만 (옆 천체가 다시 잡히지 않게)
          const L = ctx.lesson(); if (!L || !L.tapBody3D) return;
          const R = dom.getBoundingClientRect(), ex = e.clientX - R.left, ey = e.clientY - R.top;
          let best = null, bd = 34;
          const test = (id, pos, ex2) => { const d = near(pos, R, ex, ey) - (ex2 || 0); if (d < bd) { bd = d; best = id; } };
          test('sun', sun.position, 18);
          planets.forEach((p, i) => { if (p.m.visible) test(PLANET_ID[i], p.m.position); });
          MOONS.forEach((m) => { if (m.m.visible) test(m.id, m.m.position); });
          DW.forEach((d) => { if (d.m.visible) test(d.id, d.m.position); });
          if (comet.visible) test('comet', comet.position);
          if (!best && belt.visible) { const bp = new V3(); for (let i = 0; i < NA; i++) { bp.set(BPOS[i * 3], BPOS[i * 3 + 1], BPOS[i * 3 + 2]); if (near(bp, R, ex, ey) < 14) { best = 'asteroid'; break; } } }
          if (best) L.tapBody3D(best);
        });
      }
      /* 2D의 '안쪽 태양계 · 전체 태양계' 단추를 따라 가깝게 · 멀리 보기 */
      let lastView = null, distTo = null;

      return {
        update(dt, t) {
          const T = pl.p * D;
          planets.forEach((p) => { const a = p.ph - T * p.w; p.m.position.set(Math.cos(a) * p.R, 0, Math.sin(a) * p.R); p.m.rotation.y += dt * 0.6; });
          DW.forEach((d) => { const a = d.ph - T * d.w; const sx = d.R, sz = d.R * (1 - d.e * 0.3); const v = new V3(Math.cos(a) * sx - d.R * d.e * 0.5, 0, Math.sin(a) * sz); if (d.l.rotation.x) v.applyAxisAngle(new V3(1, 0, 0), d.l.rotation.x); d.m.position.copy(v); });
          MOONS.forEach((m) => { const a = m.ph - T * m.w, hp = m.hostP.m.position; m.m.position.set(hp.x + Math.cos(a) * m.d, hp.y + Math.sin(a * 0.5) * 0.04, hp.z + Math.sin(a) * m.d); });
          for (let i = 0; i < NA; i++) { const b = BP[i], a = b[1] - T * BW[i]; _bq.set(Math.sin(b[5] + a), 0.3, Math.cos(b[5]), 1).normalize(); _bm.compose(_bp.set(0, 0, 0), _bq, _bs.set(b[3], b[3] * b[4], b[3] * 0.8)); _bm.setPosition(Math.cos(a) * b[0], b[2], Math.sin(a) * b[0]); belt.setMatrixAt(i, _bm); BPOS[i * 3] = Math.cos(a) * b[0]; BPOS[i * 3 + 1] = b[2]; BPOS[i * 3 + 2] = Math.sin(a) * b[0]; }
          belt.instanceMatrix.needsUpdate = true;
          const M = (1.2 + T * cW) % 6.2832; placeComet(M);
          glow.scale.setScalar(8 + 0.3 * Math.sin(t * 2));
          const S = (ctx.lesson() || {}).S;
          if (S) {
            const c = S.card || null; if (c !== shown) { shown = c; text(); } else drawTray();
            if (S.view !== lastView) { if (S.view === 'inner' || S.view === 'full') distTo = S.view === 'inner' ? 13 : 26; lastView = S.view; }
          }
          if (distTo != null) { orbit.dist += (distTo - orbit.dist) * Math.min(1, dt * 4); if (Math.abs(distTo - orbit.dist) < 0.05) distTo = null; }
        },
        sync() {},
      };
    },
  });
})();
