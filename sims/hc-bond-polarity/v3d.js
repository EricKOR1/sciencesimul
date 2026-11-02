/* hc-bond-polarity · 3D 결합의 극성과 쌍극자
   결합마다 전자가 치우쳐 쌍극자(δ+ → δ−)가 생겨요. 모양에 따라 합이 0이면 무극성 분자예요. */
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
    title: '결합의 극성 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: phone ? 11.5 : 8, theta: 0.7, phi: 1.15, min: 3.5, max: 18 },
    autoRotate: 0.3,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const L = makeLib(THREE);
      const EN = { H: 2.2, C: 2.55, N: 3.04, O: 3.44, F: 3.98, Cl: 3.16, B: 2.04 };
      const KEYS = ['HCl', 'CO2', 'H2O', 'NH3', 'CH4', 'BF3', 'CCl4'];
      let key = 'H2O', showB = true, showC = true;
      const g = new THREE.Group(); root.add(g);
      const lbl = []; for (let i = 0; i < 5; i++) { const l = label('', [0, 0, 0], { size: 12.5 }); l.show(false); lbl.push(l); }
      const netL = label('', [0, 0, 0], { size: 13, color: 'rgba(255,200,40,.95)' }); netL.el.style.color = '#1b2333'; netL.show(false);
      function chargeColor(q) { // 음전하 빨강 · 양전하 파랑
        const t = Math.min(1, Math.abs(q) / 0.9); const c = new THREE.Color(0xdde6f5); return c.lerp(new THREE.Color(q < 0 ? 0xff3b3b : 0x3b6bff), t);
      }
      function build() {
        L.clear(g); lbl.forEach((l) => l.show(false)); netL.show(false);
        const M = L.MOLS[key]; const n = M.a.length;
        // 중심 원자 결정: HCl은 2원자, 나머지는 0번이 중심
        const q = M.a.map(() => 0);
        const P = M.a.map((a) => new THREE.Vector3(a[1], a[2], a[3]));
        M.b.forEach((b) => { const i = b[0], j = b[1]; const d = (EN[M.a[j][0]] - EN[M.a[i][0]]) * 0.32; q[j] -= d; q[i] += d; });
        // 분자를 질량 중심 대신 기하 중심으로 맞추기
        const cen = P.reduce((s, p) => s.add(p), new THREE.Vector3()).multiplyScalar(1 / n);
        P.forEach((p) => p.sub(cen));
        const mol = L.mol(M, 1); mol.position.copy(cen).multiplyScalar(-1); g.add(mol);
        // 전하 구름(껍질)
        M.a.forEach((a, i) => {
          if (!showC) return;
          const sh = new THREE.Mesh(L.SG, new THREE.MeshStandardMaterial({ color: chargeColor(q[i]), transparent: true, opacity: 0.1 + 0.34 * Math.min(1, Math.abs(q[i]) / 0.8), roughness: 0.2, depthWrite: false }));
          sh.scale.setScalar(L.RAD[a[0]] * 2.0); sh.position.copy(P[i]); g.add(sh);
        });
        // 결합 쌍극자 화살표 (δ+ 쪽에서 δ− 쪽으로)
        if (showB) M.b.forEach((b) => {
          const i = b[0], j = b[1]; const d = EN[M.a[j][0]] - EN[M.a[i][0]]; if (Math.abs(d) < 0.4) return;
          const from = d > 0 ? i : j, to = d > 0 ? j : i; const A = P[from], B = P[to]; const dir = B.clone().sub(A).normalize();
          const off = new THREE.Vector3(0, 0.0, 0); const side = dir.clone().cross(new THREE.Vector3(0, 0, 1)); if (side.lengthSq() < 0.01) side.set(0, 1, 0); side.normalize().multiplyScalar(0.38);
          const a0 = A.clone().addScaledVector(dir, L.RAD[M.a[from][0]] + 0.1).add(side), a1 = B.clone().addScaledVector(dir, -(L.RAD[M.a[to][0]] + 0.12)).add(side);
          if (a1.clone().sub(a0).dot(dir) > 0.2) g.add(L.arrow(a0.toArray(), a1.toArray(), 0xff9f43, 0.045, 0.28));
        });
        // 알짜 쌍극자
        const mu = new THREE.Vector3(); P.forEach((p, i) => mu.addScaledVector(p, -q[i]));
        const len = mu.length();
        const polar = len > 0.15;
        if (polar) {
          const dir = mu.clone().normalize(); const L0 = Math.min(3.4, 0.9 + len * 1.4);
          const a0 = dir.clone().multiplyScalar(-L0 / 2).add(new THREE.Vector3(0, 0, 0)), a1 = dir.clone().multiplyScalar(L0 / 2);
          const off = new THREE.Vector3(0, 1.3, 0); if (Math.abs(dir.y) > 0.8) off.set(1.3, 0, 0);
          const arr = L.arrow(a0.clone().add(off).toArray(), a1.clone().add(off).toArray(), 0xffd34d, 0.1, 0.5); g.add(arr);
          netL.obj = a1.clone().add(off).multiplyScalar(0.5).add(a0.clone().add(off).multiplyScalar(0.5)).toArray(); netL.off = [0, 0.5, 0]; netL.set('알짜 쌍극자'); netL.show(true);
        } else { netL.obj = [0, 0, 0]; netL.off = [0, 1.7, 0]; netL.set('쌍극자 합 = 0'); netL.show(true); }
        // 원소 이름표
        let li = 0; const done = {};
        M.a.forEach((a, i) => { if (li >= 5) return; const l = lbl[li++]; l.obj = P[i].toArray(); l.off = [0, 0.62, 0]; const s = q[i]; l.set(a[0] + (Math.abs(s) > 0.12 ? (s < 0 ? ' δ−' : ' δ+') : '')); l.el.style.background = Math.abs(s) > 0.12 ? (s < 0 ? 'rgba(235,70,70,.85)' : 'rgba(60,110,255,.85)') : ''; l.show(true); });
        const nb = M.b.filter((b) => Math.abs(EN[M.a[b[1]][0]] - EN[M.a[b[0]][0]]) >= 0.4).length;
        info('<b>' + M.f + '</b> · 극성 결합 ' + nb + '개<br>' + (polar ? '<b>극성 분자</b>: 결합 쌍극자의 합이 0이 아니에요.' : (nb ? '<b>무극성 분자</b>: 극성 결합이 있어도 대칭이라 합이 0이에요.' : '<b>무극성 분자</b>')) + '<br><span style="color:#ff9f43">주황 화살표</span> 결합 쌍극자 · <span style="color:#ffd34d">노랑</span> 알짜');
      }
      controls.segment('분자', KEYS.map((k) => ({ value: k, label: L.MOLS[k].f })), key, (v) => { key = v; build(); });
      const b1 = controls.button('결합 화살표 ✓', () => { showB = !showB; b1.classList.toggle('on', showB); b1.textContent = '결합 화살표 ' + (showB ? '✓' : '✕'); build(); }); b1.classList.add('on');
      const b2 = controls.button('전하 구름 ✓', () => { showC = !showC; b2.classList.toggle('on', showC); b2.textContent = '전하 구름 ' + (showC ? '✓' : '✕'); build(); }); b2.classList.add('on');
      build();
      return {};
    },
  });
})();
