/* hq-lorentz-force · 3D 자기장 속 하전 입자 (벡터 v, B, F = qv×B · 원운동 · 나선 운동)
   약속: 균일한 자기장 B는 위쪽(+y)을 향해요 (위에서 내려다보면 화면 '밖으로' ⊙ = 2D 실험과 같아요).
   F = q v × B. 양전하는 위에서 볼 때 시계 방향, 음전하는 시계 반대 방향으로 돌아요. 입사각 θ는 v와 B 사이의 각이에요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches), KD = PHN ? 1.45 : 1;
  const QE = 1.6e-19, ME = 9.11e-31, MP = 1.67e-27, TAU = Math.PI * 2, D2R = Math.PI / 180;
  const SP = {
    e: { name: '전자', q: -QE, m: ME, sgn: -1, vmin: 0, vmax: 4.0, vstep: 0.5, vdef: 2.0, bmin: 0.5, bmax: 2.0, bstep: 0.1, bdef: 1.0, bun: 'mT', bk: 1e-3, col: 0x3f7bff, vun: '×10⁶ m/s' },
    p: { name: '양성자', q: QE, m: MP, sgn: 1, vmin: 0, vmax: 1.0, vstep: 0.25, vdef: 0.5, bmin: 0.10, bmax: 0.40, bstep: 0.05, bdef: 0.20, bun: 'T', bk: 1, col: 0xff5a5f, vun: '×10⁶ m/s' },
    pos: { name: '양전자', q: QE, m: ME, sgn: 1, vmin: 0, vmax: 4.0, vstep: 0.5, vdef: 2.0, bmin: 0.5, bmax: 2.0, bstep: 0.1, bdef: 1.0, bun: 'mT', bk: 1e-3, col: 0xff5a5f, vun: '×10⁶ m/s' },
  };
  const g3 = (x) => String(parseFloat((x * (1 + 1e-12)).toPrecision(3)));

  window.SciSim3D.attach({
    button: (window.matchMedia && window.matchMedia('(max-width: 599px)').matches) ? null : undefined,
    title: '로런츠 힘 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: 11 * KD, theta: 0.7, phi: 0.9, min: 4, max: 40, target: [0, 1.5, 0] },
    autoRotate: 0,
    levels: [1, 2],
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3, Yax = new V3(0, 1, 0);
      const lessonS = () => (window.__sim && window.__sim.S) || null;
      const st = { sp: 'e', v: 2.0, B: 1.0, th: 90, vec: true, qn: 1, cmp: false, v2: 0 };
      const S0 = lessonS();
      
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.45, metalness: 0.05 }, o || {}));
      const basic = (c, o) => new THREE.MeshBasicMaterial(Object.assign({ color: c }, o || {}));
      function mkArrow(col, rad) {
        const g = new THREE.Group(); const m = mat(col, { roughness: 0.4 });
        const sh = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 1, 10), m), hd = new THREE.Mesh(new THREE.ConeGeometry(rad * 2.6, rad * 6, 14), m);
        g.add(sh, hd); g.userData = { sh, hd, rad }; return g;
      }
      function setArrow(g, a, b) {
        const d = new V3().subVectors(b, a), len = d.length(); const { sh, hd, rad } = g.userData;
        if (len < 1e-3) { g.visible = false; return; }
        g.visible = true; const hl = Math.min(len * 0.5, rad * 6);
        sh.scale.y = Math.max(0.001, len - hl); sh.position.y = (len - hl) / 2; hd.scale.y = hl / (rad * 6); hd.position.y = len - hl / 2;
        g.position.copy(a); g.quaternion.setFromUnitVectors(Yax, d.normalize());
      }

      /* ---------- 자기장 B (위쪽): 바닥 격자 화살표 + 틀 ---------- */
      const Bcol = 0x9b7bff;
      const grid = new THREE.Group(); root.add(grid);
      for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) {
        const a = mkArrow(Bcol, 0.022); const x = i * 2.4, z = j * 2.4;
        setArrow(a, new V3(x, -1.2, z), new V3(x, 0.1, z)); a.children.forEach((c) => { c.material = mat(Bcol, { transparent: true, opacity: 0.45 }); }); grid.add(a);
      }
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(17.5, 17.5), basic(0x6b7fb4, { transparent: true, opacity: 0.1, side: THREE.DoubleSide })); floor.rotation.x = -Math.PI / 2; floor.position.y = -1.2; root.add(floor);
      const labBField = label('자기장 B ↑ (전부 위쪽)', [-7, -1.2, 7], { color: '#6d28d9', size: 12.5 });

      /* ---------- 입자 · 벡터 · 궤적 ---------- */
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), mat(0x3f7bff, { emissive: 0x1b2f66 })); root.add(ball);
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.01, 0.01), basic(0xffffff)); void sign;
      const vA = mkArrow(0x14b8a6, 0.05), bA = mkArrow(0x9b7bff, 0.05), fA = mkArrow(0xf26b3a, 0.06); root.add(vA, bA, fA);
      const tipV = new THREE.Object3D(), tipB = new THREE.Object3D(), tipF = new THREE.Object3D(); root.add(tipV, tipB, tipF);
      const labV = label('v', tipV, { color: '#0d9488', size: 14, offset: [0, 0.22, 0] }), labB = label('B', tipB, { color: '#7c3aed', size: 14, offset: [0, 0.22, 0] }), labF = label('F = qv×B', tipF, { color: '#f26b3a', size: 14, offset: [0, 0.25, 0] });
      const labQ = label('', ball, { color: 'rgba(8,12,24,.75)', size: 13, offset: [0, -0.85, 0] });
      let ghost = null, trail = null, T_N = 0;

      /* ---------- 물리 (2D 차시와 같은 식) ---------- */
      let P = null, scale = 1, wv = 1, tt = 0, nTurns = 2;
      function params() {
        const s = SP[st.sp], v = st.v * 1e6, B = st.B * s.bk, sin = Math.sin(st.th * D2R), cos = Math.cos(st.th * D2R);
        const qa = Math.abs(s.q) * st.qn, r = s.m * v * sin / (qa * B), Tper = TAU * s.m / (qa * B), pitch = TAU * s.m * v * cos / (qa * B);
        return { s, v, B, r, T: Tper, pitch };
      }
      function rebuild() {
        const s = SP[st.sp];
        const rdef = s.m * s.vdef * 1e6 / (Math.abs(s.q) * s.bdef * s.bk);
        scale = 1.3 / rdef;                                                    // 1 m = scale 화면 단위 (입자마다 같은 비율)
        P = params();
        const Tdef = TAU * s.m / (Math.abs(s.q) * s.bdef * s.bk);
        wv = TAU / (3.0 * (P.T / Tdef));                                         // 보이는 각속도 (T ∝ 1/B 가 그대로 보여요)
        const ru = P.r * scale, pu = P.pitch * scale;
        nTurns = pu > 0.3 ? Math.max(0.75, Math.min(2, 9 / pu)) : 2;
        if (ghost) { root.remove(ghost); ghost.geometry.dispose(); } if (trail) { root.remove(trail); trail.geometry.dispose(); }
        if (st.v > 0 && P.r >= 0) {
          const N = 240, pts = []; for (let i = 0; i <= N; i++) pts.push(posAt(i / N * nTurns * TAU / wv, ru, pu));
          const curve = new THREE.CatmullRomCurve3(pts);
          ghost = new THREE.Mesh(new THREE.TubeGeometry(curve, N, 0.018, 5, false), basic(s.col, { transparent: true, opacity: 0.3 }));
          trail = new THREE.Mesh(new THREE.TubeGeometry(curve, N, 0.045, 6, false), basic(s.col));
          T_N = N; root.add(ghost, trail);
        } else { ghost = trail = null; }
        ball.material.color.setHex(s.col); ball.material.emissive.setHex(s.col === 0xff5a5f ? 0x661b1b : 0x1b2f66);
        labQ.set(s.sgn > 0 ? '+ ' + s.name : '− ' + s.name);
        const hMid = Math.min(6, pu * nTurns / 2);
        ctx.orbit.ty = Math.max(0.5, hMid); ctx.orbit.tz = s.sgn * ru; ctx.orbit.tx = 0; ctx.orbit.dist = Math.max(10, 7 + pu * nTurns * 0.9, ru * 4.5) * KD;
        text();
      }
      function posAt(t, ru, pu) { // t = 보이는 시간(초): x = r sin ωt, z = s·r(1−cos ωt), y = 피치 · t/T
        const a = wv * t; return new V3(ru * Math.sin(a), pu * a / TAU, P.s.sgn * ru * (1 - Math.cos(a)));
      }
      function text() {
        const s = P.s, th = st.th;
        let h = '<b>' + s.name + '</b> (' + (s.sgn > 0 ? '+' : '−') + ') · v = ' + g3(st.v) + '×10⁶ m/s · B = ' + g3(st.B) + ' ' + s.bun + ' · θ = ' + th + '°<br>';
        if (st.v === 0) h += '속력이 0이면 <b>힘이 0</b>이에요. 자기장은 정지한 전하에는 힘을 주지 않아요.';
        else if (th === 0) h += 'v가 B와 <b>나란하면 F = 0</b>이에요(sin 0° = 0). 그래서 곧게 나아가요.';
        else {
          h += 'F = qvB sinθ, 방향은 v와 B에 모두 <b>수직</b>이라 속력은 그대로이고 방향만 바뀌어요.<br>';
          h += 'r = mv sinθ/(|q|B) = <b>' + g3(P.r * 100) + ' cm</b> · T = 2πm/(|q|B) = <b>' + g3(P.T * 1e9) + ' ns</b>' + (th < 90 ? ' · 나선 한 바퀴 이동 = <b>' + g3(P.pitch * 100) + ' cm</b>' : '') + '<br>';
          h += s.sgn > 0 ? '양전하: 위에서 볼 때 <b>시계 방향</b>.' : '음전하: F가 양전하와 반대라 위에서 볼 때 <b>시계 반대 방향</b>.';
          h += ' 재생 속도는 입자마다 달라요.';
        }
        info(h + (infoNote ? '<br>' + infoNote : ''));
      }

      /* ---------- 조작: 입자·v·B·θ는 2D 화면 옆의 조작판이 정해요 (3D는 같은 값을 그대로 보여 줘요) ---------- */
      const vecB = controls.button('벡터 ✓', () => { st.vec = !st.vec; vecB.classList.toggle('on', st.vec); vecB.textContent = '벡터 ' + (st.vec ? '✓' : '✕'); });
      vecB.classList.add('on');
      /* 비교 입자 (속력이 다른 입자 하나 더): 2D의 [👥 비교 입자]와 같아요 */
      const ball2 = new THREE.Mesh(new THREE.SphereGeometry(0.17, 24, 16), mat(0x10b981, { emissive: 0x0b5f44 })); root.add(ball2);
      const lab2 = label('', ball2, { color: '#059669', size: 12.5, offset: [0, -0.7, 0] });
      let trail2 = null, P2 = null;
      function rebuild2() {
        if (trail2) { root.remove(trail2); trail2.geometry.dispose(); trail2 = null; }
        ball2.visible = false; lab2.show(false); P2 = null;
        if (!st.cmp || st.v <= 0) return;
        const s = SP[st.sp], v = st.v2 * 1e6, B = st.B * s.bk, sin = Math.sin(st.th * D2R), qa = Math.abs(s.q) * st.qn;
        P2 = { r: s.m * v * sin / (qa * B), v: st.v2 };
        const ru = P2.r * scale, N = 160, pts = []; for (let i = 0; i <= N; i++) { const a = i / N * TAU; pts.push(new V3(ru * Math.sin(a), 0, s.sgn * ru * (1 - Math.cos(a)))); }
        trail2 = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), N, 0.04, 6, true), basic(0x10b981, { transparent: true, opacity: 0.8 })); root.add(trail2);
        ball2.visible = true; lab2.show(true); lab2.set('비교 입자 v = ' + g3(st.v2) + '×10⁶ m/s · r = ' + g3(P2.r * 100) + ' cm');
        const ru1 = P.r * scale; ctx.orbit.dist = Math.max(ctx.orbit.dist, (ru + ru1) * 4 * KD); ctx.orbit.tz = s.sgn * Math.max(ru, ru1);
      }
      /* ---------- 2D 실험의 값을 그대로 따라가요 ---------- */
      let lastSig = '', infoNote = '';
      function readLesson() {
        const S = lessonS(); if (!S) return;
        let sp = st.sp, v = st.v, B = st.B, th = st.th, qn = 1, cmp = false, v2 = 0, note = '';
        if (S.mode === 'orb') { sp = S.o.sp; v = S.o.v; B = S.o.B; th = S.o.th; cmp = !!S.o.cmp; if (cmp) { try { v2 = window.__sim.cmpV(); } catch (e) { v2 = v * 2; } } }
        else if (S.mode === 'mag') { sp = 'e'; v = S.m.v; B = S.m.B; th = S.m.th; qn = S.m.q; if (S.m.view === 'wire') note = '(도선 확대 장면 F = BIL은 2D에서 확인해요. 3D는 입자 하나의 운동이에요.)'; }
        else if (S.mode === 'cond') { sp = S.c.sign > 0 ? 'pos' : 'e'; v = S.c.kase === 'rest' ? 0 : 2.0; B = 1.0; th = S.c.kase === 'par' ? 0 : S.c.kase === 'oblique' || S.c.kase === 'obl' ? 30 : 90; note = S.c.field === 'E' ? '전기장에서는 정지한 전하도 힘을 받지만, 이 3D 모형은 자기장 속의 운동을 보여 줘요.' : ''; }
        else note = '(이 단계는 2D 그림을 읽는 활동이에요. 3D는 자기장 속 입자의 운동 모형이에요.)';
        const sig = [sp, v, B, th, qn, cmp, v2, note].join('|');
        if (sig === lastSig) return; lastSig = sig;
        if (!SP[sp]) sp = 'e';
        Object.assign(st, { sp, v, B, th, qn, cmp, v2 }); infoNote = note; tt = 0; rebuild(); rebuild2();
      }
      const tmpV = new V3(), tmpF = new V3();
      return {
        update(dt) {
          readLesson();
          tt += dt;
          const ru = P.r * scale, pu = P.pitch * scale, period = nTurns * TAU / wv;
          const t = st.v > 0 ? tt % period : 0;
          const pos = st.v > 0 ? posAt(t, ru, pu) : new V3(0, 0, 0);
          ball.position.copy(pos);
          if (trail) trail.geometry.setDrawRange(0, Math.max(0, Math.floor(t / period * T_N)) * 30 + 30);
          const a = wv * t, sg = P.s.sgn, sin = Math.sin(st.th * D2R), cos = Math.cos(st.th * D2R);
          // 속도 방향 (위쪽 성분 cosθ, 수평 성분 sinθ가 시계/반시계로 회전)
          tmpV.set(sin * Math.cos(a), cos, sg * sin * Math.sin(a));
          if (st.v === 0) tmpV.set(0, 0, 0);
          // F = q v × B , B = +y : v × ŷ = (−v_z, 0, v_x)
          tmpF.set(-tmpV.z, 0, tmpV.x).multiplyScalar(sg);
          const show = st.vec;
          if (st.v > 0 && show) setArrow(vA, pos, pos.clone().addScaledVector(tmpV, 1.5)); else vA.visible = false;
          if (show) setArrow(bA, pos.clone().add(new V3(0, 0.0, 0)), pos.clone().add(new V3(0, 1.5, 0))); else bA.visible = false;
          const fmag = tmpF.length();
          if (show && fmag > 0.01) setArrow(fA, pos, pos.clone().addScaledVector(tmpF.normalize(), 0.5 + 1.0 * (st.v / P.s.vmax) * sin)); else fA.visible = false;
          tipV.position.copy(pos).addScaledVector(tmpV, 1.55); tipB.position.copy(pos).add(new V3(0, 1.55, 0));
          tipF.position.copy(pos).addScaledVector(tmpF, 1.6);
          labV.show(show && st.v > 0); labB.show(show); labF.show(show && fmag > 0.01);
          if (show && fmag <= 0.01) { labF.set('F = 0'); labF.show(true); tipF.position.copy(pos).add(new V3(0.9, 0.2, 0)); } else labF.set('F = qv×B');
          labQ.show(true);
          if (P2) { const a2 = wv * t, ru2 = P2.r * scale, sg2 = P.s.sgn; ball2.position.set(ru2 * Math.sin(a2), 0, sg2 * ru2 * (1 - Math.cos(a2))); }
        },
        sync() { lastSig = ''; },
      };
    },
  });
})();
