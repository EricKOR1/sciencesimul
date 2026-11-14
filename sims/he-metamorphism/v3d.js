/* he-metamorphism · 3D 변성 작용: 광물 알갱이와 변동대 단면
   [열과 압력] 열을 올리면 알갱이가 커지고, 한쪽 방향으로 센 압력을 주면 납작한 광물이 압력에 수직으로 나란히 늘어서요(엽리).
   2D와 같은 값(온도 20~700 °C, 압력 0~600 MPa, 압력 방향)을 2D 조작판과 서로 같이 움직이고, ▶ 재생은 2D 미션 순서(열만 → 압력 → 압력 방향 바꾸기)를 대신 해 줘요.
   [변동대 단면] 습곡 산맥 아래에서는 깊을수록 변성도가 높고(점판암→천매암→편암→편마암), 마그마가 들어온 곳 둘레에는 좁은 접촉 변성대가 생겨요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  window.SciSim3D.attach({
    title: '변성 작용 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    levels: [0],             // 1단계(암석 담기 · 카드 나누기) · 2단계(탐침 놓기 · 압력-온도 그래프) · 3단계(단면의 번호 점 · 변성암 띠 누르기)는 2D 화면에서 해요
    camera: { dist: PHONE ? 13 : 9.5, theta: 0.5, phi: 1.15, min: 4.5, max: 24, target: [0, 0.2, 0] },
    autoRotate: 0,
    build(ctx) {
      if (ctx.THREE.ColorManagement) ctx.THREE.ColorManagement.legacyMode = false;     // 색을 보이는 그대로(sRGB) 쓰도록 맞춰요
      const { THREE, root, label, info, controls, mats } = ctx;
      const rock = (c, o) => mats.stone(c, { cracks: true, repeat: 0.3, bump: 0.05, extra: o });   // 암석층: 거친 돌 질감
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.8, metalness: 0 }, o || {}));
      const gA = new THREE.Group(), gB = new THREE.Group(); root.add(gA, gB);
      const arrow = (parent, col, len, rad) => { const g = new THREE.Group(), m = std(col, { emissive: col, emissiveIntensity: 0.4, roughness: 0.4 }), s = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 1, 12), m), h = new THREE.Mesh(new THREE.ConeGeometry(rad * 2.4, rad * 5, 16), m); g.add(s, h); g.userData = { s, h, rad }; parent.add(g); return g; };
      const setArrow = (g, len) => { const u = g.userData, hh = u.rad * 5, L = Math.max(0.05, len); u.s.scale.set(1, Math.max(0.01, L - hh), 1); u.s.position.y = (L - hh) / 2; u.h.position.y = L - hh / 2; g.visible = len > 0.12; };

      /* ===================== A. 열과 압력 ===================== */
      const N = 260, flakes = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 0.16), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.32, metalness: 0.12, clearcoat: 0.6, clearcoatRoughness: 0.2 }), N); gA.add(flakes);   // 운모처럼 반짝이는 납작한 광물
      const heater = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.16, 5.2), mats.metal('iron', { roughness: 0.5, extra: { emissive: 0xff4a1a, emissiveIntensity: 0 } })); heater.position.y = -2.0; gA.add(heater);   // 가열판
      const frame = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mats.glass({ tint: 0xdcebff, opacity: 0.08 })); gA.add(frame);
      const fitP = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.2, colorWrite: false, depthWrite: false })); gA.add(fitP);   // 화면 맞춤용 보이지 않는 상자 (암석 틀과 같은 크기: 알갱이는 화면 맞춤이 재지 못해요)
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color: 0xcfe0ff, transparent: true, opacity: 0.6 })); gA.add(edges);
      const aL = arrow(gA, 0xffd34d, 1, 0.1), aR = arrow(gA, 0xffd34d, 1, 0.1); aL.rotation.z = -Math.PI / 2; aR.rotation.z = Math.PI / 2;
      let sd = 21; const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
      const FL = []; for (let i = 0; i < N; i++) { const u = rnd() * 2 - 1, a = rnd() * 6.283, q = Math.sqrt(1 - u * u); FL.push({ p: [rnd() - 0.5, rnd() - 0.5, rnd() - 0.5], r: [Math.cos(a) * q, u, Math.sin(a) * q], s: 0.7 + rnd() * 0.6, k: rnd(), twist: rnd() * 6.283 }); }
      const PALF = [new THREE.Color(0xc9b08a), new THREE.Color(0x8d7660), new THREE.Color(0xe3d6b8), new THREE.Color(0x5b4d44)];
      const LA = { name: label('', [0, 2.3, 0], { size: 13.5, color: 'rgba(15,23,42,.92)' }), fol: label('엽리 (납작한 광물이 나란해요)', [0, -2.4, 0], { size: 12 }), pr: label('압력', [-2.6, 0.2, 0], { size: 12, color: 'rgba(130,90,0,.92)' }), ht: label('열', [0, -2.35, 2.2], { size: 12, color: 'rgba(170,40,10,.92)' }) };
      let lastKey = '';
      const tmpQ = new THREE.Quaternion(), tmpV = new THREE.Vector3(), zA = new THREE.Vector3(0, 0, 1), ex = new THREE.Vector3(1, 0, 0), dm = new THREE.Object3D(), cc = new THREE.Color();
      /* 2D와 같은 암석 이름 규칙 (엽리가 뚜렷하면 온도로 구분, 열만 받으면 혼펠스) */
      const foliKind = (Tc) => (Tc < 300 ? '점판암' : Tc < 400 ? '천매암' : Tc < 600 ? '편암' : '편마암');
      function rockNow() { const G = (ctx.lesson() && ctx.lesson().S && ctx.lesson().S.grain) || { T: 20, a: 0, g: 0 }; return G.a >= 0.5 ? foliKind(G.T) : G.g >= 0.5 ? '혼펠스' : '셰일 (원암)'; }
      function applyA() {
        const G = (ctx.lesson() && ctx.lesson().S && ctx.lesson().S.grain) || { T: 20, P: 0, g: 0, a: 0, pS: 0, dv: 0 };
        const t = Math.min(1, G.g / 3), p = G.pS, al = G.a, dv = G.dv, ax = [1 - dv, dv];
        const cw = lerp(3.4, lerp(2.3, 3.9, dv), p), ch = lerp(3.4, lerp(3.9, 2.3, dv), p), sz = lerp(0.2, 0.62, t);
        frame.scale.set(cw, ch, 3.4); edges.scale.copy(frame.scale); fitP.scale.copy(frame.scale);
        const band = t > 0.62 && al > 0.5;
        for (let i = 0; i < N; i++) {
          const f = FL[i]; tmpV.set(f.r[0] * (1 - al) + al * (ax[0] + f.r[0] * 0.12), f.r[1] * (1 - al) + al * (ax[1] + f.r[1] * 0.12), f.r[2] * (1 - al) + al * (f.r[2] * 0.12)).normalize();
          tmpQ.setFromUnitVectors(zA, tmpV); dm.quaternion.copy(tmpQ); dm.rotateZ(f.twist * (1 - al * 0.8));
          dm.position.set(f.p[0] * cw * 0.92, f.p[1] * ch * 0.92, f.p[2] * 3.1); dm.scale.setScalar(sz * f.s * (t > 0.7 ? 1 + 0.2 * f.k : 1)); dm.updateMatrix(); flakes.setMatrixAt(i, dm.matrix);
          if (band) cc.copy(((Math.floor((f.p[1] + 0.5) * 7)) % 2) ? PALF[2] : PALF[3]).multiplyScalar(0.9 + f.k * 0.2); else cc.copy(PALF[Math.floor(f.k * 4) % 4]).multiplyScalar(0.85 + f.k * 0.3);
          flakes.setColorAt(i, cc);
        }
        flakes.instanceMatrix.needsUpdate = true; flakes.instanceColor.needsUpdate = true;
        heater.material.emissiveIntensity = t * 1.3; heater.position.y = -ch / 2 - 0.12; LA.ht.obj = [0, -ch / 2 - 0.3, 2.4];
        setArrow(aL, p * 1.6 + 0.0); setArrow(aR, p * 1.6 + 0.0);
        if (dv < 0.5) { aL.rotation.z = -Math.PI / 2; aR.rotation.z = Math.PI / 2; aL.position.set(-cw / 2 - 0.2 - p * 1.6, 0, 0); aR.position.set(cw / 2 + 0.2 + p * 1.6, 0, 0); LA.pr.obj = [-cw / 2 - 1.2, 0.5, 0]; }
        else { aL.rotation.z = Math.PI; aR.rotation.z = 0; aL.position.set(0, ch / 2 + 0.2 + p * 1.6, 0); aR.position.set(0, -ch / 2 - 0.2 - p * 1.6, 0); LA.pr.obj = [1.2, ch / 2 + 0.8, 0]; }
        LA.pr.show(p > 0.08);
        LA.name.set(rockNow()); LA.name.obj = [0, ch / 2 + 0.4 + (dv > 0.5 ? p * 1.7 : 0), 0]; LA.fol.show(al > 0.5); LA.fol.obj = [0, -ch / 2 - 0.05, 1.8]; LA.ht.show(t > 0.2);
        info('<b>' + rockNow() + '</b><br>' + (t > 0.2 ? '열이 높을수록 알갱이가 <b>커져요</b>(재결정). ' : '') + (al > 0.3 ? '한 방향 압력에 <b>수직</b>으로 납작한 광물이 늘어서요(엽리).' : '압력이 약하면 알갱이가 제멋대로 놓여 <b>엽리</b>가 없어요.'));
      }
      /* 조작은 2D 조작판과 같은 값: 온도 20~700 °C · 압력 0~600 MPa · 압력 방향 */
      const gcEl = controls.text('').parentElement; gcEl.removeChild(gcEl.lastChild);
      const grab = (fn) => { const n = gcEl.children.length; const r = fn(); return { r, els: [].slice.call(gcEl.children, n) }; };
      const $q = (q) => document.querySelector(q);
      const setRange = (q, v) => { const e = $q(q); if (e && +e.value !== v) { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); } };
      const clickDir = (v) => { const b = $q('#dirSeg .opt[data-k="' + v + '"]'); if (b) b.click(); };
      const gA1 = grab(() => ({
        rT: controls.range('온도', 20, 700, 10, 20, (v) => { plA.pause(); setRange('#sT', v); }, (v) => v + ' °C'),
        rP: controls.range('압력', 0, 600, 50, 0, (v) => { plA.pause(); setRange('#sP', v); }, (v) => v + ' MPa'),
        sg: controls.segment('압력 방향', [{ value: 'h', label: '⬌ 좌우에서' }, { value: 'v', label: '⬍ 위아래에서' }], 'h', (v) => { plA.pause(); clickDir(v); }),
      }));
      const rT = gA1.r.rT, rP = gA1.r.rP, sgDir = gA1.r.sg;
      let plReady = false;
      /* ▶ 2D 미션 순서: ① 열만 (500 °C 이상) ② 압력 (300 MPa 이상) ③ 압력 방향 바꾸기 → 처음으로 */
      const gA2 = grab(() => controls.player({
        duration: 12, loop: true, autoplay: false, label: '열 → 압력 → 방향',
        phases: [[0, '열만 가해요'], [0.3, '압력을 더해요'], [0.62, '압력 방향을 바꿔요'], [0.9, '처음으로']],
        onFrame(p) {
          if (!plReady) return;
          const tt = p < 0.3 ? 20 + 580 * (p / 0.3) : p < 0.9 ? 600 : 600 - 580 * ((p - 0.9) / 0.1), pp = p < 0.3 ? 0 : p < 0.5 ? 400 * ((p - 0.3) / 0.2) : p < 0.9 ? 400 : 400 * (1 - (p - 0.9) / 0.1);
          setRange('#sT', Math.round(tt / 10) * 10); setRange('#sP', Math.round(pp / 50) * 50);
          const d = p >= 0.62 && p < 0.9 ? 'v' : 'h', l = ctx.lesson(); if (l && l.S && l.S.grain.dir !== d) clickDir(d);
        },
      }));
      const plA = gA2.r; plA.pause(); plReady = true;

      /* ===================== B. 변동대 단면 ===================== */
      const XW = 4.8, ZD = 1.6, YB = -3.1;
      const ext = (poly, mat, z0, d) => { const sh = new THREE.Shape(); poly.forEach((p, i) => (i ? sh.lineTo(p[0], p[1]) : sh.moveTo(p[0], p[1]))); sh.closePath(); const g = new THREE.ExtrudeGeometry(sh, { depth: d == null ? ZD * 2 : d, bevelEnabled: false, curveSegments: 3 }); g.translate(0, 0, z0 == null ? -ZD : z0); const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true; gB.add(m); return m; };
      const hostM = rock(0x564c42), top = [[-XW, 0]], mt = [];
      for (let i = 0; i <= 24; i++) { const x = -XW + 2 * XW * i / 24; top.push([x, 0.0 + (x < 0.2 ? 0.8 * Math.exp(-Math.pow((x + 2.6) / 1.4, 2)) : 0)]); }
      const profile = top.slice(1);
      /* 전체 블록 */
      ext([[-XW, YB]].concat(profile, [[XW, YB]]), hostM);
      /* 광역 변성대: 깊이별 띠 (왼쪽 산맥 아래) */
      const REG = [[-0.35, -1.0, 0x71818f, '점판암'], [-1.0, -1.8, 0x7d9a8c, '천매암'], [-1.8, -2.5, 0xa2765f, '편암'], [-2.5, YB, 0xcbb9a5, '편마암']];
      REG.forEach((r) => { ext([[-XW, r[0]], [-0.4, r[0]], [-0.4, r[1]], [-XW, r[1]]], rock(r[2]), -ZD + 0.0, ZD * 2 + 0.02); });
      /* 산맥 + 습곡 줄무늬 (표면) */
      ext([[-XW, 0]].concat(profile.filter((p) => p[0] < 0.2), [[0.2, 0], [0.2, -0.35], [-XW, -0.35]]), rock(0x7e7e6c), -ZD, ZD * 2 + 0.02);
      /* 심성암체 + 접촉 변성대 (오른쪽) */
      const dome = (cx, cy, rx, ry) => { const a = []; for (let i = 0; i <= 28; i++) { const t = Math.PI * i / 28; a.push([cx + Math.cos(t) * rx, cy - Math.sin(t) * ry + ry * 0]); } return a; };
      const half = (cx, cy, rx, ry) => { const a = []; for (let i = 0; i <= 28; i++) { const t = Math.PI * i / 28; a.push([cx + Math.cos(t) * rx, cy + Math.sin(t) * ry]); } return a; };
      const aur = (rx, ry, col, e) => ext(half(2.7, YB, rx, ry), rock(col), -ZD, ZD * 2 + e);
      const aur1 = aur(2.2, 3.0, 0x9a7a52, 0.02), aur2 = aur(1.75, 2.45, 0x6a4b48, 0.03);
      const plut = ext(half(2.7, YB, 1.2, 1.9), std(0xc0443a, { emissive: 0xff3a14, emissiveIntensity: 0.45, roughness: 0.55 }), -ZD, ZD * 2 + 0.04);
      const aurTop = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, 0.01), std(0)); gB.add(aurTop);
      /* 힘 화살표 */
      const cL = arrow(gB, 0xffd34d, 1, 0.1), cR = arrow(gB, 0xffd34d, 1, 0.1); setArrow(cL, 1.4); setArrow(cR, 1.4); cL.rotation.z = -Math.PI / 2; cR.rotation.z = Math.PI / 2; cL.position.set(-XW - 1.6, -1.2, 0); cR.position.set(-0.4 + 0.0, 0, 0); cR.visible = false;
      /* 깊이 판 */
      const dpl = new THREE.Mesh(new THREE.BoxGeometry(XW - 0.5, 0.05, ZD * 2 + 0.3), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4, depthWrite: false })); dpl.position.set(-XW / 2 - 0.2, -1.5, 0); gB.add(dpl);
      const LBs = { dp: label('', [0, 0, 0], { size: 12, color: 'rgba(15,23,42,.92)' }), mt: label('습곡 산맥', [-2.6, 1.15, 0], { size: 12 }), rg: label('광역 변성대 (넓어요 · 엽리)', [-2.6, -3.35, ZD], { size: 12, color: 'rgba(100,60,40,.92)' }), pl: label('마그마(관입)', [2.7, -1.3, ZD], { size: 12, color: 'rgba(150,30,30,.92)' }), ct: label('접촉 변성대 (좁아요)', [2.7, 0.35, ZD], { size: 12, color: 'rgba(100,60,40,.92)' }), hr: label('혼펠스', [2.7, -0.3, ZD], { size: 11.5 }) };
      const l0 = REG.map((r) => label(r[3], [-XW - 0.3, (r[0] + r[1]) / 2, ZD], { size: 12 }));
      let dz = 10 / 12, dKm = 10;
      function setD(km) { dKm = Math.max(0, Math.min(40, km)); dz = Math.min(3.05, dKm / 12); dpl.position.y = -dz; LBs.dp.obj = [-1.5, -dz, ZD + 0.1]; LBs.dp.set('깊이 ' + Math.round(dKm) + ' km · 압력 ' + Math.round(dKm * 27) + ' MPa'); infoB(); }
      function infoB() { info('깊이가 1 km 깊어질 때마다 압력이 약 <b>27 MPa</b>씩 커져요(P = ρgh). 깊을수록 온도와 압력이 커져 <b>변성도가 높아져요</b>.<br>마그마 둘레에는 열 때문에 <b>좁은 접촉 변성대</b>(혼펠스 등)가 생겨요. ▶ 마그마 관입을 눌러 보세요.'); }
      const gB1 = grab(() => ({
        rD: controls.range('깊이', 0, 40, 1, 10, (v) => { setRange('#sDep', v); setD(v); }, (v) => v + ' km'),
        bI: controls.button('▶ 마그마 관입', () => { const l = ctx.lesson(); if (l && l.aurRun) l.aurRun(); }),
      }));
      const rD = gB1.r.rD;
      let view = 'A', lastKey2 = '';
      const gV = grab(() => controls.segment('보기', [{ value: 'A', label: '🔬 열·압력' }, { value: 'B', label: '⛰️ 변동대 단면' }], view, (v) => { const l = ctx.lesson(); if (l && l.setView) { const cur = l.S && l.S.view; if (v === 'A') l.setView('grain'); else if (['aur', 'pt', 'tect', 'map'].indexOf(cur) < 0) l.setView('aur'); } setView(v); }));
      const segV = gV.r; gV.els.forEach((e) => { e.style.display = 'none'; });   // 3D 단계(열과 압력)에서는 알갱이 모형만 봐요: 변동대 단면으로 넘어가는 단추는 숨겨요
      function setView(v) {
        view = v; gA.visible = v === 'A'; gB.visible = v === 'B'; segV.set(v);
        applyCtl();
        if (v === 'A') applyA(); else setD(dKm);
        Object.values(LA).forEach((l) => l.show(v === 'A' && l !== LA.fol && l !== LA.pr && l !== LA.ht)); Object.values(LBs).forEach((l) => l.show(v === 'B')); l0.forEach((l) => l.show(v === 'B'));
        if (v === 'A') applyA();
        ctx.orbit.tx = 0; ctx.orbit.ty = v === 'A' ? 0.2 : -1.2; ctx.orbit.dist = v === 'A' ? (PHONE ? 13 : 9.5) : (PHONE ? 17 : 12.5); ctx.refit(0.3);
      }
      function applyCtl() {
        gA1.els.concat(gA2.els).forEach((e) => (e.style.display = view === 'A' ? '' : 'none')); gB1.els.forEach((e) => (e.style.display = view === 'B' ? '' : 'none'));
      }
      { const S = ctx.lesson() && ctx.lesson().S; if (S && ['aur', 'pt', 'tect', 'map'].indexOf(S.view) >= 0) view = 'B'; }
      setView(view);
      return {
        update(dt, t) {
          const l = ctx.lesson(), S = l && l.S;
          if (S) {
            if (S.view === 'grain' && view !== 'A') setView('A'); else if (['aur', 'pt', 'tect', 'map'].indexOf(S.view) >= 0 && view !== 'B') setView('B');
            if (view === 'A' && S.grain) {
              const G = S.grain, key = [G.T, G.P, G.dir, G.g.toFixed(2), G.a.toFixed(2), G.pS.toFixed(2), G.dv.toFixed(2)].join('|');
              if (key !== lastKey) { lastKey = key; if (+rT.value !== G.T) rT.set(G.T); if (+rP.value !== G.P) rP.set(G.P); sgDir.set(G.dir); applyA(); }
            } else if (view === 'B') {
              if (S.pt && Math.round(S.pt.dep) !== Math.round(dKm)) { rD.set(S.pt.dep); setD(S.pt.dep); }
              if (S.aur) { const A = S.aur, d = A.done; plut.visible = d || A.rise > 0.02; aur1.visible = d || A.spread > 0.25; aur2.visible = d || A.spread > 0.55; }
            }
          }
          plut.material.emissiveIntensity = 0.5 + 0.12 * Math.sin(t * 2);
        },
        sync() {},
      };
    },
  });
})();
