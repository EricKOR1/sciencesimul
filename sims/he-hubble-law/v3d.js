/* he-hubble-law · 3D 팽창하는 우주와 허블-르메트르 법칙
   은하들이 서로 멀어져요. 어느 은하에서 보아도 먼 은하일수록 더 빨리 멀어져요(v = H₀d). 그래서 우주에는 '중심'이 없어요.
   '관측자 바꾸기'로 다른 은하의 입장에서 보고, '시간을 거꾸로' 돌리면 모든 은하가 한 점으로 모여요(빅뱅). 이때 걸린 시간이 우주의 나이(≈ 1/H₀)예요.
   1단계(적색 편이: 파장 늘어남 · K선 이동)와 2단계(관측자에서 본 은하 8개의 거리 · 후퇴 속도)도 2D와 같은 값으로 보여 줘요.
   2D와 같은 값: 허블 상수(S.H4)·시간 되감기(S.rew)·관측하는 은하(S.obs)를 서로 같이 움직여요(3D에서 바꾸면 2D도 바뀌어요). ▶ 되감기는 2D의 '시간 되감기' 슬라이더와 같아요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  window.SciSim3D.attach({
    title: '팽창하는 우주 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    levels: [3],             // 0~2단계(K선 재기 · 거리-속도 점 찍기 · 그림으로 낸 계산 문제)는 2D 화면에서 해요
    camera: { dist: PHONE ? 14 : 10.5, theta: 0.5, phi: 1.1, min: 4, max: 24 },
    autoRotate: 0,
    build(ctx) {
      if (ctx.THREE.ColorManagement) ctx.THREE.ColorManagement.legacyMode = false;     // 색을 보이는 그대로(sRGB) 쓰도록 맞춰요
      const { THREE, root, label, info, controls } = ctx;
      /* ---- 장면 꾸미기 도우미: 나무 · 암석 무늬, 하늘 · 우주 배경, 빛 번짐 (모양만 꾸며요) ---- */
      const FX = (() => {
        const scn = ctx.scene; let sd = 7; const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
        const mk = (w, h, draw, rep) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (rep) t.repeat.set(rep[0], rep[1]); if ('encoding' in t) t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t; };
        const wood = (rep) => mk(256, 256, (g, w, h) => { g.fillStyle = '#b98a58'; g.fillRect(0, 0, w, h); for (let i = 0; i < 80; i++) { const y = rnd() * h; g.strokeStyle = 'rgba(' + (70 + rnd() * 40 | 0) + ',38,12,' + (0.07 + rnd() * 0.15) + ')'; g.lineWidth = 0.6 + rnd() * 2.2; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x * 0.03 + i) * 3 * rnd()); g.stroke(); } g.fillStyle = 'rgba(60,30,10,.18)'; for (let k = 1; k < 4; k++) g.fillRect(0, k * 64, w, 2); }, rep);
        const grain = (rep, amt) => mk(128, 128, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); for (let i = 0; i < 1100; i++) { const v = 150 + rnd() * 80 | 0; g.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',' + (amt || 0.35) + ')'; g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 3, 1 + rnd() * 2.2); } }, rep);
        const dome = (top, mid, bot, stars) => {
          const t = mk(8, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, top); gr.addColorStop(0.5, mid); gr.addColorStop(1, bot); g.fillStyle = gr; g.fillRect(0, 0, w, h); }); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
          const m = new THREE.Mesh(new THREE.SphereGeometry(90, 32, 16), new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, depthWrite: false })); m.renderOrder = -10; m.raycast = () => {}; scn.add(m);
          if (stars) { const pos = []; for (let i = 0; i < stars; i++) { const u = rnd() * 2 - 1, a = rnd() * 6.283, q = Math.sqrt(1 - u * u); pos.push(Math.cos(a) * q * 85, u * 85, Math.sin(a) * q * 85); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); const p = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xcfdcff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.8, depthWrite: false })); p.renderOrder = -9; p.raycast = () => {}; m.add(p); }
          return m;
        };
        const glowTex = (rgb) => mk(128, 128, (g, w, h) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(' + rgb + ',1)'); gr.addColorStop(0.35, 'rgba(' + rgb + ',.35)'); gr.addColorStop(1, 'rgba(' + rgb + ',0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
        const glow = (rgb, size, op) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(rgb), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: op == null ? 0.8 : op })); s.scale.setScalar(size); s.raycast = () => {}; return s; };
        const spiral = (rgb) => mk(256, 256, (g, w, h) => { g.clearRect(0, 0, w, h); const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, 'rgba(255,248,230,1)'); gr.addColorStop(0.12, 'rgba(' + rgb + ',.75)'); gr.addColorStop(0.5, 'rgba(' + rgb + ',.2)'); gr.addColorStop(1, 'rgba(' + rgb + ',0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); for (let arm = 0; arm < 2; arm++) for (let i = 0; i < 260; i++) { const f = i / 260, a = f * 5.2 + arm * Math.PI, r = 14 + f * 108, x = 128 + Math.cos(a) * r + (rnd() - 0.5) * 12 * f, y = 128 + Math.sin(a) * r + (rnd() - 0.5) * 12 * f; g.fillStyle = 'rgba(255,255,255,' + (0.5 * (1 - f) + 0.06) + ')'; g.beginPath(); g.arc(x, y, 1 + rnd() * 2.4 * (1 - f * 0.5), 0, 6.283); g.fill(); } });
        return { rnd, mk, wood, grain, dome, glow, glowTex, spiral };
      })();
      { let s = 17; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; }, pos = []; for (let i = 0; i < 380; i++) { const u = r() * 2 - 1, a = r() * 6.283, q = Math.sqrt(1 - u * u); pos.push(Math.cos(a) * q * 50, u * 50, Math.sin(a) * q * 50); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); root.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0x9fb0e0, size: 1.4, sizeAttenuation: false, transparent: true, opacity: 0.5 }))); }
      FX.dome('#03050f', '#0a1030', '#131d46', 700);
      const discTex = FX.spiral('140,185,255'), discM = new THREE.MeshBasicMaterial({ map: discTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), discGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
      const space = new THREE.Group(); root.add(space);                    // 관측자가 원점에 오도록 이동시키는 묶음
      const NG = 230, gal = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshBasicMaterial({ color: 0xffffff }), NG); space.add(gal);
      const galD = new THREE.InstancedMesh(discGeo, discM, NG); galD.frustumCulled = false; space.add(galD);
      const lattice = (() => { const pts = [], R0 = 4.5, st = 1.5; for (let a = -R0; a <= R0 + 0.01; a += st) for (let b = -R0; b <= R0 + 0.01; b += st) { pts.push(-R0, a, b, R0, a, b, a, -R0, b, a, R0, b, a, b, -R0, a, b, R0); } const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); const ls = new THREE.LineSegments(gg, new THREE.LineBasicMaterial({ color: 0x6f8fe8, transparent: true, opacity: 0.13, depthWrite: false })); ls.raycast = () => {}; space.add(ls); return ls; })();
      let sd = 11; const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
      const G = []; for (let i = 0; i < NG; i++) { const u = rnd() * 2 - 1, a = rnd() * 6.283, q = Math.sqrt(1 - u * u), r = 4.3 * Math.cbrt(rnd()); G.push({ p: [Math.cos(a) * q * r, u * r * 0.9, Math.sin(a) * q * r], s: 0.075 + rnd() * 0.07, k: rnd() }); }
      const cc = new THREE.Color(); G.forEach((g, i) => { cc.setHSL(g.k < 0.55 ? 0.6 + (g.k - 0.3) * 0.1 : 0.1 + g.k * 0.05, 0.55, 0.5 + g.k * 0.18); gal.setColorAt(i, cc); galD.setColorAt(i, cc.clone().lerp(new THREE.Color(0xffffff), 0.25)); });
      /* 관측자 은하 후보 (가까운 순 정렬은 매번) */
      const CAND = [3, 40, 91, 140, 190].map((i) => i);
      let obs = 0;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.03, 8, 40), new THREE.MeshBasicMaterial({ color: 0xffd34d })); space.add(ring);
      const NA = 8, arrows = []; for (let i = 0; i < NA; i++) { const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: 0xff8a4a, emissive: 0xff5a1a, emissiveIntensity: 0.5, roughness: 0.5 }), s = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1, 8), m), h = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 12), m); g.add(s, h); g.userData = { s, h }; space.add(g); arrows.push(g); }
      const bang = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,200,120,.6)'); gr.addColorStop(1, 'rgba(255,150,60,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); })(); space.add(bang);
      const LB = { me: label('관측하는 은하', ring, { size: 12.5, offset: [0, 0.45, 0], color: 'rgba(130,90,0,.92)' }), near: label('가까운 은하: 느리게 멀어져요', [0, 0, 0], { size: 11.5 }), far: label('먼 은하: 빠르게 멀어져요', [0, 0, 0], { size: 11.5 }), bg: label('한 점에서 시작 (빅뱅)', bang, { size: 12.5, offset: [0, 0.6, 0] }) };
      let r = 0, H = 70, showA = true, AGE = 140;
      const sim = () => { try { return window.__sim; } catch (e) { return null; } };
      const s0 = sim(); let lastRD = null, lastH = null;
      if (s0 && s0.S) { H = s0.S.H4 || 70; lastH = s0.S.H4; r = clamp(s0.S.rewD || 0, 0, 1); lastRD = s0.S.rewD; AGE = (s0.AGE && s0.AGE[H]) || 9778 / H; }
      let ready = false, syncing = false;
      const plR = controls.player({
        duration: 9, loop: true, autoplay: false, label: '되감기',
        phases: [[0, '지금'], [0.15, '되감는 중'], [0.93, '한 점 (우주의 시작)']],
        onFrame(p) { if (!ready) return; r = p; if (syncing) return; const l = sim(); if (l && l.setRew) l.setRew(p); },
      });
      controls.button('🔭 관측자 바꾸기', () => { const l = sim(); if (l && l.setObs && l.S) { l.setObs((l.S.obs + 1) % l.QG.length); } else obs = (obs + 1) % CAND.length; });
      const bA = controls.button('속도 화살표 ✓', () => { showA = !showA; bA.classList.toggle('on', showA); bA.textContent = '속도 화살표 ' + (showA ? '✓' : '✕'); }); bA.classList.add('on');
      const dm = new THREE.Object3D(), V = (i, a) => new THREE.Vector3(G[i].p[0] * a, G[i].p[1] * a, G[i].p[2] * a), up = new THREE.Vector3(0, 1, 0);
      let near = [], infoT = 0;
      function frame() {
        const a = clamp(1 - r, 0.0, 1), o = V(CAND[obs], a);
        space.position.copy(o).multiplyScalar(-1);
        for (let i = 0; i < NG; i++) { dm.position.set(G[i].p[0] * a, G[i].p[1] * a, G[i].p[2] * a); const sc = G[i].s * 0.62 * (i === CAND[obs] ? 1.8 : 1) * (0.6 + 0.4 * a); dm.scale.set(sc * 1.5, sc * 0.5, sc * 1.5); dm.rotation.set(0.5 + (i % 5) * 0.25, i, (i % 3) * 0.4); dm.updateMatrix(); gal.setMatrixAt(i, dm.matrix); const sd2 = sc * 6.5; dm.scale.set(sd2, sd2, sd2); dm.updateMatrix(); galD.setMatrixAt(i, dm.matrix); }
        gal.instanceMatrix.needsUpdate = true; galD.instanceMatrix.needsUpdate = true; lattice.scale.setScalar(Math.max(0.001, a)); ring.position.copy(o); ring.lookAt(o.x, o.y + 1, o.z); ring.rotation.x = Math.PI / 2;
        /* 가까운 은하 8개를 골라 화살표: 길이 ∝ 거리 (v = H d) */
        const ds = []; for (let i = 0; i < NG; i++) { if (i === CAND[obs]) continue; const p = V(i, a), d = p.distanceTo(o); ds.push([d, i, p]); } ds.sort((x, y) => x[0] - y[0]);
        const pick = [ds[1], ds[3], ds[6], ds[10], ds[18], ds[28], ds[45], ds[70]]; near = pick;
        arrows.forEach((g, k) => { const d = pick[k], dir = d[2].clone().sub(o), L = dir.length(); g.visible = showA && L > 0.05 && a > 0.12; if (!g.visible) return; const len = Math.max(0.15, L * 0.55); g.position.copy(d[2]); dir.normalize(); g.quaternion.setFromUnitVectors(up, dir); g.userData.s.scale.set(1, len, 1); g.userData.s.position.y = len / 2; g.userData.h.position.y = len + 0.1; });
        LB.near.obj = pick[0][2].clone().add(space.position).toArray(); LB.far.obj = pick[7][2].clone().add(space.position).toArray(); LB.near.off = [0, 0.5, 0]; LB.far.off = [0, 0.5, 0];
        LB.near.show(showA && a > 0.3); LB.far.show(showA && a > 0.3);
        bang.position.set(0, 0, 0).sub(space.position.clone().multiplyScalar(0)); bang.position.copy(o).multiplyScalar(0); bang.position.set(0, 0, 0); bang.scale.setScalar(0.6 + 5 * Math.max(0, (r - 0.8) / 0.2) ** 1.5); bang.visible = r > 0.8;
        LB.bg.show(r > 0.93); LB.bg.obj = bang;
        if (infoT++ % 6 === 0) info(r > 0.93 ? '모든 은하가 <b>한 점</b>으로 모여요 → 이때가 <b>우주의 시작</b>이에요.<br>H₀ = ' + H + ' km/s/Mpc → 나이 ≈ <b>' + Math.round(AGE) + '억 년</b> (≈ 1/H₀)' : '화살표가 길수록 <b>더 빨리</b> 멀어져요 (v = H₀d).<br>어느 은하에서 봐도 똑같아서 <b>우주의 중심은 없어요</b>.' + (r > 0 ? '<br>시간을 거꾸로 돌리는 중: ' + Math.round(AGE * r) + '억 년 전 · 우주가 ' + Math.round((1 - r) * 100) + '% 크기예요.' : ''));
      }

      /* ================= 1단계 적색 편이(v1) · 2단계 거리와 후퇴 속도(v2): 2D와 같은 값으로 보여 줘요 ================= */
      const gU = new THREE.Group(); while (root.children.length) gU.add(root.children[0]); root.add(gU);
      const gR = new THREE.Group(), gD = new THREE.Group(); root.add(gR, gD); gR.visible = gD.visible = false;
      const probe = controls.text(''); probe.style.display = 'none'; const ctlEl = probe.parentElement;
      const uEls = Array.prototype.filter.call(ctlEl.children, (e) => e !== probe);
      const grab = (fn) => { const n0 = ctlEl.children.length; const r2 = fn(); return { r: r2, els: Array.prototype.slice.call(ctlEl.children, n0) }; };
      const shw = (g2, on) => g2.els.forEach((e) => { e.style.display = on ? '' : 'none'; });
      const BM2 = (c, o) => new THREE.MeshBasicMaterial(Object.assign({ color: c }, o || {}));
      const SMT = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5 }, o || {}));
      const L0 = 393.4, LLO = 385, LHI = 420, SPW = 11;
      /* --- v1: 멀어지는 광원의 빛은 파장이 길어지고(적색 편이) K선이 오른쪽으로 옮겨 가요 --- */
      const NW = 110, waveS = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 8, 6), BM2(0x60a5fa), NW), waveR = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 8, 6), BM2(0xf87171), NW); waveS.frustumCulled = waveR.frustumCulled = false; gR.add(waveS, waveR);
      const eyeS = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 14), SMT(0xf1f5f9)), eyeR = eyeS.clone(); eyeS.visible = eyeR.visible = false; gR.add(eyeS, eyeR);
      const teleM = SMT(0xe8edf4, { roughness: 0.3, metalness: 0.5 }), teleD = SMT(0x334155, { roughness: 0.4, metalness: 0.6 });
      const tele = () => { const g = new THREE.Group(), tb = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 1.3, 24), teleM); tb.rotation.z = Math.PI / 2; g.add(tb);
        const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.3, 0.3, 24, 1, true), teleD); hood.rotation.z = Math.PI / 2; hood.position.x = 0.72; hood.material.side = THREE.DoubleSide; g.add(hood);
        const lens = new THREE.Mesh(new THREE.CircleGeometry(0.28, 24), new THREE.MeshStandardMaterial({ color: 0x7aa7ff, roughness: 0.05, metalness: 0.3, emissive: 0x2a4a9a, emissiveIntensity: 0.5 })); lens.rotation.y = Math.PI / 2; lens.position.x = 0.62; g.add(lens);
        const ep = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.4, 14), teleD); ep.rotation.z = Math.PI / 2; ep.position.x = -0.85; g.add(ep);
        const fd = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.2), teleD); fd.position.set(-0.4, 0.34, 0); g.add(fd);
        const mt = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.6, 10), teleD); mt.position.set(0, -0.45, 0); g.add(mt);
        [0, 2.094, 4.188].forEach((a) => { const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 8), teleD); lg.position.set(Math.cos(a) * 0.2, -0.95, Math.sin(a) * 0.2); lg.rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35); g.add(lg); });
        gR.add(g); return g; };
      const teleS = tele(), teleR = tele(); teleS.position.set(-5.2, 1.2, 0); teleR.position.set(-5.2, -0.95, 0);
      const srcS = new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 14), BM2(0xbfdbfe)), srcR = new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 14), BM2(0xfecaca)); gR.add(srcS, srcR);
      srcS.add(FX.glow('120,170,255', 3.4, 0.85)); srcR.add(FX.glow('255,120,110', 3.4, 0.85));
      const recA = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.7, 16), SMT(0xfbbf24, { emissive: 0xfbbf24, emissiveIntensity: 0.6 })); recA.rotation.z = -Math.PI / 2; gR.add(recA);
      const spCv = document.createElement('canvas'); spCv.width = 256; spCv.height = 8; { const c2 = spCv.getContext('2d'), gr = c2.createLinearGradient(0, 0, 256, 0); gr.addColorStop(0, '#6d28d9'); gr.addColorStop(1, '#7c3aed'); c2.fillStyle = gr; c2.fillRect(0, 0, 256, 8); }
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(SPW, 1.3), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(spCv) })); strip.position.set(0, -2.6, 0); gR.add(strip);
      { const bk = new THREE.Mesh(new THREE.BoxGeometry(SPW + 0.3, 1.6, 0.1), SMT(0x1e293b, { roughness: 0.4, metalness: 0.6 })); bk.position.set(0, -2.6, -0.08); gR.add(bk); }
      const lamX = (l) => -SPW / 2 + SPW * (l - LLO) / (LHI - LLO);
      const lnRest = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.3, 0.05), BM2(0xffffff)), lnObs = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.3, 0.05), BM2(0x111827)), lnCur = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.7, 0.05), BM2(0xfde047));
      lnRest.position.set(lamX(L0), -2.6, 0.03); lnObs.position.z = 0.04; lnCur.position.z = 0.05; gR.add(lnRest, lnObs, lnCur);
      const shiftA = new THREE.Mesh(new THREE.BoxGeometry(1, 0.06, 0.06), BM2(0xfbbf24)); gR.add(shiftA);
      const lR1 = label('정지한 광원: 파장 λ₀', [-5.2, 1.7, 0], { color: 'rgba(30,64,175,.92)' }), lR2 = label('멀어지는 광원: 파장이 더 길어요 (그림은 과장)', [-1.5, -0.35, 0], { color: 'rgba(185,28,28,.92)' }), lSpR = label('정지했을 때의 K선', [lamX(L0), -1.55, 0], { color: 'rgba(30,41,59,.9)' }), lSpO = label('이 은하의 K선', [0, -3.6, 0], { color: 'rgba(30,41,59,.9)' }), lSpC = label('내가 놓은 선', [0, -3.6, 0], { color: 'rgba(120,80,0,.92)' }), lSpT = label('Ca II K선 (보라색 영역의 어두운 선)', [0, -1.6, 0], { color: 'rgba(30,41,59,.88)' });
      [lR1, lR2, lSpR, lSpO, lSpC, lSpT].forEach((l) => l.show(false));
      const Mw = new THREE.Matrix4(), Pw = new THREE.Vector3(), Qw = new THREE.Quaternion(), Sw = new THREE.Vector3(1, 1, 1);
      function updRed(w, t) {
        const g = w.GAL3[w.S.gi], zv = 0.22 + 3.6 * g.z, lam1 = 1.0, lam2 = lam1 * (1 + zv), x0 = -5.2, x1 = 4.4;
        [[waveS, 1.2, lam1], [waveR, -0.95, lam2]].forEach(([m, y, lam]) => { for (let i = 0; i < NW; i++) { const x = x0 + 0.6 + (x1 - x0 - 1.4) * i / (NW - 1); Pw.set(x, y + 0.32 * Math.sin(Math.PI * 2 * (x / lam + t * 0.7)), 0); Mw.compose(Pw, Qw, Sw); m.setMatrixAt(i, Mw); } m.instanceMatrix.needsUpdate = true; });
        eyeS.position.set(x0, 1.2, 0); eyeR.position.set(x0, -0.95, 0); srcS.position.set(x1, 1.2, 0); srcR.position.set(x1 + 0.25 * Math.sin(t * 1.5), -0.95, 0); recA.position.set(x1 + 1.3, -0.95, 0);
        lnObs.position.set(lamX(g.lam), -2.6, 0.04); lnCur.position.set(lamX(w.S.lamC), -2.6, 0.05);
        const dx = lamX(g.lam) - lamX(L0); shiftA.visible = dx > 0.05; if (shiftA.visible) { shiftA.scale.set(dx, 1, 1); shiftA.position.set(lamX(L0) + dx / 2, -3.35, 0); }
        lR1.show(true); lR2.show(true); lSpR.show(true); lSpO.show(true); lSpO.obj = [lamX(g.lam), -3.9, 0]; lSpC.show(true); lSpC.obj = [lamX(w.S.lamC) + 0.2, -1.55 - 0.35, 0]; lSpT.show(true); lSpT.obj = [3.2, -1.7, 0];
        gSel.r.set(w.S.gi); cur.r.set(w.S.lamC);
        return '<b>멀어지는 광원의 빛은 파장이 길어져요</b> (적색 편이)<br>' + g.nm + '의 K선이 정지했을 때의 위치(흰 선)보다 오른쪽(붉은 쪽)으로 옮겨 갔어요.<br>옮겨 간 만큼(Δλ)이 클수록 더 빨리 멀어져요.<br><span style="color:#9fb0d4">노란 선을 K선에 맞춘 뒤 z · v 계산과 기록은 ▦ 2D에서 해요.</span>';
      }
      const gSel = grab(() => controls.segment('은하', [0, 1, 2].map((i) => ({ value: i, label: '은하 ' + (i + 1) })), 0, (v) => { const w = window.__sim; if (w && w.setGal) w.setGal(v); }));
      const cur = grab(() => controls.range('내 선의 파장', LLO, LHI, 0.1, 400, (v) => { const w = window.__sim; if (w && w.setLamC) w.setLamC(v); }, (v) => v.toFixed(1) + ' nm'));
      /* --- v2: 거리와 후퇴 속도 --- */
      const DK = 0.027, VK = 0.00016;
      const dObs = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 14), SMT(0x60a5fa, { emissive: 0x2563eb, emissiveIntensity: 0.5 })); gD.add(dObs);
      const dGal = [], dArr = [];
      [1, 2, 3].forEach((k) => { const rg = new THREE.Mesh(new THREE.TorusGeometry(2.7 * k, 0.012, 6, 120), new THREE.MeshBasicMaterial({ color: 0x7aa7ff, transparent: true, opacity: 0.35, depthWrite: false })); rg.rotation.x = Math.PI / 2; gD.add(rg); });
      { const od = new THREE.Mesh(discGeo, discM); od.scale.setScalar(1.8); gD.add(od); }
      for (let i = 0; i < 8; i++) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), SMT(0xe2e8f0, { emissive: 0x334155, emissiveIntensity: 0.4 })); { const dd = new THREE.Mesh(discGeo, discM); dd.scale.setScalar(9); dd.rotation.y = i * 1.1; m.add(dd); } gD.add(m); dGal.push(m);
        const a = new THREE.Group(), mm = SMT(0xff8a4a, { emissive: 0xff5a1a, emissiveIntensity: 0.5 }); a.add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1, 8), mm), new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 12), mm)); gD.add(a); dArr.push(a);
      }
      const DIRS = [[0.9, 0.3, 0.2], [-0.8, 0.5, 0.3], [0.5, -0.7, 0.5], [-0.6, -0.5, 0.6], [0.2, 0.9, -0.4], [-0.9, 0.1, -0.4], [0.7, -0.4, -0.6], [-0.3, 0.6, 0.7]].map((d) => new THREE.Vector3(...d).normalize());
      const dLab = DIRS.map((d, i) => { const l = label('', [0, 0, 0], { color: 'rgba(30,41,59,.9)', size: 12 }); l.show(false); return l; });
      const lOb = label('우리 은하 (관측자)', [0, 0.6, 0], { color: 'rgba(30,64,175,.92)' }); lOb.show(false);
      function updDist(w, t) {
        const DV = w.DV, S = w.S, hubble = 70;
        DV.forEach((q, i) => {
          const p = DIRS[i].clone().multiplyScalar(q.d * DK), m = dGal[i], placed = S.placed[i] && S.placed[i].on, sel = S.pk === i;
          m.position.copy(p); m.scale.setScalar(0.16 + 0.04 * (sel ? 1 : 0)); m.material.color.setHex(placed ? 0x4ade80 : sel ? 0xfde047 : 0xe2e8f0); m.material.emissive.setHex(placed ? 0x15803d : sel ? 0xa16207 : 0x334155);
          const L = Math.max(0.2, q.v * VK * 0.75), dir = DIRS[i], a = dArr[i], base = p.clone().addScaledVector(dir, 0.3);
          a.position.copy(base).addScaledVector(dir, L / 2); a.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); a.children[0].scale.set(1, L, 1); a.children[1].position.y = L / 2 + 0.15;
          dLab[i].show(true); dLab[i].obj = p.clone().addScaledVector(dir, -0.45).toArray(); dLab[i].set(q.k + ' · ' + q.d + ' Mpc');
        });
        lOb.show(true);
        const n = S.placed.filter((q) => q && q.on).length;
        return '<b>관측자에서 본 은하 8개</b> (A~H)<br>먼 은하일수록 화살표(후퇴 속도)가 길어요 → 거리와 속도는 비례해요.<br>그래프에 찍은 점 ' + n + ' / 8 (초록 = 찍은 은하)<br><span style="color:#9fb0d4">점을 찍고 직선을 그리는 일은 ▦ 2D에서 해요.</span>';
      }
      let scnU = '', lastU = '';
      function applyU(v) {
        if (v === scnU) return; scnU = v; lastU = '';
        const r1 = v === 'v1', d2 = v === 'v2'; gU.visible = !(r1 || d2); gR.visible = r1; gD.visible = d2;
        uEls.forEach((e) => { e.style.display = r1 || d2 ? 'none' : ''; }); shw(gSel, r1); shw(cur, r1);
        if (r1 || d2) Object.keys(LB).forEach((k) => LB[k].show(false));
        if (!r1) [lR1, lR2, lSpR, lSpO, lSpC, lSpT].forEach((l) => l.show(false)); if (!d2) { dLab.forEach((l) => l.show(false)); lOb.show(false); }
        const o = ctx.orbit; if (r1) { o.theta = 0; o.phi = Math.PI / 2; o.tx = 0; o.ty = PHONE ? 0.2 : -0.6; o.tz = 0; o.dist = PHONE ? 25 : 14; } else if (d2) { o.theta = 0.4; o.phi = 1.15; o.tx = 0; o.ty = 0; o.tz = 0; o.dist = PHONE ? 26 : 18; } else { o.theta = 0.5; o.phi = 1.1; o.tx = 0; o.ty = 0; o.tz = 0; o.dist = PHONE ? 14 : 10.5; }
      }
      plR.pause(); ready = true; syncing = true; plR.set(r); syncing = false;
      frame();
      return {
        update(dt, t) {
          const S = sim() && sim().S, vwU = S ? S.view : 'v3';
          applyU(vwU === 'v1' || vwU === 'v2' ? vwU : 'main');
          if (vwU === 'v1' || vwU === 'v2') {
            const h = vwU === 'v1' ? updRed(sim(), t) : updDist(sim(), t);
            if (h !== lastU) { lastU = h; info(h); }
            ctx.orbit.theta = vwU === 'v1' ? 0 : ctx.orbit.theta; return;
          }
          if (S) { if (S.obs != null) obs = S.obs % CAND.length; if (S.H4 !== lastH) { lastH = S.H4; H = S.H4; AGE = (sim().AGE && sim().AGE[H]) || 9778 / H; } if (S.rewD !== lastRD) { lastRD = S.rewD; r = clamp(S.rewD, 0, 1); if (!plR.playing) { syncing = true; plR.set(r); syncing = false; } } }
          frame();
        },
        sync() {},
      };
    },
  });
})();
