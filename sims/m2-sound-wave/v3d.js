/* m2-sound-wave · 3D 소리의 전달 (스피커에서 퍼지는 파동)
   공기 입자는 제자리에서 앞뒤로 떨리기만 하고, 촘촘한 곳(빨강)과 성긴 곳(파랑)이 퍼져 나가요.
   공기를 빼면 소리가 전달되지 않아요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const NX = 30, NY = 9, NZ = 5, SP = 0.5;
  const VOLN = ['아주 작게', '작게', '보통', '크게', '아주 크게'];

  window.SciSim3D.attach({
    title: '소리 전달 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHN ? 22 : 16, theta: 0.5, phi: 1.15, min: 6, max: 34, target: [1.3, 0, 0] },
    autoRotate: 0,
    levels: [1, 2],                  // 1단계(줄 흔들기 · 진공 종 미션)는 2D 화면에서 해요
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3;
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0.1 }, o || {}));
      const sm = () => window.__sim;
      const SX = -6.2;

      // 스피커
      const spk = new THREE.Group(); root.add(spk);
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 1.4), mat(0x2f3850, { roughness: 0.6 })); body.castShadow = true; spk.add(body);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.45, 32, 1, true), mat(0xd7deee, { side: THREE.DoubleSide, roughness: 0.4 })); cone.rotation.z = Math.PI / 2; cone.position.set(0.62, 0, 0); spk.add(cone);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 12), mat(0x8fa0c8)); dome.position.set(0.7, 0, 0); spk.add(dome);
      spk.position.set(SX - 0.8, 0, 0);
      // 귀
      const ear = new THREE.Group(); root.add(ear);
      const earM = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.14, 12, 28, Math.PI * 1.5), mat(0xf2c9a0, { roughness: 0.7 })); earM.rotation.y = Math.PI / 2; ear.add(earM);
      const earGlow = new THREE.Mesh(new THREE.SphereGeometry(0.9, 20, 14), new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0, depthWrite: false })); ear.add(earGlow);
      ear.position.set(SX + NX * SP + 0.3, 0, 0);

      // 공기 입자
      const N = NX * NY * NZ;
      const inst = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45, metalness: 0 }), N);
      inst.frustumCulled = false; root.add(inst);
      const home = new Float32Array(N * 3); let q = 0;
      for (let i = 0; i < NX; i++) for (let j = 0; j < NY; j++) for (let k = 0; k < NZ; k++) { home[q++] = SX + (i + 0.5) * SP; home[q++] = (j - (NY - 1) / 2) * SP; home[q++] = (k - (NZ - 1) / 2) * SP * 1.2; }
      // 눈에 띄는 한 입자 (제자리 진동)
      const mark = new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 14), mat(0xffd34d, { emissive: 0xffa800, emissiveIntensity: 0.6, roughness: 0.3 })); root.add(mark);
      const mHome = new V3(SX + 10.25 * SP, 0, 0); // 가운데 줄의 한 입자
      const mrk = label('제자리에서 앞뒤로만!', mark, { offset: [0, 0.55, 0], color: 'rgba(255,211,77,.92)' }); mrk.el.style.color = '#1b2333';
      // 퍼지는 파면
      const shells = [];
      for (let i = 0; i < 6; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24, 0, Math.PI * 2, 0, Math.PI), new THREE.MeshBasicMaterial({ color: 0x6fb4ff, transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide, wireframe: false })); s.renderOrder = 1; root.add(s); shells.push(s); }
      const labSp = label('스피커', spk, { offset: [0, 1.45, 0] }), labEar = label('귀', ear, { offset: [0, 0.9, 0] }), labAir = label('공기 입자', [SX + 6 * SP, -2.4, 0]);
      const box = new THREE.Mesh(new THREE.BoxGeometry(NX * SP, NY * SP, NZ * SP * 1.2), new THREE.MeshBasicMaterial({ color: 0x6f8fd0, wireframe: true, transparent: true, opacity: 0.08 }));
      box.position.set(SX + NX * SP / 2, 0, 0); root.add(box);

      let vol = 3, pitch = 400, air = true, aAir = 1, phase = 0, pl = null, pushedAt = -9, now = 0;
      const lamOf = (f) => Math.max(0.9, Math.min(5, 2.6 * Math.pow(400 / f, 0.85)));
      let lastS = '';
      /* 2D 실험의 소리 크기 · 진동수 · (진공 종에서) 공기의 양을 그대로 따라가요 */
      function readS() {
        const s = sm() && sm().S; if (!s) return;
        const a2 = !(s.scene === 'bell' && s.air != null && s.air < 0.5); if (a2 !== air) { air = a2; text(); }
        if (now - pushedAt < 0.8) return;
        const key = s.vol + ':' + s.pitch;
        if (key === lastS) return; lastS = key;
        vol = Math.max(1, Math.min(5, s.vol || 3)); pitch = s.pitch || 400; volR.set(vol); pitchR.set(pitch); text();
      }
      function text() {
        info(air ? `<b>소리는 파동</b>이에요. 공기 입자가 <b>제자리에서 앞뒤로 떨리면서</b> 촘촘한 곳(빨강)이 퍼져 나가요.<br>소리 크기 <b>${VOLN[vol - 1]}</b> (진폭이 클수록 큰 소리)<br>진동수 <b>${pitch} Hz</b> (클수록 높은 소리 · 파장이 짧아요)` : `<b>공기가 없어요!</b> 소리를 전달해 줄 입자가 없어서 <b>소리가 들리지 않아요</b>.`);
      }
      // 3D에서 바꾸면 2D 실험의 값도 같이 바뀌어요
      const volR = controls.range('소리 크기', 1, 5, 1, vol, (v) => { vol = v; pushedAt = now; const s = sm(); if (s && s.setVol) s.setVol(v); text(); }, (v) => VOLN[v - 1]);
      const pitchR = controls.range('진동수', 150, 900, 10, pitch, (v) => { pitch = v; pushedAt = now; const s = sm(); if (s && s.setPitch) s.setPitch(v); text(); }, (v) => v + ' Hz');
      // ▶ 재생: 한 주기 동안 공기 입자가 한 번 앞뒤로 떨리고, 파동은 한 파장만큼 나아가요 (멈춰서 촘촘한 곳 · 성긴 곳을 살펴봐요)
      pl = controls.player({
        duration: 3, loop: true, autoplay: true, label: '파동 재생',
        phases: [[0, '한 주기 시작'], [0.25, '1/4 주기'], [0.5, '반 주기'], [0.75, '3/4 주기']],
        onFrame(p) { phase = p * Math.PI * 2; },
      });
      controls.button('이름표', () => { const v = labSp.visible === false; labSp.show(v); labEar.show(v); labAir.show(v); });
      text();
      const c1 = new THREE.Color(0x4a7bff), c2 = new THREE.Color(0xf2f4fa), c3 = new THREE.Color(0xff4a4a), tc = new THREE.Color();
      const dm = new THREE.Object3D(); let k0 = 0;
      return {
        update(dt, t) {
          now = t;
          if ((k0++ % 8) === 0) readS();
          { const s2 = sm() && sm().S; const tgt = s2 && s2.scene === 'bell' && s2.air != null ? s2.air : 1; aAir += (tgt - aAir) * Math.min(1, dt * 6); }   // 진공 종에서는 2D의 공기 양을 따라가요
          const lam = lamOf(pitch), kk = Math.PI * 2 / lam;
          const A = 0.05 * vol * 1.0 * Math.min(1, aAir * 1.2);
          const R0 = SX - 0.4;
          let n = 0;
          for (let i = 0; i < N; i++) {
            const hx = home[n], hy = home[n + 1], hz = home[n + 2]; n += 3;
            const dx = hx - R0, rr = Math.sqrt(dx * dx + hy * hy + hz * hz), ph = kk * rr - phase;
            const xi = A * Math.sin(ph) * (aAir > 0.02 ? 1 : 0);
            // 구면파: 반지름 방향으로 변위 (진폭은 거리에 따라 약해져요)
            const att = 1 / (1 + 0.04 * rr), ux = dx / rr, uy = hy / rr, uz = hz / rr;
            dm.position.set(hx + ux * xi * att * 2.2, hy + uy * xi * att * 2.2, hz + uz * xi * att * 2.2);
            dm.scale.setScalar(0.35 + 0.65 * aAir); dm.updateMatrix(); inst.setMatrixAt(i, dm.matrix);
            // 밀도(촘촘함) ~ -∂ξ/∂r ~ -cos(ph)
            const dens = -Math.cos(ph) * Math.min(1, vol / 3) * att;
            tc.copy(c2); if (dens > 0) tc.lerp(c3, Math.min(1, dens * 1.1)); else tc.lerp(c1, Math.min(1, -dens * 1.1));
            inst.setColorAt(i, tc);
          }
          inst.instanceMatrix.needsUpdate = true; if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
          // 표시 입자
          const rr = mHome.x - R0, ph = kk * rr - phase; mark.position.set(mHome.x + A * Math.sin(ph) * 2.2 / (1 + 0.04 * rr), 0, 0); mark.visible = aAir > 0.3; mrk.show(aAir > 0.3);
          // 파면 (골 → 마루가 지나가는 위치)
          shells.forEach((s, i) => {
            const L = ((i * lam + phase / kk) % (lam * 6)); const r = Math.max(0.01, L);
            s.position.set(R0, 0, 0); s.scale.setScalar(r); s.visible = aAir > 0.1 && r < NX * SP + 1.2;
            s.material.opacity = 0.11 * aAir * Math.max(0, 1 - r / (NX * SP + 1.2)) * Math.min(1, vol / 2.5);
          });
          // 스피커 떨림 · 귀 반응
          spk.position.x = SX - 0.8 + 0.03 * Math.sin(phase) * vol / 3; cone.position.x = 0.62 + 0.07 * Math.sin(phase) * vol / 3;
          earGlow.material.opacity = 0.16 * aAir * (vol / 5) * (0.6 + 0.4 * Math.sin(phase));
        },
      };
    },
  });
})();
