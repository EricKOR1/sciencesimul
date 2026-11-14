/* hm-spring-shm · 3D 용수철 진자와 단진동
   2D 실험(window.__sim)의 진자를 그대로 입체로 보여 줘요: 🌀 진자 관찰 · 🧲 복원력(F = −kx) · ⏱️ 주기(질량 · 용수철 상수 · 진폭) · 📈 에너지와 위상.
   수평·수직 용수철, 질량 m, 용수철 상수 k, 진폭은 옆 조작판이 정하고 3D는 따라가요. 변위 x는 평형점 O에서 재요. */
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
  const KDX = PHN ? 1.2 : 1;
  const f2 = (v) => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(2);
  window.SciSim3D.attach({
    title: '용수철 진자 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대 · 값은 옆 조작판에서 바꿔요',
    camera: { dist: 12 * KDX, theta: 0.4, phi: 1.3, min: 4, max: 30, target: [0, 0, 0] },
    autoRotate: 0,
    levels: [2],   // ①②④는 캔버스의 x–t · a–x · 세 그래프를 읽어야 해서 2D예요
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      const { V3, M, mkArrow, setArrow } = tools(THREE);
      const sim = () => ctx.lesson();
      const U = 10;
      const floor = new THREE.Mesh(new THREE.BoxGeometry(14, 0.1, 3), ctx.mats.wood(0x8a6a4a, { repeat: 3 })); floor.position.set(0, -0.06, 0); floor.userData.v3bg = true; root.add(floor);   // 긴 바닥판은 배경: 자동 맞춤은 벽 · 용수철 · 추를 크게
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.8, 1.4), ctx.mats.metal('steel', { brushed: true })); root.add(wall);
      const ceil = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.25, 1.4), ctx.mats.metal('steel', { brushed: true })); root.add(ceil);
      const blk = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), ctx.mats.metal('brass', { roughness: 0.28 })); blk.castShadow = true; root.add(blk);
      const springM = new THREE.Mesh(new THREE.BufferGeometry(), ctx.mats.metal('chrome', { roughness: 0.18 })); root.add(springM);
      const eq = new THREE.Mesh(new THREE.BoxGeometry(0.03, 2.4, 0.03), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 })); root.add(eq);
      const eqH = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.03, 0.03), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 })); root.add(eqH);
      const aV = mkArrow(0x2563eb, 0.05), aA = mkArrow(0xe2464b, 0.05); root.add(aV, aA);
      const lO = label('평형점 O', [0, 0, 0], { color: '#475569', size: 12 }), lV = label('속도 v', aV, { color: '#2563eb', size: 12 }), lA = label('가속도 a', aA, { color: '#e2464b', size: 12 }), lM = label('', blk, { color: '#b45309', size: 12 });
      const mkEnd = () => new THREE.Mesh(new THREE.BoxGeometry(0.03, 2, 0.03), new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0.55 }));
      const endA = mkEnd(), endB = mkEnd(); root.add(endA, endB);
      const demo = { p: 0, on: false }; let pl = null, skey = '';
      function coil(p0, p1, n, r) { const pts = [], N = 80, d = p1.clone().sub(p0), L = d.length(); const u = d.clone().normalize(); const side = Math.abs(u.y) > 0.9 ? new V3(1, 0, 0) : new V3(0, 1, 0), w = new V3().crossVectors(u, side).normalize(), v = new V3().crossVectors(u, w).normalize(); for (let i = 0; i <= N; i++) { const t = i / N, a = t * n * Math.PI * 2, e = Math.min(1, Math.min(t, 1 - t) * 8); pts.push(p0.clone().addScaledVector(u, t * L).addScaledVector(w, Math.cos(a) * r * e).addScaledVector(v, Math.sin(a) * r * e)); } return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.035, 5, false); }
      let lastTxt = '';
      function scene(A, S) {
        const o = S.o, os = A.osc(); let x = os.x, v = os.v, a = os.a;
        if (demo.on) { const w = os.w, x0 = o.x0, q = demo.p * Math.PI * 2; x = x0 * Math.cos(q); v = -x0 * w * Math.sin(q); a = -w * w * x; }
        const vert = o.orient === 'v', m = o.m, k = o.k, side = 0.45 + Math.min(0.5, m * 0.35);
        blk.scale.set(side, side, side); wall.visible = !vert; ceil.visible = vert;
        let bx, by;
        if (!vert) { bx = x * U; by = side / 2; wall.position.set(-4.4, 0.9, 0); springKey(new V3(-4.25, by, 0), new V3(bx - side / 2, by, 0)); eq.position.set(0, 1.0, 0); eq.visible = true; eqH.visible = false; endA.position.set(o.x0 * U, 1, 0); endB.position.set(-o.x0 * U, 1, 0); endA.rotation.z = endB.rotation.z = 0; }
        else { bx = 0; by = 1.6 - x * U; ceil.position.set(0, 4.3, 0); springKey(new V3(0, 4.15, 0), new V3(0, by + side / 2, 0)); eq.visible = false; eqH.visible = true; eqH.position.set(0, 1.6, 0); endA.position.set(0, 1.6 + o.x0 * U, 0); endB.position.set(0, 1.6 - o.x0 * U, 0); endA.rotation.z = endB.rotation.z = Math.PI / 2; endA.scale.y = endB.scale.y = 0.6; }
        if (!vert) endA.scale.y = endB.scale.y = 1;
        blk.position.set(bx, by, 0); lM.set(m + ' kg'); lM.off = [0, side / 2 + 0.4, 0];
        lO.obj = vert ? [1.3, 1.6, 0] : [0, 0, 0]; lO.off = vert ? [0, 0, 0] : [0, 0, 0]; if (!vert) lO.obj = [0, 0.0, 0.8];
        const dirV = vert ? new V3(0, -1, 0) : new V3(1, 0, 0), c = new V3(bx, by, 0).add(new V3(0, vert ? 0 : side / 2 + 0.5, 0)).add(vert ? new V3(side / 2 + 0.5, 0, 0) : new V3());
        setArrow(aV, c, c.clone().addScaledVector(dirV, v * 3)); setArrow(aA, c.clone().add(new V3(0, vert ? 0 : 0.5, vert ? 0.5 : 0)), c.clone().add(new V3(0, vert ? 0 : 0.5, vert ? 0.5 : 0)).addScaledVector(dirV, a * 0.12));
        lV.off = [0, 0.3, 0]; lA.off = [0, 0.3, 0];
        const mode = S.mode; let t2 = '<b>🌀 용수철 진자 · ' + (vert ? '수직' : '수평') + '</b> · m = ' + m + ' kg · k = ' + k + ' N/m' + (vert ? ' · g = ' + o.g + ' m/s²' : '') + '<br>변위 x = <b>' + f2(x) + ' m</b> (평형점 O 기준) · 속도 v = ' + f2(v) + ' m/s · 가속도 a = ' + f2(a) + ' m/s²<br>';
        if (mode === 'force') t2 += '복원력 F = −kx : 변위와 <b>반대 방향</b>이고 크기는 변위에 비례해요 → 가속도 a도 변위와 반대 방향 (a–x 그래프는 기울기가 음수인 직선).';
        else if (mode === 'period') t2 += '질량 m · 용수철 상수 k · 진폭 A 가운데 무엇이 주기를 바꿀까요? 한 번에 하나씩만 바꿔 📍 주기를 기록해 비교해요.' + (S.pe && S.pe.rec && S.pe.rec.length ? '<br>📍 주기 기록: ' + S.pe.rec.slice(-4).map((q) => 'm ' + q.m + ' · k ' + q.k + ' · A ' + q.A + ' → T ' + q.T.toFixed(2) + ' s').join(' / ') : '');
        else if (mode === 'energy') { const Ep = 0.5 * k * x * x, Et = 0.5 * k * o.x0 * o.x0; t2 += '역학적 에너지: 운동 E<sub>k</sub> = ' + (Et - Ep).toFixed(3) + ' J + 탄성 E<sub>p</sub> = ' + Ep.toFixed(3) + ' J = ½kA² = ' + Et.toFixed(3) + ' J (일정). 양 끝점에서 속력 0, 평형점에서 가장 빠름.'; }
        else t2 += '끝점(±A)에서는 속력이 0이고 가속도가 가장 커요. 평형점에서는 가속도 0, 속력 최대예요.';
        if (t2 !== lastTxt) { lastTxt = t2; info(t2 + '<br><span style="opacity:.8">진폭 · 용수철 · 질량은 옆 조작판에서 바꿔요.</span>'); }
      }
      function springKey(p0, p1) { const key = [p0.x, p0.y, p1.x.toFixed(2), p1.y.toFixed(2)].join('|'); if (key === skey) return; skey = key; springM.geometry.dispose(); springM.geometry = coil(p0, p1, 9, 0.22); }
      pl = controls.player({ duration: 5, loop: true, autoplay: false, label: '한 주기', phases: [[0, '오른쪽(+) 끝점'], [0.25, '평형점 (가장 빠름)'], [0.5, '왼쪽(−) 끝점'], [0.75, '평형점 (가장 빠름)']], onFrame(p) { demo.p = p; demo.on = p > 0 || !!(pl && pl.playing); } });
      return {
        update() {
          const A = sim(); if (!A || !A.S) return; const S = A.S;
          if (!pl.playing && pl.p === 0) demo.on = false;
          scene(A, S);
        },
        sync() {},
      };
    },
  });
})();
