/* hc-vinegar-titration · 3D 식초 적정 장치
   묽힌 식초(CH₃COOH)를 NaOH로 적정해요. 약산이라 분자 상태가 많다가, NaOH가 들어올수록 CH₃COO⁻로 바뀌어요. */
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

    /* ---- 중화 적정 장치 (뷰렛 · 삼각 플라스크 · 이온 입자) ---- */
  function makeTitration(ctx, CFG) {
    const { THREE, root, label, info, controls } = ctx;
    const L = makeLib(THREE), V3 = L.V;
    const YB0 = 12.7, YB1 = 4.7, PER = (YB0 - YB1) / 50; // 뷰렛 0 mL 눈금 높이, 아래 끝, mL당 높이
    const glass = (op) => new THREE.MeshStandardMaterial({ color: 0xe7f1ff, transparent: true, opacity: op, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false });
    // 받침대
    const base = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.3, 3.2), new THREE.MeshStandardMaterial({ color: 0x39455f, roughness: 0.6, metalness: 0.4 })); base.position.set(0.6, -0.15, 0); root.add(base);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 13.6, 16), new THREE.MeshStandardMaterial({ color: 0xaeb8cc, roughness: 0.3, metalness: 0.8 })); rod.position.set(2.8, 6.65, 0); root.add(rod);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.5, 12), rod.material); arm.rotation.z = Math.PI / 2; arm.position.set(1.55, 11.2, 0); root.add(arm);
    const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.6), new THREE.MeshStandardMaterial({ color: 0xf0524f, roughness: 0.5 })); clamp.position.set(0.3, 11.2, 0); root.add(clamp);
    // 뷰렛
    const bur = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, YB0 + 0.5 - YB1, 32, 1, true), glass(0.2)); bur.position.set(0, (YB0 + 0.5 + YB1) / 2, 0); root.add(bur);
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.2, 0.55, 16, 1, true), glass(0.35)); tip.position.set(0, 4.35, 0); root.add(tip);
    const cockM = new THREE.MeshStandardMaterial({ color: 0x4f7cff, roughness: 0.4 });
    const cock = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.9, 14), cockM); cock.rotation.z = Math.PI / 2; cock.position.set(0, 4.85, 0); root.add(cock);
    const bl = new THREE.MeshStandardMaterial({ color: CFG.titrant, transparent: true, opacity: 0.55, roughness: 0.15, depthWrite: false });
    const bliq = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 1, 24), bl); root.add(bliq);
    for (let i = 0; i <= 10; i++) { const y = YB0 - i * 5 * PER; const t = new THREE.Mesh(new THREE.BoxGeometry(i % 2 ? 0.2 : 0.36, 0.025, 0.04), L.mat(0xe0ebff)); t.position.set(-0.3, y, 0); root.add(t); }
    // 플라스크
    const prof = [[0, 0], [1.7, 0], [1.74, 0.08], [1.0, 1.7], [0.52, 2.55], [0.5, 3.5], [0.62, 3.62]].map((p) => new THREE.Vector2(p[0], p[1]));
    const flask = new THREE.Mesh(new THREE.LatheGeometry(prof, 56), glass(0.2)); flask.position.y = 0.04; root.add(flask);
    const FY = 1.2; // 액체 높이
    const rAt = (y) => 1.7 - (1.7 - 0.52) * Math.max(0, y - 0.04) / 2.5 + 0.0; // 대략적인 반지름
    const liqPts = [[0, 0.12], [1.62, 0.12], [rAt(FY) * 0.93, FY], [0, FY]].map((p) => new THREE.Vector2(p[0], p[1]));
    const liqM = new THREE.MeshStandardMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.3, roughness: 0.12, depthWrite: false });
    const liq = new THREE.Mesh(new THREE.LatheGeometry(liqPts, 56), liqM); liq.position.y = 0.04; root.add(liq);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.1, 48), new THREE.MeshStandardMaterial({ color: 0x0f182c, roughness: 0.95 })); pad.position.set(0, -0.02, 0); pad.visible = false;
    const stirBase = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 0.22, 48), new THREE.MeshStandardMaterial({ color: 0x4a5876, roughness: 0.5, metalness: 0.3 })); stirBase.position.set(0, -0.0, 0); stirBase.scale.y = 0.0001; root.add(stirBase);
    // 방울
    const drops = []; for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(L.SG, new THREE.MeshStandardMaterial({ color: CFG.titrant, transparent: true, opacity: 0.8, roughness: 0.1 })); m.scale.setScalar(0.1); m.visible = false; root.add(m); drops.push({ m, v: 0, on: false }); }
    // 이온 입자 (플라스크 속)
    const N = 90;
    const mk = (col) => { const m = new THREE.InstancedMesh(L.SG, new THREE.MeshStandardMaterial({ color: col, roughness: 0.35, emissive: col, emissiveIntensity: 0.25 }), N); m.count = 0; m.frustumCulled = false; root.add(m); return { m, p: [], n: 0 }; };
    const SP = CFG.species.map((s) => Object.assign({}, s, mk(s.col)));
    SP.forEach((s) => { for (let i = 0; i < N; i++) { const y = 0.35 + Math.random() * (FY - 0.5), r = Math.sqrt(Math.random()) * (rAt(y) * 0.8 - 0.1), a = Math.random() * 6.283; s.p.push({ x: Math.cos(a) * r, y, z: Math.sin(a) * r, ph: Math.random() * 6.28, sp: 0.5 + Math.random() }); } });
    const lbl = label('', [-0.3, YB0, 0], { size: 12.5 }); const lblFlask = label('', [0, 3.8, 0], { size: 12.5 });
    const lblSample = label(CFG.flaskLabel, [1.4, 0.6, 0], { size: 12 });
    const dum = new THREE.Object3D();
    let Vt = 0, Vd = 0, show = true, dropAcc = 0;
    const PINK = new THREE.Color(0xff3d8b), CLEAR = new THREE.Color(0xcfe8ff);
    function counts(v) {
      const e = CFG.Veq, u = v / e;
      return CFG.species.map((s) => Math.max(0, Math.min(N, Math.round(s.f(u) * 24))));
    }
    function refresh() {
      const v = Vd; const u = v / CFG.Veq;
      const surf = YB0 - v * PER, h = Math.max(surf - YB1, 1e-3);
      bliq.scale.set(1, h, 1); bliq.position.set(0, YB1 + h / 2, 0);
      lbl.obj = [-0.3, surf, 0]; lbl.off = [-1.1, 0, 0]; lbl.set(v.toFixed(1) + ' mL');
      const pk = Math.max(0, Math.min(1, (v - CFG.Veq + 0.15) / 0.7));
      liqM.color.copy(CLEAR).lerp(PINK, pk); liqM.opacity = 0.3 + 0.28 * pk;
      lblFlask.obj = [0, 3.8, 0]; lblFlask.off = [1.6, 0, 0];
      const near = Math.abs(v - CFG.Veq) < 0.6;
      lblFlask.set(pk < 0.05 ? '무색' : pk < 0.9 ? '연한 분홍 (종말점!)' : '분홍'); lblFlask.show(true);
      lblFlask.el.style.background = pk > 0.05 ? 'rgba(235,70,130,.88)' : '';
      const c = counts(v); SP.forEach((s, i) => { s.m.count = show ? c[i] : 0; });
      let msg = v < CFG.Veq - 0.6 ? CFG.msgBefore : near ? CFG.msgAt : CFG.msgAfter;
      info('<b>' + CFG.title + '</b> · 넣은 NaOH <b>' + v.toFixed(1) + ' mL</b><br>' + msg + '<br>' + (v >= CFG.Veq - 0.3 ? '종말점의 부피 ≈ <b>' + CFG.Veq + ' mL</b>' : '지시약(페놀프탈레인)은 아직 무색이에요.'));
    }
    const rg = controls.range('NaOH', 0, 30, 0.5, 0, (v) => { Vt = +v; }, (v) => v.toFixed(1) + ' mL');
    controls.button('▼ 종말점까지', () => { Vt = CFG.Veq; rg.set(CFG.Veq); });
    controls.button('↺ 처음', () => { Vt = 0; Vd = 0; rg.set(0); refresh(); });
    const ib = controls.button('이온 ✓', () => { show = !show; ib.classList.toggle('on', show); ib.textContent = '이온 ' + (show ? '✓' : '✕'); refresh(); }); ib.classList.add('on');
    // 이온 이름 안내 (info 말미)
    refresh();
    return {
      update(dt, t) {
        dt = Math.min(dt, 0.05);
        const d = Vt - Vd; const step = Math.sign(d) * Math.min(Math.abs(d), dt * 7);
        if (Math.abs(d) > 1e-4) {
          Vd += step; dropAcc += Math.abs(step) * 2.2; refresh();
          while (dropAcc >= 1 && step > 0) { dropAcc -= 1; const dr = drops.find((q) => !q.on); if (dr) { dr.on = true; dr.m.visible = true; dr.m.position.set(0, 4.05, 0); dr.v = 0; } else dropAcc = 0; }
          if (step < 0) dropAcc = 0;
        }
        drops.forEach((q) => { if (!q.on) return; q.v += 9 * dt; q.m.position.y -= q.v * dt; if (q.m.position.y < FY + 0.1) { q.on = false; q.m.visible = false; } });
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
    title: 'CH₃COOH + NaOH', Veq: 15, titrant: 0x9ec5ff, flaskLabel: '묽힌 식초 20 mL + 지시약',
    species: [
      { name: 'CH₃COOH', col: 0xffa94d, r: 0.12, f: (u) => Math.max(0, 1 - u) },
      { name: 'CH₃COO⁻', col: 0x34c759, r: 0.11, f: (u) => Math.min(1, u) },
      { name: 'Na⁺', col: 0xb07cf5, r: 0.085, f: (u) => u },
      { name: 'OH⁻', col: 0x4d8dff, r: 0.085, f: (u) => Math.max(0, u - 1) },
    ],
    msgBefore: '<span style="color:#ffa94d">●</span>CH₃COOH 분자가 OH⁻와 반응해 <span style="color:#34c759">●</span>CH₃COO⁻로 바뀌어요.',
    msgAt: '<b>식초 속 아세트산이 모두 반응했어요.</b> 분홍색이 처음 나타나요!',
    msgAfter: '넘치게 넣은 <span style="color:#6ba5ff">●</span>OH⁻가 남아 분홍색이 짙어져요.',
  };
  window.SciSim3D.attach({
    title: '식초 적정 장치 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: phone ? 22 : 17, theta: 0.5, phi: 1.3, min: 6, max: 34, target: [0.4, 6.4, 0] },
    autoRotate: 0.12,
    build(ctx) { return makeTitration(ctx, CFG); },
  });
})();
