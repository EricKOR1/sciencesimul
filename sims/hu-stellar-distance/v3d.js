/* hu-stellar-distance · 3D 연주 시차
   지구가 태양을 도는 동안 가까운 별은 아주 먼 배경별에 대해 조금씩 움직여 보여요(연주 시차).
   별이 가까울수록 시차각 p가 커요: d(파섹) = 1 / p(″).  (크기와 각도는 보기 좋게 훨씬 키워 그렸어요)
   2D 실험의 '월(달)'을 읽어 지구 위치를 맞춰요(읽기 전용). */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const TAU = Math.PI * 2, DEG = Math.PI / 180, RO = 2.3, RBG = 22, BETA = 25 * DEG;

  window.SciSim3D.attach({
    title: '연주 시차 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    levels: [0],
    camera: { dist: PHONE ? 19 : 13.5, theta: 0.9, phi: 1.12, min: 6, max: 36, target: [0, 1.2, -2.8] },
    autoRotate: 0,
    build(ctx) {
      const { THREE, scene, root, label, info, controls } = ctx;
      const st = { m: 0, D: 7, play: true, track: true, shots: [], key: '' };
      const sr = () => { try { return window.__sim && window.__sim.S; } catch (e) { return null; } };

      scene.add(new THREE.AmbientLight(0x93a6e0, 0.5));
      const sunLight = new THREE.PointLight(0xfff0cc, 2.4, 0, 0); scene.add(sunLight);

      /* 아주 먼 배경별 (큰 구) */
      { let seed = 21; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; const pos = [], col = [];
        for (let i = 0; i < 700; i++) { const u = rnd() * 2 - 1, a = rnd() * TAU, r = Math.sqrt(1 - u * u); pos.push(Math.cos(a) * r * RBG, u * RBG, Math.sin(a) * r * RBG); const b = 0.6 + rnd() * 0.4; col.push(b, b, 1); }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
        root.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 2.0, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.8 }))); }
      label('아주 먼 배경별', [-RBG * 0.52, RBG * 0.1, -RBG * 0.8], { size: 11.5, color: 'rgba(60,70,120,.9)' });

      /* 태양 · 지구 궤도 · 지구 */
      const sun = new THREE.Mesh(new THREE.SphereGeometry(0.34, 32, 24), new THREE.MeshBasicMaterial({ color: 0xffc83d })); root.add(sun);
      const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,230,140,1)'); gr.addColorStop(0.3, 'rgba(255,190,60,.4)'); gr.addColorStop(1, 'rgba(255,160,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); glow.scale.set(2.2, 2.2, 1); root.add(glow);
      label('태양', [0, 0, 0], { offset: [0, 0.7, 0] });
      { const pts = []; for (let i = 0; i < 120; i++) { const a = i / 120 * TAU; pts.push(new THREE.Vector3(RO * Math.cos(a), 0, RO * Math.sin(a))); }
        root.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 160, 0.02, 6, true), new THREE.MeshBasicMaterial({ color: 0x8fb4ff, transparent: true, opacity: 0.75 }))); }
      const earthTex = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d'); g.fillStyle = '#2f7fd8'; g.fillRect(0, 0, 256, 128); g.fillStyle = '#4caf6a';
        let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
        for (let i = 0; i < 16; i++) { const x = rnd() * 256, y = 20 + rnd() * 88; for (let j = 0; j < 7; j++) { g.beginPath(); g.ellipse(x + (rnd() - 0.5) * 30, y + (rnd() - 0.5) * 18, 6 + rnd() * 16, 4 + rnd() * 9, rnd() * 3, 0, 7); g.fill(); } }
        g.fillStyle = '#f2f6fa'; g.fillRect(0, 0, 256, 7); g.fillRect(0, 121, 256, 7); return new THREE.CanvasTexture(c); })();
      const earth = new THREE.Mesh(new THREE.SphereGeometry(0.22, 32, 24), new THREE.MeshStandardMaterial({ map: earthTex, roughness: 0.7 })); root.add(earth);
      label('지구', earth, { offset: [0, 0.5, 0] });

      /* 가까운 별 */
      const star = new THREE.Mesh(new THREE.SphereGeometry(0.26, 32, 24), new THREE.MeshBasicMaterial({ color: 0xffb98a })); root.add(star);
      const sGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: 0xff9d6a })); sGlow.scale.set(1.9, 1.9, 1); root.add(sGlow);
      const starLab = label('가까운 별', star, { offset: [0, 0.6, 0], color: 'rgba(160,70,20,.92)' });
      const baseLine = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 6), new THREE.MeshBasicMaterial({ color: 0xffd9b0, transparent: true, opacity: 0.35 })); root.add(baseLine);

      /* 시선(지구 → 별 → 배경) · 겉보기 위치 · 연주 시차각 호 */
      const sightM = new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.8 });
      const sight = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1, 6), sightM); root.add(sight);
      const mark = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14), new THREE.MeshBasicMaterial({ color: 0xff8a5c })); root.add(mark);
      const markLab = label('배경에서 보이는 위치', mark, { offset: [0, 0.65, 0], size: 11.5, color: 'rgba(160,70,20,.92)' });
      const trackG = new THREE.Group(); root.add(trackG);
      const shotG = new THREE.Group(); root.add(shotG);
      const arcG = new THREE.Group(); root.add(arcG);
      const parLab = label('', [0, 0, 0], { size: 12, color: 'rgba(30,64,140,.92)' });

      const sPos = () => new THREE.Vector3(0, st.D * Math.sin(BETA), -st.D * Math.cos(BETA));
      const ePos = (m) => { const a = m / 12 * TAU; return new THREE.Vector3(RO * Math.cos(a), 0, RO * Math.sin(a)); };
      function bgHit(E, S) {                                          // 지구에서 별을 지나 배경 구와 만나는 점
        const d = S.clone().sub(E).normalize(), b = E.dot(d), c = E.lengthSq() - RBG * RBG, t = -b + Math.sqrt(b * b - c);
        return E.clone().addScaledVector(d, t);
      }
      function setCyl(m, a, b) { const d = b.clone().sub(a), L = d.length(); m.position.copy(a).addScaledVector(d, 0.5); m.scale.set(1, L, 1); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); }
      function clear(g) { while (g.children.length) { const o = g.children.pop(); if (o.geometry && !o.userData.keep) o.geometry.dispose(); } }
      function pAngle() { const S = sPos(); return Math.atan2(RO, S.length()) / DEG; }         // 가장 큰 시차각(모형)
      function rebuildTrack() {
        clear(trackG);
        if (!st.track) return;
        const S = sPos(), pts = []; for (let i = 0; i < 72; i++) pts.push(bgHit(ePos(i / 72 * 12), S));
        trackG.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 144, 0.05, 6, true), new THREE.MeshBasicMaterial({ color: 0xff8a5c, transparent: true, opacity: 0.7 })));
      }
      function rebuildShots() {
        clear(shotG);
        const S = sPos();
        st.shots.forEach((m) => {
          const E = ePos(m), H = bgHit(E, S);
          const e = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 9), new THREE.MeshBasicMaterial({ color: 0x9fd4ff })); e.position.copy(E); shotG.add(e);
          const h = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), new THREE.MeshBasicMaterial({ color: 0xffb08a })); h.position.copy(H); shotG.add(h);
          const l = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 5), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 })); setCyl(l, E, H); shotG.add(l);
        });
      }
      function rebuildStar() {
        const S = sPos(); star.position.copy(S); sGlow.position.copy(S); setCyl(baseLine, new THREE.Vector3(), S);
        rebuildTrack(); rebuildShots(); upd(); text();
      }
      let lastM = -1;
      function upd() {
        const E = ePos(st.m), S = sPos(), H = bgHit(E, S);
        earth.position.copy(E); setCyl(sight, E, H); mark.position.copy(H);
        /* 시차각 호: 별에서 태양 방향과 지구 방향 사이 */
        clear(arcG);
        const a0 = S.clone().negate().normalize(), a1 = E.clone().sub(S).normalize(), r = 1.6, pts = [];
        for (let i = 0; i <= 16; i++) { const u = i / 16, v = a0.clone().lerp(a1, u).normalize().multiplyScalar(r).add(S); pts.push(v); }
        arcG.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.03, 6, false), new THREE.MeshBasicMaterial({ color: 0x7dd3fc })));
        parLab.obj = pts[8].toArray(); parLab.off = [0.55, 0, 0];
        const ang = Math.acos(Math.max(-1, Math.min(1, a0.dot(a1)))) / DEG; parLab.set('p ≈ ' + ang.toFixed(1) + '°');
      }
      function text() {
        info('<b>연주 시차</b> p: 별이 <b>가까울수록 크고</b> 멀수록 작아요.<br>지구가 반년 사이에 움직이면 별이 배경별 사이에서 <b>타원</b>을 그리며 움직여 보여요.<br>거리 d(파섹) = 1 / p(″)');
      }

      const rM = controls.range('월(달)', 0, 12, 0.5, st.m, (v) => { st.m = v; st.play = false; bP.textContent = '▶ 지구 돌리기'; upd(); }, (v) => v + '개월');
      const rD = controls.range('별까지 거리', 5, 14, 0.5, st.D, (v) => { st.D = v; rebuildStar(); }, (v) => (v <= 7 ? '가까움' : v <= 10 ? '보통' : '멀어요') + ' (' + (v * 0.5).toFixed(1) + ')');
      const bP = controls.button('⏸ 멈춤', () => { st.play = !st.play; bP.textContent = st.play ? '⏸ 멈춤' : '▶ 지구 돌리기'; });
      controls.button('📷 이 달 위치 남기기', () => { if (st.shots.indexOf(st.m) < 0) st.shots.push(st.m); if (st.shots.length > 4) st.shots.shift(); rebuildShots(); });
      controls.button('🧹 지우기', () => { st.shots = []; rebuildShots(); });
      const bT = controls.button('1년 궤적 ✓', () => { st.track = !st.track; bT.classList.toggle('on', st.track); bT.textContent = '1년 궤적 ' + (st.track ? '✓' : '✕'); rebuildTrack(); }); bT.classList.add('on');

      function follow() {
        const S = sr(); if (!S || !S.pr) return;
        if (S.pr.m !== st.key) { st.key = S.pr.m; st.m = S.pr.m; st.play = false; bP.textContent = '▶ 지구 돌리기'; rM.set(st.m); upd(); }
      }
      { const S0 = sr(); if (S0 && S0.pr) { st.key = S0.pr.m; st.m = S0.pr.m; rM.set(st.m); } }
      rebuildStar();
      return {
        update(dt) {
          follow();
          if (st.play) { st.m = (st.m + dt * 0.7) % 12; rM.set(Math.round(st.m * 2) / 2); upd(); }
          glow.scale.setScalar(2.2 + 0.08 * Math.sin(performance.now() / 400));
        },
        sync() { st.key = ''; follow(); },
      };
    },
  });
})();
