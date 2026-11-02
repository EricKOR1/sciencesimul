/* hc-mole · 3D 몰 상자 쌓기
   '1다스 = 12개'처럼 '1 mol = 6.02×10²³개'도 한 묶음이에요. 물질이 달라도 입자 수가 같고, 질량만 달라요. */
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
    title: '몰 상자 쌓기 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: phone ? 14 : 10, theta: 0.5, phi: 1.15, min: 5, max: 30, target: [0, 1.4, 0] },
    autoRotate: 0.22,
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      const L = makeLib(THREE);
      const SUB = {
        egg: { name: '달걀', unit: 12, box: '1다스', mass: null },
        H2O: { name: '물', mass: 18, o: 0x59a8ff, h: 0xf3f6fb, r: 0.2, cl: '물 H₂O' },
        C: { name: '탄소', mass: 12, o: 0x6b7280, r: 0.2, cl: '탄소 C' },
        Cu: { name: '구리', mass: 63.5, o: 0xe08a3c, r: 0.22, cl: '구리 Cu' },
      };
      let sub = 'H2O', amt = 1;
      const N3 = 5, GAP = 0.42, BOXW = N3 * GAP + 0.3; // 상자 한 변 (입자 5×5×5 = 125개 = 1 mol을 나타내요)
      const SP = BOXW + 0.55;
      const group = new THREE.Group(); root.add(group);
      const labs = [];
      for (let i = 0; i < 3; i++) { const l = label('', [0, 0, 0], { size: 12.5 }); l.show(false); labs.push(l); }
      const fl = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x24324f, roughness: 0.95, envMapIntensity: 0.05 }));
      fl.scale.set(3 * SP + 0.6, 0.12, BOXW + 0.9); fl.position.set(0, -0.1, 0); root.add(fl);
      const sphM = new THREE.Mesh(L.SG, L.mat(0xffffff));
      let mO, mH, mEgg, carton = [];
      const dum = new THREE.Object3D();
      const eggGeo = new THREE.SphereGeometry(1, 24, 18);

      function rebuild() {
        L.clear(group); carton = [];
        fl.scale.x = Math.ceil(amt - 1e-9) * SP + 1.0; orbit.dist = (phone ? 1.3 : 1) * (7.4 + 2.2 * Math.ceil(amt - 1e-9));
        const S = SUB[sub];
        const boxes = Math.ceil(amt - 1e-9);
        const ox = -(boxes - 1) * SP / 2;
        if (sub === 'egg') {
          const dozens = amt; // 1, 2, 3 다스
          for (let b = 0; b < dozens; b++) {
            const cx = ox + b * SP;
            const car = new THREE.Mesh(new THREE.BoxGeometry(BOXW, 0.5, 2 * 0.62 + 0.3), new THREE.MeshStandardMaterial({ color: 0xd9b88a, roughness: 0.9 })); car.position.set(cx, 0.25, 0); group.add(car);
            const em = new THREE.InstancedMesh(eggGeo, new THREE.MeshStandardMaterial({ color: 0xfff1d6, roughness: 0.4 }), 12);
            for (let i = 0; i < 12; i++) { dum.position.set(cx - BOXW / 2 + 0.45 + (i % 6) * 0.58 + 0.05, 0.78, (i < 6 ? -0.34 : 0.34)); dum.scale.set(0.27, 0.36, 0.27); dum.updateMatrix(); em.setMatrixAt(i, dum.matrix); }
            group.add(em);
            labs[b].obj = [cx, 1.9, 0]; labs[b].set('12개 = 1다스'); labs[b].show(true);
          }
          for (let b = dozens; b < 3; b++) labs[b].show(false);
          info('<b>1다스 = 12개</b> · 달걀 ' + dozens + '다스 = <b>' + (dozens * 12) + '개</b><br>낱개로 세지 않고 12개씩 묶음으로 세요.<br>화학에서는 <b>6.02×10²³개</b>를 한 묶음(1 mol)으로 세요.');
          return;
        }
        // 1 mol 상자 — 5×5×5 입자 (한 상자 = 6.02×10²³개)
        const per = N3 * N3 * N3, total = Math.round(per * amt);
        const water = sub === 'H2O';
        const nO = total;
        mO = new THREE.InstancedMesh(L.SG, new THREE.MeshStandardMaterial({ color: S.o, roughness: 0.35, metalness: sub === 'Cu' ? 0.55 : 0.06 }), nO);
        mH = water ? new THREE.InstancedMesh(L.SG, L.mat('H'), nO * 2) : null;
        for (let i = 0; i < nO; i++) {
          const b = Math.floor(i / per), j = i % per;
          const x = j % N3, y = Math.floor(j / N3) % N3, z = Math.floor(j / (N3 * N3));
          const cx = ox + b * SP;
          const px = cx - BOXW / 2 + 0.3 + (x + 0.5) * GAP - 0.15 + 0.08, py = 0.3 + y * GAP, pz = -BOXW / 2 + 0.45 + (z + 0.5) * GAP - 0.08;
          dum.position.set(px, py, pz); dum.scale.setScalar(S.r * (water ? 1.0 : 1.05)); dum.rotation.set(0, 0, 0); dum.updateMatrix(); mO.setMatrixAt(i, dum.matrix);
          if (water) {
            const a = (i * 2.399) % (Math.PI * 2);
            [1, -1].forEach((sg, k) => { dum.position.set(px + Math.cos(a + sg * 0.9) * 0.15, py + Math.sin(a + sg * 0.9) * 0.15 - 0.03, pz + 0.05 * sg); dum.scale.setScalar(0.1); dum.updateMatrix(); mH.setMatrixAt(i * 2 + k, dum.matrix); });
          }
        }
        group.add(mO); if (mH) group.add(mH);
        for (let b = 0; b < boxes; b++) {
          const cx = ox + b * SP, frac = Math.min(1, amt - b);
          const g = L.glassBox(BOXW, BOXW, BOXW, 0x9ec5ff, 0.1); g.position.set(cx, BOXW / 2 + 0.05, 0); group.add(g);
          labs[b].obj = [cx, BOXW + 0.55, 0]; labs[b].set(frac < 1 ? '0.5 mol' : '1 mol = 6.02×10²³개'); labs[b].show(true);
        }
        for (let b = boxes; b < 3; b++) labs[b].show(false);
        const cnt = (6.02 * amt).toFixed(2).replace(/\.?0+$/, '');
        info('<b>' + S.cl + ' ' + amt + ' mol</b> = 입자 <b>' + cnt + '×10²³개</b><br>질량 = ' + amt + ' × ' + S.mass + ' g = <b>' + (amt * S.mass).toFixed(amt * S.mass % 1 ? 1 : 0) + ' g</b><br>입자 수는 같아도 물질마다 1 mol의 질량이 달라요.');
      }
      let rr = null;
      function setSub(v) { sub = v; if (v === 'egg') amt = Math.max(1, Math.ceil(amt)); if (rr) rr.set(amt); rebuild(); }
      controls.segment('물질', [{ value: 'egg', label: '🥚 달걀' }, { value: 'H2O', label: '물' }, { value: 'C', label: '탄소' }, { value: 'Cu', label: '구리' }], sub, (v) => setSub(v));
      rr = controls.range('양', 0.5, 3, 0.5, amt, (v) => { amt = sub === 'egg' ? Math.max(1, Math.ceil(v)) : +v; rebuild(); }, (v) => (sub === 'egg' ? Math.max(1, Math.ceil(v)) + '다스' : (+v) + ' mol'));
      setSub('H2O');
      return {};
    },
  });
})();
