/* hb-metabolism-atp · 3D 물질대사와 ATP
   2D 차시와 같은 장면을 입체로: ① 동화(식물 잎·광합성)와 이화(근육 세포·세포호흡) 분자 반응
   ② 세포호흡 에너지 100 = ATP 40 + 열 60 (운동 강도) ③ ATP 충전소(충전·방전, 세균·식물·동물 세포)
   2D의 단추·슬라이더(반응 실행, 운동 강도, 세포 종류, 세포호흡·활동 켜기)가 3D를 그대로 움직여요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const TAU = Math.PI * 2;
  const L2 = () => window.__sim || null;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const inOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const outC = (t) => 1 - Math.pow(1 - t, 3);
  const outBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
  const smooth = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };

  const v3 = window.SciSim3D.attach({
    title: '물질대사와 ATP 3D',
    hint: '반응 실행 · 운동 강도 · 세포호흡/활동 단추는 아래 2D 제어판과 같이 움직여요 · 드래그: 돌리기',
    camera: { dist: 12.5, theta: 0.0, phi: 1.2, min: 6, max: 24 },
    autoRotate: 0,
    levels: [0, 1, 2],
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.45, metalness: 0.03 }, o || {}));
      const ghost = (c, op, o) => std(c, Object.assign({ transparent: true, opacity: op, depthWrite: false, roughness: 0.3 }, o || {}));
      const basic = (c) => new THREE.MeshBasicMaterial({ color: c });
      const sph = (r, m, x, y, z, sx, sy, sz) => { const o = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), m); o.position.set(x || 0, y || 0, z || 0); if (sx) o.scale.set(sx, sy, sz); return o; };
      const cyl = (r0, r1, h, m) => new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, 14), m);
      const M = { C: std(0x6b7280), O: std(0xef4444), H: std(0xe5e7eb), Ow: std(0x3b82f6), Cg: std(0xf59e0b), bond: std(0x8b95a5) };
      function bar(a, b, r) { const d = b.clone().sub(a), m = cyl(r, r, d.length(), M.bond); m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return m; }
      function mol(kind) {
        const g = new THREE.Group(), V = (x, y, z) => new THREE.Vector3(x, y, z || 0);
        if (kind === 'co2') { g.add(bar(V(-0.42, 0), V(0.42, 0), 0.05), sph(0.2, M.O, -0.42, 0, 0), sph(0.2, M.O, 0.42, 0, 0), sph(0.23, M.C, 0, 0, 0)); }
        else if (kind === 'h2o') { g.add(sph(0.23, M.Ow, 0, 0, 0), sph(0.13, M.H, -0.26, -0.2, 0), sph(0.13, M.H, 0.26, -0.2, 0)); }
        else if (kind === 'o2') { g.add(bar(V(-0.2, 0), V(0.2, 0), 0.05), sph(0.2, M.O, -0.2, 0, 0), sph(0.2, M.O, 0.2, 0, 0)); }
        else {
          for (let i = 0; i < 6; i++) { const t = i / 6 * TAU + 0.5, p = V(Math.cos(t) * 0.55, Math.sin(t) * 0.55, 0), q = V(Math.cos(t + TAU / 6) * 0.55, Math.sin(t + TAU / 6) * 0.55, 0); g.add(bar(p, q, 0.04), sph(0.2, i === 2 ? M.O : M.Cg, p.x, p.y, 0), sph(0.11, M.H, Math.cos(t) * 0.92, Math.sin(t) * 0.92, 0.1)); }
        }
        return g;
      }

      /* ---------- ① 동화와 이화 ---------- */
      const rx = new THREE.Group(); root.add(rx);
      const cellBox = new THREE.Mesh(new THREE.BoxGeometry(10.4, 4.6, 2.6), ghost(0x4caf50, 0.12)); rx.add(cellBox);
      const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(10.4, 4.6, 2.6)), new THREE.LineBasicMaterial({ color: 0x2e7d32 })); rx.add(frame);
      const sunG = new THREE.Group(); sunG.position.set(-4.4, 2.0, 0); sunG.add(sph(0.45, basic(0xfbbf24)));
      for (let i = 0; i < 3; i++) { const r = cyl(0.04, 0.04, 2.2, std(0xf59e0b, { emissive: 0xf59e0b, emissiveIntensity: 0.5 })); r.position.set(0.6 + i * 0.35, -0.9 - i * 0.1, 0); r.rotation.z = 0.7; sunG.add(r); }
      rx.add(sunG);
      const flash = sph(1, basic(0xfde047), 0, 0, 0); flash.material.transparent = true; rx.add(flash);
      const U = (u, v) => new THREE.Vector3((u - 0.5) * 10, (0.5 - v) * 4.3, 0);
      const ctr = U(0.5, 0.5);
      function agents(kind) {
        const A = [];
        if (kind === 'leaf') {
          for (let i = 0; i < 6; i++) { A.push({ k: 'co2', a: U(0.07 + (i % 3) * 0.085, 0.2 + Math.floor(i / 3) * 0.15), d: i * 0.025, mode: 'in', j: i }); A.push({ k: 'h2o', a: U(0.07 + (i % 3) * 0.085, 0.6 + Math.floor(i / 3) * 0.15), d: i * 0.025 + 0.012, mode: 'in', j: i + 6 }); }
          A.push({ k: 'glu', mode: 'prod' });
          for (let i = 0; i < 6; i++) A.push({ k: 'o2', mode: 'o2', b: U(0.9, 0.14 + i * 0.13), d: i * 0.02 });
        } else {
          A.push({ k: 'glu', a: U(0.14, 0.5), mode: 'in', d: 0, j: 0 });
          for (let i = 0; i < 6; i++) A.push({ k: 'o2', a: U(0.06, 0.16 + i * 0.13), mode: 'in', d: 0.03 + i * 0.02, j: i });
          for (let i = 0; i < 6; i++) { A.push({ k: 'co2', mode: 'out', b: U(0.66 + (i % 3) * 0.085, 0.2 + Math.floor(i / 3) * 0.15), d: i * 0.02 }); A.push({ k: 'h2o', mode: 'out', b: U(0.66 + (i % 3) * 0.085, 0.58 + Math.floor(i / 3) * 0.15), d: i * 0.02 + 0.01 }); }
        }
        A.forEach((g) => { g.m = mol(g.k); rx.add(g.m); g.m.visible = false; });
        return A;
      }
      const AG = { leaf: agents('leaf'), muscle: agents('muscle') };
      const labRx = {
        glu: label('포도당 (큰 분자)', rx, { offset: [3.6, -1.9, 0.9] }), o2: label('산소', rx, { offset: [4.5, -2.4, 0.9] }),
        small: label('이산화 탄소와 물 (작은 분자)', rx, { offset: [3.1, 2.4, 0.9] }), atp: label('⚡ ATP', rx, { offset: [-0.9, 2.3, 0.9], color: 'rgba(22,163,74,.92)' }), heat: label('🔥 열', rx, { offset: [0.9, 2.3, 0.9], color: 'rgba(220,38,38,.92)' }),
        light: label('빛에너지 흡수', sunG, { offset: [0.9, 0.7, 0] }),
      };
      [labRx.glu, labRx.o2, labRx.small, labRx.atp, labRx.heat, labRx.light].forEach((l) => l.show(false));
      function updateRx(R) {
        const k = R.kind, p = R.p;
        cellBox.material.color.setHex(k === 'leaf' ? 0x4caf50 : 0xdc2626); frame.material.color.setHex(k === 'leaf' ? 0x2e7d32 : 0xb91c1c);
        sunG.visible = k === 'leaf';
        AG.leaf.forEach((g) => (g.m.visible = false)); AG.muscle.forEach((g) => (g.m.visible = false));
        AG[k].forEach((g) => {
          let pos, s = 1, a = true;
          if (g.mode === 'in') { const t = inOut(clamp((p - 0.04 - g.d) / 0.44, 0, 1)); pos = g.a.clone().lerp(new THREE.Vector3(ctr.x + (g.j % 3 - 1) * 0.3, ctr.y + (Math.floor(g.j / 3) % 2 - 0.5) * 0.6, (g.j % 2 - 0.5) * 0.8), t); a = p < 0.5 ? true : p < 0.6; s = 1 - 0.3 * clamp((p - 0.45) / 0.15, 0, 1); }
          else if (g.mode === 'prod') { const t = clamp((p - 0.55) / 0.25, 0, 1), m = inOut(clamp((p - 0.7) / 0.25, 0, 1)); s = Math.max(0.01, outBack(t)); pos = ctr.clone().lerp(U(0.72, 0.5), m); a = t > 0; }
          else { const t0 = (g.mode === 'o2' ? 0.6 : 0.58) + g.d, t = outC(clamp((p - t0) / (g.mode === 'o2' ? 0.35 : 0.38), 0, 1)); pos = ctr.clone().lerp(g.b, t); a = p >= t0; s = 0.4 + 0.6 * t; }
          g.m.visible = a; g.m.position.copy(pos); g.m.scale.setScalar(s); g.m.rotation.z = g.k === 'o2' ? 0.2 : 0;
        });
        const f = p > 0.48 && p < 0.66 ? 1 - Math.abs(p - 0.57) / 0.09 : 0; flash.visible = f > 0; flash.scale.setScalar(0.5 + 1.8 * f); flash.material.opacity = clamp(f, 0, 1) * 0.7;
        const done = p > 0.97;
        labRx.glu.show(done && k === 'leaf'); labRx.o2.show(done && k === 'leaf'); labRx.small.show(done && k === 'muscle'); labRx.light.show(k === 'leaf');
        labRx.atp.show(k === 'muscle' && p > 0.52); labRx.heat.show(k === 'muscle' && p > 0.52);
      }

      /* ---------- ② 에너지 전환 ---------- */
      const en = new THREE.Group(); root.add(en);
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(1.3, 2.2, 8, 24), ghost(0xfca5a5, 0.4)); body.rotation.z = Math.PI / 2; en.add(body);
      const mitos = []; [[-1.0, -0.2], [0.3, 0.4], [1.1, -0.35]].forEach((q, i) => { const m = sph(0.55, std(0xf87171, { roughness: 0.35 }), q[0], q[1], 0, 1.6, 0.8, 0.8); m.rotation.z = i * 0.5 - 0.3; en.add(m); mitos.push(m); });
      const arrow = (col) => { const g = new THREE.Group(); const sh = cyl(0.06, 0.06, 1, std(col, { emissive: col, emissiveIntensity: 0.25 })); sh.position.y = 0.5; const hd = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.34, 14), sh.material); hd.position.y = 1.0; g.add(sh, hd); return g; };
      const arrows = {
        glu: arrow(0xf59e0b), o2: arrow(0xef4444), atp: arrow(0x16a34a), co2: arrow(0x64748b),
        h0: arrow(0xdc2626), h1: arrow(0xdc2626), h2: arrow(0xdc2626),
      };
      const setArrow = (a, from, dir, len, w) => { a.position.copy(from); a.rotation.set(0, 0, dir); a.scale.set(w, len, w); };
      Object.values(arrows).forEach((a) => en.add(a));
      const thermo = new THREE.Group(); thermo.position.set(-5.2, -0.2, 0); en.add(thermo);
      thermo.add(cyl(0.18, 0.18, 3.2, ghost(0xffffff, 0.5)), sph(0.38, std(0xe2464b), 0, -1.7, 0));
      const mercury = cyl(0.1, 0.1, 1, std(0xe2464b, { emissive: 0x801010, emissiveIntensity: 0.3 })); thermo.add(mercury);
      const ebar = new THREE.Group(); ebar.position.set(0, -3.1, 0); en.add(ebar);
      const eA = new THREE.Mesh(new THREE.BoxGeometry(4 * 0.9, 0.5, 0.5), std(0x22c55e)), eB = new THREE.Mesh(new THREE.BoxGeometry(6 * 0.9, 0.5, 0.5), std(0xef4444));
      eA.position.x = -5 * 0.9 + 2 * 0.9 - 0.0 + 0.0; eA.position.x = -4.5 + 1.8; eB.position.x = -4.5 + 3.6 + 2.7 + 0.05;
      ebar.add(eA, eB);
      const L_en = {
        cell: label('세포호흡 (미토콘드리아)', body, { offset: [0, -1.8, 0.8] }), glu: label('포도당', en, { offset: [-3.6, 1.3, 0.8] }), o2: label('산소', en, { offset: [-3.6, -1.3, 0.8] }),
        atp: label('ATP', en, { offset: [3.9, 0.7, 0.8], color: 'rgba(22,163,74,.92)' }), heat: label('열 (체온 유지)', en, { offset: [0, 3.6, 0.8], color: 'rgba(220,38,38,.92)' }), co2: label('CO₂ · H₂O', en, { offset: [1.2, -3.0, 0.8] }),
        t: label('', thermo, { offset: [0.9, 0, 0] }), a40: label('ATP에 저장 40', ebar, { offset: [-2.7, 0.7, 0] }), h60: label('열로 방출 60', ebar, { offset: [2.2, 0.7, 0] }),
      };
      const NP = 40, parts = []; // 흐르는 알갱이: 포도당(노랑) 산소(빨강) → ATP(초록) 열(주황) 위로
      const pm = [std(0xf59e0b, { emissive: 0xf59e0b, emissiveIntensity: 0.4 }), std(0xef4444, { emissive: 0xef4444, emissiveIntensity: 0.3 }), std(0x22c55e, { emissive: 0x22c55e, emissiveIntensity: 0.5 }), std(0xff5a36, { emissive: 0xff3300, emissiveIntensity: 0.5 })];
      for (let i = 0; i < NP; i++) { const kind = i % 4, m = sph(0.11, pm[kind], 0, 0, 0); en.add(m); parts.push({ m, kind, ph: (i / NP * 3.7) % 1 }); }
      function updateEn(E, t) {
        const R = E.Rs, w = 0.5 + R * 0.12;
        setArrow(arrows.glu, new THREE.Vector3(-4.2, 0.9, 0), -Math.PI / 2, 1.9, 0.9 + R * 0.12); setArrow(arrows.o2, new THREE.Vector3(-4.2, -0.9, 0), -Math.PI / 2, 1.9, 0.9 + R * 0.12);
        setArrow(arrows.atp, new THREE.Vector3(2.2, 0, 0), -Math.PI / 2 * -1 + Math.PI, 1.9, 0.9 + R * 0.12);
        arrows.atp.rotation.z = Math.PI / 2 * -1; arrows.atp.rotation.z = -Math.PI / 2; arrows.atp.position.set(2.0, 0, 0);
        arrows.glu.rotation.z = -Math.PI / 2; arrows.glu.position.set(-4.3, 0.9, 0); arrows.o2.rotation.z = -Math.PI / 2; arrows.o2.position.set(-4.3, -0.9, 0);
        [-1, 0, 1].forEach((k, i) => { const a = arrows['h' + i]; a.rotation.set(0, 0, 0); a.position.set(k * 1.0, 1.3, 0); a.scale.set(0.6 + R * 0.2, 1.4, 0.6 + R * 0.2); });
        arrows.co2.rotation.set(0, 0, Math.PI); arrows.co2.position.set(0, -1.3, 0); arrows.co2.scale.set(0.8, 1.2, 0.8);
        mitos.forEach((m, i) => m.scale.setScalar(1 + 0.04 * Math.sin(t * (4 + R) + i)));
        mercury.scale.y = Math.max(0.05, (E.T - 36) / 3 * 3.0); mercury.position.y = -1.6 + mercury.scale.y / 2;
        L_en.t.set('체온 ' + E.T.toFixed(1) + ' °C');
        const sp = 0.25 + R * 0.09;
        parts.forEach((q) => {
          const u = (q.ph + t * sp) % 1;
          if (q.kind === 0) q.m.position.set(lerp(-4.3, -1.6, u), 0.9 + (q.ph - 0.5) * 0.2, (q.ph - 0.5) * 0.8);
          else if (q.kind === 1) q.m.position.set(lerp(-4.3, -1.6, u), -0.9 + (q.ph - 0.5) * 0.2, (q.ph - 0.5) * 0.8);
          else if (q.kind === 2) q.m.position.set(lerp(1.7, 4.4, u), (q.ph - 0.5) * 0.4, (q.ph - 0.5) * 0.8);
          else q.m.position.set((q.ph - 0.5) * 2.6, lerp(1.3, 3.4, u), (q.ph - 0.5) * 0.8);
          q.m.visible = (q.kind !== 3) || q.ph * 2 < 0.6 + R * 0.3;
        });
      }

      /* ---------- ③ ATP 충전소 ---------- */
      const at = new THREE.Group(); root.add(at);
      const cellMesh = new THREE.Mesh(new THREE.BoxGeometry(11.2, 5.0, 2.4), ghost(0xf9a8a8, 0.18)); at.add(cellMesh);
      const mitoG = new THREE.Group(); at.add(mitoG);
      const mito = sph(1, std(0xfdba74, { roughness: 0.4 }), 0, 0, 0, 1.55, 0.85, 0.85); mitoG.add(mito);
      const crista = new THREE.Mesh(new THREE.TorusKnotGeometry(0.5, 0.05, 80, 6, 2, 3), std(0xc9732f)); crista.scale.set(1.3, 0.6, 0.6); mitoG.add(crista);
      const flag = new THREE.Group(); at.add(flag);
      const workG = new THREE.Group(); at.add(workG);
      const muscle = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 2.2, 8, 20), std(0xf08a97)); muscle.rotation.z = Math.PI / 2; workG.add(muscle);
      const beads = []; for (let i = 0; i < 8; i++) { const b = sph(0.3, std(0xf59e0b), -1.7 + i * 0.5, 0, 0); workG.add(b); beads.push(b); }
      const wave = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-1.6, 0, 0), new THREE.Vector3(1.6, 0, 0)]), 30, 0.08, 8), std(0xb45309)); workG.add(wave);
      const tip = sph(0.4, std(0xfbbf24), 1.8, 0, 0); workG.add(tip);
      const stock = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(3.0, 2.4, 1.6)), new THREE.LineBasicMaterial({ color: 0x16a34a })); at.add(stock);
      const stockBox = new THREE.Mesh(new THREE.BoxGeometry(3.0, 2.4, 1.6), ghost(0xffffff, 0.35)); at.add(stockBox);
      const toks = []; for (let i = 0; i < 6; i++) {
        const g = new THREE.Group(); const sh = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.36, 0.36), ghost(0xffffff, 0.9, { roughness: 0.2 })); g.add(sh);
        const fill = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.3, 0.3), std(0x16a34a, { emissive: 0x16a34a, emissiveIntensity: 0.3 })); g.add(fill);
        const nub = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.14, 0.14), std(0x94a3b8)); nub.position.x = 0.35; g.add(nub);
        at.add(g); toks.push({ g, fill }); }
      const LA = {
        cell: label('', cellMesh, { offset: [-3.8, 2.8, 1.3], size: 14, color: 'rgba(51,65,85,.92)' }), mito: label('', mitoG, { offset: [0, -1.5, 0.8] }), work: label('', workG, { offset: [0, -1.3, 0.8] }),
        stock: label('', stock, { offset: [0, 1.6, 0] }), adp: label('ADP + Ⓟ', at, { offset: [-3.4, -2.2, 0], size: 12 }), chg: label('충전 ▶', at, { offset: [-1.0, 0.6, 0.8], color: 'rgba(22,163,74,.92)', size: 12 }), dis: label('방전 ▶', at, { offset: [1.9, 0.6, 0.8], color: 'rgba(109,40,217,.92)', size: 12 }),
        state: label('', workG, { offset: [0, 1.3, 0.5], size: 12 }), warn: label('⚠️ ATP가 바닥나서 활동이 멈췄어요!', at, { offset: [0, 3.0, 0], color: 'rgba(220,38,38,.95)', size: 14 }),
      };
      const L0 = L2();
      function updateAt(A, t) {
        const S = L2(), AP = S.AP, P = AP.panel, k = 11 / P.w, cx = P.x + P.w / 2, cy = P.y + P.h / 2, W = (q) => new THREE.Vector3((q.x - cx) * k, -(q.y - cy) * k, 0);
        const ct = S.CELLS[A.type];
        cellMesh.material.color.set(ct.col); cellMesh.scale.set(1, P.h / P.w > 0.7 ? 1.6 : 1, 1);
        mitoG.position.copy(W(AP.mito)); workG.position.copy(W(AP.work));
        const bact = A.type === 'bact';
        mito.visible = !bact; crista.visible = !bact; flag.visible = false;
        const on = A.resp;
        mitoG.scale.setScalar(bact ? 1 : 1 + (on ? 0.04 * Math.sin(t * 6) : 0));
        mito.material.color.setHex(on ? 0xfdba74 : 0xfed7aa); mito.material.emissive.setHex(on ? 0x7a3a00 : 0); mito.material.emissiveIntensity = on ? 0.5 : 0;
        muscle.visible = A.type === 'animal'; beads.forEach((b, i) => { b.visible = A.type === 'plant'; b.scale.setScalar(i < A.beads ? 1 : 0.35); b.material.color.setHex(i < A.beads ? 0xf59e0b : 0xe5e7eb); });
        wave.visible = bact; tip.visible = bact;
        const pl = A.pulse; muscle.scale.set(1 + 0.2 * pl, 1 - 0.18 * pl, 1 + 0.2 * pl);
        if (bact) { const pts = []; for (let i = 0; i <= 24; i++) { const x = -1.6 + i * 3.2 / 24; pts.push(new THREE.Vector3(x, Math.sin(i * 0.7 - A.wave * 3) * (0.06 + 0.2 * pl) * (i / 24) * 3, 0)); } wave.geometry.dispose(); wave.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, 0.08, 8); }
        const sp = AP.ps(0), s5 = AP.ps(5); stock.position.copy(W({ x: (sp.x + s5.x) / 2, y: (sp.y + s5.y) / 2 })); stockBox.position.copy(stock.position);
        const stw = Math.abs(s5.x - sp.x) + 70, sth = Math.abs(s5.y - sp.y) + 50; [stock, stockBox].forEach((o) => o.scale.set(stw * k / 3.0, sth * k / 2.4, 1));
        A.tok.forEach((q, i) => { const o = toks[i], p = W(q); o.g.position.set(p.x, p.y, 0.3); const f = clamp(q.f, 0, 1); o.fill.scale.x = Math.max(0.03, f); o.fill.position.x = -0.28 * (1 - f); o.fill.material.color.setHex(f > 0.55 ? 0x16a34a : 0x94a3b8); o.fill.material.emissiveIntensity = f > 0.55 ? 0.35 : 0; });
        LA.cell.set(ct.name + ' · 같은 ATP를 써요');
        LA.mito.set(bact ? '세포막·세포질 (세포호흡)' : '미토콘드리아 (세포호흡)'); LA.work.set(A.type === 'animal' ? '근육 세포: 근수축' : A.type === 'plant' ? '물질 합성 (예: 녹말 사슬)' : '편모 운동 (움직임)');
        LA.stock.set('🔋 ATP 저장고 (' + S.atpCount() + ' / 6)'); LA.state.set(A.act ? '활동 중 (ATP 사용)' : '활동 멈춤');
        LA.adp.show(true); LA.warn.show(!!A.depleted);
        const PW = W(AP.pw(0)); LA.adp.obj = at; LA.adp.off = [PW.x + 0.9, PW.y - 0.5, 0];
      }

      /* ---------- 장면 전환 ---------- */
      let scene = '';
      const sceneOf = () => { const S = L2(); if (!S) return 'react'; const m = S.S.mode; return m === 'energy' ? 'energy' : m === 'atp' ? 'atp' : m === 'react' ? 'react' : (scene || 'atp'); };
      function setScene(sc) {
        scene = sc; rx.visible = sc === 'react'; en.visible = sc === 'energy'; at.visible = sc === 'atp';
        Object.values(labRx).forEach((l) => l.show(false)); Object.values(L_en).forEach((l) => l.show(sc === 'energy'));
        Object.values(LA).forEach((l) => l.show(sc === 'atp')); LA.warn.show(false);
      }
      const reactTxt = (R) => (R.kind === 'leaf'
        ? '<b>식물 잎 · 광합성 (동화 작용)</b><br>6CO₂ + 6H₂O + 빛에너지 → C₆H₁₂O₆ + 6O₂<br>작은 분자가 큰 분자로 합성돼요 · 에너지 흡수'
        : '<b>근육 세포 · 세포호흡 (이화 작용)</b><br>C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O + 에너지(ATP·열)<br>큰 분자가 작은 분자로 분해돼요 · 에너지 방출');
      let lastInfo = '';
      function setInfo(h) { if (h !== lastInfo) { lastInfo = h; info(h); } }

      /* ▶ 반응 재생: 2D의 ‘반응 실행’과 같은 진행(p)을 반복해서 보여 줘요 (2D 반응 실행 중에는 2D 진행을 그대로 따라가요) */
      let plGuard = false;
      const pl = controls.player({
        duration: 6, loop: true, autoplay: false, label: '반응 재생',
        phases: [[0, '반응물'], [0.45, '반응'], [0.6, '생성물']],
        onFrame(p) { const S = L2(); if (plGuard || !S || S.S.rx.run || scene !== 'react') return; const R = S.S.rx; R.p = p; R.burst = p >= 0.52; },
      });

      return {
        update(dt, t) {
          const S = L2(); if (!S) return;
          const sc = sceneOf(); if (sc !== scene) setScene(sc);
          if (sc === 'react') {
            const R = S.S.rx; if (R.run) { plGuard = true; pl.set(R.p); plGuard = false; pl.pause(); }
            updateRx(R); setInfo(reactTxt(R) + '<br>' + (R.p === 0 ? '▶ 반응 실행(또는 ▶ 반응 재생)을 눌러요' : R.p > 0.97 ? (R.kind === 'leaf' ? '포도당(큰 분자)과 산소가 만들어졌어요' : '이산화 탄소와 물(작은 분자)로 분해됐어요') : ''));
          } else if (sc === 'energy') {
            const E = S.S.en; updateEn(E, t);
            setInfo('포도당 1단위가 분해될 때 에너지 100의 이동: <b>ATP에 저장 40</b> + <b>열로 방출 60</b><br>운동 강도 ' + E.i + ' % · 세포호흡 속도 R = ' + S.rnum(E.i).toFixed(1) + '<br>지금 1초에: ATP 생성 ' + S.atpOf(E.i) + ' · 열 방출 ' + S.heatOf(E.i) + ' · 체온 ' + E.T.toFixed(1) + ' °C');
          } else {
            const A = S.S.at; updateAt(A, t);
            setInfo('<b>ATP 충전소</b>: 세포호흡의 에너지로 <b>충전</b>(ADP + Ⓟ → ATP), 활동 부위에서 <b>방전</b>(ATP → ADP + Ⓟ)<br>ATP 저장량 ' + S.atpCount() + ' / 6 · 충전–방전 한 바퀴 ' + A.cycles + '회<br>🫁 세포호흡 ' + (A.resp ? '켜짐' : '꺼짐') + ' · 💪 활동 ' + (A.act ? '켜짐' : '꺼짐'));
          }
        },
        sync() { scene = ''; lastInfo = ''; },
      };
    },
  });

  /* 카드를 끌어 놓는 화면(분류·연쇄)에서는 3D를 잠시 닫아 줘요 */
  let closedByMe = false, lk = '';
  setInterval(() => {
    const S = L2(); if (!S) return;
    const k = S.S.mode + ':' + (S.S.sub ? S.S.sub[S.S.mode] : '');
    if (k === lk) return; lk = k;
    if (/^apply:|^react:sort$/.test(k)) { if (v3.isOpen) { v3.close(); closedByMe = true; } }
    else if (closedByMe) { closedByMe = false; v3.open(); }
  }, 300);
})();
