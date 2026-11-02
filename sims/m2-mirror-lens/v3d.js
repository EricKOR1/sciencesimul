/* m2-mirror-lens · 3D 거울과 렌즈의 상 (광선 다발)
   물체 끝에서 나온 빛이 거울·렌즈를 지나 상의 끝으로 모이거나(실선), 퍼져 나가는 것처럼 보이는 곳(점선)을 입체로 봐요.
   곡면 거울·렌즈는 이상적인 모형(상의 위치는 공식으로 계산하되 숫자는 보여 주지 않음)이에요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const TYPES = [
    { v: 'plane', l: '평면거울' }, { v: 'convexM', l: '볼록 거울' }, { v: 'concaveM', l: '오목 거울' },
    { v: 'convexL', l: '볼록 렌즈' }, { v: 'concaveL', l: '오목 렌즈' },
  ];
  const F = 1.5, A = 1.45, HO = 0.9;

  window.SciSim3D.attach({
    title: '거울과 렌즈 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHN ? 16 : 12, theta: 0.42, phi: 1.2, min: 6, max: 26, target: [1.2, 0.2, 0] },
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3;
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0.05 }, o || {}));
      const sm = () => window.__sim;

      // 광학대 바닥과 광축
      const bench = new THREE.Mesh(new THREE.BoxGeometry(20, 0.1, 5), mat(0x141b30, { roughness: 0.85, metalness: 0 })); bench.position.set(1, -1.9, 0); bench.receiveShadow = true; root.add(bench);
      { const ax = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 20, 6), new THREE.MeshBasicMaterial({ color: 0x8aa0d0, transparent: true, opacity: 0.6 })); ax.rotation.z = Math.PI / 2; ax.position.set(1, 0, 0); root.add(ax); }

      // 물체 (화살표): 밑은 광축 위, 끝에서 빛이 나가요
      function arrowObj(col, op) {
        const g = new THREE.Group(); const m = mat(col, { roughness: 0.35, emissive: col, emissiveIntensity: 0.35, transparent: op < 1, opacity: op, depthWrite: op >= 1 });
        const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 14), m), hd = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.32, 18), m);
        g.add(sh, hd); const base = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), m); g.add(base);
        g.userData = { sh, hd };
        return g;
      }
      function setArrow(g, h) { // h: 부호 있는 높이
        const { sh, hd } = g.userData, s = h >= 0 ? 1 : -1, a = Math.abs(h), hl = Math.min(0.32, a * 0.5);
        sh.scale.y = Math.max(0.001, a - hl); sh.position.y = s * (a - hl) / 2;
        hd.position.y = s * (a - hl / 2); hd.scale.set(1, hl / 0.32, 1); hd.rotation.z = s > 0 ? 0 : Math.PI;
      }
      const obj = arrowObj(0xff5a5f, 1), img = arrowObj(0x7ee0ff, 1); root.add(obj, img);
      const lobj = label('물체', obj, { offset: [0, 1.25, 0] }), limg = label('상', img, { offset: [0, 1.3, 0], color: 'rgba(40,120,170,.9)' });

      // 거울 · 렌즈 부품
      const parts = { plane: new THREE.Group(), convexM: new THREE.Group(), concaveM: new THREE.Group(), convexL: new THREE.Group(), concaveL: new THREE.Group() };
      Object.values(parts).forEach((g) => { g.visible = false; root.add(g); });
      const silver = mat(0xdfe6f2, { metalness: 0.95, roughness: 0.12, side: THREE.DoubleSide });
      const back = mat(0x3a4254, { roughness: 0.6, side: THREE.DoubleSide });
      {
        const pm = new THREE.Mesh(new THREE.CylinderGeometry(A * 1.1, A * 1.1, 0.06, 64), silver); pm.rotation.z = Math.PI / 2; parts.plane.add(pm);
        const bk = new THREE.Mesh(new THREE.CylinderGeometry(A * 1.1, A * 1.1, 0.1, 64), back); bk.rotation.z = Math.PI / 2; bk.position.x = 0.07; parts.plane.add(bk);
      }
      function cap(R, concave) {
        const g = new THREE.Group(), th = Math.asin(Math.min(0.9, A * 1.1 / R));
        const geo = new THREE.SphereGeometry(R, 64, 24, 0, Math.PI * 2, 0, th);
        const m = new THREE.Mesh(geo, silver); m.castShadow = true;
        const m2 = new THREE.Mesh(new THREE.SphereGeometry(R + 0.07, 64, 24, 0, Math.PI * 2, 0, th), back);
        const h = new THREE.Group(); h.add(m, m2);
        if (concave) { h.rotation.z = -Math.PI / 2; h.position.x = -R; } // 오목: 곡률 중심이 앞(왼쪽), 정점은 x=0
        else { h.rotation.z = Math.PI / 2; h.position.x = R; }
        // 정점이 x=0이 되도록 보정 (구의 꼭대기가 +Y → 회전 후 ±x)
        g.add(h); return g;
      }
      parts.concaveM.add(cap(2 * F, true)); parts.convexM.add(cap(2 * F, false));
      function lens(concave) {
        const g = new THREE.Group(), pts = [], N = 24, t0 = concave ? 0.06 : 0.3, t1 = concave ? 0.34 : 0.04;
        const th = (r) => t0 + (t1 - t0) * Math.pow(r / (A * 1.1), 2);
        for (let i = 0; i <= N; i++) { const r = A * 1.1 * i / N; pts.push(new THREE.Vector2(r, -th(r))); }
        for (let i = N; i >= 0; i--) { const r = A * 1.1 * i / N; pts.push(new THREE.Vector2(r, th(r))); }
        const geo = new THREE.LatheGeometry(pts, 64); const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.38, roughness: 0.04, metalness: 0, depthWrite: false, side: THREE.DoubleSide }));
        m.rotation.z = Math.PI / 2; m.renderOrder = 2; g.add(m);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(A * 1.1, 0.04, 8, 64), mat(0x56627e, { metalness: 0.5 })); ring.rotation.y = Math.PI / 2; g.add(ring);
        return g;
      }
      parts.convexL.add(lens(false)); parts.concaveL.add(lens(true));
      // 받침대
      const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.6, 12), mat(0x56627e, { metalness: 0.5 })); stand.position.set(0.0, -1.1, 0); root.add(stand);
      // 초점 표시
      const fm = [-1, 1].map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffd34d })); root.add(m); return m; });
      const lf = [label('초점', fm[0], { offset: [0, -0.35, 0] }), label('초점', fm[1], { offset: [0, -0.35, 0] })];

      // 광선 (가는 원기둥 인스턴스)
      const MAXI = 420;
      const cyl = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 6), new THREE.MeshBasicMaterial({ color: 0xffe066 }), MAXI); cyl.frustumCulled = false; root.add(cyl);
      const dash = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 6), new THREE.MeshBasicMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.75 }), MAXI); dash.frustumCulled = false; root.add(dash);
      const dm = new THREE.Object3D(), up = new V3(0, 1, 0);
      let nC = 0, nD = 0;
      function seg(inst, p, q, r) {
        const d = new V3().subVectors(q, p), len = d.length(); if (len < 1e-4) return;
        const n = inst === cyl ? nC++ : nD++; if (n >= MAXI) return;
        dm.position.copy(p).addScaledVector(d, 0.5); dm.quaternion.setFromUnitVectors(up, d.normalize()); dm.scale.set(r, len, r); dm.updateMatrix(); inst.setMatrixAt(n, dm.matrix);
      }
      function dashed(p, q) { const d = new V3().subVectors(q, p), L = d.length(), k = Math.max(2, Math.floor(L / 0.28)); for (let i = 0; i < k; i += 2) seg(dash, p.clone().addScaledVector(d, i / k), p.clone().addScaledVector(d, Math.min(1, (i + 1) / k)), 0.012); }

      let type = 'convexL', r = 2.2, trueR = null, labsOn = true;
      let cacheTxt = '';
      const ND = 12;
      function compute() {
        const d = r * F, T = new V3(-d, HO, 0);
        let Q = null, real = true, m = 1, farAway = false;
        const isMirror = type === 'plane' || type === 'convexM' || type === 'concaveM';
        if (type === 'plane') { Q = new V3(d, HO, 0); real = false; m = 1; }
        else {
          const f = type === 'convexL' || type === 'concaveM' ? F : -F;   // 모으는 것: +f
          const inv = 1 / f - 1 / d;                                       // 1/v (실제 상은 +)
          if (Math.abs(inv) < 0.03) { farAway = true; }
          const v = farAway ? 99 * Math.sign(f) : 1 / inv;                 // v>0 : 실제로 모이는 쪽
          m = -v / d; real = v > 0;
          const vx = isMirror ? -v : v;                                    // 거울: 실제로 모이면 앞쪽(왼쪽)
          Q = new V3(vx, m * HO, 0);
          if (Math.abs(vx) > 9.5) farAway = true;
        }
        return { d, T, Q, real, m, farAway, isMirror };
      }
      function rebuild() {
        const c = compute(); nC = 0; nD = 0;
        const rays = [];
        for (let i = 0; i < ND; i++) {
          const a = i / ND * Math.PI * 2, P = new V3(0, A * Math.cos(a), A * Math.sin(a));
          seg(cyl, c.T, P, 0.017);
          // 지난 뒤의 방향
          let dir;
          if (c.farAway) { // 초점 근처: 거의 나란히 나가요
            dir = c.isMirror ? new V3(-c.d, -HO, 0).normalize() : new V3(c.d, -HO, 0).normalize();
            seg(cyl, P, P.clone().addScaledVector(dir, 6.5), 0.017); continue;
          }
          const Q = c.Q;
          if (c.real) { dir = new V3().subVectors(Q, P).normalize(); seg(cyl, P, Q.clone().addScaledVector(dir, 1.1), 0.017); }
          else { dir = new V3().subVectors(P, Q).normalize(); seg(cyl, P, P.clone().addScaledVector(dir, 3.6), 0.017); dashed(P, Q); }
        }
        cyl.count = nC; dash.count = nD; cyl.instanceMatrix.needsUpdate = true; dash.instanceMatrix.needsUpdate = true;
        // 물체 · 상 화살표
        obj.position.set(-c.d, 0, 0); setArrow(obj, HO); lobj.show(true);
        const show = !c.farAway;
        img.visible = show; limg.show(show && labsOn);
        if (show) {
          img.position.set(c.Q.x, 0, 0); setArrow(img, c.Q.y);
          img.children.forEach((q) => { if (q.material) { q.material.transparent = !c.real; q.material.opacity = c.real ? 1 : 0.5; q.material.depthWrite = c.real; q.material.needsUpdate = true; } });
        }
        // 초점 점
        const mir = c.isMirror;
        const showF = type !== 'plane';
        fm[0].visible = fm[1].visible = showF; lf[0].show(showF && labsOn); lf[1].show(showF && labsOn);
        if (showF) {
          if (mir) { const fx = type === 'concaveM' ? -F : F; fm[0].position.set(fx, 0, 0); fm[1].visible = false; lf[1].show(false); }
          else { fm[0].position.set(-F, 0, 0); fm[1].position.set(F, 0, 0); }
        }
        // 설명
        const size = Math.abs(c.m) > 1.12 ? '물체보다 <b>커요</b>' : Math.abs(c.m) < 0.89 ? '물체보다 <b>작아요</b>' : '물체와 <b>크기가 같아요</b>';
        const dirw = c.m > 0 ? '<b>바로</b> 서 있어요' : '<b>거꾸로</b> 서 있어요';
        const how = c.real ? '빛이 <b>실제로 모이는 곳</b>(실선)에 상이 보여요.' : '빛이 <b>퍼져 나가서</b>, 거꾸로 연장한 점선이 만나는 곳에 상이 보여요.';
        const nm = TYPES.find((q) => q.v === type).l;
        const txt = c.farAway ? `<b>${nm}</b><br>물체가 초점 가까이에 있어서 빛이 거의 나란히 나가요.<br>상이 아주 멀리 생겨요.` : `<b>${nm}</b> · 상은 ${size}, ${dirw}<br>${how}`;
        info(txt);
      }
      const seg1 = controls.segment('종류', TYPES.map((q) => ({ label: q.l, value: q.v })), type, (v) => { type = v; show(); rebuild(); });
      const rng = controls.range('물체 거리', 0.5, 3.2, 0.02, r, (v) => { r = v; rebuild(); }, (v) => v < 1 ? '가까이' : v < 1.7 ? '조금 멀리' : '멀리');
      controls.button('이름표', () => { labsOn = !labsOn; limg.show(labsOn); lobj.show(labsOn); lf.forEach((l) => l.show(labsOn)); rebuild(); });
      function show() { Object.entries(parts).forEach(([k, g]) => { g.visible = k === type; }); }
      show(); rebuild();
      // 2D 실험의 종류 · 물체 거리를 따라가요 (2D가 바뀔 때만)
      let last2d = '';
      function from2d() {
        const s = sm(); if (!s) return;
        let t = null, rr = null;
        try {
          if (s.scene === 'plane') t = 'plane';
          else if (s.scene === 'mirror') { const c = s.calcMirror(); t = c.conc ? 'concaveM' : 'convexM'; rr = c.d / c.f; }
          else if (s.scene === 'lens') { const c = s.calcLens(); t = c.conv ? 'convexL' : 'concaveL'; rr = c.d / c.f; }
          else if (s.scene === 'rays' || s.scene === 'eye') t = 'plane';
        } catch (e) { return; }
        if (!t) return;
        const key = t + ':' + (rr == null ? '' : rr.toFixed(2));
        if (key === last2d) return; last2d = key;
        type = t; if (rr != null) r = Math.max(0.5, Math.min(3.2, rr)); seg1.set(type); rng.set(r); show(); rebuild();
      }
      let k0 = 0;
      return { sync() { from2d(); }, update(dt, t) { if ((k0++ % 10) === 0) from2d(); fm.forEach((f) => f.scale.setScalar(1 + 0.15 * Math.sin(t * 4))); } };
    },
  });
})();
