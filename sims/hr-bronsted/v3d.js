/* hr-bronsted · 3D 양성자(H⁺) 이동
   브뢴스테드·라우리 산은 H⁺를 주는 물질, 염기는 H⁺를 받는 물질이에요.
   슬라이더를 움직이거나 재생하면 H⁺ 하나가 산에서 염기의 비공유 전자쌍으로 옮겨 가는 모습을 볼 수 있어요.
   결합 길이·각은 실제에 가깝게 그린 모형 스케치예요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const CPK = { H: 0xf1f5f9, O: 0xe23b3b, N: 0x3867f4, Cl: 0x22b14c };
  const RAD = { H: 0.34, O: 0.55, N: 0.55, Cl: 0.7 };
  const sstep = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
  const V = (x, y, z) => [x, y, z];
  const pyr = (c, sx, tilt) => [0, 120, 240].map((a) => { const r = a * Math.PI / 180; return V(c[0] + sx * 0.4, c[1] + 0.92 * Math.cos(r), c[2] + 0.92 * Math.sin(r) - tilt); });

  /* 각 반응: atoms [원소, 처음, 끝, 역할], bonds [i,j,'시작에만'|'끝에만'|'항상'] */
  const RX = {
    hcl: {
      name: 'HCl + H₂O → H₃O⁺ + Cl⁻', acid: 'HCl', base: 'H₂O', conjB: 'Cl⁻', conjA: 'H₃O⁺',
      atoms: [['Cl', V(-2.6, 0, 0), V(-3.0, 0, 0)], ['H', V(-1.33, 0, 0), V(0.1, 0, -0.75)], ['O', V(1.0, 0, 0), V(1.0, 0, 0)], ['H', V(1.5, 0.78, -0.45), V(1.5, 0.78, -0.45)], ['H', V(1.5, -0.78, -0.45), V(1.5, -0.78, -0.45)]],
      bonds: [[0, 1, 's'], [1, 2, 'e'], [2, 3, 'a'], [2, 4, 'a']], proton: 1, donor: 0, acc: 2,
      roles: { acid: 0, base: 2, conjB: 0, conjA: 2 },
      note: 'HCl은 H⁺를 물에 주는 산이에요. 물은 H⁺를 받아 H₃O⁺(하이드로늄 이온)이 돼요.',
    },
    nh3: {
      name: 'NH₃ + H₂O ⇌ NH₄⁺ + OH⁻', acid: 'H₂O', base: 'NH₃', conjB: 'OH⁻', conjA: 'NH₄⁺',
      atoms: [['N', V(-1.5, 0, 0), V(-1.5, 0, 0)], ['H', V(-2.0, 0.92, 0), V(-2.0, 0.92, 0)], ['H', V(-2.0, -0.46, 0.8), V(-2.0, -0.46, 0.8)], ['H', V(-2.0, -0.46, -0.8), V(-2.0, -0.46, -0.8)],
        ['O', V(1.9, 0, 0), V(2.1, 0, 0)], ['H', V(0.95, 0, 0), V(-0.45, 0, 0)], ['H', V(2.5, 0.78, 0), V(2.8, 0.78, 0)]],
      bonds: [[0, 1, 'a'], [0, 2, 'a'], [0, 3, 'a'], [4, 5, 's'], [0, 5, 'e'], [4, 6, 'a']], proton: 5, donor: 4, acc: 0,
      roles: { acid: 4, base: 0, conjB: 4, conjA: 0 },
      note: 'NH₃는 물에서 H⁺를 받는 염기예요. 이때 물은 H⁺를 주는 산으로 작용해요.',
    },
    h2o: {
      name: 'H₂O + H₂O ⇌ H₃O⁺ + OH⁻', acid: 'H₂O', base: 'H₂O', conjB: 'OH⁻', conjA: 'H₃O⁺',
      atoms: [['O', V(-1.3, 0, 0), V(-1.3, 0, 0)], ['H', V(-1.9, 0.78, -0.45), V(-1.9, 0.78, -0.45)], ['H', V(-1.9, -0.78, -0.45), V(-1.9, -0.78, -0.45)],
        ['O', V(1.5, 0, 0), V(1.7, 0, 0)], ['H', V(0.55, 0, 0), V(-0.45, 0, -0.75)], ['H', V(2.1, 0.78, 0), V(2.4, 0.78, 0)]],
      bonds: [[0, 1, 'a'], [0, 2, 'a'], [3, 4, 's'], [0, 4, 'e'], [3, 5, 'a']], proton: 4, donor: 3, acc: 0,
      roles: { acid: 3, base: 0, conjB: 3, conjA: 0 },
      note: '물은 산으로도, 염기로도 작용해요(양쪽성). 물끼리 아주 조금 H⁺를 주고받아요.',
    },
  };
  const KEYS = ['hcl', 'nh3', 'h2o'];

  window.SciSim3D.attach({
    title: 'H⁺ 이동 3D (산과 염기)',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHONE ? 12.5 : 9.5, theta: 0.35, phi: 1.25, min: 5, max: 22, target: [0, 0, 0] },
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3, UP = new V3(0, 1, 0);
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.38, metalness: 0.05 }, o || {}));
      const g = new THREE.Group(); root.add(g);
      let key = 'hcl', prog = 0, playing = true, dir = 1, meshes = [], bonds = [], halo = null, labs = [];
      let showRole = true, pauseT = 0;

      function build() {
        while (g.children.length) g.remove(g.children[0]);
        labs.forEach((l) => l.show(false)); labs = []; meshes = []; bonds = [];
        const R = RX[key];
        R.atoms.forEach(([el, p0]) => { const m = new THREE.Mesh(new THREE.SphereGeometry(RAD[el], 36, 26), mat(CPK[el])); m.position.set(...p0); g.add(m); meshes.push(m); });
        R.bonds.forEach(() => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 1, 14), mat(0xb4bfd2, { transparent: true })); g.add(m); bonds.push(m); });
        halo = new THREE.Mesh(new THREE.SphereGeometry(0.62, 28, 20), mat(0xffd34d, { transparent: true, opacity: 0.4, emissive: 0xffa500, emissiveIntensity: 0.6, depthWrite: false })); g.add(halo);
        const mk = (idx, txt, col) => { const l = label(txt, meshes[idx], { color: col, offset: [0, 1.15, 0] }); labs.push(l); return l; };
        labs.donor = mk(R.donor, '', 'rgba(226,59,59,.92)'); labs.acc = mk(R.acc, '', 'rgba(59,110,226,.92)');
        labs.h = label('H⁺', meshes[R.proton], { color: 'rgba(180,120,0,.92)', offset: [0, -0.9, 0] }); labs.push(labs.h);
        place();
      }
      function place() {
        const R = RX[key], f = sstep(prog);
        R.atoms.forEach(([, p0, p1], i) => {
          let ff = f; if (i === R.proton) { ff = f; }
          const m = meshes[i]; m.position.set(p0[0] + (p1[0] - p0[0]) * ff, p0[1] + (p1[1] - p0[1]) * ff, p0[2] + (p1[2] - p0[2]) * ff);
          if (i === R.proton) { const arc = Math.sin(Math.PI * ff) * 0.55; m.position.y += arc; }
        });
        R.bonds.forEach(([a, b, when], i) => {
          const m = bonds[i], p = meshes[a].position, q = meshes[b].position, d = q.clone().sub(p), L = d.length();
          let o = 1;
          if (when === 's') o = 1 - sstep((f - 0.25) / 0.4); else if (when === 'e') o = sstep((f - 0.45) / 0.4);
          m.visible = o > 0.04; m.material.opacity = o; m.scale.set(1, Math.max(0.01, L), 1); m.position.copy(p).add(q).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(UP, d.normalize());
        });
        halo.position.copy(meshes[R.proton].position); halo.scale.setScalar(1 + 0.12 * Math.sin(performance.now() / 180));
        const after = f > 0.5;
        labs.donor.set(showRole ? (after ? '짝염기 ' + R.conjB : '산 ' + R.acid) : R.acid); labs.acc.set(showRole ? (after ? '짝산 ' + R.conjA : '염기 ' + R.base) : R.base);
        labs.donor.show(true); labs.acc.show(true); labs.h.show(f < 0.98);
      }
      const seg = controls.segment('반응', [{ value: 'hcl', label: 'HCl + H₂O' }, { value: 'nh3', label: 'NH₃ + H₂O' }, { value: 'h2o', label: 'H₂O + H₂O' }], key, (v) => { key = v; prog = 0; pauseT = 0; build(); });
      const sl = controls.range('H⁺ 이동', 0, 100, 1, 0, (v) => { prog = v / 100; playing = false; pb.textContent = '▶ 재생'; place(); }, (v) => v + ' %');
      const pb = controls.button('⏸ 멈춤', () => { playing = !playing; pb.textContent = playing ? '⏸ 멈춤' : '▶ 재생'; });
      let txt = '';
      build();
      return {
        update(dt) {
          dt = Math.min(dt, 0.05);
          if (playing) {
            if (pauseT > 0) pauseT -= dt; else { prog += dir * dt * 0.28; if (prog >= 1) { prog = 1; pauseT = 1.6; dir = -1; } else if (prog <= 0) { prog = 0; pauseT = 1.0; dir = 1; } }
            sl.set(Math.round(prog * 100));
          }
          place();
          const R = RX[key], after = prog > 0.5;
          const t = '<b>' + R.name + '</b><br>' + R.note + '<br>' + (after ? '반응 후: 산은 <b>짝염기</b>, 염기는 <b>짝산</b>이 돼요.' : '반응 전: <b>' + R.acid + '</b>(산) → H⁺ → <b>' + R.base + '</b>(염기)');
          if (t !== txt) { txt = t; info(t); }
        },
      };
    },
  });
})();
