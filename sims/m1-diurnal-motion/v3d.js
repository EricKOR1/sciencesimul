/* m1-diurnal-motion · 3D 천구 모형
   서울(북위 37.5°)에 선 관측자를 가운데 두고, 지구 자전축 방향(북극성)을 중심으로 별이 동→서로 도는 모습을 입체로 확인해요.
   별의 위치는 2D 실험과 같은 식(항성시 LST = 7.7 h + (t − 24 h) × 1.0027)으로 계산해요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const DEG = Math.PI / 180, LAT = 37.5, SL = Math.sin(LAT * DEG), CL = Math.cos(LAT * DEG), R = 6;
  const T0 = 18, T1 = 30;
  const lstOf = (t) => 7.7 + (t - 24) * 1.0027379;
  const hm = (t) => { const m = Math.round((((t % 24) + 24) % 24) * 60) % 1440, h = Math.floor(m / 60), mi = m % 60; const nm = h === 0 ? '밤 12시' : h < 6 ? '새벽 ' + h + '시' : h < 12 ? '오전 ' + h + '시' : h === 12 ? '낮 12시' : '오후 ' + (h - 12) + '시'; return nm + (mi ? ' ' + mi + '분' : ''); };

  // [적경 h, 적위 °] — 2D 실험과 같은 별
  const CONS = [
    { key: 'dipper', name: '북두칠성', col: 0x9ad7ff, focus: 'dubhe', fname: '두베', st: { dubhe: [11.062, 61.751], merak: [11.031, 56.382], phecda: [11.897, 53.695], megrez: [12.257, 57.033], alioth: [12.900, 55.960], mizar: [13.399, 54.925], alkaid: [13.792, 49.313] },
      lines: [['dubhe', 'merak'], ['merak', 'phecda'], ['phecda', 'megrez'], ['megrez', 'dubhe'], ['megrez', 'alioth'], ['alioth', 'mizar'], ['mizar', 'alkaid']] },
    { key: 'cas', name: '카시오페이아자리', col: 0xffcf9a, focus: 'schedar', fname: '쉐다르', st: { caph: [0.153, 59.150], schedar: [0.675, 56.537], gcas: [0.945, 60.717], ruchbah: [1.430, 60.235], segin: [1.907, 63.670] },
      lines: [['caph', 'schedar'], ['schedar', 'gcas'], ['gcas', 'ruchbah'], ['ruchbah', 'segin']] },
    { key: 'orion', name: '오리온자리', col: 0xa9c8ff, focus: 'betel', fname: '베텔게우스', st: { betel: [5.919, 7.407], bella: [5.419, 6.350], meissa: [5.585, 9.934], mintaka: [5.533, -0.299], alnilam: [5.603, -1.202], alnitak: [5.679, -1.943], saiph: [5.796, -9.670], rigel: [5.242, -8.202] },
      lines: [['meissa', 'betel'], ['meissa', 'bella'], ['betel', 'alnitak'], ['bella', 'mintaka'], ['mintaka', 'alnilam'], ['alnilam', 'alnitak'], ['alnitak', 'saiph'], ['mintaka', 'rigel']] },
  ];
  const POLARIS = [2.530, 89.264], SIRIUS = [6.752, -16.716];

  window.SciSim3D.attach({
    host: '.stage-card',
    title: '3D 천구 · 별의 일주 운동',
    hint: ' ',
    camera: { dist: (window.innerWidth || 1000) >= 600 ? 19 : 27, theta: 0.9, phi: 1.08, fov: 50, target: [0, 1.4, -0.5], min: 0.5, max: 40 },
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls, camera, orbit } = ctx;
      const V = new THREE.Vector3();
      const P = new THREE.Vector3(0, SL, -CL); // 천구 북극(자전축 북쪽) 방향
      const st = { t: 21, play: false, focus: 'dipper', trails: true };
      try { const s = window.__sim && window.__sim.S; if (s && typeof s.t === 'number') st.t = Math.min(T1, Math.max(T0, s.t)); } catch (e) {}

      /* 별 → 세계 좌표 (x 동, y 위, z 남) */
      function dirOf(ra, dec, lst, out) {
        const H = (lst - ra) * 15 * DEG, d = dec * DEG, cd = Math.cos(d);
        const up = cd * Math.cos(H) * CL + Math.sin(d) * SL, south = cd * Math.cos(H) * SL - Math.sin(d) * CL, west = cd * Math.sin(H);
        return out.set(-west, up, south);
      }
      const dim = (alt) => (alt > 0 ? 1 : 0.18);

      /* 땅, 지평선, 하늘 */
      const ground = new THREE.Mesh(new THREE.CircleGeometry(R, 72), new THREE.MeshBasicMaterial({ color: 0x1f3f38, transparent: true, opacity: 0.92 }));
      ground.rotation.x = -Math.PI / 2; root.add(ground);
      const ring = (r, col, op) => { const pts = []; for (let i = 0; i <= 96; i++) { const a = i / 96 * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * r, 0.005, Math.sin(a) * r)); } return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: op })); };
      root.add(ring(R, 0xdfe9ff, 0.9), ring(R / 2, 0x6f8f86, 0.45));
      [[0, 1], [1, 0]].forEach((d) => root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-d[0] * R, 0.005, -d[1] * R), new THREE.Vector3(d[0] * R, 0.005, d[1] * R)]), new THREE.LineBasicMaterial({ color: 0x6f8f86, transparent: true, opacity: 0.5 }))));
      const dome = new THREE.Mesh(new THREE.SphereGeometry(R, 48, 28), new THREE.MeshBasicMaterial({ color: 0x1b2d5a, transparent: true, opacity: 0.2, side: THREE.BackSide, depthWrite: false }));
      root.add(dome);
      root.add(new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.SphereGeometry(R, 24, 12)), new THREE.LineBasicMaterial({ color: 0x8aa4e6, transparent: true, opacity: 0.1 })));
      [['북', 0, -1, '#7dd3fc'], ['동', 1, 0, '#fde68a'], ['남', 0, 1, '#fca5a5'], ['서', -1, 0, '#c4b5fd']].forEach((c) => {
        const L = label(c[0] + (c[0] === '동' ? ' (떠요)' : c[0] === '서' ? ' (져요)' : ''), [c[1] * (R + 0.7), 0.05, c[2] * (R + 0.7)], { size: 14 });
        L.el.style.color = c[3];
      });

      /* 관측자 (서울) */
      const me = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.36, 14), new THREE.MeshStandardMaterial({ color: 0xff7a59, roughness: 0.6 }));
      body.position.y = 0.18;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), new THREE.MeshStandardMaterial({ color: 0xffd9b8, roughness: 0.6 }));
      head.position.y = 0.46; me.add(body, head); root.add(me);
      label('서울', [0.35, 0.75, 0.3], { size: 12 });

      /* 자전축 · 천구의 북극(북극성) */
      const axisMat = new THREE.LineBasicMaterial({ color: 0xffd34d });
      root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([P.clone().multiplyScalar(-R * 1.08), P.clone().multiplyScalar(R * 1.12)]), axisMat));
      const pole = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff1c9 }));
      pole.position.copy(P).multiplyScalar(R); root.add(pole);
      label('북극성 · 자전축 방향', P.clone().multiplyScalar(R).toArray(), { size: 12.5, offset: [-1.5, 0.7, 0], color: 'rgba(120,80,0,.88)' });
      // 북극성 고도 호 (북쪽 지평선에서 북극성까지)
      { const pts = []; for (let i = 0; i <= 24; i++) { const a = i / 24 * LAT * DEG; pts.push(new THREE.Vector3(0, Math.sin(a) * R * 0.5, -Math.cos(a) * R * 0.5)); } root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0.8 })));
        label('고도 약 37.5°', [0, Math.sin(LAT * DEG / 2) * R * 0.5, -Math.cos(LAT * DEG / 2) * R * 0.5], { size: 11.5, offset: [0, 0, 0.6] }); }
      // 지구 자전 방향 화살표 (축을 중심으로 서→동, 북극 위에서 보면 시계 반대 방향)
      { const e1 = new THREE.Vector3(1, 0, 0), e2 = new THREE.Vector3().crossVectors(P, e1).normalize(); // e1 × e2 = P
        const c0 = P.clone().multiplyScalar(R * 0.42), pts = [], rr = 0.9;
        for (let i = 0; i <= 30; i++) { const a = (-0.2 + 1.6 * i / 30) * Math.PI; pts.push(c0.clone().addScaledVector(e1, Math.cos(a) * rr).addScaledVector(e2, Math.sin(a) * rr)); }
        root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x4ade80 })));
        const a1 = pts[pts.length - 1], a0 = pts[pts.length - 2], cone = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.28, 12), new THREE.MeshBasicMaterial({ color: 0x4ade80 }));
        cone.position.copy(a1); cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), a1.clone().sub(a0).normalize()); root.add(cone);
        label('지구 자전 (서→동)', pts[10].toArray(), { size: 12, offset: [1.5, 0.2, 0], color: 'rgba(20,100,50,.9)' }); }

      /* 별: 배경별, 별자리 별, 선 */
      let seed = 4242; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      const BG = []; for (let i = 0; i < 360; i++) BG.push([rnd() * 24, Math.asin(2 * rnd() - 1) / DEG]);
      const bgPos = new Float32Array(BG.length * 3), bgCol = new Float32Array(BG.length * 3);
      const bgGeo = new THREE.BufferGeometry(); bgGeo.setAttribute('position', new THREE.BufferAttribute(bgPos, 3)); bgGeo.setAttribute('color', new THREE.BufferAttribute(bgCol, 3));
      root.add(new THREE.Points(bgGeo, new THREE.PointsMaterial({ size: 2.2, sizeAttenuation: false, vertexColors: true })));
      const named = []; // {mesh, ra, dec, col, cons}
      const mkStar = (ra, dec, col, r) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), new THREE.MeshBasicMaterial({ color: col })); root.add(m); const o = { m, ra, dec, col }; named.push(o); return o; };
      CONS.forEach((c) => {
        c.o = {}; Object.keys(c.st).forEach((k) => { c.o[k] = mkStar(c.st[k][0], c.st[k][1], 0xf2f6ff, 0.075); });
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(c.lines.length * 6), 3));
        c.seg = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: c.col, transparent: true, opacity: 0.75 })); root.add(c.seg);
        c.lab = label(c.name, c.o[c.focus].m, { size: 11.5, offset: [0, 0.3, 0], color: 'rgba(8,12,24,.7)' }); c.lab.el.style.color = '#' + c.col.toString(16).padStart(6, '0');
      });
      const polO = mkStar(POLARIS[0], POLARIS[1], 0xfff1c9, 0.11), sirO = mkStar(SIRIUS[0], SIRIUS[1], 0xd8e8ff, 0.1);
      const sirLab = label('시리우스', sirO.m, { size: 11.5, offset: [0, 0.3, 0] });

      /* 별의 하루 자취 (평행 원) */
      const trails = new THREE.Group(); root.add(trails);
      function trailFor(ra, dec, col) {
        const N = 96, pos = new Float32Array((N + 1) * 3), cl = new Float32Array((N + 1) * 3), c = new THREE.Color(col);
        for (let i = 0; i <= N; i++) { dirOf(ra, dec, i / N * 24, V); const k = dim(V.y); pos.set([V.x * R, V.y * R, V.z * R], i * 3); cl.set([c.r * k, c.g * k, c.b * k], i * 3); }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(cl, 3));
        return new THREE.Line(g, new THREE.LineBasicMaterial({ vertexColors: true }));
      }
      CONS.forEach((c) => Object.keys(c.st).forEach((k) => trails.add(trailFor(c.st[k][0], c.st[k][1], c.col))));
      trails.add(trailFor(SIRIUS[0], SIRIUS[1], 0xd8e8ff));

      /* 지켜볼 별: 시각 점, 각도 부채꼴 */
      const hourN = T1 - T0 + 1, hrPos = new Float32Array(hourN * 3), hrCol = new Float32Array(hourN * 3);
      const hrGeo = new THREE.BufferGeometry(); hrGeo.setAttribute('position', new THREE.BufferAttribute(hrPos, 3)); hrGeo.setAttribute('color', new THREE.BufferAttribute(hrCol, 3));
      const hours = new THREE.Points(hrGeo, new THREE.PointsMaterial({ size: 7, sizeAttenuation: false, vertexColors: true })); hours.frustumCulled = false; root.add(hours);
      const FN = 64, fanPos = new Float32Array((FN + 2) * 3), fanGeo = new THREE.BufferGeometry();
      fanGeo.setAttribute('position', new THREE.BufferAttribute(fanPos, 3));
      const idx = []; for (let i = 1; i <= FN; i++) idx.push(0, i, i + 1); fanGeo.setIndex(idx);
      const fan = new THREE.Mesh(fanGeo, new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false })); fan.frustumCulled = false; root.add(fan);
      const edgeGeo = new THREE.BufferGeometry(); edgeGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9), 3));
      const edge = new THREE.Line(edgeGeo, new THREE.LineBasicMaterial({ color: 0xffd34d })); edge.frustumCulled = false; root.add(edge);
      const angLab = label('', [0, 0, 0], { size: 12.5, color: 'rgba(255,211,77,.94)' }); angLab.el.style.color = '#1b2333';

      const focusInfo = () => {
        if (st.focus === 'polaris') return { ra: POLARIS[0], dec: POLARIS[1], name: '북극성', o: polO };
        const c = CONS.find((q) => q.key === st.focus); return { ra: c.st[c.focus][0], dec: c.st[c.focus][1], name: c.fname, o: c.o[c.focus], cons: c };
      };

      function refresh() {
        const lst = lstOf(st.t);
        for (let i = 0; i < BG.length; i++) {
          dirOf(BG[i][0], BG[i][1], lst, V); bgPos.set([V.x * R, V.y * R, V.z * R], i * 3);
          const k = 0.55 * dim(V.y); bgCol.set([k, k, k * 1.05], i * 3);
        }
        bgGeo.attributes.position.needsUpdate = true; bgGeo.attributes.color.needsUpdate = true;
        named.forEach((s) => { dirOf(s.ra, s.dec, lst, V); s.m.position.copy(V).multiplyScalar(R); s.m.material.color.setHex(V.y > 0 ? 0xf2f6ff : 0x4a5675); });
        CONS.forEach((c) => {
          const a = c.seg.geometry.attributes.position; c.lines.forEach((l, i) => { const p = c.o[l[0]].m.position, q = c.o[l[1]].m.position; a.setXYZ(i * 2, p.x, p.y, p.z); a.setXYZ(i * 2 + 1, q.x, q.y, q.z); });
          a.needsUpdate = true; c.lab.show(c.o[c.focus].m.position.y > 0.1);
        });
        sirLab.show(sirO.m.position.y > 0.1);
        // 지켜볼 별
        const f = focusInfo(), dLst = lstOf(st.t) - lstOf(T0);
        for (let h = 0; h < hourN; h++) { const tt = T0 + h; dirOf(f.ra, f.dec, lstOf(tt), V); hrPos.set([V.x * R, V.y * R, V.z * R], h * 3); const on = tt <= st.t + 1e-6, k = (V.y > 0 ? 1 : 0.3) * (on ? 1 : 0.35); hrCol.set([1 * k, 0.83 * k, 0.3 * k], h * 3); }
        hrGeo.attributes.position.needsUpdate = true; hrGeo.attributes.color.needsUpdate = true;
        const hrs = st.t - T0, rho = R * Math.cos(f.dec * DEG), cen = P.clone().multiplyScalar(R * Math.sin(f.dec * DEG));
        if (st.focus === 'polaris' || hrs < 0.02) { fan.visible = false; edge.visible = false; angLab.show(false); }
        else {
          fan.visible = true; edge.visible = true;
          const sc = 0.8; fanPos.set([cen.x, cen.y, cen.z], 0);
          for (let i = 0; i <= FN; i++) { dirOf(f.ra, f.dec, lstOf(T0) + dLst * i / FN, V); V.multiplyScalar(R).sub(cen).multiplyScalar(sc).add(cen); fanPos.set([V.x, V.y, V.z], (i + 1) * 3); }
          fanGeo.attributes.position.needsUpdate = true; fanGeo.setDrawRange(0, FN * 3);
          const s0 = dirOf(f.ra, f.dec, lstOf(T0), new THREE.Vector3()).multiplyScalar(R), s1 = f.o.m.position;
          const ea = edgeGeo.attributes.position; ea.setXYZ(0, s0.x, s0.y, s0.z); ea.setXYZ(1, cen.x, cen.y, cen.z); ea.setXYZ(2, s1.x, s1.y, s1.z); ea.needsUpdate = true;
          dirOf(f.ra, f.dec, lstOf(T0) + dLst / 2, V); V.multiplyScalar(R).sub(cen).multiplyScalar(0.55).add(cen);
          angLab.obj = [V.x, V.y, V.z]; angLab.set(f.name + ' · 15° × ' + (Math.round(hrs * 10) / 10) + '시간 = ' + Math.round(15 * hrs) + '°'); angLab.show(rho > 0.4);
        }
        // 설명
        const hh = Math.round(hrs * 10) / 10;
        let txt = '<b>' + hm(st.t) + '</b> · ';
        if (st.focus === 'polaris') txt += '<b>북극성</b>은 자전축 방향에 있어서 밤새 거의 제자리예요. 다른 별들은 북극성을 중심으로 돌아요.';
        else txt += '<b>' + f.name + '</b> : ' + (hh > 0 ? '오후 6시부터 ' + hh + '시간 동안 북극성(자전축)을 중심으로 약 <b>' + Math.round(15 * hrs) + '°</b> 돌았어요 (1시간에 15°).' : '지금은 처음 위치예요. 시각을 움직여 보세요.');
        txt += '<br>지구가 서→동으로 자전해서 별은 <b>동→서</b>로 도는 것처럼 보여요.';
        info(txt);
      }

      /* 시점 */
      function setView(v) {
        if (v === 'all') Object.assign(orbit, { dist: (window.innerWidth || 1000) >= 600 ? 19 : 27, theta: 0.9, phi: 1.08, tx: 0, ty: 1.4, tz: -0.5 });
        else if (v === 'north') Object.assign(orbit, { dist: 0.8, theta: 0, phi: Math.PI / 2 + 0.6, tx: 0, ty: 0.5, tz: -0.8 });
        else Object.assign(orbit, { dist: 0.8, theta: Math.PI, phi: Math.PI / 2 + 0.5, tx: 0, ty: 0.5, tz: 0.8 });
      }
      const probe = controls.text(''); probe.style.display = 'none'; const ctlEl = probe.parentElement;
      const fixLab = (em) => { const k = ctlEl.children, inp = k[k.length - 1], l = k[k.length - 2]; l.style.minWidth = em + 'em'; l.style.display = 'inline-block'; const g = document.createElement('span'); g.style.cssText = 'display:inline-flex;align-items:center;gap:8px;flex-wrap:nowrap'; ctlEl.insertBefore(g, l); g.append(l, inp); };
      controls.segment('시점', [{ value: 'all', label: '🌐 밖에서' }, { value: 'north', label: '🧭 북쪽 보기' }, { value: 'south', label: '🧭 남쪽 보기' }], 'all', setView);
      controls.segment('지켜볼 별', [{ value: 'dipper', label: '북두칠성' }, { value: 'cas', label: '카시오페이아' }, { value: 'orion', label: '오리온' }, { value: 'polaris', label: '북극성' }], st.focus, (v) => { st.focus = v; refresh(); });
      const rng = controls.range('🕘', T0, T1, 0.05, st.t, (v) => { st.t = v; st.play = false; playB.textContent = '▶ 재생'; refresh(); }, (v) => hm(v));
      fixLab(8.5);
      const playB = controls.button('▶ 재생', () => { st.play = !st.play; if (st.play && st.t >= T1 - 0.01) st.t = T0; playB.textContent = st.play ? '⏸ 멈춤' : '▶ 재생'; });
      const trB = controls.button('별의 자취 ✓', () => { st.trails = !st.trails; trails.visible = st.trails; trB.classList.toggle('on', st.trails); trB.textContent = '별의 자취 ' + (st.trails ? '✓' : '✕'); }); trB.classList.add('on');
      refresh();

      return {
        update(dt) {
          const fv = orbit.dist < 3 ? 80 : 50; if (camera.fov !== fv) { camera.fov = fv; camera.updateProjectionMatrix(); }
          named.forEach((s) => { const k = Math.max(0.25, Math.min(1.3, camera.position.distanceTo(s.m.position) / 20)); s.m.scale.setScalar(k); });
          if (st.play) { st.t += dt * 0.5; if (st.t >= T1) { st.t = T1; st.play = false; playB.textContent = '▶ 재생'; } rng.set(st.t); refresh(); }
        },
        sync() {
          try { const s = window.__sim && window.__sim.S; if (s && typeof s.t === 'number') { st.t = Math.min(T1, Math.max(T0, s.t)); rng.set(st.t); refresh(); } } catch (e) {}
        },
      };
    },
  });
})();
