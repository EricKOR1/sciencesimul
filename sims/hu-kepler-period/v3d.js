/* hu-kepler-period · 3D 목성의 갈릴레이 위성과 케플러 제3법칙
   목성에서 멀리 있는 위성일수록 한 바퀴 도는 데 오래 걸려요. 이오(1.77일) · 에우로파(3.55일) · 가니메데(7.16일) · 칼리스토(16.7일)의 궤도 반지름 a와 공전 주기 T는
   a³ / T² 값이 모두 거의 같아요(케플러 제3법칙 T² ∝ a³, 중심 천체가 같을 때).  a는 10⁵ km, T는 일 단위예요.
   목성 크기는 과장해서 그렸고, 시간은 빠르게 돌려요(1일 ≈ 0.7초). 2D 실험의 위성 자료(MOONS)를 그대로 써요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const TAU = Math.PI * 2, K = 0.28;                                 // 10⁵ km 당 장면 길이
  const MOONS = [
    { n: '이오', T: 1.769, a: 4.22, c: 0xf5d547, ph: 0.7 }, { n: '에우로파', T: 3.551, a: 6.71, c: 0xe9e2d4, ph: 2.3 },
    { n: '가니메데', T: 7.155, a: 10.70, c: 0xc9bfb0, ph: 3.8 }, { n: '칼리스토', T: 16.69, a: 18.83, c: 0x8d8478, ph: 5.4 },
  ];
  const OC = [0xfacc15, 0x38bdf8, 0x4ade80, 0xa78bfa];

  window.SciSim3D.attach({
    title: '목성과 위성들 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    levels: [2],
    camera: { dist: PHONE ? 14 : 10.5, theta: 0.5, phi: 1.08, min: 4, max: 24 },
    autoRotate: 0,
    build(ctx) {
      const { THREE, scene, root, label, info, controls, orbit } = ctx;
      const st = { sel: -1, P: 0, trails: true, key: '' };
      const DCYC = 50.07, NREV = [28, 14, 7, 3];                      // 한 반복 = 약 50일: 이오 28바퀴 · 에우로파 14 · 가니메데 7 · 칼리스토 3 (실제 주기와 1 % 안팎으로 같아요)
      const sr = () => { try { return window.__sim && window.__sim.S; } catch (e) { return null; } };

      /* 빛: 태양은 +x 쪽 */
      scene.add(new THREE.AmbientLight(0x6f7fb0, 0.35));
      const sunL = new THREE.DirectionalLight(0xfff4e0, 2.6); sunL.position.set(20, 6, 8); scene.add(sunL);
      { let seed = 13; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; const pos = [];
        for (let i = 0; i < 380; i++) { const u = rnd() * 2 - 1, a = rnd() * TAU, r = Math.sqrt(1 - u * u); pos.push(Math.cos(a) * r * 60, u * 60, Math.sin(a) * r * 60); }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        root.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xaec3ff, size: 1.5, sizeAttenuation: false, transparent: true, opacity: 0.5 }))); }

      /* 목성: 줄무늬 */
      const jt = (() => { const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d');
        const bands = ['#d9b48a', '#b5845a', '#e8cfa6', '#a86f48', '#e3c096', '#c08c62', '#efd9b4', '#b27a50', '#dcb88d', '#c9996c', '#e6cba2', '#a9764e', '#d7b088'];
        const h = 256 / bands.length; bands.forEach((b, i) => { g.fillStyle = b; g.fillRect(0, i * h, 512, h + 1); });
        let seed = 5; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
        for (let i = 0; i < 260; i++) { g.fillStyle = 'rgba(255,255,255,' + (0.04 + rnd() * 0.06) + ')'; g.beginPath(); g.ellipse(rnd() * 512, rnd() * 256, 10 + rnd() * 30, 1 + rnd() * 2.5, 0, 0, 7); g.fill(); }
        g.fillStyle = '#c4553a'; g.beginPath(); g.ellipse(330, 160, 26, 14, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(255,200,160,.5)'; g.beginPath(); g.ellipse(330, 160, 14, 7, 0, 0, 7); g.fill();
        const t = new THREE.CanvasTexture(c); if ('encoding' in t) t.encoding = THREE.sRGBEncoding; return t; })();
      const jup = new THREE.Mesh(new THREE.SphereGeometry(0.7, 64, 48), new THREE.MeshStandardMaterial({ map: jt, roughness: 0.85 })); jup.rotation.z = 0.05; root.add(jup);
      label('목성', jup, { offset: [0, 1.05, 0] });

      /* 위성 · 궤도 · 자취 */
      const bodies = MOONS.map((m, i) => {
        const r = m.a * K;
        const pts = []; for (let k = 0; k < 120; k++) { const a = k / 120 * TAU; pts.push(new THREE.Vector3(r * Math.cos(a), 0, r * Math.sin(a))); }
        const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 160, 0.012, 6, true), new THREE.MeshBasicMaterial({ color: OC[i], transparent: true, opacity: 0.7 })); root.add(tube);
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.15 + (i === 2 ? 0.03 : 0) + (i === 3 ? 0.02 : 0), 32, 24), new THREE.MeshStandardMaterial({ color: m.c, roughness: 0.8 })); root.add(mesh);
        const lb = label(m.n, mesh, { offset: [0, 0.4, 0], size: 11.5, color: 'rgba(15,25,60,.9)' });
        /* 지나간 자취 (최근 위치 점) */
        const tr = []; const dg = new THREE.SphereGeometry(0.03, 6, 5), dmM = new THREE.MeshBasicMaterial({ color: OC[i], transparent: true, opacity: 0.8 });
        for (let k = 0; k < 14; k++) { const d = new THREE.Mesh(dg, dmM); root.add(d); tr.push(d); }
        return { m, r, tube, mesh, lb, tr };
      });

      function text() {
        const ct = cardText(); if (ct) { info(ct); return; }
        const q = window.__sim || {}, S = q.S || {}, ratio = S.view === 'meaning' || S.view === 'all' || !!(S.flags && S.flags.calcK) || !!(q.game && q.game.free);
        const L = bodies.map((b, i) => (st.sel === -1 || st.sel === i ? b.m.n + ' ' + (b.m.a ** 3 / b.m.T ** 2).toFixed(1) : null)).filter(Boolean);
        if (st.sel === -1) info('<b>멀수록 오래 걸려요</b> (T: 이오 1.77일 → 칼리스토 16.7일)' + (ratio ? '<br>a³/T² 값: ' + L.join(' · ') + '<br>→ 모두 <b>거의 같아요</b> (T² ∝ a³)' : '<br>위성마다 a(10⁵ km)와 T(일)가 달라요. 옆에서 a³/T²을 직접 계산해 봐요.'));
        else { const b = bodies[st.sel].m; info('<b>' + b.n + '</b> · a = ' + b.a + ' ×10⁵ km, T = ' + b.T + '일' + (ratio ? '<br>a³/T² = ' + (b.a ** 3 / b.T ** 2).toFixed(1) + '<br>다른 위성도 같은 값이에요 → <b>케플러 제3법칙</b>' : '')); }
      }
      const items = [{ value: -1, label: '전체' }].concat(MOONS.map((m, i) => ({ value: i, label: m.n })));
      const seg = controls.segment('위성', items, -1, (v) => { st.sel = +v; apply(); });
      /* ▶ 재생: 위성들이 목성 둘레를 돌아요 (1일 ≈ 0.7초). 안쪽 위성일수록 빨리 돌아요 */
      const player = controls.player({
        duration: 36, loop: true, autoplay: true, label: '재생',
        phases: [[0, '이오·에우로파·가니메데·칼리스토가 공전']],
        onFrame(p) { st.P = p; },
      });
      controls.button('👁 옆에서(지구에서 본 모습)', () => { orbit.phi = Math.PI / 2 - 0.02; orbit.theta = 0.0; });
      controls.button('⬇ 위에서', () => { orbit.phi = 0.35; });
      /* 법칙의 의미 단계: 카드 8장을 3D 막대의 단추로 고르고 상자에 넣어요 (2D 카드 분류기 cK를 그대로 써서 미션 진행이 같아요) */
      const BIN = ['☀ 태양 둘레', '🟤 목성 둘레', '🌍 지구 둘레'];
      const fmtV = (v) => { if (v >= 100) { const e = Math.floor(Math.log10(v)), m = v / Math.pow(10, e); return m.toFixed(1) + '×10' + String(e).split('').map((d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[+d]).join(''); } return v >= 1 ? v.toFixed(1) : v.toFixed(3); };
      const cardEls = [controls.text('카드')];
      const pickCard = (d) => { const c = window.__sim && window.__sim.cK; if (!c) return; const n = c.items.length; c.sel = c.sel < 0 ? (d > 0 ? 0 : n - 1) : (c.sel + d + n) % n; text(); };
      cardEls.push(controls.button('◀', () => pickCard(-1)), controls.button('▶', () => pickCard(1)));
      BIN.forEach((nm, b) => cardEls.push(controls.button(nm, () => {
        const c = window.__sim && window.__sim.cK; if (!c || c.sel < 0) return;
        const it = c.items[c.sel]; c.place(it, b);
        const nx = c.items.findIndex((x) => x.loc == null); c.sel = nx; text();
      })));
      let cardMode = null;
      const cardsOn = () => { const S = sr(); return !!(S && S.view === 'meaning' && !(S.flags && S.flags.calcMass)); };   // 질량 계산 미션에서는 숨겨요
      function cardRow() { const on = cardsOn(); if (on === cardMode) return; cardMode = on; cardEls.forEach((e) => { e.style.display = on ? '' : 'none'; }); text(); }
      function cardText() {
        const q = window.__sim, c = q && q.cK, S = q && q.S; if (!c || !S || !cardsOn() || c.sel < 0 || !c.items[c.sel]) return null;
        const it = c.items[c.sel], v = it.a * it.a * it.a / (it.T * it.T), placed = c.items.filter((x) => x.loc != null).length;
        return '<b>카드 ' + (c.sel + 1) + ' / ' + c.items.length + ': ' + it.label + '</b> · a = ' + (it.a >= 1e4 ? fmtV(it.a) : it.a) + ' (10⁵ km), T = ' + it.T + '일<br>a³ / T² = <b>' + fmtV(v) + '</b> (10⁵ km³/일²)' + (it.loc != null ? ' · 지금 상자: ' + BIN[it.loc] : '') + '<br>같은 값의 상자 단추를 눌러 넣어요 · 넣은 카드 ' + placed + ' / ' + c.items.length;
      }
      function apply() { bodies.forEach((b, i) => { const on = st.sel === -1 || st.sel === i; b.tube.material.opacity = on ? 0.85 : 0.18; b.lb.show(true); b.mesh.scale.setScalar(on ? 1 : 0.8); }); text(); }
      { const S = sr(); if (S && S.pl >= 0 && S.pl <= 3 && S.view === 'scope') { /* 2D에서 고른 위성이 있으면 강조하지 않아요(전체로 시작) */ } }
      apply();

      return {
        update(dt) {
          { const S = sr(), q = window.__sim, k = S ? S.view + (S.flags && S.flags.calcK ? 1 : 0) + (q && q.game && q.game.free ? 1 : 0) : ''; if (k !== st.key) { st.key = k; text(); } cardRow(); const c = window.__sim && window.__sim.cK, ck = c ? c.sel + ':' + c.items.map((x) => x.loc).join(',') : ''; if (ck !== st.ck) { st.ck = ck; text(); } }
          jup.rotation.y = st.P * TAU * 5;
          bodies.forEach((b, bi) => {
            const ang = TAU * NREV[bi] * st.P + b.m.ph; b.mesh.position.set(b.r * Math.cos(ang), 0, -b.r * Math.sin(ang));
            b.tr.forEach((p, k) => { const a2 = ang - (k + 1) * 0.12 * (b.m.T < 5 ? 1 : 0.5) * 1.0; p.position.set(b.r * Math.cos(a2), 0, -b.r * Math.sin(a2)); p.scale.setScalar(1 - k / 16); p.visible = st.trails; });
          });
        },
        sync() {},
      };
    },
  });
})();
