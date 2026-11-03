/* hy-organelles · 3D 세포 소기관 모형
   핵 · 미토콘드리아 · 엽록체 · 소포체 · 골지체 · 리소좀의 입체 구조를 돌려 보며 막의 개수(이중막 / 단일막 / 막 없음)와 기능을 연결해요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const narrow = window.innerWidth < 600 || window.innerHeight > window.innerWidth * 1.1;
  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  /* 2D 차시(ORG)와 같은 이름 · 막 개수 · 설명 */
  const MEMN = ['막 없음', '단일막', '이중막'];
  const INFO = {
    nuc: ['핵', 2, '이중막(핵막)에 핵공이 뚫려 있고, 안에 인과 염색질이 있어요.', '유전 정보를 저장하고 세포 활동을 조절해요.', '동물 · 식물 세포'],
    rer: ['거친 소포체', 1, '납작한 주머니 모양의 단일막이에요. 겉면에 리보솜이 붙어 있어요.', '리보솜에서 만든 단백질을 받아 운반해요.', '동물 · 식물 세포'],
    ser: ['매끈 소포체', 1, '리보솜이 없는 관 모양의 단일막이에요.', '지질을 합성하고 독성 물질을 해독해요.', '동물 · 식물 세포'],
    rib: ['리보솜', 0, '막이 없어요. 큰 단위와 작은 단위, 두 단위(단백질 + rRNA)로 이루어져요.', '단백질을 합성해요(번역).', '동물 · 식물 세포'],
    gol: ['골지체', 1, '납작한 주머니(단일막)가 층층이 쌓여 있어요.', '단백질을 가공 · 분류 · 포장해서 분비해요.', '동물 · 식물 세포'],
    lys: ['리소좀', 1, '가수분해 효소가 들어 있는 단일막 주머니예요.', '세포 안의 물질을 분해해요(세포 내 소화).', '동물 세포에서 두드러짐'],
    mit: ['미토콘드리아', 2, '이중막이고 안쪽 막이 접힌 크리스타가 있어요.', '세포호흡으로 ATP를 만들어요(에너지 생산).', '동물 · 식물 세포'],
    chl: ['엽록체', 2, '이중막이고 안에 틸라코이드 막이 쌓인 그라나가 있어요.', '광합성으로 포도당을 만들어요.', '식물 세포'],
    vac: ['액포', 1, '단일막 주머니예요. 식물 세포에서는 크고 가운데에 있어요.', '물질을 저장하고 삼투 조절을 도와요.', '식물 세포에서 크게 발달'],
    wal: ['세포벽', 0, '세포막 바깥을 싸는 단단한 층이에요(셀룰로스). 막이 아니에요.', '세포의 모양을 유지하고 보호해요.', '식물 세포'],
  };
  const PLANT_ONLY = ['chl', 'vac', 'wal'];

  window.SciSim3D.attach({
    title: '세포 소기관 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: narrow ? 12 : 8.6, theta: 0.5, phi: 1.2, target: [0, 0, 0], min: 4, max: 18 },
    autoRotate: 0.22,
    levels: [1],   // 1단계(현미경 · 보이는 것 분류)와 3~4단계(원심분리 · 세포 분획)는 2D 실험 화면에서, 세포 단면 · 기능 연결 · 막 개수 단계에서 3D로 시작
    build(ctx) {
      const { THREE, root, label, info, controls, renderer } = ctx;
      const V = THREE.Vector3;
      renderer.localClippingEnabled = true;
      let key = 'nuc';
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.45, metalness: 0.03 }, o || {}));
      const glass = (c, op, o) => std(c, Object.assign({ transparent: true, opacity: op, side: THREE.DoubleSide, depthWrite: false, roughness: 0.3 }, o || {}));
      const G = {};                    // 소기관별 그룹
      const labs = {};
      const An = (g, x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); g.add(o); return o; };
      const add = (k, text, obj, color) => { (labs[k] = labs[k] || []).push(label(text, obj, { color })); };
      function tube(pts, r, mat, closed) { return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, closed), pts.length * 8, r, 8, !!closed), mat); }

      /* ---------- 핵 ---------- */
      (function () {
        const g = G.nuc = new THREE.Group(); const R = 2.3, r2 = Math.random;
        const cut = new THREE.Plane(new V(-1, 0, 0), 0.4);     // 앞쪽 일부를 잘라 속이 보이게
        const m1 = glass(0xa78bfa, 0.38, { clippingPlanes: [cut] }), m2 = glass(0xc4b5fd, 0.3, { clippingPlanes: [cut] });
        const o = new THREE.Mesh(new THREE.SphereGeometry(R, 56, 40), m1), i = new THREE.Mesh(new THREE.SphereGeometry(R - 0.16, 56, 40), m2); g.add(o, i);
        // 핵공
        const R_ = rng(12), poreM = std(0x5b21b6, { roughness: 0.5 });
        for (let k = 0; k < 26; k++) {
          const d = new V(R_() * 2 - 1, R_() * 2 - 1, R_() * 2 - 1).normalize(); if (d.x > 0.2) continue;
          const t = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.05, 10, 20), poreM); t.position.copy(d).multiplyScalar(R - 0.06); t.lookAt(0, 0, 0); g.add(t);
        }
        // 인 + 염색사
        const nu = new THREE.Mesh(new THREE.SphereGeometry(0.62, 32, 24), std(0x4c1d95, { roughness: 0.5 })); nu.position.set(-0.2, 0.2, 0.1); g.add(nu);
        const cm = std(0xf472b6, { roughness: 0.5 }); const R2 = rng(33);
        for (let k = 0; k < 9; k++) {
          const pts = []; let p = new V(R2() * 2 - 1, R2() * 2 - 1, R2() * 2 - 1).normalize().multiplyScalar(0.9 + R2() * 0.6);
          for (let q = 0; q < 9; q++) { pts.push(p.clone()); p = p.clone().add(new V(R2() - 0.5, R2() - 0.5, R2() - 0.5).multiplyScalar(0.9)); if (p.length() > R - 0.45) p.multiplyScalar((R - 0.45) / p.length()); }
          g.add(tube(pts, 0.06, cm));
        }
        add('nuc', '핵막 (이중막)', An(g, 0, -R - 0.0, 0.0), '#5b21b6'); add('nuc', '핵공', An(g, -R * 0.9, 0.9, 0.5), '#4c1d95'); add('nuc', '인', An(g, -0.2, 0.9, 0.1), '#312e81'); add('nuc', '염색질', An(g, 0.9, 0.2, 0.9), '#9d174d');
      })();

      /* ---------- 미토콘드리아 ---------- */
      (function () {
        const g = G.mit = new THREE.Group(); const cut = new THREE.Plane(new V(0, 0, -1), 0.0);
        const capsule = (R, L) => { const c = new THREE.CapsuleGeometry(R, L, 20, 44); c.rotateZ(Math.PI / 2); return c; };
        g.add(new THREE.Mesh(capsule(1.45, 2.6), glass(0xf59e0b, 0.32, { clippingPlanes: [cut] })), new THREE.Mesh(capsule(1.25, 2.55), glass(0xfb7185, 0.28, { clippingPlanes: [cut] })));
        const cr = std(0xe11d48, { roughness: 0.5, clippingPlanes: [cut], side: THREE.DoubleSide });
        for (let i = -3; i <= 3; i++) {
          const up = i % 2 === 0;
          const m = new THREE.Mesh(new THREE.CircleGeometry(1.15, 40, up ? 0 : Math.PI, Math.PI), cr); m.rotation.y = Math.PI / 2; m.position.x = i * 0.62; m.position.y = 0; g.add(m);
        }
        const dnaM = std(0x2563eb), R3 = rng(5);
        const dpts = []; for (let q = 0; q < 12; q++) dpts.push(new V(-0.3 + Math.cos(q * 0.8) * 0.45, -0.4 + Math.sin(q * 1.1) * 0.25, -0.4 + R3() * 0.3 - 0.2)); g.add(tube(dpts, 0.05, dnaM, true));
        for (let k = 0; k < 14; k++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), std(0x7c3aed)); s.position.set((R3() * 2 - 1) * 1.8, (R3() * 2 - 1) * 0.6, -0.1 - R3() * 0.7); g.add(s); }
        add('mit', '외막', An(g, 1.2, 1.5, 0), '#9a3412'); add('mit', '내막 (크리스타)', An(g, -0.6, 0.9, 0.05), '#9f1239'); add('mit', '기질', An(g, 0.3, -0.7, 0.0), '#78350f');
      })();

      /* ---------- 엽록체 ---------- */
      (function () {
        const g = G.chl = new THREE.Group(); const cut = new THREE.Plane(new V(0, 0, -1), 0.0);
        const el = (sx, sy, sz, m) => { const e = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), m); e.scale.set(sx, sy, sz); return e; };
        g.add(el(2.9, 1.5, 1.5, glass(0x65a30d, 0.28, { clippingPlanes: [cut] })), el(2.7, 1.35, 1.35, glass(0xa3e635, 0.2, { clippingPlanes: [cut] })));
        const gm = std(0x15803d, { roughness: 0.5, clippingPlanes: [cut] }), lm = std(0x0d9488, { clippingPlanes: [cut] });
        const spots = [[-1.7, 0.1, -0.3], [-0.6, -0.2, -0.5], [0.6, 0.15, -0.35], [1.7, -0.1, -0.45], [0.0, 0.55, -0.8]];
        spots.forEach((p, n) => { for (let k = 0; k < 6; k++) { const d = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.1, 28), gm); d.position.set(p[0], p[1] - 0.5 + k * 0.2, p[2]); g.add(d); } });
        for (let n = 0; n < spots.length - 1; n++) { const a = spots[n], b = spots[n + 1]; g.add(tube([new V(a[0], a[1], a[2]), new V((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 0.1, (a[2] + b[2]) / 2 - 0.1), new V(b[0], b[1], b[2])], 0.05, lm)); }
        const st = new THREE.Mesh(new THREE.SphereGeometry(0.26, 18, 14), std(0xe2e8f0)); st.position.set(-2.1, -0.7, -0.3); g.add(st);
        add('chl', '외막 · 내막', An(g, 2.2, 1.35, 0.3), '#3f6212'); add('chl', '그라나 (틸라코이드)', An(g, -0.6, 0.85, -0.4), '#14532d'); add('chl', '스트로마', An(g, 1.1, -0.95, -0.3), '#365314');
      })();

      /* ---------- 소포체 (+ 리보솜) ---------- */
      (function () {
        const g = G.rer = new THREE.Group();
        function sheet(y, col, op) {
          const geo = new THREE.PlaneGeometry(6.4, 4.2, 70, 46), p = geo.attributes.position;
          for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getY(i); p.setXYZ(i, x, y + 0.22 * Math.sin(x * 1.1 + z * 0.4) + 0.12 * Math.sin(z * 1.6), z); }
          geo.computeVertexNormals(); const m = new THREE.Mesh(geo, glass(col, op)); return { m, p: geo.attributes.position };
        }
        const bottom = sheet(-0.28, 0xfb923c, 0.6), top = sheet(0.28, 0xfdba74, 0.6); g.add(bottom.m, top.m);
        // 가장자리 연결 (소낭 모양으로 말린 끝)
        [-1, 1].forEach((s) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 4.2, 20), glass(0xfb923c, 0.7)); c.rotation.x = Math.PI / 2; c.position.set(s * 3.2, 0.0 + 0.22 * Math.sin(s * 3.2 * 1.1), 0); g.add(c); });
        // 리보솜 (위쪽 막 바깥면에 붙어요)
        const R = rng(8), ribM = std(0x7c3aed, { roughness: 0.4 }), ribN = 70;
        const rim = new THREE.InstancedMesh(new THREE.SphereGeometry(0.11, 12, 10), ribM, ribN), M4 = new THREE.Matrix4();
        for (let i = 0; i < ribN; i++) { const x = (R() * 2 - 1) * 3.0, z = (R() * 2 - 1) * 1.95; M4.makeTranslation(x, 0.28 + 0.22 * Math.sin(x * 1.1 + z * 0.4) + 0.12 * Math.sin(z * 1.6) + 0.14, z); rim.setMatrixAt(i, M4); }
        g.add(rim);
        add('rer', '거친 소포체', An(g, -1.2, 1.2, 1.4), '#9a3412'); add('rer', '리보솜', An(g, 0.6, 0.85, -0.5), '#5b21b6'); add('rer', '막 (단일막)', An(g, 3.2, -0.2, 0.3), '#7c2d12'); add('rer', '납작한 주머니 (단일막)', An(g, -2.3, -0.1, 1.8), '#9a3412');
      })();

      /* ---------- 골지체 ---------- */
      (function () {
        const g = G.gol = new THREE.Group();
        const caps = 6;
        for (let k = 0; k < caps; k++) {
          const sac = new THREE.Mesh(new THREE.SphereGeometry(1, 56, 24), std(k % 2 ? 0x14b8a6 : 0x2dd4bf, { roughness: 0.38, transparent: true, opacity: 0.85 }));
          sac.scale.set(2.3 - 0.13 * k, 0.2, 1.8 - 0.1 * k); sac.position.y = k * 0.5 - 1.25; g.add(sac);
          [-1, 1].forEach((sd) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.24, 20, 14), std(k % 2 ? 0x0f766e : 0x14b8a6, { roughness: 0.4 })); e.position.set(sd * (2.2 - 0.13 * k), sac.position.y, 0); g.add(e); });
        }
        // 소낭
        const R2 = rng(21), vm = std(0xfbbf24, { roughness: 0.35 });
        for (let k = 0; k < 9; k++) { const a = R2() * 6.28, rr = 1.9 + R2() * 0.9, v = new THREE.Mesh(new THREE.SphereGeometry(0.17 + R2() * 0.06, 16, 12), vm); v.position.set(Math.cos(a) * rr, -1.3 + R2() * 2.7, Math.sin(a) * rr); g.add(v); }
        add('gol', '골지체 (납작한 주머니)', An(g, 0.0, 1.8, 0.0), '#115e59'); add('gol', '분비 소낭', An(g, 2.5, 0.25, 0.8), '#92400e'); add('gol', '막 (단일막)', An(g, -2.3, -0.35, 0.8), '#134e4a');
      })();

      /* ---------- 리소좀 ---------- */
      (function () {
        const g = G.lys = new THREE.Group(); const cut = new THREE.Plane(new V(0, 0, -1), 0.0);
        g.add(new THREE.Mesh(new THREE.SphereGeometry(2.1, 56, 40), glass(0xf472b6, 0.33, { clippingPlanes: [cut] })));
        const R = rng(3), cols = [0xfacc15, 0x38bdf8, 0x4ade80, 0xfb923c, 0xa78bfa];
        for (let k = 0; k < 46; k++) { const d = new V(R() * 2 - 1, R() * 2 - 1, -R()).normalize().multiplyScalar(0.5 + R() * 1.3); const e = new THREE.Mesh(new THREE.SphereGeometry(0.1 + R() * 0.06, 12, 10), std(cols[k % 5], { roughness: 0.35 })); e.position.copy(d); g.add(e); }
        // 분해되는 낡은 소기관
        const old = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.6, 8, 20), std(0xf59e0b, { roughness: 0.5, transparent: true, opacity: 0.8 })); old.position.set(0.1, 0.1, -0.7); old.rotation.z = 0.6; g.add(old);
        add('lys', '막 (단일막)', An(g, 1.5, 1.7, 0.0), '#9d174d'); add('lys', '가수분해 효소', An(g, -0.9, -0.9, -0.6), '#1e3a8a'); add('lys', '분해되는 낡은 소기관', An(g, 0.1, 0.65, -0.7), '#92400e');
      })();

      /* ---------- 매끈 소포체 (리보솜 없는 관) ---------- */
      (function () {
        const g = G.ser = new THREE.Group(); const R = rng(41), m = glass(0x2dd4bf, 0.62, { roughness: 0.3 });
        const nets = [];
        for (let k = 0; k < 7; k++) {
          const pts = []; const y0 = (k - 3) * 0.55; const ph = R() * 6;
          for (let q = 0; q < 9; q++) pts.push(new V((q - 4) * 0.62 + (R() - 0.5) * 0.2, y0 + Math.sin(q * 1.3 + ph) * 0.35, Math.cos(q * 0.9 + ph * 1.7) * 1.5 + (R() - 0.5) * 0.3));
          g.add(tube(pts, 0.17, m)); nets.push(pts);
        }
        for (let k = 0; k < 6; k++) { const a = nets[k][2 + (k % 3)], b = nets[k + 1][2 + (k % 3)]; g.add(tube([a.clone(), a.clone().lerp(b, 0.5).add(new V(0.1, 0, 0.15)), b.clone()], 0.15, m)); }
        add('ser', '매끈 소포체 (관 모양)', An(g, 0, 2.3, 0.2), '#115e59'); add('ser', '리보솜이 없어요', An(g, -2.4, 0.2, 1.4), '#0f766e'); add('ser', '막 (단일막)', An(g, 2.4, -0.6, 1.1), '#134e4a');
      })();

      /* ---------- 리보솜 (막 없음: 큰 단위 + 작은 단위) ---------- */
      (function () {
        const g = G.rib = new THREE.Group();
        const big = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 36), std(0x2f4f8f, { roughness: 0.45 })); big.scale.set(1.55, 1.2, 1.2); big.position.set(0, 0.45, 0);
        const small = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 36), std(0x60a5fa, { roughness: 0.45 })); small.scale.set(1.35, 0.7, 1.0); small.position.set(-0.05, -0.85, 0);
        g.add(big, small);
        const mr = tube([new V(-2.6, -1.0, 0.3), new V(-1.2, -1.15, 0.6), new V(0.2, -1.15, 0.3), new V(1.6, -1.1, 0.5), new V(2.8, -0.9, 0.2)], 0.07, std(0xf59e0b));
        g.add(mr);
        for (let k = 0; k < 14; k++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), std(k % 2 ? 0xe879f9 : 0xfb7185)); d.position.set(-0.5 + k * 0.06 + Math.cos(k) * 0.05, 1.7 + k * 0.1, Math.sin(k * 1.3) * 0.12); d.position.x = -0.1 + (k % 5) * 0.16; d.position.y = 1.75 + Math.floor(k / 5) * 0.2; d.position.z = Math.sin(k) * 0.1; g.add(d); }
        g.scale.setScalar(0.78); g.position.y = -0.5;
        add('rib', '큰 단위', An(g, 1.3, 0.9, 0.5), '#1e3a8a'); add('rib', '작은 단위', An(g, 1.0, -0.9, 0.9), '#1d4ed8'); add('rib', '단백질 합성 (번역)', An(g, 0, 2.55, 0), '#9d174d'); add('rib', '막 없음', An(g, -2.4, 1.0, 0), '#0f172a');
      })();

      /* ---------- 액포 (식물 세포의 크고 가운데 있는 단일막 주머니) ---------- */
      (function () {
        const g = G.vac = new THREE.Group(); const cut = new THREE.Plane(new V(0, 0, -1), 0.0), R = rng(17);
        g.add(new THREE.Mesh(new THREE.SphereGeometry(2.2, 56, 40), glass(0x4a8fc0, 0.3, { clippingPlanes: [cut] })), new THREE.Mesh(new THREE.SphereGeometry(2.04, 48, 34), glass(0xbae6fd, 0.18, { clippingPlanes: [cut] })));
        const cols = [0xfacc15, 0xf472b6, 0x34d399, 0xa78bfa];
        for (let k = 0; k < 40; k++) { const d = new V(R() * 2 - 1, R() * 2 - 1, -R()).normalize().multiplyScalar(0.3 + R() * 1.5); const e = new THREE.Mesh(new THREE.SphereGeometry(0.07 + R() * 0.05, 10, 8), std(cols[k % 4], { clippingPlanes: [cut] })); e.position.copy(d); g.add(e); }
        add('vac', '액포막 (단일막)', An(g, 1.6, 1.6, 0), '#1e40af'); add('vac', '물질 저장', An(g, -0.5, 0.2, -0.8), '#0c4a6e'); add('vac', '삼투 조절', An(g, -1.2, -1.4, -0.3), '#075985');
      })();

      /* ---------- 세포벽 (셀룰로스 층, 막이 아님) ---------- */
      (function () {
        const g = G.wal = new THREE.Group(); const R = rng(9);
        const fib = std(0xc9a85a, { roughness: 0.55 });
        // 셀룰로스 섬유: 서로 엇갈린 층
        for (let l = 0; l < 4; l++) for (let k = 0; k < 14; k++) {
          const c = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 4.6, 8), fib); c.rotation.z = Math.PI / 2; c.rotation.y = l % 2 ? 0.35 : -0.35 + (l > 1 ? 0.1 : 0);
          c.position.set(0, 1.55 + l * 0.2, (k - 6.5) * 0.34 + (l % 2) * 0.12); g.add(c);
        }
        const mem = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.1, 5.0), glass(0xfb7185, 0.7)); mem.position.set(0, 1.0, 0); g.add(mem);
        const cyt = new THREE.Mesh(new THREE.BoxGeometry(5.0, 1.0, 5.0), glass(0xbbf7d0, 0.18)); cyt.position.set(0, 0.45, 0); g.add(cyt);
        for (let k = 0; k < 8; k++) { const o = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), std(k % 2 ? 0x3f9b3a : 0xd9622b)); o.position.set((R() * 2 - 1) * 2.4, 0.3 + R() * 0.4, (R() * 2 - 1) * 2); g.add(o); }
        g.position.y = -1.0; g.scale.setScalar(0.85);
        add('wal', '세포벽 (셀룰로스)', An(g, 0, 2.7, 0), '#78350f'); add('wal', '세포막 (막)', An(g, 2.3, 1.0, 1.5), '#9f1239'); add('wal', '세포벽은 막이 아니에요', An(g, -2.0, 0.0, 1.6), '#334155');
      })();

      Object.values(G).forEach((g) => root.add(g));
      let lastSel = null;
      function setKey(k) {
        key = k;
        Object.keys(G).forEach((n) => { G[n].visible = n === k; (labs[n] || []).forEach((l) => l.show(n === k)); });
        const d = INFO[k];
        info('<b>' + d[0] + '</b> · <span style="color:#ffd34d">' + MEMN[d[1]] + '</span> · ' + d[4] + '<br>' + d[2] + '<br><span style="color:#a7f3d0">기능: ' + d[3] + '</span>');
      }
      /* 3D에서 고르면 2D 세포 단면에서도 같은 소기관을 선택해요 (식물 · 동물 세포도 맞춰요) */
      function pick(k) {
        setKey(k);
        const L = ctx.lesson(); if (!L || !L.S || L.S.mode !== 'cell' || !L.cellSet) return;
        const c = L.S.cell;
        if (PLANT_ONLY.indexOf(k) >= 0 && c.kind !== 'plant') L.cellSet('plant');
        else if (k === 'lys' && c.kind !== 'animal') L.cellSet('animal');
        c.sel = k; c.seen[k] = true; lastSel = k; L.updateCtl();
      }
      const KEYS = ['nuc', 'rer', 'ser', 'rib', 'gol', 'lys', 'mit', 'chl', 'vac', 'wal'];
      const items = KEYS.map((k) => ({ value: k, label: INFO[k][0] }));
      const seg = controls.segment('소기관', items, key, (v) => { seg.set(v); pick(v); });
      { const L = ctx.lesson(); if (L && L.S && L.S.cell && L.S.cell.sel && INFO[L.S.cell.sel]) { key = L.S.cell.sel; lastSel = key; } }
      seg.set(key); setKey(key);
      function follow() {
        const L = ctx.lesson(); if (!L || !L.S || L.S.mode !== 'cell' || !L.S.cell) return;
        const sel = L.S.cell.sel;
        if (sel !== lastSel) { lastSel = sel; if (sel && INFO[sel] && sel !== key) { seg.set(sel); setKey(sel); } }
      }
      return { update() { follow(); }, sync() { follow(); } };
    },
  });
})();
