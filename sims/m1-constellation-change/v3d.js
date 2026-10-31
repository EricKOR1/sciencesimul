/* m1-constellation-change · 3D 지구 공전과 황도 12궁
   태양을 가운데 두고 지구가 북극 위에서 볼 때 시계 반대 방향으로 공전해요. 한밤중에는 지구가 태양의 '반대쪽'을 바라보므로,
   달마다 한밤중 남쪽 하늘에 보이는 별자리가 바뀌어요. (크기·거리는 실제와 달라요. 별자리 그림은 2D 화면과 같은 별 자료를 써요.)
   링 각도 a: 태양 쪽에서 본 방향을 시계 반대 방향으로 잰 각 (궁수자리 한가운데 = 0°),  지구 위치각 θE(월 초) = 180° + 30°(월 − 1). */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const DEG = Math.PI / 180, RO = 3.9, RZ = 7.2, KF = 0.074, LAT = 37.5, EPS = 23.44 * DEG;
  const norm = (a) => ((a % 360) + 360) % 360;
  const ring = (a, r, y) => [r * Math.cos(a * DEG), y || 0, -r * Math.sin(a * DEG)];
  const wide = (window.innerWidth || 1000) >= 600;

  window.SciSim3D.attach({
    host: '.stage-card',
    title: '3D 공전과 한밤중 별자리',
    hint: ' ',
    camera: { dist: wide ? 19 : 40, theta: 0.35, phi: 0.82, fov: 45, target: [0, 0, 0], min: 2.5, max: 50 },
    autoRotate: 0,
    build(ctx) {
      const { THREE, scene, root, label, info, controls, orbit } = ctx;
      const st = { m: 1, play: false, follow: false };
      try { const s = window.__sim && window.__sim.S; if (s && typeof s.th === 'number') st.m = ((((s.th - 180) / 30) % 12) + 12) % 12 + 1; } catch (e) {}
      const ZODS = (window.__sim && window.__sim.ZODS) || [];

      /* 빛: 태양에서 퍼지는 점광원 */
      scene.traverse((o) => { if (o.isDirectionalLight) o.intensity = 0; if (o.isHemisphereLight) o.intensity = 0.42; });
      const sunLight = new THREE.PointLight(0xfff0cc, 2.4, 0, 0); root.add(sunLight);

      /* 배경 별 */
      { let seed = 99; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; const pos = [];
        for (let i = 0; i < 380; i++) { const u = rnd() * 2 - 1, a = rnd() * Math.PI * 2, r = Math.sqrt(1 - u * u); pos.push(Math.cos(a) * r * 60, u * 60, Math.sin(a) * r * 60); }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        root.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0x9fb4e8, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.6 }))); }

      /* 태양 */
      const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,230,140,1)'); gr.addColorStop(0.25, 'rgba(255,190,60,.55)'); gr.addColorStop(1, 'rgba(255,160,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
      const sun = new THREE.Mesh(new THREE.SphereGeometry(0.62, 32, 20), new THREE.MeshBasicMaterial({ color: 0xffd23f })); root.add(sun);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); glow.scale.set(4.4, 4.4, 1); root.add(glow);
      label('☀ 태양', [0, 0.95, 0], { size: 13, color: 'rgba(120,70,0,.85)' });

      /* 공전 궤도 + 방향 화살표 + 달 표시 */
      { const pts = []; for (let i = 0; i <= 120; i++) pts.push(new THREE.Vector3(...ring(i * 3, RO))); root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x8fb4ff, transparent: true, opacity: 0.7 }))); }
      [45, 135, 225, 315].forEach((a) => { // 시계 반대 방향 화살촉 (접선: a가 커지는 쪽)
        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.4, 12), new THREE.MeshBasicMaterial({ color: 0x8fb4ff }));
        cone.position.set(...ring(a, RO)); const tdir = new THREE.Vector3(-Math.sin(a * DEG), 0, -Math.cos(a * DEG));
        cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tdir); root.add(cone);
      });
      label('공전 ⟲ (시계 반대 방향)', ring(250, RO, 0), { size: 11.5, offset: [0, -0.1, 0.1], color: 'rgba(30,50,110,.8)' });
      const monLabs = [];
      for (let i = 1; i <= 12; i++) {
        const a = 180 + 30 * (i - 1);
        const tk = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: 0xcfe0ff })); tk.position.set(...ring(a, RO)); root.add(tk);
        monLabs.push(label(i + '월', ring(a, RO + 0.62), { size: 11 }));
      }

      /* 지구 */
      const earthTex = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d'); g.fillStyle = '#2f7fd8'; g.fillRect(0, 0, 256, 128); g.fillStyle = '#4caf6a';
        let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
        for (let i = 0; i < 16; i++) { const x = rnd() * 256, y = 20 + rnd() * 88; for (let j = 0; j < 7; j++) { g.beginPath(); g.ellipse(x + (rnd() - 0.5) * 30, y + (rnd() - 0.5) * 18, 6 + rnd() * 16, 4 + rnd() * 9, rnd() * 3, 0, 7); g.fill(); } }
        g.fillStyle = '#f2f6fa'; g.fillRect(0, 0, 256, 7); g.fillRect(0, 121, 256, 7); return new THREE.CanvasTexture(c); })();
      const earth = new THREE.Group(); root.add(earth);
      earth.add(new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 20), new THREE.MeshStandardMaterial({ map: earthTex, roughness: 0.75 })));
      // 자전축 (공간에서 늘 같은 방향: 북극성 쪽)  → 링 각도 170° 쪽으로 23.4° 기울어요
      const aX = Math.sin(EPS) * Math.cos(170 * DEG), aZ = -Math.sin(EPS) * Math.sin(170 * DEG), aY = Math.cos(EPS);
      const axis = new THREE.Vector3(aX, aY, aZ).normalize();
      earth.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([axis.clone().multiplyScalar(-0.95), axis.clone().multiplyScalar(0.95)]), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 })));
      const nCone = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 10), new THREE.MeshBasicMaterial({ color: 0xffffff })); nCone.position.copy(axis).multiplyScalar(0.98); nCone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis); earth.add(nCone);
      const pin = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 8), new THREE.MeshBasicMaterial({ color: 0xff3b3b })); earth.add(pin);
      const earthLab = label('지구', earth, { size: 13, offset: [0, 0.82, 0] });
      const seoulLab = label('서울', pin, { size: 11.5, color: 'rgba(150,20,20,.85)' }); seoulLab.off = [0, 0.3, 0];
      // 한밤중 방향 화살표 (태양 반대쪽)
      const arrow = new THREE.Group(); const aLine = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 8), new THREE.MeshBasicMaterial({ color: 0xffd34d })); aLine.position.y = 0.5; arrow.add(aLine);
      const aCone = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.4, 12), new THREE.MeshBasicMaterial({ color: 0xffd34d })); arrow.add(aCone); root.add(arrow);
      const dayLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(1, 0, 0)]), new THREE.LineDashedMaterial({ color: 0xffb347, dashSize: 0.18, gapSize: 0.14, transparent: true, opacity: 0.8 })); root.add(dayLine);

      /* 황도 12궁 별자리 (링 위, 지구에서 바라본 모양) */
      const figs = ZODS.map((c) => {
        const a = c.ang, ctr = c.orion ? ring(a, RZ, -2.7) : ring(a, RZ, 0), right = new THREE.Vector3(Math.sin(a * DEG), 0, Math.cos(a * DEG));
        const P = c.st.map((s) => new THREE.Vector3(...ctr).addScaledVector(right, (s.lx - c.cx0) * KF).add(new THREE.Vector3(0, -(s.ly - c.cy0) * KF, 0)));
        const pg = new THREE.BufferGeometry().setFromPoints(P), col = new THREE.Color(c.col);
        const cl = []; c.st.forEach((s) => { const k = new THREE.Color(s.col || '#eef3ff'); cl.push(k.r, k.g, k.b); }); pg.setAttribute('color', new THREE.Float32BufferAttribute(cl, 3));
        const pm = new THREE.PointsMaterial({ size: 6, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.5 }); root.add(new THREE.Points(pg, pm));
        const seg = []; c.lines.forEach((l) => { seg.push(P[l[0]], P[l[1]]); });
        const lm = new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.4 }); root.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(seg), lm));
        const lab = label(c.name, [ctr[0], ctr[1] + (c.orion ? -1.55 : 1.45), ctr[2]], { size: 12 }); lab.el.style.color = c.col;
        return { c, pm, lm, lab, a };
      });
      if (!ZODS.length) label('별자리 자료를 불러오지 못했어요', [0, 2, 0], {});

      const angDiff = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
      let last = '';
      function refresh() {
        const thE = norm(180 + 30 * (st.m - 1)), mi = Math.floor(st.m + 1e-6) > 12 ? 1 : Math.floor(st.m + 1e-6);
        const e = ring(thE, RO); earth.position.set(...e);
        // 지구에서 바깥(한밤중) 방향, 태양 방향
        const out = new THREE.Vector3(...ring(thE, 1)), toSun = out.clone().negate();
        arrow.position.set(...ring(thE, RO + 0.55)); arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), out);
        const L = RZ - RO - 1.2; aLine.scale.y = L; aLine.position.y = L / 2; aCone.position.y = L + 0.2;
        const dp = dayLine.geometry.attributes.position; dp.setXYZ(0, ...ring(thE, RO - 0.55)); dp.setXYZ(1, 0, 0, 0); dp.needsUpdate = true; dayLine.computeLineDistances();
        // 서울: 한밤중 위치 (태양 반대쪽 면, 북위 37.5°)
        const sp = toSun.clone().sub(axis.clone().multiplyScalar(toSun.dot(axis))).normalize();
        const up = sp.clone().multiplyScalar(-Math.cos(LAT * DEG)).addScaledVector(axis, Math.sin(LAT * DEG));
        pin.position.copy(up).multiplyScalar(0.5);
        // 한밤중·태양 쪽 별자리
        let mid = null, md = 1e9, sunC = null, sd = 1e9;
        figs.forEach((f) => { if (f.c.orion) return; const d = angDiff(f.a, thE); if (d < md) { md = d; mid = f; } const d2 = angDiff(f.a, thE + 180); if (d2 < sd) { sd = d2; sunC = f; } });
        figs.forEach((f) => {
          const isMid = f === mid, isSun = f === sunC, ori = f.c.orion && angDiff(165, thE) < 25;
          f.pm.opacity = isMid || ori ? 1 : isSun ? 0.25 : 0.55; f.lm.opacity = isMid || ori ? 1 : isSun ? 0.2 : 0.4;
          const tx = f.c.name + (isMid ? ' 🌙' : ori ? ' 🌙' : isSun ? ' ☀' : ''); if (f.tx !== tx) { f.tx = tx; f.lab.set(tx); } f.lab.el.style.fontSize = isMid ? '14px' : '12px';
          f.lab.el.style.opacity = isSun ? 0.55 : 1; f.lab.el.style.outline = isMid ? '2px solid #ffd34d' : 'none';
        });
        monLabs.forEach((l, i) => { const on = i + 1 === mi; l.el.style.background = on ? '#ffd34d' : ''; l.el.style.color = on ? '#1b2333' : ''; l.el.style.fontSize = on ? '13px' : '11px'; });
        {
          const html = ('<b>' + mi + '월</b> 한밤중 · 지구가 태양의 반대쪽, <b>' + (mid ? mid.c.name : '') + '</b> 🌙 방향을 바라봐요.<br>' +
            '<span style="color:#ffb347">☀ 태양 쪽(' + (sunC ? sunC.c.name : '') + ')</span>은 낮이라 별이 안 보여요.<br>지구가 공전하면 한밤중 방향이 달라져 <b>별자리가 계절마다 바뀌어요.</b>');
          if (html !== last) { last = html; info(html); }
        }
        sun.visible = true;
      }

      /* 조작 */
      const monthName = (m) => (Math.floor(m + 1e-6) > 12 ? 1 : Math.floor(m + 1e-6)) + '월';
      const probe = controls.text(''); probe.style.display = 'none'; const ctlEl = probe.parentElement;
      const fixLab = (em) => { const k = ctlEl.children, inp = k[k.length - 1], l = k[k.length - 2]; l.style.minWidth = em + 'em'; l.style.display = 'inline-block'; const g = document.createElement('span'); g.style.cssText = 'display:inline-flex;align-items:center;gap:8px;flex-wrap:nowrap'; ctlEl.insertBefore(g, l); g.append(l, inp); };
      const rng = controls.range('📅', 1, 13, 0.05, st.m, (v) => { st.m = v; st.play = false; playB.textContent = '▶ 공전 재생'; refresh(); }, monthName);
      fixLab(4.5);
      const playB = controls.button('▶ 공전 재생', () => { st.play = !st.play; playB.textContent = st.play ? '⏸ 멈춤' : '▶ 공전 재생'; });
      controls.text('').style.cssText = 'flex-basis:100%;height:0;padding:0;margin:-3px 0';
      controls.segment('시점', [{ value: 'all', label: '🌐 전체' }, { value: 'earth', label: '🌍 지구 따라가기' }], 'all', (v) => {
        st.follow = v === 'earth';
        if (st.follow) { orbit.dist = 5; orbit.phi = 1.0; } else { Object.assign(orbit, { dist: wide ? 19 : 40, theta: 0.35, phi: 0.82, tx: 0, ty: 0, tz: 0 }); }
      });
      refresh();

      return {
        update(dt) {
          if (st.play) { st.m += dt / 1.2; if (st.m >= 13) st.m -= 12; rng.set(st.m); refresh(); }
          if (st.follow) { const p = earth.position; orbit.tx += (p.x - orbit.tx) * Math.min(1, dt * 8); orbit.ty += (p.y - orbit.ty) * Math.min(1, dt * 8); orbit.tz += (p.z - orbit.tz) * Math.min(1, dt * 8); }
          seoulLab.show(orbit.dist < 9);
        },
        sync() {
          try { const s = window.__sim && window.__sim.S; if (s && typeof s.th === 'number') { st.m = ((((s.th - 180) / 30) % 12) + 12) % 12 + 1; rng.set(st.m); refresh(); } } catch (e) {}
        },
      };
    },
  });
})();
