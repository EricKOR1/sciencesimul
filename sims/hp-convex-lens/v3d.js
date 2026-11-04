/* hp-convex-lens · 3D 볼록렌즈와 상
   2D 실험(window.__sim)의 장면을 그대로 입체로 보여 줘요: 🔺 굴절과 렌즈(평행 광선 · 프리즘 조각/곡면 렌즈) · 🧭 광선 추적(세 주광선) · 🔬 상 실험(광학대 · 스크린) · 🏭 노광 공정(마스크 → 렌즈 → 웨이퍼).
   물체 거리·렌즈 곡률·스크린 위치는 옆 조작판이 정하고 3D는 따라가요. 결상 공식은 쓰지 않고, 광선의 작도와 직접 측정으로만 상을 찾아요.
   🏭 노광 공정은 웨이퍼 단면(6단계)도 입체로 봐요. (광학대 그림은 2D처럼 세로 방향을 2.4배로 늘려 그렸어요) */
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
  const KDX = PHN ? 1.45 : 1;
  const KY = 2.4, UX = 0.2, UY = UX * KY;
  const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1), f2 = (v) => (Math.round(v * 100) / 100).toFixed(2);
  window.SciSim3D.attach({
    title: '볼록렌즈와 상 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대 · 값은 옆 조작판에서 바꿔요',
    camera: { dist: 16 * KD, theta: 0.0, phi: 1.2, min: 4, max: 40, target: [0, 0, 0] },
    autoRotate: 0,
    levels: [0, 1, 2, 3],
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      const { V3, M, mkArrow, setArrow, tube } = tools(THREE);
      const sim = () => ctx.lesson();
      const P = (x, y, z) => new V3(x * UX, y * UY, z || 0);
      const gT = new THREE.Group(), gB = new THREE.Group(), gR = new THREE.Group(); root.add(gT, gB, gR);
      const benchBase = (g, w) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.14, 1.6), M(0x334155, { metalness: 0.4, roughness: 0.5 })); b.position.set(0, -4.1, 0); b.receiveShadow = true; g.add(b); const ax = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, w, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45 })); ax.rotation.z = Math.PI / 2; g.add(ax); return b; };
      const lensMesh = (g, halfCm, col) => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), new THREE.MeshStandardMaterial({ color: col || 0x9fd2ff, roughness: 0.05, transparent: true, opacity: 0.42, depthWrite: false })); m.scale.set(0.25, halfCm * UY, halfCm * UY / 1.2); g.add(m); const r = new THREE.Mesh(new THREE.TorusGeometry(1, 0.05, 10, 56), M(0x475569, { metalness: 0.6 })); r.scale.set(halfCm * UY / 1.2, halfCm * UY, 1); r.rotation.y = Math.PI / 2; r.scale.set(halfCm * UY / 1.2, halfCm * UY, 1); g.add(r); return m; };
      const tubeLine = (g, pts, col, op, thin, dashed) => { if (pts.length < 2) return null; const t = tube(pts, thin || 0.022, col, { basic: true, op: op || 0.95 }); g.add(t); return t; };
      /* ================= 🧭 광선 추적 ================= */
      benchBase(gT, 22);
      const lensT = lensMesh(gT, 14.6);
      const objT = mkArrow(0xffd447, 0.07), imgT = mkArrow(0x5ef2c6, 0.07); gT.add(objT, imgT);
      const fm = [-20, -10, 10, 20].map((c) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), M(0xffd447, { emissive: 0x7a6200 })); m.position.set(c * UX, 0, 0); gT.add(m); return m; });
      const fl = [[-20, '2F'], [-10, 'F'], [10, 'F'], [20, '2F']].map(([c, nm]) => label(nm, [c * UX, 0, 0], { color: '#7a6200', size: 12 }));
      const lObjT = label('물체', objT, { color: '#b45309', size: 12 }), lImgT = label('', imgT, { color: '#14a058', size: 12 }), lLensT = label('볼록렌즈 (광선은 가운데 면에서 꺾어 그려요)', [0, 0, 0], { color: '#0e7490', size: 12 });
      const rayG = new THREE.Group(); gT.add(rayG); let rKey = '';
      const demoT = { p: 0, on: false };
      const zoneName = (a, f) => (a > 2 * f + 1e-6 ? '2f 밖' : Math.abs(a - 2 * f) < 1e-6 ? '2f 위' : a > f + 1e-6 ? 'f와 2f 사이' : Math.abs(a - f) < 1e-6 ? '초점(f) 위' : 'f 안쪽');
      function trace(A, S) {
        const t = S.tr, f = A.F_TR, H = 2.5, a = demoT.on ? 40 - 35 * (1 - Math.abs(2 * demoT.p - 1)) : t.a;
        const rays = demoT.on ? { 1: true, 2: true, 3: true } : t.rays, showImg = demoT.on || t.showImg === true || t.found;
        const key = [a.toFixed(2), rays[1], rays[2], rays[3]].join('|');
        if (key !== rKey) {
          rKey = key; while (rayG.children.length) { const c = rayG.children[0]; rayG.remove(c); c.geometry.dispose(); }
          const pr = A.principal(a);
          pr.forEach((r) => { if (!rays[r.k]) return; const col = parseInt(r.color.slice(1), 16);
            r.solid.forEach((p) => tubeLine(rayG, p.map((q) => P(q[0], q[1])), col, 0.95, 0.024));
            r.dashed.forEach((p) => tubeLine(rayG, p.map((q) => P(q[0], q[1])), col, 0.5, 0.014)); });
        }
        setArrow(objT, P(-a, 0), P(-a, H)); lObjT.off = [0, 0.4, 0];
        const im = Math.abs(a - f) < 1e-6 ? null : { b: a * f / (a - f) }, ix = im ? im.b : 0, iy = im ? -H * im.b / a : 0, real = a > f;
        const inRange = im && Math.abs(ix) < 60;
        imgT.visible = !!(showImg && inRange); lImgT.show(imgT.visible);
        if (imgT.visible) { setArrow(imgT, P(ix, 0), P(ix, iy)); imgT.children.forEach((c) => { c.material = c.material.clone(); c.material.transparent = true; c.material.opacity = real ? 1 : 0.5; }); lImgT.set(real ? '실상' : '허상'); lImgT.el.style.background = real ? '#14a058' : '#7c5cff'; lImgT.off = [0, real ? -0.6 : 0.6, 0]; }
        const z = zoneName(a, f);
        let t2 = '<b>🧭 광선 추적</b> · 물체 거리 a = ' + (demoT.on ? a.toFixed(1) : a) + ' cm (f = ' + f.toFixed(0) + ' cm, 2f = ' + (2 * f).toFixed(0) + ' cm) · <b>' + z + '</b><br>';
        if (!im) t2 += '물체가 초점에 있으면 렌즈를 지난 광선들이 서로 평행해서 한 점에서 만나지 않아요. 그래서 상이 맺히지 않아요.';
        else if (showImg) t2 += '작도로 찾은 상: 렌즈 ' + (real ? '오른쪽' : '왼쪽') + ' ' + Math.abs(ix).toFixed(1) + ' cm, 물체의 ' + (Math.abs(ix) / a).toFixed(2) + '배, ' + (real ? '거꾸로 선 <b>실상</b> (스크린에 맺혀요)' : '바로 선 <b>허상</b> (스크린에 맺히지 않아요)');
        else t2 += '세 주광선: ① 광축에 평행하게 들어가면 렌즈를 지나 초점을 지나요 ② 렌즈 중심을 지나면 그대로 직진해요 ③ 앞쪽 초점을 지나 들어가면 렌즈를 지나 광축에 평행하게 나가요.';
        info(t2 + '<br><span style="opacity:.8">물체 거리 · 보일 광선은 옆 조작판에서 골라요.</span>');
      }
      /* ================= 🔬 상 실험 · 🏭 노광 공정 (광학대) ================= */
      benchBase(gB, 30);
      const lensB = lensMesh(gB, 4);
      const objB = mkArrow(0xffd447, 0.07); gB.add(objB);
      const land = new THREE.Group(); gB.add(land);
      { const sky = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.4, 2.2), M(0x7ec4ff, { emissive: 0x2a5a88 })); land.add(sky); const hill = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.1, 4), M(0x4caf6a)); hill.position.set(0.1, -0.7, 0); hill.rotation.y = 0.7; land.add(hill); const sun = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 10), M(0xffe28a, { emissive: 0xffc800 })); sun.position.set(0.1, 0.7, 0.5); land.add(sun); }
      const scrB = new THREE.Mesh(new THREE.BoxGeometry(0.06, 10 * UY * 0.4, 3.2), M(0xf1f5f9, { roughness: 0.95 })); gB.add(scrB);
      const cvS = document.createElement('canvas'); cvS.width = 96; cvS.height = 192; const cs = cvS.getContext('2d'); const texS = new THREE.CanvasTexture(cvS);
      const faceS = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 10 * UY * 0.4 - 0.1), new THREE.MeshBasicMaterial({ map: texS, transparent: true })); faceS.rotation.y = Math.PI / 2; gB.add(faceS);
      const card = new THREE.Mesh(new THREE.BoxGeometry(0.06, 4 * UY, 4 * UY / 1.2 * 1.05), M(0x1f2937)); gB.add(card);
      const rayB = new THREE.Group(); gB.add(rayB);
      const lObjB = label('물체', objB, { color: '#b45309', size: 12 }), lLensB = label('볼록렌즈', lensB, { color: '#0e7490', size: 12 }), lScrB = label('스크린', scrB, { color: '#475569', size: 12 }), lSharp = label('선명해요!', scrB, { color: '#14a058', size: 13 }), lCard = label('카드', card, { color: '#1f2937', size: 12 });
      const dimA = label('', [0, 0, 0], { color: '#b45309', size: 12 }), dimB = label('', [0, 0, 0], { color: '#0e7490', size: 12 });
      let bKey = '';
      function drawScreen(blurCm, alpha, mH, litho, far) {
        const w = 96, h = 192, pxc = 24;   // 세로 1 cm = 24 px (화면 높이 8 cm)
        cs.clearRect(0, 0, w, h); cs.save(); cs.globalAlpha = alpha; cs.shadowColor = litho ? 'rgba(120,255,200,1)' : 'rgba(255,230,140,1)';
        const bl = Math.min(40, blurCm * pxc * 0.7); cs.shadowBlur = bl; cs.fillStyle = litho ? '#7dffc9' : '#ffe9a0';
        cs.translate(-1000, 0); cs.shadowOffsetX = 1000;
        if (far) { cs.fillStyle = '#e8c870'; cs.fillRect(w / 2 - 6 + 1000, h / 2 - 8, 12, 14); }
        else { const top = h / 2, ht = mH * pxc; const y0 = top, y1 = top + ht; cs.beginPath(); cs.moveTo(w / 2 + 1000, y0); cs.lineTo(w / 2 + 1000, y1); cs.lineWidth = 6; cs.strokeStyle = cs.fillStyle; cs.stroke(); cs.beginPath(); cs.moveTo(w / 2 - 10 + 1000, y1 - 12); cs.lineTo(w / 2 + 1000, y1 + 4); cs.lineTo(w / 2 + 10 + 1000, y1 - 12); cs.closePath(); cs.fill(); }
        cs.restore(); texS.needsUpdate = true;
      }
      function benchScene(A, S, litho) {
        let cfg, st, sx, ar, namesObj = '물체', H;
        if (litho) { const g = A.benchGeom(A.A_LITHO, A.F_LITHO, false, 6), blur = 8 * Math.abs(S.lt.w - g.b) / g.b; cfg = { a: A.A_LITHO, far: false, cover: false, sx: S.lt.w, H: 6, f: A.F_LITHO }; st = { g, blur, sharp: blur <= 0.25 }; }
        else { st = A.benchState(); cfg = st.cfg; }
        H = cfg.H; sx = cfg.sx; const g = st.g, a = cfg.a, far = cfg.far, D = 8;
        const showA = !far; const ox = -(far ? 40 : a);
        objB.visible = showA; land.visible = far && !litho; if (showA) { setArrow(objB, P(ox, 0), P(ox, H)); lObjB.set(litho ? '마스크' : '물체'); lObjB.off = [0, 0.4, 0]; lObjB.show(true); } else lObjB.show(false);
        if (far) { land.position.set(-11 * 1, 0, 0); }
        scrB.position.set(sx * UX, 0, 0); faceS.position.set(sx * UX - 0.05, 0, 0); lScrB.set(litho ? '웨이퍼' : '스크린'); lScrB.off = [0, 1.7, 0];
        lensB.scale.set(0.25, 4 * UY, 4 * UY / 1.2); lLensB.set(litho ? '축소 투영 렌즈' : '볼록렌즈'); lLensB.off = [0, 1.8, 0];
        card.visible = !!cfg.cover; lCard.show(!!cfg.cover); if (cfg.cover) { card.position.set(0.1, -4 * UY / 2, 0); lCard.off = [0, -0.2, 0]; }
        const bl = st.blur, alpha = (cfg.cover ? 0.5 : 1) * clamp(1 - bl * 0.25, 0.35, 1);
        drawScreen(bl, alpha, far ? 0.6 : Math.abs(g.yi), litho, far); faceS.visible = true;
        // 광선: 물체 끝 → 렌즈(가운데 · 위 · 아래 가장자리) → 상 → 스크린
        const key = [a.toFixed(1), sx.toFixed(1), far, cfg.cover, litho].join('|');
        if (key !== bKey) {
          bKey = key; while (rayB.children.length) { const c = rayB.children[0]; rayB.remove(c); c.geometry.dispose(); }
          const bx = g.b, by = far ? 0 : g.yi, col = litho ? 0x7dffc9 : 0xffe28a;
          const edges = cfg.cover ? [D / 2] : [D / 2, -D / 2, 0];
          edges.forEach((yl) => {
            const start = far ? P(ox, yl) : P(ox, H);
            const endx = Math.max(sx, bx) + 0, slope = (by - yl) / bx;
            const yEnd = yl + slope * (sx), yI = by;
            tubeLine(rayB, [start, P(0, yl), P(sx, yEnd)], col, yl === 0 ? 0.55 : 0.9, 0.018); void endx; void yI;
            if (sx < bx) tubeLine(rayB, [P(sx, yEnd), P(bx, by)], col, 0.3, 0.012);
          });
        }
        dimA.show(showA); dimB.show(true);
        dimA.obj = [ox / 2 * UX * 1 - 0, -4.4, 0.9]; dimA.obj = [(ox / 2) * UX, -4.1, 0.9]; dimA.set(litho ? '마스크~렌즈 ' + a.toFixed(0) + ' cm' : 'a = ' + a.toFixed(1) + ' cm'); dimB.obj = [(sx / 2) * UX, -4.1, 0.9]; dimB.set(litho ? '렌즈~웨이퍼 ' + sx.toFixed(1) + ' cm' : 'b = ' + sx.toFixed(1) + ' cm');
        lSharp.show(st.sharp); lSharp.off = [0, 2.3, 0];
        if (!litho) info('<b>🔬 상 실험 · 광학대</b><br>물체 거리 a = ' + (far ? '∞ (먼 풍경)' : a.toFixed(1) + ' cm') + ' · 스크린 거리 b = ' + sx.toFixed(1) + ' cm' + (far ? '' : ' · 상의 크기 = 물체의 ' + f2(g.m) + '배') + '<br>' + (st.sharp ? '<b>상이 선명해요!</b> 📏 기록하기를 눌러요.' : '스크린을 움직여 상이 선명해지는 곳을 찾아요. (번짐 ' + f1(bl) + ' cm)') + (cfg.cover ? '<br>🃏 렌즈의 아래쪽 절반을 가렸어요: 상은 어떻게 될까요?' : '') + '<br><span style="opacity:.8">초점거리 f는 직접 재서 구해요 · 물체 거리와 스크린은 옆 조작판에서 바꿔요.</span>');
        else info('<b>🏭 노광: 마스크 → 렌즈 → 웨이퍼</b><br>마스크는 렌즈에서 ' + A.A_LITHO.toFixed(0) + ' cm · 웨이퍼 위치 ' + sx.toFixed(1) + ' cm' + (st.sharp ? ' → <b>초점이 맞아요</b> (선명)' : ' → 초점이 맞지 않아요 (번짐 ' + f1(bl) + ' cm)') + '<br>빛의 파장 ' + ({ '436': '436 nm', '365': '365 nm 자외선', '193': '193 nm 심자외선', '13.5': '13.5 nm 극자외선' }[S.lt.wl]) + ' · 파장이 짧을수록 더 가는 선까지 인쇄돼요.<br><span style="opacity:.8">웨이퍼 위치와 파장은 옆 조작판에서 바꿔요.</span>');
      }
      /* ================= 🔺 굴절과 렌즈 (평행 광선, 1 cm = 0.45칸) ================= */
      const UR = 0.45, flagG = new THREE.Group(); gR.add(flagG);
      { const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 8), M(0xe2464b)); pole.position.y = 0.5; flagG.add(pole); const cl = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.35, 0.03), M(0xe2464b, { emissive: 0x7f1d1d })); cl.position.set(0.3, 1.0, 0); flagG.add(cl); }
      const axisR = new THREE.Mesh(new THREE.BoxGeometry(16, 0.02, 0.02), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 })); axisR.position.set(4, 0, 0); gR.add(axisR);
      const lensR = new THREE.Group(); gR.add(lensR); const rayR = new THREE.Group(); gR.add(rayR); let rrKey = '';
      const lFlag = label('초점 표지', flagG, { color: '#e2464b', size: 12 }), lLensR = label('', lensR, { color: '#0e7490', size: 12 });
      function refract(A, S) {
        const rf = S.rf, view = rf.view, R = rf.R;
        const key = view + '|' + R;
        if (key !== rrKey) {
          rrKey = key;
          while (lensR.children.length) { const c = lensR.children[0]; lensR.remove(c); c.geometry.dispose(); }
          while (rayR.children.length) { const c = rayR.children[0]; rayR.remove(c); c.geometry.dispose(); }
          const polys = A.lensPolys(R, view);
          polys.forEach((poly) => { const sh = new THREE.Shape(poly.map((q) => new THREE.Vector2(q[0] * UR, q[1] * UR))); const g = new THREE.ExtrudeGeometry(sh, { depth: 1.6, bevelEnabled: false }); g.translate(0, 0, -0.8); const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: view === 'prism' ? 0x9ad0ff : 0x9fd2ff, roughness: 0.08, transparent: true, opacity: 0.5, depthWrite: false })); lensR.add(m); const eg = new THREE.EdgesGeometry(g); lensR.add(new THREE.LineSegments(eg, new THREE.LineBasicMaterial({ color: 0xcfe8ff }))); });
          A.rayHeights(R, view).forEach((y0) => { const r = A.traceRay(y0, polys); const pts = r.pts.map((q) => new V3(q[0] * UR, q[1] * UR, 0)); tubeLine(rayR, pts, 0xffe066, 0.95, 0.03); });
        }
        flagG.position.set(rf.flag * UR, 0, 0); lFlag.off = [0.3, 1.5, 0];
        lLensR.obj = [0, 3.2, 0]; lLensR.set(view === 'prism' ? '프리즘 조각' : '곡면 렌즈');
        info('<b>🔺 ' + (view === 'prism' ? '프리즘 조각' : '곡면 렌즈') + '에서 빛이 꺾여요</b> · 곡률 반지름 R = ' + R + ' cm<br>' + (view === 'prism' ? '평행 광선이 각 조각에서 꺾이는 정도가 달라요. 가장자리 조각일수록 더 많이 꺾여요.' : '평행 광선이 렌즈를 지나며 한 점으로 모여요. 깃발(초점 표지)을 광선이 모이는 곳에 놓아 보세요. 렌즈를 더 볼록하게(R↓) 하면 모이는 곳이 가까워져요.') + '<br><span style="opacity:.8">보기 · R · 깃발은 옆 조작판에서 바꿔요.</span>');
      }
      /* ================= 장면 · ▶ 재생 ================= */
      let plT = null;
      plT = controls.player({ duration: 12, loop: true, autoplay: false, label: '물체 옮기기', phases: [[0, '물체를 렌즈에 가까이 (2f 밖 → f 안쪽)'], [0.5, '물체를 멀리 (f 안쪽 → 2f 밖)']], onFrame(p) { demoT.p = p; demoT.on = p > 0 || !!(plT && plT.playing); } });
      plT.row = ctx.renderer.domElement.parentNode.parentNode.querySelector('.v3-player');

      /* ================= 🏭 노광 공정 순서 (웨이퍼 단면 6장 · 맞게 고르면 단면이 차례로 나타나요) ================= */
      const gW = new THREE.Group(); root.add(gW); gW.visible = false;
      const GAPS = [[0.22, 0.38], [0.62, 0.78]], WW = 2.2, labW = [];
      function mkWafer(stage) {
        const g = new THREE.Group(), box = (x0, x1, y0, h, col, o) => { const m = new THREE.Mesh(new THREE.BoxGeometry((x1 - x0) * WW, h, 0.9), M(col, o || { roughness: 0.6 })); m.position.set(-WW / 2 + (x0 + x1) / 2 * WW, y0 + h / 2, 0); m.castShadow = true; g.add(m); return m; };
        const hs = 0.3, ho = 0.12, hr = 0.2;
        const segs = (excl) => { const out = []; let px = 0; GAPS.forEach(([a, b]) => { out.push([px, a]); px = b; }); out.push([px, 1]); return excl ? out : [[0, 1]]; };
        box(0, 1, 0, hs, 0x8a95a8, { roughness: 0.5, metalness: 0.3 });
        segs(stage >= 4).forEach(([a, b]) => box(a, b, hs, ho, 0x6aa8e8, { roughness: 0.3 }));
        if (stage >= 1 && stage <= 4) {
          segs(stage >= 3).forEach(([a, b]) => box(a, b, hs + ho, hr, 0xf06292, { roughness: 0.5 }));
          if (stage === 2) GAPS.forEach(([a, b]) => box(a, b, hs + ho, hr, 0xffe28a, { roughness: 0.5, emissive: 0x6b5a10 }));
        }
        if (stage === 2) {
          segs(true).forEach(([a, b]) => box(a, b, hs + ho + hr + 0.4, 0.07, 0x4b5878, { roughness: 0.5, metalness: 0.4 }));
          GAPS.forEach(([a, b]) => [0.25, 0.75].forEach((q) => { const ar = mkArrow(0x7bdcff, 0.025); g.add(ar); const x = -WW / 2 + (a + (b - a) * q) * WW; setArrow(ar, new V3(x, hs + ho + hr + 1.1, 0), new V3(x, hs + ho + hr + 0.06, 0)); }));
        }
        if (stage === 0) for (let k = 0; k < 4; k++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), M(0xffffff)); d.position.set(-WW / 2 + (0.12 + k * 0.25) * WW, hs + ho + 0.06, (k % 2 - 0.5) * 0.4); g.add(d); }
        return g;
      }
      const cards = [];
      for (let i = 0; i < 6; i++) {
        const c = new THREE.Group(); gW.add(c);
        const tile = new THREE.Mesh(new THREE.BoxGeometry(3.1, 2.5, 0.16), M(0xb4c0d6, { roughness: 0.8 })); tile.position.set(0, 1.2, -0.7); c.add(tile);
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), M(0xb9c3d6)); dot.position.set(-1.25, 2.2, -0.56); c.add(dot);
        const wf = mkWafer(i); wf.position.set(0, 0.25, -0.1); wf.userData.s = 1.15; c.add(wf);
        const lb = label('', [0, 0, 0], { color: '#3867f4', size: 12 }); labW.push(lb);
        cards.push({ c, dot, wf, lb });
      }
      const lWt = label('', [0, 0, 0], { color: '#26324a', size: 12 }); labW.push(lWt);
      const demoW = { p: 0, on: false };
      let pW = null;
      function flowScene(A, S) {
        const l = S.lt, cols = PHN ? 2 : 3, rows = PHN ? 3 : 2, GX = 3.5, GY = 3.0;
        const ordPlay = demoW.on && l.ordOK ? demoW.p * 6.5 : l.ordPlay, reveal = l.ordOK;
        cards.forEach((q, i) => {
          const col = i % cols, row = Math.floor(i / cols);
          q.c.position.set((col - (cols - 1) / 2) * GX, ((rows - 1 - row) - (rows - 1) / 2) * GY - 0.4, 0);
          const k = clamp((reveal ? ordPlay : 0) - i * 0.5, 0, 1), ez = 1 - Math.pow(1 - k, 3);
          q.wf.visible = reveal && k > 0.01; q.wf.scale.set(1.15, Math.max(0.01, ez) * 1.15, 1.15);
          const picked = l.order[i];
          q.dot.material.color.setHex(reveal ? 0x14a058 : picked != null ? 0x3867f4 : 0xb9c3d6);
          const nm = reveal ? A.ORDER[i] : picked != null ? A.ORDER[picked] : '';
          q.lb.show(true); q.lb.set((i + 1) + '. ' + (nm || ((i + 1) + '번째'))); q.lb.obj = q.c; q.lb.off = [0, 2.95, 0];
          q.lb.el.style.background = reveal ? '#14a058' : picked != null ? '#3867f4' : '#98a2b3'; q.lb.el.style.opacity = reveal ? Math.max(0.35, ez) : 1;
        });
        const cur = reveal ? Math.min(5, Math.floor(ordPlay / 0.5)) : -1;
        lWt.show(false);
        info('<b>🏭 노광 공정 순서</b> · 웨이퍼 단면이 단계마다 어떻게 바뀌는지 보여 줘요<br>' + (reveal ? (cur >= 0 && ordPlay < 6.5 ? A.STAGE_TXT[Math.min(5, Math.max(0, Math.floor((ordPlay - 0.25) / 0.5)))] + '<br>' : '') + '노광에서 마스크의 큰 회로 무늬를 투영 렌즈로 줄여 감광제에 맺고, 현상·식각을 거치면 웨이퍼 위에 아주 작은 회로가 만들어져요. 이 과정을 층마다 반복해요.' : '고른 카드 <b>' + l.order.length + ' / 6</b> · 옆 조작판의 카드를 순서대로 눌러 보세요.<br>맞게 고르면 단계마다 웨이퍼 단면이 나타나요.'));
      }
      pW = controls.player({ duration: 9, loop: true, autoplay: false, label: '공정 다시 보기', phases: [[0, '세척'], [0.08, '감광제 도포'], [0.16, '노광'], [0.24, '현상'], [0.32, '식각'], [0.4, '감광제 제거'], [0.55, '완성']], onFrame(p) { demoW.p = p; demoW.on = p > 0 || !!(pW && pW.playing); } });
      { const rr = [...ctx.renderer.domElement.parentNode.parentNode.querySelectorAll('.v3-player')]; plT.row = rr[0]; pW.row = rr[1]; }
      let cur = '';
      const labsT = [lObjT, lImgT, lLensT].concat(fl), labsB = [lObjB, lLensB, lScrB, lSharp, lCard, dimA, dimB], labsR = [lFlag, lLensR];
      function setMode(S) {
        const mode = S.mode === 'litho' ? (S.lt.sub === 'proj' ? 'litho' : 'flow') : S.mode;
        if (mode === cur) return; cur = mode;
        gT.visible = mode === 'trace'; gB.visible = mode === 'bench' || mode === 'litho'; gR.visible = mode === 'refract'; gW.visible = mode === 'flow'; labW.forEach((l) => l.show(mode === 'flow'));
        pW.row.style.display = mode === 'flow' ? '' : 'none'; if (mode !== 'flow') { pW.pause(); pW.set(0); }
        labsT.forEach((l) => l.show(mode === 'trace')); labsB.forEach((l) => l.show(mode === 'bench' || mode === 'litho')); labsR.forEach((l) => l.show(mode === 'refract'));
        lLensT.show(false);
        plT.row.style.display = mode === 'trace' ? '' : 'none'; if (mode !== 'trace') { plT.pause(); plT.set(0); }
        bKey = ''; rKey = ''; rrKey = '';
        if (mode === 'trace') Object.assign(orbit, { tx: 0, ty: 0, tz: 0, phi: 1.25, theta: 0.0, dist: 17 * KD });
        else if (mode === 'bench') Object.assign(orbit, { tx: 1.5, ty: -0.5, tz: 0, phi: 1.2, theta: 0.15, dist: 15 * KD });
        else if (mode === 'litho') Object.assign(orbit, { tx: 0.5, ty: -0.5, tz: 0, phi: 1.2, theta: 0.15, dist: 17 * KD });
        else if (mode === 'refract') Object.assign(orbit, { tx: 3, ty: 0, tz: 0, phi: 1.25, theta: 0.0, dist: 13 * KD });
        else if (mode === 'flow') Object.assign(orbit, { tx: 0, ty: 1.2, tz: 0, phi: 1.35, theta: 0.0, dist: (PHN ? 15 : 14) * KD });
      }
      return {
        update() {
          const A = sim(); if (!A || !A.S) return; const S = A.S;
          setMode(S);
          if (cur === 'trace') { if (!plT.playing && plT.p === 0) demoT.on = false; trace(A, S); }
          else if (cur === 'bench') benchScene(A, S, false);
          else if (cur === 'litho') benchScene(A, S, true);
          else if (cur === 'refract') refract(A, S);
          else { if (!pW.playing && pW.p === 0) demoW.on = false; if (!S.lt.ordOK && pW.playing) pW.pause(); flowScene(A, S); }
        },
        sync() {},
      };
    },
  });
})();
