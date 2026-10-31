/* m2-earth-system · 3D 지구계와 지권의 층
   ① 지구계: 지권·수권·기권·생물권(+외권)을 하나씩 켜고 끄며 겹쳐 보기
   ② 지권 단면: 지구를 잘라 지각·맨틀·외핵·내핵을 실제 반지름 비율로 확인 (깊이·상태 표시) */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const R = 2;                       // 장면 속 지구 반지름 (= 6400 km)
  const R_KM = 6400;
  const LAYERS = [
    { id: 'crust', name: '지각', state: '고체', a: 0.9945, b: 1.0, color: '#9a7650', depth: '0 ~ 약 35 km', thick: '약 35 km (해양은 약 5 km)', note: '지구에서 가장 얇은 바깥 껍질이에요. 실제 비율로 그리면 겨우 선 하나 정도예요.' },
    { id: 'mantle', name: '맨틀', state: '고체', a: 0.547, b: 0.9945, color: '#e0662a', depth: '약 2900 km까지', thick: '약 2900 km', note: '지권 부피의 대부분을 차지하는 가장 두꺼운 층이에요.' },
    { id: 'outer', name: '외핵', state: '액체', a: 0.203, b: 0.547, color: '#ffb02e', depth: '약 2900 ~ 5100 km', thick: '약 2200 km', note: '지권에서 유일하게 액체인 층이에요.' },
    { id: 'inner', name: '내핵', state: '고체', a: 0, b: 0.203, color: '#ffe48a', depth: '약 5100 ~ 6400 km', thick: '반지름 약 1300 km', note: '지구의 가장 안쪽에 있는 단단한 중심이에요.' },
  ];
  const SPH = [
    { id: 'geo', name: '지권', emoji: '⛰️', color: '#b9803f', desc: '암석과 흙으로 된 땅, 그리고 지구 속' },
    { id: 'hydro', name: '수권', emoji: '💧', color: '#2f80ed', desc: '바다·강·빙하 등 지구에 있는 모든 물' },
    { id: 'atmo', name: '기권', emoji: '☁️', color: '#4fb3ee', desc: '지구를 둘러싼 공기(대기)' },
    { id: 'bio', name: '생물권', emoji: '🌳', color: '#35a755', desc: '지구에 사는 모든 생물' },
    { id: 'space', name: '외권', emoji: '🌙', color: '#7b6cf0', desc: '지구 대기 바깥의 우주 공간' },
  ];

  /* ---- 절차적 지구 무늬 (대륙) ---- */
  function hash3(x, y, z) { let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1274126177); h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967295; }
  const fade = (t) => t * t * (3 - 2 * t);
  function vnoise(x, y, z) {
    const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = fade(x - ix), fy = fade(y - iy), fz = fade(z - iz);
    const l = (a, b, t) => a + (b - a) * t;
    const c = (dx, dy, dz) => hash3(ix + dx, iy + dy, iz + dz);
    return l(l(l(c(0, 0, 0), c(1, 0, 0), fx), l(c(0, 1, 0), c(1, 1, 0), fx), fy), l(l(c(0, 0, 1), c(1, 0, 1), fx), l(c(0, 1, 1), c(1, 1, 1), fx), fy), fz);
  }
  function fbm(x, y, z) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < 5; i++) { s += a * vnoise(x * f + 11.3 * i, y * f, z * f - 7.1 * i); f *= 2; a *= 0.5; } return s; }
  const TW = 512, TH = 256, THR = 0.5;
  let MAP = null;
  function earthMap() {
    if (MAP) return MAP;
    const n = new Float32Array(TW * TH);
    for (let j = 0; j < TH; j++) for (let i = 0; i < TW; i++) {
      const lon = (i / TW) * Math.PI * 2, lat = (0.5 - (j + 0.5) / TH) * Math.PI;
      n[j * TW + i] = fbm(Math.cos(lat) * Math.cos(lon) * 1.7 + 5, Math.sin(lat) * 1.7 + 5, Math.cos(lat) * Math.sin(lon) * 1.7 + 5);
    }
    MAP = n; return n;
  }
  function paint(fn, repeatS) {
    const n = earthMap(), cv = document.createElement('canvas'); cv.width = TW; cv.height = TH;
    const g = cv.getContext('2d'), im = g.createImageData(TW, TH);
    for (let j = 0; j < TH; j++) for (let i = 0; i < TW; i++) {
      const v = n[j * TW + i], lat = Math.abs(0.5 - (j + 0.5) / TH) * 180;
      const c = fn(v, lat, i, j), o = (j * TW + i) * 4;
      im.data[o] = c[0]; im.data[o + 1] = c[1]; im.data[o + 2] = c[2]; im.data[o + 3] = c[3] == null ? 255 : c[3];
    }
    g.putImageData(im, 0, 0); return cv;
  }
  const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

  window.SciSim3D.attach({
    host: PHONE ? '.sc-tall' : '.sc-wide',
    title: '지구계와 지권의 층 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: 8.6, theta: 0.5, phi: 1.2, min: 4, max: 20 },
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls, orbit, renderer } = ctx;
      renderer.localClippingEnabled = true;
      const ctlEl = renderer.domElement.closest('.v3-wrap').querySelector('.v3-ctl');
      const grab = (fn) => { const before = ctlEl.children.length; fn(); return [...ctlEl.children].slice(before); };
      const tex = (cv) => { const t = new THREE.CanvasTexture(cv); if ('encoding' in t) t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t; };

      /* 무늬 */
      const surfCv = paint((v, lat) => {
        if (lat > 74) return mixc([226, 238, 250], [250, 252, 255], (lat - 74) / 16).concat(255);
        if (v > THR) { const h = Math.min(1, (v - THR) * 4); return mixc([76, 166, 84], [150, 128, 84], h).concat(255); }
        return mixc([30, 92, 170], [54, 132, 212], Math.min(1, (THR - v) * 4)).concat(255);
      });
      const rockCv = paint((v, lat) => (v > THR ? mixc([124, 160, 84], [150, 112, 70], Math.min(1, (v - THR) * 4)).concat(255) : mixc([92, 78, 66], [60, 52, 46], Math.min(1, (THR - v) * 4)).concat(255)));
      const hydroCv = paint((v, lat) => (lat > 74 ? [248, 252, 255, 235] : v <= THR ? mixc([44, 122, 214], [20, 78, 168], Math.min(1, (THR - v) * 4)).concat(205) : [0, 0, 0, 0]));
      const bioCv = paint((v, lat, i, j) => {
        if (lat > 74) return [0, 0, 0, 0];
        if (v > THR + 0.02) return [34, 150, 60, 150 + 70 * Math.min(1, (v - THR) * 4)];
        return hash3(i, j, 3) > 0.985 ? [120, 230, 120, 200] : [0, 0, 0, 0];     // 바다의 플랑크톤
      });
      const cloudCv = paint((v, lat, i, j) => {
        const lon = (i / TW) * Math.PI * 2, la = (0.5 - (j + 0.5) / TH) * Math.PI;
        const c = fbm(Math.cos(la) * Math.cos(lon) * 3.2 + 40, Math.sin(la) * 3.2 + 40, Math.cos(la) * Math.sin(lon) * 3.2 + 40);
        return [255, 255, 255, Math.max(0, Math.min(255, (c - 0.5) * 900))];
      });

      /* ===== ① 지구계 (겉모습) ===== */
      const globe = new THREE.Group(); root.add(globe);
      const seg = [96, 64];
      const mk = (rad, mat) => { const m = new THREE.Mesh(new THREE.SphereGeometry(rad, seg[0], seg[1]), mat); globe.add(m); return m; };
      const geoM = mk(R, new THREE.MeshStandardMaterial({ map: tex(rockCv), roughness: 0.95 }));
      const hydM = mk(R * 1.006, new THREE.MeshStandardMaterial({ map: tex(hydroCv), transparent: true, roughness: 0.25, metalness: 0.1, depthWrite: false }));
      const bioM = mk(R * 1.013, new THREE.MeshStandardMaterial({ map: tex(bioCv), transparent: true, roughness: 0.9, depthWrite: false }));
      const cloudM = mk(R * 1.06, new THREE.MeshStandardMaterial({ map: tex(cloudCv), transparent: true, roughness: 1, depthWrite: false }));
      const airM = mk(R * 1.16, new THREE.MeshStandardMaterial({ color: 0x66b8ff, transparent: true, opacity: 0.2, roughness: 0.4, depthWrite: false }));
      const space = new THREE.Group(); root.add(space);
      const moon = new THREE.Mesh(new THREE.SphereGeometry(0.34, 32, 20), new THREE.MeshStandardMaterial({ color: 0xcfd3dc, roughness: 1 }));
      moon.position.set(5.6, 1.3, -2.6); space.add(moon);
      const pts = []; for (let i = 0; i < 450; i++) { const u = Math.random() * 2 - 1, a = Math.random() * 6.283, s = Math.sqrt(1 - u * u), r = 26 + Math.random() * 6; pts.push(r * s * Math.cos(a), r * u, r * s * Math.sin(a)); }
      const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      space.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.16, sizeAttenuation: true })));
      const moonLab = label('달 (외권)', moon, { offset: [0, 0.62, 0], color: 'rgba(123,108,240,.9)' });
      const on = { geo: true, hydro: true, atmo: true, bio: true, space: true };

      /* ===== ② 지권 단면 ===== */
      const cutG = new THREE.Group(); root.add(cutG);
      const shellMat = new THREE.MeshStandardMaterial({ map: tex(surfCv), roughness: 0.9, side: THREE.DoubleSide });
      const shell = new THREE.Mesh(new THREE.SphereGeometry(R, 96, 64), shellMat); cutG.add(shell);
      const capG = new THREE.Group(); cutG.add(capG);
      const AX = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];
      const LEVELS = { oct: [1, 1, 1], quarter: [1, 0, 1], half: [0, 0, 1] };
      let level = 'oct', thickMode = false, sel = 'all';
      const capMats = {};
      LAYERS.forEach((L) => { capMats[L.id] = new THREE.MeshBasicMaterial({ color: L.color, side: THREE.DoubleSide }); });
      const layerLabs = {};
      const labPos = { crust: [0, 0, 0], mantle: [0, 0, 0], outer: [0, 0, 0], inner: [0, 0, 0] };
      LAYERS.forEach((L) => { layerLabs[L.id] = label('', labPos[L.id], { color: 'rgba(12,18,34,.82)' }); });
      const ang = { crust: 74, mantle: 38, outer: 70, inner: 90 }, rad = { crust: 1.075, mantle: 0.8, outer: 0.38, inner: 0.12 };
      const ruler = [['0 km', 1, 0.07], ['2900 km', 0.547, 0.5], ['5100 km', 0.203, 0.0]].map((q) => { const P = [0, 0, 0.02]; const lb = label(q[0], P, { color: 'rgba(60,40,20,.85)', size: 11 }); lb.el.style.padding = '1px 5px'; lb.P = P; lb.r = q[1]; lb.a = q[2]; return lb; });
      function radii(L) { // 두껍게 보기: 지각을 0.93 ~ 1.0 으로 (수업 그림과 같은 비율)
        if (!thickMode) return [L.a, L.b];
        if (L.id === 'crust') return [0.93, 1]; if (L.id === 'mantle') return [L.a, 0.93]; return [L.a, L.b];
      }
      function buildCaps() {
        while (capG.children.length) { const c = capG.children[0]; capG.remove(c); if (c.geometry) c.geometry.dispose(); }
        const C = LEVELS[level];
        // 잘라 낸 부분의 단면 (잘린 축마다 한 평면)
        for (let n = 0; n < 3; n++) {
          if (!C[n]) continue;
          const t1 = (n + 1) % 3, t2 = (n + 2) % 3;
          for (let q = 0; q < 4; q++) {
            const q1 = (q === 0 || q === 3) ? 1 : -1, q2 = q < 2 ? 1 : -1;
            if ((C[t1] && q1 < 0) || (C[t2] && q2 < 0)) continue;
            const basis = new THREE.Matrix4().makeBasis(AX[t1], AX[t2], AX[n]);
            LAYERS.forEach((L) => {
              const [a, b] = radii(L);
              const geo = a === 0 ? new THREE.CircleGeometry(b * R, 40, q * Math.PI / 2, Math.PI / 2) : new THREE.RingGeometry(a * R, b * R, 40, 1, q * Math.PI / 2, Math.PI / 2);
              const m = new THREE.Mesh(geo, capMats[L.id]); m.applyMatrix4(basis); m.renderOrder = 1; capG.add(m);
            });
            // 경계선
            [radii(LAYERS[0])[0], radii(LAYERS[1])[0], LAYERS[2].a, LAYERS[3].b].forEach((rr) => {
              const p = []; for (let k = 0; k <= 24; k++) { const th = q * Math.PI / 2 + (k / 24) * Math.PI / 2; p.push(new THREE.Vector3(Math.cos(th) * rr * R, Math.sin(th) * rr * R, 0.004)); }
              const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints(p), new THREE.LineBasicMaterial({ color: 0x2b1a0c })); ln.applyMatrix4(basis); capG.add(ln);
            });
          }
        }
        // 잘라 내기 (클리핑)
        const planes = []; for (let n = 0; n < 3; n++) if (C[n]) planes.push(new THREE.Plane(AX[n].clone().negate(), 0));
        shellMat.clippingPlanes = planes; shellMat.clipIntersection = true; shellMat.needsUpdate = true;
        // 이름표 위치: z=0 평면(조각 Q1)의 한 점
        LAYERS.forEach((L) => {
          const rm = rad[L.id] * R, th = ang[L.id] * Math.PI / 180;
          labPos[L.id][0] = Math.cos(th) * rm; labPos[L.id][1] = Math.sin(th) * rm; labPos[L.id][2] = 0.02;
        });
        ruler.forEach((lb) => { lb.P[0] = Math.cos(lb.a) * lb.r * R + (lb.r === 1 ? 0.3 : lb.r < 0.3 ? 0.18 : 0); lb.P[1] = Math.sin(lb.a) * lb.r * R + (lb.r < 0.3 ? 0.05 : 0); });
      }
      function applySel() {
        LAYERS.forEach((L) => { capMats[L.id].color.set(sel === 'all' || sel === L.id ? L.color : '#3b4259'); });
        LAYERS.forEach((L) => { layerLabs[L.id].set('<b>' + L.name + '</b> · ' + L.state); });
      }

      const portrait = () => renderer.domElement.clientWidth < renderer.domElement.clientHeight * 0.9;
      /* ===== 모드 ===== */
      let mode = 'sys';
      function sysInfo() {
        const rows = SPH.map((s) => (on[s.id] ? '' : '<span style="opacity:.45">') + s.emoji + ' <b>' + s.name + '</b> ' + s.desc + (on[s.id] ? '' : '</span>')).join('<br>');
        info(rows + '<br><span style="color:#ffd34d">두께는 실제보다 훨씬 두껍게 그렸어요.</span>');
      }
      function cutInfo() {
        const s = LAYERS.find((L) => L.id === sel);
        if (!s) {
          info('<b>지권의 층 (지구 반지름 약 6400 km)</b><br>' + LAYERS.map((L) => '· <b>' + L.name + '</b> ' + L.state + ' · ' + L.depth).join('<br>') +
            '<br><span style="color:#ffd34d">' + (thickMode ? '지각을 일부러 두껍게 그렸어요.' : '지각은 실제 비율대로 아주 얇아요.') + '</span>');
        } else {
          info('<b>' + s.name + '</b> · ' + s.state + '<br>깊이 ' + s.depth + '<br>두께 ' + s.thick + '<br>' + s.note);
        }
      }
      function visLabels() {
        moonLab.show(mode === 'sys' && on.space);
        const sh = mode === 'cut';
        LAYERS.forEach((L) => layerLabs[L.id].show(sh)); ruler.forEach((lb) => lb.show(sh));
      }
      function setMode(m) {
        mode = m; globe.visible = m === 'sys'; space.visible = m === 'sys' && on.space; cutG.visible = m === 'cut';
        gSys.forEach((n) => (n.style.display = m === 'sys' ? '' : 'none'));
        gCut.forEach((n) => (n.style.display = m === 'cut' ? '' : 'none'));
        if (m === 'cut') { orbit.theta = 0.8; orbit.phi = LEVELS[level][1] ? 0.95 : 1.25; orbit.dist = portrait() ? 9.5 : 6.4; } else { orbit.dist = portrait() ? 11 : 8.6; orbit.phi = 1.2; }
        visLabels(); m === 'sys' ? sysInfo() : cutInfo();
      }
      function applySys() {
        geoM.visible = on.geo; hydM.visible = on.hydro; bioM.visible = on.bio; cloudM.visible = on.atmo; airM.visible = on.atmo;
        space.visible = mode === 'sys' && on.space; visLabels(); sysInfo();
      }

      /* ===== 조작 ===== */
      const modeSeg = controls.segment('보기', [{ value: 'sys', label: '🌍 지구계' }, { value: 'cut', label: '✂️ 지권 단면' }], 'sys', setMode);
      const gSys = grab(() => {
        SPH.forEach((s) => {
          const b = controls.button(s.emoji + ' ' + s.name, () => { on[s.id] = !on[s.id]; b.classList.toggle('on', on[s.id]); applySys(); });
          b.classList.add('on');
        });
      });
      const gCut = grab(() => {
        controls.segment('자르기', [{ value: 'oct', label: '1/8' }, { value: 'quarter', label: '1/4' }, { value: 'half', label: '반쪽' }], level, (v) => { level = v; buildCaps(); cutInfo(); orbit.phi = LEVELS[v][1] ? 0.95 : 1.25; });
        controls.segment('층', [{ value: 'all', label: '전체' }].concat(LAYERS.map((L) => ({ value: L.id, label: L.name }))), sel, (v) => { sel = v; applySel(); cutInfo(); });
        const tb = controls.button('지각 두께: 실제 비율', () => { thickMode = !thickMode; tb.textContent = thickMode ? '지각 두께: 크게 그림' : '지각 두께: 실제 비율'; tb.classList.toggle('on', thickMode); buildCaps(); cutInfo(); });
      });
      buildCaps(); applySel(); applySys(); setMode('sys');

      let sized = false;
      return {
        update(dt) {
          if (!sized) { sized = true; setMode(mode); }
          if (mode === 'sys') { globe.rotation.y += 0.22 * dt; cloudM.rotation.y += 0.06 * dt; }
          if (mode === 'cut') {
            const C = LEVELS[level], dv = new THREE.Vector3(C[0], C[1], C[2]).normalize();
            const cam = ctx.camera.position.clone().normalize();
            const vis = cam.dot(dv) > 0.35;
            LAYERS.forEach((L) => layerLabs[L.id].show(vis)); ruler.forEach((lb) => lb.show(vis));
          }
        },
        sync() { /* 수업 상태와 무관하게 마지막 보기를 유지해요 */ },
      };
    },
  });
})();
