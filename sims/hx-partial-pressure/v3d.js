/* hx-partial-pressure · 3D 혼합 기체와 분압
   He · N₂ · O₂ 입자를 한 용기에 넣고 개수를 바꿔 보면, 전체 압력이 각 기체 분압의 합이라는 것을 쌓아 올린 기둥으로 볼 수 있어요.
   (같은 부피·온도에서 분압 ∝ 입자 수 = 몰수. 모형 스케치예요.) */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const HW = 2, H = 4.4, FLOOR = -2.2, MAXG = 20, UNIT = 0.1, PART = 0.05;       // 입자 1개 = 0.05 mol = 0.10 atm (12.3 L, 300 K)
  const G = [
    { k: 'he', name: 'He', col: 0xffd34d, r: 0.17, v: 1.9, ko: 'He' },
    { k: 'n2', name: 'N₂', col: 0x5b8cff, r: 0.21, v: 1.1, ko: 'N₂' },
    { k: 'o2', name: 'O₂', col: 0xff5a5f, r: 0.21, v: 1.0, ko: 'O₂' },
  ];

  window.SciSim3D.attach({
    title: '혼합 기체와 분압 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHONE ? 16 : 13.5, theta: 0.5, phi: 1.2, min: 7, max: 28, target: [1.8, 0, 0] },
    autoRotate: 0.12,
    levels: [0, 1],   // 3·4단계(연결 용기·물 위 포집·잠수 설계)는 2D 화면에서 풀어요
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3;
      const cnt = { he: 0, n2: 0, o2: 0 };
      let demo = null, sig = '', note = '';
      const fracCounts = (nO) => { const r = 20 - nO, he = Math.round(0.4 * r); return { he, n2: r - he, o2: nO }; };
      let only = 'all';
      const X0 = -1.6;                       // 용기 중심 x
      const box = new THREE.Mesh(new THREE.BoxGeometry(HW * 2, H, HW * 2), new THREE.MeshStandardMaterial({ color: 0xbfe3ff, transparent: true, opacity: 0.15, roughness: 0.1, depthWrite: false, side: THREE.DoubleSide }));
      box.position.set(X0, FLOOR + H / 2, 0); root.add(box);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(HW * 2, H, HW * 2)), new THREE.LineBasicMaterial({ color: 0x9fc8ee, transparent: true, opacity: 0.8 }));
      edges.position.copy(box.position); root.add(edges);
      const base = new THREE.Mesh(new THREE.BoxGeometry(HW * 2 + 0.4, 0.25, HW * 2 + 0.4), new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.5, metalness: 0.4 }));
      base.position.set(X0, FLOOR - 0.125, 0); root.add(base);

      /* 입자 */
      const meshes = G.map((g) => {
        const m = new THREE.InstancedMesh(new THREE.SphereGeometry(g.r, 20, 16), new THREE.MeshStandardMaterial({ color: g.col, roughness: 0.3, metalness: 0.05 }), MAXG);
        m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; root.add(m); return m;
      });
      const P = G.map(() => Array.from({ length: MAXG }, () => ({
        p: new V3((Math.random() * 2 - 1) * (HW - 0.4), FLOOR + 0.4 + Math.random() * (H - 0.8), (Math.random() * 2 - 1) * (HW - 0.4)),
        d: new V3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(), f: 0.7 + Math.random() * 0.6,
      })));
      const M = new THREE.Matrix4(), S0 = new V3(1, 1, 1);

      /* 쌓은 기둥 (전체 압력 = 분압의 합) */
      const BX = 4.1, BW = 1.3;
      const cols = G.map((g) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(BW, 1, BW), new THREE.MeshStandardMaterial({ color: g.col, roughness: 0.4, metalness: 0.1 }));
        root.add(m); return m;
      });
      const rail = new THREE.Mesh(new THREE.BoxGeometry(BW + 0.5, 0.12, BW + 0.5), new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.5, metalness: 0.4 }));
      rail.position.set(BX, FLOOR - 0.06, 0); root.add(rail);
      const labs = G.map((g, i) => label('', cols[i], { color: 'rgba(30,41,59,.88)' }));
      const labT = label('', [BX, FLOOR + 1, 0], { color: 'rgba(239,106,91,.92)' });
      labT.el.style.color = '#fff';
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(BW + 0.3, 0.06, 0.06), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.4 }));
      root.add(bridge);

      function layoutBars() {
        let y = FLOOR; let tot = 0;
        const sumN = G.reduce((a, g) => a + (only === 'all' || only === g.k ? cnt[g.k] : 0), 0), kS = Math.min(0.3, 5.4 / Math.max(1, sumN));
        G.forEach((g, i) => {
          const n = only === 'all' || only === g.k ? cnt[g.k] : 0;
          const hh = Math.max(0.001, n * kS); const sh = n > 0;
          cols[i].visible = sh; cols[i].scale.set(1, hh, 1); cols[i].position.set(BX, y + hh / 2, 0);
          labs[i].obj = [BX, y + hh / 2, BW / 2 + 0.05]; labs[i].show(sh);
          labs[i].set(g.ko + ' ' + (n * UNIT).toFixed(1));
          y += n > 0 ? hh : 0; tot += n;
        });
        bridge.position.set(BX, y, 0);
        labT.obj = [BX, y + 0.5, 0]; labT.set('전체 ' + (tot * UNIT).toFixed(1) + ' atm');
        const all = cnt.he + cnt.n2 + cnt.o2;
        const mf = (n) => all ? (n / all).toFixed(2) : '0.00';
        const md = mode();
        let t = (demo ? '▶ ' + note : '') + '<b>P(전체) = P(He) + P(N₂) + P(O₂)</b><br>12.3 L · 300 K · 입자 1개 = 0.05 mol = 0.10 atm<br>';
        if (md === 'frac') t = (demo ? '▶ ' + note : '') + '<b>P(A) = X(A) × P(전체)</b><br>전체 1.0 mol · X(O₂) = ' + mf(cnt.o2) + ' · P(O₂) = ' + (cnt.o2 * UNIT).toFixed(2) + ' atm<br>';
        else if (md !== 'sum') t = '<b>이 단계는 2D 화면에서 풀어요</b><br>(연결 용기 · 물 위 포집 · 공기 · 잠수 설계)<br>';
        info(t + '몰 분율: He ' + mf(cnt.he) + ' · N₂ ' + mf(cnt.n2) + ' · O₂ ' + mf(cnt.o2));
      }
      const mode = () => { try { return window.__sim.S.mode; } catch (e) { return 'sum'; } };
      function from2D() {
        let S; try { S = window.__sim.S; } catch (e) { return false; }
        const m = S.mode; let c;
        if (m === 'sum') c = { he: S.sum.inj.he / PART, n2: S.sum.inj.n2 / PART, o2: S.sum.inj.o2 / PART };
        else if (m === 'frac') c = fracCounts(S.frac.nO);
        else c = null;
        const sg = m + (c ? c.he + ',' + c.n2 + ',' + c.o2 : '');
        if (sg !== sig) { sig = sg; demo = null; note = ''; if (c) { cnt.he = Math.round(c.he); cnt.n2 = Math.round(c.n2); cnt.o2 = Math.round(c.o2); } return true; }
        return false;
      }
      controls.player({
        duration: 10, loop: true, autoplay: false, label: '재생',
        onFrame(p) {
          const k = (a, b, n) => Math.round(Math.max(0, Math.min(1, (p - a) / (b - a))) * n);
          if (mode() === 'frac') { const c = fracCounts(Math.min(20, Math.round(p * 20))); cnt.he = c.he; cnt.n2 = c.n2; cnt.o2 = c.o2; }   // X(O₂) 0 → 1
          else { cnt.he = k(0.08, 0.2, 4); cnt.n2 = k(0.3, 0.42, 6); cnt.o2 = k(0.52, 0.64, 10); }
          note = mode() === 'frac' ? 'X(O₂) 0 → 1 · ' : p < 0.08 ? '빈 용기 · ' : p < 0.3 ? 'He 넣는 중 · ' : p < 0.52 ? 'N₂ 넣는 중 · ' : p < 0.76 ? 'O₂ 넣는 중 · ' : '분압의 합 · ';
          demo = true; layoutBars();
        },
      });
      controls.segment('보기', [{ value: 'all', label: '모두' }, { value: 'he', label: 'He만' }, { value: 'n2', label: 'N₂만' }, { value: 'o2', label: 'O₂만' }], 'all', (v) => { only = v; layoutBars(); });
      from2D(); layoutBars();

      return {
        sync() { sig = ''; },
        update(dt) {
          dt = Math.min(dt, 0.05);
          if (from2D()) layoutBars();
          const w = HW;
          G.forEach((g, gi) => {
            const vis = only === 'all' || only === g.k, n = vis ? cnt[g.k] : 0, m = meshes[gi];
            for (let i = 0; i < MAXG; i++) {
              const q = P[gi][i];
              if (i >= n) { M.makeScale(0.0001, 0.0001, 0.0001); m.setMatrixAt(i, M); continue; }
              q.p.addScaledVector(q.d, g.v * q.f * 1.3 * dt);
              const lo = -w + g.r, hi = w - g.r;
              if (q.p.x > hi) { q.p.x = hi; q.d.x *= -1; } else if (q.p.x < lo) { q.p.x = lo; q.d.x *= -1; }
              if (q.p.z > hi) { q.p.z = hi; q.d.z *= -1; } else if (q.p.z < lo) { q.p.z = lo; q.d.z *= -1; }
              if (q.p.y > FLOOR + H - g.r) { q.p.y = FLOOR + H - g.r; q.d.y *= -1; } else if (q.p.y < FLOOR + g.r) { q.p.y = FLOOR + g.r; q.d.y *= -1; }
              M.makeTranslation(q.p.x + X0, q.p.y, q.p.z); m.setMatrixAt(i, M);
            }
            m.instanceMatrix.needsUpdate = true;
          });
        },
      };
    },
  });
})();
