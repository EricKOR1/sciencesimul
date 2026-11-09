/* m1-diffusion · 3D 확산과 증발
   2D 차시와 같은 장면: 잉크(물 20 °C) · 향수(교실 공기) · 찬물 10 °C와 뜨거운 물 60 °C에 동시에 잉크 · 빨래의 증발(온도·바람·습도·널기 조건).
   2D 상태(window.__sim)를 읽어 따라가요 — 잉크·향수·증발 조건은 오른쪽 조작판에서 바꿔요. (사례 분류 카드는 4단계 2D 화면) ▶ 재생은 퍼지는(증발하는) 과정을 한 번 보여 주고 반복해요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN0 = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  window.SciSim3D.attach({
    title: '확산과 증발 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    levels: [0, 1, 2],   // 잉크 · 향수 · 온도 · 증발은 3D, 사례 카드 분류(4단계)는 2D
    camera: { dist: 10.5 * (PHN0 ? 1.1 : 1), theta: 0.18, phi: 1.25, fov: 45, target: [0, -0.2, 0], min: 5, max: 26 },
    autoRotate: 0.05,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0.05 }, o || {}));
      const glass = (c, op, o) => mat(c || 0xbfe3ff, Object.assign({ transparent: true, opacity: op || 0.16, roughness: 0.12, metalness: 0, depthWrite: false, side: THREE.DoubleSide }, o || {}));
      const rnd = (() => { let s = 12345; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
      const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(6.2832 * rnd());
      const _m = new THREE.Matrix4(), _c = new THREE.Color();
      const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
      const L2 = () => (ctx.lesson && ctx.lesson()) || null;
      function spheres(N, r, color, seg) {
        const m = new THREE.InstancedMesh(new THREE.SphereGeometry(r, seg || 12, 9), mat(color, { roughness: 0.55, metalness: 0 }), N);
        m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; m.castShadow = true;
        for (let i = 0; i < N; i++) m.setColorAt(i, _c.set(0xffffff));
        root.add(m); return m;
      }
      const put = (m, i, x, y, z, s) => { _m.makeScale(s, s, s); _m.setPosition(x, y, z); m.setMatrixAt(i, _m); };
      const fold = (x, lo, hi) => { const w = hi - lo, y = (((x - lo) % (2 * w)) + 2 * w) % (2 * w); return lo + (y > w ? 2 * w - y : y); };
      const smooth = (a, b, x) => { const q = clamp((x - a) / (b - a), 0, 1); return q * q * (3 - 2 * q); };

      /* ---- 확산 상자(물/공기) 두 개: 위(뜨거운 물 · 한 개짜리 장면에서는 하나) / 아래 ---- */
      const NI = 110, PR = 0.1;
      function makeBox(color) {
        const g = new THREE.Group();
        const geo = new THREE.BoxGeometry(2, 2, 2);
        g.add(new THREE.Mesh(geo, glass(0xbfe0ff, 0.1)));
        g.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0x9cc3ff })));
        const w = new THREE.Mesh(new THREE.BoxGeometry(1.98, 1.8, 1.98), glass(color || 0x4aa8ff, 0.22, { side: THREE.FrontSide })); w.position.y = -0.1; g.add(w);
        g.userData.water = w; root.add(g); return g;
      }
      const boxes = [makeBox(), makeBox(0xff9a7a)];
      const pool = spheres(2 * NI, PR, 0xffffff, 12);
      const GP = [];
      for (let i = 0; i < 2 * NI; i++) GP.push({ g: [gauss(), gauss(), gauss()], ph: [rnd() * 6.28, rnd() * 6.28, rnd() * 6.28], o: [(rnd() - 0.5) * 0.5, (rnd() - 0.5) * 0.4, (rnd() - 0.5) * 0.5] });
      const NB = 14, bars = [];
      for (let i = 0; i < NB; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.5), mat(0x8b5cf6, { roughness: 0.45 })); root.add(b); bars.push(b); }
      const base = new THREE.Mesh(new THREE.BoxGeometry(1, 0.06, 0.7), mat(0x64748b)); root.add(base);
      const drop = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 16), mat(0x7c3aed)); drop.rotation.x = Math.PI; root.add(drop);
      const dropLab = label('', drop, { size: 12, offset: [0, 0.6, 0] });
      /* 스포이트 · 향수병 이름표를 누르면 2D에서 스포이트 · 향수병을 누른 것과 같아요 */
      dropLab.tap(() => { const L = L2(); const b = document.getElementById(L && L.scene === 'perfume' ? 'sprayBtn' : 'dropBtn'); if (b && !b.disabled) b.click(); });
      const friendLab = label('', [0, 0, 0], { size: 12.5, color: 'rgba(190,24,93,.92)' }); friendLab.show(false);   // 향수: 교실 반대편 친구 (2D와 같은 자리)
      const barLab = label('칸마다 입자 수', [0, -2.3, 1.7], { size: 11, offset: [0, 0, 0] });
      const boxLab = [label('', [0, 0, 0], { size: 12.5, color: 'rgba(200,50,30,.92)' }), label('', [0, 0, 0], { size: 12.5, color: 'rgba(40,90,220,.92)' })];

      /* ---- 증발: 컵 속 물 (표면의 입자가 기체로) ---- */
      const EW = 1.5, EH = 2.0, NL = 100, NE = 36;
      const evBox = new THREE.Group();
      { const geo = new THREE.BoxGeometry(2 * EW, 2 * EH, 2 * EW);
        evBox.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0x9cc3ff })));
        const liq = new THREE.Mesh(new THREE.BoxGeometry(2 * EW - 0.04, 1.7, 2 * EW - 0.04), glass(0x4aa8ff, 0.2, { side: THREE.FrontSide })); liq.position.y = -EH + 0.85; evBox.add(liq); evBox.userData.liq = liq; }
      root.add(evBox);
      const evL = spheres(NL, 0.12, 0x4aa8ff, 12), evG = spheres(NE, 0.1, 0xbfe6ff, 10);
      const evLab = label('', [0, EH + 0.45, 0], { size: 13, color: 'rgba(30,64,175,.92)' });
      const evLab2 = label('액체 표면 → 기체', [EW + 0.2, 0.2, 0], { size: 11.5, offset: [0.3, 0, 0] });
      const LAT = []; { let n = 0; for (let a = 0; a < 5; a++) for (let b = 0; b < 4; b++) for (let c = 0; c < 5; c++) { if (n++ < NL) LAT.push([(a - 2) * 0.55, -EH + 0.3 + b * 0.38 + (c % 2) * 0.05, (c - 2) * 0.55]); } }
      const ESC = []; for (let j = 0; j < NE; j++) ESC.push({ x: (rnd() * 2 - 1) * (EW - 0.3), z: (rnd() * 2 - 1) * (EW - 0.3), dx: rnd() * 6.28, dz: rnd() * 6.28, v: 0.8 + 0.4 * rnd() });

      /* ---- ▶ 재생: 한 번 퍼지는(증발하는) 과정 반복. 2D 조작이 바뀌면 2D를 따라가요 ---- */
      const TD = 16;
      let pmode = false, built = false, pP = 0, sig = '';
      const pl = controls.player({
        duration: TD, loop: true, autoplay: false, label: '재생',
        phases: [[0, '']],
        onFrame(p) { if (!built) return; pmode = true; pP = p; },
      });
      built = true;
      const phEl = () => document.querySelector('.v3-player .v3-ph');

      const SC = {
        ink: { med: 'ink', m: 1.05, color: 0x7c3aed, T: [20] },
        perfume: { med: 'air', m: 2.6, color: 0xff7ab8, T: [20] },
        temp: { med: 'ink', m: 1.05, color: 0x7c3aed, T: [60, 10] },
      };
      const spdT = (T) => 0.4 + 0.012 * T;
      const dims = { ink: [3.2, 1.5, 1.2], perfume: [3.2, 1.5, 1.2], temp: [3.2, 0.62, 0.9] };
      let scene = 'ink', clk = 0, lastDrop = false, lastT = 0, st = null;
      const cond = { temp: false, wind: false, dry: false, spread: false };
      let lastTxt = ''; const setInfo = (h) => { if (h !== lastTxt) { lastTxt = h; info(h); } };

      function diffusionFrame(sc, t, lessonDropped) {
        const S = SC[sc], n = S.T.length;
        const [LX, LY, LZ] = dims[sc];
        boxes.forEach((b, k) => { b.visible = k < n; b.scale.set(LX, LY, LZ); b.position.set(0, n === 1 ? 0 : (k === 0 ? 1.55 : -1.55), 0); b.userData.water.visible = S.med === 'ink'; });
        boxes[0].userData.water.material.color.setHex(sc === 'temp' ? 0xff9a7a : 0x4aa8ff);
        const fade = pmode ? smooth(0, 0.04, pP) * (1 - smooth(0.96, 1, pP)) : 1;
        const counts = new Array(NB).fill(0);
        for (let i = 0; i < 2 * NI; i++) {
          const k = i < NI ? 0 : 1;
          if (k >= n) { put(pool, i, 0, 0, 0, 0); continue; }
          const gp = GP[i], cy = n === 1 ? 0 : (k === 0 ? 1.55 : -1.55), sp = S.m * (sc === 'temp' ? spdT(S.T[k]) / 0.64 : 1);
          const s = Math.sqrt(Math.max(0, t)), sx = -LX + 0.45, sy = LY - 0.3;
          const w = 0.05 + 0.03 * Math.min(1, t);       // 입자가 쉬지 않고 떨려요
          let x = sx + gp.o[0] + gp.g[0] * sp * s + Math.sin(t * 5 + gp.ph[0]) * w;
          let y = sy + gp.o[1] + gp.g[1] * sp * s * 0.9 + Math.sin(t * 5.5 + gp.ph[1]) * w;
          let z = gp.o[2] + gp.g[2] * sp * s * 0.8 + Math.sin(t * 4.5 + gp.ph[2]) * w;
          x = fold(x, -LX + PR, LX - PR); y = fold(y, -LY + PR, LY - PR); z = fold(z, -LZ + PR, LZ - PR);
          put(pool, i, x, cy + y, z, fade);
          if (k === 0) counts[Math.min(NB - 1, Math.floor((x + LX) / (2 * LX) * NB))]++;
          pool.setColorAt(i, _c.set(sc === 'temp' ? (k === 0 ? 0xe0563a : 0x4d7cff) : S.color));
        }
        pool.instanceMatrix.needsUpdate = true; pool.instanceColor.needsUpdate = true;
        const showBars = sc !== 'temp';
        bars.forEach((b, i) => { b.visible = showBars; const bw = 2 * LX / NB, hh = Math.max(0.02, counts[i] / NI * 3.2); b.scale.set(bw * 0.78, hh, 1); b.position.set(-LX + bw * (i + 0.5), -LY - 0.4 + hh / 2 + 0.03, LZ + 0.9); b.material.color.setHex(S.color); });
        base.visible = showBars; base.scale.x = 2 * LX + 0.3; base.position.set(0, -LY - 0.43, LZ + 0.9);
        barLab.show(showBars); barLab.obj = [0, -LY - 0.4, LZ + 0.9]; barLab.off = [0, -0.55, 0];
        drop.visible = sc !== 'temp'; drop.position.set(-LX + 0.45, LY + 0.5, 0); drop.material.color.setHex(S.color);
        dropLab.show(sc !== 'temp'); dropLab.set(sc === 'ink' ? '잉크 한 방울' : '향수병');
        friendLab.show(sc === 'perfume'); friendLab.obj = [LX - 0.2, -LY + 0.35, 0]; friendLab.set(st && st.arrived >= 3 ? '🙂 반대편 친구: 향기가 나요!' : '🙂 반대편 친구');
        boxLab.forEach((l, k) => { l.show(sc === 'temp'); l.obj = [LX - 0.1, (k === 0 ? 1.55 : -1.55) + LY + 0.15, 0]; l.off = [-0.2, 0, 0]; });
        boxLab[0].set('뜨거운 물 60 °C'); boxLab[1].set('찬물 10 °C');
      }

      function evapFrame(t, wetK, rateK, running) {
        const rate = 1.2 * rateK, P = NE / rate;
        evBox.visible = true;
        const nLiq = Math.ceil(NL * (0.12 + 0.88 * wetK)), sp = 0.7 + 0.5 * (rateK - 1) * 0.3;
        const surfY = -EH + 0.3 + 0.38 * 3 + 0.35;
        for (let i = 0; i < NL; i++) {
          const o = LAT[i], j = Math.sin(t * 4 * sp + i) * 0.07;
          put(evL, i, o[0] + j, o[1] + Math.cos(t * 4.3 * sp + i * 1.7) * 0.07, o[2] + Math.sin(t * 3.7 * sp + i * 0.7) * 0.07, i < nLiq ? 1 : 0);
        }
        for (let j = 0; j < NE; j++) {
          const e = ESC[j], u = (((t / P + j / NE) % 1) + 1) % 1;
          const a = smooth(0, 0.1, u) * (1 - smooth(0.88, 1, u));
          const y = surfY + smooth(0.05, 0.92, u) * (EH - surfY - 0.2) + Math.sin(t * 6 + j) * 0.05;
          put(evG, j, e.x + Math.sin(u * 9 + e.dx) * 0.25, y, e.z + Math.sin(u * 8 + e.dz) * 0.25, running && wetK > 0.05 ? a : 0);
        }
        evL.instanceMatrix.needsUpdate = true; evG.instanceMatrix.needsUpdate = true;
        evBox.userData.liq.scale.y = 0.15 + 0.85 * wetK; evBox.userData.liq.position.y = -EH + 0.85 * (0.15 + 0.85 * wetK);
      }

      function show(vis) { // 장면별 그룹 보이기
        const diff = vis !== 'laundry';
        if (diff) evBox.visible = false;
        evL.visible = evG.visible = !diff; pool.visible = diff; evLab.show(!diff); evLab2.show(!diff);
        if (!diff) { boxes.forEach((b) => { b.visible = false; }); bars.forEach((b) => { b.visible = false; }); base.visible = false; drop.visible = false; dropLab.show(false); barLab.show(false); boxLab.forEach((l) => l.show(false)); }
        evBox.visible = !diff;
      }

      let tick = 0;
      return {
        update(dt) {
          const l = L2(); tick += dt;
          if (l && tick > 0.12) { tick = 0; try { st = l.state(); } catch (e) { st = null; } }
          const ls = l && l.scene;
          let sc = ls && ls !== 'sort' ? ls : scene;
          const dropped = !st ? false : sc === 'ink' ? !!st.inkDropped : sc === 'perfume' ? !!st.sprayed : sc === 'temp' ? !!st.tpDropped : false;
          const cnd = st && st.ld ? st.ld.cond : cond;
          const key = [sc, dropped, cnd.temp, cnd.wind, cnd.dry, cnd.spread, st && st.ld && st.ld.state].join();
          if (key !== sig) { sig = key; if (pmode) { pmode = false; pl.pause(); } }
          if (sc !== scene) { scene = sc; clk = 0; }
          if (dropped && !lastDrop) clk = 0;
          lastDrop = dropped;
          const h = Math.min(dt, 0.05);
          if (!pmode && dropped) clk += h; else if (!pmode && !dropped && sc !== 'laundry') clk = 0;
          if (sc === 'laundry') { if (!pmode) clk += h; }
          const ph = phEl(); if (ph) ph.textContent = pmode ? (sc === 'laundry' ? '증발' : (pP < 0.1 ? '떨어뜨리기' : pP < 0.6 ? '퍼지는 중' : '골고루')) : '';
          show(sc);
          const tm = pmode ? pP * TD : clk;
          if (sc === 'laundry') {
            const wet = pmode ? 1 : (st && st.ld ? st.ld.wet : 1);
            const rateK = (cnd.temp ? 1.7 : 1) * (cnd.wind ? 1.5 : 1) * (cnd.dry ? 1.5 : 1) * (cnd.spread ? 1.8 : 1);
            const running = true;
            // ▶ 재생은 한 주기가 정수 번의 증발이 되도록 시간을 맞춰요
            const P = NE / (1.2 * rateK);
            evapFrame(pmode ? pP * P : clk, wet, rateK, running);
            evLab.set('빨래 속 물의 표면');
            setInfo('<b>증발</b>: 액체 <b>표면</b>의 입자가 스스로 운동해 공기 중으로 날아가요. 물이 끓지 않는 낮은 온도에서도 일어나요.<br>조건: 온도 ' + (cnd.temp ? '30' : '10') + ' °C · 바람 ' + (cnd.wind ? '있음' : '없음') + ' · 습도 ' + (cnd.dry ? '30' : '85') + ' % · ' + (cnd.spread ? '펼쳐서 널기' : '접어서 널기') + ' — 조건이 좋을수록(따뜻하고·바람이 불고·건조하고·넓게 펼치면) 더 많이 날아가요. 조건은 옆의 조작판에서 바꿔요.');
          } else if (sc === 'sort' || !SC[sc]) {
            diffusionFrame('ink', 0, false);
          } else {
            diffusionFrame(sc, tm, dropped);
            const S = SC[sc];
            let txt;
            if (sc === 'ink') txt = '<b>확산</b>: 잉크 입자는 스스로 쉬지 않고 움직여서, 많은 곳에서 적은 곳으로 저절로 골고루 퍼져요 (물 20 °C). 막대는 칸마다 들어 있는 입자 수예요.';
            else if (sc === 'perfume') txt = '<b>확산</b>: 향수 입자도 스스로 움직여 교실 공기 속으로 골고루 퍼져요. 기체 속에서는 액체보다 훨씬 빨리 퍼져요.';
            else txt = '<b>온도와 확산</b>: 10 °C 찬물과 60 °C 뜨거운 물에 동시에 잉크를 떨어뜨렸어요. 온도가 높을수록 입자 운동이 활발해 <b>더 빨리</b> 퍼져요.';
            if (!dropped && !pmode) txt += '<br>' + (sc === 'ink' ? '옆의 💧 잉크 한 방울 떨어뜨리기를 눌러 보세요.' : sc === 'perfume' ? '옆의 🌸 향수 뿌리기를 눌러 보세요.' : '옆의 💧 두 비커에 동시에 떨어뜨리기를 눌러 보세요.');
            setInfo(txt);
          }
          if (ls === 'sort') setInfo('<b>확산과 증발</b>은 모두 입자가 <b>스스로 끊임없이 운동</b>하기 때문에 일어나요.');
        },
        sync() {},
      };
    },
  });
})();
