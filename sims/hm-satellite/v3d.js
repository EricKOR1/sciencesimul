/* hm-satellite · 3D 인공위성의 운동
   2D 실험(window.__sim)의 장면을 그대로 입체로 보여 줘요: 🛰️ 궤도 속력(발사 속력 · 고도 → 원 궤도) · 📏 주기와 반지름(측정) · 🌍 정지 위성(주기 24시간) · ⚖️ 질량 구하기(이오 · 달 · 지구) · 무중량(자유 낙하).
   원 궤도에 한정해요 (v = √(GM/r), T = 2πr/v). 값은 옆 조작판과 2D 화면이 정하고 3D는 따라가요. 위성은 중력 하나만으로 움직여요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const GN = 6.67e-11, ME = 5.972e24, RE = 6370;                 // km
  const GM = GN * ME / 1e9;                                       // km³/s²
  const T_SID = 86164;                                            // 지구 자전 주기 (s)
  const WE = 2 * Math.PI / T_SID;
  const GEO_R = Math.cbrt(GM * T_SID * T_SID / (4 * Math.PI * Math.PI)), GEO_H = GEO_R - RE;
  const ER = 3, K = ER / RE, D2R = Math.PI / 180, TAU = Math.PI * 2;
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

  function planetCanvas(kind, col) {
    const W = 512, H = 256, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d'), im = g.createImageData(W, H), c0 = new (window.THREE.Color)(col), R = c0.r * 255, G2 = c0.g * 255, B = c0.b * 255;
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const lon = (i / W) * Math.PI * 2, lat = (0.5 - (j + 0.5) / H) * Math.PI, o = (j * W + i) * 4;
      const x = Math.cos(lat) * Math.cos(lon), y = Math.sin(lat), z = Math.cos(lat) * Math.sin(lon);
      let k;
      if (kind === 'band') { const bnd = Math.sin(lat * 11 + fbm(x * 2, y * 2, z * 2) * 3.2); k = 0.82 + 0.2 * bnd + 0.12 * (fbm(x * 6, y * 3, z * 6) - 0.5); }
      else if (kind === 'moon') { const n = fbm(x * 3, y * 3, z * 3), cr = fbm(x * 9 + 3, y * 9, z * 9); k = 0.7 + 0.5 * n - (cr > 0.62 ? 0.18 : 0); }
      else { k = 0.62 + 0.8 * fbm(x * 3, y * 3, z * 3) - (Math.abs(lat) > 1.35 ? -0.35 : 0); }
      im.data[o] = Math.max(0, Math.min(255, R * k)); im.data[o + 1] = Math.max(0, Math.min(255, G2 * k)); im.data[o + 2] = Math.max(0, Math.min(255, B * k)); im.data[o + 3] = 255;
    }
    g.putImageData(im, 0, 0); return cv;
  }
  function cloudCanvas() {
    const W = 512, H = 256, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d'), im = g.createImageData(W, H);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const lon = (i / W) * Math.PI * 2, lat = (0.5 - (j + 0.5) / H) * Math.PI, v = fbm(Math.cos(lat) * Math.cos(lon) * 2.6 + 40, Math.sin(lat) * 2.6, Math.cos(lat) * Math.sin(lon) * 2.6 + 9), o = (j * W + i) * 4;
      im.data[o] = im.data[o + 1] = im.data[o + 2] = 255; im.data[o + 3] = Math.max(0, Math.min(255, (v - 0.5) * 900));
    }
    g.putImageData(im, 0, 0); return cv;
  }
  const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1), f2 = (v) => (Math.round(v * 100) / 100).toFixed(2);
  const sup = (s) => String(s).replace(/[-0-9]/g, (c) => ({ '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' }[c]));
  function sci(x, d) { if (x === 0) return '0'; const e = Math.floor(Math.log10(Math.abs(x))); let m = x / Math.pow(10, e); if (+m.toFixed(d) >= 10) { m /= 10; return m.toFixed(d) + ' × 10' + sup(e + 1); } return m.toFixed(d) + ' × 10' + sup(e); }
  window.SciSim3D.attach({
    button: null,
    title: '인공위성 궤도 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대 · 값은 옆 조작판에서 바꿔요',
    camera: { dist: 12, theta: 0.5, phi: 1.1, min: 4, max: 110, target: [0, 0, 0] },
    autoRotate: 0,
    levels: [0, 1, 2, 3],
    build(ctx) {
      const { THREE, root, label, info, orbit, renderer } = ctx;
      const sim = () => ctx.lesson();
      const M = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.6, metalness: 0.1 }, o || {}));
      const V3 = THREE.Vector3;
      const G = {}; ['orbit', 'geo', 'mass', 'wless'].forEach((k) => { G[k] = new THREE.Group(); root.add(G[k]); });
      const LAB = {}; const reg = (k, l) => { (LAB[k] = LAB[k] || []).push(l); return l; };
      const sRGB = (t) => { if ('encoding' in t) t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t; };
      const earthTex = sRGB(new THREE.CanvasTexture(earthCanvas()));
      const texCache = {}; const texFor = (name, col) => { const k = name + col; if (!texCache[k]) texCache[k] = sRGB(new THREE.CanvasTexture(planetCanvas(name === '목성' ? 'band' : name === '달' || name === '이오' ? 'moon' : 'rock', col))); return texCache[k]; };
      const planetMat = (col, rough) => new THREE.MeshStandardMaterial({ color: 0xffffff, map: texFor('', col || '#888'), roughness: rough == null ? 0.85 : rough, metalness: 0 });
      const setPlanet = (mesh, name, col) => { if (name === '지구') { mesh.material.map = earthTex; mesh.material.color.set(0xffffff); } else { mesh.material.map = texFor(name, col); mesh.material.color.set(0xffffff); } mesh.material.needsUpdate = true; };
      const atmoMat = (col) => new THREE.ShaderMaterial({ transparent: true, side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { c: { value: new THREE.Color(col) } }, vertexShader: 'varying vec3 vN; varying vec3 vP; void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.0); vP = mv.xyz; gl_Position = projectionMatrix * mv; }', fragmentShader: 'uniform vec3 c; varying vec3 vN; varying vec3 vP; void main(){ float f = pow(0.72 - dot(vN, normalize(-vP)) * -1.0 * 0.0 - abs(dot(vN, normalize(-vP))) * 0.72, 2.0); gl_FragColor = vec4(c, 1.0) * clamp(f * 2.6, 0.0, 1.0); }' });
      const atmo = (g, r, col) => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), atmoMat(col)); m.scale.setScalar(r); g.add(m); return m; };
      /* 별이 가득한 우주 배경 */
      { const N = 1400, pa = new Float32Array(N * 3), ca = new Float32Array(N * 3); for (let i = 0; i < N; i++) { const u = Math.random() * 2 - 1, a = Math.random() * TAU, rr = Math.sqrt(1 - u * u), R = 260 + Math.random() * 60; pa[i * 3] = rr * Math.cos(a) * R; pa[i * 3 + 1] = u * R; pa[i * 3 + 2] = rr * Math.sin(a) * R; const b = 0.55 + Math.random() * 0.45, tint = Math.random(); ca[i * 3] = b * (tint > 0.8 ? 1 : 0.9); ca[i * 3 + 1] = b * 0.92; ca[i * 3 + 2] = b * (tint < 0.25 ? 1 : 0.95); }
        const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pa, 3)); sg.setAttribute('color', new THREE.BufferAttribute(ca, 3)); const stars = new THREE.Points(sg, new THREE.PointsMaterial({ size: 2, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false })); stars.frustumCulled = false; root.add(stars); }
      const panelTex = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 32; const g = c.getContext('2d'); g.fillStyle = '#1e40af'; g.fillRect(0, 0, 64, 32); g.strokeStyle = '#93c5fd'; g.lineWidth = 1; for (let x = 0; x <= 64; x += 8) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 32); g.stroke(); } for (let y = 0; y <= 32; y += 8) { g.beginPath(); g.moveTo(0, y); g.lineTo(64, y); g.stroke(); } return sRGB(new THREE.CanvasTexture(c)); })();
      const satMk = (col, g) => {
        const s = new THREE.Group(), gold = M(0xd9b44a, { roughness: 0.3, metalness: 0.85 });
        const bd = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.24), gold); s.add(bd);
        const band = new THREE.Mesh(new THREE.BoxGeometry(0.205, 0.04, 0.245), M(col, { roughness: 0.4, metalness: 0.5 })); band.position.y = 0.06; s.add(band);
        const pm = new THREE.MeshStandardMaterial({ map: panelTex, roughness: 0.3, metalness: 0.6, emissive: 0x1d4ed8, emissiveIntensity: 0.25 });
        [-1, 1].forEach((sg) => { const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 6), M(0xcbd5e1, { metalness: 0.8 })); boom.rotation.z = Math.PI / 2; boom.position.x = sg * 0.16; s.add(boom); const pn = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.012, 0.2), pm); pn.position.x = sg * 0.39; s.add(pn); });
        const dish = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 8, 0, TAU, 0, Math.PI / 2.4), M(0xf1f5f9, { metalness: 0.5, roughness: 0.3, side: THREE.DoubleSide })); dish.position.set(0, 0.15, 0.02); s.add(dish);
        const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.12, 6), M(0xe2e8f0)); ant.position.set(0.05, 0.16, -0.06); s.add(ant);
        g.add(s); return s; };
      const satMkOld = (col, g) => { const s = new THREE.Group(); s.add(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), M(col, { roughness: 0.4, metalness: 0.4 }))); s.add(new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.015, 0.2), M(0x3b82f6, { metalness: 0.5, emissive: 0x1d4ed8, emissiveIntensity: 0.4 }))); g.add(s); return s; };
      const arrowMk = (g, col) => { const a = new THREE.ArrowHelper(new V3(1, 0, 0), new V3(), 1, col, 0.3, 0.2); g.add(a); return a; };
      const lineMk = (g, col, op) => { const l = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: col, transparent: op != null, opacity: op == null ? 1 : op })); l.frustumCulled = false; g.add(l); return l; };
      const ringLine = (g, col, op) => { const l = lineMk(g, col, op); l.setR = (r, inc) => { const p = []; const i = (inc || 0) * D2R; for (let k = 0; k <= 120; k++) { const u = k / 120 * TAU; p.push(new V3(r * Math.cos(u), r * Math.sin(u) * Math.sin(i), -r * Math.sin(u) * Math.cos(i))); } l.geometry.setFromPoints(p); }; return l; };
      /* ================= 🛰️ 궤도 · 📏 측정 (중심 천체 둘레 원 궤도 만들기) ================= */
      const body = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 44), planetMat('#3b82f6')); G.orbit.add(body); const bodyAtmo = atmo(G.orbit, 1.07, 0x6db3ff);
      const oSat = satMk(0xe8edf6, G.orbit), oTrail = lineMk(G.orbit, 0xffd34d, 0.9), oRing = ringLine(G.orbit, 0xffffff, 0.35);
      const oV = arrowMk(G.orbit, 0x22c55e), oG = arrowMk(G.orbit, 0xef4444);
      const lBody = reg('orbit', label('', body, { color: 'rgba(12,18,34,.85)', size: 13 })), lSat = reg('orbit', label('인공위성', oSat, { color: 'rgba(14,116,144,.92)', size: 12 })), lV = reg('orbit', label('속도 v', [0, 0, 0], { color: 'rgba(21,128,61,.92)', size: 12 })), lGr = reg('orbit', label('중력 (구심력)', [0, 0, 0], { color: 'rgba(185,28,28,.92)', size: 12 }));
      let obKey = '';
      function orbitScene(A, S) {
        const o = S.ob, b = o.meas ? A.BODIES[0] : A.BODIES[o.b], h = o.meas ? S.me.h : o.h, r0 = b.R + h * 1000, k = 3.4 / r0;
        const key = b.n + '|' + h; if (key !== obKey) { obKey = key; setPlanet(body, b.n, b.col); bodyAtmo.material.uniforms.c.value.set(b.n === '지구' ? 0x6db3ff : b.n === '화성' ? 0xffa27a : b.n === '목성' ? 0xffd9a8 : 0xaab4c8); bodyAtmo.visible = b.n !== '달'; oRing.setR(r0 * k, 0); lBody.set(b.n); }
        body.scale.setScalar(Math.max(0.15, b.R * k)); bodyAtmo.scale.setScalar(Math.max(0.15, b.R * k) * 1.07); lBody.off = [0, Math.max(0.15, b.R * k) + 0.4, 0];
        const x = o.x * k, y = o.y * k; oSat.position.set(x, 0, -y); oSat.scale.setScalar(Math.max(1, orbit.dist / 12)); oSat.lookAt(0, 0, 0);
        const pts = o.trail.map((q) => new V3(q[0] * k, 0, -q[1] * k)); if (pts.length > 1) oTrail.geometry.setFromPoints(pts); else oTrail.geometry.setFromPoints([new V3(), new V3(0, 0.001, 0)]);
        const r = Math.hypot(o.x, o.y) || r0, sp = Math.hypot(o.vx, o.vy) || 1, sc = Math.max(1, orbit.dist / 12);
        const vd = new V3(o.vx, 0, -o.vy).normalize(), gd = new V3(-x, 0, y).normalize(), pos = oSat.position;
        oV.position.copy(pos); oV.setDirection(vd); oV.setLength(1.2 * sc, 0.35 * sc, 0.25 * sc); oG.position.copy(pos); oG.setDirection(gd); oG.setLength(1.0 * sc, 0.35 * sc, 0.25 * sc);
        lV.obj = pos.clone().addScaledVector(vd, 1.3 * sc).toArray(); lGr.obj = pos.clone().addScaledVector(gd, 1.1 * sc).toArray(); lSat.off = [0, 0.5 * sc, 0];
        const vNow = o.meas ? A.vcNow() : o.v;
        let t;
        if (o.meas) t = '<b>📏 ' + b.n + ' 둘레 원 궤도 · 고도 ' + S.me.h + ' km</b> (측정 장면)<br>궤도 반지름 r = ' + sci(r0, 2) + ' m · 속력 v = <b>' + f2(vNow) + ' km/s</b> (이 고도의 원 궤도 속력)<br>v와 한 바퀴 도는 시간 T를 측정해 표와 그래프를 채워요 (T = 2πr/v).<br>';
        else t = '<b>🛰️ ' + b.n + ' 둘레 원 궤도 만들기</b> · 고도 ' + h + ' km → r = ' + sci(r0, 2) + ' m<br>발사 속력 v = <b>' + f2(vNow) + ' km/s</b> (옆 조작판) · ' + (o.st === 'ready' ? '속력을 정하고 발사하세요. 중력이 구심력 역할을 하는 속력(원 궤도 속력)이 아니면 원이 아니에요.' : o.st === 'run' ? '도는 중… 돈 바퀴 수 ' + f1(o.revs) : o.msg || '궤도를 마쳤어요') + '<br>';
        info(t + '위성에는 <b>중력만</b> 작용해요: 중력이 구심력이라 GMm/r² = mv²/r → v = √(GM/r) (위성의 질량은 상관없어요).');
      }
      /* ================= 🌍 정지 위성 ================= */
      const earth = new THREE.Group(); G.geo.add(earth);
      const tex = earthTex;
      earth.add(new THREE.Mesh(new THREE.SphereGeometry(ER, 72, 48), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, metalness: 0 })));
      const cloudTex = sRGB(new THREE.CanvasTexture(cloudCanvas())); const clouds = new THREE.Mesh(new THREE.SphereGeometry(ER * 1.012, 56, 40), new THREE.MeshStandardMaterial({ map: cloudTex, transparent: true, opacity: 0.8, depthWrite: false, roughness: 1 })); earth.add(clouds); atmo(G.geo, ER * 1.08, 0x6db3ff);
      earth.add((() => { const p = []; for (let i = 0; i <= 120; i++) { const a = i / 120 * TAU; p.push(new V3(Math.cos(a) * ER * 1.003, 0, -Math.sin(a) * ER * 1.003)); } return new THREE.Line(new THREE.BufferGeometry().setFromPoints(p), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 })); })());
      const axisL = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new V3(0, -ER * 1.35, 0), new V3(0, ER * 1.5, 0)]), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 })); earth.add(axisL);
      const lNorth = reg('geo', label('북극 ↑', [0, ER * 1.6, 0], { color: 'rgba(12,18,34,.8)' }));
      const SA = { iss: { h: 400, u0: 1.6, mesh: satMk(0xe8edf6, G.geo), ring: ringLine(G.geo, 0xe8edf6, 0.35), name: '국제우주정거장' }, gps: { h: 20200, u0: 4.2, mesh: satMk(0xd9a8ff, G.geo), ring: ringLine(G.geo, 0xd9a8ff, 0.4), name: 'GPS 위성' } };
      const SelS = { mesh: satMk(0xfde68a, G.geo), ring: ringLine(G.geo, 0xffc85a, 0.85), u0: 0.7 };
      Object.keys(SA).forEach((k) => { SA[k].ring.setR((RE + SA[k].h) * K, 0); reg('geo', label(SA[k].name, SA[k].mesh, { color: 'rgba(55,65,81,.9)', size: 11.5 })).off = [0, 0.45, 0]; });
      const lSel = reg('geo', label('', SelS.mesh, { color: 'rgba(133,77,14,.92)', size: 12.5 })); lSel.off = [0, 0.5, 0];
      const pin = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10), new THREE.MeshBasicMaterial({ color: 0xff3b30 })); earth.add(pin); const lPin = reg('geo', label('지상 관측자', pin, { color: 'rgba(185,28,28,.92)', size: 12 })); lPin.off = [0, -0.4, 0];
      const sight = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new V3(), new V3(0, 1, 0)]), new THREE.LineDashedMaterial({ color: 0xff8a80, dashSize: 0.3, gapSize: 0.2 })); G.geo.add(sight);
      const gV = arrowMk(G.geo, 0x22c55e), gGr = arrowMk(G.geo, 0xef4444);
      let gKey = '';
      function geoScene(A, S) {
        const g = S.ge, h = g.h, r = RE + h, v = vcirc(r), T = per(r), Tsid = T_SID, stat = Math.abs(T - Tsid) < 120 && g.inc === 0;
        const key = h + '|' + g.inc; if (key !== gKey) { gKey = key; SelS.ring.setR(r * K, g.inc); }
        earth.rotation.y = WE * g.t;
        const u = SelS.u0 + TAU * g.t / T, i = g.inc * D2R, sc = Math.max(1.3, orbit.dist / 12 * 1.1);
        SelS.mesh.position.set(r * K * Math.cos(u), r * K * Math.sin(u) * Math.sin(i), -r * K * Math.sin(u) * Math.cos(i)); SelS.mesh.lookAt(0, 0, 0); SelS.mesh.scale.setScalar(sc);
        Object.keys(SA).forEach((k) => { const q = SA[k], rr = RE + q.h, uu = q.u0 + TAU * g.t / per(rr); q.mesh.position.set(rr * K * Math.cos(uu), 0, -rr * K * Math.sin(uu)); q.mesh.lookAt(0, 0, 0); q.mesh.scale.setScalar(sc * 0.85); });
        lSel.set(g.inc === 0 ? '내 위성 (적도 궤도)' : '내 위성 (극궤도)');
        pin.position.set(Math.cos(SelS.u0) * ER * 1.002, 0, -Math.sin(SelS.u0) * ER * 1.002); pin.scale.setScalar(Math.max(1, sc * 0.8));
        const pos = SelS.mesh.position, tv = new V3(-Math.sin(u), Math.cos(u) * Math.sin(i), -Math.cos(u) * Math.cos(i)).normalize(), gd = pos.clone().normalize().negate();
        gV.position.copy(pos); gV.setDirection(tv); gV.setLength(1.1 * sc, 0.35 * sc, 0.25 * sc); gGr.position.copy(pos); gGr.setDirection(gd); gGr.setLength(1.1 * sc, 0.35 * sc, 0.25 * sc);
        const tw = new V3(); pin.getWorldPosition(tw); const pa = sight.geometry.attributes.position; pa.setXYZ(0, tw.x, tw.y, tw.z); pa.setXYZ(1, pos.x, pos.y, pos.z); pa.needsUpdate = true; sight.computeLineDistances();
        const near = orbit.dist < 26; lNorth.show(near); lPin.show(near);
        const rel = T < Tsid ? '위성이 더 빨라서 지상에서 보면 <b>동쪽으로 흘러가요</b>' : '위성이 더 느려서 지상에서 보면 <b>서쪽으로 뒤처져요</b>';
        info('<b>🌍 정지 위성</b> · 고도 <b>' + Math.round(h).toLocaleString('ko-KR') + ' km</b> · 속력 ' + f2(v) + ' km/s · 주기 <b>' + (T / 3600).toFixed(1) + '시간</b> (지구 자전 24시간)<br>' + (stat ? '<b style="color:#86efac">지상에서 정지해 보여요!</b> 적도 상공 · 자전과 같은 방향 · 주기 24시간' : (g.inc !== 0 ? '궤도면이 적도면과 달라서(극궤도) 주기가 24시간이어도 지상에서 <b>정지해 보이지 않아요</b>.' : rel)) + '<br><span style="opacity:.8">고도 · 궤도면 · 속도는 옆 조작판에서 바꿔요 (고도는 계산해서 찾아요).</span>');
      }
      /* ================= ⚖️ 질량 구하기 ================= */
      const mC = new THREE.Mesh(new THREE.SphereGeometry(1, 56, 40), planetMat('#d9a066')), mS = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), planetMat('#f2d45c')); G.mass.add(mC, mS); const mAtmo = atmo(G.mass, 1.07, 0xffd9a8);
      const mRing = ringLine(G.mass, 0xffffff, 0.45), mRod = lineMk(G.mass, 0xffffff, 0.55);
      const lmC = reg('mass', label('', mC, { color: 'rgba(12,18,34,.85)', size: 13 })), lmS = reg('mass', label('', mS, { color: 'rgba(12,18,34,.85)', size: 12 }));
      function massScene(A, S) {
        const ms = S.ms, p = A.MASSES[ms.i], hide = A.eff('hideAns'), R = 4.2;
        setPlanet(mC, p.c, p.col); mC.scale.setScalar(p.cs / 34 * 1.6); mS.scale.setScalar(p.ss / 34 * 1.6); setPlanet(mS, p.sat, p.sat === '이오' ? '#f2d45c' : p.sat === '지구' ? '#3b82f6' : '#d9dde6'); mAtmo.scale.setScalar(p.cs / 34 * 1.6 * 1.07); mAtmo.visible = p.c !== '달'; mC.material.emissive.set(p.c === '태양' ? 0xff8a00 : 0x000000); mC.material.emissiveIntensity = p.c === '태양' ? 0.85 : 0; mAtmo.material.uniforms.c.value.set(p.c === '태양' ? 0xffc84a : p.c === '지구' ? 0x6db3ff : 0xffd9a8);
        mRing.setR(R, 0); mS.position.set(R * Math.cos(ms.ang), 0, -R * Math.sin(ms.ang)); mRod.geometry.setFromPoints([new V3(), mS.position.clone()]);
        lmC.set(p.c); lmS.set(p.sat); lmC.off = [0, p.cs / 34 * 1.6 + 0.4, 0]; lmS.off = [0, 0.5, 0];
        info('<b>⚖️ 위성으로 천체의 질량 재기: ' + p.name + '</b><br>관측한 r = <b>' + sci(p.r, 2) + ' m</b> · 관측한 T = <b>' + sci(p.T, 2) + ' s</b> (' + p.Tt + ')<br>' + (hide ? '중심 천체의 질량 M = 4π²r³ / (GT²)을 계산해 2D 화면에 입력해요.' : p.c + '의 질량 M = ' + sci(A.massOf(p), 2) + ' kg') + '<br>중력이 구심력 → GMm/r² = m(2πr/T)² → 위성의 질량은 약분돼요.<br><span style="opacity:.8">어느 천체인지는 옆 조작판에서 골라요.</span>');
      }
      /* ================= 🚀 무중량 (자유 낙하) ================= */
      const wE = new THREE.Mesh(new THREE.SphereGeometry(2.0, 56, 40), new THREE.MeshStandardMaterial({ map: earthTex, roughness: 0.8 })); G.wless.add(wE); atmo(G.wless, 2.14, 0x6db3ff); const wRing = ringLine(G.wless, 0xffffff, 0.4);
      const wSat = new THREE.Group(); G.wless.add(wSat);
      { const hull = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.0, 1.0), new THREE.MeshStandardMaterial({ color: 0xcbd5e1, transparent: true, opacity: 0.4, roughness: 0.2 })); wSat.add(hull); const man = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), M(0xffd9b5)); wSat.add(man); const body2 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.4, 12), M(0xff9a6a)); body2.position.y = -0.3; wSat.add(body2); wSat.userData.man = [man, body2]; }
      const wV = arrowMk(G.wless, 0xffe58a), wGr = arrowMk(G.wless, 0xff7b7b);
      const lwS = reg('wless', label('위성 안의 우주인 (함께 떨어지는 중)', wSat, { color: 'rgba(12,18,34,.85)', size: 12 })), lwG = reg('wless', label('중력', [0, 0, 0], { color: 'rgba(185,28,28,.92)', size: 12 }));
      function wlessScene(A, S) {
        const w = S.wl, Rr = 4.4, a = -w.t * 0.9 + 2.2, rr = A.RE_ + w.h * 1000, gO = A.GM_E_ / (rr * rr), g0 = 9.8;
        wRing.setR(Rr, 0); wSat.position.set(Rr * Math.cos(-a), 0, Rr * Math.sin(-a) * -1); wSat.position.set(Rr * Math.cos(a), 0, -Rr * Math.sin(a));
        const pos = wSat.position, tv = new V3(Math.sin(a), 0, Math.cos(a)).normalize(), gd = pos.clone().multiplyScalar(-1).setY(0).normalize();
        wV.position.copy(pos); wV.setDirection(tv); wV.setLength(1.6, 0.4, 0.28); wGr.position.copy(pos); wGr.setDirection(gd); wGr.setLength(1.1, 0.4, 0.28);
        lwG.obj = pos.clone().addScaledVector(gd, 1.2).toArray(); lwS.off = [0, 1.0, 0];
        wSat.userData.man[0].position.y = 0.25 + 0.06 * Math.sin(w.t * 1.7); wSat.userData.man[1].position.y = -0.1 + 0.06 * Math.sin(w.t * 1.7);
        info('<b>🚀 위성 안은 왜 무중량일까</b> · 고도 ' + w.h + ' km<br>이 고도의 중력 가속도 = ' + f2(gO) + ' m/s² (지표 g의 ' + Math.round(gO / g0 * 100) + ' %) — 중력은 여전히 커요!<br>위성과 우주인은 <b>함께 자유 낙하</b>하고 있어서 서로 누르지 않아요 → 둥둥 떠요 (무중량). 위성은 접선 방향으로 가려다 계속 지구 쪽으로 떨어져요.<br><span style="opacity:.8">고도는 옆 조작판에서 바꿔요.</span>');
      }
      let cur = '';
      function setMode(S) {
        const mode = (S.mode === 'orbit' || S.mode === 'meas') ? 'orbit' : S.mode; if (mode === cur) return; cur = mode;
        Object.keys(G).forEach((k) => (G[k].visible = k === mode)); Object.keys(LAB).forEach((k) => LAB[k].forEach((l) => l.show(k === mode)));
        obKey = ''; gKey = '';
        if (mode === 'orbit') Object.assign(orbit, { tx: 0, ty: 0, tz: 0, phi: 0.95, theta: 0.2, dist: PHONE ? 32 : 22 });
        else if (mode === 'geo') Object.assign(orbit, { tx: 0, ty: 0, tz: 0, phi: 1.05, theta: 0.5, dist: PHONE ? 70 : 62 });
        else if (mode === 'mass') Object.assign(orbit, { tx: 0, ty: 0, tz: 0, phi: 0.95, theta: 0.2, dist: PHONE ? 15 : 11 });
        else Object.assign(orbit, { tx: 0, ty: 0, tz: 0, phi: 1.0, theta: 0.2, dist: PHONE ? 15 : 11 });
      }
      return {
        update() {
          const A = sim(); if (!A || !A.S) return; const S = A.S;
          setMode(S);
          if (cur === 'orbit') orbitScene(A, S); else if (cur === 'geo') geoScene(A, S); else if (cur === 'mass') massScene(A, S); else wlessScene(A, S);
        },
        sync() {},
      };
    },
  });
})();
