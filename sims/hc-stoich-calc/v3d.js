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
    const mat = (k) => mats[k] || (mats[k] = new THREE.MeshStandardMaterial({ color: COL[k] !== undefined ? COL[k] : k, roughness: 0.26, metalness: 0, envMapIntensity: 1.2 }));
    const SG = new THREE.SphereGeometry(1, 28, 20);
    const CG = new THREE.CylinderGeometry(1, 1, 1, 16);
    const stickMat = new THREE.MeshStandardMaterial({ color: 0xc3ccdd, roughness: 0.3, metalness: 0.25, envMapIntensity: 1.2 });
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
      const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshPhysicalMaterial({ color: color || 0xcfe4ff, transparent: true, opacity: op === undefined ? 0.13 : op, roughness: 0.05, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 2, side: THREE.DoubleSide, depthWrite: false }));
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color: 0xcfe0ff, transparent: true, opacity: 0.75 }));
      g.add(m, e); g.scale.set(w, h, d); g.userData.fill = m; return g;
    }
    function tube(pts, r, color, seg) {
      const c = new THREE.CatmullRomCurve3(pts.map((p) => (p.isVector3 ? p : V(p[0], p[1], p[2]))));
      return new THREE.Mesh(new THREE.TubeGeometry(c, seg || 40, r, 10, false), new THREE.MeshPhysicalMaterial({ color, roughness: 0.32, metalness: 0.15, clearcoat: 0.4, clearcoatRoughness: 0.25 }));
    }
    /* 화살표: from → to */
    function arrow(from, to, color, r, headLen) {
      const g = new THREE.Group(); const a = V(from[0], from[1], from[2]), b = V(to[0], to[1], to[2]); const d = b.clone().sub(a), len = d.length();
      if (len < 1e-3) return g; const hl = Math.min(headLen || 0.4, len * 0.6); const m = new THREE.MeshPhysicalMaterial({ color, roughness: 0.3, metalness: 0, clearcoat: 0.5, clearcoatRoughness: 0.2 });
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
    title: '남는 반응물 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대 · 산소의 양을 바꾸고 반응시켜 봐요',
    camera: { dist: phone ? 14 : 13, theta: 0.45, phi: 1.12, min: 5, max: 24, target: [0, 1.5, 0] },
    autoRotate: 0.08,
    levels: [3],
    build(ctx) {
      const { THREE, root, label, info, controls, mats } = ctx;
      const L = makeLib(THREE);
      const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), sm = L.sstep;
      const W = 6.8, H = 3.2, D = 3.6, UNIT = 0.25;
      const box = L.glassBox(W, H, D, 0x9ec5ff, 0.1); box.position.y = H / 2; root.add(box);
      const fitBox = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.2, colorWrite: false, depthWrite: false })); fitBox.position.copy(box.position); root.add(fitBox);   // 화면 맞춤용 보이지 않는 상자(유리 상자 크기)
      const floor = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mats.stone(0x0f131c, { repeat: 4, bump: 0.01, extra: { roughness: 0.85, envMapIntensity: 0.35 } })); floor.receiveShadow = true; floor.scale.set(W + 1, 0.14, D + 1); floor.position.y = -0.08; root.add(floor); floor.userData.v3bg = true;
      const KS = 0.8, LIM = [W / 2 - 0.9, H / 2 - 0.7, D / 2 - 0.7];
      const mk = (key, n) => { const a = []; for (let i = 0; i < n; i++) { const g = L.mol(L.MOLS[key], KS); g.visible = false; root.add(g); g.userData = { p: new THREE.Vector3(L.rnd(-LIM[0], LIM[0]), L.rnd(-LIM[1], LIM[1]), L.rnd(-LIM[2], LIM[2])), v: new THREE.Vector3(L.rnd(-1, 1), L.rnd(-1, 1), L.rnd(-1, 1)).normalize(), w: new THREE.Vector3(L.rnd(-1, 1), L.rnd(-1, 1), L.rnd(-1, 1)) }; a.push(g); } return a; };
      const P = { H2: mk('H2', 8), O2: mk('O2', 8), H2O: mk('H2O', 8) };
      const fx = []; for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(L.SG, new THREE.MeshBasicMaterial({ color: 0x9ee7ff, transparent: true, opacity: 0, depthWrite: false })); m.visible = false; root.add(m); fx.push(m); }
      const lab = label('2H₂ + O₂ → 2H₂O', [0, H + 0.6, 0], { size: 13 });
      const center = (j) => new THREE.Vector3((j - 1.5) * 1.5, 0.3, ((j % 2) - 0.5) * 1.2);
      const ej = [0, 0, 0, 0], fired = [false, false, false, false];
      const tmp = new THREE.Vector3();

      let own = false, sig = '', pP = 0;
      const rowOf = () => { const r = document.querySelectorAll('.v3-player'); return r[r.length - 1]; };
      const pl = controls.player({ duration: 9, loop: true, label: '반응 진행', phases: [[0, '반응 전'], [0.1, '반응 중'], [0.8, '반응 후'], [0.9, '처음으로']], onFrame(p) { pP = p; own = p > 0; } });
      const fOwn = (p) => (p < 0.1 ? 0 : p < 0.8 ? (p - 0.1) / 0.7 : p < 0.9 ? 1 : 1 - (p - 0.9) / 0.1);

      return {
        update(dt, t) {
          const Z = ctx.lesson(); if (!Z) return; dt = Math.min(dt, 0.05);
          const S = Z.S.left, o2g = S.o2, kO = Math.round(o2g / 32 / UNIT), kH = 8, produced = Math.min(kH, 2 * kO), n = Math.floor(produced / 2);
          const s = [o2g, S.phase, S.events.length].join('|');
          if (s !== sig) { sig = s; if (own) { own = false; pl.pause(); pl.set(0); } }
          const u = own ? fOwn(pP) * n : 0;
          for (let j = 0; j < 4; j++) {
            const tgt = own ? clamp(u - j, 0, 1) : (j < n && (S.phase === 'done' || (S.events[j] && S.events[j].done)) ? 1 : 0);
            ej[j] = own ? tgt : ej[j] + (tgt - ej[j]) * (1 - Math.pow(0.02, dt));
            if (ej[j] > 0.5 && !fired[j]) { fired[j] = true; const f = fx[j]; f.userData.t = 0; f.position.copy(center(j)); f.visible = true; }
            if (ej[j] < 0.2) fired[j] = false;
          }
          fx.forEach((f) => { if (f.visible) { f.userData.t = (f.userData.t || 0) + dt; const q = f.userData.t / 0.5; f.scale.setScalar(0.3 + q * 1.1); f.material.opacity = 0.7 * (1 - q); if (q >= 1) f.visible = false; } });
          const walk = (g) => {
            const q = g.userData; q.p.addScaledVector(q.v, 1.0 * dt);
            ['x', 'y', 'z'].forEach((c, ci) => { const m = LIM[ci]; if (q.p[c] > m) { q.p[c] = m; q.v[c] = -Math.abs(q.v[c]); } else if (q.p[c] < -m) { q.p[c] = -m; q.v[c] = Math.abs(q.v[c]); } });
            g.rotation.x += q.w.x * dt; g.rotation.y += q.w.y * dt;
          };
          const place = (g, pos, sc) => { g.visible = sc > 0.02; g.position.set(pos.x, pos.y + H / 2, pos.z); g.scale.setScalar(Math.max(0.001, sc)); };
          P.H2.forEach((g, i) => {
            walk(g); const j = Math.floor(i / 2), shown = i < kH, e = j < n ? ej[j] : 0;
            if (!shown) { g.visible = false; return; }
            tmp.copy(g.userData.p).lerp(center(j), sm(e / 0.5) * (j < n ? 1 : 0)).add(new THREE.Vector3(i % 2 ? 0.45 : -0.45, 0, 0).multiplyScalar(sm(e / 0.5) * (j < n ? 1 : 0)));
            place(g, tmp, 1 - sm((e - 0.45) / 0.25));
          });
          P.O2.forEach((g, i) => {
            walk(g); if (i >= kO) { g.visible = false; return; }
            const e = i < n ? ej[i] : 0; tmp.copy(g.userData.p).lerp(center(i), sm(e / 0.5) * (i < n ? 1 : 0));
            place(g, tmp, 1 - sm((e - 0.45) / 0.25));
          });
          P.H2O.forEach((g, i) => {
            walk(g); const j = Math.floor(i / 2); if (j >= n) { g.visible = false; return; }
            const e = ej[j], c = center(j), off = i % 2 ? 0.45 : -0.45, k = sm((e - 0.8) / 0.2);
            tmp.set(c.x + off, c.y, c.z).lerp(g.userData.p, k); place(g, tmp, sm((e - 0.5) / 0.3));
          });
          const cur = own ? u : ej.reduce((a, b) => a + b, 0), doneNow = cur >= n - 1e-3 && n > 0 && (own ? pP >= 0.8 && pP < 0.9 : S.phase === 'done');
          const c = Z.calcLeft(o2g), fT = (v) => String(+v.toFixed(2));
          const head = '수소 H₂ 4 g(2 mol) + 산소 O₂ <b>' + o2g + ' g</b>(' + fT(c.nO) + ' mol) · 입자 1개 = ' + UNIT + ' mol<br>2H₂ + O₂ → 2H₂O : H₂ 2개와 O₂ 1개가 짝이 돼요.';
          let tail;
          if (doneNow) tail = '<br>' + (c.lO > 1e-6 ? '<b>H₂가 먼저 소진</b> → O₂ ' + fT(c.lO) + ' mol = ' + fT(c.gO) + ' g 남아요' : c.lH > 1e-6 ? '<b>O₂가 먼저 소진</b> → H₂ ' + fT(c.lH) + ' mol = ' + fT(c.gH) + ' g 남아요' : '남는 물질 없이 모두 반응해요') + ' · 생성된 H₂O ' + fT(c.nW) + ' mol = ' + fT(c.gW) + ' g';
          else tail = '<br>먼저 모두 소진되는 반응물이 생성물의 양을 정해요.';
          info(head + tail);
          lab.show(true);
        },
      };
    },
  });
})();
