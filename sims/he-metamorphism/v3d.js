/* he-metamorphism · 3D 변성 작용: 광물 알갱이와 변동대 단면
   [열과 압력] 열을 올리면 알갱이가 커지고, 한쪽 방향으로 센 압력을 주면 납작한 광물이 압력에 수직으로 나란히 늘어서요(엽리).
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
    levels: [0, 2, 3],
    camera: { dist: PHONE ? 13 : 9.5, theta: 0.5, phi: 1.15, min: 4.5, max: 24, target: [0, 0.2, 0] },
    autoRotate: 0.15,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.8, metalness: 0 }, o || {}));
      const gA = new THREE.Group(), gB = new THREE.Group(); root.add(gA, gB);
      const arrow = (parent, col, len, rad) => { const g = new THREE.Group(), m = std(col, { emissive: col, emissiveIntensity: 0.4, roughness: 0.4 }), s = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 1, 12), m), h = new THREE.Mesh(new THREE.ConeGeometry(rad * 2.4, rad * 5, 16), m); g.add(s, h); g.userData = { s, h, rad }; parent.add(g); return g; };
      const setArrow = (g, len) => { const u = g.userData, hh = u.rad * 5, L = Math.max(0.05, len); u.s.scale.set(1, Math.max(0.01, L - hh), 1); u.s.position.y = (L - hh) / 2; u.h.position.y = L - hh / 2; g.visible = len > 0.12; };

      /* ===================== A. 열과 압력 ===================== */
      const N = 260, flakes = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 0.16), std(0xffffff, { roughness: 0.45, metalness: 0.12 }), N); gA.add(flakes);
      const heater = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.16, 5.2), std(0x222a3a, { emissive: 0xff4a1a, emissiveIntensity: 0, roughness: 0.6 })); heater.position.y = -2.0; gA.add(heater);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xaecbff, transparent: true, opacity: 0.07, depthWrite: false })); gA.add(frame);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color: 0xcfe0ff, transparent: true, opacity: 0.6 })); gA.add(edges);
      const aL = arrow(gA, 0xffd34d, 1, 0.1), aR = arrow(gA, 0xffd34d, 1, 0.1); aL.rotation.z = -Math.PI / 2; aR.rotation.z = Math.PI / 2;
      let sd = 21; const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
      const FL = []; for (let i = 0; i < N; i++) { const u = rnd() * 2 - 1, a = rnd() * 6.283, q = Math.sqrt(1 - u * u); FL.push({ p: [rnd() - 0.5, rnd() - 0.5, rnd() - 0.5], r: [Math.cos(a) * q, u, Math.sin(a) * q], s: 0.7 + rnd() * 0.6, k: rnd(), twist: rnd() * 6.283 }); }
      const PALF = [new THREE.Color(0xc9b08a), new THREE.Color(0x8d7660), new THREE.Color(0xe3d6b8), new THREE.Color(0x5b4d44)];
      const LA = { name: label('', [0, 2.3, 0], { size: 13.5, color: 'rgba(15,23,42,.92)' }), fol: label('엽리 (납작한 광물이 나란해요)', [0, -2.4, 0], { size: 12 }), pr: label('압력', [-2.6, 0.2, 0], { size: 12, color: 'rgba(130,90,0,.92)' }), ht: label('열', [0, -2.35, 2.2], { size: 12, color: 'rgba(170,40,10,.92)' }) };
      let T = 30, P = 0;
      const tmpQ = new THREE.Quaternion(), tmpV = new THREE.Vector3(), zA = new THREE.Vector3(0, 0, 1), ex = new THREE.Vector3(1, 0, 0), dm = new THREE.Object3D(), cc = new THREE.Color();
      function rockName(t, p) {
        if (t < 0.18 && p < 0.18) return '셰일 (퇴적암 · 변성 전)';
        if (p < 0.3) return t > 0.55 ? '혼펠스 (엽리 없음)' : '약하게 변한 셰일';
        if (t < 0.38) return '점판암 (얇게 쪼개져요)';
        if (t < 0.6) return '편암 (반짝이는 엽리)';
        return p > 0.55 ? '편마암 (줄무늬)' : '편암';
      }
      function applyA() {
        const t = T / 100, p = P / 100, al = Math.pow(p, 0.75), cw = lerp(3.4, 2.3, p), ch = lerp(3.4, 3.9, p), sz = lerp(0.2, 0.62, t);
        frame.scale.set(cw, ch, 3.4); edges.scale.copy(frame.scale);
        const band = t > 0.62 && p > 0.5;
        for (let i = 0; i < N; i++) {
          const f = FL[i]; tmpV.set(f.r[0] * (1 - al) + al * 1.0, f.r[1] * (1 - al) + al * (f.r[1] * 0.12), f.r[2] * (1 - al) + al * (f.r[2] * 0.12)).normalize();
          tmpQ.setFromUnitVectors(zA, tmpV); dm.quaternion.copy(tmpQ); dm.rotateZ(f.twist * (1 - al * 0.8));
          dm.position.set(f.p[0] * cw * 0.92, f.p[1] * ch * 0.92, f.p[2] * 3.1); dm.scale.setScalar(sz * f.s * (t > 0.7 ? 1 + 0.2 * f.k : 1)); dm.updateMatrix(); flakes.setMatrixAt(i, dm.matrix);
          if (band) cc.copy(((Math.floor((f.p[1] + 0.5) * 7)) % 2) ? PALF[2] : PALF[3]).multiplyScalar(0.9 + f.k * 0.2); else cc.copy(PALF[Math.floor(f.k * 4) % 4]).multiplyScalar(0.85 + f.k * 0.3);
          flakes.setColorAt(i, cc);
        }
        flakes.instanceMatrix.needsUpdate = true; flakes.instanceColor.needsUpdate = true;
        heater.material.emissiveIntensity = t * 1.3; heater.position.y = -ch / 2 - 0.12; LA.ht.obj = [0, -ch / 2 - 0.3, 2.4];
        setArrow(aL, p * 1.6 + 0.0); setArrow(aR, p * 1.6 + 0.0); aL.position.set(-cw / 2 - 0.2 - p * 1.6, 0, 0); aR.position.set(cw / 2 + 0.2 + p * 1.6, 0, 0); LA.pr.obj = [-cw / 2 - 1.2, 0.5, 0]; LA.pr.show(p > 0.15);
        LA.name.set(rockName(t, p)); LA.name.obj = [0, ch / 2 + 0.4, 0]; LA.fol.show(al > 0.5); LA.fol.obj = [0, -ch / 2 - 0.05, 1.8]; LA.ht.show(t > 0.2);
        info('<b>' + rockName(t, p) + '</b><br>' + (t > 0.2 ? '열이 높을수록 알갱이가 <b>커져요</b>. ' : '') + (p > 0.3 ? '한 방향 압력에 <b>수직</b>으로 납작한 광물이 늘어서요.' : '압력이 약하면 알갱이가 제멋대로 놓여 <b>엽리</b>가 없어요.'));
      }
      const rT = controls.range('열(온도)', 0, 100, 5, T, (v) => { T = v; applyA(); }, (v) => v + '%');
      const rP = controls.range('압력', 0, 100, 5, P, (v) => { P = v; applyA(); }, (v) => v + '%');
      const gcEl = rT && controls.text('').parentElement; gcEl.removeChild(gcEl.lastChild);
      const n0 = gcEl.children.length;
      const preset = (t, p) => () => { T = t; P = p; rT.set(t); rP.set(p); applyA(); };
      const bH = controls.button('열만 ↑', preset(90, 0)), bP = controls.button('압력만 ↑', preset(30, 90)), bB = controls.button('열+압력 ↑', preset(85, 90));
      const presetEls = [bH, bP, bB];

      /* ===================== B. 변동대 단면 ===================== */
      const XW = 4.8, ZD = 1.6, YB = -3.1;
      const ext = (poly, mat, z0, d) => { const sh = new THREE.Shape(); poly.forEach((p, i) => (i ? sh.lineTo(p[0], p[1]) : sh.moveTo(p[0], p[1]))); sh.closePath(); const g = new THREE.ExtrudeGeometry(sh, { depth: d == null ? ZD * 2 : d, bevelEnabled: false, curveSegments: 3 }); g.translate(0, 0, z0 == null ? -ZD : z0); const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true; gB.add(m); return m; };
      const hostM = std(0x5d5348), top = [[-XW, 0]], mt = [];
      for (let i = 0; i <= 24; i++) { const x = -XW + 2 * XW * i / 24; top.push([x, 0.0 + (x < 0.2 ? 0.8 * Math.exp(-Math.pow((x + 2.6) / 1.4, 2)) : 0)]); }
      const profile = top.slice(1);
      /* 전체 블록 */
      ext([[-XW, YB]].concat(profile, [[XW, YB]]), hostM);
      /* 광역 변성대: 깊이별 띠 (왼쪽 산맥 아래) */
      const REG = [[-0.35, -1.0, 0x71818f, '점판암'], [-1.0, -1.8, 0x7d9a8c, '천매암'], [-1.8, -2.5, 0xa2765f, '편암'], [-2.5, YB, 0xcbb9a5, '편마암']];
      REG.forEach((r) => { ext([[-XW, r[0]], [-0.4, r[0]], [-0.4, r[1]], [-XW, r[1]]], std(r[2]), -ZD + 0.0, ZD * 2 + 0.02); });
      /* 산맥 + 습곡 줄무늬 (표면) */
      ext([[-XW, 0]].concat(profile.filter((p) => p[0] < 0.2), [[0.2, 0], [0.2, -0.35], [-XW, -0.35]]), std(0x8a8a78), -ZD, ZD * 2 + 0.02);
      /* 심성암체 + 접촉 변성대 (오른쪽) */
      const dome = (cx, cy, rx, ry) => { const a = []; for (let i = 0; i <= 28; i++) { const t = Math.PI * i / 28; a.push([cx + Math.cos(t) * rx, cy - Math.sin(t) * ry + ry * 0]); } return a; };
      const half = (cx, cy, rx, ry) => { const a = []; for (let i = 0; i <= 28; i++) { const t = Math.PI * i / 28; a.push([cx + Math.cos(t) * rx, cy + Math.sin(t) * ry]); } return a; };
      const aur = (rx, ry, col, d) => ext(half(2.7, YB, rx, ry), std(col, { transparent: false }), -ZD + d, ZD * 2 - 2 * d);
      aur(2.2, 3.0, 0x9a7a52, 0.0); aur(1.75, 2.45, 0x6a4b48, 0.02);
      const plut = ext(half(2.7, YB, 1.2, 1.9), std(0xc0443a, { emissive: 0x4a0f0a, emissiveIntensity: 0.55, roughness: 0.6 }), -ZD + 0.04, ZD * 2 - 0.08);
      const aurTop = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, 0.01), std(0)); gB.add(aurTop);
      /* 힘 화살표 */
      const cL = arrow(gB, 0xffd34d, 1, 0.1), cR = arrow(gB, 0xffd34d, 1, 0.1); setArrow(cL, 1.4); setArrow(cR, 1.4); cL.rotation.z = -Math.PI / 2; cR.rotation.z = Math.PI / 2; cL.position.set(-XW - 1.6, -1.2, 0); cR.position.set(-0.4 + 0.0, 0, 0); cR.visible = false;
      /* 깊이 판 */
      const dpl = new THREE.Mesh(new THREE.BoxGeometry(XW - 0.5, 0.05, ZD * 2 + 0.3), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4, depthWrite: false })); dpl.position.set(-XW / 2 - 0.2, -1.5, 0); gB.add(dpl);
      const LBs = { dp: label('', [0, 0, 0], { size: 12, color: 'rgba(15,23,42,.92)' }), mt: label('습곡 산맥', [-2.6, 1.15, 0], { size: 12 }), rg: label('광역 변성대 (넓어요 · 엽리)', [-2.6, -3.35, ZD], { size: 12, color: 'rgba(100,60,40,.92)' }), pl: label('마그마(관입)', [2.7, -1.3, ZD], { size: 12, color: 'rgba(150,30,30,.92)' }), ct: label('접촉 변성대 (좁아요)', [2.7, 0.35, ZD], { size: 12, color: 'rgba(100,60,40,.92)' }), hr: label('혼펠스', [2.7, -0.3, ZD], { size: 11.5 }) };
      const l0 = REG.map((r) => label(r[3], [-XW - 0.3, (r[0] + r[1]) / 2, ZD], { size: 12 }));
      let dz = 1.5;
      function setD(v) { dz = v; dpl.position.y = -v; const km = Math.round(v * 12), Tc = Math.round(20 + 28 * km / 2.2 * 0.9), Pg = (km * 0.0275).toFixed(1); LBs.dp.obj = [-1.5, -v, ZD + 0.1]; LBs.dp.set('깊이 ' + km + ' km · 약 ' + Tc + ' °C · ' + Pg + ' GPa'); infoB(); }
      function infoB() { info('깊이가 깊을수록 온도와 압력이 커져 <b>변성도가 높아져요</b>.<br>마그마 둘레에는 열 때문에 <b>좁은 접촉 변성대</b>(혼펠스 등)가 생겨요.'); }
      const rD = controls.range('깊이', 0, 3, 0.1, dz, (v) => setD(v), (v) => Math.round(v * 12) + ' km');
      const bEls = [].slice.call(gcEl.children, n0 + 3);   // (깊이 슬라이더 이후)
      let view = 'A';
      const segV = controls.segment('보기', [{ value: 'A', label: '🔬 열·압력' }, { value: 'B', label: '⛰️ 변동대 단면' }], view, (v) => setView(v));
      function setView(v) {
        view = v; gA.visible = v === 'A'; gB.visible = v === 'B'; segV.set(v);
        const all = [].slice.call(gcEl.children);
        const idxT = all.findIndex((e) => e.tagName === 'INPUT'), kids = all;
        kids.forEach((e) => { e.dataset.v = ''; });
        applyCtl();
        if (v === 'A') applyA(); else { setD(dz); }
        Object.values(LA).forEach((l) => l.show(v === 'A' && l !== LA.fol && l !== LA.pr && l !== LA.ht)); Object.values(LBs).forEach((l) => l.show(v === 'B')); l0.forEach((l) => l.show(v === 'B'));
        if (v === 'A') applyA();
        ctx.orbit.tx = 0; ctx.orbit.ty = v === 'A' ? 0.2 : -1.2; ctx.orbit.dist = v === 'A' ? (PHONE ? 13 : 9.5) : (PHONE ? 17 : 12.5);
      }
      /* 컨트롤 줄: A용(열·압력·프리셋)과 B용(깊이)를 나눠 보여 줘요 */
      const kidsAll = () => [].slice.call(gcEl.children);
      const ctlA = kidsAll().slice(0, 4 + 3 - 1 + 0);   // (미사용 자리)
      function applyCtl() {
        const k = kidsAll(); // 순서: [열 라벨, 열 input, 압력 라벨, 압력 input, 프리셋3, 깊이 라벨, 깊이 input, 보기 라벨, 보기 3개 ]
        k.forEach((e, i) => { const a = i < 7, b = i === 7 || i === 8; e.style.display = (i >= 9 || (view === 'A' ? a : b)) ? '' : 'none'; });
      }
      try { const S = window.__sim && window.__sim.S; if (S && (S.view === 'tect' || S.view === 'aur' || S.view === 'pt')) view = 'B'; } catch (e) {}
      setView(view);
      return {
        update(dt, t) {
          if (view === 'A') { frame.rotation.y = 0; flakes.rotation.y = 0; }
          plut.material.emissiveIntensity = 0.5 + 0.12 * Math.sin(t * 2);
        },
        sync() {},
      };
    },
  });
})();
