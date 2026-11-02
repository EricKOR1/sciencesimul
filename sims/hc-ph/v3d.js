/* hc-ph · 3D pH와 이온 수
   pH가 1 작아질 때마다 H⁺는 10배로 늘어요. 입자를 직접 세어 보며 '지수 눈금'이 왜 필요한지 느껴 봐요. */
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
    title: 'pH와 이온 수 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: phone ? 10.5 : 10, theta: 0.5, phi: 1.2, min: 5, max: 22, target: [0, 1.7, 0] },
    autoRotate: 0.15,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const L = makeLib(THREE);
      const R = 2.4, HGT = 4.4;
      const beaker = new THREE.Mesh(new THREE.CylinderGeometry(R, R, HGT, 48, 1, true), new THREE.MeshStandardMaterial({ color: 0xcfe0ff, transparent: true, opacity: 0.14, roughness: 0.1, side: THREE.DoubleSide, depthWrite: false })); beaker.position.y = HGT / 2; root.add(beaker);
      const bot = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.12, 48), new THREE.MeshStandardMaterial({ color: 0xcfe0ff, transparent: true, opacity: 0.35, roughness: 0.1, depthWrite: false })); bot.position.y = 0.06; root.add(bot);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 0.05, 12, 64), new THREE.MeshStandardMaterial({ color: 0xe0ebff, roughness: 0.2 })); rim.rotation.x = Math.PI / 2; rim.position.y = HGT; root.add(rim);
      const LV = 3.5;
      const liq = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.04, R - 0.04, LV, 48), new THREE.MeshStandardMaterial({ color: 0x66cc66, transparent: true, opacity: 0.26, roughness: 0.15, depthWrite: false })); liq.position.y = LV / 2 + 0.06; root.add(liq);
      const top = new THREE.Mesh(new THREE.CircleGeometry(R - 0.04, 48), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.25, roughness: 0.05, depthWrite: false })); top.rotation.x = -Math.PI / 2; top.position.y = LV + 0.06; root.add(top);
      const floor = new THREE.Mesh(new THREE.CylinderGeometry(R + 1.2, R + 1.2, 0.1, 48), new THREE.MeshBasicMaterial({ color: 0x050b18 })); floor.position.y = -0.05; root.add(floor);
      const NMAX = 1500;
      const mk = (col, em) => { const m = new THREE.InstancedMesh(L.SG, new THREE.MeshStandardMaterial({ color: col, emissive: em, emissiveIntensity: 0.45, roughness: 0.35 }), NMAX); m.frustumCulled = false; m.count = 0; root.add(m); return m; };
      const mH = mk(0xff2b4a, 0x9a0020), mO = mk(0x4d8dff, 0x00287a);
      const pts = { h: [], o: [] };
      const rp = () => { const r = Math.sqrt(Math.random()) * (R - 0.25), a = Math.random() * 6.283; return { x: Math.cos(a) * r, y: 0.25 + Math.random() * (LV - 0.35), z: Math.sin(a) * r, ph: Math.random() * 6.28, sp: 0.4 + Math.random() * 0.6 }; };
      for (let i = 0; i < NMAX; i++) { pts.h.push(rp()); pts.o.push(rp()); }
      const dum = new THREE.Object3D();
      const INDI = [0xe53935, 0xf4511e, 0xfb8c00, 0xfdd835, 0x7cb342, 0x43a047, 0x00897b, 0x1e88e5, 0x3949ab, 0x5e35b1, 0x6a1b9a, 0x7b1fa2, 0x8e24aa];
      let pH = 4, base = 4, wat = 0, last2d = null;
      const lblN = label('', [0, LV + 0.6, 0], { size: 12.5 });
      function counts() { return [Math.min(NMAX, Math.round(Math.pow(10, 7 - pH))), Math.min(NMAX, Math.round(Math.pow(10, pH - 7)))]; }
      function show() {
        const col = pH >= 6.5 && pH <= 7.5 ? 0x4cc36b : INDI[Math.max(0, Math.min(12, Math.round(pH) - 1))];
        liq.material.color.setHex(col);
        const [nh, no] = counts(); mH.count = nh; mO.count = no;
        const trueH = Math.pow(10, 7 - pH), trueO = Math.pow(10, pH - 7);
        const sat = trueH > NMAX || trueO > NMAX;
        const sci = (e) => '10<sup>' + e + '</sup>';
        lblN.set('pH ' + (Math.round(pH * 10) / 10) + (pH < 7 ? ' 산성' : pH > 7 ? ' 염기성' : ' 중성'));
        info('<b>[H⁺] = ' + sci(-Math.round(pH * 10) / 10) + ' mol/L</b><br><span style="color:#ff6b6b">●</span> H⁺ <b>' + fmt(trueH) + '</b> · <span style="color:#6ba5ff">●</span> OH⁻ <b>' + fmt(trueO) + '</b> (pH 7일 때 각 1개 기준)<br>' + (sat ? '너무 많아 다 못 그려요. 그래서 로그(pH) 눈금을 써요!' : 'pH가 1 내려가면 H⁺ 수는 10배예요.'));
      }
      function fmt(x) { return x >= 1e6 ? '아주 많아요' : x >= 0.7 ? Math.round(x) + '개' : '거의 없어요'; }
      const rg = controls.range('pH', 1, 13, 1, pH, (v) => { pH = +v; base = pH; wat = 0; show(); }, (v) => v);
      controls.button('💧 물 10배 섞기', () => { if (pH === 7) return; pH = pH < 7 ? Math.min(7, pH + 1) : Math.max(7, pH - 1); rg.set(pH); show(); });
      controls.button('↺ 처음', () => { pH = base; rg.set(pH); show(); });
      show();
      return {
        update(dt, t) {
          try { const e = window.__sim && window.__sim.S && window.__sim.S.ex; if (e && typeof e.pH === 'number') { if (last2d === null) last2d = e.pH; else if (e.pH !== last2d) { last2d = e.pH; pH = base = e.pH; rg.set(pH); show(); } } } catch (x) { /* 2D 상태를 읽지 못하면 무시 */ }
          const [nh, no] = counts();
          [[mH, pts.h, nh], [mO, pts.o, no]].forEach(([m, arr, n]) => {
            for (let i = 0; i < n; i++) { const p = arr[i]; dum.position.set(p.x + Math.sin(t * p.sp + p.ph) * 0.12, p.y + Math.cos(t * p.sp * 1.3 + p.ph) * 0.12, p.z + Math.sin(t * p.sp * 0.8 + p.ph * 2) * 0.12); dum.scale.setScalar(n > 300 ? 0.075 : n > 40 ? 0.1 : 0.15); dum.updateMatrix(); m.setMatrixAt(i, dum.matrix); }
            m.instanceMatrix.needsUpdate = true;
          });
        },
      };
    },
  });
})();
