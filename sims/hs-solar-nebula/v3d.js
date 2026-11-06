/* hs-solar-nebula · 3D 태양계의 형성 (성운 수축 → 눈선 → 집적 → 분화)
   ① 회전하는 성운이 수축하면 회전 축 방향으로 납작해지고(각운동량 보존) 회전이 빨라져 원반이 돼요.
   ② 원반의 온도는 안쪽이 높아요. 눈선(약 170 K, 약 2.7 AU) 안쪽은 금속·규산염만, 바깥은 물 얼음까지 고체로 응축해요.
   ③ 미행성이 충돌하며 원반의 물질을 쓸어 모아 행성이 자라요. ④ 녹은 원시 행성 속에서 무거운 철은 중심으로 가라앉아 핵이 돼요.
   크기·개수는 보기 좋게 나타낸 모형이에요. 2D 실험의 단계에서 반지름·거리를 읽어 시작해요(읽기 전용). */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const TAU = Math.PI * 2, AU = 0.43, SNOW = 2.7;                      // 1 AU = 0.43 장면 길이, 눈선 2.7 AU
  const STAGES = ['collapse', 'condense', 'accrete', 'differ'];
  const PL = [[0.4, 0.07, 0xb5a79a], [0.7, 0.1, 0xe3c58f], [1, 0.11, 0x4aa3ff], [1.5, 0.09, 0xd96a4a], [5.2, 0.36, 0xe8c38a], [9.5, 0.3, 0xe9d8a6]];

  window.SciSim3D.attach({
    title: '태양계 형성 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    levels: [0, 1, 3],
    camera: { dist: PHONE ? 13 : 9.5, theta: 0.5, phi: 1.0, min: 4, max: 22 },
    autoRotate: 0,
    build(ctx) {
      const { THREE, scene, root, label, info, controls } = ctx;
      const st = { stage: 'collapse', p: 0, t: 0 };
      const sr = () => { try { return window.__sim && window.__sim.S; } catch (e) { return null; } };
      scene.add(new THREE.AmbientLight(0x8fa0d8, 0.45));
      const sunLight = new THREE.PointLight(0xfff0cc, 1.35, 0, 0); scene.add(sunLight);
      { let seed = 3; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; const pos = [];
        for (let i = 0; i < 360; i++) { const u = rnd() * 2 - 1, a = rnd() * TAU, r = Math.sqrt(1 - u * u); pos.push(Math.cos(a) * r * 55, u * 55, Math.sin(a) * r * 55); }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        root.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xaec3ff, size: 1.5, sizeAttenuation: false, transparent: true, opacity: 0.5 }))); }
      let seed = 41; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,240,190,1)'); gr.addColorStop(0.3, 'rgba(255,190,70,.45)'); gr.addColorStop(1, 'rgba(255,160,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
      const dotTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'), gr = x.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c); })();

      /* 원시 태양 */
      const sun = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), new THREE.MeshBasicMaterial({ color: 0xffc83d })); root.add(sun);
      const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); root.add(sunGlow);
      const sunLab = label('원시 태양', sun, { offset: [0, 0.7, 0], color: 'rgba(146,84,0,.9)' });

      /* 원반 입자 */
      const N = PHONE ? 4500 : 7500;
      const rho0 = new Float32Array(N), ph0 = new Float32Array(N), z0 = new Float32Array(N), rf = new Float32Array(N), pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
      const ROCK = [0.78, 0.66, 0.5], ICE = [0.72, 0.9, 1.0], DUST = [0.85, 0.78, 0.65];
      for (let i = 0; i < N; i++) {
        const u = rnd() * 2 - 1, a = rnd() * TAU, s = Math.sqrt(1 - u * u), R = Math.pow(rnd(), 0.62) * 100;         // 성운 반지름 100 AU 안에서 균일
        rho0[i] = Math.abs(R * s); ph0[i] = a; z0[i] = R * u; rf[i] = Math.pow(rnd(), 0.8);
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const pm = new THREE.PointsMaterial({ size: 0.1, map: dotTex, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false, sizeAttenuation: true });
      const pts = new THREE.Points(g, pm); pts.frustumCulled = false; root.add(pts);

      const nebTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), gr = x.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(150,130,255,.5)'); gr.addColorStop(0.5, 'rgba(110,120,230,.22)'); gr.addColorStop(1, 'rgba(90,110,220,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
      const neb = new THREE.Sprite(new THREE.SpriteMaterial({ map: nebTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); root.add(neb);
      /* 눈선 고리 · 거리 표시 · 행성 */
      const ring = new THREE.Mesh(new THREE.TorusGeometry(SNOW * AU, 0.02, 10, 128), new THREE.MeshBasicMaterial({ color: 0x38bdf8 })); ring.rotation.x = Math.PI / 2; root.add(ring);
      const snowLab = label('눈선 약 2.7 AU', [SNOW * AU, 0, 0], { offset: [0.2, 0.3, 0], color: 'rgba(3,105,161,.92)' });
      const probe = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 14), new THREE.MeshBasicMaterial({ color: 0xffffff })); root.add(probe);
      const probeRing = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 8, 96), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 })); probeRing.rotation.x = Math.PI / 2; root.add(probeRing);
      const planets = PL.map(([a, r, c], i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 36, 26), new THREE.MeshStandardMaterial({ color: c, roughness: 0.65 })); m.userData = { a, r, th: i * 1.7 }; root.add(m); return m; });
      const labPl = [label('지구형 행성(암석)', [0, 0, 0], { size: 11.5, color: 'rgba(120,70,20,.9)' }), label('목성형 행성(거대)', [0, 0, 0], { size: 11.5, color: 'rgba(30,64,140,.9)' })];

      /* 분화 모형: 철(어두운 금속) · 규산염(밝은 암석) 입자가 섞여 있다가 층으로 나뉘어요 */
      const diffG = new THREE.Group(); root.add(diffG);
      const ND = 700, dStart = [], dEnd = [], isFe = [];
      const diffMeshFe = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 12, 9), new THREE.MeshStandardMaterial({ color: 0x8a5a3c, roughness: 0.4, metalness: 0.5 }), ND);
      const diffMeshSi = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 12, 9), new THREE.MeshStandardMaterial({ color: 0xa89a86, roughness: 0.65 }), ND);
      const diffMeshLt = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 12, 9), new THREE.MeshStandardMaterial({ color: 0xf3e3b5, roughness: 0.7 }), ND);   // 가장 가벼운 물질 → 바깥 얇은 층
      diffMeshFe.frustumCulled = diffMeshSi.frustumCulled = diffMeshLt.frustumCulled = false; diffG.add(diffMeshFe, diffMeshSi, diffMeshLt);
      const shell = new THREE.Mesh(new THREE.SphereGeometry(2.55, 48, 32), new THREE.MeshStandardMaterial({ color: 0xff7a3a, roughness: 0.5, transparent: true, opacity: 0.16, depthWrite: false, emissive: 0xff4a10, emissiveIntensity: 0.35 })); diffG.add(shell);
      const nFe = Math.floor(ND * 0.32), nLt = Math.floor(ND * 0.12), isLt = [];
      for (let i = 0; i < ND; i++) {
        const fe = i < nFe, lt = i >= ND - nLt, u = rnd() * 2 - 1, a = rnd() * TAU, s = Math.sqrt(1 - u * u);
        const r0 = 2.35 * Math.cbrt(rnd()), r1 = fe ? 1.1 * Math.cbrt(rnd()) : lt ? 2.24 + 0.14 * rnd() : 1.2 + 0.95 * Math.cbrt(rnd());
        const d = [Math.cos(a) * s, u, Math.sin(a) * s], d2 = [Math.cos(a + 1.1) * s, -u, Math.sin(a + 1.1) * s];
        dStart.push([d[0] * r0, d[1] * r0, d[2] * r0]); dEnd.push([d2[0] * r1, d2[1] * r1, d2[2] * r1]); isFe.push(fe); isLt.push(lt);
      }
      const dm = new THREE.Object3D();
      { const z = new THREE.Matrix4().makeScale(0, 0, 0); for (let i = 0; i < ND; i++) { const mine = isFe[i] ? diffMeshFe : isLt[i] ? diffMeshLt : diffMeshSi; [diffMeshFe, diffMeshSi, diffMeshLt].forEach((m) => { if (m !== mine) m.setMatrixAt(i, z); }); } }   // 쓰지 않는 자리는 숨겨요
      const lFe = label('철 핵', [0, 0, 0], { color: 'rgba(120,60,20,.92)' }), lSi = label('규산염 맨틀', [1.2, 1.0, 0.5], { color: 'rgba(90,80,60,.92)' }), lLt = label('가벼운 바깥층', [0, 2.55, 0], { color: 'rgba(161,98,7,.92)' });

      /* 상태 → 장면 */
      const lerp = (a, b, t) => a + (b - a) * t;
      function layout() {
        const s = st.stage, p = st.p;
        const showDisc = s !== 'differ';
        pts.visible = showDisc; neb.visible = s === 'collapse'; sun.visible = sunGlow.visible = showDisc; sunLab.show(showDisc); diffG.visible = !showDisc;
        ring.visible = s === 'condense'; snowLab.show(s === 'condense');
        probe.visible = probeRing.visible = s === 'condense';
        planets.forEach((m) => (m.visible = s === 'accrete'));
        labPl.forEach((l) => l.show(s === 'accrete' && p > 0.5)); lFe.show(!showDisc && p > 0.7); lSi.show(!showDisc && p > 0.7); lLt.show(!showDisc && p > 0.7);
        sunLight.visible = true; sunLight.position.set(showDisc ? 0 : 4, showDisc ? 0 : 5, showDisc ? 0 : 6);
        text();
      }
      function cNow() { return st.stage === 'collapse' ? st.p : 1; }
      function text() {
        const s = st.stage, p = st.p;
        if (s === 'collapse') info('<b>성운 수축</b> · 반지름 약 ' + Math.round(100 - 90 * p) + ' AU<br>축 방향으로는 납작해지고, 회전은 점점 빨라져 <b>원반</b>이 돼요.');
        else if (s === 'condense') { const r = 0.3 + p * 9.7, T = 280 / Math.sqrt(r); info('<b>응축</b> · 태양에서 ' + r.toFixed(1) + ' AU, 약 ' + Math.round(T) + ' K<br>' + (r < SNOW ? '눈선 안쪽: <b>금속·규산염</b>만 고체 → 작은 암석 행성' : '눈선 바깥: <b>물 얼음</b>도 고체 → 큰 핵이 자라 거대 행성')); }
        else if (s === 'accrete') info('<b>집적</b> · 미행성이 충돌해 뭉쳐요 (' + Math.round(p * 100) + '%)<br>눈선 안쪽은 작은 <b>암석 행성</b>, 바깥은 큰 <b>거대 행성</b>이 돼요.');
        else info('<b>분화</b> · 녹은 천체 속에서 <b>무거운 철은 가라앉아</b> 핵이 되고, 규산염은 맨틀, 가장 가벼운 물질은 바깥 얇은 층(지각)이 돼요. (' + Math.round(p * 100) + '%)');
      }
      function pFmt(v) { const s = st.stage; return s === 'collapse' ? '수축 ' + Math.round(v * 100) + '%' : s === 'condense' ? '거리 ' + (0.3 + v * 9.7).toFixed(1) + ' AU' : s === 'accrete' ? '성장 ' + Math.round(v * 100) + '%' : '가라앉기 ' + Math.round(v * 100) + '%'; }
      /* 단계(2D 모드)는 2D 실험이 정해요. 수축·응축·분화는 2D 슬라이더/상태와 같은 값을 쓰고, ▶ 재생은 그 값을 움직여요 */
      let ready = false, syncing = false;
      const clamp01 = (x) => Math.min(1, Math.max(0, x));
      const pl = controls.player({
        duration: 8, loop: true, autoplay: false, label: '재생',
        onFrame(p) {
          if (!ready || syncing) return;
          st.p = p; const w = window.__sim, S = sr();
          if (w && S) {
            if (st.stage === 'collapse') w.setR(Math.round((100 - 90 * p) * 10) / 10);
            else if (st.stage === 'condense') w.setDist(0.3 + 9.7 * p);
            else if (st.stage === 'differ') { S.diff = p; S.diffDir = 0; }
          }
          text();
        },
      });
      ready = true;
      function setP(v) { st.p = v; syncing = true; pl.set(v); syncing = false; }
      function setStage(v) {
        st.stage = v; pl.pause();
        st.p = v === 'accrete' ? 0.1 : 0;
        setP(st.p); layout();
      }
      setStage('collapse');

      /* 2D → 3D: 단계(모드)와 슬라이더·진행 상태를 그대로 따라가요 */
      function follow() {
        const S = sr(), w = window.__sim; if (!S) return;
        const m = S.mode === 'accrete' || S.mode === 'differ' || S.mode === 'condense' ? S.mode : 'collapse';
        if (m !== st.stage) setStage(m);
        let v = null;
        if (m === 'collapse' && typeof S.r === 'number') v = clamp01((100 - S.r) / 90);
        else if (m === 'condense' && typeof S.dist === 'number' && S.dist > 0) v = clamp01((S.dist - 0.3) / 9.7);
        else if (m === 'differ' && typeof S.diff === 'number') v = clamp01(S.diff);
        else if (m === 'accrete' && w && w.ACC && w.ACC.play) { v = clamp01(w.ACC.T / w.T_END); pl.pause(); }
        if (v != null && Math.abs(v - st.p) > 0.0015) { setP(v); text(); }
      }
      follow();

      const col2 = new THREE.Color();
      return {
        update(dt) {
          follow(); st.t += dt;
          const s = st.stage;
          const c = cNow(), p = st.p;
          if (s !== 'differ') {
            const col0 = s === 'collapse';
            /* 수축: 높이는 크게 줄고, 반지름은 조금만 줄어요. 회전은 각운동량 보존으로 빨라져요 */
            const kz = 1 - 0.93 * c, kr = 1 - 0.7 * c, spin = 0.1 / (kr * kr), RC = 3.8;
            for (let i = 0; i < N; i++) {
              const R = rho0[i] / 100;
              let rho, y, th;
              if (col0) { rho = R * RC * kr; y = (z0[i] / 100) * RC * kz; th = ph0[i] + spin * st.t * (0.55 + 0.45 / (R + 0.25)); }
              else { rho = 4.3 * Math.pow(R, 1.6); y = (z0[i] / 100) * 4.3 * 0.07; th = ph0[i] + 0.8 * st.t / Math.pow(Math.max(rho, 0.35), 1.5); }
              pos[i * 3] = rho * Math.cos(th); pos[i * 3 + 1] = y; pos[i * 3 + 2] = -rho * Math.sin(th);
              const cc = col0 ? DUST : (rho / AU < SNOW ? ROCK : ICE), k = 0.7 + 0.3 * rf[i];
              col[i * 3] = cc[0] * k; col[i * 3 + 1] = cc[1] * k; col[i * 3 + 2] = cc[2] * k;
            }
            neb.visible = col0; neb.scale.setScalar(RC * kr * 2.7); neb.material.opacity = 1 - 0.85 * c;
            g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true;
            pm.opacity = s === 'accrete' ? 0.95 - 0.7 * p : 0.95;
            const sunR = s === 'collapse' ? 0.15 + 0.2 * c : 0.3; sun.scale.setScalar(sunR); sunGlow.scale.setScalar(sunR * 7);
            if (s === 'condense') { const r = 0.3 + p * 9.7; probe.position.set(r * AU, 0, 0); const T = 280 / Math.sqrt(r); probe.material.color.set(r < SNOW ? 0xc7a37a : 0xbfe6ff); probeRing.scale.setScalar(r * AU); probeRing.material.color.set(r < SNOW ? 0xc7a37a : 0xbfe6ff); }
            if (s === 'accrete') planets.forEach((m, i) => {
              const { a, r, th } = m.userData, g0 = Math.max(0, Math.min(1, (p - 0.05 - i * 0.04) * 1.6)), ang = th + st.t * 0.6 / Math.sqrt(a) ;
              m.scale.setScalar(Math.max(0.001, r * g0 * (i < 4 ? 1 : 1)) ); m.position.set(a * AU * Math.cos(ang), 0, -a * AU * Math.sin(ang)); m.visible = g0 > 0.02;
              if (i === 2) { labPl[0].obj = [m.position.x, 0.25, m.position.z]; } if (i === 4) { labPl[1].obj = [m.position.x, 0.5, m.position.z]; }
            });
            sun.rotation.y += dt;
          } else {
            const e = Math.min(1, p * 1.15), ee = e * e * (3 - 2 * e);
            for (let i = 0; i < ND; i++) {
              const a = dStart[i], b = dEnd[i], mesh = isFe[i] ? diffMeshFe : isLt[i] ? diffMeshLt : diffMeshSi;
              dm.position.set(lerp(a[0], b[0], ee), lerp(a[1], b[1], ee), lerp(a[2], b[2], ee)); dm.updateMatrix(); mesh.setMatrixAt(i, dm.matrix);
            }
            diffMeshFe.instanceMatrix.needsUpdate = diffMeshSi.instanceMatrix.needsUpdate = diffMeshLt.instanceMatrix.needsUpdate = true;
            shell.material.opacity = 0.2 - 0.1 * e; shell.material.emissiveIntensity = 0.5 * (1 - e) + 0.1;
            lFe.obj = [0, -0.1, 0]; lFe.show(p > 0.7); lSi.show(p > 0.7); lLt.show(p > 0.7);
          }
        },
        sync() { follow(); },
      };
    },
  });
})();
