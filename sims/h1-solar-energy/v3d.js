/* h1-solar-energy · 3D 태양: 단면 · 핵융합 · 지구까지
   ① 태양 단면: 핵(중심부) → 복사층 → 대류층 → 광구 (크기는 실제 비율에 가깝게 줄인 모형)
   ② 핵융합: 중심부의 수소 핵(양성자)은 서로 밀어내지만, 온도가 높아 충분히 빠르면 부딪혀 융합해요. 수소 핵 4개 → 헬륨 핵 1개 + 에너지.
      입자의 움직임은 단순한 모의 계산이에요 (서로 밀어내는 힘 + 열운동). 2D 실험처럼 온도 100~2000만 K.
   ③ 지구까지: 태양이 내보내는 에너지 중 지구에 닿는 것은 약 20억분의 1 (거리와 크기는 줄여서 그렸어요). */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);

  window.SciSim3D.attach({
    title: '3D 태양과 핵융합',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHN ? 13 : 9, theta: 0.3, phi: 1.2, min: 5, max: 30 },
    autoRotate: 0.12,
    levels: [0, 1],
    build(ctx) {
      const { THREE, root, camera, label, info, controls, orbit } = ctx;
      const V3 = THREE.Vector3;
      const S0 = window.__sim && window.__sim.S;
      const st = { scene: 'fusion', T: S0 && S0.T ? S0.T : 1500, t: 0 };
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0.05 }, o || {}));
      const gc = document.createElement('canvas'); gc.width = gc.height = 128; const g2 = gc.getContext('2d'), gr = g2.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, 'rgba(255,240,170,1)'); gr.addColorStop(0.3, 'rgba(255,190,60,.55)'); gr.addColorStop(1, 'rgba(255,150,0,0)'); g2.fillStyle = gr; g2.fillRect(0, 0, 128, 128);
      const glowTex = new THREE.CanvasTexture(gc);
      const glowMat = (op) => new THREE.SpriteMaterial({ map: glowTex, transparent: true, opacity: op == null ? 1 : op, blending: THREE.AdditiveBlending, depthWrite: false });

      /* ================= ① 태양 단면 ================= */
      const gSun = new THREE.Group(); root.add(gSun);
      const R = 3.6, LAY = [
        { n: '핵', r: 0.25 * R, c: 0xfff1a8, e: 0xffe36b, ei: 1.1 },
        { n: '복사층', r: 0.7 * R, c: 0xffc23d, e: 0xff9d1a, ei: 0.6 },
        { n: '대류층', r: R, c: 0xff7a2a, e: 0xe0480e, ei: 0.55 },
      ];
      const sunG = new THREE.Group(); sunG.rotation.y = 3 * Math.PI / 4 + 0.35; gSun.add(sunG);
      const P3 = Math.PI * 1.5;
      for (let i = LAY.length - 1; i >= 0; i--) {
        const L = LAY[i];
        const sph = new THREE.Mesh(new THREE.SphereGeometry(L.r, 64, 40, 0, P3), new THREE.MeshStandardMaterial({ color: L.c, emissive: L.e, emissiveIntensity: L.ei, roughness: 0.7, side: THREE.DoubleSide }));
        sunG.add(sph);
        const r0 = i ? LAY[i - 1].r : 0;
        const cutA = i ? new THREE.RingGeometry(r0, L.r, 64, 1, Math.PI / 2, Math.PI) : new THREE.CircleGeometry(L.r, 48, Math.PI / 2, Math.PI);
        const m = new THREE.MeshStandardMaterial({ color: L.c, emissive: L.e, emissiveIntensity: L.ei * 0.9, roughness: 0.8, side: THREE.DoubleSide });
        const a = new THREE.Mesh(cutA, m), b = new THREE.Mesh(cutA.clone(), m);
        b.rotation.y = -Math.PI / 2; sunG.add(a, b);
      }
      const coreG = new THREE.Sprite(glowMat(0.9)); coreG.scale.set(R * 0.9, R * 0.9, 1); sunG.add(coreG);
      const sunGlow = new THREE.Sprite(glowMat(0.5)); sunGlow.scale.set(R * 3.6, R * 3.6, 1); gSun.add(sunGlow);
      const slabs = [
        label('핵 · 1500만 K', [0, 0, 0], { size: 12.5, offset: [0, 0, 0.1] }),
        label('복사층', [0, 0, 0], { size: 12 }),
        label('대류층', [0, 0, 0], { size: 12 }),
        label('여기서 핵융합이 일어나요', [0, 0, 0], { size: 11.5, color: 'rgba(160,60,0,.9)' }),
      ];
      function placeSunLabels() {
        const rot = (v) => v.clone().applyAxisAngle(new V3(0, 1, 0), sunG.rotation.y);
        slabs[0].obj = rot(new V3(-0.1, 0.05, -0.1)); slabs[1].obj = rot(new V3(-R * 0.48, 0, -0.01)).add(new V3(0, 0.7, 0));
        slabs[2].obj = rot(new V3(-R * 0.86, 0, 0)).add(new V3(0, -0.2, 0)); slabs[3].obj = rot(new V3(-0.1, 0.5, -0.1)); slabs[3].off = [0, 1.15, 0];
      }
      placeSunLabels();

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

      /* ================= ③ 지구까지 ================= */
      const gEa = new THREE.Group(); root.add(gEa);
      const sun3 = new THREE.Mesh(new THREE.SphereGeometry(2.2, 40, 28), new THREE.MeshStandardMaterial({ color: 0xffb62a, emissive: 0xff9410, emissiveIntensity: 0.9, roughness: 0.8 })); sun3.position.set(-7, 0, 0); gEa.add(sun3);
      const sg = new THREE.Sprite(glowMat(0.7)); sg.scale.set(11, 11, 1); sg.position.copy(sun3.position); gEa.add(sg);
      const ec = document.createElement('canvas'); ec.width = 256; ec.height = 128; { const g = ec.getContext('2d'); g.fillStyle = '#2f7fd8'; g.fillRect(0, 0, 256, 128); g.fillStyle = '#4caf6a'; let sd = 7; const rn = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; }; for (let i = 0; i < 16; i++) { const x = rn() * 256, y = 20 + rn() * 88; for (let j = 0; j < 7; j++) { g.beginPath(); g.ellipse(x + (rn() - 0.5) * 30, y + (rn() - 0.5) * 18, 6 + rn() * 16, 4 + rn() * 9, rn() * 3, 0, 7); g.fill(); } } g.fillStyle = '#f2f6fa'; g.fillRect(0, 0, 256, 7); g.fillRect(0, 121, 256, 7); }
      const earth = new THREE.Mesh(new THREE.SphereGeometry(0.55, 36, 24), new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(ec), roughness: 0.7 })); earth.position.set(6.5, 0, 0); gEa.add(earth);
      const beads = []; for (let i = 0; i < 70; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe14d })); b.userData = { dir: rv(), ph: Math.random(), sp: 0.12 + Math.random() * 0.1 }; b.userData.dir.x = Math.abs(b.userData.dir.x) + 0.15; b.userData.dir.normalize(); gEa.add(b); beads.push(b); }
      const eaLab = [label('☀ 태양', sun3, { size: 12.5, offset: [0, 2.9, 0] }), label('지구', earth, { size: 12.5, offset: [0, 1.0, 0] }), label('태양 에너지의 약 20억분의 1만 지구에 닿아요', [-0.5, -1.6, 0], { size: 12 })];

      /* ---------- 조작 ---------- */
      const seg = controls.segment('보기', [{ value: 'fusion', label: '⚛ 핵융합' }, { value: 'sun', label: '☀ 태양 단면' }, { value: 'earth', label: '🌍 지구까지' }], st.scene, (v) => { st.scene = v; showScene(); });
      const rng = controls.range('온도', 100, 2000, 50, st.T, (v) => { st.T = v; fusionInfoLow(); }, (v) => v + '만 K' + (v === 1500 ? ' (태양 중심부)' : ''));
      const again = controls.button('↺ 다시 하기', () => { spawn(); fusionInfoLow(); });
      const ctlEls = [rng, again];
      const kids = Array.from(again.parentElement.children), iR = kids.length - 4;     // [보기 라벨, 버튼 3개, 온도 라벨, 슬라이더, 버튼]
      function showScene() {
        const s = st.scene;
        gSun.visible = s === 'sun'; gFu.visible = s === 'fusion'; gEa.visible = s === 'earth';
        slabs.forEach((l) => l.show(s === 'sun')); eaLab.forEach((l) => l.show(s === 'earth'));
        for (let i = 4; i < kids.length; i++) kids[i].style.display = s === 'fusion' ? '' : 'none';
        pLab.show(s === 'fusion'); heLab.show(s === 'fusion' && phase === 'done'); enLab.show(s === 'fusion' && phase === 'done');
        if (s === 'sun') info('태양 에너지는 <b>중심부(핵)</b>에서 만들어져 바깥으로 전해져요.<br>핵은 온도가 약 <b>1500만 K</b>로 가장 뜨거워요.');
        else if (s === 'earth') info('태양이 내보낸 에너지가 <b>지구에 도착</b>해요.<br>지구에 닿는 양은 전체의 아주 작은 부분이에요.');
        else fusionInfoLow();
        orbit && orbit.setTarget && 0;
      }
      spawn(); showScene();

      return {
        update(dt, t) {
          st.t += dt;
          if (st.scene === 'fusion') {
            stepFusion(Math.min(dt, 0.05)); updateBursts(dt);
            if (phase === 'done') { phaseT += dt; if (phaseT > 4.5) { spawn(); heLab.show(false); enLab.show(false); fusionInfoLow(); } }
            const p0 = ps[0]; pLab.obj = p0 && p0.kind === 'p' ? p0.g : (ps.find((q) => q.kind === 'p') || { g: null }).g; pLab.show(!!pLab.obj && phase === 'run');
            const he = ps.find((q) => q.kind === 'he'); if (he) { heLab.obj = he.g; heLab.off = [0, 0.95, 0]; enLab.obj = he.g; enLab.off = [1.1, -0.4, 0]; }
            hot.material.opacity = 0.18 + 0.14 * (st.T / 2000);
          } else if (st.scene === 'sun') {
            sunG.rotation.y += dt * 0.0; coreG.scale.setScalar(R * (0.85 + Math.sin(t * 2) * 0.05)); placeSunLabels();
          } else {
            beads.forEach((b) => { const u = b.userData, k = (t * u.sp + u.ph) % 1; b.position.copy(sun3.position).addScaledVector(u.dir, 2.2 + k * 12); const toE = Math.abs(b.position.y) < 0.5 && Math.abs(b.position.z) < 0.5; b.visible = true; b.material.opacity = 1; b.scale.setScalar(toE ? 1.4 : 0.8); });
            earth.rotation.y = t * 0.5; sg.material.opacity = 0.6 + Math.sin(t * 2) * 0.05;
          }
        },
        sync() { const S = window.__sim && window.__sim.S; if (S && typeof S.T === 'number' && S.T !== st.T && st.scene === 'fusion') { st.T = S.T; rng.set(S.T); } },
      };
    },
  });
})();
