/* hb-neuron-potential · 3D 신경 세포막과 이온 통로 (휴지 전위 · 활동 전위)
   세포막에 박힌 Na⁺ 통로·K⁺ 통로·Na⁺-K⁺ 펌프를 확대해서, 이온이 드나들 때 막전위가 어떻게 바뀌는지 입체로 확인해요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const narrow = window.innerWidth < 600 || window.innerHeight > window.innerWidth * 1.1;
  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  const XNA = -3.0, XK = -0.4, XP = 2.6;

  window.SciSim3D.attach({
    title: '신경 세포막 3D (이온 통로)',
    hint: '드래그: 돌리기 · 상태를 눌러 이온의 이동을 살펴봐요',
    camera: { dist: narrow ? 14.5 : 11, theta: 0.28, phi: 1.22, min: 6, max: 20, target: [0, 0, 0] },
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.45, metalness: 0.03 }, o || {}));
      const R = rng(11), D = new THREE.Object3D();

      /* 인지질 2중층 */
      const heads = [], tails = [];
      for (let x = -5.3; x <= 5.3; x += 0.42) for (let z = -1.5; z <= 1.5; z += 0.42) {
        if ([XNA, XK, XP].some((px) => Math.abs(x - px) < 0.78 && Math.abs(z) < 0.78)) continue;
        const jx = x + (R() - 0.5) * 0.08, jz = z + (R() - 0.5) * 0.08;
        heads.push([jx, 0.4, jz], [jx, -0.4, jz]);
        [-1, 1].forEach((sd) => { tails.push([jx + sd * 0.07, 0.215, jz], [jx + sd * 0.07, -0.215, jz]); });
      }
      const hI = new THREE.InstancedMesh(new THREE.SphereGeometry(0.17, 12, 8), std(0xf5cfa8, { roughness: 0.5 }), heads.length);
      const tI = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.035, 0.035, 0.34, 8), std(0xe0a95a, { roughness: 0.6 }), tails.length);
      heads.forEach((p, i) => { D.position.set(p[0], p[1], p[2]); D.scale.setScalar(1); D.updateMatrix(); hI.setMatrixAt(i, D.matrix); });
      tails.forEach((p, i) => { D.position.set(p[0], p[1], p[2]); D.updateMatrix(); tI.setMatrixAt(i, D.matrix); });
      root.add(hI, tI);

      /* 통로 단백질 */
      function barrel(x, col) {
        const g = new THREE.Group(); g.position.set(x, 0, 0);
        const m = std(col, { roughness: 0.35, side: THREE.DoubleSide });
        g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 1.3, 36, 1, true), m));
        [0.65, -0.65].forEach((y) => { const t = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.09, 12, 36), m); t.rotation.x = Math.PI / 2; t.position.y = y; g.add(t); });
        root.add(g); return g;
      }
      const naCh = barrel(XNA, 0x7a5be0), kCh = barrel(XK, 0x20a58f);
      const gateM = (c) => std(c, { roughness: 0.4, emissive: 0x000000 });
      const naGateM = gateM(0xe5483f), kGateM = gateM(0xe5483f);
      const naGate = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.1, 28), naGateM); naGate.position.set(XNA, 0.7, 0); root.add(naGate);
      const kGate = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.1, 28), kGateM); kGate.position.set(XK, -0.7, 0); root.add(kGate);
      const pump = new THREE.Group(); pump.position.set(XP, 0, 0); root.add(pump);
      const pumpM = std(0x9a7fe0, { roughness: 0.35 });
      const pb = new THREE.Mesh(new THREE.SphereGeometry(0.72, 36, 24), pumpM); pb.scale.set(1, 0.95, 1); pump.add(pb);
      const pr = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.07, 10, 28), std(0x6c4fc4)); pr.rotation.x = Math.PI / 2; pr.position.y = 0.62; pump.add(pr);
      const atp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), std(0xffd34d, { emissive: 0xffa800, emissiveIntensity: 0.6 })); atp.position.set(0.1, -0.88, 0.1); pump.add(atp);

      /* 이온 : Na⁺(많음: 세포 밖) · K⁺(많음: 세포 안) */
      const NA_OUT = 56, NA_IN = 7, K_IN = 46, K_OUT = 6, NF = 9, NP = 3, KP = 2;
      const naTotal = NA_OUT + NA_IN + NF + NP, kTotal = K_IN + K_OUT + NF + KP;
      const naI = new THREE.InstancedMesh(new THREE.SphereGeometry(0.15, 16, 12), std(0xffb02e, { roughness: 0.3, emissive: 0x6a4000, emissiveIntensity: 0.5 }), naTotal);
      const kI = new THREE.InstancedMesh(new THREE.SphereGeometry(0.15, 16, 12), std(0x4aa8ff, { roughness: 0.3, emissive: 0x0a3a78, emissiveIntensity: 0.5 }), kTotal);
      root.add(naI, kI);
      const ions = (n, side) => Array.from({ length: n }, () => ({ x: (R() - 0.5) * 11, y: side * (0.9 + R() * 2.6), z: (R() - 0.5) * 3.2, vx: (R() - 0.5), vy: (R() - 0.5), vz: (R() - 0.5), side }));
      const naA = ions(NA_OUT, 1).concat(ions(NA_IN, -1)), kA = ions(K_IN, -1).concat(ions(K_OUT, 1));
      function wander(a, dt) {
        a.forEach((p) => {
          p.vx += (R() - 0.5) * dt * 6; p.vy += (R() - 0.5) * dt * 6; p.vz += (R() - 0.5) * dt * 6;
          const m = Math.hypot(p.vx, p.vy, p.vz) || 1, sp = 0.5; p.vx *= sp / m; p.vy *= sp / m; p.vz *= sp / m;
          p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
          if (Math.abs(p.x) > 5.5) { p.vx *= -1; p.x = Math.sign(p.x) * 5.5; }
          if (Math.abs(p.z) > 1.7) { p.vz *= -1; p.z = Math.sign(p.z) * 1.7; }
          if (p.side > 0) { if (p.y < 0.85) { p.vy = Math.abs(p.vy); p.y = 0.85; } if (p.y > 3.5) { p.vy = -Math.abs(p.vy); p.y = 3.5; } }
          else { if (p.y > -0.85) { p.vy = -Math.abs(p.vy); p.y = -0.85; } if (p.y < -3.5) { p.vy = Math.abs(p.vy); p.y = -3.5; } }
        });
      }

      /* 막전위 눈금 + 막 안팎의 전하 표시 */
      const trackM = std(0x6b7aa0, { roughness: 0.6 });
      const track = new THREE.Mesh(new THREE.BoxGeometry(0.08, 6.2, 0.08), trackM); track.position.set(-5.9, 0, 0); root.add(track);
      const zero = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.1), std(0xffffff)); zero.position.set(-5.9, 1.0, 0); root.add(zero);
      const thumb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 14), std(0xffd34d, { emissive: 0xffa800, emissiveIntensity: 0.5 })); thumb.position.set(-5.9, -1.5, 0); root.add(thumb);
      const crossG = new THREE.BoxGeometry(0.2, 0.05, 0.05), crossG2 = new THREE.BoxGeometry(0.05, 0.2, 0.05);
      function signSet(y, plus, col) {
        const g = new THREE.Group(); const m = std(col, { emissive: col, emissiveIntensity: 0.5 });
        for (let i = 0; i < 12; i++) { const s = new THREE.Group(); s.add(new THREE.Mesh(crossG, m)); if (plus) s.add(new THREE.Mesh(crossG2, m)); s.position.set(-5 + i * 0.9, y, 1.55); s.rotation.x = -0.3; g.add(s); }
        root.add(g); return g;
      }
      const outPlus = signSet(0.78, true, 0xff6a5c), outMinus = signSet(0.78, false, 0x5aa8ff), inMinus = signSet(-0.78, false, 0x5aa8ff), inPlus = signSet(-0.78, true, 0xff6a5c);

      /* 이름표 */
      const lNa = label('Na⁺ 통로', naCh, { offset: [0, 1.15, 0] }), lK = label('K⁺ 통로', kCh, { offset: [0, -1.15, 0] }), lP = label('Na⁺-K⁺ 펌프', pump, { offset: [0, 1.15, 0] }), lAtp = label('ATP', atp, { offset: [0.5, -0.1, 0], color: 'rgba(255,170,0,.92)' }); lAtp.el.style.color = '#1b2333';
      label('세포 밖', [4.4, 3.4, 0], { color: 'rgba(80,90,120,.9)' }); label('세포 안', [4.4, -3.4, 0], { color: 'rgba(80,90,120,.9)' });
      const lNaI = label('Na⁺ (노랑)', [-4.4, 2.9, 0], { color: 'rgba(255,176,46,.92)' }); lNaI.el.style.color = '#1b2333';
      const lKI = label('K⁺ (파랑)', [-4.4, -2.9, 0], { color: 'rgba(74,168,255,.92)' });
      const lV = label('−70 mV', thumb, { offset: [0.9, 0, 0], size: 15, color: 'rgba(40,50,80,.95)' });

      /* 상태 */
      const TARGET = { rest: -70, dep: 30, rep: -80 };
      let st = 'rest', vm = -70, pumpOn = true, auto = false, autoT = 0, lastInfo = '';
      const INFO = {
        rest: '<b>휴지 상태</b>: 통로가 닫혀 있고 Na⁺-K⁺ 펌프가 일해요.<br>막 안쪽이 바깥쪽보다 (−)여서 약 −70 mV예요.',
        dep: '<b>탈분극</b>: Na⁺ 통로가 열려 Na⁺이 세포 안으로 확산해요.<br>막전위가 (+)쪽으로 올라가요.',
        rep: '<b>재분극</b>: Na⁺ 통로는 닫히고 K⁺ 통로가 열려 K⁺이 밖으로 나가요.<br>막전위가 다시 (−)로 내려가요.',
      };
      const seg = controls.segment('', [{ label: '휴지 상태', value: 'rest' }, { label: '탈분극', value: 'dep' }, { label: '재분극', value: 'rep' }], 'rest', (v) => { auto = false; ab.classList.remove('on'); st = v; });
      const ab = controls.button('▶ 활동 전위 자동', () => { auto = !auto; ab.classList.toggle('on', auto); autoT = 0; if (auto) st = 'rest', seg.set('rest'); });
      const pb2 = controls.button('펌프 끄기', () => { pumpOn = !pumpOn; pb2.textContent = pumpOn ? '펌프 끄기' : '펌프 켜기'; pb2.classList.toggle('on', !pumpOn); });
      let gNa = 0, gK = 0;
      const tmp = new THREE.Color();

      return {
        update(dt, t) {
          if (auto) {
            autoT += dt;
            const seq = autoT % 5.2, ns = seq < 1.2 ? 'rest' : seq < 2.9 ? 'dep' : seq < 4.5 ? 'rep' : 'rest';
            if (ns !== st) { st = ns; seg.set(ns); }
          }
          // 통로 열림 정도 · 막전위
          const wNa = st === 'dep' ? 1 : 0, wK = st === 'rep' ? 1 : 0;
          gNa += (wNa - gNa) * Math.min(1, dt * 8); gK += (wK - gK) * Math.min(1, dt * 8);
          const tgtV = !pumpOn && st === 'rest' ? -55 : TARGET[st];
          vm += (tgtV - vm) * Math.min(1, dt * (st === 'dep' ? 3.2 : st === 'rep' ? 2.2 : 1.5));
          naGate.position.set(XNA + gNa * 0.75, 0.7 + gNa * 0.1, 0); naGate.rotation.z = -gNa * 0.9; naGateM.color.set(gNa > 0.5 ? 0x33c46e : 0xe5483f);
          kGate.position.set(XK + gK * 0.75, -0.7 - gK * 0.1, 0); kGate.rotation.z = gK * 0.9; kGateM.color.set(gK > 0.5 ? 0x33c46e : 0xe5483f);
          // 펌프
          pb.scale.set(1 + (pumpOn ? 0.05 * Math.sin(t * 5) : 0), 0.95 + (pumpOn ? 0.04 * Math.cos(t * 5) : 0), 1);
          pumpM.color.set(pumpOn ? 0x9a7fe0 : 0x7d8190); lP.set(pumpOn ? 'Na⁺-K⁺ 펌프' : 'Na⁺-K⁺ 펌프 (멈춤)'); lAtp.show(pumpOn);
          // 이온 이동
          wander(naA, dt); wander(kA, dt);
          let ni = 0, ki = 0;
          const put = (mesh, i, x, y, z, s) => { D.position.set(x, y, z); D.scale.setScalar(s); D.updateMatrix(); mesh.setMatrixAt(i, D.matrix); };
          naA.forEach((p) => put(naI, ni++, p.x, p.y, p.z, 1)); kA.forEach((p) => put(kI, ki++, p.x, p.y, p.z, 1));
          for (let i = 0; i < NF; i++) { // Na⁺ : 밖 → 안
            const u = (t * 0.55 + i / NF) % 1, y = 2.6 - u * 5.2, inCh = Math.abs(y) < 0.9, s = gNa;
            const ox = 0.0, x = XNA + (inCh ? 0 : Math.sin(i * 7 + t) * 0.3 * (Math.abs(y) - 0.9)), z = inCh ? 0 : Math.cos(i * 5) * 0.3 * (Math.abs(y) - 0.9);
            put(naI, ni++, x + ox, y, z, Math.max(0.001, s));
          }
          for (let i = 0; i < NF; i++) { // K⁺ : 안 → 밖
            const u = (t * 0.5 + i / NF) % 1, y = -2.6 + u * 5.2, inCh = Math.abs(y) < 0.9, s = gK;
            const x = XK + (inCh ? 0 : Math.sin(i * 5 + t) * 0.3 * (Math.abs(y) - 0.9)), z = inCh ? 0 : Math.cos(i * 3) * 0.3 * (Math.abs(y) - 0.9);
            put(kI, ki++, x, y, z, Math.max(0.001, s));
          }
          for (let i = 0; i < NP; i++) { // 펌프: Na⁺ 3개 밖으로
            const u = (t * 0.28 + i / NP) % 1, y = -2.0 + u * 4.0, s = pumpOn ? Math.sin(u * Math.PI) : 0;
            put(naI, ni++, XP + Math.sin(u * 6 + i) * 0.12, y, Math.cos(u * 6 + i) * 0.12, Math.max(0.001, Math.min(1, s * 2)));
          }
          for (let i = 0; i < KP; i++) { // 펌프: K⁺ 2개 안으로
            const u = (t * 0.28 + i / KP + 0.25) % 1, y = 2.0 - u * 4.0, s = pumpOn ? Math.sin(u * Math.PI) : 0;
            put(kI, ki++, XP + Math.sin(u * 6 + i) * 0.12, y, Math.cos(u * 6 + i) * 0.12, Math.max(0.001, Math.min(1, s * 2)));
          }
          naI.instanceMatrix.needsUpdate = true; kI.instanceMatrix.needsUpdate = true;
          // 눈금과 전하 부호
          const s = Math.max(-0.5, Math.min(1, -vm / 70));
          const sc = (g, v) => { g.visible = v > 0.05; g.scale.setScalar(Math.max(0.01, v)); };
          sc(outPlus, s); sc(inMinus, s); sc(outMinus, -s); sc(inPlus, -s);
          thumb.position.y = (vm + 20) * 0.05; zero.position.y = 1.0;
          lV.set((vm < 0 ? '−' : vm > 0 ? '+' : '') + Math.abs(Math.round(vm)) + ' mV');
          lNa.set(gNa > 0.5 ? 'Na⁺ 통로 (열림)' : 'Na⁺ 통로 (닫힘)'); lK.set(gK > 0.5 ? 'K⁺ 통로 (열림)' : 'K⁺ 통로 (닫힘)');
          const key = st + (pumpOn ? '' : 'x');
          if (key !== lastInfo) { lastInfo = key; info(INFO[st] + (pumpOn ? '' : '<br>펌프가 멈추면 이온 농도 차이가 점점 사라져요.')); }
        },
        sync() {},
      };
    },
  });
})();
