/* hb-life-hierarchy · 3D 생명 시스템의 구성 단계
   2D 차시와 같은 내용: ① 사람 → 순환계 → 심장 → 심장 근육 조직 → 심근 세포 확대
                        ② 숲에서 개체 → 개체군 → 군집 → 생태계 묶기 (참나무·사슴·다람쥐·새·버섯)
   2D(window.__sim)와 양방향으로 맞물려요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const narrow = window.innerWidth < 600 || window.innerHeight > window.innerWidth * 1.1;
  const TAU = Math.PI * 2;
  const L2 = () => window.__sim || null;

  const v3 = window.SciSim3D.attach({
    title: '생명 시스템의 구성 단계 3D',
    hint: '확대 단계·묶는 단계를 눌러 보세요 · 드래그: 돌리기',
    camera: { dist: narrow ? 12 : 9, theta: 0.6, phi: 1.2, min: 3, max: 26 },
    autoRotate: 0.12,
    levels: [0, 1],
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      const V = THREE.Vector3, V3 = (x, y, z) => new V(x, y, z || 0);
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.55, metalness: 0.02 }, o || {}));
      const ghost = (c, op, o) => std(c, Object.assign({ transparent: true, opacity: op, depthWrite: false, roughness: 0.3 }, o || {}));
      const sph = (r, m, x, y, z, sx, sy, sz) => { const o = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 18), m); o.position.set(x || 0, y || 0, z || 0); if (sx) o.scale.set(sx, sy, sz); return o; };
      const cap = (r, len, m, x, y, z, rx, ry, rz) => { const o = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 8, 18), m); o.position.set(x, y, z); o.rotation.set(rx || 0, ry || 0, rz || 0); return o; };
      const tube = (pts, r, m, seg) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg || 40, r, 10), m);
      function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
      let ph = 0;                                  // 박동 한 주기(0~1)
      const NB = 7;                                // 한 주기에 7번 뛰어요 (약 70회/분)
      const beat = () => Math.pow(Math.max(0, Math.sin(TAU * NB * ph)), 3);

      /* ---------- 하트(심장) ---------- */
      function heartGeo(depth) {
        const s = new THREE.Shape();
        s.moveTo(0, -0.9); s.bezierCurveTo(-1.25, -0.1, -0.85, 0.95, 0, 0.4); s.bezierCurveTo(0.85, 0.95, 1.25, -0.1, 0, -0.9);
        const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: depth * 0.5, bevelSize: 0.18, bevelSegments: 6, curveSegments: 28 });
        g.translate(0, 0, -depth / 2); return g;
      }
      const heartMat = () => std(0xd63a52, { roughness: 0.4 });

      /* ================= 확대 장면 (2D 'zoom') ================= */
      const zg = [], zl = [];   // zg[j]: 2D LV[j] 단계 장면
      const mkz = (j) => { const g = new THREE.Group(); g.visible = false; root.add(g); zg[j] = g; zl[j] = []; return g; };
      const zlab = (j, t, o, off, opt) => { const l = label(t, o, Object.assign({ offset: off }, opt || {})); l.show(false); zl[j].push(l); return l; };
      const skin = std(0xf5c9a0, { roughness: 0.7 }), shirt = std(0x4f86f7), pants = std(0x2f3e5e);
      const beatObjs = [];     // [obj, 기본 크기, 진폭]
      const addBeat = (o, a) => { beatObjs.push([o, o.scale.clone(), a]); };

      /* 0 개체 : 사람 (달리는 사람) */
      { const g = mkz(0), body = new THREE.Group(); g.add(body);
        body.add(cap(0.62, 1.5, ghost(0x4f86f7, 0.62, { roughness: 0.35 }), 0, 0.9, 0));
        body.add(cap(0.22, 1.5, pants, -0.3, -1.1, 0), cap(0.22, 1.5, pants, 0.3, -1.1, 0));
        body.add(cap(0.15, 1.1, skin, -0.88, 0.95, 0, 0, 0, 0.08), cap(0.15, 1.1, skin, 0.88, 0.95, 0, 0, 0, -0.08));
        body.add(sph(0.46, skin, 0, 2.55, 0)); const hair = sph(0.48, std(0x6b4a2b), 0, 2.66, -0.05); hair.scale.set(1, 0.8, 1); body.add(hair);
        const h = new THREE.Mesh(heartGeo(0.5), heartMat()); h.scale.setScalar(0.3); h.position.set(-0.25, 1.35, 0.1); body.add(h); addBeat(h, 0.14);
        g.position.y = -0.4; g.scale.setScalar(1);
        zlab(0, '사람 (개체)', body, [0.2, 3.5, 0]); zlab(0, '심장', h, [-0.9, 0.2, 0.2]);
      }
      /* 1 기관계 : 순환계 */
      { const g = mkz(1), body = new THREE.Group(); g.add(body);
        body.add(cap(0.7, 1.7, ghost(0x4f86f7, 0.12, { roughness: 0.2 }), 0, 0.9, 0), sph(0.5, ghost(0x4f86f7, 0.12), 0, 2.55, 0));
        const red = std(0xd63a52, { roughness: 0.4 }), blue = std(0x3b6fe0, { roughness: 0.4 });
        const paths = [[[0.1, 1.3, 0], [0.12, 2.0, 0.05], [0.05, 2.6, 0]], [[0.1, 1.3, 0], [1.0, 1.4, 0], [1.5, 0.5, 0.1]], [[0.1, 1.3, 0], [-1.0, 1.4, 0], [-1.5, 0.5, 0.1]],
          [[0.1, 1.0, 0], [0.35, 0.0, 0], [0.6, -1.8, 0]], [[0.1, 1.0, 0], [-0.25, 0.0, 0], [-0.55, -1.8, 0]]];
        paths.forEach((p) => {
          const a = p.map((q) => V3(q[0] + 0.07, q[1], q[2])), b = p.map((q) => V3(q[0] - 0.07, q[1] - 0.05, q[2]));
          body.add(tube(a, 0.06, red), tube(b, 0.06, blue));
        });
        const pc = []; const flow = new THREE.Group(); body.add(flow);
        paths.forEach((p, i) => { const c = new THREE.CatmullRomCurve3(p.map((q) => V3(q[0] + 0.07, q[1], q[2]))); for (let k = 0; k < 2; k++) { const m = sph(0.07, std(0xff8c9d, { emissive: 0x802030 }), 0, 0, 0); flow.add(m); pc.push([m, c, k / 2 + i * 0.13]); } });
        const h = new THREE.Mesh(heartGeo(0.5), heartMat()); h.scale.setScalar(0.42); h.position.set(0.05, 1.2, 0.1); body.add(h); addBeat(h, 0.12);
        g.userData.flow = pc; g.position.y = -0.4;
        zlab(1, '순환계 (기관계)', body, [0.2, 3.5, 0]); zlab(1, '심장', h, [-0.9, 0.2, 0.2]); zlab(1, '혈관', body, [1.7, 0.5, 0]);
      }
      /* 2 기관 : 심장 */
      { const g = mkz(2);
        const h = new THREE.Mesh(heartGeo(1.1), std(0xd63a52, { roughness: 0.35 })); h.scale.setScalar(2.0); g.add(h); addBeat(h, 0.05);
        const bl = tube([V3(-0.7, 1.2, 0), V3(-0.85, 2.2, 0), V3(-1.0, 3.0, 0)], 0.2, std(0x3b6fe0, { roughness: 0.4 }));
        const rd = tube([V3(0.2, 1.1, 0), V3(0.3, 2.3, 0), V3(1.4, 2.6, 0)], 0.26, std(0xd63a52, { roughness: 0.4 }));
        g.add(bl, rd);
        zlab(2, '심장 (기관)', h, [0, 0.4, 1.6], { size: 16 }); zlab(2, '혈액을 내보내는 펌프', h, [0, -2.1, 0.6]);
      }
      /* 3 조직 : 심장 근육 조직 (연결된 심근 세포들) */
      { const g = mkz(3), cells = [];
        const cm = ghost(0xf0919f, 0.88, { roughness: 0.4 }), nm = std(0x8b6fcf), dm = std(0x6e1e32);
        for (let l = -1; l <= 1; l++) for (let r = -2; r <= 2; r++) for (let c = -3; c <= 3; c++) {
          const x = (c + ((r + l) % 2 ? 0.5 : 0)) * 1.3, y = r * 0.78, z = l * 0.75; if (Math.abs(x) > 4) continue;
          const cg = new THREE.Group(); cg.position.set(x, y, z);
          const b = cap(0.3, 0.78, cm, 0, 0, 0, 0, 0, Math.PI / 2); b.scale.set(1, 1, 0.9); cg.add(b);
          cg.add(sph(0.14, nm, 0, 0, 0.14, 1.5, 1, 0.8));
          [-1, 1].forEach((sd) => { const d = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.46, 0.4), dm); d.position.x = sd * 0.66; cg.add(d); });
          g.add(cg); cells.push(cg);
        }
        g.userData.cells = cells; g.rotation.x = -0.25;
        zlab(3, '심장 근육 조직', g, [0, 2.7, 0], { size: 15 }); zlab(3, '연결된 심근 세포들', g, [0, -2.7, 0.3]);
      }
      /* 4 세포 : 심근 세포 */
      { const g = mkz(4), cell = new THREE.Group(); g.add(cell);
        cell.add(cap(1.0, 2.6, ghost(0xf4a3b0, 0.72, { roughness: 0.2 }), 0, 0, 0, 0, 0, Math.PI / 2));
        const nuc = sph(0.55, std(0x8b6fcf, { roughness: 0.35 }), 0, 0, 0.1); cell.add(nuc);
        const mm = std(0xf5a25b, { roughness: 0.45 });
        [[-1.55, -0.45, 0.3], [-1.55, 0.45, -0.3], [1.55, -0.45, -0.3], [1.55, 0.45, 0.3], [-0.8, 0.75, 0.2], [0.8, -0.75, -0.2], [-0.85, -0.7, -0.35], [0.85, 0.7, 0.35]].forEach((q, i) => { const m = sph(0.2, mm, q[0], q[1], q[2], 1.9, 0.95, 0.95); m.rotation.z = i * 0.4; cell.add(m); });
        for (let k = -2.2; k <= 2.2; k += 0.28) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.97, 0.012, 6, 36), std(0xa03246, { roughness: 0.8, transparent: true, opacity: 0.3 })); t.rotation.y = Math.PI / 2; t.position.x = k; if (Math.abs(k) > 0.8) cell.add(t); }
        [-1, 1].forEach((sd) => { const d = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.12, 24), std(0x6e1e32)); d.rotation.z = Math.PI / 2; d.position.x = sd * 2.25; cell.add(d); });
        g.userData.cell = cell;
        zlab(4, '핵', nuc, [0, 0.9, 0.4]); zlab(4, '미토콘드리아', cell, [-1.6, 1.0, 0.3]); zlab(4, '심근 세포 (세포)', cell, [0, -1.7, 0], { size: 15 });
      }

      /* ================= 묶기 장면 (2D 'group'): 숲 ================= */
      const gg = new THREE.Group(); gg.visible = false; root.add(gg);
      function deer(s) {
        const g = new THREE.Group(), fur = std(0x8b5524, { roughness: 0.75 }), pale = std(0xd4b484, { roughness: 0.75 }), dk = std(0x3a2410);
        g.add(sph(0.5, fur, 0, 1.1, 0, 1.6, 0.9, 0.8)); g.add(sph(0.4, pale, 0, 0.95, 0, 1.4, 0.7, 0.75));
        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.26, 0.85, 14), fur); neck.position.set(0.75, 1.55, 0); neck.rotation.z = -0.5; g.add(neck);
        g.add(sph(0.26, fur, 1.05, 1.95, 0, 1.5, 0.95, 0.9)); g.add(sph(0.06, dk, 1.38, 1.94, 0.14), sph(0.06, dk, 1.38, 1.94, -0.14)); g.add(sph(0.1, dk, 1.55, 1.9, 0, 1, 0.8, 1));
        [[-0.7, 0.3], [-0.7, -0.3], [0.65, 0.3], [0.65, -0.3]].forEach((q) => { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 1.0, 10), dk); l.position.set(q[0], 0.5, q[1]); g.add(l); });
        g.add(sph(0.12, pale, -0.85, 1.3, 0));
        const am = std(0xb89b62, { roughness: 0.6 });
        [-1, 1].forEach((sd) => { g.add(tube([V3(0.95, 2.15, sd * 0.1), V3(0.85, 2.55, sd * 0.3), V3(0.75, 2.95, sd * 0.4), V3(0.9, 3.3, sd * 0.35)], 0.035, am, 16)); });
        g.scale.setScalar(s); return g;
      }
      function oak(s) {
        const g = new THREE.Group(); const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.24, 1.5, 12), std(0x5e3d20, { roughness: 0.85 })); tr.position.y = 0.75; g.add(tr);
        const cols = [0x1f6b2a, 0x2a7d32, 0x1a5e2e];
        [[0, 2.1, 0, 0.8], [0.5, 1.8, 0.2, 0.55], [-0.45, 1.9, -0.2, 0.6], [0.1, 2.6, 0.1, 0.55], [-0.1, 1.8, 0.5, 0.5]].forEach((q, i) => g.add(sph(q[3], std(cols[i % 3], { roughness: 0.8 }), q[0], q[1], q[2])));
        g.scale.setScalar(s * 0.8); return g;
      }
      function squirrel(s) {
        const g = new THREE.Group(), m = std(0xb06a3a, { roughness: 0.8 }), lt = std(0xe6cba5);
        g.add(sph(0.3, m, 0, 0.45, 0, 1.2, 1, 0.85), sph(0.2, m, 0.34, 0.75, 0), sph(0.06, std(0x201010), 0.5, 0.8, 0.1), sph(0.06, std(0x201010), 0.5, 0.8, -0.1), sph(0.15, lt, 0.2, 0.4, 0, 1, 1.1, 0.8));
        g.add(sph(0.06, m, 0.3, 0.98, 0.1, 1, 1.6, 0.8), sph(0.06, m, 0.3, 0.98, -0.1, 1, 1.6, 0.8));
        const tail = sph(0.28, m, -0.5, 0.75, 0, 0.8, 1.9, 0.8); tail.rotation.z = 0.5; g.add(tail);
        g.scale.setScalar(s); return g;
      }
      function mushroom(s) { const g = new THREE.Group(); const st = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.3, 10), std(0xf0e6d2)); st.position.y = 0.15; g.add(st); const c = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 10, 0, TAU, 0, Math.PI / 2), std(0xd9423f)); c.position.y = 0.3; g.add(c); g.scale.setScalar(s); return g; }
      function bird(s) { const g = new THREE.Group(), m = std(0x3b82c4); g.add(sph(0.18, m, 0, 0, 0, 1.3, 1, 1), sph(0.1, m, 0.2, 0.1, 0), sph(0.04, std(0xf2a33a), 0.3, 0.1, 0, 1.6, 0.7, 0.7)); const w = sph(0.12, std(0x2a64a0), -0.02, 0.04, 0.14, 1.4, 0.4, 1); g.add(w, sph(0.12, std(0x2a64a0), -0.02, 0.04, -0.14, 1.4, 0.4, 1)); g.scale.setScalar(s); return g; }
      const soil = new THREE.Mesh(new THREE.CylinderGeometry(5.6, 5.2, 0.7, 72), std(0x6b4a2f, { roughness: 0.95 })); soil.position.y = -0.4; gg.add(soil);
      const grass = new THREE.Mesh(new THREE.CylinderGeometry(5.6, 5.6, 0.08, 72), std(0x3a7f30, { roughness: 0.9 })); grass.position.y = -0.04; gg.add(grass);

      const ORGS = [];   // {id, sp, g, ring}
      const sim0 = L2();
      const makers = { oak: (o) => oak(0.9 * o.s), deer: () => deer(0.5), squirrel: () => squirrel(0.9), bird: () => bird(1.3), mushroom: () => mushroom(1.6) };
      const orgList = sim0 ? sim0.ORG : [];
      orgList.forEach((o) => {
        const m = makers[o.sp](o), h = new THREE.Group();
        m.traverse((c) => { if (c.isMesh) c.material = c.material.clone(); });
        h.add(m);
        const x = (o.u - 0.5) * 9.4, z = (o.v - 0.72) * 6.2, y = o.sp === 'bird' ? 3.0 : 0;
        h.position.set(x, y, z); h.rotation.y = o.sp === 'deer' ? 0.4 + o.u * 3 : (o.u * 7);
        const rr = o.sp === 'oak' ? 0.9 : o.sp === 'deer' ? 1.1 : 0.6;
        const ring = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.05, 8, 40), std(0xf59e0b, { emissive: 0x402800 })); ring.rotation.x = Math.PI / 2; ring.visible = false; ring.position.set(x, 0.06, z);
        if (o.sp !== 'bird') gg.add(ring); else { ring.position.y = y - 0.3; gg.add(ring); }
        gg.add(h); ORGS.push({ o, h, ring, mats: [] }); h.traverse((c) => { if (c.isMesh) { const e = ORGS[ORGS.length - 1]; e.mats.push(c.material); c.material.userData.o0 = c.material.opacity; c.material.userData.t0 = c.material.transparent; } });
      });
      /* 생태계: 비생물 환경 */
      const eco = new THREE.Group(); eco.visible = false; gg.add(eco);
      const pond = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.1, 40), ghost(0x4aa3e0, 0.85, { roughness: 0.1, metalness: 0.1 })); pond.position.set(3.3, 0.02, 3.2); eco.add(pond);
      const sun = new THREE.Mesh(new THREE.SphereGeometry(0.7, 28, 20), new THREE.MeshBasicMaterial({ color: 0xffd34d })); sun.position.set(-4.4, 5.6, -2.6); eco.add(sun);
      const cl = new THREE.Group(); [[0, 0, 0, 0.5], [0.5, 0.1, 0, 0.4], [-0.5, -0.05, 0, 0.38]].forEach((q) => cl.add(sph(q[3], std(0xffffff, { roughness: 1 }), q[0], q[1], q[2], 1.3, 0.8, 1))); cl.position.set(2.2, 5.4, -1.8); eco.add(cl);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(6.3, 40, 20, 0, TAU, 0, Math.PI / 2), ghost(0x7c3aed, 0.08, { side: THREE.DoubleSide })); dome.position.y = -0.05; eco.add(dome);
      const rim = (c, r) => { const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.07, 8, 80), std(c, { emissive: c, emissiveIntensity: 0.25 })); t.rotation.x = Math.PI / 2; t.position.y = 0.05; t.visible = false; gg.add(t); return t; };
      const rimComm = rim(0x2563eb, 5.4), rimEco = rim(0x7c3aed, 6.3);
      const anchor = new THREE.Object3D(); gg.add(anchor);
      const tagLab = label('', anchor, { offset: [0, 3.9, 0], size: 15 }); tagLab.show(false);
      const lSun = label('☀️ 햇빛', sun, { offset: [0, -1.0, 0] }), lAir = label('💨 공기', cl, { offset: [0, -0.8, 0] }), lWater = label('💧 물', pond, { offset: [0, 0.5, 0] }), lSoil = label('🌱 토양', soil, { offset: [4.0, 0.0, 2.6] });
      [lSun, lAir, lWater, lSoil].forEach((l) => l.show(false));

      /* ================= 상태 · 연결 ================= */
      let scene = '', stage = -1, grow = 0;
      const sceneOf = () => { const L = L2(); return L && L.S.mode === 'group' ? 'group' : 'zoom'; };
      const stageOf = () => { const L = L2(); if (!L) return 0; return sceneOf() === 'group' ? L.S.grp.g : Math.max(0, Math.min(4, Math.round(L.S.zm.tz))); };
      const SPK = { oak: '참나무', deer: '사슴', squirrel: '다람쥐', bird: '새', mushroom: '버섯' };
      const unit = (sp) => (sp === 'oak' ? '그루' : sp === 'mushroom' ? '개' : '마리');
      const EXTRA = ['같은 종이라도 사는 곳이 다르면 다른 개체군이에요.', '같은 종끼리만 묶어요. 다른 종(사슴·다람쥐)은 포함하지 않아요.', '생물만 묶어요. 햇빛·토양·공기는 포함하지 않아요.', '비생물 환경을 더하는 것이 군집과 다른 점이에요.'];

      function showZoom(j) {
        const L = L2(); zg.forEach((g, k) => { g.visible = scene === 'zoom' && k === j; zl[k].forEach((l) => l.show(scene === 'zoom' && k === j)); });
        const lv = L ? L.LV[j] : null;
        info(lv ? '<b>' + lv.name + ': ' + lv.ex + '</b> (' + lv.size + ')<br>하는 일: ' + lv.role + (j < 4 ? '<br>↓ 더 확대하면 ' + L.LV[j + 1].name + '(' + L.LV[j + 1].ex + ')이 보여요.' : '<br>가장 작은 단계예요. 세포가 모여 조직을 이뤄요.') : '');
        orbit.dist = (narrow ? [15, 13, 11, 14, 10] : [12, 10, 8.5, 11, 8.5])[j]; orbit.phi = 1.25;
      }
      function showGroup(g) {
        const L = L2(); if (!L) return; const G = L.S.grp, sel = L.ORG.find((o) => o.id === G.sel), sp = sel.sp;
        const member = (o) => (g === 0 ? o.id === G.sel : g === 1 ? o.sp === sp : true);
        let n = 0;
        ORGS.forEach((e) => {
          const on = member(e.o); if (on) n++;
          e.mats.forEach((m) => { m.transparent = on ? m.userData.t0 : true; m.opacity = on ? m.userData.o0 : 0.3; m.depthWrite = on; });
          e.ring.visible = (g === 0 && e.o.id === G.sel) || (g === 1 && e.o.sp === sp);
          e.ring.material.color.setHex(g === 0 ? 0xf59e0b : 0x16a34a); e.ring.material.emissive.setHex(g === 0 ? 0x402800 : 0x0a3a1c);
        });
        rimComm.visible = g === 2; rimEco.visible = g === 3; eco.visible = g === 3;
        [lSun, lAir, lWater, lSoil].forEach((l) => l.show(g === 3));
        const selE = ORGS.find((e) => e.o.id === G.sel);
        if (g === 0) { anchor.position.copy(selE.h.position); anchor.position.y = (sp === 'oak' || sp === 'deer') ? 1.0 : 0.4; tagLab.set('개체 · ' + SPK[sp] + ' 1' + unit(sp)); }
        else if (g === 1) { const m = ORGS.filter((e) => e.o.sp === sp); anchor.position.set(0, 0, 0); m.forEach((e) => anchor.position.x += e.h.position.x / m.length); anchor.position.z = m[0].h.position.z; anchor.position.y = sp === 'oak' ? 1.2 : sp === 'bird' ? 2.0 : 0.8; tagLab.set('개체군 · 모든 ' + SPK[sp] + ' (한 종)'); }
        else if (g === 2) { anchor.position.set(0, 1.2, 0); tagLab.set('군집 · 모든 생물 (여러 종)'); }
        else { anchor.position.set(0, 2.6, 0); tagLab.set('생태계 · 군집 + 비생물 환경'); }
        tagLab.show(true);
        info('<b>' + L.GTXT[g][0] + '</b>: ' + L.GTXT[g][1] + '<br>고른 생물: ' + SPK[sp] + ' · 묶인 개체 수 ' + n + '개<br>💡 ' + EXTRA[g]);
        orbit.dist = narrow ? 19 : 14.5; orbit.phi = 1.05;
      }
      function apply() {
        const sc = sceneOf(), st = stageOf();
        scene = sc; stage = st; grow = 0;
        gg.visible = sc === 'group';
        if (sc === 'group') { zg.forEach((g, k) => { g.visible = false; zl[k].forEach((l) => l.show(false)); }); showGroup(st); }
        else { tagLab.show(false); [lSun, lAir, lWater, lSoil].forEach((l) => l.show(false)); showZoom(st); }
        segZ.set(sc === 'zoom' ? 'z' + st : ''); segG.set(sc === 'group' ? 'g' + st : ''); segS.set(sc === 'group' && L2() ? L2().ORG.find((o) => o.id === L2().S.grp.sel).sp : '');
      }

      const L0 = L2();
      const segZ = controls.segment('🔍 확대', (L0 ? L0.LV : [{ name: '개체' }, { name: '기관계' }, { name: '기관' }, { name: '조직' }, { name: '세포' }]).map((l, j) => ({ label: l.name, value: 'z' + j })), 'z0', (v) => {
        const L = L2(); if (!L) return; const j = +v.slice(1);
        L.setScene('zoom', 'zoom'); L.S.zm.tz = j; L.syncControls(); apply();
      });
      const segG = controls.segment('🌲 묶기', ['개체', '개체군', '군집', '생태계'].map((n, i) => ({ label: n, value: 'g' + i })), '', (v) => {
        const L = L2(); if (!L) return; const g = +v.slice(1);
        L.setScene('group', 'view'); L.S.grp.g = g; L.S.grp.seen[g] = true; L.syncControls(); apply();
      });
      const segS = controls.segment('고른 생물', Object.keys(SPK).map((k) => ({ label: SPK[k], value: k })), '', (k) => {
        const L = L2(); if (!L) return;
        L.setScene('group', 'view'); if (L.S.grp.g > 1) L.S.grp.g = 0; L.S.grp.seen[L.S.grp.g] = true; L.S.grp.sel = k + '0'; L.syncControls(); apply();
      });
      const pl = controls.player({
        duration: 6, loop: true, autoplay: true, label: '심장 박동',
        phases: [[0, '박동 ×7 (약 70회/분)']],
        onFrame(p) { ph = p; },
      });

      let lastKey = '';
      const keyOf = () => { const L = L2(); if (!L) return ''; const sc = sceneOf(); return sc + ':' + stageOf() + ':' + (sc === 'group' ? L.S.grp.sel : ''); };

      return {
        update(dt, t) {
          const k = keyOf(); if (k !== lastKey) { lastKey = k; apply(); }
          grow = Math.min(1, grow + dt * 2.5); const e = 1 - Math.pow(1 - grow, 3), sc = 0.75 + 0.25 * e;
          zg.forEach((g) => g.scale.setScalar(sc)); gg.scale.setScalar(0.85 + 0.15 * e);
          const b = beat();
          beatObjs.forEach((q) => q[0].scale.copy(q[1]).multiplyScalar(1 + q[2] * b));
          zg[1].userData.flow.forEach((f) => { const u = (ph * 2 + f[2]) % 1; f[0].position.copy(f[1].getPoint(u)); });
          zg[3].userData.cells.forEach((c) => { c.children[0].scale.x = 1 - 0.1 * b; c.children[0].scale.y = 1 + 0.08 * b; });
          const cell = zg[4].userData.cell; cell.position.set(Math.sin(TAU * 9 * ph) * 0.03, Math.cos(TAU * 7 * ph) * 0.03, 0);
          ORGS.forEach((q) => { if (q.o.sp === 'bird') q.h.position.y = 3.0 + Math.sin(TAU * 2 * ph + q.o.u * 9) * 0.12; });
        },
        sync() { lastKey = ''; },
      };
    },
  });

  /* 2D에서 카드를 끌어 놓는 화면(단계 배열·분류·카드 배열)에서는 3D를 잠시 닫아 줘요 */
  let closedByMe = false, lk = '';
  setInterval(() => {
    const L = L2(); if (!L) return;
    const k = L.S.mode + ':' + L.S.sub[L.S.mode];
    if (k === lk) return; lk = k;
    if (/:(order|sort)$/.test(k)) { if (v3.isOpen) { v3.close(); closedByMe = true; } }
    else if (closedByMe) { closedByMe = false; v3.open(); }
  }, 300);
})();
