/* hb-neuro-endocrine · 3D 신경 신호와 호르몬 신호 비교
   위: 신경 - 축삭을 따라 한 표적 세포에 빠르게 · 아래: 호르몬 - 혈액을 타고 퍼지며 수용체가 있는 표적 세포에만 작용(느리지만 넓고 오래)
   [신호 보내기]를 눌러 속도·범위·지속 시간의 차이를 직접 봐요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const narrow = window.innerWidth < 600 || window.innerHeight > window.innerWidth * 1.1;
  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  const ZN = -2.6, ZH = 2.4, XT = 3.7;

  window.SciSim3D.attach({
    title: '신경 신호 vs 호르몬 신호 3D',
    hint: '신호를 보내 속도 · 범위 · 지속 시간을 비교해 봐요',
    camera: { dist: narrow ? 21 : 15.5, theta: 0.12, phi: 0.95, min: 7, max: 28, target: [0, 0, 0] },
    autoRotate: 0,
    levels: [0, 1],
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = (x, y, z) => new THREE.Vector3(x, y, z || 0);
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.45, metalness: 0.03 }, o || {}));
      const ghost = (c, op, o) => std(c, Object.assign({ transparent: true, opacity: op, depthWrite: false, roughness: 0.25 }, o || {}));
      const tube = (pts, r, m, seg) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg || 40, r, 10), m);
      const R = rng(9), D = new THREE.Object3D();

      /* 바닥 판 두 개 (신경 · 호르몬 구역) */
      [[ZN, 0x1b2a55], [ZH, 0x3a1d38]].forEach(([z, c]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(13.4, 0.1, 4.6), std(c, { roughness: 0.9, transparent: true, opacity: 0.55 })); m.position.set(0, -1.15, z); m.receiveShadow = true; root.add(m); });

      /* 세포 만들기 */
      function cell(x, z, kind) { // kind: 'tn' 신경 표적 · 'nn' 비표적 · 'th' 호르몬 표적 · 'nh' 비표적
        const g = new THREE.Group(); g.position.set(x, 0, z);
        const base = kind[0] === 't' ? 0xe0517a : 0x6f7a90;
        const m = std(base, { roughness: 0.4, emissive: 0x000000 });
        g.add(new THREE.Mesh(new THREE.SphereGeometry(0.62, 32, 22), m));
        const nm = std(kind[0] === 't' ? 0x8a2a58 : 0x4a5262); const nu = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 12), nm); nu.position.set(0.1, 0.05, 0.12); g.add(nu);
        root.add(g); return { g, m, kind, glow: 0, hold: 0, x, z };
      }
      function receptor(c, dirx, dirz, type) {
        const d = new THREE.Vector3(dirx, 0, dirz).normalize();
        const geo = type === 'cone' ? new THREE.ConeGeometry(0.2, 0.34, 18, 1, true) : new THREE.BoxGeometry(0.3, 0.3, 0.3);
        const mat = std(type === 'cone' ? 0x33c46e : 0x8a8f9c, { side: THREE.DoubleSide, roughness: 0.4 });
        const r = new THREE.Mesh(geo, mat);
        if (type === 'cone') r.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d); r.position.copy(d.clone().multiplyScalar(0.7));
        c.g.add(r); return r;
      }

      /* 신경 구역 */
      const somaM = std(0x7a55d0, { roughness: 0.4 });
      const soma = new THREE.Mesh(new THREE.SphereGeometry(0.75, 32, 22), somaM); soma.position.set(-5.2, 0, ZN); root.add(soma);
      const dm = std(0xb59cf0); [[-0.9, 0.5, 0.5], [-1.0, -0.3, 0.7], [-0.9, 0.3, -0.7], [-0.8, -0.2, -0.55]].forEach((q) => root.add(tube([V3(-5.2 - 0.5, 0, ZN), V3(-5.2 + q[0] * 1.3, q[1] * 0.8, ZN + q[2]), V3(-5.2 + q[0] * 1.8, q[1], ZN + q[2] * 1.4)], 0.06, dm, 12)));
      const axM = std(0xf2b24a, { roughness: 0.4 });
      root.add(tube([V3(-4.5, 0, ZN), V3(2.9, 0, ZN)], 0.12, axM, 30));
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.28, 24, 16), std(0xf2b24a)); bulb.position.set(3.0, 0, ZN); root.add(bulb);
      const tN = cell(XT + 0.55, ZN, 'tn'), n1 = cell(XT + 0.55, ZN - 1.9, 'nn'), n2 = cell(XT + 0.55, ZN + 1.5, 'nn'), n3 = cell(XT + 2.05, ZN - 0.4, 'nn');
      receptor(tN, -1, 0, 'cone'); [n1, n2, n3].forEach((c) => receptor(c, -1, 0, 'box'));
      const pulse = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 12), new THREE.MeshBasicMaterial({ color: 0xffe14d, transparent: true, opacity: 0.9 })); pulse.visible = false; root.add(pulse);
      const ntI = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshBasicMaterial({ color: 0x7ee8ff }), 10); root.add(ntI);

      /* 호르몬 구역 */
      const vesM = ghost(0xff6b6b, 0.22, { roughness: 0.2, side: THREE.DoubleSide });
      const vessel = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 12.4, 36, 1, true), vesM); vessel.rotation.z = Math.PI / 2; vessel.position.set(0.3, 0, ZH); vessel.renderOrder = 2; root.add(vessel);
      const vend = (x) => { const t = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.05, 8, 30), std(0xd94a4a)); t.rotation.y = Math.PI / 2; t.position.set(x, 0, ZH); root.add(t); }; vend(-5.9); vend(6.5);
      const gland = new THREE.Mesh(new THREE.SphereGeometry(0.95, 36, 24), std(0xb560c4, { roughness: 0.4 })); gland.position.set(-5.2, 0, ZH - 1.9); root.add(gland);
      const gm = std(0xffa24d, { emissive: 0x7a3c00, emissiveIntensity: 0.4 }); for (let k = 0; k < 9; k++) { const gr = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), gm); const a = k * 2.4; gr.position.set(-5.2 + Math.cos(a) * 0.5, Math.sin(a * 1.3) * 0.4, ZH - 1.9 + Math.sin(a) * 0.5); root.add(gr); }
      root.add(tube([V3(-5.2, 0, ZH - 1.2), V3(-5.0, 0, ZH - 0.7), V3(-4.5, 0, ZH - 0.3)], 0.12, std(0xd18ad9), 12));
      // 호르몬 표적 세포 3 · 비표적 3
      const HC = [['th', 0.6, ZH + 1.7], ['nh', 1.6, ZH - 1.7], ['th', 2.6, ZH + 1.7], ['nh', 3.8, ZH - 1.7], ['th', 4.7, ZH + 1.7], ['nh', 5.7, ZH + 1.7]].map((q) => { const c = cell(q[1], q[2], q[0]); receptor(c, 0, q[2] > ZH ? -1 : 1, q[0] === 'th' ? 'cone' : 'box'); return c; });
      const targets = HC.filter((c) => c.kind === 'th');
      const hI = new THREE.InstancedMesh(new THREE.ConeGeometry(0.1, 0.24, 14), std(0xff8a3d, { emissive: 0x7a3000, emissiveIntensity: 0.5 }), 44), hormones = [];
      root.add(hI);
      const rbcI = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 12, 8), std(0xe5483f, { roughness: 0.4 }), 22); root.add(rbcI);
      const rbc = Array.from({ length: 22 }, (_, i) => ({ u: i / 22, dz: (R() - 0.5) * 0.7, dy: (R() - 0.5) * 0.7 }));

      /* 이름표 */
      const L = {
        tn: label('신경 신호', soma, { offset: [0.8, 1.2, 0], color: 'rgba(49,130,246,.92)' }),
        tg: label('표적 세포', tN.g, { offset: [0, 1.1, 0] }), nt: label('표적 아님', n1.g, { offset: [0, 1.0, 0] }),
        th: label('호르몬 신호', gland, { offset: [0.6, 1.4, 0], color: 'rgba(49,130,246,.92)' }),
        gl: label('내분비샘', gland, { offset: [0, -1.1, 0] }), bv: label('혈관', [-2.5, 0.8, ZH], {}),
        t2: label('표적 세포', targets[0].g, { offset: [0, 1.1, 0] }), n2: label('표적 아님', HC[1].g, { offset: [0, 1.0, 0] }),
        rec: label('수용체', [XT, 0.5, ZN], {}),
      };
      L.rec.show(false);
      const tmsg = label('', [XT + 0.2, 1.4, ZN], { color: 'rgba(30,150,80,.95)' }); tmsg.show(false);
      const hmsg = label('', [2.6, 1.5, ZH + 1.7], { color: 'rgba(30,150,80,.95)' }); hmsg.show(false);

      let clk = -1, show = 'both', emitT = 0, nSent = 0, firstN = -1, firstH = -1;
      function send() {
        clk = 0; emitT = 0; nSent = 0; firstN = firstH = -1; tmsg.show(false); hmsg.show(false);
        hormones.length = 0; [tN, ...HC].forEach((c) => { c.glow = 0; c.hold = 0; });
      }
      controls.button('▶ 신호 보내기', send);
      controls.segment('보기', [{ label: '둘 다', value: 'both' }, { label: '신경만', value: 'n' }, { label: '호르몬만', value: 'h' }], 'both', (v) => { show = v; });
      info('<b>신경</b>: 연결된 한 곳에 빠르게, 짧게<br><b>호르몬</b>: 혈액으로 온몸에, 수용체가 맞는 표적 세포에만 느리지만 오래');

      const hpos = new THREE.Vector3();
      return {
        update(dt, t) {
          if (clk >= 0) clk += dt;
          const showN = show !== 'h', showH = show !== 'n';
          // ----- 신경 -----
          const tp = clk / 0.5; // 0~1: 축삭을 따라 이동
          pulse.visible = showN && clk >= 0 && tp < 1; pulse.position.set(-4.5 + Math.min(1, tp) * 7.4, 0, ZN); pulse.scale.setScalar(1 + 0.2 * Math.sin(t * 30));
          for (let i = 0; i < 10; i++) { const u = (clk - 0.5 - i * 0.015) / 0.35, on = showN && u > 0 && u < 1; D.position.set(3.3 + Math.min(1, u) * 0.3 + Math.sin(i) * 0.02, Math.sin(i * 2.1) * 0.12, ZN + Math.cos(i * 1.7) * 0.12); D.scale.setScalar(on ? 1 : 0.001); D.rotation.set(0, 0, 0); D.updateMatrix(); ntI.setMatrixAt(i, D.matrix); }
          ntI.instanceMatrix.needsUpdate = true;
          if (clk >= 0.85 && firstN < 0) { firstN = clk; tN.glow = 1; tN.hold = 0.9; tmsg.set('반응! (' + clk.toFixed(1) + '초)'); tmsg.show(showN); }
          // ----- 호르몬 -----
          if (clk >= 0.1 && clk < 2.2 && showH) { emitT += dt; while (emitT > 0.09) { emitT -= 0.09; if (hormones.length < 40) hormones.push({ x: -4.5, y: (R() - 0.5) * 0.5, z: ZH + (R() - 0.5) * 0.5, st: 0, tm: 0, v: 1.35 + R() * 0.3, site: null, tgt: -1 }); } }
          for (let i = hormones.length - 1; i >= 0; i--) {
            const h = hormones[i];
            if (h.st === 0) {
              h.x += h.v * dt; h.y += (R() - 0.5) * dt * 1.2; h.z += (R() - 0.5) * dt * 1.2; h.y = Math.max(-0.4, Math.min(0.4, h.y)); h.z = Math.max(ZH - 0.4, Math.min(ZH + 0.4, h.z));
              targets.forEach((c, ci) => { if (h.st === 0 && Math.abs(h.x - c.x) < 0.12 && R() < 0.5 && !c.taken) { h.st = 1; h.tm = 0; h.tgt = ci; c.taken = (c.taken || 0) + 1; } });
              if (h.x > 6.4) hormones.splice(i, 1);
            } else if (h.st === 1) {
              const c = targets[h.tgt]; h.tm += dt;
              const sx = c.x + (Math.sin(h.tm * 0 + i) * 0.1), sz = c.z - 0.75, k = Math.min(1, h.tm / 0.5);
              h.x += (sx - h.x) * k * 0.2; h.y += (0 - h.y) * k * 0.2; h.z += (sz - h.z) * k * 0.2;
              if (h.tm > 0.5 && c.glow < 1) { c.glow = 1; c.hold = 6; if (firstH < 0) { firstH = clk; hmsg.set('첫 반응 ' + clk.toFixed(1) + '초'); hmsg.show(showH); } }
              if (h.tm > 6) { c.taken = 0; hormones.splice(i, 1); }
            }
          }
          for (let i = 0; i < 44; i++) { const h = hormones[i]; if (h && showH) { D.position.set(h.x, h.y, h.z); D.rotation.set(0, 0, h.st ? -Math.PI / 2 * 0 : Math.PI / 2 * (h.st ? 0 : -1)); D.rotation.z = h.st === 0 ? -Math.PI / 2 : 0; D.scale.setScalar(1); } else { D.position.set(0, -50, 0); D.scale.setScalar(0.001); } D.updateMatrix(); hI.setMatrixAt(i, D.matrix); }
          hI.instanceMatrix.needsUpdate = true;
          rbc.forEach((r, i) => { r.u = (r.u + dt * 0.12) % 1; D.position.set(-5.7 + r.u * 12.2, r.dy * 0.7, ZH + r.dz * 0.7); D.rotation.set(0, 0, 0); D.scale.set(1, 0.6, 1); D.updateMatrix(); rbcI.setMatrixAt(i, D.matrix); });
          rbcI.instanceMatrix.needsUpdate = true;
          // 표적 세포 반응(빛남)
          [tN, ...targets].forEach((c) => { c.hold -= dt; const want = c.hold > 0 ? 1 : 0; c.glow += (want - c.glow) * Math.min(1, dt * (want ? 8 : 3)); c.m.emissive.set(0x33e07a); c.m.emissiveIntensity = c.glow * 0.65; c.g.scale.setScalar(1 + c.glow * 0.08); });
          L.tn.show(showN); L.tg.show(showN); L.nt.show(showN); L.th.show(showH); L.gl.show(showH); L.bv.show(showH); L.t2.show(showH); L.n2.show(showH);
          pulse.visible = pulse.visible && showN;
          tmsg.show(showN && firstN >= 0 && clk < 6); hmsg.show(showH && firstH >= 0);
          if (clk > 14) clk = -1;
        },
        sync() {},
      };
    },
  });
})();
