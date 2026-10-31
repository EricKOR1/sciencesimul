/* h1-silicate · 3D 규산염 광물 구조
   규소 1개 + 산소 4개의 사면체 블록이 산소 꼭짓점을 이웃과 함께 쓰며 이어지는 모습을
   독립형 · 사슬형 · 판상형 · 망상형으로 돌려 보고, '쪼개 보기'로 광물이 쪼개지는 방향을 확인해요.
   (2D 화면은 평면이라 사면체가 위아래로 어떻게 이어지는지, 판이 몇 겹 쌓이는지 알기 어려워요) */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const SI = 0xf2b630, OX = 0xef4a4a;
  const H = 1 / Math.SQRT2, K = 1 / Math.sqrt(1.5);                   // 정사면체 꼭짓점 (Si–O 길이 1)
  const TYPES = {
    island: { name: '독립형', mineral: '감람석', share: 0, cleave: '사면체가 따로따로라서 쪼개짐 없이 알갱이처럼 깨져요.', how: '어느 방향으로든 연결이 없어요', cam: 8.5, phi: 1.1 },
    chain:  { name: '사슬형', mineral: '휘석', share: 2, cleave: '사슬 사이가 약해서 두 방향으로 쪼개져 기둥 모양이 돼요.', how: '사면체가 산소 2개를 함께 써서 줄로 이어져요', cam: 14, phi: 1.2 },
    sheet:  { name: '판상형', mineral: '흑운모', share: 3, cleave: '판과 판 사이가 약해서 한 방향으로 얇게 쪼개져요.', how: '사면체가 산소 3개를 함께 써서 얇은 판으로 이어져요', cam: 14, phi: 1.38 },
    frame:  { name: '망상형', mineral: '석영', share: 4, cleave: '모든 방향으로 이어져 있어 쪼개짐 없이 깨지고 매우 단단해요.', how: '사면체가 산소 4개를 모두 함께 써서 3차원 그물이 돼요', cam: 11, phi: 1.1 },
  };
  const KEYS = ['island', 'chain', 'sheet', 'frame'];

  /* ---- 구조 만들기: unit(쪼개질 때 한 덩어리로 움직이는 묶음) 안에 사면체 목록 ---- */
  function tetraAt(si, flip) { // Si 중심 정사면체 (flip이면 거꾸로)
    const s = flip ? -1 : 1;
    return { si, os: [[K, 0, -H * K * s], [-K, 0, -H * K * s], [0, K, H * K * s], [0, -K, H * K * s]].map((v) => [si[0] + v[0], si[1] + v[1], si[2] + v[2]]) };
  }
  function makeStruct(type) {
    const units = [];      // { dir:[x,y,z], tet:[{si, os:[[x,y,z]*4]}] }
    if (type === 'island') {
      [[-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3], [1.3, 1.3]].forEach(([x, z], i) => {
        const t = tetraAt([x, 0, z], i % 2 === 1);
        units.push({ dir: [x, 0.0, z], tet: [t] });
      });
    } else if (type === 'chain') {
      [[-1.25, -1.5], [1.25, -1.5], [-1.25, 1.5], [1.25, 1.5]].forEach(([y, zz]) => {
        const tet = []; let cur = [-5 * K, y, zz];
        for (let i = 0; i < 5; i++) {
          const flip = i % 2 === 1;
          tet.push(tetraAt(cur.slice(), flip));
          cur = [cur[0] + 2 * K, cur[1], cur[2] + (flip ? 2 : -2) * H * K];
        }
        units.push({ dir: [0, y, zz], tet });
      });
    } else if (type === 'sheet') {
      const d = 1, r = Math.sqrt(8) / 3 * d, e = 2 * r;
      for (let L = 0; L < 2; L++) {
        const tet = [];
        for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
          const ax = (i + j) * 1.5 * e, az = (i - j) * Math.sqrt(3) / 2 * e;
          [[ax, az, 0], [ax + e, az, Math.PI]].forEach(([x, z, ph]) => {
            const si = [x, L * 3.0, z], os = [[0, d, 0]];
            for (let q = 0; q < 3; q++) { const a = ph + q * 2 * Math.PI / 3; os.push([r * Math.cos(a), -d / 3, r * Math.sin(a)]); }
            tet.push({ si, os: os.map((v) => [si[0] + v[0], si[1] + v[1], si[2] + v[2]]) });
          });
        }
        units.push({ dir: [0, L ? 1 : -1, 0], tet, layer: L });
      }
    } else {
      const u = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]], ss = 2 / Math.sqrt(3), so = 1 / Math.sqrt(3); // Si–Si = 2, Si–O = 1
      const key = (p) => p.join(','), seen = new Map(); let front = [{ p: [0, 0, 0], a: true }]; seen.set('0,0,0', true);
      const list = [front[0]];
      for (let depth = 0; depth < 3; depth++) {
        const next = [];
        front.forEach((n) => u.forEach((v) => {
          const p = n.a ? [n.p[0] + v[0], n.p[1] + v[1], n.p[2] + v[2]] : [n.p[0] - v[0], n.p[1] - v[1], n.p[2] - v[2]];
          if (!seen.has(key(p))) { seen.set(key(p), true); const m = { p, a: !n.a }; next.push(m); list.push(m); }
        }));
        front = next;
      }
      const tet = list.map((n) => {
        const si = n.p.map((x) => x * ss), s = n.a ? 1 : -1;
        const os = u.map((v) => [si[0] + s * v[0] * so, si[1] + s * v[1] * so, si[2] + s * v[2] * so]);
        return { si, os, d: Math.hypot(si[0], si[1], si[2]) };
      }).sort((a, b) => a.d - b.d).slice(0, 29);
      units.push({ dir: [0, 0, 0], tet });
    }
    // 가운데로 옮기기
    let c = [0, 0, 0], n = 0;
    units.forEach((un) => un.tet.forEach((t) => { c[0] += t.si[0]; c[1] += t.si[1]; c[2] += t.si[2]; n++; }));
    c = c.map((x) => x / n);
    units.forEach((un, ui) => un.tet.forEach((t) => {
      t.si = t.si.map((x, k) => x - c[k]); t.os = t.os.map((o) => o.map((x, k) => x - c[k]));
      t.unit = ui; t.ord = Math.hypot(t.si[0], t.si[1] * 0.6, t.si[2]) + ui * 0.001 + (type === 'chain' ? Math.abs(t.si[0]) * 2 : 0);
    }));
    const all = []; units.forEach((un) => un.tet.forEach((t) => all.push(t)));
    all.sort((a, b) => a.ord - b.ord);
    all.forEach((t, i) => { t.idx = i; });
    return { units, all };
  }

  window.SciSim3D.attach({
    title: '규산염 광물 구조 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: 11, theta: 0.7, phi: 1.1, min: 5, max: 26 },
    autoRotate: 0.25,
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      const ctlEl = ctx.renderer.domElement.closest('.v3-wrap').querySelector('.v3-ctl');
      let type = 'island', showFace = true, gap = 0, ST = null, nVis = 0, lastN = 0, lastSh = 0;
      const g = new THREE.Group(); root.add(g);
      let unitGroups = [];
      const gSi = new THREE.SphereGeometry(0.2, 16, 12), gO = new THREE.SphereGeometry(0.15, 14, 10), gOs = new THREE.SphereGeometry(0.205, 16, 12), gHalo = new THREE.SphereGeometry(0.3, 14, 10);
      const mSi = new THREE.MeshStandardMaterial({ color: SI, roughness: 0.4 });
      const mO = new THREE.MeshStandardMaterial({ color: OX, roughness: 0.45 });
      const mOs = new THREE.MeshStandardMaterial({ color: OX, roughness: 0.4, emissive: 0x7a2020 });
      const mHalo = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.28, depthWrite: false });
      const mFace = new THREE.MeshStandardMaterial({ color: SI, transparent: true, opacity: 0.2, roughness: 0.6, side: THREE.DoubleSide, depthWrite: false });
      const mEdge = new THREE.LineBasicMaterial({ color: 0xb8860b, transparent: true, opacity: 0.8 });
      const labSi = label('규소 Si 1개', [0, 0, 0], { color: 'rgba(180,120,10,.95)' });
      const labSh = label('함께 쓰는 산소', [0, 0, 0], { color: 'rgba(200,40,40,.95)' });
      const labFree = label('함께 쓰지 않는 산소', [0, 0, 0], { color: 'rgba(60,70,100,.95)' });
      [labSi, labSh, labFree].forEach((l) => l.show(false));

      function rebuild() {
        while (g.children.length) g.remove(g.children[0]);
        unitGroups = [];
        const vis = ST.all.filter((t) => t.idx < nVis);
        // 산소 꼭짓점 합치기
        const omap = new Map();
        vis.forEach((t) => t.os.forEach((o) => { const k = o.map((x) => Math.round(x * 100)).join(','); const m = omap.get(k) || { p: o, n: 0, unit: t.unit }; m.n++; omap.set(k, m); }));
        ST.units.forEach((un, ui) => { const ug = new THREE.Group(); ug.userData.dir = un.dir; g.add(ug); unitGroups.push(ug); });
        let firstSh = null, firstFree = null, firstSi = null;
        vis.forEach((t) => {
          const ug = unitGroups[t.unit];
          const si = new THREE.Mesh(gSi, mSi); si.position.set(...t.si); ug.add(si); if (!firstSi) firstSi = si;
          if (showFace) {
            const pos = [], ed = [], f = [[0, 1, 2], [0, 1, 3], [0, 2, 3], [1, 2, 3]];
            f.forEach((tri) => tri.forEach((i) => pos.push(...t.os[i])));
            for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) ed.push(...t.os[i], ...t.os[j]);
            const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); fg.computeVertexNormals();
            ug.add(new THREE.Mesh(fg, mFace));
            const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.Float32BufferAttribute(ed, 3)); ug.add(new THREE.LineSegments(eg, mEdge));
          }
        });
        let shared = 0;
        omap.forEach((m, k) => {
          const ug = unitGroups[m.unit], sh = m.n >= 2;
          const o = new THREE.Mesh(sh ? gOs : gO, sh ? mOs : mO); o.position.set(...m.p); ug.add(o);
          if (sh) { shared++; const h = new THREE.Mesh(gHalo, mHalo); h.position.set(...m.p); ug.add(h); if (!firstSh) firstSh = o; }
          else if (!firstFree) firstFree = o;
        });
        labSi.obj = firstSi; labSi.off = [0, 0.4, 0]; labSi.show(!!firstSi && nVis <= 2);
        labSh.obj = firstSh; labSh.off = [0, 0.38, 0]; labSh.show(!!firstSh);
        labFree.obj = firstFree; labFree.off = [0, 0.36, 0]; labFree.show(!!firstFree && nVis >= 1 && ST.all.length > 0);
        lastN = vis.length; lastSh = shared;
        text(lastN, lastSh);
        applyGap();
      }
      function applyGap() {
        unitGroups.forEach((ug) => {
          const d = ug.userData.dir; let x = 0, y = 0, z = 0;
          if (type === 'island') { x = d[0] * gap * 1.1; z = d[2] * gap * 1.1; y = 0; }
          else if (type === 'chain') { y = d[1] * gap * 0.9; z = d[2] * gap * 0.9; }
          else if (type === 'sheet') { y = d[1] * gap * 1.6; }
          ug.position.set(x, y, z);
        });
      }
      function text(n, shared) {
        const T = TYPES[type];
        const cl = gap > 0.15 ? '<br><b style="color:#fbbf24">' + (type === 'frame' ? '벌어지는 곳이 없어요.' : '벌어지는 곳이 약한 면이에요.') + '</b> ' + T.cleave : '';
        info('<b>' + T.name + '</b> · ' + T.mineral + '<br>' + T.how + '<br>사면체 ' + n + '개 · 함께 쓰는 산소(<span style="color:#ff8a8a">밝은 빨강</span>) ' + shared + '개' + cl);
      }
      function fitK() { const v = ctx.renderer.domElement, asp = Math.max(0.3, v.clientWidth / Math.max(1, v.clientHeight)); return asp < 1 ? Math.min(2, Math.pow(1 / asp, 1)) : 1; }
      function pack(els) { const w = document.createElement('span'); w.style.cssText = 'display:inline-flex;align-items:center;gap:6px;white-space:nowrap'; els[0].parentNode.insertBefore(w, els[0]); els.forEach((e) => w.appendChild(e)); return w; }
      function setType(v) {
        type = v; ST = makeStruct(type); nVis = ST.all.length; gap = 0;
        nEl.max = ST.all.length; nSl.set(nVis); gSl.set(0);
        orbit.dist = TYPES[type].cam * fitK(); orbit.phi = TYPES[type].phi;
        rebuild();
      }
      const typeSeg = controls.segment('연결 방식', KEYS.map((k) => ({ value: k, label: TYPES[k].name })), type, (v) => setType(v));
      const n0 = ctlEl.children.length;
      const nSl = controls.range('사면체', 1, 24, 1, 4, (v) => { nVis = Math.min(v, ST.all.length); rebuild(); }, (v) => v + '개');
      pack([].slice.call(ctlEl.children, n0));
      const nEl = ctlEl.querySelector('input[type=range]');
      const n1 = ctlEl.children.length;
      const gSl = controls.range('쪼개기', 0, 1, 0.01, 0, (v) => { gap = v; applyGap(); text(lastN, lastSh); }, (v) => (v < 0.03 ? '0' : Math.round(v * 100) + '%'));
      pack([].slice.call(ctlEl.children, n1));
      const fB = controls.button('사면체 면 ✓', () => { showFace = !showFace; fB.classList.toggle('on', showFace); fB.textContent = '사면체 면 ' + (showFace ? '✓' : '✕'); rebuild(); }); fB.classList.add('on');
      function sync() {
        try { const s = window.__sim; if (s && s.ST && TYPES[s.ST.type] && s.ST.type !== type) { typeSeg.set(s.ST.type); setType(s.ST.type); } } catch (e) { /* 무시 */ }
      }
      setType('island');
      sync();
      return { sync };
    },
  });
})();
