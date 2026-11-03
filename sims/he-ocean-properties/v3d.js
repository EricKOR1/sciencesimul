/* he-ocean-properties · 3D 바닷물 기둥: 수온·용존 산소의 연직 구조
   네 해역(저위도·중위도 여름·중위도 겨울·고위도)의 바닷물을 깊이 2000 m까지 기둥으로 세워 비교해요(깊이는 위쪽을 크게 늘려 그렸어요).
   색은 수온 또는 용존 산소량이에요. 수심 슬라이더로 판을 내리면 깊이마다 값을 읽을 수 있어요.
   혼합층(바람이 섞어 수온이 일정) · 수온 약층(수온이 급히 내려감) · 심해층(차갑고 일정)의 경계를 눈으로 확인해요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const lerp = (a, b, t) => a + (b - a) * t;
  const ZMAX = 4000, HS = 5.6, NS = 64;
  const yOf = (z) => -HS * Math.pow(Math.max(0, z) / ZMAX, 0.5);
  /* 2D 차시와 같은 자료(예시 값): 깊이 0·100·200·500·1000·2000·4000 m의 수온, 용존 산소는 0·100·500·1000·2000·4000 m */
  const DEPTHS = [0, 100, 200, 500, 1000, 2000, 4000], O2D = [0, 100, 500, 1000, 2000, 4000];
  const REG = [
    { id: 'low', name: '저위도', T: [28, 26, 18, 8, 5, 3.4, 1.8], O: [4.7, 4.8, 1.2, 1.8, 3.5, 4.5] },
    { id: 'midS', name: '중위도 여름', T: [22, 12, 10, 8, 5, 3.2, 2] },
    { id: 'midW', name: '중위도 겨울', T: [12, 12, 12, 11, 5, 3.2, 2] },
    { id: 'high', name: '고위도', T: [4, 3.5, 3.5, 3.2, 3, 2.3, 1.5], O: [7.0, 6.9, 6.5, 6.2, 6.1, 6.0] },
  ];
  /* 단조 3차 보간(√깊이 기준) — 2D 그래프와 같은 방식 */
  function monoFn(xs, ys) {
    const n = xs.length, d = [], m = [];
    for (let i = 0; i < n - 1; i++) d[i] = (ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]);
    m[0] = d[0]; m[n - 1] = d[n - 2];
    for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
    for (let i = 0; i < n - 1; i++) {
      if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
      const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
      if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
    }
    return (x) => {
      if (x <= xs[0]) return ys[0]; if (x >= xs[n - 1]) return ys[n - 1];
      let i = 0; while (x > xs[i + 1]) i++;
      const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
    };
  }
  REG.forEach((r) => {
    const fT = monoFn(DEPTHS.map(Math.sqrt), r.T); r.temp = (z) => fT(Math.sqrt(z));
    if (r.O) { const fO = monoFn(O2D.map(Math.sqrt), r.O); r.doxy = (z) => fO(Math.sqrt(z)); }
    /* 층 경계: 혼합층 = 표층보다 0.5 °C 이상 낮아지기 직전, 수온 약층 아래 = 표층-심층 수온 차의 12%만 남는 깊이 */
    const Ts = r.T[0], Td = r.T[6], dT = Ts - Td;
    let hm = 0; while (hm < ZMAX && r.temp(hm + 5) > Ts - 0.5) hm += 5;
    let tb = hm; while (tb < ZMAX && r.temp(tb) - Td > 0.12 * dT) tb += 10;
    r.hm = hm; r.tb = tb; r.layers = dT >= 4;
  });
  const ARGO_MAX = 2000;           // 2D의 '읽을 수심' 슬라이더 범위와 ARGO 부이가 내려가는 깊이

  window.SciSim3D.attach({
    levels: [0, 1, 2],
    title: '수온·용존 산소 3D 기둥',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHONE ? 17 : 12.5, theta: 0.35, phi: 1.28, min: 6, max: 26, target: [0, -2.5, 0] },
    autoRotate: 0,
    build(ctx) {
      if (ctx.THREE.ColorManagement) ctx.THREE.ColorManagement.legacyMode = false;     // 색을 보이는 그대로(sRGB) 쓰도록 맞춰요
      const { THREE, root, label, info, controls } = ctx;
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0.0 }, o || {}));
      const XS = [-3.6, -1.2, 1.2, 3.6], CW = 1.7;
      const slices = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), std(0xffffff, { roughness: 0.45 }), 4 * NS); root.add(slices);
      const dm = new THREE.Object3D(), cc = new THREE.Color();
      /* 수면 + 받침 */
      const tops = [], nlab = [];
      REG.forEach((r, i) => {
        const top = new THREE.Mesh(new THREE.BoxGeometry(CW, 0.06, CW), std(0x66c7ff, { transparent: true, opacity: 0.55, roughness: 0.2, metalness: 0.1 })); top.position.set(XS[i], 0.03, 0); root.add(top); tops.push(top);
        nlab[i] = label(r.name, [XS[i], 0.2, 0], { size: 12.5, offset: [0, 0.2, 0] });
      });
      const base = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.14, 2.6), std(0x2a3550, { roughness: 0.9 })); base.position.set(0, -HS - 0.1, 0); root.add(base);
      /* 수심 판 */
      const plane = new THREE.Mesh(new THREE.BoxGeometry(9.0, 0.05, 2.3), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4, depthWrite: false })); root.add(plane);
      const rimM = new THREE.MeshBasicMaterial({ color: 0xffffff }), rim = new THREE.Mesh(new THREE.BoxGeometry(9.0, 0.03, 0.03), rimM); rim.position.z = 1.15; plane.add(rim);
      const vlab = REG.map((r, i) => label('', [XS[i], 0, CW / 2], { size: 12, offset: [0, 0, 0.6], color: 'rgba(15,23,42,.92)' }));
      /* 혼합층 안의 바람 알갱이 */
      const NP = 16, mix = REG.map((r, i) => { const m = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 }), NP); root.add(m); return m; });
      /* 층 이름표 (저위도 기둥 왼쪽) */
      const LY = { mix: label('혼합층', [XS[0] - 1.15, 0, 0], { size: 12 }), th: label('수온 약층', [XS[0] - 1.15, 0, 0], { size: 12, color: 'rgba(150,50,20,.92)' }), dp: label('심해층', [XS[0] - 1.15, 0, 0], { size: 12, color: 'rgba(20,50,140,.92)' }) };
      const bnd = REG.map((r, i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(CW + 0.1, 0.025, CW + 0.1), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 })); m.position.set(XS[i], 0, 0); root.add(m); const m2 = m.clone(); root.add(m2); return [m, m2]; });

      /* 색 */
      const cT = (T) => { const t = Math.max(0, Math.min(1, T / 28)); const a = new THREE.Color(0x1d3a8a), b = new THREE.Color(0x2fb7a8), c = new THREE.Color(0xffd23f), d = new THREE.Color(0xff5a2e); return t < 0.33 ? a.lerp(b, t / 0.33) : t < 0.66 ? b.lerp(c, (t - 0.33) / 0.33) : c.lerp(d, (t - 0.66) / 0.34); };
      const cO = (v) => { const t = Math.max(0, Math.min(1, v / 8)); const a = new THREE.Color(0x4a1d6b), b = new THREE.Color(0xd14d72), c = new THREE.Color(0xfbd38d), d = new THREE.Color(0x4fd1c5); return t < 0.3 ? a.lerp(b, t / 0.3) : t < 0.55 ? b.lerp(c, (t - 0.3) / 0.25) : c.lerp(d, (t - 0.55) / 0.45); };
      const L2 = () => ctx.lesson();
      let mode = ctx.level === 2 ? 'O' : 'T', z = 200;
      { const l = L2(); if (l && l.S && ctx.level === 0 && l.S.depth != null && l.S.depth > 0) z = l.S.depth; }
      let seg = null, rng = null, pl = null;
      const has = (r) => mode === 'T' || !!r.doxy;          // 용존 산소는 2D 자료가 있는 저위도·고위도만
      function recolor() {
        let n = 0;
        REG.forEach((r, i) => {
          const on = has(r);
          for (let k = 0; k < NS; k++) {
            const u0 = k / NS, u1 = (k + 1) / NS, z0 = ZMAX * u0 * u0, z1 = ZMAX * u1 * u1, y0 = yOf(z0), y1 = yOf(z1), zm = (z0 + z1) / 2;
            dm.position.set(XS[i], (y0 + y1) / 2, 0); dm.scale.set(on ? CW : 0.0001, Math.abs(y0 - y1) + 0.004, on ? CW : 0.0001); dm.updateMatrix(); slices.setMatrixAt(n, dm.matrix);
            cc.copy(mode === 'T' ? cT(r.temp(zm)) : on ? cO(r.doxy(zm)) : cT(0)); slices.setColorAt(n, cc); n++;
          }
          tops[i].visible = on; nlab[i].show(on); mix[i].visible = on && mode === 'T';
          bnd[i][0].visible = on && mode === 'T' && r.layers; bnd[i][1].visible = on && mode === 'T' && r.layers;
          bnd[i][0].position.y = yOf(r.hm); bnd[i][1].position.y = yOf(Math.min(ZMAX, r.tb));
          mixH[i] = Math.abs(yOf(r.hm));
        });
        slices.instanceMatrix.needsUpdate = true; slices.instanceColor.needsUpdate = true;
        const lo = REG[0], sh = mode === 'T';
        LY.mix.show(sh); LY.th.show(sh); LY.dp.show(sh);
        LY.mix.obj = [XS[0] - 1.15, yOf(lo.hm / 2), 0]; LY.th.obj = [XS[0] - 1.15, yOf((lo.hm + lo.tb) / 2), 0]; LY.dp.obj = [XS[0] - 1.15, yOf(3000), 0];
        txt();
      }
      const mixH = [0, 0, 0, 0];
      function setZ(v) {
        z = v; const y = yOf(z); plane.position.set(0, y, 0);
        REG.forEach((r, i) => { vlab[i].show(has(r)); vlab[i].obj = [XS[i], y, CW / 2]; vlab[i].set(mode === 'T' ? r.temp(z).toFixed(1) + ' °C' : has(r) ? r.doxy(z).toFixed(1) + ' mL/L' : ''); });
        if (rng) rng.set(Math.round(z / 100) * 100);
      }
      function txt() {
        const lv = ctx.level;
        info(mode === 'T'
          ? '<b>수온</b>: ' + (lv === 0 ? '수심 200 m 수온은 저위도 18 °C, 중위도(여름) 10 °C, 고위도 3.5 °C예요(예시 자료).<br>수심 판을 200 m에 맞춰 읽어 보세요.' : lv === 1 ? '저위도와 중위도 여름은 <b>수온 약층</b>이 뚜렷하고, 중위도 겨울은 혼합층이 깊어 약해지고, 고위도는 표층부터 차가워 거의 없어요.' : '표층 수온이 높은 해역일수록 깊이에 따라 수온이 크게 내려가요.')
          : '<b>용존 산소</b>: 표층에서 풍부하다가 저위도는 500 m 부근에서 최소(1.2 mL/L)가 되고 심층에서 다시 늘어요. 고위도는 깊이에 따른 변화가 작고 값이 높아요(예시 자료).');
      }
      seg = controls.segment('색', [{ value: 'T', label: '🌡️ 수온' }, { value: 'O', label: '🫧 용존 산소' }], mode, (v) => { mode = v; recolor(); setZ(z); });
      /* 3D에서 수심을 바꾸면 2D '읽을 수심' 슬라이더도 같이 움직여요 */
      rng = controls.range('수심', 0, ZMAX, 100, Math.round(z / 100) * 100, (v) => {
        setZ(v);
        const sd = document.getElementById('sDepth');
        if (sd) { sd.value = Math.min(v, +sd.max); sd.dispatchEvent(new Event('input', { bubbles: true })); }
      }, (v) => v + ' m');
      /* ▶ ARGO 부이처럼 표층에서 2000 m까지 내려갔다가 다시 올라오며 값을 읽어요 */
      pl = controls.player({
        duration: 12, loop: true, autoplay: false, label: '부이 내려가기',
        phases: [[0, '하강'], [0.5, '상승']],
        onFrame(p) { const q = p < 0.5 ? p * 2 : (1 - p) * 2; setZ(ARGO_MAX * (0.5 - 0.5 * Math.cos(Math.PI * q))); },
      });
      pl.pause(); setZ(z);
      recolor(); setZ(z);
      let lastD = (L2() && L2().S) ? L2().S.depth : null;
      ctx.onLevel((lv) => { const m = lv === 2 ? 'O' : 'T'; if (m !== mode) { mode = m; seg.set(m); recolor(); setZ(z); } else txt(); });
      const dm2 = new THREE.Object3D();
      return {
        update(dt, t) {
          const l = L2();
          if (l && l.S && l.S.depth !== lastD) { lastD = l.S.depth; if (!pl.playing && lastD != null && lastD !== z) setZ(lastD); }
          mix.forEach((m, i) => { const h = mixH[i] || 0.3; for (let k = 0; k < NP; k++) { const a = k * 2.4 + t * (0.8 + (k % 3) * 0.3), rr = 0.55 * Math.sqrt((k + 1) / NP); dm2.position.set(XS[i] + Math.cos(a) * rr, -h * ((k * 0.37 + t * 0.12 * (1 + k % 2)) % 1) * 0.95 - 0.02, Math.sin(a) * rr); dm2.scale.setScalar(1); dm2.updateMatrix(); m.setMatrixAt(k, dm2.matrix); } m.instanceMatrix.needsUpdate = true; });
        },
        sync() {},
      };
    },
  });
})();
