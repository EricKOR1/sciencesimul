/* hr-bronsted · 3D 양성자(H⁺) 이동  (2단계 'H⁺ 옮기기'와 3단계 '짝산·짝염기'의 반응과 같아요)
   브뢴스테드·라우리 산은 H⁺를 주는 물질, 염기는 H⁺를 받는 물질이에요.
   2D에서 고른 반응(HCl + H₂O · H₂O + NH₃ · HCl(g) + NH₃(g) · CH₃COOH + H₂O)을 보여 주고, ▶ 재생하면 H⁺ 하나가 산에서 염기의 비공유 전자쌍으로 옮겨 가요.
   1단계(정의의 한계): 같은 농도의 NaOH · NH₃ 수용액에 BTB를 넣는 실험과, HCl(g) · NH₃(g)가 만나 흰 연기가 생기는 실험을 2D와 같은 값으로 보여 줘요.
   4단계(구별하기): 2D에서 고른 카드의 반응에서 H⁺가 어떻게 옮겨 가는지 보여 줘요 (산 · 염기 분류는 2D).
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

  /* 구별하기(2D 4단계)의 나머지 반응 6개: 카드마다 H⁺가 어떻게 옮겨 가는지 보여 줘요 */
  Object.assign(RX, {
    hco3a: {
      name: 'HCO₃⁻ + H₂O ⇌ CO₃²⁻ + H₃O⁺', acid: 'HCO₃⁻', base: 'H₂O', conjB: 'CO₃²⁻', conjA: 'H₃O⁺', rev: true,
      atoms: [['C', V(-3.0, 0, 0), V(-3.0, 0, 0)], ['O', V(-3.0, 1.25, 0), V(-3.0, 1.25, 0)], ['O', V(-4.1, -0.62, 0), V(-4.1, -0.62, 0)], ['O', V(-1.9, -0.62, 0), V(-2.0, -0.62, 0)], ['H', V(-0.95, -0.62, 0), V(0.2, -0.62, -0.75)],
        ['O', V(1.1, -0.62, 0), V(1.1, -0.62, 0)], ['H', V(1.6, 0.16, -0.45), V(1.6, 0.16, -0.45)], ['H', V(1.6, -1.4, -0.45), V(1.6, -1.4, -0.45)]],
      bonds: [[0, 1, 'a'], [0, 2, 'a'], [0, 3, 'a'], [3, 4, 's'], [4, 5, 'e'], [5, 6, 'a'], [5, 7, 'a']], proton: 4, donor: 3, acc: 5,
      note: 'HCO₃⁻는 H₂O에게 H⁺를 주어 CO₃²⁻가 돼요.',
    },
    hco3b: {
      name: 'HCO₃⁻ + H₂O ⇌ H₂CO₃ + OH⁻', acid: 'H₂O', base: 'HCO₃⁻', conjB: 'OH⁻', conjA: 'H₂CO₃', rev: true,
      atoms: [['C', V(-3.0, 0, 0), V(-3.0, 0, 0)], ['O', V(-3.0, 1.25, 0), V(-3.0, 1.25, 0)], ['O', V(-4.1, -0.62, 0), V(-4.1, -0.62, 0)], ['H', V(-4.9, -0.2, 0), V(-4.9, -0.2, 0)], ['O', V(-1.9, -0.62, 0), V(-1.9, -0.62, 0)],
        ['O', V(1.3, -0.62, 0), V(1.45, -0.62, 0)], ['H', V(0.35, -0.62, 0), V(-0.8, -0.62, -0.6)], ['H', V(1.9, 0.16, -0.45), V(2.0, 0.16, -0.45)]],
      bonds: [[0, 1, 'a'], [0, 2, 'a'], [2, 3, 'a'], [0, 4, 'a'], [5, 6, 's'], [4, 6, 'e'], [5, 7, 'a']], proton: 6, donor: 5, acc: 4,
      note: 'HCO₃⁻는 H₂O에게서 H⁺를 받아 H₂CO₃가 돼요.',
    },
    ac: {
      name: 'CH₃COO⁻ + H₂O ⇌ CH₃COOH + OH⁻', acid: 'H₂O', base: 'CH₃COO⁻', conjB: 'OH⁻', conjA: 'CH₃COOH', rev: true,
      atoms: [['C', V(-4.0, -0.2, 0), V(-4.0, -0.2, 0)], ['H', V(-4.6, 0.7, 0), V(-4.6, 0.7, 0)], ['H', V(-4.5, -0.6, 0.85), V(-4.5, -0.6, 0.85)], ['H', V(-4.5, -0.6, -0.85), V(-4.5, -0.6, -0.85)],
        ['C', V(-2.6, 0.2, 0), V(-2.6, 0.2, 0)], ['O', V(-2.2, 1.4, 0), V(-2.2, 1.4, 0)], ['O', V(-1.8, -0.6, 0), V(-1.8, -0.6, 0)],
        ['O', V(1.9, -0.6, 0), V(2.1, -0.6, 0)], ['H', V(0.95, -0.6, 0), V(-0.6, -0.6, -0.65)], ['H', V(2.5, 0.2, -0.45), V(2.7, 0.2, -0.45)]],
      bonds: [[0, 1, 'a'], [0, 2, 'a'], [0, 3, 'a'], [0, 4, 'a'], [4, 5, 'a'], [4, 6, 'a'], [7, 8, 's'], [6, 8, 'e'], [7, 9, 'a']], proton: 8, donor: 7, acc: 6,
      note: 'CH₃COO⁻는 H₂O에게서 H⁺를 받아 CH₃COOH가 돼요.',
    },
    nh4: {
      name: 'NH₄⁺ + H₂O ⇌ NH₃ + H₃O⁺', acid: 'NH₄⁺', base: 'H₂O', conjB: 'NH₃', conjA: 'H₃O⁺', rev: true,
      atoms: [['N', V(-2.6, 0, 0), V(-2.9, 0, 0)], ['H', V(-1.2, 0, 0), V(0.1, 0, -0.75)], ['H', V(-3.1, 0.92, 0), V(-3.4, 0.92, 0)], ['H', V(-3.1, -0.46, 0.8), V(-3.4, -0.46, 0.8)], ['H', V(-3.1, -0.46, -0.8), V(-3.4, -0.46, -0.8)],
        ['O', V(1.0, 0, 0), V(1.0, 0, 0)], ['H', V(1.5, 0.78, -0.45), V(1.5, 0.78, -0.45)], ['H', V(1.5, -0.78, -0.45), V(1.5, -0.78, -0.45)]],
      bonds: [[0, 1, 's'], [1, 5, 'e'], [0, 2, 'a'], [0, 3, 'a'], [0, 4, 'a'], [5, 6, 'a'], [5, 7, 'a']], proton: 1, donor: 0, acc: 5,
      note: 'NH₄⁺는 H₂O에게 H⁺를 주어 NH₃가 돼요.',
    },
    ohcl: {
      name: 'OH⁻ + HCl → H₂O + Cl⁻', acid: 'HCl', base: 'OH⁻', conjB: 'Cl⁻', conjA: 'H₂O', rev: false,
      atoms: [['O', V(-2.0, 0, 0), V(-2.0, 0, 0)], ['H', V(-2.9, 0.45, 0), V(-2.9, 0.45, 0)], ['Cl', V(3.0, 0, 0), V(3.4, 0, 0)], ['H', V(1.65, 0, 0), V(-0.9, 0, -0.75)]],
      bonds: [[0, 1, 'a'], [2, 3, 's'], [0, 3, 'e']], proton: 3, donor: 2, acc: 0,
      note: 'OH⁻는 HCl에게서 H⁺를 받아 H₂O가 돼요. H⁺가 없는 입자는 H⁺를 줄 수 없어요.',
    },
    co3: {
      name: 'CO₃²⁻ + H₂O ⇌ HCO₃⁻ + OH⁻', acid: 'H₂O', base: 'CO₃²⁻', conjB: 'OH⁻', conjA: 'HCO₃⁻', rev: true,
      atoms: [['C', V(-3.0, 0, 0), V(-3.0, 0, 0)], ['O', V(-3.0, 1.25, 0), V(-3.0, 1.25, 0)], ['O', V(-4.1, -0.62, 0), V(-4.1, -0.62, 0)], ['O', V(-1.9, -0.62, 0), V(-1.9, -0.62, 0)],
        ['O', V(1.3, -0.62, 0), V(1.45, -0.62, 0)], ['H', V(0.35, -0.62, 0), V(-0.8, -0.62, -0.6)], ['H', V(1.9, 0.16, -0.45), V(2.0, 0.16, -0.45)]],
      bonds: [[0, 1, 'a'], [0, 2, 'a'], [0, 3, 'a'], [4, 5, 's'], [3, 5, 'e'], [4, 6, 'a']], proton: 5, donor: 4, acc: 3,
      note: 'CO₃²⁻는 H₂O에게서 H⁺를 받아 HCO₃⁻가 돼요.',
    },
  });
  const SORTRX = ['hcl', 'nh3', 'hco3a', 'hco3b', 'ac', 'nh4', 'ohcl', 'co3'];
  const KEYS = ['hcl', 'nh3', 'hclg', 'ch3'];

  window.SciSim3D.attach({
    title: 'H⁺ 이동 3D (산과 염기)',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHONE ? 12.5 : 9.5, theta: 0.35, phi: 1.25, min: 5, max: 22, target: [0, 0, 0] },
    autoRotate: 0,
    levels: [0, 1, 2],   // 1단계(정의의 한계) · 2단계(H⁺ 옮기기) · 3단계(짝산·짝염기). 4단계(구별하기)는 2D에서 카드를 끌어 놓아요
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3, UP = new V3(0, 1, 0);
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.38, metalness: 0.05 }, o || {}));
      const MT = ctx.mats;
      const rbox = (w, h, d, r) => { r = Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3); const s = new THREE.Shape(), x = w / 2 - r, y = h / 2 - r; s.absarc(x, y, r, 0, Math.PI / 2); s.absarc(-x, y, r, Math.PI / 2, Math.PI); s.absarc(-x, -y, r, Math.PI, 1.5 * Math.PI); s.absarc(x, -y, r, 1.5 * Math.PI, 2 * Math.PI); const g = new THREE.ExtrudeGeometry(s, { depth: d - 2 * r, bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelOffset: -r, bevelSegments: 3, curveSegments: 6 }); g.translate(0, 0, -(d - 2 * r) / 2); return g; };   // 모서리가 둥근 상자
      const rslab = (w, d, t, r) => { const g = rbox(w, d, t, r); g.rotateX(Math.PI / 2); return g; };   // 눕힌 판 (윗면에 무늬가 고르게)
      const atomM = (el) => MT.plastic(new THREE.Color(CPK[el]).multiplyScalar(el === 'H' ? 0.93 : 0.8).getHex(), { roughness: 0.26, extra: { clearcoat: 0.7, clearcoatRoughness: 0.15 } });   // 반짝이는 분자 모형 공 (CPK 색 그대로, 조금 진하게)
      const g = new THREE.Group(); root.add(g);
      let key = 'hcl', prog = 0, meshes = [], bonds = [], halo = null, labs = [];
      let showRole = true;

      function build() {
        while (g.children.length) g.remove(g.children[0]);
        labs.forEach((l) => l.show(false)); labs = []; meshes = []; bonds = [];
        const R = RX[key];
        R.atoms.forEach(([el, p0]) => { const m = new THREE.Mesh(new THREE.SphereGeometry(RAD[el], 48, 32), atomM(el)); m.position.set(...p0); g.add(m); meshes.push(m); });
        R.bonds.forEach(() => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 1, 20), mat(0xaab4c6, { transparent: true, roughness: 0.3, metalness: 0.15 })); g.add(m); bonds.push(m); });
        halo = new THREE.Mesh(new THREE.SphereGeometry(0.62, 28, 20), mat(0xffd34d, { transparent: true, opacity: 0.4, emissive: 0xffa500, emissiveIntensity: 0.6, depthWrite: false })); g.add(halo); ctx.halo(halo, 0xffc23a, 2.6, 0.42);
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
        if (md === 'sort' && S.so) { const c = S.so.drag ? S.so.drag.c : S.so.cards.find((q) => q.id === S.so.sel); return { md, key: SORTRX[c ? c.rx : 0], after: 0, card: c || null }; }
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

      /* ================= 1단계 '정의의 한계' (2D의 obs): BTB 시험 · 흰 연기 ================= */
      const probe = controls.text(''); probe.style.display = 'none'; const ctlEl = probe.parentElement;
      const oldEls = Array.prototype.filter.call(ctlEl.children, (e) => e !== probe);
      const grab = (fn) => { const n0 = ctlEl.children.length; const r = fn(); return { r, els: Array.prototype.slice.call(ctlEl.children, n0) }; };
      const gI = new THREE.Group(), gF = new THREE.Group(); root.add(gI); root.add(gF); gI.visible = gF.visible = false;
      const glassM = () => MT.glass({ tint: 0xcfe8ff, opacity: 0.2 });
      /* --- ind: 같은 농도의 NaOH · NH₃ 수용액에 BTB --- */
      const BX = [-3.2, 3.2], BR = 1.55, BH = 3.4, BY0 = -1.7, LEV = 0.62;
      const bk = [0, 1].map((i) => {
        const gr = new THREE.Group(); gr.position.x = BX[i]; gI.add(gr);
        const gl = new THREE.Mesh(new THREE.CylinderGeometry(BR, BR * 0.96, BH, 40, 1, true), glassM()); gl.position.y = BY0 + BH / 2; gr.add(gl);
        const bs = new THREE.Mesh(new THREE.CylinderGeometry(BR * 0.96, BR * 0.96, 0.12, 48), MT.glass({ tint: 0xcfe8ff, opacity: 0.38 })); bs.position.y = BY0 - 0.06; gr.add(bs);
        { const rim = new THREE.Mesh(new THREE.TorusGeometry(BR + 0.02, 0.05, 12, 72), MT.glass({ tint: 0xe6f3ff, opacity: 0.5 })); rim.rotation.x = Math.PI / 2; rim.position.y = BY0 + BH; gr.add(rim); for (let k = 1; k <= 4; k++) { const tk = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.025, 0.02), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 })); tk.position.set(0, BY0 + BH * k / 5.2, BR + 0.005); gr.add(tk); } }
        const liq = new THREE.Mesh(new THREE.CylinderGeometry(BR - 0.04, BR * 0.96 - 0.04, BH * LEV, 48), MT.liquid(0xcfe8ff, { opacity: 0.7 })); liq.position.y = BY0 + BH * LEV / 2; gr.add(liq);
        const nm = label(i ? '0.10 M NH₃ 수용액' : '0.10 M NaOH 수용액', [BX[i], BY0 - 0.5, 0], { color: 'rgba(30,41,59,.92)' }); nm.show(false);
        const btb = label('BTB: 파란색 (염기성)', [BX[i], BY0 + BH + 0.5, 0], { color: 'rgba(37,99,235,.95)' }); btb.show(false);
        return { gr, liq, nm, btb };
      });
      const NIO = 26, ionM = [0, 1].map((i) => { const m = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), mat(0xffffff), NIO); m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); bk[i].gr.add(m); return m; });
      const IONS = [0, 1].map(() => Array.from({ length: NIO }, () => ({ a: Math.random() * 6.28, r: Math.sqrt(Math.random()) * (BR - 0.35), y: Math.random(), ph: Math.random() * 6.28, sp: 0.5 + Math.random() * 0.8 })));
      const C_NA = new THREE.Color(0xa78bfa), C_OH = new THREE.Color(0xf43f5e), C_NH3 = new THREE.Color(0x60a5fa), C_NH4 = new THREE.Color(0x1d4ed8), Cmix0 = new THREE.Color(0xcfe8ff), Cmix1 = new THREE.Color(0x2f6df0);
      const dropper = new THREE.Group(); { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.3, 12), glassM()); t.position.y = 0.65; dropper.add(t); const gl2 = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.7, 16), MT.liquid(0x2fb866, { opacity: 0.9 })); gl2.position.y = 0.45; dropper.add(gl2); const bu = new THREE.Mesh(new THREE.SphereGeometry(0.25, 24, 16), MT.rubber(0x8a2b2b)); bu.position.y = 1.5; bu.scale.y = 1.4; dropper.add(bu); } gI.add(dropper);
      const dropM = Array.from({ length: 4 }, () => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), mat(0x4ade80, { emissive: 0x16a34a, emissiveIntensity: 0.4 })); m.visible = false; gI.add(m); return m; });
      { const bn = new THREE.Mesh(rslab(11.5, 4.6, 0.3, 0.06), MT.wood(0xa88962, { repeat: 0.25 })); bn.position.y = BY0 - 0.28; bn.userData.v3bg = true; gI.add(bn); }   // 실험대
      const lLeg = label('', [0, BY0 - 1.5, 0], { color: 'rgba(30,41,59,.9)' }); lLeg.show(false);
      const Mi = new THREE.Matrix4(), Pi = new V3(), Qi = new THREE.Quaternion(), Si = new V3();
      function updInd(w, t) {
        const o = w.S.ob, g2 = w.obG(), sep = g2.cx[1] - g2.cx[0], kx = (BX[1] - BX[0]) / sep, midpx = (g2.cx[0] + g2.cx[1]) / 2, kY = BH / g2.bh;
        const surfPx = g2.by + 5 + (g2.bh - 11) * (1 - LEV), liqTop = BY0 + BH * LEV;
        ['naoh', 'nh3'].forEach((k, i) => {
          const B = bk[i], dye = o.dye[k]; B.liq.material.color.copy(Cmix0).lerp(Cmix1, dye * dye * (3 - 2 * dye));
          B.btb.show(dye > 0.5); B.nm.show(true);
          const m = ionM[i];
          IONS[i].forEach((q, n) => {
            let col, r;
            if (i === 0) { col = n % 2 ? C_OH : C_NA; r = 0.17; } else if (n < 22) { col = C_NH3; r = 0.15; } else { col = n % 2 ? C_OH : C_NH4; r = 0.2 * (0.35 + 0.65 * Math.abs(Math.sin(t * 1.7 + n))); }
            const y = BY0 + 0.3 + q.y * (BH * LEV - 0.6), a = q.a + t * 0.25 * q.sp;
            Pi.set(Math.cos(a) * q.r + Math.sin(t * 2 + q.ph) * 0.06, y + Math.cos(t * 2.3 + q.ph) * 0.07, Math.sin(a) * q.r); Si.set(r, r, r); Mi.compose(Pi, Qi, Si); m.setMatrixAt(n, Mi); m.setColorAt(n, col);
          });
          m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
        });
        dropper.position.set((o.dr.x - midpx) * kx, BY0 + BH + 0.9, 0);
        dropM.forEach((m, n) => { const d = o.drops[n]; m.visible = !!d; if (d) m.position.set((d.x - midpx) * kx, liqTop + (surfPx - d.y) * kY, 0); });
        const l1 = o.dye.naoh > 0.5, l2 = o.dye.nh3 > 0.5;
        lLeg.show(true); lLeg.set('Na⁺ · OH⁻ (NaOH) / NH₃ · NH₄⁺ · OH⁻ (NH₃ 수용액)');
        return '<b>같은 농도의 NaOH와 NH₃ 수용액에 BTB를 넣어요</b><br>' + (l1 ? '✅ NaOH → Na⁺ + OH⁻: 화학식에 OH가 있어서 아레니우스 정의로 설명돼요.' : '⬜ NaOH 수용액에 BTB를 넣어 보세요.') + '<br>' + (l2 ? '❓ NH₃에는 OH⁻가 없는데도 BTB가 파랗게 변했어요.' : '⬜ NH₃ 수용액에도 BTB를 넣어 보세요.');
      }
      const indCtl = grab(() => controls.button('💧 NaOH에 BTB 넣기', () => { const w = W(); if (w) w.obDye('naoh'); }));
      const indCtl2 = grab(() => controls.button('💧 NH₃ 수용액에 BTB 넣기', () => { const w = W(); if (w) w.obDye('nh3'); }));
      const indRst = grab(() => controls.button('↺ 처음으로', () => { const w = W(); if (w) w.obReset(); }));
      /* --- fume: 진한 염산 · 진한 암모니아수의 기체가 만나면 흰 연기 (NH₄Cl) --- */
      const BTL = (() => { const pts = [[0.001, 0], [0.62, 0], [0.7, 0.06], [0.72, 0.9], [0.62, 1.5], [0.28, 1.95], [0.26, 2.5], [0.3, 2.55], [0.3, 2.6], [0.001, 2.6]].map(([r, y]) => new THREE.Vector2(r, y)); return new THREE.LatheGeometry(pts, 32); })();
      const mkBottle = (col) => { const gr = new THREE.Group(); gr.add(new THREE.Mesh(BTL, glassM())); const lq = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.66, 0.9, 40), MT.liquid(col, { opacity: 0.62 })); lq.position.y = 0.5; gr.add(lq); gF.add(gr); return gr; };
      const bA = mkBottle(0xfaf0a0), bB = mkBottle(0xbee1ff);
      const benchF = new THREE.Mesh(rslab(12, 3, 0.2, 0.05), MT.wood(0xa88962, { repeat: 0.25 })); benchF.position.y = -0.1; gF.add(benchF);
      const haze = (c) => new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.2, depthWrite: false }));
      const hA = haze(0x22c55e), hB = haze(0x60a5fa); gF.add(hA); gF.add(hB);
      const gasF = new THREE.InstancedMesh(new THREE.SphereGeometry(0.09, 10, 8), mat(0xffffff), 28); gasF.frustumCulled = false; gasF.instanceMatrix.setUsage(THREE.DynamicDrawUsage); gF.add(gasF);
      const NSM = 70, smk = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, roughness: 0.9 }), NSM); smk.frustumCulled = false; smk.instanceMatrix.setUsage(THREE.DynamicDrawUsage); gF.add(smk);
      const SMK = Array.from({ length: NSM }, () => ({ life: Math.random(), x: 0, y: 0, z: 0, vx: 0, vz: 0 }));
      const lHcl = label('HCl(g)', [0, 0, 0], { color: 'rgba(22,163,74,.92)' }), lNh3 = label('NH₃(g)', [0, 0, 0], { color: 'rgba(37,99,235,.92)' }), lSmk = label('NH₄Cl(s) 흰 연기', [0, 0, 0], { color: 'rgba(71,85,105,.92)' });
      const lBA = label('진한 염산', [0, -0.6, 0], { color: 'rgba(30,41,59,.92)' }), lBB = label('진한 암모니아수', [0, -0.6, 0], { color: 'rgba(30,41,59,.92)' });
      [lHcl, lNh3, lSmk, lBA, lBB].forEach((l) => l.show(false));
      let smkAcc = 0;
      function updFume(w, dt, t) {
        const o = w.S.ob, G = w.fmG(), K = 9.2 / G.gMax, xmid = G.xR - G.gMax / 2, xL = G.xR - o.gap;
        const XA = (xL - xmid) * K, XB = (G.xR - xmid) * K, hy = 1.8, Rr = G.R * K;
        bA.position.set(XA, 0, 0); bB.position.set(XB, 0, 0);
        hA.position.set(XA, hy, 0); hA.scale.setScalar(Rr); hB.position.set(XB, hy, 0); hB.scale.setScalar(Rr);
        for (let i = 0; i < 14; i++) {
          [[XA, 0], [XB, 1.3]].forEach(([cx, off], k) => { const rr = Rr * (0.25 + 0.65 * ((i * 0.37) % 1)), a = i * 1.7 + off + t * (0.5 + (i % 4) * 0.12); Pi.set(cx + Math.cos(a) * rr, hy + Math.sin(a * 1.3) * rr * 0.8, Math.sin(a * 0.8) * rr * 0.7); Si.set(1, 1, 1); Mi.compose(Pi, Qi, Si); gasF.setMatrixAt(i + k * 14, Mi); gasF.setColorAt(i + k * 14, k ? C_NH3 : new THREE.Color(0x4ade80)); });
        }
        gasF.instanceMatrix.needsUpdate = true; if (gasF.instanceColor) gasF.instanceColor.needsUpdate = true;
        // 흰 연기: 두 구름이 겹치는 곳에서 피어올라요
        const mx = (XA + XB) / 2, sm = o.smoke;
        smkAcc += dt * 40 * sm; while (smkAcc >= 1) { smkAcc -= 1; const q = SMK.find((z) => z.life >= 1); if (!q) break; q.life = 0; q.x = mx + (Math.random() - 0.5) * Math.max(0.3, 2 * Rr - (XB - XA)); q.y = hy + (Math.random() - 0.5) * 1.0; q.z = (Math.random() - 0.5) * 1.2; q.vx = (Math.random() - 0.5) * 0.3; q.vz = (Math.random() - 0.5) * 0.2; }
        SMK.forEach((q, i) => { q.life += dt * 0.38; if (q.life >= 1) { Si.set(0.0001, 0.0001, 0.0001); Mi.compose(Pi.set(0, -9, 0), Qi, Si); smk.setMatrixAt(i, Mi); return; } q.y += dt * 0.5; q.x += q.vx * dt; q.z += q.vz * dt; const r = 0.15 + q.life * 0.4; Si.set(r, r, r); Mi.compose(Pi.set(q.x, q.y, q.z), Qi, Si); smk.setMatrixAt(i, Mi); });
        smk.instanceMatrix.needsUpdate = true;
        lHcl.show(true); lHcl.obj = [XA, hy + Rr + 0.3, 0]; lNh3.show(true); lNh3.obj = [XB, hy + Rr + 0.3, 0];
        lBA.show(true); lBA.obj = [XA, -0.55, 0.9]; lBB.show(true); lBB.obj = [XB, -0.55, 0.9];
        lSmk.show(sm > 0.25); lSmk.obj = [mx, hy + Rr * 0.8 + 0.5, 0];
        return '<b>HCl(g) + NH₃(g) → NH₄Cl(s) (흰 연기)</b><br>' + (sm > 0.4 ? '두 기체가 만나자 흰 연기가 생겼어요. 물도 수용액도 없는데 이것도 산과 염기의 반응이에요!' : '두 병을 가까이 가져가 기체 구름이 겹치게 해 보세요.') + '<br>흰 연기의 양 ' + Math.round(sm * 100) + ' %';
      }
      const frGap = grab(() => controls.range('두 병 사이', 0, 100, 1, 0, (v) => { const w = W(); if (!w) return; const G = w.fmG(); w.setGap(G.gMax - v / 100 * (G.gMax - G.gMin)); }, (v) => (v >= 100 ? '맞닿음' : v + ' % 가까이')));
      const obView = grab(() => controls.segment('실험', [{ value: 'ind', label: 'BTB 시험' }, { value: 'fume', label: '흰 연기' }], 'ind', (v) => { const w = W(); if (w) w.obSwitch(v); }));
      /* 2단계(H⁺ 옮기기) · 3단계(짝 잇기): 2D에서 끌거나 누르던 일을 3D 막대 단추로 해요.
         2D의 mvAuto · prPick을 그대로 불러서 미션 진행이 함께 기록돼요. */
      let note = '', noteT = 0;
      const MVO = { a: ['a', 'd'], b: ['d', 'a'], c: ['a', 'd'] };
      function mvTry(j) {
        const w = W(); if (!w) return; const S = w.S, k = S.mv.k, M = w.MVR[k], r = S.mv.r[k]; if (!M || r.done || r.anim) return;
        const side = (MVO[k] || ['a', 'd'])[j];
        if (side === 'a') { w.mvAuto(); note = '<b>' + M.a.f0 + '</b>가 H⁺를 받아요. → <b>' + M.a.f1 + '</b>'; }
        else note = '<b>' + M.d.f0 + '</b>는 H⁺를 내주는 쪽이에요. H⁺를 <b>받을</b> 분자를 골라 봐요.';
        noteT = 3.5; txt = '';
      }
      const mvCtl = grab(() => { controls.text('<b>H⁺를 받을 분자</b>'); return [0, 1].map((j) => controls.button('', () => mvTry(j))); });
      const prCtl = grab(() => { controls.text('<b>짝 잇기</b>'); return [0, 1, 2, 3].map((i) => controls.button('', () => { const w = W(); if (w && !w.S.pr.hop) { w.prPick(i); txt = ''; } })); });
      let ctlSig = '';
      function updCtl(md) {
        const w = W(); if (!w) return; const S = w.S; let sig = md;
        if (md === 'move') { const k = S.mv.k, M = w.MVR[k], r = S.mv.r[k], o = MVO[k] || ['a', 'd']; sig += k + (r.done ? 1 : 0) + (r.anim ? 1 : 0); if (sig === ctlSig) return; ctlSig = sig;
          mvCtl.r.forEach((b, j) => { b.textContent = M[o[j]].f0; b.disabled = !!(r.done || r.anim); }); }
        else if (md === 'pairs') { const rx = w.RX[S.pr.k]; sig += S.pr.k + '|' + S.pr.sel; if (sig === ctlSig) return; ctlSig = sig;
          prCtl.r.forEach((b, i) => { b.textContent = rx.sp[i].f; b.classList.toggle('on', S.pr.sel === i); }); }
      }
      function extraInfo(md) {
        const w = W(); if (!w) return '';
        if (md === 'move') return noteT > 0 ? '<br>' + note : (w.S.mv.r[w.S.mv.k].done ? '' : '<br><span style="color:#ffd34d">H⁺를 받을 분자를 아래 단추에서 골라요.</span>');
        if (md === 'pairs') { const S = w.S, rx = w.RX[S.pr.k], L = S.pr.lines[S.pr.k];
          const done = rx.pairs.map((pr, i) => (L[i] ? '✓ ' + rx.sp[pr[0]].f + ' – ' + rx.sp[pr[1]].f : '')).filter(Boolean).join(' · ');
          return '<br>' + (S.pr.msg ? S.pr.msg : S.pr.sel >= 0 ? '<b>' + rx.sp[S.pr.sel].f + '</b>와 짝이 되는 물질을 골라요.' : '물질 단추를 하나 누르고, H⁺ 하나 차이인 짝을 눌러요.') + (done ? '<br>이은 쌍: ' + done : ''); }
        return '';
      }
      const sh = (gp, on) => gp.els.forEach((e) => { e.style.display = on ? '' : 'none'; });
      let sceneK = '';
      function applyScene(md, view) {
        const k = md === 'obs' ? 'obs-' + view : md; if (k === sceneK) return; sceneK = k;
        const isObs = md === 'obs';
        g.visible = !isObs; gI.visible = isObs && view === 'ind'; gF.visible = isObs && view === 'fume';
        oldEls.forEach((e) => { e.style.display = isObs ? 'none' : ''; });
        sh(obView, isObs); sh(mvCtl, md === 'move'); sh(prCtl, md === 'pairs'); ctlSig = ''; sh(indCtl, isObs && view === 'ind'); sh(indCtl2, isObs && view === 'ind'); sh(indRst, isObs && view === 'ind'); sh(frGap, isObs && view === 'fume');
        if (isObs) {
          labs.forEach((l) => l.show(false));
          const ind = view === 'ind'; bk.forEach((b) => { b.nm.show(ind); if (!ind) b.btb.show(false); }); lLeg.show(ind); [lHcl, lNh3, lSmk, lBA, lBB].forEach((l) => l.show(!ind));
        } else { bk.forEach((b) => { b.nm.show(false); b.btb.show(false); }); lLeg.show(false); [lHcl, lNh3, lSmk, lBA, lBB].forEach((l) => l.show(false)); build(); }
        const o = ctx.orbit;
        if (isObs && view === 'ind') { o.dist = PHONE ? 17.5 : 11.5; o.tx = 0; o.ty = 0.8; o.theta = 0.2; o.phi = 1.35; }
        else if (isObs) { o.dist = PHONE ? 21 : 11.5; o.tx = 0; o.ty = 1.3; o.theta = 0.1; o.phi = 1.4; }
        else { o.dist = PHONE ? 12.5 : 9.5; o.tx = 0; o.ty = 0; o.theta = 0.35; o.phi = 1.25; }
        txt = '';
      }
      build();
      return {
        update(dt) {
          dt = Math.min(dt, 0.05);
          const q = from2D(), w2 = W();
          applyScene(q.md, w2 && w2.S && w2.S.ob ? w2.S.ob.view : 'ind');
          if (q.md === 'obs') {
            const tn = performance.now() / 1000, html = w2.S.ob.view === 'fume' ? updFume(w2, dt, tn) : updInd(w2, tn);
            if (html !== txt) { txt = html; info(html); }
            if (w2.S.ob.view === 'fume') frGap.r.set(w2.gapPct()); else { indCtl.els.forEach((e) => { e.disabled = !!w2.S.ob.act || w2.S.ob.dyeT.naoh >= 1; }); indCtl2.els.forEach((e) => { e.disabled = !!w2.S.ob.act || w2.S.ob.dyeT.nh3 >= 1; }); }
            obView.r.set(w2.S.ob.view);
            return;
          }
          showRole = q.md !== 'sort' && !(q.md === 'move' && !q.after);   // H⁺ 옮기기: 2D처럼 옮긴 뒤에 산 · 염기 이름이 붙어요
          if (q.key !== key) { key = q.key; build(); pl.pause(); pl.set(0); demo = false; }
          const md = q.md;
          if (md === 'sort') { if (!demoOn()) { const ph = (performance.now() / 1000 % 7) / 7; prog = ph < 0.2 ? 0 : ph < 0.6 ? (ph - 0.2) / 0.4 : 1; } }
          else if (!demoOn()) prog += ((md === 'move' || md === 'pairs' ? q.after : 0) - prog) * Math.min(1, dt * 4);
          place();
          const R = RX[key], after = prog > 0.5;
          const other = md !== 'move' && md !== 'pairs';
          if (md === 'sort') {
            const c = q.card, t2 = '<b>' + R.name + '</b><br>' + (c ? '고른 카드: <b>' + c.f + '</b><br>' : '') + 'H⁺가 어디에서 어디로 옮겨 가는지 보고, 이 입자가 H⁺를 <b>주었는지 받았는지</b> 생각해 봐요.';
            labs.donor.show(false); labs.acc.show(false); if (t2 !== txt) { txt = t2; info(t2); } return;
          }
          noteT = Math.max(0, noteT - dt); updCtl(md);
          const t = md === 'move' && !q.after ? '<b>' + R.name + '</b><br>어느 분자가 H⁺를 주고, 어느 분자가 받을까요? H⁺가 옮겨 가면 <b>산</b>과 <b>염기</b>를 알 수 있어요.' + extraInfo(md)   // 옮기기 전에는 답(산 · 염기)을 알려 주지 않아요 (2D 아래 칸도 ‘?’)
            : '<b>' + R.name + '</b><br>' + R.note + '<br>' + (after ? '반응 후: 산은 <b>짝염기</b>, 염기는 <b>짝산</b>이 돼요.' : '반응 전: <b>' + R.acid + '</b>(산) → H⁺ → <b>' + R.base + '</b>(염기)') + extraInfo(md);
          if (t !== txt) { txt = t; info(t); }
        },
      };
    },
  });
})();
