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
    levels: [2],
    camera: { dist: PHONE ? 16 : 11.5, theta: 0.35, phi: 0.9, min: 6, max: 28, target: [0.8, 0, 0] },
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const st = { a: A_AU, P: P0, mA: 2.06, mB: 1.02, nA: '시리우스 A', nB: '시리우스 B', P0: 0, mode: 'sky', key: '', show: false, note: '' };
      const sr = () => { try { return window.__sim && window.__sim.S; } catch (e) { return null; } };
      const W = () => window.__sim || {};
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

      /* 두 별의 궤도 (질량 중심이 초점). 2D의 단계마다 a · P · 질량을 그대로 읽어요 */
      const posRel = (E_) => [A_AU * (Math.cos(E_) - E) * st.k, 0, -A_AU * Math.sqrt(1 - E * E) * Math.sin(E_) * st.k];
      let fA = 0.33, fB = 0.67;
      function build() {
        while (orbG.children.length) { const o = orbG.children.pop(); o.geometry.dispose(); }
        st.k = SC * Math.sqrt(st.a / A_AU);
        [[fA, -1, 0x7ab8ff], [fB, 1, 0xffd98a]].forEach(([f, sg, c]) => {
          const pts = []; for (let i = 0; i < 160; i++) { const p = posRel(i / 160 * TAU); pts.push(new THREE.Vector3(sg * f * p[0], 0, sg * f * p[2])); }
          orbG.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 200, 0.018, 6, true), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.75 })));
        });
        const rA = 0.26 + 0.2 * Math.cbrt(st.mA), rB = 0.2 + 0.2 * Math.cbrt(st.mB) * 0.7;
        A.m.scale.setScalar(rA); A.gl.scale.setScalar(rA * 3.4); B.m.scale.setScalar(rB); B.gl.scale.setScalar(rB * 3.4);
        labA.set(st.nA + (st.show ? ' ' + st.mA.toFixed(2) + ' M☉' : '')); labB.set(st.nB + (st.show ? ' ' + st.mB.toFixed(2) + ' M☉' : ''));
        text();
      }
      const f1 = (x) => (Math.round(x * 10) / 10).toFixed(1), f2 = (x) => (Math.round(x * 100) / 100).toFixed(2);
      function text() {
        const S = sr() || {}, q = W(), free = !!(q.game && q.game.free), a1 = st.a * fA, a2 = st.a * fB;
        let h;
        if (st.mode === 'sky') h = '<b>시각쌍성 시리우스 A–B</b> · 경과 ' + f1(st.P0 * st.P) + '년<br>두 별은 <b>질량 중심</b>을 가운데 두고 서로 반대쪽에서 돌아요. 주기와 긴반지름은 옆에서 직접 읽어 봐요.';
        else if (st.mode === 'total') h = '<b>총질량</b> · 두 별의 거리 a = ' + f1(st.a) + ' AU, 주기 P = ' + f1(st.P) + '년<br>' + ((S.tt && S.tt.mOk) || free ? 'M₁ + M₂ = a³/P² = <b>' + f2(Math.pow(st.a, 3) / (st.P * st.P)) + ' M☉</b>' : 'M₁ + M₂ = a³ / P² 을 직접 계산해 봐요.');
        else if (st.mode === 'cm') h = '<b>' + st.nA + '</b>와 <b>' + st.nB + '</b>: 질량 중심까지 a₁ = ' + f2(a1) + ' AU, a₂ = ' + f2(a2) + ' AU<br>' + (st.nA === 'A' && st.nB === 'B' ? 'M_A = ' + f2(st.mA) + ' M☉, M_B = ' + f2(st.mB) + ' M☉<br>별 A의 질량 슬라이더를 움직이며 질량 중심(빨간 점)이 어느 별 쪽으로 가는지 살펴봐요.' : st.show ? '무거운 별이 질량 중심에 <b>더 가까워요</b> (a₁ : a₂ = M₂ : M₁).' : '질량 중심은 무거운 별 쪽에 가까워요. 질량은 직접 나눠 봐요.');
        else h = '<b>쌍성</b>은 공통 질량 중심을 가운데 두고 서로 반대쪽에서 돌아요.';
        info(h);
      }
      /* ▶ 재생: 두 별이 질량 중심을 한 바퀴(한 주기) 돌아요 */
      let syncing = false, ready = false;
      const player = controls.player({
        duration: 12, loop: true, autoplay: true, label: '재생',
        phases: [[0, '가까운 점'], [0.25, '멀어져요'], [0.5, '가장 먼 점'], [0.75, '다시 가까워져요']],
        onFrame(p) { st.P0 = p; if (ready && !syncing && st.mode === 'sky') { try { const S = sr(); if (S && S.sk) { S.sk.t = p * 50.1; S.sk.play = false; } } catch (e) { /* 무시 */ } } },
      });
      ready = true;

      function follow() {
        const S = sr(), q = W(); if (!S || !S.view) return;
        const free = !!(q.game && q.game.free), SIR = q.SIR || { a: A_AU, a1: 6.55, a2: 13.23, MA: 2.06, MB: 1.02, P: 50.1 };
        let p;
        if (S.view === 'total' && S.tt) p = { mode: 'total', a: S.tt.a, P: S.tt.P, fA: SIR.MB / (SIR.MA + SIR.MB), mA: SIR.MA, mB: SIR.MB, nA: '별 A', nB: '별 B', show: false };
        else if (S.view === 'cm' && q.cmData) { const d = q.cmData(); p = { mode: 'cm', a: d.a, P: d.P, fA: d.a1 / (d.a1 + d.a2), mA: d.M1 || SIR.MA, mB: d.M2 || SIR.MB, nA: d.n1, nB: d.n2, show: (d.id === 'exp') || free || !!(S.cm && (S.cm.ok || S.cm.okX)) }; }
        else p = { mode: S.view === 'sky' ? 'sky' : 'other', a: SIR.a, P: SIR.P, fA: SIR.MB / (SIR.MA + SIR.MB), mA: SIR.MA, mB: SIR.MB, nA: '시리우스 A', nB: '시리우스 B', show: false };
        const key = [p.mode, p.a, p.P, p.fA, p.mA, p.show, S.tt && S.tt.mOk, free].join('|');
        if (key !== st.key) { st.key = key; Object.assign(st, p); fA = p.fA; fB = 1 - p.fA; st.mA = p.mA; st.mB = p.mB; build(); }
        if (st.mode === 'sky' && S.sk && typeof S.sk.t === 'number') { const ph = (S.sk.t / 50.1) % 1; if (Math.abs(ph - st.P0) > 0.004 && Math.abs(Math.abs(ph - st.P0) - 1) > 0.004) { syncing = true; player.set(ph); syncing = false; } }
      }
      follow(); if (!st.key) build();

      return {
        update(dt) {
          follow();
          const E_ = kepE(TAU * st.P0, E), p = posRel(E_);
          A.m.position.set(-fA * p[0], 0, -fA * p[2]); A.gl.position.copy(A.m.position);
          B.m.position.set(fB * p[0], 0, fB * p[2]); B.gl.position.copy(B.m.position);
          const d = B.m.position.clone().sub(A.m.position), L = d.length(); rod.position.copy(A.m.position).addScaledVector(d, 0.5); rod.scale.set(1, L, 1); rod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
        },
        sync() { st.key = ''; follow(); },
      };
    },
  });
})();
