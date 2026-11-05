/* hc-neutralization-quant · 3D 중화 반응의 양적 관계
   H⁺ 한 개와 OH⁻ 한 개가 만나 H₂O 한 분자가 돼요. 산이 낼 수 있는 H⁺ 수와 염기의 OH⁻ 수를 비교하면 남는 이온(액성)을 알 수 있어요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
    /* ---- 공용 도우미: 분자 모형 · 유리 상자 · 화살표 ---- */
  function makeLib(THREE) {
    const COL = { H: 0xf3f6fb, C: 0x8a93a3, N: 0x4f7cff, O: 0xf0524f, F: 0x9be36b, Cl: 0x34c759, Na: 0xb07cf5, B: 0xf4a6a6, S: 0xf5c518, Cu: 0xe08a3c, Ca: 0x6fd0c4, e: 0xffd34d };
    const RAD = { H: 0.26, C: 0.38, N: 0.37, O: 0.36, F: 0.32, Cl: 0.48, Na: 0.5, B: 0.36, S: 0.48, Cu: 0.5, Ca: 0.55 };
    const mats = {};
    const mat = (k) => mats[k] || (mats[k] = new THREE.MeshStandardMaterial({ color: COL[k] !== undefined ? COL[k] : k, roughness: 0.36, metalness: 0.06 }));
    const SG = new THREE.SphereGeometry(1, 28, 20);
    const CG = new THREE.CylinderGeometry(1, 1, 1, 16);
    const stickMat = new THREE.MeshStandardMaterial({ color: 0xc3ccdd, roughness: 0.45, metalness: 0.1 });
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    function atom(k, s, pal) { const m = new THREE.Mesh(SG, mat(pal && pal[k] !== undefined ? pal[k] : k)); m.scale.setScalar((RAD[k] || 0.4) * (s || 1)); return m; }
    function stick(a, b, r, m) {
      const d = b.clone().sub(a), len = d.length(); const s = new THREE.Mesh(CG, m || stickMat);
      s.scale.set(r, Math.max(len, 1e-4), r); s.position.copy(a).add(b).multiplyScalar(0.5);
      s.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); return s;
    }
    const T = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]];
    const MOLS = {
      H2: { f: 'H₂', a: [['H', -0.45, 0, 0], ['H', 0.45, 0, 0]], b: [[0, 1, 1]] },
      O2: { f: 'O₂', a: [['O', -0.72, 0, 0], ['O', 0.72, 0, 0]], b: [[0, 1, 2]] },
      N2: { f: 'N₂', a: [['N', -0.66, 0, 0], ['N', 0.66, 0, 0]], b: [[0, 1, 3]] },
      H2O: { f: 'H₂O', a: [['O', 0, 0.2, 0], ['H', 0.91, -0.5, 0], ['H', -0.91, -0.5, 0]], b: [[0, 1, 1], [0, 2, 1]] },
      CO2: { f: 'CO₂', a: [['C', 0, 0, 0], ['O', 1.4, 0, 0], ['O', -1.4, 0, 0]], b: [[0, 1, 2], [0, 2, 2]] },
      CH4: { f: 'CH₄', a: [['C', 0, 0, 0]].concat(T.map((t) => ['H', t[0] * 0.75, t[1] * 0.75, t[2] * 0.75])), b: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1]] },
      NH3: { f: 'NH₃', a: [['N', 0, 0.3, 0], ['H', 1.1, -0.15, 0], ['H', -0.55, -0.15, 0.953], ['H', -0.55, -0.15, -0.953]], b: [[0, 1, 1], [0, 2, 1], [0, 3, 1]] },
      HCl: { f: 'HCl', a: [['Cl', 0.6, 0, 0], ['H', -0.9, 0, 0]], b: [[0, 1, 1]] },
      HF: { f: 'HF', a: [['F', 0.4, 0, 0], ['H', -0.7, 0, 0]], b: [[0, 1, 1]] },
      NO2: { f: 'NO₂', a: [['N', 0, 0.28, 0], ['O', 1.33, -0.28, 0], ['O', -1.33, -0.28, 0]], b: [[0, 1, 1], [0, 2, 1]] },
      N2O4: { f: 'N₂O₄', a: [['N', 0.95, 0, 0], ['N', -0.95, 0, 0], ['O', 1.7, 1, 0], ['O', 1.7, -1, 0], ['O', -1.7, 1, 0], ['O', -1.7, -1, 0]], b: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [1, 4, 1], [1, 5, 1]] },
      BF3: { f: 'BF₃', a: [['B', 0, 0, 0], ['F', 1.55, 0, 0], ['F', -0.775, 0, 1.342], ['F', -0.775, 0, -1.342]], b: [[0, 1, 1], [0, 2, 1], [0, 3, 1]] },
      CCl4: { f: 'CCl₄', a: [['C', 0, 0, 0]].concat(T.map((t) => ['Cl', t[0] * 1.2, t[1] * 1.2, t[2] * 1.2])), b: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1]] },
      H3O: { f: 'H₃O⁺', a: [['O', 0, 0.3, 0], ['H', 1.0, -0.1, 0], ['H', -0.5, -0.1, 0.866], ['H', -0.5, -0.1, -0.866]], b: [[0, 1, 1], [0, 2, 1], [0, 3, 1]] },
      OH: { f: 'OH⁻', a: [['O', -0.2, 0, 0], ['H', 0.75, 0, 0]], b: [[0, 1, 1]] },
    };
    /* 분자 만들기: k는 크기 배율. 이중·삼중 결합은 막대 여러 개 */
    function mol(M, k, pal) {
      k = k || 1; const g = new THREE.Group(); const P = M.a.map((x) => V(x[1] * k, x[2] * k, x[3] * k));
      M.a.forEach((x, i) => { const m = atom(x[0], k, pal); m.position.copy(P[i]); g.add(m); });
      M.b.forEach((b) => {
        const A = P[b[0]], B = P[b[1]], d = B.clone().sub(A).normalize();
        let perp = d.clone().cross(V(0, 0, 1)); if (perp.lengthSq() < 0.01) perp = d.clone().cross(V(0, 1, 0)); perp.normalize().multiplyScalar(0.11 * k);
        const offs = b[2] === 1 ? [0] : b[2] === 2 ? [-1, 1] : [-1.7, 0, 1.7];
        const r = (b[2] === 1 ? 0.085 : b[2] === 2 ? 0.06 : 0.05) * k;
        offs.forEach((o) => g.add(stick(A.clone().addScaledVector(perp, o), B.clone().addScaledVector(perp, o), r)));
      });
      return g;
    }
    /* 반투명 유리 상자 (가장자리 선 포함). 크기는 scale로 조절 */
    function glassBox(w, h, d, color, op) {
      const g = new THREE.Group();
      const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: color || 0x9ec5ff, transparent: true, opacity: op === undefined ? 0.13 : op, roughness: 0.15, metalness: 0, depthWrite: false }));
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color: 0xcfe0ff, transparent: true, opacity: 0.75 }));
      g.add(m, e); g.scale.set(w, h, d); g.userData.fill = m; return g;
    }
    function tube(pts, r, color, seg) {
      const c = new THREE.CatmullRomCurve3(pts.map((p) => (p.isVector3 ? p : V(p[0], p[1], p[2]))));
      return new THREE.Mesh(new THREE.TubeGeometry(c, seg || 40, r, 10, false), new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.2 }));
    }
    /* 화살표: from → to */
    function arrow(from, to, color, r, headLen) {
      const g = new THREE.Group(); const a = V(from[0], from[1], from[2]), b = V(to[0], to[1], to[2]); const d = b.clone().sub(a), len = d.length();
      if (len < 1e-3) return g; const hl = Math.min(headLen || 0.4, len * 0.6); const m = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.1 });
      const dir = d.clone().normalize(); const tip = b.clone();
      const sh = new THREE.Mesh(CG, m); sh.scale.set(r, len - hl, r); sh.position.copy(a).addScaledVector(dir, (len - hl) / 2); sh.quaternion.setFromUnitVectors(V(0, 1, 0), dir);
      const hd = new THREE.Mesh(new THREE.ConeGeometry(r * 2.6, hl, 20), m); hd.position.copy(tip).addScaledVector(dir, -hl / 2); hd.quaternion.setFromUnitVectors(V(0, 1, 0), dir);
      g.add(sh, hd); return g;
    }
    function clear(g) { while (g.children.length) g.remove(g.children[0]); }
    const rnd = (a, b) => a + Math.random() * (b - a);
    const sstep = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
    return { COL, RAD, mat, atom, stick, mol, MOLS, glassBox, tube, arrow, clear, rnd, sstep, V, SG, CG, stickMat };
  }

  const phone = window.matchMedia && window.matchMedia('(max-width: 599px)').matches;
  window.SciSim3D.attach({
    title: '중화 반응 이온 모형 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    levels: [1],   // 완전 중화(뷰렛 · BTB 색 · 이온 입자). 이온 누르기 · 남은 이온 표 · 폐수 처리 단계는 2D
    camera: { dist: phone ? 13 : 11, theta: 0.5, phi: 1.15, min: 5, max: 24, target: [0, 1.5, 0.4] },
    autoRotate: 0.08,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const L = makeLib(THREE);
      const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), sm = L.sstep;
      const floor = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0x050b18 })); floor.scale.set(15, 0.1, 10); floor.position.y = -0.06; root.add(floor);
      const KC = { 'H+': 0xe2464b, 'OH-': 0x3867f4, 'Na+': 0xf59e0b, 'Cl-': 0x14a058, 'Ca2+': 0x8b5cf6, SO4: 0xc2410c, H2O: 0x9ee7ff };
      const KR = { 'H+': 0.14, 'OH-': 0.19, 'Na+': 0.17, 'Cl-': 0.19, 'Ca2+': 0.2, SO4: 0.22, H2O: 0.19 };
      const mats = {}; const matOf = (k) => mats[k] || (mats[k] = new THREE.MeshStandardMaterial({ color: KC[k] || 0xffffff, roughness: 0.35, emissive: KC[k] || 0, emissiveIntensity: 0.18 }));
      const SGm = new THREE.SphereGeometry(1, 16, 12);
      const COLS = { acid: 0xf2d23a, ok: 0x3fbf6a, base: 0x3a78f2 };
      function makeBeaker(i) {
        const g = new THREE.Group(); root.add(g);
        const wall = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 40, 1, true), new THREE.MeshStandardMaterial({ color: 0xcfe0ff, transparent: true, opacity: 0.14, roughness: 0.1, side: THREE.DoubleSide, depthWrite: false }));
        const bot = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.1, 40), new THREE.MeshStandardMaterial({ color: 0xcfe0ff, transparent: true, opacity: 0.35, roughness: 0.1, depthWrite: false }));
        const liqM = new THREE.MeshStandardMaterial({ color: 0xf2d23a, transparent: true, opacity: 0.3, roughness: 0.12, depthWrite: false });
        const liq = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 40), liqM);
        g.add(wall, bot, liq);
        const pool = []; for (let k = 0; k < 70; k++) { const m = new THREE.Mesh(SGm, matOf('H+')); m.visible = false; g.add(m); pool.push(m); }
        return { g, wall, bot, liq, liqM, pool, lab: label('', [0, 0, 0], { size: 12.5 }), R: 1.5, Hc: 3.6, hh: 2 };
      }
      const bk = [makeBeaker(0), makeBeaker(1), makeBeaker(2)];
      function shape(B, R, Hc, x, z, level, color) {
        B.R = R; B.Hc = Hc; B.g.visible = true; B.g.position.set(x, 0, z);
        B.wall.scale.set(R, Hc, R); B.wall.position.y = Hc / 2; B.bot.scale.set(R, 1, R); B.bot.position.y = 0.05;
        const hh = Math.max(0.05, level * Hc); B.hh = hh; B.liq.scale.set(R - 0.04, hh, R - 0.04); B.liq.position.y = hh / 2 + 0.05; B.liqM.color.setHex(color);
      }
      function mirror(B, box, sc) {
        let i = 0; const r = box.r;
        box.ions.forEach((q) => {
          if (i >= B.pool.length) return; if (q.zz === undefined) q.zz = Math.random();
          const u = clamp((q.x - r.x) / Math.max(1, r.w), 0, 1), v = clamp((q.y - r.y) / Math.max(1, r.h), 0, 1), m = B.pool[i++];
          const rad = B.R - 0.25, ax = (u - 0.5) * 2 * rad, az = (q.zz - 0.5) * 2 * rad * 0.9, d = Math.hypot(ax, az), k = d > rad ? rad / d : 1;
          m.visible = !q.dying || true; m.material = matOf(q.kind); m.scale.setScalar((KR[q.kind] || 0.18) * (sc || 1));
          m.position.set(ax * k, 0.25 + (1 - v) * Math.max(0.2, B.hh - 0.4), az * k);
        });
        for (; i < B.pool.length; i++) B.pool[i].visible = false;
      }
      const KN = { 'H+': 'H⁺', 'OH-': 'OH⁻', 'Na+': 'Na⁺', 'Cl-': 'Cl⁻', 'Ca2+': 'Ca²⁺', SO4: 'SO₄²⁻', H2O: 'H₂O' };
      const legend = (box) => { const ks = []; (box && box.ions || []).forEach((q) => { if (KN[q.kind] && ks.indexOf(q.kind) < 0) ks.push(q.kind); }); return ks.length ? '<br>' + ks.map((k) => '<span style="color:#' + (KC[k] || 0xffffff).toString(16).padStart(6, '0') + '">●</span> ' + KN[k]).join(' · ') : ''; };
      const hideAll = () => bk.forEach((B) => { B.g.visible = false; B.lab.show(false); B.pool.forEach((m) => { m.visible = false; }); });
      /* 뷰렛 (완전 중화 장면) */
      const bur = new THREE.Group(); root.add(bur);
      const burTube = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 5, 16), new THREE.MeshStandardMaterial({ color: 0xcfe0ff, transparent: true, opacity: 0.25, depthWrite: false })); burTube.position.y = 5.8;
      const burFill = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 1, 16), new THREE.MeshStandardMaterial({ color: 0xa9c3ff, transparent: true, opacity: 0.7 }));
      const burTip = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 14), new THREE.MeshStandardMaterial({ color: 0x9aa6bf })); burTip.rotation.x = Math.PI; burTip.position.y = 3.05;
      bur.add(burTube, burFill, burTip); bur.visible = false;
      const burLab = label('', [0, 0, 0], { size: 12.5 });

      const ownPool = []; for (let k = 0; k < 80; k++) { const m = new THREE.Mesh(SGm, matOf('H+')); m.visible = false; root.add(m); ownPool.push(m); }
      let ownN = 0;
      function drawOwn(pos, kind, sc) { if (ownN >= ownPool.length) return; const m = ownPool[ownN++]; m.visible = sc > 0.02; m.material = matOf(kind); m.scale.setScalar((KR[kind] || 0.18) * sc); m.position.set(pos[0], pos[1], pos[2]); }
      function flushOwn() { for (let i = ownN; i < ownPool.length; i++) ownPool[i].visible = false; ownN = 0; }
      /* ▶ 재생: 이온 모형 (A + B → C, H⁺ + OH⁻ → H₂O) */
      let own = false, sig = '', pI = 0, ownKey = '', ownP = [];
      const rowOf = () => { const r = document.querySelectorAll('.v3-player'); return r[r.length - 1]; };
      const pl = controls.player({ duration: 10, loop: true, label: '섞어서 중화', phases: [[0, '섞기 전'], [0.1, '섞는 중'], [0.5, '섞은 용액'], [0.55, 'H⁺ + OH⁻ → H₂O'], [0.88, '다시 처음으로']], onFrame(p) { pI = p; own = p > 0; } });
      const rowP = rowOf();
      const AP = (phone ? [-1.9, -2.0] : [-3.4, -1.8]), BP = (phone ? [1.9, -2.0] : [3.4, -1.8]), CP = [0, phone ? 2.9 : 3.0];
      function buildOwn(nH, nOH) {
        ownP = [];
        const rnd = (R) => { const a = Math.random() * 6.283, r = Math.sqrt(Math.random()) * (R - 0.3); return [Math.cos(a) * r, Math.sin(a) * r]; };
        const mk = (kind, side, idx) => { const h = rnd(1.4), t = rnd(1.5); return { kind, side, idx, h, t, hy: 0.4 + Math.random() * 1.2, ty: 0.4 + Math.random() * 1.0, d: Math.random() * 0.6, pair: null }; };
        const hs = [], os = [];
        for (let i = 0; i < nH; i++) { const a = mk('H+', 'A', i); ownP.push(a); hs.push(a); ownP.push(mk('Cl-', 'A', i)); }
        for (let i = 0; i < nOH; i++) { const b = mk('OH-', 'B', i); ownP.push(b); os.push(b); ownP.push(mk('Na+', 'B', i)); }
        const n = Math.min(hs.length, os.length);
        for (let i = 0; i < n; i++) { hs[i].pair = os[i]; os[i].pair = hs[i]; const c = rnd(1.0); hs[i].c = os[i].c = [c[0], c[1], 0.9 + Math.random() * 0.8]; }
      }

      return {
        update(dt, t) {
          const Z = ctx.lesson(); if (!Z) return;
          const S = Z.S, mode = S.mode;
          rowP.style.display = mode === 'ion' ? '' : 'none'; if (mode !== 'ion' && pl.playing) pl.pause();
          const sg = [mode, S.ion.nH, S.ion.nOH, S.ion.phase, S.mol.si, S.rest.si, S.waste.ag].join('|'); if (sg !== sig) { sig = sg; if (own) { own = false; pl.pause(); pl.set(0); } }
          hideAll(); bur.visible = false; burLab.show(false);
          if (mode === 'ion') {
            const I = S.ion, pr = sm(I.pr.v);
            const o = own;
            const lvA = o ? 0.62 * (1 - sm(clamp((pI - 0.1) / 0.4, 0, 1))) : 0.62 * (1 - pr), lvC = o ? Math.max(0.06, 0.65 * sm(clamp((pI - 0.1) / 0.4, 0, 1))) : Math.max(0.06, 0.65 * pr);
            const R = phone ? 1.2 : 1.45;
            shape(bk[0], R, 3.6, AP[0], AP[1], lvA, 0xffc4c4); shape(bk[1], R, 3.6, BP[0], BP[1], lvA, 0xbdd1ff); shape(bk[2], R + 0.2, 3.6, CP[0], CP[1], lvC, 0xd6cff6);
            [['HCl 수용액', 0], ['NaOH 수용액', 1], ['섞은 용액', 2]].forEach(([nm, i]) => { const B = bk[i]; B.lab.show(true); B.lab.obj = [B.g.position.x, 3.6 + 0.4, B.g.position.z]; B.lab.set(nm); });
            if (o) {
              const key = I.nH + '|' + I.nOH; if (key !== ownKey || !ownP.length) { ownKey = key; buildOwn(I.nH, I.nOH); }
              let used = [0, 0, 0];
              const fade = pI < 0.05 ? sm(pI / 0.05) : pI > 0.9 ? 1 - sm((pI - 0.9) / 0.1) : 1;
              const pour = clamp((pI - 0.1) / 0.4, 0, 1), react = clamp((pI - 0.55) / 0.3, 0, 1);
              const pairsDone = [];
              ownP.forEach((q) => {
                const home = q.side === 'A' ? bk[0] : bk[1], c = bk[2];
                const mv = sm(clamp((pour - q.d) / 0.4, 0, 1)); const inC = mv >= 1;
                const bi = inC ? 2 : (mv > 0 ? 2 : (q.side === 'A' ? 0 : 1)), Bt = bk[bi];
                // 월드 좌표로 보간
                const hp = [home.g.position.x + q.h[0], 0.3 + q.hy * (home.hh / 2), home.g.position.z + q.h[1]];
                const tp = [c.g.position.x + q.t[0], 0.3 + q.ty * (c.hh / 1.2 + 0.3), c.g.position.z + q.t[1]];
                let pos = [hp[0] + (tp[0] - hp[0]) * mv, hp[1] + (tp[1] - hp[1]) * mv + Math.sin(mv * Math.PI) * 1.3, hp[2] + (tp[2] - hp[2]) * mv];
                let sc = 1, kind = q.kind;
                if (q.pair && react > 0) { const cc = [c.g.position.x + q.c[0], 0.3 + q.c[2], c.g.position.z + q.c[1]]; const k = sm(clamp(react / 0.6, 0, 1)); pos = [pos[0] + (cc[0] - pos[0]) * k, pos[1] + (cc[1] - pos[1]) * k, pos[2] + (cc[2] - pos[2]) * k]; if (react > 0.65) { kind = 'H2O'; sc = 1; } }
                if (q.pair && react > 0.65 && q.kind === 'OH-') return;
                drawOwn(pos, kind, sc * fade);
              });
              flushOwn();
              info('<b>HCl + NaOH → NaCl + H₂O</b><br>구경꾼 이온 Na⁺, Cl⁻는 그대로 있고, <b>H⁺ + OH⁻ → H₂O</b>만 일어나요 (알짜 이온식).');
              return;
            }
            mirror(bk[0], Z.boxA); mirror(bk[1], Z.boxB); mirror(bk[2], Z.boxC);
            flushOwn(true);
            info('<b>HCl + NaOH → NaCl + H₂O</b><br>' + (I.phase === 'done' ? '알짜 이온식: <b>H⁺ + OH⁻ → H₂O</b> (Na⁺ · Cl⁻는 구경꾼 이온)' : I.phase === 'sep' ? 'HCl에는 H⁺ ' + I.nH + '개와 Cl⁻ ' + I.nH + '개, NaOH에는 Na⁺ ' + I.nOH + '개와 OH⁻ ' + I.nOH + '개가 있어요. 🥣 섞기를 눌러 보세요.' : '섞은 뒤 H⁺와 OH⁻가 만나 H₂O가 돼요.'));
            return;
          }
          flushOwn(true);
          const B = bk[0], R = phone ? 1.9 : 2.2;
          if (mode === 'mol') {
            const si = S.mol.si, s = Z.SM[si], v = S.mol.v[si], c = Z.molCalc(si, v);
            shape(B, R, 3.8, 0, 0.6, clamp(0.35 + c.Vtot / 100, 0.3, 0.9), c.H > 1e-6 ? COLS.acid : c.OH > 1e-6 ? COLS.base : COLS.ok);
            mirror(B, Z.boxM);
            bur.visible = true; bur.position.set(0, 3.2, 0.6); burTube.position.y = 2.6; burTip.position.y = -0.1; burTube.scale.y = 1;
            const fill = clamp((50 - v) / 50, 0, 1) * 5; burFill.scale.y = Math.max(0.01, fill); burFill.position.y = 0.15 + fill / 2 + 0.0; burFill.material.color.setHex(s.flask.kind === 'acid' ? 0xa9c3ff : 0xffb3b3);
            burLab.show(true); burLab.obj = [0, 3.2 + 5.4, 0.6]; burLab.set(s.bur.Ms + ' M ' + s.bur.f + ' · 눈금 ' + v.toFixed(1) + ' mL');
            B.lab.show(true); B.lab.obj = [0, 3.8 + 0.4, 0.6]; B.lab.set(s.flask.Ms + ' M ' + s.flask.f + ' ' + s.flask.V + ' mL + BTB');
            const f2 = (x) => String(+x.toFixed(2));
            info('<b>' + s.label + '</b> 에 ' + s.bur.Ms + ' M ' + s.bur.f + ' <b>' + v.toFixed(1) + ' mL</b> 넣기<br>H⁺ 몰수 ' + f2(c.nH) + ' mmol · OH⁻ 몰수 ' + f2(c.nOH) + ' mmol → ' + (c.neutral ? '<b>같아요 → 완전 중화</b> (BTB 초록)' : c.H > 0 ? 'H⁺가 남아 산성 (BTB 노랑)' : 'OH⁻가 남아 염기성 (BTB 파랑)') + '<br>산이 내놓은 H⁺ 몰수 = 염기가 내놓은 OH⁻ 몰수 → a M V = b M′ V′ · ● 1개 ≈ 0.25 mmol' + legend(Z.boxM));
            return;
          }
          if (mode === 'rest') {
            const r = Z.RS[S.rest.si];
            shape(B, R, 3.8, 0, 0.6, clamp(0.35 + r.Vt / 100, 0.3, 0.9), r.rest === 'H' ? COLS.acid : r.rest === 'OH' ? COLS.base : COLS.ok);
            mirror(B, Z.boxR);
            B.lab.show(true); B.lab.obj = [0, 3.8 + 0.4, 0.6]; B.lab.set(r.acid.Ms + ' M HCl ' + r.acid.V + ' mL + ' + r.base.Ms + ' M NaOH ' + r.base.V + ' mL');
            info('<b>' + r.id + ' 섞은 뒤의 용액</b> (총 부피 ' + r.Vt + ' mL)<br>HCl: H⁺ ' + (+r.nH.toFixed(2)) + ' mmol · NaOH: OH⁻ ' + (+r.nOH.toFixed(2)) + ' mmol<br>같은 수의 H⁺와 OH⁻는 H₂O가 되고, 남은 이온이 용액의 성질을 정해요. 남은 이온의 몰수를 총 부피로 나누면 농도예요.');
            return;
          }
          // 폐수 중화
          const W = S.waste, a = Z.AG[W.ag], c = Z.wCalc(W.ag, W.dose);
          shape(B, R + 0.3, 3.8, 0, 0.6, 0.7, c.state === 0 ? COLS.acid : c.state === 1 ? COLS.ok : COLS.base);
          mirror(B, Z.boxW);
          B.lab.show(true); B.lab.obj = [0, 3.8 + 0.4, 0.6]; B.lab.set('산성 폐수 탱크 1000 L · [H⁺] = 0.010 M');
          info('<b>폐수 중화</b>: ' + a.nm + ' 가루를 <b>' + W.dose + ' g</b> 넣었어요<br>폐수 1000 L의 H⁺는 10 mol이에요 (● 1개 = 0.5 mol). ' + a.nm + ' 1 mol(' + a.Mm + ' g)은 OH⁻ ' + a.k + ' mol을 내놓아요.<br>' + (c.state === 1 ? '<b>H⁺와 OH⁻ 몰수가 같아요 → 중화 (pH 7)</b>' : c.state === 0 ? '아직 H⁺가 남아 산성이에요.' : 'OH⁻가 남아 염기성이에요.'));
        },
      };
    },
  });
})();
