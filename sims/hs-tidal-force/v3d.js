/* hs-tidal-force · 3D 기조력과 평형 조석
   바다는 달 쪽과 반대쪽 두 곳에서 부풀어요(평형 조석). 지구가 자전하면 한 지점이 두 부풀음을 차례로 지나가요(하루 2번 만조).
   달의 위치(삭·상현·망·하현)를 바꾸면 태양의 부풀음과 겹치거나(사리) 어긋나요(조금).
   조차: 달만 0.49 m, 태양만 0.23 m, 합성 = √(Hm² + Hs² + 2·Hm·Hs·cos 2θ).  수업의 날짜를 읽어 시작해요(읽기 전용).
   부풀음의 높이와 물의 두께는 눈에 보이게 크게 과장했어요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const HM = 0.49, HS = 0.23, SYN = 29.5, DR = 384400 / 6371;
  const RS = 1.72, RO = 2.0, KV = 0.55;                          // 땅·바다 반지름, 높이 과장(단위/m)
  const DEG = Math.PI / 180;
  const rangeAt = (th) => Math.sqrt(HM * HM + HS * HS + 2 * HM * HS * Math.cos(2 * th));
  const phaseName = (d) => { const near = (x) => Math.abs(d - x) <= 0.8; return near(0) || near(SYN) ? '삭 (새달)' : near(SYN / 4) ? '상현' : near(SYN / 2) ? '망 (보름달)' : near(SYN * 0.75) ? '하현' : d < SYN / 2 ? (d < SYN / 4 ? '초승달 쪽' : '보름 전') : (d < SYN * 0.75 ? '보름 후' : '그믐 쪽'); };

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
      if (v > 0.5) { const h = Math.min(1, (v - 0.5) * 4); c = [96 + 60 * h, 150 - 30 * h, 84]; } else { const h = Math.min(1, (0.5 - v) * 4); c = [50 + 20 * h, 110 + 30 * h, 170 + 30 * h]; }
      im.data[o] = c[0]; im.data[o + 1] = c[1]; im.data[o + 2] = c[2]; im.data[o + 3] = 255;
    }
    g.putImageData(im, 0, 0); return cv;
  }

  window.SciSim3D.attach({
    title: '기조력과 평형 조석 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHONE ? 20 : 15, theta: PHONE ? -1.25 : 0.35, phi: PHONE ? 0.8 : 0.7, target: PHONE ? [0, 0, 0] : [1.8, 0, 0], min: 7, max: 40 },
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const Y = new THREE.Vector3(0, 1, 0);
      /* 지구: 땅(자전) + 바다(달·태양 방향에 고정) */
      const earth = new THREE.Group(); root.add(earth);
      const tex = new THREE.CanvasTexture(earthCanvas()); if ('encoding' in tex) tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 4;
      earth.add(new THREE.Mesh(new THREE.SphereGeometry(RS, 64, 44), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 })));
      const oceanGeo = new THREE.SphereGeometry(RO, 72, 48);
      const base = oceanGeo.attributes.position.array.slice();
      const ocean = new THREE.Mesh(oceanGeo, new THREE.MeshStandardMaterial({ color: 0x2f8be0, transparent: true, opacity: 0.66, roughness: 0.25, metalness: 0.1, depthWrite: false }));
      root.add(ocean);
      /* 달 · 태양 */
      const moon = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 20), new THREE.MeshStandardMaterial({ color: 0xd6d9e0, roughness: 1 })); root.add(moon);
      const sun = new THREE.Mesh(new THREE.SphereGeometry(1.0, 32, 20), new THREE.MeshBasicMaterial({ color: 0xffc933 })); sun.position.set(8.8, 0, 0); root.add(sun);
      const sunGlow = new THREE.Mesh(new THREE.SphereGeometry(1.4, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffa500, transparent: true, opacity: 0.25, depthWrite: false })); sunGlow.position.copy(sun.position); root.add(sunGlow);
      const MR = 4.8;
      const orbitLine = (() => { const p = []; for (let i = 0; i <= 120; i++) { const a = i / 120 * Math.PI * 2; p.push(new THREE.Vector3(Math.cos(a) * MR, 0, -Math.sin(a) * MR)); } const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(p), new THREE.LineDashedMaterial({ color: 0xcbd5e1, dashSize: 0.25, gapSize: 0.2, transparent: true, opacity: 0.6 })); l.computeLineDistances(); root.add(l); return l; })();
      const mkLine = (col, len) => { const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(1, 0, 0)]), new THREE.LineDashedMaterial({ color: col, dashSize: 0.3, gapSize: 0.2, transparent: true, opacity: 0.85 })); root.add(l); return l; };
      const sunLine = mkLine(0xffb020), moonLine = mkLine(0xffffff);
      sunLine.geometry.setFromPoints([new THREE.Vector3(-3.4, 0, 0), new THREE.Vector3(7.6, 0, 0)]); sunLine.computeLineDistances();
      const labSun = label('태양', sun, { offset: [0, 1.5, 0], color: 'rgba(146,64,14,.92)' });
      const labMoon = label('달', moon, { offset: [0, 0.75, 0], color: 'rgba(30,41,59,.9)' });
      /* 지구 자전 · 달 공전 방향 화살표 */
      const arrowArc = (r, y, a0, a1, col, headSize) => {
        const g = new THREE.Group(), pts = []; for (let i = 0; i <= 24; i++) { const a = a0 + (a1 - a0) * i / 24; pts.push(new THREE.Vector3(Math.cos(a) * r, 0, -Math.sin(a) * r)); }
        g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.04, 6, false), new THREE.MeshBasicMaterial({ color: col })));
        const e = pts[pts.length - 1], tan = new THREE.Vector3(-Math.sin(a1), 0, -Math.cos(a1));
        const head = new THREE.Mesh(new THREE.ConeGeometry(headSize, headSize * 2.4, 14), new THREE.MeshBasicMaterial({ color: col })); head.position.copy(e); head.quaternion.setFromUnitVectors(Y, tan); g.add(head);
        g.position.y = y; root.add(g); return g;
      };
      arrowArc(1.0, RO + 0.5, 0.3, 4.4, 0xffd34d, 0.13);
      const labRot = label('자전 (서→동)', [Math.cos(0.9) * 1.0 + 0.5, RO + 0.85, -Math.sin(0.9) * 1.0], { color: 'rgba(120,80,0,.9)', size: 11.5 });
      arrowArc(MR + 0.8, 0, 0.5, 1.2, 0xe2e8f0, 0.15);
      const labOrb = label('달의 공전', [Math.cos(0.85) * (MR + 1.4), 0.2, -Math.sin(0.85) * (MR + 1.4)], { color: 'rgba(30,41,59,.85)', size: 11.5 });
      /* 관측점 + 부표 */
      const pinDir = new THREE.Vector3(1, 0, 0);
      const pin = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), new THREE.MeshBasicMaterial({ color: 0xff3b30 })); earth.add(pin); pin.position.copy(pinDir).multiplyScalar(RS);
      const buoy = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), new THREE.MeshStandardMaterial({ color: 0xff7a1a, emissive: 0xff4500, emissiveIntensity: 0.35 })); root.add(buoy);
      const stem = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(1, 0, 0)]), new THREE.LineBasicMaterial({ color: 0xff3b30 })); root.add(stem);
      const labBuoy = label('', buoy, { offset: [0, -0.45, 0], color: 'rgba(124,45,18,.92)' });
      /* 기조력 화살표 (달의 기조력 = 그 지점의 달의 인력 − 지구 중심의 평균 인력) */
      const arrows = [], KT = 26;
      const arrowG = new THREE.Group(); root.add(arrowG);
      let wantArrows = true, sunOn = true, playing = true, day = 0, dayV = 0, spin = 0;
      const mdir = new THREE.Vector3(), sdir = new THREE.Vector3(1, 0, 0);
      const arrowPts = [];                                         // 달 방향을 기준으로 한 점 (축에 대한 각, 방위각)
      [0, 20, 40, 60, 80, 100, 120, 140, 160, 180].forEach((pol) => { [0, 90, 180, 270].forEach((az) => { if ((pol === 0 || pol === 180) && az > 0) return; arrowPts.push([pol * DEG, az * DEG]); }); });
      arrowPts.forEach(() => { const a = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 1, 0xfb7185, 0.14, 0.1); arrowG.add(a); arrows.push(a); });
      const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), pv = new THREE.Vector3(), dv = new THREE.Vector3(), fv = new THREE.Vector3();
      function placeArrows() {
        // 달 방향 mdir을 축으로 한 좌표계
        e1.copy(Y).cross(mdir); if (e1.lengthSq() < 1e-6) e1.set(0, 0, 1); e1.normalize(); e2.copy(mdir).cross(e1).normalize();
        arrowPts.forEach(([pol, az], i) => {
          pv.copy(mdir).multiplyScalar(Math.cos(pol)).addScaledVector(e1, Math.sin(pol) * Math.cos(az)).addScaledVector(e2, Math.sin(pol) * Math.sin(az));   // 단위 벡터
          dv.copy(mdir).multiplyScalar(DR).sub(pv);                       // 달 → 지표 점
          const r = dv.length(), k = (DR * DR) / (r * r * r);
          fv.copy(dv).multiplyScalar(k).sub(mdir);                        // 기조력 (달 인력 − 중심의 평균 인력)
          const len = fv.length() * KT * RO, A = arrows[i];
          A.position.copy(pv).multiplyScalar(RO * 1.02);
          if (len < 0.02) { A.visible = false; return; }
          A.visible = wantArrows; A.setDirection(fv.clone().normalize()); A.setLength(Math.max(0.12, len), Math.min(0.2, len * 0.45), Math.min(0.12, len * 0.3));
        });
      }
      /* 바다 모양 (평형 조석) */
      const pos = oceanGeo.attributes.position;
      function shapeOcean() {
        const aM = HM / 2 * KV, aS = HS / 2 * KV;
        for (let i = 0; i < pos.count; i++) {
          const x = base[3 * i] / RO, y = base[3 * i + 1] / RO, z = base[3 * i + 2] / RO;
          const dm = x * mdir.x + y * mdir.y + z * mdir.z, ds = x * sdir.x + y * sdir.y + z * sdir.z;
          const h = aM * (2 * dm * dm - 1) + (sunOn ? aS * (2 * ds * ds - 1) : 0);
          const r = RO + h;
          pos.setXYZ(i, x * r, y * r, z * r);
        }
        pos.needsUpdate = true; oceanGeo.computeVertexNormals();
      }
      function tideAt(dir) {
        const dm = dir.dot(mdir), ds = dir.dot(sdir);
        return (HM / 2) * (2 * dm * dm - 1) + (sunOn ? (HS / 2) * (2 * ds * ds - 1) : 0);   // m
      }
      const labNear = label('달 쪽 부풀음', [0, 0, 0], { color: 'rgba(30,64,175,.92)' }), labFar = label('반대쪽 부풀음', [0, 0, 0], { color: 'rgba(30,64,175,.92)' });
      /* 상태 갱신 */
      let thV = 0, thT = 0;
      function setDay(d, fromLesson) {
        day = Math.max(0, Math.min(SYN, d)); thT = (360 * day / SYN) * DEG;
        if (rDay) rDay.set(day);
        segPh.set(null); [0, 7.4, 14.8, 22.1].forEach((v) => { if (Math.abs(v - day) < 0.26) segPh.set(v); });
        fmtInfo();
      }
      function fmtInfo() {
        const th = thT, rg = sunOn ? rangeAt(th) : HM, spring = sunOn && rg >= 0.7, neap = sunOn && rg <= 0.28;
        let h = '<b>' + day.toFixed(1) + '일 · ' + phaseName(day) + '</b> — 바다가 <b>달 쪽</b>과 <b>반대쪽</b> 두 곳에서 부풀어요.<br>';
        h += sunOn ? (spring ? '달·태양 부풀음이 <b>겹쳐요</b> → <span style="color:#fca5a5">사리(대조)</span>' : neap ? '달·태양 부풀음이 <b>어긋나요</b> → <span style="color:#93c5fd">조금(소조)</span>' : '달과 태양의 부풀음이 일부만 겹쳐요') + ' · 조차 <b>' + rg.toFixed(2) + ' m</b>' : '태양을 끄고 달만 보면 조차 <b>0.49 m</b>';
        h += '<br>지구가 자전하면 관측점이 두 부풀음을 지나 <b>하루 약 2번 만조</b>예요. <span style="color:#fda4af">분홍 화살표</span> = 기조력';
        info(h);
      }
      let rDay = null;
      const segPh = controls.segment('달 위치', [{ value: 0, label: '🌑 삭' }, { value: 7.4, label: '🌓 상현' }, { value: 14.8, label: '🌕 망' }, { value: 22.1, label: '🌗 하현' }], 0, (v) => setDay(v));
      rDay = controls.range('날짜', 0, SYN, 0.5, 0, (v) => setDay(v), (v) => v.toFixed(1) + '일');
      const sb = controls.button('☀️ 태양 포함 ✓', () => { sunOn = !sunOn; sb.classList.toggle('on', sunOn); sb.textContent = '☀️ 태양 ' + (sunOn ? '포함 ✓' : '끄기'); sun.visible = sunGlow.visible = sunOn; sunLine.visible = sunOn; labSun.show(sunOn); shapeOcean(); fmtInfo(); }); sb.classList.add('on');
      const ab = controls.button('기조력 화살표 ✓', () => { wantArrows = !wantArrows; ab.classList.toggle('on', wantArrows); ab.textContent = '기조력 화살표 ' + (wantArrows ? '✓' : '✕'); arrowG.visible = wantArrows; }); ab.classList.add('on');
      const pb = controls.button('⏸ 자전', () => { playing = !playing; pb.textContent = playing ? '⏸ 자전' : '▶ 자전'; pb.classList.toggle('on', playing); }); pb.classList.add('on');
      const rd = () => { try { const S = window.__sim && window.__sim.S; if (S && typeof S.day === 'number') return S.day; } catch (e) {} return null; };
      const d0 = rd(); if (d0 != null) { day = d0; } setDay(day);
      thV = thT; let last = [NaN, NaN];

      return {
        update(dt, t) {
          // 달 위치로 천천히 이동 (최단 각도)
          let d = thT - thV; d = Math.atan2(Math.sin(d), Math.cos(d)); thV += d * Math.min(1, dt * 4);
          if (Math.abs(d) < 0.0005) thV = thT;
          mdir.set(Math.cos(thV), 0, -Math.sin(thV));
          moon.position.copy(mdir).multiplyScalar(MR);
          moonLine.geometry.setFromPoints([mdir.clone().multiplyScalar(-3.4), mdir.clone().multiplyScalar(MR - 0.6)]); moonLine.computeLineDistances();
          if (last[0] !== thV || last[1] !== sunOn) { shapeOcean(); placeArrows(); last = [thV, sunOn]; }
          if (playing) spin += 0.55 * dt;
          earth.rotation.y = spin;
          // 부표: 관측점 위의 바다 높이
          pv.copy(pinDir).applyAxisAngle(Y, spin);
          const hm = tideAt(pv);
          buoy.position.copy(pv).multiplyScalar(RO + KV * hm + 0.02);
          const sa = stem.geometry.attributes.position; sa.setXYZ(0, pv.x * RS, pv.y * RS, pv.z * RS); sa.setXYZ(1, buoy.position.x, buoy.position.y, buoy.position.z); sa.needsUpdate = true;
          labBuoy.set('조위 ' + (hm >= 0 ? '+' : '−') + Math.abs(hm).toFixed(2) + ' m' + (Math.abs(hm) > 0.2 ? (hm > 0 ? ' (만조)' : ' (간조)') : ''));
          // 부풀음 이름표 (달 방향의 바다 위)
          const top = RO + KV * tideAt(mdir) + 0.75;
          labNear.obj = [mdir.x * top, mdir.y * top, mdir.z * top]; labFar.obj = [-mdir.x * top, -mdir.y * top, -mdir.z * top];
        },
        sync() { const d = rd(); if (d != null && Math.abs(d - day) > 0.01) setDay(d); },
      };
    },
  });
})();
