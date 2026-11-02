/* hm-projectile · 3D 포물선 운동
   수평 방향은 등속(그림자 간격이 일정), 연직 방향은 중력 가속도 g(기둥 위 그림자는 위로 던진 공과 같음).
   1 m = 0.1 세계 단위. 순간 속도는 vx(파랑)와 vy(빨강)로 나눠 화살표로 보여 줘요. */
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
  const G = 9.8, K = 0.15;
  window.SciSim3D.attach({
    title: '포물선 운동 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: 11.5 * KD, theta: 0.4, phi: 1.3, min: 4, max: 26, target: [0, 1.5, 0] },
    autoRotate: 0.12,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const { V3, M, mkArrow, setArrow, tube, grid } = tools(THREE);
      const st = { v: 20, a: 45, comp: true, t: 0, hold: 0 };
      const X0 = -5.1;
      root.add(grid(12.6, 3.2, 0.5, 0x8aa0c0, 0, 0.25));
      const ground = new THREE.Mesh(new THREE.BoxGeometry(12.8, 0.12, 3.6), M(0x1c2b3a, { roughness: 1 })); ground.position.y = -0.07; ground.receiveShadow = true; root.add(ground);
      // 대포
      const cannon = new THREE.Group(); cannon.position.set(X0, 0.12, 0); root.add(cannon);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.17, 0.9, 20), M(0x4b5563, { metalness: 0.6, roughness: 0.35 }));
      barrel.geometry.translate(0, 0.45, 0); const pivot = new THREE.Group(); pivot.add(barrel); cannon.add(pivot);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.2, 24), M(0x374151)); base.position.y = 0.0; cannon.add(base);
      // 공 · 그림자
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.17, 28, 20), M(0xf59e0b, { roughness: 0.3 })); ball.castShadow = true; root.add(ball);
      const sg = new THREE.Mesh(new THREE.SphereGeometry(0.11, 18, 12), M(0x2f6df6, { roughness: 0.4 }));       // 바닥 위 그림자(수평 운동)
      const sp = new THREE.Mesh(new THREE.SphereGeometry(0.11, 18, 12), M(0xe2464b, { roughness: 0.4 }));       // 기둥 위 그림자(연직 운동)
      root.add(sg, sp);
      const pole = new THREE.Mesh(new THREE.BoxGeometry(0.08, 4.4, 0.08), M(0x94a3b8)); pole.position.set(0, 2.2, 0); root.add(pole);
      const dropX = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 })); root.add(dropX);
      const vA = mkArrow(0xffffff, 0.045), vxA = mkArrow(0x4c8dff, 0.04), vyA = mkArrow(0xff6b6b, 0.04); root.add(vA, vxA, vyA);
      const strobe = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 8), M(0xffe3a3, { roughness: 0.5 }));
      const SN = 40, sI = new THREE.InstancedMesh(strobe.geometry, strobe.material, SN), gI = new THREE.InstancedMesh(strobe.geometry, M(0x9bbcff), SN), pI = new THREE.InstancedMesh(strobe.geometry, M(0xffa3a3), SN);
      root.add(sI, gI, pI);
      let path = null;
      const lH = label('최고점', [0, 0, 0], { color: '#7c3aed', size: 12 }), lR = label('사거리', [0, 0, 0], { color: '#0f766e', size: 12 });
      const lx = label('수평: 등속', sg, { color: '#2f6df6', size: 12, offset: [0, 0.4, 0] }), ly = label('연직: 가속', sp, { color: '#e2464b', size: 12, offset: [0.55, 0.0, 0] });
      const m = new THREE.Matrix4();
      let T = 1, Hm = 0, Rm = 0, vx = 0, vy = 0, Xp = 0;
      function build() {
        const th = st.a * Math.PI / 180; vx = st.v * Math.cos(th); vy = st.v * Math.sin(th);
        T = 2 * vy / G; Hm = vy * vy / (2 * G); Rm = vx * T; Xp = X0 + Rm * K + 0.8;
        pivot.rotation.z = -(Math.PI / 2 - th);
        if (path) { root.remove(path); path.geometry.dispose(); }
        const pts = []; for (let i = 0; i <= 60; i++) { const t = T * i / 60; pts.push(new V3(X0 + vx * t * K, 0.12 + (vy * t - 0.5 * G * t * t) * K + 0.02, 0)); }
        path = tube(pts, 0.025, 0xffd9a0, { basic: true, op: 0.55 }); root.add(path);
        pole.position.x = Xp; sp.position.x = Xp;
        pole.scale.y = Math.max(0.3, (Hm * K + 0.8) / 4.4); pole.position.y = 2.2 * pole.scale.y;
        const n = Math.min(SN, Math.floor(T / 0.5) + 1);
        for (let i = 0; i < SN; i++) {
          const t = Math.min(T, i * 0.5), on = i * 0.5 <= T + 1e-6 && i < n, x = X0 + vx * t * K, y = 0.12 + (vy * t - 0.5 * G * t * t) * K;
          const S = on ? 1 : 0;
          m.makeScale(S, S, S).setPosition(x, y + 0.02, 0); sI.setMatrixAt(i, m);
          m.makeScale(S, S, S).setPosition(x, 0.06, 0.0); gI.setMatrixAt(i, m);
          m.makeScale(S, S, S).setPosition(Xp, y + 0.02, 0.0); pI.setMatrixAt(i, m);
        }
        sI.instanceMatrix.needsUpdate = gI.instanceMatrix.needsUpdate = pI.instanceMatrix.needsUpdate = true;
        lH.obj = [X0 + vx * (vy / G) * K, 0.12 + Hm * K, 0]; lH.off = [0, 0.4, 0]; lR.obj = [X0 + Rm * K, 0.12, 0]; lR.off = [0, -0.35, 0.0];
        st.t = 0; st.hold = 0;
        info('<b>' + st.v + ' m/s, ' + st.a + '°</b><br>최고 높이 ' + Hm.toFixed(1) + ' m · 사거리 ' + Rm.toFixed(1) + ' m · 체공 ' + T.toFixed(1) + ' s<br>수평 속도는 그대로, 연직 속도만 바뀌어요.');
      }
      controls.range('속력', 8, 25, 1, st.v, (v) => { st.v = v; build(); }, (v) => v + ' m/s');
      controls.range('각도', 15, 80, 5, st.a, (v) => { st.a = v; build(); }, (v) => v + '°');
      const cb = controls.button('성분 화살표 ✓', () => { st.comp = !st.comp; cb.classList.toggle('on', st.comp); cb.textContent = '성분 화살표 ' + (st.comp ? '✓' : '✕'); }); cb.classList.add('on');
      controls.button('▶ 다시 쏘기', () => { st.t = 0; st.hold = 0; });
      build();
      return {
        update(dt) {
          if (st.t >= T) { st.hold += dt; if (st.hold > 1.2) { st.t = 0; st.hold = 0; } } else st.t = Math.min(T, st.t + dt);
          const t = st.t, x = X0 + vx * t * K, y = 0.12 + (vy * t - 0.5 * G * t * t) * K + 0.02, vyt = vy - G * t;
          ball.position.set(x, y, 0); sg.position.set(x, 0.1, 0); sp.position.set(Xp, y, 0);
          dropX.position.set(x, y / 2, 0); dropX.scale.y = Math.max(0.001, y); dropX.visible = y > 0.2;
          const tip = new V3(x + vx * 0.07, y + vyt * 0.07, 0), a = new V3(x, y, 0);
          setArrow(vA, a, tip); vA.visible = t < T;
          setArrow(vxA, a, new V3(x + vx * 0.07, y, 0.0)); setArrow(vyA, a, new V3(x, y + vyt * 0.07, 0.0));
          vxA.visible = vyA.visible = st.comp && t < T;
          lx.show(t < T); ly.show(t < T);
        },
        sync() {},
      };
    },
  });
})();
