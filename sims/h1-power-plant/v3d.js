/* h1-power-plant · 3D 발전소 (열원 → 증기 → 터빈 → 발전기 → 송전 → 도시)
   열원이 물을 끓여 만든 수증기가 터빈을 돌리고, 터빈과 연결된 발전기가 전기를 만들어요.
   화력: 석탄을 태운 열 / 원자력: 핵분열로 나온 열 (제어봉을 넣으면 연쇄 반응이 줄어요). 모든 크기와 배치는 보기 좋게 줄인 모형이에요.
   2D와 같아요: 석탄 투입량(0~60 t/시간)·제어봉(0~100 %)·전기 출력(MW)·열원을 2D 상태에서 그대로 읽고, 3D의 슬라이더는 2D 슬라이더를 바꿔요.
   ▶ 재생: 열원(연료) → 보일러(물을 가열) → 수증기 → 터빈 → 발전기 → 송전, 2D 흐름도의 여섯 단계를 따라가요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);

  window.SciSim3D.attach({
    title: '3D 발전소',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHN ? 25 : 15.5, theta: 0.5, phi: 1.1, target: [1.2, 0.4, -0.4], min: 7, max: 34 },
    autoRotate: 0.1,
    levels: [1, 2],
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3;
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ envMapIntensity: 0.6, color: c, roughness: 0.55, metalness: 0.15 }, o || {}));
      const glass = (c, op) => new THREE.MeshStandardMaterial({ color: c, transparent: true, opacity: op, roughness: 0.15, metalness: 0.1, depthWrite: false, side: THREE.DoubleSide });
      const S0 = (window.__sim && window.__sim.S) || {};
      const st = {
        src: S0.mode === 'nuke' ? 'nuke' : 'coal',
        fuel: S0.coal && typeof S0.coal.fuel === 'number' ? S0.coal.fuel : 30,
        rod: S0.nk && typeof S0.nk.rodSet === 'number' ? S0.nk.rodSet : 0.6, ang: 0, p: 0, pS: 0, t: 0, lastMode: S0.mode,
      };
      const pOf = () => (st.src === 'coal' ? st.fuel / 60 : 0.5);

      /* ---------- 바닥 ---------- */
      const base = new THREE.Mesh(new THREE.BoxGeometry(17.5, 0.3, 9.5), new THREE.MeshLambertMaterial({ color: 0x3a4560 })); base.position.set(1.2, -1.3, -0.4); base.receiveShadow = true; root.add(base);
      const pad = new THREE.Mesh(new THREE.BoxGeometry(11.6, 0.12, 3), mat(0x8a93a6, { roughness: 0.9, metalness: 0 })); pad.position.set(-0.5, -1.08, 0); pad.receiveShadow = true; root.add(pad);

      /* ---------- 터빈 + 발전기 (같은 축에 연결) ---------- */
      const SX0 = -1.8;
      const tCase = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 2.3, 36, 1, true), glass(0xaec7e6, 0.18)); tCase.rotation.z = Math.PI / 2; tCase.position.set(-0.55, 0, 0); root.add(tCase);
      [-1.7, 0.6].forEach((x) => { const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.03, 1.03, 0.1, 36), mat(0x5a6a85, { metalness: 0.5 })); cap.rotation.z = Math.PI / 2; cap.position.set(x, 0, 0); root.add(cap); });
      const shaft = new THREE.Group(); root.add(shaft);
      const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 6.6, 16), mat(0xaab4c6, { metalness: 0.75, roughness: 0.3 })); sh.rotation.z = Math.PI / 2; sh.position.x = 1.0; shaft.add(sh);
      for (let k = 0; k < 5; k++) {
        const disc = new THREE.Group(), r = 0.5 + k * 0.1; disc.position.x = -1.45 + k * 0.42;
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.08, 18), mat(0x7b8aa6, { metalness: 0.6 })); hub.rotation.z = Math.PI / 2; disc.add(hub);
        for (let i = 0; i < 14; i++) {
          const a = i / 14 * Math.PI * 2, bl = new THREE.Mesh(new THREE.BoxGeometry(0.05, r - 0.2, 0.2), mat(0xcfd8e8, { metalness: 0.7, roughness: 0.25 }));
          bl.position.set(0, Math.cos(a) * (r + 0.2) / 2, Math.sin(a) * (r + 0.2) / 2); bl.rotation.x = a; bl.rotation.y = 0.35; disc.add(bl);
        }
        shaft.add(disc);
      }
      // 발전기
      const gx = 3.0;
      const gCase = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 2.1, 40, 1, true), glass(0xcfd6e4, 0.2)); gCase.rotation.z = Math.PI / 2; gCase.position.set(gx, 0, 0); root.add(gCase);
      [gx - 1.05, gx + 1.05].forEach((x) => { const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.18, 0.1, 40), mat(0x5a6a85, { metalness: 0.5 })); cap.rotation.z = Math.PI / 2; cap.position.set(x, 0, 0); root.add(cap); });
      for (let i = 0; i < 4; i++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.07, 10, 40), mat(0xe39a45, { metalness: 0.6, roughness: 0.35 })); ring.rotation.y = Math.PI / 2; ring.position.set(gx - 0.6 + i * 0.4, 0, 0); root.add(ring); }
      const rotor = new THREE.Group(); rotor.position.x = gx; shaft.add(rotor);
      const nH = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 1.6, 28, 1, false, 0, Math.PI), mat(0xe2464b, { roughness: 0.4 })), sH = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 1.6, 28, 1, false, Math.PI, Math.PI), mat(0x3b6ff0, { roughness: 0.4 }));
      nH.rotation.z = sH.rotation.z = Math.PI / 2; rotor.add(nH, sH);
      label('터빈', [-0.55, 1.2, 0], { size: 13 }); label('발전기', [gx, 1.5, 0], { size: 13 });

      /* ---------- 열원: 석탄 보일러 ---------- */
      const gCoal = new THREE.Group(); root.add(gCoal);
      const furn = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.5, 1.7), mat(0x7a4b3b, { roughness: 0.85 })); furn.position.set(-4.4, -0.45, 0); furn.castShadow = true; gCoal.add(furn);
      const boil = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 2.2, 30), mat(0xc5cddd, { metalness: 0.7, roughness: 0.3 })); boil.rotation.z = Math.PI / 2; boil.position.set(-4.4, 0.9, 0); boil.castShadow = true; gCoal.add(boil);
      const chim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 3.4, 20), mat(0x8a8f9c)); chim.position.set(-5.4, 0.2, -0.5); gCoal.add(chim);
      const coalPile = new THREE.Group(); coalPile.position.set(-4.4, -1.0, 1.25);
      for (let i = 0; i < 16; i++) { const c = new THREE.Mesh(new THREE.DodecahedronGeometry(0.14 + (i % 3) * 0.04, 0), mat(0x2b2f3a, { roughness: 0.4, metalness: 0.2 })); c.position.set(((i % 4) - 1.5) * 0.26, (i % 3) * 0.1 + Math.floor(i / 8) * 0.16, (Math.floor(i / 4) % 2) * 0.2); c.rotation.set(i, i * 2, i * 3); coalPile.add(c); }
      gCoal.add(coalPile);
      const flames = []; for (let i = 0; i < 5; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.7, 10), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffd23f : 0xff6a1a, transparent: true, opacity: 0.9 })); f.position.set(-4.4 + (i - 2) * 0.28, -0.45, 0.86); f.userData.ph = i; gCoal.add(f); flames.push(f); }
      const glowF = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.9, 0.05), new THREE.MeshBasicMaterial({ color: 0xff7a25, transparent: true, opacity: 0.55 })); glowF.position.set(-4.4, -0.45, 0.86); gCoal.add(glowF);
      const smokes = []; for (let i = 0; i < 8; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), new THREE.MeshBasicMaterial({ color: 0x8b93a3, transparent: true, opacity: 0.4, depthWrite: false })); s.userData.ph = i / 8; gCoal.add(s); smokes.push(s); }
      const coalLab = [label('석탄', coalPile, { size: 12, offset: [0, 0.5, 0.2] }), label('보일러', [-4.4, 1.6, 0], { size: 12.5 })];

      /* ---------- 열원: 원자로 ---------- */
      const gNuke = new THREE.Group(); root.add(gNuke);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(1.55, 36, 20, 0, Math.PI * 2, 0, Math.PI / 2), glass(0xb7c4da, 0.2)); dome.position.set(-4.4, -1.1, 0); gNuke.add(dome);
      const wallN = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.55, 0.05, 36), mat(0x6a7690)); wallN.position.set(-4.4, -1.12, 0); gNuke.add(wallN);
      const vessel = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 1.9, 32), glass(0x4ea3ff, 0.32)); vessel.position.set(-4.4, -0.1, 0); gNuke.add(vessel);
      const rods = [], ctrl = [], rodsGrp = new THREE.Group(); rodsGrp.position.set(-4.4, -0.1, 0); gNuke.add(rodsGrp);
      const fuelM = mat(0xffa21a, { emissive: 0xff7a00, emissiveIntensity: 0.6, roughness: 0.35 });
      [[-0.45, -0.25], [0, -0.45], [0.45, -0.25], [-0.45, 0.25], [0, 0.45], [0.45, 0.25], [0, 0]].forEach((q, i) => {
        const f = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.55, 16), fuelM); f.position.set(q[0], 0, q[1]); rodsGrp.add(f); rods.push(f);
      });
      [[-0.22, 0], [0.22, 0.2], [0.22, -0.2]].forEach((q) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 1.7, 14), mat(0x3a4052, { roughness: 0.3, metalness: 0.7 })); c.position.set(q[0], 0, q[1]); c.userData.y0 = 0.95; rodsGrp.add(c); ctrl.push(c); });
      const neus = []; for (let i = 0; i < 14; i++) { const n = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff })); n.userData = { ph: Math.random() * 6.28, r: 0.15 + Math.random() * 0.55, sp: 1.5 + Math.random() * 2 }; rodsGrp.add(n); neus.push(n); }
      const cool = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 2.3, 16), mat(0xaab4c6, { metalness: 0.6 })); cool.rotation.z = Math.PI / 2; cool.position.set(-3.1, 0.45, 0); gNuke.add(cool);
      const nukeLab = [label('원자로', vessel, { size: 12.5, offset: [0, 1.3, 0] }), label('제어봉', ctrl[0], { size: 12, offset: [-0.4, 1.05, 0] }), label('핵연료', rods[2], { size: 12, offset: [1.0, 0.1, 0] })];

      /* ---------- 증기 · 응축 (냉각탑) ---------- */
      const pipeM = mat(0xaab4c6, { metalness: 0.7, roughness: 0.3 });
      const pipe1 = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new V3(-3.3, 0.9, 0), new V3(-2.6, 0.9, 0), new V3(-2.1, 0.55, 0), new V3(-1.75, 0.35, 0)], false, 'catmullrom', 0.1), 24, 0.14, 12, false), pipeM); root.add(pipe1);
      const steamPath = new THREE.CatmullRomCurve3([new V3(-3.4, 0.9, 0), new V3(-2.6, 0.9, 0), new V3(-2.1, 0.55, 0), new V3(-1.7, 0.1, 0)], false, 'catmullrom', 0.1);
      const puffs = []; for (let i = 0; i < 12; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), new THREE.MeshBasicMaterial({ color: 0xf1f6ff, transparent: true, opacity: 0.8, depthWrite: false })); m.userData.ph = i / 12; root.add(m); puffs.push(m); }
      const pipe2 = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new V3(0.1, -0.95, 0), new V3(0.1, -1.0, -0.5), new V3(0.1, -0.9, -2.0), new V3(0.1, -0.7, -2.7)], false, 'catmullrom', 0.1), 24, 0.12, 12, false), pipeM); root.add(pipe2);
      const tw = new THREE.Mesh(new THREE.LatheGeometry([[1.15, 0], [0.92, 0.9], [0.8, 1.6], [0.78, 2.1], [0.92, 2.9], [1.0, 3.2]].map((a) => new THREE.Vector2(a[0], a[1] - 1.1)), 40), mat(0xd9dee8, { roughness: 0.85, metalness: 0, side: THREE.DoubleSide })); tw.position.set(0.1, 0, -3.0); tw.castShadow = true; root.add(tw);
      const towerSteam = []; for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false })); m.userData.ph = i / 8; root.add(m); towerSteam.push(m); }
      label('냉각탑 (수증기가 물로)', [0.1, 1.9, -3.0], { size: 11.5 });

      /* ---------- 송전탑 · 도시 ---------- */
      const pyl = new THREE.Group(); pyl.position.set(5.6, -1.15, 0);
      [[-0.28, -0.28], [0.28, -0.28], [-0.28, 0.28], [0.28, 0.28]].forEach((q) => { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 3.4, 6), mat(0x9aa3b2, { metalness: 0.6 })); leg.position.set(q[0] * 0.5, 1.7, q[1] * 0.5); leg.rotation.set(q[1] * 0.12, 0, -q[0] * 0.12); pyl.add(leg); });
      [0.8, 1.7, 2.5].forEach((y) => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.5 - y * 0.08, 0.04, 0.04), mat(0x9aa3b2, { metalness: 0.6 })); b.position.y = y; pyl.add(b); });
      const arm = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.07, 0.07), mat(0x9aa3b2, { metalness: 0.6 })); arm.position.y = 3.3; pyl.add(arm); root.add(pyl);
      const houses = [], wins = [];
      [[7.2, 0.6], [7.4, -1.0], [6.6, 1.9], [7.9, 1.4], [6.8, -2.2]].forEach((q, i) => {
        const h = new THREE.Group(), w = 0.9 + (i % 2) * 0.25, hh = 0.7 + (i % 3) * 0.28;
        const body = new THREE.Mesh(new THREE.BoxGeometry(w, hh, 0.8), mat([0xe8e0d0, 0xd9d2e6, 0xe6d6d0, 0xd2e2e6, 0xe6e2c8][i])); body.position.y = hh / 2; body.castShadow = true; h.add(body);
        const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.62, 0.4, 4), mat(0xa9543d, { roughness: 0.8 })); roof.rotation.y = Math.PI / 4; roof.position.y = hh + 0.22; roof.castShadow = true; h.add(roof);
        for (let k = 0; k < 2; k++) { const wm = new THREE.MeshStandardMaterial({ color: 0x2a3550, emissive: 0xffd466, emissiveIntensity: 0, roughness: 0.3 }); const wd = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.26), wm); wd.position.set(-w * 0.22 + k * w * 0.44, hh * 0.55, 0.405); h.add(wd); wins.push(wm); }
        h.position.set(q[0], -1.15, q[1]); h.rotation.y = -0.2 + i * 0.3; root.add(h); houses.push(h);
      });
      // 전선
      const wm2 = mat(0x2a2f3a, { metalness: 0.4 });
      houses.forEach((h) => { const a = new V3(5.6, 2.1, 0), b = new V3(h.position.x, 0.6, h.position.z), mid = a.clone().lerp(b, 0.5); mid.y -= 0.35; root.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, mid, b), 24, 0.015, 5, false), wm2)); });
      // 발전기 → 송전탑 전선
      const cA = new V3(gx + 1.15, 0, 0), cB = new V3(5.3, 2.1, 0);
      root.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(cA, new V3(4.6, 0.6, 0), cB), 24, 0.04, 6, false), wm2));
      const bolts = []; for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe14d })); b.userData.ph = i / 6; root.add(b); bolts.push(b); }
      const boltPath = new THREE.QuadraticBezierCurve3(cA, new V3(4.6, 0.6, 0), cB);
      label('송전', [4.5, 1.0, 0], { size: 12.5 }); label('도시', [7.2, 0.8, 0.6], { size: 12.5 });

      /* ---------- 조작 ---------- */
      const L2 = () => (ctx.lesson && ctx.lesson()) || null;
      let rngF, rngR, seg, internal = true;
      const probe = controls.text(''); probe.style.display = 'none'; const ctlRow = probe.parentElement;
      const grab = (fn) => { const before = new Set(ctlRow.children); fn(); return Array.from(ctlRow.children).filter((c) => !before.has(c)); };
      var gSeg = grab(() => { seg = controls.segment('열원', [{ value: 'coal', label: '🔥 화력 (석탄)' }, { value: 'nuke', label: '☢ 원자력' }], st.src, (v) => {
        st.src = v; const L = L2(); if (L && L.S && (L.S.mode === 'coal' || L.S.mode === 'nuke') && L.setScene) L.setScene(v); show();
      }); });
      const gF = grab(() => { rngF = controls.range('석탄 투입량', 0, 60, 0.5, st.fuel, (v) => { st.fuel = v; const el = document.getElementById('sFuel'); if (el) { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); } show(true); }, (v) => v + ' t/시간'); });
      const gR = grab(() => { rngR = controls.range('제어봉', 0, 100, 5, Math.round(st.rod * 100), (v) => { st.rod = v / 100; const L = L2(); if (L && L.setRod) L.setRod(v / 100); show(true); }, (v) => v + '% 넣음'); });

      /* ▶ 재생: 발전소 흐름도 (열원 → 보일러 → 수증기 → 터빈 → 발전기 → 송전) */
      const STG = [
        { n: '열원(연료)', c: () => (st.src === 'coal' ? new V3(-4.4, -0.8, 0.3) : new V3(-4.4, -0.1, 0)) }, { n: '보일러(물을 가열)', c: () => new V3(-4.4, 0.9, 0) },
        { n: '수증기', c: () => new V3(-2.4, 0.7, 0) }, { n: '터빈', c: () => new V3(-0.55, 0, 0) }, { n: '발전기', c: () => new V3(gx, 0, 0) }, { n: '송전', c: () => new V3(5.6, 2.1, 0) },
      ];
      const mk = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffe14d, transparent: true, depthTest: false })); mk.renderOrder = 9; mk.visible = false; root.add(mk);
      const mkRing = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.04, 8, 28), new THREE.MeshBasicMaterial({ color: 0xffe14d, transparent: true, depthTest: false })); mkRing.renderOrder = 9; mkRing.visible = false; root.add(mkRing);
      const mkLab = label('', mk, { size: 12.5, color: '#b45309', offset: [0, 0.8, 0] }); mkLab.show(false);
      let flowP = null, tmpV = new V3();
      const gP = grab(() => {
        flowP = controls.player({
          duration: 12, loop: true, label: '발전 과정',
          phases: STG.map((q, i) => [i / 6, q.n]),
          onFrame(p) { if (!internal) { mk.visible = mkRing.visible = true; } placeMk(p); },
        });
      });
      function placeMk(p) {
        const f = p * 6, i = Math.min(5, Math.floor(f)), u = f - i, a = STG[i].c(), b = STG[Math.min(5, i + 1)].c();
        const e = u < 0.4 ? 0 : (u - 0.4) / 0.6, k = e * e * (3 - 2 * e);
        mk.position.copy(a).lerp(b, i === 5 ? 0 : k); mkRing.position.copy(mk.position);
        mkLab.set(STG[i].n); mkLab.show(mk.visible);
        const fade = p > 0.97 ? (1 - p) / 0.03 : p < 0.03 ? p / 0.03 : 1; mk.material.opacity = mkRing.material.opacity = Math.max(0.05, fade);
      }
      internal = false; mk.visible = mkRing.visible = false;
      function show(soft) {
        const c = st.src === 'coal';
        gCoal.visible = c; gNuke.visible = !c; coalLab.forEach((l) => l.show(c)); nukeLab.forEach((l) => l.show(!c));
        { const L = L2(), fixed = !!(L && L.S && (L.S.mode === 'coal' || L.S.mode === 'nuke')); gSeg.forEach((e) => { e.style.display = fixed ? 'none' : ''; }); }   // 화력 · 원자력 단계는 그 열원만 다뤄요 (2D처럼 다른 발전소로 넘어가지 않게)
        gF.forEach((e) => { e.style.display = c ? '' : 'none'; }); gR.forEach((e) => { e.style.display = c ? 'none' : ''; });
      }
      show();
      const setInfo = (h) => { if (h !== setInfo.h) { setInfo.h = h; info(h); } };

      return {
        update(dt, t) {
          st.t += dt;
          const L = L2(), S = L && L.S;
          if (S && S.mode !== st.lastMode) { st.lastMode = S.mode; if (S.mode === 'coal' || S.mode === 'nuke') { st.src = S.mode; seg.set(S.mode); show(); } }
          let pw = pOf();
          if (S) {
            st.fuel = S.coal.fuel; st.rod = S.nk.rodSet;
            if (Math.abs(rngF.value - st.fuel) > 0.01) rngF.set(st.fuel);
            if (Math.abs(rngR.value - Math.round(st.rod * 100)) > 0.5) rngR.set(Math.round(st.rod * 100));
            pw = st.src === 'coal' ? Math.max(0, Math.min(1, S.coal.Q / (60 * L.FUEL_MW))) : Math.max(0, Math.min(1, S.nk.n));
            if (st.src === 'coal') setInfo('<b>석탄 → 열 → 수증기 → 터빈 → 발전기 → 전기</b><br>석탄 ' + st.fuel + ' t/시간 → 전기 출력 <b>' + Math.round(L.coalP()) + ' MW</b> (목표 100 MW). 많이 태울수록 터빈이 빨리 돌아요.');
            else setInfo('<b>핵분열 → 열 → 수증기 → 터빈 → 발전기 → 전기</b><br>제어봉 <b>' + Math.round(S.nk.rod * 100) + ' %</b> 넣음 → 전기 출력 <b>' + L.nkP() + ' MW</b> (정격 1000 MW). 제어봉을 넣으면 연쇄 반응이 줄어요.');
          } else setInfo(st.src === 'coal' ? '<b>석탄 → 열 → 수증기 → 터빈 → 발전기 → 전기</b>' : '<b>핵분열 → 열 → 수증기 → 터빈 → 발전기 → 전기</b>');
          if (flowP && (flowP.playing || mk.visible)) { internal = true; placeMk(flowP.p); internal = false; if (!flowP.playing && !mk.visible) mkLab.show(false); }
          st.pS += (pw - st.pS) * Math.min(1, dt * 2.2);
          const p = st.pS, w = p * 7; st.ang += w * dt;
          shaft.rotation.x = st.ang;
          // 증기
          puffs.forEach((m) => { const u = (st.t * (0.25 + p * 0.5) + m.userData.ph) % 1; m.position.copy(steamPath.getPointAt(u)); m.visible = p > 0.03; m.scale.setScalar(0.6 + u * 0.8 + p * 0.5); m.material.opacity = 0.35 + p * 0.5; });
          towerSteam.forEach((m) => { const u = (st.t * 0.18 + m.userData.ph) % 1; m.position.set(0.1 + Math.sin(u * 5 + m.userData.ph * 6) * 0.15, 2.1 + u * 2.2, -3.0); m.scale.setScalar(0.6 + u * 1.4); m.material.opacity = (1 - u) * 0.38 * (0.2 + p); });
          // 전류
          bolts.forEach((b) => { const u = (st.t * (0.2 + p * 0.5) + b.userData.ph) % 1; b.position.copy(boltPath.getPoint(u)); b.visible = p > 0.03; });
          wins.forEach((wm) => { wm.emissiveIntensity += (p * 1.6 - wm.emissiveIntensity) * Math.min(1, dt * 3); });
          if (st.src === 'coal') {
            const f = st.fuel / 60;
            flames.forEach((m) => { const u = m.userData; m.visible = f > 0.02; m.scale.set(0.5 + f * 0.9, (0.4 + f * 1.1) * (0.85 + Math.sin(t * 9 + u.ph * 2) * 0.15), 0.5 + f * 0.9); m.position.y = -0.8 + (0.4 + f * 1.1) * 0.35; });
            glowF.material.opacity = 0.15 + f * 0.6; glowF.visible = f > 0.02;
            smokes.forEach((s) => { const u = (st.t * 0.2 + s.userData.ph) % 1; s.position.set(-5.4 + Math.sin(u * 4 + s.userData.ph * 6) * 0.1 + u * 0.4, 1.9 + u * 2.4, -0.5); s.scale.setScalar(0.5 + u * 1.5); s.material.opacity = (1 - u) * 0.35 * (0.2 + f); });
          } else {
            const rr = S ? S.nk.rod : st.rod; ctrl.forEach((c) => { c.position.y = 0.95 - rr * 1.15 + 0.2; });
            rods.forEach((r) => { r.material.emissiveIntensity = 0.2 + p * 1.0; });
            neus.forEach((n) => { const u = n.userData, a = t * u.sp + u.ph; n.position.set(Math.cos(a) * u.r, Math.sin(a * 1.7) * 0.7, Math.sin(a * 1.3) * u.r); n.visible = (u.ph / 6.28) < 0.2 + p * 0.8; });
          }
        },
        sync() {},
      };
    },
  });
})();
