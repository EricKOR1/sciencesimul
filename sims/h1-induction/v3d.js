/* h1-induction · 3D 전자기 유도와 간이 발전기
   ① 막대자석을 코일에 넣었다 뺐다 하면 코일을 지나는 자기장이 변해 유도 전류가 흘러요 (멈추면 전류 없음, 방향은 들어갈 때와 나올 때 반대).
   ② 자석을 코일 안에서 돌리면 코일을 지나는 자기장이 계속 변해 전류 방향이 번갈아 바뀌고, 반대로 연결한 LED가 번갈아 켜져요.
   수식(패러데이·렌츠 법칙)은 다루지 않고 관찰 사실로만 보여 줘요. 크기와 비율은 보기 좋게 줄인 모형이에요. */
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
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3;
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0.15 }, o || {}));
      const S0 = (window.__sim && window.__sim.S) || {};
      const st = { scene: S0.mode === 'gen' ? 'gen' : 'mag', x: -4.6, auto: false, at: 0, vel: 0, emf: 0, prevX: -4.6, rps: 1.5, n: 1, phi: 0.6, ledA: 0, ledB: 0, flowT: 0 };

      /* ---------- 코일 (x축 방향 나선) ---------- */
      const CR = 1.25, CL = 2.6, NT = 9;
      function coilGroup() {
        const g = new THREE.Group(), pts = [];
        for (let i = 0; i <= NT * 36; i++) { const s = i / 36; pts.push(new V3(-CL / 2 + CL * s / NT, CR * Math.cos(s * Math.PI * 2), CR * Math.sin(s * Math.PI * 2))); }
        const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 500, 0.075, 8, false), mat(COPPER, { metalness: 0.55, roughness: 0.32 }));
        tube.castShadow = true; g.add(tube); return g;
      }
      const coil = coilGroup(); root.add(coil);
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
        const pl = new THREE.PointLight(dir > 0 ? 0xff5050 : 0x50ff80, 0, 4); pl.position.set(0, BY + 0.3, z);
        gGen.add(bulb, tri, bar2, pl); return { bulb, pl };
      }
      const ledA = branch(0.95, 1), ledB = branch(-0.95, -1);
      const led1L = label('LED 1', [0, BY, 0.95], { size: 11.5, offset: [0, -0.6, 0.2] });
      const led2L = label('LED 2', [0, BY, -0.95], { size: 11.5, offset: [0, -0.6, -0.2] });

      /* ---------- 바닥 ---------- */
      const base = new THREE.Mesh(new THREE.CylinderGeometry(5.4, 5.6, 0.3, 48), mat(0x2d3547, { roughness: 0.9, metalness: 0 })); base.position.y = -3.4; base.receiveShadow = true; root.add(base);

      /* ---------- 조작 ---------- */
      let segScene, rngX, autoB, rngS, segN;
      function showScene() {
        gMag.visible = st.scene === 'mag'; gGen.visible = st.scene === 'gen';
        magN.show(st.scene === 'mag'); magS.show(st.scene === 'mag'); coilLab.show(true);
        genN.show(st.scene === 'gen'); genLab.show(st.scene === 'gen'); led1L.show(st.scene === 'gen'); led2L.show(st.scene === 'gen'); galL.show(st.scene === 'mag');
        [rngX && rngX, autoB].forEach(() => {});
        ui();
      }
      const ctlRows = {};
      segScene = controls.segment('보기', [{ value: 'mag', label: '🧲 자석과 코일' }, { value: 'gen', label: '⚙️ 간이 발전기' }], st.scene, (v) => { st.scene = v; showScene(); });
      rngX = controls.range('자석 위치', -5, 5, 0.05, st.x, (v) => { st.auto = false; autoB.textContent = '▶ 자동으로 넣다 뺐다'; st.x = v; }, (v) => (Math.abs(v) < 0.3 ? '코일 안' : v < 0 ? '왼쪽' : '오른쪽'));
      autoB = controls.button('▶ 자동으로 넣다 뺐다', () => { st.auto = !st.auto; st.at = Math.asin(Math.max(-1, Math.min(1, st.x / 4.6))); autoB.textContent = st.auto ? '⏸ 멈춤' : '▶ 자동으로 넣다 뺐다'; });
      rngS = controls.range('돌리는 속도', 0, 3, 0.1, st.rps, (v) => { st.rps = v; }, (v) => (v === 0 ? '멈춤' : v < 1 ? '느리게' : v < 2 ? '보통' : '빠르게'));
      segN = controls.segment('자석', [{ value: 1, label: '1개' }, { value: 2, label: '2개' }], 1, (v) => { st.n = v; mB.visible = v === 2; });
      mB.visible = false;
      const ctlEls = Array.from(autoB.parentElement.children);
      const iX = ctlEls.indexOf(autoB);
      function ui() {
        const mag = st.scene === 'mag';
        // 컨트롤 줄: [보기 라벨, 버튼2] [자석위치 라벨, 슬라이더], 자동 버튼, [속도 라벨, 슬라이더], [자석 라벨, 버튼2]
        ctlEls.forEach((el, i) => { if (i < 3) return; const isMagPart = i <= iX; el.style.display = (isMagPart ? mag : !mag) ? '' : 'none'; });
      }
      showScene();

      /* ---------- 갱신 ---------- */
      const flux = (x) => Math.exp(-(x / 1.9) * (x / 1.9));      // 코일을 지나는 자기장(자석이 코일 가운데일 때 가장 커요)
      const tmp = new V3();
      function helixAt(s, out) { const a = s * Math.PI * 2; return out.set(-CL / 2 + CL * s / NT, CR * Math.cos(a), CR * Math.sin(a)); }

      return {
        update(dt, t) {
          if (st.scene === 'mag') {
            if (st.auto) { st.at += dt * 0.75; st.x = Math.sin(st.at) * 4.6; rngX.set(st.x); }
            const v = (st.x - st.prevX) / Math.max(dt, 1e-3); st.prevX = st.x;
            st.vel += (v - st.vel) * Math.min(1, dt * 14);
            const dPhi = (flux(st.x + 0.04) - flux(st.x - 0.04)) / 0.08;   // 자석 위치에 따른 자기장 변화율
            st.emf = -dPhi * st.vel * (1 / 1.0);
            magnet.position.set(st.x, 0, 0);
            const e = Math.max(-1, Math.min(1, st.emf / 1.6));
            needleG.rotation.z += (-e * 1.25 - needleG.rotation.z) * Math.min(1, dt * 18);
            const on = Math.abs(e) > 0.04;
            const dirS = e > 0 ? 1 : -1;
            st.flowT += dt * dirS * (0.35 + Math.abs(e) * 2.4);
            flow.forEach((c, i) => {
              c.visible = on; if (!on) return;
              const s = (((i / flow.length + st.flowT) % 1) + 1) % 1 * NT; helixAt(s, tmp); c.position.copy(tmp);
              const nx = helixAt(s + 0.02 * dirS, new V3()); c.quaternion.setFromUnitVectors(new V3(0, 1, 0), nx.sub(tmp).normalize());
            });
            if (st.vel === 0 || Math.abs(st.vel) < 0.02) {
              info('자석이 <b>' + (Math.abs(st.x) < 0.3 ? '코일 안에서도' : '') + ' 멈춰 있으면</b> 전류가 흐르지 않아요.<br>자석을 코일에 넣거나 빼 보세요.');
            } else info('자석이 움직이면 코일을 지나는 자기장이 변해 <b>유도 전류</b>가 흘러요.<br>들어갈 때와 나올 때 <b>방향이 반대</b>예요.');
          } else {
            flow.forEach((c) => { c.visible = false; });
            const w = st.rps * Math.PI * 2 * 0.5;
            st.phi += w * dt; spin.rotation.y = st.phi;
            // 자석이 x축과 이루는 각 → 코일을 지나는 자기장 cos φ, 유도 전압 ∝ 회전 속도 × sin φ
            const e = Math.sin(st.phi) * (st.rps / 3) * (st.n === 2 ? 1.0 : 0.62) * 1.6;
            const th = 0.12;
            const ta = Math.max(0, e - th) / 1.0, tb = Math.max(0, -e - th) / 1.0;
            st.ledA += (Math.min(1, ta) - st.ledA) * Math.min(1, dt * 14); st.ledB += (Math.min(1, tb) - st.ledB) * Math.min(1, dt * 14);
            ledA.bulb.material.emissiveIntensity = st.ledA * 2.4; ledA.pl.intensity = st.ledA * 1.8;
            ledB.bulb.material.emissiveIntensity = st.ledB * 2.4; ledB.pl.intensity = st.ledB * 1.8;
            if (st.rps === 0) info('자석이 <b>멈춰 있으면</b> 전류가 없어서 LED가 꺼져요.<br>돌리는 속도를 올려 보세요.');
            else info('자석이 돌면 전류 방향이 <b>번갈아 바뀌어서</b> LED 두 개가 번갈아 켜져요.<br>빠르게 돌리거나 자석을 2개로 하면 더 밝아져요.');
          }
        },
        sync() {
          const S = (window.__sim && window.__sim.S) || {};
          if (S.mode === 'gen' && st.scene !== 'gen') { st.scene = 'gen'; segScene.set('gen'); showScene(); }
          else if ((S.mode === 'obs' || S.mode === 'lab') && st.scene !== 'mag') { st.scene = 'mag'; segScene.set('mag'); showScene(); }
        },
      };
    },
  });
})();
