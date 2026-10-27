/* =========================================================
   전자기와 양자 Ⅱ. 빛과 정보 통신 - 회절과 홀로그램 (단원 2차시)
   성취기준 [12전자02-01] 빛의 간섭과 회절을 알고, 홀로그램 등 현대의 정밀 기술에 활용되는 예를 찾을 수 있다.
   ① 실험: 회절 (물결 탱크의 틈 폭·파장, 레이저와 스크린, 소리와 빛)
   ② 모형: 분해능 (두 점광원의 회절 원반, 구경·파장)
   ③ 모형: 홀로그램 기록 (물체광 + 기준광 → 필름의 간섭무늬, 방진대)
   ④ 적용: 재생과 활용 (기준광만 비춰 입체상 재생, 시차, 필름 조각, 활용 예)
   회절과 분해능은 정성적으로만 다뤄요: 단일 슬릿 세기 식, 분해능 식, 프라운호퍼·프레넬 구분,
   회절 격자 방정식, 홀로그램 간섭무늬 식, 부피 홀로그램(브래그 조건)은 화면에 쓰지 않아요.
   ========================================================= */
(function () {
  'use strict';
  const PH0 = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PH0 ? 480 : 800, VH = PH0 ? 584 : 560;
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
  const LASER_NM = 633, SCREEN_L = 2.0;        // 레이저 파장 (nm), 스크린까지 거리 (m)
  const SCR_MM = 80;                           // 스크린에 보이는 범위 ±80 mm
  const SLITS = { '0.5': 0.5, '0.1': 0.1, '0.02': 0.02 };   // 틈 폭 (mm)
  const STRAIGHT = 4.0, SPREAD = 1.2;          // 틈 폭이 파장의 몇 배 이상이면 '거의 직진', 이하이면 '크게 퍼짐'
  const R0_RED_SMALL = 48;                     // 빨강(650 nm) · 작은 구경에서 회절 원반의 첫 어두운 고리 반지름 (px, 화면 눈금)
  const AP_SIZE = { small: 1.0, large: 2.5 };  // 렌즈 구경 (상대값)
  const PX_PER_UNIT = 6;                       // 두 점 사이 간격 1눈금 = 상 평면에서 6 px
  const DIP_OK = 0.10;                         // 가운데가 이만큼 이상 패이면 '구분됨'
  const ONE_RATIO = 0.75;                      // 간격이 r0의 이 비율보다 작으면 '한 점'
  const FILM_FULL = 95, FILM_PIECE = 22;       // 필름 전체 / 한 조각의 반쪽 높이 (눈금)
  const EYE_X = 120, SPH_X = 70, SPH_R = 28, STAR_X = 190, STAR_R = 24;   // 재생 장면: 눈, 앞 물체(공), 뒤 물체(별)의 필름에서 거리와 크기
  const FRINGE_NM = 0.5;                       // 간섭무늬 간격 (μm, 파장 정도)
  const gam = (v) => Math.pow(Math.max(0, Math.min(1, v)), 1 / 2.2);

  /* ---------- 장면 배치 ---------- */
  const MA = PHONE ? { x: 8, y: 8, w: 464, h: 388 } : { x: 12, y: 12, w: 776, h: 414 };
  const BOT = PHONE ? { x: 8, y: 404, w: 464, h: 170 } : { x: 12, y: 436, w: 776, h: 112 };

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'diff', t: 0, fade: 0, dt: 0.016,
    show: { selD: false, selR: false, selH: false, selP: false, rec: true },
    df: { sub: 'tank', aCm: 8.0, lamCm: 2.0, slit: '0.5', door: 'sound', seenStraight: false, seenSpread: false, hold: 0, holdK: '', seenSlits: {}, ph: 0 },
    rs: { s: 8.0, ap: 'small', col: '650', combos: {}, held: 0, sD: 8.0 },
    hl: { view: 'rec', table: true, vib: 0.30, placed: {}, drag: null, beams: 0, expo: 0, vibSeen: false, vibHold: 0, items: null, ping: 0 },
    pl: { e: 0, eD: 0, cut: 'full', ref: true, seenStar: false, cutSeen: false, hold: 0 },
  };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const MODE_LABEL = { diff: '🌊 회절', res: '🔍 분해능', holo: '🧪 홀로그램 기록', play: '🎞️ 재생과 활용' };

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
      if (on && sub && S.mode === 'diff') on = sub === S.df.sub;
      const dm = n.getAttribute('data-match');
      if (on && dm) on = !!S.show[dm] && (dm !== 'rec' || S.hl.view === 'rec');
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    dfSeg.set(S.df.sub); slSeg.set(S.df.slit); drSeg.set(S.df.door);
    apSeg2.set(S.rs.ap); colSeg.set(S.rs.col); hvSeg.set(S.hl.view); cutSeg.set(S.pl.cut);
    $('#bTable').textContent = S.hl.table ? '방진대 끄기' : '방진대 켜기';
    $('#bTable').style.outline = S.hl.table ? '3px solid var(--good)' : '';
    $('#bRef').textContent = S.pl.ref ? '기준광 끄기' : '기준광 켜기';
    $('#bRef').style.outline = S.pl.ref ? '3px solid var(--good)' : '';
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));

  /* ---------- 컨트롤 연결 ---------- */
  const dfSeg = bindSeg('dfSeg', (v) => { S.df.sub = v; updateCtl(); });
  const slSeg = bindSeg('slSeg', (v) => { S.df.slit = v; S.df.seenSlits[v] = true; updateCtl(); });
  const drSeg = bindSeg('drSeg', (v) => { S.df.door = v; updateCtl(); });
  const apSeg2 = bindSeg('apSeg2', (v) => { S.rs.ap = v; updateCtl(); });
  const colSeg = bindSeg('colSeg', (v) => { S.rs.col = v; updateCtl(); });
  const hvSeg = bindSeg('hvSeg', (v) => { S.hl.view = v; updateCtl(); });
  const cutSeg = bindSeg('cutSeg', (v) => { S.pl.cut = v; if (v === 'piece') S.pl.cutSeen = true; updateCtl(); });
  const slA = bindSlider('sA', (v) => (v / 10).toFixed(1) + ' cm', (v) => { S.df.aCm = v / 10; });
  const slL = bindSlider('sL', (v) => (v / 10).toFixed(1) + ' cm', (v) => { S.df.lamCm = v / 10; });
  const slS = bindSlider('sS', (v) => (v / 10).toFixed(1), (v) => { S.rs.s = v / 10; });
  const slV = bindSlider('sV', (v) => (v / 100).toFixed(2) + ' λ', (v) => { S.hl.vib = v / 100; });
  const slE = bindSlider('sE', (v) => (v === 0 ? '0 (정면)' : (v < 0 ? '위 ' : '아래 ') + Math.abs(v)), (v) => { S.pl.e = +v; });
  $('#bTable').addEventListener('click', () => { Sound.click(); S.hl.table = !S.hl.table; updateCtl(); });
  $('#bRef').addEventListener('click', () => { Sound.click(); S.pl.ref = !S.pl.ref; updateCtl(); });

  const SEL_D = mkSelRows('selD', [
    { q: '틈 폭이 <b>좁을수록</b> 회절 무늬는', opts: ['더 크게 퍼져요', '덜 퍼져요'], ans: 0 },
    { q: '파장이 <b>길수록</b> 회절은', opts: ['더 크게 일어나요', '덜 일어나요'], ans: 0 },
    { q: '퍼짐이 가장 크게 나타나는 때는 틈 폭이 파장과', opts: ['비슷하거나 더 작을 때', '훨씬 클 때'], ans: 0 },
  ]);
  const SEL_R = mkSelRows('selR', [
    { q: '가장 가까운 두 점까지 구분하는 조합은', opts: ['🔴 빨강 · 작은 구경', '🔵 파랑 · 작은 구경', '🔴 빨강 · 큰 구경', '🔵 파랑 · 큰 구경'], ans: 3 },
    { q: '두 점이 가장 멀어야 겨우 구분되는 조합은', opts: ['🔴 빨강 · 작은 구경', '🔵 파랑 · 작은 구경', '🔴 빨강 · 큰 구경', '🔵 파랑 · 큰 구경'], ans: 0 },
    { q: '전자 현미경이 광학 현미경보다 분해능이 좋은 까닭은 전자의 물질파 파장이', opts: ['가시광선보다 훨씬 짧기 때문이에요', '가시광선보다 훨씬 길기 때문이에요'], ans: 0 },
  ]);
  const SEL_H = mkSelRows('selH', [
    { q: '필름에 간섭무늬가 생기려면 물체광과 필름에서 만나야 하는 빛은', opts: ['기준광', '방진대의 빛', '카메라 렌즈의 빛'], ans: 0 },
    { q: '기준광을 함께 쓰면 필름이 물체광의 무엇까지 기록할 수 있나요?', opts: ['밝기만', '밝기와 위상(빛이 오는 방향의 정보)'], ans: 1 },
    { q: '필름에서 밝은 줄무늬가 생긴 곳은 두 빛이', opts: ['보강한 곳', '상쇄한 곳'], ans: 0 },
    { q: '바닥이 파장 정도로 흔들리면 간섭무늬는', opts: ['더 선명해져요', '흐려지고 지워져요'], ans: 1 },
  ]);
  const SEL_P = mkSelRows('selP', [
    { q: '필름을 조각내도 한 조각으로 보면', opts: ['상 전체가 보이지만 시야가 좁아져요', '상의 일부만 남아요'], ans: 0 },
    { q: '신용카드·지폐의 홀로그램은 주로', opts: ['위조를 막는 데 쓰여요', '사진을 찍는 데 쓰여요'], ans: 0 },
    { q: '홀로그래피 간섭계는 물체의', opts: ['미세한 진동과 변형을 재는 데 쓰여요', '온도를 재는 데 쓰여요'], ans: 0 },
    { q: '홀로그램 카드를 보는 각도에 따라 모습이 달라 보이는 까닭은 필름이', opts: ['회절 격자처럼 작용해 보는 방향마다 다른 빛이 오기 때문이에요', '각도마다 다른 그림이 인쇄되어 있기 때문이에요'], ans: 0 },
  ]);

  /* ---------- 이미지 버퍼 (픽셀 단위로 그린 뒤 확대해서 붙여요) ---------- */
  function makeBuf(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); return { c, g, img: g.createImageData(w, h), w, h }; }
  function flush(b, x, y, w, h) { b.g.putImageData(b.img, 0, 0); ctx.save(); ctx.imageSmoothingEnabled = true; ctx.drawImage(b.c, x, y, w, h); ctx.restore(); }

  /* ================= 물결 장(허이겐스 합성): 틈 폭 a, 파장 λ ================= */
  function Field(cols, rows, cell, wallX, wallT) {
    const F = { cols, rows, cell, wallX, wallT, A: new Float32Array(cols * rows), B: new Float32Array(cols * rows), key: '', gain: 1, buf: makeBuf(cols, rows), aPx: 0, lamPx: 1 };
    F.set = function (aPx, lamPx) {
      const key = aPx.toFixed(2) + '|' + lamPx.toFixed(2);
      if (key === F.key) return; F.key = key; F.aPx = aPx; F.lamPx = lamPx;
      const k = TAU / lamPx, N = clamp(Math.ceil(aPx / (lamPx / 4)), 3, 48), step = aPx / N, yc = rows * cell / 2, x0 = wallX + wallT;
      let mx = 0;
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const px = (i + 0.5) * cell, py = (j + 0.5) * cell, id = j * cols + i;
        if (px <= x0) { F.A[id] = 0; F.B[id] = 0; continue; }
        let a = 0, b = 0;
        for (let s = 0; s < N; s++) {
          const sy = yc - aPx / 2 + (s + 0.5) * step, dx = px - x0, dy = py - sy, r = Math.max(2, Math.sqrt(dx * dx + dy * dy)), w = step / Math.sqrt(r * lamPx);
          a += w * Math.cos(k * r); b += w * Math.sin(k * r);
        }
        F.A[id] = a; F.B[id] = b;
        if (px > x0 + 2 * lamPx) mx = Math.max(mx, Math.hypot(a, b));
      }
      F.gain = mx > 1e-6 ? 0.95 / mx : 1;
    };
    F.amp = function (px, py) { const i = clamp(Math.floor(px / cell), 0, cols - 1), j = clamp(Math.floor(py / cell), 0, rows - 1); return Math.hypot(F.A[j * cols + i], F.B[j * cols + i]) * F.gain; };
    F.paint = function (x, y, t, vpx, slitOn) {
      const k = TAU / F.lamPx, om = k * vpx, c = Math.cos(om * t), s = Math.sin(om * t), d = F.buf.img.data, yc = rows * cell / 2, x0 = wallX + wallT;
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const px = (i + 0.5) * cell, py = (j + 0.5) * cell, id = j * cols + i, o = id * 4;
        let v, r, g, b;
        const inWall = px >= wallX && px < x0 && Math.abs(py - yc) > F.aPx / 2;
        if (inWall) { r = 92; g = 100; b = 114; }
        else {
          if (px < x0) v = Math.cos(k * px - om * t) * (slitOn ? 1 : 1);
          else v = clamp(F.gain * (F.A[id] * c + F.B[id] * s), -1, 1);
          const m = v < 0 ? -v : v;
          if (v >= 0) { r = 61 + (235 - 61) * m; g = 142 + (248 - 142) * m; b = 210 + (255 - 210) * m; }
          else { r = 61 + (14 - 61) * m; g = 142 + (58 - 142) * m; b = 210 + (120 - 210) * m; }
        }
        d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = 255;
      }
      flush(F.buf, x, y, cols * cell, rows * cell);
    };
    return F;
  }
  const TK = PHONE ? { x: MA.x + 6, y: MA.y + 30, w: 452, h: 196, cell: 4, wall: 96, wt: 14, sc: 9 } : { x: MA.x + 10, y: MA.y + 34, w: 520, h: 336, cell: 4, wall: 130, wt: 14, sc: 12 };
  const TANK = Field(TK.w / TK.cell, TK.h / TK.cell, TK.cell, TK.wall, TK.wt);
  const DOOR = Field(TK.w / TK.cell, TK.h / TK.cell, TK.cell, PHONE ? 150 : 200, TK.wt);
  const DOOR_A = PHONE ? 54 : 96, DOOR_LAM = DOOR_A / 2;      // 문 폭 1 m = 문 장면에서 DOOR_A px, 소리의 파장은 문 폭의 절반 (0.5 m)
  const MIC = { x: (PHONE ? 150 : 200) + TK.wt + (PHONE ? 90 : 150), y: TK.h / 2 + (PHONE ? 78 : 128) };
  const ratioNow = () => S.df.aCm / S.df.lamCm;
  const spreadKind = () => (ratioNow() >= STRAIGHT ? 'straight' : ratioNow() <= SPREAD ? 'spread' : 'mild');

  /* ================= ① 회절 ================= */
  function stepDiff(dt) {
    const D1 = S.df; D1.ph += dt;
    if (S.mode === 'diff' && D1.sub === 'tank') {
      const k = spreadKind();
      if (k === D1.holdK) D1.hold += dt; else { D1.holdK = k; D1.hold = 0; }
      if (D1.hold > 0.8) { if (k === 'straight') D1.seenStraight = true; if (k === 'spread') D1.seenSpread = true; }
    }
  }
  const lasI = (aMm, xMm) => {                                 // 단일 틈 무늬의 상대 세기 (그림에만 쓰고 식은 보여 주지 않아요)
    const u = Math.PI * (aMm * 1e-3) * (xMm * 1e-3) / (LASER_NM * 1e-9 * SCREEN_L);
    return Math.abs(u) < 1e-6 ? 1 : Math.pow(Math.sin(u) / u, 2);
  };
  const lasHalf = (aMm) => LASER_NM * 1e-9 * SCREEN_L / (aMm * 1e-3) * 1e3;   // 중앙 밝은 무늬의 반쪽 폭 (mm)
  function drawDiff() {
    panel(MA.x, MA.y, MA.w, MA.h, 14);
    if (S.df.sub === 'tank') drawTank();
    else if (S.df.sub === 'laser') drawLaser();
    else drawDoor();
    drawDiffBottom();
  }
  function drawTank() {
    const D1 = S.df, aPx = D1.aCm * TK.sc, lamPx = D1.lamCm * TK.sc, vpx = 4 * TK.sc;
    TANK.set(aPx, lamPx);
    T(MA.x + 14, MA.y + 22, '🌊 물결 탱크 (위에서 본 모습)', PHONE ? 13.5 : 15, '#26324a', 'left', 800);
    TANK.paint(TK.x, TK.y, S.t, vpx, true);
    ctx.save(); ctx.strokeStyle = '#7b8798'; ctx.lineWidth = 2; ctx.strokeRect(TK.x, TK.y, TK.w, TK.h); ctx.restore();
    // 벽 윗면 느낌
    const yc = TK.y + TK.h / 2;
    // 직진할 때의 범위 (점선)
    const x0 = TK.x + TK.wall + TK.wt;
    ctx.save(); ctx.setLineDash([7, 6]); ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2;
    [-1, 1].forEach((sg) => { ctx.beginPath(); ctx.moveTo(x0, yc + sg * aPx / 2); ctx.lineTo(TK.x + TK.w, yc + sg * aPx / 2); ctx.stroke(); });
    ctx.restore();
    D.arrow(TK.x + 24, TK.y + 24, TK.x + 24 + 54, TK.y + 24, { color: '#ffffff', width: 3, head: 11 });
    T(TK.x + 86, TK.y + 29, '물결의 진행', 12.5, '#ffffff', 'left', 800, { stroke: 'rgba(20,50,100,.6)', strokeWidth: 3 });
    D.label(x0 + 8, TK.y + TK.h - 16, '점선: 직진할 때 닿는 범위', { size: 12, bg: 'rgba(255,255,255,.88)', color: '#26324a', align: 'left' });
    // 오른쪽(또는 아래) 비교 막대
    const bx = PHONE ? MA.x + 14 : TK.x + TK.w + 14, by = PHONE ? TK.y + TK.h + 10 : TK.y, bw = PHONE ? MA.w - 28 : MA.x + MA.w - (TK.x + TK.w + 14) - 12;
    const kind = spreadKind();
    if (!PHONE) { ctx.fillStyle = '#f7f9fd'; D.roundRect(bx - 4, by, bw + 4, 250, 12); ctx.fill(); }
    T(bx + (PHONE ? 0 : 8), by + 20, '틈 폭과 파장 (같은 눈금)', PHONE ? 13 : 14, '#26324a', 'left', 800);
    const lw = D1.lamCm * TK.sc, aw = D1.aCm * TK.sc, mxw = Math.min(PHONE ? 200 : bw - 20, PHONE ? 108 : 144);
    const sc2 = Math.min(1, mxw / Math.max(aw, lw));
    const row = (yy, lab, w, col) => { T(bx + (PHONE ? 0 : 8), yy, lab, 12.5, '#5d6879', 'left', 800); ctx.fillStyle = col; D.roundRect(bx + (PHONE ? 0 : 8), yy + 6, Math.max(2, w * sc2), PHONE ? 12 : 16, 8); ctx.fill(); };
    row(by + (PHONE ? 38 : 48), '파장 λ = ' + D1.lamCm.toFixed(1) + ' cm', lw, '#3d8ed2');
    row(by + (PHONE ? 76 : 84), '틈 폭 a = ' + D1.aCm.toFixed(1) + ' cm', aw, '#f26b3a');
    const lab = kind === 'straight' ? '거의 직진해요' : kind === 'spread' ? '크게 퍼져요' : '조금 퍼져요';
    if (PHONE) {
      T(bx + 236, by + 58, '틈 폭은 파장의 ' + ratioNow().toFixed(1) + '배', 13.5, '#26324a', 'left', 800);
      D.label(bx + 300, by + 94, lab, { size: 13, bg: kind === 'spread' ? '#e8501b' : kind === 'straight' ? '#14a058' : '#c98a00' });
    } else {
      T(bx + 8, by + 142, '틈 폭은 파장의 ' + ratioNow().toFixed(1) + '배', 14.5, '#26324a', 'left', 800);
      D.label(bx + 78, by + 176, lab, { size: 14.5, bg: kind === 'spread' ? '#e8501b' : kind === 'straight' ? '#14a058' : '#c98a00' });
    }
    if (!PHONE) textBlock(bx + 8, by + 208, bw - 8, '틈이 파장과 비슷할수록 크게 퍼져요.', 12.5, '#5d6879', 17, 700);
  }
  function drawLaser() {
    const Ls = PHONE ? { lx: MA.x + 14, px: MA.x + 128, sx: MA.x + 300, pw: 112 } : { lx: MA.x + 22, px: MA.x + 210, sx: MA.x + 520, pw: 190 };
    const yc = MA.y + MA.h / 2 + 4, k = (PHONE ? 130 : 150) / SCR_MM;       // 스크린 눈금: px per mm
    const aMm = SLITS[S.df.slit], half = lasHalf(aMm), col = wlRGB(LASER_NM);
    T(MA.x + 14, MA.y + 22, '🔦 레이저의 회절 (위에서 본 모습)', PHONE ? 13.5 : 15, '#26324a', 'left', 800);
    // 레이저 상자
    D.shadow(() => { ctx.fillStyle = '#4a5568'; D.roundRect(Ls.lx, yc - 18, 62, 36, 8); ctx.fill(); }, { blur: 8, y: 3 });
    ctx.fillStyle = '#e53935'; ctx.fillRect(Ls.lx + 56, yc - 6, 8, 12);
    T(Ls.lx + 30, yc + 5, '레이저', 12.5, '#fff', 'center', 800);
    // 빔
    const beamA = 0.85;
    ctx.save();
    const g = ctx.createLinearGradient(Ls.lx + 64, 0, Ls.px, 0); g.addColorStop(0, 'rgba(255,60,50,.9)'); g.addColorStop(1, 'rgba(255,60,50,.7)');
    ctx.fillStyle = g; ctx.fillRect(Ls.lx + 64, yc - 2.5, Ls.px - Ls.lx - 64, 5);
    // 틈에서 스크린으로 퍼지는 부채꼴 (중앙 밝은 무늬의 끝까지)
    const gh = half * k;
    const fan = ctx.createLinearGradient(Ls.px, 0, Ls.sx, 0); fan.addColorStop(0, 'rgba(255,60,50,.55)'); fan.addColorStop(1, 'rgba(255,60,50,.22)');
    ctx.fillStyle = fan; ctx.beginPath(); ctx.moveTo(Ls.px, yc); ctx.lineTo(Ls.sx, yc - gh); ctx.lineTo(Ls.sx, yc + gh); ctx.closePath(); ctx.fill();
    ctx.restore();
    // 틈이 있는 판 (틈은 확대해서 그림)
    const gap = Math.max(3, Math.min(20, 3 + (Math.log10(aMm) + 1.7) * 9));
    ctx.fillStyle = '#556070'; ctx.fillRect(Ls.px - 5, yc - 88, 10, 88 - gap / 2); ctx.fillRect(Ls.px - 5, yc + gap / 2, 10, 88 - gap / 2);
    D.label(Ls.px, yc - 100, '틈 ' + aMm + ' mm', { size: PHONE ? 12 : 13, bg: '#26324a' });
    T(Ls.px, yc + 106, '(틈은 확대해서 그렸어요)', 11.5, '#5d6879', 'center', 700);
    // 스크린과 무늬
    const sw = 20, sx = Ls.sx;
    ctx.fillStyle = '#10131c'; ctx.fillRect(sx, yc - SCR_MM * k, sw, SCR_MM * 2 * k);
    for (let y = -SCR_MM * k; y < SCR_MM * k; y += 1) {
      const mm = y / k, I = lasI(aMm, mm), v = Math.pow(I, 0.5);
      ctx.fillStyle = 'rgb(' + Math.round(col[0] * v) + ',' + Math.round(col[1] * v) + ',' + Math.round(col[2] * v) + ')'; ctx.fillRect(sx, yc + y, sw, 1.4);
    }
    ctx.strokeStyle = '#26324a'; ctx.lineWidth = 2; ctx.strokeRect(sx, yc - SCR_MM * k, sw, SCR_MM * 2 * k);
    // 눈금 (mm)
    ctx.strokeStyle = '#5d6879'; ctx.lineWidth = 1.2;
    for (let m = -80; m <= 80; m += 10) { const yy = yc + m * k, big = m % 20 === 0; ctx.beginPath(); ctx.moveTo(sx + sw, yy); ctx.lineTo(sx + sw + (big ? 8 : 5), yy); ctx.stroke(); if (big && m % 40 === 0) T(sx + sw + 12, yy + 4, m + '', 11.5, '#5d6879', 'left', 700); }
    T(sx + sw + 12, yc - SCR_MM * k - 8, 'mm', 11.5, '#5d6879', 'left', 700);
    T(sx + sw / 2, yc + SCR_MM * k + 18, '스크린 (2 m)', 12.5, '#26324a', 'center', 800);
    // 세기 그래프 (오른쪽)
    const gx = sx + sw + (PHONE ? 38 : 56), gw = MA.x + MA.w - gx - 10;
    ctx.fillStyle = '#f7f9fd'; ctx.fillRect(gx, yc - SCR_MM * k, gw, SCR_MM * 2 * k);
    ctx.strokeStyle = '#d6dcea'; ctx.lineWidth = 1; ctx.strokeRect(gx, yc - SCR_MM * k, gw, SCR_MM * 2 * k);
    ctx.fillStyle = 'rgba(229,57,53,.35)'; ctx.strokeStyle = '#e53935'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(gx, yc - SCR_MM * k);
    for (let y = -SCR_MM * k; y <= SCR_MM * k; y += 2) ctx.lineTo(gx + lasI(aMm, y / k) * (gw - 6), yc + y);
    ctx.lineTo(gx, yc + SCR_MM * k); ctx.closePath(); ctx.fill(); ctx.stroke();
    T(gx + gw / 2, yc - SCR_MM * k - 8, '밝기', 12, '#5d6879', 'center', 700);
    // 중앙 무늬 폭 표시
    const bxx = gx - 10;
    ctx.strokeStyle = '#26324a'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(bxx, yc - half * k); ctx.lineTo(bxx, yc + half * k); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bxx - 5, yc - half * k); ctx.lineTo(bxx + 5, yc - half * k); ctx.moveTo(bxx - 5, yc + half * k); ctx.lineTo(bxx + 5, yc + half * k); ctx.stroke();
    D.label(Ls.px + (Ls.sx - Ls.px) / 2, yc + 60 + (PHONE ? 20 : 30), '중앙 무늬의 폭 ' + (2 * half).toFixed(half < 5 ? 1 : 0) + ' mm', { size: PHONE ? 12.5 : 14, bg: '#e8501b' });
    T(Ls.px + (Ls.sx - Ls.px) / 2, yc + 110 + (PHONE ? 8 : 18), S.df.slit === '0.5' ? '틈이 넓으면 좁은 줄' : S.df.slit === '0.1' ? '틈을 좁히면 더 넓어져요' : '아주 좁은 틈: 스크린 가득 퍼져요', PHONE ? 12.5 : 13.5, '#26324a', 'center', 800);
  }
  function drawDoor() {
    const D1 = S.df, snd = D1.door === 'sound', x0 = TK.x + (PHONE ? 150 : 200) + TK.wt, yc = TK.y + TK.h / 2;
    T(MA.x + 14, MA.y + 22, snd ? '🔊 소리는 문을 지나 퍼져요 (위에서 본 모습)' : '💡 빛은 문을 지나도 거의 직진해요 (위에서 본 모습)', PHONE ? 13 : 15, '#26324a', 'left', 800);
    if (snd) {
      DOOR.set(DOOR_A, DOOR_LAM);
      DOOR.paint(TK.x, TK.y, S.t, 60, true);
    } else {
      // 빛: 문 폭의 평면파가 곧게 나아가고 나머지는 그림자
      const k = TAU / DOOR_LAM, om = k * 60;
      ctx.fillStyle = '#16213a'; ctx.fillRect(TK.x, TK.y, TK.w, TK.h);
      ctx.fillStyle = '#16213a';
      // 입사하는 빛 (왼쪽 전체)
      for (let x = 0; x < x0 - TK.x - TK.wt + 0.1; x += 3) { const v = 0.5 + 0.5 * Math.cos(k * x - om * S.t); ctx.fillStyle = 'rgba(255,236,150,' + (0.1 + 0.55 * v) + ')'; ctx.fillRect(TK.x + x, TK.y, 3.2, TK.h); }
      for (let x = x0 - TK.x; x < TK.w; x += 3) { const v = 0.5 + 0.5 * Math.cos(k * (x - (x0 - TK.x)) - om * S.t); ctx.fillStyle = 'rgba(255,236,150,' + (0.1 + 0.55 * v) + ')'; ctx.fillRect(TK.x + x, yc - DOOR_A / 2, 3.2, DOOR_A); }
      ctx.fillStyle = '#5c6474'; ctx.fillRect(x0 - TK.wt, TK.y, TK.wt, TK.h / 2 - DOOR_A / 2); ctx.fillRect(x0 - TK.wt, yc + DOOR_A / 2, TK.wt, TK.h / 2 - DOOR_A / 2);
    }
    ctx.save(); ctx.strokeStyle = '#7b8798'; ctx.lineWidth = 2; ctx.strokeRect(TK.x, TK.y, TK.w, TK.h); ctx.restore();
    // 문 표시
    D.label(x0 - TK.wt / 2, TK.y + 14, '문 (폭 1 m)', { size: 12.5, bg: '#26324a' });
    // 귀 (모퉁이 너머)
    const mx = TK.x + MIC.x, my = TK.y + MIC.y;
    let lvl = 0;
    if (snd) { const xs = x0 - TK.x, ref = DOOR.amp(xs + Math.hypot(MIC.x - xs, MIC.y - TK.h / 2), TK.h / 2); lvl = DOOR.amp(MIC.x, MIC.y) / Math.max(1e-6, ref); }
    D.sphere(mx, my, 17, snd ? '#14a058' : '#6b7280', { shadow: true });
    T(mx, my + 7, '🎧', 20, '#fff', 'center', 700);
    D.label(mx, my - 30, snd ? (lvl > 0.45 ? '또렷이 들려요' : lvl > 0.2 ? '작게 들려요' : '거의 안 들려요') : '안 보여요 (그림자)', { size: 12.5, bg: snd && lvl > 0.2 ? '#14a058' : '#4a5568' });
    D.arrow(TK.x + 24, TK.y + TK.h / 2, TK.x + 24 + 50, TK.y + TK.h / 2, { color: '#ffffff', width: 3, head: 11, alpha: 0.9 });
    T(TK.x + 20, TK.y + TK.h / 2 + 24, snd ? '소리' : '빛', 13, '#ffffff', 'left', 800, { stroke: 'rgba(20,40,80,.7)', strokeWidth: 3 });
    // 오른쪽 설명 카드
    const bx = PHONE ? MA.x + 12 : TK.x + TK.w + 14, by = PHONE ? TK.y + TK.h + 12 : TK.y, bw = PHONE ? MA.w - 24 : MA.x + MA.w - (TK.x + TK.w + 14) - 12;
    if (!PHONE) { ctx.fillStyle = '#f7f9fd'; D.roundRect(bx - 4, by, bw + 4, 250, 12); ctx.fill(); }
    const ox = bx + (PHONE ? 0 : 8);
    T(ox, by + 22, snd ? '🔊 소리' : '💡 빛', PHONE ? 13.5 : 15, '#26324a', 'left', 800);
    const lines = snd ? ['파장 약 0.5 m', '문 폭 1 m는 파장의 2배', '→ 크게 퍼져서 모퉁이 너머에서도 들려요'] : ['파장 약 500 nm', '문 폭 1 m는 파장의 약 200만 배', '→ 퍼짐이 아주 작아 직진처럼 보여요'];
    let ly = by + (PHONE ? 40 : 48);
    lines.forEach((s2, i) => { const ls = wrap(s2, bw - 14, PHONE ? 13 : 13.5, 700); ls.forEach((l) => { T(ox, ly, l, PHONE ? 13 : 13.5, i === 2 ? (snd ? '#c4501b' : '#1c7a4a') : '#26324a', 'left', i === 2 ? 800 : 700); ly += PHONE ? 16 : 19; }); ly += PHONE ? 2 : 6; });
    if (!snd && !PHONE) textBlock(ox, by + 156, bw - 14, '(그림의 빛의 파장은 실제보다 훨씬 크게 그렸어요)', 12, '#5d6879', 16, 700);
  }
  function drawDiffBottom() {
    panel(BOT.x, BOT.y, BOT.w, BOT.h, 14);
    let m1, m2;
    if (S.df.sub === 'tank') {
      const kd = spreadKind();
      m1 = kd === 'straight' ? '틈이 파장보다 훨씬 넓으면 물결은 거의 직진하고, 틈 가장자리에서만 조금 퍼져요.' : kd === 'spread' ? '틈이 파장과 비슷하거나 더 좁으면 물결이 틈에서 거의 둥글게 퍼져 나가요.' : '틈을 좁혀 갈수록 물결이 점선 밖으로 점점 더 퍼져 나가요.';
      m2 = '틈 폭 슬라이더를 줄이거나, 파장 슬라이더를 늘려서 퍼짐이 어떻게 바뀌는지 보세요.';
    } else if (S.df.sub === 'laser') {
      m1 = '레이저 빛도 좁은 틈을 지나면 퍼져요. 틈이 좁을수록 스크린의 중앙 밝은 무늬가 넓어져요.';
      m2 = '회절 무늬는 중앙이 가장 밝고 넓으며, 양옆에 약한 무늬가 늘어서요.';
    } else {
      m1 = S.df.door === 'sound' ? '소리의 파장은 문 폭과 비슷해서 크게 회절해요. 그래서 모퉁이 너머에서도 들려요.' : '빛의 파장은 문 폭에 비해 아주 짧아서 회절이 거의 눈에 띄지 않아요. 그래서 모퉁이 너머는 그림자예요.';
      m2 = '빛도 파동이라서 회절해요. 틈이 파장에 가까울 만큼 아주 좁을 때 뚜렷하게 보여요.';
    }
    textBlock(BOT.x + 16, BOT.y + 28, BOT.w - 32, m1, PHONE ? 14 : 15, '#26324a', 21, 800);
    textBlock(BOT.x + 16, BOT.y + (PHONE ? 92 : 70), BOT.w - 32, m2, PHONE ? 13 : 13.5, '#5d6879', 19, 700);
  }

  /* ================= ② 분해능 ================= */
  function J1(x) {                                  // 1차 베셀 함수 (근사식)
    const ax = Math.abs(x);
    if (ax < 8) {
      const y = x * x;
      const a1 = x * (72362614232.0 + y * (-7895059235.0 + y * (242396853.1 + y * (-2972611.439 + y * (15704.48260 + y * (-30.16036606))))));
      const a2 = 144725228442.0 + y * (2300535178.0 + y * (18583304.74 + y * (99447.43394 + y * (376.9991397 + y))));
      return a1 / a2;
    }
    const z = 8 / ax, y = z * z, xx = ax - 2.356194491;
    const a1 = 1 + y * (0.183105e-2 + y * (-0.3516396496e-4 + y * (0.2457520174e-5 + y * (-0.240337019e-6))));
    const a2 = 0.04687499995 + y * (-0.2002690873e-3 + y * (0.8449199096e-5 + y * (-0.88228987e-6 + y * 0.105787412e-6)));
    const ans = Math.sqrt(0.636619772 / ax) * (Math.cos(xx) * a1 - z * Math.sin(xx) * a2);
    return x < 0 ? -ans : ans;
  }
  const airy = (r, r0) => { const v = 3.8317 * Math.abs(r) / r0; if (v < 1e-4) return 1; const q = 2 * J1(v) / v; return q * q; };
  function resState() {
    const R = S.rs, lam = +R.col, r0 = R0_RED_SMALL * (lam / 650) / AP_SIZE[R.ap];
    const sep = PX_PER_UNIT * R.s;
    const peak = Math.max(1 + airy(sep, r0), 1 + airy(sep, r0));
    const mid = 2 * airy(sep / 2, r0);
    const dip = 1 - mid / peak;
    const kind = dip >= DIP_OK ? 'ok' : sep >= ONE_RATIO * r0 ? 'vague' : 'one';
    return { r0, sep, dip, kind, lam };
  }
  function stepRes(dt) {
    const R = S.rs; R.sD = SciSim.approach(R.sD, R.s, dt, 14);
    if (S.mode === 'res') {
      const key = R.ap + R.col;
      R.held = (R._k === key) ? R.held + dt : 0; R._k = key;
      if (R.held > 0.6) R.combos[key] = true;
    }
  }
  const RES_BUF = makeBuf(PHONE ? 56 : 118, PHONE ? 38 : 40);
  function drawRes() {
    const R = S.rs, st = resState(), col = wlRGB(st.lam), ks = PHONE ? 0.62 : 1;
    const sepD = PX_PER_UNIT * R.sD * ks, r0D = st.r0 * ks;
    panel(MA.x, MA.y, MA.w, MA.h, 14);
    /* --- 스케치 --- */
    const sk = PHONE ? { x: MA.x + 10, y: MA.y + 10, w: MA.w - 20, h: 162 } : { x: MA.x + 10, y: MA.y + 10, w: 290, h: MA.h - 20 };
    ctx.fillStyle = '#f7f9fd'; D.roundRect(sk.x, sk.y, sk.w, sk.h, 12); ctx.fill();
    T(sk.x + 12, sk.y + 22, '두 점광원 → 렌즈 → 스크린', PHONE ? 13 : 14.5, '#26324a', 'left', 800);
    const cy = sk.y + (PHONE ? 90 : sk.h / 2 + 6), lx = sk.x + sk.w * 0.46, sxp = sk.x + sk.w - 22, stx = sk.x + 28;
    const skK = PHONE ? 0.36 : 0.85, dStar = sepD * skK;                    // 별 사이의 간격 (그림)
    const open = PHONE ? 8 + 11 * AP_SIZE[R.ap] : 14 + 26 * AP_SIZE[R.ap];   // 구경 (그림)
    // 렌즈 + 구경 가림판
    ctx.fillStyle = 'rgba(120,180,255,.35)'; ctx.strokeStyle = '#5b8fd1'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(lx, cy, 7, open / 2 + 2, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#4a5568'; ctx.fillRect(lx - 4, cy - (PHONE ? 62 : 120), 8, (PHONE ? 62 : 120) - open / 2); ctx.fillRect(lx - 4, cy + open / 2, 8, (PHONE ? 62 : 120) - open / 2);
    T(lx, cy + (PHONE ? 76 : 134), R.ap === 'small' ? '작은 구경' : '큰 구경', 12.5, '#26324a', 'center', 800);
    // 별과 광선
    const stars = [cy - dStar / 2, cy + dStar / 2], imgs = [cy + dStar / 2, cy - dStar / 2];
    stars.forEach((yy, i) => {
      const cc = i ? '#ffd24a' : '#ffffff';
      [-1, 0, 1].forEach((q) => {
        ctx.strokeStyle = 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',.55)'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(stx, yy); ctx.lineTo(lx, cy + q * open / 2); ctx.lineTo(sxp, imgs[i]); ctx.stroke();
      });
      D.glow(stx, yy, 14, i ? '#ffd24a' : '#bfe0ff', 0.9); D.sphere(stx, yy, 5, cc, { gloss: false });
    });
    // 스크린과 이상적인 상 + 회절 원반 크기
    ctx.fillStyle = '#10131c'; ctx.fillRect(sxp, cy - (PHONE ? 58 : 110), 8, (PHONE ? 116 : 220));
    imgs.forEach((yy, i) => {
      ctx.strokeStyle = 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',1)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sxp + 4, yy, Math.max(3, r0D * skK), 0, TAU); ctx.stroke();
      D.sphere(sxp + 4, yy, 2.5, '#fff', { gloss: false });
    });
    if (!PHONE) textBlock(sk.x + 12, sk.y + sk.h - 40, sk.w - 24, '원은 렌즈 구멍에서 회절되어 번진 크기예요. 원이 겹치면 한 점처럼 보여요.', 12.5, '#5d6879', 17, 700);
    /* --- 스크린의 상 --- */
    const im = PHONE ? { x: MA.x + 10, y: MA.y + 182, w: 224, h: 196 } : { x: MA.x + 312, y: MA.y + 10, w: 454, h: 168 };
    ctx.fillStyle = '#0b0e16'; D.roundRect(im.x, im.y, im.w, im.h, 12); ctx.fill();
    const g = RES_BUF.img.data, W = RES_BUF.w, Hh = RES_BUF.h, cw = im.w / W, ch = im.h / Hh;
    for (let j = 0; j < Hh; j++) for (let i = 0; i < W; i++) {
      const x = (i + 0.5) * cw - im.w / 2, y = (j + 0.5) * ch - im.h / 2;
      const I = airy(Math.hypot(x + sepD / 2, y), r0D) + airy(Math.hypot(x - sepD / 2, y), r0D);
      const v = Math.pow(Math.min(1, I), 0.5), o = (j * W + i) * 4;
      g[o] = col[0] * v; g[o + 1] = col[1] * v; g[o + 2] = col[2] * v; g[o + 3] = 255;
    }
    ctx.save(); D.roundRect(im.x, im.y, im.w, im.h, 12); ctx.clip(); flush(RES_BUF, im.x, im.y, im.w, im.h); ctx.restore();
    T(im.x + 10, im.y + 18, '스크린에 맺힌 모습', 12.5, '#cfd8ee', 'left', 800);
    /* --- 가운데 줄의 밝기 그래프 --- */
    const gp = PHONE ? { x: MA.x + 244, y: MA.y + 182, w: 212, h: 196 } : { x: MA.x + 312, y: MA.y + 190, w: 454, h: 120 };
    ctx.fillStyle = '#f7f9fd'; D.roundRect(gp.x, gp.y, gp.w, gp.h, 12); ctx.fill();
    const gx0 = gp.x + 10, gx1 = gp.x + gp.w - 10, gy1 = gp.y + gp.h - 16, gy0 = gp.y + 26, mxv = Math.max(1, 2);
    ctx.strokeStyle = '#d6dcea'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx0, gy1); ctx.lineTo(gx1, gy1); ctx.stroke();
    const X = (x) => (gx0 + gx1) / 2 + x, Yv = (v) => gy1 - (v / 1.15) * (gy1 - gy0);
    const curve = (fn, color, w, dash) => { ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = w; if (dash) ctx.setLineDash(dash); ctx.beginPath(); const half = (gx1 - gx0) / 2; for (let x = -half; x <= half; x += 2) { const y = Yv(fn(x)); if (x === -half) ctx.moveTo(X(x), y); else ctx.lineTo(X(x), y); } ctx.stroke(); ctx.restore(); };
    curve((x) => airy(x + sepD / 2, r0D), 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',.6)', 1.6, [4, 4]);
    curve((x) => airy(x - sepD / 2, r0D), 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',.6)', 1.6, [4, 4]);
    curve((x) => airy(x + sepD / 2, r0D) + airy(x - sepD / 2, r0D), '#26324a', 2.8);
    const mv = 2 * airy(sepD / 2, r0D);
    ctx.fillStyle = '#e8501b'; ctx.beginPath(); ctx.arc(X(0), Yv(mv), 4.5, 0, TAU); ctx.fill();
    T(gp.x + 12, gp.y + 18, '밝기 (두 점의 합)', 12.5, '#26324a', 'left', 800);
    const lab = st.kind === 'ok' ? '구분됨' : st.kind === 'vague' ? '모호' : '한 점';
    D.label(gp.x + gp.w - 54, gp.y + 18, lab, { size: PHONE ? 13 : 14.5, bg: st.kind === 'ok' ? '#14a058' : st.kind === 'vague' ? '#c98a00' : '#e8501b' });
    /* --- 하단 설명 (phone은 아래 큰 상자) --- */
    panel(BOT.x, BOT.y, BOT.w, BOT.h, 14);
    const m1 = st.kind === 'ok' ? '두 원반의 가운데가 패여서 두 점으로 구분돼요.' : st.kind === 'vague' ? '두 원반이 많이 겹쳐 길쭉한 한 덩어리처럼 보여요. 구분하기 어려워요.' : '두 원반이 거의 완전히 겹쳐 한 점으로 보여요.';
    textBlock(BOT.x + 16, BOT.y + 28, BOT.w - 32, m1, PHONE ? 14 : 15, '#26324a', 21, 800);
    textBlock(BOT.x + 16, BOT.y + (PHONE ? 70 : 52), BOT.w - 32, '구경이 클수록, 파장이 짧을수록 회절 원반이 작아져서 더 가까운 두 점도 구분할 수 있어요.', PHONE ? 13 : 13.5, '#5d6879', 19, 700);
    textBlock(BOT.x + 16, BOT.y + (PHONE ? 128 : 84), BOT.w - 32, '블루레이(405 nm) > DVD(650 nm) > CD(780 nm) 순으로 더 촘촘한 홈을 읽어요.', PHONE ? 12.5 : 13, '#5d6879', 18, 700);
  }

  /* ================= ③ 홀로그램 기록 ================= */
  const DESIGN_W = 776;
  const hsc = PHONE ? MA.w / DESIGN_W : 1;
  const hp = (x, y) => ({ x: MA.x + x * hsc, y: MA.y + y * hsc });
  const ITEM_DEF = [
    { id: 'laser', label: '레이저', icon: '🔦', slot: [62, 240], w: 76, h: 34 },
    { id: 'bs', label: '빔 분할기', icon: '◫', slot: [176, 240], w: 38, h: 38 },
    { id: 'mirror', label: '거울', icon: '🪞', slot: [176, 66], w: 38, h: 38 },
    { id: 'obj', label: '물체(조각상)', icon: '🗿', slot: [330, 240], w: 44, h: 64 },
    { id: 'film', label: '필름', icon: '🎞️', slot: [470, 145], w: 10, h: 150 },
  ];
  const TRAY = PHONE ? { y: MA.y + 206, cw: 86, ch: 44, gap: 5.5 } : { y: MA.y + 346, cw: 134, ch: 54, gap: 14 };
  function initItems() {
    S.hl.items = ITEM_DEF.map((d, i) => {
      const sl = hp(d.slot[0], d.slot[1]);
      const tx = MA.x + (PHONE ? 8 : 18) + i * (TRAY.cw + TRAY.gap), ty = TRAY.y;
      return { id: d.id, label: d.label, icon: d.icon, def: d, slot: { x: sl.x, y: sl.y }, tray: { x: tx + TRAY.cw / 2, y: ty + TRAY.ch / 2 }, x: tx + TRAY.cw / 2, y: ty + TRAY.ch / 2, placed: false, drag: false, sc: 1, shake: 0 };
    });
  }
  initItems();
  const allPlaced = () => S.hl.items.every((it) => it.placed);
  function placeAll(on) { S.hl.items.forEach((it) => { it.placed = on; it.drag = false; it.x = on ? it.slot.x : it.tray.x; it.y = on ? it.slot.y : it.tray.y; }); S.hl.drag = null; S.hl.beams = on ? 1 : 0; S.hl.expo = on ? 1 : 0; }
  const effVib = () => S.hl.vib * (S.hl.table ? 0.04 : 1);
  const contrast = () => Math.max(0, 1 - 2 * effVib());
  // 간섭무늬 간격: 필름에 닿는 두 빛(그림의 기준광과 물체광)의 각도에서 계산
  const FRINGE = (() => {
    const f = ITEM_DEF[4].slot, m = ITEM_DEF[2].slot, o = ITEM_DEF[3].slot;
    const ang = (from) => { const dx = f[0] - from[0], dy = f[1] - from[1]; return Math.atan2(dy, dx); };
    const aR = ang([m[0] + 12, m[1]]), aO = ang([o[0] + 14, o[1] - 20]);   // 그림에서 필름에 닿는 두 빛의 각도 (필름 법선은 수평)
    const per = 0.532 / (Math.abs(Math.sin(aR)) + Math.abs(Math.sin(aO)));
    return { aR, aO, period: per, sumSin: Math.abs(Math.sin(aR)) + Math.abs(Math.sin(aO)) };
  })();
  function stepHolo(dt) {
    const H = S.hl, ok = allPlaced();
    H.beams = SciSim.approach(H.beams, ok ? 1 : 0, dt, ok ? 3 : 14);
    H.expo = ok ? Math.min(1, H.expo + dt * 0.55) : Math.max(0, H.expo - dt * 2);
    H.items.forEach((it) => {
      if (it.drag) return;
      const tx = it.placed ? it.slot.x : it.tray.x, ty = it.placed ? it.slot.y : it.tray.y;
      it.x = SciSim.approach(it.x, tx, dt, 14); it.y = SciSim.approach(it.y, ty, dt, 14);
      it.sc = SciSim.approach(it.sc, 1, dt, 14); it.shake = Math.max(0, it.shake - dt * 4);
    });
    if (S.mode === 'holo' && ok && H.expo > 0.8 && contrast() < 0.45) H.vibHold += dt; else if (!(S.mode === 'holo' && ok)) H.vibHold = 0;
    if (H.vibHold > 1) H.vibSeen = true;
  }
  const statue = (x, y, s, alpha) => {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.fillStyle = '#8a6d3b'; D.roundRect(-13, 18, 26, 8, 3); ctx.fill();
    const g = ctx.createLinearGradient(-12, 0, 12, 0); g.addColorStop(0, '#f3d57a'); g.addColorStop(1, '#c9972e');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-9, 18); ctx.quadraticCurveTo(-13, 0, -5, -6); ctx.lineTo(5, -6); ctx.quadraticCurveTo(13, 0, 9, 18); ctx.closePath(); ctx.fill();
    D.sphere(0, -14, 9, '#f0c95a', { gloss: true });
    ctx.restore();
  };
  function drawDevice(it) {
    const d = it.def, x = it.x, y = it.y;
    ctx.save();
    if (it.id === 'laser') {
      D.shadow(() => { ctx.fillStyle = '#4a5568'; D.roundRect(x - 38 * hsc, y - 17 * hsc, 76 * hsc, 34 * hsc, 8); ctx.fill(); }, { blur: 8, y: 3 });
      ctx.fillStyle = '#22c55e'; ctx.fillRect(x + 34 * hsc, y - 6 * hsc, 8 * hsc, 12 * hsc);
      T(x - 2 * hsc, y + 5, '레이저', PHONE ? 11 : 12.5, '#fff', 'center', 800);
    } else if (it.id === 'bs') {
      D.shadow(() => { ctx.fillStyle = 'rgba(190,225,255,.85)'; ctx.fillRect(x - 19 * hsc, y - 19 * hsc, 38 * hsc, 38 * hsc); }, { blur: 6, y: 2 });
      ctx.strokeStyle = '#5b8fd1'; ctx.lineWidth = 2; ctx.strokeRect(x - 19 * hsc, y - 19 * hsc, 38 * hsc, 38 * hsc);
      ctx.beginPath(); ctx.moveTo(x - 19 * hsc, y + 19 * hsc); ctx.lineTo(x + 19 * hsc, y - 19 * hsc); ctx.stroke();
    } else if (it.id === 'mirror') {
      ctx.translate(x, y); ctx.rotate(-(Math.PI / 4 - FRINGE.aR / 2));
      D.shadow(() => { ctx.fillStyle = '#9fb3cc'; D.roundRect(-22 * hsc, -4, 44 * hsc, 8, 3); ctx.fill(); }, { blur: 5, y: 2 });
      ctx.fillStyle = '#e9f2ff'; ctx.fillRect(-20 * hsc, -4, 40 * hsc, 3);
    } else if (it.id === 'obj') {
      statue(x, y + 6, 1.7 * hsc);
    } else if (it.id === 'film') {
      D.shadow(() => { ctx.fillStyle = '#2d3646'; ctx.fillRect(x - 5 * hsc, y - 75 * hsc, 10 * hsc, 150 * hsc); }, { blur: 6, y: 2 });
      ctx.fillStyle = 'rgba(120,255,160,.35)'; ctx.fillRect(x - 2 * hsc, y - 72 * hsc, 4 * hsc, 144 * hsc);
    }
    ctx.restore();
  }
  function drawCard(it, lift) {
    const w = TRAY.cw, h = TRAY.ch, x = it.x, y = it.y, s = it.sc * (lift ? 1.08 : 1) ;
    ctx.save(); ctx.translate(x + (it.shake ? Math.sin(S.t * 60) * 4 * it.shake : 0), y); ctx.scale(s, s);
    D.shadow(() => { ctx.fillStyle = '#fff'; D.roundRect(-w / 2, -h / 2, w, h, 12); ctx.fill(); }, { blur: lift ? 16 : 8, y: lift ? 8 : 3, color: 'rgba(20,40,80,.28)' });
    ctx.strokeStyle = '#c3cbdb'; ctx.lineWidth = 1.5; D.roundRect(-w / 2, -h / 2, w, h, 12); ctx.stroke();
    T(-w / 2 + (PHONE ? 16 : 24), 8, it.icon, PHONE ? 20 : 26, '#26324a', 'center', 700);
    T(-w / 2 + (PHONE ? 30 : 44), 5, it.label, PHONE ? 11 : 13.5, '#26324a', 'left', 800);
    ctx.restore();
  }
  function loupeRect() { return PHONE ? { x: MA.x + 354, y: MA.y + 322, r: 52 } : { x: MA.x + 662, y: MA.y + 158, r: 98 }; }
  const FR_BUF = makeBuf(72, 72);
  function paintFringes(cx, cy, r, c, alpha, curved) {
    const g = FR_BUF.img.data, N = FR_BUF.w, win = 3.6;           // 창의 반쪽 크기 = 3.6 μm
    const k = TAU / 0.532, sum = FRINGE.sumSin;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const xu = ((i + 0.5) / N - 0.5) * 2 * win, yu = ((j + 0.5) / N - 0.5) * 2 * win;
      const ph = k * (yu * sum + (xu * xu + yu * yu) / (2 * 30));
      const I = 1 + c * Math.cos(ph), v = Math.pow(I / 2, 0.9), o = (j * N + i) * 4;
      const inside = ((i + 0.5) / N - 0.5) ** 2 + ((j + 0.5) / N - 0.5) ** 2 <= 0.25;
      g[o] = 40 * v; g[o + 1] = 255 * v; g[o + 2] = 120 * v; g[o + 3] = inside ? 255 * alpha : 0;
    }
    FR_BUF.g.putImageData(FR_BUF.img, 0, 0);
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.drawImage(FR_BUF.c, cx - r, cy - r, r * 2, r * 2); ctx.restore();
    // 1 μm 눈금자
    const px1 = (r * 2) / (2 * win);                                  // 1 μm에 해당하는 화면 길이
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - r * 0.7, cy + r * 0.78); ctx.lineTo(cx - r * 0.7 + px1, cy + r * 0.78); ctx.stroke();
    T(cx - r * 0.7 + px1 / 2, cy + r * 0.78 - 7, '1 μm', 12, '#fff', 'center', 800, { stroke: 'rgba(0,0,0,.6)', strokeWidth: 3 });
  }
  function drawHolo() {
    const H = S.hl;
    panel(MA.x, MA.y, MA.w, MA.h, 14);
    if (H.view === 'photo') return drawPhotoCompare();
    const cvv = contrast(), ok = allPlaced();
    const wob = (!H.table && ok) ? Math.sin(S.t * 41) * H.vib * 9 + Math.sin(S.t * 23) * H.vib * 5 : 0;
    // 광학대
    const tb = hp(10, 30), tw = 600 * hsc, th = 276 * hsc;
    ctx.save(); if (!RM) ctx.translate(0, wob * 0.5);
    const tbW = PHONE ? MA.w - 28 : 532;
    ctx.fillStyle = '#d3dae8'; D.roundRect(MA.x + 14, tb.y, tbW, 290 * hsc, 10); ctx.fill();
    ctx.strokeStyle = '#c0c9da'; ctx.lineWidth = 1;
    for (let gx = 0; gx < tbW - 12; gx += 22) for (let gy = 0; gy < 290 * hsc; gy += 22) { ctx.beginPath(); ctx.arc(MA.x + 24 + gx, tb.y + 10 + gy, 1.4, 0, TAU); ctx.stroke(); }
    T(MA.x + 18, MA.y + 22, PHONE ? '🧪 홀로그램 광학대' : '🧪 홀로그램 기록 광학대 (위에서 본 모습)', PHONE ? 13 : 15, '#26324a', 'left', 800);
    // 방진대 표시
    if (H.table) D.label(MA.x + (PHONE ? MA.w - 62 : 560), MA.y + 22, '방진대 ON', { size: 12, bg: '#14a058' }); else D.label(MA.x + (PHONE ? MA.w - 62 : 560), MA.y + 22, '방진대 OFF', { size: 12, bg: '#e8501b' });
    // 자리(점선)와 안내
    H.items.forEach((it) => {
      if (it.placed) return;
      const s = it.slot, d = it.def, dragMe = H.drag === it.id;
      ctx.save(); ctx.setLineDash([6, 5]); ctx.strokeStyle = dragMe ? '#14a058' : '#8a95a6'; ctx.lineWidth = dragMe ? 2.6 : 1.8;
      const w = Math.max(d.w * hsc, 26) + 8, h = Math.max(d.h * hsc, 26) + 8;
      D.roundRect(s.x - w / 2, s.y - h / 2, w, h, 8); ctx.stroke(); ctx.restore();
      T(s.x, s.y + h / 2 + 14, it.label + ' 자리', PHONE ? 11 : 12, '#5d6879', 'center', 700);
      if (dragMe) D.ring(s.x, s.y, Math.max(w, h) / 2 + 6, S.t, { color: '#14a058' });
    });
    // 빛 (모두 놓였을 때)
    const b = H.beams;
    const P = (id) => H.items.find((i) => i.id === id).slot;
    const Lz = P('laser'), Bs = P('bs'), Mr = P('mirror'), Ob = P('obj'), Fl = P('film');
    if (b > 0.02) {
      const gcol = (a) => 'rgba(80,255,130,' + a + ')';
      const fi = 72 * hsc;
      ctx.save(); ctx.globalAlpha = Math.min(1, b);
      // 레이저 → 분할기
      const beam = (x1, y1, x2, y2, w, a) => { ctx.strokeStyle = gcol(a); ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
      beam(Lz.x + 38 * hsc, Lz.y, Bs.x - 18 * hsc, Bs.y, 4, 0.9);
      beam(Bs.x + 18 * hsc, Bs.y, Ob.x - 22 * hsc, Ob.y, 4, 0.8);          // 투과: 물체 쪽
      beam(Bs.x, Bs.y - 18 * hsc, Mr.x, Mr.y + 14 * hsc, 4, 0.8);          // 반사: 거울 쪽 (기준광)
      // 기준광: 거울 → 필름 (넓어지는 빔)
      ctx.fillStyle = gcol(0.20); ctx.beginPath(); ctx.moveTo(Mr.x + 12 * hsc, Mr.y); ctx.lineTo(Fl.x - 4, Fl.y - fi); ctx.lineTo(Fl.x - 4, Fl.y + fi); ctx.closePath(); ctx.fill();
      beam(Mr.x + 12 * hsc, Mr.y, Fl.x - 4, Fl.y, 3, 0.7);
      // 물체광: 물체 → 필름 (퍼지는 빛)
      ctx.fillStyle = 'rgba(255,240,120,.22)'; ctx.beginPath(); ctx.moveTo(Ob.x + 14 * hsc, Ob.y - 20 * hsc); ctx.lineTo(Fl.x - 4, Fl.y - fi); ctx.lineTo(Fl.x - 4, Fl.y + fi); ctx.closePath(); ctx.fill();
      beam(Ob.x + 14 * hsc, Ob.y - 20 * hsc, Fl.x - 4, Fl.y, 3, 0.7);
      // 빛 알갱이(진행 방향 표시)
      if (!RM) {
        const pulse = (x1, y1, x2, y2, k0) => { for (let q = 0; q < 3; q++) { const f = ((S.t * 0.7 + q / 3 + k0) % 1); ctx.fillStyle = 'rgba(230,255,235,.95)'; ctx.beginPath(); ctx.arc(x1 + (x2 - x1) * f, y1 + (y2 - y1) * f, 3, 0, TAU); ctx.fill(); } };
        pulse(Lz.x + 38 * hsc, Lz.y, Bs.x - 18 * hsc, Bs.y, 0); pulse(Bs.x + 18 * hsc, Bs.y, Ob.x - 22 * hsc, Ob.y, 0.2); pulse(Bs.x, Bs.y - 18 * hsc, Mr.x, Mr.y + 14 * hsc, 0.1);
        pulse(Mr.x + 12 * hsc, Mr.y, Fl.x - 4, Fl.y, 0.3); pulse(Ob.x + 14 * hsc, Ob.y - 20 * hsc, Fl.x - 4, Fl.y, 0.5);
      }
      ctx.restore();
      D.label((Mr.x + Fl.x) / 2 - 10 * hsc, Mr.y - 12 * hsc + (Fl.y - Mr.y) * 0.45 - 16, '기준광', { size: PHONE ? 11.5 : 12.5, bg: '#14a058' });
      D.label((Ob.x + Fl.x) / 2 + 20 * hsc, (Ob.y + Fl.y) / 2 + 24, '물체광', { size: PHONE ? 11.5 : 12.5, bg: '#c98a00' });
    }
    // 장치들 (놓인 것)
    H.items.forEach((it) => { if (it.placed && !it.drag) drawDevice(it); });
    ctx.restore();
    // 필름에 새겨지는 모습 (확대 창)
    const lp = loupeRect();
    const showLp = true;
    ctx.save();
    ctx.fillStyle = '#10131c'; ctx.beginPath(); ctx.arc(lp.x, lp.y, lp.r + 4, 0, TAU); ctx.fill();
    if (ok && H.expo > 0.02) paintFringes(lp.x, lp.y, lp.r, cvv, Math.min(1, H.expo * 1.4), true);
    else { ctx.fillStyle = '#1b2230'; ctx.beginPath(); ctx.arc(lp.x, lp.y, lp.r, 0, TAU); ctx.fill(); T(lp.x, lp.y + 4, ok ? '' : '아직 기록 전', PHONE ? 12 : 13.5, '#7f8aa0', 'center', 800); }
    ctx.strokeStyle = '#7b8798'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(lp.x, lp.y, lp.r + 4, 0, TAU); ctx.stroke();
    ctx.restore();
    if (ok) { // 필름 → 확대 창 연결선
      ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = '#7b8798'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(Fl.x + 6, Fl.y); ctx.lineTo(lp.x - lp.r - 4, lp.y); ctx.stroke(); ctx.restore();
    }
    if (PHONE) {
      T(MA.x + 14, MA.y + 292, '필름 속 간섭무늬 (확대) →', 12, '#26324a', 'left', 800);
      if (ok) { T(MA.x + 14, MA.y + 316, '무늬 간격 약 ' + FRINGE.period.toFixed(1) + ' μm', 12, '#26324a', 'left', 800); T(MA.x + 14, MA.y + 336, '선명도 ' + Math.round(cvv * 100) + ' %', 12.5, cvv < 0.45 ? '#e8501b' : '#1c7a4a', 'left', 800); T(MA.x + 14, MA.y + 356, '밝은 줄 = 보강, 어두운 줄 = 상쇄', 11.5, '#5d6879', 'left', 700); }
    } else {
      T(lp.x, lp.y - lp.r - 12, '필름 속 간섭무늬 (확대)', 13, '#26324a', 'center', 800);
      if (ok) {
        T(lp.x, lp.y + lp.r + 22, '무늬 간격 약 ' + FRINGE.period.toFixed(1) + ' μm · 선명도 ' + Math.round(cvv * 100) + ' %', 13, cvv < 0.45 ? '#e8501b' : '#1c7a4a', 'center', 800);
        T(lp.x, lp.y + lp.r + 42, '밝은 줄 = 보강, 어두운 줄 = 상쇄', 12.5, '#5d6879', 'center', 700);
      }
    }
    // 트레이
    ctx.fillStyle = '#f0f3fa'; D.roundRect(MA.x + 8, TRAY.y - 8, MA.w - 16, TRAY.ch + 16, 12); ctx.fill();
    H.items.forEach((it) => { if (!it.placed && !it.drag) drawCard(it, false); });
    // 끄는 중
    H.items.forEach((it) => { if (it.drag) drawCard(it, true); });
    if (!ok) D.label(MA.x + (PHONE ? 250 : 452), MA.y + 22, '부품 ' + H.items.filter((i) => i.placed).length + ' / 5 배치', { size: PHONE ? 12 : 12.5, bg: '#4a5568' });
    // 하단 설명
    panel(BOT.x, BOT.y, BOT.w, BOT.h, 14);
    const m1 = !ok ? '레이저 빛을 둘로 나눠서, 한쪽은 물체에 맞혀 반사된 빛(물체광)으로, 다른 쪽은 거울로 돌린 빛(기준광)으로 써요. 두 빛이 필름에서 만나요.'
      : (cvv < 0.45 ? '바닥이 파장만큼 흔들려서 간섭무늬가 흐려졌어요. 그래서 홀로그램은 방진대 위에서 만들어요.' : '두 빛이 필름에서 간섭해서 밝고 어두운 미세한 무늬(약 ' + FRINGE.period.toFixed(1) + ' μm 간격)가 필름에 새겨져요.');
    textBlock(BOT.x + 16, BOT.y + 28, BOT.w - 32, m1, PHONE ? 14 : 15, '#26324a', 21, 800);
    textBlock(BOT.x + 16, BOT.y + (PHONE ? 112 : 78), BOT.w - 32, '필름에는 그림이 아니라 두 빛의 간섭무늬가 기록돼요. 무늬의 모양에 물체광의 위상 정보가 들어 있어요.', PHONE ? 12.5 : 13, '#5d6879', 18, 700);
  }
  function drawPhotoCompare() {
    const cvv = contrast();
    T(MA.x + 18, MA.y + 22, '📷 일반 사진과 홀로그램 필름 비교', PHONE ? 13 : 15, '#26324a', 'left', 800);
    const cw = PHONE ? MA.w - 20 : (MA.w - 36) / 2, ch = PHONE ? 178 : MA.h - 44;
    const c1 = { x: MA.x + 10, y: MA.y + 36, w: cw, h: ch }, c2 = PHONE ? { x: MA.x + 10, y: MA.y + 36 + ch + 8, w: cw, h: 160 } : { x: MA.x + 26 + cw, y: MA.y + 36, w: cw, h: ch };
    // 카드 1: 일반 사진
    ctx.fillStyle = '#f7f9fd'; D.roundRect(c1.x, c1.y, c1.w, c1.h, 12); ctx.fill();
    T(c1.x + 12, c1.y + 22, '📷 일반 사진 필름', PHONE ? 13 : 14.5, '#26324a', 'left', 800);
    const cy1 = c1.y + c1.h * 0.5 + (PHONE ? 6 : 0), lx = c1.x + c1.w * 0.5;
    statue(c1.x + 50, cy1, PHONE ? 1.5 : 2.2);
    ctx.fillStyle = 'rgba(120,180,255,.4)'; ctx.strokeStyle = '#5b8fd1'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(lx, cy1, 6, 30, 0, 0, TAU); ctx.fill(); ctx.stroke();
    const fx = c1.x + c1.w - 38;
    [-1, 1].forEach((q) => { ctx.strokeStyle = 'rgba(255,220,100,.7)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(c1.x + 60, cy1 + q * 16); ctx.lineTo(lx, cy1 + q * 26); ctx.lineTo(fx, cy1 - q * (PHONE ? 8 : 16)); ctx.stroke(); });
    ctx.fillStyle = '#2d3646'; ctx.fillRect(fx - 3, cy1 - 40, 6, 80);
    // 필름에 기록된 그림 (밝기)
    ctx.fillStyle = '#dfe3ec'; D.roundRect(c1.x + c1.w / 2 - 44, c1.y + c1.h - 74, 88, 62, 8); ctx.fill();
    statue(c1.x + c1.w / 2, c1.y + c1.h - 38, 1.1, 0.85); ctx.save(); ctx.globalCompositeOperation = 'saturation'; ctx.restore();
    T(c1.x + c1.w / 2, c1.y + c1.h - 82, '필름에는 밝기의 그림이 있어요', PHONE ? 11.5 : 12.5, '#5d6879', 'center', 800);
    // 카드 2: 홀로그램 필름
    ctx.fillStyle = '#f7f9fd'; D.roundRect(c2.x, c2.y, c2.w, c2.h, 12); ctx.fill();
    T(c2.x + 12, c2.y + 22, '🧪 홀로그램 필름 (확대)', PHONE ? 13 : 14.5, '#26324a', 'left', 800);
    const r2 = PHONE ? 50 : Math.min(98, c2.w * 0.3);
    ctx.fillStyle = '#10131c'; ctx.beginPath(); ctx.arc(c2.x + c2.w * 0.5, c2.y + c2.h * 0.5 + 4, r2 + 4, 0, TAU); ctx.fill();
    paintFringes(c2.x + c2.w * 0.5, c2.y + c2.h * 0.5 + 4, r2, cvv, 1, true);
    T(c2.x + c2.w / 2, c2.y + c2.h - (PHONE ? 8 : 34), '그림이 없어요. 미세한 간섭무늬만 있어요', PHONE ? 11.5 : 12.5, '#5d6879', 'center', 800);
    if (!PHONE) T(c2.x + c2.w / 2, c2.y + c2.h - 14, '무늬 속에 위상 정보까지 기록돼 있어요', 12.5, '#c4501b', 'center', 800);
    panel(BOT.x, BOT.y, BOT.w, BOT.h, 14);
    textBlock(BOT.x + 16, BOT.y + 28, BOT.w - 32, '일반 사진은 렌즈로 상을 맺어 빛의 세기(밝기)만 기록해서 입체감이 없어요. 홀로그램 필름은 기준광과의 간섭무늬로 세기와 위상을 함께 기록해요.', PHONE ? 14 : 15, '#26324a', 21, 800);
  }

  SciSim.pointer(view, {
    down(p) {
      if (S.mode !== 'holo' || S.hl.view !== 'rec') return false;
      const its = S.hl.items;
      for (let i = its.length - 1; i >= 0; i--) {
        const it = its[i];
        const hit = it.placed ? (Math.abs(p.x - it.slot.x) < Math.max(it.def.w * hsc, 40) / 2 + 8 && Math.abs(p.y - it.slot.y) < Math.max(it.def.h * hsc, 40) / 2 + 8) : (Math.abs(p.x - it.x) < TRAY.cw / 2 && Math.abs(p.y - it.y) < TRAY.ch / 2);
        if (hit) { it.placed = false; it.drag = true; it.x = p.x; it.y = p.y; it.sc = 1; S.hl.drag = it.id; Sound.click(); return true; }
      }
      return false;
    },
    move(p) { const it = S.hl.items.find((i) => i.drag); if (it) { it.x = p.x; it.y = p.y; } },
    up(p) {
      const it = S.hl.items.find((i) => i.drag); if (!it) return;
      it.drag = false; S.hl.drag = null;
      if (Math.hypot(p.x - it.slot.x, p.y - it.slot.y) <= 46 * Math.max(hsc, 0.8)) {
        it.placed = true; it.sc = 1.25; Sound.success(); parts.burst(it.slot.x, it.slot.y, { count: 10, speed: 110, size: 3 });
      } else {
        const wrongSlot = S.hl.items.find((o) => o !== it && !o.placed && Math.hypot(p.x - o.slot.x, p.y - o.slot.y) <= 46 * Math.max(hsc, 0.8));
        it.shake = 1; Sound.fail();
        showHint(wrongSlot ? '여기는 ' + wrongSlot.label + ' 자리예요. ' + it.label + '의 점선 자리를 찾아보세요.' : '점선으로 표시된 자리 가까이에 놓아야 해요.', 3000);
      }
    },
    hover(p) {
      if (S.mode !== 'holo' || S.hl.view !== 'rec') return 'default';
      return S.hl.items.some((it) => (it.placed ? Math.hypot(p.x - it.slot.x, p.y - it.slot.y) < 34 : Math.abs(p.x - it.x) < TRAY.cw / 2 && Math.abs(p.y - it.y) < TRAY.ch / 2)) ? 'grab' : 'default';
    },
  });

  /* ================= ④ 재생과 활용 ================= */
  const plLay = () => PHONE
    ? { sc: { x: MA.x, y: MA.y, w: MA.w, h: 236 }, ev: { x: MA.x, y: MA.y + 244, w: MA.w, h: 144 }, Fx: MA.x + 224, cy: MA.y + 126, W: 0.7, K: 150, fh: 92 }
    : { sc: { x: MA.x, y: MA.y, w: 540, h: MA.h }, ev: { x: MA.x + 552, y: MA.y, w: 224, h: MA.h }, Fx: MA.x + 290, cy: MA.y + MA.h / 2 + 12, W: 1, K: 118, fh: 190 };
  function plView(e, cut, ref) {                         // 눈 위치 e에서 필름 창을 통해 보이는 것 (길이 단위는 '눈금')
    const fw = cut === 'piece' ? FILM_PIECE : FILM_FULL;
    const dS = EYE_X + SPH_X, dT = EYE_X + STAR_X;
    const uS = -e / dS, uT = -e / dT, rS = SPH_R / dS, rT = STAR_R / dT, uC = -e / EYE_X;
    const sphIn = Math.abs(e * SPH_X / dS) <= fw, starIn = Math.abs(e * STAR_X / dT) <= fw;
    const clear = Math.abs(uT - uS) >= rS;
    return { fw, uS, uT, rS, rT, uC, hw: fw / EYE_X, sphIn: ref && sphIn, starIn: ref && starIn, clear, star: ref && starIn && clear };
  }
  function stepPlay(dt) {
    const P = S.pl; P.eD = SciSim.approach(P.eD, P.e, dt, 10);
    if (S.mode === 'play') {
      const v = plView(P.e, P.cut, P.ref);
      if (v.star) P.hold += dt; else P.hold = 0;
      if (P.hold > 0.5) P.seenStar = true;
    }
  }
  function starPoly(x, y, R, rot) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = rot - Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? R * 0.45 : R; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
    ctx.closePath();
  }
  function drawPlay() {
    const L = plLay(), P = S.pl, W = L.W, sc = L.sc;
    panel(MA.x, MA.y, MA.w, MA.h, 14);
    const Fx = L.Fx, cy = L.cy, eyeX = Fx + EYE_X * W, eyeY = cy + P.eD * W;
    const vw = plView(P.eD, P.cut, P.ref);
    T(MA.x + 14, MA.y + 22, '🎞️ 재생: 기준광만 비춰요 (위에서 본 모습)', PHONE ? 13 : 15, '#26324a', 'left', 800);
    ctx.save(); ctx.beginPath(); ctx.rect(MA.x + 4, MA.y + 34, sc.w - 8, sc.h - 38); ctx.clip();
    // 필름 조각들
    const edges = [-95, -58, -22, 22, 58, 95];
    const sy = (v) => cy + v * W;
    // 기준광 (왼쪽 아래에서 비스듬히) — 남은 필름에만 닿아요
    const fw = vw.fw, laserX = Fx - 230 * W, laserY = cy + 130 * W;
    if (P.ref) {
      ctx.save();
      const g = ctx.createLinearGradient(laserX, laserY, Fx, cy); g.addColorStop(0, 'rgba(80,255,130,.34)'); g.addColorStop(1, 'rgba(80,255,130,.12)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(laserX + 20, laserY - 4); ctx.lineTo(Fx - 4, sy(-fw)); ctx.lineTo(Fx - 4, sy(fw)); ctx.lineTo(laserX + 20, laserY + 4); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    D.shadow(() => { ctx.fillStyle = '#4a5568'; D.roundRect(laserX - 38, laserY - 14, 58, 28, 8); ctx.fill(); }, { blur: 6, y: 2 });
    T(laserX - 9, laserY + 4, '레이저', 11.5, '#fff', 'center', 800);
    if (P.ref) { ctx.fillStyle = '#22c55e'; ctx.fillRect(laserX + 20, laserY - 5, 6, 10); }
    D.label(laserX + 30 + (Fx - laserX) * 0.3, laserY - (laserY - cy) * 0.35 - 12, '기준광', { size: 12, bg: P.ref ? '#14a058' : '#7b8798' });
    // 필름
    for (let i = 0; i < edges.length - 1; i++) {
      const a = edges[i], b = edges[i + 1], keep = P.cut === 'full' || (a === -22 && b === 22);
      const x = Fx - 4, y0 = sy(a), y1 = sy(b);
      ctx.save(); ctx.globalAlpha = keep ? 1 : 0.22;
      D.shadow(() => { ctx.fillStyle = '#2d3646'; ctx.fillRect(x - (keep ? 0 : 6 * (i % 2 ? 1 : -1)), y0 + 1, 8, y1 - y0 - 2); }, { blur: keep ? 5 : 0, y: 1 });
      if (keep && P.ref) { ctx.fillStyle = 'rgba(120,255,170,.55)'; ctx.fillRect(x + 1, y0 + 1, 3, y1 - y0 - 2); }
      ctx.restore();
    }
    T(Fx, sy(95) + 24, '🎞 필름', 12.5, '#26324a', 'center', 800);
    // 시야 (눈에서 필름 창을 지나 뒤쪽으로)
    if (P.ref) {
      ctx.save();
      const x2 = MA.x + 8;
      const proj = (yw) => { const k = (x2 - eyeX) / (Fx - eyeX); return eyeY + (sy(yw) - eyeY) * k; };
      ctx.fillStyle = 'rgba(255,214,90,.14)'; ctx.beginPath(); ctx.moveTo(eyeX, eyeY); ctx.lineTo(x2, proj(-fw)); ctx.lineTo(x2, proj(fw)); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(214,150,0,.55)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(eyeX, eyeY); ctx.lineTo(x2, proj(-fw)); ctx.moveTo(eyeX, eyeY); ctx.lineTo(x2, proj(fw)); ctx.stroke();
      ctx.restore();
    }
    // 허상: 공(앞)과 별(뒤)
    const sphX = Fx - SPH_X * W, starX = Fx - STAR_X * W;
    const alpha = P.ref ? 1 : 0.0;
    if (P.ref) {
      ctx.save(); ctx.globalAlpha = vw.starIn ? 1 : 0.35;
      D.glow(starX, cy, STAR_R * W * 1.7, '#ffd24a', 0.5);
      ctx.fillStyle = '#ffc928'; ctx.strokeStyle = '#a77700'; ctx.lineWidth = 2; starPoly(starX, cy, STAR_R * W, S.t * 0.4); ctx.fill(); ctx.stroke();
      ctx.restore();
      ctx.save(); ctx.globalAlpha = vw.sphIn ? 0.95 : 0.4; D.sphere(sphX, cy, SPH_R * W, '#e8501b', { shadow: true }); ctx.restore();
      ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = 'rgba(38,50,74,.55)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(sphX, cy, SPH_R * W + 5, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(starX, cy, STAR_R * W + 5, 0, TAU); ctx.stroke(); ctx.restore();
      T(sphX, cy + SPH_R * W + 22, '앞 물체(공)', PHONE ? 11.5 : 12.5, '#26324a', 'center', 800);
      T(starX, cy - STAR_R * W - 14, '뒤 물체(별)', PHONE ? 11.5 : 12.5, '#26324a', 'center', 800);
      // 눈에서 별까지 시선
      ctx.save(); ctx.setLineDash([6, 5]); ctx.lineWidth = 2; ctx.strokeStyle = vw.star ? '#14a058' : 'rgba(232,80,27,.8)';
      ctx.beginPath(); ctx.moveTo(eyeX, eyeY); ctx.lineTo(starX, cy); ctx.stroke(); ctx.restore();
    } else {
      T(Fx - 100 * W, cy, '기준광이 없으면 상이 만들어지지 않아요', PHONE ? 12 : 13.5, '#7b8798', 'center', 800);
    }
    T(Fx - 120 * W, MA.y + 52, '필름 뒤에 떠 있는 것처럼 보이는 상 (허상)', PHONE ? 11.5 : 12.5, '#5d6879', 'center', 700);
    ctx.restore();
    // 눈
    D.sphere(eyeX + 14, eyeY, 14, '#f3f6fc', { shadow: true, gloss: false });
    D.sphere(eyeX + 8, eyeY, 6, '#26324a', { gloss: false });
    T(eyeX + 14, eyeY + 32, '눈', 12.5, '#26324a', 'center', 800);
    /* --- 눈에 보이는 모습 --- */
    const ev = L.ev; ctx.fillStyle = '#f7f9fd'; D.roundRect(ev.x + (PHONE ? 8 : 0), ev.y + (PHONE ? 0 : 8), ev.w - (PHONE ? 16 : 8), ev.h - (PHONE ? 4 : 16), 12); ctx.fill();
    const evx = ev.x + (PHONE ? 8 : 0), evy = ev.y + (PHONE ? 0 : 8), evw = ev.w - (PHONE ? 16 : 8);
    T(evx + 12, evy + 22, '👁 눈에 보이는 모습', PHONE ? 13 : 14.5, '#26324a', 'left', 800);
    const fcx = evx + evw / 2, fcy = evy + (PHONE ? 80 : 150), fhw = Math.min(evw / 2 - 12, L.K * vw.hw), fhh = L.fh / 2 * (PHONE ? 0.55 : 0.62);
    ctx.save();
    ctx.fillStyle = '#0d1424'; D.roundRect(fcx - fhw, fcy - fhh, fhw * 2, fhh * 2, 8); ctx.fill();
    ctx.beginPath(); ctx.rect(fcx - fhw, fcy - fhh, fhw * 2, fhh * 2); ctx.clip();
    if (P.ref) {
      const kx = L.K, px = (u) => fcx - kx * (u - vw.uC);   // 위에서 본 그림에서 위쪽(눈이 올라간 쪽)은 왼쪽을 보는 눈에게 오른쪽이에요
      // 별 (뒤) → 공 (앞) 순서로 그려서 공이 별을 가려요
      const rt = Math.max(3, kx * vw.rT), rs2 = Math.max(4, kx * vw.rS);
      ctx.fillStyle = '#ffc928'; ctx.strokeStyle = '#a77700'; ctx.lineWidth = 1.5; starPoly(px(vw.uT), fcy, rt, S.t * 0.4); ctx.fill(); ctx.stroke();
      D.sphere(px(vw.uS), fcy, rs2, '#e8501b', { shadow: false });
    } else T(fcx, fcy + 4, '아무것도 안 보여요', PHONE ? 12 : 13.5, '#7f8aa0', 'center', 800);
    ctx.restore();
    ctx.strokeStyle = '#7b8798'; ctx.lineWidth = 2.4; D.roundRect(fcx - fhw, fcy - fhh, fhw * 2, fhh * 2, 8); ctx.stroke();
    T(fcx, fcy - fhh - 8, '필름 창 (' + (P.cut === 'full' ? '전체' : '한 조각') + ')', 12, '#5d6879', 'center', 800);
    const lab = !P.ref ? '기준광을 켜 보세요' : vw.star ? '⭐ 뒤에 숨은 별이 보여요!' : (!vw.starIn ? '별이 시야 밖이에요' : '별이 공 뒤에 가려졌어요');
    D.label(fcx, fcy + fhh + 26, lab, { size: PHONE ? 12.5 : 13.5, bg: vw.star ? '#14a058' : '#4a5568' });
    if (!PHONE) textBlock(evx + 12, fcy + fhh + 58, evw - 24, '눈을 위아래로 옮기면 가까운 공은 많이, 먼 별은 적게 움직여 보여요. 이것이 입체상의 단서(시차)예요.', 12.5, '#5d6879', 17, 700);
    // 하단 설명
    panel(BOT.x, BOT.y, BOT.w, BOT.h, 14);
    const m1 = !P.ref ? '기준광이 없으면 필름의 무늬만으로는 아무 상도 만들어지지 않아요.' : P.cut === 'piece' ? '필름 한 조각만 있어도 상 전체가 보여요. 다만 창이 작아져서 보이는 범위(시야)가 좁아져요.' : '기준광만 비춰도 필름의 무늬가 회절 격자처럼 빛을 퍼뜨려 물체광의 파면을 다시 만들어요. 그래서 물체가 거기 있는 것처럼 입체상이 보여요.';
    textBlock(BOT.x + 16, BOT.y + 28, BOT.w - 32, m1, PHONE ? 14 : 15, '#26324a', 21, 800);
    textBlock(BOT.x + 16, BOT.y + (PHONE ? 112 : 78), BOT.w - 32, '활용: 신용카드·지폐의 위조 방지 홀로그램, 홀로그래피 간섭계(진동·변형 측정), 회절 격자 소자, 데이터 저장 연구', PHONE ? 12.5 : 13, '#5d6879', 18, 700);
  }

  /* ---------- 읽음 칸 ---------- */
  const minSep = (() => { const cache = {}; return (r0) => { const k = r0.toFixed(2); if (cache[k]) return cache[k]; let best = r0 * 1.2; for (let f = 0.5; f <= 1.3; f += 0.002) { const sep = r0 * f, peak = 1 + airy(sep, r0), mid = 2 * airy(sep / 2, r0); if (1 - mid / peak >= DIP_OK) { best = sep; break; } } cache[k] = best; return best; }; })();
  let rlast = '';
  function readouts() {
    let a, b, c, L1, L2, L3;
    const D1 = S.df;
    if (S.mode === 'diff') {
      if (D1.sub === 'tank') {
        L1 = '틈 폭 a · 파장 λ'; a = D1.aCm.toFixed(1) + ' cm · ' + D1.lamCm.toFixed(1) + ' cm'; L2 = '틈 폭은 파장의'; b = ratioNow().toFixed(1) + '배';
        const k = spreadKind(); L3 = '퍼짐'; c = k === 'straight' ? '거의 직진' : k === 'spread' ? '크게 퍼짐' : '조금 퍼짐';
      } else if (D1.sub === 'laser') {
        const am = SLITS[D1.slit]; L1 = '틈 폭'; a = am + ' mm'; L2 = '중앙 밝은 무늬 폭'; b = (2 * lasHalf(am)).toFixed(lasHalf(am) < 2.5 ? 1 : 0) + ' mm'; L3 = '퍼짐'; c = D1.slit === '0.5' ? '좁은 줄' : D1.slit === '0.1' ? '넓어짐' : '매우 넓음';
      } else {
        const snd = D1.door === 'sound'; L1 = '파장'; a = snd ? '약 0.5 m' : '약 500 nm'; L2 = '문 폭(1 m)은 파장의'; b = snd ? '2배' : '약 200만 배'; L3 = '모퉁이 너머'; c = snd ? '소리가 들려요' : '그림자 (안 보임)';
      }
    } else if (S.mode === 'res') {
      const st = resState();
      L1 = '두 점 사이의 간격'; a = S.rs.s.toFixed(1) + ' 눈금'; L2 = '구분되는 최소 간격'; b = (minSep(st.r0) / PX_PER_UNIT).toFixed(1) + ' 눈금';
      L3 = '두 점은'; c = st.kind === 'ok' ? '구분돼요' : st.kind === 'vague' ? '모호해요' : '한 점이에요';
    } else if (S.mode === 'holo') {
      const H = S.hl; L1 = '배치한 부품'; a = H.items.filter((i) => i.placed).length + ' / 5';
      L2 = '무늬 선명도'; b = allPlaced() ? Math.round(contrast() * 100) + ' %' : '—'; L3 = '간섭무늬 간격'; c = allPlaced() ? '약 ' + FRINGE.period.toFixed(1) + ' μm' : '—';
    } else {
      const v = plView(S.pl.e, S.pl.cut, S.pl.ref);
      L1 = '눈의 위치'; a = S.pl.e === 0 ? '정면' : (S.pl.e < 0 ? '위 ' : '아래 ') + Math.abs(S.pl.e) + ' 눈금'; L2 = '앞 물체 · 뒤 물체'; b = (v.sphIn ? '공 보임' : '공 시야 밖') + ' · ' + (v.star ? '별 보임' : '별 안 보임'); L3 = '필름'; c = S.pl.cut === 'full' ? '전체' : '한 조각';
    }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const levels = [
    {
      title: '회절: 틈을 지나 퍼지는 파동', short: '회절', icon: '🌊', phase: '실험',
      intro: '<p class="si-q">❓ 탐구 질문: 빛이 좁은 틈을 지나면 정말 곧게만 나아갈까? 간섭무늬만으로 입체 사진을 만들 수 있을까?</p>' +
        '<div class="si-link">🔗 <b>물리학에서</b> 이중 슬릿을 지난 두 빛이 경로차에 따라 간섭하는 것을 배웠어요. 앞 차시에서는 반사 위상까지 따져 박막 간섭을 설명했어요. 이번에는 <b>틈 하나</b>를 지나는 파동이 어떻게 되는지 알아봐요.</div>' +
        '<p>파동은 틈이나 장애물의 가장자리를 지나면 그림자 영역으로 <b>퍼져 나가요</b>. 이것이 <b>회절</b>이에요. 틈이 <b>좁을수록</b>, 파장이 <b>길수록</b> 더 크게 퍼져요. 물결 탱크와 레이저로 확인하고, 소리와 빛이 왜 다르게 느껴지는지 알아봐요. (회절은 식 없이 그림으로 읽어요.)</p>',
      features: ['diff'],
      setup() { S.df.sub = 'tank'; S.df.aCm = 8.0; S.df.lamCm = 2.0; slA.set(80); slL.set(20); S.df.seenStraight = false; S.df.seenSpread = false; S.df.hold = 0; S.df.holdK = ''; S.df.seenSlits = {}; S.show.selD = false; setScene('diff'); },
      recap: '파동은 틈을 지나면 퍼져 나가요(회절). 틈이 좁을수록, 파장이 길수록 더 크게 퍼지고, 틈이 파장과 비슷할 때 가장 뚜렷해요. 회절 무늬는 중앙이 가장 밝고 넓으며 양옆에 약한 무늬가 늘어서요.',
      summary: '<ul><li><b>회절</b>: 파동이 틈이나 장애물 가장자리를 지나 퍼져 나가는 현상이에요. 빛도 파동이라서 회절해요.</li><li>틈이 <b>좁을수록</b>, 파장이 <b>길수록</b> 더 크게 퍼져요. 틈 폭이 파장과 비슷하거나 더 작을 때 퍼짐이 가장 커요.</li><li>레이저를 좁은 틈에 비추면 스크린에 <b>중앙이 가장 밝고 넓은 무늬</b>와 양옆의 약한 무늬가 생겨요. 틈이 좁을수록 중앙 무늬가 넓어져요.</li><li>소리(파장 약 0.5 m)는 문 폭(1 m)과 비슷해서 모퉁이를 돌아 들리지만, 빛(파장 약 500 nm)은 문 폭에 비해 아주 짧아서 거의 직진으로 보여요.</li></ul>',
      missions: [
        {
          title: '틈을 좁혀 퍼짐 관찰하기',
          goal: '🌊 물결 탱크에서 틈이 파장의 <b>4배 이상</b>일 때와 <b>1.2배 이하</b>일 때를 각각 1초쯤 유지해 보세요. 그리고 🔦 레이저에서 틈 폭 <b>세 가지</b>를 모두 골라 보세요.',
          hint: '탱크의 점선은 직진할 때 닿는 범위예요. 틈 폭 슬라이더를 오른쪽 끝(넓게)으로, 다음엔 왼쪽(좁게)으로 옮겨 보세요. 레이저 화면은 위의 🔦 레이저 버튼으로 바꿔요.',
          setup() { S.df.sub = 'tank'; S.df.aCm = 8.0; S.df.lamCm = 2.0; slA.set(80); slL.set(20); S.df.seenStraight = false; S.df.seenSpread = false; S.df.hold = 0; S.df.holdK = ''; S.df.seenSlits = {}; S.show.selD = false; setScene('diff'); },
          check: () => S.df.seenStraight && S.df.seenSpread && Object.keys(S.df.seenSlits).length >= 3,
          hold: 0.4,
          status: () => mark(S.df.seenStraight) + ' 틈이 파장의 4배 이상(직진) &nbsp; ' + mark(S.df.seenSpread) + ' 1.2배 이하(크게 퍼짐) &nbsp; ' + mark(Object.keys(S.df.seenSlits).length >= 3) + ' 레이저 틈 ' + Object.keys(S.df.seenSlits).length + ' / 3',
          explain: '틈이 파장보다 훨씬 넓으면 물결은 거의 직진하고, 틈이 파장과 비슷하거나 더 좁아지면 틈이 새로운 파원처럼 작용해서 둥글게 퍼져요. 레이저도 마찬가지로 틈을 0.5 mm → 0.1 mm → 0.02 mm로 좁힐수록 스크린의 중앙 밝은 무늬가 넓어져요.',
        },
        {
          title: '퍼짐이 커지는 조건 정리', manual: true,
          goal: '관찰한 내용을 바탕으로 문장 세 개를 완성하세요.',
          hint: '틈 폭을 줄이고 파장을 늘렸을 때 점선 밖으로 퍼지는 정도를 다시 확인해 보세요.',
          setup() { S.show.selD = true; SEL_D.reset(); S.df.sub = 'tank'; setScene('diff'); },
          check: () => SEL_D.grade(),
          status: () => '고른 문장 ' + SEL_D.count() + ' / 3',
          explain: '틈이 좁을수록, 파장이 길수록 회절이 커요. 퍼짐은 틈 폭이 <b>파장과 비슷하거나 더 작을 때</b> 가장 크고, 파장보다 훨씬 넓으면 거의 직진해요.',
        },
        {
          type: 'quiz', title: '소리는 돌아 들리는데 빛은?',
          goal: '모퉁이 너머에서 소리는 들리지만, 같은 문을 지난 빛은 모퉁이 너머를 비추지 못해요. 그 까닭은?',
          setup() { S.show.selD = false; S.df.sub = 'door'; S.df.door = 'sound'; setScene('diff'); },
          choices: ['빛은 파동이 아니라서 회절하지 않기 때문에', '빛의 파장이 문 폭에 비해 훨씬 짧아서 퍼짐이 아주 작기 때문에', '소리가 빛보다 훨씬 빨라서', '소리는 벽을 통과하지만 빛은 벽을 통과하지 못해서'],
          answer: 1,
          feedback: ['빛도 파동이라서 회절해요. 다만 문 폭에 비해 파장이 너무 짧아 퍼짐이 눈에 띄지 않는 거예요.', '', '속력이 아니라 파장과 문 폭의 비가 퍼짐을 정해요.', '소리가 돌아 들리는 것은 벽을 통과해서가 아니라 문에서 회절해서예요.'],
          explain: '소리는 파장(약 0.5 m)이 문 폭(1 m)과 비슷해서 크게 회절하고, 빛은 파장(약 500 nm)이 문 폭의 약 200만분의 1이라 회절이 거의 눈에 띄지 않아요. 빛도 <b>아주 좁은 틈</b>(파장에 가까운 폭)에서는 뚜렷하게 회절해요.',
        },
      ],
    },
    {
      title: '분해능: 두 점을 구분할 수 있을까?', short: '분해능', icon: '🔍', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 빛이 좁은 틈을 지나면 퍼지는 것을 봤어요. 렌즈의 구멍(구경)도 일종의 둥근 틈이라서, 별 한 개의 상도 점이 아니라 <b>회절로 번진 원반</b>이 돼요.</div>' +
        '<p>멀리 있는 <b>두 점광원</b>(별 두 개, 자동차 전조등 두 개)의 상은 두 개의 원반이 돼요. 원반이 많이 겹치면 <b>한 점</b>으로 보이고, 가운데가 패일 만큼 떨어지면 <b>두 점</b>으로 구분돼요. 두 점을 구분하는 능력을 <b>분해능</b>이라고 해요. 구경과 빛의 색(파장)을 바꿔서 비교해 봐요. (식 없이 그림으로 읽어요.)</p>',
      features: ['res'],
      setup() { S.rs.s = 8.0; S.rs.sD = 8.0; S.rs.ap = 'small'; S.rs.col = '650'; slS.set(80); S.rs.combos = {}; S.rs.held = 0; S.rs._k = ''; S.show.selR = false; setScene('res'); },
      recap: '렌즈 구멍에서 회절된 점의 상은 번진 원반이에요. 구경이 크거나 파장이 짧을수록 원반이 작아서 더 가까운 두 점도 구분할 수 있어요. 이것이 분해능이에요.',
      summary: '<ul><li>점광원의 상은 렌즈 구멍에서 <b>회절</b>되어 번진 원반이에요. 두 원반이 많이 겹치면 한 점처럼 보여요.</li><li><b>구경이 클수록</b>, <b>파장이 짧을수록</b> 원반이 작아져서 분해능이 좋아요(더 가까운 두 점을 구분해요).</li><li>전자 현미경이 광학 현미경보다 분해능이 좋은 까닭: 전자의 물질파 파장이 가시광선보다 훨씬 짧아서예요.</li><li>블루레이(405 nm) &gt; DVD(650 nm) &gt; CD(780 nm) 순으로 파장이 짧은 레이저를 써서 더 작은 홈을 읽고 더 많이 저장해요.</li></ul>',
      missions: [
        {
          title: '가까운 두 점도 구분되게 만들기',
          goal: '두 점 사이의 간격을 <b>5.0 이하</b>로 하고도 두 점이 <b>구분됨</b>이 되도록 구경이나 빛의 색을 바꿔 보세요.',
          hint: '처음(작은 구경, 빨강)에서는 간격 5.0이 한 점처럼 보여요. 큰 구경이나 파랑으로 바꿔 보세요. 둘 다 바꾸면 더 가까운 점도 구분돼요.',
          setup() { S.rs.s = 8.0; S.rs.sD = 8.0; S.rs.ap = 'small'; S.rs.col = '650'; slS.set(80); S.show.selR = false; setScene('res'); },
          check: () => S.rs.s <= 5.0 && resState().kind === 'ok',
          hold: 0.8,
          status: () => mark(S.rs.s <= 5.0) + ' 간격 ' + S.rs.s.toFixed(1) + ' (5.0 이하) &nbsp; ' + mark(resState().kind === 'ok') + ' 구분됨 (지금 ' + (resState().kind === 'ok' ? '구분됨' : resState().kind === 'vague' ? '모호' : '한 점') + ')',
          explain: '구경을 키우거나 파장이 짧은 파랑을 쓰면 회절 원반이 작아져서, 같은 간격에서도 두 원반이 덜 겹쳐 두 점으로 구분돼요.',
        },
        {
          title: '분해능이 좋은 조합 찾기', manual: true,
          goal: '구경(작은·큰)과 색(빨강·파랑)의 네 조합을 모두 살펴본 뒤, 문장을 완성하세요.',
          hint: '네 가지 조합을 각각 잠깐씩 두고 “구분되는 최소 간격”(아래 읽음 칸)을 비교해 보세요. 작을수록 분해능이 좋은 거예요.',
          setup() { S.show.selR = true; SEL_R.reset(); S.rs.combos = {}; S.rs.held = 0; S.rs._k = ''; setScene('res'); },
          check() {
            const n = Object.keys(S.rs.combos).length;
            if (n < 4) return '네 가지 조합을 모두 살펴봐 주세요. (' + n + ' / 4)';
            return SEL_R.grade();
          },
          status: () => '살펴본 조합 ' + Object.keys(S.rs.combos).length + ' / 4 &nbsp; · 고른 문장 ' + SEL_R.count() + ' / 3',
          explain: '구분되는 최소 간격은 파랑·큰 구경이 가장 작고, 빨강·작은 구경이 가장 커요. 전자 현미경은 전자의 물질파 파장이 가시광선보다 훨씬 짧아서 광학 현미경보다 훨씬 작은 것도 구분해요.',
        },
        {
          type: 'quiz', title: '블루레이가 더 많이 저장하는 까닭',
          goal: '블루레이는 CD보다 같은 크기의 디스크에 훨씬 많은 정보를 저장해요. 그 까닭은?',
          setup() { S.show.selR = false; setScene('res'); },
          choices: ['디스크가 더 크기 때문에', '파장이 더 짧은 레이저(405 nm)를 써서 더 작은 점을 읽고 쓸 수 있기 때문에', '레이저가 더 밝아서 더 멀리 가기 때문에', '파란 빛이 디스크를 더 잘 통과하기 때문에'],
          answer: 1,
          feedback: ['같은 크기의 디스크예요. 크기가 아니라 읽을 수 있는 점의 크기가 달라요.', '', '밝기보다 레이저 빛이 모이는 점의 크기가 중요해요. 회절 원반이 작을수록 더 촘촘한 홈을 구분해요.', '디스크에서 빛이 통과하는지가 아니라 빛이 모이는 점의 크기(분해능)가 중요해요.'],
          explain: '레이저 빛도 렌즈에서 회절되어 작은 원반으로 모여요. <b>파장이 짧을수록 원반이 작아져서</b> 더 촘촘한 홈을 구분하고 더 많이 저장할 수 있어요. 블루레이(405 nm) &gt; DVD(650 nm) &gt; CD(780 nm) 순이에요.',
        },
      ],
    },
    {
      title: '홀로그램 기록: 간섭무늬를 새겨요', short: '홀로그램 기록', icon: '🧪', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 회절과 간섭을 알았어요. 이제 <b>간섭무늬로 입체 영상을 기록하는 기술</b>, 홀로그램을 만들어 봐요. 앞 차시의 <b>보강·상쇄 조건</b>(경로차와 위상)이 그대로 쓰여요.</div>' +
        '<p>레이저 빛을 <b>빔 분할기</b>로 둘로 나눠요. 한쪽은 물체에 맞아 반사된 빛(<b>물체광</b>), 다른 쪽은 거울로 돌린 빛(<b>기준광</b>)이에요. 두 빛이 필름에서 만나 <b>간섭무늬</b>를 새겨요. 필름에는 물체의 그림이 아니라 파장 정도의 아주 미세한 무늬가 기록돼요.</p>',
      features: ['holo'],
      setup() { S.hl.view = 'rec'; S.hl.table = true; S.hl.vib = 0.30; slV.set(30); placeAll(false); S.hl.vibSeen = false; S.hl.vibHold = 0; S.show.selH = false; S.show.rec = true; setScene('holo'); },
      recap: '홀로그램은 물체광과 기준광이 필름에서 만나 만드는 간섭무늬를 기록해요. 사진은 밝기만 기록하지만 홀로그램은 위상 정보까지 기록하고, 바닥이 파장 정도로 흔들리면 무늬가 지워지므로 방진대가 필요해요.',
      summary: '<ul><li><b>기록</b>: 레이저 → 빔 분할기 → ① 물체에 맞아 반사된 <b>물체광</b> + ② 거울로 돌린 <b>기준광</b> → 필름에서 <b>간섭</b>.</li><li>필름에는 밝은 줄(보강)과 어두운 줄(상쇄)로 된 파장 정도(1 μm 이하) 간격의 <b>미세한 간섭무늬</b>가 새겨져요. 그림이 들어 있는 것이 아니에요.</li><li><b>사진</b>은 렌즈로 상을 맺어 빛의 세기(밝기)만 기록하지만, <b>홀로그램</b>은 기준광과 간섭시켜 세기와 <b>위상</b>(빛이 오는 방향의 정보)을 함께 기록해요.</li><li>바닥이 파장 정도로 흔들리면 무늬가 지워져서 <b>방진대</b> 위에서 만들어요.</li></ul>',
      missions: [
        {
          title: '광학대에 부품 배치하기',
          goal: '아래 상자의 다섯 부품을 끌어서 광학대의 <b>점선 자리</b>에 놓으세요. (레이저 · 빔 분할기 · 거울 · 물체 · 필름)',
          hint: '부품 이름이 적힌 점선 자리가 있어요. 레이저는 왼쪽, 분할기는 그 오른쪽, 거울은 분할기 위쪽, 물체는 분할기 오른쪽, 필름은 가장 오른쪽 위예요.',
          setup() { S.hl.view = 'rec'; S.hl.table = true; slV.set(30); S.hl.vib = 0.30; placeAll(false); S.show.selH = false; setScene('holo'); },
          check: () => allPlaced(),
          hold: 0.6,
          status: () => mark(S.hl.items.every((i) => i.placed)) + ' 배치한 부품 ' + S.hl.items.filter((i) => i.placed).length + ' / 5',
          explain: '레이저 빛이 빔 분할기에서 둘로 나뉘어요. 곧게 가는 빛은 물체에 맞고 흩어져(물체광), 위로 꺾인 빛은 거울에서 필름으로 가요(기준광). 두 빛이 필름에서 만나 간섭해요.',
        },
        {
          title: '기준광과 방진대가 필요한 까닭', manual: true,
          goal: '방진대를 <b>끄고</b> 바닥 진동을 키워 무늬가 흐려지는 것을 본 뒤, 문장 네 개를 완성하세요.',
          hint: '“방진대 끄기”를 누르고 진동 슬라이더를 크게 하면 선명도가 50% 아래로 떨어져요. 1초쯤 지켜보세요.',
          setup() { placeAll(true); S.hl.view = 'rec'; S.hl.table = true; S.hl.vib = 0.30; slV.set(30); S.hl.vibSeen = false; S.hl.vibHold = 0; S.show.selH = true; SEL_H.reset(); setScene('holo'); },
          check() {
            if (!S.hl.vibSeen) return '먼저 방진대를 끄고 무늬가 흐려지는(선명도 50% 아래) 모습을 1초쯤 지켜보세요.';
            return SEL_H.grade();
          },
          status: () => mark(S.hl.vibSeen) + ' 진동으로 흐려진 무늬 관찰 &nbsp; · 고른 문장 ' + SEL_H.count() + ' / 4',
          explain: '간섭무늬를 만들려면 물체광과 <b>같은 레이저에서 나온 기준광</b>이 필요해요. 기준광과의 간섭무늬에는 물체광의 세기와 <b>위상</b>이 함께 기록돼요. 밝은 줄은 보강, 어두운 줄은 상쇄한 곳이에요. 바닥이 파장 정도로 흔들리면 무늬가 지워져서 방진대가 필요해요.',
        },
        {
          type: 'quiz', title: '필름 속에는 무엇이 들어 있을까?',
          goal: '기록이 끝난 홀로그램 필름을 확대해 보면 무엇이 들어 있을까요?',
          setup() { S.show.selH = false; S.hl.view = 'photo'; setScene('holo'); },
          choices: ['물체의 작은 입체 모형이 들어 있다', '사진처럼 물체의 모습이 흑백으로 그려져 있다', '그림은 없고 미세한 간섭무늬만 있다. 상은 기준광을 비출 때 만들어진다', '아무 무늬도 없고 레이저가 상을 만들어 낸다'],
          answer: 2,
          feedback: ['필름 안에 물체나 그림이 들어 있는 것이 아니에요. 확대 그림을 보세요.', '그건 일반 사진이에요. 홀로그램 필름에는 그림이 없어요.', '', '필름에는 두 빛의 간섭무늬가 새겨져 있어요.'],
          explain: '홀로그램 필름에는 물체의 그림이 없고, 파장 정도 간격의 <b>간섭무늬</b>만 있어요. 이 무늬에 물체광의 세기와 위상 정보가 들어 있어서, 나중에 기준광을 비추면 물체광이 다시 만들어져요.',
        },
      ],
    },
    {
      title: '재생과 활용: 입체상이 떠올라요', short: '재생과 활용', icon: '🎞️', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 필름에 물체광과 기준광의 간섭무늬를 새겼어요. 이제 필름에 <b>기준광만</b> 비춰서 상을 되살려 봐요.</div>' +
        '<p>필름의 미세한 무늬는 <b>회절 격자</b>처럼 기준광을 퍼뜨려서 원래 <b>물체광의 파면</b>을 다시 만들어요. 그래서 눈에는 필름 뒤에 물체가 있는 것처럼 <b>입체상</b>이 보여요. 눈의 위치를 옮기면 물체의 다른 쪽이 보이고, 필름을 조각내도 상 전체가 보여요(시야만 좁아져요).</p>',
      features: ['play'],
      setup() { S.pl.e = 0; S.pl.eD = 0; slE.set(0); S.pl.cut = 'full'; S.pl.ref = true; S.pl.seenStar = false; S.pl.cutSeen = false; S.pl.hold = 0; S.show.selP = false; setScene('play'); },
      recap: '기준광만 비추면 필름의 무늬가 회절 격자처럼 작용해 물체광이 재현돼요. 눈의 위치에 따라 다른 면이 보이고, 필름 조각에도 전체 상이 있어요. 홀로그램은 위조 방지, 간섭계 측정, 데이터 저장 연구 등에 쓰여요.',
      summary: '<ul><li><b>재생</b>: 기준광만 비추면 필름의 간섭무늬가 <b>회절 격자</b>처럼 빛을 퍼뜨려 원래 물체광의 파면을 재현해요. 필름 뒤에 물체가 있는 듯한 <b>입체상</b>(허상)이 보여요.</li><li>눈의 위치를 옮기면 앞 물체가 뒤 물체를 가리는 정도가 달라져요(시차). 사진과 달리 <b>위상 정보</b>가 기록돼 있기 때문이에요.</li><li>필름을 <b>조각내도</b> 각 조각에 전체 정보가 있어서 상 전체가 보여요. 다만 창이 작아져 <b>시야만 좁아져요</b>.</li><li>활용: 신용카드·지폐의 <b>위조 방지 홀로그램</b>, <b>홀로그래피 간섭계</b>(진동·변형을 부수지 않고 측정), 회절 격자 소자, 데이터 저장 연구. CD 뒷면의 무지갯빛도 촘촘한 트랙이 회절 격자 역할을 하기 때문이에요.</li></ul>',
      missions: [
        {
          title: '가려진 별 찾기',
          goal: '눈의 위치를 옮겨서 앞 물체(공) 뒤에 <b>숨은 별</b>이 보이게 하세요. (필름은 전체, 기준광은 켠 상태)',
          hint: '눈 위치 슬라이더를 위쪽이나 아래쪽 끝 가까이(눈금 75 이상) 옮겨 보세요. 시선이 공을 비껴 지나가면 별이 보여요.',
          setup() { S.pl.e = 0; S.pl.eD = 0; slE.set(0); S.pl.cut = 'full'; S.pl.ref = true; S.pl.seenStar = false; S.pl.hold = 0; S.show.selP = false; setScene('play'); },
          check: () => plView(S.pl.e, S.pl.cut, S.pl.ref).star,
          hold: 0.6,
          status: () => mark(Math.abs(S.pl.e) >= 74) + ' 눈 위치 ' + (S.pl.e === 0 ? '정면' : Math.abs(S.pl.e) + ' 눈금') + ' &nbsp; ' + mark(plView(S.pl.e, S.pl.cut, S.pl.ref).star) + ' 별이 보임',
          explain: '앞 물체(공)와 뒤 물체(별)는 눈에서 거리가 달라서, 눈을 옮기면 가까운 공이 더 많이 움직여 보여요. 그래서 별이 공 뒤에서 나타나요. 홀로그램에는 빛이 오는 방향(위상) 정보까지 기록돼 있어서 사진에는 없는 이런 시차가 생겨요.',
        },
        {
          title: '활용과 재생 원리 연결하기', manual: true,
          goal: '✂ 필름을 한 조각만 남겨 상이 어떻게 보이는지 살펴본 뒤, 문장 네 개를 완성하세요.',
          hint: '“✂ 한 조각만”을 눌러 눈을 움직여 보세요. 공은 보이지만 창이 좁아 별은 보기 어려워요.',
          setup() { S.show.selP = true; SEL_P.reset(); S.pl.cutSeen = false; S.pl.cut = 'full'; S.pl.ref = true; setScene('play'); },
          check() {
            if (!S.pl.cutSeen) return '먼저 ✂ 한 조각만 눌러 필름 조각으로 상을 살펴보세요.';
            return SEL_P.grade();
          },
          status: () => mark(S.pl.cutSeen) + ' 필름 조각 살펴보기 &nbsp; · 고른 문장 ' + SEL_P.count() + ' / 4',
          explain: '필름 한 조각에도 전체 정보가 들어 있어서 <b>상 전체가 보이고 시야만 좁아져요</b>. 홀로그램 카드는 필름이 회절 격자처럼 작용하므로 보는 각도에 따라 다른 빛과 다른 면이 보여요. 위조 방지, 간섭계 측정 등에 활용돼요.',
        },
        {
          type: 'quiz', title: 'CD가 무지갯빛으로 보이는 까닭',
          goal: 'CD의 반짝이는 면에 백색광을 비추면 무지갯빛이 보여요. 그 까닭은?',
          setup() { S.show.selP = false; setScene('play'); },
          choices: ['표면에 무지개색 물감이 칠해져 있기 때문에', '촘촘한 트랙이 회절 격자 역할을 해서 파장마다 다른 방향으로 빛이 보강되기 때문에', '플라스틱이 백색광을 여러 색으로 흡수하기 때문에', '표면이 거울이라 햇빛이 그대로 반사되기 때문에'],
          answer: 1,
          feedback: ['물감 때문이 아니라 빛의 회절과 간섭 때문이에요. 보는 각도에 따라 색이 달라지는 것이 단서예요.', '', '흡수가 아니라 회절로 빛이 갈라져요.', '거울 반사라면 백색광이 그대로 보여요. 색이 갈라지는 것은 회절 때문이에요.'],
          explain: 'CD의 트랙은 파장과 비슷한 간격으로 촘촘히 늘어서 <b>회절 격자</b>처럼 작용해요. 파장마다 보강되는 방향이 달라서 보는 각도에 따라 다른 색이 보여요. 홀로그램 카드의 색과 모습이 각도에 따라 달라 보이는 것도 같은 원리예요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hq-diffraction', mount: '#game', badge: '회절·홀로그램 탐험가', homeHref: '../../index.html#hq',
    featureLabels: { diff: '🌊 물결 탱크 · 레이저 · 소리와 빛', res: '🔍 두 점광원 · 구경 · 색', holo: '🧪 광학대 · 간섭무늬 확대', play: '🎞️ 재생 · 눈 위치 · 필름 조각' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  setScene('diff');
  updateCtl();
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t; S.dt = dt;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    view.apply();
    stepDiff(dt); stepRes(dt); stepHolo(dt); stepPlay(dt);
    ctx.clearRect(0, 0, VW, VH);
    if (S.mode === 'diff') drawDiff();
    else if (S.mode === 'res') drawRes();
    else if (S.mode === 'holo') drawHolo();
    else drawPlay();
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, MA, BOT, TK, TANK, DOOR, SEL_D, SEL_R, SEL_H, SEL_P, slA, slL, slS, slV, slE, resState, plView, placeAll, allPlaced, contrast, FRINGE, minSep, lasHalf, lasI, spreadKind, ratioNow, setScene, updateCtl, plLay, MIC, airy,
    setSub(sub) { S.df.sub = sub; updateCtl(); },
    perfPrep(m, sub) { if (m === 'holo') { placeAll(true); } if (m === 'diff' && sub) { S.df.sub = sub; updateCtl(); } },
    get game() { return game; },
  };

})();
