/* h1-electron-config · 3D 전자껍질 모형
   원자핵 둘레 전자껍질(2-8-8-2)에 전자를 채워 보고, 최외각 전자와 18족(안정한 배치)을 비교해요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const EL = ['', 'H 수소', 'He 헬륨', 'Li 리튬', 'Be 베릴륨', 'B 붕소', 'C 탄소', 'N 질소', 'O 산소', 'F 플루오린', 'Ne 네온', 'Na 나트륨', 'Mg 마그네슘', 'Al 알루미늄', 'Si 규소', 'P 인', 'S 황', 'Cl 염소', 'Ar 아르곤', 'K 칼륨', 'Ca 칼슘'];
  const CAP = [2, 8, 8, 2], RAD = [1.3, 2.4, 3.5, 4.6];
  const PICK = [1, 2, 6, 8, 10, 11, 17, 18];

  window.SciSim3D.attach({
    title: '전자껍질 모형 3D',
    camera: { dist: PHN ? 17 : 13, theta: 0.5, phi: 1.0, min: 6, max: 26 },
    levels: [0],
    autoRotate: 0.18,
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      const S0 = () => (window.__sim && window.__sim.S) || null;
      let Z = S0() && S0().Z ? S0().Z : 11, lastS = S0() ? S0().Z : -1, built = null;
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.4, metalness: 0.1 }, o || {}));
      const g = new THREE.Group(); root.add(g);
      const nuc = new THREE.Group(); root.add(nuc);
      const nGlow = new THREE.Mesh(new THREE.SphereGeometry(0.62, 24, 16), new THREE.MeshBasicMaterial({ color: 0xff7a5c, transparent: true, opacity: 0.16, depthWrite: false })); nuc.add(nGlow);
      const NMAX = 44, nuI = new THREE.InstancedMesh(new THREE.SphereGeometry(0.12, 16, 12), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.3, clearcoat: 0.6, emissive: 0x401010, emissiveIntensity: 0.4 }), NMAX); nuc.add(nuI);
      const nud = new THREE.Object3D(), cP = new THREE.Color(0xe0584f), cN = new THREE.Color(0x9aa5b4);
      function setNucleus(z) {
        const nn = z <= 1 ? 0 : Math.round(z * 1.08), tot = z + nn, R = 0.1 + Math.cbrt(tot) * 0.11;
        for (let i = 0; i < NMAX; i++) {
          if (i < tot) { const k = (i + 0.5) / tot, y = 1 - 2 * k, r = Math.sqrt(1 - y * y), a = i * 2.39996, rr = R * Math.cbrt(0.25 + 0.75 * ((i * 37 % 100) / 100)); nud.position.set(Math.cos(a) * r * rr, y * rr, Math.sin(a) * r * rr); nud.scale.setScalar(1); }
          else { nud.position.set(0, 0, 0); nud.scale.setScalar(0.0001); }
          nud.updateMatrix(); nuI.setMatrixAt(i, nud.matrix); nuI.setColorAt(i, (i * 7 % tot) < z ? cP : cN);
        }
        nuI.instanceMatrix.needsUpdate = true; nuI.instanceColor.needsUpdate = true; nGlow.scale.setScalar(0.5 + R * 1.0);
      }
      { const N = 140, pos = new Float32Array(N * 3); for (let i = 0; i < N; i++) { const u = Math.random() * 2 - 1, a = Math.random() * 6.283, r = 7 + Math.random() * 9, q = Math.sqrt(1 - u * u); pos[i * 3] = Math.cos(a) * q * r; pos[i * 3 + 1] = u * r; pos[i * 3 + 2] = Math.sin(a) * q * r; }
        const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); root.add(new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xbcd0ff, size: 0.08, transparent: true, opacity: 0.55, depthWrite: false }))); }
      const nlab = label('원자핵 (+)', nuc, { offset: [0, -0.95, 0] });
      const outLab = label('', [0, 0, 0], { color: 'rgba(255,211,77,.92)' }); outLab.el.style.color = '#1b2333';
      const shellMeshes = [], elecs = [], shellLabs = [];
      for (let i = 0; i < 4; i++) {
        const ring = new THREE.Group(); root.add(ring); shellMeshes.push(ring); ring.userData.tilts = i === 0 ? [[0, 0]] : [[0, 0], [0.95, 1.0], [-0.95, 2.1]];
        ring.userData.tilts.forEach((q) => { const rg = new THREE.Mesh(new THREE.TorusGeometry(RAD[i], 0.022, 10, 128), std(0x9fb4e8, { transparent: true, opacity: 0.5, roughness: 0.3, emissive: 0x2a3f7a, emissiveIntensity: 0.5 })); const gg = new THREE.Group(); rg.rotation.x = Math.PI / 2; gg.rotation.x = q[0]; const og = new THREE.Group(); og.rotation.y = q[1]; gg.add(rg); og.add(gg); ring.add(og); });
        const bubble = new THREE.Mesh(new THREE.SphereGeometry(RAD[i], 48, 32), new THREE.MeshStandardMaterial({ color: 0x6f8de8, transparent: true, opacity: 0.07, depthWrite: false, roughness: 0.2, emissive: 0x2a3f9a, emissiveIntensity: 0.35 }));
        root.add(bubble); ring.userData.bubble = bubble;
        shellLabs.push(label((i + 1) + '번째 껍질', ring, { size: 12, offset: [RAD[i] * 0.72, 0, RAD[i] * 0.72] }));
      }
      const eGeo = new THREE.SphereGeometry(0.2, 24, 16);
      const eMatIn = std(0x4aa3ff, { roughness: 0.25, emissive: 0x123a78, emissiveIntensity: 0.6 });
      const eMatOut = std(0xffd34d, { roughness: 0.25, emissive: 0x7a5a00, emissiveIntensity: 0.7 });
      function cfg(z) { const c = [0, 0, 0, 0]; let r = z; for (let i = 0; i < 4; i++) { const f = Math.min(CAP[i], r); c[i] = f; r -= f; } return c; }
      let buildMode = false, lastKey = '';
      function rebuild(cOver, zOver) {
        elecs.forEach((e) => root.remove(e.m)); elecs.length = 0;
        const c = cOver || cfg(zOver || Z), tc = cfg(zOver || Z); let outer = -1, outerT = 0;
        tc.forEach((n, i) => { if (n > 0) outerT = i; }); c.forEach((n, i) => { if (n > 0) outer = i; });
        for (let i = 0; i < 4; i++) {
          const on = tc[i] > 0;
          shellMeshes[i].visible = on; shellMeshes[i].userData.bubble.visible = on; shellLabs[i].show(on);
          for (let k = 0; k < c[i]; k++) {
            const m = new THREE.Mesh(eGeo, i === outer ? eMatOut : eMatIn); root.add(m);
            const hl = new THREE.Mesh(eGeo, new THREE.MeshBasicMaterial({ color: i === outer ? 0xffe08a : 0x7cc0ff, transparent: true, opacity: 0.22, depthWrite: false })); hl.scale.setScalar(1.9); m.add(hl);
            const rr = i === 0 ? 0 : k % 3, tl = shellMeshes[i].userData.tilts[rr];
            elecs.push({ m, sh: i, a0: (k / c[i]) * Math.PI * 2 + i * 0.7, sp: (0.9 - i * 0.18) * (rr === 1 ? -1 : 1), tilt: tl[0], yaw: tl[1] });
          }
        }
        built = c; setNucleus(zOver || Z);
        orbit.dist = (PHN ? 6.2 : 5.0) + RAD[outerT] * (PHN ? 2.5 : 2.1);
        if (outer < 0) { outLab.show(false); } else outLab.show(true);
        const zz = zOver || Z;
        const full = outer >= 0 && c[outer] === CAP[outer];
        const name = EL[zz].split(' ');
        const ve = outer >= 0 ? c[outer] : 0;
        if (outer < 0) outer = 0;
        outLab.set('최외각 전자 ' + ve + '개'); outLab.obj = [0, RAD[outer] + 0.5, 0];
        if (cOver) {
          const have = c.reduce((a, b) => a + b, 0);
          info('<b>내가 만드는 전자 배치</b> · ' + name[1] + '(' + name[0] + ') 원자번호 ' + zz + '<br>지금 배치 <b>' + (c.filter((x) => x > 0).join('-') || '없음') + '</b> · 남은 전자 ' + (zz - have) + '개<br>안쪽 껍질부터 가득 채워요.');
        } else info('<b>' + name[1] + '(' + name[0] + ')</b> · 원자번호 ' + Z + '<br>전자 배치 <b>' + c.filter((x) => x > 0).join('-') + '</b><br>' +
          (full ? '<span style="color:#ffd34d">최외각 껍질이 가득 차 안정해요 (18족).</span>' : (ve <= 3 && Z > 2 ? '전자 ' + ve + '개를 잃으면 안정해져요.' : (Z === 1 ? '전자 1개를 더 얻거나 공유하면 헬륨처럼 안정해요.' : '전자 ' + (CAP[outer] - ve) + '개가 더 있으면 안정해져요.'))));
        seg && seg.set(PICK.indexOf(zz) >= 0 ? zz : -1);
        rng && rng.set(zz);
      }
      const ctlEl = document.querySelector('.v3-ctl'); const viewCtl = [];
      const n0 = ctlEl ? ctlEl.children.length : 0;
      const setZ2D = (v) => { Z = v; const L = window.__sim; if (L && L.setZ) L.setZ(v); lastS = Z; rebuild(); };
      let seg = controls.segment('원소', PICK.map((z) => ({ value: z, label: EL[z].split(' ')[0] })), Z, setZ2D);
      let rng = controls.range('원자번호', 1, 20, 1, Z, setZ2D, (v) => v);
      const shellOf = (z) => (z <= 2 ? 0 : z <= 10 ? 1 : z <= 18 ? 2 : 3);
      const pl = controls.player({
        duration: 12, loop: true, autoplay: false, label: '전자 채우기',
        phases: [[0, '첫 번째 껍질 (최대 2개)'], [0.075, '두 번째 껍질 (최대 8개)'], [0.475, '세 번째 껍질 (최대 8개)'], [0.875, '네 번째 껍질']],
        onFrame(p) { const z = Math.min(20, 1 + Math.floor(p * 20)); if (z !== Z && !buildMode) setZ2D(z); },
      });
      if (ctlEl) for (let i = n0; i < ctlEl.children.length; i++) viewCtl.push(ctlEl.children[i]);
      rebuild();
      return {
        update(dt, t) {
          const s = S0();
          if (s) {
            const bm = s.mode === 'atom' && s.sub === 'build';
            if (bm !== buildMode) { buildMode = bm; viewCtl.forEach((e) => { e.style.display = bm ? 'none' : ''; }); if (bm) pl.pause(); lastKey = ''; }
            if (bm) { const key = 'b' + s.build.target + s.build.counts.join(','); if (key !== lastKey) { lastKey = key; rebuild(s.build.counts.slice(), s.build.target); } }
            else if (s.Z !== lastS || lastKey !== 'v') { const ext = s.Z !== lastS && lastKey === 'v'; lastKey = 'v'; lastS = s.Z; if (s.Z >= 1 && s.Z <= 20) { Z = s.Z; rebuild(); if (ext && pl.playing) pl.pause(); } }   // 옆의 −/+·슬라이더로 바꾸면 ▶ 재생을 멈추고 그 원소를 보여 줘요
          }
          elecs.forEach((e) => { const a = e.a0 + t * e.sp, x = Math.cos(a) * RAD[e.sh], z0 = Math.sin(a) * RAD[e.sh], ct = Math.cos(e.tilt), st = Math.sin(e.tilt), y1 = -st * z0, z1 = ct * z0, cy = Math.cos(e.yaw), sy = Math.sin(e.yaw); e.m.position.set(x * cy + z1 * sy, y1, -x * sy + z1 * cy); });
          nuc.scale.setScalar(1 + Math.sin(t * 2) * 0.03);
        },
        sync() { lastKey = ''; },
      };
    },
  });
})();
