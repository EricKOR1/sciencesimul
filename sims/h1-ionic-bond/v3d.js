/* h1-ionic-bond · 3D 이온 결합 (전자 이동 · NaCl 결정 · 힘을 가하면)
   Na → Na⁺ + e⁻, Cl + e⁻ → Cl⁻ 로 만들어진 이온이 번갈아 쌓여 결정이 되고, 어긋나면 같은 전하끼리 밀어내 쪼개져요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const CNA = 0xb78cff, CCL = 0x4cd08a;

  window.SciSim3D.attach({
    title: '이온 결합과 NaCl 결정 3D',
    camera: { dist: PHN ? 17 : 12.5, theta: 0.7, phi: 1.1, min: 6, max: 26 },
    autoRotate: 0.22,
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.35, metalness: 0.1 }, o || {}));
      let mode = 'transfer', spread = 0, layers = 4, play = false, tp = 0, shear = 0, shearGo = false, shT = 0;
      const gT = new THREE.Group(), gL = new THREE.Group(), gF = new THREE.Group();
      root.add(gT, gL, gF);
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
      function layoutLattice() {
        let a = 0, b = 0, c = 0;
        for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) for (let k = 0; k < N; k++) {
          const p = pos(i, j, k), isNa = (i + j + k) % 2 === 0, vis = k < layers;
          dummy.position.copy(p); dummy.scale.setScalar(vis ? (isNa ? rNa : rCl) * (1 - spread * 0.1) : 0.0001); dummy.quaternion.identity(); dummy.updateMatrix();
          if (isNa) mNa.setMatrixAt(a++, dummy.matrix); else mCl.setMatrixAt(b++, dummy.matrix);
          // 이웃과의 결합선(+x, +y, +z 방향)
          [[1, 0, 0], [0, 1, 0], [0, 0, 1]].forEach((d) => {
            const ni = i + d[0], nj = j + d[1], nk = k + d[2];
            if (ni >= N || nj >= N || nk >= N || nk >= layers || !vis || spread < 0.05) { dummy.scale.setScalar(0.0001); dummy.position.copy(p); }
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

      /* ---------- 3) 힘을 가하면: 위쪽 절반이 한 칸 밀려 같은 전하끼리 마주 보면 반발 ---------- */
      const NS = 4, DS = 1.5;
      const sm = [], FL = [];
      const ionsF = [];
      for (let i = 0; i < NS; i++) for (let j = 0; j < NS; j++) for (let k = 0; k < 2; k++) {
        const isNa = (i + j + k) % 2 === 0;
        const m = new THREE.Mesh(geoI, std(isNa ? CNA : CCL, { roughness: 0.3 })); m.scale.setScalar(isNa ? rNa : rCl);
        gF.add(m); ionsF.push({ m, i, j, k, isNa, up: j >= NS / 2 });
      }
      const repLab = L('같은 전하끼리 밀어내요!', [0, 0, 0], { color: 'rgba(220,60,60,.92)' });
      const fArrows = [];
      for (let q = 0; q < 2; q++) { const a = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.6, 16), std(0xff5a52, { emissive: 0xff2a20, emissiveIntensity: 0.6 })); gF.add(a); fArrows.push(a); }
      function layoutForce() {
        const o = (NS - 1) / 2; const sh = Math.min(1, shear) * DS; // 위쪽 절반이 +x로 밀림
        const split = shear > 1.15 ? (shear - 1.15) * 1.6 : 0;
        ionsF.forEach((q) => {
          const x = (q.i - o) * DS + (q.up ? sh : 0), y = (q.j - o) * DS + (q.up ? split : 0), z = (q.k - 0.5) * DS;
          q.m.position.set(x, y, z);
        });
        const mid = shear > 0.4 && shear <= 1.15;
        repLab.show(shear > 0.75); repLab.obj = [0, 0, 1.6]; repLab.off = [0, 0.1, 0];
        fArrows.forEach((a, n) => { a.visible = shear > 0.75; a.position.set((n ? 1 : -1) * 0.0, (NS / 2 - 0.5) * 0 + 0 + split * 0.5, 1.6 - 0.0); a.rotation.set(0, 0, n ? Math.PI / 2 : -Math.PI / 2); a.position.x = (n ? 1 : -1) * 0.5 + (shear * DS * 0.25); a.position.y = split * 0.5; a.position.z = 1.05; });
      }

      function setMode(m) {
        mode = m; gT.visible = m === 'transfer'; gL.visible = m === 'lattice'; gF.visible = m === 'force';
        labs.forEach((l) => l.show(false));
        ctlLat.forEach((e) => { e.style.display = m === 'lattice' ? '' : 'none'; });
        ctlFor.forEach((e) => { e.style.display = m === 'force' ? '' : 'none'; });
        ctlTr.forEach((e) => { e.style.display = m === 'transfer' ? '' : 'none'; });
        if (m === 'transfer') {
          orbit.dist = PHN ? 15 : 11.5; naLab.show(true); clLab.show(true); tp = 0; play = false;
          info('<b>전자가 옮겨 가요.</b><br>나트륨은 전자 1개를 잃고 <b>Na⁺</b>, 염소는 전자 1개를 얻어 <b>Cl⁻</b>가 돼요.<br>▶ 버튼을 눌러 보세요.');
        } else if (m === 'lattice') {
          orbit.dist = PHN ? 17 : 12.5; layoutLattice(); tagLattice(); lNa.show(true); lCl.show(true);
          info('<b>NaCl 결정</b>: Na⁺와 Cl⁻가 번갈아 규칙적으로 쌓여요.<br>이온 하나는 반대 전하의 이온 6개에 둘러싸여 있어요.');
        } else {
          orbit.dist = PHN ? 15 : 11; layoutForce(); info('<b>이온 결정은 잘 깨져요.</b><br>한 층이 어긋나면 같은 전하끼리 마주 보아 서로 밀어내요.');
        }
        segM.set(m);
      }
      const segM = controls.segment('', [{ value: 'transfer', label: '전자 이동' }, { value: 'lattice', label: 'NaCl 결정' }, { value: 'force', label: '힘을 가하면' }], mode, setMode);
      const ctlTr = [], ctlLat = [], ctlFor = [];
      const host = (fn) => { const before = document.querySelector('.v3-ctl').children.length; const r = fn(); const kids = [...document.querySelector('.v3-ctl').children].slice(before); return [r, kids]; };
      let [bPlay, k1] = host(() => controls.button('▶ 전자 옮기기', () => { play = true; tp = 0; })); ctlTr.push(...k1);
      let [r1, k2] = host(() => controls.range('이온 사이 벌리기', 0, 1, 0.05, 0, (v) => { spread = v; layoutLattice(); tagLattice(); })); ctlLat.push(...k2);
      let [r2, k3] = host(() => controls.range('층 수', 1, 4, 1, 4, (v) => { layers = v; layoutLattice(); }, (v) => v + '층')); ctlLat.push(...k3);
      let [r3, k4] = host(() => controls.button('힘 주기 ▶', () => { shearGo = true; shT = 0; shear = 0; })); ctlFor.push(...k4);
      let [r4, k5] = host(() => controls.button('↺ 처음으로', () => { shearGo = false; shear = 0; layoutForce(); })); ctlFor.push(...k5);
      setMode('transfer');

      let lastSc = null;
      const scMap = { atoms: 'transfer', lattice: 'lattice' };
      function syncScene() { const q = window.__sim && window.__sim.S; if (!q || q.scene === lastSc) return; lastSc = q.scene; const m = scMap[q.scene]; if (m && m !== mode) setMode(m); }
      syncScene();
      const ease = (x) => x * x * (3 - 2 * x);
      return {
        update(dt, t) {
          syncScene();
          if (mode === 'transfer') {
            if (play) { tp = Math.min(1, tp + dt / 3.2); }
            const k = ease(tp);
            NA.es.forEach((o) => { if (o === movE) return; const a = o.a0 + t * o.sp; o.e.position.set(Math.cos(a) * o.r, 0, Math.sin(a) * o.r); });
            CL.es.forEach((o) => { const a = o.a0 + t * o.sp; o.e.position.set(Math.cos(a) * o.r, 0, Math.sin(a) * o.r); });
            // 이동하는 전자: Na 바깥 껍질 → 공중 → Cl 바깥 껍질
            const a0 = movE.a0 + t * movE.sp;
            const sx = NA.g.position.x + 2.3 * Math.cos(0), cx = CL.g.position.x - 2.3;
            const px = sx + (cx - sx) * k, py = Math.sin(k * Math.PI) * 1.2;
            const p = new THREE.Vector3(px - NA.g.position.x, py, 0);
            movE.e.position.copy(p);
            movE.e.parent !== NA.g && NA.g.add(movE.e);
            // Na 껍질: 전자 잃으면 가장 바깥 껍질 사라짐 (Na⁺는 작아져요), Cl⁻는 커져요
            NA.rings[2].visible = k < 0.5; CL.rings[2].material.opacity = 0.55;
            const nsc = 1 - 0.18 * k; NA.rings.forEach((r, i) => { r.scale.setScalar(i === 2 ? 1 : nsc); });
            CL.g.scale.setScalar(1 + 0.12 * k);
            NA.g.children[0].material.color.setHex(k > 0.5 ? 0x8f5df5 : CNA); CL.g.children[0].material.color.setHex(k > 0.5 ? 0x25b673 : CCL);
            naCh.show(tp >= 1); clCh.show(tp >= 1);
            eLab.show(play && tp < 1); eLab.obj = [(px + 0) , py + 0.6, 0];
            if (tp >= 1 && play) { play = false; info('<b>이온이 생겼어요.</b><br><b>Na⁺</b>(양이온)과 <b>Cl⁻</b>(음이온)는 <b>정전기적 인력</b>으로 끌어당겨 이온 결합을 이뤄요.'); }
            const gap = 6.4 - 1.6 * k; // 이온이 되면 서로 끌려 가까워져요
            NA.g.position.x = -gap / 2; CL.g.position.x = gap / 2;
          } else if (mode === 'force') {
            if (shearGo) { shT += dt; shear = Math.min(2.2, shT * 0.6); layoutForce(); if (shear >= 2.2) shearGo = false; }
          }
        },
        sync() { syncScene(); },
      };
    },
  });
})();
