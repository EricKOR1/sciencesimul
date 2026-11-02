/* hu-sunspot-rotation · 3D 태양의 차등 자전
   태양은 단단한 공이 아니라 기체라서 위도마다 도는 빠르기가 달라요: 적도는 약 25일, 극 쪽으로 갈수록 느려져요.
   같은 경도(한 줄)에서 출발한 흑점들이 시간이 지나면서 어긋나는 모습을 입체로 봐요.
   항성 각속도 ω(φ) = 14.4° − 2.7°·sin²φ (도/일) — 2D 실험과 같은 식이에요. 지구의 공전 때문에 지구에서 재는 회합 주기는 이보다 길어요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const DEG = Math.PI / 180, RS = 3;
  const omSid = (phi) => 14.4 - 2.7 * Math.pow(Math.sin(phi * DEG), 2);

  function hash3(x, y, z) { let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1274126177); h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967295; }
  const fade = (t) => t * t * (3 - 2 * t);
  function vnoise(x, y, z) {
    const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = fade(x - ix), fy = fade(y - iy), fz = fade(z - iz);
    const l = (a, b, t) => a + (b - a) * t, c = (dx, dy, dz) => hash3(ix + dx, iy + dy, iz + dz);
    return l(l(l(c(0, 0, 0), c(1, 0, 0), fx), l(c(0, 1, 0), c(1, 1, 0), fx), fy), l(l(c(0, 0, 1), c(1, 0, 1), fx), l(c(0, 1, 1), c(1, 1, 1), fx), fy), fz);
  }
  function sunCanvas() {
    const W = 512, H = 256, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d'), im = g.createImageData(W, H);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const lon = (i / W) * Math.PI * 2, lat = (0.5 - (j + 0.5) / H) * Math.PI, cx = Math.cos(lat) * Math.cos(lon), cy = Math.sin(lat), cz = Math.cos(lat) * Math.sin(lon);
      const v = 0.6 * vnoise(cx * 14, cy * 14, cz * 14) + 0.3 * vnoise(cx * 30 + 5, cy * 30, cz * 30) + 0.1 * vnoise(cx * 60, cy * 60 + 3, cz * 60), o = (j * W + i) * 4;
      const t = Math.min(1, Math.max(0, (v - 0.25) * 1.6));
      im.data[o] = 255 - 10 * (1 - t); im.data[o + 1] = 150 + 70 * t; im.data[o + 2] = 40 + 50 * t; im.data[o + 3] = 255;
    }
    g.putImageData(im, 0, 0); return cv;
  }

  window.SciSim3D.attach({
    title: '태양의 차등 자전 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    levels: [0, 2],
    camera: { dist: PHONE ? 17 : 12.5, theta: 0.0, phi: 1.28, min: 5, max: 20 },
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const st = { day: 0, play: true, rate: 3, rigid: false, grid: true };
      const sunG = new THREE.Group(); sunG.rotation.x = 0.12; root.add(sunG);       // 자전축을 조금 기울여요

      /* 태양: 테두리가 어두워지는 쉐이더 */
      const tex = new THREE.CanvasTexture(sunCanvas()); if ('encoding' in tex) tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 4;
      const sunMat = new THREE.ShaderMaterial({
        uniforms: { map: { value: tex } },
        vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv=uv; vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.0); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }',
        fragmentShader: 'uniform sampler2D map; varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vec3 c=texture2D(map,vUv).rgb; float mu=clamp(dot(normalize(vN),normalize(vV)),0.0,1.0); float k=0.38+0.62*pow(mu,0.55); gl_FragColor=vec4(c*k*1.08,1.0); }',
      });
      const sun = new THREE.Mesh(new THREE.SphereGeometry(RS, 96, 64), sunMat); sunG.add(sun);
      const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 40, 64, 64, 64); gr.addColorStop(0, 'rgba(255,190,80,.55)'); gr.addColorStop(1, 'rgba(255,150,40,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); glow.scale.set(RS * 2 * 1.5, RS * 2 * 1.5, 1); root.add(glow);

      /* 위도선 · 적도 */
      const gridG = new THREE.Group(); sunG.add(gridG);
      [-60, -30, 0, 30, 60].forEach((lat) => {
        const r = RS * 1.004 * Math.cos(lat * DEG), y = RS * 1.004 * Math.sin(lat * DEG), pts = [];
        for (let i = 0; i < 96; i++) { const a = i / 96 * Math.PI * 2; pts.push(new THREE.Vector3(r * Math.cos(a), y, r * Math.sin(a))); }
        const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 128, lat === 0 ? 0.022 : 0.013, 6, true), new THREE.MeshBasicMaterial({ color: lat === 0 ? 0xffffff : 0xfff3c4, transparent: true, opacity: lat === 0 ? 0.8 : 0.5 })); gridG.add(m);
      });
      const axis = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, RS * 2.7, 8), new THREE.MeshBasicMaterial({ color: 0xcfd8ff, transparent: true, opacity: 0.55 })); sunG.add(axis);
      const labN = label('북극', [0, RS * 1.38, 0], { size: 11.5 }), labE = label('적도', [RS * 1.03, 0, 0], { size: 11.5 });

      /* 흑점 줄: 같은 경도에서 출발 */
      const LATS = [-60, -45, -30, -15, 0, 15, 30, 45, 60];
      const spots = LATS.map((lat) => {
        const g = new THREE.Group();
        const pen = new THREE.Mesh(new THREE.CircleGeometry(0.19, 28), new THREE.MeshBasicMaterial({ color: 0x8a3b12, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 }));
        const um = new THREE.Mesh(new THREE.CircleGeometry(0.1, 24), new THREE.MeshBasicMaterial({ color: 0x1b0c05, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4 })); um.position.z = 0.002;
        g.add(pen, um); sunG.add(g); return { g, lat };
      });
      /* 흑점이 지나간 자리(꼬리)와 비교용 '한 덩어리로 도는' 점 */
      const trailG = new THREE.Group(); sunG.add(trailG);
      const tg = new THREE.SphereGeometry(0.035, 8, 6), tm = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const trailN = 30, trails = LATS.map(() => { const arr = []; for (let k = 0; k < trailN; k++) { const m = new THREE.Mesh(tg, tm); m.visible = false; trailG.add(m); arr.push(m); } return arr; });
      const refLine = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: 40 }, (_, k) => { const lat = (k / 39 * 2 - 1) * 70 * DEG; return new THREE.Vector3(RS * 1.012 * Math.cos(lat), RS * 1.012 * Math.sin(lat), 0); })), 60, 0.018, 6, false), new THREE.MeshBasicMaterial({ color: 0x7ee0ff }));
      sunG.add(refLine);

      label('출발선(하늘색)', [0, RS * 0.98, RS * 0.6], { size: 11.5, color: 'rgba(14,100,140,.92)' });
      const place = (lat, lon, r) => { const la = lat * DEG, lo = lon * DEG; return [r * Math.cos(la) * Math.sin(lo), r * Math.sin(la), r * Math.cos(la) * Math.cos(lo)]; };   // lon 0 = +z (정면)
      const SW = (l) => (st.rigid ? omSid(0) : omSid(l));
      const o = new THREE.Object3D(), nrm = new THREE.Vector3();
      function put(g, lat, lon, r) {
        const p = place(lat, lon, r); g.position.set(p[0], p[1], p[2]); nrm.set(p[0], p[1], p[2]).normalize();
        g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), nrm);
      }
      function text() {
        const days = Math.round(st.day), eq = 360 / omSid(0), hi = 360 / omSid(60);
        info('<b>' + days + '일 지났어요</b><br>' + (st.rigid ? '한 덩어리로 돈다면 모두 같은 줄을 유지해요. 실제 태양은 그렇지 않아요.' : '적도 <b>약 ' + eq.toFixed(0) + '일</b>, 위도 60° <b>약 ' + hi.toFixed(0) + '일</b> 에 한 바퀴 돌아요 → 줄이 어긋나요.'));
      }
      const bP = controls.button('⏸ 멈춤', () => { st.play = !st.play; bP.textContent = st.play ? '⏸ 멈춤' : '▶ 재생'; });
      const rD = controls.range('날짜', 0, 90, 1, 0, (v) => { st.day = v; st.play = false; bP.textContent = '▶ 재생'; }, (v) => v + '일');
      const bR = controls.button('한 덩어리로 돌면? ✕', () => { st.rigid = !st.rigid; bR.classList.toggle('on', st.rigid); bR.textContent = '한 덩어리로 돌면? ' + (st.rigid ? '✓' : '✕'); st.day = 0; text(); });
      controls.button('↺ 처음으로', () => { st.day = 0; st.play = true; bP.textContent = '⏸ 멈춤'; });
      text();

      let acc = 0;
      return {
        update(dt) {
          if (st.play) { st.day += dt * st.rate; if (st.day > 90) st.day = 0; rD.set(Math.round(st.day)); }
          spots.forEach((s, i) => {
            const lon = SW(s.lat) * st.day; put(s.g, s.lat, lon, RS * 1.003);
                        /* 지나간 자리 (몇 개만) */
            trails[i].forEach((m, k) => {
              const back = (k + 1) * 2.2; if (st.day < back * 0.5) { m.visible = false; return; }
              const l2 = SW(s.lat) * (st.day - back); m.visible = true; const p = place(s.lat, l2, RS * 1.006); m.position.set(p[0], p[1], p[2]);
            });
          });
          acc += dt; if (acc > 0.2) { acc = 0; text(); }
        },
        sync() {},
      };
    },
  });
})();
