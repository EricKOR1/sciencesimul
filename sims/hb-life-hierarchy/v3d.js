/* hb-life-hierarchy · 3D 생명 시스템의 구성 단계
   세포 → 조직 → 기관 → 기관계 → 개체 → 개체군 → 군집 → 생태계를 한 단계씩 바꿔 가며 입체로 살펴봐요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const narrow = window.innerWidth < 600 || window.innerHeight > window.innerWidth * 1.1;
  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  const STAGES = [
    { k: '세포', info: '<b>세포</b>: 생물을 이루는 기본 단위예요.<br>핵과 여러 세포 소기관이 들어 있어요.' },
    { k: '조직', info: '<b>조직</b>: 모양과 기능이 비슷한 세포가 모인 것이에요.<br>(위의 상피 조직)' },
    { k: '기관', info: '<b>기관</b>: 여러 조직이 모여 일정한 형태와 기능을 가져요.<br>(위)' },
    { k: '기관계', info: '<b>기관계</b>: 관련된 기능을 하는 기관들이 모인 것이에요.<br>(소화계)' },
    { k: '개체', info: '<b>개체</b>: 독립적으로 생활하는 하나의 생명체예요.<br>(사슴 한 마리)' },
    { k: '개체군', info: '<b>개체군</b>: 같은 지역에 사는 같은 종의 개체들이에요.<br>(사슴 무리)' },
    { k: '군집', info: '<b>군집</b>: 같은 지역에 사는 여러 개체군(모든 생물)이에요.' },
    { k: '생태계', info: '<b>생태계</b>: 군집 + 빛·물·흙·공기 같은 비생물적 환경이에요.' },
  ];

  window.SciSim3D.attach({
    title: '생명 시스템의 구성 단계 3D',
    hint: '단계를 눌러 확대해 보세요 · 드래그: 돌리기',
    camera: { dist: narrow ? 12 : 8.5, theta: 0.7, phi: 1.1, min: 4, max: 24 },
    autoRotate: 0.22,
    levels: [0],
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      const DIST = narrow ? [11, 12, 13, 15, 13.5, 14, 15, 16] : [8.5, 9, 10, 12, 10.5, 11.5, 12, 13];
      const V = THREE.Vector3;
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.55, metalness: 0.02 }, o || {}));
      const ghost = (c, op, o) => std(c, Object.assign({ transparent: true, opacity: op, depthWrite: false, roughness: 0.3 }, o || {}));
      const sph = (r, m, x, y, z, sx, sy, sz) => { const o = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 18), m); o.position.set(x || 0, y || 0, z || 0); if (sx) o.scale.set(sx, sy, sz); return o; };

      /* 굵기가 변하는 관 (위·창자 등) */
      function varTube(pts, segs, rf, rad) {
        rad = rad || 20;
        const curve = new THREE.CatmullRomCurve3(pts), fr = curve.computeFrenetFrames(segs, false), pos = [], idx = [];
        for (let i = 0; i <= segs; i++) {
          const t = i / segs, P = curve.getPointAt(t), N = fr.normals[i], B = fr.binormals[i], r = rf(t);
          for (let j = 0; j <= rad; j++) { const a = j / rad * Math.PI * 2, c = Math.cos(a) * r, s = Math.sin(a) * r; pos.push(P.x + c * N.x + s * B.x, P.y + c * N.y + s * B.y, P.z + c * N.z + s * B.z); }
        }
        for (let i = 0; i < segs; i++) for (let j = 0; j < rad; j++) { const a = i * (rad + 1) + j, b = a + rad + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
      }
      const V3 = (x, y, z) => new V(x, y, z || 0);
      function stomachMesh(mat) {
        const pts = [V3(-0.5, 2.1), V3(-0.7, 1.3), V3(-0.35, 0.2), V3(0.45, -0.85), V3(1.5, -1.2), V3(2.5, -0.8)];
        const rf = (t) => 0.2 + 0.7 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.1)), 0.7) * (t < 0.55 ? 1 : 1 - (t - 0.55) * 0.9);
        return new THREE.Mesh(varTube(pts, 60, rf), mat);
      }

      const groups = [];
      const labsBy = [];
      function mk(i) { const g = new THREE.Group(); g.visible = false; root.add(g); groups[i] = g; labsBy[i] = []; return g; }
      function lab(i, text, obj, o) { const l = label(text, obj, o); l.show(false); labsBy[i].push(l); return l; }

      /* 0 세포 */
      { const g = mk(0);
        g.add(sph(2.6, ghost(0x1fa58f, 0.3, { roughness: 0.15 }), 0, 0, 0));
        const nuc = sph(1.0, std(0x6a3fc8, { roughness: 0.4 }), 0.3, 0.2, 0.2); g.add(nuc);
        g.add(sph(0.3, std(0x4b2a96), 0.75, 0.6, 0.85));
        const mm = std(0xe8541f, { roughness: 0.45 });
        [[-1.5, 0.9, 0.6, 0.5], [1.6, -1.0, 0.2, -0.4], [-0.8, -1.4, 0.9, 0.9], [1.0, 1.4, -1.0, 0.2]].forEach((q) => { const m = sph(0.3, mm, q[0], q[1], q[2], 1.9, 1, 1); m.rotation.z = q[3]; g.add(m); });
        const gm = std(0xe0a020); [[-1.4, -0.2, -1.2], [0.2, -1.6, -0.6], [1.5, 0.2, 1.3]].forEach((q) => g.add(sph(0.22, gm, q[0], q[1], q[2])));
        lab(0, '세포막', g, { offset: [-2.2, 1.9, 0] }); lab(0, '핵', nuc, { offset: [0, 1.2, 0] }); lab(0, '미토콘드리아', g, { offset: [-1.5, 1.3, 0.6] });
      }
      /* 1 조직 : 세포가 가지런히 모인 상피 조직 */
      { const g = mk(1), n = 7, m = 5;
        const cm = std(0xdc6a86, { roughness: 0.4, transparent: true, opacity: 0.72, depthWrite: false }), nm = std(0x7a2f68), tm = std(0xcdbfa6);
        const cells = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 20, 14), cm, n * m), nucs = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), nm, n * m);
        const d = new THREE.Object3D(); let i = 0; const R = rng(7);
        for (let a = 0; a < n; a++) for (let b = 0; b < m; b++) {
          const x = (a - (n - 1) / 2) * 0.85 + (b % 2) * 0.0, z = (b - (m - 1) / 2) * 0.85 + (a % 2) * 0.1;
          d.position.set(x, 0.3, z); d.scale.set(0.46, 0.75 + R() * 0.06, 0.46); d.updateMatrix(); cells.setMatrixAt(i, d.matrix);
          d.position.set(x, 0.1, z); d.scale.set(0.2, 0.22, 0.2); d.updateMatrix(); nucs.setMatrixAt(i, d.matrix); i++;
        }
        g.add(cells, nucs);
        const base = new THREE.Mesh(new THREE.BoxGeometry(n * 0.85 + 0.3, 0.35, m * 0.85 + 0.3), tm); base.position.y = -0.55; g.add(base);
        lab(1, '세포', g, { offset: [1.4, 0.9, 1.0] }); lab(1, '같은 모양·기능의 세포 모임', g, { offset: [0, -1.1, 2.2] });
        g.position.y = 0;
      }
      /* 2 기관 : 위 */
      { const g = mk(2), st = stomachMesh(std(0xd9706a, { roughness: 0.42 })); st.scale.setScalar(1.15); st.position.set(-0.8, 0.1, 0); g.add(st);
        const folds = std(0xc96b68, { roughness: 0.6 });
        for (let k = 0; k < 6; k++) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.62 - k * 0.03, 0.035, 8, 40, Math.PI * 1.3), folds); t.position.set(-1.3 + k * 0.1, 0.9 - k * 0.35, 0.78); t.rotation.set(0.1, 0.3, 1.6 + k * 0.2); }
        lab(2, '위', st, { offset: [-0.7, 1.0, 0.6], size: 16 }); lab(2, '식도', g, { offset: [-1.6, 2.7, 0] }); lab(2, '십이지장', g, { offset: [2.5, -0.5, 0] });
      }
      /* 3 기관계 : 소화계 */
      { const g = mk(3); g.position.y = 0.2; g.scale.setScalar(0.95);
        const pink = std(0xd9706a, { roughness: 0.42 });
        g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V3(-0.1, 3.5), V3(-0.1, 2.6), V3(0.2, 2.0), V3(0.5, 1.7)]), 30, 0.17, 12), std(0xd9776e)));
        const st = stomachMesh(pink); st.scale.setScalar(0.5); st.position.set(0.3, 1.9, 0); st.rotation.z = -0.2; g.add(st);
        const liver = sph(1, std(0x9c4f36, { roughness: 0.4 }), -0.9, 1.6, 0, 1.55, 0.65, 0.75); liver.rotation.z = 0.2; g.add(liver);
        g.add(sph(0.2, std(0x4caf50), -0.15, 1.1, 0.5, 1, 1.4, 1));
        const pan = sph(1, std(0xe8cf7a), 0.7, 0.85, -0.25, 1.1, 0.2, 0.2); pan.rotation.z = 0.15; g.add(pan);
        const pts = [], N = 6;
        for (let r = 0; r < N; r++) { const y = 0.4 - r * 0.42, dirn = r % 2 ? -1 : 1; for (let k = 0; k <= 4; k++) { const x = dirn * (-1.0 + k * 0.5); pts.push(V3(x, y + Math.sin(k * 1.7 + r) * 0.07, Math.sin(k + r * 2) * 0.16)); } }
        const si = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5), 220, 0.15, 12), std(0xe8967a, { roughness: 0.45 })); g.add(si);
        const li = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V3(-1.5, -1.9), V3(-1.62, -0.6), V3(-1.6, 0.8), V3(-0.8, 1.05), V3(0.8, 1.05), V3(1.6, 0.8), V3(1.62, -0.6), V3(1.5, -1.9), V3(0.9, -2.3), V3(0.1, -2.5), V3(0, -3.1)]), 120, 0.26, 14), std(0xb5764f, { roughness: 0.55 })); g.add(li);
        lab(3, '입', g, { offset: [0, 3.6, 0] }); lab(3, '위', st, { offset: [1.0, 0, 0] }); lab(3, '간', liver, { offset: [-0.8, 0.5, 0] }); lab(3, '소장', si, { offset: [0, -0.2, 0.6] }); lab(3, '대장', g, { offset: [-1.9, -1.0, 0] });
      }
      /* 개체 · 개체군 · 군집 · 생태계에서 쓰는 생물 모형 */
      function deer(s) {
        const g = new THREE.Group(), fur = std(0x8b5524, { roughness: 0.75 }), pale = std(0xd4b484, { roughness: 0.75 }), dk = std(0x3a2410);
        g.add(sph(0.5, fur, 0, 1.1, 0, 1.6, 0.9, 0.8)); g.add(sph(0.4, pale, 0, 0.95, 0, 1.4, 0.7, 0.75));
        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.26, 0.85, 14), fur); neck.position.set(0.75, 1.55, 0); neck.rotation.z = -0.5; g.add(neck);
        g.add(sph(0.26, fur, 1.05, 1.95, 0, 1.5, 0.95, 0.9));
        g.add(sph(0.06, dk, 1.38, 1.94, 0.14), sph(0.06, dk, 1.38, 1.94, -0.14));
        g.add(sph(0.1, dk, 1.55, 1.9, 0, 1, 0.8, 1));
        [[-0.7, 0.3], [-0.7, -0.3], [0.65, 0.3], [0.65, -0.3]].forEach((q) => { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 1.0, 10), dk); l.position.set(q[0], 0.5, q[1]); g.add(l); });
        g.add(sph(0.12, pale, -0.85, 1.3, 0, 1, 1, 1));
        const am = std(0xb89b62, { roughness: 0.6 });
        [-1, 1].forEach((sd) => { const c = new THREE.CatmullRomCurve3([V3(0.95, 2.15, sd * 0.1), V3(0.85, 2.55, sd * 0.3), V3(0.75, 2.95, sd * 0.4), V3(0.9, 3.3, sd * 0.35)]); g.add(new THREE.Mesh(new THREE.TubeGeometry(c, 16, 0.035, 6), am));
          const c2 = new THREE.CatmullRomCurve3([V3(0.82, 2.65, sd * 0.3), V3(1.15, 2.85, sd * 0.35), V3(1.35, 3.1, sd * 0.3)]); g.add(new THREE.Mesh(new THREE.TubeGeometry(c2, 10, 0.03, 6), am)); });
        g.scale.setScalar(s); return g;
      }
      function oak(s) {
        const g = new THREE.Group(); const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.24, 1.5, 12), std(0x5e3d20, { roughness: 0.85 })); tr.position.y = 0.75; g.add(tr);
        const cols = [0x1f6b2a, 0x2a7d32, 0x1a5e2e], R = rng(Math.round(s * 100));
        [[0, 2.1, 0, 0.8], [0.5, 1.8, 0.2, 0.55], [-0.45, 1.9, -0.2, 0.6], [0.1, 2.6, 0.1, 0.55], [-0.1, 1.8, 0.5, 0.5]].forEach((q, i) => g.add(sph(q[3], std(cols[i % 3], { roughness: 0.8 }), q[0], q[1], q[2])));
        g.scale.setScalar(s * 0.78 * (0.9 + R() * 0.2)); return g;
      }
      function bush(s) { const g = new THREE.Group(), m = std(0x2f7d38, { roughness: 0.8 }); g.add(sph(0.4, m, 0, 0.3, 0), sph(0.3, m, 0.3, 0.22, 0.1), sph(0.3, m, -0.28, 0.2, -0.1)); const b = std(0xd9423f); [[0.2, 0.55, 0.2], [-0.15, 0.45, 0.25], [0.0, 0.62, -0.1]].forEach((q) => g.add(sph(0.06, b, q[0], q[1], q[2]))); g.scale.setScalar(s); return g; }
      function mushroom(s) { const g = new THREE.Group(); const st = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.3, 10), std(0xf0e6d2)); st.position.y = 0.15; g.add(st); const c = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), std(0xd9423f)); c.position.y = 0.3; g.add(c); g.scale.setScalar(s); return g; }
      function bird(s) { const g = new THREE.Group(), m = std(0x3b82c4); g.add(sph(0.18, m, 0, 0, 0, 1.3, 1, 1), sph(0.1, m, 0.2, 0.1, 0), sph(0.04, std(0xf2a33a), 0.3, 0.1, 0, 1.6, 0.7, 0.7)); g.scale.setScalar(s); return g; }
      function ground(r, withPond) {
        const g = new THREE.Group();
        const soil = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.93, 0.5, 72), std(0x6b4a2f, { roughness: 0.95 })); soil.position.y = -0.27; g.add(soil);
        const grass = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.08, 72), std(0x3f8f35, { roughness: 0.9 })); grass.position.y = -0.02; g.add(grass);
        if (withPond) { const pnd = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.1, 40), ghost(0x4aa3e0, 0.85, { roughness: 0.1, metalness: 0.1 })); pnd.position.set(1.7, 0.0, 1.2); g.add(pnd); }
        return g;
      }
      function place(g, o, x, z, ry) { o.position.set(x, 0, z); o.rotation.y = ry || 0; g.add(o); return o; }

      /* 4 개체 */
      { const g = mk(4), d = deer(1.25); d.position.set(-0.5, -0.3, 0); d.rotation.y = 0.3; g.add(d);
        const gr = ground(3.6); gr.position.y = -0.35; g.add(gr);
        lab(4, '사슴 한 마리 = 개체', d, { offset: [0.3, 3.9, 0], size: 15 }); }
      /* 5 개체군 */
      { const g = mk(5); g.add(ground(4.3)); g.children[0].position.y = 0;
        [[-1.9, -0.8, 0.3], [0, 1.5, 1.4], [1.6, -0.6, 2.6], [-1.4, 1.7, -0.5], [2.3, 1.3, 3.5]].forEach((q, i) => place(g, deer(0.8 + (i % 2) * 0.08), q[0], q[1], q[2]));
        lab(5, '같은 종(사슴)의 개체들', g, { offset: [0, 2.6, 0], size: 15 }); }
      /* 6 군집, 7 생태계 */
      function community(g, eco) {
        g.add(ground(4.3, eco));
        place(g, deer(0.8), -1.6, -0.2, 0.5); place(g, deer(0.7), -0.3, 1.5, 2.4);
        [[-2.4, -2.2, 1.3], [1.4, -2.3, 1.1], [-3.0, 0.9, 0.9], [2.7, -0.6, 1.2]].forEach((q) => place(g, oak(q[2]), q[0], q[1]));
        [[0.5, -0.5], [-1.0, 2.5], [1.8, 0.2], [-0.4, -1.9]].forEach((q, i) => place(g, bush(1 + (i % 2) * 0.3), q[0], q[1]));
        place(g, mushroom(1.2), 0.2, 0.6); place(g, mushroom(1), 0.45, 0.8);
        const b = bird(1.1); b.position.set(-2.4, 3.3, -2.2); g.add(b);
      }
      { const g = mk(6); community(g, false); lab(6, '여러 종의 모든 생물 = 군집', g, { offset: [0, 4.3, 0], size: 15 }); }
      { const g = mk(7); community(g, true);
        const sun = new THREE.Mesh(new THREE.SphereGeometry(0.7, 28, 20), new THREE.MeshBasicMaterial({ color: 0xffd34d })); sun.position.set(-3.6, 5.2, -2.4); g.add(sun);
        const cl = new THREE.Group(); [[0, 0, 0, 0.5], [0.5, 0.1, 0, 0.4], [-0.5, -0.05, 0, 0.38]].forEach((q) => cl.add(sph(q[3], std(0xffffff, { roughness: 1 }), q[0], q[1], q[2], 1.3, 0.8, 1))); cl.position.set(2.8, 5.0, -1.6); g.add(cl);
        lab(7, '생물 + 비생물 환경 = 생태계', g, { offset: [0, 4.4, 0], size: 15 }); lab(7, '빛', sun, { offset: [0, -0.9, 0] }); lab(7, '물', g, { offset: [1.7, 0.4, 1.2] }); lab(7, '흙·공기', g, { offset: [-3.8, 0.1, 2.2] }); }

      let cur = -1, grow = 1, auto = false, autoT = 0;
      function show(i) {
        if (i === cur) return; cur = i;
        groups.forEach((g, k) => { g.visible = k === i; labsBy[k].forEach((l) => l.show(k === i)); });
        grow = 0; info(STAGES[i].info); seg.set(i); orbit.dist = DIST[i];
      }
      const seg = controls.segment('', STAGES.map((s, i) => ({ label: s.k, value: i })), 0, (v) => { auto = false; ab.classList.remove('on'); show(v); });
      const ab = controls.button('▶ 자동 확대', () => { auto = !auto; ab.classList.toggle('on', auto); autoT = 0; });
      show(0);
      return {
        update(dt) {
          grow = Math.min(1, grow + dt * 2.2);
          const e = 1 - Math.pow(1 - grow, 3); groups.forEach((g) => g.scale.setScalar(0.7 + 0.3 * e));
          if (auto) { autoT += dt; if (autoT > 3.2) { autoT = 0; show((cur + 1) % 8); } }
        },
        sync() {},
      };
    },
  });
})();
