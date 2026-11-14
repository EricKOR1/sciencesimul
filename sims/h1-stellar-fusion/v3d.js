/* h1-stellar-fusion · 3D 별의 탄생 · 중심핵 수소 핵융합 · 무거운 별의 양파 껍질
   2D 실험의 단계와 같은 장면을 보여 줘요. (질량·중심 온도·진화 단계는 2D와 서로 맞춰져요)
   ① 별의 일생: 가스 구름 → 원시별 → 주계열성 (질량 0.5·1·8·20배)  ② 수소 핵융합 모형  ③ 무거운 별과 양파 껍질 */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const MASS = {
    0.5: { r: 34, col: 0xff8a4c, life: '약 700억 년', tag: '붉은색', temp: '낮음' },
    1: { r: 50, col: 0xffd34d, life: '약 100억 년', tag: '노란색', temp: '중간' },
    8: { r: 82, col: 0xcfe0ff, life: '약 4천만 년', tag: '청백색', temp: '높음' },
    20: { r: 106, col: 0x8fb4ff, life: '약 1천만 년', tag: '푸른색', temp: '매우 높음' },
  };
  const MK = [0.5, 1, 8, 20];
  const LAYERS = [
    { name: '수소 층', prod: '수소 → 헬륨', col: 0x60a5fa },
    { name: '헬륨 층', prod: '헬륨 → 탄소·산소', col: 0xfde68a },
    { name: '탄소 층', prod: '탄소 → 네온·마그네슘', col: 0x34d399 },
    { name: '네온·산소 층', prod: '네온·산소 → 규소·황', col: 0xfb923c },
    { name: '규소 층', prod: '규소 → 철', col: 0xa78bfa },
    { name: '철 핵', prod: '핵융합이 멈춰요', col: 0xd1d5db },
  ];
  const STN = ['① 수소 연소', '② 헬륨 연소', '③ 탄소 연소', '④ 네온·산소 연소', '⑤ 규소 연소', '⑥ 철 핵 완성'];
  const TIME20 = ['약 1천만 년', '약 1백만 년', '약 수백 년', '약 1년', '약 1일', '—'];
  const THR = 10;   // 약 1000만 K 이상에서 수소 핵이 반발력을 이기고 합쳐져요

  window.SciSim3D.attach({
    title: '별과 핵융합 3D',
    camera: { dist: PHN ? 14.5 : 11, theta: -2.35, phi: 1.2, min: 6, max: 26 },
    levels: [2],
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      const lesson = () => window.__sim || null;
      const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.55, metalness: 0, side: THREE.DoubleSide }, o || {}));
      const glowMat = (c, op) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, depthWrite: false });
      const V = THREE.Vector3;
      const rnd = (() => { let a = 2024; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; })();

      // ---- 공용 꾸미기: 부드러운 빛 무늬 · 별빛 배경 · 별 표면의 끓는 무늬
      const mkTex = (fn, w) => { const c = document.createElement('canvas'); c.width = c.height = w; fn(c.getContext('2d'), w); return new THREE.CanvasTexture(c); };
      const glowTex = mkTex((g, w) => { const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,255,255,.55)'); r.addColorStop(0.6, 'rgba(255,255,255,.12)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); }, 128);
      const granTex = mkTex((g, w) => { g.fillStyle = '#d0d0d0'; g.fillRect(0, 0, w, w); for (let i = 0; i < 900; i++) { const v = 150 + Math.random() * 105 | 0; g.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',.6)'; g.beginPath(); g.arc(Math.random() * w, Math.random() * w, 3 + Math.random() * 9, 0, 6.283); g.fill(); } for (let i = 0; i < 60; i++) { g.fillStyle = 'rgba(110,110,110,.25)'; g.beginPath(); g.arc(Math.random() * w, Math.random() * w, 4 + Math.random() * 10, 0, 6.283); g.fill(); } }, 256);
      { const sa = [], sc = []; for (let i = 0; i < 700; i++) { const v = new V(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize().multiplyScalar(30 + rnd() * 6); sa.push(v.x, v.y, v.z); const c = 0.5 + rnd() * 0.5; sc.push(c * 0.9, c * 0.92, c); }
        const sgm = new THREE.BufferGeometry(); sgm.setAttribute('position', new THREE.Float32BufferAttribute(sa, 3)); sgm.setAttribute('color', new THREE.Float32BufferAttribute(sc, 3));
        root.add(new THREE.Points(sgm, new THREE.PointsMaterial({ size: 0.16, vertexColors: true, sizeAttenuation: true, transparent: true, opacity: 0.85, depthWrite: false }))); root.children[root.children.length - 1].userData.v3bg = true;   /* 별·먼지는 배경 */ }
      const mkGlow = (col, op) => new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: col, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false }));
      const sceneOf = (lv) => (lv === 0 ? 'life' : lv === 1 ? 'core' : 'onion');
      let scene = sceneOf(ctx.level);

      /* ---- 장면별 조작 줄 묶기 (조작 줄은 지울 수 없어서 장면마다 보이고 숨겨요) ---- */
      const ctlEl = document.querySelector('.v3-ctl');
      const groups = { life: [], core: [], onion: [] };
      function grp(name, fn) { const n0 = ctlEl ? ctlEl.children.length : 0; const r = fn(); if (ctlEl) for (let i = n0; i < ctlEl.children.length; i++) groups[name].push(ctlEl.children[i]); return r; }

      /* =========================================================
         ① 별의 일생: 가스 구름 → 원시별 → 주계열성
         ========================================================= */
      const gLife = new THREE.Group(); root.add(gLife);
      const starMat = std(0xb91c1c, { emissive: 0xb91c1c, emissiveIntensity: 0.6, roughness: 0.4 });
      const starMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), starMat); gLife.add(starMesh);
      const halo = mkGlow(0xffffff, 0.95); gLife.add(halo);
      starMat.map = granTex; starMat.emissiveMap = granTex; starMat.needsUpdate = true;
      const flashM = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshBasicMaterial({ color: 0xfff3c0, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); gLife.add(flashM);
      const NC = 420, cloudBase = [], cloudArr = new Float32Array(NC * 3);
      for (let i = 0; i < NC; i++) { const v = new V(rnd() - 0.5, (rnd() - 0.5) * 0.8, rnd() - 0.5).normalize().multiplyScalar(Math.pow(rnd(), 0.6)); cloudBase.push(v); }
      const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.BufferAttribute(cloudArr, 3));
      const cloudMat = new THREE.PointsMaterial({ color: 0xc4b5fd, size: 0.34, map: glowTex, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending });
      const cloud = new THREE.Points(cg, cloudMat); gLife.add(cloud);
      const lifeLab = label('', starMesh, { size: 12 });
      let lifeP = 0.9, lifeMass = 1, lifeCol = new THREE.Color(0xb91c1c);
      const RED = new THREE.Color(0xb91c1c);
      function lifeStageName(b) { return b < 0.38 ? '가스 구름' : b < 0.6 ? '원시별' : b < 0.78 ? '핵융합 시작' : '주계열성'; }
      function lifeInfo() {
        const M = MASS[lifeMass], b = lifeP;
        info('<b>⚖ 질량 ' + lifeMass + '배</b> · ' + lifeStageName(b) + '<br>' + (b >= 0.78
          ? '색 <b>' + M.tag + '</b> · 표면 온도 <b>' + M.temp + '</b> · 수명 <b>' + M.life + '</b>'
          : b >= 0.6 ? '중심 온도가 약 <b>1천만 K</b>에 이르러 수소 핵융합이 시작됐어요.'
            : '가스 구름이 중력으로 수축하며 중심의 온도와 압력이 올라가요.'));
      }
      function lifeFrame(b) {
        lifeP = b; const M = MASS[lifeMass], target = new THREE.Color(M.col), R = M.r / 30;
        // 가스 구름 수축 (2D와 같은 단계: 0~0.66)
        const al = b < 0.5 ? 1 : Math.max(0, 1 - (b - 0.5) / 0.16);
        const cr = 4.2 * (1 - 0.62 * sm(0, 0.4, b)) * al + 0.001;
        cloud.visible = b < 0.66;
        cloudMat.opacity = 0.8 * al;
        for (let i = 0; i < NC; i++) { const v = cloudBase[i]; cloudArr[i * 3] = v.x * cr; cloudArr[i * 3 + 1] = v.y * cr; cloudArr[i * 3 + 2] = v.z * cr; }
        cg.attributes.position.needsUpdate = true;
        // 별 (원시별 → 주계열성)
        let rad = 0, col = RED;
        if (b < 0.6) { rad = b > 0.36 ? (12 + 16 * sm(0, 1, (b - 0.36) / 0.24)) / 30 : 0; }
        else { const k = sm(0.6, 0.78, b); rad = (28 / 30) * (1 - k) + R * k; col = RED.clone().lerp(target, k); }
        starMesh.visible = rad > 0.03; starMesh.scale.setScalar(Math.max(0.001, rad));
        starMat.color.copy(col); starMat.emissive.copy(col); starMat.emissiveIntensity = b < 0.6 ? 0.5 : 0.9;
        halo.visible = starMesh.visible; halo.scale.setScalar(Math.max(0.001, rad * 4.6)); halo.material.color.copy(col);
        const f = b > 0.6 && b < 0.74 ? 1 - Math.abs(b - 0.62) / 0.12 : 0;
        flashM.visible = f > 0; flashM.scale.setScalar(0.5 + Math.max(0, f) * 3.6); flashM.material.opacity = Math.max(0, f) * 0.6;
        lifeLab.show(b >= 0.78); lifeLab.set(lifeMass + '배 별 · 수명 ' + M.life); lifeLab.off = [0, rad * 1.5 + 0.35, 0];
        lifeInfo();
      }
      let lifeSeg;
      grp('life', () => {
        lifeSeg = controls.segment('질량', MK.map((m) => ({ value: m, label: m + '배' })), lifeMass, (m) => { const L = lesson(); if (L && L.setMass) L.setMass(m); lifeMass = m; lifeFrame(lifePlayer.p); });
      });
      const lifePlayer = grp('life', () => controls.player({
        duration: 6.5, loop: true, autoplay: false, label: '별 탄생',
        phases: [[0, '가스 구름'], [0.38, '원시별'], [0.6, '핵융합 시작'], [0.78, '주계열성']],
        onFrame(p) { lifeFrame(p); },
      }));

      /* =========================================================
         ② 수소 핵융합 모형 (중심핵 확대)
         ========================================================= */
      const gCore = new THREE.Group(); root.add(gCore);
      const bubble = new THREE.Mesh(new THREE.SphereGeometry(2.7, 48, 32), new THREE.MeshStandardMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.16, depthWrite: false, roughness: 0.2, emissive: 0xffa040, emissiveIntensity: 0.3 }));
      gCore.add(bubble);
      const coreGlow = mkGlow(0xff9a40, 0.55); coreGlow.scale.set(9, 9, 1); gCore.add(coreGlow);
      const NPC = 110, coreDust = new THREE.InstancedMesh(new THREE.SphereGeometry(0.04, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0.6 }), NPC); gCore.add(coreDust);
      const cdD = []; for (let i = 0; i < NPC; i++) cdD.push({ p: new V(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize().multiplyScalar(0.8 + rnd() * 1.8), v: new V(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5) });
      const cdO = new THREE.Object3D();
      const hMat = ctx.mats.plastic(0xe0402e, { roughness: 0.2, extra: { emissive: 0x7a1710, emissiveIntensity: 0.4 } });
      const nMat = ctx.mats.plastic(0x4a5ee0, { roughness: 0.2, extra: { emissive: 0x1b2a7a, emissiveIntensity: 0.35 } });
      const START = [[1.5, 0.9, 0.5], [-1.4, 1.1, -0.6], [-1.1, -1.4, 0.9], [1.3, -1.2, -0.8]].map((a) => new V(...a));
      const hs = START.map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.34, 24, 16), hMat); gCore.add(m); return m; });
      const heG = new THREE.Group(); gCore.add(heG);
      [[0.2, 0.2, 0.2, 0], [-0.2, -0.2, 0.2, 1], [-0.2, 0.2, -0.2, 0], [0.2, -0.2, -0.2, 1]].forEach((p) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 16), p[3] ? nMat : hMat); m.position.set(p[0], p[1], p[2]); heG.add(m); });
      const heLab = label('헬륨 핵', heG, { offset: [0, 0.95, 0] });
      const hLab = label('수소 핵 (+)', hs[0], { offset: [0, 0.65, 0], size: 12 });
      const repLab = label('전기적 반발력', [0, 0, 0], { size: 12, color: 'rgba(160,110,0,.92)' });
      const flash = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), glowMat(0xfff3b0, 0)); gCore.add(flash);
      const repRing = new THREE.Mesh(new THREE.TorusGeometry(1, 0.03, 8, 40), glowMat(0xffe066, 0)); gCore.add(repRing);
      const pho = []; const pGeo = new THREE.SphereGeometry(0.09, 10, 8), pMat = new THREE.MeshBasicMaterial({ color: 0xffe066 });
      for (let i = 0; i < 18; i++) { const m = new THREE.Mesh(pGeo, pMat); m.userData.d = new V(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize(); gCore.add(m); pho.push(m); }
      let coreP = 0, coreT = 5;
      function coreInfo() {
        const hot = coreT >= THR;
        info('<b>🔍 별 중심핵을 확대한 모형</b> · 🌡 ' + (coreT * 100).toLocaleString('ko-KR') + '만 K<br>' +
          (hot ? '약 1000만 K 이상이라 수소 핵이 반발력을 이기고 붙어요. <b>수소 핵 4개 → 헬륨 핵 1개</b> (4.0291 u → 4.0015 u, 줄어든 질량 <b>0.0276 u</b>가 빛 에너지로)'
            : '수소 핵은 모두 (+)전하라서 서로 <b>밀어내요</b>. 온도가 낮으면 가까이 가도 튕겨 나가요.'));
      }
      function coreFrame(p, t) {
        coreP = p; const hot = coreT >= THR;
        { const sp = 0.3 + coreT / 12; for (let i = 0; i < NPC; i++) { const d = cdD[i]; d.p.addScaledVector(d.v, 0.016 * sp); const l = d.p.length(); if (l > 2.55) { d.p.setLength(2.5); d.v.reflect(d.p.clone().normalize()); } if (l < 0.9) d.p.setLength(1.0); cdO.position.copy(d.p); cdO.updateMatrix(); coreDust.setMatrixAt(i, cdO.matrix); } coreDust.instanceMatrix.needsUpdate = true; coreGlow.material.opacity = 0.3 + 0.4 * Math.max(0, Math.min(1, (coreT - 2) / 18)); }
        const amp = 0.04 + 0.02 * Math.sqrt(coreT), fr = 3 + 1.2 * Math.sqrt(coreT);
        const heat = Math.max(0, Math.min(1, (coreT - 2) / 18));
        bubble.material.emissive.setHex(0xff6a20).lerp(new THREE.Color(0xfff0b0), heat); bubble.material.emissiveIntensity = 0.2 + 0.5 * heat; bubble.material.opacity = 0.14 + 0.1 * heat;
        // 접근(0~0.45) → 합쳐짐(hot) 또는 튕겨 나감(cold)
        let k;
        if (hot) k = sm(0.05, 0.5, p); else k = p < 0.45 ? 0.55 * sm(0.05, 0.45, p) : 0.55 * (1 - sm(0.45, 0.75, p));
        hs.forEach((m, i) => {
          const j = (1 - (hot ? sm(0.3, 0.5, p) : 0)) * amp;
          m.position.copy(START[i]).multiplyScalar(1 - k).add(new V(Math.sin(t * fr + i * 2.1), Math.cos(t * fr * 0.9 + i), Math.sin(t * fr * 0.8 + i * 3)).multiplyScalar(j * 2.2));
          m.visible = !(hot && p >= 0.5);
        });
        const fused = hot && p >= 0.5;
        heG.visible = fused; heG.scale.setScalar(0.5 + 0.5 * sm(0.5, 0.62, p)); heG.rotation.y = t * 1.5; heLab.show(fused && p > 0.55);
        hLab.show(!fused);
        const f = hot && p > 0.46 && p < 0.7 ? 1 - Math.abs(p - 0.54) / 0.16 : 0;
        flash.visible = f > 0; flash.material.opacity = Math.max(0, f) * 0.8; flash.scale.setScalar(0.6 + Math.max(0, f) * 2);
        pho.forEach((m) => { const q = p - 0.52; m.visible = hot && q > 0 && q < 0.48; m.position.copy(m.userData.d).multiplyScalar(0.4 + Math.max(0, q) * 7); });
        const rp = !hot && p > 0.3 && p < 0.7 ? 1 - Math.abs(p - 0.45) / 0.25 : 0;
        repRing.visible = rp > 0; repRing.material.opacity = Math.max(0, rp) * 0.8; repRing.scale.setScalar(0.5 + (1 - Math.max(0, rp)) * 1.4); repRing.rotation.x = t * 0.7;
        repLab.show(rp > 0.2);
      }
      let coreRange;
      grp('core', () => {
        coreRange = controls.range('중심 온도', 2, 20, 0.5, coreT, (v) => { const L = window.__sim; if (L && L.setT) L.setT(v); coreT = v; coreInfo(); }, (v) => (v * 100).toLocaleString('ko-KR') + '만 K');
      });
      const corePlayer = grp('core', () => controls.player({
        duration: 8, loop: true, autoplay: false, label: '핵융합',
        phases: [[0, '수소 핵이 움직여요'], [0.3, '가까워져요'], [0.5, '합쳐져요 · 반발'], [0.7, '에너지 방출']],
        onFrame(p) { coreFrame(p, performance.now() / 1000); },
      }));

      /* =========================================================
         ③ 무거운 별과 양파 껍질
         ========================================================= */
      const gOn = new THREE.Group(); root.add(gOn);
      const OR = 3.2, wedge = 3 * Math.PI / 2;
      const body = new THREE.Group(); gOn.add(body);
      const layerG = LAYERS.map((ly, i) => {
        const g = new THREE.Group();
        const dk = new THREE.Color(ly.col).multiplyScalar(0.22);   // 화면에서 옅어 보이지 않게 조금 짙게
        const mat = (o) => std(dk, Object.assign({ emissive: ly.col, emissiveIntensity: 0.2, roughness: 0.85, envMapIntensity: 0.25, bumpMap: granTex, bumpScale: 0.02, polygonOffset: true, polygonOffsetFactor: -i, polygonOffsetUnits: -i }, o || {}));
        g.add(new THREE.Mesh(new THREE.SphereGeometry(1, 64, 40, 0, wedge), mat({ map: granTex, emissiveMap: granTex, emissiveIntensity: 0.55 })));   // 겉면: 끓어오르는 별 표면 무늬
        [Math.PI / 2, Math.PI].forEach((rot) => { const d = new THREE.Mesh(new THREE.CircleGeometry(1, 64, -Math.PI / 2, Math.PI), mat()); d.rotation.y = rot; g.add(d); });
        body.add(g); return g;
      });
      { const og = mkGlow(0xffb060, 0.35); og.scale.set(OR * 3.6, OR * 3.6, 1); gOn.add(og); }
      const pulse = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending }));
      body.add(pulse);
      const layLab = LAYERS.map((ly) => label(ly.name, body, { size: 12 }));
      // 진화의 끝 (질량 1배): 행성상 성운 + 백색 왜성
      const neb = new THREE.Group(); gOn.add(neb);
      const shells = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), glowMat(0xa5f3fc, 0.2)); neb.add(m); return m; });
      { const wd = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 20), new THREE.MeshBasicMaterial({ color: 0xf8fafc })); neb.add(wd); ctx.halo(wd, 0xdfefff, 2.2, 0.7); }
      neb.add(new THREE.Mesh(new THREE.SphereGeometry(0.9, 32, 20), glowMat(0xffffff, 0.35)));
      const nebLab = label('행성상 성운 + 백색 왜성 (탄소·산소 핵)', [0, -OR - 0.4, 0], { size: 12 });
      const ironLab = label('Fe', [0, 0, 0.1], { size: 13 });
      let onLast = '';
      function onionInfo(S, end) {
        const key = S.m3 + '|' + S.st + '|' + end; if (key === onLast) return; onLast = key;
        let h = '<b>⚖ ' + S.m3 + '배 · ' + (end ? '진화의 끝' : STN[S.st]) + '</b><br>';
        if (end) h += '질량이 작은 별은 중심 온도가 탄소 핵융합이 일어날 만큼 높아지지 않아요. 바깥 층은 날아가 행성상 성운이 되고, 중심핵은 백색 왜성이 돼요.';
        else if (S.st === 5) h += '철 핵이 만들어지면 더 핵융합이 일어나도 에너지를 내지 못해요. 별 속에서 만들어지는 원소는 철까지예요.';
        else h += '현재 중심핵 연료: ' + LAYERS[S.st].name.replace(' 층', '') + ' (' + LAYERS[S.st].prod + ')' + (S.m3 === 20 ? '<br>걸리는 시간(20배 별, 대략): ' + TIME20[S.st] : '');
        info(h);
      }
      let onSeg;
      grp('onion', () => {
        onSeg = controls.segment('별의 질량', [1, 8, 20].map((m) => ({ value: m, label: m + '배' })), 20, (m) => { const L = lesson(); if (L && L.setM3) L.setM3(m); });
      });
      let lastSt = -1;
      var onPlayer = grp('onion', () => controls.player({
        duration: 12, loop: true, autoplay: false, label: '진화 단계',
        phases: STN.map((n, i) => [i / 6, n]),
        onFrame(p) {
          const L = lesson(); if (!L || !L.S) return;
          if (onPlayer && onPlayer.playing && L.S.m3 === 1 && L.setM3) L.setM3(20);   // 철까지 가는 큰 별로 보여 줘요
          const st = Math.min(5, Math.floor(p * 6)); if (st !== L.S.st && L.setSt) L.setSt(st);
        },
      }));

      /* ---- 장면 전환 ---- */
      function showScene(sc) {
        scene = sc; gLife.visible = sc === 'life'; gCore.visible = sc === 'core'; gOn.visible = sc === 'onion';
        Object.keys(groups).forEach((k) => groups[k].forEach((e) => { e.style.display = k === sc ? '' : 'none'; }));
        if (sc !== 'life') lifePlayer.pause(); if (sc !== 'core') corePlayer.pause(); if (sc !== 'onion') onPlayer.pause();
        lifeLab.show(false); heLab.show(false); hLab.show(false); repLab.show(false); nebLab.show(false); ironLab.show(false); layLab.forEach((l) => l.show(false));
        onLast = '';
        if (sc === 'life') { orbit.dist = PHN ? 14 : 11; lifeFrame(lifePlayer.p); }
        else if (sc === 'core') { orbit.dist = PHN ? 12 : 9.5; coreInfo(); }
        else orbit.dist = PHN ? 14.5 : 11;
      }
      ctx.onLevel((li) => showScene(sceneOf(li)));
      { const L = lesson(); if (L && L.S) { lifeMass = L.S.mass || 1; coreT = L.S.T || 5; coreRange.set(coreT); lifeSeg.set(lifeMass); } }
      lifePlayer.set(0.9);
      showScene(scene);

      return {
        update(dt, t) {
          const L = lesson(), S = L && L.S;
          if (S) {
            if (S.mass !== lifeMass && MASS[S.mass]) { lifeMass = S.mass; lifeSeg.set(lifeMass); if (scene === 'life') lifeFrame(lifePlayer.p); }
            if (S.T !== coreT) { coreT = S.T; coreRange.set(coreT); if (scene === 'core') { coreInfo(); coreFrame(corePlayer.p, t); } }
          }
          if (scene === 'life') {
            cloud.rotation.y = t * 0.4;
          } else if (scene === 'core') {
            coreFrame(corePlayer.p, t);
          } else if (S) {
            const end = S.m3 === 1 && S.st >= 2;
            body.visible = !end; neb.visible = end; nebLab.show(end);
            body.rotation.y = Math.sin(t * 0.35) * 0.35;
            if (onSeg) onSeg.set(S.m3);
            if (S.st !== lastSt) { lastSt = S.st; if (!onPlayer.playing) onPlayer.set((S.st + 0.5) / 6); }
            if (!end) {
              layerG.forEach((g, i) => { const f = S.lr[i]; g.visible = f > 0.01; g.scale.setScalar(Math.max(0.001, f * OR)); });
              LAYERS.forEach((ly, i) => {
                const f = S.lr[i], inner = i < 5 ? S.lr[i + 1] : 0, th = (f - inner) * OR, mid = (f + inner) / 2 * OR;
                layLab[i].show(f > 0.01 && th > 0.5 && i < 5); layLab[i].off = [-mid, (i % 2 ? 1 : -1) * Math.min(mid * 0.1 + 0.15, 0.5), 0.05];
              });
              ironLab.show(S.st === 5 && S.lr[5] > 0.05);
              const f = S.lr[S.st]; pulse.visible = f > 0.02 && S.st < 5; pulse.scale.setScalar(Math.max(0.01, f * OR * (0.55 + 0.05 * Math.sin(t * 5))));
            } else { ironLab.show(false); layLab.forEach((l) => l.show(false)); }
            shells.forEach((m, k) => { const q = (t * 0.18 + k / 3) % 1; m.scale.setScalar(OR * (0.5 + q * 0.55)); m.material.opacity = 0.3 * (1 - q); });
            onionInfo(S, end);
          }
        },
        sync() {},
      };
    },
  });
})();
