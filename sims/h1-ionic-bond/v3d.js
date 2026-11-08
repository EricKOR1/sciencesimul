/* h1-ionic-bond · 3D 이온 결합 (전자 이동 · NaCl 결정)
   Na → Na⁺ + e⁻, Cl + e⁻ → Cl⁻ 로 만들어진 이온이 번갈아 쌓여 결정이 돼요.
   1단계(전자 이동)는 2D의 거리 슬라이더·전자 옮기기와 서로 맞춰지고, 금빛 전자를 눌러 옮길 수 있어요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const CNA = 0xb78cff, CCL = 0x4cd08a;

  window.SciSim3D.attach({
    title: '이온 결합과 NaCl 결정 3D',
    camera: { dist: PHN ? 17 : 12.5, theta: 0.7, phi: 1.1, min: 6, max: 26 },
    levels: [0],
    autoRotate: 0.22,
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.35, metalness: 0.1 }, o || {}));
      let mode = 'transfer', spread = 0, layers = 4, grow = -1;
      const gT = new THREE.Group(), gL = new THREE.Group();
      root.add(gT, gL);
      const labs = [];
      const L = (t, o, opt) => { const l = label(t, o, opt); labs.push(l); return l; };

      /* ---------- 1) 전자 이동 ---------- */
      const atom = (col, rs, nOut, x) => {
        const g = new THREE.Group(); g.position.x = x;
        const nuc = new THREE.Mesh(new THREE.SphereGeometry(0.4, 24, 16), std(col, { emissive: col, emissiveIntensity: 0.25 }));
        g.add(nuc);
        const rings = rs.map((r) => { const m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.025, 10, 96), std(0xaabbe6, { transparent: true, opacity: 0.55 })); m.rotation.x = Math.PI / 2; g.add(m); return m; });
        const es = [];
        rs.forEach((r, i) => { const n = i === 0 ? 2 : i === 1 ? 8 : nOut; for (let k = 0; k < n; k++) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), std(i === rs.length - 1 ? 0xffd34d : 0x4aa3ff, { emissive: i === rs.length - 1 ? 0x7a5a00 : 0x123a78, emissiveIntensity: 0.6 })); g.add(e); es.push({ e, r, a0: k / n * 6.283 + i, sp: 0.8 - i * 0.2, out: i === rs.length - 1, k }); } });
        gT.add(g); return { g, rings, es };
      };
      const NA = atom(CNA, [0.9, 1.6, 2.3], 1, -3.2), CL = atom(CCL, [0.9, 1.6, 2.3], 7, 3.2);
      const movE = NA.es.find((x) => x.out); // 옮겨 가는 전자
      const naLab = L('Na 나트륨', NA.g, { offset: [0, 2.9, 0] }), clLab = L('Cl 염소', CL.g, { offset: [0, 2.9, 0] });
      const naCh = L('Na⁺', NA.g, { offset: [0, -2.9, 0], color: 'rgba(120,70,220,.9)' }), clCh = L('Cl⁻', CL.g, { offset: [0, -2.9, 0], color: 'rgba(20,140,80,.9)' });
      const eLab = L('전자 1개 이동', [0, 1.3, 0], { color: 'rgba(255,211,77,.92)' }); eLab.el.style.color = '#1b2333';

      /* ---------- 2) 결정 ---------- */
      const N = 4, D = 1.5, rNa = 0.42, rCl = 0.7;
      const cnt = N * N * N, geoI = new THREE.SphereGeometry(1, 28, 20);
      const mNa = new THREE.InstancedMesh(geoI, std(CNA, { roughness: 0.3 }), cnt), mCl = new THREE.InstancedMesh(geoI, std(CCL, { roughness: 0.3 }), cnt);
      gL.add(mNa, mCl);
      const bondM = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 8), std(0xdde6ff, { transparent: true, opacity: 0.55 }), cnt * 3);
      gL.add(bondM);
      const dummy = new THREE.Object3D(), Yv = new THREE.Vector3(0, 1, 0);
      function pos(i, j, k) { const o = (N - 1) / 2; return new THREE.Vector3((i - o) * D * (1 + spread), (j - o) * D * (1 + spread), (k - o) * D * (1 + spread)); }
      const visOf = (i, j, k) => k < layers && (grow < 0 || k * 16 + j * 4 + i < grow);
      function layoutLattice() {
        let a = 0, b = 0, c = 0;
        for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) for (let k = 0; k < N; k++) {
          const p = pos(i, j, k), isNa = (i + j + k) % 2 === 0, vis = visOf(i, j, k);
          dummy.position.copy(p); dummy.scale.setScalar(vis ? (isNa ? rNa : rCl) * (1 - spread * 0.1) : 0.0001); dummy.quaternion.identity(); dummy.updateMatrix();
          if (isNa) mNa.setMatrixAt(a++, dummy.matrix); else mCl.setMatrixAt(b++, dummy.matrix);
          // 이웃과의 결합선(+x, +y, +z 방향)
          [[1, 0, 0], [0, 1, 0], [0, 0, 1]].forEach((d) => {
            const ni = i + d[0], nj = j + d[1], nk = k + d[2];
            if (ni >= N || nj >= N || nk >= N || !visOf(ni, nj, nk) || !vis || spread < 0.05) { dummy.scale.setScalar(0.0001); dummy.position.copy(p); }
            else {
              const q = pos(ni, nj, nk), dv = q.clone().sub(p), len = dv.length();
              dummy.position.copy(p).add(q).multiplyScalar(0.5); dummy.quaternion.setFromUnitVectors(Yv, dv.normalize()); dummy.scale.set(1, len, 1);
            }
            dummy.updateMatrix(); bondM.setMatrixAt(c++, dummy.matrix);
          });
        }
        [mNa, mCl, bondM].forEach((m) => { m.instanceMatrix.needsUpdate = true; });
        bondM.visible = spread >= 0.05;
      }
      const lNa = L('Na⁺ (작은 구)', [0, 0, 0], { color: 'rgba(120,70,220,.9)' }), lCl = L('Cl⁻ (큰 구)', [0, 0, 0], { color: 'rgba(20,140,80,.9)' });
      function tagLattice() { const o = (N - 1) / 2, s = D * (1 + spread); lNa.obj = pos(0, 0, 0).add(new THREE.Vector3(-0.2, 0, 0.0)); lNa.off = [-1.2, 0.6, 0]; lCl.obj = pos(N - 1, 0, 0); lCl.off = [1.3, 0.6, 0]; if (layers < 1) layers = 1; }

      const PHN2 = PHN, D_FAR = PHN2 ? 232 : 316, D_ION = PHN2 ? 132 : 170, R2 = PHN2 ? 76 : 98, AY = PHN2 ? 290 : 268;
      const ease = (x) => x * x * (3 - 2 * x);
      function setMode(m) {
        mode = m; gT.visible = m === 'transfer'; gL.visible = m === 'lattice';
        labs.forEach((l) => l.show(false));
        ctlLat.forEach((e) => { e.style.display = m === 'lattice' ? '' : 'none'; });
        ctlTr.forEach((e) => { e.style.display = m === 'transfer' ? '' : 'none'; });
        plT.pause(); plL.pause();
        if (m === 'transfer') { orbit.dist = PHN ? 15 : 11.5; naLab.show(true); clLab.show(true); lastInfo = ''; plT.set(0); }
        else {
          orbit.dist = PHN ? 17 : 12.5; grow = -1; layoutLattice(); tagLattice(); lNa.show(true); lCl.show(true);
          info('<b>NaCl 결정</b>: Na⁺와 Cl⁻가 번갈아 규칙적으로 쌓여요.<br>같은 전하끼리는 밀어내고, 반대 전하끼리는 끌어당겨요. 이온 하나는 반대 전하의 이온 6개에 둘러싸여 있어요.');
        }
        segM.set(m);
      }
      const segM = controls.segment('', [{ value: 'transfer', label: '전자 이동' }, { value: 'lattice', label: 'NaCl 결정' }], mode, setMode);
      const ctlTr = [], ctlLat = [];
      const host = (fn) => { const before = document.querySelector('.v3-ctl').children.length; const r = fn(); const kids = [...document.querySelector('.v3-ctl').children].slice(before); return [r, kids]; };
      /* 전자 이동: p = 0이면 2D 상태를 그대로 보여 주고, ▶ 재생·진행 막대를 쓰면 한 사이클을 보여 줘요 */
      let demoP = 0;
      let [plT, k1] = host(() => controls.player({
        duration: 9, loop: true, autoplay: false, label: '전자 이동',
        phases: [[0, 'Na · Cl 원자'], [0.35, '가까이'], [0.45, '전자 이동'], [0.65, '이온 결합']],
        onFrame(p) { demoP = p; },
      })); ctlTr.push(...k1);
      let [plL, k1b] = host(() => controls.player({
        duration: 8, loop: true, autoplay: false, label: '이온 쌓기',
        phases: [[0, '아래층부터 쌓는 중'], [0.97, 'NaCl 결정 완성']],
        onFrame(p) { grow = p >= 0.97 ? -1 : Math.floor(p / 0.97 * layers * 16) + 1; layoutLattice(); },
      })); ctlLat.push(...k1b);
      let [r1, k2] = host(() => controls.range('이온 사이 벌리기', 0, 1, 0.05, 0, (v) => { spread = v; layoutLattice(); tagLattice(); })); ctlLat.push(...k2);
      let [r2, k3] = host(() => controls.range('층 수', 1, 4, 1, 4, (v) => { layers = v; layoutLattice(); }, (v) => v + '층')); ctlLat.push(...k3);
      let lastInfo = '';
      setMode(window.__sim && window.__sim.S && window.__sim.S.scene === 'lattice' ? 'lattice' : 'transfer');

      /* 금빛 전자를 눌러 옮기기 (2D의 전자 누르기와 같아요) */
      const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(); let down = null;
      const rd = ctx.renderer.domElement;
      rd.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
      rd.addEventListener('pointerup', (e) => {
        if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) { down = null; return; } down = null;
        const L2 = window.__sim; if (mode !== 'transfer' || demoP > 0 || !L2 || !L2.A) return;
        const r = rd.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(ndc, ctx.camera);
        if (ray.intersectObject(movE.e, false).length) moveE();
      });
      // 작은 전자를 못 맞혀도 이름표를 눌러 옮길 수 있어요
      function moveE() { const L2 = window.__sim; if (mode !== 'transfer' || demoP > 0 || plT.playing || !L2 || !L2.A) return; if (L2.A.phase === 'idle' && L2.A.slider >= 0.8 && L2.startFly) L2.startFly(L2.VW / 2 - L2.A.d.value / 2 + R2, AY); }
      const eTap = L('👆 금빛 전자 옮기기', movE.e, { offset: [0, 0.75, 0], color: 'rgba(255,211,77,.95)', tap: moveE }); eTap.el.style.color = '#1b2333'; eTap.show(false);

      let lastSc = null;
      const scMap = { atoms: 'transfer', lattice: 'lattice' };
      function syncScene() { const q = window.__sim && window.__sim.S; if (!q || q.scene === lastSc) return; lastSc = q.scene; const m = scMap[q.scene]; if (m && m !== mode) setMode(m); }
      return {
        update(dt, t) {
          syncScene();
          if (mode === 'transfer') {
            const L2 = window.__sim, A = L2 && L2.A, demo = demoP > 0 || plT.playing;
            // 2D 상태(거리·전자 이동)를 읽거나, 재생 중이면 p로 한 사이클을 보여 줘요
            let gap, k, qa, glow;
            if (demo) {
              const p = demoP; gap = p < 0.35 ? 6.3 - 1.6 * ease(p / 0.35) : p < 0.65 ? 4.7 : 4.7 - 1.3 * ease((p - 0.65) / 0.2);
              k = ease(Math.max(0, Math.min(1, (p - 0.45) / 0.2))); qa = k; glow = p >= 0.3 && p < 0.45 ? 1 : 0;
            } else if (A) {
              gap = 3.4 + 2.9 * Math.max(0, Math.min(1, (A.d.value - D_ION) / (D_FAR - D_ION)));
              k = A.phase === 'fly' ? A.eu : A.phase === 'done' ? 1 : 0; qa = A.qa; glow = A.phase === 'idle' && A.slider >= 0.8 ? 1 : 0;
            } else { gap = 6.3; k = 0; qa = 0; glow = 0; }
            NA.g.position.x = -gap / 2; CL.g.position.x = gap / 2;
            NA.es.forEach((o) => { if (o === movE) return; const a = o.a0 + t * o.sp; o.e.position.set(Math.cos(a) * o.r, 0, Math.sin(a) * o.r); });
            CL.es.forEach((o) => { const a = o.a0 + t * o.sp; o.e.position.set(Math.cos(a) * o.r, 0, Math.sin(a) * o.r); });
            // 옮겨 가는 전자: Na 바깥 껍질 → 공중 → Cl 바깥 껍질
            const sx = 2.3, cx = gap - 2.3, px = sx + (cx - sx) * k, py = Math.sin(k * Math.PI) * 1.2;
            if (k < 0.001) { const a = movE.a0 + t * movE.sp; movE.e.position.set(Math.cos(a) * 2.3, 0, Math.sin(a) * 2.3); } else movE.e.position.set(px, py, 0);
            movE.e.scale.setScalar(1 + (glow ? 0.35 + 0.25 * Math.sin(t * 8) : 0));
            eTap.show(!demo && !!glow);
            NA.rings[2].visible = k < 0.5; CL.rings[2].material.opacity = 0.55;
            const nsc = 1 - 0.18 * qa; NA.rings.forEach((r, i) => { r.scale.setScalar(i === 2 ? 1 : nsc); });
            CL.g.scale.setScalar(1 + 0.12 * qa);
            NA.g.children[0].material.color.setHex(qa > 0.5 ? 0x8f5df5 : CNA); CL.g.children[0].material.color.setHex(qa > 0.5 ? 0x25b673 : CCL);
            const ions = qa > 0.95; naCh.show(ions); clCh.show(ions);
            eLab.show(k > 0.02 && k < 0.98); eLab.obj = [-gap / 2 + px, py + 0.6, 0];
            const key = ions ? 2 : glow ? 1 : 0;
            if (key !== lastInfo) {
              lastInfo = key;
              info(ions ? '<b>이온이 생겼어요.</b><br>Na는 전자 1개를 잃어 <b>Na⁺</b>(2-8), Cl은 전자 1개를 얻어 <b>Cl⁻</b>(2-8-8)가 돼요. 반대 전하는 <b>정전기적 인력</b>으로 결합해요.'
                : glow ? '바깥 전자껍질이 맞닿았어요. <b>금빛 전자</b>를 눌러 Cl의 빈자리로 옮겨 보세요.'
                  : '<b>전자가 옮겨 가요.</b><br>옆의 <b>거리</b> 슬라이더로 Na와 Cl을 가까이 하거나, ▶ 버튼으로 한 번 보세요.');
            }
          }
        },
        sync() { syncScene(); },
      };
    },
  });
})();
