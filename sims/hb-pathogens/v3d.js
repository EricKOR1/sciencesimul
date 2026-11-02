/* hb-pathogens · 3D 병원체 5종 (바이러스 · 세균 · 곰팡이 · 원생생물 · 기생충)
   병원체마다 구조가 어떻게 다른지(세포 구조 유무, 핵의 유무, 다세포 여부) 돌려 보며 비교해요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const narrow = window.innerWidth < 600 || window.innerHeight > window.innerWidth * 1.1;
  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  const KINDS = [
    { k: '바이러스', info: '<b>바이러스</b>(독감): 세포 구조가 없어요. 단백질 껍질과 유전 물질뿐이고, 살아 있는 숙주 세포 안에서만 증식해요.' },
    { k: '세균', info: '<b>세균</b>(식중독균·결핵균): 핵막이 없는 원핵생물이에요. 세포벽이 있고 스스로 분열해 증식해요.' },
    { k: '곰팡이', info: '<b>곰팡이</b>(무좀균): 핵이 있는 진핵생물이에요. 균사와 포자로 번식하고 다른 생물에서 양분을 얻어요.' },
    { k: '원생생물', info: '<b>원생생물</b>(말라리아 원충): 핵이 있는 단세포 진핵생물이에요. 적혈구 안에서 자라요.' },
    { k: '기생충', info: '<b>기생충</b>(회충): 소화관 등 기관이 있는 다세포 동물이에요. 알로 퍼지고 몸속에 살아요.' },
  ];

  window.SciSim3D.attach({
    title: '병원체 5종 3D 비교',
    hint: '병원체를 골라 돌려 보세요 · 구조와 크기가 달라요',
    camera: { dist: narrow ? 13 : 9.5, theta: 0.6, phi: 1.15, min: 4.5, max: 20 },
    autoRotate: 0.25,
    levels: [0],
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = (x, y, z) => new THREE.Vector3(x, y, z || 0);
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.45, metalness: 0.03 }, o || {}));
      const ghost = (c, op, o) => std(c, Object.assign({ transparent: true, opacity: op, depthWrite: false, roughness: 0.2, side: THREE.DoubleSide }, o || {}));
      const sph = (r, m, x, y, z, sx, sy, sz) => { const o = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 20), m); o.position.set(x || 0, y || 0, z || 0); if (sx) o.scale.set(sx, sy, sz); return o; };
      const tubeG = (pts, r, seg, closed) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, closed || false), seg || 60, r, 8, closed || false);
      const groups = [], labs = [], R = rng(21), D = new THREE.Object3D();
      const mk = (i) => { const g = new THREE.Group(); g.visible = false; root.add(g); groups[i] = g; labs[i] = []; return g; };
      const lab = (i, text, obj, o) => { const l = label(text, obj, o); l.show(false); labs[i].push(l); return l; };
      const fib = (n) => Array.from({ length: n }, (_, i) => { const y = 1 - (i + 0.5) * 2 / n, r = Math.sqrt(1 - y * y), a = i * 2.39996; return V3(Math.cos(a) * r, y, Math.sin(a) * r); });
      let anim = [];

      /* 0 바이러스 */
      { const g = mk(0);
        const cap = new THREE.Mesh(new THREE.IcosahedronGeometry(1.25, 1), std(0x4a8ae8, { roughness: 0.35, flatShading: true })); g.add(cap);
        g.add(sph(1.85, ghost(0xff9ec7, 0.3, { roughness: 0.15 }), 0, 0, 0));
        const rna = std(0xffd34d, { emissive: 0x7a5a00, emissiveIntensity: 0.4 });
        for (let k = 0; k < 6; k++) { const pts = []; const a0 = R() * 6, a1 = R() * 6; for (let i = 0; i < 12; i++) { const u = i / 11; pts.push(V3(Math.sin(u * 6 + a0) * 0.55 + (R() - 0.5) * 0.1, (u - 0.5) * 1.3, Math.cos(u * 5 + a1) * 0.55)); } const m = new THREE.Mesh(tubeG(pts, 0.05, 50), rna); m.rotation.set(k * 0.9, k * 1.3, k * 0.5); m.scale.setScalar(0.75); g.add(m); }
        const hM = std(0xff6a3d, { roughness: 0.4 }), nM = std(0x34c27a, { roughness: 0.4 });
        const sp = fib(42), spikes = [];
        sp.forEach((d, i) => { const m = i % 4 === 3 ? nM : hM, s = new THREE.Group(); const st = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.4, 8), m); st.position.y = 0.2; const tip = i % 4 === 3 ? new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 8), m) : new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.22, 12), m); tip.position.y = 0.5; if (i % 4 !== 3) tip.rotation.x = Math.PI; s.add(st, tip); s.position.copy(d.clone().multiplyScalar(1.82)); s.quaternion.setFromUnitVectors(V3(0, 1, 0), d); g.add(s); spikes.push(s); });
        g.userData.base = 1.3;
        lab(0, '돌기 단백질(항원)', spikes[0], { offset: [0.2, 0.4, 0] }); lab(0, '단백질 껍질', cap, { offset: [0.6, -0.5, 0.9] }); lab(0, '유전 물질', g, { offset: [0, 0.1, 0.4] });
        g.userData.spin = true; }
      /* 1 세균 */
      { const g = mk(1), bact = new THREE.Group(); g.add(bact);
        const wall = new THREE.Mesh(new THREE.CapsuleGeometry(0.95, 2.6, 12, 36), ghost(0x7bd88f, 0.3)); wall.rotation.z = Math.PI / 2; bact.add(wall);
        const wall2 = new THREE.Mesh(new THREE.CapsuleGeometry(0.82, 2.55, 12, 36), ghost(0x4bb86a, 0.25)); wall2.rotation.z = Math.PI / 2; bact.add(wall2);
        const pts = []; for (let i = 0; i <= 160; i++) { const a = i / 160 * Math.PI * 2; pts.push(V3(Math.cos(a * 3) * 0.9 + Math.cos(a) * 0.35, Math.sin(a * 2) * 0.35 + Math.sin(a * 5) * 0.12, Math.sin(a * 3) * 0.4 + Math.sin(a) * 0.15)); }
        const dna = new THREE.Mesh(tubeG(pts, 0.055, 240, true), std(0xffd34d, { emissive: 0x7a5a00, emissiveIntensity: 0.4 })); bact.add(dna);
        const plas = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.035, 8, 20), std(0xff7ac8)); plas.position.set(1.0, -0.35, 0.3); bact.add(plas);
        const rib = new THREE.InstancedMesh(new THREE.SphereGeometry(0.055, 8, 6), std(0xe6edf7), 70); for (let i = 0; i < 70; i++) { let x, y, z; do { x = (R() - 0.5) * 3.0; y = (R() - 0.5) * 1.4; z = (R() - 0.5) * 1.4; } while (y * y + z * z > 0.5 || Math.abs(x) > 1.25 + 0.0 || (Math.abs(x) < 0.9 && y * y + z * z < 0.12)); D.position.set(x, y, z); D.scale.setScalar(1); D.updateMatrix(); rib.setMatrixAt(i, D.matrix); } bact.add(rib);
        const fm = std(0x2f9e6c, { roughness: 0.5 }), fl = [];
        for (let k = 0; k < 6; k++) { const pts2 = []; const a = k * 1.05, off = (R() - 0.5) * 0.3; for (let i = 0; i < 24; i++) { const u = i / 23; pts2.push(V3(-1.35 - u * 2.4, Math.sin(u * 11 + k) * 0.17 * u + Math.sin(a) * 0.45 * (1 - u * 0.5), Math.cos(u * 11 + k) * 0.17 * u + Math.cos(a) * 0.45 * (1 - u * 0.5))); } const f = new THREE.Mesh(tubeG(pts2, 0.03, 60), fm); bact.add(f); fl.push(f); }
        for (let k = 0; k < 24; k++) { const d = V3(R() - 0.5, (R() - 0.5) * 1.6, (R() - 0.5) * 1.6).normalize(); if (Math.abs(d.x) > 0.7) continue; const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.35, 5), fm); pl.position.set(d.x * 1.1 + (R() - 0.5) * 2, d.y * 0.9, d.z * 0.9); pl.quaternion.setFromUnitVectors(V3(0, 1, 0), V3(d.x * 0.3, d.y, d.z).normalize()); pl.position.y = d.y * 1.05; pl.position.z = d.z * 1.05; bact.add(pl); }
        bact.scale.setScalar(1.5);
        lab(1, '세포벽', bact, { offset: [0.3, 1.3, 0] }); lab(1, '원형 DNA (핵막 없음)', dna, { offset: [0, -1.4, 0.6] }); lab(1, '편모', fl[0], { offset: [-0.5, 0.7, 0.4] });
        g.userData.swim = bact; }
      /* 2 곰팡이 */
      let rootTube = null, firstSpore = null;
      { const g = mk(2), hm = std(0xe8dcb5, { roughness: 0.55 }), hg = ghost(0xe8dcb5, 0.5, { roughness: 0.3 }), nm = std(0x7a4fb0), ns = [];
        function branch(p, d, len, rad, depth) {
          const pts = [p.clone()]; let q = p.clone(), dir = d.clone();
          for (let i = 0; i < 5; i++) { dir.add(V3((R() - 0.5) * 0.5, (R() - 0.5) * 0.4, (R() - 0.5) * 0.5)).normalize(); q = q.clone().add(dir.clone().multiplyScalar(len / 5)); pts.push(q.clone()); }
          { const hm2 = new THREE.Mesh(tubeG(pts, rad, 30), hg); g.add(hm2); if (!rootTube) rootTube = hm2; }
          for (let i = 1; i < pts.length; i++) { const sp = new THREE.Mesh(new THREE.TorusGeometry(rad, rad * 0.18, 6, 14), hm); sp.position.copy(pts[i]); sp.lookAt(pts[i].clone().add(pts[i].clone().sub(pts[i - 1]))); g.add(sp); if (i % 2 === 1) { const n = sph(rad * 0.5, nm, pts[i].x, pts[i].y, pts[i].z); g.add(n); ns.push(n); } }
          if (depth > 0) { branch(pts[3], dir.clone().add(V3(0.7, 0.3, 0.4)).normalize(), len * 0.8, rad * 0.8, depth - 1); branch(pts[4], dir.clone().add(V3(-0.6, -0.2, -0.5)).normalize(), len * 0.75, rad * 0.8, depth - 1); }
          else { const sm = std(0xf0a34a, { roughness: 0.4 }); for (let k = 0; k < 4; k++) { const sp = sph(rad * 0.7, sm, pts[5].x + (k - 1.5) * rad * 0.9, pts[5].y + (k % 2) * rad, pts[5].z + (k % 3 - 1) * rad * 0.6); g.add(sp); if (!firstSpore) firstSpore = sp; } }
        }
        branch(V3(-3, -1.2, 0), V3(1, 0.4, 0.1).normalize(), 3.2, 0.27, 2);
        g.userData.spore = true;
        lab(2, '균사', rootTube, { offset: [-2.0, -0.1, 0.3] }); lab(2, '핵', ns[2], { offset: [0, 0.45, 0] }); lab(2, '포자', firstSpore, { offset: [0.3, 0.5, 0] });
        g.position.x = -0.3; g.userData.base = 1.25; g.position.y = -1.0;
      }
      /* 3 원생생물 : 적혈구 안의 말라리아 원충 */
      { const g = mk(3);
        function rbcGeo() { const pr = [], f = (p) => Math.sqrt(Math.max(0, 1 - p * p)) * (0.207 + 2.003 * p * p - 1.123 * p * p * p * p) * 0.52; for (let i = 0; i <= 40; i++) { const p = i / 40; pr.push(new THREE.Vector2(p * 1.0, f(p))); } for (let i = 40; i >= 0; i--) { const p = i / 40; pr.push(new THREE.Vector2(p * 1.0, -f(p))); } return new THREE.LatheGeometry(pr, 48); }
        const geo = rbcGeo();
        const big = new THREE.Mesh(geo, ghost(0xff6a5c, 0.5, { roughness: 0.3 })); big.scale.setScalar(2.3); big.rotation.x = 0.6; g.add(big);
        const pm = std(0x6a2fb0, { roughness: 0.35, emissive: 0x2a0a55, emissiveIntensity: 0.4 });
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.2, 16, 40), pm); ring.rotation.x = Math.PI / 2 + 0.6; ring.position.set(0.25, 0, 0.1); g.add(ring);
        const chro = sph(0.2, std(0xffd34d, { emissive: 0x7a5a00, emissiveIntensity: 0.4 }), 0.2 + 0.62, 0.35, 0.1); g.add(chro);
        const nuc = sph(0.17, std(0xffd34d, { emissive: 0x7a5a00, emissiveIntensity: 0.5 }), 0.9, 0.42, 0.1); g.add(nuc); g.remove(chro);
                [[-3.5, -1.6, -1.2, 1.5, 0.4], [3.5, 1.4, -1.5, 1.3, -0.3], [-2.6, 2.4, -2.0, 1.1, 0.2], [3.1, -2.2, -0.4, 1.4, 0.8]].forEach((q) => { const r = new THREE.Mesh(geo, ghost(0xe5483f, 0.55, { roughness: 0.35 })); r.scale.setScalar(q[3] * 0.62); r.position.set(q[0], q[1], q[2]); r.rotation.set(q[4], q[4] * 2, q[4]); g.add(r); });
        lab(3, '적혈구', big, { offset: [-1.2, 1.5, 0.5] }); lab(3, '말라리아 원충 (핵 있음)', ring, { offset: [0.2, 0.8, 0.8] });
        g.userData.tilt = big; }
      /* 4 기생충 : 회충 */
      { const g = mk(4), N = 70;
        const wm = std(0xe8a08a, { roughness: 0.4 });
        const body = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 18, 12), wm, N); g.add(body);
        const egg = std(0xc9a56a, { roughness: 0.7 });
        [[-2.8, -1.8, 1.2], [-2.2, -2.1, 0.8], [-3.2, -2.1, 0.2]].forEach((q) => { const e = sph(0.3, egg, q[0], q[1], q[2], 1.35, 1, 1); e.rotation.z = q[0]; g.add(e); const sh = sph(0.14, std(0xe8d19a), q[0], q[1], q[2], 1.2, 1, 1); g.add(sh); });
        const mouth = sph(0.1, std(0x8a4a4a), 0, 0, 0); g.add(mouth);
        lab(4, '회충 (다세포 동물)', g, { offset: [0, 1.4, 0] }); lab(4, '알', [-2.8, -1.4, 0.8], {});
        g.userData.worm = { body, mouth, N };
        g.scale.setScalar(1.0); }

      const wk = (g, dt, t) => 0; let cur = -1, grow = 1;
      function show(i) {
        if (i === cur) return; cur = i; groups.forEach((g, k) => { g.visible = k === i; labs[k].forEach((l) => l.show(k === i)); });
        grow = 0; info(KINDS[i].info);
      }
      controls.segment('', KINDS.map((k, i) => ({ label: k.k, value: i })), 0, show);
      show(0);
      return {
        update(dt, t) {
          grow = Math.min(1, grow + dt * 2.5); const e = 1 - Math.pow(1 - grow, 3);
          groups.forEach((g) => g.scale.setScalar((g.userData.base || 1) * (0.75 + 0.25 * e)));
          const g1 = groups[1]; if (g1.userData.swim) { g1.userData.swim.position.y = Math.sin(t * 1.2) * 0.12; g1.userData.swim.rotation.z = Math.sin(t * 0.9) * 0.06; }
          const g4 = groups[4].userData.worm, N = g4.N;
          for (let i = 0; i < N; i++) {
            const s = i / (N - 1), x = (s - 0.5) * 8.0, amp = 0.6 * (0.35 + 0.65 * s), ph = s * 7 - t * 3.0;
            const y = Math.sin(ph) * amp, z = Math.cos(ph * 0.8) * 0.15;
            const rad = 0.42 * Math.min(1, 0.35 + Math.sin(Math.min(1, s * 1.1) * Math.PI) * 0.9) * (s > 0.92 ? 0.7 : 1);
            D.position.set(x, y, z); D.scale.set(0.13 + rad * 0.2, rad, rad); D.rotation.set(0, 0, 0); D.updateMatrix(); g4.body.setMatrixAt(i, D.matrix);
          }
          g4.body.instanceMatrix.needsUpdate = true; g4.mouth.position.set(-4.05, Math.sin(-t * 3.0) * 0.5 * 0.35, 0);
        },
        sync() {},
      };
    },
  });
})();
