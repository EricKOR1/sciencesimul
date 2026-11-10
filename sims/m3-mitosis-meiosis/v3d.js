/* m3-mitosis-meiosis · 3D 염색체와 세포분열
   체세포분열: 염색체 수가 같은 딸세포 2개 (2n=4 → 2n=4).  감수분열: 상동 염색체가 먼저 갈라지고(1분열), 염색 분체가 갈라져(2분열) 염색체 수가 절반인 생식세포 4개 (2n=4 → n=2). */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  /* 2D 차시와 같은 단계 이름 · 설명 (체세포분열 6단계 · 생식세포 형성 9단계) */
  const MITO = [
    ['간기', '분열 전: 염색체가 가늘고 길게 풀려 핵 속에 있어요. (염색체 4개)'],
    ['DNA 복제', 'DNA가 복제되어 염색체가 두 가닥(염색 분체)이 돼요. 염색체 수는 그대로 4개!'],
    ['전기', '염색체가 굵게 뭉치고 핵막이 사라져요. 방추사가 생겨요.'],
    ['중기', '염색체가 각자 세포의 가운데에 늘어서요. (짝짓기 없이!)'],
    ['후기', '방추사가 염색 분체를 양쪽으로 끌어당겨 둘로 나눠요.'],
    ['말기', '핵막이 생기고 세포질이 나뉘어 딸세포 2개! 염색체는 4개씩이에요.'],
  ];
  const MEIO = [
    ['간기', '분열 전: 염색체가 가늘고 길게 풀려 핵 속에 있어요. (염색체 4개)'],
    ['DNA 복제', 'DNA가 복제되어 염색체가 두 가닥이 돼요. 염색체 수는 4개 그대로예요.'],
    ['짝짓기', '핵막이 사라지고 모양·크기가 같은 상동 염색체끼리 짝을 지어요.'],
    ['가운데 배열', '짝지은 상동 염색체가 가운데에 늘어서요. 아래 나누기 단추로 양쪽 극에 보내 보세요!'],
    ['1분열 후기', '1분열: 상동 염색체가 서로 반대쪽으로 갈라져요.'],
    ['1분열 끝', '세포가 2개! 염색체 수가 절반(2개씩)으로 줄었어요.'],
    ['2분열 중기', '2분열: 복제 없이 바로 이어져요. 염색체가 다시 가운데에 늘어서요.'],
    ['2분열 후기', '이번에는 염색 분체가 둘로 나뉘어 양쪽으로 끌려가요.'],
    ['생식세포 4개', '생식세포 4개! 염색체는 2개씩이에요. (모세포의 절반)'],
  ];
  const MAPM = [0, 0, 1, 2, 3, 6], MAPE = [0, 0, 1, 2, 3, 3, 4, 5, 6];       // 2D 단계 → 3D 모형 상태
  const CCOL = [0xf472b6, 0x60a5fa, 0xf472b6, 0x60a5fa];      // 어머니·아버지에게서 온 염색체
  const CLEN = [1.7, 1.7, 1.0, 1.0], YI = [1.25, 1.25, -1.25, -1.25], ZI = [0.8, -0.8, 0.8, -0.8];
  const S0 = [[-0.8, 0.7, 0.5], [0.7, 0.6, -0.4], [-0.6, -0.8, -0.3], [0.8, -0.7, 0.4]], RB = [0.4, -0.9, 1.4, -0.3];
  const LEFT = [true, false, false, true];
  window.SciSim3D.attach({
    host: '.stage-card',
    title: '염색체와 세포분열 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHN ? 17 : 12.5, theta: 0.0, phi: 1.4, min: 6, max: 26, target: [0, 0, 0] },
    autoRotate: 0,
    levels: [2, 3],           // 3단계(생식세포 형성: 상동 염색체 나누기는 3D 막대의 단추로)·4단계(비교표 · 수정)는 3D. 1단계(확대 · 짝 맞추기)·2단계(현미경에서 세포 누르기)는 2D
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3;
      let mode = 'mito', st = 0, s2 = 0, names = true, lastAct = -9, tnow = 0, act = -9, ign = false, sepNow = [false, false], sepSig = '';
      const sm = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.4, metalness: 0 }, o || {}));
      /* 세포막 (최대 4개): 막 + 가장자리 빛 + 세포 속 세포소기관 (막 크기와 함께 움직여요) */
      const cells = [];
      const orgRnd = (() => { let a = 7; return () => { a = (a * 16807) % 2147483647; return a / 2147483647; }; })();
      const mitoG = new THREE.CapsuleGeometry(0.035, 0.07, 4, 8), erG = new THREE.TorusGeometry(0.06, 0.012, 6, 14), ribG = new THREE.SphereGeometry(0.014, 6, 5);
      for (let i = 0; i < 4; i++) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), new THREE.MeshPhysicalMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.16, roughness: 0.08, clearcoat: 1, depthWrite: false })); root.add(m);
        const rim = new THREE.Mesh(new THREE.SphereGeometry(1.025, 40, 28), new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.1, side: THREE.BackSide, depthWrite: false })); m.add(rim);
        const org = new THREE.Group(); m.add(org);
        const mmat = sm(0xfb923c, { roughness: 0.35, emissive: 0xc2410c, emissiveIntensity: 0.25, transparent: true }), emat = sm(0xa78bfa, { roughness: 0.4, transparent: true }), rmat = sm(0x38bdf8, { roughness: 0.4, transparent: true });
        const rib = new THREE.InstancedMesh(ribG, rmat, 70), dd = new THREE.Object3D();
        const dir3 = () => { const u = orgRnd() * 2 - 1, a = orgRnd() * 6.283, r = Math.sqrt(1 - u * u); return new V3(Math.cos(a) * r, u, Math.sin(a) * r); };
        for (let k = 0; k < 70; k++) { dd.position.copy(dir3()).multiplyScalar(0.5 + orgRnd() * 0.4); dd.updateMatrix(); rib.setMatrixAt(k, dd.matrix); }
        org.add(rib);
        for (let k = 0; k < 9; k++) { const mt = new THREE.Mesh(mitoG, mmat); mt.position.copy(dir3()).multiplyScalar(0.55 + orgRnd() * 0.3); mt.rotation.set(orgRnd() * 3, orgRnd() * 3, orgRnd() * 3); org.add(mt); }
        for (let k = 0; k < 6; k++) { const er = new THREE.Mesh(erG, emat); er.position.copy(dir3()).multiplyScalar(0.6 + orgRnd() * 0.25); er.rotation.set(orgRnd() * 3, orgRnd() * 3, 0); er.scale.set(1.2, 1, 1); org.add(er); }
        cells.push({ m, rim, org, mats: [mmat, emat, rmat], x: 0, y: 0, r: 3.3, o: 0, sx: 1, tx: 0, ty: 0, tr: 3.3, to: 0.16, tsx: 1 });
      }
      /* 핵막 */
      const envs = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), sm(0xfde68a, { transparent: true, opacity: 0.0, roughness: 0.2, depthWrite: false })); root.add(m); return { m, x: 0, r: 1.9, o: 0, tx: 0, tr: 1.9, to: 0 }; });
      /* 염색 분체 8개 */
      const chs = [];
      const bandTex = (() => { const c = document.createElement('canvas'); c.width = 8; c.height = 64; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 8, 64); for (let i = 0; i < 9; i++) { x.fillStyle = 'rgba(0,0,0,' + (0.12 + (i % 3) * 0.1) + ')'; x.fillRect(0, 4 + i * 7 + (i % 2) * 2, 8, 3); } return new THREE.CanvasTexture(c); })();
      for (let ci = 0; ci < 4; ci++) for (let j = 0; j < 2; j++) {
        const geo = new THREE.CapsuleGeometry(0.12, CLEN[ci] - 0.24, 6, 16);
        const m = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: CCOL[ci], map: bandTex, roughness: 0.3, clearcoat: 0.6, emissive: CCOL[ci], emissiveIntensity: 0.14 })); root.add(m);
        const cp = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 8), sm(0xffffff, { roughness: 0.5 })); cp.scale.set(1, 0.55, 1); m.add(cp);
        const c = new V3(...S0[ci]); m.position.copy(c);
        chs.push({ m, ci, j, p: c.clone(), rz: RB[ci], th: 0.04, tp: c.clone(), trz: RB[ci], tth: 0.04, pole: null });
      }
      const fibM = new THREE.MeshBasicMaterial({ color: 0xe2e8f0, transparent: true, opacity: 0.55 });
      const fibs = chs.map(() => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 1, 6), fibM); m.visible = false; root.add(m); return m; });
      const cen = [0, 1, 2, 3].map(() => { const g = new THREE.Group(), cm = sm(0xfacc15, { emissive: 0xfacc15, emissiveIntensity: 0.55, roughness: 0.3 }); const a = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.28, 10), cm), b = a.clone(); a.rotation.z = Math.PI / 2; b.position.y = 0.1; g.add(a, b); const halo = new THREE.Mesh(new THREE.SphereGeometry(0.26, 14, 10), new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.18, depthWrite: false })); g.add(halo); g.visible = false; root.add(g); return g; });
      const labChr = label('', chs[0].m, { size: 12, color: 'rgba(190,24,93,.92)', offset: [0.5, 0.85, 0] }), labSp = label('방추사', [0, 2.2, 0], { size: 12, color: 'rgba(51,65,85,.92)' }), labEnv = label('핵막', [0, 0, 0], { size: 12, color: 'rgba(161,98,7,.92)' }), labCell = label('세포막', [3.3, 2.3, 0], { size: 12, color: 'rgba(30,64,175,.9)' });
      const spL = { x: 0, y: 2.4 };
      function setCell(i, x, y, r, o, sx) { const c = cells[i]; c.tx = x; c.ty = y; c.tr = r; c.to = o; c.tsx = sx || 1; }
      function setEnv(i, x, r, o) { const e = envs[i]; e.tx = x; e.tr = r; e.to = o; }
      function target() {
        const mito = mode === 'mito', n = mito ? 6 : 7;
        // 세포막
        for (let i = 0; i < 4; i++) setCell(i, cells[i].tx, cells[i].ty, cells[i].tr, 0, 1);
        if (mito) {
          if (st <= 3) { setCell(0, 0, 0, 3.3, 0.16, st === 3 ? 1.15 : 1); setCell(1, 0, 0, 3.3, 0); }
          else if (st === 4) { setCell(0, -1.2, 0, 3.0, 0.16); setCell(1, 1.2, 0, 3.0, 0.16); }
          else if (st === 5) { setCell(0, -2.0, 0, 2.65, 0.16); setCell(1, 2.0, 0, 2.65, 0.16); }
          else { setCell(0, -2.75, 0, 2.4, 0.16); setCell(1, 2.75, 0, 2.4, 0.16); }
          setCell(2, 0, 0, 2, 0); setCell(3, 0, 0, 2, 0);
        } else {
          if (st <= 3) { setCell(0, 0, 0, 3.3, 0.16, st === 3 ? 1.2 : 1); setCell(1, 0, 0, 3.3, 0); setCell(2, 0, 0, 3.3, 0); setCell(3, 0, 0, 3.3, 0); }
          else if (st <= 5) { setCell(0, -2.7, 0, 2.5, 0.16); setCell(1, 2.7, 0, 2.5, 0.16); setCell(2, -2.7, 0, 2.5, 0); setCell(3, 2.7, 0, 2.5, 0); }
          else { setCell(0, -2.7, 1.95, 1.75, 0.16); setCell(1, 2.7, 1.95, 1.75, 0.16); setCell(2, -2.7, -1.95, 1.75, 0.16); setCell(3, 2.7, -1.95, 1.75, 0.16); }
        }
        // 핵막
        if (st === 0) { setEnv(0, 0, 1.95, 0.22); setEnv(1, 0, 1.95, 0); }
        else if (mito && st >= 4) { setEnv(0, -2.7, 1.3, st === 4 ? 0.18 : 0.22); setEnv(1, 2.7, 1.3, st === 4 ? 0.18 : 0.22); }
        else { setEnv(0, 0, 2.2, 0); setEnv(1, 0, 2.2, 0); }
        // 염색체
        chs.forEach((q) => {
          const ci = q.ci, j = q.j, s = j ? 1 : -1, X = 0.28 * s; let p, rz, th = 0.1, pole = null;
          if (mito) {
            if (st === 0) { p = new V3(...S0[ci]).add(new V3(0.07 * s, 0.05 * s, 0)); rz = RB[ci] + 0.12 * s; th = 0.04; }
            else if (st === 1) { p = new V3(...S0[ci]).multiplyScalar(1.7); rz = RB[ci] + X; }
            else if (st === 2) { p = new V3(0, YI[ci], ZI[ci]); rz = X; pole = new V3(3.6 * s, 0, 0); }
            else if (st === 3) { p = new V3(1.9 * s, YI[ci], ZI[ci]); rz = 0; pole = new V3(3.6 * s, 0, 0); }
            else if (st === 4) { p = new V3(2.7 * s, YI[ci] * 0.55, ZI[ci] * 0.55); rz = 0; th = 0.07; pole = new V3(3.6 * s, 0, 0); }
            else if (st === 5) { p = new V3(2.75 * s, YI[ci] * 0.5, ZI[ci] * 0.5); rz = 0; th = 0.06; }
            else { p = new V3(2.75 * s, YI[ci] * 0.5, ZI[ci] * 0.5); rz = 0; th = 0.045; }
          } else {
            const gl = LEFT[ci], cx = gl ? -2.6 : 2.6, lx = (ci < 2 ? -0.95 : 0.95);
            if (st === 0) { p = new V3(...S0[ci]).add(new V3(0.07 * s, 0.05 * s, 0)); rz = RB[ci] + 0.12 * s; th = 0.04; }
            else if (st === 1 || st === 2) { p = new V3(ci % 2 ? 0.3 : -0.3, YI[ci], 0); rz = X; if (st === 2) pole = new V3(gl ? -3.6 : 3.6, 0, 0); }
            else if (st === 3 || (st === 2 && sepNow[ci >> 1])) { p = new V3(gl ? -2.2 : 2.2, YI[ci], 0); rz = X; pole = new V3(gl ? -3.6 : 3.6, 0, 0); }
            else if (st === 4) { p = new V3(cx + lx, 0, 0); rz = Math.PI / 2 + X; pole = new V3(cx, 2.3 * s, 0); th = 0.1; }
            else if (st === 5) { p = new V3(cx + lx, 1.45 * s, 0); rz = Math.PI / 2; pole = new V3(cx, 2.3 * s, 0); }
            else { p = new V3(cx + (ci < 2 ? -0.5 : 0.5), 1.95 * s, 0); rz = 0; th = 0.08; }
          }
          q.tp = p; q.trz = rz; q.tth = th; q.pole = pole;
        });
        const stages = mito ? MITO : MEIO;
        info('<b>' + (mito ? '체세포분열' : '생식세포 형성') + ' · ' + stages[s2][0] + '</b><br>' + stages[s2][1] + '<br><span style="opacity:.85">분홍·파랑: 어머니·아버지에게서 받은 염색체</span>');
        labChr.set(st === 0 ? '염색체(가는 실)' : st >= (mito ? 3 : 4) && st < 6 && !(mito && st >= 5) ? '염색 분체' : mito ? '염색체' : st === 1 || st === 2 ? '2가 염색체' : '염색체');
        labChr.show(names); labSp.show(names && chs.some((q) => q.pole)); labEnv.show(names && envs.some((e) => e.to > 0)); labCell.show(names);
        labEnv.obj = [envs[0].tx, envs[0].tr * 0.9, 0];
        labSp.obj = mito ? [0, 2.4, 0] : (st >= 4 ? [-2.7, 2.7, 0] : [0, 2.4, 0]);
        labCell.obj = [cells[0].tx - cells[0].tr * 0.72, cells[0].ty + cells[0].tr * 0.72, 0];
      }
      const nb0 = null;
      const nb = controls.button('이름 ✓', () => { names = !names; nb.textContent = '이름 ' + (names ? '✓' : '✕'); target(); }); nb.classList.add('on');
      const pM = controls.player({ duration: 12, loop: true, label: '체세포분열', phases: MITO.map((q, i) => [i / MITO.length, q[0]]), onFrame() { if (!ign) act = tnow; } });
      const pE = controls.player({ duration: 16, loop: true, label: '생식세포 형성', phases: MEIO.map((q, i) => [i / MEIO.length, q[0]]), onFrame() { if (!ign) act = tnow; } });
      const rows = Array.from(nb.parentNode.querySelectorAll('.v3-player')), rowM = rows[0], rowE = rows[1];
      /* 가운데 배열(생식세포 형성 4/9): 2D에서 상동 염색체 쌍을 눌러 나누기(meioSplit)와 같아요 */
      const n0 = nb.parentNode.children.length;
      controls.text('<b>상동 염색체</b>');
      const spBtns = [['긴 쌍 나누기', 0], ['짧은 쌍 나누기', 1]].map(([tx, pr]) => controls.button(tx, () => { const L = ctx.lesson(); if (L && L.meioSplit) L.meioSplit(pr); }));
      const splitRow = Array.from(nb.parentNode.children).slice(n0);
      const plOf = () => (mode === 'mito' ? pM : pE);
      function setMode2(m) { mode = m; rowM.style.display = m === 'mito' ? '' : 'none'; rowE.style.display = m === 'meio' ? '' : 'none'; }
      setMode2('mito'); target();
      // 처음 모습으로
      chs.forEach((q) => { q.p.copy(q.tp); q.rz = q.trz; q.th = q.tth; }); cells.forEach((c) => { c.x = c.tx; c.y = c.ty; c.r = c.tr; c.o = c.to; });

      /* ===== 확대(zoom) · 수정(fert) 장면 — 2D와 같은 상태를 따라가요 ===== */
      const chromG = new THREE.Group(); Array.from(root.children).forEach((o) => chromG.add(o)); root.add(chromG);
      /* 배경: 현미경 시야처럼 은은한 그라데이션과 떠다니는 세포 속 알갱이 */
      const bgc = document.createElement('canvas'); bgc.width = 4; bgc.height = 256; { const x = bgc.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#0e2a4a'); g.addColorStop(0.5, '#1b4a6b'); g.addColorStop(1, '#0a1a30'); x.fillStyle = g; x.fillRect(0, 0, 4, 256); }
      const bgs = new THREE.Mesh(new THREE.SphereGeometry(32, 24, 16), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(bgc), side: THREE.BackSide, depthWrite: false })); bgs.renderOrder = -10; root.add(bgs);
      const dust = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.28, depthWrite: false }), 90), dseed = []; dust.userData.v3bg = true;   // 떠다니는 알갱이는 배경 (세포막은 불투명도 0.16으로 자동 맞춤에 들어가요)
      { const d0 = new THREE.Object3D(); for (let i = 0; i < 90; i++) { const a = orgRnd() * 6.283, u = orgRnd() * 2 - 1, r = 7 + orgRnd() * 8, q = Math.sqrt(1 - u * u); dseed.push([Math.cos(a) * q * r, u * r * 0.7, Math.sin(a) * q * r - 2, 0.5 + orgRnd()]); d0.position.set(dseed[i][0], dseed[i][1], dseed[i][2]); d0.scale.setScalar(dseed[i][3]); d0.updateMatrix(); dust.setMatrixAt(i, d0.matrix); } }
      root.add(dust);
      const chromLabs = [labChr, labSp, labEnv, labCell];
      const MM = (c, o0, ex) => { const m = sm(c, Object.assign({ transparent: true, opacity: o0, depthWrite: o0 > 0.7 }, ex || {})); m.userData.o0 = o0; return m; };
      const fadeG = (g, a) => { g.visible = a > 0.015; g.traverse((m) => { if (m.material && m.material.userData && m.material.userData.o0 != null) m.material.opacity = m.material.userData.o0 * a; }); };
      /* -- 확대: 세포 → 핵 → 염색체 → DNA → 유전자 -- */
      const zoomG = new THREE.Group(); root.add(zoomG); zoomG.visible = false;
      const LVN = ['세포', '핵', '염색체', 'DNA', '유전자'];
      const LVD = ['세포 속에는 유전 물질이 들어 있는 핵이 있어요.', '핵 속에는 염색체가 들어 있어요. 사람의 체세포에는 46개가 있어요.', '염색체는 DNA와 단백질로 이루어져 있어요.', 'DNA는 이중 나선 구조예요. 단백질에 감겨 염색체를 이루어요.', '유전자는 유전 정보를 담고 있는 DNA의 특정 부분이에요.'];
      const zl = [0, 1, 2, 3, 4].map(() => { const g = new THREE.Group(); zoomG.add(g); return g; });
      const anc = (g, p) => { const o = new THREE.Object3D(); o.position.set(p[0], p[1], p[2]); g.add(o); return o; };
      { /* 0 세포 */
        const cell = new THREE.Mesh(new THREE.SphereGeometry(2.7, 40, 28), MM(0x93c5fd, 0.22, { roughness: 0.1, depthWrite: false })); zl[0].add(cell);
        const nuc = new THREE.Mesh(new THREE.SphereGeometry(1.0, 32, 24), MM(0xfde68a, 0.55, { roughness: 0.2, depthWrite: false })); nuc.position.set(0.3, 0.1, 0); zl[0].add(nuc);
        const nl = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 14), MM(0xd97706, 0.95)); nl.position.set(0.1, 0.0, 0.1); nuc.add(nl); nl.scale.setScalar(1);
        for (let i = 0; i < 5; i++) { const pts = []; for (let j = 0; j < 14; j++) { const u = j / 13 * 6; pts.push(new V3(Math.cos(u + i) * 0.5 + Math.sin(u * 1.7 + i * 2) * 0.15, Math.sin(u * 1.3 + i) * 0.5, Math.sin(u + i * 1.3) * 0.5)); } nuc.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.04, 6), MM(i % 2 ? 0x60a5fa : 0xf472b6, 0.9))); }
        for (let i = 0; i < 26; i++) { const u = (i + 0.5) / 26 * 2 - 1, a2 = i * 2.4, r = Math.sqrt(1 - u * u); const pr = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.018, 6, 12), MM(0xb45309, 0.9)); pr.position.set(Math.cos(a2) * r, u, Math.sin(a2) * r); pr.lookAt(pr.position.clone().multiplyScalar(2)); nuc.add(pr); }
        [[-1.5, 0.9, 0.5], [1.7, -1.1, 0.6], [-0.9, -1.5, -0.8], [1.2, 1.4, -0.7], [-1.9, -0.3, -0.6], [0.6, -1.8, 0.4]].forEach((p, i) => { const g = new THREE.Group(); g.position.set(...p); g.rotation.z = 0.8 * i; const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.34, 6, 14), MM(0xfb923c, 0.92, { roughness: 0.35 })); g.add(m); const cr = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.015, 6, 12), MM(0xc2410c, 0.9)); cr.rotation.y = 1.5; g.add(cr); zl[0].add(g); });
        for (let i = 0; i < 4; i++) { const g = new THREE.Mesh(new THREE.TorusGeometry(0.55 + i * 0.07, 0.03, 6, 28, 3.6), MM(0xa78bfa, 0.8)); g.position.set(-0.4, -0.4, -1.3 + i * 0.05); g.rotation.set(0.3, 0.2, 3.8); zl[0].add(g); }
        const rb = new THREE.InstancedMesh(new THREE.SphereGeometry(0.04, 6, 5), MM(0x38bdf8, 0.9), 90), rd = new THREE.Object3D();
        for (let i = 0; i < 90; i++) { const u = Math.sin(i * 12.9) * 0.5 + 0.5, v2 = Math.sin(i * 78.2) * 0.5 + 0.5, w = Math.sin(i * 3.7) * 0.5 + 0.5, a2 = u * 6.283, z = v2 * 2 - 1, rr = Math.sqrt(1 - z * z) * (1.5 + w * 0.9); rd.position.set(Math.cos(a2) * rr, z * (1.5 + w * 0.9), Math.sin(a2) * rr); rd.updateMatrix(); rb.setMatrixAt(i, rd.matrix); }
        zl[0].add(rb);
        zl[0].userData.labs = [label('세포', anc(zl[0], [-2.3, 2.1, 0]), { size: 13, color: 'rgba(30,64,175,.92)' }), label('핵', anc(zl[0], [0.3, 1.45, 0]), { size: 13, color: 'rgba(161,98,7,.92)' })];
      }
      { /* 1 핵 속 염색체 */
        zl[1].add(new THREE.Mesh(new THREE.SphereGeometry(2.6, 40, 28), MM(0xfde68a, 0.2, { roughness: 0.1, depthWrite: false })));
        for (let i = 0; i < 8; i++) {
          const pts = []; let a = i * 1.7, b = i * 0.9; const c0 = new V3(Math.cos(a) * 1.0, Math.sin(b * 2) * 1.0, Math.sin(a) * 1.0);
          for (let j = 0; j < 22; j++) { const u = j / 21 * 6.28 * 1.5; pts.push(c0.clone().add(new V3(Math.cos(u * 2 + i) * 0.55, Math.sin(u * 3 + i * 2) * 0.5, Math.sin(u * 2.3 + i) * 0.5))); }
          zl[1].add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.1, 8), MM(i % 2 ? 0x60a5fa : 0xf472b6, 0.95)));
        }
        zl[1].userData.labs = [label('염색체 (사람 46개)', anc(zl[1], [0, 2.9, 0]), { size: 13, color: 'rgba(190,24,93,.92)' })];
      }
      { /* 2 염색체 = DNA + 단백질 */
        [-1, 1].forEach((sg) => { const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 4.2, 8, 20), MM(sg > 0 ? 0xf472b6 : 0xec4899, 0.95)); arm.rotation.z = Math.PI / 2 + sg * 0.5 + Math.PI / 2; zl[2].add(arm); });
        const beads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 10, 8), MM(0xffffff, 0.9), 60), d = new THREE.Object3D();
        for (let i = 0; i < 60; i++) { const ang = (i % 2 ? 1 : -1) * 0.5, sd = (i >> 1) / 29 - 0.5, sx2 = Math.sin(ang) * sd * 4.6, sy2 = Math.cos(ang) * sd * 4.6, px = Math.cos(ang) * 0.43; d.position.set(sx2 + px * (i % 4 < 2 ? 1 : -1) * 0.2, sy2, 0.43 * (i % 3 === 0 ? 0.9 : 0.6)); d.updateMatrix(); beads.setMatrixAt(i, d.matrix); }
        zl[2].add(beads);
        zl[2].userData.labs = [label('염색체 = DNA + 단백질', anc(zl[2], [0, 2.8, 0]), { size: 13, color: 'rgba(190,24,93,.92)' })];
      }
      const helixPts = (x0, x1, amp, wl, ph, sg) => { const pts = [], n = Math.round((x1 - x0) * 12); for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, a = (x - x0) / wl * Math.PI * 2 + ph; pts.push(new V3(x, sg * amp * Math.sin(a), sg * amp * Math.cos(a))); } return pts; };
      const GC = [0x2563eb, 0xf59e0b, 0x10b981, 0xec4899], GR = [[-3.4, -1.9], [-1.5, -0.3], [0.1, 1.4], [1.7, 3.4]];
      function mkHelix(g, genes) {
        const XA = -3.5, XB = 3.5, amp = 0.65, wl = 2.4;
        [1, -1].forEach((sg) => g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helixPts(XA, XB, amp, wl, 0, sg)), 160, 0.09, 8), MM(sg > 0 ? 0x38bdf8 : 0xa78bfa, 0.95))));
        const rungs = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 6), MM(0xcbd5e1, 0.9), 36), d = new THREE.Object3D(), up2 = new V3(0, 1, 0);
        for (let i = 0; i < 36; i++) { const x = XA + 0.25 + i * (XB - XA - 0.4) / 35, a = (x - XA) / wl * Math.PI * 2; d.position.set(x, 0, 0); d.scale.set(1, 2 * amp * Math.hypot(Math.sin(a), Math.cos(a)), 1); d.quaternion.setFromUnitVectors(up2, new V3(0, Math.sin(a), Math.cos(a)).normalize()); d.updateMatrix(); rungs.setMatrixAt(i, d.matrix); }
        g.add(rungs);
        if (genes) GR.forEach((r, i) => [1, -1].forEach((sg) => { const seg = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helixPts(r[0], r[1], amp, wl, 0, sg).map((p) => p.clone())), 60, 0.16, 8), MM(GC[i], 0.97)); g.add(seg); }));
      }
      mkHelix(zl[3], false); mkHelix(zl[4], true);
      zl[3].userData.labs = [label('DNA (이중 나선)', anc(zl[3], [0, 1.6, 0]), { size: 13, color: 'rgba(3,105,161,.92)' })];
      zl[4].userData.labs = GR.map((r, i) => label('유전자 ' + '①②③④'[i], anc(zl[4], [(r[0] + r[1]) / 2, -1.25, 0]), { size: 12, color: ['#2563eb', '#d97706', '#059669', '#db2777'][i] }));
      zl.forEach((g) => g.userData.labs.forEach((l) => l.show(false)));
      /* -- 수정: 정자 + 난자 → 수정란 (2D의 시간표와 같아요) -- */
      const fertG = new THREE.Group(); root.add(fertG); fertG.visible = false;
      const EGGp = { x: 440, y: 292 }, U55 = 55, f3 = (px, py) => new V3((px - 440) / U55, -(py - 292) / U55, 0);
      const eggM = new THREE.Mesh(new THREE.SphereGeometry(2.4, 40, 28), MM(0xf9a8d4, 0.4, { roughness: 0.2, depthWrite: false })); fertG.add(eggM);
      const eggNuc = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), MM(0xe9b3ee, 0.75, { depthWrite: false })); fertG.add(eggNuc);
      const spHead = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), MM(0x60a5fa, 0.85)); fertG.add(spHead);
      const zNuc = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), MM(0xc4b5fd, 0.8, { depthWrite: false })); fertG.add(zNuc);
      const tailI = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 8, 6), MM(0x2563eb, 0.9), 30); fertG.add(tailI);
      const rodG = new THREE.CapsuleGeometry(0.035, 0.12, 3, 6);
      const rodsE = new THREE.InstancedMesh(rodG, sm(0xffffff, { roughness: 0.4 }), 46), rodsS = new THREE.InstancedMesh(rodG, sm(0xffffff, { roughness: 0.4 }), 46), rodsZ = new THREE.InstancedMesh(rodG, sm(0xffffff, { roughness: 0.4 }), 92);
      fertG.add(rodsE, rodsS, rodsZ);
      const FTc = [0x1d4ed8, 0x2563eb, 0x60a5fa], MTc = [0xbe185d, 0xdb2777, 0xf472b6];
      [[rodsE, MTc, 0], [rodsS, FTc, 0], [rodsZ, null, 0]].forEach(([m, tn]) => { for (let i = 0; i < m.count; i++) m.setColorAt(i, new THREE.Color(tn ? tn[i % 3] : (i < 46 ? FTc[i % 3] : MTc[i % 3]))); m.instanceColor.needsUpdate = true; });
      const fib = (i, n) => { const y = 1 - (i + 0.5) / n * 2, r = Math.sqrt(Math.max(0, 1 - y * y)), a = i * 2.39996; return new V3(Math.cos(a) * r, y, Math.sin(a) * r).multiplyScalar(Math.cbrt((i % 7 + 1) / 7) * 0.5 + 0.45); };
      const fe = new THREE.Object3D();
      function putRods(m, cx, cy, R, n, sc, a) { for (let i = 0; i < m.count; i++) { if (i < n && a > 0.02) { const p = fib(i, n); fe.position.set(cx + p.x * R * 0.82, cy + p.y * R * 0.82, p.z * R * 0.82); fe.rotation.set(i * 1.3, i * 0.7, i * 2.1); fe.scale.setScalar(sc * a); } else { fe.position.set(0, 0, 0); fe.scale.setScalar(0.0001); } fe.updateMatrix(); m.setMatrixAt(i, fe.matrix); } m.instanceMatrix.needsUpdate = true; }
      const labEgg = label('', [0, 3.0, 0], { size: 13, color: 'rgba(190,24,93,.92)' }), labSpm = label('', [-4, 1.4, 0], { size: 13, color: 'rgba(37,99,235,.92)' }), labRes = label('', [0, -3.1, 0], { size: 14, color: 'rgba(20,83,45,.92)' });
      [labEgg, labSpm, labRes].forEach((l) => l.show(false));
      const clamp01 = (x) => Math.max(0, Math.min(1, x)), sm3 = (x) => x * x * (3 - 2 * x);
      let feSig = '', zoomLast = -1, zScene = '', fertDrive = -9, fertAct = -9, ignF = false;
      let ignZ = false;
      const pZoom = controls.player({ duration: 10, loop: false, label: '확대', phases: LVN.map((q, i) => [i / 5, q]), onFrame(p) { const L = ctx.lesson(); if (!L || !L.zs || ignZ) return; const k = Math.min(4, Math.floor(p * 5 + 1e-6)); if (L.zs.lv !== k) L.zoomTo(k); } });
      const pFert = controls.player({ duration: 6.6, loop: true, label: '수정', phases: [[0, '정자 출발'], [0.36, '난자에 들어가요'], [0.53, '핵이 다가가요'], [0.73, '두 핵이 합쳐져요'], [0.95, '수정란']], onFrame() { if (!ignF) fertAct = tnow; } });
      const hostC = nb.parentNode, gbtn = controls.segment('정자·난자', [{ value: 'meio', label: '생식세포 형성으로' }, { value: 'mito', label: '체세포분열로' }], 'meio', (v) => { const L = ctx.lesson(); if (L && L.setGamete) L.setGamete(v); });
      const cmpSeg = controls.segment('보기', [{ value: 'mito', label: '체세포분열' }, { value: 'meio', label: '생식세포 형성' }], 'mito', (v) => { cmpMode = v; });
      let cmpMode = 'mito';
      const kids = Array.from(hostC.children); const idx = (e) => kids.indexOf(e);
      const rowsAll = Array.from(hostC.querySelectorAll('.v3-player')), rowZoom = rowsAll[2], rowFert = rowsAll[3];
      const segEls = Array.from(hostC.children).filter((e) => !e.classList.contains('v3-player') && e !== nb);
      // 정자·난자 / 보기 버튼 묶음 (라벨 span + 버튼들)을 구분해서 숨김 처리해요
      const gIdx = Array.from(hostC.children).findIndex((e) => e.textContent === '정자·난자'), cIdx = Array.from(hostC.children).findIndex((e) => e.textContent === '보기');
      const gEls = Array.from(hostC.children).slice(gIdx, gIdx + 3), cEls = Array.from(hostC.children).slice(cIdx, cIdx + 3);
      const showEls = (els, v) => els.forEach((e) => { e.style.display = v ? '' : 'none'; });
      showEls(gEls, false); showEls(cEls, false); rowZoom.style.display = 'none'; rowFert.style.display = 'none';
      let vscene = 'mito';
      function setVScene(v, L) {
        vscene = v; const zoom = v === 'zoom', fert = v === 'fert';
        chromG.visible = !zoom && !fert; zoomG.visible = zoom; fertG.visible = fert;
        rowZoom.style.display = zoom ? '' : 'none'; rowFert.style.display = fert ? '' : 'none'; showEls(gEls, fert); showEls(cEls, v === 'compare');
        rowM.style.display = rowE.style.display = 'none'; nb.style.display = (zoom || fert) ? 'none' : '';
        chromLabs.forEach((l) => l.show(false)); if (!zoom) zl.forEach((g) => g.userData.labs.forEach((l) => l.show(false)));
        [labEgg, labSpm, labRes].forEach((l) => l.show(fert)); feSig = '';
        if (!zoom && !fert) { setMode2(mode); target(); }
        zoomLast = -1;
      }

      const seg = new V3(), dir = new V3(), up = new V3(0, 1, 0);
      const clampF = (x) => x;

      function zoomFrame(L, t) {
        const zs = L.zs, zv = zs.zv.value, lv = zs.lv;
        zl.forEach((g, k) => { const a = Math.max(0, 1 - Math.abs(zv - k) * 1.25), s = Math.exp(0.95 * (zv - k)); g.scale.setScalar(s); g.rotation.y = Math.sin(t * 0.4) * 0.3; fadeG(g, a); g.userData.labs.forEach((l) => l.show(a > 0.55 && Math.abs(zv - k) < 0.45)); });
        if (lv !== zoomLast) { zoomLast = lv; info('<b>' + LVN[lv] + '</b> (' + (lv + 1) + '/5)<br>' + LVD[lv]); }
        if (!pZoom.playing) { ignZ = true; pZoom.set((lv + 0.5) / 5); ignZ = false; }
      }
      function fertFrame(L, dt, t) {
        const FE = L.FE; gbtn.set(FE.mode); const N = FE.mode === 'meio' ? 23 : 46, tt = FE.run ? FE.t : (FE.done ? 7 : 0);
        const swimP = FE.run || FE.done ? sm3(clamp01(tt / 2.4)) : 0, enterP = sm3(clamp01((tt - 2.4) / 1.0)), apprP = sm3(clamp01((tt - 3.5) / 1.3)), fuseP = sm3(clamp01((tt - 4.8) / 1.3));
        const SP0 = { x: 100, y: 396 }, SP1 = { x: 312, y: 302 };
        let hx = SP0.x + (SP1.x - SP0.x) * swimP, hy = SP0.y + (SP1.y - SP0.y) * swimP + (FE.run || FE.done ? Math.sin(swimP * 9 + t * 2) * 16 * (1 - swimP) : 0);
        if (!FE.run && !FE.done) { hx = SP0.x + Math.sin(t * 1.6) * 5; hy = SP0.y + Math.cos(t * 1.3) * 4; }
        hx += enterP * 66; hy += -(SP1.y - 292) * enterP;
        const sx = hx + (440 - hx) * apprP, sy = hy + (292 - hy) * apprP, sA = 1 - fuseP, eA = 1 - fuseP;
        const nr = apprP, rx = (32 + 4 * nr) / U55, ry = (21 + 15 * nr) / U55, hp = f3(sx, sy);
        spHead.position.copy(hp); spHead.scale.set(rx, ry, Math.min(rx, ry)); spHead.visible = sA > 0.02; spHead.material.opacity = 0.85 * sA;
        const tailA = 1 - clamp01(enterP * 1.6), wob = (FE.run ? 14 : 5) / U55;
        for (let i = 0; i < 30; i++) { fe.position.set(hp.x - rx * 0.9 - i * 0.1, hp.y + Math.sin(i * 0.5 * 1.1 - t * (FE.run ? 15 : 6)) * wob * (i / 30) * (1 - 0.8 * enterP), 0); fe.scale.setScalar(Math.max(0.0001, tailA * sA * (1 - i * 0.02))); fe.rotation.set(0, 0, 0); fe.updateMatrix(); tailI.setMatrixAt(i, fe.matrix); } tailI.instanceMatrix.needsUpdate = true;
        eggNuc.position.set(0, 0, 0); eggNuc.scale.setScalar(54 / U55); eggNuc.visible = eA > 0.02; eggNuc.material.opacity = 0.75 * eA;
        putRods(rodsE, 0, 0, 54 / U55, N, 1, eA); putRods(rodsS, hp.x, hp.y, Math.min(rx, ry) * 1.15, N, 0.9 + 0.2 * nr, sA);
        const rz = (N === 23 ? 66 : 80) * (0.7 + 0.3 * fuseP) / U55;
        zNuc.scale.setScalar(rz); zNuc.visible = fuseP > 0.02; zNuc.material.opacity = 0.8 * fuseP;
        putRods(rodsZ, 0, 0, rz * 0.98, 2 * N, 0.85, fuseP);
        eggM.rotation.y = t * 0.1;
        labEgg.set('난자 (어머니) · 염색체 ' + N + '개'); labEgg.obj = [0, 3.0, 0];
        labSpm.set('정자 (아버지) · 염색체 ' + N + '개'); labSpm.obj = [Math.min(hp.x, -1.2), hp.y + 0.8, 0]; labSpm.show(sA > 0.3 && tt < 3.6);
        const key = FE.mode + '|' + (FE.done ? 1 : FE.run ? (tt > 4.8 ? 3 : 2) : 0);
        if (FE.done) { const ok = FE.mode === 'meio'; labRes.set(N + ' + ' + N + ' = ' + 2 * N); labRes.el.style.background = ok ? 'rgba(20,83,45,.92)' : 'rgba(185,28,28,.92)'; labRes.show(true); } else labRes.show(false);
        if (key !== feSig) { feSig = key; info(FE.done ? (FE.mode === 'meio' ? '<b>수정란의 염색체 수 46개</b>: 부모와 같아요!<br>생식세포 형성으로 염색체 수가 절반(23개)이 되었기 때문이에요.' : '<b>체세포분열로 만들었다면 92개!</b><br>세대마다 염색체 수가 2배가 돼요.') : FE.run ? (tt > 4.8 ? '두 핵이 하나로 합쳐져요.' : '정자가 난자 속으로 들어가요.') : (FE.mode === 'meio' ? '<b>생식세포 형성</b>으로 만든 정자와 난자예요. 염색체는 각각 23개예요.<br><small>(작은 막대 = 염색체)</small>' : '⚠ 가정: 정자와 난자를 <b>체세포분열</b>로 만들었다면? 염색체가 각각 46개예요.')); }
        const driving = tnow - fertAct < 1.2;
        if (driving && pFert.playing) { if (!FE.run && !FE.done && pFert.p > 0.03 && tnow - fertDrive > 1.0) { fertDrive = tnow; L.startFert(); } else if (FE.done && pFert.p < 0.04 && tnow - fertDrive > 1.0) { fertDrive = tnow; L.startFert(); } }
        else if (!driving && !pFert.playing) { const want = FE.done ? 1 : clamp01(tt / 6.6); if (Math.abs(pFert.p - want) > 0.02) { ignF = true; pFert.set(want); ignF = false; } }
      }
      return {
        update(dt, t) {
          dust.rotation.y = t * 0.012; dust.position.y = Math.sin(t * 0.2) * 0.25;
          const k = 1 - Math.exp(-dt * 4.2), mito = mode === 'mito'; tnow += dt;
          const L = ctx.lesson();
          if (L && L.S) {
            const sc0 = L.S.scene, vs = sc0 === 'zoom' ? 'zoom' : sc0 === 'fert' ? 'fert' : sc0 === 'compare' ? 'compare' : sc0 === 'pair' ? 'pair' : sc0 === 'micro' ? 'micro' : sc0;
            if (vs !== vscene) { setVScene(vs, L); st = -1; }
            if (vscene === 'zoom') { zoomFrame(L, t); return; }
            if (vscene === 'fert') { fertFrame(L, dt, t); return; }
            const sm0 = sc0 === 'meio' ? 'meio' : sc0 === 'mito' ? 'mito' : sc0 === 'pair' ? 'meio' : sc0 === 'micro' ? 'mito' : sc0 === 'compare' ? cmpMode : mode;
            if (sm0 !== mode) { setMode2(sm0); st = -1; }
            if (sc0 === 'pair' || sc0 === 'micro' || sc0 === 'compare') { rowM.style.display = rowE.style.display = 'none'; }
            const m = sm0 === 'meio' ? L.meio : L.mito, N = sm0 === 'meio' ? 9 : 6, pl = plOf(), cmp = sc0 === 'compare', stage = cmp ? N - 1 : m.stage;   // 비교하기: 두 분열이 끝난 모습
            const showSplit = sc0 === 'meio' && m.stage === 3 && !(m.sep[0] && m.sep[1]);
            splitRow.forEach((e) => { e.style.display = showSplit ? '' : 'none'; });
            if (showSplit) spBtns.forEach((b, i) => { b.disabled = !!m.sep[i]; b.classList.toggle('on', !!m.sep[i]); });
            const sg = sm0 === 'meio' && sc0 === 'meio' ? m.sep.join() : ''; if (sg !== sepSig) { sepSig = sg; sepNow = sg ? m.sep.slice() : [false, false]; st = -1; }
            // ▶ / 진행 막대 → 2D 단계 (2D의 규칙대로 한 단계씩), 2D에서 단계가 바뀌면 진행 막대가 따라가요
            const want = Math.min(N - 1, Math.floor(pl.p * N + 1e-6)), driving = tnow - act < 1.2;
            if (cmp) { /* 비교하기에서는 진행하지 않아요 */ }
            else if (driving && want !== stage && tnow - lastAct > 0.6) {
              lastAct = tnow;
              if (want > stage) { L.nextStage(m); if (m.stage === stage && pl.playing) { pl.pause(); ign = true; pl.set((stage + 0.5) / N); ign = false; } } else L.goStage(m, want);
            } else if (!driving && !pl.playing && m.stage !== Math.floor(pl.p * N + 1e-6)) { ign = true; pl.set((m.stage + 0.5) / N); ign = false; }
            const ns = sc0 === 'pair' ? MAPE[2] : (sm0 === 'meio' ? MAPE : MAPM)[stage];
            if (ns !== st || stage !== s2) { st = ns; s2 = sc0 === 'pair' ? 2 : stage; target(); if (sc0 === 'pair') info('<b>상동 염색체</b>: 모양·크기가 같은 염색체끼리 짝을 이뤄요. (분홍=어머니, 파랑=아버지)'); else if (sc0 === 'micro') info('<b>체세포분열</b>: 분열 단계마다 염색체가 어떻게 보이는지 살펴봐요.'); else if (sc0 === 'compare') info('<b>두 분열이 끝난 모습</b>: ' + (sm0 === 'mito' ? '체세포분열 → 딸세포 2개 · 염색체 4개씩' : '생식세포 형성 → 생식세포 4개 · 염색체 2개씩') + '<br>아래 보기 단추로 두 분열을 번갈아 보며 비교해요.'); }
          }
          chs.forEach((q) => {
            q.p.lerp(q.tp, k); q.rz += (q.trz - q.rz) * k; q.th += (q.tth - q.th) * k;
            q.m.position.copy(q.p); q.m.rotation.z = q.rz; q.m.scale.set(q.th / 0.12, 1, q.th / 0.12);
          });
          cells.forEach((c) => { c.x += (c.tx - c.x) * k; c.y += (c.ty - c.y) * k; c.r += (c.tr - c.r) * k; c.o += (c.to - c.o) * k; c.sx += (c.tsx - c.sx) * k; c.m.position.set(c.x, c.y, 0); c.m.scale.set(c.r * c.sx, c.r, c.r); c.m.material.opacity = Math.max(0, c.o); c.m.visible = c.o > 0.005; const oa = Math.min(1, c.o / 0.14); c.rim.material.opacity = 0.1 * oa; c.mats.forEach((q) => { q.opacity = 0.9 * oa; }); c.org.visible = oa > 0.02; });
          envs.forEach((e) => { e.x += (e.tx - e.x) * k; e.r += (e.tr - e.r) * k; e.o += (e.to - e.o) * k; e.m.position.set(e.x, 0, 0); e.m.scale.setScalar(e.r); e.m.material.opacity = Math.max(0, e.o); e.m.visible = e.o > 0.01; });
          fibs.forEach((f, i) => { const q = chs[i]; if (!q.pole) { f.visible = false; return; } f.visible = true; seg.copy(q.p); dir.copy(q.pole).sub(seg); const len = dir.length(); f.position.copy(seg).addScaledVector(dir, 0.5); f.quaternion.setFromUnitVectors(up, dir.normalize()); f.scale.set(1, Math.max(0.01, len), 1); });
          const pk = []; chs.forEach((q) => { if (q.pole && !pk.some((p) => p.distanceToSquared(q.pole) < 0.01)) pk.push(q.pole); });
          cen.forEach((c, i) => { c.visible = !!pk[i] && vscene !== 'zoom' && vscene !== 'fert'; if (pk[i]) c.position.copy(pk[i]); });
          // 이름표는 움직이는 물체를 따라가요 (막·핵막·방추사)
          labCell.obj = [cells[0].x - cells[0].r * cells[0].sx * 0.72, cells[0].y + cells[0].r * 0.72, 0];
          labEnv.obj = [envs[0].x, envs[0].r * 0.9, 0];
          { const tx = mito ? 0 : (st >= 4 ? -2.7 : 0), ty = mito ? 2.4 : (st >= 4 ? 2.7 : 2.4); spL.x += (tx - spL.x) * k; spL.y += (ty - spL.y) * k; labSp.obj = [spL.x, spL.y, 0]; }
        },
      };
    },
  });
})();
