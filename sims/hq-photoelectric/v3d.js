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
  const METALS = { Cs: { W: 2.1, name: '세슘', c: 0xe0cf9a }, Na: { W: 2.3, name: '나트륨', c: 0xc9ced8 }, Zn: { W: 4.3, name: '아연', c: 0x9fb0c8 } };
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
    levels: [0, 2, 3],
    build(ctx) {
      const { THREE, controls } = ctx;
      /* ---- 여러 장면 도우미 (2D 장면 S.mode에 맞춰 그룹 · 이름표 · 재생 줄을 바꿔요) ---- */
      const root = new THREE.Group(); ctx.root.add(root);
      const G = { tube: root }, K = { cur: '', labs: [], pls: [], graph: false };
      const label = (text, obj, o, sc) => {
        const L = ctx.label(text, obj, o), sh = L.show; L._own = true; L._sc = sc || 'tube';
        L._ap = () => sh(L._own && K.cur === L._sc); L.show = (v) => { L._own = v; L._ap(); }; K.labs.push(L); L._ap(); return L;
      };
      const mkPlayer = (sc, o) => {
        const p = controls.player(o), rs = document.querySelectorAll('.v3-player'), row = rs[rs.length - 1];
        K.pls.push({ sc, p, row }); row.style.display = sc === K.cur ? '' : 'none'; return p;
      };
      const newScene = (k) => { const g = new THREE.Group(); g.visible = false; ctx.root.add(g); G[k] = g; return g; };
      const CAMS = {};
      function setScene(k) {
        if (k === K.cur) return; K.cur = k;
        Object.keys(G).forEach((n) => (G[n].visible = n === k));
        K.labs.forEach((L) => L._ap());
        K.pls.forEach((x) => { const on = x.sc === k; x.row.style.display = on ? '' : 'none'; if (!on) x.p.pause(); });
        const c = CAMS[k]; if (c) Object.assign(ctx.orbit, c, { tx: c.tx || 0, ty: c.ty || 0, tz: c.tz || 0 });
      }
      let infoNote = '';
      const info = (hh) => ctx.info(hh ? hh + infoNote : '');
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
      CAMS.tube = { dist: 22 * KD, theta: 0.55, phi: 1.32, min: 9, max: 36, tx: 1.3, ty: 0.2, tz: 0 };
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
        /* V₀ 값과 '세기는 소용없어요' 같은 결론은 학생이 전류계로 찾아요 (2D처럼 기록한 뒤에만 V₀가 나와요) */
        if (k <= 0) info(head + '전류계를 보세요: 광전자가 나오나요? 파장과 세기를 바꿔 가며 확인해 봐요.');
        else info(head + '역전압 ' + st.V.toFixed(2) + ' V · 역전압을 천천히 올리며 전류계가 처음 0이 되는 전압(정지 전압 V₀)을 찾아요.<br>역전압은 전자를 되밀어요: 운동 에너지가 큰 전자만 양극에 닿아요.');
        lV.set('역전압 ' + st.V.toFixed(2) + ' V');
        const c = waveColor(st.lam); beam.material.color.copy(c); lc.material.color.copy(c); lc.material.emissive.copy(c); phM.material.color.copy(c); phM.material.emissive.copy(c);
        lPh.el.style.background = '#' + c.clone().multiplyScalar(0.55).getHexString();
        cath.material.color.setHex(METALS[st.metal].c);
      }
      txt();
      /* =====================================================================
         새 장면: 광자와 전류(photon) · 이미지 센서(sensor) · 자동 점멸등(lamp) · 태양전지(solar)
         ===================================================================== */
      const sceneKey = () => { const S = lessonS(); if (!S) return 'tube'; if (S.mode === 'photon') return 'photon'; if (S.mode === 'tech') return S.te.sub || 'sensor'; if (S.mode === 'graph') return 'graph'; return 'tube'; };
      const sci = (x, d) => { if (!isFinite(x) || x === 0) return '0'; let e = Math.floor(Math.log10(Math.abs(x))), m = x / Math.pow(10, e); m = +m.toFixed(d); if (Math.abs(m) >= 10) { m /= 10; e++; } return m.toFixed(d) + '×10<sup>' + e + '</sup>'; };
      const mm = (g, m) => { g.add(m); return m; };
      const stdM = (w, hh, d, c, o) => new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), mat(c, o));
      const sphM = (r, c, o) => new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), mat(c, o));
      const LB = 'rgba(8,12,24,.78)';
      const dial3 = (g, x, y, z, r) => {
        const d = new THREE.Group(); d.position.set(x, y, z); g.add(d);
        const b = cyl(r, r, 0.3, 0x2c3345, { roughness: 0.4, metalness: 0.4 }, 36); b.rotation.x = Math.PI / 2; d.add(b);
        const f = new THREE.Mesh(new THREE.CircleGeometry(r * 0.9, 40), h.basic(0xf4f6fb)); f.position.z = 0.16; d.add(f);
        const nd = new THREE.Group(); nd.position.set(0, -r * 0.3, 0.2); d.add(nd); const nn = box(0.06, r * 0.95, 0.03, 0xe2464b); nn.position.y = r * 0.47; nd.add(nn);
        return { d, nd };
      };

      /* ============ ③ 광자와 전류 ============ */
      const gP = newScene('photon'); CAMS.photon = { dist: PHN ? 23 : 14, theta: 0.35, phi: 1.2, min: 8, max: 36, tx: 0.6, ty: 1.1 };
      const pPlate = mm(gP, stdM(6.2, 0.4, 3.6, 0xf2c36b, { metalness: 0.9, roughness: 0.3 })); pPlate.position.set(-0.6, -2.0, 0);
      const pLampPos = new V3(-3.4, 3.4, 0), pTgt = new V3(-0.6, -1.8, 0);
      const pLamp = new THREE.Group(); pLamp.position.copy(pLampPos); gP.add(pLamp);
      const pLb = cyl(0.55, 0.8, 1.0, 0x4b5563, { metalness: 0.5 }, 24); pLb.position.y = 0.3; pLamp.add(pLb); const pLc = sphM(0.5, 0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.9 }); pLc.position.y = -0.25; pLamp.add(pLc);
      const pBeamDir = new V3().subVectors(pTgt, pLampPos), pBeamLen = pBeamDir.length();
      const Yax = h.Yax;
      const pBeam = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 0.3, pBeamLen, 28, 1, true), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.07, depthWrite: false, side: THREE.DoubleSide }));
      pBeam.position.copy(pLampPos).addScaledVector(pBeamDir, 0.5); pBeam.quaternion.setFromUnitVectors(Yax, pBeamDir.clone().normalize()); gP.add(pBeam);
      function Yax0() { return new V3(0, -1, 0).multiplyScalar(-1).multiplyScalar(-1).multiplyScalar(-1); }
      const NPH = 34, pPhM = new THREE.InstancedMesh(new THREE.SphereGeometry(0.15, 12, 8), h.basic(0xffffff), NPH); pPhM.frustumCulled = false; gP.add(pPhM);
      const pPh = []; for (let i = 0; i < NPH; i++) pPh.push({ on: false, p: 0, tx: 0, tz: 0 });
      const GB = new THREE.Group(); GB.position.set(4.3, 0.2, 0); gP.add(GB);
      const gbBoard = stdM(3.1, 3.1, 0.14, 0x2a3350); gbBoard.position.z = -0.12; GB.add(gbBoard);
      const gDots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 10, 8), h.basic(0xffffff), 100); GB.add(gDots);
      const dotPos = []; for (let i = 0; i < 100; i++) dotPos.push(new V3(-1.35 + (i % 10) * 0.3, 1.35 - Math.floor(i / 10) * 0.3, 0));
      const pEl = sphM(0.22, 0x4d8dff, { emissive: 0x2f6df6, emissiveIntensity: 0.9 }); pEl.visible = false; gP.add(pEl);
      const pDial = dial3(gP, -4.6, -3.3, 1.4, 0.8);
      const lpLamp = label('', pLamp, { color: LB, size: 13, offset: [0, 1.15, 0] }, 'photon');
      const lpHf = label('', pPlate, { color: 'rgba(61,70,88,.92)', size: 13, offset: [0, 0.75, 0] }, 'photon');
      label('금속판 (나트륨 W = 2.3 eV)', pPlate, { color: 'rgba(168,98,12,.9)', size: 12, offset: [0, -0.7, 1.9] }, 'photon');
      const lpBoard = label('광자 100개 → 전자 1개', GB, { color: LB, size: 12, offset: [0, 2.0, 0] }, 'photon');
      const lpEcnt = label('', GB, { color: 'rgba(31,79,207,.9)', size: 12, offset: [0, -2.0, 0] }, 'photon');
      const lpNo = label('전자가 나오지 않아요', GB, { color: 'rgba(192,53,59,.92)', size: 12, offset: [0, 0, 0.3] }, 'photon');
      const lpDial = label('', pDial.d, { color: 'rgba(15,118,110,.9)', size: 13, offset: [0, -1.25, 0] }, 'photon');
      const prP = { on: false, lam: 400 }; let pSig = '', pAcc = 0, pDone = -1, eBallT = -1; const Mxp = new THREE.Matrix4(), Zp = new THREE.Matrix4().makeScale(0, 0, 0), Qp = new THREE.Quaternion();
      function updPhoton(dt, t) {
        const S = lessonS(); if (!S) return; const P = S.pn, L = window.__sim, sig = P.lam + '|' + P.P; if (sig !== pSig) { pSig = sig; if (prP.on) { prP.on = false; plP.pause(); } }
        const lam = prP.on ? prP.lam : P.lam, em = lam <= L.LAM0, eph = 1240 / lam, N = (P.P * 1e-3) / (eph * 1.6e-19), col = waveColor(lam);
        pLc.material.color.copy(col); pLc.material.emissive.copy(col); pBeam.material.color.copy(col); pPhM.material.color.copy(col);
        const rate = 3 + 6 * Math.min(1, Math.max(0, N / 4e15)); pAcc += rate * dt;
        while (pAcc >= 1) { pAcc -= 1; const q = pPh.find((o) => !o.on); if (q) { q.on = true; q.p = 0; q.tx = -0.6 + (Math.random() - 0.5) * 4.6; q.tz = (Math.random() - 0.5) * 2.8; } }
        pPh.forEach((q, i) => {
          if (q.on) { q.p += dt * 0.9; if (q.p >= 1) q.on = false; }
          if (q.on) { Mxp.compose(new V3(pLampPos.x + (q.tx - pLampPos.x) * q.p, pLampPos.y - 0.4 + (-1.7 - pLampPos.y + 0.4) * q.p, q.tz * q.p), Qp, new V3(1, 1, 1)); pPhM.setMatrixAt(i, Mxp); } else pPhM.setMatrixAt(i, Zp);
        }); pPhM.instanceMatrix.needsUpdate = true;
        // 100칸: 2D의 진행 상황(P.cyc, P.cycDone)을 그대로 따라가요 (파장을 재생으로 바꾸면 3D 안에서 따로 세요)
        const lit = prP.on ? Math.floor((t * 28) % 100) : Math.floor(P.cyc), cd = P.cycDone;
        for (let i = 0; i < 100; i++) { Mxp.makeTranslation(dotPos[i].x, dotPos[i].y, 0); gDots.setMatrixAt(i, Mxp); gDots.setColorAt(i, (em && i < lit) ? col : new THREE.Color(0x4a5878)); }
        gDots.instanceMatrix.needsUpdate = true; if (gDots.instanceColor) gDots.instanceColor.needsUpdate = true;
        if (pDone < 0) pDone = cd; if (cd > pDone) { pDone = cd; eBallT = 0; } if (cd < pDone) pDone = cd;
        if (eBallT >= 0) { eBallT += dt / 0.9; if (eBallT >= 1) { eBallT = -1; pEl.visible = false; } else { pEl.visible = true; const u = 1 - Math.pow(1 - eBallT, 3); pEl.position.set(4.3 + 2.2 * u, 0.2 + 0.7 * Math.sin(u * 3.14), 0.2); } }
        lpLamp.set(lam + ' nm · ' + P.P.toFixed(1) + ' mW'); lpHf.set('hf = ' + eph.toFixed(2) + ' eV' + (em ? '' : ' < W')); lpHf.el.style.background = em ? 'rgba(61,70,88,.92)' : 'rgba(192,53,59,.92)';
        lpNo.show(!em); lpEcnt.set('전자 ' + cd + '개 방출');
        const Ia = em ? N * 0.01 * 1.6e-19 * 1e6 : 0; pDial.nd.rotation.z = -Math.min(1, Ia / 6) * 1.0; pDial.d.visible = true;
        lpDial.set(P.solved ? 'I = ' + Ia.toFixed(1) + ' μA' : '전류계: 계산하면 보여요'); pDial.nd.visible = !!P.solved;
        info('<b>① hf = 1240/λ = ' + eph.toFixed(2) + ' eV</b><br>② 초당 광자 수 N = P/hf = ' + (P.solved ? sci(N, 1) + ' 개/s' : '? (직접 계산해요)') + '<br>③ 전자 수 = N × 0.01 = ' + (P.solved ? (em ? sci(N * 0.01, 1) : '0') + ' 개/s' : '?') + '<br>④ I = (전자 수) × e = ' + (P.solved ? Ia.toFixed(1) + ' μA' : '?') + (em ? '' : '<br><span style="color:#ff9a9a">파장이 540 nm보다 길어 hf < W → I = 0</span>'));
      }

      /* ============ ④-1 이미지 센서 ============ */
      const gS = newScene('sensor'); CAMS.sensor = { dist: PHN ? 25 : 16.5, theta: 0.3, phi: 1.25, min: 9, max: 38, tx: 0.6 };
      const GW = 12, GH = 9, CS = 0.52, GX0 = -4.6;
      const pixM = new THREE.InstancedMesh(new THREE.BoxGeometry(CS * 0.94, CS * 0.94, 0.14), h.basic(0xffffff), GW * GH); gS.add(pixM);
      const pixPos = []; for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) pixPos.push(new V3(GX0 + x * CS, 2.2 - y * CS, 0));
      const tgtBox = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(CS * 1.05, CS * 1.05, 0.3)), new THREE.LineBasicMaterial({ color: 0xffb400 })); gS.add(tgtBox);
      let noise = new Float32Array(GW * GH), noiseT = 0;
      const WX = 4.9, WY = -0.2;
      const wellG = new THREE.Group(); wellG.position.set(WX, WY, 0); gS.add(wellG);
      const wellBox = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.2, 1.8), glass(0xbfd9ff, 0.12)); wellBox.position.y = 0; wellG.add(wellBox);
      const wellEdge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(2.6, 2.2, 1.8)), new THREE.LineBasicMaterial({ color: 0x8aa0c8 })); wellG.add(wellEdge);
      const gFilter = stdM(2.6, 0.12, 1.8, 0x2fd66b, { transparent: true, opacity: 0.8 }); gFilter.position.y = 1.2; wellG.add(gFilter);
      const NEL = 60, elS = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 10, 8), mat(0x4d8dff, { emissive: 0x2f6df6, emissiveIntensity: 0.8 }), NEL); wellG.add(elS);
      const elSeed = []; { let s = 99; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; for (let i = 0; i < NEL; i++) elSeed.push([r(), r(), r()]); }
      const NPS = 8, phS = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 10, 8), h.basic(0xffd34d), NPS); wellG.add(phS);
      const vbarF = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.4, 2.2, 0.4)), new THREE.LineBasicMaterial({ color: 0x8a96b8 })); vbarF.position.set(WX - 2.1, WY, 0); gS.add(vbarF);
      const vbar = new THREE.Mesh(new THREE.BoxGeometry(0.34, 1, 0.34), h.basic(0x16a05a)); gS.add(vbar);
      const bits = []; for (let i = 0; i < 8; i++) { const b = stdM(0.42, 0.42, 0.18, 0x3a4258, { emissive: 0x000000 }); b.position.set(WX - 1.65 + i * 0.5, -2.75, 0); gS.add(b); bits.push(b); }
      const connS = h.mkSeg(0xffb400, 0.02, { basic: true, mo: { transparent: true, opacity: 0.7 } }); gS.add(connS);
      const lsGrid = label('', [GX0 + 5.5 * CS, 3.1, 0], { color: LB, size: 13 }, 'sensor');
      label('R·G·B 필터 (G 화소 확대)', [WX, WY + 1.85, 0], { color: 'rgba(22,160,90,.9)', size: 12 }, 'sensor');
      const lsTgt = label('확대한 화소', tgtBox, { color: 'rgba(255,180,0,.95)', size: 12, offset: [0, 0.65, 0] }, 'sensor'); lsTgt.el.style.color = '#26324a';
      const lsEl = label('', [WX, WY - 1.5, 0], { color: 'rgba(31,79,207,.88)', size: 12 }, 'sensor');
      const lsV = label('', vbar, { color: LB, size: 12, offset: [0, 0, 0] }, 'sensor');
      const lsDig = label('', [WX + 0.4, -3.4, 0], { color: LB, size: 13 }, 'sensor');
      const seP = { on: false, ti: 2 }; let sSig = '';
      function updSensor(dt, t) {
        const S = lessonS(); if (!S) return; const E = S.te, L = window.__sim, sig = E.day + '|' + E.ti; if (sig !== sSig) { sSig = sig; if (seP.on) { seP.on = false; plSe.pause(); } }
        const ti = seP.on ? seP.ti : E.ti, NF = L.NFULL;
        if (t - noiseT > 0.12) { noiseT = t; for (let i = 0; i < GW * GH; i++) { let u = 0; while (u === 0) u = Math.random(); noise[i] = Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2832 * Math.random()); } }
        const c = new THREE.Color();
        for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
          const Lm = L.lumAt(x, y), Ne = L.neOf(Lm, E.day, ti), D0 = L.digOf(Lm, E.day, ti), sg = 255 * Math.sqrt(Math.min(Ne, NF)) / NF;
          const v = Math.min(255, Math.max(0, D0 + sg * noise[y * GW + x] * (D0 >= 255 ? 0.4 : 1))), g = Math.pow(v / 255, 1 / 2.2); c.setRGB(g, g, g);
          const i = y * GW + x; Mxp.makeTranslation(pixPos[i].x, pixPos[i].y, 0); pixM.setMatrixAt(i, Mxp); pixM.setColorAt(i, c);
        }
        pixM.instanceMatrix.needsUpdate = true; if (pixM.instanceColor) pixM.instanceColor.needsUpdate = true;
        const tp = pixPos[L.TGT.y * GW + L.TGT.x]; tgtBox.position.copy(tp);
        const Lm = L.lumAt(L.TGT.x, L.TGT.y), Ne = L.neOf(Lm, E.day, ti), Dv = L.digOf(Lm, E.day, ti), Vp = Math.min(1, Ne / NF);
        const fill = Math.min(1, Ne / NF), ph = (t % 2.4) / 1.6, ph1 = Math.min(1, Math.max(0, ph)), ease = 1 - Math.pow(1 - ph1, 3), shown = fill * ease;
        const nd = Math.min(NEL, Math.round(Math.min(Ne, NF) * ease / 8));
        for (let i = 0; i < NEL; i++) { if (i < nd) { const s = elSeed[i]; Mxp.makeTranslation(-1.1 + s[0] * 2.2, -1.0 + s[1] * Math.max(0.05, 2.0 * shown), -0.7 + s[2] * 1.4); } else Mxp.copy(Zp); elS.setMatrixAt(i, Mxp); }
        elS.instanceMatrix.needsUpdate = true;
        const np = Math.min(NPS, Math.ceil(Lm * (E.day === 'day' ? 6 : 1.4)));
        for (let i = 0; i < NPS; i++) { if (i < np) { const u = ((t * 0.7 + i / np) % 1); Mxp.makeTranslation(-1.0 + ((i * 37) % 20) / 10, 3.0 - u * 1.8, -0.5 + ((i * 53) % 10) / 10); } else Mxp.copy(Zp); phS.setMatrixAt(i, Mxp); }
        phS.instanceMatrix.needsUpdate = true;
        vbar.scale.y = Math.max(0.03, 2.2 * Vp); vbar.position.set(WX - 2.1, WY - 1.1 + vbar.scale.y / 2, 0);
        for (let i = 0; i < 8; i++) { const on = (Dv >> (7 - i)) & 1; bits[i].material.color.setHex(on ? 0x16a05a : 0x3a4258); bits[i].material.emissive.setHex(on ? 0x0b6b3a : 0x000000); }
        h.setSeg(connS, tp.clone().add(new V3(0.3, 0, 0)), new V3(WX - 1.3, WY + 0.5, 0));
        const TE = L.TEXP[ti]; lsGrid.set('📷 ' + (E.day === 'day' ? '밝은 낮' : '어두운 밤') + ' · 노출 ' + (TE < 10 ? TE.toFixed(1) : TE) + ' ms');
        lsEl.set('전자 ' + Math.round(Math.min(Ne, 1e5)) + '개 · 잡음 ±' + Math.round(Math.sqrt(Ne))); lsV.set(Vp.toFixed(2) + ' V'); lsV.obj = [WX - 2.1, WY - 1.1 + vbar.scale.y + 0.3, 0]; lsDig.set('디지털 값 ' + Dv + ' (8비트, 0~255)');
        info(E.day === 'night' ? '밤에는 들어오는 광자가 적어 전자가 <b>조금</b>만 쌓여요. 화소마다 쌓인 전자 수와 영상의 모습을 낮과 비교해 봐요.' : '노출 시간 동안 <b>광자 수에 비례</b>해 전자가 쌓여요 → 전압 → <b>8비트 디지털 값</b>(0~255). 노란 테두리 화소는 전자 ' + NF + '개에서 255예요.');
      }

      /* ============ ④-2 자동 점멸등 ============ */
      const gM = newScene('lamp'); CAMS.lamp = { dist: PHN ? 22 : 14, theta: 0.2, phi: 1.3, min: 8, max: 34, ty: 0.2 };
      const skyDome = new THREE.Mesh(new THREE.SphereGeometry(16, 24, 16), new THREE.MeshBasicMaterial({ color: 0x0c1230, side: THREE.BackSide })); gM.add(skyDome);
      const grnd = stdM(15, 0.2, 5, 0x3a5a45, { roughness: 0.9 }); grnd.position.set(0, -1.55, -0.5); gM.add(grnd);
      const sunM = sphM(0.7, 0xffd34d, { emissive: 0xffb400, emissiveIntensity: 1 }); gM.add(sunM);
      const post = new THREE.Group(); post.position.set(4.3, -1.45, -0.6); gM.add(post);
      const pole = cyl(0.07, 0.1, 3.4, 0xaab4c6, { metalness: 0.5 }, 12); pole.position.y = 1.7; post.add(pole);
      const arm = stdM(1.1, 0.14, 0.3, 0xaab4c6, { metalness: 0.5 }); arm.position.set(-0.45, 3.4, 0); post.add(arm);
      const lampHead = sphM(0.3, 0xc7ccd6, { emissive: 0x000000 }); lampHead.position.set(-0.85, 3.2, 0); post.add(lampHead);
      const lampLight = new THREE.PointLight(0xffe27a, 0, 9, 1.6); lampLight.position.copy(lampHead.position); post.add(lampLight);
      const sensDome = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x4a74ff, { emissive: 0x2f55d4, emissiveIntensity: 0.4 })); sensDome.position.set(0.0, 3.45, 0); post.add(sensDome);
      const lmSens = label('광센서', sensDome, { color: LB, size: 12, offset: [0.5, 0.6, 0] }, 'lamp');
      const lmState = label('', lampHead, { color: 'rgba(122,135,152,.95)', size: 13, offset: [0, 0.65, 0] }, 'lamp');
      const blocks = [['광센서 (광다이오드)', -4.2, 0x2f6bff], ['비교 회로', 0, 0x7a3cff], ['점멸등', 4.2, 0x7b8798]].map(([n, x, c]) => {
        const b = stdM(3.2, 1.0, 0.5, 0x1d2742, { roughness: 0.5 }); b.position.set(x, -3.4, 1.0); gM.add(b);
        const fr = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(3.25, 1.05, 0.55)), new THREE.LineBasicMaterial({ color: c })); fr.position.copy(b.position); gM.add(fr);
        const lab = label('', b, { color: 'rgba(8,12,24,.85)', size: 12, offset: [0, 0, 0.5] }, 'lamp'); return { b, fr, lab, n };
      });
      [-2.1, 2.1].forEach((x) => { const a = h.mkArrow(0x9aa6b8, 0.05); h.setArrow(a, new V3(x - 0.3, -3.4, 1.0), new V3(x + 0.3, -3.4, 1.0)); gM.add(a); });
      const cbBar = stdM(1, 0.18, 0.3, 0x2f6bff, { emissive: 0x2f6bff, emissiveIntensity: 0.5 }); gM.add(cbBar);
      const cbFr = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(10, 0.22, 0.34)), new THREE.LineBasicMaterial({ color: 0x8a96b8 })); cbFr.position.set(0, -4.55, 1.0); gM.add(cbFr);
      const cbTh = stdM(0.07, 0.5, 0.4, 0xe2464b); gM.add(cbTh);
      const lmTh = label('', cbTh, { color: 'rgba(192,53,59,.92)', size: 12, offset: [0, -0.5, 0] }, 'lamp');
      const lmIph = label('', [0, -4.1, 1.0], { color: LB, size: 12 }, 'lamp');
      const laP = { on: false, lux: 600 }; let lSig = '';
      function updLamp(dt, t) {
        const S = lessonS(); if (!S) return; const E = S.te, sig = E.lux + '|' + E.thr; if (sig !== lSig) { lSig = sig; if (laP.on) { laP.on = false; plLa.pause(); } }
        const lux = laP.on ? laP.lux : E.lux, thr = E.thr, day = Math.min(1, Math.max(0, lux / 1000)), on = lux < thr, dp = Math.pow(day, 0.7);
        skyDome.material.color.setRGB(0.05 + 0.33 * dp, 0.07 + 0.55 * dp, 0.2 + 0.75 * dp);
        grnd.material.color.setRGB(0.09 + 0.12 * day, 0.14 + 0.25 * day, 0.12 + 0.12 * day);
        sunM.position.set(-4.2, -0.6 + 3.2 * day, -3); sunM.material.color.set(day > 0.3 ? 0xffd34d : 0xe8eefc); sunM.material.emissive.set(day > 0.3 ? 0xffb400 : 0xaab8e0);
        lampHead.material.color.set(on ? 0xffe27a : 0xc7ccd6); lampHead.material.emissive.set(on ? 0xffd34d : 0x000000); lampHead.material.emissiveIntensity = on ? 1.2 : 0; lampLight.intensity = on ? 3.2 : 0;
        const Iph = lux / 100, Ith = thr / 100;
        blocks[0].lab.set('광센서 · 광전류 ' + Iph.toFixed(1) + ' μA'); blocks[1].lab.set('비교 회로 · I < ' + Ith.toFixed(1) + ' μA ?'); blocks[2].lab.set('점멸등 ' + (on ? '켜짐' : '꺼짐'));
        blocks[2].fr.material.color.set(on ? 0xffd34d : 0x7b8798); blocks[2].b.material.color.set(on ? 0x6b5a14 : 0x1d2742);
        cbBar.scale.x = Math.max(0.02, 10 * Math.min(1, Iph / 10)); cbBar.position.set(-5 + cbBar.scale.x / 2, -4.55, 1.0);
        cbTh.position.set(-5 + 10 * Math.min(1, Ith / 10), -4.55, 1.0); lmTh.set('문턱 ' + thr + ' lx'); lmIph.set('광전류 (조도 ' + Math.round(lux) + ' lx = ' + Iph.toFixed(1) + ' μA)');
        lmState.set(on ? '💡 점멸등 켜짐' : '점멸등 꺼짐'); lmState.el.style.background = on ? 'rgba(255,180,0,.95)' : 'rgba(122,135,152,.95)'; lmState.el.style.color = on ? '#26324a' : '#fff';
        info('광센서는 빛(광자)을 <b>광전류</b>로 바꿔요. 조도가 문턱 <b>' + thr + ' lx</b>보다 낮아지면 점멸등이 <b>저절로 켜지고</b>, 밝아지면 꺼져요.<br>자동문 적외선 센서·연기 감지기·조도계도 같은 원리예요.');
      }

      /* ============ ④-3 태양전지 ============ */
      const gO = newScene('solar'); CAMS.solar = { dist: PHN ? 23 : 14, theta: 0.2, phi: 1.42, min: 8, max: 36, ty: 0.2 };
      const eY = (e) => -2.2 + e * 1.0, BWd = 9.2;
      const valB = stdM(BWd, 1.5, 3, 0x7a3cff, { transparent: true, opacity: 0.3 }); valB.position.set(0, eY(0) - 0.75, 0); gO.add(valB);
      const conB = stdM(BWd, 2.8, 3, 0x2f6bff, { transparent: true, opacity: 0.2 }); conB.position.set(0, eY(1.1) + 1.4, 0); gO.add(conB);
      [[eY(0), 0x7a3cff], [eY(1.1), 0x2f6bff]].forEach(([y, c]) => { const l = h.mkSeg(c, 0.04); h.setSeg(l, new V3(-BWd / 2, y, 1.5), new V3(BWd / 2, y, 1.5)); gO.add(l); });
      const vEl = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 10, 8), mat(0x4d8dff, { emissive: 0x2f6df6, emissiveIntensity: 0.7 }), 18); gO.add(vEl);
      const vElPos = []; for (let i = 0; i < 18; i++) vElPos.push(new V3(-3.6 + (i % 9) * 0.9, eY(0) - 0.4 - Math.floor(i / 9) * 0.5, 0.5));
      const phXs = -1.6;
      const sPh = sphM(0.2, 0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.9 }); gO.add(sPh);
      const sEl = sphM(0.22, 0x4d8dff, { emissive: 0x2f6df6, emissiveIntensity: 0.9 }); gO.add(sEl);
      const sHole = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.05, 8, 20), mat(0xe2464b, { emissive: 0xe2464b, emissiveIntensity: 0.6 })); gO.add(sHole);
      const phLine = h.mkSeg(0xffffff, 0.03, { basic: true, mo: { transparent: true, opacity: 0.7 } }); gO.add(phLine);
      const gapA = h.mkArrow(0xe2464b, 0.04), gapA2 = h.mkArrow(0xe2464b, 0.04); h.setArrow(gapA, new V3(3.7, eY(0.55), 1.5), new V3(3.7, eY(1.1), 1.5)); h.setArrow(gapA2, new V3(3.7, eY(0.55), 1.5), new V3(3.7, eY(0), 1.5)); gO.add(gapA, gapA2);
      label('가전자대 (전자가 가득)', [-2.6, eY(0) - 1.05, 1.5], { color: 'rgba(91,45,184,.9)', size: 12 }, 'solar');
      label('전도대 (전류를 만드는 전자)', [-2.2, eY(1.1) + 2.3, 1.5], { color: 'rgba(31,79,207,.9)', size: 12 }, 'solar');
      label('띠 간격 1.1 eV', [3.7, eY(0.55), 1.5], { color: 'rgba(192,53,59,.92)', size: 12, offset: [0.15, 0, 0] }, 'solar');
      const lsHf = label('', sPh, { color: 'rgba(28,122,74,.92)', size: 13, offset: [0.2, 0.55, 0] }, 'solar');
      const lsRes = label('', [phXs, eY(0) - 1.7, 1.5], { color: 'rgba(28,122,74,.92)', size: 13 }, 'solar');
      const lsHole = label('양공', sHole, { color: 'rgba(192,53,59,.92)', size: 12, offset: [-0.5, 0, 0] }, 'solar');
      const soP = { on: false, lam: 700 }; let oSig = '';
      function updSolar(dt, t) {
        const S = lessonS(); if (!S) return; const E = S.te, L = window.__sim, sig = E.solLam; if (sig !== oSig) { oSig = sig; if (soP.on) { soP.on = false; plSo.pause(); } }
        const lam = soP.on ? soP.lam : E.solLam, eph = 1240 / lam, ok = lam <= L.LAMG, col = waveColor(lam), cyc = (t % 2.6) / 2.6;
        const top = Math.min(eph, 4.2), yT = eY(top);
        sPh.material.color.copy(col); sPh.material.emissive.copy(col); phLine.material.color.copy(col);
        h.setSeg(phLine, new V3(phXs, eY(0), 1.0), new V3(phXs, yT, 1.0));
        for (let i = 0; i < 18; i++) { Mxp.makeTranslation(vElPos[i].x, vElPos[i].y, vElPos[i].z); if (ok && cyc > 0.3 && i === 4) Mxp.copy(Zp); vEl.setMatrixAt(i, Mxp); } vEl.instanceMatrix.needsUpdate = true;
        sEl.visible = sHole.visible = lsHole.visible = false;
        if (ok) {
          const u = Math.min(1, cyc / 0.55); sPh.visible = cyc < 0.55; sPh.position.set(phXs - 1.6 + 1.6 * u, eY(0) - 1.0 + 1.0 * u, 0.5);
          if (cyc > 0.3) { const e2 = 1 - Math.pow(1 - Math.min(1, (cyc - 0.35) / 0.4), 3); sEl.visible = sHole.visible = lsHole.visible = true; sHole.position.set(vElPos[4].x, vElPos[4].y, 0.5); sHole.rotation.y = 0;
            sEl.position.set(vElPos[4].x, vElPos[4].y + (eY(1.1) + 0.5 - vElPos[4].y) * e2, 0.5);
            if (cyc > 0.75) { const r = (cyc - 0.75) / 0.25; sEl.position.set(vElPos[4].x + (3.0 - vElPos[4].x) * r, eY(1.1) + 0.5, 0.5); } }
        } else { const u = (cyc * 1.2) % 1; sPh.visible = true; sPh.position.set(phXs - 2.2 + 5.0 * u, eY(0) - 0.4, 0.5); }
        lsHf.set('hf = ' + eph.toFixed(2) + ' eV'); lsHf.el.style.background = ok ? 'rgba(28,122,74,.92)' : 'rgba(192,53,59,.92)'; lsHf.obj = [phXs, yT + 0.2, 1.0];
        lsRes.set(ok ? '✅ hf ≥ 1.1 eV: 전자–양공 쌍이 생겨요' : '❌ hf < 1.1 eV: 에너지가 모자라 그냥 통과해요'); lsRes.el.style.background = ok ? 'rgba(28,122,74,.92)' : 'rgba(192,53,59,.92)';
        info('파장 <b>' + lam + ' nm</b> (' + (lam < 380 ? '자외선' : lam > 780 ? '적외선' : '가시광선') + ') · 광자 에너지 <b>' + eph.toFixed(2) + ' eV</b>, 규소의 띠 간격 1.1 eV(흡수 한계 약 1130 nm).<br>' + (ok ? '남는 에너지 <b>' + (eph - 1.1).toFixed(2) + ' eV</b>는 열이 돼요. 광자 하나는 전자 하나에게만 에너지를 줘요.' : '전기 에너지로 <b>바뀌지 않아요</b>.') + '<br>☀️ 1 m² 패널: 1000 W/m² × 1 m² × 20 % = 200 W');
      }

      const plP = mkPlayer('photon', { duration: 9, loop: true, autoplay: false, label: '파장 바꾸기', phases: [[0, '300 nm (자외선)'], [0.3, '400 nm'], [0.6, '540 nm (문턱)'], [0.8, '600 nm']], onFrame(p) { prP.on = true; prP.lam = Math.round(300 + p * 350); } });
      const plSe = mkPlayer('sensor', { duration: 9, loop: true, autoplay: false, label: '노출 시간 늘리기', phases: [[0, '짧게'], [0.5, '중간'], [0.85, '길게']], onFrame(p) { seP.on = true; seP.ti = Math.round(p * 18); } });
      const plLa = mkPlayer('lamp', { duration: 9, loop: true, autoplay: false, label: '해 지고 뜨기', phases: [[0, '밤'], [0.25, '저녁'], [0.5, '낮'], [0.75, '저녁']], onFrame(p) { laP.on = true; laP.lux = Math.round(500 - 500 * Math.cos(p * 6.2832)); } });
      const plSo = mkPlayer('solar', { duration: 9, loop: true, autoplay: false, label: '파장 바꾸기', phases: [[0, '가시광선'], [0.45, '근적외선'], [0.7, '1127 nm 근처'], [0.9, '적외선']], onFrame(p) { soP.on = true; soP.lam = Math.round(400 + p * 1100); } });
      const updMap = { photon: updPhoton, sensor: updSensor, lamp: updLamp, solar: updSolar };
      const hasTube = (k) => k === 'tube' || k === 'graph';
      setScene(hasTube(sceneKey()) ? 'tube' : sceneKey());
      let lsig = '';
      return {
        update(dt, t) {
          dt = Math.min(dt, 0.05);
          { const k = sceneKey(), base = hasTube(k) ? 'tube' : k; if (base !== K.cur) setScene(base); const g = k === 'graph';
            if (g !== K.graph) { K.graph = g; infoNote = g ? '<br><span style="color:#9fb0d4">📈 f–V₀ 그래프의 측정값은 이 광전관에서 얻어요.</span>' : ''; lsig = ''; }
            if (base !== 'tube') { updMap[base](dt, t); return; }
            if (g) { const S = lessonS(); if (S && S.gr && S.gr.metal !== st.metal) { st.metal = S.gr.metal; lsig = ''; txt(); } } else if (st.metal !== 'Na') { st.metal = 'Na'; lsig = ''; txt(); } }
          { const S = lessonS(); if (S && S.tb) { const g = S.tb.lam + '|' + S.tb.V + '|' + S.tb.k; if (g !== lsig) { lsig = g; st.lam = S.tb.lam; st.V = S.tb.V; st.I = Math.max(1, Math.min(5, S.tb.k)); txt(); } } }
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
        sync() { lsig = ''; },
      };
    },
  });
})();
