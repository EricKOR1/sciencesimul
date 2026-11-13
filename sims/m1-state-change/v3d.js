/* m1-state-change · 3D 상태 변화와 입자 배열
   상태가 변할 때 입자의 '배열'과 '운동'만 달라지고, 입자의 종류와 수(질량)는 그대로예요.
   2D 차시와 같은 여섯 화살표(융해·응고·기화·액화·승화 두 방향)와 '질량·부피' 실험(양초·물·에탄올)을 3D로 보여 줘요.
   3단계(부피와 질량 실험)만 3D예요. 카드를 화살표 · 상자에 끌어 놓는 1 · 2 · 4단계는 2D 화면이에요.
   (2단계에서 이름 카드를 붙이므로, 상태 변화 이름 단추는 실험 장면에서는 숨겨요.) */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN0 = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  window.SciSim3D.attach({
    title: '상태 변화 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    levels: [2],   // 부피와 질량 실험만 3D
    camera: { dist: 9.5 * (PHN0 ? 1.05 : 1), theta: 0.6, phi: 1.15, fov: 45, target: [0, -0.1, 0], min: 5, max: 26 },
    autoRotate: 0.18,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx; const M = ctx.mats;
      /* ---------- 공통 도구 ---------- */
      const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
      const V3 = THREE.Vector3, Yax = new V3(0, 1, 0);
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0.05 }, o || {}));
      const glass = (c, op, o) => mat(c || 0xbfe3ff, Object.assign({ transparent: true, opacity: op || 0.16, roughness: 0.12, metalness: 0, depthWrite: false, side: THREE.DoubleSide }, o || {}));
      const rnd = (() => { let s = 12345; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
      const _m = new THREE.Matrix4(), _c = new THREE.Color();
      function spheres(N, r, color, seg) {
        const m = new THREE.InstancedMesh(new THREE.SphereGeometry(r, seg || 16, Math.round((seg || 16) * 0.75)), mat(color, { roughness: 0.24, metalness: 0, envMapIntensity: 1.15 }), N);
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
        const CM = { solid: new THREE.Color(0x3563d8).convertSRGBToLinear(), liquid: new THREE.Color(0x14a6cf).convertSRGBToLinear(), gas: new THREE.Color(0xf57f1f).convertSRGBToLinear() };   // 화면에서 색이 바래지 않게
        sys.draw = (colorOf) => { for (let i = 0; i < N; i++) { const p = P[i]; put(mesh, i, p.x, p.y, p.z, 1); if (colorOf !== false) mesh.setColorAt(i, CM[p.mode]); } flush(mesh); };
        sys.snap();
        return sys;
      }
      function boxFrame(W, H, color) {
        const g = new THREE.Group();
        const m = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), M.glass({ tint: color || 0xdcefff, opacity: 0.13 })), e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(2, 2, 2)), new THREE.LineBasicMaterial({ color: 0x9cc3ff }));
        g.add(m, e); g.userData.set = (w, h) => g.scale.set(w, h, w); g.userData.set(W, H); return g;
      }

      const PR = 0.17, N = 125, HH = 2.3, W = 1.7;
      const NAME = { solid: '고체', liquid: '액체', gas: '기체' };
      // 2D '상태 변화 6가지의 이름'과 같은 여섯 화살표 (id · 이름 · 방향)
      const CH = {
        melt: { name: '융해', a: 'solid', b: 'liquid' }, freeze: { name: '응고', a: 'liquid', b: 'solid' },
        vap: { name: '기화', a: 'liquid', b: 'gas' }, cond: { name: '액화', a: 'gas', b: 'liquid' },
        sub1: { name: '승화', a: 'solid', b: 'gas' }, sub2: { name: '승화', a: 'gas', b: 'solid' },
      };
      // 2D '상태가 변하면 부피와 질량은?' 실험 (밀폐 용기, 질량 g · 부피 mL)
      const EX = {
        wax: { name: '양초', a: 'liquid', b: 'solid', mass: 121.0, vA: 44, vB: 40, note: '녹인 양초가 담긴 밀폐 용기' },
        water: { name: '물', a: 'liquid', b: 'solid', mass: 100.0, vA: 40, vB: 44, note: '물이 가득 담긴 밀폐 병' },
        eth: { name: '에탄올', a: 'liquid', b: 'gas', mass: 3.0, vA: 1, vB: 500, note: '에탄올 몇 방울이 든 비닐봉지' },
      };
      const sm = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
      const expVol = (e, f, key) => (key === 'eth' ? 1 + 499 * Math.pow(f, 1.6) : e.vA + (e.vB - e.vA) * sm((f - 0.15) / 0.8));
      const sys = stateSys(N, PR, 0xffffff), st = { key: 'melt', t: 0, phase: 'wait', mode: 'theater', exp: 'wax', expMode: '' };
      sys.H = HH; sys.W = W;
      const frame = boxFrame(W, HH); root.add(frame);
      /* 금속 모서리 기둥과 테두리 (상자 크기에 맞춰 늘어나요) */
      { const fm = M.metal('steel', { roughness: 0.22 });
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2, 8), fm); p.position.set(sx, 0, sz); frame.add(p); }
        for (const sy of [-1, 1]) { for (const sx of [-1, 1]) { const a = new THREE.Mesh(new THREE.BoxGeometry(2, 0.03, 0.05), fm); a.position.set(0, sy, sx); const b = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 2), fm); b.position.set(sx, sy, 0); frame.add(a, b); } } }
      /* 받침: 나뭇결 책상 + 가열/냉각 판 (상자 크기가 바뀌면 함께 움직여요) */
      const stand = new THREE.Group(); stand.position.y = -HH - 0.12; root.add(stand);
      const woodT = canvasTex(512, 512, (c, w, h) => { c.fillStyle = '#9a6234'; c.fillRect(0, 0, w, h); for (let i = 0; i < 80; i++) { c.strokeStyle = 'rgba(' + (60 + (i * 31) % 50) + ',30,10,' + (0.1 + (i % 4) * 0.05) + ')'; c.lineWidth = 1 + (i % 3); c.beginPath(); const y = i / 80 * h; c.moveTo(0, y); for (let x = 0; x <= w; x += 32) c.lineTo(x, y + Math.sin(x * 0.04 + i) * 3); c.stroke(); } });
      const table = new THREE.Mesh(new THREE.CylinderGeometry(7.5, 7.5, 0.35, 64), M.wood(0x8f6a48, { repeat: 3 })); table.position.y = -0.62; table.receiveShadow = true; stand.add(table);
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.4, 0.2, 64), M.metal('steel', { brushed: true, repeat: 3 })); stand.add(plate);
      const hpBody = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.7, 0.4, 64), M.metal(0x2a303a, { roughness: 0.42 })); hpBody.position.y = -0.3; stand.add(hpBody);
      const coilMat = mat(0x553322, { emissive: 0xff5a1f, emissiveIntensity: 0, roughness: 0.5 });
      const coil = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.07, 10, 64), coilMat); coil.rotation.x = Math.PI / 2; coil.position.y = -0.08; stand.add(coil);
      const coil2 = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.07, 10, 48), coilMat); coil2.rotation.x = Math.PI / 2; coil2.position.y = -0.08; stand.add(coil2);
      const coil3 = new THREE.Mesh(new THREE.TorusGeometry(3.6, 0.08, 10, 64), coilMat); coil3.rotation.x = Math.PI / 2; coil3.position.y = -0.12; stand.add(coil3);
      const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.2, 24), M.plastic(0x14171c)); knob.rotation.x = Math.PI / 2; knob.position.set(0, -0.3, 3.7); stand.add(knob);
      { const mk = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.2, 0.02), M.plastic(0xf1f5f9)); mk.position.set(0, -0.22, 3.81); stand.add(mk);   // 조절 손잡이 눈금 · 표시등 · 고무 발
        for (let i = 0; i < 4; i++) { const a = Math.PI / 4 + i * Math.PI / 2, ft = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.14, 20), M.rubber()); ft.position.set(Math.cos(a) * 3.1, -0.5, Math.sin(a) * 3.1); stand.add(ft); }
        const rimR = new THREE.Mesh(new THREE.TorusGeometry(3.3, 0.045, 10, 72), M.metal('chrome')); rimR.rotation.x = Math.PI / 2; rimR.position.y = 0.1; stand.add(rimR); }
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), M.emissive(0xff5a1f, 1.6)); led.position.set(0.6, -0.3, 3.62); stand.add(led);
      const heatGlow = ctx.halo(stand, 0xff7a30, 8.5, 0.3); heatGlow.position.y = 0.15;
      let heatDir = 0;       // +1 가열(열을 얻어요) · -1 냉각 · 0 꺼짐
      const wallT = canvasTex(8, 256, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#26364f'); g.addColorStop(1, '#0f1a2c'); c.fillStyle = g; c.fillRect(0, 0, w, h); });
      const wallM = new THREE.Mesh(new THREE.PlaneGeometry(80, 40), new THREE.MeshBasicMaterial({ map: wallT })); wallM.position.set(0, 6, -14); root.add(wallM);
      const nameLab = label('', [0, HH + 0.5, 0], { size: 14, color: 'rgba(30,64,175,.92)' });
      const cntLab = label('입자 ' + N + '개', [-W, -HH, W], { size: 11.5, offset: [-0.2, -0.45, 0.2] });
      const massLab = label('', [2.6, -HH + 0.3, 0], { size: 12.5, color: 'rgba(20,90,70,.92)' });
      const volLab = label('', [2.6, -HH + 1.0, 0], { size: 12.5, color: 'rgba(30,64,175,.92)' });
      const l2 = () => (ctx.lesson && ctx.lesson()) || null;
      let lastTxt = ''; const setInfo = (h) => { if (h !== lastTxt) { lastTxt = h; info(h); } };
      let pmode = false, built = false;

      function setBox(w, h) { sys.W = w; sys.H = h; frame.userData.set(w, h); stand.position.y = -h - 0.12; nameLab.obj = [0, h + 0.5, 0]; cntLab.obj = [-w, -h, w]; }
      function start(key) {
        const c = CH[key]; st.key = key; st.t = 0; st.phase = 'wait'; st.mode = 'theater';
        setBox(W, HH); sys.prep(c.a);
        nameLab.set(c.name + ' (' + NAME[c.a] + ' → ' + NAME[c.b] + ')');
        massLab.show(false); volLab.show(false); cntLab.show(true);
        text();
      }
      function text() {
        const c = CH[st.key], now = st.phase === 'done' ? c.b : c.a;
        setInfo('<b>' + c.name + '</b>: ' + NAME[c.a] + ' → ' + NAME[c.b] + '<br>지금은 <b>' + NAME[now] + '</b> 상태예요. 상태가 변하면 입자의 <b>배열과 운동</b>이 달라져요.<br>입자의 종류와 수는 그대로여서 <b>질량은 변하지 않아요</b>.' + (st.key === 'sub1' || st.key === 'sub2' ? '<br>승화는 액체를 거치지 않고 고체 ⇄ 기체로 곧바로 변하는 두 방향의 변화예요.' : ''));
      }
      function toExp(key) {
        const e = EX[key]; st.mode = 'exp'; st.exp = key; st.expMode = '';
        sys.prep(e.a); setBox(1.7, 2.0); nameLab.set(e.name + ' 실험 · ' + e.note); massLab.show(true); volLab.show(true); cntLab.show(true);
      }
      function showExp(f) {
        const e = EX[st.exp], V = expVol(e, f, st.exp);
        const g = st.exp === 'eth' ? Math.max(0, Math.min(1, (V - 1) / 499)) : 0;
        const w = st.exp === 'eth' ? 1.45 + 1.1 * g : 1.7 * Math.cbrt(V / e.vA), h = st.exp === 'eth' ? 1.8 + 0.9 * g : 2.0 * Math.cbrt(V / e.vA);
        setBox(w, h);
        sys.mix(e.a, e.b, f);
        massLab.set('⚖️ 질량 ' + e.mass.toFixed(1) + ' g'); volLab.set('부피 ' + (st.exp === 'eth' ? (V < 5 ? '1' : '약 ' + Math.round(V / 10) * 10) : Math.round(V)) + ' mL');
        massLab.obj = [w + 0.9, -h + 0.5, 0]; volLab.obj = [w + 0.9, -h + 1.3, 0];
        setInfo('<b>' + e.name + '</b>: ' + NAME[e.a] + ' → ' + NAME[e.b] + ' (밀폐 용기)<br>상태가 변하기 전과 후의 <b>질량</b>과 <b>부피</b>를 비교해 보세요. 입자의 수와 배열도 살펴봐요.');   // 퀴즈의 답(질량 그대로 · 거리가 멀어짐)은 미리 쓰지 않아요
      }
      const seg = controls.segment('', [
        { value: 'melt', label: '융해' }, { value: 'freeze', label: '응고' }, { value: 'vap', label: '기화' }, { value: 'cond', label: '액화' }, { value: 'sub1', label: '승화(고→기)' }, { value: 'sub2', label: '승화(기→고)' },
      ], 'melt', (v) => { start(v); pmode = false; pl.pause(); const l = l2(); if (l && l.playArrow) l.playArrow(v); });
      /* ▶ 재생: 고르거나 보고 있는 변화를 처음 상태 → 변하는 중 → 변한 뒤로 반복 (실험 장면은 처음 → 나중 → 처음) */
      const pl = controls.player({
        duration: 8, loop: true, autoplay: false, label: '재생',
        phases: [[0, '처음 상태'], [0.25, '변하는 중'], [0.5, '변한 뒤'], [0.9, '처음으로']],
        onFrame(p) { if (!built) return; pmode = true; playP = p; },
      });
      built = true;
      const segBs = Array.from(document.querySelectorAll('.v3-ctl button')).filter((b) => /^(융해|응고|기화|액화|승화)/.test(b.textContent.trim()));
      let playP = 0, vTick = 0, lastArrow = null, lastScene = '', wantB = false;
      start('melt');
      /* 3D 화면 오른쪽 위의 작은 판 (휴대폰에서는 오른쪽 아래): 2D 화면의 표 · 기록을 3D에서도 보여 줘요 */
      function v3xPan(cls) { const vEl = ctx.renderer.domElement.parentElement;
        if (!document.getElementById('v3x-css')) { const c = document.createElement('style'); c.id = 'v3x-css'; c.textContent =
          '.v3x-pan{position:absolute;right:10px;top:10px;max-width:52%;padding:6px 9px;border-radius:12px;background:rgba(8,12,24,.76);color:#fff;font-size:12px;line-height:1.35;pointer-events:none;z-index:2}' +
          '.v3x-pan .h{font-weight:800;margin-bottom:3px}.v3x-pan table{border-collapse:collapse}.v3x-pan th,.v3x-pan td{padding:1px 5px;text-align:left;white-space:nowrap}.v3x-pan th{color:#9fb0cc;font-weight:700;font-size:11px}.v3x-pan .q{color:#7d8aa3}.v3x-pan .now td{background:rgba(255,255,255,.1)}' +
          '.v3x-pan .c{display:inline-block;margin:1px 2px;padding:1px 6px;border-radius:8px;background:rgba(255,255,255,.14)}.v3x-pan .ok{color:#86efac}.v3x-pan .bad{color:#fca5a5}' +
          '@media (max-width:599px){.v3x-pan{top:auto;bottom:28px;right:6px;font-size:10.5px;max-width:64%;padding:4px 6px}.v3x-pan th{font-size:9.5px}.v3x-pan th,.v3x-pan td{padding:0 3px}}';
          document.head.appendChild(c); }
        const el = document.createElement('div'); el.className = 'v3x-pan' + (cls ? ' ' + cls : ''); el.style.display = 'none'; vEl.appendChild(el);
        let sig = null; return { set(h) { if (h === sig) return; sig = h; el.style.display = h ? '' : 'none'; if (h) el.innerHTML = h; }, el }; }
      const tbl = v3xPan();
      function drawTbl() {
        const l = l2(), rows = st.mode === 'exp' && l && l.expRows ? l.expRows() : null;
        if (!rows) { tbl.set(''); return; }
        const vt = (k, v) => (k === 'eth' ? (v < 5 ? '1' : '약 ' + v) : '' + v);
        tbl.set('<div class="h">📋 실험 결과</div><table><tr><th></th><th>질량(g) 처음→나중</th><th>부피(mL) 처음→나중</th></tr>' + rows.map((r) => { const d = r.mA != null;
          return '<tr' + (r.k === st.exp ? ' class="now"' : '') + '><td>' + r.icon + ' ' + r.name + '</td><td>' + r.mB.toFixed(1) + ' → ' + (d ? r.mA.toFixed(1) : '<span class="q">?</span>') + '</td><td>' + vt(r.k, r.vB) + ' → ' + (d ? vt(r.k, r.vA) + (r.vA > r.vB ? ' ▲' : ' ▼') : '<span class="q">?</span>') + '</td></tr>'; }).join('') + '</table>');
      }

      return {
        update(dt) {
          const l = l2(); vTick += dt;
          let scene = lastScene;
          if (l && l.state && vTick > 0.15) {
            vTick = 0; const s = l.state(); scene = s.scene; const arrow = s.th && s.th.arrow;
            if (scene !== lastScene) { lastScene = scene; pmode = false; pl.pause(); if (scene === 'exp') toExp(s.exp ? s.exp.key : 'wax'); else if (st.mode === 'exp') start(st.key); }
            if (scene === 'exp' && s.exp && s.exp.key !== st.exp) { toExp(s.exp.key); pmode = false; pl.pause(); }
            if (scene !== 'exp' && arrow && arrow !== lastArrow && CH[arrow]) { start(arrow); seg.set(arrow); pmode = false; pl.pause(); }
            lastArrow = arrow;
          }
          segBs.forEach((b) => { b.style.display = st.mode === 'exp' ? 'none' : ''; });   // 실험 장면에서는 상태 변화 이름 단추를 숨겨요
          if (st.mode === 'exp') {
            const f = pmode ? (playP < 0.45 ? sm(playP / 0.45) : playP < 0.55 ? 1 : 1 - sm((playP - 0.55) / 0.35)) : (l && l.X ? l.X.f : 0);
            showExp(Math.max(0, Math.min(1, f)));
          } else {
            if (pmode) {
              // p로 단계를 정해요: 처음 상태(0~0.25) → 변하는 중 → 변한 뒤
              const wb = playP >= 0.25 && playP < 0.9;
              if (wb !== wantB) { wantB = wb; const c = CH[st.key]; if (wb) { sys.set(c.b, c.b === 'gas'); st.phase = 'done'; } else { sys.prep(c.a); st.phase = 'wait'; } text(); }
            } else {
              st.t += dt;
              if (st.phase === 'wait' && st.t > 1.6) { st.phase = 'done'; sys.set(CH[st.key].b, CH[st.key].b === 'gas'); text(); }
              wantB = st.phase === 'done';
            }
          }
          { const rank = { solid: 0, liquid: 1, gas: 2 }; let a, b;
            if (st.mode === 'exp') { const e = EX[st.exp]; a = e.a; b = e.b; } else { const c = CH[st.key]; a = c.a; b = c.b; }
            heatDir = rank[b] > rank[a] ? 1 : -1; const k = 0.55 + 0.45 * Math.sin(performance.now() * 0.004);
            coilMat.emissive.setHex(heatDir > 0 ? 0xff5a1f : 0x4cc2ff); coilMat.color.setHex(heatDir > 0 ? 0x7a2a12 : 0x2a5f80); coilMat.emissiveIntensity = 0.6 + 0.9 * k;
            led.material.color.setHex(heatDir > 0 ? 0xff5a1f : 0x4cc2ff); led.material.emissive.setHex(heatDir > 0 ? 0xff5a1f : 0x4cc2ff); heatGlow.material.color.setHex(heatDir > 0 ? 0xff7a30 : 0x58c4ff); heatGlow.material.opacity = 0.2 + 0.14 * k; }
          sys.step(dt); sys.draw();
          drawTbl();
          const ph = document.querySelector('.v3-player .v3-ph');
          if (ph && st.mode === 'exp') ph.textContent = pmode ? (playP < 0.45 ? (EX[st.exp].b === 'gas' ? '가열' : '식히기') : playP < 0.55 ? '변한 뒤' : '되돌리기') : '';
        },
        sync() {},
      };
    },
  });
})();
