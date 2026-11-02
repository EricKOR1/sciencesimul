/* he-enso · 3D 적도 태평양 단면과 해안 용승
   [워커 순환] 무역풍이 따뜻한 표층수를 서쪽으로 밀어 모으면, 서쪽은 수온 약층이 깊고 비구름이 생기고 동쪽은 찬 물이 올라와요(용승).
   엘니뇨·라니냐에서는 이 구조가 어떻게 달라지는지 입체 단면으로 봐요. (p: -1 라니냐 · 0 정상 · +1 엘니뇨, 수치는 실험의 예시 값)
   [해안 용승] 해안과 나란한 바람 → 에크만 수송으로 표층수가 바다 쪽으로 밀리고 아래의 찬 물이 올라와요.
   2D 실험의 상태(S.pT, S.mode, S.dir, S.ws)를 읽어 따라가요(읽기 전용). */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const lerp = (a, b, t) => a + (b - a) * t;
  const A = (a, p) => (p <= 0 ? lerp(a[1], a[0], -p) : lerp(a[1], a[2], p));          // [라니냐, 정상, 엘니뇨]
  const TA = { sstW: [29.5, 29.0, 28.5], sstC: [26.0, 27.0, 28.5], sstE: [22.4, 24.0, 26.4], thW: [200, 150, 100], thE: [30, 50, 90], slope: [70, 50, 10], upw: [0.9, 0.6, 0.2], rainX: [0.12, 0.22, 0.62], walk: [1.2, 1.0, 0.5] };
  const XL = 6, ZD = 1.6, SC = 0.0125, YB = -3.1;

  window.SciSim3D.attach({
    title: '적도 태평양 단면 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    levels: [0, 1, 2],
    camera: { dist: PHONE ? 21 : 15, theta: 0.42, phi: 1.2, min: 7, max: 30, target: [0, -0.2, 0] },
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0.02 }, o || {}));
      const walkG = new THREE.Group(), coastG = new THREE.Group(); root.add(walkG, coastG);

      /* ---------- 색 도우미 ---------- */
      const ramp = (T) => { const t = Math.max(0, Math.min(1, (T - 21) / 9)); const a = new THREE.Color(0x3a7bd5), b = new THREE.Color(0xffd166), c = new THREE.Color(0xff5a36); return t < 0.5 ? a.lerp(b, t * 2) : b.lerp(c, (t - 0.5) * 2); };
      function arrow(parent, col, len, rad) {
        const g = new THREE.Group(), m = std(col, { emissive: col, emissiveIntensity: 0.35 });
        const sh = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 1, 12), m), hd = new THREE.Mesh(new THREE.ConeGeometry(rad * 2.4, rad * 5, 16), m);
        g.add(sh, hd); g.userData = { sh, hd, rad, len }; parent.add(g); setArrow(g, len); return g;
      }
      function setArrow(g, len) { const u = g.userData, L = Math.max(0.02, len), hh = u.rad * 5; u.sh.scale.set(1, Math.max(0.01, L - hh), 1); u.sh.position.y = (L - hh) / 2; u.hd.position.y = L - hh / 2; g.visible = len > 0.05; }

      /* ================= 워커 순환 ================= */
      const warmM = std(0xffffff, { vertexColors: true, transparent: true, opacity: 0.9, roughness: 0.35 }), coldM = std(0x1d4e9c, { transparent: true, opacity: 0.92, roughness: 0.4 });
      const warm = new THREE.Mesh(new THREE.BufferGeometry(), warmM), cold = new THREE.Mesh(new THREE.BufferGeometry(), coldM);
      walkG.add(warm, cold);
      const thTube = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: 0xfff3b0 })); walkG.add(thTube);
      const thTube2 = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: 0xfff3b0 })); walkG.add(thTube2);
      /* 바닥판 */
      const base = new THREE.Mesh(new THREE.BoxGeometry(XL * 2 + 0.3, 0.14, ZD * 2 + 0.3), std(0x2a3550, { roughness: 0.8 })); base.position.y = YB - 0.08; walkG.add(base);
      /* 남미 · 인도네시아 육지 (양 끝) */
      [-1, 1].forEach((s) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, ZD * 2), std(s < 0 ? 0x5b8c4a : 0x8a6a45, { roughness: 0.9 })); m.position.set(s * (XL + 0.25), 0.1, 0); walkG.add(m); });
      const ths = (p) => ({ dW: A(TA.thW, p) * SC, dE: A(TA.thE, p) * SC, sl: A(TA.slope, p) * 0.0035 });
      const yTh = (x, q) => -(lerp(q.dW, q.dE, (x + XL) / (2 * XL)));
      const ySf = (x, q) => q.sl * (-x / XL);
      function build(p) {
        const q = ths(p), N = 36, top = [], th = [];
        for (let i = 0; i <= N; i++) { const x = -XL + (2 * XL * i) / N; top.push([x, ySf(x, q)]); th.push([x, yTh(x, q) + 0.0]); }
        const sh = new THREE.Shape(); sh.moveTo(top[0][0], top[0][1]); top.forEach((v) => sh.lineTo(v[0], v[1])); for (let i = N; i >= 0; i--) sh.lineTo(th[i][0], th[i][1]); sh.closePath();
        const sh2 = new THREE.Shape(); sh2.moveTo(th[0][0], th[0][1]); th.forEach((v) => sh2.lineTo(v[0], v[1])); sh2.lineTo(XL, YB); sh2.lineTo(-XL, YB); sh2.closePath();
        const ex = { depth: ZD * 2, bevelEnabled: false, steps: 1, curveSegments: 4 };
        const g1 = new THREE.ExtrudeGeometry(sh, ex), g2 = new THREE.ExtrudeGeometry(sh2, ex);
        g1.translate(0, 0, -ZD); g2.translate(0, 0, -ZD);
        const pos = g1.attributes.position, col = new Float32Array(pos.count * 3);
        const sstW = A(TA.sstW, p), sstC = A(TA.sstC, p), sstE = A(TA.sstE, p), c = new THREE.Color();
        for (let i = 0; i < pos.count; i++) { const f = (pos.getX(i) + XL) / (2 * XL), T = f < 0.5 ? lerp(sstW, sstC, f * 2) : lerp(sstC, sstE, (f - 0.5) * 2); c.copy(ramp(T)); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
        g1.setAttribute('color', new THREE.BufferAttribute(col, 3));
        warm.geometry.dispose(); cold.geometry.dispose(); warm.geometry = g1; cold.geometry = g2;
        [thTube, thTube2].forEach((t, k) => { t.geometry.dispose(); t.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(th.map((v) => new THREE.Vector3(v[0], v[1], (k ? -1 : 1) * (ZD + 0.01)))), 40, 0.035, 6, false); });
        return q;
      }
      /* 공기 순환 고리 + 입자 */
      const loopM = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.5 })); walkG.add(loopM);
      const NP = 28, parts = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }), NP); walkG.add(parts);
      const cloudG = new THREE.Group(); walkG.add(cloudG);
      { let s = 3; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
        for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.45 + r() * 0.35, 20, 14), std(0xf3f6fb, { roughness: 1, transparent: true, opacity: 0.94 })); m.position.set((r() - 0.5) * 2.0, 2.2 + r() * 0.5 + (i % 3) * 0.12, (r() - 0.5) * 2.0); m.scale.y = 0.68; cloudG.add(m); } }
      const NR = 40, rain = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.014, 0.014, 0.4, 5), new THREE.MeshBasicMaterial({ color: 0xaed4ff, transparent: true, opacity: 0.8 }), NR); walkG.add(rain);
      const rseed = []; for (let i = 0; i < NR; i++) rseed.push([Math.random() - 0.5, Math.random() - 0.5, Math.random()]);
      const upA = [0, 1, 2].map((i) => { const a = arrow(walkG, 0x7fd8ff, 1, 0.045); a.position.set(3.7 + i * 0.7 - 0.0, YB + 0.3, (i - 1) * 0.9); return a; });
      const wind = arrow(walkG, 0xffffff, 1.4, 0.055); wind.rotation.z = Math.PI / 2; wind.position.set(2.8, 0.75, ZD + 0.1);       // 무역풍 (동 → 서)
      const w2 = arrow(walkG, 0xffffff, 1.4, 0.055); w2.rotation.z = Math.PI / 2; w2.position.set(2.8, 0.75, -ZD - 0.1);
      const L = {
        w: label('서태평양', [-XL + 0.3, 0.55, ZD], { size: 12 }), e: label('동태평양 (페루 연안)', [XL - 0.2, 0.9, ZD], { size: 12 }),
        th: label('수온 약층', [0, 0, ZD], { size: 12, color: 'rgba(120,90,0,.9)' }), trade: label('무역풍', wind, { size: 12, offset: [-0.2, 0.55, 0] }),
        cloud: label('상승 기류 · 비구름', cloudG, { size: 12, offset: [0, 1.5, 0] }), up: label('용승', upA[1], { size: 12, offset: [0, 0.9, 0], color: 'rgba(15,100,150,.92)' }),
        warmL: label('따뜻한 표층수', [-3.8, -0.15, ZD], { size: 11.5, color: 'rgba(160,50,10,.9)' }), coldL: label('찬 심층수', [0, -2.3, ZD], { size: 11.5, color: 'rgba(20,50,130,.92)' }),
      };
      L.th.obj = [0, -1, ZD];

      /* ================= 해안 용승 ================= */
      const CX = 3.0, CZ = 2.0, CD = 3.0;
      const cWarmM = std(0xffb35c, { transparent: true, opacity: 0.88, roughness: 0.3 }), cColdM = std(0x2563b8, { transparent: true, opacity: 0.92, roughness: 0.35 });
      const cWarm = new THREE.Mesh(new THREE.BufferGeometry(), cWarmM), cCold = new THREE.Mesh(new THREE.BufferGeometry(), cColdM); coastG.add(cWarm, cCold);
      const landSh = new THREE.Shape(); landSh.moveTo(CX, -CD); landSh.lineTo(CX, 0); landSh.lineTo(CX + 2.6, 0.55); landSh.lineTo(CX + 2.8, 0.55); landSh.lineTo(CX + 2.8, -CD); landSh.closePath();
      const land = new THREE.Mesh(new THREE.ExtrudeGeometry(landSh, { depth: CZ * 2, bevelEnabled: false }), std(0xb89463, { roughness: 0.95 })); land.position.z = -CZ; coastG.add(land);
      const cBase = new THREE.Mesh(new THREE.BoxGeometry(XL + CX + 2.9, 0.12, CZ * 2 + 0.2), std(0x2a3550, { roughness: 0.8 })); cBase.position.set((CX + 2.8 - XL) / 2, -CD - 0.08, 0); coastG.add(cBase);
      const wf = (x, u) => { const q = Math.max(0, Math.min(1, (x - (CX - 2.6)) / 2.6)), f = q * q * (3 - 2 * q); return u >= 0 ? 0.8 * (1 - 0.97 * u * f) : 0.8 + (-u) * 1.5 * f; };
      function buildCoast(u) {
        const N = 30, tw = []; for (let i = 0; i <= N; i++) { const x = -XL + (CX + XL) * i / N; tw.push([x, -wf(x, u)]); }
        const s1 = new THREE.Shape(); s1.moveTo(-XL, 0); s1.lineTo(CX, 0); for (let i = N; i >= 0; i--) s1.lineTo(tw[i][0], tw[i][1]); s1.closePath();
        const s2 = new THREE.Shape(); s2.moveTo(tw[0][0], tw[0][1]); tw.forEach((v) => s2.lineTo(v[0], v[1])); s2.lineTo(CX, -CD); s2.lineTo(-XL, -CD); s2.closePath();
        const ex = { depth: CZ * 2, bevelEnabled: false, curveSegments: 4 };
        cWarm.geometry.dispose(); cCold.geometry.dispose(); cWarm.geometry = new THREE.ExtrudeGeometry(s1, ex); cCold.geometry = new THREE.ExtrudeGeometry(s2, ex); cWarm.position.z = cCold.position.z = -CZ;
      }
      const cWind = arrow(coastG, 0xffffff, 2.6, 0.07); cWind.position.set(CX - 1.3, 1.0, -1.9);
      const ek = [0, 1, 2].map((i) => { const a = arrow(coastG, 0xffd166, 1.4, 0.06); a.rotation.z = Math.PI / 2; a.position.set(CX - 0.2, 0.12, -1.2 + i * 1.2); return a; });
      const dv = [0, 1, 2].map((i) => { const a = arrow(coastG, 0x9fe6ff, 1.5, 0.06); a.position.set(CX - 0.9, -2.4, -1.2 + i * 1.2); return a; });
      const deep = arrow(coastG, 0x7fb2ff, 2.0, 0.06); deep.rotation.z = -Math.PI / 2; deep.position.set(-0.6, -2.5, CZ + 0.1);
      const cl = {
        land: label('육지', [CX + 1.4, 0.7, 0], { size: 12 }), wind: label('바람', cWind, { size: 12, offset: [0, 0.4, 0] }), ek: label('표층수 이동', ek[1], { size: 11.5, offset: [-0.6, 0.5, 0] }),
        dv: label('', dv[1], { size: 12, offset: [0, 1.0, 0] }), cold: label('찬 심층수', [-3.4, -2.2, CZ], { size: 11.5, color: 'rgba(20,50,130,.92)' }), warmL: label('따뜻한 표층수', [-3.4, -0.35, CZ], { size: 11.5, color: 'rgba(160,50,10,.9)' }),
      };

      /* ================= 상태 · 조작 ================= */
      let view = 'walk', p = 0, pT = 0, uC = 0, uT = 2, built = -9, lastS = null, lastMode = null, lastUs = null, lastCb = -9;
      const rd = () => { try { const s = window.__sim && window.__sim.S; return s || null; } catch (e) { return null; } };
      const ctlEl = controls.text('').parentElement; ctlEl.removeChild(ctlEl.lastChild);
      const grab = (fn) => { const n0 = ctlEl.children.length; const r = fn(); return { r, els: [].slice.call(ctlEl.children, n0) }; };
      const segV = controls.segment('보기', [{ value: 'walk', label: '🌐 워커 순환' }, { value: 'coast', label: '🏖️ 해안 용승' }], view, (v) => setView(v));
      const gW = grab(() => controls.segment('상태', [{ value: -1, label: '라니냐' }, { value: 0, label: '정상' }, { value: 1, label: '엘니뇨' }], 0, (v) => { pT = v; }));
      const segP = gW.r;
      const gC = grab(() => ({
        seg: controls.segment('바람', [{ value: 3, label: '용승 바람' }, { value: 0, label: '바람 없음' }, { value: -3, label: '침강 바람' }], 3, (v) => { sgn = v / 3; uT = sgn * mag; updInfo(); }),
        rng: controls.range('세기', 1, 3, 1, 2, (v) => { mag = v; uT = sgn * mag; updInfo(); }, (v) => ['약', '중', '강'][v - 1]),
      }));
      let sgn = 1, mag = 2; uT = 2;
      const segC = { set: (v) => gC.r.seg.set(v) }, rngW = gC.r.rng;
            function setView(v) {
        view = v; walkG.visible = v === 'walk'; coastG.visible = v === 'coast'; segV.set(v);
        Object.values(L).forEach((l) => l.show(v === 'walk')); Object.values(cl).forEach((l) => l.show(v === 'coast'));
        gW.els.forEach((e) => (e.style.display = v === 'walk' ? '' : 'none')); gC.els.forEach((e) => (e.style.display = v === 'coast' ? '' : 'none'));
        ctx.orbit.tx = v === 'walk' ? 0 : -0.8; ctx.orbit.ty = v === 'walk' ? -0.2 : -1.0;
        if (v === 'coast') { ctx.orbit.theta = 0.75; ctx.orbit.phi = 1.15; } else { ctx.orbit.theta = 0.42; ctx.orbit.phi = 1.2; }
        updInfo();
      }
      function updInfo() {
        if (view === 'walk') {
          const t = p < -0.35 ? '<b>라니냐</b>: 무역풍이 더 강해져 서쪽에 따뜻한 물이 더 쌓이고, 동쪽 용승이 강해져요.' : p > 0.35 ? '<b>엘니뇨</b>: 무역풍이 약해져 따뜻한 물이 동쪽으로 퍼지고, 동쪽 용승이 약해져요. 비구름도 동쪽으로 와요.' : '<b>정상</b>: 무역풍이 따뜻한 물을 서쪽으로 밀어요. 서쪽은 비가 많고, 동쪽은 찬 물이 올라와요.';
          info(t);
        } else info(uT > 0.2 ? '해안과 나란한 바람 → 표층수가 바다 쪽으로 밀려 아래의 <b>찬 물이 올라와요(용승)</b>.<br>찬 물에는 영양염이 많아요.' : uT < -0.2 ? '바람이 반대면 표층수가 해안에 쌓여 <b>가라앉아요(침강)</b>.<br>따뜻한 표층이 두꺼워지고 영양염이 줄어요.' : '바람이 없으면 표층수가 움직이지 않아요.<br>용승 바람이나 침강 바람을 골라 보세요.');
      }
      function syncSim() {
        const S = rd(); if (!S) return;
        if (S.mode !== lastMode) { lastMode = S.mode; if (S.mode === 'coast') setView('coast'); else if (S.mode) setView('walk'); }
        if (typeof S.pT === 'number' && lastS !== S.pT) { if (lastS !== null) { pT = S.pT; segP.set(null); } else { pT = S.pT; } lastS = S.pT; }
        if (S.mode === 'coast' && typeof S.Us === 'number' && lastUs !== S.Us) { { uT = S.Us; sgn = Math.sign(S.Us) || 0; if (S.Us) mag = Math.max(1, Math.min(3, Math.round(Math.abs(S.Us)))); gC.r.seg.set(sgn * 3); rngW.set(mag); updInfo(); } lastUs = S.Us; }
      }
      syncSim(); p = pT; if (rd() && rd().mode === 'coast') setView('coast'); else setView('walk'); segP.set(Math.abs(pT) < 0.05 ? 0 : null);
      const loopPts = (q) => {
        const xu = -XL + 2 * XL * A(TA.rainX, p), xd = 5.0, xm = (xu + xd) / 2, y0 = 0.45 + q.sl * 0.2;
        return [[xd, y0], [xm, y0 - 0.08], [xu + 0.25, y0], [xu - 0.05, 1.5], [xu, 2.75], [xm, 2.95], [xd, 2.75], [xd + 0.2, 1.5]].map((v) => new THREE.Vector3(v[0], v[1], 0));
      };
      let curve = null, q0 = null, xu = 0;
      const dm = new THREE.Object3D(), tmp = new THREE.Vector3();
      function applyP() {
        q0 = build(p); const pts = loopPts(q0); curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal'); xu = pts[3].x;
        loopM.geometry.dispose(); loopM.geometry = new THREE.TubeGeometry(curve, 80, 0.035, 6, true);
        cloudG.position.x = xu; cloudG.position.y = 0; L.cloud.obj = cloudG;
        const up = A(TA.upw, p); upA.forEach((a, i) => setArrow(a, 0.35 + up * 1.4)); const wd = A(TA.walk, p); setArrow(wind, 0.5 + wd * 1.0); setArrow(w2, 0.5 + wd * 1.0);
        wind.position.x = 2.8 + (0.5 + wd) * 0.5; w2.position.x = wind.position.x;
        L.w.obj = [-XL + 0.3, 0.6, ZD]; L.th.obj = [0, yTh(0, q0) + 0.0, ZD];
      }
      applyP();

      return {
        update(dt, t) {
          syncSim();
          if (Math.abs(p - pT) > 0.002) { p += (pT - p) * Math.min(1, dt * 4); if (Math.abs(p - pT) <= 0.002) p = pT; if (Math.abs(p - built) > 0.01 || p === pT) { built = p; applyP(); updInfo(); } }
          if (view === 'walk') {
            const sp = (0.045 + 0.05 * A(TA.walk, p));
            for (let i = 0; i < NP; i++) { const u = (i / NP + t * sp) % 1; curve.getPointAt(u, tmp); dm.position.copy(tmp); dm.position.z = ((i * 37) % 7 - 3) * 0.3; dm.scale.setScalar(0.8); dm.updateMatrix(); parts.setMatrixAt(i, dm.matrix); }
            parts.instanceMatrix.needsUpdate = true;
            const rn = Math.min(1, 0.4 + A([0.9, 0.7, 0.9], p)); const nvis = Math.round(NR * rn);
            for (let i = 0; i < NR; i++) { const s = rseed[i], f = (t * 0.9 + s[2]) % 1; dm.position.set(xu + s[0] * 2.0, 2.0 - f * 2.0, s[1] * 2.6); dm.scale.setScalar(i < nvis ? 1 : 0.0001); dm.updateMatrix(); rain.setMatrixAt(i, dm.matrix); }
            rain.instanceMatrix.needsUpdate = true;
            upA.forEach((a, i) => { a.position.y = YB + 0.25 + 0.12 * Math.sin(t * 2 + i); });
          } else {
            uC += (uT - uC) * Math.min(1, dt * 3); const u = uC / 3;
            if (Math.abs(u - lastCb) > 0.004) { lastCb = u; buildCoast(u); updInfo(); }
            const au = Math.abs(uC);
            setArrow(cWind, au > 0.1 ? 0.8 + 0.45 * au : 0); cWind.rotation.x = uC > 0 ? Math.PI / 2 : -Math.PI / 2; cWind.position.z = uC > 0 ? -1.9 : 1.9;
            ek.forEach((a, i) => { setArrow(a, au > 0.1 ? 0.5 + 0.3 * au : 0); a.rotation.z = uC > 0 ? Math.PI / 2 : -Math.PI / 2; a.position.x = uC > 0 ? CX - 0.1 : CX - 1.8; });
            dv.forEach((a, i) => { setArrow(a, au > 0.1 ? 0.5 + 0.25 * au : 0); a.rotation.z = uC > 0 ? 0 : Math.PI; const ph = (t * 0.5 + i * 0.33) % 1; a.position.y = uC > 0 ? -2.6 + ph * 1.2 : -0.3 - ph * 0.5 + 0.9; a.position.x = CX - 0.9; });
            setArrow(deep, uC > 0.1 ? 1.2 + 0.3 * au : 0); deep.position.x = -0.6 + (uC > 0 ? ((t * 0.3) % 1) * 0.6 : 0);
            cl.dv.set(uC > 0.1 ? '용승 ↑ (찬 물)' : uC < -0.1 ? '침강 ↓' : ''); cl.dv.show(au > 0.1); cl.wind.show(au > 0.1); cl.ek.show(au > 0.1); cl.cold.show(true);
          }
        },
        sync() { syncSim(); },
      };
    },
  });
})();
