/* hp-torque-equilibrium · 3D 돌림힘과 회전 평형
   돌림힘 τ = 힘 × 회전축에서 수직 거리 (τ = r F sinθ). 시소는 왼쪽·오른쪽 돌림힘의 크기가 같을 때 수평(회전 평형)이에요.
   스패너는 팔이 길수록, 힘이 회전축에 수직일수록 작은 힘으로 볼트를 돌릴 수 있어요. */
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
    title: '돌림힘과 평형 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: 11.5 * KD, theta: 0.35, phi: 1.2, min: 4, max: 26, target: [0, 1.2, 0] },
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const { V3, M, mkArrow, setArrow, tube, disc } = tools(THREE);
      const st = { mode: 'see', m1: 2, d1: 3, m2: 3, d2: 2, th: 0, thv: 0, r: 3, F: 4, ang: 90 };
      const gS = new THREE.Group(), gW = new THREE.Group(); root.add(gS, gW);
      const ground = new THREE.Mesh(new THREE.BoxGeometry(11, 0.1, 4), M(0x1f3d30, { roughness: 1 })); ground.position.y = -0.05; ground.receiveShadow = true; root.add(ground);
      /* ---- 시소 ---- */
      const stand = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.6, 4), M(0x64748b, { metalness: 0.4 })); stand.position.y = 0.8; stand.rotation.y = Math.PI / 4; stand.scale.set(1, 1, 0.6); gS.add(stand);
      const beamG = new THREE.Group(); beamG.position.y = 1.65; gS.add(beamG);
      const beam = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.18, 0.7), M(0xd6a15c, { roughness: 0.55 })); beam.castShadow = true; beamG.add(beam);
      for (let i = -4; i <= 4; i++) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.2, 0.72), M(0x7c5a2f)); t.position.x = i; beamG.add(t); }
      const piv = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.9, 20), M(0x374151, { metalness: 0.6 })); piv.rotation.x = Math.PI / 2; piv.position.y = 1.65; gS.add(piv);
      function weight(col) { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), M(col, { roughness: 0.35, metalness: 0.3 })); b.castShadow = true; g.add(b); const h = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.04, 8, 20), M(0x9ca3af)); h.position.y = 0.0; g.add(h); g.userData.b = b; beamG.add(g); return g; }
      const w1 = weight(0x3b82f6), w2 = weight(0xf59e0b);
      const gF1 = mkArrow(0x60a5fa, 0.045), gF2 = mkArrow(0xfbbf24, 0.045); gS.add(gF1, gF2);
      const lw1 = label('추 1', w1, { color: '#2f6df6', size: 12, offset: [0, 0.9, 0] }), lw2 = label('추 2', w2, { color: '#d97706', size: 12, offset: [0, 0.9, 0] });
      const lpv = label('받침점(회전축)', [0, 1.0, 0.6], { color: '#475569', size: 12 }), lt1 = label('', [0, 0, 0], { color: '#2f6df6', size: 12 }), lt2 = label('', [0, 0, 0], { color: '#d97706', size: 12 });
      const lbal = label('', [0, 3.3, 0], { color: '#15803d', size: 14 });
      /* ---- 스패너 ---- */
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.5, 6), M(0xb0b7c3, { metalness: 0.8, roughness: 0.3 })); bolt.position.y = 0.25; gW.add(bolt);
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.1, 48), M(0x475569, { metalness: 0.5 })); plate.position.y = -0.05; gW.add(plate);
      const wr = new THREE.Group(); wr.position.y = 0.55; gW.add(wr);
      const wb = new THREE.Mesh(new THREE.BoxGeometry(1, 0.16, 0.34), M(0xdc2626, { metalness: 0.7, roughness: 0.3 })); wb.castShadow = true; wr.add(wb);
      const head = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.16, 6), M(0xdc2626, { metalness: 0.7, roughness: 0.3 })); wr.add(head);
      const fA = mkArrow(0xfbbf24, 0.06), rA = mkArrow(0x34d399, 0.03); gW.add(fA, rA);
      const lF = label('힘 F', fA, { color: '#d97706', size: 13 }), lr = label('팔 길이 r', [0, 0, 0], { color: '#0f766e', size: 12 }), lτ = label('', [0, 0.1, 0], { color: '#7c3aed', size: 13 });
      const rotArc = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.04, 8, 36, 4.6), M(0xa78bfa, { emissive: 0x4c1d95 })); rotArc.rotation.x = Math.PI / 2; rotArc.position.y = 0.7; gW.add(rotArc);
      const rotHead = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.34, 14), M(0xa78bfa, { emissive: 0x4c1d95 })); gW.add(rotHead);
      const ctl = {}; const barEl = ctx.renderer.domElement.parentNode.parentNode.querySelector('.v3-ctl');
      const grab = (k, fn) => { const b = barEl.children.length; const r = fn(); ctl[k] = [...barEl.children].slice(b); return r; };
      function mode() {
        gS.visible = st.mode === 'see'; gW.visible = st.mode === 'wr';
        ['m1', 'd1', 'm2', 'd2'].forEach((k) => ctl[k].forEach((n) => (n.style.display = st.mode === 'see' ? '' : 'none')));
        ['r', 'F', 'ang'].forEach((k) => ctl[k].forEach((n) => (n.style.display = st.mode === 'wr' ? '' : 'none')));
        [lw1, lw2, lpv, lt1, lt2, lbal].forEach((l) => l.show(st.mode === 'see')); [lF, lr, lτ].forEach((l) => l.show(st.mode === 'wr'));
        ground.visible = st.mode === 'see'; ctx.orbit.ty = st.mode === 'see' ? 1.2 : 0.4; ctx.orbit.phi = st.mode === 'see' ? 1.2 : 0.95; ctx.orbit.dist = (st.mode === 'see' ? 11.5 : 9) * KD; txt();
      }
      function txt() {
        if (st.mode === 'see') {
          const t1 = st.m1 * st.d1, t2 = st.m2 * st.d2;
          info('<b>왼쪽 τ = ' + st.m1 + '×' + st.d1 + ' = ' + t1 + ' · 오른쪽 τ = ' + st.m2 + '×' + st.d2 + ' = ' + t2 + '</b><br>' + (t1 === t2 ? '두 돌림힘이 같아서 <b>수평(회전 평형)</b>이에요.' : t1 > t2 ? '왼쪽 돌림힘이 커서 왼쪽이 내려가요.' : '오른쪽 돌림힘이 커서 오른쪽이 내려가요.') + '<br>(질량 × 받침점에서의 거리)');
        } else {
          const tq = st.F * st.r * Math.sin(st.ang * Math.PI / 180);
          info('<b>돌림힘 τ = F·r·sinθ = ' + tq.toFixed(1) + ' N·m</b><br>스패너를 길게 잡거나(r↑), 팔에 수직으로 밀수록(θ=90°) 더 잘 돌아가요.');
        }
      }
      const seg = controls.segment('실험', [{ value: 'see', label: '⚖ 시소' }, { value: 'wr', label: '🔧 스패너' }], st.mode, (v) => { st.mode = v; mode(); });
      grab('m1', () => controls.range('추 1 질량', 1, 5, 1, st.m1, (v) => { st.m1 = v; txt(); }, (v) => v + ' kg'));
      grab('d1', () => controls.range('추 1 거리', 1, 4, 1, st.d1, (v) => { st.d1 = v; txt(); }, (v) => v + ' m'));
      grab('m2', () => controls.range('추 2 질량', 1, 5, 1, st.m2, (v) => { st.m2 = v; txt(); }, (v) => v + ' kg'));
      grab('d2', () => controls.range('추 2 거리', 1, 4, 1, st.d2, (v) => { st.d2 = v; txt(); }, (v) => v + ' m'));
      grab('r', () => controls.range('팔 길이 r', 1, 4, 0.5, st.r, (v) => { st.r = v; txt(); }, (v) => v + ' m'));
      grab('F', () => controls.range('힘 F', 1, 8, 1, st.F, (v) => { st.F = v; txt(); }, (v) => v + ' N'));
      grab('ang', () => controls.range('힘의 방향 θ', 20, 90, 10, st.ang, (v) => { st.ang = v; txt(); }, (v) => v + '°'));
      mode();
      const tmp = new V3(); let ph = 0;
      return {
        update(dt) {
          if (st.mode === 'see') {
            const t1 = st.m1 * st.d1, t2 = st.m2 * st.d2, tgt = clamp((t2 - t1) / Math.max(t1, t2) * 0.38, -0.38, 0.38);   // +: 오른쪽이 내려감
            st.thv += ((tgt - st.th) * 24 - st.thv * 3.0) * dt; st.th += st.thv * dt; beamG.rotation.z = -st.th;
            const sz = (m) => 0.5 + 0.09 * m;
            [[w1, -st.d1, st.m1, gF1, lt1], [w2, st.d2, st.m2, gF2, lt2]].forEach(([w, d, m, ar, lt]) => {
              w.position.set(d, 0.09 + sz(m) / 2 + 0.0, 0); w.userData.b.scale.set(sz(m), sz(m), sz(m)); w.userData.b.position.y = 0;
              tmp.set(d, 0.09 + sz(m) / 2, 0).applyAxisAngle(new V3(0, 0, 1), -st.th); tmp.y += 1.65; tmp.x += 0;
              setArrow(ar, tmp.clone().add(new V3(0, 0.0, 0.62)), tmp.clone().add(new V3(0, -0.3 - m * 0.2, 0.62))); 
              lt.obj = [tmp.x, 0.9 + 0.0, 0.62]; lt.off = [0, -0.1, 0.45];
            });
            lt1.set('τ₁ = ' + (st.m1 * st.d1)); lt2.set('τ₂ = ' + (st.m2 * st.d2));
            lbal.show(Math.abs(st.m1 * st.d1 - st.m2 * st.d2) < 0.01); lbal.set('✔ 회전 평형');
            lpv.obj = [0, 1.0, 0.62];
          } else {
            const th = st.ang * Math.PI / 180, rr = st.r;
            wb.scale.x = rr + 0.6; wb.position.x = rr / 2 + 0.3 - 0.3; head.position.x = 0;
            const tq = st.F * rr * Math.sin(th); ph += dt * Math.min(2.2, tq / 6) * 0.9; wr.rotation.y = -ph * 0.3; bolt.rotation.y = -ph * 0.3;
            const a = wr.rotation.y; const dir = new V3(Math.cos(-a), 0, Math.sin(-a));         // 스패너 방향 (월드)
            const hand = dir.clone().multiplyScalar(rr).add(new V3(0, 0.62, 0));
            const perp = new V3(-dir.z, 0, dir.x);                                                 // 팔에 수직 (회전 방향)
            const fd = dir.clone().multiplyScalar(-Math.cos(th)).addScaledVector(perp, Math.sin(th)).normalize();
            setArrow(fA, hand.clone().addScaledVector(fd, -1.6 * (0.6 + st.F / 12)), hand); lF.obj = [hand.x - fd.x * 1.0, hand.y, hand.z - fd.z * 1.0]; lF.off = [0, 0.3, 0];
            setArrow(rA, new V3(0, 0.62, 0), hand.clone().add(new V3(0, 0, 0))); rA.visible = true; lr.obj = [dir.x * rr * 0.5, 0.55, dir.z * rr * 0.5 - 0.55]; lr.off = [0, 0, 0];
            lτ.obj = [0, 1.5, 0]; lτ.set('τ = ' + tq.toFixed(1) + ' N·m');
            rotArc.rotation.z = wr.rotation.y + 0.5; rotHead.position.set(0.95 * Math.cos(-wr.rotation.y + 0.5 + 4.6) , 0.7, 0.95 * Math.sin(-wr.rotation.y + 0.5 + 4.6)); rotHead.visible = false;
            rotArc.scale.setScalar(0.5 + tq / 32 * 1.3);
          }
        },
        sync() {},
      };
    },
  });
})();
