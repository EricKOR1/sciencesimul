/* hs-earth-interior · 3D 지진파와 지구 내부 (암영대)
   진원(위쪽)에서 나온 P파·S파의 경로(단순화한 광선 모형)를 지구 단면에 입체로 그려요.
   P파 암영대 103°~142°는 지구를 둘러싼 '띠'이고, S파는 액체인 외핵을 지나지 못해 103° 너머 전부가 암영대예요.
   수업의 '보이는 파'와 '관측점의 진앙각'을 읽어 시작해요(읽기 전용). */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const RE = 6371, ER = 3;
  const RCf = 3480 / RE, RIf = (RE - 5150) / RE, DG = 103, DS = 142, EG = 51.5;
  const deg = (a) => (a * Math.PI) / 180;
  const lerp = (a, b, t) => a + (b - a) * t;
  const pol = (r, th) => [r * Math.sin(th), r * Math.cos(th)];

  function hash3(x, y, z) { let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1274126177); h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967295; }
  const fade = (t) => t * t * (3 - 2 * t);
  function vnoise(x, y, z) {
    const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = fade(x - ix), fy = fade(y - iy), fz = fade(z - iz);
    const l = (a, b, t) => a + (b - a) * t, c = (dx, dy, dz) => hash3(ix + dx, iy + dy, iz + dz);
    return l(l(l(c(0, 0, 0), c(1, 0, 0), fx), l(c(0, 1, 0), c(1, 1, 0), fx), fy), l(l(c(0, 0, 1), c(1, 0, 1), fx), l(c(0, 1, 1), c(1, 1, 1), fx), fy), fz);
  }
  function fbm(x, y, z) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < 5; i++) { s += a * vnoise(x * f + 11.3 * i, y * f, z * f - 7.1 * i); f *= 2; a *= 0.5; } return s; }
  function earthCanvas() {
    const W = 512, H = 256, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d'), im = g.createImageData(W, H);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const lon = (i / W) * Math.PI * 2, lat = (0.5 - (j + 0.5) / H) * Math.PI;
      const v = fbm(Math.cos(lat) * Math.cos(lon) * 1.7 + 5, Math.sin(lat) * 1.7 + 5, Math.cos(lat) * Math.sin(lon) * 1.7 + 5), o = (j * W + i) * 4;
      let c;
      if (v > 0.5) { const h = Math.min(1, (v - 0.5) * 4); c = [76 + 74 * h, 166 - 38 * h, 84]; } else { const h = Math.min(1, (0.5 - v) * 4); c = [30 + 24 * h, 92 + 40 * h, 170 + 42 * h]; }
      im.data[o] = c[0]; im.data[o + 1] = c[1]; im.data[o + 2] = c[2]; im.data[o + 3] = 255;
    }
    g.putImageData(im, 0, 0); return cv;
  }

  /* ---- 광선 (수업과 같은 단순화 모형, 단위 반지름) ---- */
  function mantleRay(D_) { const rmin = 1 - (1 - RCf) * Math.pow(D_ / DG, 1.5), pts = []; for (let k = 0; k <= 24; k++) { const f = k / 24, ph = f * D_, r = rmin + (1 - rmin) * Math.pow((ph - D_ / 2) / (D_ / 2), 2); pts.push(pol(r, deg(ph))); } return pts; }
  function legIn(E) { const pts = []; for (let k = 0; k <= 14; k++) { const u = k / 14, r = RCf + (1 - RCf) * Math.pow(1 - u, 2); pts.push(pol(r, deg(E * u))); } return pts; }
  function legOut(D_, E) { const pts = []; for (let k = 0; k <= 14; k++) { const u = k / 14, r = RCf + (1 - RCf) * u * u; pts.push(pol(r, deg(D_ - E + E * u))); } return pts; }
  const coreDelta = (E) => 180 - (38 * E) / EG;
  function coreRay(E) {
    const D_ = coreDelta(E), a = pol(RCf, deg(E)), b = pol(RCf, deg(D_ - E)), mid = [];
    for (let k = 1; k < 10; k++) mid.push([lerp(a[0], b[0], k / 10), lerp(a[1], b[1], k / 10)]);
    return legIn(E).concat(mid, legOut(D_, E));
  }
  function lehmannRay() {
    const E = 30, D_ = 120, pts = legIn(E), c1 = pol(RCf, deg(E)), ic = pol(RIf, deg(60)), c2 = pol(RCf, deg(D_ - E));
    for (let k = 1; k <= 8; k++) pts.push([lerp(c1[0], ic[0], k / 8), lerp(c1[1], ic[1], k / 8)]);
    for (let k = 1; k <= 8; k++) pts.push([lerp(ic[0], c2[0], k / 8), lerp(ic[1], c2[1], k / 8)]);
    return pts.concat(legOut(D_, E));
  }
  const pArr = (d) => d <= DG || d >= DS, sArr = (d) => d <= DG;

  window.SciSim3D.attach({
    title: '지진파로 본 지구 내부 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHONE ? 14.5 : 9.5, theta: 0.65, phi: 1.2, min: 5, max: 24 },
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls, orbit, renderer } = ctx;
      renderer.localClippingEnabled = true;
      const AX = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];
      const planes = [new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0), new THREE.Plane(new THREE.Vector3(0, 0, -1), 0)];
      const clip = (m) => { m.clippingPlanes = planes; m.clipIntersection = true; return m; };
      const tex = new THREE.CanvasTexture(earthCanvas()); if ('encoding' in tex) tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 4;
      /* 지구 껍질 + 단면 */
      root.add(new THREE.Mesh(new THREE.SphereGeometry(ER, 80, 56), clip(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, side: THREE.DoubleSide }))));
      const BOUND = [[0, 1 - 35 / RE, '#8b5e3c'], [1, 1 - 410 / RE, '#e8a96b'], [2, 1 - 660 / RE, '#e59a54'], [3, RCf, '#d9803a'], [4, RIf, '#fbbf24'], [5, 0, '#fff0a6']];
      const rings = [1, 1 - 35 / RE, 1 - 410 / RE, 1 - 660 / RE, RCf, RIf];     // 바깥 → 안쪽 경계
      const capCols = ['#8b5e3c', '#e8a96b', '#e59a54', '#d9803a', '#fbbf24', '#fff0a6'];
      const capG = new THREE.Group(); root.add(capG);
      for (let n of [0, 2]) {
        const t1 = (n + 1) % 3, t2 = (n + 2) % 3, basis = new THREE.Matrix4().makeBasis(AX[t1], AX[t2], AX[n]);
        for (let q = 0; q < 4; q++) {
          const q1 = (q === 0 || q === 3) ? 1 : -1, q2 = q < 2 ? 1 : -1;
          if ((n === 2 && q1 < 0) || (n === 0 && q2 < 0)) continue;       // x>0 (z=0 평면), z>0 (x=0 평면)만
          rings.forEach((r0, i) => {
            const r1 = i + 1 < rings.length ? rings[i + 1] : 0;
            const geo = r1 === 0 ? new THREE.CircleGeometry(r0 * ER, 40, q * Math.PI / 2, Math.PI / 2) : new THREE.RingGeometry(r1 * ER, r0 * ER, 40, 1, q * Math.PI / 2, Math.PI / 2);
            const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: capCols[i], side: THREE.DoubleSide })); m.applyMatrix4(basis); capG.add(m);
          });
          [RCf, RIf, 1 - 410 / RE, 1 - 660 / RE].forEach((rr, k) => {
            const p = []; for (let i = 0; i <= 24; i++) { const th = q * Math.PI / 2 + (i / 24) * Math.PI / 2; p.push(new THREE.Vector3(Math.cos(th) * rr * ER, Math.sin(th) * rr * ER, 0.004)); }
            const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints(p), k < 2 ? new THREE.LineBasicMaterial({ color: 0x7c2d12 }) : new THREE.LineDashedMaterial({ color: 0x92400e, dashSize: 0.08, gapSize: 0.06 }));
            if (k >= 2) ln.computeLineDistances(); ln.applyMatrix4(basis); capG.add(ln);
          });
        }
      }
      /* 암영대 띠 (지표면) */
      const zone = (a, b, col, op, rr) => { const m = new THREE.Mesh(new THREE.SphereGeometry(ER * rr, 96, 40, 0, Math.PI * 2, deg(a), deg(b - a)), clip(new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, side: THREE.DoubleSide, depthWrite: false }))); root.add(m); return m; };
      const zP = zone(DG, DS, 0x0f172a, 0.82, 1.006), zS = zone(DG, 180, 0xea580c, 0.5, 1.014);
      /* 광선 */
      const rayG = new THREE.Group(); root.add(rayG);
      const rays = [];
      const addRay = (pts2, col, kind, tubeR, dashed) => {
        const pts = pts2.map((q) => new THREE.Vector3(q[0] * ER, q[1] * ER, 0.05));
        const curve = new THREE.CatmullRomCurve3(pts);
        const m = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(24, pts.length * 3), tubeR, 6, false), new THREE.MeshBasicMaterial({ color: col, transparent: !!dashed, opacity: dashed ? 0.8 : 1 }));
        rayG.add(m);
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10), new THREE.MeshBasicMaterial({ color: kind === 'P' ? 0xbfdbfe : 0xfed7aa }));
        rayG.add(dot);
        let L = 0; for (let i = 1; i < pts.length; i++) L += pts[i].distanceTo(pts[i - 1]);
        const o = { m, dot, curve, L, kind, off: rays.length * 0.37, lehmann: !!dashed, endX: null };
        rays.push(o); return o;
      };
      [20, 40, 60, 80, 95, 103].forEach((d, i) => addRay(mantleRay(d), 0x2563eb, 'P', i === 5 ? 0.04 : 0.025));
      [46, 36, 26, 16, 6, 0].forEach((E) => addRay(coreRay(E), 0x1d4ed8, 'P', 0.025));
      addRay(lehmannRay(), 0x7c3aed, 'P', 0.025, true);
      [20, 40, 60, 80, 95, 103].forEach((d, i) => addRay(mantleRay(d), 0xea580c, 'S', i === 5 ? 0.04 : 0.025));
      [45, 34, 23].forEach((E) => { const o = addRay(legIn(E), 0xea580c, 'S', 0.025); const e = legIn(E).pop(); o.endX = e; });
      /* S파가 막히는 ×표 */
      const xMarks = rays.filter((r) => r.endX).map((r) => {
        const g = new THREE.Group(), mat = new THREE.MeshBasicMaterial({ color: 0xdc2626 });
        [Math.PI / 4, -Math.PI / 4].forEach((a) => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.06, 0.06), mat); b.rotation.z = a; g.add(b); });
        g.position.set(r.endX[0] * ER, r.endX[1] * ER, 0.08); rayG.add(g); return g;
      });
      /* 진원 · 관측점 · 각도 호 */
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.2), new THREE.MeshBasicMaterial({ color: 0xef4444 })); star.position.set(0, ER * 1.01, 0); root.add(star);
      const epiLab = label('진원(진앙)', star, { offset: [0.2, 0.42, 0], color: 'rgba(185,28,28,.92)' });
      const wave = []; for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 6, 90), clip(new THREE.MeshBasicMaterial({ color: 0xfca5a5, transparent: true }))); m.rotation.x = Math.PI / 2; root.add(m); wave.push(m); }
      const obs = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), new THREE.MeshBasicMaterial({ color: 0x0f172a })); root.add(obs);
      const obsRing = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.02, 8, 30), new THREE.MeshBasicMaterial({ color: 0x38bdf8 })); root.add(obsRing);
      const obsLab = label('', obs, { offset: [0.0, 0, 0.0], color: 'rgba(15,23,42,.92)' });
      let arc = null;
      const labP = label('P파 암영대 103°~142°', [Math.sin(deg(122.5)) * ER * 1.06 * Math.cos(deg(105)), Math.cos(deg(122.5)) * ER * 1.06, Math.sin(deg(122.5)) * ER * 1.06 * Math.sin(deg(105))], { color: 'rgba(15,23,42,.92)' });
      const labS = label('S파 암영대 103° 이후', [Math.sin(deg(160)) * ER * 1.08 * Math.cos(deg(105)), Math.cos(deg(160)) * ER * 1.08, Math.sin(deg(160)) * ER * 1.08 * Math.sin(deg(105))], { color: 'rgba(194,65,12,.94)' });
      const labL = label('약한 P파(내핵 반사)', [pol(0.7, deg(100))[0] * ER, pol(0.7, deg(100))[1] * ER, 0.1], { color: 'rgba(109,40,217,.9)', size: 11.5 });
      const capLabs = [
        label('맨틀 (고체)', [0, 0, 0], { color: 'rgba(12,18,34,.82)' }), label('외핵 (액체)', [0, 0, 0], { color: 'rgba(12,18,34,.82)' }), label('내핵 (고체)', [0, 0, 0], { color: 'rgba(12,18,34,.82)' }),
      ];
      const lp = (r, th) => { const q = pol(r, deg(th)); return [q[0] * ER, q[1] * ER, 0.06]; };
      capLabs[0].obj = lp(0.78, 150); capLabs[1].obj = lp(0.40, 160); capLabs[2].obj = lp(0.0, 0); capLabs[2].obj = [0.16, -0.0, 0.06];

      /* 상태 */
      let wv = 'P', dl = 60, bands = true, clock = 0, burst = 0;
      const rd = () => { try { const S = window.__sim && window.__sim.S; if (S) return { w: ['P', 'S', 'B'].includes(S.shW) ? S.shW : null, d: typeof S.dl === 'number' ? S.dl : null }; } catch (e) {} return {}; };
      function setObs() {
        const th = deg(dl), r = ER * 1.012;
        obs.position.set(Math.sin(th) * r, Math.cos(th) * r, 0); obsRing.position.copy(obs.position); obsRing.lookAt(0, 0, 0);
        if (arc) { root.remove(arc); arc.geometry.dispose(); arc = null; }
        if (dl > 0) { const p = []; for (let i = 0; i <= 48; i++) { const a = th * i / 48; p.push(new THREE.Vector3(Math.sin(a) * ER * 1.045, Math.cos(a) * ER * 1.045, 0.02)); } arc = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(p), 48, 0.02, 5, false), new THREE.MeshBasicMaterial({ color: 0x0f172a })); root.add(arc); }
        obsLab.set('관측점 Δ = ' + dl + '°'); obsLab.off = [Math.sin(th) * 0.55, Math.cos(th) * 0.5, 0.0];
        fmtInfo();
      }
      function applyVis() {
        const showP = wv !== 'S', showS = wv !== 'P';
        rays.forEach((r) => { const v = r.kind === 'P' ? showP : showS; r.m.visible = v; r.dot.visible = v; });
        xMarks.forEach((x) => (x.visible = showS));
        zP.visible = bands && showP; zS.visible = bands && showS; labP.show(bands && showP); labS.show(bands && showS); labL.show(showP);
        fmtInfo();
      }
      function fmtInfo() {
        const p = pArr(dl), s = sArr(dl), showP = wv !== 'S', showS = wv !== 'P';
        const chip = (nm, ok, why) => '<span style="color:' + (ok ? '#86efac' : '#fca5a5') + '"><b>' + nm + (ok ? ' 도착 ○' : ' 도착 ×') + '</b></span> ' + why;
        let h = '진앙각 <b>Δ = ' + dl + '°</b><br>';
        if (showP) h += chip('P파', p, dl <= DG ? '맨틀을 지나 곧바로 와요.' : dl < DS ? '외핵에서 크게 꺾여 이 띠에는 못 와요(암영대).' : '외핵·내핵을 지나 늦게 와요.') + '<br>';
        if (showS) h += chip('S파', s, dl <= DG ? '고체인 맨틀만 지나 와요.' : '액체인 외핵을 통과하지 못해요.') + '<br>';
        if (showP && showS && !s && p) h += '→ 103° 너머에서 S파만 없으면 외핵은 <b>액체</b>예요.';
        info(h);
      }
      const rr = controls.range('관측점 Δ', 0, 180, 1, dl, (v) => { dl = v; setObs(); }, (v) => v + '°');
      const wSeg = controls.segment('보이는 파', [{ value: 'P', label: 'P파' }, { value: 'S', label: 'S파' }, { value: 'B', label: '둘 다' }], wv, (v) => { wv = v; applyVis(); });
      const bb = controls.button('암영대 띠 ✓', () => { bands = !bands; bb.classList.toggle('on', bands); bb.textContent = '암영대 띠 ' + (bands ? '✓' : '✕'); applyVis(); }); bb.classList.add('on');
      controls.button('🌊 지진파 다시 보내기', () => { clock = 0; burst = 0; });
      const l0 = rd(); if (l0.w) wv = l0.w; if (l0.d != null) { dl = l0.d; rr.set(dl); }
      setObs(); applyVis();
      const v1 = new THREE.Vector3();
      const markWave = () => wSeg.set(wv);
      markWave();

      return {
        update(dt) {
          clock += dt;
          rays.forEach((r) => {
            const speed = r.kind === 'P' ? 3.2 : 1.9, per = r.L + 2.0, d = ((clock * speed + r.off * 4) % per);
            if (d <= r.L) { r.dot.position.copy(r.curve.getPointAt(Math.min(1, d / r.L))); r.dot.visible = r.m.visible; } else r.dot.visible = false;
          });
          wave.forEach((m, i) => {
            const ph = ((clock * 0.28 + i / 3) % 1), th = ph * Math.PI, rr_ = Math.sin(th) * ER * 1.006, y = Math.cos(th) * ER * 1.006;
            m.position.set(0, y, 0); m.scale.setScalar(Math.max(0.001, rr_)); m.material.opacity = 0.75 * (1 - ph);
          });
          star.rotation.y += dt * 1.5; star.scale.setScalar(1 + 0.12 * Math.sin(clock * 5));
          obsRing.scale.setScalar(1 + 0.15 * Math.sin(clock * 4));
          const cam = ctx.camera.position, vis = (cam.x + cam.z) / (cam.length() * 1.414) > 0.35;
          capLabs.forEach((l) => l.show(vis)); labL.show(vis && wv !== 'S');
        },
        sync() { const l = rd(); let ch = false; if (l.w && l.w !== wv) { wv = l.w; markWave(); ch = true; } if (l.d != null && l.d !== dl) { dl = l.d; rr.set(dl); ch = true; } if (ch) { setObs(); applyVis(); } },
      };
    },
  });
})();
