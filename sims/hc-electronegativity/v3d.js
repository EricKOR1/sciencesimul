/* hc-electronegativity · 3D 전자 줄다리기
   공유 전자쌍(노란 전자 구름)은 전기 음성도가 큰 원자 쪽으로 치우쳐요. 차이가 클수록 더 많이 치우쳐요. */
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
    title: '전자 줄다리기 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: phone ? 9.6 : 9, theta: 0.4, phi: 1.2, min: 4, max: 20 },
    autoRotate: 0.15,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const L = makeLib(THREE);
      const EN = { H: 2.2, C: 2.55, Cl: 3.16, F: 3.98, Na: 0.93 };
      const CORE = { H: 0.34, C: 0.44, Cl: 0.56, F: 0.45, Na: 0.4 };
      const PAIRS = { HH: ['H', 'H'], CH: ['C', 'H'], HCl: ['H', 'Cl'], HF: ['H', 'F'], NaCl: ['Na', 'Cl'] };
      const NAMES = { HH: 'H–H', CH: 'C–H', HCl: 'H–Cl', HF: 'H–F', NaCl: 'Na–Cl' };
      let key = 'HF', showArrow = true;
      const grp = new THREE.Group(); root.add(grp);
      const ND = 520;
      const dots = new THREE.InstancedMesh(L.SG, new THREE.MeshStandardMaterial({ color: 0xffd34d, emissive: 0xffb300, emissiveIntensity: 0.9, roughness: 0.4, transparent: true, opacity: 0.85 }), ND);
      dots.frustumCulled = false; root.add(dots);
      const dd = []; for (let i = 0; i < ND; i++) dd.push({ p: new THREE.Vector3(), c: Math.random() });
      const dum = new THREE.Object3D();
      let A = null, B = null, w = 0.5, xa = -1, xb = 1, sa = 1, sb = 1;
      const lA = label('', [0, 0, 0], { size: 14 }), lB = label('', [0, 0, 0], { size: 14 }), lM = label('', [0, 0, 0], { size: 12, color: 'rgba(120,90,0,.85)' });
      lA.el.style.color = lB.el.style.color = '#fff';
      function shell(sym, x) {
        const g = new THREE.Group(); g.position.set(x, 0, 0);
        const core = L.atom(sym, 1); core.scale.setScalar(CORE[sym]); g.add(core);
        const sh = new THREE.Mesh(L.SG, new THREE.MeshStandardMaterial({ color: L.COL[sym], transparent: true, opacity: 0.16, roughness: 0.2, depthWrite: false })); sh.scale.setScalar(CORE[sym] * 2.5); g.add(sh);
        return g;
      }
      let arr = null;
      function sample(i) {
        const d = dd[i], onA = Math.random() > w; // w = B쪽(전기 음성도 큰 쪽) 비율... 
        return d;
      }
      function build() {
        L.clear(grp);
        const [a, b] = PAIRS[key]; // b가 항상 전기 음성도가 크거나 같은 쪽이 되도록 정렬
        const [lo, hi] = EN[a] <= EN[b] ? [a, b] : [b, a];
        const dx = Math.abs(EN[hi] - EN[lo]);
        const sep = (key === 'NaCl' ? 3.6 : 2.5 + (CORE[lo] + CORE[hi]) * 0.8);
        xa = -sep / 2; xb = sep / 2; A = lo; B = hi;
        grp.add(shell(lo, xa), shell(hi, xb));
        w = key === 'NaCl' ? 0.97 : 0.5 + 0.5 * Math.tanh(dx / 1.35); // 높은 쪽에 머무는 시간 비율
        sa = CORE[lo]; sb = CORE[hi];
        for (let i = 0; i < ND; i++) resample(i);
        lA.obj = [xa, 0, 0]; lB.obj = [xb, 0, 0]; lA.off = [0, -1.15, 0]; lB.off = [0, -1.15, 0];
        const q = dx < 0.4 ? '' : 'δ';
        const cA = dx < 0.4 ? '' : (key === 'NaCl' ? ' (+)' : ' δ+'), cB = dx < 0.4 ? '' : (key === 'NaCl' ? ' (−)' : ' δ−');
        lA.set(lo + '<br><small>χ ' + EN[lo].toFixed(2) + cA + '</small>'); lB.set(hi + '<br><small>χ ' + EN[hi].toFixed(2) + cB + '</small>');
        lA.el.style.background = dx < 0.4 ? '' : 'rgba(60,110,255,.85)'; lB.el.style.background = dx < 0.4 ? '' : 'rgba(235,70,70,.85)';
        if (dx >= 0.4) { arr = L.arrow([xa + 0.4, 1.5, 0], [xb - 0.1, 1.5, 0], 0xffd34d, 0.05, 0.3); grp.add(arr); arr.visible = showArrow; lM.obj = [(xa + xb) / 2, 1.5, 0]; lM.off = [0, 0.5, 0]; lM.set('전자가 끌려가요'); lM.show(showArrow); } else { arr = null; lM.show(false); }
        const kind = key === 'NaCl' ? '이온 결합에 가까워요 (전자가 거의 완전히 이동)' : dx < 0.4 ? '무극성 공유 결합 (치우침 없음)' : '극성 공유 결합 (전자쌍이 ' + hi + ' 쪽으로)';
        info('<b>' + NAMES[key] + '</b> · χ 차이 Δχ = <b>' + dx.toFixed(2) + '</b><br>전자 구름이 ' + hi + ' 쪽에 <b>' + Math.round(w * 100) + '%</b> 머물러요.<br>' + kind);
      }
      function resample(i) {
        const d = dd[i], atB = Math.random() < w; // B(χ 큼) 근처에 있을 확률 w
        const cx = atB ? xb : xa, s = (atB ? sb : sa);
        // 공유 영역으로 퍼진 가우시안 구름: 원자 둘레 + 두 원자 사이
        const spread = 0.55 + s * 0.9;
        let x = cx + (Math.random() + Math.random() + Math.random() - 1.5) * spread * 1.6;
        const lim = (xa + xb) / 2;
        // 서로 다른 원자 쪽으로 너무 넘어가지 않게 살짝 제한
        if (atB) x = Math.max(x, xa + (xb - xa) * 0.25); else x = Math.min(x, xb - (xb - xa) * 0.25);
        const r = (Math.random() + Math.random() + Math.random() - 1.5) * 1.1;
        const th = Math.random() * Math.PI * 2;
        const fall = Math.max(0.35, 1 - Math.abs(x - cx) / (spread * 1.6) * 0.5);
        d.p.set(x, r * Math.cos(th) * fall * 0.75, r * Math.sin(th) * fall * 0.75);
        d.c = 0.5 + Math.random() * 0.7;
      }
      const ctl = controls.segment('결합', Object.keys(PAIRS).map((k) => ({ value: k, label: NAMES[k] })), key, (v) => { key = v; build(); });
      const ab = controls.button('전자 끄는 방향 ✓', () => { showArrow = !showArrow; ab.classList.toggle('on', showArrow); ab.textContent = '전자 끄는 방향 ' + (showArrow ? '✓' : '✕'); if (arr) arr.visible = showArrow; lM.show(showArrow && !!arr); }); ab.classList.add('on');
      build();
      let acc = 0;
      return {
        update(dt) {
          acc += dt;
          if (acc > 0.06) { acc = 0; for (let k = 0; k < 60; k++) resample((Math.random() * ND) | 0); }
          for (let i = 0; i < ND; i++) { const d = dd[i]; dum.position.copy(d.p); dum.scale.setScalar(0.06 * d.c); dum.updateMatrix(); dots.setMatrixAt(i, dum.matrix); }
          dots.instanceMatrix.needsUpdate = true;
        },
      };
    },
  });
})();
