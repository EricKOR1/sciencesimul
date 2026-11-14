/* he-hr-diagram · 3D H-R도 별밭
   가로는 표면 온도(왼쪽이 뜨거워요), 세로는 광도예요. 별 하나하나를 반지름에 비례한 크기와 온도에 맞는 색으로 세웠어요.
   '지름 같은 선'은 L ∝ R²T⁴ 에서 반지름이 같은 별들을 이은 선이에요. '개수 막대'로 바꾸면 우리 둘레에 어떤 별이 많은지 막대 높이로 볼 수 있어요.
   2D 차시와 같은 별 20개(이름·분광형·온도·광도)와 같은 개수 막대(내가 그린 20개 / 태양 근처 100개)를 쓰고, 3단계에서는 질량 0.5~20 M☉ 주계열성의 위치를 봐요. (예시 자료) */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  function kelvin(K) { const t = clamp(K, 1500, 40000) / 100; const r = t <= 66 ? 255 : 329.7 * Math.pow(t - 60, -0.1332), g = t <= 66 ? 99.47 * Math.log(t) - 161.1 : 288.1 * Math.pow(t - 60, -0.0755), b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5 * Math.log(t - 10) - 305; return [clamp(r, 0, 255) / 255, clamp(g, 0, 255) / 255, clamp(b, 0, 255) / 255]; }
  const LT0 = 4.7, LT1 = 3.4, LL0 = -4.6, LL1 = 6.4, BW = 8.4, BH = 5.4;
  const bx = (lt) => (LT0 - lt) / (LT0 - LT1) * BW - BW / 2, by = (ll) => (ll - LL0) / (LL1 - LL0) * BH;
  const GRP = { ms: '주계열성', gi: '거성', sg: '초거성', wd: '백색 왜성' };

  window.SciSim3D.attach({
    title: 'H-R도 별밭 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    levels: [3],               // 0~2단계(카드 짝짓기 · H-R도 찍기 · 깜박이는 별 읽기)는 2D 화면에서 해요
    camera: { dist: PHONE ? 15 : 11.5, theta: 0.35, phi: 1.3, min: 5, max: 26, target: [0, 2.6, 0] },
    autoRotate: 0,
    build(ctx) {
      if (ctx.THREE.ColorManagement) ctx.THREE.ColorManagement.legacyMode = false;     // 색을 보이는 그대로(sRGB) 쓰도록 맞춰요
      const { THREE, root, label, info, controls } = ctx;
      /* 미션 보조 판: 미션이 말하는 표·기록·카드를 3D 화면 구석에 작게 보여 줘요 (2D 상태를 그대로 읽어요) */
      const mxBox = (pos) => {
        const v = ctx.renderer.domElement.parentElement;
        if (!document.getElementById('mx3d-css')) { const s = document.createElement('style'); s.id = 'mx3d-css'; s.textContent =
          '.mx3d{position:absolute;z-index:3;padding:6px 8px;border-radius:12px;background:rgba(8,12,24,.8);color:#fff;font-size:12px;line-height:1.35;pointer-events:none;max-width:48%;box-shadow:0 4px 14px rgba(0,0,0,.35)}.mx3d:empty{display:none}' +
          '.mx3d.tr{right:10px;top:10px}.mx3d.br{right:10px;bottom:34px}.mx3d.bl{left:10px;bottom:10px}.mx3d .h{font-weight:900;margin-bottom:3px}' +
          '.mx3d table{border-collapse:collapse}.mx3d th,.mx3d td{padding:1px 5px;text-align:center;white-space:nowrap}.mx3d th{color:#b9c6e4;font-weight:800}.mx3d td:first-child,.mx3d th:first-child{text-align:left}' +
          '.mx3d .on{color:#ffd34d;font-weight:800}.mx3d .ok{color:#7ee2a8;font-weight:800}.mx3d .no{color:#ff9a9a;font-weight:800}.mx3d .dim{color:#8d99b3}.mx3d tr.sel td{background:rgba(255,211,77,.16)}' +
          '@media (max-width:599px){.mx3d{font-size:10.5px;padding:4px 6px;max-width:60%}.mx3d.tr{top:auto;bottom:30px}.mx3d th,.mx3d td{padding:0 3px}}';
          document.head.appendChild(s); }
        const el = document.createElement('div'); el.className = 'mx3d ' + (pos || 'tr'); v.appendChild(el);
        let last = ''; el.put = (h) => { if (h !== last) { last = h; el.innerHTML = h; } }; return el;
      };
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.6, metalness: 0 }, o || {}));
      /* 2D와 같은 별 20개 (이름 · 분광형 · 온도 · 광도) */
      const L2 = () => ctx.lesson();
      const SDF = [['리겔', 'B8', 12100, 1.2e5], ['데네브', 'A2', 8500, 2e5], ['안타레스', 'M1', 3400, 7.6e4], ['베텔게우스', 'M2', 3500, 1e5], ['스피카', 'B1', 22400, 1.2e4], ['알데바란', 'K5', 3900, 440], ['아르크투루스', 'K1', 4300, 170], ['카펠라', 'G8', 5000, 79], ['폴룩스', 'K0', 4700, 43], ['시리우스 A', 'A1', 9900, 25], ['베가', 'A0', 9600, 40], ['알타이르', 'A7', 7700, 11], ['프로키온 A', 'F5', 6500, 7], ['태양', 'G2', 5800, 1], ['센타우루스 α A', 'G2', 5800, 1.5], ['센타우루스 α B', 'K1', 5200, 0.5], ['바너드별', 'M4', 3100, 0.0035], ['프록시마', 'M5.5', 3000, 0.0017], ['시리우스 B', 'DA', 25000, 0.025], ['프로키온 B', 'DQ', 7700, 0.0005]];
      const KMAP = { ms: 'ms', giant: 'gi', super: 'sg', wd: 'wd' };
      const lesSD = L2() && L2().SD;
      const ST = SDF.map((a, i) => { const q = lesSD && lesSD[i]; return { name: a[0], sp: a[1], T: a[2], L: a[3], g: q ? KMAP[q.kind] || 'ms' : (a[3] > 3e3 ? 'sg' : a[3] > 30 && a[2] < 6000 ? 'gi' : a[3] < 0.1 && a[2] > 7000 ? 'wd' : 'ms') }; });
      ST.forEach((s, i) => { s.lt = Math.log10(s.T); s.ll = Math.log10(s.L); s.R = Math.sqrt(s.L) / Math.pow(s.T / 5772, 2); s.x = bx(s.lt); s.y = by(s.ll); s.z = (i % 2 ? 0.2 : -0.2); });
      const N = ST.length, sph = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.0, roughness: 0.4 }), N); root.add(sph);
      const sz = (R) => 0.1 + 0.16 * clamp((Math.log10(R) + 2.2) / 5.2, 0, 1) * 1.8;
      /* 판 (H-R도 바탕) */
      const board = new THREE.Mesh(new THREE.BoxGeometry(BW + 0.9, BH + 0.9, 0.08), std(0x0d1630, { roughness: 0.9, transparent: true, opacity: 0.9 })); board.position.set(0, BH / 2, -0.62); root.add(board);
      const grid = []; for (let lt = 3.5; lt <= 4.6; lt += 0.5) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.012, BH, 0.012), new THREE.MeshBasicMaterial({ color: 0x4a5a86 })); m.position.set(bx(lt), BH / 2, -0.56); root.add(m); }
      for (let ll = -4; ll <= 6; ll += 2) { const m = new THREE.Mesh(new THREE.BoxGeometry(BW, 0.012, 0.012), new THREE.MeshBasicMaterial({ color: 0x4a5a86 })); m.position.set(0, by(ll), -0.56); root.add(m); }
      const axl = { x: label('← 뜨거워요   표면 온도   차가워요 →', [0, -0.35, 0], { size: 12 }), y: label('광도 (태양 = 1)', [-BW / 2 - 0.4, BH + 0.3, 0], { size: 12 }), hot: label('4만 K', [bx(4.6), -0.1, 0], { size: 11 }), mid: label('6000 K', [bx(Math.log10(6000)), -0.1, 0], { size: 11 }), cool: label('3000 K', [bx(Math.log10(3000)), -0.1, 0], { size: 11 }),
        l2: label('10⁶', [BW / 2 + 0.5, by(6), 0], { size: 11 }), l0: label('1', [BW / 2 + 0.5, by(0), 0], { size: 11 }), lm: label('10⁻⁴', [BW / 2 + 0.5, by(-4), 0], { size: 11 }) };
      /* 지름 같은 선 */
      const rLines = [[0.01, '0.01 R☉ (지구만 해요)'], [1, '1 R☉'], [100, '100 R☉'], [1000, '1000 R☉']].map(([R, nm]) => {
        const pts = []; for (let lt = 4.65; lt >= 3.45; lt -= 0.02) { const ll = 2 * Math.log10(R) + 4 * (lt - Math.log10(5772)); if (ll > LL0 && ll < LL1) pts.push(new THREE.Vector3(bx(lt), by(ll), -0.5)); }
        const m = pts.length > 3 ? new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.014, 6, false), new THREE.MeshBasicMaterial({ color: 0x8fa5d6, transparent: true, opacity: 0.8 })) : null; if (m) root.add(m);
        const L = label(nm, pts.length ? pts[Math.min(pts.length - 1, 1)].toArray() : [0, 0, 0], { size: 11, color: 'rgba(40,60,120,.9)' }); return { m, L };
      });
      const sunM = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 8, 36), new THREE.MeshBasicMaterial({ color: 0xffd34d })); sunM.position.set(bx(Math.log10(5772)), by(0), 0); root.add(sunM);
      const gl = { sun: label('태양', sunM, { size: 12, offset: [0, 0.4, 0], color: 'rgba(130,90,0,.92)' }), ms: label('주계열성', [bx(4.2), by(3.2), 0.2], { size: 12 }), gi: label('거성', [bx(3.62), by(2.2), 0.2], { size: 12 }), sg: label('초거성', [bx(3.9), by(5.6), 0.2], { size: 12 }), wd: label('백색 왜성', [bx(4.1), by(-2.6), 0.2], { size: 12 }) };
      /* 별 이름표 (고른 집단만) */
      const slab = ST.map((s) => label(s.name, [s.x, s.y, s.z], { size: 11, offset: [0, 0.3, 0], color: 'rgba(15,23,42,.88)' }));
      /* 개수 막대: 2D '개수 막대'와 같은 두 가지 (내가 그린 20개 / 태양 근처 100개, 예시) */
      const NEAR = { ms: 90, big: 1, wd: 9 }, CKIND = (g) => (g === 'sg' || g === 'gi' ? 'big' : g);
      const mineC = { ms: 0, big: 0, wd: 0 }; ST.forEach((s) => { mineC[CKIND(s.g)]++; });
      const BARS = [['ms', '주계열', 0x3b82f6, -2.4], ['big', '거성·초거성', 0xf59e0b, 0], ['wd', '백색 왜성', 0x8b5cf6, 2.4]];
      const barM = BARS.map((b) => { const m = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1, 1.0), std(b[2], { roughness: 0.5 })); m.position.x = b[3]; root.add(m); return m; });
      const barL = BARS.map((b) => label('', [b[3], 0, 0.6], { size: 12.5 }));
      /* 질량 · 주계열 (3단계): 질량 0.5~20 M☉의 주계열성 */
      const MASSES = [0.5, 1, 2, 5, 10, 20];
      const mData = (M) => { const l = L2(); if (l && l.massData) return l.massData(M); const T = [[0.5, 0.04, 3800], [1, 1, 5800], [2, 25, 9900], [5, 500, 16000], [10, 6000, 25000], [20, 5e4, 32000]]; const r = T.find((x) => x[0] === M) || T[1]; return { L: r[1], T: r[2], R: Math.sqrt(r[1]) / Math.pow(r[2] / 5772, 2), t: 1e10 * M / r[1] }; };
      const msM = MASSES.map((M) => { const d = mData(M), m = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshBasicMaterial({ color: new THREE.Color().fromArray(kelvin(d.T)) })); m.position.set(bx(Math.log10(d.T)), by(Math.log10(d.L)), 0.1); m.scale.setScalar(sz(d.R) * 1.2); root.add(m); ctx.halo(m, m.material.color.getHex(), 3.2, 0.55); return m; });   // 별: 스스로 빛나는 빛무리
      const msL = MASSES.map((M, i) => label(M + ' M☉', msM[i], { size: 11.5, offset: [0.35, 0.25, 0], color: 'rgba(15,23,42,.9)' }));
      const cur = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.035, 8, 40), new THREE.MeshBasicMaterial({ color: 0xffd34d })); root.add(cur);
      const curL = label('', cur, { size: 12, offset: [0, -0.6, 0], color: 'rgba(130,90,0,.95)' });
      const dm = new THREE.Object3D(), cc = new THREE.Color();
      let mode = 'star', grpSel = 'all', showR = true, lastS = '', lastM = null;
      const COLR = ST.map((s) => new THREE.Color().fromArray(kelvin(s.T)));   // 표면 온도에 맞는 색 (kelvin은 [r, g, b] 배열을 돌려줘요)
      const REP = { '태양': 1, '시리우스 A': 1, '베텔게우스': 1, '리겔': 1, '시리우스 B': 1, '프록시마': 1 };
      function cntNow() { const l = L2(), mine = !l || !l.S || l.S.cnt === 'mine'; return { mine, c: mine ? mineC : NEAR, tot: mine ? 20 : 100 }; }
      function apply() {
        const stars = mode === 'star', bar = mode === 'bar', mass = mode === 'mass';
        sph.visible = stars; bars_vis(bar);   // 질량 보기에서는 주계열성 6개만 보여요 (어둡게 칠한 별 20개가 검은 점처럼 보여 헷갈리지 않게) sunM.visible = stars;
        for (let i = 0; i < N; i++) { const s = ST[i], on = (stars || mass) && (grpSel === 'all' || s.g === grpSel), k = mass ? 0.25 : on ? 1 : 0.14; dm.position.set(s.x, s.y, s.z); dm.scale.setScalar(mass ? sz(s.R) * 0.6 : sz(s.R) * (on ? 1 : 0.5)); dm.updateMatrix(); sph.setMatrixAt(i, dm.matrix); cc.copy(COLR[i]).multiplyScalar(k); sph.setColorAt(i, cc); }
        sph.instanceMatrix.needsUpdate = true; sph.instanceColor.needsUpdate = true; sph.material.emissive.setRGB(1, 1, 1); sph.material.emissiveIntensity = 0.0; sph.material.color.setRGB(1, 1, 1); sph.material.emissiveMap = null; sph.material.roughness = 0.35;
        rLines.forEach((r) => { if (r.m) r.m.visible = showR && stars; r.L.show(showR && stars); });
        slab.forEach((L, i) => L.show(stars && (grpSel === 'all' ? !!REP[ST[i].name] : ST[i].g === grpSel)));
        gl.sun.show(false); gl.ms.show(stars && (grpSel === 'all' || grpSel === 'ms')); gl.gi.show(stars && (grpSel === 'all' || grpSel === 'gi')); gl.sg.show(stars && (grpSel === 'all' || grpSel === 'sg')); gl.wd.show(stars && (grpSel === 'all' || grpSel === 'wd'));
        msM.forEach((m) => (m.visible = mass)); msL.forEach((L) => L.show(mass)); cur.visible = mass; curL.show(mass);
        barL.forEach((L) => L.show(bar));
        // 보기마다 쓰는 조작만 보여요: 집단 · 지름 같은 선은 별 20개, 개수는 개수 막대
        if (gGrp) { gGrp.els.forEach((e) => { e.style.display = stars ? '' : 'none'; }); bR.style.display = stars ? '' : 'none'; gCnt.els.forEach((e) => { e.style.display = bar ? '' : 'none'; }); }
        updInfo();
      }
      function bars_vis(v) { barM.forEach((m) => (m.visible = v)); }
      function updInfo() {
        const l = L2();
        if (mode === 'star') info(({ all: 'H-R도에 찍었던 <b>별 20개</b>예요. 크기는 <b>반지름</b>, 색은 <b>표면 온도</b>예요. 대부분 왼쪽 위에서 오른쪽 아래로 이어진 <b>주계열</b>에 있어요.', ms: '<b>주계열성</b>: 대부분의 별이 속해요. 태양도 여기예요.', gi: '<b>거성</b>: 온도는 낮지만 반지름이 커서 광도가 커요 (오른쪽 위쪽).', sg: '<b>초거성</b>: 반지름이 아주 커서 광도가 가장 커요 (예: 베텔게우스 ≈ 870 R☉).', wd: '<b>백색 왜성</b>: 온도는 높지만 반지름이 아주 작아서 어두워요 (예: 시리우스 B).' })[grpSel] + '<br>점선은 <b>반지름 등값선</b>(0.01 · 1 · 100 · 1000 R☉)이에요.');
        else if (mode === 'bar') { const n = cntNow(); info('<b>' + (n.mine ? '내가 그린 별 20개' : '태양 근처 별 100개 (예시)') + '</b> 중 종류별 개수예요.<br>태양 근처에서는 거의 대부분이 어둡고 작은 별이고, 거성은 아주 드물어요.'); }
        else { const M = l && l.S ? l.S.M : 1, d = mData(M); info('<b>질량 ' + (+M.toPrecision(3)) + ' M☉</b> 주계열성: 광도 ' + (d.L >= 100 ? Math.round(d.L).toLocaleString() : +d.L.toPrecision(3)) + ' L☉ · 표면 온도 약 ' + Math.round(d.T / 10) * 10 + ' K<br>질량이 클수록 왼쪽 위(뜨겁고 밝음)에 놓여요. 수명은 t = 10¹⁰년 × M ÷ L로 계산해 봐요.'); }
      }
      function frameBars() {
        if (mode !== 'bar') return; const n = cntNow();
        BARS.forEach((b, i) => { const frac = n.c[b[0]] / n.tot, h = 0.05 + frac * 4.2; barM[i].scale.y = h; barM[i].position.y = h / 2; barL[i].obj = [b[3], h + 0.1, 0.6]; barL[i].set(b[1] + ' ' + n.c[b[0]] + '개<br>(' + Math.round(frac * 100) + ' %)'); });
      }
      const probe = controls.text(''); probe.style.display = 'none'; const ctlEl = probe.parentElement;
      const grab = (fn) => { const n0 = ctlEl.children.length; const r = fn(); return { r, els: Array.prototype.slice.call(ctlEl.children, n0) }; };
      const segMode = controls.segment('보기', [{ value: 'star', label: '⭐ 별 20개' }, { value: 'bar', label: '📊 개수 막대' }, { value: 'mass', label: '⚖️ 질량' }], mode, (v) => { mode = v; apply(); });
      const gGrp = grab(() => controls.segment('집단', [{ value: 'all', label: '전체' }, { value: 'ms', label: '주계열' }, { value: 'gi', label: '거성' }, { value: 'sg', label: '초거성' }, { value: 'wd', label: '백색 왜성' }], grpSel, (v) => { grpSel = v; apply(); }));
      const gCnt = grab(() => controls.segment('개수', [{ value: 'mine', label: '내가 그린 20개' }, { value: 'near', label: '태양 근처 100개' }], 'mine', (v) => { const l = L2(); if (l && l.S) { l.S.cnt = v; l.updateCtl && l.updateCtl(); } apply(); })), segCnt = gCnt.r;
      const bR = controls.button('지름 같은 선 ✓', () => { showR = !showR; bR.classList.toggle('on', showR); bR.textContent = '지름 같은 선 ' + (showR ? '✓' : '✕'); apply(); }); bR.classList.add('on');
      /* ▶ 질량을 0.5 → 20 M☉로 올려 가며 주계열의 위치와 수명을 봐요 (2D의 질량 값과 같아요) */
      const MS = [0.5, 1, 2, 5, 10, 20];
      let ready = false, syncing = false;
      const pl = controls.player({
        duration: 12, loop: true, autoplay: false, label: '질량 올리기',
        phases: MS.map((M, i) => [i / 6, M + ' M☉']),
        onFrame(p) { if (!ready || syncing) return; if (mode !== 'mass') { mode = 'mass'; segMode.set('mass'); apply(); } const M = MS[Math.min(5, Math.floor(p * 6))], l = L2(); if (l && l.setMass) l.setMass(M); },
      });
      pl.pause(); ready = true;
      ctx.onLevel((lv) => { const m = lv === 3 ? 'mass' : 'star'; if (m !== mode) { mode = m; segMode.set(m); apply(); } });
      mode = ctx.level === 3 ? 'mass' : 'star'; segMode.set(mode);
      apply();
      const lifeEl = mxBox('tr');
      return {
        update(dt, t) {
          sunM.scale.setScalar(1 + 0.12 * Math.sin(t * 3));
          const l = L2(), S = l && l.S;
          if (S) {
            if (S.cnt && segCnt && (mode === 'bar')) segCnt.set(S.cnt);
            if (S.M !== lastM) { const first = lastM === null; lastM = S.M; if (!first && mode !== 'mass') { mode = 'mass'; segMode.set('mass'); apply(); } }   // 질량을 바꾸면 질량 보기로
            if (mode === 'mass') { const Mv = Math.pow(10, S.lmd == null ? 0 : S.lmd), d = mData(Mv); cur.position.set(bx(Math.log10(d.T)), by(Math.log10(d.L)), 0.1); const s0 = (+Mv.toPrecision(3)) + ' M☉'; if (s0 !== lastS) { lastS = s0; curL.set('지금 ' + s0); updInfo(); } if (!pl.playing) { const idx = MS.findIndex((x) => Math.abs(x - S.M) < 1e-6); if (idx >= 0 && Math.floor(pl.p * 6) !== idx) { syncing = true; pl.set((idx + 0.01) / 6); syncing = false; } } }
            if (mode === 'bar') frameBars();
            /* 📝 수명 기록: 2D의 수명 막대처럼, 계산해 기록한 질량의 수명이 채워져요 */
            if (mode === 'mass' && S.lifeRec && l.massData && l.fmtYears) {
              const all = S.lifeRec[1] && S.lifeRec[5] && S.lifeRec[20];
              lifeEl.put('<div class="h">📝 주계열 수명 t = 10¹⁰년 × M ÷ L</div><table>' + [1, 5, 20].map((M) => { const ok = S.lifeRec[M] || all; return '<tr><td>' + M + ' M☉</td><td class="' + (ok ? 'ok' : 'dim') + '">' + (ok ? l.fmtYears(l.massData(M).t) + ' ✓' : '? (계산해 기록해요)') + '</td></tr>'; }).join('') + '</table>');
            } else lifeEl.put('');
          }
        },
        sync() {},
      };
    },
  });
})();
