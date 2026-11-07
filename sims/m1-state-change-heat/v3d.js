/* m1-state-change-heat · 3D 가열 곡선(얼음 −20 °C → 수증기)과 냉각 곡선(80 °C 팔미트산)
   2D 실험과 같은 곡선·같은 값이에요. 상태가 변하는 동안(녹는 중·끓는 중·응고 중)에는 온도가 일정해요.
   2D의 🔥 가열하기 / ❄️ 식히기를 누르면 3D도 함께 움직이고, ▶ 재생은 곡선 한 번을 반복해요. 오른쪽 아래 그래프에 지금 위치가 점으로 나타나요.
   가열 곡선 · 냉각 곡선(1 · 2단계)만 3D예요. 화살표를 누르고 카드를 상자에 끌어 넣는 3 · 4단계는 2D 화면이에요.
   (수평 구간에서 열이 어디에 쓰이는지는 퀴즈로 묻기 때문에 설명 글에 미리 쓰지 않아요.) */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN0 = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  window.SciSim3D.attach({
    title: '가열 곡선 3D',
    hint: ' ',
    levels: [0, 1],   // 가열 곡선 · 냉각 곡선은 3D, 카드 분류(열 출입 · 생활 적용)는 2D
    camera: { dist: 12.5 * (PHN0 ? 1.08 : 1), theta: 0.6, phi: 1.15, fov: 45, target: [-0.6, -0.5, 0], min: 5, max: 26 },
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
      /* 2D 실험과 같은 곡선 (시간[분] · 온도[°C]) */
      const CURVES = {
        heat: { title: '가열 곡선', tmin: -20, tmax: 120, xmax: 40, end: 36.8, start: 'solid',
          segs: [
            { id: 'ice', t0: 0, t1: 2.4, T0: -20, T1: 0, a: 'solid', b: 'solid', lab: '고체 (얼음)', flat: false },
            { id: 'melt', t0: 2.4, t1: 9.4, T0: 0, T1: 0, a: 'solid', b: 'liquid', lab: '녹는 중 (고체 + 액체)', flat: true, name: '융해' },
            { id: 'water', t0: 9.4, t1: 21.4, T0: 0, T1: 100, a: 'liquid', b: 'liquid', lab: '액체 (물)', flat: false },
            { id: 'boil', t0: 21.4, t1: 34.4, T0: 100, T1: 100, a: 'liquid', b: 'gas', lab: '끓는 중 (액체 + 기체)', flat: true, name: '기화' },
            { id: 'steam', t0: 34.4, t1: 36.8, T0: 100, T1: 120, a: 'gas', b: 'gas', lab: '기체 (수증기)', flat: false }] },
        cool: { title: '냉각 곡선', tmin: 20, tmax: 90, xmax: 20, end: 18, start: 'liquid',
          segs: [
            { id: 'liq', t0: 0, t1: 3.4, T0: 80, T1: 63, a: 'liquid', b: 'liquid', lab: '액체 (팔미트산)', flat: false },
            { id: 'frz', t0: 3.4, t1: 11.4, T0: 63, T1: 63, a: 'liquid', b: 'solid', lab: '응고 중 (액체 + 고체)', flat: true, name: '응고' },
            { id: 'sol', t0: 11.4, t1: 18, T0: 63, T1: 30, a: 'solid', b: 'solid', lab: '고체 (팔미트산)', flat: false }] },
      };
      const lerp = (a, b, f) => a + (b - a) * f, cl = (v, a, b) => Math.max(a, Math.min(b, v));
      function curveAt(cv, t) { const sg = cv.segs; let i = 0; while (i < sg.length - 1 && t >= sg[i].t1) i++; const s = sg[i], f = cl((t - s.t0) / (s.t1 - s.t0), 0, 1); return { i, s, f, T: lerp(s.T0, s.T1, f) }; }
      const sys = stateSys(N, PR, 0xffffff), st = { key: 'heat', t: 0, lastT: 0, seg: -1, on: false };
      sys.H = HH; sys.W = W;
      const frame = boxFrame(W, HH, 0xdff0ff); root.add(frame);
      const stand = new THREE.Mesh(new THREE.CylinderGeometry(2.9, 3.1, 0.2, 48), mat(0x64748b, { metalness: 0.4, roughness: 0.4 })); stand.position.y = -HH - 0.12; root.add(stand);
      /* 가열 장치(가열) / 찬물 수조(냉각) */
      const burner = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 0.5, 24), mat(0x475569, { metalness: 0.6, roughness: 0.4 })); burner.position.y = -HH - 0.5; root.add(burner);
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.9, 20), new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.9 })); flame.position.y = -HH - 0.04; root.add(flame);
      const flame2 = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.55, 16), new THREE.MeshBasicMaterial({ color: 0xffe082 })); flame2.position.y = -HH - 0.15; root.add(flame2);
      const bath = new THREE.Mesh(new THREE.BoxGeometry(2 * W + 1.1, HH * 1.1, 2 * W + 1.1), glass(0x5fb4ff, 0.2, { side: THREE.FrontSide })); bath.position.y = -HH + HH * 0.55 - 0.05; root.add(bath);
      const bathLab = label('찬물 수조', bath, { size: 11.5, offset: [W + 0.9, -0.3, 0] });
      const arrIn = mkArrow(0xff6a3d, 0.1), arrOut = mkArrow(0x3b82f6, 0.1); root.add(arrIn, arrOut);
      setArrow(arrIn, new V3(1.2, -HH - 0.9, 0), new V3(0.4, -HH - 0.1, 0)); setArrow(arrOut, new V3(W + 0.1, -HH + 1.0, 0), new V3(W + 1.5, -HH + 1.0, 0));
      const arrLab = label('', [0, 0, 0], { size: 12, color: 'rgba(220,70,40,.92)' });
      const tLab = label('', [0, HH + 0.45, 0], { size: 14, color: 'rgba(30,64,175,.92)' });
      const subLab = label('', [0, HH + 1.05, 0], { size: 12 });
      /* 온도계 (곡선에 맞춰 눈금이 바뀜) */
      const TX = -3.4, TY0 = -HH, TH = 2 * HH;
      const tg = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, TH + 0.6, 24), glass(0xe8f1ff, 0.28)); tg.position.set(TX, TY0 + TH / 2, 0); root.add(tg);
      const tb = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 16), mat(0xef4444, { roughness: 0.3 })); tb.position.set(TX, TY0 - 0.4, 0); root.add(tb);
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 1, 16), mat(0xef4444, { roughness: 0.3 })); root.add(col);
      const yOfT = (T, cv) => TY0 + (T - cv.tmin) / (cv.tmax - cv.tmin) * TH;
      const ticks = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.04, 0.04), mat(0x334155)); root.add(m); return { m, l: label('', [0, 0, 0], { size: 10.5, offset: [0.65, 0, 0] }) }; });
      function setTicks(cv) { const vals = cv === CURVES.heat ? [0, 100] : [63, 80]; ticks.forEach((tk, i) => { tk.m.position.set(TX + 0.4, yOfT(vals[i], cv), 0); tk.l.obj = [TX + 0.4, yOfT(vals[i], cv), 0]; tk.l.set(vals[i] + ' °C'); }); }

      /* 곡선 그래프 (오른쪽 아래) */
      const view = renderer.domElement.parentElement;
      const box = document.createElement('div');
      box.style.cssText = 'position:absolute;right:10px;bottom:10px;z-index:3;padding:5px 7px 6px;border-radius:12px;background:rgba(8,12,24,.8);border:1px solid rgba(255,255,255,.22);text-align:center;pointer-events:none;color:#e8eefc;font-size:11.5px;font-weight:800;line-height:1.3';
      const GW = PHN0 ? 118 : 156, GH = PHN0 ? 84 : 108, cv = document.createElement('canvas'); cv.width = GW * 2; cv.height = GH * 2; cv.style.cssText = 'display:block;width:' + GW + 'px;height:' + GH + 'px;margin:2px auto 0';
      const gTitle = Object.assign(document.createElement('div'), { textContent: '📈 가열 곡선' });
      box.append(gTitle, cv); view.appendChild(box);
      const g2 = cv.getContext('2d');
      function drawGraph(key, t) {
        const C = CURVES[key], S = 2, w = cv.width, h = cv.height, L = 22 * S, B = 14 * S, T = 6 * S, R = 6 * S;
        const X = (q) => L + (w - L - R) * q / C.xmax, Y = (v) => h - B - (h - B - T) * (v - C.tmin) / (C.tmax - C.tmin);
        const at = (q) => curveAt(C, q).T;
        g2.clearRect(0, 0, w, h);
        g2.strokeStyle = 'rgba(255,255,255,.35)'; g2.lineWidth = 1.5; g2.beginPath(); g2.moveTo(L, T); g2.lineTo(L, h - B); g2.lineTo(w - R, h - B); g2.stroke();
        const lv = key === 'heat' ? [0, 100] : [63];
        g2.setLineDash([4, 4]); g2.strokeStyle = 'rgba(255,255,255,.22)'; lv.forEach((v) => { g2.beginPath(); g2.moveTo(L, Y(v)); g2.lineTo(w - R, Y(v)); g2.stroke(); }); g2.setLineDash([]);
        g2.fillStyle = '#b9c6e4'; g2.font = '800 ' + 10 * S + 'px sans-serif'; g2.textAlign = 'right'; lv.forEach((v) => g2.fillText(String(v), L - 3 * S, Y(v) + 3 * S));
        g2.textAlign = 'center'; g2.fillText((key === 'heat' ? '가열' : '냉각') + ' 시간 →', (L + w) / 2, h - 2 * S);
        g2.lineWidth = 3; g2.strokeStyle = key === 'heat' ? '#ff8a7a' : '#6aa9ff'; g2.globalAlpha = 0.55; g2.beginPath(); for (let q = 0; q <= C.end; q += 0.2) { const x = X(q), y = Y(at(q)); q ? g2.lineTo(x, y) : g2.moveTo(x, y); } g2.stroke(); g2.globalAlpha = 1;
        g2.strokeStyle = '#ffd34d'; g2.lineWidth = 4; g2.beginPath(); for (let q = 0; q <= t; q += 0.2) { const x = X(q), y = Y(at(q)); q ? g2.lineTo(x, y) : g2.moveTo(x, y); } g2.stroke();
        g2.fillStyle = '#ffd34d'; g2.beginPath(); g2.arc(X(t), Y(at(t)), 5 * S, 0, 7); g2.fill();
      }

      const l2 = () => (ctx.lesson && ctx.lesson()) || null;
      let pmode = false, built = false, playP = 0, sig = '', lastTxt = '';
      const setInfo = (h) => { if (h !== lastTxt) { lastTxt = h; info(h); } };
      const pl = controls.player({
        duration: 14, loop: true, autoplay: false, label: '재생',
        phases: [[0, '']],
        onFrame(p) { if (!built) return; pmode = true; playP = p; },
      });
      built = true;
      const PHASE_NAME = { heat: ['얼음 가열', '녹는 중', '물 가열', '끓는 중', '수증기'], cool: ['액체 냉각', '응고 중', '고체 냉각'] };
      function setKey(key) {
        const C = CURVES[key]; st.key = key; st.seg = -1; st.lastT = 0; sys.prep(C.start); gTitle.textContent = '📈 ' + C.title; setTicks(C);
        bath.visible = bathLab.visible = key === 'cool'; burner.visible = key === 'heat';
      }
      setKey('heat');


      /* ===== 장면 flow(열 흡수 / 열 방출) · life(생활 속 열에너지): 상태가 바뀌는 입자 모형 + 열의 출입 ===== */
      const TRN = {
        melt: { a: 'solid', b: 'liquid', name: '융해', pair: '고체 → 액체', abs: true },
        freeze: { a: 'liquid', b: 'solid', name: '응고', pair: '액체 → 고체', abs: false },
        vap: { a: 'liquid', b: 'gas', name: '기화', pair: '액체 → 기체', abs: true },
        cond: { a: 'gas', b: 'liquid', name: '액화', pair: '기체 → 액체', abs: false },
        sub1: { a: 'solid', b: 'gas', name: '승화', pair: '고체 → 기체', abs: true },
        sub2: { a: 'gas', b: 'solid', name: '승화', pair: '기체 → 고체', abs: false },
      };
      const FLOWSEQ = ['melt', 'freeze', 'vap', 'cond', 'sub1', 'sub2'];
      const LIFE = {
        igloo: { seq: ['freeze'], t: '이글루 안에 물 뿌리기', d: '뿌린 물이 얼면서(응고) 열을 방출해서 이글루 안이 조금 따뜻해져요.' },
        sweat: { seq: ['vap'], t: '땀이 마르면 시원해요', d: '땀이 마르면서(기화) 몸의 열을 흡수해서 시원해져요.' },
        icebox: { seq: ['melt'], t: '아이스박스의 얼음', d: '얼음이 녹으면서(융해) 열을 흡수해서 음료가 시원하게 유지돼요.' },
        aircon: { seq: ['vap', 'cond'], t: '에어컨의 냉매', d: '실내에서 냉매가 기화하며 열을 흡수하고, 실외에서 액화하며 열을 방출해요.' },
        steam: { seq: ['cond'], t: '스팀 난방', d: '수증기가 라디에이터에서 물로 변하면서(액화) 열을 방출해서 방이 따뜻해져요.' },
      };
      let stateTouch = false;
      const trs = { id: '', c: 0, lastKey: '', vid: 'igloo', vt: 0 };
      const trLab = label('', [0, HH + 0.45, 0], { size: 13.5, color: 'rgba(30,64,175,.92)' }), trLab2 = label('', [0, HH + 1.15, 0], { size: 12, color: 'rgba(80,60,160,.92)' });
      function setThermo(v) { tg.visible = tb.visible = col.visible = v; ticks.forEach((tk) => { tk.m.visible = v; tk.l.show(v); }); box.style.display = v ? '' : 'none'; if (!v) subLab.show(false); }
      function transFrame(sc, l, dt, tm) {
        let seq, title = '', desc = '', lessonKey = '';
        if (sc === 'flow') { const TH2 = l && l.TH, sel = TH2 && TH2.arrow; seq = sel && TRN[sel] ? [sel] : FLOWSEQ; lessonKey = sel || '-'; }
        else { const id = trs.vid, o = LIFE[id] || LIFE.igloo; seq = o.seq; title = o.t; desc = o.d; lessonKey = id; }
        const CY = 6, tot = CY * seq.length;
        let c;
        if (pmode) c = (playP * 18) % tot; else { trs.c = (trs.c + Math.min(dt, 0.05)) % tot; c = trs.c; }
        const idx = Math.min(seq.length - 1, Math.floor(c / CY)), q = c - idx * CY, T = TRN[seq[idx]];
        const k = sc + ':' + seq.join(',') + ':' + idx + ':' + (pmode ? 'p' : 'n');
        if (k !== trs.lastKey) { trs.lastKey = k; sys.prep(T.a); }
        const f = Math.max(0, Math.min(1, (q - 0.8) / 3.8)), e = f * f * (3 - 2 * f);
        sys.mix(T.a, T.b, e);
        const running = q > 0.6 && q < 5.2;
        setThermo(false); tLab.show(false);
        burner.visible = T.abs; flame.visible = flame2.visible = T.abs && running; bath.visible = bathLab.visible = !T.abs; const flk = 0.9 + 0.12 * Math.sin(tm * 25); flame.scale.set(1, flk, 1); flame2.scale.set(1, flk * 1.1, 1);
        arrIn.visible = T.abs && running; arrOut.visible = !T.abs && running;
        arrLab.show(running); arrLab.obj = T.abs ? [1.0, -HH - 1.1, 0] : [W + 1.0, -HH + 1.3, 0]; arrLab.set(T.abs ? '🔥 열을 흡수해요' : '❄️ 열을 방출해요');
        arrLab.el.style.background = T.abs ? 'rgba(220,70,40,.92)' : 'rgba(40,100,230,.92)';
        trLab.obj = [0, HH + 0.45, 0]; trLab.set('<b>' + T.name + '</b> (' + T.pair + ') · ' + (T.abs ? '열 흡수' : '열 방출')); trLab.show(true);
        const nm = ['고체', '액체', '기체'], stateName = (s) => (s === 'solid' ? '고체' : s === 'liquid' ? '액체' : '기체');
        trLab2.show(false);
        const ph = document.querySelector('.v3-player .v3-ph'); if (ph) ph.textContent = pmode ? T.name + (T.abs ? ' (열 흡수)' : ' (열 방출)') + (seq.length > 1 && sc === 'life' ? '' : '') : '';
        const why = T.abs ? '입자 사이가 <b>멀어지는</b> 변화라서 열을 <b>흡수</b>해요.' : '입자 사이가 <b>가까워지는</b> 변화라서 열을 <b>방출</b>해요.';
        let txt;
        if (sc === 'flow') txt = '<b>' + T.name + '</b> (' + T.pair + '): ' + why + '<br>융해 · 기화 · 승화(고체→기체)는 열을 <b>흡수</b>하고, 응고 · 액화 · 승화(기체→고체)는 열을 <b>방출</b>해요.' + (lessonKey === '-' ? '<br>여섯 가지 상태 변화를 차례로 보여 줘요.' : '');
        else txt = '<b>' + title + '</b><br>' + desc + '<br>(' + T.name + ': ' + why + ')';
        setInfo(txt);
        sys.step(dt); sys.draw();
        drawGraphClear();
      }
      function drawGraphClear() { }
      return {
        update(dt, tm) {
          const l = l2(), S = l && l.S, sc = S ? S.scene : 'heat';
          if (sc === 'flow' || sc === 'life') {
            if (sc === 'life') { trs.vt += dt; if (trs.vt > 0.25 || !trs.vid) { trs.vt = 0; try { const sv = l.state(); if (sv && sv.viewer) trs.vid = sv.viewer; } catch (e) { /* 무시 */ } } }
            if (sig !== 'T:' + sc) { sig = 'T:' + sc; if (pmode) { pmode = false; pl.pause(); } trs.lastKey = ''; trs.c = 0; stateTouch = true; }
            if (sc === 'life' && trs.vid !== trs.prevVid) { trs.prevVid = trs.vid; trs.c = 0; trs.lastKey = ''; if (pmode) { pmode = false; pl.pause(); } }
            transFrame(sc, l, dt, tm); return;
          }
          if (stateTouch) { stateTouch = false; setThermo(true); tLab.show(true); trLab.show(false); trLab2.show(false); bath.visible = bathLab.visible = st.key === 'cool'; burner.visible = st.key === 'heat'; sys.prep(CURVES[st.key].start); st.seg = -1; st.lastT = 0; }
          const key = sc === 'cool' ? 'cool' : sc === 'heat' ? 'heat' : st.key;
          const R = l && l.RUN && l.RUN[key];
          const k2 = [key, R && R.on, R && R.t > 0, sc].join();
          if (k2 !== sig) { sig = k2; if (pmode) { pmode = false; pl.pause(); } }
          if (key !== st.key) setKey(key);
          const C = CURVES[key];
          let t = pmode ? playP * C.end : (R ? Math.min(R.t, C.end) : 0);
          if (t < st.lastT - 0.3) { sys.prep(C.start); st.seg = -1; }
          st.lastT = t;
          const cur = curveAt(C, t), sg = cur.s, T = cur.T;
          sys.mix(sg.a, sg.b, sg.a === sg.b ? 0 : cur.f);
          if (sg.a === sg.b && sys.mode !== sg.a) sys.set(sg.a, false);
          /* 온도에 따라 입자 빠르기 조금 달라지게 */
          const rel = (T - C.tmin) / (C.tmax - C.tmin);
          SET.solid.noise = 3 + 8 * rel; SET.liquid.sp = 0.8 + 0.7 * rel; SET.liquid.noise = 3 + 8 * rel; SET.gas.sp = 2.4 + 1.6 * rel;
          const ty = yOfT(T, C); col.scale.y = ty - (TY0 - 0.4); col.position.set(TX, (ty + TY0 - 0.4) / 2, 0);
          const running = pmode ? t < C.end - 0.05 : !!(R && R.on);
          const hot = key === 'heat' && running, cold = key === 'cool' && running;
          flame.visible = flame2.visible = hot; const fl = 0.9 + 0.12 * Math.sin(tm * 25); flame.scale.set(1, fl, 1); flame2.scale.set(1, fl * 1.1, 1);
          arrIn.visible = hot; arrOut.visible = cold;
          arrLab.show(hot || cold); arrLab.obj = hot ? [1.0, -HH - 1.1, 0] : [W + 1.0, -HH + 1.3, 0]; arrLab.set(hot ? '🔥 열을 계속 공급' : '열이 물 쪽으로 빠져나가요'); arrLab.el.style.background = hot ? 'rgba(220,70,40,.92)' : 'rgba(40,110,220,.92)';
          tLab.obj = [0, HH + 0.45, 0]; tLab.set(sg.lab + ' · ' + Math.round(T) + ' °C');
          subLab.show(false);
          let txt = '<b>' + sg.lab + '</b> · 온도 <b>' + Math.round(T) + ' °C</b> · ' + t.toFixed(1) + '분<br>';
          if (key === 'heat') txt += sg.flat ? '계속 가열해도 <b>온도가 ' + sg.T0 + ' °C로 일정</b>한 <b>수평 구간</b>이에요(' + sg.name + '). 열은 계속 공급되는데 온도는 그대로예요. 입자 모형이 어떻게 바뀌는지 보세요.' : sg.id === 'ice' ? '입자가 제자리에서 진동해요. 열을 흡수하면 <b>온도가 올라가요</b>.' : sg.id === 'water' ? '입자가 자리를 바꾸며 움직여요. 열을 흡수하면 <b>온도가 올라가요</b>.' : '상태 변화가 모두 끝나 다시 <b>온도가 올라가요</b>.';
          else txt += sg.flat ? '계속 식혀도 <b>온도가 ' + sg.T0 + ' °C로 일정</b>한 <b>수평 구간</b>이에요(' + sg.name + '). 계속 식히는데도 온도가 내려가지 않아요. 입자 모형이 어떻게 바뀌는지 보세요.' : sg.id === 'liq' ? '식으면서 <b>온도가 내려가요</b>.' : '모두 굳은 뒤에야 고체의 <b>온도가 다시 내려가요</b>.';
          setInfo(txt);
          drawGraph(key, t);
          const ph = document.querySelector('.v3-player .v3-ph'); if (ph) ph.textContent = pmode ? PHASE_NAME[key][cur.i] : '';
          sys.step(dt); sys.draw();
        },
        sync() {},
      };
    },
  });
})();
