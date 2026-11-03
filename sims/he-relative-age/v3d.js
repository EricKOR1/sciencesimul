/* he-relative-age · 3D 지층 블록: 관입과 부정합
   2D 차시와 같은 두 장면을 입체 블록으로 봐요.
   [2단계 관입·포획] 셰일 · 사암 · 석회암을 마그마(암맥 D)가 뚫고 올라와요. 뚫은 쪽(D)이 나중이고, 속의 셰일·사암 조각(포획암)은 먼저예요. (2D의 ▶ 마그마 관입과 같은 값)
   [3단계 부정합] ① 퇴적 → ② 융기 → ③ 침식 → ④ 침강 → ⑤ 다시 퇴적. 깎인 면(부정합면) 위에 새 지층(역암·이암)이 쌓여요.
   ▶ 재생은 2D의 '부정합이 만들어지는 과정'(S.unc.u)과 같이 움직여요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const XW = 3.4, ZD = 1.9, H = 3.6;
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const COL = { sand: 0xecd08a, shale: 0x8e9aa8, lime: 0xe9e5d3, conglo: 0xcdbb9b, mud: 0xb59f94, igneous: 0x6d5d78, base: 0x4a4a55 };
  /* 부정합 장면 크기 (2D의 픽셀 값을 3D 단위로: 60 px = 0.72) */
  const KU = 0.72 / 60, LT = 0.72, Y3 = 3 * LT, SEA = Y3 + 92 * KU, UP = 150 * KU;
  const ERO = (q) => Math.max(4, 30 + 21 * Math.sin(q * 9.2 + 0.4) + 10 * Math.sin(q * 23 + 1.3)) * KU;       // 깎인 깊이 (2D와 같은 곡선)
  const UNC_MSG = ['▶ 재생을 눌러 지층이 어떻게 쌓이고 깎이는지 지켜봐요.', '① 퇴적: 바다 밑에 지층이 차례로 쌓여요. 아래층이 먼저예요.', '② 융기: 땅이 솟아올라 지층이 바다 위로 드러나요.', '③ 침식: 드러난 지층의 윗부분이 깎여 울퉁불퉁한 면이 생겨요.', '④ 침강: 땅이 다시 가라앉아 바다 밑이 돼요.', '⑤ 다시 퇴적: 깎인 면 위에 새 지층이 쌓여요. 이 면이 부정합면이에요.'];
  const uncStage = (u) => (u < 0.02 ? 0 : Math.min(5, Math.ceil(u - 0.02)));
  /* 관입 장면 (2D와 같은 비율): 석회암 · 사암 · 셰일, 암맥 D의 위치와 폭 */
  const IL = { ls: [0, 0.27], ss: [0.27, 0.58], sh: [0.58, 1] };
  const XD = (0.58 - 0.5) * 2 * XW, HW = 0.034 * 2 * XW;
  const XEN = [{ fy: 0.84, dx: -0.2, s: 0.2, c: COL.shale }, { fy: 0.70, dx: 0.25, s: 0.16, c: COL.shale }, { fy: 0.43, dx: -0.1, s: 0.16, c: COL.sand }];

  window.SciSim3D.attach({
    title: '관입과 부정합 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    levels: [1, 2],                 // 0단계(퇴적 상자·속도)와 3단계(층서 대비)는 2D 화면에서 해요
    camera: { dist: PHONE ? 16 : 11.5, theta: 0.55, phi: 1.12, min: 5, max: 26, target: [0, 1.4, 0] },
    autoRotate: 0,
    build(ctx) {
      if (ctx.THREE.ColorManagement) ctx.THREE.ColorManagement.legacyMode = false;     // 색을 보이는 그대로(sRGB) 쓰도록 맞춰요
      const { THREE, root, label, info, controls } = ctx;
      const L2 = () => ctx.lesson();
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.85, metalness: 0 }, o || {}));
      const floor = new THREE.Mesh(new THREE.CylinderGeometry(6.2, 6.2, 0.2, 64), std(0x2a3550)); floor.position.y = -3.3; root.add(floor);
      const gI = new THREE.Group(), gU = new THREE.Group(); root.add(gI, gU);
      const ext = (pts, col, depth) => {
        const sh = new THREE.Shape(); pts.forEach((p, i) => (i ? sh.lineTo(p[0], p[1]) : sh.moveTo(p[0], p[1]))); sh.closePath();
        const g = new THREE.ExtrudeGeometry(sh, { depth: depth || ZD * 2, bevelEnabled: false, curveSegments: 2 }); g.translate(0, 0, -(depth || ZD * 2) / 2);
        const m = new THREE.Mesh(g, std(col)); m.castShadow = m.receiveShadow = true; return m;
      };
      const rect = (x0, x1, y0, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
      const box = (w, h, d, col, o) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), std(col, o)); m.castShadow = m.receiveShadow = true; return m; };
      const LB = {};
      const lab = (k, text, o) => { LB[k] = label(text, [0, 0, 0], o || { size: 12.5 }); LB[k].show(false); return LB[k]; };
      lab('ls', '석회암'); lab('ss', '사암'); lab('sh', '셰일'); lab('conglo', '역암'); lab('mud', '이암');
      lab('dike', '화성암 D (암맥)', { size: 12.5, color: 'rgba(110,40,60,.95)' }); lab('cont', '구운 듯한 접촉부', { size: 12, color: 'rgba(150,70,20,.95)' }); lab('xen', '포획암 (셰일 조각)', { size: 12 });
      lab('old', '오래됨 ↓', { size: 12 }); lab('yng', '젊음 ↑', { size: 12 });
      lab('sea', '해수면', { size: 12.5, color: 'rgba(3,105,161,.92)' }); lab('unc', '부정합면', { size: 12.5, color: 'rgba(160,20,50,.95)' }); lab('newl', '위 지층 (새 퇴적)', { size: 12, color: 'rgba(124,45,18,.95)' });

      /* ---------- 관입 장면 ---------- */
      const yL = (f) => H * (1 - f);
      gI.add(ext(rect(-XW, XW, yL(IL.ls[1]), yL(IL.ls[0])), COL.lime), ext(rect(-XW, XW, yL(IL.ss[1]), yL(IL.ss[0])), COL.sand), ext(rect(-XW, XW, yL(IL.sh[1]), yL(IL.sh[0])), COL.shale));
      { const b = box(XW * 2, 0.5, ZD * 2, COL.base); b.position.y = -0.25; gI.add(b); }
      const heatM = std(0x6d5d78, { emissive: 0xff5a14, emissiveIntensity: 1, roughness: 0.6 });
      const dike = new THREE.Mesh(new THREE.BoxGeometry(HW * 2, 1, ZD * 2 + 0.04), heatM); dike.castShadow = true; gI.add(dike);
      const CT = [['ls', 0xffffff, 0.8], ['ss', 0x78462a, 0.8], ['sh', 0x1e2332, 0.85]];
      const cont = CT.map(([k, c, o]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(HW * 2 + 0.26, 1, ZD * 2 + 0.02), new THREE.MeshStandardMaterial({ color: c, transparent: true, opacity: o, roughness: 0.9 })); gI.add(m); return m; });
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.8 })); gI.add(glow);
      const xen = XEN.map((x) => { const m = new THREE.Mesh(new THREE.DodecahedronGeometry(x.s, 0), std(x.c, { roughness: 0.9 })); m.position.set(XD + x.dx * HW, yL(x.fy), ZD + 0.03); gI.add(m); return m; });
      let dkP = 0;
      function setDike(p) {
        dkP = p; const top = Math.min(H, p * (H + 0.06)), vis = p > 0.001;
        dike.visible = vis; dike.scale.y = Math.max(0.001, top); dike.position.set(XD, top / 2, 0);
        heatM.emissiveIntensity = p >= 0.999 ? 0.05 : 0.9;
        cont.forEach((m, i) => { const r = IL[CT[i][0]], y1 = yL(r[1]), y2 = yL(r[0]), h = clamp01((top - y1) / (y2 - y1)) * (y2 - y1); m.visible = vis && h > 0.01; m.scale.y = Math.max(0.001, h); m.position.set(XD, y1 + h / 2, 0); });
        glow.visible = p > 0.001 && p < 0.999; glow.position.set(XD, top, ZD * 0.2);
        xen.forEach((m, i) => { m.visible = vis && top > yL(XEN[i].fy) + 0.1; });
        const done = p >= 0.999;
        LB.dike.show(done); LB.cont.show(done); LB.xen.show(done);
        LB.dike.obj = [XD + 0.7, yL(0.2), ZD]; LB.cont.obj = [XD - 1.1, yL(0.5), ZD]; LB.xen.obj = [XD + 1.2, yL(XEN[0].fy), ZD + 0.05];
      }

      /* ---------- 부정합 장면 ---------- */
      const sea = new THREE.Mesh(new THREE.BoxGeometry(XW * 2 + 0.7, SEA + 3.0, ZD * 2 + 0.6), new THREE.MeshStandardMaterial({ color: 0x4aa9de, transparent: true, opacity: 0.13, roughness: 0.2, depthWrite: false }));
      sea.position.set(0, (SEA - 3.0) / 2, 0); root.add(sea);
      const seaTop = new THREE.Mesh(new THREE.BoxGeometry(XW * 2 + 0.7, 0.03, ZD * 2 + 0.6), new THREE.MeshBasicMaterial({ color: 0xbfe6fa, transparent: true, opacity: 0.8 })); seaTop.position.set(0, SEA, 0); root.add(seaTop);
      const NX = 48, xs = [...Array(NX + 1)].map((_, i) => -XW + (2 * XW * i) / NX);
      let uBuilt = -9, uNow = 0;
      function buildUnc(u) {
        while (gU.children.length) { const c = gU.children.pop(); c.geometry.dispose(); }
        uBuilt = u; uNow = u;
        const f1 = clamp01(u), f2 = clamp01(u - 1), f3 = clamp01(u - 2), f4 = clamp01(u - 3), f5 = clamp01(u - 4), off = UP * (f2 - f4);
        gU.position.y = off;
        const bs = box(XW * 2, 3.0, ZD * 2, COL.base); bs.position.y = -1.5; gU.add(bs);
        const Eof = (x) => Y3 - f3 * ERO((x + XW) / (2 * XW));
        [['sand', 0, COL.sand], ['shale', 1, COL.shale], ['lime', 2, COL.lime]].forEach(([k, i, c]) => {
          const g = clamp01(f1 * 3 - i); if (g <= 0) return;
          const yb = i * LT, yt = yb + LT * g, top = xs.map((x) => [x, Math.min(yt, Eof(x))]);
          if (top.every((p) => p[1] <= yb + 0.002)) return;
          const poly = [[-XW, yb]].concat(top.map((p) => [p[0], Math.max(yb, p[1])]), [[XW, yb]]);
          gU.add(ext(poly, c));
        });
        if (f5 > 0) {
          const yU1 = Y3 + 8 * KU, yN = -62 * KU + (106 * KU) * f5;
          const E = xs.map((x) => Y3 - ERO((x + XW) / (2 * XW)));
          const cTop = xs.map((x, i) => [x, Math.max(E[i], Math.min(yN, yU1))]);
          const cb = xs.map((x, i) => [x, E[i]]).reverse();
          if (yN > Math.min.apply(null, E)) gU.add(ext(cTop.concat(cb), COL.conglo));
          if (yN > yU1) gU.add(ext(rect(-XW, XW, yU1, yN), COL.mud));
        }
        /* 이름표 */
        const showL = (k, on, pos) => { LB[k].show(on); if (on) LB[k].obj = pos; };
        const g1 = clamp01(f1 * 3);
        showL('sand', g1 > 0, [-XW - 0.15, LT * 0.5 + off, ZD]); showL('shale', f1 * 3 > 1 && f3 < 0.99 || f1 * 3 > 1 && f3 >= 0.99, [-XW - 0.15, LT * 1.5 + off, ZD]); showL('lime', f1 * 3 > 2 && f3 < 0.6, [-XW - 0.15, LT * 2.5 + off, ZD]);
        LB.sand.set('사암'); LB.shale.set('셰일'); LB.lime.set('석회암');
        showL('sea', true, [XW + 0.4, SEA, ZD * 0.6]);
        showL('unc', f3 > 0.4, [XW * 0.7, Y3 - f3 * ERO(0.85) + off, ZD]);
        showL('newl', f5 > 0.85, [-XW * 0.6, Y3 + 0.4 + off, ZD]);
        showL('conglo', f5 > 0.3, [XW + 0.9, Y3 - 0.1 + off, ZD]); showL('mud', f5 > 0.8, [XW + 0.9, Y3 + 0.4 + off, ZD]);
        info(UNC_MSG[uncStage(u)]);
      }
      /* 이름표 키 정리 (석회암·사암·셰일은 관입 장면 이름표를 같이 써요) */
      LB.sand = lab('sand', '사암'); LB.shale = lab('shale', '셰일'); LB.lime = lab('lime', '석회암');

      /* ---------- 조작 ---------- */
      const sceneOf = () => { const l = L2(), v = l && l.S && l.S.view; if (v === 'intr' || v === 'case') return 'intr'; if (v === 'unc' || v === 'type') return 'unc'; return ctx.level === 1 ? 'intr' : 'unc'; };
      let scene = null, syncing = false;
      const bRun = controls.button('▶ 마그마 관입', () => { const l = L2(); if (l && l.intrRun) l.intrRun(); else if (!demo.on) { demo.on = true; demo.p = 0; } });
      const bRst = controls.button('↺ 처음부터', () => { const l = L2(); if (l && l.intrReset) l.intrReset(); else { demo.on = false; demo.p = 0; } });
      const demo = { on: false, p: 0 };
      const pl = controls.player({
        duration: 14, loop: true, autoplay: false, label: '부정합 만들기',
        phases: [[0, '① 퇴적'], [0.2, '② 융기'], [0.4, '③ 침식'], [0.6, '④ 침강'], [0.8, '⑤ 다시 퇴적']],
        onFrame(p) {
          if (scene !== 'unc') return;
          const u = 5 * p; buildUnc(u);
          const l = L2(); if (!syncing && l && l.S && l.S.unc) { l.S.unc.play = false; l.S.unc.uT = u; l.S.unc.u = u; l.S.unc.max = Math.max(l.S.unc.max || 0, u); }
        },
      });
      const plRow = pl && bRun.parentElement.querySelector('.v3-player');
      function show(sc) {
        if (sc === scene) return; scene = sc;
        gI.visible = sc === 'intr'; gU.visible = sc === 'unc'; sea.visible = seaTop.visible = sc === 'unc';
        bRun.style.display = bRst.style.display = sc === 'intr' ? '' : 'none'; if (plRow) plRow.style.display = sc === 'unc' ? '' : 'none';
        Object.values(LB).forEach((l) => l.show(false));
        if (sc === 'intr') {
          const lv = (k, f, t) => { LB[k].show(true); LB[k].obj = [-XW - 0.15, yL(f), ZD]; LB[k].set(t); };
          lv('ls', (IL.ls[0] + IL.ls[1]) / 2, '석회암'); lv('ss', (IL.ss[0] + IL.ss[1]) / 2, '사암'); lv('sh', (IL.sh[0] + IL.sh[1]) / 2, '셰일');
          setDike(dkP); intrInfo();
        } else { buildUnc(uNow); }
        ctx.orbit.tx = 0; ctx.orbit.ty = sc === 'intr' ? 1.8 : 1.4;
      }
      function intrInfo() {
        const l = L2(), I = l && l.S && l.S.intr, ran = I ? I.ran : dkP > 0, done = dkP >= 0.999;
        info(!ran ? '▶ 마그마 관입을 눌러 보세요. 마그마는 어느 쪽을 뚫고 올라올까요?' : !done ? '마그마가 이미 있던 지층의 틈을 뚫고 올라오고 있어요.' : '마그마가 식어 굳어 <b>화성암 D</b>가 됐어요. D는 세 지층을 가로질러 뚫었으니 <b>지층이 먼저</b> 있었던 거예요.<br>오래됨 → 젊음: 셰일 &lt; 사암 &lt; 석회암 &lt; D');
      }
      show(sceneOf());
      let lastInfoP = -1;
      ctx.onLevel(() => { scene = null; show(sceneOf()); });
      return {
        update(dt) {
          const sc = sceneOf(); if (sc !== scene) show(sc);
          const l = L2();
          if (scene === 'intr') {
            let p = dkP;
            if (l && l.S && l.S.intr) p = l.S.intr.p; else if (demo.on) { demo.p = Math.min(1, demo.p + dt / 3.6); p = demo.p; }
            if (Math.abs(p - dkP) > 0.0005 || lastInfoP < 0) { setDike(p); }
            const st = p >= 0.999 ? 2 : p > 0.001 ? 1 : 0; if (st !== lastInfoP) { lastInfoP = st; intrInfo(); }
          } else if (l && l.S && l.S.unc) {
            const u = l.S.unc.u;
            if (!pl.playing && Math.abs(u - 5 * pl.p) > 0.01) { syncing = true; pl.set(u / 5); syncing = false; }
          }
        },
        sync() {},
      };
    },
  });
})();
