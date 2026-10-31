/* m1-cell · 3D 세포 모형 (식물 세포 · 동물 세포 잘라 보기)
   2D 그림에서 '납작한 그림'이던 세포가 사실은 입체라는 것, 그리고 구조가 세포 안 어디에 있는지 돌려 보며 이름을 알아봐요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  // 2D 차시와 같은 이름·색
  const ST = {
    wall: { name: '세포벽', ga: '이', color: '#6f8a1f', fn: '세포막 바깥의 단단한 벽이에요. 세포를 보호하고 모양을 일정하게 유지해요.' },
    memb: { name: '세포막', ga: '이', color: '#b7791f', fn: '세포를 둘러싼 얇은 막이에요. 세포 안팎으로 물질이 드나드는 것을 조절해요.' },
    nuc: { name: '핵', ga: '이', color: '#6a43c2', fn: '유전 물질이 들어 있어 세포의 생명 활동을 조절해요.' },
    chl: { name: '엽록체', ga: '가', color: '#23843a', fn: '빛을 받아 광합성을 하여 양분을 만들어요.' },
    mito: { name: '미토콘드리아', ga: '가', color: '#cc4b25', fn: '양분을 분해하여 생명 활동에 필요한 에너지를 얻어요.' },
  };
  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  const narrow = window.innerWidth < 600 || window.innerHeight > window.innerWidth * 1.1;

  window.SciSim3D.attach({
    title: '세포 3D 모형 (잘라 본 모습)',
    hint: '드래그: 돌리기 · 구조를 눌러 이름 알아보기',
    camera: { dist: narrow ? 11.5 : 8.6, theta: 0.75, phi: 1.12, min: 4, max: 18 },
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls, renderer, camera } = ctx;
      renderer.localClippingEnabled = true;
      let kind = 'plant', labelsOn = false, sel = null;
      const groups = { plant: new THREE.Group(), animal: new THREE.Group() };
      root.add(groups.plant, groups.animal);
      const pick = { plant: [], animal: [] };      // 눌러 볼 수 있는 물체 (userData.key)
      const hi = { plant: {}, animal: {} };         // 구조별 강조용 재질
      const labs = { plant: {}, animal: {} };       // 구조별 이름표
      const clipOf = { plant: {}, animal: {} };     // 잘린 영역 (c: x,y,z > c 가 잘림)
      const Vv = THREE.Vector3;

      function std(color, o) { return new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.55, metalness: 0.02 }, o || {})); }
      // 둥근 상자꼴/공꼴 곡면 (|x/a|^n+|y/b|^n+|z/c|^n = 1)
      function superGeo(a, b, c, n) {
        const g = new THREE.SphereGeometry(1, 56, 36), p = g.attributes.position;
        for (let i = 0; i < p.count; i++) {
          const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
          const k = Math.pow(Math.pow(Math.abs(x), n) + Math.pow(Math.abs(y), n) + Math.pow(Math.abs(z), n), 1 / n);
          p.setXYZ(i, x / k * a, y / k * b, z / k * c);
        }
        g.computeVertexNormals(); return g;
      }
      function surfPt(d, a, b, c, n, inset) {
        const k = Math.pow(Math.pow(Math.abs(d.x), n) + Math.pow(Math.abs(d.y), n) + Math.pow(Math.abs(d.z), n), 1 / n);
        return new Vv(d.x / k * (a - inset), d.y / k * (b - inset), d.z / k * (c - inset));
      }
      function cutPlanes(c) { return [new THREE.Plane(new Vv(-1, 0, 0), c), new THREE.Plane(new Vv(0, -1, 0), c), new THREE.Plane(new Vv(0, 0, -1), c)]; }
      function shell(grp, key, geo, color, opa, cut, order, extra) {
        const m = std(color, Object.assign({ transparent: true, opacity: opa, side: THREE.DoubleSide, depthWrite: false, roughness: 0.35, clippingPlanes: cutPlanes(cut), clipIntersection: true, emissive: 0x000000 }, extra || {}));
        const mesh = new THREE.Mesh(geo, m); mesh.renderOrder = order; mesh.userData.key = key; grp.add(mesh);
        return mesh;
      }
      function addHi(kd, key, mat) { (hi[kd][key] = hi[kd][key] || []).push(mat); }
      function ellipsoid(grp, kd, key, pos, quat, rx, ry, rz, mat, inner) {
        const gr = new THREE.Group(); gr.position.copy(pos); if (quat) gr.quaternion.copy(quat);
        const m = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), mat); m.scale.set(rx, ry, rz); m.userData.key = key; gr.add(m);
        pick[kd].push(m); addHi(kd, key, mat);
        if (inner) inner(gr, m);
        grp.add(gr); return gr;
      }
      // 표면에 붙는 방향 (x축 = 긴 쪽이 표면을 따라가게)
      function surfQuat(nrm, spin) {
        const up = Math.abs(nrm.y) > 0.9 ? new Vv(1, 0, 0) : new Vv(0, 1, 0);
        const t = new Vv().crossVectors(up, nrm).normalize(), b = new Vv().crossVectors(nrm, t).normalize();
        t.applyAxisAngle(nrm, spin); b.crossVectors(nrm, t).normalize();
        return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(t, nrm, b));
      }
      function inCut(p, c) { return p.x > c && p.y > c && p.z > c; }

      /* 핵 */
      function makeNucleus(grp, kd, pos, r) {
        const mat = std(0x9a7ce0, { roughness: 0.45 });
        const m = new THREE.Mesh(new THREE.SphereGeometry(r, 36, 24), mat); m.position.copy(pos); m.userData.key = 'nuc'; grp.add(m);
        pick[kd].push(m); addHi(kd, 'nuc', mat);
        const nm = std(0x4b2a96);
        const nu = new THREE.Mesh(new THREE.SphereGeometry(r * 0.3, 20, 14), nm); nu.userData.key = 'nuc';
        nu.position.copy(pos).add(new Vv(0.55, 0.45, 0.55).normalize().multiplyScalar(r * 0.86)); grp.add(nu); pick[kd].push(nu); addHi(kd, 'nuc', nm);
        const dm = std(0x7a5bd0, { roughness: 0.5 });
        for (let i = 0; i < 10; i++) {
          const d = new Vv(Math.sin(i * 2.4) * 0.8, Math.cos(i * 1.7), Math.sin(i * 3.1 + 1)).normalize();
          const s = new THREE.Mesh(new THREE.SphereGeometry(r * 0.1, 10, 8), dm); s.position.copy(pos).add(d.multiplyScalar(r * 0.97)); grp.add(s);
        }
        return m;
      }
      /* 미토콘드리아 */
      function makeMito(grp, kd, pos, quat, s) {
        const mat = std(0xf27b4b, { roughness: 0.45 });
        ellipsoid(grp, kd, 'mito', pos, quat, 0.34 * s, 0.17 * s, 0.17 * s, mat, (gr) => {
          const im = std(0xc4492a, { roughness: 0.6 });
          for (let i = -2; i <= 2; i++) { const f = new THREE.Mesh(new THREE.TorusGeometry(0.1 * s, 0.018 * s, 6, 16), im); f.rotation.y = Math.PI / 2; f.position.x = i * 0.11 * s; f.scale.set(1, 0.75, 1); gr.add(f); }
        });
      }
      /* 엽록체 */
      function makeChl(grp, kd, pos, quat, s) {
        const mat = std(0x4caf50, { roughness: 0.4 });
        ellipsoid(grp, kd, 'chl', pos, quat, 0.32 * s, 0.16 * s, 0.2 * s, mat, (gr) => {
          const gm = std(0x2b7a31);
          [-0.12, 0, 0.12].forEach((x) => { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * s, 0.05 * s, 0.05 * s, 12), gm); st.position.set(x * s, 0.145 * s, 0); gr.add(st); });
        });
      }
      function anchor(grp, kd, key, pos, off) {
        const o = new THREE.Object3D(); o.position.copy(pos); grp.add(o);
        const L = label(ST[key].name, o, { color: ST[key].color, offset: off || [0, 0, 0] }); L.show(false);
        labs[kd][key] = L; return o;
      }

      /* ---------- 식물 세포 ---------- */
      (function () {
        const g = groups.plant, R = rng(4242), kd = 'plant';
        const A = 1.5, B = 1.8, C = 1.25, N = 4.4, WT = 0.17, MI = 0.24, wc = -0.25, mc = 0.2;
        clipOf.plant = { wall: wc, memb: mc };
        const wall = shell(g, 'wall', superGeo(A, B, C, N), 0xa3b955, 0.5, wc, 3, { emissive: 0x000000 });
        const wallIn = shell(g, 'wall', superGeo(A - WT, B - WT, C - WT, N), 0xdcebb0, 0.18, wc, 2);
        const memb = shell(g, 'memb', superGeo(A - MI, B - MI, C - MI, N), 0xe0a82e, 0.34, mc, 1, { roughness: 0.3 });
        pick.plant.push(wall, wallIn, memb);
        addHi(kd, 'wall', wall.material); addHi(kd, 'wall', wallIn.material); addHi(kd, 'memb', memb.material);
        makeNucleus(g, kd, new Vv(-0.26, -0.18, -0.1), 0.45);
        // 엽록체: 세포막 안쪽 둘레(잘린 부분 제외)
        let n = 0, guard = 0;
        while (n < 16 && guard++ < 400) {
          const d = new Vv(R() * 2 - 1, R() * 2 - 1, R() * 2 - 1).normalize();
          const p = surfPt(d, A, B, C, N, 0.42 + R() * 0.12);
          if (p.x > -0.1 && p.y > -0.1 && p.z > -0.1) continue;
          const nr = new Vv(p.x / (A * A), p.y / (B * B), p.z / (C * C)).normalize();
          makeChl(g, kd, p, surfQuat(nr, R() * 6.28), 0.95 + R() * 0.2); n++;
        }
        // 미토콘드리아 6개
        [[0.62, -0.92, 0.3], [0.84, 0.46, -0.5], [-0.84, 0.86, 0.3], [0.24, 1.12, -0.3], [-0.94, -1.04, 0.2], [0.92, -0.1, 0.6]].forEach((q, i) => {
          makeMito(g, kd, new Vv(q[0], q[1], q[2]), new THREE.Quaternion().setFromEuler(new THREE.Euler(R() * 3, R() * 3, R() * 3)), 0.92 + R() * 0.16);
        });
        // 이름표 기준점
        anchor(g, kd, 'wall', surfPt(new Vv(-1, 0.28, 0.1), A, B, C, N, 0.0), [-0.45, 0, 0]);
        anchor(g, kd, 'memb', surfPt(new Vv(-1, -0.45, 0.45), A, B, C, N, MI), [0, 0, 0]);
        anchor(g, kd, 'nuc', new Vv(-0.26, -0.18, -0.1).add(new Vv(0, 0.5, 0.0)), [0, 0, 0]);
        // 엽록체·미토콘드리아 대표 (눈에 잘 띄는 것)
        let cOne = null, mOne = null;
        g.children.forEach((o) => { if (o.children && o.children[0] && o.children[0].userData.key === 'chl' && !cOne && o.position.z > -0.2 && o.position.x < 0.4) cOne = o; if (o.children && o.children[0] && o.children[0].userData.key === 'mito' && !mOne && o.position.z > 0) mOne = o; });
        const ca = new THREE.Object3D(); (cOne || g).add(ca); ca.position.set(0, 0.28, 0); const cl = label(ST.chl.name, ca, { color: ST.chl.color }); cl.show(false); labs.plant.chl = cl;
        const ma = new THREE.Object3D(); (mOne || g).add(ma); ma.position.set(0, 0.26, 0); const ml = label(ST.mito.name, ma, { color: ST.mito.color }); ml.show(false); labs.plant.mito = ml;
      })();

      /* ---------- 동물 세포 ---------- */
      (function () {
        const g = groups.animal, R = rng(777), kd = 'animal';
        const A = 1.75, B = 1.55, C = 1.55, N = 2, mc = -0.1;
        clipOf.animal = { memb: mc };
        const memb = shell(g, 'memb', superGeo(A, B, C, N), 0xf3a6b5, 0.4, mc, 1, { roughness: 0.3 });
        const membIn = shell(g, 'memb', superGeo(A - 0.06, B - 0.06, C - 0.06, N), 0xfbd5cf, 0.2, mc, 0);
        pick.animal.push(memb, membIn); addHi(kd, 'memb', memb.material); addHi(kd, 'memb', membIn.material);
        makeNucleus(g, kd, new Vv(0.08, 0.04, -0.1), 0.45);
        [[-0.92, -0.48, 0.35], [0.7, -0.86, -0.4], [0.96, 0.56, 0.5], [-0.66, 0.82, -0.5], [0.1, 1.12, 0.3], [-1.1, 0.26, -0.3], [0.3, -1.16, 0.5]].forEach((q) => {
          makeMito(g, kd, new Vv(q[0], q[1], q[2]), new THREE.Quaternion().setFromEuler(new THREE.Euler(R() * 3, R() * 3, R() * 3)), 0.92 + R() * 0.16);
        });
        anchor(g, kd, 'memb', surfPt(new Vv(-1, -0.55, 0.6), A, B, C, N, 0.0), [0, 0, 0]);
        anchor(g, kd, 'nuc', new Vv(0.08, 0.54, -0.1), [0, 0, 0]);
        let mOne = null; g.children.forEach((o) => { if (o.children && o.children[0] && o.children[0].userData.key === 'mito' && !mOne && o.position.x < -0.5 && o.position.z > 0) mOne = o; });
        const ma = new THREE.Object3D(); (mOne || g).add(ma); ma.position.set(0, 0.26, 0); const ml = label(ST.mito.name, ma, { color: ST.mito.color }); ml.show(false); labs.animal.mito = ml;
      })();

      /* ---------- 누르기 (이름 알아보기) ---------- */
      const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
      const dom = renderer.domElement; let down = null;
      dom.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
      dom.addEventListener('pointerup', (e) => {
        if (!down) return; const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y); down = null;
        if (moved > 6) return;
        const r = dom.getBoundingClientRect();
        ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(ndc, camera);
        const hits = ray.intersectObjects(pick[kind], false).filter((h) => {
          const k = h.object.userData.key, c = clipOf[kind][k];
          return !(c !== undefined && inCut(h.point, c));
        });
        const solid = hits.find((h) => ['nuc', 'chl', 'mito'].indexOf(h.object.userData.key) >= 0);
        const h = solid || hits[0];
        select(h ? h.object.userData.key : null);
      });

      function select(key) {
        sel = key; refresh();
      }
      function refresh() {
        Object.keys(labs).forEach((k) => Object.keys(labs[k]).forEach((key) => labs[k][key].show(k === kind && (labelsOn || sel === key))));
        const isP = kind === 'plant';
        let h = '<b>' + (isP ? '🌿 식물 세포' : '🐾 동물 세포') + '</b> · 잘라 본 모습<br>';
        if (sel) {
          const s = ST[sel];
          h += '<b style="color:#ffd34d">' + s.name + '</b><br>' + s.fn;
        } else {
          h += isP ? '세포벽 · 세포막 · 핵 · 엽록체 · 미토콘드리아가 모두 있어요. 구조를 눌러 이름을 알아봐요.'
            : '세포막 · 핵 · 미토콘드리아가 있어요. <b>세포벽과 엽록체는 없어요.</b> 구조를 눌러 보세요.';
        }
        info(h);
      }
      controls.segment('세포', [{ value: 'plant', label: '🌿 식물 세포' }, { value: 'animal', label: '🐾 동물 세포' }], kind, (v) => {
        kind = v; sel = null; groups.plant.visible = v === 'plant'; groups.animal.visible = v === 'animal'; refresh();
      });
      const lb = controls.button('이름표 보기', () => { labelsOn = !labelsOn; lb.classList.toggle('on', labelsOn); lb.textContent = labelsOn ? '이름표 가리기' : '이름표 보기'; refresh(); });
      groups.animal.visible = false;
      refresh();

      return {
        update(dt, t) {
          const pulse = 0.35 + 0.25 * Math.sin(t * 6);
          Object.keys(hi).forEach((k) => Object.keys(hi[k]).forEach((key) => {
            const on = k === kind && sel === key, col = new THREE.Color(ST[key].color);
            hi[k][key].forEach((m) => { m.emissive.copy(col).multiplyScalar(on ? pulse : 0); });
          }));
        },
      };
    },
  });
})();
