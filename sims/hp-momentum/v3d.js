/* hp-momentum · 3D 충돌과 운동량 보존
   마찰이 없는 레일 위에서 두 수레가 부딪쳐요. 위쪽 화살표는 각 수레의 운동량 p = mv, 아래 흰색 화살표는 총 운동량이에요.
   충돌 전후로 총 운동량은 같아요. 탄성 충돌은 운동 에너지도 보존되고, 완전 비탄성 충돌은 한 덩어리가 돼요. 반동은 정지 상태에서 서로 밀어내요. */
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
    title: '충돌과 운동량 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: 11.5 * KD, theta: 0.35, phi: 1.12, min: 4, max: 26, target: [0, 0.6, 0] },
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const { V3, M, mkArrow, setArrow } = tools(THREE);
      const st = { kind: 'el', m1: 2, m2: 1, v1: 3, ph: 'before', t: 0, x1: -3, x2: 2, u1: 3, u2: 0, hold: 0, hit: false };
      const rail = new THREE.Mesh(new THREE.BoxGeometry(11.5, 0.16, 1.5), M(0x94a3b8, { metalness: 0.5, roughness: 0.3 })); rail.position.y = -0.08; rail.receiveShadow = true; root.add(rail);
      const track = new THREE.Mesh(new THREE.BoxGeometry(11.5, 0.03, 0.12), M(0x475569)); track.position.y = 0.01; root.add(track);
      [-5.8, 5.8].forEach((x) => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 1.5), M(0x64748b)); b.position.set(x, 0.17, 0); root.add(b); });
      function cart(col) {
        const g = new THREE.Group(), body = new THREE.Mesh(new THREE.BoxGeometry(1, 0.5, 0.85), M(col, { roughness: 0.3, metalness: 0.2 })); body.position.y = 0.4; body.castShadow = true; g.add(body);
        [-0.32, 0.32].forEach((x) => [-0.46, 0.46].forEach((z) => { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.1, 20), M(0x1f2937)); w.rotation.x = Math.PI / 2; w.position.set(x, 0.13, z); g.add(w); }));
        const wt = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.6), M(0x334155, { metalness: 0.7, roughness: 0.3 })); wt.position.y = 0.75; g.add(wt);
        g.userData = { body, wt }; root.add(g); return g;
      }
      const c1 = cart(0x3b82f6), c2 = cart(0xf59e0b);
      const p1 = mkArrow(0x60a5fa, 0.055), p2 = mkArrow(0xfbbf24, 0.055), pt = mkArrow(0xffffff, 0.06); root.add(p1, p2, pt);
      const l1 = label('수레 1', c1, { color: '#2f6df6', size: 12, offset: [0, 1.5, 0] }), l2 = label('수레 2', c2, { color: '#d97706', size: 12, offset: [0, 1.5, 0] });
      const lp1 = label('p₁', p1, { color: '#2f6df6', size: 12 }), lp2 = label('p₂', p2, { color: '#d97706', size: 12 }), lpt = label('총 운동량', [0, 0.2, 1.4], { color: '#475569', size: 12 });
      const lb = label('충돌 전', [-4.5, 1.7, 0], { color: '#475569', size: 13 });
      const SC = 0.2, w = (m) => 0.8 + 0.12 * m;
      function setup() {
        st.x1 = -3.2; st.hold = 0; st.hit = false; st.phase = 'before'; st.t = 0;
        if (st.kind === 'rc') { st.x1 = -0.5 - 0.2; st.x2 = 0.5 + 0.2; st.u1 = 0; st.u2 = 0; }
        else { st.x2 = 2.0; st.u1 = st.v1; st.u2 = 0; }
        [c1, c2].forEach((c, i) => { const m = i ? st.m2 : st.m1, s = w(m) ; c.userData.body.scale.set(s, 1, 1); c.userData.wt.scale.set(0.7 + 0.18 * m, 0.7 + 0.2 * m, 0.7 + 0.18 * m); });
        c1.userData.body.material.color.setHex(0x3b82f6); c2.userData.body.material.color.setHex(0xf59e0b);
        lb.set(st.kind === 'rc' ? '출발 (정지)' : '충돌 전'); st.pre = st.kind === 'rc' ? 0 : st.m1 * st.v1; txt();
        const k = st.kind;
        info(k === 'el' ? '<b>탄성 충돌</b> · 총 운동량도 운동 에너지도 보존돼요.<br>질량 ' + st.m1 + ' kg · ' + st.m2 + ' kg' : k === 'in' ? '<b>완전 비탄성 충돌</b> · 한 덩어리가 되어 같은 속도로 가요.<br>총 운동량은 보존되고, 운동 에너지 일부는 열 등으로 바뀌어요.' : '<b>반동</b> · 처음 총 운동량은 0이에요.<br>서로 반대로 밀려나, 가벼운 수레가 더 빨라요 (m₁v₁ = −m₂v₂).');
      }
      function txt() {}
      let ctlr = {};
      controls.segment('충돌', [{ value: 'el', label: '🎱 탄성' }, { value: 'in', label: '🧲 비탄성' }, { value: 'rc', label: '💥 반동' }], st.kind, (v) => { st.kind = v; setup(); });
      controls.range('수레 1 질량', 1, 4, 1, st.m1, (v) => { st.m1 = v; setup(); }, (v) => v + ' kg');
      controls.range('수레 2 질량', 1, 4, 1, st.m2, (v) => { st.m2 = v; setup(); }, (v) => v + ' kg');
      controls.button('▶ 다시 하기', () => setup());
      setup();
      const tmp = new V3();
      return {
        update(dt) {
          const h1 = w(st.m1) / 2, h2 = w(st.m2) / 2;
          if (st.kind === 'rc') {
            if (st.t === 0 && !st.hit) { st.hold += dt; if (st.hold > 1.0) { st.hit = true; st.u1 = -2.4 * st.m2 / (st.m1 + st.m2) * 1.6 * 1; st.u2 = 2.4 * st.m1 / (st.m1 + st.m2) * 1.6; lb.set('밀려난 뒤'); } }
            else if (st.hit) { st.hold += dt; if (st.x1 < -5.2 || st.x2 > 5.2) { st.u1 = st.u2 = 0; if (st.hold > 6) setup(); } }
          } else {
            if (!st.hit && st.x2 - st.x1 <= h1 + h2) {
              st.hit = true; st.hold = 0; const m1 = st.m1, m2 = st.m2, a = st.u1, b = st.u2; lb.set('충돌 후');
              if (st.kind === 'el') { st.u1 = ((m1 - m2) * a + 2 * m2 * b) / (m1 + m2); st.u2 = ((m2 - m1) * b + 2 * m1 * a) / (m1 + m2); }
              else { st.u1 = st.u2 = (m1 * a + m2 * b) / (m1 + m2); }
            }
            if (st.hit) { st.hold += dt; if (st.hold > 3.8) setup(); }
          }
          st.x1 += st.u1 * dt * 0.9; st.x2 += st.u2 * dt * 0.9;
          if (st.kind !== 'rc') { if (st.hit && st.kind === 'in') { /* 붙어서 이동 */ const d = h1 + h2; st.x2 = st.x1 + d; } }
          // 벽 제한
          st.x1 = clamp(st.x1, -5.3 + h1, 5.3 - h1); st.x2 = clamp(st.x2, -5.3 + h2, 5.3 - h2);
          c1.position.set(st.x1, 0, 0); c2.position.set(st.x2, 0, 0);
          const P1 = st.m1 * st.u1, P2 = st.m2 * st.u2, tot = P1 + P2, f = SC * 0.55;
          setArrow(p1, tmp.set(st.x1, 1.55, 0).clone(), new V3(st.x1 + P1 * f, 1.55, 0)); setArrow(p2, new V3(st.x2, 1.95, 0), new V3(st.x2 + P2 * f, 1.95, 0));
          setArrow(pt, new V3(-1, 0.2, 1.4), new V3(-1 + tot * f, 0.2, 1.4));
          lp1.obj = [st.x1 + P1 * f * 0.5, 1.55, 0]; lp1.off = [0, 0.3, 0]; lp2.obj = [st.x2 + P2 * f * 0.5, 1.95, 0]; lp2.off = [0, 0.3, 0];
          lp1.show(Math.abs(P1) > 0.1); lp2.show(Math.abs(P2) > 0.1); lpt.obj = [-1 + tot * f * 0.5, 0.2, 1.4]; lpt.off = [0, 0.35, 0]; lpt.set('총 운동량 ' + tot.toFixed(1)); lpt.show(Math.abs(tot) > 0.1);
          if (st.kind === 'rc') lpt.set('총 운동량 0');
          if (st.kind === 'rc') lpt.show(true), lpt.obj = [-1, 0.2, 1.4];
        },
        sync() {},
      };
    },
  });
})();
