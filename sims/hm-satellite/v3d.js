/* hm-satellite · 3D 인공위성의 궤도
   ① 저궤도·극궤도: 같은 고도의 원 궤도라도 궤도면이 다르면 지구 위를 지나는 길이 달라요 (지구는 자전해요).
   ② 정지 위성: 주기 24시간 · 자전과 같은 방향 · 적도 상공 → 지상에서 정지해 보여요. 고도·궤도면을 바꿔 확인해요.
   원 궤도만 다뤄요 (v = √(GM/r), T = 2πr/v). 수업의 정지 위성 장면(고도·궤도면)을 읽어 시작해요(읽기 전용). */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const GN = 6.67e-11, ME = 5.972e24, RE = 6370;                 // km
  const GM = GN * ME / 1e9;                                       // km³/s²
  const T_SID = 86164;                                            // 지구 자전 주기 (s)
  const WE = 2 * Math.PI / T_SID;
  const GEO_R = Math.cbrt(GM * T_SID * T_SID / (4 * Math.PI * Math.PI)), GEO_H = GEO_R - RE;
  const ER = 3, K = ER / RE, D2R = Math.PI / 180;
  const vcirc = (r) => Math.sqrt(GM / r), per = (r) => 2 * Math.PI * Math.sqrt(r * r * r / GM);
  const fmtN = (n) => Math.round(n).toLocaleString('ko-KR');
  const hm = (s) => { const m = Math.round(s / 60); return m < 180 ? m + '분' : Math.floor(m / 60) + '시간 ' + (m % 60) + '분'; };

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

  window.SciSim3D.attach({
    button: null,
    title: '인공위성 궤도 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: 11, theta: 0.7, phi: 1.1, min: 5, max: 100 },
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls, orbit, renderer } = ctx;
      const ctlEl = renderer.domElement.closest('.v3-wrap').querySelector('.v3-ctl');
      const grab = (fn) => { const b = ctlEl.children.length; fn(); return [...ctlEl.children].slice(b); };
      const earth = new THREE.Group(); root.add(earth);
      const tex = new THREE.CanvasTexture(earthCanvas()); if ('encoding' in tex) tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 4;
      earth.add(new THREE.Mesh(new THREE.SphereGeometry(ER, 72, 48), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 })));
      const eqLine = (r, col, op, dashed) => { const p = []; for (let i = 0; i <= 120; i++) { const a = i / 120 * Math.PI * 2; p.push(new THREE.Vector3(Math.cos(a) * r, 0, -Math.sin(a) * r)); } const g = new THREE.BufferGeometry().setFromPoints(p); const l = new THREE.Line(g, dashed ? new THREE.LineDashedMaterial({ color: col, dashSize: 0.18, gapSize: 0.12, transparent: true, opacity: op }) : new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: op })); if (dashed) l.computeLineDistances(); return l; };
      earth.add(eqLine(ER * 1.003, 0xffffff, 0.55, false));                         // 적도
      const axis = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -ER * 1.35, 0), new THREE.Vector3(0, ER * 1.5, 0)]), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 }));
      earth.add(axis);
      const north = label('북극 ↑', [0, ER * 1.6, 0], { color: 'rgba(12,18,34,.8)' });
      // 자전 방향: 북극 위에서 내려다볼 때 반시계 방향 (서 → 동)
      const RA = ER * 0.55, A1 = Math.PI * 1.5;
      const rotAr = new THREE.Mesh(new THREE.TorusGeometry(RA, 0.03, 8, 60, A1), new THREE.MeshBasicMaterial({ color: 0xffd34d }));
      rotAr.rotation.x = -Math.PI / 2; rotAr.position.y = ER * 1.25; root.add(rotAr);
      const rotHead = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.28, 14), new THREE.MeshBasicMaterial({ color: 0xffd34d }));
      rotHead.position.set(Math.cos(A1) * RA, ER * 1.25, -Math.sin(A1) * RA);
      rotHead.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(-Math.sin(A1), 0, -Math.cos(A1)));
      root.add(rotHead);
      const rotLab = label('자전 (서 → 동)', [Math.cos(0.5) * RA, ER * 1.25 + 0.3, -Math.sin(0.5) * RA], { color: 'rgba(120,80,0,.9)' });
      /* 궤도와 위성 */
      const makeSat = (col) => {
        const g = new THREE.Group();
        g.add(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), new THREE.MeshStandardMaterial({ color: col, roughness: 0.4, metalness: 0.4 })));
        const pn = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.015, 0.2), new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.3, metalness: 0.5, emissive: 0x1d4ed8, emissiveIntensity: 0.4 })); g.add(pn);
        root.add(g); return g;
      };
      const ring = (col) => { const l = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: col })); root.add(l); return l; };
      const S1 = { name: '저궤도 위성', col: 0x22d3ee, hex: 'rgba(14,116,144,.92)', inc: 51.6, ring: ring(0x22d3ee), mesh: makeSat(0x67e8f9), u0: 0.6 };
      const S2 = { name: '극궤도 위성', col: 0xe879f9, hex: 'rgba(134,25,143,.92)', inc: 90, ring: ring(0xe879f9), mesh: makeSat(0xf0abfc), u0: 2.2 };
      const S3 = { name: '정지 위성', col: 0xfacc15, hex: 'rgba(133,77,14,.92)', inc: 0, ring: ring(0xfacc15), mesh: makeSat(0xfde68a), u0: 0.6 };
      const sats = [S1, S2, S3], NTR = 4500;
      sats.forEach((s) => { s.lab = label(s.name, s.mesh, { color: s.hex, offset: [0, 0.5, 0] }); s.n = 0; s.buf = new Float32Array(3 * NTR); s.attr = new THREE.BufferAttribute(s.buf, 3); s.attr.setUsage(THREE.DynamicDrawUsage); const tg = new THREE.BufferGeometry(); tg.setAttribute('position', s.attr); tg.setDrawRange(0, 0); s.trail = new THREE.Points(tg, new THREE.PointsMaterial({ color: s.col, size: 3.2, sizeAttenuation: false })); s.trail.frustumCulled = false; earth.add(s.trail); });
      /* 지상 관측점 */
      const pin = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10), new THREE.MeshBasicMaterial({ color: 0xff3b30 })); earth.add(pin);
      const pinLab = label('지상 관측자', pin, { color: 'rgba(185,28,28,.92)', offset: [0, -0.4, 0] });
      const sightG = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 1, 0)]);
      const sight = new THREE.Line(sightG, new THREE.LineDashedMaterial({ color: 0xff8a80, dashSize: 0.3, gapSize: 0.2 })); root.add(sight);
      const velA = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 1, 0x22c55e, 0.3, 0.2), grvA = new THREE.ArrowHelper(new THREE.Vector3(0, -1, 0), new THREE.Vector3(), 1, 0xef4444, 0.3, 0.2);
      root.add(velA, grvA);

      /* 상태 */
      let zoomIn = false, mode = 'low', h = 400, hG = 20000, incG = 0, speed = 1, t = 0, sc = 1, tgt = null, sample = 0;
      const TS = [0, 1440, 4000];
      const rOf = () => RE + (mode === 'low' ? h : hG);
      function planePt(inc, u, r, out) { const i = inc * D2R; return out.set(r * K * Math.cos(u), r * K * Math.sin(u) * Math.sin(i), -r * K * Math.sin(u) * Math.cos(i)); }
      let tubeR = 0.03;
      function ringGeo(inc, r) { const p = []; for (let i = 0; i < 120; i++) p.push(planePt(inc, i / 120 * Math.PI * 2, r, new THREE.Vector3())); return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(p, true), 240, tubeR, 6, true); }
      function clearTrails() { sats.forEach((s) => { s.n = 0; s.trail.geometry.setDrawRange(0, 0); }); }
      function configure() {
        const low = mode === 'low';
        S1.ring.visible = S1.mesh.visible = S2.ring.visible = S2.mesh.visible = low; S1.lab.show(low); S2.lab.show(low);
        S3.ring.visible = S3.mesh.visible = !low; S3.lab.show(!low); pin.visible = !low; pinLab.show(!low); sight.visible = !low;
        const r = rOf();
        const asp = Math.min(1.3, renderer.domElement.clientWidth / Math.max(1, renderer.domElement.clientHeight)), dist0 = low ? (asp < 0.9 ? 17 : 11) : Math.max(14, Math.min(95, r * K * 1.28 / (0.414 * asp)));
        tubeR = 0.0034 * dist0;
        if (low) { S1.r = S2.r = r; S1.ring.geometry.dispose(); S1.ring.geometry = ringGeo(S1.inc, r); S2.ring.geometry.dispose(); S2.ring.geometry = ringGeo(S2.inc, r); }
        else { S3.inc = incG; S3.r = r; S3.ring.geometry.dispose(); S3.ring.geometry = ringGeo(incG, r); S3.name = incG === 0 ? '정지 위성 후보 (적도 궤도)' : '극궤도 위성 (같은 고도)'; S3.lab.set(incG === 0 ? '인공위성 (적도 궤도)' : '인공위성 (극궤도)'); }
        clearTrails();
        gLow.forEach((n) => (n.style.display = low ? '' : 'none')); gGeo.forEach((n) => (n.style.display = low ? 'none' : ''));
        tgt = { dist: dist0 };
        // 관측자는 처음에 위성 바로 아래 (적도)
        pin.position.set(Math.cos(S3.u0) * ER * 1.002, 0, -Math.sin(S3.u0) * ER * 1.002);
        fmtInfo();
      }
      function fmtInfo() {
        const r = rOf(), v = vcirc(r), T = per(r), nday = 86400 / T;
        if (mode === 'low') {
          info('고도 <b>' + fmtN(h) + ' km</b> → r = ' + fmtN(r) + ' km<br>속력 v = √(GM/r) = <b>' + v.toFixed(2) + ' km/s</b> · 주기 T = <b>' + hm(T) + '</b><br>하루에 지구를 약 <b>' + nday.toFixed(1) + '바퀴</b> 돌아요.<br><span style="color:#67e8f9">하늘색</span>(경사 51.6°, ISS처럼)은 위도 ±51.6° 사이만, <span style="color:#f0abfc">분홍색</span>(극궤도)은 북극과 남극을 지나요. 지구가 자전해서 자취가 매번 달라져요.');
        } else {
          const stat = Math.abs(T - T_SID) < 120 && incG === 0, geoish = Math.abs(T - T_SID) < 120;
          const rel = T < T_SID ? '위성이 더 빨라서 지상에서 보면 <b>동쪽으로 흘러가요</b>' : '위성이 더 느려서 지상에서 보면 <b>서쪽으로 뒤처져요</b>';
          info('고도 <b>' + fmtN(hG) + ' km</b> · 속력 <b>' + v.toFixed(2) + ' km/s</b> · 주기 <b>' + (T / 3600).toFixed(1) + '시간</b> (자전 24시간)<br>' +
            (stat ? '<b style="color:#86efac">지상에서 정지해 보여요!</b> 적도 상공 · 자전과 같은 방향 · 주기 24시간<br>고도 약 ' + (GEO_H / 10000).toFixed(1) + '만 km (r = 4.22×10⁴ km)' : (incG !== 0 ? (geoish ? '주기는 24시간이지만 <b>극궤도</b>라 남북으로 오가며 한 곳에 머물지 못해요.' : rel) : (geoish ? '' : rel))));
        }
      }
      function readLesson() { try { const S = window.__sim && window.__sim.S; if (S && S.ge) return { mode: S.mode === 'geo' ? 'geo' : null, h: S.ge.h, inc: S.ge.inc === 90 ? 90 : 0 }; } catch (e) {} return null; }

      const segMode = controls.segment('보기', [{ value: 'low', label: '🛰️ 저궤도·극궤도' }, { value: 'geo', label: '📡 정지 위성' }], mode, (v) => { mode = v; configure(); });
      let rLow, rGeo, segInc;
      const gLow = grab(() => { rLow = controls.range('고도 h', 200, 2000, 50, h, (x) => { h = x; configure(); }, (x) => fmtN(x) + ' km'); });
      const gGeo = grab(() => {
        rGeo = controls.range('고도 h', 20000, 50000, 100, hG, (x) => { hG = x; configure(); }, (x) => fmtN(x) + ' km');
        controls.button('📡 24시간 주기 고도', () => { hG = Math.round(GEO_H / 100) * 100; rGeo.set(hG); configure(); });
        segInc = controls.segment('궤도면', [{ value: 0, label: '적도면' }, { value: 90, label: '극궤도' }], incG, (v) => { incG = v; configure(); });
      });
      controls.segment('시간', [{ value: 0, label: '⏸' }, { value: 1, label: '▶' }, { value: 2, label: '⏩' }], speed, (v) => { speed = v; });
      const l0 = readLesson(); if (l0) { if (l0.mode) { mode = l0.mode; segMode.set(mode); } hG = Math.max(20000, Math.min(50000, Math.round(l0.h / 100) * 100)); incG = l0.inc; rGeo.set(hG); segInc.set(incG); }
      configure();
      orbit.dist = tgt.dist; tgt = null;
      const tA = new THREE.Vector3(), tB = new THREE.Vector3(), tC = new THREE.Vector3(), mat = new THREE.Matrix4();

      function place(s, u) {
        planePt(s.inc, u, s.r, s.mesh.position);
        // 위성 본체의 방향: 지구 쪽을 향해 두기
        s.mesh.lookAt(0, 0, 0);
        s.mesh.scale.setScalar(sc);
      }
      let sized = false;
      return {
        update(dt) {
          if (!sized) { sized = true; configure(); orbit.dist = tgt ? tgt.dist : orbit.dist; tgt = null; }
          t += dt * TS[speed];
          earth.rotation.y = WE * t;
          if (tgt) { const d = tgt.dist - orbit.dist; orbit.dist += d * Math.min(1, dt * 3); if (Math.abs(d) < 0.02 * tgt.dist) tgt = null; }
          sc = Math.max(1.3, orbit.dist / 12 * 1.1);
          const near = orbit.dist < 26; north.show(near); rotLab.show(near); pinLab.show(mode === 'geo' && near);
          const act = mode === 'low' ? [S1, S2] : [S3];
          act.forEach((s) => {
            const r = s.r || rOf(), u = s.u0 + 2 * Math.PI * t / per(r);
            place(s, u);
            sample += dt;
          });
          // 자취: 위성 바로 아래 지표면 점 (지구 좌표)
          if (sample > 0.013 && TS[speed] > 0) {
            sample = 0;
            act.forEach((s) => {
              tA.copy(s.mesh.position).normalize().multiplyScalar(ER * 1.004);
              tB.copy(tA); tB.applyAxisAngle(new THREE.Vector3(0, 1, 0), -earth.rotation.y);
              if (s.n >= NTR) { s.buf.copyWithin(0, 3); s.n = NTR - 1; }
              s.buf[3 * s.n] = tB.x; s.buf[3 * s.n + 1] = tB.y; s.buf[3 * s.n + 2] = tB.z; s.n++;
              s.attr.needsUpdate = true; s.trail.geometry.setDrawRange(0, s.n);
            });
          }
          // 화살표 (선택된 위성 하나: 저궤도에서는 극궤도 위성, 정지 위성 모드에서는 그 위성)
          const A = mode === 'low' ? S1 : S3;
          const r = A.r || rOf(), u = A.u0 + 2 * Math.PI * t / per(r);
          const pos = A.mesh.position;
          tA.set(-Math.sin(u), Math.cos(u) * Math.sin(A.inc * D2R), -Math.cos(u) * Math.cos(A.inc * D2R)).normalize();
          velA.position.copy(pos); velA.setDirection(tA); velA.setLength(1.1 * sc, 0.35 * sc, 0.25 * sc);
          tB.copy(pos).normalize().negate(); grvA.position.copy(pos); grvA.setDirection(tB); grvA.setLength(1.1 * sc, 0.35 * sc, 0.25 * sc);
          // 지상 관측자 → 위성 시선
          if (mode === 'geo') {
            pin.getWorldPosition(tC);
            const pa = sight.geometry.attributes.position; pa.setXYZ(0, tC.x, tC.y, tC.z); pa.setXYZ(1, pos.x, pos.y, pos.z); pa.needsUpdate = true; sight.computeLineDistances();
          }
          pin.scale.setScalar(Math.max(1, sc * 0.8));
        },
        sync() { const l = readLesson(); if (l) { if (l.mode && l.mode !== mode) { mode = l.mode; segMode.set(mode); } hG = Math.max(20000, Math.min(50000, Math.round(l.h / 100) * 100)); incG = l.inc; rGeo.set(hG); segInc.set(incG); configure(); } },
      };
    },
  });
})();
