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
    ['가운데 배열', '짝지은 상동 염색체가 가운데에 늘어서요. 양쪽 극으로 끌어 보세요!'],
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
    levels: [1, 2],           // 체세포분열 · 생식세포 형성 단계에서 3D로 시작해요. 염색체 짝 맞추기·비교표·수정은 2D 화면에서 해요
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3;
      let mode = 'mito', st = 0, s2 = 0, names = true, lastAct = -9, tnow = 0, act = -9, ign = false;
      const sm = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.4, metalness: 0 }, o || {}));
      /* 세포막 (최대 4개) */
      const cells = []; for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), sm(0x93c5fd, { transparent: true, opacity: 0.14, roughness: 0.1, depthWrite: false })); root.add(m); cells.push({ m, x: 0, y: 0, r: 3.3, o: 0, sx: 1, tx: 0, ty: 0, tr: 3.3, to: 0.14, tsx: 1 }); }
      /* 핵막 */
      const envs = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), sm(0xfde68a, { transparent: true, opacity: 0.0, roughness: 0.2, depthWrite: false })); root.add(m); return { m, x: 0, r: 1.9, o: 0, tx: 0, tr: 1.9, to: 0 }; });
      /* 염색 분체 8개 */
      const chs = [];
      for (let ci = 0; ci < 4; ci++) for (let j = 0; j < 2; j++) {
        const geo = new THREE.CapsuleGeometry(0.12, CLEN[ci] - 0.24, 6, 16);
        const m = new THREE.Mesh(geo, sm(CCOL[ci], { roughness: 0.3, emissive: CCOL[ci], emissiveIntensity: 0.12 })); root.add(m);
        const c = new V3(...S0[ci]); m.position.copy(c);
        chs.push({ m, ci, j, p: c.clone(), rz: RB[ci], th: 0.04, tp: c.clone(), trz: RB[ci], tth: 0.04, pole: null });
      }
      const fibM = new THREE.MeshBasicMaterial({ color: 0xe2e8f0, transparent: true, opacity: 0.55 });
      const fibs = chs.map(() => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 1, 6), fibM); m.visible = false; root.add(m); return m; });
      const cen = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 10), sm(0xfacc15, { emissive: 0xfacc15, emissiveIntensity: 0.4 })); m.visible = false; root.add(m); return m; });
      const labChr = label('', chs[0].m, { size: 12, color: 'rgba(190,24,93,.92)', offset: [0.5, 0.85, 0] }), labSp = label('방추사', [0, 2.2, 0], { size: 12, color: 'rgba(51,65,85,.92)' }), labEnv = label('핵막', [0, 0, 0], { size: 12, color: 'rgba(161,98,7,.92)' }), labCell = label('세포막', [3.3, 2.3, 0], { size: 12, color: 'rgba(30,64,175,.9)' });
      function setCell(i, x, y, r, o, sx) { const c = cells[i]; c.tx = x; c.ty = y; c.tr = r; c.to = o; c.tsx = sx || 1; }
      function setEnv(i, x, r, o) { const e = envs[i]; e.tx = x; e.tr = r; e.to = o; }
      function target() {
        const mito = mode === 'mito', n = mito ? 6 : 7;
        // 세포막
        for (let i = 0; i < 4; i++) setCell(i, cells[i].tx, cells[i].ty, cells[i].tr, 0, 1);
        if (mito) {
          if (st <= 3) { setCell(0, 0, 0, 3.3, 0.14, st === 3 ? 1.15 : 1); setCell(1, 0, 0, 3.3, 0); }
          else if (st === 4) { setCell(0, -1.2, 0, 3.0, 0.14); setCell(1, 1.2, 0, 3.0, 0.14); }
          else if (st === 5) { setCell(0, -2.0, 0, 2.65, 0.14); setCell(1, 2.0, 0, 2.65, 0.14); }
          else { setCell(0, -2.75, 0, 2.4, 0.14); setCell(1, 2.75, 0, 2.4, 0.14); }
          setCell(2, 0, 0, 2, 0); setCell(3, 0, 0, 2, 0);
        } else {
          if (st <= 3) { setCell(0, 0, 0, 3.3, 0.14, st === 3 ? 1.2 : 1); setCell(1, 0, 0, 3.3, 0); setCell(2, 0, 0, 3.3, 0); setCell(3, 0, 0, 3.3, 0); }
          else if (st <= 5) { setCell(0, -2.7, 0, 2.5, 0.14); setCell(1, 2.7, 0, 2.5, 0.14); setCell(2, -2.7, 0, 2.5, 0); setCell(3, 2.7, 0, 2.5, 0); }
          else { setCell(0, -2.7, 1.95, 1.75, 0.14); setCell(1, 2.7, 1.95, 1.75, 0.14); setCell(2, -2.7, -1.95, 1.75, 0.14); setCell(3, 2.7, -1.95, 1.75, 0.14); }
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
            else if (st === 3) { p = new V3(gl ? -2.2 : 2.2, YI[ci], 0); rz = X; pole = new V3(gl ? -3.6 : 3.6, 0, 0); }
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
      const plOf = () => (mode === 'mito' ? pM : pE);
      function setMode2(m) { mode = m; rowM.style.display = m === 'mito' ? '' : 'none'; rowE.style.display = m === 'meio' ? '' : 'none'; }
      setMode2('mito'); target();
      // 처음 모습으로
      chs.forEach((q) => { q.p.copy(q.tp); q.rz = q.trz; q.th = q.tth; }); cells.forEach((c) => { c.x = c.tx; c.y = c.ty; c.r = c.tr; c.o = c.to; });
      const seg = new V3(), dir = new V3(), up = new V3(0, 1, 0);
      return {
        update(dt, t) {
          const k = 1 - Math.exp(-dt * 4.2); tnow += dt;
          const L = ctx.lesson();
          if (L && L.S) {
            const sm0 = L.S.scene === 'meio' ? 'meio' : L.S.scene === 'mito' ? 'mito' : mode;
            if (sm0 !== mode) { setMode2(sm0); st = -1; }
            const m = sm0 === 'meio' ? L.meio : L.mito, N = sm0 === 'meio' ? 9 : 6, pl = plOf(), stage = m.stage;
            // ▶ / 진행 막대 → 2D 단계 (2D의 규칙대로 한 단계씩), 2D에서 단계가 바뀌면 진행 막대가 따라가요
            const want = Math.min(N - 1, Math.floor(pl.p * N + 1e-6)), driving = tnow - act < 1.2;
            if (driving && want !== stage && tnow - lastAct > 0.6) {
              lastAct = tnow;
              if (want > stage) { L.nextStage(m); if (m.stage === stage && pl.playing) { pl.pause(); ign = true; pl.set((stage + 0.5) / N); ign = false; } } else L.goStage(m, want);
            } else if (!driving && !pl.playing && m.stage !== Math.floor(pl.p * N + 1e-6)) { ign = true; pl.set((m.stage + 0.5) / N); ign = false; }
            const ns = (sm0 === 'meio' ? MAPE : MAPM)[m.stage];
            if (ns !== st || m.stage !== s2) { st = ns; s2 = m.stage; target(); }
          }
          chs.forEach((q) => {
            q.p.lerp(q.tp, k); q.rz += (q.trz - q.rz) * k; q.th += (q.tth - q.th) * k;
            q.m.position.copy(q.p); q.m.rotation.z = q.rz; q.m.scale.set(q.th / 0.12, 1, q.th / 0.12);
          });
          cells.forEach((c) => { c.x += (c.tx - c.x) * k; c.y += (c.ty - c.y) * k; c.r += (c.tr - c.r) * k; c.o += (c.to - c.o) * k; c.sx += (c.tsx - c.sx) * k; c.m.position.set(c.x, c.y, 0); c.m.scale.set(c.r * c.sx, c.r, c.r); c.m.material.opacity = Math.max(0, c.o); c.m.visible = c.o > 0.005; });
          envs.forEach((e) => { e.x += (e.tx - e.x) * k; e.r += (e.tr - e.r) * k; e.o += (e.to - e.o) * k; e.m.position.set(e.x, 0, 0); e.m.scale.setScalar(e.r); e.m.material.opacity = Math.max(0, e.o); e.m.visible = e.o > 0.01; });
          fibs.forEach((f, i) => { const q = chs[i]; if (!q.pole) { f.visible = false; return; } f.visible = true; seg.copy(q.p); dir.copy(q.pole).sub(seg); const len = dir.length(); f.position.copy(seg).addScaledVector(dir, 0.5); f.quaternion.setFromUnitVectors(up, dir.normalize()); f.scale.set(1, Math.max(0.01, len), 1); });
          const pc = chs.filter((q) => q.pole).length; cen.forEach((c, i) => { c.visible = false; });
        },
      };
    },
  });
})();
