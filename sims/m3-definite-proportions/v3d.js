/* m3-definite-proportions · 3D 입자 모형 (금속 + 산소 → 산화물)
   금속 원자와 산소 원자가 항상 같은 개수 비(1:1)로 결합해서, 반응하는 질량비도 일정해요. 남는 입자는 반응하지 않고 그대로 있어요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  /* ---------- 공통: 분자 모형과 반응 도우미 ---------- */
  function ChemKit(THREE) {
    const COL = { H: 0xf1f5f9, O: 0xe2464b, C: 0x3f4756, N: 0x3b82f6, Mg: 0xa3e635, Cu: 0xd2693a, Cl: 0x14b8a6 };
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
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  /* 2D 차시의 장면: lab(구리 가열) · graph(질량비 그래프) · cuo(산화 구리 입자 모형) · sugar(설탕물) · mg(마그네슘 연소) · water(물 생성) */
  window.SciSim3D.attach({
    host: '.stage-card',
    title: '일정 성분비 3D 입자 모형',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    levels: [2, 3],              // 3단계(입자 모형)·4단계(다른 화합물)는 3D. 구리 가열 실험·질량비 그래프는 2D
    camera: { dist: PHN ? 22 : 13.5, theta: 0.1, phi: 1.1, min: 6, max: 28, target: [0, 0.2, 0] },
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const K = ChemKit(THREE), stg = K.stage(root);
      let rx = null, sig = '', qd = 0, lastSV = null;
      const labB = label('반응 전', [-3.7, -1.1, 2.4], { color: 'rgba(14,165,233,.9)' }), labA = label('반응 후', [3.7, -1.1, 2.4], { color: 'rgba(34,197,94,.9)' });
      const arrow = new THREE.Group(); const am = new THREE.MeshStandardMaterial({ color: 0xffd34d, roughness: 0.4, emissive: 0x6b4a00, emissiveIntensity: 0.5 });
      const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 1.2, 16), am); sh.rotation.z = Math.PI / 2;
      const hd = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.55, 20), am); hd.rotation.z = -Math.PI / 2; hd.position.x = 0.85; arrow.add(sh, hd); root.add(arrow);
      /* 설탕물(혼합물) 장면: 비커 + 물 + 설탕 알갱이 */
      const mix = new THREE.Group(); mix.visible = false; root.add(mix);
      const bk = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.0, 4.4, 56, 1, true), ctx.mats.glass({ opacity: 0.2 })); bk.position.y = 0.6; mix.add(bk);
      { const lip = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.05, 10, 64), ctx.mats.glass({ opacity: 0.4 })); lip.rotation.x = Math.PI / 2; lip.position.y = 2.8; mix.add(lip); }   // 비커 입구 테두리
      const wat = new THREE.Mesh(new THREE.CylinderGeometry(1.95, 1.85, 1, 48), ctx.mats.liquid(0x7fbcf2, { opacity: 0.55 })); mix.add(wat);
      const cubeG = new THREE.BoxGeometry(0.34, 0.34, 0.34), cubeM = new THREE.MeshStandardMaterial({ color: 0xfdf0cf, roughness: 0.6 });
      const cubes = []; for (let i = 0; i < 12; i++) { const c = new THREE.Mesh(cubeG, cubeM); const a = i * 2.4, r = 0.25 + (i % 4) * 0.38; c.position.set(Math.cos(a) * r, -1.45 + Math.floor(i / 6) * 0.36, Math.sin(a) * r); c.rotation.set(i, i * 2, 0); mix.add(c); cubes.push(c); }
      const bkBase = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.2, 48), ctx.mats.metal('steel', { brushed: true, roughness: 0.25 })); bkBase.position.y = -1.7; mix.add(bkBase);
      function view() {
        const S = ctx.lesson() || {}, sc = (S.S && S.S.scene) || 'lab';
        if (sc === 'sugar') { const SG = S.SG || { sugar: 0, water: 100 }; return { sc, SG, key: sc + '|' + SG.sugar + '|' + SG.water }; }
        if (sc === 'cuo') return { sc, re: [['Cu', 6], ['O2', 4]], pr: [['CuO', 6], ['O2', 1]], key: sc };
        if (sc === 'mg') { const a = (S.MG && S.MG.amt) || 6, n = a / 3 * 2; return { sc, a, re: [['Mg', n], ['O2', n / 2]], pr: [['MgO', n]], key: sc + a }; }
        if (sc === 'water') {
          const o = (S.WT && S.WT.o) || 20, nO = o / 4, used = Math.min(nO, 4);
          return { sc, o, re: [['H2', 8], ['O2', nO]], pr: [['H2O', 2 * used], ['H2', 8 - 2 * used], ['O2', nO - used]], key: sc + o };
        }
        return { sc, re: [['Cu', 4], ['O2', 2]], pr: [['CuO', 4]], key: 'cu' };          // lab · graph
      }
      function text(v, S) {
        const ok = (t) => '<span style="color:#86efac">' + t + '</span>';
        if (v.sc === 'cuo') {
          const CU = S.CU || {};
          if (!CU.found) return '<b>구리 원자 6개 + 산소 분자 4개</b><br>짝지은 구리–산소 <b>' + (CU.pairs || 0) + ' / 6</b>쌍' + (CU.pairs === 6 ? '<br>반응 후 쪽에 무엇이 남았나요?' : '') + (pickMsg ? '<br>' + pickMsg : '');
          return '<b>구리 원자 6개 + 산소 분자 4개 → 산화 구리(Ⅱ) 6개</b><br>구리 원자 6개는 산소 <b>원자</b> 6개(= 산소 분자 3개)와 짝을 지어요.<br>' + ok('산소 분자 1개가 남아요. 구리 : 산소 질량비는 언제나 4 : 1이에요.');
        }
        if (v.sc === 'mg') return '<b>마그네슘 ' + v.a + ' g + 산소 ' + (v.a * 2 / 3).toFixed(1) + ' g → 산화 마그네슘 ' + (v.a * 5 / 3).toFixed(1) + ' g</b><br>2Mg + O₂ → 2MgO<br>' + ok('마그네슘 : 산소 = 3 : 2 (원자 1 : 1로 결합)');
        if (v.sc === 'water') {
          const k = Math.min(2, v.o / 8), left = v.o > 16 ? '산소 ' + (v.o - 16) + ' g이 남아요.' : v.o < 16 ? '산소가 모자라 수소 ' + (2 - k).toFixed(0) + ' g이 남아요.' : '남는 물질이 없어요.';
          return '<b>수소 2 g + 산소 ' + v.o + ' g → 물 ' + (9 * k).toFixed(0) + ' g</b><br>수소 2 g은 산소 16 g과 결합해요. (수소 : 산소 = 1 : 8)<br>' + ok(left) + '<br><span style="opacity:.8">입자 모형: 수소 2 g = 수소 분자 8개, 산소 8 g = 산소 분자 2개</span>';
        }
        const L = S.LAB || {};
        return '<b>구리 + 산소 → 산화 구리(Ⅱ)</b><br>2Cu + O₂ → 2CuO<br>구리 2.00 g + 산소 0.50 g = 산화 구리(Ⅱ) 2.50 g<br>' + ok('구리 : 산소 = 4 : 1 (원자 1 : 1)') + (L.scaleVal != null ? '<br>지금 저울: <b>' + L.scaleVal.toFixed(2) + ' g</b> · 가열 ' + (L.round || 0) + '회' : '');
      }
      function rebuild(v) {
        if (rx) rx.dispose(); rx = null;
        const S = ctx.lesson() || {};
        const isMix = v.sc === 'sugar'; mix.visible = isMix; if (plRow) plRow.style.display = isMix ? 'none' : ''; arrow.visible = !isMix; labB.show(!isMix); labA.show(!isMix);
        if (isMix) {
          const w = v.SG.water, h = Math.max(0.6, w / 300 * 3.8); wat.scale.y = h; wat.position.y = -1.6 + h / 2;
          const n = Math.round(Math.min(v.SG.sugar, 120) / 10); cubes.forEach((c, i) => { c.visible = i < n; });
          const g = v.SG.sugar ? gcd(v.SG.sugar, w) : 1;
          info('<b>설탕물은 혼합물이에요</b><br>설탕 ' + v.SG.sugar + ' g + 물 ' + w + ' g' + (v.SG.sugar ? '<br>설탕 : 물 = <b>' + v.SG.sugar / g + ' : ' + w / g + '</b>' : '') + '<br><span style="color:#fcd34d">설탕과 물은 얼마든지 섞을 수 있어서 성분비가 정해져 있지 않아요.</span>');
          return;
        }
        const n = Math.max(v.re.reduce((a, q) => a + q[1], 0), v.pr.reduce((a, q) => a + q[1], 0));
        rx = K.makeRxn(root, { re: v.re.filter((q) => q[1] > 0), pr: v.pr.filter((q) => q[1] > 0) }, { cxR: -3.7, cxP: 3.7, sp: n > 9 ? 1.25 : 1.7 });
        rx.set(qd);
        const c = countHtml(rx.countR, rx.countP);
        info(text(v, S) + '<br><span style="opacity:.85">원자 수 ' + c.html + '</span>');
      }
      const pl = controls.player({
        duration: 6, loop: true, label: '반응 재생',
        phases: [[0, '반응 전'], [0.08, '결합이 끊어져요'], [0.29, '원자가 짝지어요'], [0.67, '산화물이 만들어져요'], [0.9, '반응 후']],
        onFrame(p) { qd = Math.max(0, Math.min(1, (p - 0.08) / 0.82)); if (rx) rx.set(qd); },
      });
      const plRow = Array.from(labB.el.closest('.v3-wrap').querySelectorAll('.v3-player'))[0];
      /* 🧩 남는 입자 찾기: 짝짓기가 끝나면 남은 입자를 막대에서 골라요 (2D에서 남은 입자를 누른 것과 같아요) */
      const pickHost = plRow.parentNode, n0 = pickHost.children.length;
      let pickMsg = '';
      controls.text('남는 입자는?');
      [['Cu', '구리 원자'], ['O', '산소 원자'], ['O2', '산소 분자']].forEach(([k, t]) => controls.button(t, () => {
        const L = ctx.lesson(), CU = L && L.CU; if (!CU || CU.pairs !== 6) return;
        if (k === 'O2') { CU.found = true; pickMsg = '<span style="color:#86efac">맞아요! 산소 분자 1개가 반응하지 못하고 남았어요.</span>'; }
        else pickMsg = '<span style="color:#fca5a5">' + t + '는 모두 짝을 지었어요. 반응 후 쪽을 다시 살펴봐요.</span>';
        sig = '';
      }));
      const pickEls = Array.from(pickHost.children).slice(n0);
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
      const histPan = v3xPan();   // 🧃 만든 비율: 2D의 오른쪽 상자처럼 서로 다른 설탕 : 물 비율이 쌓여요
      const gcd2 = (a, b) => (b ? gcd2(b, a % b) : a);
      function drawHist(v, S) {
        const H = v.sc === 'sugar' && S.SG ? S.SG.hist || [] : null; if (!H) { histPan.set(''); return; }
        histPan.set('<div class="h">🧃 만든 비율 ' + H.length + '가지</div>' + (H.length ? H.map((h, i) => { const g = gcd2(h.s, h.w); return '<div>' + (i + 1) + '. 설탕 ' + h.s + ' g : 물 ' + h.w + ' g = <b>' + h.s / g + ' : ' + h.w / g + '</b></div>'; }).join('') : '<span class="q">설탕을 넣으면 비율이 쌓여요</span>'));
      }
      let lastPairs = -1, lastFound = null;
      return {
        update(dt, t) {
          const v = view(), S = ctx.lesson() || {};
          const CU = S.CU || {}, picking = v.sc === 'cuo' && CU.pairs === 6 && !CU.found;
          pickEls.forEach((e) => { e.style.display = picking ? '' : 'none'; });
          if (v.sc === 'cuo' && (CU.pairs !== lastPairs || CU.found !== lastFound)) {
            if (CU.pairs > 0 && lastPairs === 0) { pl.set(0); pl.play(); }      // ✨ 자동으로 짝짓기 → 반응을 처음부터 보여 줘요
            if (!CU.pairs) pickMsg = '';
            lastPairs = CU.pairs; lastFound = CU.found; sig = '';
          }
          if (v.key !== sig) { sig = v.key; rebuild(v); }
          else if (v.sc === 'lab' && S.LAB && S.LAB.scaleVal !== lastSV) { lastSV = S.LAB.scaleVal; rebuild(v); }
          drawHist(v, S);
          stg.update(t); arrow.position.x = Math.sin(t * 2.5) * 0.07;
        },
      };
    },
  });
})();
