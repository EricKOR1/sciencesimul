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
    camera: { dist: phone ? 18 : 13.5, theta: 0.3, phi: 1.2, min: 5, max: 24, target: [0, 0.6, 0] },
    autoRotate: 0.08,
    levels: [1, 2],          // 0단계(전구 회로·측정기)와 3단계(용액 카드·시소)는 2D 화면에서 해요
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const L = makeLib(THREE), V = L.V;
      const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
      const BW = 9.6, BH = 4.2, BD = 4.8;
      const box = L.glassBox(BW, BH, BD, 0x7fb6ff, 0.08); box.position.y = 0; root.add(box);
      const fitBox = new THREE.Mesh(new THREE.BoxGeometry(BW, BH, BD), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.2, colorWrite: false, depthWrite: false })); fitBox.position.copy(box.position); root.add(fitBox);   // 화면 맞춤용 보이지 않는 상자(유리 상자 크기)
      const floor = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0x050b18 })); floor.scale.set(BW + 1, 0.12, BD + 1); floor.position.y = -BH / 2 - 0.08; root.add(floor); floor.userData.v3bg = true;
      const SC = { w: 0.45, h: 0.5, o: 0.5 };
      const rw = () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(L.rnd(-1, 1), L.rnd(-1, 1), L.rnd(-1, 1)).normalize(), w: new THREE.Vector3(L.rnd(-1, 1), L.rnd(-1, 1), L.rnd(-1, 1)) });
      const mk = (key, n) => { const a = []; for (let i = 0; i < n; i++) { const g = L.mol(L.MOLS[key], SC[key === 'H2O' ? 'w' : key === 'H3O' ? 'h' : 'o']); g.visible = false; g.userData = rw(); root.add(g); a.push(g); } return a; };
      const walk = { w: mk('H2O', 26), h: mk('H3O', 24), o: mk('OH', 24) };
      const mir = { w: mk('H2O', 18), h: mk('H3O', 18), o: mk('OH', 18) };
      const protonM = new THREE.Mesh(L.SG, new THREE.MeshStandardMaterial({ color: 0xffd34d, emissive: 0xffa800, emissiveIntensity: 0.8, roughness: 0.3 })); protonM.scale.setScalar(0.2); protonM.visible = false; root.add(protonM);
      // 주인공 한 쌍: 프로톤(H⁺) 이동 장면
      const hero = new THREE.Group(); hero.position.set(0, 0.1, 1.0); root.add(hero);
      const Oa = L.atom('O', 1.15), Ob = L.atom('O', 1.15), Ha = L.atom('H', 1.15), Hb1 = L.atom('H', 1.15), Hb2 = L.atom('H', 1.15), Hx = L.atom('H', 1.15), Hy = L.atom('H', 1.15);
      const parts = [Oa, Ob, Ha, Hb1, Hb2, Hx, Hy]; parts.forEach((m) => hero.add(m));
      const stM = new THREE.MeshStandardMaterial({ color: 0xc3ccdd, roughness: 0.45, transparent: true });
      const sticks = [0, 1, 2, 3].map(() => { const s = new THREE.Mesh(L.CG, stM.clone()); hero.add(s); return s; });
      const halo = new THREE.Mesh(L.SG, new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0, depthWrite: false })); hero.add(halo);
      const lH = label('', hero, { size: 13 }), lO = label('', hero, { size: 13 });
      lH.show(false); lO.show(false);
      const LIM = [BW / 2 - 0.7, BH / 2 - 0.6, BD / 2 - 0.6];
      Object.keys(walk).forEach((k) => walk[k].forEach((g) => g.userData.p.set(L.rnd(-LIM[0], LIM[0]), L.rnd(-LIM[1], LIM[1]), L.rnd(-LIM[2], LIM[2]))));
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
      const hashY = (i) => { const x = Math.sin((i + 1) * 78.233) * 43758.5453; return x - Math.floor(x); };
      const sciTxt = (x) => { if (!(x > 0)) return '0'; const e = Math.floor(Math.log10(x) + 1e-9), m = x / Math.pow(10, e), SUPD = '⁰¹²³⁴⁵⁶⁷⁸⁹'; return (Math.round(m * 10) / 10).toFixed(1) + '×10' + (e < 0 ? '⁻' : '') + String(Math.abs(e)).split('').map((c) => SUPD[+c]).join(''); };

      /* ▶ 재생: 프로톤(H⁺)이 이동하는 장면을 확대해서 봐요 */
      let own = false, sig = '', pH = 0;
      const rowOf = () => { const r = document.querySelectorAll('.v3-player'); return r[r.length - 1]; };
      const pl = controls.player({ duration: 9, loop: true, label: '자동 이온화 확대', phases: [[0, '물 분자 2개'], [0.28, 'H⁺ 이동'], [0.4, 'H₃O⁺ + OH⁻'], [0.62, '다시 만나요'], [0.78, 'H⁺ 되돌아와요'], [0.9, '물 분자']], onFrame(p) { pH = p; own = p > 0; } });
      const rowP = rowOf();

      return {
        update(dt, t) {
          const Z = ctx.lesson(); if (!Z) return; dt = Math.min(dt, 0.05);
          const S = Z.S, mode = S.mode, BOX = Z.BOX, isModel = mode === 'model';
          const sg = [mode, S.kw.mode, S.kw.x].join('|'); if (sg !== sig) { sig = sg; if (own) { own = false; pl.pause(); pl.set(0); } }
          const show = own;
          // 주인공(확대) 장면
          hero.visible = show; lH.show(show); lO.show(show);
          if (show) scene(pH * 9);
          // 배경 분자
          Object.keys(walk).forEach((k) => walk[k].forEach((g) => { g.visible = false; })); Object.keys(mir).forEach((k) => mir[k].forEach((g) => { g.visible = false; })); protonM.visible = false;
          if (isModel && BOX) {
            const lim = [LIM[0], LIM[2]];
            if (!show) S.md.mol.forEach((q, i) => {
              const key = q.type === 'w' ? 'w' : q.type === 'oh' ? 'o' : 'h', g = mir[key][i]; if (!g) return;
              const u = clamp((q.x - BOX.x) / BOX.w, 0, 1), v = clamp((q.y - BOX.y) / BOX.h, 0, 1);
              g.visible = true; g.position.set((u - 0.5) * 2 * lim[0], (hashY(i) - 0.5) * (BH - 1.4), (v - 0.5) * 2 * lim[1]); g.rotation.y = -q.ang;
            });
            if (!show) S.md.ev.forEach((e) => { if ((e.ph === 'tr' || e.ph === 'tr2') && e.hx != null) { const u = clamp((e.hx - BOX.x) / BOX.w, 0, 1), v = clamp((e.hy - BOX.y) / BOX.h, 0, 1); protonM.visible = true; protonM.position.set((u - 0.5) * 2 * lim[0], 0.3, (v - 0.5) * 2 * lim[1]); } });
            const ratio = S.md.ratioShown ? '<br>이온화한 물 분자의 비율 ≈ <b>1.8×10⁻⁹</b> (약 5.5억 개 중 1개)' : '';
            if (show) info('<b>2H₂O ⇌ H₃O⁺ + OH⁻</b> (확대)<br>물 분자 한 개가 다른 물 분자에게 H⁺를 넘겨 H₃O⁺와 OH⁻가 돼요. 곧 다시 만나 물로 돌아와요.');
            else info('<b>2H₂O ⇌ H₃O⁺ + OH⁻</b> · 이온 쌍이 생겼다가 다시 물이 되는 일이 계속돼요 (동적 평형)<br>지금 H₃O⁺ ' + S.md.mol.filter((q) => q.type === 'h3o').length + '개 · OH⁻ ' + S.md.mol.filter((q) => q.type === 'oh').length + '개 (그림은 크게 과장)' + ratio);
            return;
          }
          // Kw 규칙 · 그 밖의 장면: 입자 수는 농도의 로그 눈금으로 줄여 그려요
          const kw = S.kw, vals = Z.kwVals(), eH = kw.mode === 'pure' ? 7 : (kw.mode === 'acid' ? kw.x : 14 - kw.x), eO = kw.mode === 'pure' ? 7 : (kw.mode === 'acid' ? 14 - kw.x : kw.x);
          const cnt = (e) => clamp(Math.round(4 + (7 - e) * 3), 1, 24);
          const nh = cnt(S.kw.lh != null ? S.kw.lh : eH), no = cnt(S.kw.lo != null ? S.kw.lo : eO);
          const fillW = (arr, n) => arr.forEach((g, i) => { g.visible = !show && i < n; });
          fillW(walk.w, 26); fillW(walk.h, nh); fillW(walk.o, no);
          Object.keys(walk).forEach((k) => walk[k].forEach((g) => {
            if (!g.visible) return; const u = g.userData; u.p.addScaledVector(u.v, 0.9 * dt);
            ['x', 'y', 'z'].forEach((c, ci) => { const m = LIM[ci]; if (u.p[c] > m) { u.p[c] = m; u.v[c] = -Math.abs(u.v[c]); } else if (u.p[c] < -m) { u.p[c] = -m; u.v[c] = Math.abs(u.v[c]); } });
            g.position.copy(u.p); g.rotation.x += u.w.x * dt; g.rotation.y += u.w.y * dt;
          }));
          const nm = kw.mode === 'pure' ? '순수한 물' : (kw.mode === 'acid' ? 'HCl' : 'NaOH') + ' 용액';
          if (show) info('<b>2H₂O ⇌ H₃O⁺ + OH⁻</b> (확대)<br>물 분자 한 개가 다른 물 분자에게 H⁺를 넘겨 H₃O⁺와 OH⁻가 돼요.');
          else info('<b>' + nm + '</b> · [H⁺] = <b>' + sciTxt(vals.h) + ' M</b> · [OH⁻] = <b>' + sciTxt(vals.oh) + ' M</b><br>' + (kw.mode === 'pure' ? '순수한 물에서는 H₃O⁺와 OH⁻가 같은 수예요.' : kw.mode === 'acid' ? '산을 넣으면 H₃O⁺가 늘고 OH⁻는 줄어요. 그래도 OH⁻는 남아 있어요.' : '염기를 넣으면 OH⁻가 늘고 H₃O⁺는 줄어요. 그래도 H₃O⁺는 남아 있어요.') + '<br>(입자 수는 농도를 로그 눈금으로 줄여 그린 거예요)');
        },
      };
    },
  });
})();
