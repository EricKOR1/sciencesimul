/* hq-laser · 3D 레이저 공진기 (이득 매질 · 두 거울 · 펌핑 · 유도 방출의 연쇄)
   펌핑으로 들뜬 원자가 많아지면(밀도 반전) 광자 하나가 같은 진동수·위상·방향의 광자를 더 만들어(유도 방출) 거울 사이를 오가며 세지고, 한쪽 일부 투과 거울로 레이저 빛이 나와요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  /* ---------- 공통 도우미 (모형 만들기) ---------- */
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches), KD = PHN ? 1.45 : 1;
  function H3(ctx) {
    const { THREE, root } = ctx;
    const V3 = THREE.Vector3, Yax = new V3(0, 1, 0);
    const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0.1 }, o || {}));
    const basic = (c, o) => new THREE.MeshBasicMaterial(Object.assign({ color: c }, o || {}));
    const glass = (c, op, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.25, metalness: 0.0, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide }, o || {}));
    /* 화살표 하나: setArrow(g, 시작점, 끝점) */
    function mkArrow(col, rad, o) {
      const g = new THREE.Group(); const m = (o && o.basic) ? basic(col) : mat(col, { roughness: 0.4, emissive: col, emissiveIntensity: 0.12 });
      const sh = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 1, 12), m);
      const hd = new THREE.Mesh(new THREE.ConeGeometry(rad * 2.6, rad * 6, 18), m);
      g.add(sh, hd); g.userData = { sh, hd, rad, m }; return g;
    }
    function setArrow(g, a, b) {
      const d = new V3().subVectors(b, a), len = d.length(); const { sh, hd, rad } = g.userData;
      if (len < 1e-3) { g.visible = false; return g; }
      g.visible = true; const hl = Math.min(len * 0.5, rad * 6);
      sh.scale.y = Math.max(0.001, len - hl); sh.position.y = (len - hl) / 2;
      hd.scale.y = hl / (rad * 6); hd.position.y = len - hl / 2;
      g.position.copy(a); g.quaternion.setFromUnitVectors(Yax, d.normalize()); return g;
    }
    /* 많은 화살표 (InstancedMesh): set(i, 위치, 방향, 길이, 색) 뒤에 flush() */
    function arrowSet(n, rad, o) {
      o = o || {};
      const sg = new THREE.CylinderGeometry(1, 1, 1, 8); sg.translate(0, 0.5, 0);
      const hg = new THREE.ConeGeometry(1, 1, 14); hg.translate(0, 0.5, 0);
      const m = mat(0xffffff, { roughness: 0.45, emissive: 0xffffff, emissiveIntensity: 0.18 });
      const sh = new THREE.InstancedMesh(sg, m, n), hd = new THREE.InstancedMesh(hg, m, n);
      const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new V3(), S = new V3(), C = new THREE.Color();
      const zero = new THREE.Matrix4().makeScale(0, 0, 0);
      for (let i = 0; i < n; i++) { sh.setMatrixAt(i, zero); hd.setMatrixAt(i, zero); sh.setColorAt(i, C.set(0xffffff)); hd.setColorAt(i, C); }
      const grp = new THREE.Group(); grp.add(sh, hd);
      return {
        group: grp, n,
        set(i, p, dir, len, col) {
          if (len < 0.02) { sh.setMatrixAt(i, zero); hd.setMatrixAt(i, zero); return; }
          const hl = Math.min(len * 0.55, rad * 6.5), hr = Math.min(rad * 2.7, hl * 0.5);
          Q.setFromUnitVectors(Yax, dir);
          S.set(rad, Math.max(0.001, len - hl), rad); M.compose(p, Q, S); sh.setMatrixAt(i, M);
          P.copy(dir).multiplyScalar(len - hl).add(p); S.set(hr, hl, hr); M.compose(P, Q, S); hd.setMatrixAt(i, M);
          if (col != null) { C.set(col); sh.setColorAt(i, C); hd.setColorAt(i, C); }
        },
        hide(i) { sh.setMatrixAt(i, zero); hd.setMatrixAt(i, zero); },
        flush() { sh.instanceMatrix.needsUpdate = hd.instanceMatrix.needsUpdate = true; if (sh.instanceColor) sh.instanceColor.needsUpdate = hd.instanceColor.needsUpdate = true; },
      };
    }
    /* 가는 막대(선분): setSeg(m, a, b) */
    function mkSeg(col, rad, o) { return new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 1, 8), (o && o.basic) ? basic(col, o.mo) : mat(col, o && o.mo)); }
    function setSeg(m, a, b) { const d = new V3().subVectors(b, a), l = d.length(); if (l < 1e-3) { m.visible = false; return m; } m.visible = true; m.scale.y = l; m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(Yax, d.normalize()); return m; }
    function anchor(g, x, y, z) { const o = new THREE.Object3D(); o.position.set(x || 0, y || 0, z || 0); g.add(o); return o; }
    function sphere(r, c, o) { return new THREE.Mesh(new THREE.SphereGeometry(r, r < 0.35 ? 22 : 36, r < 0.35 ? 14 : 24), mat(c, o)); }
    function tube(pts, r, c, o) {
      const curve = Array.isArray(pts) ? new THREE.CatmullRomCurve3(pts) : pts;
      return new THREE.Mesh(new THREE.TubeGeometry(curve, (o && o.seg) || 80, r, (o && o.rs) || 8, !!(o && o.closed)), (o && o.basic) ? basic(c, o.mo) : mat(c, o && o.mo));
    }
    function box(w, h, d, c, o) { return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c, o)); }
    function cyl(rt, rb, h, c, o, seg) { return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 32), mat(c, o)); }
    function fib(n) { // 구 위에 고르게 퍼진 방향
      const out = [], ga = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < n; i++) { const y = 1 - (i + 0.5) / n * 2, r = Math.sqrt(1 - y * y), a = ga * i; out.push(new V3(Math.cos(a) * r, y, Math.sin(a) * r)); }
      return out;
    }
    /* 장면별 조작 줄: grab(장면, 만들기) → 나중에 showCtl(장면) */
    const bar = ctx.renderer.domElement.parentNode.parentNode.querySelector('.v3-ctl');
    const ctlBy = {};
    function grab(sc, fn) { const b = bar.children.length; const r = fn(); (ctlBy[sc] = ctlBy[sc] || []).push.apply(ctlBy[sc], [].slice.call(bar.children, b)); return r; }
    function showCtl(sc) { Object.keys(ctlBy).forEach((k) => ctlBy[k].forEach((n) => { n.style.display = (k === sc || k === '*') ? '' : 'none'; })); }
    function toggleBtn(sc, text, on, fn) {
      const b = grab(sc, () => ctx.controls.button('', () => { on = !on; draw(); fn(on); }));
      const draw = () => { b.textContent = text + (on ? ' ✓' : ' ✕'); b.classList.toggle('on', on); };
      draw(); return { set(v) { on = v; draw(); }, get on() { return on; } };
    }
    return { V3, Yax, mat, basic, glass, mkArrow, setArrow, arrowSet, mkSeg, setSeg, anchor, sphere, tube, box, cyl, fib, grab, showCtl, toggleBtn };
  }
  window.SciSim3D.attach({
    title: '레이저 공진기 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: 17 * KD, theta: 0.5, phi: 1.22, min: 7, max: 34, target: [1.4, 0, 0] },
    autoRotate: 0,
    levels: [1, 2],
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const h = H3(ctx); const { V3, mat, glass, anchor, sphere, box, cyl, tube } = h;
      const lessonS = () => (window.__sim && window.__sim.S) || null;
      const S0 = lessonS();
      const st = { P: 0.3, R: 0.9, N2: 0, q: 0.003 };
      const XL = -5, XR = 5;
      /* 이득 매질(막대) · 거울 · 램프 */
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 9.2, 40, 1, false), new THREE.MeshStandardMaterial({ color: 0xff9aa8, roughness: 0.15, transparent: true, opacity: 0.22, depthWrite: false, emissive: 0xff3b3b, emissiveIntensity: 0 })); rod.rotation.z = Math.PI / 2; root.add(rod);
      const mL = cyl(1.5, 1.5, 0.22, 0xdfe6f2, { metalness: 0.95, roughness: 0.12 }, 48); mL.rotation.z = Math.PI / 2; mL.position.x = XL - 0.3; root.add(mL);
      const mR = cyl(1.5, 1.5, 0.22, 0xbcd7ff, { metalness: 0.7, roughness: 0.15, transparent: true, opacity: 0.6 }, 48); mR.rotation.z = Math.PI / 2; mR.position.x = XR + 0.3; root.add(mR);
      const lampPts = []; for (let i = 0; i <= 140; i++) { const s = i / 140, a = s * Math.PI * 2 * 7; lampPts.push(new V3(-4 + 8 * s, 1.75 * Math.cos(a), 1.75 * Math.sin(a))); }
      const lamp = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(lampPts), 280, 0.09, 8, false), mat(0xfff1b0, { emissive: 0xffe27a, emissiveIntensity: 0, roughness: 0.3 })); root.add(lamp);
      /* 원자 */
      const NA = 110, atoms = [];
      const aM = new THREE.InstancedMesh(new THREE.SphereGeometry(0.14, 12, 8), mat(0xffffff, { roughness: 0.4, emissive: 0xffffff, emissiveIntensity: 0.5 }), NA); root.add(aM);
      for (let i = 0; i < NA; i++) { const a = Math.random() * 6.283, r = Math.sqrt(Math.random()) * 0.95; atoms.push({ x: -4.1 + 8.2 * Math.random(), y: r * Math.cos(a), z: r * Math.sin(a), on: false }); }
      const Mx = new THREE.Matrix4(), Cc = new THREE.Color(), Sc = new V3(), Z0 = new THREE.Matrix4().makeScale(0, 0, 0), Qi = new THREE.Quaternion();
      /* 광자 */
      const NP = 70, phs = [];
      const pM = new THREE.InstancedMesh(new THREE.SphereGeometry(0.16, 10, 8), mat(0xff5252, { emissive: 0xff2d2d, emissiveIntensity: 1.2, roughness: 0.3 }), NP); root.add(pM);
      for (let i = 0; i < NP; i++) phs.push({ x: XL + Math.random() * 10, y: (Math.random() - 0.5) * 1.1, z: (Math.random() - 0.5) * 1.1, d: Math.random() < 0.5 ? 1 : -1 });
      /* 출력 빔 */
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 7.5, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xff3030, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })); beam.rotation.z = Math.PI / 2; beam.position.x = XR + 4.1; root.add(beam);
      const core = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 7.5, 12, 1, false), new THREE.MeshBasicMaterial({ color: 0xffd0d0, transparent: true, opacity: 0 })); core.rotation.z = Math.PI / 2; core.position.x = XR + 4.1; root.add(core);
      /* 이름표 */
      const lM1 = label('전반사 거울', anchor(root, XL - 0.3, 1.9, 0), { color: '#475569', size: 12 }), lM2 = label('일부 투과 거울', anchor(root, XR + 0.3, 1.9, 0), { color: '#475569', size: 12 });
      const lRod = label('이득 매질 (루비 막대)', anchor(root, 0, -1.7, 0), { color: '#be123c', size: 12 }), lLamp = label('펌핑 (섬광 램프)', anchor(root, -2.4, 2.05, 0.3), { color: '#a16207', size: 12 });
      const lOut = label('레이저 빛', anchor(root, XR + 5.0, 0.75, 0), { color: '#b91c1c', size: 13 }), lN = label('', anchor(root, 0, 2.3, 0), { color: '#475569', size: 12 });
      controls.range('펌핑 세기', 0, 1, 0.05, st.P, (v) => { st.P = v; txt(); }, (v) => Math.round(v * 100) + '%');
      controls.range('출구 거울 반사율', 0.7, 0.99, 0.03, st.R, (v) => { st.R = v; txt(); }, (v) => Math.round(v * 100) + '%');
      controls.button('↺ 처음부터', () => { st.N2 = 0; st.q = 0.003; });
      function thr() { const L = 0.3 + 4 * (1 - st.R), n2 = L / 1.8; return (n2 / (1 - n2)) / 1.2; }
      function txt() {
        const th = thr(), on = st.q > 0.05;
        info(st.P < 0.05 ? '<b>펌핑이 없어요</b>: 원자가 대부분 바닥 상태예요. 펌핑을 올려 보세요.'
          : (on ? '<b>레이저 발진!</b> 유도 방출한 광자는 진동수·위상·방향이 같아요. 거울 사이를 오가며 빛이 점점 세지고 일부가 오른쪽으로 나와요.<br>들뜬 원자(N₂)가 바닥 상태(N₁)보다 많은 <b>밀도 반전</b>이어야 증폭돼요.'
            : '<b>아직 레이저가 아니에요</b>: 들뜬 원자가 자발 방출로 사방에 약한 빛만 내요.<br>펌핑 세기가 문턱(약 ' + Math.round(th * 100) + '%)을 넘어야 유도 방출이 연쇄적으로 일어나요.'));
      }
      txt();
      let outV = 0, tx = 0;
      return {
        update(dt, t) {
          dt = Math.min(dt, 0.05);
          const L = 0.3 + 4 * (1 - st.R), G = 1.8, A = 1.2, B = 1.0;
          for (let s = 0; s < 3; s++) { const d = dt; const n2 = st.N2, q = st.q; st.N2 = Math.max(0, Math.min(1, n2 + (A * st.P * (1 - n2) - B * n2 - G * n2 * q * 3.0) * d)); st.q = Math.max(0.0, Math.min(1.2, q + (G * n2 * q - L * q + 0.02 * n2) * d)); }
          const nv = Math.min(NP, Math.round(st.q * 160)), out = Math.max(0, (1 - st.R) * st.q * 5);
          outV += (out - outV) * Math.min(1, dt * 4);
          const on = st.q > 0.05;
          // 원자: 들뜬 확률 N2
          for (let i = 0; i < NA; i++) {
            const a = atoms[i]; if (Math.random() < dt * 3) a.on = Math.random() < st.N2;
            Sc.setScalar(a.on ? 1.35 : 0.85); Mx.compose(new V3(a.x, a.y, a.z), Qi, Sc); aM.setMatrixAt(i, Mx); aM.setColorAt(i, Cc.set(a.on ? 0xff7a3d : 0x8b93a7));
          }
          aM.instanceMatrix.needsUpdate = true; aM.instanceColor.needsUpdate = true;
          // 광자: 거울 사이를 왕복
          for (let i = 0; i < NP; i++) {
            const p = phs[i];
            if (i >= nv) { pM.setMatrixAt(i, Z0); continue; }
            p.x += p.d * 9 * dt;
            if (p.x > XR) { p.x = XR; p.d = -1; } else if (p.x < XL) { p.x = XL; p.d = 1; }
            Sc.set(1.9, 0.8, 0.8); Mx.compose(new V3(p.x, p.y * 0.9, p.z * 0.9), Qi, Sc); pM.setMatrixAt(i, Mx);
          }
          pM.instanceMatrix.needsUpdate = true;
          // 불빛
          lamp.material.emissiveIntensity = st.P * 1.6 * (0.8 + 0.2 * Math.sin(t * 30));
          rod.material.emissiveIntensity = 0.1 + 0.9 * st.N2 * (on ? 0.5 : 1) * 0.6;
          beam.material.opacity = Math.min(0.55, outV * 0.5); core.material.opacity = Math.min(0.95, outV * 1.4);
          const w = 0.12 + Math.min(0.12, outV * 0.06); beam.scale.set(1, 1, 1); beam.scale.x = beam.scale.z = w / 0.2 * 1.2;
          lOut.show(outV > 0.12);
          lN.set('들뜬 원자 ' + atoms.filter((a) => a.on).length + ' / ' + NA + (st.N2 > 0.4 ? ' (N₂ > N₁ : 밀도 반전)' : ''));
          if (Math.round(t * 4) !== tx) { tx = Math.round(t * 4); txt(); }
        },
        sync() {},
      };
    },
  });
})();
