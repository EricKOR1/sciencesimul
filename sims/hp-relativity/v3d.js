/* hp-relativity · 3D 빛시계로 보는 시간 팽창 · 길이 수축
   빛시계: 두 거울 사이를 빛이 오가요(한 번 오가면 '똑딱' 한 번). 움직이는 시계는 빛이 비스듬히 가야 해서 경로가 길고,
   빛의 속력은 같으므로 똑딱이 느려요: Δt = γΔt₀, γ = 1/√(1−v²/c²). 길이는 운동 방향으로 L = L₀/γ. */
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
    title: '시간 팽창과 길이 수축 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: 12.5 * KD, theta: 0.2, phi: 1.2, min: 5, max: 28, target: [0, 1.2, 0] },
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const { V3, M, mkArrow, setArrow, tube, grid } = tools(THREE);
      const st = { b: 0.6, mode: 'clock', t: 0 };
      const gC = new THREE.Group(), gL = new THREE.Group(); root.add(gC, gL);
      const H = 2.6;                                    // 거울 사이 간격
      grid(18, 5, 1, 0x7a8fb3, 0).material;
      const gr = grid(20, 6, 1, 0x7a8fb3, -0.02, 0.2); root.add(gr);
      /* ---- 빛시계 ---- */
      function clock(col, y0) {
        const g = new THREE.Group(); g.position.y = y0;
        const bot = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 0.9), M(0xcbd5e1, { metalness: 0.9, roughness: 0.1 })), top = bot.clone(); top.position.y = H; g.add(bot, top);
        const rod = [-0.7, 0.7].map((x) => { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, H, 8), M(col, { transparent: true, opacity: 0.55 })); r.position.set(x, H / 2, -0.4); g.add(r); return r; });
        const ph = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 14), new THREE.MeshBasicMaterial({ color: 0xffe66d })); g.add(ph);
        const glow = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0.25, depthWrite: false })); ph.add(glow);
        root.add(g); gC.add(g); return { g, ph, bot, top };
      }
      const c0 = clock(0x34d399, 0), c1 = clock(0x60a5fa, 0);
      c0.g.position.set(-3.6, 0, 0);
      const trail = []; const trailG = new THREE.Group(); gC.add(trailG);
      const lA = label('정지한 시계', c0.g, { color: '#059669', size: 12, offset: [0, H + 0.7, 0] }), lB = label('움직이는 시계', c1.g, { color: '#2563eb', size: 12, offset: [0, H + 0.7, 0] });
      const lt0 = label('', c0.g, { color: '#059669', size: 13, offset: [0, -0.55, 0] }), lt1 = label('', c1.g, { color: '#2563eb', size: 13, offset: [0, -0.55, 0] });
      const vA = mkArrow(0xffd34d, 0.05); gC.add(vA); const lv = label('속도 v', vA, { color: '#a16207', size: 12, offset: [0, 0.3, 0] });
      /* ---- 길이 수축 ---- */
      function ship(col, scaleless) {
        const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 4, 24), M(col, { roughness: 0.3, metalness: 0.5 })); b.rotation.z = Math.PI / 2; g.add(b);
        const n = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.0, 24), M(0xef4444, { roughness: 0.3, metalness: 0.4 })); n.rotation.z = -Math.PI / 2; n.position.x = 2.5; g.add(n);
        [-1, 1].forEach((s) => { const f = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.9), M(0x64748b)); f.position.set(-1.6, 0, s * 0.6); g.add(f); });
        const w = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), M(0x93c5fd, { emissive: 0x1e40af })); w.position.set(0.8, 0.28, 0.4); g.add(w);
        return g;
      }
      const s0 = ship(0xe5e7eb), sg = ship(0x94a3b8);
      s0.position.set(0, 1.0, 1.6); sg.position.set(0, 1.0, -1.6); gL.add(s0, sg);
      sg.traverse((o) => { if (o.material) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.28; o.material.depthWrite = false; } });
      const meas = new THREE.Mesh(new THREE.BoxGeometry(1, 0.04, 0.04), M(0xfbbf24)); meas.position.set(0, -0.3, 1.6); gL.add(meas);
      const lS = label('운동하는 우주선', s0, { color: '#475569', size: 12, offset: [0, 1.0, 0] }), lG = label('멈춰 있을 때 길이 L₀', sg, { color: '#475569', size: 12, offset: [0, 1.0, 0] }), lL = label('', meas, { color: '#a16207', size: 12, offset: [0, -0.35, 0] });
      function txt() {
        const g = 1 / Math.sqrt(1 - st.b * st.b);
        info(st.mode === 'clock' ? '<b>v = ' + st.b.toFixed(2) + 'c · γ = ' + g.toFixed(2) + '</b><br>움직이는 시계는 빛이 더 먼 길을 가요 → 똑딱이 <b>' + g.toFixed(2) + '배 느려요</b>.<br>(정지한 사람이 볼 때)' : '<b>v = ' + st.b.toFixed(2) + 'c · γ = ' + g.toFixed(2) + '</b><br>움직이는 방향의 길이는 L = L₀/γ = <b>' + (100 / g).toFixed(0) + '%</b>로 줄어들어요.<br>수직 방향 길이는 변하지 않아요.');
        lt0.show(st.mode === 'clock'); lt1.show(st.mode === 'clock');
      }
      function setMode() {
        gC.visible = st.mode === 'clock'; gL.visible = st.mode === 'ship'; [lA, lB, lt0, lt1, lv].forEach((l) => l.show(st.mode === 'clock')); [lS, lG, lL].forEach((l) => l.show(st.mode === 'ship'));
        ctx.orbit.ty = st.mode === 'clock' ? 1.3 : 1.0; txt();
      }
      controls.segment('보기', [{ value: 'clock', label: '🕒 빛시계' }, { value: 'ship', label: '🚀 길이 수축' }], st.mode, (v) => { st.mode = v; setMode(); });
      controls.range('속력 v', 0, 0.95, 0.05, st.b, (v) => { st.b = v; reset(); txt(); }, (v) => v.toFixed(2) + 'c');
      function reset() { st.t = 0; st.n0 = 0; st.n1 = 0; trailG.children.slice().forEach((c) => { trailG.remove(c); c.geometry.dispose(); }); trail.length = 0; st.px = -0.5; }
      reset(); setMode();
      const T0 = 2.0;                                        // 정지 시계의 한 번 오가는 시간 (화면 시간)
      return {
        update(dt) {
          const b = st.b, g = 1 / Math.sqrt(1 - b * b);
          if (st.mode === 'clock') {
            st.t += dt;
            const u0 = (st.t % T0) / T0, y0 = u0 < 0.5 ? u0 * 2 * H : (1 - u0) * 2 * H; c0.ph.position.set(0, y0, 0); c0.ph.position.y += 0.06;
            st.n0 = Math.floor(st.t / T0);
            // 움직이는 시계: 화면 시간에서 한 번 오가는 시간 = g*T0, 수평 속도 = b*c, c = 2H/T0 (정지 시계 기준)
            const c = 2 * H / T0, Tm = g * T0, vx = b * c, u1 = (st.t % Tm) / Tm; const half = Tm / 2;
            const yy = u1 < 0.5 ? (u1 * 2) * H : (1 - u1) * 2 * H;
            const span = vx * Tm;                                  // 한 주기에 움직인 거리
            const x = ((st.t * vx) % 10) - 1.0 - 0; const xx = x;
            c1.g.position.set(-1.0 + ((st.t * vx * 0.5) % 7.0) - 0, 0, 0);
            c1.ph.position.set(0, yy + 0.06, 0);
            // 경로 자취 (월드): 광자의 월드 위치 기록
            const wp = new V3(c1.g.position.x, yy + 0.06, 0);
            if (st.t % 0.04 < dt) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), new THREE.MeshBasicMaterial({ color: 0xffe66d, transparent: true, opacity: 0.6 })); d.position.copy(wp); trailG.add(d); trail.push({ d, age: 0 }); }
            trail.forEach((q) => { q.age += dt; q.d.material.opacity = Math.max(0, 0.7 - q.age * 0.45); }); while (trail.length && trail[0].age > 1.6) { const q = trail.shift(); trailG.remove(q.d); q.d.geometry.dispose(); }
            if (c1.g.position.x > 5.6) reset();
            const n1 = Math.floor(st.t / Tm); lt0.set('똑딱 ' + st.n0 + '번'); lt1.set('똑딱 ' + n1 + '번');
            setArrow(vA, new V3(c1.g.position.x - 0.5, H + 0.4, 0), new V3(c1.g.position.x - 0.5 + 0.3 + b * 1.4, H + 0.4, 0)); vA.visible = b > 0.02; lv.show(b > 0.02);
          } else {
            const f = 1 / g; const L0 = 4; s0.scale.x = f; s0.children.forEach((ch) => { }); meas.scale.x = L0 * f * 1.3 + 0.001; meas.position.x = 0.0; lL.set('L = ' + (f * 100).toFixed(0) + '% L₀');
            s0.position.x = Math.sin(performance.now() / 2400) * 0.3 * b * 3; 
          }
        },
        sync() {},
      };
    },
  });
})();
