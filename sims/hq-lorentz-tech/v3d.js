/* hq-lorentz-tech · 3D 로런츠 힘의 활용 (사이클로트론 · 질량 분석기 · 토카막 · 밴앨런대)
   자기장에 수직으로 움직이는 전하는 원운동을 해요: r = mv/qB, 주기 T = 2πm/qB (속력과 무관). 자기장에 나란한 성분은 나선 운동을 만들어요. */
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
  const MODE2SC = { cyc: 'cyc', mass: 'mass', tok: 'tok', van: 'van' };

  window.SciSim3D.attach({
    title: '로런츠 힘 활용 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: 14 * KD, theta: 0.3, phi: 0.95, min: 6, max: 30 },
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const h = H3(ctx); const { V3, mat, glass, mkArrow, setArrow, arrowSet, mkSeg, setSeg, anchor, sphere, box, cyl, tube, grab, showCtl, toggleBtn } = h;
      const lessonS = () => (window.__sim && window.__sim.S) || null;
      const S0 = lessonS();
      const st = { sc: S0 ? (MODE2SC[S0.mode] || 'cyc') : 'cyc', B: 1.0, B2: 1.0, T: 1.0, Bt: 0.7, alpha: 40, L: 3 };
      if (S0 && S0.cy && S0.cy.B) st.B = Math.max(0.6, Math.min(1.6, S0.cy.B));
      const gC = new THREE.Group(), gM = new THREE.Group(), gT = new THREE.Group(), gV = new THREE.Group(); root.add(gC, gM, gT, gV);
      const COPPER = 0xe39a45, Q4 = new THREE.Quaternion();
      /* 꼬리 (지나온 자리) */
      function makeTrail(g, n, color, r) {
        const m = new THREE.InstancedMesh(new THREE.SphereGeometry(r, 8, 6), mat(color, { emissive: color, emissiveIntensity: 0.9, roughness: 0.4, transparent: true, opacity: 0.8 }), n); g.add(m);
        const buf = []; const M = new THREE.Matrix4(), S = new V3(); let tAcc = 0;
        return {
          m, clear() { buf.length = 0; this.draw(); },
          push(p, dt) { tAcc += dt; if (tAcc < 0.035) return; tAcc = 0; buf.unshift(p.clone()); if (buf.length > n) buf.pop(); this.draw(); },
          draw() { for (let i = 0; i < n; i++) { if (i < buf.length) { const s = 1 - i / n; S.set(s, s, s); M.compose(buf[i], Q4, S); } else M.makeScale(0, 0, 0); m.setMatrixAt(i, M); } m.instanceMatrix.needsUpdate = true; },
        };
      }
      function bGrid(g, nx, nz, x0, z0, dx, dz, y, len, up) {
        const a = arrowSet(nx * nz, 0.03); let k = 0;
        for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) a.set(k++, new V3(x0 + i * dx, y, z0 + j * dz), new V3(0, up ? 1 : -1, 0), len, 0x9db7ff);
        a.flush(); a.group.children.forEach((c) => (c.material = c.material.clone(), c.material.opacity = 0.5, c.material.transparent = true)); g.add(a.group); return a;
      }

      /* ================= ① 사이클로트론 ================= */
      const RD = 3.7;
      const deeM = mat(COPPER, { metalness: 0.7, roughness: 0.3, transparent: true, opacity: 0.38, depthWrite: false });
      const deeR = new THREE.Mesh(new THREE.CylinderGeometry(RD, RD, 0.6, 56, 1, false, 0, Math.PI), deeM), deeL = new THREE.Mesh(new THREE.CylinderGeometry(RD, RD, 0.6, 56, 1, false, Math.PI, Math.PI), deeM);
      deeR.position.x = 0.22; deeL.position.x = -0.22; gC.add(deeR, deeL);
      [deeR, deeL].forEach((d) => { d.add(new THREE.LineSegments(new THREE.EdgesGeometry(d.geometry, 30), new THREE.LineBasicMaterial({ color: 0xffc98a }))); });
      const cycB = bGrid(gC, 5, 5, -3.2, -3.2, 1.6, 1.6, 1.9, 1.0, true);
      const eArr = [0, 1, 2, 3, 4].map(() => { const a = mkArrow(0xffe14d, 0.05); gC.add(a); return a; });
      const cyP = sphere(0.2, 0xff6b6b, { emissive: 0xff3b3b, emissiveIntensity: 0.9 }); gC.add(cyP);
      const cyTr = makeTrail(gC, 90, 0xff8a8a, 0.07);
      const lDee = label('D형 금속 상자 (전기장 ⇄ 교대로)', anchor(gC, 0, 0.5, -4.1), { color: '#b45309', size: 12 }), lCB = label('자기장 B (위쪽)', anchor(gC, 3.2, 1.9, -3.2), { color: '#4f46e5', size: 12 });
      const lE = label('', anchor(gC, 0, 0.9, 0), { color: '#a16207', size: 12 }), lCp = label('양성자', cyP, { color: '#c0392b', size: 12, offset: [0, 0.5, 0] });
      const R0 = 0.9;
      const rN = (n) => R0 * Math.sqrt(n + 1) / st.B;
      let cy = { n: 0, ph: 0, z: 0, out: false, ox: 0, oz: 0, odx: 0, odz: 0, t: 0 };
      function cyReset() { cy = { n: 0, ph: 0, z: 0, out: false, ox: 0, oz: 0, odx: 0, odz: 0, t: 0 }; cyTr.clear(); }
      function cyPos(n, phi, z) {
        const r = rN(n), even = n % 2 === 0, zc = even ? z + r : z - r;
        return even ? new V3(r * Math.sin(phi), 0, zc - r * Math.cos(phi)) : new V3(-r * Math.sin(phi), 0, zc + r * Math.cos(phi));
      }
      function cyUpdate(dt) {
        if (cy.out) {
          cy.ox += cy.odx * 7 * dt; cy.oz += cy.odz * 7 * dt; cyP.position.set(cy.ox, 0, cy.oz); cyTr.push(cyP.position, dt);
          cy.t += dt; if (cy.t > 1.6) cyReset(); return;
        }
        const om = 3.2 * st.B; cy.ph += om * dt;
        while (cy.ph >= Math.PI) { cy.ph -= Math.PI; const r = rN(cy.n); cy.z += (cy.n % 2 === 0 ? 2 : -2) * r; cy.n++; }
        const p = cyPos(cy.n, cy.ph, cy.z); cyP.position.copy(p); cyTr.push(p, dt);
        if (Math.hypot(p.x, p.z) > RD - 0.12) {
          const r = rN(cy.n), even = cy.n % 2 === 0; cy.out = true; cy.t = 0; cy.ox = p.x; cy.oz = p.z;
          const tx = even ? Math.cos(cy.ph) : -Math.cos(cy.ph), tz = Math.sin(cy.ph) * (even ? 1 : -1); cy.odx = tx; cy.odz = tz;
        }
        const nextOdd = (cy.n + 1) % 2 === 1, pre = cy.ph > Math.PI * 0.82 || cy.ph < 0.05;                 // 다음에 틈을 지날 때의 방향
        const dir = (cy.n % 2 === 0) ? -1 : 1;                                                              // 지금 반바퀴를 끝내고 지날 방향
        eArr.forEach((a, i) => { const z = -2.4 + i * 1.2; setArrow(a, new V3(-dir * 0.35, 0.95, z), new V3(dir * 0.35, 0.95, z)); a.userData.m.emissiveIntensity = pre ? 0.9 : 0.15; });
        lE.set('반바퀴 ' + cy.n + '회 = ' + cy.n + '번 가속 · 반지름 r ∝ √' + (cy.n + 1) + ' / B');
      }
      grab('cyc', () => controls.range('자기장 B', 0.6, 1.6, 0.1, st.B, (v) => { st.B = v; cyReset(); }, (v) => v.toFixed(1)));
      grab('cyc', () => controls.button('↺ 다시 가속', () => cyReset()));

      /* ================= ② 질량 분석기 ================= */
      const wallM = box(0.4, 1.2, 14, 0x64748b, { metalness: 0.4, roughness: 0.5 }); wallM.position.set(-2.5, 0, 3.4); gM.add(wallM);
      const pl1 = box(3.4, 1.0, 0.18, 0x94a3b8, { metalness: 0.6 }), pl2 = box(3.4, 1.0, 0.18, 0x94a3b8, { metalness: 0.6 }); pl1.position.set(-4.5, 0, 0.75); pl2.position.set(-4.5, 0, -0.75); gM.add(pl1, pl2);
      pl1.material = mat(0xff8a8a, { metalness: 0.6, roughness: 0.4 }); pl2.material = mat(0x8ab4ff, { metalness: 0.6, roughness: 0.4 });
      const selE = mkArrow(0xffe14d, 0.05); setArrow(selE, new V3(-4.5, 1.0, 0.55), new V3(-4.5, 1.0, -0.55)); gM.add(selE);
      const gunM = cyl(0.5, 0.65, 1.2, 0x4b5563, { metalness: 0.6 }); gunM.rotation.z = Math.PI / 2; gunM.position.set(-7.4, 0, 0); gM.add(gunM);
      bGrid(gM, 3, 2, -6.2, -1.2, 1.6, 1.6, 1.6, 0.9, true);                       // 속도 선택기의 B₁
      const bm = bGrid(gM, 6, 6, -1.6, 0.6, 1.5, 1.5, 1.9, 1.0, true);
      const SP = [{ m: 1, c: 0xff6b6b, n: '가벼운 이온' }, { m: 2, c: 0x4ade80, n: '' }, { m: 3, c: 0x60a5fa, n: '무거운 이온' }];
      const msIon = SP.map((s) => { const p = sphere(0.18, s.c, { emissive: s.c, emissiveIntensity: 0.9 }); p.visible = false; gM.add(p); return { p, tr: makeTrail(gM, 50, s.c, 0.06), t: 0, on: false }; });
      const lMs = [label('E ↓ , B₁ 속도 선택기', anchor(gM, -4.5, 1.6, 0), { color: '#b45309', size: 12 }), label('B₂ 구역', anchor(gM, 2.2, 2.0, -0.6), { color: '#4f46e5', size: 12 }), label('검출기', anchor(gM, -2.5, 0.9, 6.5), { color: '#475569', size: 12 })];
      const lMass = SP.map((s, i) => label(['m', '2m', '3m'][i], anchor(gM, -2.3, 0.5, 0), { color: '#' + s.c.toString(16).padStart(6, '0'), size: 12 }));
      function msReset() { msIon.forEach((q, i) => { q.on = false; q.p.visible = false; q.tr.clear(); q.t = -i * 0.8; }); }
      const rM = (m) => 0.85 * m / st.B2;
      const spotAnc = SP.map((s, i) => anchor(gM, -2.5, 0.3, 0)); lMass.forEach((l, i) => { l.obj = spotAnc[i]; });
      grab('mass', () => controls.range('B₂', 0.6, 1.5, 0.1, st.B2, (v) => { st.B2 = v; msReset(); updMass(); }, (v) => v.toFixed(1)));
      function updMass() { SP.forEach((s, i) => { spotAnc[i].position.set(-2.5, 0.35, 2 * rM(s.m)); }); info('<b>질량 분석</b>: 속도 선택기를 통과한 같은 속력의 이온이 B₂에서 반원을 그려요.<br>반지름 r = mv/qB₂ 는 <b>질량에 비례</b>하므로 무거울수록 멀리 떨어져 닿아요 (m : 2m : 3m).<br>B₂를 세게 하면 모든 반지름이 줄어요.'); }
      grab('mass', () => controls.button('↺ 다시 쏘기', () => msReset()));
      /* 스펙트럼 막대: 쌓인 점 위에 색 구분 */
      const dotMats = SP.map((s) => mat(s.c, { emissive: s.c, emissiveIntensity: 0.6 }));
      const spotMeshes = SP.map((s, i) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 18), dotMats[i]); m.visible = false; gM.add(m); return m; });
      // (누적 표시는 색이 다른 작은 기둥으로: 도착할 때마다 높이를 올려요)
      const stack = [0, 0, 0];
      function addSpot(i) { stack[i] = Math.min(stack[i] + 1, 12); spotMeshes[i].visible = true; spotMeshes[i].scale.y = stack[i]; spotMeshes[i].scale.x = spotMeshes[i].scale.z = 1; spotMeshes[i].position.set(-2.55, -0.5 + 0.05 * stack[i], 2 * rM(SP[i].m)); }
      function msUpdate2(dt) {
        msIon.forEach((q, i) => {
          q.t += dt; if (q.t < 0) return;
          const r = rM(SP[i].m), T1 = 1.0, T2 = Math.PI * r / 3.4; let p;
          if (q.t < T1) { const u = q.t / T1; p = new V3(-7.4 + (-2.5 + 7.4) * u, 0, 0); }
          else if (q.t < T1 + T2) { const phi = (q.t - T1) / T2 * Math.PI; p = new V3(-2.5 + r * Math.sin(phi), 0, r * (1 - Math.cos(phi))); }
          else { addSpot(i); q.t = -0.5; q.p.visible = false; q.tr.clear(); return; }
          q.p.visible = true; q.p.position.copy(p); q.tr.push(p, dt);
        });
      }

      /* ================= ③ 토카막 ================= */
      const TR = 3.6, TA = 1.35;
      const torus = new THREE.Mesh(new THREE.TorusGeometry(TR, TA, 28, 72), glass(0xff8fb0, 0.1)); torus.rotation.x = Math.PI / 2; gT.add(torus);
      for (let i = 0; i < 16; i++) { const psi = i / 16 * Math.PI * 2; const r = new THREE.Mesh(new THREE.TorusGeometry(TA + 0.28, 0.08, 10, 36), mat(COPPER, { metalness: 0.6, roughness: 0.35 })); r.position.set(TR * Math.cos(psi), 0, TR * Math.sin(psi)); r.quaternion.setFromUnitVectors(new V3(0, 0, 1), new V3(-Math.sin(psi), 0, Math.cos(psi))); gT.add(r); }
      const bLine = new THREE.Mesh(new THREE.TorusGeometry(TR, 0.03, 8, 96), h.basic(0x9db7ff)); bLine.rotation.x = Math.PI / 2; gT.add(bLine);
      const bCones = []; for (let i = 0; i < 8; i++) { const psi = i / 8 * Math.PI * 2 + 0.2; const c = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.4, 12), h.basic(0xcfe0ff)); c.position.set(TR * Math.cos(psi), 0, TR * Math.sin(psi)); c.quaternion.setFromUnitVectors(h.Yax, new V3(-Math.sin(psi), 0, Math.cos(psi))); gT.add(c); bCones.push(c); }
      const NI = 7;
      const tk = []; for (let i = 0; i < 2 * NI; i++) { const ion = i < NI, p = sphere(ion ? 0.15 : 0.1, ion ? 0xff6b6b : 0x60a5fa, { emissive: ion ? 0xff3b3b : 0x3b82f6, emissiveIntensity: 0.9 }); gT.add(p); tk.push({ p, ion, psi: Math.random() * 6.28, th: Math.random() * 6.28, cu: (Math.random() - 0.5) * 0.7, cv: (Math.random() - 0.5) * 0.7, vp: (0.5 + Math.random() * 0.4) * (ion ? 1 : -1.3), lost: 0, tr: makeTrail(gT, 26, ion ? 0xff8a8a : 0x7aa8ff, ion ? 0.05 : 0.04) }); }
      const lTor = label('토카막 (도넛형 자기장 용기)', anchor(gT, 0, TA + 0.9, -TR), { color: '#be185d', size: 12 }), lCoil = label('자기장 코일', anchor(gT, TR, TA + 0.5, 0), { color: '#b45309', size: 12 }), lBt = label('자기장 B', anchor(gT, -TR, 0.6, 0), { color: '#4f46e5', size: 12 });
      const lIon = label('이온 (+)', anchor(gT, 0, 0, 0), { color: '#c0392b', size: 11 }), lEl = label('전자 (−)', anchor(gT, 0, 0, 0), { color: '#2563eb', size: 11 });
      let lostN = 0, tkT = 0;
      function larmor(ion) { return 0.27 * Math.sqrt(st.T) / st.Bt * (ion ? 1 : 0.38); }
      function tkInfo() {
        const rho = larmor(true), lose = rho + 0.45 > TA;
        info('<b>플라스마 가두기</b>: 하전 입자는 자기장 둘레를 <b>나선</b>으로 감아 돌며 움직여요 (r = mv/qB).<br>자기장이 세면 회전 반지름이 작아져 용기 벽에 닿지 않아요. 온도(속력)가 높으면 반지름이 커져요.<br>' + (lose ? '<b>지금은 반지름이 커서 벽에 부딪혀 잃어버려요.</b>' : '지금은 입자가 용기 안에 갇혀 있어요.'));
      }
      grab('tok', () => controls.range('자기장 B', 0.2, 1.0, 0.1, st.Bt, (v) => { st.Bt = v; tkInfo(); }, (v) => v.toFixed(1)));
      grab('tok', () => controls.range('온도', 0.5, 2.5, 0.25, st.T, (v) => { st.T = v; tkInfo(); }, (v) => v.toFixed(2) + '배'));
      function tkUpdate(dt) {
        tkT += dt;
        tk.forEach((q) => {
          const rho = larmor(q.ion), wc = (q.ion ? 1 : -1) * 6.5 * st.Bt;
          q.psi += q.vp * dt / TR * 1.1; q.th += wc * dt;
          const u = q.cu + rho * Math.cos(q.th), v = q.cv + rho * Math.sin(q.th);
          const rr = Math.hypot(u, v);
          if (q.lost > 0) { q.lost -= dt; q.p.visible = false; if (q.lost <= 0) { q.cu = (Math.random() - 0.5) * 0.6; q.cv = (Math.random() - 0.5) * 0.6; q.tr.clear(); } return; }
          if (rr > TA - 0.08) { q.lost = 0.9; lostN++; return; }
          q.p.visible = true;
          const R = TR + u; q.p.position.set(R * Math.cos(q.psi), v, R * Math.sin(q.psi)); q.tr.push(q.p.position, dt);
        });
      }

      /* ================= ④ 밴앨런대 (지구 자기장에 갇힌 입자) ================= */
      const RE = 1.25;
      const earthTex = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d'); g.fillStyle = '#1f6fb5'; g.fillRect(0, 0, 256, 128); g.fillStyle = '#3f9d5a'; [[40, 50, 26], [75, 70, 18], [120, 40, 22], [150, 78, 24], [190, 50, 28], [215, 85, 14], [20, 90, 12], [100, 100, 10]].forEach(([x, y, r]) => { g.beginPath(); g.ellipse(x, y, r, r * 0.7, 0.4, 0, 7); g.fill(); }); g.fillStyle = '#eef6ff'; g.fillRect(0, 0, 256, 9); g.fillRect(0, 119, 256, 9); const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t; })();
      const earth = new THREE.Mesh(new THREE.SphereGeometry(RE, 48, 32), mat(0xffffff, { map: earthTex, roughness: 0.75 })); gV.add(earth);
      const bFieldLines = new THREE.Group(); gV.add(bFieldLines);
      function dipLine(L, phi, col, rad) {
        const l0 = Math.acos(Math.sqrt(1 / L)), pts = [];
        for (let i = 0; i <= 70; i++) { const lam = -l0 + 2 * l0 * i / 70, r = L * RE * Math.cos(lam) * Math.cos(lam); pts.push(new V3(r * Math.cos(lam) * Math.cos(phi), r * Math.sin(lam), r * Math.cos(lam) * Math.sin(phi))); }
        return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 90, rad, 6, false), mat(col, { emissive: col, emissiveIntensity: 0.5, transparent: true, opacity: 0.55 }));
      }
      [2, 4].forEach((L) => { for (let i = 0; i < 8; i++) bFieldLines.add(dipLine(L, i / 8 * Math.PI * 2, L === 2 ? 0xff9f7a : 0x9d8cff, 0.02)); });
      const belt1 = new THREE.Mesh(new THREE.TorusGeometry(2.3 * RE, 0.55 * RE, 20, 56), glass(0xff7a59, 0.14)), belt2 = new THREE.Mesh(new THREE.TorusGeometry(4.0 * RE, 0.85 * RE, 20, 56), glass(0x6c8cff, 0.1));
      belt1.rotation.x = belt2.rotation.x = Math.PI / 2; belt1.scale.z = belt2.scale.z = 1.9; gV.add(belt1, belt2);
      const vp = sphere(0.1, 0xffe14d, { emissive: 0xffc800, emissiveIntensity: 1 }); gV.add(vp); const vTr = makeTrail(gV, 70, 0xffd54d, 0.035);
      const aur = [1, -1].map((s) => { const m = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.05, 10, 40), mat(0x4ade80, { emissive: 0x4ade80, emissiveIntensity: 1, transparent: true, opacity: 0 })); m.rotation.x = Math.PI / 2; gV.add(m); return m; });
      const lEarth = label('지구', earth, { color: '#1d4ed8', size: 13, offset: [0, -1.55, 0] }), lIn = label('안쪽 띠', anchor(gV, 2.3 * RE, 0.9, 0), { color: '#c2410c', size: 12 }), lOut = label('바깥 띠', anchor(gV, 4.3 * RE, 1.5, 0), { color: '#4f46e5', size: 12 }), lAur = label('', anchor(gV, 0, 0, 0), { color: '#15803d', size: 12 });
      const Bq = (lam) => Math.sqrt(1 + 3 * Math.sin(lam) ** 2) / Math.pow(Math.cos(lam), 6);
      let van = { t: 0, phi: 0, lost: 0 };
      function mirrorLam() { const a = st.alpha * Math.PI / 180, need = 1 / (Math.sin(a) ** 2); let lo = 0, hi = Math.acos(Math.sqrt(1 / st.L)); const ls = hi; if (Bq(ls) <= need) return { lam: ls, lost: true }; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (Bq(m) < need) lo = m; else hi = m; } return { lam: lo, lost: false }; }
      let mir = mirrorLam();
      function vanInfo() { mir = mirrorLam(); info(mir.lost ? '<b>입사각이 작아 자기 거울이 되돌리지 못해요.</b><br>입자가 대기로 들어가 공기와 부딪혀 <b>오로라</b>가 생겨요 (손실 원뿔).' : '<b>자기 거울</b>: 극 쪽으로 갈수록 자기장이 세져 입자가 되돌아와요.<br>입자는 자기력선을 나선으로 감으며 남북을 오가고, 동서로 천천히 돌아요 (밴앨런대).'); }
      grab('van', () => controls.segment('', [{ value: 2, label: '안쪽 띠 L=2' }, { value: 4, label: '바깥 띠 L=4' }], st.L === 2 ? 2 : 4, (v) => { st.L = v; vanInfo(); van.t = 0; vTr.clear(); }));
      grab('van', () => controls.range('입사각 α', 10, 80, 5, st.alpha, (v) => { st.alpha = v; vanInfo(); van.t = 0; vTr.clear(); }, (v) => v + '°'));
      st.L = 4;
      function vanUpdate(dt, t) {
        van.t += dt; const L = st.L, lam0 = mir.lam, wb = 0.9;
        const s = Math.sin(van.t * wb), lam = lam0 * s;
        van.phi += dt * 0.12 * (st.L === 2 ? 1.4 : 1);
        if (mir.lost && Math.abs(s) > 0.995) { van.lost = 0.8; }
        const r = L * RE * Math.cos(lam) * Math.cos(lam), ph = van.phi;
        const gc = new V3(r * Math.cos(lam) * Math.cos(ph), r * Math.sin(lam), r * Math.cos(lam) * Math.sin(ph));
        const rho = 0.17 / Math.sqrt(Bq(lam)) * (L / 3), th = van.t * 9 * Math.sqrt(Bq(lam));
        const ep = new V3(-Math.sin(ph), 0, Math.cos(ph)), nl = Math.hypot(Math.cos(lam) ** 2 - 2 * Math.sin(lam) ** 2, 3 * Math.cos(lam) * Math.sin(lam)) || 1;
        const nr = (Math.cos(lam) ** 2 - 2 * Math.sin(lam) ** 2) / nl, ny = 3 * Math.cos(lam) * Math.sin(lam) / nl, e1 = new V3(nr * Math.cos(ph), ny, nr * Math.sin(ph));
        const p = gc.clone().addScaledVector(ep, rho * Math.cos(th)).addScaledVector(e1, rho * Math.sin(th));
        vp.position.copy(p); vTr.push(p, dt);
        aur.forEach((m, i) => { const sg = i === 0 ? 1 : -1, la = Math.acos(Math.sqrt(1 / L)), rr = RE * 1.02; m.position.set(0, sg * rr * Math.sin(la), 0); m.scale.setScalar(RE * 1.02 * Math.cos(la) / 0.45); const on = mir.lost; m.material.opacity += ((on ? 0.5 + 0.4 * Math.sin(t * 6) : 0) - m.material.opacity) * Math.min(1, dt * 5); });
        lAur.show(mir.lost); lAur.set('오로라'); lAur.obj = aur[0]; lAur.off = [0, 0.5, 0];
      }

      /* ================= 조작 ================= */
      const seg = controls.segment('보기', [{ value: 'cyc', label: '⚛️ 사이클로트론' }, { value: 'mass', label: '🧪 질량 분석' }, { value: 'tok', label: '🍩 토카막' }, { value: 'van', label: '🌍 밴앨런대' }], st.sc, (v) => go(v));
      function go(sc) {
        st.sc = sc; seg.set(sc); showCtl(sc);
        gC.visible = sc === 'cyc'; gM.visible = sc === 'mass'; gT.visible = sc === 'tok'; gV.visible = sc === 'van';
        [lDee, lCB, lE, lCp].forEach((l) => l.show(sc === 'cyc'));
        lMs.forEach((l) => l.show(sc === 'mass')); lMass.forEach((l) => l.show(sc === 'mass'));
        [lTor, lCoil, lBt, lIon, lEl].forEach((l) => l.show(sc === 'tok'));
        [lEarth, lIn, lOut].forEach((l) => l.show(sc === 'van')); if (sc !== 'van') lAur.show(false);
        const o = ctx.orbit; o.tx = o.ty = o.tz = 0;
        if (sc === 'cyc') { cyReset(); o.dist = 13 * KD; o.phi = 0.85; info('<b>사이클로트론</b>: 두 D형 상자 사이 틈에서 전기장이 입자를 가속하고, 상자 안에서는 자기장이 반원을 그리게 해요.<br>속력이 빨라질수록 반지름이 커지지만 <b>반바퀴 도는 시간은 일정</b>(T = 2πm/qB)해서 전기장의 방향을 같은 주기로 바꿔 주면 돼요.'); }
        else if (sc === 'mass') { msReset(); stack.fill(0); spotMeshes.forEach((m) => (m.visible = false)); updMass(); o.dist = 15 * KD; o.phi = 0.95; o.tx = -1.2; o.tz = 2.0; }
        else if (sc === 'tok') { o.dist = 14.5 * KD; o.phi = 0.95; tkInfo(); }
        else { o.dist = 13 * KD; o.phi = 1.2; vanInfo(); }
      }
      go(st.sc);
      lIon.obj = tk[0].p; lEl.obj = tk[NI].p;
      let lastMode = S0 ? S0.mode : '';
      return {
        update(dt, t) {
          dt = Math.min(dt, 0.05);
          const S = lessonS();
          if (S && S.mode !== lastMode) { lastMode = S.mode; const sc = MODE2SC[S.mode]; if (sc && sc !== st.sc) go(sc); }
          if (st.sc === 'cyc') cyUpdate(dt); else if (st.sc === 'mass') msUpdate2(dt); else if (st.sc === 'tok') tkUpdate(dt); else vanUpdate(dt, t);
        },
        sync() {},
      };
    },
  });
})();
