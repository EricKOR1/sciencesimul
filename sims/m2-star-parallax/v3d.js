/* m2-star-parallax · 3D 연주시차 (지구 공전 궤도와 가까운 별)
   지구가 태양 둘레를 돌며 6개월 뒤에 반대편에 오면, 가까운 별은 멀리 있는 배경별에 대해 조금 움직여 보여요.
   별이 멀수록 연주시차는 작아져요 (그림의 각도는 알아보기 쉽게 크게 그렸어요). */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const R = 2.3, DOME = 28;

  window.SciSim3D.attach({
    host: (window.matchMedia && window.matchMedia('(max-width: 599px)').matches) ? '.sc-tall' : '.sc-wide',
    title: '연주시차 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHN ? 14 : 11, theta: 0.5, phi: 1.1, min: 8, max: 55, target: [0, 5, 0] },
    autoRotate: 0,
    levels: [2],                     // 3단계(거리를 바꾸며 연주시차 기록). 1단계(눈 바꾸기) · 2단계(모형의 각 ①②③을 눌러 고르기) · 4단계(카드 놓기)는 2D
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      const V3 = THREE.Vector3;
      const sm = () => window.__sim;
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0.05 }, o || {}));

      // 태양
      const sun = new THREE.Mesh(new THREE.SphereGeometry(0.55, 32, 24), new THREE.MeshBasicMaterial({ color: 0xffd34d })); root.add(sun);
      const sunHalo = new THREE.Mesh(new THREE.SphereGeometry(0.95, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffb02e, transparent: true, opacity: 0.25, depthWrite: false })); root.add(sunHalo);
      const orbitRing = new THREE.Mesh(new THREE.TorusGeometry(R, 0.025, 8, 128), new THREE.MeshBasicMaterial({ color: 0x8fb0ff, transparent: true, opacity: 0.7 })); orbitRing.rotation.x = Math.PI / 2; root.add(orbitRing);
      // 지구 (현재 위치) · 1월 · 7월 위치 표시
      const earth = new THREE.Mesh(new THREE.SphereGeometry(0.3, 32, 24), mat(0x3f86e0, { roughness: 0.55, emissive: 0x0a2a60, emissiveIntensity: 0.35 })); earth.castShadow = true; root.add(earth);
      const eJan = new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 14), new THREE.MeshBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.8 })), eJul = eJan.clone();
      eJan.position.set(-R, 0, 0); eJul.position.set(R, 0, 0); root.add(eJan, eJul);
      // 가까운 별
      const star = new THREE.Mesh(new THREE.SphereGeometry(0.34, 28, 20), new THREE.MeshBasicMaterial({ color: 0xfff6c8 })); root.add(star);
      const starG = new THREE.Mesh(new THREE.SphereGeometry(0.75, 24, 16), new THREE.MeshBasicMaterial({ color: 0xfff0a0, transparent: true, opacity: 0.25, depthWrite: false })); star.add(starG);
      // 먼 배경별 (하늘 돔)
      const NS = 260, sp = new Float32Array(NS * 3);
      for (let i = 0; i < NS; i++) { const a = Math.random() * Math.PI * 2, b = Math.acos(0.15 + Math.random() * 0.85), r = DOME; sp[i * 3] = r * Math.sin(b) * Math.cos(a); sp[i * 3 + 1] = r * Math.cos(b) + 1; sp[i * 3 + 2] = r * Math.sin(b) * Math.sin(a); }
      const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
      root.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xcdd9ff, size: 0.14, sizeAttenuation: true, transparent: true, opacity: 0.85 })));
      // 시선 (지구 → 별 → 배경)
      const cyl = (col, r, op) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 8), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, depthWrite: false })); root.add(m); return m; };
      const lineJan = cyl(0x9fe8ff, 0.025, 0.85), lineJul = cyl(0x9fe8ff, 0.025, 0.85), lineNow = cyl(0xffd34d, 0.04, 0.95);
      const extJan = cyl(0x9fe8ff, 0.012, 0.35), extJul = cyl(0x9fe8ff, 0.012, 0.35), extNow = cyl(0xffd34d, 0.02, 0.6);
      const mJan = new THREE.Mesh(new THREE.SphereGeometry(0.28, 18, 12), new THREE.MeshBasicMaterial({ color: 0x9fe8ff })), mJul = mJan.clone(), mNow = new THREE.Mesh(new THREE.SphereGeometry(0.34, 18, 12), new THREE.MeshBasicMaterial({ color: 0xffd34d }));
      root.add(mJan, mJul, mNow);
      const axis = cyl(0x6f7fa8, 0.012, 0.5);
      const up = new V3(0, 1, 0);
      function seg(m, a, b) { const d = new V3().subVectors(b, a), l = d.length(); m.position.copy(a).addScaledVector(d, 0.5); m.scale.set(1, Math.max(0.001, l), 1); m.quaternion.setFromUnitVectors(up, d.normalize()); }
      // 연주시차 각 (별에서 태양 방향 ↔ 지구 방향)
            const arcL = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xff8a6a })); root.add(arcL);

      const lSun = label('태양', sun, { offset: [0, -0.9, 0] }), lE = label('지구', earth, { offset: [0, 0.65, 0] }), lJan = label('1월의 지구', eJan, { offset: [-0.2, -0.5, 0] }), lJul = label('7월의 지구', eJul, { offset: [0.2, -0.5, 0] }), lS = label('가까운 별', star, { offset: [0.6, 0, 0] });
      const lmJ = label('1월에 보이는 위치', mJan, { offset: [0, -0.7, 0], color: 'rgba(30,140,170,.95)' }), lmL = label('7월에 보이는 위치', mJul, { offset: [0, -0.7, 0], color: 'rgba(30,140,170,.95)' }), lBg = label('아주 먼 별(배경)', [-DOME * 0.6, DOME * 0.55, 0]);
      const lP = label('연주시차', [0, 0, 0], { color: 'rgba(255,211,77,.95)' }); lP.el.style.color = '#1b2333';
      let dist = 3, showL = true, labs = true;
      const fmtP = (d) => (1 / d).toFixed(d === 1 ? 0 : 2).replace(/\.?0+$/, '');
      function hOf(d) { return 2.6 + 1.25 * d; }
      let adj = 1.6;
      function info2(d) { adj = 1.6; info(`가까운 별까지 거리 <b>${d} pc</b> → 연주시차 <b>${(1 / d).toFixed(2).replace(/\.?0+$/, '')}″</b><br>별까지 거리를 바꾸며 연주시차가 어떻게 달라지는지 보세요.<br>지구가 6개월 동안 반대편으로 가면 별이 배경에서 움직여 보여요.`); }
      const distR = controls.range('별까지 거리', 1, 10, 1, dist, (v) => { dist = v; const s = sm(); if (s && s.setDist) s.setDist(v); info2(v); }, (v) => v + ' pc');
      const bJ = controls.button('1월', () => { const s = sm(); if (s) { s.S.angT = 180; } });
      const bL = controls.button('7월', () => { const s = sm(); if (s) { s.S.angT = 360; } });
      // ▶ 재생: 지구가 태양 둘레를 한 바퀴 돌아요 (1월 → 4월 → 7월 → 10월). 2D 모형의 지구도 같은 위치로 움직여요.
      let pl = null;
      pl = controls.player({
        duration: 12, loop: true, autoplay: false, label: '지구 공전',
        phases: [[0, '1월'], [0.25, '4월'], [0.5, '7월'], [0.75, '10월']],
        onFrame(p) { if (!pl) return; const s = sm() && sm().S; if (!s) return; s.ang = s.angT = (180 + p * 360) % 360; },
      });
      controls.button('시선 선 켜기/끄기', () => { showL = !showL; });
      controls.button('이름표', () => { labs = !labs; });
      info2(dist);
      /* ===== 장면 pencil(연필 시차 실험): 두 눈으로 번갈아 보면 가까운 연필이 먼 배경에서 움직여 보여요 (1칸 = 10 cm) ===== */
      const orbObjs = root.children.slice(), orbLabs = [lSun, lE, lJan, lJul, lS, lmJ, lmL, lBg, lP];
      const gP = new THREE.Group(); gP.visible = false; root.add(gP);
      const WZ = -18;
      { const head = new THREE.Mesh(new THREE.SphereGeometry(0.9, 32, 24), mat(0xf2c9a0, { roughness: 0.6 })); gP.add(head);
        const nose = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.35, 12), mat(0xe8b88a)); nose.rotation.x = -Math.PI / 2; nose.position.set(0, -0.15, -1.0); gP.add(nose);
        const wall = new THREE.Mesh(new THREE.BoxGeometry(16, 4.5, 0.2), mat(0x2a3556, { roughness: 0.9 })); wall.position.set(0, 0.6, WZ - 0.12); gP.add(wall);
        for (let i = -7; i <= 7; i++) { const mk = new THREE.Mesh(new THREE.BoxGeometry(0.34, 3.3 + (i % 3) * 0.25, 0.06), mat([0xef6a5a, 0x5aa0ef, 0xf2d35a, 0x6fdc9a][((i % 4) + 4) % 4], { roughness: 0.7 })); mk.position.set(i * 1.05, 0.6, WZ + 0.0); gP.add(mk); } }
      const eyes = [-0.33, 0.33].map((x) => { const g = new THREE.Group(); g.position.set(x, 0.12, -0.82); gP.add(g);
        const w = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), mat(0xffffff, { roughness: 0.3 })); g.add(w);
        const pu = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), mat(0x1b2333)); pu.position.z = -0.12; g.add(pu);
        const lid = new THREE.Mesh(new THREE.SphereGeometry(0.19, 16, 10, 0, 6.283, 0, 1.7), mat(0xd9a77c)); lid.rotation.x = -Math.PI / 2; lid.position.z = -0.03; g.add(lid);
        return { g, lid }; });
      const pencil = new THREE.Group(); gP.add(pencil);
      { const bd = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.1, 14), mat(0xf5c542, { roughness: 0.5 })); pencil.add(bd); const cap = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), mat(0xff7a3a)); cap.position.y = 0.6; pencil.add(cap);
        const tp = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 12), mat(0x2a2a2a)); tp.position.y = 0.66; pencil.add(tp);
        const wd = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.14, 12), mat(0xe8c9a0)); wd.position.y = 0.52; pencil.add(wd); }
      const cylP = (col, r) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 8), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.9, depthWrite: false })); gP.add(m); return m; };
      const sightL = cylP(0x9fe8ff, 0.03), sightR = cylP(0xffd34d, 0.03);
      const spotL = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), new THREE.MeshBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.9, depthWrite: false })), spotR = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0.9, depthWrite: false })); gP.add(spotL, spotR);
      const penLab = [label('왼쪽 눈', eyes[0].g, { size: 11.5, offset: [-0.4, 0.45, 0] }), label('오른쪽 눈', eyes[1].g, { size: 11.5, offset: [0.4, 0.45, 0] }), label('연필 (가까운 물체)', pencil, { size: 12, offset: [0, 0.95, 0] }), label('멀리 있는 배경', [0, 3.3, WZ], { size: 12 }), label('', [0, 1.6, WZ + 0.1], { size: 12, color: 'rgba(255,170,40,.95)' })];
      penLab[4].el.style.color = '#1b2333';
      let pX = '', penPl = null, penDem = false, penP = 0;
      { const before = pl; penPl = controls.player({ duration: 14, loop: true, autoplay: false, label: '번갈아 보기', phases: [[0, '가까운 연필'], [0.5, '먼 연필']], onFrame(p) { penDem = true; penP = p; } }); }
      const penRows = () => document.querySelectorAll('.v3-player');
      function setPX(m) {
        if (pX === m) return; pX = m; const isP = m === 'pencil';
        orbObjs.forEach((o) => { o.visible = !isP; }); orbLabs.forEach((l) => l.show(!isP && labs)); gP.visible = isP; penLab.forEach((l) => l.show(isP));
        const rows = penRows(); if (rows[0]) rows[0].style.display = isP ? 'none' : ''; if (rows[1]) rows[1].style.display = isP ? '' : 'none';
        if (isP) { orbit.tx = 0; orbit.ty = 0; orbit.tz = -9; orbit.theta = 0; orbit.phi = 0.55; orbit.dist = PHN ? 36 : 26; penDem = false; if (penPl.playing) penPl.pause(); }
        else { adj = 1.6; orbit.theta = 0.5; orbit.phi = 1.1; orbit.tz = 0; }
      }
      let penTxt = ''; const setPen = (h) => { if (h !== penTxt) { penTxt = h; info(h); } };
      function updPencil(dt, t, sx) {
        let d = sx ? sx.d : 40, sEye = sx ? (sx.eye > 0 ? -1 : 1) : -1, ph = '';
        if (penDem) { const p = penP, far = p >= 0.5; d = far ? 60 : 15; const q = (far ? p - 0.5 : p) / 0.5; sEye = Math.floor(q * 4) % 2 === 0 ? -1 : 1; ph = (far ? '먼 연필 (' : '가까운 연필 (') + d + ' cm)'; }
        const dz = d * 0.1, T = new V3(0, 0.12, -0.82 - dz), spots = [];
        pencil.position.set(0, -0.43 + 0.12, -0.82 - dz);
        [0, 1].forEach((i) => {
          const E = new V3(eyes[i].g.position.x, 0.12, -0.82), k = (WZ - E.z) / (T.z - E.z), P = new V3(E.x + (T.x - E.x) * k, 0.12, WZ + 0.06);
          const ln = i === 0 ? sightL : sightR; const dv = new V3().subVectors(P, E), len = dv.length(); ln.position.copy(E).addScaledVector(dv, 0.5); ln.scale.set(1, len, 1); ln.quaternion.setFromUnitVectors(new V3(0, 1, 0), dv.normalize());
          (i === 0 ? spotL : spotR).position.copy(P); spots.push(P.x);
          const open = (i === 0) === (sEye < 0); eyes[i].lid.visible = !open; ln.material.opacity = open ? 0.95 : 0.2; (i === 0 ? spotL : spotR).material.opacity = open ? 0.95 : 0.25;
        });
        const sh = Math.abs(spots[1] - spots[0]);
        penLab[4].obj = [(spots[0] + spots[1]) / 2, 0.12, WZ + 2.2]; penLab[4].set('움직임 ' + (sh * 10).toFixed(0) + ' cm (눈 사이 6.5 cm)');
        const phe = document.querySelector('.v3-player .v3-ph'); const rows = penRows(); const phr = rows[1] && rows[1].querySelector('.v3-ph'); if (phr) phr.textContent = penDem ? ph : '';
        setPen((penDem ? '<b>▶ ' + ph + '</b><br>' : '') + '<b>시차</b>: 한쪽 눈씩 번갈아 보면 <b>가까운 연필</b>이 <b>먼 배경</b>에 대해 움직여 보여요 (배경의 노란 점 ↔ 하늘색 점).<br>연필이 <b>가까울수록</b> 많이, <b>멀수록</b> 조금 움직여 보여요. 연필 거리 <b>' + d + ' cm</b>' + (penDem ? '' : '<br>▶ 번갈아 보기를 눌러 보세요.'));
      }
      let a0 = 270, k0 = 0;
      const nowP = new V3(), sPos = new V3(), out = new V3();
      function ext(from, to, len) { out.copy(to).sub(from).normalize().multiplyScalar(len).add(to); return out; }
      return {
        update(dt, t) {
          const s = sm() && sm().S;
          setPX(s && s.scene === 'pencil' ? 'pencil' : 'orbit');
          if (pX === 'pencil') { updPencil(dt, t, s); return; }
          if (s && s.drag && pl && pl.playing) pl.pause();     // 2D에서 지구를 끌면 재생을 멈춰요
          if (s) { if (s.dist !== dist && !(Math.abs(s.dist - dist) < 0.01)) { dist = s.dist; distR.set(dist); info2(dist); } a0 = s.ang; }
          const a = a0 * Math.PI / 180;
          earth.position.set(Math.cos(a) * R, 0, -Math.sin(a) * R);  // 북쪽에서 보면 시계 반대 방향 earth.rotation.y += dt * 2;
          const H = hOf(dist); sPos.set(0, H, 0); star.position.copy(sPos); starG.scale.setScalar(1 + 0.1 * Math.sin(t * 3));
          sunHalo.scale.setScalar(1 + 0.05 * Math.sin(t * 2));
          const J = eJan.position, L = eJul.position, E = earth.position;
          [[lineJan, J, extJan, mJan], [lineJul, L, extJul, mJul], [lineNow, E, extNow, mNow]].forEach(([ln, p, ex, mk], i) => {
            seg(ln, p, sPos);
            const end = ext(p, sPos, DOME * 1.0 - H * 0.2); const e2 = end.clone(); if (e2.length() > DOME) e2.setLength(DOME);
            seg(ex, sPos, e2); mk.position.copy(e2);
            ln.visible = ex.visible = mk.visible = showL;
          });
          lineNow.visible = extNow.visible = mNow.visible = showL;
          // 시차 각도: 별에서 본 태양(아래) ↔ 1월의 지구
          const v1 = new V3(0, -1, 0), v2 = new V3().subVectors(J, sPos).normalize();
          const pts = []; for (let k = 0; k <= 16; k++) { const q = v1.clone().lerp(v2, k / 16).normalize().multiplyScalar(1.1); pts.push(q.add(sPos)); }
          arcL.geometry.setFromPoints(pts);
          const mid = pts[8]; lP.obj = [mid.x, mid.y, mid.z];
          axis.position.set(0, H / 2, 0); axis.scale.set(1, H, 1);
          lSun.show(labs); lE.show(labs); lJan.show(labs); lJul.show(labs); lS.show(labs); lmJ.show(labs && showL); lmL.show(labs && showL); lBg.show(labs); lP.show(labs && showL);
          if (adj > 0) { adj -= dt; const ty = 0.6 + H * 0.45, dd = (PHN ? 9 : 6.5) + H * 1.05, k = Math.min(1, dt * 4); orbit.ty += (ty - orbit.ty) * k; orbit.dist += (dd - orbit.dist) * k; }
        },
      };
    },
  });
})();
