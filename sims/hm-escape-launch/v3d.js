/* hm-escape-launch · 3D 탈출 속도와 궤도
   지표면에서 수평으로 쏜 물체의 궤도는 처음 속력에 따라 달라져요.
   v < 7.9 km/s: 지구로 떨어짐 · 7.9: 원 궤도(첫 번째 우주 속도) · 7.9~11.2: 타원 궤도 · 11.2 이상: 지구를 벗어남(탈출 속도).
   궤도는 만유인력 법칙으로 직접 적분해 그려요(대기 저항 무시). */
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
    title: '탈출 속도와 궤도 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: 16 * KD, theta: 0.25, phi: 1.4, min: 5, max: 34 },
    autoRotate: 0,
    levels: [0, 3],
    build(ctx) {
      const { THREE, root, label, info, controls, scene } = ctx;
      const { V3, M, tube } = tools(THREE);
      const st = { v: 7.9, t: 0, hold: 0 };
      const RE = 1.8, MU = RE;                       // v_원 = √(μ/r) = 1 (= 7.9 km/s)
      const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d');
      g.fillStyle = '#1f6fb5'; g.fillRect(0, 0, 512, 256);
      let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < 70; i++) { const x = rnd() * 512, y = 30 + rnd() * 196, r = 8 + rnd() * 34; g.fillStyle = rnd() > 0.2 ? '#4a9d5c' : '#c9b873'; g.beginPath(); g.ellipse(x, y, r, r * 0.6, rnd() * 3, 0, TAU); g.fill(); }
      g.fillStyle = '#f1f5f9'; g.fillRect(0, 0, 512, 14); g.fillRect(0, 242, 512, 14);
      const tex = new THREE.CanvasTexture(c);
      const earth = new THREE.Mesh(new THREE.SphereGeometry(RE - 0.05, 64, 48), M(0xffffff, { map: tex, roughness: 0.75 })); root.add(earth);
      const atm = new THREE.Mesh(new THREE.SphereGeometry(RE * 1.03, 48, 32), new THREE.MeshBasicMaterial({ color: 0x74c0ff, transparent: true, opacity: 0.16, side: THREE.BackSide, depthWrite: false })); root.add(atm);
      const sat = new THREE.Group(); const body = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.2, 0.2), M(0xe5e7eb, { metalness: 0.7, roughness: 0.3 })); sat.add(body);
      [-1, 1].forEach((s) => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.5, 0.2), M(0x3b82f6, { metalness: 0.5 })); p.position.x = 0.0; p.position.z = s * 0.3; sat.add(p); });
      const fl = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 10), new THREE.MeshBasicMaterial({ color: 0xffa94d })); fl.rotation.z = Math.PI / 2; fl.position.x = -0.24; sat.add(fl); root.add(sat);
      const pad = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), M(0xff5a5f, { emissive: 0xff5a5f })); pad.position.set(0, RE, 0); root.add(pad);
      const lE = label('지구', [0, -RE * 0.4, RE * 0.9], { color: '#2563eb', size: 13, offset: [0, 0, 0] }), lPad = label('발사 위치', pad, { color: '#e2464b', size: 12, offset: [0, 0.35, 0] }), lT = label('', sat, { color: '#a16207', size: 13, offset: [0, 0.5, 0] });
      let path = null, pts = [], kind = '', pathLen = 1;
      const MAXR = 9.5;
      function integrate() {
        const v0 = st.v / 7.9;
        let x = 0, y = RE, vx = v0, vy = 0; const out = [[x, y]]; const dt = 0.01; let ang0 = Math.PI / 2, swept = 0, prev = Math.atan2(y, x), hit = false;
        for (let i = 0; i < 40000; i++) {
          const r2 = x * x + y * y, r = Math.sqrt(r2), a = -MU / (r2 * r);
          vx += a * x * dt * 0.5; vy += a * y * dt * 0.5; x += vx * dt; y += vy * dt; { const r2b = x * x + y * y, rb = Math.sqrt(r2b), ab = -MU / (r2b * rb); vx += ab * x * dt * 0.5; vy += ab * y * dt * 0.5; }
          if (i % 4 === 0) out.push([x, y]);
          const rr = Math.hypot(x, y); if (rr < RE * 0.995 && i > 30) { hit = true; break; } if (rr > MAXR) break;
          const an = Math.atan2(y, x); let d = an - prev; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; swept += d; prev = an; if (Math.abs(swept) > TAU * 1.0) break;
        }
        const E = 0.5 * v0 * v0 - MU / RE; kind = hit ? 'fall' : Math.abs(v0 - 1) < 0.015 ? 'circle' : v0 < Math.SQRT2 - 0.015 ? 'ellipse' : Math.abs(v0 - Math.SQRT2) <= 0.02 ? 'parab' : 'hyper';
        pts = out;
      }
      function build() {
        integrate();
        if (path) { root.remove(path); path.geometry.dispose(); }
        const vp = pts.map((p) => new V3(p[0], 0, -p[1] * 0 + p[1] * -1 * -1).set(p[0], p[1], 0));
        const sub = vp.filter((_, i) => i % 3 === 0 || i === vp.length - 1);
        path = tube(sub.length > 3 ? sub : vp, 0.032, kind === 'fall' ? 0xff8a65 : kind === 'circle' ? 0x34d399 : kind === 'ellipse' ? 0xfbbf24 : 0x60a5fa, { basic: true, op: 0.9 }); root.add(path);
        pathLen = pts.length; st.t = 0; st.hold = 0;
        const nm = { fall: '지구로 떨어져요', circle: '원 궤도 (첫 번째 우주 속도)', ellipse: '타원 궤도', parab: '탈출 속도에 딱 맞아요', hyper: '지구를 벗어나요 (탈출)' }[kind];
        info('<b>' + st.v.toFixed(1) + ' km/s → ' + nm + '</b><br>' + (kind === 'hyper' || kind === 'parab' ? '탈출 속도 = √2 × 7.9 ≈ 11.2 km/s. 이보다 빠르면 되돌아오지 않아요.' : '원 궤도 속력 7.9 km/s보다 느리면 떨어지고, 빠르면 타원이 길어져요.'));
      }
      const sc = controls.range('발사 속력', 4, 13, 0.1, st.v, (v) => { st.v = v; build(); }, (v) => v.toFixed(1) + ' km/s');
      controls.button('원 궤도 7.9', () => { st.v = 7.9; sc.set(7.9); build(); });
      controls.button('탈출 11.2', () => { st.v = 11.2; sc.set(11.2); build(); });
      build();
      return {
        update(dt) {
          earth.rotation.y += dt * 0.08;
          st.t += dt * 70 * Math.max(0.5, Math.min(1.5, st.v / 7.9)); let i = Math.floor(st.t);
          if (i >= pts.length - 1) { st.hold += dt; i = pts.length - 1; if (st.hold > 1.0) { st.t = 0; st.hold = 0; } }
          const p = pts[Math.min(i, pts.length - 1)], q = pts[Math.min(i + 1, pts.length - 1)];
          sat.position.set(p[0], p[1], 0); sat.rotation.z = Math.atan2(q[1] - p[1], q[0] - p[0]);
          lT.set((kind === 'fall' && i >= pts.length - 2) ? '추락!' : ''); lT.show(kind === 'fall' && i >= pts.length - 2);
        },
        sync() {},
      };
    },
  });
})();
