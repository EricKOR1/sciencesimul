/* m3-free-fall · 3D 자유 낙하 (다중 섬광 사진)
   2D 차시와 같은 물체(쇠공 1 kg · 볼링공 7 kg · 깃털 1 g), 같은 탑 높이(20 m · 45 m), 같은 공기(없음/있음), 0.1초마다 찍는 다중 섬광 사진.
   공기 저항이 없으면 질량과 상관없이 모든 물체가 같게 떨어지고, 속력은 1초마다 9.8 m/s씩 늘어요. 2D 실험 상태(window.__sim)를 읽어 같은 장면을 보여 줘요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const SC = 0.12;                                  // 1 m = 0.12
  const LOOK = { steel: { r: 0.26, c: 0x475569 }, bowl: { r: 0.38, c: 0x3867f4 }, feather: { r: 0.3, c: 0x16a34a } };
  window.SciSim3D.attach({
    host: '.stage-card',
    title: '자유 낙하 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHN ? 17 : 12.5, theta: 0.5, phi: 1.35, min: 6, max: 26, target: [0, 2.7, 0] },
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const sm = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.45, metalness: 0.1 }, o || {}));
      const gnd = new THREE.Mesh(new THREE.BoxGeometry(11, 0.3, 6), sm(0x3d6f3a, { roughness: 0.95, metalness: 0 })); gnd.position.y = -0.15; root.add(gnd);
      /* 탑과 눈금 (높이는 2D의 탑 높이 H에 맞춰 다시 만들어요) */
      const tower = new THREE.Group(); root.add(tower);
      let Hm = 0, topY = 0;
      function buildTower(H) {
        Hm = H; topY = H * SC + 0.35;
        while (tower.children.length) tower.remove(tower.children[0]);
        [[-0.7, -0.6], [0.7, -0.6], [-0.7, 0.6], [0.7, 0.6]].forEach((q) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, topY, 10), sm(0x94a3b8, { metalness: 0.6, roughness: 0.4 })); m.position.set(q[0] - 1.6, topY / 2, q[1]); tower.add(m); });
        const plat = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.12, 1.7), sm(0x64748b)); plat.position.set(-1.6, topY, 0); tower.add(plat);
        const arm = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.3), sm(0xf59e0b)); arm.position.set(-0.45, topY + 0.1, 0); tower.add(arm);
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, H * SC + 0.3, 8), sm(0xe2e8f0)); rod.position.set(1.7, (H * SC + 0.3) / 2 - 0.05, -0.2); tower.add(rod);
        for (let m = 0; m <= H; m += 5) { const tk = new THREE.Mesh(new THREE.BoxGeometry(m % 10 === 0 ? 0.5 : 0.28, 0.025, 0.025), sm(0xe2e8f0)); tk.position.set(1.7 - (m % 10 === 0 ? 0.25 : 0.14), m * SC, -0.2); tower.add(tk); }
        mLab.forEach((l, i) => { const m = i * 10; l.show(m <= H); l.obj = [1.7 + 0.45, (H - m) * SC, -0.2]; l.set(m + ' m'); });
        target.y = Math.max(1.6, H * SC * 0.5 + 0.2);
      }
      const mLab = []; for (let i = 0; i < 5; i++) mLab.push(label('', [0, 0, 0], { size: 11, color: 'rgba(30,41,59,.8)' }));
      const target = { y: 2.7 };
      /* 공 (물체) · 섬광 사진 */
      let balls = [], key = '';
      const ghostG = new THREE.SphereGeometry(1, 16, 12);
      const bl = []; for (let i = 0; i < 3; i++) bl.push(label('', [0, 0, 0], { size: 12, color: 'rgba(15,23,42,.9)' }));
      const fl = []; for (let i = 0; i < 14; i++) { const l = label('', [0, -99, 0], { size: 11, color: 'rgba(30,41,59,.85)' }); l.show(false); fl.push(l); }
      function setupBalls(L) {
        balls.forEach((b) => { root.remove(b.m); root.remove(b.gh); });
        const S = L.S, keys = S.mode === 'compare' ? ['steel', 'bowl', 'feather'] : ['steel'];
        balls = keys.map((k, i) => {
          const o = L.OBJ[k], lk = LOOK[k], z = keys.length > 1 ? (i - 1) * 0.8 : 0;
          const m = new THREE.Mesh(new THREE.SphereGeometry(lk.r, 32, 22), k === 'feather' ? sm(lk.c, { roughness: 0.95, metalness: 0 }) : sm(lk.c, { metalness: 0.7, roughness: 0.3 }));
          if (k === 'feather') m.scale.set(1.4, 0.35, 0.8);
          root.add(m);
          const gh = new THREE.InstancedMesh(ghostG, new THREE.MeshStandardMaterial({ color: lk.c, transparent: true, opacity: 0.4, depthWrite: false }), 80); gh.count = 0; root.add(gh);
          return { k, o, m, gh, r: lk.r, z, lk };
        });
        bl.forEach((l, i) => { const b = balls[i]; l.show(!!b); if (b) l.set(b.o.name + ' ' + b.o.mass); });
      }
      const dm = new THREE.Object3D();
      function text(L) {
        const S = L.S, t = S.visT || 0, run = S.run, air = run ? run.air : S.air, lead = balls[0];
        const v = lead ? L.fallV(lead.o, t, air) : 0, d = lead ? Math.min(S.H, L.fallD(lead.o, t, air)) : 0;
        let h = '<b>' + (S.mode === 'compare' ? '쇠공 · 볼링공 · 깃털' : '쇠공 1 kg') + '</b> · 탑 높이 <b>' + S.H + ' m</b> · ' + (air ? '공기 있음' : '진공(공기 없음)') + (S.strobe ? ' · 0.1초마다 섬광 사진' : '') + '<br>';
        if (t <= 0.001) h += '전자석이 공을 놓으면 <b>자유 낙하</b>해요. ' + (S.mode === 'compare' ? (air ? '공기가 있으면 깃털이 늦게 떨어져요.' : '진공에서는 무거운 공과 가벼운 깃털이 같이 떨어져요.') : '▶ 떨어뜨리기를 눌러 보세요.');
        else h += '시각 <b>' + t.toFixed(1) + ' s</b> · 낙하 거리 <b>' + d.toFixed(1) + ' m</b> · 속력 <b>' + v.toFixed(1) + ' m/s</b>' + (air ? '' : '<br>속력은 1초마다 <b>9.8 m/s</b>씩 일정하게 늘어요 (v = 9.8 × t).');
        return h;
      }
      let infoK = '', first = true;
      /* ▶ 떨어뜨리기: 2D 실험의 시각도 같이 움직여요 */
      const pl = controls.player({
        duration: 4, loop: true, label: '떨어뜨리기',
        phases: [[0, '출발'], [0.1, '점점 빨라져요'], [0.9, '땅에 닿아요']],
        onFrame(p) {
          if (first) { first = false; return; }
          const L = ctx.lesson(); if (!L || !L.S || L.S.state === 'running') return;
          if (!L.S.run || L.S.state !== 'done') L.finishedRun();
          L.setViewT(p * L.S.run.tMax);
        },
      });
      return {
        update(dt, tm) {
          const L = ctx.lesson(); if (!L || !L.S) return;
          const S = L.S, k = [S.mode, S.H, S.air].join('|');
          if (S.H !== Hm) buildTower(S.H);
          if (k !== key) { key = k; setupBalls(L); }
          const t = S.visT || 0, run = S.run, air = run ? run.air : S.air;
          if (!pl.playing && run && (S.state === 'running' || S.state === 'done') && run.tMax > 0) { const q = Math.min(1, (S.state === 'running' ? run.t : S.viewT) / run.tMax); if (Math.abs(q - pl.p) > 0.004) pl.set(q); }
          balls.forEach((b, i) => {
            const d = Math.min(S.H, L.fallD(b.o, t, air));
            b.m.position.set(-0.45, topY + 0.1 + b.r - d * SC, b.z);
            if (b.k === 'feather') b.m.rotation.z = Math.sin(tm * 3) * 0.4;
            bl[i].obj = b.m; bl[i].off = [0, 0.7, 0];
            // 0.1초마다 찍은 섬광 사진
            let n = 0;
            if (S.strobe) for (let j = 0; j * 0.1 <= t + 1e-6 && n < 80; j++) { const dd = Math.min(S.H, L.fallD(b.o, j * 0.1, air)); dm.position.set(-0.45, topY + 0.1 + b.r - dd * SC, b.z); dm.scale.setScalar(b.r * 0.92); if (b.k === 'feather') dm.scale.set(b.r * 1.3, b.r * 0.32, b.r * 0.74); dm.updateMatrix(); b.gh.setMatrixAt(n++, dm.matrix); }
            b.gh.count = n; b.gh.instanceMatrix.needsUpdate = true;
          });
          // 0.5초마다 시각 · 거리 이름표
          const lead = balls[0];
          fl.forEach((l, i) => {
            const tt = i * 0.5, ok = S.strobe && lead && tt <= t + 1e-6 && L.fallD(lead.o, tt, air) <= S.H + 1e-6;
            l.show(!!ok); if (ok) { const dd = L.fallD(lead.o, tt, air); l.obj = [0.2, topY + 0.1 + lead.r - dd * SC, lead.z]; l.set(tt.toFixed(1) + ' s · ' + dd.toFixed(1) + ' m'); }
          });
          const ik = [t.toFixed(2), k, S.strobe, S.state].join('|');
          if (ik !== infoK) { infoK = ik; info(text(L)); }
        },
      };
    },
  });
})();
