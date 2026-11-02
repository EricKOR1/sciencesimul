/* m2-digestion · 3D 소화 기관과 소장 융털
   음식물이 입 → 식도 → 위 → 소장 → 대장 → 항문으로 지나가며 소화 효소로 분해되는 모습, 소장 융털에서 영양소가 흡수되는 모습을 입체로 봐요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const ST = [
    { n: '입', u: [0, 0.1], t: '<b>입</b>: 침 속 <b>아밀레이스</b>가 녹말을 엿당 등으로 분해해요.' },
    { n: '식도', u: [0.1, 0.2], t: '<b>식도</b>: 소화 효소는 없고, 음식물이 위로 밀려 내려가요.' },
    { n: '위', u: [0.2, 0.36], t: '<b>위</b>: 위액의 <b>펩신</b>이 단백질을 분해해요.' },
    { n: '소장', u: [0.36, 0.72], t: '<b>소장</b>: 이자액(<b>트립신·라이페이스</b>…)과 쓸개즙으로 분해가 끝나고, 영양소를 <b>흡수</b>해요.' },
    { n: '대장', u: [0.72, 1.0], t: '<b>대장</b>: 물을 흡수하고, 남은 찌꺼기는 항문으로 나가요.' },
  ];

  window.SciSim3D.attach({
    title: '소화 기관 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHN ? 17 : 12.5, theta: 0.25, phi: 1.35, min: 5, max: 26, target: [0, 1.0, 0] },
    autoRotate: 0,
    levels: [2, 3],
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      const V3 = THREE.Vector3;
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.6, metalness: 0.02 }, o || {}));
      const sm = () => window.__sim;
      const tract = new THREE.Group(), vil = new THREE.Group(); root.add(tract, vil);

      /* ============ 소화 기관 ============ */
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(2.6, 5.2, 12, 32), new THREE.MeshStandardMaterial({ color: 0x7f9bd0, transparent: true, opacity: 0.1, roughness: 0.3, depthWrite: false }));
      body.position.set(0, 0.6, 0); body.scale.set(1, 1, 0.5); body.renderOrder = 0; tract.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.9, 24, 16), new THREE.MeshStandardMaterial({ color: 0xf2c9a0, transparent: true, opacity: 0.35, roughness: 0.6, depthWrite: false })); head.position.set(0, 5.2, 0); tract.add(head);
      const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 12), mat(0xd9605a)); mouth.scale.set(1.3, 0.55, 0.8); mouth.position.set(0, 4.9, 0.55); tract.add(mouth);
      function tube(pts, r, c, o) { const cu = new THREE.CatmullRomCurve3(pts); const m = new THREE.Mesh(new THREE.TubeGeometry(cu, Math.max(20, pts.length * 14), r, 12, false), mat(c, o)); m.castShadow = true; tract.add(m); return m; }
      const eso = tube([new V3(0, 4.85, 0.45), new V3(0, 4.3, 0.1), new V3(0, 3.0, 0), new V3(0.15, 2.1, 0)], 0.14, 0xe0877a);
      const stom = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), mat(0xe58b7e, { roughness: 0.5 })); stom.scale.set(1.05, 0.75, 0.65); stom.position.set(0.75, 1.45, 0); stom.rotation.z = -0.55; stom.castShadow = true; tract.add(stom);
      // 소장: 구불구불
      const sp = []; const rows = 7;
      for (let r = 0; r < rows; r++) { const y = 0.55 - r * 0.28, dir = r % 2 ? -1 : 1; sp.push(new V3(-dir * 1.05, y, 0.12 * (r % 3 - 1)), new V3(-dir * 0.4, y - 0.05, 0.2), new V3(dir * 0.4, y - 0.1, -0.2), new V3(dir * 1.05, y - 0.14, 0.1 * (r % 2))); }
      const small = tube([new V3(-0.3, 1.05, 0.05), new V3(-0.7, 0.85, 0.1), ...sp], 0.13, 0xf0a897, { roughness: 0.45 });
      // 대장 (소장을 감싸요)
      const lp = [new V3(-1.55, -1.5, 0), new V3(-1.65, -0.6, 0), new V3(-1.6, 0.5, 0), new V3(-1.2, 0.95, 0), new V3(0, 1.0, 0), new V3(1.2, 0.95, 0), new V3(1.6, 0.4, 0), new V3(1.65, -0.7, 0), new V3(1.4, -1.5, 0), new V3(0.6, -1.85, 0), new V3(0.1, -2.2, 0), new V3(0.1, -2.8, 0.05)];
      const large = tube(lp, 0.24, 0xc8a46a, { roughness: 0.7 });
      const anus = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), mat(0x8a5a3a)); anus.position.set(0.1, -2.85, 0.05); tract.add(anus);
      // 간 · 쓸개 · 이자
      const liver = new THREE.Mesh(new THREE.SphereGeometry(1, 36, 24), mat(0x8c3b32, { roughness: 0.5 })); liver.scale.set(1.25, 0.7, 0.7); liver.position.set(-1.05, 1.6, 0.15); liver.rotation.z = 0.15; liver.castShadow = true; tract.add(liver);
      const gall = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), mat(0x4fa56a, { roughness: 0.3 })); gall.scale.set(0.8, 1.2, 0.8); gall.position.set(-0.6, 1.1, 0.4); tract.add(gall);
      const panc = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 1.5, 6, 14), mat(0xe8c372, { roughness: 0.5 })); panc.rotation.z = Math.PI / 2; panc.position.set(0.25, 0.95, -0.3); tract.add(panc);
      // 음식물 경로
      const food = new THREE.CatmullRomCurve3([
        new V3(0, 4.9, 0.55), new V3(0, 4.3, 0.1), new V3(0, 3.0, 0), new V3(0.2, 2.1, 0), new V3(0.75, 1.45, 0), new V3(0.1, 1.05, 0.05), new V3(-0.7, 0.85, 0.1), ...sp.filter((_, i) => i % 2 === 0),
        new V3(-1.55, -1.5, 0), ...lp.slice(0), ]);
      const bolus = new THREE.Mesh(new THREE.SphereGeometry(0.26, 24, 16), mat(0xffd34d, { emissive: 0xaa7a00, emissiveIntensity: 0.5, roughness: 0.4 })); tract.add(bolus);
      const bits = []; for (let i = 0; i < 10; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe08a })); bolus.add(b); bits.push(b); }
      const lTr = [label('입', mouth, { offset: [0.0, 0.0, 0.35] }), label('식도', [0, 3.4, 0.1]), label('위', stom, { offset: [0.9, 0.25, 0.3] }), label('간', liver, { offset: [-0.3, 0.55, 0.4] }), label('쓸개', gall, { offset: [-0.1, -0.35, 0.3] }), label('이자', panc, { offset: [0.2, 0.3, -0.1] }), label('소장', [0, -0.95, 0.3]), label('대장', [-1.75, -0.2, 0.1]), label('항문', anus, { offset: [0.5, -0.1, 0] })];
      const enz = [label('아밀레이스', mouth, { offset: [1.0, 0.05, 0], color: 'rgba(200,120,20,.95)' }), label('펩신', stom, { offset: [1.8, -0.35, 0], color: 'rgba(160,50,140,.95)' }), label('트립신 · 라이페이스', small, { offset: [2.3, 0.2, 0.4], color: 'rgba(30,130,150,.95)' })];

      /* ============ 소장 융털 ============ */
      const wallBase = new THREE.Mesh(new THREE.BoxGeometry(9, 0.8, 3.6), mat(0xf4b3a8, { roughness: 0.6 })); wallBase.position.set(0, -2.2, 0); vil.add(wallBase);
      const lumen = new THREE.Mesh(new THREE.BoxGeometry(9, 4.6, 3.6), new THREE.MeshStandardMaterial({ color: 0xffe8a8, transparent: true, opacity: 0.06, depthWrite: false })); lumen.position.set(0, 0.5, 0); vil.add(lumen);
      const villi = [];
      const VX = [-3.4, -1.7, 0, 1.7, 3.4];
      VX.forEach((x, i) => {
        const big = i === 2, h = big ? 3.6 : 2.4, r = big ? 0.78 : 0.5;
        const g = new THREE.Group(); g.position.set(x, -1.8, big ? 0.3 : -0.9 + (i % 2) * 0.2);
        const sk = new THREE.Mesh(new THREE.CapsuleGeometry(r, h - 2 * r, 10, 24), new THREE.MeshStandardMaterial({ color: 0xf5a9a0, transparent: true, opacity: big ? 0.38 : 0.7, roughness: 0.4, depthWrite: false })); sk.position.y = h / 2; sk.renderOrder = 2; g.add(sk);
        if (big) {
          // 모세 혈관 (고리) · 암죽관 (가운데)
          const cc = new THREE.CatmullRomCurve3([new V3(-0.25, 0, 0), new V3(-0.4, 1.5, 0.05), new V3(-0.3, 2.8, 0), new V3(0, 3.15, 0), new V3(0.3, 2.8, 0), new V3(0.4, 1.5, 0.05), new V3(0.25, 0, 0)]);
          g.add(new THREE.Mesh(new THREE.TubeGeometry(cc, 60, 0.07, 8, false), mat(0xe8453f, { emissive: 0x7a1010, emissiveIntensity: 0.4, roughness: 0.3 })));
          const lac = new THREE.CatmullRomCurve3([new V3(0, 0, 0), new V3(0, 1.5, 0), new V3(0, 2.9, 0)]);
          g.add(new THREE.Mesh(new THREE.TubeGeometry(lac, 30, 0.12, 8, false), mat(0xffe08a, { emissive: 0x9a7a10, emissiveIntensity: 0.4, roughness: 0.3 })));
          g.userData = { cap: cc, lac };
        }
        vil.add(g); villi.push(g);
      });
      const big = villi[2];
      const NN = 18;
      const gl = new THREE.InstancedMesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshBasicMaterial({ color: 0x8fd0ff }), NN);
      const fa = new THREE.InstancedMesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffb02e }), NN);
      gl.frustumCulled = fa.frustumCulled = false; vil.add(gl, fa);
      const lVil = [label('융털', big, { offset: [1.3, 3.2, 0.3] }), label('모세 혈관', big, { offset: [-1.5, 2.2, 0.3], color: 'rgba(210,50,50,.95)' }), label('암죽관', big, { offset: [1.6, 1.3, 0.3], color: 'rgba(170,130,10,.95)' }), label('포도당 · 아미노산', [-3.0, 1.6, 0.5], { color: 'rgba(40,120,190,.95)' }), label('지방산 · 모노글리세리드', [3.0, 1.9, 0.5], { color: 'rgba(190,120,10,.95)' })];
      vil.visible = false;

      let mode = 'tract', play = true, u = 0, labsOn = true, enzOn = true, lastS = -1;
      const dm = new THREE.Object3D(), tmp = new V3();
      function apply() {
        tract.visible = mode === 'tract'; vil.visible = mode === 'vil';
        lTr.forEach((l) => l.show(labsOn && mode === 'tract')); enz.forEach((l) => l.show(enzOn && mode === 'tract')); lVil.forEach((l) => l.show(labsOn && mode === 'vil'));
        if (mode === 'tract') { orbit.dist = PHN ? 17 : 12.5; orbit.ty = 1.0; orbit.phi = 1.35; } else { orbit.dist = PHN ? 13 : 9.5; orbit.ty = 0.1; orbit.phi = 1.3; }
        lastS = -1;
        if (mode === 'vil') info('<b>소장 융털</b>이 영양소를 흡수해요.<br><b style="color:#8fd0ff">포도당·아미노산</b> → <b>모세 혈관</b><br><b style="color:#ffb02e">지방산·모노글리세리드</b> → <b>암죽관</b>');
      }
      const sg = controls.segment('보기', [{ label: '소화 기관', value: 'tract' }, { label: '소장 융털', value: 'vil' }], mode, (v) => { mode = v; apply(); });
      const stSeg = controls.segment('이동', ST.map((s, i) => ({ label: s.n, value: i })), 0, (i) => { play = false; u = (ST[i].u[0] + ST[i].u[1]) / 2; pb.textContent = '▶ 재생'; });
      const pb = controls.button('⏸ 멈춤', () => { play = !play; pb.textContent = play ? '⏸ 멈춤' : '▶ 재생'; });
      controls.button('이름표', () => { labsOn = !labsOn; enzOn = labsOn; apply(); });
      apply();
      let lastSc = '', k0 = 0;
      function readScene() { const s = sm() && sm().S && sm().S.scene; if (!s || s === lastSc) return; lastSc = s; const m = s === 'villi' ? 'vil' : 'tract'; if (m !== mode) { mode = m; sg.set(m); apply(); } }
      return {
        sync() { lastSc = ''; readScene(); },
        update(dt, t) {
          if ((k0++ % 15) === 0) readScene();
          if (mode === 'tract') {
            if (play) u = (u + dt / 36) % 1;
            bolus.position.copy(food.getPointAt(u));
            let s = ST.findIndex((q) => u >= q.u[0] && u < q.u[1]); if (s < 0) s = 0;
            if (s !== lastS) { lastS = s; info(ST[s].t + '<br>소화: 큰 영양소가 작은 영양소로 잘게 쪼개지는 과정이에요.'); stSeg.set(s); }
            // 분해: 단계가 지날수록 덩어리가 작아지고 조각이 흩어져요
            const brk = Math.min(1, Math.max(0, (u - 0.05) / 0.45));
            bolus.scale.setScalar(1 - 0.45 * brk); bits.forEach((b, i) => { const a = i * 2.4 + t * 1.5; b.position.set(Math.cos(a), Math.sin(a * 1.3), Math.sin(a)).multiplyScalar(0.3 + 0.6 * brk); b.scale.setScalar(0.6 + 0.5 * brk); });
            stom.scale.set(1.05 + 0.03 * Math.sin(t * 3), 0.75, 0.65);
          } else {
            const g = big.userData;
            for (let i = 0; i < NN; i++) {
              const ph = (t * 0.28 + i / NN) % 1, a = i * 2.39;
              // 포도당 · 아미노산: 소장 안 → 융털 → 모세 혈관을 따라 올라가요
              const x0 = -2.4 + Math.cos(a) * 0.6, y0 = -1.2 + (i % 5) * 0.6, bp = big.position;
              if (ph < 0.4) { const k = ph / 0.4; tmp.set(x0 + (bp.x - 0.3 - x0) * k, y0 + (-1.5 - y0) * k, 0.3 * (1 - k) + bp.z * k); }
              else { const q = g.cap.getPointAt(Math.min(0.999, (ph - 0.4) / 0.6)); tmp.set(q.x + bp.x, q.y + bp.y, q.z + bp.z); }
              dm.position.copy(tmp); dm.scale.setScalar(1); dm.updateMatrix(); gl.setMatrixAt(i, dm.matrix);
              // 지방산 · 모노글리세리드: → 암죽관(가운데)을 따라 올라가요
              const x1 = 2.5 + Math.cos(a * 1.7) * 0.6;
              if (ph < 0.4) { const k = ph / 0.4; tmp.set(x1 + (bp.x - x1) * k, y0 + (-1.4 - y0) * k, 0.3 * (1 - k) + bp.z * k); }
              else { const k = (ph - 0.4) / 0.6; tmp.set(bp.x, bp.y + 0.1 + k * 2.9, bp.z); }
              dm.position.copy(tmp); dm.updateMatrix(); fa.setMatrixAt(i, dm.matrix);
            }
            gl.instanceMatrix.needsUpdate = fa.instanceMatrix.needsUpdate = true;
          }
        },
      };
    },
  });
})();
