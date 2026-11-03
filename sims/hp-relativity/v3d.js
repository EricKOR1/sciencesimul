/* hp-relativity · 3D 광속 불변 · 시간 팽창 · 길이 수축
   2D 실험(window.__sim)의 장면을 그대로 입체로 보여 줘요: 🚆 기차 위의 공과 빛(빛의 속력은 더해지지 않아요) · 🕒 빛시계(움직이는 시계는 느리게 가요) · 📏 길이 수축(우주선 길이 · 뮤온 이야기).
   식과 계산은 쓰지 않고, 속력에 따라 달라지는 모습(빠르기 · 길이 · 똑딱 횟수)만 보여 줘요. (🌍 영향 조사 장면은 2D 화면에서 해요) */
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
  const ez = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  window.SciSim3D.attach({
    title: '상대성 이론 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대 · 값은 옆 조작판에서 바꿔요',
    camera: { dist: 15 * KD, theta: 0.1, phi: 1.25, min: 5, max: 36, target: [5, 1.2, 0] },
    autoRotate: 0,
    levels: [0, 1, 2],
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      const { V3, M, mkArrow, setArrow, tube, grid } = tools(THREE);
      const sim = () => ctx.lesson();
      const gO = new THREE.Group(), gC = new THREE.Group(), gL = new THREE.Group(), gM = new THREE.Group(); root.add(gO, gC, gL, gM);
      const H = 2.6;
      /* ================= 🚆 기차 위의 공과 빛 (게이트 간격 D = 10칸) ================= */
      const ground = new THREE.Mesh(new THREE.BoxGeometry(18, 0.12, 3), M(0x334155, { roughness: 1 })); ground.position.set(5, -0.06, 0); gO.add(ground);
      for (let i = -1; i <= 11; i++) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 2.4), M(0x64748b)); t.position.set(i, 0.02, 0); gO.add(t); }
      const gate = [0, 10].map((x, i) => { const g = new THREE.Group(); const p = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.0, 0.12), M(0x394258)); p.position.y = 1.5; g.add(p); const f = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, 0.1), M(i ? 0xe2464b : 0x14a058)); f.position.set(0.55, 2.7, 0); g.add(f); g.position.set(x, 0, -1.3); gO.add(g); return g; });
      const lG = [label('게이트 1', gate[0], { color: '#14a058', size: 12 }), label('게이트 2', gate[1], { color: '#e2464b', size: 12 })]; lG.forEach((l) => (l.off = [0.5, 3.1, 0]));
      const lDg = label('게이트 간격 D', [5, 0, 1.4], { color: '#475569', size: 12 });
      const train = new THREE.Group(); gO.add(train);
      { const b = new THREE.Mesh(new THREE.BoxGeometry(5, 1.3, 1.5), M(0x3b82f6, { roughness: 0.4 })); b.position.y = 1.1; b.castShadow = true; train.add(b); [-1.7, 0, 1.7].forEach((x) => { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.6, 16), M(0x1f2937)); w.rotation.x = Math.PI / 2; w.position.set(x, 0.3, 0); train.add(w); }); const win = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.5, 1.52), M(0xbfdbfe, { emissive: 0x3b6fb0 })); win.position.y = 1.3; train.add(win); }
      const lTr = label('', train, { color: '#2563eb', size: 12 });
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 14), M(0xe2464b, { emissive: 0x7f1d1d, roughness: 0.3 })); gO.add(ball);
      const lightP = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 14), new THREE.MeshBasicMaterial({ color: 0xfff7c2 })); const lightGlow = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffd447, transparent: true, opacity: 0.3, depthWrite: false })); lightP.add(lightGlow); gO.add(lightP);
      const ghost = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), new THREE.MeshBasicMaterial({ color: 0xff8a3d, transparent: true, opacity: 0.45 })); gO.add(ghost);
      const aBall = mkArrow(0xe2464b, 0.05), aLight = mkArrow(0xd99a00, 0.05); gO.add(aBall, aLight);
      const lBall = label('', ball, { color: '#c0392b', size: 12 }), lLight = label('', lightP, { color: '#a16207', size: 12 }), lGh = label('', ghost, { color: '#c2410c', size: 12 });
      const demoO = { p: 0, on: false };
      function obs(A, S) {
        const o = S.o, r = o.run; let bt = r ? r.bt : o.bt;
        const LOd = A.LO, scale = 10 / (LOd.g2 - LOd.g1);
        let trainX = (o.trainX - LOd.g1) * scale, run = r, tq = null;
        if (demoO.on && !r) {
          const p = demoO.p, q = clamp(p / 0.7, 0, 1); tq = q; trainX = -3 + bt * 10 * q * 1.0 + 0;
        }
        train.position.set(trainX, 0, 0); lTr.set('기차 ' + f1(bt) + ' c'); lTr.off = [0, 2.3, 0];
        let ballV = null, lightV = null;
        ball.visible = lightP.visible = ghost.visible = false; aBall.visible = aLight.visible = false; lBall.show(false); lLight.show(false); lGh.show(false);
        if (r) {
          const x = clamp(r.t / r.T, 0, 1) * 10;
          if (r.kind === 'ball') { ball.visible = true; ball.position.set(x, 1.9, 0.5); setArrow(aBall, new V3(x, 2.5, 0.5), new V3(x + r.v * 2.6, 2.5, 0.5)); lBall.set('공 ' + f2(r.v) + ' c'); lBall.show(true); lBall.off = [0, 0.55, 0]; }
          else { lightP.visible = true; lightP.position.set(x, 1.9, 0.5); setArrow(aLight, new V3(x, 2.5, 0.5), new V3(x + 2.6, 2.5, 0.5)); lLight.set('빛 ' + f2(r.v) + ' c'); lLight.show(true); lLight.off = [0, 0.55, 0]; }
        } else if (tq != null) {
          const tt = tq * 10, vb = bt + A.U_BALL;
          ball.visible = lightP.visible = ghost.visible = true;
          ball.position.set(clamp(vb * tt, 0, 10.4), 1.9, 0.9); lightP.position.set(clamp(tt, 0, 10.4), 1.9, 0.0); ghost.position.set(clamp((1 + bt) * tt, 0, 14), 1.9, -0.9);
          lBall.set('공 ' + f2(vb) + ' c'); lLight.set('빛 1.00 c (측정값)'); lGh.set('더하기로 예상한 빛 ' + f2(1 + bt) + ' c'); [lBall, lLight, lGh].forEach((l) => { l.show(true); l.off = [0, 0.55, 0]; });
        }
        const last = o.rows[o.rows.length - 1];
        let t2 = '<b>🚆 지면에 서 있는 관측자가 속력을 재요</b> · 속력 = 게이트 간격 D ÷ 걸린 시간<br>기차 속력 ' + f1(bt) + ' c' + (r ? ' · 지금 ' + (r.kind === 'ball' ? '🏐 공' : '🔦 빛') + ' 측정 중…' : '');
        if (tq != null) t2 += '<br>공: 기차 ' + f1(bt) + ' c + 던진 속력 ' + f1(A.U_BALL) + ' c → 지면에서 ' + f2(bt + A.U_BALL) + ' c (더해져요) · 빛: 기차가 달려도 <b>항상 1.00 c</b> (더해지지 않아요)';
        else if (last) t2 += '<br>마지막 측정: ' + (last.kind === 'ball' ? '🏐 공' : '🔦 빛') + ' · 예상(기차 + 대상) ' + f2(last.exp) + ' c → 측정 <b>' + f2(last.meas) + ' c</b> ' + (Math.abs(last.exp - last.meas) < 0.005 ? '✅ 같아요' : '❗ 달라요');
        else t2 += '<br>기차 속력을 정하고 공이나 빛을 쏘아 보세요 (옆 조작판).';
        info(t2 + '<br><span style="opacity:.8">공은 기차 안에서 ' + f1(A.U_BALL) + ' c로 던져요 (비교용 단순 덧셈).</span>');
      }
      /* ================= 🕒 빛시계 ================= */
      const gr = grid(24, 6, 1, 0x7a8fb3, -0.02, 0.18); gC.add(gr);
      function clockMk(col) {
        const g = new THREE.Group();
        const bot = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 0.9), M(0xcbd5e1, { metalness: 0.9, roughness: 0.1 })), top = bot.clone(); top.position.y = H; g.add(bot, top);
        [-0.7, 0.7].forEach((x) => { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, H, 8), M(col, { transparent: true, opacity: 0.55 })); r.position.set(x, H / 2, -0.4); g.add(r); });
        const ph = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 14), new THREE.MeshBasicMaterial({ color: 0xffe66d })); const glow = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0.25, depthWrite: false })); ph.add(glow); g.add(ph);
        gC.add(g); return { g, ph };
      }
      const cA = clockMk(0x34d399), cB = clockMk(0x60a5fa);
      const shell = new THREE.Mesh(new THREE.BoxGeometry(3.4, H + 1.6, 1.5), new THREE.MeshStandardMaterial({ color: 0x9fb4e8, transparent: true, opacity: 0.22, depthWrite: false, roughness: 0.2 })); shell.position.set(0, H / 2, 0); cB.g.add(shell);
      const person = new THREE.Group(); { const bd = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.9, 12), M(0xff9a6a)); bd.position.y = 0.55; person.add(bd); const hd = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), M(0xffd9b5)); hd.position.y = 1.2; person.add(hd); } person.position.set(-1.1, 0, 0.3); cB.g.add(person);
      const pathPts = []; const pathLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xffd447 })); pathLine.frustumCulled = false; gC.add(pathLine);
      const lA = label('정지한 시계 A', cA.g, { color: '#059669', size: 12 }), lB = label('', cB.g, { color: '#2563eb', size: 12 }), lAt = label('', cA.g, { color: '#059669', size: 13 }), lBt = label('', cB.g, { color: '#2563eb', size: 13 }), lVA = label('빛은 비스듬히 더 긴 길을 가요', [0, 0, 0], { color: '#a16207', size: 12 });
      const aV = mkArrow(0x8bd0ff, 0.05); gC.add(aV);
      const groundTick = []; for (let i = 0; i < 24; i++) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.05), M(0xffffff)); gC.add(t); groundTick.push(t); }
      function clock(A, S) {
        const k = S.k, g = A.LK, b = k.b, ship = k.view === 'ship', U = 6.5 / g.H;
        const yA = k.A.y / g.H * H, yB = k.B.y / g.H * H, yS = k.S2.y / g.H * H;
        cA.g.visible = !ship; groundTick.forEach((t) => (t.visible = !ship)); gr.visible = !ship; shell.visible = true; person.visible = ship; aV.visible = !ship && b > 0;
        lA.show(!ship); lAt.show(true); lVA.show(!ship && b > 0);
        cA.g.position.set(-5.2, 0, 0); cA.ph.position.set(0, yA + 0.06, 0);
        cB.g.position.set(ship ? 0 : 3.0, 0, 0); cB.ph.position.set(0, (ship ? yS : yB) + 0.06, 0);
        groundTick.forEach((t, i) => { const gx = ((((i - k.g * U * 0.5) % 24) + 24) % 24) - 12; t.position.set(gx, 0.15, 1.3); });
        lB.set(ship ? '우주선 안의 시계' : '우주선의 시계 B (' + f2(b) + ' c)'); lB.off = [0, H + 1.2, 0];
        lAt.set('똑딱 ' + (ship ? k.S2.ticks : k.A.ticks) + '번'); lAt.obj = ship ? cB.g : cA.g; lAt.off = [0, -0.7, 0]; lBt.show(!ship); lBt.set('똑딱 ' + k.B.ticks + '번'); lBt.off = [0, -0.7, 0];
        // 빛이 지나간 자취: 우주선 기준으로 왼쪽으로 흘러가요
        if (!ship) {
          const pts = k.B.pts.map((p) => new V3(3.0 + (p.X - k.g) * 0.5 * (6.5 / g.H) * 1, p.y / g.H * H + 0.06, 0)); pts.push(new V3(3.0, yB + 0.06, 0));
          const keep = pts.filter((p) => p.x > -9); pathLine.geometry.setFromPoints(keep.length > 1 ? keep : [new V3(3, 0, 0), new V3(3, 0.01, 0)]);
        } else pathLine.geometry.setFromPoints([new V3(0, 0, 0), new V3(0, 0.01, 0)]);
        pathLine.visible = !ship;
        if (!ship && b > 0) { setArrow(aV, new V3(2.3, H + 0.5, 0), new V3(2.3 + 0.6 + b * 2.2, H + 0.5, 0)); lVA.obj = [3.6, H + 0.9, 0]; }
        const rt = A.rate(b);
        let t2 = '<b>🕒 ' + (ship ? '우주선 안에서 본 빛시계' : '지면 관측자의 눈으로 본 두 개의 빛시계') + '</b><br>';
        if (!ship) t2 += '지면의 같은 시간 동안 똑딱: A ' + k.A.ticks + '번 · B ' + k.B.ticks + '번 → ' + (k.A.ticks >= 3 ? (k.B.ticks < k.A.ticks ? '<b>B는 A보다 똑딱이 적어요</b> → B의 시계가 느리게 갔어요' : 'B도 A와 같은 횟수예요 (속력이 거의 0일 때)') : '속력을 올려 똑딱 횟수를 비교해 보세요') + '<br>움직이는 시계가 가는 빠르기 = <b>' + f2(rt) + '</b> (정지한 시계 = 1) · 속력 ' + f2(b) + ' c';
        else t2 += '우주선 안의 사람에게는 자기 시계가 <b>정상</b>이에요. 빛은 위아래로 똑바로 오가고 똑딱은 ' + k.S2.ticks + '번이에요. 느려지는 것은 지면의 관측자가 볼 때예요.';
        info(t2 + '<br><span style="opacity:.8">속력과 보기는 옆 조작판에서 바꿔요.</span>');
      }
      /* ================= 📏 길이 수축: 우주선 ================= */
      function shipMk(col) {
        const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 4, 24), M(col, { roughness: 0.3, metalness: 0.5 })); b.rotation.z = Math.PI / 2; g.add(b);
        const n = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.1, 24), M(0xef4444, { roughness: 0.3 })); n.rotation.z = -Math.PI / 2; n.position.x = 2.55; g.add(n);
        [-1, 1].forEach((s) => { const f = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.9), M(0x64748b)); f.position.set(-1.6, 0, s * 0.7); g.add(f); });
        for (let i = 0; i < 3; i++) { const w = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), M(0x93c5fd, { emissive: 0x1e40af })); w.position.set(-0.8 + i * 0.9, 0.3, 0.45); g.add(w); }
        return g;
      }
      const s0 = shipMk(0xe5e7eb), sg = shipMk(0x94a3b8); s0.position.set(0, 1.2, 0.8); sg.position.set(0, 1.2, -1.6); gL.add(s0, sg);
      sg.traverse((o) => { if (o.material) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.3; o.material.depthWrite = false; } });
      const rodG = new THREE.Mesh(new THREE.BoxGeometry(1, 0.1, 0.1), M(0xfbbf24, { emissive: 0x8a6a00 })); rodG.position.set(0, -0.2, 0.8); gL.add(rodG);
      const floorL = new THREE.Mesh(new THREE.BoxGeometry(14, 0.08, 6), M(0x1a2238, { roughness: 1 })); floorL.position.set(0, -0.3, -0.4); gL.add(floorL);
      const lS = label('운동하는 우주선 (지면에서 본 모습)', s0, { color: '#475569', size: 12 }), lSg = label('정지했을 때의 우주선 (기준)', sg, { color: '#475569', size: 12 }), lRod = label('지면의 막대 (길이 L)', rodG, { color: '#a16207', size: 12 }), lLen = label('', s0, { color: '#2563eb', size: 13 });
      const demoL = { p: 0, on: false };
      function lenShip(A, S) {
        const l = S.l, b = demoL.on ? 0.995 * (1 - Math.abs(2 * demoL.p - 1)) : l.b, r = A.rate(b);
        s0.scale.x = r; s0.position.x = 0; rodG.scale.x = 4 + 1.1; rodG.position.x = 0.0;
        lS.off = [0, 1.2, 0]; lSg.off = [0, 1.2, 0]; lRod.off = [0, -0.5, 0]; lLen.set('길이 ' + Math.round(100 * r) + ' %'); lLen.off = [0, -1.3, 0];
        info('<b>📏 지면의 막대 옆을 지나가는 우주선</b> · 속력 ' + f2(b) + ' c<br>지면에서 본 우주선의 크기 (정지했을 때 = 100 %): <b>길이 ' + Math.round(100 * r) + ' %</b> · 높이 100 %<br>길이는 <b>운동 방향으로만</b> 줄어들고, 높이는 그대로예요.<br><span style="opacity:.8">속력은 옆 조작판에서 바꿔요.</span>');
      }
      /* ================= 📏 뮤온 이야기 ================= */
      const HA = 8, atmE = new THREE.Mesh(new THREE.BoxGeometry(2.6, HA, 1.4), new THREE.MeshStandardMaterial({ color: 0x7ec4ff, transparent: true, opacity: 0.2, depthWrite: false })); atmE.position.set(-4, HA / 2, 0); gM.add(atmE);
      const atmM = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1, 1.4), new THREE.MeshStandardMaterial({ color: 0x7ec4ff, transparent: true, opacity: 0.2, depthWrite: false })); gM.add(atmM);
      const gnd = [-4, 4].map((x) => { const m = new THREE.Mesh(new THREE.BoxGeometry(4, 0.14, 2), M(0x4caf6a)); m.position.set(x, -0.07, 0); gM.add(m); return m; });
      const mus = []; for (let i = 0; i < 40; i++) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd447 })), m2 = e.clone(); gM.add(e, m2); mus.push([e, m2]); }
      const lE = label('지구에서 본 모습: 대기의 높이 15 km', [-4, HA + 0.6, 0], { color: '#1d4ed8', size: 12 }), lM = label('', [4, 0, 0], { color: '#7c5cff', size: 12 }), lMs = label('', [0, 0, 0], { color: '#14a058', size: 12 });
      function muon(A, S) {
        const l = S.l; let mu = l.mu, p = mu ? mu.p : 0, dead = (m) => m.dead, list = mu ? mu.list : null, done = mu ? mu.done : false;
        if (demoL.on && !(mu && mu.running)) {   // ▶ 재생: 뮤온 40개를 내려 보내요 (수명은 같은 분포의 대표값)
          p = clamp(demoL.p / 0.85, 0, 1); list = []; for (let i = 0; i < A.N_MU; i++) { const life = -A.TAU_MU_US * Math.log(1 - (i + 0.5) / A.N_MU); list.push({ x: i / (A.N_MU - 1), pd: life / A.T_MU_US }); } dead = (m) => p >= m.pd && m.pd < 1; done = p >= 1;
        }
        const hThin = HA * A.rate(A.BETA_MU); atmM.scale.y = hThin; atmM.position.set(4, hThin / 2, 0);
        let arr = 0, dec = 0;
        mus.forEach(([e, m2], i) => { const q = list && list[i]; if (!q) { e.visible = m2.visible = false; return; } const x = (q.x - 0.5) * 2.0; const dd = dead(q) || (p >= q.pd && q.pd < 1); const pe = dd ? q.pd : p; if (dd) dec++; else if (p >= 1) arr++;
          e.visible = m2.visible = true; e.position.set(-4 + x, HA * (1 - pe), 0.2); m2.position.set(4 + x, hThin * (1 - pe), 0.2); const col = dd ? 0xe2464b : 0xffd447; e.material.color.setHex(col); m2.material.color.setHex(col); if (dd) { e.scale.setScalar(0.7); m2.scale.setScalar(0.7); } else { e.scale.setScalar(1); m2.scale.setScalar(1); } });
        lM.obj = [4, hThin + 0.6, 0]; lM.set('뮤온이 본 모습: 대기의 두께 ' + f1(A.H_THIN_KM) + ' km (줄어들어 보여요)');
        info('<b>📏 뮤온 이야기</b> · 뮤온 속력 ' + A.BETA_MU + ' c · 정지했을 때 평균 수명 ' + A.TAU_MU_US + ' μs<br>수명 동안 ' + A.D_NOREL_M + ' m밖에 못 갈 것 같지만 지표까지 도착해요.<br>• 지구에서 본 설명: 뮤온의 <b>시계가 느리게 가서</b> 수명이 길어져요.<br>• 뮤온에서 본 설명: 지구의 <b>대기가 줄어들어</b> 짧은 거리만 가면 돼요.<br>' + (list ? (done ? '지표에 도착한 뮤온 ' + arr + '개 / ' + A.N_MU + '개' : '내려가는 중…') : '뮤온을 내려보내 보세요 (옆 조작판 또는 아래 ▶).'));
      }
      /* ================= 장면 · ▶ 재생 ================= */
      let plO = null, plL = null, plM = null;
      plO = controls.player({ duration: 7, loop: true, autoplay: false, label: '공과 빛 달리기', phases: [[0, '같은 순간 출발'], [0.7, '관문 통과']], onFrame(p) { demoO.p = p; demoO.on = p > 0 || !!(plO && plO.playing); } });
      plL = controls.player({ duration: 10, loop: true, autoplay: false, label: '속력 올리기', phases: [[0, '속력을 올려요 (길이가 줄어요)'], [0.5, '속력을 낮춰요']], onFrame(p) { demoL.p = p; demoL.on = p > 0 || !!(plL && plL.playing); } });
      plM = controls.player({ duration: 9, loop: true, autoplay: false, label: '뮤온 내려보내기', phases: [[0, '뮤온 40개가 내려가요'], [0.85, '지표 도착']], onFrame(p) { demoL.p = p; demoL.on = p > 0 || !!(plM && plM.playing); } });
      const rows = [...ctx.renderer.domElement.parentNode.parentNode.querySelectorAll('.v3-player')]; plO.row = rows[0]; plL.row = rows[1]; plM.row = rows[2];
      let cur = '';
      function setMode(S) {
        const mode = S.mode === 'len' ? (S.l.view === 'muon' ? 'muon' : 'ship') : S.mode;
        if (mode === cur) return; cur = mode;
        gO.visible = mode === 'obs'; gC.visible = mode === 'clock'; gL.visible = mode === 'ship'; gM.visible = mode === 'muon';
        [lG[0], lG[1], lDg, lTr].forEach((l) => l.show(mode === 'obs')); [lBall, lLight, lGh].forEach((l) => l.show(false));
        [lA, lB, lAt, lBt, lVA].forEach((l) => l.show(mode === 'clock')); [lS, lSg, lRod, lLen].forEach((l) => l.show(mode === 'ship')); [lE, lM, lMs].forEach((l) => l.show(mode === 'muon')); lMs.show(false);
        plO.row.style.display = mode === 'obs' ? '' : 'none'; plL.row.style.display = mode === 'ship' ? '' : 'none'; plM.row.style.display = mode === 'muon' ? '' : 'none';
        if (mode !== 'obs') { plO.pause(); plO.set(0); } if (mode !== 'ship') { plL.pause(); plL.set(0); } if (mode !== 'muon') { plM.pause(); plM.set(0); }
        if (mode === 'obs') Object.assign(orbit, { tx: 5, ty: 1.2, tz: 0, phi: 1.2, theta: 0.15, dist: 16 * KD });
        else if (mode === 'clock') Object.assign(orbit, { tx: -1, ty: 1.4, tz: 0, phi: 1.3, theta: 0.1, dist: 14 * KD });
        else if (mode === 'ship') Object.assign(orbit, { tx: 0, ty: 0.8, tz: 0, phi: 1.2, theta: 0.2, dist: 11 * KD });
        else Object.assign(orbit, { tx: 0, ty: 3.8, tz: 0, phi: 1.35, theta: 0.1, dist: 17 * KD });
      }
      const NOTE = '🌍 상대성 이론의 영향(GPS · 입자 가속기 · 핵에너지 …) 조사는 2D 화면에서 해요. 위의 [▦ 2D]를 눌러 보세요.';
      return {
        update(dt) {
          const A = sim(); if (!A || !A.S) return; const S = A.S;
          setMode(S);
          if (cur === 'obs') { if (S.o.run && plO.playing) plO.pause(); if (!plO.playing && plO.p === 0) demoO.on = false; obs(A, S); }
          else if (cur === 'clock') clock(A, S);
          else if (cur === 'ship') { if (!plL.playing && plL.p === 0) demoL.on = false; lenShip(A, S); }
          else if (cur === 'muon') { if (S.l.mu && S.l.mu.running && plM.playing) plM.pause(); if (!plM.playing && plM.p === 0) demoL.on = false; muon(A, S); }
          else info(NOTE);
        },
        sync() {},
      };
    },
  });
})();
