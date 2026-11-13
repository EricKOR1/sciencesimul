/* hq-single-photon · 3D 한 알씩 이중 슬릿 (전자총 · 이중 슬릿 · 스크린 위에 쌓이는 점)
   한 알씩 보내도 점이 하나씩 찍히지만, 많이 쌓이면 확률 파동의 간섭무늬가 나타나요. 어느 틈을 지났는지 알아내면(검출기) 간섭무늬가 사라져요. */
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
    const glass = (c, op, o) => ctx.mats.glass({ tint: c, opacity: op, extra: o });
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
  const MODE2SC = {};
  window.SciSim3D.attach({
    title: '이중 슬릿 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: 23.5 * KD, theta: -0.8, phi: 0.92, min: 8, max: 36, target: [0.6, 0.6, 0] },
    autoRotate: 0,
    levels: [1, 2, 3],
    build(ctx) {
      const { THREE, controls } = ctx;
      /* ---- 여러 장면 도우미 (2D 장면 S.mode에 맞춰 그룹 · 이름표 · 재생 줄을 바꿔요) ---- */
      const root = new THREE.Group(); ctx.root.add(root);
      const G = { main: root }, K = { cur: '', labs: [], pls: [] };
      const label = (text, obj, o, sc) => {
        const L = ctx.label(text, obj, o), sh = L.show; L._own = true; L._sc = sc || 'main';
        L._ap = () => sh(L._own && K.cur === L._sc); L.show = (v) => { L._own = v; L._ap(); }; K.labs.push(L); L._ap(); return L;
      };
      const mkPlayer = (sc, o) => {
        const p = controls.player(o), rs = document.querySelectorAll('.v3-player'), row = rs[rs.length - 1];
        K.pls.push({ sc, p, row }); row.style.display = sc === K.cur ? '' : 'none'; return p;
      };
      const newScene = (k) => { const g = new THREE.Group(); g.visible = false; ctx.root.add(g); G[k] = g; return g; };
      const CAMS = { main: { dist: 23.5 * KD, theta: -0.8, phi: 0.92, min: 8, max: 36, tx: 0.6, ty: 0.6, tz: 0 } };
      const info = (hh) => ctx.info(hh);
      const h = H3(ctx); const { V3, mat, glass, anchor, sphere, box, cyl, tube, grab, toggleBtn } = h;
      function setScene(k) {
        if (k === K.cur) return; const first = !K.cur; K.cur = k;
        Object.keys(G).forEach((n) => (G[n].visible = n === k));
        K.labs.forEach((L) => L._ap());
        K.pls.forEach((x) => { const on = x.sc === k; x.row.style.display = on ? '' : 'none'; if (!on) x.p.pause(); });
        h.showCtl(k === 'dbl' ? 'dbl' : 'main');
        const c = CAMS[k]; if (c && !(first && k === 'main')) Object.assign(ctx.orbit, c, { tx: c.tx || 0, ty: c.ty || 0, tz: c.tz || 0 });
      }
      const lessonS = () => (window.__sim && window.__sim.S) || null;
      const S0 = lessonS();
      const st = { slits: S0 && S0.cfg && S0.cfg.slits === 'A' ? 'A' : S0 && S0.cfg && S0.cfg.slits === 'B' ? 'B' : 'both', det: !!(S0 && S0.cfg && S0.cfg.det), V: 50, kind: 'e', curve: false, cmp: false, queue: 0 };
      const XS = -6.2, XB = -1.2, XD = 5.8, ZS = 0.6;                         // 총 · 슬릿벽 · 스크린 위치, 슬릿 위치(±)
      const NB = 60, ZR = 3.0, BW = 2 * ZR / NB, SH = 2.4;                      // 막대 수 · 스크린 반폭 · 막대 폭 · 스크린 반높이
      /* 총 */
      const gun = new THREE.Group(); const gb = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 1.6, 40), ctx.mats.metal(0x5b6472, { brushed: true })); gb.rotation.z = Math.PI / 2; const gt = sphere(0.32, 0xffffff, { emissive: 0xffe9a8, emissiveIntensity: 1.2 }); gt.position.x = 0.85; ctx.halo(gt, 0xffe9a8, 2.2, 0.6); gun.add(gb, gt); { const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.74, 0.74, 0.14, 40), ctx.mats.metal('steel')); cap.rotation.z = Math.PI / 2; cap.position.x = -0.82; const noz = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.55, 0.22, 40, 1, true), ctx.mats.metal('steel')); noz.rotation.z = -Math.PI / 2; noz.position.x = 0.86; gun.add(cap, noz); } [0.2, 0.55, -0.15].forEach((x, i) => { const cl = new THREE.Mesh(new THREE.TorusGeometry(0.76 - i * 0.02, 0.06, 14, 56), ctx.mats.metal('copper')); cl.rotation.y = Math.PI / 2; cl.position.x = x - 0.1; gun.add(cl); }); { const cb = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new V3(-0.9, 0.2, 0), new V3(-1.6, 0.9, 0.8), new V3(-2.4, -1.4, 1.4), new V3(-3.0, -SH - 0.6 + 0.9, 1.4)]), 30, 0.07, 8, false), ctx.mats.rubber(0x0c0f15)); gun.add(cb); }
      gun.position.set(XS - 0.8, 0, 0); root.add(gun);
      /* ----- 실험 환경: 광학 테이블 · 진공관 · 받침 ----- */
      const ctex = (w, hh, draw, rx, ry) => { const c = document.createElement('canvas'); c.width = w; c.height = hh; draw(c.getContext('2d'), w, hh); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (rx) t.repeat.set(rx, ry || rx); if ('encoding' in t) t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t; };
      const holeTex = ctex(64, 64, (g, w, hh) => { g.fillStyle = '#39414f'; g.fillRect(0, 0, w, hh); g.fillStyle = '#12161d'; for (let x = 8; x < w; x += 16) for (let y = 8; y < hh; y += 16) { g.beginPath(); g.arc(x, y, 3, 0, 6.3); g.fill(); } g.strokeStyle = 'rgba(255,255,255,.08)'; g.strokeRect(0, 0, w, hh); }, 14, 6);
      const TY = -SH - 0.6;
      const otab = new THREE.Mesh(new THREE.BoxGeometry(20, 0.4, 8.5), mat(0xffffff, { map: holeTex, metalness: 0.85, roughness: 0.38, envMapIntensity: 1.2 })); otab.position.set(-0.2, TY - 0.2, 0); otab.receiveShadow = true; root.add(otab);
      const oedge = new THREE.Mesh(new THREE.BoxGeometry(20.1, 0.12, 8.6), mat(0x1e293b, { metalness: 0.5, roughness: 0.5 })); oedge.position.set(-0.2, TY - 0.32, 0); root.add(oedge);
      [[-8.6, 3.4], [8.2, 3.4], [-8.6, -3.4], [8.2, -3.4]].forEach((q) => { const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 2.2, 24), ctx.mats.metal(0x475569, { brushed: true })); lg.position.set(q[0], TY - 1.4, q[1]); root.add(lg); });
      { const pm = ctx.mats.metal('steel');
        const post = (x, z, top) => { const pst = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, top - TY, 14), pm); pst.position.set(x, (top + TY) / 2, z); root.add(pst); const bs = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.12, 1.0), mat(0x1f2937, { metalness: 0.6, roughness: 0.4 })); bs.position.set(x, TY + 0.06, z); root.add(bs); };
        post(XS - 0.8, 0, -0.75); post(XB, ZR + 0.3, -SH - 0.4); post(XB, -ZR - 0.3, -SH - 0.4); post(XD + 0.1, ZR + 0.15, -SH - 0.1); post(XD + 0.1, -ZR - 0.15, -SH - 0.1); }
      const tubeG = new THREE.Mesh(new THREE.CylinderGeometry(3.7, 3.7, XD - XS + 1.4, 40, 1, true), ctx.mats.glass({ tint: 0xbfd8ff, opacity: 0.07 })); tubeG.rotation.z = Math.PI / 2; tubeG.position.set((XD + XS) / 2 - 0.1, 0, 0); root.add(tubeG);
      [XS - 0.6, XD - 0.2].forEach((x) => { const fl = new THREE.Mesh(new THREE.TorusGeometry(3.7, 0.07, 12, 96), ctx.mats.metal('chrome')); fl.rotation.y = Math.PI / 2; fl.position.set(x, 0, 0); root.add(fl); });
      /* 슬릿벽 (틈 두 개) */
      const wallM = ctx.mats.metal(0x7d8799, { brushed: true });
      const sw = 0.3;
      const wall = new THREE.Group();
      const addW = (z0, z1) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.25, 2 * SH + 0.8, z1 - z0), wallM); m.position.set(XB, 0, (z0 + z1) / 2); wall.add(m); };
      addW(-ZR - 0.6, -ZS - sw / 2); addW(-ZS + sw / 2, ZS - sw / 2); addW(ZS + sw / 2, ZR + 0.6); root.add(wall);
      const cover = [0, 1].map((i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.28, 2 * SH + 0.8, sw), mat(0x3b4252, { roughness: 0.6 })); m.position.set(XB, 0, i ? ZS : -ZS); m.visible = false; root.add(m); return m; });
      /* 스크린 */
      const screen = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2 * SH, 2 * ZR), mat(0x1e2740, { roughness: 0.8, emissive: 0x16203a, emissiveIntensity: 0.6 })); screen.position.set(XD, 0, 0); root.add(screen);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2 * SH + 0.15, 2 * ZR + 0.15), ctx.mats.metal(0x4f5a6b, { roughness: 0.4 })); frame.position.set(XD + 0.08, 0, 0); root.add(frame);
      { const pl = new THREE.Mesh(new THREE.PlaneGeometry(2 * ZR, 2 * SH), new THREE.MeshBasicMaterial({ color: 0x9fb6ff, transparent: true, opacity: 0.05, depthWrite: false, side: THREE.DoubleSide })); pl.rotation.y = Math.PI / 2; pl.position.set(XD - 0.08, 0, 0); root.add(pl); }
      /* 점과 막대그래프 */
      const MAXD = 2200, dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 10, 8), mat(0xfff0a0, { emissive: 0xffd24d, emissiveIntensity: 0.9, roughness: 0.3 }), MAXD); dots.count = 0; root.add(dots);
      const barG = new THREE.BoxGeometry(1, 1, 1); barG.translate(0, 0.5, 0);
      const bars = new THREE.InstancedMesh(barG, mat(0xffc857, { emissive: 0xff9f1c, emissiveIntensity: 0.35, roughness: 0.45 }), NB); root.add(bars);
      const MZ = new THREE.Matrix4(), Z0 = new THREE.Matrix4().makeScale(0, 0, 0);
      const hist = new Array(NB).fill(0); let nTot = 0, nDots = 0, pdfB = new Array(NB).fill(0), cdf = new Array(NB).fill(0), pdfMax = 1;
      /* 확률 곡선 (tube) */
      let curve = null;
      /* 파동 고리 */
      const rings = []; const ringG = new THREE.RingGeometry(0.965, 1, 72, 1, -Math.PI / 2, Math.PI); ringG.rotateX(-Math.PI / 2);
      for (let s = 0; s < 2; s++) for (let k = 0; k < 3; k++) { const m = new THREE.Mesh(ringG, new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })); m.userData = { s, k }; root.add(m); rings.push(m); }
      /* 비행 중인 입자 */
      const fly = []; for (let i = 0; i < 8; i++) { const m = sphere(0.2, 0xfff0a0, { emissive: 0xffd24d, emissiveIntensity: 1, transparent: true, opacity: 0.95 }); m.visible = false; root.add(m); ctx.halo(m, 0xffe08a, 1.5, 0.5); fly.push({ m, on: false, t: 0, hz: 0, hy: 0, sz: 0 }); }
      const flash = sphere(0.3, 0xffffff, { emissive: 0xffffff, emissiveIntensity: 1, transparent: true, opacity: 0 }); root.add(flash); let flashT = 0;
      /* 이름표 */
      const lG = label('전자총', gun, { color: '#475569', size: 12, offset: [0, 1.1, 0] });
      const lW = label('이중 슬릿', anchor(root, XB, SH + 0.55, 0), { color: '#475569', size: 12 });
      const lSc = label('스크린', anchor(root, XD, -SH - 0.5, 0), { color: '#475569', size: 12 });
      const lN = label('', anchor(root, XD, SH + 3.3, 0), { color: '#a16207', size: 13 });
      const lDet = label('틈 검출기', anchor(root, XB, -SH - 0.5, 0), { color: '#b91c1c', size: 12 });
      const lWave = label('확률 파동', anchor(root, 2.0, 0.5, 2.0), { color: '#0369a1', size: 12 });
      const lCmp = label('<span style="color:#cbd5e1">┅ 확률의 합</span> · <span style="color:#c4b5fd">━ 진폭의 합의 제곱</span>', anchor(root, XD, SH + 2.9, -ZR - 0.4), { color: '#334155', size: 12 }); lCmp.show(false);
      /* 확률 분포 */
      const sinc = (x) => (Math.abs(x) < 1e-6 ? 1 : Math.sin(x) / x);
      // 광자(레이저)는 2D와 같이 50 V 전자보다 조금 짧은 파장(약 100 V 전자와 같은 무늬 간격)으로 그려요
      function pdf(z, slits, det) {
        slits = slits || st.slits; det = det == null ? st.det : det;
        const D = 0.7 * Math.sqrt(50 / (st.kind === 'ph' ? 97 : st.V)), e = (zz) => { const s = sinc(Math.PI * 0.25 * zz / D); return s * s; };
        if (slits === 'A') return e(z - ZS);
        if (slits === 'B') return e(z + ZS);
        if (det) return 0.5 * (e(z - ZS) + e(z + ZS));
        const c = Math.cos(Math.PI * z / D); return c * c * e(z);
      }
      // 확률 곡선(스크린 위 막대그래프 높이에 맞춰): fn(z) → 칸마다 확률, 최댓값 mx를 높이 2.2로
      const binP = (sl, dt) => { const b = []; let sum = 0; for (let i = 0; i < NB; i++) { const z = -ZR + (i + 0.5) * BW; let q = 0; for (let k = 0; k < 5; k++) q += pdf(z + (k - 2) * BW / 5, sl, dt); b.push(q); sum += q; } return b.map((q) => q / sum); };
      function mkCurve(b, mx, col, dz) {
        const pts = []; for (let i = 0; i < NB; i++) pts.push(new V3(XD + 0.2 + (dz || 0), SH + 0.15 + b[i] / mx * 2.2, -ZR + (i + 0.5) * BW));
        const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.045, 8, false), h.basic(col)); root.add(m); return m;
      }
      let cmpC = [];
      function recomputePdf() {
        let sum = 0; pdfMax = 0;
        for (let i = 0; i < NB; i++) { const z = -ZR + (i + 0.5) * BW; let p = 0; for (let k = 0; k < 5; k++) p += pdf(z + (k - 2) * BW / 5); p /= 5; pdfB[i] = p; sum += p; pdfMax = Math.max(pdfMax, p); }
        let c = 0; for (let i = 0; i < NB; i++) { c += pdfB[i] / sum; cdf[i] = c; }
        if (curve) { root.remove(curve); curve.geometry.dispose(); }
        const pts = []; for (let i = 0; i < NB; i++) pts.push(new V3(XD + 0.2, SH + 0.15 + pdfB[i] / pdfMax * 2.2, -ZR + (i + 0.5) * BW));
        curve = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.045, 8, false), h.basic(0xff6b6b)); root.add(curve);
        // 곡선 비교: 회색 = 두 틈 확률의 합(간섭 없음), 보라 = 진폭의 합의 제곱(간섭)
        cmpC.forEach((m) => { root.remove(m); m.geometry.dispose(); });
        const bS = binP('both', true), bI = binP('both', false), mx = Math.max(...bI);
        cmpC = [mkCurve(bS, mx, 0x9ca3af, 0.02), mkCurve(bI, mx, 0xa78bfa)];
        showCurves();
      }
      function showCurves() {
        if (curve) curve.visible = st.curve && !st.cmp; cmpC.forEach((m) => (m.visible = st.cmp)); lCmp.show(st.cmp); if (nTot != null) txt();
      }
      function sampleZ() { const u = Math.random(); let i = 0; while (i < NB - 1 && cdf[i] < u) i++; return -ZR + (i + Math.random()) * BW; }
      function drawBars() {
        const mx = Math.max(6, ...hist), sc = 2.2 / mx;
        for (let i = 0; i < NB; i++) { if (!hist[i]) { bars.setMatrixAt(i, Z0); continue; } MZ.compose(new V3(XD + 0.15, SH + 0.15, -ZR + (i + 0.5) * BW), new THREE.Quaternion(), new V3(0.16, hist[i] * sc, BW * 0.86)); bars.setMatrixAt(i, MZ); }
        bars.instanceMatrix.needsUpdate = true;
      }
      function reset() { hist.fill(0); nTot = nDots = 0; dots.count = 0; st.queue = 0; fly.forEach((f) => { f.on = false; f.m.visible = false; }); drawBars(); txt(); }
      function shoot(n) { st.queue += n; }
      function launch() {
        const f = fly.find((q) => !q.on); if (!f) return false;
        f.on = true; f.t = 0; f.hz = sampleZ(); f.hy = (Math.random() - 0.5) * 2 * (SH - 0.2);
        f.sz = st.slits === 'A' ? ZS : st.slits === 'B' ? -ZS : (st.det ? (Math.random() < 0.5 ? ZS : -ZS) : 0);
        f.m.visible = true; return true;
      }
      function arrive(f) {
        f.on = false; f.m.visible = false;
        const bi = Math.max(0, Math.min(NB - 1, Math.floor((f.hz + ZR) / BW))); hist[bi]++; nTot++;
        if (nDots < MAXD) { MZ.makeTranslation(XD - 0.05, f.hy, f.hz); dots.setMatrixAt(nDots++, MZ); dots.count = nDots; dots.instanceMatrix.needsUpdate = true; }
        flash.position.set(XD - 0.1, f.hy, f.hz); flashT = 0.18;
        drawBars(); txt();
      }
      function txt() {
        lN.set('N = ' + nTot + '개'); lN.show(true);
        const two = st.slits === 'both' && !st.det;
        let msg;
        if (nTot < 20) msg = '<b>한 알씩 쏘면 점이 하나씩 찍혀요.</b> 한 번의 도착 위치는 예측할 수 없어요.<br>[+100] 단추로 점을 많이 쌓아 보세요.';
        else if (two) msg = '<b>점이 쌓여 간섭무늬가 나타나요!</b> 한 알씩 보냈는데도요.<br>입자 하나가 두 틈을 지난 확률 파동처럼 행동하고, 밝은 곳은 도착 <b>확률</b>이 큰 곳이에요.';
        else if (st.det) msg = '<b>어느 틈을 지났는지 알아내면</b> 간섭무늬가 사라져요.<br>두 틈의 무늬를 그냥 더한 넓은 띠만 남아요.';
        else msg = '<b>틈 하나만 열면</b> 간섭 줄무늬 없이 넓은 한 덩어리가 돼요.<br>두 틈이 모두 열려야 간섭이 생겨요.';
        if (st.cmp) msg += '<br><span style="color:#cbd5e1">회색</span>: 두 틈의 확률을 더한 곡선 · <span style="color:#c4b5fd">보라</span>: 두 틈의 진폭을 더해 제곱한 곡선';
        else if (st.curve) msg += '<br><span style="color:#ff8a8a">빨간 곡선</span>은 도착 확률이에요.';
        info(msg);
      }
      /* 값(틈·검출기·전압·쏘기)은 2D 조작판이 정하고, 3D는 같은 설정으로 같은 개수만큼 쏘아 줘요 */
      function cfg() {
        cover[0].visible = st.slits === 'B' ? false : false; cover[0].visible = st.slits === 'A'; cover[1].visible = st.slits === 'B';       // A만 열면 B(−z) 덮기
        cover[0].position.z = -ZS; cover[1].position.z = ZS;
        lDet.show(st.det && st.slits === 'both');
        const ph = st.kind === 'ph'; lG.set(ph ? '레이저 (광자)' : '전자총');
        dots.material.color.set(ph ? 0xffc2b0 : 0xfff0a0); dots.material.emissive.set(ph ? 0xff5a3c : 0xffd24d);
        fly.forEach((f) => { f.m.material.color.set(ph ? 0xffc2b0 : 0xfff0a0); f.m.material.emissive.set(ph ? 0xff5a3c : 0xffd24d); if (f.m.children[0]) f.m.children[0].material.color.set(ph ? 0xff8a6c : 0xffe08a); });
        recomputePdf(); reset();
      }
      /* =====================================================================
         새 장면: 드브로이 파장(dbl) — 입자마다 λ = h/(mv)가 얼마나 다른지, 이중 슬릿 무늬를 볼 수 있는지
         ===================================================================== */
      const LB = 'rgba(8,12,24,.78)', Mx2 = new THREE.Matrix4();
      const stdM = (w, hh, d, c, o) => new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), mat(c, o));
      const sphM = (r, c, o) => new THREE.Mesh(new THREE.SphereGeometry(r, 22, 16), mat(c, o));
      const gD = newScene('dbl'); CAMS.dbl = { dist: PHN ? 28 : 14.5, theta: 0.0, phi: 1.02, min: 7, max: 40, tx: 0, ty: 0.4, tz: 0.3 };
      const RX0 = -5.6, RX1 = 5.6, RZ = 2.4, RY = -1.8, lamX = (l) => RX0 + (Math.min(-7, Math.max(-35, Math.log10(l))) + 35) / 28 * (RX1 - RX0);
      const thrX = lamX(1e-6 * 1e-7);
      { const bsl = stdM(13, 0.25, 1.4, 0x334155, { metalness: 0.5, roughness: 0.5 }); bsl.position.set(0, RY - 0.22, RZ); gD.add(bsl); const tb2 = new THREE.Mesh(new THREE.BoxGeometry(11.5, 0.3, 4.2), mat(0xffffff, { map: holeTex, metalness: 0.6, roughness: 0.45 })); tb2.position.set(-0.8, 2.3 - 0.18, -1.2); gD.add(tb2); }
      const rR = stdM(thrX - RX0 + 0.3, 0.2, 0.7, 0xe2464b, { emissive: 0xe2464b, emissiveIntensity: 0.25 }); rR.position.set((RX0 - 0.3 + thrX) / 2, RY, RZ); gD.add(rR);
      const rG = stdM(RX1 + 0.3 - thrX, 0.2, 0.7, 0x50dc8c, { emissive: 0x50dc8c, emissiveIntensity: 0.25 }); rG.position.set((thrX + RX1 + 0.3) / 2, RY, RZ); gD.add(rG);
      const thrM = stdM(0.07, 1.6, 0.7, 0xffd166, { emissive: 0xffd166, emissiveIntensity: 0.6 }); thrM.position.set(thrX, RY + 0.8, RZ); gD.add(thrM);
      [-35, -28, -21, -14, -7].forEach((e) => { const x = lamX(Math.pow(10, e)), t = stdM(0.05, 0.3, 0.05, 0xdbe4f7); t.position.set(x, RY - 0.2, RZ + 0.1); gD.add(t); label('10' + String(e).replace('-', '⁻').replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]), [x, RY - 0.65, RZ + 0.1], { color: LB, size: 11 }, 'dbl'); });
      label('드브로이 파장 λ (m, 로그 눈금)', [0, RY - 1.2, RZ + 0.1], { color: 'rgba(8,12,24,.85)', size: 12 }, 'dbl');
      label('◀ 무늬를 볼 수 없어요', [(RX0 + thrX) / 2 - 0.5, RY - 1.9, RZ + 0.1], { color: 'rgba(192,53,59,.9)', size: 12 }, 'dbl'); label('무늬를 볼 수 있어요 ▶', [(thrX + RX1) / 2 + 0.6, RY - 1.9, RZ + 0.1], { color: 'rgba(28,122,74,.9)', size: 12 }, 'dbl');
      label('무늬 한계 λ/d = 10⁻⁶', [thrX, RY + 1.85, RZ], { color: 'rgba(138,106,0,.92)', size: 11, offset: [0, 0, 0] }, 'dbl');
      // 입자 모형과 핀
      const mkIcon = (id) => {
        const g = new THREE.Group();
        if (id === 'e') { const s = sphM(0.2, 0x43b7ff, { emissive: 0x43b7ff, emissiveIntensity: 0.9 }); g.add(s); }
        else if (id === 'n') g.add(sphM(0.3, 0xaab0c8));
        else if (id === 'c') { g.add(sphM(0.45, 0x6f6a8a)); for (let k = 0; k < 12; k++) { const a = (k / 12) * 6.283, b = k % 2 ? 0.5 : -0.5, s = sphM(0.14, 0xc8c3e2); s.position.set(Math.cos(a) * 0.46 * Math.cos(b), Math.sin(b) * 0.46, Math.sin(a) * 0.46 * Math.cos(b)); g.add(s); } }
        else { g.add(sphM(0.6, 0xfff7ea)); [-1, 1].forEach((sg) => { const r = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.025, 6, 30, 1.8), mat(0xd6453d)); r.position.x = sg * 0.35; r.rotation.y = Math.PI / 2; r.rotation.z = sg > 0 ? 0 : Math.PI; g.add(r); }); }
        return g;
      };
      const P = window.__sim.PART, pins = P.map((p, i) => {
        const g = new THREE.Group(); gD.add(g); const rod = stdM(0.05, 1, 0.05, new THREE.Color(p.col).getHex()); g.add(rod); const ic = mkIcon(p.id); g.add(ic);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.04, 8, 32), h.basic(0xffffff)); ring.rotation.x = Math.PI / 2; g.add(ring);
        const lab = label('', ic, { color: 'rgba(8,12,24,.85)', size: 12, offset: [0, 0.85, 0] }, 'dbl');
        return { p, g, rod, ic, ring, lab, hgt: [0.9, 2.7, 1.8, 0.9][i] };
      });
      // 이중 슬릿 시연 (고른 입자)
      const DZ = -1.2, SLX = -2.0, DY = 2.3;
      const dGun = sphM(0.35, 0xdde4f0, { emissive: 0x9fb6ff, emissiveIntensity: 0.4 }); dGun.position.set(-5.2, DY + 0.35, DZ); gD.add(dGun);
      [[-1.9, -0.55], [-0.4, 0.4], [0.55, 1.9]].forEach(([z0, z1]) => { const w = stdM(0.2, 0.9, Math.abs(z1 - z0), 0x8793a8, { metalness: 0.5 }); w.position.set(SLX, DY + 0.45, DZ + (z0 + z1) / 2); gD.add(w); });
      const dCv = document.createElement('canvas'); dCv.width = 160; dCv.height = 256; const dX = dCv.getContext('2d'), dTex = new THREE.CanvasTexture(dCv);
      const dScr = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 3.4), new THREE.MeshBasicMaterial({ map: dTex, side: THREE.DoubleSide })); dScr.rotation.x = -Math.PI / 2; dScr.position.set(3.6, DY + 0.02, DZ); gD.add(dScr);
      const dFly = sphM(0.2, 0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.7 }); gD.add(dFly);
      const ldTitle = label('', dGun, { color: 'rgba(8,12,24,.85)', size: 12, offset: [0.5, 0.9, 0] }, 'dbl'), ldScr = label('', dScr, { color: LB, size: 12, offset: [0, 0.8, 2.4] }, 'dbl');
      label('이중 슬릿 (d = 100 nm)', [SLX, DY + 1.1, DZ], { color: LB, size: 12 }, 'dbl'); label('스크린', [3.6, DY + 0.3, DZ - 1.9], { color: LB, size: 11 }, 'dbl');
      let dSig = '';
      function paintScr(rev, can, ratio) {
        const key = rev + '|' + can; if (key === dSig) return; dSig = key;
        dX.fillStyle = '#10151f'; dX.fillRect(0, 0, 160, 256);
        if (!rev) { dX.fillStyle = '#8e9bc9'; dX.font = '900 90px sans-serif'; dX.textAlign = 'center'; dX.textBaseline = 'middle'; dX.fillText('?', 80, 130); }
        else for (let y = 0; y < 256; y++) {
          const u = (y - 128) / 128; let I;
          if (can) { const a = u * 2.4 + 1e-6; I = Math.pow(Math.cos(u * 3 * Math.PI), 2) * Math.pow(Math.sin(a) / a, 2) * 1.1; }
          else I = 0.5 * (Math.exp(-Math.pow((u - 0.28) / 0.17, 2)) + Math.exp(-Math.pow((u + 0.28) / 0.17, 2)));
          const v = Math.round(255 * Math.min(1, I)); dX.fillStyle = 'rgb(' + v + ',' + Math.round(v * 0.82) + ',' + Math.round(v * 0.35) + ')'; dX.fillRect(0, y, 160, 1);
        }
        dTex.needsUpdate = true;
      }
      const dP = { on: false, sel: 'e' }; let dSelSig = '';
      const segSel = h.grab('dbl', () => controls.segment('입자', [{ label: '전자', value: 'e' }, { label: '중성자', value: 'n' }, { label: 'C₆₀', value: 'c' }, { label: '야구공', value: 'b' }], 'e', (v) => { const L = window.__sim; L.S.d.sel = v; L.updateCtl(); dP.on = false; plD.pause(); }));
      function updDbl(dt, t) {
        const L = window.__sim, S = L.S, D = S.d, rev = D.revealed || (L.game && L.game.free);
        if (D.sel !== dSelSig) { dSelSig = D.sel; segSel.set(D.sel); if (dP.on) { dP.on = false; plD.pause(); } }
        const sel = dP.on ? dP.sel : D.sel;
        pins.forEach((q) => {
          const lam = L.pLam(q.p), x = lamX(lam), on = q.p.id === sel, ok = L.pCan(q.p);
          q.g.position.set(x, RY, RZ); q.rod.scale.y = q.hgt; q.rod.position.y = q.hgt / 2; q.ic.position.y = q.hgt + 0.3; q.ic.scale.setScalar(on ? 1.25 : 1); q.ring.position.y = q.hgt + 0.3; q.ring.visible = on; q.ic.rotation.y = t * 0.6;
          q.lab.set(q.p.name + ' · λ ' + L.fmtLam(lam) + (rev ? (ok ? ' ✅' : ' ❌') : '')); q.lab.el.style.borderColor = on ? '#fff' : 'rgba(255,255,255,.18)';
        });
        const p = P.find((q) => q.id === sel), can = L.pCan(p), ratio = L.pRatio(p);
        paintScr(rev, can);
        dFly.position.set(-5.2 + ((t * 1.6) % 1) * 8.6, DY + 0.35, DZ); dFly.material.color.set(p.col); dFly.material.emissive.set(p.col);
        dFly.visible = ((t * 1.6) % 1) < 0.95;
        ldTitle.set('선택: ' + p.name + ' (' + p.sub + ')'); ldScr.set(rev ? (can ? '무늬를 볼 수 있어요 ✅' : '무늬를 볼 수 없어요 ❌') : '무늬가 보일까요? 오른쪽에서 골라 봐요');
        info('<b>λ = h / p = h / (mv)</b>: ' + p.name + '의 질량 ' + L.sci(p.m, 1) + ' kg, 속력 ' + L.fmtV(L.pv(p)) + ' → <b>λ = ' + L.fmtLam(L.pLam(p)) + '</b><br>슬릿 간격 d = 100 nm와 비교한 <b>λ/d = ' + L.sci(ratio, 1) + '</b>' + (rev ? (can ? ' ≥ 10⁻⁶ → 간섭무늬를 볼 수 있어요.' : ' < 10⁻⁶ → 파장이 너무 짧아 무늬를 볼 수 없어요.') : '. 10⁻⁶ 이상이면 무늬를 볼 수 있어요. 어떨까요?'));
      }

      const plD = mkPlayer('dbl', { duration: 8, loop: true, autoplay: false, label: '입자 비교', phases: [[0, '전자'], [0.25, '중성자'], [0.5, 'C₆₀'], [0.75, '야구공']], onFrame(p) { dP.on = true; dP.sel = ['e', 'n', 'c', 'b'][Math.min(3, Math.floor(p * 4))]; } });
      cfg();
      setScene(window.__sim && window.__sim.S && window.__sim.S.mode === 'dbl' ? 'dbl' : 'main');
      let acc = 0, rt = 0, lastN = 0, lcfg = '';
      return {
        update(dt, t) {
          dt = Math.min(dt, 0.05);
          { const S = lessonS(), k = S && S.mode === 'dbl' ? 'dbl' : 'main'; if (k !== K.cur) { setScene(k); lcfg = ''; txt(); } if (k === 'dbl') { updDbl(dt, t); return; } }
          { const S = lessonS(), sh = (S && S.show) || {}, wv = !!sh.wave && S.mode !== 'shoot', cm = !!sh.cmp && S.mode === 'which'; if (wv !== st.curve || cm !== st.cmp) { st.curve = wv; st.cmp = cm; showCurves(); } }
          { const S = lessonS(); if (S && S.cfg) { const k = S.cfg.slits + '|' + (S.cfg.det && S.cfg.slits === 'both') + '|' + S.cfg.V + '|' + S.cfg.kind; if (k !== lcfg) { lcfg = k; st.slits = S.cfg.slits; st.det = S.cfg.det && S.cfg.slits === 'both'; st.V = S.cfg.V; st.kind = S.cfg.kind === 'ph' ? 'ph' : 'e'; cfg(); lastN = S.data ? S.data.N : 0; shoot(Math.min(S.data ? S.data.N : 0, 300)); }
            const N = S.data ? S.data.N : 0; if (N < lastN) { reset(); } else if (N > lastN) shoot(Math.min(N - lastN, 300)); lastN = N; } }
          if (st.queue > 0) { acc += dt * (st.queue > 20 ? 22 : 5); while (acc >= 1 && st.queue > 0) { if (launch()) { st.queue--; acc -= 1; } else break; } } else acc = 0;
          fly.forEach((f) => {
            if (!f.on) return; f.t += dt / 1.1; const u = f.t;
            if (u >= 1) { arrive(f); return; }
            if (u < 0.45) { const a = u / 0.45; f.m.position.set(XS + (XB - XS) * a, 0, f.sz * a); f.m.scale.setScalar(1.0 + (st.slits === 'both' && !st.det ? 0.9 * a : 0)); }
            else { const a = (u - 0.45) / 0.55, e = a * a * (3 - 2 * a); f.m.position.set(XB + (XD - XB) * a, f.hy * e, f.sz + (f.hz - f.sz) * a); f.m.scale.setScalar((st.slits === 'both' && !st.det ? 1.9 : 1.0) * (1 - 0.65 * a)); }
            f.m.material.opacity = 0.35 + 0.6 * Math.min(1, u * 3);
          });
          flashT -= dt; flash.visible = flashT > 0; flash.material.opacity = Math.max(0, flashT / 0.18);
          // 파동 고리
          rt += dt;
          rings.forEach((m) => {
            const { s, k } = m.userData, open = st.slits === 'both' || (st.slits === 'A' && s === 0) || (st.slits === 'B' && s === 1);
            const ph = (rt * 0.45 + k / 3) % 1, r = 0.4 + ph * 7.2;
            m.visible = open && (st.queue > 0 || nTot > 0 || true); m.scale.set(r, 1, r); m.position.set(XB, 0, s === 0 ? ZS : -ZS);
            m.material.opacity = open ? 0.55 * (1 - ph) * (st.det && st.slits === 'both' ? 0.0 : 1) : 0;
          });
          lWave.show(!(st.det && st.slits === 'both')); lWave.off = [0, 0, 0];
        },
        sync() { lcfg = ''; },
      };
    },
  });
})();
