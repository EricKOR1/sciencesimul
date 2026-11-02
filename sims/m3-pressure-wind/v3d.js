/* m3-pressure-wind · 3D 바람의 순환 (해륙풍 · 계절풍)
   더워진 쪽 공기는 팽창해 위로 올라가 저기압, 차가운 쪽은 공기가 가라앉아 고기압이 돼요. 바람은 고기압 → 저기압으로 불어요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const CASES = {
    day:    { t: '낮', warm: true, L: '육지', S: '바다', Tl: 28, Ts: 20, wind: '바닷바람(해풍)', big: false, note: '낮에는 육지가 바다보다 빨리 데워져요.' },
    night:  { t: '밤', warm: false, L: '육지', S: '바다', Tl: 14, Ts: 19, wind: '땅바람(육풍)', big: false, note: '밤에는 육지가 바다보다 빨리 식어요.' },
    summer: { t: '여름', warm: true, L: '대륙', S: '해양', Tl: 30, Ts: 22, wind: '남동 계절풍', big: true, note: '여름에는 대륙이 해양보다 훨씬 더워져요.' },
    winter: { t: '겨울', warm: false, L: '대륙', S: '해양', Tl: -8, Ts: 6, wind: '북서 계절풍', big: true, note: '겨울에는 대륙이 해양보다 훨씬 차가워져요.' },
  };
  window.SciSim3D.attach({
    host: '.stage-card',
    title: '바람의 순환 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHN ? 19 : 14.5, theta: 0.3, phi: 1.28, min: 7, max: 30, target: [0, 1.4, 0] },
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3, C = THREE.Color;
      let key = 'day', age = 0;
      const sm = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.7, metalness: 0 }, o || {}));
      const D = 5;
      /* 바다 · 육지 */
      const seaM = sm(0x1d5f9f, { roughness: 0.25, transparent: true, opacity: 0.92 });
      const sea = new THREE.Mesh(new THREE.BoxGeometry(D, 1.2, 4.2, 40, 1, 12), seaM); sea.position.set(-D / 2, -0.6, 0); root.add(sea);
      const seaTop = sea.geometry.attributes.position; const seaY0 = []; for (let i = 0; i < seaTop.count; i++) seaY0.push(seaTop.getY(i));
      const landM = sm(0xb98d45, { roughness: 0.95 }); const land = new THREE.Mesh(new THREE.BoxGeometry(D, 1.2, 4.2), landM); land.position.set(D / 2, -0.6, 0); root.add(land);
      const hills = new THREE.Group(); [[1.5, 1.0, 0.8], [2.4, 0.6, -0.9], [3.4, 1.3, 0.2], [4.2, 0.7, -0.4]].forEach((q) => { const m = new THREE.Mesh(new THREE.ConeGeometry(q[1] * 0.9, q[1] * 1.1, 24), sm(0x3f7d3a, { roughness: 0.9 })); m.position.set(q[0], q[1] * 0.55, q[2]); hills.add(m); }); root.add(hills);
      const snow = new THREE.Mesh(new THREE.BoxGeometry(D - 0.1, 0.08, 4.1), sm(0xf1f5f9, { roughness: 0.9 })); snow.position.set(D / 2, 0.04, 0); root.add(snow);
      /* 열기 · 냉기 표시 (땅 위 반투명 판) */
      const heatM = new THREE.MeshBasicMaterial({ color: 0xff3a1a, transparent: true, opacity: 0.0, depthWrite: false }); const heat = new THREE.Mesh(new THREE.BoxGeometry(D, 0.06, 4.2), heatM); heat.position.set(D / 2, 0.06, 0); root.add(heat);
      const heat2 = new THREE.Mesh(new THREE.BoxGeometry(D, 0.06, 4.2), new THREE.MeshBasicMaterial({ color: 0xff5a2a, transparent: true, opacity: 0, depthWrite: false })); heat2.position.set(-D / 2, 0.07, 0); root.add(heat2);
      /* 해 · 달 */
      const sun = new THREE.Mesh(new THREE.SphereGeometry(0.7, 28, 20), new THREE.MeshBasicMaterial({ color: 0xffd34d })); sun.position.set(2.6, 5.4, -2); root.add(sun);
      const moon = new THREE.Mesh(new THREE.SphereGeometry(0.55, 28, 20), sm(0xe2e8f0, { emissive: 0x94a3b8, emissiveIntensity: 0.5 })); moon.position.set(2.6, 5.4, -2); root.add(moon);
      /* 순환 고리 */
      const RX = 4.2, CY = 2.3, RY = 1.5;
      const loopAt = (a) => new V3(RX * Math.cos(a) * 0.95, CY + RY * Math.sin(a), 0.0);
      const loopPts = []; for (let i = 0; i <= 96; i++) loopPts.push(loopAt(i / 96 * Math.PI * 2));
      const ring = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(loopPts, true), 160, 0.035, 8, true), new THREE.MeshBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.35 })); root.add(ring);
      const N = 46, parts = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 14, 10), new THREE.MeshStandardMaterial({ roughness: 0.4, emissiveIntensity: 0.3 }), N); root.add(parts);
      for (let i = 0; i < N; i++) parts.setColorAt(i, new C(0xffffff));
      const arrows = []; for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.6, 14), sm(0xffd34d, { emissive: 0x6b4a00, emissiveIntensity: 0.5, roughness: 0.4 })); root.add(m); arrows.push(m); }
      const dm = new THREE.Object3D(), cw = new C(), cc = new C(0x7dd3fc), ch = new C(0xff8a4a);
      const labH = label('', [0, 0, 0], { size: 14 }), labL = label('', [0, 0, 0], { size: 14 });
      const labTs = label('', [-D / 2, 0.3, 2.3], { color: 'rgba(14,116,144,.92)', size: 13 }), labTl = label('', [D / 2, 0.3, 2.3], { color: 'rgba(180,83,9,.92)', size: 13 });
      const labW = label('', [0, 0.45, 2.4], { color: 'rgba(30,41,59,.92)', size: 14 });
      function apply() {
        const c = CASES[key], dir = c.warm ? 1 : -1;
        landM.color.set(c.warm ? (c.big ? 0xa9803d : 0xb98d45) : 0x6f8396); snow.visible = key === 'winter';
        hills.visible = true; heatM.opacity = c.warm ? 0.16 : 0; heat2.material.opacity = 0;
        sun.visible = c.warm; moon.visible = !c.warm;
        const hi = c.warm ? -D / 2 : D / 2, lo = c.warm ? D / 2 : -D / 2;
        labH.obj = [hi, 4.3, 0]; labL.obj = [lo, 4.3, 0];
        labH.set('고기압 (공기가 내려와요)'); labL.set('저기압 (공기가 올라가요)');
        labH.el.style.background = 'rgba(37,99,235,.92)'; labL.el.style.background = 'rgba(220,38,38,.92)';
        labTl.set(c.L + ' ' + c.Tl + '°C'); labTs.set(c.S + ' ' + c.Ts + '°C'); labW.set(c.wind + ' (지표: ' + (c.warm ? c.S + ' → ' + c.L : c.L + ' → ' + c.S) + ')');
        info('<b>' + c.t + '</b> · ' + c.note + '<br>따뜻한 ' + (c.warm ? c.L : c.S) + ': 공기가 올라가 <b>저기압</b>, ' + (c.warm ? c.S : c.L) + ': 공기가 내려와 <b>고기압</b>.<br>지표에서는 고기압 → 저기압으로 <b>' + c.wind + '</b>이 불어요.');
      }
      controls.segment('상황', Object.keys(CASES).map((k) => ({ value: k, label: CASES[k].t })), key, (v) => { key = v; apply(); });
      const sb = controls.button('입자 ✓', () => { parts.visible = !parts.visible; sb.textContent = '입자 ' + (parts.visible ? '✓' : '✕'); }); sb.classList.add('on');
      apply();
      return {
        update(dt, t) {
          const c = CASES[key], dir = c.warm ? 1 : -1; age += dt * dir * 0.32;
          for (let i = 0; i < N; i++) {
            const a = age + i / N * Math.PI * 2, p = loopAt(a); p.z = Math.sin(i * 7.1) * 1.4; p.y += Math.sin(i * 3.3) * 0.18;
            dm.position.copy(p); dm.scale.setScalar(1); dm.updateMatrix(); parts.setMatrixAt(i, dm.matrix);
            const warmSide = (c.warm ? Math.cos(a) > 0 : Math.cos(a) < 0); // 따뜻한 쪽(오른쪽=육지)을 지날 때 붉게
            const wl = c.warm ? Math.cos(a) : -Math.cos(a);
            cw.copy(cc).lerp(ch, Math.max(0, Math.min(1, 0.5 + 0.5 * (c.warm ? Math.cos(a) : -Math.cos(a))))); if (!c.warm) cw.copy(cc).lerp(ch, Math.max(0, Math.min(1, 0.5 + 0.5 * -Math.cos(a)))); parts.setColorAt(i, cw);
          }
          parts.instanceMatrix.needsUpdate = true; if (parts.instanceColor) parts.instanceColor.needsUpdate = true;
          arrows.forEach((m, i) => { const a = age + i / 4 * Math.PI * 2, p = loopAt(a), q = loopAt(a + 0.05 * dir); m.position.copy(p); const d = q.sub(p).normalize(); m.quaternion.setFromUnitVectors(new V3(0, 1, 0), dir > 0 ? d : d); });
          for (let i = 0; i < seaTop.count; i++) { if (seaY0[i] > 0) seaTop.setY(i, 0.6 + Math.sin(seaTop.getX(i) * 2.2 + t * 1.6) * 0.04 + Math.sin(seaTop.getZ(i) * 3 + t) * 0.03); }
          seaTop.needsUpdate = true;
          sun.position.y = 5.2 + Math.sin(t * 0.8) * 0.08;
        },
      };
    },
  });
})();
