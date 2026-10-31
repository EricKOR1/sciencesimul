/* hq-magnetic-field · 3D 전류 주위의 자기장 (직선 도선 · 원형 도선 · 솔레노이드)
   오른손 규칙(앙페르): 직선 — 엄지 = 전류, 감아쥔 손가락 = B. 원형/솔레노이드 — 손가락 = 전류가 도는 방향, 엄지 = 내부 B (= N극 쪽).
   2D 실험과 같은 약속: 원형·솔레노이드에서 '정방향'이면 중심의 B가 +x(오른쪽), 직선은 전류가 위(+y)로 흐르면 위에서 볼 때 B가 시계 반대 방향. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches), KD = PHN ? 1.45 : 1;
  const NC = 0xe2464b, MU0 = 4e-7 * Math.PI;
  const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '-': '⁻' };
  function sci(x) {
    if (!x || !isFinite(x)) return '0';
    x = Math.abs(x) * (1 + 1e-12); let e = Math.floor(Math.log10(x)), m = x / Math.pow(10, e); m = Number(m.toFixed(1)); if (m >= 10) { m /= 10; e++; }
    return m.toFixed(1) + '×10' + String(e).replace(/[0-9-]/g, (c) => SUP[c]);
  }

  window.SciSim3D.attach({
    button: (window.matchMedia && window.matchMedia('(max-width: 599px)').matches) ? null : undefined,
    title: '전류 주위의 자기장 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: 11 * KD, theta: 0.5, phi: 1.1, min: 5, max: 22 },
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3, Yax = new V3(0, 1, 0);
      const lessonS = () => (window.__sim && window.__sim.S) || null;
      const S0 = lessonS();
      const st = {
        mode: S0 && (S0.mode === 'loop' || S0.mode === 'sol') ? S0.mode : 'wire',
        w: { I: 10, r: 10, dir: 1 }, l: { I: 3, R: 6, N: 1, dir: 1 }, s: { n: 2000, I: 1, iron: false, dir: 1 }, comp: true,
      };
      if (S0 && S0.w) Object.assign(st.w, { I: S0.w.I, r: S0.w.r, dir: S0.w.dir });
      if (S0 && S0.l) Object.assign(st.l, { I: S0.l.I, R: S0.l.R, N: S0.l.N, dir: S0.l.dir });
      if (S0 && S0.s) Object.assign(st.s, { n: S0.s.n, I: S0.s.I, iron: !!S0.s.iron, dir: S0.s.dir });

      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0.1 }, o || {}));
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
      function disposeKids(g) { while (g.children.length) { const c = g.children[0]; g.remove(c); if (c.geometry) c.geometry.dispose(); } }
      function lineTube(pts, col, op, rad) { const c = new THREE.CatmullRomCurve3(pts); return new THREE.Mesh(new THREE.TubeGeometry(c, Math.max(8, pts.length * 2), rad || 0.022, 5, false), basic(col, { transparent: true, opacity: op })); }

      const gW = new THREE.Group(), gL = new THREE.Group(), gS = new THREE.Group(), gC = new THREE.Group();
      root.add(gW, gL, gS, gC);

      /* ---------- 나침반 ---------- */
      function mkCompass(parent) {
        const g = new THREE.Group();
        const shell = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 12), basic(0xffffff, { transparent: true, opacity: 0.16 }));
        const nd = new THREE.Group();
        const n = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.34, 12), mat(NC)); n.position.y = 0.17;
        const s = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.34, 12), mat(0xdfe6f5)); s.position.y = -0.17; s.rotation.x = Math.PI;
        nd.add(n, s); g.add(shell, nd); parent.add(g); return { g, nd, tgt: new V3(0, 0, -1) };
      }
      const EARTH = new V3(0, 0, -1);
      const compW = [0, 1, 2].map(() => mkCompass(gW)), compL = [mkCompass(gL), mkCompass(gL)], compS = [0, 1, 2, 3].map(() => mkCompass(gS));
      function aim(c, v, dt) { const t = new THREE.Quaternion().setFromUnitVectors(Yax, v.clone().normalize()); c.nd.quaternion.slerp(t, 1 - Math.exp(-dt * 7)); }

      /* ---------- 공통: 원형 전류 묶음의 자기장(수치합) + 자기력선 ---------- */
      function loopSources(Lx0, Lx1, nLoops, R, seg) {
        const out = [];
        for (let i = 0; i < nLoops; i++) {
          const x = nLoops === 1 ? Lx0 : Lx0 + (Lx1 - Lx0) * (i + 0.5) / nLoops;
          for (let k = 0; k < seg; k++) { const a = (k + 0.5) / seg * Math.PI * 2, da = Math.PI * 2 / seg; out.push(x, R * Math.cos(a), R * Math.sin(a), 0, -R * Math.sin(a) * da, R * Math.cos(a) * da); }
        }
        return out;
      }
      function bAt(SRC, p, out) {
        let bx = 0, by = 0, bz = 0;
        for (let i = 0; i < SRC.length; i += 6) {
          const rx = p.x - SRC[i], ry = p.y - SRC[i + 1], rz = p.z - SRC[i + 2], r2 = rx * rx + ry * ry + rz * rz + 0.004, inv = 1 / (r2 * Math.sqrt(r2));
          const dx = SRC[i + 3], dy = SRC[i + 4], dz = SRC[i + 5];
          bx += (dy * rz - dz * ry) * inv; by += (dz * rx - dx * rz) * inv; bz += (dx * ry - dy * rx) * inv;
        }
        return out.set(bx, by, bz);
      }
      // seeds: [[x,rho,azimuth],...]  return {tubes, cones[]} added to group g
      function traceLines(g, SRC, seeds, closeX, maxR, closeMode) {
        const out = [], p = new V3(), b = new V3();
        seeds.forEach((s) => {
          const start = new V3(s[0], s[1] * Math.cos(s[2]), s[1] * Math.sin(s[2])); p.copy(start); const pts = [p.clone()]; let closed = false;
          for (let n = 0; n < 1200; n++) {
            bAt(SRC, p, b); if (b.lengthSq() < 1e-14) break; b.normalize();
            const mid = p.clone().addScaledVector(b, 0.04); bAt(SRC, mid, b); b.normalize();
            const px = p.x; p.addScaledVector(b, 0.08); pts.push(p.clone());
            if (closeMode === 'plane' && n > 15 && ((px - closeX) * (p.x - closeX) <= 0)) { closed = true; break; }
            if (closeMode === 'x0' && n > 50 && px < closeX && p.x >= closeX && Math.hypot(p.y, p.z) < s[1] * 2.2 + 0.2) { closed = true; break; }
            if (p.length() > maxR) break;
          }
          if (closed) pts.push(start.clone());
          const sub = pts.filter((_, i) => i % 3 === 0 || i === pts.length - 1); if (sub.length < 4) return;
          const curve = new THREE.CatmullRomCurve3(sub);
          const tube = lineTube(sub, 0xb79bff, 0.8, 0.024); g.add(tube);
          const cones = [];
          [0.14, 0.4, 0.66, 0.9].forEach((u) => { const cn = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.24, 10), basic(0xd8c7ff, { transparent: true })); cn.position.copy(curve.getPointAt(u)); cn.userData.tg = curve.getTangentAt(u); g.add(cn); cones.push(cn); });
          out.push({ tube, cones });
        });
        return out;
      }
      function setLines(lines, sign, op) { lines.forEach((l) => { l.tube.material.opacity = op; l.cones.forEach((c) => { c.quaternion.setFromUnitVectors(Yax, c.userData.tg.clone().multiplyScalar(sign)); c.material.opacity = op; }); }); }

      /* ---------- ① 직선 전류 ---------- */
      const wireMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 8, 16), mat(0xe39a45, { metalness: 0.4 })); gW.add(wireMesh);
      const plane = new THREE.Mesh(new THREE.CircleGeometry(4.8, 64), basic(0x6b7fb4, { transparent: true, opacity: 0.16, side: THREE.DoubleSide })); plane.rotation.x = -Math.PI / 2; gW.add(plane);
      const wLines = []; // 동심원 (비 1.5 = 같은 자속)
      const RINGS = [0.55, 0.85, 1.3, 2.0, 3.0, 4.5];
      [-1.7, 0, 1.7].forEach((y) => RINGS.forEach((r) => {
        const pts = []; for (let i = 0; i <= 64; i++) { const a = i / 64 * Math.PI * 2; pts.push(new V3(r * Math.cos(a), y, -r * Math.sin(a))); } // a 증가 = 위에서 볼 때 시계 반대 방향 (x→−z)
        const tube = lineTube(pts, 0xb79bff, y === 0 ? 0.85 : 0.35, y === 0 ? 0.024 : 0.016); gW.add(tube);
        const cones = []; [0.1, 0.35, 0.6, 0.85].forEach((u) => { const a = u * Math.PI * 2; if (y !== 0 && r > 2.1) return; const cn = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 10), basic(0xd8c7ff, { transparent: true, opacity: y === 0 ? 0.9 : 0.4 })); cn.position.set(r * Math.cos(a), y, -r * Math.sin(a)); cn.userData.tg = new V3(-Math.sin(a), 0, -Math.cos(a)); gW.add(cn); cones.push(cn); });
        wLines.push({ tube, cones, y });
      }));
      const wFlow = []; for (let i = 0; i < 8; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.42, 10), basic(0xffe14d)); gW.add(c); wFlow.push(c); }
      const wBarrow = mkArrow(0x7c3aed, 0.045); gW.add(wBarrow);
      const wTipI = new THREE.Object3D(); gW.add(wTipI);
      const wLabI = label('전류 I', wTipI, { color: '#a16207', offset: [0.5, 0, 0], size: 13 });
      const wLabB = label('B', wBarrow, { color: '#6d28d9', size: 14 }); const wLabR = label('r', new THREE.Object3D(), { color: 'rgba(8,12,24,.72)', size: 12 });
      const wRMid = new THREE.Object3D(); gW.add(wRMid); wLabR.obj = wRMid;
      const wRLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new V3(), new V3(1, 0, 0)]), new THREE.LineBasicMaterial({ color: 0xffffff })); gW.add(wRLine);
      const rU = () => 0.25 + st.w.r * 0.2;
      const wAngles = [Math.PI * 0.2, Math.PI * 0.85, Math.PI * 1.45];
      function bDirW(a, dir) { return new V3(-Math.sin(a) * 0, 0, 0).set(-Math.sin(a), 0, -Math.cos(a)).multiplyScalar(dir); } // 위치각 a에서 접선(위에서 볼 때 시계 반대)

      /* ---------- ② 원형 전류 ---------- */
      let SRC_L = loopSources(0, 0, 1, 1, 48), lLines = [], lAxisLine = [], lRbuilt = 0;
      const lGroup = new THREE.Group(); gL.add(lGroup);
      const loopWrap = new THREE.Group(); gL.add(loopWrap);
      const lFlow = []; for (let i = 0; i < 14; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.34, 10), basic(0xffe14d)); gL.add(c); lFlow.push(c); }
      const lBarrow = mkArrow(0x7c3aed, 0.07); gL.add(lBarrow);
      const lLabB = label('B', lBarrow, { color: '#6d28d9', size: 14, offset: [0, 0.5, 0] });
      const lLabN = label('N극 쪽', new THREE.Object3D(), { color: '#e2464b', size: 13 }), lLabS = label('S극 쪽', new THREE.Object3D(), { color: '#2f6df6', size: 13 });
      const lNObj = new THREE.Object3D(), lSObj = new THREE.Object3D(); gL.add(lNObj, lSObj); lLabN.obj = lNObj; lLabS.obj = lSObj;
      const lLabR = label('R', new THREE.Object3D(), { color: 'rgba(8,12,24,.72)', size: 12 }); const lRObj = new THREE.Object3D(); gL.add(lRObj); lLabR.obj = lRObj;
      const lRLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new V3(), new V3(0, 1, 0)]), new THREE.LineBasicMaterial({ color: 0xffffff })); gL.add(lRLine);
      const lRU = () => st.l.R * 0.36;                                // 화면 단위
      function buildLoop() {
        disposeKids(loopWrap); const R = lRU(), N = st.l.N;
        for (let k = 0; k < N; k++) {
          const t = new THREE.Mesh(new THREE.TorusGeometry(R, 0.06, 10, 64), mat(0xe39a45, { metalness: 0.4 })); t.rotation.y = Math.PI / 2; t.position.x = (k - (N - 1) / 2) * 0.22; loopWrap.add(t);
        }
        if (Math.abs(lRbuilt - R) > 1e-6) {
          lRbuilt = R; disposeKids(lGroup); SRC_L = loopSources(0, 0, 1, R, 48);
          const sd = []; [0.4, 0.75, 0.93, 1.15, 1.45, 1.9].forEach((f) => [0, 3.14159].forEach((a) => sd.push([0, f * R, a + 0.5])));
          lLines = traceLines(lGroup, SRC_L, sd, 0, 4.5 * R + 3, 'plane'); lAxisLine = traceLines(lGroup, SRC_L, [[-1.6 * R - 1.2, 0, 0]], 0, 2.4 * R + 2.5, 'none');
        }
      }

      /* ---------- ③ 솔레노이드 ---------- */
      const SL = 4, SR = 0.85;
      const SRC_S = loopSources(-SL / 2, SL / 2, 14, SR, 28);
      const sSeeds = []; [0.0].forEach(() => sSeeds.push([-SL * 0.45, 0, 0])); [0.5, 0.92].forEach((f) => [0, 1, 2, 3].forEach((k) => sSeeds.push([-SL * 0.45, f * SR, k * Math.PI / 2 + 0.3])));
      const sGroup = new THREE.Group(); gS.add(sGroup);
      const sLines = traceLines(sGroup, SRC_S, sSeeds, -SL * 0.45, 6.2, 'x0');
      const sCoil = new THREE.Group(); gS.add(sCoil);
      const sCore = new THREE.Mesh(new THREE.CylinderGeometry(SR * 0.62, SR * 0.62, SL + 0.3, 24), mat(0x9aa3b2, { transparent: true, opacity: 0.55, metalness: 0.5 })); sCore.rotation.z = Math.PI / 2; gS.add(sCore);
      const sCapN = new THREE.Mesh(new THREE.CircleGeometry(SR * 1.1, 32), basic(NC, { transparent: true, opacity: 0.4, side: THREE.DoubleSide })), sCapS = new THREE.Mesh(new THREE.CircleGeometry(SR * 1.1, 32), basic(0x2f6df6, { transparent: true, opacity: 0.4, side: THREE.DoubleSide }));
      sCapN.rotation.y = sCapS.rotation.y = Math.PI / 2; gS.add(sCapN, sCapS);
      const sLabN = label('N극', sCapN, { color: '#e2464b', offset: [0, 0.95, 0] }), sLabS = label('S극', sCapS, { color: '#2f6df6', offset: [0, 0.95, 0] });
      const sFlow = []; for (let i = 0; i < 22; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 10), basic(0xffe14d)); gS.add(c); sFlow.push(c); }
      const sBarrow = mkArrow(0x7c3aed, 0.06); gS.add(sBarrow); const sLabB = label('내부 B', sBarrow, { color: '#6d28d9', size: 13 });
      let sTurns = 20, sPath = [];
      function buildSol() {
        disposeKids(sCoil); sTurns = Math.round(st.s.n / 100); const pts = [];
        for (let i = 0; i <= sTurns * 24; i++) { const s = i / 24; pts.push(new V3(-SL / 2 + SL * s / sTurns, SR * Math.cos(s * Math.PI * 2), SR * Math.sin(s * Math.PI * 2))); }
        sPath = pts; sCoil.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), Math.min(900, pts.length), 0.045, 6, false), mat(0xe39a45, { metalness: 0.4 })));
      }

      /* ---------- 상태 → 장면 ---------- */
      const bW = () => 2e-7 * st.w.I / (st.w.r / 100), bL = () => MU0 * st.l.N * st.l.I / (2 * st.l.R / 100), bS = () => MU0 * st.s.n * st.s.I;
      const glow = (B, ref) => Math.max(0.2, Math.min(1, 0.35 + 0.3 * Math.log10(Math.max(B, 1e-9) / ref)));
      const ctlNodes = {}; const vis = {};
      function show() {
        const m = st.mode;
        gW.visible = m === 'wire'; gL.visible = m === 'loop'; gS.visible = m === 'sol';
        compW.forEach((c) => (c.g.visible = st.comp)); compL.forEach((c) => (c.g.visible = st.comp)); compS.forEach((c) => (c.g.visible = st.comp));
        // 직선
        const w = st.w; const rr = rU();
        wRLine.geometry.setFromPoints([new V3(0, 0, 0), new V3(rr * Math.cos(wAngles[0]), 0, -rr * Math.sin(wAngles[0]))]);
        wRMid.position.set(rr * 0.5 * Math.cos(wAngles[0]), 0.0, -rr * 0.5 * Math.sin(wAngles[0]));
        wLabR.set('r = ' + w.r + ' cm'); wLabR.show(m === 'wire');
        compW.forEach((c, i) => c.g.position.set(rr * Math.cos(wAngles[i]), 0.0, -rr * Math.sin(wAngles[i])));
        wLines.forEach((l) => { const o = Math.max(0.12, Math.min(0.9, 0.2 + 0.7 * w.I / 20)) * (l.y === 0 ? 1 : 0.45); l.tube.material.opacity = w.I > 0 ? o : 0.05; l.cones.forEach((c) => { c.visible = w.I > 0; c.material.opacity = w.I > 0 ? Math.min(0.95, o + 0.1) : 0; c.quaternion.setFromUnitVectors(Yax, c.userData.tg.clone().multiplyScalar(w.dir)); }); });
        const a0 = wAngles[0], tg0 = bDirW(a0, w.dir);
        const bl = w.I > 0 ? 0.7 + 0.5 * Math.min(1, Math.log10(1 + bW() / 1e-5) / 1.7) : 0;
        setArrow(wBarrow, new V3(rr * Math.cos(a0), 0.0, -rr * Math.sin(a0)), new V3(rr * Math.cos(a0), 0, -rr * Math.sin(a0)).addScaledVector(tg0, bl)); wLabB.show(m === 'wire' && w.I > 0);
        wTipI.position.set(0, 3.7, 0); wLabI.show(m === 'wire' && w.I > 0); wLabI.set('전류 I = ' + w.I + ' A ' + (w.dir > 0 ? '↑' : '↓'));
        // 원형
        const l = st.l, R = lRU(); buildLoop();
        compL[0].g.position.set(0, 0, 0); compL[1].g.position.set(-(R + 1.0) * 0.0 + 0, R + 0.9, 0);
        setLines(lLines, l.dir, 0.9); lAxisLine.forEach((x) => setLines([x], l.dir, 0.7));
        setArrow(lBarrow, new V3(-l.dir * 0.2, 0, 0), new V3(l.dir * (1.1 + 0.5 * Math.min(1, Math.log10(1 + bL() / 1e-4) / 1.5)), 0, 0));
        lRObj.position.set(0, R * 0.5, 0); lRLine.geometry.setFromPoints([new V3(0, 0, 0), new V3(0, R, 0)]); lLabR.set('R = ' + l.R + ' cm'); lLabR.show(m === 'loop');
        lNObj.position.set(l.dir * 1.2, -R * 0.45 - 0.7, 0.0); lSObj.position.set(-l.dir * 1.2, -R * 0.45 - 0.7, 0); lLabN.show(m === 'loop'); lLabS.show(m === 'loop');
        // 솔레노이드
        const s = st.s; buildSol(); sCore.visible = s.iron;
        const nx = s.dir > 0 ? 1 : -1; sCapN.position.x = nx * (SL / 2 + 0.2); sCapS.position.x = -nx * (SL / 2 + 0.2);
        sLabN.show(m === 'sol' && s.I > 0); sLabS.show(m === 'sol' && s.I > 0); sCapN.visible = sCapS.visible = s.I > 0;
        const sOp = s.I > 0 ? glow(s.iron ? bS() * 300 : bS(), 2.5e-3) : 0; sLines.forEach((x) => { x.tube.visible = s.I > 0; x.cones.forEach((c) => (c.visible = s.I > 0)); }); setLines(sLines, s.dir, Math.min(0.95, sOp + 0.1));
        setArrow(sBarrow, new V3(-s.dir * 1.0, 0, 0.0), new V3(s.dir * 1.0, 0, 0)); sBarrow.visible = s.I > 0; sLabB.show(m === 'sol' && s.I > 0);
        compS[0].g.position.set(0, 0, 0); compS[1].g.position.set(SL / 2 + 1.0, 0, 0.2); compS[2].g.position.set(-SL / 2 - 1.0, 0, 0.2); compS[3].g.position.set(0, SR + 1.2, 0);
        [wLabI, wLabB, wLabR].forEach((x) => { if (m !== 'wire') x.show(false); });
        [lLabB, lLabN, lLabS, lLabR].forEach((x) => x.show(m === 'loop'));
        [sLabN, sLabS, sLabB].forEach((x) => { if (m !== 'sol') x.show(false); });
        // 설명
        if (m === 'wire') {
          info('<b>직선 전류</b> · B = 2×10⁻⁷ I / r<br>= 2×10⁻⁷ × ' + w.I + ' / ' + (w.r / 100).toFixed(2) + ' = <b>' + sci(bW()) + ' T</b>' + (w.I ? '' : ' (전류 0)') +
            '<br>🖐 <b>엄지 = 전류(' + (w.dir > 0 ? '위' : '아래') + ')</b>, 감아쥔 손가락 = B. 위에서 보면 ' + (w.dir > 0 ? '시계 반대' : '시계') + ' 방향의 동심원이에요.<br>같은 자속마다 한 줄씩이라 바깥으로 갈수록 선 간격이 넓어져요(B ∝ 1/r).');
        } else if (m === 'loop') {
          info('<b>원형 전류</b> · 중심의 B = μ₀NI / 2R<br>= 4π×10⁻⁷ × ' + l.N + ' × ' + l.I + ' / (2 × ' + (l.R / 100).toFixed(3) + ') = <b>' + sci(bL()) + ' T</b>' +
            '<br>🖐 손가락 = 전류가 도는 방향 → 엄지 = 중심의 B(' + (l.dir > 0 ? '오른쪽' : '왼쪽') + '). 고리 바깥쪽의 B는 <b>반대 방향</b>이고, 선은 끊기지 않는 닫힌 곡선이에요.');
        } else {
          info('<b>솔레노이드</b> · 내부 B = μ₀ n I<br>= 4π×10⁻⁷ × ' + s.n + ' × ' + s.I.toFixed(1) + ' = <b>' + (s.iron ? '철심 때문에 수백~수천 배' : sci(bS()) + ' T') + '</b>' +
            '<br>🖐 손가락 = 전류 → 엄지 = 내부 B → <b>' + (s.dir > 0 ? '오른쪽' : '왼쪽') + '</b> 끝이 N극. 내부는 평행·촘촘(균일), 바깥은 성기고(약함) 막대자석 모양이에요.');
        }
        Object.keys(ctlNodes).forEach((k) => ctlNodes[k].forEach((n) => { n.style.display = vis[k]() ? '' : 'none'; }));
      }

      /* ---------- 조작 ---------- */
      const bar = ctx.renderer.domElement.parentNode.parentNode.querySelector('.v3-ctl');
      function grab(k, v, fn) { const before = bar.children.length; const r = fn(); ctlNodes[k] = [...bar.children].slice(before); vis[k] = v; return r; }
      const M = (x) => () => st.mode === x;
      const rng = {};
      const segC = grab('mode', () => true, () => controls.segment('실험', [{ value: 'wire', label: '🧭 직선' }, { value: 'loop', label: '⭕ 원형' }, { value: 'sol', label: '🧲 솔레노이드' }], st.mode, (v) => { st.mode = v; reorient(); show(); }));
      rng.wI = grab('wI', M('wire'), () => controls.range('전류 I', 0, 20, 1, st.w.I, (v) => { st.w.I = v; show(); }, (v) => v + ' A'));
      rng.wR = grab('wR', M('wire'), () => controls.range('거리 r', 2, 20, 1, st.w.r, (v) => { st.w.r = v; show(); }, (v) => v + ' cm'));
      rng.lI = grab('lI', M('loop'), () => controls.range('전류 I', 1, 8, 0.5, st.l.I, (v) => { st.l.I = v; show(); }, (v) => v.toFixed(1) + ' A'));
      rng.lR = grab('lR', M('loop'), () => controls.range('반지름 R', 3, 8, 0.5, st.l.R, (v) => { st.l.R = v; show(); }, (v) => v.toFixed(1) + ' cm'));
      rng.lN = grab('lN', M('loop'), () => controls.range('감은 수 N', 1, 3, 1, st.l.N, (v) => { st.l.N = v; show(); }, (v) => v + '회'));
      rng.sN = grab('sN', M('sol'), () => controls.range('n', 500, 4000, 500, st.s.n, (v) => { st.s.n = v; show(); }, (v) => v + '회/m'));
      rng.sI = grab('sI', M('sol'), () => controls.range('전류 I', 0, 3, 0.1, st.s.I, (v) => { st.s.I = v; show(); }, (v) => v.toFixed(1) + ' A'));
      grab('dir', () => true, () => controls.button('🔁 전류 방향 바꾸기', () => { const o = st.mode === 'wire' ? st.w : st.mode === 'loop' ? st.l : st.s; o.dir = -o.dir; show(); }));
      const ironB = grab('iron', M('sol'), () => controls.button('철심 ✕', () => { st.s.iron = !st.s.iron; ironB.classList.toggle('on', st.s.iron); ironB.textContent = '철심 ' + (st.s.iron ? '✓' : '✕'); show(); }));
      const compB = grab('comp', () => true, () => controls.button('나침반 ✓', () => { st.comp = !st.comp; compB.classList.toggle('on', st.comp); compB.textContent = '나침반 ' + (st.comp ? '✓' : '✕'); show(); }));
      compB.classList.add('on'); if (st.s.iron) { ironB.classList.add('on'); ironB.textContent = '철심 ✓'; }
      function reorient() { const o = ctx.orbit; if (st.mode === 'wire') { o.phi = 1.05; o.dist = 11.5 * KD; } else if (st.mode === 'loop') { o.dist = 9.5 * KD; o.phi = 1.25; o.theta = 0.9; } else { o.dist = 12 * KD; o.phi = 1.2; } o.ty = 0; }
      reorient(); show();

      /* ---------- 매 프레임 ---------- */
      let ft = 0; const tmp = new V3(), pbuf = new V3(), bb = new V3();
      return {
        update(dt) {
          ft = (ft + dt * 0.12) % 1; const m = st.mode;
          if (m === 'wire') {
            const w = st.w, on = w.I > 0;
            wFlow.forEach((c, i) => { c.visible = on; let u = (ft * (0.5 + w.I / 20) * 2 + i / wFlow.length) % 1; if (w.dir < 0) u = 1 - u; c.position.set(0, -3.8 + 7.6 * u, 0); c.quaternion.setFromUnitVectors(Yax, new V3(0, w.dir, 0)); });
            compW.forEach((c, i) => { const t = bDirW(wAngles[i], w.dir).multiplyScalar(on ? 1 : 0).multiplyScalar(on ? Math.min(3, bW() / 3e-6) : 0).add(EARTH.clone().multiplyScalar(1)); aim(c, t, dt); });
          } else if (m === 'loop') {
            const l = st.l, R = lRU();
            lFlow.forEach((c, i) => { const a = ((ft * 1.5 + i / lFlow.length) % 1) * Math.PI * 2 * l.dir; c.position.set((0) , R * Math.cos(a), R * Math.sin(a)); const tg = new V3(0, -Math.sin(a), Math.cos(a)).multiplyScalar(l.dir); c.quaternion.setFromUnitVectors(Yax, tg); });
            compL.forEach((c, i) => { const p = c.g.position; bAt(SRC_L, tmp.copy(p), bb); bb.normalize().multiplyScalar(l.dir * Math.min(3, bL() / 4e-5)).add(EARTH.clone().multiplyScalar(0.5)); aim(c, bb, dt); });
          } else {
            const s = st.s;
            sFlow.forEach((c, i) => { c.visible = s.I > 0; const u0 = ((ft * 1.0 * (0.4 + s.I / 3) + i / sFlow.length) % 1); const u = s.dir > 0 ? u0 : 1 - u0; const idx = Math.floor(u * (sPath.length - 2)); const a = sPath[idx], b = sPath[idx + 1]; c.position.copy(a); c.quaternion.setFromUnitVectors(Yax, b.clone().sub(a).normalize().multiplyScalar(s.dir)); });
            compS.forEach((c) => { const p = c.g.position; bAt(SRC_S, pbuf.copy(p), bb); const k = bb.length(); bb.multiplyScalar(0.01 * s.dir * (s.I > 0 ? (s.iron ? 40 : 6) * s.I * (s.n / 2000) : 0)); aim(c, bb.add(EARTH.clone().multiplyScalar(0.12)), dt); void k; });
          }
        },
        sync() {
          const S = lessonS(); if (!S) return;
          if (S.mode === 'wire' || S.mode === 'loop' || S.mode === 'sol') { st.mode = S.mode; segC.set(st.mode); }
          if (S.w) { Object.assign(st.w, { I: S.w.I, r: S.w.r, dir: S.w.dir }); rng.wI.set(st.w.I); rng.wR.set(st.w.r); }
          if (S.l) { Object.assign(st.l, { I: S.l.I, R: S.l.R, N: S.l.N, dir: S.l.dir }); rng.lI.set(st.l.I); rng.lR.set(st.l.R); rng.lN.set(st.l.N); }
          if (S.s) { Object.assign(st.s, { n: S.s.n, I: S.s.I, iron: !!S.s.iron, dir: S.s.dir }); rng.sN.set(st.s.n); rng.sI.set(st.s.I); ironB.classList.toggle('on', st.s.iron); ironB.textContent = '철심 ' + (st.s.iron ? '✓' : '✕'); }
          reorient(); show();
        },
      };
    },
  });
})();
