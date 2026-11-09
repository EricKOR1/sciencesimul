/* hs-geostrophic-wind · 3D 전향력과 지균풍 (북반구)
   기압 경도력은 고기압 → 저기압 쪽, 전향력은 움직이는 방향의 오른쪽(북반구)으로 작용해요. 처음엔 저기압 쪽으로 가다가 점점 오른쪽으로 휘어
   결국 두 힘이 균형을 이루면 바람은 <b>등압선과 나란히</b> 불어요(지균풍).  V = Δp / (ρ f Δn),  f = 2Ω sinφ.
   공기 덩어리의 운동 방정식을 그대로 풀어요(마찰은 아주 작게). 2D 실험의 '지구 자전' · 위도 · 등압선 간격을 읽어 시작해요(읽기 전용). */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const DEG = Math.PI / 180, OMEGA = 7.29e-5;
  const MX = 5, MY = 4;                                   // 지도 반폭 · 반높이

  window.SciSim3D.attach({
    title: '전향력과 지균풍 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    levels: [2, 3],
    camera: { dist: PHONE ? 21 : 12, theta: 0.15, phi: 0.95, min: 6, max: 26, target: [0, 0, 0.3] },
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const st = { rot: true, lat: 45, spc: 400, rho: 1.2, mode: 'bal', P: 0, key: '', path: null };
      const sr = () => { try { return window.__sim && window.__sim.S; } catch (e) { return null; } };

      /* 기압 지도: 북쪽이 저기압(파랑), 남쪽이 고기압(주황) */
      const cv = document.createElement('canvas'); cv.width = 8; cv.height = 256; { const g = cv.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#7fb0e6'); gr.addColorStop(0.5, '#c9d6e6'); gr.addColorStop(1, '#e9b88a'); g.fillStyle = gr; g.fillRect(0, 0, 8, 256); }
      const mapTex = new THREE.CanvasTexture(cv); if ('encoding' in mapTex) mapTex.encoding = THREE.sRGBEncoding;
      const map = new THREE.Mesh(new THREE.BoxGeometry(MX * 2, 0.18, MY * 2), [0, 1, 2, 3, 4, 5].map((i) => new THREE.MeshStandardMaterial(i === 2 ? { map: mapTex, roughness: 0.9 } : { color: 0x56627a, roughness: 0.9 })));
      map.position.y = -0.09; root.add(map);
      /* 등압선 (남북으로 기압이 달라요) */
      const isoG = new THREE.Group(); root.add(isoG);
      const isoLabs = [];
      function buildIso() {
        while (isoG.children.length) { const o = isoG.children.pop(); o.geometry.dispose(); }
        const gap = Math.max(0.55, Math.min(2.3, st.spc / 400 * 1.2));          // 간격이 넓을수록 경도력이 약해요
        const ys = [];
        for (let k = -3; k <= 3; k++) { const y = k * gap; if (Math.abs(y) < MY - 0.25) ys.push([k, y]); }
        ys.forEach(([k, y]) => {
          const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-MX + 0.1, 0.02, -y), new THREE.Vector3(MX - 0.1, 0.02, -y)]), 2, 0.05, 6, false), new THREE.MeshStandardMaterial({ color: 0x1e3a6e, roughness: 0.6 }));
          isoG.add(m);
        });
        isoLabs.forEach((l, i) => { const e = ys[i]; if (e) { l.show(true); l.obj = [MX - 0.5, 0.15, -e[1]]; l.set((1004 - 4 * e[0]) + ' hPa'); } else l.show(false); });
        st.gap = gap;
      }
      for (let i = 0; i < 7; i++) isoLabs.push(label('', [0, 0, 0], { size: 10.5, color: 'rgba(40,50,80,.85)' }));
      label('저기압 (L)', [0, 0.2, -MY + 0.35], { color: 'rgba(30,80,170,.92)' }); label('고기압 (H)', [0, 0.2, MY - 0.35], { color: 'rgba(170,80,20,.92)' }); label('북', [-MX + 0.35, 0.2, -MY + 0.2], { size: 12 });
      /* 북쪽 화살표 */

      /* 공기 덩어리 · 화살표 */
      const parcel = new THREE.Mesh(new THREE.SphereGeometry(0.2, 28, 20), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, emissive: 0x334466, emissiveIntensity: 0.3 })); root.add(parcel);
      function mkArrow(col) { const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: col, roughness: 0.4, emissive: col, emissiveIntensity: 0.25 }); const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1, 10), m), hd = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.3, 14), m); g.add(sh, hd); g.userData = { sh, hd }; root.add(g); return g; }
      const up = new THREE.Vector3(0, 1, 0);
      function setArrow(g, from, dir, len) {            // dir: 단위벡터(장면), len 길이
        if (len < 0.08) { g.visible = false; return; } g.visible = true; const { sh, hd } = g.userData, hl = Math.min(0.3, len * 0.5);
        sh.scale.y = Math.max(0.01, len - hl); sh.position.y = (len - hl) / 2; hd.position.y = len - hl / 2; hd.scale.y = hl / 0.3;
        g.position.copy(from); g.quaternion.setFromUnitVectors(up, dir);
      }
      const aP = mkArrow(0xef4444), aC = mkArrow(0xf97316), aV = mkArrow(0x22c55e);   // 색: 2D · 오른쪽 그림(㉠ 빨강 · ㉡ 주황 · ㉢ 초록)과 같아요
      const lP = label('압력 경도력', [0, 0, 0], { size: 11.5, color: 'rgba(185,28,28,.92)' }), lC = label('전향력', [0, 0, 0], { size: 11.5, color: 'rgba(194,65,12,.92)' }), lV = label('바람', [0, 0, 0], { size: 11.5, color: 'rgba(21,128,61,.92)' });
      const trailM = new THREE.MeshBasicMaterial({ color: 0xfff3a0 }), tg = new THREE.SphereGeometry(0.045, 8, 6);
      const trailMeshes = []; for (let i = 0; i < 150; i++) { const m = new THREE.Mesh(tg, trailM); m.visible = false; root.add(m); trailMeshes.push(m); }

      const fVis = () => 1.6 * Math.sin(st.lat * DEG) / Math.sin(45 * DEG);
      const PGF = () => 0.8 * 400 / st.spc;                      // 장면에서의 가속도 (간격이 넓으면 약해요)
      const real = () => { const f = 2 * OMEGA * Math.sin(st.lat * DEG), pg = (400 / (st.spc * 1000)) / st.rho; return { f, pg, V: f > 1e-9 ? pg / f : Infinity }; };
      const SIMT = 12, SH = 1 / 60;
      /* 공기 덩어리의 운동 방정식(마찰은 아주 작게)을 처음부터 풀어 두고, ▶ 재생 위치 p로 그 궤적을 따라가요 */
      function buildPath() {
        const f = st.rot ? fVis() : 0, P = PGF(), nu = 0.03, xs = [], ys = [], us = [], vs = [];
        let x = -MX + 0.8, y = 0, u = 0, v = 0;
        for (let k = 0; k <= SIMT / SH; k++) {
          xs.push(x); ys.push(y); us.push(u); vs.push(v);
          for (let i = 0; i < 4; i++) { const h = SH / 4, ua = f * v - nu * u, va = -f * u + P - nu * v; u += ua * h; v += va * h; x += u * h; y += v * h; }
          if (Math.abs(x) > MX - 0.2 || Math.abs(y) > MY - 0.2) break;
        }
        st.path = { xs, ys, us, vs };
      }
      function text() {
        const r = real(), q = window.__sim || {}, S = q.S || {}, free = !!(q.game && q.game.free);
        if (st.mode === 'calc') {
          const vTxt = (S.showV || free) ? ' ≈ <b>' + (r.V === Infinity ? '—' : r.V.toFixed(1)) + ' m/s</b>' : ' (옆에서 직접 계산해 봐요)';
          info('<b>지균풍</b> V = Δp / (ρ f Δn)' + vTxt + '<br>위도 ' + st.lat + '°N, ρ = ' + st.rho + ' kg/m³, 등압선 간격 ' + st.spc + ' km' + (st.lat === 0 ? '<br>적도에서는 f = 0이라 전향력이 없어 이 식을 쓸 수 없어요.' : ''));
        } else if (st.mode === 'bal') {
          info(st.rot
            ? '<b>지구 자전 켬</b> · 압력 경도력과 전향력(움직이는 방향의 오른쪽)이 <b>균형</b>을 이루면 바람은 <b>등압선과 나란히</b> 불어요. (위도 ' + st.lat + '°N)'
            : '<b>지구 자전 끔</b>: 전향력이 없어서 공기는 고기압에서 저기압 쪽으로 <b>곧장</b> 움직여요.');
        } else info('<b>압력 경도력</b>은 고기압에서 저기압 쪽으로 작용해요. 등압선 간격 ' + st.spc + ' km');
      }
      /* ▶ 재생: 정지해 있던 공기 덩어리가 출발해 점점 오른쪽으로 휘며 등압선과 나란히 불어요 (다시 처음부터 반복) */
      const player = controls.player({
        duration: SIMT, loop: true, autoplay: true, label: '재생',
        phases: [[0, '출발: 저기압 쪽으로'], [0.25, '점점 오른쪽으로 휘어요']],
        onFrame(p) { st.P = p; },
      });

      /* 2D → 3D: 단계(모드)와 지구 자전 · 위도 · 등압선 간격 · 상층/지상 밀도를 그대로 읽어요 */
      const SCEN = { sfc: { rho: 1.2, spc: 400, lat: 45 }, up: { rho: 0.74, spc: 200, lat: 45 }, l15: { rho: 1.2, spc: 400, lat: 15 } };
      function follow() {
        const S = sr(); if (!S) return;
        let rot = st.rot, lat = st.lat, spc = st.spc, rho = st.rho;
        if (S.mode === 'bal') { rot = !!S.rot; lat = typeof S.lat === 'number' ? S.lat : 45; spc = 400; rho = 1.2; }
        else if (S.mode === 'calc') { const c = S.sc === 'free' ? { rho: S.altC === 'up' ? 0.74 : 1.2, spc: S.spcC, lat: S.latC } : (SCEN[S.sc] || SCEN.sfc); rot = true; lat = c.lat; spc = c.spc; rho = c.rho; }
        else { rot = false; spc = typeof S.spc === 'number' ? S.spc : 400; }
        const showV = !!(S.showV || (window.__sim && window.__sim.game && window.__sim.game.free));
        const key = [S.mode, rot, lat, spc, rho, showV].join('|');
        if (key === st.key) return; const spcCh = spc !== st.spc;
        st.key = key; st.mode = S.mode; st.rot = rot; st.lat = lat; st.spc = spc; st.rho = rho;
        if (spcCh || !st.path) buildIso();
        buildPath(); text(); player.set(0);
      }
      buildIso(); follow(); if (!st.path) { buildPath(); text(); }

      const d = new THREE.Vector3(), p0 = new THREE.Vector3();
      let acc = 0;
      return {
        update(dt) {
          follow();
          const pa = st.path, n = pa.xs.length, i = Math.min(n - 1, Math.floor(st.P * SIMT / SH));
          const x = pa.xs[i], y = pa.ys[i], u = pa.us[i], v = pa.vs[i];
          parcel.position.set(x, 0.22, -y);
          const stp = Math.max(1, Math.ceil((n - 1) / trailMeshes.length));
          trailMeshes.forEach((m, k) => { const j = k * stp; if (j < i) { m.visible = true; m.position.set(pa.xs[j], 0.06, -pa.ys[j]); } else m.visible = false; });
          /* 화살표 (가속도 크기에 비례) */
          const sp = Math.hypot(u, v), f = st.rot ? fVis() : 0, P = PGF(), from = parcel.position.clone();
          from.y = 0.22; setArrow(aP, from, d.set(0, 0, -1), P * 1.15); lP.obj = [from.x, 0.4, from.z - P * 1.15 - 0.2]; lP.show(P * 1.15 > 0.08);
          if (sp > 1e-3 && f > 0) { d.set(v, 0, u).normalize(); setArrow(aC, from, d.clone(), f * sp * 1.15); lC.obj = [from.x + d.x * (f * sp * 1.15 + 0.2), 0.4, from.z + d.z * (f * sp * 1.15 + 0.2)]; lC.show(f * sp * 1.15 > 0.08); }
          else { aC.visible = false; lC.show(false); }
          if (sp > 0.05) { d.set(u, 0, -v).normalize(); setArrow(aV, from.clone().setY(0.45), d.clone(), Math.min(2.6, sp * 1.0)); lV.obj = [from.x + d.x * (Math.min(2.6, sp) + 0.3), 0.7, from.z + d.z * (Math.min(2.6, sp) + 0.3)]; lV.show(true); }
          else { aV.visible = false; lV.show(false); }
        },
        sync() { st.key = ''; follow(); },
      };
    },
  });
})();
