/* m1-sun-activity · 3D 태양의 표면·대기와 태양 활동
   광구(우리 눈에 보이는 표면)에는 쌀알 무늬와 어두운 흑점이 있어요 (흑점은 주변보다 온도가 낮아요).
   광구 바깥에는 채층과 코로나(태양 대기)가 있고, 홍염·플레어 같은 활동은 흑점이 많을 때 더 활발해요.
   (크기와 모양은 이해를 돕도록 단순화한 모형이에요.)
   3D로 보는 단계는 2단계 '태양의 대기'예요: 🌑 광구 가리기 버튼으로 가리개를 덮고, 이름표 버튼으로 채층·코로나·홍염을 찾아요
   (2D의 가리개 끌기·눌러서 이름표 붙이기와 같은 결과). 나머지 단계는 그래프·카드를 눌러야 해서 2D예요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN0 = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  window.SciSim3D.attach({
    title: '태양 표면과 활동 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: 13 * (PHN0 ? 1.05 : 1), theta: 0.4, phi: 1.3, fov: 45, target: [0, 0, 0], min: 6, max: 30 },
    autoRotate: 0,
    levels: [1],
    build(ctx) {
      const { THREE, scene, root, label, info, controls } = ctx;
      /* ---------- 공통 도구 ---------- */
      const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
      const V3 = THREE.Vector3, Yax = new V3(0, 1, 0);
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0.05 }, o || {}));
      const glass = (c, op, o) => mat(c || 0xbfe3ff, Object.assign({ transparent: true, opacity: op || 0.16, roughness: 0.12, metalness: 0, depthWrite: false, side: THREE.DoubleSide }, o || {}));
      const rnd = (() => { let s = 12345; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
      const _m = new THREE.Matrix4(), _c = new THREE.Color();
      function spheres(N, r, color, seg) {
        const m = new THREE.InstancedMesh(new THREE.SphereGeometry(r, seg || 16, Math.round((seg || 16) * 0.75)), mat(color, { roughness: 0.55, metalness: 0 }), N);
        m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; m.castShadow = true;
        for (let i = 0; i < N; i++) m.setColorAt(i, _c.set(0xffffff));
        root.add(m); return m;
      }
      function put(m, i, x, y, z, s) { s = s === undefined ? 1 : s; _m.makeScale(s, s, s); _m.setPosition(x, y, z); m.setMatrixAt(i, _m); }
      function tint(m, i, hex) { m.setColorAt(i, _c.set(hex)); }
      function flush(m) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
      function tubeMesh(pts, r, color, o) {
        const curve = new THREE.CatmullRomCurve3(pts.map((p) => new V3(p[0], p[1], p[2])));
        return new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(8, pts.length * 10), r, 10, false), mat(color, o));
      }
      function mkArrow(col, rad) {
        const g = new THREE.Group(), m = mat(col, { roughness: 0.4 });
        const sh = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 1, 12), m), hd = new THREE.Mesh(new THREE.ConeGeometry(rad * 2.4, rad * 6, 16), m);
        g.add(sh, hd); g.userData = { sh, hd, rad }; return g;
      }
      function setArrow(g, a, b) {
        const d = new V3().subVectors(b, a), len = d.length(); const { sh, hd, rad } = g.userData;
        if (len < 1e-3) { g.visible = false; return; }
        g.visible = true; const hl = Math.min(len * 0.5, rad * 6);
        sh.scale.y = Math.max(0.001, len - hl); sh.position.y = (len - hl) / 2;
        hd.scale.y = hl / (rad * 6); hd.position.y = len - hl / 2;
        g.position.copy(a); g.quaternion.setFromUnitVectors(Yax, d.normalize());
      }
      function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); if (THREE.sRGBEncoding) t.encoding = THREE.sRGBEncoding; return t; }
      /* 눈금이 있는 둥근 계기판 (0 ~ max, 270도) */
      function makeDial(R, max, unit, tickStep, labStep) {
        const g = new THREE.Group();
        const body = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.34, 48), mat(0x8b95a7, { metalness: 0.6, roughness: 0.3 })); body.rotation.x = Math.PI / 2; g.add(body);
        const tex = canvasTex(256, 256, (c, w) => {
          c.fillStyle = '#f7f9fc'; c.beginPath(); c.arc(128, 128, 126, 0, 7); c.fill();
          c.strokeStyle = '#334155'; c.fillStyle = '#1f2937'; c.textAlign = 'center'; c.textBaseline = 'middle';
          for (let v = 0; v <= max + 1e-6; v += tickStep) {
            const a = (-225 + 270 * v / max) * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a), big = Math.abs(v / labStep - Math.round(v / labStep)) < 1e-6;
            c.lineWidth = big ? 5 : 2.5; c.beginPath(); c.moveTo(128 + ca * 104, 128 - sa * 104); c.lineTo(128 + ca * (big ? 84 : 92), 128 - sa * (big ? 84 : 92)); c.stroke();
            if (big) { c.font = '800 26px sans-serif'; c.fillText(String(Math.round(v * 10) / 10), 128 + ca * 62, 128 - sa * 62); }
          }
          c.font = '800 20px sans-serif'; c.fillStyle = '#2563eb'; c.fillText(unit, 128, 200);
        });
        const face = new THREE.Mesh(new THREE.CircleGeometry(R * 0.93, 48), new THREE.MeshBasicMaterial({ map: tex })); face.position.z = 0.18; g.add(face);
        const needle = new THREE.Group(); needle.position.z = 0.24;
        const nb = new THREE.Mesh(new THREE.BoxGeometry(R * 0.7, 0.07, 0.04), mat(0xe11d48, { roughness: 0.4 })); nb.position.x = R * 0.3; needle.add(nb);
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 16), mat(0x475569, { metalness: 0.5 })); cap.rotation.x = Math.PI / 2; needle.add(cap);
        g.add(needle);
        g.userData.set = (v) => { needle.rotation.z = (-225 + 270 * Math.max(0, Math.min(max, v)) / max) * Math.PI / 180; };
        g.userData.set(0); return g;
      }
      /* 사방으로 빛나는 별 모양 빛 번짐 */
      function glowSprite(size, inner, mid) { const tex = canvasTex(128, 128, (c) => { const g = c.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, inner || 'rgba(255,235,160,1)'); g.addColorStop(0.25, mid || 'rgba(255,190,60,.55)'); g.addColorStop(1, 'rgba(255,160,0,0)'); c.fillStyle = g; c.fillRect(0, 0, 128, 128); });
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); s.scale.set(size, size, 1); return s; }
      function starField(n, R) { const pos = []; for (let i = 0; i < n; i++) { const u = rnd() * 2 - 1, a = rnd() * 6.283, r = Math.sqrt(1 - u * u); pos.push(Math.cos(a) * r * R, u * R, Math.sin(a) * r * R); }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); return new THREE.Points(g, new THREE.PointsMaterial({ color: 0x9fb4e8, size: 1.5, sizeAttenuation: false, transparent: true, opacity: 0.55 })); }
      /* 행성 겉면 무늬 (가로 줄무늬 / 점무늬) */
      function bandTex(cols, seed) { return canvasTex(256, 128, (c, w, h) => { let s = seed || 3; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
        const n = cols.length; for (let i = 0; i < 16; i++) { c.fillStyle = cols[Math.floor(r() * n)]; c.fillRect(0, i * h / 16, w, h / 16 + 1); }
        c.globalAlpha = 0.25; for (let i = 0; i < 60; i++) { c.fillStyle = cols[Math.floor(r() * n)]; c.beginPath(); c.ellipse(r() * w, r() * h, 8 + r() * 25, 2 + r() * 4, 0, 0, 7); c.fill(); } c.globalAlpha = 1; }); }

      scene.add(new THREE.AmbientLight(0xffffff, 0.2));
      root.add(starField(300, 70));
      const RS = 3, st = { mode: 'atm', act: 60, occ: false, nSpot: 0 };
      const sun = new THREE.Group(); root.add(sun);   // 자전하는 태양

      /* 광구: 쌀알 무늬 + 가장자리가 어두워 보이는 효과 */
      const gran = canvasTex(1024, 512, (c, w, h) => {
        const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#f6a21c'); g.addColorStop(0.5, '#ffbe2e'); g.addColorStop(1, '#f6a21c'); c.fillStyle = g; c.fillRect(0, 0, w, h);
        let s = 11; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
        for (let i = 0; i < 2600; i++) { const y = r() * h, sq = Math.max(0.35, Math.sin(Math.PI * y / h)); c.fillStyle = r() < 0.5 ? 'rgba(255,230,120,.45)' : 'rgba(210,120,0,.35)'; c.beginPath(); c.ellipse(r() * w, y, (7 + r() * 9) / sq * 0.9, 5 + r() * 6, 0, 0, 7); c.fill(); }
      });
      const photo = new THREE.Mesh(new THREE.SphereGeometry(RS, 64, 48), new THREE.MeshBasicMaterial({ map: gran })); sun.add(photo);
      const limb = new THREE.Mesh(new THREE.SphereGeometry(RS * 1.002, 64, 48), new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, uniforms: {}, vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
        fragmentShader: 'varying vec3 vN; varying vec3 vV; void main(){ float f = clamp(dot(vN, vV), 0.0, 1.0); float a = pow(1.0 - f, 1.6) * 0.55; gl_FragColor = vec4(0.55, 0.18, 0.0, a); }' })); root.add(limb);

      /* 흑점 */
      const MAXS = 18, spots = [];
      const SPOT = [[22, 10], [-35, 28], [60, -18], [-70, 8], [105, 22], [150, -26], [-120, -12], [-155, 20], [10, -24], [40, 32], [-15, 14], [85, -8], [-95, 30], [130, 12], [-50, -30], [175, -10], [-5, 4], [120, -34]];
      const spotG = new THREE.CircleGeometry(1, 28), penG = new THREE.CircleGeometry(1, 28);
      SPOT.forEach((s, i) => {
        const lon = s[0] * Math.PI / 180, lat = s[1] * Math.PI / 180, g = new THREE.Group();
        const p = new V3(Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)); g.position.copy(p).multiplyScalar(RS * 1.004); g.quaternion.setFromUnitVectors(new V3(0, 0, 1), p);
        const sz = (0.22 + 0.22 * ((i * 7) % 5) / 4) * (i % 3 === 0 ? 1.3 : 1);
        const pen = new THREE.Mesh(penG, new THREE.MeshBasicMaterial({ color: 0xa55a0a })); pen.scale.set(sz * 1.9, sz * 1.5, 1);
        const um = new THREE.Mesh(spotG, new THREE.MeshBasicMaterial({ color: 0x3a1c06 })); um.scale.set(sz * 0.9, sz * 0.75, 1); um.position.z = 0.005;
        g.add(pen, um); sun.add(g); spots.push({ g, lon, lat, p });
      });
      const spotLab = label('흑점', spots[0].g, { size: 12.5, color: 'rgba(60,30,10,.92)' });
      const spotLab2 = label('주변보다 온도가 낮아 어두워 보여요', spots[0].g, { size: 11, offset: [0, -0.7, 0], color: 'rgba(60,30,10,.85)' });
      const granLab = label('광구 (쌀알 무늬)', [-RS * 0.78, RS * 0.5, RS * 0.45], { size: 12, color: 'rgba(120,60,0,.9)' });

      /* 채층(가장자리의 붉은 띠) · 코로나(바깥으로 퍼지는 희미한 빛) */
      const chromo = new THREE.Mesh(new THREE.SphereGeometry(RS * 1.035, 64, 48), new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: {},
        vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
        fragmentShader: 'varying vec3 vN; varying vec3 vV; void main(){ float f = clamp(dot(vN, vV), 0.0, 1.0); float a = pow(1.0 - f, 2.2); gl_FragColor = vec4(vec3(1.0, 0.22, 0.32) * a * 1.5, a); }' })); root.add(chromo);
      const corU = { uR: { value: RS }, uT: { value: 0 }, uK: { value: 0.4 } };
      const corona = new THREE.Mesh(new THREE.SphereGeometry(RS * 3.4, 64, 48), new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: corU,
        vertexShader: 'varying vec3 vP; varying vec3 vC; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vP = mv.xyz; vC = (modelViewMatrix * vec4(0.0,0.0,0.0,1.0)).xyz; gl_Position = projectionMatrix * mv; }',
        fragmentShader: 'uniform float uR; uniform float uT; uniform float uK; varying vec3 vP; varying vec3 vC; void main(){ vec2 d = vP.xy - vC.xy; float r = length(d) / uR; if (r < 1.0) discard; float an = atan(d.y, d.x); float st = 0.62 + 0.38 * sin(an * 5.0 + uT * 0.3) * sin(an * 3.0 - uT * 0.2 + 1.3); float a = exp(-(r - 1.0) * 1.35) * st * uK; gl_FragColor = vec4(vec3(0.84, 0.9, 1.0) * a, a); }' }));
      corona.renderOrder = 2; root.add(corona);
      const chLab = label('채층', [RS * 0.95, -RS * 0.45, RS * 0.5], { size: 12, color: 'rgba(160,20,50,.92)' });
      const coLab = label('코로나', [RS * 1.55, RS * 1.25, 0], { size: 12, color: 'rgba(40,60,130,.92)' });
      const atLab = label('태양 대기', [0, RS * 2.1, 0], { size: 12.5, color: 'rgba(40,60,130,.92)' });
      /* 광구 가리개: 보는 쪽(카메라)과 태양 사이에 놓인 어두운 원판 — 달처럼 광구만 꼭 맞게 가려요 */
      const occ = new THREE.Mesh(new THREE.CircleGeometry(1, 72), new THREE.MeshBasicMaterial({ color: 0x141a2b })); root.add(occ);
      const OCC_D = RS * 1.7, _cp = new V3();
      function placeOcc() { _cp.copy(ctx.camera.position); root.worldToLocal(_cp); const D = _cp.length(); if (D < OCC_D * 1.2) return; occ.position.copy(_cp).multiplyScalar(OCC_D / D); occ.lookAt(root.localToWorld(_cp.clone())); const r = RS * 1.03 * (D - OCC_D) / D; occ.scale.set(r, r, 1); }
      const occLab = label('가리개가 광구를 가려요', [0, -RS * 1.2, 0], { size: 11.5 });

      /* 홍염 · 플레어 · 태양풍 */
      const prom = [];
      [[-30, 40, 38, 62, 1.5], [28, -50, 24, -76, 1.3], [60, 140, 55, 110, 1.1], [-28, 80, -34, 110, 1.4], [20, -150, 14, -118, 1.2], [0, 10, 6, 32, 1.3]].forEach((q, i) => {
        const pt = (lat, lon, h) => { const la = lat * Math.PI / 180, lo = lon * Math.PI / 180; return new V3(Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)).multiplyScalar(RS * h); };
        const a = pt(q[0], q[1], 1.0), b = pt(q[2], q[3], 1.0), mid = a.clone().add(b).multiplyScalar(0.5).normalize().multiplyScalar(RS * (1 + 0.3 * q[4]));
        const curve = new THREE.CatmullRomCurve3([a, a.clone().multiplyScalar(1.08), mid, b.clone().multiplyScalar(1.08), b]);
        const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.07, 8, false), new THREE.MeshBasicMaterial({ color: 0xff4a28 })); sun.add(m); prom.push({ m, lab: i === 0 });
      });
      const promTop = new THREE.Object3D(); sun.add(promTop);
      { const g = prom[0].m.geometry; g.computeBoundingBox(); const c = new V3(); g.boundingBox.getCenter(c); promTop.position.copy(c.normalize().multiplyScalar(RS * 1.45)); }
      const promLab = label('홍염', promTop, { size: 12, color: 'rgba(170,30,10,.92)' });
      const flareG = glowSprite(1.8, 'rgba(255,255,255,1)', 'rgba(255,230,140,.7)'); sun.add(flareG); flareG.position.copy(spots[0].p).multiplyScalar(RS * 1.05);
      const flLab = label('플레어', flareG, { size: 12, color: 'rgba(130,70,0,.92)' });
      const NW = 160, wind = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 6, 5), new THREE.MeshBasicMaterial({ color: 0xffe9a8 }), NW); wind.frustumCulled = false; root.add(wind);
      const WP = []; for (let i = 0; i < NW; i++) { const u = rnd() * 2 - 1, a = rnd() * 6.283, r = Math.sqrt(1 - u * u); WP.push({ d: new V3(Math.cos(a) * r, u, Math.sin(a) * r), s: rnd(), v: 0.8 + rnd() * 0.8 }); }
      const wLab = label('태양풍', [RS * 2.6, -RS * 0.6, 0], { size: 12, color: 'rgba(130,90,10,.92)' });
      const _wm = new THREE.Matrix4();

      function show() {
        const m = st.mode, atm = m !== 'surface', act = m === 'act', AL = labs();
        chromo.visible = atm; corona.visible = atm; occ.visible = atm && st.occ;
        prom.forEach((p) => { p.m.visible = atm; }); flareG.visible = act; wind.visible = act;
        spots.forEach((s, i) => { s.g.visible = i < st.nSpot; });
        spotLab.show(m !== 'atm' && spots[0].g.visible); spotLab2.show(m === 'surface'); granLab.show(m === 'surface');
        // 대기 장면: 아직 이름표를 안 붙인 곳은 '❓'로 보이고, 그 자리를 누르면 이름이 붙어요 (2D에서 대기를 눌러 붙이는 것과 같아요)
        const q = (L, k, name) => { if (m === 'atm') { L.set(AL[k] ? name : '❓'); L.show(st.occ || !!AL[k]); } };
        chLab.show(atm); coLab.show(atm); promLab.show(act || m === 'atm');
        q(chLab, 'chromo', '채층'); q(coLab, 'corona', '코로나'); q(promLab, 'prom', '홍염');
        if (m !== 'atm') { chLab.set('채층'); coLab.set('코로나'); promLab.set('홍염'); }
        atLab.show(atm && !st.occ); occLab.show(atm && st.occ); flLab.show(act); wLab.show(act);
        text();
      }
      function text() {
        const m = st.mode;
        info(m === 'surface' ? '<b>광구</b>는 우리 눈에 보이는 태양 표면이에요. 쌀알 무늬가 있어요.<br><b>흑점</b>은 주변(약 6000 °C)보다 온도가 낮아(약 4000 °C) 어둡게 보여요.<br>흑점이 이동하는 것으로 태양이 <b>자전</b>한다는 걸 알 수 있어요.'
          : m === 'atm' ? (msgT > 0 ? msg + '<br>' : '') + '광구 바깥의 <b>채층</b>(붉은 층)과 <b>코로나</b>(희미한 흰 빛)를 <b>태양 대기</b>라고 해요.<br>광구가 너무 밝아 평소에는 안 보이지만, ' + (st.occ ? '지금처럼 <b>광구를 가리면</b> 코로나와 <b>홍염</b>이 보여요 (개기 일식).' : '<b>🌑 광구 가리기</b>로 광구를 가리면(개기 일식) 코로나가 보여요.')
          : '흑점 수가 많은 <b>극대기</b>에는 <b>홍염·플레어</b>와 <b>태양풍</b>이 더 활발해요.<br>플레어가 일어나면 입자가 지구에 도달해 오로라가 생기거나 통신 장애가 생길 수 있어요.');
      }
      function setAct(v) { st.act = v; st.nSpot = Math.max(2, Math.round(2 + v / 100 * (MAXS - 2))); show(); }
      /* 2D 실험과 같은 상태를 써요: 가리개 위치(S.occSp)와 붙인 이름표(S.atmoLab) */
      const sim = () => { const l = ctx.lesson && ctx.lesson(); return l && l.S ? l.S : null; };
      function labs() { const S = sim(); return (S && S.atmoLab) || {}; }
      let msg = '', msgT = 0;
      function say(h) { msg = h; msgT = 3; text(); }
      // 🌑 광구 가리기: 2D 가리개 원판을 태양 위에 꼭 맞게 옮겨요 (다시 누르면 치워요)
      const occB = controls.button('🌑 광구 가리기', () => {
        const S = sim(); if (!S || !S.occSp) return;
        const on = Math.hypot(S.occSp.x.target, S.occSp.y.target) > 0.01;
        if (on) { S.occSp.x.target = 0; S.occSp.y.target = 0; S.occTouched = true; S.snapped = true; }
        else { S.occSp.x.target = 1.7; S.occSp.y.target = 1.05; S.snapped = false; }
      });
      // 이름표: 2D에서 눌러 붙이는 것과 같아요 (광구를 가려야 대기가 보여요)
      const NEED = { chromo: 0.95, corona: 0.9, prom: 0.9 }, LNAME = { chromo: '채층', corona: '코로나', prom: '홍염' };
      const tapAtmo = (k) => () => {
        const S = sim(); if (!S || st.mode !== 'atm') return;
        if (!(S.c >= NEED[k])) { say('먼저 <b>🌑 광구 가리기</b>로 광구를 가려요. 광구가 너무 밝아 대기가 안 보여요.'); return; }
        S.atmoLab = Object.assign({}, S.atmoLab, { [k]: true }); show();
      };
      chLab.tap(tapAtmo('chromo')); coLab.tap(tapAtmo('corona')); promLab.tap(tapAtmo('prom'));
      const labB = [];
      let lastSc = null, lastSig = '';
      setAct(25);

      const seed = { t: 0 };
      return {
        update(dt, t) {
          const l = ctx.lesson && ctx.lesson(), sc = l && l.S && l.S.scene;
          if (sc !== lastSc) { lastSc = sc; const m = sc === 'photo' ? 'surface' : sc === 'atmo' ? 'atm' : sc === 'earth' ? null : sc ? 'act' : null; if (m && m !== st.mode) { st.mode = m; show(); } }
          // 2D 가리개 상태 · 이름표를 3D에 그대로 보여 줘요
          const S = l && l.S;
          if (S && S.occSp) {
            const on = Math.hypot(S.occSp.x.target, S.occSp.y.target) < 0.01 && S.occTouched, AL = S.atmoLab || {};
            const sig = on + '|' + !!AL.chromo + !!AL.corona + !!AL.prom;
            if (sig !== lastSig) { lastSig = sig; st.occ = on; occB.classList.toggle('on', on); labB.forEach((q) => q.b.classList.toggle('on', !!AL[q.k])); show(); }
          }
          if (msgT > 0) { msgT -= dt; if (msgT <= 0) text(); }
          sun.rotation.y += dt * 0.1;
          if (occ.visible) placeOcc();
          const act = st.mode === 'act' ? 0.6 + st.act / 100 : 0.4, bright = 0.9 + 0.1 * Math.sin(t * 1.5);
          if (st.mode !== 'surface') { corU.uT.value = t; corU.uK.value = (st.occ ? 1.5 : 0.4) * (0.9 + 0.1 * act + 0.05 * Math.sin(t * 1.7)); }
          if (st.mode === 'atm') prom.forEach((p, i) => { p.m.scale.setScalar(1 + 0.04 * Math.sin(t * 2 + i)); });
          if (st.mode === 'act') {
            prom.forEach((p, i) => { p.m.visible = (i / prom.length) < 0.25 + st.act / 100 * 0.75; p.m.scale.setScalar(1 + 0.04 * Math.sin(t * 2 + i)); });
            promLab.show(prom[0].m.visible);
            const f = Math.max(0, Math.sin(t * 2.2)) ** 6; flareG.scale.setScalar(1.2 + 2.6 * f); flareG.material.opacity = 0.3 + 0.7 * f;
            const spd = 0.4 + st.act / 100 * 1.4;
            for (let i = 0; i < NW; i++) { const w = WP[i]; w.s += dt * w.v * spd * 0.25; if (w.s > 1) w.s = 0; const r = RS * 1.1 + w.s * RS * 3.2; _wm.makeScale(1, 1, 1); _wm.setPosition(w.d.x * r, w.d.y * r, w.d.z * r); wind.setMatrixAt(i, _wm); }
            wind.instanceMatrix.needsUpdate = true; wind.count = Math.round(NW * (0.25 + st.act / 100 * 0.75));
          }
        },
        sync() {},
      };
    },
  });
})();
