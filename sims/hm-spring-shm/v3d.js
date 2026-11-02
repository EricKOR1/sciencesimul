/* hm-spring-shm · 3D 용수철 진자와 단진동
   복원력 F = −kx (변위에 비례, 반대 방향), 주기 T = 2π√(m/k) (진폭과 무관).
   오른쪽에 x–t 그래프가 시간 축으로 펼쳐져 나와요. 막대는 위치 에너지(E_p)와 운동 에너지(E_k). */
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
    title: '용수철 진자 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: 11.5 * KD, theta: 0.55, phi: 1.3, min: 4, max: 26, target: [1.4, 0, 0] },
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const { V3, M, mkArrow, setArrow, tube } = tools(THREE);
      const st = { A: 1.2, m: 1, k: 4, t: 0, trace: true };
      const Ytop = 3.6, Y0 = 0.4;                    // 천장 · 평형 위치
      const bar = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.2, 0.9), M(0x64748b, { metalness: 0.4 })); bar.position.set(0, Ytop + 0.1, 0); root.add(bar);
      const floor = new THREE.Mesh(new THREE.BoxGeometry(9, 0.1, 3), M(0x1f3d30, { roughness: 1 })); floor.position.set(1.8, -2.4, 0); floor.receiveShadow = true; root.add(floor);
      // 평형 위치선 · 끝점
      const eq = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.014, 0.014), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 })); eq.position.set(0, Y0, 0); root.add(eq);
      const endA = eq.clone(), endB = eq.clone(); endA.material = endB.material = new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0.5 }); root.add(endA, endB);
      // 용수철 (매 프레임 길이만 바꿔 다시 만들지 않고, 점들을 갱신하는 튜브 대신 코일을 작은 구로 표현)
      const NS = 160, coil = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 8, 6), M(0xcbd5e1, { metalness: 0.7, roughness: 0.3 }), NS); root.add(coil);
      const mass = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.9), M(0x3b82f6, { roughness: 0.35, metalness: 0.15 })); mass.castShadow = true; root.add(mass);
      const fA = mkArrow(0xff5a5f, 0.05), vA = mkArrow(0x34d399, 0.05); root.add(fA, vA);
      const lF = label('복원력 F', fA, { color: '#e2464b', size: 12 }), lV = label('속도 v', vA, { color: '#0f766e', size: 12 });
      const lE = label('평형 위치', [-1.15, Y0, 0], { color: '#475569', size: 12 }), lA = label('진폭 A', [-1.15, Y0 + st.A, 0], { color: '#a16207', size: 12 });
      // 그래프 (x–t) : 구슬 자취
      const TN = 150, trace = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 8, 6), M(0xffb020, { emissive: 0x7a4a00, roughness: 0.5 }), TN); root.add(trace);
      const axis = tube([new V3(1, Y0, 0), new V3(7.2, Y0, 0)], 0.015, 0xffffff, { basic: true, op: 0.5 }); root.add(axis);
      const lT = label('시간 t →', [7.0, Y0, 0], { color: '#475569', size: 12, offset: [0, -0.3, 0] });
      const tick = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), M(0xffd34d)); root.add(tick);
      const guide = new THREE.Mesh(new THREE.BoxGeometry(1, 0.012, 0.012), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 })); root.add(guide);
      // 에너지 막대
      const eP = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1, 0.4), M(0x4c8dff, { roughness: 0.4 })), eK = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1, 0.4), M(0xff9f43, { roughness: 0.4 }));
      eP.position.x = -3.1; eK.position.x = -2.5; root.add(eP, eK);
      const lEp = label('E_p', eP, { color: '#2f6df6', size: 12, offset: [0, -0.1, 0.1] }), lEk = label('E_k', eK, { color: '#d97706', size: 12, offset: [0, -0.1, 0.1] });
      const m = new THREE.Matrix4(), q = new THREE.Quaternion();
      const omega = () => Math.sqrt(st.k / st.m);
      const hist = [];
      function txt() { info('<b>주기 T = 2π√(m/k) = ' + (TAU / omega()).toFixed(2) + ' s</b><br>진폭 ' + st.A.toFixed(1) + ' (m) · 질량 ' + st.m.toFixed(1) + ' kg · k ' + st.k + ' N/m<br>진폭을 바꿔도 주기는 그대로예요.'); }
      function setAmp() { endA.position.y = Y0 + st.A; endB.position.y = Y0 - st.A; lA.off = [0, st.A, 0]; lA.obj = [-1.15, Y0, 0]; }
      controls.range('진폭', 0.4, 1.6, 0.2, st.A, (v) => { st.A = v; setAmp(); txt(); }, (v) => v.toFixed(1));
      controls.range('질량', 0.5, 4, 0.5, st.m, (v) => { st.m = v; hist.length = 0; txt(); }, (v) => v.toFixed(1) + ' kg');
      controls.range('용수철 상수', 2, 16, 2, st.k, (v) => { st.k = v; hist.length = 0; txt(); }, (v) => v + ' N/m');
      setAmp(); txt();
      return {
        update(dt) {
          st.t += dt; const w = omega(), x = st.A * Math.cos(w * st.t), v = -st.A * w * Math.sin(w * st.t);
          const y = Y0 + x;
          mass.position.set(0, y - 0.35, 0);
          // 용수철: 천장 ~ 질량 위
          const yTop = Ytop, yBot = y; const turns = 14;
          for (let i = 0; i < NS; i++) { const u = i / (NS - 1), a = u * turns * TAU; m.makeTranslation(0.32 * Math.cos(a), yTop + (yBot - yTop) * u, 0.32 * Math.sin(a)); coil.setMatrixAt(i, m); }
          coil.instanceMatrix.needsUpdate = true;
          setArrow(fA, new V3(0.7, y, 0), new V3(0.7, y - x * 0.9 * st.k / 8, 0)); lF.off = [0.25, 0, 0];
          setArrow(vA, new V3(-0.7, y, 0), new V3(-0.7, y + v * 0.35, 0)); lV.off = [-0.25, 0, 0];
          fA.visible = Math.abs(x) > 0.05; vA.visible = Math.abs(v) > 0.05; lF.show(fA.visible); lV.show(vA.visible);
          // 그래프: 최근 기록
          hist.push(x); if (hist.length > TN) hist.shift();
          const dx = 6.2 / TN; tick.position.set(1, y, 0); guide.position.set(0.5, y, 0); guide.scale.x = 1; 
          for (let i = 0; i < TN; i++) { const hv = hist[hist.length - 1 - i]; const S = hv === undefined ? 0 : 1; m.makeScale(S, S, S).setPosition(1 + i * dx, Y0 + (hv || 0), 0); trace.setMatrixAt(i, m); }
          trace.instanceMatrix.needsUpdate = true;
          const Ep = 0.5 * st.k * x * x, Ek = 0.5 * st.m * v * v, sc = 0.55 / (0.5 * st.k * 1.6 * 1.6) * 2.4;
          eP.scale.y = Math.max(0.001, Ep * sc); eK.scale.y = Math.max(0.001, Ek * sc); eP.position.y = Y0 - 1.7 + eP.scale.y / 2; eK.position.y = Y0 - 1.7 + eK.scale.y / 2;
        },
        sync() {},
      };
    },
  });
})();
