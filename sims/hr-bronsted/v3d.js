/* hr-bronsted · 3D 양성자(H⁺) 이동  (2단계 'H⁺ 옮기기'와 3단계 '짝산·짝염기'의 반응과 같아요)
   브뢴스테드·라우리 산은 H⁺를 주는 물질, 염기는 H⁺를 받는 물질이에요.
   2D에서 고른 반응(HCl + H₂O · H₂O + NH₃ · HCl(g) + NH₃(g) · CH₃COOH + H₂O)을 보여 주고, ▶ 재생하면 H⁺ 하나가 산에서 염기의 비공유 전자쌍으로 옮겨 가요.
   결합 길이·각은 실제에 가깝게 그린 모형 스케치예요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const CPK = { H: 0xf1f5f9, O: 0xe23b3b, N: 0x3867f4, Cl: 0x22b14c, C: 0x4b5563 };
  const RAD = { H: 0.34, O: 0.55, N: 0.55, Cl: 0.7, C: 0.55 };
  const sstep = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
  const V = (x, y, z) => [x, y, z];
  const pyr = (c, sx, tilt) => [0, 120, 240].map((a) => { const r = a * Math.PI / 180; return V(c[0] + sx * 0.4, c[1] + 0.92 * Math.cos(r), c[2] + 0.92 * Math.sin(r) - tilt); });

  /* 각 반응: atoms [원소, 처음, 끝, 역할], bonds [i,j,'시작에만'|'끝에만'|'항상'] */
  const RX = {
    hcl: {
      name: 'HCl + H₂O → Cl⁻ + H₃O⁺', acid: 'HCl', base: 'H₂O', conjB: 'Cl⁻', conjA: 'H₃O⁺', rev: false,
      atoms: [['Cl', V(-2.6, 0, 0), V(-3.0, 0, 0)], ['H', V(-1.33, 0, 0), V(0.1, 0, -0.75)], ['O', V(1.0, 0, 0), V(1.0, 0, 0)], ['H', V(1.5, 0.78, -0.45), V(1.5, 0.78, -0.45)], ['H', V(1.5, -0.78, -0.45), V(1.5, -0.78, -0.45)]],
      bonds: [[0, 1, 's'], [1, 2, 'e'], [2, 3, 'a'], [2, 4, 'a']], proton: 1, donor: 0, acc: 2,
      roles: { acid: 0, base: 2, conjB: 0, conjA: 2 },
      note: 'HCl은 H⁺를 주는 산이에요. 물은 H⁺를 받는 염기로 작용해 H₃O⁺이 돼요. (센 산이라 → 로 써요)',
    },
    nh3: {
      name: 'NH₃ + H₂O ⇌ NH₄⁺ + OH⁻', acid: 'H₂O', base: 'NH₃', conjB: 'OH⁻', conjA: 'NH₄⁺', rev: true,
      atoms: [['N', V(-1.5, 0, 0), V(-1.5, 0, 0)], ['H', V(-2.0, 0.92, 0), V(-2.0, 0.92, 0)], ['H', V(-2.0, -0.46, 0.8), V(-2.0, -0.46, 0.8)], ['H', V(-2.0, -0.46, -0.8), V(-2.0, -0.46, -0.8)],
        ['O', V(1.9, 0, 0), V(2.1, 0, 0)], ['H', V(0.95, 0, 0), V(-0.45, 0, 0)], ['H', V(2.5, 0.78, 0), V(2.8, 0.78, 0)]],
      bonds: [[0, 1, 'a'], [0, 2, 'a'], [0, 3, 'a'], [4, 5, 's'], [0, 5, 'e'], [4, 6, 'a']], proton: 5, donor: 4, acc: 0,
      roles: { acid: 4, base: 0, conjB: 4, conjA: 0 },
      note: 'NH₃에는 OH⁻가 없어도 H⁺를 받는 염기예요. 이때 물은 H⁺를 주는 산으로 작용해요.',
    },
    hclg: {
      name: 'HCl(g) + NH₃(g) → NH₄Cl(s)', acid: 'HCl', base: 'NH₃', conjB: 'Cl⁻', conjA: 'NH₄⁺', rev: false,
      atoms: [['Cl', V(-2.8, 0, 0), V(-3.2, 0, 0)], ['H', V(-1.45, 0, 0), V(0.62, 0, 0)], ['N', V(1.7, 0, 0), V(1.7, 0, 0)], ['H', V(2.2, 0.92, 0), V(2.2, 0.92, 0)], ['H', V(2.2, -0.46, 0.8), V(2.2, -0.46, 0.8)], ['H', V(2.2, -0.46, -0.8), V(2.2, -0.46, -0.8)]],
      bonds: [[0, 1, 's'], [1, 2, 'e'], [2, 3, 'a'], [2, 4, 'a'], [2, 5, 'a']], proton: 1, donor: 0, acc: 2,
      note: '물이 없어도 같은 규칙이에요. 기체 HCl이 H⁺를 주고 기체 NH₃가 받아요. 생긴 NH₄⁺와 Cl⁻가 끌어당겨 NH₄Cl(흰 고체)이 돼요.',
    },
    ch3: {
      name: 'CH₃COOH + H₂O ⇌ CH₃COO⁻ + H₃O⁺', acid: 'CH₃COOH', base: 'H₂O', conjB: 'CH₃COO⁻', conjA: 'H₃O⁺', rev: true,
      atoms: [['C', V(-4.0, -0.2, 0), V(-4.0, -0.2, 0)], ['H', V(-4.6, 0.7, 0), V(-4.6, 0.7, 0)], ['H', V(-4.5, -0.6, 0.85), V(-4.5, -0.6, 0.85)], ['H', V(-4.5, -0.6, -0.85), V(-4.5, -0.6, -0.85)],
        ['C', V(-2.6, 0.2, 0), V(-2.6, 0.2, 0)], ['O', V(-2.2, 1.4, 0), V(-2.2, 1.4, 0)], ['O', V(-1.8, -0.6, 0), V(-2.0, -0.6, 0)], ['H', V(-0.85, -0.6, 0), V(0.25, -0.6, -0.75)],
        ['O', V(1.3, -0.6, 0), V(1.1, -0.6, 0)], ['H', V(1.9, 0.2, -0.45), V(1.9, 0.2, -0.45)], ['H', V(1.9, -1.4, -0.45), V(1.9, -1.4, -0.45)]],
      bonds: [[0, 1, 'a'], [0, 2, 'a'], [0, 3, 'a'], [0, 4, 'a'], [4, 5, 'a'], [4, 6, 'a'], [6, 7, 's'], [8, 7, 'e'], [8, 9, 'a'], [8, 10, 'a']], proton: 7, donor: 6, acc: 8,
      note: '아세트산은 약한 산이라 정반응과 역반응이 함께 일어나는 동적 평형이 돼요. H⁺를 주고 남은 CH₃COO⁻가 짝염기예요.',
    },
  };
  const KEYS = ['hcl', 'nh3', 'hclg', 'ch3'];

  window.SciSim3D.attach({
    title: 'H⁺ 이동 3D (산과 염기)',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHONE ? 12.5 : 9.5, theta: 0.35, phi: 1.25, min: 5, max: 22, target: [0, 0, 0] },
    autoRotate: 0,
    levels: [1, 2],   // 2단계(H⁺ 옮기기) · 3단계(짝산·짝염기). 1·4단계는 2D 화면이에요
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3, UP = new V3(0, 1, 0);
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.38, metalness: 0.05 }, o || {}));
      const g = new THREE.Group(); root.add(g);
      let key = 'hcl', prog = 0, meshes = [], bonds = [], halo = null, labs = [];
      let showRole = true;

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
      /* 2D가 고른 반응 · 진행 상태를 따라가요 (2D 조작판에서 반응을 골라요) */
      const MAPK = { a: 'hcl', b: 'nh3', c: 'hclg', hcl: 'hcl', nh3: 'nh3', ch3: 'ch3' };
      const W = () => window.__sim || null;
      function from2D() {
        const w = W(), S = w && w.S; if (!S) return { key: key, after: 0, md: '' };
        const md = S.mode;
        if (md === 'move' && S.mv) return { md, key: MAPK[S.mv.k] || 'hcl', after: S.mv.r && S.mv.r[S.mv.k] && S.mv.r[S.mv.k].done ? 1 : 0 };
        if (md === 'pairs' && S.pr) return { md, key: MAPK[S.pr.k] || 'nh3', after: S.pr.after && S.pr.dirShown === 'f' ? 1 : 0 };
        return { md, key: key, after: 0 };
      }
      let demo = false, txt = '', sigK = '';
      const pl = controls.player({
        duration: 8, loop: true, autoplay: false, label: 'H⁺ 이동 재생',
        phases: [[0, '반응 전'], [0.12, 'H⁺ 이동'], [0.45, '반응 후 (짝산 · 짝염기)'], [0.62, '역반응'], [0.9, '반응 전']],
        onFrame(p) {
          if (!meshes.length) return;
          const R = RX[key];
          if (p < 0.12) prog = 0; else if (p < 0.45) prog = (p - 0.12) / 0.33; else if (p < 0.62 || !R.rev) prog = 1; else if (p < 0.9) prog = 1 - (p - 0.62) / 0.28; else prog = 0;
          demo = true; place();
        },
      });
      const demoOn = () => demo && (pl.playing || pl.p > 0.0005);
      build();
      return {
        update(dt) {
          dt = Math.min(dt, 0.05);
          const q = from2D();
          if (q.key !== key) { key = q.key; build(); pl.pause(); pl.set(0); demo = false; }
          const md = q.md;
          if (!demoOn()) prog += ((md === 'move' || md === 'pairs' ? q.after : 0) - prog) * Math.min(1, dt * 4);
          place();
          const R = RX[key], after = prog > 0.5;
          const other = md !== 'move' && md !== 'pairs';
          const t = '<b>' + R.name + '</b><br>' + R.note + '<br>' + (after ? '반응 후: 산은 <b>짝염기</b>, 염기는 <b>짝산</b>이 돼요.' : '반응 전: <b>' + R.acid + '</b>(산) → H⁺ → <b>' + R.base + '</b>(염기)') + (other && !demoOn() ? '<br><span style="color:#9fb0d4">이 단계(관찰 · 구별하기)는 2D 화면에서 해요.</span>' : '');
          if (t !== txt) { txt = t; info(t); }
        },
      };
    },
  });
})();
