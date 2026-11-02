/* hc-stoich-calc · 3D 남는 반응물 (한계 반응물)
   2H₂ + O₂ → 2H₂O. 분자를 직접 짝지어 반응시키면, 먼저 소진되는 쪽이 생성물의 양을 정하고 다른 쪽이 남아요. */
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
    title: '한계 반응물 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: phone ? 17 : 12.5, theta: 0.45, phi: 1.15, min: 6, max: 28, target: [0, 1.9, 0] },
    autoRotate: 0.1,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const L = makeLib(THREE);
      const W = 8.4, H = 3.6, D = 4.2;
      const box = L.glassBox(W, H, D, 0x9ec5ff, 0.1); box.position.y = H / 2; root.add(box);
      const floor = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x0f182c, roughness: 0.95 })); floor.scale.set(W + 1, 0.14, D + 1); floor.position.y = -0.08; root.add(floor);
      const KS = 0.55, LIM = [W / 2 - 0.6, H / 2 - 0.6, D / 2 - 0.6];
      const mk = (key, n) => { const a = []; for (let i = 0; i < n; i++) { const g = L.mol(L.MOLS[key], KS); g.visible = false; root.add(g); g.userData = { on: false, p: new THREE.Vector3(), v: new THREE.Vector3(), w: new THREE.Vector3(L.rnd(-1, 1), L.rnd(-1, 1), L.rnd(-1, 1)) }; a.push(g); } return a; };
      const P = { H2: mk('H2', 10), O2: mk('O2', 6), H2O: mk('H2O', 10) };
      const fx = []; for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(L.SG, new THREE.MeshBasicMaterial({ color: 0x9ee7ff, transparent: true, opacity: 0, depthWrite: false })); m.visible = false; root.add(m); fx.push({ m, t: 9 }); }
      const lab = label('', [0, H + 0.6, 0], { size: 13 });
      let nH = 6, nO = 2, state = 'ready', timer = 0, flag = '';
      const rp = () => new THREE.Vector3(L.rnd(-LIM[0], LIM[0]), L.rnd(-LIM[1], LIM[1]), L.rnd(-LIM[2], LIM[2]));
      function put(g, p) { const u = g.userData; u.on = true; g.visible = true; u.p.copy(p); u.v.set(L.rnd(-1, 1), L.rnd(-1, 1), L.rnd(-1, 1)).normalize(); g.position.set(p.x, p.y + H / 2, p.z); }
      function off(g) { g.userData.on = false; g.visible = false; }
      const act = (k) => P[k].filter((g) => g.userData.on);
      function pop(p) { const f = fx.find((q) => q.t > 0.5) || fx[0]; f.t = 0; f.m.position.set(p.x, p.y + H / 2, p.z); f.m.visible = true; }
      function setup() {
        state = 'ready'; flag = '';
        Object.values(P).forEach((a) => a.forEach(off));
        for (let i = 0; i < nH; i++) put(P.H2[i], rp()); for (let i = 0; i < nO; i++) put(P.O2[i], rp());
        text();
      }
      function text() {
        const h = act('H2').length, o = act('O2').length, w = act('H2O').length;
        let tail = '';
        if (state === 'done') { tail = h > 0 && o === 0 ? '<b>O₂가 먼저 다 쓰였어요</b> → 한계 반응물 O₂, 남은 H₂ ' + h + '개' : o > 0 && h === 0 ? '<b>H₂가 먼저 다 쓰였어요</b> → 한계 반응물 H₂, 남은 O₂ ' + o + '개' : w ? '<b>둘 다 남김없이 반응했어요</b> (계수비 2 : 1)' : '반응할 분자가 없어요.'; }
        else tail = '2H₂ + O₂ → 2H₂O : H₂ 2개와 O₂ 1개가 짝이 돼요.';
        info('H₂ <b>' + h + '개</b> · O₂ <b>' + o + '개</b> · H₂O <b>' + w + '개</b><br>' + tail);
        lab.set(state === 'done' && (h || o) ? (h ? '남은 H₂' : '남은 O₂') : '2H₂ + O₂ → 2H₂O'); lab.show(true);
      }
      const r1 = controls.range('H₂', 0, 10, 1, nH, (v) => { nH = +v; setup(); }, (v) => v + '개');
      const r2 = controls.range('O₂', 0, 6, 1, nO, (v) => { nO = +v; setup(); }, (v) => v + '개');
      const go = controls.button('▶ 반응시키기', () => { if (state === 'ready') { state = 'run'; timer = 0; } });
      controls.button('↺ 처음', () => setup());
      setup();
      return {
        update(dt) {
          dt = Math.min(dt, 0.05);
          Object.values(P).forEach((a) => a.forEach((g) => {
            const u = g.userData; if (!u.on) return;
            u.p.addScaledVector(u.v, 1.0 * dt);
            ['x', 'y', 'z'].forEach((c, ci) => { const m = LIM[ci]; if (u.p[c] > m) { u.p[c] = m; u.v[c] = -Math.abs(u.v[c]); } else if (u.p[c] < -m) { u.p[c] = -m; u.v[c] = Math.abs(u.v[c]); } });
            g.position.set(u.p.x, u.p.y + H / 2, u.p.z); g.rotation.x += u.w.x * dt; g.rotation.y += u.w.y * dt;
          }));
          fx.forEach((f) => { if (f.t < 0.5) { f.t += dt; const u = f.t / 0.5; f.m.scale.setScalar(0.3 + u * 1.1); f.m.material.opacity = 0.7 * (1 - u); if (u >= 1) f.m.visible = false; } });
          if (state === 'run') {
            timer += dt;
            if (timer > 0.7) {
              timer = 0; const hs = act('H2'), os = act('O2');
              if (hs.length >= 2 && os.length >= 1) {
                const o = os[0], op = o.userData.p.clone(); hs.sort((a, b) => a.userData.p.distanceToSquared(op) - b.userData.p.distanceToSquared(op));
                const h1 = hs[0], h2 = hs[1]; const m = op.clone().add(h1.userData.p).add(h2.userData.p).multiplyScalar(1 / 3);
                off(o); off(h1); off(h2); const w = P.H2O.filter((g) => !g.userData.on);
                if (w[0] && w[1]) { put(w[0], m.clone().add(new THREE.Vector3(-0.4, 0, 0))); put(w[1], m.clone().add(new THREE.Vector3(0.4, 0, 0))); w[0].userData.v.set(-1, 0.1, 0).normalize(); w[1].userData.v.set(1, -0.1, 0).normalize(); }
                pop(m); text();
              } else { state = 'done'; text(); }
            }
          }
        },
      };
    },
  });
})();
