/* m1-diffusion · 3D 확산과 증발
   확산: 입자는 스스로 쉬지 않고 움직여서, 많은 곳에서 적은 곳으로 저절로 골고루 퍼져요. 온도가 높을수록 입자가 빨라 더 빨리 퍼져요.
   증발: 액체 표면의 입자가 기체가 되어 공기 중으로 날아가요. 아래 막대는 칸마다 들어 있는 잉크·향수 입자의 수예요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN0 = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  window.SciSim3D.attach({
    title: '확산과 증발 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    levels: [0, 1, 2],
    camera: { dist: 10.5 * (PHN0 ? 1.05 : 1), theta: 0.18, phi: 1.2, fov: 45, target: [0, -0.2, 0], min: 5, max: 26 },
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

      const NI = 140, PR = 0.1, NB = 8;
      const LX = 3.8, LY = 1.5, LZ = 1.5;            // 상자 반쪽 크기 (확산)
      const st = { mode: 'ink', T: 20, evap: 0, evapAcc: 0 };
      const speedK = () => Math.sqrt((st.T + 273) / 293);

      /* 확산 상자 (물 / 공기) */
      const tank = new THREE.Group();
      tank.add(new THREE.Mesh(new THREE.BoxGeometry(2 * LX, 2 * LY, 2 * LZ), glass(0xbfe0ff, 0.1)));
      tank.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(2 * LX, 2 * LY, 2 * LZ)), new THREE.LineBasicMaterial({ color: 0x9cc3ff })));
      const water = new THREE.Mesh(new THREE.BoxGeometry(2 * LX - 0.04, 2 * LY - 0.3, 2 * LZ - 0.04), glass(0x4aa8ff, 0.22, { side: THREE.FrontSide })); water.position.y = -0.15; tank.add(water);
      root.add(tank);
      const ink = spheres(NI, PR, 0xffffff, 12);
      const IP = [];
      for (let i = 0; i < NI; i++) IP.push({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 });
      const bars = [], BW = 2 * LX / NB;
      for (let i = 0; i < NB; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(BW * 0.78, 1, 0.5), mat(0x8b5cf6, { roughness: 0.45 })); b.position.set(-LX + BW * (i + 0.5), -LY - 0.4, LZ + 0.9); root.add(b); bars.push(b); }
      const base = new THREE.Mesh(new THREE.BoxGeometry(2 * LX + 0.3, 0.06, 0.7), mat(0x64748b)); base.position.set(0, -LY - 0.43, LZ + 0.9); root.add(base);
      const drop = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 16), mat(0x7c3aed)); drop.rotation.x = Math.PI; drop.position.set(-LX + 0.5, LY + 0.5, 0); root.add(drop);
      const dropLab = label('', drop, { size: 12, offset: [0, 0.6, 0] });
      const barLab = label('칸마다 입자 수', [0, -LY - 0.4, LZ + 0.9], { size: 11, offset: [0, -0.55, 0] });

      /* 증발: 컵 속 액체 */
      const cup = new THREE.Group();
      const EW = 1.4, EH = 2.4;
      const esys = stateSys(150, 0.15, 0xffffff);
      esys.W = EW; esys.H = EH;
      cup.add(boxFrame(EW, EH, 0xdff0ff)); root.add(cup);
      const surf = new THREE.Mesh(new THREE.BoxGeometry(2 * EW - 0.05, 0.02, 2 * EW - 0.05), mat(0x4aa8ff, { transparent: true, opacity: 0.45, depthWrite: false })); root.add(surf);
      const evLab = label('', [0, EH + 0.45, 0], { size: 13, color: 'rgba(30,64,175,.92)' });
      const evLab2 = label('액체 표면 → 기체', [EW + 0.2, -EH + 1.2, 0], { size: 11.5, offset: [0.3, 0, 0] });

      let hasStart = false;
      function restart() {
        if (st.mode === 'evap') {
          esys.prep('liquid'); st.evap = 0; st.evapAcc = 0; let top = -EH; esys.P.forEach((p) => { top = Math.max(top, p.y); }); esys.gasFloor = top + 0.15; return;
        }
        const sx = -LX + 0.5;
        IP.forEach((p) => { p.x = sx + (rnd() - 0.5) * 0.6; p.y = LY - 0.3 - rnd() * (st.mode === 'ink' ? 0.5 : 1.0) + (st.mode === 'ink' ? 0 : -0.7); p.z = (rnd() - 0.5) * 0.7; const b = rnd() * 6.283, c = rnd() * 2 - 1, u = Math.sqrt(1 - c * c); p.vx = Math.cos(b) * u; p.vy = c; p.vz = Math.sin(b) * u; });
        ink.material.color.setHex(st.mode === 'ink' ? 0x7c3aed : 0xff7ab8);
        bars.forEach((b) => b.material.color.setHex(st.mode === 'ink' ? 0x8b5cf6 : 0xff7ab8));
        drop.material.color.setHex(st.mode === 'ink' ? 0x7c3aed : 0xff7ab8);
        dropLab.set(st.mode === 'ink' ? '잉크 한 방울' : '향수병');
      }
      function applyMode() {
        const diff = st.mode !== 'evap';
        ink.visible = diff; tank.visible = diff; drop.visible = diff; bars.forEach((b) => { b.visible = diff; }); base.visible = diff;
        water.visible = st.mode === 'ink'; barLab.show(diff); dropLab.show(diff);
        cup.visible = esys.mesh.visible = surf.visible = !diff; evLab.show(!diff); evLab2.show(!diff);
        restart(); text();
      }
      function text() {
        if (st.mode === 'evap') info('액체 표면의 입자 중 일부가 <b>기체가 되어 날아가요</b> (증발).<br>날아간 입자: <b>' + st.evap + '개</b> · 온도 <b>' + st.T + ' °C</b><br>온도가 높으면 더 많이, 더 빨리 증발해요. 증발은 표면에서만 일어나요.');
        else info((st.mode === 'ink' ? '잉크 입자가' : '향수 입자가') + ' <b>스스로 움직여</b> 많은 곳에서 적은 곳으로 퍼져요 (확산).<br>온도 <b>' + st.T + ' °C</b> · 막대가 고르게 될 때까지 계속 움직여요.<br>' + (st.mode === 'ink' ? '물속에서는 천천히' : '공기 속에서는 더 빨리') + ' 퍼져요.');
      }
      controls.segment('', [{ value: 'ink', label: '💧 잉크(물)' }, { value: 'perfume', label: '🌸 향수(공기)' }, { value: 'evap', label: '☀ 증발' }], 'ink', (v) => { st.mode = v; applyMode(); });
      controls.range('온도', 10, 80, 5, st.T, (v) => { st.T = v; text(); }, (v) => v + ' °C');
      controls.button('↺ 다시 시작', () => restart());
      applyMode();

      let acc = 0, tcount = 0;
      return {
        update(dt, t) {
          const k = speedK();
          if (st.mode !== 'evap') {
            const sp = (st.mode === 'ink' ? 0.9 : 2.6) * k, h = Math.min(dt, 0.05), mix = Math.min(1, h * (st.mode === 'ink' ? 9 : 5));
            const cnt = new Array(NB).fill(0);
            for (let i = 0; i < NI; i++) {
              const p = IP[i];
              /* 방향이 자꾸 바뀌는 불규칙한 움직임 */
              const b = rnd() * 6.283, c = rnd() * 2 - 1, u = Math.sqrt(1 - c * c);
              let vx = p.vx * (1 - mix) + Math.cos(b) * u * mix, vy = p.vy * (1 - mix) + c * mix, vz = p.vz * (1 - mix) + Math.sin(b) * u * mix; const m = Math.hypot(vx, vy, vz) || 1;
              p.vx = vx / m; p.vy = vy / m; p.vz = vz / m;
              p.x += p.vx * sp * h; p.y += p.vy * sp * h; p.z += p.vz * sp * h;
              if (p.x > LX - PR) { p.x = LX - PR; p.vx = -Math.abs(p.vx); } else if (p.x < -LX + PR) { p.x = -LX + PR; p.vx = Math.abs(p.vx); }
              if (p.y > LY - PR) { p.y = LY - PR; p.vy = -Math.abs(p.vy); } else if (p.y < -LY + PR) { p.y = -LY + PR; p.vy = Math.abs(p.vy); }
              if (p.z > LZ - PR) { p.z = LZ - PR; p.vz = -Math.abs(p.vz); } else if (p.z < -LZ + PR) { p.z = -LZ + PR; p.vz = Math.abs(p.vz); }
              put(ink, i, p.x, p.y, p.z, 1); cnt[Math.min(NB - 1, Math.max(0, Math.floor((p.x + LX) / BW)))]++;
            }
            flush(ink);
            for (let i = 0; i < NB; i++) { const hh = Math.max(0.02, cnt[i] / NI * 3.2); bars[i].scale.y = hh; bars[i].position.y = -LY - 0.4 + hh / 2 + 0.03; }
          } else {
            /* 증발: 표면 입자가 확률적으로 기체가 돼요 */
            const rate = 0.5 * Math.pow(1.065, st.T - 20);
            acc += rate * dt * 6; while (acc >= 1) { acc -= 1; let best = null; esys.P.forEach((p) => { if (p.mode === 'liquid' && (!best || p.y > best.y)) best = p; }); if (best) { best.mode = 'gas'; best.tg = SET.gas; best.vx = (rnd() - 0.5) * 1.5; best.vz = (rnd() - 0.5) * 1.5; best.vy = 2.2; st.evap++; } }
            let top = -EH; esys.P.forEach((p) => { if (p.mode === 'liquid') top = Math.max(top, p.y); }); esys.gasFloor = top + 0.12; surf.position.y = top + 0.14;
            SET.liquid.sp = 0.8 + 0.5 * (st.T - 10) / 70; SET.gas.sp = 2.2 + 1.2 * (st.T - 10) / 70;
            esys.step(dt); esys.draw();
            evLab.set('증발한 입자 ' + st.evap + '개');
            tcount += dt; if (tcount > 0.7) { tcount = 0; text(); }
          }
        },
        sync() {},
      };
    },
  });
})();
