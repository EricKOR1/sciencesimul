/* hm-kepler-gravity · 3D 케플러 법칙과 중력
   2D 실험(window.__sim)의 장면을 그대로 입체로 보여 줘요: 🌌 태양계(r · T) · 🔭 화성 관측 점 · ⏱ 같은 시간 같은 넓이 · 📊 T²–r³ 그래프 · 🔗 힘과 거리의 제곱 · 🍎 사과와 달.
   원 궤도로 단순화한 분석이에요 (같은 넓이 장면만 이심률을 크게 그린 모형). 값은 옆 조작판과 2D 화면이 정하고 3D는 따라가요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches), KD = PHN ? 1.3 : 1;
  const LV = () => (typeof window.SciSimLevel === 'number' ? window.SciSimLevel : 0);
  const TAU = Math.PI * 2, clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  function tools(THREE) {
    const V3 = THREE.Vector3, Y = new V3(0, 1, 0);
    const M = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0.1 }, o || {}));
    const glass = (c, op) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.2, metalness: 0, transparent: true, opacity: op == null ? 0.25 : op, depthWrite: false });
    function mkArrow(col, rad) {
      const g = new THREE.Group(), m = M(col, { roughness: 0.4 });
      const sh = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 1, 12), m), hd = new THREE.Mesh(new THREE.ConeGeometry(rad * 2.6, rad * 6, 16), m);
      g.add(sh, hd); g.userData = { sh, hd, rad }; return g;
    }
    function setArrow(g, a, b) {
      const d = new V3().subVectors(b, a), len = d.length(), { sh, hd, rad } = g.userData;
      if (len < 1e-3) { g.visible = false; return; }
      g.visible = true; const hl = Math.min(len * 0.5, rad * 6);
      sh.scale.y = Math.max(0.001, len - hl); sh.position.y = (len - hl) / 2;
      hd.scale.y = hl / (rad * 6); hd.position.y = len - hl / 2;
      g.position.copy(a); g.quaternion.setFromUnitVectors(Y, d.normalize());
    }
    function tube(pts, r, col, o, closed) {
      const c = new THREE.CatmullRomCurve3(pts, !!closed);
      return new THREE.Mesh(new THREE.TubeGeometry(c, Math.max(24, pts.length * 3), r, 8, !!closed), (o && o.basic) ? new THREE.MeshBasicMaterial({ color: col, transparent: !!o.op, opacity: o.op || 1 }) : M(col, o));
    }
    function disc(r, col, y, op) { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 64), new THREE.MeshStandardMaterial({ color: col, roughness: 0.9, transparent: op != null, opacity: op == null ? 1 : op })); m.rotation.x = -Math.PI / 2; m.position.y = y || 0; m.receiveShadow = true; return m; }
    function grid(w, d, step, col, y, op) {
      const pts = []; for (let x = -w / 2; x <= w / 2 + 1e-6; x += step) pts.push(x, 0, -d / 2, x, 0, d / 2); for (let z = -d / 2; z <= d / 2 + 1e-6; z += step) pts.push(-w / 2, 0, z, w / 2, 0, z);
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: op == null ? 0.3 : op })); l.position.y = y || 0; return l;
    }
    function arc(r, a0, a1, rad, col, n) { // xz 평면 위의 호
      const pts = []; n = n || 40; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; pts.push(new V3(r * Math.cos(a), 0, r * Math.sin(a))); }
      return tube(pts, rad, col);
    }
    return { V3, Y, M, glass, mkArrow, setArrow, tube, disc, grid, arc };
  }
  const KDX = PHN ? 1.55 : 1;
  const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1), f3 = (v) => v.toFixed(3);
  const RAD = Math.PI / 180;
  window.SciSim3D.attach({
    title: '케플러 법칙과 중력 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대 · 값은 옆 조작판에서 바꿔요',
    camera: { dist: 12 * KDX, theta: 0.3, phi: 0.85, min: 4, max: 36, target: [0, 0, 0] },
    autoRotate: 0,
    levels: [2, 3],   // ①②는 캔버스에서 점 찍기 · 색칠하기가 필요해서 2D로 시작해요
    build(ctx) {
      const { THREE, root, label, info, controls, scene, orbit } = ctx;
      const { V3, M, tube, mkArrow, setArrow } = tools(THREE);
      const sim = () => ctx.lesson();
      const pl = new THREE.PointLight(0xfff1cf, 2.2, 0, 0); scene.add(pl); scene.add(new THREE.AmbientLight(0x6070a0, 0.75));
      const sun = new THREE.Mesh(new THREE.SphereGeometry(0.4, 40, 28), new THREE.MeshBasicMaterial({ color: 0xffd45a })); root.add(sun);
      const halo = new THREE.Mesh(new THREE.SphereGeometry(0.62, 32, 20), new THREE.MeshBasicMaterial({ color: 0xffa726, transparent: true, opacity: 0.25, depthWrite: false })); root.add(halo);
      const lSun = label('태양', sun, { color: '#b45309', size: 12 }); lSun.off = [0, 0.8, 0];
      const G = {}; ['sys', 'mars', 'area', 'graph', 'force', 'moon'].forEach((k) => { G[k] = new THREE.Group(); root.add(G[k]); });
      const LAB = {}; const reg = (k, l) => { (LAB[k] = LAB[k] || []).push(l); return l; };
      const rodMk = (g, col, r, op) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 8), new THREE.MeshBasicMaterial({ color: col, transparent: op != null, opacity: op == null ? 1 : op })); m.setA = (p, q) => { const d = new V3().subVectors(q, p), L = d.length(); m.visible = L > 1e-3; if (!m.visible) return; m.scale.set(1, L, 1); m.position.copy(p).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.normalize()); }; g.add(m); return m; };
      const ring = (g, r, col, op, w) => { const m = new THREE.Mesh(new THREE.TorusGeometry(r, w || 0.012, 6, 128), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op })); m.rotation.x = Math.PI / 2; g.add(m); return m; };
      /* ================= 🌌 태양계 (위에서 본 모습, 원 궤도) ================= */
      const planets = [], rings = [];
      let sysZ = 0;
      function sysBuild(A) { A.PL.forEach((p) => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), M(parseInt(p.c.slice(1), 16), { roughness: 0.55 })); G.sys.add(m); planets.push(m); rings.push(ring(G.sys, 1, 0xb4c8ff, 0.3)); }); }
      let sysLabSel = null; const lsSel = reg('sys', label('', [0, 0, 0], { color: '#1b2333', size: 13 })); lsSel.el.style.background = 'rgba(255,255,255,.92)'; lsSel.el.style.color = '#1b2333';
      function sysScene(A, S) {
        if (!planets.length) sysBuild(A);
        const o = S.ob, k = 4.4 / o.zr;
        A.PL.forEach((p, i) => { const th = p.ph + TAU * o.t / p.T, R = p.r * k; planets[i].position.set(R * Math.cos(th), 0, -R * Math.sin(th)); planets[i].scale.setScalar(p.sz * 0.032 * (o.zm === 'in' ? 1 : 0.8) * 1.6); rings[i].scale.set(R, R, 1); rings[i].material.opacity = i === o.sel ? 0.85 : 0.28; });
        const sp = planets[o.sel]; lsSel.obj = sp; lsSel.set(A.PL[o.sel].n); lsSel.off = [0, 0.7, 0];
        sun.scale.setScalar(Math.max(0.5, Math.min(1.1, (1.75 / o.zr) ** 0.35)));
        const p = A.PL[o.sel], rec = o.rec.filter(Boolean).length;
        info('<b>🌌 위에서 본 태양계 (원 궤도로 단순화)</b> · t = ' + o.t.toFixed(1) + ' 년 · ' + (o.zm === 'in' ? '안쪽 행성' : '바깥쪽 행성까지') + ' 보기<br>고른 행성: <b>' + p.n + '</b> · 거리 r = ' + p.r.toFixed(3) + ' AU · 공전 주기 T = ' + p.T.toFixed(3) + ' 년<br>1 AU = 지구–태양 거리 · 태양에서 멀수록 천천히 돌아요. 기록한 행성 ' + rec + ' / 6<br><span style="opacity:.8">행성 고르기 · 보기 · 속도는 옆 조작판에서 해요.</span>');
      }
      /* ================= 🔭 화성 관측 (티코) ================= */
      const marsRing = ring(G.mars, 1.524 * 2.6, 0x8fb0ff, 0.0, 0.015); const marsPts = [];
      for (let i = 0; i < 12; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), M(0xff7a59, { emissive: 0x7a2d1a, transparent: true })); G.mars.add(m); marsPts.push(m); reg('mars', label(String(i + 1), m, { color: '#7a2d1a', size: 11 })); }
      const earthM = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14), M(0x3b82f6)); G.mars.add(earthM); const mTrail = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: 0x8fb0ff })); void mTrail;
      let marsArc = null, marsArcOn = false; const demoM = { p: 0, on: false };
      function marsScene(A, S) {
        const o = S.ob; let nk = o.mk, arc = o.arc;
        if (demoM.on && nk < 12) { nk = Math.min(12, Math.floor(demoM.p / 0.8 * 12 + 0.0001)); arc = demoM.p > 0.85 ? (demoM.p - 0.85) / 0.15 : 0; }
        const U = 2.6;
        marsPts.forEach((m, i) => { const q = A.marsObs(i); m.position.set(q.x * U, 0.1, -q.y * U); const on = i < nk; m.material.opacity = on ? 1 : 0.18; m.scale.setScalar(on ? 1 : 0.7); });
        marsRing.material.opacity = 0.75 * clamp(arc, 0, 1);
        sun.scale.setScalar(0.5);
        info('<b>🔭 화성의 관측 점 (티코 브라헤)</b> · 같은 시각(간격 1/12 공전 주기)마다 잰 화성의 위치<br>찍은 점 ' + nk + ' / 12' + (nk >= 12 ? ' → 점들을 이으면 태양을 둘러싼 거의 둥근 궤도가 돼요 (타원, 이심률이 작아요).' : ' · 정밀한 관측 자료가 케플러의 법칙을 낳았어요.') + '');
      }
      /* ================= ⏱ 같은 시간, 같은 넓이 (이심률을 크게 그린 모형) ================= */
      const EA = 0.6, AA = 3.4, planA = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 18), M(0x3b82f6, { roughness: 0.5 })); G.area.add(planA);
      const orbA = (() => { const pts = []; for (let i = 0; i < 120; i++) { const q = A_kpos(i / 120 * TAU); pts.push(new V3(q[0], 0.01, q[1])); } const t = tube(pts, 0.018, 0x8fb0ff, { basic: true, op: 0.8 }, true); G.area.add(t); return t; })();
      function A_kpos(M) { let E = M + EA * Math.sin(M); for (let i = 0; i < 12; i++) E -= (E - EA * Math.sin(E) - M) / (1 - EA * Math.cos(E)); const x = AA * (Math.cos(E) - EA), y = AA * Math.sqrt(1 - EA * EA) * Math.sin(E); return [-x, -y]; }   // 근일점이 왼쪽 (2D와 같게)
      const aVel = mkArrow(0xffd447, 0.05); G.area.add(aVel);
      const wedgeG = new THREE.Group(); G.area.add(wedgeG); let wKey = '';
      const lPe = reg('area', label('근일점', [0, 0, 0], { color: '#7c3aed', size: 12 })), lAp = reg('area', label('원일점', [0, 0, 0], { color: '#0f766e', size: 12 }));
      const startM = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), M(0xffffff)); G.area.add(startM);
      const cols = [0xff6b6b, 0x50aaff, 0x78dc78, 0xffc83c];
      function areaScene(A, S) {
        const o = S.ob, M0 = o.M;
        const sx = A_kpos(0); // 근일점 위치
        const q = A_kpos(M0); planA.position.set(q[0], 0.2, q[1]);
        // 태양은 초점: 2D처럼 태양을 기준으로 놓아요 → 위치는 그대로 두고 태양을 초점으로 이동
        const foc = new V3(0, 0, 0);
        const key = o.sec.map((s) => s.M0.toFixed(2)).join(',');
        if (key !== wKey) { wKey = key; while (wedgeG.children.length) { const c = wedgeG.children[0]; wedgeG.remove(c); c.geometry.dispose(); } o.sec.forEach((s, i) => { const n = 24, verts = [0, 0.03 + i * 0.002, 0], idx = []; for (let j = 0; j <= n; j++) { const p = A_kpos(s.M0 + 30 * RAD * j / n); verts.push(p[0], 0.03 + i * 0.002, p[1]); } for (let j = 1; j <= n; j++) idx.push(0, j + 1, j); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3)); g.setIndex(idx); wedgeG.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: cols[i % 4], transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }))); }); }
        const q2 = A_kpos(M0 + 0.02), vv = new V3(q2[0] - q[0], 0, q2[1] - q[1]); const sp = vv.length(); vv.normalize();
        setArrow(aVel, new V3(q[0], 0.25, q[1]), new V3(q[0], 0.25, q[1]).addScaledVector(vv, 0.5 + sp * 28));
        const pe = A_kpos(0), ap = A_kpos(Math.PI); lPe.obj = [pe[0], 0, pe[1]]; lAp.obj = [ap[0], 0, ap[1]]; lPe.off = [0, 0, 0.5]; lAp.off = [0, 0, 0.5];
        const sp0 = A_kpos(o.ph * RAD); startM.position.set(sp0[0], 0.1, sp0[1]);
        info('<b>⏱ 제2법칙: 같은 시간, 같은 넓이</b> (이심률을 크게 그린 모형)<br>행성과 태양을 이은 선이 같은 시간(T/12) 동안 쓸고 가는 넓이는 같아요. 노란 화살표 길이 = 속력 → <b>태양에 가까울수록 빨라요</b>.<br>색칠한 부채꼴 ' + o.sec.length + '개');
      }
      /* ================= 📊 T²–r³ 그래프 (1 AU³ → 0.01칸) ================= */
      const gAx = new THREE.Mesh(new THREE.BoxGeometry(10, 0.05, 0.05), M(0x8a95a8)); gAx.position.set(4.5, 0, 0); G.graph.add(gAx);
      const gAy = new THREE.Mesh(new THREE.BoxGeometry(0.05, 10, 0.05), M(0x8a95a8)); gAy.position.set(-0.5, 4.5, 0); G.graph.add(gAy);
      const gGrid = new THREE.GridHelper(10, 10, 0x4a5d85, 0x2b3a5c); gGrid.rotation.x = Math.PI / 2; gGrid.position.set(4.5, 4.5, -0.05); G.graph.add(gGrid);
      [0, 300, 600, 900].forEach((v) => { reg('graph', label(String(v), [v / 100, -0.45, 0], { color: '#475569', size: 11 })); reg('graph', label(String(v), [-1.1, v / 100, 0], { color: '#475569', size: 11 })); });
      reg('graph', label('r³ (AU³)', [9.6, -1.1, 0], { color: '#1d4ed8', size: 12 })); reg('graph', label('T² (년²)', [-1.2, 9.6, 0], { color: '#c2410c', size: 12 }));
      const gDots = []; for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), M(0xffffff, { emissive: 0x333333 })); G.graph.add(m); gDots.push(m); reg('graph', label('', m, { color: '#26324a', size: 11 })); }
      const fitLine = rodMk(G.graph, 0x7c5cff, 0.04);
      function graphScene(A, S) {
        const g = S.gr; let nd = 0;
        A.PL.forEach((p, i) => { const on = g.done[i]; gDots[i].visible = on; const lb = LAB.graph[4 + 2 * 0 + i + 4]; if (on) { nd++; gDots[i].position.set(p.r * p.r * p.r / 100, p.T * p.T / 100, 0); gDots[i].material.color.set(p.c); gDots[i].material.emissive.set(p.c); gDots[i].material.emissiveIntensity = 0.3; } });
        LAB.graph.slice(10).forEach((l, i) => { l.show(g.done[i]); l.set(A.PL[i].n); l.off = [0.2, 0.35, 0]; });
        const k = g.k; fitLine.setA(new V3(0, 0, 0), new V3(9, Math.min(9.8, 9 * k), 0));
        info('<b>📊 제3법칙: T²과 r³</b> · 찍은 점 ' + nd + ' / 6<br>여섯 행성의 (r³, T²) 점은 원점을 지나는 <b>직선</b> 위에 놓여요 → T² ∝ r³ (기울기 k는 모든 행성이 같아요).<br>보라색 직선의 기울기 k = ' + (Math.round(k * 100) / 100) + '');
      }
      /* ================= 🔗 힘과 거리의 제곱 ================= */
      const fFloor = new THREE.Mesh(new THREE.CylinderGeometry(7.2, 7.2, 0.06, 64), M(0x1a2238, { roughness: 1 })); fFloor.position.y = -0.1; G.force.add(fFloor);
      [1, 2, 3, 4].forEach((r) => { ring(G.force, r * 1.6, 0xb4c8ff, 0.25); reg('force', label(r + ' AU', [r * 1.6, 0, 0.3], { color: '#475569', size: 11 })); });
      const fP = new THREE.Mesh(new THREE.SphereGeometry(0.24, 24, 18), M(0x3b82f6)); G.force.add(fP); const fA = mkArrow(0xff5a5f, 0.07); G.force.add(fA); const fR = rodMk(G.force, 0xffffff, 0.015, 0.6);
      const lfP = reg('force', label('', fP, { color: '#1d4ed8', size: 12 })), lfF = reg('force', label('', fA, { color: '#e2464b', size: 13 })), lfR = reg('force', label('', [0, 0, 0], { color: '#475569', size: 12 }));
      function forceScene(A, S) {
        const f = S.fo, R = f.r * 1.6, th = f.th || 0; const p = new V3(R * Math.cos(th), 0.2, -R * Math.sin(th)); fP.position.copy(p);
        const ratio = 1 / (f.r * f.r), dir = p.clone().multiplyScalar(-1).setY(0).normalize();
        setArrow(fA, p, p.clone().addScaledVector(dir, 0.4 + ratio * 1.6)); lfF.obj = p.clone().addScaledVector(dir, 0.4 + ratio * 1.6); lfF.set('F = ' + (f.r === 1 ? 'F₀' : (1 / (f.r * f.r)).toFixed(3).replace(/0+$/, '') + ' F₀')); lfF.off = [0, 0.4, 0];
        fR.setA(new V3(0, 0.1, 0), p.clone().setY(0.1)); lfR.obj = p.clone().multiplyScalar(0.5); lfR.set('r = ' + f.r.toFixed(1) + ' AU'); lfR.off = [0, 0.3, 0]; lfP.set('같은 질량의 행성'); lfP.off = [0, 0.5, 0];
        info('<b>🔗 태양이 행성을 당기는 힘</b> · 같은 질량의 행성이 태양에서 r = ' + f.r.toFixed(1) + ' AU 떨어져 돌 때<br>빨간 화살표 길이 = 태양이 당기는 힘의 크기 (F₀ = 1 AU에서의 힘)<br>지금 힘의 크기: <b>F = ' + (f.r === 1 ? 'F₀' : (1 / (f.r * f.r)).toFixed(3).replace(/0+$/, '') + ' F₀') + '</b> · r를 바꿔 화살표 길이를 비교해 봐요.<br><span style="opacity:.8">거리 r은 옆 조작판에서 바꿔요.</span>');
      }
      /* ================= 🍎 사과와 달 (크기는 과장해서 그렸어요) ================= */
      const earth = new THREE.Mesh(new THREE.SphereGeometry(1.1, 36, 28), M(0x3b82f6, { roughness: 0.6 })); G.moon.add(earth); const land = new THREE.Mesh(new THREE.SphereGeometry(1.11, 12, 10), M(0x4caf6a, { transparent: true, opacity: 0.6, wireframe: true })); G.moon.add(land);
      const moonM = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 18), M(0xd1d5db, { roughness: 0.9 })); G.moon.add(moonM); const moonOrb = ring(G.moon, 6, 0xb4c8ff, 0.5);
      const apple = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 10), M(0xe2464b)); apple.position.set(0, 1.3, 0); G.moon.add(apple);
      const aGA = mkArrow(0xe2464b, 0.04), mGA = mkArrow(0xe2464b, 0.04); G.moon.add(aGA, mGA);
      const lmA = reg('moon', label('사과', apple, { color: '#c0392b', size: 12 })), lmM = reg('moon', label('달', moonM, { color: '#475569', size: 12 })), lmE = reg('moon', label('지구', earth, { color: '#1d4ed8', size: 12 })), lmR = reg('moon', label('달의 궤도 (거리는 줄여서 그렸어요)', [4.2, 0, 4.4], { color: '#475569', size: 11 })), lmG = reg('moon', label('중력', mGA, { color: '#c0392b', size: 12 }));
      function moonScene(A, S) {
        const a = S.mo.ang; moonM.position.set(6 * Math.cos(a), 0, -6 * Math.sin(a));
        const dirM = moonM.position.clone().multiplyScalar(-1).normalize(); setArrow(mGA, moonM.position.clone(), moonM.position.clone().addScaledVector(dirM, 1.0)); lmG.obj = moonM.position.clone().addScaledVector(dirM, 1.0); lmG.off = [0, 0.3, 0];
        setArrow(aGA, new V3(0, 1.35, 0), new V3(0, 0.55, 0)); lmA.off = [0.4, 0.2, 0]; lmM.off = [0, 0.55, 0]; lmE.off = [0, -0.4, 1.3];
        info('<b>🍎 사과와 달</b> · 달: 지구에서 r = 3.84 × 10⁸ m, 공전 주기 T = 2.36 × 10⁶ s<br>사과를 떨어뜨리는 지구의 중력과 달을 붙잡아 두는 힘은 같은 종류의 힘이에요 (뉴턴의 만유인력).<br>달은 원 궤도를 돌며 지구 쪽으로 계속 <b>떨어지고</b> 있어요. 구심 가속도 a = 4π²r / T²: 4π²r = 1.52 × 10¹⁰ m, T² = 5.57 × 10¹² s²로 계산해 봐요.<br><span style="opacity:.8">거리는 줄여서, 크기는 과장해서 그렸어요.</span>');
      }
      /* ================= 장면 · ▶ 재생 ================= */
      let plM = null; plM = controls.player({ duration: 10, loop: true, autoplay: false, label: '관측 점 쌓기', phases: [[0, '한 달마다 화성의 위치를 재요'], [0.85, '점을 이으면 궤도']], onFrame(p) { demoM.p = p; demoM.on = p > 0 || !!(plM && plM.playing); } });
      plM.row = ctx.renderer.domElement.parentNode.parentNode.querySelector('.v3-player');
      let cur = '';
      function setMode(S) {
        const mode = S.mode; if (mode === cur) return; cur = mode;
        Object.keys(G).forEach((k) => (G[k].visible = k === mode)); Object.keys(LAB).forEach((k) => LAB[k].forEach((l) => l.show(k === mode)));
        lSun.show(mode !== 'graph' && mode !== 'moon'); sun.visible = halo.visible = mode !== 'graph' && mode !== 'moon'; pl.visible = mode !== 'graph';
        plM.row.style.display = mode === 'mars' ? '' : 'none'; if (mode !== 'mars') { plM.pause(); plM.set(0); }
        const cams = { sys: { tx: 0, ty: 0, tz: 0, phi: 0.85, theta: 0.2, dist: 13 }, mars: { tx: 0, ty: 0, tz: 0, phi: 0.8, theta: 0.2, dist: 11 }, area: { tx: 0, ty: 0, tz: 0, phi: 0.85, theta: 0.2, dist: 12 }, graph: { tx: 4.5, ty: 4.5, tz: 0, phi: 1.5, theta: 0.0, dist: 17 }, force: { tx: 0, ty: 0, tz: 0, phi: 0.85, theta: 0.2, dist: PHN ? 14 : 11.5 }, moon: { tx: 0, ty: 0, tz: 0, phi: 0.95, theta: 0.2, dist: 15 } };
        const c = cams[mode]; if (c) Object.assign(orbit, c, { dist: c.dist * KDX });
      }
      return {
        update(dt, tm) {
          const A = sim(); if (!A || !A.S) return; const S = A.S;
          setMode(S); halo.scale.setScalar(1 + 0.03 * Math.sin(tm * 2));
          if (S.mode === 'sys') sysScene(A, S);
          else if (S.mode === 'mars') { if (S.ob.mk >= 12 && plM.playing) plM.pause(); if (!plM.playing && plM.p === 0) demoM.on = false; marsScene(A, S); }
          else if (S.mode === 'area') areaScene(A, S);
          else if (S.mode === 'graph') graphScene(A, S);
          else if (S.mode === 'force') forceScene(A, S);
          else if (S.mode === 'moon') moonScene(A, S);
        },
        sync() {},
      };
    },
  });
})();
