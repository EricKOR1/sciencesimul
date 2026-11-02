/* hq-faraday-law · 3D 자기선속 · 전자기 유도 · 렌츠 법칙 · 자기 브레이크
   Φ = BA cosθ (면을 지나는 자기력선의 수). 유도 기전력 ε = −N ΔΦ/Δt. 유도 전류의 방향은 선속 변화를 방해하는 쪽(렌츠 법칙). */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  /* ---------- 공통 도우미 (모형 만들기) ---------- */
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches), KD = PHN ? 1.45 : 1;
  function H3(ctx) {
    const { THREE, root } = ctx;
    const V3 = THREE.Vector3, Yax = new V3(0, 1, 0);
    const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0.1 }, o || {}));
    const basic = (c, o) => new THREE.MeshBasicMaterial(Object.assign({ color: c }, o || {}));
    const glass = (c, op, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.25, metalness: 0.0, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide }, o || {}));
    /* 화살표 하나: setArrow(g, 시작점, 끝점) */
    function mkArrow(col, rad, o) {
      const g = new THREE.Group(); const m = (o && o.basic) ? basic(col) : mat(col, { roughness: 0.4, emissive: col, emissiveIntensity: 0.12 });
      const sh = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 1, 12), m);
      const hd = new THREE.Mesh(new THREE.ConeGeometry(rad * 2.6, rad * 6, 18), m);
      g.add(sh, hd); g.userData = { sh, hd, rad, m }; return g;
    }
    function setArrow(g, a, b) {
      const d = new V3().subVectors(b, a), len = d.length(); const { sh, hd, rad } = g.userData;
      if (len < 1e-3) { g.visible = false; return g; }
      g.visible = true; const hl = Math.min(len * 0.5, rad * 6);
      sh.scale.y = Math.max(0.001, len - hl); sh.position.y = (len - hl) / 2;
      hd.scale.y = hl / (rad * 6); hd.position.y = len - hl / 2;
      g.position.copy(a); g.quaternion.setFromUnitVectors(Yax, d.normalize()); return g;
    }
    /* 많은 화살표 (InstancedMesh): set(i, 위치, 방향, 길이, 색) 뒤에 flush() */
    function arrowSet(n, rad, o) {
      o = o || {};
      const sg = new THREE.CylinderGeometry(1, 1, 1, 8); sg.translate(0, 0.5, 0);
      const hg = new THREE.ConeGeometry(1, 1, 14); hg.translate(0, 0.5, 0);
      const m = mat(0xffffff, { roughness: 0.45, emissive: 0xffffff, emissiveIntensity: 0.18 });
      const sh = new THREE.InstancedMesh(sg, m, n), hd = new THREE.InstancedMesh(hg, m, n);
      const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new V3(), S = new V3(), C = new THREE.Color();
      const zero = new THREE.Matrix4().makeScale(0, 0, 0);
      for (let i = 0; i < n; i++) { sh.setMatrixAt(i, zero); hd.setMatrixAt(i, zero); sh.setColorAt(i, C.set(0xffffff)); hd.setColorAt(i, C); }
      const grp = new THREE.Group(); grp.add(sh, hd);
      return {
        group: grp, n,
        set(i, p, dir, len, col) {
          if (len < 0.02) { sh.setMatrixAt(i, zero); hd.setMatrixAt(i, zero); return; }
          const hl = Math.min(len * 0.55, rad * 6.5), hr = rad * 2.7;
          Q.setFromUnitVectors(Yax, dir);
          S.set(rad, Math.max(0.001, len - hl), rad); M.compose(p, Q, S); sh.setMatrixAt(i, M);
          P.copy(dir).multiplyScalar(len - hl).add(p); S.set(hr, hl, hr); M.compose(P, Q, S); hd.setMatrixAt(i, M);
          if (col != null) { C.set(col); sh.setColorAt(i, C); hd.setColorAt(i, C); }
        },
        hide(i) { sh.setMatrixAt(i, zero); hd.setMatrixAt(i, zero); },
        flush() { sh.instanceMatrix.needsUpdate = hd.instanceMatrix.needsUpdate = true; if (sh.instanceColor) sh.instanceColor.needsUpdate = hd.instanceColor.needsUpdate = true; },
      };
    }
    /* 가는 막대(선분): setSeg(m, a, b) */
    function mkSeg(col, rad, o) { return new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 1, 8), (o && o.basic) ? basic(col, o.mo) : mat(col, o && o.mo)); }
    function setSeg(m, a, b) { const d = new V3().subVectors(b, a), l = d.length(); if (l < 1e-3) { m.visible = false; return m; } m.visible = true; m.scale.y = l; m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(Yax, d.normalize()); return m; }
    function anchor(g, x, y, z) { const o = new THREE.Object3D(); o.position.set(x || 0, y || 0, z || 0); g.add(o); return o; }
    function sphere(r, c, o) { return new THREE.Mesh(new THREE.SphereGeometry(r, 36, 24), mat(c, o)); }
    function tube(pts, r, c, o) {
      const curve = Array.isArray(pts) ? new THREE.CatmullRomCurve3(pts) : pts;
      return new THREE.Mesh(new THREE.TubeGeometry(curve, (o && o.seg) || 80, r, (o && o.rs) || 8, !!(o && o.closed)), (o && o.basic) ? basic(c, o.mo) : mat(c, o && o.mo));
    }
    function box(w, h, d, c, o) { return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c, o)); }
    function cyl(rt, rb, h, c, o, seg) { return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 32), mat(c, o)); }
    function fib(n) { // 구 위에 고르게 퍼진 방향
      const out = [], ga = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < n; i++) { const y = 1 - (i + 0.5) / n * 2, r = Math.sqrt(1 - y * y), a = ga * i; out.push(new V3(Math.cos(a) * r, y, Math.sin(a) * r)); }
      return out;
    }
    /* 장면별 조작 줄: grab(장면, 만들기) → 나중에 showCtl(장면) */
    const bar = ctx.renderer.domElement.parentNode.parentNode.querySelector('.v3-ctl');
    const ctlBy = {};
    function grab(sc, fn) { const b = bar.children.length; const r = fn(); (ctlBy[sc] = ctlBy[sc] || []).push.apply(ctlBy[sc], [].slice.call(bar.children, b)); return r; }
    function showCtl(sc) { Object.keys(ctlBy).forEach((k) => ctlBy[k].forEach((n) => { n.style.display = (k === sc || k === '*') ? '' : 'none'; })); }
    function toggleBtn(sc, text, on, fn) {
      const b = grab(sc, () => ctx.controls.button('', () => { on = !on; draw(); fn(on); }));
      const draw = () => { b.textContent = text + (on ? ' ✓' : ' ✕'); b.classList.toggle('on', on); };
      draw(); return { set(v) { on = v; draw(); }, get on() { return on; } };
    }
    return { V3, Yax, mat, basic, glass, mkArrow, setArrow, arrowSet, mkSeg, setSeg, anchor, sphere, tube, box, cyl, fib, grab, showCtl, toggleBtn };
  }
  const NC = 0xe2464b, SC = 0x2f6df6, COPPER = 0xe39a45;
  const MODE2SC = { flux: 'flux', emf: 'coil', lenz: 'coil', brake: 'brake' };

  window.SciSim3D.attach({
    title: '전자기 유도 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: 12.5 * KD, theta: 0.5, phi: 1.2, min: 5, max: 28 },
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const h = H3(ctx); const { V3, mat, glass, mkArrow, setArrow, arrowSet, anchor, sphere, box, cyl, tube, grab, showCtl, toggleBtn } = h;
      const lessonS = () => (window.__sim && window.__sim.S) || null;
      const S0 = lessonS();
      const st = { sc: S0 ? (MODE2SC[S0.mode] || 'flux') : 'flux', th: 35, R: 1.7, B: 2, N: 6, spd: 0.9, flip: 1, pause: false, strong: 2 };
      const gF = new THREE.Group(), gC = new THREE.Group(), gB = new THREE.Group(); root.add(gF, gC, gB);

      /* ================= ① 자기선속 ================= */
      const MAXL = 400, fArr = arrowSet(MAXL, 0.03); gF.add(fArr.group);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 16, 64), mat(COPPER, { metalness: 0.5, roughness: 0.35 }));
      const disc = new THREE.Mesh(new THREE.CircleGeometry(1, 48), glass(0xffe08a, 0.22));
      const loop = new THREE.Group(); loop.add(ring, disc); gF.add(loop);
      const nArr = mkArrow(0xffffff, 0.045); gF.add(nArr);
      const aN = anchor(gF), lN = label('면의 수직 방향 n', aN, { color: '#475569', size: 12 });
      const aB = anchor(gF, 3.2, 3.4, 0), lB = label('자기장 B', aB, { color: '#2f6df6', size: 13 });
      const aTh = anchor(gF), lTh = label('', aTh, { color: '#a16207', size: 13 });
      const aPhi = anchor(gF, 0, -1.6, 0), lPhi = label('', aPhi, { color: '#b45309', size: 14 });
      function updFlux() {
        const R = st.R, th = st.th * Math.PI / 180, n = new V3(Math.sin(th), Math.cos(th), 0);
        loop.scale.set(R, R, R); loop.quaternion.setFromUnitVectors(new V3(0, 0, 1), n);
        const sp = 1.25 / Math.sqrt(st.B), half = 4.4; let k = 0, thru = 0;
        for (let x = -half; x <= half + 1e-6; x += sp) for (let z = -half; z <= half + 1e-6; z += sp) {
          if (k >= MAXL) break;
          let inside = false;
          if (n.y > 1e-3) { const y = -(n.x * x + n.z * z) / n.y; inside = x * x + y * y + z * z <= R * R; }
          if (inside) thru++;
          fArr.set(k++, new V3(x, -3.6, z), h.Yax, 7.2, inside ? 0xffd93d : 0x4f6fae);
        }
        for (; k < MAXL; k++) fArr.hide(k);
        fArr.flush();
        const o = new V3(0, 0, 0);
        setArrow(nArr, o, n.clone().multiplyScalar(R + 0.9)); aN.position.copy(n).multiplyScalar(R + 1.0);
        aTh.position.set(0.5 * n.x * (R * 0.5 + 0.6) + 0.35, 0.9, 0); lTh.set('θ = ' + Math.round(st.th) + '°'); lTh.show(st.th > 3);
        const phi = st.B * Math.PI * R * R * Math.cos(th) / 4.5;          // 보기 좋은 단위
        lPhi.set('선속 Φ ∝ 지나는 선 수 = ' + thru + '개');
        info('<b>자기선속 Φ = B·A·cosθ</b> (노란 선이 면을 지나는 자기력선)<br>B가 세거나(선이 촘촘) 면이 넓거나 면이 B에 수직(θ=0°)일수록 Φ가 커요.<br>θ = 90°이면 선이 면과 나란해서 Φ = 0이에요.');
      }

      /* ================= ② 자석과 코일 (유도 · 렌츠) ================= */
      const CY = 1.3, CH = 2.4;
      let coilMesh = null; const coilG = new THREE.Group(); gC.add(coilG);
      function buildCoil() {
        if (coilMesh) { coilG.remove(coilMesh); coilMesh.geometry.dispose(); }
        const pts = [], T = st.N, seg = 40;
        for (let i = 0; i <= T * seg; i++) { const s = i / seg, a = s * Math.PI * 2; pts.push(new V3(CY * Math.cos(a), -CH / 2 + CH * s / T, CY * Math.sin(a))); }
        const cv = new THREE.CatmullRomCurve3(pts);
        coilMesh = new THREE.Mesh(new THREE.TubeGeometry(cv, T * seg * 2, 0.06, 8, false), mat(COPPER, { metalness: 0.5, roughness: 0.35 }));
        coilG.add(coilMesh);
        coilG.userData.top = pts[pts.length - 1];
      }
      buildCoil();
      const magnet = new THREE.Group(); gC.add(magnet);
      const mN = box(0.9, 1.6, 0.9, NC, { roughness: 0.35, metalness: 0.3 }), mS = box(0.9, 1.6, 0.9, SC, { roughness: 0.35, metalness: 0.3 });
      mN.position.y = -0.8; mS.position.y = 0.8; magnet.add(mN, mS);          // N극이 아래
      const lMN = label('N', mN, { color: '#e2464b', size: 15 }), lMS = label('S', mS, { color: '#2f6df6', size: 15 });
      /* 검류계 */
      const gal = new THREE.Group(); gal.position.set(4.2, -1.2, 0); gC.add(gal);
      const gBody = cyl(1.15, 1.15, 0.35, 0x2c3345, { roughness: 0.4, metalness: 0.4 }, 40); gBody.rotation.x = Math.PI / 2; gal.add(gBody);
      const gFace = new THREE.Mesh(new THREE.CircleGeometry(1.0, 48), h.basic(0xf4f6fb)); gFace.position.z = 0.19; gal.add(gFace);
      [-1, -0.5, 0, 0.5, 1].forEach((u) => { const tk = box(0.04, u === 0 ? 0.28 : 0.16, 0.02, 0x334, { roughness: 0.6 }); const a = u * 0.9; tk.position.set(Math.sin(a) * 0.82, Math.cos(a) * 0.82 - 0.35, 0.2); tk.rotation.z = -a; gal.add(tk); });
      const needle = new THREE.Group(); needle.position.set(0, -0.35, 0.22); gal.add(needle);
      const nd = box(0.06, 1.0, 0.03, 0xe2464b, { roughness: 0.4 }); nd.position.y = 0.5; needle.add(nd); const pv = sphere(0.09, 0x334155); needle.add(pv);
      const wr1 = tube([new V3(CY, -CH / 2, 0), new V3(CY + 0.6, -CH / 2 - 0.3, 0.3), new V3(3.0, -1.6, 0.3), new V3(3.3, -1.35, 0.2)], 0.035, COPPER, { mo: { metalness: 0.4 } });
      const wr2 = tube([new V3(CY, CH / 2, 0), new V3(2.4, CH / 2 + 0.4, 0.2), new V3(3.8, 0.6, 0.2), new V3(4.2, -0.4, 0.2)], 0.035, COPPER, { mo: { metalness: 0.4 } });
      gC.add(wr1, wr2);
      const lG = label('검류계', gal, { color: '#475569', size: 12, offset: [0, 1.5, 0] });
      const lI = label('', anchor(gC, 0, 0, 0), { color: '#a16207', size: 13 });
      const aCoilTop = anchor(gC, 0, CH / 2 + 0.55, 0), lPole = label('', aCoilTop, { color: '#7c3aed', size: 12 });
      const NCONE = 20, cones = new THREE.InstancedMesh(new THREE.ConeGeometry(0.11, 0.3, 12), mat(0xffe14d, { emissive: 0xffd400, emissiveIntensity: 0.8, roughness: 0.3 }), NCONE); gC.add(cones);
      let my = 3.6, vy = 0, ph = 0, curI = 0, flowT = 0, prevPhi = 0;
      const Phi = (y) => 1 / Math.pow(1 + (y / 1.6) * (y / 1.6), 1.5);
      const Mx = new THREE.Matrix4(), Qq = new THREE.Quaternion(), Sc = new V3(1, 1, 1), Pp = new V3(), Tg = new V3();

      /* ================= ③ 자기 브레이크 (구리관 속 자석) ================= */
      const PH = 7, YT = 3.4, YB = -3.4;
      const pipeCu = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, PH, 40, 1, true), mat(COPPER, { metalness: 0.75, roughness: 0.3, side: THREE.DoubleSide, transparent: true, opacity: 0.5, depthWrite: false })); pipeCu.position.x = -2.2;
      const pipePl = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, PH, 40, 1, true), glass(0xbfd6ff, 0.16)); pipePl.position.x = 2.2;
      gB.add(pipeCu, pipePl);
      const mkMag = () => { const g = new THREE.Group(); const a = cyl(0.42, 0.42, 0.55, NC, { roughness: 0.35, metalness: 0.3 }, 24), b = cyl(0.42, 0.42, 0.55, SC, { roughness: 0.35, metalness: 0.3 }, 24); a.position.y = -0.27; b.position.y = 0.27; g.add(a, b); return g; };
      const magCu = mkMag(), magPl = mkMag(); gB.add(magCu, magPl);
      const floor1 = cyl(1.3, 1.3, 0.12, 0x7b8798, { metalness: 0.3 }), floor2 = floor1.clone(); floor1.position.set(-2.2, YB - 0.65, 0); floor2.position.set(2.2, YB - 0.65, 0); gB.add(floor1, floor2);
      const eddy = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.07, 12, 48), mat(0xffd54d, { emissive: 0xffb300, emissiveIntensity: 0.9, transparent: true, opacity: 0, depthWrite: false })); m.rotation.x = Math.PI / 2; m.position.x = -2.2; gB.add(m); return m; });
      const aC = anchor(gB, -2.2, YT + 0.8, 0), aP = anchor(gB, 2.2, YT + 0.8, 0);
      const lCu = label('구리관', aC, { color: '#b45309', size: 13 }), lPl = label('플라스틱관', aP, { color: '#475569', size: 13 });
      const aTc = anchor(gB, -2.2, YB - 1.1, 0), aTp = anchor(gB, 2.2, YB - 1.1, 0);
      const lTc = label('', aTc, { color: '#b45309', size: 13 }), lTp = label('', aTp, { color: '#475569', size: 13 });
      const aEd = anchor(gB, -2.2, 0, 1.2), lEd = label('와전류', aEd, { color: '#a16207', size: 12 });
      let bt = -1, ycu = YT, ypl = YT, vcu = 0, vpl = 0, tdone = [0, 0];
      const G = 6;
      function dropReset() { bt = -1; ycu = ypl = YT; vcu = vpl = 0; tdone = [0, 0]; }
      function dropGo() { dropReset(); bt = 0; }
      function updBrakeInfo() {
        info('<b>구리관 속 자석은 천천히 떨어져요.</b><br>자석이 움직이면 관에 <b>와전류</b>가 생기고, 렌츠 법칙에 따라 자석의 운동을 방해하는 자기장이 만들어져요.<br>플라스틱관은 전류가 흐르지 못해 그대로 떨어져요.');
      }

      /* ================= 조작 ================= */
      const seg = controls.segment('보기', [{ value: 'flux', label: '🧲 자기선속' }, { value: 'coil', label: '🔁 자석과 코일' }, { value: 'brake', label: '🌪️ 자기 브레이크' }], st.sc, (v) => go(v));
      grab('flux', () => controls.range('각도 θ', 0, 90, 5, st.th, (v) => { st.th = v; updFlux(); }, (v) => v + '°'));
      grab('flux', () => controls.range('면적 A', 1.1, 2.3, 0.1, st.R, (v) => { st.R = v; updFlux(); }, (v) => (v * v / 2.89).toFixed(1) + '배'));
      grab('flux', () => controls.range('자기장 B', 1, 3, 1, st.B, (v) => { st.B = v; updFlux(); }, (v) => v + '배'));
      grab('coil', () => controls.range('감은 수 N', 2, 10, 1, st.N, (v) => { st.N = v; buildCoil(); }, (v) => v + '회'));
      grab('coil', () => controls.range('자석 속력', 0.4, 1.6, 0.1, st.spd, (v) => { st.spd = v; }, (v) => v.toFixed(1) + '배'));
      grab('coil', () => controls.button('🔁 자석 방향 바꾸기', () => { st.flip = -st.flip; mN.position.y = -0.8 * st.flip; mS.position.y = 0.8 * st.flip; }));
      toggleBtn('coil', '움직임 멈춤', false, (on) => { st.pause = on; });
      grab('brake', () => controls.button('▶ 떨어뜨리기', () => dropGo()));
      grab('brake', () => controls.range('자석 세기', 1, 3, 1, st.strong, (v) => { st.strong = v; dropReset(); }, (v) => ['약함', '보통', '강함'][v - 1]));
      function go(sc) {
        st.sc = sc; seg.set(sc); showCtl(sc);
        gF.visible = sc === 'flux'; gC.visible = sc === 'coil'; gB.visible = sc === 'brake';
        [lN, lB, lTh, lPhi].forEach((l) => l.show(sc === 'flux'));
        [lMN, lMS, lG, lI, lPole].forEach((l) => l.show(sc === 'coil'));
        [lCu, lPl, lTc, lTp, lEd].forEach((l) => l.show(sc === 'brake'));
        if (sc === 'flux') { updFlux(); ctx.orbit.dist = 13 * KD; ctx.orbit.phi = 1.15; ctx.orbit.ty = 0; }
        else if (sc === 'coil') { ctx.orbit.dist = 13 * KD; ctx.orbit.phi = 1.35; ctx.orbit.tx = 1.2; ctx.orbit.ty = -0.3; } else { updBrakeInfo(); dropReset(); ctx.orbit.dist = 13 * KD; ctx.orbit.phi = 1.4; ctx.orbit.tx = 0; ctx.orbit.ty = -0.2; }
        if (sc !== 'coil') { ctx.orbit.tx = 0; }
      }
      go(st.sc);
      let lastMode = S0 ? S0.mode : '';
      return {
        update(dt, t) {
          const S = lessonS();
          if (S && S.mode !== lastMode) { lastMode = S.mode; const sc = MODE2SC[S.mode]; if (sc && sc !== st.sc) go(sc); }
          if (st.sc === 'flux') {
            lN.show(true);
          }
          if (st.sc === 'coil') {
            if (!st.pause) ph += dt * st.spd * 1.1;
            const y = 3.6 * Math.cos(ph), vyN = -3.6 * Math.sin(ph) * st.spd * 1.1; vy = vyN; my = y;
            magnet.position.y = my;
            // 선속: N극이 아래인 자석 → B가 아래쪽. flip이면 반대. 변화율로 유도 전류
            const dPdy = (Phi(my + 0.02) - Phi(my - 0.02)) / 0.04, dPdt = dPdy * vy * st.flip;
            const I = Math.max(-3, Math.min(3, dPdt * st.N * 0.35));        // + : 위에서 볼 때 시계 반대 방향
            curI += (I - curI) * (1 - Math.exp(-dt * 12));
            needle.rotation.z = -Math.max(-0.95, Math.min(0.95, curI * 0.4));
            // 전류 화살촉
            const on = Math.abs(curI) > 0.12;
            for (let i = 0; i < NCONE; i++) {
              if (!on) { Mx.makeScale(0, 0, 0); cones.setMatrixAt(i, Mx); continue; }
              const u = ((i / NCONE + flowT) % 1 + 1) % 1, a = u * Math.PI * 2, s = Math.sign(curI);
              Pp.set((CY + 0.14) * Math.cos(a), 0, (CY + 0.14) * Math.sin(a));
              // 위에서 볼 때 시계 반대 방향 = a가 줄어드는 쪽
              Tg.set(Math.sin(a), 0, -Math.cos(a)).multiplyScalar(s);
              Qq.setFromUnitVectors(h.Yax, Tg); Mx.compose(Pp, Qq, Sc); cones.setMatrixAt(i, Mx);
            }
            cones.instanceMatrix.needsUpdate = true; flowT += dt * 0.25 * Math.sign(curI) * Math.min(1.5, Math.abs(curI) * 0.8);
            // 설명
            lI.set(on ? '유도 전류 ' + (curI > 0 ? '↺' : '↻') : '전류 0');
            lI.obj = cones; lI.off = [CY + 0.9, 0.2, 0];
            const approaching = (my > 0 && vy < 0) || (my < 0 && vy > 0);
            lPole.show(on);
            if (!on) info('<b>선속이 변하지 않을 때는 유도 전류가 0이에요.</b><br>자석이 코일 한가운데에 있거나 멈춰 있으면 ΔΦ = 0이에요.<br>자석을 빨리 움직일수록, 감은 수 N이 많을수록 전류가 세져요.');
            else {
              const E = my > 0 ? (st.flip > 0 ? 'N' : 'S') : (st.flip > 0 ? 'S' : 'N'), cp = approaching ? E : (E === 'N' ? 'S' : 'N');
              lPole.set('코일 ' + (my > 0 ? '위' : '아래') + '쪽 = ' + cp + '극'); lPole.el.style.background = cp === 'N' ? '#e2464b' : '#2f6df6';
              info('<b>자석이 코일에서 ' + (approaching ? '다가와요' : '멀어져요') + '</b> → 선속이 ' + (approaching ? '늘어요' : '줄어요') + '.<br>유도 전류가 이 변화를 <b>방해</b>해요 (렌츠 법칙): ' + (approaching ? '같은 극이 마주 보아 밀어내고' : '다른 극이 마주 보아 끌어당기고') + ',<br>ε = −N·ΔΦ/Δt 이므로 N이 클수록 바늘이 크게 움직여요.');
            }
            aCoilTop.position.y = (my > 0 ? 1 : -1) * (CH / 2 + 0.55);
          }
          if (st.sc === 'brake') {
            if (bt >= 0) {
              bt += dt;
              if (ypl > YB) { vpl += G * dt; ypl -= vpl * dt; if (ypl <= YB) { ypl = YB; tdone[1] = bt; } }
              const vT = 1.5 / (st.strong * st.strong * 0.55 + 0.3);
              if (ycu > YB) { vcu = Math.min(vT, vcu + G * dt); ycu -= vcu * dt; if (ycu <= YB) { ycu = YB; tdone[0] = bt; } }
            }
            magCu.position.set(-2.2, ycu, 0); magPl.position.set(2.2, ypl, 0);
            const fast = bt >= 0 && ycu > YB ? vcu / 3 : 0;
            eddy[0].position.set(-2.2, ycu + 0.62, 0); eddy[1].position.set(-2.2, ycu - 0.62, 0);
            eddy.forEach((m, i) => { m.material.opacity = Math.min(0.95, fast * 1.6); m.rotation.z += dt * (i ? -3 : 3) * (0.5 + fast); });
            lEd.show(fast > 0.1); aEd.position.set(-2.2, ycu, 1.25);
            lTc.set(tdone[0] ? '⏱ ' + tdone[0].toFixed(1) + '초' : (bt >= 0 ? '⏱ ' + bt.toFixed(1) + '초' : '')); lTp.set(tdone[1] ? '⏱ ' + tdone[1].toFixed(1) + '초' : (bt >= 0 ? '⏱ ' + bt.toFixed(1) + '초' : ''));
            lTc.show(bt >= 0); lTp.show(bt >= 0);
          }
        },
        sync() {},
      };
    },
  });
})();
