/* h1-gravity-motion · 3D 수평으로 던진 공과 떨어뜨린 공
   같은 높이에서 한 공은 떨어뜨리고 한 공은 수평으로 던져요. 일정한 시간 간격(0.5초)마다 공의 위치를 찍어 보면
   수직 방향 운동은 같고, 수평 방향은 일정한 속도로 움직여요. 천체를 바꾸면 중력 가속도가 달라져 떨어지는 시간이 달라져요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const BODY = { moon: { n: '달', g: 1.6, c: 0x4a4f58 }, mars: { n: '화성', g: 3.7, c: 0x7a3a20 }, earth: { n: '지구', g: 9.8, c: 0x1f5a2c }, jup: { n: '목성', g: 24.8, c: 0x6a4a2a } };
  const H = 30, KY = 0.17, KX = 0.1, DT = 0.5;

  window.SciSim3D.attach({
    title: '떨어뜨린 공 · 던진 공 3D',
    camera: { dist: PHN ? 24 : 17, theta: 0.3, phi: 1.3, target: [1.4, 2.4, 0], min: 8, max: 34 },
    levels: [3],
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.45, metalness: 0.05 }, o || {}));
      let body = 'earth', v0 = 8, t = 0, state = 'ready', hold = 0;
      const gnd = new THREE.Mesh(new THREE.BoxGeometry(15, 0.3, 5), std(BODY.earth.c, { roughness: 0.9 })); gnd.position.set(1.5, -0.15, 0); root.add(gnd);
      // 뒤쪽 격자판 (높이·거리를 읽기 쉽게)
      const gridG = new THREE.Group(); root.add(gridG);
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(15, H * KY + 0.4), new THREE.MeshStandardMaterial({ color: 0x20304f, roughness: 0.9, transparent: true, opacity: 0.75, side: THREE.DoubleSide })); wall.position.set(1.5, (H * KY + 0.4) / 2 - 0.0, -2.4); gridG.add(wall);
      const lm = new THREE.LineBasicMaterial({ color: 0x5f78b0, transparent: true, opacity: 0.55 }), pts = [];
      for (let y = 0; y <= H; y += 5) { pts.push(new THREE.Vector3(-6, y * KY, -2.38), new THREE.Vector3(9, y * KY, -2.38)); }
      for (let x = -6; x <= 9; x += 1.5) { pts.push(new THREE.Vector3(x, 0, -2.38), new THREE.Vector3(x, H * KY, -2.38)); }
      gridG.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), lm));
      // 발사대
      const tower = new THREE.Mesh(new THREE.BoxGeometry(0.9, H * KY, 1.8), std(0x39425a, { roughness: 0.8 })); tower.position.set(-5.6, H * KY / 2, 0.2); root.add(tower);
      const X0 = -5.0, ZA = -0.45, ZB = 0.75;
      const ballA = new THREE.Mesh(new THREE.SphereGeometry(0.28, 32, 24), std(0xf0556a, { roughness: 0.3 })), ballB = new THREE.Mesh(new THREE.SphereGeometry(0.28, 32, 24), std(0x3b82f6, { roughness: 0.3 }));
      root.add(ballA, ballB);
      label('떨어뜨린 공', ballA, { offset: [0.0, 0.7, 0], size: 12, color: 'rgba(200,40,70,.92)' }); label('던진 공', ballB, { offset: [0.2, 0.7, 0], size: 12, color: 'rgba(40,90,200,.92)' });
      const timeLab = label('', [X0 + 6, H * KY + 0.1, 0], { color: 'rgba(255,211,77,.92)' }); timeLab.el.style.color = '#1b2333';
      // 일정한 시간 간격 잔상
      const NG = 30, gA = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 20, 14), std(0xf0556a, { transparent: true, opacity: 0.55, roughness: 0.4 }), NG), gB = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 20, 14), std(0x3b82f6, { transparent: true, opacity: 0.55, roughness: 0.4 }), NG);
      root.add(gA, gB);
      const links = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0.8 })); root.add(links);
      let path = null, vline = null; const dm = new THREE.Object3D();
      const Tf = () => Math.sqrt(2 * H / BODY[body].g);
      const posA = (tt) => new THREE.Vector3(X0, (H - 0.5 * BODY[body].g * tt * tt) * KY + 0.28, ZA);
      const posB = (tt) => new THREE.Vector3(X0 + v0 * tt * KX, (H - 0.5 * BODY[body].g * tt * tt) * KY + 0.28, ZB);
      function rebuildPaths() {
        [path, vline].forEach((o) => { if (o) { root.remove(o); o.geometry.dispose(); } });
        const T = Tf(), pp = []; for (let i = 0; i <= 60; i++) pp.push(posB(T * i / 60));
        path = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pp), 80, 0.025, 8), new THREE.MeshBasicMaterial({ color: 0x8fb4ff, transparent: true, opacity: 0.55 })); root.add(path);
        vline = new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(posA(0), posA(T)), 2, 0.025, 8), new THREE.MeshBasicMaterial({ color: 0xff9aa9, transparent: true, opacity: 0.55 })); root.add(vline);
        gnd.material.color.setHex(BODY[body].c);
        info('<b>' + BODY[body].n + '</b> · g = ' + BODY[body].g + ' m/s² · 낙하 시간 약 <b>' + T.toFixed(1) + '초</b><br>0.5초마다 찍은 공: 두 공은 <b>항상 같은 높이</b>예요. 수평 방향 간격은 일정해요.');
      }
      function paint() {
        const T = Tf(), tc = Math.min(t, T);
        ballA.position.copy(posA(tc)); ballB.position.copy(posB(tc));
        const lp = []; let n = 0;
        for (let k = 1; k * DT < T + 1e-6 && k < NG; k++) {
          const show = t >= k * DT - 1e-6; const a = posA(k * DT), b = posB(k * DT);
          dm.position.copy(a); dm.scale.setScalar(show ? 1 : 0.0001); dm.updateMatrix(); gA.setMatrixAt(k, dm.matrix);
          dm.position.copy(b); dm.updateMatrix(); gB.setMatrixAt(k, dm.matrix);
          if (show) lp.push(a, b);
        }
        for (let k = 0; k < NG; k++) if (k === 0 || k * DT >= T + 1e-6) { dm.position.set(0, -9, 0); dm.scale.setScalar(0.0001); dm.updateMatrix(); gA.setMatrixAt(k, dm.matrix); gB.setMatrixAt(k, dm.matrix); }
        gA.instanceMatrix.needsUpdate = gB.instanceMatrix.needsUpdate = true;
        links.geometry.dispose(); links.geometry = new THREE.BufferGeometry().setFromPoints(lp);
        timeLab.set('시간 ' + tc.toFixed(1) + ' 초');
      }
      const segB = controls.segment('천체', Object.keys(BODY).map((k) => ({ value: k, label: BODY[k].n })), body, (v) => { body = v; t = 0; state = 'ready'; rebuildPaths(); paint(); });
      const rv = controls.range('수평 속도', 0, 12, 1, v0, (v) => { v0 = v; t = 0; state = 'ready'; rebuildPaths(); paint(); }, (v) => v + ' m/s');
      const bGo = controls.button('▶ 던지기', () => { t = 0; state = 'run'; hold = 0; });
      rebuildPaths(); t = 0; state = 'run'; paint();
      return {
        update(dt) {
          if (state === 'done') { hold += dt; if (hold > 2.4) { t = 0; hold = 0; state = 'run'; paint(); } }
          if (state === 'run') { t += dt; if (t >= Tf()) { t = Tf(); state = 'done'; } paint(); }
        },
        sync() { paint(); },
      };
    },
  });
})();
