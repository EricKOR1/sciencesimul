/* hb-synapse · 3D 시냅스 전달 (전기 → 화학 → 전기)와 약물의 작용 지점
   2D 차시의 6단계(활동 전위 도착 → Ca²⁺ 유입 → 소낭 융합 → 방출·확산 → 수용체 결합 → 분해·재흡수)를 ▶ 재생으로 반복해 보여 주고,
   2D와 같은 5가지 약물(보툴리눔 독소 · 쿠라레 · 니코틴 · 유기인계 살충제 · SSRI)이 어느 단계에 작용하는지 확인해요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const narrow = window.innerWidth < 600 || window.innerHeight > window.innerWidth * 1.1;
  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  const YM = 0.85;                       // 막의 높이 (위: 시냅스 이전, 아래: 시냅스 이후)
  const RX = [-2.4, -0.8, 0.8, 2.4], EX = [-1.6, 0, 1.6], CAX = [-2.7, 2.7], VX = [-1.3, 0, 1.3];
  const DRUGS = {
    none: { name: '약물 없음', info: '활동 전위가 오면 신경전달물질(아세틸콜린)이 분비되고, 수용체에 결합한 뒤 분해 효소가 분해하거나 말단이 재흡수해요.' },
    botox: { name: '보툴리눔 독소', info: '<b>보툴리눔 독소</b>: 아세틸콜린의 분비를 막아요(소낭이 융합하지 못해요). 근육에 신호가 가지 않아 근육이 이완·마비돼요.' },
    curare: { name: '쿠라레', info: '<b>쿠라레</b>: 아세틸콜린 수용체를 막아요. 아세틸콜린이 결합하지 못해 근육이 이완돼요.' },
    nicotine: { name: '니코틴', info: '<b>니코틴</b>: 아세틸콜린 수용체에 결합해 아세틸콜린처럼 작용해요(수용체 작용 모방). 중독·의존 위험이 있어요.' },
    organo: { name: '유기인계 살충제', info: '<b>유기인계 살충제</b>: 아세틸콜린 분해 효소를 억제해 아세틸콜린이 쌓여요. 근육이 지나치게 수축해요(독).' },
    ssri: { name: 'SSRI(재흡수 억제)', info: '<b>세로토닌 재흡수 억제제(SSRI)</b>: 말단으로의 세로토닌 재흡수를 억제해 틈에 세로토닌이 오래 남아요. 항우울제로 쓰이며 반드시 의사의 처방이 필요해요.' },
  };
  window.SciSim3D.attach({
    title: '시냅스 3D (신호 전달과 약물)',
    hint: '드래그: 돌리기 · ▶ 재생으로 6단계를 보고, 약물을 골라 막히는 단계를 확인해요',
    camera: { dist: narrow ? 12.5 : 10.5, theta: 0.32, phi: 1.3, min: 6, max: 20, target: [0, -0.1, 0] },
    autoRotate: 0,
    levels: [1, 2],
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
      { const ax = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.9, 1.3, 28, 1, true), ghost(0x4cc38a, 0.3)); ax.position.set(0, YM + 2.3, 0); root.add(ax); }

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
      const barBg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.0, 0.2), std(0x6b7aa0)); barBg.position.set(4.7, -1.6, 0); root.add(barBg);
      const barFg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1, 0.3), std(0xffd34d, { emissive: 0xffa800, emissiveIntensity: 0.6 })); barFg.position.set(4.7, -3.1, 0); root.add(barFg);

      const L = {
        term: label('시냅스 이전 뉴런(축삭 말단)', [-2.0, YM + 2.15, 0], { color: 'rgba(30,150,100,.92)' }),
        ves: label('시냅스 소낭', vs[0].g, { offset: [0, 0.65, 0] }),
        cleft: label('시냅스 틈', [-4.3, 0, 0], {}), rec: label('수용체', rcv[1].g, { offset: [0, 0.75, 0] }),
        ase: label('분해 효소', ache[1], { offset: [0, -0.55, 0.5] }), post: label('시냅스 이후 뉴런', [-2.4, -YM - 1.6, 0], { color: 'rgba(210,90,130,.92)' }),
        ach: label('신경전달물질(아세틸콜린)', [3.0, 0.3, 0.3], { color: 'rgba(40,170,200,.92)' }),
        bar: label('이후 뉴런 흥분', [4.7, 0.0, 0], { size: 12, color: 'rgba(40,50,80,.9)' }),
      };
      L.cleft.el.textContent = '시냅스 틈';

      let drug = 'none', clk = -1, level = 0, apGlow = 0, taken = false, mimOn = false, infoDirty = true, caBlock = false;
      const free = () => { for (let i = 0; i < NA; i++) if (!ach[i].on) return ach[i]; return null; };
      function trigger() { clk = 0; vs.forEach((v) => { if (v.state === 0) v.t = 0; }); }
      function clearAch() { ach.forEach((a) => { a.on = false; }); rcv.forEach((r) => { r.bound = -1; }); }
      function setDrug(d) {
        drug = d; clearAch(); rcv.forEach((r) => { r.xs.visible = d === 'curare'; });
        acheMat.color.set(d === 'organo' ? 0x8a8f99 : 0xffc933); L.ase.set(d === 'organo' ? '분해 효소 (억제됨)' : '분해 효소');
        vs.forEach((v) => { v.state = 0; v.sc = 1; }); clk = -1; infoDirty = true; mimM.forEach((m) => { m.visible = false; }); txX.forEach((x) => { x.visible = d === 'ssri'; });
        L.ach.set(d === 'ssri' ? '세로토닌' : '신경전달물질(아세틸콜린)'); if (typeof replay === 'function' && typeof pl !== 'undefined') replay(pl.p);
      }
      controls.segment('약물', Object.keys(DRUGS).map((k) => ({ label: DRUGS[k].name, value: k })), 'none', setDrug);
      const caB = controls.button('Ca²⁺ 통로 차단', () => { caBlock = !caBlock; caB.classList.toggle('on', caBlock); caB.textContent = caBlock ? 'Ca²⁺ 통로 차단 해제' : 'Ca²⁺ 통로 차단'; if (typeof pl !== 'undefined') replay(pl.p); });
      /* 재흡수 통로(SSRI가 막는 곳) · 니코틴 모방 입자 */
      const TXPOS = [-3.0, 3.0];
      const txX = TXPOS.map((x) => { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.5, 14, 1, true), std(0x2f9e6c, { side: THREE.DoubleSide })); g.add(b); const xm = std(0xff3b3b, { emissive: 0xff0000, emissiveIntensity: 0.6 }); [Math.PI / 4, -Math.PI / 4].forEach((a) => { const q = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.06), xm); q.rotation.z = a; q.position.y = -0.5; g.add(q); }); g.position.set(x, YM - 0.05, 0); g.visible = false; root.add(g); return g; });
      const txBase = TXPOS.map((x) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.45, 14, 1, true), std(0x2f9e6c, { side: THREE.DoubleSide })); b.position.set(x, YM + 0.2, 0.0); root.add(b); return b; });
      const mimM = [0, 1, 2].map((i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), std(0x7ae27a, { emissive: 0x1a8a1a, emissiveIntensity: 0.6 })); m.position.set(RX[i + 1 > 3 ? 3 : i + 1] - 0.0, -YM + 0.85, 0); m.visible = false; root.add(m); return m; });

      function release(v) {
        for (let k = 0; k < 8; k++) { const a = free(); if (!a) break; Object.assign(a, { on: true, st: 0, x: v.g.position.x + (R() - 0.5) * 0.4, y: YM - 0.15 - R() * 0.2, z: (R() - 0.5) * 0.6, vx: (R() - 0.5) * 0.6, vy: -0.7 - R() * 0.5, vz: (R() - 0.5) * 0.4, tm: 0, sc: 1, rc: -1 }); }
      }
      function stepSim(dt, t) {
          if (clk >= 0) clk += dt;
          // 활동 전위 도착 · Ca²⁺ 유입 · 소낭 융합
          apGlow = clk >= 0 && clk < 0.6 ? 1 - clk / 0.6 : 0;
          preMemM.emissive.set(0xffe14d); preMemM.emissiveIntensity = apGlow * 0.9;
          const caOn = clk >= 0.15 && clk < 1.6 && !caBlock;
          for (let i = 0; i < 6; i++) { const u = ((clk - 0.15) * 0.9 + i * 0.33) % 1, cx = CAX[i % 2] + (i % 3 - 1) * 0.04; D.position.set(cx, YM - 0.8 + Math.max(0, u) * 1.9, (i % 3 - 1) * 0.06); D.scale.setScalar(caOn ? 1 : 0.001); D.rotation.set(0, 0, 0); D.updateMatrix(); caI.setMatrixAt(i, D.matrix); }
          caI.instanceMatrix.needsUpdate = true;
          vs.forEach((v) => {
            const g = v.g;
            if (v.docked) {
              if (v.state === 0 && clk >= 1.0 && drug !== 'botox' && !caBlock) { v.state = 1; v.t = 0; }
              if (v.state === 1) { v.t += dt; const k = Math.min(1, v.t / 0.45); g.position.y = v.home.y - 0.3 * k; g.scale.set(1 + k * 0.5, 1 - k * 0.65, 1 + k * 0.5); if (k >= 1) { release(v); v.state = 2; v.t = 0; g.visible = false; } }
              else if (v.state === 2) { v.t += dt; if (v.t > 4.0) { v.state = 3; v.t = 0; g.visible = true; g.position.copy(v.home); g.scale.setScalar(0.01); } }
              else if (v.state === 3) { v.t += dt; const k = Math.min(1, v.t / 0.8); g.scale.setScalar(Math.max(0.01, k)); if (k >= 1) { v.state = 0; } }
              else { g.position.y = v.home.y + Math.sin(t * 2 + v.ph) * 0.02; g.scale.setScalar(1); }
            } else { g.position.set(v.home.x + Math.sin(t * 0.6 + v.ph) * 0.18, v.home.y + Math.cos(t * 0.5 + v.ph) * 0.12, v.home.z + Math.sin(t * 0.4 + v.ph * 2) * 0.1); }
          });
          // ACh 입자
          const rOn = drug !== 'curare', aOn = drug !== 'organo' && drug !== 'ssri';
          if (clk >= 4.3 && !taken) { taken = true; ach.forEach((a) => { if (a.on && a.st === 0) a.fate = drug === 'ssri' ? 'stay' : (R() < 0.4 ? 'take' : 'enz'); }); }
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
                if (aOn && a.st === 0) ache.forEach((e) => { if (Math.abs(a.x - e.position.x) < 0.45 && Math.abs(a.z - e.position.z) < 0.5 && a.y < -YM + 0.7) { a.st = 2; a.tm = 0; } });
              }
              a.sc = 1;
              if (a.fate === 'take' && drug !== 'ssri') { const tx = Math.abs(a.x - TXPOS[0]) < Math.abs(a.x - TXPOS[1]) ? TXPOS[0] : TXPOS[1]; a.x += (tx - a.x) * Math.min(1, dt * 1.2); a.z += (0 - a.z) * Math.min(1, dt * 1.2); a.y += 0.5 * dt; if (a.y > YM - 0.1 && Math.abs(a.x - tx) < 0.25) { a.st = 3; a.tm = 0; } }
            } else if (a.st === 3) { a.tm += dt; a.y += dt * 0.9; a.sc = Math.max(0, 1 - a.tm * 1.6); if (a.tm > 0.6) a.on = false;
            } else if (a.st === 1) { // 수용체에 결합
              const r = rcv[a.rc]; a.tm += dt; a.x += (r.x - a.x) * Math.min(1, dt * 12); a.z += (0 - a.z) * Math.min(1, dt * 12); a.y += (-YM + 0.82 - a.y) * Math.min(1, dt * 12);
              if (a.tm > 1.3) { r.bound = -1; a.st = 0; const ne = ache.reduce((b, e) => (Math.abs(e.position.x - a.x) < Math.abs(b.position.x - a.x) ? e : b), ache[0]); a.vx = (ne.position.x - a.x) * 0.9; a.vy = 0.05; a.vz = -a.z; a.y += 0.12; }
            } else if (a.st === 2) { // 분해
              a.tm += dt; a.sc = Math.max(0, 1 - a.tm * 2.2); if (a.tm > 0.45) a.on = false;
            }
            D.position.set(a.x, a.y, a.z); D.scale.setScalar(Math.max(0.001, a.sc)); D.updateMatrix(); achI.setMatrixAt(idx, D.matrix);
          });
          achI.instanceMatrix.needsUpdate = true;
          mimM.forEach((m, i) => { m.visible = drug === 'nicotine' && clk >= 2.4; });
          // 수용체 열림 · Na⁺ 유입
          let openSum = 0;
          rcv.forEach((r, ri) => {
            const nic = drug === 'nicotine' && clk >= 2.4 && ri >= 1 && ri <= 3; const want = (r.bound >= 0 && rOn) || nic ? 1 : 0; r.open += (want - r.open) * Math.min(1, dt * 9); openSum += r.open;
            r.gate.position.set(r.open * 0.4, -0.3, 0); r.gate.rotation.z = -r.open * 1.0; r.gate.material.color.set(r.open > 0.5 ? 0x33c46e : 0xe5483f);
            r.mat.emissive.set(0x33ff88); r.mat.emissiveIntensity = r.open * 0.35;
          });
          for (let k = 0; k < 8; k++) { const r = rcv[k % 4], u = (t * 0.7 + k * 0.37) % 1; D.position.set(r.x + Math.sin(k) * 0.03, -YM + 1.0 - u * 2.2, 0); D.scale.setScalar(Math.max(0.001, r.open)); D.updateMatrix(); naI.setMatrixAt(k, D.matrix); }
          naI.instanceMatrix.needsUpdate = true;
          level += (openSum / 4 - level) * Math.min(1, dt * 3);
          barFg.scale.y = Math.max(0.02, level * 3.0); barFg.position.y = -3.1 + barFg.scale.y / 2;
        
      }
      let tt = 0, lastP = 0, lastStage = -1;
      const CYC = 7;
      function resetSim() { clearAch(); vs.forEach((v) => { v.state = 0; v.sc = 1; v.t = 0; v.g.visible = true; v.g.position.copy(v.home); v.g.scale.setScalar(1); }); rcv.forEach((r) => { r.open = 0; r.bound = -1; }); level = 0; taken = false; trigger(); clk = 0; mimOn = false; }
      function replay(p) { resetSim(); let rest = p * CYC; while (rest > 0) { const h = Math.min(0.05, rest); tt += h; stepSim(h, tt); rest -= h; } lastP = p; }
      const stageNames = ['① 활동 전위 도착', '② Ca²⁺ 유입', '③ 소낭 융합', '④ 방출·확산', '⑤ 수용체 결합', '⑥ 분해·재흡수'];
      const stageAt = [0, 0.15, 1.0, 1.45, 2.4, 4.2];
      const pl = controls.player({
        duration: CYC, loop: true, autoplay: true, label: '신호 전달 6단계',
        phases: stageAt.map((c, i) => [c / CYC, stageNames[i]]),
        onFrame(p, dt) {
          const dp = p - lastP;
          if (dt > 0 && dp >= 0 && dp < 0.2) { const h = dp * CYC; if (h > 0) { tt += h; stepSim(h, tt); } lastP = p; }
          else replay(p);
          let k = 0; stageAt.forEach((c, i) => { if (p * CYC >= c) k = i; });
          if (k !== lastStage || infoDirty) { lastStage = k; infoDirty = false; const L2 = window.__sim; info('<b>' + stageNames[k] + '</b>: ' + (L2 ? L2.STAGES[k].d : '') + '<br>' + DRUGS[drug].info); }
        },
      });
      
      /* ===== 신호 합산(EPSP · IPSP): 흥분성 입력(+5 mV) · 억제성 입력(−5 mV)이 한 뉴런에 모여요 — 2D '신호 합산'과 같은 값 ===== */
      const mainG = new THREE.Group(); Array.from(root.children).forEach((o) => mainG.add(o)); root.add(mainG);
      const mainLabs = Object.keys(L).map((k) => L[k]);
      const sumG = new THREE.Group(); root.add(sumG); sumG.visible = false; const KS = narrow ? 0.62 : 0.8; sumG.scale.setScalar(KS); sumG.position.x = -2.4 * KS; const KP = (a) => [a[0] * KS - 2.4 * KS, a[1] * KS, a[2] * KS];
      const SOMA = new THREE.Mesh(new THREE.SphereGeometry(1.15, 36, 26), std(0x2f9fa8, { roughness: 0.35 })); sumG.add(SOMA);
      const snuc = new THREE.Mesh(new THREE.SphereGeometry(0.34, 18, 14), std(0x8d7fd4)); snuc.position.set(0.1, 0.1, 0.8); sumG.add(snuc);
      const axon = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 4.2, 14), std(0x7fd0c8, { roughness: 0.4 })); axon.rotation.z = Math.PI / 2; axon.position.set(3.1, 0, 0); sumG.add(axon);
      const apBall = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 14), new THREE.MeshBasicMaterial({ color: 0xffd447 })); apBall.visible = false; sumG.add(apBall);
      const inN = [], inT = [], inB = [];
      for (let side = 0; side < 2; side++) for (let i = 0; i < 8; i++) {
        const exc = side === 0, f = i / 7, deg = exc ? 170 - 140 * f : -(25 + 130 * f), a = deg * Math.PI / 180, R0 = 3.1;
        const px = Math.cos(a) * R0 - (exc ? 0.2 : 0.2), py = Math.sin(a) * R0 * 0.95, sx = Math.cos(a) * 1.15, sy = Math.sin(a) * 1.15;
        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.3, 18, 14), std(exc ? 0x22c55e : 0xef4444, { roughness: 0.4, emissive: exc ? 0x14532d : 0x7f1d1d, emissiveIntensity: 0.3 })); knob.position.set(px, py, 0); sumG.add(knob);
        const tb = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 8), std(0x9aa8bf)); const d = new THREE.Vector3(sx - px, sy - py, 0), len = d.length(); tb.position.set((px + sx) / 2, (py + sy) / 2, 0); tb.scale.set(1, len, 1); tb.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); sumG.add(tb);
        const pt = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshBasicMaterial({ color: exc ? 0x86efac : 0xfca5a5 })); sumG.add(pt);
        inN.push({ exc, i, knob, tb, pt, p: new THREE.Vector3(px, py, 0), s: new THREE.Vector3(sx, sy, 0) });
      }
      /* 합산 전위 막대 (−110 ~ −30 mV) */
      const GY = (v) => -1.9 + (v + 110) / 80 * 3.8, gBg = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3.8, 0.3), std(0x6b7aa0, { transparent: true, opacity: 0.45 })); gBg.position.set(5.6, 0, 0); sumG.add(gBg);
      const gFg = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1, 0.34), std(0x22c55e, { emissive: 0x0a4a22, emissiveIntensity: 0.4 })); sumG.add(gFg);
      const thr = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.05, 0.1), new THREE.MeshBasicMaterial({ color: 0xe2464b })); thr.position.set(5.6, GY(-55), 0.1); sumG.add(thr);
      const rest = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.04, 0.1), new THREE.MeshBasicMaterial({ color: 0x3b82f6 })); rest.position.set(5.6, GY(-70), 0.1); sumG.add(rest);
      const sl = [label('역치 −55 mV', KP([6.9, GY(-55) + 0.12, 0]), { size: 12, color: 'rgba(192,57,43,.92)' }), label('휴지 −70 mV', KP([6.9, GY(-70) - 0.12, 0]), { size: 12, color: 'rgba(29,78,216,.92)' }), label('', KP([5.6, -2.45, 0]), { size: 13, color: 'rgba(38,50,74,.92)' }), label('', KP([0, -1.9, 0.5]), { size: 13, color: 'rgba(38,50,74,.92)' }), label('흥분성 입력 (+5 mV)', KP([-2.0, 3.55, 0]), { size: 12, color: 'rgba(21,128,61,.92)' }), label('억제성 입력 (−5 mV)', KP([-2.0, -3.6, 0]), { size: 12, color: 'rgba(185,28,28,.92)' }), label('활동 전위!', KP([5.4, 0.7, 0]), { size: 14, color: 'rgba(194,65,12,.95)' })];
      sl.forEach((l) => l.show(false));
      const hostS = ctx.controls.text('').parentNode; const before = Array.from(hostS.children);
      const setRange = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); } };
      const rE = controls.range('🟢 흥분성 입력', 0, 8, 1, 2, (v) => setRange('sE', v), (v) => v + '개'), rI = controls.range('🔴 억제성 입력', 0, 8, 1, 1, (v) => setRange('sI', v), (v) => v + '개');
      const pY = controls.button('🔮 발생할 것 같아요', () => { const b = document.getElementById('bPredYes'); if (b && !b.disabled) b.click(); }), pN = controls.button('🔮 안 생길 것 같아요', () => { const b = document.getElementById('bPredNo'); if (b && !b.disabled) b.click(); });
      let lt = 0, ignS = false, actS = -9;
      const pS = controls.player({ duration: 5, loop: true, label: '신호 합산', phases: [[0, '입력이 도착해요'], [0.2, '전위가 합산돼요'], [0.4, '역치에 도달하면 활동 전위'], [0.7, '활동 전위가 퍼져요']], onFrame(p) { if (!ignS) { lt = p * 10; actS = 1; } } });
      const sumEls = Array.from(hostS.children).filter((e) => !before.includes(e));
      let sSumSig = '', sMode = '';
      const vCol = (v) => { const c = new THREE.Color(); if (v >= -40) c.set(0xf59e0b); else if (v >= -55) c.set(0xfacc15); else if (v >= -70) c.set(0x2f9fa8).lerp(new THREE.Color(0x5ac8b0), (v + 70) / 15); else c.set(0x3b82f6).lerp(new THREE.Color(0x2f9fa8), Math.max(0, 1 - (-70 - v) / 40)); return c; };
      function sumFrame(Lx, t, dt) {
        const sm = Lx.S.sm; if (!sm) return;
        const E = sm.run ? sm.runE : sm.E, I = sm.run ? sm.runI : sm.I, tot = Lx.sumV(E, I);
        const own = !sm.run; const tt = sm.run ? sm.t : (pS.playing ? lt : -1);
        const fn = Lx.apFromSum ? Lx.apFromSum(5 * (E - I)) : null;
        const V = fn && tt >= 0 ? fn.V(tt) : tot;
        rE.set(sm.E); rI.set(sm.I);
        inN.forEach((q) => { const on = q.i < (q.exc ? E : I); q.knob.scale.setScalar(on ? 1 : 0.55); q.knob.material.emissiveIntensity = on ? 0.6 : 0; q.knob.material.color.setHex(on ? (q.exc ? 0x22c55e : 0xef4444) : 0xc9d3e3); q.tb.visible = true; q.tb.material.color.setHex(on ? (q.exc ? 0x16a34a : 0xdc2626) : 0xd5deec);
          const u = tt >= 0 && tt < 2.6 && on ? Math.min(1, tt / 1.2) : -1; q.pt.visible = u >= 0; if (u >= 0) q.pt.position.lerpVectors(q.p, q.s, u * 0.9); });
        SOMA.material.color.copy(vCol(V)); SOMA.material.emissive.copy(vCol(V)); SOMA.material.emissiveIntensity = 0.25;
        const bv = Math.max(-110, Math.min(-30, tt >= 0 ? V : tot)), y0 = GY(-70), y1 = GY(bv); gFg.scale.y = Math.max(0.02, Math.abs(y1 - y0)); gFg.position.set(5.6, (y0 + y1) / 2, 0); gFg.material.color.setHex(bv >= -55 - 1e-9 ? 0xf59e0b : bv >= -70 ? 0x22c55e : 0xe2464b);
        const apOn = fn && fn.tstar != null && tt > fn.tstar; apBall.visible = !!apOn; if (apOn) { const k = Math.max(0, Math.min(1, (tt - fn.tstar) / 4.5)); apBall.position.set(1.2 + k * 4.0, 0, 0); }
        sl[2].set(Math.round(bv) + ' mV'); sl[2].show(true); sl[3].set('막전위 ' + (Math.round(V) > 0 ? '+' : Math.round(V) < 0 ? '−' : '') + Math.abs(Math.round(V)) + ' mV'); sl[3].show(true); sl[4].show(true); sl[5].show(true); sl[0].show(true); sl[1].show(true); sl[6].show(!!apOn);
        const key = E + '|' + I + '|' + (sm.run ? 1 : 0) + '|' + (sm.res ? (sm.res.ap ? 'a' : 'n') : '');
        if (key !== sSumSig) { sSumSig = key; const ap = tot >= -55 - 1e-9; info('<b>신호 합산</b> · 흥분성 <b>' + E + '</b>개(+5 mV씩) · 억제성 <b>' + I + '</b>개(−5 mV씩)<br>합산 전위 = −70 + 5 × (' + E + ' − ' + I + ') = <b>' + (tot > 0 ? '+' : tot < 0 ? '−' : '') + Math.abs(tot) + ' mV</b><br>' + (ap ? '역치(−55 mV) 이상이라 <b style="color:#fcd34d">활동 전위가 발생해요</b>.' : '역치(−55 mV)에 못 미쳐서 <b>활동 전위가 발생하지 않아요</b>.') + '<br><small>예측 버튼을 누르면 2D와 똑같이 확인해 줘요.</small>'); }
        const drivingS = sm.run; if (!pS.playing && !drivingS) { /* 정지 */ } 
        if (drivingS && !pS.playing) { ignS = true; pS.set(Math.min(1, sm.t / 10)); ignS = false; }
        pY.disabled = pN.disabled = !!sm.run;
      }
      function setSumMode(on) { mainG.visible = !on; sumG.visible = on; mainLabs.forEach((l) => l.show(false)); sl.forEach((l) => l.show(false)); before.forEach((e) => { e.style.display = on ? 'none' : ''; }); sumEls.forEach((e) => { e.style.display = on ? '' : 'none'; }); sSumSig = ''; if (on) pl.pause(); else { lastStage = -1; infoDirty = true; pl.play(); } }
      setSumMode(false);

      return { update(dt, t) { const Lx = window.__sim; const on = !!(Lx && Lx.S && Lx.S.mode === 'sum'); if (on !== sumG.visible) setSumMode(on); if (on) sumFrame(Lx, t, dt); }, sync() {} };
    },
  });
})();
