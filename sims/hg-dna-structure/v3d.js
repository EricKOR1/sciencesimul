/* hg-dna-structure · 3D DNA 이중 나선 (왓슨·크릭 모형)
   지름 2 nm · 한 바퀴 3.4 nm = 염기쌍 10개(0.34 nm 간격) · 역평행(5′→3′) · 주홈/부홈 · A–T 수소 결합 2개, G–C 3개 */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  /* ---------- DNA 이중 나선 공용 모형 (염기쌍 N개, 10염기쌍/바퀴, 0.34 nm/염기쌍, 지름 2 nm) ---------- */
  const BCOL = { A: 0x22c55e, T: 0xef4444, G: 0xeab308, C: 0x3b82f6 };   // 2D 차시와 같은 색
  const BHEX = { A: '#22c55e', T: '#ef4444', G: '#eab308', C: '#3b82f6' };
  const BTXT = { A: '#fff', T: '#fff', G: '#3b2f00', C: '#fff' };
  const BNAME = { A: '아데닌', T: '타이민', G: '구아닌', C: '사이토신' };
  const COMP = { A: 'T', T: 'A', G: 'C', C: 'G' };
  const PUR = { A: true, G: true, T: false, C: false };

  function makeHelix(THREE, root, o) {
    const N = o.N, RISE = 0.34, HALF = RISE / 2, R = 1, A = o.a || 0;
    const seq = o.seq, sec = seq.split('').map((c) => COMP[c]).join('');
    const Yv = new THREE.Vector3(0, 1, 0), v3 = new THREE.Vector3();
    const g = new THREE.Group(); root.add(g);
    const M = (c, ex) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.45, metalness: 0.05, transparent: true }, ex || {}));
    const matP = M(0xfb923c), matS = M(0x38bdf8), matSt = o.strandCols.map((c) => M(c, { roughness: 0.6 }));
    const backMats = [matP, matS, matSt[0], matSt[1]];
    let tw = 1, focus = 'all', sel = -1;
    const yOf = (i) => (i - (N - 1) / 2) * RISE;
    const ang = (y) => tw * (2 * Math.PI / 3.4) * y;
    const off = [-A, Math.PI + A];
    const pos = (k, y, r, out) => { const p = ang(y) + off[k]; return out.set(r * Math.cos(p), y, -r * Math.sin(p)); };
    const stickGeo = (r) => new THREE.CylinderGeometry(r, r, 1, 8);
    function place(m, a, b) { v3.subVectors(b, a); const L = Math.max(1e-4, v3.length()); m.position.addVectors(a, b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(Yv, v3.multiplyScalar(1 / L)); m.scale.set(1, L, 1); }
    function localStick(grp, p, q, r, mat) { const m = new THREE.Mesh(stickGeo(r), mat); place(m, new THREE.Vector3(...p), new THREE.Vector3(...q)); grp.add(m); return m; }

    /* 염기쌍마다 그룹 (로컬 +x = 첫째 가닥 쪽, 높이 y_i, 회전 = 그 높이의 나선 각) */
    const bps = [], sugars = [[], []];
    const GAP_HB = o.hbond !== false;
    for (let i = 0; i < N; i++) {
      const grp = new THREE.Group(); grp.position.y = yOf(i); g.add(grp);
      const L = [seq[i], sec[i]], mats = [], bm = [], ext = [];
      const lens = L.map((c) => (PUR[c] ? 0.78 : 0.5));
      [0, 1].forEach((k) => {
        const side = k === 0 ? 1 : -1, m = M(BCOL[L[k]], { roughness: 0.4 }); bm.push(m); mats.push(m);
        const len = lens[k], c = L[k], baseG = new THREE.Group(); grp.add(baseG);
        const xAt = (d) => side * (0.75 - d);                         // 바깥 끝에서 안쪽으로 d
        if (o.rings) {
          const hex = (d, rr) => { const h = new THREE.Mesh(new THREE.CylinderGeometry(rr, rr, 0.1, 6), m); h.position.x = xAt(d); baseG.add(h); };
          if (PUR[c]) { const pent = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 5), m); pent.position.x = xAt(0.2); pent.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2; baseG.add(pent); hex(len - 0.25, 0.25); }
          else hex(0.25, 0.25);
        } else {
          const b = new THREE.Mesh(new THREE.BoxGeometry(len, 0.13, 0.4), m); b.position.x = xAt(len / 2); baseG.add(b);
          if (PUR[c]) { const peg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.13, 0.16), m); peg.position.x = xAt(len + 0.03); peg.visible = false; baseG.add(peg); }
        }
        // 당 (오각형 블록) — 로컬에 고정
        const sp = [side * R * Math.cos(A), 0, R * Math.sin(A)];
        const s = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.12, 5), matS);
        s.position.set(...sp); s.quaternion.setFromUnitVectors(Yv, new THREE.Vector3(sp[0], 0, sp[2]).normalize()); grp.add(s); sugars[k][i] = s;
        // 당 – 염기 연결
        const cm = M(0x94a3b8, { roughness: 0.6 }); mats.push(cm);
        localStick(grp, [side * 0.75, 0, 0], sp, 0.035, cm);
      });
      // 수소 결합
      const inner0 = 0.75 - lens[0], inner1 = -0.75 + lens[1], n = (L[0] === 'A' || L[0] === 'T') ? 2 : 3;
      const hm = M(0xf8fafc, { roughness: 0.3, emissive: 0xaab4c8, emissiveIntensity: 0.5 }); mats.push(hm);
      const hbs = [];
      if (GAP_HB) for (let h = 0; h < n; h++) {
        const z = n === 2 ? (h - 0.5) * 0.2 : (h - 1) * 0.16;
        const c = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, inner0 - inner1, 8), hm);
        c.rotation.z = Math.PI / 2; c.position.set((inner0 + inner1) / 2, 0, z); grp.add(c); hbs.push(c);
      }
      bps.push({ grp, mats, bm, type: n === 2 ? 'AT' : 'GC', n, L, lens, hbs, gx: (inner0 + inner1) / 2 });
    }

    /* 뼈대: 인산(원) – 당(오각형) 사슬, 5′→3′ */
    const chains = [[], []];
    for (let k = 0; k < 2; k++) {
      const ord = [];
      if (k === 0) for (let i = 0; i < N; i++) { ord.push({ kind: 'P', i, y: yOf(i) - HALF }); ord.push({ kind: 'S', i, y: yOf(i) }); }
      else for (let i = N - 1; i >= 0; i--) { ord.push({ kind: 'P', i, y: yOf(i) + HALF }); ord.push({ kind: 'S', i, y: yOf(i) }); }
      const ch = chains[k]; ch.sticks = [];
      ord.forEach((n) => {
        n.k = k; n.p = new THREE.Vector3();
        if (n.kind === 'P') { n.mesh = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), matP); g.add(n.mesh); }
        else n.mesh = sugars[k][n.i];
        ch.push(n);
      });
      for (let m = 0; m < ch.length - 1; m++) { const s = new THREE.Mesh(stickGeo(0.045), matSt[k]); g.add(s); ch.sticks.push(s); }
    }
    /* 방향 화살표 (5′→3′) */
    const arrows = [], arrowMats = o.arrowCols ? o.arrowCols.map((c) => M(c)) : [];
    if (o.arrows) for (let k = 0; k < 2; k++) [5, 17, 29].forEach((m) => {
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.45, 14), arrowMats[k]); c.visible = false; g.add(c); arrows.push({ k, m, mesh: c });
    });
    const anchors = [new THREE.Object3D(), new THREE.Object3D()];

    function update() {
      bps.forEach((b, i) => { b.grp.rotation.y = ang(yOf(i)); });
      chains.forEach((ch, k) => {
        ch.forEach((n) => { pos(k, n.y, R, n.p); if (n.kind === 'P') n.mesh.position.copy(n.p); });
        ch.forEach((n, m) => { if (m < ch.length - 1) place(ch.sticks[m], n.p, ch[m + 1].p); });
      });
      arrows.forEach((a) => {
        const ch = chains[a.k], p = ch[a.m].p, q = ch[a.m + 1].p;
        a.mesh.position.addVectors(p, q).multiplyScalar(0.5);
        v3.subVectors(q, p).normalize(); a.mesh.quaternion.setFromUnitVectors(Yv, v3);
      });
    }
    function setOp(m, op) { m.opacity = op; m.depthWrite = op >= 1; }
    function applyFocus() {
      const kOp = focus === 'bases' ? 0.1 : 1;
      backMats.forEach((m) => setOp(m, kOp)); arrowMats.forEach((m) => setOp(m, kOp));
      bps.forEach((b, i) => {
        const dim = focus === 'back' || (focus === 'AT' && b.type !== 'AT') || (focus === 'GC' && b.type !== 'GC');
        b.mats.forEach((m) => setOp(m, dim ? 0.1 : 1));
        const on = i === sel;
        b.bm.forEach((m, k) => { m.emissive.setHex(on ? BCOL[b.L[k]] : 0x000000); m.emissiveIntensity = on ? 0.55 : 0; });
      });
    }
    update(); applyFocus();
    return {
      g, bps, chains, N, seq, sec, RISE, yOf, ang, pos, off, R, A, anchors, update, arrows,
      get tw() { return tw; },
      setTwist(v) { tw = Math.max(0, Math.min(1, v)); update(); },
      setFocus(f) { focus = f; applyFocus(); },
      get focus() { return focus; },
      select(i) {
        sel = i; applyFocus(); const b = bps[i];
        b.grp.add(anchors[0], anchors[1]);
        anchors[0].position.set(0.75 - b.lens[0] / 2, 0.02, 0); anchors[1].position.set(-0.75 + b.lens[1] / 2, 0.02, 0);
        return b;
      },
      setArrows(v) { arrows.forEach((a) => { a.mesh.visible = v; }); },
      M, stickGeo, place,
    };
  }

  /* 눈금자(치수선) 도우미 */
  function dimTools(THREE, parent) {
    const grp = new THREE.Group(); parent.add(grp);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffd34d });
    const Yv = new THREE.Vector3(0, 1, 0), tmp = new THREE.Vector3();
    function line(a, b, r) {
      const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = tmp.subVectors(B, A), L = d.length();
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r || 0.02, r || 0.02, L, 6), mat);
      m.position.copy(A).add(B).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(Yv, d.clone().normalize()); grp.add(m); return m;
    }
    return { grp, line, mat };
  }

  const PHONE = window.innerWidth < 600;
  const SEQ20 = 'ATGCCGTACGGATCCTAGCA';
  const SC = [0x2563eb, 0x7c3aed];                // 2D 이중 나선 스케치와 같은 가닥 색 (파랑 · 보라)
  window.SciSim3D.attach({
    title: 'DNA 이중 나선 3D 모형',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHONE ? 15.5 : 12.6, theta: 0.5, phi: 1.38, fov: 40, min: 5, max: 26, target: [0, PHONE ? 1.5 : 0, 0] },
    autoRotate: 0.25,
    build(ctx) {
      const { THREE, root, label, info, controls, orbit, camera } = ctx;
      const H = makeHelix(THREE, root, { N: 20, seq: SEQ20, a: 0.5, rings: true, strandCols: SC, arrows: true, arrowCols: [0x93c5fd, 0xc4b5fd] });
      let showDir = true, showGroove = true, showDim = false, selI = 3, faceT = 0;
      H.setArrows(true);

      /* 5′ / 3′ 이름표 */
      const c0 = H.chains[0], c1 = H.chains[1];
      const ends = [
        label('5′', c0[0].mesh, { color: '#2563eb', offset: [0, -0.3, 0] }), label('3′', c0[c0.length - 1].mesh, { color: '#2563eb', offset: [0, 0.34, 0] }),
        label('5′', c1[0].mesh, { color: '#7c3aed', offset: [0, 0.34, 0] }), label('3′', c1[c1.length - 1].mesh, { color: '#7c3aed', offset: [0, -0.3, 0] }),
      ];
      const sLab = label('가닥 1 →', c0[2 * 15 + 1].mesh, { color: 'rgba(37,99,235,.92)', offset: [0, 0.38, 0] });
      const sLab2 = label('← 가닥 2', c1[(19 - 4) * 2 + 1].mesh, { color: 'rgba(124,58,237,.92)', offset: [0, -0.38, 0] });

      /* 홈 (주홈 · 부홈): 나선을 따라 도는 띠 */
      const grooveMats = [new THREE.MeshStandardMaterial({ color: 0xfb7185, transparent: true, opacity: 0.55, roughness: 0.5 }), new THREE.MeshStandardMaterial({ color: 0x2dd4bf, transparent: true, opacity: 0.6, roughness: 0.5 })];
      const grooveMesh = [null, null], grooveG = new THREE.Group(); root.add(grooveG);
      function buildGroove() {
        [0, 1].forEach((w) => {
          if (grooveMesh[w]) { grooveG.remove(grooveMesh[w]); grooveMesh[w].geometry.dispose(); }
          if (H.tw < 0.05) { grooveMesh[w] = null; return; }
          const pts = [], y0 = H.yOf(0) - 0.1, y1 = H.yOf(19) + 0.1;
          for (let k = 0; k <= 90; k++) { const y = y0 + (y1 - y0) * k / 90, p = H.ang(y) + (w === 0 ? Math.PI / 2 : -Math.PI / 2); pts.push(new THREE.Vector3(0.93 * Math.cos(p), y, -0.93 * Math.sin(p))); }
          const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.075, 8, false), grooveMats[w]);
          grooveG.add(m); grooveMesh[w] = m;
        });
        grooveG.visible = showGroove;
      }
      const majA = new THREE.Object3D(), minA = new THREE.Object3D(); root.add(majA, minA);
      const majL = label('주홈 (넓은 홈)', majA, { color: 'rgba(225,29,72,.93)' }), minL = label('부홈 (좁은 홈)', minA, { color: 'rgba(13,148,136,.93)' });
      function placeGroove() {
        const ym = H.yOf(12), yn = H.yOf(7);
        let p = H.ang(ym) + Math.PI / 2; majA.position.set(1.12 * Math.cos(p), ym, -1.12 * Math.sin(p));
        p = H.ang(yn) - Math.PI / 2; minA.position.set(1.12 * Math.cos(p), yn, -1.12 * Math.sin(p));
      }

      /* 치수선: 한 바퀴 3.4 nm / 염기쌍 간격 0.34 nm / 지름 2 nm */
      const dim = dimTools(THREE, root);
      const xr = 2.1, y5 = H.yOf(5), y15 = H.yOf(15);
      dim.line([xr, y5, 0], [xr, y15, 0], 0.03);
      dim.line([xr - 0.16, y5, 0], [xr + 0.16, y5, 0], 0.03); dim.line([xr - 0.16, y15, 0], [xr + 0.16, y15, 0], 0.03);
      dim.line([-xr, H.yOf(9), 0], [-xr, H.yOf(10), 0], 0.03);
      dim.line([-xr - 0.16, H.yOf(9), 0], [-xr + 0.16, H.yOf(9), 0], 0.03); dim.line([-xr - 0.16, H.yOf(10), 0], [-xr + 0.16, H.yOf(10), 0], 0.03);
      const yd = H.yOf(0) - 0.75;
      dim.line([-1, yd, 0], [1, yd, 0], 0.03); dim.line([-1, yd - 0.15, 0], [-1, yd + 0.15, 0], 0.03); dim.line([1, yd - 0.15, 0], [1, yd + 0.15, 0], 0.03);
      const dl = (t, p) => { const l = label(t, p, { color: 'rgba(255,211,77,.95)', size: PHONE ? 12 : 13 }); l.el.style.color = '#1b2333'; return l; };
      const dimLabs = [dl('한 바퀴 3.4 nm<br>(염기쌍 10개)', [xr, y15 + 0.6, 0]), dl('염기쌍 간격<br>0.34 nm', [-xr, H.yOf(9.5) + 0.62, 0]), dl('지름 2 nm', [0, yd - 0.4, 0])];

      /* 염기쌍 고르기 → 수소 결합 개수 */
      const sA = label('', H.anchors[0], { size: 14, offset: [0, 0.4, 0] }), sB = label('', H.anchors[1], { size: 14, offset: [0, 0.4, 0] });
      const cen = new THREE.Object3D(); const hbL = label('', cen, { color: 'rgba(15,23,42,.92)', offset: [0, -0.5, 0] });
      function refresh() {
        const b = H.bps[selI], p = Math.round(H.tw * 100);
        sA.set(b.L[0]); sA.el.style.background = BHEX[b.L[0]]; sA.el.style.color = BTXT[b.L[0]];
        sB.set(b.L[1]); sB.el.style.background = BHEX[b.L[1]]; sB.el.style.color = BTXT[b.L[1]];
        hbL.set('수소 결합 ' + b.n + '개'); b.grp.add(cen); cen.position.set(b.gx, 0, 0);
        const twLine = H.tw > 0.97 ? '꼬임 완성: 한 바퀴 = 염기쌍 10개 = 3.4 nm' : '꼬임 ' + p + ' % (풀면 사다리)';
        info('<div style="max-width:' + (PHONE ? 215 : 245) + 'px"><b>염기쌍 ' + (selI + 1) + '번: ' + b.L[0] + '–' + b.L[1] + '</b> · 수소 결합 <b>' + b.n + '개</b><br>' +
          (PUR[b.L[0]] ? '퓨린(고리 2개)' : '피리미딘(고리 1개)') + ' + ' + (PUR[b.L[1]] ? '퓨린(고리 2개)' : '피리미딘(고리 1개)') + ' → 폭 2 nm<br>' +
          '<span style="color:#93c5fd">가닥 1</span>과 <span style="color:#c4b5fd">가닥 2</span>는 방향이 반대' + (PHONE ? '' : '(5′→3′ / 3′←5′)') + '<br>' + (H.tw > 0.97 ? '한 바퀴 = 10염기쌍 = 3.4 nm' : '꼬임 ' + p + ' %') + '</div>');
        ends.forEach((l) => l.show(showDir)); sLab.show(showDir); sLab2.show(showDir);
        dimLabs.forEach((l) => l.show(showDim)); dim.grp.visible = showDim;
        dimLabs[0].set('한 바퀴 3.4 nm<br>(염기쌍 10개)'); dimLabs[0].show(showDim && H.tw > 0.97);
        majL.show(false); minL.show(false);
      }
      function pickPair(i) { selI = i; H.select(i); refresh(); }

      const twR = controls.range('꼬임', 0, 100, 1, 100, (v) => { H.setTwist(v / 100); buildGroove(); placeGroove(); if (v < 5) faceT = 1.4; refresh(); }, (v) => v + ' %');
      controls.segment('강조', [{ value: 'all', label: '전체' }, { value: 'AT', label: 'A–T' }, { value: 'GC', label: 'G–C' }], 'all', (v) => {
        H.setFocus(v);
        const want = v === 'all' ? null : v;
        if (want && H.bps[selI].type !== want) { const j = H.bps.findIndex((b, i) => b.type === want && i >= 3); pickPair(j >= 0 ? j : H.bps.findIndex((b) => b.type === want)); }
        else refresh();
      });
      controls.range('염기쌍', 1, 20, 1, selI + 1, (v) => pickPair(v - 1), (v) => v + '번');
      const tog = (txt, get, set) => { const b = controls.button(txt, () => { set(!get()); b.classList.toggle('on', get()); refresh(); }); b.classList.toggle('on', get()); return b; };
      tog('↗ 방향', () => showDir, (v) => { showDir = v; H.setArrows(v); });
      tog('🌀 홈', () => showGroove, (v) => { showGroove = v; grooveG.visible = v; });
      tog('📏 치수', () => showDim, (v) => { showDim = v; });
      H.setFocus('all'); pickPair(selI); buildGroove(); placeGroove();

      /* 홈 이름표는 카메라를 향한 쪽에 있을 때만 */
      const cp = new THREE.Vector3();
      function facing(a) { const x = a.position.x, z = a.position.z, n = Math.hypot(x, z) || 1; return (x * camera.position.x + z * camera.position.z) / (n * Math.hypot(camera.position.x, camera.position.z) || 1) > 0.25; }

      function lessonTw() { try { const s = window.__sim && window.__sim.S; if (s && s.hx && typeof s.hx.tw === 'number' && s.hx.vis >= 1) return Math.max(0, Math.min(1, s.hx.tw)); } catch (e) {} return null; }

      { const t0 = lessonTw(); if (t0 != null) { H.setTwist(t0); twR.set(Math.round(t0 * 100)); buildGroove(); placeGroove(); refresh(); } }
      return {
        update(dt) {
          if (faceT > 0 && H.tw < 0.05) { faceT -= dt; const tgt = Math.round(orbit.theta / Math.PI) * Math.PI; orbit.theta += (tgt - orbit.theta) * Math.min(1, dt * 3); orbit.phi += (1.5 - orbit.phi) * Math.min(1, dt * 3); }
          const g = showGroove && H.tw > 0.2;
          majL.show(g && facing(majA)); minL.show(g && facing(minA));
        },
        sync() { const t = lessonTw(); if (t != null) { H.setTwist(t); twR.set(Math.round(t * 100)); buildGroove(); placeGroove(); refresh(); } },
      };
    },
  });
})();
