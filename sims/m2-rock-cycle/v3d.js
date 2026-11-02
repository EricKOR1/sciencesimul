/* m2-rock-cycle · 3D 암석의 순환 (화산 · 풍화와 퇴적 · 땅속 변성 · 마그마)
   작은 빛 알갱이가 암석의 순환 경로를 따라 한 바퀴 돌며 각 과정을 보여 줘요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const D = 4.6;
  // 순환 단계 (경로 위의 구간 [시작u, 끝u])
  const STAGES = [
    { id: 'cool', name: '냉각 · 굳음', u: [0.0, 0.17], t: '마그마가 <b>식어서 굳으면 화성암</b>이 돼요.' },
    { id: 'weather', name: '풍화 · 침식', u: [0.17, 0.4], t: '암석이 부서지고(<b>풍화</b>) 깎여서 흘러가요(<b>침식·운반</b>).' },
    { id: 'sed', name: '퇴적 · 굳음', u: [0.4, 0.62], t: '알갱이가 쌓이고 <b>다져져 굳으면 퇴적암</b>이 돼요.' },
    { id: 'meta', name: '열과 압력', u: [0.62, 0.84], t: '땅속 <b>열과 압력</b>을 받으면 <b>변성암</b>이 돼요.' },
    { id: 'melt', name: '녹음', u: [0.84, 1.0], t: '아주 뜨거워지면 암석이 <b>녹아 마그마</b>가 돼요.' },
  ];

  window.SciSim3D.attach({
    title: '암석의 순환 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHN ? 17 : 12.5, theta: 0.35, phi: 1.2, min: 6, max: 26, target: [0, -0.4, 0] },
    autoRotate: 0,
    levels: [3],
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3;
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.85, metalness: 0.02 }, o || {}));
      function poly(pts, depth, m, z0) {
        const sh = new THREE.Shape(); pts.forEach((p, i) => i ? sh.lineTo(p[0], p[1]) : sh.moveTo(p[0], p[1]));
        const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false }); g.translate(0, 0, -depth / 2 + (z0 || 0));
        const me = new THREE.Mesh(g, m); me.castShadow = true; me.receiveShadow = true; return me;
      }
      // 지형 높이 (단면): 화산(왼쪽) · 산비탈 · 바다 분지(오른쪽)
      const h = (x) => {
        const vol = 2.1 * Math.exp(-Math.pow((x + 3.1) / 0.9, 2)) + 0.5 * Math.exp(-Math.pow((x + 3.1) / 2.2, 2));
        const mt = 1.0 / (1 + Math.exp((x - 0.2) * 1.8));        // 산에서 분지로 내려가는 경사
        return Math.max(-0.45, -0.45 + vol + mt * 1.1 - Math.max(0, x - 3.2) * 0.0);
      };
      const XS = []; for (let x = -5; x <= 5.001; x += 0.2) XS.push(+x.toFixed(3));
      const top = XS.map((x) => [x, h(x)]);
      const B = -3.3;
      // 바탕 (화성암 바위층)
      root.add(poly([[-5, B], ...top, [5, B]], D, mat(0x6f6a73, { roughness: 0.9 })));
      // 분지의 퇴적층 (모래 · 진흙 · 자갈) : 오른쪽
      const sedCols = [0xd9c27a, 0xa77c58, 0x8d8277];
      sedCols.forEach((c, i) => {
        const y0 = -0.45 - i * 0.38, y1 = y0 - 0.38;
        root.add(poly([[1.4, y0], [5, y0], [5, y1], [1.4, y1]], D + 0.03, mat(c, { roughness: 0.9 })));
      });
      // 변성암 영역: 줄무늬(엽리)
      const metaBand = [0x7a6e94, 0xb7aac9, 0x6a5f86, 0xa89ac0, 0x7a6e94, 0xb7aac9];
      metaBand.forEach((c, i) => {
        const y0 = -1.65 - i * 0.2, y1 = y0 - 0.2;
        root.add(poly([[1.2, y0 + 0.0], [5, y0], [5, y1], [1.2, y1]], D + 0.03, mat(c, { roughness: 0.6 })));
      });
      // 마그마방
      const chamber = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24), mat(0xff6a1f, { emissive: 0xff4a10, emissiveIntensity: 1.1, roughness: 0.3 }));
      chamber.scale.set(2.2, 0.75, D * 0.5); chamber.position.set(-1.4, -2.55, 0); root.add(chamber);
      // 마그마 관 (굴뚝)
      const conduit = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new V3(-1.9, -2.2, 0), new V3(-2.5, -0.6, 0), new V3(-3.0, 1.0, 0), new V3(-3.1, 2.25, 0)]), 40, 0.18, 10), mat(0xff7a2a, { emissive: 0xff4a10, emissiveIntensity: 1.0 }));
      root.add(conduit);
      // 바다
      const sea = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.5, D), new THREE.MeshStandardMaterial({ color: 0x2f8fd8, transparent: true, opacity: 0.4, roughness: 0.1, depthWrite: false }));
      sea.position.set(3.2, -0.2, 0); sea.renderOrder = 3; root.add(sea);
      // 앞면 레이어가 보이도록 앞쪽 투명 안내 (생략)

      // 알갱이 (풍화된 조각이 비탈을 구름)
      const grains = [];
      const gG = new THREE.IcosahedronGeometry(0.1, 0);
      for (let i = 0; i < 16; i++) { const m = new THREE.Mesh(gG, mat(0xb7a58a)); m.userData = { u: i / 16, z: (Math.random() - 0.5) * D * 0.7, s: 0.6 + Math.random() * 0.8 }; m.castShadow = true; root.add(m); grains.push(m); }

      // 순환 경로 (앞면 앞쪽을 따라 한 바퀴)
      const Z = D / 2 + 0.18;
      const pts = [
        new V3(-1.4, -2.55, Z), new V3(-2.3, -1.0, Z), new V3(-3.0, 0.8, Z), new V3(-3.1, 2.4, Z),        // 냉각 구간: 마그마 → 화산
        new V3(-2.4, 1.3, Z), new V3(-1.0, 0.5, Z), new V3(0.2, 0.35, Z), new V3(1.6, -0.2, Z),            // 풍화 · 침식 · 운반
        new V3(3.0, -0.5, Z), new V3(3.4, -0.9, Z), new V3(3.4, -1.4, Z),                                   // 퇴적 · 굳음
        new V3(3.2, -2.0, Z), new V3(2.2, -2.6, Z), new V3(1.0, -2.9, Z),                                   // 열과 압력 (변성)
        new V3(-0.2, -2.8, Z), new V3(-1.0, -2.65, Z),                                                      // 녹음
      ];
      const curve = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.5);
      const tubePts = curve.getPoints(160);
      // 방향 화살표가 있는 순환 띠
      const loopTube = new THREE.Mesh(new THREE.TubeGeometry(curve, 240, 0.035, 8, true), new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0.55 }));
      root.add(loopTube);
      const heads = [];
      for (let i = 0; i < 8; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.3, 14), new THREE.MeshBasicMaterial({ color: 0xffd34d })); const u = i / 8; c.position.copy(curve.getPointAt(u)); c.quaternion.setFromUnitVectors(new V3(0, 1, 0), curve.getTangentAt(u)); root.add(c); heads.push(c); }
      const token = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.35, depthWrite: false }));
      token.add(glow); root.add(token);
      // 단계 구간 표시 (굵은 띠)
      const segTubes = STAGES.map((st) => {
        const pp = []; for (let i = 0; i <= 30; i++) pp.push(curve.getPointAt(Math.min(0.9999, st.u[0] + (st.u[1] - st.u[0]) * i / 30)));
        const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pp), 40, 0.1, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.0 }));
        root.add(m); return m;
      });
      const labRock = [label('화성암', [-2.2, 1.0, Z], { color: 'rgba(255,255,255,.2)' }), label('퇴적암', [4.0, -0.9, Z]), label('변성암', [4.0, -2.2, Z]), label('마그마', chamber, { offset: [-0.3, -0.1, Z] })];
      const labStage = label('', token, { offset: [0, 0.55, 0], color: 'rgba(255,211,77,.95)' }); labStage.el.style.color = '#1b2333';
      const labW = label('풍화 · 침식', [-0.3, 1.1, 0]); const labV = label('화산', [-3.1, 2.9, 0]);

      let u = 0, play = true, stage = 0, labsOn = true;
      const segCtl = controls.segment('과정', STAGES.map((s, i) => ({ label: s.name, value: i })), 0, (i) => { play = false; u = (STAGES[i].u[0] + STAGES[i].u[1]) / 2; pb.textContent = '▶ 자동 순환'; });
      const pb = controls.button('⏸ 멈춤', () => { play = !play; pb.textContent = play ? '⏸ 멈춤' : '▶ 자동 순환'; });
      controls.button('이름표', () => { labsOn = !labsOn; labRock.concat([labW, labV]).forEach((l) => l.show(labsOn)); });
      let lastS = -1;
      return {
        update(dt, t) {
          if (play) u = (u + dt / 28) % 1;
          let s = STAGES.findIndex((q) => u >= q.u[0] && u < q.u[1]); if (s < 0) s = 0;
          if (s !== lastS) { lastS = s; segCtl.set(s); info(`<b>${STAGES[s].name}</b><br>${STAGES[s].t}<br>화성암 → 퇴적물 → 퇴적암 → 변성암 → 마그마 …`); labStage.set(STAGES[s].name); }
          segTubes.forEach((m, i) => { m.material.opacity = i === s ? 0.5 : 0; });
          token.position.copy(curve.getPointAt(u));
          glow.scale.setScalar(1 + 0.2 * Math.sin(t * 6));
          chamber.material.emissiveIntensity = 0.9 + 0.3 * Math.sin(t * 2);
          // 알갱이: 풍화 구간에서 비탈을 따라 굴러요
          grains.forEach((g) => {
            const k = (g.userData.u + t * 0.05 * g.userData.s) % 1, x = -2.3 + k * 4.6, y = h(x) + 0.08;
            g.position.set(x, y, g.userData.z); g.rotation.x = t * 3 * g.userData.s; g.visible = x < 3.4;
            g.material.color.setHex(x < 1 ? 0xa6968a : 0xd9c27a);
          });
        },
      };
    },
  });
})();
