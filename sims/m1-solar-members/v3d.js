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
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); return new THREE.Points(g, new THREE.PointsMaterial({ color: 0x9fb4e8, size: 1.5, sizeAttenuation: false, transparent: true, opacity: 0.55 })); }
      /* 행성 겉면 무늬 (가로 줄무늬 / 점무늬) */
      function bandTex(cols, seed) { return canvasTex(256, 128, (c, w, h) => { let s = seed || 3; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
        const n = cols.length; for (let i = 0; i < 16; i++) { c.fillStyle = cols[Math.floor(r() * n)]; c.fillRect(0, i * h / 16, w, h / 16 + 1); }
        c.globalAlpha = 0.25; for (let i = 0; i < 60; i++) { c.fillStyle = cols[Math.floor(r() * n)]; c.beginPath(); c.ellipse(r() * w, r() * h, 8 + r() * 25, 2 + r() * 4, 0, 0, 7); c.fill(); } c.globalAlpha = 1; }); }

      scene.add(new THREE.AmbientLight(0x8fa0d8, 0.5));
      const sunLight = new THREE.PointLight(0xfff0cc, 1.5, 0, 0); root.add(sunLight);
      root.add(starField(420, 90));
      const rOf = (a) => 0.8 + 2.3 * Math.log(1 + 2 * a);          // 거리(AU) → 화면 반지름 (로그 모양으로 줄임)
      const st = { play: true, names: true, focus: 'all', t: 0 };

      /* 태양 */
      const sun = new THREE.Mesh(new THREE.SphereGeometry(1.15, 48, 32), new THREE.MeshBasicMaterial({ color: 0xffd23f })); root.add(sun);
      const glow = glowSprite(8); root.add(glow);
      const sunLab = label('태양', sun, { size: 13, offset: [0, 1.7, 0], color: 'rgba(120,70,0,.9)' });

      /* 행성 */
      const PL = [
        { n: '수성', a: 0.39, r: 0.27, col: ['#9a9a9a', '#b9b3a8', '#8a8579'], P: 0.24, k: 'in' },
        { n: '금성', a: 0.72, r: 0.37, col: ['#e8cf9a', '#d9b877', '#f0dfb8'], P: 0.62, k: 'in' },
        { n: '지구', a: 1.0, r: 0.39, col: ['#2f7fd8', '#4caf6a', '#2f7fd8', '#f2f6fa'], P: 1, k: 'in' },
        { n: '화성', a: 1.52, r: 0.3, col: ['#c9623b', '#b5532f', '#d98a5c'], P: 1.9, k: 'in' },
        { n: '목성', a: 5.2, r: 0.85, col: ['#d9b48a', '#c58a5c', '#efe2cc', '#b97a4a'], P: 11.9, k: 'out' },
        { n: '토성', a: 9.5, r: 0.72, col: ['#e6d3a0', '#d3bb82', '#f2e6bf'], P: 29, k: 'out', ring: true },
        { n: '천왕성', a: 19.2, r: 0.5, col: ['#9fe1e6', '#86d3dc'], P: 84, k: 'out' },
        { n: '해왕성', a: 30.1, r: 0.48, col: ['#3d63dd', '#4c78f0', '#3558c8'], P: 165, k: 'out' },
      ];
      const orbitMat = (c, o) => new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: o });
      function orbitLine(rx, rz, c, o, tilt) { const pts = []; for (let i = 0; i <= 128; i++) { const a = i / 128 * 6.2832; pts.push(new V3(Math.cos(a) * rx, 0, Math.sin(a) * rz)); }
        const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), orbitMat(c, o)); if (tilt) l.rotation.x = tilt; return l; }
      const planets = [];
      PL.forEach((p, i) => {
        const R = rOf(p.a); p.R = R;
        root.add(orbitLine(R, R, 0x6f86c9, 0.4));
        const m = new THREE.Mesh(new THREE.SphereGeometry(p.r, 40, 28), mat(0xffffff, { map: bandTex(p.col, 3 + i * 5), roughness: 0.8 }));
        if (p.ring) { const rg = new THREE.Mesh(new THREE.RingGeometry(p.r * 1.35, p.r * 2.1, 64), new THREE.MeshStandardMaterial({ color: 0xe6d3a0, transparent: true, opacity: 0.7, side: THREE.DoubleSide, roughness: 0.7 })); rg.rotation.x = Math.PI / 2 - 0.45; m.add(rg); }
        root.add(m); p.m = m; p.ph = i * 1.3 + 0.5; p.lab = label(p.n, m, { size: 11.5, offset: [0, p.r + 0.55, 0] }); planets.push(p);
      });

      /* 위성: 달(지구) · 이오 · 유로파 · 가니메데 · 칼리스토(목성) — 2D와 같은 천체, 거리와 크기는 보기 좋게 */
      const MOONS = [
        { n: '달', host: '지구', d: 0.75, r: 0.1, P: 0.5, c: 0xcfcfcf, ph: 0.6 },
        { n: '이오', host: '목성', d: 1.25, r: 0.075, P: 0.36, c: 0xe8d77a, ph: 0.2 },
        { n: '유로파', host: '목성', d: 1.55, r: 0.07, P: 0.7, c: 0xdad2c0, ph: 2.1 },
        { n: '가니메데', host: '목성', d: 1.9, r: 0.1, P: 1.3, c: 0xa89c8c, ph: 3.9 },
        { n: '칼리스토', host: '목성', d: 2.3, r: 0.09, P: 2.3, c: 0x7f766c, ph: 5.3 },
      ];
      const MOON_ID = { '달': 'moon', '이오': 'io', '유로파': 'europa', '가니메데': 'ganymede', '칼리스토': 'callisto' };
      MOONS.forEach((m) => { m.id = MOON_ID[m.n]; m.hostP = PL.find((p) => p.n === m.host); m.m = new THREE.Mesh(new THREE.SphereGeometry(m.r, 20, 14), mat(m.c, { roughness: 0.9 })); root.add(m.m); m.lab = label(m.n, m.m, { size: 10.5, offset: [0, m.r + 0.4, 0], color: 'rgba(70,70,70,.88)' }); });

      /* 소행성대 (화성과 목성 사이) */
      const NA = 520, belt = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.05, 0), mat(0x9a8f82, { roughness: 0.95 }), NA); belt.frustumCulled = false; root.add(belt);
      const BP = []; for (let i = 0; i < NA; i++) { const a = rnd() * 6.283, r = rOf(2.2 + rnd() * 1.1); BP.push([r, a, (rnd() - 0.5) * 0.35, 0.6 + 0.8 * rnd()]); }
      const beltLab = label('소행성대', [rOf(2.7) * 0.7, 0.4, -rOf(2.7) * 0.7], { size: 12, color: 'rgba(80,70,50,.88)' });
      const _bm = new THREE.Matrix4(), BPOS = new Float32Array(NA * 3);

      /* 왜소행성 (세레스 · 명왕성 · 에리스) */
      const DW = [{ id: 'ceres', n: '세레스', a: 2.77, r: 0.1, e: 0.08, P: 4.6, c: 0xb8aea0, ph: 2 }, { id: 'pluto', n: '명왕성', a: 39.5, r: 0.16, e: 0.25, P: 248, c: 0xd8b99a, ph: 4, tilt: 0.3 }, { id: 'eris', n: '에리스', a: 68, r: 0.17, e: 0.44, P: 558, c: 0xe9e4da, ph: 1, tilt: 0.7 }];
      DW.forEach((d) => { const R = rOf(d.a); d.R = R;
        const sx = R, sz = R * (1 - d.e * 0.3); const l = orbitLine(sx, sz, 0xc9a7ff, 0.42, d.tilt); l.position.x = -R * d.e * 0.5; root.add(l); d.l = l;
        d.m = new THREE.Mesh(new THREE.SphereGeometry(d.r, 24, 18), mat(d.c, { roughness: 0.9 })); root.add(d.m); d.lab = label(d.n, d.m, { size: 11, offset: [0, 0.55, 0], color: 'rgba(90,50,150,.9)' }); });

      /* 혜성: 길쭉한 궤도 + 태양 반대쪽 꼬리 */
      const CA = 9.5, CE = 0.86, CB = CA * Math.sqrt(1 - CE * CE), CC = CA * CE;
      const cometOrbit = (() => { const pts = []; for (let i = 0; i <= 160; i++) { const a = i / 160 * 6.2832; pts.push(new V3(CA * Math.cos(a) - CC, 0, CB * Math.sin(a))); } const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), orbitMat(0x7fe0ff, 0.5)); l.rotation.y = 0.7; l.rotation.x = 0.12; return l; })();
      root.add(cometOrbit);
      const comet = new THREE.Group(); const nucleus = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), mat(0xdfe6ee, { roughness: 0.9 })); comet.add(nucleus);
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
      function text() {
        const L = ctx.lesson(), c = shown && L && L.cardInfo ? L.cardInfo(shown) : null;
        if (c) { info('<b>' + c.name + '</b> — ' + c.badge + '<br>' + c.lines.join(' ')); return; }
        const t = { all: '가운데 <b>태양</b> 둘레를 <b>행성</b> 8개와 소행성·혜성 같은 작은 천체들이 돌아요.<br>바깥쪽 보라색 궤도에는 <b>왜소행성</b>이 있어요. 천체를 누르면 천체 카드가 열려요.', planet: '<b>행성</b> 8개는 태양 둘레를 거의 같은 평면에서 같은 방향으로 돌아요.<br><b>위성</b>은 행성 둘레를 돌아요: 지구의 달, 목성의 이오·유로파·가니메데·칼리스토.', small: '<b>소행성</b>(베스타·아포피스 등)은 화성~목성 사이에 많이 모여 있어요. <b>왜소행성</b>은 행성보다 작고 공전 궤도 근처를 정리하지 못했어요.<br><b>혜성</b>은 태양에 가까워지면 꼬리가 생기고, 꼬리는 항상 <b>태양의 반대쪽</b>을 향해요.' }[st.focus];
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

      /* 천체 누르기: 화면에서 가장 가까운 천체의 카드를 열어요 (지도에서 누른 것과 같아요) */
      { const dom = renderer.domElement, viewEl = dom.parentElement, q = new V3(); let down = null;
        const near = (pos, R, ex, ey) => { q.copy(pos).project(camera); if (q.z > 1) return 1e9; return Math.hypot((q.x + 1) / 2 * R.width - ex, (1 - q.y) / 2 * R.height - ey); };
        viewEl.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
        viewEl.addEventListener('pointerup', (e) => {
          if (!down) return; const mv = Math.hypot(e.clientX - down.x, e.clientY - down.y); down = null; if (mv > 6) return;
          const L = ctx.lesson(); if (!L || !L.tapBody3D) return;
          const R = dom.getBoundingClientRect(), ex = e.clientX - R.left, ey = e.clientY - R.top;
          let best = null, bd = 26;
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
      const PLANET_ID = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
      /* 2D의 '안쪽 태양계 · 전체 태양계' 단추를 따라 가깝게 · 멀리 보기 */
      let lastView = null, distTo = null;

      return {
        update(dt, t) {
          const T = pl.p * D;
          planets.forEach((p) => { const a = p.ph - T * p.w; p.m.position.set(Math.cos(a) * p.R, 0, Math.sin(a) * p.R); p.m.rotation.y += dt * 0.6; });
          DW.forEach((d) => { const a = d.ph - T * d.w; const sx = d.R, sz = d.R * (1 - d.e * 0.3); const v = new V3(Math.cos(a) * sx - d.R * d.e * 0.5, 0, Math.sin(a) * sz); if (d.l.rotation.x) v.applyAxisAngle(new V3(1, 0, 0), d.l.rotation.x); d.m.position.copy(v); });
          MOONS.forEach((m) => { const a = m.ph - T * m.w, hp = m.hostP.m.position; m.m.position.set(hp.x + Math.cos(a) * m.d, hp.y + Math.sin(a * 0.5) * 0.04, hp.z + Math.sin(a) * m.d); });
          for (let i = 0; i < NA; i++) { const b = BP[i], a = b[1] - T * BW[i]; _bm.makeScale(b[3], b[3], b[3]); _bm.setPosition(Math.cos(a) * b[0], b[2], Math.sin(a) * b[0]); belt.setMatrixAt(i, _bm); BPOS[i * 3] = Math.cos(a) * b[0]; BPOS[i * 3 + 1] = b[2]; BPOS[i * 3 + 2] = Math.sin(a) * b[0]; }
          belt.instanceMatrix.needsUpdate = true;
          const M = (1.2 + T * cW) % 6.2832; placeComet(M);
          glow.scale.setScalar(8 + 0.3 * Math.sin(t * 2));
          const S = (ctx.lesson() || {}).S;
          if (S) {
            const c = S.card || null; if (c !== shown) { shown = c; text(); }
            if (S.view !== lastView) { if (S.view === 'inner' || S.view === 'full') distTo = S.view === 'inner' ? 13 : 26; lastView = S.view; }
          }
          if (distTo != null) { orbit.dist += (distTo - orbit.dist) * Math.min(1, dt * 4); if (Math.abs(distTo - orbit.dist) < 0.05) distTo = null; }
        },
        sync() {},
      };
    },
  });
})();
