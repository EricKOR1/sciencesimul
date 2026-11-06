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
    levels: [2],
    camera: { dist: PHONE ? 17 : 12.5, theta: 0.0, phi: 1.28, min: 5, max: 20 },
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const st = { day: 0, P: 0, key: '' };
      const W = () => window.__sim || {};
      const DFLT = [{ phi: 5, l0: -40, om: 13.4, col: '#2563eb' }, { phi: 20, l0: -30, om: 13.1, col: '#16a34a' }, { phi: 35, l0: -35, om: 12.6, col: '#d97706' }, { phi: 45, l0: -25, om: 12.1, col: '#dc2626' }];
      const SP = (W().SP4 && W().SP4.length === 4) ? W().SP4 : DFLT;
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

      /* 흑점 4개 (2D '위도별 흑점 주기'의 흑점: 위도 5° · 20° · 35° · 45°) — 지구에서 본 하루 이동 각도(회합)로 움직여요 */
      const SPOT_N = ['①', '②', '③', '④'];
      const spots = SP.map((sp, i) => {
        const g = new THREE.Group();
        const pen = new THREE.Mesh(new THREE.CircleGeometry(0.2, 28), new THREE.MeshBasicMaterial({ color: 0x8a3b12, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 }));
        const um = new THREE.Mesh(new THREE.CircleGeometry(0.11, 24), new THREE.MeshBasicMaterial({ color: 0x1b0c05, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4 })); um.position.z = 0.002;
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.23, 0.29, 28), new THREE.MeshBasicMaterial({ color: new THREE.Color(sp.col), side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -6 })); ring.position.z = 0.003;
        g.add(pen, um, ring); sunG.add(g);
        const lb = label('위도 ' + sp.phi + '°', g, { size: 11.5, color: 'rgba(15,20,40,.85)' }); lb.off = [0, 0.45, 0];
        return { g, lat: sp.phi, lon0: sp.l0, om: sp.om, lb };
      });
      const trailG = new THREE.Group(); sunG.add(trailG);
      const tg = new THREE.SphereGeometry(0.035, 8, 6);
      const trailN = 24, trails = SP.map((sp) => { const tm = new THREE.MeshBasicMaterial({ color: new THREE.Color(sp.col) }); const arr = []; for (let k = 0; k < trailN; k++) { const m = new THREE.Mesh(tg, tm); m.visible = false; trailG.add(m); arr.push(m); } return arr; });
      const place = (lat, lon, r) => { const la = lat * DEG, lo = lon * DEG; return [r * Math.cos(la) * Math.sin(lo), r * Math.sin(la), r * Math.cos(la) * Math.cos(lo)]; };   // lon 0 = +z (정면)
      const nrm = new THREE.Vector3();
      function put(g, lat, lon, r) {
        const p = place(lat, lon, r); g.position.set(p[0], p[1], p[2]); nrm.set(p[0], p[1], p[2]).normalize();
        g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), nrm);
      }
      function text() {
        const q = W(), free = !!(q.game && q.game.free);
        let h = '<b>경과 ' + st.day.toFixed(1) + '일</b> · 흑점 4개 (위도 ' + SP.map((s) => s.phi + '°').join(' · ') + ')<br>태양은 기체라서 위도마다 도는 빠르기가 달라요(<b>차등 자전</b>): 같은 줄에서 출발해도 높은 위도의 흑점이 점점 뒤처져요.';
        if (free) h += '<br>회합 주기 ' + SP.map((s) => '<b>' + (360 / s.om).toFixed(1) + '일</b>').join(' · ');
        /* 2D 표와 같은 값: 위도마다 하루 이동 각도 → T회합 = 360° ÷ (하루 이동) */
        const S = q.S || {};
        if (q.SP4 && !free && (S.view === 'diff' || S.view === 'compose')) h += '<br><b>표</b> (6일 관측) · ' + q.SP4.map((s) => '위도 ' + s.phi + '°: 하루 이동 <b>' + s.om.toFixed(2) + '°</b> → T회합 ' + (s.ok ? '<b style="color:#86efac">' + s.T.toFixed(1) + '일</b>' : '?')).join('<br>');
        info(h);
      }
      /* ▶ 재생: 위성 영상을 합성하듯 0~7일을 보여 줘요 (2D '경과일' 슬라이더와 같은 값) */
      let syncing = false, ready = false;
      const player = controls.player({
        duration: 10, loop: true, autoplay: true, label: '재생',
        phases: [[0, '0일'], [0.5, '3.5일'], [0.9, '7일']],
        onFrame(p) { st.P = p; st.day = 7 * p; if (ready && !syncing) { try { const q = W(), S = q.S; if (S && S.df && (S.view === 'compose' || S.view === 'diff')) { q.setCDay(7 * p, true); S.df.play = false; } } catch (e) {} } },
      });
      ready = true;
      function follow() {
        const q = W(), S = q.S; if (!S || !S.df) return;
        if ((S.view === 'compose' || S.view === 'diff') && Math.abs(S.df.cDay - st.day) > 0.02 && (S.df.play || S.df.cDay > 0)) { syncing = true; player.set(S.df.cDay / 7); syncing = false; if (S.df.play) player.pause(); }
        const k = (q.game && q.game.free) ? 1 : 0; if (k !== st.key) { st.key = k; text(); }
      }
      text();

      let acc = 0;
      return {
        update(dt) {
          follow();
          spots.forEach((s, i) => {
            put(s.g, s.lat, s.lon0 + s.om * st.day, RS * 1.003);
            trails[i].forEach((m, k) => {
              const back = (k + 1) * 0.3; if (st.day < back) { m.visible = false; return; }
              m.visible = true; const p = place(s.lat, s.lon0 + s.om * (st.day - back), RS * 1.006); m.position.set(p[0], p[1], p[2]);
            });
          });
          acc += dt; if (acc > 0.2) { acc = 0; text(); }
        },
        sync() { follow(); },
      };
    },
  });
})();
