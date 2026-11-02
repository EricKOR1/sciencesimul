/* m3-definite-proportions · 3D 입자 모형 (금속 + 산소 → 산화물)
   금속 원자와 산소 원자가 항상 같은 개수 비(1:1)로 결합해서, 반응하는 질량비도 일정해요. 남는 입자는 반응하지 않고 그대로 있어요. */
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
  const MET = { Cu: { n: '구리', ox: 'CuO', m: 64, ratio: '4 : 1' }, Mg: { n: '마그네슘', ox: 'MgO', m: 24, ratio: '3 : 2' } };
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  window.SciSim3D.attach({
    host: '.stage-card',
    title: '일정 성분비 3D 입자 모형',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHN ? 22 : 13.5, theta: 0.1, phi: 1.1, min: 6, max: 28, target: [0, 0.2, 0] },
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const K = ChemKit(THREE);
      let met = 'Cu', M = 4, O = 3, p = 0, playing = false, rx = null, hold = 0;
      label('반응 전', [-3.7, -1.1, 2.4], { color: 'rgba(14,165,233,.9)' }); label('반응 후', [3.7, -1.1, 2.4], { color: 'rgba(34,197,94,.9)' });
      const arrow = new THREE.Group(); const am = new THREE.MeshStandardMaterial({ color: 0xffd34d, roughness: 0.4, emissive: 0x6b4a00, emissiveIntensity: 0.5 });
      const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 1.2, 16), am); sh.rotation.z = Math.PI / 2;
      const hd = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.55, 20), am); hd.rotation.z = -Math.PI / 2; hd.position.x = 0.85; arrow.add(sh, hd); root.add(arrow);
      function build() {
        if (rx) rx.dispose();
        const e = Math.min(Math.floor(M / 2), O), I = MET[met];
        const re = [[met, M], ['O2', O]], pr = [];
        if (e) pr.push([I.ox, 2 * e]); if (M - 2 * e) pr.push([met, M - 2 * e]); if (O - e) pr.push(['O2', O - e]);
        rx = K.makeRxn(root, { re, pr }, { cxR: -3.7, cxP: 3.7, sp: 1.85 });
        rx.set(p); text(e);
      }
      function text(e) {
        const I = MET[met], f = I.ox, a = 2 * e * I.m, b = 2 * e * 16;
        const lines = ['<b>2' + met + ' + O₂ → 2' + f + '</b>'];
        if (e) { const g = gcd(a, b); lines.push('반응한 질량: ' + I.n + ' ' + a + ' : 산소 ' + b + ' = <b>' + a / g + ' : ' + b / g + '</b>'); lines.push('원자 개수비 ' + I.n + ' : 산소 = <b>1 : 1</b>'); }
        const lm = M - 2 * e, lo = O - e;
        lines.push(lm || lo ? '남은 입자: ' + (lm ? I.n + ' ' + lm + '개 ' : '') + (lo ? '산소 분자 ' + lo + '개' : '') + ' (반응 못 함)' : '<span style="color:#86efac">남는 입자 없이 모두 반응했어요.</span>');
        info(lines.join('<br>'));
      }
      controls.segment('금속', [{ value: 'Cu', label: '구리' }, { value: 'Mg', label: '마그네슘' }], met, (v) => { met = v; build(); });
      controls.range('금속 원자', 2, 8, 2, M, (v) => { M = v; build(); }, (v) => v + '개');
      controls.range('산소 분자', 1, 4, 1, O, (v) => { O = v; build(); }, (v) => v + '개');
      const pr = controls.range('진행', 0, 100, 1, 0, (v) => { p = v / 100; playing = false; pb.textContent = '▶ 재생'; rx.set(p); }, (v) => v + '%');
      const pb = controls.button('▶ 재생', () => { playing = !playing; if (playing && p >= 1) p = 0; pb.textContent = playing ? '❚❚ 멈춤' : '▶ 재생'; });
      build();
      return {
        update(dt, t) {
          if (playing) { if (p >= 1) { hold += dt; if (hold > 1.5) { p = 0; hold = 0; } } else p = Math.min(1, p + dt / 4); pr.set(Math.round(p * 100)); rx.set(p); }
          arrow.position.x = Math.sin(t * 2.5) * 0.07;
        },
      };
    },
  });
})();
