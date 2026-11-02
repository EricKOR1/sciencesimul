/* hs-seismic-waves · 3D 지진파 (P파 · S파 · 표면파)
   암석 덩어리를 작은 알갱이(입자)로 나타내고, 파가 지나갈 때 알갱이가 어느 방향으로 흔들리는지 입체로 봐요.
   P파는 진행 방향과 나란히(종파), S파는 진행 방향에 수직으로(횡파), 표면파는 표면에서 타원을 그리며 흔들려요.
   S파는 액체에서 전달되지 않아요. 2D 실험에서 고른 파·매질을 읽어 시작해요(읽기 전용). */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const NX = 19, NY = 6, NZ = 5, SP = 0.5, X0 = -(NX - 1) * SP / 2;
  const W = 2 * Math.PI * 0.8;                       // 각진동수
  const SPEED = { P: 2.4, S: 1.4, R: 1.05 };          // P > S > 표면파
  const AMP = { P: 0.2, S: 0.2, R: 0.17 };
  const NAME = { P: 'P파', S: 'S파', R: '표면파' };

  window.SciSim3D.attach({
    title: '지진파와 입자의 진동 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    levels: [1],
    camera: { dist: PHONE ? 17 : 12.5, theta: 0.42, phi: 1.2, min: 7, max: 30, target: [0, 0.1, 0] },
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const st = { wave: 'P', med: 'solid', t: 0, mark: true };
      try { const S = window.__sim && window.__sim.S; if (S) { if (S.wave) st.wave = S.wave; if (S.med) st.med = S.med; } } catch (e) {}
      const N = NX * NY * NZ, Y0 = 1.2;

      /* 암석 덩어리 (반투명 상자) */
      const boxMat = new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 0.9, transparent: true, opacity: 0.16, depthWrite: false });
      const blk = new THREE.Mesh(new THREE.BoxGeometry(NX * SP, NY * SP, NZ * SP), boxMat);
      blk.position.set(0, Y0 - (NY - 1) * SP / 2 - 0.0, 0); root.add(blk);
      const edge = new THREE.LineSegments(new THREE.EdgesGeometry(blk.geometry), new THREE.LineBasicMaterial({ color: 0xcaa57a, transparent: true, opacity: 0.55 }));
      edge.position.copy(blk.position); root.add(edge);

      /* 입자 격자 */
      const geo = new THREE.SphereGeometry(0.1, 14, 10);
      const mat = new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.05 });
      const im = new THREE.InstancedMesh(geo, mat, N); im.frustumCulled = false; root.add(im);
      const base = new Float32Array(N * 3), col = new THREE.Color();
      let k = 0;
      for (let i = 0; i < NX; i++) for (let j = 0; j < NY; j++) for (let z = 0; z < NZ; z++, k++) {
        base[k * 3] = X0 + i * SP; base[k * 3 + 1] = Y0 - j * SP; base[k * 3 + 2] = (z - (NZ - 1) / 2) * SP;
        const slab = i % 4 === 0;
        col.set(slab ? 0xff9f43 : 0x7fb4ff); if (slab && z === 2 && j === 0) col.set(0xff4d6d);
        im.setColorAt(k, col);
      }
      im.instanceColor.needsUpdate = true;
      const arr = im.instanceMatrix.array;
      for (let n = 0; n < N; n++) { arr[n * 16] = arr[n * 16 + 5] = arr[n * 16 + 10] = arr[n * 16 + 15] = 1; }

      /* 진원: 덩어리 왼쪽 면에서 흔드는 판 */
      const src = new THREE.Mesh(new THREE.BoxGeometry(0.28, NY * SP * 0.98, NZ * SP * 0.98), new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4, emissive: 0x7f1d1d, emissiveIntensity: 0.5 }));
      src.position.set(X0 - SP * 0.9, blk.position.y, 0); root.add(src);
      label('진원', [X0 - SP * 0.9, Y0 + 0.35, 0], { color: 'rgba(185,28,28,.92)' });

      /* 방향 화살표 */
      const arrowMat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.4 });
      function arrow(c, len) {
        const g = new THREE.Group(), m = arrowMat(c);
        const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, len - 0.3, 12), m); sh.position.y = (len - 0.3) / 2;
        const hd = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.3, 16), m); hd.position.y = len - 0.15;
        g.add(sh, hd); return g;
      }
      const travel = arrow(0x22c55e, 2.4); travel.rotation.z = -Math.PI / 2; travel.position.set(-1.2, Y0 + 1.3, 0); root.add(travel);
      label('파의 진행 방향', [0, Y0 + 1.75, 0], { color: 'rgba(21,128,61,.92)' });
      const vib = new THREE.Group(); root.add(vib);
      const va = arrow(0xf59e0b, 0.7), vb = arrow(0xf59e0b, 0.7); vb.rotation.z = Math.PI; vib.add(va, vb);
      vib.position.set(X0 + 6 * SP, Y0 + 0.5, NZ * SP / 2 + 0.3);
      const vibLab = label('입자 진동 방향', vib, { offset: [0, 0.95, 0], color: 'rgba(180,83,9,.92)' });
      const xLab = label('✕ 액체에서는 S파가 없어요', [X0 + 6 * SP, Y0 - 1.0, NZ * SP / 2 + 0.3], { color: 'rgba(185,28,28,.92)' });

      function setVib() {
        vib.rotation.set(0, 0, 0);
        if (st.wave === 'P') vib.rotation.z = -Math.PI / 2;        // 진행 방향과 나란히
        if (st.wave === 'R') vib.rotation.z = -Math.PI / 4;        // 타원 운동 표시용 기울기
        vibLab.set(st.wave === 'P' ? '진동: 나란히' : st.wave === 'S' ? '진동: 수직' : '진동: 타원');
      }
      function applyMed() {
        const liq = st.med === 'liquid';
        boxMat.color.set(liq ? 0x2f80d8 : 0x8a6a4a); boxMat.opacity = liq ? 0.26 : 0.16;
        edge.material.color.set(liq ? 0x7ab8ff : 0xcaa57a);
      }
      function fmt() {
        const liq = st.med === 'liquid', w = st.wave;
        const t = {
          P: '<b>P파</b>(종파)는 입자가 <b>진행 방향과 나란히</b> 밀고 당기며 흔들려요. 가장 빨라요.' + (liq ? '<br>액체도 지나요.' : ''),
          S: liq ? '<b>S파</b>(횡파)는 입자가 진행 방향에 <b>수직</b>으로 흔들려요.<br>액체는 모양이 변해도 되돌아오려 하지 않아서 <b>전달되지 않아요</b>.' : '<b>S파</b>(횡파)는 입자가 진행 방향에 <b>수직</b>으로 흔들려요. P파보다 느려요.',
          R: '<b>표면파</b>는 표면에서 입자가 <b>타원</b>을 그리며 흔들려요. 깊이 들어갈수록 약해지고, 가장 느리지만 피해가 커요.',
        };
        info(t[w]);
      }
      function refresh() { setVib(); applyMed(); fmt(); xLab.show(st.med === 'liquid' && st.wave === 'S'); }

      const wSeg = controls.segment('파의 종류', [{ value: 'P', label: 'P파' }, { value: 'S', label: 'S파' }, { value: 'R', label: '표면파' }], st.wave, (v) => {
        if (v === 'R' && st.med === 'liquid') { st.med = 'solid'; mSeg.set('solid'); }
        st.wave = v; st.t = 0; refresh();
      });
      const mSeg = controls.segment('매질', [{ value: 'solid', label: '고체' }, { value: 'liquid', label: '액체' }], st.med, (v) => {
        st.med = v; if (v === 'liquid' && st.wave === 'R') { st.wave = 'P'; wSeg.set('P'); } st.t = 0; refresh();
      });
      const bb = controls.button('🌊 파 다시 보내기', () => { st.t = 0; });
      refresh();

      const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
      let lastWave = st.wave, lastMed = st.med;
      return {
        update(dt) {
          /* 2D 실험의 선택을 따라가요 */
          try {
            const S = window.__sim && window.__sim.S;
            if (S && (S.wave !== lastWave || S.med !== lastMed)) { lastWave = S.wave; lastMed = S.med; st.wave = S.wave; st.med = S.med; wSeg.set(st.wave); mSeg.set(st.med); st.t = 0; refresh(); }
          } catch (e) {}
          st.t += dt;
          const w = st.wave, v = SPEED[w], a = AMP[w], k = W / v, liq = st.med === 'liquid';
          const front = X0 - 0.2 + v * st.t;
          const xEnd = X0 + (NX - 1) * SP;
          if (front > xEnd + 6) st.t = 0;
          src.position.x = X0 - SP * 0.9 + (w === 'P' ? 0.12 * Math.sin(-W * st.t) : 0);
          src.position.y = blk.position.y + (w === 'S' ? 0.12 * Math.sin(-W * st.t) : w === 'R' ? 0.06 * Math.sin(-W * st.t) : 0);
          for (let n = 0; n < N; n++) {
            const bx = base[n * 3], by = base[n * 3 + 1], bz = base[n * 3 + 2];
            const d = bx - (X0 - 0.2), ph = k * d - W * st.t;
            let env = ss(0, 1.2, front - bx);
            let dx = 0, dy = 0, dz = 0;
            if (w === 'P') { dx = a * Math.sin(ph) * env; }
            else if (w === 'S') {
              if (liq) env *= Math.exp(-Math.max(0, d) / 0.35);        // 액체: 곧바로 사라져요
              dy = a * Math.sin(ph) * env;
            } else {
              const depth = (Y0 - by) / SP, g = Math.exp(-0.55 * depth) * (depth > 5.5 ? 0 : 1);
              dx = -a * 1.1 * g * Math.cos(ph) * env; dy = a * 1.3 * g * Math.sin(ph) * env;
            }
            const o = n * 16; arr[o + 12] = bx + dx; arr[o + 13] = by + dy; arr[o + 14] = bz + dz;
          }
          im.instanceMatrix.needsUpdate = true;
        },
        sync() {
          try { const S = window.__sim && window.__sim.S; if (S) { st.wave = S.wave || st.wave; st.med = S.med || st.med; lastWave = st.wave; lastMed = st.med; wSeg.set(st.wave); mSeg.set(st.med); refresh(); } } catch (e) {}
        },
      };
    },
  });
})();
