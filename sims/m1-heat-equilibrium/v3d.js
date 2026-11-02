/* m1-heat-equilibrium · 3D 열평형: 뜨거운 물과 찬물의 입자
   온도가 높은 쪽 입자는 빠르게(빨강), 낮은 쪽 입자는 느리게(파랑) 움직여요. 가운데 벽에서 입자들이 부딪히며 에너지를 주고받아
   열이 높은 쪽 → 낮은 쪽으로 이동하고, 두 쪽의 온도가 같아지면 열평형이에요. (같은 양의 물이면 처음 두 온도의 가운데 온도가 돼요.) */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN0 = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  window.SciSim3D.attach({
    title: '열평형 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    levels: [0, 1, 2],
    camera: { dist: 12.5 * (PHN0 ? 1.05 : 1), theta: 0.35, phi: 1.2, fov: 45, target: [0, -0.2, 0], min: 6, max: 28 },
    autoRotate: 0.05,
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

      const NH = 45, PR = 0.1, BX = 3.2, BY = 1.5, BZ = 1.5;
      const st = { th: 80, tc: 20, cond: true, time: 0, last: -1 };
      const cCold = new THREE.Color(0x3d7bff), cHot = new THREE.Color(0xff4a2a), cc = new THREE.Color();
      const colOf = (T) => cc.copy(cCold).lerp(cHot, Math.max(0, Math.min(1, (T - 10) / 90)));
      /* 두 개의 수조 */
      [-1, 1].forEach((s) => {
        const w = new THREE.Mesh(new THREE.BoxGeometry(BX, 2 * BY, 2 * BZ), glass(s > 0 ? 0xff9a7a : 0x7ab8ff, 0.14)); w.position.x = s * BX / 2; root.add(w);
        const e = new THREE.LineSegments(new THREE.EdgesGeometry(w.geometry), new THREE.LineBasicMaterial({ color: s > 0 ? 0xffb199 : 0x9cc3ff })); e.position.copy(w.position); root.add(e);
      });
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2 * BY, 2 * BZ), mat(0xe8a24a, { transparent: true, opacity: 0.55, metalness: 0.6, roughness: 0.3 })); root.add(wall);
      const stand = new THREE.Mesh(new THREE.BoxGeometry(2 * BX + 1.4, 0.2, 2 * BZ + 1), mat(0x64748b, { roughness: 0.7 })); stand.position.y = -BY - 0.12; root.add(stand);
      const P = new THREE.InstancedMesh(new THREE.SphereGeometry(PR, 12, 9), mat(0xffffff, { roughness: 0.35 }), 2 * NH); P.frustumCulled = false; P.instanceMatrix.setUsage(THREE.DynamicDrawUsage); P.castShadow = true; root.add(P);
      for (let i = 0; i < 2 * NH; i++) P.setColorAt(i, _c.set(0xffffff));
      const A = [];
      function init() {
        A.length = 0;
        for (let i = 0; i < 2 * NH; i++) { const side = i < NH ? -1 : 1, T = side < 0 ? st.tc : st.th, b = rnd() * 6.283, c = rnd() * 2 - 1, u = Math.sqrt(1 - c * c);
          A.push({ x: side * (0.2 + rnd() * (BX - 0.4)), y: (rnd() * 2 - 1) * (BY - PR), z: (rnd() * 2 - 1) * (BZ - PR), dx: Math.cos(b) * u, dy: c, dz: Math.sin(b) * u, e: T + 273, side, flash: 0 }); }
        st.time = 0;
      }
      init();
      /* 온도계 두 개 */
      const th = [-1, 1].map((s) => { const x = s * (BX + 1.3);
        const tg = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 3.4, 20), glass(0xe8f1ff, 0.3)); tg.position.set(x, -0.1, 0); root.add(tg);
        const tb = new THREE.Mesh(new THREE.SphereGeometry(0.36, 20, 14), mat(0xef4444, { roughness: 0.3 })); tb.position.set(x, -1.95, 0); root.add(tb);
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1, 14), mat(0xef4444, { roughness: 0.3 })); root.add(col);
        const lab = label('', [x, 1.9, 0], { size: 12.5, color: s > 0 ? 'rgba(200,50,30,.92)' : 'rgba(40,90,220,.92)' }); return { x, col, lab, tb }; });
      label('찬물', [-BX / 2, BY + 0.2, 0], { size: 12, offset: [0, 0.2, 0] }); label('뜨거운 물', [BX / 2, BY + 0.2, 0], { size: 12, offset: [0, 0.2, 0] });
      const arrow = mkArrow(0xffb020, 0.06); root.add(arrow);
      const aLab = label('열이 이동해요', arrow, { size: 11.5, offset: [0, 0.4, 0] });
      const eqLab = label('열평형!', [0, BY + 1.1, 0], { size: 14, color: 'rgba(22,130,60,.92)' });

      function means() { let a = 0, b = 0; for (let i = 0; i < 2 * NH; i++) { if (A[i].x < 0) a += A[i].e; else b += A[i].e; } return [a / NH - 273, b / NH - 273]; }
      function show() {
        const [Tc, Th] = means();
        const yTh = (T) => -1.95 + 0.25 + (T / 100) * 3.0;
        th.forEach((t, i) => { const T = i === 0 ? Tc : Th, y = yTh(Math.max(0, T)); t.col.scale.y = y + 1.95; t.col.position.set(t.x, (y - 1.95) / 2, 0); t.lab.set(Math.round(T) + ' °C'); });
        const d = Th - Tc, eq = Math.abs(d) < 1.5 && st.cond && st.time > 1;
        eqLab.show(eq);
        if (st.cond && d > 1.5) { setArrow(arrow, new V3(0.7, BY + 0.6, 0), new V3(-0.7, BY + 0.6, 0)); arrow.visible = true; aLab.show(true); } else { arrow.visible = false; aLab.show(false); }
        info(eq ? '두 물의 온도가 <b>' + Math.round((Th + Tc) / 2) + ' °C</b>로 같아졌어요: <b>열평형</b>!<br>입자는 계속 움직이지만 더 이상 한쪽으로 열이 이동하지 않아요.' : (st.cond ? '열이 온도가 <b>높은 쪽 → 낮은 쪽</b>으로 이동해요.<br>뜨거운 쪽 입자는 점점 느려지고, 찬 쪽 입자는 점점 빨라져요.<br>두 온도가 같아지면 <b>열평형</b>이에요.' : '가운데 벽이 열을 막고 있어요(단열). 그래서 온도가 그대로예요.<br>벽을 열이 통하게 바꾸면 열평형까지 변해요.'));
      }
      controls.segment('', [{ value: 80, label: '뜨거운 물 80 °C' }, { value: 60, label: '60 °C' }, { value: 40, label: '40 °C' }], 80, (v) => { st.th = v; init(); show(); });
      const cB = controls.button('🧱 벽: 열 통함', () => { st.cond = !st.cond; cB.textContent = st.cond ? '🧱 벽: 열 통함' : '🧱 벽: 단열'; wall.material.color.setHex(st.cond ? 0xe8a24a : 0x9aa3b0); wall.material.opacity = st.cond ? 0.55 : 0.9; show(); });
      controls.button('↺ 다시 시작', () => { init(); show(); });
      show();

      return {
        update(dt, t) {
          const h = Math.min(dt, 0.05); st.time += h;
          const byS = [[], []]; 
          for (let i = 0; i < 2 * NH; i++) {
            const p = A[i], sp = 2.2 * Math.sqrt(p.e / 330) * (0.8 + 0.4 * ((i * 37) % 10) / 10);
            p.x += p.dx * sp * h; p.y += p.dy * sp * h; p.z += p.dz * sp * h;
            const x0 = p.side < 0 ? -BX + PR : PR + 0.05, x1 = p.side < 0 ? -PR - 0.05 : BX - PR;
            if (p.x < x0) { p.x = x0; p.dx = Math.abs(p.dx); } if (p.x > x1) { p.x = x1; p.dx = -Math.abs(p.dx); if (p.side < 0 && st.cond) byS[0].push(i); }
            if (p.side > 0 && p.x === x0 && st.cond) byS[1].push(i);
            if (Math.abs(p.y) > BY - PR) { p.y = Math.sign(p.y) * (BY - PR); p.dy = -p.dy; } if (Math.abs(p.z) > BZ - PR) { p.z = Math.sign(p.z) * (BZ - PR); p.dz = -p.dz; }
            p.flash = Math.max(0, p.flash - h);
          }
          /* 벽에서 부딪힌 입자들끼리 에너지 주고받기 (합은 그대로) */
          const L = byS[0], R = byS[1];
          L.forEach((i) => { const j = R.length ? R[(Math.random() * R.length) | 0] : NH + ((Math.random() * NH) | 0); const a = A[i], b = A[j]; if (a.x < -0.5) return; const d = 0.3 * (b.e - a.e); a.e += d; b.e -= d; a.flash = b.flash = 0.2; });
          R.forEach((j) => { const i = L.length ? L[(Math.random() * L.length) | 0] : ((Math.random() * NH) | 0); const a = A[i], b = A[j]; const d = 0.3 * (b.e - a.e); a.e += d; b.e -= d; a.flash = b.flash = 0.2; });
          for (let i = 0; i < 2 * NH; i++) { const p = A[i]; put(P, i, p.x, p.y, p.z, 1 + p.flash * 2); P.setColorAt(i, colOf(p.e - 273)); }
          flush(P);
          const k = (t * 4) | 0; if (k !== st.last) { st.last = k; show(); }
          wall.position.x = 0;
        },
        sync() {},
      };
    },
  });
})();
