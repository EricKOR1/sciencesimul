/* m2-build-atom · 3D 원자 모형 (원자핵 + 전자 껍질)
   2D 실험의 양성자·중성자·전자 수(window.__sim)를 따라 3D 원자가 바뀌어요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const ELS = ['', '수소', '헬륨', '리튬', '베릴륨', '붕소', '탄소', '질소', '산소', '플루오린', '네온', '나트륨', '마그네슘', '알루미늄', '규소', '인', '황', '염소', '아르곤', '칼륨', '칼슘'];
  const CAP = [2, 8, 8, 4];

  window.SciSim3D.attach({
    title: '원자 3D 모형',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHN ? 11 : 8.2, theta: 0.6, phi: 1.2, min: 4, max: 22 },
    autoRotate: 0.12,
    levels: [1, 2],                  // 1단계(입자 눌러 보기)는 2D 화면에서 해요
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const sm = () => window.__sim;
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.4, metalness: 0.05 }, o || {}));
      const geoP = new THREE.SphereGeometry(1, 32, 20);
      const mP = mat(0xe2464b, { roughness: 0.35 }), mN = mat(0xaab3c2, { roughness: 0.5 }), mE = mat(0x4a78ff, { roughness: 0.25, emissive: 0x1b3aa8, emissiveIntensity: 0.55 });
      const nuc = new THREE.Group(), shells = new THREE.Group(); root.add(nuc, shells);
      const halo = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), new THREE.MeshBasicMaterial({ color: 0xff8a8a, transparent: true, opacity: 0.12, depthWrite: false }));
      nuc.add(halo);
      const R = [1.45, 2.25, 3.05, 3.8];
      const nucB = []; const nucMeshes = [];
      const elM = [];
      const tilt = [[0.4, 0], [1.1, 0.9], [0.2, 2.1], [1.5, 3.3]];
      const rings = [], grp = [];
      for (let k = 0; k < 4; k++) {
        const g = new THREE.Group(); g.rotation.set(tilt[k][0], tilt[k][1], 0); shells.add(g); grp.push(g);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(R[k], 0.018, 8, 128), new THREE.MeshBasicMaterial({ color: 0x9db6ff, transparent: true, opacity: 0.5 }));
        ring.rotation.x = Math.PI / 2; g.add(ring); rings.push(ring);
      }
      for (let i = 0; i < 20; i++) { const m = new THREE.Mesh(geoP, mE); m.scale.setScalar(0.2); m.castShadow = true; shells.add(m); elM.push(m); }
      let tiny = false, labs = true;
      let cur = { p: -1, n: -1, e: -1 }, sNuc = 1;
      const labNuc = label('원자핵 (+)', nuc, { offset: [0, 1.2, 0] });
      const labE = label('전자 (−)', elM[0], { offset: [0, 0.3, 0] });

      function pos(i, N, r) { // 피보나치 구
        const y = N === 1 ? 0 : 1 - 2 * i / (N - 1), rr = Math.sqrt(Math.max(0, 1 - y * y)), a = i * 2.39996;
        return [Math.cos(a) * rr * r, y * r, Math.sin(a) * rr * r];
      }
      function rebuild(p, n) {
        while (nuc.children.length > 1) nuc.remove(nuc.children[1]);
        const N = p + n, rp = 0.27, nr = N === 1 ? 0 : rp * Math.pow(N, 1 / 3) * 0.9;
        const order = []; for (let i = 0; i < N; i++) order.push(Math.floor((i + 1) * p / N) > Math.floor(i * p / N) ? 'p' : 'n');
        for (let i = 0; i < N; i++) {
          const m = new THREE.Mesh(geoP, order[i] === 'p' ? mP : mN); m.scale.setScalar(rp);
          const q = N === 1 ? [0, 0, 0] : pos(i, N, nr); m.position.set(q[0], q[1], q[2]); m.castShadow = true; nuc.add(m);
        }
        halo.scale.setScalar(nr + rp * 1.6);
        sNuc = nr + rp;
        labNuc.el.style.display = '';
      }
      function text() {
        const s = sm(); if (!s) return;
        const p = s.np(), n = s.nn(), e = s.ne(), q = p - e;
        const nm = ELS[Math.min(20, Math.max(1, p))] || '';
        const t = q === 0 ? '전체 전하 0 → <b>전기적으로 중성</b>' : (q > 0 ? '전체 전하 +' + q : '전체 전하 −' + (-q)) + ' → 중성이 아니에요';
        info(`<b style="color:#ff8f8f">양성자 ${p}</b> · <span style="color:#c6cdd9">중성자 ${n}</span> · <b style="color:#8fb0ff">전자 ${e}</b><br>양성자 수 ${p} → <b>${nm}</b> 원자<br>${t}`);
      }
      function apply() {
        const s = sm(); if (!s) return;
        const p = s.np(), n = s.nn(), e = Math.min(20, s.ne());
        if (p !== cur.p || n !== cur.n) { rebuild(p, n); cur.p = p; cur.n = n; }
        cur.e = e; text();
      }
      controls.segment('크기', [{ label: '모형', value: false }, { label: '실제 비율 느낌', value: true }], false, (v) => { tiny = v; });
      controls.button('이름표 켜기/끄기', () => { labs = !labs; labNuc.show(labs); labE.show(labs); });
      controls.button('양성자 +', () => sm() && sm().plus('p'));
      controls.button('양성자 −', () => sm() && sm().minus('p'));
      controls.button('전자 +', () => sm() && sm().plus('e'));
      controls.button('전자 −', () => sm() && sm().minus('e'));
      let ph = [0, 0, 0, 0], k0 = 0;
      return {
        sync() { cur.p = -1; apply(); },
        update(dt, t) {
          if ((k0++ % 6) === 0) apply();
          const e = cur.e; let idx = 0, left = e;
          const target = tiny ? 0.28 : 1;
          nuc.scale.x += (target - nuc.scale.x) * Math.min(1, dt * 4); nuc.scale.setScalar(nuc.scale.x);
          for (let k = 0; k < 4; k++) {
            const cnt = Math.min(CAP[k], Math.max(0, left)); left -= cnt;
            rings[k].visible = cnt > 0 || k === 0 && e === 0;
            ph[k] += dt * [0.9, 0.6, 0.45, 0.35][k];
            for (let j = 0; j < cnt; j++) {
              const a = ph[k] + j / cnt * Math.PI * 2, m = elM[idx++];
              const v = new THREE.Vector3(Math.cos(a) * R[k], 0, Math.sin(a) * R[k]).applyEuler(grp[k].rotation);
              m.position.copy(v); m.visible = true;
            }
          }
          for (; idx < 20; idx++) elM[idx].visible = false;
          if (e === 0) labE.show(false); else labE.show(labs);
          halo.material.opacity = 0.1 + 0.04 * Math.sin(t * 2);
        },
      };
    },
  });
})();
