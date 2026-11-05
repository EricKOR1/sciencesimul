/* m1-gas-pressure · 3D 용기 속 기체 입자 (입자의 충돌 → 기체의 압력)
   기체 입자는 모든 방향으로 쉬지 않고 움직이며 벽에 부딪혀요. 부딪히는 횟수가 많을수록(입자 수↑, 온도↑, 부피↓) 압력이 커요.
   상대 압력 = (입자 수 × √절대온도) ÷ 부피 (처음 상태를 1로 한 값). 풍선 모양에서는 압력이 커지면 풍선이 부풀어요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN0 = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  window.SciSim3D.attach({
    title: '기체 입자와 압력 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    levels: [0, 1, 2, 3],
    camera: { dist: 10.5 * (PHN0 ? 1.05 : 1), theta: 0.6, phi: 1.1, fov: 45, target: [1.7, 0.1, 0], min: 6, max: 30 },
    autoRotate: 0.15,
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
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

      const NMAX = 120, PR = 0.15, A = 1.8;           // 상자 한 변의 절반
      const st = { n: 40, T: 20, mode: 'box', hits: 0, rate: 0, tm: 0, pr: 1, mark: true, sc: 'box' };
      const V0 = Math.pow(2 * A, 3);
      const speedOf = (T) => 2.4 * Math.sqrt((T + 273) / 293);
      const balR = () => 0.9 + 1.3 * Math.sqrt(Math.max(0, Math.min(1, (st.n - 10) / 80)));
      const volume = () => st.mode === 'box' ? V0 : 4 / 3 * Math.PI * Math.pow(balR(), 3);

      /* 용기: 상자(유리) / 풍선(고무막) */
      const box = new THREE.Group();
      const bm = new THREE.Mesh(new THREE.BoxGeometry(2 * A, 2 * A, 2 * A), glass(0xbfe0ff, 0.12));
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(2 * A, 2 * A, 2 * A)), new THREE.LineBasicMaterial({ color: 0x9cc3ff }));
      box.add(bm, edges); root.add(box);
      const bal = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), mat(0xff7a8a, { transparent: true, opacity: 0.3, roughness: 0.25, depthWrite: false, side: THREE.DoubleSide }));
      const knot = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.4, 16), mat(0xff7a8a, { roughness: 0.4 })); root.add(bal, knot);
      const stand = new THREE.Mesh(new THREE.CylinderGeometry(A + 0.4, A + 0.5, 0.2, 40), mat(0x64748b, { metalness: 0.4, roughness: 0.4 })); stand.position.y = -A - 0.5; root.add(stand);
      const woodTex = canvasTex(512, 512, (c, w, h) => { c.fillStyle = '#8a5a34'; c.fillRect(0, 0, w, h); for (let i = 0; i < 90; i++) { c.strokeStyle = 'rgba(' + (60 + (i * 37) % 50) + ',30,10,' + (0.12 + (i % 5) * 0.04) + ')'; c.lineWidth = 1 + (i % 3); c.beginPath(); const y = (i / 90) * h; c.moveTo(0, y); for (let x = 0; x <= w; x += 64) c.lineTo(x, y + Math.sin(x * 0.03 + i) * 3); c.stroke(); } for (let i = 1; i < 4; i++) { c.fillStyle = 'rgba(40,20,5,.5)'; c.fillRect(0, i * h / 4 - 1, w, 2); } });
      woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping; woodTex.repeat.set(3, 3);
      const bench = new THREE.Mesh(new THREE.CylinderGeometry(7.5, 7.5, 0.3, 64), mat(0xffffff, { map: woodTex, roughness: 0.7 })); bench.receiveShadow = true; root.add(bench);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(A + 0.45, 0.07, 10, 48), mat(0xcbd5e1, { metalness: 0.7, roughness: 0.25 })); rim.rotation.x = Math.PI / 2; root.add(rim);
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) { const cp = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), mat(0xcbd5e1, { metalness: 0.7, roughness: 0.3 })); cp.position.set(sx * A, sy * A, sz * A); box.add(cp); }

      const ps = spheres(NMAX, PR, 0x3d6df2, 12);
      const P = [];
      for (let i = 0; i < NMAX; i++) { const b = rnd() * 6.283, c = rnd() * 2 - 1, u = Math.sqrt(1 - c * c);
        P.push({ x: (rnd() * 2 - 1) * (A - PR), y: (rnd() * 2 - 1) * (A - PR), z: (rnd() * 2 - 1) * (A - PR), vx: Math.cos(b) * u, vy: c, vz: Math.sin(b) * u, k: 0.7 + 0.6 * rnd(), hot: 0 }); }

      /* 압력계 */
      const GX = 5.1, GY = -0.3;
      const gauge = makeDial(1.15, 4, '기압', 0.2, 1); gauge.position.set(GX, GY, 0); root.add(gauge);
      const gst = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 0.9, 20), mat(0x8b95a7, { metalness: 0.5 })); gst.position.set(GX, GY - 1.45, 0); root.add(gst);
      const gaugeLab = { visible: true }; const gaugeLabel = label('압력 (기압)', [GX, GY + 1.55, 0], { size: 12.5 }); const gstEl = gst;

      function applyMode() {
        const isBox = st.mode === 'box';
        box.visible = isBox; rim.visible = isBox; bal.visible = knot.visible = !isBox; stand.position.y = (isBox ? -A : -balR()) - 0.35; bench.position.y = stand.position.y - 0.25;
        for (let i = 0; i < NMAX; i++) { const p = P[i]; if (!isBox) { const r = balR() - PR, d = Math.hypot(p.x, p.y, p.z); if (d > r) { p.x *= r / d * 0.95; p.y *= r / d * 0.95; p.z *= r / d * 0.95; } } }
      }
      let lastTxt = '';
      function text() {
        const n = st.n, sc = st.sc;
        let h;
        if (sc === 'block') h = '<b>기체의 압력</b>은 입자가 벽에 부딪혀 생겨요. (벽돌과 눈 · 압력의 뜻은 2D 화면에서 알아봐요)';
        else if (sc === 'box') h = '기체 입자는 <b>모든 방향</b>으로 끊임없이 움직여요. 입자 사이는 <b>빈 공간</b>이에요. 주황색 입자 하나를 따라가 보세요.';
        else if (sc === 'balloon') h = '입자 <b>' + n + '개</b>가 풍선 안쪽 벽에 <b>모든 방향</b>으로 충돌해서 풍선이 <b>둥글게</b> 부풀어요.<br>공기를 넣을수록 입자 수가 많아져 충돌 횟수(초당 약 ' + Math.round(st.rate) + '번)가 늘고 풍선이 커져요.';
        else h = '입자 <b>' + n + '개</b> · 벽에 <b>초당 약 ' + Math.round(st.rate) + '번</b> 부딪혀요 · 압력 <b>' + st.pr.toFixed(2) + ' 기압</b><br>기체의 압력은 입자가 벽에 <b>충돌</b>하여 생기고 <b>모든 방향</b>으로 작용해요. 충돌 횟수가 많을수록 압력이 커요.<br>공기를 넣는 것은 옆의 2D 조작판(🫧 공기 넣기)에서 해요.';
        if (h !== lastTxt) { lastTxt = h; info(h); }
      }
      function calcP() { st.pr = st.n / 40; }

      /* ▶ 재생: 공기를 넣어 입자 수가 늘면 충돌이 늘고 압력이 커져요 (40 → 100개 → 처음으로) */
      let pmode = false, built = false, pP = 0, sig = '';
      const pl = controls.player({
        duration: 10, loop: true, autoplay: false, label: '재생', phases: [[0, '']],
        onFrame(p) { if (!built) return; pmode = true; pP = p; },
      });
      built = true;
      const sm = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
      const markB = controls.button('💥 충돌 표시', () => { st.mark = !st.mark; markB.classList.toggle('on', st.mark); }); markB.classList.add('on');
      applyMode(); calcP(); gauge.userData.set(st.pr); text();
      const wallLab = label('', [0, A + 0.5, 0], { size: 12, color: 'rgba(61,109,242,.9)' }); wallLab.set('입자가 벽에 부딪혀요');

      /* ===== 장면 block · 벽돌과 눈: 같은 벽돌(같은 무게)을 넓은 면 / 좁은 면으로 눈 위에 놓아요 (2D 1 px = 0.01 그림 단위) ===== */
      const gB = new THREE.Group(); gB.visible = false; root.add(gB);
      gB.position.x = 1.7; gB.scale.setScalar(PHN0 ? 0.66 : 1.3);
      const SNX = 7.2, SNZ = 2.8, SGX = 144, SGZ = 28;
      { const sb = new THREE.Mesh(new THREE.BoxGeometry(SNX, 0.6, SNZ), [mat(0x7d90a8), mat(0x7d90a8), new THREE.MeshBasicMaterial({ visible: false }), mat(0x6c7f97), mat(0x7d90a8), mat(0x7d90a8)]); sb.position.y = -0.3; gB.add(sb);
        const gr = new THREE.Mesh(new THREE.BoxGeometry(SNX + 2.4, 0.2, SNZ + 2.4), mat(0x3a2e24, { roughness: 0.95 })); gr.position.y = -0.7; gB.add(gr);
        const gd = new THREE.Mesh(new THREE.CircleGeometry(16, 48), mat(0x1c2533, { roughness: 1 })); gd.rotation.x = -Math.PI / 2; gd.position.y = -0.82; gB.add(gd);
        for (let i = 0; i < 9; i++) { const tr = new THREE.Group(); for (let j = 0; j < 3; j++) { const co = new THREE.Mesh(new THREE.ConeGeometry(1.1 - j * 0.28, 1.5, 12), mat(j ? 0x1d4a33 : 0x153a28, { roughness: 0.9 })); co.position.y = 0.9 + j * 0.8; const sn = new THREE.Mesh(new THREE.ConeGeometry(0.7 - j * 0.2, 0.5, 12), mat(0x9fb2c9, { roughness: 0.9 })); sn.position.y = 1.35 + j * 0.8; tr.add(co, sn); } tr.position.set(-9 + i * 2.4 + (i % 2) * 0.8, -0.8, -9 - (i % 3) * 1.6); tr.scale.setScalar(0.8 + (i % 3) * 0.2); gB.add(tr); } }
      const snowGeo = new THREE.PlaneGeometry(SNX, SNZ, SGX, SGZ); snowGeo.rotateX(-Math.PI / 2);
      const snowMesh = new THREE.Mesh(snowGeo, mat(0x8196b0, { roughness: 0.95 })); snowMesh.receiveShadow = true; gB.add(snowMesh);
      const BR = { wide: [2.16, 0.72, 0.72], narrow: [0.72, 2.16, 0.72] };
      const brickTex = canvasTex(128, 64, (c, w, h) => { c.fillStyle = '#b4533c'; c.fillRect(0, 0, w, h); for (let i = 0; i < 160; i++) { c.fillStyle = Math.random() < 0.5 ? 'rgba(90,25,10,.25)' : 'rgba(255,190,150,.2)'; c.fillRect(Math.random() * w, Math.random() * h, 3, 2); } c.strokeStyle = 'rgba(255,220,200,.35)'; c.lineWidth = 3; c.strokeRect(2, 2, w - 4, h - 4); });
      const brick = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat(0xffffff, { map: brickTex, roughness: 0.8 })); brick.castShadow = true; gB.add(brick);
      const parr = [0, 1, 2, 3].map(() => { const a = mkArrow(0xf26b3a, 0.05); a.children.forEach((c) => { c.material.depthTest = false; c.renderOrder = 8; }); gB.add(a); return a; });
      const wtArr = mkArrow(0x64748b, 0.07); gB.add(wtArr);
      const bLab = label('', [0, 0, 0], { size: 12.5, color: 'rgba(30,64,175,.92)' }), bLab2 = label('', [0, 0, 0], { size: 12, color: 'rgba(200,80,20,.95)' });
      let snowKey = '';
      function carveSnow(list) {
        const key = list.map((d) => [d.x, d.w, d.depth].map((v) => Math.round(v * 100)).join(':')).join('|');
        if (key === snowKey) return; snowKey = key;
        const P = snowGeo.attributes.position.array, e = 0.05, ez = 0.07, hz = 0.36;
        for (let i = 0; i < P.length; i += 3) {
          const x = P[i], z = P[i + 2]; let dep = 0;
          for (const d of list) {
            const out = Math.max(0, Math.abs(x - d.x) - d.w / 2), oz = Math.max(0, Math.abs(z) - hz);
            const f = Math.max(0, 1 - out / e) * Math.max(0, 1 - oz / ez); dep = Math.max(dep, d.depth * f);
          }
          P[i + 1] = -dep;
        }
        snowGeo.attributes.position.needsUpdate = true; snowGeo.computeVertexNormals();
      }
      const BR0 = { wide: { w: 216 }, narrow: { w: 72 } }, DEP = { wide: 10, narrow: 30 };
      function updBlock(dt, t, S) {
        box.visible = bal.visible = knot.visible = stand.visible = rim.visible = bench.visible = false; ps.visible = false; gauge.visible = gst.visible = false; gaugeLabel.show(false); wallLab.show(false); markB.style.display = 'none';
        if (!gB.visible) { orbit.phi = 1.32; orbit.theta = 0.25; }
        gB.visible = true;
        let orient = 'wide', bx = 400, base = 1.3, dents = [], sink = 0, touching = false, ph = '';
        if (pmode) {
          const p = pP;
          const seg = p < 0.5 ? 0 : 1, q = seg === 0 ? p / 0.5 : (p - 0.5) / 0.5;
          orient = seg === 0 ? 'wide' : 'narrow'; bx = seg === 0 ? 300 : 500;
          const drop = Math.min(1, q / 0.3), push = Math.max(0, Math.min(1, (q - 0.3) / 0.35)), up = Math.max(0, (q - 0.9) / 0.1);
          sink = DEP[orient] * push; touching = q >= 0.3 && q < 0.92;
          base = (1 - drop) * 1.3 - sink * 0.02 + (q >= 0.92 ? up * 0.4 : 0);
          if (seg === 1) dents.push({ x: -1.0, w: 2.16, depth: DEP.wide * 0.02 });
          dents.push({ x: (bx - 400) * 0.01, w: BR0[orient].w * 0.01, depth: (q < 0.3 ? 0 : q < 0.92 ? sink : DEP[orient]) * 0.02 });
          ph = p < 0.5 ? '넓은 면으로 놓아요 · 눈이 조금 눌려요' : '좁은 면으로 놓아요 · 눈이 더 깊이 눌려요';
        } else if (S) {
          orient = S.orient; bx = S.bx; sink = S.sink; touching = S.bstate === 'sink' || S.bstate === 'rest';
          base = touching ? -S.sink * 0.02 : (372 - S.by) * 0.01;
          Object.keys(S.dents || {}).forEach((k) => { const d = S.dents[k]; dents.push({ x: (d.x - 400) * 0.01, w: d.w * 0.01, depth: d.depth * 0.02 }); });
          if (S.bstate === 'sink') dents.push({ x: (S.bx - 400) * 0.01, w: BR0[orient].w * 0.01, depth: S.sink * 0.02 });
        }
        const ph2 = document.querySelector('.v3-player .v3-ph'); if (ph2) ph2.textContent = pmode ? ph : '';
        carveSnow(dents);
        const d = BR[orient], cx = (bx - 400) * 0.01;
        brick.scale.set(d[0], d[1], d[2]); brick.position.set(cx, base + d[1] / 2, 0);
        const L = 0.3 + sink * 0.03;
        parr.forEach((a, i) => {
          const n = orient === 'wide' ? 4 : 1; if (!touching || i >= n) { a.visible = false; return; }
          const ax = orient === 'wide' ? cx - d[0] / 2 + d[0] * (i + 0.5) / 4 : cx;
          setArrow(a, new V3(ax, base + L * 0.8, 0), new V3(ax, base - 0.02 - sink * 0.0, 0)); a.userData.sh.scale.y = Math.max(0.01, a.userData.sh.scale.y);
        });
        setArrow(wtArr, new V3(cx + d[0] / 2 + 0.35, base + d[1] / 2 + 0.5, 0), new V3(cx + d[0] / 2 + 0.35, base + d[1] / 2 - 0.2, 0));
        const sc2 = gB.scale.x;
        bLab.obj = [(cx + 1.7 / sc2 * 0) * sc2 + 1.7, (base + d[1] + 0.35) * sc2, 0]; bLab.off = [0, 0.1, 0];
        bLab.set(S && S.bstate === 'held' && !pmode ? '벽돌을 눈 위에 놓아요' : (orient === 'wide' ? '넓은 면 (면적 3)' : '좁은 면 (면적 1)')); bLab.show(true);
        bLab2.obj = [(cx + d[0] / 2 + 0.35) * sc2 + 1.7, (base + d[1] / 2 + 0.5) * sc2, 0]; bLab2.off = [0.6, 0, 0]; bLab2.set('무게(누르는 힘) 같아요'); bLab2.show(true);
        const cm = Math.round(sink / 5);
        const tried = S && S.tried ? S.tried : { wide: false, narrow: false };
        setInfo2((pmode ? '<b>▶ ' + ph + '</b><br>' : '') + '<b>압력</b>은 일정한 면적에 수직으로 작용하는 힘이에요. 같은 벽돌(같은 무게)도 <b>면적이 좁을수록</b> 압력이 커서 눈이 더 깊이 눌려요.' + (touching ? '<br>' + (orient === 'wide' ? '넓은 면' : '좁은 면') + ' · 눌린 깊이 약 <b>' + cm + ' cm</b>' : '') + (!pmode && S && !touching ? '<br>옆의 2D 화면에서 벽돌을 끌어 눈 위에 놓아 보세요. 또는 ▶ 재생을 눌러 보세요.' : ''));
      }
      let lastTxt2 = ''; const setInfo2 = (h) => { if (h !== lastTxt2) { lastTxt2 = h; info(h); } };
      let smoothR = balR();
      return {
        update(dt, t) {
          const l = ctx.lesson && ctx.lesson(), S = l && l.S, sc = S ? S.scene : 'membrane';
          const key = [sc, l ? l.n : 0].join();
          if (key !== sig) { sig = key; if (pmode) { pmode = false; pl.pause(); } }
          if (sc === 'block') { updBlock(dt, t, S); return; }
          if (gB.visible) { orbit.phi = 1.1; orbit.theta = 0.6; gB.visible = false; ps.visible = true; bench.visible = true; stand.visible = true; markB.style.display = ''; bLab.show(false); bLab2.show(false); wtArr.visible = false; lastTxt = ''; }
          const ph = document.querySelector('.v3-player .v3-ph');
          let nn;
          if (pmode) { const q = pP < 0.7 ? sm(pP / 0.7) : 1 - sm((pP - 0.85) / 0.15); nn = Math.round(40 + 60 * q); if (ph) ph.textContent = pP < 0.7 ? '공기를 넣어요' : pP < 0.85 ? '압력이 커졌어요' : '처음으로'; }
          else { nn = l ? Math.min(NMAX, l.n) : 40; if (ph) ph.textContent = ''; }
          const mode0 = (pmode ? (sc === 'balloon' ? 'bal' : 'box') : (sc === 'balloon' ? 'bal' : 'box'));
          st.sc = pmode && sc !== 'balloon' ? 'membrane' : sc; st.n = nn;
          if (mode0 !== st.mode) { st.mode = mode0; }
          applyMode();
          gauge.visible = gstEl.visible = gaugeLab.visible = (st.sc === 'membrane' || st.sc === 'balloon');
          const isBox = st.mode === 'box', sp = speedOf(st.T), h = Math.min(dt, 0.05) / 2, n = st.n;
          smoothR += (balR() - smoothR) * Math.min(1, dt * 4);
          const rr = smoothR - PR;
          for (let k = 0; k < 2; k++) for (let i = 0; i < n; i++) {
            const p = P[i], s = sp * p.k * h; p.x += p.vx * s; p.y += p.vy * s; p.z += p.vz * s;
            if (isBox) {
              const L = A - PR;
              if (p.x > L) { p.x = 2 * L - p.x; p.vx = -Math.abs(p.vx); p.hot = 0.25; st.hits++; } else if (p.x < -L) { p.x = -2 * L - p.x; p.vx = Math.abs(p.vx); p.hot = 0.25; st.hits++; }
              if (p.y > L) { p.y = 2 * L - p.y; p.vy = -Math.abs(p.vy); p.hot = 0.25; st.hits++; } else if (p.y < -L) { p.y = -2 * L - p.y; p.vy = Math.abs(p.vy); p.hot = 0.25; st.hits++; }
              if (p.z > L) { p.z = 2 * L - p.z; p.vz = -Math.abs(p.vz); p.hot = 0.25; st.hits++; } else if (p.z < -L) { p.z = -2 * L - p.z; p.vz = Math.abs(p.vz); p.hot = 0.25; st.hits++; }
            } else {
              const d = Math.hypot(p.x, p.y, p.z);
              if (d > rr) { const nx = p.x / d, ny = p.y / d, nz = p.z / d, dot = p.vx * nx + p.vy * ny + p.vz * nz; p.vx -= 2 * dot * nx; p.vy -= 2 * dot * ny; p.vz -= 2 * dot * nz; const f = (2 * rr - d) / d; p.x *= f; p.y *= f; p.z *= f; p.hot = 0.25; st.hits++; }
            }
          }
          for (let i = 0; i < NMAX; i++) {
            if (i >= n) { put(ps, i, 0, -50, 0, 0.001); continue; }
            const p = P[i]; p.hot = Math.max(0, p.hot - dt); put(ps, i, p.x, p.y, p.z, (i === 0 && st.sc === 'box' ? 1.6 : 1) + p.hot * 1.2); tint(ps, i, i === 0 && st.sc === 'box' ? 0xff8a1f : st.mark && p.hot > 0 ? 0xffb020 : 0x3d6df2);
          }
          flush(ps);
          if (!isBox) { bal.scale.setScalar(smoothR + 0.04 + 0.03 * Math.sin(t * 6)); knot.position.set(0, -smoothR - 0.12, 0); knot.rotation.x = Math.PI; stand.position.y = -smoothR - 0.65; bench.position.y = stand.position.y - 0.25; }
          st.tm += dt; if (st.tm >= 0.6) { st.rate = st.rate * 0.4 + 0.6 * (st.hits / st.tm); st.hits = 0; st.tm = 0; calcP(); text(); }
          gauge.userData.set(pmode ? st.pr : (S ? S.needle : st.pr));
          gaugeLabel.show(gauge.visible);
          gauge.rotation.y = orbit.theta * 0.6;
        },
        sync() {},
      };
    },
  });
})();
