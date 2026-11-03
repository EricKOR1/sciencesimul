/* hm-projectile · 3D 포물선 운동
   2D 실험(window.__sim)의 장면을 그대로 입체로 보여 줘요: 🏹 궤적 관찰(각도와 사거리) · 🎞️ 영상 속 공 분석(프레임) · 📐 운동 식(T · H · R) · 🎯 목표 맞히기(지면 표적 · 옥상 · 담장).
   g = 10 m/s². 수평 방향은 등속(바닥 위 그림자의 간격이 일정), 연직 방향은 가속(기둥 위 그림자는 위로 던진 공과 같아요). 던진 뒤 0.2 s마다 잔상을 남겨요.
   1 m = 0.25칸. 던질 각도 · 속력 · 표적은 옆 조작판이 정하고 3D는 따라가요. */
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
  const G = 10, K = 0.25, DT = 0.2;
  const KDX = PHN ? 1.35 : 1;
  const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
  window.SciSim3D.attach({
    title: '포물선 운동 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대 · 각도와 속력은 옆 조작판에서 바꿔요',
    camera: { dist: 18 * KDX, theta: 0.35, phi: 1.3, min: 5, max: 50, target: [5, 2, 0] },
    autoRotate: 0,
    levels: [0, 2, 3],   // ② 영상 속 공 분석은 캔버스에서 프레임마다 공 위치를 찍어야 해서 2D로 시작해요
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      const { V3, M, mkArrow, setArrow, tube, grid } = tools(THREE);
      const sim = () => ctx.lesson();
      const gridG = grid(26, 5, 1, 0x8aa0c0, 0, 0.22); gridG.position.x = 5; root.add(gridG);
      const ground = new THREE.Mesh(new THREE.BoxGeometry(26, 0.12, 5.4), M(0x1c2b3a, { roughness: 1 })); ground.position.set(5, -0.07, 0); ground.receiveShadow = true; root.add(ground);
      // 눈금 (5 m 간격)
      const tickL = []; for (let m = 0; m <= 50; m += 10) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.5), M(0xdbe4f5)); t.position.set(m * K, 0.03, 1.5); root.add(t); tickL.push(label(m + ' m', [m * K, 0, 1.5], { color: '#475569', size: 11 })); }
      // 대포
      const cannon = new THREE.Group(); root.add(cannon);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.17, 0.9, 20), M(0x4b5563, { metalness: 0.6, roughness: 0.35 })); barrel.geometry.translate(0, 0.45, 0);
      const pivot = new THREE.Group(); pivot.add(barrel); cannon.add(pivot);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.2, 24), M(0x374151)); cannon.add(base);
      // 옥상
      const roof = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1, 3), M(0x6b7280, { roughness: 0.8 })); root.add(roof); const lRoof = label('옥상', roof, { color: '#475569', size: 12 });
      // 표적 · 담장
      const targ = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.06, 40), M(0xe2464b, { emissive: 0x7f1d1d })); root.add(targ); const targ2 = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.07, 40), M(0xffffff)); targ.add(targ2); targ2.position.y = 0.01; const lTg = label('', targ, { color: '#c0392b', size: 12 });
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1, 3), M(0xb45309, { roughness: 0.7 })); root.add(wall); const lWall = label('', wall, { color: '#b45309', size: 12 });
      // 공 · 그림자
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.2, 28, 20), M(0xf59e0b, { roughness: 0.3 })); ball.castShadow = true; root.add(ball);
      const sg = new THREE.Mesh(new THREE.SphereGeometry(0.12, 18, 12), M(0x2f6df6)), sp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 18, 12), M(0xe2464b)); root.add(sg, sp);
      const pole = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1, 0.08), M(0x94a3b8)); root.add(pole);
      const dropX = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 })); root.add(dropX);
      const vA = mkArrow(0xffffff, 0.045), vxA = mkArrow(0x4c8dff, 0.04), vyA = mkArrow(0xff6b6b, 0.04); root.add(vA, vxA, vyA);
      const SN = 80, strobe = new THREE.SphereGeometry(0.08, 12, 8);
      const sI = new THREE.InstancedMesh(strobe, M(0xffe3a3, { roughness: 0.5 }), SN), gI = new THREE.InstancedMesh(strobe, M(0x9bbcff), SN), pI = new THREE.InstancedMesh(strobe, M(0xffa3a3), SN);
      sI.frustumCulled = gI.frustumCulled = pI.frustumCulled = false; root.add(sI, gI, pI);
      let path = null, pathKey = '';
      const lH = label('최고점', [0, 0, 0], { color: '#7c3aed', size: 12 }), lR = label('낙하점', [0, 0, 0], { color: '#0f766e', size: 12 }), lx = label('수평: 등속', sg, { color: '#2f6df6', size: 12 }), ly = label('연직: 가속', sp, { color: '#e2464b', size: 12 });
      lx.off = [0, 0.4, 0]; ly.off = [0.7, 0, 0];
      const mtx = new THREE.Matrix4();
      const demo = { p: 0, on: false }; let pl = null;
      /* ----- 영상 속 공 (프레임 0~8) ----- */
      const vidBalls = []; for (let i = 0; i < 9; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.17, 18, 12), M(0x7dd3fc, { emissive: 0x0c4a6e, transparent: true })); b.visible = false; root.add(b); vidBalls.push(b); }
      const vidLab = label('', [0, 0, 0], { color: '#0e7490', size: 12 });
      function setBall(x, y, vx, vy, show) {
        ball.visible = show; if (!show) { sg.visible = sp.visible = dropX.visible = vA.visible = vxA.visible = vyA.visible = false; lx.show(false); ly.show(false); return; }
        ball.position.set(x * K, y * K + 0.2, 0); sg.visible = sp.visible = true; sg.position.set(x * K, 0.12, 0); sp.position.set(pole.position.x, y * K + 0.2, 0);
        dropX.visible = y > 1; dropX.position.set(x * K, y * K / 2, 0); dropX.scale.y = Math.max(0.001, y * K);
        const a = new V3(x * K, y * K + 0.2, 0), s = 0.07 * 2.6;
        setArrow(vA, a, new V3(a.x + vx * s, a.y + vy * s, 0)); setArrow(vxA, a, new V3(a.x + vx * s, a.y, 0.0)); setArrow(vyA, a, new V3(a.x, a.y + vy * s, 0.0));
        vA.visible = vxA.visible = vyA.visible = true; lx.show(true); ly.show(true);
      }
      function setStrobe(pts) {   // pts: [[x(m), y(m)]]
        for (let i = 0; i < SN; i++) { const on = i < pts.length, S2 = on ? 1 : 0, p = pts[i] || [0, 0]; mtx.makeScale(S2, S2, S2).setPosition(p[0] * K, p[1] * K + 0.2, 0); sI.setMatrixAt(i, mtx); mtx.makeScale(S2, S2, S2).setPosition(p[0] * K, 0.1, 0); gI.setMatrixAt(i, mtx); mtx.makeScale(S2, S2, S2).setPosition(pole.position.x, p[1] * K + 0.2, 0); pI.setMatrixAt(i, mtx); }
        sI.instanceMatrix.needsUpdate = gI.instanceMatrix.needsUpdate = pI.instanceMatrix.needsUpdate = true;
      }
      function setTrail(A, P, tEnd) {
        const key = [P.v0, P.th, P.h0, tEnd.toFixed(2)].join('|'); if (key === pathKey) return; pathKey = key;
        if (path) { root.remove(path); path.geometry.dispose(); path = null; }
        const n = 40, pts = []; for (let i = 0; i <= n; i++) { const t = tEnd * i / n, q = A.posAt(P.fl, P.h0, t); pts.push(new V3(q.x * K, q.y * K + 0.2, 0)); }
        if (pts.length > 1 && tEnd > 0.02) { path = tube(pts, 0.025, 0xffd9a0, { basic: true, op: 0.6 }); root.add(path); }
      }
      let lastTxt = '';
      function shot(A, S) {
        const target = S.mode === 'target', P = A.curShot(), sc = target ? A.SCN[S.tg.sc] : null, h0 = P.h0, wl = sc ? sc.wall : null;
        const th = P.th * Math.PI / 180;
        cannon.position.set(0, h0 * K + 0.12, 0); pivot.rotation.z = -(Math.PI / 2 - th);
        roof.visible = h0 > 0; if (h0 > 0) { roof.scale.y = h0 * K; roof.position.set(-1.4, h0 * K / 2, 0); lRoof.set('옥상 ' + h0 + ' m'); lRoof.off = [0, h0 * K / 2 + 0.4, 0]; } lRoof.show(h0 > 0);
        targ.visible = !!sc && sc.tx > 0; lTg.show(targ.visible); if (targ.visible) { targ.position.set(sc.tx * K, 0.04, 0); targ.scale.set(sc.tr * K * 2.4, 1, sc.tr * K * 2.4); lTg.set('지면 표적 ' + sc.tx + ' m'); lTg.off = [0, 0.7, 0]; }
        wall.visible = !!wl; lWall.show(!!wl); if (wl) { wall.scale.y = wl.h * K; wall.position.set(wl.x * K, wl.h * K / 2, 0); lWall.set('담장 (높이 ' + wl.h + ' m)'); lWall.off = [0, wl.h * K / 2 + 0.5, 0]; }
        // 던진 상태 (2D) 또는 ▶ 재생
        let fl = P.fl, t = P.t, st = P.st;
        const playOn = demo.on && st !== 'fly';
        if (playOn) { fl = A.flight(P.v0, P.th, h0, wl); const tq = demo.p < 0.88 ? demo.p / 0.88 * fl.tEnd : fl.tEnd; t = tq; st = demo.p < 0.88 ? 'fly' : 'done'; P2 = { fl }; }
        const active = (st === 'fly' || st === 'done') && fl;
        const xpole = active ? (fl.R || 0) : 10; pole.position.set((active ? Math.min(60, fl.vx * fl.T + 0.8) : 10) * K, 0, -1.0 * 0);
        pole.position.x = ((active ? fl.vx * fl.T : 20) + 1.2) * K;
        const ptop = Math.max(2, active ? fl.H + 1 : 6); pole.scale.y = ptop * K; pole.position.y = ptop * K / 2; void xpole;
        if (active) {
          const q = A.posAt(fl, h0, t), vyt = fl.vy - G * t;
          setBall(q.x, Math.max(0, q.y), fl.vx, vyt, true);
          const pts = []; for (let k = 0; k * DT <= t + 1e-6 && k < SN; k++) { const pp = A.posAt(fl, h0, Math.min(k * DT, fl.tEnd)); pts.push([pp.x, Math.max(0, pp.y)]); } setStrobe(pts);
          setTrail(A, P.fl ? Object.assign({}, P, { fl }) : { v0: P.v0, th: P.th, h0, fl }, t);
          const done = st === 'done';
          lH.show(done && fl.vy > 0); lR.show(done && !(wl && fl.hitWall)); if (done) { lH.obj = [fl.vx * fl.tH * K, fl.H * K + 0.2, 0]; if (fl.vy <= 0) lH.show(false); lH.off = [0, 0.4, 0]; lR.obj = [fl.R * K, 0.1, 0]; lR.off = [0, -0.35, 0.3]; }
        } else { setBall(0, 0, 0, 0, false); setStrobe([]); if (path) { root.remove(path); path.geometry.dispose(); path = null; pathKey = ''; } lH.show(false); lR.show(false); }
        let txt;
        if (target) {
          txt = '<b>🎯 목표 맞히기 · ' + sc.name + '</b><br>v₀ = ' + P.v0 + ' m/s · θ = ' + P.th + '°' + (h0 ? ' · 처음 높이 ' + h0 + ' m' : '') + (wl ? ' · 높이 ' + wl.h + ' m, ' + wl.x + ' m 앞 담장' : ' · 표적 ' + sc.tx + ' m (반지름 ' + sc.tr + ' m)') + '<br>' + (P.res ? (P.res.ok ? '🎉 ' : '') + P.res.msg : '먼저 계산해서 v₀와 θ를 정한 뒤 던져 보세요.');
        } else if (S.mode === 'model') {
          txt = '<b>📐 운동 식 · v₀ = ' + P.v0 + ' m/s, θ = ' + P.th + '°</b><br>x = v₀cosθ·t · y = v₀sinθ·t − ½gt² · 수평은 등속(ax = 0), 연직은 가속(ay = −g)<br>' + (P.st === 'done' && P.fl ? '결과: 체공 시간 T = ' + f1(P.fl.T) + ' s · 최고 높이 H = ' + f1(P.fl.H) + ' m · 사거리 R = ' + f1(P.fl.R) + ' m' : 'T · H · R은 식으로 계산한 뒤 ▶ 던지기로 확인해요.');
        } else {
          txt = '<b>🏹 궤적 관찰 · v₀ = ' + P.v0 + ' m/s · θ = ' + P.th + '°</b><br>' + (P.st === 'done' && P.fl ? '사거리 R = <b>' + f1(P.fl.R) + ' m</b> · 최고 높이 ' + f1(P.fl.H) + ' m' : '각도를 바꿔 던져 사거리 R을 기록해요 (옆 조작판).') + '<br>수평 방향은 등속(바닥 위 그림자 간격이 일정), 연직 방향은 중력 때문에 가속돼요.';
        }
        info(txt + (active ? '<br><span style="opacity:.8">잔상은 0.2 s마다 남겨요.</span>' : ''));
      }
      let P2 = null; void P2;
      function video(A, S) {
        const v = S.vd, n = A.NF; let tcur = v.play ? v.tp : v.fr * A.FDT; if (demo.on && !v.play) tcur = demo.p * (n - 1) * A.FDT;
        const fr = Math.round(tcur / A.FDT);
        cannon.visible = false; roof.visible = false; targ.visible = false; wall.visible = false; lRoof.show(false); lTg.show(false); lWall.show(false); lH.show(false); lR.show(false);
        pole.position.set((A.VX * (n - 1) * A.FDT + 1.2) * K, 0, 0); pole.scale.y = 3 * K * 2; pole.position.y = 3 * K;
        const q = A.vidPos(tcur); setBall(q.x, Math.max(0, q.y), A.VX, A.VY0 - G * tcur, true);
        setStrobe([]); vidBalls.forEach((b, i) => { const p = A.vidPos(i * A.FDT); b.visible = true; b.position.set(p.x * K, p.y * K + 0.2, 0); const mk = v.mk[i]; b.material.opacity = mk ? 1 : 0.28; b.material.color.setHex(i === fr ? 0xfff176 : mk ? 0x7dd3fc : 0x94a3b8); b.scale.setScalar(i === fr ? 1.25 : 1); });
        vA.visible = vxA.visible = vyA.visible = false; lx.show(false); ly.show(false);
        const done = v.mk.filter(Boolean).length;
        info('<b>🎞️ 영상 속 공 분석</b> · 프레임 ' + fr + ' / ' + (n - 1) + ' · t = ' + (fr * A.FDT).toFixed(1) + ' s<br>공의 위치: x = ' + (q.x).toFixed(1) + ' m · y = ' + Math.max(0, q.y).toFixed(1) + ' m (영상의 프레임마다 0.2 s)<br>찍은 프레임 ' + done + ' / ' + n + ' · 바닥 위 그림자(x)는 같은 간격으로, 기둥 위 그림자(y)는 위로 던진 공처럼 움직여요.<br><span style="opacity:.8">프레임 위치는 2D 화면에서 찍고, vx와 v₀y는 표에서 계산해요.</span>');
      }
      /* ▶ 재생 */
      pl = controls.player({ duration: 5, loop: true, autoplay: false, label: '던지기', phases: [[0, '수평: 등속 · 연직: 가속'], [0.88, '도착']], onFrame(p) { demo.p = p; demo.on = p > 0 || !!(pl && pl.playing); } });
      pl.row = ctx.renderer.domElement.parentNode.parentNode.querySelector('.v3-player');
      let curM = '';
      function setMode(S) {
        const mode = S.mode === 'target' ? 'target-' + S.tg.sc : S.mode; if (mode === curM) return; curM = mode;
        cannon.visible = mode !== 'video'; pathKey = ''; lastTxt = '';
        vidBalls.forEach((b) => (b.visible = false)); vidLab.show(false);
        pl.row.style.display = mode === 'target-a' || mode === 'target-b' || mode === 'target-c' ? 'none' : ''; if (mode.indexOf('target') === 0) { pl.pause(); pl.set(0); }
        if (mode === 'video') Object.assign(orbit, { tx: 3.2, ty: 1.6, tz: 0, phi: 1.3, theta: 0.3, dist: 12 * KDX });
        else if (mode === 'target-b') Object.assign(orbit, { tx: 5.5, ty: 5.5, tz: 0, phi: 1.3, theta: 0.3, dist: 26 * KDX });
        else if (mode === 'target-c') Object.assign(orbit, { tx: 3, ty: 1.5, tz: 0, phi: 1.3, theta: 0.3, dist: 14 * KDX });
        else Object.assign(orbit, { tx: 5.5, ty: 2.0, tz: 0, phi: 1.3, theta: 0.35, dist: 19 * KDX });
      }
      return {
        update(dt) {
          const A = sim(); if (!A || !A.S) return; const S = A.S;
          setMode(S);
          const P = A.curShot(); if (P.st === 'fly' && pl.playing) pl.pause(); if (!pl.playing && pl.p === 0) demo.on = false;
          if (S.mode === 'video') video(A, S); else { cannon.visible = true; shot(A, S); }
        },
        sync() {},
      };
    },
  });
})();
