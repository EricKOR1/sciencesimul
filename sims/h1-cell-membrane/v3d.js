/* h1-cell-membrane · 3D 세포막 (인지질 이중층 + 단백질 통로)
   작은 입자는 막을 직접 통과하고, 이온은 단백질 통로로만, 큰 입자는 통과하지 못해요.
   입자는 많은 쪽에서 적은 쪽으로 퍼져 나가요(확산). */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const XW = 5.2, ZW = 3.0, YH = 3.4, MT = 0.62; // 막 반너비, 막 깊이, 위아래 높이, 막 반두께
  const TYPES = {
    o2: { n: '산소 (작은 입자)', c: 0x4aa3ff, r: 0.14, pass: 'free', num: 34 },
    ion: { n: '이온', c: 0xb26bff, r: 0.19, pass: 'channel', num: 28 },
    big: { n: '단백질·녹말 (큰 입자)', c: 0xe0a458, r: 0.36, pass: 'none', num: 8 },
  };
  const CH = { x: -1.6, z: 0.4 };

  window.SciSim3D.attach({
    title: '세포막 입자 모형 3D',
    camera: { dist: PHN ? 17 : 12.5, theta: 0.45, phi: 1.28, target: [0, 0, 0], min: 6, max: 24 },
    autoRotate: 0.0,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.45, metalness: 0.05 }, o || {}));
      const dm = new THREE.Object3D();
      let show = { o2: true, ion: true, big: true }, paused = false;
      /* ---------- 인지질 이중층 ---------- */
      const SP = 0.4, nx = Math.floor(XW * 2 / SP), nz = Math.floor(ZW * 2 / SP), lip = [];
      for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) {
        const x = -XW + (i + 0.5) * SP + (k % 2 ? SP / 2 : 0) - SP / 4, z = -ZW + (k + 0.5) * SP;
        if (Math.hypot(x - CH.x, z - CH.z) < 0.85) continue;     // 단백질 통로 자리
        if (Math.abs(x) > XW - 0.1) continue;
        lip.push([x, z]);
      }
      const NL = lip.length * 2;
      const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.17, 18, 14), std(0xffc857, { roughness: 0.35 }), NL), tails = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.035, 0.035, MT * 0.92, 8), std(0xf6e6b4, { roughness: 0.6 }), NL * 2);
      root.add(heads, tails);
      const mem = new THREE.Group(); root.add(mem);
      const wob = lip.map(() => [Math.random() * 6, Math.random() * 6]);
      function layoutLipids(t) {
        let h = 0, tl = 0;
        for (let up = 0; up < 2; up++) {
          const sgn = up ? 1 : -1;
          lip.forEach((p, i) => {
            const w = wob[i], dx = Math.sin(t * 1.3 + w[0]) * 0.02, dz = Math.cos(t * 1.1 + w[1]) * 0.02, dy = Math.sin(t * 1.7 + w[0] * 2) * 0.02;
            dm.position.set(p[0] + dx, sgn * (MT + 0.02) + dy, p[1] + dz); dm.scale.setScalar(1); dm.rotation.set(0, 0, 0); dm.updateMatrix(); heads.setMatrixAt(h++, dm.matrix);
            for (let q = 0; q < 2; q++) { dm.position.set(p[0] + dx + (q ? 0.07 : -0.07), sgn * (MT / 2 + 0.0) + dy * 0.5, p[1] + dz); dm.updateMatrix(); tails.setMatrixAt(tl++, dm.matrix); }
          });
        }
        heads.instanceMatrix.needsUpdate = tails.instanceMatrix.needsUpdate = true;
      }
      /* ---------- 단백질 통로 ---------- */
      const prof = [[0.27, -MT - 0.18], [0.5, -MT - 0.18], [0.62, -MT * 0.4], [0.62, MT * 0.4], [0.5, MT + 0.18], [0.27, MT + 0.18], [0.36, 0], [0.27, -MT - 0.18]].map((p) => new THREE.Vector2(p[0], p[1]));
      const chan = new THREE.Mesh(new THREE.LatheGeometry(prof, 40), std(0x8a5cf5, { roughness: 0.35, side: THREE.DoubleSide, emissive: 0x2a1470, emissiveIntensity: 0.4 }));
      chan.position.set(CH.x, 0, CH.z); mem.add(chan);
      label('단백질 통로', chan, { offset: [0, MT + 0.7, 0], size: 12, color: 'rgba(110,60,220,.92)' });
      label('인지질 이중층', [XW - 1.2, 0, ZW], { size: 12, color: 'rgba(160,110,10,.92)' });
      label('세포 밖 (입자 많음)', [-XW + 1.6, YH - 0.4, 0], { size: 12 }); label('세포 안', [-XW + 0.9, -YH + 0.4, 0], { size: 12 });
      /* ---------- 입자 ---------- */
      const P = []; const meshes = {};
      Object.keys(TYPES).forEach((k) => {
        const T = TYPES[k]; meshes[k] = new THREE.InstancedMesh(new THREE.SphereGeometry(T.r, 18, 14), std(T.c, { roughness: 0.25, emissive: T.c, emissiveIntensity: 0.25 }), T.num); root.add(meshes[k]);
      });
      function reset() {
        P.length = 0;
        Object.keys(TYPES).forEach((k) => { const T = TYPES[k]; for (let i = 0; i < T.num; i++) {
          const out = i < T.num * 0.9;  // 처음에는 세포 밖에 대부분
          P.push({ k, i, x: (Math.random() * 2 - 1) * (XW - 0.3), y: out ? MT + 0.3 + Math.random() * (YH - MT - 0.6) : -(MT + 0.3 + Math.random() * (YH - MT - 0.6)), z: (Math.random() * 2 - 1) * (ZW - 0.3), vx: 0, vy: 0, vz: 0 });
        } });
      }
      reset();
      const sdr = () => (Math.random() - 0.5);
      const counts = {};
      function step(dt) {
        Object.keys(TYPES).forEach((k) => { counts[k] = [0, 0]; });
        for (const p of P) {
          const T = TYPES[p.k]; const sp = p.k === 'big' ? 1.3 : 2.2;
          p.vx = p.vx * 0.9 + sdr() * sp * 0.9; p.vy = p.vy * 0.9 + sdr() * sp * 0.9; p.vz = p.vz * 0.9 + sdr() * sp * 0.9;
          let nx2 = p.x + p.vx * dt, ny = p.y + p.vy * dt, nz = p.z + p.vz * dt;
          if (Math.abs(nx2) > XW - T.r) { nx2 = Math.sign(nx2) * (XW - T.r); p.vx *= -1; }
          if (Math.abs(nz) > ZW - T.r) { nz = Math.sign(nz) * (ZW - T.r); p.vz *= -1; }
          if (Math.abs(ny) > YH - T.r) { ny = Math.sign(ny) * (YH - T.r); p.vy *= -1; }
          // 막 영역을 지나려는지
          const inM = (y) => Math.abs(y) < MT + 0.22 + T.r * 0.6;
          if (inM(ny) && !inM(p.y)) {
            const dch = Math.hypot(nx2 - CH.x, nz - CH.z);
            const ok = T.pass === 'free' || (T.pass === 'channel' && dch < 0.22);
            if (!ok) { ny = p.y; p.vy *= -1; }
          } else if (inM(ny) && inM(p.y)) {
            // 막 속에서는 계속 지나가도록 y 방향을 유지
            if (T.pass === 'channel') { const dch = Math.hypot(nx2 - CH.x, nz - CH.z); if (dch > 0.3) { const toX = CH.x - nx2, toZ = CH.z - nz; nx2 += toX * 0.2; nz += toZ * 0.2; } }
          }
          p.x = nx2; p.y = ny; p.z = nz;
          counts[p.k][p.y > 0 ? 0 : 1]++;
        }
      }
      function paint() {
        const idx = {}; 
        for (const p of P) { const m = meshes[p.k]; const i = idx[p.k] = (idx[p.k] || 0); idx[p.k]++;
          dm.position.set(p.x, p.y, p.z); dm.scale.setScalar(show[p.k] ? 1 : 0.0001); dm.rotation.set(0, 0, 0); dm.updateMatrix(); m.setMatrixAt(i, dm.matrix); }
        Object.values(meshes).forEach((m) => { m.instanceMatrix.needsUpdate = true; });
      }
      function updInfo() {
        info('<b>' + (show.o2 && show.ion && show.big ? '입자 3종' : '고른 입자') + '</b> (바깥 / 안)<br>' +
          Object.keys(TYPES).filter((k) => show[k]).map((k) => TYPES[k].n.split(' ')[0] + ' ' + counts[k][0] + ' / ' + counts[k][1]).join(' · ') +
          '<br>많은 쪽에서 적은 쪽으로 퍼져요 (확산).');
      }
      const tog = (k, lab) => { const b = controls.button(lab + ' ✓', () => { show[k] = !show[k]; b.classList.toggle('on', show[k]); b.textContent = lab + (show[k] ? ' ✓' : ' ✕'); paint(); }); b.classList.add('on'); return b; };
      tog('o2', '산소'); tog('ion', '이온'); tog('big', '단백질·녹말');
      controls.button('↺ 다시 시작', () => { reset(); });
      layoutLipids(0); let acc = 0;
      return {
        update(dt, t) {
          if (!paused) { step(dt); } layoutLipids(t); paint();
          acc += dt; if (acc > 0.4) { acc = 0; updInfo(); }
        },
        sync() {},
      };
    },
  });
})();
