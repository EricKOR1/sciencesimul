/* hr-electrolysis · 3D 전기 분해 (용융 NaCl · NaCl 수용액)
   외부 전원이 (−)극으로 전자를 밀어 넣어요. (−)극에서는 환원, (+)극에서는 산화가 일어나요.
   용융 NaCl: (−) Na⁺ + e⁻ → Na, (+) 2Cl⁻ → Cl₂ + 2e⁻
   NaCl 수용액: (−) 2H₂O + 2e⁻ → H₂ + 2OH⁻ (Na⁺는 물보다 환원되기 어려워요), (+) 2Cl⁻ → Cl₂ + 2e⁻
   2D에서 고른 화면(용융 NaCl · NaCl 수용액)과 전원(⚡ 켜기 · 끄기)을 그대로 따라가요 (3D 전원 단추도 2D 단추를 눌러 줘요).
   입자 수와 속도는 모형 스케치예요. 2단계(용융 NaCl)와 3단계(수용액 경쟁)에서 열려요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const BR = 3.4, BH = 3.6, FY = -2.4, EX = 1.7, WATER = 0.78;

  window.SciSim3D.attach({
    title: '전기 분해 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHONE ? 19 : 12.5, theta: 0.3, phi: 1.22, min: 8, max: 28, target: [0, 1.0, 0] },
    autoRotate: 0.06,
    levels: [1, 2],   // 2단계 용융 NaCl · 3단계 수용액 경쟁. 1·4단계(전지와 비교 · 전자 계산)는 2D 화면이에요
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3;
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.4, metalness: 0.05 }, o || {}));
      const s0 = window.__sim && window.__sim.S && window.__sim.S.mode;
      let scene = s0 === 'aqueous' ? 'aq' : 'ml', power = true, showLab = true, lastMode = s0;
      /* 비커 */
      const gl = new THREE.Mesh(new THREE.CylinderGeometry(BR, BR, BH, 56, 1, true), new THREE.MeshStandardMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.16, roughness: 0.08, side: THREE.DoubleSide, depthWrite: false })); gl.position.y = FY + BH / 2; root.add(gl);
      const bt = new THREE.Mesh(new THREE.CylinderGeometry(BR, BR, 0.14, 56), mat(0xbcd0e6, { transparent: true, opacity: 0.5 })); bt.position.y = FY; root.add(bt);
      const liq = new THREE.Mesh(new THREE.CylinderGeometry(BR - 0.04, BR - 0.04, BH * WATER, 56), mat(0x7cc4ff, { transparent: true, opacity: 0.3, roughness: 0.15, depthWrite: false })); liq.position.y = FY + BH * WATER / 2; root.add(liq);
      const top = FY + BH * WATER;
      const pink = new THREE.Mesh(new THREE.CylinderGeometry(BR - 0.05, BR - 0.05, BH * WATER - 0.06, 56, 1, false, Math.PI, Math.PI), mat(0xff5fa8, { transparent: true, opacity: 0.0, depthWrite: false })); pink.position.y = FY + BH * WATER / 2; root.add(pink);
      /* 전극 (흑연) */
      const elMat = mat(0x56607a, { roughness: 0.55, metalness: 0.3 });
      const cath = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 4.5, 24), elMat); cath.position.set(-EX, FY + 2.35, 0);
      const an = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 4.5, 24), elMat); an.position.set(EX, FY + 2.35, 0); root.add(cath, an);
      const eTop = FY + 2.35 + 2.25;
      /* 전지 + 도선 */
      const BY = eTop + 1.5;
      const batt = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 2.4, 28), mat(0x3b82f6, { metalness: 0.4, roughness: 0.4 })); batt.rotation.z = Math.PI / 2; batt.position.set(0, BY, 0); root.add(batt);
      const capP = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.4, 20), mat(0xd1d5db, { metalness: 0.8, roughness: 0.3 })); capP.rotation.z = Math.PI / 2; capP.position.set(1.4, BY, 0); root.add(capP);
      const wm = mat(0xd18a3a, { metalness: 0.7, roughness: 0.35 });
      const wL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, BY - eTop, 10), wm); wL.position.set(-EX, (BY + eTop) / 2, 0);
      const wR = wL.clone(); wR.position.x = EX; root.add(wL, wR);
      const hL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, EX - 1.2, 10), wm); hL.rotation.z = Math.PI / 2; hL.position.set(-(EX + 1.2) / 2, BY, 0);
      const hR = hL.clone(); hR.position.x = (EX + 1.2) / 2; root.add(hL, hR);
      /* 전자 */
      const NE = 6, emat = mat(0x42e8ff, { emissive: 0x00a9c0, emissiveIntensity: 0.9 });
      const eL = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 12, 10), emat, NE), eR = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 12, 10), emat, NE); [eL, eR].forEach((m) => { m.frustumCulled = false; root.add(m); });
      /* 이온 */
      const NI = 14, NA = 14;
      const mkI = (n, r, c) => { const m = new THREE.InstancedMesh(new THREE.SphereGeometry(r, 18, 14), mat(c, { roughness: 0.3, emissive: c, emissiveIntensity: 0.18 }), n); m.frustumCulled = false; root.add(m); return m; };
      const naM = mkI(NI, 0.2, 0xb07cff), clM = mkI(NI, 0.27, 0x3ed36b), ohM = mkI(NA, 0.17, 0xff5fa8);
      const rnd = (a, b) => a + Math.random() * (b - a);
      const spawn = (side) => { const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * (BR - 0.5); return new V3(Math.cos(a) * r, rnd(FY + 0.5, top - 0.4), Math.sin(a) * r * 0.8); };
      const NaP = Array.from({ length: NI }, () => ({ p: spawn(), s: rnd(0.5, 1.0), pulse: 0 })), ClP = Array.from({ length: NI }, () => ({ p: spawn(), s: rnd(0.5, 1.0), pulse: 0 }));
      const OH = Array.from({ length: NA }, () => ({ on: false, p: new V3(), life: 0 }));
      /* 기포 & 나트륨 방울 */
      const NB = 14, bgeo = new THREE.SphereGeometry(0.22, 18, 14);
      const mkB = () => Array.from({ length: NB }, () => { const m = new THREE.Mesh(bgeo, mat(0xffffff, { transparent: true, opacity: 0.55, roughness: 0.1, depthWrite: false })); m.visible = false; root.add(m); return { m, on: false, t: 0, dx: 0, dz: 0 }; });
      const bA = mkB(), bC = mkB();
      const naD = Array.from({ length: 6 }, (_, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 14), mat(0xe6edf5, { metalness: 0.9, roughness: 0.2 })); m.position.set(-EX - 0.28, FY + 0.45 + i * 0.42, 0); m.scale.setScalar(0.0001); root.add(m); return m; });
      let naN = 0, bacc = 0;
      const M = new THREE.Matrix4();
      const L = {
        cath: label('(−)극 · 환원', [-EX, eTop + 0.3, 0], { color: 'rgba(37,99,235,.92)' }), an: label('(+)극 · 산화', [EX, eTop + 0.3, 0], { color: 'rgba(220,38,38,.92)' }),
        prodC: label('', [-EX - 0.8, top + 0.4, 0], { color: 'rgba(30,41,59,.9)' }), prodA: label('', [EX + 0.8, top + 0.4, 0], { color: 'rgba(30,41,59,.9)' }),
        e: label('e⁻', [-EX - 0.2, eTop + 0.9, 0], { color: 'rgba(8,145,178,.92)' }),
      };
      const setLab = () => { Object.values(L).forEach((l) => l.show(showLab)); };
      function setScene(v) {
        scene = v; liq.material.color.setHex(v === 'ml' ? 0xff9a3c : 0x7cc4ff); liq.material.emissive.setHex(v === 'ml' ? 0x7a3300 : 0x000000); liq.material.opacity = v === 'ml' ? 0.38 : 0.3;
        liq.material.emissiveIntensity = 0.7; naN = 0; naD.forEach((m) => m.scale.setScalar(0.0001)); bA.concat(bC).forEach((b) => { b.on = false; b.m.visible = false; }); OH.forEach((o) => { o.on = false; });
        bC.forEach((b) => b.m.material.color.setHex(0xffffff)); bA.forEach((b) => b.m.material.color.setHex(0xd7ff6a));
        L.prodC.set(v === 'ml' ? 'Na 생성' : 'H₂ 기체'); L.prodA.set('Cl₂ 기체'); txt = '';
      }
      let txt = '';
      const pb = controls.button('⚡ 전원 OFF ✕', () => {
        const w = window.__sim, md = w && w.S && w.S.mode, bt = document.getElementById(md === 'molten' ? 'bMlPow' : md === 'aqueous' ? 'bAqPow' : '');
        if (bt && !bt.disabled) { bt.click(); return; }                       // 2D의 전원 단추와 같은 단추
        power = !power;
      });
      controls.text('전해질(용융 NaCl · 수용액)은 2D 화면의 단계에서 골라요.');
      const lb = controls.button('이름표 ✓', () => { showLab = !showLab; lb.classList.toggle('on', showLab); lb.textContent = '이름표 ' + (showLab ? '✓' : '✕'); setLab(); }); lb.classList.add('on');
      setScene(scene); let pw = 0;
      return {
        update(dt, t) {
          dt = Math.min(dt, 0.05);
          const ms = window.__sim && window.__sim.S && window.__sim.S.mode;
          if (ms !== lastMode) { lastMode = ms; if (ms === 'molten' && scene !== 'ml') setScene('ml'); else if (ms === 'aqueous' && scene !== 'aq') setScene('aq'); }
          { const S2 = window.__sim && window.__sim.S; if (S2 && (ms === 'molten' || ms === 'aqueous')) power = ms === 'molten' ? !!S2.ml.on : !!S2.aq.on; }
          pb.classList.toggle('on', power); pb.textContent = '⚡ 전원 ' + (power ? 'ON ✓' : 'OFF ✕');
          pw += ((power ? 1 : 0) - pw) * Math.min(1, dt * 4);
          const sp = 0.75 * pw;
          /* 전자: (−)극으로 내려가고, (+)극에서는 올라가요 */
          for (let i = 0; i < NE; i++) {
            const u = (i / NE + t * 0.25 * pw) % 1;
            if (pw < 0.05) { M.makeScale(0.0001, 0.0001, 0.0001); eL.setMatrixAt(i, M); eR.setMatrixAt(i, M); continue; }
            M.makeTranslation(-EX, BY - u * (BY - eTop), 0); eL.setMatrixAt(i, M); M.makeTranslation(EX, eTop + u * (BY - eTop), 0); eR.setMatrixAt(i, M);
          }
          eL.instanceMatrix.needsUpdate = true; eR.instanceMatrix.needsUpdate = true;
          /* 이온 이동 */
          const stepIon = (arr, mesh, target, kind) => {
            arr.forEach((q, i) => {
              const dx = target - q.p.x; q.p.x += Math.sign(dx) * sp * q.s * dt + Math.sin(t * 5 + i * 2.1) * 0.01;
              q.p.y += Math.sin(t * 3.1 + i * 1.7) * 0.004; q.p.z += Math.cos(t * 2.7 + i) * 0.004;
              if (Math.abs(dx) < 0.42) {
                // 전극에 닿음
                if (pw > 0.3) {
                  if (kind === 'na' && scene === 'ml') { naN = Math.min(naD.length, naN + 0.34); }
                  if (kind === 'cl') { const b = bA.find((x) => !x.on); if (b) { b.on = true; b.t = 0; b.dx = rnd(-0.25, 0.25); b.dz = rnd(-0.3, 0.3); } }
                  if (kind === 'na' && scene === 'aq') { /* Na⁺는 반응하지 않고 되돌아가요 */ }
                }
                const p = spawn(); q.p.copy(p); q.p.x = (kind === 'na' ? 1 : -1) * rnd(0.6, BR - 0.8) + (kind === 'na' ? 0 : 0);
              }
              q.p.y = Math.max(FY + 0.35, Math.min(top - 0.35, q.p.y));
              const r = Math.hypot(q.p.x, q.p.z); if (r > BR - 0.35) { q.p.x *= (BR - 0.35) / r; q.p.z *= (BR - 0.35) / r; }
              M.makeTranslation(q.p.x, q.p.y, q.p.z); mesh.setMatrixAt(i, M);
            });
            mesh.instanceMatrix.needsUpdate = true;
          };
          // Na⁺ → (−)극(왼쪽), Cl⁻ → (+)극(오른쪽)
          stepIon(NaP, naM, -EX, 'na'); stepIon(ClP, clM, EX, 'cl');
          /* (−)극 생성물: 용융 = Na 방울, 수용액 = H₂ 기포 + OH⁻ */
          if (scene === 'ml') { naD.forEach((m, i) => { const s = Math.max(0, Math.min(1, naN - i)); m.scale.setScalar(Math.max(0.0001, s)); }); }
          else {
            bacc += dt * 2.2 * pw; while (bacc > 1) { bacc -= 1; const b = bC.find((x) => !x.on); if (b) { b.on = true; b.t = 0; b.dx = rnd(-0.25, 0.25); b.dz = rnd(-0.3, 0.3); } const o = OH.find((x) => !x.on); if (o && Math.random() < 0.7) { o.on = true; o.life = 0; o.p.set(-EX - 0.4, FY + rnd(0.6, 2.2), rnd(-0.3, 0.3)); } }
          }
          const rise = (arr, ex, fx) => arr.forEach((b) => {
            if (!b.on) { b.m.visible = false; return; }
            b.t += dt * 0.5; if (b.t >= 1) { b.on = false; b.m.visible = false; return; }
            b.m.visible = true; b.m.position.set(ex + b.dx * (1 + b.t * 2), FY + 0.6 + b.t * (top - FY - 0.7), b.dz); b.m.scale.setScalar(0.6 + b.t * 0.8);
          });
          rise(bA, EX, 1); rise(bC, -EX, -1);
          if (scene === 'aq' && pw > 0) {
            OH.forEach((o, i) => { if (!o.on) { M.makeScale(0.0001, 0.0001, 0.0001); ohM.setMatrixAt(i, M); return; } o.life += dt * 0.25; if (o.life > 1) { o.on = false; return; } o.p.x -= dt * 0.25; o.p.y += Math.sin(t * 3 + i) * 0.003; const s = Math.sin(Math.PI * o.life); M.makeScale(s + 0.001, s + 0.001, s + 0.001); M.setPosition(o.p.x, o.p.y, o.p.z); ohM.setMatrixAt(i, M); });
          } else { OH.forEach((o, i) => { M.makeScale(0.0001, 0.0001, 0.0001); ohM.setMatrixAt(i, M); }); }
          ohM.instanceMatrix.needsUpdate = true;
          pink.material.opacity = scene === 'aq' ? 0.0 : 0;
          const tx = !power ? '<b>전원이 꺼져 있어요</b><br>외부 전원이 없으면 비자발 반응은 일어나지 않아요. (2D의 ⚡ 단추나 위의 전원 단추로 켜요)' : scene === 'ml' ? '<b>용융 NaCl 전기 분해</b><br>(−)극: Na⁺ + e⁻ → Na (환원)<br>(+)극: 2Cl⁻ → Cl₂ + 2e⁻ (산화)' : '<b>NaCl 수용액 전기 분해</b><br>(−)극: 2H₂O + 2e⁻ → H₂ + 2OH⁻<br>(+)극: 2Cl⁻ → Cl₂ + 2e⁻ · Na⁺는 남아요';
          if (tx !== txt) { txt = tx; info(tx); }
        },
      };
    },
  });
})();
