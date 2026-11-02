/* hq-photoelectric · 3D 광전관 (광자 1개가 전자 1개를 때려 내보내요)
   광자 에너지 E = hf = 1240 ÷ λ(nm) [eV]. E > 일함수 W 이면 광전자가 나오고, 최대 운동 에너지는 E − W. 역전압 V가 E − W보다 크면 전류가 0이 돼요(정지 전압). */
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
  const METALS = { Na: { W: 2.3, name: '나트륨', c: 0xc9ced8 }, Zn: { W: 4.3, name: '아연', c: 0x9fb0c8 } };
  function waveColor(l) { // nm → 보이는 색
    let r = 0, g = 0, b = 0;
    if (l < 380) { r = 0.7; g = 0.55; b = 1; } else if (l < 440) { r = (440 - l) / 60; g = 0; b = 1; } else if (l < 490) { g = (l - 440) / 50; b = 1; }
    else if (l < 510) { g = 1; b = (510 - l) / 20; } else if (l < 580) { r = (l - 510) / 70; g = 1; } else if (l < 645) { r = 1; g = (645 - l) / 65; } else { r = 1; }
    const f = l > 700 ? 0.5 : 1; return new THREE.Color(Math.pow(r * f, 0.8), Math.pow(g * f, 0.8), Math.pow(b * f, 0.8));
  }

  window.SciSim3D.attach({
    title: '광전관 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: 22 * KD, theta: 0.55, phi: 1.32, min: 9, max: 36, target: [1.3, 0.2, 0] },
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const h = H3(ctx); const { V3, mat, glass, anchor, sphere, box, cyl, tube } = h;
      const lessonS = () => (window.__sim && window.__sim.S) || null;
      const S0 = lessonS();
      const st = { lam: S0 && S0.tb && S0.tb.lam ? Math.max(200, Math.min(700, S0.tb.lam)) : 400, I: 3, V: 0, metal: 'Na' };
      const XC = -3.8, XA = 3.2, D = XA - XC;
      /* 유리관 */
      const tubeM = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 9.6, 40, 1, true), glass(0xbfd9ff, 0.12)); tubeM.rotation.z = Math.PI / 2; tubeM.position.x = -0.1; root.add(tubeM);
      [-4.9, 4.7].forEach((x) => { const c = new THREE.Mesh(new THREE.SphereGeometry(2.0, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), glass(0xbfd9ff, 0.12)); c.rotation.z = x < 0 ? Math.PI / 2 : -Math.PI / 2; c.position.x = x; c.scale.set(0.25, 1, 1); root.add(c); });
      /* 음극(금속판) · 양극(고리) */
      const cath = cyl(1.65, 1.65, 0.22, METALS.Na.c, { metalness: 0.9, roughness: 0.25 }, 48); cath.rotation.z = Math.PI / 2; cath.position.x = XC - 0.1; root.add(cath);
      const anode = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.07, 14, 56), mat(0xb7c0d0, { metalness: 0.85, roughness: 0.3 })); anode.rotation.y = Math.PI / 2; anode.position.x = XA; root.add(anode);
      const rodA = cyl(0.05, 0.05, 2.6, 0xb7c0d0, { metalness: 0.8 }, 8); rodA.position.set(XA, 1.55 + 1.3, 0); rodA.rotation.z = 0; root.add(rodA);
      /* 전류계 */
      const am = new THREE.Group(); am.position.set(-0.3, -4.4, 0); root.add(am);
      const amB = cyl(0.95, 0.95, 0.3, 0x2c3345, { roughness: 0.4, metalness: 0.4 }, 36); amB.rotation.x = Math.PI / 2; am.add(amB);
      const amF = new THREE.Mesh(new THREE.CircleGeometry(0.85, 40), h.basic(0xf4f6fb)); amF.position.z = 0.16; am.add(amF);
      const needle = new THREE.Group(); needle.position.set(0, -0.3, 0.2); am.add(needle); const nd = box(0.06, 0.9, 0.03, 0xe2464b); nd.position.y = 0.45; needle.add(nd);
      const wA = tube([new V3(XA, 4.1, 0), new V3(XA, 4.6, 0), new V3(-0.3, 4.7, -0.3)], 0.035, 0xe39a45, { mo: { metalness: 0.4 } }); root.add(wA);
      const wC = tube([new V3(XC - 0.2, 0, 0), new V3(XC - 1.1, -1.5, 0), new V3(XC - 1.0, -4.2, 0), new V3(-1.2, -4.45, 0)], 0.035, 0xe39a45, { mo: { metalness: 0.4 } }); root.add(wC);
      const wA2 = tube([new V3(-0.3, 4.7, -0.3), new V3(-1.0, 5.2, -0.3), new V3(6.2, 5.2, -0.3), new V3(6.2, -4.2, 0), new V3(0.6, -4.45, 0)], 0.035, 0xe39a45, { mo: { metalness: 0.4 } }); root.add(wA2);
      /* 전원(역전압) */
      const batt = new THREE.Group(); batt.add(box(1.3, 0.6, 0.6, 0x374151)); const bp = box(0.35, 0.62, 0.62, 0xe2464b); bp.position.x = -0.45; const bn = box(0.35, 0.62, 0.62, 0x2f6df6); bn.position.x = 0.45; batt.add(bp, bn); batt.position.set(-0.3, 5.5, -0.3); root.add(batt);
      /* 광원과 빛줄기 */
      const lamp = new THREE.Group(); const lb = cyl(0.7, 0.9, 1.2, 0x4b5563, { metalness: 0.5 }, 24); lb.rotation.z = Math.PI / 2; const lc = sphere(0.65, 0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.9 }); lc.position.x = -0.7; lamp.add(lb, lc); lamp.position.set(7.4, 0, 0); root.add(lamp);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.8, 11.0, 32, 1, true), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.05, depthWrite: false, side: THREE.DoubleSide })); beam.rotation.z = Math.PI / 2; beam.position.x = 1.55; root.add(beam);
      /* 입자 */
      const NP = 56, NE = 70;
      const phM = new THREE.InstancedMesh(new THREE.SphereGeometry(0.17, 14, 10), mat(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.9, roughness: 0.3 }), NP); root.add(phM);
      const elM = new THREE.InstancedMesh(new THREE.SphereGeometry(0.14, 14, 10), mat(0x4d8dff, { emissive: 0x2f6df6, emissiveIntensity: 0.8, roughness: 0.3 }), NE); root.add(elM);
      const ph = [], el = []; for (let i = 0; i < NP; i++) ph.push({ on: false, x: 0, y: 0, z: 0 }); for (let i = 0; i < NE; i++) el.push({ on: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 });
      const Mx = new THREE.Matrix4(), Z = new THREE.Matrix4().makeScale(0, 0, 0), Sc = new V3(1, 1, 1), Qi = new THREE.Quaternion();
      const flash = sphere(0.35, 0xffffff, { emissive: 0xffffff, emissiveIntensity: 1, transparent: true, opacity: 0 }); root.add(flash); let flashT = 0;
      /* 이름표 */
      const lC = label('금속판 (음극)', anchor(root, XC, 2.0, 0), { color: '#475569', size: 12 }), lA = label('양극 (고리)', anchor(root, XA, 2.2, 0), { color: '#475569', size: 12 });
      const lPh = label('빛 (광자)', anchor(root, 5.2, 1.7, 0), { color: '#a16207', size: 13 }), lEl = label('광전자 e⁻', anchor(root, -1.6, 1.05, 0), { color: '#2563eb', size: 13 });
      const lAm = label('', anchor(root, -0.3, -5.7, 0), { color: '#0f766e', size: 13 }), lV = label('', batt, { color: '#475569', size: 12, offset: [0, 0.9, 0] });
      let spawnT = 0, arr = [], curI = 0;
      const Eph = () => 1240 / st.lam, W = () => METALS[st.metal].W, KEm = () => Math.max(0, Eph() - W());
      function txt() {
        const E = Eph(), w = W(), k = KEm();
        const head = '<b>광자 에너지 E = hf = ' + E.toFixed(2) + ' eV</b> · 일함수 W = ' + w + ' eV (' + METALS[st.metal].name + ')<br>';
        if (k <= 0) info(head + '광자 하나의 에너지가 W보다 작아서 <b>전자가 나오지 않아요</b>.<br>빛을 세게(광자를 많이) 해도 소용없어요. 파장을 짧게 해 보세요.');
        else info(head + '전자의 최대 운동 에너지 = E − W = <b>' + k.toFixed(2) + ' eV</b> → 정지 전압 V₀ = <b>' + k.toFixed(2) + ' V</b><br>' + (st.V >= k - 1e-6 ? '역전압 ' + st.V.toFixed(1) + ' V ≥ V₀: 전자가 양극에 닿지 못해 <b>전류 0</b>' : '역전압 ' + st.V.toFixed(1) + ' V < V₀: 빠른 전자는 양극에 도착해요. 빛의 세기는 전자 <b>수</b>만 바꿔요.'));
        lV.set('역전압 ' + st.V.toFixed(1) + ' V');
        const c = waveColor(st.lam); beam.material.color.copy(c); lc.material.color.copy(c); lc.material.emissive.copy(c); phM.material.color.copy(c); phM.material.emissive.copy(c);
        lPh.el.style.background = '#' + c.clone().multiplyScalar(0.55).getHexString();
        cath.material.color.setHex(METALS[st.metal].c);
      }
      controls.range('파장 λ', 200, 700, 10, st.lam, (v) => { st.lam = v; txt(); }, (v) => v + ' nm' + (v < 380 ? ' (자외선)' : ''));
      controls.range('빛의 세기', 1, 5, 1, st.I, (v) => { st.I = v; }, (v) => v);
      controls.range('역전압 V', 0, 3, 0.1, st.V, (v) => { st.V = v; txt(); }, (v) => v.toFixed(1) + ' V');
      controls.segment('금속', [{ value: 'Na', label: '나트륨' }, { value: 'Zn', label: '아연' }], st.metal, (v) => { st.metal = v; txt(); });
      txt();
      return {
        update(dt, t) {
          dt = Math.min(dt, 0.05);
          spawnT -= dt; const rate = 1.4 * st.I;
          while (spawnT <= 0) {
            spawnT += 1 / rate * (0.6 + Math.random() * 0.8);
            const p = ph.find((q) => !q.on); if (p) { const a = Math.random() * 6.283, r = Math.sqrt(Math.random()) * 1.35; p.on = true; p.x = 6.4; p.y = r * Math.cos(a); p.z = r * Math.sin(a); }
          }
          const k = KEm(), V = st.V;
          for (let i = 0; i < NP; i++) {
            const p = ph[i];
            if (p.on) {
              p.x -= 11 * dt;
              if (p.x <= XC + 0.1) {
                p.on = false;
                if (k > 0) { const e = el.find((q) => !q.on); if (e) { e.on = true; e.x = XC + 0.2; e.y = p.y; e.z = p.z; const ke = k * (0.35 + 0.65 * Math.random()); e.vx = 3.71 * Math.sqrt(ke); e.vy = (Math.random() - 0.5) * 0.5; e.vz = (Math.random() - 0.5) * 0.5; flashT = 0.12; flash.position.set(XC + 0.15, p.y, p.z); } }
                else { flashT = 0.06; flash.position.set(XC + 0.15, p.y, p.z); }
              }
            }
            if (p.on) { Mx.compose(new V3(p.x, p.y, p.z), Qi, new V3(2.2, 1, 1)); phM.setMatrixAt(i, Mx); } else phM.setMatrixAt(i, Z);
          }
          phM.instanceMatrix.needsUpdate = true;
          let arrived = 0;
          for (let i = 0; i < NE; i++) {
            const e = el[i];
            if (e.on) {
              e.vx -= V * dt; e.x += e.vx * dt; e.y += e.vy * dt; e.z += e.vz * dt;
              const rr = Math.hypot(e.y, e.z); if (rr > 1.7) { e.vy *= -0.5; e.vz *= -0.5; }
              if (e.x >= XA) { e.on = false; arrived++; } else if (e.x <= XC + 0.15 && e.vx < 0) e.on = false;
            }
            if (e.on) { Mx.makeTranslation(e.x, e.y, e.z); elM.setMatrixAt(i, Mx); } else elM.setMatrixAt(i, Z);
          }
          elM.instanceMatrix.needsUpdate = true;
          arr.push([t, arrived]); while (arr.length && arr[0][0] < t - 1.5) arr.shift();
          const cur = arr.reduce((a, b) => a + b[1], 0) / 1.5;
          curI += (cur - curI) * (1 - Math.exp(-dt * 4));
          needle.rotation.z = -Math.min(1.0, curI / 7) * 1.0;
          lAm.set(curI > 0.25 ? '광전류 흘러요 ' + '●'.repeat(Math.min(5, Math.ceil(curI / 1.5))) : '광전류 0');
          flashT -= dt; flash.material.opacity = Math.max(0, flashT / 0.12); flash.visible = flashT > 0;
          const pulse = 1 + 0.08 * Math.sin(t * 5); lamp.scale.setScalar(pulse * 0.98);
        },
        sync() {},
      };
    },
  });
})();
