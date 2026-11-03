/* hm-circular-motion · 3D 원운동과 구심력
   2D 실험(window.__sim)의 장면을 그대로 입체로 보여 줘요: 🧊 퍽에 힘 주기 · 📐 구심 가속도(Δv) · 🧵 줄의 장력(F = mv²/r) · 🛣️ 커브 도로의 마찰력 · 🎡 놀이기구(회전 그네 · 관람차 · 로터).
   힘 · 속력 · 반지름은 옆 조작판이 정하고 3D는 따라가요. 원운동에서 속도는 접선 방향, 알짜힘과 가속도는 늘 중심을 향해요. g = 10 m/s². */
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
  const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1), f2 = (v) => (Math.round(v * 100) / 100).toFixed(2);
  const RAD = Math.PI / 180;
  window.SciSim3D.attach({
    title: '원운동과 구심력 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대 · 값은 옆 조작판에서 바꿔요',
    camera: { dist: 13 * KD, theta: 0.3, phi: 0.9, min: 4, max: 40, target: [0, 0, 0] },
    autoRotate: 0,
    levels: [0, 1, 2, 3],
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      const { V3, M, mkArrow, setArrow, tube, grid } = tools(THREE);
      const sim = () => ctx.lesson();
      const G = {}; ['puck', 'dv', 'ball', 'road', 'swing', 'wheel', 'rotor'].forEach((k) => { G[k] = new THREE.Group(); root.add(G[k]); });
      const LAB = {}; const reg = (k, l) => { (LAB[k] = LAB[k] || []).push(l); return l; };
      const rod = (a, b, r, col, op) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 8), new THREE.MeshBasicMaterial({ color: col, transparent: op != null, opacity: op == null ? 1 : op })); m.setA = (p, q) => { const d = new V3().subVectors(q, p), L = d.length(); m.visible = L > 1e-3; if (!m.visible) return; m.scale.set(1, L, 1); m.position.copy(p).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.normalize()); }; return m; };
      const floorMk = (g, r, col) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.12, 64), M(col, { roughness: 0.6 })); m.position.y = -0.07; m.receiveShadow = true; g.add(m); return m; };
      const dir3 = (a) => new V3(Math.cos(a), 0, -Math.sin(a));       // 위에서 본 모습: 2D의 (x, y↑) → 3D의 (x, −z)
      /* ================= 🧊 퍽 (10 m × 10 m 얼음판) ================= */
      const tb = new THREE.Mesh(new THREE.BoxGeometry(10, 0.2, 10), M(0xbfd9f2, { roughness: 0.3 })); tb.position.y = -0.1; tb.receiveShadow = true; G.puck.add(tb);
      G.puck.add(grid(10, 10, 1, 0x5a82af, 0.01, 0.3));
      const puck = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.22, 36), M(0xf59e0b, { roughness: 0.3 })); puck.castShadow = true; G.puck.add(puck);
      const pV = mkArrow(0x2563eb, 0.05), pF = mkArrow(0xe2464b, 0.05); G.puck.add(pV, pF);
      const lpV = reg('puck', label('속도 v', pV, { color: '#2563eb', size: 12 })), lpF = reg('puck', label('힘 F', pF, { color: '#e2464b', size: 12 }));
      const pTrail = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: 0x2563eb })); void pTrail;
      let pTrKey = '', pTr = null;
      const demoP = { p: 0, on: false };
      const toP = (x, y) => new V3(x - 5, 0.13, -(y - 5));
      function puckScene(A, S) {
        const P = S.pk; let x = P.x, y = P.y, th = P.th, v = P.v, hd = P.hd, F = P.F, phi = P.phi;
        if (demoP.on && !P.run) { F = clamp(F, 2.5, 6); const R = PUCK_V * PUCK_V / F, q = demoP.p * TAU; th = q; v = PUCK_V; phi = 90; hd = q; x = 5 + R * Math.sin(q); y = 0.6 + R * (1 - Math.cos(q)); }
        puck.position.copy(toP(x, y));
        const tp = puck.position.clone(); tp.y = 0.4;
        setArrow(pV, tp, tp.clone().addScaledVector(dir3(th), v * 0.55)); lpV.obj = tp.clone().addScaledVector(dir3(th), v * 0.55); lpV.off = [0, 0.3, 0];
        const fd = dir3(th + phi * RAD); setArrow(pF, tp, tp.clone().addScaledVector(fd, F * 0.5)); lpF.obj = tp.clone().addScaledVector(fd, F * 0.5); lpF.off = [0, 0.3, 0];
        const tr = demoP.on && !P.run ? [] : P.trail; const key = tr.length + '|' + (tr.length ? tr[tr.length - 1].join(',') : '');
        if (key !== pTrKey) { pTrKey = key; if (pTr) { G.puck.remove(pTr); pTr.geometry.dispose(); pTr = null; } if (tr.length > 1) { pTr = tube(tr.map((q) => toP(q[0], q[1]).setY(0.05)), 0.04, 0x2563eb, { basic: true, op: 0.7 }); G.puck.add(pTr); } }
        const nm = { 0: '같은 방향', 180: '반대 방향', 90: '수직', 45: '비스듬히(45°)' }[phi] || phi + '°';
        info('<b>🧊 퍽(1 kg)에 힘 주기</b> · 처음 속력 ' + A.PUCK_V0 + ' m/s<br>힘 F = ' + F + ' N · 힘의 방향: 속도와 <b>' + nm + '</b><br>속력 v = ' + f1(v) + ' m/s' + (Math.abs(hd) > 0.01 ? ' · 방향이 ' + Math.round(Math.abs(hd) / RAD) + '° 바뀌었어요' : '') + '<br>' + (phi === 90 ? '힘이 늘 속도에 <b>수직</b>이면 속력은 그대로이고 방향만 바뀌어 <b>원운동</b>을 해요.' : (phi === 0 || phi === 180 ? '힘이 속도와 나란하면 속력만 변하고 방향은 그대로예요.' : '힘의 속도 방향 성분은 속력을, 수직 성분은 방향을 바꿔요.')) + '<br><span style="opacity:.8">힘의 크기와 방향은 옆 조작판에서 바꿔요.</span>');
      }
      const PUCK_V = 3;
      /* ================= 📐 구심 가속도 (Δv 작도) ================= */
      const dvRing = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 8, 120), new THREE.MeshBasicMaterial({ color: 0x9db1cf })); dvRing.rotation.x = Math.PI / 2; G.dv.add(dvRing);
      const dvFloor = floorMk(G.dv, 4.2, 0x56718f);
      const b0 = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14), M(0xf59e0b)), b1 = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14), new THREE.MeshStandardMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.45 })); G.dv.add(b0, b1);
      const dv0 = mkArrow(0x2563eb, 0.05), dv1 = mkArrow(0x60a5fa, 0.05), dvd = mkArrow(0xe2464b, 0.06), dva = mkArrow(0x14a058, 0.05); G.dv.add(dv0, dv1, dvd, dva);
      const rr0 = rod(new V3(), new V3(), 0.012, 0x5a6679, 0.7), rr1 = rod(new V3(), new V3(), 0.012, 0x5a6679, 0.7); G.dv.add(rr0, rr1);
      const ldv0 = reg('dv', label('v (지금)', dv0, { color: '#2563eb', size: 12 })), ldv1 = reg('dv', label('v′ (Δt 뒤)', dv1, { color: '#3b82f6', size: 12 })), ldvd = reg('dv', label('Δv', dvd, { color: '#e2464b', size: 13 })), ldva = reg('dv', label('가속도 a', dva, { color: '#14a058', size: 12 }));
      const tail = new V3(5.2, 0.05, 0);
      const demoD = { p: 0, on: false };
      function dvScene(A, S) {
        const d = S.dv, r = d.r * 1.0, c = A.dvCalc ? A.dvCalc() : null; let dtv = d.dt, th = d.th, dth = d.dth;
        if (demoD.on) { dtv = 1.0 - 0.95 * demoD.p; dth = d.v / d.r * dtv; }
        const R = r * 1.3;
        dvRing.scale.set(R, R, 1);
        const p0 = new V3(R * Math.cos(th), 0.2, -R * Math.sin(th)), p1 = new V3(R * Math.cos(th + dth), 0.2, -R * Math.sin(th + dth));
        b0.position.copy(p0); b1.position.copy(p1);
        const sv = 0.5, t0 = new V3(-Math.sin(th), 0, -Math.cos(th)), t1 = new V3(-Math.sin(th + dth), 0, -Math.cos(th + dth));
        setArrow(dv0, p0, p0.clone().addScaledVector(t0, d.v * sv)); setArrow(dv1, p1, p1.clone().addScaledVector(t1, d.v * sv));
        const tt = tail.clone(); const e0 = tt.clone().addScaledVector(t0, d.v * sv), e1 = tt.clone().addScaledVector(t1, d.v * sv);
        // 같은 점에서 시작하는 v와 v′ (오른쪽 그림), Δv = v′ − v
        const o = new V3(4.2, 0.05, -2.5), ev = o.clone().addScaledVector(t0, d.v * sv), ev2 = o.clone().addScaledVector(t1, d.v * sv);
        rr0.setA(p0.clone().setY(0.05), new V3(0, 0.05, 0)); rr1.setA(p1.clone().setY(0.05), new V3(0, 0.05, 0));
        setArrow(dvd, ev, ev2); void e0; void e1; void tt;
        const ac = p0.clone().multiplyScalar(-1).normalize(); ac.y = 0;
        setArrow(dva, p0, p0.clone().addScaledVector(ac, d.v * d.v / d.r * 0.25));
        ldv0.obj = p0.clone().addScaledVector(t0, d.v * sv * 0.6); ldv1.obj = p1.clone().addScaledVector(t1, d.v * sv * 0.6); ldvd.obj = ev.clone().lerp(ev2, 0.5); ldvd.off = [0, 0.4, 0]; ldva.obj = p0.clone().addScaledVector(ac, 0.6); ldva.off = [0, 0.3, 0];
        const dvm = 2 * d.v * Math.sin(dth / 2), off = dth / 2 / RAD;
        info('<b>📐 구심 가속도: Δv 작도</b> · v = ' + d.v + ' m/s · r = ' + d.r + ' m · Δt = ' + dtv.toFixed(2) + ' s<br>짧은 시간 Δt 동안 속도는 방향이 ' + Math.round(dth / RAD) + '° 바뀌어요. Δv(빨강)는 v와 v′의 차이예요.<br>Δv가 <b>중심 방향에서 벗어난 각</b> = ' + off.toFixed(1) + '° → Δt를 줄일수록 Δv는 중심을 향해요 (가속도의 방향 = 중심).<br><span style="opacity:.8">v · r · Δt는 옆 조작판에서 바꿔요.</span>');
      }
      /* ================= 🧵 줄에 매단 공 (위에서 본 모습, 1 m = 3칸) ================= */
      const ballFloor = floorMk(G.ball, 4.4, 0x56718f);
      const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.34, 20), M(0x64748b, { metalness: 0.5 })); peg.position.y = 0.17; G.ball.add(peg);
      const bring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 8, 96), new THREE.MeshBasicMaterial({ color: 0x9db1cf, transparent: true, opacity: 0.8 })); bring.rotation.x = Math.PI / 2; bring.position.y = 0.02; G.ball.add(bring);
      const ballM = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 16), M(0xe2464b, { roughness: 0.3 })); ballM.castShadow = true; G.ball.add(ballM);
      const strg = rod(new V3(), new V3(), 0.02, 0xf4f1e6); G.ball.add(strg);
      const bV = mkArrow(0x2563eb, 0.05), bF = mkArrow(0xe2464b, 0.05); G.ball.add(bV, bF);
      const lbV = reg('ball', label('속도 v', bV, { color: '#2563eb', size: 12 })), lbF = reg('ball', label('', bF, { color: '#e2464b', size: 12 }));
      function ballScene(A, S) {
        const b = S.bl, U = 3, R = b.r * U; const L = A.blL();
        let pos, cutOn = b.cut;
        if (!cutOn) pos = new V3(R * Math.cos(b.ang), 0.22, -R * Math.sin(b.ang)); else pos = new V3((b.bx - L.cx) / L.sc * U, 0.22, (b.by - L.cy) / L.sc * U);
        ballM.position.copy(pos); bring.scale.set(R, R, 1); bring.visible = true;
        strg.visible = !cutOn; if (!cutOn) strg.setA(new V3(0, 0.2, 0), pos.clone().setY(0.2));
        const t = new V3(-Math.sin(b.ang), 0, -Math.cos(b.ang)), pa = pos.clone().setY(0.55);
        setArrow(bV, pa, pa.clone().addScaledVector(cutOn ? new V3(b.cvx, 0, b.cvy).normalize() : t, b.v * 0.35)); lbV.obj = pa.clone().addScaledVector(t, b.v * 0.35); lbV.off = [0, 0.3, 0];
        const Fn = b.m * b.v * b.v / b.r;
        if (!cutOn) { setArrow(bF, pa, pa.clone().addScaledVector(pos.clone().setY(0).multiplyScalar(-1).normalize(), 0.4 + Fn * 0.12)); lbF.obj = pa.clone().addScaledVector(pos.clone().setY(0).multiplyScalar(-1).normalize(), 0.4 + Fn * 0.12); lbF.set('장력 F = ' + f1(Fn) + ' N'); lbF.off = [0, 0.3, 0]; lbF.show(true); } else { bF.visible = false; lbF.show(false); }
        info('<b>🧵 줄의 장력이 구심력이에요</b> · 공 m = ' + b.m.toFixed(2) + ' kg · r = ' + b.r.toFixed(1) + ' m · v = ' + b.v.toFixed(1) + ' m/s<br>' + (cutOn ? '줄이 끊어졌어요: 구심력이 사라져 <b>접선 방향으로 직진</b>해요 (관성).' : '장력 F = mv²/r = ' + f1(Fn) + ' N · 속도는 접선 방향, 힘은 중심 방향<br>v를 바꾸며 F를 기록하면 F–v² 그래프가 <b>직선</b>이에요 (기울기 m/r).') + '<br><span style="opacity:.8">m · r · v와 줄 끊기는 옆 조작판에서 해요.</span>');
      }
      /* ================= 🛣️ 커브 도로 (반지름 50 m, 1 m = 0.1칸) ================= */
      const roadArc = new THREE.Mesh(new THREE.TorusGeometry(5, 0.35, 6, 120), M(0x475569, { roughness: 0.9 })); roadArc.rotation.x = Math.PI / 2; G.road.add(roadArc);
      const grass = floorMk(G.road, 8.5, 0x3f6f4a);
      const car = new THREE.Group(); { const b = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.28, 0.4), M(0xe2464b, { roughness: 0.3 })); b.position.y = 0.3; b.castShadow = true; car.add(b); const cab = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.2, 0.34), M(0xbfdbfe)); cab.position.set(-0.05, 0.52, 0); car.add(cab); } G.road.add(car);
      const rF = mkArrow(0xe2464b, 0.05), rV = mkArrow(0x2563eb, 0.05); G.road.add(rF, rV);
      const lrF = reg('road', label('마찰력 (구심력)', rF, { color: '#e2464b', size: 12 })), lrV = reg('road', label('속도 v', rV, { color: '#2563eb', size: 12 })), lrC = reg('road', label('커브 반지름 50 m', [0, 0.1, -5.4], { color: '#475569', size: 12 }));
      let rdTr = null, rdKey = '';
      function roadScene(A, S) {
        const r = S.rd, L = A.rdL(), v = r.kmh / 3.6; const U = 0.1 / L.sc * (L.sc);   // 2D 픽셀 → m → 칸
        const toM = (px, py) => new V3((px - L.cx) / L.sc * 0.1, 0.1, (py - L.cy) / L.sc * 0.1);
        const p = toM(r.x, r.y);
        const ang = r.skid ? Math.atan2(r.vy, r.vx) : null; const tdir = r.skid ? new V3(r.vx, 0, r.vy).normalize() : new V3(-Math.sin(r.ang), 0, -Math.cos(r.ang));
        car.position.copy(p); car.rotation.y = Math.atan2(-tdir.z, tdir.x);
        const pa = p.clone().setY(0.8); const inw = r.skid ? null : new V3(-p.x, 0, -p.z).normalize();
        setArrow(rV, pa, pa.clone().addScaledVector(tdir, (r.skid ? r.sp : v) * 0.08)); lrV.obj = pa.clone().addScaledVector(tdir, (r.skid ? r.sp : v) * 0.08);
        if (inw) { setArrow(rF, pa, pa.clone().addScaledVector(inw, 0.5 + r.mu * 1.4)); lrF.obj = pa.clone().addScaledVector(inw, 0.5 + r.mu * 1.4); lrF.show(true); } else { rF.visible = false; lrF.show(false); }
        lrV.off = [0, 0.3, 0]; lrF.off = [0, 0.3, 0];
        const key = r.trail.length + '|' + r.skid; if (key !== rdKey) { rdKey = key; if (rdTr) { G.road.remove(rdTr); rdTr.geometry.dispose(); rdTr = null; } if (r.trail.length > 1) { rdTr = tube(r.trail.map((q) => toM(q[0], q[1]).setY(0.08)), 0.04, 0xfacc15, { basic: true, op: 0.8 }); G.road.add(rdTr); } }
        const hide = A.eff('hideLim');
        info('<b>🛣️ 커브 도로: 마찰력이 구심력이에요</b> · 반지름 50 m · 자동차 1000 kg<br>도로 마찰 계수 μ = ' + r.mu + ' · 속력 ' + r.kmh + ' km/h (' + f1(v) + ' m/s)<br>' + (r.skid ? '🚨 마찰력이 모자라 <b>미끄러져요</b>: 접선 방향으로 바깥쪽으로 나가요.' : '마찰력이 구심력(mv²/r)을 충분히 내고 있어 커브를 돌아요.') + (hide ? '' : '<br>한계 속력 = ' + f1(A.rdVmax(r.mu) * 3.6) + ' km/h') + '<br><span style="opacity:.8">도로 상태와 속력은 옆 조작판에서 바꿔요.</span>');
      }
      /* ================= 🎡 회전 그네 (1 m = 0.45칸) ================= */
      const UH = 0.45;
      const swFloor = floorMk(G.swing, 6, 0x2a4a5e);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 11 * UH, 20), M(0x64748b, { metalness: 0.5 })); mast.position.y = 11 * UH / 2; G.swing.add(mast);
      const swTop = new THREE.Group(); swTop.position.y = 11 * UH; G.swing.add(swTop);
      const swCap = new THREE.Mesh(new THREE.CylinderGeometry(3.0 * UH + 0.2, 3.0 * UH + 0.2, 0.15, 40), M(0xe2464b)); swTop.add(swCap);
      const seats = []; for (let i = 0; i < 6; i++) { const a = i / 6 * TAU, g = new THREE.Group(); g.rotation.y = a; swTop.add(g); const sw = new THREE.Group(); sw.position.x = 3.0 * UH; g.add(sw); const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1, 6), M(0xe5e7eb)); ch.scale.y = 4.47 * UH; ch.position.y = -4.47 * UH / 2; sw.add(ch); const seat = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.1, 0.4), M([0x4c8dff, 0xffb020, 0x34c38f][i % 3])); seat.position.y = -4.47 * UH; sw.add(seat); const man = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), M(0xfcd9b6)); man.position.y = -4.47 * UH + 0.3; sw.add(man); seats.push(sw); }
      const sT = mkArrow(0xe2464b, 0.04), sW = mkArrow(0xffd34d, 0.04), sC = mkArrow(0x34d399, 0.04); G.swing.add(sT, sW, sC);
      const lsT = reg('swing', label('장력 T', sT, { color: '#e2464b', size: 12 })), lsW = reg('swing', label('중력 mg', sW, { color: '#a16207', size: 12 })), lsC = reg('swing', label('알짜힘 = 구심력', sC, { color: '#0f8a5f', size: 12 }));
      function swingScene(A, S) {
        const w = S.sw, sv = A.swing(w.w); const th = sv.th;
        swTop.rotation.y = w.phi * 0 + (swTop.rotation.y + 0); swTop.rotation.y = w.phi; seats.forEach((s) => { s.rotation.z = th; });
        const a0 = swTop.rotation.y, att = new V3(3.0 * UH, 11 * UH, 0).applyAxisAngle(new V3(0, 1, 0), a0), hang = new V3(3.0 * UH + 4.47 * UH * Math.sin(th), 11 * UH - 4.47 * UH * Math.cos(th) - 0.1, 0).applyAxisAngle(new V3(0, 1, 0), a0);
        const Td = att.clone().sub(hang).normalize(), out = new V3(Math.cos(a0), 0, -Math.sin(a0)), inw = out.clone().multiplyScalar(-1);
        setArrow(sT, hang, hang.clone().addScaledVector(Td, 1.6)); lsT.obj = hang.clone().addScaledVector(Td, 1.6);
        setArrow(sW, hang, hang.clone().add(new V3(0, -1.1, 0))); lsW.obj = hang.clone().add(new V3(0, -1.2, 0));
        setArrow(sC, hang, hang.clone().addScaledVector(inw, 0.5 + w.w * w.w * 0.6)); lsC.obj = hang.clone().addScaledVector(inw, 0.5 + w.w * w.w * 0.6); lsC.off = [0, 0.25, 0];
        const hide = A.eff('hideTh') || A.eff('hideA');
        info('<b>🎡 회전 그네</b> · 회전 빠르기 ω = ' + f1(w.w) + ' rad/s' + (hide ? '' : ' · 반지름 r = ' + f1(sv.r) + ' m · 줄이 수직과 이루는 각 θ = ' + (th / RAD).toFixed(1) + '°') + '<br>장력의 연직 성분은 중력과 균형, <b>수평 성분이 구심력</b>이에요. ω가 커질수록 바깥으로 더 벌어져요.<br><span style="opacity:.8">ω는 옆 조작판에서 바꿔요.</span>');
      }
      /* ================= 🎡 관람차 (반지름 10 m, 1 m = 0.4칸) ================= */
      const UW = 0.4;
      const whWheel = new THREE.Mesh(new THREE.TorusGeometry(10 * UW, 0.07, 8, 96), M(0x7b869a)); G.wheel.add(whWheel); whWheel.position.y = 10 * UW + 0.8;
      const whSt = [-1, 1].map((s) => { const m = rod(new V3(), new V3(), 0.07, 0x8b97ad); m.setA(new V3(s * 1.6, 0, 0), new V3(0, 10 * UW + 0.8, 0)); G.wheel.add(m); return m; });
      const whGround = new THREE.Mesh(new THREE.BoxGeometry(14, 0.1, 6), M(0x8fc47a)); whGround.position.y = -0.05; G.wheel.add(whGround);
      const gond = []; for (let k = 0; k < 12; k++) { const g = new THREE.Group(); const c = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.5), M(k === 0 ? 0xe2464b : 0x4c8dff)); c.position.y = -0.3; g.add(c); G.wheel.add(g); gond.push(g); }
      const wV = mkArrow(0x2563eb, 0.05), wN = mkArrow(0xe2464b, 0.05), wG = mkArrow(0xffd34d, 0.05); G.wheel.add(wV, wN, wG);
      const lwN = reg('wheel', label('', wN, { color: '#e2464b', size: 12 })), lwG = reg('wheel', label('중력 mg', wG, { color: '#a16207', size: 12 })), lwV = reg('wheel', label('속도 v', wV, { color: '#2563eb', size: 12 })), lwMe = reg('wheel', label('나', gond[0], { color: '#e2464b', size: 12 }));
      const demoW = { p: 0, on: false };
      function wheelScene(A, S) {
        const w = S.wh, Rw = 10 * UW, cy = Rw + 0.8; const psi = w.psi;
        gond.forEach((g, k) => { const t = psi + k * TAU / 12; g.position.set(Rw * Math.cos(t), cy + Rw * Math.sin(t), 0); });
        const me = gond[0].position, t = psi, tv = new V3(-Math.sin(t), Math.cos(t), 0);
        setArrow(wV, me.clone().add(new V3(0, 0.1, 0.4)), me.clone().add(new V3(0, 0.1, 0.4)).addScaledVector(tv, w.v * 0.3)); lwV.obj = me.clone().addScaledVector(tv, w.v * 0.3).add(new V3(0, 0.1, 0.4));
        const az = A.whAz(w.v, psi), hide = A.eff('hideN') || A.eff('hideA');
        setArrow(wG, me.clone().add(new V3(0.5, 0, 0.4)), me.clone().add(new V3(0.5, -1.0, 0.4))); lwG.obj = me.clone().add(new V3(0.6, -1.1, 0.4));
        setArrow(wN, me.clone().add(new V3(-0.5, 0, 0.4)), me.clone().add(new V3(-0.5, 0.35 + Math.max(0, az) * 1.0, 0.4))); lwN.obj = me.clone().add(new V3(-0.5, 0.5 + Math.max(0, az), 0.4)); lwN.set(hide ? '좌석이 나를 미는 힘 N' : 'N = ' + f2(az) + ' mg');
        lwMe.off = [0, -0.7, 0]; lwV.off = [0.4, 0.3, 0]; lwG.off = [0.3, 0, 0]; lwN.off = [-0.4, 0.2, 0];
        info('<b>🎡 관람차</b> · 반지름 ' + A.WH_R + ' m · 속력 ' + f1(w.v) + ' m/s<br>빨간 곤돌라(나)의 스마트폰 연직 센서' + (hide ? '를 읽어 좌석이 미는 힘을 구해요 (최저점 · 최고점에서 다르게 느껴져요).' : ' = <b>' + f2(az) + ' g</b> (1 g = 가만히 있을 때)') + '<br>최저점에서는 센서 값이 커지고, 최고점에서는 작아져요 (원운동의 구심 가속도 때문).<br><span style="opacity:.8">속력은 옆 조작판에서 바꿔요.</span>');
      }
      /* ================= 🎡 로터 (반지름 2 m, 1 m = 0.9칸) ================= */
      const UR = 0.9, ROH = 5;
      const roFloor = new THREE.Mesh(new THREE.CylinderGeometry(2 * UR + 0.3, 2 * UR + 0.3, 0.1, 48), M(0x2a4a5e, { roughness: 1 })); roFloor.position.y = -0.05; G.rotor.add(roFloor);
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(2 * UR, 2 * UR, ROH * UR, 48, 1, true), new THREE.MeshStandardMaterial({ color: 0xb0b8c8, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false })); drum.position.y = ROH * UR / 2; G.rotor.add(drum);
      const drumRing = new THREE.Mesh(new THREE.TorusGeometry(2 * UR, 0.05, 8, 64), M(0x64748b)); drumRing.rotation.x = Math.PI / 2; drumRing.position.y = ROH * UR; G.rotor.add(drumRing);
      const rFloor = new THREE.Mesh(new THREE.CylinderGeometry(2 * UR - 0.05, 2 * UR - 0.05, 0.12, 48), M(0x8a6a44)); G.rotor.add(rFloor);
      const person = new THREE.Group(); { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.8, 12), M(0xff9a6a)); b.position.y = 0.45; person.add(b); const h = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10), M(0xffd9b5)); h.position.y = 1.0; person.add(h); } G.rotor.add(person);
      const oN = mkArrow(0x14a058, 0.05), oF = mkArrow(0xe2464b, 0.05), oG = mkArrow(0xffd34d, 0.05); G.rotor.add(oN, oF, oG);
      const loN = reg('rotor', label('벽이 미는 힘 N (구심력)', oN, { color: '#14a058', size: 12 })), loF = reg('rotor', label('마찰력 f', oF, { color: '#e2464b', size: 12 })), loG = reg('rotor', label('중력 mg', oG, { color: '#a16207', size: 12 }));
      function rotorScene(A, S) {
        const r = S.ro, H = r.fy * UR, ang = r.ang;
        rFloor.position.y = r.floorH * UR - 0.06; drum.rotation.y = ang;
        const rad = 2 * UR - 0.35; person.position.set(rad * Math.cos(ang), H, -rad * Math.sin(ang)); person.rotation.y = ang;
        const P0 = person.position.clone().add(new V3(0, 0.5, 0)), inw = new V3(-Math.cos(ang), 0, Math.sin(ang));
        const Nn = 50 * r.w * r.w * 2, fmax = r.mu * Nn;
        setArrow(oN, P0, P0.clone().addScaledVector(inw, 0.5 + r.w * r.w * 0.12)); loN.obj = P0.clone().addScaledVector(inw, 0.5 + r.w * r.w * 0.12);
        setArrow(oG, P0.clone().add(new V3(0, -0.2, 0)), P0.clone().add(new V3(0, -1.2, 0))); loG.obj = P0.clone().add(new V3(0, -1.3, 0));
        const sl = fmax >= 50 * 10 - 1e-9; setArrow(oF, P0.clone().add(new V3(0, 0.2, 0)), P0.clone().add(new V3(0, 0.2 + Math.min(1.2, fmax / 500), 0))); loF.obj = P0.clone().add(new V3(0, 0.3 + Math.min(1.2, fmax / 500), 0));
        const hide = A.eff('hideLim') || A.eff('hideN');
        info('<b>🎡 로터</b> · 반지름 ' + A.RO_R + ' m · 사람 50 kg · 벽 마찰 계수 μ = ' + r.mu + '<br>ω = ' + f1(r.w) + ' rad/s' + (hide ? '' : ' · 벽이 미는 힘 N = mω²r = ' + Math.round(Nn) + ' N · 최대 정지 마찰력 μN = ' + Math.round(fmax) + ' N (중력 500 N)') + '<br>' + (r.st === 'stuck' ? '마찰력이 중력을 이겨 사람이 벽에 <b>붙어 있어요</b>.' : r.st === 'slide' ? '마찰력이 모자라 사람이 <b>미끄러져요</b>.' : r.st === 'down' ? '바닥까지 내려왔어요.' : '바닥을 내려 사람이 벽에 붙는지 확인해 보세요 (옆 조작판).') + '<br><span style="opacity:.8">ω · 마찰 계수 · 바닥 내리기는 옆 조작판에서 해요.</span>');
      }
      /* ================= 장면 · ▶ 재생 ================= */
      const PL = {}; let cur = '';
      PL.puck = controls.player({ duration: 6, loop: true, autoplay: false, label: '힘을 수직으로', phases: [[0, '힘이 늘 속도에 수직 → 원운동']], onFrame(p) { demoP.p = p; demoP.on = p > 0 || !!(PL.puck && PL.puck.playing); } });
      PL.dv = controls.player({ duration: 8, loop: true, autoplay: false, label: 'Δt 줄이기', phases: [[0, 'Δt가 길 때 (Δv가 비스듬해요)'], [0.6, 'Δt를 줄이면 Δv가 중심을 향해요']], onFrame(p) { demoD.p = p; demoD.on = p > 0 || !!(PL.dv && PL.dv.playing); } });
      const rows = [...ctx.renderer.domElement.parentNode.parentNode.querySelectorAll('.v3-player')]; PL.puck.row = rows[0]; PL.dv.row = rows[1];
      const NOTE = '';
      function setMode(S) {
        const mode = S.mode; if (mode === cur) return; cur = mode;
        Object.keys(G).forEach((k) => (G[k].visible = k === mode));
        Object.keys(LAB).forEach((k) => LAB[k].forEach((l) => l.show(k === mode)));
        Object.keys(PL).forEach((k) => { PL[k].row.style.display = k === mode ? '' : 'none'; if (k !== mode) { PL[k].pause(); PL[k].set(0); } });
        const cams = { puck: { tx: 0, ty: 0, tz: 0, phi: 0.95, theta: 0.15, dist: 13 }, dv: { tx: 2, ty: 0, tz: -1, phi: 0.95, theta: 0.1, dist: 13 }, ball: { tx: 0, ty: 0, tz: 0, phi: 0.9, theta: 0.2, dist: 10 }, road: { tx: 0, ty: 0, tz: 0, phi: 0.9, theta: 0.2, dist: 14 }, swing: { tx: 0, ty: 2.4, tz: 0, phi: 1.25, theta: 0.3, dist: 12 }, wheel: { tx: 0, ty: 4.5, tz: 0, phi: 1.4, theta: 0.2, dist: 17 }, rotor: { tx: 0, ty: 1.6, tz: 0, phi: 1.2, theta: 0.4, dist: 9 } };
        const c = cams[mode]; if (c) Object.assign(orbit, c, { dist: c.dist * KD });
      }
      return {
        update(dt) {
          const A = sim(); if (!A || !A.S) return; const S = A.S;
          setMode(S);
          if (S.mode === 'puck') { if (S.pk.run && PL.puck.playing) PL.puck.pause(); if (!PL.puck.playing && PL.puck.p === 0) demoP.on = false; puckScene(A, S); }
          else if (S.mode === 'dv') { if (!PL.dv.playing && PL.dv.p === 0) demoD.on = false; dvScene(A, S); }
          else if (S.mode === 'ball') ballScene(A, S);
          else if (S.mode === 'road') roadScene(A, S);
          else if (S.mode === 'swing') swingScene(A, S);
          else if (S.mode === 'wheel') wheelScene(A, S);
          else if (S.mode === 'rotor') rotorScene(A, S);
        },
        sync() {},
      };
    },
  });
})();
