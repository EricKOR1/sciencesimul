/* h1-food-web · 3D 먹이 그물과 에너지 피라미드
   먹이 그물: 화살표는 먹히는 쪽 → 먹는 쪽 (에너지가 가는 방향). 높이는 먹이 단계(생산자 → 소비자)를 뜻해요.
   에너지 피라미드: 풀 10000 kJ에서 단계마다 약 10 %만 다음 단계로 전달돼요 (나머지는 호흡 등으로 열이 되어 나가요). 2D 실험과 같은 값이에요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);

  const SP = {
    grass: { n: '풀', e: '🌿', lv: 0, p: [-1.8, 0, 1.2], c: 0x3fae5a }, grain: { n: '곡식 열매', e: '🌾', lv: 0, p: [2.4, 0, 1.0], c: 0xd9b43a },
    hopper: { n: '메뚜기', e: '🦗', lv: 1, p: [-3.0, 0, -0.6], c: 0x9bd04a }, rabbit: { n: '토끼', e: '🐇', lv: 1, p: [0.2, 0, 2.6], c: 0xe8dccb },
    mouse: { n: '쥐', e: '🐀', lv: 1, p: [2.8, 0, -1.2], c: 0xa59a8d },
    frog: { n: '개구리', e: '🐸', lv: 2, p: [-2.2, 0, -2.2], c: 0x4cc46c }, snake: { n: '뱀', e: '🐍', lv: 3, p: [0.6, 0, -2.6], c: 0x4f9a8a },
    fox: { n: '여우', e: '🦊', lv: 4, p: [2.0, 0, 1.6], c: 0xe8873a }, hawk: { n: '매', e: '🦅', lv: 4, p: [-1.6, 0, -0.4], c: 0x8a6a4a },
  };
  const LINKS = [['grass', 'hopper'], ['grass', 'rabbit'], ['grass', 'mouse'], ['grain', 'mouse'], ['hopper', 'frog'], ['frog', 'snake'], ['frog', 'hawk'], ['mouse', 'snake'], ['mouse', 'fox'], ['mouse', 'hawk'], ['rabbit', 'fox'], ['snake', 'fox'], ['snake', 'hawk']];
  const CHAIN = ['grass', 'hopper', 'frog', 'snake', 'hawk'];
  const ROLE = ['생산자', '1차 소비자', '2차 소비자', '3차 소비자', '4차 소비자'];
  const EN = [10000, 1000, 100, 10, 1];
  const LV_COL = [0x3fae5a, 0xb9c93a, 0xf0a93a, 0xe5703a, 0xcf3f4a];

  window.SciSim3D.attach({
    title: '3D 먹이 그물과 에너지 피라미드',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHN ? 19 : 12.5, theta: 0.6, phi: 1.2, target: [0, 2.8, 0], min: 7, max: 32 },
    autoRotate: 0.15,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3, Y = new V3(0, 1, 0);
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ envMapIntensity: 0.6, color: c, roughness: 0.45, metalness: 0.05 }, o || {}));
      const S0 = (window.__sim && window.__sim.S) || {};
      const st = { scene: S0.mode === 'pyr' || S0.mode === 'flow' ? 'pyr' : 'web', chain: S0.mode === 'chain', names: true, heat: true, t: 0, last: S0.mode };
      const floor = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.4, 0.25, 56), new THREE.MeshLambertMaterial({ color: 0x2d3547 })); floor.position.y = -0.2; floor.receiveShadow = true; root.add(floor);
      const gW = new THREE.Group(), gP = new THREE.Group(); root.add(gW, gP);
      const LH = 1.35;

      /* ================= 먹이 그물 ================= */
      const nodes = {}, links = [];
      Object.keys(SP).forEach((k) => {
        const s = SP[k], g = new THREE.Group(); g.position.set(s.p[0], s.lv * LH + 0.5, s.p[2]);
        const r = 0.5;
        const body = new THREE.Mesh(s.lv === 0 ? new THREE.CylinderGeometry(0.7, 0.7, 0.34, 32) : new THREE.SphereGeometry(r, 28, 20), mat(s.c, { roughness: 0.4 })); body.castShadow = true; g.add(body);
        // 같은 단계 판 (보기 좋게 바닥에 그림자 막대)
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, s.lv * LH + 0.5, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.15 })); stem.position.y = -(s.lv * LH + 0.5) / 2; g.add(stem);
        gW.add(g); nodes[k] = { g, body, lab: label(s.e + ' ' + s.n, g, { size: 12.5, offset: [0, 0.95, 0] }), k };
      });
      LINKS.forEach(([a, b], i) => {
        const A = nodes[a].g.position, B = nodes[b].g.position, d = new V3().subVectors(B, A), L = d.length(), u = d.clone().normalize();
        const s0 = A.clone().addScaledVector(u, 0.62), s1 = B.clone().addScaledVector(u, -0.7), mid = s0.clone().lerp(s1, 0.5); mid.y += 0.25;
        const curve = new THREE.QuadraticBezierCurve3(s0, mid, s1);
        const m = new THREE.MeshStandardMaterial({ color: 0xffd75e, emissive: 0xffa800, emissiveIntensity: 0.35, roughness: 0.4, transparent: true });
        const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.06, 8, false), m); gW.add(tube);
        const t = curve.getTangentAt(1), head = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.42, 14), m); head.position.copy(s1); head.quaternion.setFromUnitVectors(Y, t); gW.add(head);
        const bead = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true })); gW.add(bead);
        links.push({ a, b, tube, head, m, bead, curve, ph: (i * 0.37) % 1, chain: CHAIN.some((c, j) => CHAIN[j + 1] && c === a && CHAIN[j + 1] === b) });
      });
      // 먹이 단계마다 반투명한 원판 (높이 = 먹이 단계)
      const lvLabs = ROLE.map((t, i) => {
        const d = new THREE.Mesh(new THREE.CylinderGeometry(4.3, 4.3, 0.03, 56), new THREE.MeshBasicMaterial({ color: LV_COL[i], transparent: true, opacity: 0.13, depthWrite: false })); d.position.y = i * LH + 0.25; gW.add(d);
        return label(t, [0, i * LH + 0.25, 0], { size: 11.5, color: 'rgba(20,70,40,.9)', offset: [3.2, 0, 3.0] });
      });

      /* ================= 에너지 피라미드 ================= */
      const R = [3.0, 2.3, 1.65, 1.05, 0.55], LHP = 1.05;
      const layers = [];
      for (let i = 0; i < 5; i++) {
        const rb = R[i], rt = i < 4 ? R[i + 1] : 0.0;
        const g = new THREE.Group(); g.position.y = i * LHP;
        const m = new THREE.Mesh(new THREE.CylinderGeometry(i < 4 ? rt + 0.12 : 0.25, rb, LHP - 0.04, 48), mat(LV_COL[i], { roughness: 0.5 })); m.position.y = LHP / 2; m.castShadow = true; m.receiveShadow = true; g.add(m);
        gP.add(g); layers.push({ g, m });
      }
      const pl = layers.map((L, i) => label(ROLE[i] + ' · ' + EN[i] + ' kJ', L.g, { size: 12, offset: [R[i] * 0.75 + 0.5, LHP / 2, 0] }));
      const pe = ['🌿', '🦗', '🐸', '🐍', '🦅'].map((e, i) => label(e, layers[i].g, { size: 17, offset: [0, LHP / 2, R[i] * 0.55], color: 'rgba(255,255,255,.0)' }));
      pe.forEach((l) => { l.el.style.background = 'transparent'; l.el.style.boxShadow = 'none'; l.el.style.textShadow = '0 1px 3px rgba(0,0,0,.6)'; });
      // 다음 단계로 가는 에너지 화살표 (약 10 %)와 열로 나가는 화살표
      const flow = [], heat = [];
      for (let i = 0; i < 4; i++) {
        const g = new THREE.Group(), L = 0.7;
        const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, L, 10), mat(0xffe14d, { emissive: 0xffb800, emissiveIntensity: 0.6 })), hd = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.3, 12), sh.material);
        sh.position.y = L / 2; hd.position.y = L + 0.1; g.add(sh, hd); g.position.set(-R[i + 1] - 0.55, (i + 1) * LHP - 0.55, 0.0); gP.add(g); flow.push(g);
        for (let k = 0; k < 3; k++) { const h = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.28, 10), new THREE.MeshBasicMaterial({ color: 0xff6a5a, transparent: true, opacity: 0.8 })); h.userData = { i, k, ph: k / 3 }; gP.add(h); heat.push(h); }
      }
      const flowLab = label('약 10 %가 다음 단계로', flow[0], { size: 11.5, offset: [-1.4, 0.4, 0], color: 'rgba(120,80,0,.95)' });
      const heatLab = label('나머지는 열로 나가요', [R[0] + 0.3, 0.6, 0], { size: 11.5, color: 'rgba(170,40,30,.95)', offset: [0.8, 0.2, 0] });

      /* ---------- 상태 ---------- */
      const BIG = [0, 1, 2, 3, 4];
      function applyScene() {
        const w = st.scene === 'web';
        gW.visible = w; gP.visible = !w;
        Object.values(nodes).forEach((n) => n.lab.show(w && st.names)); lvLabs.forEach((l) => l.show(w));
        pl.forEach((l) => l.show(!w)); pe.forEach((l) => l.show(!w)); flowLab.show(!w); heatLab.show(!w && st.heat);
        heat.forEach((h) => { h.visible = !w && st.heat; });
        links.forEach((l) => {
          const dim = w && st.chain && !l.chain; l.m.opacity = dim ? 0.12 : 1; l.m.transparent = true; l.bead.visible = !dim;
        });
        Object.entries(nodes).forEach(([k, n]) => { const dim = st.chain && !CHAIN.includes(k); n.body.material.transparent = true; n.body.material.opacity = dim ? 0.2 : 1; n.lab.show(w && st.names && !dim); });
        if (w && st.chain) info('<b>먹이 사슬</b>: 풀 → 메뚜기 → 개구리 → 뱀 → 매<br>화살표는 먹히는 쪽에서 먹는 쪽으로 가요.');
        else if (w) info('<b>먹이 그물</b>: 먹이 사슬이 여러 개 얽혀 있어요.<br>쥐는 풀·곡식 열매를 먹고, 뱀·여우·매에게 먹혀요.');
        else info('<b>에너지 피라미드</b>: 풀(생산자)의 에너지 <b>10000 kJ</b> 중 단계마다 약 <b>10 %</b>만 전달돼요.<br>그래서 위로 갈수록 에너지(와 개체 수)가 크게 줄어요.');
      }
      const seg = controls.segment('보기', [{ value: 'web', label: '🕸 먹이 그물' }, { value: 'pyr', label: '🔺 에너지 피라미드' }], st.scene, (v) => { st.scene = v; applyScene(); showCtl(); });
      const segC = controls.segment('', [{ value: 0, label: '전체 그물' }, { value: 1, label: '먹이 사슬 하나' }], st.chain ? 1 : 0, (v) => { st.chain = !!v; applyScene(); });
      const heatB = controls.button('🔥 열 손실 보기', () => { st.heat = !st.heat; applyScene(); });
      const namesB = controls.button('🏷 이름', () => { st.names = !st.names; applyScene(); });
      const probe = controls.text(''); probe.style.display = 'none'; const ctlRow = probe.parentElement;
      function showCtl() {
        const w = st.scene === 'web', ch = Array.from(ctlRow.children);
        // [보기 라벨, 버튼2, (빈 라벨), 버튼2, 열 버튼, 이름 버튼]
        const iHeat = ch.indexOf(heatB), iNames = ch.indexOf(namesB), iSeg0 = 3;
        ch.forEach((el, i) => { if (i >= iSeg0 && i < iHeat) el.style.display = w ? '' : 'none'; });
        heatB.style.display = w ? 'none' : ''; namesB.style.display = w ? '' : 'none';
      }
      applyScene(); showCtl();

      return {
        update(dt, t) {
          st.t += dt;
          const S = window.__sim && window.__sim.S;
          if (S && S.mode !== st.last) {
            st.last = S.mode;
            if (S.mode === 'chain' || S.mode === 'web') { st.scene = 'web'; st.chain = S.mode === 'chain'; seg.set('web'); segC.set(st.chain ? 1 : 0); applyScene(); showCtl(); }
            else if (S.mode === 'pyr' || S.mode === 'flow') { st.scene = 'pyr'; seg.set('pyr'); applyScene(); showCtl(); }
          }
          if (st.scene === 'web') {
            links.forEach((l) => { const u = (t * 0.22 + l.ph) % 1; l.bead.position.copy(l.curve.getPointAt(u)); });
            Object.values(nodes).forEach((n) => { n.g.position.y += Math.sin(t * 1.3 + n.k.length) * 0.0015; });
          } else {
            heat.forEach((h) => { const u = (t * 0.4 + h.userData.ph) % 1, i = h.userData.i; h.position.set(R[i] * 0.9 + 0.25 + u * 0.9, (i + 0.5) * LHP + u * 0.7, (h.userData.k - 1) * 0.6); h.material.opacity = (1 - u) * 0.85; });
          }
        },
        sync() {},
      };
    },
  });
})();
