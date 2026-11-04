/* hm-doppler · 3D 도플러 효과
   2D 실험(window.__sim)의 장면을 그대로 입체로 보여 줘요: 🚑 소리 높이(구급차가 지나갈 때) · 🌀 파면 모형(움직이는 파원 · 움직이는 관측자).
   소리의 속력은 340 m/s로 일정해요. 파원 앞쪽은 파면이 촘촘(파장 짧음 → 높은 소리), 뒤쪽은 성겨요(낮은 소리). 속력은 옆 조작판이 정하고 3D는 따라가요.
   🧮 도플러 식 · 📱 스마트폰 · 📡 스피드건 · 🩺 혈류 · 🌧️ 레이더도 입체로 보여 줘요. */
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
    levels: [0, 1, 3],
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
      /* ================= 🧮 도플러 식 (파면 센서) ================= */
      const gC = new THREE.Group(); root.add(gC); const CW = 0.8;
      const plC = new THREE.Mesh(new THREE.BoxGeometry(11.6 * CW + 0.4, 0.05, 7), new THREE.MeshStandardMaterial({ color: 0x1e2c4a, roughness: 1 })); plC.position.set(5.8 * CW, -0.05, 0); gC.add(plC);
      const ringsC = mkRings(gC, 48);
      const srcC = new THREE.Mesh(new THREE.SphereGeometry(0.28, 18, 12), M(0xf59e0b, { emissive: 0x7c4a03 })); gC.add(srcC);
      const obsC = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12), M(0x14b8a6, { emissive: 0x0f3f3a })); gC.add(obsC);
      const arrS = mkArrow(0x16a34a, 0.05), arrO = mkArrow(0x16a34a, 0.05); gC.add(arrS, arrO);
      const lCs = label('파원', srcC, { color: '#b45309', size: 12 }), lCo = label('관측자 A (파면 센서)', obsC, { color: '#0f766e', size: 12 }), lCvs = label('v_s', arrS, { color: '#15803d', size: 12 }), lCvo = label('v_o', arrO, { color: '#15803d', size: 12 }), lCf = label('', [5.8 * CW, 0, 3.7], { color: '#1e293b', size: 13 });
      function calcScene(A, S) {
        const cl = S.cl, rs = cl.rs; if (!rs) return; const u = cl.ui * 5, app = cl.dir === 'app', F = A.clFormula();
        const kr = rs.kRange(rs.P); let n = 0;
        for (let k = kr[1]; k >= kr[0] && n < ringsC.length; k--) { const R = A.V * (rs.P - k * rs.T0); if (R <= 0.05 || R * CW > 3.3) continue; const r = ringsC[n++]; r.visible = true; r.position.set(rs.xs(k * rs.T0) * CW, 0.02, 0); r.scale.setScalar(R * CW); r.material.opacity = 0.75 * (1 - R * CW / 3.3) + 0.15; }
        for (; n < ringsC.length; n++) ringsC[n].visible = false;
        const sx = rs.xs(rs.P) * CW, ox = rs.xo(0, rs.P) * CW; srcC.position.set(sx, 0.28, 0); obsC.position.set(ox, 0.24, 1.0);
        const dS = cl.type === 'src' ? Math.sign(rs.vs) : 0, dO = cl.type === 'obs' ? Math.sign(rs.obs[0].u) : 0;
        if (dS) { setArrow(arrS, new V3(sx, 0.9, 0), new V3(sx + dS * (0.9 + u * 0.03), 0.9, 0)); lCvs.obj = arrS; lCvs.set('v_s = ' + u + ' m/s'); } else arrS.visible = false;
        if (dO) { setArrow(arrO, new V3(ox, 0.9, 1.0), new V3(ox + dO * (0.9 + u * 0.03), 0.9, 1.0)); lCvo.obj = arrO; lCvo.set('v_o = ' + u + ' m/s'); } else arrO.visible = false;
        lCvs.show(!!dS); lCvo.show(!!dO); lCs.off = [0, 0.55, 0]; lCo.off = [0, 0.5, 0];
        const fm = rs.fMeas(0), fv = Math.round(F.val);
        lCf.set('파면 센서 A가 센 진동수: ' + (fm ? Math.round(fm) + ' Hz' : '재는 중…') + ' · 식: ' + fv + ' Hz');
        info('<b>🧮 도플러 식</b> · ' + (cl.type === 'src' ? '파원이 움직여요' : '관측자가 움직여요') + ' (' + (app ? '다가옴' : '멀어짐') + ', ' + u + ' m/s)<br>' + F.expr + ' = <b>' + fv + ' Hz</b><br>' + F.rule);
      }
      /* ================= 📱 스마트폰: 원판 끝의 스피커 ================= */
      const gP = new THREE.Group(); root.add(gP); const PR = 2.4;
      gP.add(grid(14, 8, 1, 0x7a8fb3, -0.12, 0.2));
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(PR + 0.2, PR + 0.2, 0.2, 60), M(0x94a3b8, { metalness: 0.3 })); disc.position.y = -0.02; gP.add(disc);
      const armP = new THREE.Mesh(new THREE.BoxGeometry(PR, 0.06, 0.08), M(0x475569)); gP.add(armP);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.3, 16), M(0x475569)); hub.position.y = 0.1; gP.add(hub);
      const spkP = new THREE.Mesh(new THREE.SphereGeometry(0.3, 18, 12), M(0xf59e0b, { emissive: 0x7c4a03 })); gP.add(spkP);
      const arrP = mkArrow(0x16a34a, 0.05); gP.add(arrP);
      const phone = new THREE.Group(); { const b = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.7, 1.0), M(0x0f172a)); phone.add(b); const sc = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1.45, 0.82), new THREE.MeshBasicMaterial({ color: 0x38bdf8 })); sc.position.x = -0.11; phone.add(sc); } phone.position.set(5.6, 0.85, 0); gP.add(phone);
      const lineP = new THREE.Mesh(new THREE.BoxGeometry(1, 0.03, 0.03), new THREE.MeshBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.5 })); lineP.position.set(PR + 0.2 + (5.6 - 0.2 - PR - 0.2) / 2, 0.15, 0); lineP.scale.x = 5.6 - 0.2 - PR - 0.2; gP.add(lineP);
      const lPs = label('스피커 1000 Hz', spkP, { color: '#b45309', size: 12 }), lPd = label('원판 (반지름 0.20 m)', [0, -0.1, PR + 0.9], { color: '#475569', size: 12 }), lPp = label('📱 소리 분석 앱', phone, { color: '#0f172a', size: 12 }), lPf = label('', phone, { color: '#0369a1', size: 14 });
      function phoneScene(A, S) {
        const p = S.ph, th = (p.u / 0.2) * p.t, px = PR * Math.cos(th), pz = -PR * Math.sin(th), vx = -p.u * Math.sin(th), f = A.phF(p.t);
        spkP.position.set(px, 0.3, pz); armP.position.set(px / 2, 0.15, pz / 2); armP.rotation.y = Math.atan2(-pz, px) * 1;
        setArrow(arrP, new V3(px, 0.3, pz), new V3(px - Math.sin(th) * 1.5, 0.3, pz - Math.cos(th) * 1.5));
        lPs.off = [0, 0.6, 0]; lPf.off = [0, 1.4, 0]; lPp.off = [0, 1.0 + 0.0, 0]; lPp.show(false);
        lPf.set('📱 지금 ' + Math.round(f) + ' Hz');
        info('<b>📱 스마트폰으로 측정</b> · 원판 속력 u = ' + p.u.toFixed(1) + ' m/s (ω = u/r = ' + Math.round(p.u / 0.2) + ' rad/s)<br>스피커가 폰 쪽으로 오면(속도 ' + (vx >= 0 ? '+' : '−') + Math.abs(vx).toFixed(1) + ' m/s) ' + (vx > 0.05 ? '<b>높은 소리</b>' : vx < -0.05 ? '<b>낮은 소리</b>' : '원래 소리') + '<br>f_max = f·v/(v−u), f_min = f·v/(v+u) → u = v(f_max − f_min)/(f_max + f_min)');
      }
      /* ================= 📡 스피드건 / 🩺 혈류 : 반사파 ================= */
      const mkBeads = (g, n, col) => { const m = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: col }), n); m.frustumCulled = false; g.add(m); return m; };
      const m4 = new THREE.Matrix4(), q0 = new THREE.Quaternion(), vS = new V3(), vP = new V3();
      function train(m, x0, x1, y, z, lam, amp, ph) { const n = m.count; for (let i = 0; i < n; i++) { const x = x0 + (x1 - x0) * i / (n - 1); const s = x1 - x0 > 0.3 ? 1 : 0; vP.set(x, y + Math.sin((x - x0) / lam * TAU + ph) * amp, z); vS.setScalar(s); m4.compose(vP, q0, vS); m.setMatrixAt(i, m4); } m.instanceMatrix.needsUpdate = true; }
      const gG = new THREE.Group(); root.add(gG);
      gG.add(grid(18, 6, 1, 0x7a8fb3, -0.02, 0.2));
      const roadG = new THREE.Mesh(new THREE.BoxGeometry(15, 0.06, 1.8), M(0x374151, { roughness: 0.9 })); roadG.position.set(0, -0.04, 0); gG.add(roadG);
      const dashG = new THREE.Mesh(new THREE.BoxGeometry(15, 0.01, 0.05), new THREE.MeshBasicMaterial({ color: 0xf8fafc })); dashG.position.y = 0.0; gG.add(dashG);
      const gunM = new THREE.Group(); { const b = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.8), M(0x1f2937)); b.position.y = 0.3; gunM.add(b); const h = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.4, 0.8, 20), M(0x64748b)); h.rotation.z = -Math.PI / 2; h.position.set(0.7, 0.9, 0); gunM.add(h); const lg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 0.1), M(0x475569)); lg.position.y = 0.3; gunM.add(lg); } gunM.position.set(-6.4, 0, 0); gG.add(gunM);
      const car = carMk(gG); car.scale.setScalar(1.1); car.rotation.y = Math.PI; car.children.forEach((c) => { if (c.material && c.material.emissive && c.material.emissive.getHex() === 0xff3b30) c.visible = false; });
      const beadS = mkBeads(gG, 130, 0x3b82f6), beadR = mkBeads(gG, 130, 0xf59e0b);
      const arrG = mkArrow(0x16a34a, 0.06); gG.add(arrG);
      const lGg = label('스피드건 (24 GHz)', gunM, { color: '#334155', size: 12 }), lGc = label('', car, { color: '#15803d', size: 12 }), lGs = label('보낸 전파 f₀', [-3, 2.2, 0], { color: '#2563eb', size: 12 }), lGr = label('반사된 전파 f₀ + Δf', [-3, 1.0, 0], { color: '#d97706', size: 12 }), lGd = label('', [-6.4, 2.4, 0], { color: '#1e293b', size: 14 });
      function gunScene(A, S) {
        const u = 10 + S.gun.ui * 5, t = S.gun.t, span = 11.5, cx = 6.2 - (t * u * 0.12) % span, dev = 0.38 * (u / 40), lam0 = 0.9, lamR = lam0 * (1 - dev), df = 2 * 24e9 * u / 3.0e8;
        car.position.set(cx, 0, 0); setArrow(arrG, new V3(cx + 1.0, 0.0 + 1.6, 0), new V3(cx - 1.0, 1.6, 0)); lGc.set('자동차 u = ' + u + ' m/s'); lGc.off = [0, 1.7, 0];
        const x0 = -5.4, x1 = cx - 1.0;
        train(beadS, x0, x1, 2.2, 0, lam0, 0.28, -t * 6); train(beadR, x0, x1, 1.0, 0, lamR, 0.28, t * 6);
        lGg.off = [0, 1.7, 0]; lGd.set('스피드건이 잰 Δf = ' + Math.round(df) + ' Hz');
        info('<b>📡 스피드건</b> · 24 GHz 전파를 쏘고 달려오는 자동차에서 반사된 전파를 비교해요 (u = ' + u + ' m/s)<br>자동차가 받을 때 한 번, 반사할 때 한 번 도플러 효과를 줘서 Δf ≈ 2fu/c 예요.<br>※ 실제 파장 변화는 약 10⁻⁷ 배로 아주 작아서 그림에서는 크게 과장했어요.');
      }
      const gB = new THREE.Group(); root.add(gB);
      const tissue = new THREE.Mesh(new THREE.BoxGeometry(13, 2.4, 4), new THREE.MeshStandardMaterial({ color: 0xf0b8a0, roughness: 0.9, transparent: true, opacity: 0.35, depthWrite: false })); tissue.position.set(0.5, 0, 0); gB.add(tissue);
      const vessel = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 11.5, 36, 1, true), new THREE.MeshStandardMaterial({ color: 0xb53a3a, roughness: 0.4, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false })); vessel.rotation.z = Math.PI / 2; vessel.position.set(1.4, 0, 0); gB.add(vessel);
      const NRB = 30, rbc = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 12, 8), M(0xdc2626, { roughness: 0.4 }), NRB); rbc.frustumCulled = false; gB.add(rbc);
      const probe = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.3, 1.6), M(0x334155)); probe.position.set(-5.2, 0, 0); gB.add(probe);
      const beadSB = mkBeads(gB, 110, 0x3b82f6), beadRB = mkBeads(gB, 110, 0xf59e0b);
      const arrB = mkArrow(0x16a34a, 0.06); gB.add(arrB);
      const lBp = label('탐촉자 (5.0 MHz)', probe, { color: '#334155', size: 12 }), lBu = label('', arrB, { color: '#15803d', size: 12 }), lBs = label('보낸 초음파', [-2, 0.9, 0], { color: '#1d4ed8', size: 12 }), lBr2 = label('반사된 초음파', [-2, -0.1, 0], { color: '#b45309', size: 12 }), lBd = label('', [-5.2, 1.8, 0], { color: '#1e293b', size: 14 });
      function bloodScene(A, S) {
        const u = 0.1 * (S.bl.ui + 1), t = S.bl.t, df = 2 * 5e6 * u / 1540, span = 12;
        for (let i = 0; i < NRB; i++) { const x = 7.2 - ((i * 0.43 + t * u * 3.0) % span), a = i * 2.3; vP.set(x, Math.sin(a) * 0.4, Math.cos(a * 1.7) * 0.4); vS.set(1, 0.55, 1); m4.compose(vP, q0, vS); rbc.setMatrixAt(i, m4); }
        rbc.instanceMatrix.needsUpdate = true;
        setArrow(arrB, new V3(2.8, -1.4, 0), new V3(0.6, -1.4, 0)); lBu.set('혈류 u = ' + u.toFixed(2) + ' m/s'); lBu.obj = [1.7, -1.4, 0];
        const dev = 0.4 * u, lam0 = 0.5, lamR = lam0 * (1 - dev * 0.3);
        train(beadSB, -4.4, 6.6, 0.28, 0, lam0, 0.14, -t * 6); train(beadRB, -4.4, 6.6, -0.28, 0, lamR, 0.14, t * 6);
        lBp.off = [0, 1.1, 0]; lBd.set('측정한 Δf ≈ ' + (df / 1000).toFixed(1) + ' kHz');
        info('<b>🩺 초음파 혈류 측정</b> · 5.0 MHz 초음파가 움직이는 혈액(적혈구)에서 반사돼요<br>Δf ≈ 2fu/v (f = 5.0 MHz, 혈액 속 소리 v = 1540 m/s)<br>초음파가 혈류와 나란하다고 두었어요. ※ 진동수 변화는 크게 과장했어요.');
      }
      /* ================= 🌧️ 기상 레이더 ================= */
      const gR = new THREE.Group(); root.add(gR);
      const RC = PHN ? 9 : 15, RR = 5, RGX = PHN ? 0.95 : 0.62, RGZ = 0.9;
      const cellsR = new THREE.InstancedMesh(new THREE.SphereGeometry(0.26, 14, 10), M(0xffffff, { roughness: 0.6, transparent: true, opacity: 0.9 }), RC * RR); cellsR.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(RC * RR * 3), 3); cellsR.frustumCulled = false; gR.add(cellsR);
      const radarB = new THREE.Group(); { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 0.5, 20), M(0x475569)); b.position.y = 0.25; radarB.add(b); const d = new THREE.Mesh(new THREE.SphereGeometry(0.55, 20, 10, 0, TAU, 0, Math.PI / 2), M(0xe2e8f0, { side: THREE.DoubleSide })); d.position.y = 0.9; d.rotation.x = -Math.PI / 2.4; radarB.add(d); } radarB.position.set(0, 0, (RR - 1) / 2 * RGZ + 1.7); gR.add(radarB);
      gR.add(grid(RC * RGX + 1, RR * RGZ + 3.4, 1, 0x7a8fb3, -0.1, 0.18));
      const obsR = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.04, 8, 32), new THREE.MeshBasicMaterial({ color: 0xf8fafc })); obsR.rotation.x = Math.PI / 2; obsR.position.y = 0.05; gR.add(obsR);
      const beamR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 1), new THREE.MeshBasicMaterial({ color: 0xf8fafc, transparent: true, opacity: 0.6 })); gR.add(beamR);
      const arrR = mkArrow(0x16a34a, 0.07); gR.add(arrR);
      const lRr = label('레이더 (10 GHz)', radarB, { color: '#334155', size: 12 }), lRw = label('', arrR, { color: '#15803d', size: 12 }), lRo = label('', obsR, { color: '#1e293b', size: 13 }), lRb = label('● 레이더 쪽으로 (Δf > 0)', [-3.4, 0, -3.4], { color: '#2563eb', size: 11 }), lRr2 = label('● 멀어짐 (Δf < 0)', [3.0, 0, -3.4], { color: '#e2464b', size: 11 });
      const WD = [[1, 0, '→'], [-1, 0, '←'], [0, -1, '↑'], [0, 1, '↓']], cA = new THREE.Color(0x2563eb), cB = new THREE.Color(0xe2464b), cN = new THREE.Color(0x94a3b8), cT = new THREE.Color(); let keyR = '';
      function radarScene(A, S) {
        const r = S.rd, U = r.ui * 5, di = r.di, wv = WD[di], rx = radarB.position.x, rz = radarB.position.z, key = U + '|' + di;
        const ur = (px, pz) => { const dx = px - rx, dz = pz - rz, d = Math.hypot(dx, dz) || 1; return -(wv[0] * dx + wv[1] * dz) / d * U; };
        if (key !== keyR) {
          keyR = key;
          for (let i = 0; i < RC; i++) for (let j = 0; j < RR; j++) { const px = (i - (RC - 1) / 2) * RGX, pz = (j - (RR - 1) / 2) * RGZ, u = ur(px, pz), m = clamp(Math.abs(u) / 30, 0, 1); cT.copy(Math.abs(u) < 0.5 ? cN : u > 0 ? cA : cB); if (Math.abs(u) >= 0.5) cT.lerp(new THREE.Color(0xf1f5f9), 0.35 - 0.3 * m); m4.makeTranslation(px, 0.26, pz); cellsR.setMatrixAt(i * RR + j, m4); cellsR.setColorAt(i * RR + j, cT); }
          cellsR.instanceMatrix.needsUpdate = true; cellsR.instanceColor.needsUpdate = true;
        }
        const oi = Math.min(RC - 1, ((RC - 1) >> 1) + (PHN ? 3 : 4)), ox = (oi - (RC - 1) / 2) * RGX, oz = (1 - (RR - 1) / 2) * RGZ, up = ur(ox, oz), df = 2 * 10e9 * up / 3.0e8;
        obsR.position.set(ox, 0.05, oz); const dx = ox - rx, dz = oz - rz, dl = Math.hypot(dx, dz); beamR.scale.z = dl; beamR.position.set((ox + rx) / 2, 0.6, (oz + rz) / 2); beamR.rotation.y = Math.atan2(dx, dz);
        if (U > 0) { setArrow(arrR, new V3(-RC * RGX / 2 + 0.2, 1.3, -(RR - 1) / 2 * RGZ - 1.4), new V3(-RC * RGX / 2 + 0.2 + wv[0] * 1.6, 1.3, -(RR - 1) / 2 * RGZ - 1.4 + wv[1] * 1.0)); lRw.set('바람 ' + wv[2] + ' ' + U + ' m/s'); } else { arrR.visible = false; lRw.set('바람 없음'); } lRw.obj = [-RC * RGX / 2 + 0.2, 1.3, -(RR - 1) / 2 * RGZ - 1.4]; lRw.off = [0, 0.5, 0];
        lRo.set('Δf = ' + (df >= 0 ? '+' : '−') + Math.round(Math.abs(df)) + ' Hz'); lRo.off = [0, 0.9, 0]; lRr.off = [0, 1.7, 0];
        lRb.obj = [-RC * RGX / 2 + 0.9, 0, (RR - 1) / 2 * RGZ + 2.6]; lRr2.obj = [RC * RGX / 2 - 1.0, 0, (RR - 1) / 2 * RGZ + 2.6];
        info('<b>🌧️ 기상 레이더</b> · 빗방울에서 반사된 전파의 진동수 변화(10 GHz)로 바람의 속도를 알아요<br>흰 원 지점: 빗방울의 레이더 방향 속도 ' + (up >= 0 ? '+' : '−') + Math.abs(up).toFixed(1) + ' m/s → Δf = ' + (df >= 0 ? '+' : '−') + Math.round(Math.abs(df)) + ' Hz<br>파랑은 레이더 쪽으로, 빨강은 멀어지는 방향이에요.');
      }
      pl = controls.player({ duration: 8, loop: true, autoplay: false, label: '지나가기', phases: [[0, '다가올 때 (높은 소리)'], [0.5, '멀어질 때 (낮은 소리)']], onFrame(p) { demoA.p = p; demoA.on = p > 0 || !!(pl && pl.playing); } });
      pl.row = ctx.renderer.domElement.parentNode.parentNode.querySelector('.v3-player');
      let cur = '';
      const GR = { amb: gA, wf: gW, calc: gC, phone: gP, gun: gG, blood: gB, radar: gR };
      const LB = { amb: [lAmb, lLis, lHz], wf: [lS1, lS2, lSrcs[0], lSrcs[1]].concat(lObs), calc: [lCs, lCo, lCvs, lCvo, lCf], phone: [lPs, lPd, lPp, lPf], gun: [lGg, lGc, lGs, lGr, lGd], blood: [lBp, lBu, lBs, lBr2, lBd], radar: [lRr, lRw, lRo, lRb, lRr2] };
      const CAM = { amb: [0, 0, 0.5, 0.95, 0.15, 15], wf: [5.2, 0, 0, 0.85, 0.1, 17], calc: [4.6, 0, 0.3, 0.85, 0.1, 12], phone: [2.2, 0, 0, 0.95, 0.15, 14], gun: [0, 0.8, 0, 1.15, 0.25, 14], blood: [0.5, 0, 0, 1.2, 0.15, 16], radar: [0, 0, 0.8, 0.95, 0, 12] };
      function setMode(S) {
        const mode = GR[S.mode] ? S.mode : 'amb'; if (mode === cur) return; cur = mode;
        Object.keys(GR).forEach((k) => { GR[k].visible = k === mode; LB[k].forEach((l) => l.show(k === mode)); });
        pl.row.style.display = mode === 'amb' ? '' : 'none'; if (mode !== 'amb') { pl.pause(); pl.set(0); }
        const c = CAM[mode]; Object.assign(orbit, { tx: c[0], ty: c[1], tz: c[2], phi: c[3], theta: c[4], dist: c[5] * KDX });
      }
      return {
        update() {
          const A = sim(); if (!A || !A.S) return; const S = A.S; setMode(S);
          if (!pl.playing && pl.p === 0) demoA.on = false;
          ({ amb: ambScene, wf: wfScene, calc: calcScene, phone: phoneScene, gun: gunScene, blood: bloodScene, radar: radarScene })[cur](A, S);
        },
        sync() {},
      };
    },
  });
})();
