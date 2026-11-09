/* h1-volcano-impact · 3D 화산 단면과 분출
   마그마 방 → 화도 → 분화구로 마그마가 올라와 용암·화산 쇄설물(화산재·화산탄)·화산 가스가 분출해요.
   분출이 강할수록(VEI) 화산재 기둥이 높이 올라가 성층권까지 퍼져요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const RB = 4.5, HC = 2.75, KM = 0.21; // 기슭 반지름, 화구 높이, 1 km 당 높이
  const VEI = { 3: { h: 10, vol: '0.01', n: 150, bomb: 14, lava: 1.0 }, 4: { h: 15, vol: '0.1', n: 205, bomb: 20, lava: 1.2 }, 5: { h: 25, vol: '1', n: 260, bomb: 26, lava: 1.4 }, 6: { h: 35, vol: '10', n: 300, bomb: 30, lava: 1.6 }, 7: { h: 45, vol: '100', n: 340, bomb: 34, lava: 1.8 } };
  const hAt = (r) => r < 0.35 ? 2.35 + (r / 0.35) * (HC - 2.35) : HC * Math.pow(Math.max(0, 1 - (r - 0.35) / (RB - 0.35)), 1.6);

  window.SciSim3D.attach({
    title: '화산 단면과 분출 3D',
    camera: { dist: PHN ? 17 : 12.5, theta: -0.8, phi: 1.22, target: [0, 2.6, 0], min: 7, max: 34 },
    levels: [0],
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.85, metalness: 0 }, o || {}));
      let vei = 5, cut = true, T = 0;
      const wedge = 3 * Math.PI / 2;
      const body = new THREE.Group(); root.add(body);
      /* ---------- 지형 ---------- */
      const prof = []; for (let i = 0; i <= 60; i++) { const r = i / 60 * RB; prof.push(new THREE.Vector2(Math.max(r, 0.001), hAt(r))); }
      const terrCut = new THREE.Mesh(new THREE.LatheGeometry(prof, 72, 0, wedge), std(0x7a6a58, { side: THREE.DoubleSide }));
      const terrFull = new THREE.Mesh(new THREE.LatheGeometry(prof, 72), std(0x7a6a58, { side: THREE.DoubleSide }));
      const wallCut = new THREE.Mesh(new THREE.CylinderGeometry(RB, RB, 3.2, 72, 1, true, 0, wedge), std(0x5b4a3a, { side: THREE.DoubleSide })); wallCut.position.y = -1.6;
      const wallFull = new THREE.Mesh(new THREE.CylinderGeometry(RB, RB, 3.2, 72, 1, true), std(0x5b4a3a, { side: THREE.DoubleSide })); wallFull.position.y = -1.6;
      const cutG = new THREE.Group(), fullG = new THREE.Group(); cutG.add(terrCut, wallCut); fullG.add(terrFull, wallFull); body.add(cutG, fullG);
      // 바다/평지 기반
      const sea = new THREE.Mesh(new THREE.RingGeometry(RB - 0.01, RB + 3.2, 72), std(0x1f5a3a, { roughness: 0.95 })); sea.rotation.x = -Math.PI / 2; sea.position.y = 0.005; body.add(sea);
      /* ---------- 단면(층·화도·마그마 방) ---------- */
      const LAYC = [0x8a7e72, 0xc2a37a, 0x6f6459];
      function caps(rotY) {
        const g = new THREE.Group();
        const mk = (pts, col, em, z) => { const sh = new THREE.Shape(pts.map((p) => new THREE.Vector2(p[0], p[1]))); const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), std(col, { side: THREE.DoubleSide, emissive: em ? col : 0, emissiveIntensity: em || 0, roughness: 0.7 })); m.position.z = z; return m; };
        // 원뿔 표면과 나란한 화산 쇄설층·용암층 (층상 화산)
        const N = 40, off = [0, 0.32, 0.64, 0.98];
        for (let k = 0; k < 3; k++) {
          const top = [], bot = [];
          for (let i = 0; i <= N; i++) { const r = i / N * RB; top.push([r, Math.max(0, hAt(r) - off[k])]); }
          for (let i = N; i >= 0; i--) { const r = i / N * RB; bot.push([r, Math.max(0, hAt(r) - off[k + 1])]); }
          g.add(mk(top.concat(bot), LAYC[k], 0, 0.0));
        }
        // 지하: 기반암 (3개 층)
        const bands = [[0, -1.0, 0xb29a7a], [-1.0, -2.1, 0x9a8466], [-2.1, -3.2, 0x7a6a58]];
        bands.forEach((b) => g.add(mk([[0, b[0]], [RB, b[0]], [RB, b[1]], [0, b[1]]], b[2], 0, 0)));
        // 마지막 지표 아래 층(원뿔 아래~0)은 기반암 첫 띠가 채워요: 원뿔 아래 부분 보충
        const fill = []; for (let i = 0; i <= N; i++) { const r = i / N * RB; fill.push([r, Math.max(0, hAt(r) - off[3])]); } fill.push([RB, 0], [0, 0]);
        g.add(mk(fill, 0xb29a7a, 0, 0.001));
        // 화도와 마그마 방
        g.add(mk([[0, -1.9], [0.17, -1.9], [0.17, 2.4], [0, 2.4]], 0xff6a2a, 1.0, 0.004));
        const ch = []; for (let i = 0; i <= 20; i++) { const a = -Math.PI / 2 + i / 20 * Math.PI; ch.push([Math.cos(a) * 1.45, -2.2 + Math.sin(a) * 0.75 * 0 + Math.sin(a) * 0.0 + (Math.sin(a) > 0 ? Math.sin(a) * 0.55 : Math.sin(a) * 0.55)]); }
        const pts = []; for (let i = 0; i <= 24; i++) { const a = Math.PI / 2 - i / 24 * Math.PI; pts.push([Math.cos(a) * 1.5, -2.2 + Math.sin(a) * 0.62]); }
        g.add(mk(pts, 0xff4a1c, 1.2, 0.006));
        g.rotation.y = rotY; return g;
      }
      const capA = caps(Math.PI), capB = caps(0); // 단면 두 장 (x<0, z=0) / (z>0, x=0 => 회전 -π/2)
      capB.rotation.y = -Math.PI / 2;
      cutG.add(capA, capB);
      // 전체 보기(단면 끔)에서는 마그마 방은 숨겨요 (지표만)
      /* ---------- 분출물 ---------- */
      const ashMat = std(0x6a6258, { transparent: true, opacity: 0.7, roughness: 1, depthWrite: false });
      const NA = 360, ash = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.2, 1), ashMat, NA); ash.frustumCulled = false; root.add(ash);
      const NB = 40, bomb = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.13, 1), std(0xff6a2a, { emissive: 0xff3a10, emissiveIntensity: 0.9, roughness: 0.4 }), NB); bomb.frustumCulled = false; root.add(bomb);
      const NG = 40, gas = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.28, 1), std(0xf4f4f8, { transparent: true, opacity: 0.35, roughness: 1, depthWrite: false }), NG); gas.frustumCulled = false; root.add(gas);
      const A = [], B = [], G = []; const dm = new THREE.Object3D(); const rnd = (a, b) => a + Math.random() * (b - a);
      for (let i = 0; i < NA; i++) A.push({ on: 0 }); for (let i = 0; i < NB; i++) B.push({ on: 0 }); for (let i = 0; i < NG; i++) G.push({ on: 0 });
      function emitAsh(p) { const H = VEI[vei].h * KM * rnd(0.55, 1.05), dec = 1.3; p.on = 1; p.t = 0; p.x = rnd(-0.12, 0.12); p.y = HC - 0.3; p.z = rnd(-0.12, 0.12); p.vy = Math.sqrt(2 * dec * H); p.dec = dec; p.ph = 0; p.s = rnd(0.7, 1.5); const a = rnd(0, 6.283); p.dx = Math.cos(a); p.dz = Math.sin(a); p.vh = rnd(0.1, 0.4); p.life = rnd(8, 14); }
      function emitBomb(p) { p.on = 1; p.t = 0; p.x = rnd(-0.1, 0.1); p.y = HC - 0.2; p.z = rnd(-0.1, 0.1); const a = rnd(0, 6.283), v = rnd(1.2, 2.4) * (0.6 + vei * 0.12); p.vx = Math.cos(a) * v; p.vz = Math.sin(a) * v; p.vy = rnd(3.5, 6.5) * (0.6 + vei * 0.1); p.life = 6; }
      function emitGas(p) { p.on = 1; p.t = 0; p.x = rnd(-0.1, 0.1); p.y = HC - 0.2; p.z = rnd(-0.1, 0.1); p.vy = rnd(0.5, 1.2) * (0.6 + vei * 0.12); p.dx = rnd(-0.3, 0.3); p.dz = rnd(-0.3, 0.3); p.life = rnd(7, 11); }
      /* 용암 흐름 */
      const lavas = [];
      [[0.9, 0.5], [2.3, 0.9], [3.9, 0.7]].forEach((q, i) => {
        const pts = []; for (let k = 0; k <= 30; k++) { const r = 0.35 + k / 30 * (RB - 0.7) * (0.55 + 0.1 * i); const a = q[0] + Math.sin(k * 0.35 + i) * 0.05; pts.push(new THREE.Vector3(Math.sin(a) * r, hAt(r) + 0.06, Math.cos(a) * r)); }
        const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.12, 6); lavas.push({ m: new THREE.Mesh(g, std(0xff5a1a, { emissive: 0xff3a10, emissiveIntensity: 1.0, roughness: 0.5 })), n: g.index.count }); body.add(lavas[i].m);
      });
      // 성층권 경계
      const strat = new THREE.Mesh(new THREE.RingGeometry(0.4, 5.6, 72), new THREE.MeshBasicMaterial({ color: 0x6aa8ff, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false })); strat.rotation.x = -Math.PI / 2; strat.position.y = HC + 12 * KM; root.add(strat);
      const lStrat = label('성층권 (약 12 km 위)', [4.6, HC + 12 * KM, 0], { size: 12, color: 'rgba(40,100,200,.9)' });
      const lCr = label('분화구', [0, HC + 0.3, 0], { size: 12 });
      const lCham = label('마그마 방', [0, -2.2, 0], { color: 'rgba(210,70,20,.92)', size: 12 });
      const lDuct = label('화도', [0.0, 0.5, 0.0], { color: 'rgba(210,70,20,.92)', size: 12 });
      const lAsh = label('화산재 기둥', [0, 5, 0], { color: 'rgba(70,60,50,.9)', size: 12 });
      const lLava = label('용암', [0.0, 0, 0], { color: 'rgba(210,70,20,.92)', size: 12 });
      const lBomb = label('화산탄', [2.5, 4, 1], { color: 'rgba(210,70,20,.92)', size: 12 });
      const lGas = label('화산 가스', [-1.4, 4.2, 0], { size: 12 });
      function setCut(v) { cut = v; cutG.visible = v; fullG.visible = !v; lCham.show(v); lDuct.show(v); orbit.theta = v ? -0.8 : 0.4; }
      function setVei(v, from2d) { vei = v; T = 0; if (!from2d) { const L2 = window.__sim; if (L2 && L2.setVei && L2.S && L2.S.vei !== v) L2.setVei(v); } info('<b>VEI ' + v + '</b> · 화산재 기둥 약 <b>' + VEI[v].h + ' km</b> · 분출물 <b>' + VEI[v].vol + ' km³ 이상</b><br>' + (v >= 5 ? '화산재가 성층권까지 올라가 오래 머물러요.' : '화산재가 대류권에 머물러 곧 가라앉아요.') + '<br>용암 · 화산 쇄설물(화산재·화산탄) · 화산 가스가 분출해요.'); seg.set(v); }
      const seg = controls.segment('분출 세기(VEI)', [3, 4, 5, 6, 7].map((v) => ({ value: v, label: 'VEI ' + v })), vei, (v) => setVei(v));
      const bC = controls.button('단면 ✓', () => { setCut(!cut); bC.classList.toggle('on', cut); bC.textContent = '단면 ' + (cut ? '✓' : '✕'); }); bC.classList.add('on');
      let demoP = 0;
      const pl = controls.player({
        duration: 16, loop: true, autoplay: false, label: '분출',
        phases: [[0, '분출 시작'], [0.2, '화산재 기둥'], [0.44, '분출 끝'], [0.6, '화산재가 가라앉아요']],
        onFrame(p) { demoP = p; T = p * 16; },
      });
      const S0 = () => (window.__sim && window.__sim.S) || null; let lastV = S0() && S0().vei;
      // 기둥 높이 표시선: 2D의 빨간 점선처럼 화산재 기둥 꼭대기를 따라 올라가다 멈춰요 (2D의 기둥 높이 그대로)
      const hMark = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.025, 6, 48), new THREE.MeshBasicMaterial({ color: 0xe11d48 })); hMark.rotation.x = Math.PI / 2; root.add(hMark);
      const lH = label('', hMark, { size: 12, offset: [1.9, 0, 0], color: 'rgba(190,18,60,.92)' });
      if (VEI[lastV]) vei = lastV;
      setCut(true); setVei(vei);
      const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
      let acc = 0;
      return {
        update(dt, t) {
          const s = S0(); if (s && s.vei !== lastV) { lastV = s.vei; if (VEI[s.vei] && s.vei !== vei) setVei(s.vei, true); }
          if (!pl.playing && demoP === 0) T += dt; const erupting = (T % 16) < 7; if (T > 16) T = T % 16;
          const V = VEI[vei]; acc += dt;
          // 방출
          const rate = erupting ? V.n / 9 : 0; let em = Math.floor(acc * rate);
          for (const p of A) { if (!p.on && em > 0) { emitAsh(p); em--; } }
          const eb = erupting ? Math.floor(acc * V.bomb / 5) : 0; let eb2 = eb; for (const p of B) { if (!p.on && eb2 > 0) { emitBomb(p); eb2--; } }
          const eg = erupting ? Math.floor(acc * 5) : 0; let eg2 = eg; for (const p of G) { if (!p.on && eg2 > 0) { emitGas(p); eg2--; } }
          if (em > 0 || eb > 0 || eg > 0 || acc > 0.5) acc = em > 0 || eb > 0 || eg > 0 ? 0 : acc; if (acc > 1) acc = 0;
          A.forEach((p, i) => {
            if (p.on) {
              p.t += dt; if (p.ph === 0) { p.vy -= p.dec * dt; p.y += p.vy * dt; p.x += p.dx * 0.1 * dt; p.z += p.dz * 0.1 * dt; if (p.vy < 0.25) { p.ph = 1; } }
              else { p.x += p.dx * p.vh * dt * (vei >= 5 ? 1.6 : 0.7); p.z += p.dz * p.vh * dt * (vei >= 5 ? 1.6 : 0.7); p.y -= 0.05 * dt; }
              if (p.t > p.life) p.on = 0;
            }
            dm.position.set(p.x, p.y, p.z); dm.scale.setScalar(p.on ? p.s * (0.6 + 0.4 * Math.min(1, p.t * 0.5)) * (1 - sm(p.life - 2.5, p.life, p.t || 0)) : 0.0001); dm.updateMatrix(); ash.setMatrixAt(i, dm.matrix);
          });
          B.forEach((p, i) => { if (p.on) { p.t += dt; p.vy -= 6 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; const g = hAt(Math.hypot(p.x, p.z)); if (p.y < g + 0.05) { p.y = g + 0.05; p.vx = p.vy = p.vz = 0; } if (p.t > p.life) p.on = 0; } dm.position.set(p.x, p.y, p.z); dm.scale.setScalar(p.on ? 1 - sm(4.5, 6, p.t) : 0.0001); dm.updateMatrix(); bomb.setMatrixAt(i, dm.matrix); });
          G.forEach((p, i) => { if (p.on) { p.t += dt; p.y += p.vy * dt; p.x += p.dx * dt; p.z += p.dz * dt; if (p.t > p.life) p.on = 0; } dm.position.set(p.x, p.y, p.z); dm.scale.setScalar(p.on ? (0.6 + p.t * 0.25) * (1 - sm(p.life - 3, p.life, p.t)) : 0.0001); dm.updateMatrix(); gas.setMatrixAt(i, dm.matrix); });
          [ash, bomb, gas].forEach((m) => { m.instanceMatrix.needsUpdate = true; });
          // 용암 흐름: 분출 중 점점 길어져요
          const grow = sm(0.3, 6.5, T) * V.lava * 0.55 + (erupting ? 0 : 0); const g2 = Math.min(1, grow);
          lavas.forEach((l, i) => { l.m.geometry.setDrawRange(0, Math.floor(l.n * Math.min(1, g2 * (1 - i * 0.12)) / 6) * 6); l.m.visible = g2 > 0.02; });
          // 이름표
          const top = HC + V.h * KM * 0.8;
          lAsh.obj = [0.3, Math.min(top, HC + 4.5), 0]; lAsh.show(erupting && T > 1);
          lCr.show(!erupting || T < 0.5); lLava.show(g2 > 0.4); lLava.obj = [Math.sin(0.9) * 2.0, hAt(2.0) + 0.3, Math.cos(0.9) * 2.0];
          lBomb.show(erupting && T > 0.8); lGas.show(erupting && T > 1.2);
          lStrat.show(true);
          { const ph = s && typeof s.plumeH === 'number' ? s.plumeH : V.h; hMark.visible = ph > 0.5; hMark.position.set(0, HC + ph * KM * 0.8, 0); lH.show(ph > 0.5); const txt = '기둥 높이 약 ' + V.h + ' km'; if (lH.txt !== txt) { lH.txt = txt; lH.set(txt); } }
        },
        sync() {},
      };
    },
  });
})();
