/* hp-convex-lens · 3D 볼록 렌즈와 상
   렌즈 공식 1/a + 1/b = 1/f. 물체가 초점 밖(a > f)이면 거꾸로 선 실상이 스크린에 맺히고, 초점 안(a < f)이면 확대된 바로 선 허상이 생겨요.
   세 광선: ① 광축에 나란히 → 초점 통과, ② 렌즈 중심 → 직진, ③ 앞쪽 초점 통과 → 광축에 나란히. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches), KD = PHN ? 1.3 : 1;
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
  window.SciSim3D.attach({
    title: '볼록 렌즈와 상 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: 14 * KD, theta: 0.5, phi: 1.2, min: 5, max: 30, target: [0, 0.4, 0] },
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const { V3, M, mkArrow, setArrow, tube, glass } = tools(THREE);
      const st = { f: 2.5, a: 6 };
      const HO = 1.1, FAR = 9;
      // 광학대
      const bench = new THREE.Mesh(new THREE.BoxGeometry(22, 0.14, 1.4), M(0x64748b, { metalness: 0.5, roughness: 0.4 })); bench.position.y = -0.9; bench.receiveShadow = true; root.add(bench);
      const axis = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 22, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 })); axis.rotation.z = Math.PI / 2; root.add(axis);
      const lens = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), new THREE.MeshStandardMaterial({ color: 0x9fd2ff, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.4, depthWrite: false })); lens.scale.set(0.34, 2.3, 2.3); root.add(lens);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.09, 12, 56), M(0x475569, { metalness: 0.6 })); rim.rotation.y = Math.PI / 2; root.add(rim);
      const stand = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.0, 0.5), M(0x475569)); stand.position.set(0, -2.2 + 0.1, 0); root.add(stand);
      const objA = mkArrow(0xffb020, 0.07), imgA = mkArrow(0xff5a5f, 0.07); root.add(objA, imgA);
      const imgMat = imgA.userData.sh.material; imgMat.transparent = true;
      const candle = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.9), M(0x64748b)); root.add(candle);
      const scr = new THREE.Mesh(new THREE.BoxGeometry(0.1, 3.0, 2.4), new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.9, transparent: true, opacity: 0.85 })); root.add(scr);
      const rays = new THREE.Group(); root.add(rays);
      const fMarks = [new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), M(0xa78bfa)), new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), M(0xa78bfa))]; fMarks.forEach((m) => root.add(m));
      const lO = label('물체', objA, { color: '#b45309', size: 12, offset: [0, 0.55, 0] }), lI = label('상', imgA, { color: '#e2464b', size: 12, offset: [0, 0.55, 0] }), lF1 = label('F', fMarks[0], { color: '#7c3aed', size: 12, offset: [0, -0.45, 0] }), lF2 = label('F', fMarks[1], { color: '#7c3aed', size: 12, offset: [0, -0.45, 0] });
      const lL = label('볼록 렌즈', lens, { color: '#0e7490', size: 12, offset: [0, 2.7, 0] });
      let rayMeshes = [];
      function build() {
        rayMeshes.forEach((m) => { rays.remove(m); m.geometry.dispose(); }); rayMeshes = [];
        const f = st.f, a = st.a, near = Math.abs(a - f) < 0.06;
        const b = near ? 1e9 : 1 / (1 / f - 1 / a), mag = -b / a, hi = mag * HO;
        const ox = -a, oy = HO, real = b > 0 && !near, far = real && b > FAR - 0.5;
        objA.position.set(ox, 0, 0); setArrow(objA, new V3(ox, 0, 0), new V3(ox, oy, 0)); candle.position.set(ox, -0.1, 0); 
        fMarks[0].position.set(-f, 0, 0); fMarks[1].position.set(f, 0, 0);
        const add = (pts, col, op, thin) => { const t = tube(pts, thin || 0.022, col, { basic: true, op: op || 0.9 }); rays.add(t); rayMeshes.push(t); };
        const P = (x, y) => new V3(x, y, 0);
        const lensY = (y) => y;                                 // 얇은 렌즈 근사
        const colr = [0xffe066, 0x7ee787, 0x79c0ff];
        // ① 광축에 나란히 → 렌즈 → 초점
        // ② 중심 직진, ③ 초점 통과 → 렌즈 → 나란히
        const y1 = oy, y3 = oy * (1 + 0) * 1;                    // 렌즈 위 높이: ① oy, ③ oy * f/(a - f) 로 계산
        const y3L = near ? null : oy * f / (f - a) * 1.0 * -1 * -1;
        // ③: 물체 끝에서 F(-f)를 통과해 렌즈에 닿는 높이: 직선 (ox,oy) → (-f,0) 연장 : y = oy * (0 - (-f)) / ((-f) - ox) 에서 x=0
        const hit3 = near ? 0 : oy * (0 - (-f)) / ((-f) - ox) * -1 * -1;
        // 직선: y(x) = oy + (0 - oy)/((-f) - ox) * (x - ox) → x=0
        const y3a = oy + (0 - oy) / ((-f) - ox) * (0 - ox);
        const xe = Math.min(FAR, Math.max(real ? b : FAR, 4));
        if (!near) {
          const bx = real ? b : -b;                                  // 상의 x 좌표 (실상: +b, 허상: 음수)
          const ix = real ? b : -(-b) * 1;                          // 허상은 b<0: 상의 x = b (음수)
          const imx = b, imy = hi;
          // 광선 ①
          add([P(ox, y1), P(0, y1)], colr[0]);
          const dx1 = (f), dy1 = -y1;                                // (0,y1) → (f,0)
          if (real) { add([P(0, y1), P(imx, imy)], colr[0]); if (b < FAR) { } } else { const tt = 6 / f; add([P(0, y1), P(Math.min(FAR, 0 + (FAR) * 1), y1 + dy1 / f * FAR)], colr[0]); add([P(0, y1), P(imx, imy)], colr[0], 0.3, 0.014); }
          // 광선 ②
          add([P(ox, oy), P(0, 0)], colr[1]);
          if (real) add([P(0, 0), P(imx, imy)], colr[1]); else { add([P(0, 0), P(FAR, -oy / ox * 0 + (-oy / ox) * FAR)], colr[1]); add([P(0, 0), P(imx, imy)], colr[1], 0.3, 0.014); }
          // 광선 ③
          add([P(ox, oy), P(0, y3a)], colr[2]);
          if (real) add([P(0, y3a), P(imx, imy)], colr[2]); else { add([P(0, y3a), P(FAR, y3a)], colr[2]); add([P(0, y3a), P(imx, imy)], colr[2], 0.3, 0.014); }
          const showI = (real && b <= FAR) || !real;
          imgA.visible = showI; if (showI) { setArrow(imgA, new V3(imx, 0, 0), new V3(imx, hi, 0)); imgMat.opacity = real ? 1 : 0.45; imgA.userData.hd.material = imgMat; }
          scr.visible = real && b <= FAR; scr.position.set(imx, 0.6, 0); lI.show(showI); lI.set(real ? '실상(거꾸로)' : '허상(바로, 확대)'); 
        } else { imgA.visible = false; scr.visible = false; lI.show(false); add([P(ox, oy), P(0, oy)], colr[0]); add([P(0, oy), P(FAR, oy)], colr[0]); add([P(ox, oy), P(0, y3a)], colr[2]); add([P(0, y3a), P(FAR, y3a)], colr[2]); }
        info(near ? '<b>물체가 초점에 있어요.</b><br>굴절한 빛이 나란히 나가서 상이 생기지 않아요.' : real
          ? '<b>실상</b> · 물체 거리 a = ' + a.toFixed(1) + ' → 상 거리 b = ' + (b > 50 ? '아주 멀리' : b.toFixed(1)) + '<br>거꾸로 선 상, 크기 ' + Math.abs(mag).toFixed(1) + '배 (스크린에 맺혀요).<br>1/a + 1/b = 1/f'
          : '<b>허상</b> · 물체가 초점 안쪽(a &lt; f)이에요.<br>스크린에는 맺히지 않고, 렌즈 너머로 바로 선 상이 ' + Math.abs(mag).toFixed(1) + '배로 보여요.');
      }
      controls.range('초점거리 f', 1.5, 3.5, 0.5, st.f, (v) => { st.f = v; build(); }, (v) => v.toFixed(1));
      controls.range('물체 거리 a', 1, 10, 0.5, st.a, (v) => { st.a = v; build(); }, (v) => v.toFixed(1));
      build();
      return { update() {}, sync() {} };
    },
  });
})();
