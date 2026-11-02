/* h1-heat-budget · 3D 지구의 열수지 (지표-대기 단면 블록)
   입사하는 태양 복사 에너지를 100으로 놓고, 반사·흡수·지구 복사의 크기를 화살표 굵기로 보여 줘요 (2D 실험의 값과 같아요).
   반사 30 · 대기 흡수 20 · 지표 흡수 50 / 지표 복사 114 · 대기가 되돌려 보내는 복사 92 · 우주로 나가는 복사 70.
   온실 기체가 늘면 되돌아오는 복사가 늘어 지표가 더 데워져요. (크기와 비율은 보기 좋게 줄인 모형이에요) */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const SUN_C = 0xffc93c, IR_C = 0xe0213f;

  window.SciSim3D.attach({
    title: '3D 지구의 열수지',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHN ? 27 : 18.5, theta: 0.28, phi: 1.28, target: [0, 4.3, 0], min: 8, max: 36 },
    autoRotate: 0,
    levels: [0, 1],
    build(ctx) {
      const { THREE, root, scene, label, info, controls } = ctx;
      const V3 = THREE.Vector3, Y = new V3(0, 1, 0);
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.6, metalness: 0.05 }, o || {}));
      const st = { gas: 1, show: 'all', t: 0 };

      /* ---------- 땅 · 바다 · 대기 ---------- */
      const GW = 13, GD = 5;
      const land = new THREE.Mesh(new THREE.BoxGeometry(GW * 0.55, 0.8, GD), mat(0x2f6a24, { roughness: 0.95 })); land.position.set(-GW * 0.225, -0.4, 0); land.receiveShadow = true; root.add(land);
      const sea = new THREE.Mesh(new THREE.BoxGeometry(GW * 0.45, 0.8, GD), mat(0x0f4a9a, { roughness: 0.3, metalness: 0.05 })); sea.position.set(GW * 0.275, -0.4, 0); sea.receiveShadow = true; root.add(sea);
      const rock = new THREE.Mesh(new THREE.BoxGeometry(GW, 0.5, GD), mat(0x4a4036, { roughness: 1 })); rock.position.y = -1.05; root.add(rock);
      for (let i = 0; i < 6; i++) { // 숲 (작은 나무)
        const tr = new THREE.Group(), tk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.3, 8), mat(0x6b4a2b)), cr = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.65, 10), mat(0x2f7a3a));
        cr.position.y = 0.45; tr.add(tk, cr); tr.position.set(-5.8 + i * 0.55, 0.15, -1.6 + (i % 3) * 0.3); tr.traverse((o) => { if (o.isMesh) o.castShadow = true; }); root.add(tr);
      }
      const ATH = 5;
      const atm = new THREE.Mesh(new THREE.BoxGeometry(GW, ATH, GD), new THREE.MeshStandardMaterial({ color: 0x8fc2ff, transparent: true, opacity: 0.13, roughness: 0.2, depthWrite: false }));
      atm.position.y = ATH / 2; root.add(atm);
      const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(GW, ATH, GD)), new THREE.LineBasicMaterial({ color: 0xa9d0ff, transparent: true, opacity: 0.45 }));
      frame.position.y = ATH / 2; root.add(frame);
      label('대기', [-GW / 2, ATH - 0.4, GD / 2], { size: 12, offset: [0.9, 0, 0] });
      label('지표', [GW / 2, 0.1, GD / 2], { size: 12, offset: [-0.8, 0.2, 0] });
      label('우주', [GW / 2, ATH + 3.2, 0], { size: 12, offset: [-0.8, 0, 0] });
      // 구름
      const cloud = new THREE.Group();
      [[0, 0, 0, 0.55], [0.55, 0.05, 0.1, 0.45], [-0.55, -0.05, -0.1, 0.42], [0.2, 0.3, 0, 0.42], [1.0, -0.1, 0.2, 0.32]].forEach((c) => { const m = new THREE.Mesh(new THREE.SphereGeometry(c[3], 18, 14), mat(0xf5f8ff, { roughness: 0.9, transparent: true, opacity: 0.95 })); m.position.set(c[0], c[1], c[2]); cloud.add(m); });
      cloud.position.set(-3.4, 4.35, 0.6); cloud.scale.setScalar(1.2); root.add(cloud);
      // 태양
      const sunPos = new V3(-7.6, 10.5, -1);
      const sun = new THREE.Mesh(new THREE.SphereGeometry(1.3, 36, 24), new THREE.MeshBasicMaterial({ color: 0xffd23f })); sun.position.copy(sunPos); root.add(sun);
      const gc = document.createElement('canvas'); gc.width = gc.height = 128; const g2 = gc.getContext('2d'), gr = g2.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, 'rgba(255,225,130,1)'); gr.addColorStop(0.3, 'rgba(255,190,60,.5)'); gr.addColorStop(1, 'rgba(255,160,0,0)'); g2.fillStyle = gr; g2.fillRect(0, 0, 128, 128);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(gc), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); glow.scale.set(8, 8, 1); glow.position.copy(sunPos); root.add(glow);
      label('☀ 태양', sun, { size: 12, offset: [0, -1.8, 0] });

      /* ---------- 온실 기체 분자 ---------- */
      const mols = []; // { g, kind, base, ph }
      const cMat = mat(0x5a6577, { roughness: 0.5 }), oMat = mat(0xe2464b, { roughness: 0.4 }), hMat = mat(0xf4f6fb, { roughness: 0.4 }), owMat = mat(0x3b82f6, { roughness: 0.4 });
      function co2() {
        const g = new THREE.Group(), c = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 10), cMat);
        const o1 = new THREE.Mesh(new THREE.SphereGeometry(0.19, 14, 10), oMat), o2 = o1.clone(); o1.position.x = -0.3; o2.position.x = 0.3; g.add(c, o1, o2); return g;
      }
      function h2o() {
        const g = new THREE.Group(), o = new THREE.Mesh(new THREE.SphereGeometry(0.19, 14, 10), owMat);
        const h1 = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8), hMat), h2 = h1.clone(); h1.position.set(-0.2, -0.15, 0); h2.position.set(0.2, -0.15, 0); g.add(o, h1, h2); return g;
      }
      let seed = 11; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      const NMAX = 34;
      for (let i = 0; i < NMAX; i++) { const g = co2(); g.userData = { kind: 'co2', b: new V3(-5.8 + rnd() * 11.6, 0.9 + rnd() * 3.3, -2 + rnd() * 4), ph: rnd() * 6.28, i }; root.add(g); mols.push(g); }
      for (let i = 0; i < 8; i++) { const g = h2o(); g.userData = { kind: 'h2o', b: new V3(-5.5 + rnd() * 11, 0.8 + rnd() * 3.4, -2 + rnd() * 4), ph: rnd() * 6.28, i: 0 }; root.add(g); mols.push(g); }
      const nCO2 = () => (st.gas === 0 ? 8 : st.gas === 1 ? 16 : 32);

      /* ---------- 화살표 (굵기 = 에너지의 양) ---------- */
      const arrows = [];
      function flux(name, a, b, col, val, kind, o) {
        o = o || {};
        const g = new THREE.Group(); root.add(g);
        const sm = new THREE.MeshStandardMaterial({ color: col, roughness: 0.35, metalness: 0.05, emissive: col, emissiveIntensity: 0.25, transparent: true });
        const sh = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 14), sm), hd = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 16), sm);
        sh.castShadow = false; g.add(sh, hd);
        const beads = []; for (let i = 0; i < 3; i++) { const bd = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 })); g.add(bd); beads.push(bd); }
        const A = { name, a: new V3(...a), b: new V3(...b), g, sh, hd, beads, mat: sm, val, kind, lab: null, base: val, txt: o.txt || name };
        arrows.push(A); return A;
      }
      function layout(A) {
        const d = new V3().subVectors(A.b, A.a), L = d.length(), r = 0.05 + A.val * 0.0024, hl = Math.min(L * 0.4, 0.4 + r * 3.2);
        A.sh.scale.set(r, L - hl, r); A.sh.position.set(0, (L - hl) / 2, 0);
        A.hd.scale.set(r * 1.9, hl, r * 1.9); A.hd.position.set(0, L - hl / 2, 0);
        A.g.position.copy(A.a); A.g.quaternion.setFromUnitVectors(Y, d.clone().normalize());
        A.beads.forEach((b) => b.scale.setScalar(r * 0.7 + 0.03)); A.L = L - hl; A.r = r;
      }
      const aIn = flux('입사', [-6.4, 8.9, 0], [-3.55, 5.0, 0], SUN_C, 100, 'sun');
      const aRef = flux('반사', [-3.0, 4.6, 0.3], [-1.4, 8.2, 0.3], 0xffd54a, 30, 'sun');
      const aAtm = flux('대기 흡수', [-3.5, 4.9, -0.4], [-1.9, 2.4, -0.4], SUN_C, 20, 'sun');
      const aSrf = flux('지표 흡수', [-3.45, 5.0, 0], [-1.2, 0.1, 0], SUN_C, 50, 'sun');
      const aRs = flux('지표 복사', [2.2, 0.15, 0.4], [2.2, 4.35, 0.4], IR_C, 114, 'ir');
      const aBk = flux('되돌아오는 복사', [4.4, 4.2, -0.2], [4.4, 0.15, -0.2], 0xf0506a, 92, 'ir');
      const aOut = flux('우주로 방출', [0.4, 4.6, 0], [0.4, 8.8, 0], IR_C, 70, 'ir');
      const labs = {};
      const mk = (A, off) => { A.lab = label(A.name + ' ' + A.val, A.g, { size: 12, color: A.kind === 'sun' ? 'rgba(160,100,0,.95)' : 'rgba(190,24,60,.95)', offset: off }); };
      mk(aIn, [-0.9, 0.9, 0]); mk(aRef, [1.3, 0, 0]); mk(aAtm, [1.2, -0.4, 0]); mk(aSrf, [1.1, 0.2, 0]); mk(aRs, [-1.1, 1.8, 0]); mk(aBk, [1.2, 1.8, 0]); mk(aOut, [1.3, 2.2, 0]);
      // 선택한 화살표의 라벨 위치는 화살표 중심
      arrows.forEach((A) => { A.lab.obj = A.mid = new THREE.Object3D(); A.mid.position.copy(A.a).lerp(A.b, 0.5); root.add(A.mid); });

      function apply() {
        const f = st.gas;           // 0 적게 / 1 현재 / 2 많이
        const bk = [70, 92, 112][f] , rs = [90, 114, 126][f];
        aBk.val = bk; aRs.val = rs;
        arrows.forEach((A) => {
          const hide = (st.show === 'sun' && A.kind === 'ir') || (st.show === 'ir' && A.kind === 'sun');
          A.g.visible = !hide; A.lab.show(!hide);
          layout(A);
          A.lab.set(f === 1 || (A !== aBk && A !== aRs) ? A.name + ' ' + A.val : A.name + (f === 0 ? ' ▼' : ' ▲'));
        });
        const n = nCO2(); let k = 0;
        mols.forEach((m) => { if (m.userData.kind === 'co2') { m.visible = k < n; k++; } });
        const t = ['적게', '지금', '2배 가까이'][f];
        if (f === 1) info('입사한 햇빛 <b>100</b> 중 30은 반사되고, 나머지 <b>70</b>이 지구에 흡수돼요.<br>지구는 같은 양(70)을 우주로 내보내서 <b>균형</b>을 이뤄요.');
        else if (f === 2) info('온실 기체가 늘면 대기가 <b>되돌려 보내는 복사</b>가 늘어요.<br>지표가 더 데워지는 것이 <b>온실 효과 강화</b>예요.');
        else info('온실 기체가 적으면 되돌아오는 복사가 줄어 지표가 <b>덜 데워져요</b>.<br>화살표 굵기는 에너지의 양이에요.');
      }
      controls.segment('온실 기체', [{ value: 0, label: '적게' }, { value: 1, label: '지금' }, { value: 2, label: '많이' }], 1, (v) => { st.gas = v; apply(); });
      controls.segment('복사', [{ value: 'all', label: '모두' }, { value: 'sun', label: '태양 복사' }, { value: 'ir', label: '지구 복사' }], 'all', (v) => { st.show = v; apply(); });
      apply();

      return {
        update(dt, t) {
          st.t += dt;
          mols.forEach((m) => {
            const u = m.userData; if (!m.visible) return;
            m.position.set(u.b.x + Math.sin(t * 0.5 + u.ph) * 0.35, u.b.y + Math.sin(t * 0.7 + u.ph * 2) * 0.25, u.b.z + Math.cos(t * 0.45 + u.ph) * 0.3);
            m.rotation.set(t * 0.3 + u.ph, t * 0.4 + u.ph, t * 0.25);
          });
          arrows.forEach((A, ai) => {
            if (!A.g.visible) return;
            A.beads.forEach((b, i) => { const u = (((st.t * 0.35 + i / 3 + ai * 0.13) % 1) + 1) % 1; b.position.set(0, u * (A.L + 0.2), 0); });
          });
          cloud.position.y = 4.35 + Math.sin(t * 0.6) * 0.06;
          sun.rotation.y = t * 0.1;
        },
        sync() {},
      };
    },
  });
})();
