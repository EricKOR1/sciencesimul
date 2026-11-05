/* hc-conductivity · 3D 전하 운반자
   구리는 자유 전자가, 용융 NaCl은 이온이 움직여 전기를 날라요. 고체 NaCl 이온과 설탕 분자는 움직여도 전기를 나르지 못해요. */
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
    title: '전하 운반자 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대 · 시료를 고르고 전기장을 켜 봐요',
    camera: { dist: phone ? 21 : 16, theta: 0.5, phi: 1.1, min: 6, max: 30, target: [0, 2.6, 0] },
    autoRotate: 0.12,
    levels: [2],
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const L = makeLib(THREE);
      const W = 6.6, H = 3.2, D = 3.2; // 시료 상자
      const E1 = '<span style="color:#ffd34d">●</span>';
      const SMP = {
        cu: { name: '구리(금속)', cond: 'yes', txt: E1 + ' 자유 전자가 (+)극 쪽으로 흘러 전류가 통해요.<br>양이온(주황)은 제자리에서 떨기만 해요. 전하 운반자: <b>자유 전자</b>' },
        nacl_s: { name: '고체 NaCl', cond: 'no', txt: 'Na⁺와 Cl⁻가 격자 자리에 <b>고정</b>돼 있어요.<br>움직이는 전하가 없어 전기가 안 통해요.' },
        nacl_l: { name: '용융 NaCl', cond: 'yes', txt: '녹으면 Na⁺(보라)는 (−)극, Cl⁻(초록)는 (+)극 쪽으로 이동해요.<br>전하 운반자: <b>이온</b>' },
        nacl_aq: { name: 'NaCl 수용액', cond: 'yes', txt: '물에 녹은 Na⁺(보라)는 (−)극, Cl⁻(초록)는 (+)극 쪽으로 이동해요.<br>전하 운반자: <b>이온</b>' },
        sugar_aq: { name: '설탕 수용액', cond: 'no', txt: '설탕 분자(분홍)는 <b>전하가 없는 분자</b>예요.<br>물에 녹아도 이온이 없어서 전기가 안 통해요.' },
        hcl_aq: { name: 'HCl 수용액', cond: 'diss', txt: '' },
        mol: { name: '분자 물질', cond: 'no', txt: '분자는 <b>전하가 없어서</b> 전기장 안에서도 전류가 흐르지 않아요.' },
        mol_s: { name: '분자 고체', cond: 'no', txt: '분자는 <b>전하가 없어서</b> 전기가 안 통해요.' },
      };
      const keyOfItem = (it) => (!it ? null : it.mat === 'metal' ? 'cu' : it.mat === 'ionic' ? (it.form === 'solid' ? 'nacl_s' : it.form === 'melt' ? 'nacl_l' : 'nacl_aq') : it.id === 'hcl_aq' ? 'hcl_aq' : it.form === 'aq' ? 'sugar_aq' : it.form === 'solid' ? 'mol_s' : 'mol');
      let bulbTarget = -1, key = 'cu', field = false, t0 = 0, diss = false, dissK = 0, itemName = '';
      const grp = new THREE.Group(); root.add(grp);
      const box = L.glassBox(W, H, D, 0x9ec5ff, 0.1); box.position.set(0, H / 2 + 0.1, 0); root.add(box);
      const water = L.glassBox(W - 0.05, H - 0.05, D - 0.05, 0x3b8cf0, 0.22); water.position.copy(box.position); water.visible = false; root.add(water);
      const base = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0x050b18 })); base.scale.set(W + 3.6, 0.14, D + 1.4); base.position.set(0, -0.0, 0); root.add(base);
      // 전극판: (−) 왼쪽, (+) 오른쪽
      const plate = (x, col) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.16, H + 0.5, D + 0.3), new THREE.MeshStandardMaterial({ color: col, roughness: 0.3, metalness: 0.7 })); m.position.set(x, H / 2 + 0.2, 0); root.add(m); return m; };
      const pL = plate(-W / 2 - 0.2, 0x4f7cff), pR = plate(W / 2 + 0.2, 0xf0524f);
      label('(−)극', pL, { size: 12.5, color: 'rgba(79,124,255,.9)' }).off = [0, 2.1, 0];
      label('(+)극', pR, { size: 12.5, color: 'rgba(240,82,79,.9)' }).off = [0, 2.1, 0];
      // 전구와 전선
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.55, 28, 20), new THREE.MeshStandardMaterial({ color: 0xfff3c0, emissive: 0xffc233, emissiveIntensity: 0, roughness: 0.2, transparent: true, opacity: 0.9 }));
      bulb.position.set(0, 6.0, 0); root.add(bulb);
      const sock = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.4, 16), L.mat(0x8a93a3)); sock.position.set(0, 5.35, 0); root.add(sock);
      const wmat = 0x7c8aa5;
      root.add(L.tube([[-W / 2 - 0.2, H + 0.45, 0], [-W / 2 - 0.2, 5.4, 0], [-1.2, 5.9, 0], [-0.25, 6.0, 0]], 0.06, wmat));
      root.add(L.tube([[W / 2 + 0.2, H + 0.45, 0], [W / 2 + 0.2, 5.4, 0], [1.2, 5.9, 0], [0.25, 6.0, 0]], 0.06, wmat));
      const bl = label('전구', bulb, { size: 12.5 }); bl.off = [0, 0.95, 0];
      const glow = new THREE.PointLight(0xffd34d, 0, 9); glow.position.copy(bulb.position); root.add(glow);

      // 입자 모음
      const N = { cu: 54, ecu: 46 };
      function inst(color, r, n, opts) { const m = new THREE.InstancedMesh(L.SG, new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.35, metalness: 0.1 }, opts || {})), n); m.frustumCulled = false; return m; }
      const dum = new THREE.Object3D();
      let sets = []; // {mesh, n, r, p[], v[], kind}
      function lattice(nx, ny, nz, sp, cb) { let i = 0; for (let x = 0; x < nx; x++) for (let y = 0; y < ny; y++) for (let z = 0; z < nz; z++) cb(i++, (x - (nx - 1) / 2) * sp, (y - (ny - 1) / 2) * sp, (z - (nz - 1) / 2) * sp, x, y, z); }
      function build() {
        L.clear(grp); sets = []; water.visible = key === 'sugar_aq' || key === 'nacl_aq' || key === 'hcl_aq'; bl.show(true);
        const cy = box.position.y;
        const add = (color, r, n, kind, o) => { const m = inst(color, r, n, o); grp.add(m); const s = { m, n, r, kind, p: [], v: [], ph: [] }; for (let i = 0; i < n; i++) { s.p.push(new THREE.Vector3()); s.v.push(new THREE.Vector3(L.rnd(-1, 1), L.rnd(-1, 1), L.rnd(-1, 1)).normalize()); s.ph.push(Math.random() * 6.28); } sets.push(s); return s; };
        if (key === 'cu') {
          const a = add(0xe08a3c, 0.3, 54, 'fixed', { metalness: 0.6, roughness: 0.3 });
          lattice(6, 3, 3, 1.1, (i, x, y, z) => a.p[i].set(x, y, z));
          const e = add(0xffd34d, 0.15, 46, 'electron', { emissive: 0xffb300, emissiveIntensity: 0.55 });
          e.p.forEach((p) => p.set(L.rnd(-W / 2 + 0.3, W / 2 - 0.3), L.rnd(-H / 2 + 0.3, H / 2 - 0.3), L.rnd(-D / 2 + 0.3, D / 2 - 0.3)));
        } else if (key === 'nacl_s') {
          const na = add(0xb07cf5, 0.3, 27, 'fixed'), cl = add(0x34c759, 0.44, 27, 'fixed');
          let a = 0, b = 0; lattice(6, 3, 3, 1.1, (i, x, y, z, ix, iy, iz) => { if ((ix + iy + iz) % 2) { if (a < 27) na.p[a++].set(x, y, z); } else if (b < 27) cl.p[b++].set(x, y, z); });
          na.n = a; cl.n = b; na.m.count = a; cl.m.count = b;
        } else if (key === 'nacl_l' || key === 'nacl_aq') {
          const na = add(0xb07cf5, 0.3, 17, 'cation'), cl = add(0x34c759, 0.44, 17, 'anion');
          [na, cl].forEach((s) => s.p.forEach((p) => p.set(L.rnd(-W / 2 + 0.5, W / 2 - 0.5), L.rnd(-H / 2 + 0.5, H / 2 - 0.5), L.rnd(-D / 2 + 0.5, D / 2 - 0.5))));
        } else if (key === 'hcl_aq') {
          const h = add(0xf5f6fa, 0.22, 9, 'hcl_h'), cl = add(0x34c759, 0.44, 9, 'hcl_cl');
          [h, cl].forEach((q) => q.p.forEach((p) => p.set(L.rnd(-W / 2 + 0.5, W / 2 - 0.5), L.rnd(-H / 2 + 0.5, H / 2 - 0.5), L.rnd(-D / 2 + 0.5, D / 2 - 0.5))));
          const wa = add(0x8fd0ff, 0.2, 40, 'neutral'); wa.p.forEach((p) => p.set(L.rnd(-W / 2 + 0.5, W / 2 - 0.5), L.rnd(-H / 2 + 0.5, H / 2 - 0.5), L.rnd(-D / 2 + 0.5, D / 2 - 0.5)));
        } else if (key === 'mol_s') {
          const m = add(0xff8fb1, 0.44, 18, 'fixed'); lattice(6, 3, 1, 1.1, (i, x, y, z) => m.p[i].set(x, y, z));
        } else if (key === 'mol') {
          const m = add(0xff8fb1, 0.44, 14, 'neutral'); m.p.forEach((p) => p.set(L.rnd(-W / 2 + 0.5, W / 2 - 0.5), L.rnd(-H / 2 + 0.5, H / 2 - 0.5), L.rnd(-D / 2 + 0.5, D / 2 - 0.5)));
        } else {
          const su = add(0xff8fb1, 0.44, 8, 'neutral'), wa = add(0x8fd0ff, 0.2, 52, 'neutral');
          [su, wa].forEach((s) => s.p.forEach((p) => p.set(L.rnd(-W / 2 + 0.5, W / 2 - 0.5), L.rnd(-H / 2 + 0.5, H / 2 - 0.5), L.rnd(-D / 2 + 0.5, D / 2 - 0.5))));
        }
        grp.position.y = cy;
        showInfo();
      }
      const condNow = () => { const c = SMP[key].cond; return c === 'diss' ? diss : c === 'yes'; };
      function showInfo() {
        const S = SMP[key], c = condNow(), nm = itemName || S.name;
        const txt = key === 'hcl_aq' ? (diss ? 'HCl 분자가 물과 만나 <b>H⁺와 Cl⁻로 이온화</b>했어요.<br>H⁺(흰색)는 (−)극, Cl⁻(초록)는 (+)극 쪽으로 이동해요. 전하 운반자: <b>이온</b>' : 'HCl 분자는 전하가 없어서 전기가 안 통해요. <b>💧 물에 녹이기</b>를 누르면 이온으로 나뉘어요.') : S.txt;
        info('<b>' + nm + '</b> · 전류 ' + (c ? '<span style="color:#7be08a"><b>통해요 ○</b></span>' : '<span style="color:#ff8a8a"><b>안 통해요 ✕</b></span>') + (field ? ' · 전기장 켜짐' : ' · 전기장 꺼짐') + '<br>' + txt);
      }
      build();
      return {
        update(dt, t) {
          dt = Math.min(dt, 0.05);
          const Z = ctx.lesson();
          if (Z) {
            const S2 = Z.S; let nk = key, nm = '';
            if (S2.scene === 'model') nk = Z.M.id; else if (S2.scene === 'lab' && S2.st.item) { nk = keyOfItem(S2.st.item) || key; nm = S2.st.item.name; }
            const nf = S2.scene === 'lab' ? S2.amp > 0.5 : !!S2.field, nd = !!Z.M.diss;
            if (nk !== key || nm !== itemName) { key = nk; itemName = nm; field = nf; diss = nd; dissK = nd ? 1 : 0; build(); }
            else if (nf !== field || nd !== diss) { field = nf; diss = nd; showInfo(); }
            bulbTarget = S2.scene === 'lab' && S2.st.item ? Math.min(1, S2.glow * 1.2) : -1;
          }
          let flow = 0;
          sets.forEach((s) => {
            for (let i = 0; i < s.n; i++) {
              const p = s.p[i], v = s.v[i];
              if (s.kind === 'fixed') {
                const q = s.ph[i]; dum.position.set(p.x + Math.sin(t * 7 + q) * 0.035, p.y + Math.sin(t * 6 + q * 1.7) * 0.035, p.z + Math.cos(t * 6.5 + q) * 0.035);
              } else {
                let kd = s.kind; if (kd === 'hcl_h') kd = diss ? 'cation' : 'bond'; else if (kd === 'hcl_cl') kd = diss ? 'anion' : 'neutral';
                if (kd === 'bond') { const q = sets.find((x) => x.kind === 'hcl_cl'); p.set(q.p[i].x - 0.55, q.p[i].y, q.p[i].z); dum.position.copy(p); dum.scale.setScalar(s.r); dum.updateMatrix(); s.m.setMatrixAt(i, dum.matrix); continue; }
                const sp = kd === 'electron' ? 1.3 : kd === 'neutral' ? 0.7 : 0.75;
                v.x += L.rnd(-1, 1) * dt * 6; v.y += L.rnd(-1, 1) * dt * 6; v.z += L.rnd(-1, 1) * dt * 6; v.normalize();
                let vx = v.x * sp, vy = v.y * sp, vz = v.z * sp;
                if (field) { const dr = kd === 'electron' ? 1.7 : kd === 'cation' ? -0.85 : kd === 'anion' ? 0.85 : 0; vx += dr; }
                p.x += vx * dt; p.y += vy * dt; p.z += vz * dt;
                const lx = W / 2 - s.r - 0.1, ly = H / 2 - s.r - 0.1, lz = D / 2 - s.r - 0.1;
                if (p.x > lx) { if (kd === 'electron') p.x = -lx; else { p.x = lx; v.x = -Math.abs(v.x); } } else if (p.x < -lx) { p.x = -lx; v.x = Math.abs(v.x); }
                if (p.y > ly) { p.y = ly; v.y = -Math.abs(v.y); } else if (p.y < -ly) { p.y = -ly; v.y = Math.abs(v.y); }
                if (p.z > lz) { p.z = lz; v.z = -Math.abs(v.z); } else if (p.z < -lz) { p.z = -lz; v.z = Math.abs(v.z); }
                dum.position.copy(p);
              }
              dum.scale.setScalar(s.r); dum.updateMatrix(); s.m.setMatrixAt(i, dum.matrix);
            }
            s.m.instanceMatrix.needsUpdate = true;
          });
          const on = field && condNow();
          const target = bulbTarget >= 0 ? bulbTarget : (on ? 1 : 0); t0 += (target - t0) * (1 - Math.pow(0.02, dt));
          bulb.material.emissiveIntensity = t0 * 1.6; glow.intensity = t0 * 2.2;
        },
      };
    },
  });
})();
