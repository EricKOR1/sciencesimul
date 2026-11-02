/* hs-plate-plume · 3D 판을 움직이는 힘과 맨틀 플룸 (단면 블록)
   해령에서 생긴 해양판은 식으면서 두꺼워지고 무거워져요. 해령 밀어내기(ridge push)와 가라앉는 판이 끌어당기는 힘(slab pull)이 판을 움직여요.
   맨틀 깊은 곳에서 올라오는 뜨거운 기둥(플룸)은 거의 한 자리에 있어서, 그 위를 판이 지나가면 화산섬이 줄지어 만들어져요(열점 궤적).
   크기와 속도는 보기 좋게 나타낸 모형이에요. 2D 실험의 단계에 맞춰 힘 화살표 · 플룸을 보여 줘요(읽기 전용). */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const XR = -4.6, XT = 2.4, DEP = 3.2, MB = -4.0;                  // 해령 · 해구 위치 · 단면 폭 · 맨틀 바닥
  const ANG = 42 * Math.PI / 180, SL = 3.7;
  const thick = (x) => 0.12 + 0.52 * Math.sqrt(Math.max(0, (x - XR) / (XT - XR)));
  const PX = -0.4;                                                   // 플룸 위치

  window.SciSim3D.attach({
    title: '판과 플룸 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    levels: [0, 1, 2],
    camera: { dist: PHONE ? 19 : 15.5, theta: 0.3, phi: 1.3, min: 7, max: 30, target: [0.3, -1.5, 0] },
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const st = { v: 0.6, forces: true, plume: false, flow: false, t: 0, key: '', islands: [], nextIsl: 0, labels: true };
      const sr = () => { try { return window.__sim && window.__sim.S; } catch (e) { return null; } };

      /* 맨틀 */
      const mantle = new THREE.Mesh(new THREE.BoxGeometry(13.4, -MB - 0.12, DEP), new THREE.MeshStandardMaterial({ color: 0xe8741c, roughness: 0.7, transparent: true, opacity: 0.55, emissive: 0x9a2f08, emissiveIntensity: 0.3, depthWrite: false, side: THREE.BackSide }));
      mantle.position.set(0.3, (MB - 0.12) / 2, 0); root.add(mantle);
      const base = new THREE.Mesh(new THREE.BoxGeometry(13.4, 0.18, DEP), new THREE.MeshStandardMaterial({ color: 0xd9480f, roughness: 0.6, emissive: 0xb91c1c, emissiveIntensity: 0.5 })); base.position.set(0.3, MB - 0.09, 0); root.add(base);
      /* 바다 */
      const sea = new THREE.Mesh(new THREE.BoxGeometry(XT - XR + 1.2, 0.4, DEP), new THREE.MeshStandardMaterial({ color: 0x2f86d6, roughness: 0.2, transparent: true, opacity: 0.35, depthWrite: false }));
      sea.position.set((XR + XT) / 2 - 0.3 + 0.2, 0.2, 0); root.add(sea);
      /* 해양 암석권 + 섭입하는 판 (단면 도형을 압출) */
      const th = thick(XT), dir = [Math.cos(ANG), -Math.sin(ANG)], nrm = [Math.sin(ANG), Math.cos(ANG)];   // 슬래브 진행 방향 · 아래쪽 법선(−nrm)
      const lithoMat = new THREE.MeshStandardMaterial({ color: 0x3f78b0, roughness: 0.75 }), slabMat = new THREE.MeshStandardMaterial({ color: 0x2f5a8a, roughness: 0.75 });
      { const shp = new THREE.Shape(); shp.moveTo(XR, 0); shp.lineTo(XT, 0);
        for (let i = 28; i >= 0; i--) { const x = XR + (XT - XR) * i / 28; shp.lineTo(x, -thick(x)); }
        const m = new THREE.Mesh(new THREE.ExtrudeGeometry(shp, { depth: DEP, bevelEnabled: false }), lithoMat); m.position.z = -DEP / 2; root.add(m); }
      { const A = [XT, 0], B = [XT + dir[0] * SL, dir[1] * SL], C = [B[0] - nrm[0] * th, B[1] - nrm[1] * th], D = [A[0] - nrm[0] * th, A[1] - nrm[1] * th];
        const shp = new THREE.Shape(); shp.moveTo(A[0], A[1]); shp.lineTo(B[0], B[1]); shp.lineTo(C[0], C[1]); shp.lineTo(D[0], D[1]); shp.lineTo(A[0], A[1]);
        const m = new THREE.Mesh(new THREE.ExtrudeGeometry(shp, { depth: DEP, bevelEnabled: false }), slabMat); m.position.z = -DEP / 2; root.add(m); }
      /* 해령 (갈라지는 틈) */
      const ridge = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.3, 5, 1), new THREE.MeshStandardMaterial({ color: 0xff6a2e, emissive: 0xff3b10, emissiveIntensity: 0.7, roughness: 0.5 })); ridge.scale.set(1, 1, DEP / 0.68 * 0.8); ridge.rotation.y = 0; ridge.position.set(XR - 0.02, 0.1, 0); root.add(ridge);
      /* 대륙 (오른쪽, 위에 얹힌 판) */
      const cont = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.95, DEP), new THREE.MeshStandardMaterial({ color: 0x8a7a5c, roughness: 0.9 })); cont.position.set(XT + 1.8 + 0.12, 0.2, 0); root.add(cont);
      const contTop = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.14, DEP), new THREE.MeshStandardMaterial({ color: 0x5aa05a, roughness: 0.9 })); contTop.position.set(XT + 1.92, 0.7, 0); root.add(contTop);
      const contRoot = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.6, DEP), new THREE.MeshStandardMaterial({ color: 0x6d5a40, roughness: 0.9 })); contRoot.position.set(XT + 1.92, -0.58, 0); root.add(contRoot);

      /* 판의 이동을 보여 주는 점 (해령 → 해구 → 슬래브) */
      const pathPt = (s) => {                                 // s: 0..1 경로 위의 점 (판의 가운데 높이)
        const L1 = XT - XR, tot = L1 + SL, d = s * tot;
        if (d <= L1) { const x = XR + d; return [x, -thick(x) / 2]; }
        const q = d - L1; return [XT + dir[0] * q - nrm[0] * th / 2, dir[1] * q - nrm[1] * th / 2];
      };
      const NB = 30, beadM = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 12, 9), new THREE.MeshStandardMaterial({ color: 0xffe08a, roughness: 0.3, emissive: 0x6a4a00, emissiveIntensity: 0.5 }), NB); beadM.frustumCulled = false; root.add(beadM);
      const dm = new THREE.Object3D();

      /* 힘 화살표 */
      function arrow(col, len, w) {
        const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: col, roughness: 0.4, emissive: col, emissiveIntensity: 0.3 });
        const sh = new THREE.Mesh(new THREE.CylinderGeometry(w, w, len - w * 5, 12), m); sh.position.y = (len - w * 5) / 2;
        const hd = new THREE.Mesh(new THREE.ConeGeometry(w * 2.6, w * 5, 18), m); hd.position.y = len - w * 2.5; g.add(sh, hd); return g;
      }
      const forceG = new THREE.Group(); root.add(forceG);
      const aPush = arrow(0xef4444, 2.2, 0.1); aPush.rotation.z = -Math.PI / 2; aPush.position.set(XR + 0.4, 0.75, DEP / 2 + 0.25); forceG.add(aPush);
      const sp0 = pathPt(0.86), aPull = arrow(0x7c3aed, 2.3, 0.1); forceG.add(aPull);
      aPull.position.set(sp0[0] - dir[0] * 1.3, sp0[1] - dir[1] * 1.3, DEP / 2 + 0.25); aPull.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dir[0], dir[1], 0));
      const lPush = label('해령 밀어내기', [XR + 1.6, 1.15, DEP / 2 + 0.25], { color: 'rgba(185,28,28,.92)' }), lPull = label('슬래브 끌어당김', [sp0[0] - 0.8, sp0[1] + 0.2, DEP / 2 + 0.25], { color: 'rgba(109,40,217,.92)' });

      /* 플룸 */
      const plumeG = new THREE.Group(); root.add(plumeG);
      const pm = new THREE.MeshStandardMaterial({ color: 0xff7a1a, emissive: 0xff4a00, emissiveIntensity: 0.9, roughness: 0.5, transparent: true, opacity: 0.8 });
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.24, -MB - 0.9, 20, 1, true), pm); stem.position.set(PX, MB / 2 - 0.45, 0); plumeG.add(stem);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.6, 28, 20), pm); head.scale.set(1, 0.7, 1); head.position.set(PX, -0.95, 0); plumeG.add(head);
      const NP = 40, pbM = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd08a }), NP); pbM.frustumCulled = false; plumeG.add(pbM);
      const pseed = Array.from({ length: NP }, (_, i) => [((i * 0.6180339) % 1), Math.sin(i * 12.9898) * 0.5, Math.cos(i * 7.233) * 0.5]);
      const lPlume = label('맨틀 플룸', [PX + 0.4, -2.6, 0.2], { color: 'rgba(194,65,12,.92)' }), lHot = label('열점', [PX, 0.8, 0.2], { color: 'rgba(146,64,14,.92)' });
      /* 화산섬 */
      const islG = new THREE.Group(); root.add(islG);
      const islMat = new THREE.MeshStandardMaterial({ color: 0x6b4f3a, roughness: 0.85 }), islTop = new THREE.MeshStandardMaterial({ color: 0x4caf6a, roughness: 0.85 });

      /* 맨틀 대류 점 (해령 위로 올라와 → 판 아래로 → 해구로 내려가 → 바닥에서 되돌아와요) */
      const flowPath = (s) => {
        const pts = [[XR + 0.2, -3.5], [XR + 0.2, -1.2], [XT - 0.2, -1.55], [XT + 1.0, -2.4], [XT + 0.5, -3.5], [XR + 0.2, -3.5]];
        const seg = pts.length - 1, f = s * seg, i = Math.min(seg - 1, Math.floor(f)), u = f - i, a = pts[i], b = pts[i + 1]; return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
      };
      const NFL = 26, flowM = new THREE.InstancedMesh(new THREE.ConeGeometry(0.1, 0.28, 10), new THREE.MeshBasicMaterial({ color: 0xffd9a0 }), NFL); flowM.frustumCulled = false; root.add(flowM);

      label('해양 암석권', [-2.3, -0.65, 0.2], { size: 11.5, color: 'rgba(40,70,110,.92)' }); label('맨틀', [-3.5, -3.0, 0.2], { size: 11.5, color: 'rgba(150,60,10,.92)' });
      const lRidge = label('해령', [XR, 0.65, 0], { size: 11.5 }), lTrench = label('해구', [XT + 0.2, 0.55, 0.0], { size: 11.5 });

      function text() {
        const L = [];
        if (st.forces) L.push('<span style="color:#fca5a5">해령 밀어내기</span>와 <span style="color:#c4b5fd">슬래브 끌어당김</span>이 판을 움직여요. 슬래브 끌어당김이 가장 커요.');
        if (st.plume) L.push('<b>플룸</b>은 한 자리에 있고, 판이 그 위를 지나가며 <b>화산섬이 줄지어</b> 생겨요. 오래된 섬일수록 판 따라 멀리 있어요.');
        if (!L.length) L.push('식으면서 두꺼워지고 무거워진 해양판이 해구에서 맨틀로 가라앉아요.');
        info(L.join('<br>'));
      }
      const bF = controls.button('힘 화살표 ✓', () => { st.forces = !st.forces; bF.classList.toggle('on', st.forces); bF.textContent = '힘 화살표 ' + (st.forces ? '✓' : '✕'); apply(); }); bF.classList.add('on');
      const bP = controls.button('맨틀 플룸 ✕', () => { st.plume = !st.plume; bP.classList.toggle('on', st.plume); bP.textContent = '맨틀 플룸 ' + (st.plume ? '✓' : '✕'); apply(); });
      const bC = controls.button('맨틀 대류 ✕', () => { st.flow = !st.flow; bC.classList.toggle('on', st.flow); bC.textContent = '맨틀 대류 ' + (st.flow ? '✓' : '✕'); apply(); });
      const rV = controls.range('판의 속도', 0.2, 1.4, 0.1, st.v, (v) => { st.v = v; }, (v) => v.toFixed(1) + ' ×');
      function setBtn(b, on, nm) { b.classList.toggle('on', on); b.textContent = nm + ' ' + (on ? '✓' : '✕'); }
      function apply() {
        forceG.visible = st.forces; lPush.show(st.forces); lPull.show(st.forces);
        plumeG.visible = st.plume; islG.visible = st.plume; lPlume.show(st.plume); lHot.show(st.plume); flowM.visible = st.flow;
        text();
      }
      apply();
      function follow() {
        const S = sr(); if (!S) return; if (S.mode === st.key) return; st.key = S.mode;
        if (S.mode === 'ridge' || S.mode === 'slab') { st.forces = true; st.plume = false; }
        else if (S.mode === 'plume' || S.mode === 'hot') { st.forces = false; st.plume = true; }
        else return;
        setBtn(bF, st.forces, '힘 화살표'); setBtn(bP, st.plume, '맨틀 플룸'); apply();
      }
      follow();

      return {
        update(dt) {
          follow(); st.t += dt;
          const sp = st.v * 0.07;                                              // 경로 비율/초
          for (let i = 0; i < NB; i++) {                                         // 단면 앞쪽 면에서 판을 따라 움직이는 점
            const s = ((i / NB + st.t * sp) % 1), p = pathPt(s); dm.position.set(p[0], p[1], DEP / 2 + 0.06); dm.updateMatrix(); beadM.setMatrixAt(i, dm.matrix);
          }
          beadM.instanceMatrix.needsUpdate = true;
          if (st.plume) {
            /* 플룸 입자: 줄기를 따라 위로 */
            for (let i = 0; i < NP; i++) { const s = ((pseed[i][0] + st.t * 0.22) % 1), y = MB + 0.1 + s * (-MB - 1.0), r = 0.15 * (1 - 0.3 * s); dm.position.set(PX + pseed[i][1] * r * 1.4, y, pseed[i][2] * r * 1.4); dm.scale.setScalar(1); dm.updateMatrix(); pbM.setMatrixAt(i, dm.matrix); }
            pbM.instanceMatrix.needsUpdate = true; head.scale.set(1 + 0.05 * Math.sin(st.t * 3), 0.7, 1 + 0.05 * Math.sin(st.t * 3));
            /* 열점 화산섬: 새 섬이 생기고 판을 따라 오른쪽으로 움직여요 */
            st.nextIsl -= dt; if (st.nextIsl <= 0) { st.nextIsl = 0.95 / (st.v * 0.75); const g = new THREE.Group(); const c1 = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.5, 20), islMat), c2 = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.2, 20), islTop); c1.position.y = 0.25; c2.position.y = 0.55; g.add(c1, c2); g.position.set(PX, 0, 0); g.userData.age = 0; islG.add(g); st.islands.push(g); }
            st.islands.forEach((g) => { g.userData.age += dt; g.position.x += st.v * 0.75 * dt; const a = Math.max(0.15, 1 - g.userData.age * 0.09); g.scale.setScalar(Math.min(1, g.userData.age * 1.4 + 0.05) * a); });
            while (st.islands.length && st.islands[0].position.x > XT - 0.1) { const g = st.islands.shift(); islG.remove(g); g.children.forEach((c) => c.geometry.dispose()); }
            lHot.obj = [PX, 0.75, 0.2];
          }
          if (st.flow) for (let i = 0; i < NFL; i++) {
            const s = ((i / NFL + st.t * 0.03 * (st.v + 0.4)) % 1), p = flowPath(s), p2 = flowPath((s + 0.01) % 1);
            dm.position.set(p[0], p[1], (i % 3 - 1) * 0.9); const d = new THREE.Vector3(p2[0] - p[0], p2[1] - p[1], 0); if (d.lengthSq() > 1e-9) dm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); dm.scale.setScalar(1); dm.updateMatrix(); flowM.setMatrixAt(i, dm.matrix); dm.quaternion.identity();
          }
          if (st.flow) flowM.instanceMatrix.needsUpdate = true;
        },
        sync() { st.key = ''; follow(); },
      };
    },
  });
})();
