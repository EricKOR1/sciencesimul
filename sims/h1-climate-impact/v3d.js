/* h1-climate-impact · 3D 태평양 단면 (엘니뇨와 라니냐)
   적도 태평양의 단면: 서쪽(왼쪽) 필리핀·인도네시아 ~ 동쪽(오른쪽) 페루 앞바다.
   무역풍이 센 평상시에는 따뜻한 표층수가 서쪽에 두껍게 쌓이고, 동쪽에서는 찬 심층수가 올라와(용승) 멸치가 많아요.
   무역풍이 약해지면(엘니뇨) 따뜻한 물이 동쪽으로 퍼지고 용승이 약해져요. 2D 실험의 무역풍 세기 값(0~100)과 같은 값이에요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  window.SciSim3D.attach({
    title: '3D 태평양 단면',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHN ? 23 : 14.5, theta: 0.3, phi: 1.2, target: [0, 0.3, 0], min: 8, max: 34 },
    autoRotate: 0,
    levels: [0],
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3, Y = new V3(0, 1, 0);
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ envMapIntensity: 0.6, color: c, roughness: 0.6, metalness: 0.03 }, o || {}));
      const W = 12, H = 3.4, D = 3.2, NX = 60;
      const S0 = window.__sim && window.__sim.S;
      const st = { w: S0 && typeof S0.w === 'number' ? S0.w : 50, wS: 50, lastS: S0 ? S0.w : null, t: 0 };
      st.wS = st.w;
      const aOf = (w) => { const P = [[0, 2.6], [30, 0.5], [40, 0.25], [60, -0.25], [70, -0.5], [100, -1.6]]; w = Math.max(0, Math.min(100, w)); for (let i = 1; i < P.length; i++) if (w <= P[i][0]) return P[i - 1][1] + (P[i][1] - P[i - 1][1]) * (w - P[i - 1][0]) / (P[i][0] - P[i - 1][0]); return -1.6; };
      const pOf = (w) => Math.max(-0.6, Math.min(1, aOf(w) / 2.6));    // 0 평상시, 1 강한 엘니뇨, <0 라니냐
      const catOf = (w) => (aOf(w) >= 0.5 ? 'el' : aOf(w) <= -0.5 ? 'la' : 'no');

      /* ---------- 바닷물 단면: 위쪽 따뜻한 물층 + 아래 찬물 ---------- */
      // 수온약층 깊이 d(x): 평상시 서쪽 깊고 동쪽 얕음 (0~1: 위에서 아래로의 비율)
      const dAt = (xn, p) => { const dW = 0.5 - 0.12 * p, dE = 0.18 + 0.3 * p; return dW + (dE - dW) * sm(0.1, 0.9, xn); };
      const colW = new THREE.Color(0xff6a3d), colM = new THREE.Color(0xffc14a), colC = new THREE.Color(0x1b5fd0), colD = new THREE.Color(0x0a2a6e);
      // 뒤쪽 단면(바다 전체: 아래로 갈수록 파랗게) — 정점 색으로 표현
      const cutGeo = new THREE.PlaneGeometry(W, H, NX, 24);
      const cutCol = new Float32Array((NX + 1) * 25 * 3); cutGeo.setAttribute('color', new THREE.BufferAttribute(cutCol, 3));
      const cutM = new THREE.Mesh(cutGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
      cutM.position.set(0, -H / 2, D / 2); root.add(cutM);          // 앞쪽 단면
      const cutB = new THREE.Mesh(cutGeo, cutM.material); cutB.position.set(0, -H / 2, -D / 2); root.add(cutB);
      // 바다 표면 (색: 표층 수온)
      const surfGeo = new THREE.PlaneGeometry(W, D, NX, 8); surfGeo.rotateX(-Math.PI / 2);
      const surfCol = new Float32Array(surfGeo.attributes.position.count * 3); surfGeo.setAttribute('color', new THREE.BufferAttribute(surfCol, 3));
      const surf = new THREE.Mesh(surfGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.25, metalness: 0.05, transparent: true, opacity: 0.92 }));
      surf.position.y = 0; surf.receiveShadow = true; root.add(surf);
      // 바닥과 양쪽 옆면
      const floor = new THREE.Mesh(new THREE.BoxGeometry(W + 0.2, 0.3, D + 0.2), new THREE.MeshLambertMaterial({ color: 0x35405a })); floor.position.y = -H - 0.15; root.add(floor);
      const side = (x) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.25, H + 0.3, D + 0.2), mat(0x7a6a4a, { roughness: 1 })); m.position.set(x, -H / 2 + 0.05, 0); root.add(m); return m; };
      side(-W / 2 - 0.12); side(W / 2 + 0.12);
      // 동·서 육지 (해안)
      const land = (x, c, s) => { const g = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), mat(c, { roughness: 1 })); g.scale.set(1.4, 0.9 * s, D * 0.5); g.position.set(x, 0, 0); root.add(g); return g; };
      land(-W / 2 - 0.2, 0x5f9a4a, 1.0); const andes = land(W / 2 + 0.15, 0x8a7d62, 1.5);
      label('서쪽 (인도네시아·호주)', [-W / 2, 0.6, D / 2], { size: 12, offset: [0.6, 0.5, 0] });
      label('동쪽 (페루)', [W / 2, 0.8, D / 2], { size: 12, offset: [-0.2, 0.9, 0] });

      const cA = new THREE.Color(), cB = new THREE.Color(), cCool = new THREE.Color(0x4a9be6), cHot = new THREE.Color(0xff7a45);
      function paintCut() {
        const p = pOf(st.wS), pos = cutGeo.attributes.position, c = cutGeo.attributes.color;
        const pe = Math.max(0, Math.min(1, p));
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i), y = pos.getY(i), depth = (H / 2 - y) / H;       // 0 위 ~ 1 아래
          const xn = (x + W / 2) / W, d = dAt(xn, p), k = sm(d - 0.08, d + 0.08, depth);   // 0 따뜻 → 1 차가움
          cA.copy(colW).lerp(colM, Math.min(1, depth / Math.max(0.05, d)));
          cB.copy(colC).lerp(colD, Math.min(1, Math.max(0, depth - d) / (1 - d + 1e-3)));
          cA.lerp(cB, k);
          // 동쪽 표층은 평상시에 차가워요 (용승)
          const cool = sm(0.15, 0.85, xn) * (1 - pe) * (1 - sm(0, d, depth));
          cA.lerp(cCool, cool * 0.8);
          c.setXYZ(i, cA.r, cA.g, cA.b);
        }
        c.needsUpdate = true;
        const sp = surfGeo.attributes.position, sc = surfGeo.attributes.color;
        for (let i = 0; i < sp.count; i++) {
          const xn = (sp.getX(i) + W / 2) / W;
          cA.copy(cHot).lerp(cCool, sm(0.15, 0.85, xn) * (1 - pe) * 0.85); sc.setXYZ(i, cA.r, cA.g, cA.b);
        }
        sc.needsUpdate = true;
        thLine.update(p);
      }

      /* 수온약층 곡선 (흰 띠) */
      const thLine = (() => {
        const N = 48, pts = []; for (let i = 0; i <= N; i++) pts.push(new V3(-W / 2 + W * i / N, -0.5, D / 2 + 0.03));
        const mesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 90, 0.045, 6, false), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 }));
        root.add(mesh);
        let geoKey = '';
        return {
          mesh, update(p) {
            const q = []; for (let i = 0; i <= N; i++) { const xn = i / N; q.push(new V3(-W / 2 + W * xn, -H * dAt(xn, p), D / 2 + 0.04)); }
            mesh.geometry.dispose(); mesh.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(q), 90, 0.045, 6, false);
          },
        };
      })();
      const thLab = label('수온약층', [3.2, -1.2, D / 2], { size: 12, offset: [0, 0, 0.1] });

      /* ---------- 무역풍 화살표 (동 → 서), 세기에 따라 굵기·개수 ---------- */
      const windG = new THREE.Group(); root.add(windG);
      const winds = [];
      for (let i = 0; i < 5; i++) {
        const g = new THREE.Group(), z = -1.1 + (i % 3) * 1.1, y = 1.7 + (i % 2) * 0.35;
        const sh = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 12), mat(0xe5f1ff, { roughness: 0.3, emissive: 0x9fc8ff, emissiveIntensity: 0.4 }));
        const hd = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 14), sh.material);
        g.add(sh, hd); g.userData = { sh, hd, z, y, ph: i * 0.37 };
        sh.rotation.z = hd.rotation.z = Math.PI / 2;               // 화살표는 -x(서쪽)을 향해요
        windG.add(g); winds.push(g);
      }
      function layoutWinds() {
        const s = Math.max(0.15, st.wS / 100);       // 세기
        winds.forEach((g, i) => {
          const { sh, hd } = g.userData, r = 0.04 + s * 0.09, L = 1.8 + s * 2.2, hl = 0.3 + s * 0.35;
          sh.scale.set(r, L - hl, r); sh.position.set(-(L - hl) / 2, 0, 0);
          hd.scale.set(r * 2.4, hl, r * 2.4); hd.position.set(-(L - hl) - hl / 2, 0, 0);
          g.visible = i < Math.round(2 + s * 3.5);
        });
      }
      const windLab = label('무역풍', [4.5, 2.5, 0], { size: 12.5, offset: [0, 0.4, 0] });

      /* ---------- 구름 (따뜻한 물 위에서 비구름) ---------- */
      const cloud = new THREE.Group(); root.add(cloud);
      [[0, 0, 0, 0.7], [0.7, 0.1, 0.2, 0.55], [-0.7, 0, -0.1, 0.5], [0.3, 0.45, 0, 0.5], [1.3, -0.05, 0, 0.4], [-1.3, -0.05, 0.1, 0.38]].forEach((c) => { const m = new THREE.Mesh(new THREE.SphereGeometry(c[3], 20, 14), mat(0xdfe6f3, { roughness: 0.9, transparent: true, opacity: 0.96 })); m.position.set(c[0], c[1], c[2]); cloud.add(m); });
      const rain = []; for (let i = 0; i < 16; i++) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.35, 5), new THREE.MeshBasicMaterial({ color: 0x9fd0ff, transparent: true, opacity: 0.8 })); r.userData = { ox: (Math.random() - 0.5) * 2, oz: (Math.random() - 0.5) * 1.2, ph: Math.random() }; cloud.add(r); rain.push(r); }
      const cloudLab = label('비구름', cloud, { size: 12, offset: [0, 0.9, 0] });

      /* ---------- 용승 화살표 + 멸치 ---------- */
      const ups = [];
      for (let i = 0; i < 3; i++) {
        const g = new THREE.Group(); const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1, 10), mat(0x7ec4ff, { emissive: 0x4a9be6, emissiveIntensity: 0.5, transparent: true })), hd = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.4, 14), sh.material);
        g.add(sh, hd); g.userData = { sh, hd, i }; g.position.set(4.2 + i * 0.75, -2.4, D / 2 + 0.25); root.add(g); ups.push(g);
      }
      const upLab = label('용승 (찬 물이 올라와요)', [4.6, -1.8, D / 2], { size: 12, offset: [0, -0.1, 0.1] });
      const fishes = [];
      const fishGeo = (() => { const g = new THREE.SphereGeometry(0.11, 12, 8); g.scale(1.8, 0.8, 0.6); return g; })();
      const tailGeo = new THREE.ConeGeometry(0.09, 0.2, 8);
      for (let i = 0; i < 26; i++) {
        const f = new THREE.Group(), b = new THREE.Mesh(fishGeo, mat(0xe8eef7, { roughness: 0.3, metalness: 0.5 })), tl = new THREE.Mesh(tailGeo, b.material); tl.rotation.z = Math.PI / 2; tl.position.x = -0.22; f.add(b, tl);
        f.userData = { ph: Math.random() * 6.28, rx: 0.5 + Math.random() * 1.2, ry: 0.15 + Math.random() * 0.25, cx: 4.9 + (Math.random() - 0.5) * 1.8, cy: -0.7 - Math.random() * 0.8, cz: D / 2 + 0.2 + Math.random() * 0.5, sp: 0.6 + Math.random() * 0.6, idx: i };
        root.add(f); fishes.push(f);
      }
      label('멸치', fishes[0], { size: 12, offset: [0, 0.4, 0] });

      /* ---------- 적용 ---------- */
      function refresh() {
        const c = catOf(st.wS), a = aOf(st.wS);
        paintCut(); layoutWinds();
        const nFish = Math.round(26 * Math.max(0.1, Math.min(1, 0.8 - 0.28 * a)) / 0.8);
        fishes.forEach((m, i) => { m.visible = i < nFish; });
        const txt = { no: '<b>평상시</b>: 무역풍이 보통이라 따뜻한 물이 서쪽에 모이고, 동쪽은 찬 물이 올라와요(용승). 멸치가 많아요.',
          el: '<b>엘니뇨</b>: 무역풍이 약해져 따뜻한 물이 동쪽으로 퍼져요. 용승이 약해져 멸치가 줄고, 비구름도 동쪽으로 옮겨 가요.',
          la: '<b>라니냐</b>: 무역풍이 매우 강해 따뜻한 물이 서쪽에 더 쏠려요. 용승이 더 활발해요.' }[c];
        info(txt);
        cloudTarget = -4.2 + (sm(0, 1, Math.max(0, Math.min(1, a / 2.6))) * 6.2) + (a < 0 ? a * 0.8 : 0);
      }
      let cloudTarget = -4.2;
      const rngW = controls.range('무역풍 세기', 0, 100, 1, st.w, (v) => { st.w = v; seg.set(-1); }, (v) => (v <= 30 ? v + ' (약함)' : v >= 70 ? v + ' (매우 강함)' : v + ' (보통)'));
      const seg = controls.segment('바로가기', [{ value: 50, label: '평상시' }, { value: 15, label: '엘니뇨' }, { value: 90, label: '라니냐' }], -1, (v) => { st.w = v; rngW.set(v); });
      let lastW = -1;

      return {
        update(dt, t) {
          st.t += dt;
          if (window.__sim && window.__sim.S && window.__sim.S.w !== st.lastS) { st.lastS = window.__sim.S.w; st.w = st.lastS; rngW.set(st.w); seg.set(-1); }
          st.wS += (st.w - st.wS) * Math.min(1, dt * 3.2);
          if (Math.abs(st.wS - lastW) > 0.05) { lastW = st.wS; refresh(); }
          const s = Math.max(0.15, st.wS / 100);
          winds.forEach((g) => { const u = g.userData; g.position.set(5.2 - ((t * (0.8 + s * 1.4) + u.ph * 3) % 4.2) + 0.2, u.y + Math.sin(t + u.ph) * 0.05, u.z); });
          cloud.position.x += (cloudTarget - cloud.position.x) * Math.min(1, dt * 2.5); cloud.position.y = 2.25 + Math.sin(t * 0.7) * 0.05; cloud.position.z = 0;
          rain.forEach((r) => { const u = r.userData; r.position.set(u.ox, -0.2 - (((t * 0.9 + u.ph) % 1)) * 1.6, u.oz); });
          const upS = Math.max(0.1, Math.min(1, 0.8 - 0.28 * aOf(st.wS))) / 0.8;
          ups.forEach((g) => {
            const u = g.userData, L = 1.6 * (0.3 + upS * 0.7); u.sh.scale.set(0.6 + upS * 0.6, L, 0.6 + upS * 0.6); u.sh.position.y = L / 2; u.hd.position.y = L + 0.1; u.hd.scale.setScalar(0.5 + upS * 0.5);
            u.sh.material.opacity = 0.25 + upS * 0.65; g.position.y = -2.7 + ((t * 0.5 * upS + u.i / 3) % 1) * 0.6;
          });
          fishes.forEach((m) => { const u = m.userData, a = t * u.sp + u.ph; m.position.set(u.cx + Math.cos(a) * u.rx, u.cy + Math.sin(a * 1.3) * u.ry, u.cz + Math.sin(a) * 0.12); m.rotation.y = Math.cos(a) > 0 ? Math.PI : 0; m.rotation.z = Math.sin(a * 1.3) * 0.2; });
        },
        sync() {},
      };
    },
  });
})();
