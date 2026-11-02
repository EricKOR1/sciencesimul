/* hc-equation-mole · 3D 반응식: 분자 개수와 계수비
   반응이 한 번 일어날 때마다 반응물이 계수만큼 줄고 생성물이 계수만큼 늘어요. 원자 수는 그대로예요. */
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
    title: '반응식 입자 모형 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: phone ? 21 : 15.5, theta: 0.15, phi: 0.95, min: 6, max: 34, target: [0, -0.4, 0] },
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const L = makeLib(THREE);
      const RX = {
        w: { name: '물 생성', R: [['H2', 2], ['O2', 1]], P: [['H2O', 2]], eq: '2H₂ + O₂ → 2H₂O' },
        n: { name: '암모니아', R: [['N2', 1], ['H2', 3]], P: [['NH3', 2]], eq: 'N₂ + 3H₂ → 2NH₃' },
        c: { name: '메테인 연소', R: [['CH4', 1], ['O2', 2]], P: [['CO2', 1], ['H2O', 2]], eq: 'CH₄ + 2O₂ → CO₂ + 2H₂O' },
      };
      const U = 3; // 반응 단위 3번까지
      let rx = 'w', done = 0, auto = false, autoT = 0;
      const K = 0.8;
      const pools = {}; // species -> [{g, tx, ty, tz, ts}]
      const spec = [];  // 현재 반응의 종 목록
      const root2 = new THREE.Group(); root.add(root2);
      const labs = [];
      for (let i = 0; i < 4; i++) { const l = label('', [0, 0, 0], { size: 12.5 }); l.show(false); labs.push(l); }
      const tray = (x, col) => { const t = L.glassBox(6.4, 0.25, 4.8, col, 0.2); t.position.set(x, -1.3, 0); root.add(t); return t; };
      tray(-4.1, 0x6aa2ff); tray(4.1, 0x58d68d);
      const arr = L.arrow([-0.7, -1.0, 0], [0.7, -1.0, 0], 0xffd34d, 0.1, 0.45); root.add(arr);
      const aL = label('반응', [0, -0.2, 0], { size: 12 });

      function slots(side, idx, count, rowsN, row) { // 한 종의 i번째 분자의 칸 위치
        const per = 3; const col = idx % per, rr = Math.floor(idx / per);
        const x = (side < 0 ? -5.0 : 5.0) + (col - 1) * XSP * 1.25;
        const z = (row - (rowsN - 1) / 2) * ZSP * 1.1 + (rr - 0.5) * 0;
        return [x, -1.15 + rr * 1.3 - (Math.floor(count / per) > 0 ? 0 : 0), z];
      }
      function build() {
        L.clear(root2); spec.length = 0;
        const R = RX[rx];
        const rowsR = R.R.length, rowsP = R.P.length;
        R.R.forEach(([k, c], row) => spec.push({ k, c, side: -1, row, rows: rowsR, pool: [] }));
        R.P.forEach(([k, c], row) => spec.push({ k, c, side: 1, row, rows: rowsP, pool: [] }));
        spec.forEach((s) => {
          for (let i = 0; i < s.c * U; i++) {
            const g = L.mol(L.MOLS[s.k], K); g.scale.setScalar(0.001); g.position.set(0, 0, 0); root2.add(g);
            s.pool.push({ g, i, ph: Math.random() * 6 });
          }
        });
        labs.forEach((l) => l.show(false));
        spec.forEach((s, i) => { const l = labs[i]; l.obj = [s.side < 0 ? -4.1 : 4.1, 0.0, (s.row - (s.rows - 1) / 2) * 2.9 - 1.2]; l.show(true); l.off = [0, 2.0, 0]; });
        place(true); text();
      }
      function counts(s) { return s.side < 0 ? s.c * (U - done) : s.c * done; }
      function place(snap) {
        spec.forEach((s) => {
          const cnt = counts(s);
          s.pool.forEach((p) => {
            const here = p.i < cnt;
            const per = 3, col = p.i % per, rr = Math.floor(p.i / per);
            const x = (s.side < 0 ? -4.1 : 4.1) + (col - 1) * 1.9;
            const z = (s.row - (s.rows - 1) / 2) * 2.9;
            p.tx = here ? x : 0; p.ty = here ? -0.6 + rr * 1.25 : 0.2; p.tz = here ? z : 0; p.ts = here ? 1 : 0.001;
            if (snap) { p.g.position.set(p.tx, p.ty, p.tz); p.g.scale.setScalar(p.ts); }
          });
        });
      }
      function text() {
        const R = RX[rx];
        spec.forEach((s, i) => { labs[i].set(L.MOLS[s.k].f + ' · ' + counts(s) + '개'); });
        // 원자 수 보존
        info('<b>' + R.eq + '</b><br>반응 ' + done + '번 → 반응물 ' + R.R.map(([k, c]) => L.MOLS[k].f + ' ' + c * (U - done)).join(', ') + ' / 생성물 ' + R.P.map(([k, c]) => L.MOLS[k].f + ' ' + c * done).join(', ') + '<br>계수비 = 분자 수의 비 = <b>몰수비</b> (' + R.R.concat(R.P).map((x) => x[1]).join(' : ') + ')');
      }
      controls.segment('반응', Object.keys(RX).map((k) => ({ value: k, label: RX[k].name })), rx, (v) => { rx = v; done = 0; auto = false; rr.set(0); build(); });
      const rr = controls.range('반응 횟수', 0, U, 1, 0, (v) => { done = +v; auto = false; place(); text(); }, (v) => v + '번');
      controls.button('▶ 자동 진행', () => { done = 0; rr.set(0); place(); text(); auto = true; autoT = 0; });
      build();
      return {
        update(dt, t) {
          const k = 1 - Math.pow(0.0015, dt);
          spec.forEach((s) => s.pool.forEach((p) => {
            const g = p.g; g.position.x += (p.tx - g.position.x) * k; g.position.y += (p.ty + (p.ts > 0.5 ? Math.sin(t * 1.3 + p.ph) * 0.07 : 0) - g.position.y) * k; g.position.z += (p.tz - g.position.z) * k;
            const sc = g.scale.x + (p.ts - g.scale.x) * k; g.scale.setScalar(Math.max(0.001, sc)); g.rotation.y += dt * 0.5; g.visible = sc > 0.01;
          }));
          if (auto) { autoT += dt; if (autoT > 1.6) { autoT = 0; if (done < U) { done++; rr.set(done); place(); text(); } else auto = false; } }
        },
      };
    },
  });
})();
