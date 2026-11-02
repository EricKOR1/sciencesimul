/* hm-circular-motion · 3D 원운동과 구심력
   퍽: 속도는 접선 방향, 가속도·알짜힘(줄의 장력)은 중심 방향. 줄을 끊으면 접선 방향으로 곧게 날아가요(관성).
   회전 그네: 줄 장력 T의 수평 성분이 구심력, 연직 성분이 중력과 균형이에요 (tanθ = v²/(rg)). */
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
    title: '원운동과 구심력 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: 9 * KD, theta: 0.35, phi: 0.95, min: 4, max: 26, target: [0, 0.6, 0] },
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const { V3, M, mkArrow, setArrow, tube, disc, grid, glass } = tools(THREE);
      const st = { mode: 'puck', v: 3, r: 2.5, cut: false, ph: 0, show: true, om: 1.6, cutT: 0 };
      const gP = new THREE.Group(), gS = new THREE.Group(); root.add(gP, gS);
      /* ---- 퍽 ---- */
      const table = new THREE.Mesh(new THREE.CylinderGeometry(4.0, 4.0, 0.2, 64), M(0x56718f, { roughness: 0.4 })); table.position.y = -0.1; table.receiveShadow = true; gP.add(table);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 8, 96), new THREE.MeshBasicMaterial({ color: 0x9db1cf, transparent: true, opacity: 0.8 })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.01; gP.add(ring);
      const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.34, 20), M(0x64748b, { metalness: 0.5 })); peg.position.y = 0.17; gP.add(peg);
      const puck = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.22, 36), M(0xf59e0b, { roughness: 0.3, metalness: 0.2 })); puck.castShadow = true; gP.add(puck);
      const strg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1, 6), M(0xf4f1e6)); gP.add(strg);
      const vA = mkArrow(0x4c8dff, 0.05), fA = mkArrow(0xff5a5f, 0.05); gP.add(vA, fA);
      const tv = new THREE.Object3D(), tf = new THREE.Object3D(); gP.add(tv, tf);
      const lv = label('속도 v', tv, { color: '#2f6df6', size: 13 }), lf = label('구심력 F', tf, { color: '#e2464b', size: 13 });
      const trail = []; const trailMesh = new THREE.Group(); gP.add(trailMesh);
      const pos = new V3(), vel = new V3(); let free = null;
      /* ---- 회전 그네 ---- */
      const R0 = 1.5, L = 3.0, N = 6;
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 4.4, 20), M(0x64748b, { metalness: 0.5 })); mast.position.y = 2.2; gS.add(mast);
      const floor = new THREE.Mesh(new THREE.CylinderGeometry(4.0, 4.0, 0.16, 64), M(0x2a4a5e, { roughness: 1 })); floor.position.y = -0.08; floor.receiveShadow = true; gS.add(floor);
      const top = new THREE.Group(); top.position.y = 4.4; gS.add(top);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(R0 + 0.2, R0 + 0.2, 0.18, 40), M(0xe2464b, { roughness: 0.4 })); top.add(cap);
      const seats = [];
      for (let i = 0; i < N; i++) {
        const a = i / N * TAU, g = new THREE.Group(); g.rotation.y = a; top.add(g);
        const sw = new THREE.Group(); sw.position.x = R0; g.add(sw);       // 이 그룹을 회전축(접선 방향 = z)에 대해 기울여요
        const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1, 6), M(0xe5e7eb)); ch.position.y = -L / 2; ch.geometry = ch.geometry.clone(); ch.scale.y = L; sw.add(ch);
        const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.5), M([0x4c8dff, 0xffb020, 0x34c38f][i % 3], { roughness: 0.4 })); seat.position.y = -L; seat.castShadow = true; sw.add(seat);
        const man = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), M(0xfcd9b6)); man.position.y = -L + 0.4; sw.add(man);
        seats.push(sw);
      }
      const TA = mkArrow(0xe2464b, 0.05), WA = mkArrow(0xffd34d, 0.05), CA = mkArrow(0x34d399, 0.05); gS.add(TA, WA, CA);
      const lT = label('장력 T', [0, 0, 0], { color: '#e2464b', size: 12 }), lW = label('중력 mg', [0, 0, 0], { color: '#a16207', size: 12 }), lC = label('구심력(알짜힘)', [0, 0, 0], { color: '#0f766e', size: 12 });
      let th = 0;
      function solveTheta(om) { let t = 0.2; for (let i = 0; i < 40; i++) t = Math.atan(om * om * (R0 + L * Math.sin(t)) / 9.8); return t; }
      function setMode() {
        gP.visible = st.mode === 'puck'; gS.visible = st.mode === 'swing';
        ['v', 'r', 'cutB'].forEach((k) => ctl[k].forEach((n) => { n.style.display = st.mode === 'puck' ? '' : 'none'; }));
        ctl.om.forEach((n) => { n.style.display = st.mode === 'swing' ? '' : 'none'; });
        [lv, lf].forEach((l) => l.show(st.mode === 'puck')); [lT, lW, lC].forEach((l) => l.show(st.mode === 'swing'));
        ctx.orbit.ty = st.mode === 'swing' ? 2 : 0.4; ctx.orbit.dist = (st.mode === 'swing' ? 14 : 9) * KD; ctx.orbit.phi = st.mode === 'swing' ? 1.25 : 0.95;
        text();
      }
      function text() {
        if (st.mode === 'puck') {
          const a = st.v * st.v / st.r;
          info(st.cut ? '<b>줄이 끊어졌어요.</b><br>구심력이 사라지면 속도 방향(접선)으로 등속 직선 운동을 해요.' : '<b>등속 원운동</b>: 속력은 일정, 방향은 계속 바뀌어요.<br>가속도 a = v²/r = <b>' + a.toFixed(1) + ' m/s²</b>, 방향은 <b>중심</b>이에요.<br>줄의 장력이 구심력 F = mv²/r 이에요.');
        } else {
          info('<b>회전 그네</b> · 줄이 연직선과 <b>' + (th * 180 / Math.PI).toFixed(0) + '°</b><br>장력의 연직 성분은 중력과 균형, 수평 성분이 <b style="color:#34d399">구심력</b>이에요.<br>빨리 돌수록 줄이 더 바깥으로 벌어져요.');
        }
      }
      const ctl = {}; const barEl = ctx.renderer.domElement.parentNode.parentNode.querySelector('.v3-ctl');
      const grab = (k, fn) => { const b = barEl.children.length; const r = fn(); ctl[k] = [...barEl.children].slice(b); return r; };
      controls.segment('실험', [{ value: 'puck', label: '🧊 퍽과 줄' }, { value: 'swing', label: '🎡 회전 그네' }], st.mode, (v) => { st.mode = v; setMode(); });
      grab('v', () => controls.range('속력', 1, 5, 0.5, st.v, (v) => { st.v = v; text(); }, (v) => v.toFixed(1) + ' m/s'));
      grab('r', () => controls.range('반지름', 1.5, 3.5, 0.5, st.r, (v) => { st.r = v; text(); }, (v) => v.toFixed(1) + ' m'));
      grab('cutB', () => controls.button('✂ 줄 끊기 / 다시', () => { st.cut = !st.cut; if (st.cut) { free = pos.clone(); st.cutT = 0; } else { free = null; } text(); }));
      grab('om', () => controls.range('회전 빠르기', 0.8, 2.6, 0.2, st.om, (v) => { st.om = v; text(); }, (v) => v.toFixed(1) + ' rad/s'));
      setMode();
      const tmpA = new V3(), tmpB = new V3();
      return {
        update(dt) {
          if (st.mode === 'puck') {
            const w = st.v / st.r;
            if (!st.cut) {
              st.ph += w * dt; pos.set(st.r * Math.cos(st.ph) * 0.9, 0.11, st.r * Math.sin(st.ph) * 0.9); vel.set(-Math.sin(st.ph), 0, Math.cos(st.ph));
              ring.scale.set(st.r * 0.9, st.r * 0.9, 1);
            } else {
              pos.addScaledVector(vel, st.v * 0.9 * dt); st.cutT += dt;
              if (pos.length() > 4.3 || st.cutT > 5) { st.cut = false; st.ph = Math.atan2(pos.z, pos.x) * 0 + st.ph; text(); }
              if (!st.cut) { pos.set(st.r * 0.9 * Math.cos(st.ph), 0.11, st.r * 0.9 * Math.sin(st.ph)); }
            }
            puck.position.copy(pos);
            const cutOn = st.cut;
            strg.visible = !cutOn; fA.visible = !cutOn;
            const len = Math.hypot(pos.x, pos.z); strg.position.set(pos.x / 2, 0.22, pos.z / 2); strg.scale.y = len; strg.quaternion.setFromUnitVectors(new V3(0, 1, 0), tmpA.set(pos.x, 0, pos.z).normalize());
            tmpB.copy(pos); tmpB.y = 0.4;
            setArrow(vA, tmpB, tmpA.copy(tmpB).addScaledVector(vel, st.v * 0.38)); tv.position.copy(tmpA).add(new V3(0, 0.15, 0));
            if (!cutOn) { const inw = new V3(-pos.x, 0, -pos.z).normalize(); setArrow(fA, tmpB, tmpA.copy(tmpB).addScaledVector(inw, st.v * st.v / st.r * 0.28 + 0.2)); tf.position.copy(tmpA).add(new V3(0, 0.15, 0)); }
            lf.show(!cutOn);
          } else {
            top.rotation.y += st.om * dt;
            const tgt = solveTheta(st.om); th += (tgt - th) * Math.min(1, dt * 4);
            seats.forEach((s) => { s.rotation.z = th; });
            // 한 의자(첫 번째)의 힘 화살표 (월드 좌표)
            const a0 = top.rotation.y; const dir = new V3(Math.cos(a0), 0, -Math.sin(a0));            // 첫 의자의 바깥 방향
            const hang = new V3(R0 + L * Math.sin(th), 4.4 - L * Math.cos(th) - 0.12, 0).applyAxisAngle(new V3(0, 1, 0), a0);
            const att = new V3(R0, 4.4, 0).applyAxisAngle(new V3(0, 1, 0), a0);
            const Tdir = tmpA.copy(att).sub(hang).normalize();
            setArrow(TA, hang, tmpB.copy(hang).addScaledVector(Tdir, 1.9)); lT.obj = [tmpB.x, tmpB.y, tmpB.z];
            const hang2 = hang.clone();
            setArrow(WA, hang2, tmpB.copy(hang2).add(new V3(0, -1.1, 0))); lW.obj = [tmpB.x, tmpB.y - 0.1, tmpB.z];
            const inw = dir.clone().multiplyScalar(-1);
            setArrow(CA, hang2, tmpB.copy(hang2).addScaledVector(inw, 0.5 + st.om * st.om * 0.55)); lC.obj = [tmpB.x, tmpB.y, tmpB.z]; lC.off = [0, 0.3, 0];
            if (Math.abs(th - tgt) < 0.01) text();
          }
        },
        sync() {},
      };
    },
  });
})();
