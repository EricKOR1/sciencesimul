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
    function atom(k, s) { const m = new THREE.Mesh(SG, mat(k)); m.scale.setScalar((RAD[k] || 0.4) * (s || 1)); return m; }
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
    function mol(M, k) {
      k = k || 1; const g = new THREE.Group(); const P = M.a.map((x) => V(x[1] * k, x[2] * k, x[3] * k));
      M.a.forEach((x, i) => { const m = atom(x[0], k); m.position.copy(P[i]); g.add(m); });
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
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    levels: [1, 2, 3],
    camera: { dist: phone ? 12 : 8.5, theta: 0.6, phi: 1.15, min: 4, max: 20 },
    autoRotate: 0.25,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const L = makeLib(THREE);
      const KEYS = ['H2', 'HCl', 'H2O', 'NH3', 'CH4', 'CO2', 'N2'];
      const V = L.V;
      let key = 'H2O', count = false;
      const g = new THREE.Group(); root.add(g);
      const lbl = []; for (let i = 0; i < 4; i++) { const l = label('', [0, 0, 0], { size: 12.5 }); l.show(false); lbl.push(l); }
      const eM = [new THREE.MeshStandardMaterial({ color: 0xffd34d, emissive: 0xffa800, emissiveIntensity: 0.8, roughness: 0.3 }), new THREE.MeshStandardMaterial({ color: 0x5de2ff, emissive: 0x00a8d8, emissiveIntensity: 0.8, roughness: 0.3 })];
      const E_R = 0.075;
      function dot(p, mi) { const m = new THREE.Mesh(L.SG, eM[mi]); m.scale.setScalar(E_R); m.position.copy(p); return m; }
      function pair(c, axis, mi0, mi1) { // 전자 두 개 (axis 방향으로 벌어짐)
        const gr = new THREE.Group(); const a = axis.clone().normalize().multiplyScalar(0.11); gr.add(dot(c.clone().add(a), mi0), dot(c.clone().sub(a), mi1)); return gr;
      }
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
      function build() {
        L.clear(g); lbl.forEach((l) => l.show(false));
        const M = L.MOLS[key]; const n = M.a.length;
        const P = M.a.map((a) => V(a[1], a[2], a[3]));
        const cen = P.reduce((s, p) => s.add(p), V(0, 0, 0)).multiplyScalar(1 / n); P.forEach((p) => p.sub(cen));
        const M2 = { a: M.a.map((a, i) => [a[0], P[i].x, P[i].y, P[i].z]), b: M.b };
        g.add(L.mol(M2, 1));
        const VAL = { H: 1, C: 4, N: 5, O: 6, Cl: 7 };
        const around = M.a.map(() => 0);
        M.b.forEach((b) => {
          const A = P[b[0]], B = P[b[1]], d = B.clone().sub(A), mid = A.clone().add(B).multiplyScalar(0.5); const dn = d.clone().normalize();
          let perp = dn.clone().cross(V(0, 0, 1)); if (perp.lengthSq() < 0.01) perp = dn.clone().cross(V(0, 1, 0)); perp.normalize();
          const order = b[2], offs = order === 1 ? [0] : order === 2 ? [-0.34, 0.34] : [-0.5, 0, 0.5];
          offs.forEach((o) => { const c = mid.clone().addScaledVector(perp, o); const pr = new THREE.Group(); pr.add(dot(c.clone().addScaledVector(dn, 0.13), 0), dot(c.clone().addScaledVector(dn, -0.13), 1)); g.add(pr); });
          around[b[0]] += order * 2; around[b[1]] += order * 2;
        });
        // 비공유 전자쌍
        M.a.forEach((a, i) => {
          const sym = a[0]; const bondE = M.b.filter((b) => b[0] === i || b[1] === i).reduce((s, b) => s + b[2], 0);
          const nLP = sym === 'H' ? 0 : Math.round((VAL[sym] - bondE) / 2);
          if (nLP <= 0) return;
          const dirs = lpDirs(M2, i, nLP, P);
          dirs.forEach((d) => {
            const c = P[i].clone().addScaledVector(d, L.RAD[sym] + 0.2); let ax = d.clone().cross(V(0, 0, 1)); if (ax.lengthSq() < 0.01) ax = d.clone().cross(V(0, 1, 0));
            const grp = pair(c, ax, 0, 0); grp.children.forEach((m) => { m.material = eM[sym === M.a[0][0] && i === 0 ? 0 : 1]; });
            g.add(grp);
          });
          around[i] += nLP * 2;
        });
        // 이름표
        M.a.forEach((a, i) => {
          if (i >= 4) return; const l = lbl[i]; l.obj = P[i].toArray(); l.off = [0, -0.65, 0];
          const full = a[0] === 'H' ? 2 : 8;
          l.set(count ? a[0] + ' · 둘레 전자 <b>' + around[i] + '</b>' + (around[i] === full ? ' ✓' : '') : a[0]); l.el.style.background = count && around[i] === full ? 'rgba(30,140,70,.9)' : ''; l.show(true);
        });
        const nBond = M.b.reduce((s, b) => s + b[2], 0);
        info('<b>' + M.f + '</b> · 공유 전자쌍 <b>' + nBond + '쌍</b><br>' + (key === 'CO2' || key === 'N2' ? (key === 'N2' ? '질소는 <b>삼중 결합</b>(공유 전자쌍 3개)으로 8개를 채워요.' : '이산화 탄소는 <b>이중 결합</b>(2쌍) 두 개예요.') : '<span style="color:#ffd34d">●</span><span style="color:#5de2ff">●</span> 공유 전자쌍은 두 원자의 전자가 하나씩 모인 거예요.') + '<br>둘레 전자: 수소 2개, 나머지 8개(옥텟)로 안정해요.');
      }
      controls.segment('분자', KEYS.map((k) => ({ value: k, label: L.MOLS[k].f })), key, (v) => { key = v; build(); });
      const cb = controls.button('전자 수 세기', () => { count = !count; cb.classList.toggle('on', count); cb.textContent = count ? '전자 수 세기 ✓' : '전자 수 세기'; build(); });
      build();
      return {};
    },
  });
})();
