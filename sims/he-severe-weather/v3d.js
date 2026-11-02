/* he-severe-weather · 3D 뇌우(적란운)의 일생
   적운 → 성숙 → 소멸 단계에서 상승 기류·하강 기류·비·모루 구름이 어떻게 달라지는지 입체로 봐요.
   성숙 단계에서는 구름 속 전하 분리와 번개(⚡), 번쩍 뒤 천둥까지 걸린 시간으로 거리를 어림하는 것도 볼 수 있어요.
   2D 실험의 단계(S.stage)를 읽어 따라가요(읽기 전용). */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const lerp = (a, b, t) => a + (b - a) * t;
  const STG = [null, { name: '적운 단계', up: 0.8, down: 0, rain: 0, top: 0.5, anvil: 0, fade: 0 }, { name: '성숙 단계', up: 1, down: 0.9, rain: 1, top: 1, anvil: 1, fade: 0 }, { name: '소멸 단계', up: 0.1, down: 0.8, rain: 0.4, top: 0.85, anvil: 1, fade: 0.55 }];

  window.SciSim3D.attach({
    title: '뇌우(적란운) 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    levels: [0],
    camera: { dist: PHONE ? 14 : 9.2, theta: 0.5, phi: 1.3, min: 6, max: 28, target: [0.6, 2.5, 0] },
    autoRotate: 0.08,
    build(ctx) {
      if (ctx.THREE.ColorManagement) ctx.THREE.ColorManagement.legacyMode = false;     // 색을 보이는 그대로(sRGB) 쓰도록 맞춰요
      const { THREE, root, label, info, controls } = ctx;
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.9, metalness: 0 }, o || {}));
      let sd = 5; const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };

      /* 땅 · 마을 */
      const ground = new THREE.Mesh(new THREE.CylinderGeometry(6.4, 6.4, 0.3, 72), std(0x3b6a3a)); ground.position.y = -0.15; root.add(ground);
      { const hm = [std(0xe8d9b9), std(0xd9826a), std(0xb9c6d8)];
        [[-3.6, 1.2], [-4.2, -0.3], [-3.2, -1.7], [4.0, 1.6], [4.4, -0.6], [3.4, -2.2]].forEach((p, i) => { const h = new THREE.Group(), b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.36, 0.42), hm[i % 3]), r = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.28, 4), std(0x6b4e3d)); r.rotation.y = Math.PI / 4; b.position.y = 0.18; r.position.y = 0.5; h.add(b, r); h.position.set(p[0], 0, p[1]); root.add(h); });
        const tw = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.06, 0.95, 8), std(0x9aa5b4, { metalness: 0.6, roughness: 0.4 })); tw.position.set(3.0, 0.48, 0.4); root.add(tw); }

      /* 구름 기둥 + 모루 */
      const BASE = 1.35, H = 4.3;
      const col = [], NB = 84, cloud = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 20, 14), std(0xffffff, { roughness: 1, transparent: true, opacity: 1, emissive: 0x000000 }), NB + 40);
      for (let i = 0; i < NB; i++) { const f = (i % 12) / 11, a = rnd() * 6.283, rr = Math.sqrt(rnd()) * lerp(1.05, 0.85, f) * (1 + (f > 0.8 ? 0.35 : 0)); col.push({ f, x: Math.cos(a) * rr, z: Math.sin(a) * rr, s: lerp(0.85, 0.7, f) * (0.7 + rnd() * 0.5) }); }
      const anv = []; for (let i = 0; i < 40; i++) { const u = rnd(); anv.push({ x: -0.8 + u * 5.2, z: (rnd() - 0.5) * lerp(2.6, 1.4, u), s: lerp(0.9, 0.55, u) * (0.7 + rnd() * 0.5), u }); }
      root.add(cloud);
      const cA = new THREE.Color(), cB = new THREE.Color(), dm = new THREE.Object3D();

      /* 전하 · 번개 */
      const sym = (txt, col) => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.fillStyle = col; g.beginPath(); g.arc(32, 32, 28, 0, 7); g.fill(); g.fillStyle = '#fff'; g.font = '900 44px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 32, 36); return new THREE.CanvasTexture(c); };
      const plusT = sym('+', '#e53e3e'), minT = sym('−', '#2b6cd9');
      const ch = []; for (let i = 0; i < 10; i++) { const pl = i < 5, s = new THREE.Sprite(new THREE.SpriteMaterial({ map: pl ? plusT : minT, depthTest: false, transparent: true })); s.scale.setScalar(0.34); s.renderOrder = 5; s.userData = { pl, i: pl ? i : i - 5, a: rnd() * 6.283, r: rnd() * 0.7 }; root.add(s); ch.push(s); }
      const boltM = new THREE.MeshBasicMaterial({ color: 0xfff6b0 }), bolt = new THREE.Mesh(new THREE.BufferGeometry(), boltM); bolt.visible = false; root.add(bolt);
      let flash = 0, strikeT = -1, wait = -1, pendingInfo = '';

      /* 기류 · 비 입자 */
      const NU = 26, upP = new THREE.InstancedMesh(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffa23a }), NU); root.add(upP);
      const ND = 26, dnP = new THREE.InstancedMesh(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshBasicMaterial({ color: 0x66d9ff }), ND); root.add(dnP);
      const NR = 90, rain = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.012, 0.012, 0.42, 5), new THREE.MeshBasicMaterial({ color: 0xaed4ff, transparent: true, opacity: 0.85 }), NR); root.add(rain);
      const rs = []; for (let i = 0; i < NR; i++) { const a = rnd() * 6.283, r = Math.sqrt(rnd()) * 1.5; rs.push([Math.cos(a) * r + 0.9, Math.sin(a) * r, rnd()]); }

      const LB = {
        up: label('상승 기류', [-1.4, 2.0, 0], { size: 12, color: 'rgba(170,70,10,.92)' }), dn: label('하강 기류', [1.8, 1.0, 0], { size: 12, color: 'rgba(15,100,150,.92)' }),
        rain: label('비·우박', [2.3, 0.3, 0.8], { size: 12 }), anv: label('모루 구름', [3.2, 5.4, 0], { size: 12 }), pos: label('+ 전하', [0, 4.9, 0], { size: 11.5, color: 'rgba(170,30,30,.92)' }), neg: label('− 전하', [0, 2.0, 0.9], { size: 11.5, color: 'rgba(30,70,170,.92)' }),
      };

      /* 상태 */
      let st = 1;
      const cur = Object.assign({}, STG[1]);
      const rdS = () => { try { const s = window.__sim && window.__sim.S; return s && s.mode === 'storm' && s.stage >= 1 && s.stage <= 3 ? s.stage : null; } catch (e) { return null; } };
      let lastSim = rdS(); if (lastSim) { st = lastSim; Object.assign(cur, STG[st]); }
      const seg = controls.segment('단계', [{ value: 1, label: '적운' }, { value: 2, label: '성숙' }, { value: 3, label: '소멸' }], st, (v) => { st = v; text(); });
      controls.button('⚡ 번개 치게 하기', () => { if (st !== 2) { st = 2; seg.set(2); text(); wait = 1.2; } else wait = 0; });
      function text() {
        const t = ['', '<b>적운 단계</b>: 상승 기류만 있어요. 구름이 위로 자라요.', '<b>성숙 단계</b>: 상승·하강 기류가 함께 있어요. 비·우박·번개가 가장 심해요.', '<b>소멸 단계</b>: 하강 기류가 우세해요. 상승 기류가 약해져 비가 줄고 구름이 흩어져요.'];
        info(pendingInfo || t[st]);
      }
      function strike() {
        const x0 = -0.6 + rnd() * 1.6, z0 = (rnd() - 0.5) * 1.2, pts = []; let n = 14;
        for (let i = 0; i <= n; i++) { const f = i / n; pts.push(new THREE.Vector3(x0 + (i % 2 ? 1 : -1) * (i > 0 && i < n ? 0.18 + rnd() * 0.2 : 0) + f * 0.6, lerp(BASE + 0.1, 0.05, f), z0 + (rnd() - 0.5) * 0.15)); }
        bolt.geometry.dispose(); bolt.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.3), 40, 0.05, 6, false);
        bolt.visible = true; flash = 1; strikeT = 0;
        pendingInfo = '번쩍! <b>3초</b> 뒤에 천둥이 들리면 번개는 약 <b>1 km</b> 거리예요. (소리는 1초에 약 340 m)<br>성숙 단계에서는 번개가 쳐요.';
        text(); setTimeout(() => { pendingInfo = ''; text(); }, 5000);
      }
      text();

      const tmp = new THREE.Vector3();
      return {
        update(dt, t) {
          { const s0 = rdS(); if (s0 && s0 !== lastSim) { lastSim = s0; st = s0; seg.set(s0); pendingInfo = ''; text(); } }
          const k = 1 - Math.exp(-2 * dt), tg = STG[st];
          ['up', 'down', 'rain', 'top', 'anvil', 'fade'].forEach((n) => { cur[n] += (tg[n] - cur[n]) * k; });
          if (wait >= 0) { wait -= dt; if (wait <= 0) { wait = -1; strike(); } }
          const top = BASE + 0.9 + (H - 0.9) * cur.top;
          let n = 0;
          for (let i = 0; i < NB; i++) {
            const c = col[i], y = lerp(BASE, top, c.f), vis = Math.max(0, Math.min(1, (cur.top * 1.05 - c.f * cur.top) * 5)), grow = 0.8 + 0.2 * cur.up;
            dm.position.set(c.x * grow + 0.04 * Math.sin(t * 0.8 + i), y + 0.05 * Math.sin(t + i * 2), c.z * grow); dm.scale.setScalar(Math.max(0.0001, c.s * vis * (1 + 0.04 * Math.sin(t * 1.3 + i)))); dm.scale.y *= 0.82; dm.updateMatrix();
            cloud.setMatrixAt(n, dm.matrix);
            cA.setRGB(1, 1, 1); cB.setRGB(0.5, 0.54, 0.62); cA.lerp(cB, Math.max(0, 1 - c.f * 1.4) * (0.35 + 0.6 * Math.max(cur.rain, cur.up * 0.5))); cloud.setColorAt(n, cA); n++;
          }
          for (let i = 0; i < anv.length; i++) {
            const a = anv[i], vis = Math.max(0, cur.anvil * 1.1 - a.u * 0.1);
            dm.position.set(a.x * (0.3 + 0.7 * cur.anvil) * 1.0, top - 0.15 + 0.03 * Math.sin(t + i), a.z * cur.anvil); dm.scale.set(a.s * vis * 1.3, a.s * vis * 0.42, a.s * vis * 1.1); if (vis < 0.01) dm.scale.setScalar(0.0001); dm.updateMatrix();
            cloud.setMatrixAt(n, dm.matrix); cA.setRGB(0.97, 0.98, 1); cloud.setColorAt(n, cA); n++;
          }
          cloud.count = n; cloud.instanceMatrix.needsUpdate = true; if (cloud.instanceColor) cloud.instanceColor.needsUpdate = true;
          cloud.material.opacity = 1 - 0.4 * cur.fade; cloud.material.emissive.setRGB(0.55 * flash, 0.62 * flash, 0.95 * flash);
          /* 전하 */
          const showCh = Math.max(0, cur.down - 0.2) / 0.7;
          ch.forEach((s) => { const u = s.userData; s.visible = showCh > 0.2; s.position.set(Math.cos(u.a + t * 0.2) * u.r * 0.9 - 0.2 + (u.pl ? 0.6 * cur.anvil : 0), u.pl ? top - 0.35 + (u.i % 2) * 0.1 : BASE + 0.25 + (u.i % 2) * 0.12, Math.sin(u.a + t * 0.2) * u.r * 0.9); });
          LB.pos.show(showCh > 0.5); LB.neg.show(showCh > 0.5); LB.pos.obj = [0.6 * cur.anvil, top - 0.7, 0.3]; LB.anv.obj = [3.0 * cur.anvil, top + 0.5, 0]; LB.anv.show(cur.anvil > 0.5);
          LB.up.show(cur.up > 0.3); LB.dn.show(cur.down > 0.3); LB.rain.show(cur.rain > 0.3);
          /* 번개 */
          if (strikeT >= 0) { strikeT += dt; flash = strikeT < 0.1 ? 1 : strikeT < 0.18 ? 0.2 : strikeT < 0.26 ? 0.9 : Math.max(0, 0.9 - (strikeT - 0.26) * 4); bolt.visible = strikeT < 0.4; if (strikeT > 0.7) { strikeT = -1; flash = 0; bolt.visible = false; } }
          /* 기류 입자 */
          for (let i = 0; i < NU; i++) { const u = (i / NU + t * 0.12 * (0.3 + cur.up)) % 1, y = lerp(0.15, top - 0.2, u), a = i * 2.4; dm.position.set(-0.7 + 0.35 * Math.cos(a) * (0.4 + u * 0.6), y, 0.35 * Math.sin(a)); dm.scale.setScalar(cur.up > 0.05 ? 1 : 0.0001); dm.updateMatrix(); upP.setMatrixAt(i, dm.matrix); }
          upP.instanceMatrix.needsUpdate = true;
          for (let i = 0; i < ND; i++) { const u = (i / ND + t * 0.14 * (0.3 + cur.down)) % 1, y = lerp(top - 0.8, 0.1, u), sp = u > 0.78 ? (u - 0.78) / 0.22 : 0, a = i * 2.1; dm.position.set(1.0 + 0.35 * Math.cos(a) + sp * 1.2, y, 0.4 * Math.sin(a) * (1 + sp * 2)); dm.scale.setScalar(cur.down > 0.05 && cur.top > 0.6 ? 1 : 0.0001); dm.updateMatrix(); dnP.setMatrixAt(i, dm.matrix); }
          dnP.instanceMatrix.needsUpdate = true;
          for (let i = 0; i < NR; i++) { const r = rs[i], f = (t * 0.8 + r[2]) % 1; dm.position.set(r[0], BASE + 0.1 - f * (BASE + 0.1), r[1]); dm.scale.setScalar(i < NR * cur.rain ? 1 : 0.0001); dm.updateMatrix(); rain.setMatrixAt(i, dm.matrix); }
          rain.instanceMatrix.needsUpdate = true;
        },
        sync() { const s = rdS(); if (s && s !== lastSim) { lastSim = s; st = s; seg.set(s); pendingInfo = ''; text(); } },
      };
    },
  });
})();
