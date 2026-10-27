/* =========================================================
   물리학 Ⅲ. 빛과 물질 - 물질파와 전자 현미경 (단원 4차시)
   성취기준 [12물리03-03] 빛과 물질의 이중성이 전자 현미경과 영상 정보 저장 등 다양한 분야에 활용됨을 설명할 수 있다. (물질의 파동성)
   ① 관찰: 전자의 무늬 (전자를 한 알씩 이중 슬릿에 쏘기 → 점이 쌓여 간섭 무늬)
   ② 모형: 물질파 (λ = h/p, 전자와 야구공)
   ③ 분석: 분해능과 현미경 (파장이 짧을수록 더 가까운 두 점을 구분)
   ④ 적용: 영상 정보 저장(광디스크)과 전자 현미경의 활용
   불확정성 원리 · 슈뢰딩거 방정식 · 회절 한계 식(0.61λ/NA)은 다루지 않아요.
   ========================================================= */
(function () {
  'use strict';
  const PH0 = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PH0 ? 480 : 800, VH = PH0 ? 640 : 560;
  const BG = '#eef2fa';
  /* ===== 공통 도우미 (모든 차시 공통) ===== */
  const { $, $$, clamp, Sound } = SciSim;
  const C = SciSim.color;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const RM = SciSim.reduceMotion;
  const TAU = Math.PI * 2;
  const mark = (b) => (b ? '✅' : '⬜');
  const rnd = (a, b) => a + Math.random() * (b - a);
  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: BG });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const parts = new SciSim.Particles();
  const T = (x, y, s, size, color, align, weight, extra) => D.text(x, y, s, Object.assign({ size, color, align, weight }, extra));
  function wrap(str, maxW, size, weight) {
    ctx.save(); ctx.font = D.font(size, weight || 700);
    const out = []; let line = '';
    for (const ch of str) {
      if (ch === '\n') { out.push(line); line = ''; continue; }
      const t = line + ch;
      if (ctx.measureText(t).width > maxW && line) { out.push(line); line = ch.trim() === '' ? '' : ch; } else line = t;
    }
    if (line) out.push(line);
    ctx.restore(); return out;
  }
  function panel(x, y, w, h, r, fill) { D.shadow(() => { D.roundRect(x, y, w, h, r || 14); ctx.fillStyle = fill || '#fff'; ctx.fill(); }, { blur: 8, y: 2 }); }
  function textBlock(x, y, maxW, str, size, color, lh, weight, align) {
    const ls = wrap(str, maxW, size, weight || 700); ls.forEach((l, i) => T(x, y + i * lh, l, size, color, align || 'left', weight || 700)); return ls.length * lh;
  }
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4200);
  }
  const SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
  const supOf = (n) => String(n).split('').map((c) => SUP[c] || c).join('');
  // 과학적 표기: sci(5.55e14, 1) → "5.6×10¹⁴"
  function sci(x, d) {
    d = d == null ? 1 : d;
    if (!isFinite(x) || x === 0) return '0';
    let e = Math.floor(Math.log10(Math.abs(x))); let m = x / Math.pow(10, e);
    m = +m.toFixed(d); if (Math.abs(m) >= 10) { m /= 10; e += 1; }
    if (e === 0) return m.toFixed(d);
    return m.toFixed(d) + '×10' + supOf(e);
  }
  // 파장(nm) → 색 (가시광선 근사, 380 미만은 자외선=보라 회색, 780 초과는 적외선)
  function wlRGB(wl) {
    let r = 0, g = 0, b = 0;
    if (wl >= 380 && wl < 440) { r = -(wl - 440) / 60; b = 1; }
    else if (wl >= 440 && wl < 490) { g = (wl - 440) / 50; b = 1; }
    else if (wl >= 490 && wl < 510) { g = 1; b = -(wl - 510) / 20; }
    else if (wl >= 510 && wl < 580) { r = (wl - 510) / 70; g = 1; }
    else if (wl >= 580 && wl < 645) { r = 1; g = -(wl - 645) / 65; }
    else if (wl >= 645 && wl <= 780) { r = 1; }
    else if (wl < 380) { return [150, 120, 210]; }
    else { return [150, 60, 60]; }
    let f = 1;
    if (wl < 420) f = 0.35 + 0.65 * (wl - 380) / 40; else if (wl > 700) f = 0.35 + 0.65 * (780 - wl) / 80;
    const gm = 0.8;
    return [r, g, b].map((c) => Math.round(255 * Math.pow(Math.max(0, c) * f, gm)));
  }
  const wlColor = (wl) => { const c = wlRGB(wl); return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join(''); };
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function gauss(rand) { let u = 0; while (u === 0) u = rand(); const v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); }

  // 슬라이더(+조절 버튼) 연결: id 'sX' → 값 표시 'oX'. 반환 {set, refresh}
  function bindSlider(id, fmt, onInput) {
    const inp = $('#' + id), out = $('#o' + id.slice(1));
    const api = SciSim.bindRange(inp, out, fmt, (v) => { Sound.tick(); onInput && onInput(v); });
    $$('.nudge[data-for="' + id + '"]').forEach((b) => b.addEventListener('click', () => {
      const st = +inp.step || 1, d = +b.dataset.d;
      const v = clamp(Math.round(((+inp.value) + d * st) / st) * st, +inp.min, +inp.max);
      inp.value = v; api.refresh(); Sound.tick(); onInput && onInput(+inp.value);
    }));
    return api;
  }
  // 버튼 묶음(segmented/chips): data-v 값 선택. 반환 {set(v), get()}
  function bindSeg(id, onPick) {
    const root = $('#' + id); let cur = null;
    const set = (v) => { cur = String(v); $$('button', root).forEach((b) => b.classList.toggle('on', b.dataset.v === cur)); };
    $$('button', root).forEach((b) => b.addEventListener('click', () => { if (b.disabled) return; Sound.click(); set(b.dataset.v); onPick && onPick(b.dataset.v); }));
    return { set, get: () => cur, root };
  }
  // 고르기 문장 묶음: rows = [{q, opts:[...], ans:index(0-based)}]  → 값은 vals[i] (''/'0'..)
  function mkSelRows(hostId, rows) {
    const host = $('#' + hostId); const sels = []; const vals = {}; const okS = {};
    rows.forEach((r, i) => {
      const row = document.createElement('div'); row.className = 'sel-row';
      row.innerHTML = '<div class="q">' + r.q + '</div>';
      const sel = document.createElement('select'); sel.className = 'sel-in'; sel.setAttribute('aria-label', r.q.replace(/<[^>]+>/g, ''));
      sel.innerHTML = '<option value="">— 고르기 —</option>' + r.opts.map((o, j) => '<option value="' + j + '">' + o + '</option>').join('');
      sel.addEventListener('change', () => { vals[i] = sel.value; sel.classList.remove('ok', 'bad'); delete okS[i]; Sound.click(); });
      row.appendChild(sel); host.appendChild(row); sels.push(sel);
    });
    return {
      sels, vals,
      reset() { Object.keys(vals).forEach((k) => delete vals[k]); Object.keys(okS).forEach((k) => delete okS[k]); sels.forEach((s) => { s.value = ''; s.classList.remove('ok', 'bad'); }); },
      count() { return rows.filter((r, i) => vals[i] !== undefined && vals[i] !== '').length; },
      grade(missMsg, badMsg) {
        const miss = rows.filter((r, i) => vals[i] === undefined || vals[i] === '').length;
        if (miss) return missMsg || ('아직 고르지 않은 문장이 ' + miss + '개 있어요.');
        let bad = 0;
        rows.forEach((r, i) => {
          const ok = +vals[i] === r.ans;
          if (!ok) bad++;
          if (!ok && okS[i] !== false) { sels[i].classList.remove('ok', 'bad'); void sels[i].offsetWidth; sels[i].classList.add('bad'); }
          if (ok) { sels[i].classList.remove('bad'); sels[i].classList.add('ok'); }
          okS[i] = ok;
        });
        return bad ? (badMsg || '빨간 칸을 다시 골라 보세요.') : true;
      },
    };
  }
  // 그래프 축 그리기: 반환 {X(v), Y(v), x, y, w, h}
  function axes(x, y, w, h, o) {
    const X = (v) => x + (v - o.xmin) / (o.xmax - o.xmin) * w;
    const Y = (v) => y + h - (v - o.ymin) / (o.ymax - o.ymin) * h;
    ctx.save();
    ctx.fillStyle = o.bg || '#fbfcff'; ctx.fillRect(x, y, w, h);
    ctx.lineWidth = 1; ctx.strokeStyle = '#e3e8f2';
    (o.xt || []).forEach((t) => { ctx.beginPath(); ctx.moveTo(X(t[0]), y); ctx.lineTo(X(t[0]), y + h); ctx.stroke(); });
    (o.yt || []).forEach((t) => { ctx.beginPath(); ctx.moveTo(x, Y(t[0])); ctx.lineTo(x + w, Y(t[0])); ctx.stroke(); });
    ctx.strokeStyle = '#5d6879'; ctx.lineWidth = 1.6; ctx.strokeRect(x, y, w, h);
    const fs = o.fs || 12;
    (o.xt || []).forEach((t) => T(X(t[0]), y + h + fs + 4, t[1], fs, '#5d6879', 'center', 700));
    (o.yt || []).forEach((t) => T(x - 6, Y(t[0]) + fs * 0.35, t[1], fs, '#5d6879', 'right', 700));
    if (o.xl) T(x + w / 2, y + h + fs * 2 + 10, o.xl, fs + 1, '#26324a', 'center', 800);
    if (o.yl) { ctx.save(); ctx.translate(x - (o.ylx || 40), y + h / 2); ctx.rotate(-Math.PI / 2); T(0, 0, o.yl, fs + 1, '#26324a', 'center', 800); ctx.restore(); }
    ctx.restore();
    return { X, Y, x, y, w, h };
  }

  const rad = Math.PI / 180;

  /* ---------- 상수 (화면의 숫자와 모두 같은 값) ---------- */
  const H_PL = 6.63e-34, M_E = 9.11e-31, Q_E = 1.6e-19;                 // 플랑크 상수, 전자의 질량, 전기량
  const lamE = (V) => H_PL / Math.sqrt(2 * M_E * Q_E * V);              // 전압 V로 가속한 전자의 물질파 파장 (m) ≈ 1.23 / √V nm
  const BALL = { m: 0.145, v: 40 };                                     // 야구공: 질량 (kg), 속력 (m/s)
  const K_RES = 0.36;                                                   // 분해능 ≈ 0.36 × 파장 (이 모형의 값)
  const LAM_LIGHT = 550;                                                // 광학 현미경에 쓰는 가시광선의 파장 (nm)
  const V_EM = 10000;                                                   // 전자 현미경의 가속 전압 (V)
  const EM_FLOOR = 0.1;                                                 // 전자기 렌즈의 수차 때문에 생기는 분해능의 한계 (nm)
  const DISC = { cd: { name: 'CD', pitch: 1600, pit: 830, cap: 0.7, laser: 780 }, dvd: { name: 'DVD', pitch: 740, pit: 400, cap: 4.7, laser: 650 }, bd: { name: '블루레이', pitch: 320, pit: 150, cap: 25, laser: 405 } };
  const SPOT = { 780: 880, 650: 550, 405: 240 };                        // 레이저 점의 지름 (nm)
  const TARGET_BOTH = 10000, TARGET_ONE = 1000;                         // 미션: 이중 슬릿 · 한 슬릿에서 쌓을 전자 수
  const lamV = (idx) => Math.round(Math.pow(10, 2 + idx / 20));         // 슬라이더 번호 → 가속 전압 (V)
  const sepOf = (idx) => Math.pow(10, -1 + idx / 15);                   // 슬라이더 번호 → 두 점 사이의 거리 (nm)
  const dminLight = () => K_RES * LAM_LIGHT;                            // 광학 현미경의 분해능 (nm)
  const lamEmNm = () => lamE(V_EM) * 1e9;                               // 전자 현미경 전자의 파장 (nm)
  const dminElec = () => Math.max(K_RES * lamEmNm(), EM_FLOOR);         // 전자 현미경의 분해능 (nm)
  function fmtV(V) { return V < 1000 ? Math.round(V) + ' V' : (V / 1000).toFixed(V < 9950 ? 1 : 0) + ' kV'; }
  function fmtNm(x) { return x < 1 ? x.toFixed(2) + ' nm' : x < 10 ? x.toFixed(1) + ' nm' : x < 1000 ? Math.round(x) + ' nm' : (x / 1000).toFixed(1) + ' μm'; }
  function fmtLam(m) { const nmv = m * 1e9; return nmv >= 0.01 ? nmv.toFixed(nmv < 0.1 ? 4 : 3) + ' nm' : nmv.toFixed(4) + ' nm'; }

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'dbl', t: 0, fade: 0, dt: 0.016,
    db: { blocked: false, n: 0, target: 10, run: false, acc: 0, bins: new Float32Array(95), fl: [], best: { both: 0, one: 0 }, ding: 0 },
    wv: { part: 'e', idx: 0, vb: 40, showBall: false, seenE: false },
    rs: { mic: 'light', sp: 'two', idx: 50, view: 2.6, seen: { lr: false, lm: false, er: false, vl: false, ve: false, de: false }, hold: {}, cache: {} },
    ap: { disc: 'cd', las: 780, pits: {}, seen: { bdOk: false, bdFail: false, dvdOk: false }, hold: {}, x: 0 },
  };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const MODE_LABEL = { dbl: '⚛️ 전자의 무늬', wave: '〰️ 물질파', res: '🔬 분해능', app: '💿 응용' };

  function setScene(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); }
    S.mode = mode;
    $('#tbLabel').textContent = MODE_LABEL[mode];
    updateCtl();
  }
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      const sub = n.getAttribute('data-sub');
      if (on && sub) on = S.mode === 'wave' ? sub === S.wv.part : S.mode === 'res' ? S.rs.sp === 'two' : true;
      const dm = n.getAttribute('data-match');
      if (on && dm) on = dm === 'ball' ? S.wv.showBall : S.ap.showTool;
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    tgSeg.set(S.db.target); ptSeg.set(S.wv.part); mcSeg.set(S.rs.mic); spSeg.set(S.rs.sp); dsSeg.set(S.ap.disc); lsSeg.set(S.ap.las);
    $('#bFire').innerHTML = S.db.run ? '⏸ 멈추기' : '▶ 전자 쏘기';
    $('#bBlock').style.outline = S.db.blocked ? '3px solid var(--subject)' : '';
    $('#bBlock').textContent = S.db.blocked ? '🚧 막은 슬릿 열기' : '🚧 슬릿 하나 막기';
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));

  /* ---------- 컨트롤 연결 ---------- */
  const tgSeg = bindSeg('tgSeg', (v) => { S.db.target = +v; updateCtl(); });
  const ptSeg = bindSeg('ptSeg', (v) => { S.wv.part = v; if (v === 'b') S.wv.seenB = true; updateCtl(); });
  const mcSeg = bindSeg('mcSeg', (v) => { S.rs.mic = v; });
  const spSeg = bindSeg('spSeg', (v) => { S.rs.sp = v; updateCtl(); });
  const dsSeg = bindSeg('dsSeg', (v) => { S.ap.disc = v; });
  const lsSeg = bindSeg('lsSeg', (v) => { S.ap.las = +v; });
  const slV = bindSlider('sV', (v) => fmtV(lamV(+v)), (v) => { S.wv.idx = +v; });
  const slVb = bindSlider('sVb', (v) => v + ' m/s', (v) => { S.wv.vb = +v; });
  const slSep = bindSlider('sSep', (v) => fmtNm(sepOf(+v)), (v) => { S.rs.idx = +v; });
  $('#sSep').value = 50; slSep.refresh();
  $('#bFire').addEventListener('click', () => { Sound.click(); S.db.run = !S.db.run; if (S.db.run && S.db.n >= S.db.target) { clearScreen(); } updateCtl(); });
  $('#bClear').addEventListener('click', () => { Sound.click(); clearScreen(); S.db.run = false; updateCtl(); });
  $('#bBlock').addEventListener('click', () => { Sound.click(); S.db.blocked = !S.db.blocked; clearScreen(); updateCtl(); });

  const TOOL = mkSelRows('toolRows', [
    { q: '100 nm 크기의 바이러스의 모양을 자세히 보려면', opts: ['광학 현미경', '전자 현미경'], ans: 1 },
    { q: '반도체 회로의 불량을 수 nm 수준에서 검사하려면', opts: ['광학 현미경', '전자 현미경'], ans: 1 },
    { q: '살아서 움직이는 세포를 그대로 관찰하려면', opts: ['광학 현미경', '전자 현미경'], ans: 0 },
    { q: '신소재의 원자 배열(결정 구조)을 보려면', opts: ['광학 현미경', '전자 현미경'], ans: 1 },
  ]);

  /* ================= ① 전자 하나씩 이중 슬릿 ================= */
  const DG = PHONE ? { yc: 248, gx: 22, xb: 140, xs: 316, sw: 70, sh: 182, hx: 398, hw: 66 } : { yc: 246, gx: 28, xb: 250, xs: 486, sw: 96, sh: 190, hx: 610, hw: 170 };
  const FR = PHONE ? 28 : 36, ENV = PHONE ? 66 : 85, ENV1 = PHONE ? 46 : 60;     // 줄무늬 간격, 무늬가 옅어지는 폭 (화면 픽셀)
  const SLIT_D = 30, SLIT_H = 3.5;                                               // 두 슬릿의 간격, 슬릿 틈의 반 높이 (화면 픽셀)
  const T_FLY = 0.55, T_ARC = 0.8;                                               // 전자 한 개가 날아가는 시간 (슬릿까지, 슬릿에서 스크린까지)
  const scr = document.createElement('canvas'); scr.width = DG.sw; scr.height = DG.sh * 2;
  const sctx = scr.getContext('2d');
  const pBoth = (y) => { const c = Math.cos(Math.PI * y / FR); return c * c * Math.exp(-0.5 * Math.pow(y / ENV, 2)); };
  const pOne = (y) => Math.exp(-0.5 * Math.pow(y / ENV1, 2));
  const pdf = (y) => (S.db.blocked ? pOne(y) : pBoth(y));
  function sampleY() { for (let k = 0; k < 200; k++) { const y = (Math.random() * 2 - 1) * DG.sh; if (Math.random() < pdf(y)) return y; } return 0; }
  function clearScreen() {
    const d = S.db; d.n = 0; d.fl.length = 0; d.bins.fill(0); d.acc = 0; sctx.clearRect(0, 0, scr.width, scr.height); d.flash = [];
  }
  function land(y, count) {
    const d = S.db, x = Math.random() * DG.sw;
    d.flash = d.flash || [];
    if (count) {
      sctx.fillStyle = 'rgba(170,230,255,.95)'; sctx.fillRect(Math.floor(x), Math.floor(y + DG.sh), 2, 2);
      d.n++; d.bins[clamp(Math.floor((y + DG.sh) / 4), 0, 94)]++;
      if (S.db.blocked) d.best.one = Math.max(d.best.one, d.n); else d.best.both = Math.max(d.best.both, d.n);
      if (d.n <= 40) Sound.tick();
    }
    if (d.flash.length < 24 && (d.n <= 60 || Math.random() < 0.06)) d.flash.push({ x: DG.xs + x, y: DG.yc + y, t: S.t });
  }
  function spawnFlight(count) { const y = sampleY(); S.db.fl.push({ t: 0, y, count }); }
  function stepDbl(dt) {
    const d = S.db;
    for (let i = d.fl.length - 1; i >= 0; i--) { const f = d.fl[i]; f.t += dt; if (f.t >= T_FLY + T_ARC) { land(f.y, f.count); d.fl.splice(i, 1); } }
    if (!d.flash) d.flash = [];
    for (let i = d.flash.length - 1; i >= 0; i--) if (S.t - d.flash[i].t > 0.5) d.flash.splice(i, 1);
    if (S.mode !== 'dbl' || !d.run) return;
    const pend = d.fl.filter((f) => f.count).length;
    if (d.n + pend >= d.target) { if (!pend) { d.run = false; updateCtl(); } return; }
    const rate = d.n < 40 ? 7 : Math.min(1800, 8 + 0.9 * d.n);
    d.acc += rate * dt;
    while (d.acc >= 1 && d.n + d.fl.filter((f) => f.count).length < d.target) {
      d.acc -= 1;
      if (d.n < 40) spawnFlight(true);
      else { land(sampleY(), true); }
    }
    if (d.n >= 40 && !RM) { d.deco = (d.deco || 0) + dt; if (d.deco > 0.16) { d.deco = 0; spawnFlight(false); } }
    if (d.n >= d.target && !d.fl.some((f) => f.count)) { d.run = false; updateCtl(); }
  }
  function drawDbl() {
    const d = S.db, yc = DG.yc, y1 = yc - SLIT_D / 2, y2 = yc + SLIT_D / 2;
    D.shadow(() => { D.roundRect(8, 8, VW - 16, VH - 16, 16); ctx.fillStyle = '#0d1530'; ctx.fill(); }, { blur: 10, y: 3 });
    // 전자총
    D.roundRect(DG.gx - 6, yc - 22, 56, 44, 8); ctx.fillStyle = '#4b5878'; ctx.fill(); D.glow(DG.gx + 50, yc, 18, '#7bdcff', 0.6);
    T(DG.gx + 22, yc + 5, '전자총', 13, '#fff', 'center', 800);
    // 가림판 (슬릿 두 개)
    const bx = DG.xb - 7, bw = 14, top = yc - 150, bot = yc + 150;
    D.shadow(() => {
      ctx.fillStyle = '#c9d2e4';
      ctx.fillRect(bx, top, bw, y1 - SLIT_H - top); ctx.fillRect(bx, y1 + SLIT_H, bw, y2 - SLIT_H - (y1 + SLIT_H)); ctx.fillRect(bx, y2 + SLIT_H, bw, bot - (y2 + SLIT_H));
      if (d.blocked) ctx.fillRect(bx, y2 - SLIT_H, bw, SLIT_H * 2);
    }, { color: 'rgba(0,0,0,.5)', blur: 8, y: 2 });
    if (d.blocked) { ctx.fillStyle = '#e2464b'; ctx.fillRect(bx + 2, y2 - SLIT_H, bw - 4, SLIT_H * 2); }
    T(DG.xb, top - 8, '이중 슬릿', 13, '#cfd8ee', 'center', 800);
    // 날아가는 전자 (한 알씩)
    d.fl.forEach((f) => {
      if (f.t < T_FLY) {
        const k = f.t / T_FLY, x = DG.gx + 52 + (bx - 14 - (DG.gx + 52)) * k;
        D.glow(x, yc, 24, '#7bdcff', 0.55); ctx.fillStyle = 'rgba(160,230,255,.35)'; D.roundRect(x - 4, yc - 30, 8, 60, 4); ctx.fill(); D.sphere(x, yc, 4.5, '#aee3ff', { gloss: false });
      } else {
        const k = (f.t - T_FLY) / T_ARC;
        ctx.save(); ctx.beginPath(); ctx.rect(bx + bw, yc - 190, DG.xs - bx - bw, 380); ctx.clip();
        [[y1, true], [y2, !d.blocked]].forEach(([sy, on]) => {
          if (!on) return;
          const r = k * (DG.xs - DG.xb + 20);
          for (let q = 0; q < 2; q++) { ctx.strokeStyle = 'rgba(150,225,255,' + (0.6 * (1 - k)) + ')'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(bx + bw, sy, Math.max(1, r - q * 14), -1.3, 1.3); ctx.stroke(); }
        });
        ctx.restore();
      }
    });
    // 스크린
    const top2 = yc - DG.sh;
    D.shadow(() => { ctx.fillStyle = '#05070d'; ctx.fillRect(DG.xs - 2, top2 - 2, DG.sw + 4, DG.sh * 2 + 4); }, { color: 'rgba(0,0,0,.6)', blur: 8, y: 2 });
    ctx.drawImage(scr, DG.xs, top2);
    ctx.strokeStyle = '#8fa0c4'; ctx.lineWidth = 1.5; ctx.strokeRect(DG.xs - 0.5, top2 - 0.5, DG.sw + 1, DG.sh * 2 + 1);
    T(DG.xs + DG.sw / 2, top2 - 8, PHONE ? '스크린' : '스크린 (전자가 닿은 곳)', 13, '#cfd8ee', 'center', 800);
    d.flash.forEach((f) => { const k = (S.t - f.t) / 0.5; D.glow(f.x, f.y, 6 + 14 * k, '#bff0ff', 0.9 * (1 - k)); });
    // 쌓인 전자 수의 분포 (막대그래프)
    let mx = 1; for (let i = 0; i < 95; i++) mx = Math.max(mx, d.bins[i]);
    ctx.fillStyle = 'rgba(123,220,255,.85)';
    for (let i = 0; i < 95; i++) { const w = d.bins[i] / mx * DG.hw; if (w > 0.4) ctx.fillRect(DG.hx, top2 + i * 4, w, 3.4); }
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.moveTo(DG.hx, top2); ctx.lineTo(DG.hx, top2 + DG.sh * 2); ctx.stroke();
    T(DG.hx + DG.hw / 2, top2 - 8, PHONE ? '개수' : '쌓인 전자 수', 13, '#cfd8ee', 'center', 800);
    // 아래 설명 칸
    const by = yc + DG.sh + 12, bh = VH - by - 12, bx0 = 16, bw0 = VW - 32;
    panel(bx0, by, bw0, bh, 14);
    const fs = PHONE ? 13 : 14.5;
    T(bx0 + 14, by + 26, '스크린에 도착한 전자  ' + d.n.toLocaleString('ko-KR') + '개  (목표 ' + d.target.toLocaleString('ko-KR') + '개)' + (d.blocked ? ' · 슬릿 하나를 막았어요' : ''), fs, '#26324a', 'left', 800);
    const msg = d.n === 0 ? '▶ 전자 쏘기를 눌러 전자를 한 알씩 쏘아 보세요. 전자는 알갱이라서 스크린에 점 하나로 찍혀요.'
      : d.blocked ? (d.n < 300 ? '한 슬릿만 열려 있어요. 점이 쌓이면 어떤 모양이 될까요?' : '슬릿이 하나이면 줄무늬가 생기지 않고 한 덩어리로 쌓여요.')
        : d.n < 40 ? '점들이 제멋대로 흩어진 것처럼 보여요. 전자 하나가 닿는 곳은 예측할 수 없어요.'
          : d.n < 1500 ? '점이 쌓일수록 점이 많은 곳과 없는 곳이 나뉘기 시작해요.'
            : '밝고 어두운 줄무늬가 뚜렷해요! 전자도 파동처럼 두 슬릿을 지나 간섭해요.';
    textBlock(bx0 + 14, by + 52, bw0 - 28, msg, fs, '#5d6879', 20, 700);
  }

  /* ================= ② 물질파 ================= */
  const WP = PHONE ? [{ x: 8, y: 8, w: 464, h: 176 }, { x: 8, y: 192, w: 464, h: 190 }, { x: 8, y: 390, w: 464, h: 242 }] : [{ x: 12, y: 12, w: 776, h: 200 }, { x: 12, y: 222, w: 380, h: 326 }, { x: 404, y: 222, w: 384, h: 326 }];
  const PXNM = PHONE ? 1000 : 1500;                 // 파동 그림: 1 nm = PXNM 화면 픽셀 (원자 크기 0.1 nm ≈ 150 픽셀)
  const waveInfo = () => {                          // 현재 선택한 물체의 물질파
    if (S.wv.part === 'e') { const V = lamV(S.wv.idx), lam = lamE(V), p = H_PL / lam, v = p / M_E; return { name: '전자', V, lam, p, v, m: M_E }; }
    const p = BALL.m * S.wv.vb, lam = H_PL / p; return { name: '야구공', lam, p, v: S.wv.vb, m: BALL.m };
  };
  const ballLam = () => H_PL / (BALL.m * BALL.v);                   // 문제의 야구공(0.145 kg, 40 m/s)의 파장
  function drawWave() {
    const w = waveInfo(), p0 = WP[0], p1 = WP[1], p2 = WP[2];
    const lamNm = w.lam * 1e9;
    // 1) 파동 그림
    D.shadow(() => { D.roundRect(p0.x, p0.y, p0.w, p0.h, 14); ctx.fillStyle = '#0d1530'; ctx.fill(); }, { blur: 10, y: 3 });
    ctx.save(); D.roundRect(p0.x, p0.y, p0.w, p0.h, 14); ctx.clip();
    const midY = p0.y + (PHONE ? 70 : 80), x0 = p0.x + 70;
    T(p0.x + 14, p0.y + 24, w.name + '의 물질파', 14.5, '#cfd8ee', 'left', 800);
    if (S.wv.part === 'e') {
      const lp = lamNm * PXNM;
      D.sphere(p0.x + 38, midY, 9, '#4aa8ff', { shadow: true, text: 'e⁻', textScale: 0.9 });
      ctx.strokeStyle = '#7bdcff'; ctx.lineWidth = 2.6; ctx.lineJoin = 'round'; ctx.beginPath();
      const step = Math.max(1, Math.min(3, lp / 6));
      for (let x = 0; x <= p0.w - 100; x += step) { const y = midY - 34 * Math.sin(TAU * (x - 70 * S.t) / lp); if (x === 0) ctx.moveTo(x0 + x, y); else ctx.lineTo(x0 + x, y); }
      ctx.stroke();
      // 파장 표시: 마루 사이 간격
      const xm = x0 + 24, ym = midY + 52;
      ctx.strokeStyle = '#ffd447'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(xm, ym); ctx.lineTo(xm + Math.min(lp, p0.w - 140), ym); ctx.moveTo(xm, ym - 6); ctx.lineTo(xm, ym + 6); ctx.moveTo(xm + Math.min(lp, p0.w - 140), ym - 6); ctx.lineTo(xm + Math.min(lp, p0.w - 140), ym + 6); ctx.stroke();
      D.label(xm + Math.min(lp, p0.w - 140) / 2, ym + 20, 'λ = ' + fmtLam(w.lam), { bg: '#ffd447', color: '#3a2b00', size: 13 });
      // 원자 크기 눈금
      const rx = p0.x + p0.w - 24, ry = p0.y + p0.h - 22, rl = 0.1 * PXNM;
      ctx.strokeStyle = '#ff9aa6'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(rx - rl, ry); ctx.lineTo(rx, ry); ctx.moveTo(rx - rl, ry - 6); ctx.lineTo(rx - rl, ry + 6); ctx.moveTo(rx, ry - 6); ctx.lineTo(rx, ry + 6); ctx.stroke();
      T(rx - rl / 2, ry - 12, PHONE ? '0.1 nm' : '0.1 nm (원자 하나의 크기쯤)', 13, '#ffc2ca', 'center', 800);
    } else {
      const bx = p0.x + 80 + ((S.t * 60) % (p0.w - 220));
      D.sphere(bx, midY, 26, '#f4f1ea', { shadow: true, outline: '#9a9488', outlineWidth: 1.5 });
      ctx.strokeStyle = '#d6453d'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(bx - 20, midY, 19, -0.9, 0.9); ctx.stroke(); ctx.beginPath(); ctx.arc(bx + 20, midY, 19, Math.PI - 0.9, Math.PI + 0.9); ctx.stroke();
      T(bx, midY + 50, '0.145 kg · ' + S.wv.vb + ' m/s', 13, '#cfd8ee', 'center', 800);
      D.label(p0.x + p0.w / 2, p0.y + p0.h - 30, '파장 λ = ' + sci(w.lam, 1) + ' m — 너무 짧아서 파동의 모습을 그릴 수 없어요', { bg: '#e2464b', size: PHONE ? 12.5 : 14 });
    }
    ctx.restore();
    // 2) 그래프: 전압 → 전자의 파장 (두 축 모두 로그 눈금)
    panel(p1.x, p1.y, p1.w, p1.h, 14);
    T(p1.x + p1.w / 2, p1.y + 24, '전자의 가속 전압 → 물질파 파장', 14, '#26324a', 'center', 800);
    const g = axes(p1.x + 62, p1.y + 44, p1.w - 82, p1.h - 112, { xmin: 2, xmax: 5, ymin: -2.5, ymax: -0.5, xt: [[2, '100 V'], [3, '1 kV'], [4, '10 kV'], [5, '100 kV']], yt: [[-2, '0.01 nm'], [-1, '0.1 nm']], xl: '가속 전압 V', yl: '파장 λ', fs: 12.5, ylx: 52 });
    ctx.save(); ctx.beginPath(); ctx.rect(g.x, g.y, g.w, g.h); ctx.clip();
    ctx.strokeStyle = '#4a7bd0'; ctx.lineWidth = 3; ctx.beginPath();
    for (let q = 2; q <= 5.001; q += 0.05) { const yy = Math.log10(lamE(Math.pow(10, q)) * 1e9); if (q === 2) ctx.moveTo(g.X(q), g.Y(yy)); else ctx.lineTo(g.X(q), g.Y(yy)); }
    ctx.stroke();
    ctx.strokeStyle = '#14a058'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(g.x, g.Y(-2)); ctx.lineTo(g.x + g.w, g.Y(-2)); ctx.stroke();
    ctx.strokeStyle = '#e2464b'; ctx.beginPath(); ctx.moveTo(g.x, g.Y(-1)); ctx.lineTo(g.x + g.w, g.Y(-1)); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    T(g.x + g.w - 4, g.Y(-1) - 6, '원자 크기쯤 0.1 nm', 12.5, '#e2464b', 'right', 800); T(g.x + g.w - 4, g.Y(-2) + 16, '목표 0.01 nm', 12.5, '#14a058', 'right', 800);
    if (S.wv.part === 'e') { const q = S.wv.idx / 20 + 2, yy = Math.log10(lamNm); D.sphere(g.X(q), g.Y(yy), 8, '#ffb400', { shadow: true }); D.ring(g.X(q), g.Y(yy), 13, S.t, { color: '#ffb400', width: 2.5 }); }
    if (!PHONE) T(p1.x + p1.w / 2, p1.y + p1.h - 12, '전압이 100배가 되면 파장은 1/10', 13, '#5d6879', 'center', 700);
    // 3) 크기 비교 (로그 눈금) + 계산
    panel(p2.x, p2.y, p2.w, p2.h, 14);
    T(p2.x + p2.w / 2, p2.y + 24, '파장과 크기 비교 (길이, 단위 m)', 14, '#26324a', 'center', 800);
    const ax0 = p2.x + 24, ax1 = p2.x + p2.w - 24, ay = p2.y + (PHONE ? 76 : 96), E0 = -36, E1 = -5;
    const X = (e) => ax0 + (e - E0) / (E1 - E0) * (ax1 - ax0);
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ax0, ay); ctx.lineTo(ax1, ay); ctx.stroke();
    for (let e = E0; e <= E1; e += 5) { ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(X(e), ay - 5); ctx.lineTo(X(e), ay + 5); ctx.stroke(); T(X(e), ay + 22, '10' + supOf(e), 12, '#5d6879', 'center', 700); }
    const items = [[Math.log10(ballLam()), '#ff7a45', '⚾ 야구공의 λ', -1, 36], [Math.log10(lamE(lamV(S.wv.idx))), '#4a7bd0', '⚛️ 전자의 λ', 1, 46], [-10, '#e2464b', '원자 크기', -1, 36], [Math.log10(LAM_LIGHT * 1e-9), '#8a6d00', '가시광선의 λ', 1, 70]];
    items.forEach(([e, c, nm, up, h]) => {
      D.sphere(X(e), ay, 7, c, { gloss: false }); ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(e), ay + up * 7); ctx.lineTo(X(e), ay + up * (h - 8)); ctx.stroke();
      T(clamp(X(e), ax0 + 50, ax1 - 50), ay + up * h + (up > 0 ? 4 : 0), nm, 12.5, c, 'center', 800);
    });
    const ty = p2.y + (PHONE ? 168 : 196), fs = PHONE ? 12.5 : 13.5, lh = PHONE ? 20 : 23;
    const e = { p: Math.sqrt(2 * M_E * Q_E * lamV(S.wv.idx)) }, bp = BALL.m * BALL.v;
    const bx0 = PHONE ? p2.x + p2.w / 2 + 6 : p2.x + 14, by0 = PHONE ? ty : ty + lh * 3.4;
    T(p2.x + 14, ty, '⚛️ 전자 (' + fmtV(lamV(S.wv.idx)) + ')', fs, '#4a7bd0', 'left', 800);
    T(p2.x + 14, ty + lh, 'p = ' + sci(e.p, 1) + ' kg·m/s', fs, '#26324a', 'left', 700);
    T(p2.x + 14, ty + lh * 2, 'λ = h/p = ' + fmtLam(lamE(lamV(S.wv.idx))), fs, '#26324a', 'left', 800);
    T(bx0, by0, '⚾ 야구공 (0.145 kg, 40 m/s)', fs, '#d6693a', 'left', 800);
    T(bx0, by0 + lh, 'p = mv = ' + bp.toFixed(1) + ' kg·m/s', fs, '#26324a', 'left', 700);
    T(bx0, by0 + lh * 2, 'λ = h/p = ' + sci(ballLam(), 1) + ' m', fs, '#26324a', 'left', 800);
  }

  /* ================= ③ 분해능과 현미경 ================= */
  const RL = PHONE ? { x: 8, y: 8, w: 464, h: 300 } : { x: 12, y: 12, w: 520, h: 536 };
  const RR = PHONE ? { x: 8, y: 316, w: 464, h: 316 } : { x: 544, y: 12, w: 244, h: 536 };
  const SQ = PHONE ? 218 : 232;
  const SQA = { x: RL.x + (PHONE ? 8 : 16), y: RL.y + (PHONE ? 46 : 54) }, SQB = { x: RL.x + RL.w - SQ - (PHONE ? 8 : 16), y: SQA.y };
  const dminNow = () => (S.rs.mic === 'light' ? dminLight() : dminElec());
  const sepNm = () => sepOf(S.rs.idx);
  const resolved = () => sepNm() >= dminNow();
  const SPEC_W = { virus: 160, dna: 6 };                                  // 시료 그림의 한 변 (nm)
  function specPoints(sp) {
    const pts = [];
    if (sp === 'virus') {
      for (let a = 0; a < 360; a += 15) { const t = a * rad; pts.push([38 * Math.cos(t), 38 * Math.sin(t), 1]); pts.push([22 * Math.cos(t), 22 * Math.sin(t), 0.5]); }
      pts.push([0, 0, 1.5]);
      for (let a = 0; a < 360; a += 30) { const t = (a + 15) * rad; [44, 50, 56].forEach((r, i) => pts.push([r * Math.cos(t), r * Math.sin(t), i === 2 ? 1.6 : 0.8])); }
    } else {
      for (let y = -3; y <= 3.001; y += 0.17) { const x = Math.sin(TAU * y / 3.4); pts.push([x, y, 1]); pts.push([-x, y, 1]); }
      for (let y = -3; y <= 3.001; y += 0.34) { const x = Math.sin(TAU * y / 3.4); for (let k = -2; k <= 2; k++) pts.push([x * k / 2, y, 0.45]); }
    }
    return pts;
  }
  const LUT_E = [], LUT_L = [];
  for (let i = 0; i < 256; i++) { const v = i / 255; LUT_E.push(C.hexToRgb(C.mix('#06122a', v < 0.6 ? '#1f8fd0' : '#e8fbff', v < 0.6 ? v / 0.6 : (v - 0.6) / 0.4))); LUT_L.push(C.hexToRgb(C.mix('#1a0f05', v < 0.6 ? '#e08a18' : '#fff2b0', v < 0.6 ? v / 0.6 : (v - 0.6) / 0.4))); }
  function fieldCanvas(sp, mic) {          // 시료를 현미경으로 본 상 (가우스 번짐으로 계산해 한 번만 만들어 둬요)
    const key = sp + '|' + mic; if (S.rs.cache[key]) return S.rs.cache[key];
    const N = 72, W = SPEC_W[sp], dm = mic === 'light' ? dminLight() : dminElec(), sig = Math.max(dm / 2, 0.55 * W / N);
    const f = new Float32Array(N * N), pts = specPoints(sp), pxn = W / N;
    pts.forEach(([x, y, w]) => {
      const cxp = (x + W / 2) / pxn, cyp = (y + W / 2) / pxn, sp_ = sig / pxn, r = Math.ceil(sp_ * 3.5);
      for (let j = Math.max(0, Math.floor(cyp - r)); j <= Math.min(N - 1, Math.ceil(cyp + r)); j++) for (let i = Math.max(0, Math.floor(cxp - r)); i <= Math.min(N - 1, Math.ceil(cxp + r)); i++) {
        const dx = i + 0.5 - cxp, dy = j + 0.5 - cyp; f[j * N + i] += w * Math.exp(-(dx * dx + dy * dy) / (2 * sp_ * sp_));
      }
    });
    let mx = 1e-9; for (let i = 0; i < f.length; i++) mx = Math.max(mx, f[i]);
    const cv = document.createElement('canvas'); cv.width = N; cv.height = N; const c2 = cv.getContext('2d'), im = c2.createImageData(N, N), lut = mic === 'light' ? LUT_L : LUT_E;
    for (let i = 0; i < f.length; i++) { const c = lut[Math.min(255, Math.round(f[i] / mx * 255))]; im.data[i * 4] = c.r; im.data[i * 4 + 1] = c.g; im.data[i * 4 + 2] = c.b; im.data[i * 4 + 3] = 255; }
    c2.putImageData(im, 0, 0); S.rs.cache[key] = cv; return cv;
  }
  function stepRes(dt) {
    const r = S.rs;
    const tv = 2.6 * Math.max(sepNm(), dminNow());
    if (r.viewW == null) r.viewW = tv;
    r.viewW = Math.exp(SciSim.approach(Math.log(r.viewW), Math.log(tv), dt, 9));
    if (S.mode !== 'res') { r.hold = {}; return; }
    const upd = (k, ok) => { r.hold[k] = ok ? (r.hold[k] || 0) + dt : 0; if (r.hold[k] > (k.length === 2 && k[0] !== 'v' && k[0] !== 'd' ? 0.6 : 1.0)) r.seen[k] = true; };
    const two = r.sp === 'two', s = sepNm(), dl = dminLight();
    upd('lr', two && r.mic === 'light' && s >= dl && s <= 2 * dl);
    upd('lm', two && r.mic === 'light' && s < dl && s >= 20);
    upd('er', two && r.mic === 'elec' && s < dl && s >= 1);
    upd('vl', r.sp === 'virus' && r.mic === 'light');
    upd('ve', r.sp === 'virus' && r.mic === 'elec');
    upd('de', r.sp === 'dna' && r.mic === 'elec');
  }
  function niceScale(W) { const cand = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000]; let best = cand[0]; cand.forEach((c) => { if (c <= W * 0.4) best = c; }); return best; }
  function drawRes() {
    const r = S.rs, light = r.mic === 'light', dm = dminNow(), sig = dm / 2, s = sepNm();
    panel(RL.x, RL.y, RL.w, RL.h, 14); panel(RR.x, RR.y, RR.w, RR.h, 14);
    T(SQA.x + SQ / 2, SQA.y - 14, '실제 시료', PHONE ? 13 : 14.5, '#26324a', 'center', 800);
    T(SQB.x + SQ / 2, SQB.y - 14, (light ? '광학 현미경' : '전자 현미경') + '으로 본 모습', PHONE ? 13 : 14.5, '#26324a', 'center', 800);
    // 사각형 틀
    [SQA, SQB].forEach((q, i) => { ctx.fillStyle = i === 0 ? '#eef2fa' : (light ? '#1a0f05' : '#06122a'); D.roundRect(q.x, q.y, SQ, SQ, 10); ctx.fill(); ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 1.5; ctx.stroke(); });
    let W;
    if (r.sp === 'two') {
      W = r.viewW; const pxn = SQ / W, ccx = SQ / 2, ccy = SQ / 2;
      [-1, 1].forEach((sg) => D.sphere(SQA.x + ccx + sg * s / 2 * pxn, SQA.y + ccy, 6, '#ff7a45', { shadow: true }));
      ctx.save(); D.roundRect(SQB.x, SQB.y, SQ, SQ, 10); ctx.clip(); ctx.globalCompositeOperation = 'lighter';
      const sp = Math.max(sig * pxn, 2.5);
      [-1, 1].forEach((sg) => { const gx = SQB.x + ccx + sg * s / 2 * pxn, gy = SQB.y + ccy; const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, sp * 3); const c = light ? '255,190,80' : '120,220,255'; g.addColorStop(0, 'rgba(' + c + ',.95)'); g.addColorStop(0.35, 'rgba(' + c + ',.5)'); g.addColorStop(1, 'rgba(' + c + ',0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(gx, gy, sp * 3, 0, TAU); ctx.fill(); });
      ctx.restore();
    } else {
      W = SPEC_W[r.sp];
      drawSpecimen(SQA.x, SQA.y, SQ, r.sp);
      ctx.imageSmoothingEnabled = true; ctx.save(); D.roundRect(SQB.x, SQB.y, SQ, SQ, 10); ctx.clip(); ctx.drawImage(fieldCanvas(r.sp, r.mic), SQB.x, SQB.y, SQ, SQ); ctx.restore();
    }
    // 눈금자 (100 nm 같은)
    const sc = niceScale(W), spx = sc / W * SQ;
    [SQA, SQB].forEach((q) => { ctx.strokeStyle = '#26324a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(q.x + 10, q.y + SQ - 14); ctx.lineTo(q.x + 10 + spx, q.y + SQ - 14); ctx.stroke(); T(q.x + 10 + spx / 2, q.y + SQ - 20, fmtNm(sc), 12.5, q === SQB && !light ? '#cfe8ff' : '#26324a', 'center', 800); });
    ctx.strokeStyle = light ? '#ffd9a0' : '#bfe8ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(SQB.x + 10, SQB.y + SQ - 14); ctx.lineTo(SQB.x + 10 + spx, SQB.y + SQ - 14); ctx.stroke();
    // 아래: 세기 그래프 (두 점일 때)
    if (r.sp === 'two' && !PHONE) {
      const gx = RL.x + 40, gy = SQA.y + SQ + 44, gw = RL.w - 70, gh = 110;
      T(RL.x + RL.w / 2, gy - 12, '현미경 상의 밝기 (위치에 따라)', 13.5, '#26324a', 'center', 800);
      ctx.fillStyle = '#fbfcff'; ctx.fillRect(gx, gy, gw, gh); ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 1.5; ctx.strokeRect(gx, gy, gw, gh);
      const pxn = gw / W, xc = gx + gw / 2;
      const sigP = Math.max(sig, 3 / pxn);
      const prof = (x) => { let v = 0; [-1, 1].forEach((sg) => { const d = (x - xc) / pxn - sg * s / 2; v += Math.exp(-d * d / (2 * sigP * sigP)); }); return v; };
      ctx.beginPath(); ctx.moveTo(gx, gy + gh);
      for (let x = gx; x <= gx + gw; x += 2) ctx.lineTo(x, gy + gh - 8 - prof(x) / 2.2 * (gh - 22) * 1.0);
      ctx.lineTo(gx + gw, gy + gh); ctx.closePath(); ctx.fillStyle = light ? 'rgba(224,138,24,.35)' : 'rgba(31,143,208,.35)'; ctx.fill(); ctx.strokeStyle = light ? '#e08a18' : '#1f8fd0'; ctx.lineWidth = 2.5;
      ctx.beginPath(); for (let x = gx; x <= gx + gw; x += 2) { const y = gy + gh - 8 - prof(x) / 2.2 * (gh - 22); if (x === gx) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke();
      [-1, 1].forEach((sg) => { const x = xc + sg * s / 2 * pxn; ctx.strokeStyle = '#ff7a45'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x, gy + gh); ctx.stroke(); ctx.setLineDash([]); });
      T(gx + 6, gy + 18, '주황 점선 = 실제 두 점의 위치', 12.5, '#c25a26', 'left', 800);
    }
    // 오른쪽: 설명 카드
    const tx = RR.x + 14, tw = RR.w - 28, fs = PHONE ? 13 : 14, lh = PHONE ? 20 : 21;
    let y = RR.y + 30;
    T(tx, y, '쓰는 파동', fs, '#5d6879', 'left', 800); y += lh;
    y += textBlock(tx, y, tw, light ? '가시광선 · 파장 ' + LAM_LIGHT + ' nm' : '전자 (' + fmtV(V_EM) + ') · 파장 ' + fmtLam(lamE(V_EM)), fs, '#26324a', lh, 800) + 8;
    T(tx, y, '분해능 (구분할 수 있는 최소 거리)', fs - 0.5, '#5d6879', 'left', 800); y += lh;
    y += textBlock(tx, y, tw, light ? '약 ' + Math.round(dm) + ' nm  (= ' + K_RES + ' × ' + LAM_LIGHT + ' nm)' : '약 ' + EM_FLOOR + ' nm  (파장 ' + fmtLam(lamE(V_EM)) + '는 더 짧지만 렌즈 수차 때문에 이 값이 한계예요)', fs, light ? '#c25a26' : '#1f6fa0', lh, 800) + 8;
    if (r.sp === 'two') {
      T(tx, y, '지금 두 점 사이의 거리', fs - 0.5, '#5d6879', 'left', 800); y += lh;
      T(tx, y, fmtNm(s), fs + 2, '#26324a', 'left', 800); y += lh + 6;
      const ok = s >= dm;
      D.label(tx + 2, y + 6, ok ? '두 점으로 구분돼요 ✓' : '한 덩어리로 보여요 ✗', { bg: ok ? '#14a058' : '#e2464b', size: PHONE ? 13 : 14, align: 'left' }); y += 34;
      textBlock(tx, y, tw, ok ? '두 점 사이의 거리가 분해능 이상이어서 상이 두 개의 봉우리로 나뉘어요.' : '두 점이 분해능보다 가까워서 상이 겹쳐 한 덩어리가 돼요. 더 짧은 파장이 필요해요.', fs - 0.5, '#5d6879', lh - 2, 700);
    } else {
      T(tx, y, r.sp === 'virus' ? '🦠 바이러스: 지름 약 100 nm' : '🧬 DNA: 이중나선 지름 약 2 nm', fs, '#26324a', 'left', 800); y += lh + 4;
      const lookOk = (light && r.sp === 'virus') ? '흐릿한 덩어리로만 보여요 (바이러스 100 nm는 분해능 ' + Math.round(dminLight()) + ' nm 근처)' : (light ? '분해능보다 훨씬 작아서 거의 보이지 않아요' : '파장이 짧은 전자로 모양이 선명하게 보여요');
      textBlock(tx, y, tw, lookOk, fs - 0.5, light ? '#e2464b' : '#14a058', lh - 2, 800);
      if (!PHONE) {
      const lx = RL.x + 20, ly = SQA.y + SQ + 40, lw = RL.w - 40;
      T(lx, ly, r.sp === 'virus' ? '광학 현미경 (분해능 약 ' + Math.round(dminLight()) + ' nm)' : '시료의 크기와 분해능 비교', 14.5, '#26324a', 'left', 800);
      if (r.sp === 'virus') {
        textBlock(lx, ly + 28, lw, '지름 약 100 nm인 바이러스는 분해능과 비슷한 크기라서 돌기(스파이크)를 구분하지 못하고 흐릿한 덩어리로 보여요.', 14, '#5d6879', 20, 700);
        T(lx, ly + 94, '전자 현미경 (분해능 약 ' + EM_FLOOR + ' nm)', 14.5, '#26324a', 'left', 800);
        textBlock(lx, ly + 122, lw, '분해능이 바이러스(100 nm)보다 훨씬 작아서 돌기 하나하나까지 선명하게 보여요.', 14, '#5d6879', 20, 700);
      } else {
        textBlock(lx, ly + 28, lw, 'DNA 이중나선의 지름은 약 2 nm, 염기쌍 사이는 0.34 nm예요. 광학 현미경의 분해능(약 ' + Math.round(dminLight()) + ' nm)보다 훨씬 작아서 광학 현미경으로는 보이지 않아요.', 14, '#5d6879', 20, 700);
        textBlock(lx, ly + 94, lw, '전자 현미경의 분해능 약 ' + EM_FLOOR + ' nm는 염기쌍 간격(0.34 nm)보다 작아서 나선 모양이 보여요.', 14, '#5d6879', 20, 700);
      }
      }
    }
  }
  function drawSpecimen(x0, y0, sz, sp) {
    const W = SPEC_W[sp], k = sz / W, cxp = x0 + sz / 2, cyp = y0 + sz / 2;
    ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, sz, sz); ctx.clip();
    if (sp === 'virus') {
      ctx.strokeStyle = '#7c5cff'; ctx.lineWidth = Math.max(2, 2 * k); for (let a = 15; a < 360; a += 30) { const t = a * rad; ctx.beginPath(); ctx.moveTo(cxp + 38 * k * Math.cos(t), cyp + 38 * k * Math.sin(t)); ctx.lineTo(cxp + 54 * k * Math.cos(t), cyp + 54 * k * Math.sin(t)); ctx.stroke(); D.sphere(cxp + 56 * k * Math.cos(t), cyp + 56 * k * Math.sin(t), 3.2 * k + 2, '#ff7a45', { gloss: false }); }
      D.sphere(cxp, cyp, 38 * k, '#a9b8ff', { outline: '#5b6fd8', outlineWidth: 2, gloss: false });
      ctx.strokeStyle = 'rgba(80,60,160,.45)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cxp, cyp, 22 * k, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(cxp, cyp, 7 * k, 0, TAU); ctx.stroke();
    } else {
      const ky = sz / 6;
      for (let y = -3; y <= 3.001; y += 0.34) { const x = Math.sin(TAU * y / 3.4); ctx.strokeStyle = '#c3cbdb'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cxp + x * ky, cyp + y * ky); ctx.lineTo(cxp - x * ky, cyp + y * ky); ctx.stroke(); }
      [[1, '#e2464b'], [-1, '#2f6df6']].forEach(([sg, c]) => { ctx.strokeStyle = c; ctx.lineWidth = 4; ctx.beginPath(); for (let y = -3; y <= 3.001; y += 0.05) { const x = sg * Math.sin(TAU * y / 3.4); if (y === -3) ctx.moveTo(cxp + x * ky, cyp + y * ky); else ctx.lineTo(cxp + x * ky, cyp + y * ky); } ctx.stroke(); });
    }
    ctx.restore();
  }

  /* ================= ④ 광디스크와 전자 현미경의 활용 ================= */
  const AP = PHONE ? { disc: { x: 8, y: 8, w: 464, h: 270 }, cap: { x: 8, y: 286, w: 464, h: 140 }, card: { x: 8, y: 434, w: 464, h: 198 } } : { disc: { x: 12, y: 12, w: 520, h: 330 }, cap: { x: 544, y: 12, w: 244, h: 330 }, card: { x: 12, y: 352, w: 776, h: 196 } };
  const SCN = PHONE ? 0.07 : 0.09;                       // 디스크 그림: 1 nm = SCN 화면 픽셀
  const SIG_H = 56;                                       // 읽은 신호를 그리는 칸의 높이
  const spotPx = () => SPOT[S.ap.las] * SCN;
  const readOk = (disc, las) => SPOT[las] < DISC[disc].pitch;            // 레이저 점이 트랙 한 줄보다 좁아야 읽혀요
  function pitsOf(key) {
    if (S.ap.pits[key]) return S.ap.pits[key];
    const d = DISC[key], rnd2 = mulberry32(key.length * 97 + d.pit), rows = {}, tot = 2400;
    for (let r = -8; r <= 8; r++) { const arr = []; let x = rnd2() * 80; while (x < tot) { const len = d.pit * (1 + Math.floor(rnd2() * 3)) * SCN, gap = d.pit * (1 + Math.floor(rnd2() * 3)) * SCN; arr.push({ x, len }); x += len + gap; } rows[r] = arr; }
    return (S.ap.pits[key] = rows);
  }
  const pitAt = (arr, x) => { for (let i = 0; i < arr.length; i++) if (x >= arr[i].x && x <= arr[i].x + arr[i].len) return 1; return 0; };
  function stepApp(dt) {
    const a = S.ap;
    a.x = (a.x + dt * 80) % 2000;
    if (S.mode !== 'app') { a.hold = {}; return; }
    const upd = (k, ok) => { a.hold[k] = ok ? (a.hold[k] || 0) + dt : 0; if (a.hold[k] > 1.0) a.seen[k] = true; };
    upd('bdOk', a.disc === 'bd' && a.las === 405);
    upd('bdFail', a.disc === 'bd' && a.las === 780);
    upd('dvdOk', a.disc === 'dvd' && a.las === 650);
  }
  function drawApp() {
    const a = S.ap, d = DISC[a.disc], P = AP.disc, ok = readOk(a.disc, a.las);
    // 디스크 표면 확대 그림
    D.shadow(() => { D.roundRect(P.x, P.y, P.w, P.h, 14); ctx.fillStyle = '#10182e'; ctx.fill(); }, { blur: 10, y: 3 });
    ctx.save(); D.roundRect(P.x, P.y, P.w, P.h, 14); ctx.clip();
    const yc0 = P.y + (P.h - SIG_H - 14) / 2 + 6, pitchPx = d.pitch * SCN, pw = Math.max(5, pitchPx * 0.36);
    const rows = pitsOf(a.disc), spx = P.x + 40 + (a.x % (P.w - 80));
    const nR = Math.ceil((P.h / 2) / pitchPx) + 1;
    const offs = a.x % 2000;
    for (let r = -nR; r <= nR; r++) {
      const arr = rows[clamp(r, -8, 8)], yy = yc0 + r * pitchPx;
      if (yy < P.y - pw || yy > P.y + P.h - SIG_H - 8) continue;
      ctx.fillStyle = 'rgba(160,185,235,.12)'; ctx.fillRect(P.x, yy - 1, P.w, 2);
      ctx.fillStyle = r === 0 ? '#9fd0ff' : '#6f8bc4';
      arr.forEach((pt) => { const x = P.x + pt.x; if (x + pt.len < P.x || x > P.x + P.w) return; D.roundRect(x, yy - pw / 2, pt.len, pw, Math.min(pw, pt.len) / 2); ctx.fill(); });
    }
    // 레이저 점
    const lc = a.las === 405 ? '#9a7cff' : a.las === 650 ? '#ff4d4d' : '#d93a3a', sr = spotPx() / 2;
    ctx.fillStyle = C.rgba(lc, ok ? 0.28 : 0.4); ctx.strokeStyle = ok ? '#2ee59d' : '#ff6a6a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(spx, yc0, sr, 0, TAU); ctx.fill(); ctx.stroke();
    D.glow(spx, yc0, sr * 1.5, lc, 0.45);
    // 읽은 신호
    const sy = P.y + P.h - SIG_H - 6;
    ctx.fillStyle = 'rgba(8,14,32,.9)'; D.roundRect(P.x + 8, sy, P.w - 16, SIG_H, 8); ctx.fill();
    ctx.strokeStyle = ok ? '#2ee59d' : '#ff8a8a'; ctx.lineWidth = 2.4; ctx.beginPath();
    for (let k = 0; k <= P.w - 36; k += 2) {
      const xx = spx - (P.w - 36) + k;
      let v = pitAt(rows[0], xx - P.x);
      if (!ok) { v = 0.55 * v + 0.45 * pitAt(rows[1], xx - P.x) + 0.35 * pitAt(rows[-1], xx - P.x); v = Math.min(1, v + 0.12 * Math.sin(xx * 0.9)); }
      const x = P.x + 18 + k, y = sy + SIG_H - 10 - v * (SIG_H - 22);
      if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    T(P.x + 16, sy + 16, ok ? '읽은 신호 (홈 = 1, 평평한 곳 = 0)' : '읽은 신호: 이웃 트랙의 홈까지 섞여 읽혀요', 12.5, ok ? '#9fe8c8' : '#ffb4b4', 'left', 800);
    ctx.restore();
    T(P.x + 14, P.y + 22, d.name + ' 표면의 홈(피트)과 레이저 점 (확대)', 13.5, '#cfd8ee', 'left', 800, { stroke: '#10182e', strokeWidth: 4 });
    T(P.x + 14, P.y + 42, '트랙 간격 ' + d.pitch + ' nm · 레이저 점 ' + SPOT[a.las] + ' nm → ' + (ok ? '읽혀요' : '이웃 트랙까지 덮어 읽기 오류'), 13.5, ok ? '#9fe8c8' : '#ffb4b4', 'left', 800, { stroke: '#10182e', strokeWidth: 4 });
    // 홈 간격과 레이저 점의 크기 표시
    // 용량 비교
    panel(AP.cap.x, AP.cap.y, AP.cap.w, AP.cap.h, 14);
    T(AP.cap.x + AP.cap.w / 2, AP.cap.y + 24, '저장 용량 (한 면, GB)', 14, '#26324a', 'center', 800);
    const bx = AP.cap.x + (PHONE ? 84 : 74), bwMax = AP.cap.w - (PHONE ? 84 + 70 : 74 + 66), by0 = AP.cap.y + (PHONE ? 44 : 52), rh = PHONE ? 30 : 56;
    ['cd', 'dvd', 'bd'].forEach((k, i) => {
      const dd = DISC[k], y = by0 + i * rh, w = bwMax * dd.cap / 25, sel = k === a.disc;
      T(bx - 8, y + (PHONE ? 19 : 40), dd.name, 13, sel ? '#26324a' : '#8a95a8', 'right', 800);
      if (!PHONE) T(bx, y + 14, '레이저 ' + dd.laser + ' nm', 12.5, '#5d6879', 'left', 700);
      ctx.fillStyle = sel ? '#3867f4' : '#b9c7ea'; ctx.fillRect(bx, y + (PHONE ? 4 : 22), w, PHONE ? 20 : 24);
      T(bx + w + 6, y + (PHONE ? 19 : 40), dd.cap + ' GB', 13, '#26324a', 'left', 800, {});
    });
    // 활용 카드
    const C0 = AP.card;
    panel(C0.x, C0.y, C0.w, C0.h, 14);
    T(C0.x + 14, C0.y + 24, '전자 현미경은 이런 곳에 써요', 14.5, '#26324a', 'left', 800);
    const cards = [['🦠', '바이러스 · 세포 소기관', '광학 현미경으로 안 보이는 100 nm 크기의 구조를 선명하게 봐요.'], ['🔌', '반도체 불량 검사', '수 nm 폭의 회로가 제대로 만들어졌는지 확인해요.'], ['🪨', '신소재의 결정 구조', '원자가 어떻게 배열되어 있는지 확인해요.']];
    const cw = PHONE ? C0.w - 28 : (C0.w - 28 - 24) / 3, ch = PHONE ? 46 : 100;
    cards.forEach((c, i) => {
      const x = PHONE ? C0.x + 14 : C0.x + 14 + i * (cw + 12), y = PHONE ? C0.y + 36 + i * (ch + 6) : C0.y + 38;
      ctx.fillStyle = '#f3f6fc'; D.roundRect(x, y, cw, ch, 10); ctx.fill();
      T(x + 10, y + (PHONE ? 30 : 30), c[0], PHONE ? 24 : 26, '#26324a', 'left', 800);
      if (PHONE) { T(x + 46, y + 20, c[1], 13, '#26324a', 'left', 800); }
      else { T(x + 46, y + 28, c[1], 14, '#26324a', 'left', 800); textBlock(x + 12, y + 52, cw - 24, c[2], 13, '#5d6879', 18, 700); }
    });
    if (!PHONE) textBlock(C0.x + 14, C0.y + C0.h - 38, C0.w - 28, '※ 전자 현미경은 시료를 진공에 두고 전자 빔을 쏘아요. 그래서 살아 있는 세포는 볼 수 없어요. 전자는 전하를 띠어서 코일의 자기장이 렌즈처럼 전자의 경로를 굽혀 상을 맺어요.', 13, '#5d6879', 18, 700);
  }

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  function readouts() {
    let a, b, c, L1, L2, L3;
    if (S.mode === 'dbl') {
      L1 = '도착한 전자'; a = S.db.n.toLocaleString('ko-KR') + '개'; L2 = '열린 슬릿'; b = S.db.blocked ? '1개' : '2개'; L3 = '스크린의 모양'; c = S.db.n < 40 ? '점이 흩어져 있어요' : S.db.blocked ? (S.db.n < 300 ? '쌓는 중…' : '한 덩어리') : (S.db.n < 1500 ? '무늬가 생기는 중…' : '밝고 어두운 줄무늬');
    } else if (S.mode === 'wave') {
      const w = waveInfo();
      L1 = S.wv.part === 'e' ? '가속 전압 · 속력' : '질량 · 속력'; a = S.wv.part === 'e' ? fmtV(w.V) + ' · ' + sci(w.v, 1) + ' m/s' : '0.145 kg · ' + S.wv.vb + ' m/s';
      L2 = '운동량 p = mv'; b = sci(w.p, 1) + ' kg·m/s'; L3 = '물질파 파장 λ = h/p'; c = S.wv.part === 'e' ? fmtLam(w.lam) : sci(w.lam, 1) + ' m';
    } else if (S.mode === 'res') {
      L1 = '쓰는 파동'; a = S.rs.mic === 'light' ? '가시광선 ' + LAM_LIGHT + ' nm' : '전자 ' + fmtLam(lamE(V_EM)); L2 = '분해능'; b = S.rs.mic === 'light' ? '약 ' + Math.round(dminLight()) + ' nm' : '약 ' + EM_FLOOR + ' nm';
      L3 = S.rs.sp === 'two' ? '두 점 사이' : '시료'; c = S.rs.sp === 'two' ? fmtNm(sepNm()) + (resolved() ? ' (구분)' : ' (합쳐짐)') : (S.rs.sp === 'virus' ? '바이러스 100 nm' : 'DNA 지름 2 nm');
    } else {
      const d = DISC[S.ap.disc], ok = readOk(S.ap.disc, S.ap.las);
      L1 = '디스크 · 레이저'; a = d.name + ' · ' + S.ap.las + ' nm'; L2 = '트랙 간격 · 점 지름'; b = d.pitch + ' · ' + SPOT[S.ap.las] + ' nm'; L3 = '읽기'; c = ok ? '읽혀요' : '오류';
    }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  function setSlider(id, v) { const mu = Sound.muted; Sound.muted = true; const el = $('#' + id); el.value = v; el.dispatchEvent(new Event('input')); Sound.muted = mu; }
  const levels = [
    {
      title: '전자의 무늬: 알갱이가 만드는 줄무늬', short: '전자의 무늬', icon: '⚛️', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 전자는 분명 알갱이인데, 전자 현미경은 왜 “파동”의 짧은 파장 덕분에 더 작은 것을 볼 수 있을까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시들에서</b> 빛이 이중 슬릿에서 간섭하고(파동성), 광전 효과에서는 알갱이(광자)처럼 행동하는 것을 배웠어요. 이번에는 <b>전자</b>를 이중 슬릿에 쏘아 봐요.</div>' +
        '<p>전자총으로 전자를 <b>한 알씩</b> 쏘면 스크린에는 점이 하나씩 찍혀요. 점이 계속 쌓이면 어떤 모양이 될까요? 그리고 슬릿 하나를 막으면 어떻게 달라질까요?</p>',
      features: ['dbl'],
      setup() { clearScreen(); S.db.run = false; S.db.blocked = false; S.db.target = 10; S.db.best = { both: 0, one: 0 }; setScene('dbl'); },
      recap: '전자를 한 알씩 쏘아도 점이 쌓이면 밝고 어두운 줄무늬가 생겨요. 슬릿 하나를 막으면 무늬가 사라져요. 전자도 파동처럼 두 슬릿을 모두 지나 간섭해요.',
      summary: '<ul><li>전자를 <b>한 알씩</b> 쏘면 스크린에 점이 하나씩 찍혀요(전자는 알갱이처럼 한 곳에 도착). 그런데 점이 <b>수천 개</b> 쌓이면 <b>밝고 어두운 줄무늬</b>(간섭 무늬)가 나타나요.</li><li><b>한 슬릿을 막으면</b> 줄무늬가 사라지고 한 덩어리로 쌓여요. 두 슬릿이 모두 열려 있을 때만 간섭이 일어나요.</li><li>전자들이 서로 부딪쳐서 생기는 무늬가 아니에요. <b>전자 하나하나가 파동처럼</b> 두 슬릿을 지나 간섭하고, 도착하는 위치는 확률적으로 정해져요. → 물질도 파동성을 가져요.</li></ul>',
      missions: [
        {
          title: '전자를 쌓아 무늬 만들기',
          goal: '두 슬릿을 열고 전자를 <b>1만 개</b> 쌓으세요. 그다음 <b>슬릿 하나를 막고</b> 전자를 <b>1000개 이상</b> 다시 쌓아 비교해요.',
          hint: '“쏠 전자의 수”를 1만 개로 하고 ▶ 전자 쏘기를 눌러요. 끝나면 🚧 슬릿 하나 막기를 누르고 1000개로 바꿔 쏘아요.',
          setup() { clearScreen(); S.db.run = false; S.db.blocked = false; S.db.target = 10000; S.db.best = { both: 0, one: 0 }; setScene('dbl'); updateCtl(); },
          check: () => S.db.best.both >= TARGET_BOTH && S.db.best.one >= TARGET_ONE,
          hold: 0.3,
          status: () => mark(S.db.best.both >= TARGET_BOTH) + ' 두 슬릿 ' + Math.min(S.db.best.both, TARGET_BOTH).toLocaleString('ko-KR') + ' / 10,000개 &nbsp; ' + mark(S.db.best.one >= TARGET_ONE) + ' 한 슬릿 ' + Math.min(S.db.best.one, TARGET_ONE).toLocaleString('ko-KR') + ' / 1,000개',
          explain: '두 슬릿이 열려 있으면 1만 개쯤 쌓였을 때 <b>밝고 어두운 줄무늬</b>가 뚜렷해요. 한 슬릿을 막으면 줄무늬 없이 <b>한 덩어리</b>로 쌓여요. 전자가 슬릿을 한 알씩 지나가도 간섭이 생기므로, 전자 하나하나가 파동처럼 두 슬릿을 지나는 거예요.',
        },
        {
          type: 'quiz', title: '한 알씩 쏴도 무늬가 생기는 까닭',
          goal: '전자를 <b>한 알씩</b> 쏘았는데도 줄무늬가 생겼어요. 이것이 뜻하는 것은?',
          setup() { setScene('dbl'); },
          choices: ['전자들이 서로 부딪쳐 튕겨서 무늬가 생겼다', '전자 하나하나가 파동처럼 두 슬릿을 모두 지나 간섭하고, 도착하는 위치는 확률적으로 정해진다', '전자 하나가 둘로 쪼개져서 두 점을 찍는다', '스크린이 원래 줄무늬를 가지고 있다'],
          answer: 1,
          feedback: ['한 알씩 쏘았으므로 전자끼리 부딪칠 수 없어요. 그런데도 무늬가 생겼어요.', '', '전자는 항상 점 하나로 찍혀요. 쪼개지지 않아요.', '슬릿 하나를 막으면 무늬가 사라졌어요. 스크린 때문이 아니에요.'],
          explain: '전자가 한 알씩 지나가도 무늬가 생기는 것은 <b>전자 하나하나가 파동의 성질</b>을 갖기 때문이에요. 전자는 두 슬릿을 모두 지나는 파동처럼 간섭하고, 스크린에서는 한 점에 도착해요. 이것이 물질의 <b>파동성</b>이에요.',
        },
      ],
    },
    {
      title: '물질파: 입자의 파장', short: '물질파', icon: '〰️', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 전자가 파동처럼 간섭하는 것을 봤어요. 파동이라면 <b>파장</b>이 있어야 해요. 드브로이는 운동량 p인 입자가 <b>λ = h/p</b>의 파장을 가진다고 했어요. 이것을 <b>물질파</b>라고 해요.</div>' +
        '<p>전자를 전압 V로 가속하면 속력과 운동량이 커지고 파장은 짧아져요. 전자와 <b>야구공</b>(0.145 kg, 40 m/s)의 물질파를 비교해서, 일상의 물체에서는 왜 파동성이 보이지 않는지 알아봐요. (h = 6.63 × 10⁻³⁴ J·s)</p>',
      features: ['wave'],
      setup() { S.wv.part = 'e'; S.wv.idx = 0; S.wv.vb = 40; S.wv.showBall = false; S.wv.seenB = false; setSlider('sV', 0); setSlider('sVb', 40); setScene('wave'); },
      recap: '물질파의 파장은 λ = h/p예요. 전압이 클수록 전자의 운동량이 커서 파장이 짧아져요. 야구공의 파장은 10⁻³⁴ m로 너무 짧아서 파동성이 관찰되지 않아요.',
      summary: '<ul><li><b>물질파(드브로이파)</b>: 운동량 p = mv인 입자는 파장 <b>λ = h/p = h/(mv)</b>의 파동처럼 행동해요. (h = 6.63 × 10⁻³⁴ J·s)</li><li>전압 V로 가속한 전자의 파장은 <b>λ ≈ 1.23 ÷ √V (nm)</b>. 100 V → <b>0.123 nm</b>(원자 크기쯤), 10 kV → <b>0.0123 nm</b>, 100 kV → 약 0.0039 nm. 전압이 클수록 파장이 짧아져요. (상대론적 보정은 생략)</li><li><b>야구공</b>(0.145 kg, 40 m/s): p = 5.8 kg·m/s → λ = 6.63×10⁻³⁴ ÷ 5.8 ≈ <b>1.1×10⁻³⁴ m</b>. 원자 크기(10⁻¹⁰ m)보다 훨씬 작아 일상에서는 파동성이 보이지 않아요.</li></ul>',
      missions: [
        {
          title: '전자의 파장을 짧게 만들기',
          goal: '가속 전압 슬라이더를 올려서 전자의 파장을 <b>0.01 nm 이하</b>로 만드세요. 그리고 <b>⚾ 야구공</b>의 파장도 확인해 보세요.',
          hint: '파장은 전압의 제곱근에 반비례해요. 전압을 100배로 하면 파장이 1/10이 돼요. 슬라이더를 오른쪽 끝 쪽으로 옮겨요. ⚾ 버튼으로 야구공도 볼 수 있어요.',
          setup() { S.wv.part = 'e'; S.wv.idx = 0; S.wv.seenB = false; S.wv.seenE = false; setSlider('sV', 0); setScene('wave'); S.wv.showBall = false; updateCtl(); },
          check: () => S.wv.seenB && S.wv.seenE,
          hold: 0.4,
          status: () => mark(S.wv.seenE) + ' 전자 λ ≤ 0.01 nm (지금 ' + (lamE(lamV(S.wv.idx)) * 1e9).toFixed(4) + ' nm) &nbsp; ' + mark(S.wv.seenB) + ' 야구공 확인',
          explain: '전자의 파장은 λ = 1.23 ÷ √V (nm)예요. 0.01 nm 이하가 되려면 √V ≥ 123, 곧 V ≥ 약 15,000 V(15 kV)가 필요해요. 10 kV에서는 0.0123 nm, 100 kV에서는 약 0.0039 nm예요. 전압이 클수록 전자가 빨라지고 운동량이 커져 파장이 짧아져요.',
        },
        {
          title: '야구공의 물질파 계산하기', manual: true,
          goal: '야구공(0.145 kg, 40 m/s)의 <b>운동량 p</b>(kg·m/s)와 <b>파장 λ = h/p</b>가 10의 몇 제곱 m쯤인지 계산해 쓰세요. (h = 6.63×10⁻³⁴ J·s)',
          hint: 'p = 0.145 × 40 = 5.8 kg·m/s예요. λ = 6.63×10⁻³⁴ ÷ 5.8 ≈ 1.1×10⁻³⁴ m이므로 10의 −34제곱 m쯤이에요.',
          setup() { S.wv.showBall = true; $('#inP').value = ''; $('#inExp').value = ''; ['inP', 'inExp'].forEach((i) => $('#' + i).classList.remove('ok', 'bad')); setScene('wave'); updateCtl(); },
          check() {
            const P = parseFloat($('#inP').value), X = parseFloat($('#inExp').value);
            const fl = (id, ok) => { const el = $('#' + id); if (!ok && !el.classList.contains('bad')) { el.classList.remove('ok'); void el.offsetWidth; el.classList.add('bad'); } if (ok) { el.classList.remove('bad'); el.classList.add('ok'); } };
            if (!isFinite(P) || !isFinite(X)) return '운동량과 지수 두 칸을 모두 숫자로 써 주세요.';
            const okP = Math.abs(P - 5.8) <= 0.15, okX = X === -34;
            fl('inP', okP); fl('inExp', okX);
            if (okP && okX) return true;
            return (okP ? '' : '운동량은 p = m × v = 0.145 × 40이에요. ') + (okX ? '' : 'λ = h ÷ p = 6.63×10⁻³⁴ ÷ 5.8 ≈ 1.1×10⁻³⁴ m이므로 지수는 −34예요.');
          },
          status: () => '야구공 p = mv, λ = h/p',
          explain: 'p = mv = 0.145 × 40 = <b>5.8 kg·m/s</b>, λ = h/p = 6.63×10⁻³⁴ ÷ 5.8 ≈ <b>1.1×10⁻³⁴ m</b>예요. 원자 크기(약 10⁻¹⁰ m)의 10⁻²⁴배밖에 되지 않아서 어떤 틈이나 장애물로도 야구공의 파동성을 관찰할 수 없어요.',
        },
        {
          type: 'quiz', title: '야구공에서 파동성이 안 보이는 까닭',
          goal: '야구공도 물질파를 가지는데, 일상에서 야구공이 간섭이나 회절을 보이지 않는 까닭은?',
          setup() { S.wv.showBall = false; setScene('wave'); updateCtl(); },
          choices: ['야구공은 파동이 아니라 입자일 뿐이라서', '파장이 원자 크기보다도 훨씬 짧아(약 10⁻³⁴ m) 간섭·회절을 관찰할 만한 틈이 없어서', '야구공이 너무 빨라서', '야구공에는 전자가 없어서'],
          answer: 1,
          feedback: ['모든 물질은 물질파를 가져요. 야구공도 마찬가지예요. 다만 파장이 문제예요.', '', '속력이 크면 오히려 운동량이 커서 파장이 더 짧아져요. 그것이 이유예요.', '전자의 유무와 상관없이 모든 물체가 물질파를 가져요.'],
          explain: '야구공의 파장은 약 1.1×10⁻³⁴ m로 원자 크기(10⁻¹⁰ m)보다도 훨씬 짧아서, 간섭이나 회절이 눈에 띄는 크기의 틈이 없어요. 전자는 질량이 아주 작아서 파장이 원자 크기쯤이 되어 파동성이 드러나요. 입자도 파동처럼 행동하는 것을 물질의 <b>이중성</b>이라고 해요.',
        },
      ],
    },
    {
      title: '분해능: 짧은 파장이 더 작은 것을 본다', short: '분해능', icon: '🔬', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 전압이 클수록 전자의 파장이 짧아진다는 것을 알았어요. 그런데 파장이 짧으면 무엇이 좋을까요? 현미경으로 <b>가까이 붙은 두 점</b>을 구분할 수 있는 최소 거리(<b>분해능</b>)는 쓰는 파동의 파장이 짧을수록 작아져요.</div>' +
        '<p>이 모형에서는 두 점이 <b>파장의 약 0.36배</b>보다 가까우면 한 덩어리로 보여요. 가시광선(550 nm)을 쓰는 <b>광학 현미경</b>의 분해능은 약 200 nm, 10 kV 전자(0.0123 nm)를 쓰는 <b>전자 현미경</b>의 분해능은 렌즈의 한계 때문에 약 0.1 nm예요.</p>',
      features: ['res', 'spec'],
      setup() { S.rs.mic = 'light'; S.rs.sp = 'two'; S.rs.idx = 50; S.rs.seen = { lr: false, lm: false, er: false, vl: false, ve: false, de: false }; S.rs.hold = {}; setSlider('sSep', 50); setScene('res'); },
      recap: '파장이 짧을수록 더 가까운 두 점을 구분할 수 있어요. 전자의 파장은 가시광선보다 훨씬 짧아서 전자 현미경은 바이러스나 DNA까지 볼 수 있어요.',
      summary: '<ul><li><b>분해능</b>: 두 점을 구분해서 볼 수 있는 가장 가까운 거리. 쓰는 파동의 <b>파장이 짧을수록 작아져요</b>.</li><li>광학 현미경(가시광선 550 nm)의 분해능은 약 <b>200 nm</b>이라 100 nm 크기의 바이러스는 흐릿해요. 전자 현미경(전자 파장 0.0123 nm)의 분해능은 렌즈 수차 때문에 파장보다 크지만 약 <b>0.1 nm</b>예요.</li><li>그래서 전자 현미경으로 바이러스, DNA(지름 약 2 nm) 같은 아주 작은 구조를 볼 수 있어요.</li><li>전자는 전하를 띠어서 <b>코일의 자기장</b>이 전자의 경로를 굽히는 렌즈 역할을 해요. 전자가 공기와 부딪치지 않도록 시료는 <b>진공</b>에 둬요.</li></ul>',
      missions: [
        {
          title: '광학 현미경의 한계 찾기',
          goal: '<b>광학 현미경</b>으로 두 점 사이의 거리를 줄이며, 구분되던 두 점이 <b>한 덩어리로 합쳐지는</b> 것을 확인하세요. 그리고 <b>전자 현미경</b>으로 바꾸면 같은 거리에서 다시 구분되는 것도 확인하세요.',
          hint: '광학 현미경으로 두 점 사이를 약 200~400 nm에서 시작해 150 nm쯤으로 줄여요. 합쳐진 상태에서 🔭 전자 현미경 버튼을 눌러요.',
          setup() { S.rs.mic = 'light'; S.rs.sp = 'two'; setSlider('sSep', 55); S.rs.seen = { lr: false, lm: false, er: false, vl: false, ve: false, de: false }; S.rs.hold = {}; setScene('res'); updateCtl(); },
          check: () => S.rs.seen.lr && S.rs.seen.lm && S.rs.seen.er,
          hold: 0.3,
          status: () => mark(S.rs.seen.lr) + ' 광학: 구분됨(약 ' + Math.round(dminLight()) + ' nm 이상) &nbsp; ' + mark(S.rs.seen.lm) + ' 광학: 합쳐짐 &nbsp; ' + mark(S.rs.seen.er) + ' 전자: 같은 거리에서 구분',
          explain: '광학 현미경(550 nm)의 분해능은 0.36 × 550 ≈ <b>198 nm</b>예요. 두 점 사이가 그보다 가까우면 상이 겹쳐 한 덩어리가 돼요. 전자 현미경의 분해능은 약 0.1 nm라서 200 nm보다 훨씬 가까운 두 점도 구분해요.',
        },
        {
          title: '바이러스와 DNA 관찰하기',
          goal: '시료를 <b>바이러스</b>로 바꿔 광학 현미경과 전자 현미경으로 비교하고, <b>DNA</b>를 전자 현미경으로 관찰하세요.',
          hint: '🦠 바이러스를 고른 뒤 현미경을 바꿔 가며 비교해요. 그다음 🧬 DNA를 고르고 전자 현미경으로 봐요. 각각 1초쯤 보면 돼요.',
          setup() { S.rs.mic = 'light'; S.rs.sp = 'virus'; S.rs.seen = Object.assign({}, S.rs.seen, { vl: false, ve: false, de: false }); S.rs.hold = {}; setScene('res'); updateCtl(); },
          check: () => S.rs.seen.vl && S.rs.seen.ve && S.rs.seen.de,
          hold: 0.3,
          status: () => mark(S.rs.seen.vl) + ' 바이러스(광학) &nbsp; ' + mark(S.rs.seen.ve) + ' 바이러스(전자) &nbsp; ' + mark(S.rs.seen.de) + ' DNA(전자)',
          explain: '지름 약 100 nm인 바이러스는 광학 현미경의 분해능(약 200 nm)과 비슷해서 <b>흐릿한 덩어리</b>로 보이지만, 전자 현미경에서는 <b>돌기까지 선명해요</b>. DNA의 이중나선(지름 약 2 nm, 염기쌍 간격 0.34 nm)도 분해능 0.1 nm인 전자 현미경으로만 볼 수 있어요.',
        },
        {
          type: 'quiz', title: '전자 현미경의 코일과 진공',
          goal: '전자 현미경에는 <b>코일</b>(자기장)이 쓰이고, 시료를 <b>진공</b>에 둬요. 그 까닭으로 옳은 것은?',
          setup() { setScene('res'); },
          choices: ['코일의 열로 시료를 녹이려고, 진공은 시료를 차게 하려고', '전자는 전하를 띠어 자기장에서 힘을 받으므로 코일이 전자의 경로를 굽히는 렌즈 역할을 하고, 진공이어야 전자가 공기 입자에 흩어지지 않아서', '빛을 모으는 데 코일이 필요하고, 진공은 빛을 밝게 하려고', '전자가 중성이라 자석에 끌려서'],
          answer: 1,
          feedback: ['열이나 온도 때문이 아니에요. 전자가 힘을 받는 성질을 떠올려 보세요.', '', '전자 현미경은 빛이 아니라 전자를 써요.', '전자는 음전하를 띠어요. 중성이 아니에요.'],
          explain: '전자는 <b>전하를 띠므로 자기장에서 힘</b>을 받아 경로가 휘어져요. 코일의 자기장이 전자 빔을 모으는 <b>전자기 렌즈</b>가 돼요. 또 공기가 있으면 전자가 공기 입자와 부딪쳐 흩어지므로 시료와 경로를 <b>진공</b>으로 해요.',
        },
      ],
    },
    {
      title: '응용: 광디스크와 전자 현미경', short: '응용', icon: '💿', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 파장이 짧을수록 더 작은 것을 구분한다는 것을 알았어요. 이 원리는 영상 정보를 저장하는 <b>광디스크</b>(CD · DVD · 블루레이)에도 쓰여요.</div>' +
        '<p>광디스크는 표면의 작은 <b>홈</b>(피트)을 <b>레이저 점</b>으로 읽어 0과 1을 얻어요. 레이저 점은 파장이 짧을수록 작아져서 더 촘촘한 홈을 읽을 수 있고, 같은 디스크에 더 많은 정보를 저장해요. CD는 780 nm, DVD는 650 nm, 블루레이는 405 nm의 레이저를 써요.</p>',
      features: ['app'],
      setup() { S.ap.disc = 'cd'; S.ap.las = 780; S.ap.seen = { bdOk: false, bdFail: false, dvdOk: false }; S.ap.hold = {}; S.ap.showTool = false; setScene('app'); },
      recap: '레이저의 파장이 짧을수록 점이 작아져서 홈 간격이 좁은 디스크를 읽을 수 있어요. 그래서 블루레이는 DVD보다 같은 크기에 훨씬 많은 정보를 저장해요. 전자 현미경은 파장이 짧은 전자로 아주 작은 구조를 봐요.',
      summary: '<ul><li><b>광디스크</b>: 표면의 홈을 레이저 점으로 읽어 0과 1을 얻어요. 레이저 점이 이웃한 트랙까지 덮으면 읽을 수 없어요.</li><li>CD(780 nm, 트랙 간격 1600 nm, 약 0.7 GB), DVD(650 nm, 740 nm, 약 4.7 GB), 블루레이(405 nm, 320 nm, 약 25 GB). <b>파장이 짧을수록</b> 점이 작아져 <b>저장 용량이 커져요</b>.</li><li>전자 현미경의 활용: 바이러스와 세포 소기관, 반도체 불량 검사, 신소재의 결정 구조. 시료를 진공에 두고 전자 빔을 쏘므로 살아 있는 세포는 볼 수 없어요.</li><li>이렇게 <b>빛은 파동이면서 입자</b>이고 <b>전자는 입자이면서 파동</b>이에요(이중성).</li></ul>',
      missions: [
        {
          title: '디스크와 레이저 짝 맞추기',
          goal: '<b>블루레이</b>를 405 nm 레이저로 읽고, 같은 디스크를 <b>CD용 레이저(780 nm)</b>로 읽으면 어떻게 되는지 보세요. 그리고 <b>DVD</b>를 650 nm로 읽으세요.',
          hint: '디스크와 레이저를 바꿔 가며 레이저 점(원)이 트랙 한 줄 안에 들어가는지 봐요. 점이 이웃 트랙을 덮으면 빨간색으로 오류가 나요. 각각 1초쯤 보여요.',
          setup() { S.ap.disc = 'cd'; S.ap.las = 780; S.ap.seen = { bdOk: false, bdFail: false, dvdOk: false }; S.ap.hold = {}; S.ap.showTool = false; setScene('app'); updateCtl(); },
          check: () => S.ap.seen.bdOk && S.ap.seen.bdFail && S.ap.seen.dvdOk,
          hold: 0.3,
          status: () => mark(S.ap.seen.bdOk) + ' 블루레이 + 405 nm &nbsp; ' + mark(S.ap.seen.bdFail) + ' 블루레이 + 780 nm (오류) &nbsp; ' + mark(S.ap.seen.dvdOk) + ' DVD + 650 nm',
          explain: '블루레이의 트랙 간격은 320 nm인데 405 nm 레이저의 점은 약 240 nm라서 한 트랙만 읽혀요. CD용 레이저의 점(약 880 nm)은 이웃 트랙까지 덮어 오류가 나요. DVD는 트랙 간격 740 nm에 650 nm 레이저의 점(약 550 nm)이 알맞아요.',
        },
        {
          title: '알맞은 현미경 고르기', manual: true,
          goal: '네 가지 관찰에 알맞은 현미경을 골라 문장을 완성하세요.',
          hint: '분해능이 필요한 아주 작은 구조에는 전자 현미경이에요. 하지만 전자 현미경은 시료를 진공에 두고 전자 빔을 쏘아서 살아 있는 세포는 볼 수 없어요.',
          setup() { S.ap.showTool = true; TOOL.reset(); setScene('app'); updateCtl(); },
          check: () => TOOL.grade(null, '빨간 칸을 다시 골라 보세요. 크기가 아주 작은지, 살아 있는 상태로 봐야 하는지 생각해 보세요.'),
          status: () => '고른 문장 ' + TOOL.count() + ' / 4',
          explain: '바이러스(100 nm), 반도체 회로(수 nm), 결정 구조(원자 배열)는 광학 현미경의 분해능(약 200 nm)보다 작아서 <b>전자 현미경</b>이 필요해요. 그러나 전자 현미경은 시료를 <b>진공</b>에 두고 전자 빔을 쏘므로 살아 있는 세포는 볼 수 없어서, 살아 움직이는 세포는 <b>광학 현미경</b>으로 관찰해요.',
        },
        {
          type: 'quiz', title: '블루레이의 용량이 큰 까닭',
          goal: '블루레이가 DVD와 같은 크기인데도 훨씬 많은 정보를 저장하는 까닭은?',
          setup() { S.ap.showTool = false; setScene('app'); updateCtl(); },
          choices: ['디스크의 크기가 훨씬 커서', '더 짧은 파장(405 nm)의 레이저는 점이 더 작아서 더 촘촘한 홈을 읽을 수 있고, 같은 면적에 더 많은 정보를 담을 수 있어서', '레이저가 더 밝아서', '디스크의 재질이 달라서'],
          answer: 1,
          feedback: ['블루레이와 DVD의 크기는 같아요. 홈의 촘촘함이 달라요.', '', '밝기가 아니라 레이저 점의 크기가 중요해요.', '재질이 아니라 읽을 수 있는 홈의 크기가 달라서예요.'],
          explain: '레이저의 파장이 짧을수록 모을 수 있는 점이 작아져요. 그래서 트랙 간격이 320 nm로 좁은 블루레이도 읽을 수 있어서 같은 크기의 디스크에 DVD(약 4.7 GB)의 5배가 넘는 약 25 GB를 저장해요. 전자 현미경도 짧은 파장 덕분에 더 작은 것을 보는 같은 원리예요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hp-matter-wave', mount: '#game', badge: '물질파 박사', homeHref: '../../index.html#hp',
    featureLabels: { dbl: '⚛️ 전자총 · 이중 슬릿 · 스크린', wave: '〰️ 물질파 파장 · 전자와 야구공', res: '🔬 광학·전자 현미경 상 비교', spec: '🧫 바이러스 · DNA 시료', app: '💿 광디스크와 전자 현미경 활용' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  updateCtl();   // 화면(scene)은 단계 설정(setup)이 이미 맞춰 놓았어요 (이어하기 포함)
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t; S.dt = dt;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    view.apply();
    stepDbl(dt); stepRes(dt); stepApp(dt);
    if (S.mode === 'wave') { S.wv.seenE = S.wv.seenE || (S.wv.part === 'e' && lamE(lamV(S.wv.idx)) * 1e9 <= 0.01 + 1e-12); }
    ctx.clearRect(0, 0, VW, VH);
    if (S.mode === 'dbl') drawDbl(); else if (S.mode === 'wave') drawWave(); else if (S.mode === 'res') drawRes(); else drawApp();
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, DG, lamE, lamV, sepOf, dminLight, dminElec, resolved, readOk, DISC, SPOT, TOOL, setScene, clearScreen, waveInfo, ballLam, TARGET_BOTH, TARGET_ONE, fmtNm, fmtV, land,
    get game() { return game; },
  };

})();
