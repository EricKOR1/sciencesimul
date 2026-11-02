/* hu-redshift-survey · 3D 허블 법칙과 우주 팽창
   멀리 있는 은하일수록 더 빨리 멀어져요: v = H₀ · d  (H₀ ≈ 70 km/s/Mpc). 이 속도는 스펙트럼선의 적색 이동 z ≈ v/c 로 알 수 있어요.
   우주 팽창은 건포도 빵이 부푸는 것과 같아서 어느 은하에서 보아도 모든 은하가 멀어지고, '팽창의 중심'은 따로 없어요.
   은하의 위치는 보기 좋게 만든 모형이에요(범위: 320 Mpc). 2D 실험의 단계에서 시작해요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const TAU = Math.PI * 2, UNIT = 5 / 320, H0 = 70, C = 3.0e5;       // 장면 길이 / Mpc

  window.SciSim3D.attach({
    title: '허블 법칙과 우주 팽창 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    levels: [1, 2],
    camera: { dist: PHONE ? 16 : 11.5, theta: 0.6, phi: 1.05, min: 5, max: 26 },
    autoRotate: 0.1,
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      const st = { a: 1, play: true, obs: 0, t: 0, arrows: true };
      let seed = 77; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      { const pos = []; for (let i = 0; i < 400; i++) { const u = rnd() * 2 - 1, a = rnd() * TAU, r = Math.sqrt(1 - u * u); pos.push(Math.cos(a) * r * 60, u * 60, Math.sin(a) * r * 60); }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        root.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xaec3ff, size: 1.4, sizeAttenuation: false, transparent: true, opacity: 0.45 }))); }

      /* 은하 */
      const N = 150, P = [];                                    // 위치 (Mpc)
      for (let i = 0; i < N; i++) { const u = rnd() * 2 - 1, a = rnd() * TAU, s = Math.sqrt(1 - u * u), R = 25 + 295 * Math.cbrt(rnd()); P.push(new THREE.Vector3(Math.cos(a) * s * R, u * R * 0.8, Math.sin(a) * s * R)); }
      P[0].set(0, 0, 0);                                       // 우리은하
      P[1].set(130, 40, 140);                                   // 다른 관측자 후보
      P[2].set(-170, -50, 120);
      const ex = new THREE.Vector3(0.62, 0.15, -0.77).multiplyScalar(224); P[3].copy(ex);       // 설명용 은하 (약 224 Mpc)
      const gm = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.0, emissive: 0x222233, emissiveIntensity: 0.6 }), N); gm.frustumCulled = false; root.add(gm);
      const am = new THREE.InstancedMesh(new THREE.ConeGeometry(0.06, 1, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }), N); am.frustumCulled = false; root.add(am);
      const col = new THREE.Color();
      const rad = []; for (let i = 0; i < N; i++) rad.push(0.07 + rnd() * 0.07);
      const dm = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0), v = new THREE.Vector3();
      const ringM = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.02, 10, 40), new THREE.MeshBasicMaterial({ color: 0xffd23f })); root.add(ringM);
      const labObs = label('관측자(우리은하)', [0, 0, 0], { color: 'rgba(30,64,140,.92)' }), labEx = label('', [0, 0, 0], { size: 11.5, color: 'rgba(130,80,10,.92)' });
      const shells = [100, 200, 300].map((d) => { const m = new THREE.Mesh(new THREE.SphereGeometry(d * UNIT, 40, 28), new THREE.MeshBasicMaterial({ color: 0x6f8de0, transparent: true, opacity: 0.045, depthWrite: false, wireframe: false })); root.add(m); return m; });
      const shellLab = [100, 200, 300].map((d) => label(d + ' Mpc', [0, 0, 0], { size: 11, color: 'rgba(40,60,120,.85)' }));
      let lastObs = -1;
      function layout() {
        const o = P[st.obs];
        for (let i = 0; i < N; i++) {
          v.copy(P[i]).sub(o).multiplyScalar(st.a * UNIT);                 // 팽창하면 거리가 a배
          const d = v.length() / (st.a * UNIT);                              // 은하 사이 거리(Mpc, 팽창 전)
          dm.position.copy(v); dm.scale.setScalar(i === st.obs ? 0.17 : rad[i]); dm.quaternion.identity(); dm.updateMatrix(); gm.setMatrixAt(i, dm.matrix);
          const zz = Math.min(1, d * st.a / 320); col.setRGB(0.45 + 0.55 * zz, 0.65 - 0.35 * zz, 1 - 0.8 * zz); gm.setColorAt(i, i === st.obs ? col.setHex(0x3ea0ff) : col);
          /* 멀어지는 속도 화살표: v = H0·d 에 비례 (길이) */
          if (i === st.obs || !st.arrows) { dm.scale.setScalar(0.0001); dm.updateMatrix(); am.setMatrixAt(i, dm.matrix); continue; }
          const L = Math.min(2.4, d * UNIT * 0.28 * st.a + 0.02) * (st.a > 0 ? 1 : 0), dir = v.clone().normalize();
          dm.position.copy(v).addScaledVector(dir, rad[i] + L / 2 + 0.03); dm.scale.set(1, Math.max(0.001, L), 1); dm.quaternion.setFromUnitVectors(up, dir); dm.updateMatrix(); am.setMatrixAt(i, dm.matrix);
        }
        gm.instanceMatrix.needsUpdate = am.instanceMatrix.needsUpdate = true; if (gm.instanceColor) gm.instanceColor.needsUpdate = true;
        ringM.position.set(0, 0, 0); ringM.visible = false;
        const e = P[3].clone().sub(o).multiplyScalar(st.a * UNIT); ringM.position.copy(e); ringM.visible = st.obs !== 3; ringM.lookAt(ctx.camera.position);
        labEx.obj = e.clone(); labEx.off = [0, 0.55, 0];
        const dE = P[3].distanceTo(o), vE = H0 * dE * st.a, z = vE / C; labEx.set('d ≈ ' + Math.round(dE * st.a) + ' Mpc'); labEx.show(st.obs !== 3);
        labObs.obj = [0, 0, 0]; labObs.off = [0, 0.6, 0]; labObs.set(st.obs === 0 ? '관측자(우리은하)' : '다른 은하에서 본 모습');
        shells.forEach((m, i) => { m.scale.setScalar(st.a); shellLab[i].obj = [0, ([100, 200, 300][i]) * UNIT * st.a, 0]; });
        text(dE * st.a, vE, z);
      }
      function text(d, vE, z) {
        info('<b>' + (st.obs === 0 ? '우리은하에서 본 우주' : '다른 은하에서 봐도 똑같아요') + '</b><br>멀수록 화살표(멀어지는 속도)가 길어요: <b>v = H₀·d</b><br>예) d ≈ ' + Math.round(d) + ' Mpc → v ≈ ' + Math.round(vE).toLocaleString() + ' km/s, 적색 이동 z ≈ ' + z.toFixed(3));
      }
      const rA = controls.range('우주 팽창', 0.5, 1.6, 0.01, 1, (v2) => { st.a = v2; st.play = false; bP.textContent = '▶ 팽창시키기'; layout(); }, (v2) => '크기 ×' + v2.toFixed(2));
      const bP = controls.button('▶ 팽창시키기', () => { st.play = !st.play; bP.textContent = st.play ? '⏸ 멈춤' : '▶ 팽창시키기'; if (st.play && st.a > 1.55) st.a = 0.6; });
      const bO = controls.button('🔭 다른 은하에서 보기', () => { st.obs = st.obs === 0 ? 1 : st.obs === 1 ? 2 : 0; layout(); });
      const bAr = controls.button('속도 화살표 ✓', () => { st.arrows = !st.arrows; bAr.classList.toggle('on', st.arrows); bAr.textContent = '속도 화살표 ' + (st.arrows ? '✓' : '✕'); layout(); }); bAr.classList.add('on');
      st.play = false; bP.textContent = '▶ 팽창시키기';
      layout();
      return {
        update(dt) {
          if (st.play) { st.a += dt * 0.09; if (st.a > 1.6) st.a = 0.5; rA.set(Math.round(st.a * 100) / 100); layout(); }
          else if (st.obs !== lastObs) lastObs = st.obs;
          ringM.lookAt(ctx.camera.position);
        },
        sync() { layout(); },
      };
    },
  });
})();
