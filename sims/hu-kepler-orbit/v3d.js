/* hu-kepler-orbit · 3D 타원 궤도와 면적 속도
   태양은 타원의 한 초점에 있어요. 행성은 가까울수록(근일점) 빠르고 멀수록(원일점) 느려서,
   같은 시간 동안 쓸고 지나간 넓이가 같아요(케플러 제2법칙). 케플러 방정식 M = E − e·sinE 를 그대로 풀어 움직여요.
   2D 실험의 단계(타원 · 면적 속도 · 혜성)에서 a, e 값을 읽어 시작해요(읽기 전용). */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const TAU = Math.PI * 2;
  const RMAX = 4.6;                                                  // 원일점 거리(장면 길이)

  function kepE(M, e) { M = ((M % TAU) + TAU) % TAU; let E = e > 0.8 ? Math.PI : M + e * Math.sin(M); for (let i = 0; i < 40; i++) { const d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E)); E -= d; if (Math.abs(d) < 1e-10) break; } return E; }

  window.SciSim3D.attach({
    title: '케플러 궤도 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    levels: [1, 3],
    camera: { dist: PHONE ? 17 : 9.8, theta: 0.3, phi: 0.95, min: 5, max: 26, target: [0.4, 0, 0] },
    autoRotate: 0.12,
    build(ctx) {
      const { THREE, scene, root, label, info, controls } = ctx;
      const st = { a: 2, e: 0.3, M: 0, sec: false, dots: true, arrow: true, f2: false, key: '', n: 8, view: 'ellipse' };
      const sr = () => { try { return window.__sim && window.__sim.S; } catch (e) { return null; } };

      /* 빛: 태양이 광원 */
      scene.add(new THREE.AmbientLight(0xa9b8ff, 0.45));
      const sunLight = new THREE.PointLight(0xfff2cc, 2.6, 0, 0); scene.add(sunLight);

      /* 배경 별 */
      { let seed = 11; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; const pos = [];
        for (let i = 0; i < 420; i++) { const u = rnd() * 2 - 1, a = rnd() * TAU, r = Math.sqrt(1 - u * u); pos.push(Math.cos(a) * r * 70, u * 70, Math.sin(a) * r * 70); }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        root.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xaec3ff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.6 }))); }

      /* 태양 */
      const sun = new THREE.Mesh(new THREE.SphereGeometry(0.32, 40, 28), new THREE.MeshBasicMaterial({ color: 0xffc83d })); root.add(sun);
      const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,230,140,1)'); gr.addColorStop(0.3, 'rgba(255,180,50,.45)'); gr.addColorStop(1, 'rgba(255,160,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); glow.scale.set(2.4, 2.4, 1); root.add(glow);
      label('태양(초점)', [0, 0.1, 0], { offset: [0, 0.65, 0], color: 'rgba(146,84,0,.9)' });

      /* 행성 */
      const planet = new THREE.Mesh(new THREE.SphereGeometry(0.2, 28, 20), new THREE.MeshStandardMaterial({ color: 0x2f86e8, roughness: 0.5, metalness: 0.05 })); root.add(planet);
      const arrowM = new THREE.MeshStandardMaterial({ color: 0xffe066, roughness: 0.4, emissive: 0x805f00, emissiveIntensity: 0.5 });
      const arrow = new THREE.Group(); const ash = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1, 10), arrowM), ahd = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.32, 14), arrowM); arrow.add(ash, ahd); root.add(arrow);
      const sLab = label('', planet, { offset: [0, 0.85, 0], color: 'rgba(14,60,120,.9)', size: 11.5 });

      /* 궤도 · 부채꼴 · 점 · 표시 */
      const orbitG = new THREE.Group(), secG = new THREE.Group(), dotG = new THREE.Group(), markG = new THREE.Group(); root.add(orbitG, secG, dotG, markG);
      const labQ = label('근일점', [0, 0, 0], { color: 'rgba(21,128,61,.92)', size: 11.5 }), labA = label('원일점', [0, 0, 0], { color: 'rgba(180,83,9,.92)', size: 11.5 });
      const labF2 = label('빈 초점', [0, 0, 0], { color: 'rgba(80,80,100,.9)', size: 11 });
      const secCols = [0x4aa3ff, 0xffa94d];
      let sc = 1, b_ = 0, c_ = 0;
      const posAt = (M) => { const E = kepE(M, st.e); return [sc * st.a * (Math.cos(E) - st.e), 0, -sc * b_ * Math.sin(E)]; };   // 태양이 원점, 근일점은 +x

      function clear(g) { while (g.children.length) { const o = g.children.pop(); if (o.geometry) o.geometry.dispose(); } }
      function rebuild() {
        const a = st.a, e = st.e, q = a * (1 - e), Q = a * (1 + e);
        sc = RMAX / Q; b_ = a * Math.sqrt(1 - e * e); c_ = a * e;
        clear(orbitG); clear(secG); clear(dotG); clear(markG);
        /* 궤도 */
        const pts = []; for (let i = 0; i < 240; i++) { const E = i / 240 * TAU; pts.push(new THREE.Vector3(sc * a * (Math.cos(E) - e), 0, -sc * b_ * Math.sin(E))); }
        orbitG.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 360, 0.022, 8, true), new THREE.MeshBasicMaterial({ color: 0x8fb4ff, transparent: true, opacity: 0.85 })));
        /* 같은 시간 간격의 부채꼴 (넓이가 모두 같아요) */
        if (st.sec) {
          const n = st.n;
          for (let s = 0; s < n; s++) {
            const m0 = s / n * TAU, m1 = (s + 1) / n * TAU, verts = [0, 0, 0], idx = []; const K = 18;
            for (let i = 0; i <= K; i++) { const p = posAt(m0 + (m1 - m0) * i / K); verts.push(p[0], 0.002, p[2]); if (i > 0) idx.push(0, i + 1, i); }
            const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3)); g.setIndex(idx); g.computeVertexNormals();
            secG.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: secCols[s % 2], transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false })));
          }
        }
        /* 같은 시간마다 찍은 점 */
        if (st.dots) {
          const dg = new THREE.SphereGeometry(0.06, 12, 9), dm = new THREE.MeshBasicMaterial({ color: 0xffffff });
          for (let s = 0; s < st.n; s++) { const m = new THREE.Mesh(dg, dm); const p = posAt(s / st.n * TAU); m.position.set(p[0], 0.0, p[2]); dotG.add(m); }
        }
        /* 근일점 · 원일점 · 빈 초점 */
        const pq = posAt(0), pa = posAt(Math.PI);
        labQ.obj = [pq[0], 0, pq[2]]; labQ.off = [0, 0.5, 0]; labA.obj = [pa[0], 0, pa[2]]; labA.off = [0, 0.5, 0];
        const f2x = -2 * c_ * sc;
        const cross = new THREE.Mesh(new THREE.OctahedronGeometry(0.1), new THREE.MeshBasicMaterial({ color: 0x9aa7c7 })); cross.position.set(f2x, 0, 0); markG.add(cross); cross.visible = st.f2;
        labF2.obj = [f2x, 0, 0]; labF2.off = [0, 0.45, 0]; labF2.show(st.f2);
        const ctr = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshBasicMaterial({ color: 0x9aa7c7 })); ctr.position.set(-c_ * sc, 0, 0); ctr.visible = st.f2; markG.add(ctr);
        const ln = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 2 * sc * a, 6), new THREE.MeshBasicMaterial({ color: 0x9aa7c7, transparent: true, opacity: 0.5 })); ln.rotation.z = Math.PI / 2; ln.position.set(-c_ * sc, 0, 0); ln.visible = st.f2; markG.add(ln);
        text();
      }
      function text() {
        const a = st.a, e = st.e, q = a * (1 - e), Q = a * (1 + e);
        const f = (x) => (x >= 100 ? Math.round(x) : x >= 10 ? x.toFixed(1) : x.toFixed(2));
        info('<b>' + (st.view === 'comet' ? '혜성 궤도' : st.view === 'grav' ? '태양의 중력으로 도는 궤도' : '타원 궤도') + '</b> · a = ' + f(a) + ' AU, e = ' + e.toFixed(3).replace(/0+$/, '').replace(/\.$/, '') + '<br>근일점 q = a(1−e) = ' + f(q) + ' AU · 원일점 Q = a(1+e) = ' + f(Q) + ' AU<br>' + (st.sec ? '같은 시간 동안 쓸고 지나간 부채꼴의 넓이는 모두 같아요 (면적 속도 일정).' : '이심률이 클수록 납작한 타원이에요. 태양은 한 초점에 있어요.'));
      }

      const bS = controls.button('같은 시간 부채꼴 ✕', () => { st.sec = !st.sec; st.secUser = true; bS.classList.toggle('on', st.sec); bS.textContent = '같은 시간 부채꼴 ' + (st.sec ? '✓' : '✕'); rebuild(); });
      const bF = controls.button('빈 초점 보기 ✕', () => { st.f2 = !st.f2; bF.classList.toggle('on', st.f2); bF.textContent = '빈 초점 보기 ' + (st.f2 ? '✓' : '✕'); rebuild(); });
      /* ▶ 재생: 행성이 한 바퀴 돌아요 (평균 근점 이각 M이 시간에 비례). 근일점에서 빠르고 원일점에서 느려요 */
      const player = controls.player({
        duration: 14, loop: true, autoplay: true, label: '재생',
        phases: [[0, '근일점'], [0.25, '멀어지는 중'], [0.5, '원일점'], [0.75, '가까워지는 중']],
        onFrame(p) { st.M = p * TAU; },
      });

      /* 2D → 3D: 2D 단계의 a, e 값을 그대로 읽어요 (슬라이더는 2D 쪽 것을 써요) */
      function follow() {
        const S = sr(); if (!S) return;
        const key = S.view + '|' + (S.view === 'ellipse' ? S.a + '|' + S.e : S.view === 'area' ? S.e3 : S.view === 'comet' ? S.a4 + '|' + S.e4 : '');
        if (key === st.key) return; st.key = key;
        const prev = st.view; st.view = S.view;
        if (S.view === 'ellipse') { st.a = S.a; st.e = S.e; }
        else if (S.view === 'area') { st.a = 2; st.e = S.e3; }
        else if (S.view === 'comet') { st.a = S.a4; st.e = S.e4; }
        else { st.a = 1; st.e = 0; }
        if (prev !== S.view && !st.secUser) { st.sec = S.view === 'area'; bS.classList.toggle('on', st.sec); bS.textContent = '같은 시간 부채꼴 ' + (st.sec ? '✓' : '✕'); }
        rebuild();
      }
      follow(); rebuild();

      const up = new THREE.Vector3(0, 1, 0), v3 = new THREE.Vector3();
      return {
        update(dt) {
          follow();
          const p = posAt(st.M), E = kepE(st.M, st.e);
          planet.position.set(p[0], 0, p[2]);
          /* 속도 화살표: 길이는 속력에 비례 (vis-viva와 같은 모양) */
          const r = Math.hypot(p[0], p[2]) / sc / st.a, sp = Math.sqrt(Math.max(1e-6, 2 / r - 1)) * 1;       // v / v_circ(a)
          v3.set(-Math.sin(E) * st.a, 0, -b_ * Math.cos(E)).normalize();
          const len = Math.max(0.5, Math.min(2.2, 0.7 * sp * (0.9 + 0.5 * st.e)));
          ash.scale.y = Math.max(0.01, len - 0.32); ash.position.y = (len - 0.32) / 2; ahd.position.y = len - 0.16;
          arrow.position.set(p[0], 0.0, p[2]); arrow.quaternion.setFromUnitVectors(up, v3);
          const dist = Math.hypot(p[0], p[2]) / sc;
          sLab.set('속력 ' + sp.toFixed(1) + '(상대값) · 거리 ' + (dist >= 10 ? dist.toFixed(0) : dist.toFixed(1)) + ' AU');
          glow.scale.setScalar(2.4 + 0.1 * Math.sin(st.M * 3));
        },
        sync() { st.key = ''; follow(); },
      };
    },
  });
})();
