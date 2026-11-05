/* he-peculiar-galaxy · 3D 활동성 은하와 은하 충돌
   [활동성 은하] 중심의 초대질량 블랙홀과 강착 원반, 먼지 토러스, 제트를 입체로 봐요. 보는 각도(제트 축에서 잰 각도 θ)에 따라 토러스가 중심을 가리는지가 달라져
   세이퍼트 1형(넓은 선 보임)·2형(안 보임)·블레이자(제트 정면)로 보여요. 토러스 경계는 2D 실험과 같이 θ = 60°로 했어요.
   '파장' 단추로 전파·적외선·가시광선·X선에서 어떤 부분이 보이는지도 볼 수 있어요.
   [은하 충돌] 두 나선 은하가 중력으로 끌어당기며 합쳐져요(별 대신 점으로 그린 간단한 계산). 2D와 같은 값: 보는 각도 θ(S.ang)·파장(S.band)·충돌 시간(S.t4)을 2D 조작판과 서로 같이 움직여요(3D에서 바꾸면 2D도 바뀌어요).
   은하 충돌은 한 번 계산해 둔 장면을 ▶ 재생으로 앞뒤로 볼 수 있어요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const TA = 60;

  window.SciSim3D.attach({
    title: '활동성 은하·은하 충돌 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    levels: [1],             // 1단계(활동성 은하: 보는 각도와 토러스)만 3D예요. 카드 설명은 오른쪽 조작판에도 나와요. 0 · 2 · 3단계(파장별 모습 · 스펙트럼 · 적외선 그래프)는 2D 화면에서 해요
    camera: { dist: PHONE ? 17 : 12, theta: 0.5, phi: 0.9, min: 4, max: 30 },
    autoRotate: 0,
    build(ctx) {
      if (ctx.THREE.ColorManagement) ctx.THREE.ColorManagement.legacyMode = false;     // 색을 보이는 그대로(sRGB) 쓰도록 맞춰요
      const { THREE, scene, root, label, info, controls, orbit } = ctx;
      { let s = 23; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; }, pos = []; for (let i = 0; i < 400; i++) { const u = r() * 2 - 1, a = r() * 6.283, q = Math.sqrt(1 - u * u); pos.push(Math.cos(a) * q * 55, u * 55, Math.sin(a) * q * 55); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); root.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xaab8e8, size: 1.5, sizeAttenuation: false, transparent: true, opacity: 0.55 }))); }
      scene.traverse((o) => { if (o.isHemisphereLight) o.intensity = 0.55; });
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.9 }, o || {}));
      const glowTex = (a, b) => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, a); gr.addColorStop(0.3, b); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); };
      const gA = new THREE.Group(), gB = new THREE.Group(); root.add(gA, gB);

      /* ================= 활동성 은하 ================= */
      const discTex = (() => { const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'); const gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.2, 'rgba(255,255,235,1)'); gr.addColorStop(0.4, 'rgba(255,200,110,.95)'); gr.addColorStop(0.7, 'rgba(230,100,40,.6)'); gr.addColorStop(1, 'rgba(120,30,10,0)'); g.fillStyle = gr; g.fillRect(0, 0, S, S); for (let i = 0; i < 70; i++) { g.strokeStyle = 'rgba(255,255,255,' + (0.03 + Math.random() * 0.06) + ')'; g.lineWidth = 1 + Math.random() * 2; g.beginPath(); g.arc(S / 2, S / 2, 20 + Math.random() * 105, 0, Math.PI * 2); g.stroke(); } return new THREE.CanvasTexture(c); })();
      const disc = new THREE.Mesh(new THREE.RingGeometry(0.22, 1.25, 96, 1), new THREE.MeshBasicMaterial({ map: discTex, side: THREE.DoubleSide, transparent: true, depthWrite: false })); disc.rotation.x = -Math.PI / 2; gA.add(disc);
      const bh = new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 20), new THREE.MeshBasicMaterial({ color: 0x000000 })); gA.add(bh);
      const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('rgba(255,255,255,1)', 'rgba(255,190,100,.5)'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); core.scale.set(2.8, 2.8, 1); gA.add(core);
      const torusM = std(0x5a3d28, { roughness: 1 }); torusM.clippingPlanes = [];
      const torus = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.85, 36, 72), torusM); torus.rotation.x = Math.PI / 2; torus.scale.z = 1.0; gA.add(torus);
      const jetM = new THREE.MeshBasicMaterial({ color: 0x7fb8ff, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending });
      const jets = [1, -1].map((s) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(s > 0 ? 0.32 : 0.05, s > 0 ? 0.05 : 0.32, 5.4, 24, 1, true), jetM); m.position.y = s * 2.9; gA.add(m); return m; });
      const lobes = [1, -1].map((s) => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), new THREE.MeshBasicMaterial({ color: 0xff7ab0, transparent: true, opacity: 0.26, depthWrite: false })); m.scale.set(1.2, 1.5, 1.2); m.position.y = s * 6.4; gA.add(m); return m; });
      const NK = 14, knots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshBasicMaterial({ color: 0xd8ecff }), NK); gA.add(knots);
      const NB = 70, blr = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffb25a }), NB); gA.add(blr);
      const NN = 60, nlr = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: 0x66e6a8 }), NN); gA.add(nlr);
      let sd = 5; const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
      const bl = []; for (let i = 0; i < NB; i++) { const a = rnd() * 6.283, r = 0.5 + rnd() * 0.5, y = (rnd() - 0.5) * 0.6; bl.push([a, r, y, 0.5 + rnd()]); }
      const nl = []; for (let i = 0; i < NN; i++) { const up = rnd() < 0.5 ? 1 : -1, y = up * (1.8 + rnd() * 2.6), rr = Math.abs(y) * Math.tan(0.62) * Math.sqrt(rnd()) , a = rnd() * 6.283; nl.push([Math.cos(a) * rr, y, Math.sin(a) * rr]); }
      const dm = new THREE.Object3D();
      nl.forEach((p, i) => { dm.position.set(p[0], p[1], p[2]); dm.updateMatrix(); nlr.setMatrixAt(i, dm.matrix); });
      const LA = { bh: label('블랙홀 + 강착 원반', [0, 0, 0], { size: 12 }), to: label('먼지 토러스', [2.6, 0.6, 0], { size: 12 }), jt: label('제트', [0, 3.6, 0.3], { size: 12 }), lo: label('전파 로브', [0, 7.6, 0], { size: 12 }), br: label('넓은 선 영역', [0.9, 0.7, 0.2], { size: 11.5, color: 'rgba(150,80,10,.92)' }), nr: label('좁은 선 영역', [1.2, 3.2, 0], { size: 11.5, color: 'rgba(10,110,70,.92)' }) };

      /* ================= 은하 충돌 (간단한 N체 계산) ================= */
      const NP = 700, pts = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }), NP * 2); gB.add(pts);
      const cA = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), new THREE.MeshBasicMaterial({ color: 0xffe9b0 })), cB = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), new THREE.MeshBasicMaterial({ color: 0xbfd8ff })); gB.add(cA, cB);
      const gA2 = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('rgba(255,240,200,.9)', 'rgba(255,200,120,.35)'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })), gB2 = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('rgba(210,230,255,.9)', 'rgba(150,190,255,.35)'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); gA2.scale.setScalar(2.2); gB2.scale.setScalar(2.2); gB.add(gA2, gB2);
      const GM = 1.0, EPS = 0.12;
      let P = null, CE = null, tt = 0, playC = true;
      function init() {
        P = { x: new Float32Array(NP * 2 * 3), v: new Float32Array(NP * 2 * 3), g: new Uint8Array(NP * 2) };
        CE = [{ p: [-4.2, 0, -0.6], v: [0.5, 0, 0.12] }, { p: [4.2, 0.2, 0.6], v: [-0.5, 0, -0.12] }];
        const tilt = [[0.5, 0.2], [1.9, -0.3]];
        for (let c = 0; c < 2; c++) for (let i = 0; i < NP; i++) {
          const k = c * NP + i, r = 0.35 + 1.7 * Math.sqrt(rnd()), a = rnd() * 6.283, v = Math.sqrt(GM * 0.55 / (r + 0.2));
          let x = Math.cos(a) * r, y = (rnd() - 0.5) * 0.04, z = Math.sin(a) * r, vx = -Math.sin(a) * v, vy = 0, vz = Math.cos(a) * v;
          const [tx, tz] = tilt[c], cx = Math.cos(tx), sx = Math.sin(tx), cz = Math.cos(tz), sz = Math.sin(tz);
          [y, z] = [y * cx - z * sx, y * sx + z * cx]; [vy, vz] = [vy * cx - vz * sx, vy * sx + vz * cx]; [x, y] = [x * cz - y * sz, x * sz + y * cz]; [vx, vy] = [vx * cz - vy * sz, vx * sz + vy * cz];
          P.x.set([x + CE[c].p[0], y + CE[c].p[1], z + CE[c].p[2]], k * 3); P.v.set([vx + CE[c].v[0], vy + CE[c].v[1], vz + CE[c].v[2]], k * 3); P.g[k] = c;
        }
        tt = 0;
      }
      function stepSim(h) {
        const a = CE[0], b = CE[1], dx = b.p[0] - a.p[0], dy = b.p[1] - a.p[1], dz = b.p[2] - a.p[2], d2 = dx * dx + dy * dy + dz * dz + 0.3, id3 = GM * 0.9 / (d2 * Math.sqrt(d2));
        for (let j = 0; j < 3; j++) { const dd = [dx, dy, dz][j]; a.v[j] += dd * id3 * h; b.v[j] -= dd * id3 * h; }
        for (let k = 0; k < NP * 2; k++) {
          const o = k * 3; let ax = 0, ay = 0, az = 0;
          for (let c = 0; c < 2; c++) { const q = CE[c].p, ddx = q[0] - P.x[o], ddy = q[1] - P.x[o + 1], ddz = q[2] - P.x[o + 2], r2 = ddx * ddx + ddy * ddy + ddz * ddz + EPS, f = GM * 0.55 / (r2 * Math.sqrt(r2)); ax += ddx * f; ay += ddy * f; az += ddz * f; }
          P.v[o] += ax * h; P.v[o + 1] += ay * h; P.v[o + 2] += az * h; P.x[o] += P.v[o] * h; P.x[o + 1] += P.v[o + 1] * h; P.x[o + 2] += P.v[o + 2] * h;
        }
        CE.forEach((c) => { for (let j = 0; j < 3; j++) c.p[j] += c.v[j] * h; });
        tt += h;
      }
      const col0 = new THREE.Color(0xffe2a8), col1 = new THREE.Color(0xa9ccff);
      function drawC() { for (let k = 0; k < NP * 2; k++) { dm.position.set(P.x[k * 3], P.x[k * 3 + 1], P.x[k * 3 + 2]); dm.scale.setScalar(1); dm.updateMatrix(); pts.setMatrixAt(k, dm.matrix); pts.setColorAt(k, P.g[k] ? col1 : col0); } pts.instanceMatrix.needsUpdate = true; pts.instanceColor.needsUpdate = true; cA.position.set(...CE[0].p); cB.position.set(...CE[1].p); gA2.position.copy(cA.position); gB2.position.copy(cB.position); }
      init(); drawC();
      /* 충돌 장면을 한 번 계산해 두고(프레임), 시간 슬라이더·▶로 앞뒤로 볼 수 있게 해요 */
      const FR = 160, TMAXC = 38; let SNAP = null;
      function bake() {
        init(); SNAP = []; const per = Math.round(TMAXC / 0.018 / (FR - 1));
        for (let f = 0; f < FR; f++) { SNAP.push({ x: P.x.slice(), a: CE[0].p.slice(), b: CE[1].p.slice() }); for (let k = 0; k < per; k++) stepSim(0.018); }
      }
      function drawSnap(p) {
        if (!SNAP) bake(); const f = clamp(p, 0, 1) * (FR - 1), i = Math.min(FR - 2, Math.floor(f)), u = f - i, A = SNAP[i], B = SNAP[i + 1];
        for (let k = 0; k < NP * 2; k++) { const o = k * 3; dm.position.set(lerp(A.x[o], B.x[o], u), lerp(A.x[o + 1], B.x[o + 1], u), lerp(A.x[o + 2], B.x[o + 2], u)); dm.scale.setScalar(1); dm.updateMatrix(); pts.setMatrixAt(k, dm.matrix); pts.setColorAt(k, P.g[k] ? col1 : col0); }
        pts.instanceMatrix.needsUpdate = true; pts.instanceColor.needsUpdate = true;
        cA.position.set(lerp(A.a[0], B.a[0], u), lerp(A.a[1], B.a[1], u), lerp(A.a[2], B.a[2], u)); cB.position.set(lerp(A.b[0], B.b[0], u), lerp(A.b[1], B.b[1], u), lerp(A.b[2], B.b[2], u)); gA2.position.copy(cA.position); gB2.position.copy(cB.position);
      }
      const LC = { a: label('은하 A', cA, { size: 12, offset: [0, 0.6, 0] }), b: label('은하 B', cB, { size: 12, offset: [0, 0.6, 0] }) };

      /* ================= 조작 ================= */
      let view = 'agn', clipT = false, angLast = null;
      const sim = () => { try { return window.__sim && window.__sim.S; } catch (e) { return null; } };
      const segV = controls.segment('보기', [{ value: 'agn', label: '🕳️ 활동성 은하' }, { value: 'col', label: '💥 은하 충돌' }], view, (v) => setView(v));
      const ctlEl = controls.text('').parentElement; ctlEl.removeChild(ctlEl.lastChild);
      const n0 = ctlEl.children.length;
      [].slice.call(ctlEl.children, 0, n0).forEach((e) => { e.style.display = 'none'; });   // 보기는 단계를 따라가요 (3D 단계 = 은하 충돌): 바꾸는 단추는 숨겨요
      const BANDS = { all: '모두', radio: '전파', ir: '적외선', vis: '가시광선', xray: 'X선' };
      let band = 'all';
      const segB = controls.segment('파장', Object.keys(BANDS).map((k) => ({ value: k, label: BANDS[k] })), band, (v) => { band = v; const l = window.__sim; if (l && l.setBand && v !== 'all') l.setBand(v); applyBand(); txt(); });
      const rA = controls.range('보는 각도 θ', 0, 90, 1, 30, (v) => { orbit.phi = Math.max(0.06, v * Math.PI / 180); const l = window.__sim; if (l && l.setAng) { l.setAng(v); angLast = v; } }, (v) => v + '°');
      const bT = controls.button('토러스 반 자르기', () => { clipT = !clipT; bT.classList.toggle('on', clipT); torusM.clippingPlanes = clipT ? [new THREE.Plane(new THREE.Vector3(0, 0, -1), 0)] : []; torusM.needsUpdate = true; });
      const agnEls = [].slice.call(ctlEl.children, n0); const n1 = ctlEl.children.length;
      let plReady = false, syncing = false;
      const plC = controls.player({
        duration: 16, loop: true, autoplay: false, label: '충돌 재생',
        phases: [[0, '가까워져요'], [0.3, '스치며 뒤틀려요'], [0.65, '합쳐져요']],
        onFrame(p) { if (!plReady || syncing || view !== 'col') return; drawSnap(p); const l = window.__sim; if (l && l.S) { l.S.play = false; l.setT4 && l.setT4(p); l.S.maxT = Math.max(l.S.maxT || 0, p); } },
      });
      const colEls = [].slice.call(ctlEl.children, n1); plC.pause(); plReady = true;
      ctx.renderer.localClippingEnabled = true;
      function applyBand() {
        const a = band === 'all', r = band === 'radio', i = band === 'ir', v = band === 'vis', x = band === 'xray';
        jets.forEach((m) => (m.visible = a || r || x)); lobes.forEach((m) => (m.visible = a || r)); knots.visible = a || r;
        torus.visible = a || i || v; torusM.emissive.setHex(i ? 0xff5a1a : 0x000000); torusM.emissiveIntensity = i ? 0.9 : 0;
        disc.visible = a || v || x; core.visible = a || v || x; blr.visible = a || v; nlr.visible = a || v; bh.visible = true;
        disc.scale.setScalar(x ? 0.55 : 1); core.material.color.setHex(x ? 0x9fd0ff : 0xffffff);
        const on = view === 'agn';   // 은하 충돌 보기에서는 활동성 은하 이름표를 숨겨요
        LA.jt.show(on && (a || r || x)); LA.lo.show(on && (a || r)); LA.to.show(on && (a || i || v)); LA.br.show(on && (a || v)); LA.nr.show(on && (a || v));
      }
      function setView(v) {
        view = v; gA.visible = v === 'agn'; gB.visible = v === 'col'; segV.set(v);
        agnEls.forEach((e) => (e.style.display = v === 'agn' ? '' : 'none')); colEls.forEach((e) => (e.style.display = v === 'col' ? '' : 'none'));
        Object.values(LA).forEach((l) => l.show(v === 'agn')); Object.values(LC).forEach((l) => l.show(v === 'col'));
        if (v === 'col') { orbit.dist = PHONE ? 21 : 15; orbit.phi = 0.95; } else { orbit.dist = PHONE ? 17 : 12; orbit.phi = clamp(rA.value * Math.PI / 180, 0.06, 1.55); }
        applyBand(); txt();
      }
      /* 충돌 시각의 적외선 밝기(별 생성률): 2D 그래프 · 읽음값과 같은 값 */
      function irTxt() {
        try { const L = window.__sim, S = L && L.S, M = L && L.model; if (!S || !M || !M.sfr) return '';
          const n = M.sfr.length, fi = Math.round(clamp(S.t4 || 0, 0, 1) * (n - 1)), ir = M.sfr[fi] / M.sfr[M.peak] * 100;
          return '<br>경과 시간 <b>' + Math.round((S.t4 || 0) * 100) + '%</b> · 적외선 밝기(별 생성률) <b>' + ir.toFixed(1) + '%</b>' + (S.maxT >= 0.98 ? '' : '<br>▶ 충돌 실행으로 끝까지 재생해 보세요.');
        } catch (e) { return ''; }
      }
      let irLast = '';
      function txt() {
        if (view === 'col') { info('두 은하가 중력으로 서로 끌려 <b>가까워지고 뒤틀려요</b>. 긴 꼬리(조석 꼬리)가 생기고 가스가 모여 <b>별이 폭발적으로 생겨요</b>(별 폭발 은하).' + irTxt()); return; }
        const bn = band === 'all' ? '' : '<br><b>' + BANDS[band] + '</b>으로 보면: ' + ({ radio: '제트와 전파 로브가 밝아요.', ir: '먼지 토러스가 따뜻해서 밝아요.', vis: '중심의 원반과 별빛이 보이고, 토러스는 빛을 가려요.', xray: '블랙홀 둘레의 뜨거운 가스(원반)와 제트가 밝아요.' }[band]);
        const th = Math.min(orbit.phi, Math.PI - orbit.phi) * 180 / Math.PI, t = th <= 10 ? '제트가 정면이라 아주 밝은 <b>블레이자</b>로 보여요.' : th <= TA ? '중심이 훤히 보여요 → <b>넓은 방출선</b>이 보이는 <b>세이퍼트 1형</b>.' : '토러스가 중심을 가려요 → <b>넓은 방출선이 안 보이는 2형</b> (좁은 선만 보여요).';
        info('보는 각도 θ = <b>' + Math.round(th) + '°</b><br>' + t + bn);
      }
      try { const S = sim(); if (S && typeof S.ang === 'number') { angLast = S.ang; rA.set(Math.round(S.ang)); orbit.phi = clamp(S.ang * Math.PI / 180, 0.06, 1.55); if (S.view === 'v4') view = 'col'; if (S.view === 'v1' && S.band && BANDS[S.band]) { band = S.band; segB.set(band); } } } catch (e) {}
      setView(view);
      let infoT = 0;
      return {
        update(dt, t) {
          { const S = sim(); if (S) {
            if (S.view === 'v4' && view !== 'col') setView('col'); else if ((S.view === 'v1' || S.view === 'v2' || S.view === 'v3') && view !== 'agn') setView('agn');
            if (S.view === 'v1' && S.band && S.band !== band && BANDS[S.band]) { band = S.band; segB.set(band); applyBand(); txt(); }
          } }
          if (view === 'agn') {
            const S = sim(); if (S && S.ang !== angLast) { angLast = S.ang; rA.set(Math.round(S.ang)); orbit.phi = clamp(S.ang * Math.PI / 180, 0.06, 1.55); }
            else if (S) { const th0 = Math.round(Math.min(orbit.phi, Math.PI - orbit.phi) * 180 / Math.PI); if (th0 !== Math.round(S.ang) && window.__sim.setAng) { window.__sim.setAng(th0); angLast = window.__sim.S.ang; } }
            const th = Math.min(orbit.phi, Math.PI - orbit.phi) * 180 / Math.PI; if (infoT++ % 8 === 0) { txt(); } rA.set(Math.round(th));
            disc.rotation.z += dt * 0.6;
            for (let i = 0; i < NK; i++) { const u = (i / NK + t * 0.12) % 1, s = i % 2 ? 1 : -1; dm.position.set(0, s * (0.3 + u * 5.2), 0); dm.scale.setScalar(1 - u * 0.5); dm.updateMatrix(); knots.setMatrixAt(i, dm.matrix); } knots.instanceMatrix.needsUpdate = true;
            bl.forEach((b, i) => { const a = b[0] + t * b[3] * 1.5; dm.position.set(Math.cos(a) * b[1], b[2], Math.sin(a) * b[1]); dm.scale.setScalar(1); dm.updateMatrix(); blr.setMatrixAt(i, dm.matrix); }); blr.instanceMatrix.needsUpdate = true;
          } else {
            const S = sim(); if (!SNAP) { drawSnap(S && typeof S.t4 === 'number' ? S.t4 : 0); }
            if (S && typeof S.t4 === 'number' && !plC.playing && Math.abs(S.t4 - plC.p) > 0.002) { syncing = true; plC.set(S.t4); syncing = false; drawSnap(S.t4); }
            const it = irTxt(); if (it !== irLast) { irLast = it; txt(); }
          }
        },
        sync() {},
      };
    },
  });
})();
