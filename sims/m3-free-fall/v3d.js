/* m3-free-fall · 3D 자유 낙하 (다중 섬광 사진)
   공기 저항이 없으면 질량과 상관없이 모든 물체가 같게 떨어져요. 속력은 시간에 비례해 일정하게 늘고(9.8 m/s씩), 같은 시간 동안 이동 거리는 점점 길어져요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const S = 0.12, HT = 45;                         // 1 m = 0.12, 탑 높이 45 m
  window.SciSim3D.attach({
    host: '.stage-card',
    title: '자유 낙하 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHN ? 17 : 12.5, theta: 0.5, phi: 1.35, min: 6, max: 26, target: [0, 2.7, 0] },
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3;
      let obj = 'two', g = 9.8, air = false, t = -1, strobe = true, names = true, done = false;
      const sm = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.45, metalness: 0.1 }, o || {}));
      const gnd = new THREE.Mesh(new THREE.BoxGeometry(11, 0.3, 6), sm(0x3d6f3a, { roughness: 0.95, metalness: 0 })); gnd.position.y = -0.15; root.add(gnd);
      /* 탑 */
      const topY = HT * S + 0.35;
      [[-0.7, -0.6], [0.7, -0.6], [-0.7, 0.6], [0.7, 0.6]].forEach((q) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, topY, 10), sm(0x94a3b8, { metalness: 0.6, roughness: 0.4 })); m.position.set(q[0] - 1.6, topY / 2, q[1]); root.add(m); });
      const plat = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.12, 1.7), sm(0x64748b)); plat.position.set(-1.6, topY, 0); root.add(plat);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.3), sm(0xf59e0b)); arm.position.set(-0.45, topY + 0.1, 0); root.add(arm);
      /* 눈금 막대 */
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, HT * S + 0.2, 8), sm(0xe2e8f0)); rod.position.set(1.7, (HT * S + 0.2) / 2 - 0.1 + 0.1, -0.2); root.add(rod);
      for (let m = 0; m <= 45; m += 5) { const tk = new THREE.Mesh(new THREE.BoxGeometry(m % 10 === 0 ? 0.5 : 0.28, 0.025, 0.025), sm(0xe2e8f0)); tk.position.set(1.7 - (m % 10 === 0 ? 0.25 : 0.14), topY - 0.35 - m * S + 0.35 - 0.35 + 0.35 - 0.0, -0.2); tk.position.y = (HT - m) * S; root.add(tk); }
      /* 공 (물체) */
      const defs = { two: [['쇠공 1 kg', 0.26, 0xcbd5e1, 1, 0.55], ['쇠공 5 kg', 0.4, 0x475569, 1, -0.55]], one: [['쇠공 1 kg', 0.26, 0xcbd5e1, 1, 0]], five: [['쇠공 5 kg', 0.4, 0x475569, 1, 0]], feather: [['쇠공', 0.3, 0xcbd5e1, 1, 0.55], ['깃털', 0.3, 0xfef3c7, 0.0, -0.55]] };
      let balls = [];
      const ghosts = new THREE.Group(); root.add(ghosts); const ghostLabs = []; const ghostMeshes = [];
      const arrows = new THREE.Group(); root.add(arrows);
      const bl = label('', [0, 0, 0], { size: 12, color: 'rgba(15,23,42,.9)' });
      function clearBalls() { balls.forEach((b) => root.remove(b.m)); balls = []; while (ghosts.children.length) ghosts.remove(ghosts.children[0]); while (arrows.children.length) arrows.remove(arrows.children[0]); ghostLabs.forEach((l) => l.show(false)); ghostMeshes.length = 0; }
      function setup() {
        clearBalls(); t = -1; done = false;
        defs[obj].forEach((d, i) => {
          const m = obj === 'feather' && i === 1 ? new THREE.Mesh(new THREE.SphereGeometry(d[1], 20, 14), sm(d[2], { roughness: 0.95, metalness: 0 })) : new THREE.Mesh(new THREE.SphereGeometry(d[1], 36, 24), sm(d[2], { metalness: 0.7, roughness: 0.3 }));
          if (obj === 'feather' && i === 1) m.scale.set(1.4, 0.35, 0.8);
          m.position.set(-0.45, topY + 0.14 + d[1], d[4]); root.add(m); balls.push({ m, d, y: 0, v: 0, r: d[1] });
        });
        info(infoText(0, 0));
      }
      function infoText(tt, v) {
        if (tt <= 0) return '<b>자유 낙하</b>: 가만히 놓은 물체가 중력만 받아 떨어지는 운동이에요.<br>' + (air ? '공기가 있으면 가벼운 물체는 저항 때문에 늦게 떨어져요.' : '공기 저항이 없으면 무거운 공도 가벼운 공도 <b>같이</b> 떨어져요.');
        return '시간 <b>' + tt.toFixed(1) + '초</b> · 속력 <b>' + v.toFixed(1) + ' m/s</b><br>속력은 1초마다 약 <b>' + g.toFixed(1) + ' m/s</b>씩 늘어나요 (v = ' + g.toFixed(1) + ' × t).';
      }
      const fl = new Array(17).fill(0).map(() => label('', [0, -99, 0], { size: 11, color: 'rgba(30,41,59,.85)' })); fl.forEach((l) => l.show(false));
      let nextFlash = 0;
      controls.segment('물체', [{ value: 'two', label: '쇠공 1·5 kg' }, { value: 'feather', label: '쇠공+깃털' }], obj, (v) => { obj = v; setup(); });
      controls.segment('장소', [{ value: 9.8, label: '지구' }, { value: 1.6, label: '달' }], g, (v) => { g = v; air = air && v === 9.8; ab.textContent = '공기 ' + (air ? '✓' : '✕'); ab.classList.toggle('on', air); setup(); });
      const ab = controls.button('공기 ✕', () => { if (g !== 9.8) return; air = !air; ab.textContent = '공기 ' + (air ? '✓' : '✕'); ab.classList.toggle('on', air); setup(); });
      controls.button('▶ 떨어뜨리기', () => { setup(); t = 0; nextFlash = 0; });
      const sb = controls.button('섬광 사진 ✓', () => { strobe = !strobe; sb.textContent = '섬광 사진 ' + (strobe ? '✓' : '✕'); sb.classList.toggle('on', strobe); }); sb.classList.add('on');
      setup();
      return {
        update(dt, tm) {
          if (t < 0) { bl.show(false); return; }
          t += dt; let anyMoving = false, tt = t, vShow = 0;
          balls.forEach((b, i) => {
            const feather = obj === 'feather' && i === 1 && air;
            // 공기 저항: 깃털은 종단 속력이 작아요
            if (feather) { const vt = 1.8; b.v += (g - g * (b.v / vt) * (b.v / vt)) * dt; } else b.v = g * t;
            b.y = feather ? b.y + b.v * dt : 0.5 * g * t * t; if (!feather) b.y = 0.5 * g * t * t;
            const yy = Math.min(HT, b.y); b.m.position.y = topY + 0.14 + b.r - yy * S;
            if (obj === 'feather' && i === 1) b.m.rotation.z = Math.sin(tm * 3) * 0.4;
            if (b.y < HT) anyMoving = true;
            if (i === 0) vShow = b.v;
          });
          const lead = balls[0]; const tl = lead.v / g;
          if (strobe && t >= nextFlash && nextFlash <= 3.0 + (g < 5 ? 5 : 0)) {
            const k = Math.round(nextFlash / 0.5), step = g < 5 ? 1.0 : 0.5; // 달에서는 1초마다
            balls.forEach((b, i) => { const gh = new THREE.Mesh(new THREE.SphereGeometry(b.r, 20, 14), sm(b.d[2], { transparent: true, opacity: 0.35, depthWrite: false })); gh.position.copy(b.m.position); if (obj === 'feather' && i === 1) gh.scale.copy(b.m.scale); ghosts.add(gh); });
            const yy = 0.5 * g * nextFlash * nextFlash; const L = fl[Math.min(fl.length - 1, k)];
            if (yy <= HT + 0.01) { L.obj = [balls[0].m.position.x + 0.9, topY + 0.14 + balls[0].r - yy * S, balls[0].d[4]]; L.set(nextFlash.toFixed(1) + '초 · ' + yy.toFixed(1) + ' m · ' + (g * nextFlash).toFixed(1) + ' m/s'); L.show(names); }
            nextFlash += step;
          }
          if (balls.length) { bl.obj = balls[0].m; bl.off = [0, 0.7, 0]; bl.set(balls[0].d[0] + (balls[1] ? ' · ' + balls[1].d[0] : '')); bl.show(names); }
          if (!anyMoving && !done) { done = true; info('<b>' + (obj === 'feather' && air ? '깃털은 늦게 도착해요' : '둘이 동시에 도착해요') + '</b><br>' + (obj === 'feather' && air ? '공기 저항 때문이에요. 공기가 없으면 같이 떨어져요.' : '낙하 시간은 ' + Math.sqrt(2 * HT / g).toFixed(1) + '초. 질량과 상관없이 같아요.')); }
          else if (!done) info(infoText(Math.min(t, Math.sqrt(2 * HT / g)), Math.min(g * t, g * Math.sqrt(2 * HT / g))));
        },
      };
    },
  });
})();
