/* hc-molarity · 3D 몰 농도
   몰 농도 M = 용질의 몰수 ÷ 용액의 부피(L). 같은 부피에 입자가 촘촘할수록 진해요. 물을 더하면 입자 수는 그대로, 부피만 커져서 묽어져요. */
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
    title: '몰 농도 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: phone ? 15 : 11, theta: 0.5, phi: 1.2, min: 5, max: 24, target: [0, 2.2, 0] },
    autoRotate: 0.15,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const L = makeLib(THREE);
      const R = 2.1;
      const SOL = {
        glu: { name: '포도당', parts: [['glu', 0xffb54d, 0.17, 1]], f: 'C₆H₁₂O₆' },
        nacl: { name: 'NaCl', parts: [['Na⁺', 0xb07cf5, 0.12, 1], ['Cl⁻', 0x34c759, 0.16, 1]], f: 'NaCl' },
        cacl2: { name: 'CaCl₂', parts: [['Ca²⁺', 0x6fd0c4, 0.15, 1], ['Cl⁻', 0x34c759, 0.16, 2]], f: 'CaCl₂' },
      };
      let sol = 'glu', n = 1.0, Vl = 1.0; // n: 몰수, Vl: 부피(L)
      const UNIT = 24; // 1 mol = 24개 입자(그림)
      const beaker = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 1, 48, 1, true), new THREE.MeshStandardMaterial({ color: 0xcfe0ff, transparent: true, opacity: 0.14, roughness: 0.1, side: THREE.DoubleSide, depthWrite: false })); root.add(beaker);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 0.05, 12, 64), new THREE.MeshStandardMaterial({ color: 0xe0ebff, roughness: 0.2 })); rim.rotation.x = Math.PI / 2; root.add(rim);
      const bot = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.12, 48), new THREE.MeshStandardMaterial({ color: 0xcfe0ff, transparent: true, opacity: 0.35, roughness: 0.1, depthWrite: false })); bot.position.y = 0.06; root.add(bot);
      const liqM = new THREE.MeshStandardMaterial({ color: 0x4aa3ff, transparent: true, opacity: 0.25, roughness: 0.12, depthWrite: false });
      const liq = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.04, R - 0.04, 1, 48), liqM); root.add(liq);
      const floor = new THREE.Mesh(new THREE.CylinderGeometry(R + 1.2, R + 1.2, 0.1, 48), new THREE.MeshStandardMaterial({ color: 0x0f182c, roughness: 0.95 })); floor.position.y = -0.05; root.add(floor);
      // 눈금 (0.5 L 간격)
      const ticks = []; for (let i = 1; i <= 8; i++) { const t = new THREE.Mesh(new THREE.BoxGeometry(i % 2 ? 0.2 : 0.38, 0.03, 0.03), L.mat(0xe8f0ff)); t.position.set(R + 0.0, 0, 0); root.add(t); ticks.push(t); }
      const NM = 120;
      let sets = [];
      const dum = new THREE.Object3D();
      const lbl = label('', [0, 0, 0], { size: 13 }), lv = label('', [R + 0.2, 0, 0], { size: 12 });
      const HU = 1.9; // 1 L의 높이
      function build() {
        sets.forEach((s) => root.remove(s.m)); sets = [];
        const S = SOL[sol]; const hh = Vl * HU;
        S.parts.forEach(([nm, col, r, k]) => {
          const cnt = Math.round(n * UNIT * k); const m = new THREE.InstancedMesh(L.SG, new THREE.MeshStandardMaterial({ color: col, roughness: 0.35, emissive: col, emissiveIntensity: 0.2 }), cnt); m.frustumCulled = false; root.add(m);
          const p = []; for (let i = 0; i < cnt; i++) p.push({ u: Math.sqrt(Math.random()), a: Math.random() * 6.283, y: Math.random(), ph: Math.random() * 6.28, sp: 0.5 + Math.random() });
          sets.push({ m, p, r, cnt }); 
        });
        update2();
      }
      function update2() {
        const hh = Vl * HU; beaker.scale.y = 4.6 * 1; beaker.position.y = 2.3; rim.position.y = 4.6;
        liq.scale.y = hh; liq.position.y = hh / 2 + 0.06;
        liqM.opacity = 0.18 + 0.1 * Math.min(1, n / Vl / 2);
        const c = n / Vl; const S = SOL[sol];
        ticks.forEach((t, i) => { t.position.y = 0.06 + (i + 1) * 0.5 * HU; t.visible = (i + 1) * 0.5 <= 2.3; });
        lbl.obj = [0, hh + 0.75, 0]; lbl.set((n).toFixed(1) + ' mol / ' + Vl.toFixed(1) + ' L = <b>' + c.toFixed(2) + ' M</b>');
        lv.obj = [R + 0.2, hh + 0.06, 0]; lv.set(Vl.toFixed(1) + ' L'); lv.off = [0.55, 0, 0];
        const ions = S.parts.length > 1 ? '<br>' + S.parts.map(([nm, col, r, k]) => '<span style="color:#' + col.toString(16).padStart(6, '0') + '">●</span> [' + nm + '] = <b>' + (c * k).toFixed(2) + ' M</b>').join(' · ') : '';
        info('<b>' + S.name + ' 수용액</b> · 몰 농도 M = n ÷ V = <b>' + c.toFixed(2) + ' M</b><br>입자 ' + Math.round(n * UNIT * S.parts.reduce((a, b) => a + b[3], 0)) + '개가 ' + Vl.toFixed(1) + ' L 안에 들어 있어요 (1 mol = ' + UNIT + '개로 그림)' + ions);
      }
      controls.segment('물질', Object.keys(SOL).map((k) => ({ value: k, label: SOL[k].name })), sol, (v) => { sol = v; build(); });
      const r1 = controls.range('용질', 0.5, 2, 0.5, n, (v) => { n = +v; build(); }, (v) => (+v).toFixed(1) + ' mol');
      const r2 = controls.range('부피', 0.5, 2, 0.5, Vl, (v) => { Vl = +v; update2(); }, (v) => (+v).toFixed(1) + ' L');
      controls.button('💧 물 더하기 (부피 ×2)', () => { Vl = Math.min(2, Vl * 2); r2.set(Vl); update2(); });
      build();
      return {
        update(dt, t) {
          const hh = Vl * HU;
          sets.forEach((s) => {
            for (let i = 0; i < s.cnt; i++) { const p = s.p[i]; const rr = p.u * (R - 0.3); dum.position.set(Math.cos(p.a) * rr + Math.sin(t * p.sp + p.ph) * 0.1, 0.25 + p.y * (hh - 0.4) + Math.cos(t * p.sp * 1.2 + p.ph) * 0.08, Math.sin(p.a) * rr + Math.sin(t * p.sp * 0.8 + p.ph * 2) * 0.1); dum.scale.setScalar(s.r); dum.updateMatrix(); s.m.setMatrixAt(i, dum.matrix); }
            s.m.instanceMatrix.needsUpdate = true;
          });
        },
      };
    },
  });
})();
