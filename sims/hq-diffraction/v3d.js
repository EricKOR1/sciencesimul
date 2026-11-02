/* hq-diffraction · 3D 물결 탱크의 회절 (틈 폭 a와 파장 λ)
   틈을 지난 파동은 틈의 각 점이 새 파원이 되어(호이겐스 원리) 퍼져 나가요. 틈이 좁을수록, 파장이 길수록 더 많이 퍼져요 (a ≲ λ이면 거의 반원). */
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
    title: '물결 탱크 회절 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: 15.5 * KD, theta: -0.35, phi: 0.95, min: 7, max: 30, target: [1.0, -0.4, 0] },
    autoRotate: 0,
    levels: [0],
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const h = H3(ctx); const { V3, mat, glass, anchor, sphere, box, cyl } = h;
      const lessonS = () => (window.__sim && window.__sim.S) || null;
      const S0 = lessonS();
      const st = { a: 2.0, lam: 1.2 };
      if (S0 && S0.df) { st.a = Math.max(0.4, Math.min(4, (S0.df.aCm || 8) / 4)); st.lam = Math.max(0.8, Math.min(2, (S0.df.lamCm || 2) * 0.6)); }
      const X0 = -6.5, X1 = 8, YH = 4.2, XB = -2.5;
      const NX = 112, NY = 64;
      const geo = new THREE.PlaneGeometry(X1 - X0, 2 * YH, NX, NY); geo.rotateX(-Math.PI / 2);        // x–z 평면 위의 수면 (z = 폭 방향)
      const pos = geo.attributes.position, col = new Float32Array(pos.count * 3); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const base = []; for (let i = 0; i < pos.count; i++) base.push([pos.getX(i) + (X0 + X1) / 2, pos.getZ(i)]);
      for (let i = 0; i < pos.count; i++) pos.setX(i, base[i][0]);
      const water = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.18, metalness: 0.15 })); root.add(water);
      /* 탱크 테두리 */
      const rimM = mat(0x64748b, { metalness: 0.5, roughness: 0.4 });
      const rim = (w, d, x, z) => { const m = box(w, 0.35, d, 0x64748b, { metalness: 0.5, roughness: 0.4 }); m.position.set(x, -0.15, z); root.add(m); };
      rim(X1 - X0 + 0.6, 0.3, (X0 + X1) / 2, YH + 0.15); rim(X1 - X0 + 0.6, 0.3, (X0 + X1) / 2, -YH - 0.15); rim(0.3, 2 * YH, X0 - 0.15, 0); rim(0.3, 2 * YH, X1 + 0.15, 0);
      /* 방해벽 */
      const wallM = mat(0x94a3b8, { metalness: 0.5, roughness: 0.4 });
      const wU = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.1, 1), wallM), wD = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.1, 1), wallM); root.add(wU, wD);
      const aW = anchor(root, XB, 1.0, 0), lW = label('', aW, { color: '#475569', size: 13 });
      const lI = label('들어오는 평면 파동', anchor(root, -4.4, 0.8, -2.8), { color: '#1d4ed8', size: 12 }), lD = label('퍼져 나가는 파동', anchor(root, 3.8, 0.8, 2.6), { color: '#0f766e', size: 12 });
      const lInfo = label('', anchor(root, XB, 0.4, 0), { color: '#b45309', size: 13, offset: [0, 1.4, 0] });
      /* 호이겐스 파원 */
      let src = [], k = 2 * Math.PI / st.lam, w = 3.2, NA = 8;
      function setup() {
        k = 2 * Math.PI / st.lam;
        NA = Math.max(5, Math.min(16, Math.ceil(st.a / (st.lam / 3))));
        src = []; for (let j = 0; j < NA; j++) src.push(-st.a / 2 + st.a * (j + 0.5) / NA);
        const hh = (YH - st.a / 2); wU.scale.z = hh; wU.position.set(XB, 0.25, st.a / 2 + hh / 2); wD.scale.z = hh; wD.position.set(XB, 0.25, -st.a / 2 - hh / 2);
        lW.set('틈 폭 a = ' + st.a.toFixed(1) + ' · 파장 λ = ' + st.lam.toFixed(1));
        const r = st.a / st.lam;
        lInfo.set(r < 1.2 ? 'a ≈ λ → 크게 퍼져요' : r < 2.5 ? 'a가 λ보다 조금 커요' : 'a ≫ λ → 거의 직진');
        info('<b>틈 폭 ÷ 파장 = ' + r.toFixed(1) + '</b><br>' + (r < 1.2 ? '틈이 파장과 비슷하거나 더 좁아서 파동이 <b>부채꼴·반원</b>으로 크게 퍼져요 (회절).' : r < 2.5 ? '틈이 조금 넓어졌어요. 가운데는 센 파동, 가장자리로 퍼지는 파동도 남아요.' : '틈이 파장보다 훨씬 넓어서 파동이 <b>거의 직진</b>하고 가장자리만 살짝 퍼져요.') + '<br>파장이 길수록, 틈이 좁을수록 더 많이 휘어 퍼져요.');
      }
      controls.range('틈 폭 a', 0.4, 4, 0.2, st.a, (v) => { st.a = v; setup(); }, (v) => v.toFixed(1));
      controls.range('파장 λ', 0.8, 2.0, 0.1, st.lam, (v) => { st.lam = v; setup(); }, (v) => v.toFixed(1));
      setup();
      const cLo = new THREE.Color(0x0b3a6b), cHi = new THREE.Color(0x7fd6ff), cMid = new THREE.Color(0x1769b3), tc = new THREE.Color();
      let frame = 0;
      return {
        update(dt, t) {
          frame++;
          const wt = w * t, n = pos.count;
          for (let i = 0; i < n; i++) {
            const x = base[i][0], z = base[i][1]; let u;
            if (x < XB - 0.22) { u = Math.cos(k * (x - XB) - wt); }
            else if (x < XB + 0.22) { u = Math.abs(z) < st.a / 2 ? Math.cos(-wt) : 0; }
            else {
              let s = 0; const dx = x - XB;
              for (let j = 0; j < NA; j++) { const dz = z - src[j], r = Math.sqrt(dx * dx + dz * dz) + 1e-3; s += Math.cos(k * r - wt + Math.PI / 4) / Math.sqrt(r); }
              u = s * (st.a / NA) * Math.sqrt(k / (2 * Math.PI));
            }
            const edge = Math.min(1, (X1 - x) / 1.2, (z + YH) / 0.8, (YH - z) / 0.8);          // 가장자리에서 파도가 잦아들게
            u *= Math.max(0, edge);
            if (u > 1.6) u = 1.6; else if (u < -1.6) u = -1.6;
            pos.setY(i, u * 0.2);
            const f = (u + 1.2) / 2.4, a = Math.max(0, Math.min(1, f));
            if (a < 0.5) tc.copy(cLo).lerp(cMid, a * 2); else tc.copy(cMid).lerp(cHi, (a - 0.5) * 2);
            col[i * 3] = tc.r; col[i * 3 + 1] = tc.g; col[i * 3 + 2] = tc.b;
          }
          pos.needsUpdate = true; geo.attributes.color.needsUpdate = true; geo.computeVertexNormals();
        },
        sync() {},
      };
    },
  });
})();
