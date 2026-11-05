/* h1-induction · 3D 전자기 유도와 간이 발전기
   ① 막대자석을 코일에 넣었다 뺐다 하면 코일을 지나는 자기장이 변해 유도 전류가 흘러요 (멈추면 전류 없음, 방향은 들어갈 때와 나올 때 반대).
   ② 자석을 코일 안에서 돌리면 코일을 지나는 자기장이 계속 변해 전류 방향이 번갈아 바뀌고, 반대로 연결한 LED가 번갈아 켜져요.
   2D 실험의 상태(window.__sim)를 그대로 따라가요: 자석의 위치·극, 검류계 바늘, 자석 수·코일 감은 수(세기 요인), 간이 발전기의 회전 속도·LED.
   3D의 [넣기/빼기]·위치 슬라이더·▶ 재생·회전 속도는 2D를 바꿔요. 수식(패러데이·렌츠 법칙)은 다루지 않고 관찰 사실로만 보여 줘요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const NC = 0xe2464b, SC = 0x3b6ff0, COPPER = 0xe39a45;

  window.SciSim3D.attach({
    title: '3D 전자기 유도 · 발전기',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHN ? 16 : 10.5, theta: 0.35, phi: 1.1, target: [0, -0.4, 0], min: 6, max: 28 },
    autoRotate: 0,
    levels: [0, 2],
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3;
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ envMapIntensity: 0.6, color: c, roughness: 0.5, metalness: 0.15 }, o || {}));
      const S0 = (window.__sim && window.__sim.S) || {};
      const st = { scene: S0.mode === 'gen' ? 'gen' : 'mag', x: -4.6, auto: false, at: 0, vel: 0, emf: 0, prevX: -4.6, rps: 1.5, n: 1, phi: 0.6, ledA: 0, ledB: 0, flowT: 0 };

      /* ---------- 코일 (x축 방향 나선) ---------- */
      const CR = 1.25, CL = 2.6;
      let NT = 9;   // 코일 감은 수 (2D: 100회 = 9바퀴로 그려요, 50회 · 200회도 같은 비율)
      const coilMat = mat(COPPER, { metalness: 0.55, roughness: 0.32 });
      const coil = new THREE.Group(); root.add(coil);
      function buildCoil(n) {
        NT = n; while (coil.children.length) { const c = coil.children[0]; coil.remove(c); c.geometry.dispose(); }
        const pts = [];
        for (let i = 0; i <= NT * 36; i++) { const s = i / 36; pts.push(new V3(-CL / 2 + CL * s / NT, CR * Math.cos(s * Math.PI * 2), CR * Math.sin(s * Math.PI * 2))); }
        const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), Math.max(120, NT * 36), 0.075, 8, false), coilMat);
        tube.castShadow = true; coil.add(tube);
      }
      buildCoil(NT);
      const wireM = mat(COPPER, { metalness: 0.5, roughness: 0.35 });
      const wire = (pts, par) => { const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0), 40, 0.05, 8, false), wireM); (par || root).add(m); return m; };

      /* ---------- 막대자석 ---------- */
      function bar(len, th) {
        const g = new THREE.Group();
        const n = new THREE.Mesh(new THREE.BoxGeometry(len / 2, th, th), mat(NC, { roughness: 0.4 })); n.position.x = len / 4;
        const s = new THREE.Mesh(new THREE.BoxGeometry(len / 2, th, th), mat(SC, { roughness: 0.4 })); s.position.x = -len / 4;
        n.castShadow = s.castShadow = true; g.add(n, s); return g;
      }

      /* ================== ① 자석 + 코일 + 검류계 ================== */
      const gMag = new THREE.Group(); root.add(gMag);
      const magnet = bar(2.6, 0.8); gMag.add(magnet);
      const magN = label('N', magnet, { size: 13, color: '#e2464b', offset: [1.0, 0.75, 0] });
      const magS = label('S', magnet, { size: 13, color: '#3b6ff0', offset: [-1.0, 0.75, 0] });
      const coilLab = label('코일', [0, 1.6, 0], { size: 13 });
      // 검류계 (원형 계기판 + 바늘)
      const gal = new THREE.Group(); gal.position.set(0, -2.5, 0.2); gMag.add(gal);
      const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.22, 48), mat(0xf4f6fb, { roughness: 0.4, metalness: 0.0 })); dial.rotation.x = Math.PI / 2; gal.add(dial);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.07, 12, 48), mat(0x56627a, { metalness: 0.6, roughness: 0.3 })); rim.position.z = 0.1; gal.add(rim);
      for (let i = -5; i <= 5; i++) {
        const a = Math.PI / 2 - i * 0.26, t = new THREE.Mesh(new THREE.BoxGeometry(i === 0 ? 0.05 : 0.025, i === 0 ? 0.22 : 0.13, 0.02), mat(0x394257));
        t.position.set(Math.cos(a) * 0.72, Math.sin(a) * 0.72 - 0.15, 0.125); t.rotation.z = a - Math.PI / 2; gal.add(t);
      }
      const needleG = new THREE.Group(); needleG.position.set(0, -0.15, 0.15); gal.add(needleG);
      const needle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.85, 0.03), mat(0xd33a3a, { roughness: 0.4 })); needle.position.y = 0.4; needleG.add(needle);
      const hub = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), mat(0x394257)); hub.position.z = 0.02; needleG.add(hub);
      const galL = label('검류계', gal, { size: 12, offset: [0, -1.35, 0] });
      // 코일 - 검류계 도선
      const wm = [
        [new V3(-CL / 2, CR, 0), new V3(-CL / 2 - 0.5, CR, 0), new V3(-CL / 2 - 0.5, -2.5, 0.2), new V3(-0.95, -2.5, 0.2)],
        [new V3(CL / 2, CR * Math.cos(NT * Math.PI * 2), CR * Math.sin(NT * Math.PI * 2)), new V3(CL / 2 + 0.5, CR, 0), new V3(CL / 2 + 0.5, -2.5, 0.2), new V3(0.95, -2.5, 0.2)],
      ];
      wm.forEach((p) => wire(p, gMag));
      // 전류 방향 화살촉 (코일 감긴 방향을 따라 움직여요)
      const flow = [];
      for (let i = 0; i < 16; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3, 10), new THREE.MeshBasicMaterial({ color: 0xffe14d })); c.visible = false; root.add(c); flow.push(c); }

      /* ================== ② 간이 발전기 ================== */
      const gGen = new THREE.Group(); root.add(gGen);
      const spin = new THREE.Group(); gGen.add(spin);
      const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 12), mat(0x9aa3b2, { metalness: 0.7, roughness: 0.3 })); spin.add(axle);
      const mA = bar(2.0, 0.55); mA.position.y = 0.3; spin.add(mA);
      const mB = bar(2.0, 0.55); mB.position.y = -0.3; spin.add(mB);
      // 손잡이
      const crank = new THREE.Group(); crank.position.y = 1.35; spin.add(crank);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.1), mat(0x9aa3b2, { metalness: 0.6 })); arm.position.x = 0.45; crank.add(arm);
      const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.4, 14), mat(0xf59e0b, { roughness: 0.4 })); knob.position.set(0.9, 0.2, 0); crank.add(knob);
      const genN = label('N', mA, { size: 12, color: '#e2464b', offset: [1.0, 0.5, 0] });
      const genLab = label('돌리는 자석', [0, 1.85, 0], { size: 12 });
      // 두 LED (서로 반대 방향)
      const BY = -2.6;
      const wA = new V3(-CL / 2 - 0.5, BY, 0), wB = new V3(CL / 2 + 0.5, BY, 0);
      const wgen = [
        wire([new V3(-CL / 2, CR, 0), new V3(-CL / 2 - 0.5, CR, 0), wA.clone()], gGen),
        wire([new V3(CL / 2, CR * Math.cos(NT * Math.PI * 2), CR * Math.sin(NT * Math.PI * 2)), new V3(CL / 2 + 0.5, CR, 0), wB.clone()], gGen),
      ];
      function branch(z, dir) {
        wire([wA.clone(), new V3(wA.x, BY, z), new V3(-0.5, BY, z)], gGen); wire([new V3(0.5, BY, z), new V3(wB.x, BY, z), wB.clone()], gGen);
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.34, 24, 18), mat(dir > 0 ? 0xff6b6b : 0x6bdc8c, { transparent: true, opacity: 0.88, emissive: dir > 0 ? 0xff3b3b : 0x35d46f, emissiveIntensity: 0, roughness: 0.25, metalness: 0 }));
        bulb.position.set(0, BY, z);
        const tri = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.3, 3), mat(0x2a2f3a)); tri.rotation.z = -Math.PI / 2 * dir; tri.position.set(0, BY, z);
        const bar2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.32, 0.18), mat(0x2a2f3a)); bar2.position.set(0.17 * dir, BY, z);
        gGen.add(bulb, tri, bar2); return { bulb };
      }
      const ledA = branch(0.95, 1), ledB = branch(-0.95, -1);
      const led1L = label('LED 1', [0, BY, 0.95], { size: 11.5, offset: [0, -0.6, 0.2] });
      const led2L = label('LED 2', [0, BY, -0.95], { size: 11.5, offset: [0, -0.6, -0.2] });

      /* ---------- 바닥 ---------- */
      const base = new THREE.Mesh(new THREE.CylinderGeometry(5.4, 5.6, 0.3, 48), new THREE.MeshLambertMaterial({ color: 0x2d3547 })); base.position.y = -3.4; base.receiveShadow = true; root.add(base);

      /* ---------- 조작 (2D를 대신 눌러 줘요) ---------- */
      const L2 = () => (ctx.lesson && ctx.lesson()) || null;
      const probe = controls.text(''); probe.style.display = 'none'; const ctlRow = probe.parentElement;
      const grab = (fn) => { const before = new Set(ctlRow.children); fn(); return Array.from(ctlRow.children).filter((c) => !before.has(c)); };
      let rngX, plM, rngS, internal = true;
      const magB = [];
      const gMag1 = grab(() => {
        magB.push(controls.button('▶ 코일에 넣기', () => { const L = L2(); if (L && L.S.mode === 'obs') L.startAuto(1, 1); }));
        magB.push(controls.button('◀ 빼기', () => { const L = L2(); if (L && L.S.mode === 'obs') L.startAuto(-1, 1); }));
        controls.button('🔄 자석 극 바꾸기', () => { const L = L2(); if (L && L.flipPole) L.flipPole(); });
        magB.push(controls.button('📏 측정하기', () => { const L = L2(); if (L && L.measure) L.measure(); }));
        rngX = controls.range('자석 위치', 0, 100, 1, 0, (v) => { const L = L2(); if (!L || L.S.run || L.S.auto) return; L.S.drag = null; L.S.xm = L.XMIN + (L.XMAX - L.XMIN) * v / 100; if (!internal) plM.pause(); }, (v) => (v >= 98 ? '코일 안' : v <= 2 ? '코일에서 멀리' : v + ' %'));
        plM = controls.player({
          duration: 8, loop: true, label: '넣었다 뺐다',
          phases: [[0, '자석을 넣어요'], [0.42, '코일 속에서 멈춤'], [0.58, '자석을 빼요']],
          onFrame(p) { if (internal) return; const L = L2(); if (!L || L.S.run || L.S.auto) return; const u = p < 0.42 ? p / 0.42 : p < 0.58 ? 1 : 1 - (p - 0.58) / 0.42; const e = u * u * (3 - 2 * u); L.S.drag = null; L.S.xm = L.XMIN + (L.XMAX - L.XMIN) * e; },
        });
      });
      const gGen1 = grab(() => {
        rngS = controls.range('돌리는 속도', 0, 4, 0.25, 2, (v) => { const el = document.getElementById('sRev'); if (el) { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); } }, (v) => v.toFixed(2).replace(/0$/, '') + ' 회/초');
      });
      internal = false;
      function showScene() {
        const mag = st.scene === 'mag';
        gMag.visible = mag; gGen.visible = !mag;
        magN.show(mag); magS.show(mag); coilLab.show(true);
        genN.show(!mag); genLab.show(!mag); led1L.show(!mag); led2L.show(!mag); galL.show(mag);
        gMag1.forEach((e) => { e.style.display = mag ? '' : 'none'; }); gGen1.forEach((e) => { e.style.display = mag ? 'none' : ''; });
      }
      mB.visible = false; const mC = bar(2.6, 0.8); mC.visible = false; gMag.add(mC);
      showScene();

      /* ---------- 갱신 ---------- */
      const flux = (x) => Math.exp(-(x / 1.9) * (x / 1.9));      // 코일을 지나는 자기장(자석이 코일 가운데일 때 가장 커요)
      const tmp = new V3();
      function helixAt(s, out) { const a = s * Math.PI * 2; return out.set(-CL / 2 + CL * s / NT, CR * Math.cos(a), CR * Math.sin(a)); }

      const setInfo = (h) => { if (h !== setInfo.h) { setInfo.h = h; info(h); } };
      let sceneOf = (S) => (S && S.S && S.S.mode === 'gen' || S && S.S && S.S.mode === 'conv' ? 'gen' : 'mag');
      return {
        update(dt, t) {
          const L = L2(), S = L && L.S;
          if (S) { const sc = sceneOf(L); if (sc !== st.scene) { st.scene = sc; showScene(); } }
          if (st.scene === 'mag') {
            const lab = S && S.mode === 'lab', cfg = lab ? S.cfg : { mg: 1, tn: 100 };
            const turns = Math.max(3, Math.round(9 * cfg.tn / 100)); if (turns !== NT) buildCoil(turns);
            mB.visible = false; mC.visible = cfg.mg === 2; mC.position.set(st.x, 0.85, 0);
            if (S) {
              st.x = -4.6 + 4.6 * (S.xm - L.XMIN) / (L.XMAX - L.XMIN);
              const pct = Math.round(100 * (S.xm - L.XMIN) / (L.XMAX - L.XMIN)); if (Math.abs(rngX.value - pct) > 0.5) rngX.set(pct);
              st.pol = S.pol;
              const busy = !!(S.run || S.auto);
              magB[0].disabled = magB[1].disabled = busy || S.mode !== 'obs'; magB[2].style.display = lab ? '' : 'none'; magB[0].style.display = magB[1].style.display = lab ? 'none' : '';
              if (!S.run && !S.auto) { internal = true; const u = (S.xm - L.XMIN) / (L.XMAX - L.XMIN); if (!plM.playing) plM.set(u * 0.42 > 0 ? Math.min(0.42, u * 0.42) : 0); internal = false; }
            }
            const pol = S ? S.pol : 1;
            magnet.position.set(st.x, 0, 0); magnet.rotation.y = pol < 0 ? Math.PI : 0; mC.rotation.y = magnet.rotation.y;
            magN.off = [pol < 0 ? -1.0 : 1.0, 0.75, 0]; magS.off = [pol < 0 ? 1.0 : -1.0, 0.75, 0];
            const e = S ? Math.max(-1, Math.min(1, S.needle.value / 10)) : 0;
            needleG.rotation.z += (-e * 1.25 - needleG.rotation.z) * Math.min(1, dt * 18);
            const on = Math.abs(e) > 0.04, dirS = e > 0 ? 1 : -1;
            st.flowT += dt * dirS * (0.35 + Math.abs(e) * 2.4);
            flow.forEach((c, i) => {
              c.visible = on; if (!on) return;
              const s = (((i / flow.length + st.flowT) % 1) + 1) % 1 * NT; helixAt(s, tmp); c.position.copy(tmp);
              const nx = helixAt(s + 0.02 * dirS, new V3()); c.quaternion.setFromUnitVectors(new V3(0, 1, 0), nx.sub(tmp).normalize());
            });
            if (!on) setInfo('자석이 <b>' + (S && L.tipS(S.xm) > 0 ? '코일 안에서도' : '') + ' 멈춰 있으면</b> 전류가 흐르지 않아요.<br>자석을 코일에 넣거나 빼 보세요.' + (lab && S ? '<br>자석 ' + cfg.mg + '개 · 코일 ' + cfg.tn + '회' : ''));
            else setInfo('자석이 움직이면 코일을 지나는 자기장이 변해 <b>유도 전류</b>가 흘러요.<br>들어갈 때와 나올 때 <b>방향이 반대</b>예요.' + (lab && S ? '<br>자석 ' + cfg.mg + '개 · 코일 ' + cfg.tn + '회' : ''));
          } else {
            flow.forEach((c) => { c.visible = false; });
            const g = S ? S.gen : null;
            if (g) {
              const turns = Math.max(3, Math.round(9 * g.tn / 100)); if (turns !== NT) buildCoil(turns);
              spin.rotation.y = g.phi; mB.visible = g.mg === 2;
              ledA.bulb.material.emissiveIntensity = g.ledA * 2.4; ledB.bulb.material.emissiveIntensity = g.ledB * 2.4;
              if (rngS && Math.abs(rngS.value - g.ft) > 0.01) rngS.set(g.ft);
              const pct = L.ledPct(g);
              setInfo(g.ft === 0 ? '자석이 <b>멈춰 있으면</b> 전류가 없어서 LED가 꺼져요.<br>돌리는 속도를 올려 보세요.' : '자석이 돌면 전류 방향이 <b>번갈아 바뀌어서</b> LED 두 개가 번갈아 켜져요.<br>회전 ' + g.f.toFixed(1) + ' 회/초 · 코일 ' + g.tn + '회 · 자석 ' + g.mg + '개 → LED 최대 밝기 <b>' + pct + ' %</b>');
            }
          }
        },
        sync() {},
      };
    },
  });
})();
