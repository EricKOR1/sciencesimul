/* hs-planetary-wave · 북극 위에서 내려다보는 3D 지구본의 편서풍 파동 (제트축이 굽이치는 로스비파)
   2D 차시와 같은 식·색: 제트축 위도 = 48° + 진폭 × cos(n(경도 − 위상)), 능 #dc2626(난기 북상) · 골 #2563eb(한기 남하) · 제트축 #ea580c, 파동은 평균 10 m/s로 동진. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const narrow = window.innerWidth < 600 || window.innerHeight > window.innerWidth * 1.1;
  const D2R = Math.PI / 180, TAU = Math.PI * 2;
  const CIRC45 = TAU * 6371 * Math.cos(45 * D2R);                 // 위도 45° 둘레 ≈ 28 306 km
  const lamN = (n) => Math.round(CIRC45 / n / 100) * 100;
  const LAND = {
    na: [[-165, 65], [-155, 71], [-125, 70], [-95, 72], [-80, 73], [-62, 60], [-55, 50], [-67, 45], [-76, 38], [-81, 31], [-80, 25], [-84, 30], [-90, 29], [-97, 25], [-97, 20], [-90, 18], [-87, 21], [-83, 15], [-79, 9], [-86, 11], [-93, 15], [-105, 20], [-110, 24], [-114, 31], [-118, 34], [-124, 40], [-125, 48], [-135, 58], [-150, 60], [-165, 60]],
    sa: [[-79, 9], [-72, 12], [-62, 10], [-50, 0], [-35, -5], [-39, -15], [-48, -26], [-58, -38], [-65, -45], [-70, -54], [-75, -48], [-73, -37], [-71, -20], [-76, -13], [-81, -5], [-80, 2]],
    eu: [[-10, 36], [-9, 43], [-2, 48], [5, 52], [10, 57], [5, 62], [15, 69], [30, 71], [60, 69], [80, 73], [110, 77], [140, 72], [170, 70], [180, 66], [165, 60], [155, 57], [142, 52], [135, 43], [128, 38], [127, 35], [122, 30], [120, 24], [110, 20], [106, 10], [100, 13], [103, 2], [98, 8], [92, 22], [88, 22], [80, 15], [77, 8], [72, 20], [67, 25], [57, 25], [57, 15], [52, 16], [44, 12], [34, 28], [35, 35], [27, 37], [23, 36], [12, 38], [8, 44], [3, 43], [-5, 36]],
    af: [[-17, 21], [-10, 30], [0, 35], [10, 37], [32, 31], [34, 28], [43, 12], [51, 12], [40, -5], [40, -15], [35, -25], [27, -34], [18, -34], [12, -17], [13, -5], [9, 3], [-8, 4], [-17, 14]],
    au: [[114, -22], [122, -18], [131, -12], [142, -11], [146, -19], [153, -26], [150, -37], [138, -35], [130, -32], [115, -34]],
    gl: [[-55, 60], [-40, 60], [-20, 70], [-20, 81], [-60, 82], [-72, 77], [-55, 68]],
    an: [[-180, -70], [180, -70], [180, -90], [-180, -90]],
  };

  window.SciSim3D.attach({
    title: '편서풍 파동 3D (북극 위에서)',
    hint: '드래그: 돌리기 · 두 손가락/휠: 확대',
    levels: [2],
    camera: { dist: narrow ? 4.8 : 3.4, phi: 0.28, theta: 0.0, target: narrow ? [0, 0, -0.45] : [-0.45, 0, 0], min: 2.2, max: 9 },
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      const V = THREE.Vector3;
      const P = (lat, lon, r) => new V(r * Math.cos(lat * D2R) * Math.sin(lon * D2R), r * Math.sin(lat * D2R), r * Math.cos(lat * D2R) * Math.cos(lon * D2R));
      let n = 5, amp = 9, tint = true, names = true, th0 = 0.6, P0 = 0, base = 0.6;

      /* 지구 */
      const W = 1024, H = 512, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      const g = cv.getContext('2d');
      g.fillStyle = '#2a5f8f'; g.fillRect(0, 0, W, H);
      const X = (lon) => (lon / 360 + 0.25) * W, Y = (lat) => (90 - lat) / 180 * H;
      g.strokeStyle = '#4a7a45'; g.lineWidth = 1;
      Object.keys(LAND).forEach((k) => { for (let s = -1; s <= 1; s++) { g.beginPath(); LAND[k].forEach((p, i) => { const x = X(p[0]) + s * W, y = Y(p[1]); if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.closePath(); g.fillStyle = k === 'an' || k === 'gl' ? '#e8eef5' : '#6a9f58'; g.fill(); g.stroke(); } });
      g.fillStyle = 'rgba(20,30,60,.18)'; g.fillRect(0, Y(0), W, H - Y(0));
      const tex = new THREE.CanvasTexture(cv); if ('encoding' in tex) tex.encoding = THREE.sRGBEncoding;
      root.add(new THREE.Mesh(new THREE.SphereGeometry(1, 64, 40), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, metalness: 0 })));
      const kor = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 10), new THREE.MeshBasicMaterial({ color: 0xef4444 })); kor.position.copy(P(37, 127.5, 1.01)); root.add(kor);
      // 위도 원
      const ring = (lat, col) => { const pts = []; for (let i = 0; i <= 120; i++) pts.push(P(lat, (i / 120) * 360, 1.004)); const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.6 })); root.add(l); };
      [30, 45, 60].forEach((la) => ring(la, 0xe2e8f0));
      [30, 45, 60].forEach((la) => { const o = new THREE.Object3D(); o.position.copy(P(la, 0, 1.0)); root.add(o); label(la + '°N', o, { color: 'rgba(15,23,42,.75)', size: 11 }); });
      const poleO = new THREE.Object3D(); poleO.position.set(0, 1.02, 0); root.add(poleO);
      label('북극', poleO, { color: 'rgba(30,58,138,.9)', size: 12 });

      /* 한기 · 난기 색 (제트축 북쪽은 한랭, 남쪽은 온난) */
      const N = 180;
      const contour = (lon) => 48 + amp * Math.cos(n * (lon * D2R - th0));
      function makeSurf(K, color, opa) {
        const pos = new Float32Array((N + 1) * (K + 1) * 3), idx = [];
        for (let i = 0; i < N; i++) for (let k = 0; k < K; k++) { const a = i * (K + 1) + k, b = (i + 1) * (K + 1) + k; idx.push(a, b, a + 1, b, b + 1, a + 1); }
        const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setIndex(idx);
        const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: opa, side: THREE.DoubleSide, depthWrite: false }));
        m.renderOrder = 2; root.add(m); return { m, pos, K };
      }
      const cold = makeSurf(16, 0x2563eb, 0.45), warm = makeSurf(12, 0xef4444, 0.28);
      function fillSurf(s, latA, latB) {   // lat(k) = latA(lon) → latB(lon)
        const p = s.pos; let o = 0;
        for (let i = 0; i <= N; i++) { const lon = (i / N) * 360, c = contour(lon); const a = latA(c), b = latB(c); for (let k = 0; k <= s.K; k++) { const v = P(a + (b - a) * (k / s.K), lon, 1.012); p[o++] = v.x; p[o++] = v.y; p[o++] = v.z; } }
        s.m.geometry.attributes.position.needsUpdate = true;
      }
      /* 제트축 (띠) */
      const NR = 240;
      function makeBand(halfW, color, opa, r) {
        const pos = new Float32Array((NR + 1) * 2 * 3), idx = [];
        for (let i = 0; i < NR; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
        const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setIndex(idx);
        const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: opa < 1, opacity: opa, side: THREE.DoubleSide, depthWrite: opa >= 1 })); m.renderOrder = opa < 1 ? 3 : 4; root.add(m);
        return { m, pos, halfW, r };
      }
      const glow = makeBand(4.2, 0xfb923c, 0.3, 1.03), core = makeBand(1.2, 0xea580c, 1, 1.034);
      function fillBand(b) {
        let o = 0;
        for (let i = 0; i <= NR; i++) { const lon = (i / NR) * 360, c = contour(lon); const a = P(c + b.halfW, lon, b.r), d = P(c - b.halfW, lon, b.r); b.pos[o++] = a.x; b.pos[o++] = a.y; b.pos[o++] = a.z; b.pos[o++] = d.x; b.pos[o++] = d.y; b.pos[o++] = d.z; }
        b.m.geometry.attributes.position.needsUpdate = true;
      }
      /* 서풍 알갱이 (동쪽으로 흘러요) */
      const parts = [], pg = new THREE.SphereGeometry(0.017, 10, 8), pm = new THREE.MeshBasicMaterial({ color: 0xfff3dc });
      for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(pg, pm); root.add(m); parts.push({ m, s0: i / 40 }); }

      /* 능 · 골 (표시와 공기의 이동 화살표) */
      const ridges = [], troughs = [];
      const shaftG = new THREE.CylinderGeometry(0.013, 0.013, 1, 8); shaftG.translate(0, 0.5, 0);
      const headG = new THREE.ConeGeometry(0.04, 0.09, 12); headG.translate(0, 0.045, 0);
      function mkArrow(col) { const g2 = new THREE.Group(), m = new THREE.MeshBasicMaterial({ color: col }); const sh = new THREE.Mesh(shaftG, m), hd = new THREE.Mesh(headG, m); g2.add(sh, hd); g2.userData = { sh, hd }; return g2; }
      function setArrow(a, pos, dir, len) { a.position.copy(pos); a.quaternion.setFromUnitVectors(new V(0, 1, 0), dir.clone().normalize()); a.userData.sh.scale.y = len; a.userData.hd.position.y = len; }
      for (let i = 0; i < 6; i++) {
        const rm = new THREE.Mesh(new THREE.SphereGeometry(0.036, 16, 12), new THREE.MeshBasicMaterial({ color: 0xdc2626 })), tm = new THREE.Mesh(new THREE.SphereGeometry(0.036, 16, 12), new THREE.MeshBasicMaterial({ color: 0x2563eb }));
        root.add(rm, tm);
        const ra = mkArrow(0xdc2626), ta = mkArrow(0x2563eb);
        root.add(ra, ta);
        const rl = label('능', rm, { color: '#dc2626', size: 12 }), tl = label('골', tm, { color: '#2563eb', size: 12 });
        rl.off = [0, 0.07, 0]; tl.off = [0, 0.07, 0];
        ridges.push({ m: rm, a: ra, l: rl }); troughs.push({ m: tm, a: ta, l: tl });
      }
      const korLab = label('우리나라', kor, { color: 'rgba(185,28,28,.9)', size: 11 }); korLab.off = [0, 0.05, 0];
      const _a = new V(), _b = new V(), _n = new V(), _e = new V(), _d = new V(), cam = ctx.camera;

      function layout() {
        const cl = (a, f) => a;
        fillSurf(cold, () => 90, (c) => c);
        fillSurf(warm, (c) => c, () => 18);
        cold.m.visible = warm.m.visible = tint;
        fillBand(glow); fillBand(core);
        for (let i = 0; i < 6; i++) {
          const on = i < n, R = ridges[i], T = troughs[i];
          [R.m, T.m, R.a, T.a].forEach((o) => { o.visible = on; });
          R.l.show(on && names); T.l.show(on && names);
          if (!on) continue;
          const lonR = (th0 + (TAU * i) / n) / D2R, lonT = (th0 + (TAU * (i + 0.5)) / n) / D2R;
          R.m.position.copy(P(48 + amp, lonR, 1.06)); T.m.position.copy(P(48 - amp, lonT, 1.06));
          // 능: 난기 북상(극 쪽으로), 골: 한기 남하(적도 쪽으로)
          const dirOf = (lat, lon, sg) => { const la = lat * D2R, lo = lon * D2R; _n.set(-Math.sin(la) * Math.sin(lo), Math.cos(la), -Math.sin(la) * Math.cos(lo)); return _n.clone().multiplyScalar(sg); };
          const len = 0.1 + amp * 0.01;
          setArrow(R.a, P(48 + amp - 9, lonR, 1.06), dirOf(48 + amp - 9, lonR, 1), len);
          setArrow(T.a, P(48 - amp + 9, lonT, 1.06), dirOf(48 - amp + 9, lonT, -1), len);
        }
        writeInfo();
      }
      function writeInfo() {
        if (view === 'cyl') { info('<b>회전 원통 실험</b> (위에서 본 모형)<br>바깥벽을 데우고 중심을 차갑게 한 채 돌리면 물결 모양 흐름이 생겨요. 이 파동은 <b>벽과 중심의 온도 차</b>로 생기는 불안정이에요. 바닥이 평평해 f가 일정하므로 <b>β 효과가 없어요</b>. 모양만 지구의 편서풍 파동과 비슷해요.'); return; }
        const q = window.__sim || {}, S = q.S || {}, show = !!(S.showLam || (q.game && q.game.free));
        info('<b>북극 위에서 본 편서풍 파동</b><br>제트축(<b style="color:#fb923c">주황</b>)이 남북으로 굽이쳐요. 남쪽으로 처진 <b style="color:#93c5fd">골</b>에는 한기가 남하하고, 북쪽으로 솟은 <b style="color:#fca5a5">능</b>에는 난기가 북상해요.<br>파동 수 <b>n = ' + n + '</b> · 진폭 ' + amp + '°' + (show ? ' · 파장 λ ≈ ' + lamN(n).toLocaleString('ko-KR') + ' km (위도 45° 둘레 ÷ n)' : ' · 파장은 옆에서 직접 계산해 봐요') + ' · 파동은 동쪽(반시계)으로 평균 10 m/s');
      }
      /* 회전 원통 실험 (2D와 같은 장면): 가열된 바깥벽 · 차가운 중심 · 물결 모양 흐름(m = 5). 2D에서 '회전 원통 실험'을 고르면 지구 대신 보여요 */
      const earthG = new THREE.Group(); root.children.slice().forEach((c) => earthG.add(c)); root.add(earthG);
      const cylG = new THREE.Group(); cylG.visible = false; root.add(cylG);
      const R0 = 1.15, R1 = 0.38, HC = 0.42, YW = HC / 2 - 0.06;
      cylG.add(new THREE.Mesh(new THREE.CylinderGeometry(R0, R0, HC, 72, 1, true), new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.6, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false })));
      const bot = new THREE.Mesh(new THREE.CircleGeometry(R0, 72), new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8 })); bot.rotation.x = -Math.PI / 2; bot.position.y = -HC / 2; cylG.add(bot);
      const inner = new THREE.Mesh(new THREE.CylinderGeometry(R1, R1, HC + 0.04, 48), new THREE.MeshStandardMaterial({ color: 0x60a5fa, roughness: 0.5 })); cylG.add(inner);
      { const wg = new THREE.RingGeometry(R1, R0, 72, 8); wg.rotateX(-Math.PI / 2);
        const pa = wg.attributes.position, col = new Float32Array(pa.count * 3), cA = new THREE.Color(0xbfdbfe), cB = new THREE.Color(0xfecaca), cc = new THREE.Color();
        for (let i = 0; i < pa.count; i++) { const r = Math.hypot(pa.getX(i), pa.getZ(i)); cc.copy(cA).lerp(cB, (r - R1) / (R0 - R1)); col[i * 3] = cc.r; col[i * 3 + 1] = cc.g; col[i * 3 + 2] = cc.b; }
        wg.setAttribute('color', new THREE.BufferAttribute(col, 3));
        const w = new THREE.Mesh(wg, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, side: THREE.DoubleSide })); w.position.y = YW; cylG.add(w); }
      const flowR = new THREE.Group(); cylG.add(flowR);
      { const NC = 200, pos = new Float32Array((NC + 1) * 6), idx = [];
        for (let i = 0; i <= NC; i++) { const th = (i / NC) * TAU, r = (R0 + R1) / 2 + (R0 - R1) * 0.12 * Math.cos(5 * th); [r - 0.022, r + 0.022].forEach((rr, k) => { pos.set([rr * Math.cos(th), YW + 0.01, -rr * Math.sin(th)], i * 6 + k * 3); }); if (i < NC) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
        const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); fg.setIndex(idx);
        flowR.add(new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ color: 0x7c2d12, side: THREE.DoubleSide }))); }
      const wallO = new THREE.Object3D(); wallO.position.set(0, HC / 2 + 0.05, -R0); cylG.add(wallO);
      const coldO = new THREE.Object3D(); coldO.position.set(0, HC / 2 + 0.06, 0); cylG.add(coldO);
      label('가열된 바깥벽', wallO, { color: '#dc2626', size: 12 }); label('차가운 중심', coldO, { color: 'rgba(30,58,138,.9)', size: 12 });
      let cylPh = 0, view = 'wave';
      function setView3(v) {
        view = v === 'cyl' ? 'cyl' : 'wave'; earthG.visible = view !== 'cyl'; cylG.visible = view === 'cyl';
        writeInfo(); showCtl();
      }

      const nR = controls.range('파동 수 n', 4, 6, 1, n, (v) => { n = v; layout(); try { window.__sim.setN(v); } catch (e) {} }, (v) => v + '개');
      const aR = controls.range('진폭', 3, 14, 1, amp, (v) => { amp = v; layout(); try { window.__sim.setAmp(v); } catch (e) {} }, (v) => v + '°');
      controls.segment('시점', [{ value: 0.28, label: '북극 위' }, { value: 0.95, label: '비스듬히' }, { value: 1.4, label: '옆에서' }], 0.28, (v) => { orbit.phi = v; });
      const tB = controls.button('한기·난기 색 ✓', () => { tint = !tint; tB.classList.toggle('on', tint); tB.textContent = '한기·난기 색 ' + (tint ? '✓' : '✕'); layout(); }); tB.classList.add('on');
      /* ▶ 재생: 파동이 동쪽으로 한 파장만큼 나아가요 (평균 10 m/s로 동진). 한 파장 지나면 같은 모양이라 끊김 없이 반복돼요 */
      const player = controls.player({
        duration: 12, loop: true, autoplay: true, label: '재생',
        phases: [[0, '동쪽으로 이동'], [0.5, '한 파장의 절반']],
        onFrame(p) { P0 = p; th0 = base + (TAU / n) * p; layout(); },
      });
      layout();
      /* 원통 장면에서는 지구 파동용 조작(파동 수 · 진폭 · 색 · 재생)을 숨겨요 (시점 단추만 남겨요) */
      const ctlEl = tB.parentNode, waveOnly = Array.from(ctlEl.children).filter((e, i) => i < 4 || i > 7);
      const showCtl = () => waveOnly.forEach((e) => { e.style.display = view === 'cyl' ? 'none' : ''; });

      let lastKey = '';
      function follow() {
        const q = window.__sim, s = q && q.S; if (!s) return;
        const nn = Math.max(4, Math.min(6, Math.round(s.n))), aa = Math.max(3, Math.min(14, Math.round(s.amp)));
        const key = nn + '|' + aa + '|' + (s.showLam ? 1 : 0) + (q.game && q.game.free ? 1 : 0) + '|' + s.view;
        if (key === lastKey) return; lastKey = key;
        if (nn !== n || aa !== amp) { n = nn; amp = aa; nR.set(n); aR.set(amp); }
        th0 = base + (TAU / n) * P0; layout(); setView3(s.view);
      }
      follow();
      return {
        sync() {
          const s = window.__sim && window.__sim.S;
          if (s && isFinite(s.n) && isFinite(s.amp)) {
            const nn = Math.max(4, Math.min(6, Math.round(s.n))), aa = Math.max(3, Math.min(14, Math.round(s.amp)));
            if (nn !== n || aa !== amp) { n = nn; amp = aa; nR.set(n); aR.set(amp); layout(); }
          }
        },
        update(dt, t) {
          follow();
          if (view === 'cyl') { cylPh = (cylPh + dt * 0.5) % TAU; flowR.rotation.y = cylPh / 5; return; }
          parts.forEach((p) => {
            const lon = ((p.s0 + P0) % 1) * 360, c = contour(lon);
            p.m.position.copy(P(c, lon, 1.045));
          });
          kor.getWorldPosition(_a); _b.copy(cam.position).sub(_a).normalize(); korLab.show(_a.clone().normalize().dot(_b) > 0.2);
        },
      };
    },
  });
})();
