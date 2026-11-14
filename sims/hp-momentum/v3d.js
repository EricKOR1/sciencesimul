/* hp-momentum · 3D 작용 반작용과 운동량 보존
   2D 실험(window.__sim)의 장면을 그대로 입체로 보여 줘요: 🤝 줄로 연결된 두 수레(작용 반작용) · 🎱 일차원 충돌(합체/튕김) · 🚀 반동과 발사.
   질량·속도·충돌 유형은 옆 조작판이 정하고 3D는 따라가요. 위쪽 화살표는 각 물체의 운동량 p = mv, 아래 흰색 화살표는 총 운동량이에요.
   🏟️ 적용(자동차·당구공·수영 출발·대포·뉴턴의 요람)도 입체로 봐요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches), KD = PHN ? 1.3 : 1;
  const LV = () => (typeof window.SciSimLevel === 'number' ? window.SciSimLevel : 0);
  const TAU = Math.PI * 2, clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  function tools(THREE) {
    const V3 = THREE.Vector3, Y = new V3(0, 1, 0);
    const M = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0.1 }, o || {}));
    const glass = (c, op) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.2, metalness: 0, transparent: true, opacity: op == null ? 0.25 : op, depthWrite: false });
    function mkArrow(col, rad) {
      const g = new THREE.Group(), m = M(col, { roughness: 0.4 });
      const sh = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 1, 12), m), hd = new THREE.Mesh(new THREE.ConeGeometry(rad * 2.6, rad * 6, 16), m);
      g.add(sh, hd); g.userData = { sh, hd, rad }; return g;
    }
    function setArrow(g, a, b) {
      const d = new V3().subVectors(b, a), len = d.length(), { sh, hd, rad } = g.userData;
      if (len < 1e-3) { g.visible = false; return; }
      g.visible = true; const hl = Math.min(len * 0.5, rad * 6);
      sh.scale.y = Math.max(0.001, len - hl); sh.position.y = (len - hl) / 2;
      hd.scale.y = hl / (rad * 6); hd.position.y = len - hl / 2;
      g.position.copy(a); g.quaternion.setFromUnitVectors(Y, d.normalize());
    }
    function tube(pts, r, col, o, closed) {
      const c = new THREE.CatmullRomCurve3(pts, !!closed);
      return new THREE.Mesh(new THREE.TubeGeometry(c, Math.max(24, pts.length * 3), r, 8, !!closed), (o && o.basic) ? new THREE.MeshBasicMaterial({ color: col, transparent: !!o.op, opacity: o.op || 1 }) : M(col, o));
    }
    function disc(r, col, y, op) { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 64), new THREE.MeshStandardMaterial({ color: col, roughness: 0.9, transparent: op != null, opacity: op == null ? 1 : op })); m.rotation.x = -Math.PI / 2; m.position.y = y || 0; m.receiveShadow = true; return m; }
    function grid(w, d, step, col, y, op) {
      const pts = []; for (let x = -w / 2; x <= w / 2 + 1e-6; x += step) pts.push(x, 0, -d / 2, x, 0, d / 2); for (let z = -d / 2; z <= d / 2 + 1e-6; z += step) pts.push(-w / 2, 0, z, w / 2, 0, z);
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: op == null ? 0.3 : op })); l.position.y = y || 0; return l;
    }
    function arc(r, a0, a1, rad, col, n) { // xz 평면 위의 호
      const pts = []; n = n || 40; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; pts.push(new V3(r * Math.cos(a), 0, r * Math.sin(a))); }
      return tube(pts, rad, col);
    }
    return { V3, Y, M, glass, mkArrow, setArrow, tube, disc, grid, arc };
  }
  const f1 = (n) => (Math.round(n * 10) / 10).toFixed(1), f2 = (n) => (Math.round(n * 100) / 100).toFixed(2);
  const sg = (n, d) => { d = d == null ? 1 : d; const s = Math.round(n * Math.pow(10, d)) / Math.pow(10, d); return (s > 0 ? '+' : s < 0 ? '−' : '') + Math.abs(s).toFixed(d); };
  const GUN = { M: 4.0, m: 0.010, v: 400 }, SPACE = { M: 80, m: 2, v: 3 }, ROCKET = { mdot: 50, u: 2000 };
  window.SciSim3D.attach({
    title: '작용 반작용과 운동량 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대 · 값은 옆 조작판에서 바꿔요',
    camera: { dist: 12 * KD, theta: 0.3, phi: 1.1, min: 4, max: 30, target: [5, 0.8, 0] },
    autoRotate: 0,
    levels: [0, 1, 2, 3],
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      const { V3, M, mkArrow, setArrow } = tools(THREE);
      const sim = () => ctx.lesson();
      const BA = 0x3867f4, BB = 0xf2873a;
      /* 트랙 */
      const track = new THREE.Group(); root.add(track);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(10.8, 0.16, 1.6), ctx.mats.metal('aluminium', { brushed: true, repeat: 6 })); rail.position.set(5, -0.08, 0); rail.receiveShadow = true; track.add(rail);
      for (let m = 0; m <= 10; m++) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.2), M(0x475569)); t.position.set(m, 0.01, 0.7); track.add(t); }
      const tickL = [0, 2, 4, 6, 8, 10].map((m) => label(String(m), [m, 0, 1.0], { color: '#475569', size: 11 }));
      const lUnit = label('미터(m)', [10.2, 0, 1.3], { color: '#475569', size: 11 });
      [0, 10].forEach((x) => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 1.6), ctx.mats.rubber(0x2a2f38)); b.position.set(x === 0 ? -0.45 : 10.45, 0.17, 0); track.add(b); });
      /* 물체 만들기: 수레 · 사람 · 총 · 공구 */
      function mkBody(kind, col) {
        const g = new THREE.Group(); let body;
        if (kind === 'cart') {
          body = new THREE.Mesh(new THREE.BoxGeometry(1, 0.3, 0.85), ctx.mats.plastic(col, { roughness: 0.22 })); body.position.y = 0.3; g.add(body);
          [-0.3, 0.3].forEach((x) => [-0.46, 0.46].forEach((z) => { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.1, 28), ctx.mats.rubber(0x15181e)); w.rotation.x = Math.PI / 2; w.position.set(x, 0.12, z); g.add(w); }));
          const load = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1, 0.6), ctx.mats.plastic(col, { roughness: 0.4 })); load.material.color.offsetHSL(0, 0, -0.12); g.add(load); g.userData.load = load;
        } else if (kind === 'person') {
          body = new THREE.Mesh(new THREE.CapsuleGeometry ? new THREE.CapsuleGeometry(0.28, 0.9, 6, 14) : new THREE.CylinderGeometry(0.28, 0.28, 1.2, 14), M(col, { roughness: 0.5 })); body.position.y = 0.95; g.add(body);
          const hd = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12), M(0xf3cfa8)); hd.position.y = 1.85; g.add(hd);
          const sk = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.3), ctx.mats.metal('steel')); sk.position.y = 0.03; g.add(sk);
        } else if (kind === 'gun') {
          body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 0.5), ctx.mats.metal(0x4d5a78, { roughness: 0.35 })); body.position.y = 0.55; g.add(body);
          const br = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.14, 0.14), ctx.mats.metal('iron')); br.position.set(1.0, 0.6, 0); g.add(br);
          [-0.5, 0.5].forEach((x) => { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.1, 28), ctx.mats.rubber(0x15181e)); w.rotation.x = Math.PI / 2; w.position.set(x, 0.16, 0.3); g.add(w); const w2 = w.clone(); w2.position.z = -0.3; g.add(w2); });
        } else if (kind === 'astro') {
          body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.5), M(0xe8edf6, { roughness: 0.5 })); body.position.y = 1.0; g.add(body);
          const hd = new THREE.Mesh(new THREE.SphereGeometry(0.3, 18, 14), M(0xf4f6fb)); hd.position.y = 1.7; g.add(hd);
          const vs = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), M(0x2f4a8a)); vs.position.set(0.12, 1.72, 0.0); g.add(vs);
        } else if (kind === 'tool') {
          body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.22, 0.3), M(0xffd447, { metalness: 0.3 })); body.position.y = 1.2; g.add(body);
        } else if (kind === 'bullet') {
          body = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), ctx.mats.metal('brass')); body.position.y = 0.6; g.add(body);
        }
        body.castShadow = true; g.userData.body = body; root.add(g); return g;
      }
      const bodies = {};
      const gB = (kind, who) => { const k = kind + who; return bodies[k] || (bodies[k] = mkBody(kind, who === 'A' ? BA : BB)); };
      const cA = gB('cart', 'A'), cB = gB('cart', 'B'), pL = gB('person', 'A'), pR = gB('person', 'B'), gun = gB('gun', 'A'), bul = gB('bullet', 'B'), ast = gB('astro', 'A'), tool = gB('tool', 'B');
      /* 줄 + 센서 */
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 10), ctx.mats.fabric(0x8a6a44, { repeat: 2 })); rope.rotation.z = Math.PI / 2; root.add(rope);
      const sens = [0, 1].map(() => { const s = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), M(0x1f2937)); root.add(s); return s; });
      /* 운동량 화살표 */
      const aA = mkArrow(0x3867f4, 0.06), aB = mkArrow(0xf2873a, 0.06), aT = mkArrow(0x14a058, 0.07), fA = mkArrow(0x3867f4, 0.07), fB = mkArrow(0xf2873a, 0.07); root.add(aA, aB, aT, fA, fB);
      const lA = label('', aA, { color: '#2f56d6', size: 12 }), lB = label('', aB, { color: '#d9561f', size: 12 }), lT = label('', aT, { color: '#0b6b39', size: 12 });
      const lnA = label('', cA, { color: '#3867f4', size: 12 }), lnB = label('', cB, { color: '#d9561f', size: 12 });
      const lfA = label('', fA, { color: '#2f56d6', size: 12 }), lfB = label('', fB, { color: '#d9561f', size: 12 });
      const tag = label('', [5, 3.2, 0], { color: '#26324a', size: 13 });
      let demo = { p: 0, on: false };
      const cur = { mode: '', scene: '' };
      function show(list, on) { list.forEach((l) => l.show(on)); }
      function setMode(mode, scene) {
        const key = mode + '|' + scene; if (key === cur.key) return; cur.key = key;
        apShow(mode === 'apply' ? scene : '');
        const rc = mode === 'recoil';
        Object.values(bodies).forEach((b) => (b.visible = false));
        track.visible = mode !== 'apply' && !(rc && scene === 'rocket') && mode !== 'x'; rope.visible = false; sens.forEach((s) => (s.visible = false));
        show(tickL, track.visible); lUnit.show(track.visible);
        [lA, lB, lT, lnA, lnB, lfA, lfB, tag].forEach((l) => l.show(false));
        [aA, aB, aT, fA, fB].forEach((a) => (a.visible = false));
        Object.keys(PLS).forEach((k) => { if (PLS[k].row) PLS[k].row.style.display = (k === mode && !(rc && scene === 'rocket')) ? '' : 'none'; });
        if (mode === 'pair') Object.assign(orbit, { tx: 4, ty: 0.9, tz: 0, phi: 1.1, theta: 0.2, dist: 8.5 * KD });
        else if (mode === 'collide') Object.assign(orbit, { tx: 5, ty: 0.9, tz: 0, phi: 1.1, theta: 0.2, dist: 9.5 * KD });
        else if (rc) Object.assign(orbit, { tx: 5, ty: 1.2, tz: 0, phi: 1.15, theta: 0.2, dist: 10 * KD });
        else if (mode !== 'apply') orbit.dist = 10 * KD;
      }
      function arrows(items, tot, base, f, showTot) {   // items: [[arrow, label, x, p, y, text]]
        items.forEach(([ar, lb, x, p, y, txt]) => { setArrow(ar, new V3(x, y, 0), new V3(x + p * f, y, 0)); lb.obj = [x + p * f * 0.5, y, 0]; lb.off = [0, 0.3, 0]; lb.set(txt); lb.show(Math.abs(p) > 0.05); });
        if (showTot) { setArrow(aT, new V3(base, 0.25, 1.5), new V3(base + tot * f, 0.25, 1.5)); lT.obj = [base + tot * f * 0.5, 0.25, 1.5]; lT.off = [0, 0.35, 0]; lT.set('총 운동량 ' + sg(tot, 2)); lT.show(true); if (Math.abs(tot) < 0.05) { aT.visible = false; lT.set('총 운동량 0'); lT.obj = [base, 0.25, 1.5]; } }
      }
      const ez = (x) => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
      /* ===== 🎱 일차원 충돌 ===== */
      function collide(S) {
        const o = S.co; if (!o || !o.run) return; const c = o.run;
        let xA = c.xA, xB = c.xB, vA = c.cvA, vB = c.cvB, joined = c.joined, post = c.st === 'after' || c.st === 'done';
        const T0 = c.T0, TP = 1.6;
        if (demo.on && (c.st === 'ready' || c.st === 'done')) {   // ▶ 재생: 지금 값으로 충돌을 되풀이
          const t = demo.p * (T0 + TP);
          if (t < T0 || !c.willHit) { xA = c.xAc - c.vA * (T0 - t); xB = c.xBc - c.vB * (T0 - t); vA = c.vA; vB = c.vB; post = !c.willHit && t >= T0; joined = false; }
          else { const q = t - T0; vA = c.v2A; vB = c.v2B; post = true; joined = c.type === 'stick'; xA = c.xAc + vA * q; xB = c.xBc + vB * q; if (joined) xB = xA + c.D0; }
          xA = clamp(xA, c.wA / 2, c.len - c.wA / 2); xB = clamp(xB, c.wB / 2, c.len - c.wB / 2);
          if (joined) { xA = Math.min(xA, c.len - c.wB / 2 - c.D0); xB = xA + c.D0; }
        }
        cA.visible = cB.visible = true;
        [[cA, xA, c.mA, c.wA], [cB, xB, c.mB, c.wB]].forEach(([g, x, m, w]) => { g.position.set(x, 0, 0); g.userData.body.scale.set(w * 0.9, 1, 1); g.children.forEach((ch) => { if (ch !== g.userData.body && ch !== g.userData.load && ch.geometry && ch.geometry.type === 'CylinderGeometry') ch.scale.set(1, 1, 1); }); const lh = 0.25 + 0.2 * m; g.userData.load.scale.set(w * 0.62, lh, 1); g.userData.load.position.y = 0.45 + lh / 2; });
        const pA = c.mA * vA, pB = c.mB * vB, yA = 0.45 + 0.25 + 0.2 * c.mA + 0.5, yB = 0.45 + 0.25 + 0.2 * c.mB + 1.0, f = 0.35;
        arrows([[aA, lA, xA, pA, yA, 'pA ' + sg(pA, 1)], [aB, lB, xB, pB, yB, 'pB ' + sg(pB, 1)]], pA + pB, 1, f, true);
        lnA.set('A ' + f1(c.mA) + ' kg'); lnB.set('B ' + f1(c.mB) + ' kg'); lnA.off = [0, 0.3, 0.7]; lnB.off = [0, 0.3, 0.7]; lnA.show(true); lnB.show(true);
        const tn = c.type === 'stick' ? '합체' : '튕김', pb = c.mA * c.vA + c.mB * c.vB, pa = c.mA * c.v2A + c.mB * c.v2B;
        const kb = 0.5 * c.mA * c.vA * c.vA + 0.5 * c.mB * c.vB * c.vB, ka = 0.5 * c.mA * c.v2A * c.v2A + 0.5 * c.mB * c.v2B * c.v2B;
        tag.show(!c.willHit); tag.obj = [5, 3.4, 0]; tag.set('⚠ A가 B를 따라잡지 못해요 (충돌 없음)');
        info('<b>🎱 마찰 없는 트랙 · ' + tn + ' 충돌</b><br>A ' + f1(c.mA) + ' kg · ' + sg(c.vA, 1) + ' m/s &nbsp; B ' + f1(c.mB) + ' kg · ' + sg(c.vB, 1) + ' m/s<br>' + (c.willHit && !c.rec ? '총 운동량 전 ' + sg(pb, 2) + ' kg·m/s → 후 ? (▶ 충돌 시키기로 측정해요)<br>운동 에너지 전 ' + f2(kb) + ' J' : c.willHit ? '총 운동량 전 ' + sg(pb, 2) + ' → 후 ' + sg(pa, 2) + ' kg·m/s<br>운동 에너지 ' + f2(kb) + ' → ' + f2(ka) + ' J' + (c.type === 'stick' ? ' (일부는 열 등으로)' : ' (거의 보존)') : 'A가 B보다 느려서 부딪히지 않아요. A의 속도를 B보다 크게 해 보세요.') + '<br><span style="opacity:.8">질량·속도·충돌 유형은 옆 조작판에서 바꿔요.</span>');
      }
      /* ===== 🤝 줄로 연결된 두 수레 ===== */
      function pair(S) {
        const p = S.pr; if (!p) return;
        let xA = p.xA, xB = p.xB, st = p.st;
        const aA_ = p.F / p.mA, aB_ = p.F / p.mB, tEnd = Math.sqrt(2 * (6 - 2.2) / (aA_ + aB_));
        let vA = p.vA, vB = p.vB;
        if (demo.on && (st === 'ready' || st === 'done')) {
          const t = Math.min(1, demo.p / 0.85) * tEnd;
          xA = 1 + 0.5 * aA_ * t * t; xB = 7 - 0.5 * aB_ * t * t; vA = aA_ * t; vB = -aB_ * t; st = demo.p > 0.005 ? 'pull' : 'ready'; if (demo.p >= 0.85) st = 'done';
        }
        cA.visible = cB.visible = true;
        [[cA, xA, p.mA], [cB, xB, p.mB]].forEach(([g, x, m]) => { g.position.set(x, 0, 0); g.userData.body.scale.set(1.2, 1, 1); const lh = 0.2 + 0.18 * m; g.userData.load.scale.set(0.9, lh, 1); g.userData.load.position.y = 0.45 + lh / 2; });
        const sa = xA + 0.6 + 0.15, sb = xB - 0.6 - 0.15, taut = st === 'pull' || st === 'done';
        sens[0].visible = sens[1].visible = true; sens[0].position.set(sa, 0.5, 0); sens[1].position.set(sb, 0.5, 0);
        rope.visible = true; rope.scale.y = Math.max(0.01, sb - sa - 0.3); rope.position.set((sa + sb) / 2, taut ? 0.5 : 0.42, 0);
        const fl = p.F * 0.14;
        if (taut) { setArrow(fA, new V3(sa + 0.15, 0.95, 0.2), new V3(sa + 0.15 + fl, 0.95, 0.2)); setArrow(fB, new V3(sb - 0.15, 1.35, 0.2), new V3(sb - 0.15 - fl, 1.35, 0.2)); lfA.obj = [sa + 0.15 + fl / 2, 0.95, 0.2]; lfB.obj = [sb - 0.15 - fl / 2, 1.35, 0.2]; lfA.off = [0, 0.3, 0]; lfB.off = [0, 0.3, 0]; lfA.set('A가 받는 힘 ' + f1(p.F) + ' N'); lfB.set('B가 받는 힘 ' + f1(p.F) + ' N'); lfA.show(true); lfB.show(true); }
        else { fA.visible = fB.visible = false; lfA.show(false); lfB.show(false); }
        const mA_ = p.mA * vA, mB_ = p.mB * vB;
        arrows([[aA, lA, xA, mA_, 2.3, 'pA ' + sg(mA_, 1)], [aB, lB, xB, mB_, 2.3, 'pB ' + sg(mB_, 1)]], mA_ + mB_, 5, 0.35, taut);
        lnA.set('A ' + f1(p.mA) + ' kg'); lnB.set('B ' + f1(p.mB) + ' kg'); lnA.off = [0, 0.3, 0.7]; lnB.off = [0, 0.3, 0.7]; lnA.show(true); lnB.show(true);
        info('<b>🤝 줄로 연결된 두 수레 · 서로 당겨요</b><br>두 힘은 <b>크기가 같고 방향이 반대</b>이며 서로 다른 물체에 작용해요 (작용 반작용).<br>가속도 A ' + f2(aA_) + ' · B ' + f2(aB_) + ' m/s² (질량에 반비례) · 처음 총 운동량 0 → 총 운동량 ' + sg(mA_ + mB_, 1) + '<br><span style="opacity:.8">수레 질량과 당기는 세기는 옆 조작판에서 바꿔요.</span>');
      }
      /* ===== 🚀 반동과 발사 ===== */
      const rocket = new THREE.Group(); root.add(rocket); rocket.visible = false;
      { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 2.4, 24), ctx.mats.ceramic(0xe4e9f1)); rocket.add(b);
        const nose = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.0, 24), M(0xe2464b)); nose.position.y = 1.7; rocket.add(nose);
        const win = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), ctx.mats.glass({ tint: 0x6cb4ff, opacity: 0.85, extra: { depthWrite: true } })); win.position.set(0, 0.5, 0.5); rocket.add(win);
        [0, 2.1, 4.2].forEach((a) => { const fin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 0.6), M(0xe2464b)); fin.position.set(Math.cos(a) * 0.65, -1.0, Math.sin(a) * 0.65); fin.rotation.y = -a; rocket.add(fin); }); }
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1, 16), new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.85 })); flame.rotation.x = Math.PI; rocket.add(flame);
      const rA1 = mkArrow(0x14a058, 0.07), rA2 = mkArrow(0xc2410c, 0.07); root.add(rA1, rA2);
      const lr1 = label('로켓이 받는 힘 ↑', rA1, { color: '#0b6b39', size: 12 }), lr2 = label('가스가 받는 힘 ↓', rA2, { color: '#9a3412', size: 12 });
      rA1.visible = rA2.visible = false; lr1.show(false); lr2.show(false);
      function recoil(S, tm) {
        const r = S.rc; if (!r) return; const sc = r.scene;
        if (sc === 'rocket') {
          rocket.visible = true; rocket.position.set(5, 3 + (r.st === 'go' ? Math.sin(tm * 18) * 0.02 : 0), 0);
          const on = (r.st === 'go') || (demo.on && demo.p > 0.05), len = on ? 1.8 + Math.sin(tm * 30) * 0.15 : 0.01;
          flame.visible = on; flame.scale.set(1, len, 1); flame.position.y = -1.2 - len / 2;
          const sp = r.env === 'space';
          if (on) { setArrow(rA1, new V3(1.4, 3.2, 0), new V3(1.4, 4.7, 0)); setArrow(rA2, new V3(1.4, 2.4, 0), new V3(1.4, 0.9, 0)); lr1.obj = [1.4, 4.0, 0]; lr2.obj = [1.4, 1.7, 0]; lr1.show(true); lr2.show(true); } else { rA1.visible = rA2.visible = false; lr1.show(false); lr2.show(false); }
          [aA, aB, aT].forEach((a) => (a.visible = false));
          info('<b>🚀 ' + (sp ? '우주 공간' : '대기 중') + ' · 분사 가스 ' + ROCKET.mdot + ' kg/s × ' + ROCKET.u + ' m/s</b><br>가스를 밀어내는 힘 F = ' + ROCKET.mdot + ' × ' + ROCKET.u + ' = ' + String(ROCKET.mdot * ROCKET.u).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' N<br>가스가 로켓을 미는 반작용으로 나아가요. 대기 중이든 우주 공간이든 같아요.<br><span style="opacity:.8">환경과 분사하기는 옆 조작판에서 해요.</span>');
          return;
        }
        rocket.visible = false; rA1.visible = rA2.visible = false; lr1.show(false); lr2.show(false);
        const spec = { skate: { dur: 2.4, ts: 1 }, gun: { dur: 1.6, ts: 1 }, space: { dur: 2.0, ts: 10 } }[sc];
        let xL = r.xL, xR = r.xR, on = r.st !== 'ready';
        const x0L = sc === 'gun' ? 5.0 : sc === 'space' ? 5.0 : 4.6, x0R = sc === 'gun' ? 5.9 : sc === 'space' ? 5.7 : 5.4;
        if (demo.on && r.st !== 'go') { const t = demo.p < 0.15 ? 0 : Math.min(1, (demo.p - 0.15) / 0.7) * spec.dur; xL = Math.max(0.6, x0L + r.vL * t); xR = x0R + r.vR * t; if (sc === 'skate') xR = Math.min(9.4, xR); on = demo.p >= 0.15; }
        const kL = sc === 'skate' ? 'person' : sc === 'gun' ? 'gun' : 'astro', kR = sc === 'skate' ? 'person' : sc === 'gun' ? 'bullet' : 'tool';
        const bl = gB(kL, 'A'), br = gB(kR, 'B'); bl.visible = br.visible = true;
        const dispXR = sc === 'gun' ? Math.min(xR, 10.2) : sc === 'space' ? Math.min(xR, 10.2) : xR;
        bl.position.set(clamp(xL, 0.4, 10.6), 0, 0); br.position.set(dispXR, 0, 0);
        if (sc === 'skate') { const s = (m) => 0.8 + 0.25 * Math.sqrt(m / 60); bl.scale.setScalar(s(r.mL)); br.scale.setScalar(s(r.mR)); } else { bl.scale.setScalar(1); br.scale.setScalar(1); }
        if (sc === 'gun') { br.position.y = 0; br.position.z = 0; }
        if (sc === 'space') { bl.position.y = 0.4; br.position.y = 0.4; }
        const mL = sc === 'gun' ? GUN.M : sc === 'space' ? SPACE.M : r.mL, mR = sc === 'gun' ? GUN.m : sc === 'space' ? SPACE.m : r.mR;
        const nm = sc === 'skate' ? ['왼쪽 선수', '오른쪽 선수'] : sc === 'gun' ? ['총', '탄환'] : ['우주인', '공구'];
        lnA.set(nm[0] + ' ' + (sc === 'gun' ? f1(mL) : mL) + ' kg'); lnB.set(nm[1] + ' ' + (sc === 'gun' ? mR.toFixed(3) : mR) + ' kg'); lnA.obj = bl; lnB.obj = br; lnA.off = [0, 2.3, 0]; lnB.off = [0, sc === 'skate' ? 2.3 : 1.2, 0]; lnA.show(true); lnB.show(true);
        const vL = on ? r.vL : 0, vR = on ? (sc === 'gun' ? GUN.v : r.vR) : 0;
        const f = sc === 'skate' ? 0.9 : sc === 'gun' ? 6 : 8, pLm = on ? -r.Q : 0, pRm = on ? r.Q : 0;
        if (on) {
          const yv = sc === 'skate' ? 2.9 : 2.6;
          setArrow(aA, new V3(bl.position.x, yv, 0), new V3(bl.position.x + (sc === 'gun' ? vL * 0.9 : sc === 'space' ? vL * 10 * 0.9 : vL * 0.9), yv, 0)); lA.obj = [bl.position.x + vL * 0.45 * (sc === 'space' ? 10 : 1), yv, 0]; lA.off = [0, 0.3, 0]; lA.set((sc === 'skate' ? '' : '') + sg(vL, sc === 'space' ? 3 : 2) + ' m/s'); lA.show(true);
          if (sc === 'gun') { setArrow(aB, new V3(7.4, 3.4, 0), new V3(9.8, 3.4, 0)); lB.obj = [8.6, 3.4, 0]; lB.set('탄환 ' + sg(GUN.v, 0) + ' m/s'); lB.show(true); }
          else { setArrow(aB, new V3(br.position.x, yv, 0), new V3(br.position.x + vR * 0.9 * (sc === 'space' ? 10 : 1), yv, 0)); lB.obj = [br.position.x + vR * 0.45 * (sc === 'space' ? 10 : 1), yv, 0]; lB.set(sg(vR, sc === 'space' ? 3 : 2) + ' m/s'); lB.show(true); }
          lB.off = [0, 0.3, 0];
        } else { aA.visible = aB.visible = false; lA.show(false); lB.show(false); }
        aT.visible = false; lT.show(false);
        let t1;
        if (!on) t1 = '처음엔 두 물체가 정지해 있어서 총 운동량은 0이에요. 서로 밀면 총 운동량은 어떻게 될까요?';
        else if (sc === 'skate') t1 = '0 = ' + r.mL + ' × (' + sg(r.vL, 2) + ') + ' + r.mR + ' × (' + sg(r.vR, 2) + ')<br>속력의 비 = ' + r.mR + ' : ' + r.mL + ' (질량의 반비율) · 질량이 큰 선수일수록 속력이 작아요.';
        else if (sc === 'gun') t1 = '0 = ' + f1(GUN.M) + ' × (' + sg(r.vL, 2) + ') + ' + GUN.m.toFixed(3) + ' × (' + sg(GUN.v, 0) + ')<br>총의 반동 속력 = ' + f1(r.Q) + ' / ' + f1(GUN.M) + ' = ' + Math.abs(r.vL).toFixed(1) + ' m/s';
        else t1 = '0 = ' + SPACE.M + ' × (' + sg(r.vL, 3) + ') + ' + SPACE.m + ' × (' + sg(SPACE.v, 0) + ')<br>우주인의 반동 속력 = ' + r.Q + ' / ' + SPACE.M + ' = ' + Math.abs(r.vL).toFixed(3) + ' m/s (공기가 없어도 돼요) · ⏩ 10배 빠르게';
        info('<b>' + ({ skate: '⛸️ 스케이트 · 얼음판 10 m (마찰 없음)', gun: '🔫 총 쏘기', space: '👨‍🚀 우주 공간 (마찰·공기 없음)' }[sc]) + '</b><br>' + t1 + '<br><span style="opacity:.8">장면·질량은 옆 조작판에서 고르고 버튼을 눌러요.</span>');
      }

      /* ===== 🏟️ 적용 장면: 🚗 자동차 · 🎱 당구공 · 🏊 수영 출발 · 💥 대포 · 🔔 뉴턴의 요람 ===== */
      const gAp = new THREE.Group(); root.add(gAp); gAp.visible = false;
      const KC = 0.4, KB = 10 / 6, apG = {};
      const sgp = (n, d) => sg(n, d == null ? 0 : d);
      const bx = (w, h, d, col, o) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(col, o));
      { // 도로 · 당구대 · 물 · 요람 틀
        const road = new THREE.Group(); const rd = bx(10.8, 0.16, 3.2, 0x151a22, { roughness: 0.9, metalness: 0 }); rd.position.set(5, -0.08, 0); rd.receiveShadow = true; road.add(rd);
        for (let i = 0; i < 12; i++) { const d = bx(0.5, 0.02, 0.1, 0xf5d142, { roughness: 0.8 }); d.position.set(0.4 + i * 0.9, 0.01, 0); road.add(d); }
        const roadC = new THREE.Group(); const rc2 = bx(14, 0.16, 3.4, 0x151a22, { roughness: 0.9, metalness: 0 }); rc2.position.set(6.4, -0.08, 0); rc2.receiveShadow = true; roadC.add(rc2);
        for (let i = 0; i < 15; i++) { const d = bx(0.55, 0.02, 0.1, 0xf5d142, { roughness: 0.8 }); d.position.set(0 + i * 0.95, 0.01, 0); roadC.add(d); }
        apG.roadC = roadC; gAp.add(roadC);
        const table = new THREE.Group(); const tb = bx(10.8, 0.2, 3.2, 0x0b3d24, { roughness: 0.95, metalness: 0 }); tb.position.set(5, -0.1, 0); tb.receiveShadow = true; table.add(tb);
        [[5, 1.65, 10.8, 0.2], [5, -1.65, 10.8, 0.2], [-0.4, 0, 0.2, 3.5], [10.4, 0, 0.2, 3.5]].forEach(([x, z, w, d]) => { const r = bx(w, 0.3, d, 0x8a5a2b); r.position.set(x, 0.05, z); table.add(r); });
        const water = new THREE.Group(); const wt = new THREE.Mesh(new THREE.BoxGeometry(10.8, 0.9, 3.2), ctx.mats.liquid(0x3a98e0, { opacity: 0.58 })); wt.position.set(5, -0.45, 0); water.add(wt);
        const cr = new THREE.Group();
        apG.road = road; apG.table = table; apG.water = water; apG.cradle = cr; gAp.add(road, table, water, cr);
      }
      function mkCar(len, h, col, suv) {
        const g = new THREE.Group(), body = bx(len, h * 0.42, 0.62, col, { roughness: 0.3, metalness: 0.4 }); body.position.y = 0.16 + h * 0.21; body.castShadow = true; g.add(body);
        const cab = bx(len * (suv ? 0.72 : 0.5), h * 0.4, 0.56, col, { roughness: 0.3, metalness: 0.3 }); cab.material.color.offsetHSL(0, 0, -0.08); cab.position.set(-len * (suv ? 0.08 : 0.1), 0.16 + h * 0.42 + h * 0.2, 0); cab.castShadow = true; g.add(cab);
        const win = bx(len * (suv ? 0.74 : 0.52), h * 0.2, 0.575, 0x9ccbee, { roughness: 0.1 }); win.position.set(cab.position.x, cab.position.y + 0.02, 0); g.add(win);
        [-0.3, 0.3].forEach((fx) => [-0.32, 0.32].forEach((z) => { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.1, 28), ctx.mats.rubber(0x15181e)); w.rotation.x = Math.PI / 2; w.position.set(fx * len, 0.15, z); g.add(w); }));
        [-0.2, 0.2].forEach((z) => { const hl = bx(0.04, 0.07, 0.1, 0xfff3b0, { emissive: 0xaaa060 }); hl.position.set(len / 2, 0.16 + h * 0.2, z); g.add(hl); });
        return g;
      }
      const carA = mkCar(4 * KC, 0.55, 0x3867f4, false), carB = mkCar(5 * KC, 0.75, 0xe2464b, true); gAp.add(carA, carB);
      const ballA = new THREE.Mesh(new THREE.SphereGeometry(0.5, 28, 20), ctx.mats.plastic(0x3867f4, { roughness: 0.15 })), ballB = new THREE.Mesh(new THREE.SphereGeometry(0.5, 28, 20), ctx.mats.plastic(0xe2464b, { roughness: 0.15 }));
      [ballA, ballB].forEach((b) => { b.castShadow = true; const st = bx(0.1, 0.1, 1.02, 0xffffff, { roughness: 0.3 }); b.add(st); gAp.add(b); });
      const swimG = new THREE.Group(), platM = bx(1.8, 0.3, 1.2, 0x7a8aa6, { roughness: 0.5 }); platM.position.y = 0.05; platM.castShadow = true; swimG.add(platM); gAp.add(swimG);
      const swimmer = new THREE.Group(); { const sb = bx(1.1, 0.28, 0.46, 0xf2873a, { roughness: 0.5 }); sb.castShadow = true; swimmer.add(sb); const hd = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), M(0xf3cfa8)); hd.position.x = 0.62; swimmer.add(hd); const cap = bx(0.18, 0.06, 0.2, 0x2b3345); cap.position.x = 0.64; cap.position.y = 0.17; swimmer.add(cap); } gAp.add(swimmer);
      const cannonG = new THREE.Group(); { const cb = bx(1.3, 0.3, 0.9, 0x4d5a78, { metalness: 0.5, roughness: 0.4 }); cb.position.y = 0.4; cb.castShadow = true; cannonG.add(cb); const br = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 1.5, 20), M(0x2b3345, { metalness: 0.7, roughness: 0.35 })); br.rotation.z = -Math.PI / 2; br.position.set(0.55, 0.7, 0); br.castShadow = true; cannonG.add(br); [-0.5, 0.5].forEach((z) => { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.12, 22), M(0x1f2937)); w.rotation.x = Math.PI / 2; w.position.set(-0.1, 0.3, z); cannonG.add(w); }); } gAp.add(cannonG);
      const shell = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 10), ctx.mats.metal('brass')); gAp.add(shell);
      // 뉴턴의 요람
      const CRL = 3.2, CRY = 4.2, CRR = 0.45, CR_T = 0.5, CR_A0 = 0.62, crBalls = [], crStr = [];
      { const g = apG.cradle, fm = ctx.mats.metal('steel', { brushed: true });
        [-0.62, 0.62].forEach((z) => { const t = new THREE.Mesh(new THREE.BoxGeometry(5.6 * 1.2, 0.12, 0.12), fm); t.position.set(0, CRY, z); g.add(t); [-3.4, 3.4].forEach((x) => { const pst = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, CRY + 0.1, 12), fm); pst.position.set(x, CRY / 2, z); g.add(pst); }); });
        const bs = bx(8.4, 0.2, 2.0, 0x5b6a80, { roughness: 0.6 }); bs.position.set(0, -0.1, 0); bs.receiveShadow = true; g.add(bs);
        for (let i = 0; i < 5; i++) {
          const b = new THREE.Mesh(new THREE.SphereGeometry(CRR, 28, 20), ctx.mats.metal('chrome', { roughness: 0.06 })); b.castShadow = true; g.add(b); crBalls.push(b);
          crStr.push([0, 1].map(() => rodC(0.012, 0x4d5a78, g)));
        } }
      function rodC(r, col, par) {   // a→b 가는 막대
        const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 6), new THREE.MeshBasicMaterial({ color: col })); par.add(m);
        m.setA = (p, q) => { const d = new V3().subVectors(q, p), L = d.length(); m.scale.set(1, L, 1); m.position.copy(p).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.normalize()); };
        return m;
      }
      const lCr = label('', [1.2, CRY + 0.7, 0], { color: '#26324a', size: 13 });
      const apSets = { car: ['roadC', carA, carB], ball: ['table', ballA, ballB], swim: ['water', swimG, swimmer], cannon: ['road', cannonG, shell], cradle: ['cradle'] };
      function apShow(sel) {
        gAp.visible = !!sel; ['road', 'roadC', 'table', 'water', 'cradle'].forEach((k) => (apG[k].visible = false));
        [carA, carB, ballA, ballB, swimG, swimmer, cannonG, shell].forEach((o) => (o.visible = false));
        lCr.show(false);
        const set = apSets[sel]; if (!set) return;
        apG[set[0]].visible = true; set.slice(1).forEach((o) => (o.visible = true));
        if (sel === 'cradle') Object.assign(orbit, { tx: 0, ty: 2.4, tz: 0, phi: 1.25, theta: 0.3, dist: 9 * KD * (PHN ? 1.2 : 1) });
        else if (sel === 'car') Object.assign(orbit, { tx: 6.4, ty: 1.2, tz: 0, phi: 1.0, theta: 0.15, dist: 13 * KD * (PHN ? 1.4 : 1) });
        else Object.assign(orbit, { tx: 5, ty: 1.0, tz: 0, phi: 1.12, theta: 0.2, dist: 11 * KD * (PHN ? 1.35 : 1) });
      }
      function apCol(S, sel) {
        const a = S.ap, c = a.run; if (!c) return;
        const car = sel === 'car', k = car ? KC : KB;
        let xA = c.xA, xB = c.xB, vA = c.cvA, vB = c.cvB, squash = c.squash, post = c.st === 'after' || c.st === 'done';
        if (demo.on && (c.st === 'ready' || c.st === 'done')) {
          const T0 = c.T0, TP = 1.6, t = demo.p * (T0 + TP); let joined = false; squash = 0;
          if (t < T0 || !c.willHit) { xA = c.xAc - c.vA * (T0 - t); xB = c.xBc - c.vB * (T0 - t); vA = c.vA; vB = c.vB; post = !c.willHit && t >= T0; }
          else { const q = t - T0; vA = c.v2A; vB = c.v2B; post = true; joined = c.type === 'stick'; xA = c.xAc + vA * q; xB = c.xBc + vB * q; if (joined) xB = xA + c.D0; squash = Math.max(0, 1 - q / 0.3); }
          xA = clamp(xA, c.wA / 2, c.len - c.wA / 2); xB = clamp(xB, c.wB / 2, c.len - c.wB / 2);
          if (joined) { xA = Math.min(xA, c.len - c.wB / 2 - c.D0); xB = xA + c.D0; }
        }
        const sq = 1 - 0.14 * squash;
        let pa = 0, pb = 0, yA, yB;
        if (car) { carA.position.set(xA * k, 0, 0); carB.position.set(xB * k, 0, 0); carA.scale.x = carB.scale.x = sq; yA = 2.2; yB = 2.9; }
        else { const r = 0.5; ballA.position.set(xA * k, r, 0); ballB.position.set(xB * k, r, 0); ballA.rotation.z = -xA * k / r; ballB.rotation.z = -xB * k / r; yA = 1.4; yB = 1.9; }
        pa = c.mA * vA; pb = c.mB * vB;
        const f = car ? 1.6e-4 : 3.0, d = car ? 0 : 2, nm = car ? ['승용차', 'SUV'] : ['A', 'B'];
        arrows([[aA, lA, xA * k, pa, yA, 'p ' + sgp(pa, d)], [aB, lB, xB * k, pb, yB, 'p ' + sgp(pb, d)]], pa + pb, car ? 6.4 : 5, f, true);
        lT.set('총 운동량 ' + sgp(pa + pb, d) + ' kg·m/s');
        const mt = (m) => car ? m : m.toFixed(2);
        lnA.set(nm[0] + ' ' + mt(c.mA) + ' kg · ' + sg(vA, 1) + ' m/s'); lnB.set(nm[1] + ' ' + mt(c.mB) + ' kg · ' + sg(vB, 1) + ' m/s');
        lnA.obj = car ? carA : ballA; lnB.obj = car ? carB : ballB; lnA.off = [0, car ? 0.75 : 0.9, 0]; lnB.off = [0, car ? 0.95 : 0.9, 0]; lnA.show(true); lnB.show(true);
        const done = !!c.rec || post; let t1;
        if (car) {
          const P = CAR3.mA * CAR3.vA + CAR3.mB * CAR3.vB;
          t1 = '총 운동량 = ' + CAR3.mA + ' × ' + CAR3.vA + ' + ' + CAR3.mB + ' × (' + sg(CAR3.vB, 0) + ') = ' + sg(P, 0) + ' kg·m/s<br>' +
            (done ? '합체 후 속도 v = ' + sg(P, 0) + ' / ' + (CAR3.mA + CAR3.mB) + ' = <b>' + sg(c.v2A, 1) + ' m/s</b> (SUV 방향)<br>속도 변화: 승용차 ' + Math.abs(c.v2A - c.vA) + ' m/s, SUV ' + Math.abs(c.v2B - c.vB) + ' m/s → 가벼운 승용차가 더 크게 변해요.' : '▶ 충돌 시키기를 눌러 결과를 확인해요.');
        } else t1 = '같은 질량 + 정면 탄성 충돌 → 속도를 서로 바꿔 가져요.<br>' + (done ? '충돌 후 A <b>' + sg(c.v2A, 1) + ' m/s</b>, B <b>' + sg(c.v2B, 1) + ' m/s</b> (운동량·운동 에너지 모두 보존)' : '▶ 충돌 시키기를 눌러 결과를 확인해요.');
        info('<b>' + (car ? '🚗 자동차 정면 충돌 · 한 덩어리로 합체' : '🎱 당구공 정면 충돌 · 튕김') + '</b><br>' + t1 + '<br><span style="opacity:.8">위쪽 화살표는 p = mv, 아래 화살표는 총 운동량이에요. 식 고르기는 옆 조작판에서 해요.</span>');
      }
      const CAR3 = { mA: 1000, vA: 15, mB: 2000, vB: -15 };
      function apRc(S, sel) {
        const a = S.ap, r = a.rc; if (!r) return; const s = r.s, swim = sel === 'swim';
        let xL = r.xL, xR = r.xR, on = r.st !== 'ready';
        if (demo.on && r.st !== 'go') { const t = demo.p < 0.15 ? 0 : Math.min(1, (demo.p - 0.15) / 0.7) * s.dur; xL = Math.max(0.9, s.x0 + r.vL * t); xR = s.x0 + 0.5 + r.vR * t; on = demo.p >= 0.15; }
        const xLc = clamp(xL, 0.9, 10.2);
        if (swim) { swimG.position.set(xLc, 0.05 + (on ? Math.sin((xLc) * 3) * 0.03 : 0), 0); swimmer.position.set(clamp(xR, 0.5, 10.1), 0.52, 0); }
        else { cannonG.position.set(xLc, 0, 0); const sx = on ? xR : xLc + 1.4; shell.visible = sx < 9.6; shell.position.set(sx, 0.7, 0); }
        const f = swim ? 0.0125 : 0.00075, pL = on ? -r.Q : 0, pR = on ? r.Q : 0, xs = swim ? [xLc, clamp(xR, 0.5, 8.6)] : [xLc, Math.min(on ? xR : xLc + 1.4, 8.2)];
        arrows([[aA, lA, xs[0], pL, swim ? 1.5 : 1.7, 'p ' + sgp(pL, 0)], [aB, lB, xs[1], pR, swim ? 2.1 : 2.3, 'p ' + sgp(pR, 0)]], 0, 5, f, false);
        aT.visible = false; lT.show(false);
        lnA.set((swim ? '출발대 ' : '대포 ') + (swim ? s.mL : s.mL) + ' kg' + (on ? ' · ' + sg(r.vL, 1) + ' m/s' : ''));
        lnB.set((swim ? '선수 ' : '포탄 ') + s.mR + ' kg' + (on ? ' · ' + sg(r.vR, 1) + ' m/s' : ''));
        lnA.obj = swim ? swimG : cannonG; lnB.obj = swim ? swimmer : shell; lnA.off = [0, -0.1, 0.9]; lnB.off = [0, 0.6, 0]; lnA.show(true); lnB.show(swim || shell.visible);
        const M0 = s.mL, m0 = s.mR, v0 = s.vR;
        const t1 = swim ? '0 = ' + m0 + ' × ' + v0.toFixed(1) + ' + ' + M0 + ' × V → V = ' + sg(-m0 * v0 / M0, 1) + ' m/s' : '0 = ' + m0 + ' × ' + v0 + ' + ' + M0 + ' × V → V = ' + sg(-m0 * v0 / M0, 1) + ' m/s';
        info('<b>' + (swim ? '🏊 수영 출발 · 물에 떠 있는 출발대' : '💥 대포 발사') + '</b><br>' + t1 + '<br>' + (r.st === 'ready' && !on ? '▶ ' + (swim ? '출발하기' : '발사') + '를 눌러 결과를 확인해요. 처음엔 모두 정지해서 총 운동량은 0이에요.' : (swim ? '출발대는 반대 방향으로 ' : '대포는 반대 방향으로 ') + '<b>' + Math.abs(r.vL).toFixed(1) + ' m/s</b>로 ' + (swim ? '밀려나요.' : '반동해요.') + ' 총 운동량은 0 그대로예요.') + '<br><span style="opacity:.8">파랑 · 주황 화살표는 두 물체의 운동량(크기 같고 방향 반대)이에요.</span>');
      }
      function apCradle(S) {
        const c = S.ap.cr, n = c.n; let st = c.st, t = c.t;
        if (demo.on && c.st === 'hold') { st = 'swing'; t = demo.p < 0.1 ? -1 : (demo.p - 0.1) / 0.9 * 6; if (t < 0) st = 'hold'; }
        let L = -CR_A0, R = 0;
        if (st === 'swing') { const sv = t / CR_T * (Math.PI / 2), q = Math.floor(sv / (Math.PI / 2)) % 4, f = sv - Math.floor(sv / (Math.PI / 2)) * (Math.PI / 2); if (q === 0) { L = -CR_A0 * Math.cos(f); R = 0; } else if (q === 1) { L = 0; R = CR_A0 * Math.sin(f); } else if (q === 2) { L = 0; R = CR_A0 * Math.cos(f); } else { L = -CR_A0 * Math.sin(f); R = 0; } }
        const ang = [0, 0, 0, 0, 0]; for (let i = 0; i < n; i++) ang[i] = L; for (let i = 0; i < n; i++) ang[4 - i] = R;
        for (let i = 0; i < 5; i++) {
          const px = (i - 2) * CRR * 2, a = ang[i], bxp = px + Math.sin(a) * CRL, byp = CRY - Math.cos(a) * CRL;
          crBalls[i].position.set(bxp, byp, 0);
          crStr[i][0].setA(new V3(px, CRY, -0.62), new V3(bxp, byp, 0)); crStr[i][1].setA(new V3(px, CRY, 0.62), new V3(bxp, byp, 0));
        }
        lCr.show(true); lCr.set(st === 'hold' ? '왼쪽 공 ' + n + '개를 들어 올렸어요' : '오른쪽에서도 공이 ' + n + '개 튀어 올라요'); lCr.el.style.background = st === 'hold' ? '#26324a' : '#14a058';
        const e2 = n === 1 ? '½mv²' : '½m(' + n + 'v)² = ' + (n * n) + '·(½mv²)';
        info('<b>🔔 뉴턴의 요람 · 마찰을 무시한 이상적인 경우</b><br>충돌 전: 공 ' + n + '개, 속력 v → 운동량 ' + n + 'mv · 운동 에너지 ' + (n === 1 ? '½mv²' : n + '·(½mv²)') +
          '<br><span style="color:#7be3a0">○ ' + n + '개가 속력 v로</span>: 운동량 ' + n + 'mv · 에너지 ' + n + '·(½mv²) → 둘 다 보존!<br><span style="color:#ff9b9b">' + (n === 1 ? '○ 1개가 속력 v로 (위와 같아요)' : '✕ 1개가 속력 ' + n + 'v로') + '</span>' + (n === 1 ? '' : ': 운동량 ' + n + 'mv 같지만 에너지 ' + e2 + ' → 보존 안 돼요') +
          '<br><span style="opacity:.8">운동량과 운동 에너지가 모두 보존되는 경우만 가능해요. 공 개수는 옆 조작판에서 골라요.</span>');
      }
      function apply(S) {
        const a = S.ap; if (!a) return; const sel = a.sel;
        if (sel === 'car' || sel === 'ball') apCol(S, sel); else if (sel === 'swim' || sel === 'cannon') apRc(S, sel); else apCradle(S);
      }
      /* ▶ 재생: 지금 값 그대로 같은 실험을 되풀이해요 (장면마다 재생 줄이 하나씩) */
      const PH = { pair: [[0, '출발'], [0.02, '줄 당기는 중'], [0.85, '측정 끝']], collide: [[0, '다가오는 중'], [0.38, '충돌!'], [0.42, '충돌 후']], recoil: [[0, '정지 (총 운동량 0)'], [0.15, '서로 밀어요']], apply: [[0, '준비'], [0.15, '움직이는 중'], [0.85, '결과']] };
      const DM = { pair: { p: 0, on: false }, collide: { p: 0, on: false }, recoil: { p: 0, on: false }, apply: { p: 0, on: false } }, PLS = {};
      Object.keys(PH).forEach((k) => {
        PLS[k] = controls.player({ duration: k === 'collide' ? 6 : 7, loop: true, autoplay: false, label: k === 'pair' ? '줄 당기기' : k === 'collide' ? '충돌 시키기' : k === 'apply' ? '다시 보기' : '서로 밀기', phases: PH[k],
          onFrame(p) { DM[k].p = p; DM[k].on = p > 0 || !!(PLS[k] && PLS[k].playing); } });
        PLS[k].row = ctx.renderer.domElement.parentNode.parentNode.querySelectorAll('.v3-player');
        PLS[k].row = PLS[k].row[PLS[k].row.length - 1];
      });
      return {
        update(dt, tm) {
          const S = sim() && sim().S; if (!S) return;
          const mode = S.mode, sc = mode === 'recoil' && S.rc ? S.rc.scene : mode === 'apply' && S.ap ? S.ap.sel : '';
          setMode(mode, sc); const pl = PLS[mode]; demo = DM[mode] || DM.collide;
          // 2D가 직접 실험을 돌리는 중이면 재생을 멈춰요
          const busy = (mode === 'collide' && S.co && S.co.run && ['approach', 'hit', 'after'].indexOf(S.co.run.st) >= 0) || (mode === 'pair' && S.pr && S.pr.st === 'pull') || (mode === 'recoil' && S.rc && S.rc.st === 'go') || (mode === 'apply' && S.ap && ((S.ap.run && ['approach', 'hit', 'after'].indexOf(S.ap.run.st) >= 0) || (S.ap.rc && S.ap.rc.st === 'go') || (S.ap.sel === 'cradle' && S.ap.cr.st === 'swing')));
          if (pl) { if (busy && pl.playing) pl.pause(); if (busy) demo.on = false; else if (!pl.playing && pl.p === 0) demo.on = false; }
          if (mode === 'collide') collide(S); else if (mode === 'pair') pair(S); else if (mode === 'recoil') recoil(S, tm); else if (mode === 'apply') apply(S); else info('');
        },
        sync() {},
      };
    },
  });
})();
