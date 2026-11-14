/* m3-gas-volume · 3D 기체 반응과 분자 수
   같은 온도·압력에서 기체의 부피는 분자 수에 비례해요. 그래서 반응하는 기체의 부피비 = 계수비 = 분자 수의 비예요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  /* ---------- 공통: 분자 모형과 반응 도우미 ---------- */
  function ChemKit(THREE) {
    const COL = { H: 0xd5deec, O: 0xef6a6a, C: 0x3f4756, N: 0x4a7bf0, Mg: 0xa3e635, Cu: 0xe08a3c, Cl: 0x7fd16a };
    const RAD = { H: 0.27, O: 0.4, C: 0.4, N: 0.38, Mg: 0.5, Cu: 0.5, Cl: 0.46 };
    const NAME = { H: '수소', O: '산소', C: '탄소', N: '질소', Mg: '마그네슘', Cu: '구리', Cl: '염소' };
    const SP = {
      O: { n: '산소 원자', f: 'O', a: ['O'], p: [[0, 0, 0]], b: [] },
      H2: { n: '수소', f: 'H₂', a: ['H', 'H'], p: [[-0.3, 0, 0], [0.3, 0, 0]], b: [[0, 1, 1]] },
      O2: { n: '산소', f: 'O₂', a: ['O', 'O'], p: [[-0.4, 0, 0], [0.4, 0, 0]], b: [[0, 1, 2]] },
      N2: { n: '질소', f: 'N₂', a: ['N', 'N'], p: [[-0.38, 0, 0], [0.38, 0, 0]], b: [[0, 1, 3]] },
      Cl2: { n: '염소', f: 'Cl₂', a: ['Cl', 'Cl'], p: [[-0.46, 0, 0], [0.46, 0, 0]], b: [[0, 1, 1]] },
      H2O: { n: '물', f: 'H₂O', a: ['O', 'H', 'H'], p: [[0, 0.14, 0], [-0.66, -0.34, 0], [0.66, -0.34, 0]], b: [[0, 1, 1], [0, 2, 1]] },
      H2O2: { n: '과산화 수소', f: 'H₂O₂', a: ['O', 'O', 'H', 'H'], p: [[-0.5, 0, 0], [0.5, 0, 0], [-0.95, 0.55, 0.35], [0.95, -0.55, -0.35]], b: [[0, 1, 1], [0, 2, 1], [1, 3, 1]] },
      CO2: { n: '이산화 탄소', f: 'CO₂', a: ['C', 'O', 'O'], p: [[0, 0, 0], [-1, 0, 0], [1, 0, 0]], b: [[0, 1, 2], [0, 2, 2]] },
      NH3: { n: '암모니아', f: 'NH₃', a: ['N', 'H', 'H', 'H'], p: [[0, 0.3, 0], [-0.72, -0.28, 0.2], [0.72, -0.28, 0.2], [0, -0.28, -0.75]], b: [[0, 1, 1], [0, 2, 1], [0, 3, 1]] },
      CH4: { n: '메테인', f: 'CH₄', a: ['C', 'H', 'H', 'H', 'H'], p: [[0, 0, 0], [0.62, 0.62, 0.62], [0.62, -0.62, -0.62], [-0.62, 0.62, -0.62], [-0.62, -0.62, 0.62]], b: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1]] },
      HCl: { n: '염화 수소', f: 'HCl', a: ['H', 'Cl'], p: [[-0.55, 0, 0], [0.45, 0, 0]], b: [[0, 1, 1]] },
      C: { n: '탄소', f: 'C', a: ['C'], p: [[0, 0, 0]], b: [] },
      Mg: { n: '마그네슘', f: 'Mg', a: ['Mg'], p: [[0, 0, 0]], b: [] },
      Cu: { n: '구리', f: 'Cu', a: ['Cu'], p: [[0, 0, 0]], b: [] },
      MgO: { n: '산화 마그네슘', f: 'MgO', a: ['Mg', 'O'], p: [[-0.42, 0, 0], [0.42, 0, 0]], b: [[0, 1, 1]] },
      CuO: { n: '산화 구리(Ⅱ)', f: 'CuO', a: ['Cu', 'O'], p: [[-0.42, 0, 0], [0.42, 0, 0]], b: [[0, 1, 1]] },
    };
    Object.keys(SP).forEach((k) => { SP[k].p = SP[k].p.map((q) => q.map((v) => v * 1.3)); });
    const smooth = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
    const matCache = {};
    const mat = (el) => matCache[el] || (matCache[el] = new THREE.MeshPhysicalMaterial({ color: COL[el], roughness: 0.28, metalness: el === 'Cu' ? 0.45 : 0.05, clearcoat: 0.7, clearcoatRoughness: 0.2 }));   // 원자 모형: 매끈한 광택
    const sphG = new THREE.SphereGeometry(1, 36, 24), cylG = new THREE.CylinderGeometry(1, 1, 1, 16);
    const bondMat = new THREE.MeshStandardMaterial({ color: 0xcfd8e6, roughness: 0.5, metalness: 0.1 });
    const Y = new THREE.Vector3(0, 1, 0);
    function atomMesh(el, k) { const m = new THREE.Mesh(sphG, mat(el)); m.scale.setScalar(RAD[el] * (k || 1)); return m; }
    function setBond(m, a, b, s) {
      const d = b.clone().sub(a), len = d.length();
      if (len < 1e-4 || s < 0.02) { m.visible = false; return; }
      m.visible = true; m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(Y, d.multiplyScalar(1 / len));
      const r = m.userData.r * s; m.scale.set(r, len, r);
    }
    /* 분자 하나(공-막대)를 그룹으로 */
    function molGroup(sp, k) {
      const S = SP[sp], g = new THREE.Group(), at = [];
      S.a.forEach((el, i) => { const m = atomMesh(el, k); m.position.fromArray(S.p[i]).multiplyScalar(k || 1); g.add(m); at.push(m); });
      S.b.forEach((b) => { const m = new THREE.Mesh(cylG, bondMat); m.userData.r = (0.06 + 0.012 * (b[2] - 1)) * (k || 1); g.add(m); setBond(m, at[b[0]].position, at[b[1]].position, 1); });
      return g;
    }
    function slots(n, cx, sp) {
      const cols = n <= 1 ? 1 : n <= 4 ? 2 : 3, rows = Math.ceil(n / cols), out = [];
      for (let i = 0; i < n; i++) out.push(new THREE.Vector3(cx + ((i % cols) - (cols - 1) / 2) * sp, 0, (Math.floor(i / cols) - (rows - 1) / 2) * sp));
      return out;
    }
    /* 반응 모형: def = { re: [[종, 개수]...], pr: [[종, 개수]...] }, o = { cxR, cxP, sp } */
    function makeRxn(parent, def, o) {
      o = o || {};
      const grp = new THREE.Group(); parent.add(grp);
      const exp = (l) => { const r = []; l.forEach((q) => { for (let i = 0; i < q[1]; i++) r.push(q[0]); }); return r; };
      const RM = exp(def.re), PM = exp(def.pr);
      const spc = o.sp || 1.9, cxR = o.cxR == null ? -3.6 : o.cxR, cxP = o.cxP == null ? 3.6 : o.cxP;
      const sR = slots(RM.length, cxR, spc), sP = slots(PM.length, cxP, spc);
      const atoms = [], bondsR = [], bondsP = [], bondsS = [];
      function place(sp, c, i, side) {
        const S = SP[sp], ang = 0.35 + i * 0.9 + (side ? 1.3 : 0), ca = Math.cos(ang), sa = Math.sin(ang), yaw = 0.5 * Math.sin(i * 1.7 + side);
        const cy = Math.cos(yaw), sy = Math.sin(yaw), idx = [];
        S.a.forEach((el, k) => {
          let [x, y, z] = S.p[k]; const x1 = x * ca - y * sa, y1 = x * sa + y * ca; x = x1 * cy + z * sy; z = -x1 * sy + z * cy; y = y1;
          idx.push(atoms.length); atoms.push({ el, P: new THREE.Vector3(x, y, z).add(c), side, mol: i, sp, k });
        });
        return idx;
      }
      const rIdx = RM.map((sp, i) => place(sp, sR[i], i, 0)), pIdx = PM.map((sp, i) => place(sp, sP[i], i, 1));
      /* 짝 짓기: 같은 분자는 그대로(구경꾼), 나머지는 원소별로 */
      const usedP = new Set(), pairs = [];
      RM.forEach((sp, i) => { const j = PM.findIndex((q, jj) => q === sp && !usedP.has(jj)); if (j >= 0 && def.rigid !== false) { usedP.add(j); pairs.push([i, j]); } });
      const rigidR = new Set(pairs.map((q) => q[0])), rigidP = new Set(pairs.map((q) => q[1]));
      const A = [], mv = [];
      pairs.forEach(([i, j]) => rIdx[i].forEach((a, k) => { atoms[a].to = atoms[pIdx[j][k]].P; atoms[a].rigid = true; atoms[pIdx[j][k]].matched = true; atoms[a].end = pIdx[j][k]; }));
      const freeP = {}, freeR = [];
      PM.forEach((sp, j) => { if (rigidP.has(j)) return; pIdx[j].forEach((a) => (freeP[atoms[a].el] = freeP[atoms[a].el] || []).push(a)); });
      RM.forEach((sp, i) => { if (rigidR.has(i)) return; rIdx[i].forEach((a) => freeR.push(a)); });
      freeR.forEach((a) => { const l = freeP[atoms[a].el]; if (l && l.length) { const e = l.shift(); atoms[a].end = e; atoms[a].to = atoms[e].P; atoms[e].matched = true; } else { atoms[a].lost = true; atoms[a].to = atoms[a].P.clone().add(new THREE.Vector3(0, 1.8, 0)); } });
      /* 반응 후 원자 객체: 반응 전 원자가 움직여 가요. 짝 없는 생성 원자는 따로 */
      const meshes = [];
      atoms.forEach((a, i) => { if (a.side === 1 && a.matched) return; const m = atomMesh(a.el); m.position.copy(a.P); grp.add(m); a.mesh = m; meshes.push(a);
        if (a.side === 1 && !a.matched) { a.made = true; a.from = a.P.clone().add(new THREE.Vector3(0, 1.8, 0)); } });
      function halo(a, col) { const h = new THREE.Mesh(sphG, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.35, depthWrite: false })); h.scale.setScalar(1.55); a.mesh.add(h); a.halo = h; }
      meshes.forEach((a) => { if (a.lost) halo(a, 0xff3b3b); if (a.made) halo(a, 0x22c55e); });
      function mkBond(i1, i2, ord, list) { const m = new THREE.Mesh(cylG, bondMat); m.userData.r = 0.06 + 0.012 * (ord - 1); grp.add(m); list.push({ m, a: i1, b: i2 }); }
      const meshOf = (i) => { const a = atoms[i]; return a.side === 1 && a.matched ? atoms[atoms.findIndex((q) => q.end === i)].mesh : a.mesh; };
      RM.forEach((sp, i) => SP[sp].b.forEach((b) => mkBond(rIdx[i][b[0]], rIdx[i][b[1]], b[2], rigidR.has(i) ? bondsS : bondsR)));
      PM.forEach((sp, j) => { if (!rigidP.has(j)) SP[sp].b.forEach((b) => mkBond(pIdx[j][b[0]], pIdx[j][b[1]], b[2], bondsP)); });
      /* 바닥판과 화살표 */
      const plateMat = new THREE.MeshStandardMaterial({ color: 0xbcd4f5, roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.2, depthWrite: false });
      if (!o.noPlate) [cxR, cxP].forEach((cx, k) => { const n = (k ? sP : sR).length, cols = n <= 1 ? 1 : n <= 4 ? 2 : 3, rows = Math.ceil(n / cols); const p = new THREE.Mesh(new THREE.BoxGeometry(Math.max(3.2, cols * spc + 0.8), 0.12, Math.max(3.2, rows * spc + 0.8)), plateMat); p.position.set(cx, -1.15, 0); grp.add(p); });
      let esc = 0, p = 0;
      const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();
      function set(pp) {
        p = pp;
        meshes.forEach((a, n) => {
          const d = ((n * 7) % 11) * 0.008;
          let t = smooth((p - 0.25 - d) / 0.45), s = 1;
          const from = a.made ? a.from : a.P, to = a.made ? a.P : a.to;
          if (!to) { a.mesh.position.copy(a.P); return; }
          if (a.rigid) t = smooth((p - 0.2) / 0.6);
          a.mesh.position.lerpVectors(from, to, t);
          if (!a.rigid) { a.mesh.position.y += Math.sin(Math.PI * t) * 0.9; a.mesh.position.z += Math.sin(Math.PI * t) * (a.mol % 2 ? 0.7 : -0.7); }
          if (a.lost) { s = 1 - smooth((p - 0.55) / 0.3); }
          if (a.made) { s = smooth((p - 0.45) / 0.3); }
          if (a.halo) a.halo.visible = (a.lost ? p > 0.5 : p > 0.5);
          if (esc > 0 && o.gas && o.gas.indexOf(a.made ? a.sp : a.end != null ? atoms[a.end].sp : '') >= 0) { a.mesh.position.y += esc * 6 * (1 + (a.mol % 3) * 0.12); a.mesh.position.x += esc * 1.5 * Math.sin(a.mol * 2.3); s *= 1 - esc * 0.85; }
          a.mesh.scale.setScalar(Math.max(0.001, RAD[a.el] * s)); a.mesh.visible = s > 0.02;
        });
        const rb = 1 - smooth((p - 0.1) / 0.15), pb = smooth((p - 0.86) / 0.12);
        const upd = (list, sc) => list.forEach((q) => { const am = meshOf(q.a), bm = meshOf(q.b); setBond(q.m, am.position, bm.position, sc * (am.visible && bm.visible ? 1 : 0)); });
        upd(bondsR, rb); upd(bondsS, 1); upd(bondsP, pb);
      }
      /* 원소별 원자 수 */
      function count(list) { const c = {}; list.forEach((sp) => SP[sp].a.forEach((e) => (c[e] = (c[e] || 0) + 1))); return c; }
      function setEsc(v) { esc = v; set(p); }
      set(0);
      return { group: grp, set, setEsc, countR: count(RM), countP: count(PM), RM, PM, dispose() { parent.remove(grp); }, nLost: meshes.filter((a) => a.lost).length, nMade: meshes.filter((a) => a.made).length };
    }
    return { COL, RAD, NAME, SP, smooth, mat, molGroup, makeRxn, atomMesh, setBond, bondMat, sphG, cylG };
  }
  /* 반응 전후 원자 수를 표로 */
  function countHtml(rc, pc) {
    const els = Object.keys(Object.assign({}, rc, pc)); let ok = true;
    const rows = els.map((e) => { const a = rc[e] || 0, b = pc[e] || 0; if (a !== b) ok = false; return '<b>' + e + '</b> ' + a + ' → ' + b + (a === b ? '' : ' ✕'); });
    return { html: rows.join(' · '), ok };
  }
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  /* 2D 차시와 같은 반응 · 같은 부피(mL) : 수증기 · 암모니아 · 염화 수소 */
  const RX = {
    water:   { t: '수증기', A: 'H2', B: 'O2', C: 'H2O', a: 2, b: 1, c: 2, eq: '2H₂ + O₂ → 2H₂O' },
    ammonia: { t: '암모니아', A: 'N2', B: 'H2', C: 'NH3', a: 1, b: 3, c: 2, eq: 'N₂ + 3H₂ → 2NH₃' },
    hcl:     { t: '염화 수소', A: 'H2', B: 'Cl2', C: 'HCl', a: 1, b: 1, c: 2, eq: 'H₂ + Cl₂ → 2HCl' },
  };
  const MLU = 5, HU = 1.15;          // 분자 1개 = 5 mL · 10 mL 한 칸의 높이
  const fmt = (v) => (Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : v.toFixed(1));
  window.SciSim3D.attach({
    host: '.stage-card',
    title: '기체 반응 부피비 3D 모형',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHN ? 17 : 11.5, theta: 0.1, phi: 1.3, min: 6, max: 28, target: [0, 1.7, 0] },
    autoRotate: 0,
    levels: [0, 3],            // 1단계(수증기 생성)·4단계(다른 기체 반응)는 3D. 결과표 줄·부피비 칸을 누르고 원자를 끄는 2·3단계는 2D
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const K = ChemKit(THREE);
      let cyl = [], sig = '', q = 0, cur = null;
      const glass = ctx.mats.glass({ opacity: 0.15 });   // 유리 실린더
      const ringM = ctx.mats.metal('steel', { roughness: 0.24 });   // 받침 · 눈금 고리 · 피스톤 막대
      const pistM = ctx.mats.plastic(0xe8a14b, { roughness: 0.3 });   // 피스톤
      const R = 1.05, HMAX = 4 * HU + 0.3;
      const arrow = new THREE.Group(); const am = new THREE.MeshStandardMaterial({ color: 0xffd34d, roughness: 0.4, emissive: 0x6b4a00, emissiveIntensity: 0.5 });
      const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.9, 16), am); sh.rotation.z = Math.PI / 2;
      const hd = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.5, 20), am); hd.rotation.z = -Math.PI / 2; hd.position.x = 0.65; arrow.add(sh, hd); arrow.position.set(0.7, 1.5, 0); root.add(arrow);
      const labs = [label('', [0, 0, 0]), label('', [0, 0, 0]), label('', [0, 0, 0])];
      const g = new THREE.Group(); root.add(g);
      function clear() { while (g.children.length) g.remove(g.children[0]); cyl = []; }
      function mkCyl(x, sp, n0, used, isProd) {
        const c = { x, sp, n0, used, isProd, mols: [], piston: null };
        const tube = new THREE.Mesh(new THREE.CylinderGeometry(R, R, HMAX, 56, 1, true), glass); tube.position.set(x, HMAX / 2, 0); g.add(tube);
        const lip = new THREE.Mesh(new THREE.TorusGeometry(R, 0.04, 10, 56), glass); lip.rotation.x = Math.PI / 2; lip.position.set(x, HMAX, 0); g.add(lip);   // 실린더 입구 테두리
        const base = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.12, R + 0.12, 0.18, 40), ringM); base.position.set(x, -0.09, 0); g.add(base);
        for (let i = 1; i <= 4; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(R + 0.01, 0.018, 8, 48), ringM); t.rotation.x = Math.PI / 2; t.position.set(x, i * HU, 0); g.add(t); }
        c.piston = new THREE.Group(); const pd = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.03, R - 0.03, 0.14, 40), pistM); const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.3, 20), ringM); rod.position.y = 0.7; c.piston.add(pd, rod); g.add(c.piston);
        for (let i = 0; i < n0; i++) {
          const m = K.molGroup(sp, 0.75); g.add(m);
          const a = Math.random() * 6.28, r = Math.random() * (R - 0.4);
          m.userData = { x: Math.cos(a) * r, z: Math.sin(a) * r, y: 0.3 + Math.random() * HU * 2, vx: (Math.random() - 0.5) * 1.6, vy: (Math.random() - 0.5) * 1.8, vz: (Math.random() - 0.5) * 1.6, w: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(2) };
          c.mols.push(m);
        }
        cyl.push(c); return c;
      }
      /* 지금 2D 실험의 반응과 부피 */
      let lastTxtPh = '';
      function scenario() {
        const S = ctx.lesson() || {}, sc = (S.S && S.S.scene) || 'react';
        let key = 'water', va = 20, vb = 10, hypo = false;
        if (sc === 'react' && S.RS) { key = S.RS.rx; va = S.RS.va; vb = S.RS.vb; }
        else if (sc === 'table' && S.TB) { key = S.TB.rx; const r = RX[key]; va = r.a * 10; vb = r.b * 10; }
        else if (sc === 'model') { hypo = !!(S.MD && S.MD.hypo); va = 20; vb = hypo ? 20 : 10; }
        if (!RX[key]) key = 'water';
        return { sc, key, va, vb, hypo, sig: [sc, key, va, vb, hypo].join('|') };
      }
      function rebuild(c) {
        clear(); cur = c;
        const r = RX[c.key];
        const hy = c.hypo ? { B: 'O', b: 2, c: 2 } : null;
        const a = r.a, b = hy ? hy.b : r.b, cc = hy ? hy.c : r.c;
        const k = Math.min(c.va / a, c.vb / b);
        c.res = { k, usedA: k * a, usedB: k * b, vC: k * cc, leftA: c.va - k * a, leftB: c.vb - k * b };
        const nA = c.va / MLU, nB = c.vb / MLU, nC = c.res.vC / MLU;
        const spB = hy ? 'O' : r.B;
        mkCyl(-4.3, r.A, nA, c.res.usedA / MLU, false); mkCyl(-1.9, spB, nB, c.res.usedB / MLU, false); mkCyl(3.4, r.C, nC, 0, true);
        c.spB = spB;
        text(c);
      }
      /* 3D 화면 오른쪽 위의 작은 판 (휴대폰에서는 오른쪽 아래): 2D 화면의 표 · 기록을 3D에서도 보여 줘요 */
      function v3xPan(cls) { const vEl = ctx.renderer.domElement.parentElement;
        if (!document.getElementById('v3x-css')) { const c = document.createElement('style'); c.id = 'v3x-css'; c.textContent =
          '.v3x-pan{position:absolute;right:10px;top:10px;max-width:52%;padding:6px 9px;border-radius:12px;background:rgba(8,12,24,.76);color:#fff;font-size:12px;line-height:1.35;pointer-events:none;z-index:2}' +
          '.v3x-pan .h{font-weight:800;margin-bottom:3px}.v3x-pan table{border-collapse:collapse}.v3x-pan th,.v3x-pan td{padding:1px 5px;text-align:left;white-space:nowrap}.v3x-pan th{color:#9fb0cc;font-weight:700;font-size:11px}.v3x-pan .q{color:#7d8aa3}.v3x-pan .now td{background:rgba(255,255,255,.1)}' +
          '.v3x-pan .c{display:inline-block;margin:1px 2px;padding:1px 6px;border-radius:8px;background:rgba(255,255,255,.14)}.v3x-pan .ok{color:#86efac}.v3x-pan .bad{color:#fca5a5}' +
          '@media (max-width:599px){.v3x-pan{top:auto;bottom:28px;right:6px;font-size:10.5px;max-width:64%;padding:4px 6px}.v3x-pan th{font-size:9.5px}.v3x-pan th,.v3x-pan td{padding:0 3px}}';
          document.head.appendChild(c); }
        const el = document.createElement('div'); el.className = 'v3x-pan' + (cls ? ' ' + cls : ''); el.style.display = 'none'; vEl.appendChild(el);
        let sig = null; return { set(h) { if (h === sig) return; sig = h; el.style.display = h ? '' : 'none'; if (h) el.innerHTML = h; }, el }; }
      /* 📋 실험 결과표: 2D 오른쪽 결과표처럼 반응시킨 결과가 쌓여요 */
      const tbl = v3xPan();
      function drawTbl(c) {
        const L = L0(), RS = L.RS, R = L.REAC && RS ? L.REAC[RS.rx] : null;
        if (c.sc !== 'react' || !R) { tbl.set(''); return; }
        const H = RS.hist[RS.rx] || [], f = (v) => (Math.round(v * 10) / 10) + '';
        tbl.set('<div class="h">📋 실험 결과표 (mL)</div><table><tr><th>' + R.A.n + '</th><th>' + R.B.n + '</th><th>남은 기체</th><th>' + R.C.n + '</th></tr>' +
          (H.length ? H.map((e) => { const l = e.r.left; return '<tr><td>' + e.va + '</td><td>' + e.vb + '</td><td>' + (l ? '<span class="bad">' + (l.who === 'A' ? R.A.n : R.B.n) + ' ' + f(l.v) + '</span>' : '<span class="ok">없음</span>') + '</td><td>' + f(e.r.vC) + '</td></tr>'; }).join('') : '<tr><td colspan="4" class="q">반응시키면 결과가 쌓여요</td></tr>') + '</table>');
      }
      function text(c) {
        const r = RX[c.key], R2 = c.res, nm = (sp) => K.SP[sp].n;
        const left = R2.leftA > 1e-9 ? nm(r.A) + ' ' + fmt(R2.leftA) + ' mL' : R2.leftB > 1e-9 ? nm(c.spB) + ' ' + fmt(R2.leftB) + ' mL' : '';
        let h = '<b>' + r.eq + '</b><br>' + nm(r.A) + ' ' + c.va + ' mL + ' + nm(c.spB === 'O' ? 'O' : r.B) + ' ' + c.vb + ' mL → ' + nm(r.C) + ' ' + fmt(R2.vC) + ' mL<br>';
        if (c.hypo) h += '<span style="color:#fca5a5">산소가 O 1개짜리라면 부피비가 1 : 1 : 1이 돼서, 실험에서 얻은 2 : 1 : 2와 맞지 않아요.</span>';
        else if (c.sc === 'react' && L0().RS && L0().RS.phase !== 'done') h += '<span style="color:#9fb0d4">▶ 반응시키기를 누르면 무엇이 얼마나 남는지 보여요.</span>';
        else h += '반응한 부피비 <b>' + [r.a, r.b, r.c].join(' : ') + '</b> = 분자 수의 비 (같은 온도·압력)<br>' + (left ? '<span style="color:#fcd34d">반응 후 남는 기체: ' + left + '</span>' : '<span style="color:#86efac">남는 기체 없이 모두 반응했어요.</span>');
        info(h);
      }
      const vis = (c, o) => (o.isProd ? Math.round(o.n0 * q) : Math.round(o.n0 - o.used * q));
      /* ▶ 반응시키기: 2D의 ⚡ 반응시키기와 같아요. 반응이 끝난 뒤에는 진행 막대로 다시 볼 수 있어요 */
      let ign = false, prevPlay = false;
      const L0 = () => ctx.lesson() || {};
      const pl = controls.player({
        duration: 3.2, loop: false, label: '반응시키기',
        phases: [[0, '반응 전'], [0.38, '전기 불꽃'], [0.62, '반응하는 중'], [0.95, '반응 후']],
        onFrame(p) { if (ign) return; const RS = L0().RS; if (RS && RS.phase === 'run') return; q = Math.max(0, Math.min(1, (p - 0.62) / 0.33)); },
      });
      /* 반응 고르기 (2D 위쪽 단추와 같아요) */
      const ctlHost = labs[0].el.closest('.v3-wrap').querySelector('.v3-ctl'), n0 = ctlHost.children.length;
      const segRx = controls.segment('반응', Object.keys(RX).map((k) => ({ value: k, label: RX[k].t })), 'water', (k) => { const L = L0(); if (L.rsSelect) { L.rsSelect(k); if (L.refreshUI) L.refreshUI(); } });
      const segEls = Array.from(ctlHost.children).slice(n0);
      let lastPh = '';
      return {
        update(dt, t) {
          const c = scenario(), L = L0(), RS = L.RS;
          if (c.sig !== sig) { sig = c.sig; rebuild(c); }
          { const ph = RS ? RS.phase + (RS.hist[RS.rx] || []).length : ''; if (ph !== lastTxtPh) { lastTxtPh = ph; if (cur) text(cur); } }
          drawTbl(c);
          const showSeg = c.sc === 'react' && RS && !RS.rxLocked; segEls.forEach((e) => { e.style.display = showSeg ? '' : 'none'; }); if (showSeg) segRx.set(RS.rx);
          if (c.sc === 'react' && RS) {
            if (pl.playing && !prevPlay && RS.phase !== 'run' && L.rsGo) { if (RS.phase === 'done') L.rsGo(); L.rsGo(); }   // ▶ = ⚡ 반응시키기 (끝난 뒤 누르면 다시 반응시켜요)
            prevPlay = pl.playing;
            if (RS.phase === 'run') { q = Math.max(0, Math.min(1, (RS.pt - 2.0) / 1.2)); if (!pl.playing) { pl.play(); prevPlay = true; } ign = true; pl.set(Math.min(1, RS.pt / 3.2)); ign = false; }
            else if (RS.phase === 'idle') { q = 0; if (pl.playing) { pl.pause(); prevPlay = false; } if (pl.p > 0) { ign = true; pl.set(0); ign = false; } }
            else if (RS.phase === 'done' && lastPh === 'run') { q = 1; pl.pause(); prevPlay = false; ign = true; pl.set(1); ign = false; }
            lastPh = RS.phase;
          }
          cyl.forEach((o, ci) => {
            const n = vis(cur, o), h = Math.max(0.2, n * MLU / 10 * HU);
            o.piston.position.set(o.x, h + 0.07, 0); o.piston.visible = n > 0;
            o.mols.forEach((m, i) => {
              const u = m.userData; m.visible = i < n; if (i >= n) return;
              u.x += u.vx * dt; u.y += u.vy * dt; u.z += u.vz * dt;
              const lim = R - 0.5; const rr = Math.hypot(u.x, u.z);
              if (rr > lim) { const nx = u.x / rr, nz = u.z / rr, dot = u.vx * nx + u.vz * nz; if (dot > 0) { u.vx -= 2 * dot * nx; u.vz -= 2 * dot * nz; } u.x = nx * lim; u.z = nz * lim; }
              if (u.y < 0.3) { u.y = 0.3; u.vy = Math.abs(u.vy); } if (u.y > h - 0.3) { u.y = Math.max(0.3, h - 0.3); u.vy = -Math.abs(u.vy); }
              m.position.set(o.x + u.x, u.y, u.z); m.rotation.x += u.w.x * dt; m.rotation.y += u.w.y * dt; m.rotation.z += u.w.z * dt;
            });
            const L = labs[ci]; L.obj = [o.x, -0.45, 0.5]; L.set(K.SP[o.sp].n + ' ' + K.SP[o.sp].f + ' · <b>' + fmt(n * MLU) + ' mL</b>'); L.show(true);
          });
          for (let i = cyl.length; i < 3; i++) labs[i].show(false);
        },
      };
    },
  });
})();
