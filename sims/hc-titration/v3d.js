/* hc-titration · 3D 중화 적정 장치
   뷰렛의 NaOH를 한 방울씩 넣으면 플라스크 속 H⁺가 줄다가, 정확히 중화되는 종말점에서 지시약이 분홍색으로 변해요. */
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

    /* ---- 중화 적정 장치 (뷰렛 · 삼각 플라스크 · 이온 입자) ---- */
  function makeTitration(ctx, CFG) {
    const { THREE, root, label, info, controls, mats } = ctx;
      /* 미션 보조 판: 미션이 말하는 표·기록·카드를 3D 화면 구석에 작게 보여 줘요 (2D 상태를 그대로 읽어요) */
      const mxBox = (pos) => {
        const v = ctx.renderer.domElement.parentElement;
        if (!document.getElementById('mx3d-css')) { const s = document.createElement('style'); s.id = 'mx3d-css'; s.textContent =
          '.mx3d{position:absolute;z-index:3;padding:6px 8px;border-radius:12px;background:rgba(8,12,24,.8);color:#fff;font-size:12px;line-height:1.35;pointer-events:none;max-width:48%;box-shadow:0 4px 14px rgba(0,0,0,.35)}.mx3d:empty{display:none}' +
          '.mx3d.tr{right:10px;top:10px}.mx3d.br{right:10px;bottom:34px}.mx3d.bl{left:10px;bottom:10px}.mx3d .h{font-weight:900;margin-bottom:3px}' +
          '.mx3d table{border-collapse:collapse}.mx3d th,.mx3d td{padding:1px 5px;text-align:center;white-space:nowrap}.mx3d th{color:#b9c6e4;font-weight:800}.mx3d td:first-child,.mx3d th:first-child{text-align:left}' +
          '.mx3d .on{color:#ffd34d;font-weight:800}.mx3d .ok{color:#7ee2a8;font-weight:800}.mx3d .no{color:#ff9a9a;font-weight:800}.mx3d .dim{color:#8d99b3}.mx3d tr.sel td{background:rgba(255,211,77,.16)}' +
          '@media (max-width:599px){.mx3d{font-size:10.5px;padding:4px 6px;max-width:60%}.mx3d.tr{top:auto;bottom:30px}.mx3d th,.mx3d td{padding:0 3px}}';
          document.head.appendChild(s); }
        const el = document.createElement('div'); el.className = 'mx3d ' + (pos || 'tr'); v.appendChild(el);
        let last = ''; el.put = (h) => { if (h !== last) { last = h; el.innerHTML = h; } }; return el;
      };
    const L = makeLib(THREE), V3 = L.V;
    const YB0 = 10.9, YB1 = 5.9, PER = (YB0 - YB1) / 50; // 뷰렛 0 mL 눈금 높이, 아래 끝, mL당 높이
    const glass = (op) => mats.glass({ opacity: op });
    // 받침대
    const base = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.3, 3.8), mats.metal(0x2c3445, { roughness: 0.5 })); base.castShadow = base.receiveShadow = true; base.position.set(0.8, -0.15, 0); root.add(base);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 11.6, 24), mats.metal('steel', { brushed: true })); rod.castShadow = true; rod.position.set(3.0, 5.55, 0); root.add(rod);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.7, 12), rod.material); arm.rotation.z = Math.PI / 2; arm.position.set(1.65, 9.4, 0); root.add(arm);
    const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.6), mats.plastic(0xc63a37));
    { const bh = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.5, 20), mats.metal('aluminium')); bh.rotation.z = Math.PI / 2; bh.position.set(3.0, 9.4, 0); root.add(bh);   // 받침대 고정 나사뭉치
      const sc = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 12), mats.metal('brass')); sc.rotation.x = Math.PI / 2; sc.position.set(3.0, 9.4, 0.4); root.add(sc);
      [-1, 1].forEach((q) => { const ft = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.1, 18), mats.rubber()); ft.position.set(0.8 + q * 2.8, -0.33, q * 0 + 1.5); root.add(ft); const f2 = ft.clone(); f2.position.z = -1.5; root.add(f2); }); } clamp.position.set(0.3, 9.4, 0); root.add(clamp);
    { const fl = new THREE.Mesh(new THREE.BoxGeometry(14, 0.12, 8), mats.wood(0x6e5641, { repeat: 2 })); fl.position.set(0.8, -0.44, 0); fl.receiveShadow = true; fl.userData.v3bg = true; root.add(fl); }   // 실험대 (화면 맞춤에서 빼요)
    // 뷰렛
    const bur = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, YB0 + 0.5 - YB1, 32, 1, true), glass(0.2)); bur.position.set(0, (YB0 + 0.5 + YB1) / 2, 0); root.add(bur);
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.2, 0.55, 16, 1, true), glass(0.35)); tip.position.set(0, 5.55, 0); root.add(tip);
    const cockM = mats.plastic(0x3561d8);
    const cock = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.9, 14), cockM); cock.rotation.z = Math.PI / 2; cock.position.set(0, 6.1, 0); root.add(cock);
    const bl = mats.liquid(CFG.titrant, { opacity: 0.55 });
    const bliq = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 1, 24), bl); root.add(bliq);
    for (let i = 0; i <= 10; i++) { const y = YB0 - i * 5 * PER; const t = new THREE.Mesh(new THREE.BoxGeometry(i % 2 ? 0.2 : 0.36, 0.025, 0.04), L.mat(0xe0ebff)); t.position.set(-0.3, y, 0); root.add(t); }
    // 플라스크
    const prof = [[0, 0], [1.7, 0], [1.74, 0.08], [1.0, 1.7], [0.52, 2.55], [0.5, 3.5], [0.62, 3.62]].map((p) => new THREE.Vector2(p[0], p[1]));
    const FG = new THREE.Group(); FG.scale.setScalar(1.25); root.add(FG);
    const flask = new THREE.Mesh(new THREE.LatheGeometry(prof, 56), glass(0.2)); flask.position.y = 0.04; FG.add(flask);
    const FY = 1.2; // 액체 높이
    const rAt = (y) => 1.7 - (1.7 - 0.52) * Math.max(0, y - 0.04) / 2.5 + 0.0; // 대략적인 반지름
    const liqPts = [[0, 0.12], [1.62, 0.12], [rAt(FY) * 0.93, FY], [0, FY]].map((p) => new THREE.Vector2(p[0], p[1]));
    const liqM = mats.liquid(0xcfe8ff, { opacity: 0.3 });
    const liq = new THREE.Mesh(new THREE.LatheGeometry(liqPts, 56), liqM); liq.position.y = 0.04; FG.add(liq);
    { const lip = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.05, 10, 40), glass(0.4)); lip.rotation.x = Math.PI / 2; lip.position.y = 3.66; FG.add(lip);   // 플라스크 입구 테두리
      const bl2 = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.03, 8, 32), glass(0.45)); bl2.rotation.x = Math.PI / 2; bl2.position.y = YB0 + 0.5; root.add(bl2); }   // 뷰렛 입구
    
    
    // 방울
    const drops = []; for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(L.SG, mats.liquid(CFG.titrant, { opacity: 0.8 })); m.scale.setScalar(0.1); m.visible = false; root.add(m); drops.push({ m, v: 0, on: false }); }
    // 이온 입자 (플라스크 속)
    const N = 90;
    const mk = (col) => { const m = new THREE.InstancedMesh(L.SG, new THREE.MeshStandardMaterial({ color: col, roughness: 0.35, emissive: col, emissiveIntensity: 0.25 }), N); m.count = 0; m.frustumCulled = false; FG.add(m); return { m, p: [], n: 0 }; };
    const SP = CFG.species.map((s) => Object.assign({}, s, mk(s.col)));
    SP.forEach((s) => { for (let i = 0; i < N; i++) { const y = 0.35 + Math.random() * (FY - 0.5), r = Math.sqrt(Math.random()) * (rAt(y) * 0.8 - 0.1), a = Math.random() * 6.283; s.p.push({ x: Math.cos(a) * r, y, z: Math.sin(a) * r, ph: Math.random() * 6.28, sp: 0.5 + Math.random() }); } });
    const lbl = label('', [-0.3, YB0, 0], { size: 12.5 }); const lblFlask = label('', [0, 3.8, 0], { size: 12.5 });
    const lblSample = label(CFG.flaskLabel, [2.6, 0.5, 0], { size: 12 });
    const dum = new THREE.Object3D();
    let Vt = 0, Vd = 0, show = true, dropAcc = 0, rdStart = 0, own = false, pP = 0, sigT = '', lastKey = '', readyF = 0;
    const PINK = new THREE.Color(0xff3d8b), CLEAR = new THREE.Color(0xcfe8ff);
    function counts(v) {
      const e = CFG.Veq, u = v / e;
      return CFG.species.map((s) => Math.max(0, Math.min(N, Math.round(s.f(u) * 24))));
    }
    function refresh() {
      const v = Vd; const u = v / CFG.Veq;
      const surf = YB0 - (v + rdStart) * PER, h = Math.max(surf - YB1, 1e-3);
      bliq.scale.set(1, h, 1); bliq.position.set(0, YB1 + h / 2, 0);
      lbl.obj = [-0.3, surf, 0]; lbl.off = [-1.1, 0, 0]; lbl.set((v + rdStart).toFixed(2) + ' mL');
      const ex = v - CFG.Veq, pk = ex > 1e-6 ? Math.min(1, 0.35 + 0.65 * ex / 0.5) : 0;   // 2D와 같이 중화점을 넘긴 뒤에만 분홍색 (넘기기 전에는 무색)
      liqM.color.copy(CLEAR).lerp(PINK, pk); liqM.opacity = 0.3 + 0.28 * pk;
      lblFlask.obj = [1.7, 4.3, 0]; lblFlask.off = [0.9, 0, 0];
      const near = Math.abs(v - CFG.Veq) < 0.6;
      lblFlask.set(pk < 0.05 ? '무색' : pk < 0.9 ? '연한 분홍 (종말점!)' : '분홍'); lblFlask.show(true);
      lblFlask.el.style.background = pk > 0.05 ? 'rgba(235,70,130,.88)' : '';
      const c = counts(v); SP.forEach((s, i) => { s.m.count = show ? c[i] : 0; });
      let msg = v < CFG.Veq - 0.6 ? CFG.msgBefore : near ? CFG.msgAt : CFG.msgAfter;
      info('<b>' + CFG.title + '</b> · ' + CFG.titrantLabel + ' · 넣은 부피 <b>' + v.toFixed(2) + ' mL</b> (눈금 ' + (v + rdStart).toFixed(2) + ' mL)<br>' + msg + '<br>' + (pk > 0.05 ? '지시약(페놀프탈레인)이 분홍색으로 변했어요. 색이 변하는 순간이 종말점이에요.' : '지시약(페놀프탈레인)은 아직 무색이에요.'));
    }
    const plT = controls.player({ duration: 12, loop: true, label: 'NaOH 떨어뜨리기', phases: [[0, '적정 시작'], [0.04, 'NaOH를 넣는 중'], [0.85, '처음으로 되돌려요']], onFrame(p) { pP = p; own = p > 0; } });
    const volOwn = (p) => 20 * (p < 0.85 ? Math.min(1, p / 0.85) : 1 - (p - 0.85) / 0.15);
    const ib = controls.button('이온 ✓', () => { show = !show; ib.classList.toggle('on', show); ib.textContent = '이온 ' + (show ? '✓' : '✕'); refresh(); }); ib.classList.add('on');
    // 이온 이름 안내 (info 말미)
    refresh();
    const recEl = mxBox('tr');
    return {
      update(dt, t) {
        dt = Math.min(dt, 0.05);
        const Z = ctx.lesson();
        if (Z) {
          const TT = Z.TT, vE = Z.tVeq();
          if (Math.abs(vE - CFG.Veq) > 1e-6) { CFG.Veq = vE; CFG.pEnd = 0.85 * vE / 20; }
          const key = TT.cfg ? TT.cfg.key + '|' + TT.ready : ''; if (key !== lastKey) { lastKey = key; if (own) { own = false; plT.pause(); plT.set(0); } }
          if (TT.cfg && TT.cfg.flaskLabel) lblSample.set(TT.cfg.flaskLabel);
          if (TT.cfg && TT.cfg.titrantLabel) CFG.titrantLabel = TT.cfg.titrantLabel;
          rdStart = TT.start || 0; readyF = TT.ready ? 1 : 0;
          Vt = own ? volOwn(pP) : Z.tV();
          if (own) Vd = Vt;
          bliq.visible = TT.ready || own; 
          /* 📋 뷰렛 눈금 기록표 + ⏱ 30초 유지 타이머 (2D 화면의 기록표 · 타이머 고리와 같아요) */
          if (Z.S.mode === 'titr') {
            const R = Z.tRuns(), rows = [['대략', R.rough, 'ex']].concat([0, 1, 2].map((i) => ['정밀 ' + (i + 1), R.fine[i], R.fine[i] && (R.fine[i].ok ? 'ok' : 'no')]));
            for (let i = 3; i < R.fine.length && i < 5; i++) rows.push(['정밀 ' + (i + 1), R.fine[i], R.fine[i].ok ? 'ok' : 'no']);
            const m = Z.tMean(), tm = TT.ready && TT.timer > 0 ? Math.min(30, TT.timer) : 0;
            recEl.put((tm > 0 ? '<div class="h ' + (tm >= 30 ? 'ok' : 'on') + '">⏱ 연한 붉은색 유지 ' + Math.round(tm) + ' / 30초' + (tm >= 30 ? ' ✓' : '') + '</div>' : '') +
              '<div class="h">📋 뷰렛 눈금 기록표</div><table><tr><th>회차</th><th>처음</th><th>나중</th><th>사용(mL)</th></tr>' + rows.map((r) => '<tr><td>' + r[0] + '</td>' + (r[1] ? '<td>' + r[1].start.toFixed(2) + '</td><td>' + r[1].end.toFixed(2) + '</td><td class="' + (r[2] === 'ex' ? 'dim' : r[2]) + '">' + r[1].used.toFixed(2) + (r[2] === 'ex' ? '' : r[2] === 'ok' ? ' ✓' : ' ✗') + '</td>' : '<td class="dim">-</td><td class="dim">-</td><td class="dim">-</td>') + '</tr>').join('') +
              '<tr><td>평균</td><td></td><td></td><td class="on">' + (isNaN(m) ? '?' : m.toFixed(2)) + '</td></tr></table>');
          } else recEl.put('');
        }
        const d = Vt - Vd; const step = Math.sign(d) * Math.min(Math.abs(d), Math.max(dt * 7, Math.abs(d) * 0.3));
        if (Math.abs(d) > 1e-4) {
          Vd += step; dropAcc += Math.abs(step) * 2.2; refresh();
          while (dropAcc >= 1 && step > 0) { dropAcc -= 1; const dr = drops.find((q) => !q.on); if (dr) { dr.on = true; dr.m.visible = true; dr.m.position.set(0, 5.2, 0); dr.v = 0; } else dropAcc = 0; }
          if (step < 0) dropAcc = 0;
        }
        drops.forEach((q) => { if (!q.on) return; q.v += 9 * dt; q.m.position.y -= q.v * dt; if (q.m.position.y < FY * 1.25 + 0.15) { q.on = false; q.m.visible = false; } });
        cock.rotation.y = Math.abs(d) > 0.01 ? Math.PI / 2 : 0;
        SP.forEach((s) => {
          for (let i = 0; i < s.m.count; i++) { const p = s.p[i]; dum.position.set(p.x + Math.sin(t * p.sp + p.ph) * 0.16, p.y + Math.cos(t * p.sp * 1.3 + p.ph) * 0.08, p.z + Math.sin(t * p.sp * 0.8 + p.ph * 2) * 0.16); dum.scale.setScalar(s.r); dum.updateMatrix(); s.m.setMatrixAt(i, dum.matrix); }
          s.m.instanceMatrix.needsUpdate = true;
        });
      },
    };
  }

  const phone = window.matchMedia && window.matchMedia('(max-width: 599px)').matches;
  const CFG = {
    title: 'HCl + NaOH', Veq: 15, pEnd: 0.6375, titrantLabel: '0.100 M NaOH', titrant: 0x9ec5ff, flaskLabel: 'HCl 20 mL + 지시약',
    species: [
      { name: 'H⁺', col: 0xff4d4d, r: 0.12, f: (u) => Math.max(0, 1 - u) },
      { name: 'Cl⁻', col: 0x34c759, r: 0.15, f: () => 1 },
      { name: 'Na⁺', col: 0xb07cf5, r: 0.12, f: (u) => u },
      { name: 'OH⁻', col: 0x4d8dff, r: 0.12, f: (u) => Math.max(0, u - 1) },
    ],
    msgBefore: '<span style="color:#ff6b6b">●</span>H⁺가 OH⁻와 만나 물이 되어 점점 줄어요. (Cl⁻, Na⁺는 구경꾼)',
    msgAt: '<b>H⁺와 OH⁻가 딱 맞게 반응했어요.</b> 한 방울이 색을 바꿔요!',
    msgAfter: '넘치게 넣은 <span style="color:#6ba5ff">●</span>OH⁻가 남아 용액이 염기성이 돼요.',
  };
  window.SciSim3D.attach({
    title: '중화 적정 장치 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대 · 뷰렛 조작에 따라 색이 바뀌어요',
    levels: [1],
    camera: { dist: phone ? 24 : 18.5, theta: 0.5, phi: 1.2, min: 6, max: 36, target: [0.5, 5.6, 0] },
    autoRotate: 0.12,
    build(ctx) { return makeTitration(ctx, CFG); },
  });
})();
