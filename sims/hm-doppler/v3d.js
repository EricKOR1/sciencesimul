/* hm-doppler · 3D 도플러 효과
   음원(구급차)이 움직이면 앞쪽 파면은 촘촘해지고(파장이 짧아져 소리가 높아짐), 뒤쪽 파면은 성글어져요(낮아짐).
   f' = f · v / (v ∓ vₛ) (관측자가 정지, 음원이 다가오면 −). 파면은 한 번 내보내면 그 자리를 중심으로 퍼져요. */
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
  const KDX = PHN ? 1.65 : 1;
  window.SciSim3D.attach({
    title: '도플러 효과 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: 16 * KDX, theta: 0.15, phi: 0.95, min: 5, max: 28 },
    autoRotate: 0,
    levels: [0, 1],
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const { V3, M, mkArrow, setArrow, grid } = tools(THREE);
      const st = { r: 0.5, t: 0, x: -5, nxt: 0, w: [], v: 1.6, show: true };
      const T0 = 0.5, XM = 4.4, XR = 6.2, MAXR = 7.0;
      root.add(grid(14, 9, 1, 0x7a8fb3, -0.55, 0.22));
      const road = new THREE.Mesh(new THREE.BoxGeometry(15, 0.1, 1.2), M(0x374151, { roughness: 0.9 })); road.position.y = -0.62; root.add(road);
      // 구급차
      const car = new THREE.Group(); root.add(car);
      const bd = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.55, 0.8), M(0xf8fafc, { roughness: 0.35 })); bd.position.y = 0.0; car.add(bd);
      const cab = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.42, 0.78), M(0xf8fafc, { roughness: 0.35 })); cab.position.set(0.55, 0.45, 0); const cab2 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 0.8), M(0xf8fafc)); cab2.position.set(-0.2, 0.42, 0); car.add(cab, cab2);
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.12, 0.82), M(0xef4444)); stripe.position.y = 0.02; car.add(stripe);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), new THREE.MeshBasicMaterial({ color: 0xff3b30 })); lamp.position.set(-0.1, 0.65, 0); car.add(lamp);
      [-0.5, 0.5].forEach((x) => [-0.4, 0.4].forEach((z) => { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 20), M(0x1f2937)); w.rotation.x = Math.PI / 2; w.position.set(x, -0.3, z); car.add(w); }));
      const vA = mkArrow(0xffd34d, 0.05); root.add(vA);
      const obsF = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 14), M(0x34d399, { roughness: 0.4 })), obsB = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 14), M(0x60a5fa, { roughness: 0.4 }));
      obsF.position.set(XM + 1.2, 0, 0); obsB.position.set(-XM - 1.2, 0, 0); root.add(obsF, obsB);
      const lF = label('앞쪽 관측자', obsF, { color: '#0f766e', size: 12, offset: [0, 0.65, 0] }), lB = label('뒤쪽 관측자', obsB, { color: '#2563eb', size: 12, offset: [0, 0.65, 0] });
      const lfF = label('', obsF, { color: '#059669', size: 13, offset: [0, -0.6, 0] }), lfB = label('', obsB, { color: '#2563eb', size: 13, offset: [0, -0.6, 0] }), lV = label('음원 속도 vₛ', vA, { color: '#a16207', size: 12, offset: [0, 0.3, 0] });
      const shellG = new THREE.SphereGeometry(1, 36, 20); const ringG = new THREE.TorusGeometry(1, 0.012, 6, 96);
      const shells = []; const NSH = 22;
      for (let i = 0; i < NSH; i++) {
        const s = new THREE.Mesh(shellG, new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.0, depthWrite: false })), r = new THREE.Mesh(ringG, new THREE.MeshBasicMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.0 }));
        r.rotation.x = Math.PI / 2; s.visible = r.visible = false; root.add(s, r); shells.push({ s, r, on: false, x: 0, age: 0 });
      }
      const f0 = 440;
      function txt() {
        const vs = st.r * st.v, ff = f0 * st.v / (st.v - vs), fb = f0 * st.v / (st.v + vs);
        lfF.set('들리는 소리 ' + Math.round(ff) + ' Hz'); lfB.set('들리는 소리 ' + Math.round(fb) + ' Hz');
        info('<b>음원이 속력 ' + (st.r * 340).toFixed(0) + ' m/s로 움직여요</b><br>앞쪽은 파면이 <b>촘촘</b>(높은 소리), 뒤쪽은 <b>성글어요</b>(낮은 소리).<br>소리를 내는 진동수는 ' + f0 + ' Hz 그대로예요.');
      }
      controls.range('음원 속력 (소리 속력의 비율)', 0, 0.8, 0.1, st.r, (v) => { st.r = v; reset(); txt(); }, (v) => (v * 100).toFixed(0) + '%');
      controls.button('↺ 다시 출발', () => reset());
      function reset() { st.x = -XM; st.nxt = 0; shells.forEach((s) => { s.on = false; s.s.visible = s.r.visible = false; }); }
      txt();
      return {
        update(dt) {
          const vs = st.r * st.v; st.x += vs * dt; st.nxt -= dt;
          if (st.x > XM + 0.5) reset();
          if (st.nxt <= 0) { st.nxt = T0; const sh = shells.find((s) => !s.on) || shells[0]; sh.on = true; sh.x = st.x; sh.age = 0; sh.s.visible = sh.r.visible = true; }
          car.position.set(st.x, 0, 0); car.rotation.y = 0; lamp.material.color.setHex(Math.floor(performance.now() / 250) % 2 ? 0xff3b30 : 0x3b82f6);
          setArrow(vA, new V3(st.x + 0.9, 0.9, 0), new V3(st.x + 0.9 + 0.2 + vs * 1.0, 0.9, 0)); vA.visible = vs > 0.01; lV.show(vs > 0.01);
          shells.forEach((s) => {
            if (!s.on) return; s.age += dt; const r = s.age * st.v;
            if (r > MAXR) { s.on = false; s.s.visible = s.r.visible = false; return; }
            s.s.position.set(s.x, 0, 0); s.s.scale.setScalar(r); s.r.position.set(s.x, 0, 0); s.r.scale.set(r, r, r);
            const f = 1 - r / MAXR; s.s.material.opacity = 0.09 * f; s.r.material.opacity = 0.95 * f;
          });
        },
        sync() {},
      };
    },
  });
})();
