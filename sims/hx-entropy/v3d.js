/* hx-entropy · 3D 기체의 확산과 엔트로피
   칸막이를 열면 한쪽에 몰려 있던 입자가 저절로 퍼져요. 입자가 양쪽에 고르게 있는 배치가 훨씬 많아서(경우의 수↑)
   엔트로피가 커지는 방향으로 일이 일어나요. 입자 수가 적으면 한쪽으로 다시 몰리는 일도 가끔 있어요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const LX = 3.4, LY = 1.7, LZ = 1.7, MAXN = 120, RAD = 0.17;

  window.SciSim3D.attach({
    title: '확산과 엔트로피 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHONE ? 14 : 10, theta: 0.45, phi: 1.15, min: 6, max: 24 },
    autoRotate: 0.12,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3;
      let N = 30, open = false, plate = 0;      // plate: 0(닫힘) → 1(완전히 열림)
      const box = new THREE.Mesh(new THREE.BoxGeometry(LX * 2, LY * 2, LZ * 2), new THREE.MeshStandardMaterial({ color: 0xbfe3ff, transparent: true, opacity: 0.12, roughness: 0.1, side: THREE.DoubleSide, depthWrite: false })); root.add(box);
      root.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(LX * 2, LY * 2, LZ * 2)), new THREE.LineBasicMaterial({ color: 0x9fc8ee, transparent: true, opacity: 0.8 })));
      const base = new THREE.Mesh(new THREE.BoxGeometry(LX * 2 + 0.5, 0.25, LZ * 2 + 0.5), new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.5, metalness: 0.4 })); base.position.y = -LY - 0.125; root.add(base);
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.1, LY * 2, LZ * 2), new THREE.MeshStandardMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.7, roughness: 0.3, depthWrite: false })); root.add(wall);
      const glow = new THREE.Mesh(new THREE.BoxGeometry(LX, LY * 2 - 0.05, LZ * 2 - 0.05), new THREE.MeshBasicMaterial({ color: 0xff9a2e, transparent: true, opacity: 0.07, depthWrite: false })); glow.position.x = -LX / 2; root.add(glow);
      const m = new THREE.InstancedMesh(new THREE.SphereGeometry(RAD, 18, 14), new THREE.MeshStandardMaterial({ color: 0xffa94d, roughness: 0.3, metalness: 0.05, emissive: 0x552200, emissiveIntensity: 0.25 }), MAXN);
      m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); root.add(m);
      const P = [];
      function reset() {
        P.length = 0;
        for (let i = 0; i < MAXN; i++) P.push({ p: new V3(-0.3 - Math.random() * (LX - 0.6), (Math.random() * 2 - 1) * (LY - 0.3), (Math.random() * 2 - 1) * (LZ - 0.3)), d: new V3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(), f: 0.7 + Math.random() * 0.6 });
        open = false; plate = 0; seg2.set('closed');
      }
      const labL = label('', [-LX / 2, LY + 0.3, 0], { color: 'rgba(30,41,59,.9)' }), labR = label('', [LX / 2, LY + 0.3, 0], { color: 'rgba(30,41,59,.9)' });
      const M = new THREE.Matrix4();
      let txt = '';
      const seg1 = controls.segment('입자 수', [4, 10, 30, 80].map((v) => ({ value: v, label: v + '개' })), N, (v) => { N = v; });
      const seg2 = controls.segment('칸막이', [{ value: 'closed', label: '닫기' }, { value: 'open', label: '열기' }], 'closed', (v) => { open = v === 'open'; });
      controls.button('↺ 다시 왼쪽에 모으기', () => reset());
      reset();
      return {
        update(dt) {
          dt = Math.min(dt, 0.05);
          plate += ((open ? 1 : 0) - plate) * Math.min(1, dt * 3.5); if (open && plate > 0.995) plate = 1;
          wall.position.set(0, plate * (LY * 2 + 0.2), 0); wall.visible = plate < 0.98;
          const gapY = -LY + plate * LY * 2 + 0.0;   // 칸막이 아래 끝 높이
          let nl = 0, nr = 0;
          for (let i = 0; i < MAXN; i++) {
            const q = P[i];
            if (i >= N) { M.makeScale(0.0001, 0.0001, 0.0001); m.setMatrixAt(i, M); continue; }
            const x0 = q.p.x;
            q.p.addScaledVector(q.d, 2.2 * q.f * dt);
            if (q.p.x > LX - RAD) { q.p.x = LX - RAD; q.d.x *= -1; } else if (q.p.x < -LX + RAD) { q.p.x = -LX + RAD; q.d.x *= -1; }
            if (q.p.y > LY - RAD) { q.p.y = LY - RAD; q.d.y *= -1; } else if (q.p.y < -LY + RAD) { q.p.y = -LY + RAD; q.d.y *= -1; }
            if (q.p.z > LZ - RAD) { q.p.z = LZ - RAD; q.d.z *= -1; } else if (q.p.z < -LZ + RAD) { q.p.z = -LZ + RAD; q.d.z *= -1; }
            // 칸막이: 아래쪽 틈(y < gapY)에서는 지나갈 수 있어요
            if (plate < 0.98 && ((x0 < 0) !== (q.p.x < 0)) && q.p.y + RAD > gapY) { q.p.x = x0; q.d.x *= -1; }
            if (q.p.x < 0) nl++; else nr++;
            M.makeTranslation(q.p.x, q.p.y, q.p.z); m.setMatrixAt(i, M);
          }
          m.instanceMatrix.needsUpdate = true;
          glow.visible = plate < 0.5;
          const W = Math.pow(0.5, N);
          const pLeftAll = N <= 30 ? '모두 왼쪽에 있을 확률 (½)<sup>' + N + '</sup> ≈ ' + (W >= 0.001 ? (W * 100).toFixed(W > 0.1 ? 0 : 2) + ' %' : '거의 0') : '모두 왼쪽에 있을 확률은 거의 0이에요';
          const t = open ? '<b>칸막이를 열었어요</b><br>왼쪽 ' + nl + '개 · 오른쪽 ' + nr + '개<br>' + pLeftAll : '<b>칸막이가 닫혀 있어요</b><br>입자 ' + N + '개가 모두 왼쪽에 있어요.<br>칸막이를 열어 보세요.';
          if (t !== txt) { txt = t; info(t); labL.set('왼쪽 ' + nl); labR.set('오른쪽 ' + nr); }
        },
      };
    },
  });
})();
