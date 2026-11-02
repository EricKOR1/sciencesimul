/* hm-wave-propagation · 3D 탄성파의 진행
   파동이 진행해도 매질의 알갱이(붉은 점)는 제자리에서 진동만 해요. 이동하는 것은 '에너지(모양)'예요.
   횡파: 알갱이가 진행 방향에 수직으로 진동 · 종파: 알갱이가 진행 방향과 나란히 진동. v = fλ. */
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
    title: '횡파와 종파 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: 11 * KD, theta: 0.3, phi: 1.22, min: 4, max: 28 },
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const { V3, M, mkArrow, setArrow } = tools(THREE);
      const st = { type: 'trans', f: 0.5, A: 0.8, t: 0 };
      const V = 2.0, NX = 44, NZ = 5, X0 = -5.2, DX = 10.4 / (NX - 1), DZ = 0.62;
      const cnt = NX * NZ, ps = new THREE.InstancedMesh(new THREE.SphereGeometry(0.09, 14, 10), M(0x7dd3fc, { roughness: 0.35 }), cnt);
      ps.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cnt * 3), 3); root.add(ps);
      const c0 = new THREE.Color(0x7dd3fc), c1 = new THREE.Color(0xff5a5f), cm = new THREE.Color(0xffd34d);
      for (let i = 0; i < cnt; i++) ps.setColorAt(i, c0);
      const MK = 14;                                              // 표시한 알갱이(한 줄)
      const mk = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 14), M(0xff5a5f, { emissive: 0x7f1d1d, roughness: 0.3 })); root.add(mk);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.02, 3.4, 0.02), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 })); root.add(rail);
      const railX = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.02, 0.02), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 })); root.add(railX);
      const src = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 4.8), M(0x64748b, { metalness: 0.4 })); src.position.x = X0 - 0.45; root.add(src);
      const dirA = mkArrow(0x34d399, 0.05); setArrow(dirA, new V3(4.0, -1.6, 0), new V3(5.6, -1.6, 0)); root.add(dirA);
      const lD = label('진행 방향', [4.8, -1.6, 0], { color: '#0f766e', size: 12, offset: [0, -0.35, 0] }), lM = label('표시한 알갱이', mk, { color: '#e2464b', size: 12, offset: [0, 0.45, 0] });
      const lL = label('λ', [0, 1.6, 0], { color: '#7c3aed', size: 12 }), lSrc = label('진동 장치', src, { color: '#475569', size: 12, offset: [0, 0.55, 0] });
      const lamb = new THREE.Mesh(new THREE.BoxGeometry(1, 0.025, 0.025), new THREE.MeshBasicMaterial({ color: 0xc4b5fd })); root.add(lamb);
      const m4 = new THREE.Matrix4();
      const lam = () => V / st.f;
      function txt() {
        info(st.type === 'trans'
          ? '<b>횡파</b>: 알갱이가 위아래로 흔들려요. 진행 방향과 <b>수직</b>이에요.<br>f = ' + st.f.toFixed(2) + ' Hz · λ = ' + lam().toFixed(1) + ' m · v = fλ = <b>' + V.toFixed(1) + ' m/s</b>'
          : '<b>종파</b>: 알갱이가 앞뒤로 흔들려요. 진행 방향과 <b>나란해요</b>.<br>알갱이가 몰린 곳(밀)과 흩어진 곳(소)이 번갈아 나아가요.<br>f = ' + st.f.toFixed(2) + ' Hz · λ = ' + lam().toFixed(1) + ' m');
        lL.obj = [X0 + 2.5 + lam() / 2, 1.95, 0]; lamb.scale.x = lam(); lamb.position.set(X0 + 2.5 + lam() / 2, 1.7, 0);
      }
      controls.segment('파동', [{ value: 'trans', label: '↕ 횡파' }, { value: 'long', label: '↔ 종파' }], st.type, (v) => { st.type = v; txt(); });
      controls.range('진동수 f', 0.3, 1.2, 0.1, st.f, (v) => { st.f = v; txt(); }, (v) => v.toFixed(1) + ' Hz');
      txt();
      const tmp = new THREE.Color();
      return {
        update(dt) {
          st.t += dt; const k = TAU / lam(), w = TAU * st.f, front = V * st.t, A = st.type === 'trans' ? st.A : st.A * 0.8;
          let mkx = 0, mky = 0, mkz = 0;
          for (let i = 0; i < NX; i++) {
            const x = X0 + i * DX; const tt = st.t - (x - X0) / V;
            const on = tt > 0 ? 1 : 0, s = on * A * Math.sin(w * tt) * (on ? Math.min(1, tt * 3) : 0), ds = on * (A * k * Math.cos(w * tt));
            for (let j = 0; j < NZ; j++) {
              const z = (j - (NZ - 1) / 2) * DZ, idx = i * NZ + j;
              if (st.type === 'trans') m4.makeTranslation(x, s, z); else m4.makeTranslation(x + s, 0, z);
              ps.setMatrixAt(idx, m4);
              const dens = st.type === 'long' ? clamp(-ds * 1.2 * 1, -1, 1) : clamp(s / A * 0.6, -1, 1);
              if (st.type === 'long') { tmp.copy(c0); if (dens > 0) tmp.lerp(c1, dens); else tmp.lerp(new THREE.Color(0x2563eb), -dens * 0.9); }
              else { tmp.copy(c0).lerp(cm, Math.max(0, dens) * 0.9); }
              ps.setColorAt(idx, tmp);
              if (i === MK && j === (NZ - 1) / 2) { mkx = st.type === 'trans' ? x : x + s; mky = st.type === 'trans' ? s : 0; mkz = z; }
            }
          }
          ps.instanceMatrix.needsUpdate = true; ps.instanceColor.needsUpdate = true;
          mk.position.set(mkx, mky, mkz); rail.position.set(X0 + MK * DX, 0, mkz); rail.visible = st.type === 'trans'; railX.position.set(X0 + MK * DX, 0, mkz); railX.visible = st.type === 'long'; railX.scale.x = 1;
          src.position.y = st.type === 'trans' ? (st.t > 0 ? A * Math.sin(w * st.t) : 0) : 0; src.position.x = X0 - 0.45 + (st.type === 'long' ? A * Math.sin(w * st.t) : 0);
        },
        sync() {},
      };
    },
  });
})();
