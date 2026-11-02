/* hu-binary-mass · 3D 쌍성의 공전과 질량 중심
   두 별은 공통 질량 중심(타원 궤도의 한 초점)을 중심으로 서로 반대쪽에서 돌아요. 질량 중심은 무거운 별 쪽에 가까워서
   a₁ : a₂ = M_B : M_A 예요. 두 별의 거리 a와 공전 주기 P로 총질량을 구해요: M_A + M_B = a³ / P²  (a는 AU, P는 년, 질량은 태양 질량).
   시리우스 A–B(a ≈ 19.8 AU, P ≈ 50.1년, e ≈ 0.59)를 기준으로 했어요. 2D 실험의 '질량 중심' 단계 값을 읽어 시작해요(읽기 전용). */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const TAU = Math.PI * 2, A_AU = 19.78, E = 0.59, SC = 0.21, P0 = 50.1, M0 = 3.08;

  function kepE(M, e) { M = ((M % TAU) + TAU) % TAU; let x = e > 0.8 ? Math.PI : M + e * Math.sin(M); for (let i = 0; i < 40; i++) { const d = (x - e * Math.sin(x) - M) / (1 - e * Math.cos(x)); x -= d; if (Math.abs(d) < 1e-10) break; } return x; }

  window.SciSim3D.attach({
    title: '쌍성과 질량 중심 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    levels: [0, 1, 2],
    camera: { dist: PHONE ? 16 : 11.5, theta: 0.35, phi: 0.9, min: 6, max: 28, target: [0.8, 0, 0] },
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const st = { mA: 2.06, mB: 1.02, M: 0, tr: true, key: '' };
      const sr = () => { try { return window.__sim && window.__sim.S; } catch (e) { return null; } };
      { const s0 = sr(); if (s0 && s0.cm && s0.cm.mA) st.mA = s0.cm.mA; }
      const ql = (x) => (x < 1 ? 1 : x);
      { let seed = 5; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; const pos = [];
        for (let i = 0; i < 380; i++) { const u = rnd() * 2 - 1, a = rnd() * TAU, r = Math.sqrt(1 - u * u); pos.push(Math.cos(a) * r * 60, u * 60, Math.sin(a) * r * 60); }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        root.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xaec3ff, size: 1.5, sizeAttenuation: false, transparent: true, opacity: 0.5 }))); }
      const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
      const mkStar = (col) => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), new THREE.MeshBasicMaterial({ color: col })); const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: col, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.75 })); root.add(m, gl); return { m, gl }; };
      const A = mkStar(0xcfe3ff), B = mkStar(0xfff1d6);
      const labA = label('', A.m, { offset: [0, 0.7, 0], color: 'rgba(30,64,140,.92)' }), labB = label('', B.m, { offset: [0, 0.6, 0], color: 'rgba(130,90,10,.92)' });
      const cm = new THREE.Mesh(new THREE.OctahedronGeometry(0.13), new THREE.MeshBasicMaterial({ color: 0xff6b6b })); root.add(cm);
      label('질량 중심', cm, { offset: [0.3, -0.8, 0], size: 11.5, color: 'rgba(160,30,30,.92)' });
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 })); root.add(rod);
      const orbG = new THREE.Group(); root.add(orbG);

      /* 두 별의 궤도 (질량 중심이 초점) */
      const posRel = (E_) => [A_AU * (Math.cos(E_) - E) * SC, 0, -A_AU * Math.sqrt(1 - E * E) * Math.sin(E_) * SC];
      function build() {
        while (orbG.children.length) { const o = orbG.children.pop(); o.geometry.dispose(); }
        const M = st.mA + st.mB, fA = st.mB / M, fB = st.mA / M;                    // A는 −fA·r, B는 +fB·r
        [[fA, -1, 0x7ab8ff], [fB, 1, 0xffd98a]].forEach(([f, sg, c]) => {
          const pts = []; for (let i = 0; i < 160; i++) { const p = posRel(i / 160 * TAU); pts.push(new THREE.Vector3(sg * f * p[0], 0, sg * f * p[2])); }
          orbG.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 200, 0.018, 6, true), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.75 })));
        });
        const rA = 0.26 + 0.2 * Math.cbrt(st.mA), rB = 0.2 + 0.2 * Math.cbrt(st.mB) * 0.7;
        A.m.scale.setScalar(rA); A.gl.scale.setScalar(rA * 3.4); B.m.scale.setScalar(rB); B.gl.scale.setScalar(rB * 3.4);
        labA.set('A ' + st.mA.toFixed(1) + ' M☉'); labB.set('B ' + st.mB.toFixed(1) + ' M☉'); st.M = M; st.P = Math.sqrt(Math.pow(A_AU, 3) / M);
        text();
      }
      function text() {
        const M = st.M, P = st.P, a1 = A_AU * st.mB / M, a2 = A_AU * st.mA / M;
        info('두 별의 거리 a = ' + A_AU.toFixed(1) + ' AU, 주기 P ≈ <b>' + P.toFixed(1) + '년</b><br>M_A+M_B = a³/P² = <b>' + M.toFixed(2) + ' M☉</b><br>질량 중심까지 a₁ : a₂ = ' + a1.toFixed(1) + ' : ' + a2.toFixed(1) + ' AU → <b>무거운 별이 가까워요</b>');
      }
      const rA = controls.range('A의 질량', 0.5, 4, 0.1, st.mA, (v) => { st.mA = v; build(); }, (v) => v.toFixed(1) + ' M☉');
      const rB = controls.range('B의 질량', 0.5, 4, 0.1, st.mB, (v) => { st.mB = v; build(); }, (v) => v.toFixed(1) + ' M☉');
      controls.button('시리우스 값으로', () => { st.mA = 2.06; st.mB = 1.02; rA.set(2.06); rB.set(1.02); build(); });
      build();

      let ph = 0;
      return {
        update(dt) {
          const S = sr(); if (S && S.cm && S.cm.mA !== st.key) { st.key = S.cm.mA; if (Math.abs(S.cm.mA - st.mA) > 1e-6) { st.mA = Math.min(4, Math.max(0.5, S.cm.mA)); rA.set(st.mA); build(); } }
          /* 주기가 짧을수록 빨리 돌아요 (시리우스 50.1년 = 12초) */
          ph += dt * TAU / 12 * (P0 / st.P);
          const E_ = kepE(ph, E), p = posRel(E_), fA = st.mB / st.M, fB = st.mA / st.M;
          A.m.position.set(-fA * p[0], 0, -fA * p[2]); A.gl.position.copy(A.m.position);
          B.m.position.set(fB * p[0], 0, fB * p[2]); B.gl.position.copy(B.m.position);
          const d = B.m.position.clone().sub(A.m.position), L = d.length(); rod.position.copy(A.m.position).addScaledVector(d, 0.5); rod.scale.set(1, L, 1); rod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
        },
        sync() { st.key = ''; },
      };
    },
  });
})();
