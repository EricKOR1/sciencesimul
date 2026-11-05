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
    levels: [1, 2],   // 1단계는 전기장 모드와 비교해야 하고, 4단계는 캔버스의 트랙 동그라미를 눌러야 해서 2D
    build(ctx) {
      const { THREE, controls } = ctx;
      const root = new THREE.Group(); ctx.root.add(root);
      const K = { cur: 'orb', labs: [] };
      const label = (text, obj, o, sc) => { const L = ctx.label(text, obj, o), sh = L.show; L._own = true; L._sc = sc || 'orb'; L._ap = () => sh(L._own && K.cur === L._sc); L.show = (v) => { L._own = v; L._ap(); }; K.labs.push(L); L._ap(); return L; };
      const info = (hh) => ctx.info(hh);
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
          T_N = N; root.add(trail);   // 앞으로 갈 경로(흐린 안내선)는 보여 주지 않고, 지나간 자취만 남겨요
          trail.geometry.setDrawRange(0, 0);
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
      /* =====================================================================
         새 장면: 거품 상자의 궤적 읽기 (trk) — 2D의 TRK 궤적을 그대로 3D 거품 상자에 그려요
         ===================================================================== */
      const gTr = new THREE.Group(); ctx.root.add(gTr); gTr.visible = false;
      const TU = 0.03, TX0 = 240, TY0 = 300;
      const chamber = new THREE.Mesh(new THREE.BoxGeometry(14.5, 1.2, 11), new THREE.MeshStandardMaterial({ color: 0x9fc4ff, transparent: true, opacity: 0.12, roughness: 0.2, depthWrite: false })); chamber.position.set(0, 0, 0.8); gTr.add(chamber);
      const chEdge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(14.5, 1.2, 11)), new THREE.LineBasicMaterial({ color: 0x8aa0c8 })); chEdge.position.copy(chamber.position); gTr.add(chEdge);
      for (let i = -3; i <= 3; i++) for (let j = -2; j <= 2; j++) { const a = mkArrow(0x9b7bff, 0.02); setArrow(a, new V3(i * 2.2, -0.6, j * 2.2 + 0.8), new V3(i * 2.2, 1.6, j * 2.2 + 0.8)); a.children.forEach((c) => { c.material = mat(0x9b7bff, { transparent: true, opacity: 0.4 }); }); gTr.add(a); }
      const trLabs = []; const labT = (t, o, opt) => { const l = label(t, o, opt, 'trk'); trLabs.push(l); return l; };
      labT('자기장 B ↑ (위에서 보면 ⊙ 화면 밖으로)', [-5, 1.7, -5.2], { color: '#6d28d9', size: 12.5 });
      const trk = window.__sim.TRK, gridLines = [];
      const trM = {}; // fig → [{tube, ghost, head, pts, mark, lab}]
      function mkFig(f) {
        if (trM[f]) return trM[f];
        const list = (trk[f] || []).map((t) => {
          const n = t.pts.length / 2, pts = []; for (let i = 0; i < n; i++) pts.push(new V3((t.pts[i * 2] - TX0) * TU, 0.05, (t.pts[i * 2 + 1] - TY0) * TU + 4.4));
          const col = new THREE.Color(t.col).getHex(), cv = new THREE.CatmullRomCurve3(pts);
          const tube = new THREE.Mesh(new THREE.TubeGeometry(cv, Math.min(300, n), 0.07, 8, false), basic(col)); tube.frustumCulled = false; gTr.add(tube);
          const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), basic(0xfbbf24)); gTr.add(head);
          const mk = new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 14), mat(0x94a3b8, { roughness: 0.4 })); gTr.add(mk);
          const lab = label('?', mk, { color: 'rgba(8,12,24,.0)', size: 20 }, 'trk'); lab.el.style.background = 'transparent'; lab.el.style.border = '0'; lab.el.style.boxShadow = 'none'; lab.el.style.color = '#fff'; lab.el.style.fontWeight = '900'; trLabs.push(lab);
          const nm = label(f === 'a' ? '트랙 ' + t.id : '', mk, { color: 'rgba(8,12,24,.78)', size: 12, offset: [0, 0.75, 0] }, 'trk'); trLabs.push(nm);
          return { t, n, tube, head, mk, lab, nm, pts };
        });
        trM[f] = list; return list;
      }
      ['a', 'b'].forEach(mkFig);
      // 그림 다: 눈금 격자 + 양성자 한 개의 궤적 (r = 5.0 cm, 격자 한 칸 = 1.0 cm)
      const fc = new THREE.Group(); gTr.add(fc);
      for (let i = -6; i <= 6; i++) { [[new V3(i * 0.6, 0.02, -3.6 + 4.4 - 0.6), new V3(i * 0.6, 0.02, 3.6 + 4.4 - 3.6)]].forEach(() => { }); const l1 = h2Seg(new V3(i * 0.6, 0.02, -2.9), new V3(i * 0.6, 0.02, 3.9)); fc.add(l1); const l2 = h2Seg(new V3(-3.6, 0.02, 0.5 + i * 0.6), new V3(3.6, 0.02, 0.5 + i * 0.6)); fc.add(l2); }
      function h2Seg(a, b) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1, 4), basic(0x64748b, { transparent: true, opacity: 0.35 })); const d = new V3().subVectors(b, a); m.scale.y = d.length(); m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(Yax, d.normalize()); return m; }
      const CR = 100 * TU, cC = new V3(0, 0.05, 0.5), aS = -Math.PI * 0.9, aSpan = Math.PI * 1.55;
      const cArc = []; for (let i = 0; i <= 120; i++) { const a = aS + aSpan * i / 120; cArc.push(new V3(cC.x + CR * Math.cos(a), 0.05, cC.z + CR * Math.sin(a))); }
      const cTube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cArc), 120, 0.07, 8, false), basic(0xc2410c)); cTube.frustumCulled = false; fc.add(cTube);
      const cRad = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 6), basic(0x16a34a)); { const d = new V3(Math.cos(0.5) * CR, 0, Math.sin(0.5) * CR); cRad.scale.y = d.length(); cRad.position.copy(cC).addScaledVector(d, 0.5); cRad.quaternion.setFromUnitVectors(Yax, d.clone().normalize()); } fc.add(cRad);
      const cCen = sphereT(0.1, 0x475569); cCen.position.copy(cC); fc.add(cCen);
      const cP = sphereT(0.26, 0xe2464b, { emissive: 0x661b1b }); fc.add(cP); const cPl = label('양성자 +', cP, { color: 'rgba(194,65,12,.92)', size: 12, offset: [0, 0.6, 0] }, 'trk'); trLabs.push(cPl);
      const cRl = labT('r = 5.0 cm', [0.9, 0.4, 1.0], { color: '#16a34a', size: 13 }); const cGl = labT('격자 한 칸 = 1.0 cm · 양성자 · B = 0.20 T', [0, 0.1, 4.6], { color: '#334155', size: 12 });
      function sphereT(r, c, o) { return new THREE.Mesh(new THREE.SphereGeometry(r, 18, 14), mat(c, o)); }
      const orig = sphereT(0.18, 0x475569); orig.position.set(0, 0.05, 4.4); gTr.add(orig); const oLab = labT('', [0, 0.1, 4.4], { color: '#475569', size: 12 });
      const trP = { on: false, tt: 0 }; let trSig = '';
      function updTrk(S, dt, t) {
        const k = S.k, f = k.fig; const sg = f + '|' + k.tt.toFixed(0); void sg;
        Object.keys(trM).forEach((ff) => trM[ff].forEach((q) => { const on = ff === f; q.tube.visible = q.head.visible = q.mk.visible = on; q.lab.show(on); q.nm.show(on); }));
        fc.visible = f === 'c'; cPl.show(f === 'c'); cRl.show(f === 'c'); cGl.show(f === 'c');
        const tt = trP.on ? trP.tt : k.tt, ab = f === 'a' || f === 'b';
        orig.visible = ab; oLab.show(ab); oLab.set(f === 'a' ? '충돌 위치' : '쌍 생성 위치'); oLab.obj = [0, 0.1, 4.4 + 0.9];
        if (ab) {
          const cyc = tt % 7.5, prog = Math.max(0, Math.min(1, cyc / 2.6)), fade = cyc > 6.3 ? Math.max(0, 1 - (cyc - 6.3) / 1.2) : 1;
          trM[f].forEach((q) => {
            const m = Math.max(2, Math.floor(q.n * prog)); q.tube.geometry.setDrawRange(0, Math.max(6, Math.floor(m / q.n * (q.tube.geometry.index ? q.tube.geometry.index.count : 0) / 1))); q.tube.material.opacity = 1; q.tube.material.transparent = true; q.tube.material.opacity = fade;
            q.head.position.copy(q.pts[m - 1]); q.head.visible = prog < 1;
            const i0 = Math.floor(q.n * 0.62); q.mk.position.copy(q.pts[i0]); q.mk.position.y = 0.25;
            const g = k.guess[f][q.t.id], ok = g != null && g === q.t.sign; q.mk.material.color.setHex(g == null ? 0x94a3b8 : ok ? 0x16a34a : 0xf26b3a); q.lab.set(g == null ? '?' : g > 0 ? '+' : '−');
          });
        } else {
          const cyc = tt % 6, prog = Math.max(0, Math.min(1, cyc / 2.4)), a = aS + aSpan * prog;
          cP.position.set(cC.x + CR * Math.cos(a), 0.05, cC.z + CR * Math.sin(a)); cTube.geometry.setDrawRange(0, Math.max(6, Math.floor(prog * cTube.geometry.index.count)));
        }
        info(f === 'a' ? '<b>거품 상자 (위에서 본 모습)</b>: 모든 입자는 전하의 크기가 같아요. 곡선이 <b>휘는 방향</b>으로 부호를 알 수 있어요 (B ⊙에서 <b>+는 시계 방향</b>, −는 반시계). 반지름이 클수록 운동량 p = |q|Br이 커요.'
          : f === 'b' ? '<b>쌍 생성</b>: 한 곳에서 생긴 한 쌍은 <b>반대로 휘어요</b>. 나선으로 안쪽으로 감기면 에너지(속력)를 잃고 있어요.' : '<b>양성자 한 개의 궤적</b>: 격자 한 칸 = 1.0 cm이면 반지름 r = 5.0 cm. 운동량 p = qBr, 속력 v = p/m을 계산해 보세요.');
      }
      const plTr = controls.player({ duration: 8, loop: true, autoplay: false, label: '궤적 다시 보기', phases: [[0, '입자가 지나가요'], [0.35, '궤적이 남아요'], [0.8, '사라져요']], onFrame(p) { trP.on = true; trP.tt = p * 7.5; } });
      const trRow = document.querySelectorAll('.v3-player'); const trRowEl = trRow[trRow.length - 1]; trRowEl.style.display = 'none'; const vecBtn = vecB;
      function setSc(k) { if (k === K.cur) return; K.cur = k; root.visible = k === 'orb'; gTr.visible = k === 'trk'; K.labs.forEach((L) => L._ap()); trRowEl.style.display = k === 'trk' ? '' : 'none'; vecBtn.style.display = k === 'trk' ? 'none' : ''; if (k !== 'trk') { plTr.pause(); lastSig = ''; } else { const o = ctx.orbit; o.theta = 0.0; o.phi = 0.62; o.dist = (PHN2() ? 21 : 13.5); o.tx = 0; o.ty = 0; o.tz = 1.0; } }
      function PHN2() { return !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches); }
      /* ---------- 2D 실험의 값을 그대로 따라가요 ---------- */
      let lastSig = '', infoNote = '';
      function readLesson() {
        const S = lessonS(); if (!S) return;
        let sp = st.sp, v = st.v, B = st.B, th = st.th, qn = 1, cmp = false, v2 = 0, note = '';
        if (S.mode === 'orb') { sp = S.o.sp; v = S.o.v; B = S.o.B; th = S.o.th; cmp = !!S.o.cmp; if (cmp) { try { v2 = window.__sim.cmpV(); } catch (e) { v2 = v * 2; } } }
        else if (S.mode === 'mag') { sp = 'e'; v = S.m.v; B = S.m.B; th = S.m.th; qn = S.m.q; }
        else if (S.mode === 'cond') { sp = S.c.sign > 0 ? 'pos' : 'e'; v = S.c.kase === 'rest' ? 0 : 2.0; B = 1.0; th = S.c.kase === 'par' ? 0 : S.c.kase === 'oblique' || S.c.kase === 'obl' ? 30 : 90; note = S.c.field === 'E' ? '전기장에서는 정지한 전하도 힘을 받지만, 이 3D 모형은 자기장 속의 운동을 보여 줘요.' : ''; }
        else note = '';
        const sig = [sp, v, B, th, qn, cmp, v2, note].join('|');
        if (sig === lastSig) return; lastSig = sig;
        if (!SP[sp]) sp = 'e';
        Object.assign(st, { sp, v, B, th, qn, cmp, v2 }); infoNote = note; tt = 0; rebuild(); rebuild2();
      }
      const tmpV = new V3(), tmpF = new V3();
      return {
        update(dt, t0) {
          { const S = lessonS(), k = S && S.mode === 'trk' ? 'trk' : 'orb'; if (k !== K.cur) setSc(k); if (k === 'trk') { const kk = S.k.fig; if (kk !== trSig) { trSig = kk; trP.on = false; plTr.pause(); } updTrk(S, dt, t0); return; } }
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
