/* hu-space-motion · 3D 별의 공간 운동
   ① 한 별: 지구(원점)에서 별까지의 시선 방향 속도 v_r, 시선에 수직인 하늘면 방향 속도 v_t, 두 벡터를 합한 공간 속도 v를 3차원 화살표로 보고,
      시간이 흐르면 별이 직선으로 움직여 지구와의 거리가 어떻게 변하는지(최근접) 확인해요.
   ② 북두칠성: 일곱 별을 실제 거리(24~38 pc)에 놓고 지구에서 본 하늘 모양과 옆에서 본 깊이를 비교해요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const TAU = Math.PI * 2, DEG = Math.PI / 180;
  const KMS_PC_YR = 3.15576e7 / 3.0857e13;             // 1 km/s = 1.0227e-6 pc/년
  const PA = [355.6, 204, 209, 35];                    // 하늘에서 고유 운동의 방향(북쪽에서 동쪽으로 잰 각, 도) — 바너드별·시리우스·아르크투루스·베가
  const narrow = window.innerWidth < 600;
  const asp = narrow ? window.innerWidth / Math.max(300, window.innerHeight - 190) : 1.4;
  const FIT = Math.max(1, 1.0 / asp), LS = narrow ? 11 : 12.5;
  const f1 = (x) => (Math.round(x * 10) / 10).toFixed(1).replace('-', '−');
  const f2 = (x) => (Math.round(x * 100) / 100).toFixed(2).replace('-', '−');

  window.SciSim3D.attach({
    title: '별의 공간 운동 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: 5, theta: 0.8, phi: 1.1, fov: 40, target: [1, 0, 0], min: 1.5, max: 160 },
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, camera, label, info, controls, orbit, renderer } = ctx;
      const sim = window.__sim;
      if (!sim || !sim.STAR4 || !sim.DIP) { info('수업 자료를 불러오지 못했어요.'); return {}; }
      const STAR4 = sim.STAR4, DIP = sim.DIP, BAR = sim.BAR;
      const lessonS = () => sim.S || {};
      const free = () => !!(sim.game && sim.game.free);
      const ctlEl = renderer.domElement.parentNode.parentNode.querySelector('.v3-ctl');
      const grp = (fn) => { const n0 = ctlEl.children.length; fn(); return Array.prototype.slice.call(ctlEl.children, n0); };

      const cv = document.createElement('canvas'); cv.width = cv.height = 64;
      const c2 = cv.getContext('2d'); const gr = c2.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      c2.fillStyle = gr; c2.fillRect(0, 0, 64, 64);
      const dot = new THREE.CanvasTexture(cv);
      const glow = (hex, op, sc) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color: hex, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending })); s.scale.set(sc, sc, 1); return s; };
      const V = (p) => new THREE.Vector3(p[0], p[1], p[2]);
      const lineObj = (pts, hex, op, dashed, sc) => {
        const g = new THREE.BufferGeometry().setFromPoints(pts.map(V));
        const m = dashed ? new THREE.LineDashedMaterial({ color: hex, transparent: true, opacity: op, dashSize: sc, gapSize: sc * 0.7 }) : new THREE.LineBasicMaterial({ color: hex, transparent: true, opacity: op });
        const l = new THREE.Line(g, m); if (dashed) l.computeLineDistances(); return l;
      };
      function arrow(a, b, hex, w) { // 굵은 화살표 (원기둥 + 원뿔)
        const va = V(a), vb = V(b), d = vb.clone().sub(va), len = d.length(), g = new THREE.Group();
        if (len < 1e-6) return g;
        const hl = Math.min(len * 0.35, w * 5), shaft = Math.max(0, len - hl);
        const mat = new THREE.MeshBasicMaterial({ color: hex });
        const sh = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.5, w * 0.5, shaft, 10), mat); sh.position.y = shaft / 2;
        const hd = new THREE.Mesh(new THREE.ConeGeometry(w * 1.5, hl, 14), mat); hd.position.y = shaft + hl / 2;
        const inner = new THREE.Group(); inner.add(sh, hd);
        inner.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
        g.add(inner); g.position.copy(va); return g;
      }
      function dispose(g) { while (g.children.length) { const o = g.children.pop(); if (o.children && o.children.length) dispose(o); if (o.geometry) o.geometry.dispose(); if (o.material && o.material.dispose) o.material.dispose(); } }

      /* ===== 상태 ===== */
      let scene = 'star', si = 0, tYr = 0, showComp = true;
      let dipT = 0, showArrows = true, showLines = true, yaw = 0, yawGoal = null, zoomOn = false, zm = 0;
      const earthCol = 0x3b82f6;

      /* ===================== ① 한 별 ===================== */
      const sg = new THREE.Group(); root.add(sg);
      const L = { e: label('🌍 지구 (관측자)', [0, 0, 0], { size: LS, color: 'rgba(20,60,140,.92)' }), s: label('', [0, 0, 0], { size: LS, color: 'rgba(40,40,60,.9)' }),
        vr: label('', [0, 0, 0], { size: LS, color: 'rgba(150,40,40,.92)' }), vt: label('', [0, 0, 0], { size: LS, color: 'rgba(15,100,50,.92)' }),
        v: label('', [0, 0, 0], { size: LS, color: 'rgba(120,90,0,.95)' }), d: label('', [0, 0, 0], { size: LS, color: 'rgba(30,50,110,.92)' }), pl: label('하늘면 (시선에 수직)', [0, 0, 0], { size: LS - 1, color: 'rgba(60,70,100,.8)' }),
        mn: label('최근접', [0, 0, 0], { size: LS, color: 'rgba(150,60,0,.92)' }) };
      const star = () => STAR4[si];
      const tHat = () => { const a = PA[si] * DEG; return [0, Math.cos(a), Math.sin(a)]; };
      const known = (key) => si !== 0 || free() || !!(lessonS().rd && key === 'vr' && lessonS().rd.ok) || !!(lessonS().tn && key === 'vt' && lessonS().tn.ok) || !!(lessonS().vc && ((key === 'v' && lessonS().vc.vOk) || (key === 'dm' && lessonS().vc.dmOk)));
      const num = (key, x, unit) => (known(key) ? f1(x) + (unit || ' km/s') : '?');
      function posAt(t) { // 처음(t=0) 시선 방향(x축)과 하늘면(y, z)을 기준으로 한 별의 위치 (pc)
        const s = star(), th = tHat(), x = s.d + s.vr * KMS_PC_YR * t, y = s.vt * KMS_PC_YR * t;
        return [x, th[1] * y, th[2] * y];
      }
      function buildStar() {
        dispose(sg);
        const s = star(), d = s.d, th = tHat(), k = 0.62 * d / Math.max(Math.abs(s.vr), s.vt);        // 속도 → 길이 (별마다 보기 좋게 맞춤)
        const u = d / 10;                                                                               // 그림 크기 단위
        const P = posAt(tYr), tmin = Math.max(0, s.d * Math.abs(s.vr) / (s.v * s.v) / KMS_PC_YR), dmin = d * s.vt / s.v;
        // 지구
        const earth = new THREE.Mesh(new THREE.SphereGeometry(0.34 * u, 20, 14), new THREE.MeshStandardMaterial({ color: earthCol, roughness: 0.6 })); sg.add(earth);
        // 별 (현재 위치)
        const st = new THREE.Mesh(new THREE.SphereGeometry(0.42 * u, 20, 14), new THREE.MeshBasicMaterial({ color: new THREE.Color(s.c) })); st.position.set(P[0], P[1], P[2]); st.add(glow(s.c, 0.9, 3 * u)); sg.add(st);
        // 처음 위치(t=0)와 경로
        if (tYr > 0) { const s0 = new THREE.Mesh(new THREE.SphereGeometry(0.22 * u, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(s.c), transparent: true, opacity: 0.45 })); s0.position.set(d, 0, 0); sg.add(s0); }
        const path = []; for (let i = 0; i <= 40; i++) path.push(posAt(20000 * i / 40)); sg.add(lineObj(path, 0xffffff, 0.45, true, 0.12 * u));
        for (let ty = 5000; ty <= 20000; ty += 5000) { const q = posAt(ty), m = new THREE.Mesh(new THREE.SphereGeometry(0.1 * u, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 })); m.position.set(q[0], q[1], q[2]); sg.add(m); }
        // 시선과 하늘면 (t = 0 기준)
        sg.add(lineObj([[0, 0, 0], [d * 1.18, 0, 0]], 0x9fb4e8, 0.75, true, 0.18 * u));
        const R = 0.62 * d, pl = new THREE.Mesh(new THREE.CircleGeometry(R, 48), new THREE.MeshBasicMaterial({ color: 0x7c9bff, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false })); pl.rotation.y = Math.PI / 2; pl.position.set(d, 0, 0); sg.add(pl);
        const ring = []; for (let i = 0; i <= 64; i++) { const a = i / 64 * TAU; ring.push([d, R * Math.cos(a), R * Math.sin(a)]); } sg.add(lineObj(ring, 0x9db8ff, 0.5));
        // 현재 시선(지구 → 별)
        if (tYr > 0) sg.add(lineObj([[0, 0, 0], P], 0xffe08a, 0.9));
        // 속도 화살표: 별에서 출발. v_r는 시선 방향, v_t는 하늘면 방향
        const vrE = [P[0] + s.vr * k, P[1], P[2]], vtE = [P[0], P[1] + th[1] * s.vt * k, P[2] + th[2] * s.vt * k], vE = [vrE[0], vtE[1], vtE[2]];
        sg.add(arrow(P, vrE, 0xff6b6b, 0.16 * u), arrow(P, vtE, 0x4ade80, 0.16 * u));
        if (showComp) { sg.add(lineObj([vrE, vE], 0xffffff, 0.5, true, 0.1 * u), lineObj([vtE, vE], 0xffffff, 0.5, true, 0.1 * u)); }
        sg.add(arrow(P, vE, 0xffd34d, 0.2 * u));
        // 이름표
        const nm = s.n, dT = Math.hypot(P[0], P[1], P[2]);
        L.s.set('⭐ ' + nm); L.s.obj = P; L.s.off = [0, 1.2 * u, 1.5 * u];
        L.vr.set('v<sub>r</sub> ' + num('vr', s.vr)); L.vr.obj = [vrE[0], vrE[1], vrE[2]]; L.vr.off = [0, -1.1 * u, 0];
        L.vt.set('v<sub>t</sub> ' + num('vt', s.vt)); L.vt.obj = [P[0], (P[1] + vtE[1]) / 2, (P[2] + vtE[2]) / 2]; L.vt.off = [0.0, 0.0, 0.0];
        L.v.set('v ' + num('v', s.v)); L.v.obj = [(P[0] + vE[0]) / 2, (P[1] + vE[1]) / 2, (P[2] + vE[2]) / 2]; L.v.off = [0, 0.8 * u, 0];
        L.d.set('d = ' + f2(dT) + ' pc'); L.d.obj = [P[0] / 2, P[1] / 2, P[2] / 2]; L.d.off = [0, -1.7 * u, 0];
        L.pl.obj = [d, -R * 0.55, -R * 0.55]; L.pl.off = [0, 0, 0];
        L.e.obj = [0, 0, 0]; L.e.off = [-2.2 * u, 1.0 * u, 0];
        // 최근접 표시 (슬라이더 범위 안일 때)
        if (tmin <= 20000 && tmin > 0) { const q = posAt(tmin), m = new THREE.Mesh(new THREE.SphereGeometry(0.2 * u, 12, 8), new THREE.MeshBasicMaterial({ color: 0xff9a3c })); m.position.set(q[0], q[1], q[2]); sg.add(m); L.mn.obj = q; L.mn.off = [0, 0.8 * u, 0]; L.mn.set('최근접 ' + (known('dm') ? f2(dmin) + ' pc' : '?') + ' (' + (Math.round(tmin / 100) * 100) + '년 뒤)'); L.mn.show(true); } else L.mn.show(false);
        // 안내
        const theta = Math.atan2(s.vt, Math.abs(s.vr)) / DEG;
        info('<b>' + nm + '</b> · 지구에서 d = ' + f2(d) + ' pc<br>' +
          '<span style="color:#ff8f8f">v<sub>r</sub></span> (시선 방향) ' + num('vr', s.vr) + ' ' + (s.vr < 0 ? '(다가와요)' : '') + '<br>' +
          '<span style="color:#7be8a2">v<sub>t</sub></span> (하늘면 방향) ' + num('vt', s.vt) + '<br>' +
          '<span style="color:#ffd34d">v</span> = √(v<sub>r</sub>² + v<sub>t</sub>²) = ' + num('v', s.v) + (known('v') ? ' · 시선과 ' + f1(theta) + '°' : '') +
          (known('vr') && known('vt') ? '' : '<br><span style="color:#a9b8d8">수업에서 직접 구하면 숫자가 나타나요.</span>'));
        starRange.set(tYr);
        { const P2 = posAt(20000); orbitFit([[0, 0, 0], posAt(0), P2, vrE, vtE, vE, [P2[0] + s.vr * k, P2[1], P2[2]], [P2[0], P2[1] + th[1] * s.vt * k, P2[2] + th[2] * s.vt * k], [P2[0] + s.vr * k, P2[1] + th[1] * s.vt * k, P2[2] + th[2] * s.vt * k]]); }
        setLabelsStar(true);
      }
      function setLabelsStar(on) { ['s', 'vr', 'vt', 'v', 'd', 'pl', 'e'].forEach((k) => L[k].show(on)); if (!on) L.mn.show(false); if (on && tYr === 0) L.d.show(true); }
      function orbitFit(pts) {
        if (fitFor === si) return; fitFor = si;
        const d = star().d, lo = [0, 0, 0], hi = [0, 0, 0];
        pts.concat([[d, -0.62 * d, -0.62 * d], [d, 0.62 * d, 0.62 * d]]).forEach((p) => p.forEach((x, k) => { lo[k] = Math.min(lo[k], x); hi[k] = Math.max(hi[k], x); }));
        orbit.tx = (lo[0] + hi[0]) / 2; orbit.ty = (lo[1] + hi[1]) / 2; orbit.tz = (lo[2] + hi[2]) / 2;
        orbit.dist = Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) * 1.45 * FIT;
      }
      let fitFor = -1;

      /* ===================== ② 북두칠성 ===================== */
      const dg = new THREE.Group(); root.add(dg);
      const D = {}; // 별 메시, 이름표, 화살표
      const dipMeshes = [], dipLabs = [], dipLines = [];
      const Z0 = 27.5;
      function dipPos(s, t) {
        const dx = (s.dx + s.pe * t / 3.6e6) * DEG, dy = (s.dy + s.pn * t / 3.6e6) * DEG;
        const v = new THREE.Vector3(-Math.tan(dx), Math.tan(dy), -1).normalize().multiplyScalar(s.d);
        return v;
      }
      const dipEarth = new THREE.Mesh(new THREE.SphereGeometry(0.55, 20, 14), new THREE.MeshStandardMaterial({ color: earthCol, roughness: 0.6 })); dg.add(dipEarth);
      const labDipE = label('🌍 지구', dipEarth, { size: LS, color: 'rgba(20,60,140,.92)', offset: [0, 1.4, 0] });
      DIP.forEach((s, i) => {
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 12), new THREE.MeshBasicMaterial({ color: 0xdfe9ff })); m.add(glow(0xbfd2ff, 0.8, 2.2)); dg.add(m); dipMeshes.push(m);
        const lb = label(s.n, m, { size: LS - 0.5, color: 'rgba(30,40,70,.88)', offset: [0, 1.0, 0] }); dipLabs.push(lb);
        const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]), new THREE.LineBasicMaterial({ color: 0x9fb4e8, transparent: true, opacity: 0.35 })); dg.add(ln); dipLines.push(ln);
      });
      const arrowG = new THREE.Group(); dg.add(arrowG);
      const dipLink = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 })); dg.add(dipLink);
      const grpKnown = () => free() || !!(lessonS().cn && lessonS().cn.grpOk);
      function updateDip() {
        const kn = grpKnown(), pts = [];
        DIP.forEach((s, i) => {
          const p = dipPos(s, dipT); dipMeshes[i].position.copy(p);
          const col = kn ? (s.grp ? 0x4ade80 : 0xfb923c) : 0xdfe9ff; dipMeshes[i].material.color.setHex(col); dipMeshes[i].children[0].material.color.setHex(col);
          dipLines[i].geometry.setFromPoints([new THREE.Vector3(), p]); dipLines[i].visible = showLines;
          dipLines[i].material.color.setHex(kn ? (s.grp ? 0x4ade80 : 0xfb923c) : 0x9fb4e8);
        });
        // 북두칠성 국자 모양: 두베-메라크-페크다-메그레즈-두베, 메그레즈-알리오스-미자르-알카이드
        const ord = [0, 1, 2, 3, 0, 3, 4, 5, 6]; dipLink.geometry.setFromPoints(ord.map((i) => dipMeshes[i].position));
        // 고유 운동 화살표: 5만 년 동안 하늘에서 움직이는 방향과 크기 (시선 방향 운동은 자료에 없어요)
        dispose(arrowG);
        if (showArrows) DIP.forEach((s, i) => {
          const a = dipPos(s, dipT), b = dipPos(s, dipT + 50000);
          arrowG.add(arrow([a.x, a.y, a.z], [b.x, b.y, b.z], kn ? (s.grp ? 0x4ade80 : 0xfb923c) : 0xffd34d, 0.12));
        });
        dipLabs.forEach((l) => l.show(scene === 'dip'));
        // 안내
        const yr = Math.round(dipT / 1000) * 1000;
        info('<b>북두칠성 7개의 3차원 위치</b> · 지구에서 24~38 pc<br>' +
          (kn ? '<span style="color:#7be8a2">초록</span> 5개는 거의 같은 거리(24~26 pc)에서 같은 방향으로 움직이는 한 무리, <span style="color:#fdae6b">주황</span> 두베·알카이드는 더 멀리서 반대로 움직여요.'
            : '지구에서 보면 한 국자 모양이지만 옆에서 보면 별마다 거리가 달라요. 화살표는 5만 년 동안의 이동이에요. 같은 방향으로 움직이는 별을 찾아봐요.') +
          '<br>' + (yr === 0 ? '지금 모습' : (yr > 0 ? yr.toLocaleString('en-US') + '년 뒤' : (-yr).toLocaleString('en-US') + '년 전')) + '의 모양');
        dipRange.set(dipT);
      }
      function applyYaw() {
        const w = yaw / 90, th = yaw * DEG;
        orbit.theta = th; orbit.phi = Math.PI / 2; orbit.tx = 0; orbit.ty = 0; orbit.tz = -Z0 + 10.5 * w * (1 - zm) - 3.5 * zm * w;
        orbit.dist = (31 + (70 - 31) * w) * (narrow ? 1 + 0.5 * w : 1); camera.fov = ((narrow ? 44 : 20) + ((narrow ? 44 : 27) - (narrow ? 44 : 20)) * w) * (1 - 0.4 * zm * w) + 6 * Math.sin(Math.PI * w) * (1 - zm); const eVis = yaw > 12; dipEarth.visible = eVis; labDipE.show(scene === 'dip' && eVis); camera.updateProjectionMatrix();
      }

      /* ===================== 조작 ===================== */
      const sceneSeg = controls.segment('보기', [{ value: 'star', label: '⭐ 한 별의 속도' }, { value: 'dip', label: '🌌 북두칠성' }], scene, (v) => setScene(v));
      let starRange, dipRange, yawRange, starSeg = null;
      const starCtl = grp(() => {
        starSeg = controls.segment('별', STAR4.map((s, i) => ({ value: i, label: s.n })), si, (v) => { si = v; fitFor = -1; buildStar(); });
        starRange = controls.range('흐른 시간', 0, 20000, 250, tYr, (v) => { tYr = v; buildStar(); }, (v) => v.toLocaleString('en-US') + '년');
        const cB = controls.button('점선 ✓', () => { showComp = !showComp; cB.classList.toggle('on', showComp); cB.textContent = '점선 ' + (showComp ? '✓' : '✕'); buildStar(); }); cB.classList.add('on');
      });
      const dipCtl = grp(() => {
        yawRange = controls.range('시점', 0, 90, 1, 0, (v) => { yaw = v; yawGoal = null; applyYaw(); }, (v) => v + '°' + (v === 0 ? ' (지구에서)' : v === 90 ? ' (옆)' : ''));
        controls.button('🌍 지구에서', () => { yawGoal = 0; });
        controls.button('↔ 옆에서', () => { yawGoal = 90; });
        dipRange = controls.range('시간', -100000, 100000, 5000, dipT, (v) => { dipT = v; updateDip(); }, (v) => (v === 0 ? '지금' : (v > 0 ? '+' : '−') + Math.abs(v / 1000) + '천 년'));
        const aB = controls.button('운동 화살표 ✓', () => { showArrows = !showArrows; aB.classList.toggle('on', showArrows); aB.textContent = '운동 화살표 ' + (showArrows ? '✓' : '✕'); updateDip(); }); aB.classList.add('on');
        const zB = controls.button('🔍 확대', () => { zoomOn = !zoomOn; zB.classList.toggle('on', zoomOn); });
        const lB = controls.button('지구에서 잇기 ✓', () => { showLines = !showLines; lB.classList.toggle('on', showLines); lB.textContent = '지구에서 잇기 ' + (showLines ? '✓' : '✕'); updateDip(); }); lB.classList.add('on');
      });
      function setScene(v) {
        scene = v; sceneSeg.set(v);
        starCtl.forEach((n) => { n.style.display = v === 'star' ? '' : 'none'; });
        dipCtl.forEach((n) => { n.style.display = v === 'dip' ? '' : 'none'; });
        sg.visible = v === 'star'; dg.visible = v === 'dip';
        setLabelsStar(v === 'star'); labDipE.show(v === 'dip' && yaw > 12); dipLabs.forEach((l) => l.show(v === 'dip'));
        if (v === 'star') { fitFor = -1; orbit.theta = 0.8; orbit.phi = 1.1; camera.fov = 40; camera.updateProjectionMatrix(); buildStar(); }
        else { yaw = +yawRange.value || 0; applyYaw(); updateDip(); }
      }

      /* ===== 수업 상태 따라가기 (읽기만) ===== */
      let seen = '';
      function readLesson() {
        try {
          const S = lessonS(); if (!S.view) return;
          const key = S.view + '|' + (S.rd && S.rd.sel) + '|' + (S.tn && S.tn.sel) + '|' + (S.cn && S.cn.ds);
          if (key !== seen) {
            seen = key;
            if (S.view === 'con' && S.cn && S.cn.ds === 'dip') { dipT = S.cn.t || 0; yaw = Math.min(90, S.cn.yaw || 0); yawRange && yawRange.set(yaw); setScene('dip'); return; }
            if (S.view === 'rad') si = S.rd.sel < 4 ? S.rd.sel : 0; else if (S.view === 'tan') si = S.tn.sel; else if (S.view === 'vec') { si = 0; tYr = Math.min(20000, S.vc.t || 0); }
            fitFor = -1; if (starSeg) starSeg.set(si); if (starRange) starRange.set(tYr); setScene('star'); return;
          }
        } catch (e) { /* 수업 상태를 못 읽어도 괜찮아요 */ }
        if (scene === 'star') buildStar(); else updateDip();
      }
      setScene('star'); readLesson();
      let acc = 0, lastKn = '';
      return {
        update(dt) {
          if (orbit.tx === 1 && orbit.ty === 0 && orbit.tz === 0 && orbit.dist === 5) { // '↺ 시점' 단추: 지금 장면에 맞는 시점으로 되돌려요
            if (scene === 'star') { fitFor = -1; orbit.theta = 0.8; orbit.phi = 1.1; buildStar(); } else { applyYaw(); orbit.phi = Math.PI / 2; }
          }
          if (scene === 'dip') { const g = zoomOn ? 1 : 0; if (Math.abs(zm - g) > 0.002) { zm += (g - zm) * Math.min(1, dt * 6); applyYaw(); } }
          if (yawGoal != null && scene === 'dip') { yaw += Math.sign(yawGoal - yaw) * Math.min(Math.abs(yawGoal - yaw), dt * 110); applyYaw(); yawRange.set(Math.round(yaw)); if (yaw === yawGoal) yawGoal = null; }
          acc += dt; if (acc > 0.5) { acc = 0; const k = (known('vr') ? 1 : 0) + '' + (known('vt') ? 1 : 0) + (known('v') ? 1 : 0) + (known('dm') ? 1 : 0) + (grpKnown() ? 1 : 0); if (k !== lastKn) { lastKn = k; if (scene === 'star') buildStar(); else updateDip(); } }
        },
        sync() { readLesson(); },
      };
    },
  });
})();
