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
  };
  const KEYS = ['BeCl2', 'BF3', 'CH4', 'NH3', 'H2O', 'CO2'];

  window.SciSim3D.attach({
    title: '분자 모양 3D 모형',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: 6.5, theta: 0.7, phi: 1.2, min: 3, max: 14 },
    autoRotate: 0.35,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      let mol = 'CH4', showLP = true, showAng = true;
      const g = new THREE.Group(); root.add(g);
      const L = 1.6; // 결합 길이
      const angLab = label('', [0, 0, 0], { color: 'rgba(255,211,77,.92)' }); angLab.el.style.color = '#1b2333';
      const atomLabs = [];
      function sphere(r, col, opa) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 20), new THREE.MeshStandardMaterial({ color: col, roughness: 0.45, metalness: 0.05, transparent: opa < 1, opacity: opa }));
        return m;
      }
      function stick(a, b, r, col) {
        const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b), d = vb.clone().sub(va), len = d.length();
        const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 16), new THREE.MeshStandardMaterial({ color: col, roughness: 0.6 }));
        m.position.copy(va).add(vb).multiplyScalar(0.5);
        m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
        return m;
      }
      function lobe(dir) { // 비공유 전자쌍: 반투명 물방울
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 16), new THREE.MeshStandardMaterial({ color: 0xffd34d, transparent: true, opacity: 0.45, roughness: 0.3, depthWrite: false }));
        m.scale.set(0.8, 1.5, 0.8);
        const v = new THREE.Vector3(...dir).normalize();
        m.position.copy(v.clone().multiplyScalar(0.95));
        m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v);
        const e1 = sphere(0.09, 0x1b2333, 1), e2 = sphere(0.09, 0x1b2333, 1);
        const side = new THREE.Vector3(0, 1, 0).cross(v); if (side.lengthSq() < 1e-4) side.set(1, 0, 0); side.normalize().multiplyScalar(0.16);
        e1.position.copy(v.clone().multiplyScalar(1.15)).add(side); e2.position.copy(v.clone().multiplyScalar(1.15)).sub(side);
        const grp = new THREE.Group(); grp.add(m, e1, e2); return grp;
      }
      function arc(a, b) { // 두 결합 사이 각도 호
        const va = new THREE.Vector3(...a).normalize(), vb = new THREE.Vector3(...b).normalize();
        const pts = []; for (let i = 0; i <= 24; i++) { const t = i / 24; pts.push(va.clone().lerp(vb, t).normalize().multiplyScalar(0.75)); }
        if (va.dot(vb) < -0.999) { pts.length = 0; const perp = new THREE.Vector3(0, 1, 0); for (let i = 0; i <= 24; i++) { const t = (i / 24) * Math.PI; pts.push(va.clone().multiplyScalar(Math.cos(t)).add(perp.clone().multiplyScalar(Math.sin(t))).multiplyScalar(0.75)); } }
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        return { line: new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffd34d })), mid: pts[12] };
      }
      function buildMol() {
        while (g.children.length) g.remove(g.children[0]);
        atomLabs.forEach((x) => x.show(false));
        const M = MOLS[mol];
        g.add(sphere(RAD[M.c], COL[M.c], 1));
        M.bonds.forEach((d, i) => {
          const p = d.map((x) => x * L);
          const a = sphere(RAD[M.o], COL[M.o], 1); a.position.set(...p); g.add(a);
          if (M.order === 2) { // 이중 결합: 막대 두 개
            const off = new THREE.Vector3(0, 0, 0.09);
            g.add(stick(off.toArray(), new THREE.Vector3(...p).add(off).toArray(), 0.06, 0x9aa6bf));
            g.add(stick(off.clone().negate().toArray(), new THREE.Vector3(...p).sub(off).toArray(), 0.06, 0x9aa6bf));
          } else g.add(stick([0, 0, 0], p, 0.09, 0x9aa6bf));
          if (!atomLabs[i]) atomLabs[i] = label('', a);
          atomLabs[i].obj = a; atomLabs[i].set(M.o); atomLabs[i].show(true); atomLabs[i].off = [0, 0.5, 0];
        });
        if (showLP) M.lp.forEach((d) => g.add(lobe(d)));
        if (showAng && M.bonds.length >= 2) {
          const ar = arc(M.bonds[0], M.bonds[1]); g.add(ar.line);
          angLab.obj = ar.mid.toArray(); angLab.set(M.ang + '°'); angLab.show(true);
        } else angLab.show(false);
        const nd = M.bonds.length + M.lp.length;
        info('<b>' + M.f + '</b> · ' + M.shape + '<br>전자 영역 ' + nd + '개 (결합 ' + M.bonds.length + ' · 비공유 전자쌍 ' + M.lp.length + ')<br>결합각 <b>' + M.ang + '°</b>' +
          (M.lp.length ? '<br><span style="color:#ffd34d">노란 구름</span> = 비공유 전자쌍: 결합 전자쌍을 더 세게 밀어 결합각이 작아져요.' : (nd === 4 ? '<br>평면에 그리면 90°처럼 보이지만, 입체에서는 네 방향이 모두 109.5°로 같아요.' : '')));
      }
      controls.segment('분자', KEYS.map((k) => ({ value: k, label: MOLS[k].f })), mol, (v) => { mol = v; buildMol(); });
      const lpB = controls.button('비공유 전자쌍 ✓', () => { showLP = !showLP; lpB.classList.toggle('on', showLP); lpB.textContent = '비공유 전자쌍 ' + (showLP ? '✓' : '✕'); buildMol(); }); lpB.classList.add('on');
      const anB = controls.button('결합각 ✓', () => { showAng = !showAng; anB.classList.toggle('on', showAng); anB.textContent = '결합각 ' + (showAng ? '✓' : '✕'); buildMol(); }); anB.classList.add('on');
      buildMol();
      return {};
    },
  });
})();
