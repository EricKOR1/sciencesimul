/* he-hubble-law · 3D 팽창하는 우주와 허블-르메트르 법칙
   은하들이 서로 멀어져요. 어느 은하에서 보아도 먼 은하일수록 더 빨리 멀어져요(v = H₀d). 그래서 우주에는 '중심'이 없어요.
   '관측자 바꾸기'로 다른 은하의 입장에서 보고, '시간을 거꾸로' 돌리면 모든 은하가 한 점으로 모여요(빅뱅). 이때 걸린 시간이 우주의 나이(≈ 1/H₀)예요.
   2D와 같은 값: 허블 상수(S.H4)·시간 되감기(S.rew)·관측하는 은하(S.obs)를 서로 같이 움직여요(3D에서 바꾸면 2D도 바뀌어요). ▶ 되감기는 2D의 '시간 되감기' 슬라이더와 같아요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  window.SciSim3D.attach({
    title: '팽창하는 우주 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    levels: [2, 3],          // 0~1단계(적색 편이·거리-속도 점 찍기)는 2D 화면에서 해요
    camera: { dist: PHONE ? 14 : 10.5, theta: 0.5, phi: 1.1, min: 4, max: 24 },
    autoRotate: 0,
    build(ctx) {
      if (ctx.THREE.ColorManagement) ctx.THREE.ColorManagement.legacyMode = false;     // 색을 보이는 그대로(sRGB) 쓰도록 맞춰요
      const { THREE, root, label, info, controls } = ctx;
      { let s = 17; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; }, pos = []; for (let i = 0; i < 380; i++) { const u = r() * 2 - 1, a = r() * 6.283, q = Math.sqrt(1 - u * u); pos.push(Math.cos(a) * q * 50, u * 50, Math.sin(a) * q * 50); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); root.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0x9fb0e0, size: 1.4, sizeAttenuation: false, transparent: true, opacity: 0.5 }))); }
      const space = new THREE.Group(); root.add(space);                    // 관측자가 원점에 오도록 이동시키는 묶음
      const NG = 230, gal = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshBasicMaterial({ color: 0xffffff }), NG); space.add(gal);
      let sd = 11; const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
      const G = []; for (let i = 0; i < NG; i++) { const u = rnd() * 2 - 1, a = rnd() * 6.283, q = Math.sqrt(1 - u * u), r = 4.3 * Math.cbrt(rnd()); G.push({ p: [Math.cos(a) * q * r, u * r * 0.9, Math.sin(a) * q * r], s: 0.075 + rnd() * 0.07, k: rnd() }); }
      const cc = new THREE.Color(); G.forEach((g, i) => { cc.setHSL(g.k < 0.55 ? 0.6 + (g.k - 0.3) * 0.1 : 0.1 + g.k * 0.05, 0.55, 0.5 + g.k * 0.18); gal.setColorAt(i, cc); });
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
        for (let i = 0; i < NG; i++) { dm.position.set(G[i].p[0] * a, G[i].p[1] * a, G[i].p[2] * a); const sc = G[i].s * 0.62 * (i === CAND[obs] ? 1.8 : 1) * (0.6 + 0.4 * a); dm.scale.set(sc * 1.5, sc * 0.5, sc * 1.5); dm.rotation.set(0.5 + (i % 5) * 0.25, i, (i % 3) * 0.4); dm.updateMatrix(); gal.setMatrixAt(i, dm.matrix); }
        gal.instanceMatrix.needsUpdate = true; ring.position.copy(o); ring.lookAt(o.x, o.y + 1, o.z); ring.rotation.x = Math.PI / 2;
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
      plR.pause(); ready = true; syncing = true; plR.set(r); syncing = false;
      frame();
      return {
        update(dt, t) {
          const S = sim() && sim().S;
          if (S) { if (S.obs != null) obs = S.obs % CAND.length; if (S.H4 !== lastH) { lastH = S.H4; H = S.H4; AGE = (sim().AGE && sim().AGE[H]) || 9778 / H; } if (S.rewD !== lastRD) { lastRD = S.rewD; r = clamp(S.rewD, 0, 1); if (!plR.playing) { syncing = true; plR.set(r); syncing = false; } } }
          frame();
        },
        sync() {},
      };
    },
  });
})();
