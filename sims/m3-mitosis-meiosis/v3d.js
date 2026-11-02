/* m3-mitosis-meiosis · 3D 염색체와 세포분열
   체세포분열: 염색체 수가 같은 딸세포 2개 (2n=4 → 2n=4).  감수분열: 상동 염색체가 먼저 갈라지고(1분열), 염색 분체가 갈라져(2분열) 염색체 수가 절반인 생식세포 4개 (2n=4 → n=2). */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const MITO = [
    ['간기', 'DNA가 복제되어 염색 분체가 2개씩 돼요. 염색체는 가늘게 풀려 있어요.'],
    ['전기', '핵막이 사라지고 염색체가 굵게 뭉쳐요 (염색 분체 2개가 붙은 X자).'],
    ['중기', '염색체가 세포 가운데(적도면)에 줄지어 서고, 방추사가 붙어요.'],
    ['후기', '염색 분체가 갈라져 방추사를 따라 양쪽 끝으로 가요.'],
    ['말기', '염색체가 풀어지고 핵막이 다시 생겨요.'],
    ['세포질 분열', '세포질이 둘로 나뉘며 세포가 잘록해져요.'],
    ['딸세포 2개', '염색체 수(4개)와 유전 정보가 처음 세포와 같아요.'],
  ];
  const MEIO = [
    ['간기', 'DNA가 복제되어 염색 분체가 2개씩 돼요.'],
    ['1분열 전기', '같은 크기·모양의 상동 염색체끼리 붙어 2가 염색체가 돼요.'],
    ['1분열 중기', '2가 염색체가 적도면에 서고 방추사가 붙어요.'],
    ['1분열 후기', '상동 염색체가 갈라져요. 염색체 수가 절반(2개)이 돼요.'],
    ['2분열 중기', '딸세포 2개에서 염색체(염색 분체 2개)가 적도면에 서요.'],
    ['2분열 후기', '염색 분체가 갈라져 양쪽 끝으로 가요.'],
    ['생식세포 4개', '염색체 수가 체세포의 절반(n=2)인 세포 4개가 만들어져요.'],
  ];
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
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3;
      let mode = 'mito', st = 0, play = false, wait = 0, names = true;
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
        info('<b>' + (mito ? '체세포분열' : '감수분열') + ' · ' + stages[st][0] + '</b><br>' + stages[st][1] + '<br>' + (st === n - 1 ? (mito ? '2n = 4 → 2n = 4' : '2n = 4 → n = 2') : '분홍·파랑: 어머니·아버지에게서 온 염색체'));
        labChr.set(st === 0 ? '염색체(가는 실)' : st >= (mito ? 3 : 4) && st < 6 && !(mito && st >= 5) ? '염색 분체' : mito ? '염색체' : st === 1 || st === 2 ? '2가 염색체' : '염색체');
        labChr.show(names); labSp.show(names && chs.some((q) => q.pole)); labEnv.show(names && envs.some((e) => e.to > 0)); labCell.show(names);
        labEnv.obj = [envs[0].tx, envs[0].tr * 0.9, 0];
        labSp.obj = mito ? [0, 2.4, 0] : (st >= 4 ? [-2.7, 2.7, 0] : [0, 2.4, 0]);
        labCell.obj = [cells[0].tx - cells[0].tr * 0.72, cells[0].ty + cells[0].tr * 0.72, 0];
      }
      function setStage(v) { st = Math.max(0, Math.min(v, 6)); sg.set(st); target(); }
      const fmt = (v) => (mode === 'mito' ? MITO : MEIO)[Math.min(v, 6)][0];
      controls.segment('분열', [{ value: 'mito', label: '체세포분열' }, { value: 'meio', label: '감수분열' }], mode, (v) => { mode = v; st = 0; sg.set(0); target(); });
      const sg = controls.range('단계', 0, 6, 1, 0, (v) => { play = false; pbtn.textContent = '▶ 자동'; st = Math.round(v); target(); }, (v) => fmt(v));
      const pbtn = controls.button('▶ 자동', () => { play = !play; pbtn.textContent = play ? '❚❚ 멈춤' : '▶ 자동'; wait = 0; });
      const nb = controls.button('이름 ✓', () => { names = !names; nb.textContent = '이름 ' + (names ? '✓' : '✕'); target(); }); nb.classList.add('on');
      target();
      // 처음 모습으로
      chs.forEach((q) => { q.p.copy(q.tp); q.rz = q.trz; q.th = q.tth; }); cells.forEach((c) => { c.x = c.tx; c.y = c.ty; c.r = c.tr; c.o = c.to; });
      const seg = new V3(), dir = new V3(), up = new V3(0, 1, 0);
      return {
        update(dt, t) {
          const k = 1 - Math.exp(-dt * 4.2);
          if (play) { wait += dt; if (wait > 3.4) { wait = 0; st = (st + 1) % 7; sg.set(st); target(); } }
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
