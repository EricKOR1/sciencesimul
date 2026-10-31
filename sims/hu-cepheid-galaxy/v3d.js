/* hu-cepheid-galaxy · 3D 구상 성단 지도
   수업에서 구한 구상 성단 24개의 거리 d와 방향(ℓ, b)을 태양(원점)을 기준으로 3차원 공간에 놓아요.
   성단이 태양이 아니라 궁수자리 쪽 한 점(태양에서 약 8.5 kpc)을 중심으로 공 모양으로 퍼져 있음을 돌려 보며 확인해요. (샤플리) */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const TAU = Math.PI * 2, DEG = Math.PI / 180;
  // 수업의 좌표: x = 은하 중심 방향(ℓ = 0°), y = 은하 회전 방향(ℓ = 90°), z = 북은하극 방향 (kpc)
  const G = (x, y, z) => [x, z, -y];                 // 화면 좌표 (위쪽이 은하 북극)
  const narrow = window.innerWidth < 600;
  const asp = narrow ? window.innerWidth / Math.max(300, window.innerHeight - 190) : 1.4;
  const FIT = Math.max(1, 1.15 / asp);
  const LS = narrow ? 11 : 12.5;

  window.SciSim3D.attach({
    title: '구상 성단 3D 지도',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: 58 * FIT, theta: 0.9, phi: 1.0, fov: 42, target: [5, 0, 0], min: 14, max: 180 },
    autoRotate: 0.1,
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      const sim = window.__sim;
      if (!sim || !sim.GC || !sim.MEAN) { info('수업 자료를 불러오지 못했어요.'); return {}; }
      const GC = sim.GC, MEAN = sim.MEAN, RMAX = sim.RMAX;
      const lessonS = () => sim.S || {};

      const cv = document.createElement('canvas'); cv.width = cv.height = 64;
      const c2 = cv.getContext('2d'); const gr = c2.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      c2.fillStyle = gr; c2.fillRect(0, 0, 64, 64);
      const dot = new THREE.CanvasTexture(cv);
      const rc = document.createElement('canvas'); rc.width = rc.height = 64; const r2 = rc.getContext('2d');
      r2.strokeStyle = '#67e8f9'; r2.lineWidth = 6; r2.beginPath(); r2.arc(32, 32, 26, 0, TAU); r2.stroke();
      const ringTex = new THREE.CanvasTexture(rc);
      const glowMat = (hex, op) => new THREE.SpriteMaterial({ map: dot, color: hex, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending });
      const line = (pts, hex, op) => new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts.map((p) => new THREE.Vector3(p[0], p[1], p[2]))), new THREE.LineBasicMaterial({ color: hex, transparent: true, opacity: op }));

      /* ---- 거리 고리(태양 중심, 은하면) ---- */
      const plane = new THREE.Group(); root.add(plane);
      [5, 10, 15, 20, 25].forEach((r) => {
        const pts = []; for (let i = 0; i <= 96; i++) { const a = i / 96 * TAU; pts.push([r * Math.cos(a), 0, r * Math.sin(a)]); }
        plane.add(line(pts, 0x7a93c9, r % 10 === 0 ? 0.5 : 0.28));
      });
      const labR10 = label('10 kpc', [-10, 0, 0], { size: LS - 1, color: 'rgba(40,60,110,.85)' });
      const labR20 = label('20 kpc', [-20, 0, 0], { size: LS - 1, color: 'rgba(40,60,110,.85)' });
      // 방향 화살표: ℓ = 0°(궁수자리), 북은하극
      const ax = new THREE.Group(); root.add(ax);
      ax.add(line([[0, 0, 0], [24, 0, 0]], 0xfde68a, 0.9), line([[0, 0, 0], [0, 12, 0]], 0x9be7ff, 0.6));
      const labL0 = label('ℓ = 0° (궁수자리 방향)', [22, 0, 0], { size: LS, color: 'rgba(100,70,0,.9)', offset: [0, -1.6, 0] });
      const labNP = label('북은하극', [0, 12, 0], { size: LS, color: 'rgba(20,80,110,.9)' });

      /* ---- 태양 ---- */
      const sun = new THREE.Mesh(new THREE.SphereGeometry(0.55, 20, 14), new THREE.MeshBasicMaterial({ color: 0xffd34d }));
      const sg = new THREE.Sprite(glowMat(0xffe08a, 0.9)); sg.scale.set(4, 4, 1); sun.add(sg); root.add(sun);
      label('☀ 태양', sun, { size: LS, color: 'rgba(120,80,0,.92)', offset: [0, 1.3, 0] });

      /* ---- 구상 성단 24개 ---- */
      const balls = [], rings = [];
      const dropPts = [], dist = [];
      GC.forEach((c, i) => {
        const p = G(c.x, c.y, c.z);
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.36, 16, 12), new THREE.MeshStandardMaterial({ color: 0xffa94d, emissive: 0x7a3a00, roughness: 0.5 }));
        m.position.set(p[0], p[1], p[2]); root.add(m); balls.push(m);
        const s = new THREE.Sprite(glowMat(0xff9a3c, 0.4)); s.scale.set(1.5, 1.5, 1); m.add(s);
        const ring = new THREE.Sprite(new THREE.SpriteMaterial({ map: ringTex, transparent: true, depthTest: false })); ring.scale.set(1.9, 1.9, 1); ring.visible = false; m.add(ring); rings.push(ring);
        dropPts.push(p[0], p[1], p[2], p[0], 0, p[2]);
        dist.push(0, 0, 0, p[0], p[1], p[2]);
      });
      function segs(arr, hex, op) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(arr), 3)); return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: hex, transparent: true, opacity: op })); }
      const drops = segs(dropPts, 0xffc58a, 0.5), spokes = segs(dist, 0xffe08a, 0.55); spokes.visible = false; root.add(drops, spokes);
      // 은하면 위의 그림자(수선의 발)
      const feet = new THREE.Points((() => { const g = new THREE.BufferGeometry(); const a = []; GC.forEach((c) => { const p = G(c.x, c.y, c.z); a.push(p[0], 0, p[2]); }); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(a), 3)); return g; })(), new THREE.PointsMaterial({ size: 3, color: 0xffc58a, map: dot, transparent: true, depthWrite: false, sizeAttenuation: false, opacity: 0.8 }));
      root.add(feet);

      /* ---- 중심 찾기: 평균 위치, 공 모양, 은하 원반 ---- */
      const cg = new THREE.Group(); cg.visible = false; root.add(cg);
      const mp = G(MEAN.x, MEAN.y, MEAN.z);
      const cm = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), new THREE.MeshBasicMaterial({ color: 0x4ade80 })); cm.position.set(mp[0], mp[1], mp[2]);
      const cmg = new THREE.Sprite(glowMat(0x7dffb0, 0.9)); cmg.scale.set(4.5, 4.5, 1); cm.add(cmg);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(RMAX, 28, 18), new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.04, depthWrite: false }));
      ball.position.copy(cm.position);
      const ballWire = new THREE.Mesh(new THREE.SphereGeometry(RMAX, 12, 8), new THREE.MeshBasicMaterial({ color: 0xfde047, wireframe: true, transparent: true, opacity: 0.07 })); ballWire.position.copy(cm.position);
      const sunLine = line([[0, 0, 0], mp], 0x4ade80, 0.95);
      const discPts = []; for (let i = 0; i <= 96; i++) { const a = i / 96 * TAU; discPts.push([mp[0] + 15 * Math.cos(a), 0, mp[2] + 15 * Math.sin(a)]); }
      const disc = line(discPts, 0x9db8ff, 0.9);
      const discFill = new THREE.Mesh(new THREE.CircleGeometry(15, 64), new THREE.MeshBasicMaterial({ color: 0x6f8fe8, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false }));
      discFill.rotation.x = -Math.PI / 2; discFill.position.set(mp[0], 0, mp[2]);
      cg.add(cm, ball, ballWire, sunLine, disc, discFill);
      const labMean = label('성단의 중심 = 은하 중심', cm, { size: LS, color: 'rgba(10,90,40,.92)', offset: [0, 2.2, 0] }); labMean.show(false);
      const labDist = label('약 ' + MEAN.r.toFixed(1) + ' kpc', [mp[0] / 2, 0, mp[2] / 2], { size: LS, color: 'rgba(10,90,40,.92)', offset: [0, -2.2, 0] }); labDist.show(false);
      const labDisc = label('은하 원반 (지름 약 30 kpc)', [mp[0] + 15, 0, mp[2] + 3], { size: LS - 0.5, color: 'rgba(40,60,130,.9)', offset: [0, 1.8, 0] }); labDisc.show(false);

      /* ---- 상태 · 안내 ---- */
      let showCenter = false, showDrop = true, showSpoke = false;
      function text() {
        const done = GC.filter((c, i) => isDone(i)).length;
        if (!showCenter) {
          info('<b>구상 성단 24개의 3차원 위치</b> (태양이 원점)<br>거리 d와 방향(ℓ, b)으로 놓았어요. 점선은 은하면까지의 높이예요.<br>성단들은 어디를 중심으로 퍼져 있을까요? <b>🎯 중심 찾기</b>를 눌러 봐요.' +
            (done ? '<br><span style="color:#67e8f9">하늘색 고리</span> = 수업에서 직접 구한 성단 (' + done + '개)' : ''));
        } else {
          info('<b>중심 = 은하 중심</b><br>성단 24개는 태양이 아니라 <b>궁수자리 쪽 한 점</b>(태양에서 약 <b>' + MEAN.r.toFixed(1) + ' kpc</b>) 둘레에 공 모양으로 퍼져 있어요.<br>그래서 태양은 은하의 중심이 아니에요. (샤플리)');
        }
      }
      const isDone = (i) => { const S = lessonS(); return !!(S.done && S.done[i]) || !!(S.fly && S.fly[i] && S.fly[i].landed); };
      function paintDone() { let c = 0; GC.forEach((g, i) => { const d = isDone(i); if (rings[i].visible !== d) rings[i].visible = d; if (d) c++; }); return c; }

      controls.segment('시점', [{ value: 'top', label: '⬇ 위에서' }, { value: 'side', label: '➡ 옆에서' }, { value: 'tilt', label: '↗ 비스듬히' }], 'tilt', (v) => {
        if (v === 'top') { orbit.phi = 0.06; orbit.theta = 0; } else if (v === 'side') { orbit.phi = 1.5; orbit.theta = 0.0; } else { orbit.phi = 1.0; orbit.theta = 0.9; }
      });
      const cB = controls.button('🎯 중심 찾기', () => { showCenter = !showCenter; cB.classList.toggle('on', showCenter); apply(); });
      const dB = controls.button('높이 점선 ✓', () => { showDrop = !showDrop; dB.classList.toggle('on', showDrop); dB.textContent = '높이 점선 ' + (showDrop ? '✓' : '✕'); apply(); }); dB.classList.add('on');
      const sB = controls.button('태양에서 잇기', () => { showSpoke = !showSpoke; sB.classList.toggle('on', showSpoke); apply(); });
      function apply() {
        cg.visible = showCenter; labMean.show(showCenter); labDist.show(showCenter); labDisc.show(showCenter);
        drops.visible = showDrop; feet.visible = showDrop; spokes.visible = showSpoke; text();
      }
      // 수업에서 이미 중심을 찾았으면 켜진 채로 시작해요 (읽기만)
      function readLesson() {
        const S = lessonS(), free = !!(sim.game && sim.game.free);
        if (!showCenter && ((S.mk && S.mk.set && sim.mapOK && sim.mapOK()) || (free && S.view === 'map' && GC.every((g, i) => isDone(i))))) { showCenter = true; cB.classList.add('on'); }
        paintDone(); apply();
      }
      readLesson();
      let acc = 0;
      return {
        update(dt) { labNP.show(orbit.phi > 0.6 && orbit.phi < Math.PI - 0.6); acc += dt; if (acc > 0.5) { acc = 0; const before = rings.map((r) => r.visible).join(); paintDone(); if (rings.map((r) => r.visible).join() !== before) text(); } },
        sync() { readLesson(); },
      };
    },
  });
})();
