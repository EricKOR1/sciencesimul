/* hp-energy-level · 3D 보어 수소 원자 모형
   전자는 정해진 궤도(에너지 준위 n = 1, 2, 3 …)에만 있을 수 있어요. 에너지가 높은 궤도에서 낮은 궤도로 내려올 때
   두 준위의 에너지 차이만큼 빛(광자)을 내보내요: E = 13.6 eV × (1/n_f² − 1/n_i²), 파장 λ = 1240 / E (nm).
   바머 계열(n_f = 2)은 가시광선이에요. 궤도 반지름은 n²에 비례해요(그림은 축소). */
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
  function wl2rgb(nm) {
    let r = 0, g = 0, b = 0;
    if (nm >= 380 && nm < 440) { r = -(nm - 440) / 60; b = 1; } else if (nm < 490) { g = (nm - 440) / 50; b = 1; } else if (nm < 510) { g = 1; b = -(nm - 510) / 20; } else if (nm < 580) { r = (nm - 510) / 70; g = 1; } else if (nm < 645) { r = 1; g = -(nm - 645) / 65; } else if (nm <= 780) r = 1;
    if (nm < 380 || nm > 780) { r = 0.72; g = 0.55; b = 1; }
    return [r, g, b];
  }
  window.SciSim3D.attach({
    title: '수소 원자 에너지 준위 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: 10 * KD, theta: 0.3, phi: 0.95, min: 4, max: 26 },
    autoRotate: 0.08,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const { V3, M, tube } = tools(THREE);
      const st = { ni: 3, nf: 2, cur: 3, ang: 0, r: 0, jump: 0, ph: null, tx: 0 };
      const rad = (n) => 0.55 + 0.4 * n * n * 0.55 * (n > 1 ? 1 : 1);
      const R = (n) => [0, 0.8, 1.45, 2.15, 2.85, 3.55, 4.15][n] || 4.2;
      const nuc = new THREE.Mesh(new THREE.SphereGeometry(0.3, 32, 24), M(0xff6b6b, { emissive: 0x7f1d1d, roughness: 0.35 })); root.add(nuc);
      const lN = label('원자핵(양성자)', nuc, { color: '#e2464b', size: 12, offset: [0, 0.55, 0] });
      const orbs = [], labs = [];
      for (let n = 1; n <= 6; n++) {
        const o = new THREE.Mesh(new THREE.TorusGeometry(R(n), 0.014 + (n === 1 ? 0.004 : 0), 8, 140), new THREE.MeshBasicMaterial({ color: 0x9db8ff, transparent: true, opacity: 0.65 })); o.rotation.x = Math.PI / 2; root.add(o); orbs.push(o);
        if (n <= 4) { labs.push(label('n = ' + n, [R(n) * Math.cos(-0.6), 0, R(n) * Math.sin(-0.6)], { color: '#475569', size: 12 })); }
      }
      const el = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 16), M(0x4c8dff, { emissive: 0x1e3a8a, roughness: 0.3 })); root.add(el);
      const lE = label('전자', el, { color: '#2f6df6', size: 12, offset: [0, 0.42, 0] });
      const ph = new THREE.Group(); root.add(ph); ph.visible = false;
      const phm = new THREE.MeshBasicMaterial({ color: 0xff3b30 });
      const wave = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: 60 }, (_, i) => new V3(i * 0.05, 0.22 * Math.sin(i * 0.55), 0))), 120, 0.05, 8), phm); ph.add(wave);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), phm); head.position.x = 3.0; ph.add(head);
      const lPh = label('', head, { color: '#a16207', size: 13, offset: [0, 0.55, 0] });
      let msg = '', mode = 'emit';
      function colorFor(nm) { const c = wl2rgb(nm); phm.color.setRGB(c[0], c[1], c[2]); }
      function energy(ni, nf) { return 13.6 * Math.abs(1 / (nf * nf) - 1 / (ni * ni)); }
      function txt() {
        const ni = st.ni, nf = st.nf; const E = energy(ni, nf), nm = 1240 / E;
        info('<b>n = ' + ni + ' → n = ' + nf + ' : 빛을 ' + (ni > nf ? '내보내요' : '흡수해요') + '</b><br>에너지 차이 ΔE = ' + E.toFixed(2) + ' eV · 파장 ' + Math.round(nm) + ' nm<br>' + (nf === 2 && ni > nf ? '바머 계열: 가시광선이에요.' : nf === 1 ? '라이먼 계열: 자외선이에요.' : nf >= 3 ? '파셴 계열: 적외선이에요.' : ''));
        return { E, nm };
      }
      function fire() {
        st.cur = st.ni; st.jump = 0; st.stage = 'wait'; st.wait = 0.4; ph.visible = false; txt();
      }
      controls.segment('시작 궤도 n', [2, 3, 4, 5, 6].map((n) => ({ value: n, label: '' + n })), st.ni, (v) => { st.ni = v; if (st.nf >= v) { st.nf = Math.max(1, v - 1); fseg.set(st.nf); } fire(); });
      const fseg = controls.segment('→ 도착', [1, 2, 3].map((n) => ({ value: n, label: '' + n })), st.nf, (v) => { st.nf = v; if (st.ni <= v) { st.ni = v + 1; iseg.set(st.ni); } fire(); });
      const iseg = { set() {} };
      controls.button('▶ 다시 내려오기', () => fire());
      st.stage = 'wait'; st.wait = 0.6; txt();
      let pr = R(st.ni), pa = 0, phase = 0;
      return {
        update(dt, t) {
          const ni = st.ni, nf = st.nf; const e = energy(ni, nf), nm = 1240 / e;
          st.ang += dt * (2.4 / Math.pow(st.cur, 1.5) + 0.5);
          if (st.stage === 'wait') { st.wait -= dt; pr = R(st.cur); if (st.wait <= 0) st.stage = 'jump'; }
          else if (st.stage === 'jump') {
            st.jump += dt * 1.6; const f = Math.min(1, st.jump); pr = R(ni) + (R(nf) - R(ni)) * (f * f * (3 - 2 * f));
            if (f >= 1) { st.cur = nf; st.stage = 'photon'; st.px = 0; colorFor(nm); ph.visible = true; ph.rotation.y = -st.ang; lPh.set(Math.round(nm) + ' nm 광자'); st.dir = new V3(Math.cos(st.ang), 0, Math.sin(st.ang)); }
          } else if (st.stage === 'photon') {
            st.px += dt * 3.5; ph.position.copy(st.dir).multiplyScalar(R(nf) + st.px); ph.rotation.set(0, -Math.atan2(st.dir.z, st.dir.x), 0); wave.scale.x = 1; head.position.x = 3.0;
            ph.scale.setScalar(1); if (st.px > 7) { st.stage = 'hold'; st.wait = 1.0; ph.visible = false; }
          } else if (st.stage === 'hold') { st.wait -= dt; if (st.wait <= 0) { st.cur = ni; st.stage = 'jump'; st.jump = 0; st.stage = 'wait'; st.wait = 0.5; pr = R(ni); } }
          el.position.set(pr * Math.cos(st.ang), 0, pr * Math.sin(st.ang));
          orbs.forEach((o, i) => { const act = i + 1 === ni || i + 1 === nf; o.material.opacity = act ? 0.95 : 0.35; o.material.color.setHex(act ? 0xffffff : 0x9db8ff); });
          if (st.stage === 'photon') lPh.show(true); else lPh.show(false);
        },
        sync() {},
      };
    },
  });
})();
