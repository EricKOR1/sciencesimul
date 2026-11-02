/* hr-polymerization · 3D 첨가 중합 (단위체 → 고분자)
   C=C 이중 결합이 끊어지면서 단위체가 차례로 이어 붙어 긴 사슬(고분자)이 돼요.
   버튼으로 단위체를 하나씩 연결해 보고, 곁가지(H · Cl · 벤젠 고리)에 따라 PE · PVC · PS가 달라지는 것을 확인해요.
   결합 길이·각은 실제 값에 가깝게(C–C 1.54 Å, 109.5°) 그린 모형 스케치예요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const K = 1.25, NU = 5;                                 // 1 Å → 1.25 단위, 단위체 5개
  const sstep = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
  const TYPES = {
    pe: { n: '폴리에틸렌 (PE)', mono: '에틸렌 CH₂=CH₂', X: 'H', use: '비닐 봉지 · 포장 필름', unit: '−CH₂−CH₂−' },
    pvc: { n: '폴리염화비닐 (PVC)', mono: '염화 비닐 CH₂=CHCl', X: 'Cl', use: '수도관 · 전선 피복', unit: '−CH₂−CHCl−' },
    ps: { n: '폴리스타이렌 (PS)', mono: '스타이렌 CH₂=CH−C₆H₅', X: 'Ph', use: '일회용 컵 · 단열재', unit: '−CH₂−CH(C₆H₅)−' },
  };

  window.SciSim3D.attach({
    title: '첨가 중합 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHONE ? 20 : 15.5, theta: 0.35, phi: 1.2, min: 7, max: 30, target: [0, 1.2, 0] },
    autoRotate: 0.07,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3, UP = new V3(0, 1, 0);
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.4, metalness: 0.05 }, o || {}));
      const g = new THREE.Group(); root.add(g);
      let type = 'pe', units = [], links = [], labs = [];
      const cpos = (i) => new V3((i - (NU * 2 - 1) / 2) * 1.26 * K, (i % 2 ? -0.445 : 0.445) * K * 1.54 / 1.54, 0);
      function stick(r, col) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 14), mat(col, { transparent: true })); return m; }
      function setStick(m, a, b, o) { const d = b.clone().sub(a), L = d.length(); m.visible = o > 0.03; m.material.opacity = o; m.scale.set(1, Math.max(0.01, L), 1); m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(UP, d.normalize()); }
      function build() {
        while (g.children.length) g.remove(g.children[0]);
        links.forEach((l) => g.remove(l)); links = []; units = []; labs.forEach((l) => l.show(false)); labs = [];
        const T = TYPES[type];
        for (let u = 0; u < NU; u++) {
          const grp = new THREE.Group(); g.add(grp);
          const cA = cpos(2 * u), cB = cpos(2 * u + 1);
          const mk = (el, p, r, col) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 24), mat(col)); m.position.copy(p); grp.add(m); return m; };
          const a = mk('C', cA, 0.44, 0x5f6b7d), b = mk('C', cB, 0.44, 0x5f6b7d);
          const bonds = [];                                                     // [메쉬, 시작, 끝, 종류]
          const sb = (p, q, r, col, kind) => { const m = stick(r, col); grp.add(m); bonds.push({ m, p, q, kind }); return m; };
          sb(cA, cB, 0.1, 0xb4bfd2, 'main');
          const dbl = stick(0.07, 0xffd34d); grp.add(dbl); const dbl2 = stick(0.07, 0xffd34d); grp.add(dbl2);
          [[cA, 0], [cB, 1]].forEach(([c, k]) => {
            const s = c.y > 0 ? 1 : -1;
            [1, -1].forEach((zz) => {
              const dir = new V3(0, 0.577 * s, 0.816 * zz).normalize();
              const isX = k === 1 && zz === 1 && T.X !== 'H';
              if (!isX) { const h = mk('H', c.clone().addScaledVector(dir, 1.09 * K), 0.27, 0xf1f5f9); sb(c, h.position, 0.07, 0xb4bfd2, 'sub'); }
              else if (T.X === 'Cl') { const cl = mk('Cl', c.clone().addScaledVector(dir, 1.77 * K), 0.55, 0x22b14c); sb(c, cl.position, 0.08, 0xb4bfd2, 'sub'); }
              else { // 벤젠 고리
                const ctr = c.clone().addScaledVector(dir, (1.51 + 1.4) * K * 0.82); const ring = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.15, 14, 48), mat(0x7a8aa6)); ring.position.copy(ctr);
                ring.quaternion.setFromUnitVectors(new V3(0, 0, 1), dir); grp.add(ring);
                const fill = new THREE.Mesh(new THREE.CircleGeometry(1.1, 36), mat(0x9fb0d0, { transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false })); fill.position.copy(ctr); fill.quaternion.copy(ring.quaternion); grp.add(fill);
                sb(c, ctr.clone().addScaledVector(dir, -1.15), 0.1, 0xb4bfd2, 'sub');
              }
            });
          });
          const link = stick(0.1, 0xb4bfd2); g.add(link); links.push(link);
          units.push({ grp, cA, cB, dbl, dbl2, bonds, prog: u === 0 ? 1 : 0, joining: false, ph: u * 1.3, a, b });
        }
        labs.push(label(T.n, [0, -2.4, 0], { color: 'rgba(30,41,59,.9)' }));
        labs.push(label('단위체', [(NU * 2 - 1) / 2 * 0 + cpos(2).x + 0.4, 5.6, 0], { color: 'rgba(180,120,0,.95)' }));
        place(0, 0);
      }
      function place(dt, t) {
        let nJ = 0;
        units.forEach((u, i) => {
          if (u.joining) { u.prog = Math.min(1, u.prog + dt / 1.5); if (u.prog >= 1) u.joining = false; }
          const f = sstep(u.prog), joined = u.prog >= 1; if (joined) nJ++;
          const bob = (1 - f) * (Math.sin(t * 1.6 + u.ph) * 0.18);
          u.grp.position.set(0, (1 - f) * (4.3 + 0.6 * ((i * 7) % 3)) + bob, (1 - f) * (-1.2 + 0.9 * ((i * 5) % 3)));
          u.grp.rotation.set((1 - f) * 0.0, 0, 0);
          u.bonds.forEach((q) => { const p = q.p.clone(), qq = q.q.clone(); setStick(q.m, p, qq, 1); });
          // 이중 결합: 이어 붙으면서 사라져요
          const d = u.cB.clone().sub(u.cA), nrm = new V3(0, 0, 1).cross(d).normalize().multiplyScalar(0.13), o = 1 - sstep(f * 1.6);
          setStick(u.dbl, u.cA.clone().add(nrm), u.cB.clone().add(nrm), o); setStick(u.dbl2, u.cA.clone().sub(nrm), u.cB.clone().sub(nrm), o * 0.7 + (o > 0 ? 0 : 0));
          // 앞 단위체와 이어지는 결합
          const link = links[i];
          if (i === 0) { link.visible = false; return; }
          const prev = units[i - 1], pb = prev.cB.clone().add(prev.grp.position), ca = u.cA.clone().add(u.grp.position);
          setStick(link, pb, ca, sstep((f - 0.55) / 0.45));
        });
        return nJ;
      }
      const idx = () => units.findIndex((u, i) => i > 0 && u.prog < 1 && !u.joining);
      const addB = controls.button('＋ 단위체 연결', () => { const i = idx(); if (i > 0 && (!units[i - 1].joining || units[i - 1].prog > 0.6)) units[i].joining = true; });
      addB.classList.add('on');
      controls.button('⏩ 모두 연결', () => { units.forEach((u, i) => { if (i > 0 && u.prog < 1) setTimeout(() => { u.joining = true; }, i * 700); }); });
      controls.button('↺ 처음으로', () => build());
      controls.segment('고분자', Object.keys(TYPES).map((k) => ({ value: k, label: k.toUpperCase() })), type, (v) => { type = v; build(); });
      build();
      let txt = '', t0 = 0;
      return {
        update(dt, t) {
          dt = Math.min(dt, 0.05);
          const nJ = place(dt, t);
          const T = TYPES[type], n = nJ;
          const tx = '<b>' + T.n + '</b> · 단위체: ' + T.mono + '<br>연결된 단위체 <b>' + n + '</b>개 → (' + T.unit + ')<sub>' + n + '</sub><br>' + (n >= NU ? '이렇게 n이 아주 크면 고분자예요. 쓰임: ' + T.use : '이중 결합이 끊어지며 단위체가 차례로 이어져요.');
          if (tx !== txt) { txt = tx; info(tx); }
        },
      };
    },
  });
})();
