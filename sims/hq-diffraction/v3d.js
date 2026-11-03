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
    build(ctx) {
      const { THREE, root, label, controls } = ctx;
      const h = H3(ctx); const { V3, mat, glass, anchor, sphere, box, cyl, mkSeg, setSeg, grab, showCtl } = h;
      const labs = {}; const L = (sc, text, obj, o) => { const l = label(text, obj, o); const raw = l.set; let last = text; l.set = (t) => { if (t !== last) { last = t; raw(t); } }; (labs[sc] = labs[sc] || []).push(l); return l; };
      let lastInfo = ''; const info = (hh) => { if (hh !== lastInfo) { lastInfo = hh; ctx.info(hh); } };
      const gT = new THREE.Group(), gR = new THREE.Group(), gH = new THREE.Group(), gP = new THREE.Group(); root.add(gT, gR, gH, gP);
      const X0 = -6.5, X1 = 8, YH = 4.2, XB = -2.5;
      const NX = 112, NY = 64;
      const geo = new THREE.PlaneGeometry(X1 - X0, 2 * YH, NX, NY); geo.rotateX(-Math.PI / 2);        // x–z 평면 위의 수면 (z = 폭 방향)
      const pos = geo.attributes.position, col = new Float32Array(pos.count * 3); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const base = []; for (let i = 0; i < pos.count; i++) base.push([pos.getX(i) + (X0 + X1) / 2, pos.getZ(i)]);
      for (let i = 0; i < pos.count; i++) pos.setX(i, base[i][0]);
      const water = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.18, metalness: 0.15 })); gT.add(water);
      /* 탱크 테두리 */
      const rimM = mat(0x64748b, { metalness: 0.5, roughness: 0.4 });
      const rim = (w, d, x, z) => { const m = box(w, 0.35, d, 0x64748b, { metalness: 0.5, roughness: 0.4 }); m.position.set(x, -0.15, z); gT.add(m); };
      rim(X1 - X0 + 0.6, 0.3, (X0 + X1) / 2, YH + 0.15); rim(X1 - X0 + 0.6, 0.3, (X0 + X1) / 2, -YH - 0.15); rim(0.3, 2 * YH, X0 - 0.15, 0); rim(0.3, 2 * YH, X1 + 0.15, 0);
      /* 방해벽 */
      const wallM = mat(0x94a3b8, { metalness: 0.5, roughness: 0.4 });
      const wU = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.1, 1), wallM), wD = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.1, 1), wallM); gT.add(wU, wD);
      const aW = anchor(gT, XB, 1.0, 0), lW = L('tank', '', aW, { color: '#475569', size: 13 });
      const lI = L('tank', '들어오는 평면 파동', anchor(gT, -4.4, 0.8, -2.8), { color: '#1d4ed8', size: 12 }), lD = L('tank', '퍼져 나가는 파동', anchor(gT, 3.8, 0.8, 2.6), { color: '#0f766e', size: 12 });
      const lInfo = L('tank', '', anchor(gT, XB, 0.4, 0), { color: '#b45309', size: 13, offset: [0, 1.4, 0] });
      /* 호이겐스 파원 */
      let src = [], k = 2 * Math.PI / st.lam, w = 3.2, NA = 8;
      function setup() {
        k = 2 * Math.PI / st.lam;
        NA = Math.max(5, Math.min(22, Math.ceil(st.a / (st.lam / 3))));
        src = []; for (let j = 0; j < NA; j++) src.push(-st.a / 2 + st.a * (j + 0.5) / NA);
        const hh = (YH - st.a / 2); wU.scale.z = hh; wU.position.set(XB, 0.25, st.a / 2 + hh / 2); wD.scale.z = hh; wD.position.set(XB, 0.25, -st.a / 2 - hh / 2);
        lW.set('틈 폭 a = ' + (st.a * 2).toFixed(1) + ' cm · 파장 λ = ' + (st.lam * 2).toFixed(1) + ' cm');
        const r = st.a / st.lam;
        lInfo.set(r < 1.2 ? 'a ≈ λ → 크게 퍼져요' : r < 2.5 ? 'a가 λ보다 조금 커요' : 'a ≫ λ → 거의 직진');
        info('<b>틈 폭 ÷ 파장 = ' + r.toFixed(1) + '</b><br>' + (r < 1.2 ? '틈이 파장과 비슷하거나 더 좁아서 파동이 <b>부채꼴·반원</b>으로 크게 퍼져요 (회절).' : r < 2.5 ? '틈이 조금 넓어졌어요. 가운데는 센 파동, 가장자리로 퍼지는 파동도 남아요.' : '틈이 파장보다 훨씬 넓어서 파동이 <b>거의 직진</b>하고 가장자리만 살짝 퍼져요.') + '<br>파장이 길수록, 틈이 좁을수록 더 많이 휘어 퍼져요.' + st.note);
      }
      setup();
      const cLo = new THREE.Color(0x0b3a6b), cHi = new THREE.Color(0x7fd6ff), cMid = new THREE.Color(0x1769b3), tc = new THREE.Color();
      /* ================= ② 분해능: 두 점광원의 회절 원반 (2D와 같은 에어리 무늬) ================= */
      const RG = 70, RS = 7, RW = 3.4;                              // 격자 칸 수, 3D 한 변 길이 (px → 0.04)
      const rGeo = new THREE.PlaneGeometry(2 * RW, 2 * RW * 0.55, RG, Math.round(RG * 0.55)); rGeo.rotateX(-Math.PI / 2);
      const rPos = rGeo.attributes.position, rCol = new Float32Array(rPos.count * 3); rGeo.setAttribute('color', new THREE.BufferAttribute(rCol, 3));
      const rBase = []; for (let i = 0; i < rPos.count; i++) rBase.push([rPos.getX(i), rPos.getZ(i)]);
      const rSurf = new THREE.Mesh(rGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.1, side: THREE.DoubleSide })); gR.add(rSurf);
      const rPt = [0, 1].map(() => { const m = sphere(0.14, 0xfff3b0, { emissive: 0xffe066, emissiveIntensity: 1 }); m.position.y = 3.2; gR.add(m); return m; });
      const lensRing = new THREE.Mesh(new THREE.TorusGeometry(1, 0.07, 12, 40), mat(0x94a3b8, { metalness: 0.6 })); lensRing.rotation.x = Math.PI / 2; lensRing.position.y = 2.1; gR.add(lensRing);
      const rBeam = [0, 1].map(() => mkSeg(0xfff3b0, 0.02, { basic: true, mo: { transparent: true, opacity: 0.4 } })); rBeam.forEach((m) => gR.add(m));
      L('res', '두 점광원', anchor(gR, 0, 3.7, 0), { color: '#a16207', size: 12 }); const lLens = L('res', '', anchor(gR, 1.9, 2.1, 0), { color: '#475569', size: 12 });
      const lRes = L('res', '', anchor(gR, 0, 0.2, 2.1), { color: '#0f766e', size: 14 });
      let rKey = '';
      function lamC(l) { const r = l < 440 ? [0.5, 0.3, 1] : l < 520 ? [0.2, 0.6, 1] : l < 580 ? [0.3, 1, 0.3] : [1, 0.3, 0.25]; return r; }
      function updRes(S, sim) {
        const R = S.rs, st2 = sim.resState(), key = [R.ap, R.col, R.sD.toFixed(2)].join(); if (key === rKey) return; rKey = key;
        const sc = 0.04, r0 = st2.r0, sep = st2.sep, c = lamC(st2.lam);
        for (let i = 0; i < rPos.count; i++) {
          const x = rBase[i][0] / sc, z = rBase[i][1] / sc;
          const I = (sim.airy(Math.hypot(x - sep / 2, z), r0) + sim.airy(Math.hypot(x + sep / 2, z), r0));
          rPos.setY(i, I * 1.1);
          const v = Math.min(1, I * 0.62);
          rCol[i * 3] = 0.08 + c[0] * v; rCol[i * 3 + 1] = 0.1 + c[1] * v; rCol[i * 3 + 2] = 0.16 + c[2] * v;
        }
        rPos.needsUpdate = true; rGeo.attributes.color.needsUpdate = true; rGeo.computeVertexNormals();
        rPt[0].position.x = -sep * sc / 2; rPt[1].position.x = sep * sc / 2;
        lensRing.scale.set(R.ap === 'small' ? 1.0 : 2.4, R.ap === 'small' ? 1.0 : 2.4, 1); lensRing.scale.z = lensRing.scale.x; lensRing.scale.y = 1;
        rBeam.forEach((m, i) => setSeg(m, new V3(rPt[i].position.x, 3.2, 0), new V3(rPt[i].position.x * 0.45, 0, 0)));
        lLens.set('렌즈 구경: ' + (R.ap === 'small' ? '작은' : '큰') + ' · 빛 ' + R.col + ' nm');
        const kind = st2.kind === 'ok' ? '<b>두 점으로 구분돼요</b> (가운데가 움푹 패여요)' : st2.kind === 'vague' ? '겨우 구분될 듯 말 듯 해요' : '<b>하나로 합쳐 보여요</b>';
        lRes.set(st2.kind === 'ok' ? '구분됨' : st2.kind === 'vague' ? '애매함' : '구분 안 됨'); lRes.el.style.background = st2.kind === 'ok' ? '#0f766e' : st2.kind === 'vague' ? '#b45309' : '#b91c1c';
        info('<b>🔍 분해능: 두 점을 구분할 수 있을까?</b><br>두 점 사이의 간격 ' + R.sD.toFixed(1) + ' 눈금, ' + (R.ap === 'small' ? '작은' : '큰') + ' 구경, ' + R.col + ' nm 빛<br>' + kind + '<br>렌즈 구경이 클수록, 파장이 짧을수록 회절 원반이 작아져 더 가까운 두 점도 구분해요.');
      }

      /* ================= ③ 홀로그램 기록 (광학대) ================= */
      const HX = (x) => (x - 270) * 0.022, HY = (y) => -(y - 150) * 0.022;
      const tbl = box(12.6, 0.3, 7, 0x1f2937, { roughness: 0.7 }); tbl.position.set(0.5, -2.6, 0); gH.add(tbl);
      const comps = [
        { id: 'laser', mesh: box(1.4, 0.7, 0.7, 0xef4444, { roughness: 0.4 }), n: '레이저' },
        { id: 'bs', mesh: box(0.7, 0.7, 0.7, 0x93c5fd, { transparent: true, opacity: 0.7, roughness: 0.1 }), n: '빔 분할기' },
        { id: 'mirror', mesh: box(0.12, 0.8, 0.8, 0xe2e8f0, { metalness: 0.9, roughness: 0.1 }), n: '거울' },
        { id: 'obj', mesh: (function () { const g = new THREE.Group(); const b = cyl(0.35, 0.45, 0.5, 0xd1d5db, {}, 14), hd = sphere(0.3, 0xe5e7eb); hd.position.y = 0.5; const bd = cyl(0.3, 0.38, 0.8, 0xd1d5db, {}, 14); bd.position.y = 0.0; g.add(bd, hd); return g; }()), n: '물체(조각상)' },
        { id: 'film', mesh: box(0.1, 3.3, 1.8, 0xbfe3ff, { transparent: true, opacity: 0.45, roughness: 0.1 }), n: '필름' },
      ];
      const gBeams = [0, 1, 2, 3].map((i) => mkSeg(i < 2 ? 0xff4d4d : i === 2 ? 0xff9a9a : 0xff6b6b, 0.045, { basic: true, mo: { transparent: true, opacity: 0.9 } })); gBeams.forEach((m) => gH.add(m));
      const hLab = comps.map((c) => { c.mesh.position.set(0, 0, 0); gH.add(c.mesh); return L('holo', c.n, c.mesh, { color: '#475569', size: 12, offset: [0, 0.9, 0] }); });
      const fringeTex = (function () { const cv = document.createElement('canvas'); cv.width = 8; cv.height = 256; const g2 = cv.getContext('2d'); return { cv, g2, tex: new THREE.CanvasTexture(cv) }; }());
      const lHolo = L('holo', '', anchor(gH, 0.5, 3.4, 0), { color: '#0f766e', size: 13 });
      function paintFringe(con) { const g2 = fringeTex.g2; const img = g2.createImageData(8, 256); for (let j = 0; j < 256; j++) { const v = 0.5 + 0.5 * con * Math.sin(j * 0.9); const c = Math.round(40 + 200 * v); for (let i = 0; i < 8; i++) { const o = (j * 8 + i) * 4; img.data[o] = c * 0.8; img.data[o + 1] = c; img.data[o + 2] = c * 1.1 > 255 ? 255 : c * 1.1; img.data[o + 3] = 255; } } g2.putImageData(img, 0, 0); fringeTex.tex.needsUpdate = true; }
      const filmFringe = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 3.2), new THREE.MeshBasicMaterial({ map: fringeTex.tex, transparent: true, opacity: 0.0, side: THREE.DoubleSide })); filmFringe.rotation.y = Math.PI / 2; gH.add(filmFringe);
      let hKey = '';
      function updHolo(S, sim) {
        const hl = S.hl, items = hl.items; if (!items) return;
        const con = sim.contrast(), all = sim.allPlaced(), pl = items.map((it) => it.placed).join(), key = [pl, hl.vib.toFixed(2), hl.view, hl.table].join(); if (key === hKey) return; hKey = key;
        items.forEach((it, i) => { const c = comps[i], slot = it.slot; c.mesh.position.set(HX(slot.x), HY(slot.y) - (c.id === 'film' ? 0 : 0.2), 0); c.mesh.visible = true; c.mesh.traverse((o) => { if (o.material && o.material.userData) { if (o.material.userData.o0 == null) o.material.userData.o0 = o.material.opacity; } }); const tpl = it.placed; c.mesh.traverse((o) => { if (o.material) { o.material.transparent = true; o.material.opacity = tpl ? (o.material.userData.o0 != null ? o.material.userData.o0 : 1) : 0.18; } }); hLab[i].show(true); hLab[i].set(c.n + (tpl ? '' : ' (놓을 자리)')); });
        const p = (i) => comps[i].mesh.position, on = all;
        const L0 = p(0), B0 = p(1), M0 = p(2), O0 = p(3), F0 = p(4);
        setSeg(gBeams[0], L0, B0); setSeg(gBeams[1], B0, O0.clone().setY(O0.y + 0.2)); setSeg(gBeams[2], B0.clone(), M0); setSeg(gBeams[3], M0, F0);
        gBeams.forEach((m) => (m.visible = on));
        filmFringe.position.copy(F0); filmFringe.position.x += 0.08; paintFringe(on ? con : 0); filmFringe.material.opacity = on ? 0.9 : 0;
        lHolo.set(on ? '필름에 간섭무늬 기록 · 무늬 선명도 ' + Math.round(con * 100) + ' %' : '부품을 광학대에 놓아 보세요 (2D)');
        info('<b>🧪 홀로그램 기록</b>: 레이저 빛을 둘로 나눠 <b>물체광</b>(물체에 반사)과 <b>기준광</b>(거울을 거쳐 바로 필름으로)을 필름에서 만나게 해요.<br>' + (on ? '두 빛의 <b>간섭무늬</b>(위상 정보)가 필름에 새겨져요. 방진대가 흔들리면(' + Math.round(hl.vib * 100) + ' %) 무늬가 흐려져요.' : '아직 부품이 다 놓이지 않았어요. 2D 화면에서 끌어서 놓아요. (놓인 부품은 진하게, 빈자리는 흐리게 보여요)'));
      }

      /* ================= ④ 재생과 활용 (기준광으로 입체상 재생) ================= */
      const US = 0.03;
      const plFilm = new THREE.Mesh(new THREE.BoxGeometry(95 * 2 * US * 0.9, 95 * 2 * US, 0.08), glass(0xbfe3ff, 0.3, { roughness: 0.1 })); gP.add(plFilm);
      const plPiece = new THREE.Mesh(new THREE.BoxGeometry(22 * 2 * US, 95 * 2 * US, 0.08), glass(0xfde68a, 0.5, { roughness: 0.1 })); gP.add(plPiece);
      const sph = sphere(28 * US, 0x60a5fa, { roughness: 0.3, emissive: 0x1d4ed8, emissiveIntensity: 0.35 }); sph.position.z = -70 * US; gP.add(sph);
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(24 * US, 0), mat(0xfacc15, { emissive: 0xf59e0b, emissiveIntensity: 0.6 })); star.position.z = -190 * US; gP.add(star);
      const eye = sphere(0.22, 0xf8fafc, { emissive: 0xffffff, emissiveIntensity: 0.3 }); gP.add(eye);
      const sightS = mkSeg(0xfde68a, 0.02, { basic: true, mo: { transparent: true, opacity: 0.55 } }), sightT = mkSeg(0xfacc15, 0.02, { basic: true, mo: { transparent: true, opacity: 0.55 } }); gP.add(sightS, sightT);
      const refB = mkSeg(0xff5a5a, 0.06, { basic: true, mo: { transparent: true, opacity: 0.85 } }); setSeg(refB, new V3(-5.5, 3.2, 3.0), new V3(0, 0.0, 0.05)); gP.add(refB);
      const lSph = L('play', '', sph, { color: '#1d4ed8', size: 12, offset: [0, 1.2, 0] }), lStar = L('play', '', star, { color: '#a16207', size: 12, offset: [0, 1.1, 0] });
      const lEye = L('play', '', eye, { color: '#475569', size: 12, offset: [0, 0.55, 0] }), lFilm = L('play', '', anchor(gP, 0, 3.15, 0), { color: '#0369a1', size: 12 });
      let pKey = '';
      function updPlay(S, sim) {
        const P = S.pl, e = P.eD, v = sim.plView(P.e, P.cut, P.ref), key = [e.toFixed(2), P.cut, P.ref].join(); if (key === pKey) return; pKey = key;
        const full = P.cut !== 'piece'; plFilm.visible = full; plPiece.visible = !full;
        refB.visible = P.ref;
        const eyePos = new V3(e * US, 0, 120 * US); eye.position.copy(eyePos);
        sph.visible = !!v.sphIn; star.visible = !!v.starIn;
        sph.material.opacity = 1; star.material.transparent = true; star.material.opacity = v.clear ? 1 : 0.35; star.material.emissiveIntensity = v.clear ? 0.8 : 0.1;
        setSeg(sightS, eyePos, sph.position); setSeg(sightT, eyePos, star.position); sightS.visible = !!v.sphIn; sightT.visible = !!v.starIn;
        lSph.set('앞 물체(공)'); lStar.set(v.star ? '가려졌던 별이 보여요!' : v.starIn ? '별 (공에 가려져요)' : '별'); lSph.show(!!v.sphIn && !!labs.play.on); lStar.show(!!v.starIn && !!labs.play.on);
        lEye.set('눈 (e = ' + Math.round(e) + ')'); lFilm.set(full ? '필름 전체' : '필름 한 조각');
        info('<b>🎞️ 재생: 기준광만 비춰도 입체상이 떠올라요</b><br>' + (P.ref ? '기준광을 필름에 비추면 필름 뒤에 <b>입체상</b>이 보여요.' : '기준광이 없으면 상이 재생되지 않아요.') + '<br>눈을 옆으로 옮기면(2D의 슬라이더) 앞의 공이 비켜나며 가려진 별이 보여요 (시차).<br>' + (full ? '필름 전체' : '필름 한 조각만으로도 전체 상이 보이지만 볼 수 있는 범위가 좁아져요.') + (v.star ? '<br><b>지금은 가려진 별이 보여요!</b>' : ''));
      }

      /* ▶ 재생 */
      let built = false, tankP = 0, tankUser = false;
      built = true;
      let lastSc = '', fk = '';
      function tankFrame(S, t) {
        const df = S.df, a = df.aCm * 0.5, lam = df.lamCm * 0.5, note = df.sub !== 'tank' ? '<br>(레이저·소리와 빛 장면은 2D에서 해요. 3D는 물결 탱크 모형이에요.)' : '';
        const key = [a, lam, note].join(); if (key !== fk) { fk = key; st.a = Math.max(0.25, Math.min(6, a)); st.lam = Math.max(0.7, Math.min(2.2, lam)); st.note = note; setup(); }
        const wt = w * t, n = pos.count;
        for (let i = 0; i < n; i++) {
          const x = base[i][0], z = base[i][1]; let u;
          if (x < XB - 0.22) { u = Math.cos(k * (x - XB) - wt); }
          else if (x < XB + 0.22) { u = Math.abs(z) < st.a / 2 ? Math.cos(-wt) : 0; }
          else { let s = 0; const dx = x - XB; for (let j = 0; j < NA; j++) { const dz = z - src[j], r = Math.sqrt(dx * dx + dz * dz) + 1e-3; s += Math.cos(k * r - wt + Math.PI / 4) / Math.sqrt(r); } u = s * (st.a / NA) * Math.sqrt(k / (2 * Math.PI)); }
          const edge = Math.min(1, (X1 - x) / 1.2, (z + YH) / 0.8, (YH - z) / 0.8); u *= Math.max(0, edge);
          if (u > 1.6) u = 1.6; else if (u < -1.6) u = -1.6;
          pos.setY(i, u * 0.2);
          const f = (u + 1.2) / 2.4, aa = Math.max(0, Math.min(1, f));
          if (aa < 0.5) tc.copy(cLo).lerp(cMid, aa * 2); else tc.copy(cMid).lerp(cHi, (aa - 0.5) * 2);
          col[i * 3] = tc.r; col[i * 3 + 1] = tc.g; col[i * 3 + 2] = tc.b;
        }
        pos.needsUpdate = true; geo.attributes.color.needsUpdate = true; geo.computeVertexNormals();
      }
      return {
        update(dt, t) {
          const sim = window.__sim; if (!sim) return; const S = sim.S, sc = S.mode === 'diff' ? 'tank' : S.mode === 'res' ? 'res' : S.mode === 'holo' ? 'holo' : 'play';
          if (sc !== lastSc) { lastSc = sc; fk = ''; rKey = hKey = pKey = ''; gT.visible = sc === 'tank'; gR.visible = sc === 'res'; gH.visible = sc === 'holo'; gP.visible = sc === 'play'; Object.keys(labs).forEach((k2) => { labs[k2].on = k2 === sc; labs[k2].forEach((l) => l.show(k2 === sc)); }); const o = ctx.orbit; o.theta = sc === 'tank' ? -0.35 : sc === 'play' ? -0.5 : 0.2; o.phi = sc === 'tank' ? 0.95 : sc === 'res' ? 1.0 : 1.15; o.tx = sc === 'tank' ? 1 : 0; o.ty = sc === 'tank' ? -0.4 : sc === 'res' ? 1.2 : 0; o.dist = (sc === 'tank' ? 15.5 : sc === 'res' ? 11 : sc === 'holo' ? 16 : 14) * KD; showCtl('__none'); }
          if (sc === 'tank') tankFrame(S, t); else if (sc === 'res') updRes(S, sim); else if (sc === 'holo') updHolo(S, sim); else updPlay(S, sim);
        },
        sync() { fk = ''; rKey = hKey = pKey = ''; },
      };
    },
  });
})();
