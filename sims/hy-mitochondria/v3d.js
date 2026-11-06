/* hy-mitochondria · 진짜 3D 미토콘드리아 (단면 · 내막 · 크리스타 · ATP 합성 효소)
   2D 차시의 '3D 단면 모형'과 같은 이름·색·치수 (외막 반지름 75, 내막 62, 크리스타 판 5개: 위·아래 번갈아). */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const narrow = window.innerWidth < 600 || window.innerHeight > window.innerWidth * 1.1;
  const U = 0.01;                         // 2D 모형 단위 → 3D (100 = 1)
  const MH = 1.05, RO = 0.75, RI = 0.62;  // 가운데 선분 절반 길이, 외막, 내막 반지름
  const CRX = [-0.72, -0.36, 0, 0.36, 0.72];
  const COL = { outer: 0xa8561f, ims: 0xd9822b, inner: 0xc2255c, crista: 0xe5508a, matrix: 0xc9941f, dna: 0x2563eb, ribo: 0x7c3aed };
  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  const reduce = () => !!(window.SciSim && window.SciSim.reduceMotion);

  window.SciSim3D.attach({
    title: '미토콘드리아 3D 단면',
    label: '🧊 3D 입체',
    hint: '드래그: 돌리기 · 두 손가락/휠: 확대',
    camera: { dist: narrow ? 5.9 : 3.9, target: narrow ? [0, 0.3, 0] : [0, 0, 0], theta: 0.38, phi: 1.4, min: 2.2, max: 10 },
    autoRotate: 0,
    levels: [0, 1],   // 1단계(조립 · 단면 이름)와 2단계(위치 지도 · 내막 확대)는 3D 막대의 단추로 해요. 3 · 4단계(표면적 그래프 · 세포 추론)는 2D 화면이에요
    build(ctx) {
      const { THREE, root, label, info, controls, renderer } = ctx;
      renderer.localClippingEnabled = true;
      if (narrow) root.rotation.z = Math.PI / 2;      // 휴대폰(세로 화면)에서는 세워서 보여 줘요
      const V = THREE.Vector3;
      const plane = new THREE.Plane(new V(0, 0, -1), 0.9);       // z > c 는 잘려요
      const planes = [plane];
      let mode = 'name', cn = false, cut = 0.65;

      const mats = [];
      function M(color, o) {
        const m = new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.5, metalness: 0.02, clippingPlanes: planes }, o || {}));
        mats.push(m); return m;
      }
      function glass(color, opa, o) { return M(color, Object.assign({ transparent: true, opacity: opa, side: THREE.DoubleSide, depthWrite: false, roughness: 0.8 }, o || {})); }
      function capsule(R) { const g = new THREE.CapsuleGeometry(R, MH * 2, 16, 40); g.rotateZ(Math.PI / 2); return g; }

      /* 막과 기질 */
      const outer = new THREE.Mesh(capsule(RO), glass(COL.outer, 0.36)); outer.renderOrder = 4;
      const imsFill = new THREE.Mesh(capsule((RO + RI) / 2 + 0.004), glass(COL.ims, 0.16)); imsFill.renderOrder = 3;
      const inner = new THREE.Mesh(capsule(RI), glass(COL.inner, 0.42)); inner.renderOrder = 2;
      const matrix = new THREE.Mesh(capsule(RI - 0.012), glass(COL.matrix, 0.2)); matrix.renderOrder = 1;
      root.add(matrix, inner, imsFill, outer);

      /* 절개 단면의 테두리 */
      const rimG = new THREE.Group(); root.add(rimG);
      const rimM = { o: new THREE.MeshStandardMaterial({ color: 0x7a3a12, roughness: 0.5 }), i: new THREE.MeshStandardMaterial({ color: 0xe0407a, roughness: 0.5 }) };
      function stadium(R, c, rad, mat) {
        const rc = Math.sqrt(Math.max(0, R * R - c * c)); if (rc < 0.02) return null;
        const pts = [];
        for (let i = 0; i <= 16; i++) pts.push(new V(-MH + (2 * MH * i) / 16, rc, c));
        for (let i = 1; i < 16; i++) { const a = Math.PI / 2 - (Math.PI * i) / 16; pts.push(new V(MH + rc * Math.cos(a), rc * Math.sin(a), c)); }
        for (let i = 0; i <= 16; i++) pts.push(new V(MH - (2 * MH * i) / 16, -rc, c));
        for (let i = 1; i < 16; i++) { const a = -Math.PI / 2 - (Math.PI * i) / 16; pts.push(new V(-MH + rc * Math.cos(a), rc * Math.sin(a), c)); }
        return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 160, rad, 6, true), mat);
      }
      function rebuildRim() {
        while (rimG.children.length) { const o = rimG.children.pop(); o.geometry.dispose(); }
        const c = plane.constant;
        const a = stadium(RO, c, 0.014, rimM.o), b = stadium(RI, c, 0.012, rimM.i);
        if (a) rimG.add(a); if (b) rimG.add(b);
      }

      /* 크리스타 판 5개 (위·아래 번갈아, 내막이 접힌 주름) */
      const cristaMat = M(COL.crista, { transparent: true, opacity: 0.66, side: THREE.DoubleSide, roughness: 0.4 });
      const plates = [];
      const span = (Math.PI * 110) / 180, rP = RI - 0.015, rpIn = rP * 0.3;
      CRX.forEach((x, k) => {
        const ac = k % 2 === 0 ? 0 : Math.PI;
        const sh = new THREE.Shape(); const a0 = ac - span, a1 = ac + span;
        sh.absarc(0, 0, rP, a0, a1, false); sh.absarc(0, 0, rpIn, a1, a0, true); sh.closePath();
        const g = new THREE.ExtrudeGeometry(sh, { depth: 0.05, bevelEnabled: false, curveSegments: 28 });
        g.translate(0, 0, -0.025);
        g.applyMatrix4(new THREE.Matrix4().makeBasis(new V(0, 1, 0), new V(0, 0, 1), new V(1, 0, 0)));
        const m = new THREE.Mesh(g, cristaMat); m.position.x = x; root.add(m); plates.push({ x, ac, mesh: m });
      });

      /* ATP 합성 효소 · 전자 전달 복합체 (내막에 박힘, 머리는 기질 쪽) */
      const gBase = new THREE.CylinderGeometry(0.05, 0.05, 0.03, 14), gStalk = new THREE.CylinderGeometry(0.012, 0.012, 0.075, 8), gHead = new THREE.SphereGeometry(0.052, 16, 12), gRot = new THREE.BoxGeometry(0.014, 0.05, 0.014);
      const mBase = M(0xfde68a), mHead = M(0xfbbf24, { roughness: 0.35 }), mRot = M(0xb45309), mStalk = M(0xd97706);
      const syns = []; let labelSynObj = null, labelCxObj = null;
      function addSyn(pos, dirIn, ph) {
        const g = new THREE.Group(); g.position.copy(pos); g.quaternion.setFromUnitVectors(new V(0, 1, 0), dirIn);
        const b = new THREE.Mesh(gBase, mBase); g.add(b);
        const s = new THREE.Mesh(gStalk, mStalk); s.position.y = 0.05; g.add(s);
        const h = new THREE.Mesh(gHead, mHead); h.position.y = 0.11; g.add(h);
        const r = new THREE.Mesh(gRot, mRot); r.position.y = 0.0; b.add(r);
        root.add(g);
        const o = { g, pos: pos.clone(), dirIn: dirIn.clone(), rot: r, ph };
        syns.push(o); return o;
      }
      const R = rng(2024);
      for (let i = 0; i < 16; i++) {      // 안쪽 막 (원통 부분)
        const x = -MH + 0.08 + R() * (2 * MH - 0.16), f = (i / 16) * Math.PI * 2 + R() * 0.3;
        const dirOut = new V(0, Math.cos(f), Math.sin(f));
        if (CRX.some((cx) => Math.abs(cx - x) < 0.07)) { i--; continue; }
        addSyn(dirOut.clone().multiplyScalar(RI), dirOut.clone().negate(), R() * 6.28);
      }
      { const f = -2.6, d = new V(0, Math.cos(f), Math.sin(f)); labelSynObj = addSyn(d.clone().multiplyScalar(RI).setX(-0.55), d.clone().negate(), 0); }
      plates.forEach((p, k) => {            // 크리스타 판의 양쪽 면
        [-1, 1].forEach((sd) => { for (let j = 0; j < 1; j++) {
          const al = p.ac + (R() * 2 - 1) * span * 0.75, r = 0.26 + R() * 0.26;
          addSyn(new V(p.x + sd * 0.033, r * Math.cos(al), r * Math.sin(al)), new V(sd, 0, 0), R() * 6.28);
        } });
      });
      const gCx = new THREE.BoxGeometry(0.05, 0.1, 0.075), mCx = M(0x8b9cf0, { roughness: 0.45 }), cxs = [];
      for (let i = 0; i < 10; i++) {
        const x = -MH + 0.1 + R() * (2 * MH - 0.2), f = R() * Math.PI * 2;
        if (CRX.some((cx) => Math.abs(cx - x) < 0.09)) { i--; continue; }
        const dirOut = new V(0, Math.cos(f), Math.sin(f));
        const m = new THREE.Mesh(gCx, mCx); m.position.copy(dirOut).multiplyScalar(RI - 0.02);
        m.quaternion.setFromUnitVectors(new V(0, 1, 0), dirOut.clone().negate()); root.add(m); cxs.push({ m, dirOut });
      }

      { const f = -2.6, d = new V(0, Math.cos(f), Math.sin(f)), m = new THREE.Mesh(gCx, mCx); m.position.copy(d).multiplyScalar(RI - 0.02).setX(0.55); m.quaternion.setFromUnitVectors(new V(0, 1, 0), d.clone().negate()); root.add(m); labelCxObj = { m, dirOut: d }; cxs.push(labelCxObj); }

      /* DNA (고리 모양) · 리보솜 (70S) */
      const pts = []; for (let j = 0; j < 60; j++) { const f = (j / 60) * Math.PI * 2, r = 0.12 + 0.022 * Math.sin(3 * f); pts.push(new V(-0.54 + r * Math.cos(f), -0.08 + r * Math.sin(f), -0.1)); }
      const dna = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 80, 0.017, 8, true), M(COL.dna, { roughness: 0.4 }));
      root.add(dna);
      const gRibo = new THREE.SphereGeometry(0.036, 12, 10), mRibo = M(COL.ribo, { roughness: 0.4 }), ribos = [];
      { let guard = 0; const out = [new V(1.12, 0.06, 0.05)];
        while (out.length < 10 && guard++ < 400) {
          const x = -MH - 0.3 + R() * (2 * MH + 0.6), y = (R() - 0.5) * 0.84, z = (R() - 0.5) * 0.7;
          const dx = Math.max(0, Math.abs(x) - MH), d = Math.hypot(dx, y, z); if (d > RI - 0.1) continue;
          if (out.some((q) => q.distanceTo(new V(x, y, z)) < 0.16)) continue;
          if (Math.hypot(x + 0.54, y + 0.08, z + 0.1) < 0.22) continue;
          if (CRX.some((cx) => Math.abs(cx - x) < 0.07)) continue;
          out.push(new V(x, y, z));
        }
        out.forEach((p) => { const m = new THREE.Mesh(gRibo, mRibo); m.position.copy(p); root.add(m); ribos.push(m); }); }

      /* H⁺ · ATP 글자 알갱이 */
      function textTex(text, fg, bg, w, h) {
        const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
        g.fillStyle = bg; g.beginPath(); g.arc(h / 2, h / 2, h / 2 - 2, 0, 7); g.fill();
        if (w > h) { g.fillRect(h / 2, 2, w - h, h - 4); g.beginPath(); g.arc(w - h / 2, h / 2, h / 2 - 2, 0, 7); g.fill(); }
        g.fillStyle = fg; g.font = '800 ' + Math.round(h * 0.56) + 'px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 2);
        const t = new THREE.CanvasTexture(c); return t;
      }
      const tH = textTex('H⁺', '#7c2d12', '#fdba74', 64, 64), tATP = textTex('ATP', '#713f12', '#facc15', 128, 64);
      const spMat = (tex) => new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, clippingPlanes: planes });
      const mSpH = spMat(tH);
      const hs = [];
      for (let i = 0; i < 46; i++) {
        const s = new THREE.Sprite(mSpH.clone()); s.scale.set(0.11, 0.11, 1); root.add(s);
        hs.push({ s, x: -MH + R() * 2 * MH, f: (i % 2 ? 0 : Math.PI) + (R() - 0.5) * 0.9, r: RI + 0.035 + R() * 0.05, vx: (R() - 0.5) * 0.2, vf: (R() - 0.5) * 1.2 });
      }
      const tokens = [], atps = [];
      const spATP = () => { const s = new THREE.Sprite(spMat(tATP)); s.scale.set(0.24, 0.12, 1); root.add(s); return s; };
      const spH2 = () => { const s = new THREE.Sprite(spMat(tH)); s.scale.set(0.12, 0.12, 1); root.add(s); return s; };

      /* 이름표 */
      const A = (x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); root.add(o); return o; };
      const names = [
        ['외막', 'outer', A(1.0, 0.0, -RO + 0.02)], ['막 사이 공간', 'ims', A(-1.12, 0.0, -0.42)], ['내막', 'inner', A(-0.15, -RI + 0.02, -0.02)],
        ['크리스타', 'crista', A(0, 0.4, 0)], ['기질', 'matrix', A(0.62, -0.25, -0.15)], ['DNA', 'dna', A(-0.54, 0.05, -0.1)], ['리보솜', 'ribo', ribos[0].position],
      ].map(([t, k, o]) => { const L = label(t, o, { color: '#' + COL[k].toString(16).padStart(6, '0'), size: 12.5 }); return L; });
      names[1].off = [0, 0.1, 0];
      const synObj = A(0, 0, 0), cxObj = A(0, 0, 0);
      const labSyn = label('ATP 합성 효소', synObj, { color: '#b45309', size: 12.5 }), labCx = label('전자 전달 복합체', cxObj, { color: '#4f46e5', size: 12.5 });
      const labH = label('H⁺ 많음 (막 사이 공간)', A(0.0, RO + 0.0, 0.0), { color: '#c2410c', size: 12.5 });
      const labMat = label('H⁺ 적음 (기질)', A(0.0, 0.0, 0.0), { color: '#8a6410', size: 12.5 });
      const refs = {};
      function pickVisible() {
        const c = plane.constant;
        const vs = syns.filter((s) => s.pos.z < c - 0.12 && Math.abs(s.pos.x) < 0.95);
        const cv = cxs.filter((q) => q.dirOut.z < c - 0.12);
        return { syns: vs, labelSyn: (labelSynObj.pos.z < c - 0.05 ? labelSynObj : vs[0]), cx: cv, labelCx: (labelCxObj.dirOut.z < c - 0.05 ? labelCxObj : cv[0]) };
      }

      function setCut(v) {
        cut = v; plane.constant = 0.9 - 0.88 * v;       // 0%: 안 잘림 → 100%: 가운데까지 (z>0.02)
        rebuildRim(); applyViz();
        hs.forEach((h) => { h.s.visible = true; });
      }
      function applyViz() {
        const name = mode === 'name';
        names.forEach((L, i) => L.show(name && asmName(i)));
        asmMarks();
        const ref = pickVisible();
        if (!name && ref.labelSyn) { synObj.position.copy(ref.labelSyn.pos).add(ref.labelSyn.dirIn.clone().multiplyScalar(0.2)); }
        labSyn.show(!name && !!ref.labelSyn);
        if (!name && ref.labelCx) { cxObj.position.copy(ref.labelCx.m.position); }
        labCx.show(!name && !!ref.labelCx);
        labH.show(!name); labMat.show(!name);
        labH.obj.position.set(-0.55, RO + 0.02, 0.0); labMat.obj.position.set(0.9, -0.12, -0.2);
        writeInfo();
      }
      function writeInfo() {
        const ah = asmHtml(); if (ah) { info(ah); return; }
        if (mode === 'name') {
          info('<b>이중막</b>: 바깥 <b style="color:#ffb27a">외막</b>, 안쪽 <b style="color:#ff8fb8">내막</b>이 안으로 접힌 것이 <b style="color:#ff8fb8">크리스타</b>예요.<br>내막 안쪽은 <b>기질</b>(DNA·리보솜), 두 막 사이는 <b>막 사이 공간</b>이에요. <b>단면</b> 슬라이더로 잘라 봐요.');
        } else if (cn) {
          info('<b style="color:#ff8a8a">시안화물</b>이 전자 전달 복합체를 막았어요.<br>H⁺를 막 사이 공간으로 퍼 올리지 못하고, ATP 합성 효소도 멈춰요 → <b>ATP 생산 0</b>.');
        } else {
          info('<b>에너지 전환</b>: 내막의 <b style="color:#a5b4fc">전자 전달 복합체</b>가 H⁺를 <b>막 사이 공간</b>으로 퍼 올려요.<br>H⁺가 <b style="color:#fbbf24">ATP 합성 효소</b>(머리는 기질 쪽)를 통해 기질로 돌아올 때 <b>ATP</b>가 만들어져요.');
        }
      }

      /* 2D와 같은 값: 단면 정도(3D 모형 화면의 슬라이더) · 시안화물(내막 확대 화면). 3D에서 바꾸면 2D도 같이 바뀌어요 */
      const cutR = controls.range('단면', 0, 100, 1, Math.round(cut * 100), (v) => { setCut(v / 100); const L = ctx.lesson(); if (L && L.bCut && L.S.mode === 'build') L.bCut(v / 100); }, (v) => v + ' %');
      const cnB = controls.button('🧪 시안화물 처리', () => { const L = ctx.lesson(); if (L && L.znSetDrug && L.S.mode === 'zoom') { L.znSetDrug(!cn); } else { cn = !cn; cnB.classList.toggle('on', cn); cnB.textContent = cn ? '🧪 시안화물 처리됨' : '🧪 시안화물 처리'; applyViz(); } });
      cnB.style.display = 'none';
      /* ---- 1단계 조립 · 이름 붙이기, 2단계 위치 지도: 2D의 부품 카드(bPlace) · 단면 핀 · 반응 카드(Sorter)와 같은 상태 ----
         ? 자리 번호는 부품 순서와 다르게 섞어 두어요. 고르고(◀ ▶) 자리 · 구역 단추를 누르면 2D 함수가 판정해요. */
      const MP = [3, 6, 1, 7, 4, 2, 5], CIRC = '1234567';
      const LL = () => { const L = ctx.lesson(); return L && L.S ? L : null; };
      const LB = () => { const L = LL(); return L && L.S.mode === 'build' && L.S.b ? L : null; };
      const asmOn = () => { const L = LB(); return !!(L && !L.S.b.nameMode && L.S.b.placed.some((x) => !x)); };
      const pinOn = () => { const L = LB(); return !!(L && L.S.b.nameMode); };
      const mapOn = () => { const L = LL(); return !!(L && L.S.mode === 'map' && L.S.mp && L.S.mp.so); };
      function asmName(i) { const L = LB(); if (!L) return true; if (L.S.b.nameMode) return false; return !!L.S.b.placed[i]; }
      const qLabs = names.map((N, i) => { const L = label('? ' + CIRC[MP[i] - 1], N.obj, { color: '#b45309', size: 12.5 }); L.show(false); return L; });
      const PINP = [[0.5, RO, 0], [-0.5, -RI, 0], [-0.62, (RO + RI) / 2, 0], [MH + 0.25, -0.05, 0], [0, 0.4, 0]];   // 세로 단면(z = 0)의 외막 · 내막 · 막 사이 공간 · 기질 · 크리스타
      const pinLabs = PINP.map((q, k) => { const L = label('핀 ' + '①②③④⑤'[k], A(q[0], q[1], q[2]), { color: '#1d4ed8', size: 12.5 }); L.show(false); return L; });
      function asmMarks() { const L = LB(), on = asmOn(), pn = pinOn(); qLabs.forEach((q, i) => q.show(on && !L.S.b.placed[i])); pinLabs.forEach((q) => q.show(pn)); }
      function asmHtml() {
        const L = LL(); if (!L) return '';
        if (mapOn()) {
          const so = L.S.mp.so, c = L.S.mp.pick, zn = (id) => ({ cyto: '세포질', ims: '막 사이 공간', inner: '내막', matrix: '기질' })[id];
          return '<b>위치 지도</b> · 놓은 카드 ' + so.placed + ' / 5<br>고른 카드: <b>' + (c ? c.label : '—') + '</b>' + (c && c.sub ? ' (' + c.sub + ')' : '') + '<br>' + so.cards.filter((q) => q.zone).map((q) => q.label + ' → ' + zn(q.zone)).join('<br>');
        }
        if (pinOn()) return '<b>세로 단면</b> · 핀 ①~⑤가 가리키는 구조의 이름을 오른쪽 목록에서 골라요.<br>외막 · 내막 · 막 사이 공간 · 기질 · 크리스타의 자리를 살펴봐요.';
        if (!asmOn()) return '';
        const b = L.S.b, n = b.placed.filter(Boolean).length, P = L.PARTS[b.sel];
        return '<b>미토콘드리아 조립 ' + n + ' / 7</b><br>' + (P && !b.placed[b.sel] ? '고른 부품: <b>' + P.name + '</b> · ' + P.clue + '<br>알맞은 <b>?</b> 자리의 번호 단추를 눌러요.' : '<b>부품 ◀ ▶</b>로 부품 카드를 골라요.');
      }
      function pickPart(d) {
        const L = LB(); if (!L) return; const b = L.S.b, ts = b.tok.filter((t) => !b.placed[t.pi]); if (!ts.length) return;
        let k = ts.findIndex((t) => t.pi === b.sel); k = k < 0 ? (d > 0 ? 0 : ts.length - 1) : (k + d + ts.length) % ts.length;
        b.sel = ts[k].pi; asmSig = '';
      }
      function putPart(i) {
        const L = LB(); if (!L || !L.bPlace) return; const b = L.S.b;
        if (b.sel < 0 || b.placed[b.sel]) pickPart(1);
        const t = b.tok.find((q) => q.pi === b.sel); if (!t) return;
        const ok = L.bPlace(t, i);
        if (ok) { const ts = b.tok.filter((q) => !b.placed[q.pi]); b.sel = ts.length ? ts[0].pi : -1; } else b.sel = t.pi;
        asmSig = '';
      }
      function pickCard(d) { const L = LL(); if (!mapOn()) return; const cs = L.S.mp.so.cards, n = cs.length; let k = cs.indexOf(L.S.mp.pick); k = k < 0 ? (d > 0 ? 0 : n - 1) : ((k + d) % n + n) % n; L.S.mp.pick = cs[k]; asmSig = ''; }
      function putCard(z) {
        const L = LL(); if (!mapOn()) return; const so = L.S.mp.so, cs = so.cards; const c = L.S.mp.pick || cs.find((q) => !q.zone); if (!c) return;
        const k = cs.indexOf(c); so.place(c, z);
        const nx = cs.slice(k + 1).concat(cs.slice(0, k)).find((q) => !q.zone); L.S.mp.pick = nx || null; asmSig = '';
      }
      const ctlBox = renderer.domElement.closest('.v3-wrap').querySelector('.v3-ctl'), nA0 = ctlBox.children.length;
      controls.text('<b>부품</b>'); controls.button('◀', () => pickPart(-1)); controls.button('▶', () => pickPart(1)); controls.text('<b>자리</b>');
      const slotBtn = [1, 2, 3, 4, 5, 6, 7].map((k) => { const i = MP.indexOf(k); return { bt: controls.button('? ' + CIRC[k - 1], () => putPart(i)), i }; });
      const asmEls = Array.prototype.slice.call(ctlBox.children, nA0), nM0 = ctlBox.children.length;
      controls.text('<b>카드</b>'); controls.button('◀', () => pickCard(-1)); controls.button('▶', () => pickCard(1)); controls.text('<b>구역</b>');
      [['cyto', '세포질'], ['ims', '막 사이 공간'], ['inner', '내막'], ['matrix', '기질']].forEach(([z, t]) => controls.button(t, () => putCard(z)));
      const mapEls = Array.prototype.slice.call(ctlBox.children, nM0);
      let asmSig = null;
      function asmTick() {
        const L = LL(), b = L && L.S.b, mo = mapOn();
        const sg = !L ? 'x' : mo ? 'm' + L.S.mp.so.cards.map((q) => q.zone || '-').join(',') + (L.S.mp.pick ? L.S.mp.pick.id : '') : L.S.mode !== 'build' ? 'o' + L.S.mode : (b.nameMode ? 'n' : 'a') + b.placed.map((x) => (x ? 1 : 0)).join('') + b.sel;
        if (sg === asmSig) return; asmSig = sg;
        const on = asmOn();
        asmEls.forEach((e) => { e.style.display = on ? '' : 'none'; }); mapEls.forEach((e) => { e.style.display = mo ? '' : 'none'; });
        if (on) slotBtn.forEach((q) => { q.bt.style.display = b.placed[q.i] ? 'none' : ''; });
        applyViz();
      }
      setCut(cut);

      let spawn = 0, spawnP = 0, lastSt = {};
      /* 2D 화면이 3D 모형(build) · 지도(map) · 내막 확대(zoom) 중 어디인지, 단면 정도, 시안화물 여부를 따라가요 */
      function poll() {
        const L = ctx.lesson(); if (!L || !L.S) return;
        asmTick();
        const m = L.S.mode, nm = m === 'zoom' ? 'flow' : 'name';
        let ch = false;
        if (nm !== mode) { mode = nm; cnB.style.display = mode === 'flow' ? '' : 'none'; ch = true; }
        if (m === 'build' && L.S.b && L.S.b.sT !== lastSt.sT) { lastSt.sT = L.S.b.sT; if (Math.abs(L.S.b.sT - cut) > 1e-3) { cutR.set(Math.round(L.S.b.sT * 100)); setCut(L.S.b.sT); } }
        const zc = !!(L.S.zm && L.S.zm.cn);
        if (m === 'zoom' && zc !== cn) { cn = zc; cnB.classList.toggle('on', cn); cnB.textContent = cn ? '🧪 시안화물 처리됨' : '🧪 시안화물 처리'; ch = true; }
        if (m !== 'zoom' && cn) { cn = false; cnB.classList.remove('on'); cnB.textContent = '🧪 시안화물 처리'; ch = true; }
        if (ch) applyViz();
      }
      return {
        sync() { poll(); },
        update(dt, t) {
          poll();
          const c = plane.constant, flow = mode === 'flow', run = flow && !cn, slow = reduce() ? 0.2 : 1;
          // H⁺ 떠다니기 (막 사이 공간)
          hs.forEach((h, i) => {
            h.f += h.vf * dt * slow; { const base = h.f > Math.PI / 2 && h.f < Math.PI * 1.5 ? Math.PI : (h.f > -Math.PI / 2 && h.f < Math.PI / 2 ? 0 : h.f); const d = Math.atan2(Math.sin(h.f - base), Math.cos(h.f - base)); if (Math.abs(d) > 0.5) h.vf = -Math.sign(d) * Math.abs(h.vf); } h.x += h.vx * dt * slow; if (Math.abs(h.x) > MH) { h.vx = -h.vx; h.x = Math.sign(h.x) * MH; }
            if (Math.random() < 0.02) { h.vf = (Math.random() - 0.5) * 1.2; h.vx = (Math.random() - 0.5) * 0.2; }
            const y = h.r * Math.cos(h.f), z = h.r * Math.sin(h.f);
            h.s.position.set(h.x, y, z);
            h.s.material.opacity = flow ? (cn ? (i < 14 ? 0.9 : 0) : 0.95) : 0;
            h.s.visible = z < c && h.s.material.opacity > 0;
          });
          // 전자 전달 복합체 펌프 · ATP 합성 효소 통과
          if (run) {
            const ref = pickVisible();
            spawn -= dt; spawnP -= dt;
            if (spawn <= 0 && ref.syns.length) { spawn = 0.7 + Math.random() * 0.4; const s = ref.syns[(Math.random() * ref.syns.length) | 0]; tokens.push({ kind: 'syn', s, t: 0, sp: spH2() }); }
            if (spawnP <= 0 && ref.cx.length) { spawnP = 0.5 + Math.random() * 0.4; const q = ref.cx[(Math.random() * ref.cx.length) | 0]; tokens.push({ kind: 'pump', q, t: 0, sp: spH2() }); }
          }
          for (let i = tokens.length - 1; i >= 0; i--) {
            const k = tokens[i]; k.t += dt * 0.9;
            if (k.kind === 'syn') {
              const d = k.s.dirIn, p = k.s.pos;
              const dist = -0.18 + k.t * 0.5;   // 막 사이 공간(바깥) → 기질(안)
              k.sp.position.copy(p).addScaledVector(d, dist);
              k.sp.material.opacity = k.t > 0.85 ? Math.max(0, 1 - (k.t - 0.85) / 0.15) : 1;
              if (k.t >= 1) { const a = spATP(); a.position.copy(p).addScaledVector(d, 0.3); atps.push({ sp: a, t: 0, d }); scene_remove(k.sp); tokens.splice(i, 1); }
            } else {
              const q = k.q; const out = q.dirOut;
              k.sp.position.copy(q.m.position).addScaledVector(out, -0.12 + k.t * 0.3);        // 기질 → 막 사이 공간
              k.sp.material.opacity = k.t > 0.8 ? Math.max(0, 1 - (k.t - 0.8) / 0.2) : 1;
              if (k.t >= 1) { scene_remove(k.sp); tokens.splice(i, 1); }
            }
            if (k.sp.parent) k.sp.visible = k.sp.position.z < c;
          }
          for (let i = atps.length - 1; i >= 0; i--) {
            const a = atps[i]; a.t += dt * 0.8; a.sp.position.addScaledVector(a.d, dt * 0.18);
            a.sp.material.opacity = Math.max(0, 1 - a.t); a.sp.visible = a.sp.position.z < c;
            if (a.t >= 1) { scene_remove(a.sp); atps.splice(i, 1); }
          }
          // ATP 합성 효소 회전
          const w = run ? 6 : 0;
          syns.forEach((s) => { s.ph += w * dt; s.rot.rotation.y = s.ph; });
        },
      };
      function scene_remove(sp) { root.remove(sp); sp.material.dispose(); }
    },
  });
})();
