/* hy-carbon-fixation · 3D 캘빈 회로 (탄소 고정 · 환원 · RuBP 재생)
   회로 한 바퀴: CO₂ 3개 + RuBP(5탄소) 3개 → 3PG(3탄소) 6개 → (ATP · NADPH 사용) G3P 6개
   → G3P 1개는 밖으로(포도당의 재료), 나머지 5개는 ATP를 써서 RuBP 3개로 재생돼요. 회로의 탄소 수가 늘 보존되는 것을 구슬로 확인해요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const narrow = window.innerWidth < 600 || window.innerHeight > window.innerWidth * 1.1;
  const R = 3.7, D2R = Math.PI / 180, PER = 14;
  const S0 = 90, S1 = -30, S2 = -150;

  window.SciSim3D.attach({
    title: '캘빈 회로 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: narrow ? 16 : 12.5, theta: 0.35, phi: 1.38, target: [0, 0, 0], min: 6, max: 22 },
    autoRotate: 0,
    levels: [0, 2],
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V = THREE.Vector3;
      let cycles = 0, cc = 0;
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.38, metalness: 0.04 }, o || {}));
      const pos = (a, r, z) => new V((r || R) * Math.cos(a * D2R), (r || R) * Math.sin(a * D2R), z || 0);

      /* ---------- 스트로마 바탕 · 회로 고리 · 효소 ---------- */
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 5.5, 0.12, 64), std(0x14532d, { transparent: true, opacity: 0.35, roughness: 0.8, depthWrite: false }));
      plate.rotation.x = Math.PI / 2; plate.position.z = -0.45; root.add(plate);
      const ringCurve = new THREE.CatmullRomCurve3(Array.from({ length: 73 }, (_, i) => pos(i * 5, R, -0.1)), true);
      root.add(new THREE.Mesh(new THREE.TubeGeometry(ringCurve, 160, 0.05, 8, true), std(0x7dd3fc, { emissive: 0x0c4a6e, roughness: 0.4 })));
      [[(S0 + S1) / 2, S1], [(S1 + S2) / 2, S2], [(S2 + S0 + 360) / 2, S0 + 360]].forEach(([a, b]) => {
        const c = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 20), std(0xbae6fd, { emissive: 0x0c4a6e }));
        c.position.copy(pos(a, R, -0.1)); c.rotation.z = a * D2R + Math.PI; root.add(c);
      });
      const enzMats = [std(0x3b82f6, { roughness: 0.3 }), std(0xf59e0b, { roughness: 0.3 }), std(0x10b981, { roughness: 0.3 })];
      [S0, S1, S2].forEach((a, i) => {
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.42, 30, 22), enzMats[i]); m.scale.set(1.05, 0.95, 0.7); m.position.copy(pos(a, R, -0.3)); root.add(m);
      });

      /* ---------- 분자 (탄소 구슬 + 인산기) ---------- */
      const cMat = { rubp: std(0x93c5fd, { roughness: 0.3 }), pga: std(0xe2e8f0, { roughness: 0.3 }), g3p: std(0xfcd34d, { roughness: 0.3, emissive: 0x3a2a00 }), co2: std(0x64748b, { roughness: 0.35 }) };
      const pMat = std(0xf472b6, { emissive: 0x3a0a22 }), oMat = std(0xef4444);
      function mol(n, mat, nP) {
        const g = new THREE.Group(), cs = [];
        for (let i = 0; i < n; i++) { const c = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14), mat); c.position.set((i - (n - 1) / 2) * 0.34, 0, 0); g.add(c); cs.push(c); }
        const ps = [];
        for (let i = 0; i < nP; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), pMat); p.position.set((i === 0 ? -1 : 1) * ((n - 1) / 2 * 0.34 + 0.24), 0.14, 0); g.add(p); ps.push(p); }
        const shell = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, (n - 1) * 0.34, 8, 20), std(0xffffff, { transparent: true, opacity: 0.1, depthWrite: false, roughness: 0.2 })); shell.rotation.z = Math.PI / 2; g.add(shell);
        g.userData = { cs, ps }; root.add(g); return g;
      }
      const rubp = [0, 1, 2].map(() => mol(5, cMat.rubp, 2));
      const c3 = [0, 1, 2, 3, 4, 5].map(() => mol(3, cMat.pga, 1));
      const co2 = [0, 1, 2].map(() => { const g = new THREE.Group(); const c = new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 14), cMat.co2); g.add(c); [-1, 1].forEach((s) => { const o = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 10), oMat); o.position.x = s * 0.27; g.add(o); }); root.add(g); return g; });
      function recolor(g, mat) { g.userData.cs.forEach((c) => { c.material = mat; }); }

      // ATP · NADPH 알갱이
      const atpMat = std(0xfacc15, { emissive: 0x7a5a00 }), adpMat = std(0xfb923c), nadphMat = std(0x22d3ee, { emissive: 0x064e5a }), nadpMat = std(0x94a3b8);
      function atpMol() { const g = new THREE.Group(); const s = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), atpMat); g.add(s); for (let i = 0; i < 3; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), pMat); p.position.set(0.22 + i * 0.15, 0, 0); g.add(p); } g.userData.core = s; g.userData.tail = g.children.slice(1); root.add(g); return g; }
      const atps = [0, 1, 2, 3].map(atpMol), nds = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), nadphMat); root.add(m); return m; });

      const ease = (k) => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
      const lerp = (a, b, k) => a + (b - a) * k;
      const lab = {
        s0: label('① 탄소 고정', pos(S0, R + 0.5, 0.2).toArray(), { color: '#1d4ed8' }), s1: label('② 환원', pos(S1, R + 0.8, 0.2).toArray(), { color: '#b45309' }), s2: label('③ RuBP 재생', pos(S2, R + 0.9, 0.2).toArray(), { color: '#047857' }),
        co2: label('CO₂', [0, R + 2.3, 0], { color: '#475569' }), rubp: label('RuBP (5탄소)', pos(180, R + 1.1, 0.2).toArray(), { color: '#1e40af' }),
        pga: label('3PG (3탄소)', pos(30, R + 1.5, 0.2).toArray(), { color: '#475569' }), g3p: label('G3P (3탄소)', pos(-90, R + 1.1, 0.2).toArray(), { color: '#92400e' }),
        outl: label('G3P 1개 → 밖으로', [0, 0, 0], { color: '#92400e' }), light: label('명반응의 ATP · NADPH', [-0.0, 0.1, 0.0], { color: '#0e7490' }),
      };
      const outAnchor = new THREE.Object3D(); root.add(outAnchor); lab.outl.obj = outAnchor;
      lab.light.obj = [R + 1.6, -R * 0.5 - 1.2, 0];
      let phaseTxt = '';
      const PHASES = [
        [0.0, 0.26, '<b>① 탄소 고정</b> · CO₂ 3개(3C)가 RuBP 3개(15C)와 결합해요.'],
        [0.26, 0.48, '<b>① 탄소 고정</b> · 불안정한 6탄소 화합물이 갈라져 <b>3PG(3C) 6개</b>(18C)가 돼요.'],
        [0.48, 0.62, '<b>② 환원</b> · 명반응의 <b>ATP 6개 · NADPH 6개</b>를 써서 3PG 6개가 G3P 6개로 환원돼요.'],
        [0.62, 0.76, '<b>③</b> G3P 6개 중 <b>1개(3C)</b>는 밖으로 나가 포도당의 재료가 돼요.'],
        [0.76, 1.0, '<b>③ RuBP 재생</b> · 남은 G3P 5개(15C)가 <b>ATP 3개</b>를 써서 RuBP 3개(15C)로 돌아와요.'],
      ];
      function setText(c) {
        const ph = PHASES.find((p) => c >= p[0] && c < p[1]) || PHASES[0];
        if (ph[2] !== phaseTxt) { phaseTxt = ph[2]; info(ph[2] + '<br><span style="color:#9fb0d4">한 바퀴 완료 ' + cycles + '회 · 밖으로 나간 G3P ' + cycles + '개</span>'); }
      }
      const aRs = (i) => 210 - i * 38, aRe = (i) => 90 + (1 - i) * 38;
      const aP0 = (j) => aRe(j >> 1), aP1 = (j) => S1 + (1 - (j >> 1)) * 38, aG = (j) => S2 + (1 - (j >> 1)) * 38;
      const rOf = (j) => R + (j % 2 ? -0.34 : 0.34);
      const zOf = () => 0.05;
      const tang = (a) => a * D2R + Math.PI / 2;
      function put(g, a, r, z) { g.visible = true; g.position.copy(pos(a, r, z)); g.rotation.z = tang(a); g.scale.setScalar(1); }
      function layout(c) {
        rubp.forEach((g) => { g.visible = false; }); c3.forEach((g) => { g.visible = false; }); co2.forEach((g) => { g.visible = false; }); atps.forEach((g) => { g.visible = false; }); nds.forEach((g) => { g.visible = false; });
        ['co2', 'rubp', 'pga', 'g3p', 'outl', 'light'].forEach((k) => lab[k].show(false));
        const setPga = (j, mat) => { recolor(c3[j], mat); c3[j].userData.ps[0].visible = true; };
        if (c < 0.22) {                                   // A: RuBP 가 위로 올라가 CO₂ 와 만나요
          const p = ease(c / 0.22);
          rubp.forEach((g, i) => { put(g, lerp(aRs(i), aRe(i), p), R, 0.05); recolor(g, cMat.rubp); g.userData.ps.forEach((q) => { q.visible = true; }); });
          co2.forEach((g, i) => { g.visible = true; g.position.copy(pos(aRe(i), R + lerp(3.2, 0.5, p), 0.1)); g.rotation.z = tang(aRe(i)); });
          lab.co2.show(true); lab.rubp.show(true);
        } else if (c < 0.26) {                            // 결합 → 3PG 2개씩
          const k = (c - 0.22) / 0.04;
          for (let j = 0; j < 6; j++) { setPga(j, cMat.pga); put(c3[j], aP0(j), rOf(j), zOf(j)); c3[j].scale.setScalar(0.5 + 0.5 * ease(k)); }
          lab.pga.show(true);
        } else if (c < 0.48) {                            // B: 3PG 가 오른쪽 아래로
          const p = ease((c - 0.26) / 0.22);
          for (let j = 0; j < 6; j++) { setPga(j, cMat.pga); put(c3[j], lerp(aP0(j), aP1(j), p), rOf(j), zOf(j)); }
          lab.pga.show(true);
        } else if (c < 0.62) {                            // C: ATP · NADPH 로 환원
          const p = (c - 0.48) / 0.14, k = ease(p * 2), back = ease((p - 0.5) * 2), red = p > 0.5;
          for (let j = 0; j < 6; j++) { setPga(j, red ? cMat.g3p : cMat.pga); put(c3[j], aP1(j), rOf(j), zOf(j)); }
          atps.forEach((g, i) => {
            if (i > 2) return; g.visible = true;
            const from = pos(S1 + 6 + i * 22, R + 3.6, 0.3), to = pos(S1 + (1 - i) * 38, R + 0.95, 0.3);
            if (!red) { g.position.lerpVectors(from, to, k); g.userData.core.material = atpMat; g.userData.tail.forEach((q) => { q.visible = true; }); }
            else { g.position.lerpVectors(to, from, back); g.userData.core.material = adpMat; g.userData.tail.forEach((q, n) => { q.visible = n < 1; }); }
          });
          nds.forEach((g, i) => { g.visible = true; g.material = red ? nadpMat : nadphMat; const from = pos(S1 - 10 + i * 12, R + 3.4, -0.2), to = pos(S1 + (1 - i) * 38 - 7, R - 0.95, 0.3); g.position.lerpVectors(from, to, red ? 1 - back : k); });
          lab.light.show(true); lab.light.set(red ? 'ATP → ADP + Pᵢ · NADPH → NADP⁺' : '명반응에서 온 ATP · NADPH'); lab.g3p.show(red); lab.pga.show(!red);
        } else if (c < 0.76) {                            // D: G3P 가 아래로, 1개는 밖으로
          const p = ease((c - 0.62) / 0.14);
          for (let j = 0; j < 6; j++) { setPga(j, cMat.g3p); put(c3[j], lerp(aP1(j), aG(j), p), rOf(j), zOf(j)); }
          if (p > 0.5) { const k = ease((p - 0.5) / 0.5); c3[5].position.copy(pos(aG(5), rOf(5) + k * 3.2, 0.05 + k * 0.5)); outAnchor.position.copy(pos(aG(5), R + 3.9, 0.6)); lab.outl.show(k > 0.6); }
          lab.g3p.show(true);
        } else {                                          // E: 남은 G3P 5개 → RuBP 3개
          const p = (c - 0.76) / 0.24, conv = p > 0.5, q = (p - 0.5) / 0.5;
          if (p < 0.16) { setPga(5, cMat.g3p); put(c3[5], aG(5), rOf(5) + 3.2, 0.55); c3[5].scale.setScalar(1 - p / 0.16); outAnchor.position.copy(pos(aG(5), R + 3.9, 0.6)); lab.outl.show(true); }
          if (!conv) {
            for (let j = 0; j < 5; j++) { setPga(j, cMat.g3p); put(c3[j], aG(j), rOf(j), zOf(j)); }
            const k = ease(p / 0.3);
            atps.forEach((g, i) => { if (i > 1) return; g.visible = true; g.position.lerpVectors(pos(S2 - 22, R + 3.6 + i * 0.4, 0.3), pos(S2 + 8 - i * 30, R + 0.95, 0.3), k); g.userData.core.material = atpMat; g.userData.tail.forEach((x) => { x.visible = true; }); });
            lab.g3p.show(true);
          } else {
            const s = ease(q * 2);
            rubp.forEach((g, i) => { put(g, S2 - i * 38, R, 0.05); recolor(g, cMat.rubp); g.userData.ps.forEach((x) => { x.visible = true; }); g.scale.setScalar(Math.min(1, 0.3 + s)); });
            for (let j = 0; j < 5; j++) if (q < 0.5) { setPga(j, cMat.g3p); put(c3[j], aG(j), rOf(j), zOf(j)); c3[j].scale.setScalar(1 - ease(q * 2)); }
            atps.forEach((g, i) => { if (i > 1) return; g.visible = true; g.position.lerpVectors(pos(S2 + 8 - i * 30, R + 0.95, 0.3), pos(S2 - 22, R + 3.6 + i * 0.4, 0.3), ease(q)); g.userData.core.material = adpMat; g.userData.tail.forEach((x, n) => { x.visible = n < 1; }); });
            lab.rubp.show(true);
          }
        }
      }
      layout(0); setText(0);

      /* ▶ 회로 한 바퀴 (CO₂ 3분자 고정 → 환원 → RuBP 재생). 위치는 진행 막대로 고를 수 있어요. */
      const player = controls.player({
        duration: 14, loop: true, autoplay: true, label: '회로 한 바퀴',
        phases: [[0, '① 탄소 고정'], [0.26, '① 3PG 6개'], [0.48, '② 환원'], [0.62, 'G3P 1개 밖으로'], [0.76, '③ RuBP 재생']],
        onFrame(p) { if (p < cc - 0.5) { cycles++; } cc = p; layout(cc); setText(cc); },
      });
      /* 2D 캘빈 회로(S.cv)의 단계를 따라가요: 고정 → 환원 → 재생 */
      let lastKey = '';
      function poll() {
        const L = ctx.lesson(); if (!L || !L.S || !L.S.cv || L.S.mode !== 'cal') return;
        const cv = L.S.cv, key = cv.phase + cv.fixed + (cv.done ? 'd' : '');
        if (key === lastKey) return; lastKey = key;
        const at = cv.done ? 0.99 : cv.phase === 'fix' ? Math.min(0.2, cv.fixed / 3 * 0.22) : cv.phase === 'reduce' ? 0.5 : 0.78;
        player.pause(); player.set(at);
      }

      return {
        update() { poll(); },
        sync() { poll(); setText(cc); },
      };
    },
  });
})();
