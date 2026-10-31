/* hc-structure-property · 3D 분자의 극성 (결합 쌍극자 화살표와 알짜 쌍극자)
   결합마다 전기 음성도가 큰 원자 쪽으로 향하는 쌍극자 화살표를 입체로 돌려 보고,
   화살표를 이어 붙여(벡터 합) 서로 상쇄되는지(무극성) 남는지(극성) 확인해요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const COL = { C: 0x4b5563, H: 0xf1f5f9, O: 0xe23b3b, N: 0x3867f4, Cl: 0x22b14c, F: 0x9be36b, B: 0xf4a6a6 };
  const RAD = { C: 0.38, H: 0.24, O: 0.36, N: 0.37, Cl: 0.46, F: 0.33, B: 0.36 };
  const EN = { H: 2.1, B: 2.0, C: 2.5, N: 3.0, O: 3.5, F: 4.0, Cl: 3.0 };      // 2D 화면과 같은 전기 음성도
  const D2R = Math.PI / 180;
  const alpha3 = (deg) => Math.acos(Math.sqrt((Math.cos(deg * D2R) + 0.5) / 1.5));
  const MOLS = {
    H2O:   { f: 'H₂O', n: '물', shape: '굽은형', polar: true },
    NH3:   { f: 'NH₃', n: '암모니아', shape: '삼각뿔', polar: true },
    CO2:   { f: 'CO₂', n: '이산화 탄소', shape: '직선형', polar: false },
    CH4:   { f: 'CH₄', n: '메테인', shape: '정사면체', polar: false },
    BF3:   { f: 'BF₃', n: '삼플루오린화 붕소', shape: '평면 삼각형', polar: false },
    CH3Cl: { f: 'CH₃Cl', n: '염화 메틸', shape: '사면체(C–Cl이 달라요)', polar: true },
  };
  const KEYS = ['H2O', 'NH3', 'CO2', 'CH4', 'BF3', 'CH3Cl'];
  const BL = { 'O-H': 1.45, 'N-H': 1.5, 'C-O': 1.75, 'C-H': 1.6, 'B-F': 1.95, 'C-Cl': 2.4 };
  const bl = (a, b) => BL[a + '-' + b] || BL[b + '-' + a] || 1.6;

  function geom(key, bend) {
    const A = [], B = []; // atoms [{e, p}], bonds [a, b, order]
    const add = (e, p) => { A.push({ e, p }); return A.length - 1; };
    const scale = (d, L) => d.map((x) => x * L);
    if (key === 'H2O') {
      const a = 52.25 * D2R; add('O', [0, 0, 0]);
      [-1, 1].forEach((s) => { const i = add('H', scale([s * Math.sin(a), -Math.cos(a), 0], bl('O', 'H'))); B.push([0, i, 1]); });
    } else if (key === 'NH3') {
      const al = alpha3(107); add('N', [0, 0, 0]);
      for (let k = 0; k < 3; k++) { const ph = Math.PI / 2 + k * 2 * Math.PI / 3, i = add('H', scale([Math.sin(al) * Math.cos(ph), -Math.cos(al), Math.sin(al) * Math.sin(ph)], bl('N', 'H'))); B.push([0, i, 1]); }
    } else if (key === 'CO2') {
      const h = (bend / 2) * D2R; add('C', [0, 0, 0]);
      [-1, 1].forEach((s) => { const i = add('O', scale([s * Math.sin(h), -Math.cos(h), 0], bl('C', 'O'))); B.push([0, i, 2]); });
    } else if (key === 'CH4') {
      const T = 1 / Math.sqrt(3); add('C', [0, 0, 0]);
      [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]].forEach((d) => { const i = add('H', scale(d.map((x) => x * T), bl('C', 'H'))); B.push([0, i, 1]); });
    } else if (key === 'BF3') {
      add('B', [0, 0, 0]);
      for (let k = 0; k < 3; k++) { const a = Math.PI / 2 + k * 2 * Math.PI / 3, i = add('F', scale([Math.cos(a), 0, Math.sin(a)], bl('B', 'F'))); B.push([0, i, 1]); }
    } else { // CH3Cl
      const psi = Math.acos(-1 / 3); add('C', [0, 0, 0]);
      const i0 = add('Cl', [0, bl('C', 'Cl'), 0]); B.push([0, i0, 1]);
      for (let k = 0; k < 3; k++) { const ph = k * 2 * Math.PI / 3 + 0.5, i = add('H', scale([Math.sin(psi) * Math.cos(ph), Math.cos(psi), Math.sin(psi) * Math.sin(ph)], bl('C', 'H'))); B.push([0, i, 1]); }
    }
    return { A, B };
  }

  window.SciSim3D.attach({
    title: '분자의 극성 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: 6.2, theta: 0.3, phi: 1.2, min: 3, max: 18 },
    autoRotate: 0.25,
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      let key = 'H2O', bend = 180, showBond = true, showNet = true, showSum = false;
      const g = new THREE.Group(); root.add(g);
      const labs = [], extra = [];
      const UP = new THREE.Vector3(0, 1, 0);
      const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);
      const stickMat = new THREE.MeshStandardMaterial({ color: 0x9aa6bf, roughness: 0.6 });
      function sphere(r, col) { return new THREE.Mesh(new THREE.SphereGeometry(r, 28, 18), new THREE.MeshStandardMaterial({ color: col, roughness: 0.45, metalness: 0.05 })); }
      function stick(a, b, r) {
        const d = b.clone().sub(a), len = d.length();
        const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 12), stickMat);
        m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(UP, d.normalize()); return m;
      }
      // 화살표: from → to (굵기 r, 색)
      function arrow(from, to, r, col) {
        const grp = new THREE.Group(), d = to.clone().sub(from), len = d.length();
        if (len < 0.02) return grp;
        const head = Math.min(len * 0.45, r * 4.2), shaft = Math.max(0.01, len - head);
        const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.4, emissive: col, emissiveIntensity: 0.25 });
        const sh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, shaft, 12), mat); sh.position.y = shaft / 2;
        const hd = new THREE.Mesh(new THREE.ConeGeometry(r * 2.1, head, 16), mat); hd.position.y = shaft + head / 2;
        grp.add(sh, hd); grp.position.copy(from); grp.quaternion.setFromUnitVectors(UP, d.normalize()); return grp;
      }
      // 극성 결합 + 전기 음성도 차 (낮은 쪽 → 높은 쪽)
      function dipoles(M) {
        const out = [];
        M.B.forEach(([a, b]) => {
          const ea = EN[M.A[a].e], eb = EN[M.A[b].e], dd = Math.abs(ea - eb);
          if (dd < 1e-9) return;
          const from = ea < eb ? a : b, to = ea < eb ? b : a;
          out.push({ from, to, d: Math.round(dd * 10) / 10, dir: V(M.A[to].p).sub(V(M.A[from].p)).normalize() });
        });
        return out;
      }
      const SC = 0.7;                                                    // 쌍극자 화살표 길이 = 0.7 × (전기 음성도 차)
      function fit() { const v = ctx.renderer.domElement, asp = Math.max(0.3, v.clientWidth / Math.max(1, v.clientHeight)); orbit.dist = (key === 'CH3Cl' || key === 'BF3' ? 7.4 : 6.4) * (asp < 1 ? Math.min(2, 1 / asp) : 1); }
      function clear() { while (g.children.length) g.remove(g.children[0]); labs.forEach((l) => l.show(false)); extra.forEach((l) => l.show(false)); }
      function build() {
        clear();
        const M = geom(key, bend), dp = dipoles(M);
        M.A.forEach((a, i) => {
          const m = sphere(RAD[a.e], COL[a.e]); m.position.set(...a.p); g.add(m);
          if (!labs[i]) labs[i] = label('', m);
          labs[i].obj = m; labs[i].set(a.e); labs[i].show(true); labs[i].off = [0, RAD[a.e] + 0.28, 0];
        });
        M.B.forEach(([a, b, o]) => {
          const A = V(M.A[a].p), B = V(M.A[b].p), nd = B.clone().sub(A).normalize();
          const side = new THREE.Vector3(0, 0, 1); if (Math.abs(nd.z) > 0.9) side.set(0, 1, 0);
          side.cross(nd).normalize().multiplyScalar(0.07);
          for (let k = 0; k < o; k++) g.add(stick(A.clone().add(side.clone().multiplyScalar(o === 1 ? 0 : (k - 0.5) * 2)), B.clone().add(side.clone().multiplyScalar(o === 1 ? 0 : (k - 0.5) * 2)), 0.035));
        });
        // 부분 전하 δ+ / δ−
        const dl = [];
        M.A.forEach((a, i) => {
          let s = 0; M.B.forEach(([p, q]) => { if (p === i) s += EN[M.A[q].e] - EN[a.e]; else if (q === i) s += EN[M.A[p].e] - EN[a.e]; });
          if (Math.abs(s) < 0.05) return;
          const k = dl.length; dl.push(i);
          if (!extra[k]) extra[k] = label('', labs[i].obj, {});
          extra[k].obj = labs[i].obj; extra[k].set(s > 0 ? 'δ+' : 'δ−'); extra[k].el.style.background = s > 0 ? 'rgba(220,60,60,.92)' : 'rgba(37,99,235,.92)'; extra[k].off = [0, -RAD[a.e] - 0.3, 0]; extra[k].show(showBond);
        });
        const cen = new THREE.Vector3();
        // 결합 쌍극자 화살표 (결합 옆)
        if (showBond) dp.forEach((x) => {
          const A = V(M.A[x.from].p), B = V(M.A[x.to].p), mid = A.clone().add(B).multiplyScalar(0.5), len = Math.min(x.d * SC, A.distanceTo(B) - 0.1);
          const side = mid.clone().sub(cen); side.sub(x.dir.clone().multiplyScalar(side.dot(x.dir)));
          if (side.lengthSq() < 1e-4) side.set(0, 1, 0).sub(x.dir.clone().multiplyScalar(x.dir.y)); if (side.lengthSq() < 1e-4) side.set(0, 0, 1);
          side.normalize().multiplyScalar(0.3);
          const c = mid.clone().add(side);
          g.add(arrow(c.clone().sub(x.dir.clone().multiplyScalar(len / 2)), c.clone().add(x.dir.clone().multiplyScalar(len / 2)), 0.045, 0xf59e0b));
        });
        // 알짜 쌍극자 (분자 가운데에서 굵게)
        const net = dp.reduce((s, x) => s.add(x.dir.clone().multiplyScalar(x.d)), new THREE.Vector3());
        const nlen = net.length();
        if (showNet && nlen > 1e-3) { const nd = net.clone().normalize(); g.add(arrow(nd.clone().multiplyScalar(0.3), nd.clone().multiplyScalar(0.3 + Math.max(0.45, nlen * SC)), 0.085, 0xec4899)); }
        netLab.obj = null; netLab.show(false);
        // 벡터 더하기: 화살표를 머리-꼬리로 이어 붙여 아래쪽에 그리기
        let sumNote = '';
        if (showSum) {
          let low = 0; M.A.forEach((a) => { low = Math.min(low, a.p[1]); });
          let cur = new THREE.Vector3(-1.2, low - 1.7, 0); const start = cur.clone();
          const SS = 1.0;
          // 합이 0일 때 닫힌 도형이 한눈에 보이도록 화살표를 각도순으로 정렬
          const order = dp.slice().sort((a, b) => Math.atan2(a.dir.y, a.dir.x) - Math.atan2(b.dir.y, b.dir.x));
          const cols = [0xf59e0b, 0xfbbf24, 0xfb923c, 0xfcd34d];
          order.forEach((x, k) => { const nxt = cur.clone().add(x.dir.clone().multiplyScalar(x.d * SS)); g.add(arrow(cur, nxt, 0.05, cols[k % 4])); cur = nxt; });
          const tot = cur.clone().sub(start);
          if (tot.length() > 0.05) g.add(arrow(start.clone().add(new THREE.Vector3(0, -0.28, 0)), cur.clone().add(new THREE.Vector3(0, -0.28, 0)), 0.085, 0xec4899));
          netLab.obj = start.clone().add(cur).multiplyScalar(0.5).add(new THREE.Vector3(0, -0.8, 0)).toArray();
          netLab.set(tot.length() > 0.05 ? '합 = 0이 아니에요' : '합 = 0 (서로 상쇄)'); netLab.show(true);
          sumNote = tot.length() > 0.05 ? '<br>이어 붙이면 출발점으로 돌아오지 못해요 → 알짜 쌍극자가 남아요.' : '<br>이어 붙이면 출발점으로 돌아와요 → 서로 상쇄돼요.';
        }
        text(M, dp, nlen, sumNote);
      }
      const netLab = label('', [0, 0, 0], { color: 'rgba(236,72,153,.95)' }); netLab.show(false);
      function text(M, dp, nlen, sumNote) {
        const T = MOLS[key];
        const polarNow = nlen > 1e-3;
        const bondP = dp.length ? '결합은 극성(' + dp.map((x) => x.d).filter((v, i, a) => a.indexOf(v) === i).join('·') + ' 만큼 쏠림)' : '';
        info('<b>' + T.f + '</b> (' + T.n + ') · ' + (key === 'CO2' && bend < 180 ? '굽은형 (' + bend + '°)' : T.shape) + '<br><span style="color:#fbbf24">주황</span> 결합 쌍극자 · <span style="color:#f9a8d4">분홍</span> 알짜 쌍극자(합)' +
          '<br><b>' + (polarNow ? '극성 분자: 화살표가 상쇄되지 않고 남아요.' : '무극성 분자: 결합은 극성이어도 화살표가 상쇄돼요.') + '</b>' + sumNote);
      }
      const segMol = controls.segment('분자', KEYS.map((k) => ({ value: k, label: MOLS[k].f })), key, (v) => { key = v; fit(); build(); });
      const bendSl = controls.range('CO₂ 결합각', 100, 180, 5, 180, (v) => { bend = v; if (key !== 'CO2') { key = 'CO2'; segMol.set('CO2'); } build(); }, (v) => v + '°');
      const bB = controls.button('결합 쌍극자 ✓', () => { showBond = !showBond; bB.classList.toggle('on', showBond); bB.textContent = '결합 쌍극자 ' + (showBond ? '✓' : '✕'); build(); }); bB.classList.add('on');
      const nB = controls.button('알짜 쌍극자 ✓', () => { showNet = !showNet; nB.classList.toggle('on', showNet); nB.textContent = '알짜 쌍극자 ' + (showNet ? '✓' : '✕'); build(); }); nB.classList.add('on');
      const sB = controls.button('화살표 더하기 ✕', () => { showSum = !showSum; sB.classList.toggle('on', showSum); sB.textContent = '화살표 더하기 ' + (showSum ? '✓' : '✕'); build(); });
      const api = {
        sync() { // 2D 화면에서 고른 분자·결합각으로 시작 (읽기 전용)
          try {
            const s = window.__sim; if (!s || !s.PL) return;
            const mk = s.PL.mol, bd = s.PL.bend;
            if (MOLS[mk] && (mk !== key || (mk === 'CO2' && bd !== bend))) { key = mk; if (mk === 'CO2' && bd >= 100 && bd <= 180) { bend = bd; bendSl.set(bd); } segMol.set(key); build(); }
          } catch (e) { /* 무시 */ }
        },
      };
      api.sync();
      fit();
      build();
      return api;
    },
  });
})();
