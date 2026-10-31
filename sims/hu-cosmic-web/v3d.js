/* hu-cosmic-web · 3D 우주 거대 구조 (그물 구조)
   은하가 필라멘트(실)·장벽(벽)·은하단(마디)으로 이어지고 그 사이에 보이드(빈 곳)가 있는 3차원 모형이에요.
   수업의 '은하 지도'(쐐기 도표)는 이 공간을 얇게 잘라 위에서 본 것임을 '쐐기 단면'으로 확인해요.
   점 구름은 교육용으로 만든 합성 자료이고, 얇은 단면 속 은하 400개는 수업의 은하 지도(window.__sim.GAL)와 같아요. (단위: Mpc, 1 Mpc ≈ 326만 광년) */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const TAU = Math.PI * 2, DEG = Math.PI / 180;
  const RMAX = 320, WEDGE = 20 * DEG, SLAB = 8;                    // 쐐기: 반지름 320 Mpc, 반각 20°, 단면 두께 ±8 Mpc
  const TW = (r, t, h) => [t, h, -r];                              // (거리 r, 옆 t, 높이 h) → 화면 좌표: 위에서 보면 r이 위쪽
  const narrow = window.innerWidth < 600;
  const asp = narrow ? window.innerWidth / Math.max(300, window.innerHeight - 190) : 1.4;
  const FIT = Math.max(1, 0.8 / asp), LS = narrow ? 11 : 12.5;
  const COL = { cluster: '#ffb04a', fil: '#7fb5ff', wall: '#5eead4', field: '#a7b4d6' }, PLAIN = '#cfe0ff', SLC = '#ffe45e';

  function rng(seed) {
    return function () {
      seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const gauss = (R) => { let u = 0; while (u < 1e-9) u = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * R()); };
  const dist3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

  window.SciSim3D.attach({
    title: '우주 거대 구조 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: 480 * FIT, theta: 0.55, phi: 0.95, fov: 42, target: [0, 0, -160], min: 80, max: 1400 },
    autoRotate: 0.06,
    build(ctx) {
      const { THREE, root, camera, label, info, controls, orbit } = ctx;
      const sim = window.__sim, GAL = (sim && sim.GAL) || [];
      const R = rng(2025);

      const cv = document.createElement('canvas'); cv.width = cv.height = 64;
      const c2 = cv.getContext('2d'); const gr = c2.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      c2.fillStyle = gr; c2.fillRect(0, 0, 64, 64);
      const dot = new THREE.CanvasTexture(cv);

      /* ===== 합성 그물 구조 만들기 (r, t, h) ===== */
      const inWedge = (r, t) => r > 0 && r <= RMAX && Math.abs(t) <= r * Math.tan(WEDGE);
      const inSlab = (p) => Math.abs(p[2]) < SLAB && inWedge(p[0], p[1]);
      // 보이드: 수업의 3곳(단면 위) + 합성 보이드 몇 개
      const voids = [{ p: [150, -20, 0], r: 20, lesson: true }, { p: [105, 22, 0], r: 16, lesson: true }, { p: [200, 10, 0], r: 25, lesson: true }];
      if (sim && sim.VT) sim.VT.forEach((v, i) => { if (voids[i]) { voids[i].p = [v.r, v.t, 0]; voids[i].r = v.rad; } });
      const ext = [[70, 90, 40, 34], [250, -90, 30, 38], [120, -70, -45, 30], [290, 10, -35, 36], [60, -60, 50, 26], [230, 95, -30, 30]];
      ext.forEach((e) => voids.push({ p: [e[0], e[1], e[2]], r: e[3] }));
      const inVoid = (p, k) => voids.some((v) => dist3(p, v.p) < v.r * (k || 1));
      const segHitsVoid = (a, b) => voids.some((v) => {
        const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L2 = ab[0] * ab[0] + ab[1] * ab[1] + ab[2] * ab[2];
        let u = ((v.p[0] - a[0]) * ab[0] + (v.p[1] - a[1]) * ab[1] + (v.p[2] - a[2]) * ab[2]) / L2; u = Math.max(0, Math.min(1, u));
        return dist3([a[0] + ab[0] * u, a[1] + ab[1] * u, a[2] + ab[2] * u], v.p) < v.r * 0.95;
      });
      // 마디(은하단): 수업의 은하단 3곳과 필라멘트 끝점들 + 합성 마디
      const nodes = [{ p: [72, -8, 0], lesson: true }, { p: [97, -33, 0] }, { p: [166, 58, 0] }, { p: [216, -40, 0], lesson: true }, { p: [246, 50, 0] }, { p: [264, 72, 0], lesson: true }];
      for (let tries = 0; nodes.length < 36 && tries < 4000; tries++) {
        const r = 15 + R() * 305, t = (R() * 2 - 1) * (r * 0.42 + 35), h = (R() * 2 - 1) * 68, p = [r, t, h];
        if (inVoid(p, 1.15) || nodes.some((n) => dist3(n.p, p) < 42)) continue;
        nodes.push({ p });
      }
      const edges = new Map(), addEdge = (i, j) => { if (i !== j) edges.set(Math.min(i, j) + '-' + Math.max(i, j), [Math.min(i, j), Math.max(i, j)]); };
      [[0, 1], [1, 2], [2, 4], [3, 4], [4, 5], [0, 3]].forEach((e) => addEdge(e[0], e[1]));
      nodes.forEach((n, i) => {
        if (i < 6) return;
        const near = nodes.map((m, j) => ({ j, d: dist3(n.p, m.p) })).filter((o) => o.j !== i && o.d < 135 && !segHitsVoid(n.p, nodes[o.j].p)).sort((a, b) => a.d - b.d).slice(0, 2 + (R() < 0.4 ? 1 : 0));
        near.forEach((o) => addEdge(i, o.j));
      });
      const adj = nodes.map(() => new Set()); edges.forEach((e) => { adj[e[0]].add(e[1]); adj[e[1]].add(e[0]); });
      // 장벽(벽): 서로 이어진 세 마디가 이루는 삼각형 몇 개
      const walls = [];
      for (let i = 0; i < nodes.length && walls.length < 7; i++) adj[i].forEach((j) => adj[j].forEach((k) => { if (k > j && j > i && adj[i].has(k) && walls.length < 7 && !(nodes[i].lesson && nodes[j].lesson && nodes[k].lesson)) walls.push([i, j, k]); }));

      const groups = { cluster: { out: [], fill: [], slab: [] }, fil: { out: [], fill: [], slab: [] }, wall: { out: [], fill: [], slab: [] }, field: { out: [], fill: [], slab: [] } };
      const put = (g, p) => {
        if (!(p[0] > 3 && p[0] <= RMAX && Math.abs(p[1]) < 130 && Math.abs(p[2]) < 75 && !inVoid(p, 0.9))) return;
        (inSlab(p) ? groups[g].fill : groups[g].out).push(p);
      };
      nodes.forEach((n) => { const nn = n.lesson ? 170 : 80 + Math.floor(R() * 100); for (let i = 0; i < nn; i++) put('cluster', [n.p[0] + gauss(R) * 4.2, n.p[1] + gauss(R) * 4.2, n.p[2] + gauss(R) * 4.2]); });
      edges.forEach((e) => {
        const a = nodes[e[0]].p, b = nodes[e[1]].p, len = dist3(a, b), n = Math.floor(len * 2.8);
        for (let i = 0; i < n; i++) { const u = R(); put('fil', [a[0] + (b[0] - a[0]) * u + gauss(R) * 2.2, a[1] + (b[1] - a[1]) * u + gauss(R) * 2.2, a[2] + (b[2] - a[2]) * u + gauss(R) * 2.2]); }
      });
      walls.forEach((w) => {
        const A = nodes[w[0]].p, B = nodes[w[1]].p, C = nodes[w[2]].p;
        for (let i = 0; i < 380; i++) { let u = R(), v = R(); if (u + v > 1) { u = 1 - u; v = 1 - v; } put('wall', [0, 1, 2].map((k) => A[k] + (B[k] - A[k]) * u + (C[k] - A[k]) * v + gauss(R) * 2.4)); }
      });
      for (let i = 0; i < 3200; i++) { const r = 5 + R() * 315, t = (R() * 2 - 1) * (r * 0.4 + 30), h = (R() * 2 - 1) * 70; put('field', [r, t, h]); }
      // 수업의 은하 지도 400개 (쐐기 단면 안, 높이는 사진 속 높이 u에서)
      const lessonKind = { cl1: 'cluster', cl2: 'cluster', cl3: 'cluster', band: 'fil', fil: 'fil', bg: 'field', target: 'field' };
      GAL.forEach((g) => { groups[lessonKind[g.kind] || 'field'].slab.push([g.r, g.t, (g.u || 0) * 7.5]); });

      /* ===== 점 구름 (그룹마다 하나) ===== */
      const objs = [];
      const plainMat = (hex, size, op) => new THREE.PointsMaterial({ size, map: dot, color: new THREE.Color(hex), transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: false });
      function mkPts(list, g, part, size, op) {
        const pos = new Float32Array(list.length * 3);
        list.forEach((p, i) => { const q = TW(p[0], p[1], p[2]); pos.set(q, i * 3); });
        const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const m = new THREE.Points(geo, plainMat(PLAIN, size, op)); m.frustumCulled = false; root.add(m);
        objs.push({ m, g, part, size, op }); return m;
      }
      Object.keys(groups).forEach((g) => {
        const sz = g === 'cluster' ? 2.8 : g === 'field' ? 1.9 : 2.3, op = g === 'cluster' ? 0.6 : g === 'field' ? 0.55 : 0.7;
        mkPts(groups[g].out, g, 'out', sz, op); mkPts(groups[g].fill, g, 'fill', sz, op); mkPts(groups[g].slab, g, 'slab', sz + 0.6, Math.min(1, op + 0.25));
      });

      /* ===== 보조 도형: 쐐기·단면·상자·보이드·관측자 ===== */
      const lineMat = (hex, op) => new THREE.LineBasicMaterial({ color: hex, transparent: true, opacity: op });
      const V3 = (p) => new THREE.Vector3(p[0], p[1], p[2]);
      const wedgeLine = (h, hex, op) => {
        const pts = [V3(TW(0, 0, h))]; pts.push(V3(TW(RMAX * Math.cos(WEDGE), -RMAX * Math.sin(WEDGE), h)));
        for (let i = 0; i <= 40; i++) { const a = -WEDGE + 2 * WEDGE * i / 40; pts.push(V3(TW(RMAX * Math.cos(a), RMAX * Math.sin(a), h))); }
        pts.push(V3(TW(0, 0, h)));
        return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat(hex, op));
      };
      const wedgeG = new THREE.Group(); root.add(wedgeG);
      wedgeG.add(wedgeLine(0, 0xff8a8a, 0.9));
      const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.lineTo(-RMAX * Math.sin(WEDGE), RMAX * Math.cos(WEDGE));
      for (let i = 0; i <= 40; i++) { const a = -WEDGE + 2 * WEDGE * i / 40; shape.lineTo(RMAX * Math.sin(a), RMAX * Math.cos(a)); }
      shape.lineTo(0, 0);
      const slab = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: SLAB * 2, bevelEnabled: false }), new THREE.MeshBasicMaterial({ color: 0xff7a7a, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide }));
      slab.rotation.x = -Math.PI / 2; slab.position.y = -SLAB; wedgeG.add(slab);
      wedgeG.add(wedgeLine(SLAB, 0xff8a8a, 0.4), wedgeLine(-SLAB, 0xff8a8a, 0.4));
      wedgeG.visible = false;
      // 상자 (r 0~320, t ±130, h ±75)
      (function () {
        const pts = [], c = [[0, -130, -75], [0, 130, -75], [320, 130, -75], [320, -130, -75], [0, -130, 75], [0, 130, 75], [320, 130, 75], [320, -130, 75]];
        [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]].forEach((e) => { pts.push(V3(TW(...c[e[0]])), V3(TW(...c[e[1]]))); });
        root.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), lineMat(0x7a93c9, 0.3)));
      })();
      // 보이드 공
      const voidG = new THREE.Group(); root.add(voidG); voidG.visible = false;
      voids.forEach((v) => { const m = new THREE.Mesh(new THREE.SphereGeometry(v.r, 24, 16), new THREE.MeshBasicMaterial({ color: 0x4a7dff, transparent: true, opacity: 0.12, depthWrite: false })); const q = TW(...v.p); m.position.set(q[0], q[1], q[2]); voidG.add(m); v.mesh = m; });
      // 관측자
      const earth = new THREE.Mesh(new THREE.SphereGeometry(4, 16, 12), new THREE.MeshBasicMaterial({ color: 0x3b82f6 })); root.add(earth);
      const eg = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color: 0x7fb5ff, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending })); eg.scale.set(30, 30, 1); earth.add(eg);
      const L = [];
      L.push(label('🌌 우리은하 (관측자)', earth, { size: LS, color: 'rgba(20,60,140,.92)', offset: [0, 0, 22] }));
      const labsR = [100, 200, 300].map((r) => label(r + ' Mpc', TW(r, -125, -75), { size: LS - 1.5, color: 'rgba(40,60,110,.85)' }));
      const labSet = (arr, vis) => arr.forEach((l) => l.show(vis));
      // 구조 이름표 (구조 색 보기를 켰을 때)
      const sLabs = [];
      nodes.forEach((n, i) => { if (n.lesson) sLabs.push(label('은하단', TW(...n.p), { size: LS, color: 'rgba(130,70,0,.92)', offset: [0, 14, 0] })); });
      sLabs.push(label('필라멘트', TW((nodes[1].p[0] + nodes[2].p[0]) / 2, (nodes[1].p[1] + nodes[2].p[1]) / 2, 0), { size: LS, color: 'rgba(30,70,150,.92)', offset: [0, 12, 0] }));
      if (walls.length) { const w = walls[0], c = [0, 1, 2].map((k) => (nodes[w[0]].p[k] + nodes[w[1]].p[k] + nodes[w[2]].p[k]) / 3); sLabs.push(label('장벽(벽)', TW(...c), { size: LS, color: 'rgba(10,100,90,.92)' })); }
      voids.forEach((v, i) => { if (i < 3 || i === 3) sLabs.push(label('보이드', TW(...v.p), { size: LS, color: 'rgba(20,50,140,.88)' })); });
      labSet(sLabs, false);

      /* ===== 상태 · 보기 ===== */
      let colored = false, showVoid = false, slice = false;
      function applyAll() {
        objs.forEach((o) => {
          const mat = o.m.material, base = colored ? COL[o.g] : PLAIN;
          if (o.part === 'fill') o.m.visible = !slice;
          mat.color.set(slice && o.part === 'slab' ? SLC : base);
          mat.size = slice && o.part === 'slab' ? 4.2 : o.size;
          mat.opacity = slice ? (o.part === 'slab' ? 1 : o.part === 'out' ? 0.14 : o.op) : o.op;
        });
        wedgeG.visible = slice; voidG.visible = showVoid;
        sLabs.forEach((l) => { const t = l.el.textContent; l.show((colored && t !== '보이드') || (showVoid && t === '보이드')); });
        text();
      }
      function text() {
        if (slice) info('<b>쐐기 단면</b>: 수업의 <b>은하 지도</b>는 이 3차원 공간을 두께 약 ' + (SLAB * 2) + ' Mpc로 얇게 잘라 <b>위에서 본</b> 쐐기 도표예요. <span style="color:#ffe45e">노란 점 ' + groups.cluster.slab.concat(groups.fil.slab, groups.field.slab, groups.wall.slab).length + '개</span>가 수업의 은하 지도 속 은하예요.<br>위·아래로 이어지는 구조는 지도에 나타나지 않아요.');
        else if (colored || showVoid) info('<b>그물 구조</b><br>' + (colored ? '<span style="color:#ffb04a">주황</span> 은하단(마디) · <span style="color:#7fb5ff">파랑</span> 필라멘트(실) · <span style="color:#5eead4">청록</span> 장벽(벽) · 회색 홀로 있는 은하<br>' : '') + (showVoid ? '푸른 공 = 보이드(은하가 거의 없는 빈 곳)<br>' : '') + '은하는 중력으로 모여 마디·실·벽을 이루고 그 사이에 큰 빈 곳이 생겨요.');
        else info('<b>우주 거대 구조 (합성 모형, 폭 약 ' + 2 * 130 + ' Mpc)</b><br>은하는 고르게 퍼져 있지 않고 <b>그물</b>처럼 이어져 있어요. 어디가 몰려 있고 어디가 비었는지 돌려 보며 찾아봐요. (1 Mpc ≈ 326만 광년)');
      }
      const view = (v) => { // 위·옆에서 볼 때는 수업의 눕힌 쐐기 도표처럼 거리 r이 오른쪽으로 가요
        if (v === 'top') { orbit.phi = 0.06; orbit.theta = Math.PI / 2; orbit.dist = 420 * (narrow ? 1.9 : 1); } else if (v === 'side') { orbit.phi = 1.5; orbit.theta = Math.PI / 2; orbit.dist = 480 * (narrow ? 1.5 : 1); } else { orbit.phi = 0.95; orbit.theta = 0.55; orbit.dist = 480 * FIT; } };
      controls.segment('시점', [{ value: 'top', label: '⬇ 위에서' }, { value: 'side', label: '➡ 옆에서' }, { value: 'tilt', label: '↗ 비스듬히' }], 'tilt', view);
      const cB = controls.button('🎨 구조 색', () => { colored = !colored; cB.classList.toggle('on', colored); applyAll(); });
      const vB = controls.button('🫧 보이드', () => { showVoid = !showVoid; vB.classList.toggle('on', showVoid); applyAll(); });
      const sB = controls.button('🔪 쐐기 단면', () => { slice = !slice; sB.classList.toggle('on', slice); if (slice) view('top'); applyAll(); });
      function readLesson() { // 수업이 은하 지도·밀도 분석이면 단면부터 보여 줘요 (읽기만)
        try { const v = sim && sim.S && sim.S.view; if ((v === 'map' || v === 'grid') && !slice && !synced) { slice = true; sB.classList.add('on'); view('top'); } synced = true; } catch (e) { /* 괜찮아요 */ }
        applyAll();
      }
      let synced = false;
      readLesson();
      return { sync() { synced = false; readLesson(); } };
    },
  });
})();
