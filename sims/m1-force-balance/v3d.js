/* m1-force-balance · 3D 얼음판 위 상자: 나란한 두 힘의 합력과 힘의 평형
   2D '얼음판' 장면과 같아요(힘 F₁·F₂ N, 오른쪽 고리의 작용점 위/가운데/아래, 핀). 힘은 2D 조작판에서 정하고, ▶ 재생은 네 가지 장면을 차례로 보여 줘요.
   같은 방향은 합력 = 두 힘의 합, 반대 방향은 큰 힘 − 작은 힘. 크기가 같고 방향이 반대이며 같은 작용선이면 평형이에요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN0 = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  window.SciSim3D.attach({
    title: '합력과 힘의 평형 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    levels: [0, 1, 2, 3],
    camera: { dist: 10.5 * (PHN0 ? 1.12 : 1), theta: 0.25, phi: 0.95, fov: 45, target: [0, -0.2, 0], min: 6, max: 28 },
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
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

      /* 2D '얼음판' 장면과 같은 구성(위에서 본 얼음판 위의 상자, 왼쪽 고리 · 오른쪽 고리 + 작용점 위/가운데/아래, 핀).
         힘 F(+ 오른쪽 / − 왼쪽, N)과 작용점은 2D의 값을 그대로 읽어 와요. 조작은 옆의 2D 조작판에서 해요. */
      const PX = 44.4, SLOTS = [-26 / 44.4, 0, 26 / 44.4], HOOK = 48 / 44.4, KN = 0.4, LIM = 3.4;
      const bStart = root.children.length;
      const ice = new THREE.Mesh(new THREE.BoxGeometry(2 * LIM + 3.4, 0.2, 4.6), mat(0xcfe8ff, { roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.92 })); ice.position.y = -0.7; root.add(ice);
      for (let i = -3; i <= 3; i++) { const tk = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 4.6), mat(0xb6d4ef)); tk.position.set(i * 1.1, -0.59, 0); root.add(tk); }
      const cart = new THREE.Group(); root.add(cart);
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.9, 1.8), mat(0xf59e0b, { roughness: 0.45 })); cart.add(body);
      const hk1 = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), mat(0xcbd5e1, { metalness: 0.8 })); hk1.position.set(-HOOK, 0, 0); cart.add(hk1);
      const hk2 = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), mat(0xcbd5e1, { metalness: 0.8 })); cart.add(hk2);
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.6, 12), mat(0xef4444)); pin.position.set(0, 0.7, 0); cart.add(pin);
      const a1 = mkArrow(0x2f6df6, 0.07), a2 = mkArrow(0xe5484d, 0.07), an = mkArrow(0x16a34a, 0.09); root.add(a1, a2, an);
      const l1 = label('', a1, { size: 12.5, color: 'rgba(40,90,230,.92)' }), l2 = label('', a2, { size: 12.5, color: 'rgba(200,40,50,.92)' }), ln = label('', an, { size: 12.5, color: 'rgba(20,130,60,.92)' });
      const mkLine = (c, o) => new THREE.Line(new THREE.BufferGeometry().setFromPoints([new V3(-5.5, 0, 0), new V3(5.5, 0, 0)]), new THREE.LineDashedMaterial({ color: c, dashSize: 0.18, gapSize: 0.12, transparent: true, opacity: o }));
      const line = mkLine(0xffffff, 0.7), line2 = mkLine(0xff8a8a, 0.9); line.computeLineDistances(); line2.computeLineDistances(); root.add(line, line2);
      const lnLab = label('작용선', [5.0, -0.5, 0], { size: 11, offset: [0, 0.3, 0] });
      const bObjs = root.children.slice(bStart);
      const phEl = () => document.querySelector('.v3-player .v3-ph');

      /* ===== 장면 A · 옆에서 본 「힘 실험대」: 찰흙 · 수레 · 멈춤대 (2D 1 px = 0.01 그림 단위) ===== */
      const gA = new THREE.Group(); gA.visible = false; root.add(gA);
      const gT = new THREE.Group(); gT.visible = false; root.add(gT);
      gA.scale.setScalar(PHN0 ? 0.72 : 1); gT.scale.setScalar(PHN0 ? 0.58 : 0.68);
      gA.position.y = -0.2;
      const WP = 800, UNIT = 0.01, KA3 = 0.34;   // 힘 1 N당 화살표 길이 0.34
      const xray = (g) => g.children.forEach((c) => { c.material.depthTest = false; c.renderOrder = 8; });
      { const top = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.18, 2.4), mat(0xe0a96d, { roughness: 0.7 })); top.position.set(0, -0.09, 0); top.receiveShadow = true; gA.add(top);
        [-3.4, 3.4].forEach((x) => [0.9, -0.9].forEach((z) => { const lg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.3, 0.2), mat(0xa86a35)); lg.position.set(x, -0.83, z); gA.add(lg); })); }
      const stopA = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.5, 1.0), mat(0xdc2626, { roughness: 0.5 })); m.castShadow = true; gA.add(m); return m; });
      const claySeg = 44, clayRing = 10, clayGeo = new THREE.BufferGeometry();
      { const pos = new Float32Array((claySeg + 1) * (clayRing + 1) * 3), idx = [];
        for (let i = 0; i < claySeg; i++) for (let j = 0; j < clayRing; j++) { const a = i * (clayRing + 1) + j, b = a + 1, c = a + clayRing + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
        clayGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); clayGeo.setIndex(idx); }
      const clayMesh = new THREE.Mesh(clayGeo, mat(0xfdb88a, { roughness: 0.75, side: THREE.DoubleSide })); clayMesh.frustumCulled = false; clayMesh.castShadow = true; gA.add(clayMesh);
      let CTY = 382;
      function setClay(pts) {
        const P = clayGeo.attributes.position.array, n = claySeg;
        for (let i = 0; i <= n; i++) {
          const px = pts[Math.min(i, pts.length - 1)], x = (px.x - WP / 2) * UNIT, h = Math.max(0, (CTY - px.y) * UNIT), dz = 0.62 * Math.sqrt(Math.sin(Math.PI * i / n));
          for (let j = 0; j <= clayRing; j++) { const a = Math.PI * j / clayRing, o = (i * (clayRing + 1) + j) * 3; P[o] = x; P[o + 1] = h * Math.sin(a); P[o + 2] = dz * Math.cos(a); }
        }
        clayGeo.attributes.position.needsUpdate = true; clayGeo.computeVertexNormals();
      }
      const cartA = new THREE.Group(); gA.add(cartA);
      { const b = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.4, 0.8), mat(0x2563eb, { roughness: 0.4 })); b.position.y = 0.36; b.castShadow = true; cartA.add(b);
        const st = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.07, 0.82), mat(0xfacc15)); st.position.y = 0.57; cartA.add(st); }
      const wheelsA = [];
      [[-0.47, 0.43], [0.47, 0.43], [-0.47, -0.43], [0.47, -0.43]].forEach(([x, z]) => { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.1, 20), mat(0x1e293b, { roughness: 0.6 })); w.rotation.x = Math.PI / 2; w.add(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.12), mat(0xcbd5e1))); const g = new THREE.Group(); g.position.set(x, 0.15, z); g.add(w); cartA.add(g); wheelsA.push(g); });
      { const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.18, 8), mat(0x64748b)); rod.rotation.z = Math.PI / 2; rod.position.set(0.68, 0.4, 0); cartA.add(rod);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.025, 8, 18), mat(0x22c55e)); ring.position.set(0.8, 0.4, 0); cartA.add(ring); }
      const arA = mkArrow(0xf97316, 0.06); gA.add(arA); arA.visible = false; xray(arA);
      const arLab = label('', [0, 0, 0], { size: 12.5, color: 'rgba(200,90,10,.95)' });
      const labClay = label('찰흙', [0, 1, 0], { size: 11.5 }), labCart = label('수레', [0, 1, 0], { size: 11.5 });
      const cartHook = (x) => ({ hx: x + 59 + 12, hy: 382 - 15 - 1 - 40 + 23 });
      const CLAY0 = (() => { const a = [], n = claySeg; for (let i = 0; i <= n; i++) { const t = Math.PI * i / n, c = Math.cos(t), s = Math.sin(t); a.push({ x: 132 + 58 * (c >= 0 ? 1 : -1) * Math.pow(Math.abs(c), 0.8), y: 382 - 62 * Math.pow(s, 0.85) }); } a[0].y = 382; a[n].y = 382; return a; })();
      function dentClay(d) {
        const out = CLAY0.map((p) => ({ x: p.x, y: p.y }));
        out.forEach((p) => { const w = Math.exp(-((p.x - 132) * (p.x - 132) + (p.y - 330) * (p.y - 330)) / (2 * 32 * 32)); p.y = Math.min(382, p.y + 40 * d * w); p.x += (p.x - 132) * 0.16 * d * (1 - w); });
        out[0].y = 382; out[claySeg].y = 382; return out;
      }
      function updA(dt, l) {
        const A = l && l.A; CTY = l ? l.TY : 382;
        const AXs = l ? l.AX : { stop: 256, cush: 758, home: 507 };
        stopA[0].position.set((AXs.stop - WP / 2) * UNIT, 0.25, 0); stopA[1].position.set((AXs.cush - WP / 2) * UNIT + 0.11, 0.25, 0);
        const xMax = AXs.cush - 11 - 71;
        let pts, cx, wheel = 0, arr = null, sqL = 0, sqR = 0, ph = '';
        if (pmode) {
          const p = playP, home = AXs.home;
          pts = dentClay(p < 0.1 ? 0 : p < 0.3 ? (p - 0.1) / 0.2 : 1);
          cx = home;
          if (p >= 0.56 && p < 0.88) { const tau = (p - 0.56) * 14, v = 4 * 45, tb = (xMax - home) / v; cx = Math.min(xMax, home + v * tau); if (tau > tb) sqR = Math.max(0, 1 - (tau - tb) * 4); }
          else if (p >= 0.88) cx = xMax + (home - xMax) * Math.min(1, (p - 0.88) / 0.12);
          wheel = (cx - home) / 15;
          if (p >= 0.05 && p < 0.28) { const k = p < 0.1 ? (p - 0.05) / 0.05 : p > 0.22 ? Math.max(0, 1 - (p - 0.22) / 0.06) : 1; arr = { ox: 132, oy: 320, dx: 0, dy: 72 * k, F: 3, pose: 'push' }; }
          if (p >= 0.44 && p < 0.6) { const k = p < 0.48 ? (p - 0.44) / 0.04 : p > 0.56 ? Math.max(0, 1 - (p - 0.56) / 0.04) : 1; const g = cartHook(home); arr = { ox: g.hx, oy: g.hy, dx: 96 * k, dy: 0, F: 4, pose: 'pull' }; }
          ph = p < 0.4 ? '찰흙을 눌러요 · 모양이 변해요' : '수레를 당겨요 · 운동 상태가 변해요';
        } else {
          pts = A ? A.clay.pts : CLAY0; cx = A ? A.cart.x : 507; wheel = A ? A.cart.wheel : 0; sqL = A ? A.cush.L : 0; sqR = A ? A.cush.R : 0;
          const src = A && (A.drag || (A.drawMode ? A.drawn : null) || A.rel);
          if (A && src && A.arrow.shown) {
            const k = A.arrow.k; let ox = src.x; if (src === A.rel && src.obj === 'cart') ox = A.cart.x + src.offX;
            const F = src.F || (A.drawn && A.drawn.F) || 0;
            if (Math.hypot(A.arrow.dx, A.arrow.dy) > 2 && F) arr = { ox, oy: src.y, dx: A.arrow.dx * k, dy: A.arrow.dy * k, F, pose: src.pose };
          }
        }
        setClay(pts);
        cartA.position.x = (cx - WP / 2) * UNIT; wheelsA.forEach((w) => { w.rotation.z = -wheel; });
        stopA[0].scale.x = 1 - sqL * 0.3; stopA[1].scale.x = 1 - sqR * 0.3;
        if (arr) {
          const o = new V3((arr.ox - WP / 2) * UNIT, (CTY - arr.oy) * UNIT, 0), kk = KA3 / 24, v = new V3(arr.dx * kk, -arr.dy * kk, 0);
          setArrow(arA, o, o.clone().add(v)); arLab.obj = [(o.x + v.x * 0.5) * gA.scale.x, (o.y + v.y * 0.5 + 0.5) * gA.scale.x - 0.2, 0.3]; arLab.set((arr.pose === 'push' ? '미는 힘 ' : '당기는 힘 ') + arr.F + ' N'); arLab.show(true);
        } else { arA.visible = false; arLab.show(false); }
        labClay.obj = [(pts[Math.floor(claySeg / 2)].x - WP / 2) * UNIT * gA.scale.x, 1.1 * gA.scale.x - 0.2, 0]; labCart.obj = [cartA.position.x * gA.scale.x, 0.95 * gA.scale.x - 0.2, 0];
        const ph2 = phEl(); if (ph2) ph2.textContent = pmode ? ph : '';
        setInfo((pmode ? '<b>▶ ' + ph + '</b><br>' : '') + (arr ? '<b>' + (arr.pose === 'push' ? '미는 힘 ' : '당기는 힘 ') + arr.F + ' N</b>: 화살표의 <b>시작점</b>은 작용점, <b>방향</b>은 힘의 방향, <b>길이</b>는 힘의 크기예요.<br>' : '') + '<b>힘</b>은 물체의 <b>모양</b>이나 <b>운동 상태</b>를 변하게 하는 원인이에요. 단위는 <b>N</b>(뉴턴)이에요.' + (pmode || arr ? '' : '<br>옆의 2D 화면에서 찰흙이나 수레를 끌었다 놓으면 3D도 같이 움직여요. 또는 ▶ 재생을 눌러 보세요.'));
      }

      /* ===== 장면 T · 줄다리기(위에서 본 모습): 왼쪽 팀 3명(300 N) · 오른쪽 팀 1~5명(1명 = 100 N) ===== */
      const TS = 1 / 70, TRY = 0;         // 2D px → 그림 단위
      { const f = new THREE.Mesh(new THREE.BoxGeometry(12, 0.1, 4.6), mat(0x86c97a, { roughness: 0.9 })); f.position.y = -0.05; f.receiveShadow = true; gT.add(f);
        const c = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 4.6), mat(0xffffff)); c.position.y = 0.01; gT.add(c);
        [-1, 1].forEach((s) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 4.6), mat(0xe8f5e3)); m.position.set(s * 84 * TS, 0.012, 0); gT.add(m); }); }
      const ropeM = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 12), mat(0xb8864b, { roughness: 0.8 })); ropeM.rotation.z = Math.PI / 2; ropeM.position.y = 0.8; gT.add(ropeM);
      const flag = new THREE.Group(); { const f1 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.34, 0.14), mat(0xef4444)); f1.position.y = 0.8; flag.add(f1); const f2 = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.4, 3), mat(0xdc2626)); f2.rotation.x = Math.PI; f2.position.y = 0.5; flag.add(f2); } gT.add(flag);
      const KID = [];
      function mkKid(team, i) {
        const g = new THREE.Group(), col = team < 0 ? 0x2563eb : 0xe0a800, hair = [0x3b2a1e, 0x5b3a24, 0x1f2937, 0x7c4a2a, 0x2b2118][(i + (team > 0 ? 2 : 0)) % 5];
        const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.42, 4, 10), mat(col, { roughness: 0.55 })); body.position.y = 0.78; body.castShadow = true; g.add(body);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 10), mat(0xf1c39b, { roughness: 0.6 })); head.position.y = 1.26; head.castShadow = true; g.add(head);
        const hr = new THREE.Mesh(new THREE.SphereGeometry(0.155, 14, 10, 0, 6.283, 0, 1.9), mat(hair, { roughness: 0.8 })); hr.position.y = 1.28; hr.rotation.x = -0.25; g.add(hr);
        [-0.09, 0.09].forEach((z) => { const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 8), mat(0x334155)); lg.position.set(-team * 0.0, 0.28, z); g.add(lg); });
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1, 8), mat(0xf1c39b)); gT.add(arm);
        const k = { g, arm, team, i }; gT.add(g); KID.push(k); return k;
      }
      for (let i = 0; i < 3; i++) mkKid(-1, i);
      for (let i = 0; i < 5; i++) mkKid(1, i);
      const arL = mkArrow(0xf97316, 0.06), arR = mkArrow(0xf97316, 0.06), arN = mkArrow(0x7c3aed, 0.085); gT.add(arL, arR, arN); [arL, arR, arN].forEach(xray);
      const tL = label('왼쪽 팀 300 N', [0, 0, 0], { size: 12.5, color: 'rgba(200,90,10,.95)' }), tR = label('', [0, 0, 0], { size: 12.5, color: 'rgba(200,90,10,.95)' }), tN = label('', [0, 0, 0], { size: 12.5, color: 'rgba(110,50,200,.95)' });
      const kidX = (team, i) => (team * (116 + i * 48)) * TS * 1.0;     // 줄 가운데가 0
      const tgState = { xo: 0, n: 1 };
      const tmpV = new V3(), tmpE = new THREE.Euler();
      function updT(dt, l, tt) {
        const TG = l && l.TG;
        let n = TG ? TG.n : 1, xo = TG ? TG.xo : 0, pops = TG ? TG.pop.map((s) => Math.max(0, Math.min(1, s.value))) : null, running = TG ? TG.st === 'run' || TG.st === 'tie' : false, ph = '';
        if (pmode) {
          const p = playP, k = Math.min(4, Math.floor(p * 5)), q = p * 5 - k, tau = q * 3.2;
          n = k + 1; const nf = n * 100 - 300;
          xo = nf === 0 ? Math.sin(tau * 7) * 1.2 : Math.max(-84, Math.min(84, 0.5 * 0.45 * nf * Math.max(0, tau - 0.4) * Math.max(0, tau - 0.4)));
          if (q > 0.85) xo *= 1 - (q - 0.85) / 0.15;
          pops = [0, 1, 2, 3, 4].map((j) => (j < n ? 1 : 0)); running = true;
          ph = '오른쪽 팀 ' + n + '명 (' + n * 100 + ' N)' + (nf === 0 ? ' · 힘의 평형' : '');
        }
        const net = n * 100 - 300, fx = xo * TS;
        // 줄 · 깃발
        const x1 = (kidX(-1, 2) - 0.65), x2 = kidX(1, 4) + 0.65 + 0;
        ropeM.scale.y = x2 - x1; ropeM.position.x = (x1 + x2) / 2 + fx; flag.position.x = fx;
        KID.forEach((kd) => {
          const side = kd.i % 2 === 0 ? -1 : 1, z = side * 19 * TS * 1.0, pop = kd.team < 0 ? 1 : (pops ? pops[kd.i] : (kd.i < n ? 1 : 0));
          const bx = kidX(kd.team, kd.i) + fx;
          kd.g.visible = kd.arm.visible = pop > 0.02; if (pop <= 0.02) return;
          const jig = running ? Math.sin(tt * 9 + kd.i * 1.7 + kd.team) * 0.025 : 0, lean = -kd.team * (0.3 + (running ? 0.12 : 0)) + jig;
          kd.g.position.set(bx, 0, z + side * 0.2); kd.g.rotation.set(0, 0, lean); kd.g.scale.setScalar(0.6 + 0.4 * pop);
          // 어깨 → 줄을 잡은 손
          tmpV.set(0, 0.95, 0).applyEuler(tmpE.set(0, 0, lean)).multiplyScalar(0.6 + 0.4 * pop).add(kd.g.position);
          const hand = new V3(bx - kd.team * 0.1, 0.8, 0), len = tmpV.distanceTo(hand);
          kd.arm.scale.y = len; kd.arm.position.copy(tmpV).add(hand).multiplyScalar(0.5); kd.arm.quaternion.setFromUnitVectors(Yax, hand.clone().sub(tmpV).normalize());
        });
        // 힘 화살표 (줄 가운데 위, 같은 작용선): 1칸 = 100 N = 0.5
        const KT3 = 0.5 / 100, ay = 1.9;
        setArrow(arL, new V3(fx, ay, 0), new V3(fx - 300 * KT3, ay, 0)); setArrow(arR, new V3(fx, ay, 0), new V3(fx + n * 100 * KT3, ay, 0));
        tL.obj = [(fx - 150 * KT3) * gT.scale.x, ay * gT.scale.x + 0.1, 0]; tL.off = [0, 0.35, 0];
        tR.obj = [(fx + n * 50 * KT3) * gT.scale.x, ay * gT.scale.x + 0.1, 0]; tR.off = [0, -0.35, 0]; tR.set('오른쪽 팀 ' + n * 100 + ' N'); tR.show(true); tL.show(true);
        if (net !== 0) { setArrow(arN, new V3(fx, ay - 0.9, 0), new V3(fx + net * KT3, ay - 0.9, 0)); tN.set('합력 ' + (net > 0 ? '→ ' : '← ') + Math.abs(net) + ' N'); }
        else { arN.visible = false; tN.set('합력 0 N'); }
        tN.obj = [(fx + net * KT3 / 2) * gT.scale.x, (ay - 0.9) * gT.scale.x, 0]; tN.off = [0, 0.35, 0]; tN.show(true);
        const ph2 = phEl(); if (ph2) ph2.textContent = pmode ? ph : '';
        const a = Math.max(n * 100, 300), b = Math.min(n * 100, 300);
        setInfo((pmode ? '<b>▶ ' + ph + '</b><br>' : '') + '<b>' + (net ? '합력 = ' + a + ' N − ' + b + ' N = ' + Math.abs(net) + ' N (' + (net > 0 ? '오른쪽' : '왼쪽') + ')' : '합력 = 300 N − 300 N = 0') + '</b><br>' +
          (net === 0 ? '<b>힘의 평형</b>: 크기가 같고 방향이 반대이고 같은 작용선 위여서 깃발이 가운데에 그대로 있어요.' : '두 팀의 힘이 다르면 <b>큰 힘 쪽</b>으로 깃발이 끌려가요. (1칸 = 100 N)') + (pmode ? '' : '<br>오른쪽 팀 인원은 옆의 2D 화면에서 바꿔요.'));
      }
      const yAx = new V3(0, 1, 0), tmpP = new V3();

      /* ▶ 재생: 2D 실험과 같은 네 장면을 차례로 (핀을 꽂은 채 힘 정하기 → 핀 빼기 → 운동) */
      const SC = [
        { F: [2, 3], slot: 1, name: '같은 방향 2 N · 3 N' },
        { F: [-2, 5], slot: 1, name: '반대 방향 2 N · 5 N' },
        { F: [-4, 4], slot: 1, name: '크기 같고 반대 · 같은 작용선' },
        { F: [-3, 3], slot: 0, name: '크기 같고 반대 · 작용선 다름' },
      ];
      let pmode = false, built = false, playP = 0, sig = '', lastTxt = '', curSc = 'B';
      const pl = controls.player({
        duration: 14, loop: true, autoplay: false, label: '재생',
        phases: SC.map((s, i) => [i / SC.length, s.name]),
        onFrame(p) { if (!built) return; pmode = true; playP = p; },
      });
      built = true;
      const L0 = () => (ctx.lesson && ctx.lesson()) || null;
      const setInfo = (h) => { if (h !== lastTxt) { lastTxt = h; info(h); } };
      const fN = (f) => (f === 0 ? '0 N' : (f > 0 ? '→ ' : '← ') + Math.abs(f) + ' N');
      function formula(f1, f2) {
        const a = Math.abs(f1), b = Math.abs(f2), n = Math.abs(f1 + f2);
        if (!a && !b) return '합력 = 0';
        if (!a || !b) return '합력 = ' + (a || b) + ' N';
        if (Math.sign(f1) === Math.sign(f2)) return '합력 = ' + a + ' N + ' + b + ' N = ' + n + ' N';
        return '합력 = ' + Math.max(a, b) + ' N − ' + Math.min(a, b) + ' N = ' + (n ? n + ' N' : '0');
      }

      return {
        update(dt, tt) {
          const l = L0(), B = l && l.B, sc = l ? l.scene : 'B';
          if (sc !== curSc) { curSc = sc; if (pmode) { pmode = false; pl.pause(); } }
          const isB = sc !== 'A' && sc !== 'T';
          bObjs.forEach((o) => { o.visible = isB; }); gA.visible = sc === 'A'; gT.visible = sc === 'T';
          lnLab.show(isB);
          [arLab, labClay, labCart].forEach((x) => { if (sc !== 'A') x.show(false); else if (x !== arLab) x.show(true); });
          [tL, tR, tN].forEach((x) => { if (sc !== 'T') x.show(false); });
          if (sc === 'A') { updA(dt, l); return; }
          if (sc === 'T') { updT(dt, l, tt || 0); return; }
          let F0 = 0, F1 = 0, slot = 1, x = 0, z = 0, th = 0, pinned = true;
          if (pmode) {
            const n = SC.length, k = Math.min(n - 1, Math.floor(playP * n)), q = playP * n - k, tau = q * 4.2;  // 한 장면 = 4.2초 분량
            const s = SC[k]; F0 = s.F[0]; F1 = s.F[1]; slot = s.slot;
            const run = Math.max(0, tau - 0.9), netv = F0 + F1, fade = q > 0.88 ? 1 - (q - 0.88) / 0.12 : 1;
            pinned = tau < 0.9;
            x = Math.max(-LIM, Math.min(LIM, 0.5 * 0.17 * netv * run * run));
            const tq = F1 * SLOTS[slot] * 0.9; th = slot !== 1 ? Math.max(-3.1, Math.min(3.1, 0.5 * 0.45 * tq * run * run)) : 0;
            z = 0; cart.scale.setScalar(0.4 + 0.6 * Math.min(1, fade * 1.0 + 0.0));
            cart.scale.setScalar(1);
          } else if (B) {
            F0 = B.F[0]; F1 = B.F[1]; slot = B.slot; pinned = B.st === 'pinned' || B.st === 'pinIn';
            x = (B.x - l.BC.cx) / PX; z = (B.y - l.BC.cy) / PX; th = B.th;
          }
          const net = F0 + F1, hz2 = SLOTS[slot];
          if (pmode || !B) { /* 재생 중에는 핀을 뺀 직후부터 */ }
          cart.position.set(x, 0, z); cart.rotation.y = -th; pin.visible = pinned;
          hk2.position.set(HOOK, 0, hz2);
          const c = Math.cos(th), s = Math.sin(th);
          const wp = (lx, lz) => tmpP.set(x + lx * c - lz * s, 0, z + lx * s + lz * c).clone();
          const p1 = wp(-HOOK, 0), p2 = wp(HOOK, hz2);
          // 힘 화살표 (왼쪽 고리, 오른쪽 고리): 힘의 방향으로 길이 = 크기 × 0.4
          const drawF = (g, lab, p, f, dz, txt) => { if (f === 0) { g.visible = false; lab.show(false); return; } setArrow(g, p.clone().add(new V3(0, 0.05, dz)), p.clone().add(new V3(f * KN, 0.05, dz))); g.visible = true; lab.obj = [p.x + f * KN / 2, 0.45, p.z + dz]; lab.set(txt + ' ' + fN(f)); lab.show(true); };
          drawF(a1, l1, p1, F0, 0, 'F₁'); drawF(a2, l2, p2, F1, 0, 'F₂');
          // 합력 화살표 (상자 아래)
          const ny = -0.2, nz = 1.9;
          if (net !== 0) { setArrow(an, new V3(x, ny, nz), new V3(x + net * KN, ny, nz)); an.visible = true; ln.obj = [x + net * KN / 2, ny + 0.1, nz]; ln.set('합력 ' + fN(net)); }
          else { an.visible = false; ln.obj = [x, ny + 0.1, nz]; ln.set('합력 0 N'); }
          ln.show(F0 !== 0 || F1 !== 0);
          line.position.z = 0; line2.position.z = hz2; line2.visible = slot !== 1; line.visible = true;
          // 안내
          let txt;
          {
            const bal = net === 0 && slot === 1, spin = net === 0 && slot !== 1 && F1 !== 0;
            txt = (pmode ? '<b>▶ ' + SC[Math.min(SC.length - 1, Math.floor(playP * SC.length))].name + '</b><br>' : '') + '<b>' + formula(F0, F1) + '</b>' + (net !== 0 ? ' (' + (net > 0 ? '오른쪽' : '왼쪽') + ')' : '') + '<br>';
            if (F0 === 0 && F1 === 0) txt += '핀을 꽂은 채 옆의 2D 조작판에서 두 힘을 정하고 ▶ 핀 빼기를 눌러 보세요.';
            else if (F0 !== 0 && F1 !== 0 && Math.sign(F0) === Math.sign(F1)) txt += '두 힘의 방향이 같으면 합력은 <b>두 힘의 합</b>이고 방향은 두 힘과 같아요.';
            else if (net !== 0) txt += '두 힘의 방향이 반대이면 합력은 <b>큰 힘 − 작은 힘</b>이고 방향은 <b>큰 힘 쪽</b>이에요.';
            else if (bal) txt += '<b>힘의 평형</b>: 크기가 같고, 방향이 반대이며, <b>같은 작용선</b> 위에 있어 합력이 0이에요. 멈춰 있던 물체는 계속 멈춰 있어요.';
            else if (spin) txt += '크기가 같고 방향이 반대여도 <b>작용선이 다르면</b> 상자가 제자리에서 돌아요.';
          }
          setInfo(txt);
        },
        sync() {},
      };
    },
  });
})();
