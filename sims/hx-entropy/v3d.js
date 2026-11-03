/* hx-entropy · 3D 기체의 확산과 엔트로피
   1단계 '저절로 일어나는 변화'(기체가 양쪽으로 퍼짐)와 2단계 '배열의 수와 엔트로피'(두 칸 용기, 입자 4 · 10 · 20개)에서 열려요.
   - 1단계: 2D에서 '기체가 양쪽으로 퍼짐' 장면을 재생하면 칸막이가 열리고 입자가 퍼져요. 3D 단추로도 열고 닫을 수 있어요.
   - 2단계: 2D의 입자 수 N · '한 번 섞기'로 만든 배열(보라 = 왼쪽 칸, 주황 = 오른쪽 칸)을 그대로 입체로 보여 줘요.
   입자가 양쪽에 고르게 있는 배열이 훨씬 많아서(경우의 수↑) 엔트로피가 커지는 방향으로 일이 일어나요.
   3·4단계(증가 조건 · 부호 예측)는 2D 화면에서 해요. */
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
    levels: [0, 1],
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3;
      let N = 20, open = false, plate = 0, wasPlay = false, lastMode = '';      // plate: 0(닫힘) → 1(완전히 열림)
      const box = new THREE.Mesh(new THREE.BoxGeometry(LX * 2, LY * 2, LZ * 2), new THREE.MeshStandardMaterial({ color: 0xbfe3ff, transparent: true, opacity: 0.12, roughness: 0.1, side: THREE.DoubleSide, depthWrite: false })); root.add(box);
      root.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(LX * 2, LY * 2, LZ * 2)), new THREE.LineBasicMaterial({ color: 0x9fc8ee, transparent: true, opacity: 0.8 })));
      const base = new THREE.Mesh(new THREE.BoxGeometry(LX * 2 + 0.5, 0.25, LZ * 2 + 0.5), new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.5, metalness: 0.4 })); base.position.y = -LY - 0.125; root.add(base);
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.1, LY * 2, LZ * 2), new THREE.MeshStandardMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.7, roughness: 0.3, depthWrite: false })); root.add(wall);
      const glow = new THREE.Mesh(new THREE.BoxGeometry(LX, LY * 2 - 0.05, LZ * 2 - 0.05), new THREE.MeshBasicMaterial({ color: 0xff9a2e, transparent: true, opacity: 0.07, depthWrite: false })); glow.position.x = -LX / 2; root.add(glow);
      const m = new THREE.InstancedMesh(new THREE.SphereGeometry(RAD, 18, 14), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.05, emissive: 0x552200, emissiveIntensity: 0.25 }), MAXN);
      m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); root.add(m);
      const P = [];
      function reset() {
        P.length = 0;
        for (let i = 0; i < MAXN; i++) P.push({ p: new V3(-0.3 - Math.random() * (LX - 0.6), (Math.random() * 2 - 1) * (LY - 0.3), (Math.random() * 2 - 1) * (LZ - 0.3)), d: new V3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(), f: 0.7 + Math.random() * 0.6 });
        open = false; plate = 0; if (seg2) seg2.set('closed');
      }
      const labL = label('', [-LX / 2, LY + 0.3, 0], { color: 'rgba(30,41,59,.9)' }), labR = label('', [LX / 2, LY + 0.3, 0], { color: 'rgba(30,41,59,.9)' });
      const M = new THREE.Matrix4(), mtx = M;
      let txt = '', seg2 = null; const ORANGE = new THREE.Color(0xffa94d), PURPLE = new THREE.Color(0x8b5cf6), ORG2 = new THREE.Color(0xf59e0b), zz = Array.from({ length: MAXN }, () => (Math.random() * 2 - 1) * (LZ - 0.35));
      const sim2 = () => { try { return window.__sim; } catch (e) { return null; } };
      const binom = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return Math.round(r); };
      seg2 = controls.segment('칸막이', [{ value: 'closed', label: '닫기' }, { value: 'open', label: '열기' }], 'closed', (v) => { open = v === 'open'; });
      controls.button('↺ 다시 왼쪽에 모으기', () => reset());
      const note = controls.text('입자 수와 배열은 2D 화면의 조작판에서 바꿔요.');
      reset();
      /* 2단계: 2D의 배열(M.pts)을 그대로 */
      function model(dt, M) {
        const n = Math.min(MAXN, M.pts.length), tgt = 1 - (M.divider != null ? M.divider : 1);
        plate += (tgt - plate) * Math.min(1, dt * 6);
        wall.position.set(0, plate * (LY * 2 + 0.2), 0); wall.visible = plate < 0.98; glow.visible = false;
        let nl = 0;
        for (let i = 0; i < MAXN; i++) {
          if (i >= n) { mtx.makeScale(0.0001, 0.0001, 0.0001); m.setMatrixAt(i, mtx); continue; }
          const q = M.pts[i], left = q.side === 0; if (left) nl++;
          const x = (q.x - 0.5) * 2 * (LX - 0.25), y = (0.5 - q.y) * 2 * (LY - 0.25);
          mtx.makeTranslation(x + Math.sin(performance.now() / 400 + i) * 0.05, y + Math.cos(performance.now() / 330 + i * 1.7) * 0.05, zz[i]); m.setMatrixAt(i, mtx);
          m.setColorAt(i, left ? PURPLE : ORG2);
        }
        m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
        const k = M.last >= 0 ? M.last : n, tr = M.trials[M.k] || 0, one = M.one[M.k] || 0;
        const arr = binom(n, k), tot = Math.pow(2, n);
        const t = '<b>입자 ' + n + '개 · 두 칸 용기</b> (보라 = 왼쪽 칸, 주황 = 오른쪽 칸)<br>' + (M.last >= 0 ? '이번 배열: 왼쪽 ' + k + '개 · 오른쪽 ' + (n - k) + '개' : '처음에는 모두 왼쪽 칸에 있어요.') + '<br>이런 배열의 수: <b>' + arr + '</b>가지 (전체 ' + tot + '가지)<br>섞은 횟수 ' + tr + '번 · 모두 한쪽에 모인 횟수 ' + one + '번';
        if (t !== txt) { txt = t; info(t); labL.set('왼쪽 ' + k); labR.set('오른쪽 ' + (n - k)); }
      }
      return {
        update(dt) {
          dt = Math.min(dt, 0.05);
          const w2 = sim2(), S2 = w2 && w2.S, md = S2 ? S2.mode : '';
          if (md !== lastMode) { lastMode = md; txt = ''; if (md === 'model') seg2.set('open'); }
          if (md === 'model' && S2.md && S2.md.pts && S2.md.pts.length) { model(dt, S2.md); return; }
          if (md === 'obs' && S2.ob) {            // 2D '기체가 양쪽으로 퍼짐' 재생에 맞춰 칸막이를 열고 닫아요
            const playing = S2.ob.sel === 1 && S2.ob.p > 0.02;
            if (playing !== wasPlay) { wasPlay = playing; if (playing) { open = true; seg2.set('open'); } else { reset(); } }
          }
          N = 20;
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
            M.makeTranslation(q.p.x, q.p.y, q.p.z); m.setMatrixAt(i, M); m.setColorAt(i, ORANGE);
          }
          m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
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
