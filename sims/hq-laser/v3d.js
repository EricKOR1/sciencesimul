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
    levels: [0, 1, 2, 3],
    build(ctx) {
      const { THREE, controls } = ctx;
      /* ---- 여러 장면 도우미 (2D 장면 S.mode에 맞춰 그룹 · 이름표 · 재생 줄을 바꿔요) ---- */
      const root = new THREE.Group(); ctx.root.add(root);
      const G = { cavity: root }, K = { cur: '', labs: [], pls: [] };
      const label = (text, obj, o, sc) => {
        const L = ctx.label(text, obj, o), sh = L.show; L._own = true; L._sc = sc || 'cavity';
        L._ap = () => sh(L._own && K.cur === L._sc); L.show = (v) => { L._own = v; L._ap(); }; K.labs.push(L); L._ap(); return L;
      };
      const mkPlayer = (sc, o) => {
        const p = controls.player(o), rs = document.querySelectorAll('.v3-player'), row = rs[rs.length - 1];
        K.pls.push({ sc, p, row }); row.style.display = sc === K.cur ? '' : 'none'; return p;
      };
      const newScene = (k) => { const g = new THREE.Group(); g.visible = false; ctx.root.add(g); G[k] = g; return g; };
      const CAMS = { cavity: { dist: 17 * KD, theta: 0.5, phi: 1.22, min: 7, max: 34, tx: 1.4, ty: 0, tz: 0 } };
      function setScene(k) {
        if (k === K.cur) return; K.cur = k;
        Object.keys(G).forEach((n) => (G[n].visible = n === k));
        K.labs.forEach((L) => L._ap());
        K.pls.forEach((x) => { const on = x.sc === k; x.row.style.display = on ? '' : 'none'; if (!on) x.p.pause(); });
        const c = CAMS[k]; if (c) Object.assign(ctx.orbit, c, { tx: c.tx || 0, ty: c.ty || 0, tz: c.tz || 0 });
      }
      const info = (hh) => ctx.info(hh);
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
      function thr() { const L = 0.3 + 4 * (1 - st.R), n2 = L / 1.8; return (n2 / (1 - n2)) / 1.2; }
      function txt() {
        const th = thr(), on = st.q > 0.05;
        info(st.P < 0.05 ? '<b>펌핑이 없어요</b>: 원자가 대부분 바닥 상태예요. 펌핑을 올려 보세요.'
          : (on ? '<b>레이저 발진!</b> 유도 방출한 광자는 진동수·위상·방향이 같아요. 거울 사이를 오가며 빛이 점점 세지고 일부가 오른쪽으로 나와요.<br>들뜬 원자(N₂)가 바닥 상태(N₁)보다 많은 <b>밀도 반전</b>이어야 증폭돼요.'
            : '<b>아직 레이저가 아니에요</b>: 들뜬 원자가 자발 방출로 사방에 약한 빛만 내요.<br>펌핑 세기가 문턱(약 ' + Math.round(th * 100) + '%)을 넘어야 유도 방출이 연쇄적으로 일어나요.'));
      }
      txt();
      /* =====================================================================
         새 장면: 흡수와 방출(atom) · 특징 비교(compare) · 광통신(fiber) · 안전(safety)
         ===================================================================== */
      const sceneKey = () => { const S = lessonS(); if (!S) return 'cavity'; if (S.mode === 'atom') return 'atom'; if (S.mode === 'apps') return S.ap.sub || 'compare'; return 'cavity'; };
      const LB = 'rgba(8,12,24,.78)', Yv = h.Yax;
      const stdM = (w, hh, d, c, o) => new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), mat(c, o));
      const sphM = (r, c, o) => new THREE.Mesh(new THREE.SphereGeometry(r, 22, 16), mat(c, o));
      const segB = (col, r, op) => { const m = h.mkSeg(col, r, { basic: true, mo: { transparent: true, opacity: op == null ? 1 : op, depthWrite: false } }); m.frustumCulled = false; return m; };
      const NPK = 60;
      /* 광자 파동 묶음: 평면(xy) 안에서 방향 ang(2D와 같은 각: 0 = 오른쪽, 시계 방향) */
      function mkPacket(g, col) {
        const pos = new Float32Array(NPK * 2 * 3), idx = [];
        for (let i = 0; i < NPK - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
        const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setIndex(idx);
        const mesh = new THREE.Mesh(geo, h.basic(col, { transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false })); mesh.frustumCulled = false;
        const lp = new Float32Array(NPK * 3), lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(lp, 3));
        const line = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: col })); line.frustumCulled = false; g.add(mesh, line);
        return { mesh, line, set(cx, cy, ang, ph, len, amp) {
          const a = ang * Math.PI / 180, ca = Math.cos(a), sa = -Math.sin(a);
          for (let i = 0; i < NPK; i++) {
            const s = (i / (NPK - 1) - 0.5) * len, env = Math.exp(-Math.pow(s / (len * 0.28), 2)), w = amp * env * Math.sin(6.2832 * s / 0.62 - ph);
            const px = cx + ca * s, py = cy + sa * s, qx = px - sa * w, qy = py + ca * w, o = i * 6, b = i * 3;
            pos[o] = px; pos[o + 1] = py; pos[o + 2] = 0; pos[o + 3] = qx; pos[o + 4] = qy; pos[o + 5] = 0; lp[b] = qx; lp[b + 1] = qy; lp[b + 2] = 0;
          }
          geo.attributes.position.needsUpdate = true; lg.attributes.position.needsUpdate = true;
        }, show(v) { mesh.visible = line.visible = v; } };
      }
      const canvasPlane = (w, hh, cw, ch, draw) => {
        const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch; draw(cv.getContext('2d'), cw, ch);
        const tx = new THREE.CanvasTexture(cv); const m = new THREE.Mesh(new THREE.PlaneGeometry(w, hh), new THREE.MeshBasicMaterial({ map: tx, side: THREE.DoubleSide })); return m;
      };

      /* ============ ① 흡수와 방출: 두 준위 원자와 광자 ============ */
      const gA = newScene('atom'); CAMS.atom = { dist: PHN ? 21 : 12.5, theta: 0.25, phi: 1.3, min: 6, max: 30, tx: 0.6, ty: 0 };
      const SC = 0.032, ATX = 0.0;
      const nuc = sphM(0.38, 0x7f93bd, { roughness: 0.35 }); gA.add(nuc);
      const halo = new THREE.Mesh(new THREE.SphereGeometry(0.7, 20, 14), h.basic(0xffb400, { transparent: true, opacity: 0, depthWrite: false })); gA.add(halo);
      [26, 52].forEach((r) => { const t = new THREE.Mesh(new THREE.TorusGeometry(r * SC * 1.04, 0.012, 6, 64), h.basic(0x9aa6b8, { transparent: true, opacity: 0.7 })); gA.add(t); });
      const eAt = sphM(0.17, 0x4d8dff, { emissive: 0x2f6df6, emissiveIntensity: 0.7 }); gA.add(eAt);
      const flashA = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), h.basic(0xffe27a, { transparent: true, opacity: 0, depthWrite: false })); gA.add(flashA);
      const pk = [mkPacket(gA, 0xe2464b), mkPacket(gA, 0xe2464b)];
      // 에너지 준위 그림
      const LX = 4.6, LY2 = 1.7, LY1 = -1.7;
      const lvGrp = new THREE.Group(); gA.add(lvGrp);
      [LY2, LY1].forEach((y) => { const b = stdM(2.4, 0.07, 0.07, 0x26324a); b.position.set(LX, y, 0); b.material.color.set(0xdbe4f7); lvGrp.add(b); });
      const lvE = sphM(0.16, 0x4d8dff, { emissive: 0x2f6df6, emissiveIntensity: 0.7 }); lvGrp.add(lvE);
      const lvArr = [h.mkArrow(0xe2464b, 0.045), h.mkArrow(0xe2464b, 0.045)]; lvArr.forEach((a) => { a.visible = false; lvGrp.add(a); });
      const labAtom = label('', nuc, { color: LB, size: 12, offset: [0, 2.35, 0] }, 'atom');
      const labCnt = label('', nuc, { color: 'rgba(8,12,24,.85)', size: 12, offset: [0, -2.35, 0] }, 'atom');
      label('에너지 준위', [LX, 2.7, 0], { color: LB, size: 12 }, 'atom'); label('E₂', [LX - 1.55, LY2, 0], { color: LB, size: 12 }, 'atom'); label('E₁', [LX - 1.55, LY1, 0], { color: LB, size: 12 }, 'atom');
      label(PHN ? 'ΔE = hf = 1.96 eV' : 'ΔE = E₂ − E₁ = hf = 1.96 eV (632.8 nm)', [LX, -2.55, 0], { color: 'rgba(192,53,59,.9)', size: 11 }, 'atom');
      const labNote = label('', [0.4, -3.2, 0], { color: 'rgba(8,12,24,.7)', size: 12 }, 'atom');
      const labTag = label('', [2.6, 0.9, 0], { color: 'rgba(22,160,90,.92)', size: 12 }, 'atom');
      const atP = { on: false, tp: 0 }; let atRun = -1; const AT_T = { abs: 3.6, spon: 3.8, stim: 4.2 };
      function updAtom(dt, t) {
        const S = lessonS(); if (!S) return; const A = S.at; if (A.run !== atRun) { atRun = A.run; if (atP.on) { atP.on = false; plA.pause(); } }
        const proc = A.proc, tp = atP.on ? atP.tp : A.tp, ex0 = A.ang;
        const ax = 0, ay = 0, x0 = -4.2, x1 = -1.5; let ex = false, eR = 26, cnt = 0, from = 0, flash = 0, note = '', pks = [];
        const U = (v) => v * SC;
        if (proc === 'abs') { from = 1; if (tp < 1.8) { pks.push({ x: x0 + (x1 - x0) * tp / 1.8, y: ay, ang: 0, ph: 0 }); cnt = 1; note = '광자가 다가와요'; } else { ex = true; cnt = 0; eR = 26 + 26 * Math.min(1, (tp - 1.8) / 0.5); flash = Math.max(0, 1 - (tp - 1.8) / 0.5); note = '광자가 사라지고 원자가 들뜬 상태가 됐어요'; } }
        else if (proc === 'spon') { from = 0; if (tp < 1.4) { ex = true; eR = 52; note = '들뜬 원자가 기다리다가…'; } else { eR = 52 - 26 * Math.min(1, (tp - 1.4) / 0.5); cnt = 1; flash = Math.max(0, 1 - (tp - 1.4) / 0.5); const a = ex0 * Math.PI / 180, s = Math.max(0, Math.min(3.0, (tp - 1.4) * 120 * SC)); pks.push({ x: Math.cos(a) * (0.8 + s), y: -Math.sin(a) * (0.8 + s), ang: ex0, ph: A.ph }); note = '저절로 내려오며 임의의 방향으로 광자를 내보냈어요'; } }
        else { from = 1; if (tp < 1.8) { ex = true; eR = 52; cnt = 1; pks.push({ x: x0 + (x1 - x0) * tp / 1.8, y: ay, ang: 0, ph: 0 }); note = '들뜬 원자 옆으로 광자가 지나가요'; } else { const s = Math.min(78, (tp - 1.8) * 100) * SC; eR = 52 - 26 * Math.min(1, (tp - 1.8) / 0.5); cnt = 2; flash = Math.max(0, 1 - (tp - 1.8) / 0.5); pks.push({ x: 0.7 + s, y: 0.36, ang: 0, ph: 0 }, { x: 0.7 + s, y: -0.36, ang: 0, ph: 0 }); note = '똑같은 광자가 하나 더 생겨 같은 방향으로 나가요'; } }
        const ang = t * (ex ? 1.6 : 2.6), er = U(eR);
        eAt.position.set(Math.cos(ang) * er, Math.sin(ang) * er, 0.1); eAt.material.emissiveIntensity = ex ? 1.4 : 0.6;
        nuc.material.color.set(ex ? 0xf26b3a : 0x7f93bd); halo.material.opacity = ex ? 0.22 + 0.08 * Math.sin(t * 6) : 0;
        flashA.scale.setScalar(1 + 1.8 * (1 - flash)); flashA.material.opacity = flash * 0.5;
        pk.forEach((p, i) => { const q = pks[i]; p.show(!!q); if (q) p.set(q.x, q.y, q.ang, q.ang === 0 ? -t * 7 : q.ph - t * 7, 2.0, 0.3); });
        // 준위 그림의 전자
        const ey = LY1 + (LY2 - LY1) * Math.min(1, Math.max(0, (eR - 26) / 26)); lvE.position.set(LX - 0.4, ey, 0.1); lvE.material.emissiveIntensity = ex ? 1.4 : 0.6;
        lvArr.forEach((a) => (a.visible = false));
        const showArr = (i, xo, up) => { h.setArrow(lvArr[i], new V3(LX + xo, up ? LY1 + 0.1 : LY2 - 0.1, 0), new V3(LX + xo, up ? LY2 - 0.1 : LY1 + 0.1, 0)); };
        if (proc === 'abs' && tp < 2.3) showArr(0, 0.35, true); if (proc === 'spon' && tp > 1.4 && tp < 2.4) showArr(0, 0.6, false);
        if (proc === 'stim' && tp > 1.8 && tp < 2.6) { showArr(0, 0.2, false); showArr(1, 0.7, false); }
        labAtom.set(ex ? '상태: 들뜸 (E₂)' : '상태: 바닥 (E₁)'); labAtom.el.style.background = ex ? 'rgba(196,80,27,.92)' : 'rgba(63,90,140,.92)';
        labCnt.set('광자 ' + from + '개 → ' + cnt + '개'); labNote.set(note);
        labTag.show((proc === 'stim' && tp > 1.9) || (proc === 'spon' && tp > 1.5)); if (proc === 'stim') { labTag.set('같은 위상 · 같은 방향'); labTag.el.style.background = 'rgba(22,160,90,.92)'; labTag.obj = [3.0, 1.1, 0]; } else { labTag.set('방향·위상 임의'); labTag.el.style.background = 'rgba(122,60,255,.92)'; if (pks[0]) labTag.obj = [pks[0].x, pks[0].y + 0.7, 0]; }
        info(proc === 'abs' ? '<b>흡수</b>: 에너지가 ΔE = hf인 광자만 흡수돼요. 원자는 E₁에서 E₂로 올라가고 광자는 <b>사라져요</b>.' : proc === 'spon' ? '<b>자발 방출</b>: 들뜬 원자가 <b>저절로</b> 내려오며 광자 1개를 <b>임의의 방향·위상</b>으로 내보내요.' : '<b>유도 방출</b>: 지나가던 광자가 들뜬 원자를 자극해 <b>똑같은 광자</b>를 하나 더 만들어요. 진동수·위상·방향이 같아요 → 레이저의 증폭 원리!');
      }

      /* ============ ④-1 레이저의 특징 비교 ============ */
      const gC = newScene('compare'); CAMS.compare = { dist: PHN ? 23 : 17, theta: 0.3, phi: 1.25, min: 8, max: 36, tx: 0.6, ty: 0.0 };
      const hexRGB = (c) => 'rgb(' + c.map((v) => Math.round(Math.min(255, Math.max(0, v)))).join(',') + ')';
      const wl = window.__sim && window.__sim.wlRGB;
      const specBoard = canvasPlane(4.6, 1.5, 460, 150, (c, w, hh) => {
        for (let x = 0; x < w - 20; x += 2) { const lam = 400 + 300 * x / (w - 20); let r = 0, g = 0, b = 0; if (lam < 440) { r = (440 - lam) / 40; b = 1; } else if (lam < 490) { g = (lam - 440) / 50; b = 1; } else if (lam < 510) { g = 1; b = (510 - lam) / 20; } else if (lam < 580) { r = (lam - 510) / 70; g = 1; } else if (lam < 645) { r = 1; g = (645 - lam) / 65; } else r = 1; c.fillStyle = hexRGB([r * 255, g * 255, b * 255]); c.fillRect(10 + x, 18, 2.4, 50); }
        c.fillStyle = '#10151f'; c.fillRect(10, 86, w - 20, 50); const lx = 10 + (632.8 - 400) / 300 * (w - 20); const gr = c.createRadialGradient(lx, 111, 2, lx, 111, 22); gr.addColorStop(0, 'rgba(255,60,60,.9)'); gr.addColorStop(1, 'rgba(255,60,60,0)'); c.fillStyle = gr; c.fillRect(lx - 24, 86, 48, 50); c.fillStyle = '#ff5a4a'; c.fillRect(lx - 1.6, 86, 3.2, 50);
      }); specBoard.position.set(-2.6, 3.0, 0); gC.add(specBoard);
      const fringeBoard = canvasPlane(4.6, 1.5, 460, 150, (c, w, hh) => {
        const strip = (y, V, col) => { for (let x = 0; x < w - 20; x += 2) { const I = (1 + V * Math.cos(6.2832 * x / ((w - 20) / 7))) / (1 + V), k = 0.06 + 0.94 * I; c.fillStyle = 'rgb(' + col.map((v) => Math.round(v * k)).join(',') + ')'; c.fillRect(10 + x, y, 2.4, 50); } };
        c.fillStyle = '#10151f'; c.fillRect(0, 0, w, hh); strip(18, 0.12, [255, 241, 201]); strip(86, 1.0, [255, 90, 74]);
      }); fringeBoard.position.set(3.0, 3.0, 0); gC.add(fringeBoard);
      label('① 단색성: 백열전구(위) · 레이저(아래)', specBoard, { color: LB, size: 12, offset: [0, 1.0, 0] }, 'compare'); label('② 결맞음: 이중 슬릿 무늬 (위 전구 · 아래 레이저)', fringeBoard, { color: LB, size: 12, offset: [0, 1.0, 0] }, 'compare');
      label('400 nm', [-4.7, 2.15, 0], { color: LB, size: 10 }, 'compare'); label('700 nm', [-0.5, 2.15, 0], { color: LB, size: 10 }, 'compare');
      const CXL = -4.8, CXR = 4.2, CY = -0.2, HMAX = 1.5;
      const flashSrc = sphM(0.28, 0xfff1b0, { emissive: 0xffd34d, emissiveIntensity: 0.9 }); flashSrc.position.set(CXL - 0.4, CY, 0); gC.add(flashSrc);
      const lasSrc = stdM(0.7, 0.22, 0.22, 0x3d4658); lasSrc.position.set(CXL - 0.5, CY, 0); gC.add(lasSrc);
      const halfOf = (dia) => Math.min(HMAX, Math.max(0.012, dia / 5.05 * HMAX));
      const DIA = { laser: (d) => 1e-3 + 1e-3 * d, flash: (d) => 0.05 + 0.05 * d };
      const coneF = new THREE.Mesh(new THREE.CylinderGeometry(halfOf(DIA.flash(100)), halfOf(DIA.flash(0)), CXR - CXL, 32, 1, true), h.basic(0xffd65a, { transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }));
      coneF.rotation.z = Math.PI / 2; coneF.position.set((CXL + CXR) / 2, CY, 0); gC.add(coneF);
      const beamL = segB(0xff3a3a, 0.03, 0.9); h.setSeg(beamL, new V3(CXL, CY, 0), new V3(CXR, CY, 0)); gC.add(beamL);
      const mDisc = new THREE.Mesh(new THREE.TorusGeometry(1, 0.03, 8, 40), mat(0xc4501b, { emissive: 0xc4501b, emissiveIntensity: 0.5 })); mDisc.rotation.y = Math.PI / 2; gC.add(mDisc);
      const mPlane = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.6), h.basic(0x26324a, { transparent: true, opacity: 0.18, side: THREE.DoubleSide })); mPlane.rotation.y = Math.PI / 2; gC.add(mPlane);
      const mSpot = sphM(0.07, 0xff3a3a, { emissive: 0xff3a3a, emissiveIntensity: 1 }); gC.add(mSpot);
      const lcF = label('', mDisc, { color: 'rgba(168,98,12,.92)', size: 12, offset: [0.2, 1.0, 0] }, 'compare'), lcL = label('', mSpot, { color: 'rgba(192,53,59,.92)', size: 12, offset: [0.2, -0.5, 0] }, 'compare');
      label('손전등 (전구)', flashSrc, { color: LB, size: 12, offset: [0, -0.6, 0] }, 'compare'); label('레이저 포인터', lasSrc, { color: LB, size: 12, offset: [0, 0.5, 0] }, 'compare');
      label('③ 직진성: 같은 축척으로 그린 빔', [0, -2.4, 0], { color: LB, size: 12 }, 'compare');
      const Il = 1e-3 / (Math.PI * Math.pow(0.5e-3, 2)), Ib = 60 / (4 * Math.PI * 1), lg10 = (v) => Math.min(1, Math.max(0, Math.log10(v) / 4));
      const bI = [[0xe2464b, Il, '레이저'], [0xf5a623, Ib, '전구']].map(([c, v, n], i) => {
        const frm = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(5.0, 0.3, 0.3)), new THREE.LineBasicMaterial({ color: 0x8a96b8 })); frm.position.set(-0.3, -4.2 - i * 0.6, 0); gC.add(frm);
        const b = new THREE.Mesh(new THREE.BoxGeometry(1, 0.26, 0.26), h.basic(c)); const w = Math.max(0.02, 5.0 * lg10(v)); b.scale.x = w; b.position.set(-2.8 + w / 2, -4.2 - i * 0.6, 0); gC.add(b);
        label(n + ' ' + (i ? '약 ' + Math.round(v) + ' W/m²' : sciS(v) + ' W/m²'), [-2.8 + w + 0.1, -4.2 - i * 0.6, 0], { color: LB, size: 11, offset: [1.1, 0, 0] }, 'compare'); return b;
      });
      function sciS(x) { const e = Math.floor(Math.log10(x)); return (x / Math.pow(10, e)).toFixed(1) + '×10^' + e; }
      label('④ 세기 (로그 눈금): 1 mW 포인터 vs 60 W 전구', [0, -3.4, 0], { color: LB, size: 12 }, 'compare');
      const fmtLen = (m) => (m < 1 ? Math.round(m * 100) + ' cm' : m.toFixed(1) + ' m');
      const cmP = { on: false, d: 100 }; let cmSig = -1;
      function updCompare(dt, t) {
        const S = lessonS(); if (!S) return; if (S.ap.dist !== cmSig) { cmSig = S.ap.dist; if (cmP.on) { cmP.on = false; plC.pause(); } } const d = cmP.on ? cmP.d : S.ap.dist, X = CXL + (CXR - CXL) * d / 100;
        mDisc.position.set(X, CY, 0); mDisc.scale.setScalar(halfOf(DIA.flash(d))); mPlane.position.set(X, CY, 0); mSpot.position.set(X, CY, 0);
        lcF.set('손전등 ' + fmtLen(DIA.flash(d))); lcL.set('레이저 ' + fmtLen(DIA.laser(d))); lcF.obj = [X, CY + halfOf(DIA.flash(d)) + 0.1, 0];
        info('레이저 빛의 특징: ① 한 파장(<b>단색성</b>) ② 위상이 가지런함(<b>결맞음</b>) ③ 곧게 나감(<b>직진성</b>) ④ 좁은 곳에 모여 <b>센</b> 빛.<br>' + d + ' m 떨어진 곳에서 빔 지름: 레이저 <b>' + fmtLen(DIA.laser(d)) + '</b> · 손전등 <b>' + fmtLen(DIA.flash(d)) + '</b>');
      }

      /* ============ ④-2 광통신 ============ */
      const gF = newScene('fiber'); CAMS.fiber = { dist: PHN ? 21 : 14, theta: 0.2, phi: 1.3, min: 8, max: 34, ty: 0 };
      const FX0 = -5.2, FX1 = 5.2, FY = 0.4, xAtKm = (km) => FX0 + (FX1 - FX0) * km / 100;
      const fibT = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, FX1 - FX0, 24, 1, true), glass(0xc7d0e0, 0.3)); fibT.rotation.z = Math.PI / 2; fibT.position.set(0, FY, 0); gF.add(fibT);
      const fibCore = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, FX1 - FX0, 16), h.basic(0xeef2fa, { transparent: true, opacity: 0.8 })); fibCore.rotation.z = Math.PI / 2; fibCore.position.set(0, FY, 0); gF.add(fibCore);
      const txB = stdM(1.0, 0.9, 1.0, 0x3d4658); txB.position.set(FX0 - 0.8, FY, 0); gF.add(txB); const rxB = stdM(1.0, 0.9, 1.0, 0x16a05a); rxB.position.set(FX1 + 0.8, FY, 0); gF.add(rxB);
      const ampM = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.9, 3), mat(0x7a3cff, { emissive: 0x5b2db8, emissiveIntensity: 0.4 })); ampM.rotation.z = -Math.PI / 2; gF.add(ampM);
      const NPF = 40, fiP = new THREE.InstancedMesh(new THREE.SphereGeometry(0.17, 12, 8), h.basic(0xffffff), NPF); fiP.frustumCulled = false; gF.add(fiP);
      label('송신', txB, { color: LB, size: 12, offset: [0, 0.8, 0] }, 'fiber'); const lfRx = label('수신', rxB, { color: LB, size: 12, offset: [0, 0.8, 0] }, 'fiber');
      label('0 km', [FX0, FY - 0.7, 0], { color: LB, size: 11 }, 'fiber'); label('100 km', [FX1, FY - 0.7, 0], { color: LB, size: 11 }, 'fiber');
      const lfAmp = label('', ampM, { color: 'rgba(91,45,184,.92)', size: 12, offset: [0, 0.9, 0] }, 'fiber');
      label('1550 nm 레이저 펄스 · 코어와 클래딩 (전반사)', [0, FY + 1.1, 0], { color: LB, size: 12 }, 'fiber');
      // 세기 막대 (수신 쪽) · 수신 한계 −10 dB
      const lvFr = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.5, 3, 0.5)), new THREE.LineBasicMaterial({ color: 0x8a96b8 })); lvFr.position.set(FX1 + 0.8, -2.6, 0); gF.add(lvFr);
      const lvBar = new THREE.Mesh(new THREE.BoxGeometry(0.44, 1, 0.44), h.basic(0x16a05a)); gF.add(lvBar);
      const lvTh = stdM(0.9, 0.05, 0.6, 0xe2464b); lvTh.position.set(FX1 + 0.8, -2.6 - 1.5 + 3 * 0.1, 0); gF.add(lvTh);
      const lfTh = label('수신 한계 −10 dB (처음의 1/10)', lvTh, { color: 'rgba(192,53,59,.92)', size: 11, offset: [-1.6, 0, 0] }, 'fiber');
      const lfEnd = label('', [FX1 + 0.8, -4.3, 0], { color: LB, size: 12 }, 'fiber');
      const lfRes = label('', [-0.6, -2.6, 0], { color: 'rgba(22,160,90,.92)', size: 13 }, 'fiber');
      // 위치별 세기 띠: 광섬유 아래에 0.5 km 간격으로 높이로 보여 줘요
      const NB = 50, profM = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 0.12), h.basic(0x2f6bff), NB); gF.add(profM);
      const lfProf = label('세기 (dB) — 1 km마다 0.2 dB씩 약해져요', [-1.8, -1.0, 0], { color: LB, size: 11 }, 'fiber');
      const lfCh = label('', [0, -4.6, 0], { color: LB, size: 12 }, 'fiber');
      const bitsA = '1011001110100101', chCols = [0xff3a3a, 0xffa23a, 0xffe23a, 0x5adf5a, 0x3adfd9, 0x4a8dff, 0xa05aff, 0xff5adf];
      const fiPl = { on: false, amp: 0 }; let fSig = ''; const dBlin = (db) => Math.pow(10, db / 10), fD = (pos, x) => (pos > 0 && x >= pos ? -0.2 * (x - pos) : -0.2 * x);
      function updFiber(dt, t) {
        const S = lessonS(); if (!S) return; const A = S.ap, L = window.__sim, sig = A.amp + '|' + A.ch; if (sig !== fSig) { fSig = sig; if (fiPl.on) { fiPl.on = false; plF.pause(); } }
        const amp = fiPl.on ? fiPl.amp : A.amp, ok = L.fiberOK(amp), endDb = fD(amp, 100), mn = L.fiberMin(amp);
        const nCh = Math.min(8, A.ch), gap = 1.0, tt = t * 2.6, n0 = Math.floor(tt / gap), Mp = new THREE.Matrix4(), Cp = new THREE.Color(), Zm = new THREE.Matrix4().makeScale(0, 0, 0); let idx = 0;
        for (let n = n0; n > n0 - Math.ceil((FX1 - FX0) / gap) - 1; n--) {
          const px = FX0 + tt - n * gap; if (px < FX0 || px > FX1 || idx >= NPF) continue;
          const km = (px - FX0) / (FX1 - FX0) * 100, p = dBlin(fD(amp, km)), bit = bitsA[((n % 16) + 16) % 16] === '1';
          for (let c = 0; c < nCh && idx < NPF; c++) { const off = (c - (nCh - 1) / 2) * 0.055; const bc = bitsA[(((n + c * 5) % 16) + 16) % 16] === '1'; Mp.makeScale(bc ? 0.55 + 0.45 * p : 0.3, bc ? 0.55 + 0.45 * p : 0.3, bc ? 0.55 + 0.45 * p : 0.3); Mp.setPosition(px, FY + off * 0.0, off * 1.0); fiP.setMatrixAt(idx, Mp); Cp.set(nCh === 1 ? 0xff3a3a : chCols[c]); if (!bc) Cp.set(0x4a5878); else Cp.multiplyScalar(0.25 + 0.75 * p); fiP.setColorAt(idx, Cp); idx++; }
        }
        for (; idx < NPF; idx++) fiP.setMatrixAt(idx, Zm); fiP.instanceMatrix.needsUpdate = true; if (fiP.instanceColor) fiP.instanceColor.needsUpdate = true;
        ampM.visible = amp > 0; ampM.position.set(xAtKm(amp), FY, 0); lfAmp.show(amp > 0); lfAmp.set('광 증폭기 ' + amp + ' km');
        rxB.material.color.set(ok ? 0x16a05a : 0xc0353b);
        for (let i = 0; i < NB; i++) { const km = (i + 0.5) * 2, db = fD(amp, km), hgt = Math.max(0.03, (1 + db / 24) * 1.2); Mp.makeScale(0.2, hgt, 1); Mp.setPosition(xAtKm(km), -0.55 - 0.6 + hgt / 2 - 0.0, 0); profM.setMatrixAt(i, Mp); profM.setColorAt(i, Cp.set(db < -10 ? 0xc0353b : 0x2f6bff)); }
        profM.instanceMatrix.needsUpdate = true; if (profM.instanceColor) profM.instanceColor.needsUpdate = true;
        const lvl = dBlin(endDb); lvBar.scale.y = Math.max(0.03, 3 * Math.min(1, lvl)); lvBar.position.set(FX1 + 0.8, -4.1 + lvBar.scale.y / 2, 0); lvBar.material.color.set(ok ? 0x16a05a : 0xc0353b);
        lfEnd.set('끝점 ' + Math.round(endDb) + ' dB (처음의 ' + lvl.toFixed(2) + '배)'); lfRes.set(ok ? '✅ 수신 성공: 가장 약한 곳도 −10 dB 이상' : '❌ 수신 실패: 어디선가 −10 dB보다 약해져요 (가장 약한 곳 ' + Math.round(mn) + ' dB)'); lfRes.el.style.background = ok ? 'rgba(22,160,90,.92)' : 'rgba(192,53,59,.92)';
        lfCh.set('파장이 다른 레이저 ' + A.ch + '개 × 10 Gbps = ' + (10 * A.ch) + ' Gbps');
        info('광통신은 0과 1을 빛의 <b>꺼짐·켜짐</b> 펄스로 보내요. 손실(1 km당 0.2 dB)은 <b>광 증폭기</b>로 보충해요. 증폭기는 세기를 처음 값으로 되돌려 줘요.');
      }

      /* ============ ④-3 안전 점검 ============ */
      const gY = newScene('safety'); CAMS.safety = { dist: PHN ? 21 : 13.5, theta: 0.4, phi: 1.3, min: 8, max: 32, ty: 0.8 };
      const room = stdM(11, 0.2, 5, 0xc9d3e6, { roughness: 0.8 }); room.position.set(0, -1.8, 0); gY.add(room);
      const wall = stdM(11, 5.5, 0.15, 0xe8edf6, { roughness: 0.9 }); wall.position.set(0, 0.9, -2.5); gY.add(wall);
      const table = stdM(9.4, 0.25, 2.4, 0xb08a5a, { roughness: 0.7 }); table.position.set(0, -1.1, 0); gY.add(table);
      [[-4.3], [4.3]].forEach(([x]) => { const lg = stdM(0.2, 1.3, 0.2, 0x8a6a40); lg.position.set(x, -1.75, 0.9); gY.add(lg); const lg2 = lg.clone(); lg2.position.z = -0.9; gY.add(lg2); });
      const EYE = 1.5, LOW = -0.7;
      const lasDev = new THREE.Group(); gY.add(lasDev); const lasBox = stdM(1.4, 0.55, 0.6, 0x3d4658); lasDev.add(lasBox); const lasLed = sphM(0.1, 0xff4a4a, { emissive: 0xff2020, emissiveIntensity: 1 }); lasLed.position.set(0.6, 0, 0.32); lasDev.add(lasLed);
      const stand = stdM(0.14, 1, 0.14, 0x8a96aa); gY.add(stand);
      const person = new THREE.Group(); person.position.set(4.0, 0, 0); gY.add(person);
      const body = stdM(1.1, 1.8, 0.7, 0x3d4658); body.position.set(0, -0.25, 0); person.add(body); const head = sphM(0.5, 0xf2c9a0); head.position.set(0, EYE - 0.2, 0); person.add(head);
      const eyeP = sphM(0.07, 0x26324a); eyeP.position.set(-0.4, EYE - 0.2, 0.28); person.add(eyeP);
      const gog = stdM(0.32, 0.26, 0.9, 0x50c878, { transparent: true, opacity: 0.6 }); gog.position.set(-0.46, EYE - 0.15, 0); person.add(gog);
      const sunG = stdM(0.32, 0.26, 0.9, 0x282828, { transparent: true, opacity: 0.75 }); sunG.position.copy(gog.position); person.add(sunG);
      const mirrorM = stdM(0.1, 1.5, 1.0, 0xdbe6f5, { metalness: 0.9, roughness: 0.1 }); gY.add(mirrorM);
      const signM = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.0, 3), mat(0xffd34d, { emissive: 0x8a6a00, emissiveIntensity: 0.3 })); signM.position.set(1.6, 2.4, -2.3); signM.rotation.x = Math.PI / 2; gY.add(signM);
      const b1 = segB(0xff3a3a, 0.05, 0.95), b2 = segB(0xff3a3a, 0.05, 0.95), b3 = segB(0xff3a3a, 0.05, 0.95); gY.add(b1, b2, b3);
      const glowE = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 12), h.basic(0xff2020, { transparent: true, opacity: 0, depthWrite: false })); gY.add(glowE);
      const eyeLine = segB(0x9aa6b8, 0.012, 0.8); h.setSeg(eyeLine, new V3(-4.8, EYE - 0.15, 1.3), new V3(4.8, EYE - 0.15, 1.3)); gY.add(eyeLine);
      label('눈 높이', [-4.6, EYE - 0.15, 1.3], { color: LB, size: 11, offset: [0, 0.25, 0] }, 'safety');
      const lyLas = label('', lasDev, { color: LB, size: 12, offset: [0, 0.65, 0.4] }, 'safety'), lyMir = label('거울', mirrorM, { color: LB, size: 12, offset: [0, 1.05, 0] }, 'safety');
      label('사람', person, { color: LB, size: 12, offset: [0, -1.6, 0.5] }, 'safety'); const lySign = label('⚠️ 경고 표지', signM, { color: 'rgba(138,106,0,.92)', size: 12, offset: [0, 0.9, 0] }, 'safety'); const lyGog = label('보호 안경', gog, { color: 'rgba(22,160,90,.92)', size: 12, offset: [-0.2, 0.55, 0.3] }, 'safety');
      const lyHz = label('', [0, 3.5, 0], { color: 'rgba(192,53,59,.92)', size: 13 }, 'safety');
      function updSafety(dt, t) {
        const S = lessonS(); if (!S) return; const st = window.__sim.safeState(), ly = st.beamEye ? EYE : LOW, lx = -3.9;
        lasDev.position.set(lx, ly, 0); stand.visible = st.beamEye; stand.scale.y = Math.max(0.1, ly + 0.97); stand.position.set(lx - 0.1, (ly - 0.97) / 2, 0);
        lasLed.material.color.set(st.laserOn ? 0xff4a4a : 0x7b8798); lasLed.material.emissive.set(st.laserOn ? 0xff2020 : 0x000000);
        lyLas.set('레이저 (' + (st.laserOn ? '켜짐' : '꺼짐') + ')');
        gog.visible = st.goggles; sunG.visible = !st.goggles && window.__sim.S.ap.safe.w3; lyGog.show(st.goggles); signM.visible = st.sign; lySign.show(st.sign);
        const hp = new V3(3.6, EYE - 0.15, 0.0), lp = new V3(lx + 0.8, ly, 0); let on = st.laserOn; b1.visible = b2.visible = b3.visible = false;
        mirrorM.visible = st.mirror; lyMir.show(st.mirror);
        if (st.mirror) { const mp = new V3(0.2, ly, 0); mirrorM.position.copy(mp); mirrorM.rotation.y = Math.PI / 4; if (on) { h.setSeg(b1, lp, mp); h.setSeg(b2, mp, new V3(3.55, EYE - 0.15, 0)); b1.visible = b2.visible = true; } }
        else if (on) { h.setSeg(b1, lp, new V3(st.beamEye ? 3.55 : 5.2, ly, 0)); b1.visible = true; }
        if (st.shootEye && on) { h.setSeg(b3, new V3(1.4, EYE - 0.8, 1.5), new V3(3.55, EYE - 0.15, 0.15)); b3.visible = true; }
        const hit = on && (st.beamEye || st.shootEye || st.mirror); glowE.visible = hit; glowE.position.set(3.55, EYE - 0.15, 0); glowE.material.opacity = hit ? 0.35 + 0.2 * Math.sin(t * 8) : 0;
        lyHz.show(true); lyHz.set(st.hz.length ? '⚠️ 위험 요소 ' + st.hz.length + '개' : '✅ 위험 요소 0개'); lyHz.el.style.background = st.hz.length ? 'rgba(192,53,59,.92)' : 'rgba(22,160,90,.92)';
        info((st.hz.length ? '<b>⚠️ 위험 요소 ' + st.hz.length + '개</b><br>' + st.hz.map((x) => '• ' + x).join('<br>') : '<b>✅ 위험 요소가 없어요.</b>') + '<br>직접 쏘이는 빛뿐 아니라 거울·유리·금속에서 <b>반사한 빛</b>도 위험해요.');
      }

      const plA = mkPlayer('atom', { duration: 4, loop: true, autoplay: false, label: '과정 다시 보기', phases: [[0, '시작'], [0.45, '광자와 만나요'], [0.7, '결과']], onFrame(p) { const S = lessonS(); if (!S) return; atP.on = true; atP.tp = p * AT_T[S.at.proc]; } });
      const plC = mkPlayer('compare', { duration: 8, loop: true, autoplay: false, label: '멀리 보내기', phases: [[0, '0 m'], [0.5, '50 m'], [0.95, '100 m']], onFrame(p) { cmP.on = true; cmP.d = Math.round(p * 100); } });
      const plF = mkPlayer('fiber', { duration: 9, loop: true, autoplay: false, label: '증폭기 옮기기', phases: [[0, '증폭기 없음'], [0.1, '10 km'], [0.5, '50 km'], [0.9, '90 km']], onFrame(p) { fiPl.on = true; fiPl.amp = p < 0.08 ? 0 : Math.round(p * 100); } });
      const updMap = { atom: updAtom, compare: updCompare, fiber: updFiber, safety: updSafety };
      setScene(updMap[sceneKey()] ? sceneKey() : 'cavity');
      let outV = 0, tx = 0, lsig = '';
      return {
        update(dt, t) {
          dt = Math.min(dt, 0.05);
          { const k = sceneKey(), base = updMap[k] ? k : 'cavity'; if (base !== K.cur) setScene(base); if (base !== 'cavity') { updMap[base](dt, t); return; } }
          { const S = lessonS(); if (S) { let P = st.P, R = st.R; if (S.mode === 'cavity') { P = S.cv.on ? S.cv.p / 100 : 0; R = { '1': 0.99, '5': 0.95, '10': 0.9, none: 0.3 }[S.cv.tm] || 0.9; } else if (S.mode === 'invert') { P = S.iv.p / 100; R = 0.9; } const g = P + '|' + R; if (g !== lsig) { lsig = g; if (R !== st.R || P < st.P) { st.N2 = 0; st.q = 0.003; } st.P = P; st.R = R; mR.visible = !(S.mode === 'cavity' && S.cv.tm === 'none'); txt(); } } }
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
        sync() { lsig = ''; },
      };
    },
  });
})();
