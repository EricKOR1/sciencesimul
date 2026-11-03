/* hc-lewis · 3D 루이스 구조
   공유 전자쌍은 두 원자가 전자를 하나씩 내어 만든 것이고, 비공유 전자쌍은 한 원자에 머물러요. 둘레 전자 수를 세어 옥텟(8)을 확인해요. */
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
    title: '루이스 구조 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대 · 분자 고르기와 단계는 2D와 똑같이 이어져요',
    levels: [1, 2, 3],
    camera: { dist: phone ? 6.4 : 5.8, theta: 0.6, phi: 1.15, min: 3, max: 20 },
    autoRotate: 0.2,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const L = makeLib(THREE);
      const V = L.V, clamp = (x, a, b) => Math.max(a, Math.min(b, x)), sm = L.sstep;
      Object.assign(L.COL, { Be: 0xc2ff00, P: 0xff8000, Mg: 0x8aff00, O: 0xf0524f }); Object.assign(L.RAD, { Be: 0.4, P: 0.46, Mg: 0.55 });
      const T4 = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]];
      /* 2D의 원자 순서와 같은 3D 좌표 */
      const GEO = {
        H2: [['H', -0.45, 0, 0], ['H', 0.45, 0, 0]],
        HF: [['H', -0.7, 0, 0], ['F', 0.4, 0, 0]],
        H2O: [['O', 0, 0.2, 0], ['H', -0.91, -0.5, 0], ['H', 0.91, -0.5, 0]],
        NH3: [['N', 0, 0.3, 0], ['H', 1.1, -0.15, 0], ['H', -0.55, -0.15, 0.953], ['H', -0.55, -0.15, -0.953]],
        CH4: [['C', 0, 0, 0]].concat(T4.map((t) => ['H', t[0] * 0.75, t[1] * 0.75, t[2] * 0.75])),
        CO2: [['O', -1.4, 0, 0], ['C', 0, 0, 0], ['O', 1.4, 0, 0]],
        N2: [['N', -0.66, 0, 0], ['N', 0.66, 0, 0]],
        O2: [['O', -0.72, 0, 0], ['O', 0.72, 0, 0]],
        HCN: [['H', -1.65, 0, 0], ['C', 0, 0, 0], ['N', 1.17, 0, 0]],
        C2H4: [['C', -0.67, 0, 0], ['C', 0.67, 0, 0], ['H', -1.24, -0.93, 0], ['H', -1.24, 0.93, 0], ['H', 1.24, -0.93, 0], ['H', 1.24, 0.93, 0]],
        BeCl2: [['Cl', -1.9, 0, 0], ['Be', 0, 0, 0], ['Cl', 1.9, 0, 0]],
        BF3: [['F', -1.55, 0, 0], ['B', 0, 0, 0], ['F', 0.775, 0, 1.342], ['F', 0.775, 0, -1.342]],
        PCl3: [['P', 0, 0.45, 0], ['Cl', 1.6, -0.3, 0], ['Cl', -0.8, -0.3, 1.386], ['Cl', -0.8, -0.3, -1.386]],
        CCl4: [['C', 0, 0, 0]].concat(T4.map((t) => ['Cl', t[0] * 1.2, t[1] * 1.2, t[2] * 1.2])),
      };
      const g = new THREE.Group(); root.add(g);
      const lbl = []; for (let i = 0; i < 6; i++) { const l = label('', [0, 0, 0], { size: 12.5 }); l.show(false); lbl.push(l); }
      const eM = [new THREE.MeshStandardMaterial({ color: 0xffd34d, emissive: 0xffa800, emissiveIntensity: 0.8, roughness: 0.3 }), new THREE.MeshStandardMaterial({ color: 0x5de2ff, emissive: 0x00a8d8, emissiveIntensity: 0.8, roughness: 0.3 })];
      const E_R = 0.09;
      function dot(p, mi) { const m = new THREE.Mesh(L.SG, eM[mi]); m.scale.setScalar(E_R); m.position.copy(p); return m; }
      function pair(c, axis, mi) { const gr = new THREE.Group(); const a = axis.clone().normalize().multiplyScalar(0.11); gr.add(dot(c.clone().add(a), mi), dot(c.clone().sub(a), mi)); return gr; }
      // 비공유 전자쌍 방향 계산
      function lpDirs(M, i, nLP, P) {
        const bonds = M.b.filter((b) => b[0] === i || b[1] === i).map((b) => P[b[0] === i ? b[1] : b[0]].clone().sub(P[i]).normalize());
        const axis = bonds.reduce((s, d) => s.sub(d), V(0, 0, 0)); if (axis.length() < 0.2) axis.set(0, 1, 0); axis.normalize();
        if (nLP === 1) return [axis];
        // 결합이 이루는 평면에 수직인 벡터
        let perp = V(0, 0, 1);
        if (bonds.length >= 2) { perp = bonds[0].clone().cross(bonds[1]); if (perp.length() < 0.1) perp = axis.clone().cross(V(0, 0, 1)); } else { perp = axis.clone().cross(Math.abs(axis.z) < 0.9 ? V(0, 0, 1) : V(0, 1, 0)); }
        perp.normalize();
        const out = [];
        if (nLP === 2) { const ang = Math.PI * 0.30; [1, -1].forEach((s) => out.push(axis.clone().multiplyScalar(Math.cos(ang)).addScaledVector(perp, s * Math.sin(ang * 1.5)).normalize())); return out; }
        if (nLP === 3) { // 결합 둘레로 3개
          const p2 = axis.clone().cross(perp).normalize(); for (let k = 0; k < 3; k++) { const ph = k * 2 * Math.PI / 3; out.push(axis.clone().multiplyScalar(0.34).addScaledVector(perp, Math.cos(ph) * 0.94).addScaledVector(p2, Math.sin(ph) * 0.94).normalize()); } return out;
        }
        return out;
      }
      /* 분자 (mol · wizard 장면): 2D에서 만든 만큼만 그려요 */
      let molSig = '';
      function drawMol(key, ord, lone, sep, labelOn, around) {
        L.clear(g); lbl.forEach((l) => l.show(false));
        const geo = GEO[key]; if (!geo) return;
        const P = geo.map((a) => V(a[1], a[2], a[3])), cen = P.reduce((s, p) => s.add(p), V(0, 0, 0)).multiplyScalar(1 / P.length); P.forEach((p) => p.sub(cen));
        const M = Z0.MOLDB[key];
        const Q = P.map((p, i) => (sep[i] ? p.clone().multiplyScalar(1.0 + 0.9) : p.clone()));
        M.atoms.forEach((a, i) => { const m = L.atom(geo[i][0], 1); m.position.copy(Q[i]); g.add(m); });
        const Mb = { a: geo.map((a, i) => [a[0], P[i].x, P[i].y, P[i].z]), b: M.bonds.map((b, bi) => [b[0], b[1], ord[bi]]) };
        M.bonds.forEach((b, bi) => {
          if (sep[b[0]] || sep[b[1]]) return;
          const A = P[b[0]], B = P[b[1]], d = B.clone().sub(A), mid = A.clone().add(B).multiplyScalar(0.5), dn = d.clone().normalize();
          let perp = dn.clone().cross(V(0, 0, 1)); if (perp.lengthSq() < 0.01) perp = dn.clone().cross(V(0, 1, 0)); perp.normalize();
          const o = ord[bi], offs = o === 1 ? [0] : o === 2 ? [-0.07, 0.07] : [-0.12, 0, 0.12];
          offs.forEach((x) => g.add(L.stick(A.clone().addScaledVector(perp, x), B.clone().addScaledVector(perp, x), o === 1 ? 0.085 : o === 2 ? 0.06 : 0.05)));
          const poff = o === 1 ? [0.2] : o === 2 ? [-0.3, 0.3] : [-0.42, 0.21, 0.5];
          poff.forEach((x) => { const c = mid.clone().addScaledVector(perp, x), pr = new THREE.Group(); pr.add(dot(c.clone().addScaledVector(dn, 0.13), 0), dot(c.clone().addScaledVector(dn, -0.13), 1)); g.add(pr); });
        });
        geo.forEach((a, i) => {
          const nLP = lone[i] || 0; if (nLP <= 0 || sep[i] === 2) return;
          const dirs = lpDirs(Mb, i, nLP, P);
          dirs.forEach((d) => {
            const c = Q[i].clone().addScaledVector(d, L.RAD[a[0]] + 0.2); let ax = d.clone().cross(V(0, 0, 1)); if (ax.lengthSq() < 0.01) ax = d.clone().cross(V(0, 1, 0));
            g.add(pair(c, ax, i === M.central[0] ? 0 : 1));
          });
        });
        geo.forEach((a, i) => {
          if (i >= 6) return; const l = lbl[i]; l.obj = Q[i].toArray(); l.off = [0, -0.68, 0];
          const full = a[0] === 'H' ? 2 : a[0] === 'Be' ? 4 : a[0] === 'B' ? 6 : 8, ar = around ? around[i] : 0;
          l.set(labelOn ? a[0] + ' · 둘레 전자 <b>' + ar + '</b>' + (ar === full ? ' ✓' : '') : a[0]); l.el.style.background = labelOn && ar === full ? 'rgba(30,140,70,.9)' : ''; l.show(true);
        });
      }
      let Z0 = null;

      /* 이온 결합 (ionic 장면) */
      const gi = new THREE.Group(); root.add(gi);
      const ionAtoms = [], ionLabs = [label('', [0, 0, 0], { size: 13 }), label('', [0, 0, 0], { size: 13 }), label('', [0, 0, 0], { size: 13 })];
      const ELCOL = { Na: 0xb07cf5, Mg: 0x8aff00, Cl: 0x34c759, O: 0xf0524f };
      const ELR = { Na: 0.55, Mg: 0.5, Cl: 0.62, O: 0.5 };
      const VAL = { Na: 1, Mg: 2, Cl: 7, O: 6 };
      let ionSig = '', ionE = [], ionNM = null, ionMs = [], ionNeed = 0;
      const SLOT = [[1, 1, 1], [-1, 1, 1], [1, -1, 1], [-1, -1, 1], [1, 1, -1], [-1, 1, -1], [1, -1, -1], [-1, -1, -1]].map((s) => V(s[0], s[1], s[2]).normalize());
      function buildIon(d) {
        L.clear(gi); ionE = []; ionMs = []; ionAtoms.length = 0;
        const nm = d.nm, nmX = (d.xs[1] - 0.5) * 7.5;
        const nmMesh = new THREE.Mesh(L.SG, new THREE.MeshStandardMaterial({ color: ELCOL[nm], roughness: 0.35 })); nmMesh.scale.setScalar(ELR[nm]); nmMesh.position.set(nmX, 0, 0); gi.add(nmMesh); ionNM = { mesh: nmMesh, x: nmX, sym: nm };
        d.metals.forEach((sym, mi) => {
          const x = (d.xs.length === 2 ? d.xs[0] : (mi === 0 ? d.xs[0] : d.xs[2]) ) * 7.5 - 3.75;
          const m = new THREE.Mesh(L.SG, new THREE.MeshStandardMaterial({ color: ELCOL[sym], roughness: 0.35 })); m.scale.setScalar(ELR[sym]); m.position.set(x, 0, 0); gi.add(m);
          ionMs.push({ mesh: m, x, sym, v: VAL[sym] });
        });
        // 비금속 전자: 자기 것 (옥텟 − 받을 수) 개 + 받을 자리
        const nOwn = VAL[nm], total = ionMs.reduce((s, q) => s + q.v, 0);
        for (let k = 0; k < nOwn; k++) { const e = dot(SLOT[k].clone().multiplyScalar(ELR[nm] + 0.2).add(V(nmX, 0, 0)), 0); gi.add(e); ionE.push({ m: e, kind: 'own', base: SLOT[k].clone().multiplyScalar(ELR[nm] + 0.2).add(V(nmX, 0, 0)) }); }
        let ei = 0;
        ionMs.forEach((q, mi) => {
          for (let k = 0; k < q.v; k++) {
            const home = V(q.x, 0, 0).add(SLOT[k % 8].clone().multiplyScalar(ELR[q.sym] + 0.2));
            const target = SLOT[nOwn + ei].clone().multiplyScalar(ELR[nm] + 0.2).add(V(nmX, 0, 0)); ei++;
            const e = dot(home, 1); gi.add(e); ionE.push({ m: e, kind: 'move', home, target, mi, k });
          }
        });
        ionNeed = total;
        ionLabs.forEach((l) => { l.on = false; l.show(false); });
        ionMs.forEach((q, mi) => { const l = ionLabs[mi]; l.obj = [q.x, 0, 0]; l.off = [0, -1.0, 0]; l.on = true; });
        const l = ionLabs[2]; l.obj = [nmX, 0, 0]; l.off = [0, -1.0, 0]; l.on = true;
      }
      function ionFrame(d, f) { // f: 옮겨 간 전자 수 비율(0~1)
        const total = ionNeed, moved = f * total;
        let n = 0;
        ionE.forEach((e) => {
          if (e.kind !== 'move') return; const u = sm(moved - n); n++;
          e.m.position.copy(e.home).lerp(e.target, u); e.m.position.y += Math.sin(u * Math.PI) * 0.7;
        });
        // 이온 크기: 금속은 작아지고 비금속은 커져요
        const fAll = clamp(moved / Math.max(1, total), 0, 1);
        ionMs.forEach((q) => { q.mesh.scale.setScalar(ELR[q.sym] * (1 - 0.3 * fAll)); });
        ionNM.mesh.scale.setScalar(ELR[ionNM.sym] * (1 + 0.22 * fAll));
        const chg = ionMs.length ? Math.round(total / ionMs.length) : 0;
        ionMs.forEach((q, mi) => { const l = ionLabs[mi]; const on = fAll > 0.999; l.set(q.sym + (on ? '<sup>' + (chg > 1 ? chg : '') + '+</sup>' : '') ); l.el.style.background = on ? 'rgba(60,110,255,.88)' : ''; });
        const l = ionLabs[2]; l.set(ionNM.sym + (fAll > 0.999 ? '<sup>' + (total > 1 ? total : '') + '−</sup>' : '')); l.el.style.background = fAll > 0.999 ? 'rgba(235,70,70,.88)' : '';
      }

      /* 원자 (atom 장면) */
      const SYM = [null, 'H', 'He', 'Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne', 'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar'];
      const valOfZ = (z) => (z <= 2 ? z : z <= 10 ? z - 2 : z - 10);
      const ga = new THREE.Group(); root.add(ga);
      const aNuc = new THREE.Mesh(L.SG, new THREE.MeshStandardMaterial({ color: 0x8a93a3, roughness: 0.35 })); aNuc.scale.setScalar(0.7); ga.add(aNuc);
      const aDots = []; for (let i = 0; i < 8; i++) { const d = dot(SLOT[i].clone().multiplyScalar(1.0), 0); d.visible = false; ga.add(d); aDots.push(d); }
      const aLab = label('', [0, 0, 0], { size: 13 }); aLab.show(false);

      /* ▶ 재생: 이온 결합에서 전자가 옮겨 가요 */
      let own = false, sig = '', pI = 0, ionKey = '', molKey = '';
      const rowOf = () => { const r = document.querySelectorAll('.v3-player'); return r[r.length - 1]; };
      const pl = controls.player({ duration: 7, loop: true, label: '전자 옮기기', phases: [[0, '원자'], [0.12, '전자 이동'], [0.55, '이온'], [0.85, '처음으로']], onFrame(p) { pI = p; own = p > 0; } });
      const rowP = rowOf();
      const fOwn = (p) => (p < 0.12 ? 0 : p < 0.55 ? sm((p - 0.12) / 0.43) : p < 0.85 ? 1 : 1 - sm((p - 0.85) / 0.15));

      return {
        update(dt, t) {
          const Z = ctx.lesson(); if (!Z) return; Z0 = Z; dt = Math.min(dt, 0.05);
          const S = Z.S, sc = S.scene;
          g.visible = sc === 'mol' || sc === 'wizard'; gi.visible = sc === 'ionic'; ga.visible = sc === 'atom';
          rowP.style.display = sc === 'ionic' ? '' : 'none'; if (sc !== 'ionic' && pl.playing) pl.pause();
          ionLabs.forEach((l) => l.show(sc === 'ionic' && !!l.on)); aLab.show(sc === 'atom');
          if (sc !== 'mol' && sc !== 'wizard') lbl.forEach((l) => l.show(false));
          if (sc === 'atom') {
            const z = Z.A.z, sym = SYM[z] || '?', v = valOfZ(z);
            aNuc.material.color.setHex(0x8a93a3);
            aDots.forEach((d, i) => { d.visible = i < Z.A.dots; });
            aLab.obj = [0, 0, 0]; aLab.set(sym + ' (원자 번호 ' + z + ')'); aLab.off = [0, -1.1, 0];
            info('<b>' + sym + '</b> · 원자 번호 ' + z + ' · 원자가 전자 <b>' + v + '개</b><br>원자가 전자 수만큼 점을 찍어요. 지금 찍은 점 ' + Z.A.dots + '개');
            return;
          }
          if (sc === 'ionic') {
            const d = Z.IONDB[Z.IO.key];
            const sg = [Z.IO.key, Z.IO.tok, Z.IO.recv].join('|'); if (sg !== sig) { sig = sg; if (own) { own = false; pl.pause(); pl.set(0); } }
            if (Z.IO.key !== ionKey) { ionKey = Z.IO.key; buildIon(d); sig = ''; }
            const total = ionNeed, f = own ? fOwn(pI) : clamp(Z.IO.recv / Math.max(1, total), 0, 1);
            ionFrame(d, f);
            const nmV = VAL[d.nm];
            info('<b>' + d.f + '</b> · ' + d.name + '<br>금속 원자가 전자를 내놓아 <b>양이온</b>, 비금속 원자가 전자를 받아 <b>음이온</b>이 돼요 (옮긴 전자 ' + Math.round(f * total) + '/' + total + ').<br>' + d.ions + ' · 전자를 받은 ' + d.nm + '은(는) 바깥 전자 ' + (nmV + Math.round(f * total)) + '개');
            return;
          }
          const isW = sc === 'wizard', key = isW ? Z.W.key : Z.MO.key, M = Z.MOLDB[key]; if (!M) return;
          let ord, lone, sep, around = null, labelOn = false, step = '';
          if (isW) {
            const k = Z.W.k; ord = Z.W.ord.slice();
            sep = M.atoms.map(() => (k < 3 ? 1 : 0)); lone = M.atoms.map((_, i) => (k >= 4 ? Z.W.lone[i] : 0)); labelOn = k >= 4;
            around = M.atoms.map((_, i) => { let n = 2 * lone[i]; M.bonds.forEach((b, bi) => { if (b[0] === i || b[1] === i) n += 2 * ord[bi]; }); return n; });
            
          } else {
            ord = M.bonds.map(() => 1); const c = M.central[0], done = Z.molComplete();
            sep = M.atoms.map((_, i) => (i === c || Z.MO.bonded[i] ? 0 : 1)); lone = M.atoms.map((_, i) => (sep[i] ? 0 : (i === c ? (done ? M.lone[i] : 0) : M.lone[i]))); labelOn = done;
            around = M.atoms.map((_, i) => { let n = 2 * lone[i]; M.bonds.forEach((b, bi) => { if ((b[0] === i || b[1] === i) && !sep[b[0]] && !sep[b[1]]) n += 2; }); return n; });
          }
          const sg = [sc, key, ord.join(''), lone.join(''), sep.join(''), labelOn].join('|');
          if (sg !== molSig) { molSig = sg; drawMol(key, ord, lone, sep, labelOn, around); }
          const nB = ord.reduce((s, o, bi) => s + ((sep[M.bonds[bi][0]] || sep[M.bonds[bi][1]]) ? 0 : o), 0);
          info('<b>' + M.f + '</b> (' + M.name + ') · 공유 전자쌍 <b>' + nB + '쌍</b>' + (isW ? ' · 단계 ' + ['① 전자 합', '② 중심 원자', '③ 단일 결합', '④ 전자쌍 채우기', '⑤ 검사'][[0, 1, 2, 2, 3, 4][clamp(Z.W.k, 0, 5)]] : '') + '<br>' + (labelOn ? '공유 전자쌍은 양쪽 원자가 함께 쓰고, 비공유 전자쌍은 한 원자에만 있어요. 노란 점/하늘색 점이 전자쌍이에요.' : (isW ? '2D에서 단계를 진행하면 결합과 전자쌍이 차례로 나타나요.' : '바깥 원자를 가운데 원자에 이어 공유 전자쌍을 만들어 가요.')));
        },
      };
    },
  });
})();
