/* he-midlat-cyclone · 3D 온대 저기압과 전선의 공기 쐐기
   온난 전선은 따뜻한 공기가 찬 공기 위로 '완만하게' 올라타고(층운형 구름·넓은 약한 비),
   한랭 전선은 찬 공기가 따뜻한 공기 밑으로 '급하게' 파고들어요(적운형 구름·좁은 소나기). 경사는 알아보기 쉽게 크게 그렸어요.
   저기압 둘레에서는 북반구라서 바람이 반시계 방향으로 모여 들어요. 위가 북쪽, 오른쪽이 동쪽이에요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const lerp = (a, b, t) => a + (b - a) * t;

  window.SciSim3D.attach({
    title: '온대 저기압과 전선 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHONE ? 19 : 14.5, theta: -0.45, phi: 0.98, min: 5, max: 28, target: [0.8, 0.7, 0.6] },
    autoRotate: 0.1,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.8, metalness: 0 }, o || {}));
      let sd = 9; const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
      const V = (x, y, z) => new THREE.Vector3(x, y, z);

      /* 땅: 찬 공기 쪽(북·서)과 따뜻한 쪽(남동) 색 */
      const slab = new THREE.Mesh(new THREE.BoxGeometry(12, 0.3, 9.4), std(0x2f3d4b)); slab.position.set(0.8, -0.16, 0.4); root.add(slab);
      const sys = new THREE.Group(); root.add(sys);                 // 이동하는 전선계
      const LX = -0.8, LZ = -0.6;                                   // 저기압 중심
      const WF = { x1: 4.8, W: 4.6, H: 1.15 }, CF = { z1: 3.9, W: 2.0, H: 1.7 };

      /* 평면 · 쐐기 도우미 */
      function poly(faces, mat) { const pos = []; faces.forEach((f) => { for (let i = 1; i < f.length - 1; i++) [f[0], f[i], f[i + 1]].forEach((v) => pos.push(v.x, v.y, v.z)); }); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return new THREE.Mesh(g, mat); }
      function wedge(A, B, dir, W, H, mat) { // A,B: 전선(땅) 양 끝, dir: 찬 공기 쪽 방향
        const a2 = A.clone().addScaledVector(dir, W), b2 = B.clone().addScaledVector(dir, W), a3 = a2.clone().setY(H), b3 = b2.clone().setY(H);
        return poly([[A, B, b3, a3], [a3, b3, b2, a2], [A, a2, a3], [B, b3, b2], [A, a2, b2, B]].map((f, i) => i === 4 ? f : f), mat);
      }
      const coldM = std(0x5aa2ff, { transparent: true, opacity: 0.55, roughness: 0.4, side: THREE.DoubleSide, depthWrite: false });
      const warmWedge = wedge(V(LX, 0, LZ), V(WF.x1, 0, LZ), V(0, 0, -1), WF.W, WF.H, coldM); sys.add(warmWedge);
      const coldWedge = wedge(V(LX, 0, LZ), V(LX, 0, CF.z1), V(-1, 0, 0), CF.W, CF.H, coldM.clone()); sys.add(coldWedge);
      /* 지표 전선 (두꺼운 선) + 기호 */
      const lineMesh = (a, b, col) => { const d = b.clone().sub(a), m = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, d.length(), 10), new THREE.MeshBasicMaterial({ color: col })); m.position.copy(a).addScaledVector(d, 0.5).setY(0.04); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); return m; };
      const wfLine = lineMesh(V(LX, 0, LZ), V(WF.x1, 0, LZ), 0xe5484d), cfLine = lineMesh(V(LX, 0, LZ), V(LX, 0, CF.z1), 0x2f6fe0); sys.add(wfLine, cfLine);
      const wsym = [], csym = [];
      for (let i = 0; i < 6; i++) {
        const g = new THREE.Mesh(new THREE.CircleGeometry(0.2, 20, 0, Math.PI), std(0xe5484d, { side: THREE.DoubleSide })); g.rotation.x = -Math.PI / 2; g.position.set(LX + 0.7 + i * 0.66, 0.05, LZ - 0.22); wsym.push(g); sys.add(g);   // 온난 전선: 반원 (진행 쪽)
        const h = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.34, 3), std(0x2f6fe0)); h.rotation.z = -Math.PI / 2; h.position.set(LX + 0.22, 0.2, LZ + 0.7 + i * 0.5); csym.push(h); sys.add(h);                              // 한랭 전선: 삼각형
      }
      /* 저기압 중심 */
      const lowM = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.06, 24), std(0xffd34d, { emissive: 0xaa7700, emissiveIntensity: 0.4 })); lowM.position.set(LX, 0.06, LZ); sys.add(lowM);
      /* 지표 바람 화살표 (반시계 방향으로 모여들어요) */
      const NW = 14, windA = []; for (let i = 0; i < NW; i++) { const a = i / NW * Math.PI * 2, r = 2.0 + (i % 2) * 0.45;
        const g = new THREE.Group(), m = std(0xffffff, { emissive: 0x7fb2ff, emissiveIntensity: 0.4 }), s = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8), m), h = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.22, 10), m); s.position.y = 0.25; h.position.y = 0.6; g.add(s, h);
        const tx = -Math.sin(a), tz = -Math.cos(a), rx = -Math.cos(a), rz = Math.sin(a), dx = tx * 0.8 + rx * 0.6, dz = tz * 0.8 + rz * 0.6; g.position.set(LX + Math.cos(a) * r, 0.25, LZ - Math.sin(a) * r); g.quaternion.setFromUnitVectors(V(0, 1, 0), V(dx, 0, dz).normalize()); g.rotateX(0); sys.add(g); windA.push(g); }
      /* 구름 */
      const cloudM = std(0xf4f7fb, { roughness: 1 });
      const NC = 150, clouds = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 16, 12), cloudM, NC), dm = new THREE.Object3D(), cc = new THREE.Color(); sys.add(clouds);
      const warmCl = [], coldCl = []; let nc = 0;
      for (let i = 0; i < 64; i++) { const u = 0.1 + rnd() * 0.9, x = LX + 0.2 + rnd() * (WF.x1 - LX - 0.2), z = LZ - u * WF.W, y = u * WF.H + 0.16 + rnd() * 0.35 + (u > 0.8 ? 0.4 : 0); const hi = u > 0.78; warmCl.push({ x, y, z, s: lerp(0.4, 0.26, u) * (0.7 + rnd() * 0.5), sy: hi ? 0.12 : 0.2, hi }); }
      for (let j = 0; j < 6; j++) for (let k = 0; k < 6; k++) { const z = LZ + 0.15 + j * 0.62 + rnd() * 0.1, bx = LX - 0.1 - k * 0.12 + rnd() * 0.1, y = 0.35 + k * 0.38 + rnd() * 0.1; coldCl.push({ x: bx + 0.35, y, z, s: lerp(0.34, 0.28, k / 5) * (0.8 + rnd() * 0.4), sy: 0.9, top: k / 5 }); }
      const rainW = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.012, 0.012, 0.36, 5), new THREE.MeshBasicMaterial({ color: 0xaed4ff, transparent: true, opacity: 0.75 }), 70), rainC = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.016, 0.016, 0.42, 5), new THREE.MeshBasicMaterial({ color: 0x9cc4ff, transparent: true, opacity: 0.9 }), 80); sys.add(rainW, rainC);
      const rwS = [], rcS = []; for (let i = 0; i < 70; i++) rwS.push([LX + 0.3 + rnd() * (WF.x1 - LX - 0.3), -0.7 - rnd() * 2.2, rnd()]); for (let i = 0; i < 80; i++) rcS.push([LX - 0.1 - rnd() * 1.1, LZ + 0.2 + rnd() * (CF.z1 - LZ - 0.4), rnd()]);
      /* 공기 흐름 화살표 (쐐기 위로 올라가는 따뜻한 공기) */
      const flowW = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff7a45 }), 18), flowC = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff7a45 }), 18); sys.add(flowW, flowC);
      /* 진행 방향 */
      const mvArrow = (pos, dir, col) => { const m = std(col, { emissive: col, emissiveIntensity: 0.35 }), g = new THREE.Group(), s = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 10), m), h = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.32, 14), m); s.position.y = 0.45; h.position.y = 1.05; g.add(s, h); g.position.copy(pos); g.quaternion.setFromUnitVectors(V(0, 1, 0), dir.clone().normalize()); sys.add(g); return g; };
      const mvW = mvArrow(V(2.8, 0.1, LZ - 3.0), V(0, 0, -1), 0xe5484d), mvC = mvArrow(V(LX - 2.5, 0.1, 1.8), V(1, 0, 0), 0x2f6fe0);

      /* 이름표 (전선계 위의 점에 붙여요) */
      const anc = (x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); sys.add(o); return o; };
      const LB = {
        low: label('저기압 중심', anc(LX, 0.4, LZ), { size: 12.5, color: 'rgba(130,90,0,.92)' }),
        wf: label('온난 전선', anc(3.4, 0.15, LZ + 0.4), { size: 12.5, color: 'rgba(170,30,40,.92)' }), cf: label('한랭 전선', anc(LX + 0.2, 0.15, 3.2), { size: 12.5, color: 'rgba(30,70,170,.92)' }),
        cold: label('찬 공기', anc(0.8, 0.35, -3.0), { size: 12 }), warm: label('따뜻한 공기', anc(2.4, 0.15, 1.9), { size: 12, color: 'rgba(170,70,20,.92)' }),
        ws: label('완만한 경사 · 층운형 구름 · 넓은 약한 비', anc(3.0, 1.55, -2.7), { size: 11.5 }), cs: label('급한 경사 · 적운형 구름 · 좁은 소나기', anc(LX - 1.5, 2.1, 2.3), { size: 11.5 }),
      };

      /* 조작 */
      let mode = 'all', showCl = true, move = false, mt = 0;
      const seg = controls.segment('보기', [{ value: 'all', label: '전체' }, { value: 'warm', label: '온난 전선' }, { value: 'cold', label: '한랭 전선' }], mode, (v) => { mode = v; apply(); });
      const bC = controls.button('구름·비 ✓', () => { showCl = !showCl; bC.classList.toggle('on', showCl); bC.textContent = '구름·비 ' + (showCl ? '✓' : '✕'); apply(); }); bC.classList.add('on');
      const bM = controls.button('▶ 전선 이동', () => { move = !move; bM.textContent = move ? '⏸ 멈춤' : '▶ 전선 이동'; });
      function apply() {
        const w = mode !== 'cold', c = mode !== 'warm';
        warmWedge.visible = wfLine.visible = w; coldWedge.visible = cfLine.visible = c; wsym.forEach((m) => (m.visible = w)); csym.forEach((m) => (m.visible = c)); mvW.visible = w; mvC.visible = c;
        LB.wf.show(w); LB.cf.show(c); LB.ws.show(w && showCl); LB.cs.show(c && showCl); LB.cold.show(mode === 'all'); LB.warm.show(mode === 'all'); LB.low.show(mode === 'all');
        windA.forEach((a) => (a.visible = mode === 'all'));
        rainW.visible = w && showCl; rainC.visible = c && showCl; flowW.visible = w; flowC.visible = c;
        info(mode === 'warm' ? '<b>온난 전선</b>: 따뜻한 공기가 찬 공기 위로 완만하게 올라가요.<br>층운형 구름이 넓게 생기고 약한 비가 오래 와요. 지나가면 기온이 올라가요.' : mode === 'cold' ? '<b>한랭 전선</b>: 찬 공기가 따뜻한 공기를 급하게 밀어 올려요.<br>적운형 구름이 높이 솟고 좁은 지역에 소나기가 와요. 지나가면 기온이 내려가요.' : '북반구 저기압에서는 바람이 <b>반시계 방향</b>으로 중심에 모여 들어요.<br>찬 공기는 아래로 쐐기 모양을 이루어요.');
      }
      apply();

      return {
        update(dt, t) {
          if (move) { mt += dt * 0.35; sys.position.x = Math.sin(mt) * 1.6; sys.position.z = -Math.sin(mt) * 0.3; }
          let n = 0;
          const w = mode !== 'cold', c = mode !== 'warm', vis = showCl ? 1 : 0.0001;
          warmCl.forEach((o, i) => { dm.position.set(o.x + 0.05 * Math.sin(t * 0.5 + i), o.y, o.z); const s = o.s * (w ? vis : 0.0001); dm.scale.set(s * 1.4, Math.max(0.00005, s * o.sy * 2.2), s * 1.4); dm.updateMatrix(); clouds.setMatrixAt(n, dm.matrix); cc.setRGB(o.hi ? 1 : 0.86, o.hi ? 1 : 0.88, o.hi ? 1 : 0.92); clouds.setColorAt(n, cc); n++; });
          coldCl.forEach((o, i) => { dm.position.set(o.x, o.y + 0.04 * Math.sin(t + i), o.z); const s = o.s * (c ? vis : 0.0001) * (1 + 0.05 * Math.sin(t * 1.4 + i)); dm.scale.set(s, s, s); dm.updateMatrix(); clouds.setMatrixAt(n, dm.matrix); const g = 0.62 + 0.38 * o.top; cc.setRGB(g, g + 0.02, g + 0.06); clouds.setColorAt(n, cc); n++; });
          clouds.count = n; clouds.instanceMatrix.needsUpdate = true; if (clouds.instanceColor) clouds.instanceColor.needsUpdate = true;
          rwS.forEach((r, i) => { const f = (t * 0.45 + r[2]) % 1, u = -r[1] / 3, top = (-(r[1] + LZ) * 0 + 1) * (-r[1] - 0.6) / WF.W * WF.H + 0.2; dm.position.set(r[0], top * (1 - f) + 0.05, r[1] + LZ * 0); dm.scale.setScalar(1); dm.updateMatrix(); rainW.setMatrixAt(i, dm.matrix); });
          rainW.instanceMatrix.needsUpdate = true;
          rcS.forEach((r, i) => { const f = (t * 0.95 + r[2]) % 1, top = (LX - r[0]) / CF.W * CF.H + 0.5; dm.position.set(r[0], top * (1 - f) + 0.05, r[1]); dm.scale.setScalar(1); dm.updateMatrix(); rainC.setMatrixAt(i, dm.matrix); });
          rainC.instanceMatrix.needsUpdate = true;
          /* 쐐기를 타고 올라가는 따뜻한 공기 */
          for (let i = 0; i < 18; i++) { const u = (i / 18 + t * 0.07) % 1, x = LX + 0.4 + (i * 0.73 % 1) * (WF.x1 - LX - 0.6), zz = LZ + 0.5 - u * (WF.W + 0.5); dm.position.set(x, Math.max(0.08, u * WF.H + 0.1 + (u > 0 ? 0.08 : 0)) + 0.1, zz + (u < 0 ? 0 : 0)); dm.position.z = LZ + 0.9 - u * (WF.W + 0.9); dm.position.y = 0.12 + Math.max(0, (LZ - dm.position.z) / WF.W) * WF.H + 0.1; dm.scale.setScalar(1); dm.updateMatrix(); flowW.setMatrixAt(i, dm.matrix); }
          flowW.instanceMatrix.needsUpdate = true;
          for (let i = 0; i < 18; i++) { const u = (i / 18 + t * 0.1) % 1, z = LZ + 0.5 + ((i * 0.61) % 1) * (CF.z1 - LZ - 0.9); dm.position.set(LX + 0.7 - u * 0.4, 0.1 + u * 2.4, z); dm.scale.setScalar(1 - u * 0.3); dm.updateMatrix(); flowC.setMatrixAt(i, dm.matrix); }
          flowC.instanceMatrix.needsUpdate = true;
          windA.forEach((g, i) => { g.position.y = 0.25 + 0.03 * Math.sin(t * 2 + i); });
          mvW.position.z = LZ - 3.0 - 0.15 * Math.sin(t * 3); mvC.position.x = LX - 2.5 + 0.15 * Math.sin(t * 3);
        },
        sync() {},
      };
    },
  });
})();
