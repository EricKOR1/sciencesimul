/* h1-supernova-origin · 3D 초신성 폭발
   양파 껍질 모양의 무거운 별 → 철 핵 붕괴 → 폭발 → 원소가 우주로 퍼져 새 별·행성·생명의 재료가 돼요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const LAY = [ // [바깥 반지름, 색, 이름]
    [0.35, 0xc9ced8, '철 (Fe)'], [0.6, 0xe9d6ff, '규소 (Si)'], [0.9, 0xff9ec1, '산소·네온'], [1.25, 0xffc15e, '탄소 (C)'], [1.75, 0x6fd6ff, '헬륨 (He)'], [2.4, 0x5b7dff, '수소 (H)'],
  ];
  const HEAVY = 0xffd34d; // 철보다 무거운 원소 (금 등): 폭발 때 새로 생겨요

  window.SciSim3D.attach({
    title: '초신성 폭발 3D',
    camera: { dist: PHN ? 13 : 9.5, theta: -2.35, phi: 1.2, min: 5, max: 34 },
    levels: [0],
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5 }, o || {}));
      let T = 0, play = false, speed = 1, tgl = true;
      const N = 1100, geo = new THREE.IcosahedronGeometry(1, 1);
      const inst = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.1, emissive: 0x222222, emissiveIntensity: 0.5 }), N);
      root.add(inst);
      const P = []; const col = new THREE.Color();
      const rnd = (a, b) => a + Math.random() * (b - a);
      for (let i = 0; i < N; i++) {
        // 층에 알맞은 부피 비율로 흩뿌리기
        const u = Math.random(); const r = 2.4 * Math.pow(u, 0.62);
        let li = LAY.findIndex((L) => r <= L[0]); if (li < 0) li = LAY.length - 1;
        const v = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
        const heavy = Math.random() < 0.14;
        P.push({ v, r, li, heavy, sz: rnd(0.06, 0.11), sp: rnd(0.55, 1.15) * (0.6 + r / 2.4 * 0.6), });
        col.setHex(heavy ? HEAVY : LAY[li][1]); inst.setColorAt(i, col);
      }

      // 폭발 전: 양파 껍질 모양의 별 (한 쪽을 잘라 속을 보여 줘요)
      const onion = new THREE.Group(); root.add(onion);
      const wedge = 3 * Math.PI / 2; let prevR = 0;
      LAY.forEach((L, i) => {
        const mt = () => std(L[1], { emissive: L[1], emissiveIntensity: 0.35, side: THREE.DoubleSide });
        if (i === LAY.length - 1) onion.add(new THREE.Mesh(new THREE.SphereGeometry(L[0], 64, 40, 0, wedge), mt()));
        else onion.add(new THREE.Mesh(new THREE.SphereGeometry(L[0], 48, 32, 0, wedge), mt()));
        [Math.PI / 2, Math.PI].forEach((rot) => { const ring = new THREE.Mesh(new THREE.RingGeometry(prevR, L[0], 64, 1, -Math.PI / 2, Math.PI), mt()); ring.rotation.y = rot; onion.add(ring); });
        prevR = L[0];
      });
      inst.instanceColor.needsUpdate = true;
      // 이름표용 보조 점, 충격파, 중심 섬광
      const shock = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), new THREE.MeshBasicMaterial({ color: 0xfff0b8, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
      root.add(shock);
      const core = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })); root.add(core);
      const nebula = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), new THREE.MeshStandardMaterial({ color: 0xff7ab0, transparent: true, opacity: 0, depthWrite: false, roughness: 1, emissive: 0xa02a5a, emissiveIntensity: 0.4 })); root.add(nebula);
      const labs = LAY.map((L, i) => { const l = label(L[2], [0, 0, 0], { size: 12 }); return l; });
      const lHeavy = label('금·은·우라늄 (Fe보다 무거운 원소)', [0, 0, 0], { color: 'rgba(180,120,0,.92)', size: 12 });
      const lNeb = label('흩어진 원소 → 새 별·행성·생명', [0, 0, 0], { color: 'rgba(150,40,90,.92)', size: 12 });
      const dummy = new THREE.Object3D();
      const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
      // 시간 T: 0~0.25 붕괴, 0.25~0.32 폭발 섬광, 0.32~1 퍼져 나감
      function paint() {
        const collapse = sm(0.0, 0.25, T), blast = sm(0.28, 1.0, T);
        const pre = T < 0.26;
        onion.visible = pre; inst.visible = !pre;
        const os = 1 - 0.5 * collapse; onion.scale.setScalar(os);
        if (!pre) {
          for (let i = 0; i < N; i++) {
            const p = P[i];
            let rad = p.r * 0.5 + blast * 9.5 * p.sp * (0.45 + p.r * 0.2); if (p.heavy) rad *= 1.15;
            dummy.position.copy(p.v).multiplyScalar(rad);
            let sc = p.sz * (1 - 0.35 * blast) * (p.heavy && T >= 0.3 ? 1.5 : 1);
            if (p.heavy && T < 0.3) sc *= 0.0001;
            dummy.scale.setScalar(sc); dummy.updateMatrix(); inst.setMatrixAt(i, dummy.matrix);
          }
          inst.instanceMatrix.needsUpdate = true;
        }
        const fl = T > 0.24 && T < 0.4 ? 1 - Math.abs(T - 0.29) / 0.11 : 0;
        core.material.opacity = Math.max(0, fl) * 0.95; core.scale.setScalar(0.5 + Math.max(0, fl) * 2.6);
        const sw = sm(0.29, 0.75, T); shock.scale.setScalar(0.3 + sw * 11); shock.material.opacity = T > 0.29 ? 0.16 * (1 - sw) : 0;
        nebula.scale.setScalar(2 + sm(0.5, 1, T) * 9); nebula.material.opacity = 0.14 * sm(0.55, 1, T);
        labs.forEach((l, i) => { l.show(pre && tgl); const rm = ((i ? LAY[i - 1][0] : 0) + LAY[i][0]) / 2 * os; l.obj = [-rm, (i % 2 ? 1 : -1) * 0.18, 0.06]; });
        lHeavy.show(T > 0.5 && tgl); lHeavy.obj = [5.5, 2.3, 0]; lNeb.show(T > 0.85 && tgl); lNeb.obj = [-5, -4.5, 3];
        slider && slider.set(Math.round(T * 100));
        orbit.dist = (PHN ? 13 : 9.5) + (PHN ? 9 : 7) * sm(0.2, 0.6, T);
        info(T < 0.02 ? '<b>양파 껍질 모양의 무거운 별</b>이에요. 중심에는 <b>철</b>이 쌓여 있어요.<br>▶ 폭발시키기를 눌러 보세요.' : T < 0.26 ? '<b>철 핵이 붕괴해요.</b><br>철은 핵융합으로 에너지를 못 내서, 중력에 눌려 무너져요.' : T < 0.5 ? '<b>초신성 폭발!</b><br>이때 철보다 무거운 원소(금·우라늄 등)가 만들어져요.' : '<b>원소가 우주로 퍼져 나가요.</b><br>이 물질이 모여 새 별과 행성, 우리 몸의 재료가 돼요.');
      }
      let slider = controls.range('시간', 0, 100, 1, 0, (v) => { play = false; T = v / 100; bPlay.textContent = '▶ 폭발시키기'; paint(); }, (v) => v + '%');
      const bPlay = controls.button('▶ 폭발시키기', () => { if (T >= 0.99) T = 0; play = !play; bPlay.textContent = play ? '❚❚ 멈춤' : '▶ 폭발시키기'; });
      const bL = controls.button('이름표 ✓', () => { tgl = !tgl; bL.classList.toggle('on', tgl); bL.textContent = '이름표 ' + (tgl ? '✓' : '✕'); paint(); }); bL.classList.add('on');
      paint();
      return {
        update(dt) {
          if (play) { T += dt * 0.085 * speed * (T < 0.25 ? 1.8 : 1); if (T >= 1) { T = 1; play = false; bPlay.textContent = '↺ 다시 보기'; } paint(); }
        },
        sync() { paint(); },
      };
    },
  });
})();
