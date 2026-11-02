/* hq-transformer · 3D 변압기 (철심 · 1차 코일 · 2차 코일 · 철심 속 선속)
   교류 → 1차 코일의 전류가 변해 철심의 선속이 변하고, 2차 코일에 전압이 유도돼요. V₁ : V₂ = N₁ : N₂. 직류는 선속이 변하지 않아 유도 전압이 0이에요. */
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
  const COPPER = 0xe39a45, COIL2 = 0x3ec9b6;

  window.SciSim3D.attach({
    title: '변압기 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: 13.5 * KD, theta: 0.4, phi: 1.22, min: 6, max: 28 },
    autoRotate: 0,
    levels: [0, 1, 2],
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const h = H3(ctx); const { V3, mat, glass, anchor, sphere, box, cyl, tube, grab } = h;
      const lessonS = () => (window.__sim && window.__sim.S) || null;
      const S0 = lessonS();
      const st = { N1: 8, N2: 4, ac: !(S0 && S0.a && S0.a.src === 'dc') };
      const CX = 2.4, CYh = 2.0, TH = 1.0;                                 // 철심 중심선 사각형의 반폭 · 반높이 · 굵기
      const coreMat = mat(0x8e9bb0, { metalness: 0.85, roughness: 0.32, emissive: 0x4f8cff, emissiveIntensity: 0 });
      const mk = (w, hh, d, x, y) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), coreMat); m.position.set(x, y, 0); root.add(m); return m; };
      mk(2 * CX + TH, TH, TH, 0, CYh); mk(2 * CX + TH, TH, TH, 0, -CYh); mk(TH, 2 * CYh + TH, TH, -CX, 0); mk(TH, 2 * CYh + TH, TH, CX, 0);
      /* 코일 */
      const coils = [null, null];
      function helix(cx, color, n) {
        const pts = [], seg = 36, R = 0.82, H = 3.0;
        for (let i = 0; i <= n * seg; i++) { const s = i / seg, a = s * Math.PI * 2; pts.push(new V3(cx + R * Math.cos(a), -H / 2 + H * s / n, R * Math.sin(a))); }
        const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n * seg * 2, 0.07, 8, false), mat(color, { metalness: 0.5, roughness: 0.35 }));
        m.userData.ends = [pts[0], pts[pts.length - 1]]; return m;
      }
      function build(i) {
        if (coils[i]) { root.remove(coils[i]); coils[i].geometry.dispose(); }
        coils[i] = helix(i === 0 ? -CX : CX, i === 0 ? COPPER : COIL2, i === 0 ? st.N1 : st.N2); root.add(coils[i]);
      }
      build(0); build(1);
      /* 전원 · 전구 · 도선 */
      const src = new THREE.Group(); const srcBox = box(1.6, 0.9, 0.9, 0x374151, { roughness: 0.5 }); src.add(srcBox);
      const srcFace = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.55), h.basic(0x0f172a)); srcFace.position.z = 0.46; src.add(srcFace);
      const wavePts = []; for (let i = 0; i <= 30; i++) wavePts.push(new V3(-0.55 + 1.1 * i / 30, 0.18 * Math.sin(i / 30 * Math.PI * 2), 0.47));
      const wave = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(wavePts), 40, 0.02, 6, false), h.basic(0x7dd3fc)); src.add(wave);
      const wavePts2 = [new V3(-0.55, 0, 0.47), new V3(0.55, 0, 0.47)];
      const flat = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(wavePts2), 2, 0.02, 6, false), h.basic(0x7dd3fc));
      src.add(flat); src.position.set(-CX - 2.0, -3.7, 0); root.add(src);
      const bulb = sphere(0.55, 0xfff3c4, { roughness: 0.15, emissive: 0xffd24d, emissiveIntensity: 0, transparent: true, opacity: 0.9 });
      const glow = new THREE.Mesh(new THREE.SphereGeometry(1.0, 24, 16), glass(0xffe27a, 0)); bulb.add(glow);
      const foot = cyl(0.3, 0.4, 0.5, 0x6b7280, { metalness: 0.5 }); foot.position.y = -0.7; bulb.add(foot);
      bulb.position.set(CX + 2.8, -3.0, 0); root.add(bulb);
      const wire = (pts, c) => { const m = tube(pts, 0.04, c || COPPER, { mo: { metalness: 0.4 } }); root.add(m); return m; };
      const e0 = coils[0].userData.ends, e1 = coils[1].userData.ends;
      const wires = [];
      function wiring() {
        wires.forEach((w) => { root.remove(w); w.geometry.dispose(); }); wires.length = 0;
        const a = coils[0].userData.ends, b = coils[1].userData.ends;
        wires.push(wire([a[0], new V3(a[0].x - 0.4, -2.4, 0.2), new V3(src.position.x - 0.5, src.position.y + 0.55, 0.2)], COPPER));
        wires.push(wire([a[1], new V3(a[1].x - 0.8, 2.6, 0.2), new V3(-CX - 3.4, 0.5, 0.2), new V3(src.position.x + 0.5, src.position.y + 0.55, 0.2)], COPPER));
        wires.push(wire([b[0], new V3(b[0].x + 0.4, -2.4, 0.2), new V3(bulb.position.x - 0.25, bulb.position.y - 0.6, 0.1)], COIL2));
        wires.push(wire([b[1], new V3(b[1].x + 0.8, 2.6, 0.2), new V3(bulb.position.x + 3.0, 0.3, 0.2), new V3(bulb.position.x + 0.25, bulb.position.y - 0.6, 0.1)], COIL2));
      }
      wiring();
      /* 철심 속 선속 (움직이는 화살촉) */
      const NC = 22, cones = new THREE.InstancedMesh(new THREE.ConeGeometry(0.17, 0.5, 14), mat(0x7fb6ff, { emissive: 0x4f9bff, emissiveIntensity: 0.9, roughness: 0.3 }), NC); root.add(cones);
      const path = [new V3(-CX, -CYh, 0), new V3(CX, -CYh, 0), new V3(CX, CYh, 0), new V3(-CX, CYh, 0)];
      const segLen = [2 * CX, 2 * CYh, 2 * CX, 2 * CYh], PL = segLen.reduce((a, b) => a + b, 0);
      const pP = new V3(), pT = new V3(), Mx = new THREE.Matrix4(), Qq = new THREE.Quaternion(), One = new V3(1, 1, 1);
      function pathAt(u) {
        let d = ((u % 1) + 1) % 1 * PL, i = 0; while (d > segLen[i]) { d -= segLen[i]; i++; }
        const a = path[i], b = path[(i + 1) % 4]; pT.subVectors(b, a).normalize(); pP.copy(a).addScaledVector(pT, d); return i;
      }
      const lP = label('', anchor(root, -CX - 1.3, 2.4, 0), { color: '#c2410c', size: 13 }), lS = label('', anchor(root, CX + 1.3, 2.4, 0), { color: '#0f766e', size: 13 });
      const lCore = label('철심', anchor(root, 0, CYh + 0.75, 0), { color: '#475569', size: 13 });
      const lFlux = label('철심 속 자기선속', anchor(root, 0, 0.0, 0.6), { color: '#2563eb', size: 12 });
      const lSrc = label('', src, { color: '#0369a1', size: 12, offset: [0, 0.9, 0] }), lBulb = label('', bulb, { color: '#a16207', size: 13, offset: [0, 1.3, 0] });
      function txt() {
        const V2 = 220 * st.N2 / st.N1, kind = st.N2 > st.N1 ? '승압' : st.N2 < st.N1 ? '강압' : '같은 전압';
        lP.set('1차 코일 N₁ = ' + st.N1 + '회'); lS.set('2차 코일 N₂ = ' + st.N2 + '회');
        lSrc.set(st.ac ? '교류 220 V' : '직류 220 V');
        lBulb.set(st.ac ? 'V₂ = ' + Math.round(V2) + ' V' : 'V₂ = 0 V');
        info(st.ac
          ? '<b>교류</b>: 선속이 계속 변해서 2차 코일에 전압이 유도돼요.<br>V₁ : V₂ = N₁ : N₂ → 220 : ' + Math.round(V2) + ' (<b>' + kind + '</b>)<br>이상적인 변압기에서는 전력 V₁I₁ = V₂I₂ 가 같아요.'
          : '<b>직류</b>: 전류가 일정해 철심의 선속이 <b>변하지 않아요</b>.<br>선속 변화가 없으면 유도 전압이 생기지 않아 전구가 꺼져요.<br>변압기는 교류에서만 작동해요.');
      }
      const seg = controls.segment('전원', [{ value: 'ac', label: '교류 ∿' }, { value: 'dc', label: '직류 ═' }], st.ac ? 'ac' : 'dc', (v) => { st.ac = v === 'ac'; txt(); });
      controls.range('N₁ (1차)', 2, 12, 1, st.N1, (v) => { st.N1 = v; build(0); wiring(); txt(); }, (v) => v + '회');
      controls.range('N₂ (2차)', 2, 12, 1, st.N2, (v) => { st.N2 = v; build(1); wiring(); txt(); }, (v) => v + '회');
      txt();
      let lastMode = S0 ? S0.mode : '';
      return {
        update(dt, t) {
          const S = lessonS();
          if (S && S.mode !== lastMode) { lastMode = S.mode; }
          const V2 = 220 * st.N2 / st.N1, w = t * 3.2, s = Math.sin(w);
          const flux = st.ac ? s : 0.9;                                     // 직류: 일정한 선속
          coreMat.emissiveIntensity = 0.1 + 0.55 * Math.abs(flux);
          // 화살촉: 교류는 앞뒤로 흔들리고, 직류는 한 방향으로 일정하게 흘러요
          const off = st.ac ? 0.07 * Math.sin(w - Math.PI / 2) : (t * 0.06) % 1, dir = st.ac ? Math.sign(Math.cos(w)) || 1 : 1;
          for (let i = 0; i < NC; i++) {
            const seg = pathAt(i / NC + off);
            Qq.setFromUnitVectors(h.Yax, pT.clone().multiplyScalar(st.ac ? dir : 1)); Mx.compose(pP, Qq, One); cones.setMatrixAt(i, Mx);
          }
          cones.instanceMatrix.needsUpdate = true;
          cones.material.emissiveIntensity = 0.35 + 0.65 * Math.abs(st.ac ? Math.abs(s) : 1);
          const b = st.ac ? Math.min(1.25, V2 / 110) * (0.82 + 0.18 * Math.abs(Math.cos(w))) : 0;
          bulb.material.emissiveIntensity = b * 1.6; glow.material.opacity = Math.min(0.5, b * 0.35);
          wave.visible = st.ac; flat.visible = !st.ac;
        },
        sync() {},
      };
    },
  });
})();
