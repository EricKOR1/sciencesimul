/* m3-atmosphere · 3D 기권의 층 구조
   높이에 따른 기온 변화로 기권을 대류권·성층권·중간권·열권으로 나눠요. (높이는 보기 좋게 늘려서 그렸어요.) */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const PROF = [[0, 15], [11, -56], [50, -2], [80, -90], [100, 0]];
  const Tf = (h) => { const sm = window.__sim && window.__sim.Tat; if (sm) { try { return sm(h); } catch (e) { /* 무시 */ } } for (let i = 1; i < PROF.length; i++) if (h <= PROF[i][0]) { const a = PROF[i - 1], b = PROF[i]; return a[1] + (b[1] - a[1]) * (h - a[0]) / (b[0] - a[0]); } return 0; };
  const LAY = [
    { n: '대류권', c: 0x38bdf8, a: 0, b: 11, t: '높이 올라가면 기온이 낮아져요. 구름·비·눈이 생겨요.' },
    { n: '성층권', c: 0x34d399, a: 11, b: 50, t: '높이 올라가면 기온이 높아져요. 오존층이 자외선을 흡수해요.' },
    { n: '중간권', c: 0xa78bfa, a: 50, b: 80, t: '높이 올라가면 기온이 낮아져요. 유성이 보여요.' },
    { n: '열권', c: 0xfb7185, a: 80, b: 100, t: '높이 올라가면 기온이 급격히 높아져요. 오로라와 인공위성이 있어요.' },
  ];
  const KM = [[0, 0], [11, 1.7], [50, 4.7], [80, 7.0], [100, 8.8]];            // 높이(km) → 그림 속 높이
  const yOf = (h) => { h = Math.max(0, Math.min(100, h)); for (let i = 1; i < KM.length; i++) if (h <= KM[i][0]) { const a = KM[i - 1], b = KM[i]; return a[1] + (b[1] - a[1]) * (h - a[0]) / (b[0] - a[0]); } return 8.8; };
  const xT = (T) => 2.6 + (T + 100) / 125 * 3.4;
  window.SciSim3D.attach({
    host: '.stage-card',
    title: '기권의 층 구조 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHN ? 22 : 19, theta: 0.5, phi: 1.32, min: 8, max: 36, target: [2.3, 4.2, 0] },
    autoRotate: 0,
    levels: [0, 3],            // 1단계(기온 측정)·4단계(권역마다 다른 모습)는 3D. 그래프 읽기·이름표 붙이기는 2D
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3;
      let alt = 0, names = !PHN, lastKey = '';
      const bandObjs = [], tubes = [], ptsM = [], bandFeat = [];
      const sm = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0.05 }, o || {}));
      /* 땅 */
      const ground = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.5, 64), sm(0x4f9a5a, { roughness: 0.9 })); ground.position.y = -0.27; root.add(ground);
      const sea = new THREE.Mesh(new THREE.CylinderGeometry(3.9, 3.9, 0.4, 64), sm(0x2a6fb0, { roughness: 0.3 })); sea.position.y = -0.55; root.add(sea);
      /* 네 층 */
      const W = 3.4, edgeM = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 });
      const bandLab = [];
      LAY.forEach((L, i) => {
        const y0 = yOf(L.a), y1 = yOf(L.b);
        const m = new THREE.Mesh(new THREE.BoxGeometry(W, y1 - y0, W), sm(L.c, { transparent: true, opacity: 0.38, roughness: 0.25, depthWrite: false }));
        m.position.y = (y0 + y1) / 2; root.add(m);
        const e = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), edgeM); e.position.copy(m.position); root.add(e); bandObjs.push(m, e);
        const lb = label(L.n, [-W / 2 - 0.1, (y0 + y1) / 2, W / 2], { color: 'rgba(' + [(L.c >> 16) & 255, (L.c >> 8) & 255, L.c & 255].map((v) => Math.round(v * 0.55)).join(',') + ',.92)', size: 14 }); bandLab.push(lb);
      });
      /* 기온 그래프: 기둥 오른쪽 벽 */
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 8.8), sm(0x0f172a, { transparent: true, opacity: 0.55, side: THREE.DoubleSide, roughness: 0.9 }));
      wall.position.set(2.6 + 1.7 + 0.0, 4.4, -W / 2 + 0.01); root.add(wall); wall.position.x = 4.3;
      [-100, -50, 0].forEach((T) => { const g = new THREE.Mesh(new THREE.BoxGeometry(0.02, 8.8, 0.02), sm(0x94a3b8, { transparent: true, opacity: 0.5 })); g.position.set(xT(T), 4.4, -W / 2 + 0.03); root.add(g); label(T + '°C', [xT(T), -0.35, -W / 2 + 0.03], { size: 11, color: 'rgba(30,41,59,.85)' }); });
      [11, 50, 80].forEach((h) => { label(h + ' km', [6.55, yOf(h), -W / 2 + 0.03], { size: 11, color: 'rgba(30,41,59,.85)' }); });
      LAY.forEach((L) => {
        const pts = []; for (let h = L.a; h <= L.b + 1e-6; h += 1) pts.push(new V3(xT(Tf(h)), yOf(h), -W / 2 + 0.06));
        if (pts.length < 2) return;
        const tm = sm(L.c, { roughness: 0.3, emissive: L.c, emissiveIntensity: 0.25 }), tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 3, 0.065, 10, false), tm); root.add(tube); tubes.push({ tube, tm, L, n: tube.geometry.index.count });
      });
      for (let i = 0; i < 16; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), sm(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.5 })); d.visible = false; root.add(d); ptsM.push(d); }
      /* 기구 */
      const balloon = new THREE.Group();
      const bl = new THREE.Mesh(new THREE.SphereGeometry(0.34, 28, 20), sm(0xf43f5e, { roughness: 0.3 })); bl.position.y = 0.34; balloon.add(bl);
      const bs = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.16), sm(0x92400e)); bs.position.y = -0.18; balloon.add(bs);
      balloon.position.set(0, 0, W / 2 + 0.55); root.add(balloon);
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 14), sm(0xfde047, { emissive: 0xfde047, emissiveIntensity: 0.6 })); root.add(dot);
      const ringM = new THREE.Mesh(new THREE.BoxGeometry(W + 0.6, 0.03, W + 0.6), new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.35, depthWrite: false })); root.add(ringM);
      const balLab = label('', balloon, { color: 'rgba(15,23,42,.9)', size: 13, offset: [0.2, 1.0, 0] });
      /* 특징: 구름 · 비행기 · 오존층 · 유성 · 오로라 · 인공위성 */
      const feat = [];
      const fl = (t, pos, col) => { const l = label(t, pos, { size: 12, color: col || 'rgba(15,23,42,.88)' }); feat.push(l); return l; };
      const clouds = new THREE.Group(); root.add(clouds);
      [[-0.8, 0.5, 0.6, 0.55], [-0.2, 0.62, 0.3, 0.5], [0.5, 0.45, 0.7, 0.45], [0.9, 0.7, -0.5, 0.4], [-0.9, 0.9, -0.7, 0.4], [0.1, 0.4, -0.9, 0.35]].forEach((q) => {
        const c = new THREE.Group(); [[0, 0, 0, 1], [0.38, -0.05, 0.1, 0.75], [-0.38, -0.08, -0.05, 0.7]].forEach((s) => { const sp = new THREE.Mesh(new THREE.SphereGeometry(0.3 * s[3] * q[3] * 2, 18, 14), sm(0xffffff, { roughness: 0.9 })); sp.position.set(s[0] * q[3] * 1.6, s[1], s[2]); c.add(sp); });
        c.position.set(q[0], q[1], q[2]); clouds.add(c);
      });
      fl('구름 · 비', [0, 1.15, 1.4]);
      const plane = new THREE.Group(); const pb = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.5, 4, 10), sm(0xe2e8f0, { metalness: 0.3 })); pb.rotation.z = Math.PI / 2; const pw = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.02, 0.6), sm(0xcbd5e1)); plane.add(pb, pw); plane.position.y = yOf(10.5); root.add(plane); fl('여객기', plane);
      const ozone = new THREE.Mesh(new THREE.BoxGeometry(W + 0.05, yOf(30) - yOf(20), W + 0.05), sm(0x86efac, { transparent: true, opacity: 0.35, emissive: 0x22c55e, emissiveIntensity: 0.4, depthWrite: false })); ozone.position.y = (yOf(30) + yOf(20)) / 2; root.add(ozone); bandFeat.push(ozone, fl('오존층', [-W / 2, yOf(25), -W / 2], 'rgba(21,128,61,.92)'));
      const met = []; for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.9, 8), new THREE.MeshBasicMaterial({ color: 0xfff1b0, transparent: true, opacity: 0.9 })); root.add(m); met.push(m); }
      bandFeat.push(...met, fl('유성', [0, yOf(65), W / 2], 'rgba(76,29,149,.9)'));
      const auroras = []; for (let i = 0; i < 3; i++) { const g = new THREE.PlaneGeometry(2.2, 1.0, 20, 1); const a = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: i === 1 ? 0x86efac : 0x4ade80, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })); a.position.set(-0.9 + i * 0.9, yOf(90), -0.8 + i * 0.7); a.rotation.y = 0.5 * (i - 1); root.add(a); auroras.push(a); }
      bandFeat.push(...auroras, fl('오로라', [0, yOf(94), 0], 'rgba(22,101,52,.92)'));
      const sat = new THREE.Group(); sat.add(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), sm(0xfbbf24, { metalness: 0.7, roughness: 0.3 }))); [-1, 1].forEach((s) => { const pn = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.24), sm(0x2563eb, { metalness: 0.6, roughness: 0.2 })); pn.position.x = 0.38 * s; sat.add(pn); }); root.add(sat); bandFeat.push(sat, fl('인공위성', sat));
      /* 설명 · 2D 차시와 같은 단계에서 같은 것만 보여 줘요 */
      const POP_H = 30;
      function vis() {
        const S = (ctx.lesson() || {}).S || {}, on = !!S.bandsOn;
        bandObjs.forEach((o) => { o.visible = on; }); bandLab.forEach((l) => l.show(on));
        bandFeat.forEach((o) => { if (o.show) o.show(on && names); else o.visible = on; });
        feat.forEach((l) => { if (bandFeat.indexOf(l) < 0) l.show(names); });
        tubes.forEach((q) => {
          const f = on ? 1 : Math.max(0, Math.min(1, ((S.maxAlt || 0) - q.L.a) / (q.L.b - q.L.a)));
          q.tube.visible = f > 0.001; q.tube.geometry.setDrawRange(0, Math.max(6, Math.floor(f * q.n / 6) * 6));
          const c = on ? q.L.c : 0xe2e8f0; q.tm.color.setHex(c); q.tm.emissive.setHex(c);
        });
        const pts = S.pts || []; ptsM.forEach((d, i) => { const p = pts[i]; d.visible = !!p; if (p) d.position.set(xT(p.T), yOf(p.h), -W / 2 + 0.1); });
      }
      function readout() {
        const S = (ctx.lesson() || {}).S || {}, on = !!S.bandsOn;
        const T = Tf(alt), bi = alt < 11 ? 0 : alt < 50 ? 1 : alt < 80 ? 2 : 3, y = yOf(alt), popped = alt >= POP_H;
        balloon.position.y = y; balloon.visible = !popped; dot.position.set(xT(T), y, -W / 2 + 0.1); ringM.position.y = y;
        const k = Math.max(0.5, Math.min(2.4, Math.exp(alt / 7) * (T + 273) / 288)); bl.scale.setScalar(Math.min(2.0, 0.7 + Math.cbrt(k) * 0.35));
        bl.position.y = 0.34 * bl.scale.x;
        balLab.set(popped ? '' : '기구 ' + (Math.round(alt * 10) / 10) + ' km · ' + Math.round(T) + '°C'); balLab.show(!popped);
        info((on ? '<b>' + LAY[bi].n + '</b> · ' + LAY[bi].t + '<br>' : '<b>기상 관측 기구(라디오존데)</b><br>') + '높이 ' + Math.round(alt * 10) / 10 + ' km에서 기온은 약 <b>' + Math.round(T) + '°C</b>예요.'
          + (popped ? '<br><span style="color:#fcd34d">기구는 약 30 km에서 터져요. 그 위는 관측 로켓과 인공위성으로 측정해요.</span>' : '<br>올라갈수록 기구가 커져요.'));
      }
      /* ▶ 기구 올라갔다 내려오기: 2D 기구 높이를 같이 움직여요 (0 → 최고 높이 → 0) */
      controls.button('이름표 ' + (names ? '✓' : '✕'), function () { names = !names; this.textContent = '이름표 ' + (names ? '✓' : '✕'); vis(); });
      const pl = controls.player({
        duration: 16, loop: true, label: '기구 올라가기',
        phases: [[0, '올라가요'], [0.5, '내려와요']],
        onFrame(p) {
          const L = ctx.lesson(), top = (L && L.S && L.S.altMax) || 100, tri = p < 0.5 ? p * 2 : 2 - p * 2, h = top * (tri * tri * (3 - 2 * tri));
          if (L && L.setAlt) L.setAlt(h, true); else { alt = h; readout(); }
        },
      });
      readout(); vis();
      return {
        update(dt, t) {
          const L = ctx.lesson(), S = L && L.S;
          if (S) { alt = Math.max(0, Math.min(100, S.alt)); }
          const key = S ? [alt.toFixed(2), S.bandsOn, S.maxAlt.toFixed(1), S.pts.length, S.lv].join('|') : '';
          if (key !== lastKey) { lastKey = key; readout(); vis(); }
          plane.position.x = Math.sin(t * 0.5) * 1.3; plane.rotation.y = Math.cos(t * 0.5) > 0 ? 0 : Math.PI;
          met.forEach((m, i) => { const u = ((t * 0.5 + i * 0.37) % 1.2); const x = -1.2 + u * 1.8 + i * 0.4, y = yOf(75) - u * 0.9 + i * 0.1; m.position.set(x, y, 0.4 - i * 0.7); m.rotation.z = Math.PI / 2 - 0.5; m.material.opacity = Math.max(0, 1 - u * 1.2); });
          auroras.forEach((a, i) => { const p = a.geometry.attributes.position; for (let j = 0; j < p.count; j++) { const x = p.getX(j); p.setZ(j, Math.sin(x * 2.4 + t * 1.4 + i) * 0.25); } p.needsUpdate = true; a.material.opacity = 0.3 + 0.15 * Math.sin(t * 1.3 + i * 2); });
          sat.position.set(Math.cos(t * 0.6) * 2.3, yOf(92) + Math.sin(t * 0.6) * 0.25, Math.sin(t * 0.6) * 2.3); sat.rotation.y = -t * 0.6;
          clouds.children.forEach((c, i) => { c.position.x += Math.sin(t * 0.3 + i) * dt * 0.05; });
        },
      };
    },
  });
})();
