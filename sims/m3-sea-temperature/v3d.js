/* m3-sea-temperature · 3D 바다의 층상 구조
   표층은 태양 에너지로 따뜻하고, 바람이 섞어 주어 수온이 일정한 혼합층이 생겨요. 그 아래 깊이에 따라 수온이 급격히 낮아지는 수온 약층, 그 아래 수온이 낮고 거의 일정한 심해층이 있어요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const ZM = 1000, HY = 6.2, BW = 3.4;
  const yOf = (z) => -HY * Math.sqrt(Math.max(0, Math.min(ZM, z)) / ZM);
  const xT = (T) => 3.0 + T / 30 * 3.2;
  const tcol = (T, c) => { const u = Math.max(0, Math.min(1, (T - 2) / 24)); c.setRGB(0.07 + 0.88 * u, 0.22 + 0.45 * (1 - Math.abs(u - 0.5) * 2) + 0.05, 0.62 * (1 - u) + 0.12); return c; };
  window.SciSim3D.attach({
    host: '.stage-card',
    title: '바닷물의 층 구조 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHN ? 19 : 14.5, theta: 0.5, phi: 1.3, min: 8, max: 34, target: [1.6, -2.9, 0] },
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3, C = THREE.Color;
      let wind = 1, season = 'sum', zp = 40, names = !PHN;
      const WD = [20, 60, 120];
      const sm = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0 }, o || {}));
      const prof = () => { const Ts = season === 'sum' ? 25 : 13, d = WD[wind] + (season === 'sum' ? 0 : 40), zt = d + 380; return { Ts, d, zt, T(z) { if (z <= d) return Ts; if (z <= zt) { const u = (z - d) / (zt - d); return Ts - (Ts - 6) * (1 - Math.pow(1 - u, 1.7)); } return 6 - 3.6 * Math.min(1, (z - zt) / (ZM - zt)); } }; };
      /* 물기둥 (색 그라데이션) */
      const NS = 80, geo = new THREE.BoxGeometry(BW, HY, BW, 1, NS, 1); geo.translate(0, -HY / 2, 0);
      geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 3), 3));
      const water = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, transparent: true, opacity: 0.82 })); root.add(water);
      const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(BW, HY, BW).translate(0, -HY / 2, 0)), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45 })); root.add(edge);
      const surf = new THREE.Mesh(new THREE.PlaneGeometry(BW + 0.01, BW + 0.01, 30, 30), sm(0x5fb4f0, { roughness: 0.15, transparent: true, opacity: 0.55, side: THREE.DoubleSide })); surf.rotation.x = -Math.PI / 2; surf.position.y = 0.01; root.add(surf);
      const sp0 = surf.geometry.attributes.position; const sx = [], sz = []; for (let i = 0; i < sp0.count; i++) { sx.push(sp0.getX(i)); sz.push(sp0.getY(i)); }
      const sun = new THREE.Mesh(new THREE.SphereGeometry(0.6, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffd34d })); sun.position.set(1.0, 2.4, -1.4); root.add(sun);
      const winds = []; for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.5, 12), new THREE.MeshBasicMaterial({ color: 0xe2e8f0, transparent: true, opacity: 0.85 })); m.rotation.z = -Math.PI / 2; root.add(m); winds.push(m); }
      /* 그래프 벽과 곡선 */
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(4.0, HY + 0.2), sm(0x0f172a, { transparent: true, opacity: 0.5, side: THREE.DoubleSide })); wall.position.set(4.7, -HY / 2, -BW / 2 + 0.01); root.add(wall);
      [0, 10, 20, 30].forEach((T) => { const g = new THREE.Mesh(new THREE.BoxGeometry(0.02, HY, 0.02), sm(0x94a3b8, { transparent: true, opacity: 0.5 })); g.position.set(xT(T), -HY / 2, -BW / 2 + 0.03); root.add(g); label(T + '°C', [xT(T), 0.3, -BW / 2 + 0.03], { size: 11, color: 'rgba(30,41,59,.85)' }); });
      [0, 100, 200, 500, 1000].forEach((z) => { label(z + ' m', [BW / 2 + 0.05, yOf(z), BW / 2], { size: 11, color: 'rgba(30,41,59,.8)' }); });
      let curve = null;
      /* 측정기 */
      const probe = new THREE.Group(); const pb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), sm(0xfde047, { emissive: 0xfde047, emissiveIntensity: 0.5 })); probe.add(pb); root.add(probe);
      const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1, 6), new THREE.MeshBasicMaterial({ color: 0xfde047 })); root.add(cable);
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), sm(0xfde047, { emissive: 0xfde047, emissiveIntensity: 0.6 })); root.add(dot);
      const guide = new THREE.Mesh(new THREE.BoxGeometry(BW + 3.3, 0.02, 0.02), new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.5 })); guide.position.x = 1.65; root.add(guide);
      const pLab = label('', probe, { offset: [-0.6, 0.0, 1.2], size: 13, color: 'rgba(15,23,42,.92)' });
      const lyL = [label('혼합층', [-BW / 2, 0, BW / 2], { color: 'rgba(194,65,12,.92)', size: 14 }), label('수온 약층', [-BW / 2, 0, BW / 2], { color: 'rgba(124,58,237,.92)', size: 14 }), label('심해층', [-BW / 2, 0, BW / 2], { color: 'rgba(30,64,175,.92)', size: 14 })];
      function refresh() {
        const P = prof(), cc = new C(), col = geo.attributes.color, pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) { const z = Math.pow(-pos.getY(i) / HY, 2) * ZM; tcol(P.T(z), cc); col.setXYZ(i, cc.r, cc.g, cc.b); } col.needsUpdate = true;
        if (curve) { root.remove(curve); curve.geometry.dispose(); }
        const pts = []; for (let i = 0; i <= 120; i++) { const z = Math.pow(i / 120, 2) * ZM; pts.push(new V3(xT(P.T(z)), yOf(z), -BW / 2 + 0.07)); }
        curve = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 240, 0.06, 8, false), sm(0xfb7185, { emissive: 0xfb7185, emissiveIntensity: 0.3, roughness: 0.4 })); root.add(curve);
        lyL[0].obj = [-BW / 2 - 0.15, yOf(P.d / 2), BW / 2]; lyL[1].obj = [-BW / 2 - 0.15, yOf((P.d + P.zt) / 2), BW / 2]; lyL[2].obj = [-BW / 2 - 0.15, yOf((P.zt + ZM) / 2), BW / 2];
        lyL.forEach((l) => l.show(names));
        probeUpdate();
        sun.scale.setScalar(season === 'sum' ? 1.2 : 0.75);
        const tSurf = P.Ts;
        info('<b>' + (season === 'sum' ? '여름' : '겨울') + ' · 바람 ' + ['약', '중', '강'][wind] + '</b><br>혼합층 약 <b>' + P.d + ' m</b>: 수온 ' + tSurf + '°C로 일정해요.<br>그 아래 수온 약층에서 수온이 급격히 낮아지고, 심해층은 낮고 일정해요.');
      }
      function probeUpdate() {
        const P = prof(), T = P.T(zp), y = yOf(zp);
        probe.position.set(0, y, BW / 2 + 0.3); cable.position.set(0, (y + 0.6) / 2, BW / 2 + 0.3); cable.scale.y = Math.max(0.01, 0.6 - y); dot.position.set(xT(T), y, -BW / 2 + 0.1); guide.position.y = y;
        const L = zp <= P.d ? '혼합층' : zp <= P.zt ? '수온 약층' : '심해층';
        pLab.set('수심 ' + Math.round(zp) + ' m · <b>' + T.toFixed(1) + '°C</b> (' + L + ')');
      }
      controls.segment('바람', [{ value: 0, label: '약' }, { value: 1, label: '중' }, { value: 2, label: '강' }], wind, (v) => { wind = v; refresh(); });
      controls.segment('계절', [{ value: 'sum', label: '여름' }, { value: 'win', label: '겨울' }], season, (v) => { season = v; refresh(); });
      controls.range('측정 수심', 0, ZM, 5, zp, (v) => { zp = v; probeUpdate(); }, (v) => Math.round(v) + ' m');
      const nb = controls.button('층 이름 ' + (names ? '✓' : '✕'), () => { names = !names; nb.textContent = '층 이름 ' + (names ? '✓' : '✕'); lyL.forEach((l) => l.show(names)); });
      refresh();
      return {
        update(dt, t) {
          const amp = [0.015, 0.04, 0.09][wind];
          for (let i = 0; i < sp0.count; i++) sp0.setZ(i, Math.sin(sx[i] * 2.6 + t * 2.2) * amp + Math.sin(sz[i] * 3.1 + t * 1.7) * amp * 0.8);
          sp0.needsUpdate = true; surf.geometry.computeVertexNormals();
          winds.forEach((m, i) => { m.visible = i < 2 + wind * 2; const u = (t * (0.35 + wind * 0.25) + i / 6) % 1; m.position.set(-3.8 + u * 7.4, 0.55 + (i % 3) * 0.28, -1.1 + (i % 3) * 1.1); });
          sun.position.y = 2.4 + Math.sin(t * 0.7) * 0.05;
        },
      };
    },
  });
})();
