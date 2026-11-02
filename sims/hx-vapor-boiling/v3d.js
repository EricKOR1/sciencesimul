/* hx-vapor-boiling · 3D 닫힌 용기 속 증발과 증기 압력
   액체 표면에서 분자가 증발하고(↑) 다시 응축하는(↓) 동적 평형을 입체로 보여 줘요.
   온도가 높을수록 증기 분자가 많아져 증기 압력이 커지고, 증기 압력이 바깥 압력(1기압)과 같아지면 끓어요.
   증기 압력은 2D 실험의 자료(LIQ)를 그대로 써요. 분자 수는 모형 스케치예요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const R = 2.3, HJ = 5.6, FLOOR = -2.8, LIQH = 1.7, MAXG = 44, NL = 56;
  const SUB = { ether: ['다이에틸 에터', 0xa78bfa], ethanol: ['에탄올', 0xfbbf24], water: ['물', 0x38bdf8] };
  const FALL = { ether: (T) => 442 * Math.exp(4300 * (1 / 293.15 - 1 / (T + 273.15))), ethanol: (T) => 44 * Math.exp(5200 * (1 / 293.15 - 1 / (T + 273.15))), water: (T) => 17.5 * Math.exp(4900 * (1 / 293.15 - 1 / (T + 273.15))) };

  window.SciSim3D.attach({
    title: '증발과 증기 압력 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHONE ? 15 : 12.5, theta: 0.5, phi: 1.2, min: 6, max: 26, target: [0, 0, 0] },
    autoRotate: 0.12,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3;
      const lq = () => (window.__sim && window.__sim.LIQ) || null;
      let sub = 'water', T = 20;
      const vp = () => { const L = lq(); try { return L && L[sub] ? L[sub].P(T) : FALL[sub](T); } catch (e) { return FALL[sub](T); } };

      const jar = new THREE.Mesh(new THREE.CylinderGeometry(R, R, HJ, 56, 1, true), new THREE.MeshStandardMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.16, roughness: 0.08, side: THREE.DoubleSide, depthWrite: false }));
      jar.position.y = FLOOR + HJ / 2; root.add(jar);
      const bot = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.2, 56), new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.5, metalness: 0.4 }));
      bot.position.y = FLOOR - 0.1; root.add(bot);
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.08, R + 0.08, 0.28, 56), new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.3, metalness: 0.7 }));
      lid.position.y = FLOOR + HJ + 0.14; root.add(lid);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.28, 24, 16), new THREE.MeshStandardMaterial({ color: 0xef6a5b, roughness: 0.4 })); knob.position.y = FLOOR + HJ + 0.5; root.add(knob);
      const liq = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.03, R - 0.03, LIQH, 56), new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.42, roughness: 0.15, depthWrite: false }));
      liq.position.y = FLOOR + LIQH / 2; root.add(liq);
      const surf = FLOOR + LIQH;

      const sm = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.3, metalness: 0.05, emissive: 0x112233, emissiveIntensity: 0.3 });
      const lm = new THREE.InstancedMesh(new THREE.SphereGeometry(0.17, 16, 12), sm, NL); lm.frustumCulled = false; lm.instanceMatrix.setUsage(THREE.DynamicDrawUsage); root.add(lm);
      const gm = new THREE.InstancedMesh(new THREE.SphereGeometry(0.19, 18, 14), sm, MAXG); gm.frustumCulled = false; gm.instanceMatrix.setUsage(THREE.DynamicDrawUsage); root.add(gm);
      const LP = Array.from({ length: NL }, () => { const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * (R - 0.35); return { b: new V3(Math.cos(a) * r, FLOOR + 0.3 + Math.random() * (LIQH - 0.55), Math.sin(a) * r), ph: Math.random() * 6.28 }; });
      const GP = Array.from({ length: MAXG }, () => ({ on: false, p: new V3(), v: new V3() }));
      const bubbles = Array.from({ length: 10 }, () => { const b = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.4, roughness: 0.1, depthWrite: false })); b.visible = false; root.add(b); return { m: b, t: Math.random() * 3, x: 0, z: 0 }; });
      const M = new THREE.Matrix4(), tl = label('', [R, surf + 1.4, 0], { color: 'rgba(30,41,59,.9)' }), pl = label('', [0, FLOOR + HJ + 0.9, 0], { color: 'rgba(239,106,91,.92)' });
      let txt = '', acc = 0;

      function setSub(k) {
        sub = k; sm.color.setHex(SUB[k][1]); liq.material.color.setHex(SUB[k][1]);
        GP.forEach((q) => { q.on = false; }); txt = '';
      }
      controls.segment('액체', [{ value: 'ether', label: '에터' }, { value: 'ethanol', label: '에탄올' }, { value: 'water', label: '물' }], sub, setSub);
      const tsl = controls.range('온도', 0, 110, 1, T, (v) => { T = v; }, (v) => v + ' °C');
      let lastS = null;
      const init = (window.__sim && window.__sim.S && window.__sim.S.vap) ? window.__sim.S.vap.T : null; void init;
      setSub('water');

      return {
        update(dt, t) {
          dt = Math.min(dt, 0.05);
          const sv = window.__sim && window.__sim.S && window.__sim.S.vap;
          if (sv && typeof sv.T === 'number' && sv.T !== lastS) { lastS = sv.T; T = Math.round(sv.T); tsl.set(T); }
          const P = vp(), target = Math.min(MAXG, Math.round(Math.min(P, 1200) / 760 * 30)), Tk = T + 273.15, sp = 2.1 * Math.sqrt(Tk / 300);
          let act = 0; GP.forEach((q) => { if (q.on) act++; });
          // 증발: 부족하면 표면에서 새로, 응축은 표면에 닿을 때 확률적으로
          if (act < target) {
            acc += dt * (4 + (target - act) * 5);
            while (acc > 1) { acc -= 1; const q = GP.find((x) => !x.on); if (!q) break; const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * (R - 0.4); q.on = true; q.p.set(Math.cos(a) * r, surf + 0.1, Math.sin(a) * r); q.v.set(Math.random() - 0.5, 0.6 + Math.random(), Math.random() - 0.5).normalize().multiplyScalar(sp * (0.7 + Math.random() * 0.6)); }
          }
          const top = FLOOR + HJ - 0.2;
          GP.forEach((q, i) => {
            if (!q.on) { M.makeScale(0.0001, 0.0001, 0.0001); gm.setMatrixAt(i, M); return; }
            q.p.addScaledVector(q.v, dt);
            const rr = Math.hypot(q.p.x, q.p.z);
            if (rr > R - 0.2) { const nx = q.p.x / rr, nz = q.p.z / rr, d = q.v.x * nx + q.v.z * nz; q.v.x -= 2 * d * nx; q.v.z -= 2 * d * nz; q.p.x = nx * (R - 0.2); q.p.z = nz * (R - 0.2); }
            if (q.p.y > top) { q.p.y = top; q.v.y = -Math.abs(q.v.y); }
            if (q.p.y < surf + 0.15) { if (act > target || Math.random() < 0.35) q.on = false; else { q.p.y = surf + 0.15; q.v.y = Math.abs(q.v.y); } }
            M.makeTranslation(q.p.x, q.p.y, q.p.z); gm.setMatrixAt(i, M);
          });
          gm.instanceMatrix.needsUpdate = true;
          const jit = 0.04 + T / 110 * 0.1;
          LP.forEach((q, i) => { M.makeTranslation(q.b.x + Math.sin(t * 3 + q.ph) * jit * 2, q.b.y + Math.cos(t * 3.4 + q.ph * 1.3) * jit * 2, q.b.z + Math.sin(t * 2.7 + q.ph * 0.7) * jit * 2); lm.setMatrixAt(i, M); });
          lm.instanceMatrix.needsUpdate = true;
          const boil = P >= 760;
          bubbles.forEach((b) => {
            b.m.visible = boil;
            if (boil) { b.t += dt * 1.1; if (b.t > 1) { b.t = 0; const a = Math.random() * 6.28, r = Math.random() * (R - 0.6); b.x = Math.cos(a) * r; b.z = Math.sin(a) * r; } const s = 0.7 + b.t * 1.6; b.m.scale.setScalar(s); b.m.position.set(b.x, FLOOR + 0.3 + b.t * (LIQH - 0.2), b.z); }
          });
          const s = '<b>' + SUB[sub][0] + '</b> · ' + T + ' °C<br>증기 압력 <b>' + (P >= 100 ? Math.round(P) : P.toFixed(1)) + ' mmHg</b> (' + (P / 760).toFixed(2) + ' 기압)<br>' + (boil ? '증기 압력이 1기압 이상이라 액체 속에서도 기포가 생겨요. 이게 끓음이에요.' : '↑ 증발과 ↓ 응축이 같은 빠르기로 일어나는 동적 평형이에요.');
          if (s !== txt) { txt = s; info(s); pl.set('증기 ' + (P >= 100 ? Math.round(P) : P.toFixed(1)) + ' mmHg'); tl.set(boil ? '끓는점 도달' : '액체'); }
        },
      };
    },
  });
})();
