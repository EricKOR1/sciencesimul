/* hq-single-photon · 3D 한 알씩 이중 슬릿 (전자총 · 이중 슬릿 · 스크린 위에 쌓이는 점)
   한 알씩 보내도 점이 하나씩 찍히지만, 많이 쌓이면 확률 파동의 간섭무늬가 나타나요. 어느 틈을 지났는지 알아내면(검출기) 간섭무늬가 사라져요. */
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
  const MODE2SC = {};
  window.SciSim3D.attach({
    title: '이중 슬릿 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: 21 * KD, theta: -0.8, phi: 0.92, min: 8, max: 36, target: [0.6, 0.6, 0] },
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const h = H3(ctx); const { V3, mat, glass, anchor, sphere, box, cyl, tube, grab, toggleBtn } = h;
      const lessonS = () => (window.__sim && window.__sim.S) || null;
      const S0 = lessonS();
      const st = { slits: S0 && S0.cfg && S0.cfg.slits === 'A' ? 'A' : S0 && S0.cfg && S0.cfg.slits === 'B' ? 'B' : 'both', det: !!(S0 && S0.cfg && S0.cfg.det), V: 50, curve: false, queue: 0 };
      const XS = -6.2, XB = -1.2, XD = 5.8, ZS = 0.6;                         // 총 · 슬릿벽 · 스크린 위치, 슬릿 위치(±)
      const NB = 60, ZR = 3.0, BW = 2 * ZR / NB, SH = 2.4;                      // 막대 수 · 스크린 반폭 · 막대 폭 · 스크린 반높이
      /* 총 */
      const gun = new THREE.Group(); const gb = cyl(0.55, 0.7, 1.6, 0x4b5563, { metalness: 0.6, roughness: 0.35 }, 28); gb.rotation.z = Math.PI / 2; const gt = sphere(0.32, 0xffffff, { emissive: 0xffe9a8, emissiveIntensity: 0.9 }); gt.position.x = 0.85; gun.add(gb, gt); gun.position.set(XS - 0.8, 0, 0); root.add(gun);
      /* 슬릿벽 (틈 두 개) */
      const wallM = mat(0x8793a8, { metalness: 0.5, roughness: 0.4 });
      const sw = 0.3;
      const wall = new THREE.Group();
      const addW = (z0, z1) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.25, 2 * SH + 0.8, z1 - z0), wallM); m.position.set(XB, 0, (z0 + z1) / 2); wall.add(m); };
      addW(-ZR - 0.6, -ZS - sw / 2); addW(-ZS + sw / 2, ZS - sw / 2); addW(ZS + sw / 2, ZR + 0.6); root.add(wall);
      const cover = [0, 1].map((i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.28, 2 * SH + 0.8, sw), mat(0x3b4252, { roughness: 0.6 })); m.position.set(XB, 0, i ? ZS : -ZS); m.visible = false; root.add(m); return m; });
      /* 스크린 */
      const screen = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2 * SH, 2 * ZR), mat(0x1e2740, { roughness: 0.8, emissive: 0x16203a, emissiveIntensity: 0.6 })); screen.position.set(XD, 0, 0); root.add(screen);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2 * SH + 0.15, 2 * ZR + 0.15), mat(0x64748b, { roughness: 0.5, metalness: 0.4 })); frame.position.set(XD + 0.08, 0, 0); root.add(frame);
      /* 점과 막대그래프 */
      const MAXD = 2200, dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 10, 8), mat(0xfff0a0, { emissive: 0xffd24d, emissiveIntensity: 0.9, roughness: 0.3 }), MAXD); dots.count = 0; root.add(dots);
      const barG = new THREE.BoxGeometry(1, 1, 1); barG.translate(0, 0.5, 0);
      const bars = new THREE.InstancedMesh(barG, mat(0xffc857, { emissive: 0xff9f1c, emissiveIntensity: 0.35, roughness: 0.45 }), NB); root.add(bars);
      const MZ = new THREE.Matrix4(), Z0 = new THREE.Matrix4().makeScale(0, 0, 0);
      const hist = new Array(NB).fill(0); let nTot = 0, nDots = 0, pdfB = new Array(NB).fill(0), cdf = new Array(NB).fill(0), pdfMax = 1;
      /* 확률 곡선 (tube) */
      let curve = null;
      /* 파동 고리 */
      const rings = []; const ringG = new THREE.RingGeometry(0.965, 1, 72, 1, -Math.PI / 2, Math.PI); ringG.rotateX(-Math.PI / 2);
      for (let s = 0; s < 2; s++) for (let k = 0; k < 3; k++) { const m = new THREE.Mesh(ringG, new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })); m.userData = { s, k }; root.add(m); rings.push(m); }
      /* 비행 중인 입자 */
      const fly = []; for (let i = 0; i < 8; i++) { const m = sphere(0.2, 0xfff0a0, { emissive: 0xffd24d, emissiveIntensity: 1, transparent: true, opacity: 0.95 }); m.visible = false; root.add(m); fly.push({ m, on: false, t: 0, hz: 0, hy: 0, sz: 0 }); }
      const flash = sphere(0.3, 0xffffff, { emissive: 0xffffff, emissiveIntensity: 1, transparent: true, opacity: 0 }); root.add(flash); let flashT = 0;
      /* 이름표 */
      const lG = label('전자총', gun, { color: '#475569', size: 12, offset: [0, 1.1, 0] });
      const lW = label('이중 슬릿', anchor(root, XB, SH + 0.55, 0), { color: '#475569', size: 12 });
      const lSc = label('스크린', anchor(root, XD, -SH - 0.5, 0), { color: '#475569', size: 12 });
      const lN = label('', anchor(root, XD, SH + 3.3, 0), { color: '#a16207', size: 13 });
      const lDet = label('틈 검출기', anchor(root, XB, -SH - 0.5, 0), { color: '#b91c1c', size: 12 });
      const lWave = label('확률 파동', anchor(root, 2.0, 0.5, 2.0), { color: '#0369a1', size: 12 });
      /* 확률 분포 */
      const sinc = (x) => (Math.abs(x) < 1e-6 ? 1 : Math.sin(x) / x);
      function pdf(z) {
        const D = 0.7 * Math.sqrt(50 / st.V), e = (zz) => { const s = sinc(Math.PI * 0.25 * zz / D); return s * s; };
        if (st.slits === 'A') return e(z - ZS);
        if (st.slits === 'B') return e(z + ZS);
        if (st.det) return 0.5 * (e(z - ZS) + e(z + ZS));
        const c = Math.cos(Math.PI * z / D); return c * c * e(z);
      }
      function recomputePdf() {
        let sum = 0; pdfMax = 0;
        for (let i = 0; i < NB; i++) { const z = -ZR + (i + 0.5) * BW; let p = 0; for (let k = 0; k < 5; k++) p += pdf(z + (k - 2) * BW / 5); p /= 5; pdfB[i] = p; sum += p; pdfMax = Math.max(pdfMax, p); }
        let c = 0; for (let i = 0; i < NB; i++) { c += pdfB[i] / sum; cdf[i] = c; }
        if (curve) { root.remove(curve); curve.geometry.dispose(); }
        const pts = []; for (let i = 0; i < NB; i++) pts.push(new V3(XD + 0.2, SH + 0.15 + pdfB[i] / pdfMax * 2.2, -ZR + (i + 0.5) * BW));
        curve = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.045, 8, false), h.basic(0x7dd3fc)); curve.visible = st.curve; root.add(curve);
      }
      function sampleZ() { const u = Math.random(); let i = 0; while (i < NB - 1 && cdf[i] < u) i++; return -ZR + (i + Math.random()) * BW; }
      function drawBars() {
        const mx = Math.max(6, ...hist), sc = 2.2 / mx;
        for (let i = 0; i < NB; i++) { if (!hist[i]) { bars.setMatrixAt(i, Z0); continue; } MZ.compose(new V3(XD + 0.15, SH + 0.15, -ZR + (i + 0.5) * BW), new THREE.Quaternion(), new V3(0.16, hist[i] * sc, BW * 0.86)); bars.setMatrixAt(i, MZ); }
        bars.instanceMatrix.needsUpdate = true;
      }
      function reset() { hist.fill(0); nTot = nDots = 0; dots.count = 0; st.queue = 0; fly.forEach((f) => { f.on = false; f.m.visible = false; }); drawBars(); txt(); }
      function shoot(n) { st.queue += n; }
      function launch() {
        const f = fly.find((q) => !q.on); if (!f) return false;
        f.on = true; f.t = 0; f.hz = sampleZ(); f.hy = (Math.random() - 0.5) * 2 * (SH - 0.2);
        f.sz = st.slits === 'A' ? ZS : st.slits === 'B' ? -ZS : (st.det ? (Math.random() < 0.5 ? ZS : -ZS) : 0);
        f.m.visible = true; return true;
      }
      function arrive(f) {
        f.on = false; f.m.visible = false;
        const bi = Math.max(0, Math.min(NB - 1, Math.floor((f.hz + ZR) / BW))); hist[bi]++; nTot++;
        if (nDots < MAXD) { MZ.makeTranslation(XD - 0.05, f.hy, f.hz); dots.setMatrixAt(nDots++, MZ); dots.count = nDots; dots.instanceMatrix.needsUpdate = true; }
        flash.position.set(XD - 0.1, f.hy, f.hz); flashT = 0.18;
        drawBars(); txt();
      }
      function txt() {
        lN.set('N = ' + nTot + '개'); lN.show(true);
        const two = st.slits === 'both' && !st.det;
        let msg;
        if (nTot < 20) msg = '<b>한 알씩 쏘면 점이 하나씩 찍혀요.</b> 한 번의 도착 위치는 예측할 수 없어요.<br>[100개] 단추로 점을 많이 쌓아 보세요.';
        else if (two) msg = '<b>점이 쌓여 간섭무늬가 나타나요!</b> 한 알씩 보냈는데도요.<br>입자 하나가 두 틈을 지난 확률 파동처럼 행동하고, 밝은 곳은 도착 <b>확률</b>이 큰 곳이에요.';
        else if (st.det) msg = '<b>어느 틈을 지났는지 알아내면</b> 간섭무늬가 사라져요.<br>두 틈의 무늬를 그냥 더한 넓은 띠만 남아요.';
        else msg = '<b>틈 하나만 열면</b> 간섭 줄무늬 없이 넓은 한 덩어리가 돼요.<br>두 틈이 모두 열려야 간섭이 생겨요.';
        info(msg);
      }
      /* 값(틈·검출기·전압·쏘기)은 2D 조작판이 정하고, 3D는 같은 설정으로 같은 개수만큼 쏘아 줘요 */
      toggleBtn('*', '확률 곡선', false, (on) => { st.curve = on; curve.visible = on; });
      function cfg() {
        cover[0].visible = st.slits === 'B' ? false : false; cover[0].visible = st.slits === 'A'; cover[1].visible = st.slits === 'B';       // A만 열면 B(−z) 덮기
        cover[0].position.z = -ZS; cover[1].position.z = ZS;
        lDet.show(st.det && st.slits === 'both');
        recomputePdf(); reset();
      }
      cfg();
      let acc = 0, rt = 0, lastN = 0, lcfg = '';
      return {
        update(dt, t) {
          dt = Math.min(dt, 0.05);
          { const S = lessonS(); if (S && S.cfg) { const k = S.cfg.slits + '|' + (S.cfg.det && S.cfg.slits === 'both') + '|' + S.cfg.V; if (k !== lcfg) { lcfg = k; st.slits = S.cfg.slits; st.det = S.cfg.det && S.cfg.slits === 'both'; st.V = S.cfg.V; cfg(); lastN = S.data ? S.data.N : 0; shoot(Math.min(S.data ? S.data.N : 0, 300)); }
            const N = S.data ? S.data.N : 0; if (N < lastN) { reset(); } else if (N > lastN) shoot(Math.min(N - lastN, 300)); lastN = N; } }
          if (st.queue > 0) { acc += dt * (st.queue > 20 ? 22 : 5); while (acc >= 1 && st.queue > 0) { if (launch()) { st.queue--; acc -= 1; } else break; } } else acc = 0;
          fly.forEach((f) => {
            if (!f.on) return; f.t += dt / 1.1; const u = f.t;
            if (u >= 1) { arrive(f); return; }
            if (u < 0.45) { const a = u / 0.45; f.m.position.set(XS + (XB - XS) * a, 0, f.sz * a); f.m.scale.setScalar(1.0 + (st.slits === 'both' && !st.det ? 0.9 * a : 0)); }
            else { const a = (u - 0.45) / 0.55, e = a * a * (3 - 2 * a); f.m.position.set(XB + (XD - XB) * a, f.hy * e, f.sz + (f.hz - f.sz) * a); f.m.scale.setScalar((st.slits === 'both' && !st.det ? 1.9 : 1.0) * (1 - 0.65 * a)); }
            f.m.material.opacity = 0.35 + 0.6 * Math.min(1, u * 3);
          });
          flashT -= dt; flash.visible = flashT > 0; flash.material.opacity = Math.max(0, flashT / 0.18);
          // 파동 고리
          rt += dt;
          rings.forEach((m) => {
            const { s, k } = m.userData, open = st.slits === 'both' || (st.slits === 'A' && s === 0) || (st.slits === 'B' && s === 1);
            const ph = (rt * 0.45 + k / 3) % 1, r = 0.4 + ph * 7.2;
            m.visible = open && (st.queue > 0 || nTot > 0 || true); m.scale.set(r, 1, r); m.position.set(XB, 0, s === 0 ? ZS : -ZS);
            m.material.opacity = open ? 0.55 * (1 - ph) * (st.det && st.slits === 'both' ? 0.0 : 1) : 0;
          });
          lWave.show(!(st.det && st.slits === 'both')); lWave.off = [0, 0, 0];
        },
        sync() { lcfg = ''; },
      };
    },
  });
})();
