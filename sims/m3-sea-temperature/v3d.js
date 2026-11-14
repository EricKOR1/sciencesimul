/* m3-sea-temperature · 3D 바다의 층상 구조
   2D 차시와 같은 자료·같은 장면: ① 측정기 내리기(동해 2월) ② 수조 실험(적외선등·바람) ③ 해수의 층상 구조(혼합층·수온 약층·심해층) ④ 우리나라 바다(동해·황해·남해, 2월·8월)
   2D 실험 상태(window.__sim)를 읽어 같은 값을 보여 줘요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const HY = 6.2, BW = 3.4, TH = 4.8, TWD = 5.2;                       // 물기둥 높이·폭 · 수조 높이·폭
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const xT = (T) => 3.0 + T / 30 * 3.2;
  const TCOL = [[0, 0x1e3a8a], [8, 0x0ea5e9], [16, 0x34d399], [22, 0xfacc15], [28, 0xf97316]];   // 2D 차시의 수온 색
  const BANDS = [{ k: 'mixed', z0: 0, z1: 100, name: '혼합층', c: 0x10b981, bg: 'rgba(5,150,105,.92)' }, { k: 'thermo', z0: 100, z1: 300, name: '수온 약층', c: 0xf59e0b, bg: 'rgba(180,83,9,.92)' }, { k: 'deep', z0: 300, z1: 1000, name: '심해층', c: 0x6366f1, bg: 'rgba(67,56,202,.92)' }];
  window.SciSim3D.attach({
    host: '.stage-card',
    title: '바닷물의 층 구조 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHN ? 19 : 14.5, theta: 0.5, phi: 1.3, min: 8, max: 34, target: [1.6, -2.9, 0] },
    autoRotate: 0,
    levels: [0, 3],            // 1단계(측정기 내리기 · 수온 점 그래프)·4단계(우리나라 바다)는 3D. 수조 실험 결과 비교(그래프 선) · 이름표 · 물 덩어리 끌기는 2D
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3, C = THREE.Color;
      const sm = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0 }, o || {}));
      const tcol = (T, c) => { for (let i = 1; i < TCOL.length; i++) if (T <= TCOL[i][0] || i === TCOL.length - 1) { const a = TCOL[i - 1], b = TCOL[i]; return c.setHex(a[1]).lerp(new C(b[1]), clamp((T - a[0]) / (b[0] - a[0]), 0, 1)); } return c; };
      const labCol = (T, c) => (T <= 25 ? c.set('#bfe9f2').lerp(new C('#fde68a'), clamp((T - 20) / 5, 0, 1)) : c.set('#fde68a').lerp(new C('#fb923c'), clamp((T - 25) / 5, 0, 1)));
      let sea = 'east', season = 2, scene = 'column', depth = 1000, pz = 0, sig = '', curve = null, dotKey = '', infoK = -1;
      const seaG = new THREE.Group(), tankG = new THREE.Group(); root.add(seaG, tankG);
      /* ---------- 바다 물기둥 ---------- */
      const NS = 80, geo = new THREE.BoxGeometry(BW, HY, BW, 1, NS, 1); geo.translate(0, -HY / 2, 0);
      geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 3), 3));
      const water = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.12, transparent: true, opacity: 0.82, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.5 })); seaG.add(water);   // 바닷물: 수온 색 + 반짝이는 겉면
      const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(BW, HY, BW).translate(0, -HY / 2, 0)), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45 })); seaG.add(edge);
      const floor = new THREE.Mesh(new THREE.BoxGeometry(BW + 0.3, 0.25, BW + 0.3), ctx.mats.stone(0xb08d57, { repeat: 3, bump: 0.04 })); floor.position.y = -HY - 0.12; seaG.add(floor);   // 바다 밑 모래
      const surf = new THREE.Mesh(new THREE.PlaneGeometry(BW + 0.01, BW + 0.01, 30, 30), ctx.mats.liquid(0x5fb4f0, { opacity: 0.55, extra: { side: THREE.DoubleSide } })); surf.rotation.x = -Math.PI / 2; surf.position.y = 0.01; seaG.add(surf);
      const sp0 = surf.geometry.attributes.position; const sx = [], sz = []; for (let i = 0; i < sp0.count; i++) { sx.push(sp0.getX(i)); sz.push(sp0.getY(i)); }
      const sun = new THREE.Mesh(new THREE.SphereGeometry(0.6, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffd34d })); sun.position.set(1.0, 2.4, -1.4); seaG.add(sun); ctx.halo(sun, 0xffd34d, 2.6, 0.6);   // 햇빛 번짐
      /* 그래프 벽 (수온 축) */
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(4.0, HY + 0.2), sm(0x0f172a, { transparent: true, opacity: 0.5, side: THREE.DoubleSide })); wall.position.set(4.7, -HY / 2, -BW / 2 + 0.01); seaG.add(wall);
      [0, 10, 20, 30].forEach((T) => { const g = new THREE.Mesh(new THREE.BoxGeometry(0.02, HY, 0.02), sm(0x94a3b8, { transparent: true, opacity: 0.5 })); g.position.set(xT(T), -HY / 2, -BW / 2 + 0.03); seaG.add(g); label(T + '°C', [xT(T), 0.65, -BW / 2 + 0.03], { size: 11, color: 'rgba(30,41,59,.85)' }); });
      const zLab = []; for (let i = 0; i < 7; i++) zLab.push(label('', [BW / 2 + 0.05, 0, BW / 2], { size: 11, color: 'rgba(30,41,59,.8)' }));
      /* 측정기 · 측정점 · 물 덩어리 · 층 */
      const probe = new THREE.Group(); probe.add(new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), sm(0xfde047, { emissive: 0xfde047, emissiveIntensity: 0.5 }))); seaG.add(probe);
      const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1, 6), new THREE.MeshBasicMaterial({ color: 0xfde047 })); seaG.add(cable);
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), sm(0xfde047, { emissive: 0xfde047, emissiveIntensity: 0.6 })); seaG.add(dot);
      const guide = new THREE.Mesh(new THREE.BoxGeometry(BW + 3.3, 0.02, 0.02), new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.5 })); guide.position.x = 1.65; seaG.add(guide);
      const pLab = label('', probe, { offset: [-0.6, 0.0, 1.2], size: 13, color: 'rgba(15,23,42,.92)' });
      const meas = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfb7185 }), 101); meas.count = 0; seaG.add(meas);
      const parcels = []; for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), sm(0xf59e0b, { emissive: 0xf59e0b, emissiveIntensity: 0.4 })); m.visible = false; seaG.add(m); parcels.push(m); }
      const bandM = BANDS.map((b) => { const m = new THREE.Mesh(new THREE.BoxGeometry(BW + 0.12, 1, BW + 0.12), sm(b.c, { transparent: true, opacity: 0.2, depthWrite: false })); m.visible = false; seaG.add(m); return { m, L: label(b.name, [-BW / 2 - 0.15, 0, BW / 2], { color: b.bg, size: 14 }) }; });
      const dm = new THREE.Object3D();
      /* ---------- 수조 실험 (적외선등 · 바람) ---------- */
      const tgeo = new THREE.BoxGeometry(TWD, TH, 2.2, 1, 48, 1); tgeo.translate(0, -TH / 2, 0);
      tgeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(tgeo.attributes.position.count * 3), 3));
      tankG.add(new THREE.Mesh(tgeo, new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.12, transparent: true, opacity: 0.85, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.5 })));
      tankG.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(TWD, TH, 2.2).translate(0, -TH / 2, 0)), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 })));
      const lampM = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.3, 0.35, 32), ctx.mats.metal('aluminium', { roughness: 0.28 })); lampM.position.set(0.6, 1.3, 0); tankG.add(lampM);
      const beamM = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 1.5, 1.1, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff1a8, transparent: true, opacity: 0.0, depthWrite: false, side: THREE.DoubleSide })); beamM.position.set(0.6, 0.55, 0); tankG.add(beamM);
      const fan = new THREE.Group(); const fb = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.12, 28), ctx.mats.plastic(0x64748b, { roughness: 0.35 })); fb.rotation.z = Math.PI / 2; fan.add(fb);
      for (let i = 0; i < 3; i++) { const bl = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.6, 0.18), sm(0xe2e8f0)); bl.rotation.x = i * 2.09; bl.position.x = 0.1; fan.add(bl); }
      fan.position.set(-TWD / 2 - 0.9, 0.35, 0); tankG.add(fan);
      const winds = []; for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.4, 10), new THREE.MeshBasicMaterial({ color: 0xe2e8f0, transparent: true, opacity: 0.85 })); m.rotation.z = -Math.PI / 2; tankG.add(m); winds.push(m); }
      const SENS = [0, 2, 4, 6, 8, 10, 12], sens = SENS.map((z) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), sm(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.3 })); m.position.set(TWD / 2 - 0.5, -Math.max(0.12, z * TH / 12 - 0.04), 1.15); tankG.add(m); return label('', m, { offset: [0.75, 0, 0], size: 11, color: 'rgba(15,23,42,.88)' }); });
      const tankLab = label('수조 (깊이 12 cm)', [0, 0.45, 1.3], { size: 12, color: 'rgba(30,41,59,.88)' });

      /* ---------- 장면별 자료 ---------- */
      const SM = () => window.__sim || {};
      const SEAS = { east: { n: '동해', zmax: 1000, ticks: [0, 200, 400, 600, 800, 1000] }, west: { n: '황해', zmax: 100, floor: 80, ticks: [0, 20, 40, 60, 80, 100] }, south: { n: '남해', zmax: 120, floor: 100, ticks: [0, 20, 40, 60, 80, 100, 120] } };
      const yOf = (z) => (sea === 'east' ? -HY * Math.sqrt(clamp(z, 0, depth) / depth) : -HY * clamp(z, 0, depth) / depth);
      const zOfU = (u) => (sea === 'east' ? u * u * depth : u * depth);
      const Tf = (z) => { const f = SM().PF; try { return f[sea][season](clamp(z, 0, depth)); } catch (e) { return 10; } };
      function rebuildSea() {
        const S = SEAS[sea]; depth = S.floor || S.zmax;
        const cc = new C(), col = geo.attributes.color, pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) { tcol(Tf(zOfU(-pos.getY(i) / HY)), cc); col.setXYZ(i, cc.r, cc.g, cc.b); } col.needsUpdate = true;
        floor.visible = !!S.floor && S.floor < S.zmax;
        zLab.forEach((l, i) => { const z = S.ticks[i]; l.show(z != null && z <= depth + 1e-6); if (z != null) { l.obj = [BW / 2 + 0.05, yOf(Math.min(z, depth)), BW / 2]; l.set(z + ' m'); } });
        if (curve) { seaG.remove(curve); curve.geometry.dispose(); curve = null; }
        if (scene !== 'column') {
          const pts = []; for (let i = 0; i <= 120; i++) { const z = zOfU(i / 120); pts.push(new V3(xT(Tf(z)), yOf(z), -BW / 2 + 0.07)); }
          curve = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 240, 0.06, 8, false), sm(0xfb7185, { emissive: 0xfb7185, emissiveIntensity: 0.3, roughness: 0.4 })); seaG.add(curve);
        }
        sun.scale.setScalar(season === 8 ? 1.2 : 0.75);
      }
      function bandsUpdate(S) {
        const LY = S.LY, show = scene === 'layers' || scene === 'map';
        bandM.forEach((q, i) => {
          const b = BANDS[i], on = show && sea === 'east' && LY && LY.placed[b.k], z1 = Math.min(b.z1, depth);
          q.m.visible = !!on; q.L.show(!!on);
          if (on) { const y0 = yOf(b.z0), y1 = yOf(z1); q.m.position.set(0, (y0 + y1) / 2, 0); q.m.scale.y = Math.max(0.01, y0 - y1); q.L.obj = [-BW / 2 - 0.15, (y0 + y1) / 2, BW / 2]; }
        });
        const pOn = scene === 'layers' && LY && LY.parcelOn && LY.parcels;
        parcels.forEach((m, i) => { const p = pOn && LY.parcels[i]; m.visible = !!p; if (p) { m.position.set(xT(p.T), yOf(p.z), -BW / 2 + 0.12); tcol(p.T, m.material.color); } });
      }
      function probeUpdate(z) {
        const T = Tf(z), y = yOf(z);
        probe.position.set(0, y, BW / 2 + 0.3); cable.position.set(0, (y + 0.6) / 2, BW / 2 + 0.3); cable.scale.y = Math.max(0.01, 0.6 - y); dot.position.set(xT(T), y, -BW / 2 + 0.1); guide.position.y = y;
        pLab.set('수심 ' + Math.round(z) + ' m · <b>' + T.toFixed(1) + '°C</b>');
        return T;
      }
      function seaInfo(S, z, T) {
        const nm = SEAS[sea].n + ' ' + season + '월';
        if (scene === 'column') { const c = S.C ? S.C.count : 0; return '<b>수온 측정기</b> · 동해 2월<br>수심 <b>' + Math.round(z) + ' m</b>의 수온 <b>' + T.toFixed(1) + '°C</b>' + (c ? '<br>측정한 점 <b>' + c + '</b>개 (1,000 m까지 내리며 깊이에 따른 수온을 재요)' : '<br>측정기를 1,000 m까지 내려요.'); }
        if (scene === 'layers') { const LY = S.LY || { placed: {} }; const names = BANDS.filter((b) => LY.placed[b.k]).map((b) => b.name); return '<b>동해 2월 · 깊이에 따른 수온</b><br>' + (names.length ? '붙인 이름: <b>' + names.join(' · ') + '</b><br>' : '') + '혼합층: 수온이 거의 일정 · 수온 약층: 깊이에 따라 수온이 급격히 낮아짐 · 심해층: 수온이 낮고 거의 일정해요.'; }
        { const m = S.M && S.measKey ? S.M.meas[S.measKey(sea, season)] : null; if (!(m && m.t >= 1)) return '<b>' + nm + '</b> (우리나라 바다)<br>' + (m ? '측정하는 중이에요…' : '아직 재지 않았어요. 정점과 계절을 고르면 측정해요.'); }
        return '<b>' + nm + '</b> (우리나라 바다)<br>표층 수온 <b>' + Tf(0).toFixed(1) + '°C</b> · 바닥 쪽 수온 <b>' + Tf(depth).toFixed(1) + '°C</b>' + (sea !== 'east' ? '<br>수심 약 ' + depth + ' m의 얕은 바다예요.' : '<br>수심 1,000 m까지 재요.');
      }
      function labUpdate(S, t) {
        const L = S.LAB; if (!L) return;
        const cc = new C(), col = tgeo.attributes.color, pos = tgeo.attributes.position, fn = S.labTempAt;
        for (let i = 0; i < pos.count; i++) { const z = clamp(-pos.getY(i) / TH * 12, 0, 12); labCol(fn(z), cc); col.setXYZ(i, cc.r, cc.g, cc.b); } col.needsUpdate = true;
        sens.forEach((lb, i) => { const T = fn(SENS[i]); lb.set(SENS[i] + ' cm · <b>' + T.toFixed(1) + '°C</b>'); });
        beamM.material.opacity = L.lamp ? 0.22 : 0; lampM.material.emissive.setHex(L.lamp ? 0xffd34d : 0x000000);
        fan.rotation.x = L.fanA || 0; fan.visible = true;
        winds.forEach((m, i) => { m.visible = L.wind > 0 && i < L.wind * 2; const u = (t * (0.4 + L.wind * 0.3) + i / 4) % 1; m.position.set(-TWD / 2 - 0.4 + u * (TWD * 0.8), 0.25 + (i % 2) * 0.22, -0.5 + (i % 3) * 0.5); });
        const hm = Math.floor(L.heatT / 60), hs = Math.floor(L.heatT % 60);
        info('<b>수조 실험</b> · 적외선등 <b>' + (L.lamp ? '켬' : '끔') + '</b> · 바람 <b>' + ['없음', '약', '강'][L.wind] + '</b>' + (L.lamp ? ' · 가열 ' + hm + '분 ' + String(hs).padStart(2, '0') + '초' : '') + '<br>표면 수온 <b>' + fn(0).toFixed(1) + '°C</b> · 바닥(12 cm) <b>' + fn(12).toFixed(1) + '°C</b><br>' + (L.lamp ? '바람이 셀수록 표면부터 수온이 일정한 층이 두꺼워져요.' : '적외선등을 켜서 가열해 보세요.'));
      }
      /* ▶ 측정기 내리기 (동해 2월은 2D 측정기도 같이 내려가요) */
      const host = controls.text('').parentNode, n0 = host.children.length;
      const pl = controls.player({
        duration: 14, loop: true, label: '측정기 내리기',
        phases: [[0, '내려가요'], [0.5, '올라와요']],
        onFrame(p) {
          const tri = p < 0.5 ? p * 2 : 2 - p * 2, z = depth * tri * tri * (3 - 2 * tri), S = SM();
          if (scene === 'column' && S.C) S.C.zt = clamp(z, 0, 1000); else pz = z;
        },
      });
      const plRow = Array.from(host.children).slice(n0);
      return {
        update(dt, t) {
          const S = SM(), sc = S.scene || 'column';
          let sea2 = sea, season2 = season;
          if (sc === 'column' || sc === 'layers') { sea2 = 'east'; season2 = 2; } else if (sc === 'map' && S.M) { sea2 = S.M.sea; season2 = S.M.season; }
          const key = [sc, sea2, season2].join('|');
          if (key !== sig) {
            sig = key; scene = sc; sea = sea2; season = season2; pz = 0;
            seaG.visible = sc !== 'lab'; tankG.visible = sc === 'lab'; plRow.forEach((e) => { e.style.display = sc === 'lab' ? 'none' : ''; });
            if (sc === 'lab') { zLab.forEach((l) => l.show(false)); bandM.forEach((q) => q.L.show(false)); parcels.forEach((m) => { m.visible = false; }); pLab.show(false); tankLab.show(true); sens.forEach((l) => l.show(true)); }
            else { rebuildSea(); tankLab.show(false); sens.forEach((l) => l.show(false)); pLab.show(true); }
          }
          // 우리나라 바다: 2D처럼 '측정'해야 수온 곡선이 위에서부터 그려져요 (재기 전에는 보이지 않아요)
          if (sc === 'map' && curve && S.M && S.measKey) { const m = S.M.meas[S.measKey(sea, season)], f = m ? Math.min(1, m.t || 0) : 0, ix = curve.geometry.index;
            curve.visible = f > 0.01; if (ix) curve.geometry.setDrawRange(0, Math.floor(f * ix.count / 6) * 6); }
          if (sc === 'lab') { labUpdate(S, t); }
          else {
            const z = sc === 'column' && S.C ? S.C.z.value : pz;
            const T = probeUpdate(z); bandsUpdate(S);
            probe.visible = cable.visible = dot.visible = guide.visible = sc !== 'map' || pz > 0 || pl.playing;
            if (sc === 'column' && S.C) {
              const mk = S.C.count + '|' + sea; if (mk !== dotKey) { dotKey = mk; let n = 0; for (let i = 0; i <= 100; i++) if (S.C.meas[i]) { const zz = i * 10; dm.position.set(xT(Tf(zz)), yOf(zz), -BW / 2 + 0.09); dm.updateMatrix(); meas.setMatrixAt(n++, dm.matrix); } meas.count = n; meas.instanceMatrix.needsUpdate = true; }
              meas.visible = true;
            } else meas.visible = false;
            if (Math.floor(t * 4) !== infoK) { infoK = Math.floor(t * 4); info(seaInfo(S, z, T)); }
          }
          const amp = 0.02;
          for (let i = 0; i < sp0.count; i++) sp0.setZ(i, Math.sin(sx[i] * 2.6 + t * 2.2) * amp + Math.sin(sz[i] * 3.1 + t * 1.7) * amp * 0.8);
          sp0.needsUpdate = true; surf.geometry.computeVertexNormals();
          sun.position.y = 2.4 + Math.sin(t * 0.7) * 0.05;
        },
      };
    },
  });
})();
