/* hq-stellar-fusion · 3D 별의 핵융합 (양성자 4개 → 헬륨 · 태양의 층 구조)
   양성자는 서로 밀어내서(쿨롱 장벽) 아주 뜨거울 때(약 1500만 K)만 가까이 다가가 융합해요 (터널 효과도 도와요). 4H → He로 바뀔 때 질량이 약 0.7 % 줄고, 그만큼이 E = mc² 에너지로 나와요. */
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
  const MODE2SC = { cond: 'fuse', mass: 'fuse', sun: 'sun', light: 'sun' };
  window.SciSim3D.attach({
    title: '별의 핵융합 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: 12.5 * KD, theta: 0.5, phi: 1.2, min: 5, max: 26 },
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const h = H3(ctx); const { V3, mat, glass, anchor, sphere, grab, showCtl, toggleBtn } = h;
      const lessonS = () => (window.__sim && window.__sim.S) || null;
      const S0 = lessonS();
      const st = { sc: S0 ? (MODE2SC[S0.mode] || 'fuse') : 'fuse', T: 16, tun: true, flow: true };
      const gF = new THREE.Group(), gS = new THREE.Group(); root.add(gF, gS);

      /* ================= ① 핵융합: 양성자 4개 → 헬륨-4 ================= */
      const DIRS = [new V3(1, 1, 1), new V3(1, -1, -1), new V3(-1, 1, -1), new V3(-1, -1, 1)].map((v) => v.normalize());
      const pr = DIRS.map(() => { const m = sphere(0.36, 0xff5a5f, { roughness: 0.3, emissive: 0xff3b3b, emissiveIntensity: 0.5 }); gF.add(m); return m; });
      const barrier = new THREE.Mesh(new THREE.SphereGeometry(1.8, 36, 24), glass(0xff6b6b, 0.1)); gF.add(barrier);
      const nu = DIRS.map((d) => { const m = sphere(0.2, 0x7cc2ff, { roughness: 0.3, emissive: 0x3b82f6, emissiveIntensity: 0.6 }); m.visible = false; gF.add(m); return m; });
      const he = new THREE.Group(); [[0.28, 0.28, 0.28, 0xff5a5f], [-0.28, -0.28, 0.28, 0xff5a5f], [0.28, -0.28, -0.28, 0x9aa7bd], [-0.28, 0.28, -0.28, 0x9aa7bd]].forEach((a) => { const s = sphere(0.36, a[3], { roughness: 0.35, emissive: a[3], emissiveIntensity: 0.3 }); s.position.set(a[0], a[1], a[2]); he.add(s); }); he.visible = false; gF.add(he);
      const ep = [0, 1].map((i) => { const m = sphere(0.17, 0x4ade80, { emissive: 0x22c55e, emissiveIntensity: 0.9 }); m.visible = false; gF.add(m); return m; });
      const rings = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0, depthWrite: false, side: THREE.BackSide })); m.visible = false; gF.add(m); return m; });
      const aP = anchor(gF, 0, 0, 0), lBar = label('쿨롱 장벽 (같은 전하끼리 밀어내요)', anchor(gF, 0, 2.2, 0), { color: '#b91c1c', size: 12 }), lHe = label('헬륨-4', he, { color: '#a16207', size: 13, offset: [0, 1.0, 0] });
      const lP = label('양성자 ×4', pr[0], { color: '#c0392b', size: 12, offset: [0, 0.6, 0] }), lEp = label('양전자·중성미자', anchor(gF, 2.6, 1.8, 0), { color: '#15803d', size: 12 }), lG = label('감마선 에너지', anchor(gF, -2.2, 1.6, 0), { color: '#a16207', size: 12 });
      const lC = label('', anchor(gF, 0, -3.1, 0), { color: '#475569', size: 12 });
      let cyc = { t: 0, fuse: false, tries: 0, hits: 0, started: false };
      const Tc = 12;                                                     // 이 온도(백만 K) 이상이면 장벽 앞까지 와서 융합
      function startCycle() {
        const eff = st.T >= Tc;
        let fuse = eff; if (!eff && st.tun) fuse = Math.random() < 0.3 + 0.03 * st.T;
        cyc = { t: 0, fuse, tun: !eff && fuse, tries: cyc.tries + 1, hits: cyc.hits + (fuse ? 1 : 0), started: true };
      }
      function fuseInfo() {
        const eff = st.T >= Tc;
        info('<b>온도 ' + st.T + '백만 K</b> — ' + (eff ? '양성자가 빨라 장벽 가까이 다가가 융합해요.' : (st.tun ? '속도가 부족해 장벽 앞에서 튕기지만, 가끔 <b>터널 효과</b>로 장벽을 지나 융합해요.' : '속도가 부족해 장벽 앞에서 튕겨 나와요. 융합이 일어나지 않아요.')) + '<br>4H → He-4 : 질량이 약 <b>0.7 %</b> 줄고, 그만큼 E = mc²의 에너지(감마선·운동 에너지)가 나와요.');
      }
      grab('fuse', () => controls.range('온도', 4, 24, 2, st.T, (v) => { st.T = v; fuseInfo(); }, (v) => v + '백만 K'));
      toggleBtn('fuse', '터널 효과', true, (on) => { st.tun = on; fuseInfo(); });
      function fuseUpdate(dt) {
        if (!cyc.started) startCycle();
        cyc.t += dt;
        const t = cyc.t, eff = st.T >= Tc, appr = 2.6 / (0.55 + 0.045 * st.T), rMin = cyc.fuse ? 0.5 : 1.95;
        const r0 = 3.6; let r, phase = 'in';
        if (t < appr) { const u = t / appr; r = r0 + (rMin - r0) * (u * u * (3 - 2 * u) * 0.5 + u * 0.5); phase = 'in'; }
        else if (cyc.fuse) { r = rMin; phase = 'fused'; }
        else { const u = Math.min(1, (t - appr) / appr); r = rMin + (r0 - rMin) * (u * u * (3 - 2 * u) * 0.5 + u * 0.5); phase = 'out'; }
        const tf = t - appr;
        const showHe = cyc.fuse && phase === 'fused' && tf > 0.35;
        pr.forEach((m, i) => { m.visible = !showHe; m.position.copy(DIRS[i]).multiplyScalar(r); m.scale.setScalar(1 + (phase === 'out' && t - appr < 0.3 ? 0.2 * (1 - (t - appr) / 0.3) : 0)); });
        he.visible = showHe; he.scale.setScalar(showHe ? Math.min(1, (tf - 0.35) * 5) * (1 + 0.07 * Math.sin(tf * 12)) : 0.01);
        // 부산물
        nu.forEach((m, i) => { m.visible = showHe && tf < 3.3; if (m.visible) { const k = tf - 0.35, d = DIRS[i].clone().multiplyScalar(-1).add(new V3(0.3 * i, 0.4, 0)).normalize(); m.position.copy(d).multiplyScalar(0.6 + k * 3.2); m.scale.setScalar(0.7); } });
        ep.forEach((m, i) => { m.visible = showHe && tf < 2.6; if (m.visible) { const k = tf - 0.35, d = new V3(i ? 1 : -1, 0.5, i ? 0.3 : -0.4).normalize(); m.position.copy(d).multiplyScalar(0.7 + k * 1.8); } });
        rings.forEach((m, i) => { const k = tf - 0.35 - i * 0.28; m.visible = showHe && k > 0 && k < 1.6; if (m.visible) { m.scale.setScalar(0.5 + k * 3.2); m.material.opacity = 0.35 * (1 - k / 1.6); } });
        barrier.material.opacity = 0.1 + 0.06 * Math.sin(t * 4); barrier.visible = !showHe;
        const endT = cyc.fuse ? appr + 4.2 : appr * 2 + 0.6;
        lHe.show(showHe); lP.show(!showHe); lEp.show(showHe && tf < 2.6); lG.show(showHe && tf < 1.8); lBar.show(!showHe);
        lC.set('융합 ' + cyc.hits + '회 / 접근 ' + cyc.tries + '회' + (cyc.tun ? ' (이번엔 터널 효과!)' : ''));
        if (t > endT) startCycle();
      }

      /* ================= ② 태양의 층 구조 ================= */
      const R = 3.3;
      const sunSurf = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 48, Math.PI / 2, Math.PI * 1.5), new THREE.MeshStandardMaterial({ color: 0xffa53a, roughness: 0.6, emissive: 0xff8a1c, emissiveIntensity: 0.55, side: THREE.DoubleSide })); gS.add(sunSurf);
      const layers = [[R, 0xff8a2b], [R * 0.7, 0xffc247], [R * 0.25, 0xfff6c8]];
      layers.forEach(([r, c], i) => {
        const m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, emissive: c, emissiveIntensity: i === 2 ? 1.0 : 0.45, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1 - i, polygonOffsetUnits: -1 - i });
        const a = new THREE.Mesh(new THREE.CircleGeometry(r, 64, Math.PI / 2, Math.PI), m); a.position.z = 0.001 * i; gS.add(a);
        const b = new THREE.Mesh(new THREE.CircleGeometry(r, 64, Math.PI / 2, Math.PI), m); b.rotation.y = Math.PI / 2; b.position.x = 0.001 * i; gS.add(b);
      });
      const coreSph = new THREE.Mesh(new THREE.SphereGeometry(R * 0.25, 32, 24, Math.PI / 2, Math.PI * 1.5), new THREE.MeshStandardMaterial({ color: 0xfff6c8, emissive: 0xffe9a0, emissiveIntensity: 1.2, side: THREE.DoubleSide })); gS.add(coreSph);
      const radSph = new THREE.Mesh(new THREE.SphereGeometry(R * 0.7, 40, 30, Math.PI / 2, Math.PI * 1.5), new THREE.MeshStandardMaterial({ color: 0xffc247, emissive: 0xffa800, emissiveIntensity: 0.35, transparent: true, opacity: 0.0, side: THREE.DoubleSide })); gS.add(radSph);
      const halo = new THREE.Mesh(new THREE.SphereGeometry(R * 1.28, 40, 28), new THREE.MeshBasicMaterial({ color: 0xffc46b, transparent: true, opacity: 0.1, side: THREE.BackSide, depthWrite: false })); gS.add(halo);
      const lCore = label('핵: 약 1500만 K · 핵융합이 일어나요', anchor(gS, -R * 0.12, R * 0.0, 0.05), { color: '#b45309', size: 12 });
      const lRad = label('복사층: 빛이 아주 오래 걸려 나가요', anchor(gS, -R * 0.5, -R * 0.12, 0.05), { color: '#a16207', size: 12 });
      const lCnv = label('대류층: 뜨거운 가스가 올라와요', anchor(gS, -R * 0.84, R * 0.35, 0.05), { color: '#c2410c', size: 12 });
      const lSur = label('광구: 약 5800 K (우리가 보는 표면)', anchor(gS, R * 0.35, R * 0.97, R * 0.35), { color: '#9a3412', size: 12 });
      const NCV = 36, cells = new THREE.InstancedMesh(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }), NCV); gS.add(cells);
      const cs = []; for (let i = 0; i < NCV; i++) cs.push({ a: Math.PI * 0.5 + Math.random() * Math.PI, ph: Math.random(), lane: Math.random() });
      const Mx = new THREE.Matrix4(), Cc = new THREE.Color(), Qi = new THREE.Quaternion(), Sc = new V3();
      const NPH = 40, phot = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), NPH); gS.add(phot);
      const pw = []; for (let i = 0; i < NPH; i++) pw.push({ x: (Math.random() - 0.5) * 0.4, y: (Math.random() - 0.5) * 0.4, s: 0.1 + Math.random() * 0.6 });
      const sunInfo = () => info('<b>태양의 속</b>: 핵에서 4H → He 핵융합으로 에너지가 만들어져요.<br>빛은 복사층에서 수없이 부딪히며 천천히 나가고, 대류층에서는 가스가 뜨겁게 올라오고 식어 내려가요.<br>광구에서 우리 눈에 보이는 빛이 나와요.');
      toggleBtn('sun', '에너지 흐름', true, (on) => { st.flow = on; cells.visible = phot.visible = on; });
      function sunUpdate(dt, t) {
        halo.material.opacity = 0.09 + 0.02 * Math.sin(t * 1.2);
        coreSph.material.emissiveIntensity = 1.1 + 0.25 * Math.sin(t * 3);
        for (let i = 0; i < NCV; i++) {
          const c = cs[i]; c.ph = (c.ph + dt * (0.1 + 0.08 * c.lane)) % 1;
          const up = c.ph < 0.5, u = up ? c.ph * 2 : (1 - (c.ph - 0.5) * 2), rr = R * (0.72 + 0.24 * u) + (up ? 0 : 0.05), a = c.a + (up ? 0 : 0.17);
          const x = rr * Math.cos(a), y = rr * Math.sin(a);
          Sc.setScalar(1); Mx.compose(new V3(x, y, 0.02), Qi, Sc); cells.setMatrixAt(i, Mx); cells.setColorAt(i, Cc.set(up ? 0xfff0c0 : 0xff6a1a));
        }
        cells.instanceMatrix.needsUpdate = true; cells.instanceColor.needsUpdate = true;
        for (let i = 0; i < NPH; i++) {
          const p = pw[i]; const ang = Math.random() * 6.283, stp = 0.09; p.x += Math.cos(ang) * stp * (0.3 + p.s) + 0.01; p.y += Math.sin(ang) * stp * (0.3 + p.s);
          if (Math.hypot(p.x, p.y) > R * 0.69 || p.x > 0.4 && Math.hypot(p.x, p.y) < R * 0.25 && false) { p.x = (Math.random() - 0.5) * 0.5; p.y = (Math.random() - 0.5) * 0.5; }
          Mx.makeTranslation(p.x, p.y, 0.03); phot.setMatrixAt(i, Mx);
        }
        phot.instanceMatrix.needsUpdate = true;
      }

      /* ================= 조작 ================= */
      const seg = controls.segment('보기', [{ value: 'fuse', label: '⚛️ 핵융합' }, { value: 'sun', label: '☀️ 태양의 속' }], st.sc, (v) => go(v));
      function go(sc) {
        st.sc = sc; seg.set(sc); showCtl(sc);
        gF.visible = sc === 'fuse'; gS.visible = sc === 'sun';
        [lBar, lHe, lP, lEp, lG, lC].forEach((l) => l.show(sc === 'fuse'));
        [lCore, lRad, lCnv, lSur].forEach((l) => l.show(sc === 'sun'));
        const o = ctx.orbit;
        if (sc === 'fuse') { fuseInfo(); cyc.started = false; o.dist = 11.5 * KD; o.phi = 1.2; o.theta = 0.5; } else { sunInfo(); o.dist = 12 * KD; o.phi = 1.3; o.theta = -0.7; }
      }
      go(st.sc);
      let lastMode = S0 ? S0.mode : '';
      return {
        update(dt, t) {
          dt = Math.min(dt, 0.05);
          const S = lessonS();
          if (S && S.mode !== lastMode) { lastMode = S.mode; const sc = MODE2SC[S.mode]; if (sc && sc !== st.sc) go(sc); }
          if (st.sc === 'fuse') fuseUpdate(dt); else sunUpdate(dt, t);
        },
        sync() {},
      };
    },
  });
})();
