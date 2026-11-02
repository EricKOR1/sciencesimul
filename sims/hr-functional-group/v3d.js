/* hr-functional-group · 3D 작용기와 탄소 화합물
   같은 탄소 뼈대라도 어떤 작용기(−OH, −CHO, −COOH)가 붙었는지에 따라 성질이 달라져요.
   결합 길이와 각은 실제 값에 가깝게(C–C 1.53 Å, C=O 1.21 Å 등) 계산해서 그린 모형이에요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const COL = { C: 0x5f6b7d, H: 0xf1f5f9, O: 0xe23b3b }, BS = { C: 0.5, H: 0.3, O: 0.47 }, VDW = { C: 1.05, H: 0.75, O: 0.95 };
  const K = 1.6;                                           // 1 Å → 1.6 단위
  const GRP = { none: ['작용기 없음 (알케인)', '탄소와 수소만 있어서 매우 안정하고 극성이 거의 없어요.'], OH: ['하이드록시기 (−OH)', '알코올의 작용기예요. 수소 결합을 할 수 있어 끓는점이 높아요.'], CHO: ['알데하이드기 (−CHO)', '탄소 끝에 C=O와 H가 붙어 있어요. 산화되기 쉬워 환원성이 있어요.'], COOH: ['카복실기 (−COOH)', 'C=O와 −OH가 함께 있어요. 물에서 H⁺를 내놓아 약한 산성을 띠어요.'] };
  const LIST = [
    { id: 'ethane', f: 'CH₃CH₃', n: '에테인', g: 'none', bp: -89 }, { id: 'methanol', f: 'CH₃OH', n: '메탄올', g: 'OH', bp: 65 },
    { id: 'ethanol', f: 'CH₃CH₂OH', n: '에탄올', g: 'OH', bp: 78 }, { id: 'acetaldehyde', f: 'CH₃CHO', n: '아세트알데하이드', g: 'CHO', bp: 20 },
    { id: 'acetic', f: 'CH₃COOH', n: '아세트산', g: 'COOH', bp: 118 },
  ];

  window.SciSim3D.attach({
    title: '작용기 3D 분자 모형',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHONE ? 11 : 8.5, theta: 0.6, phi: 1.2, min: 4, max: 18 },
    autoRotate: 0.3,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3, UP = new V3(0, 1, 0);
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.4, metalness: 0.05 }, o || {}));
      const g = new THREE.Group(); root.add(g);
      let cur = 'ethanol', hi = true, fill = false, labs = [];
      /* 방향 계산 */
      const perp = (a) => { const t = Math.abs(a.y) < 0.9 ? new V3(0, 1, 0) : new V3(1, 0, 0); const u = t.clone().cross(a).normalize(); return [u, a.clone().cross(u).normalize()]; };
      const tet = (a, phi) => { const [u, w] = perp(a), ca = Math.cos(109.47 * Math.PI / 180), sa = Math.sin(109.47 * Math.PI / 180); return [0, 1, 2].map((k) => { const b = phi + k * 2 * Math.PI / 3; return a.clone().multiplyScalar(ca).add(u.clone().multiplyScalar(Math.cos(b) * sa)).add(w.clone().multiplyScalar(Math.sin(b) * sa)); }); };
      const trig = (a, n) => { const s = new V3().crossVectors(n, a).normalize(), c = Math.cos(2 * Math.PI / 3), sn = Math.sin(2 * Math.PI / 3); return [a.clone().multiplyScalar(c).add(s.clone().multiplyScalar(sn)), a.clone().multiplyScalar(c).sub(s.clone().multiplyScalar(sn))]; };
      function molecule(id) {
        const A = [], B = [];
        const add = (el, p, grp) => { A.push({ el, p: p.clone().multiplyScalar(K), grp: !!grp }); return A.length - 1; };
        const bond = (i, j, o) => B.push([i, j, o || 1]);
        const X = new V3(1, 0, 0), at = (c, d, l) => A[c].p.clone().divideScalar(K).add(d.clone().multiplyScalar(l));
        const Hs = (c, dirs, grp) => dirs.forEach((d) => { const h = add('H', at(c, d, 1.09), grp); bond(c, h); });
        if (id === 'ethane') {
          const c1 = add('C', new V3()), c2 = add('C', X.clone().multiplyScalar(1.53)); bond(c1, c2);
          Hs(c1, tet(X, 0)); Hs(c2, tet(X.clone().negate(), Math.PI / 3));
        } else if (id === 'methanol') {
          const c = add('C', new V3()), o = add('O', X.clone().multiplyScalar(1.43), 1); bond(c, o); Hs(c, tet(X, 0));
          const h = add('H', at(o, tet(X.clone().negate(), 0.6)[0], 0.96), 1); bond(o, h);
        } else if (id === 'ethanol') {
          const c1 = add('C', new V3()), c2 = add('C', X.clone().multiplyScalar(1.53)); bond(c1, c2); Hs(c1, tet(X, 0));
          const d2 = tet(X.clone().negate(), 0); const o = add('O', at(c2, d2[0], 1.43), 1); bond(c2, o); Hs(c2, [d2[1], d2[2]]);
          const back = d2[0].clone().negate(); const h = add('H', at(o, tet(back, 1.0)[0], 0.96), 1); bond(o, h);
        } else if (id === 'acetaldehyde') {
          const c1 = add('C', new V3()), c2 = add('C', X.clone().multiplyScalar(1.51), 1); bond(c1, c2); Hs(c1, tet(X, 0));
          const n = new V3(0, 0, 1), d = trig(X.clone().negate(), n);
          const o = add('O', at(c2, d[0], 1.21), 1); bond(c2, o, 2); const h = add('H', at(c2, d[1], 1.1), 1); bond(c2, h);
        } else if (id === 'acetic') {
          const c1 = add('C', new V3()), c2 = add('C', X.clone().multiplyScalar(1.52), 1); bond(c1, c2); Hs(c1, tet(X, 0));
          const n = new V3(0, 0, 1), d = trig(X.clone().negate(), n);
          const o1 = add('O', at(c2, d[0], 1.21), 1); bond(c2, o1, 2); const o2 = add('O', at(c2, d[1], 1.36), 1); bond(c2, o2);
          const h = add('H', at(o2, d[1].clone().applyAxisAngle(n, 1.15), 0.97), 1); bond(o2, h);
        }
        return { A, B };
      }
      function stick(a, b, r, col) { const d = b.clone().sub(a), L = d.length(), m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, 14), mat(col)); m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(UP, d.normalize()); return m; }
      let atoms = [], halos = [], sticks = [];
      function build() {
        while (g.children.length) g.remove(g.children[0]);
        labs.forEach((l) => l.show(false)); labs = []; atoms = []; halos = []; sticks = [];
        const M = LIST.find((x) => x.id === cur), { A, B } = molecule(cur);
        const c = new V3(); A.forEach((a) => c.add(a.p)); c.divideScalar(A.length); A.forEach((a) => a.p.sub(c));
        A.forEach((a) => {
          const m = new THREE.Mesh(new THREE.SphereGeometry(BS[a.el] * 1.12, 40, 28), mat(COL[a.el], { roughness: 0.35 })); m.position.copy(a.p); g.add(m); atoms.push(m); m.userData.el = a.el;
          const h = new THREE.Mesh(new THREE.SphereGeometry(BS[a.el] * 1.12 + 0.2, 28, 20), mat(0xffd34d, { transparent: true, opacity: 0.26, emissive: 0xffa500, emissiveIntensity: 0.4, depthWrite: false })); h.position.copy(a.p); h.visible = a.grp && M.g !== 'none'; g.add(h); halos.push(h);
        });
        B.forEach(([i, j, o]) => {
          const pa = A[i].p, pb = A[j].p;
          if (o === 2) { const d = pb.clone().sub(pa).normalize(), s = new V3(0, 0, 1).cross(d).normalize().multiplyScalar(0.11); [1, -1].forEach((k) => { const st = stick(pa.clone().addScaledVector(s, k), pb.clone().addScaledVector(s, k), 0.06, 0xb4bfd2); g.add(st); sticks.push(st); }); }
          else { const st = stick(pa, pb, 0.1, 0xb4bfd2); g.add(st); sticks.push(st); }
        });
        // 이름표
        const gAt = A.filter((a) => a.grp); if (gAt.length && M.g !== 'none') { const gc = new V3(); gAt.forEach((a) => gc.add(a.p)); gc.divideScalar(gAt.length); labs.push(label(GRP[M.g][0], [gc.x, gc.y + 1.6, gc.z], { color: 'rgba(180,120,0,.95)' })); }
        labs.push(label(M.n + ' ' + M.f, [0, -2.4, 0], { color: 'rgba(30,41,59,.9)' }));
        applyStyle();
        info('<b>' + M.n + '</b> · ' + M.f + ' · 끓는점 ' + M.bp + ' °C<br>' + GRP[M.g][0] + '<br>' + GRP[M.g][1]);
      }
      function applyStyle() {
        atoms.forEach((m, i) => { const el = m.userData.el; m.scale.setScalar(fill ? VDW[el] / BS[el] / 1.12 * 0.62 * 1.12 : 1); });
        sticks.forEach((s) => { s.visible = !fill || true; });
        halos.forEach((h, i) => { const el = atoms[i].userData.el; h.scale.setScalar(fill ? 1.0 : 1); h.position.copy(atoms[i].position); const base = BS[el] * 1.12, r = fill ? VDW[el] * 0.62 : base; h.scale.setScalar((r + 0.2) / (base + 0.2)); });
        halos.forEach((h) => { if (!hi) h.visible = false; });
      }
      controls.segment('분자', LIST.map((m) => ({ value: m.id, label: m.id === 'acetaldehyde' ? '알데하이드' : m.n })), cur, (v) => { cur = v; build(); });
      const hb = controls.button('작용기 강조 ✓', () => { hi = !hi; hb.classList.toggle('on', hi); hb.textContent = '작용기 강조 ' + (hi ? '✓' : '✕'); build(); }); hb.classList.add('on');
      controls.segment('모양', [{ value: 0, label: '공-막대' }, { value: 1, label: '공간 채움' }], 0, (v) => { fill = !!v; build(); });
      build();
      return {};
    },
  });
})();
