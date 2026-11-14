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
    levels: [0, 1, 3],   // 3단계(홀로그램 기록)는 부품을 캔버스에서 끌어 광학대에 놓아야 해서 2D
    build(ctx) {
      const { THREE, root, label, controls } = ctx;
      const h = H3(ctx); const { V3, mat, glass, anchor, sphere, box, cyl, mkSeg, setSeg, grab, showCtl } = h;
      const labs = {}; const L = (sc, text, obj, o) => { const l = label(text, obj, o); const raw = l.set; let last = text; l.set = (t) => { if (t !== last) { last = t; raw(t); } }; (labs[sc] = labs[sc] || []).push(l); return l; };
      let lastInfo = ''; const info = (hh) => { if (hh !== lastInfo) { lastInfo = hh; ctx.info(hh); } };
      const gT = new THREE.Group(), gR = new THREE.Group(), gH = new THREE.Group(), gP = new THREE.Group(); root.add(gT, gR, gH, gP);
      const st = { a: 2.0, lam: 1.2, note: "" };
      const X0 = -6.5, X1 = 8, YH = 4.2, XB = -2.5;
      const NX = 112, NY = 64;
      const geo = new THREE.PlaneGeometry(X1 - X0, 2 * YH, NX, NY); geo.rotateX(-Math.PI / 2);        // x–z 평면 위의 수면 (z = 폭 방향)
      const pos = geo.attributes.position, col = new Float32Array(pos.count * 3); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const base = []; for (let i = 0; i < pos.count; i++) base.push([pos.getX(i) + (X0 + X1) / 2, pos.getZ(i)]);
      for (let i = 0; i < pos.count; i++) pos.setX(i, base[i][0]);
      const water = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.18, metalness: 0.15 })); gT.add(water);
      /* 탱크 테두리 */
      const rimM = mat(0x64748b, { metalness: 0.5, roughness: 0.4 });
      const rim = (w, d, x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.35, d), ctx.mats.metal('aluminium', { brushed: true })); m.position.set(x, -0.15, z); gT.add(m); };
      rim(X1 - X0 + 0.6, 0.3, (X0 + X1) / 2, YH + 0.15); rim(X1 - X0 + 0.6, 0.3, (X0 + X1) / 2, -YH - 0.15); rim(0.3, 2 * YH, X0 - 0.15, 0); rim(0.3, 2 * YH, X1 + 0.15, 0);
      /* 방해벽 */
      const wallM = ctx.mats.metal('steel', { brushed: true });
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
        info('<b>틈 폭 ÷ 파장 = ' + r.toFixed(1) + '</b><br>' + (r < 1.2 ? '틈이 파장과 비슷하거나 더 좁아서 파동이 <b>부채꼴·반원</b>으로 크게 퍼져요 (회절).' : r < 2.5 ? '틈이 조금 넓어졌어요. 가운데는 센 파동, 가장자리로 퍼지는 파동도 남아요.' : '틈이 파장보다 훨씬 넓어서 파동이 <b>거의 직진</b>하고 가장자리만 살짝 퍼져요.') + '<br>틈 폭과 파장을 바꾸며 점선 밖으로 퍼지는 정도를 비교해 봐요.' + st.note);
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
      const lensRing = new THREE.Mesh(new THREE.TorusGeometry(1, 0.07, 12, 40), ctx.mats.metal('chrome', { roughness: 0.15 })); lensRing.rotation.x = Math.PI / 2; lensRing.position.y = 2.1; gR.add(lensRing);
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
        info('<b>🔍 분해능: 두 점을 구분할 수 있을까?</b><br>두 점 사이의 간격 ' + R.sD.toFixed(1) + ' 눈금, ' + (R.ap === 'small' ? '작은' : '큰') + ' 구경, ' + R.col + ' nm 빛<br>' + kind + '<br>구경과 빛의 색을 바꾸며 회절 원반의 크기와 구분되는 최소 간격(아래 읽음 칸)을 비교해 봐요.');
      }

      /* ================= ③ 홀로그램 기록 (광학대) ================= */
      const HX = (x) => (x - 270) * 0.022, HY = (y) => -(y - 150) * 0.022;
      const tbl = new THREE.Mesh(new THREE.BoxGeometry(12.6, 0.3, 7), ctx.mats.metal(0x3a4150, { roughness: 0.45, brushed: true, repeat: 4 }));   // 광학 테이블 tbl.position.set(0.5, -2.6, 0); gH.add(tbl);
      const comps = [
        { id: 'laser', mesh: new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.7, 0.7), ctx.mats.plastic(0xd8343a, { roughness: 0.25 })), n: '레이저' },
        { id: 'bs', mesh: new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), ctx.mats.glass({ tint: 0x93c5fd, opacity: 0.55 })), n: '빔 분할기' },
        { id: 'mirror', mesh: new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.8, 0.8), ctx.mats.metal('chrome', { roughness: 0.03 })), n: '거울' },
        { id: 'obj', mesh: (function () { const g = new THREE.Group(); const stat = ctx.mats.ceramic(0xe2e5ea); const b = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.5, 32), stat), hd = new THREE.Mesh(new THREE.SphereGeometry(0.3, 32, 24), stat); hd.position.y = 0.5; const bd = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.38, 0.8, 32), stat); bd.position.y = 0.0; g.add(bd, hd); return g; }()), n: '물체(조각상)' },
        { id: 'film', mesh: new THREE.Mesh(new THREE.BoxGeometry(0.1, 3.3, 1.8), ctx.mats.glass({ tint: 0xbfe3ff, opacity: 0.45 })), n: '필름' },
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
        lHolo.set(on ? '필름에 간섭무늬 기록 · 무늬 선명도 ' + Math.round(con * 100) + ' %' : '부품을 광학대에 놓아 보세요');
        info('<b>🧪 홀로그램 기록</b>: 레이저 빛을 둘로 나눠 <b>물체광</b>(물체에 반사)과 <b>기준광</b>(거울을 거쳐 바로 필름으로)을 필름에서 만나게 해요.<br>' + (on ? '두 빛의 <b>간섭무늬</b>(위상 정보)가 필름에 새겨져요. 방진대가 흔들리면(' + Math.round(hl.vib * 100) + ' %) 무늬가 흐려져요.' : '아직 부품이 다 놓이지 않았어요. (놓인 부품은 진하게, 빈자리는 흐리게 보여요)'));
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
        info('<b>🎞️ 재생: 기준광만 비춰도 입체상이 떠올라요</b><br>' + (P.ref ? '기준광을 필름에 비추면 필름 뒤에 <b>입체상</b>이 보여요.' : '기준광이 없으면 상이 재생되지 않아요.') + '<br>눈을 옆으로 옮기면(눈 위치 슬라이더) 앞의 공이 비켜나며 가려진 별이 보여요 (시차).<br>' + (full ? '필름 전체' : '필름 한 조각만으로도 전체 상이 보이지만 볼 수 있는 범위가 좁아져요.') + (v.star ? '<br><b>지금은 가려진 별이 보여요!</b>' : ''));
      }

      /* ================= ⑤ 레이저의 회절 (laser) ================= */
      const gL = new THREE.Group(), gD2 = new THREE.Group(); root.add(gL, gD2); gL.visible = gD2.visible = false;
      const CAMS2 = { laser: { dist: PHN ? 28 : 14, theta: -0.3, phi: 0.95, tx: 0.2, ty: 0, tz: 0 }, door: { dist: 15 * KD, theta: -0.25, phi: 0.9, tx: 1.0, ty: 0, tz: 0 } };
      const lbx = box(14.5, 0.3, 7, 0x1f2937, { roughness: 0.7 }); lbx.position.set(0.2, -0.9, 0); gL.add(lbx);
      const lsBox = box(1.6, 0.8, 0.8, 0x4a5568); lsBox.position.set(-6.2, 0, 0); gL.add(lsBox); const lsLed = sphere(0.14, 0xe53935, { emissive: 0xff2020, emissiveIntensity: 1 }); lsLed.position.set(-5.35, 0, 0); gL.add(lsLed);
      const lBeam = mkSeg(0xff3b30, 0.05, { basic: true, mo: { transparent: true, opacity: 0.9 } }); gL.add(lBeam);
      const LXs = -1.2, LXe = 5.4, LK = 2.6 / 80;
      const lPl = [0, 1].map(() => { const m = box(0.25, 1.8, 1, 0x556070, { metalness: 0.4 }); gL.add(m); return m; });
      const lScr = box(0.2, 1.8, 5.5, 0x10131c); lScr.position.set(LXe, 0, 0); gL.add(lScr);
      const lcv = document.createElement('canvas'); lcv.width = 256; lcv.height = 32; const lcx = lcv.getContext('2d'), ltex = new THREE.CanvasTexture(lcv);
      const lScrTex = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 1.7), new THREE.MeshBasicMaterial({ map: ltex, side: THREE.DoubleSide })); lScrTex.rotation.y = -Math.PI / 2; lScrTex.position.set(LXe - 0.12, 0, 0); gL.add(lScrTex);
      const fanG = new THREE.BufferGeometry(); fanG.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9), 3)); const fan = new THREE.Mesh(fanG, new THREE.MeshBasicMaterial({ color: 0xff3b30, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false })); fan.frustumCulled = false; gL.add(fan);
      let prof = null, lSig = '';
      const lcF = L('laser', '레이저', lsBox, { color: '#475569', size: 12, offset: [0, 0.8, 0] }), lcSl = L('laser', '', anchor(gL, LXs, 1.5, 0), { color: '#26324a', size: 12 }), lcWd = L('laser', '', anchor(gL, 2.2, 0.2, 0), { color: '#e8501b', size: 13 });
      L('laser', '스크린 (2 m)', anchor(gL, LXe, -1.3, 2.7), { color: '#475569', size: 12 }); L('laser', '(틈은 확대해서 그렸어요)', anchor(gL, LXs, -1.3, -1.4), { color: '#5d6879', size: 11 });
      const lcI = L('laser', '밝기 (높을수록 밝아요)', anchor(gL, LXe - 0.6, 2.8, 2.6), { color: '#e53935', size: 11 });
      const laP = { on: false, a: 0.5 }; let laSig = '';
      const wlcol = [255, 70, 55];
      function paintLaser(aMm) {
        const L2 = window.__sim; for (let x = 0; x < 256; x++) { const mm = (x / 255 - 0.5) * 2 * 80 * (5.2 / 5.2); const v = Math.pow(L2.lasI(aMm, mm), 0.5); lcx.fillStyle = 'rgb(' + Math.round(wlcol[0] * v) + ',' + Math.round(wlcol[1] * v) + ',' + Math.round(wlcol[2] * v) + ')'; lcx.fillRect(x, 0, 1, 32); } ltex.needsUpdate = true;
        if (prof) { gL.remove(prof); prof.geometry.dispose(); }
        const pts = []; for (let i = 0; i <= 120; i++) { const mm = -80 + 160 * i / 120; pts.push(new V3(LXe - 0.7, -0.75 + L2.lasI(aMm, mm) * 2.0 + 0.0, mm * LK)); }
        prof = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 240, 0.04, 6), basicM(0xff5a4a)); gL.add(prof);
      }
      function basicM(c) { return new THREE.MeshBasicMaterial({ color: c }); }
      function updLaser(S, sim, t) {
        const sg = S.df.slit; if (sg !== laSig) { laSig = sg; if (laP.on) { laP.on = false; plLa.pause(); } }
        const aMm = laP.on ? laP.a : { '0.5': 0.5, '0.1': 0.1, '0.02': 0.02 }[S.df.slit], half = sim.lasHalf(aMm), gap = (3 + (Math.log10(aMm) + 1.7) * 9) * 0.04 * 1.6;
        if (aMm !== lSig) { lSig = aMm; paintLaser(aMm); }
        setSeg(lBeam, new V3(-5.3, 0, 0), new V3(LXs, 0, 0));
        lPl[0].scale.z = 3.2 - gap / 2; lPl[0].position.set(LXs, 0, gap / 2 + (3.2 - gap / 2) / 2); lPl[1].scale.z = 3.2 - gap / 2; lPl[1].position.set(LXs, 0, -gap / 2 - (3.2 - gap / 2) / 2);
        const gh = half * LK, pa = fanG.attributes.position; pa.setXYZ(0, LXs, 0, 0); pa.setXYZ(1, LXe - 0.1, 0, -gh); pa.setXYZ(2, LXe - 0.1, 0, gh); pa.needsUpdate = true;
        lcSl.set('틈 ' + aMm + ' mm'); lcWd.set('중앙 무늬의 폭 ' + (2 * half).toFixed(half < 5 ? 1 : 0) + ' mm'); lcWd.obj = [2.2, 0.4, 0];
        info('<b>🔦 레이저의 회절</b>: 틈이 <b>' + aMm + ' mm</b>이면 스크린(2 m)의 중앙 무늬 폭은 <b>' + (2 * half).toFixed(half < 5 ? 1 : 0) + ' mm</b>예요.<br>' + (aMm === 0.5 ? '틈이 넓으면 좁은 줄이 생겨요.' : aMm === 0.1 ? '틈을 좁히면 무늬가 더 넓게 퍼져요.' : '아주 좁은 틈: 스크린 가득 퍼져요.') + ' 막대 높이는 밝기예요.');
      }

      /* ================= ⑥ 소리와 빛이 문을 지날 때 (door) ================= */
      const DW = 2.0, DXB = -2.5, DNX = 90, DNY = 56, DYH = 4.2, DX0 = -6.5, DX1 = 7.5;
      const dgeo = new THREE.PlaneGeometry(DX1 - DX0, 2 * DYH, DNX, DNY); dgeo.rotateX(-Math.PI / 2);
      const dpos = dgeo.attributes.position, dcol = new Float32Array(dpos.count * 3); dgeo.setAttribute('color', new THREE.BufferAttribute(dcol, 3));
      const dbase = []; for (let i = 0; i < dpos.count; i++) dbase.push([dpos.getX(i) + (DX0 + DX1) / 2, dpos.getZ(i)]); for (let i = 0; i < dpos.count; i++) dpos.setX(i, dbase[i][0]);
      const dwater = new THREE.Mesh(dgeo, new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.3, metalness: 0.1 })); gD2.add(dwater);
      const dwU = box(0.45, 1.3, 1, 0x94a3b8, { metalness: 0.4 }), dwD = box(0.45, 1.3, 1, 0x94a3b8, { metalness: 0.4 }); gD2.add(dwU, dwD);
      const hhD = DYH - DW / 2; dwU.scale.z = hhD; dwU.position.set(DXB, 0.3, DW / 2 + hhD / 2); dwD.scale.z = hhD; dwD.position.set(DXB, 0.3, -DW / 2 - hhD / 2);
      const earPos = new V3(DXB + 3.1, 0.5, 2.7), ear = sphere(0.35, 0x14a058, { emissive: 0x0b6b3a, emissiveIntensity: 0.4 }); ear.position.copy(earPos); gD2.add(ear);
      const earL = L('door', '', ear, { color: '#14a058', size: 13, offset: [0, 0.9, 0] }), dLab = L('door', '문 (폭 1 m)', anchor(gD2, DXB, 1.1, 0), { color: '#26324a', size: 12 }), dSrc = L('door', '', anchor(gD2, -5.2, 0.6, -2.6), { color: '#1d4ed8', size: 12 });
      L('door', '모퉁이 너머', anchor(gD2, earPos.x, 0.2, earPos.z + 1.0), { color: '#475569', size: 11 });
      const dtP = { on: false, light: false }; let dSig = '';
      const dc0 = new THREE.Color(0x0b3a6b), dc1 = new THREE.Color(0x1769b3), dc2 = new THREE.Color(0x7fd6ff), dtc = new THREE.Color();
      function updDoor(S, sim, t) {
        const sg = S.df.door; if (sg !== dSig) { dSig = sg; if (dtP.on) { dtP.on = false; plDo.pause(); } }
        const snd = dtP.on ? !dtP.light : S.df.door === 'sound', lam = snd ? 1.0 : 0.45, k = 2 * Math.PI / lam, w = 3.2, NA2 = 14, a = DW, src2 = []; for (let j = 0; j < NA2; j++) src2.push(-a / 2 + a * (j + 0.5) / NA2);
        const wt = w * t;
        for (let i = 0; i < dpos.count; i++) {
          const x = dbase[i][0], z = dbase[i][1]; let u;
          if (x < DXB - 0.22) u = Math.cos(k * (x - DXB) - wt);
          else if (x < DXB + 0.22) u = Math.abs(z) < a / 2 ? Math.cos(-wt) : 0;
          else if (!snd) u = Math.abs(z) < a / 2 ? Math.cos(k * (x - DXB) - wt) : 0;
          else { let s = 0; const dx = x - DXB; for (let j = 0; j < NA2; j++) { const dz = z - src2[j], r = Math.sqrt(dx * dx + dz * dz) + 1e-3; s += Math.cos(k * r - wt + Math.PI / 4) / Math.sqrt(r); } u = s * (a / NA2) * Math.sqrt(k / (2 * Math.PI)); }
          const edge = Math.min(1, (DX1 - x) / 1.2, (z + DYH) / 0.8, (DYH - z) / 0.8); u *= Math.max(0, edge); u = Math.max(-1.6, Math.min(1.6, u));
          dpos.setY(i, u * 0.2); const f = Math.max(0, Math.min(1, (u + 1.2) / 2.4)); if (f < 0.5) dtc.copy(dc0).lerp(dc1, f * 2); else dtc.copy(dc1).lerp(dc2, (f - 0.5) * 2);
          if (!snd) { dtc.lerp(new THREE.Color(0xfff0a0), 0.55 * f); if (x >= DXB && Math.abs(z) >= a / 2) dtc.copy(dc0).multiplyScalar(0.7); }
          dcol[i * 3] = dtc.r; dcol[i * 3 + 1] = dtc.g; dcol[i * 3 + 2] = dtc.b;
        }
        dpos.needsUpdate = true; dgeo.attributes.color.needsUpdate = true; dgeo.computeVertexNormals();
        // 귀에서 들리는 크기 (2D와 같은 계산)
        let lvl = 0; if (snd) { const TKk = sim.TK, MIC2 = sim.MIC, xs = (window.innerWidth < 600 ? 150 : 200) + TKk.wt; try { const ref = sim.DOOR.amp(xs + Math.hypot(MIC2.x - xs, MIC2.y - TKk.h / 2), TKk.h / 2); lvl = sim.DOOR.amp(MIC2.x, MIC2.y) / Math.max(1e-6, ref); } catch (e) { lvl = 0.3; } }
        earL.set(snd ? (lvl > 0.45 ? '또렷이 들려요' : lvl > 0.2 ? '작게 들려요' : '거의 안 들려요') : '안 보여요 (그림자)'); earL.el.style.background = snd && lvl > 0.2 ? 'rgba(20,160,88,.92)' : 'rgba(74,85,104,.92)';
        ear.material.color.set(snd ? 0x14a058 : 0x6b7280); dSrc.set(snd ? '🔊 소리 (파장 약 0.5 m)' : '💡 빛 (파장 약 500 nm)');
        info(snd ? '<b>🔊 소리는 문을 지나 퍼져요</b>: 파장 약 0.5 m, 문 폭 1 m는 파장의 <b>2배</b> → 크게 퍼져서 모퉁이 너머에서도 들려요.' : '<b>💡 빛은 문을 지나도 거의 직진해요</b>: 파장 약 500 nm, 문 폭 1 m는 파장의 약 <b>200만 배</b> → 퍼짐이 아주 작아 모퉁이 너머는 그림자예요.<br>(그림의 빛의 파장은 실제보다 훨씬 크게 그렸어요.)');
      }

      const PLS = [];
      const mkPlayer = (sc, o) => { const p = ctx.controls.player(o), rs = document.querySelectorAll('.v3-player'), row = rs[rs.length - 1]; PLS.push({ sc, p, row }); row.style.display = 'none'; return p; };
      const plLa = mkPlayer('laser', { duration: 8, loop: true, autoplay: false, label: '틈 좁히기', phases: [[0, '틈 0.5 mm'], [0.4, '0.1 mm'], [0.85, '0.02 mm']], onFrame(p) { laP.on = true; laP.a = Math.pow(10, Math.log10(0.5) + p * (Math.log10(0.02) - Math.log10(0.5))); } });
      const plDo = mkPlayer('door', { duration: 8, loop: true, autoplay: false, label: '소리 ↔ 빛', phases: [[0, '소리'], [0.5, '빛']], onFrame(p) { dtP.on = true; dtP.light = p >= 0.5; } });
      /* ▶ 재생 */
      let built = false, tankP = 0, tankUser = false;
      built = true;
      let lastSc = '', fk = '';
      function tankFrame(S, t) {
        const df = S.df, a = df.aCm * 0.5, lam = df.lamCm * 0.5, note = '';
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
          const sim = window.__sim; if (!sim) return; const S = sim.S, sc = S.mode === 'diff' ? (S.df.sub === 'laser' ? 'laser' : S.df.sub === 'door' ? 'door' : 'tank') : S.mode === 'res' ? 'res' : S.mode === 'holo' ? 'holo' : 'play';
          if (sc !== lastSc) { lastSc = sc; fk = ''; rKey = hKey = pKey = ''; gT.visible = sc === 'tank'; gR.visible = sc === 'res'; gH.visible = sc === 'holo'; gP.visible = sc === 'play'; gL.visible = sc === 'laser'; gD2.visible = sc === 'door'; PLS.forEach((x) => { const on = x.sc === sc; x.row.style.display = on ? '' : 'none'; if (!on) x.p.pause(); }); Object.keys(labs).forEach((k2) => { labs[k2].on = k2 === sc; labs[k2].forEach((l) => l.show(k2 === sc)); }); const o = ctx.orbit; o.theta = sc === 'tank' ? -0.35 : sc === 'play' ? -0.5 : 0.2; o.phi = sc === 'tank' ? 0.95 : sc === 'res' ? 1.0 : 1.15; o.tx = sc === 'tank' ? 1 : 0; o.ty = sc === 'tank' ? -0.4 : sc === 'res' ? 1.2 : 0; o.dist = (sc === 'tank' ? 15.5 : sc === 'res' ? 11 : sc === 'holo' ? 16 : 14) * KD; showCtl('__none'); if (CAMS2[sc]) Object.assign(o, CAMS2[sc]); }
          if (sc === 'tank') tankFrame(S, t); else if (sc === 'laser') updLaser(S, sim, t); else if (sc === 'door') updDoor(S, sim, t); else if (sc === 'res') updRes(S, sim); else if (sc === 'holo') updHolo(S, sim); else updPlay(S, sim);
        },
        sync() { fk = ''; rKey = hKey = pKey = ''; },
      };
    },
  });
})();
