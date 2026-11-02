/* m2-ion · 3D 이온의 형성 (전자를 잃으면 양이온, 얻으면 음이온)
   2D 실험의 양성자 수·전자 수(window.__sim)를 따라 3D 모형이 바뀌어요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const SYM = ['', 'H', 'He', 'Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne', 'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar', 'K', 'Ca'];
  const CAP = [2, 8, 8, 4];
  const NEUT = [0, 0, 2, 4, 5, 6, 6, 7, 8, 10, 10, 12, 12, 14, 14, 16, 16, 18, 22, 20, 20];

  window.SciSim3D.attach({
    title: '이온 3D 모형',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHN ? 11 : 8.2, theta: 0.6, phi: 1.2, min: 4, max: 22 },
    autoRotate: 0.12,
    levels: [0, 1, 2],
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const sm = () => window.__sim;
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.4, metalness: 0.05 }, o || {}));
      const geo = new THREE.SphereGeometry(1, 32, 20);
      const mP = mat(0xe2464b, { roughness: 0.35 }), mN = mat(0xaab3c2, { roughness: 0.5 });
      const mE = mat(0x4a78ff, { roughness: 0.25, emissive: 0x1b3aa8, emissiveIntensity: 0.55 });
      const nuc = new THREE.Group(), shells = new THREE.Group(); root.add(nuc, shells);
      const R = [1.45, 2.25, 3.05, 3.8];
      const tilt = [[0.4, 0], [1.1, 0.9], [0.2, 2.1], [1.5, 3.3]];
      const rings = [], grp = [], elM = [];
      for (let k = 0; k < 4; k++) {
        const g = new THREE.Group(); g.rotation.set(tilt[k][0], tilt[k][1], 0); shells.add(g); grp.push(g);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(R[k], 0.018, 8, 128), new THREE.MeshBasicMaterial({ color: 0x9db6ff, transparent: true, opacity: 0.5 }));
        ring.rotation.x = Math.PI / 2; g.add(ring); rings.push(ring);
      }
      for (let i = 0; i < 20; i++) { const m = new THREE.Mesh(geo, mE); m.scale.setScalar(0.2); m.castShadow = true; shells.add(m); elM.push(m); }
      const aura = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x3ddc84, transparent: true, opacity: 0.12, depthWrite: false }));
      root.add(aura);
      const labA = label('', aura, { offset: [0, 0, 0] });
      let cur = { p: -1, e: -1 }, auraR = 2, auraT = 2, k0 = 0;
      const ph = [0, 0, 0, 0];
      function pos(i, N, r) { const y = N === 1 ? 0 : 1 - 2 * i / (N - 1), rr = Math.sqrt(Math.max(0, 1 - y * y)), a = i * 2.39996; return [Math.cos(a) * rr * r, y * r, Math.sin(a) * rr * r]; }
      function rebuild(p) {
        while (nuc.children.length) nuc.remove(nuc.children[0]);
        const n = NEUT[p], N = p + n, rp = 0.27, nr = rp * Math.pow(N, 1 / 3) * 0.9;
        for (let i = 0; i < N; i++) {
          const isP = Math.floor((i + 1) * p / N) > Math.floor(i * p / N);
          const m = new THREE.Mesh(geo, isP ? mP : mN); m.scale.setScalar(rp);
          const q = pos(i, N, nr); m.position.set(q[0], q[1], q[2]); m.castShadow = true; nuc.add(m);
        }
      }
      function shellsUsed(n) { let k = 0, c = 0; for (; k < 4; k++) { c += CAP[k]; if (n <= c) return k + 1; } return 4; }
      function apply() {
        const s = sm(); if (!s) return;
        const p = Math.max(1, Math.min(20, s.np())), e = Math.min(20, s.ne()), q = p - e;
        if (p !== cur.p) { rebuild(p); }
        cur.p = p; cur.e = e;
        const used = e > 0 ? shellsUsed(e) : 0;
        auraT = used ? R[used - 1] + 0.45 : 0.9;
        const col = q === 0 ? 0x3ddc84 : q > 0 ? 0xff5a5f : 0x4a78ff;
        aura.material.color.setHex(col);
        const sym = SYM[p] + (q ? (Math.abs(q) > 1 ? '⁰¹²³⁴⁵⁶⁷⁸⁹'[Math.abs(q)] : '') + (q > 0 ? '⁺' : '⁻') : '');
        const kind = q === 0 ? '원자 (중성)' : q > 0 ? '양이온' : '음이온';
        const how = q === 0 ? '양성자 수 = 전자 수' : q > 0 ? `전자 ${q}개를 <b>잃어서</b> (+)가 더 많아요` : `전자 ${-q}개를 <b>얻어서</b> (−)가 더 많아요`;
        info(`<b>${sym}</b> · ${kind}<br><b style="color:#ff8f8f">양성자 ${p}</b> · <b style="color:#8fb0ff">전자 ${e}</b> → 전하 ${q > 0 ? '+' + q : q < 0 ? '−' + (-q) : '0'}<br>${how}`);
        labA.set(sym); labA.el.style.fontSize = '17px';
      }
      controls.segment('원소', [{ label: 'Na', value: 11 }, { label: 'Mg', value: 12 }, { label: 'O', value: 8 }, { label: 'Cl', value: 17 }], 11, (p) => { const s = sm(); if (s) { s.setState(p, p); apply(); } });
      controls.button('전자 잃기 −1', () => sm() && sm().minusE());
      controls.button('전자 얻기 +1', () => sm() && sm().plusE());
      controls.text('원자핵의 양성자 수는 그대로예요');
      return {
        sync() { cur.p = -1; apply(); },
        update(dt, t) {
          if ((k0++ % 6) === 0) apply();
          auraR += (auraT - auraR) * Math.min(1, dt * 5); aura.scale.setScalar(auraR);
          labA.show(false);
          let idx = 0, left = cur.e;
          for (let k = 0; k < 4; k++) {
            const cnt = Math.min(CAP[k], Math.max(0, left)); left -= cnt;
            rings[k].visible = cnt > 0;
            ph[k] += dt * [0.9, 0.6, 0.45, 0.35][k];
            for (let j = 0; j < cnt; j++) {
              const a = ph[k] + j / cnt * Math.PI * 2, m = elM[idx++];
              m.position.set(Math.cos(a) * R[k], 0, Math.sin(a) * R[k]).applyEuler(grp[k].rotation); m.visible = true;
            }
          }
          for (; idx < 20; idx++) elM[idx].visible = false;
          aura.material.opacity = 0.1 + 0.035 * Math.sin(t * 2);
        },
      };
    },
  });
})();
