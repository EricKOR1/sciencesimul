/* m2-space-exploration · 3D 우주 탐사 (지구 주변 · 태양계)
   인공위성·우주 정거장·우주 망원경과 우주 쓰레기, 달 탐사선, 행성을 지나가는 탐사선(보이저)을 입체로 둘러봐요.
   (거리와 크기는 알아보기 쉽게 줄여서 그렸어요.) */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const DEG = Math.PI / 180;

  window.SciSim3D.attach({
    title: '우주 탐사 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHN ? 17 : 13, theta: 0.5, phi: 1.2, min: 4, max: 40 },
    autoRotate: 0.05,
    levels: [],                      // 1~4단계 미션(발사 · 연표 · 짝짓기 · 계획서)은 2D 화면에서 해요
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      const V3 = THREE.Vector3;
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0.1 }, o || {}));
      const near = new THREE.Group(), solar = new THREE.Group(); root.add(near, solar);
      // 별 배경
      const NS = 500, sp = new Float32Array(NS * 3);
      for (let i = 0; i < NS; i++) { const a = Math.random() * 6.283, b = Math.acos(2 * Math.random() - 1), r = 60; sp[i * 3] = r * Math.sin(b) * Math.cos(a); sp[i * 3 + 1] = r * Math.cos(b); sp[i * 3 + 2] = r * Math.sin(b) * Math.sin(a); }
      const sgm = new THREE.BufferGeometry(); sgm.setAttribute('position', new THREE.BufferAttribute(sp, 3)); root.add(new THREE.Points(sgm, new THREE.PointsMaterial({ color: 0xdfe8ff, size: 0.18, sizeAttenuation: true, transparent: true, opacity: 0.8 })));
      const ring = (r, col, op) => { const m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.012, 6, 160), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op })); m.rotation.x = Math.PI / 2; return m; };
      function earthTex() {
        const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d');
        g.fillStyle = '#2b6fd0'; g.fillRect(0, 0, 512, 256);
        const f = (x, y) => Math.sin(x * 0.035 + 1.3) * Math.cos(y * 0.05 + 0.4) + 0.6 * Math.sin(x * 0.09 + y * 0.07) + 0.4 * Math.sin(x * 0.17 - y * 0.11 + 2);
        const img = g.getImageData(0, 0, 512, 256);
        for (let y = 0; y < 256; y++) for (let x = 0; x < 512; x++) { const v = f(x, y) - Math.abs(y - 128) / 128 * 0.0; if (v > 0.55) { const i = (y * 512 + x) * 4, polar = Math.abs(y - 128) > 108; img.data[i] = polar ? 240 : 70 + v * 40; img.data[i + 1] = polar ? 244 : 150 + v * 30; img.data[i + 2] = polar ? 250 : 70; } }
        g.putImageData(img, 0, 0);
        return new THREE.CanvasTexture(c);
      }

      /* ================= 지구 주변 ================= */
      const earth = new THREE.Mesh(new THREE.SphereGeometry(1.6, 64, 40), mat(0xffffff, { map: earthTex(), roughness: 0.7 })); earth.castShadow = false; near.add(earth);
      const atm = new THREE.Mesh(new THREE.SphereGeometry(1.74, 48, 32), new THREE.MeshBasicMaterial({ color: 0x6fb4ff, transparent: true, opacity: 0.14, side: THREE.BackSide, depthWrite: false })); near.add(atm);
      const moon = new THREE.Mesh(new THREE.SphereGeometry(0.45, 40, 28), mat(0xbfc3cc, { roughness: 0.95 })); near.add(moon);
      const moonO = ring(9, 0x8fa0c8, 0.35); near.add(moonO);
      const danuri = new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), mat(0xffd34d, { metalness: 0.7, roughness: 0.3, emissive: 0x7a5a00, emissiveIntensity: 0.4 })); near.add(danuri);
      const danuriO = ring(0.85, 0xffd34d, 0.5); moon.add(danuriO);
      function sat(col, size) { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), mat(col, { metalness: 0.8, roughness: 0.3 })); const w = new THREE.Mesh(new THREE.BoxGeometry(size * 3.2, size * 0.06, size * 0.9), mat(0x2f5fd0, { metalness: 0.6, roughness: 0.2, emissive: 0x0a2a70, emissiveIntensity: 0.4 })); g.add(b, w); near.add(g); return g; }
      const iss = sat(0xdfe6f2, 0.1), hub = sat(0xc9ced8, 0.1), gps = [0, 1, 2].map(() => sat(0xe8d58a, 0.09));
      const tilt = { iss: 51.6 * DEG, hub: 28 * DEG, gps: 55 * DEG };
      const rIss = 1.95, rHub = 2.2, rGps = 3.6;
      const o1 = ring(rIss, 0xffffff, 0.35), o2 = ring(rHub, 0xffffff, 0.3), o3 = ring(rGps, 0xffe08a, 0.3);
      o1.rotation.x = Math.PI / 2 + tilt.iss; o2.rotation.x = Math.PI / 2 - tilt.hub * 0.0 + tilt.hub; o3.rotation.x = Math.PI / 2 + tilt.gps; o2.rotation.z = 0.6; near.add(o1, o2, o3);
      // 우주 쓰레기
      const ND = 220, deb = new THREE.InstancedMesh(new THREE.BoxGeometry(0.035, 0.035, 0.035), new THREE.MeshBasicMaterial({ color: 0xff8a5a }), ND); deb.frustumCulled = false; near.add(deb);
      const debD = []; for (let i = 0; i < ND; i++) debD.push({ r: 1.85 + Math.random() * 0.5, inc: (Math.random() - 0.5) * 2.4, node: Math.random() * 6.28, ph: Math.random() * 6.28, sp: 0.5 + Math.random() * 0.4 });
      // 로켓
      const rocket = new THREE.Group(); near.add(rocket);
      const rb = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.45, 16), mat(0xf4f6fa, { metalness: 0.3, roughness: 0.3 })); const rn = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 16), mat(0xe2464b)); rn.position.y = 0.3; rocket.add(rb, rn);
      for (let i = 0; i < 3; i++) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.14, 0.1), mat(0xe2464b)); const a = i * 2.094; f.position.set(Math.cos(a) * 0.08, -0.17, Math.sin(a) * 0.08); f.rotation.y = -a; rocket.add(f); }
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.4, 12), new THREE.MeshBasicMaterial({ color: 0xffa33a, transparent: true, opacity: 0.9 })); flame.rotation.x = Math.PI; flame.position.y = -0.4; rocket.add(flame);
      rocket.visible = false;
      const lNear = [label('지구', earth, { offset: [0, 1.95, 0] }), label('달', moon, { offset: [0, 0.7, 0] }), label('다누리', danuri, { offset: [0.2, 0.3, 0] }), label('국제 우주 정거장', iss, { offset: [0.0, 0.3, 0] }), label('허블 우주 망원경', hub, { offset: [0, -0.3, 0] }), label('인공위성', gps[0], { offset: [0, 0.3, 0] })];
      const lDeb = label('우주 쓰레기', [1.2, 1.5, 1.5], { color: 'rgba(200,90,40,.95)' });

      /* ================= 태양계 ================= */
      const sun = new THREE.Mesh(new THREE.SphereGeometry(1.1, 40, 28), new THREE.MeshBasicMaterial({ color: 0xffd34d })); solar.add(sun);
      solar.add(new THREE.Mesh(new THREE.SphereGeometry(1.7, 32, 20), new THREE.MeshBasicMaterial({ color: 0xffa500, transparent: true, opacity: 0.2, depthWrite: false })));
      const PL = [
        { n: '지구', r: 3.6, s: 0.24, c: 0x3f86e0, sp: 0.5, ph: 0.3 }, { n: '화성', r: 5.2, s: 0.2, c: 0xd9693a, sp: 0.33, ph: 2.6 },
        { n: '목성', r: 8.4, s: 0.7, c: 0xd9b48a, sp: 0.18, ph: 4.1 }, { n: '토성', r: 11.4, s: 0.6, c: 0xe6d08a, sp: 0.12, ph: 1.4 },
      ];
      PL.forEach((p) => { p.m = new THREE.Mesh(new THREE.SphereGeometry(p.s, 36, 24), mat(p.c, { roughness: 0.7 })); solar.add(p.m); solar.add(ring(p.r, 0x8fa0c8, 0.35)); p.l = label(p.n, p.m, { offset: [0, p.s + 0.35, 0] }); });
      const satRing = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.07, 3, 64), mat(0xd9c58a, { roughness: 0.6 })); satRing.rotation.x = Math.PI / 2 - 0.4; PL[3].m.add(satRing);
      // 탐사선 경로: 보이저 1 · 2호 (지구 → 목성 → 토성 → 바깥), 화성 탐사선 (전이 궤도)
      function tubeOf(pts, col, r) { const c = new THREE.CatmullRomCurve3(pts); const m = new THREE.Mesh(new THREE.TubeGeometry(c, 120, r || 0.03, 6, false), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.7 })); solar.add(m); return c; }
      const pos = (p, a) => new V3(Math.cos(a) * p.r, 0, Math.sin(a) * p.r);
      const v1c = tubeOf([new V3(3.6, 0, 0.0), new V3(5.5, 0.3, 3), new V3(7.8, 0.7, 6.2), new V3(10.5, 1.3, 9.2), new V3(14, 2.5, 11.5), new V3(18, 4, 13)], 0x9fe8ff);
      const v2c = tubeOf([new V3(3.6, 0, 0.0), new V3(5.8, -0.2, -2.5), new V3(8.6, -0.8, -5.2), new V3(11.5, -2.2, -7.5), new V3(14.5, -4.5, -9), new V3(18, -7, -9.5)], 0xb59aff);
      const mars = new THREE.Curve(); mars.getPoint = (t) => { const a = 0.15 + t * Math.PI * 0.9, r = 3.6 + (5.2 - 3.6) * (1 - Math.cos(t * Math.PI)) / 2; return new V3(Math.cos(a) * r, 0, Math.sin(a) * r); };
      solar.add(new THREE.Mesh(new THREE.TubeGeometry(mars, 80, 0.03, 6, false), new THREE.MeshBasicMaterial({ color: 0xff9a6a, transparent: true, opacity: 0.7 })));
      const probe = (col) => { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), mat(col, { metalness: 0.7, roughness: 0.3, emissive: col, emissiveIntensity: 0.4 }))); solar.add(g); return g; };
      const pv1 = probe(0x9fe8ff), pv2 = probe(0xb59aff), pm = probe(0xff9a6a);
      const lS = [label('태양', sun, { offset: [0, 1.5, 0] }), label('보이저 1호', pv1, { offset: [0, 0.5, 0], color: 'rgba(40,130,160,.95)' }), label('보이저 2호', pv2, { offset: [0, 0.5, 0], color: 'rgba(110,80,200,.95)' }), label('화성 탐사선', pm, { offset: [0, 0.5, 0], color: 'rgba(190,90,50,.95)' })];
      solar.visible = false;

      let mode = 'near', labs = true, showDeb = true, PH = 0, pl = null, internal = false;
      const dm = new THREE.Object3D(), tmp = new V3();
      function apply() {
        near.visible = mode === 'near'; solar.visible = mode === 'sol';
        lNear.forEach((l) => l.show(labs && mode === 'near')); lDeb.show(labs && showDeb && mode === 'near'); lS.forEach((l) => l.show(labs && mode === 'sol')); PL.forEach((p) => p.l.show(labs && mode === 'sol'));
        deb.visible = showDeb;
        if (mode === 'near') { orbit.dist = PHN ? 17 : 12; orbit.phi = 1.2; info('<b>지구 주변</b>: 인공위성·우주 정거장·우주 망원경이 지구를 돌아요.<br>수명이 다한 위성의 조각 같은 <b>우주 쓰레기</b>도 많이 떠돌아서 위험해요.'); }
        else { orbit.dist = PHN ? 36 : 27; orbit.phi = 1.1; info('<b>태양계 탐사</b>: 탐사선은 행성 곁을 지나가며 사진과 자료를 보내요.<br>보이저 1·2호는 목성과 토성을 지나 태양계 밖으로 나아가고 있어요.'); }
      }
      const sg = controls.segment('보기', [{ label: '지구 주변', value: 'near' }, { label: '태양계', value: 'sol' }], mode, (v) => { mode = v; apply(); });
      // ▶ 재생: 로켓 발사 → 우주(고도 100 km) 도착 → 인공위성을 궤도에 올리기 (2D의 '로켓 발사!'와 같은 순서)
      pl = controls.player({
        duration: 9, loop: true, autoplay: false, label: '로켓 발사',
        phases: [[0, '카운트다운 · 점화'], [0.06, '우주(고도 100 km)를 향해 상승'], [0.6, '우주 도착'], [0.66, '인공위성이 궤도에']],
        onFrame(p) { if (!pl || internal) return; if (mode !== 'near') { mode = 'near'; sg.set('near'); apply(); } },
      });
      controls.button('우주 쓰레기', () => { showDeb = !showDeb; apply(); });
      controls.button('이름표', () => { labs = !labs; apply(); });
      apply();
      return {
        update(dt, t) {
          PH += dt;
          if (mode === 'near') {
            earth.rotation.y += dt * 0.12;
            const am = PH * 0.12; moon.position.set(Math.cos(am) * 9, 0.0, Math.sin(am) * 9);
            danuri.position.copy(moon.position).add(new V3(Math.cos(PH * 1.5) * 0.85, Math.sin(PH * 1.5) * 0.3, Math.sin(PH * 1.5) * 0.85));
            danuriO.rotation.x = Math.PI / 2;
            const orb = (g, r, inc, node, w, ph) => { const a = ph + PH * w; tmp.set(Math.cos(a) * r, 0, Math.sin(a) * r); tmp.applyAxisAngle(new V3(1, 0, 0), inc).applyAxisAngle(new V3(0, 1, 0), node); g.position.copy(tmp); };
            orb(iss, rIss, tilt.iss, 0, 0.9, 0); orb(hub, rHub, tilt.hub, 0.0, 0.8, 2.0);
            // 허블 궤도 고리도 같은 기울기로 (고리: X축 기울임 후 z 회전 보정은 생략)
            o2.rotation.set(Math.PI / 2 + tilt.hub, 0, 0);
            gps.forEach((g, i) => orb(g, rGps, tilt.gps, 0, 0.35, i * 2.09));
            if (showDeb) for (let i = 0; i < ND; i++) { const d = debD[i]; const a = d.ph + PH * d.sp; tmp.set(Math.cos(a) * d.r, 0, Math.sin(a) * d.r).applyAxisAngle(new V3(1, 0, 0), d.inc).applyAxisAngle(new V3(0, 1, 0), d.node); dm.position.copy(tmp); dm.rotation.set(PH + i, PH * 0.7, 0); dm.updateMatrix(); deb.setMatrixAt(i, dm.matrix); }
            deb.instanceMatrix.needsUpdate = true;
            // 로켓 발사: 지표 → 곡선을 그리며 상승 → 궤도. 2D에서 발사하면 같은 단계로 따라가요.
            {
              const L2 = window.__sim && window.__sim.LC;
              if (L2 && L2.phase !== 'idle' && !pl.playing) {
                const ph = L2.phase;
                const u2 = ph === 'count' ? 0.05 * Math.min(1, L2.t / 2.7) : ph === 'burn' ? 0.06 + 0.54 * Math.min(1, L2.alt / 100) : ph === 'coast' ? 0.6 + 0.06 * Math.min(1, L2.t / 1.5) : ph === 'orbit' ? 0.66 + 0.33 * Math.min(1, (L2.ot || 0) / 4.6) : 1;
                if (Math.abs(u2 - pl.p) > 0.004) { internal = true; pl.set(u2); internal = false; }
              }
              const u = pl.p;
              if (u > 0.001 && u < 0.995) {
                const w = Math.min(1, u / 0.66);
                const lat = 25 * DEG, ang = w * w * 1.6, r = 1.62 + (1.98 - 1.62) * Math.pow(w, 0.7);
                const pp = new V3(Math.cos(lat + ang * 0.55), Math.sin(lat + ang * 0.55), 0).multiplyScalar(r); pp.applyAxisAngle(new V3(0, 1, 0), ang * 0.9 + 0.2);
                rocket.position.copy(pp); rocket.visible = true;
                const tang = new V3(-Math.sin(ang * 0.9 + 0.2), 0, Math.cos(ang * 0.9 + 0.2)).multiplyScalar(0.9 * w);
                rocket.quaternion.setFromUnitVectors(new V3(0, 1, 0), tmp.copy(pp).normalize().add(tang).normalize());
                flame.visible = u > 0.04 && u < 0.62; flame.scale.set(1, 0.7 + 0.5 * Math.sin(t * 40), 1);
              } else rocket.visible = false;
            }
          } else {
            PL.forEach((p) => { const a = p.ph + PH * p.sp * 0.25; p.m.position.copy(pos(p, a)); p.m.rotation.y += dt; });
            const u1 = (PH * 0.04) % 1; v1c.getPointAt(u1, pv1.position); v2c.getPointAt((PH * 0.034) % 1, pv2.position); pm.position.copy(mars.getPoint((PH * 0.08) % 1));
            [pv1, pv2, pm].forEach((p) => { p.rotation.y += dt * 2; });
          }
        },
      };
    },
  });
})();
