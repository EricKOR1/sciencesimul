/* hc-vsepr · 3D 분자 모형 (공 막대 + 전자 영역)
   전자쌍이 서로 가장 멀어지는 배치를 직접 돌려 보며, 평면 그림에서 109.5°가 왜 '90°가 아닌지' 확인해요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const COL = { C: 0x4b5563, H: 0xf1f5f9, O: 0xe23b3b, N: 0x3867f4, Cl: 0x22b14c, F: 0x9be36b, B: 0xf4a6a6, Be: 0xd6c8a8 };
  const RAD = { C: 0.38, H: 0.24, O: 0.36, N: 0.37, Cl: 0.46, F: 0.33, B: 0.36, Be: 0.36 };
  const D2R = Math.PI / 180;

  // 결합 방향 만들기 (단위 벡터), 비공유 전자쌍 방향
  function polarRing(n, alpha, phase, axisY) { // axisY: +1(위) / -1(아래) 축 둘레에 n개
    const out = [];
    for (let i = 0; i < n; i++) { const p = phase + (i * 2 * Math.PI) / n; out.push([Math.sin(alpha) * Math.cos(p), axisY * Math.cos(alpha), Math.sin(alpha) * Math.sin(p)]); }
    return out;
  }
  function alphaFor3(theta) { // 축 둘레 3개 결합 사이각 theta → 축과의 각 α
    const c = Math.cos(theta * D2R); // cosθ = cos²α − ½ sin²α = 1.5cos²α − 0.5
    return Math.acos(Math.sqrt((c + 0.5) / 1.5));
  }
  const TET = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]].map((v) => v.map((x) => x / Math.sqrt(3)));
  const MOLS = {
    BeCl2: { f: 'BeCl₂', c: 'Be', o: 'Cl', bonds: [[-1, 0, 0], [1, 0, 0]], lp: [], ang: 180, shape: '직선형', order: 1 },
    BF3:   { f: 'BF₃', c: 'B', o: 'F', bonds: polarRing(3, Math.PI / 2, 0, 1), lp: [], ang: 120, shape: '평면 삼각형', order: 1 },
    CH4:   { f: 'CH₄', c: 'C', o: 'H', bonds: TET, lp: [], ang: 109.5, shape: '정사면체', order: 1 },
    NH3:   { f: 'NH₃', c: 'N', o: 'H', bonds: polarRing(3, alphaFor3(107), Math.PI / 6, -1), lp: [[0, 1, 0]], ang: 107, shape: '삼각뿔', order: 1 },
    H2O:   { f: 'H₂O', c: 'O', o: 'H', bonds: [[Math.sin(52.25 * D2R), -Math.cos(52.25 * D2R), 0], [-Math.sin(52.25 * D2R), -Math.cos(52.25 * D2R), 0]], lp: [[0, Math.cos(57 * D2R), Math.sin(57 * D2R)], [0, Math.cos(57 * D2R), -Math.sin(57 * D2R)]], ang: 104.5, shape: '굽은형', order: 1 },
    CO2:   { f: 'CO₂', c: 'C', o: 'O', bonds: [[-1, 0, 0], [1, 0, 0]], lp: [], ang: 180, shape: '직선형', order: 2 },
    HCN:   { f: 'HCN', c: 'C', o: 'H', bonds: [[-1, 0, 0], [1, 0, 0]], outs: [['H', 1, 0.75], ['N', 3, 1]], lp: [], ang: 180, shape: '직선형', order: 1 },
    CCl4:  { f: 'CCl₄', c: 'C', o: 'Cl', bonds: TET, lp: [], ang: 109.5, shape: '정사면체', order: 1 },
  };
  const phone = window.matchMedia && window.matchMedia('(max-width: 599px)').matches;
  window.SciSim3D.attach({
    title: '분자 모양 3D 모형',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대 · 풍선 수와 분자 고르기는 2D와 똑같이 이어져요',
    camera: { dist: phone ? 7.4 : 6.5, theta: 0.7, phi: 1.2, min: 3, max: 14 },
    autoRotate: 0.25,
    levels: [0, 1, 2],
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
      const g = new THREE.Group(); root.add(g);
      const L = 1.6; // 결합 길이
      const angLab = label('', [0, 0, 0], { color: 'rgba(255,211,77,.92)' }); angLab.el.style.color = '#1b2333';
      const atomLabs = []; for (let i = 0; i < 4; i++) { const l = label('', [0, 0, 0], { size: 12.5 }); l.show(false); atomLabs.push(l); }
      function sphere(r, col, opa) { return new THREE.Mesh(new THREE.SphereGeometry(r, 32, 20), new THREE.MeshStandardMaterial({ color: col, roughness: 0.45, metalness: 0.05, transparent: opa < 1, opacity: opa })); }
      function stick(a, b, r, col) {
        const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b), d = vb.clone().sub(va), len = d.length();
        const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 16), new THREE.MeshStandardMaterial({ color: col, roughness: 0.6 }));
        m.position.copy(va).add(vb).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return m;
      }
      function lobe(dir) { // 비공유 전자쌍: 반투명 물방울
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 16), new THREE.MeshStandardMaterial({ color: 0xffd34d, transparent: true, opacity: 0.45, roughness: 0.3, depthWrite: false }));
        m.scale.set(0.8, 1.5, 0.8);
        const v = new THREE.Vector3(...dir).normalize();
        m.position.copy(v.clone().multiplyScalar(0.95)); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v);
        const e1 = sphere(0.09, 0x1b2333, 1), e2 = sphere(0.09, 0x1b2333, 1);
        const side = new THREE.Vector3(0, 1, 0).cross(v); if (side.lengthSq() < 1e-4) side.set(1, 0, 0); side.normalize().multiplyScalar(0.16);
        e1.position.copy(v.clone().multiplyScalar(1.15)).add(side); e2.position.copy(v.clone().multiplyScalar(1.15)).sub(side);
        const grp = new THREE.Group(); grp.add(m, e1, e2); return grp;
      }
      function arc(a, b) {
        const va = new THREE.Vector3(...a).normalize(), vb = new THREE.Vector3(...b).normalize();
        const pts = []; for (let i = 0; i <= 24; i++) { const t = i / 24; pts.push(va.clone().lerp(vb, t).normalize().multiplyScalar(0.75)); }
        if (va.dot(vb) < -0.999) { pts.length = 0; const perp = new THREE.Vector3(0, 1, 0); for (let i = 0; i <= 24; i++) { const t = (i / 24) * Math.PI; pts.push(va.clone().multiplyScalar(Math.cos(t)).add(perp.clone().multiplyScalar(Math.sin(t))).multiplyScalar(0.75)); } }
        return { line: new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xffd34d })), mid: pts[12] };
      }
      const clearG = () => { while (g.children.length) g.remove(g.children[0]); };

      /* 분자 (구조 표 · 비공유 전자쌍 장면) */
      function buildMol(M, showLP, showAng, bonds2) {
        clearG(); atomLabs.forEach((x) => x.show(false));
        g.add(sphere(RAD[M.c], COL[M.c], 1));
        const B = bonds2 || M.bonds;
        B.forEach((d, i) => {
          const out = M.outs ? M.outs[i] : [M.o, M.order, 1], el = out[0], ord = out[1], len = L * (out[2] || 1);
          const p = d.map((x) => x * len), a = sphere(RAD[el], COL[el], 1); a.position.set(...p); g.add(a);
          const dv = new THREE.Vector3(...p).normalize(); let perp = dv.clone().cross(new THREE.Vector3(0, 0, 1)); if (perp.lengthSq() < 0.01) perp = dv.clone().cross(new THREE.Vector3(0, 1, 0)); perp.normalize().multiplyScalar(0.09);
          const offs = ord === 1 ? [0] : ord === 2 ? [-1, 1] : [-1.8, 0, 1.8];
          offs.forEach((o) => g.add(stick(perp.clone().multiplyScalar(o).toArray(), new THREE.Vector3(...p).addScaledVector(perp, o).toArray(), ord === 1 ? 0.09 : ord === 2 ? 0.06 : 0.05, 0x9aa6bf)));
          const l = atomLabs[i]; if (l) { l.obj = a; l.set(el); l.show(true); l.off = [0, 0.5, 0]; }
        });
        if (showLP) M.lp.forEach((d) => g.add(lobe(d)));
        if (showAng && B.length >= 2) { const ar = arc(B[0], B[1]); g.add(ar.line); angLab.obj = ar.mid.toArray(); angLab.set(M.ang + '°'); angLab.show(true); } else angLab.show(false);
      }
      /* 풍선 모형 (전자 영역 2 · 3 · 4개) */
      const BAL_COL = [0xff7a7a, 0x6fb2ff, 0x7be08a, 0xffc14d];
      const IDEAL3 = { 2: [[-1, 0, 0], [1, 0, 0]], 3: polarRing(3, Math.PI / 2, 0, 1), 4: TET };
      const IDEALA = { 2: 180, 3: 120, 4: 109.5 }, SHAPEN = { 2: '직선형', 3: '평면 삼각형', 4: '정사면체' };
      function buildBalloons(n, f, prot) {
        clearG(); atomLabs.forEach((x) => x.show(false));
        const core = sphere(0.22, 0x9aa6bf, 1); g.add(core);
        const dirs = IDEAL3[n].map((d, i) => { const v = new THREE.Vector3(...d), s = new THREE.Vector3(0, 1, 0).multiplyScalar(1.3).addScaledVector(v, 0.45 + 0.1 * i); return s.normalize().lerp(v, f).normalize(); });
        dirs.forEach((v, i) => {
          const m = new THREE.Mesh(new THREE.SphereGeometry(0.62, 28, 18), new THREE.MeshStandardMaterial({ color: BAL_COL[i], transparent: true, opacity: 0.55, roughness: 0.25, depthWrite: false }));
          m.scale.set(0.82, 1.45, 0.82); m.position.copy(v.clone().multiplyScalar(1.15)); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v); g.add(m);
        });
        if (prot && n >= 2) { const ar = arc(dirs[0].toArray(), dirs[1].toArray()); g.add(ar.line); const ang = Math.round(Math.acos(clamp(dirs[0].dot(dirs[1]), -1, 1)) * 1800 / Math.PI) / 10; angLab.obj = ar.mid.toArray(); angLab.set(ang + '°'); angLab.show(true); } else angLab.show(false);
      }

      /* ▶ 재생기 */
      let own = false, sig = '', pB = 0, pL = 0, kind = '', bKey = '';
      const rowOf = () => { const r = document.querySelectorAll('.v3-player'); return r[r.length - 1]; };
      const plB = controls.player({ duration: 6, loop: true, label: '풍선 서로 밀기', phases: [[0, '모여 있는 풍선'], [0.12, '서로 밀어내요'], [0.6, '가장 멀어졌어요'], [0.9, '처음으로']], onFrame(p) { pB = p; own = p > 0 ? 'b' : (own === 'b' ? false : own); } });
      const rowB = rowOf();
      const plL = controls.player({ duration: 9, loop: true, label: '비공유쌍 늘리기', phases: [[0, 'CH₄ · 0쌍'], [0.34, 'NH₃ · 1쌍'], [0.67, 'H₂O · 2쌍']], onFrame(p) { pL = p; own = p > 0 ? 'l' : (own === 'l' ? false : own); } });
      const rowL = rowOf();
      const fB = (p) => (p < 0.12 ? 0 : p < 0.6 ? sm((p - 0.12) / 0.48) : p < 0.9 ? 1 : 1 - sm((p - 0.9) / 0.1));

      return {
        update(dt) {
          const Z = ctx.lesson(); if (!Z) return;
          const S = Z.S, sc = S.scene;
          const k0 = sc === 'balloon' ? 'bal' : sc === 'lone' ? 'lone' : 'tab';
          rowB.style.display = k0 === 'bal' ? '' : 'none'; rowL.style.display = k0 === 'lone' ? '' : 'none';
          if (k0 !== 'bal' && plB.playing) plB.pause(); if (k0 !== 'lone' && plL.playing) plL.pause();
          const sg = [sc, Z.B.n, Z.B.prot, Z.TT.mol, Math.round(Z.LP.sp.target === undefined ? Z.LP.k : Z.LP.k)].join('|');
          if (sg !== sig) { sig = sg; if (own) { own = false; plB.pause(); plB.set(0); plL.pause(); plL.set(0); } }
          if (k0 === 'bal') {
            const n = Z.B.n, f = own === 'b' ? fB(pB) : 1;
            const key = ['b', n, Z.B.prot, Math.round(f * 40)].join('|'); if (key !== bKey) { bKey = key; buildBalloons(n, f, Z.B.prot || own === 'b'); }
            info('<b>전자 영역 ' + n + '개</b> (풍선 ' + n + '개) → <b>' + SHAPEN[n] + '</b><br>풍선(전자쌍)은 서로 밀어내 가장 멀어져요: 결합각 <b>' + IDEALA[n] + '°</b>' + (Z.B.prot || own === 'b' ? '' : '<br>2D의 📐 각도 재기를 누르면 각도를 보여 줘요.') + (n === 4 ? '<br>평면에 그리면 90°처럼 보이지만, 입체에서는 네 방향이 모두 109.5°예요.' : ''));
            return;
          }
          if (k0 === 'lone') {
            const kk = own === 'l' ? (pL < 0.34 ? 0 : pL < 0.67 ? 1 : 2) : clamp(Math.round(Z.LP.sp.value), 0, 2), key = 'l' + kk; if (key !== bKey) { bKey = key; const M = MOLS[['CH4', 'NH3', 'H2O'][kk]]; buildMol(M, true, true); }
            const M = MOLS[['CH4', 'NH3', 'H2O'][kk]], nd = M.bonds.length + M.lp.length;
            info('<b>' + M.f + '</b> · ' + M.shape + '<br>전자 영역 ' + nd + '개 (결합 ' + M.bonds.length + ' · 비공유 전자쌍 ' + M.lp.length + '쌍) · 결합각 <b>' + M.ang + '°</b><br>CH₄ 109.5° → NH₃ 107° → H₂O 104.5°' + (M.lp.length ? '<br><span style="color:#ffd34d">노란 구름</span> = 비공유 전자쌍: 결합 전자쌍을 더 세게 밀어 결합각이 작아져요.' : ''));
            return;
          }
          // 구조 표 (BeCl₂ · BF₃ · CH₄ · CO₂ · HCN · CCl₄)
          const mk = Z.TT.mol, M = MOLS[mk]; if (!M) return;
          const built = !!Z.TT.built[mk], key = 't' + mk + built; if (key !== bKey) { bKey = key; buildMol(M, true, built); }
          info('<b>' + M.f + '</b>' + (built ? ' · ' + M.shape : '') + '<br>전자 영역 ' + (built ? (M.bonds.length + M.lp.length) + '개 · 결합각 <b>' + M.ang + '°</b> (다중 결합은 영역 1개)' : '를 세어 풍선 모형을 만들어 보세요. 다중 결합은 영역 1개로 세요.'));
        },
      };
    },
  });
})();
