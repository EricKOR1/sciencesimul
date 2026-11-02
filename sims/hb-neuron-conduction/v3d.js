/* hb-neuron-conduction · 3D 흥분의 전도 (무수 신경 vs 말이집 신경의 도약 전도)
   위: 말이집이 있는 축삭 (랑비에 결절에서 결절로 건너뛰는 도약 전도) · 아래: 말이집이 없는 축삭 (이웃으로 차례로 전도)
   자극을 주면 두 신경에서 흥분이 이동하는 모습을 나란히 비교해요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const narrow = window.innerWidth < 600 || window.innerHeight > window.innerWidth * 1.1;
  const X0 = -4.0, IL = 1.16, NN = 8, XE = X0 + IL * (NN - 1);   // 결절 8개, 마디 사이 7개
  const HOP = 0.18, VU = 1.7;

  window.SciSim3D.attach({
    title: '흥분의 전도 3D (말이집 유무 비교)',
    hint: '자극을 주고 두 신경의 속도를 비교해 봐요 · 드래그: 돌리기',
    camera: { dist: narrow ? 18 : 13.5, theta: 0.25, phi: 1.12, min: 7, max: 26, target: [-0.4, 0, 0] },
    autoRotate: 0,
    levels: [0, 1],
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = (x, y, z) => new THREE.Vector3(x, y, z || 0);
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.45, metalness: 0.03 }, o || {}));
      const tube = (pts, r, m, seg) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg || 40, r, 10), m);
      const D = new THREE.Object3D();

      function neuron(z, myel) {
        const g = new THREE.Group(); g.position.z = z; root.add(g);
        const somaM = std(0x9a7fe0, { roughness: 0.4 });
        const soma = new THREE.Mesh(new THREE.SphereGeometry(0.62, 32, 22), somaM); soma.position.x = -5.6; g.add(soma);
        const nuc = new THREE.Mesh(new THREE.SphereGeometry(0.26, 20, 14), std(0x4b2a96)); nuc.position.set(-5.65, 0.05, 0.25); g.add(nuc);
        const dm = std(0xb59cf0, { roughness: 0.45 });
        [[-6.4, 0.7, 0.2], [-6.5, -0.2, 0.7], [-6.3, -0.8, -0.3], [-6.4, 0.3, -0.7]].forEach((q, i) => {
          g.add(tube([V3(-5.9, 0.1 * i - 0.1, 0), V3((q[0] - 5.9) / 2 - 0.1, q[1] * 0.6, q[2] * 0.6), V3(q[0] - 0.4, q[1], q[2])], 0.07, dm, 20));
          g.add(tube([V3(q[0] - 0.4, q[1], q[2]), V3(q[0] - 0.7, q[1] + 0.25, q[2] + 0.2)], 0.045, dm, 8), tube([V3(q[0] - 0.4, q[1], q[2]), V3(q[0] - 0.7, q[1] - 0.2, q[2] - 0.15)], 0.045, dm, 8));
        });
        const hill = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.9, 20), somaM); hill.rotation.z = -Math.PI / 2; hill.position.x = -4.95; g.add(hill);
        const axM = std(0xf2b24a, { roughness: 0.4 }), axR = myel ? 0.12 : 0.15;
        const axon = tube([V3(-4.6, 0, 0), V3(XE + 0.2, 0, 0)], axR, axM, 30); g.add(axon);
        // 축삭 말단
        const tm = std(0xf2b24a, { roughness: 0.4 }), tips = [];
        [[0.55, 0.65, 0.2], [0.75, 0.0, -0.1], [0.55, -0.65, 0.3]].forEach((q) => { g.add(tube([V3(XE + 0.2, 0, 0), V3(XE + 0.4, q[1] * 0.5, q[2] * 0.5), V3(XE + q[0] + 0.4, q[1], q[2])], 0.07, tm, 16)); const b = new THREE.Mesh(new THREE.SphereGeometry(0.17, 18, 12), std(0xf2b24a, { emissive: 0x000000 })); b.position.set(XE + q[0] + 0.5, q[1], q[2]); g.add(b); tips.push(b); });
        const o = { g, axon, tips, sheaths: [], nodeGlow: [], soma };
        if (myel) {
          for (let k = 0; k < NN - 1; k++) {
            const m = std(0xfff0c8, { transparent: true, opacity: 0.62, roughness: 0.3, depthWrite: false });
            const s = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, IL - 0.14 - 0.56, 8, 24), m); s.rotation.z = Math.PI / 2; s.position.x = X0 + k * IL + IL / 2; s.renderOrder = 2; g.add(s); o.sheaths.push(s);
          }
        }
        // 흥분 부위 (빛나는 띠) + 국소 전류 점
        const glowM = new THREE.MeshBasicMaterial({ color: 0xffe14d, transparent: true, opacity: 0.9, depthWrite: false });
        const glow = new THREE.Mesh(new THREE.CylinderGeometry(axR + 0.1, axR + 0.1, myel ? 0.2 : 0.7, 28, 1, true), glowM); glow.rotation.z = Math.PI / 2; glow.renderOrder = 3; g.add(glow);
        const core = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 12), new THREE.MeshBasicMaterial({ color: 0xfff6b0, transparent: true, opacity: 0.8, depthWrite: false })); core.scale.set(myel ? 1 : 2.2, 1, 1); g.add(core);
        const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff7a3d }), 6); g.add(dots);
        Object.assign(o, { glow, core, dots, glowM });
        return o;
      }
      const A = neuron(1.9, true), B = neuron(-1.9, false);
      // 랑비에 결절 표시
      const nodeM = std(0xff8a3d, { emissive: 0x7a2d00, emissiveIntensity: 0.4 });
      const nodes = []; for (let k = 0; k < NN; k++) { const n = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.025, 8, 24), nodeM); n.rotation.y = Math.PI / 2; n.position.set(X0 + k * IL, 0, 1.9); root.add(n); nodes.push(n); }
      nodes.forEach((n) => { n.visible = false; });

      const L = {
        a: label('말이집 신경 (유수 신경)', A.soma, { offset: [0.3, 1.0, 0], color: 'rgba(49,130,246,.92)' }),
        b: label('말이집 없는 신경 (무수 신경)', B.soma, { offset: [0.4, 1.0, 0], color: 'rgba(49,130,246,.92)' }),
        den: label('가지 돌기', [-6.6, 0.8, 1.9]), cell: label('신경 세포체', A.soma, { offset: [0, -0.95, 0] }),
        mye: label('말이집', A.sheaths[2], { offset: [0, 0.55, 0.1] }), nod: label('랑비에 결절', [X0 + IL * 4, 0, 1.9], { offset: [0, -0.5, 0.3], color: 'rgba(255,138,61,.92)' }),
        end: label('축삭 말단', [XE + 0.9, 0.6, 1.9]),
        ta: label('', [XE + 1.3, -0.6, 1.9], { color: 'rgba(30,150,80,.95)' }), tb: label('', [XE + 1.3, -0.6, -1.9], { color: 'rgba(30,150,80,.95)' }),
      };
      L.nod.el.style.color = '#1b2333'; L.ta.show(false); L.tb.show(false);
      let labOn = true;

      let damaged = false, tau = -0.6, finishA = -1, finishB = -1;
      const dmg = [false, false, false, false, false, false, false];
      function setDamage(v) {
        damaged = v; [1, 3, 5].forEach((k) => { dmg[k] = v; });
        A.sheaths.forEach((s, k) => { s.visible = !dmg[k]; });
        info(v ? '<b>말이집이 손상</b>되면 그 구간은 이웃으로 차례로 전도돼서 느려져요.<br>(탈수초성 질환)' : '말이집 신경은 결절에서 결절로 <b>건너뛰며(도약 전도)</b> 빨라요.<br>말이집이 없는 신경은 이웃 부위로 차례로 전도돼요.');
      }
      controls.button('▶ 자극 주기', () => stim());
      controls.segment('말이집', [{ label: '정상', value: false }, { label: '일부 손상', value: true }], false, (v) => { setDamage(v); stim(); });
      function stim() { tau = 0; finishA = finishB = -1; L.ta.show(false); L.tb.show(false); }
      controls.button('이름표 숨김/보임', () => { labOn = !labOn; ['den', 'cell', 'mye', 'nod', 'end'].forEach((k) => L[k].show(labOn)); });
      setDamage(false);

      // 말이집 신경의 시간표
      function timelineA() { const dur = dmg.map((d) => (d ? IL / (VU * 0.85) : HOP)); const cum = [0]; dur.forEach((d) => cum.push(cum[cum.length - 1] + d)); return { dur, cum }; }
      return {
        update(dt, t) {
          if (tau >= 0 || tau < 0) tau += dt;
          const ta = timelineA(), totA = ta.cum[ta.cum.length - 1], totB = (XE - X0) / VU;
          // 말이집 신경
          let ax = X0, hopping = false, f = 0, kk = -1, onA = tau >= 0 && tau < totA + 0.35;
          if (tau >= 0) {
            kk = 0; while (kk < 6 && tau > ta.cum[kk + 1]) kk++;
            if (tau <= totA) { f = (tau - ta.cum[kk]) / ta.dur[kk]; hopping = true; ax = X0 + kk * IL + (dmg[kk] ? f * IL : (f > 0.85 ? IL : 0)); }
            else ax = XE;
          }
          A.glow.visible = A.core.visible = tau >= 0 && tau < totA + 0.25;
          A.glow.position.set(ax, 0, 0); A.core.position.set(ax, 0, 0);
          const pulse = 0.85 + 0.15 * Math.sin(t * 25);
          A.glow.scale.setScalar(pulse); A.core.scale.set(1.0 * pulse, pulse, pulse);
          // 국소 전류 점 : 마디 사이를 빠르게 이동
          for (let i = 0; i < 6; i++) {
            const show = hopping && !dmg[kk] && tau >= 0;
            const u = (f * 1.0 + i / 6) % 1; D.position.set(show ? ax * 0 + (X0 + kk * IL + u * IL) : 0, 0, 0); D.scale.setScalar(show ? 1 : 0.001); D.rotation.set(0, 0, 0); D.updateMatrix(); A.dots.setMatrixAt(i, D.matrix);
          }
          A.dots.instanceMatrix.needsUpdate = true;
          // 무수 신경
          const bx = Math.min(XE, X0 + Math.max(0, tau) * VU);
          B.glow.visible = B.core.visible = tau >= 0 && tau < totB + 0.25;
          B.glow.position.set(bx, 0, 0); B.core.position.set(bx, 0, 0); B.glow.scale.setScalar(pulse); B.core.scale.set(2.2 * pulse, pulse, pulse);
          for (let i = 0; i < 6; i++) { const show = tau >= 0 && tau < totB; D.position.set(show ? bx + 0.45 + (i * 0.14 + (t * 1.5) % 0.14) : 0, 0, 0); D.scale.setScalar(show ? 0.8 : 0.001); D.updateMatrix(); B.dots.setMatrixAt(i, D.matrix); }
          B.dots.instanceMatrix.needsUpdate = true;
          // 도착 표시
          if (tau >= totA && finishA < 0) { finishA = totA; L.ta.set('도착 ' + totA.toFixed(1) + '초'); L.ta.show(true); }
          if (tau >= totB && finishB < 0) { finishB = totB; L.tb.set('도착 ' + totB.toFixed(1) + '초'); L.tb.show(true); }
          [[A, finishA], [B, finishB]].forEach(([o, f2]) => o.tips.forEach((tp) => { const on = f2 >= 0 && tau - f2 < 0.8; tp.material.emissive.set(on ? 0xffc933 : 0x000000); tp.material.emissiveIntensity = on ? 1 : 0; }));
          // 결절 표시 (활성)
          nodes.forEach((n, k) => { n.visible = labOn; });
        },
        sync() {},
      };
    },
  });
})();
