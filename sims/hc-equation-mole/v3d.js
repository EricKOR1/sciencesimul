/* hc-equation-mole · 3D 반응식: 분자 개수와 계수비
   반응이 한 번 일어날 때마다 반응물이 계수만큼 줄고 생성물이 계수만큼 늘어요. 원자 수는 그대로예요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
    /* ---- 공용 도우미: 분자 모형 · 유리 상자 · 화살표 ---- */
  function makeLib(THREE) {
    const COL = { H: 0xf3f6fb, C: 0x8a93a3, N: 0x4f7cff, O: 0xf0524f, F: 0x9be36b, Cl: 0x34c759, Na: 0xb07cf5, B: 0xf4a6a6, S: 0xf5c518, Cu: 0xe08a3c, Ca: 0x6fd0c4, e: 0xffd34d };
    const RAD = { H: 0.26, C: 0.38, N: 0.37, O: 0.36, F: 0.32, Cl: 0.48, Na: 0.5, B: 0.36, S: 0.48, Cu: 0.5, Ca: 0.55 };
    const mats = {};
    const mat = (k) => mats[k] || (mats[k] = new THREE.MeshPhysicalMaterial({ color: COL[k] !== undefined ? COL[k] : k, roughness: 0.3, metalness: 0.05, clearcoat: 0.7, clearcoatRoughness: 0.25 }));
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
    title: '반응식 입자 모형 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대 · 계수를 바꾸면 입자 수가 바뀌어요',
    levels: [0],   // 반응식 쓰기(계수 · 입자 모형). 몰 상자 · 질량 표 · 저울 단계는 2D
    camera: { dist: phone ? 27 : 15.5, theta: 0.15, phi: 0.8, min: 6, max: 34, target: [0, -0.2, 0] },
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const L = makeLib(THREE);
      const sm = L.sstep, clamp = (x, a, b) => Math.max(a, Math.min(b, x));
      /* 이 차시에서만 쓰는 분자 모형 (2D와 같은 물질) */
      L.COL.Al = 0xa8b5c7; L.COL.Fe = 0xb45309; L.RAD.Al = 0.5; L.RAD.Fe = 0.5;
      const M = L.MOLS, V3 = (x, y, z) => [x, y, z];
      M.C3H8 = { a: [['C', -1.25, -0.3, 0], ['C', 0, 0.35, 0], ['C', 1.25, -0.3, 0], ['H', -1.85, 0.1, 0.85], ['H', -1.85, 0.1, -0.85], ['H', -1.4, -1.35, 0], ['H', 0, 1.0, 0.9], ['H', 0, 1.0, -0.9], ['H', 1.85, 0.1, 0.85], ['H', 1.85, 0.1, -0.85], ['H', 1.4, -1.35, 0]], b: [[0, 1, 1], [1, 2, 1], [0, 3, 1], [0, 4, 1], [0, 5, 1], [1, 6, 1], [1, 7, 1], [2, 8, 1], [2, 9, 1], [2, 10, 1]] };
      M.Al = { a: [['Al', 0, 0, 0]], b: [] };
      M.Fe = { a: [['Fe', 0, 0, 0]], b: [] };
      M.AlCl3 = { a: [['Al', 0, 0, 0], ['Cl', 1.9, 0, 0], ['Cl', -0.95, 0, 1.65], ['Cl', -0.95, 0, -1.65]], b: [[0, 1, 1], [0, 2, 1], [0, 3, 1]] };
      M.C2H5OH = { a: [['C', -1.2, -0.2, 0], ['C', 0.1, 0.4, 0], ['O', 1.3, -0.3, 0], ['H', 1.9, 0.2, 0], ['H', 0.1, 1.05, 0.85], ['H', 0.1, 1.05, -0.85], ['H', -1.8, 0.2, 0.85], ['H', -1.8, 0.2, -0.85], ['H', -1.3, -1.3, 0]], b: [[0, 1, 1], [1, 2, 1], [2, 3, 1], [1, 4, 1], [1, 5, 1], [0, 6, 1], [0, 7, 1], [0, 8, 1]] };
      M.Fe2O3 = { a: [['Fe', -1.0, 0, 0], ['Fe', 1.0, 0, 0], ['O', 0, 0.9, 0], ['O', 0, -0.45, 0.8], ['O', 0, -0.45, -0.8]], b: [[0, 2, 1], [1, 2, 1], [0, 3, 1], [1, 3, 1], [0, 4, 1], [1, 4, 1]] };
      (function () { const a = [], b = []; for (let i = 0; i < 6; i++) { const t = i * Math.PI / 3, c = a.length; a.push(['C', 1.2 * Math.cos(t), 0, 1.2 * Math.sin(t)]); a.push(['O', 2.2 * Math.cos(t), 0, 2.2 * Math.sin(t)]); a.push(['H', 1.3 * Math.cos(t), 0.95, 1.3 * Math.sin(t)]); a.push(['H', 2.8 * Math.cos(t), 0.5, 2.8 * Math.sin(t)]); b.push([c, c + 1, 1], [c, c + 2, 1], [c + 1, c + 3, 1]); if (i) b.push([c, c - 4, 1]); } b.push([0, 20, 1]); M.C6H12O6 = { a, b }; })();
      const FOR = (k) => k.replace(/\d/g, (d) => '₀₁₂₃₄₅₆₇₈₉'[+d]);
      const ext = (k) => Math.max.apply(null, M[k].a.map((x) => Math.hypot(x[1], x[2], x[3]) + (L.RAD[x[0]] || 0.4)));
      const kOf = (k) => clamp(1.15 / ext(k), 0.3, 0.8);

      const PER = 4, DX = 1.5, DY = 1.15, ROWZ = 2.9;
      const root2 = new THREE.Group(); root.add(root2);
      const labs = []; for (let i = 0; i < 4; i++) { const l = label('', [0, 0, 0], { size: 12.5 }); l.show(false); labs.push(l); }
      /* 실험대(나무 무늬) */
      (function () {
        const c = document.createElement('canvas'); c.width = 512; c.height = 512; const x = c.getContext('2d');
        x.fillStyle = '#8a6240'; x.fillRect(0, 0, 512, 512);
        for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? 'rgba(60,35,15,.10)' : 'rgba(255,220,170,.07)'; x.fillRect(0, i * 64, 512, 64); x.fillStyle = 'rgba(40,22,8,.55)'; x.fillRect(0, i * 64, 512, 2); }
        for (let i = 0; i < 260; i++) { x.strokeStyle = 'rgba(50,28,10,' + (0.05 + Math.random() * 0.09) + ')'; x.lineWidth = 0.6 + Math.random(); const y = Math.random() * 512; x.beginPath(); x.moveTo(0, y); x.bezierCurveTo(150, y + Math.random() * 6 - 3, 350, y + Math.random() * 6 - 3, 512, y + Math.random() * 4 - 2); x.stroke(); }
        const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(2, 1.4);
        const bench = new THREE.Mesh(new THREE.BoxGeometry(24, 0.5, 13), new THREE.MeshStandardMaterial({ map: tex, color: 0x9a7d62, roughness: 0.65, metalness: 0.02 })); bench.position.set(0, -1.75, 0); root.add(bench); bench.userData.v3bg = true;
      })();
      const glassM = new THREE.MeshPhysicalMaterial({ color: 0xcfe6ff, transparent: true, opacity: 0.3, roughness: 0.05, metalness: 0, clearcoat: 1, depthWrite: false });
      const tray = (x, col) => {
        const t = new THREE.Group(), W = 6.8, D = 4.8, th = 0.14, H = 0.62;
        const base = new THREE.Mesh(new THREE.BoxGeometry(W, 0.16, D), new THREE.MeshPhysicalMaterial({ color: col, transparent: true, opacity: 0.4, roughness: 0.1, clearcoat: 1, depthWrite: false })); t.add(base);
        [[0, D / 2 - th / 2, W, th], [0, -D / 2 + th / 2, W, th]].forEach((q) => { const w = new THREE.Mesh(new THREE.BoxGeometry(q[2], H, q[3]), glassM); w.position.set(q[0], H / 2, q[1]); t.add(w); });
        [W / 2 - th / 2, -W / 2 + th / 2].forEach((px) => { const w = new THREE.Mesh(new THREE.BoxGeometry(th, H, D - 2 * th), glassM); w.position.set(px, H / 2, 0); t.add(w); });
        const rim = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(W, H + 0.08, D)), new THREE.LineBasicMaterial({ color: 0xe6f0ff, transparent: true, opacity: 0.7 })); rim.position.y = H / 2; t.add(rim);
        t.position.set(x, -1.3, 0); root.add(t); return t;
      };
      tray(-4.1, 0x6aa2ff); tray(4.1, 0x58d68d);
      const arr = L.arrow([-0.5, -1.0, 0], [0.5, -1.0, 0], 0xffd34d, 0.1, 0.4); root.add(arr);
      const packBoxes = []; for (let i = 0; i < 8; i++) { const g = L.glassBox(2.9, 1.0, 1.4, 0xffd34d, 0.16); g.visible = false; root.add(g); packBoxes.push(g); }
      const packLabs = []; for (let i = 0; i < 3; i++) { const l = label('1 mol 상자', [0, 0, 0], { size: 11.5, color: '#92400e' }); l.show(false); packLabs.push(l); }

      let spec = [], specKey = '';
      function rebuild(list, key) {
        specKey = key; L.clear(root2); spec = [];
        list = list.map((s) => Object.assign({}, s, { side: s.side === 0 ? -1 : s.side }));
        const nL = list.filter((s) => s.side < 0).length, nR = list.length - nL; let iL = 0, iR = 0;
        list.forEach((s) => {
          const row = s.side < 0 ? iL++ : iR++, rows = s.side < 0 ? nL : nR, N = s.N, pool = [];
          const k = kOf(s.k);
          for (let i = 0; i < N; i++) { const g = L.mol(M[s.k], k); g.scale.setScalar(0.001); root2.add(g); pool.push({ g, i, ph: Math.random() * 6 }); }
          spec.push({ k: s.k, side: s.side, row, rows, N, pool, a: 0, label: '' });
        });
        labs.forEach((l) => l.show(false));
        spec.forEach((s, i) => { const l = labs[i]; if (!l) return; l.obj = [s.side < 0 ? -4.1 : 4.1, 0, (s.row - (s.rows - 1) / 2) * ROWZ]; l.off = [0, 1.9, 0]; l.show(true); });
      }
      const posOf = (s, i) => ({ x: (s.side < 0 ? -4.1 : 4.1) + ((i % PER) - (PER - 1) / 2) * DX, y: -0.6 + Math.floor(i / PER) * DY, z: (s.row - (s.rows - 1) / 2) * ROWZ });
      function amounts(list, f) { spec.forEach((s, i) => { s.a = list[i].a(f); s.lab = list[i].lab; if (labs[i]) { labs[i].set(s.lab); labs[i].show(true); } }); }

      /* --- 장면 정의: 2D 상태에서 목록을 만들어요 --- */
      function reactionList(Z) {
        const S = Z.S;
        if (S.mode === 'balance') {
          const bi = Z.balInfo(), c = bi.eq.c;
          return { key: 'b' + S.b.sel + '|' + c.join(','), info: () => '<b>' + eqStr(bi.r.sp.map((s, i) => ({ k: s.k, c: c[i], side: s.side }))) + '</b><br>' + (bi.same ? '⚖️ 양쪽의 원자 수가 같아요!' + (bi.simplest ? ' 가장 간단한 정수비예요.' : ' 계수를 가장 작은 정수비로 줄여 보세요.') : '⚠️ ' + bi.bad.join(' · ') + ' 원자 수가 달라요') + '<br>화학식은 바꿀 수 없고, 계수만 바꿔서 양쪽 원자 수를 맞춰요.',
            sp: bi.r.sp.map((s, i) => ({ k: s.k, side: s.side, N: Math.min(12, c[i]), a: (f) => Math.min(12, c[i]) * (s.side ? f : 1 - f), lab: FOR(s.k) + ' · ' + c[i] + '개' })) };
        }
        if (S.mode === 'mass') {
          const mi = Z.massInfo(), i = S.q.sel;
          return { key: 'q' + i, info: () => '<b>' + eqStr(mi.rx.sp.map((s) => ({ k: s[0], c: s[1], side: s[3] }))) + '</b><br>계수비 = 몰수비 (' + mi.coefs.join(' : ') + ')<br>질량 = 몰수 × 몰질량 → 질량비는 계수비와 달라요. 그래도 질량의 합은 같아요(질량 보존).<br>대표 입자 한 개 = 1 mol',
            sp: mi.rx.sp.map((s, j) => { const fl = S.q.filled[i][j]; return { k: s[0], side: s[3], N: s[1], a: (f) => s[1] * (s[3] ? f : 1 - f), lab: FOR(s[0]) + ' · ' + s[1] + ' mol<br>' + Z.MM(s[0]) + ' g/mol' + (fl ? ' → <b>' + fl + ' g</b>' : '') }; }) };
        }
        const rx = Z.READ[S.r.sel];
        return { key: 'r' + S.r.sel, info: () => '<b>' + eqStr(rx.sp.map((s) => ({ k: s[0], c: s[1], side: s[3] }))) + '</b> (' + rx.ctx + ')<br>' + (S.r.sub === 'sent' ? '계수비 = 몰수비: ' + rx.sp.map((s) => s[1]).join(' : ') + '<br>' + (S.r.sent[S.r.sel] ? rx.sentDone : '반응식의 계수를 몰수로 읽어 몰 문장을 완성해요.') : '반응 전후 질량의 합은 같아요(질량 보존).<br>몰수 × 몰질량으로 각 물질의 질량을 구해 합해요.'),
          sp: rx.sp.map((s) => ({ k: s[0], side: s[3], N: s[1], a: (f) => s[1] * (s[3] ? f : 1 - f), lab: FOR(s[0]) + ' · 계수 ' + s[1] })) };
      }
      function eqStr(sp) { const side = (sd) => sp.filter((s) => s.side === sd).map((s) => (s.c > 1 ? s.c + ' ' : '') + FOR(s.k)).join(' + '); return side(0) + ' → ' + side(1); }

      /* --- ② 계수비 = 몰수비 (2H₂ + O₂ → 2H₂O, 처음 H₂ 6 mol · O₂ 3 mol) --- */
      const MSP = [{ k: 'H2', side: -1, N: 12 }, { k: 'O2', side: -1, N: 6 }, { k: 'H2O', side: 1, N: 12 }];
      function molInfoFor(Z, x) {
        const q = { cH2: x, cO2: x / 2, fW: x, rH2: 6 - x, rO2: 3 - x / 2 }, fT = (v) => String(+v.toFixed(2));
        return { q, spList: [
          { k: 'H2', side: -1, N: 12, a: () => (6 - x) * 2, lab: 'H₂ · ' + fT(q.rH2) + ' mol' },
          { k: 'O2', side: -1, N: 6, a: () => (3 - x / 2) * 2, lab: 'O₂ · ' + fT(q.rO2) + ' mol' },
          { k: 'H2O', side: 1, N: 12, a: () => x * 2, lab: 'H₂O · ' + fT(q.fW) + ' mol' }],
          text: '<b>2H₂ + O₂ → 2H₂O</b> · 처음 H₂ 6 mol, O₂ 3 mol<br>반응한 H₂ <b>' + fT(x) + ' mol</b> → 반응한 O₂ ' + fT(q.cO2) + ' mol, 생긴 H₂O ' + fT(q.fW) + ' mol<br>계수비 2 : 1 : 2 = 몰수비 (대표 입자 한 개 = 0.5 mol)' };
      }

      /* ---- 재생기: 반응 진행 ---- */
      let own = null, sig = '', pR = 0, pM = 0, lastKind = '';
      const rowOf = () => { const r = document.querySelectorAll('.v3-player'); return r[r.length - 1]; };
      const mkP = (kind, o, set) => { const pl = controls.player(Object.assign({ loop: true }, o, { onFrame(p) { set(p); own = p > 0 ? kind : (own === kind ? null : own); } })); return { pl, row: rowOf() }; };
      const PR = mkP('rx', { duration: 8, label: '반응 진행', phases: [[0, '반응 전'], [0.12, '반응 중'], [0.5, '반응 후'], [0.88, '처음으로']] }, (p) => { pR = p; });
      const PM = mkP('mol', { duration: 10, label: '반응 진행', phases: [[0, 'H₂ 6 mol'], [0.1, '반응 중'], [0.85, 'H₂ 모두 반응'], [0.93, '처음으로']] }, (p) => { pM = p; });
      const PL = { rx: PR, mol: PM };
      const fRx = (p) => (p < 0.1 ? 0 : p < 0.5 ? sm((p - 0.1) / 0.4) : p < 0.88 ? 1 : 1 - sm((p - 0.88) / 0.12));
      const xMol = (p) => 6 * (p < 0.1 ? 0 : p < 0.85 ? sm((p - 0.1) / 0.75) : p < 0.93 ? 1 : 1 - sm((p - 0.93) / 0.07));

      return {
        update(dt, t) {
          const Z = ctx.lesson(); if (!Z) return; dt = Math.min(dt, 0.05);
          const S = Z.S, kind = S.mode === 'mol' ? 'mol' : 'rx';
          const bs = S.b.eq[S.b.sel].c.join(','), s = [S.mode, S.b.sel, bs, S.q.sel, S.r.sel, S.m.x, S.m.packOn, S.b.ran].join('|');
          if (s !== sig) { sig = s; if (own) { const k = own; own = null; PL[k].pl.pause(); PL[k].pl.set(0); } }
          if (kind !== lastKind) { lastKind = kind; }
          Object.keys(PL).forEach((k) => { PL[k].row.style.display = k === kind ? '' : 'none'; if (k !== kind && PL[k].pl.playing) PL[k].pl.pause(); });
          const o = own === kind;
          let spList, key, text, f = 0, pack = 0;
          if (kind === 'mol') {
            const x = o ? xMol(pM) : S.m.vx, mi = molInfoFor(Z, x); spList = mi.spList; key = 'mol'; text = mi.text; pack = S.m.pack;
          } else { const r = reactionList(Z); spList = r.sp; key = r.key; text = r.info(); f = o ? fRx(pR) : (S.b.ran && S.mode === 'balance' ? 1 : 0); }
          if (key !== specKey) rebuild(spList, key);
          amounts(spList, f);
          const kk = 1 - Math.pow(0.0015, dt);
          spec.forEach((sp) => sp.pool.forEach((p) => {
            const g = p.g, ps = posOf(sp, p.i), sc = sm(sp.a - p.i), here = sc > 0.001;
            g.visible = here; if (!here) return;
            g.position.set(ps.x, ps.y + Math.sin(t * 1.3 + p.ph) * 0.06, ps.z); g.scale.setScalar(Math.max(0.001, sc)); g.rotation.y += dt * 0.5;
          }));
          // 1 mol 상자 (계수비 = 몰수비 단계)
          let bi = 0, pl = 0;
          packBoxes.forEach((b) => { b.visible = false; }); packLabs.forEach((l) => l.show(false));
          if (kind === 'mol' && pack > 0.01) {
            spec.forEach((sp, si) => {
              for (let j = 0; j < sp.N; j += 2) {
                if (sp.a < j + 2 - 1e-6 || bi >= 8) continue;
                const p0 = posOf(sp, j), b = packBoxes[bi++]; b.visible = true; b.position.set(p0.x + DX / 2, p0.y + 0.25, p0.z); b.scale.set(2.9 * pack, 1.0 * pack, 1.4 * pack);
              }
              if (pl < 3 && sp.a >= 2) { const l = packLabs[pl++]; l.obj = [(sp.side < 0 ? -4.1 : 4.1), 2.6, (sp.row - (sp.rows - 1) / 2) * ROWZ]; l.show(pack > 0.5); l.set('1 mol 상자 = 입자 2개'); }
            });
          }
          info(text);
        },
      };
    },
  });
})();
