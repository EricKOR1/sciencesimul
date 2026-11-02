/* he-relative-age · 3D 지층 블록으로 보는 지질 사건의 순서
   '지층 누중의 법칙'(아래가 더 오래됨), '부정합'(기록이 끊긴 면), '관입'(관입한 암석이 더 젊음)을 입체 블록으로 확인해요.
   사건을 ①~⑤ 순서대로 하나씩 일으켜 보면서, 단면에서 어떤 것이 먼저 생겼는지 거꾸로 추리해 봐요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const XW = 3.4, ZD = 1.9, YT = 3.6, TILT = -17 * Math.PI / 180, YU = 2.05;
  const COLS = { base: 0x7d6b5d, A: 0xc9a46a, B: 0x8f6f5a, C: 0xe0cf9a, D: 0x6f8f77, E: 0xd7a37a, F: 0xa9bfd1 };
  const EVT = ['① 아래 지층 퇴적 (A→D)', '② 지층이 기울어짐', '③ 위쪽이 깎임 (침식)', '④ 새 지층 퇴적 (E→F)', '⑤ 마그마 관입 (암맥)'];
  const TXT = [
    '<b>지층 누중의 법칙</b>: 퇴적된 지층은 <b>아래에 있는 것이 더 오래됐어요</b>. 먼저 A가 쌓이고 그 위에 B, C, D가 차례로 쌓였어요.',
    '땅이 움직여 지층이 <b>기울어졌어요</b>. 지층이 쌓인 뒤에 일어난 사건이에요.',
    '기울어진 지층의 윗부분이 <b>침식</b>으로 깎여 평평해졌어요. 이 시기의 기록은 남지 않아요.',
    '깎인 면 위에 새 지층 E, F가 쌓였어요. 기울어진 지층과 수평 지층의 경계가 <b>부정합면</b>이에요.',
    '마그마가 모든 지층을 <b>뚫고 들어가</b> 굳었어요. 뚫린 지층보다 <b>더 젊어요</b>. 속에는 떼어 낸 <b>포획암</b>도 있어요.',
  ];

  window.SciSim3D.attach({
    title: '지층과 지질 사건 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    levels: [0, 1, 2],
    camera: { dist: PHONE ? 15 : 11, theta: 0.55, phi: 1.12, min: 5, max: 24, target: [0, 1.5, 0] },
    autoRotate: 0,
    build(ctx) {
      if (ctx.THREE.ColorManagement) ctx.THREE.ColorManagement.legacyMode = false;     // 색을 보이는 그대로(sRGB) 쓰도록 맞춰요
      const { THREE, root, label, info, controls } = ctx;
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.85, metalness: 0 }, o || {}));
      const grp = new THREE.Group(); root.add(grp);
      const floor = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 0.2, 64), std(0x2a3550)); floor.position.y = -0.12; root.add(floor);
      const clipP = (poly, a, b, c) => { const out = []; for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length], fp = a * p[0] + b * p[1] + c, fq = a * q[0] + b * q[1] + c; if (fp >= 0) out.push(p); if ((fp >= 0) !== (fq >= 0)) { const t = fp / (fp - fq); out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); } } return out; };
      const box = (poly) => { let q = clipP(poly, 1, 0, XW); q = clipP(q, -1, 0, XW); q = clipP(q, 0, 1, 0); q = clipP(q, 0, -1, YT); return q; };
      const rot = (poly, ang, cx, cy) => poly.map((p) => { const dx = p[0] - cx, dy = p[1] - cy; return [cx + dx * Math.cos(ang) - dy * Math.sin(ang), cy + dx * Math.sin(ang) + dy * Math.cos(ang)]; });
      const band = (y0, y1) => [[-12, y0], [12, y0], [12, y1], [-12, y1]];
      const ext = (poly, col) => { const sh = new THREE.Shape(); poly.forEach((p, i) => (i ? sh.lineTo(p[0], p[1]) : sh.moveTo(p[0], p[1]))); sh.closePath(); const g = new THREE.ExtrudeGeometry(sh, { depth: ZD * 2, bevelEnabled: false, curveSegments: 2 }); g.translate(0, 0, -ZD); const m = new THREE.Mesh(g, std(col, { transparent: true, opacity: 1 })); m.castShadow = m.receiveShadow = true; return m; };
      const LB = { A: label('A', [0, 0, 0], { size: 13 }), B: label('B', [0, 0, 0], { size: 13 }), C: label('C', [0, 0, 0], { size: 13 }), D: label('D', [0, 0, 0], { size: 13 }), E: label('E', [0, 0, 0], { size: 13 }), F: label('F', [0, 0, 0], { size: 13 }),
        un: label('부정합면', [0, 0, 0], { size: 12.5, color: 'rgba(150,40,40,.92)' }), dk: label('암맥 (가장 젊음)', [0, 0, 0], { size: 12.5, color: 'rgba(150,30,30,.92)' }), xe: label('포획암', [0, 0, 0], { size: 12 }), old: label('오래됨 ↓', [-XW - 0.5, 0.6, ZD], { size: 12 }), yng: label('젊음 ↑', [-XW - 0.5, 3.0, ZD], { size: 12 }) };
      let stage = 4, fresh = [], fadeT = 1, play = false, pt = 0;
      function rebuild(s, anim) {
        while (grp.children.length) { const c = grp.children.pop(); c.geometry.dispose(); }
        fresh = []; Object.values(LB).forEach((l) => l.show(false));
        const bands = [['base', -6, 0.9], ['A', 0.9, 1.5], ['B', 1.5, 2.1], ['C', 2.1, 2.75], ['D', 2.75, 3.4]];
        const place = (k, poly, key) => { const q = box(poly); if (q.length < 3) return null; const m = ext(q, COLS[key]); grp.add(m); return m; };
        const lbl = {};
        const centroid = (q) => { let x = 0, y = 0; q.forEach((p) => { x += p[0]; y += p[1]; }); return [x / q.length, y / q.length]; };
        bands.forEach((b, i) => {
          let poly = band(b[1], b[2]);
          if (s >= 1) poly = rot(poly, TILT, 0, 1.6);
          if (s >= 2) poly = clipP(poly, 0, -1, YU);
          if (s === 0) { const q = box(band(b[1], Math.min(b[2], YT))); }
          const q = box(poly); if (q.length < 3) return;
          const m = ext(q, COLS[b.key || b[0]]); grp.add(m); if (anim && ((s === 0 && i > 0) || (s === 1 && false))) fresh.push(m);
          if (b[0] !== 'base' && LB[b[0]]) { const c = centroid(q); lbl[b[0]] = [c[0] + (s >= 1 ? 0.8 : 0), c[1], ZD]; }
        });
        if (s >= 3) { [['E', YU, 2.7], ['F', 2.7, 3.35]].forEach(([k, y0, y1]) => { const q = box(band(y0, y1)); const m = ext(q, COLS[k]); grp.add(m); if (anim && s === 3) fresh.push(m); lbl[k] = [-XW * 0.55, (y0 + y1) / 2, ZD]; }); }
        let dkM = null;
        if (s >= 4) {
          const m = std(0xb2343a, { emissive: 0x3d0808, emissiveIntensity: 0.5, roughness: 0.55, transparent: true, opacity: 1 });
          dkM = new THREE.Mesh(new THREE.BoxGeometry(0.44, YT - 0.02 + 0.02, ZD * 2 + 0.03), m); dkM.position.set(1.35, (YT) / 2, 0); grp.add(dkM); if (anim) fresh.push(dkM);
          [[1.35, 1.0, 0.0, 0.2, 0xc9a46a], [1.32, 1.75, 0.5, 0.17, 0x8f6f5a], [1.4, 2.4, -0.4, 0.15, 0xe0cf9a]].forEach((x) => { const xm = new THREE.Mesh(new THREE.DodecahedronGeometry(x[3], 0), std(x[4], { roughness: 0.9 })); xm.position.set(x[0], x[1], ZD + 0.0); xm.position.z = ZD * 2 / 2 + 0.02; xm.scale.z = 0.4; grp.add(xm); });
          lbl.dk = [1.35, YT + 0.35, 0]; lbl.xe = [1.35, 1.75, ZD + 0.1];
        }
        Object.keys(lbl).forEach((k) => { const L = LB[k]; if (L) { L.obj = lbl[k]; L.show(true); } });
        if (s >= 3) { LB.un.obj = [XW * 0.75, YU, ZD]; LB.un.show(true); }
        if (s === 0 || s === 4 && false) { LB.old.show(true); LB.yng.show(true); }
        if (s >= 3) { LB.old.show(false); LB.yng.show(false); }
        if (s === 0) { LB.old.show(true); LB.yng.show(true); }
        info(TXT[s]);
        fadeT = anim ? 0 : 1;
      }
      const rg = controls.range('사건', 1, 5, 1, stage + 1, (v) => { stage = v - 1; play = false; bP.textContent = '▶ 차례로 보기'; rebuild(stage, true); }, (v) => EVT[v - 1]);
      const bP = controls.button('▶ 차례로 보기', () => { play = !play; bP.textContent = play ? '⏸ 멈춤' : '▶ 차례로 보기'; if (play) { stage = 0; rg.set(1); rebuild(0, true); pt = 0; } });
      rebuild(stage, false);
      return {
        update(dt) {
          if (fadeT < 1) { fadeT = Math.min(1, fadeT + dt * 1.6); fresh.forEach((m) => { m.material.opacity = fadeT; if (m.scale) m.scale.y = 0.2 + 0.8 * fadeT; }); }
          if (play) { pt += dt; if (pt > 2.6) { pt = 0; if (stage < 4) { stage++; rg.set(stage + 1); rebuild(stage, true); } else { play = false; bP.textContent = '▶ 차례로 보기'; } } }
        },
        sync() {},
      };
    },
  });
})();
