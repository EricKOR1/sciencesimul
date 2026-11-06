/* hx-osmosis · 3D 반투과성 막과 삼투
   막 가운데에는 작은 물 분자만 지나갈 수 있어요. 용질이 적은 쪽(물 분자가 더 많은 쪽)에서 많은 쪽으로
   물이 더 많이 건너가서 용액 쪽 수면이 올라가요.
   슬라이더는 2D 실험의 양쪽 농도(setIL / setIR)와 연결돼 있어요 (한 칸 = 0.05 M). 입자 수는 모형 스케치예요.
   1단계 '반투막'과 2단계 '입자 모형'에서 열려요. 3·4단계(감자 실험 설계 · 생활 속 삼투)는 2D 화면이에요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const FLOOR = -2.4, TANKH = 5.2, W = 2.6, DEP = 2.2, NW = 70, NS = 34, NT = 24;

  window.SciSim3D.attach({
    title: '삼투 현상 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHONE ? 15 : 11.5, theta: 0.4, phi: 1.22, min: 6, max: 24, target: [0, 0.2, 0] },
    autoRotate: 0.1,
    levels: [0, 1],
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3;
      const sim = () => (window.__sim && window.__sim.S) || null;
      const loc = { L: 0, R: 10, dh: 0 };
      const S0 = sim(); if (S0 && typeof S0.iL === 'number') { loc.L = S0.iL; loc.R = S0.iR; }
      let showT = true, hL = 2.4, hR = 2.4;

      const glass = new THREE.MeshStandardMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.14, roughness: 0.08, side: THREE.DoubleSide, depthWrite: false });
      [[-1, 0], [1, 0]].forEach(([sg]) => {
        const b = new THREE.Mesh(new THREE.BoxGeometry(W, TANKH, DEP), glass); b.position.set(sg * (W / 2 + 0.04), FLOOR + TANKH / 2, 0); root.add(b);
        const e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(W, TANKH, DEP)), new THREE.LineBasicMaterial({ color: 0x9fc8ee, transparent: true, opacity: 0.7 })); e.position.copy(b.position); root.add(e);
      });
      const base = new THREE.Mesh(new THREE.BoxGeometry(W * 2 + 0.6, 0.25, DEP + 0.4), new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.5, metalness: 0.4 })); base.position.y = FLOOR - 0.125; root.add(base);
      /* 반투과성 막 */
      const mem = new THREE.Mesh(new THREE.BoxGeometry(0.08, TANKH, DEP), new THREE.MeshStandardMaterial({ color: 0x34d399, transparent: true, opacity: 0.55, roughness: 0.3, depthWrite: false }));
      mem.position.set(0, FLOOR + TANKH / 2, 0); root.add(mem);
      const pore = new THREE.CircleGeometry(0.1, 14), pm = new THREE.MeshBasicMaterial({ color: 0x064e3b });
      for (let a = 0; a < 6; a++) for (let b = 0; b < 12; b++) [-1, 1].forEach((s) => {
        const c = new THREE.Mesh(pore, pm); c.position.set(s * 0.045, FLOOR + 0.35 + b * 0.4, -DEP / 2 + 0.3 + a * ((DEP - 0.6) / 5)); c.rotation.y = s * Math.PI / 2; root.add(c);
      });
      /* 물 (수면 상자) */
      const wmat = new THREE.MeshStandardMaterial({ color: 0x4aa8ff, transparent: true, opacity: 0.3, roughness: 0.1, depthWrite: false });
      const wL = new THREE.Mesh(new THREE.BoxGeometry(W - 0.04, 1, DEP - 0.04), wmat), wR = new THREE.Mesh(new THREE.BoxGeometry(W - 0.04, 1, DEP - 0.04), wmat.clone());
      root.add(wL, wR); wR.material.color.setHex(0xf0a64a);
      /* 입자 */
      const wm = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 12, 10), new THREE.MeshStandardMaterial({ color: 0x7cc4ff, roughness: 0.3 }), NW * 2);
      const sm = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 18, 14), new THREE.MeshStandardMaterial({ color: 0xff9a2e, roughness: 0.35 }), NS * 2);
      const tm = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 14, 10), new THREE.MeshStandardMaterial({ color: 0x00e5ff, emissive: 0x007c8a, emissiveIntensity: 0.8, roughness: 0.3 }), NT);
      [wm, sm, tm].forEach((m) => { m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); root.add(m); });
      const rp = (side) => ({ p: new V3(side * (0.3 + Math.random() * (W - 0.6)), FLOOR + 0.4 + Math.random() * 1.6, (Math.random() - 0.5) * (DEP - 0.4)), v: new V3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(), u: Math.random() });
      const WP = [[], []], SP = [[], []];
      for (let s = 0; s < 2; s++) { for (let i = 0; i < NW; i++) WP[s].push(rp(s ? 1 : -1)); for (let i = 0; i < NS; i++) SP[s].push(rp(s ? 1 : -1)); }
      const TP = Array.from({ length: NT }, () => ({ on: false, t: 0, y: 0, z: 0, dir: 1 }));
      const M = new THREE.Matrix4();
      const labL = label('', [-W / 2, FLOOR + TANKH + 0.2, 0], { color: 'rgba(30,41,59,.9)' }), labR = label('', [W / 2, FLOOR + TANKH + 0.2, 0], { color: 'rgba(30,41,59,.9)' });
      const labM = label('반투과성 막', [0, FLOOR + 0.5, DEP / 2], { color: 'rgba(5,150,105,.92)' });
      let txt = '', spawn = 0;

      const sL = controls.range('왼쪽 농도', 0, 10, 1, loc.L, (v) => { loc.L = v; if (window.__sim && window.__sim.setIL) { try { window.__sim.setIL(v); } catch (e) { /* 무시 */ } } }, (v) => (v * 0.05).toFixed(2) + ' M');
      const sR = controls.range('오른쪽 농도', 0, 10, 1, loc.R, (v) => { loc.R = v; if (window.__sim && window.__sim.setIR) { try { window.__sim.setIR(v); } catch (e) { /* 무시 */ } } }, (v) => (v * 0.05).toFixed(2) + ' M');
      const tb = controls.button('물 이동 표시 ✓', () => { showT = !showT; tb.classList.toggle('on', showT); tb.textContent = '물 이동 표시 ' + (showT ? '✓' : '✕'); }); tb.classList.add('on');

      return {
        update(dt, t) {
          dt = Math.min(dt, 0.05);
          const s = sim();
          if (s && typeof s.iL === 'number') {
            if (s.iL !== loc.L) { loc.L = s.iL; sL.set(s.iL); } if (s.iR !== loc.R) { loc.R = s.iR; sR.set(s.iR); }
            loc.dh = s.u && typeof s.u.dh === 'number' ? s.u.dh : loc.dh;
          } else { const eq = 0.9 * (loc.R - loc.L) / 10; loc.dh += (eq * 24 / 0.9 - loc.dh) * dt * 0.4; }
          // 수면: 2D의 수위 차(cm)를 3D 높이로 (±0.9)
          const d = Math.max(-1.1, Math.min(1.1, loc.dh * 0.06));
          hL += ((2.5 - d / 2) - hL) * Math.min(1, dt * 5); hR += ((2.5 + d / 2) - hR) * Math.min(1, dt * 5);
          wL.scale.y = hL; wL.position.set(-W / 2 - 0.04, FLOOR + hL / 2, 0); wR.scale.y = hR; wR.position.set(W / 2 + 0.04, FLOOR + hR / 2, 0);
          const nS = [Math.round(loc.L * NS / 10), Math.round(loc.R * NS / 10)];
          const cx = (sg) => sg * 0.04;
          [0, 1].forEach((si) => {
            const sg = si ? 1 : -1, hh = si ? hR : hL;
            WP[si].forEach((q, i) => {
              q.p.addScaledVector(q.v, dt * 1.1);
              const x = q.p.x * sg; if (x < 0.12) { q.p.x = sg * 0.12; q.v.x = Math.abs(q.v.x) * sg; } else if (x > W - 0.12) { q.p.x = sg * (W - 0.12); q.v.x = -Math.abs(q.v.x) * sg; }
              if (q.p.z > DEP / 2 - 0.12) { q.p.z = DEP / 2 - 0.12; q.v.z *= -1; } else if (q.p.z < -DEP / 2 + 0.12) { q.p.z = -DEP / 2 + 0.12; q.v.z *= -1; }
              const top = FLOOR + hh - 0.12, bot = FLOOR + 0.12;
              if (q.p.y > top) { q.p.y = top; q.v.y = -Math.abs(q.v.y); } else if (q.p.y < bot) { q.p.y = bot; q.v.y = Math.abs(q.v.y); }
              M.makeTranslation(q.p.x + sg * 0.04, q.p.y, q.p.z); wm.setMatrixAt(si * NW + i, M);
            });
            SP[si].forEach((q, i) => {
              if (i >= nS[si]) { M.makeScale(0.0001, 0.0001, 0.0001); sm.setMatrixAt(si * NS + i, M); return; }
              q.p.addScaledVector(q.v, dt * 0.55);
              const x = q.p.x * sg; if (x < 0.25) { q.p.x = sg * 0.25; q.v.x = Math.abs(q.v.x) * sg; } else if (x > W - 0.25) { q.p.x = sg * (W - 0.25); q.v.x = -Math.abs(q.v.x) * sg; }
              if (q.p.z > DEP / 2 - 0.25) { q.p.z = DEP / 2 - 0.25; q.v.z *= -1; } else if (q.p.z < -DEP / 2 + 0.25) { q.p.z = -DEP / 2 + 0.25; q.v.z *= -1; }
              const top = FLOOR + hh - 0.25, bot = FLOOR + 0.25;
              if (q.p.y > top) { q.p.y = top; q.v.y = -Math.abs(q.v.y); } else if (q.p.y < bot) { q.p.y = bot; q.v.y = Math.abs(q.v.y); }
              M.makeTranslation(q.p.x + sg * 0.04, q.p.y, q.p.z); sm.setMatrixAt(si * NS + i, M);
            });
          });
          wm.instanceMatrix.needsUpdate = true; sm.instanceMatrix.needsUpdate = true;
          /* 막을 지나는 물 분자: 용질이 적은 쪽에서 더 자주 */
          const phi = (n) => n / (n + 20), rL = 1 - phi(loc.L), rR = 1 - phi(loc.R);
          spawn += dt * 9;
          while (spawn > 1) {
            spawn -= 1; const q = TP.find((x) => !x.on); if (!q || !showT) { if (!showT) break; continue; }
            const fromL = Math.random() < rL / (rL + rR); q.on = true; q.t = 0; q.dir = fromL ? 1 : -1; q.y = FLOOR + 0.4 + Math.random() * (Math.min(hL, hR) - 0.8); q.z = (Math.random() - 0.5) * (DEP - 0.6);
          }
          TP.forEach((q, i) => {
            if (!q.on || !showT) { q.on = false; M.makeScale(0.0001, 0.0001, 0.0001); tm.setMatrixAt(i, M); return; }
            q.t += dt * 1.6; if (q.t >= 1) { q.on = false; M.makeScale(0.0001, 0.0001, 0.0001); tm.setMatrixAt(i, M); return; }
            M.makeTranslation(q.dir * (-0.9 + 1.8 * q.t), q.y, q.z); tm.setMatrixAt(i, M);
          });
          tm.instanceMatrix.needsUpdate = true;
          const net = loc.R - loc.L; let cnt = null; try { if (window.__sim.S.mode === 'mol') cnt = window.__sim.mz.cnt; } catch (e) { cnt = null; }
          const s2 = '<b>' + (net === 0 ? '양쪽 농도가 같아서 수면이 그대로예요.' : (net > 0 ? '오른쪽' : '왼쪽') + ' 용액이 더 진해요') + '</b><br>' + (net === 0 ? '물 분자는 양쪽으로 같은 수가 건너가요.' : '물 분자가 묽은 쪽 → 진한 쪽으로 더 많이 건너가서, 진한 쪽 수면이 올라가요.') + '<br><span style="color:#ff9a2e">주황색 큰 입자(설탕)</span>는 막을 못 지나가요.<br>수위 차 <b>' + Math.abs(loc.dh).toFixed(1) + ' cm</b>' + (cnt ? ' · 막을 지난 물 분자 → ' + cnt.lr + '번 · ← ' + cnt.rl + '번' : '');
          if (s2 !== txt) { txt = s2; info(s2); }
          const fm = (i) => (i === 0 ? '순수한 물 (0 M)' : (i * 0.05).toFixed(2) + ' M 용액');
          labL.set('왼쪽 ' + fm(loc.L)); labR.set('오른쪽 ' + fm(loc.R));
        },
      };
    },
  });
})();
