/* hb-quadrat · 3D 초지와 방형구법 조사
   입체 초지(10 m × 6 m)에 방형구(1 m × 1 m)를 무작위로 던져 식물의 개체 수를 세고, 밀도와 빈도를 구해 봐요.
   눈에 띄는 곳만 골라 조사하면 결과가 치우치는(편향) 까닭도 비교해요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const narrow = window.innerWidth < 600 || window.innerHeight > window.innerWidth * 1.1;
  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  const W = 10, H = 6;      // 초지 크기 (1 = 1 m)
  const SP = [{ n: '토끼풀', tag: '#22a04a' }, { n: '질경이', tag: '#d97706' }, { n: '쑥', tag: '#7c3aed' }, { n: '강아지풀', tag: '#0ea5e9' }];
  const QCOL = [0xff5a5a, 0x3b82f6, 0xf59e0b, 0xa855f7, 0x14b8a6, 0xec4899];

  window.SciSim3D.attach({
    title: '초지와 방형구 조사 3D',
    hint: '방형구를 던져 식물을 세어 보세요 · 드래그: 돌리기',
    camera: { dist: narrow ? 13 : 9.5, theta: 0.15, phi: 0.95, min: 2.5, max: 20, target: [0, 0, 0] },
    autoRotate: 0,
    levels: [0],
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      const V3 = (x, y, z) => new THREE.Vector3(x, y, z || 0);
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.7, metalness: 0.0 }, o || {}));
      const R = rng(77), D = new THREE.Object3D();
      const hgt = (x, z) => 0.22 * Math.sin(x * 0.55) * Math.cos(z * 0.5) + 0.12 * Math.sin(x * 1.1 + z * 0.8);

      /* 땅 */
      const gg = new THREE.PlaneGeometry(W, H, 80, 48); gg.rotateX(-Math.PI / 2);
      const p = gg.attributes.position, col = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, hgt(x, z)); const n = 0.5 + 0.5 * Math.sin(x * 2.3) * Math.sin(z * 2.1 + 1) + 0.15 * Math.sin(x * 7 + z * 5); const c = new THREE.Color().setHSL(0.27 + 0.03 * n, 0.5, 0.26 + 0.05 * n); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
      gg.setAttribute('color', new THREE.BufferAttribute(col, 3)); gg.computeVertexNormals();
      const ground = new THREE.Mesh(gg, std(0xffffff, { vertexColors: true, roughness: 0.95 })); ground.receiveShadow = true; root.add(ground);
      const soil = new THREE.Mesh(new THREE.BoxGeometry(W + 0.02, 0.9, H + 0.02), std(0x5a3b22, { roughness: 1 })); soil.position.y = -0.75; root.add(soil);

      /* 식물 분포 : 종마다 모여 자라는 곳이 달라요 */
      const SPEC = [
        { n: 170, clusters: [[-3, -1, 1.6], [0.5, 1.5, 1.4], [3, -0.5, 1.2]], uni: 0.3 },     // 토끼풀
        { n: 60, clusters: [[-1, -1.5, 2.5], [2, 1.5, 2.2]], uni: 0.6 },                       // 질경이
        { n: 30, clusters: [[3.5, 1.4, 0.7], [-0.5, 2.2, 0.6]], uni: 0.15 },                   // 쑥 (몇 곳에 모여요)
        { n: 320, clusters: [[-3.2, 0.5, 2.0], [-0.5, -0.5, 2.0], [1.5, 0.5, 1.8], [3.5, -1.5, 1.2]], uni: 0.3 }, // 강아지풀
      ];
      const plants = SPEC.map((s) => {
        const list = [];
        while (list.length < s.n) {
          let x, z;
          if (R() < s.uni) { x = (R() - 0.5) * (W - 0.4); z = (R() - 0.5) * (H - 0.4); }
          else { const c = s.clusters[Math.floor(R() * s.clusters.length)]; const a = R() * 6.283, r = Math.sqrt(-2 * Math.log(Math.max(1e-6, R()))) * c[2] * 0.55; x = c[0] + Math.cos(a) * r; z = c[1] + Math.sin(a) * r; }
          if (Math.abs(x) > W / 2 - 0.15 || Math.abs(z) > H / 2 - 0.15) continue;
          list.push({ x, z, s: 0.8 + R() * 0.5, r: R() * 6.28 });
        }
        return list;
      });
      /* 식물 모양 (부품마다 InstancedMesh 한 개) */
      const mats = []; const partsBySp = SPEC.map(() => []);
      function part(sp, geo, color, local, o) {
        const m = std(color, Object.assign({ roughness: 0.6 }, o || {})); mats.push([sp, m]);
        const im = new THREE.InstancedMesh(geo, m, plants[sp].length); im.castShadow = true;
        plants[sp].forEach((pl, i) => { D.position.set(pl.x, hgt(pl.x, pl.z), pl.z); D.rotation.set(0, pl.r, 0); D.scale.setScalar(pl.s); D.updateMatrix(); const base = D.matrix.clone(); const lm = new THREE.Matrix4().compose(local.p, new THREE.Quaternion().setFromEuler(new THREE.Euler(local.r ? local.r[0] : 0, local.r ? local.r[1] : 0, local.r ? local.r[2] : 0)), local.s || V3(1, 1, 1)); im.setMatrixAt(i, base.multiply(lm)); });
        root.add(im); partsBySp[sp].push(im); return im;
      }
      const sphere = new THREE.SphereGeometry(1, 10, 8), cyl = new THREE.CylinderGeometry(1, 1, 1, 6), cone = new THREE.ConeGeometry(1, 1, 5);
      // 토끼풀: 잎 + 줄기 + 흰 꽃
      part(0, sphere, 0x2fae4a, { p: V3(0, 0.06, 0), s: V3(0.13, 0.035, 0.13) }); part(0, sphere, 0x2fae4a, { p: V3(0.08, 0.1, 0.04), s: V3(0.08, 0.03, 0.08) }); part(0, sphere, 0xfff4f8, { p: V3(0, 0.2, 0), s: V3(0.055, 0.055, 0.055) });
      // 질경이: 로제트 잎 두 장 + 이삭
      part(1, sphere, 0x6f9a2c, { p: V3(0.06, 0.04, 0), s: V3(0.2, 0.03, 0.08) }); part(1, sphere, 0x6f9a2c, { p: V3(0, 0.04, 0.06), s: V3(0.08, 0.03, 0.2) }); part(1, cyl, 0x8a5a2a, { p: V3(0, 0.2, 0), s: V3(0.012, 0.4, 0.012) });
      // 쑥: 회녹색 덤불
      part(2, sphere, 0x7a9f72, { p: V3(0, 0.2, 0), s: V3(0.17, 0.22, 0.17) }); part(2, sphere, 0x9ab88f, { p: V3(0.06, 0.34, 0.03), s: V3(0.09, 0.1, 0.09) });
      // 강아지풀: 잎 세 장 + 이삭
      part(3, cone, 0x6bb04a, { p: V3(0.03, 0.14, 0), s: V3(0.04, 0.3, 0.04), r: [0, 0, -0.25] }); part(3, cone, 0x6bb04a, { p: V3(-0.03, 0.14, 0.02), s: V3(0.04, 0.3, 0.04), r: [0.2, 0, 0.25] }); part(3, cyl, 0xc6cc55, { p: V3(0, 0.3, 0), s: V3(0.03, 0.18, 0.03), r: [0.15, 0, 0.2] });

      /* 방형구 */
      const labPool = Array.from({ length: 6 }, () => { const l = label('', null, { size: 13 }); l.show(false); return l; });
      const quads = [], qgroup = new THREE.Group(); root.add(qgroup);
      function countIn(q) { return plants.map((list) => list.reduce((n, pl) => n + (Math.abs(pl.x - q.x) < 0.5 && Math.abs(pl.z - q.z) < 0.5 ? 1 : 0), 0)); }
      function place(biased) {
        if (quads.length >= 6) { clearQ(); }
        let x, z, tries = 0;
        do { if (biased) { x = -3.8 + R() * 3.6; z = -1.0 + R() * 2.0; } else { x = (R() - 0.5) * (W - 1.2); z = (R() - 0.5) * (H - 1.2); } tries++; }
        while (tries < 40 && quads.some((q) => Math.abs(q.x - x) < 1.1 && Math.abs(q.z - z) < 1.1));
        const idx = quads.length, c = QCOL[idx % QCOL.length];
        const g = new THREE.Group(), fm = std(c, { roughness: 0.4, emissive: c, emissiveIntensity: 0.25 }), sm = std(0xffffff, { roughness: 0.5, transparent: true, opacity: 0.8 });
        const hs = [[-.5, -.5], [.5, -.5], [.5, .5], [-.5, .5]].map(([a, b]) => hgt(x + a, z + b)), top = Math.max(hgt(x, z), ...hs) + 0.14;
        [[0, -0.5, 1], [0, 0.5, 1], [-0.5, 0, 0], [0.5, 0, 0]].forEach(([a, b, h]) => { const e = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.05, 8), fm); e.position.set(a, top, b); if (h) e.rotation.z = Math.PI / 2; else e.rotation.x = Math.PI / 2; g.add(e); });
        [-0.25, 0, 0.25].forEach((o) => { [0, 1].forEach((d) => { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 1, 5), sm); s.position.set(d ? o : 0, top, d ? 0 : o); if (d) s.rotation.x = Math.PI / 2; else s.rotation.z = Math.PI / 2; g.add(s); }); });
        [[-.5, -.5], [.5, -.5], [.5, .5], [-.5, .5]].forEach(([a, b], k) => { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.02, top - hs[k] + 0.05, 6), fm); st.position.set(a, (top + hs[k]) / 2, b); g.add(st); });
        g.position.set(x, 0, z); g.userData.t = 0; qgroup.add(g);
        const q = { x, z, g, c, cnt: countIn({ x, z }), lab: null };
        const n = q.cnt.reduce((a, b) => a + b, 0);
        q.lab = labPool[idx % 6]; q.lab.obj = g; q.lab.off = [0, top + 0.45, 0]; q.lab.set((idx + 1) + '번 · ' + n + '개체'); q.lab.el.style.background = 'rgba(' + [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',') + ',.92)'; q.lab.show(true);
        quads.push(q); refreshInfo();
      }
      function clearQ() { quads.forEach((q) => { qgroup.remove(q.g); q.lab.show(false); }); quads.length = 0; refreshInfo(); }
      let biased = false, sel = 3, zoomed = false;
      const trueD = SPEC.map((s) => s.n / (W * H));
      function refreshInfo() {
        const s = SP[sel], n = quads.length;
        if (!n) { info('<b>방형구 던지기</b>를 눌러 초지에 1 m × 1 m 방형구를 놓아 보세요.<br>' + (biased ? '눈에 띄는 곳만 고르면 결과가 치우쳐요(편향).' : '무작위로 놓아야 치우침이 줄어요.')); return; }
        const tot = quads.reduce((a, q) => a + q.cnt[sel], 0), occ = quads.filter((q) => q.cnt[sel] > 0).length;
        info('<b>' + s.n + '</b>: 방형구 ' + n + '개(' + n + ' m²)에서 ' + tot + '개체 → 밀도 <b>' + (tot / n).toFixed(1) + '</b>개체/m²<br>출현한 방형구 ' + occ + '/' + n + ' → 빈도 <b>' + Math.round(occ / n * 100) + '%</b><br>초지 전체의 실제 밀도: ' + trueD[sel].toFixed(1) + '개체/m²');
      }
      controls.segment('식물', SP.map((s, i) => ({ label: s.n, value: i })), 3, (v) => { sel = v; mats.forEach(([sp, m]) => { m.emissive.set(sp === v ? 0xffe14d : 0x000000); m.emissiveIntensity = sp === v ? 0.45 : 0; }); refreshInfo(); });
      controls.segment('위치', [{ label: '무작위', value: false }, { label: '눈에 띄는 곳(편향)', value: true }], false, (v) => { biased = v; clearQ(); });
      controls.button('＋ 방형구 던지기', () => { place(biased); });
      controls.button('지우기', clearQ);
      const zb = controls.button('🔍 방형구 확대', () => {
        zoomed = !zoomed; zb.classList.toggle('on', zoomed); zb.textContent = zoomed ? '🔍 초지 전체' : '🔍 방형구 확대';
        if (zoomed && quads.length) { const q = quads[quads.length - 1]; orbit.tx = q.x; orbit.tz = q.z; orbit.ty = 0.1; orbit.dist = 3.2; orbit.phi = 0.9; }
        else { zoomed = false; orbit.tx = 0; orbit.tz = 0; orbit.ty = 0; orbit.dist = narrow ? 13 : 9.5; orbit.phi = 0.95; zb.textContent = '🔍 방형구 확대'; zb.classList.remove('on'); }
      });
      mats.forEach(([sp, m]) => { m.emissive.set(sp === 3 ? 0xffe14d : 0x000000); m.emissiveIntensity = sp === 3 ? 0.45 : 0; });
      refreshInfo();
      label('초지 (10 m × 6 m)', [0, 0.2, -H / 2 - 0.2], { color: 'rgba(30,110,50,.9)' });
      place(false);
      return {
        update(dt) {
          quads.forEach((q) => { q.g.userData.t = Math.min(1, q.g.userData.t + dt * 1.6); const u = q.g.userData.t, y = u < 1 ? (1 - u) * (1 - u) * 2.5 * Math.abs(Math.cos(u * 5)) : 0; q.g.position.y = y; });
        },
        sync() {},
      };
    },
  });
})();
