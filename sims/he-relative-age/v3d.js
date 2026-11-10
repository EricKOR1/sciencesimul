/* he-relative-age · 3D 지층 블록: 관입과 부정합
   2D 차시와 같은 두 장면을 입체 블록으로 봐요.
   [2단계 관입·포획] 셰일 · 사암 · 석회암을 마그마(암맥 D)가 뚫고 올라와요. 뚫은 쪽(D)이 나중이고, 속의 셰일·사암 조각(포획암)은 먼저예요. (2D의 ▶ 마그마 관입과 같은 값)
   [3단계 부정합] ① 퇴적 → ② 융기 → ③ 침식 → ④ 침강 → ⑤ 다시 퇴적. 깎인 면(부정합면) 위에 새 지층(역암·이암)이 쌓여요.
   0단계(퇴적 상자 · 퇴적 속도) · 부정합의 세 종류 · 층서 대비도 2D와 같은 값으로 보여 줘요.
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
    levels: [1, 2],                 // 0단계(퇴적 상자 · 퇴적 속도)와 3단계(층서 대비: 지층 기둥을 눌러 잇기)는 2D 화면에서 해요
    camera: { dist: PHONE ? 19 : 11.5, theta: 0.55, phi: 1.12, min: 5, max: 26, target: [0, 1.4, 0] },
    autoRotate: 0,
    build(ctx) {
      if (ctx.THREE.ColorManagement) ctx.THREE.ColorManagement.legacyMode = false;     // 색을 보이는 그대로(sRGB) 쓰도록 맞춰요
      const { THREE, root, label, info, controls } = ctx;
      /* ---- 장면 꾸미기 도우미: 나무 · 암석 무늬, 하늘 · 우주 배경, 빛 번짐 (모양만 꾸며요) ---- */
      const FX = (() => {
        const scn = ctx.scene; let sd = 7; const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
        const mk = (w, h, draw, rep) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (rep) t.repeat.set(rep[0], rep[1]); if ('encoding' in t) t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t; };
        const wood = (rep) => mk(256, 256, (g, w, h) => { g.fillStyle = '#b98a58'; g.fillRect(0, 0, w, h); for (let i = 0; i < 80; i++) { const y = rnd() * h; g.strokeStyle = 'rgba(' + (70 + rnd() * 40 | 0) + ',38,12,' + (0.07 + rnd() * 0.15) + ')'; g.lineWidth = 0.6 + rnd() * 2.2; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x * 0.03 + i) * 3 * rnd()); g.stroke(); } g.fillStyle = 'rgba(60,30,10,.18)'; for (let k = 1; k < 4; k++) g.fillRect(0, k * 64, w, 2); }, rep);
        const grain = (rep, amt) => mk(128, 128, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); for (let i = 0; i < 1100; i++) { const v = 150 + rnd() * 80 | 0; g.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',' + (amt || 0.35) + ')'; g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 3, 1 + rnd() * 2.2); } }, rep);
        const dome = (top, mid, bot, stars) => {
          const t = mk(8, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, top); gr.addColorStop(0.5, mid); gr.addColorStop(1, bot); g.fillStyle = gr; g.fillRect(0, 0, w, h); }); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
          const m = new THREE.Mesh(new THREE.SphereGeometry(90, 32, 16), new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, depthWrite: false })); m.renderOrder = -10; m.raycast = () => {}; scn.add(m);
          if (stars) { const pos = []; for (let i = 0; i < stars; i++) { const u = rnd() * 2 - 1, a = rnd() * 6.283, q = Math.sqrt(1 - u * u); pos.push(Math.cos(a) * q * 85, u * 85, Math.sin(a) * q * 85); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); const p = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xcfdcff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.8, depthWrite: false })); p.renderOrder = -9; p.raycast = () => {}; m.add(p); }
          return m;
        };
        const glowTex = (rgb) => mk(128, 128, (g, w, h) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(' + rgb + ',1)'); gr.addColorStop(0.35, 'rgba(' + rgb + ',.35)'); gr.addColorStop(1, 'rgba(' + rgb + ',0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
        const glow = (rgb, size, op) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(rgb), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: op == null ? 0.8 : op })); s.scale.setScalar(size); s.raycast = () => {}; return s; };
        const spiral = (rgb) => mk(256, 256, (g, w, h) => { g.clearRect(0, 0, w, h); const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, 'rgba(255,248,230,1)'); gr.addColorStop(0.12, 'rgba(' + rgb + ',.75)'); gr.addColorStop(0.5, 'rgba(' + rgb + ',.2)'); gr.addColorStop(1, 'rgba(' + rgb + ',0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); for (let arm = 0; arm < 2; arm++) for (let i = 0; i < 260; i++) { const f = i / 260, a = f * 5.2 + arm * Math.PI, r = 14 + f * 108, x = 128 + Math.cos(a) * r + (rnd() - 0.5) * 12 * f, y = 128 + Math.sin(a) * r + (rnd() - 0.5) * 12 * f; g.fillStyle = 'rgba(255,255,255,' + (0.5 * (1 - f) + 0.06) + ')'; g.beginPath(); g.arc(x, y, 1 + rnd() * 2.4 * (1 - f * 0.5), 0, 6.283); g.fill(); } });
        return { rnd, mk, wood, grain, dome, glow, glowTex, spiral };
      })();
      const L2 = () => ctx.lesson();
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.85, metalness: 0 }, o || {}));
      const rockG = FX.grain([1.3, 1.3], 0.55);
      FX.dome('#1c2c4a', '#33507a', '#5a7aa3', 0);
      const floor = new THREE.Mesh(new THREE.CylinderGeometry(6.4, 6.6, 0.3, 64), std(0x6b5a48, { map: FX.grain([5, 5], 0.6) })); floor.position.y = -3.3; floor.receiveShadow = true; root.add(floor);
      { const rim = new THREE.Mesh(new THREE.TorusGeometry(6.45, 0.08, 10, 96), new THREE.MeshStandardMaterial({ color: 0xc9a14a, roughness: 0.35, metalness: 0.8 })); rim.rotation.x = Math.PI / 2; rim.position.y = 0.15; floor.add(rim); }
      floor.traverse((o) => { if (o.isMesh) o.userData.v3bg = true; });   // 바닥 · 테두리는 화면 맞춤에서 빼요
      const gI = new THREE.Group(), gU = new THREE.Group(); root.add(gI, gU);
      const ext = (pts, col, depth) => {
        const sh = new THREE.Shape(); pts.forEach((p, i) => (i ? sh.lineTo(p[0], p[1]) : sh.moveTo(p[0], p[1]))); sh.closePath();
        const g = new THREE.ExtrudeGeometry(sh, { depth: depth || ZD * 2, bevelEnabled: false, curveSegments: 2 }); g.translate(0, 0, -(depth || ZD * 2) / 2);
        const m = new THREE.Mesh(g, std(col, { map: rockG })); m.castShadow = m.receiveShadow = true; return m;
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
      const plRow = (() => { const r = document.querySelectorAll('.v3-player'); return r[r.length - 1]; })();   // 부정합 재생 줄: 관입 장면에서는 숨겨요
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

      /* ================= 0단계 퇴적 상자(box) · 퇴적 속도(rate) · 3단계 부정합 종류(type) · 층서 대비(corr): 2D와 같은 값으로 보여 줘요 ================= */
      const gOld = new THREE.Group(); root.children.filter((o) => o !== floor).forEach((o) => gOld.add(o)); root.add(gOld);
      const gBx = new THREE.Group(), gRt = new THREE.Group(), gTy = new THREE.Group(), gCr = new THREE.Group(); root.add(gBx, gRt, gTy, gCr); gBx.visible = gRt.visible = gTy.visible = gCr.visible = false;
      const probe = controls.text(''); probe.style.display = 'none'; const ctlEl = probe.parentElement;
      const oldEls = Array.prototype.filter.call(ctlEl.children, (e) => e !== probe);
      const grab = (fn) => { const n0 = ctlEl.children.length; const r = fn(); return { r, els: Array.prototype.slice.call(ctlEl.children, n0) }; };
      const shw = (g2, on) => g2.els.forEach((e) => { e.style.display = on ? '' : 'none'; });
      ctx.renderer.localClippingEnabled = true;
      const KCOL = { gravel: 0x8f8a82, sand: 0xe0bd6a, clay: 0xb4694a, shale: COL.shale, lime: COL.lime, mud: COL.mud, tuff: 0xd9a441, granite: 0x8c7f8f };
      const sdM = (c, o) => std(c, Object.assign({ roughness: 0.8 }, o || {}));
      /* --- box --- */
      const BS = 6, BD = 2.4, bk = BS / 268;                                // 상자 한 변 6
      const boxG = new THREE.Group(); gBx.add(boxG);
      { const gl = new THREE.Mesh(new THREE.BoxGeometry(BS, BS, BD), new THREE.MeshStandardMaterial({ color: 0xcfe8f7, transparent: true, opacity: 0.2, roughness: 0.08, depthWrite: false })); boxG.add(gl);
        const ed = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(BS, BS, BD)), new THREE.LineBasicMaterial({ color: 0x64748b })); boxG.add(ed);
        const nz = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.25, 0.8), sdM(0x64748b)); nz.position.set(0, BS / 2 + 0.12, 0); boxG.add(nz); }
      const pedestal = new THREE.Mesh(new THREE.BoxGeometry(BS * 1.05, 0.25, BD + 0.6), new THREE.MeshStandardMaterial({ map: FX.wood([2, 0.4]), roughness: 0.55 })); pedestal.position.y = -BS * 0.66; gBx.add(pedestal);
      { const chrome = new THREE.MeshStandardMaterial({ color: 0xdfe6ee, roughness: 0.22, metalness: 0.85 }); [-1, 1].forEach((sx) => [-1, 1].forEach((sy) => { const po = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, BD + 0.1, 10), chrome); po.rotation.x = Math.PI / 2; po.position.set(sx * BS / 2, sy * BS / 2, 0); boxG.add(po); const ca = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), chrome); ca.position.set(sx * BS / 2, sy * BS / 2, BD / 2 + 0.05); boxG.add(ca); const ca2 = ca.clone(); ca2.position.z = -BD / 2 - 0.05; boxG.add(ca2); })); }
      { const hp = (x, z, col, rr, n) => { const g3 = new THREE.Group(); for (let i = 0; i < n; i++) { const a = i * 2.4, rd = 0.5 * Math.sqrt(i / n), r1 = rr * (0.7 + 0.5 * ((i * 37) % 10) / 10), pb = new THREE.Mesh(new THREE.DodecahedronGeometry(r1, 0), new THREE.MeshStandardMaterial({ color: col, roughness: 0.9 })); pb.position.set(Math.cos(a) * rd * 1.6, r1 * 0.6 + (1 - rd * 2) * 0.28, Math.sin(a) * rd * 1.6); pb.rotation.set(i, i * 2, 0); pb.castShadow = true; g3.add(pb); } g3.position.set(x, -BS * 0.66 + 0.125, z); gBx.add(g3); };
        hp(BS * 0.5 + 1.6, 0.4, 0x8f8a82, 0.2, 26); hp(BS * 0.5 + 1.6, -1.3, 0xe0bd6a, 0.1, 60); hp(-BS * 0.5 - 1.6, 0.4, 0xb4694a, 0.12, 50);
        const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.35, 0.8, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.3, metalness: 0.7, side: THREE.DoubleSide })); sh.position.set(0, BS / 2 + 0.55, 0); gBx.add(sh); }
      const layF = new THREE.Group(); boxG.add(layF);                          // 퇴적층 (상자 좌표 · 상자를 기울여 넣을 때의 수평 기준으로 돌려 놓아요)
      const layM = Array.from({ length: 5 }, () => { const m = new THREE.Mesh(new THREE.BoxGeometry(BS * 2.4, 1, BD), sdM(0xffffff, { clippingPlanes: [new THREE.Plane(), new THREE.Plane(), new THREE.Plane(), new THREE.Plane()] })); m.visible = false; layF.add(m); return m; });
      const NFALL = 200, fallM = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }), NFALL); fallM.frustumCulled = false; fallM.instanceMatrix.setUsage(THREE.DynamicDrawUsage); gBx.add(fallM);
      const horiz = new THREE.Mesh(new THREE.BoxGeometry(BS * 1.9, 0.03, 0.03), new THREE.MeshBasicMaterial({ color: 0x0284c7 })); gBx.add(horiz);
      const lHz = label('수평선 (중력 방향에 수직)', [BS * 0.95, 0, 0], { color: 'rgba(2,132,199,.92)' }), lBx = label('투입구', [0, BS / 2 + 0.7, 0], { color: 'rgba(30,41,59,.9)' }); lHz.show(false); lBx.show(false);
      const lLay = Array.from({ length: 5 }, () => { const l = label('', [0, 0, 0], { color: 'rgba(30,41,59,.9)', size: 12 }); l.show(false); return l; });
      const Mb = new THREE.Matrix4(), Cb = new THREE.Color(), Pb = new THREE.Vector3(), Qb = new THREE.Quaternion(), Sb = new THREE.Vector3();
      const pourBtns = grab(() => ['gravel', 'sand', 'clay'].map((k) => controls.button('⬇ ' + ({ gravel: '자갈', sand: '모래', clay: '점토' })[k], () => { const w = window.__sim; if (w) w.boxPour(k); })));
      const tiltR = grab(() => controls.range('상자 기울기', -20, 20, 1, 0, (v) => { const e = document.getElementById('sTilt'); if (e) { e.value = v; e.dispatchEvent(new Event('input')); } }, (v) => v + '°'));
      const defB = grab(() => controls.button('🏔 땅 눌러 기울이기', () => { const w = window.__sim; if (w) w.boxDeform(); }));
      const rstB = grab(() => controls.button('↺ 상자 비우기', () => { const w = window.__sim; if (w) w.boxReset(); }));
      function updBox(w) {
        const B = w.S.box, g = w.boxGeom(), th0 = B.layers.length ? B.th0 : g.th, def = B.def * Math.PI / 180;
        boxG.rotation.z = -(g.th + def); layF.rotation.z = th0;
        boxG.updateMatrixWorld(true);
        const planes = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([nx, ny]) => { const n = new THREE.Vector3(-nx, -ny, 0).transformDirection(boxG.matrixWorld), pt = new THREE.Vector3(nx * BS / 2, ny * BS / 2, 0).applyMatrix4(boxG.matrixWorld); return new THREE.Plane().setFromNormalAndCoplanarPoint(n, pt); });
        const s = w.BOX.s, yl = (s / 2) * (Math.cos(th0) + Math.abs(Math.sin(th0))); let H = 0;
        layM.forEach((m, i) => {
          const l = B.layers[i]; m.visible = !!l && l.h > 0.01; lLay[i].show(false); if (!m.visible) return;
          const y1 = yl - H, y2 = yl - H - l.h; H += l.h; const hh = l.h * bk;
          m.scale.set(1, hh, 1); m.position.set(0, -((y1 + y2) / 2) * bk, 0); m.material.color.setHex(KCOL[w.SED[l.k].kind]); m.material.clippingPlanes.forEach((pl, q) => pl.copy(planes[q]));
          lLay[i].show(true); lLay[i].obj = m; lLay[i].set(w.SED[l.k].name + (B.solid ? ' (굳어 암석이 됨)' : ''));
        });
        // 떨어지는 알갱이
        for (let i = 0; i < NFALL; i++) {
          const p = B.fall[i];
          if (!p) { Sb.set(0.0001, 0.0001, 0.0001); Mb.compose(Pb.set(0, -9, 0), Qb, Sb); fallM.setMatrixAt(i, Mb); continue; }
          const r = Math.max(0.045, p.r * bk * 1.3); Mb.compose(Pb.set((p.x - w.BOX.cx) * bk, -(p.y - w.BOX.cy) * bk, Math.sin(p.ph * 3.1) * (BD / 2 - 0.3)), Qb, Sb.set(r, r, r)); fallM.setMatrixAt(i, Mb); fallM.setColorAt(i, Cb.set(p.sd.col));
        }
        fallM.instanceMatrix.needsUpdate = true; if (fallM.instanceColor) fallM.instanceColor.needsUpdate = true;
        const hy = (g.yLow - B.layers.reduce((a, l) => a + l.h, 0) - w.BOX.cy) * bk; horiz.visible = B.layers.length > 0; lHz.show(B.layers.length > 0); horiz.position.set(0, -hy, 0.4); lHz.obj = [BS * 0.95, -hy, 0.4];
        lBx.show(true); tiltR.r.set(Math.round(B.tilt)); pourBtns.r.forEach((b) => { b.disabled = !!B.pour || B.layers.length >= w.MAXL || B.def > 0.5; });
        const n = B.layers.length;
        return '<b>퇴적 상자: 수평퇴적 · 지층 누중</b><br>' + (n ? '쌓인 층 ' + n + '개 · 아래에서 위로 차례로 쌓였어요. 상자를 기울여 넣어도 층은 수평으로 쌓여요.' : '자갈 · 모래 · 점토를 흘려 넣어 봐요. 상자를 먼저 기울여도 돼요.') + (B.def > 0.5 ? '<br>땅을 눌러 기울이면 수평선(파란 선)과 지층이 어긋나요 → 지층이 변형된 거예요.' : '') + '';
      }
      /* --- rate: 퇴적 속도와 걸린 시간 --- */
      const RKX = 0.075;                                               // 1 m = 0.075 단위
      const colM = [0, 1].map((i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1, 1.6), sdM(0xffffff)); gRt.add(m); const wt = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1, 2.0), new THREE.MeshStandardMaterial({ color: i ? 0xa8dcf2 : 0x4a8fc4, transparent: true, opacity: 0.45, depthWrite: false })); gRt.add(wt); return { m, wt }; });
      { const fl = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.2, 2.6), sdM(0x475569)); fl.position.set(0, -0.1, 0); gRt.add(fl);
        const sc = new THREE.Mesh(new THREE.BoxGeometry(0.04, 50 * RKX, 0.04), sdM(0x94a3b8)); sc.position.set(-3.7, 25 * RKX, 0.8); gRt.add(sc); for (let m2 = 0; m2 <= 50; m2 += 10) { const tk = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, 0.03), sdM(0x94a3b8)); tk.position.set(-3.6, m2 * RKX, 0.8); gRt.add(tk); } }
      const lRtT = [0, 1].map((i) => { const l = label('', [0, 0, 0], { color: 'rgba(37,99,235,.92)' }); l.show(false); return l; }), lRtL = [0, 1].map((i) => { const l = label('', [0, 0, 0], { color: 'rgba(30,41,59,.9)', size: 12 }); l.show(false); return l; }), lRtH = [0, 1].map(() => { const l = label('', [0, 0, 0], { color: 'rgba(71,85,105,.92)', size: 12 }); l.show(false); return l; }), lRtS = label('0 ~ 50 m', [-3.7, 50 * RKX + 0.4, 0.8], { color: 'rgba(71,85,105,.9)', size: 11.5 }); lRtS.show(false);
      const thickR = grab(() => controls.range('쌓인 두께', 1, 50, 1, 30, (v) => { const e = document.getElementById('sThick'); if (e) { e.value = v; e.dispatchEvent(new Event('input')); } }, (v) => v + ' m'));
      function updRate(w) {
        const R = w.S.rate, thick = R.thickD;
        [['deep', 0, -2.2], ['delta', 1, 2.2]].forEach(([env, i, x]) => {
          const rt = w.RATES[env], h = Math.max(0.02, thick * RKX), c = colM[i];
          c.m.scale.set(1, h, 1); c.m.position.set(x, h / 2, 0); c.m.material.color.setHex(KCOL[rt.kind]);
          const top = 50 * RKX + 0.6, wh = Math.max(0.02, top - h); c.wt.scale.set(1, wh, 1); c.wt.position.set(x, h + wh / 2, 0);
          lRtT[i].show(true); lRtT[i].obj = [x, 50 * RKX + 0.5, 0]; lRtT[i].set((i ? '🏝️ ' : '🌊 ') + rt.name); lRtT[i].el.style.background = rt.col;
          lRtL[i].show(true); lRtL[i].obj = [x, -0.55, 0.9]; lRtL[i].set(rt.label);
          const rec = R.rec[env], known = rec && rec.thick === R.thick; lRtH[i].show(true); lRtH[i].obj = [x, Math.min(h / 2, 50 * RKX), 1.0]; lRtH[i].set(known ? '⏱ ' + w.fmtMan(rec.val) : '⏱ ? 만 년');
        });
        lRtS.show(true); thickR.r.set(Math.round(R.thick));
        return '<b>퇴적 속도와 걸린 시간</b><br>같은 두께 <b>' + Math.round(thick) + ' m</b>가 쌓이는 데 걸린 시간은 환경마다 달라요.<br>걸린 시간 = 두께 ÷ 퇴적 속도';
      }
      /* --- type: 부정합의 세 가지 종류 (가 · 나 · 다) --- */
      const tyPane = [-4.2, 0, 4.2].map((x, i) => { const g3 = new THREE.Group(); g3.position.set(x, 0, 0); gTy.add(g3); return g3; });
      const ERO3 = (u) => 0.12 * Math.sin(u * 4.1) + 0.07 * Math.sin(u * 9.3 + 1);
      function mkTyper(k, g3) {
        const W2 = 3.4, Dz = 1.6, clip = [new THREE.Plane(new THREE.Vector3(1, 0, 0), W2 / 2), new THREE.Plane(new THREE.Vector3(-1, 0, 0), W2 / 2)].map((pl) => pl.clone().translate(new THREE.Vector3(g3.position.x, 0, 0)));
        const slab = (col, y0, y1, rotz, yc) => { const m = new THREE.Mesh(new THREE.BoxGeometry(6, Math.abs(y1 - y0), Dz), sdM(col, { clippingPlanes: clip })); m.position.set(0, (y0 + y1) / 2, 0); if (rotz) { const grp = new THREE.Group(); grp.position.set(0, yc || 1.0, 0); grp.rotation.z = rotz; m.position.y -= yc || 1.0; grp.add(m); g3.add(grp); } else g3.add(m); return m; };
        const E0 = 1.5;                                                                                    // 부정합면 높이
        const LOW = (x, h0) => { const g4 = new THREE.Group(); g3.add(g4); return g4; };
        if (k === 'granite') { slab(KCOL.granite, 0, E0, 0); }
        else if (k === 'horizontal') { slab(COL.shale, 0, 0.5, 0); slab(COL.sand, 0.5, 1.0, 0); slab(COL.lime, 1.0, E0, 0); }
        else { const gA = new THREE.Group(); gA.position.set(0, 0.2, 0); gA.rotation.z = 0.5; g3.add(gA); [[COL.shale, -3, -1.5], [COL.sand, -1.5, 0], [COL.lime, 0, 1.5], [COL.shale, 1.5, 3], [COL.sand, 3, 4.5]].forEach(([c, a, b]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(8, b - a, Dz), sdM(c, { clippingPlanes: [new THREE.Plane(new THREE.Vector3(0, -1, 0), E0), new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), clip[0], clip[1]] })); m.position.set(0, (a + b) / 2, 0); gA.add(m); });
          const base2 = new THREE.Mesh(new THREE.BoxGeometry(W2, 0.2, Dz), sdM(COL.shale)); base2.position.set(0, -0.1, 0); g3.add(base2); }
        // 부정합면 위의 새 지층 (수평)
        const up1 = new THREE.Mesh(new THREE.BoxGeometry(W2, 0.45, Dz), sdM(COL.conglo)), up2 = new THREE.Mesh(new THREE.BoxGeometry(W2, 0.45, Dz), sdM(COL.mud)); up1.position.set(0, E0 + 0.225, 0); up2.position.set(0, E0 + 0.675, 0); g3.add(up1, up2);
        const line = new THREE.Mesh(new THREE.BoxGeometry(W2 + 0.1, 0.05, Dz + 0.1), new THREE.MeshBasicMaterial({ color: 0xe11d48 })); line.position.set(0, E0, 0); g3.add(line);
      }
      ['granite', 'horizontal', 'tilted'].forEach((k, i) => mkTyper(k, tyPane[i]));
      const lTy = [0, 1, 2].map((i) => { const l = label(['가', '나', '다'][i], [[-4.2, 0, 0], [0, 0, 0], [4.2, 0, 0]][i].map((v, q) => (q === 1 ? 2.6 : v)), { color: 'rgba(30,41,59,.92)', size: 15 }); l.show(false); return l; }), lTyU = label('부정합면 (붉은 선)', [0, 2.2, 0.9], { color: 'rgba(160,20,50,.95)' }); lTyU.show(false);
      /* --- corr: 층서 대비 --- */
      const crBase = new THREE.Mesh(new THREE.BoxGeometry(11, 0.2, 2.4), sdM(0x475569)); crBase.position.y = -0.1; gCr.add(crBase);
      const CKS = 0.2, CX3 = [-3.6, 0, 3.6];
      const crLayers = [];
      const crW = window.__sim ? window.__sim.CORR_COLS : null;
      const CORR_FALLBACK = null;
      function buildCorr(w) {
        if (crLayers.length) return;
        w.CORR_COLS.forEach((cd, ci) => { let y = 0; cd.layers.forEach((ly, li) => { const h = ly[1] * CKS * 0.55; const m = new THREE.Mesh(new THREE.BoxGeometry(2.2, h - 0.02, 1.6), sdM(KCOL[ly[0]] || 0xaaaaaa)); m.position.set(CX3[ci], y + h / 2, 0); gCr.add(m); crLayers.push({ ci, li, m, key: ly[2] || '', y: y + h / 2, h }); y += h; }); if (cd.unc != null) { } const l = label(cd.name, [CX3[ci], -0.5, 0], { color: 'rgba(30,41,59,.9)' }); l.show(false); crLayers.push({ lab: l }); });
      }
      const crLines = ['tuff', 'amm'].map((k) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 8), new THREE.MeshBasicMaterial({ color: k === 'tuff' ? 0xd97706 : 0x7c3aed })); m.visible = false; gCr.add(m); const m2 = m.clone(); m2.visible = false; gCr.add(m2); return [m, m2]; });
      const crLab = ['tuff', 'amm'].map((k) => { const l = label(k === 'tuff' ? '응회암 키층' : '암모나이트층', [0, 0, 0], { color: k === 'tuff' ? 'rgba(217,119,6,.95)' : 'rgba(124,58,237,.95)' }); l.show(false); return l; });
      const lTri = label('삼엽충 화석층', [0, 0, 0], { color: 'rgba(71,85,105,.92)' }); lTri.show(false);
      function updCorr(w) {
        buildCorr(w); const C = w.S.corr;
        crLayers.forEach((q) => { if (q.lab) { q.lab.show(true); return; } const hl = q.key === 'tuff' || q.key === 'amm', on = hl && (C.target === q.key || C.done[q.key]); q.m.material.emissive.setHex(on ? (q.key === 'tuff' ? 0xb45309 : 0x6d28d9) : hl ? 0x222222 : 0x000000); q.m.material.emissiveIntensity = on ? 0.55 : 0.2; });
        ['tuff', 'amm'].forEach((k, i) => {
          const picks = C.picked[k], pts = crLayers.filter((q) => !q.lab && q.key === k).map((q) => new THREE.Vector3(CX3[q.ci], q.y, 0.9));
          [0, 1].forEach((j) => { const ln = crLines[i][j], a = pts[j], b = pts[j + 1], show = C.done[k] && a && b; ln.visible = !!show; if (show) { const d = b.clone().sub(a); ln.scale.set(1, d.length(), 1); ln.position.copy(a).add(b).multiplyScalar(0.5); ln.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); } });
          crLab[i].show(C.done[k] && !!pts[1]); if (pts[1]) crLab[i].obj = pts[1].toArray();
        });
        const tri = crLayers.filter((q) => !q.lab && q.key === 'tri'); lTri.show(false);
        const done = C.done;
        return '<b>떨어진 세 지역의 지층 대비</b><br>같은 시기에 쌓인 층(키층 · 표준 화석)을 이으면 지층의 나이를 맞춰 볼 수 있어요.<br>응회암 키층 ' + (done.tuff ? '✅ 이었어요' : '⬜ 아직이에요') + ' · 암모나이트층 ' + (done.amm ? '✅ 이었어요' : '⬜') + '<br><span style="color:#9fb0d4">세 지역의 지층 기둥이에요.</span>';
      }
      let scnN = '', lastN = '';
      const NEWV = { box: 1, rate: 1, type: 1, corr: 1 };
      function applyN(v) {
        if (v === scnN) return; const prev = scnN; scnN = v; lastN = '';
        const nw = !!NEWV[v];
        gOld.visible = !nw; gBx.visible = v === 'box'; gRt.visible = v === 'rate'; gTy.visible = v === 'type'; gCr.visible = v === 'corr';
        oldEls.forEach((e) => { e.style.display = nw ? 'none' : ''; });
        pourBtns.r.length && shw(pourBtns, v === 'box'); shw(tiltR, v === 'box'); shw(defB, v === 'box'); shw(rstB, v === 'box'); shw(thickR, v === 'rate');
        [lHz, lBx].forEach((l) => l.show(false)); lLay.forEach((l) => l.show(false)); lRtT.concat(lRtL, lRtH, [lRtS]).forEach((l) => l.show(false)); lTy.forEach((l) => l.show(v === 'type')); lTyU.show(v === 'type'); crLayers.forEach((q) => { if (q.lab) q.lab.show(v === 'corr'); }); crLab.forEach((l) => l.show(false));
        if (nw) { Object.values(LB).forEach((l) => l.show(false)); floor.visible = v !== 'corr' || true; }
        else { scene = null; show(sceneOf()); }   // 관입 · 부정합 장면에 맞는 단추만 다시 보여요
        const o = ctx.orbit;
        if (v === 'box') { o.theta = 0.1; o.phi = 1.4; o.tx = 0; o.ty = -0.2; o.tz = 0; o.dist = PHONE ? 19 : 14; floor.position.y = -BS * 0.66 - 0.5; }
        else if (v === 'rate') { o.theta = 0.2; o.phi = 1.3; o.tx = 0; o.ty = 1.8; o.tz = 0; o.dist = PHONE ? 17 : 12.5; floor.position.y = -0.3; }
        else if (v === 'type') { o.theta = 0.15; o.phi = 1.35; o.tx = 0; o.ty = 1.0; o.tz = 0; o.dist = PHONE ? 21 : 15; floor.position.y = -0.3; }
        else if (v === 'corr') { o.theta = 0.2; o.phi = 1.3; o.tx = 0; o.ty = 1.4; o.tz = 0; o.dist = PHONE ? 19 : 13.5; floor.position.y = -0.3; }
        else { floor.position.y = -0.7; o.tx = 0; o.ty = 1.4; }
      }
      return {
        update(dt) {
          const lw = L2(), vN = lw && lw.S ? lw.S.view : '';
          applyN(NEWV[vN] ? vN : 'old');
          if (NEWV[vN]) {
            const h = vN === 'box' ? updBox(lw) : vN === 'rate' ? updRate(lw) : vN === 'type' ? ((lTy.forEach((l) => l.show(true)), lTyU.show(true), '<b>부정합의 세 가지 종류</b><br>부정합면(붉은 선) 아래의 모습이 가 · 나 · 다마다 달라요. 아래가 화성암인지, 수평한 지층인지, 기울어진 지층인지 살펴봐요.<br><span style="color:#9fb0d4">오른쪽 조작판에서 가 · 나 · 다의 이름을 골라요.</span>')) : updCorr(lw);
            if (h !== lastN) { lastN = h; info(h); }
            return;
          }
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
