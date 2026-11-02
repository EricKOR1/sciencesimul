/* hp-field-potential · 3D 전기장과 전위 (전위 지형)
   전위 V를 '높이'로 그렸어요. (+)전하는 언덕, (−)전하는 골짜기예요. 전기장은 전위가 낮아지는 쪽(내리막)을 가리켜요.
   등전위선은 같은 높이를 이은 선이에요. (+)시험 전하는 전기장 방향으로 가속되어 내리막을 굴러가요. */
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
    title: '전기장과 전위 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: 12 * KD, theta: 0.5, phi: 1.0, min: 5, max: 28, target: [0, 0.4, 0] },
    autoRotate: 0.1,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const { V3, M, mkArrow, setArrow } = tools(THREE);
      const st = { cfg: 'dip', field: true };
      const W = 10, N = 120;
      const geo = new THREE.PlaneGeometry(W, W, N, N); geo.rotateX(-Math.PI / 2);
      const pos = geo.attributes.position, col = new Float32Array(pos.count * 3); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.05, side: THREE.DoubleSide });
      const surf = new THREE.Mesh(geo, mat); surf.receiveShadow = true; surf.castShadow = true; root.add(surf);
      const charges = []; const chG = new THREE.Group(); root.add(chG);
      const arrows = []; const arG = new THREE.Group(); root.add(arG);
      for (let i = 0; i < 49; i++) { const a = mkArrow(0xffffff, 0.022); arG.add(a); arrows.push(a); }
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), M(0xff5a5f, { emissive: 0x7f1d1d, roughness: 0.3 })); ball.castShadow = true; root.add(ball);
      const ballL = label('(+)시험 전하', ball, { color: '#e2464b', size: 12, offset: [0, 0.5, 0] });
      const lH = label('(+) 언덕: 전위 높음', [0, 0, 0], { color: '#dc2626', size: 12 }), lL = label('(−) 골짜기: 전위 낮음', [0, 0, 0], { color: '#2563eb', size: 12 });
      const HS = 0.55, CL = 2.6;
      let Q = [];                                    // [x, z, q]
      function V(x, z) {
        if (st.cfg === 'plate') return clamp(-x * 0.55, -3, 3) * 0.78;
        let v = 0; Q.forEach((c) => { const r = Math.sqrt((x - c[0]) ** 2 + (z - c[1]) ** 2 + 0.22); v += c[2] / r; }); return v;
      }
      function build() {
        Q = st.cfg === 'dip' ? [[-2.4, 0, 1], [2.4, 0, -1]] : st.cfg === 'same' ? [[-2.3, 0, 1], [2.3, 0, 1]] : st.cfg === 'one' ? [[0, 0, 1]] : [];
        for (let i = 0; i < pos.count; i++) {
          const x = pos.array[i * 3], z = pos.array[i * 3 + 2], v = V(x, z), h = clamp(v * HS * 2.0, -2.2, 2.4);
          pos.array[i * 3 + 1] = h;
          const t = clamp(v / 2.2, -1, 1), band = 0.5 + 0.5 * Math.cos(v * 9.5), shade = 0.82 + 0.18 * band;
          const r = t > 0 ? 0.5 + 0.5 * t : 0.5 + 0.28 * t, g = 0.52 - 0.3 * Math.abs(t), b = t < 0 ? 0.55 - 0.45 * t : 0.55 - 0.45 * t;
          col[i * 3] = (t > 0 ? 0.75 + 0.25 * t : 0.35 + 0.35 * (1 + t)) * shade; col[i * 3 + 1] = (0.55 - 0.3 * Math.abs(t) + 0.15 * (1 - Math.abs(t))) * shade; col[i * 3 + 2] = (t < 0 ? 0.75 + 0.25 * -t : 0.4 + 0.2 * (1 - t)) * shade;
        }
        pos.needsUpdate = true; geo.attributes.color.needsUpdate = true; geo.computeVertexNormals();
        // 전하 막대
        chG.children.slice().forEach((c) => { chG.remove(c); });
        charges.length = 0;
        Q.forEach((c) => {
          const s = new THREE.Mesh(new THREE.SphereGeometry(0.32, 28, 20), M(c[2] > 0 ? 0xff5a5f : 0x4c8dff, { roughness: 0.3, emissive: c[2] > 0 ? 0x7f1d1d : 0x1e3a8a })); s.position.set(c[0], clamp(V(c[0], c[1]) * HS * 2.0, -2.2, 2.4) + 0.4, c[1]); chG.add(s); charges.push(s);
        });
        if (st.cfg === 'plate') { [-4.6, 4.6].forEach((x, i) => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.4, 6), M(i ? 0x4c8dff : 0xff5a5f, { transparent: true, opacity: 0.75, roughness: 0.3 })); p.position.set(x, clamp(V(x, 0) * HS * 2.0, -2.2, 2.4) + 0.7, 0); chG.add(p); }); }
        // 전기장 화살표
        let ai = 0;
        for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) {
          const x = i * 1.35, z = j * 1.35, a = arrows[ai++]; const e = 0.02; const ex = -(V(x + e, z) - V(x - e, z)) / (2 * e), ez = -(V(x, z + e) - V(x, z - e)) / (2 * e), mag = Math.hypot(ex, ez);
          const cl = Q.some((c) => Math.hypot(x - c[0], z - c[1]) < 0.9);
          if (cl || mag < 0.03) { a.visible = false; continue; }
          const len = clamp(0.25 + 0.35 * Math.log10(1 + mag * 6), 0.2, 0.8), y = clamp(V(x, z) * HS * 2.0, -2.2, 2.4) + 0.14;
          setArrow(a, new V3(x - ex / mag * len / 2, y, z - ez / mag * len / 2), new V3(x + ex / mag * len / 2, y, z + ez / mag * len / 2)); a.visible = st.field;
        }
        arG.visible = st.field;
        lH.show(st.cfg !== 'plate' && Q.some((c) => c[2] > 0)); lL.show(st.cfg === 'dip'); 
        const p0 = Q.find((c) => c[2] > 0), n0 = Q.find((c) => c[2] < 0);
        lH.obj = p0 ? [p0[0], clamp(V(p0[0], p0[1]) * HS * 2, -2.2, 2.4) + 1.0, p0[1]] : [0, 0, 0]; lL.obj = n0 ? [n0[0], clamp(V(n0[0], n0[1]) * HS * 2, -2.2, 2.4) + 0.9, n0[1]] : [0, 0, 0];
        info(st.cfg === 'dip' ? '<b>(+)와 (−) 전하</b><br>전기장은 (+)에서 나와 (−)로 들어가요. 언덕에서 골짜기 쪽(내리막)이에요.<br>등전위선(색 띠)은 전기장과 늘 수직이에요.'
          : st.cfg === 'same' ? '<b>같은 부호의 두 전하</b><br>두 언덕 사이 한가운데는 전기장이 0이에요(안장점). 전기장이 서로 밀어내요.'
          : st.cfg === 'one' ? '<b>(+)전하 하나</b><br>전위는 거리에 반비례해 낮아져요. 전기장은 사방으로 퍼져 나가요.'
          : '<b>평행판 (균일한 전기장)</b><br>전위가 일정하게 내려가는 비탈이에요. 전위차 = 전기장 × 거리, 전기장의 크기가 어디서나 같아요.');
        resetBall();
      }
      let bp = new V3(), bv = new V3(), hold = 0;
      function resetBall() { bp.set(st.cfg === 'plate' ? -3.8 : st.cfg === 'dip' ? -1.0 : st.cfg === 'one' ? 0.9 : 0.35, 0, st.cfg === 'plate' ? 0.3 : st.cfg === 'one' ? 0.35 : 1.2); bv.set(0, 0, 0); hold = 0; }
      controls.segment('전하', [{ value: 'dip', label: '＋ −' }, { value: 'same', label: '＋ ＋' }, { value: 'one', label: '＋ 하나' }, { value: 'plate', label: '▯▯ 평행판' }], st.cfg, (v) => { st.cfg = v; build(); });
      const fb = controls.button('전기장 화살표 ✓', () => { st.field = !st.field; fb.classList.toggle('on', st.field); fb.textContent = '전기장 화살표 ' + (st.field ? '✓' : '✕'); arG.visible = st.field; arrows.forEach((a) => { }); build(); }); fb.classList.add('on');
      controls.button('🔴 시험 전하 놓기', () => resetBall());
      build();
      return {
        update(dt) {
          const e = 0.02, ex = -(V(bp.x + e, bp.z) - V(bp.x - e, bp.z)) / (2 * e), ez = -(V(bp.x, bp.z + e) - V(bp.x, bp.z - e)) / (2 * e);
          const k = 2.0; bv.x += ex * k * dt * 1.0; bv.z += ez * k * dt * 1.0; bv.multiplyScalar(1 - 0.35 * dt); bp.x += bv.x * dt; bp.z += bv.z * dt;
          const far = Math.abs(bp.x) > 4.7 || Math.abs(bp.z) > 4.7 || Q.some((c) => Math.hypot(bp.x - c[0], bp.z - c[1]) < 0.3);
          if (far) { hold += dt; bv.multiplyScalar(0.9); if (hold > 0.8) resetBall(); }
          bp.x = clamp(bp.x, -4.8, 4.8); bp.z = clamp(bp.z, -4.8, 4.8);
          ball.position.set(bp.x, clamp(V(bp.x, bp.z) * HS * 2.0, -2.2, 2.4) + 0.2, bp.z);
        },
        sync() {},
      };
    },
  });
})();
