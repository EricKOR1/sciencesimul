/* hm-string-wave · 3D 현의 정상파
   양 끝이 고정된 줄에는 L = nλ/2 일 때 정상파가 생겨요. 마디는 늘 가만히, 배는 가장 크게 진동해요.
   '두 진행파' 보기에서는 오른쪽·왼쪽으로 가는 두 파동의 합이 정상파가 되는 모습을 보여 줘요. */
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
    title: '현의 정상파 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: 12 * KD, theta: 0.45, phi: 1.2, min: 5, max: 28 },
    autoRotate: 0,
    levels: [0, 1],
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const { V3, M, tube } = tools(THREE);
      const st = { n: 3, A: 0.9, view: 'stand', node: true, t: 0 };
      const L = 8, NP = 96;
      const m4 = new THREE.Matrix4();
      const mkStr = (col) => { const im = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 12, 8), M(col, { roughness: 0.35, emissive: col, emissiveIntensity: 0.15 }), NP); root.add(im); return im; };
      const sMid = mkStr(0xffd34d), sR = mkStr(0xff8a65), sL = mkStr(0x6ab0ff);
      const env = new THREE.Group(); root.add(env);
      const post = (x) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 1.6, 20), M(0x64748b, { metalness: 0.5 })); p.position.set(x, 0, 0); root.add(p); return p; };
      post(-L / 2 - 0.1); post(L / 2 + 0.1);
      const nodeM = [], antiM = [];
      for (let i = 0; i < 6; i++) {
        const nd = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), M(0xef4444, { emissive: 0x7f1d1d, roughness: 0.4 })); root.add(nd); nodeM.push(nd);
        const an = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), new THREE.MeshBasicMaterial({ color: 0x4ade80, transparent: true, opacity: 0.5, depthWrite: false })); root.add(an); antiM.push(an);
      }
      const lN = label('마디', nodeM[1], { color: '#dc2626', size: 12, offset: [0, -0.4, 0] }), lA = label('배', antiM[0], { color: '#15803d', size: 12, offset: [0, 0.55, 0] });
      const lla = label('', [0, 0, 0], { color: '#7c3aed', size: 12 });
      const lR = label('→ 오른쪽으로 가는 파동', [0, 2.8, 0], { color: '#e8590c', size: 12 }), lLf = label('← 왼쪽으로 가는 파동', [0, -2.8, 0], { color: '#2f6df6', size: 12 }), lS = label('합 = 정상파', [0, 0.0, 0], { color: '#a16207', size: 12, offset: [0, 1.5, 0] });
      let envMesh = [];
      function rebuild() {
        envMesh.forEach((e) => { env.remove(e); e.geometry.dispose(); }); envMesh = [];
        const k = st.n * Math.PI / L, up = [], dn = [];
        for (let i = 0; i <= 80; i++) { const x = -L / 2 + L * i / 80; up.push(new V3(x, st.A * Math.sin(k * (x + L / 2)), 0)); dn.push(new V3(x, -st.A * Math.sin(k * (x + L / 2)), 0)); }
        [up, dn].forEach((p) => { const t = tube(p, 0.018, 0xc4b5fd, { basic: true, op: 0.55 }); env.add(t); envMesh.push(t); });
        for (let i = 0; i < 6; i++) {
          nodeM[i].visible = st.view === 'stand' && st.node && i <= st.n; antiM[i].visible = st.view === 'stand' && st.node && i < st.n;
          nodeM[i].position.set(-L / 2 + L * i / st.n, 0, 0);
        }
        env.visible = st.view === 'stand';
        lN.show(st.node && st.view === 'stand'); lA.show(st.node && st.view === 'stand'); lN.obj = nodeM[Math.min(1, st.n)];
        lA.obj = antiM[0]; lA.off = [0, 0, 0]; lla.set('λ = 2L/' + st.n); lla.obj = [-L / 2 + L / st.n / 2, 0, 0]; lla.off = [0, -0.0, 0.0];
        lla.show(false);
        lR.show(st.view === 'two'); lLf.show(st.view === 'two'); lS.show(st.view === 'two');
        info(st.view === 'stand'
          ? '<b>' + st.n + '배 진동 · 마디 ' + (st.n + 1) + '개 · 배 ' + st.n + '개</b><br>L = nλ/2 이므로 λ = 2L/' + st.n + '<br>진동수 f = n·v/2L : n이 클수록 높은 소리예요.'
          : '<b>두 진행파의 합</b><br>같은 모양의 두 파동이 서로 반대로 지나가며 겹쳐요. 마디에서는 늘 서로 상쇄돼요.');
      }
      controls.segment('보기', [{ value: 'stand', label: '〰 정상파' }, { value: 'two', label: '⇄ 두 진행파' }], st.view, (v) => { st.view = v; rebuild(); });
      controls.segment('배음', [1, 2, 3, 4, 5].map((n) => ({ value: n, label: n + '배' })), st.n, (v) => { st.n = v; rebuild(); });
      controls.range('진폭', 0.3, 1.2, 0.1, st.A, (v) => { st.A = v; rebuild(); }, (v) => v.toFixed(1));
      const nb = controls.button('마디·배 ✓', () => { st.node = !st.node; nb.classList.toggle('on', st.node); nb.textContent = '마디·배 ' + (st.node ? '✓' : '✕'); rebuild(); }); nb.classList.add('on');
      rebuild();
      return {
        update(dt) {
          st.t += dt; const k = st.n * Math.PI / L, w = 2.6 * st.n ** 0.5 * 1.0;
          const two = st.view === 'two', oy = two ? 2.3 : 0;
          for (let i = 0; i < NP; i++) {
            const x = -L / 2 + L * i / (NP - 1), xx = x + L / 2;
            const yR = 0.5 * st.A * Math.sin(k * xx - w * st.t) * 1, yL = 0.5 * st.A * Math.sin(k * xx + w * st.t);
            const ys = st.A * Math.sin(k * xx) * Math.cos(w * st.t);
            m4.makeTranslation(x, ys, 0); sMid.setMatrixAt(i, m4);
            const S = two ? 1 : 0;
            m4.makeScale(S, S, S).setPosition(x, 2.4 + yR * 1.8, 0); sR.setMatrixAt(i, m4);
            m4.makeScale(S, S, S).setPosition(x, -2.4 + yL * 1.8, 0); sL.setMatrixAt(i, m4);
          }
          sMid.instanceMatrix.needsUpdate = sR.instanceMatrix.needsUpdate = sL.instanceMatrix.needsUpdate = true;
        },
        sync() {},
      };
    },
  });
})();
