/* he-midlat-cyclone · 3D 온대 저기압과 전선의 공기 쐐기
   온난 전선은 따뜻한 공기가 찬 공기 위로 '완만하게' 올라타고(층운형 구름·넓은 약한 비),
   한랭 전선은 찬 공기가 따뜻한 공기 밑으로 '급하게' 파고들어요(적운형 구름·좁은 소나기). 경사는 알아보기 쉽게 크게 그렸어요.
   저기압 둘레에서는 북반구라서 바람이 반시계 방향으로 모여 들어요. 위가 북쪽, 오른쪽이 동쪽이에요.
   2D와 같게: 한랭 전선은 중심의 남서쪽(남남서), 온난 전선은 동~남동쪽(동남동)으로 뻗고, 저기압은 서 → 동으로 이동해요.
   ▶ 24시간: 저기압이 경로 남쪽의 서울(예시) 위로 지나가며 풍향·기압·기온이 바뀌어요(2D '전선 통과'의 시각 슬라이더와 같이 움직여요). */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const lerp = (a, b, t) => a + (b - a) * t, DEG = Math.PI / 180;

  window.SciSim3D.attach({
    title: '온대 저기압과 전선 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    levels: [0, 1],
    camera: { dist: PHONE ? 17 : 12, theta: -0.45, phi: 0.98, min: 5, max: 30, target: [0.8, 0.7, 0.6] },
    autoRotate: 0,
    build(ctx) {
      if (ctx.THREE.ColorManagement) ctx.THREE.ColorManagement.legacyMode = false;     // 색을 보이는 그대로(sRGB) 쓰도록 맞춰요
      const { THREE, root, label, info, controls } = ctx;
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.8, metalness: 0 }, o || {}));
      let sd = 9; const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
      const V = (x, y, z) => new THREE.Vector3(x, y, z);

      /* 땅: 찬 공기 쪽(북·서)과 따뜻한 쪽(남동) 색 */
      const slab = new THREE.Mesh(new THREE.BoxGeometry(15, 0.3, 9.4), std(0x2f3d4b)); slab.position.set(0.8, -0.16, 0.4); root.add(slab);
      const sys = new THREE.Group(); root.add(sys);                 // 이동하는 전선계
      const LX = -0.8, LZ = -0.6;                                   // 저기압 중심
      const WF = { x1: 4.8, W: 4.6, H: 1.15 }, CF = { z1: 3.9, W: 2.0, H: 1.7 };
      /* 전선의 방향 (2D와 같게): 온난 전선은 동쪽에서 30° 남쪽(동남동), 한랭 전선은 남남서. (x,z) 좌표 변환: u는 전선 따라, w는 찬 공기 쪽 */
      const eW = [Math.cos(30 * DEG), Math.sin(30 * DEG)], nW = [0.5, -Math.sqrt(3) / 2];             // 온난 전선: 따라가는 쪽 / 나아가는 쪽(찬 공기 쪽)
      const eC = [-1 / Math.sqrt(5), 2 / Math.sqrt(5)], cB = [-2 / Math.sqrt(5), -1 / Math.sqrt(5)], nC = [2 / Math.sqrt(5), 1 / Math.sqrt(5)];   // 한랭 전선: 따라가는 쪽 / 찬 공기 쪽 / 나아가는 쪽
      const PW = (x, z) => { const u = x - LX, w = LZ - z; return [LX + u * eW[0] + w * nW[0], LZ + u * eW[1] + w * nW[1]]; };
      const PC = (x, z) => { const u = z - LZ, w = LX - x; return [LX + u * eC[0] + w * cB[0], LZ + u * eC[1] + w * cB[1]]; };
      const yawW = -30 * DEG, yawC = -Math.atan2(nC[1], nC[0]);                                       // 전선계를 위에서 본 회전각

      /* 평면 · 쐐기 도우미 */
      function poly(faces, mat) { const pos = []; faces.forEach((f) => { for (let i = 1; i < f.length - 1; i++) [f[0], f[i], f[i + 1]].forEach((v) => pos.push(v.x, v.y, v.z)); }); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return new THREE.Mesh(g, mat); }
      function wedge(A, B, dir, W, H, mat) { // A,B: 전선(땅) 양 끝, dir: 찬 공기 쪽 방향
        const a2 = A.clone().addScaledVector(dir, W), b2 = B.clone().addScaledVector(dir, W), a3 = a2.clone().setY(H), b3 = b2.clone().setY(H);
        return poly([[A, B, b3, a3], [a3, b3, b2, a2], [A, a2, a3], [B, b3, b2], [A, a2, b2, B]].map((f, i) => i === 4 ? f : f), mat);
      }
      const coldM = std(0x5aa2ff, { transparent: true, opacity: 0.55, roughness: 0.4, side: THREE.DoubleSide, depthWrite: false });
      const wEnd = PW(WF.x1, LZ), cEnd = PC(LX, CF.z1);
      const warmWedge = wedge(V(LX, 0, LZ), V(wEnd[0], 0, wEnd[1]), V(nW[0], 0, nW[1]), WF.W, WF.H, coldM); sys.add(warmWedge);
      const coldWedge = wedge(V(LX, 0, LZ), V(cEnd[0], 0, cEnd[1]), V(cB[0], 0, cB[1]), CF.W, CF.H, coldM.clone()); sys.add(coldWedge);
      /* 지표 전선 (두꺼운 선) + 기호 */
      const lineMesh = (a, b, col) => { const d = b.clone().sub(a), m = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, d.length(), 10), new THREE.MeshBasicMaterial({ color: col })); m.position.copy(a).addScaledVector(d, 0.5).setY(0.04); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); return m; };
      const wfLine = lineMesh(V(LX, 0, LZ), V(wEnd[0], 0, wEnd[1]), 0xe5484d), cfLine = lineMesh(V(LX, 0, LZ), V(cEnd[0], 0, cEnd[1]), 0x2f6fe0); sys.add(wfLine, cfLine);
      const wsym = [], csym = [];
      for (let i = 0; i < 6; i++) {
        const g = new THREE.Mesh(new THREE.CircleGeometry(0.2, 20, 0, Math.PI), std(0xe5484d, { side: THREE.DoubleSide })); g.rotation.order = 'YXZ'; g.rotation.x = -Math.PI / 2; g.rotation.y = yawW; { const p = PW(LX + 0.7 + i * 0.66, LZ - 0.22); g.position.set(p[0], 0.05, p[1]); } wsym.push(g); sys.add(g);   // 온난 전선: 반원 (진행 쪽)
        const h = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.34, 3), std(0x2f6fe0)); h.quaternion.setFromAxisAngle(V(0, 1, 0), yawC).multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), -Math.PI / 2)); { const p = PC(LX + 0.22, LZ + 0.7 + i * 0.5); h.position.set(p[0], 0.2, p[1]); } csym.push(h); sys.add(h);                              // 한랭 전선: 삼각형
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
      const pW0 = PW(2.8, LZ - 3.0), pC0 = PC(LX - 2.5, 1.8);
      const mvW = mvArrow(V(pW0[0], 0.1, pW0[1]), V(nW[0], 0, nW[1]), 0xe5484d), mvC = mvArrow(V(pC0[0], 0.1, pC0[1]), V(nC[0], 0, nC[1]), 0x2f6fe0);

      /* 이름표 (전선계 위의 점에 붙여요) */
      const anc = (x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); sys.add(o); return o; }, ancP = (p, y) => anc(p[0], y, p[1]);
      const LB = {
        low: label('저기압 중심', anc(LX, 0.4, LZ), { size: 12.5, color: 'rgba(130,90,0,.92)' }),
        wf: label('온난 전선', ancP(PW(3.4, LZ + 0.4), 0.15), { size: 12.5, color: 'rgba(170,30,40,.92)' }), cf: label('한랭 전선', ancP(PC(LX + 0.2, 3.2), 0.15), { size: 12.5, color: 'rgba(30,70,170,.92)' }),
        cold: label('찬 공기', anc(0.8, 0.35, -3.0), { size: 12 }), warm: label('온난 구역', anc(1.2, 0.15, 2.6), { size: 12, color: 'rgba(170,70,20,.92)' }),
        ws: label('완만한 경사 · 층운형 구름 · 넓은 약한 비', ancP(PW(3.0, -2.7), 1.55), { size: 11.5 }), cs: label('급한 경사 · 적운형 구름 · 좁은 소나기', ancP(PC(LX - 1.5, 2.3), 2.1), { size: 11.5 }),
      };

      /* 관측점(서울): 저기압 경로의 남쪽(또는 북쪽) — 2D '전선 통과'와 같아요. 1 km = KS 3D 단위 */
      const KS = 0.0072, OX = 0.8, L2 = () => ctx.lesson();
      const TS = [0, 3, 6, 9, 12, 15, 18, 21, 24];
      const FALL = { south: { p: [1012, 1009, 1006, 1004, 1003, 1002, 1000, 1005, 1010], tp: [7, 7, 7, 9, 14, 15, 15, 8, 6] }, north: { p: [1010, 1007, 1004, 1002, 1001, 1003, 1005, 1007, 1009], tp: [6, 6, 5, 5, 4, 4, 3, 3, 2] } };
      const SERV = (obs) => { const l = L2(); return (l && l.SER && l.SER[obs]) || FALL[obs]; };
      const interp = (arr, h) => { const k = Math.min(7, Math.max(0, Math.floor(h / 3))), u = (h - TS[k]) / 3; return arr[k] + (arr[k + 1] - arr[k]) * Math.max(0, Math.min(1, u)); };
      const OBS_D = (() => { const l = L2(); return l && l.OBS_D ? l.OBS_D : 450 / (Math.sqrt(3) + 0.5); })();
      const T_W = 9, T_C = 18, COT_C = 0.5, VCYC = 50;
      const cxAt = (h) => { const l = L2(); return l && l.cxAt ? l.cxAt(h) : COT_C * OBS_D + VCYC * (h - T_C); };
      const COMPASS = ['북', '북동', '동', '남동', '남', '남서', '서', '북서'];
      const windAt = (obs, h) => obs === 'south' ? (h < T_W ? 135 : h < T_C ? 225 : 315) : (((Math.atan2(-cxAt(h), OBS_D) / DEG + 45) % 360) + 360) % 360;
      const obsG = new THREE.Group(); root.add(obsG);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 10), std(0x7c3aed, { emissive: 0x7c3aed, emissiveIntensity: 0.4 })); pole.position.y = 0.45; obsG.add(pole);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), std(0x7c3aed, { emissive: 0x7c3aed, emissiveIntensity: 0.5 })); ball.position.y = 0.95; obsG.add(ball);
      const ringO = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.03, 8, 32), new THREE.MeshBasicMaterial({ color: 0xc4b5fd })); ringO.rotation.x = Math.PI / 2; ringO.position.y = 0.04; obsG.add(ringO);
      const wm = std(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.5 }), wArrow = new THREE.Group();
      { const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.8, 8), wm), hd = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.3, 12), wm); sh.position.y = 0.4; hd.position.y = 0.95; wArrow.add(sh, hd); }
      wArrow.position.y = 1.35; obsG.add(wArrow);
      const obsLab = label('', obsG, { size: 12.5, color: 'rgba(76,29,149,.95)', offset: [0, 2.0, 0] });
      const trackL = new THREE.Mesh(new THREE.BoxGeometry(14, 0.02, 0.05), new THREE.MeshBasicMaterial({ color: 0xdc2626, transparent: true, opacity: 0.55 })); trackL.position.set(0.8, 0.03, LZ); root.add(trackL);
      const trackLab = label('저기압 중심 경로 →', [5.4, 0.1, LZ], { size: 11.5, color: 'rgba(150,25,25,.9)', offset: [0, 0.1, 0.25] });

      /* 조작 */
      let mode = 'all', showCl = true, H = 12, syncing = false;
      const seg = controls.segment('보기', [{ value: 'all', label: '전체' }, { value: 'warm', label: '온난 전선' }, { value: 'cold', label: '한랭 전선' }], mode, (v) => { mode = v; apply(); });
      const bC = controls.button('구름·비 ✓', () => { showCl = !showCl; bC.classList.toggle('on', showCl); bC.textContent = '구름·비 ' + (showCl ? '✓' : '✕'); apply(); }); bC.classList.add('on');
      const obsNow = () => { const l = L2(); return l && l.S && l.S.obs === 'north' ? 'north' : 'south'; };
      function place(h) {
        H = h; const x = OX + cxAt(h) * KS; sys.position.x = x - LX;
        const obs = obsNow(), sv = SERV(obs), w = windAt(obs, h), to = ((w + 180) % 360) * DEG;
        obsG.position.set(OX, 0, LZ + (obs === 'south' ? 1 : -1) * OBS_D * KS);
        wArrow.quaternion.setFromUnitVectors(V(0, 1, 0), V(Math.sin(to), 0, -Math.cos(to)));
        obsLab.set((obs === 'south' ? '서울(경로 남쪽)' : '관측점(경로 북쪽)') + ' ' + (Math.round(h * 10) / 10).toFixed(1).replace('.0', '') + '시<br>' + COMPASS[Math.round(w / 45) % 8] + '풍 ' + Math.round(w) + '° · ' + Math.round(interp(sv.p, h)) + ' hPa · ' + Math.round(interp(sv.tp, h)) + ' °C');
      }
      /* ▶ 저기압이 서 → 동으로 지나가요 (2D '시각' 슬라이더와 같은 0~24시) */
      const pl = controls.player({
        duration: 14, loop: true, autoplay: false, label: '24시간 재생',
        phases: [[0, '전선 앞(남동풍)'], [T_W / 24, '온난 구역(남서풍)'], [T_C / 24, '한랭 전선 뒤(북서풍)']],
        onFrame(p) {
          place(24 * p);
          const l = L2(), sd = document.getElementById('sTime');
          if (!syncing && l && sd) { sd.value = (Math.round(24 * p * 10) / 10); sd.dispatchEvent(new Event('input', { bubbles: true })); if (l.S) l.S.tv = Math.max(0, Math.min(24, 24 * p)); }
        },
      });
      function apply() {
        const lv = ctx.level, w = mode !== 'cold', c = mode !== 'warm';
        warmWedge.visible = wfLine.visible = w; coldWedge.visible = cfLine.visible = c; wsym.forEach((m) => (m.visible = w)); csym.forEach((m) => (m.visible = c)); mvW.visible = w; mvC.visible = c;
        LB.wf.show(w); LB.cf.show(c); LB.ws.show(mode === 'warm' && showCl); LB.cs.show(mode === 'cold' && showCl); LB.cold.show(mode === 'all'); LB.warm.show(mode === 'all'); LB.low.show(mode === 'all');
        windA.forEach((a) => (a.visible = mode === 'all'));
        rainW.visible = w && showCl; rainC.visible = c && showCl; flowW.visible = w; flowC.visible = c;
        info(lv === 1 ? '<b>전선 통과</b>: 저기압이 서에서 동으로 약 50 km/h로 지나가요. 경로 <b>남쪽</b> 관측점(서울)에서는 온난 전선(9시)과 한랭 전선(18시)이 지나며 풍향이 남동 → 남서 → 북서(시계 방향)로 바뀌고, 한랭 전선 뒤에서 기온이 급강하해요. ▶ 를 눌러 보세요.' :
          mode === 'warm' ? '<b>온난 전선</b>: 따뜻한 공기가 찬 공기 위로 완만하게 올라가요.<br>층운형 구름이 넓게 생기고 약한 비가 오래 와요. 지나가면 기온이 올라가요.' : mode === 'cold' ? '<b>한랭 전선</b>: 찬 공기가 따뜻한 공기를 급하게 밀어 올려요.<br>적운형 구름이 높이 솟고 좁은 지역에 소나기가 와요. 지나가면 기온이 내려가요.' : '<b>중위도 저기압</b>: 중심의 남서쪽에 한랭 전선, 동~남동쪽에 온난 전선, 그 사이가 온난 구역이에요.<br>북반구라서 바람이 <b>반시계 방향</b>으로 중심에 불어 들어와요.');
        obsG.visible = lv === 1; obsLab.show(lv === 1);
      }
      apply();
      { const l = L2(); const h0 = ctx.level === 1 && l && l.S ? l.S.t : 12; syncing = true; pl.set((h0 == null ? 12 : h0) / 24); syncing = false; }
      ctx.onLevel((lv) => { apply(); const l = L2(); syncing = true; pl.set((lv === 1 && l && l.S && l.S.t != null ? l.S.t : 12) / 24); syncing = false; });

      return {
        update(dt, t) {
          { const l = L2(); if (ctx.level === 1 && l && l.S && !pl.playing) { if (Math.abs(l.S.t - 24 * pl.p) > 0.04) { syncing = true; pl.set(l.S.t / 24); syncing = false; } else place(24 * pl.p); } }
          let n = 0;
          const w = mode !== 'cold', c = mode !== 'warm', vis = showCl ? 1 : 0.0001;
          warmCl.forEach((o, i) => { const pp = PW(o.x + 0.05 * Math.sin(t * 0.5 + i), o.z); dm.position.set(pp[0], o.y, pp[1]); const s = o.s * (w ? vis : 0.0001); dm.scale.set(s * 1.4, Math.max(0.00005, s * o.sy * 2.2), s * 1.4); dm.updateMatrix(); clouds.setMatrixAt(n, dm.matrix); cc.setRGB(o.hi ? 1 : 0.86, o.hi ? 1 : 0.88, o.hi ? 1 : 0.92); clouds.setColorAt(n, cc); n++; });
          coldCl.forEach((o, i) => { const pp = PC(o.x, o.z); dm.position.set(pp[0], o.y + 0.04 * Math.sin(t + i), pp[1]); const s = o.s * (c ? vis : 0.0001) * (1 + 0.05 * Math.sin(t * 1.4 + i)); dm.scale.set(s, s, s); dm.updateMatrix(); clouds.setMatrixAt(n, dm.matrix); const g = 0.62 + 0.38 * o.top; cc.setRGB(g, g + 0.02, g + 0.06); clouds.setColorAt(n, cc); n++; });
          clouds.count = n; clouds.instanceMatrix.needsUpdate = true; if (clouds.instanceColor) clouds.instanceColor.needsUpdate = true;
          rwS.forEach((r, i) => { const f = (t * 0.45 + r[2]) % 1, u = -r[1] / 3, top = (-(r[1] + LZ) * 0 + 1) * (-r[1] - 0.6) / WF.W * WF.H + 0.2; { const pp = PW(r[0], r[1]); dm.position.set(pp[0], top * (1 - f) + 0.05, pp[1]); } dm.scale.setScalar(1); dm.updateMatrix(); rainW.setMatrixAt(i, dm.matrix); });
          rainW.instanceMatrix.needsUpdate = true;
          rcS.forEach((r, i) => { const f = (t * 0.95 + r[2]) % 1, top = (LX - r[0]) / CF.W * CF.H + 0.5; { const pp = PC(r[0], r[1]); dm.position.set(pp[0], top * (1 - f) + 0.05, pp[1]); } dm.scale.setScalar(1); dm.updateMatrix(); rainC.setMatrixAt(i, dm.matrix); });
          rainC.instanceMatrix.needsUpdate = true;
          /* 쐐기를 타고 올라가는 따뜻한 공기 */
          for (let i = 0; i < 18; i++) { const u = (i / 18 + t * 0.07) % 1, x = LX + 0.4 + (i * 0.73 % 1) * (WF.x1 - LX - 0.6), zz = LZ + 0.5 - u * (WF.W + 0.5); dm.position.set(x, Math.max(0.08, u * WF.H + 0.1 + (u > 0 ? 0.08 : 0)) + 0.1, zz + (u < 0 ? 0 : 0)); { const zz2 = LZ + 0.9 - u * (WF.W + 0.9), pp = PW(x, zz2); dm.position.set(pp[0], 0.12 + Math.max(0, (LZ - zz2) / WF.W) * WF.H + 0.1, pp[1]); } dm.scale.setScalar(1); dm.updateMatrix(); flowW.setMatrixAt(i, dm.matrix); }
          flowW.instanceMatrix.needsUpdate = true;
          for (let i = 0; i < 18; i++) { const u = (i / 18 + t * 0.1) % 1, z = LZ + 0.5 + ((i * 0.61) % 1) * (CF.z1 - LZ - 0.9); { const pp = PC(LX + 0.7 - u * 0.4, z); dm.position.set(pp[0], 0.1 + u * 2.4, pp[1]); } dm.scale.setScalar(1 - u * 0.3); dm.updateMatrix(); flowC.setMatrixAt(i, dm.matrix); }
          flowC.instanceMatrix.needsUpdate = true;
          windA.forEach((g, i) => { g.position.y = 0.25 + 0.03 * Math.sin(t * 2 + i); });
          { const o = 0.15 * Math.sin(t * 3); mvW.position.set(pW0[0] + nW[0] * o, 0.1, pW0[1] + nW[1] * o); mvC.position.set(pC0[0] + nC[0] * o, 0.1, pC0[1] + nC[1] * o); }
        },
        sync() {},
      };
    },
  });
})();
