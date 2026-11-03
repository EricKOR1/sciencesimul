/* hm-doppler · 3D 도플러 효과
   2D 실험(window.__sim)의 장면을 그대로 입체로 보여 줘요: 🚑 소리 높이(구급차가 지나갈 때) · 🌀 파면 모형(움직이는 파원 · 움직이는 관측자).
   소리의 속력은 340 m/s로 일정해요. 파원 앞쪽은 파면이 촘촘(파장 짧음 → 높은 소리), 뒤쪽은 성겨요(낮은 소리). 속력은 옆 조작판이 정하고 3D는 따라가요.
   (🧮 도플러 식 · 📱 스마트폰 · 🔫 스피드건 · 🩸 혈류 · 🌩️ 레이더는 2D 화면에서 해요) */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches), KD = PHN ? 1.3 : 1;
  const LV = () => (typeof window.SciSimLevel === 'number' ? window.SciSimLevel : 0);
  const TAU = Math.PI * 2, clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  function tools(THREE) {
    const V3 = THREE.Vector3, Y = new V3(0, 1, 0);
    const M = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0.1 }, o || {}));
    const glass = (c, op) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.2, metalness: 0, transparent: true, opacity: op == null ? 0.25 : op, depthWrite: false });
    function mkArrow(col, rad) {
      const g = new THREE.Group(), m = M(col, { roughness: 0.4 });
      const sh = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 1, 12), m), hd = new THREE.Mesh(new THREE.ConeGeometry(rad * 2.6, rad * 6, 16), m);
      g.add(sh, hd); g.userData = { sh, hd, rad }; return g;
    }
    function setArrow(g, a, b) {
      const d = new V3().subVectors(b, a), len = d.length(), { sh, hd, rad } = g.userData;
      if (len < 1e-3) { g.visible = false; return; }
      g.visible = true; const hl = Math.min(len * 0.5, rad * 6);
      sh.scale.y = Math.max(0.001, len - hl); sh.position.y = (len - hl) / 2;
      hd.scale.y = hl / (rad * 6); hd.position.y = len - hl / 2;
      g.position.copy(a); g.quaternion.setFromUnitVectors(Y, d.normalize());
    }
    function tube(pts, r, col, o, closed) {
      const c = new THREE.CatmullRomCurve3(pts, !!closed);
      return new THREE.Mesh(new THREE.TubeGeometry(c, Math.max(24, pts.length * 3), r, 8, !!closed), (o && o.basic) ? new THREE.MeshBasicMaterial({ color: col, transparent: !!o.op, opacity: o.op || 1 }) : M(col, o));
    }
    function disc(r, col, y, op) { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 64), new THREE.MeshStandardMaterial({ color: col, roughness: 0.9, transparent: op != null, opacity: op == null ? 1 : op })); m.rotation.x = -Math.PI / 2; m.position.y = y || 0; m.receiveShadow = true; return m; }
    function grid(w, d, step, col, y, op) {
      const pts = []; for (let x = -w / 2; x <= w / 2 + 1e-6; x += step) pts.push(x, 0, -d / 2, x, 0, d / 2); for (let z = -d / 2; z <= d / 2 + 1e-6; z += step) pts.push(-w / 2, 0, z, w / 2, 0, z);
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: op == null ? 0.3 : op })); l.position.y = y || 0; return l;
    }
    function arc(r, a0, a1, rad, col, n) { // xz 평면 위의 호
      const pts = []; n = n || 40; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; pts.push(new V3(r * Math.cos(a), 0, r * Math.sin(a))); }
      return tube(pts, rad, col);
    }
    return { V3, Y, M, glass, mkArrow, setArrow, tube, disc, grid, arc };
  }
  const KDX = PHN ? 1.65 : 1;
  const f0s = (v) => Math.round(v);
  window.SciSim3D.attach({
    title: '도플러 효과 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대 · 속력은 옆 조작판에서 바꿔요',
    camera: { dist: 16 * KDX, theta: 0.15, phi: 0.95, min: 5, max: 40, target: [0, 0, 0] },
    autoRotate: 0,
    levels: [0, 1],
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      const { V3, M, mkArrow, setArrow, grid } = tools(THREE);
      const sim = () => ctx.lesson();
      const gA = new THREE.Group(), gW = new THREE.Group(); root.add(gA, gW);
      const mkRings = (g, n) => { const a = []; for (let i = 0; i < n; i++) { const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.02, 6, 72), new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.7, depthWrite: false })); m.rotation.x = Math.PI / 2; m.visible = false; g.add(m); a.push(m); } return a; };
      const carMk = (g) => { const c = new THREE.Group(); const bd = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.55, 0.8), M(0xf8fafc, { roughness: 0.35 })); bd.position.y = 0.3; c.add(bd); const cab = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.42, 0.78), M(0xf8fafc)); cab.position.set(0.55, 0.75, 0); c.add(cab); const st = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.2), M(0xe2464b)); st.position.y = 0.62; c.add(st); const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), M(0xff3b30, { emissive: 0xff3b30 })); lamp.position.set(0, 0.72, 0); c.add(lamp); g.add(c); return c; };
      /* ================= 🚑 구급차 (도로 ±50 m, 관측자는 길가 3 m, 파면은 보기 좋게 성기게 그렸어요) ================= */
      const U = 0.16;
      gA.add(grid(20, 8, 1, 0x7a8fb3, -0.02, 0.2));
      const road = new THREE.Mesh(new THREE.BoxGeometry(17, 0.06, 1.0), M(0x374151, { roughness: 0.9 })); road.position.y = -0.04; gA.add(road);
      const amb = carMk(gA); amb.scale.setScalar(0.9);
      const listener = new THREE.Group(); { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.7, 12), M(0x3b82f6)); b.position.y = 0.4; listener.add(b); const h = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), M(0xffd9b5)); h.position.y = 0.9; listener.add(h); } listener.position.set(0, 0, 3.0 * U * 4 + 0.2); gA.add(listener);
      const ringsA = mkRings(gA, 24);
      const lAmb = label('구급차 (사이렌 700 Hz)', amb, { color: '#b91c1c', size: 12 }), lLis = label('길가에서 듣는 사람', listener, { color: '#2563eb', size: 12 }), lHz = label('', listener, { color: '#26324a', size: 14 });
      const demoA = { p: 0, on: false }; let pl = null;
      function ambScene(A, S) {
        const a = S.amb, vs = A.VSA[a.vi], inside = a.listener === 'inside';
        let t = a.t, done = a.done; const T = (A.AXE - A.AX0) / vs;
        if (demoA.on && !(a.t > 0 && !a.done)) { t = demoA.p * T; done = false; }
        const x = A.AX0 + vs * t, X = (xx) => xx * 0.17;
        amb.position.set(X(x), 0, 0); lAmb.off = [0, 1.6, 0];
        const ti = 0.12;   // 보기 좋게 성긴 방출 간격 (실제 사이렌은 훨씬 촘촘해요)
        const kmax = Math.floor(t / ti);
        ringsA.forEach((r, i) => { const k = kmax - i, tk = k * ti; const R = 340 * (t - tk); if (k < 0 || R <= 0 || R > 160) { r.visible = false; return; } r.visible = true; r.position.set(X(A.AX0 + vs * tk), 0.02, 0); r.scale.setScalar(Math.max(0.01, X(R))); r.material.opacity = Math.max(0.1, 0.8 - R / 220); });
        const fh = inside ? A.AF : A.ambObs(Math.max(t, 0.0001), vs);
        const passed = x > 0;
        lHz.set((inside ? '구급차 안: ' : '들리는 소리: ') + f0s(fh) + ' Hz'); lHz.off = [0, 1.5, 0];
        listener.visible = !inside; lLis.show(!inside);
        info('<b>🚑 소리 높이: 구급차가 지나갈 때</b> · 구급차 속력 ' + vs + ' m/s · 사이렌 ' + A.AF + ' Hz<br>' + (inside ? '구급차 안에서는 사이렌이 늘 <b>같은 높이</b>로 들려요 (파원과 함께 움직여서).' : (x < 0 ? '다가오는 동안: 파면이 앞쪽에서 촘촘 → <b>높은 소리</b> ' : '멀어지는 동안: 파면이 성겨짐 → <b>낮은 소리</b> ') + '(지금 ' + f0s(fh) + ' Hz)') + (done ? '<br>한 번 지나갔어요.' : '') + '<br>소리의 속력은 340 m/s로 일정해요. 파면은 실제보다 훨씬 성기게 그렸어요.<br><span style="opacity:.8">속력과 듣는 곳은 옆 조작판에서 바꿔요 (▶ 지나가기도 가능).</span>');
        void passed;
      }
      /* ================= 🌀 파면 모형 (1 m = 1.5칸) ================= */
      const W = 1.5, stageG = [0, 1].map((i) => { const g = new THREE.Group(); g.position.z = i ? 3.4 : -3.4; gW.add(g); const pl2 = new THREE.Mesh(new THREE.BoxGeometry(7 * W + 0.4, 0.05, 6), new THREE.MeshStandardMaterial({ color: 0x1e2c4a, roughness: 1 })); pl2.position.set(3.5 * W, -0.05, 0); g.add(pl2); return g; });
      const ringsW = stageG.map((g) => mkRings(g, 40));
      const srcW = [0, 1].map((i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 12), M(0xe2464b, { emissive: 0x7f1d1d })); stageG[i].add(m); return m; });
      const obsW = [[0, 0], [0, 1], [1, 0]].map(([si, oi]) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10), M([0x22c55e, 0xa78bfa, 0xf59e0b][si * 2 + oi] || 0x22c55e)); stageG[si].add(m); return [si, oi, m]; });
      const lS1 = label('① 파원이 움직여요', [3.5 * W, 0, -3.4 - 2.6], { color: '#475569', size: 12 }), lS2 = label('② 관측자가 움직여요', [3.5 * W, 0, 3.4 - 2.6], { color: '#475569', size: 12 });
      const lObs = obsW.map(([si, oi, m]) => label(['A', 'B', 'C'][[0, 1, 2][si * 2 + oi] != null ? si * 2 + oi : 0] || '', m, { color: '#26324a', size: 12 }));
      const lSrcs = [label('파원', srcW[0], { color: '#b91c1c', size: 12 }), label('파원 (정지)', srcW[1], { color: '#b91c1c', size: 12 })];
      function wfScene(A, S) {
        const w = S.wf; if (!w.A) return; const vs = w.vi * 10;
        [w.A, w.B].forEach((rs, si) => {
          const P = rs.P, kr = rs.kRange(P), rr = ringsW[si]; let n = 0;
          for (let k = kr[1]; k >= kr[0] && n < rr.length; k--) { const R = A.V * (P - k * rs.T0); if (R <= 0 || R > rs.Rmax) continue; const r = rr[n++]; r.visible = true; r.position.set(rs.xs(k * rs.T0) * W, 0.02, 0); r.scale.setScalar(R * W); r.material.opacity = 0.75 * (1 - R / rs.Rmax) + 0.15; }
          for (; n < rr.length; n++) rr[n].visible = false;
          srcW[si].position.set(rs.xs(P) * W, 0.22, 0);
        });
        obsW.forEach(([si, oi, m], i) => { const rs = si ? w.B : w.A; m.position.set(rs.xo(oi, rs.P) * W, 0.17, 0); const lb = lObs[i]; lb.set(rs.obs[oi].name); lb.off = [0, 0.5, 0]; });
        lSrcs.forEach((l) => (l.off = [0, 0.55, 0]));
        info('<b>🌀 파면 모형: 간격이 달라져요</b> · 파원 속력 ' + vs + ' m/s · 소리의 속력 340 m/s · 파원 680 Hz<br>① 움직이는 파원: 진행 방향 <b>앞쪽 파면은 촘촘</b>(파장 짧음), <b>뒤쪽은 성겨요</b>(파장 김) → A는 높은 소리, B는 낮은 소리.<br>② 움직이는 관측자(C): 파면을 더 자주 맞이해서 소리가 높게 들려요.<br><span style="opacity:.8">파원 속력은 옆 조작판에서 바꾸고, 앞·뒤 파장은 2D 화면에서 재요 (화면은 실제보다 느려요).</span>');
      }
      const NOTE = '🧮 도플러 식 · 📱 스마트폰 · 🔫 스피드건 · 🩸 혈류 · 🌩️ 레이더는 2D 화면에서 해요. 위의 [▦ 2D]를 눌러 보세요.';
      pl = controls.player({ duration: 8, loop: true, autoplay: false, label: '지나가기', phases: [[0, '다가올 때 (높은 소리)'], [0.5, '멀어질 때 (낮은 소리)']], onFrame(p) { demoA.p = p; demoA.on = p > 0 || !!(pl && pl.playing); } });
      pl.row = ctx.renderer.domElement.parentNode.parentNode.querySelector('.v3-player');
      let cur = '';
      function setMode(S) {
        const mode = S.mode === 'amb' || S.mode === 'wf' ? S.mode : 'other'; if (mode === cur) return; cur = mode;
        gA.visible = mode === 'amb'; gW.visible = mode === 'wf'; [lAmb, lLis, lHz].forEach((l) => l.show(mode === 'amb')); [lS1, lS2, lSrcs[0], lSrcs[1]].concat(lObs).forEach((l) => l.show(mode === 'wf'));
        pl.row.style.display = mode === 'amb' ? '' : 'none'; if (mode !== 'amb') { pl.pause(); pl.set(0); }
        if (mode === 'amb') Object.assign(orbit, { tx: 0, ty: 0, tz: 0.5, phi: 0.95, theta: 0.15, dist: 15 * KDX }); else if (mode === 'wf') Object.assign(orbit, { tx: 5.2, ty: 0, tz: 0, phi: 0.85, theta: 0.1, dist: 17 * KDX });
      }
      return {
        update() {
          const A = sim(); if (!A || !A.S) return; const S = A.S; setMode(S);
          if (!pl.playing && pl.p === 0) demoA.on = false;
          if (cur === 'amb') ambScene(A, S); else if (cur === 'wf') wfScene(A, S); else info(NOTE);
        },
        sync() {},
      };
    },
  });
})();
