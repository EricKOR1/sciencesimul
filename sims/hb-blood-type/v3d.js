/* hb-blood-type · 3D 적혈구의 응집원과 혈장의 응집소 (ABO식 혈액형 · 항원-항체 반응)
   적혈구 표면의 응집원(A, B)과 모양이 맞는 응집소(항체)만 결합해 적혈구를 엉기게 해요(응집 반응). */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const narrow = window.innerWidth < 600 || window.innerHeight > window.innerWidth * 1.1;
  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  const TYPES = { A: { ag: ['A'], ab: ['b'] }, B: { ag: ['B'], ab: ['a'] }, AB: { ag: ['A', 'B'], ab: [] }, O: { ag: [], ab: ['a', 'b'] } };

  window.SciSim3D.attach({
    title: '혈액형과 응집 반응 3D',
    hint: '혈액형과 혈청을 골라 [섞기]를 눌러 봐요',
    camera: { dist: narrow ? 12.5 : 10, theta: 0.4, phi: 1.15, min: 5, max: 20 },
    autoRotate: 0.1,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V = THREE.Vector3, V3 = (x, y, z) => new V(x, y, z || 0);
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.45, metalness: 0.03 }, o || {}));
      const R = rng(17), D = new THREE.Object3D(), ease = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };

      /* 적혈구 (오목 원반) */
      const prof = [], f = (p) => Math.sqrt(Math.max(0, 1 - p * p)) * (0.207 + 2.003 * p * p - 1.123 * p * p * p * p) * 0.5;
      for (let i = 0; i <= 36; i++) { const p = i / 36; prof.push(new THREE.Vector2(p, f(p))); } for (let i = 36; i >= 0; i--) { const p = i / 36; prof.push(new THREE.Vector2(p, -f(p))); }
      const rbcGeo = new THREE.LatheGeometry(prof, 48);
      const rbcM = std(0xd9453a, { roughness: 0.38, transparent: true, opacity: 0.92 });
      const NR = 6, cells = [];
      const disp = [V3(-3.0, 0.8, 0.6), V3(0.2, 2.0, -1.2), V3(3.0, 0.6, 0.8), V3(-1.6, -1.8, 1.2), V3(1.9, -1.7, -0.8), V3(-0.2, 0.0, 2.4)];
      const clus = [V3(0, 0, 0)].concat([0, 1, 2, 3, 4].map((k) => V3(Math.cos(k * 1.2566 + 0.3) * 2.0, (k % 2 ? 0.25 : -0.25), Math.sin(k * 1.2566 + 0.3) * 2.0)));
      for (let i = 0; i < NR; i++) {
        const m = new THREE.Mesh(rbcGeo, rbcM); m.scale.setScalar(1.0); root.add(m);
        const q0 = new THREE.Quaternion().setFromEuler(new THREE.Euler((R() - 0.5) * 1.6, R() * 6, (R() - 0.5) * 1.6));
        cells.push({ m, q0, qc: new THREE.Quaternion().setFromEuler(new THREE.Euler((R() - 0.5) * 0.5 + 0.0, 0, (R() - 0.5) * 0.5)), ph: R() * 6 });
      }
      /* 응집원 */
      const sites = []; for (let k = 0; k < 16; k++) { const ph = k * 2.39996, p = 0.25 + 0.7 * Math.sqrt((k + 0.5) / 16), side = k % 2 ? 1 : -1, y = side * (f(p) + 0.02); sites.push({ pos: V3(Math.cos(ph) * p, y, Math.sin(ph) * p), nrm: V3(0, side, 0) }); }
      sites.push({ pos: V3(1.0, 0, 0), nrm: V3(1, 0, 0) }, { pos: V3(-1.0, 0, 0), nrm: V3(-1, 0, 0) }, { pos: V3(0, 0, 1.0), nrm: V3(0, 0, 1) }, { pos: V3(0, 0, -1.0), nrm: V3(0, 0, -1) });
      const NS = sites.length;
      const aG = new THREE.ConeGeometry(0.1, 0.3, 4); aG.translate(0, 0.15, 0); aG.rotateX(Math.PI);  // 뾰족한 끝이 바깥을 향해 서도록
      const aGeo = new THREE.ConeGeometry(0.11, 0.3, 5); aGeo.translate(0, 0.15, 0);
      const bGeo = (() => { const s = new THREE.SphereGeometry(0.12, 12, 9); s.translate(0, 0.28, 0); const st = new THREE.CylinderGeometry(0.03, 0.03, 0.2, 6); st.translate(0, 0.1, 0); const pos = [], idx = []; let off = 0; [s, st].forEach((g) => { for (let i = 0; i < g.attributes.position.count; i++) pos.push(g.attributes.position.getX(i), g.attributes.position.getY(i), g.attributes.position.getZ(i)); g.index.array.forEach((k) => idx.push(k + off)); off += g.attributes.position.count; }); const o = new THREE.BufferGeometry(); o.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); o.setIndex(idx); o.computeVertexNormals(); return o; })();
      const aI = new THREE.InstancedMesh(aGeo, std(0x1fb85c, { roughness: 0.35, emissive: 0x0a4a22, emissiveIntensity: 0.4 }), NR * NS), bI = new THREE.InstancedMesh(bGeo, std(0xff8a2d, { roughness: 0.35, emissive: 0x6a3000, emissiveIntensity: 0.4 }), NR * NS);
      root.add(aI, bI);

      /* 응집소 (Y 항체) */
      function merged(parts) { const pos = [], nor = [], col = [], idx = []; let off = 0; parts.forEach(([geo, mat, color]) => { const g = geo.clone().applyMatrix4(mat); const c = new THREE.Color(color), p = g.attributes.position, n = g.attributes.normal; for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i)); col.push(c.r, c.g, c.b); } g.index.array.forEach((k) => idx.push(k + off)); off += p.count; }); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); return g; }
      function yGeo(tip) {
        const M = (x, y, z, rz) => new THREE.Matrix4().compose(V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, rz || 0)), V3(1, 1, 1));
        const cyl = (r, h) => new THREE.CylinderGeometry(r, r, h, 10), L1 = 0.55, L2 = 0.62, ang = 0.7;
        const parts = [[cyl(0.075, L1), M(0, L1 / 2, 0), 0xb9dcff], [new THREE.SphereGeometry(0.085, 10, 8), M(0, 0, 0), 0xb9dcff]];
        [-1, 1].forEach((sd) => { const dx = Math.sin(ang) * L2, dy = Math.cos(ang) * L2; parts.push([cyl(0.075, L2), M(sd * dx / 2, L1 + dy / 2, 0, -sd * ang), 0xb9dcff], [new THREE.SphereGeometry(0.115, 10, 8), M(sd * dx, L1 + dy, 0), tip]); });
        return merged(parts);
      }
      const NF = 22;
      const abA = new THREE.InstancedMesh(yGeo(0x1fe070), std(0xffffff, { vertexColors: true, roughness: 0.35 }), NF), abB = new THREE.InstancedMesh(yGeo(0xff8a2d), std(0xffffff, { vertexColors: true, roughness: 0.35 }), NF);
      root.add(abA, abB);
      const fr = (n) => Array.from({ length: n }, () => ({ p: V3((R() - 0.5) * 8, (R() - 0.5) * 4.2, (R() - 0.5) * 5), v: V3(R() - 0.5, R() - 0.5, R() - 0.5).multiplyScalar(0.5), q: new THREE.Quaternion().setFromEuler(new THREE.Euler(R() * 6, R() * 6, R() * 6)), spin: V3(R() - 0.5, R() - 0.5, R() - 0.5).normalize(), w: 0.4 + R() * 0.6 }));
      const freeA = fr(NF), freeB = fr(NF);

      const lab = {
        rbc: label('적혈구', cells[0].m, { offset: [0, 1.2, 0] }),
        ag: label('응집원', null, { color: 'rgba(31,184,92,.92)' }),
        ab: label('응집소', null, { color: 'rgba(40,120,200,.92)' }),
      };

      let type = 'A', serum = 'none', agg = 0, mixing = false, lastKey = '';
      function matches() { const g = TYPES[type].ag; return (serum === 'a' && g.indexOf('A') >= 0) || (serum === 'b' && g.indexOf('B') >= 0); }
      controls.segment('혈액형', ['A', 'B', 'AB', 'O'].map((k) => ({ label: k + '형', value: k })), 'A', (v) => { type = v; agg = 0; mixing = false; });
      controls.segment('혈청', [{ label: '없음', value: 'none' }, { label: '항A 혈청', value: 'a' }, { label: '항B 혈청', value: 'b' }], 'none', (v) => { serum = v; agg = 0; mixing = false; });
      controls.button('▶ 섞기', () => { mixing = true; });
      controls.button('↺ 되돌리기', () => { mixing = false; });

      const link = []; for (let k = 0; k < 5; k++) { link.push([0, k + 1]); link.push([k + 1, ((k + 1) % 5) + 1]); }
      const tmpM = new THREE.Matrix4(), siteM = new THREE.Matrix4(), q = new THREE.Quaternion(), up = V3(0, 1, 0);
      return {
        update(dt, t) {
          const doAgg = mixing && matches(); agg += ((doAgg ? 1 : 0) - agg) * Math.min(1, dt * (doAgg ? 1.1 : 2.2));
          const u = ease(agg);
          let ia = 0, ib = 0;
          const hasA = TYPES[type].ag.indexOf('A') >= 0, hasB = TYPES[type].ag.indexOf('B') >= 0;
          const poses = [];
          cells.forEach((c, i) => {
            const base = disp[i].clone(); base.x += Math.sin(t * 0.5 + c.ph) * 0.15; base.y += Math.cos(t * 0.4 + c.ph * 2) * 0.15;
            const pos = base.lerp(clus[i], u), qq = c.q0.clone().slerp(c.qc, u); qq.multiply(new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), (1 - u) * t * 0.2));
            c.m.position.copy(pos); c.m.quaternion.copy(qq); poses.push([pos, qq]);
            sites.forEach((s, k) => {
              const useA = hasA && (!hasB || (k % 2 === 0)), useB = hasB && (!hasA || (k % 2 === 1));
              const loc = new THREE.Matrix4().compose(s.pos, new THREE.Quaternion().setFromUnitVectors(up, s.nrm), V3(1, 1, 1));
              tmpM.compose(pos, qq, V3(1, 1, 1)); siteM.multiplyMatrices(tmpM, loc);
              if (useA) aI.setMatrixAt(ia++, siteM); else if (useB) bI.setMatrixAt(ib++, siteM);
            });
          });
          D.position.set(0, -80, 0); D.scale.setScalar(0.001); D.quaternion.identity(); D.updateMatrix();
          for (let i = ia; i < NR * NS; i++) aI.setMatrixAt(i, D.matrix); for (let i = ib; i < NR * NS; i++) bI.setMatrixAt(i, D.matrix);
          aI.instanceMatrix.needsUpdate = true; bI.instanceMatrix.needsUpdate = true;
          // 응집소: 혈청이 없으면 혈장 속 자기 응집소, 있으면 혈청의 응집소
          const wantA = serum === 'a' ? NF : serum === 'none' ? (TYPES[type].ab.indexOf('a') >= 0 ? 10 : 0) : 0;
          const wantB = serum === 'b' ? NF : serum === 'none' ? (TYPES[type].ab.indexOf('b') >= 0 ? 10 : 0) : 0;
          const place = (mesh, arr, want, matched) => {
            let used = 0;
            for (let i = 0; i < NF; i++) {
              const a = arr[i];
              if (i >= want) { D.position.set(0, -80, 0); D.scale.setScalar(0.001); D.quaternion.identity(); D.updateMatrix(); mesh.setMatrixAt(i, D.matrix); continue; }
              a.p.addScaledVector(a.v, dt); ['x', 'y', 'z'].forEach((ax, k) => { const lim = [4.2, 2.6, 2.8][k]; if (Math.abs(a.p[ax]) > lim) { a.v[ax] *= -1; a.p[ax] = Math.sign(a.p[ax]) * lim; } });
              a.q.premultiply(new THREE.Quaternion().setFromAxisAngle(a.spin, dt * a.w));
              let pos = a.p, qq = a.q;
              if (matched && i < link.length) {
                const [x, y] = link[i], pa = poses[x][0], pb = poses[y][0], mid = pa.clone().add(pb).multiplyScalar(0.5), dir = pb.clone().sub(pa).normalize();
                const qt = new THREE.Quaternion().setFromUnitVectors(V3(1, 0, 0), dir); const target = mid; const k = ease((agg - 0.45) / 0.5);
                pos = a.p.clone().lerp(target, k); qq = a.q.clone().slerp(qt.multiply(new THREE.Quaternion().setFromAxisAngle(V3(1, 0, 0), 0.5 * i)), k);
              }
              D.position.copy(pos); D.quaternion.copy(qq); D.scale.setScalar(1.35); D.updateMatrix(); mesh.setMatrixAt(i, D.matrix); used++;
            }
            mesh.instanceMatrix.needsUpdate = true;
          };
          place(abA, freeA, wantA, serum === 'a' && matches() && mixing); place(abB, freeB, wantB, serum === 'b' && matches() && mixing);
          // 이름표
          const p0 = poses[0][0];
          lab.ag.obj = [p0.x, p0.y + 1.45, p0.z]; lab.ag.off = [0, 0, 0];
          const fa = wantA ? freeA[0] : wantB ? freeB[0] : null;
          lab.ab.obj = fa ? [fa.p.x, fa.p.y + 0.7, fa.p.z] : [0, 3, 0]; lab.ab.off = [0, 0, 0];
          const key = type + serum + (mixing ? 'm' : '') + (agg > 0.9 ? 'g' : '');
          if (key !== lastKey) {
            lastKey = key;
            const T = TYPES[type];
            const agTxt = T.ag.length ? T.ag.map((x) => '응집원 ' + x).join(' + ') : '응집원 없음';
            const abTxt = T.ab.length ? T.ab.map((x) => (x === 'a' ? '응집소 α(항A)' : '응집소 β(항B)')).join(' + ') : '응집소 없음';
            lab.ag.set(T.ag.length ? '응집원 ' + T.ag.join('·') : '응집원 없음'); lab.ag.show(true);
            lab.ab.set(serum === 'a' ? '항A 혈청의 응집소 α' : serum === 'b' ? '항B 혈청의 응집소 β' : (T.ab.length ? '혈장의 ' + (T.ab[0] === 'a' ? '응집소 α(항A)' : '응집소 β(항B)') : '응집소 없음'));
            lab.ab.show(serum !== 'none' || T.ab.length > 0);
            if (serum === 'none') info('<b>' + type + '형</b>: 적혈구에 ' + agTxt + ', 혈장에 ' + abTxt + '<br>혈청을 골라 섞어 보세요.');
            else if (!mixing) info('<b>' + type + '형</b> 혈액 + <b>' + (serum === 'a' ? '항A' : '항B') + ' 혈청</b>: [섞기]를 눌러 봐요.');
            else info(matches() ? '<b>응집 반응 일어남</b>: 응집원과 응집소의 모양이 맞아 결합하고, 적혈구가 엉겨요.' : '<b>응집 없음</b>: 응집원과 응집소의 모양이 맞지 않아 결합하지 않아요.');
          }
        },
        sync() {},
      };
    },
  });
})();
