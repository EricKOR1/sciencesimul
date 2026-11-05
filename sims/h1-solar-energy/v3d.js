/* h1-solar-energy · 3D 핵융합 · 질량이 에너지로 · 지구의 에너지 흐름
   2D 실험과 같은 3장면이에요 (2D에서 고른 장면을 따라가요).
   ① 핵융합 (2D 1단계): 수소 핵(양성자)은 서로 밀어내지만, 온도가 높아 충분히 빠르면 부딪혀 융합해요. 수소 핵 4개 → 헬륨 핵 1개 + 에너지.
      온도 100~2000만 K는 2D의 온도 슬라이더와 같은 값이에요 (3D 슬라이더도 2D를 바꿔요). 입자의 움직임은 단순한 모의 계산이에요.
   ② 질량이 에너지로 (2D 2단계): 수소 핵 4개의 질량 100 → 헬륨 핵 1개 99.3, 줄어든 질량 0.7(0.7 %)이 에너지로 바뀌어요.
   ③ 지구의 에너지 흐름 (2D 3단계): 태양이 내보내는 에너지 중 지구에 닿는 것은 약 20억분의 1, 지구에 온 에너지(100)가 열 · 증발·구름·비 · 바람 · 해류 · 광합성으로 가요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);

  window.SciSim3D.attach({
    title: '3D 핵융합과 태양 에너지',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHN ? 13 : 9, theta: 0.3, phi: 1.2, min: 5, max: 30 },
    autoRotate: 0.12,
    levels: [0, 1, 2],
    build(ctx) {
      const { THREE, root, camera, label, info, controls, orbit } = ctx;
      const V3 = THREE.Vector3;
      const S0 = window.__sim && window.__sim.S;
      const st = { scene: 'fusion', T: S0 && S0.T ? S0.T : 1500, t: 0, demo: false, sig: '' };
      const L2 = () => (ctx.lesson && ctx.lesson()) || null;
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ envMapIntensity: 0.6, color: c, roughness: 0.5, metalness: 0.05 }, o || {}));
      const gc = document.createElement('canvas'); gc.width = gc.height = 128; const g2 = gc.getContext('2d'), gr = g2.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, 'rgba(255,240,170,1)'); gr.addColorStop(0.3, 'rgba(255,190,60,.55)'); gr.addColorStop(1, 'rgba(255,150,0,0)'); g2.fillStyle = gr; g2.fillRect(0, 0, 128, 128);
      const glowTex = new THREE.CanvasTexture(gc);
      const glowMat = (op) => new THREE.SpriteMaterial({ map: glowTex, transparent: true, opacity: op == null ? 1 : op, blending: THREE.AdditiveBlending, depthWrite: false });

      /* ================= ② 핵융합 ================= */
      const gFu = new THREE.Group(); root.add(gFu);
      const BOX = 1.7, RP = 0.36, KC = 0.3, D0 = 0.8, VTH = 2.5;   // VTH: 이 속도보다 빠르게 부딪혀야 융합해요
      const pMat = mat(0xe32a32, { roughness: 0.4, metalness: 0, emissive: 0x8a0a12, emissiveIntensity: 0.55 }), nMat = mat(0xb9c0cc, { roughness: 0.35, metalness: 0.2 });
      const ps = [];   // { g, v, kind: 'p'|'d'|'he', n }
      function mkP(kind) {
        const g = new THREE.Group();
        if (kind === 'p') { g.add(new THREE.Mesh(new THREE.SphereGeometry(RP, 28, 20), pMat)); }
        else if (kind === 'd') { const a = new THREE.Mesh(new THREE.SphereGeometry(RP, 24, 18), pMat), b = new THREE.Mesh(new THREE.SphereGeometry(RP, 24, 18), nMat); a.position.x = -RP * 0.8; b.position.x = RP * 0.8; g.add(a, b); }
        else { const o = [[1, 1, 1], [-1, -1, 1], [-1, 1, -1], [1, -1, -1]]; o.forEach((q, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(RP, 24, 18), i % 2 ? nMat : pMat); m.position.set(q[0], q[1], q[2]).multiplyScalar(RP * 0.62); g.add(m); }); }
        g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
        gFu.add(g); return g;
      }
      const wall = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(BOX * 2, BOX * 2, BOX * 2)), new THREE.LineBasicMaterial({ color: 0xffb36b, transparent: true, opacity: 0.35 })); gFu.add(wall);
      const hot = new THREE.Sprite(glowMat(0.3)); hot.scale.set(BOX * 5.5, BOX * 5.5, 1); gFu.add(hot);
      const vS = () => 2.1 * Math.sqrt(st.T / 1500);
      let nHe = 0, phase = 'run', phaseT = 0, bursts = [], fused = 0;
      function rv() { const u = Math.random() * 2 - 1, a = Math.random() * 6.283, r = Math.sqrt(1 - u * u); return new V3(Math.cos(a) * r, u, Math.sin(a) * r); }
      function spawn() {
        ps.forEach((p) => gFu.remove(p.g)); ps.length = 0;
        for (let i = 0; i < 4; i++) {
          const g = mkP('p'); const p = { g, v: rv().multiplyScalar(vS()), kind: 'p', m: 1 };
          let tries = 0; do { g.position.set((Math.random() * 2 - 1) * (BOX - RP - 0.1), (Math.random() * 2 - 1) * (BOX - RP - 0.1), (Math.random() * 2 - 1) * (BOX - RP - 0.1)); tries++; } while (tries < 40 && ps.some((q) => q.g.position.distanceTo(g.position) < 1.4));
          ps.push(p);
        }
        phase = 'run'; phaseT = 0; fused = 0;
      }
      const pLab = label('수소 핵 (양성자)', [0, 0, 0], { size: 11.5 }), nLab = label('중성자', [0, 0, 0], { size: 11.5 }), heLab = label('헬륨 핵', [0, 0, 0], { size: 12.5, color: '#b45309' }), enLab = label('에너지!', [0, 0, 0], { size: 13, color: '#e0480e' });
      heLab.show(false); enLab.show(false); nLab.show(false);
      function burst(pos) {
        const s = new THREE.Sprite(glowMat(1)); s.scale.set(1, 1, 1); s.position.copy(pos); gFu.add(s);
        const rays = [];
        for (let i = 0; i < 10; i++) { const d = rv(); const m = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.5, 8), new THREE.MeshBasicMaterial({ color: 0xfff1a0, transparent: true })); m.position.copy(pos); m.quaternion.setFromUnitVectors(new V3(0, 1, 0), d); m.userData.d = d; gFu.add(m); rays.push(m); }
        bursts.push({ s, rays, t: 0, pos: pos.clone() });
      }
      function stepFusion(dt) {
        const n = Math.max(1, Math.ceil(dt / 0.008)), h = dt / n;
        for (let s = 0; s < n; s++) {
          for (let i = 0; i < ps.length; i++) {
            const a = ps[i];
            for (let j = i + 1; j < ps.length; j++) {
              const b = ps[j], d = new V3().subVectors(a.g.position, b.g.position), r = Math.max(0.2, d.length()), f = KC * (a.q || 1) * (b.q || 1) / (r * r);
              d.multiplyScalar(1 / r);
              const ra = a.kind === 'he' ? 1.6 : a.kind === 'd' ? 1.15 : 1, rb = b.kind === 'he' ? 1.6 : b.kind === 'd' ? 1.15 : 1;
              a.v.addScaledVector(d, f * h / a.m); b.v.addScaledVector(d, -f * h / b.m);
              // 융합 조건: 충분히 가까워지면 (서로 밀어내는 힘을 이길 만큼 빠를 때만 여기까지 와요)
              const rel = a.v.distanceTo(b.v);
              if (r < D0 * 0.95 && a.kind === 'p' && b.kind === 'p' && phase === 'run' && rel > VTH) { fuseDD(a, b); return; }
              if (r < D0 * 1.1 && a.kind === 'd' && b.kind === 'd' && phase === 'run' && rel > VTH * 0.8) { fuseHe(a, b); return; }
            }
          }
          ps.forEach((p) => {
            p.g.position.addScaledVector(p.v, h);
            ['x', 'y', 'z'].forEach((k) => { const lim = BOX - RP; if (p.g.position[k] > lim) { p.g.position[k] = lim; p.v[k] = -Math.abs(p.v[k]); } else if (p.g.position[k] < -lim) { p.g.position[k] = -lim; p.v[k] = Math.abs(p.v[k]); } });
          });
        }
        // 열운동 유지: 평균 속력을 온도에 맞춰요 (중간 입자는 무거워서 느려요)
        ps.forEach((p) => { const sp = p.v.length(), tgt = vS() / Math.sqrt(p.m); if (p.kind !== 'he') p.v.multiplyScalar(1 + (tgt / Math.max(sp, 0.05) - 1) * Math.min(1, dt * 1.2)); else p.v.multiplyScalar(0.98); });
      }
      function fuseDD(a, b) {
        const pos = a.g.position.clone().add(b.g.position).multiplyScalar(0.5), v = a.v.clone().add(b.v).multiplyScalar(0.5);
        gFu.remove(a.g); gFu.remove(b.g); ps.splice(ps.indexOf(a), 1); ps.splice(ps.indexOf(b), 1);
        const g = mkP('d'); g.position.copy(pos); g.quaternion.setFromUnitVectors(new V3(1, 0, 0), rv());
        ps.push({ g, v: v.setLength(vS() * 0.7), kind: 'd', m: 2, q: 1 });
        burst(pos); fused++; nLab.show(false);
        if (st.scene === 'fusion') info('수소 핵 2개가 융합해 <b>융합 중간 입자</b>가 됐어요.<br>이런 입자 2개가 다시 융합하면 헬륨 핵이 돼요.');
      }
      function fuseHe(a, b) {
        const pos = a.g.position.clone().add(b.g.position).multiplyScalar(0.5);
        gFu.remove(a.g); gFu.remove(b.g); ps.splice(ps.indexOf(a), 1); ps.splice(ps.indexOf(b), 1);
        const g = mkP('he'); g.position.copy(pos); ps.push({ g, v: new V3(), kind: 'he', m: 4, q: 2 });
        burst(pos); burst(pos); nHe++; phase = 'done'; phaseT = 0; heLab.show(true); enLab.show(true);
        info('<b>수소 핵 4개 → 헬륨 핵 1개</b>가 되었어요!<br>이때 질량이 조금 줄어들고, 줄어든 만큼 <b>에너지</b>가 나와요.');
      }
      function updateBursts(dt) {
        for (let i = bursts.length - 1; i >= 0; i--) {
          const b = bursts[i]; b.t += dt; const k = b.t / 1.6;
          b.s.scale.setScalar(0.5 + k * 6); b.s.material.opacity = Math.max(0, 1 - k);
          b.rays.forEach((r) => { r.position.copy(b.pos).addScaledVector(r.userData.d, 0.4 + b.t * 3.2); r.material.opacity = Math.max(0, 1 - k); });
          if (k >= 1) { gFu.remove(b.s); b.rays.forEach((r) => gFu.remove(r)); bursts.splice(i, 1); }
        }
      }
      function fusionInfoLow() {
        if (phase !== 'run') return;
        if (st.T < 700 && fused === 0) info('온도가 낮으면 수소 핵이 느려서 <b>서로 밀어내기만</b> 해요.<br>온도를 올려 보세요.');
        else if (fused === 0) info('수소 핵은 모두 + 전기를 띠어 서로 <b>밀어내요</b>.<br>충분히 빠르게 부딪히면 융합해요.');
      }

      /* ================= ② 질량이 에너지로 ================= */
      const gMa = new THREE.Group(); root.add(gMa);
      const MH = [[1, 1, 1], [-1, -1, 1], [-1, 1, -1], [1, -1, -1]].map((q) => new V3(q[0], q[1], q[2]).multiplyScalar(0.42));
      const maH = MH.map((q, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(RP, 24, 18), pMat); gMa.add(m); return m; });
      const heG = new THREE.Group(); gMa.add(heG);
      MH.forEach((q, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(RP, 24, 18), i % 2 ? nMat : pMat); m.position.copy(q).multiplyScalar(0.62 / 0.42 * 0.62); heG.add(m); });
      const maGlow = new THREE.Sprite(glowMat(0)); maGlow.scale.set(1, 1, 1); gMa.add(maGlow);
      const maRays = []; for (let i = 0; i < 12; i++) { const d = rv(); const m = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.45, 8), new THREE.MeshBasicMaterial({ color: 0xfff1a0, transparent: true, opacity: 0 })); m.userData.d = d; m.quaternion.setFromUnitVectors(new V3(0, 1, 0), d); gMa.add(m); maRays.push(m); }
      const mHlab = label('수소 핵 4개 · 질량 100', maH[0], { size: 12.5, offset: [0, 1.0, 0] }), mHelab = label('헬륨 핵 1개 · 질량 99.3', heG, { size: 12.5, offset: [0, 1.0, 0], color: '#b45309' }), mElab = label('줄어든 질량 → 빛에너지', [0, 1.4, 0], { size: 12.5, color: '#e0480e' });
      function setMass(p) {   // p: 0 융합 전 → 1 융합 후 (2D의 fz.v와 같은 진행)
        const ease = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
        const u1 = ease(p / 0.4), u2 = ease((p - 0.5) / 0.35), fused = p >= 0.42;
        maH.forEach((m, i) => { const st0 = new V3(-3, 0, 0).add(MH[i].clone().multiplyScalar(1.9)); m.position.copy(st0).lerp(MH[i].clone().multiplyScalar(0.0), u1); m.visible = !fused; m.position.x = -3 + 3 * u1 + MH[i].x * (1.9 - 1.9 * u1); m.position.y = MH[i].y * (1.9 - 1.9 * u1); m.position.z = MH[i].z * (1.9 - 1.9 * u1); });
        heG.visible = fused; heG.position.set(2.6 * u2 - 0.0, 0, 0);
        const k = Math.max(0, Math.min(1, (p - 0.42) / 0.5));
        maGlow.material.opacity = fused ? Math.max(0, 1 - k) * 0.9 : 0; maGlow.scale.setScalar(0.6 + k * 6);
        maRays.forEach((r) => { r.material.opacity = fused ? Math.max(0, 1 - k) : 0; r.position.copy(r.userData.d).multiplyScalar(0.5 + k * 3.2); });
        mHlab.show(!fused); mHelab.show(fused); mElab.show(p >= 0.55); mElab.obj = [0, 1.7, 0];
      }

      // ---- 환경: 별이 있는 배경 · 받침판 · 자석 고리(융합 장치) · 플라스마 알갱이 · 지구 대기와 구름
      { const sa = [], sc = []; let sd = 4242; const rr = () => { sd = (sd * 1664525 + 1013904223) >>> 0; return sd / 4294967296; };
        for (let i = 0; i < 600; i++) { const v = new V3(rr() - 0.5, rr() - 0.5, rr() - 0.5).normalize().multiplyScalar(28 + rr() * 6); sa.push(v.x, v.y, v.z); const c = 0.5 + rr() * 0.5; sc.push(c, c * 0.95, c * 0.85); }
        const sgm = new THREE.BufferGeometry(); sgm.setAttribute('position', new THREE.Float32BufferAttribute(sa, 3)); sgm.setAttribute('color', new THREE.Float32BufferAttribute(sc, 3));
        root.add(new THREE.Points(sgm, new THREE.PointsMaterial({ size: 0.15, vertexColors: true, sizeAttenuation: true, transparent: true, opacity: 0.85, depthWrite: false }))); }
      function plate(grp, y, r) { const p = new THREE.Mesh(new THREE.CylinderGeometry(r, r + 0.2, 0.22, 72), mat(0x141c30, { roughness: 0.6, metalness: 0.3 })); p.position.y = y; grp.add(p);
        [r - 0.1, r * 0.66, r * 0.33].forEach((rad, k) => { const t = new THREE.Mesh(new THREE.TorusGeometry(rad, 0.025, 8, 96), new THREE.MeshBasicMaterial({ color: k % 2 ? 0xff9a3c : 0xffd24a })); t.rotation.x = Math.PI / 2; t.position.y = y + 0.12; grp.add(t); }); }
      plate(gFu, -BOX - 0.5, 2.6); plate(gMa, -2.7, 3.3);
      [-0.95, 0, 0.95].forEach((y) => { const c = new THREE.Mesh(new THREE.TorusGeometry(BOX * 1.3, 0.05, 12, 64), mat(0xc77b3a, { metalness: 0.85, roughness: 0.28 })); c.rotation.x = Math.PI / 2; c.position.y = y * BOX * 0.9; gFu.add(c); });
      [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach((q) => { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, BOX * 2.2, 10), mat(0x9aa7bd, { metalness: 0.8, roughness: 0.3 })); post.position.set(q[0] * BOX * 1.3 * 0.72, 0, q[1] * BOX * 1.3 * 0.72); gFu.add(post); });
      const glass = new THREE.Mesh(new THREE.BoxGeometry(BOX * 2, BOX * 2, BOX * 2), new THREE.MeshPhysicalMaterial({ color: 0xffc58a, transparent: true, opacity: 0.07, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide })); gFu.add(glass);
      const NPL = 90, plasma = new THREE.InstancedMesh(new THREE.SphereGeometry(0.04, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffb36b, transparent: true, opacity: 0.55 }), NPL); gFu.add(plasma);
      const plD = []; for (let i = 0; i < NPL; i++) plD.push({ p: new V3((Math.random() * 2 - 1) * BOX * 0.95, (Math.random() * 2 - 1) * BOX * 0.95, (Math.random() * 2 - 1) * BOX * 0.95), v: rv().multiplyScalar(0.5 + Math.random() * 0.8) });
      const plO = new THREE.Object3D();

      /* ================= ③ 지구의 에너지 흐름 ================= */
      const gEa = new THREE.Group(); root.add(gEa);
      const sun3 = new THREE.Mesh(new THREE.SphereGeometry(1.8, 40, 28), new THREE.MeshStandardMaterial({ color: 0xffb62a, emissive: 0xff9410, emissiveIntensity: 0.9, roughness: 0.8 })); sun3.position.set(-5.2, 0, 0); gEa.add(sun3);
      const sg = new THREE.Sprite(glowMat(0.7)); sg.scale.set(9, 9, 1); sg.position.copy(sun3.position); gEa.add(sg);
      const ec = document.createElement('canvas'); ec.width = 256; ec.height = 128; { const g = ec.getContext('2d'); g.fillStyle = '#2f7fd8'; g.fillRect(0, 0, 256, 128); g.fillStyle = '#4caf6a'; let sd = 7; const rn = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; }; for (let i = 0; i < 16; i++) { const x = rn() * 256, y = 20 + rn() * 88; for (let j = 0; j < 7; j++) { g.beginPath(); g.ellipse(x + (rn() - 0.5) * 30, y + (rn() - 0.5) * 18, 6 + rn() * 16, 4 + rn() * 9, rn() * 3, 0, 7); g.fill(); } } g.fillStyle = '#f2f6fa'; g.fillRect(0, 0, 256, 7); g.fillRect(0, 121, 256, 7); }
      const earth = new THREE.Mesh(new THREE.SphereGeometry(0.75, 36, 24), new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(ec), roughness: 0.7 })); earth.position.set(1.4, 0, 0); gEa.add(earth);
      const eAtm = new THREE.Mesh(new THREE.SphereGeometry(0.84, 36, 24), new THREE.MeshBasicMaterial({ color: 0x7ab8ff, transparent: true, opacity: 0.16, side: THREE.BackSide, depthWrite: false })); eAtm.position.copy(earth.position); gEa.add(eAtm);
      const eCl = new THREE.Mesh(new THREE.SphereGeometry(0.775, 36, 24), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.2, roughness: 1, depthWrite: false })); eCl.position.copy(earth.position); gEa.add(eCl);
      const sCor = new THREE.Sprite(glowMat(0.5)); sCor.scale.set(13, 13, 1); sCor.position.copy(sun3.position); gEa.add(sCor);
      const beads = []; for (let i = 0; i < 60; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe14d })); b.userData = { dir: rv(), ph: Math.random(), sp: 0.12 + Math.random() * 0.1 }; b.userData.dir.x = Math.abs(b.userData.dir.x) * 0.55 + 0.6; b.userData.dir.y *= 0.5; b.userData.dir.z *= 0.5; b.userData.dir.normalize(); gEa.add(b); beads.push(b); }
      const eaLab = [label('☀ 태양', sun3, { size: 12.5, offset: [0, 2.3, 0] }), label('지구', earth, { size: 12.5, offset: [0, -1.1, 0] }), label('지구에 닿는 양: 태양이 내보내는 에너지의 약 20억분의 1', [-1.6, -2.7, 0], { size: 12 })];
      const PCOL = [0xef4444, 0x38bdf8, 0x94a3b8, 0x22d3ee, 0x22c55e];
      const PTH = ['열', '증발·구름·비', '바람', '해류', '광합성'], PV = [45.9, 22, 1.5, 0.5, 0.1], PSUB = ['대기와 지표를 데워요', '물의 순환', '공기의 움직임', '바닷물의 흐름', '식물이 저장해요'];
      const pArr = PTH.map((n, i) => {
        const g = new THREE.Group(), y = 1.6 - i * 0.8, len = 0.7 + 2.3 * Math.sqrt(PV[i] / 45.9), r = 0.05 + 0.2 * Math.sqrt(PV[i] / 45.9);
        const m = new THREE.MeshStandardMaterial({ color: PCOL[i], emissive: PCOL[i], emissiveIntensity: 0.3, roughness: 0.4, transparent: true });
        const sh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 12), m); sh.rotation.z = -Math.PI / 2; sh.position.x = len / 2;
        const hd = new THREE.Mesh(new THREE.ConeGeometry(r * 2 + 0.06, 0.32, 14), m); hd.rotation.z = -Math.PI / 2; hd.position.x = len + 0.1;
        g.add(sh, hd); g.position.set(2.3, y, 0); gEa.add(g);
        return { g, m, lab: label(n + ' ' + PV[i], g, { size: 11.5, offset: [len + 0.9, 0, 0] }), len };
      });
      const refl = (() => { const g = new THREE.Group(); const m = new THREE.MeshStandardMaterial({ color: 0xffd54a, emissive: 0xffa800, emissiveIntensity: 0.3, transparent: true, opacity: 0.8 }); const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.4, 10), m); sh.position.y = 0.7; const hd = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.32, 12), m); hd.position.y = 1.5; g.add(sh, hd); g.position.set(0.9, 0.6, 0); g.rotation.z = 0.5; gEa.add(g); return g; })();
      const reLab = label('반사 30', refl, { size: 11.5, offset: [-0.9, 1.2, 0] });
      const inLab = label('지구에 온 에너지 100', [-0.2, 2.35, 0], { size: 11.5, color: 'rgba(160,100,0,.95)' });

      /* ---------- 조작 ---------- */
      const probe = controls.text(''); probe.style.display = 'none'; const ctlRow = probe.parentElement;
      const grab = (fn) => { const before = new Set(ctlRow.children); fn(); return Array.from(ctlRow.children).filter((c) => !before.has(c)); };
      let internal = true, rng, rngM, plM, plF; const pathBtns = [];
      const gFu1 = grab(() => {
        rng = controls.range('온도', 100, 2000, 100, st.T, (v) => { st.T = v; const L = L2(); if (L && L.setT) L.setT(v); fusionInfoLow(); }, (v) => v + '만 K' + (v === 1500 ? ' (태양 중심부)' : ''));
        controls.button('↺ 다시 하기', () => { spawn(); fusionInfoLow(); });
      });
      const gMa1 = grab(() => {
        rngM = controls.range('수소의 질량', 100, 1000, 100, 100, (v) => { const L = L2(); if (L && L.setM) L.setM(v); }, (v) => v + ' g');
        controls.button('🔥 융합시키기', () => { const L = L2(); if (L && L.startFuse && L.S && L.S.mode === 'mass') { st.demo = false; L.startFuse(); } else { st.demo = true; plM.set(0); plM.play(); } });
        plM = controls.player({ duration: 6, loop: true, label: '융합 보기', phases: [[0, '수소 핵 4개'], [0.4, '융합'], [0.55, '헬륨 핵 + 에너지']], onFrame(p) { if (!internal) st.demo = true; setMass(p); } });
      });
      const gEa1 = grab(() => {
        PTH.forEach((n, i) => { const b = controls.button(n, () => { const L = L2(); if (L && L.S) { L.S.sel = i; L.S.pkt = { i, t: 0 }; } else { st.demo = true; plF.set(i / 5 + 0.01); } }); pathBtns.push(b); });
        plF = controls.player({ duration: 10, loop: true, label: '에너지의 길', phases: PTH.map((n, i) => [i / 5, n]), onFrame(p) { if (internal) return; st.demo = true; const L = L2(), i = Math.min(4, Math.floor(p * 5)); if (L && L.S && L.S.sel !== i) { L.S.sel = i; L.S.pkt = { i, t: 0 }; } st.sel = i; } });
      });
      internal = false; st.demo = false; st.sel = -1;
      spawn(); setMass(0);

      const sceneOf = (S) => { const m = S && S.S && S.S.mode; return m === 'mass' ? 'mass' : m === 'flow' || m === 'apply' ? 'earth' : 'fusion'; };
      let lastScene = '';
      function showScene() {
        const s = st.scene;
        gFu.visible = s === 'fusion'; gMa.visible = s === 'mass'; gEa.visible = s === 'earth';
        eaLab.forEach((l) => l.show(s === 'earth')); pArr.forEach((a) => a.lab.show(s === 'earth')); reLab.show(s === 'earth'); inLab.show(s === 'earth');
        pLab.show(s === 'fusion'); heLab.show(s === 'fusion' && phase === 'done'); enLab.show(s === 'fusion' && phase === 'done');
        mHlab.show(false); mHelab.show(false); mElab.show(false); if (s === 'mass') setMass(plM.p);
        gFu1.forEach((e) => { e.style.display = s === 'fusion' ? '' : 'none'; }); gMa1.forEach((e) => { e.style.display = s === 'mass' ? '' : 'none'; }); gEa1.forEach((e) => { e.style.display = s === 'earth' ? '' : 'none'; });
        if (s === 'fusion') fusionInfoLow();
      }
      st.scene = 'fusion'; showScene();
      const setInfo = (h) => { if (h !== setInfo.h) { setInfo.h = h; info(h); } };

      return {
        update(dt, t) {
          st.t += dt;
          const S = L2(), SS = S && S.S, K = S && S.K;
          const sc = sceneOf(S);
          if (sc !== st.scene) { st.scene = sc; showScene(); }
          if (st.scene === 'fusion') {
            if (SS && typeof SS.T === 'number' && SS.T !== st.T) { st.T = SS.T; rng.set(SS.T); fusionInfoLow(); }
            stepFusion(Math.min(dt, 0.05)); updateBursts(dt);
            if (phase === 'done') { phaseT += dt; if (phaseT > 4.5) { spawn(); heLab.show(false); enLab.show(false); fusionInfoLow(); } }
            const p0 = ps[0]; pLab.obj = p0 && p0.kind === 'p' ? p0.g : (ps.find((q) => q.kind === 'p') || { g: null }).g; pLab.show(!!pLab.obj && phase === 'run');
            const he = ps.find((q) => q.kind === 'he'); if (he) { heLab.obj = he.g; heLab.off = [0, 0.95, 0]; enLab.obj = he.g; enLab.off = [1.1, -0.4, 0]; }
            hot.material.opacity = 0.18 + 0.14 * (st.T / 2000);
            { const sp = 0.4 + st.T / 1000; for (let i = 0; i < NPL; i++) { const d = plD[i]; d.p.addScaledVector(d.v, dt * sp); ['x', 'y', 'z'].forEach((k) => { if (Math.abs(d.p[k]) > BOX * 0.97) { d.p[k] = Math.sign(d.p[k]) * BOX * 0.97; d.v[k] *= -1; } }); plO.position.copy(d.p); plO.updateMatrix(); plasma.setMatrixAt(i, plO.matrix); } plasma.instanceMatrix.needsUpdate = true; }
          } else if (st.scene === 'mass') {
            // 2D에서 융합시키면 3D도 같은 진행으로 따라가요
            const fz = S && S.fz, key = SS ? (SS.fuseT >= 0 ? (SS.fuseDone ? 'd' : 'r') : 'n') : '';
            if (key !== st.sig) { st.sig = key; if (key) { st.demo = false; plM.pause(); } }
            if (!st.demo && fz) { internal = true; plM.set(key === 'n' ? 0 : fz.v); internal = false; }
            if (SS && rngM && Math.abs(rngM.value - SS.M) > 0.5) rngM.set(SS.M);
            if (K) {
              const dm = K.LOSS_PCT / 100 * (SS ? SS.M : 100), p = plM.p;
              setInfo(p < 0.42 ? '수소 핵 4개의 질량을 <b>' + K.H_MASS + '</b>이라 하면 헬륨 핵 1개는 <b>' + K.HE_MASS + '</b>이에요. 융합시키면 질량이 줄어요.'
                : '수소 핵 4개 <b>' + K.H_MASS + '</b> → 헬륨 핵 1개 <b>' + K.HE_MASS + '</b>: 줄어든 질량 <b>' + K.LOSS + ' (' + K.LOSS_PCT + ' %)</b>가 에너지로 바뀌어요.<br>수소 ' + (SS ? SS.M : 100) + ' g이 융합하면 질량 약 ' + (Math.round(dm * 10) / 10) + ' g이 에너지로 바뀌어요.');
            }
          } else {
            if (SS) {
              const sel = SS.sel;
              if (!st.demo) st.sel = sel; else if (!plF.playing && SS.sel !== st.sel) st.demo = false;
              pathBtns.forEach((b, i) => { const done = SS.visited && SS.visited.has(i); const tx = PTH[i] + (done ? ' ✓' : ''); b.classList.toggle('on', i === st.sel); if (b.textContent !== tx) b.textContent = tx; });
            }
            pArr.forEach((a, i) => { const on = st.sel < 0 || st.sel === i; a.m.opacity = on ? 1 : 0.22; });
            const si = st.sel;
            setInfo(si >= 0 ? '<b>' + PTH[si] + '</b> (' + PSUB[si] + '): 지구에 온 에너지 100 중 <b>' + PV[si] + '</b><br>' + (S && S.PATHS ? S.PATHS[si].note : '') : '태양이 내보내는 에너지 중 지구에 닿는 것은 <b>약 20억분의 1</b>이에요. 지구에 온 에너지를 100으로 놓고, 반사 30 · 흡수 70이 열·증발·바람·해류·광합성으로 가요.<br>길을 눌러 보세요.');
            beads.forEach((b) => { const u = b.userData, k = (t * u.sp + u.ph) % 1; b.position.copy(sun3.position).addScaledVector(u.dir, 1.8 + k * 7.2); });
            earth.rotation.y = t * 0.5; eCl.rotation.y = t * 0.62; sg.material.opacity = 0.6 + Math.sin(t * 2) * 0.05;
          }
        },
        sync() {},
      };
    },
  });
})();
