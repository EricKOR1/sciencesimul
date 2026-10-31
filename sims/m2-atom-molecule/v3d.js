/* m2-atom-molecule · 3D 입자 모형 (공 막대 / 공간 채움)
   원자 1개로 존재하는 입자(He, Cu)와 원자가 결합한 분자(H₂, O₂, N₂, H₂O, CO₂, CH₄, NH₃)를 돌려 보고,
   '나누기'로 분자를 원자로 나누어 봐요. 평면 그림으로는 알 수 없는 분자의 입체 모양을 확인해요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const COL = { H: 0xf1f5f9, C: 0x3a3f4b, N: 0x3f6fe8, O: 0xef4b4b, He: 0x7fd8e8, Cu: 0xc7743b };
  const NAME = { H: '수소', C: '탄소', N: '질소', O: '산소', He: '헬륨', Cu: '구리' };
  const RB = { H: 0.26, C: 0.4, N: 0.38, O: 0.38, He: 0.5, Cu: 0.88 };      // 공 막대 반지름 (Å 단위 장면)
  const RV = { H: 1.1, C: 1.7, N: 1.55, O: 1.52, He: 1.4, Cu: 1.4 };       // 공간 채움 반지름 (반데르발스 반지름 정도)
  const T4 = 0.63;
  // 좌표(Å)는 2D 실험 화면의 분자 자료와 같아요.
  const MOLS = {
    He:  { f: 'He', name: '헬륨', kind: 'atom', atoms: [['He', 0, 0, 0]], bonds: [] },
    Cu:  { f: 'Cu', name: '구리', kind: 'metal', atoms: [], bonds: [] },
    H2:  { f: 'H₂', name: '수소', kind: 'mol', atoms: [['H', -0.37, 0, 0], ['H', 0.37, 0, 0]], bonds: [[0, 1, 1]] },
    O2:  { f: 'O₂', name: '산소', kind: 'mol', atoms: [['O', -0.6, 0, 0], ['O', 0.6, 0, 0]], bonds: [[0, 1, 2]] },
    N2:  { f: 'N₂', name: '질소', kind: 'mol', atoms: [['N', -0.55, 0, 0], ['N', 0.55, 0, 0]], bonds: [[0, 1, 3]] },
    H2O: { f: 'H₂O', name: '물', kind: 'mol', atoms: [['O', 0, 0.2, 0], ['H', -0.76, -0.39, 0], ['H', 0.76, -0.39, 0]], bonds: [[0, 1, 1], [0, 2, 1]] },
    CO2: { f: 'CO₂', name: '이산화 탄소', kind: 'mol', atoms: [['O', -1.16, 0, 0], ['C', 0, 0, 0], ['O', 1.16, 0, 0]], bonds: [[0, 1, 2], [1, 2, 2]] },
    CH4: { f: 'CH₄', name: '메테인', kind: 'mol', atoms: [['C', 0, 0, 0], ['H', T4, T4, T4], ['H', T4, -T4, -T4], ['H', -T4, T4, -T4], ['H', -T4, -T4, T4]], bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1]] },
    NH3: { f: 'NH₃', name: '암모니아', kind: 'mol', atoms: [['N', 0, -0.12, 0], ['H', 0, 0.33, 0.94], ['H', 0.81, 0.33, -0.47], ['H', -0.81, 0.33, -0.47]], bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1]] },
  };
  const KEYS = ['He', 'Cu', 'H2', 'O2', 'N2', 'H2O', 'CO2', 'CH4', 'NH3'];
  // 구리: 면심 입방(최조밀) 조각, 1 Å 단위 (Cu–Cu 약 2.56 Å)
  (function () {
    const d = 2.56 / Math.SQRT2, a = [];
    for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) if ((x + y + z) % 2 === 0 && x * x + y * y + z * z <= 2) a.push(['Cu', x * d, y * d, z * d]);
    MOLS.Cu.atoms = a;
  })();

  window.SciSim3D.attach({
    title: '원자와 분자 3D 모형',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: 6, theta: 0.6, phi: 1.2, min: 3, max: 16 },
    autoRotate: 0.3,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      let key = 'H2O', style = 'ball', split = 0;
      const g = new THREE.Group(); root.add(g);
      const atomObjs = [], bondObjs = [], labs = [];
      const UP = new THREE.Vector3(0, 1, 0);
      const stickMat = new THREE.MeshStandardMaterial({ color: 0xaab4c8, roughness: 0.6 });
      function sphere(r, col) { return new THREE.Mesh(new THREE.SphereGeometry(r, 32, 20), new THREE.MeshStandardMaterial({ color: col, roughness: 0.4, metalness: 0.05 })); }
      function place(m, a, b) {
        const d = b.clone().sub(a), len = Math.max(1e-4, d.length());
        m.position.copy(a).add(b).multiplyScalar(0.5);
        m.quaternion.setFromUnitVectors(UP, d.normalize());
        m.scale.set(1, len, 1);
      }
      function fitCamera() { // 입자 크기와 화면 비율에 맞춰 처음 거리를 정해요
        const v = ctx.renderer.domElement, asp = Math.max(0.3, v.clientWidth / Math.max(1, v.clientHeight));
        const base = key === 'Cu' ? 11 : key === 'He' ? 5 : key === 'CO2' ? 8 : (style === 'space' ? 7.5 : 6);
        ctx.orbit.dist = base * (asp < 1 ? Math.min(2, Math.pow(1 / asp, 0.75)) : 1);
      }
      function clearAll() {
        while (g.children.length) g.remove(g.children[0]);
        atomObjs.length = 0; bondObjs.length = 0; labs.forEach((l) => l.show(false));
      }
      function build() {
        clearAll();
        const M = MOLS[key];
        M.atoms.forEach((a, i) => {
          const s = a[0], m = sphere(style === 'ball' ? RB[s] : RV[s] * 0.62, COL[s]);
          m.userData.base = new THREE.Vector3(a[1], a[2], a[3]);
          m.position.copy(m.userData.base);
          g.add(m); atomObjs.push(m);
          if (!labs[i]) labs[i] = label('', m);
          labs[i].obj = m; labs[i].set(a[0]); labs[i].show(M.atoms.length <= 5); labs[i].off = [0, style === 'ball' ? RB[s] + 0.3 : RV[s] * 0.62 + 0.25, 0];
        });
        M.bonds.forEach(([i, j, o]) => {
          const ms = [];
          const nb = o;
          for (let k = 0; k < nb; k++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(nb > 1 ? 0.05 : 0.08, nb > 1 ? 0.05 : 0.08, 1, 14), stickMat); g.add(m); ms.push(m); }
          bondObjs.push({ i, j, o, ms, show: style === 'ball' });
        });
        refresh();
      }
      function refresh() {
        const M = MOLS[key];
        const f = 1 + split * 1.3;
        atomObjs.forEach((m) => m.position.copy(m.userData.base).multiplyScalar(M.kind === 'mol' ? f : 1));
        bondObjs.forEach((b) => {
          const A = atomObjs[b.i].position, B = atomObjs[b.j].position;
          const dir = B.clone().sub(A).normalize();
          const side = new THREE.Vector3(0, 0, 1);
          if (Math.abs(dir.dot(side)) > 0.9) side.set(0, 1, 0);
          side.cross(dir).normalize();                // 결합 방향에 수직인 방향 (이중·삼중 결합용)
          b.ms.forEach((m, k) => {
            const off = side.clone().multiplyScalar((k - (b.o - 1) / 2) * 0.17);
            place(m, A.clone().add(off), B.clone().add(off));
            m.visible = b.show && split < 0.12;
          });
        });
        text();
      }
      function text() {
        const M = MOLS[key];
        if (M.kind === 'atom') {
          info('<b>' + M.name + ' (' + M.f + ')</b><br>원자 1개가 그대로 하나의 입자예요. 다른 원자와 결합하지 않고 따로따로 떠다녀요.');
        } else if (M.kind === 'metal') {
          info('<b>' + M.name + ' (' + M.f + ')</b><br>분자 없이 <b>원자</b>가 규칙적으로 빈틈없이 쌓여 있어요. 그래서 구리는 원자로 존재하는 물질이에요.<br><span style="color:#9fb0d4">(13개만 떼어 낸 조각)</span>');
        } else {
          const cnt = {}; M.atoms.forEach((a) => { cnt[a[0]] = (cnt[a[0]] || 0) + 1; });
          const parts = Object.keys(cnt).map((s) => NAME[s] + ' 원자 ' + cnt[s] + '개').join(' + ');
          if (split > 0.7) info('<b>분자를 나누었어요!</b><br>' + parts + '로 흩어졌어요. 원자는 더 이상 <b>' + M.name + '</b>의 성질을 갖지 않아요.');
          else if (split > 0.12) info('<b>' + M.name + ' 분자(' + M.f + ')</b>를 나누는 중…<br>결합이 끊어지고 있어요.');
          else info('<b>' + M.name + ' 분자 (' + M.f + ')</b><br>' + parts + '가 결합한 입자 1개예요.<br>' + (key === 'CO2' ? '일직선 모양이에요.' : key === 'H2O' ? '굽은 모양이에요 (결합각 약 104.5°).' : key === 'CH4' ? '탄소가 가운데, 수소 4개가 정사면체 꼭짓점에 있어요.' : key === 'NH3' ? '삼각뿔 모양이에요.' : '두 원자가 붙은 막대 모양이에요.'));
        }
      }
      controls.segment('입자', KEYS.map((k) => ({ value: k, label: MOLS[k].f })), key, (v) => { key = v; split = 0; sl.set(0); fitCamera(); build(); });
      controls.segment('모형', [{ value: 'ball', label: '공-막대' }, { value: 'space', label: '공간 채움' }], style, (v) => { style = v; fitCamera(); build(); });
      const sl = controls.range('나누기', 0, 1, 0.01, 0, (v) => { split = v; refresh(); }, (v) => (v < 0.05 ? '(분자)' : v > 0.95 ? '(원자들)' : Math.round(v * 100) + '%'));
      fitCamera();
      build();
      return {};
    },
  });
})();
