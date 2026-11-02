/* hc-water-ionization · 3D 물의 자동 이온화
   물 분자 둘이 부딪칠 때 H⁺ 하나가 옮겨 가서 H₃O⁺와 OH⁻가 생기고, 곧 다시 물이 돼요. 산·염기를 넣으면 한쪽 이온이 늘어요. */
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
    title: '물의 자동 이온화 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: phone ? 15 : 11, theta: 0.3, phi: 1.2, min: 5, max: 24, target: [0, 0.6, 0] },
    autoRotate: 0.1,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const L = makeLib(THREE), V = L.V;
      const BW = 12, BH = 4.6, BD = 5;
      const box = L.glassBox(BW, BH, BD, 0x7fb6ff, 0.08); box.position.y = 0; root.add(box);
      const floor = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x0f182c, roughness: 0.95 })); floor.scale.set(BW + 1, 0.12, BD + 1); floor.position.y = -BH / 2 - 0.08; root.add(floor);
      const pools = { w: [], h: [], o: [] };
      const SC = { w: 0.5, h: 0.55, o: 0.55 };
      const mk = (arr, key, n, k) => { for (let i = 0; i < n; i++) { const g = L.mol(L.MOLS[key], k); g.visible = false; root.add(g); g.userData = { p: new THREE.Vector3(), v: new THREE.Vector3(L.rnd(-1, 1), L.rnd(-1, 1), L.rnd(-1, 1)).normalize(), w: new THREE.Vector3(L.rnd(-1, 1), L.rnd(-1, 1), L.rnd(-1, 1)) }; arr.push(g); } };
      mk(pools.w, 'H2O', 34, SC.w); mk(pools.h, 'H3O', 18, SC.h); mk(pools.o, 'OH', 18, SC.o);
      // 주인공 한 쌍: 프로톤(H⁺) 이동 장면
      const hero = new THREE.Group(); hero.position.set(0, 0.2, 1.4); root.add(hero);
      const Oa = L.atom('O', 1.5), Ob = L.atom('O', 1.5), Ha = L.atom('H', 1.5), Hb1 = L.atom('H', 1.5), Hb2 = L.atom('H', 1.5), Hx = L.atom('H', 1.5), Hy = L.atom('H', 1.5);
      const parts = [Oa, Ob, Ha, Hb1, Hb2, Hx, Hy]; parts.forEach((m) => hero.add(m));
      const stM = new THREE.MeshStandardMaterial({ color: 0xc3ccdd, roughness: 0.45, transparent: true });
      const sticks = [0, 1, 2, 3].map(() => { const s = new THREE.Mesh(L.CG, stM.clone()); hero.add(s); return s; });
      const halo = new THREE.Mesh(L.SG, new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0, depthWrite: false })); hero.add(halo);
      const lH = label('', hero, { size: 13 }), lO = label('', hero, { size: 13 });
      lH.show(false); lO.show(false);
      let env = 'pure', slow = false, T = 0, bg = true;
      const CNT = { pure: [4, 4], acid: [16, 1], base: [1, 16] };
      const LIM = [BW / 2 - 0.7, BH / 2 - 0.6, BD / 2 - 0.6];
      function setEnv() {
        const [h, o] = CNT[env]; const nh = h, no = o;
        const fill = (arr, n) => arr.forEach((g, i) => { g.visible = bg && i < n; if (g.visible) g.userData.p.set(L.rnd(-LIM[0], LIM[0]), L.rnd(-LIM[1], LIM[1]), L.rnd(-LIM[2], LIM[2]) - 0.6); });
        fill(pools.w, 34); fill(pools.h, nh); fill(pools.o, no);
        const txt = env === 'pure' ? '순수한 물: H₃O⁺ = OH⁻ (같은 수)' : env === 'acid' ? '산을 넣으면: H₃O⁺ ↑, OH⁻ ↓ (곱은 일정)' : '염기를 넣으면: OH⁻ ↑, H₃O⁺ ↓ (곱은 일정)';
        info('<b>2H₂O ⇌ H₃O⁺ + OH⁻</b><br>' + txt + '<br>실제로는 물 분자 약 5.5억 개 중 1개만 이온화돼요 (그림은 크게 과장).');
      }
      // 주인공 장면: 주기 9초. 0~2.5 접근 / 2.5~3.5 H⁺ 이동 / 3.5~5.5 이온 상태 / 5.5~7 다시 접근 / 7~8 되돌아옴 / 8~9 물
      const O1 = V(-1.7, 0, 0), O2 = V(1.7, 0, 0);
      function scene(ph) {
        const near = L.sstep(ph / 2.5) * (1 - L.sstep((ph - 5.2) / 1.0)) + L.sstep((ph - 5.8) / 1.0) * 0; // 가까워짐 정도
        let ap = 0; // 두 분자의 간격 축소
        if (ph < 2.5) ap = L.sstep(ph / 2.5); else if (ph < 5.0) ap = 1 - L.sstep((ph - 3.4) / 1.6) * 0.45; else if (ph < 6.5) ap = 0.55 + 0.45 * L.sstep((ph - 5.0) / 1.5); else ap = 1 - L.sstep((ph - 7.5) / 1.2);
        const gap = 3.6 - ap * 1.0; // O–O 거리: 접근 시 2.6
        // 양성자 이동 정도: 0 = A에 있음, 1 = B로 이동
        let tr = 0; if (ph >= 2.4 && ph < 3.6) tr = L.sstep((ph - 2.4) / 1.2); else if (ph >= 3.6 && ph < 6.8) tr = 1; else if (ph >= 6.8 && ph < 7.8) tr = 1 - L.sstep((ph - 6.8) / 1.0);
        const apart = ph >= 3.6 && ph < 6.2 ? L.sstep((ph - 3.6) / 1.2) * (1 - L.sstep((ph - 5.2) / 1.0)) : 0; // 이온 쌍이 서로 벌어짐
        const dist = Math.max(2.5, gap + apart * 1.7);
        Oa.position.set(-dist / 2, 0, 0); Ob.position.set(dist / 2, 0, 0);
        // A의 다른 H: 아래쪽, B의 H 둘: 위/아래 뒤쪽
        Hx.position.set(-dist / 2 - 0.45, -0.95, 0.3); // A의 남는 수소
        Hb1.position.set(dist / 2 + 0.55, 0.85, 0.35); Hb2.position.set(dist / 2 + 0.5, -0.5, -0.8);
        // 이동하는 수소 Ha: A의 O 곁에서 B의 O로
        const a0 = V(-dist / 2 + 0.85, 0.35, 0), a1 = V(dist / 2 - 0.9, 0.2, 0.35);
        Ha.position.copy(a0).lerp(a1, tr); Ha.position.y += Math.sin(tr * Math.PI) * 0.35;
        Hy.visible = false;
        const bl = (m, a, b, op) => { const d = b.clone().sub(a), len = d.length(); m.scale.set(0.09, Math.max(len, 1e-3), 0.09); m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); m.material.opacity = op; m.visible = op > 0.04; };
        bl(sticks[0], Oa.position, Hx.position, 1);
        bl(sticks[1], Oa.position, Ha.position, 1 - L.sstep(tr / 0.5));
        bl(sticks[2], Ob.position, Hb1.position, 1); bl(sticks[3], Ob.position, Hb2.position, 1);
        // H⁺가 B에 붙은 뒤 결합
        const hb = sticks[1]; if (tr > 0.5) { bl(hb, Ob.position, Ha.position, L.sstep((tr - 0.5) / 0.5)); }
        halo.position.copy(Ha.position); const hp = tr > 0.02 && tr < 0.98 ? 1 : 0; halo.scale.setScalar(0.65 + 0.12 * Math.sin(ph * 12)); halo.material.opacity = hp * 0.45;
        const ionic = tr > 0.9;
        lO.obj = Oa; lH.obj = Ob; lO.off = [0, -1.5, 0]; lH.off = [0, 1.7, 0];
        lO.set(ionic ? 'OH⁻' : 'H₂O'); lH.set(ionic ? 'H₃O⁺' : 'H₂O'); lO.show(true); lH.show(true);
        lO.el.style.background = ionic ? 'rgba(60,110,255,.88)' : ''; lH.el.style.background = ionic ? 'rgba(235,70,70,.88)' : '';
      }
      controls.segment('용액', [{ value: 'pure', label: '순수한 물' }, { value: 'acid', label: '산 넣기' }, { value: 'base', label: '염기 넣기' }], env, (v) => { env = v; setEnv(); });
      const sb = controls.button('🐢 천천히', () => { slow = !slow; sb.classList.toggle('on', slow); }); 
      const gb = controls.button('주변 분자 ✓', () => { bg = !bg; gb.classList.toggle('on', bg); gb.textContent = '주변 분자 ' + (bg ? '✓' : '✕'); setEnv(); }); gb.classList.add('on');
      setEnv();
      return {
        update(dt) {
          dt = Math.min(dt, 0.05); T += dt * (slow ? 0.5 : 1); scene(T % 9);
          const sp = 0.9;
          Object.keys(pools).forEach((k) => pools[k].forEach((g) => {
            if (!g.visible) return; const u = g.userData; u.p.addScaledVector(u.v, sp * dt);
            ['x', 'y', 'z'].forEach((c, ci) => { const m = LIM[ci]; if (u.p[c] > m) { u.p[c] = m; u.v[c] = -Math.abs(u.v[c]); } else if (u.p[c] < -m) { u.p[c] = -m; u.v[c] = Math.abs(u.v[c]); } });
            // 주인공 쪽에 겹치지 않도록 살짝 밀어내기
            const dx = u.p.x, dz = u.p.z - 1.4, dy = u.p.y - 0.2; if (Math.abs(dx) < 3.4 && Math.abs(dz) < 1.7 && Math.abs(dy) < 1.8) { u.v.z = Math.abs(u.v.z) * -1; u.p.z -= 0.06; }
            g.position.copy(u.p); g.rotation.x += u.w.x * dt; g.rotation.y += u.w.y * dt;
          }));
        },
      };
    },
  });
})();
