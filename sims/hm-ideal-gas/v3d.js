/* hm-ideal-gas · 3D 기체 분자 모형과 압력
   기체 분자가 용기 벽에 충돌하는 힘이 압력이에요. 온도가 높으면 분자가 빠르고(충돌이 세고 잦음), 부피가 작으면 충돌이 잦아져요.
   막대 눈금은 벽에 부딪히는 충격량의 시간 평균(상대값)으로, P ∝ nT/V (PV = nRT) 를 보여 줘요. */
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
  window.SciSim3D.attach({
    title: '기체 분자와 압력 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: 12.5 * KD, theta: 0.65, phi: 1.1, min: 5, max: 28 },
    autoRotate: 0.12,
    levels: [0, 1],
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const { V3, M } = tools(THREE);
      const st = { T: 300, n: 100, Vf: 1.0 };
      const NMAX = 200, LX = 6, LY = 3.4, LZ = 3.4;          // 부피 = 오른쪽 피스톤 위치에 비례
      const pos = new Float32Array(NMAX * 3), vel = new Float32Array(NMAX * 3);
      const im = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 14, 10), M(0xffffff, { roughness: 0.3 }), NMAX); im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(NMAX * 3), 3); root.add(im);
      const box = new THREE.Mesh(new THREE.BoxGeometry(1, LY, LZ), new THREE.MeshStandardMaterial({ color: 0x9ec5ff, transparent: true, opacity: 0.1, roughness: 0.1, side: THREE.DoubleSide, depthWrite: false })); root.add(box);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, LY, LZ)), new THREE.LineBasicMaterial({ color: 0xbcd4ff, transparent: true, opacity: 0.6 })); root.add(edges);
      const pis = new THREE.Mesh(new THREE.BoxGeometry(0.22, LY + 0.1, LZ + 0.1), M(0x64748b, { metalness: 0.6, roughness: 0.3 })); root.add(pis);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3, 16), M(0x94a3b8, { metalness: 0.7 })); rod.rotation.z = Math.PI / 2; root.add(rod);
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.1, 1.1), M(0xe2464b)); root.add(handle);
      // 압력 계기
      const gauge = new THREE.Group(); root.add(gauge);
      const gb = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3, 0.3), M(0x334155)); gb.position.y = 1.5; gauge.add(gb);
      const gf = new THREE.Mesh(new THREE.BoxGeometry(0.34, 1, 0.34), M(0xff6b6b, { emissive: 0x7f1d1d, roughness: 0.4 })); gauge.add(gf);
      gauge.position.set(-3.2, -LY / 2, 1.5);
      const lP = label('압력 P', gb, { color: '#e2464b', size: 13, offset: [0, 1.9, 0] }), lPis = label('피스톤(부피)', pis, { color: '#475569', size: 12, offset: [0, LY / 2 + 0.4, 0] });
      const lW = label('벽에 충돌 → 압력', [-LX / 2, 0, 0], { color: '#2563eb', size: 12, offset: [-0.0, 0.0, 0] });
      const colS = new THREE.Color(0x60a5fa), colF = new THREE.Color(0xff7b54), tc = new THREE.Color();
      const m4 = new THREE.Matrix4();
      function resetP() { for (let i = 0; i < NMAX; i++) { pos[i * 3] = (Math.random() - 0.5) * LX * 0.9; pos[i * 3 + 1] = (Math.random() - 0.5) * LY * 0.9; pos[i * 3 + 2] = (Math.random() - 0.5) * LZ * 0.9; const a = Math.random() * TAU, b = Math.acos(2 * Math.random() - 1); vel[i * 3] = Math.sin(b) * Math.cos(a); vel[i * 3 + 1] = Math.cos(b); vel[i * 3 + 2] = Math.sin(b) * Math.sin(a); } }
      resetP();
      let hits = 0, acc = 0, P = 0, Pshown = 0;
      const spd = () => Math.sqrt(st.T / 300) * 3.2;
      function txt() { info('<b>P ∝ n·T / V</b><br>분자 수 ' + st.n + ' · 온도 ' + st.T + ' K · 부피 ' + (st.Vf * 100).toFixed(0) + '%<br>분자가 빠를수록, 많을수록, 좁을수록 압력이 커져요.'); }
      controls.range('온도', 150, 600, 50, st.T, (v) => { st.T = v; txt(); }, (v) => v + ' K');
      controls.range('부피', 0.4, 1.0, 0.1, st.Vf, (v) => { st.Vf = v; for (let i = 0; i < NMAX; i++) { const lim = LX * st.Vf / 2; if (pos[i * 3] > lim) pos[i * 3] = lim - 0.1; } txt(); }, (v) => (v * 100).toFixed(0) + '%');
      controls.range('분자 수', 40, 200, 20, st.n, (v) => { st.n = v; txt(); }, (v) => v + '개');
      txt();
      return {
        update(dt) {
          const s = spd(), VL = LX * st.Vf, x0 = -LX / 2, x1 = x0 + VL, hy = LY / 2, hz = LZ / 2; let imp = 0;
          for (let i = 0; i < NMAX; i++) {
            const k = i * 3; pos[k] += vel[k] * s * dt; pos[k + 1] += vel[k + 1] * s * dt; pos[k + 2] += vel[k + 2] * s * dt;
            if (i < st.n) {
              if (pos[k] > x1 - 0.1) { pos[k] = x1 - 0.1; vel[k] = -Math.abs(vel[k]); imp += 2 * Math.abs(vel[k]) * s; }
              else if (pos[k] < x0 + 0.1) { pos[k] = x0 + 0.1; vel[k] = Math.abs(vel[k]); imp += 2 * Math.abs(vel[k]) * s; }
              if (pos[k + 1] > hy - 0.1) { pos[k + 1] = hy - 0.1; vel[k + 1] = -Math.abs(vel[k + 1]); imp += 2 * Math.abs(vel[k + 1]) * s; } else if (pos[k + 1] < -hy + 0.1) { pos[k + 1] = -hy + 0.1; vel[k + 1] = Math.abs(vel[k + 1]); imp += 2 * Math.abs(vel[k + 1]) * s; }
              if (pos[k + 2] > hz - 0.1) { pos[k + 2] = hz - 0.1; vel[k + 2] = -Math.abs(vel[k + 2]); imp += 2 * Math.abs(vel[k + 2]) * s; } else if (pos[k + 2] < -hz + 0.1) { pos[k + 2] = -hz + 0.1; vel[k + 2] = Math.abs(vel[k + 2]); imp += 2 * Math.abs(vel[k + 2]) * s; }
              const sp = Math.min(1, (st.T - 150) / 450); tc.copy(colS).lerp(colF, sp);
              m4.makeTranslation(pos[k], pos[k + 1], pos[k + 2]); im.setMatrixAt(i, m4); im.setColorAt(i, tc);
            } else { m4.makeScale(0, 0, 0); im.setMatrixAt(i, m4); }
          }
          im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
          acc += imp * 0.0 + imp; hits += dt; if (hits > 0.25) { P = acc / hits / (2 * (VL * LY + VL * LZ + LY * LZ)) * 0.5; acc = 0; hits = 0; }
          Pshown += (P - Pshown) * Math.min(1, dt * 6);
          box.scale.x = VL; box.position.x = x0 + VL / 2; edges.scale.x = VL; edges.position.x = x0 + VL / 2; pis.position.x = x1 + 0.11; rod.position.x = x1 + 1.5; handle.position.x = x1 + 3.1;
          const h = clamp(Pshown * 0.13, 0.05, 2.9); gf.scale.y = h; gf.position.y = h / 2 + 0.05; lP.off = [0, 1.9, 0];
          lPis.obj = pis; lW.obj = [x0, 0, 0.0]; lW.show(false);
        },
        sync() {},
      };
    },
  });
})();
