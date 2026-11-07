/* m3-mass-conservation · 3D 원자 모형으로 보는 질량 보존
   반응 전후에 원자의 종류와 수가 그대로라서 전체 질량이 같아요. 열린 용기에서는 기체가 빠져나가 저울 값이 줄어요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  /* ---------- 공통: 분자 모형과 반응 도우미 ---------- */
  function ChemKit(THREE) {
    const COL = { H: 0xf5f7fb, O: 0xef4b4b, C: 0x3a3f4b, N: 0x3f6fe8, Na: 0x9b7be0, Cl: 0x3fbf5f, Ag: 0xc3ccd9, Ca: 0xf2a93b, Fe: 0x8b95a6 };
    const RAD = { H: 0.27, O: 0.4, C: 0.4, N: 0.38, Na: 0.44, Cl: 0.47, Ag: 0.46, Ca: 0.49, Fe: 0.44 };
    const NAME = { H: '수소', O: '산소', C: '탄소', N: '질소', Na: '나트륨', Cl: '염소', Ag: '은', Ca: '칼슘', Fe: '철' };
    const SP = {
      O2: { n: '산소', f: 'O₂', a: ['O', 'O'], p: [[-0.4, 0, 0], [0.4, 0, 0]], b: [[0, 1, 2]] },
      H2O: { n: '물', f: 'H₂O', a: ['O', 'H', 'H'], p: [[0, 0.14, 0], [-0.66, -0.34, 0], [0.66, -0.34, 0]], b: [[0, 1, 1], [0, 2, 1]] },
      CO2: { n: '이산화 탄소', f: 'CO₂', a: ['C', 'O', 'O'], p: [[0, 0, 0], [-1, 0, 0], [1, 0, 0]], b: [[0, 1, 2], [0, 2, 2]] },
      HCl: { n: '염산', f: 'HCl', a: ['H', 'Cl'], p: [[-0.55, 0, 0], [0.45, 0, 0]], b: [[0, 1, 1]] },
      C: { n: '탄소', f: 'C', a: ['C'], p: [[0, 0, 0]], b: [] },
      Fe: { n: '철', f: 'Fe', a: ['Fe'], p: [[0, 0, 0]], b: [] },
      Fe2O3: { n: '산화 철', f: 'Fe₂O₃', a: ['Fe', 'Fe', 'O', 'O', 'O'], p: [[-0.85, 0.45, 0], [0.85, 0.45, 0], [0, 0.95, 0], [-0.9, -0.5, 0], [0.9, -0.5, 0]], b: [[0, 2, 1], [1, 2, 1], [0, 3, 1], [1, 4, 1]] },
      NaCl: { n: '염화 나트륨', f: 'NaCl', a: ['Na', 'Cl'], p: [[-0.62, 0, 0], [0.66, 0, 0]], b: [[0, 1, 1]] },
      AgCl: { n: '염화 은', f: 'AgCl', a: ['Ag', 'Cl'], p: [[-0.6, 0, 0], [0.62, 0, 0]], b: [[0, 1, 1]] },
      AgNO3: { n: '질산 은', f: 'AgNO₃', a: ['N', 'O', 'O', 'O', 'Ag'], p: [[0, 0, 0], [0, 0.8, 0], [-0.69, -0.4, 0], [0.69, -0.4, 0], [1.55, -0.2, 0]], b: [[0, 1, 2], [0, 2, 1], [0, 3, 1], [3, 4, 1]] },
      NaNO3: { n: '질산 나트륨', f: 'NaNO₃', a: ['N', 'O', 'O', 'O', 'Na'], p: [[0, 0, 0], [0, 0.8, 0], [-0.69, -0.4, 0], [0.69, -0.4, 0], [1.55, -0.2, 0]], b: [[0, 1, 2], [0, 2, 1], [0, 3, 1], [3, 4, 1]] },
      CaCO3: { n: '탄산 칼슘', f: 'CaCO₃', a: ['C', 'O', 'O', 'O', 'Ca'], p: [[0, 0, 0], [0, 0.8, 0], [-0.69, -0.4, 0], [0.69, -0.4, 0], [1.55, -0.2, 0]], b: [[0, 1, 2], [0, 2, 1], [0, 3, 1], [3, 4, 1]] },
      CaCl2: { n: '염화 칼슘', f: 'CaCl₂', a: ['Ca', 'Cl', 'Cl'], p: [[0, 0, 0], [-0.95, 0.5, 0], [0.95, 0.5, 0]], b: [[0, 1, 1], [0, 2, 1]] },
    };
    Object.keys(SP).forEach((k) => { SP[k].p = SP[k].p.map((q) => q.map((v) => v * 1.3)); });
    const smooth = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
    const matCache = {};
    const mat = (el) => matCache[el] || (matCache[el] = new THREE.MeshStandardMaterial({ color: COL[el], roughness: 0.32, metalness: el === 'Cu' ? 0.45 : 0.05 }));
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
  /* 2D 차시의 실험들: 앙금 생성 · 기체 발생(열린/닫힌 용기) · 연소(강철 솜/나무, 열린 공간/밀폐 용기) · 원자 모형 */
  const RXN = {
    ppt:  { t: '앙금 생성', w: '질산 은 + 염화 나트륨 → 염화 은(흰 앙금) + 질산 나트륨', re: [['AgNO3', 2], ['NaCl', 2]], pr: [['AgCl', 2], ['NaNO3', 2]], gas: [], sp: 1.6 },
    gas:  { t: '기체 발생', w: '탄산 칼슘 + 염산 → 염화 칼슘 + 물 + 이산화 탄소', re: [['CaCO3', 1], ['HCl', 2]], pr: [['CaCl2', 1], ['H2O', 1], ['CO2', 1]], gas: ['CO2'], sp: 1.7 },
    wool: { t: '강철 솜의 연소', w: '철 + 산소 → 산화 철 (결합)', re: [['Fe', 4], ['O2', 3]], pr: [['Fe2O3', 2]], gas: [], sp: 1.4 },
    wood: { t: '나무의 연소', w: '탄소(나무) + 산소 → 이산화 탄소', re: [['C', 2], ['O2', 2]], pr: [['CO2', 2]], gas: ['CO2'], sp: 1.6 },
  };
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  window.SciSim3D.attach({
    host: '.stage-card',
    title: '질량 보존 3D 모형',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHN ? 22 : 14, theta: 0.1, phi: 1.2, min: 6, max: 30, target: [0, 0.3, 0] },
    autoRotate: 0,
    levels: [3],               // 4단계(원자 모형)만 3D. 앙금·기체 발생·연소 실험(저울·뚜껑·예상 카드)은 2D
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const K = ChemKit(THREE);
      let rx = null, rxS = null, sig = '', cur = null, pp = 0;
      const CX = 3.7, R = 2.1;
      const glass = new THREE.MeshStandardMaterial({ color: 0xbfe3ff, roughness: 0.08, metalness: 0, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide });
      const metal = new THREE.MeshStandardMaterial({ color: 0x8b95a7, roughness: 0.4, metalness: 0.7 });
      const stopMat = new THREE.MeshStandardMaterial({ color: 0xe8a14b, roughness: 0.7 });
      const stoppers = [];
      [-CX, CX].forEach((cx) => {
        const base = new THREE.Mesh(new THREE.BoxGeometry(2 * R + 0.5, 0.45, 2 * R + 0.5), metal); base.position.set(cx, -1.55, 0); root.add(base);
        const top = new THREE.Mesh(new THREE.BoxGeometry(2 * R + 0.1, 0.08, 2 * R + 0.1), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3 })); top.position.set(cx, -1.3, 0); root.add(top);
        const fl = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 3.8, 48, 1, true), glass); fl.position.set(cx, 0.6, 0); root.add(fl);
        const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 0.05, 10, 56), glass); rim.rotation.x = Math.PI / 2; rim.position.set(cx, 2.5, 0); root.add(rim);
        const st = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.6, R - 0.8, 0.6, 32), stopMat); st.position.set(cx, 2.7, 0); root.add(st); stoppers.push(st);
      });
      const labL = label('', [-CX, -1.3, 2.9], { color: 'rgba(14,165,233,.92)', size: 15 }), labR = label('', [CX, -1.3, 2.9], { color: 'rgba(34,197,94,.92)', size: 15 });
      label('반응 전', [-CX, 3.5, 0], { color: 'rgba(14,165,233,.9)' }); label('반응 후', [CX, 3.5, 0], { color: 'rgba(34,197,94,.9)' });
      const arrow = new THREE.Group(); const am = new THREE.MeshStandardMaterial({ color: 0xffd34d, roughness: 0.4, emissive: 0x6b4a00, emissiveIntensity: 0.5 });
      const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.9, 16), am); sh.rotation.z = Math.PI / 2;
      const hd = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.5, 20), am); hd.rotation.z = -Math.PI / 2; hd.position.x = 0.62; arrow.add(sh, hd); arrow.position.y = 0.6; root.add(arrow);

      /* 지금 2D 실험이 어떤 장면인지 읽어요 */
      function scenario() {
        const L = ctx.lesson(); if (!L || !L.S) return { key: 'ppt', scene: 'ppt', closed: true };
        const sc = L.S.scene;
        if (sc === 'gas') return { key: 'gas', scene: sc, closed: L.GS.box === 'closed', lidOff: L.GS.lid === 'off' };
        if (sc === 'burn') return { key: L.BS.mat, scene: sc, closed: L.BS.ctn === 'closed' };
        if (sc === 'atoms') return { key: ['ppt', 'gas', 'wood'][L.AS.sel] || 'ppt', scene: sc, closed: true, atoms: true };
        return { key: 'ppt', scene: 'ppt', closed: true };
      }
      /* 질량 값 (2D 저울과 같은 값) */
      function masses(c, q, esc) {
        if (c.atoms) return null;
        const open = !c.closed || c.lidOff;
        if (c.key === 'ppt') return [150, 150];
        if (c.key === 'gas') return [120, open ? 120 - 1.1 * esc : 120];
        if (c.key === 'wool') return [2, c.closed ? 2 : 2 + 0.4 * K.smooth(q)];
        return [2, c.closed ? 2 : 2 - 1.6 * esc];
      }
      function note(c) {
        if (c.key === 'ppt') return c.atoms ? '은 이온과 염화 이온이 짝을 바꿔요' : '흰색 앙금이 생겼는데도 질량은 그대로예요.';
        if (c.key === 'gas') return c.atoms ? '생긴 이산화 탄소도 원자 수에 포함해요' : c.closed ? (c.lidOff ? '뚜껑을 열자 이산화 탄소가 빠져나가 질량이 줄어요.' : '닫힌 용기: 생긴 기체가 용기 안에 머물러요. 질량이 그대로예요.') : '열린 용기: 생긴 기체가 공기 중으로 빠져나가 질량이 줄어요.';
        if (c.key === 'wool') return c.atoms ? '' : c.closed ? '밀폐 용기: 기체가 드나들지 못해 질량이 그대로예요.' : '열린 공간: 산소가 결합한 만큼 질량이 늘어요.';
        return c.atoms ? '탄소가 산소와 결합해 이산화 탄소가 돼요' : c.closed ? '밀폐 용기: 이산화 탄소가 용기 안에 있어 질량이 그대로예요.' : '열린 공간: 이산화 탄소가 날아가 질량이 줄어요.';
      }
      function rebuild(c) {
        if (rx) rx.dispose(); if (rxS) rxS.dispose();
        const r = RXN[c.key], def = { re: r.re, pr: r.pr, rigid: false };
        rx = K.makeRxn(root, def, { cxR: CX, cxP: CX, sp: r.sp, noPlate: true, gas: !c.closed || c.lidOff ? r.gas : [] });
        rxS = K.makeRxn(root, def, { cxR: -CX, cxP: -CX, sp: r.sp, noPlate: true, gas: [] }); rxS.set(0);
        stoppers.forEach((s) => { s.visible = c.closed && c.key !== 'ppt' && !c.lidOff; });
        cur = c; frame(pp);
        const cn = countHtml(rx.countR, rx.countP), r2 = RXN[c.key];
        const eq = r2.re.map((q) => (q[1] > 1 ? q[1] : '') + K.SP[q[0]].f).join(' + ') + ' → ' + r2.pr.map((q) => (q[1] > 1 ? q[1] : '') + K.SP[q[0]].f).join(' + ');
        info('<b>' + r2.w + '</b><br>' + eq + '<br>원자 수 ' + cn.html + '<br><span style="color:' + (c.closed || !r2.gas.length || c.key === 'wool' ? '#86efac' : '#fca5a5') + '">' + note(c) + '</span>');
      }
      /* p(0~1) → 반응(0.05~0.65) · 기체 이동(0.68~0.95) */
      function frame(p) {
        pp = p; if (!rx) return;
        const q = clamp01((p - 0.05) / 0.6), esc = clamp01((p - 0.68) / 0.27);
        rx.set(q); rx.setEsc(esc);
        const m = masses(cur, q, esc);
        labL.set(m ? '질량 <b>' + m[0].toFixed(1) + ' g</b>' : '');
        labR.set(m ? '질량 <b>' + m[1].toFixed(1) + ' g</b>' : '');
      }
      /* ▶ 반응 재생: 2D의 ▶ 반응 재생과 같아요 (미션의 '재생한 반응'도 같이 세요). 오른쪽 단추로 재생해도 3D가 처음부터 보여 줘요 */
      let wasPlay = false, lastSt = 'idle';
      const pl = controls.player({
        duration: 8, loop: false, label: '반응 재생',
        phases: [[0, '반응 전'], [0.05, '반응이 일어나요'], [0.65, '반응 후'], [0.68, '질량 확인']],
        onFrame: frame,
      });
      return {
        update(dt, t) {
          const c = scenario(), s = [c.key, c.closed, c.lidOff, c.atoms].join('|');
          if (s !== sig) { sig = s; rebuild(c); pl.pause(); pl.set(0); }
          const L = ctx.lesson(), A = L && L.AS;
          if (A && c.atoms) {
            if (pl.playing && !wasPlay && pl.p < 0.35 && A.st !== 'run') { const b = document.getElementById('playBtn'); if (b && !b.disabled) b.click(); }
            else if (A.st === 'run' && lastSt !== 'run' && !pl.playing) { pl.set(0); pl.play(); }
            lastSt = A.st;
          }
          wasPlay = pl.playing;
          arrow.position.x = Math.sin(t * 2.5) * 0.06;
        },
      };
    },
  });
})();
