/* hc-mole-convert · 3D 기체 1몰 상자
   같은 온도·압력에서 기체 1 mol은 종류와 관계없이 같은 부피(0 °C, 1기압: 22.4 L)를 차지해요. */
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
    title: '기체 1몰 상자 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: phone ? 20 : 14, theta: 0.35, phi: 1.2, min: 8, max: 40, target: [0, 1.8, 0] },
    autoRotate: 0.12,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const L = makeLib(THREE);
      const GAS = [
        { key: 'H2', f: 'H₂', M: 2, col: 0x9ec5ff, sp: 1.6 },
        { key: 'O2', f: 'O₂', M: 32, col: 0xf0524f, sp: 0.8 },
        { key: 'CO2', f: 'CO₂', M: 44, col: 0x8a93a3, sp: 0.68 },
      ];
      let n = 1, T = 0;
      const SPX = 5.4, K = 0.42;
      const boxes = GAS.map((g, gi) => {
        const box = L.glassBox(1, 1, 1, g.col, 0.11); box.position.x = (gi - 1) * SPX; root.add(box);
        const lab = label(g.f + ' · ' + g.M + ' g', [(gi - 1) * SPX, 4, 0], { size: 13 });
        const mols = [];
        for (let i = 0; i < 24; i++) {
          const m = L.mol(L.MOLS[g.key], K); root.add(m);
          m.userData = { p: new THREE.Vector3(), v: new THREE.Vector3(L.rnd(-1, 1), L.rnd(-1, 1), L.rnd(-1, 1)).normalize(), w: new THREE.Vector3(L.rnd(-1, 1), L.rnd(-1, 1), L.rnd(-1, 1)) };
          mols.push(m);
        }
        return { g, box, lab, mols, edge: 3 };
      });
      const floor = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x24324f, roughness: 0.95, envMapIntensity: 0.05 }));
      floor.scale.set(3 * SPX - 0.4, 0.14, 5.0); floor.position.set(0, -0.08, 0); root.add(floor);

      function edgeOf() { return 3 * Math.cbrt(n * (273 + T) / 273); }
      function setup() {
        const e = edgeOf(), cnt = Math.round(12 * n);
        boxes.forEach((B) => {
          B.edge = e; B.box.scale.set(e, e, e); B.box.position.y = e / 2;
          B.lab.obj = [B.box.position.x, e + 0.5, 0];
          B.mols.forEach((m, i) => {
            m.visible = i < cnt;
            const lim = e / 2 - 0.5; m.userData.p.set(L.rnd(-lim, lim), L.rnd(-lim, lim), L.rnd(-lim, lim));
          });
        });
        const V = (22.4 * n * (273 + T) / 273);
        info('<b>기체 ' + n + ' mol</b> · ' + T + ' °C, 1기압<br>부피 <b>' + V.toFixed(1) + ' L</b> (세 기체가 모두 같아요)<br>분자 수 <b>' + (6.02 * n).toFixed(2).replace(/\.?0+$/, '') + '×10²³개</b> · 질량만 달라요');
      }
      controls.segment('양', [{ value: 0.5, label: '0.5 mol' }, { value: 1, label: '1 mol' }, { value: 2, label: '2 mol' }], n, (v) => { n = +v; setup(); });
      controls.range('온도', 0, 100, 25, T, (v) => { T = +v; const e = edgeOf(); boxes.forEach((B) => { B.edge = e; B.box.scale.set(e, e, e); B.box.position.y = e / 2; B.lab.obj = [B.box.position.x, e + 0.5, 0]; }); const V = 22.4 * n * (273 + T) / 273; info('<b>기체 ' + n + ' mol</b> · ' + T + ' °C, 1기압<br>부피 <b>' + V.toFixed(1) + ' L</b> (세 기체가 모두 같아요)<br>분자 수 <b>' + (6.02 * n).toFixed(2).replace(/\.?0+$/, '') + '×10²³개</b> · 질량만 달라요'); }, (v) => v + ' °C');
      setup();
      return {
        update(dt) {
          dt = Math.min(dt, 0.05);
          const sT = Math.sqrt((273 + T) / 273);
          boxes.forEach((B) => {
            const lim = B.edge / 2 - 0.45;
            B.mols.forEach((m) => {
              if (!m.visible) return;
              const u = m.userData, s = B.g.sp * sT * 2.0;
              u.p.addScaledVector(u.v, s * dt);
              ['x', 'y', 'z'].forEach((a) => { if (u.p[a] > lim) { u.p[a] = lim; u.v[a] = -Math.abs(u.v[a]); } else if (u.p[a] < -lim) { u.p[a] = -lim; u.v[a] = Math.abs(u.v[a]); } });
              m.position.set(B.box.position.x + u.p.x, B.box.position.y + u.p.y, u.p.z);
              m.rotation.x += u.w.x * dt * 1.5; m.rotation.y += u.w.y * dt * 1.5; m.rotation.z += u.w.z * dt * 1.5;
            });
          });
        },
      };
    },
  });
})();
