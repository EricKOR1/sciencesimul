/* h1-orbit · 3D 뉴턴의 대포
   지구 꼭대기(높이 20 km 산)에서 수평으로 쏜 대포알의 경로를 속력에 따라 입체로 봐요.
   속력이 작으면 떨어지고(낙하), 약 7.9 km/s면 원 궤도, 더 빠르면 타원 궤도, 약 11.2 km/s 이상이면 지구를 떠나요(탈출).
   화살표: 속도(경로의 접선 방향)와 중력(항상 지구 중심 쪽 = 가속도 방향). 수업의 발사 속력을 읽어 시작해요(읽기 전용). */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const R = 6371, G0 = 9.8, MU = (G0 / 1000) * R * R, H0 = 20, R0 = R + H0;
  const VC = Math.sqrt(MU / R0), VESC = Math.SQRT2 * VC;
  const ER = 3, K = ER / R;                       // 장면 반지름 3 = 6371 km
  const RCAP = 9 * R;
  const fmtN = (n) => Math.round(n).toLocaleString('ko-KR');
  const gAt = (r) => MU / (r * r) * 1000;

  /* ---- 절차적 지구 무늬 ---- */
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
      const lon = (i / W) * Math.PI * 2, lat = (0.5 - (j + 0.5) / H) * Math.PI, la = Math.abs(lat) * 180 / Math.PI;
      const v = fbm(Math.cos(lat) * Math.cos(lon) * 1.7 + 5, Math.sin(lat) * 1.7 + 5, Math.cos(lat) * Math.sin(lon) * 1.7 + 5), o = (j * W + i) * 4;
      let c;
      if (v > 0.5) { const h = Math.min(1, (v - 0.5) * 4); c = [76 + 74 * h, 166 - 38 * h, 84 + 0 * h]; } else { const h = Math.min(1, (0.5 - v) * 4); c = [30 + 24 * h, 92 + 40 * h, 170 + 42 * h]; }
      im.data[o] = c[0]; im.data[o + 1] = c[1]; im.data[o + 2] = c[2]; im.data[o + 3] = 255;
    }
    g.putImageData(im, 0, 0); return cv;
  }

  /* ---- 운동 계산 (km, s) ---- */
  function rk4(s, dt) {
    const f = (a) => { const r2 = a[0] * a[0] + a[1] * a[1], r3 = r2 * Math.sqrt(r2); return [a[2], a[3], -MU * a[0] / r3, -MU * a[1] / r3]; };
    const k1 = f(s), s2 = s.map((v, i) => v + k1[i] * dt / 2), k2 = f(s2), s3 = s.map((v, i) => v + k2[i] * dt / 2), k3 = f(s3), s4 = s.map((v, i) => v + k3[i] * dt), k4 = f(s4);
    return s.map((v, i) => v + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
  }
  function predict(v) {
    const eps = v * v / 2 - MU / R0, h = R0 * v;
    const e = Math.sqrt(Math.max(0, 1 + 2 * eps * h * h / (MU * MU)));
    const bound = eps < 0, p = h * h / MU;
    const rp = p / (1 + e), ra = bound ? p / (1 - e) : Infinity;
    const impact = bound && rp < R - 1e-6;
    const a = bound ? -MU / (2 * eps) : Infinity, P = bound ? 2 * Math.PI * Math.sqrt(a * a * a / MU) : Infinity;
    let st = [0, R0, v, 0], t = 0, hit = null, closed = false;
    const path = [{ t: 0, x: 0, y: R0, vx: v, vy: 0 }];
    for (let i = 0; i < 40000; i++) {
      const r = Math.hypot(st[0], st[1]), dt = Math.min(6 * Math.max(1, r / R0), 8);
      const nx = rk4(st, dt), r1 = Math.hypot(nx[0], nx[1]);
      if (impact && r1 <= R) { const f = (r - R) / (r - r1 || 1); hit = [st[0] + (nx[0] - st[0]) * f, st[1] + (nx[1] - st[1]) * f]; t += dt * f; path.push({ t, x: hit[0], y: hit[1], vx: nx[2], vy: nx[3] }); break; }
      st = nx; t += dt;
      if (bound && !impact && t >= P) { closed = true; path.push({ t, x: st[0], y: st[1], vx: st[2], vy: st[3] }); break; }
      path.push({ t, x: st[0], y: st[1], vx: st[2], vy: st[3] });
      if (r1 > RCAP) break;
    }
    const cls = impact ? 'impact' : !bound ? 'escape' : e <= 0.05 ? 'circle' : 'ellipse';
    let ext = 0; path.forEach((q) => { ext = Math.max(ext, Math.abs(q.x), Math.abs(q.y)); });
    return { v, e, bound, rp, ra, P, cls, path, tEnd: path[path.length - 1].t, closed, hit, range: hit ? R * Math.atan2(hit[0], hit[1]) : 0, ext, cropped: bound && !impact && !closed };
  }
  function posAt(sh, t) {
    const path = sh.path; let lo = 0, hi = path.length - 1;
    t = Math.max(0, Math.min(sh.tEnd, t));
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (path[m].t <= t) lo = m; else hi = m; }
    const a = path[lo], b = path[hi], f = b.t > a.t ? (t - a.t) / (b.t - a.t) : 0;
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, vx: a.vx + (b.vx - a.vx) * f, vy: a.vy + (b.vy - a.vy) * f };
  }

  window.SciSim3D.attach({
    button: PHONE ? null : undefined,
    title: '뉴턴의 대포 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: 12, theta: 0.9, phi: 1.15, min: 0.12, max: 70 },
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      const P3 = (x, y) => new THREE.Vector3(x * K, y * K, 0);
      /* 지구 */
      const tex = new THREE.CanvasTexture(earthCanvas()); if ('encoding' in tex) tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 4;
      const earth = new THREE.Mesh(new THREE.SphereGeometry(ER, 80, 56), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }));
      root.add(earth);
      const air = new THREE.Mesh(new THREE.SphereGeometry(ER * 1.025, 48, 32), new THREE.MeshBasicMaterial({ color: 0x6bb6ff, transparent: true, opacity: 0.16, depthWrite: false }));
      root.add(air);
      /* 대포와 산 (높이 20 km는 눈에 띄지 않을 만큼 낮아서 대포는 크게 그려요) */
      const cannon = new THREE.Group(); root.add(cannon);
      const mount = new THREE.Mesh(new THREE.ConeGeometry(70 * K, H0 * K, 24), new THREE.MeshStandardMaterial({ color: 0x8a6a45, roughness: 1 })); mount.position.set(0, R0 * K - H0 * K / 2, 0); root.add(mount);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.065, 0.34, 16), new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.5, metalness: 0.4 }));
      barrel.rotation.z = Math.PI / 2; barrel.position.set(-0.12, R0 * K + 0.03, 0); cannon.add(barrel);
      const PIV = new THREE.Vector3(0, R0 * K, 0), cannonLab = label('대포 (20 km 산 위)', cannon, { offset: [-0.1, 0.12, 0], color: 'rgba(12,18,34,.82)' });
      cannonLab.obj = new THREE.Object3D(); root.add(cannonLab.obj);
      /* 기준 원 (원 궤도) */
      const circ = (r, col, op) => { const p = []; for (let i = 0; i <= 160; i++) { const a = i / 160 * Math.PI * 2; p.push(new THREE.Vector3(Math.sin(a) * r * K, Math.cos(a) * r * K, 0)); } return new THREE.Line(new THREE.BufferGeometry().setFromPoints(p), new THREE.LineDashedMaterial({ color: col, dashSize: 0.12, gapSize: 0.1, transparent: true, opacity: op })); };
      const ref = circ(R0, 0xffffff, 0.35); ref.computeLineDistances(); root.add(ref);
      /* ISS 궤도 */
      const iss = new THREE.Group(); root.add(iss);
      const issRing = circ(R + 400, 0x7dd3fc, 0.8); issRing.computeLineDistances(); iss.add(issRing);
      const issBody = new THREE.Group(); iss.add(issBody);
      issBody.add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.05), new THREE.MeshStandardMaterial({ color: 0xe2e8f0 })));
      const pan = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.01, 0.34), new THREE.MeshStandardMaterial({ color: 0x3b82f6 })); issBody.add(pan);
      const issLab = label('국제 우주 정거장', issBody, { offset: [0, -0.32, 0], color: 'rgba(14,116,144,.9)' });
      iss.visible = false; issLab.show(false);
      /* 경로 · 공 · 화살표 */
      const trail = new THREE.Group(); root.add(trail);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.09, 20, 14), new THREE.MeshStandardMaterial({ color: 0xff7a1a, emissive: 0xff5a00, emissiveIntensity: 0.5 }));
      root.add(ball);
      const velA = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 1, 0x22c55e, 0.3, 0.2);
      const grvA = new THREE.ArrowHelper(new THREE.Vector3(0, -1, 0), new THREE.Vector3(), 1, 0xef4444, 0.3, 0.2);
      root.add(velA, grvA);
      const velT = new THREE.Object3D(), grvT = new THREE.Object3D(); root.add(velT, grvT);
      const velLab = label('속도', velT, { color: 'rgba(21,128,61,.92)' }), grvLab = label('중력', grvT, { color: 'rgba(185,28,28,.92)' });
      const hitMark = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.24, 28), new THREE.MeshBasicMaterial({ color: 0xffd34d, side: THREE.DoubleSide })); hitMark.visible = false; root.add(hitMark);
      const hitLab = label('', hitMark, { offset: [0, -0.45, 0], color: 'rgba(124,45,18,.9)' });
      /* 상태 */
      let tubeR = 0.03, v = 7.0, sh = predict(v), clock = 0, playSec = 10, issOn = false, tgt = null, rv = null, sc = 1;
      const PMK = 5070 / 10;                                                   // 원 궤도 한 바퀴를 10초로 보여 주는 배속

      function readLesson() { try { const s = window.__sim && window.__sim.S; if (s && typeof s.v === 'number') return Math.max(1, Math.min(12, s.v)); } catch (e) {} return null; }
      const MSG = {
        impact: () => '<b>떨어져요 (낙하)</b>: 중력이 이기고 속도가 모자라 지구로 돌아와요.<br>도달 거리 약 <b>' + fmtN(sh.range) + ' km</b>',
        circle: () => '<b>원 궤도</b>: 떨어지는 만큼 지구 표면이 휘어져서 같은 높이로 계속 돌아요.<br>한 바퀴 약 <b>' + Math.round(sh.P / 60) + '분</b>',
        ellipse: () => '<b>타원 궤도</b>: 지구를 한 바퀴 돌아요.<br>가장 낮은 곳 ' + fmtN(sh.rp - R) + ' km · 가장 높은 곳 ' + (sh.ra - R > 99999 ? '약 ' + fmtN((sh.ra - R) / 1000) + '천 km' : fmtN(sh.ra - R) + ' km') + (sh.cropped ? '<br>(너무 멀어서 일부만 그렸어요)' : ''),
        escape: () => '<b>탈출</b>: 중력을 이기고 지구에서 계속 멀어져요. (탈출 속력 약 11.2 km/s)',
      };
      function fmtInfo() {
        info('발사 속력 <b>' + v.toFixed(1) + ' km/s</b> (원 궤도 속력 ' + VC.toFixed(1) + ' km/s)<br>' + MSG[sh.cls]() +
          '<br><span style="color:#fca5a5">빨간 화살표</span> = 중력(항상 지구 중심 쪽) · <span style="color:#86efac">초록 화살표</span> = 속도');
      }
      function build() {
        while (trail.children.length) { const c = trail.children[0]; trail.remove(c); c.geometry.dispose(); }
        const n = sh.path.length, step = Math.max(1, Math.floor(n / 500)), pts = [];
        for (let i = 0; i < n; i += step) pts.push(P3(sh.path[i].x, sh.path[i].y));
        pts.push(P3(sh.path[n - 1].x, sh.path[n - 1].y));
        const col = { impact: 0xfb923c, circle: 0x4ade80, ellipse: 0xc084fc, escape: 0xfacc15 }[sh.cls];
        hitMark.visible = sh.cls === 'impact';
        if (sh.hit) { const hp = P3(sh.hit[0], sh.hit[1]); hitMark.position.copy(hp.clone().multiplyScalar(1.0005)); hitMark.lookAt(hp.clone().multiplyScalar(2)); hitLab.set('낙하 지점'); }
        hitLab.show(sh.cls === 'impact');
        playSec = sh.closed ? Math.max(5, Math.min(16, sh.tEnd / PMK)) : Math.max(4, Math.min(12, sh.tEnd / PMK));
        clock = 0; fmtInfo();
        // 화면 맞추기: 떨어지는 경로는 경로에 확대, 그 밖은 지구 전체가 보이게
        let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
        sh.path.forEach((q) => { x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); });
        if (sh.cls !== 'impact') { x0 = Math.min(x0, -R); x1 = Math.max(x1, R); y0 = Math.min(y0, -R); y1 = Math.max(y1, R); }
        const size = Math.max(x1 - x0, y1 - y0) * K;
        const dist = sh.cls === 'impact' ? Math.max(0.3, size * 2.6) : Math.max(10.5, Math.min(60, size * 1.6 + 3));
        tgt = { tx: (x0 + x1) / 2 * K, ty: (y0 + y1) / 2 * K, dist };
        tubeR = 0.0034 * dist;
        // 선 두께는 확대 정도에 맞춰 다시 만들어요
        const old = trail.children[0]; if (old) { trail.remove(old); old.geometry.dispose(); }
        if (pts.length > 2) trail.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), Math.min(600, pts.length * 2), tubeR, 6, false), new THREE.MeshBasicMaterial({ color: col })));
      }
      function setV(x, fromLesson) { v = Math.round(x * 100) / 100; sh = predict(v); build(); if (!fromLesson) rv.set(v); }

      rv = controls.range('발사 속력', 1, 12, 0.1, v, (x) => { v = x; sh = predict(v); build(); }, (x) => x.toFixed(1) + ' km/s');
      controls.button('🔥 다시 발사', () => { clock = 0; });
      controls.button('⭕ 원 궤도 속력', () => { setV(VC); });
      controls.button('🚀 탈출 속력', () => { setV(VESC + 0.05); });
      const ib = controls.button('🛰️ ISS 궤도', () => { issOn = !issOn; ib.classList.toggle('on', issOn); iss.visible = issOn; issLab.show(issOn); });
      const l0 = readLesson(); if (l0 != null) { v = l0; sh = predict(v); rv.set(v); }
      build();
      ctx.camera.near = 0.01; ctx.camera.updateProjectionMatrix();
      orbit.dist = tgt.dist; orbit.tx = tgt.tx; orbit.ty = tgt.ty; tgt = null;
      const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();

      return {
        update(dt) {
          clock += dt;
          const ph = sh.closed ? ((clock / playSec) % 1) : Math.min(1, (clock % (playSec + 1.2)) / playSec);
          const q = posAt(sh, ph * sh.tEnd), pos = P3(q.x, q.y);
          ball.position.copy(pos);
          const sp = Math.hypot(q.vx, q.vy) || 1;
          tmpA.set(q.vx / sp, q.vy / sp, 0);
          velA.position.copy(pos); velA.setDirection(tmpA); const vl = (0.7 + 1.1 * sp / 11) * sc * 1.5; velA.setLength(vl, 0.3 * sc, 0.2 * sc);
          velT.position.copy(pos).addScaledVector(tmpA, vl + 0.18 * sc);
          const r = Math.hypot(q.x, q.y); tmpB.set(-q.x / r, -q.y / r, 0);
          const gl = (0.3 + 1.2 * Math.pow(R / r, 2)) * sc * 1.4; grvA.position.copy(pos); grvA.setDirection(tmpB); grvA.setLength(gl, 0.3 * sc, 0.2 * sc);
          grvT.position.copy(pos).addScaledVector(tmpB, gl + 0.2 * sc);
          grvLab.set('중력 ' + gAt(r).toFixed(1) + ' m/s²');
          if (issOn) { const a = (clock / (2 * Math.PI * (R + 400) / Math.sqrt(MU / (R + 400)) / PMK)) * Math.PI * 2; issBody.position.set(Math.sin(a) * (R + 400) * K, Math.cos(a) * (R + 400) * K, 0); issBody.rotation.z = -a; issLab.set('국제 우주 정거장 · g=' + gAt(R + 400).toFixed(1)); }
          if (tgt) {
            const k = Math.min(1, dt * 3.5), d = tgt.dist - orbit.dist;
            orbit.dist += Math.abs(d) < 0.02 * tgt.dist ? d : d * k; orbit.tx += (tgt.tx - orbit.tx) * k; orbit.ty += (tgt.ty - orbit.ty) * k;
            if (Math.abs(d) < 0.003 * tgt.dist) tgt = null;
          }
          sc = Math.max(0.02, Math.min(1.2, orbit.dist / 12));
          ball.scale.setScalar(sc * 1.4); cannon.scale.setScalar(sc); cannon.position.copy(PIV).multiplyScalar(1 - sc);
          cannonLab.obj.position.copy(PIV); cannonLab.off = [-0.1 * sc, 0.5 * sc + 0.02, 0]; hitMark.scale.setScalar(sc); hitLab.off = [0, -0.45 * sc, 0];
          velLab.off = [0, 0, 0];
          issBody.scale.setScalar(Math.max(0.5, sc));
        },
        sync() { const l = readLesson(); if (l != null) { v = l; sh = predict(v); rv.set(v); build(); } },
      };
    },
  });
})();
