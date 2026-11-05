/* h1-gravity-motion · 3D 수평으로 던진 공과 떨어뜨린 공
   같은 높이에서 한 공은 떨어뜨리고 한 공은 수평으로 던져요. 일정한 시간 간격(0.5초)마다 공의 위치를 찍어 보면
   수직 방향 운동은 같고, 수평 방향은 일정한 속도로 움직여요. 천체를 바꾸면 중력 가속도가 달라져 떨어지는 시간이 달라져요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const BODY = { moon: { n: '달', g: 1.6, c: 0x4a4f58 }, mars: { n: '화성', g: 3.7, c: 0x7a3a20 }, earth: { n: '지구', g: 9.8, c: 0x1f5a2c }, jup: { n: '목성', g: 24.8, c: 0x6a4a2a } };
  let H = 19.6, KY = 5.1 / 19.6, KX = 0.5, DT = 0.5, GY = 5, GX = 5;   // 단계에 따라 2D와 같은 높이·시간 간격으로 바뀌어요

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
      const lm = new THREE.LineBasicMaterial({ color: 0x5f78b0, transparent: true, opacity: 0.55 });
      function buildGrid() {
        while (gridG.children.length) { const o = gridG.children[0]; gridG.remove(o); o.geometry.dispose(); }
        const pts = [];
        for (let y = 0; y <= H + 1e-6; y += GY) { pts.push(new THREE.Vector3(-6, y * KY, -2.38), new THREE.Vector3(9, y * KY, -2.38)); }
        for (let x = 0; x * KX <= 14.5; x += GX) { pts.push(new THREE.Vector3(-5 + x * KX, 0, -2.38), new THREE.Vector3(-5 + x * KX, H * KY, -2.38)); }
        gridG.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), lm));
      }
      // 발사대
      const tower = new THREE.Mesh(new THREE.BoxGeometry(0.9, H * KY, 1.8), std(0x39425a, { roughness: 0.8 })); tower.position.set(-5.6, H * KY / 2, 0.2); root.add(tower);
      const X0 = -5.0, ZA = -0.45, ZB = 0.75;
      const ballA = new THREE.Mesh(new THREE.SphereGeometry(0.28, 32, 24), std(0x5aa7ff, { roughness: 0.3 })), ballB = new THREE.Mesh(new THREE.SphereGeometry(0.28, 32, 24), std(0xff7a3d, { roughness: 0.3 }));
      root.add(ballA, ballB);
      const labA = label('떨어뜨린 공', ballA, { offset: [0.0, 0.7, 0], size: 12, color: 'rgba(40,110,210,.92)' }), labB = label('던진 공', ballB, { offset: [0.2, 0.7, 0], size: 12, color: 'rgba(210,90,30,.92)' });
      const timeLab = label('', [X0 + 6, H * KY + 0.1, 0], { color: 'rgba(255,211,77,.92)' }); timeLab.el.style.color = '#1b2333';
      // 일정한 시간 간격 잔상
      const NG = 40, gA = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 20, 14), std(0x5aa7ff, { transparent: true, opacity: 0.55, roughness: 0.4 }), NG), gB = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 20, 14), std(0xff7a3d, { transparent: true, opacity: 0.55, roughness: 0.4 }), NG);
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
        const lv = ctx.level;
        info(lv === 0 ? '<b>자유 낙하</b> · 높이 ' + H + ' m에서 질량이 다른 두 공(1 kg · 5 kg)을 떨어뜨려요.<br>' + DT + '초마다 찍으면 두 공은 <b>항상 같은 높이</b>에요.'
          : '<b>' + BODY[body].n + '</b> · g = ' + BODY[body].g + ' m/s² · 높이 ' + H + ' m · 수평 속력 <b>' + v0.toFixed(1) + ' m/s</b> · 낙하 시간 <b>' + T.toFixed(2) + ' 초</b><br>' + DT + '초마다 찍은 공: 두 공은 <b>항상 같은 높이</b>예요. 수평 방향 간격은 일정해요.' + (lv === 3 ? '' : ' (t = √(2h ÷ g))'));
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
      const ctlEl = document.querySelector('.v3-ctl'); const gBody = [], gSpd = [];
      let n0 = ctlEl.children.length;
      const segB = controls.segment('천체', Object.keys(BODY).map((k) => ({ value: k, label: BODY[k].n })), body, (v) => { const L = window.__sim; if (L && L.setBody) L.setBody(v); body = v; lastKey = ''; });
      for (let i = n0; i < ctlEl.children.length; i++) gBody.push(ctlEl.children[i]);
      n0 = ctlEl.children.length;
      const rv = controls.range('수평 속력', 0, 4, 0.5, v0, (v) => {
        const L = window.__sim;
        if (ctx.level === 2 && L && L.setCv) L.setCv(v);
        else { const el = document.getElementById('sV'); if (el) { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); } }
        v0 = v; lastKey = '';
      }, (v) => v.toFixed(1) + ' m/s');
      for (let i = n0; i < ctlEl.children.length; i++) gSpd.push(ctlEl.children[i]);
      let demoP = 0;
      const pl = controls.player({
        duration: 6, loop: true, autoplay: false, label: '던지기',
        phases: [[0, '출발'], [0.8, '땅에 닿음']],
        onFrame(p) { demoP = p; t = Math.min(1, p / 0.8) * Tf(); state = 'manual'; paint(); },
      });
      // 2D 단계에 맞춰 높이 · 시간 간격 · 속력 · 천체를 같게 해요
      let lastKey = '';
      function applyLevel() {
        const L = window.__sim, S = L && L.S, lv = ctx.level;
        let nb = 'earth', nv = 0;
        if (S) { nb = lv === 3 ? S.body : 'earth'; nv = lv === 0 ? 0 : lv === 1 ? S.v : lv === 2 ? S.cv : 3.0; }
        else { nb = 'earth'; nv = lv === 3 ? 3.0 : 2; }
        const key = lv + '|' + nb + '|' + nv;
        if (key === lastKey) return; lastKey = key;
        body = BODY[nb] ? nb : 'earth'; v0 = nv;
        if (lv < 3) { H = 2.0; DT = 0.1; GY = 0.5; GX = 0.5; KY = 5.1 / 2.0; KX = 2.6; } else { H = 19.6; DT = 0.5; GY = 5; GX = 5; KY = 5.1 / 19.6; KX = 0.5; }
        buildGrid();
        gBody.forEach((e) => { e.style.display = lv === 3 ? '' : 'none'; }); gSpd.forEach((e) => { e.style.display = lv === 1 || lv === 2 ? '' : 'none'; });
        segB.set(body); rv.set(v0);
        labA.set(lv === 0 ? '1 kg 공' : '떨어뜨린 공'); labB.set(lv === 0 ? '5 kg 공' : '던진 공');
        ballA.material.color.setHex(lv === 0 ? 0x5aa7ff : 0x5aa7ff); ballB.material.color.setHex(lv === 0 ? 0xf5a524 : 0xff7a3d);
        ballB.scale.setScalar(lv === 0 ? 1.25 : 1);
        gnd.material.color.setHex(BODY[body].c);
        t = 0; state = 'run'; rebuildPaths(); paint();
      }
      /* 4단계 점프 체험: 같은 3.0 m/s로 뛰어오를 때 천체마다 높이가 달라요 (2D의 점프와 같은 시간) */
      const JUMP_V = 3.0, KJ = 1.2, jumpG = new THREE.Group(); root.add(jumpG); jumpG.visible = false;
      const jumpers = Object.keys(BODY).map((k, i) => {
        const x = -3.6 + i * 3.2, pad = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.08, 32), std(BODY[k].c, { roughness: 0.9 })); pad.position.set(x, 0.05, 0.6); jumpG.add(pad);
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.32, 28, 20), std(0xffd34d, { roughness: 0.35 })); b.position.set(x, 0.4, 0.6); jumpG.add(b);
        const hmax = JUMP_V * JUMP_V / (2 * BODY[k].g), top = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.03, 0.03), new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0.7 })); top.position.set(x, hmax * KJ + 0.4, 0.6); jumpG.add(top);
        const lb = label(BODY[k].n + ' · 최고 ' + (hmax >= 1 ? hmax.toFixed(1) : hmax.toFixed(2)) + ' m', [x, hmax * KJ + 0.75, 0.6], { size: 12 }); lb.show(false);
        return { k, b, lb, x };
      });
      const throwObjs = () => [ballA, ballB, gA, gB, links, path, vline, tower].filter(Boolean);
      let jumpOn = false;
      function setJump(on) {
        if (on === jumpOn) return; jumpOn = on; jumpG.visible = on; jumpers.forEach((j) => j.lb.show(on));
        throwObjs().forEach((o) => { o.visible = !on; }); [labA, labB, timeLab].forEach((l) => l.show(!on));
        if (on) info('<b>점프 체험</b>: 네 천체에서 똑같이 <b>3.0 m/s</b>로 뛰어올라요.<br>중력 가속도가 작을수록 더 높이, 더 오래 떠 있어요. (달은 지구의 약 6배 높이)'); else lastKey = '';
      }
      function follow2D() {   // 4단계: 2D의 [▶ 놓고 던지기] · [🦘 점프 체험]을 그대로 따라가요
        const L = window.__sim, S = L && L.S; if (!S || ctx.level !== 3) { setJump(false); return false; }
        if (S.mode === 'jump') {
          setJump(true); throwObjs().forEach((o) => { o.visible = false; }); const tt = S.J && S.J.state !== 'idle' ? S.J.t : 0;
          jumpers.forEach((j) => { const g = BODY[j.k].g, y = Math.max(0, JUMP_V * tt - 0.5 * g * tt * tt); j.b.position.y = 0.4 + y * KJ; });
          return true;
        }
        setJump(false);
        const P = S.P; if (!P) return false;
        t = P.state === 'run' || P.state === 'done' ? P.t : 0; state = 'manual'; paint(); return true;
      }
      ctx.onLevel(() => { applyLevel(); });
      rebuildPaths(); t = 0; state = 'run'; paint(); applyLevel();
      return {
        update(dt) {
          applyLevel();
          if (demoP > 0 || pl.playing) { setJump(false); return; }
          if (follow2D()) return;
          if (state === 'manual') { state = 'run'; t = 0; }
          if (state === 'done') { hold += dt; if (hold > 2.4) { t = 0; hold = 0; state = 'run'; paint(); } }
          if (state === 'run') { t += dt; if (t >= Tf()) { t = Tf(); state = 'done'; } paint(); }
        },
        sync() { paint(); },
      };
    },
  });
})();
