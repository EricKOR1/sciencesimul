/* h1-conductor · 3D 도체·부도체·반도체 (원자 격자와 전자)
   도체는 자유롭게 움직이는 전자가 많아 전압을 걸면 전류가 잘 흐르고, 부도체는 전자가 묶여 있어요.
   반도체는 평소엔 자유전자가 적지만 온도·불순물·빛으로 늘어나요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const NX = 6, NY = 3, NZ = 3, SP = 1.4;
  const MAT = {
    metal: { name: '도체 (구리 등 금속)', atom: 0xe39a45 },
    semi: { name: '반도체 (규소)', atom: 0x9aa9c9 },
    insul: { name: '부도체 (유리·고무)', atom: 0xc9d4ea },
  };

  window.SciSim3D.attach({
    title: '도체·부도체·반도체 3D',
    camera: { dist: PHN ? 15 : 11, theta: 0.55, phi: 1.2, min: 6, max: 26 },
    levels: [1],
    autoRotate: 0.12,
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.4, metalness: 0.1 }, o || {}));
      let mat = 'metal', V = 0.6, Tm = 0.3, dope = false;
      const W = (NX - 1) * SP, H = (NY - 1) * SP, Dp = (NZ - 1) * SP;
      /* 원자 격자 */
      const A = NX * NY * NZ, aGeo = new THREE.IcosahedronGeometry(0.27, 2);
      const atoms = new THREE.InstancedMesh(aGeo, std(MAT.metal.atom, { roughness: 0.3, metalness: 0.5 }), A); root.add(atoms);
      const home = [];
      for (let i = 0; i < NX; i++) for (let j = 0; j < NY; j++) for (let k = 0; k < NZ; k++) home.push(new THREE.Vector3(i * SP - W / 2, j * SP - H / 2, k * SP - Dp / 2));
      /* 전극 판 */
      const plate = (x, c) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.22, H + 1.6, Dp + 1.6), std(c, { roughness: 0.35, metalness: 0.6 })); m.position.x = x; root.add(m); return m; };
      const pL = plate(-W / 2 - 1.1, 0x2f6df6), pR = plate(W / 2 + 1.1, 0xe2464b);
      label('−', pL, { offset: [0, (H + 1.6) / 2 + 0.5, 0], size: 17 }); label('+', pR, { offset: [0, (H + 1.6) / 2 + 0.5, 0], size: 17 });
      const curLab = label('', [0, -H / 2 - 1.4, 0], { color: 'rgba(255,211,77,.92)' }); curLab.el.style.color = '#1b2333';
      /* 전자 */
      const NE = 160, eGeo = new THREE.IcosahedronGeometry(0.15, 1);
      const eMesh = new THREE.InstancedMesh(eGeo, std(0x62b4ff, { emissive: 0x1a5fb0, emissiveIntensity: 0.9, roughness: 0.2 }), NE); root.add(eMesh);
      const eB = new THREE.InstancedMesh(eGeo, std(0x62b4ff, { emissive: 0x1a5fb0, emissiveIntensity: 0.6, roughness: 0.3 }), A); root.add(eB); // 원자에 묶인 전자
      const hMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.15, 1), std(0xffd34d, { emissive: 0x7a5a00, emissiveIntensity: 0.6, transparent: true, opacity: 0.8 }), 80); root.add(hMesh);
      const E = []; for (let i = 0; i < NE; i++) E.push({ p: new THREE.Vector3((Math.random() - 0.5) * W, (Math.random() - 0.5) * H, (Math.random() - 0.5) * Dp), v: new THREE.Vector3(), ph: Math.random() * 6.28 });
      const dummy = new THREE.Object3D();
      let nFree = 0, nHole = 0;
      function setN() {
        if (mat === 'metal') { nFree = NE; nHole = 0; }
        else if (mat === 'insul') { nFree = 0; nHole = 0; }
        else { nFree = Math.round(12 + Tm * 55 + (dope ? 90 : 0)); nHole = 0; }
        eB.visible = mat !== 'metal';
        atoms.material.color.setHex(MAT[mat].atom); atoms.material.metalness = mat === 'metal' ? 0.6 : 0.15;
        const cur = nFree * V;
        curLab.set(mat === 'insul' ? '전류 거의 없음' : mat === 'metal' ? '전류 잘 흘러요' : cur < 14 ? '전류 약함' : cur < 40 ? '전류 중간' : '전류 커져요');
        const txt = { metal: '<b>도체</b>: 원자 사이를 자유롭게 돌아다니는 <b>자유전자</b>가 많아요. 전압을 걸면 + 극 쪽으로 몰려 전류가 흘러요.', insul: '<b>부도체</b>: 전자가 원자에 단단히 묶여 있어 움직이지 못해요. 전압을 걸어도 전류가 거의 흐르지 않아요.', semi: '<b>반도체</b>: 평소에는 자유전자가 적어요. <b>온도</b>를 높이거나 <b>불순물</b>을 넣으면 전자가 늘어 전류가 흘러요.' };
        info(txt[mat]);
      }
      const bSemi = [];
      function setMat(m) {
        mat = m; setN(); segM.set(m);
        [...semiCtl].forEach((e) => { e.style.display = m === 'semi' ? '' : 'none'; });
      }
      const segM = controls.segment('물질', [{ value: 'metal', label: '도체' }, { value: 'semi', label: '반도체' }, { value: 'insul', label: '부도체' }], mat, setMat);
      controls.range('전압', 0, 100, 5, V * 100, (v) => { V = v / 100; setN(); }, (v) => v + '%');
      const n0 = document.querySelector('.v3-ctl').children.length;
      controls.range('온도', 0, 100, 5, Tm * 100, (v) => { Tm = v / 100; setN(); }, (v) => v + '%');
      const bD = controls.button('불순물(인) 넣기', () => { dope = !dope; bD.classList.toggle('on', dope); bD.textContent = dope ? '불순물 넣음 ✓' : '불순물(인) 넣기'; setN(); });
      const semiCtl = [...document.querySelector('.v3-ctl').children].slice(n0);
      setMat('metal');
      let hole = 0;
      return {
        update(dt, t) {
          const amp = 0.04 + Tm * 0.09;
          for (let a = 0; a < A; a++) {
            const h = home[a]; dummy.position.set(h.x + Math.sin(t * 9 + a * 1.7) * amp, h.y + Math.sin(t * 8 + a * 2.3) * amp, h.z + Math.cos(t * 7 + a) * amp);
            dummy.scale.setScalar(1); dummy.updateMatrix(); atoms.setMatrixAt(a, dummy.matrix);
            if (mat !== 'metal') {
              const free = mat === 'semi' && a < nFree * 0.0; // 묶인 전자는 원자 둘레를 돌아요
              const ang = t * 3 + a, r = 0.42;
              dummy.position.set(h.x + Math.cos(ang) * r, h.y + Math.sin(ang * 0.8) * 0.18, h.z + Math.sin(ang) * r); dummy.scale.setScalar(mat === 'semi' && a % 5 < 1 && (a < (nFree + nHole) * 0.5) ? 0.0001 : 1); dummy.updateMatrix(); eB.setMatrixAt(a, dummy.matrix);
            }
          }
          atoms.instanceMatrix.needsUpdate = true; if (mat !== 'metal') eB.instanceMatrix.needsUpdate = true;
          const drift = V * 2.4;
          for (let i = 0; i < NE; i++) {
            const e = E[i];
            if (i < nFree) {
              e.v.x += (Math.random() - 0.5) * 0.9 + (drift - e.v.x) * 0.06; e.v.y += (Math.random() - 0.5) * 0.9 - e.v.y * 0.1; e.v.z += (Math.random() - 0.5) * 0.9 - e.v.z * 0.1;
              e.p.addScaledVector(e.v, dt * (0.5 + Tm * 0.6));
              const bx = W / 2 + 0.7, by = H / 2 + 0.5, bz = Dp / 2 + 0.5;
              if (e.p.x > bx) e.p.x = -bx; if (e.p.x < -bx) e.p.x = bx;
              if (Math.abs(e.p.y) > by) { e.p.y = Math.sign(e.p.y) * by; e.v.y *= -1; } if (Math.abs(e.p.z) > bz) { e.p.z = Math.sign(e.p.z) * bz; e.v.z *= -1; }
              dummy.position.copy(e.p); dummy.scale.setScalar(1);
            } else { dummy.position.set(0, 0, 0); dummy.scale.setScalar(0.0001); }
            dummy.updateMatrix(); eMesh.setMatrixAt(i, dummy.matrix);
          }
          eMesh.instanceMatrix.needsUpdate = true;
          // 양공(반도체): 전자와 반대 방향으로 천천히 이동
          for (let i = 0; i < 80; i++) {
            if (i < nHole) { const hh = home[(i * 7) % A]; const dx = ((t * V * 0.5 * -1 + i * 0.37) % 1 + 1) % 1; dummy.position.set(hh.x + 0.0 - 0, hh.y + 0.55, hh.z); dummy.position.x = W / 2 - dx * W; dummy.scale.setScalar(1); } else { dummy.position.set(0, 0, 0); dummy.scale.setScalar(0.0001); }
            dummy.updateMatrix(); hMesh.setMatrixAt(i, dummy.matrix);
          }
          hMesh.instanceMatrix.needsUpdate = true; hMesh.visible = nHole > 0;
        },
        sync() {},
      };
    },
  });
})();
