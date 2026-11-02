/* hc-le-shift · 3D 평형의 이동
   부피(압력)와 온도를 바꾸면 N₂O₄ ⇌ 2NO₂ 의 평형이 이동해요. 입자 수(색)가 어떻게 달라지는지 지켜봐요. */
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
    title: '평형 이동 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: phone ? 13.5 : 10, theta: 0.5, phi: 1.1, min: 5, max: 22, target: [0, 2.4, 0] },
    autoRotate: 0.1,
    levels: [1, 2],
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const L = makeLib(THREE);
      const E = makeEq(THREE, L, root);
      // 피스톤
      const pis = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 40), new THREE.MeshStandardMaterial({ color: 0x9aa6bf, roughness: 0.3, metalness: 0.75 })); root.add(pis);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3, 16), new THREE.MeshStandardMaterial({ color: 0xc3ccdd, roughness: 0.3, metalness: 0.8 })); root.add(rod);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.32, 20, 14), new THREE.MeshStandardMaterial({ color: 0xf0524f, roughness: 0.4 })); root.add(knob);
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.1, 20), new THREE.MeshStandardMaterial({ color: 0xff7a1a, emissive: 0xff5a00, emissiveIntensity: 1.2, transparent: true, opacity: 0.9 })); flame.position.set(0, -0.6, 0); root.add(flame);
      const ice = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.8, 1.8), new THREE.MeshStandardMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.6, roughness: 0.1 })); ice.position.set(0, -0.6, 0); root.add(ice);
      const lab = label('', [0, 0, 0], { size: 13 });
      let vol = 1, temp = 'mid', acc = 0, base = null;
      const TF = { low: 0.6, mid: 1, high: 1.5 };
      function applyV() { E.setH(vol); const h = E.H0 * vol; pis.scale.set(E.W / 2 + 0.05, 0.3, E.W / 2 + 0.05); pis.scale.z = E.D / 2 + 0.05; pis.position.y = h + 0.15; rod.position.y = h + 1.65; knob.position.y = h + 3.2; lab.obj = [E.W / 2 + 0.2, h + 0.5, 0]; lab.set(vol < 0.9 ? '압력 ↑ (부피 ↓)' : vol > 1.1 ? '압력 ↓ (부피 ↑)' : '1기압'); }
      function applyT() { E.S.Tf = TF[temp]; flame.visible = temp === 'high'; ice.visible = temp === 'low'; }
      function show() {
        const s = E.stats(); const tot = s.nA + s.nB;
        let msg = '';
        if (E.S.t < 6) msg = '조건을 바꾼 뒤 잠시 기다리면 새 평형에 가까워져요.';
        else msg = '<b>' + (s.nB / (s.nB + s.nA * 2 + 1e-6) > 0.57 ? 'NO₂(갈색) 쪽' : s.nB / (s.nB + s.nA * 2 + 1e-6) < 0.44 ? 'N₂O₄(무색) 쪽' : '처음과 비슷') + '</b>으로 평형이 치우쳤어요.';
        info('N₂O₄ <b>' + s.nA + '개</b> · NO₂ <b>' + s.nB + '개</b> (색이 짙을수록 NO₂가 많아요)<br>' + msg + '<br>분자 수가 줄어드는 쪽(N₂O₄)은 압력↑에서 유리하고, 흡열 방향(NO₂)은 온도↑에서 유리해요.');
      }
      const rg = controls.range('부피', 0.5, 1.5, 0.1, vol, (v) => { vol = +v; applyV(); E.S.t = 0.001; }, (v) => (+v).toFixed(1) + '배');
      controls.segment('온도', [{ value: 'low', label: '낮게' }, { value: 'mid', label: '보통' }, { value: 'high', label: '높게' }], temp, (v) => { temp = v; applyT(); E.S.t = 0.001; });
      controls.button('↺ 처음 평형', () => { vol = 1; temp = 'mid'; rg.set(1); applyV(); applyT(); E.reset(7, 10); E.S.t = 0; show(); });
      applyV(); applyT(); E.reset(7, 10); E.S.t = 0;
      return { update(dt) { E.update(dt); acc += dt; if (acc > 0.4) { acc = 0; show(); } flame.scale.y = 1 + Math.sin(performance.now() / 90) * 0.12; } };
    },
  });
})();
