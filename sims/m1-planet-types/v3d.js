/* m1-planet-types · 3D 지구형 행성과 목성형 행성
   지구형(수성·금성·지구·화성): 작고 단단한 암석 표면, 밀도가 커요(철 핵+암석). 위성이 적고 고리가 없어요.
   목성형(목성·토성·천왕성·해왕성): 크고 두꺼운 가스(수소·헬륨)층, 밀도가 작아요. 위성이 많고 고리가 있어요.
   (기본 크기는 보기 좋게 줄였고, '실제 크기 비율' 버튼으로 실제 비율을 볼 수 있어요.)
   3단계(두 무리의 특징)만 3D예요: 아래 막대에서 행성을 고르고 [🚀 탐사선 투하]를 누르면 2D 실험과 같은 탐사선이
   단면 모형 위로 내려가요 (지구형: 단단한 표면에 내려앉음 · 목성형: 기체 속으로 가라앉다 부서짐).
   망원경 관측 · 그래프에 점 찍기 · 특징 표 꼬리표 끌기(1 · 2 · 4단계)는 2D 화면이에요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN0 = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  window.SciSim3D.attach({
    host: PHN0 ? '.sc-tall' : '.sc-wide',   // 휴대폰에서는 세로 화면(.sc-tall)을 덮어요 (.sc-wide는 휴대폰에서 숨겨져 3D가 안 보였어요)
    title: '행성의 두 무리 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: 26 * (PHN0 ? 1.05 : 1), theta: 0.15, phi: 1.3, fov: 45, target: [0, -0.2, 0], min: 7, max: 60 },
    autoRotate: 0,
    levels: [2],   // 3단계(탐사선 · 밀도 · 고리)만 3D
    build(ctx) {
      const { THREE, scene, root, label, info, controls, camera, orbit } = ctx;
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

      scene.add(new THREE.AmbientLight(0x8fa0d8, 0.55));
      const key = new THREE.DirectionalLight(0xfff3dc, 2.2); key.position.set(-12, 8, 14); scene.add(key);
      root.add(starField(300, 70));
      const st = { mode: 'size', real: false, cut: false };
      const PL = [
        { id: 'mercury', n: '수성', R: 0.38, den: 5.43, moon: '0개', col: ['#9a9a9a', '#b9b3a8', '#8a8579'], g: 0 },
        { id: 'venus', n: '금성', R: 0.95, den: 5.24, moon: '0개', col: ['#e8cf9a', '#d9b877', '#f0dfb8'], g: 0 },
        { id: 'earth', n: '지구', R: 1, den: 5.51, moon: '1개', col: ['#2f7fd8', '#4caf6a', '#2f7fd8', '#f2f6fa'], g: 0 },
        { id: 'mars', n: '화성', R: 0.53, den: 3.93, moon: '2개', col: ['#c9623b', '#b5532f', '#d98a5c'], g: 0 },
        { id: 'jupiter', n: '목성', R: 11.2, den: 1.33, moon: '95개 이상', col: ['#d9b48a', '#c58a5c', '#efe2cc', '#b97a4a'], g: 1, ring: 0.25 },
        { id: 'saturn', n: '토성', R: 9.45, den: 0.69, moon: '270개 이상', col: ['#e6d3a0', '#d3bb82', '#f2e6bf'], g: 1, ring: 1 },
        { id: 'uranus', n: '천왕성', R: 4.01, den: 1.27, moon: '28개 이상', col: ['#9fe1e6', '#86d3dc'], g: 1, ring: 0.3 },
        { id: 'neptune', n: '해왕성', R: 3.88, den: 1.64, moon: '16개', col: ['#3d63dd', '#4c78f0', '#3558c8'], g: 1, ring: 0.25 },
      ];
      /* 단면(¼ 잘라낸 모양): 겹겹의 층 */
      function cutaway(R, layers) {
        const g = new THREE.Group();
        layers.forEach((L, i) => {
          const r = L.f * R, r0 = i ? layers[i - 1].f * R : 0, mt = mat(L.c, { roughness: 0.7, side: THREE.DoubleSide });
          if (r0 === 0 && i === 0) { const core = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 24), mat(L.c, { roughness: 0.6 })); g.add(core); }
          else g.add(new THREE.Mesh(new THREE.SphereGeometry(r, 48, 32, 0, Math.PI * 1.5), mt));
          const capMat = mat(L.c, { roughness: 0.8, side: THREE.DoubleSide });
          if (i > 0) {
            const a = new THREE.Mesh(new THREE.RingGeometry(r0, r, 40, 1, Math.PI / 2, Math.PI), capMat); g.add(a);
            const b = new THREE.Mesh(new THREE.RingGeometry(r0, r, 40, 1, -Math.PI / 2, Math.PI), capMat); b.rotation.y = Math.PI / 2; g.add(b);
          } else { const a = new THREE.Mesh(new THREE.CircleGeometry(0.0001, 3), capMat); g.add(a); }
        });
        return g;
      }
      const TER = [{ f: 0.55, c: 0xe28a3a }, { f: 0.9, c: 0x9a5b3a }, { f: 1, c: 0x6b4a36 }];
      const JOV = [{ f: 0.18, c: 0x9a6a4a }, { f: 0.55, c: 0x6fa6d8 }, { f: 1, c: 0xd9b48a }];
      const GAS = [{ f: 0.3, c: 0x8a7a6a }, { f: 0.6, c: 0x7fbfe8 }, { f: 1, c: 0x9ee0e6 }];
      const items = [];
      PL.forEach((p, i) => {
        const g = new THREE.Group(); const body = new THREE.Mesh(new THREE.SphereGeometry(1, 56, 40), mat(0xffffff, { map: bandTex(p.col, 4 + i * 7), roughness: 0.8 }));
        g.add(body);
        const cut = cutaway(1, p.g ? (i < 6 ? JOV : GAS) : TER); cut.visible = false; g.add(cut);
        let rg = null; if (p.ring) { rg = new THREE.Mesh(new THREE.RingGeometry(1.35, p.ring === 1 ? 2.3 : 1.7, 80), new THREE.MeshStandardMaterial({ color: 0xe6d3a0, transparent: true, opacity: p.ring === 1 ? 0.75 : 0.25, side: THREE.DoubleSide, roughness: 0.7 })); rg.rotation.x = Math.PI / 2 - (i === 6 ? 1.4 : 0.4); g.add(rg); }
        /* 위성 (대표로 몇 개만 그려요) */
        const moons = []; const nm = p.moon === '0개' ? 0 : p.moon === '1개' ? 1 : p.moon === '2개' ? 2 : 5;
        for (let k = 0; k < nm; k++) { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), mat(0xcfc9bd, { roughness: 0.9 })); g.add(m); moons.push({ m, r: 1.6 + k * 0.38 + (p.g ? 0.5 : 0), s: 0.8 / (1 + k * 0.4), a: k * 2.1 + i, sz: p.g ? 0.12 : 0.28 }); }
        root.add(g);
        const lab = label(p.n, g, { size: 12.5 });
        const lab2 = label('', g, { size: 11, color: 'rgba(30,64,175,.9)' });
        items.push({ p, g, body, cut, rg, moons, lab, lab2, r: 1 });
      });
      const gl1 = label('지구형 행성', [-4.4, 0, 0], { size: 13, color: 'rgba(180,90,30,.92)' });
      const gl2 = label('목성형 행성', [0, 0, 0], { size: 13, color: 'rgba(30,64,175,.92)' });
      function layout() {
        const sc = st.real ? 0.3 : 0.5, pw = st.real ? 1 : 0.6, rOf = (R) => sc * Math.pow(R, pw);
        let x = 0; const ter = items.filter((it) => !it.p.g), jov = items.filter((it) => it.p.g);
        const widthT = ter.reduce((s, it) => s + 2 * rOf(it.p.R) + 1.2, -1.2), widthJ = jov.reduce((s, it) => s + 2 * rOf(it.p.R) * (it.p.ring === 1 ? 1.5 : 1) + 1.2, -1.2);
        x = -widthT / 2; ter.forEach((it) => { const r = rOf(it.p.R); it.r = r; it.g.scale.setScalar(r); it.g.position.set(x + r, -3.3 + (st.real ? 0.4 : 0), 0); x += 2 * r + 1.2; });
        x = -widthJ / 2; jov.forEach((it) => { const r = rOf(it.p.R), wd = 2 * r * (it.p.ring === 1 ? 1.5 : 1); it.r = r; it.g.scale.setScalar(r); it.g.position.set(x + wd / 2, 2.1 + (st.real ? 0.8 : 0), 0); x += wd + 1.2; });
        gl1.obj = [0, -3.3 - 1.6, 0]; gl2.obj = [0, 2.1 + (st.real ? 0.8 : 0) + 4.8, 0];
        items.forEach((it) => { it.lab.off = [0, it.r + 0.55, 0]; it.lab2.off = [0, -it.r - 0.6, 0]; });
        gl2.obj = [0, st.real ? 7.4 : 5.2, 0];
      }
      function show() {
        const m = st.mode;
        items.forEach((it) => {
          it.body.visible = !(m === 'cut'); it.cut.visible = m === 'cut'; if (it.rg) it.rg.visible = m !== 'cut' || true;
          it.moons.forEach((o) => { o.m.visible = m === 'moon'; });
          it.lab2.show(m !== 'size' && m !== 'cut'); it.lab2.set(m === 'den' ? it.p.den + ' g/cm³' : m === 'moon' ? '위성 ' + it.p.moon : '');
          it.lab2.el.style.display = '';
        });
        text();
      }
      function text() {
        const m = st.mode, l = ctx.lesson(), S = l && l.S;
        if (S && S.scene === 'probe' && S.probe && S.probe.id) {   // 탐사선 결과 (2D 탐사 창과 같은 내용)
          const it = items.find((x) => x.p.id === S.probe.id), pr = S.probe;
          if (it) { info('<b>' + it.p.n + '</b>에 탐사선을 보냈어요.<br>' + (!pr.gas ? (pr.landed ? '단단한 <b>암석 표면</b>에 내려앉았어요.' : '내려가는 중…')
            : pr.vanished ? '단단한 표면이 없어 <b>기체 속으로 계속 가라앉다가</b> 높은 압력에 부서졌어요.' : pr.T > 3 ? '구름(기체) 속으로 들어가요. 아직 땅이 없어요…' : '내려가는 중…')); return; }
        }
        info(m === 'size' ? '<b>지구형 행성</b>(수성·금성·지구·화성)은 반지름이 작고, <b>목성형 행성</b>(목성·토성·천왕성·해왕성)은 훨씬 커요.' + (st.real ? '<br>실제 크기 비율이에요. 목성의 반지름은 지구의 약 11.2배예요.' : '<br>(보기 좋게 줄여 그렸어요. 반지름·질량은 지구 = 1)') + '<br>목성형 행성은 질량도 커요.'
          : m === 'cut' ? '<b>지구형</b>: 암석으로 된 <b>단단한 표면</b>이 있어요.<br><b>목성형</b>: 주로 가벼운 <b>기체</b>라서 단단한 표면이 없어요.<br>그래서 목성형 행성은 평균 밀도가 작아요.'
          : m === 'den' ? '평균 밀도(g/cm³): <b>지구형 행성은 커요</b>(3.93~5.51), <b>목성형 행성은 작아요</b>(0.69~1.64).<br>물의 밀도는 1 g/cm³예요.'
          : '<b>지구형</b>: 위성이 0~2개예요.<br><b>목성형</b>: 위성이 <b>많아요</b>. 행성 둘레의 고리도 살펴보세요.');
      }
      const modeSeg = controls.segment('', [{ value: 'size', label: '크기' }, { value: 'cut', label: '단면' }, { value: 'den', label: '밀도' }, { value: 'moon', label: '위성·고리' }], 'size', (v) => { st.mode = v; show(); });
      const rB = controls.button('📏 실제 크기 비율', () => { st.real = !st.real; rB.classList.toggle('on', st.real); layout(); text(); });
      /* 탐사선: 2D 실험의 탐사 대상(S.probeSel)과 투하 진행(S.probe.T)을 그대로 따라가요 */
      controls.text('').style.cssText = 'flex-basis:100%;height:0;padding:0;margin:-3px 0';
      const L2 = () => { const l = ctx.lesson(); return l && l.S && l.selectProbe ? l : null; };
      const pSeg = controls.segment('🚀', PL.map((p) => ({ value: p.id, label: p.n })), 'earth', (v) => { const l = L2(); if (l) l.selectProbe(v); });
      const probe = new THREE.Group();
      { const m = mat(0xf1f5f9, { metalness: 0.3, roughness: 0.35, emissive: 0x334155 }); const b = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 0.14, 16), m); probe.add(b);
        const top = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.1, 16), m); top.position.y = 0.12; probe.add(top);
        const fl = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 12), new THREE.MeshBasicMaterial({ color: 0xffb347 })); fl.rotation.x = Math.PI; fl.position.y = -0.15; probe.add(fl); probe.userData.fl = fl; }
      probe.visible = false; root.add(probe);
      const selRing = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.03, 8, 64), new THREE.MeshBasicMaterial({ color: 0x38bdf8 })); selRing.visible = false; root.add(selRing);
      let lastSel = null, lastKey = '';
      layout(); show();

      return {
        update(dt, t) {
          const l = L2(), S = l && l.S, inProbe = !!(S && S.scene === 'probe');
          if (inProbe) {
            if (S.probeSel !== lastSel) { lastSel = S.probeSel; pSeg.set(lastSel); }
            const pr = S.probe && S.probe.id === S.probeSel ? S.probe : null, it = items.find((x) => x.p.id === S.probeSel);
            if (pr && !pr.done && pr.T < 0.1 && st.mode !== 'cut') { st.mode = 'cut'; modeSeg.set('cut'); show(); }   // 투하하면 단면으로 보여 줘요
            const key = pr ? [pr.id, pr.landed, pr.vanished, pr.T > 3].join() : '';
            if (key !== lastKey) { lastKey = key; text(); }
            if (it) {
              const r = it.r, c = it.g.position; selRing.visible = true; selRing.position.set(c.x, c.y, c.z); selRing.scale.setScalar(r); selRing.rotation.x = Math.PI / 2;
              let h, vis = true;   // 행성 중심에서 탐사선까지의 높이 (반지름 r 기준)
              const H0 = 1.5;   // 처음 높이 (이름표보다 위)
              if (!pr) h = r + H0;
              else if (!pr.gas) h = r + H0 * Math.max(0, 1 - pr.T / 3.7);
              else { h = pr.T < 3 ? r + H0 * (1 - pr.T / 3) : r * (1 - 0.65 * Math.min(1, (pr.T - 3) / 2.9)); vis = !pr.vanished; }
              const sh = pr && pr.shake > 0 ? (Math.random() - 0.5) * 0.04 : 0;
              probe.visible = vis; const ox = Math.sin(orbit.theta) * r * 0.15, oz = Math.cos(orbit.theta) * r * 0.15;   // 잘라 낸 쪽(화면 쪽)으로 조금
              probe.position.set(c.x + sh + ox, c.y + h + 0.15, c.z + oz); probe.scale.setScalar(Math.max(1.5, Math.min(2.4, r * 1.1)));
              probe.userData.fl.visible = !!pr && !pr.done && !pr.landed && !pr.vanished;
            }
          } else { probe.visible = false; selRing.visible = false; }
          items.forEach((it, i) => {
            if (st.mode === 'cut') { it.g.rotation.y = 3 * Math.PI / 4 + orbit.theta; return; }   // 잘라 낸 쪽이 늘 화면을 향하게
            it.g.rotation.y += dt * (it.p.g ? 0.5 : 0.2);
            if (st.mode === 'moon') it.moons.forEach((o) => { o.a += dt * o.s; o.m.position.set(Math.cos(o.a) * o.r, 0.15 * Math.sin(o.a * 2), -Math.sin(o.a) * o.r); o.m.scale.setScalar(o.sz); });
          });
        },
        sync() {},
      };
    },
  });
})();
