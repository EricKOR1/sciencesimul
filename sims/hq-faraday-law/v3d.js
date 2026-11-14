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
          const hl = Math.min(len * 0.55, rad * 6.5), hr = Math.min(rad * 2.7, hl * 0.5);
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
    function sphere(r, c, o) { return new THREE.Mesh(new THREE.SphereGeometry(r, r < 0.35 ? 22 : 36, r < 0.35 ? 14 : 24), mat(c, o)); }
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
    camera: { dist: 12.5 * KD, theta: 0.5, phi: 1.32, min: 5, max: 28 },
    autoRotate: 0,
    levels: [0, 2, 3],   // 2단계(유도 기전력)는 ▶ 자석 빼기와 캔버스의 기록 표가 2D에만 있어서 2D
    build(ctx) {
      const { THREE, root, label, controls } = ctx;
      const h = H3(ctx); const { V3, mat, glass, mkArrow, setArrow, arrowSet, anchor, sphere, box, cyl, tube, grab, showCtl, toggleBtn } = h;
      const lessonS = () => (window.__sim && window.__sim.S) || null;
      const S0 = lessonS();
      const st = { sc: '', th: 30, R: 2.0, B: 2, N: 6, spd: 0.9, flip: 1, pause: false, strong: 2, Bv: 0.5, Av: 0.02, label: '' };
      const labs = {}; const L = (sc, text, obj, o) => { const l = label(text, obj, o); const raw = l.set; let last = text; l.set = (t) => { if (t !== last) { last = t; raw(t); } }; (labs[sc] = labs[sc] || []).push(l); return l; };
      let lastInfo = ''; const info = (hh) => { if (hh !== lastInfo) { lastInfo = hh; ctx.info(hh); } };
      const sciS = (x, d) => { if (!x) return '0'; const sup = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '-': '⁻' }; let e = Math.floor(Math.log10(Math.abs(x) * (1 + 1e-12))), m = x / Math.pow(10, e); return m.toFixed(d == null ? 1 : d) + '×10' + String(e).replace(/[0-9-]/g, (c) => sup[c]); };
      const gF = new THREE.Group(), gC = new THREE.Group(), gB = new THREE.Group(); root.add(gF, gC, gB);

      /* ================= ① 자기선속 ================= */
      const MAXL = 400, fArr = arrowSet(MAXL, 0.03); gF.add(fArr.group);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 20, 96), ctx.mats.metal('copper', { roughness: 0.28 }));
      const disc = new THREE.Mesh(new THREE.CircleGeometry(1, 48), glass(0xffe08a, 0.22));
      const loop = new THREE.Group(); loop.add(ring, disc); gF.add(loop);
      const nArr = mkArrow(0xffffff, 0.045); gF.add(nArr);
      const aN = anchor(gF), lN = L('flux', '면의 수직 방향 n', aN, { color: '#475569', size: 12 });
      const aB = anchor(gF, 3.2, 3.4, 0), lB = L('flux', '자기장 B', aB, { color: '#2f6df6', size: 13 });
      const aTh = anchor(gF), lTh = L('flux', '', aTh, { color: '#a16207', size: 13 });
      const aPhi = anchor(gF, 0, -1.6, 0), lPhi = L('flux', '', aPhi, { color: '#b45309', size: 14 });
      function updFlux() {
        const R = st.R, th = st.th * Math.PI / 180, n = new V3(Math.sin(th), Math.cos(th), 0);
        loop.scale.set(R, R, R); loop.quaternion.setFromUnitVectors(new V3(0, 0, 1), n);
        const sp = 1.2 / Math.sqrt(st.B), half = 3.3; let k = 0, thru = 0;
        for (let x = -half; x <= half + 1e-6; x += sp) for (let z = -half; z <= half + 1e-6; z += sp) {
          if (k >= MAXL) break;
          let inside = false;
          if (n.y > 1e-3) { const y = -(n.x * x + n.z * z) / n.y; inside = x * x + y * y + z * z <= R * R; }
          if (inside) thru++;
          fArr.set(k++, new V3(x, -2.9, z), h.Yax, 5.8, inside ? 0xffd93d : 0x5b7bc0);
        }
        for (; k < MAXL; k++) fArr.hide(k);
        fArr.flush();
        const o = new V3(0, 0, 0);
        setArrow(nArr, o, n.clone().multiplyScalar(R + 0.9)); aN.position.copy(n).multiplyScalar(R + 1.0);
        aTh.position.set(0.5 * n.x * (R * 0.5 + 0.6) + 0.35, 0.9, 0); lTh.set('θ = ' + Math.round(st.th) + '°'); lTh.show(st.th > 3);
        const phi = st.Bv * st.Av * Math.cos(th);
        lPhi.set('Φ = BAcosθ = ' + phi.toFixed(4) + ' Wb (지나는 선 ' + thru + '개)');
        info('<b>Φ = B·A·cosθ</b> — 노란 선이 코일 면을 지나는 자기력선이에요.<br>B = ' + st.Bv.toFixed(1) + ' T, A = ' + st.Av.toFixed(3) + ' m², θ = ' + Math.round(st.th) + '° → Φ = ' + phi.toFixed(4) + ' Wb<br>선이 촘촘하고(B↑) 면이 넓고 면이 B에 수직(θ=0°)일수록 Φ가 커요. θ를 바꾸며 코일을 지나는 노란 선의 수를 세어 봐요.');
      }

      /* ================= ② 자석과 코일 (유도 · 렌츠) ================= */
      const CY = 1.3, CH = 2.4;
      let coilMesh = null; const coilG = new THREE.Group(); gC.add(coilG);
      function buildCoil() {
        if (coilMesh) { coilG.remove(coilMesh); coilMesh.geometry.dispose(); }
        const pts = [], T = st.N, seg = 40;
        for (let i = 0; i <= T * seg; i++) { const s = i / seg, a = s * Math.PI * 2; pts.push(new V3(CY * Math.cos(a), -CH / 2 + CH * s / T, CY * Math.sin(a))); }
        const cv = new THREE.CatmullRomCurve3(pts);
        coilMesh = new THREE.Mesh(new THREE.TubeGeometry(cv, T * seg * 2, 0.06, 10, false), ctx.mats.metal('copper', { roughness: 0.28 }));
        coilG.add(coilMesh);
        coilG.userData.top = pts[pts.length - 1];
      }
      buildCoil();
      const magnet = new THREE.Group(); gC.add(magnet);
      const mN = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.6, 0.9), ctx.mats.plastic(NC, { roughness: 0.25 })), mS = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.6, 0.9), ctx.mats.plastic(SC, { roughness: 0.25 }));
      mN.position.y = -0.8; mS.position.y = 0.8; magnet.add(mN, mS);          // N극이 아래
      const lMN = L('coil', 'N', mN, { color: '#e2464b', size: 15 }), lMS = L('coil', 'S', mS, { color: '#2f6df6', size: 15 });
      /* 검류계 */
      const gal = new THREE.Group(); gal.position.set(4.2, -1.2, 0); gC.add(gal);
      const gBody = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.35, 48), ctx.mats.plastic(0x2c3345, { roughness: 0.3 })); { const bz = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.06, 12, 64), ctx.mats.metal('chrome', { roughness: 0.15 })); bz.position.z = 0.19; gal.add(bz); } gBody.rotation.x = Math.PI / 2; gal.add(gBody);
      const gFace = new THREE.Mesh(new THREE.CircleGeometry(1.0, 48), h.basic(0xf4f6fb)); gFace.position.z = 0.19; gal.add(gFace);
      [-1, -0.5, 0, 0.5, 1].forEach((u) => { const tk = box(0.04, u === 0 ? 0.28 : 0.16, 0.02, 0x334, { roughness: 0.6 }); const a = u * 0.9; tk.position.set(Math.sin(a) * 0.82, Math.cos(a) * 0.82 - 0.35, 0.2); tk.rotation.z = -a; gal.add(tk); });
      const needle = new THREE.Group(); needle.position.set(0, -0.35, 0.22); gal.add(needle);
      const nd = box(0.06, 1.0, 0.03, 0xe2464b, { roughness: 0.4 }); nd.position.y = 0.5; needle.add(nd); const pv = sphere(0.09, 0x334155); needle.add(pv);
      const wr1 = tube([new V3(CY, -CH / 2, 0), new V3(CY + 0.6, -CH / 2 - 0.3, 0.3), new V3(3.0, -1.6, 0.3), new V3(3.3, -1.35, 0.2)], 0.035, COPPER, { mo: { metalness: 0.4 } });
      const wr2 = tube([new V3(CY, CH / 2, 0), new V3(2.4, CH / 2 + 0.4, 0.2), new V3(3.8, 0.6, 0.2), new V3(4.2, -0.4, 0.2)], 0.035, COPPER, { mo: { metalness: 0.4 } });
      gC.add(wr1, wr2);
      const lG = L('coil', '검류계', gal, { color: '#475569', size: 12, offset: [0, 1.5, 0] });
      const lI = L('coil', '', anchor(gC, 0, 0, 0), { color: '#a16207', size: 13 });
      const aCoilTop = anchor(gC, 0, CH / 2 + 0.55, 0), lPole = L('coil', '', aCoilTop, { color: '#7c3aed', size: 12 });
      const NCONE = 20, cones = new THREE.InstancedMesh(new THREE.ConeGeometry(0.11, 0.3, 12), mat(0xffe14d, { emissive: 0xffd400, emissiveIntensity: 0.8, roughness: 0.3 }), NCONE); gC.add(cones);
      let my = 3.6, vy = 0, ph = 0, curI = 0, flowT = 0, prevPhi = 0;
      const Phi = (y) => 1 / Math.pow(1 + (y / 1.6) * (y / 1.6), 1.5);
      const Mx = new THREE.Matrix4(), Qq = new THREE.Quaternion(), Sc = new V3(1, 1, 1), Pp = new V3(), Tg = new V3();

      /* ================= ③ 자기 브레이크 (구리관 속 자석) ================= */
      const PH = 7, YT = 3.4, YB = -3.4;
      const pipeCu = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, PH, 48, 1, true), ctx.mats.metal('copper', { roughness: 0.25, extra: { side: THREE.DoubleSide, transparent: true, opacity: 0.5, depthWrite: false } })); pipeCu.position.x = -2.2;
      const pipePl = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, PH, 40, 1, true), glass(0xbfd6ff, 0.16)); pipePl.position.x = 2.2;
      gB.add(pipeCu, pipePl);
      const mkMag = () => { const g = new THREE.Group(); const a = cyl(0.42, 0.42, 0.55, NC, { roughness: 0.35, metalness: 0.3 }, 24), b = cyl(0.42, 0.42, 0.55, SC, { roughness: 0.35, metalness: 0.3 }, 24); a.position.y = -0.27; b.position.y = 0.27; g.add(a, b); return g; };
      const magCu = mkMag(), magPl = mkMag(); gB.add(magCu, magPl);
      const floor1 = cyl(1.3, 1.3, 0.12, 0x7b8798, { metalness: 0.3 }), floor2 = floor1.clone(); floor1.position.set(-2.2, YB - 0.65, 0); floor2.position.set(2.2, YB - 0.65, 0); gB.add(floor1, floor2);
      const eddy = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.07, 12, 48), mat(0xffd54d, { emissive: 0xffb300, emissiveIntensity: 0.9, transparent: true, opacity: 0, depthWrite: false })); m.rotation.x = Math.PI / 2; m.position.x = -2.2; gB.add(m); return m; });
      const aC = anchor(gB, -2.2, YT + 0.8, 0), aP = anchor(gB, 2.2, YT + 0.8, 0);
      const lCu = L('pipe', '구리관', aC, { color: '#b45309', size: 13 }), lPl = L('pipe', '플라스틱관', aP, { color: '#475569', size: 13 });
      const aTc = anchor(gB, -2.2, YB - 1.1, 0), aTp = anchor(gB, 2.2, YB - 1.1, 0);
      const lTc = L('pipe', '', aTc, { color: '#b45309', size: 13 }), lTp = L('pipe', '', aTp, { color: '#475569', size: 13 });
      const aEd = anchor(gB, -2.2, 0, 1.2), lEd = L('pipe', '와전류', aEd, { color: '#a16207', size: 12 });
      let bt = -1, ycu = YT, ypl = YT, vcu = 0, vpl = 0, tdone = [0, 0];
      const G = 6;
      function dropReset() { bt = -1; ycu = ypl = YT; vcu = vpl = 0; tdone = [0, 0]; }
      function dropGo() { dropReset(); bt = 0; }
      function updBrakeInfo() {
        info('<b>구리관 속 자석은 천천히 떨어져요.</b><br>자석이 움직이면 관에 <b>와전류</b>가 생기고, 렌츠 법칙에 따라 자석의 운동을 방해하는 자기장이 만들어져요.<br>플라스틱관은 전류가 흐르지 못해 그대로 떨어져요.');
      }

      /* ================= 도체판 진자 (자기 브레이크 · 2D의 진자 각도를 그대로 따라가요) ================= */
      const gPd = new THREE.Group(); root.add(gPd);
      const PL_ = 4.2, PIV = new V3(0, 3.6, 0);
      const pivBar = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.18, 0.5), ctx.mats.metal('steel', { brushed: true })); pivBar.position.copy(PIV); gPd.add(pivBar);
      const swing = new THREE.Group(); swing.position.copy(PIV); gPd.add(swing);
      const rodSw = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, PL_, 12), ctx.mats.metal('steel')); rodSw.position.y = -PL_ / 2; swing.add(rodSw);
      const plate = new THREE.Group(); plate.position.y = -PL_ - 0.7; swing.add(plate);
      const plBody = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.5, 0.12), ctx.mats.metal('copper', { roughness: 0.3, brushed: true })); plate.add(plBody);
      const slits = []; for (let i = 0; i < 4; i++) { const sl = box(0.07, 1.0, 0.16, 0x0b1224, { roughness: 1 }); sl.position.set(-0.6 + i * 0.4, -0.2, 0); sl.visible = false; plate.add(sl); slits.push(sl); }
      const mgN = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.6, 0.55), ctx.mats.plastic(NC, { roughness: 0.25 })), mgS = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.6, 0.55), ctx.mats.plastic(SC, { roughness: 0.25 }));
      mgN.position.set(0, PIV.y - PL_ - 0.7, 0.62); mgS.position.set(0, PIV.y - PL_ - 0.7, -0.62); gPd.add(mgN, mgS);
      const eddyP = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.045, 10, 36), mat(0xffd54d, { emissive: 0xffb300, emissiveIntensity: 0.9, transparent: true, opacity: 0, depthWrite: false })); gPd.add(m); return m; });
      const aPlate = anchor(plate, 0, 1.05, 0), lPlate = L('pend', '', aPlate, { color: '#b45309', size: 13 });
      L('pend', 'N', mgN, { color: '#e2464b', size: 13, offset: [0, 1.0, 0] }); L('pend', 'S', mgS, { color: '#2f6df6', size: 13, offset: [0, 1.0, 0] });
      const aEdP = anchor(gPd, 0, PIV.y - PL_ - 0.7, 1.4), lEdP = L('pend', '와전류', aEdP, { color: '#a16207', size: 12 });
      const PNOTE = { cu: '구리: 전기가 잘 통해 와전류가 크게 흐르고, 렌츠 법칙으로 진자의 운동을 크게 방해해요.', al: '알루미늄: 구리보다 전기가 덜 통해 와전류가 조금 약하고 방해도 조금 약해요.', pl: '플라스틱: 절연체라 와전류가 흐르지 못해 거의 방해하지 않아요.', slot: '틈 있는 구리: 틈이 와전류 고리를 끊어 방해가 약해져요.' };
      function updPend(S, sim, dt) {
        const b = S.b, M = sim.MATS[b.mat] || sim.MATS.cu, ph = b.phi;
        swing.rotation.z = -ph;
        plBody.material.color.set(M.col); plBody.material.metalness = b.mat === 'pl' ? 0.1 : 0.7; plBody.material.transparent = b.mat === 'pl'; plBody.material.opacity = b.mat === 'pl' ? 0.55 : 1;
        slits.forEach((q) => (q.visible = b.mat === 'slot'));
        const x = PL_ * Math.sin(ph) + 0.7 * Math.sin(ph) * 0;
        const inF = Math.abs(PL_ * Math.sin(ph)) < 1.1, spd = Math.abs(b.w), act = inF ? Math.min(1, spd * 0.9 * M.k * (b.mag || 1) * 0.6) : 0;
        eddyP.forEach((m, i) => { const px = PL_ * Math.sin(ph); m.position.set(px, PIV.y - PL_ * Math.cos(ph) - 0.7, 0.1 + (i ? 0.18 : -0.18)); m.material.opacity += (act * 0.95 - m.material.opacity) * Math.min(1, dt * 10); m.rotation.z += dt * (i ? -4 : 4) * (0.3 + act); });
        lEdP.show(act > 0.12 && !!labs.pend.on); aEdP.position.set(PL_ * Math.sin(ph), PIV.y - PL_ * Math.cos(ph) - 0.7, 1.5);
        lPlate.set(M.name + '판');
        mgN.material.emissive.setHex(NC); mgN.material.emissiveIntensity = 0.08 * (b.mag || 1); mgS.material.emissive.setHex(SC); mgS.material.emissiveIntensity = 0.08 * (b.mag || 1);
        info('<b>🌪️ 도체판 진자: 와전류가 운동을 막아요</b><br>판의 재질: ' + M.name + ' · 자석 세기: ' + ['', '약', '중', '강'][b.mag || 1] + '<br>' + (b.run ? '진자가 자석 사이를 지나가요. 멈출 때까지 걸리는 시간을 재요.' : '옆 조작판의 ▶ 진자 놓기로 진자를 놓아 보세요.') +
          '<br>📋 측정 기록: ' + ['cu', 'al', 'pl', 'slot'].map((k) => { const rc = b.rec && b.rec[k], nm = (sim.MATS[k] || {}).name || k; return nm + ' ' + (rc ? (rc.status === 'stop' ? '<b>' + rc.t.toFixed(1) + ' s</b> (왕복 ' + rc.n + '회)' : '<b>' + ((sim.PEND && sim.PEND.tmax) || 20) + ' s+</b> (안 멈춤)') : '—'); }).join(' · '));
      }

      /* ================= 2D 실험의 값을 그대로 따라가요 ================= */
      let built = false, pipeP = 0, pipeUser = false, emfP = 0, emfUser = false;
      /* ================= ⑤ 움직이는 막대 도체 (rail) · 가상 실험 (fake) ================= */
      const gRl = new THREE.Group(); root.add(gRl); gRl.visible = false;
      const RU = 0.022, RXc = (px) => (px - 250) * RU, RZc = (py) => (py - 210) * RU, RLEN = 300;
      const rBase = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.2, 5.8), ctx.mats.wood(0x6a4a30, { repeat: 3 })); rBase.position.set(0, -0.2, 0); gRl.add(rBase);
      const zT = RZc(120), zB = RZc(300), xL = RXc(60), xR = RXc(440);
      [zT, zB].forEach((z) => { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, xR - xL, 16), ctx.mats.metal('copper', { roughness: 0.25 })); r.rotation.z = Math.PI / 2; r.position.set((xL + xR) / 2, 0.1, z); gRl.add(r); });
      [[zT, RZc(180)], [RZc(240), zB]].forEach(([a, b]) => { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, Math.abs(b - a), 16), ctx.mats.metal('copper', { roughness: 0.25 })); w.rotation.x = Math.PI / 2; w.position.set(xL, 0.1, (a + b) / 2); gRl.add(w); });
      const resis = box(0.5, 0.3, 1.3, 0x475569, { roughness: 0.5 }); resis.position.set(xL, 0.15, RZc(210)); gRl.add(resis);
      const barM = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, (zB - zT) + 0.5, 24), ctx.mats.metal('chrome', { roughness: 0.12 })); barM.rotation.x = Math.PI / 2; gRl.add(barM);
      const fluxPl = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false })); fluxPl.rotation.x = -Math.PI / 2; gRl.add(fluxPl);
      const bArr = arrowSet(40, 0.025); gRl.add(bArr.group);
      let bi = 0; for (let x = 90; x < 440; x += 44) for (let y = 138; y < 300; y += 40) { if (bi < 40) { bArr.set(bi++, new V3(RXc(x), 1.5, RZc(y)), new V3(0, -1, 0), 0.9, 0x7c3aed); } } bArr.flush();
      const NCD = 36, cDots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.09, 10, 8), mat(0xf59e0b, { emissive: 0xf59e0b, emissiveIntensity: 1 }), NCD); cDots.frustumCulled = false; gRl.add(cDots);
      const aV = mkArrow(0x14b8a6, 0.05), aFe = mkArrow(0x2563eb, 0.07), aFm = mkArrow(0xf26b3a, 0.07); gRl.add(aV, aFe, aFm);
      const eBar = [0x2563eb, 0xef4444].map((c, i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1, 0.4), h.basic(c)); gRl.add(m); return m; });
      const lBr = L('rail', '', [0, 2.0, zT - 0.7], { color: '#7c3aed', size: 12 }), lL = L('rail', 'L = 0.40 m', [xL + 0.5, 0.3, 0], { color: '#334155', size: 12 }), lR = L('rail', 'R = 0.30 Ω', resis, { color: '#475569', size: 12, offset: [0, 0.6, 0] });
      const lV = L('rail', '', barM, { color: '#0f766e', size: 12, offset: [0.9, 1.0, -1.6] }), lFe = L('rail', '외력 F', barM, { color: '#1d4ed8', size: 12 }), lFm = L('rail', '', barM, { color: '#9a3412', size: 12 });
      const lE1 = L('rail', '', [5.3, -0.3, 2.0], { color: '#475569', size: 11 }), lE2 = L('rail', '', [6.2, -0.3, 2.0], { color: '#475569', size: 11 }), lMsg = L('rail', '', [0, 0.4, 2.7], { color: '#9a3412', size: 12 }), lBang = L('rail', '', [0, 1.2, 0], { color: '#dc2626', size: 15 });
      const lEn = L('rail', '', [5.7, 2.5, 2.0], { color: '#1e40af', size: 11 });
      const rlP = { on: false, p: 0 }; let rlSig = '', lastView = '';
      function pathPoint(pts, cum, s) { const tot = cum[cum.length - 1]; s = ((s % tot) + tot) % tot; for (let i = 1; i < cum.length; i++) if (s <= cum[i]) { const u = (s - cum[i - 1]) / (cum[i] - cum[i - 1]); return pts[i - 1].clone().lerp(pts[i], u); } return pts[0].clone(); }
      function updRail(S, sim, dt) {
        const l = S.l, f = l.fake, fake = l.view === 'fake', masked = S.gate === 'ml2';
        const sg = l.view + '|' + l.push + '|' + f.on + '|' + f.done + '|' + l.rv + '|' + l.rB; if (sg !== rlSig) { rlSig = sg; if (rlP.on) { rlP.on = false; plRail.pause(); } }
        let bx = fake ? f.x : l.bx, v = fake ? f.v : l.rv, run = fake ? (f.on || f.done) : (l.push && l.rwait <= 0), doneF = fake && f.done;
        if (rlP.on) { if (fake) { const tt = rlP.p * 1.7, x = 41.25 * (Math.exp(1.333 * tt) - 1); bx = Math.min(RLEN, x); v = Math.exp(1.333 * tt); run = true; doneF = x >= RLEN; } else { bx = rlP.p * RLEN; v = l.rv; run = true; } }
        const bxs = RXc(110 + bx);
        barM.position.set(bxs, 0.25, RZc(210)); fluxPl.scale.set(Math.max(0.01, bxs - xL), zB - zT, 1); fluxPl.position.set((xL + bxs) / 2, 0.06, RZc(210));
        const eps = fake ? 0 : l.rB * 0.4 * v, I = fake ? 0.6 + v * 0.3 : (run ? eps / 0.3 : 0), cur = run && I > 0.01;
        // 전류 점 (실제: 막대에서 위(−z) 방향 → 반시계 / 가상: 반대)
        const pts = [new V3(bxs, 0.25, zB), new V3(bxs, 0.25, zT), new V3(xL, 0.25, zT), new V3(xL, 0.25, zB), new V3(bxs, 0.25, zB)], P2 = fake ? pts.slice().reverse() : pts, cum = [0]; for (let i = 1; i < P2.length; i++) cum.push(cum[i - 1] + P2[i].distanceTo(P2[i - 1]));
        const ph = (rlP.on ? rlP.p * 40 : Math.abs(l.rph)) * RU, gap = 0.55, nD = Math.min(NCD, Math.floor(cum[cum.length - 1] / gap));
        for (let i = 0; i < NCD; i++) { if (cur && i < nD) { const pp = pathPoint(P2, cum, ph + i * gap); Mx.makeTranslation(pp.x, pp.y, pp.z); cDots.setMatrixAt(i, Mx); } else { Mx.makeScale(0, 0, 0); cDots.setMatrixAt(i, Mx); } } cDots.instanceMatrix.needsUpdate = true;
        // 속도 · 힘
        const at = new V3(bxs, 0.25, RZc(210));
        if (run) { setArrow(aV, new V3(bxs + 0.2, 1.0, zT - 0.25), new V3(bxs + 0.2 + Math.min(2.2, Math.max(0.5, v * 0.35)), 1.0, zT - 0.25)); } else aV.visible = false;
        let Fm = 0;
        if (!fake) { Fm = l.rB * I * 0.4; const fl = Math.min(2.2, Fm / 0.86 * 2.2); if (run && fl > 0.1) { setArrow(aFe, at.clone().add(new V3(0.2, 0.5, 0.6)), at.clone().add(new V3(0.2 + fl, 0.5, 0.6))); setArrow(aFm, at.clone().add(new V3(-0.2, 0.5, -0.6)), at.clone().add(new V3(-0.2 - fl, 0.5, -0.6))); } else aFe.visible = aFm.visible = false; }
        else { aFe.visible = false; Fm = 0.1333 * v; const fl = Math.min(2.2, Fm / 1.1 * 2.2); if (run) setArrow(aFm, at.clone().add(new V3(0.2, 0.5, -0.6)), at.clone().add(new V3(0.2 + fl, 0.5, -0.6))); else aFm.visible = false; }
        lBr.set('B ⊗ 화면 속으로 ' + (fake ? '0.50' : l.rB.toFixed(2)) + ' T (아래로)'); lV.set('v = ' + v.toFixed(2) + ' m/s'); lV.show(run); lV.obj = [bxs + 0.3, 1.1, zT - 0.5];
        lFe.show(!fake && !!aFe.visible); lFe.obj = [bxs + 1.2, 0.9, 0.6]; lFm.show(!!aFm.visible); lFm.set(fake ? '자기력이 운동 방향!' : (masked ? '자기력 F = ?' : '자기력 F = BIL')); lFm.obj = [bxs - (fake ? -1.2 : 1.2), 0.9, -0.6];
        lMsg.set(fake ? '외력 = 0 인데 막대가 점점 빨라져요' : (l.push ? '막대는 일정한 속력 (화면은 느리게 보여 줘요)' : '옆 조작판의 ▶ 막대 밀기를 눌러 보세요')); lMsg.el.style.background = fake ? 'rgba(127,29,29,.9)' : 'rgba(255,255,255,.0)';
        lBang.set('❌ 불가능! 에너지가 공짜로 늘어나요'); lBang.show(doneF); lEn.set(fake ? '운동 에너지 · 외력이 한 일' : '외력 Fv · 열 I²R');
        // 에너지 막대
        const KE = 0.5 * 0.1 * v * v, a0 = fake ? 0 : (masked ? 0 : Fm * v * (run ? 1 : 0) / 3.6), a1 = fake ? KE / 4 : (masked ? 0 : I * I * 0.3 / 3.6);
        eBar[0].scale.y = Math.max(0.02, 2.6 * Math.min(1, fake ? 0 : a0)); eBar[0].position.set(5.3, -0.1 + eBar[0].scale.y / 2, 2.0);
        eBar[1].scale.y = Math.max(0.02, 2.6 * Math.min(1, a1)); eBar[1].position.set(6.0, -0.1 + eBar[1].scale.y / 2, 2.0);
        lE1.set(fake ? '외력 일 0 J' : (masked ? '외력 Fv ?' : '외력 Fv ' + (Fm * v * (run ? 1 : 0)).toPrecision(3) + ' W')); lE2.set(fake ? '운동 ' + KE.toPrecision(3) + ' J' : (masked ? '열 ?' : '열 ' + (I * I * 0.3).toPrecision(3) + ' W'));
        const p3 = (x) => (Math.abs(x) < 1e-9 ? '0' : (x * (1 + 1e-12)).toPrecision(3));
        info(fake ? '<b>🚫 만약 유도 전류가 선속 변화를 “돕는다면”?</b><br>자기력이 막대를 더 빨리 밀어요 → 빨라지면 ε도 힘도 커져 계속 빨라져요. 아무 일도 해 주지 않았는데 에너지가 늘어나니 <b>에너지 보존 법칙에 어긋나요</b>. 그래서 렌츠 법칙(방해)이 성립해요.'
          : '<b>움직이는 막대 도체</b>: ε = BLv = ' + (l.push ? p3(eps) : '0') + ' V, I = ε/R = ' + (l.push ? p3(I) : '0') + ' A, 자기력 F = BIL = ' + (masked ? '?' : (l.push ? p3(Fm) : '0') + ' N') + '<br>유도 전류가 흐르는 막대는 <b>운동을 방해</b>하는 쪽으로 힘을 받아요. 막대가 한 일은 모두 저항에서 <b>열</b>로 바뀌어요.');
      }
      const plRail = grab('rail', () => controls.player({ duration: 7, loop: true, autoplay: false, label: '막대 밀기', phases: [[0, '출발'], [0.5, '움직이는 중'], [0.9, '끝']], onFrame(p) { if (!built) return; rlP.on = true; rlP.p = p; } }));
      const plEmf = grab('emf', () => controls.player({ duration: 8, loop: true, autoplay: true, label: '자석 빼기', phases: [[0, '코일 속 자석'], [0.15, '자석을 빼요 (ΔΦ)'], [0.55, '멀리 있어요']], onFrame(p) { if (!built) return; emfP = p; } }));
      const plPipe = grab('pipe', () => controls.player({ duration: 12, loop: true, autoplay: false, label: '자석 떨어뜨리기', phases: [[0, '놓는 순간'], [0.3, '빨라지다가'], [0.6, '(구리관) 일정한 속력']], onFrame(p) { if (!built) return; pipeP = p; pipeUser = true; } }));
      built = true;
      const CAMS = { flux: [12.5, 1.32, 0, 0], coil: [17, 1.4, 1.2, 0.1], pipe: [16.5, 1.4, 0, -0.2], pend: [13, 1.3, 0, 0.6], rail: [12.5, 0.95, 0.9, -0.3] };
      let lastSc = '', lastPipeRun = false, localT = -1;
      function scOf(S) { return S.mode === 'flux' ? 'flux' : S.mode === 'lenz' && (S.l.view === 'rail' || S.l.view === 'fake') ? 'rail' : S.mode === 'emf' || S.mode === 'lenz' ? 'coil' : (S.b.view === 'pipe' ? 'pipe' : 'pend'); }
      function go(sc, S) {
        st.sc = sc;
        gF.visible = sc === 'flux'; gC.visible = sc === 'coil'; gB.visible = sc === 'pipe'; gPd.visible = sc === 'pend'; gRl.visible = sc === 'rail';
        Object.keys(labs).forEach((k) => { labs[k].on = k === sc; labs[k].forEach((l) => l.show(k === sc)); });
        showCtl(sc === 'coil' && S.mode === 'emf' ? 'emf' : sc === 'pipe' ? 'pipe' : sc === 'rail' ? 'rail' : '__none');
        const c = CAMS[sc], o = ctx.orbit; o.dist = c[0] * KD; o.phi = c[1]; o.tx = c[2]; o.ty = c[3]; o.tz = 0; if (sc === 'rail') o.theta = 0.05;
        if (sc === 'pipe') { dropReset(); }
        pipeUser = false; plPipe.pause();
      }
      const epsOf = (sim) => { try { return sim.epsOf(); } catch (e) { return 0; } };
      return {
        update(dt, t) {
          dt = Math.min(dt, 0.05);
          const sim = window.__sim; if (!sim) return; const S = sim.S, sc = scOf(S);
          if (sc !== lastSc) { lastSc = sc; go(sc, S); }
          else if (sc === 'coil') showCtl(S.mode === 'emf' ? 'emf' : '__none'); else if (sc === 'rail') showCtl('rail');
          if (sc === 'flux') {
            const f = S.f; st.th = f.dth; st.Bv = f.dB; st.Av = f.dA; st.B = f.dB / 0.25; st.R = Math.sqrt(f.dA / 0.015) * 2;
            const k = [st.th, st.Bv, st.Av].join(); if (k !== st.fk) { st.fk = k; updFlux(); }
          }
          if (sc === 'coil') {
            let ovI = null, y = 0, vyN = 0, note = '', head = '';
            if (S.mode === 'emf') {
              const e = S.e, w = 0.06 + 0.6 * e.dt, p0 = 0.15; st.N = Math.max(2, Math.min(10, Math.round(e.N / 50)));
              const u = emfP < p0 ? 0 : emfP < p0 + w ? (emfP - p0) / w : emfP < 0.8 ? 1 : 1 - (emfP - 0.8) / 0.2 * 1;
              const eu = u * u * (3 - 2 * u), y1 = 4.2; y = emfP < p0 + w || emfP < 0.8 ? y1 * (emfP < p0 ? 0 : Math.min(1, (emfP - p0) / w)) : y1 * (1 - (emfP - 0.8) / 0.2);
              const inWin = emfP >= p0 && emfP <= p0 + w, win = 8 * w;
              vyN = inWin ? y1 / win : (emfP >= 0.8 ? -y1 / (8 * 0.2) : 0);
              const eps = epsOf(sim); ovI = inWin ? Math.min(3, eps / 25) : 0;
              const mk = S.gate === 'me2';
              head = '<b>⚡ 유도 기전력 ε = NΔΦ/Δt</b><br>N = ' + e.N + '회, ΔΦ = ' + e.dp.toFixed(3) + ' Wb, Δt = ' + e.dt.toFixed(2) + ' s<br>' + (inWin ? '자석을 빼는 동안 ε = ' + (mk ? '?' : eps.toFixed(1) + ' V') : '자석이 멈춰 있으면 ΔΦ = 0 이라 ε = 0') + ' — Δt가 짧을수록(빨리 뺄수록) ε가 커요.<br>';
              if (inWin) st.liveEps = eps; void eu;
            } else {
              const l = S.l; st.N = 6;
              if (l.view === 'mag') { y = (300 - l.mx) * 0.02; vyN = -l.vx * 0.02; st.flip = l.flip; head = '<b>🔁 렌츠 법칙</b>: 유도 전류는 선속의 변화를 방해하는 방향으로 흘러요.<br>'; }
              else { y = 4.2; vyN = 0; st.flip = 1; head = ''; }
            }
            if (st.N !== st.Nb) { st.Nb = st.N; buildCoil(); }
            my = Math.max(-5, Math.min(5, y)); vy = vyN; magnet.position.y = my;
            mN.position.y = -0.8 * st.flip; mS.position.y = 0.8 * st.flip;
            const dPdy = (Phi(my + 0.02) - Phi(my - 0.02)) / 0.04, dPdt = dPdy * vy * st.flip;
            let I = Math.max(-3, Math.min(3, dPdt * st.N * 0.35));
            if (ovI != null) I = Math.sign(I || -1) * ovI * (I === 0 ? 0 : 1);
            curI += (I - curI) * (1 - Math.exp(-dt * 12));
            needle.rotation.z = -Math.max(-0.95, Math.min(0.95, curI * 0.4));
            const on = Math.abs(curI) > 0.12;
            for (let i = 0; i < NCONE; i++) {
              if (!on) { Mx.makeScale(0, 0, 0); cones.setMatrixAt(i, Mx); continue; }
              const u = ((i / NCONE + flowT) % 1 + 1) % 1, a = u * Math.PI * 2, sgn = Math.sign(curI);
              Pp.set((CY + 0.14) * Math.cos(a), 0, (CY + 0.14) * Math.sin(a)); Tg.set(Math.sin(a), 0, -Math.cos(a)).multiplyScalar(sgn);
              Qq.setFromUnitVectors(h.Yax, Tg); Mx.compose(Pp, Qq, Sc); cones.setMatrixAt(i, Mx);
            }
            cones.instanceMatrix.needsUpdate = true; flowT += dt * 0.25 * Math.sign(curI) * Math.min(1.5, Math.abs(curI) * 0.8);
            lI.set(on ? '유도 전류 ' + (curI > 0 ? '↺' : '↻') : '전류 0'); lI.obj = cones; lI.off = [CY + 0.9, 0.2, 0];
            const approaching = (my > 0 && vy < 0) || (my < 0 && vy > 0);
            lPole.show(on && !!labs.coil.on);
            if (!on) info(head + '선속이 변하지 않을 때는 유도 전류가 0이에요.');
            else {
              const E = my > 0 ? (st.flip > 0 ? 'N' : 'S') : (st.flip > 0 ? 'S' : 'N'), cp = approaching ? E : (E === 'N' ? 'S' : 'N');
              lPole.set('코일 ' + (my > 0 ? '위' : '아래') + '쪽 = ' + cp + '극'); lPole.el.style.background = cp === 'N' ? '#e2464b' : '#2f6df6';
              info(head + '자석이 코일에서 <b>' + (approaching ? '다가와요' : '멀어져요') + '</b> → 선속이 ' + (approaching ? '늘어요' : '줄어요') + '. 유도 전류가 이 변화를 <b>방해</b>해요: ' + (approaching ? '같은 극이 마주 보아 밀어내고' : '다른 극이 마주 보아 끌어당기고') + ' 있어요.');
            }
            aCoilTop.position.y = (my > 0 ? 1 : -1) * (CH / 2 + 0.55);
          }
          if (sc === 'pipe') {
            const b = S.b, pp = b.pipe;
            if (pp.run && !lastPipeRun) { localT = 0; pipeUser = false; plPipe.pause(); }
            lastPipeRun = pp.run;
            st.strong = b.mag || 2;
            let tt = -1;
            if (pipeUser) tt = pipeP * 12; else if (localT >= 0) { localT += dt; tt = localT; if (localT > 14) localT = -1; }
            if (tt < 0) { ycu = ypl = YT; tdone = [0, 0]; }
            else {
              ypl = Math.max(YB, YT - 0.5 * G * tt * tt); if (ypl <= YB && !tdone[1]) tdone[1] = tt;
              const vT = 1.5 / (st.strong * st.strong * 0.55 + 0.3), k = G / vT;
              ycu = Math.max(YB, YT - vT * (tt - (1 - Math.exp(-k * tt)) / k)); vcu = vT * (1 - Math.exp(-k * tt)); if (ycu <= YB && !tdone[0]) tdone[0] = tt;
              if (pipeUser && tt < 0.05) tdone = [0, 0];
            }
            bt = tt;
            magCu.position.set(-2.2, ycu, 0); magPl.position.set(2.2, ypl, 0);
            const fast = tt >= 0 && ycu > YB ? vcu / 3 : 0;
            eddy[0].position.set(-2.2, ycu + 0.62, 0); eddy[1].position.set(-2.2, ycu - 0.62, 0);
            eddy.forEach((m, i) => { m.material.opacity = Math.min(0.95, fast * 1.6); m.rotation.z += dt * (i ? -3 : 3) * (0.5 + fast); });
            lEd.show(fast > 0.1 && !!labs.pipe.on); aEd.position.set(-2.2, ycu, 1.25);
            lTc.set(tdone[0] ? '⏱ ' + tdone[0].toFixed(1) + '초' : (tt >= 0 ? '⏱ ' + tt.toFixed(1) + '초' : '')); lTp.set(tdone[1] ? '⏱ ' + tdone[1].toFixed(1) + '초' : (tt >= 0 ? '⏱ ' + tt.toFixed(1) + '초' : ''));
            lTc.show(tt >= 0 && !!labs.pipe.on); lTp.show(tt >= 0 && !!labs.pipe.on);
            info('<b>🌪️ 구리관 속 자석은 천천히 떨어져요</b> (자석 세기: ' + ['', '약', '중', '강'][st.strong] + ')<br>자석이 움직이면 관에 <b>와전류</b>가 생기고, 렌츠 법칙에 따라 자석의 운동을 방해하는 자기장이 만들어져요. 플라스틱관은 전류가 흐르지 못해 그대로 떨어져요.<br>' + (tdone[0] ? '구리관 ' + tdone[0].toFixed(1) + '초 vs 플라스틱관 ' + tdone[1].toFixed(1) + '초 (모형 시간)' : '옆 조작판의 ▶ 자석 떨어뜨리기나 아래 ▶ 로 떨어뜨려 보세요.'));
          }
          if (sc === 'pend') updPend(S, sim, dt);
          if (sc === 'rail') updRail(S, sim, dt);
        },
        sync() { st.fk = ''; },
      };
    },
  });
})();
