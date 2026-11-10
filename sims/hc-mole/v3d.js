/* hc-mole · 3D 몰 상자 쌓기
   '1다스 = 12개'처럼 '1 mol = 6.02×10²³개'도 한 묶음이에요. 물질이 달라도 입자 수가 같고, 질량만 달라요. */
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
    title: '몰과 아보가드로 수 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: phone ? 16.5 : 10.5, theta: 0.3, phi: 0.95, min: 5, max: 30, target: [0, 0.4, 0] },
    autoRotate: 0.1,
    levels: [0, 1],
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const L = makeLib(THREE);
      const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
      const sm = L.sstep;
      const NA = 6.02e23, RATE = 1e8;
      const fmt = (v) => String(+v.toFixed(3));
      const gEgg = new THREE.Group(), gDrop = new THREE.Group(), gMol = new THREE.Group();
      root.add(gEgg, gDrop, gMol);
      const floor = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0x050b18 }));
      floor.scale.set(15, 0.1, 12); floor.position.set(0, -0.06, -0.8); root.add(floor); floor.userData.v3bg = true;
      const dum = new THREE.Object3D();

      /* ---- 달걀과 다스 상자 (2D: 세기의 한계 · 달걀) ---- */
      const eggGeo = new THREE.SphereGeometry(1, 20, 14), eggMat = new THREE.MeshStandardMaterial({ color: 0xfff1d6, roughness: 0.4 });
      const eggs = [], boxes = [], boxLabs = [];
      for (let j = 0; j < 60; j++) { const m = new THREE.Mesh(eggGeo, eggMat); m.scale.set(0.22, 0.3, 0.22); gEgg.add(m); eggs.push(m); }
      const carMat = new THREE.MeshStandardMaterial({ color: 0xd9b88a, roughness: 0.9 });
      for (let i = 0; i < 5; i++) {
        const car = new THREE.Mesh(new THREE.BoxGeometry(3, 0.4, 1.5), carMat); gEgg.add(car); boxes.push(car);
        const l = label('', [0, 1.2, 0], { size: 12.5 }); l.show(false); boxLabs.push(l);
      }
      const BWID = 3, trayLab = label('낱개', [0, 0.6, 2.2], { size: 12.5 }); trayLab.show(false);
      const boxPos = (i, nb) => { const row = Math.floor(i / 3), cnt = Math.min(3, nb - row * 3), col = i % 3; return [(col - (cnt - 1) / 2) * (BWID + 0.35), -1.7 - row * 2.0]; };
      const trayPos = (j) => [-2.25 + (j % 10) * 0.5, 0.9 + Math.floor(j / 10) * 0.55];
      function eggScene(Z, own, p) {
        const S = Z.S, n = S.eg.n, nb = Math.ceil(n / 12);
        let full = 0;
        const cnt = [0, 0, 0, 0, 0];
        for (let i = 0; i < 5; i++) {
          boxes[i].visible = i < nb;
          if (i < nb) { const b = boxPos(i, nb); boxes[i].position.set(b[0], 0.2, b[1]); }
        }
        for (let j = 0; j < 60; j++) {
          const m = eggs[j]; m.visible = j < n; if (j >= n) continue;
          let u;
          if (own) { const s = 0.1 + 0.6 * (j / Math.max(1, n - 1)); u = sm((p - s) / 0.2) * (1 - sm((p - 0.9) / 0.1)); }
          else u = clamp(S.eg.eggs[j] ? S.eg.eggs[j].u : 0, 0, 1);
          const b = boxPos(Math.floor(j / 12), nb), sl = j % 12, c = sl % 6, r = Math.floor(sl / 6);
          const tp = trayPos(j), x1 = b[0] - BWID / 2 + 0.35 + c * ((BWID - 0.7) / 5), z1 = b[1] - 0.32 + r * 0.64;
          m.position.set(tp[0] + (x1 - tp[0]) * u, 0.3 + (0.5 - 0.3) * u + Math.sin(u * Math.PI) * 1.0, tp[1] + (z1 - tp[1]) * u);
          if (u >= 0.999) cnt[Math.floor(j / 12)]++;
        }
        for (let i = 0; i < 5; i++) {
          const l = boxLabs[i]; l.show(i < nb);
          if (i < nb) { const b = boxPos(i, nb); l.obj = [b[0], 1.0, b[1]]; const f = cnt[i] === 12; if (f) full++; l.set(f ? '1다스' : cnt[i] + ' / 12'); }
        }
        trayLab.show(true); trayLab.obj = [0, 0.6, 0.9 + (Math.ceil(n / 10) - 1) * 0.55 / 2 + 1.0]; trayLab.set('낱개 ' + n + '개');
        info('<b>달걀 ' + n + '개</b> · 1다스 = 12개' + (full === nb ? '<br>' + n + '개 ÷ 12개 = <b>' + (n / 12) + '다스</b>' : '<br>12개씩 묶어 다스 상자에 담아요.') + '<br>화학에서는 <b>6.02×10²³개</b>를 한 묶음(1 mol)으로 세요.');
      }

      /* ---- 물 한 방울 (2D: 세기의 한계 · 물 한 방울) ---- */
      const dropMat = new THREE.MeshStandardMaterial({ color: 0x5bb4f5, transparent: true, opacity: 0.35, roughness: 0.1 });
      const dr = new THREE.Mesh(new THREE.SphereGeometry(1.15, 28, 20), dropMat); dr.position.set(0, 1.5, -1.2); gDrop.add(dr);
      const drTop = new THREE.Mesh(new THREE.ConeGeometry(0.98, 1.3, 24), dropMat); drTop.position.set(0, 2.95, -1.2); gDrop.add(drTop);
      const dms = [];
      for (let i = 0; i < 10; i++) { const m = L.mol(L.MOLS.H2O, 0.3); gDrop.add(m); dms.push(m); }
      const RX0 = -4.6, RX1 = 4.6, RZ = 1.8, rx = (e) => RX0 + (RX1 - RX0) * e / 24;
      const ruler = new THREE.Mesh(new THREE.BoxGeometry(RX1 - RX0, 0.07, 0.07), new THREE.MeshStandardMaterial({ color: 0x8a95a6 })); ruler.position.set(0, 0.1, RZ); gDrop.add(ruler);
      const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹', dropLabs = [];
      [0, 6, 12, 18, 24].forEach((e) => {
        const t = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.06), ruler.material); t.position.set(rx(e), 0.1, RZ); gDrop.add(t);
        dropLabs.push(label('10' + String(e).split('').map((c) => SUP[+c]).join(''), [rx(e), -0.25, RZ], { size: 11.5 }));
      });
      const dropE = Math.log10(0.05 / 18 * NA), molE = Math.log10(NA);
      [[dropE, '한 방울', 0x0e7490, 0.9], [molE, '1 mol', 0xb45309, 1.5]].forEach((m) => {
        const pil = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, m[3], 8), new THREE.MeshStandardMaterial({ color: m[2] })); pil.position.set(rx(m[0]), 0.1 + m[3] / 2, RZ); gDrop.add(pil);
        dropLabs.push(label(m[1], [rx(m[0]), 0.2 + m[3] + 0.15, RZ], { size: 12, color: '#' + m[2].toString(16).padStart(6, '0') }));
      });
      const mk = new THREE.Mesh(L.SG, L.mat(0x8b5cf6)); mk.scale.setScalar(0.2); mk.position.set(RX0, 0.1, RZ); gDrop.add(mk);
      const cntLab = label('0개', [RX0, 0.65, RZ], { size: 12.5, color: '#6d28d9' });
      const dropLab = label('물 한 방울 ≈ 0.05 g', [0, 4.1, -1.2], { size: 12.5 });
      function dropScene(Z, own, p, t) {
        const S = Z.S, DN = Z.DROP_N;
        let counted;
        if (own) counted = p >= 0.92 ? DN * (1 - sm((p - 0.92) / 0.08)) : DN * Math.pow(clamp(p / 0.8, 0, 1), 2);
        else counted = S.dr.done ? DN : DN * Math.pow(clamp(S.dr.t / S.dr.dur, 0, 1), 2);
        dms.forEach((m, i) => { const a = i * 2.4 + t * 0.35, r = Math.sqrt((i + 0.5) / 10) * 0.8; m.position.set(Math.cos(a) * r, 1.3 + Math.sin(a * 1.3) * 0.45, -1.2 + Math.sin(a) * r); m.rotation.y = a; });
        mk.position.x = rx(clamp(Math.log10(Math.max(counted, 1)), 0, 24));
        cntLab.obj = [mk.position.x, 0.65, RZ]; cntLab.set(counted < 1e7 ? Math.round(counted).toLocaleString('ko-KR') + '개' : Z.sci(counted, 3) + '개');
        const sec = counted / RATE, doneNow = counted >= DN * 0.9999;
        info('<b>물 한 방울 ≈ 0.05 g</b> → n = 0.05 / 18 = ' + Z.sci(DN / NA, 3) + ' mol<br>N = n × 6.02×10²³ ≈ <b>' + Z.sci(DN, 2) + '개</b><br>1초에 10⁸개씩 세면: 센 분자 ' + (counted > 0 ? Z.sci(counted, 3) : '0') + '개 · 걸린 시간 ' + (doneNow ? '약 <b>' + Z.timeStr(sec) + '</b>' : counted > 0 ? Z.timeStr(sec) : '0초') + '<br>6.02×10²³개(1 mol)는 약 ' + Z.timeStr(Z.MOL_SEC) + '이 걸려요.');
      }

      /* ---- 1 mol 상자 (2D: 몰의 정의) ---- */
      const molGs = [], crates = [], crateLabs = [];
      const CX = (i) => (phone ? 0 : (i - 1) * 5.0), CZ = (i) => (phone ? (i - 1) * 2.6 : 0) - 0.8;
      for (let i = 0; i < 3; i++) {
        const g = L.glassBox(4.5, 1.5, 2.0, 0x9ec5ff, 0.1); g.position.set(CX(i), 0.8, CZ(i)); gMol.add(g); crates.push(g);
        const l = label('', [CX(i), 1.9, CZ(i)], { size: 12.5 }); l.show(false); crateLabs.push(l);
        for (let q = 0; q < 10; q++) {
          const m = L.mol(L.MOLS.H2O, 0.42); m.position.set(CX(i) - 1.8 + (q % 5) * 0.9, 0.55, CZ(i) - 0.45 + Math.floor(q / 5) * 0.9); m.visible = false; gMol.add(m); molGs.push(m);
        }
        const slab = new THREE.Mesh(new THREE.BoxGeometry(4.9, 0.1, 2.4), new THREE.MeshStandardMaterial({ color: 0x1b2540, roughness: 0.8 })); slab.position.set(CX(i), 0.0, CZ(i)); gMol.add(slab);
      }
      { const fb = new THREE.Mesh(new THREE.BoxGeometry(phone ? 4.9 : 14.9, 2.0, phone ? 7.6 : 2.4), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.2, colorWrite: false, depthWrite: false })); fb.position.set(0, 0.9, -0.8); gMol.add(fb); }   // 화면 맞춤용 보이지 않는 상자: 1 mol 상자 3개가 다 들어가요
      function molScene(Z, own, p) {
        const n = own ? 3 * (p < 0.92 ? Math.min(1, p / 0.85) : 1 - sm((p - 0.92) / 0.08)) : Z.S.mo.disp;
        for (let i = 0; i < 3; i++) {
          const fill = clamp(n * 10 - i * 10, 0, 10), full = fill >= 9.999;
          for (let q = 0; q < 10; q++) { const a = clamp(fill - q, 0, 1), m = molGs[i * 10 + q]; m.visible = a > 0.01; m.scale.setScalar(0.5 + 0.5 * a); }
          crates[i].userData.fill.material.color.setHex(full ? 0xffd34d : 0x9ec5ff); crates[i].userData.fill.material.opacity = full ? 0.2 : 0.1;
          const l = crateLabs[i]; l.show(fill > 0.01); l.set(full ? '1 mol × 6.02×10²³개' : fmt(fill / 10) + ' mol');
        }
        const nn = Math.round(n * 10) / 10;
        info('<b>1 mol = 6.02×10²³개</b> (아보가드로 수) · 상자 하나 = 1 mol · 한 칸 = 0.1 mol<br>N = n × 6.02×10²³ = ' + fmt(nn) + ' × 6.02×10²³ = <b>' + Z.sci(nn * NA) + '개</b><br>몰은 개수의 단위예요. 그림은 대표 입자만 그렸어요.');
      }

      /* ---- 재생기 3개: 장면마다 하나만 보여요 ---- */
      let own = null, sig = '', pEgg = 0, pDrop = 0, pMol = 0;
      const rowOf = () => { const r = document.querySelectorAll('.v3-player'); return r[r.length - 1]; };
      const plEgg = controls.player({ duration: 9, loop: true, label: '12개씩 묶기', phases: [[0, '낱개'], [0.1, '묶는 중'], [0.7, '다스 상자'], [0.9, '다시 풀기']], onFrame(p) { pEgg = p; own = p > 0 ? 'egg' : (own === 'egg' ? null : own); } });
      const rowEgg = rowOf();
      const plDrop = controls.player({ duration: 8, loop: true, label: '세기', phases: [[0, '세기 전'], [0.02, '세는 중'], [0.8, '다 셌어요'], [0.92, '처음으로']], onFrame(p) { pDrop = p; own = p > 0 ? 'drop' : (own === 'drop' ? null : own); } });
      const rowDrop = rowOf();
      const plMol = controls.player({ duration: 10, loop: true, label: '상자 채우기', phases: [[0, '0 mol'], [0.28, '1 mol'], [0.57, '2 mol'], [0.85, '3 mol'], [0.92, '비우기']], onFrame(p) { pMol = p; own = p > 0 ? 'mol' : (own === 'mol' ? null : own); } });
      const rowMol = rowOf();
      const PL = { egg: plEgg, drop: plDrop, mol: plMol };
      let lastKind = '';
      const DIST = phone ? { egg: 17, drop: 16, mol: 17 } : { egg: 10.5, drop: 11, mol: 15 };

      return {
        update(dt, t) {
          const Z = ctx.lesson(); if (!Z) return;
          const S = Z.S, kind = S.mode === 'count' ? (S.sub.count === 'egg' ? 'egg' : 'drop') : 'mol';
          const s = [S.mode, S.sub.count, S.eg.n, S.eg.packed, S.dr.run, Math.round(S.mo.n * 10)].join('|');
          if (s !== sig) {
            sig = s;
            if (own) { const k = own; own = null; PL[k].pause(); PL[k].set(0); }
          }
          if (kind !== lastKind) { lastKind = kind; ctx.orbit.dist = DIST[kind]; ctx.refit(0.3); }
          rowEgg.style.display = kind === 'egg' ? '' : 'none'; rowDrop.style.display = kind === 'drop' ? '' : 'none'; rowMol.style.display = kind === 'mol' ? '' : 'none';
          if (kind !== 'egg' && plEgg.playing) plEgg.pause();
          if (kind !== 'drop' && plDrop.playing) plDrop.pause();
          if (kind !== 'mol' && plMol.playing) plMol.pause();
          gEgg.visible = kind === 'egg'; gDrop.visible = kind === 'drop'; gMol.visible = kind === 'mol';
          trayLab.show(kind === 'egg');
          if (kind !== 'egg') boxLabs.forEach((l) => l.show(false));
          if (kind !== 'mol') crateLabs.forEach((l) => l.show(false));
          const o = own === kind;
          if (kind === 'egg') eggScene(Z, o, pEgg);
          else if (kind === 'drop') dropScene(Z, o, pDrop, t);
          else molScene(Z, o, pMol);
          dropLabs.concat([dropLab, cntLab]).forEach((l) => l.show(kind === 'drop'));
        },
      };
    },
  });
})();
