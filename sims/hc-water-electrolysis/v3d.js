/* hc-water-electrolysis · 3D 물의 전기 분해
   장치: (−)극에서 H₂, (+)극에서 O₂가 2 : 1의 부피로 모여요.  입자 모형: 물 분자의 결합이 끊어지고 새로 만들어져요. */
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
    title: '물의 전기 분해 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    levels: [0, 3],          // 1단계(기체 확인 도구 끌기)와 2단계(그래프 그리기)는 2D 화면에서 해요
    camera: { dist: phone ? 22 : 17, theta: 0.45, phi: 1.2, min: 6, max: 34, target: [0, 3.3, 0] },
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      const L = makeLib(THREE);
      let mode = 'dev', on = false, gasH = 0, gasO = 0, prog = 0, own = null, pD = 0, pM = 0, sig = '', curmA = 0, elecOn = false, Vv = 9, runT = 0;
      const dev = new THREE.Group(), mm = new THREE.Group(); root.add(dev, mm);
      /* ---------- 장치 ---------- */
      const BR = 3.0, BH = 4.4;
      const beaker = new THREE.Mesh(new THREE.CylinderGeometry(BR, BR, BH, 48, 1, true), new THREE.MeshStandardMaterial({ color: 0xcfe0ff, transparent: true, opacity: 0.16, roughness: 0.1, side: THREE.DoubleSide, depthWrite: false }));
      beaker.position.y = BH / 2; dev.add(beaker);
      const bot = new THREE.Mesh(new THREE.CylinderGeometry(BR, BR, 0.1, 48), new THREE.MeshStandardMaterial({ color: 0xcfe0ff, transparent: true, opacity: 0.3, roughness: 0.1, depthWrite: false })); bot.position.y = 0.05; dev.add(bot);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(BR, 0.05, 12, 64), new THREE.MeshStandardMaterial({ color: 0xe0ebff, roughness: 0.2 })); rim.rotation.x = Math.PI / 2; rim.position.y = BH; dev.add(rim);
      const WL = 3.7;
      const liq = new THREE.Mesh(new THREE.CylinderGeometry(BR - 0.04, BR - 0.04, WL, 48), new THREE.MeshStandardMaterial({ color: 0x4aa3ff, transparent: true, opacity: 0.3, roughness: 0.15, depthWrite: false })); liq.position.y = WL / 2 + 0.05; dev.add(liq);
      const EX = 1.15, TR = 0.62, TB = 1.6, TT = 7.0; // 시험관 바닥~꼭대기
      const elec = (x, col) => { const g = new THREE.Group(); const r = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 5.2, 16), new THREE.MeshStandardMaterial({ color: col, roughness: 0.3, metalness: 0.7 })); r.position.set(x, 3.0, 0); g.add(r); dev.add(g); return r; };
      elec(-EX, 0x9aa6bf); elec(EX, 0x9aa6bf);
      // 시험관 (거꾸로 세운) — 눈금: 위에서 아래로 기체가 차요
      const tubes = [-EX, EX].map((x) => {
        const g = new THREE.Group(); g.position.x = x; dev.add(g);
        const len = TT - TB;
        const gl = new THREE.Mesh(new THREE.CylinderGeometry(TR, TR, len, 32, 1, true), new THREE.MeshStandardMaterial({ color: 0xe7f1ff, transparent: true, opacity: 0.2, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false })); gl.position.y = TB + len / 2; g.add(gl);
        const cap = new THREE.Mesh(new THREE.SphereGeometry(TR, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), gl.material); cap.position.y = TT; g.add(cap);
        const water = new THREE.Mesh(new THREE.CylinderGeometry(TR - 0.03, TR - 0.03, 1, 32), new THREE.MeshStandardMaterial({ color: 0x4aa3ff, transparent: true, opacity: 0.4, roughness: 0.15, depthWrite: false })); g.add(water);
        const gasM = new THREE.Mesh(new THREE.CylinderGeometry(TR - 0.04, TR - 0.04, 1, 32), new THREE.MeshStandardMaterial({ color: x < 0 ? 0xb9d7ff : 0xffc9c4, transparent: true, opacity: 0.55, roughness: 0.3, depthWrite: false })); g.add(gasM);
        return { g, water, gasM };
      });
      // 눈금
      const CAP = 13.7; tubes.forEach((T, ti) => { for (let i = 0; i <= 13; i++) { const y = TT - i * (TT - TB) / CAP; const t = new THREE.Mesh(new THREE.BoxGeometry(i % 2 ? 0.12 : 0.22, 0.02, 0.02), L.mat(0xe0ebff)); t.position.set(ti ? TR : -TR, y, 0); T.g.add(t); } });
      // 전원 장치와 전선
      const bat = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.1, 1.4), new THREE.MeshStandardMaterial({ color: 0x2f3b57, roughness: 0.5, metalness: 0.2 })); bat.position.set(0, 0.55, 3.9); dev.add(bat);
      const sw = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14), new THREE.MeshStandardMaterial({ color: 0x555d6e, emissive: 0x000000 })); sw.position.set(0, 1.2, 3.9); dev.add(sw);
      dev.add(L.tube([[-1.1, 1.0, 3.5], [-1.4, 1.0, 2.0], [-EX, 5.5, 1.0], [-EX, 5.55, 0]], 0.06, 0x4f7cff));
      dev.add(L.tube([[1.1, 1.0, 3.5], [1.4, 1.0, 2.0], [EX, 5.5, 1.0], [EX, 5.55, 0]], 0.06, 0xf0524f));
      const anc = (x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); dev.add(o); return o; };
      const lc = label('(−)극 · H₂', anc(-EX, TT + 0.2, 0), { size: 13, color: 'rgba(79,124,255,.92)' });
      const la = label('(+)극 · O₂', anc(EX, TT + 0.2, 0), { size: 13, color: 'rgba(240,82,79,.92)' });
      const lb = label('전원 장치', anc(0, 1.7, 3.9), { size: 12 });
      // 기포
      const NB = 70;
      const bub = new THREE.InstancedMesh(L.SG, new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.75, roughness: 0.05, metalness: 0 }), NB); bub.frustumCulled = false; dev.add(bub);
      const bs = []; for (let i = 0; i < NB; i++) bs.push({ x: 0, y: -9, z: 0, v: 0, on: false, s: 0.07 });
      let acc = [0, 0], dum = new THREE.Object3D();
      /* ---------- 입자 모형: 2H₂O → 2H₂ + O₂ ---------- */
      const atoms = [
        { k: 'O', s: [-3.6, 1.6, 0], e: [3.4, -1.9, 0.0] }, { k: 'H', s: [-2.7, 1.0, 0], e: [3.4, 2.6, 0.0] }, { k: 'H', s: [-4.5, 1.0, 0], e: [3.4, 3.6, 0] },
        { k: 'O', s: [-3.6, -1.6, 0], e: [3.4, -3.2, 0] }, { k: 'H', s: [-2.7, -2.2, 0], e: [3.4, 0.6, 0] }, { k: 'H', s: [-4.5, -2.2, 0], e: [3.4, -0.4, 0] },
      ];
      const mid = [[0.0, 2.2, 1.2], [-0.3, 3.3, 0.2], [0.4, 3.0, -0.8], [0.0, -2.2, 1.2], [-0.4, -1.0, 0.4], [0.4, -3.0, -0.6]];
      atoms[0].e = [3.0, -0.2, 0]; atoms[3].e = [3.9, -0.2, 0];
      atoms[1].e = [2.6, 2.6, 0]; atoms[2].e = [3.6, 2.6, 0]; atoms[4].e = [2.6, -2.6, 0]; atoms[5].e = [3.6, -2.6, 0];
      atoms[0].e = [2.6, 0.5, 0.0]; atoms[3].e = [3.9, 0.5, 0.0];
      const am = atoms.map((a) => { const m = L.atom(a.k, 1.25); mm.add(m); return m; });
      const bonds = [[0, 1, 'w'], [0, 2, 'w'], [3, 4, 'w'], [3, 5, 'w'], [1, 2, 'p'], [4, 5, 'p'], [0, 3, 'p']];
      const bm = bonds.map((b) => { const m = new THREE.Mesh(L.CG, new THREE.MeshStandardMaterial({ color: 0xc3ccdd, transparent: true, roughness: 0.45 })); mm.add(m); return m; });
      const eqLab = label('2H₂O → 2H₂ + O₂', [0, 5.0, 0], { size: 13.5 });
      const lw = label('물 분자 2개', [-3.6, -4.1, 0], { size: 12 }), lp = label('수소 2개 · 산소 1개', [3.3, -4.1, 0], { size: 12 });
      const lt = label('에너지(전기)로 결합이 끊겨요', [0, 0, 0], { size: 12, color: 'rgba(255,170,40,.9)' });
      const arr = L.arrow([-1.3, 0, 0], [1.3, 0, 0], 0xffd34d, 0.07, 0.4); mm.add(arr); arr.position.y = -3.2; arr.visible = true;
      const pv = new THREE.Vector3();
      function atomPos(i, p) {
        const a = atoms[i], m = mid[i]; const u = L.sstep(p / 0.5), w = L.sstep((p - 0.5) / 0.5);
        const x = a.s[0] + (m[0] - a.s[0]) * u + (a.e[0] - m[0]) * w, y = a.s[1] + (m[1] - a.s[1]) * u + (a.e[1] - m[1]) * w, z = a.s[2] + (m[2] - a.s[2]) * u + (a.e[2] - m[2]) * w;
        return pv.set(x, y, z).clone();
      }
      function setProg(p) {
        const P = atoms.map((_, i) => atomPos(i, p));
        am.forEach((m, i) => m.position.copy(P[i]));
        bonds.forEach((b, i) => {
          const m = bm[i], A = P[b[0]], B = P[b[1]], d = B.clone().sub(A), len = d.length();
          m.scale.set(0.09, Math.max(len, 1e-3), 0.09); m.position.copy(A).add(B).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
          const op = b[2] === 'w' ? 1 - L.sstep(p / 0.4) : L.sstep((p - 0.6) / 0.4);
          m.material.opacity = op; m.visible = op > 0.03;
        });
        lt.obj = [0, 1.6, 0]; lt.show(p > 0.28 && p < 0.72);
        lw.show(p < 0.15); lp.show(p > 0.9);
        mmInfo();
      }
      let lastInfo = '';
      const setInfo = (h) => { if (h !== lastInfo) { lastInfo = h; info(h); } };
      function mmInfo() {
        const names = ['① 물 분자 2개', '② O–H 결합이 끊어져요', '③ 새 짝을 찾아요', '④ H₂ 2개 + O₂ 1개'], st = prog < 0.17 ? 0 : prog < 0.5 ? 1 : prog < 0.85 ? 2 : 3;
        setInfo('<b>2H₂O → 2H₂ + O₂</b> · ' + names[st] + ' (' + Math.round(prog * 100) + ' %)<br>O–H 결합 4개가 끊기고, H–H 결합 2개와 O=O 결합 1개가 새로 생겨요.<br>원자의 종류와 수는 그대로예요 (H 4개, O 2개).');
      }
      function devInfo() {
        const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
        setInfo('<b>물의 전기 분해</b> · ' + (elecOn ? '전해질 수용액' : '순수한 물') + ' · 전압 ' + Vv + ' V · 전원 ' + (on ? '<span style="color:#7be08a"><b>ON</b></span>' : 'OFF') + '<br>전류 ' + curmA + ' mA · 시간 ' + f1(runT) + '분<br>(−)극 H₂ <b>' + f1(gasH) + ' mL</b> : (+)극 O₂ <b>' + f1(gasO) + ' mL</b>' + (gasH > 0.4 ? ' = <b>2 : 1</b>' : '') + '<br>부피비는 계수비(2 : 1)와 같아요. (25 °C, 1 mol = 24.5 L)');
      }
      function setMode(m) {
        mode = m; dev.visible = m === 'dev'; mm.visible = m === 'mol';
        lc.show(m === 'dev'); la.show(m === 'dev'); lb.show(m === 'dev'); eqLab.show(m === 'mol'); lw.show(m === 'mol'); lp.show(m === 'mol'); lt.show(false);
        orbit.ty = m === 'dev' ? 3.3 : 0.3; orbit.dist = m === 'dev' ? (phone ? 22 : 17) : (phone ? 17 : 13);
        rowD.style.display = m === 'dev' ? '' : 'none'; rowM.style.display = m === 'mol' ? '' : 'none';
        if (m === 'dev') { if (plM.playing) plM.pause(); } else if (plD.playing) plD.pause();
        if (m === 'dev') devInfo(); else setProg(prog);
      }
      const rowOf = () => { const r = document.querySelectorAll('.v3-player'); return r[r.length - 1]; };
      const plD = controls.player({ duration: 10, loop: true, label: '8분 전기 분해', phases: [[0, '시작'], [0.02, '기체 모으는 중'], [0.8, '8분 완료'], [0.92, '장치 비우기']], onFrame(p) { pD = p; own = p > 0 ? 'dev' : (own === 'dev' ? null : own); } });
      const rowD = rowOf();
      const plM = controls.player({ duration: 9, loop: true, label: '반응 보기', phases: [[0, '① 물 분자 2개'], [0.17, '② 결합이 끊어져요'], [0.5, '③ 새 짝을 찾아요'], [0.85, '④ H₂ + O₂'], [0.97, '처음으로']], onFrame(p) { pM = p; own = p > 0 ? 'mol' : (own === 'mol' ? null : own); } });
      const rowM = rowOf();
      setMode('dev');
      return {
        update(dt, t) {
          dt = Math.min(dt, 0.05);
          const Z = ctx.lesson();
          if (Z) {
            const S2 = Z.S, want = S2.scene === 'model' ? 'mol' : 'dev';
            const sg = [want, S2.V, S2.elec, S2.on, S2.run.t > 0 ? 1 : 0, S2.draining].join('|');
            if (sg !== sig) { sig = sg; if (own) { const k = own === 'dev' ? plD : plM; own = null; k.pause(); k.set(0); } }
            if (want !== mode) setMode(want);
            Vv = S2.V; elecOn = S2.elec;
            if (mode === 'dev') {
              if (own === 'dev') {
                const pp = pD < 0.8 ? pD / 0.8 : pD < 0.92 ? 1 : 1 - (pD - 0.92) / 0.08, ft = pp * 8, I = elecOn ? Z.curOf(Vv) : 0;
                runT = ft; gasH = I > 0 ? Z.rateH(Vv) * ft : 0; gasO = I > 0 ? Z.rateO(Vv) * ft : 0; on = I > 0 && pD < 0.8; curmA = I;
              } else { gasH = S2.gas.h; gasO = S2.gas.o; runT = S2.run.t; on = !!(S2.on && elecOn && Z.curOf(Vv) > 0 && !S2.draining && S2.run.t < 8); curmA = S2.on && elecOn ? Z.curOf(Vv) : 0; }
            } else prog = own === 'mol' ? (pM < 0.97 ? pM / 0.97 : 1 - (pM - 0.97) / 0.03) : S2.m.t;
          }
          if (mode === 'dev') {
            dev.rotation.y += dt * 0.1;
            liq.material.color.setHex(elecOn ? 0x2f8cff : 0x7fc4ff); liq.material.opacity = elecOn ? 0.38 : 0.22;
            const gas = 0, H3 = gasH, O3 = gasO;
            // 시험관 안 물·기체 (기체는 위에서부터 차올라요; H2는 O2의 2배)
            const len = TT - TB;
            tubes.forEach((T, i) => {
              const frac = Math.min(0.97, (i === 0 ? H3 : O3) / CAP);
              const gh = len * frac, wh = (TT - TB) - gh + 0.0;
              T.gasM.scale.set(1, Math.max(gh, 1e-3), 1); T.gasM.position.y = TT - gh / 2; T.gasM.visible = gh > 0.02;
              const wy0 = TB, wTop = TT - gh; T.water.scale.set(1, Math.max(wTop - wy0, 1e-3), 1); T.water.position.y = (wy0 + wTop) / 2;
            });
            // 기포
            if (on) { const k = Math.max(0.3, curmA / 130); acc[0] += dt * 14 * k; acc[1] += dt * 7 * k; }
            for (let side = 0; side < 2; side++) {
              while (acc[side] >= 1) { acc[side] -= 1; const b = bs.find((q) => !q.on); if (!b) break; b.on = true; b.x = (side ? EX : -EX) + L.rnd(-0.06, 0.06); b.y = 1.0 + L.rnd(0, 0.3); b.z = L.rnd(-0.06, 0.06); b.v = L.rnd(1.6, 2.3); b.s = L.rnd(0.06, 0.1); b.side = side; }
            }
            for (let i = 0; i < NB; i++) {
              const b = bs[i];
              if (b.on) { b.y += b.v * dt; b.x += Math.sin(t * 9 + i) * 0.003; if (b.y > TT - 0.4 || (b.y > WL && Math.abs(b.x) > 0.8 && false)) { b.on = false; } }
              dum.position.set(b.x, b.on ? b.y : -9, b.z); dum.scale.setScalar(b.on ? b.s : 0.001); dum.updateMatrix(); bub.setMatrixAt(i, dum.matrix);
            }
            bub.instanceMatrix.needsUpdate = true;
            sw.material.emissive.setHex(on ? 0x22cc55 : 0x000000);
            devInfo.t = (devInfo.t || 0) + dt; if (devInfo.t > 0.4) { devInfo.t = 0; devInfo(); }
          } else { setProg(prog); }
        },
      };
    },
  });
})();
