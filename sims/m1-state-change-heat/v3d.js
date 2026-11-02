/* m1-state-change-heat · 3D 얼음을 가열해 수증기가 될 때까지 (가열 곡선)
   상태가 변하는 동안(녹는 중·끓는 중)에는 열을 계속 흡수해도 온도가 일정해요. 열이 입자 사이의 배열을 바꾸는 데 쓰이기 때문이에요.
   오른쪽 아래 그래프에 지금 위치가 점으로 나타나요. (0 °C에서 녹고 100 °C에서 끓는 물을 기준으로 한 모형이에요.) */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN0 = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  window.SciSim3D.attach({
    title: '가열 곡선 3D',
    hint: ' ',
    levels: [0, 1, 2],
    camera: { dist: 10 * (PHN0 ? 1.05 : 1), theta: 0.6, phi: 1.15, fov: 45, target: [-0.6, -0.4, 0], min: 5, max: 26 },
    autoRotate: 0.15,
    build(ctx) {
      const { THREE, root, label, info, controls, renderer } = ctx;
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

      /* ---------- 고체·액체·기체 입자 모형 (용기 속 입자, 입자마다 상태를 따로 가져요) ---------- */
      const SET = {
        solid: { k: 70, g: 0, rep: 0, damp: 5, sp: 0, noise: 6 },
        liquid: { k: 0, g: 7, rep: 90, damp: 1.2, sp: 1.2, noise: 8 },
        gas: { k: 0, g: 0, rep: 0, damp: 0, sp: 3.4, noise: 0 },
      };
      function stateSys(N, PR, color) {
        const mesh = spheres(N, PR, color, 14), P = [];
        const n = Math.round(Math.cbrt(N)), gap = PR * 2.3;
        for (let i = 0; i < N; i++) { const a = i % n, b = Math.floor(i / n) % n, c = Math.floor(i / (n * n));
          P.push({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, hx: (a - (n - 1) / 2) * gap, hy: c * gap + PR, hz: (b - (n - 1) / 2) * gap, hy0: 0, mode: 'solid', pr: Object.assign({}, SET.solid), tg: SET.solid, ord: rnd() }); }
        const order = P.slice().sort((p, q) => p.ord - q.ord);
        const sys = { mesh, P, H: 2.2, W: 2.2, n: N, mode: 'solid' };
        const kick = (p, s) => { const b = rnd() * 6.283, c = rnd() * 2 - 1, u = Math.sqrt(1 - c * c); p.vx = Math.cos(b) * u * s; p.vy = c * s; p.vz = Math.sin(b) * u * s; };
        sys.gasFloor = null;
        sys.setHome = () => { P.forEach((p) => { p.hy0 = -sys.H + p.hy; }); };
        sys.snap = () => { sys.setHome(); P.forEach((p) => { p.x = p.hx; p.y = p.hy0; p.z = p.hz; p.vx = p.vy = p.vz = 0; }); };
        /* mode 하나로 모두 바꾸기 (kick: 날아가는 속도를 줘요) */
        sys.set = (mode, kk) => { sys.mode = mode; P.forEach((p) => { p.mode = mode; p.tg = SET[mode]; if (kk) kick(p, SET[mode].sp || 1); }); };
        /* 입자 중 f(0~1) 만큼을 b 상태로, 나머지는 a 상태로 (녹는 중·끓는 중) */
        sys.mix = (a, b, f) => { const m = Math.round(f * N); order.forEach((p, i) => { const md = i < m ? b : a; if (p.mode !== md) { p.mode = md; p.tg = SET[md]; if (md === 'gas') kick(p, 2.4); } }); };
        /* 어떤 상태에서 시작할지 바로 맞추기 */
        sys.prep = (mode) => {
          sys.set(mode, false); P.forEach((p) => Object.assign(p.pr, SET[mode]));
          if (mode === 'solid') { sys.snap(); return; }
          sys.setHome(); const LW = sys.W - PR, L = sys.H - PR;
          P.forEach((p) => { p.x = (rnd() * 2 - 1) * LW; p.z = (rnd() * 2 - 1) * LW; p.y = mode === 'gas' ? (rnd() * 2 - 1) * L : -L + rnd() * 1.2; kick(p, SET[mode].sp); });
          if (mode === 'liquid') for (let k = 0; k < 150; k++) sys.step(1 / 60);
        };
        sys.step = (dt) => {
          const H = sys.H, LW = sys.W - PR, L = H - PR, sub = 2, h = Math.min(dt, 0.05) / sub, a = Math.min(1, dt * 3);
          sys.setHome();
          for (let i = 0; i < N; i++) { const pr = P[i].pr, t = P[i].tg; for (const key in t) pr[key] += (t[key] - pr[key]) * a; }
          for (let s = 0; s < sub; s++) {
            for (let i = 0; i < N; i++) { const p = P[i]; if (p.pr.rep < 2) continue; for (let j = i + 1; j < N; j++) { const q = P[j]; if (q.pr.rep < 2) continue;
              const dx = p.x - q.x, dy = p.y - q.y, dz = p.z - q.z, d2 = dx * dx + dy * dy + dz * dz, D = PR * 2.05;
              if (d2 < D * D && d2 > 1e-8) { const d = Math.sqrt(d2), f = Math.min(p.pr.rep, q.pr.rep) * (D - d) / d * h; p.vx += dx * f; p.vy += dy * f; p.vz += dz * f; q.vx -= dx * f; q.vy -= dy * f; q.vz -= dz * f; } } }
            for (let i = 0; i < N; i++) {
              const p = P[i], pr = p.pr;
              if (pr.k > 1) { p.vx += (p.hx - p.x) * pr.k * h; p.vy += (p.hy0 - p.y) * pr.k * h; p.vz += (p.hz - p.z) * pr.k * h; }
              if (pr.noise > 0.1) { p.vx += (rnd() - 0.5) * pr.noise * h * 6; p.vy += (rnd() - 0.5) * pr.noise * h * 6; p.vz += (rnd() - 0.5) * pr.noise * h * 6; }
              p.vy -= pr.g * h;
              const dm = Math.max(0, 1 - pr.damp * h); p.vx *= dm; p.vy *= dm; p.vz *= dm;
              if (pr.sp > 0.05) { const v = Math.hypot(p.vx, p.vy, p.vz) + 1e-6, f = 1 + (pr.sp / v - 1) * Math.min(1, 2.5 * h); p.vx *= f; p.vy *= f; p.vz *= f; }
              p.x += p.vx * h; p.y += p.vy * h; p.z += p.vz * h;
              if (p.x > LW) { p.x = LW; p.vx = -Math.abs(p.vx) * 0.6; } else if (p.x < -LW) { p.x = -LW; p.vx = Math.abs(p.vx) * 0.6; }
              if (p.z > LW) { p.z = LW; p.vz = -Math.abs(p.vz) * 0.6; } else if (p.z < -LW) { p.z = -LW; p.vz = Math.abs(p.vz) * 0.6; }
              if (p.y > L) { p.y = L; p.vy = -Math.abs(p.vy) * 0.6; } else if (p.y < -L) { p.y = -L; p.vy = Math.abs(p.vy) * 0.6; }
              if (p.mode === 'gas' && sys.gasFloor !== null && p.y < sys.gasFloor && p.vy < 0) { p.y = sys.gasFloor; p.vy = Math.abs(p.vy); }
            }
          }
        };
        const CM = { solid: new THREE.Color(0x3563d8), liquid: new THREE.Color(0x14a6cf), gas: new THREE.Color(0xf57f1f) };
        sys.draw = (colorOf) => { for (let i = 0; i < N; i++) { const p = P[i]; put(mesh, i, p.x, p.y, p.z, 1); if (colorOf !== false) mesh.setColorAt(i, CM[p.mode]); } flush(mesh); };
        sys.snap();
        return sys;
      }
      function boxFrame(W, H, color) {
        const g = new THREE.Group();
        const m = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), glass(color || 0xbfe0ff, 0.1)), e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(2, 2, 2)), new THREE.LineBasicMaterial({ color: 0x9cc3ff }));
        g.add(m, e); g.userData.set = (w, h) => g.scale.set(w, h, w); g.userData.set(W, H); return g;
      }

      const PR = 0.17, N = 125, HH = 2.3, W = 1.7;
      /* 가한 열 Q(0~100) → 온도 T. 구간: 얼음 가열 0-14, 녹음 14-32, 물 가열 32-60, 끓음 60-88, 수증기 가열 88-100 */
      const SEGS = [[0, 14, -20, 0], [14, 32, 0, 0], [32, 60, 0, 100], [60, 88, 100, 100], [88, 100, 100, 120]];
      function tempOf(q) { for (const s of SEGS) if (q <= s[1]) return s[2] + (s[3] - s[2]) * (q - s[0]) / (s[1] - s[0]); return 120; }
      function phaseOf(q) { return q < 14 ? 0 : q < 32 ? 1 : q < 60 ? 2 : q < 88 ? 3 : 4; }
      const PN = ['고체 (얼음)', '녹는 중 (고체 + 액체)', '액체 (물)', '끓는 중 (액체 + 기체)', '기체 (수증기)'];
      const PD = [
        '입자가 제자리에서 진동해요. 열을 흡수하면 <b>온도가 올라가요</b>.',
        '열을 흡수해도 <b>온도는 0 °C로 일정</b>해요. 열이 입자 배열을 바꾸는 데 쓰여요.',
        '입자가 자리를 바꾸며 움직여요. 열을 흡수하면 <b>온도가 올라가요</b>.',
        '열을 흡수해도 <b>온도는 100 °C로 일정</b>해요. 입자가 서로 멀어지는 데 열이 쓰여요.',
        '입자가 자유롭게 날아다녀요. 열을 흡수하면 <b>온도가 더 올라가요</b>.',
      ];
      const sys = stateSys(N, PR, 0xffffff), st = { q: 0, play: 0, ph: -1 };
      sys.H = HH; sys.W = W;
      const frame = boxFrame(W, HH, 0xdff0ff); root.add(frame);
      const stand = new THREE.Mesh(new THREE.CylinderGeometry(2.9, 3.1, 0.2, 48), mat(0x64748b, { metalness: 0.4, roughness: 0.4 })); stand.position.y = -HH - 0.12; root.add(stand);
      /* 가열 장치 */
      const burner = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 0.5, 24), mat(0x475569, { metalness: 0.6, roughness: 0.4 })); burner.position.y = -HH - 0.5; root.add(burner);
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.9, 20), new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.9 })); flame.position.y = -HH - 0.04; root.add(flame);
      const flame2 = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.55, 16), new THREE.MeshBasicMaterial({ color: 0xffe082 })); flame2.position.y = -HH - 0.15; root.add(flame2);
      const tLab = label('', [0, HH + 0.45, 0], { size: 14, color: 'rgba(30,64,175,.92)' });
      /* 온도계 */
      const TX = -3.4, TY0 = -HH, TH = 2 * HH;
      const tg = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, TH + 0.6, 24), glass(0xe8f1ff, 0.28)); tg.position.set(TX, TY0 + TH / 2, 0); root.add(tg);
      const tb = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 16), mat(0xef4444, { roughness: 0.3 })); tb.position.set(TX, TY0 - 0.4, 0); root.add(tb);
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 1, 16), mat(0xef4444, { roughness: 0.3 })); root.add(col);
      const yOfT = (T) => TY0 + (T + 20) / 140 * TH;
      [0, 100].forEach((T) => { const tk = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.04, 0.04), mat(0x334155)); tk.position.set(TX + 0.4, yOfT(T), 0); root.add(tk); label(T + ' °C', [TX + 0.4, yOfT(T), 0], { size: 10.5, offset: [0.65, 0, 0] }); });

      /* 가열 곡선 그래프 (오른쪽 아래) */
      const view = renderer.domElement.parentElement;
      const box = document.createElement('div');
      box.style.cssText = 'position:absolute;right:10px;bottom:10px;z-index:3;padding:5px 7px 6px;border-radius:12px;background:rgba(8,12,24,.8);border:1px solid rgba(255,255,255,.22);text-align:center;pointer-events:none;color:#e8eefc;font-size:11.5px;font-weight:800;line-height:1.3';
      const GW = PHN0 ? 118 : 156, GH = PHN0 ? 84 : 108, cv = document.createElement('canvas'); cv.width = GW * 2; cv.height = GH * 2; cv.style.cssText = 'display:block;width:' + GW + 'px;height:' + GH + 'px;margin:2px auto 0';
      box.append(Object.assign(document.createElement('div'), { textContent: '📈 가열 곡선' }), cv); view.appendChild(box);
      const g2 = cv.getContext('2d');
      function drawGraph() {
        const S = 2, w = cv.width, h = cv.height, L = 22 * S, B = 14 * S, T = 6 * S, R = 6 * S;
        const X = (q) => L + (w - L - R) * q / 100, Y = (t) => h - B - (h - B - T) * (t + 20) / 140;
        g2.clearRect(0, 0, w, h);
        g2.strokeStyle = 'rgba(255,255,255,.35)'; g2.lineWidth = 1.5; g2.beginPath(); g2.moveTo(L, T); g2.lineTo(L, h - B); g2.lineTo(w - R, h - B); g2.stroke();
        g2.setLineDash([4, 4]); g2.strokeStyle = 'rgba(255,255,255,.22)'; [0, 100].forEach((t) => { g2.beginPath(); g2.moveTo(L, Y(t)); g2.lineTo(w - R, Y(t)); g2.stroke(); }); g2.setLineDash([]);
        g2.fillStyle = '#b9c6e4'; g2.font = '800 ' + 10 * S + 'px sans-serif'; g2.textAlign = 'right'; g2.fillText('100', L - 3 * S, Y(100) + 3 * S); g2.fillText('0', L - 3 * S, Y(0) + 3 * S);
        g2.textAlign = 'center'; g2.fillText('가한 열 →', (L + w) / 2, h - 2 * S);
        g2.lineWidth = 3; g2.strokeStyle = '#6aa9ff'; g2.beginPath(); for (let q = 0; q <= 100; q += 1) { const x = X(q), y = Y(tempOf(q)); q ? g2.lineTo(x, y) : g2.moveTo(x, y); } g2.stroke();
        g2.strokeStyle = '#ffd34d'; g2.lineWidth = 4; g2.beginPath(); for (let q = 0; q <= st.q; q += 1) { const x = X(q), y = Y(tempOf(q)); q ? g2.lineTo(x, y) : g2.moveTo(x, y); } g2.stroke();
        g2.fillStyle = '#ffd34d'; g2.beginPath(); g2.arc(X(st.q), Y(tempOf(st.q)), 5 * S, 0, 7); g2.fill();
      }

      function apply() {
        const q = st.q, T = tempOf(q), ph = phaseOf(q);
        if (ph !== st.ph || ph === 1 || ph === 3) {
          if (ph === 0) sys.mix('solid', 'solid', 0); else if (ph === 1) sys.mix('solid', 'liquid', (q - 14) / 18); else if (ph === 2) sys.set('liquid', false);
          else if (ph === 3) sys.mix('liquid', 'gas', (q - 60) / 28); else sys.set('gas', false);
          if (ph === 0) sys.set('solid', false);
        }
        if (ph !== st.ph) { st.ph = ph; }
        /* 온도에 따라 입자 빠르기 조금 달라지게 */
        SET.solid.noise = 3 + 8 * (T + 20) / 20; SET.liquid.sp = 0.8 + 0.7 * T / 100; SET.liquid.noise = 3 + 8 * T / 100; SET.gas.sp = 2.4 + 1.6 * (T - 100) / 20;
        const ty = yOfT(T); col.scale.y = ty - (TY0 - 0.4); col.position.set(TX, (ty + TY0 - 0.4) / 2, 0);
        tLab.set(PN[ph] + ' · ' + Math.round(T) + ' °C');
        info('<b>' + PN[ph] + '</b> · 온도 <b>' + Math.round(T) + ' °C</b><br>' + PD[ph]);
        drawGraph();
      }
      sys.prep('solid');
      const rng = controls.range('가한 열', 0, 100, 1, 0, (v) => { st.play = 0; st.q = v; apply(); updBtn(); }, (v) => v + '%');
      const hB = controls.button('▶ 가열하기', () => { st.play = st.play === 1 ? 0 : 1; updBtn(); });
      const cB = controls.button('❄ 냉각하기', () => { st.play = st.play === -1 ? 0 : -1; updBtn(); });
      function updBtn() { hB.classList.toggle('on', st.play === 1); cB.classList.toggle('on', st.play === -1); hB.textContent = st.play === 1 ? '⏸ 멈춤' : '▶ 가열하기'; cB.textContent = st.play === -1 ? '⏸ 멈춤' : '❄ 냉각하기'; }
      apply();

      return {
        update(dt, t) {
          if (st.play) { st.q = Math.max(0, Math.min(100, st.q + st.play * 7 * dt)); if (st.q <= 0 || st.q >= 100) { st.play = 0; updBtn(); } rng.set(Math.round(st.q)); const kq = Math.round(st.q * 4); if (kq !== st.kq) { st.kq = kq; apply(); } }
          sys.step(dt); sys.draw();
          const on = st.play === 1 ? 1 : 0, fl = 0.9 + 0.12 * Math.sin(t * 25);
          flame.visible = flame2.visible = !!on; flame.scale.set(1, fl, 1); flame2.scale.set(1, fl * 1.1, 1);
        },
        sync() {},
      };
    },
  });
})();
