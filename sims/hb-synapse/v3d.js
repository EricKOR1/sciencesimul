/* hb-synapse · 3D 시냅스 전달 (전기 → 화학 → 전기)와 약물의 작용 지점
   활동 전위가 오면 Ca²⁺이 들어와 시냅스 소낭이 아세틸콜린(ACh)을 분비하고, ACh이 수용체에 결합하면 Na⁺이 들어가 다음 뉴런이 흥분해요.
   ACh은 분해 효소가 분해해요. 약물을 골라 어느 단계가 막히는지 확인해요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const narrow = window.innerWidth < 600 || window.innerHeight > window.innerWidth * 1.1;
  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  const YM = 0.85;                       // 막의 높이 (위: 시냅스 이전, 아래: 시냅스 이후)
  const RX = [-2.4, -0.8, 0.8, 2.4], EX = [-1.6, 0, 1.6], CAX = [-2.7, 2.7], VX = [-1.3, 0, 1.3];
  const DRUGS = {
    none: { name: '약물 없음', info: '활동 전위가 오면 ACh이 분비되고, 수용체에 결합한 뒤 분해 효소가 분해해요.' },
    botox: { name: '보툴리눔 독소', info: '<b>보툴리눔 독소</b>: ACh 분비를 막아요. 소낭이 융합하지 못해 신호가 전달되지 않아요(근육 이완).' },
    curare: { name: '쿠라레', info: '<b>쿠라레</b>: ACh 수용체를 막아요. ACh이 있어도 결합하지 못해 신호가 전달되지 않아요.' },
    organo: { name: '유기인계 살충제', info: '<b>유기인계 살충제</b>: 분해 효소를 억제해요. ACh이 남아 수용체가 계속 열려 흥분이 이어져요.' },
  };

  window.SciSim3D.attach({
    title: '시냅스 3D (신호 전달과 약물)',
    hint: '드래그: 돌리기 · 약물을 골라 어느 단계가 막히는지 봐요',
    camera: { dist: narrow ? 12.5 : 10.5, theta: 0.32, phi: 1.3, min: 6, max: 20, target: [0, -0.1, 0] },
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V = THREE.Vector3;
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.4, metalness: 0.03 }, o || {}));
      const ghost = (c, op, o) => std(c, Object.assign({ transparent: true, opacity: op, depthWrite: false, roughness: 0.25, side: THREE.DoubleSide }, o || {}));
      const R = rng(5), D = new THREE.Object3D();

      /* 세포 */
      const preM = ghost(0x4cc38a, 0.26), postM = ghost(0xf08aa6, 0.26);
      const pre = new THREE.Mesh(new THREE.SphereGeometry(1, 56, 24, 0, Math.PI * 2, 0, Math.PI / 2), preM); pre.scale.set(3.8, 2.0, 2.4); pre.position.y = YM; pre.renderOrder = 1; root.add(pre);
      const post = new THREE.Mesh(new THREE.SphereGeometry(1, 56, 24, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), postM); post.scale.set(4.2, 2.3, 2.8); post.position.y = -YM; post.renderOrder = 1; root.add(post);
      const memM = (c) => std(c, { roughness: 0.4, transparent: true, opacity: 0.75, emissive: 0x000000 });
      const preMemM = memM(0x2f9e6c), postMemM = memM(0xd86a8c);
      const preMem = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.1, 56), preMemM); preMem.scale.set(3.8, 1, 2.4); preMem.position.y = YM; root.add(preMem);
      const postMem = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.1, 56), postMemM); postMem.scale.set(4.2, 1, 2.8); postMem.position.y = -YM; root.add(postMem);
      // 축삭 (위로 이어지는 관)
      root.add(Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.9, 1.3, 28, 1, true), ghost(0x4cc38a, 0.3)), { position: new V(0, YM + 2.3, 0) }));

      /* 수용체 · 분해 효소 · Ca²⁺ 통로 */
      const rcv = RX.map((x) => {
        const g = new THREE.Group(); g.position.set(x, -YM + 0.3, 0.0);
        const m = std(0x8b6be0, { roughness: 0.35 });
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.7, 24, 1, true), Object.assign(m, { side: THREE.DoubleSide })); g.add(body);
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.07, 10, 24), m); rim.rotation.x = Math.PI / 2; rim.position.y = 0.35; g.add(rim);
        const gate = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.08, 20), std(0xe5483f)); gate.position.y = -0.3; g.add(gate);
        const x1 = new THREE.Group(); const bm = std(0xff3b3b, { emissive: 0xff0000, emissiveIntensity: 0.6 });
        [Math.PI / 4, -Math.PI / 4].forEach((a) => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.07, 0.07), bm); b.rotation.z = a; x1.add(b); }); x1.position.y = 0.85; x1.visible = false; g.add(x1);
        root.add(g); return { g, x, open: 0, bound: -1, gate, mat: m, xs: x1 };
      });
      const ache = EX.map((x) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.24, 20, 14), std(0xffc933, { roughness: 0.4 })); e.scale.set(1, 0.75, 1); e.position.set(x, -YM + 0.18, 0.1); root.add(e); return e; });
      const acheMat = ache[0].material; ache.forEach((e) => { e.material = acheMat; });
      CAX.forEach((x) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.55, 18, 1, true), std(0xd9a21a, { side: THREE.DoubleSide })); b.position.set(x, YM, 0); root.add(b); });

      /* 시냅스 소낭 */
      const vesM = ghost(0xfff3a8, 0.34, { roughness: 0.15 });
      const vs = [];
      const spots = VX.map((x) => [x, YM + 0.62, 0.0, true]).concat([[-2.0, YM + 1.4, 0.6, false], [0.6, YM + 1.6, -0.6, false], [2.1, YM + 1.2, 0.5, false], [-0.6, YM + 1.1, -0.7, false]]);
      spots.forEach((p, i) => {
        const g = new THREE.Group(); g.position.set(p[0], p[1], p[2]);
        g.add(new THREE.Mesh(new THREE.SphereGeometry(0.36, 22, 16), vesM));
        const dm = std(0x7ee8ff, { emissive: 0x1a90b0, emissiveIntensity: 0.5 });
        for (let k = 0; k < 7; k++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), dm); d.position.set((R() - 0.5) * 0.4, (R() - 0.5) * 0.4, (R() - 0.5) * 0.4); g.add(d); }
        root.add(g); vs.push({ g, home: new V(p[0], p[1], p[2]), docked: p[3], sc: 1, state: 0, t: 0, ph: R() * 6 });
      });

      /* 이온과 ACh */
      const NA = 64, achI = new THREE.InstancedMesh(new THREE.SphereGeometry(0.095, 12, 9), std(0x7ee8ff, { emissive: 0x1a90b0, emissiveIntensity: 0.6 }), NA);
      root.add(achI);
      const ach = Array.from({ length: NA }, () => ({ on: false }));
      const naI = new THREE.InstancedMesh(new THREE.SphereGeometry(0.11, 12, 9), std(0xffb02e, { emissive: 0x6a4000, emissiveIntensity: 0.5 }), 8); root.add(naI);
      const caI = new THREE.InstancedMesh(new THREE.SphereGeometry(0.11, 12, 9), std(0xff6bd5, { emissive: 0x80207a, emissiveIntensity: 0.5 }), 6); root.add(caI);
      // 시냅스 후 반응 막대
      const barBg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.0, 0.2), std(0x6b7aa0)); barBg.position.set(5.2, -1.6, 0); root.add(barBg);
      const barFg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1, 0.3), std(0xffd34d, { emissive: 0xffa800, emissiveIntensity: 0.6 })); barFg.position.set(5.2, -3.1, 0); root.add(barFg);

      const L = {
        term: label('시냅스 이전 뉴런(축삭 말단)', [-2.0, YM + 2.15, 0], { color: 'rgba(30,150,100,.92)' }),
        ves: label('시냅스 소낭', vs[0].g, { offset: [0, 0.65, 0] }),
        cleft: label('시냅스 틈', [-4.0, 0, 0], {}), rec: label('수용체', rcv[3].g, { offset: [0.7, 0.5, 0] }),
        ase: label('분해 효소', ache[2], { offset: [0.5, 0.35, 0] }), post: label('시냅스 이후 뉴런', [-2.4, -YM - 1.6, 0], { color: 'rgba(210,90,130,.92)' }),
        ach: label('아세틸콜린(ACh)', [3.6, 0.1, 0.2], { color: 'rgba(40,170,200,.92)' }),
        bar: label('시냅스 이후 뉴런의 흥분', [5.2, 0.05, 0], { size: 12, color: 'rgba(40,50,80,.9)' }),
      };
      L.cleft.el.textContent = '시냅스 틈';

      let drug = 'none', clk = -1, autoRun = true, idleT = 1.2, level = 0, apGlow = 0;
      const free = () => { for (let i = 0; i < NA; i++) if (!ach[i].on) return ach[i]; return null; };
      function trigger() { clk = 0; vs.forEach((v) => { if (v.state === 0) v.t = 0; }); }
      function clearAch() { ach.forEach((a) => { a.on = false; }); rcv.forEach((r) => { r.bound = -1; }); }
      function setDrug(d) {
        drug = d; clearAch(); rcv.forEach((r) => { r.xs.visible = d === 'curare'; });
        acheMat.color.set(d === 'organo' ? 0x8a8f99 : 0xffc933); L.ase.set(d === 'organo' ? '분해 효소 (억제됨)' : '분해 효소');
        vs.forEach((v) => { v.state = 0; v.sc = 1; }); clk = -1; idleT = 0.8; info(DRUGS[d].info);
      }
      controls.segment('약물', Object.keys(DRUGS).map((k) => ({ label: DRUGS[k].name.replace('유기인계 살충제', '유기인계 살충제'), value: k })), 'none', setDrug);
      controls.button('▶ 활동 전위 도착', () => { trigger(); });
      const autoBtn = controls.button('자동 반복', () => { autoRun = !autoRun; autoBtn.classList.toggle('on', autoRun); }); autoBtn.classList.add('on');
      info(DRUGS.none.info);

      function release(v) {
        for (let k = 0; k < 8; k++) { const a = free(); if (!a) break; Object.assign(a, { on: true, st: 0, x: v.g.position.x + (R() - 0.5) * 0.4, y: YM - 0.15 - R() * 0.2, z: (R() - 0.5) * 0.6, vx: (R() - 0.5) * 0.6, vy: -0.7 - R() * 0.5, vz: (R() - 0.5) * 0.4, tm: 0, sc: 1, rc: -1 }); }
      }
      return {
        update(dt, t) {
          if (clk < 0 && autoRun) { idleT -= dt; if (idleT <= 0) { trigger(); idleT = 7.5; } }
          if (clk >= 0) clk += dt;
          // 활동 전위 도착 · Ca²⁺ 유입 · 소낭 융합
          apGlow = clk >= 0 && clk < 0.6 ? 1 - clk / 0.6 : 0;
          preMemM.emissive.set(0xffe14d); preMemM.emissiveIntensity = apGlow * 0.9;
          const caOn = clk >= 0.15 && clk < 1.6;
          for (let i = 0; i < 6; i++) { const u = ((clk - 0.15) * 0.9 + i * 0.33) % 1, cx = CAX[i % 2] + (i % 3 - 1) * 0.04; D.position.set(cx, YM - 0.8 + Math.max(0, u) * 1.9, (i % 3 - 1) * 0.06); D.scale.setScalar(caOn ? 1 : 0.001); D.rotation.set(0, 0, 0); D.updateMatrix(); caI.setMatrixAt(i, D.matrix); }
          caI.instanceMatrix.needsUpdate = true;
          vs.forEach((v) => {
            const g = v.g;
            if (v.docked) {
              if (v.state === 0 && clk >= 1.0 && drug !== 'botox') { v.state = 1; v.t = 0; }
              if (v.state === 1) { v.t += dt; const k = Math.min(1, v.t / 0.45); g.position.y = v.home.y - 0.3 * k; g.scale.set(1 + k * 0.5, 1 - k * 0.65, 1 + k * 0.5); if (k >= 1) { release(v); v.state = 2; v.t = 0; g.visible = false; } }
              else if (v.state === 2) { v.t += dt; if (v.t > 4.0) { v.state = 3; v.t = 0; g.visible = true; g.position.copy(v.home); g.scale.setScalar(0.01); } }
              else if (v.state === 3) { v.t += dt; const k = Math.min(1, v.t / 0.8); g.scale.setScalar(Math.max(0.01, k)); if (k >= 1) { v.state = 0; } }
              else { g.position.y = v.home.y + Math.sin(t * 2 + v.ph) * 0.02; g.scale.setScalar(1); }
            } else { g.position.set(v.home.x + Math.sin(t * 0.6 + v.ph) * 0.18, v.home.y + Math.cos(t * 0.5 + v.ph) * 0.12, v.home.z + Math.sin(t * 0.4 + v.ph * 2) * 0.1); }
          });
          if (clk > 7) clk = -1;
          // ACh 입자
          const rOn = drug !== 'curare', aOn = drug !== 'organo';
          let i = 0;
          ach.forEach((a, idx) => {
            if (!a.on) { D.position.set(0, -60, 0); D.scale.setScalar(0.001); D.updateMatrix(); achI.setMatrixAt(idx, D.matrix); return; }
            if (a.st === 0) { // 확산
              a.vx += (R() - 0.5) * dt * 5; a.vz += (R() - 0.5) * dt * 5; a.vy += (R() - 0.5) * dt * 5 - dt * 0.35;
              const m = Math.hypot(a.vx, a.vy, a.vz) || 1, sp = 0.7; a.vx *= sp / m; a.vy *= sp / m; a.vz *= sp / m;
              a.x += a.vx * dt; a.y += a.vy * dt; a.z += a.vz * dt;
              if (Math.abs(a.x) > 3.7) { a.vx *= -1; a.x = Math.sign(a.x) * 3.7; } if (Math.abs(a.z) > 1.0) { a.vz *= -1; a.z = Math.sign(a.z) * 1.0; }
              if (a.y > YM - 0.12) { a.vy = -Math.abs(a.vy); a.y = YM - 0.12; }
              if (a.y < -YM + 0.14) { a.vy = Math.abs(a.vy); a.y = -YM + 0.14; }
              if (a.y < -YM + 0.9) {
                if (rOn) rcv.forEach((r, ri) => { if (r.bound < 0 && a.st === 0 && Math.abs(a.x - r.x) < 0.3 && Math.abs(a.z) < 0.3 && a.y < -YM + 0.8) { r.bound = idx; a.st = 1; a.rc = ri; a.tm = 0; } });
                if (aOn && a.st === 0) ache.forEach((e) => { if (Math.abs(a.x - e.position.x) < 0.32 && Math.abs(a.z - e.position.z) < 0.35 && a.y < -YM + 0.5) { a.st = 2; a.tm = 0; } });
              }
              a.sc = 1;
            } else if (a.st === 1) { // 수용체에 결합
              const r = rcv[a.rc]; a.tm += dt; a.x += (r.x - a.x) * Math.min(1, dt * 12); a.z += (0 - a.z) * Math.min(1, dt * 12); a.y += (-YM + 0.82 - a.y) * Math.min(1, dt * 12);
              if (a.tm > 1.3) { r.bound = -1; a.st = 0; a.vy = 0.6; a.vx = (R() - 0.5); a.y += 0.15; }
            } else if (a.st === 2) { // 분해
              a.tm += dt; a.sc = Math.max(0, 1 - a.tm * 2.2); if (a.tm > 0.45) a.on = false;
            }
            D.position.set(a.x, a.y, a.z); D.scale.setScalar(Math.max(0.001, a.sc)); D.updateMatrix(); achI.setMatrixAt(idx, D.matrix);
          });
          achI.instanceMatrix.needsUpdate = true;
          // 수용체 열림 · Na⁺ 유입
          let openSum = 0;
          rcv.forEach((r, ri) => {
            const want = r.bound >= 0 && rOn ? 1 : 0; r.open += (want - r.open) * Math.min(1, dt * 9); openSum += r.open;
            r.gate.position.set(r.open * 0.4, -0.3, 0); r.gate.rotation.z = -r.open * 1.0; r.gate.material.color.set(r.open > 0.5 ? 0x33c46e : 0xe5483f);
            r.mat.emissive.set(0x33ff88); r.mat.emissiveIntensity = r.open * 0.35;
          });
          for (let k = 0; k < 8; k++) { const r = rcv[k % 4], u = (t * 0.7 + k * 0.37) % 1; D.position.set(r.x + Math.sin(k) * 0.03, -YM + 1.0 - u * 2.2, 0); D.scale.setScalar(Math.max(0.001, r.open)); D.updateMatrix(); naI.setMatrixAt(k, D.matrix); }
          naI.instanceMatrix.needsUpdate = true;
          level += (openSum / 4 - level) * Math.min(1, dt * 3);
          barFg.scale.y = Math.max(0.02, level * 3.0); barFg.position.y = -3.1 + barFg.scale.y / 2;
        },
        sync() {},
      };
    },
  });
})();
