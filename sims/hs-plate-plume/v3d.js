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
      const st = { mode: 'ridge', forces: true, plume: false, flow: false, f: 0, SLc: SL, slabL: -1, pv: 5 };
      const sr = () => { try { return window.__sim && window.__sim.S; } catch (e) { return null; } };

      /* 맨틀 */
      const mantle = new THREE.Mesh(new THREE.BoxGeometry(13.4, -MB - 0.12, DEP), new THREE.MeshStandardMaterial({ color: 0xe8741c, roughness: 0.7, transparent: true, opacity: 0.55, emissive: 0x9a2f08, emissiveIntensity: 0.3, depthWrite: false, side: THREE.BackSide }));
      mantle.position.set(0.3, (MB - 0.12) / 2, 0); root.add(mantle);
      const base = new THREE.Mesh(new THREE.BoxGeometry(13.4, 0.18, DEP), ctx.mats.stone(0xd9480f, { repeat: 3, bump: 0.04, extra: { emissive: 0xb91c1c, emissiveIntensity: 0.55 } })); base.position.set(0.3, MB - 0.09, 0); root.add(base);
      /* 바다 */
      const sea = new THREE.Mesh(new THREE.BoxGeometry(XT - XR + 1.2, 0.4, DEP), ctx.mats.liquid(0x1f6fbf, { opacity: 0.4, extra: { bumpMap: ctx.mats.tex('noise'), bumpScale: 0.01 } }));
      sea.position.set((XR + XT) / 2 - 0.3 + 0.2, 0.2, 0); root.add(sea);
      /* 해양 암석권 + 섭입하는 판 (단면 도형을 압출) */
      const th = thick(XT), dir = [Math.cos(ANG), -Math.sin(ANG)], nrm = [Math.sin(ANG), Math.cos(ANG)];   // 슬래브 진행 방향 · 아래쪽 법선(−nrm)
      const lithoMat = ctx.mats.stone(0x3a6fa6, { repeat: 0.35, bump: 0.04 }), slabMat = ctx.mats.stone(0x2a5282, { repeat: 0.35, bump: 0.04 });   // 해양 암석권 (파랑 유지)
      { const shp = new THREE.Shape(); shp.moveTo(XR, 0); shp.lineTo(XT, 0);
        for (let i = 28; i >= 0; i--) { const x = XR + (XT - XR) * i / 28; shp.lineTo(x, -thick(x)); }
        const m = new THREE.Mesh(new THREE.ExtrudeGeometry(shp, { depth: DEP, bevelEnabled: false }), lithoMat); m.position.z = -DEP / 2; root.add(m); }
      const slabMesh = (() => { const shp = new THREE.Shape(); shp.moveTo(0, 0); shp.lineTo(1, 0); shp.lineTo(1, -th); shp.lineTo(0, -th); shp.lineTo(0, 0);
        const m = new THREE.Mesh(new THREE.ExtrudeGeometry(shp, { depth: DEP, bevelEnabled: false }), slabMat); m.position.set(XT, 0, -DEP / 2); m.rotation.z = -ANG; m.scale.x = SL; root.add(m); return m; })();
      /* 해령 (갈라지는 틈) */
      const ridge = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.3, 5, 1), ctx.mats.emissive(0xff6a2e, 1.1)); ridge.scale.set(1, 1, DEP / 0.68 * 0.8); ridge.rotation.y = 0; ridge.position.set(XR - 0.02, 0.1, 0); root.add(ridge);
      { const h = ctx.halo(null, 0xff7a3a, 1.4, 0.55); h.position.set(XR - 0.02, 0.2, 0); root.add(h); }   // 해령의 뜨거운 마그마 빛
      /* 대륙 (오른쪽, 위에 얹힌 판) */
      const cont = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.95, DEP), ctx.mats.stone(0x7a6a4c, { cracks: true, repeat: 0.5, bump: 0.05 })); cont.position.set(XT + 1.8 + 0.12, 0.2, 0); root.add(cont);
      const contTop = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.14, DEP), ctx.mats.stone(0x3f7f3f, { repeat: 0.8, bump: 0.05 })); contTop.position.set(XT + 1.92, 0.7, 0); root.add(contTop);
      const contRoot = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.6, DEP), ctx.mats.stone(0x5d4a32, { repeat: 0.5, bump: 0.05 })); contRoot.position.set(XT + 1.92, -0.58, 0); root.add(contRoot);

      /* 판의 이동을 보여 주는 점 (해령 → 해구 → 슬래브) */
      const pathPt = (s) => {                                 // s: 0..1 경로 위의 점 (판의 가운데 높이)
        const L1 = XT - XR, tot = L1 + st.SLc, d = s * tot;
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
      const aPull = arrow(0x7c3aed, 2.3, 0.1); forceG.add(aPull);
      aPull.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dir[0], dir[1], 0));
      const lPush = label('해령 미는 힘', [XR + 1.6, 1.15, DEP / 2 + 0.25], { color: 'rgba(185,28,28,.92)' }), lPull = label('당기는 힘 (슬랩 당김)', [0, 0, DEP / 2 + 0.25], { color: 'rgba(109,40,217,.92)' });
      /* 섭입한 판의 길이 L (2D 슬라이더 100~700 km) → 슬랩 길이 */
      function setSlab(L) {
        if (L === st.slabL) return; st.slabL = L; st.SLc = SL * L / 700; slabMesh.scale.x = st.SLc;
        const q = [XT + dir[0] * st.SLc * 0.55 - nrm[0] * th / 2, dir[1] * st.SLc * 0.55 - nrm[1] * th / 2];
        aPull.position.set(q[0] - dir[0] * 1.2, q[1] - dir[1] * 1.2, DEP / 2 + 0.25); lPull.obj = [q[0] - dir[0] * 0.2, q[1] + 0.55, DEP / 2 + 0.25];
        lSlabL.set('길이 L = ' + st.slabL + ' km'); lSlabL.obj = [XT + dir[0] * st.SLc + 0.2, dir[1] * st.SLc - 0.35, DEP / 2 + 0.25];
      }
      const lSlabL = label('길이 L', [0, 0, 0], { size: 11.5, color: 'rgba(30,58,138,.92)' });

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
      const islMat = ctx.mats.stone(0x5b4030, { repeat: 1, bump: 0.04 }), islTop = ctx.mats.stone(0x3f8f55, { repeat: 1, bump: 0.03 });

      /* 지진파 단층 촬영 (2D '🩻 단층 촬영 영상 보기'와 같은 색: 빨강 = 지진파 느림 = 뜨거움, 파랑 = 빠름 = 차가움) — 단면 앞면에 겹쳐요 */
      const TX0 = -6.4, TX1 = 7.0, TW = 512, TH = 160, tcv = document.createElement('canvas'); tcv.width = TW; tcv.height = TH;
      const tg = tcv.getContext('2d'), ttex = new THREE.CanvasTexture(tcv);
      const tX = (x) => (x - TX0) / (TX1 - TX0) * TW, tY = (y) => (0 - y) / (0 - MB) * TH;
      function blob(x, y, r, c) { const g = tg.createRadialGradient(tX(x), tY(y), 0, tX(x), tY(y), r); g.addColorStop(0, c + '.8)'); g.addColorStop(1, c + '0)'); tg.fillStyle = g; tg.fillRect(tX(x) - r, tY(y) - r, 2 * r, 2 * r); }
      function drawTomo() {
        tg.clearRect(0, 0, TW, TH);
        for (let y = MB + 0.25; y < -0.4; y += 0.2) blob(PX, y, 24, 'rgba(220,38,38,');
        for (let q = 0.2; q < st.SLc; q += 0.15) blob(XT + dir[0] * q - nrm[0] * th / 2, dir[1] * q - nrm[1] * th / 2, 16, 'rgba(37,99,235,');
        ttex.needsUpdate = true;
      }
      const tomo = new THREE.Mesh(new THREE.PlaneGeometry(TX1 - TX0, -MB), new THREE.MeshBasicMaterial({ map: ttex, transparent: true, opacity: 0, depthWrite: false }));
      tomo.position.set((TX0 + TX1) / 2, MB / 2, DEP / 2 + 0.05); tomo.renderOrder = 6; tomo.visible = false; root.add(tomo);
      const lSlow = label('빨강: 지진파 느림 = 뜨거움', [PX + 1.9, -3.3, DEP / 2 + 0.1], { size: 11.5, color: 'rgba(185,28,28,.94)' }), lFast = label('파랑: 빠름 = 차가움', [XT + 2.2, -2.5, DEP / 2 + 0.1], { size: 11.5, color: 'rgba(29,78,216,.94)' });
      lSlow.show(false); lFast.show(false); st.tk = 0; st.tomoSL = -1;

      /* 나이 표시 (2D '해양 암석권의 나이' 슬라이더 0~70백만 년) */
      const ageG = new THREE.Group(); root.add(ageG);
      const ageLine = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 8), new THREE.MeshBasicMaterial({ color: 0xc4b5fd })); ageG.add(ageLine);
      const ageDot = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), new THREE.MeshBasicMaterial({ color: 0xa78bfa })); ageG.add(ageDot);
      const lAge = label('', [0, 0, 0], { color: 'rgba(91,33,182,.94)' });
      function setAge(age) {
        const x = XR + (XT - XR) * Math.max(0, Math.min(70, age)) / 70, tk = thick(x), top = 0.7;
        ageLine.scale.y = top + tk; ageLine.position.set(x, (top - tk) / 2, DEP / 2 + 0.07); ageDot.position.set(x, -tk / 2, DEP / 2 + 0.1);
        lAge.obj = [x, top + 0.2, DEP / 2 + 0.1]; lAge.set('나이 ' + Math.round(age) + '백만 년 · 두께 약 ' + Math.round(12 * Math.sqrt(age)) + ' km');
      }
      /* 맨틀 대류 점 (해령 위로 올라와 → 판 아래로 → 해구로 내려가 → 바닥에서 되돌아와요) */
      const flowPath = (s) => {
        const pts = [[XR + 0.2, -3.5], [XR + 0.2, -1.2], [XT - 0.2, -1.55], [XT + 1.0, -2.4], [XT + 0.5, -3.5], [XR + 0.2, -3.5]];
        const seg = pts.length - 1, f = s * seg, i = Math.min(seg - 1, Math.floor(f)), u = f - i, a = pts[i], b = pts[i + 1]; return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
      };
      const NFL = 26, flowM = new THREE.InstancedMesh(new THREE.ConeGeometry(0.1, 0.28, 10), new THREE.MeshBasicMaterial({ color: 0xffd9a0 }), NFL); flowM.frustumCulled = false; root.add(flowM);

      label('해양 암석권', [-2.3, -0.65, 0.2], { size: 11.5, color: 'rgba(40,70,110,.92)' }); label('맨틀', [-3.5, -3.0, 0.2], { size: 11.5, color: 'rgba(150,60,10,.92)' });
      const lRidge = label('해령', [XR, 0.65, 0], { size: 11.5 }), lTrench = label('해구', [XT + 0.2, 0.55, 0.0], { size: 11.5 });

      /* 화산섬 (열점 위를 판이 지나가며 줄지어 생겨요) — 재생 위치 p로만 움직여요 */
      const NI = 6, isl = [];
      for (let j = 0; j < NI; j++) { const g = new THREE.Group(); const c1 = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.5, 20), islMat), c2 = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.2, 20), islTop); c1.position.y = 0.25; c2.position.y = 0.55; g.add(c1, c2); islG.add(g); isl.push(g); }

      function text() {
        const S = sr() || {}, w = window.__sim, m = st.mode, L = [];
        if (m === 'ridge') {
          const age = S.age == null ? 10 : S.age;
          L.push('<b>해령 미는 힘</b> · 해양 암석권은 해령에서 멀어져 <b>나이</b>가 많아질수록 식어서 두꺼워지고(h ≈ 12√t) 무거워져 더 가라앉아요.');
          L.push('나이 ' + Math.round(age) + '백만 년 · 암석권 두께 약 ' + Math.round(12 * Math.sqrt(age)) + ' km');
        } else if (m === 'slab') {
          L.push('<b>섭입하는 판</b>이 무거워 아래로 끌어당겨요 (슬랩 당김, F = Δρ·g·h·L).');
          L.push('가라앉은 길이 L = ' + (S.L == null ? 300 : S.L) + ' km');
        } else {
          L.push('<b>맨틀 플룸</b>은 거의 고정된 채 핵–맨틀 경계(약 2900 km)에서 올라오고, 판은 그 위를 지나가며 판의 경계가 아닌 곳에 화산(열점)이 줄지어 생겨요.');
          L.push('플룸 상승 속도 ' + st.pv + ' cm/년 (예시) · 올라온 거리 ' + (w && w.riseKm ? w.riseKm() : Math.round(st.f * 2900)) + ' km');
        }
        info(L.join('<br>'));
      }
      function apply() {
        const m = st.mode, pl = m === 'plume' || m === 'hot';
        st.forces = m === 'ridge' || m === 'slab'; st.plume = pl; st.flow = pl;
        forceG.visible = st.forces; lPush.show(st.forces); lPull.show(m === 'slab'); aPull.visible = m === 'slab'; lSlabL.show(m === 'slab');
        ageG.visible = m === 'ridge'; lAge.show(m === 'ridge');
        plumeG.visible = pl; lPlume.show(pl); lHot.show(pl); flowM.visible = pl; islG.visible = pl;
        lTrench.show(true); lRidge.show(true);
        text();
      }
      /* ▶ 재생: 해령에서 생긴 판이 해구로 가라앉는 한 바퀴 (플룸 단계에서는 판 위의 화산섬도 줄지어 생겨요) */
      const player = controls.player({
        duration: 10, loop: true, autoplay: false, label: '재생',
        phases: [[0, '해령에서 생김'], [0.35, '식어서 두꺼워짐'], [0.7, '해구에서 가라앉음']],
        onFrame(p) { st.p = p; },
      });
      st.p = 0;

      function follow() {
        const S = sr(); if (!S) return;
        const m = S.mode === 'hot' ? 'plume' : S.mode;
        if (m !== st.mode && (m === 'ridge' || m === 'slab' || m === 'plume')) { st.mode = m; apply(); }
        if (st.mode === 'ridge' && S.age !== st.age) { st.age = S.age; setAge(S.age); text(); }
        if (typeof S.L === 'number' && S.L !== st.lastL) { st.lastL = S.L; setSlab(S.L); if (st.mode === 'slab') text(); }
        if (st.mode === 'plume') { if (S.pf !== st.f || S.pv !== st.pv) { st.f = S.pf; st.pv = S.pv; text(); } }
      }
      st.lastL = null; setSlab(300); setAge(10);
      follow(); apply();

      return {
        update(dt) {
          follow();
          const p = st.p || 0;
          for (let i = 0; i < NB; i++) {                                         // 단면 앞쪽 면에서 판을 따라 움직이는 점
            const s = ((i + 13 * p) / NB) % 1, q = pathPt(s); dm.position.set(q[0], q[1], DEP / 2 + 0.06); dm.scale.setScalar(1); dm.updateMatrix(); beadM.setMatrixAt(i, dm.matrix);
          }
          beadM.instanceMatrix.needsUpdate = true;
          if (st.plume) {
            /* 플룸: 2D의 올라온 정도(S.pf)만큼 줄기가 자라요. 입자는 줄기를 따라 위로 */
            const f = Math.max(0.001, Math.min(1, st.f)), H = -MB - 0.9, ytop = MB + H * f;
            stem.scale.y = f; stem.position.y = MB + H * f / 2; head.position.y = ytop - 0.05; head.visible = stem.visible = st.f > 0.01;
            const hs = 0.55 + 0.45 * f; head.scale.set(hs, 0.7 * hs, hs);
            for (let i = 0; i < NP; i++) { const s = ((pseed[i][0] + 2 * p) % 1), y = MB + 0.1 + s * (ytop - MB - 0.2), r = 0.15 * (1 - 0.3 * s); dm.position.set(PX + pseed[i][1] * r * 1.4, y, pseed[i][2] * r * 1.4); dm.scale.setScalar(1); dm.updateMatrix(); pbM.setMatrixAt(i, dm.matrix); }
            pbM.instanceMatrix.needsUpdate = true; pbM.visible = st.f > 0.01;
            /* 열점 화산섬: 플룸이 지표에 닿으면 생기고 판을 따라 오른쪽으로 움직여요 */
            const show = st.f >= 0.999;
            isl.forEach((g, j) => { const u = ((j / NI + p) % 1); g.visible = show; g.position.set(PX + u * (XT - 0.1 - PX), 0, 0); g.scale.setScalar(Math.min(1, u * 8 + 0.05) * Math.max(0.15, 1 - u * 0.85)); });
            lHot.obj = [PX, 0.75, 0.2];
          }
          { const S = sr() || {}, w = window.__sim, want = st.mode === 'plume' && (S.tomoOn || (w && w.game && w.game.free)) ? 1 : 0;
            if (want && st.tomoSL !== st.SLc) { st.tomoSL = st.SLc; drawTomo(); }
            st.tk += (want - st.tk) * Math.min(1, dt * 5); if (Math.abs(want - st.tk) < 0.01) st.tk = want;
            tomo.visible = st.tk > 0.01; tomo.material.opacity = 0.9 * st.tk; lSlow.show(st.tk > 0.5); lFast.show(st.tk > 0.5); }
          if (st.flow) {
            for (let i = 0; i < NFL; i++) {
              const s = ((i / NFL + p) % 1), q = flowPath(s), q2 = flowPath((s + 0.01) % 1);
              dm.position.set(q[0], q[1], (i % 3 - 1) * 0.9); const d = new THREE.Vector3(q2[0] - q[0], q2[1] - q[1], 0); if (d.lengthSq() > 1e-9) dm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); dm.scale.setScalar(1); dm.updateMatrix(); flowM.setMatrixAt(i, dm.matrix); dm.quaternion.identity();
            }
            flowM.instanceMatrix.needsUpdate = true;
          }
        },
        sync() { follow(); },
      };
    },
  });
})();
