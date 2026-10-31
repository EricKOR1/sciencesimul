/* h1-dna · 3D DNA 이중 나선 모형
   당(오각형)–인산(원) 뼈대가 바깥, 염기쌍(A–T, G–C)이 안쪽. 꼬임을 풀어 사다리로 보고, 10염기쌍 = 한 바퀴를 세어 봐요. */
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
  window.SciSim3D.attach({
    title: 'DNA 이중 나선 3D 모형',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHONE ? 14.5 : 10.6, theta: 0.5, phi: 1.38, fov: 40, min: 5, max: 26, target: [0, PHONE ? 1.4 : 0, 0] },
    autoRotate: 0.3,
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      const H = makeHelix(THREE, root, { N: 20, seq: SEQ20, a: 0, rings: false, strandCols: [0x94a3b8, 0x94a3b8] });
      let showTurn = false, selI = 2, animDir = 0, faceT = 0;

      /* 한 바퀴 표시: 염기쌍 10개 눈금 */
      const dim = dimTools(THREE, root); dim.grp.visible = false;
      const xr = 2.0, y5 = H.yOf(5), y15 = H.yOf(15);
      dim.line([xr, y5, 0], [xr, y15, 0], 0.03);
      for (let i = 5; i <= 15; i++) dim.line([xr - 0.14, H.yOf(i), 0], [xr + 0.14, H.yOf(i), 0], i === 5 || i === 15 ? 0.03 : 0.018);
      const turnLab = label('', [xr, y15 + 0.55, 0], { color: 'rgba(255,211,77,.95)', size: PHONE ? 12 : 13 });
      turnLab.el.style.color = '#1b2333'; turnLab.show(false);

      /* 이름표 */
      const sA = label('', H.anchors[0], { size: 14, offset: [0, 0.42, 0] }), sB = label('', H.anchors[1], { size: 14, offset: [0, 0.42, 0] });
      const strLab0 = label('한 가닥', H.chains[0][2 * 16 + 1].mesh, { color: 'rgba(100,116,139,.92)', offset: [0, 0.38, 0] });
      const strLab1 = label('반대쪽 가닥', H.chains[1][(19 - 3) * 2 + 1].mesh, { color: 'rgba(100,116,139,.92)', offset: [0, -0.38, 0] });
      const tipLab = label('당–인산 뼈대', H.chains[0][2 * 14 + 1].mesh, { color: 'rgba(180,83,9,.92)', offset: [0, 0.38, 0] });

      function pickPair() {
        const b = H.select(selI);
        sA.set(b.L[0]); sA.el.style.background = BHEX[b.L[0]]; sA.el.style.color = BTXT[b.L[0]];
        sB.set(b.L[1]); sB.el.style.background = BHEX[b.L[1]]; sB.el.style.color = BTXT[b.L[1]];
        refresh();
      }
      function refresh() {
        const p = Math.round(H.tw * 100), b = H.bps[selI];
        const lead = H.tw > 0.97 ? '꼬여 있어요: <b>염기쌍 10개 = 한 바퀴</b>' : H.tw < 0.03 ? '풀면 <b>사다리</b>: 염기쌍이 가로대예요.' : '꼬임 <b>' + p + ' %</b> (풀수록 사다리)';
        info('<div style="max-width:' + (PHONE ? 200 : 235) + 'px"><b>DNA 이중 가닥</b><br>바깥: <span style="color:#7dd3fc">당</span>(오각형)–<span style="color:#fdba74">인산</span>(원) 뼈대<br>안쪽: 염기쌍 <b>' + b.L[0] + '–' + b.L[1] + '</b> (' + BNAME[b.L[0]] + '–' + BNAME[b.L[1]] + ')<br>' + lead +
          '<br><span style="color:#22c55e">●</span>A <span style="color:#ef4444">●</span>T <span style="color:#eab308">●</span>G <span style="color:#3b82f6">●</span>C</div>');
        turnLab.set(H.tw > 0.97 ? '염기쌍 10개 = 한 바퀴<br>(약 3.4 nm)' : '꼬임 ' + p + ' %');
        tipLab.show(H.focus !== 'bases');
      }

      const twR = controls.range('꼬임', 0, 100, 1, 100, (v) => { animDir = 0; H.setTwist(v / 100); if (v < 5) faceT = 1.4; refresh(); }, (v) => v + ' %');
      const animB = controls.button('🔓 풀기', () => { animDir = H.tw > 0.5 ? -1 : 1; });
      controls.segment('강조', [{ value: 'all', label: '전체' }, { value: 'back', label: '뼈대' }, { value: 'bases', label: '염기쌍' }], 'all', (v) => { H.setFocus(v); refresh(); });
      controls.range('염기쌍', 1, 20, 1, selI + 1, (v) => { selI = v - 1; pickPair(); }, (v) => v + '번');
      const turnB = controls.button('📏 한 바퀴 세기', () => { showTurn = !showTurn; turnB.classList.toggle('on', showTurn); dim.grp.visible = showTurn; turnLab.show(showTurn); });
      pickPair();

      function lessonTw() { // 읽기 전용: 2D 화면에서 DNA 모형을 꼬았는지
        try { const s = window.__sim && window.__sim.S; if (s && s.dna && s.dna.complete) return s.dna.twv > 0.5 ? 1 : 0; } catch (e) {}
        return null;
      }
      const lt = lessonTw(); if (lt != null) { H.setTwist(lt); twR.set(lt * 100); refresh(); }

      return {
        update(dt) {
          if (faceT > 0 && H.tw < 0.05) { faceT -= dt; const tgt = Math.round(orbit.theta / Math.PI) * Math.PI; orbit.theta += (tgt - orbit.theta) * Math.min(1, dt * 3); orbit.phi += (1.5 - orbit.phi) * Math.min(1, dt * 3); }
          if (animDir) {
            const v = Math.max(0, Math.min(1, H.tw + animDir * dt * 0.45));
            H.setTwist(v); twR.set(Math.round(v * 100)); refresh();
            if (v <= 0 || v >= 1) { animDir = 0; if (v <= 0) faceT = 1.4; }
          }
          animB.textContent = H.tw > 0.5 || animDir > 0 ? '🔓 풀기' : '🌀 꼬기';
          if (animDir < 0) animB.textContent = '🔓 푸는 중…'; else if (animDir > 0) animB.textContent = '🌀 꼬는 중…';
        },
        sync() { const t = lessonTw(); if (t != null) { animDir = 0; H.setTwist(t); twR.set(t * 100); refresh(); } },
      };
    },
  });
})();
