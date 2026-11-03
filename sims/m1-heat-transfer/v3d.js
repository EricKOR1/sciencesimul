/* m1-heat-transfer · 3D 열의 이동 (전도 · 대류 · 복사)
   2D 실험과 같은 장면·같은 값을 3D로 보여 줘요 (2D 상태 window.__sim을 그대로 읽어요):
   전도 = 구리·철·나무 막대(한쪽 끝 가열) · 대류 = 비커 속 물(아래 가열)과 교실(난방기 위·가운데·아래) · 복사 = 난로, 검은 컵·흰 컵, 공기 빼기, 은박지.
   조작은 옆의 2D 조작판으로 하고, ▶ 재생은 지금 장면의 한 번의 변화를 반복해서 보여 줘요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN0 = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  window.SciSim3D.attach({
    title: '열의 이동 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    levels: [0, 1, 2],
    camera: { dist: 14 * (PHN0 ? 1.05 : 1), theta: 0.45, phi: 1.3, fov: 45, target: [0, 0, 0], min: 5, max: 26 },
    autoRotate: 0.08,
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      const V3 = THREE.Vector3, Yax = new V3(0, 1, 0);
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0.05 }, o || {}));
      const glass = (c, op, o) => mat(c || 0xbfe3ff, Object.assign({ transparent: true, opacity: op || 0.16, roughness: 0.12, metalness: 0, depthWrite: false, side: THREE.DoubleSide }, o || {}));
      const rnd = (() => { let s = 12345; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
      const _m = new THREE.Matrix4(), _c = new THREE.Color();
      const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
      const L2 = () => (ctx.lesson && ctx.lesson()) || null;
      function spheres(N, r, color, seg, parent) {
        const m = new THREE.InstancedMesh(new THREE.SphereGeometry(r, seg || 16, Math.round((seg || 16) * 0.75)), mat(color, { roughness: 0.55, metalness: 0 }), N);
        m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; m.castShadow = true;
        for (let i = 0; i < N; i++) m.setColorAt(i, _c.set(0xffffff));
        (parent || root).add(m); return m;
      }
      function put(m, i, x, y, z, s) { s = s === undefined ? 1 : s; _m.makeScale(s, s, s); _m.setPosition(x, y, z); m.setMatrixAt(i, _m); }
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
      const erfc = (x) => { const z = Math.abs(x), t = 1 / (1 + 0.5 * z), r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277))))))))); return x >= 0 ? r : 2 - r; };

      const cCold = new THREE.Color(0x5b8def), cHot = new THREE.Color(0xff4a2a), cc = new THREE.Color();
      const heatCol = (t) => cc.copy(cCold).lerp(cHot, clamp(t, 0, 1));
      const flameMat = () => new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.9 });
      function mkFlame(s) { const g = new THREE.Group(); const a = new THREE.Mesh(new THREE.ConeGeometry(0.32 * s, 0.9 * s, 20), flameMat()); a.position.y = 0.45 * s; const b = new THREE.Mesh(new THREE.ConeGeometry(0.17 * s, 0.55 * s, 16), new THREE.MeshBasicMaterial({ color: 0xffe082 })); b.position.y = 0.28 * s; g.add(a, b); g.userData = { a, b }; return g; }

      const LG = { cond: [], beaker: [], room: [], rad: [] };
      const G = { cond: new THREE.Group(), beaker: new THREE.Group(), room: new THREE.Group(), rad: new THREE.Group() };
      Object.keys(G).forEach((k) => root.add(G[k]));
      const NAMES = ['구리', '철', '나무'], RODCOL = [0xe39a45, 0x8b95a7, 0xb88a54];

      /* ===== 1) 전도: 구리·철·나무 막대 (2D와 같은 세 막대) ===== */
      const cond = G.cond;
      const NC = 14, GAP = 0.5, RR = 0.15, X0 = -(NC - 1) * GAP / 2, ZR = [1.75, 0, -1.75];   // 위에서부터 구리·철·나무 (2D와 같은 순서)
      const rodMesh = spheres(3 * NC * 9, RR, 0xffffff, 12, cond);
      ZR.forEach((z, r) => {
        const sh = new THREE.Mesh(new THREE.BoxGeometry(NC * GAP + 0.1, 1.15, 1.15), glass(0xcfe6ff, 0.1)); sh.position.y = z; cond.add(sh);
        const e = new THREE.LineSegments(new THREE.EdgesGeometry(sh.geometry), new THREE.LineBasicMaterial({ color: RODCOL[r] })); e.position.y = z; cond.add(e);
      });
      const heater = new THREE.Mesh(new THREE.BoxGeometry(0.55, 5.6, 1.5), mat(0x475569, { metalness: 0.5, roughness: 0.4, emissive: 0x000000 })); heater.position.set(X0 - 0.55, 0, 0); cond.add(heater);
      const flame1 = mkFlame(1.1); flame1.position.set(X0 - 0.55, -3.45, 0); cond.add(flame1);
      const burner1 = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.55, 0.45, 20), mat(0x475569, { metalness: 0.6, roughness: 0.4 })); burner1.position.set(X0 - 0.55, -3.9, 0); cond.add(burner1);
      const arrC = mkArrow(0xffb020, 0.07); setArrow(arrC, new V3(X0 + 0.5, 3.1, 0), new V3(-X0 - 0.3, 3.1, 0)); cond.add(arrC);
      LG.cond.push(label('열이 이동해요', [0, 3.1, 0], { size: 12, offset: [0, 0.4, 0] }));
      const rodLab = ZR.map((z, r) => { const l = label('', [-X0 + 0.15, z + 0.0, 0], { offset: [1.25, 0, 0], size: 11.5, color: 'rgba(40,50,70,.9)' }); LG.cond.push(l); return l; });
      const baseV = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < NC; c++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) baseV.push([X0 + c * GAP, ZR[r] + (j - 1) * 0.36, (k - 1) * 0.36, r, c, rnd() * 6.28, rnd() * 6.28, rnd() * 6.28]);
      const TMAX = 100, T0 = 20;
      const rodT = [[], [], []];      // 칸별 0~1
      function rodsFromLesson(l) {
        l.RODS.forEach((rd, r) => { const n = rd.T.length; for (let c = 0; c < NC; c++) { const f = c / (NC - 1) * (n - 1), i = Math.min(n - 2, Math.floor(f)), k = f - i; rodT[r][c] = clamp(((rd.T[i] * (1 - k) + rd.T[i + 1] * k) - T0) / (TMAX - T0), 0, 1); } });
      }
      const ALPHA = [0.27, 0.09, 0.005], TD = 8;   // 2D 막대와 같은 열 전달 빠르기, 가열 시간(화면 초)
      function rodsDemo(p) {
        const heatP = 0.82;
        for (let r = 0; r < 3; r++) for (let c = 0; c < NC; c++) {
          const x = c / (NC - 1), ts = Math.min(p, heatP) / heatP * TD;
          let v = ts < 0.02 ? (c === 0 ? 1 : 0) : erfc(x / (2 * Math.sqrt(ALPHA[r] * ts)));
          if (p > heatP) { const q = (p - heatP) / (1 - heatP), s = q * q * (3 - 2 * q); v *= 1 - s; }
          rodT[r][c] = v;
        }
      }

      /* ===== 2) 대류 (1): 비커 속 물 — 아래에서 가열 ===== */
      const beaker = G.beaker;
      const BR = 2.1, BH = 2.2, NP = 120;
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(BR, BR * 0.96, 2 * BH, 56, 1, true), glass(0xcfe6ff, 0.2)); beaker.add(cup);
      const wat = new THREE.Mesh(new THREE.CylinderGeometry(BR - 0.03, BR * 0.96 - 0.03, 2 * BH - 0.3, 56), glass(0x4aa8ff, 0.14, { side: THREE.FrontSide })); wat.position.y = -0.15; beaker.add(wat);
      const bot = new THREE.Mesh(new THREE.CylinderGeometry(BR * 0.96, BR * 0.96, 0.12, 56), mat(0xb7c2d4, { metalness: 0.3 })); bot.position.y = -BH - 0.06; beaker.add(bot);
      const flame2 = mkFlame(1.3); flame2.position.set(0, -BH - 0.35, 0); beaker.add(flame2);
      const burner2 = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 0.5, 20), mat(0x475569, { metalness: 0.6, roughness: 0.4 })); burner2.position.set(0, -BH - 0.65, 0); beaker.add(burner2);
      const cp = spheres(NP, 0.11, 0xffffff, 10, beaker), CP = [];
      for (let i = 0; i < NP; i++) CP.push({ al: rnd() * 6.283, ph: rnd() * 6.283, s: 0.25 + 0.75 * rnd() });
      LG.beaker.push(label('따뜻한 물은 위로', [0, BH * 0.7, 0], { size: 11.5, offset: [-0.8, 0.2, 0] }));
      LG.beaker.push(label('찬물은 아래로', [BR * 0.85, -BH * 0.4, 0], { size: 11.5, offset: [0.2, 0, 0] }));
      LG.beaker.push(label('알코올램프', flame2, { size: 11.5, offset: [0, -1.3, 0] }));

      /* ===== 3) 대류 (2): 교실 — 난방기 위치(위·가운데·아래)와 에어컨 ===== */
      const room = G.room;
      const RW = 3.4, RHH = 2.0, RD2 = 1.5, NRM = 150;       // 방 반너비/반높이/반깊이
      const RNX = 30, RNY = 20;
      { const b = new THREE.Mesh(new THREE.BoxGeometry(2 * RW, 2 * RHH, 2 * RD2), glass(0xdbeafe, 0.08)); room.add(b);
        room.add(new THREE.LineSegments(new THREE.EdgesGeometry(b.geometry), new THREE.LineBasicMaterial({ color: 0x9cc3ff })));
        const fl = new THREE.Mesh(new THREE.BoxGeometry(2 * RW + 0.4, 0.14, 2 * RD2 + 0.4), mat(0x94a3b8, { roughness: 0.8 })); fl.position.y = -RHH - 0.08; room.add(fl); }
      const wallM = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2 * RHH - 0.1, 2 * RD2 - 0.1), mat(0x7ab8ff, { transparent: true, opacity: 0.55, emissive: 0x000000 })); wallM.position.x = RW - 0.06; room.add(wallM);
      const heaterM = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.62, 1.6), mat(0x6b7280, { metalness: 0.4, emissive: 0x000000 })); room.add(heaterM);
      const acM = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.4, 0.9), mat(0xe5e7eb, { metalness: 0.2 })); acM.position.set(-RW + (11 + 18) / 2 / RNX * 2 * RW, RHH - 0.35, 0); room.add(acM);
      const rp = spheres(NRM, 0.075, 0xffffff, 8, room), RZ = [];
      for (let i = 0; i < NRM; i++) RZ.push((rnd() * 2 - 1) * (RD2 - 0.2));
      const heaterLab = label('난방기', heaterM, { size: 11.5, offset: [0.2, 0.55, 0] }); LG.room.push(heaterLab);
      const acLab = label('에어컨', acM, { size: 11.5, offset: [0, -0.55, 0] }); LG.room.push(acLab);
      const wallLab = label('차가운 벽(창가)', [RW, RHH + 0.2, 0], { size: 11, offset: [-0.2, 0, 0] }); LG.room.push(wallLab);
      const upLab = label('', [-RW + 0.8, RHH - 0.5, RD2], { size: 11.5, color: 'rgba(40,50,70,.9)' }); LG.room.push(upLab);
      const loLab = label('', [-RW + 0.8, -RHH + 0.5, RD2], { size: 11.5, color: 'rgba(40,50,70,.9)' }); LG.room.push(loLab);

      /* ===== 4) 복사: 난로 → 검은 컵·흰 컵 (공기 빼기, 은박지) ===== */
      const rad = G.rad;
      const stove = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.9, 1.9), mat(0x475569, { metalness: 0.5, roughness: 0.4, emissive: 0x000000 })); stove.position.set(-4.2, 0, 0); rad.add(stove);
      const coil = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.3, 1.4), new THREE.MeshBasicMaterial({ color: 0x555b66 })); coil.position.set(-3.5, 0, 0); rad.add(coil);
      const glowTex = canvasTex(128, 128, (c) => { const g = c.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,230,140,1)'); g.addColorStop(0.25, 'rgba(255,190,60,.55)'); g.addColorStop(1, 'rgba(255,160,0,0)'); c.fillStyle = g; c.fillRect(0, 0, 128, 128); });
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); glow.scale.set(5, 5, 1); glow.position.set(-3.5, 0, 0); rad.add(glow);
      const cups = [{ z: -0.8, base: 0x2b2f38, name: '검은 컵' }, { z: 0.8, base: 0xf1f3f6, name: '흰 컵' }].map((o) => {
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.55, 1.3, 32), mat(o.base, { roughness: 0.5, emissive: 0x000000 })); body.position.set(3.4, -0.4, o.z); rad.add(body);
        const water = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.05, 32), mat(0x4aa8ff, { roughness: 0.2 })); water.position.set(3.4, 0.27, o.z); rad.add(water);
        const lab = label('', body, { size: 12, offset: [0, 1.15, 0] }); LG.rad.push(lab);
        return { body, water, lab, name: o.name };
      });
      const chamber = new THREE.Mesh(new THREE.BoxGeometry(9.4, 2.6, 3.2), glass(0xbfe0ff, 0.08)); chamber.position.set(-0.1, 0, 0); rad.add(chamber);
      { const ce = new THREE.LineSegments(new THREE.EdgesGeometry(chamber.geometry), new THREE.LineBasicMaterial({ color: 0x9cc3ff })); ce.position.copy(chamber.position); rad.add(ce); }
      const foil = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.2, 2.8), mat(0xe5e7eb, { metalness: 1, roughness: 0.12 })); foil.position.set(1.2, 0, 0); rad.add(foil);
      const NAIR = 80, airP = spheres(NAIR, 0.07, 0x9db6d8, 8, rad), AP = [];
      for (let i = 0; i < NAIR; i++) AP.push({ x: -3.0 + rnd() * 7.0, y: (rnd() * 2 - 1) * 1.1, z: (rnd() * 2 - 1) * 1.4, vx: rnd() - 0.5, vy: rnd() - 0.5, vz: rnd() - 0.5 });
      const NR = 16, rays = [];
      for (let i = 0; i < NR; i++) { const c = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0.9 })); rad.add(c); rays.push({ m: c, u: i / NR, y: (rnd() * 2 - 1) * 0.8, z: (rnd() * 2 - 1) * 1.2 }); }
      LG.rad.push(label('난로(열원)', stove, { size: 12, offset: [0, 1.4, 0] }));
      const foilLab = label('은박지', foil, { size: 11.5, offset: [0, 1.5, 0] }); LG.rad.push(foilLab);
      const vacLab = label('', [0, 1.6, 0], { size: 11.5 }); LG.rad.push(vacLab);
      let radP = { stove: false, stoveK: 0, vac: false, vacK: 0, foil: false, Tb: 20, Tw: 20, u: 0 };

      /* ---- ▶ 재생: 지금 장면의 한 번의 변화를 반복 (2D 조작이 있으면 2D 상태가 우선) ---- */
      const player = { p: 0, on: false };
      let built = false, sig = '', mode = 'cond', pmode = false;
      const pl = controls.player({
        duration: 12, loop: true, autoplay: false, label: '재생',
        phases: [[0, '']],
        onFrame(p) { if (!built) return; pmode = true; player.p = p; },
      });
      built = true;
      const phEl = () => document.querySelector('.v3-player .v3-ph');
      const PHN = {
        cond: [[0, '가열 시작'], [0.3, '열이 퍼져요'], [0.82, '식는 중']],
        beaker: [[0, '아래를 가열'], [0.5, '순환']],
        rad: [[0, '난로 켜기'], [0.3, '공기 빼기'], [0.6, '은박지 놓기'], [0.9, '식는 중']],
      };
      const phaseOf = (m, p) => { let n = ''; (PHN[m] || []).forEach(([a, s]) => { if (p >= a - 1e-6) n = s; }); return n; };

      let lastTxt = '';
      const setInfo = (h) => { if (h !== lastTxt) { lastTxt = h; info(h); } };
      const fmt1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
      const POSN = { top: '위', mid: '가운데', bottom: '아래' };

      function setMode(v) {
        mode = v; Object.keys(G).forEach((k) => { G[k].visible = k === v; });
        Object.keys(LG).forEach((k) => LG[k].forEach((l) => l.show(k === v)));
        orbit.dist = (PHN0 ? 1.05 : 1) * { cond: 14, beaker: 10.5, room: 11, rad: 12.5 }[v];
      }
      setMode('cond');

      return {
        update(dt, t) {
          const l = L2(), S = l && l.S;
          const sc = S ? S.scene : 'cond';
          let m = sc === 'cond' ? 'cond' : sc === 'rad' ? 'rad' : sc === 'beaker' ? 'beaker' : sc === 'room' ? 'room' : mode;
          const C = l && l.C, BK = l && l.BK, RM = l && l.RM, RD = l && l.RD;
          // 2D에서 조작하면 ▶ 재생을 멈추고 2D 상태를 따라가요
          const key = [sc, C && C.heat, C && C.cooling, BK && BK.on, RM && RM.pos, RM && RM.on, RM && RM.mode, RD && RD.stove, RD && RD.vac, RD && RD.foil].join();
          if (key !== sig) { sig = key; if (pmode) { pmode = false; pl.pause(); } }
          const demoMode = pmode ? (m === 'room' ? 'beaker' : m) : m;
          if (demoMode !== mode) setMode(demoMode);
          const h = Math.min(dt, 0.05), p = player.p;
          const ph = phEl(); if (ph) ph.textContent = pmode ? phaseOf(mode, p) : '';

          if (mode === 'cond') {
            if (pmode) rodsDemo(p); else if (l && l.RODS) rodsFromLesson(l); else for (let r = 0; r < 3; r++) for (let c = 0; c < NC; c++) rodT[r][c] = 0;
            const heating = pmode ? p < 0.82 : !!(C && C.heat);
            baseV.forEach((b, i) => { const Tc = rodT[b[3]][b[4]] || 0, a = 0.012 + 0.12 * Tc, w = 14 + 22 * Tc; put(rodMesh, i, b[0] + Math.sin(t * w + b[5]) * a, b[1] + Math.sin(t * w * 1.1 + b[6]) * a, b[2] + Math.sin(t * w * 0.9 + b[7]) * a, 1); rodMesh.setColorAt(i, heatCol(Tc * 1.05)); });
            flush(rodMesh);
            flame1.visible = heating; flame1.scale.set(1, 0.9 + 0.12 * Math.sin(t * 25), 1);
            heater.material.emissive.setRGB(heating ? 0.55 : 0, heating ? 0.12 : 0, 0);
            arrC.visible = heating; LG.cond[0].show(heating);
            rodLab.forEach((lb, r) => { const T = T0 + (TMAX - T0) * (rodT[r][NC - 1] || 0); lb.set(NAMES[r] + ' 막대 끝 ' + fmt1(T) + ' °C'); });
            const hd = '<b>전도</b>: 고체에서 입자는 <b>제자리에서 진동</b>하며 이웃한 입자에게 운동을 차례로 전달해요. 입자가 이동하는 것은 아니에요.<br>';
            setInfo(hd + (heating ? '구리 > 철 > 나무 순으로 열이 빨리 전달돼요. 금속은 열이 잘 전달되고 나무는 거의 전달되지 않아요.' : '옆의 🔥 가열 버튼으로 막대의 한쪽 끝을 가열해 보세요. (구리·철·나무 막대 세 개를 비교해요)') + (pmode ? '' : (S && S.scene === 'thermos' ? '' : '')));
          } else if (mode === 'beaker') {
            const lesson = !pmode && BK && BK.parts && BK.parts.length;
            const on = pmode ? true : !!(BK && BK.on);
            for (let i = 0; i < NP; i++) {
              const q = CP[i];
              let x, y, z, hot;
              if (lesson && i >= BK.parts.length) { put(cp, i, 0, 0, 0, 0); continue; }
              if (lesson) {
                const bp = BK.parts[i], sx = clamp((bp.x - 8.5) / 7.5, -1, 1), rr = sx * (BR - 0.3);
                x = rr * Math.cos(q.al); z = rr * Math.sin(q.al); y = clamp(BH - 0.35 - ((bp.y - 0.5) / 22) * (2 * BH - 0.5), -BH + 0.2, BH - 0.3); hot = (bp.T - 18) / 50;
              } else {
                const a = 2 * Math.PI * 3 * p + q.ph, rm = BR * 0.5, am = rm * (0.2 + 0.7 * q.s) * 0.95, r = clamp(rm + am * Math.cos(a), 0.05, BR - 0.15);
                y = -(BH * 0.78) * (0.5 + 0.5 * q.s) * Math.sin(a); x = r * Math.cos(q.al); z = r * Math.sin(q.al); hot = clamp(0.5 - 0.5 * Math.cos(a), 0, 1);
              }
              put(cp, i, x, y, z, 1); cp.setColorAt(i, heatCol(hot));
            }
            flush(cp);
            flame2.visible = on; burner2.visible = true; flame2.scale.set(1, 0.9 + 0.12 * Math.sin(t * 25), 1);
            setInfo('<b>대류</b>: 액체·기체에서는 입자가 <b>직접 이동</b>하며 열을 날라요.<br>' + (on ? '아래를 가열하면 데워진 물은 가벼워져 <b>위로</b> 올라가고, 위쪽의 찬 물은 <b>아래로</b> 내려와 빙글빙글 순환해요.' : '옆의 🔥 불 붙이기를 누르면 비커 아래쪽을 가열해요. 알갱이의 움직임을 지켜보세요.'));
          } else if (mode === 'room') {
            const heat = !(RM && RM.mode === 'ac'), ac = !heat;
            for (let i = 0; i < NRM; i++) {
              const bp = RM && RM.parts && RM.parts[i];
              if (bp) { put(rp, i, -RW + (bp.x / RNX) * 2 * RW, RHH - (bp.y / RNY) * 2 * RHH, RZ[i], 1); rp.setColorAt(i, heatCol(((bp.T - 4) * 1.6 + 8) / 100 * 1.2)); } else put(rp, i, 0, 0, 0, 0);
            }
            flush(rp);
            const row = RM ? ({ top: 2, mid: 8, bottom: 17 })[RM.pos] : 17;
            heaterM.visible = heat; heaterM.position.set(-RW + 0.2, RHH - ((row + 1.5) / RNY) * 2 * RHH, 0);
            heaterM.material.emissive.setRGB(RM && RM.on ? 0.6 : 0, RM && RM.on ? 0.12 : 0, 0);
            acM.visible = ac; wallM.material.color.setHex(ac ? 0xff9a6a : 0x7ab8ff);
            heaterLab.show(heat); acLab.show(ac);
            wallLab.set(ac ? '더운 벽(바깥 날씨)' : '차가운 벽(창가)');
            upLab.set('위쪽 공기 ' + fmt1(RM ? RM.upper : 10) + ' °C'); loLab.set('아래쪽 공기 ' + fmt1(RM ? RM.lower : 10) + ' °C');
            setInfo(ac
              ? '<b>대류</b>: 에어컨의 차가운 공기는 무거워서 <b>아래로 내려오고</b>, 아래쪽의 따뜻한 공기는 위로 올라가며 순환해요. 그래서 에어컨은 <b>위쪽</b>에 달아요.'
              : '<b>대류</b>: 난방기를 <b>' + POSN[RM ? RM.pos : 'bottom'] + '</b>에 놓았어요 (' + (RM && RM.on ? '켜짐' : '꺼짐') + ').<br>' + ((RM ? RM.pos : 'bottom') === 'bottom' ? '데워진 공기는 위로 올라가고 위쪽의 찬 공기가 내려오며 순환해 방 전체가 데워져요.' : '데워진 공기는 위로 올라가기만 해서 위쪽에 머물고, 아래쪽은 오랫동안 추워요.') + ' 난방기의 위치와 켜기는 옆의 조작판에서 바꿔요.');
          } else {
            // 복사
            let st;
            if (pmode) {
              const Tb = p < 0.6 ? 20 + 36 * (1 - Math.exp(-p * 5)) : p < 0.9 ? 30 + (20 + 36 * (1 - Math.exp(-3)) - 30) * Math.exp(-(p - 0.6) * 9) : (() => { const a = 30 + (20 + 36 * (1 - Math.exp(-3)) - 30) * Math.exp(-2.7), q = (p - 0.9) / 0.1; return a - (a - 20) * q * q * (3 - 2 * q); })();
              st = { stove: p < 0.9 && p > 0.02, vac: p >= 0.3 && p < 0.9, foil: p >= 0.6 && p < 0.9, Tb, Tw: 20 + 0.3 * (Tb - 20) };
              st.vacK = st.vac ? 1 : 0;
            } else st = RD ? { stove: RD.stove, vac: RD.vac, vacK: RD.vacK, foil: RD.foil, Tb: RD.Tb, Tw: RD.Tw } : { stove: false, vac: false, vacK: 0, foil: false, Tb: 20, Tw: 20 };
            radP = Object.assign(radP, st);
            airP.visible = st.vacK < 0.5; foil.visible = st.foil; foilLab.show(st.foil);
            for (let i = 0; i < NAIR; i++) { const a = AP[i]; a.x += a.vx * h * 1.2; a.y += a.vy * h * 1.2; a.z += a.vz * h * 1.2; if (a.x > 4.0 || a.x < -3.0) a.vx = -a.vx; if (Math.abs(a.y) > 1.1) a.vy = -a.vy; if (Math.abs(a.z) > 1.4) a.vz = -a.vz; put(airP, i, a.x, a.y, a.z, 1); }
            flush(airP);
            coil.material.color.setHex(st.stove ? 0xff5a1f : 0x555b66); glow.visible = st.stove; stove.material.emissive.setRGB(st.stove ? 0.25 : 0, st.stove ? 0.05 : 0, 0);
            for (let i = 0; i < NR; i++) {
              const r = rays[i]; r.u += st.stove ? h * 0.35 : 0; if (r.u > 1) r.u = 0;
              const x0 = -3.4, x1 = 2.85, fx = 1.2; let x = x0 + (x1 - x0) * r.u, refl = false;
              if (st.foil && x >= fx - 0.05) { refl = true; x = fx - 0.05 - (x - (fx - 0.05)); if (x < x0) { r.u = 0; x = x0; } }
              r.m.material.color.setHex(refl ? 0xffffff : 0xffd34d);
              r.m.position.set(x, r.y, r.z); r.m.visible = st.stove;
            }
            [st.Tb, st.Tw].forEach((T, i) => { const c = cups[i], k = clamp((T - 20) / 40, 0, 1); c.water.material.color.copy(heatCol(clamp((T - 15) / 50, 0, 1))); c.body.material.emissive.setRGB(k * 0.35, k * 0.06, 0); c.lab.set(c.name + ' ' + fmt1(T) + ' °C'); });
            vacLab.set(st.vacK >= 0.5 ? '진공 (공기 없음)' : '공기 있음');
            setInfo('<b>복사</b>: 열이 <b>물질 없이도</b> 직접 전달돼요.<br>' + (st.stove ? (st.vacK >= 0.5 ? '공기를 뺀 진공에서도 컵이 따뜻해져요. ' : '공기가 있어도 열은 복사로 전달돼요. ') : '옆의 🔥 난로 켜기 버튼으로 난로를 켜 보세요. ') + (st.foil ? '은박지가 복사열을 <b>반사</b>해 컵까지 덜 전달돼요. ' : '') + '검은 컵이 흰 컵보다 복사열을 더 잘 흡수해요. 태양의 열이 지구에 오는 방식이에요.');
          }
          if (S && S.scene === 'thermos') setInfo('<b>단열과 비유</b>(보온병 설계)는 2D 화면에서 해 보세요. 열은 <b>전도·대류·복사</b>로 이동해요.');
        },
        sync() {},
      };
    },
  });
})();
