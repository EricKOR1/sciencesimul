/* m1-heat-equilibrium · 3D 열평형
   2D 차시와 같은 장면: ① 20 °C 물과 오른쪽 비커 물(0~100 °C)의 입자 운동 ② 80 °C 물이 든 금속 컵을 20 °C 수조에 넣기(열평형 35 °C)
   2D 실험 상태(window.__sim)를 그대로 읽어 보여 주고, ▶ 재생은 컵 넣기 → 열의 이동 → 열평형 한 번을 반복해요.
   1단계(온도와 입자) · 3단계(열평형)만 3D예요. 온도-시간 그래프를 그리고 읽는 2단계와 생활 속 장면 카드(4단계)는 2D 화면이에요.
   3단계의 '🔍 경계면 확대'를 켜면 3D에서도 컵 벽(경계면) 가까이로 다가가 봐요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN0 = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  window.SciSim3D.attach({
    host: PHN0 ? '.sc-tall' : '.sc-wide',   // 휴대폰에서는 세로 화면(.sc-tall)을 덮어요 (.sc-wide는 휴대폰에서 숨겨져 3D가 안 보였어요)
    title: '열평형 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    levels: [0, 2],   // 온도와 입자 · 열평형은 3D, 그래프 그리기 · 읽기(2단계)와 생활 속 카드(4단계)는 2D
    camera: { dist: 11.5 * (PHN0 ? 1.12 : 1), theta: 0.35, phi: 1.2, fov: 45, target: [0, 0, 0], min: 6, max: 28 },
    autoRotate: 0.05,
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      const V3 = THREE.Vector3, Yax = new V3(0, 1, 0);
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0.05 }, o || {}));
      const glass = (c, op, o) => mat(c || 0xbfe3ff, Object.assign({ transparent: true, opacity: op || 0.16, roughness: 0.12, metalness: 0, depthWrite: false, side: THREE.DoubleSide }, o || {}));
      const rnd = (() => { let s = 12345; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
      const _m = new THREE.Matrix4(), _c = new THREE.Color();
      const L2 = () => (ctx.lesson && ctx.lesson()) || null;
      const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

      /* ---- 2D 차시와 같은 값 ---- */
      const T_C0 = 80, T_T0 = 20, T_EQ = 35, TAU_M = 1.15, T_END = 10, EQ_TOL = 0.06;
      const tempsAt = (t) => { const e = Math.exp(-t / TAU_M); return [T_EQ + (T_C0 - T_EQ) * e, T_EQ + (T_T0 - T_EQ) * e]; };
      const speedOf = (T) => 1.8 * (0.22 + 0.0225 * clamp(T, 0, 100));
      const cCold = new THREE.Color(0x3d7bff), cHot = new THREE.Color(0xff4a2a), cc = new THREE.Color();
      const colOf = (T) => cc.copy(cCold).lerp(cHot, clamp(T / 100, 0, 1));

      /* ---- 틀 ---- */
      const PR = 0.1;
      const BR = 1.15, BYB = -1.5, BYT = 0.9;         // 비커: 반지름, 바닥, 물 높이
      const BX = 2.0;                                   // 비커 가운데 x = ±BX
      const TX = 2.7, TYB = -1.5, TYT = 1.2, TZ = 1.6;  // 수조(상자): 반너비, 바닥, 물 높이, 반깊이
      const CR = 1.0, CH = 2.3, CWT = 1.9;              // 금속 컵: 반지름, 높이, 컵 속 물 높이(바닥에서)
      const REST = 0.65, LIFT = 2.8;                    // 컵 가운데 y(담근 상태), 들어 올린 높이
      const groupB = new THREE.Group(), groupC = new THREE.Group(); root.add(groupB, groupC);
      const stand = new THREE.Mesh(new THREE.BoxGeometry(2 * TX + 1.2, 0.2, 2 * TZ + 1), mat(0x64748b, { roughness: 0.7 })); stand.position.y = TYB - 0.12; root.add(stand);

      // 비커 두 개
      const bw = [-1, 1].map((s) => {
        const x = s * BX, g = new THREE.Group(); g.position.x = x; groupB.add(g);
        const glassM = new THREE.Mesh(new THREE.CylinderGeometry(BR, BR, 2.9, 40, 1, true), glass(0xdbeafe, 0.14)); glassM.position.y = (BYB + 1.4) / 2; g.add(glassM);
        const rim = new THREE.Mesh(new THREE.TorusGeometry(BR, 0.03, 8, 40), mat(0xb6c6da)); rim.rotation.x = Math.PI / 2; rim.position.y = 1.4; g.add(rim);
        const bot = new THREE.Mesh(new THREE.CylinderGeometry(BR, BR, 0.06, 40), glass(0xdbeafe, 0.3)); bot.position.y = BYB - 0.03; g.add(bot);
        const wm = glass(0x7ab8ff, 0.3); const w = new THREE.Mesh(new THREE.CylinderGeometry(BR - 0.02, BR - 0.02, BYT - BYB, 40), wm); w.position.y = (BYT + BYB) / 2; g.add(w);
        return { w, wm, x };
      });
      const labA = label('왼쪽 비커 물', [-BX, 1.75, 0], { size: 12.5, color: 'rgba(40,90,220,.95)' });
      const labB = label('오른쪽 비커 물', [BX, 1.75, 0], { size: 12.5, color: 'rgba(200,50,30,.95)' });

      // 수조 + 금속 컵
      const tank = new THREE.Mesh(new THREE.BoxGeometry(2 * TX, 3.0, 2 * TZ), glass(0xdbeafe, 0.1)); tank.position.y = TYB + 1.5; groupC.add(tank);
      const tankE = new THREE.LineSegments(new THREE.EdgesGeometry(tank.geometry), new THREE.LineBasicMaterial({ color: 0x9cc3ff })); tankE.position.copy(tank.position); groupC.add(tankE);
      const bathM = glass(0x7ab8ff, 0.3); const bath = new THREE.Mesh(new THREE.BoxGeometry(2 * TX - 0.04, TYT - TYB, 2 * TZ - 0.04), bathM); bath.position.y = (TYT + TYB) / 2; groupC.add(bath);
      const cup = new THREE.Group(); groupC.add(cup);
      const metal = mat(0xb8c2cf, { metalness: 0.7, roughness: 0.28, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
      const cupBody = new THREE.Mesh(new THREE.CylinderGeometry(CR, CR, CH, 40, 1, true), metal); cup.add(cupBody);
      const cupBot = new THREE.Mesh(new THREE.CylinderGeometry(CR, CR, 0.07, 40), mat(0x94a3b8, { metalness: 0.7, roughness: 0.3 })); cupBot.position.y = -CH / 2; cup.add(cupBot);
      const cupRim = new THREE.Mesh(new THREE.TorusGeometry(CR, 0.035, 8, 40), mat(0x8b97a8, { metalness: 0.7 })); cupRim.rotation.x = Math.PI / 2; cupRim.position.y = CH / 2; cup.add(cupRim);
      const cupWM = glass(0xff7a5a, 0.34); const cupW = new THREE.Mesh(new THREE.CylinderGeometry(CR - 0.04, CR - 0.04, CWT, 40), cupWM); cupW.position.y = -CH / 2 + 0.04 + CWT / 2; cup.add(cupW);
      const labC = label('', [0, 0, 0], { size: 12.5, color: 'rgba(200,50,30,.95)' });
      const labT = label('', [TX - 0.2, TYT + 0.5, 0], { size: 12.5, color: 'rgba(40,90,220,.95)' });
      const labCup = label('금속 컵(80 °C 물)', cup, { size: 11.5, offset: [0, CH / 2 + 0.55, 0] });
      const labEq = label('열평형!', [0, 3.6, 0], { size: 15, color: 'rgba(22,130,60,.95)' });
      const labTg = label('', [BX, 2.35, 0], { size: 12, color: 'rgba(20,160,88,.95)' });   // 1단계 미션의 초록 목표 (2D의 S.target)
      // 열 이동 화살표 (컵 → 수조)
      const arrow = new THREE.Group(), am = mat(0xffb020, { roughness: 0.4 });
      const ash = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1, 12), am), ahd = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.42, 16), am);
      arrow.add(ash, ahd); groupC.add(arrow);
      const aLab = label('열이 이동해요', [CR + 0.9, 1.9, 0], { size: 11.5 });
      function setArrow(a, b) { const d = new V3().subVectors(b, a), len = d.length(); ash.scale.y = Math.max(0.01, len - 0.42); ash.position.y = (len - 0.42) / 2; ahd.position.y = len - 0.21; arrow.position.copy(a); arrow.quaternion.setFromUnitVectors(Yax, d.normalize()); }

      /* ---- 입자 ---- */
      const NB = 34, NC = 26, NT = 64, N = 2 * NB + NC + NT;
      const P = new THREE.InstancedMesh(new THREE.SphereGeometry(PR, 12, 9), mat(0xffffff, { roughness: 0.35 }), N);
      P.frustumCulled = false; P.instanceMatrix.setUsage(THREE.DynamicDrawUsage); P.castShadow = true; root.add(P);
      for (let i = 0; i < N; i++) P.setColorAt(i, _c.set(0xffffff));
      const A = [];
      function dir() { const b = rnd() * 6.283, c = rnd() * 2 - 1, u = Math.sqrt(1 - c * c); return [Math.cos(b) * u, c, Math.sin(b) * u]; }
      function place(i, k) {   // 영역 안 임의 위치
        let x, y, z;
        if (k === 'A' || k === 'B') { const a = rnd() * 6.283, r = Math.sqrt(rnd()) * (BR - 0.15); x = (k === 'A' ? -BX : BX) + Math.cos(a) * r; z = Math.sin(a) * r; y = BYB + 0.15 + rnd() * (BYT - BYB - 0.3); }
        else if (k === 'C') { const a = rnd() * 6.283, r = Math.sqrt(rnd()) * (CR - 0.15); x = Math.cos(a) * r; z = Math.sin(a) * r; y = cupY() - CH / 2 + 0.2 + rnd() * (CWT - 0.35); }
        else { do { x = (rnd() * 2 - 1) * (TX - 0.15); z = (rnd() * 2 - 1) * (TZ - 0.15); y = TYB + 0.15 + rnd() * (TYT - TYB - 0.3); } while (Math.hypot(x, z) < CR + 0.25 && y > REST - CH / 2 - 0.3); }
        const d = dir(); A[i] = { k, x, y, z, dx: d[0], dy: d[1], dz: d[2], f: 0 };
      }
      let kCup = 0;
      const cupY = () => REST + (1 - kCup) * LIFT;
      function initAll() { let i = 0; for (let j = 0; j < NB; j++) place(i++, 'A'); for (let j = 0; j < NB; j++) place(i++, 'B'); for (let j = 0; j < NC; j++) place(i++, 'C'); for (let j = 0; j < NT; j++) place(i++, 'T'); }
      initAll();

      /* ---- ▶ 재생: 컵 넣기 → 열의 이동 → 열평형 (한 번) ---- */
      const TEQ = TAU_M * Math.log((T_C0 - T_T0) / EQ_TOL), P_IN = 0.08;
      const tOfP = (p) => clamp((p - P_IN) / (1 - P_IN), 0, 1) * T_END;
      const pEq = P_IN + (1 - P_IN) * TEQ / T_END;
      let pmode = false, pP = 0, built = false, sig = '';
      const pl = controls.player({
        duration: 12, loop: true, autoplay: false, label: '컵 넣기 → 열평형',
        phases: [[0, '컵 넣기'], [P_IN, '열의 이동'], [pEq, '열평형']],
        onFrame(p) { if (!built) return; pmode = true; pP = p; },
      });
      built = true;

      /* ---- 지금 보여 줄 상태 ---- */
      const S3 = { scene: 'beakers', TA: 20, TB: 80, k: 0, cupIn: false, Tc: T_C0, Tt: T_T0, t: 0, fromPlayer: false };
      function readState() {
        const l = L2(), E = l && l.EXP, S = l && l.S;
        const lsc = S ? S.scene : 'beakers';
        const key = [lsc, S && S.TBset, E && E.cupIn, E && E.inserting, E && E.run, E && E.done, E && E.drag, E && Math.round(E.t * 10)].join();
        if (key !== sig) { sig = key; if (pmode) { pmode = false; pl.pause(); } }
        if (pmode) {
          const t = tOfP(pP), T = tempsAt(t);
          Object.assign(S3, { scene: 'contact', k: clamp(pP / P_IN, 0, 1), cupIn: pP >= P_IN, Tc: pP >= P_IN ? T[0] : T_C0, Tt: pP >= P_IN ? T[1] : T_T0, t: pP >= P_IN ? t : 0, fromPlayer: true });
        } else {
          Object.assign(S3, { scene: lsc === 'beakers' ? 'beakers' : 'contact', TA: S ? S.TA : 20, TB: S ? S.TB : 80,
            k: E ? E.k : 0, cupIn: !!(E && E.cupIn), Tc: E ? E.Tc : T_C0, Tt: E ? E.Tt : T_T0, t: E ? E.t : 0, fromPlayer: false });
          S3.life = lsc === 'life'; S3.target = S ? S.target : null; S3.zoom = !!(S && S.zoomOn && lsc === 'contact' && S.zoomK > 0.01);
        }
      }

      let lastScene = '', lastTxt = '', lastBlk = -1, lastZoom = false, zoomTo = null;
      const fmt0 = (v) => Math.round(v), fmt1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
      function setInfo(h) { if (h !== lastTxt) { lastTxt = h; info(h); } }

      return {
        update(dt) {
          const h = Math.min(dt, 0.05);
          readState();
          /* '🔍 경계면 확대'(2D 단추)를 따라 컵 벽 가까이로 다가가거나 물러나요 */
          const zm = !!S3.zoom && !S3.fromPlayer && S3.cupIn;   // 컵을 넣은 뒤에만 다가가요
          if (zm !== lastZoom) { lastZoom = zm; zoomTo = zm ? { d: 7.0, tx: CR - 0.1, ty: 0.3 } : { d: 11.5 * (PHN0 ? 1.12 : 1), tx: 0, ty: 0 }; }
          if (zoomTo) { const k = Math.min(1, dt * 4); orbit.dist += (zoomTo.d - orbit.dist) * k; orbit.tx += (zoomTo.tx - orbit.tx) * k; orbit.ty += (zoomTo.ty - orbit.ty) * k; if (Math.abs(zoomTo.d - orbit.dist) < 0.03) zoomTo = null; }
          const beak = S3.scene === 'beakers';
          groupB.visible = beak; groupC.visible = !beak;
          { const pe = document.querySelector('.v3-player'); if (pe) pe.style.display = beak ? 'none' : ''; }   // ▶ 컵 넣기 → 열평형 재생은 열평형 장면에서만
          if (S3.scene !== lastScene) { lastScene = S3.scene; initAll(); }
          // 컵 위치
          const oldY = cupY(); kCup = S3.k; const dy = cupY() - oldY;
          cup.position.y = cupY();
          const eq = !beak && S3.cupIn && S3.Tc - S3.Tt < EQ_TOL;
          const flow = !beak && S3.cupIn && !eq;
          // 온도
          const T = { A: S3.TA, B: S3.TB, C: S3.Tc, T: S3.Tt };
          bw[0].wm.color.copy(colOf(S3.TA)).lerp(new THREE.Color(0xffffff), 0.35); bw[1].wm.color.copy(colOf(S3.TB)).lerp(new THREE.Color(0xffffff), 0.35);
          bathM.color.copy(colOf(S3.Tt)).lerp(new THREE.Color(0xffffff), 0.35); cupWM.color.copy(colOf(S3.Tc)).lerp(new THREE.Color(0xffffff), 0.25);
          // 입자 움직임
          for (let i = 0; i < N; i++) {
            const p = A[i], sp = speedOf(T[p.k]) * (0.85 + 0.3 * ((i * 37) % 10) / 10);
            if (p.k === 'C') p.y += dy;
            p.x += p.dx * sp * h; p.y += p.dy * sp * h; p.z += p.dz * sp * h;
            if (p.k === 'A' || p.k === 'B') {
              const cx = p.k === 'A' ? -BX : BX, rx = p.x - cx, r = Math.hypot(rx, p.z), lim = BR - 0.04 - PR;
              if (r > lim) { const nx = rx / r, nz = p.z / r, vn = p.dx * nx + p.dz * nz; p.x = cx + nx * lim; p.z = nz * lim; if (vn > 0) { p.dx -= 2 * vn * nx; p.dz -= 2 * vn * nz; } }
              if (p.y < BYB + PR) { p.y = BYB + PR; p.dy = Math.abs(p.dy); } if (p.y > BYT - PR) { p.y = BYT - PR; p.dy = -Math.abs(p.dy); }
            } else if (p.k === 'C') {
              const r = Math.hypot(p.x, p.z), lim = CR - 0.06 - PR, cy = cupY();
              if (r > lim) { const nx = p.x / r, nz = p.z / r, vn = p.dx * nx + p.dz * nz; p.x = nx * lim; p.z = nz * lim; if (vn > 0) { p.dx -= 2 * vn * nx; p.dz -= 2 * vn * nz; if (flow) p.f = 0.25; } }
              const lo = cy - CH / 2 + 0.1 + PR, hi = lo + CWT - 0.2;
              if (p.y < lo) { p.y = lo; p.dy = Math.abs(p.dy); } if (p.y > hi) { p.y = hi; p.dy = -Math.abs(p.dy); }
            } else {
              if (p.x < -TX + PR) { p.x = -TX + PR; p.dx = Math.abs(p.dx); } if (p.x > TX - PR) { p.x = TX - PR; p.dx = -Math.abs(p.dx); }
              if (p.z < -TZ + PR) { p.z = -TZ + PR; p.dz = Math.abs(p.dz); } if (p.z > TZ - PR) { p.z = TZ - PR; p.dz = -Math.abs(p.dz); }
              if (p.y < TYB + PR) { p.y = TYB + PR; p.dy = Math.abs(p.dy); } if (p.y > TYT - PR) { p.y = TYT - PR; p.dy = -Math.abs(p.dy); }
              // 컵 바깥에 머물기 (컵 벽에 부딪혀 열을 주고받음)
              const r = Math.hypot(p.x, p.z), cb = cupY() - CH / 2;
              if (r < CR + 0.06 + PR && p.y > cb - 0.05) {
                const nx = r > 1e-3 ? p.x / r : 1, nz = r > 1e-3 ? p.z / r : 0;
                p.x = nx * (CR + 0.06 + PR); p.z = nz * (CR + 0.06 + PR);
                const vn = p.dx * nx + p.dz * nz; if (vn < 0) { p.dx -= 2 * vn * nx; p.dz -= 2 * vn * nz; if (flow) p.f = 0.25; }
              }
            }
            p.f = Math.max(0, p.f - h);
            const vis = beak ? (p.k === 'A' || p.k === 'B') : (p.k === 'C' || p.k === 'T');
            _m.makeScale(vis ? 1 + p.f * 3 : 0, vis ? 1 + p.f * 3 : 0, vis ? 1 + p.f * 3 : 0); _m.setPosition(p.x, p.y, p.z); P.setMatrixAt(i, _m);
            P.setColorAt(i, colOf(T[p.k]));
          }
          P.instanceMatrix.needsUpdate = true; if (P.instanceColor) P.instanceColor.needsUpdate = true;

          // 글자·화살표·안내
          labA.show(beak); labB.show(beak); labCup.show(!beak && !S3.cupIn);
          labC.show(!beak); labT.show(!beak); if (!beak) labTg.show(false);
          if (beak) {
            labA.set('왼쪽 비커 물 ' + fmt0(S3.TA) + ' °C'); labB.set('오른쪽 비커 물 ' + fmt0(S3.TB) + ' °C');
            const tg = !S3.fromPlayer && S3.target; labTg.show(!!tg);
            if (tg) labTg.set('🎯 초록 목표 ' + fmt0(Math.max(0, tg.lo)) + '~' + fmt0(Math.min(100, tg.hi)) + ' °C' + (S3.TB >= tg.lo - 0.5 && S3.TB <= tg.hi + 0.5 ? ' ✔' : ''));
            arrow.visible = false; aLab.show(false); labEq.show(false);
            setInfo('<b>온도와 입자</b>: 온도가 높을수록 입자 운동이 <b>활발</b>해요(빨강 = 빠름, 파랑 = 느림). 입자의 크기와 개수는 그대로예요.<br>오른쪽 비커 물의 온도는 옆의 🌡️ 슬라이더로 바꿔요. (왼쪽 ' + fmt0(S3.TA) + ' °C · 오른쪽 ' + fmt0(S3.TB) + ' °C)');
          } else {
            labC.obj = [0, cupY() + CH / 2 + 0.45, 0]; labC.set('컵 속 물 ' + fmt1(S3.Tc) + ' °C'); labT.set('수조 물 ' + fmt1(S3.Tt) + ' °C');
            
            arrow.visible = flow; aLab.show(flow); labEq.show(eq);
            if (flow) setArrow(new V3(CR + 0.15, 1.5, 0), new V3(CR + 1.35, 1.5, 0));
            let txt;
            if (eq) txt = '두 물의 온도가 <b>' + fmt0(T_EQ) + ' °C</b>로 같아졌어요: <b>열평형</b>!<br>입자는 계속 움직이지만 열이 한쪽으로 이동하지 않아 열의 이동이 멈춘 것처럼 보여요.';
            else if (S3.cupIn) txt = '열은 온도가 <b>높은 컵 속 물 → 낮은 수조 물</b>로 이동해요. 컵 속 물은 온도가 내려가고 수조 물은 올라가요.<br>경계(컵 벽)에서 빠른 입자와 느린 입자가 부딪혀 운동을 전달해요. · 지난 시간 ' + fmt1(S3.t) + '분';
            else txt = '<b>' + T_C0 + ' °C</b> 물이 든 금속 컵을 <b>' + T_T0 + ' °C</b> 물이 든 수조에 넣어요.<br>옆의 🥤 컵 넣기 버튼이나 ▶ 재생을 눌러 보세요.';
            setInfo(txt);
          }
        },
        sync() {},
      };
    },
  });
})();
