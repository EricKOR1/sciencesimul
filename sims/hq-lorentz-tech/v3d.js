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
  const MODE2SC = { cyc: 'cyc', mass: 'mass', tok: 'tok', van: 'van' };

  window.SciSim3D.attach({
    title: '로런츠 힘 활용 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: 14 * KD, theta: 0.3, phi: 0.95, min: 6, max: 30 },
    autoRotate: 0,
    levels: [0, 2, 3],   // 2단계(질량 분석)는 캔버스의 검출기에서 도착 위치 d를 읽어야 해서 2D
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const h = H3(ctx); const { V3, mat, glass, mkArrow, setArrow, arrowSet, mkSeg, setSeg, anchor, sphere, box, cyl, tube, grab, showCtl, toggleBtn } = h;
      const lessonS = () => (window.__sim && window.__sim.S) || null;
      const S0 = lessonS();
      const st = { sc: '', B: 1.0, B2: 1.0, T: 1.0, Bt: 0.7, alpha: 40, L: 3 };
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
      const lDee = label('D형 금속 상자', anchor(gC, -4.2, 0.4, 3.0), { color: '#b45309', size: 12 }), lCB = label('자기장 B (위쪽)', anchor(gC, 3.2, 1.9, -3.2), { color: '#4f46e5', size: 12 });
      const lE = label('', anchor(gC, 0, 0.9, 0), { color: '#a16207', size: 12 }), lCp = label('양성자', cyP, { color: '#c0392b', size: 12, offset: [0, 0.5, 0] });
      /* 2D와 같은 계산: 틈새를 지날 때마다 얻는 에너지 g(n) = qV₀·cos(nπ·δ·κ) (δ = f/f공명 − 1). 3D에서는 '인출까지의 틈새 횟수'를 N3번으로 줄여 같은 과정을 보여 줘요 */
      const N3 = 16, HT = 0.55, RMAX = RD - 0.12;
      let cyProc = null, cyKey = '', cyInfoMk = false;
      function cyBuild(sim) {
        const c = sim.S.cy, B = c.B, f = c.f, key = B + '|' + f; if (key === cyKey && cyProc) return; cyKey = key;
        const Kext = sim.cyKext(B), unit = sim.QE * sim.CY.V0, n0 = Math.max(10, Math.round(Kext / unit)), sc = n0 / N3;
        const pr = []; let K = 0, fail = false, done = false, k = 0;
        for (k = 0; k < 90; k++) {
          const g = sim.cyGain(Math.round(k * sc)) * sc; K = Math.max(0, K + g); pr.push({ g: g / unit / sc, K, r: 0 });
          if (K < 1e-22) { fail = true; break; }
          const frac = K / Kext; pr[k].r = Math.max(0.35, RMAX * Math.sqrt(Math.min(1, frac)));
          if (frac >= 1) { done = true; break; }
        }
        if (!done && !fail) fail = true;
        cyProc = { pr, done, fail, N: pr.length };
        // 반원마다 시작 높이(z) 누적
        let z = 0; pr.forEach((q, i) => { q.z = z; if (i < pr.length - 1) z += (i % 2 === 0 ? 2 : -2) * q.r; });
      }
      function cyEval(p) {
        const P = cyProc, tot = P.N + 2, pos = Math.min(p, 0.9999) * tot; let n = Math.floor(pos), fr = pos - n;
        if (n >= P.N) { // 인출(빠져나가기) 또는 멈춤
          const q = P.pr[P.N - 1], even = (P.N - 1) % 2 === 0;
          return P.fail ? { stop: true, n: P.N - 1, K: q.K, pos: new V3(0, 0, even ? q.z + 2 * q.r : q.z - 2 * q.r), g: q.g } : { out: true, n: P.N - 1, K: q.K, t: n - P.N + fr };
        }
        const q = P.pr[n], even = n % 2 === 0, r = q.r, phi = fr * Math.PI, zc = even ? q.z + r : q.z - r;
        const pos3 = even ? new V3(r * Math.sin(phi), 0, zc - r * Math.cos(phi)) : new V3(-r * Math.sin(phi), 0, zc + r * Math.cos(phi));
        return { pos: pos3, out: false, n, K: q.K, fr, g: q.g, r };
      }
      const cyRoot = { phase: 0 };
      let cyExitT = 0;
      function cyFrame(p, sim) {
        if (!cyProc) return;
        const e = cyEval(p), P = cyProc;
        if (e.out) {
          const q = P.pr[P.N - 1], even = (P.N - 1) % 2 === 0, endZ = even ? q.z + 2 * q.r : q.z - 2 * q.r;      // 마지막 반원이 끝난 자리에서 접선 방향으로 날아가요
          cyP.position.set((even ? -1 : 1) * (e.t * 3.0), 0, endZ);
        } else cyP.position.copy(e.pos);
        cyTr.push(cyP.position, 0.04);
        const near = !e.out && !e.stop && (e.fr < 0.12 || e.fr > 0.88);
        const gk = e.out ? P.pr[P.N - 1].g : (e.g == null ? 1 : e.g), dirG = (e.n % 2 === 0) ? -1 : 1;
        eArr.forEach((a, i) => { const z = -2.4 + i * 1.2; const sgn = gk >= 0 ? 1 : -1; setArrow(a, new V3(-dirG * sgn * 0.35, 0.95, z), new V3(dirG * sgn * 0.35, 0.95, z)); a.userData.m.color.setHex(gk >= 0 ? 0x4ade80 : 0xff6b6b); a.userData.m.emissive.setHex(gk >= 0 ? 0x4ade80 : 0xff6b6b); a.userData.m.emissiveIntensity = near ? 0.9 : 0.15; });
        const KM = (e.K || 0) / sim.MEV;
        lE.set('틈새 통과 ' + (e.n + 1) + '번째: ' + (gk >= 0 ? '가속 (+20 keV 쪽)' : '감속') + ' · K = ' + KM.toFixed(KM < 10 ? 2 : 1) + ' MeV');
        if (e.out) lE.set('인출! K = ' + (P.pr[P.N - 1].K / sim.MEV).toFixed(1) + ' MeV');
        if (e.stop) lE.set('공명이 어긋나 가속되지 않고 멈췄어요');
      }
      function cyInfo(sim) {
        const c = sim.S.cy, fres = sim.cyFres ? sim.cyFres(c.B) / 1e6 : 15.2 * c.B, mk = sim.S.gate === 'mc1', Ke = sim.cyKext(c.B) / sim.MEV;
        info('<b>사이클로트론 (양성자)</b> · B = ' + c.B.toFixed(1) + ' T, f = ' + c.f.toFixed(1) + ' MHz<br>공명 f = qB/(2πm) = ' + (mk ? '?' : fres.toFixed(1) + ' MHz') + '<br>최종 K = (qBR)²/2m = ' + (mk ? '?' : Ke.toFixed(1) + ' MeV') + ' (R = 0.50 m)<br>틈새 1번 20 kV → 20 keV · 자기장은 방향만 바꾸고, 입자를 가속하는 것은 틈새의 전기장이에요.<br>' + (cyProc && cyProc.fail ? '<b>공명이 어긋나 틈새에서 가속과 감속이 번갈아 일어나요.</b> (그림은 어긋남의 영향을 줄여 보여 줘요)' : '공명이 맞으면 틈새를 지날 때마다 계속 가속돼요.'));
      }

      /* ================= ② 질량 분석기 ================= */
      const wallM = box(0.4, 1.2, 14, 0x64748b, { metalness: 0.4, roughness: 0.5 }); wallM.position.set(-2.5, 0, 3.4); gM.add(wallM);
      const pl1 = box(3.4, 1.0, 0.18, 0x94a3b8, { metalness: 0.6 }), pl2 = box(3.4, 1.0, 0.18, 0x94a3b8, { metalness: 0.6 }); pl1.position.set(-4.5, 0, 0.75); pl2.position.set(-4.5, 0, -0.75); gM.add(pl1, pl2);
      pl1.material = mat(0xff8a8a, { metalness: 0.6, roughness: 0.4 }); pl2.material = mat(0x8ab4ff, { metalness: 0.6, roughness: 0.4 });
      const selE = mkArrow(0xffe14d, 0.05); setArrow(selE, new V3(-4.5, 1.0, 0.55), new V3(-4.5, 1.0, -0.55)); gM.add(selE);
      const gunM = cyl(0.5, 0.65, 1.2, 0x4b5563, { metalness: 0.6 }); gunM.rotation.z = Math.PI / 2; gunM.position.set(-7.4, 0, 0); gM.add(gunM);
      bGrid(gM, 3, 2, -6.2, -1.2, 1.6, 1.6, 1.2, 0.6, true);                       // 속도 선택기의 B₁
      const bm = bGrid(gM, 6, 6, -1.6, 0.6, 1.5, 1.5, 1.2, 0.6, true);
      const SPCOL = { c12: 0xff6b6b, c14: 0x60a5fa, c12d: 0xfbbf24, x: 0x4ade80 };
      let SP = [{ k: 'c12', c: 0xff6b6b, n: '' }, { k: 'c14', c: 0x60a5fa, n: '' }];
      const msIon = [0, 1].map((i) => { const p = sphere(0.18, SP[i].c, { emissive: SP[i].c, emissiveIntensity: 0.9 }); p.visible = false; gM.add(p); return { p, tr: makeTrail(gM, 50, SP[i].c, 0.06), t: 0, on: false }; });
      const lMs = [label('E ↓ , B₁ 속도 선택기', anchor(gM, -4.5, 1.6, 0), { color: '#b45309', size: 12 }), label('B₂ 구역', anchor(gM, 2.2, 2.0, -0.6), { color: '#4f46e5', size: 12 }), label('검출기', anchor(gM, -2.5, 0.9, 6.5), { color: '#475569', size: 12 })];
      const lMass = [0, 1].map((i) => label('', anchor(gM, -2.3, 0.5, 0), { color: '#' + SP[i].c.toString(16).padStart(6, '0'), size: 12 }));
      function msReset() { msIon.forEach((q, i) => { q.on = false; q.p.visible = false; q.tr.clear(); q.t = -i * 0.8; }); }
      const MU = 1.2;                                   // 1 cm = 1.2
      let msR = [0, 0], msN = 2, msKey = '';
      const rM = (i) => msR[i] * MU;
      const spotAnc = [0, 1].map(() => anchor(gM, -2.5, 0.3, 0)); lMass.forEach((l, i) => { l.obj = spotAnc[i]; });
      const dotMats = [0, 1].map((i) => mat(SP[i].c, { emissive: SP[i].c, emissiveIntensity: 0.6 }));
      const spotMeshes = [0, 1].map((i) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 18), dotMats[i]); m.visible = false; gM.add(m); return m; });
      const stack = [0, 0];
      function addSpot(i) { stack[i] = Math.min(stack[i] + 1, 12); spotMeshes[i].visible = true; spotMeshes[i].scale.y = stack[i]; spotMeshes[i].position.set(-2.55, -0.5 + 0.05 * stack[i], 2 * rM(i)); }
      function msSync(sim) {
        const m = sim.S.ms, key = m.set + '|' + m.E + '|' + m.B1; if (key === msKey) return; msKey = key;
        const keys = sim.SETS[m.set], v = m.E * 1e4 / m.B1; msN = keys.length;
        SP = keys.map((k) => ({ k, c: SPCOL[k] || 0x4ade80, n: sim.SPC[k].name }));
        msR = keys.map((k) => sim.SPC[k].m * v / (sim.SPC[k].q * 1.6e-19 * sim.MSC.B2) * 100);       // r = mv/(qB₂) [cm]
        [0, 1].forEach((i) => { const on = i < msN, c = on ? SP[i].c : 0xffffff; msIon[i].p.material.color.setHex(c); msIon[i].p.material.emissive.setHex(c); dotMats[i].color.setHex(c); dotMats[i].emissive.setHex(c); lMass[i].el.style.background = '#' + c.toString(16).padStart(6, '0'); if (!on) { msIon[i].p.visible = false; spotMeshes[i].visible = false; } lMass[i].show(on && gM.visible); });
        stack.fill(0); spotMeshes.forEach((q) => (q.visible = false)); msReset();
      }
      function updMass(sim) {
        const m = sim.S.ms, mk = sim.S.gate === 'mm2', v = m.E * 1e4 / m.B1;
        [0, 1].forEach((i) => { if (i < msN) { spotAnc[i].position.set(-2.5, 0.35, 2 * rM(i)); lMass[i].set(SP[i].n + (mk ? '' : ' · r = ' + msR[i].toFixed(1) + ' cm')); } });
        info('<b>질량 분석</b>: 속도 선택기는 v = E/B₁ = ' + (m.E * 1e4).toExponential(1).replace('e+', '×10^') + ' / ' + m.B1 + ' = ' + (v / 1e5).toFixed(2) + '×10⁵ m/s인 이온만 통과시켜요.<br>B₂ = ' + sim.MSC.B2 + ' T 안에서 r = mv/(qB₂)로 반원을 그려요 → <b>질량에 비례</b>(전하량에 반비례)하므로 ' + (msN > 1 ? '무거운 이온이 더 멀리 닿아요.' : '닿는 자리로 질량을 알 수 있어요.') + (mk ? '<br>(시료 X의 질량은 닿은 자리로 직접 구해 보세요)' : ''));
      }
      function msUpdate2(dt) {
        msIon.forEach((q, i) => {
          if (i >= msN) return;
          q.t += dt; if (q.t < 0) return;
          const r = rM(i), T1 = 1.0, T2 = Math.PI * r / 3.4; let p;
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
      const tk = []; for (let i = 0; i < 2 * NI; i++) { const ion = i < NI, p = sphere(ion ? 0.2 : 0.14, ion ? 0xff6b6b : 0x60a5fa, { emissive: ion ? 0xff3b3b : 0x3b82f6, emissiveIntensity: 0.9 }); gT.add(p); tk.push({ p, ion, psi: Math.random() * 6.28, th: Math.random() * 6.28, cu: (Math.random() - 0.5) * 0.7, cv: (Math.random() - 0.5) * 0.7, vp: (0.5 + Math.random() * 0.4) * (ion ? 1 : -1.3), lost: 0, tr: makeTrail(gT, 26, ion ? 0xff8a8a : 0x7aa8ff, ion ? 0.05 : 0.04) }); }
      const lTor = label('토카막 (도넛형 자기장 용기)', anchor(gT, 0, TA + 0.9, -TR), { color: '#be185d', size: 12 }), lCoil = label('자기장 코일', anchor(gT, TR, TA + 0.5, 0), { color: '#b45309', size: 12 }), lBt = label('자기장 B', anchor(gT, -TR, 0.6, 0), { color: '#4f46e5', size: 12 });
      const lIon = label('이온 (+)', anchor(gT, 0, 0, 0), { color: '#c0392b', size: 11 }), lEl = label('전자 (−)', anchor(gT, 0, 0, 0), { color: '#2563eb', size: 11 });
      let lostN = 0, tkT = 0;
      /* 2D와 같은 값: 자기장 B(T)와 온도 Ts(0~1 → 최대 1.5억 °C). 회전 반지름 r = mv/qB는 B에 반비례, √T에 비례 */
      let tkB = 0.5, tkTs = 0.667, tkIp = false;
      function larmor(ion) { return 0.27 * Math.sqrt(Math.max(0.02, tkTs) / 0.667) / Math.max(0.05, tkB / 2) * (ion ? 1 : 0.38); }
      function tkInfo(sim) {
        const rho = larmor(true), lose = tkB < 0.05 || rho + 0.45 > TA, mm = sim && sim.tkR_mm ? sim.tkR_mm(Math.max(tkB, 1e-3)) : 0, mk = sim && sim.S.gate === 'mt2';
        info('<b>토카막: 자기장으로 가두는 플라스마</b> · B = ' + tkB.toFixed(1) + ' T · 온도 ' + (tkTs * 1.5).toFixed(2) + '억 °C' + (tkIp ? ' · 플라스마 전류 ON' : '') + '<br>입자는 자기장 둘레를 <b>나선</b>으로 감아 돌아요 (r = mv/qB). 자기장이 세면 반지름이 작아지고, 온도(속력)가 높으면 커져요.' + (mk ? '' : '<br>10 keV 중수소의 회전 반지름: ' + (tkB < 0.05 ? '∞ (자기장 없음)' : mm.toFixed(1) + ' mm')) + '<br>' + (lose ? '<b>지금은 반지름이 커서(또는 자기장이 없어서) 벽에 부딪혀 잃어버려요.</b>' : '지금은 입자가 용기 안에 갇혀 있어요.'));
      }
      function tkUpdate(dt) {
        tkT += dt;
        tk.forEach((q) => {
          const rho = larmor(q.ion), wc = (q.ion ? 1 : -1) * 6.5 * Math.max(0.1, tkB / 2);
          q.psi += q.vp * dt / TR * 1.1; q.th += wc * dt;
          const u = q.cu + rho * Math.cos(q.th), v = q.cv + rho * Math.sin(q.th);
          const rr = Math.hypot(u, v);
          if (q.lost > 0) { q.lost -= dt; q.p.visible = false; if (q.lost <= 0) { q.cu = (Math.random() - 0.5) * 0.6; q.cv = (Math.random() - 0.5) * 0.6; q.tr.clear(); } return; }
          if (rr > TA - 0.08 || tkB < 0.05) { q.lost = 0.9; lostN++; return; }
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
      const belt1 = new THREE.Mesh(new THREE.TorusGeometry(2.3 * RE, 0.55 * RE, 20, 56), glass(0xff7a59, 0.1)), belt2 = new THREE.Mesh(new THREE.TorusGeometry(4.0 * RE, 0.8 * RE, 20, 56), glass(0x6c8cff, 0.06));
      belt1.rotation.x = belt2.rotation.x = Math.PI / 2; belt1.scale.z = belt2.scale.z = 1.4; gV.add(belt1, belt2);
      const vp = sphere(0.2, 0xffe14d, { emissive: 0xffc800, emissiveIntensity: 1 }); gV.add(vp); const vTr = makeTrail(gV, 70, 0xffd54d, 0.06);
      const aur = [1, -1].map((s) => { const m = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.05, 10, 40), mat(0x4ade80, { emissive: 0x4ade80, emissiveIntensity: 1, transparent: true, opacity: 0 })); m.rotation.x = Math.PI / 2; gV.add(m); return m; });
      const lEarth = label('지구', earth, { color: '#1d4ed8', size: 13, offset: [0, -1.55, 0] }), lIn = label('안쪽 띠', anchor(gV, 2.3 * RE, 0.9, 0), { color: '#c2410c', size: 12 }), lOut = label('바깥 띠', anchor(gV, 4.3 * RE, 1.5, 0), { color: '#4f46e5', size: 12 }), lAur = label('', anchor(gV, 0, 0, 0), { color: '#15803d', size: 12 });
      const Bq = (lam) => Math.sqrt(1 + 3 * Math.sin(lam) ** 2) / Math.pow(Math.cos(lam), 6);
      let van = { t: 0, phi: 0, lost: 0 };
      function mirrorLam() { const a = st.alpha * Math.PI / 180, need = 1 / (Math.sin(a) ** 2); let lo = 0, hi = Math.acos(Math.sqrt(1 / st.L)); const ls = hi; if (Bq(ls) <= need) return { lam: ls, lost: true }; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (Bq(m) < need) lo = m; else hi = m; } return { lam: lo, lost: false }; }
      let mir = mirrorLam();
      function vanInfo() { mir = mirrorLam(); info(mir.lost ? '<b>입사각이 작아 자기 거울이 되돌리지 못해요.</b><br>입자가 대기로 들어가 공기와 부딪혀 <b>오로라</b>가 생겨요 (손실 원뿔).' : '<b>자기 거울</b>: 극 쪽으로 갈수록 자기장이 세져 입자가 되돌아와요.<br>입자는 자기력선을 나선으로 감으며 남북을 오가고, 동서로 천천히 돌아요 (밴앨런대).'); }
      st.L = 4;
      function vanUpdate(dt, t) {
        van.t += dt; const L = st.L, lam0 = mir.lam, wb = 0.9;
        const s = Math.sin(van.t * wb), lam = lam0 * s;
        van.phi += dt * 0.12 * (st.L === 2 ? 1.4 : 1) * (van.dirS || 1);
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

      /* ================= 조작: 값은 2D 화면 옆의 조작판이 정해요 (3D는 같은 값을 그대로 보여 줘요) ================= */
      let cyP_p = 0, built = false;
      const cyPl = grab('cyc', () => controls.player({ duration: 10, loop: true, autoplay: true, label: '가속 과정', phases: [[0, '가속 시작'], [0.4, '반지름이 커져요'], [0.85, '인출']], onFrame(p) { if (!built) return; cyP_p = p; } }));
      built = true;
      function go(sc) {
        st.sc = sc; showCtl(sc);
        gC.visible = sc === 'cyc'; gM.visible = sc === 'mass'; gT.visible = sc === 'tok'; gV.visible = sc === 'van';
        [lDee, lCB, lE, lCp].forEach((l) => l.show(sc === 'cyc'));
        lMs.forEach((l) => l.show(sc === 'mass')); lMass.forEach((l, i) => l.show(sc === 'mass' && i < msN));
        [lTor, lCoil, lBt, lIon, lEl].forEach((l) => l.show(sc === 'tok'));
        [lEarth, lIn, lOut].forEach((l) => l.show(sc === 'van')); if (sc !== 'van') lAur.show(false);
        const o = ctx.orbit; o.tx = o.ty = o.tz = 0;
        if (sc === 'cyc') { cyTr.clear(); o.dist = 16.5 * KD; o.phi = 0.95; cyKey = ''; }
        else if (sc === 'mass') { msKey = ''; { const mr = Math.max.apply(null, msR.concat([2])) * MU; o.dist = Math.max(14, 7 + 2.2 * mr) * KD; o.phi = 1.0; o.theta = 0.2; o.tx = -3; o.tz = mr; } }
        else if (sc === 'tok') { o.dist = 14.5 * KD; o.phi = 0.95; }
        else { o.dist = 17 * KD; o.phi = 1.2; }
      }
      let lastSig = '', lastVaP = null;
      function readLesson(dt, t) {
        const sim = window.__sim; if (!sim) return false; const S = sim.S, sc = MODE2SC[S.mode] || 'cyc';
        if (sc !== st.sc) { go(sc); lastSig = ''; }
        let sig = '';
        if (sc === 'cyc') sig = [S.cy.B, S.cy.f, S.gate].join();
        else if (sc === 'mass') sig = [S.ms.E, S.ms.B1, S.ms.set, S.gate].join();
        else if (sc === 'tok') sig = [Math.round(S.tk.Bd * 20), Math.round(S.tk.Ts * 50), S.tk.Ip, S.gate].join();
        else sig = [S.va.pitch, S.va.sp, S.va.storm].join();
        if (sig !== lastSig) {
          lastSig = sig;
          if (sc === 'cyc') { cyBuild(sim); cyInfo(sim); cyTr.clear(); }
          else if (sc === 'mass') { msSync(sim); go('mass'); updMass(sim); }
          else if (sc === 'tok') { tkB = S.tk.Bd; tkTs = S.tk.Ts; tkIp = !!S.tk.Ip; tkInfo(sim); }
          else { st.alpha = S.va.pitch; vanInfo(); van.t = 0; vTr.clear(); vp.material.color.setHex(S.va.sp === 'p' ? 0xffe14d : 0x7ab6ff); vp.material.emissive.setHex(S.va.sp === 'p' ? 0xffc800 : 0x3b82f6); van.dirS = S.va.sp === 'p' ? 1 : -1; }
        }
        if (sc === 'tok') { tkB = S.tk.Bd; tkTs = S.tk.Ts; }
        if (sc === 'van' && S.va.p !== lastVaP) { lastVaP = S.va.p; van.t = 0; vTr.clear(); }   // 옆 조작판의 ▶ 입자 넣기: 적도에서 새 입자가 출발해요
        return sim;
      }
      return {
        update(dt, t) {
          dt = Math.min(dt, 0.05);
          const sim = readLesson(dt, t); if (!sim) return;
          if (st.sc === 'cyc') cyFrame(cyP_p, sim); else if (st.sc === 'mass') msUpdate2(dt); else if (st.sc === 'tok') tkUpdate(dt); else vanUpdate(dt, t);
        },
        sync() { lastSig = ''; },
      };
    },
  });
})();
