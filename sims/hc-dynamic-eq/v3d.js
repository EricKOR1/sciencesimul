/* hc-dynamic-eq · 3D 동적 평형
   닫힌 상자에서 N₂O₄ ⇌ 2NO₂ 가 계속 일어나요. 평형에서는 정반응과 역반응의 횟수가 같아서 농도(색)가 일정해 보여요. */
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

    /* ---- 평형 상자: N₂O₄ ⇌ 2NO₂ (무색 ⇌ 갈색) 입자 시뮬레이션 ---- */
  function makeEq(THREE, L, root, opt) {
    opt = opt || {};
    const W = 5.2, D = 3.6, H0 = 3.6;
    const PAL_A = { N: 0xd9e4f5, O: 0xf4f7fc }, PAL_B = { N: 0xb4621a, O: 0xe3a45c };
    const box = L.glassBox(1, 1, 1, 0xb9d3ff, 0.1); root.add(box);
    const fillM = box.userData.fill.material;
    const floor = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x24324f, roughness: 0.95, envMapIntensity: 0.05 })); floor.scale.set(W + 1.6, 0.14, D + 1.4); floor.position.y = -0.08; root.add(floor);
    const KA = 0.3, KB = 0.28;
    const A = [], B = [];
    const mk = (arr, key, k, pal) => { for (let i = 0; i < arr.n; i++) { const g = L.mol(L.MOLS[key], k, pal); g.visible = false; root.add(g); g.userData = { on: false, p: new THREE.Vector3(), v: new THREE.Vector3(), w: new THREE.Vector3(L.rnd(-1, 1), L.rnd(-1, 1), L.rnd(-1, 1)) }; arr.push(g); } };
    A.n = 26; B.n = 52; mk(A, 'N2O4', KA, PAL_A); mk(B, 'NO2', KB, PAL_B);
    // 번쩍임 (반응이 일어난 자리)
    const fx = []; for (let i = 0; i < 10; i++) { const m = new THREE.Mesh(L.SG, new THREE.MeshBasicMaterial({ color: 0xffaa33, transparent: true, opacity: 0, depthWrite: false })); m.visible = false; root.add(m); fx.push({ m, t: 9 }); }
    const S = { H: 1, Tf: 1, hist: [], t: 0, paused: false, speed: 1, kf0: 0.3, kr0: 0.05, acc: 0 };
    function lim() { return [W / 2 - 0.5, (H0 * S.H) / 2 - 0.5, D / 2 - 0.5]; }
    function place(g, x, y, z) { const u = g.userData; u.on = true; g.visible = true; u.p.set(x, y, z); u.v.set(L.rnd(-1, 1), L.rnd(-1, 1), L.rnd(-1, 1)).normalize(); g.position.set(x, y + (H0 * S.H) / 2, z); }
    function off(g) { g.userData.on = false; g.visible = false; }
    function pop(x, y, z, col) { const f = fx.find((q) => q.t > 0.5) || fx[0]; f.t = 0; f.m.material.color.setHex(col); f.m.position.set(x, y + (H0 * S.H) / 2, z); f.m.visible = true; }
    function act(arr) { return arr.filter((g) => g.userData.on); }
    function setH(h) {
      const old = S.H; S.H = h; box.scale.set(W, H0 * h, D); box.position.y = (H0 * h) / 2;
      const l = lim(); [A, B].forEach((arr) => arr.forEach((g) => { const p = g.userData.p; p.y = Math.max(-l[1], Math.min(l[1], p.y * (old ? h / old : 1))); }));
    }
    function reset(nA, nB) {
      A.forEach(off); B.forEach(off); S.hist = []; const l = lim();
      for (let i = 0; i < nA; i++) place(A[i], L.rnd(-l[0], l[0]), L.rnd(-l[1], l[1]), L.rnd(-l[2], l[2]));
      for (let i = 0; i < nB; i++) place(B[i], L.rnd(-l[0], l[0]), L.rnd(-l[1], l[1]), L.rnd(-l[2], l[2]));
    }
    function stats() {
      const now = S.t, w = 4; S.hist = S.hist.filter((e) => now - e[0] < w);
      const f = S.hist.filter((e) => e[1] === 'f').length / Math.min(w, Math.max(now, 1)), r = S.hist.filter((e) => e[1] === 'r').length / Math.min(w, Math.max(now, 1));
      return { nA: act(A).length, nB: act(B).length, rf: f, rr: r };
    }
    function update(dt) {
      dt = Math.min(dt, 0.05) * S.speed; if (S.paused) dt = 0;
      S.t += dt; const l = lim(), sp = 1.6 * Math.sqrt(S.Tf);
      [A, B].forEach((arr, ai) => arr.forEach((g) => {
        const u = g.userData; if (!u.on) return;
        u.p.addScaledVector(u.v, sp * (ai ? 1 : 0.7) * dt);
        ['x', 'y', 'z'].forEach((c, ci) => { const m = l[ci]; if (u.p[c] > m) { u.p[c] = m; u.v[c] = -Math.abs(u.v[c]); } else if (u.p[c] < -m) { u.p[c] = -m; u.v[c] = Math.abs(u.v[c]); } });
        g.position.set(u.p.x, u.p.y + (H0 * S.H) / 2, u.p.z); g.rotation.x += u.w.x * dt; g.rotation.y += u.w.y * dt; g.rotation.z += u.w.z * dt;
      }));
      // 반응 사건 (무작위)
      const aA = act(A), aB = act(B), nA = aA.length, nB = aB.length;
      const pf = S.kf0 * S.Tf * S.Tf * nA * dt, pr = (S.kr0 / S.H) * nB * (nB - 1) / 2 * dt;
      if (nA > 0 && Math.random() < pf) {
        const g = aA[(Math.random() * nA) | 0], p = g.userData.p.clone(); off(g);
        const b1 = B.find((q) => !q.userData.on), b2 = B.filter((q) => !q.userData.on)[1];
        if (b1 && b2) { place(b1, p.x - 0.3, p.y, p.z); place(b2, p.x + 0.3, p.y, p.z); b1.userData.v.set(-1, L.rnd(-0.3, 0.3), L.rnd(-0.3, 0.3)).normalize(); b2.userData.v.set(1, L.rnd(-0.3, 0.3), L.rnd(-0.3, 0.3)).normalize(); pop(p.x, p.y, p.z, 0xffaa33); S.hist.push([S.t, 'f']); } else place(g, p.x, p.y, p.z);
      }
      if (nB >= 2 && Math.random() < pr) {
        const g1 = aB[(Math.random() * nB) | 0]; let best = null, bd = 1e9;
        aB.forEach((q) => { if (q !== g1) { const d = q.userData.p.distanceToSquared(g1.userData.p); if (d < bd) { bd = d; best = q; } } });
        const mid = g1.userData.p.clone().add(best.userData.p).multiplyScalar(0.5); off(g1); off(best);
        const a = A.find((q) => !q.userData.on); if (a) { place(a, mid.x, mid.y, mid.z); pop(mid.x, mid.y, mid.z, 0x5de2ff); S.hist.push([S.t, 'r']); }
      }
      fx.forEach((f) => { if (f.t < 0.5) { f.t += dt; const u = f.t / 0.5; f.m.scale.setScalar(0.25 + u * 0.9); f.m.material.opacity = 0.65 * (1 - u); if (u >= 1) f.m.visible = false; } });
      // 색: NO₂ 비율에 따라 갈색
      const nb = act(B).length, na = act(A).length, frac = nb / (nb + 2 * na + 1e-6);
      fillM.color.setHex(0xb9d3ff).lerp(new THREE.Color(0xb5651d), Math.min(1, frac * 1.05)); fillM.opacity = 0.1 + 0.34 * frac;
    }
    setH(1); reset(12, 0);
    return { S, A, B, box, reset, setH, update, stats, W, D, H0, act };
  }

  const phone = window.matchMedia && window.matchMedia('(max-width: 599px)').matches;
  window.SciSim3D.attach({
    title: '동적 평형 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: phone ? 13 : 9.5, theta: 0.5, phi: 1.12, min: 5, max: 22, target: [0, 1.7, 0] },
    autoRotate: 0.12,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const L = makeLib(THREE);
      const E = makeEq(THREE, L, root);
      const START = { a: [12, 0, 'N₂O₄만 넣고 시작'], b: [0, 24, 'NO₂만 넣고 시작'], c: [6, 12, '섞어서 시작'] };
      let st = 'a', acc = 0;
      label('N₂O₄ ⇌ 2NO₂', [0, 3.9, 0], { size: 13.5 });
      function show() {
        const s = E.stats(); const fmt = (x) => x.toFixed(1);
        const bal = Math.abs(s.rf - s.rr) < 0.45 && E.S.t > 6;
        info('N₂O₄(무색) <b>' + s.nA + '개</b> · NO₂(갈색) <b>' + s.nB + '개</b><br>정반응 <b style="color:#ffaa33">' + fmt(s.rf) + '회/초</b> · 역반응 <b style="color:#5de2ff">' + fmt(s.rr) + '회/초</b><br>' + (bal ? '<b>평형!</b> 반응은 계속되지만 개수가 거의 일정해요.' : '두 반응의 횟수가 같아지면 평형이에요.'));
      }
      controls.segment('시작', Object.keys(START).map((k) => ({ value: k, label: START[k][2] })), st, (v) => { st = v; E.reset(START[v][0], START[v][1]); E.S.t = 0; show(); });
      controls.segment('속도', [{ value: 1, label: '×1' }, { value: 3, label: '×3' }], 1, (v) => { E.S.speed = +v; });
      const pb = controls.button('⏸ 멈춤', () => { E.S.paused = !E.S.paused; pb.textContent = E.S.paused ? '▶ 계속' : '⏸ 멈춤'; });
      E.reset(12, 0); show();
      return { update(dt) { E.update(dt); acc += dt; if (acc > 0.35) { acc = 0; show(); } } };
    },
  });
})();
