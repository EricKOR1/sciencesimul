/* m3-chemical-equation · 3D 반응 모형
   반응 전후에 원자의 종류와 개수는 그대로예요. 원자가 다시 짝지어질 뿐이에요. 계수를 맞추지 않으면 원자가 사라지거나 생겨요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  /* ---------- 공통: 분자 모형과 반응 도우미 ---------- */
  function ChemKit(THREE) {
    const COL = { H: 0xf1f5f9, O: 0xef4444, C: 0x3f4756, N: 0x3b82f6, Mg: 0xa3e635, Cu: 0xe08a3c, Cl: 0x14b8a6 };
    const RAD = { H: 0.27, O: 0.4, C: 0.4, N: 0.38, Mg: 0.5, Cu: 0.5, Cl: 0.46 };
    const NAME = { H: '수소', O: '산소', C: '탄소', N: '질소', Mg: '마그네슘', Cu: '구리', Cl: '염소' };
    const SP = {
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
    const mat = (el) => matCache[el] || (matCache[el] = new THREE.MeshPhysicalMaterial({ color: COL[el], roughness: 0.28, metalness: el === "Cu" ? 0.45 : 0.05, clearcoat: 0.7, clearcoatRoughness: 0.2 }));
    const sphG = new THREE.SphereGeometry(1, 36, 24), cylG = new THREE.CylinderGeometry(1, 1, 1, 16);
    const bondMat = new THREE.MeshPhysicalMaterial({ color: 0xcfd8e6, roughness: 0.3, metalness: 0.1, clearcoat: 0.6, clearcoatRoughness: 0.2 });
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
      /* 반응 접시: 금속 받침 + 유리 윗면 + 빛나는 테두리 */
      const trayBase = new THREE.MeshStandardMaterial({ color: 0x5a6578, roughness: 0.3, metalness: 1, envMapIntensity: 1.35 });   // 받침: 반짝이는 금속
      const trayTop = [new THREE.MeshPhysicalMaterial({ color: 0x1d4f7a, roughness: 0.1, metalness: 0.1, emissive: 0x0b3b66, emissiveIntensity: 0.45, transparent: true, opacity: 0.88, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.6 }),   // 윗면: 매끈한 유리판
        new THREE.MeshPhysicalMaterial({ color: 0x1e6b45, roughness: 0.1, metalness: 0.1, emissive: 0x0b4d2a, emissiveIntensity: 0.45, transparent: true, opacity: 0.88, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.6 })];
      const edgeCol = [0x38bdf8, 0x4ade80];
      if (!o.noPlate) [cxR, cxP].forEach((cx, k) => {
        const n = (k ? sP : sR).length, cols = n <= 1 ? 1 : n <= 4 ? 2 : 3, rows = Math.ceil(n / cols);
        const W = Math.max(3.2, cols * spc + 0.8), D = Math.max(3.2, rows * spc + 0.8), tg = new THREE.Group(); tg.position.set(cx, -1.15, 0);
        const base = new THREE.Mesh(new THREE.BoxGeometry(W + 0.3, 0.22, D + 0.3), trayBase); base.position.y = -0.1; tg.add(base);
        const top = new THREE.Mesh(new THREE.BoxGeometry(W, 0.06, D), trayTop[k]); top.position.y = 0.04; tg.add(top);
        const ed = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(W, 0.06, D)), new THREE.LineBasicMaterial({ color: edgeCol[k] })); ed.position.y = 0.04; tg.add(ed);
        for (let i = -1; i <= 1; i += 2) for (let j = -1; j <= 1; j += 2) { const ft = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.16, 24), trayBase); ft.position.set(i * W / 2, -0.28, j * D / 2); tg.add(ft); }
        grp.add(tg);
      });
      /* 반응 후 모습 미리보기(투명한 분자): 반응이 진행되면 흐려져요 */
      const ghostMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, transparent: true, opacity: 0.3, depthWrite: false });
      const ghostB = new THREE.MeshStandardMaterial({ color: 0xcfd8e6, roughness: 0.5, transparent: true, opacity: 0.3, depthWrite: false });
      const ghostMats = [];
      atoms.forEach((a) => { if (a.side !== 1) return; const gm = ghostMat.clone(); gm.color.setHex(COL[a.el]); ghostMats.push(gm); const m = new THREE.Mesh(sphG, gm); m.position.copy(a.P); m.scale.setScalar(RAD[a.el]); grp.add(m); });
      PM.forEach((sp, j) => SP[sp].b.forEach((b) => { const gb = ghostB.clone(); ghostMats.push(gb); const m = new THREE.Mesh(cylG, gb); m.userData.r = 0.06 + 0.012 * (b[2] - 1); grp.add(m); setBond(m, atoms[pIdx[j][b[0]]].P, atoms[pIdx[j][b[1]]].P, 1); }));
      let esc = 0, p = 0;
      const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();
      function set(pp) {
        p = pp;
        const gop = 0.3 * (1 - smooth((p - 0.55) / 0.35)); ghostMats.forEach((g) => { g.opacity = gop; g.visible = gop > 0.01; });
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
    /* 실험실 바닥 + 떠다니는 먼지 (장면이 비어 보이지 않게) */
    function stage(root) {
      const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d');
      const g = x.createRadialGradient(256, 256, 20, 256, 256, 256); g.addColorStop(0, '#2b3d5c'); g.addColorStop(0.6, '#182338'); g.addColorStop(1, '#0b1220'); x.fillStyle = g; x.fillRect(0, 0, 512, 512);
      x.strokeStyle = 'rgba(120,170,255,.16)'; x.lineWidth = 1; for (let r = 40; r < 256; r += 36) { x.beginPath(); x.arc(256, 256, r, 0, 7); x.stroke(); }
      for (let a = 0; a < 24; a++) { x.beginPath(); x.moveTo(256, 256); x.lineTo(256 + Math.cos(a / 24 * 6.283) * 256, 256 + Math.sin(a / 24 * 6.283) * 256); x.stroke(); }
      const t = new THREE.CanvasTexture(c);
      const fl = new THREE.Mesh(new THREE.CircleGeometry(15, 64), new THREE.MeshStandardMaterial({ map: t, roughness: 0.6, metalness: 0.3 })); fl.rotation.x = -Math.PI / 2; fl.position.y = -1.62; fl.receiveShadow = true; root.add(fl);
      const N = 90, pos = new Float32Array(N * 3); for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 20; pos[i * 3 + 1] = -1.4 + Math.random() * 7; pos[i * 3 + 2] = (Math.random() - 0.5) * 12; }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x9fc4ff, size: 0.06, transparent: true, opacity: 0.45, depthWrite: false })); pts.userData.v3bg = true; root.add(pts);
      return { update(t) { pts.rotation.y = t * 0.02; pts.position.y = Math.sin(t * 0.3) * 0.1; } };
    }
    return { stage, COL, RAD, NAME, SP, smooth, mat, molGroup, makeRxn, atomMesh, setBond, bondMat, sphG, cylG };
  }
  /* 반응 전후 원자 수를 표로 */
  function countHtml(rc, pc) {
    const els = Object.keys(Object.assign({}, rc, pc)); let ok = true;
    const rows = els.map((e) => { const a = rc[e] || 0, b = pc[e] || 0; if (a !== b) ok = false; return '<b>' + e + '</b> ' + a + ' → ' + b + (a === b ? '' : ' ✕'); });
    return { html: rows.join(' · '), ok };
  }
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  /* 2D 차시의 반응: 단계 0 수소+산소→물 · 단계 1 저울(계수 조절) · 단계 2 탄소 연소/물 분해/암모니아 생성 · 단계 3 계수의 비(수소 6개 + 산소) · 메테인 연소 */
  const RXW = [
    { k: 'c', t: '탄소 연소', re: ['C', 'O2'], pr: ['CO2'], w: '탄소 + 산소 → 이산화 탄소' },
    { k: 'w', t: '물 분해', re: ['H2O'], pr: ['H2', 'O2'], w: '물 → 수소 + 산소' },
    { k: 'n', t: '암모니아 생성', re: ['N2', 'H2'], pr: ['NH3'], w: '질소 + 수소 → 암모니아' },
  ];
  window.SciSim3D.attach({
    host: '.stage-card',
    title: '화학 반응식 3D 모형',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHN ? 19.5 : 11.5, theta: 0.12, phi: 1.1, min: 5, max: 30, target: [0, 0.2, 0] },
    autoRotate: 0,
    levels: [1, 3],            // 2단계(원자 수 맞추기)·4단계(계수의 비)는 3D. 점화·낱말 카드·반응식 계수 칸은 2D
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const K = ChemKit(THREE), stg = K.stage(root), SPN = K.SP;
      let rx = null, sig = '', ch4 = false, qd = 0, lastSt = '';
      label('반응 전', [-3.1, -1.1, 2.2], { color: 'rgba(14,165,233,.9)' }); label('반응 후', [3.1, -1.1, 2.2], { color: 'rgba(34,197,94,.9)' });
      const arrow = new THREE.Group();
      const am = new THREE.MeshStandardMaterial({ color: 0xffd34d, roughness: 0.4, emissive: 0x6b4a00, emissiveIntensity: 0.5 });
      const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.4, 16), am); sh.rotation.z = Math.PI / 2;
      const hd = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.6, 20), am); hd.rotation.z = -Math.PI / 2; hd.position.x = 0.95;
      /* ⚖️ 원자 수 저울(2단계): 2D 저울처럼 원자 수가 다르면 두 판이 기울고, 같으면 수평이 돼요 */
      const balG = new THREE.Group(); root.add(balG);
      const fulM = ctx.mats.metal('steel', { brushed: true, roughness: 0.22 });   // 저울: 결 있는 금속
      const ful = new THREE.Group(); const fc = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.6, 4), fulM); fc.position.y = -0.85; ful.add(fc);
      const beam = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.12, 0.3), fulM); beam.position.y = -0.05; balG.add(beam); root.add(ful); ful.visible = beam.visible = false;
      const balLab = label('', [0, 1.6, 0], { size: 13 }); balLab.show(false);
      arrow.add(sh, hd); balG.add(arrow);
      /* 조작 줄: 단계에 맞는 것만 보여 줘요 */
      const host = controls.text('').parentNode;
      const grab = (fn) => { const n0 = host.children.length; fn(); return Array.from(host.children).slice(n0); };
      let segWi;
      const elW = grab(() => { segWi = controls.segment('반응', RXW.map((r, i) => ({ value: i, label: r.t })), 0, (i) => {
        const b = document.querySelector('#eqSeg button[data-eq="' + i + '"]'); if (b) b.click(); }); });
      const elM = grab(() => { controls.segment('보기', [{ value: 0, label: '수소 + 산소' }, { value: 1, label: '메테인 연소' }], 0, (v) => { ch4 = !!v; }); });
      const pl = controls.player({
        duration: 6, loop: true, label: '반응 재생',
        phases: [[0, '반응 전'], [0.08, '결합이 끊어져요'], [0.29, '원자가 다시 짝지어요'], [0.67, '새 분자가 만들어져요'], [0.9, '반응 후']],
        onFrame(p) { qd = Math.max(0, Math.min(1, (p - 0.08) / 0.82)); if (rx) rx.set(qd); },
      });
      const termTxt = (l, c) => l.map((sp, i) => (c[i] > 0 ? (c[i] > 1 ? c[i] : '') + SPN[sp].f : '')).filter(Boolean).join(' + ');
      const wordTxt = (l) => l.map((sp) => SPN[sp].n).join(' + ');
      function view() {
        const S = ctx.lesson() || {}, SCN = ['react', 'balance', 'write', 'ratio'], si = S.S ? SCN.indexOf(S.S.scene) : -1, L = si >= 0 ? si : ctx.level;   // 2D 장면(scene)이 곧 단계예요
        let re, pr, cr, cp, note = '';
        if (L === 0) { re = ['H2', 'O2']; pr = ['H2O']; cr = [2, 1]; cp = [2]; note = '수소 분자(H₂)·산소 분자(O₂)의 결합이 끊어지고 원자가 다시 짝지어 물 분자(H₂O)가 돼요.'; }
        else if (L === 1) { const n = (S.BL && S.BL.n) || [2, 1, 2]; re = ['H2', 'O2']; pr = ['H2O']; cr = [n[0], n[1]]; cp = [n[2]]; }
        else if (L === 2) { const ei = (S.WRI && S.WRI.cur) || 0, c = (S.WS && S.WS[ei] && S.WS[ei].coef) || [1, 1, 1], R = RXW[ei]; re = R.re; pr = R.pr; cr = c.slice(0, re.length); cp = c.slice(re.length); }
        else if (ch4) { re = ['CH4', 'O2']; pr = ['CO2', 'H2O']; cr = [1, 2]; cp = [1, 2]; note = '계수의 비 CH₄ : O₂ : CO₂ : H₂O = 1 : 2 : 1 : 2'; }
        else {
          const o = (S.RT && S.RT.o2) != null ? S.RT.o2 : 1, w = Math.min(3, o) * 2, hl = 6 - w, ol = o - w / 2;
          re = ['H2', 'O2']; cr = [6, o]; pr = ['H2O', 'H2', 'O2']; cp = [w, hl, ol];
          note = !hl && !ol ? '남는 분자 없이 모두 반응했어요.' : '물 ' + w + '개가 생기고 ' + [hl ? '수소 ' + hl + '개' : '', ol ? '산소 ' + ol + '개' : ''].filter(Boolean).join(', ') + ' 남아요.';
        }
        const word = wordTxt(re) + ' → ' + wordTxt(pr.filter((x, i) => !(L === 3 && !ch4 && i > 0)));
        return { L, re, pr, cr, cp, note, word, ei: (S.WRI && S.WRI.cur) || 0 };
      }
      function rebuild(v) {
        if (rx) rx.dispose();
        const def = { re: v.re.map((s, i) => [s, v.cr[i]]).filter((q) => q[1] > 0), pr: v.pr.map((s, i) => [s, v.cp[i]]).filter((q) => q[1] > 0) };
        const n = Math.max(def.re.reduce((a, q) => a + q[1], 0), def.pr.reduce((a, q) => a + q[1], 0));
        rx = K.makeRxn(balG, def, { cxR: -3.1, cxP: 3.1, sp: n > 6 ? 1.3 : 1.7 });
        rx.set(qd);
        const c = countHtml(rx.countR, rx.countP);
        const msg = v.note ? '<span style="color:#86efac">' + v.note + '</span>'
          : c.ok ? '<span style="color:#86efac">반응 전후 원자 수가 같아요.</span>' : '<span style="color:#fca5a5">원자가 사라지거나(빨강) 생겨요(초록). 계수를 맞춰야 해요.</span>';
        info('<b>' + termTxt(v.re, v.cr) + ' → ' + termTxt(v.pr, v.cp) + '</b><br><span style="opacity:.85">' + v.word + '</span><br>반응 전 → 반응 후 원자 수 ' + c.html + '<br>' + msg);
      }
      const show = (els, on) => els.forEach((e) => { e.style.display = on ? '' : 'none'; });
      return {
        update(dt, t) {
          const v = view(), s = v.L + '|' + v.re + '|' + v.pr + '|' + v.cr + '|' + v.cp + '|' + ch4;
          if (v.L === 2) segWi.set(v.ei);
          if (s !== sig) { sig = s; show(elW, v.L === 2); show(elM, v.L === 3); rebuild(v); }
          const st = ((ctx.lesson() || {}).RT || {}).st || '';   // ⚡ 반응 시작을 누르면 3D 반응도 처음부터 재생해요
          if (st !== lastSt) { if (st === 'run' && v.L === 3 && !ch4) { pl.set(0); pl.play(); } lastSt = st; }
          { const BL = v.L === 1 ? (ctx.lesson() || {}).BL : null, th = BL && BL.beam ? BL.beam.value || 0 : 0;
            balG.rotation.z = Math.max(-0.3, Math.min(0.3, -th * 3));   // 3D에서 잘 보이게 2D 각도의 3배로 기울여요 ful.visible = beam.visible = !!BL;
            if (BL) { const ok = Math.abs(th) < 0.01 && rx && countHtml(rx.countR, rx.countP).ok; balLab.set(ok ? '⚖️ 저울이 수평이에요' : '⚖️ 원자 수가 달라 저울이 기울었어요'); balLab.el.style.background = ok ? 'rgba(22,101,52,.92)' : 'rgba(180,68,15,.92)'; }
            balLab.show(!!BL); }
          stg.update(t); arrow.position.x = Math.sin(t * 2.5) * 0.08;
        },
      };
    },
  });
})();
