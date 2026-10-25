/* =========================================================
   전자기와 양자 Ⅱ. 빛과 정보 통신 - 레이저와 광통신 (단원 6차시)
   성취기준 [12전자02-05] 레이저의 특징과 빛이 증폭되는 원리를 알고, 레이저가 디지털 광통신 등 여러 영역에서 활용됨을
   조사하여 현대 문명에서 레이저의 중요성을 인식할 수 있다.
   ① 모형: 흡수와 방출 (흡수, 자발 방출, 유도 방출: 유도 방출한 광자는 진동수·위상·방향이 같아요)
   ② 탐구: 밀도 반전 (N₂ > N₁이어야 증폭, 펌핑, 3준위·4준위 도식은 정성적으로)
   ③ 모형: 공진기 (두 거울, 한쪽은 일부 투과, 이득 = 손실에서 일정한 출력, 직진성)
   ④ 적용: 특징과 활용 (단색성·결맞음·직진성·세기, 광통신과 광 증폭기, 안전 수칙)
   아인슈타인 A·B 계수 식, 레이저 모드 이론, 반도체 레이저의 띠 구조 상세, 가우스 빔 광학은 다루지 않아요.
   ========================================================= */
(function () {
  'use strict';
  const PH0 = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PH0 ? 480 : 800, VH = PH0 ? 680 : 560;
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

  /* ---------- 상수·모형 (화면의 숫자와 모두 같은 값) ---------- */
  const MA = PHONE ? { x: 8, y: 8, w: 464, h: 520 } : { x: 12, y: 12, w: 776, h: 414 };
  const BOT = PHONE ? { x: 8, y: 536, w: 464, h: 136 } : { x: 12, y: 436, w: 776, h: 112 };
  const LAM_HENE = 632.8, E_HENE = 1240 / LAM_HENE;               // 헬륨-네온 레이저: 632.8 nm, 1.96 eV
  const NAT = 100;                                                  // 원자 상자의 원자 수
  const n2Of = (p) => 1 + Math.round(0.75 * p);                     // 펌핑 세기 p (0~100) → 높은 준위의 원자 수 N₂
  const KAPPA = 0.35;                                               // 칸마다 (N₂ − N₁)에 비례해 광자 수가 바뀌는 정도
  const gainOf = (N2) => Math.exp(KAPPA * (N2 - (NAT - N2)) / 10);  // 상자 전체를 지날 때 광자 수의 배율(기댓값)
  const colFactor = (h) => Math.exp(KAPPA * (2 * h - 10) / 10);     // 한 칸(원자 10개, 그중 h개가 높은 준위)의 배율
  const G0MAX = 0.30;                                               // 한 번 왕복할 때 최대 이득의 크기
  const gainRT = (N2) => G0MAX * Math.max(0, (2 * N2 - NAT) / NAT);  // 밀도 반전이 클수록 이득이 커요
  const LOSS_IN = 0.005;                                            // 공진기 안의 그 밖의 손실 (0.5 %)
  const TM = { '1': 0.01, '5': 0.05, '10': 0.10, none: 1.0 };      // 출력 거울의 투과율 (none: 거울 없음)
  const lossOf = (tm) => (tm === 'none' ? 1.0 : TM[tm] + LOSS_IN);
  const NSAT = 10, RTIME = 25;                                      // 이득 포화 광자 수, 시간 배율
  const nSS = (g, loss) => (g > loss ? NSAT * (g / loss - 1) : 0);  // 일정해지는 광자 수 (이득 = 손실)
  const outOf = (tm, n) => (tm === 'none' ? 0 : TM[tm] * n);        // 상대 출력
  const FIB = { alpha: 0.2, thr: -10, L: 100 };                     // 광섬유 손실 0.2 dB/km, 수신 한계 −10 dB(1/10), 길이 100 km
  const fiberDb = (pos, x) => (pos > 0 && x >= pos ? -FIB.alpha * (x - pos) : -FIB.alpha * x);   // 증폭기는 세기를 처음 값(0 dB)으로 되돌려요
  const fiberMin = (pos) => (pos <= 0 ? -FIB.alpha * FIB.L : Math.min(-FIB.alpha * pos, fiberDb(pos, FIB.L)));
  const fiberOK = (pos) => fiberMin(pos) >= FIB.thr - 1e-9 && fiberDb(pos, FIB.L) >= FIB.thr - 1e-9;
  const dBlin = (db) => Math.pow(10, db / 10);
  // 안전 수칙
  const RULES = [
    { id: 'r1', t: '빔 높이를 눈보다 낮게 해요', ok: true },
    { id: 'w1', t: '약한 포인터는 사람 눈에 잠깐 비춰도 괜찮아요', ok: false },
    { id: 'r2', t: '거울·유리·금속 같은 반사면은 향하지 않거나 치워요', ok: true },
    { id: 'w2', t: '거울에 비추면 빛이 약해지니 안전해요', ok: false },
    { id: 'r3', t: '보호 안경을 쓰고 경고 표지를 붙여요', ok: true },
    { id: 'w3', t: '선글라스를 쓰면 보호 안경은 필요 없어요', ok: false },
    { id: 'r4', t: '쓰지 않을 때는 전원을 꺼요', ok: true },
  ];

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'atom', t: 0, fade: 0,
    show: { selA: false, selB: false, selC: false, safe: false },
    at: { proc: 'abs', tp: 0, playing: true, seen: { abs: false, spon: false, stim: false }, ang: 40, ph: 1.3, run: 0 },
    iv: { p: 0, shots: [], nIn: 0, nOut: 0, shotLow: false, shotHigh: false, diag: '4', seenDiag: { '3': false, '4': true }, bars: 0, pend: 0 },
    cv: { on: false, p: 90, tm: '1', n: 0, hist: [], seenTm: { '1': true }, side: [], axis: [], beam: [], lasing: false, tAcc: 0, nD: 0 },
    ap: { sub: 'compare', dist: 100, amp: 0, ch: 1, safe: {}, seenCmp: false, seenFib: false, seenSaf: false, ampD: 0 },
  };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const MODE_LABEL = { atom: '⚛️ 흡수와 방출', invert: '📦 밀도 반전', cavity: '🔴 공진기', apps: '🌐 특징과 활용' };
  const rnd1 = (a, b) => a + Math.random() * (b - a);
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
      if (on && sub) on = sub.split(' ').indexOf(S.ap.sub) >= 0;
      const dm = n.getAttribute('data-match');
      if (on && dm) on = !!S.show[dm] || (!!game && game.free && dm === 'safe');
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    procSeg.set(S.at.proc); diagSeg.set(S.iv.diag); tmSeg.set(S.cv.tm); apSeg.set(S.ap.sub); chSeg.set(String(S.ap.ch));
    const pb = $('#bPump'); if (pb) { pb.textContent = S.cv.on ? '🔌 펌핑 끄기' : '⚡ 펌핑 켜기 (레이저 켜기)'; pb.classList.toggle('btn-primary', !S.cv.on); }
    $$('#safeChips button').forEach((b) => { b.classList.toggle('on', !!S.ap.safe[b.dataset.i]); });
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));

  /* ---------- 컨트롤 연결 ---------- */
  const procSeg = bindSeg('procSeg', (v) => { startProc(v); });
  const diagSeg = bindSeg('diagSeg', (v) => { S.iv.diag = v; S.iv.seenDiag[v] = true; updateCtl(); });
  const tmSeg = bindSeg('tmSeg', (v) => { S.cv.tm = v; S.cv.seenTm[v] = true; updateCtl(); });
  const apSeg = bindSeg('apSeg', (v) => { S.ap.sub = v; if (v === 'compare') S.ap.seenCmp = true; if (v === 'fiber') S.ap.seenFib = true; if (v === 'safety') S.ap.seenSaf = true; parts.clear(); updateCtl(); });
  const chSeg = bindSeg('chSeg', (v) => { S.ap.ch = +v; updateCtl(); });
  const slP = bindSlider('sP', (v) => v + '', (v) => { S.iv.p = +v; });
  const slQ = bindSlider('sQ', (v) => v + '', (v) => { S.cv.p = +v; });
  const slD = bindSlider('sD', (v) => v + ' m', (v) => { S.ap.dist = +v; });
  const slA = bindSlider('sA', (v) => (+v === 0 ? '없음' : v + ' km'), (v) => { S.ap.amp = +v; });
  $('#bRun').addEventListener('click', () => { Sound.click(); startProc(S.at.proc); });
  $('#bShot').addEventListener('click', () => { Sound.click(); fireShot(); });
  $('#bPump').addEventListener('click', () => { Sound.click(); S.cv.on = !S.cv.on; updateCtl(); });
  $$('#safeChips button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.ap.safe[b.dataset.i] = !S.ap.safe[b.dataset.i]; updateCtl(); }));
  function startProc(p) {
    const A = S.at; A.proc = p; A.tp = 0; A.playing = true; A.run++;
    A.ang = [-70, -40, -15, 20, 50, 75, 130, 160, 200, 235][Math.floor(Math.random() * 10)]; A.ph = rnd1(0, TAU);
    updateCtl();
  }

  const SEL_A = mkSelRows('selA', [
    { q: '광자가 사라지고 원자가 높은 준위로 올라가는 과정은', opts: ['흡수', '자발 방출', '유도 방출'], ans: 0 },
    { q: '원자가 저절로 아래 준위로 내려오며 광자를 <b>임의의 방향</b>으로 내보내는 과정은', opts: ['흡수', '자발 방출', '유도 방출'], ans: 1 },
    { q: '지나가던 광자가 들뜬 원자를 자극해 <b>똑같은 광자</b>를 하나 더 만드는 과정은', opts: ['흡수', '자발 방출', '유도 방출'], ans: 2 },
    { q: '레이저에서 빛을 증폭하는 데 쓰이는 과정은', opts: ['흡수', '자발 방출', '유도 방출'], ans: 2 },
  ]);
  const SEL_B = mkSelRows('selB', [
    { q: '빛이 증폭되려면 높은 준위의 원자 수 N₂와 낮은 준위의 원자 수 N₁이', opts: ['N₂ > N₁ (밀도 반전)', 'N₂ = N₁', 'N₂ < N₁ (열평형 상태)'], ans: 0 },
    { q: 'N₂ < N₁일 때 지나가는 광자는', opts: ['유도 방출로 늘어나요', '흡수되어 줄어들어요', '변함이 없어요'], ans: 1 },
    { q: '바깥에서 에너지를 주어 원자를 높은 준위로 올려 주는 일은', opts: ['펌핑', '공진', '자발 방출'], ans: 0 },
    { q: '원자가 오래 머무는 <b>준안정 준위</b>가 있으면 밀도 반전을', opts: ['만들기 쉬워요', '만들기 어려워요'], ans: 0 },
  ]);
  const SEL_C = mkSelRows('selC', [
    { q: '거울 축과 나란하지 않은 방향의 광자는', opts: ['옆으로 빠져나가요', '거울 사이를 계속 왕복해요'], ans: 0 },
    { q: '거울 축과 나란한 광자는', opts: ['거울 사이를 왕복하며 계속 증폭돼요', '곧바로 사라져요'], ans: 0 },
    { q: '그래서 레이저 빛은', opts: ['사방으로 퍼져요', '퍼짐이 아주 작은 평행한 빔이에요'], ans: 1 },
    { q: '출력 거울의 투과율을 1 %에서 10 %로 높이면 같은 펌핑에서 공진기 안의 광자 수는', opts: ['늘어요', '줄어요'], ans: 1 },
  ]);

  /* ---------- 그리기 도우미 ---------- */
  const rgbaH = (hex, a) => C.rgba(hex, a);
  const RED = '#e2464b', LRED = '#ff8a7a';
  const hexOf = (c) => '#' + c.map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
  const SCI = (x, d) => sci(x, d);
  function barH(x, y, w, h, frac, col, bg) {
    ctx.fillStyle = bg || '#e3e8f2'; D.roundRect(x, y, w, h, h / 2); ctx.fill();
    const fw = clamp(frac, 0, 1) * w;
    if (fw > 0.5) { ctx.save(); D.roundRect(x, y, w, h, h / 2); ctx.clip(); ctx.fillStyle = col; ctx.fillRect(x, y, fw, h); ctx.restore(); }
  }
  // 광자 파동 묶음: 방향 ang(도, 0 = 오른쪽, 시계 방향), 위상 ph
  function wavePacket(cx, cy, ang, ph, col, len, amp, alpha) {
    const a = ang * rad, ca = Math.cos(a), sa = Math.sin(a), lam = 15;
    ctx.save(); ctx.globalAlpha = alpha == null ? 1 : alpha; ctx.strokeStyle = col; ctx.lineWidth = 2.8; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let s = -len / 2; s <= len / 2; s += 2) {
      const env = Math.exp(-Math.pow(s / (len * 0.28), 2)), w = amp * env * Math.sin(TAU * s / lam - ph);
      const x = cx + ca * s - sa * w, y = cy + sa * s + ca * w;
      if (s === -len / 2) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke(); ctx.restore();
  }
  function atomSphere(x, y, r, excited, t) {
    if (excited) D.glow(x, y, r * 3.4, '#ffb400', 0.65 + 0.2 * Math.sin(t * 6));
    D.sphere(x, y, r, excited ? '#f26b3a' : '#7f93bd', { shadow: true });
  }

  /* ================= ① 흡수와 방출 ================= */
  const atLay = () => PHONE
    ? { a: { x: MA.x, y: MA.y, w: MA.w, h: 262 }, b: { x: MA.x, y: MA.y + 270, w: MA.w, h: MA.h - 270 } }
    : { a: { x: MA.x, y: MA.y, w: 504, h: MA.h }, b: { x: MA.x + 516, y: MA.y, w: 260, h: MA.h } };
  const AT_T = { abs: 3.6, spon: 3.8, stim: 4.2 };
  function atPanels() {
    const L = atLay().a;
    return PHONE
      ? { atom: { x: L.x + 8, y: L.y + 36, w: 280, h: 190 }, lev: { x: L.x + 296, y: L.y + 36, w: 160, h: 190 } }
      : { atom: { x: L.x + 12, y: L.y + 40, w: 310, h: 250 }, lev: { x: L.x + 330, y: L.y + 40, w: 162, h: 250 } };
  }
  // tp(초) 시점의 원자·광자 상태
  function atState(proc, tp, P, A) {
    const ax = P.x + P.w * 0.54, ay = P.y + P.h * 0.5;
    const st = { ax, ay, ex: false, eR: 26, ph: [], cnt: 0, from: 0, note: '', flash: 0 };
    const x0 = P.x + 34, x1 = ax - 46;
    if (proc === 'abs') {
      st.from = 1;
      if (tp < 1.8) { st.ph.push({ x: x0 + (x1 - x0) * tp / 1.8, y: ay, ang: 0, ph: 0 }); st.cnt = 1; st.note = '광자가 다가와요'; }
      else { st.ex = true; st.cnt = 0; st.eR = 26 + 26 * clamp((tp - 1.8) / 0.5, 0, 1); st.flash = clamp(1 - (tp - 1.8) / 0.5, 0, 1); st.note = '광자가 사라지고 원자가 들뜬 상태가 됐어요'; }
    } else if (proc === 'spon') {
      st.from = 0;
      if (tp < 1.4) { st.ex = true; st.eR = 52; st.note = '들뜬 원자가 기다리다가…'; }
      else {
        st.eR = 52 - 26 * clamp((tp - 1.4) / 0.5, 0, 1); st.cnt = 1; st.flash = clamp(1 - (tp - 1.4) / 0.5, 0, 1);
        const a = A.ang * rad, ca = Math.cos(a), sa = Math.sin(a);
        const room = Math.min(ca > 0 ? (P.x + P.w - 30 - ax) / ca : ca < 0 ? (P.x + 30 - ax) / ca : 1e9, sa > 0 ? (P.y + P.h - 40 - ay) / sa : sa < 0 ? (P.y + 36 - ay) / sa : 1e9);
        const s = Math.max(0, Math.min(room - 24, (tp - 1.4) * 120));
        st.ph.push({ x: ax + Math.cos(a) * (24 + s), y: ay + Math.sin(a) * (24 + s), ang: A.ang, ph: A.ph });
        st.note = '저절로 내려오며 임의의 방향으로 광자를 내보냈어요';
      }
    } else {
      st.from = 1;
      if (tp < 1.8) { st.ex = true; st.eR = 52; st.cnt = 1; st.ph.push({ x: x0 + (x1 - x0) * tp / 1.8, y: ay, ang: 0, ph: 0 }); st.note = '들뜬 원자 옆으로 광자가 지나가요'; }
      else {
        const s = Math.min(78, (tp - 1.8) * 100);
        st.eR = 52 - 26 * clamp((tp - 1.8) / 0.5, 0, 1); st.cnt = 2; st.flash = clamp(1 - (tp - 1.8) / 0.5, 0, 1);
        st.ph.push({ x: ax + 20 + s, y: ay - 11, ang: 0, ph: 0 }); st.ph.push({ x: ax + 20 + s, y: ay + 11, ang: 0, ph: 0 });
        st.note = '똑같은 광자가 하나 더 생겨 같은 방향으로 나가요';
      }
    }
    return st;
  }
  function stepAtom(dt) {
    const A = S.at;
    if (!A.playing) return;
    A.tp += dt;
    const T_ = AT_T[A.proc];
    if (A.tp >= T_ - 0.15) A.seen[A.proc] = true;
    if (A.tp >= T_) { A.tp = T_; A.playing = false; }
  }
  const procName = { abs: '흡수', spon: '자발 방출', stim: '유도 방출' };
  function drawAtom() {
    const A = S.at, L = atLay(), a = L.a, b = L.b, PN = atPanels(), P = PN.atom, LV = PN.lev, k = PHONE ? 0.85 : 1;
    panel(a.x, a.y, a.w, a.h, 14);
    T(a.x + 14, a.y + 24, '⚛️ 두 준위 원자와 광자 (' + procName[A.proc] + ')', PHONE ? 13.5 : 15, '#26324a', 'left', 800);
    const st = atState(A.proc, A.tp, P, A);
    // 원자 그림
    ctx.fillStyle = '#f7f9fd'; D.roundRect(P.x, P.y, P.w, P.h, 12); ctx.fill();
    ctx.save(); D.roundRect(P.x, P.y, P.w, P.h, 12); ctx.clip();
    ctx.strokeStyle = '#c7d0e0'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 5]);
    [26, 52].forEach((r) => { ctx.beginPath(); ctx.arc(st.ax, st.ay, r * k, 0, TAU); ctx.stroke(); }); ctx.setLineDash([]);
    atomSphere(st.ax, st.ay, 11 * k, false, S.t);
    // 전자는 궤도를 돌아요
    const ang = RM ? 0.6 : S.t * (st.ex ? 1.6 : 2.6), er = st.eR * k;
    if (st.ex) D.glow(st.ax + Math.cos(ang) * er, st.ay + Math.sin(ang) * er, 22 * k, '#ffb400', 0.85);
    D.sphere(st.ax + Math.cos(ang) * er, st.ay + Math.sin(ang) * er, 6 * k, '#2f6bff', { gloss: true });
    if (st.flash > 0.02) D.glow(st.ax, st.ay, 70 * k, '#ffe27a', st.flash * 0.9);
    // 광자 (헬륨-네온 632.8 nm: 빨강)
    st.ph.forEach((p) => { const phs = RM ? p.ph : p.ph + (p.ang === 0 ? 0 : 0) - S.t * 7; wavePacket(p.x, p.y, p.ang, p.ang === 0 ? -S.t * 7 : phs, RED, 62 * k, 8 * k, 1); });
    ctx.restore();
    ctx.strokeStyle = '#c7d0e0'; ctx.lineWidth = 1.5; D.roundRect(P.x, P.y, P.w, P.h, 12); ctx.stroke();
    T(P.x + 12, P.y + 20, st.ex ? '상태: 들뜸 (E₂)' : '상태: 바닥 (E₁)', PHONE ? 12.5 : 13.5, st.ex ? '#c4501b' : '#3f5a8c', 'left', 800);
    T(P.x + P.w - 12, P.y + 20, '광자 ' + st.from + '개 → ' + st.cnt + '개', PHONE ? 12.5 : 13.5, '#26324a', 'right', 800);
    if (A.proc === 'stim' && A.tp > 1.9) { D.label(clamp(st.ax + 70 * k, P.x + 80, P.x + P.w - 80), st.ay - 40 * k, '같은 위상 · 같은 방향', { size: PHONE ? 11 : 12.5, bg: '#16a05a' }); }
    if (A.proc === 'spon' && A.tp > 1.5) { const p = st.ph[0]; D.label(clamp(p.x, P.x + 60, P.x + P.w - 60), clamp(p.y - 22, P.y + 38, P.y + P.h - 38), '방향·위상 임의', { size: PHONE ? 11 : 12.5, bg: '#7a3cff' }); }
    T(P.x + P.w / 2, P.y + P.h - 10, st.note, PHONE ? 11.5 : 12.5, '#5d6879', 'center', 700);
    // 에너지 준위 그림
    ctx.fillStyle = '#f7f9fd'; D.roundRect(LV.x, LV.y, LV.w, LV.h, 12); ctx.fill();
    T(LV.x + LV.w / 2, LV.y + 18, '에너지 준위', PHONE ? 12.5 : 13.5, '#26324a', 'center', 800);
    const y2 = LV.y + 54, y1 = LV.y + LV.h - 50, lx0 = LV.x + 14, lx1 = LV.x + LV.w - 14;
    ctx.strokeStyle = '#26324a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(lx0, y2); ctx.lineTo(lx1 - 34, y2); ctx.moveTo(lx0, y1); ctx.lineTo(lx1 - 34, y1); ctx.stroke();
    T(lx0, y2 - 6, 'E₂', 13, '#26324a', 'left', 800); T(lx0, y1 - 6, 'E₁', 13, '#26324a', 'left', 800);
    D.arrow(lx1 - 14, y1, lx1 - 14, y2 + 2, { color: '#c0353b', width: 2, head: 7 }); D.arrow(lx1 - 14, y2, lx1 - 14, y1 - 2, { color: '#c0353b', width: 2, head: 7 });
    T(LV.x + LV.w / 2, LV.y + LV.h - 30, 'ΔE = E₂ − E₁ = hf', PHONE ? 11.5 : 12.5, '#c0353b', 'center', 800);
    T(LV.x + LV.w / 2, LV.y + LV.h - 12, E_HENE.toFixed(2) + ' eV (' + LAM_HENE + ' nm)', PHONE ? 11 : 12, '#5d6879', 'center', 800);
    const ye = y1 + (y2 - y1) * clamp((st.eR - 26) / 26, 0, 1), exx = LV.x + LV.w * 0.4 - 8;
    if (st.ex) D.glow(exx, ye, 20, '#ffb400', 0.8);
    D.sphere(exx, ye, 6.5, '#2f6bff', { gloss: true });
    // 준위 사이의 화살표 (일어나는 과정)
    const arrow = (x, ya, yb, col, al) => { ctx.save(); ctx.globalAlpha = al; D.arrow(x, ya, x, yb, { color: col, width: 3, head: 9 }); ctx.restore(); };
    if (A.proc === 'abs' && A.tp < 2.3) arrow(LV.x + LV.w * 0.62 - 8, y1 - 4, y2 + 6, RED, A.tp < 1.8 ? 0.35 : 1);
    if (A.proc === 'spon' && A.tp > 1.4 && A.tp < 2.4) arrow(LV.x + LV.w * 0.62 - 8, y2 + 4, y1 - 6, RED, 1);
    if (A.proc === 'stim' && A.tp > 1.8 && A.tp < 2.6) { arrow(LV.x + LV.w * 0.5 - 8, y2 + 4, y1 - 6, RED, 1); arrow(LV.x + LV.w * 0.7 - 8, y2 + 4, y1 - 6, RED, 1); }
    // 아래: 한 줄 정리
    const by = a.y + (PHONE ? 238 : 304);
    if (!PHONE) {
      textBlock(a.x + 16, by + 20, a.w - 32, A.proc === 'abs' ? '흡수: 에너지가 ΔE = hf인 광자만 흡수돼요. 원자는 E₁에서 E₂로 올라가고 광자는 사라져요.' : A.proc === 'spon' ? '자발 방출: 들뜬 원자는 저절로 E₂에서 E₁으로 내려오며 광자를 내보내요. 방향과 위상은 제멋대로예요.' : '유도 방출: 같은 hf의 광자가 들뜬 원자 곁을 지나가면 원자가 E₂에서 E₁으로 내려오며 똑같은 광자를 하나 더 내보내요.', 13.5, '#26324a', 20, 800);
      D.label(a.x + 16, a.y + a.h - 26, '▶ 시연 버튼으로 다시 볼 수 있어요', { size: 12, bg: '#7b8798', align: 'left' });
    }
    // 비교표
    panel(b.x, b.y, b.w, b.h, 14);
    const px = b.x + 12, pw = b.w - 24;
    T(px, b.y + 24, '세 과정 비교', PHONE ? 14 : 15, '#26324a', 'left', 800);
    const cols = PHONE ? [0, 0.18, 0.5, 0.74] : [0, 0.31, 0.62];
    const hdr = PHONE ? ['과정', '원자', '광자 수', '나오는 광자'] : ['과정', '원자', '광자 수'];
    hdr.forEach((h, i) => T(px + pw * cols[i], b.y + 50, h, 12.5, '#5d6879', 'left', 800));
    const rows = [
      { id: 'abs', n: '흡수', a: 'E₁ → E₂ (위로)', c: '1개 → 0개', o: '없음 (사라져요)' },
      { id: 'spon', n: '자발 방출', a: 'E₂ → E₁ (저절로)', c: '0개 → 1개', o: '방향·위상 임의' },
      { id: 'stim', n: '유도 방출', a: 'E₂ → E₁ (자극받아)', c: '1개 → 2개', o: '진동수·위상·방향 같음' },
    ];
    const rh = PHONE ? 46 : 74;
    rows.forEach((r, i) => {
      const yy = b.y + 60 + i * rh;
      if (r.id === A.proc) { ctx.fillStyle = 'rgba(242,107,58,.13)'; D.roundRect(b.x + 6, yy - 2, b.w - 12, rh - 4, 8); ctx.fill(); }
      if (A.seen[r.id]) T(b.x + b.w - 14, yy + 14, '✅', 13, '#16a05a', 'right', 800);
      T(px + pw * cols[0], yy + 16, r.n, PHONE ? 12.5 : 13.5, '#26324a', 'left', 800);
      if (PHONE) { textBlock(px + pw * cols[1], yy + 14, pw * 0.3, r.a, 11.5, '#26324a', 15, 700); T(px + pw * cols[2], yy + 16, r.c, 12, '#26324a', 'left', 800); textBlock(px + pw * cols[3], yy + 14, pw * 0.26, r.o, 11, '#5d6879', 14, 700); }
      else { textBlock(px + pw * cols[1], yy + 16, pw * 0.3, r.a, 12, '#26324a', 16, 700); T(px + pw * cols[2], yy + 16, r.c, 12.5, '#26324a', 'left', 800); textBlock(px + pw * cols[2], yy + 38, pw * 0.4, '나오는 광자: ' + r.o, 11.5, '#5d6879', 15, 700); }
    });
    const yb = b.y + 60 + 3 * rh + 6;
    if (!PHONE) { ctx.fillStyle = '#fff4ec'; D.roundRect(b.x + 8, yb, b.w - 16, 86, 10); ctx.fill(); textBlock(px, yb + 22, pw, 'hf = ΔE = E₂ − E₁ = ' + E_HENE.toFixed(2) + ' eV 인 광자만 상호작용해요. λ = 1240 / ' + E_HENE.toFixed(2) + ' ≈ ' + LAM_HENE + ' nm (헬륨-네온 레이저의 빨간빛)', 12.5, '#c4501b', 17, 800); }
    panel(BOT.x, BOT.y, BOT.w, BOT.h, 14);
    textBlock(BOT.x + 16, BOT.y + 28, BOT.w - 32, '레이저(LASER)는 “유도 방출에 의한 빛의 증폭”이에요. 먼저 빛과 물질이 주고받는 흡수와 방출을 세 가지로 나누어 봐요.', PHONE ? 13.5 : 15, '#26324a', PHONE ? 20 : 22, 800);
    textBlock(BOT.x + 16, BOT.y + (PHONE ? 98 : 84), BOT.w - 32, '(이 화면은 원자 한 개의 모형이에요. 광자의 파장 632.8 nm는 헬륨-네온 레이저의 값이에요.)', 12.5, '#5d6879', 18, 700);
  }

  /* ================= ② 밀도 반전 ================= */
  const ORDER = (() => {
    const rnd = mulberry32(2024), perm = [];
    for (let c = 0; c < 10; c++) { const a = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]; for (let i = 9; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } perm.push(a); }
    const o = []; for (let s = 0; s < 100; s++) { const col = s % 10, row = perm[col][Math.floor(s / 10)]; o.push(row * 10 + col); }
    return o;
  })();
  const rankOf = (() => { const r = new Array(100); ORDER.forEach((idx, s) => { r[idx] = s; }); return r; })();
  const ivN2 = () => n2Of(S.iv.p), ivN1 = () => NAT - ivN2();
  const highCol = (N2, c) => Math.floor(N2 / 10) + (c < N2 % 10 ? 1 : 0);
  const ivLay = () => PHONE
    ? { a: { x: MA.x, y: MA.y, w: MA.w, h: 316 }, b: { x: MA.x, y: MA.y + 324, w: MA.w, h: MA.h - 324 } }
    : { a: { x: MA.x, y: MA.y, w: 500, h: MA.h }, b: { x: MA.x + 512, y: MA.y, w: 264, h: MA.h } };
  function ivBox() {
    const A = ivLay().a, cs = PHONE ? 24 : 32;
    return { x: A.x + (PHONE ? 34 : 50), y: A.y + (PHONE ? 38 : 44), cs, w: cs * 10, h: cs * 10 };
  }
  const ivPh = [];
  function fireShot() {
    const I = S.iv;
    if (ivPh.length) return;
    const rows = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5).slice(0, 5);
    const N2 = ivN2();
    rows.forEach((r, i) => ivPh.push({ x: -26 - i * 4, r, col: -1, dead: false }));
    I.nIn = 5; I.nOut = 0; I.lastN2 = N2; I.lastG = gainOf(N2);
    if (N2 < NAT - N2) I.shotLow = true; else if (N2 > NAT - N2) I.shotHigh = true;
  }
  const ivPop = new Array(100).fill(0), ivFlash = new Array(100).fill(0);
  let prevN2 = 1;
  function stepInvert(dt) {
    const I = S.iv, B = ivBox(), N2 = ivN2();
    if (N2 !== prevN2) {
      for (let i = 0; i < 100; i++) { const was = rankOf[i] < prevN2, now = rankOf[i] < N2; if (was !== now) ivPop[i] = 1; }
      prevN2 = N2;
    }
    for (let i = 0; i < 100; i++) { if (ivPop[i] > 0) ivPop[i] = Math.max(0, ivPop[i] - dt * 3); if (ivFlash[i] > 0) ivFlash[i] = Math.max(0, ivFlash[i] - dt * 2.4); }
    if (S.mode !== 'invert') return;
    for (let i = ivPh.length - 1; i >= 0; i--) {
      const p = ivPh[i]; p.x += 140 * dt;
      const colNow = Math.floor(p.x / B.cs);
      while (p.col < colNow && p.col < 9) {
        p.col++;
        if (p.col < 0) continue;
        const f = colFactor(highCol(N2, p.col)), c = p.col;
        const pick = (hi) => { const cand = []; for (let r = 0; r < 10; r++) { const idx = r * 10 + c; if ((rankOf[idx] < N2) === hi) cand.push(idx); } return cand.length ? cand[Math.floor(Math.random() * cand.length)] : -1; };
        if (f >= 1) { if (Math.random() < f - 1) { ivPh.push({ x: p.x, r: p.r, col: p.col, dead: false, clone: true }); const id = pick(true); if (id >= 0) ivFlash[id] = 1; } }
        else if (Math.random() > f) { p.dead = true; const id = pick(false); if (id >= 0) ivFlash[id] = 1; break; }
      }
      if (p.dead) { ivPh.splice(i, 1); continue; }
      if (p.x > B.w + 22) { ivPh.splice(i, 1); I.nOut++; }
    }
  }
  function drawInvert() {
    const I = S.iv, L = ivLay(), a = L.a, b = L.b, B = ivBox(), N2 = ivN2(), N1 = ivN1(), k = PHONE ? 0.8 : 1;
    panel(a.x, a.y, a.w, a.h, 14);
    T(a.x + 14, a.y + 24, '📦 원자 100개 상자 (🟠 높은 준위 · 🔵 낮은 준위)', PHONE ? 12.5 : 15, '#26324a', 'left', 800);
    ctx.fillStyle = '#f7f9fd'; D.roundRect(B.x - 4, B.y - 4, B.w + 8, B.h + 8, 10); ctx.fill(); ctx.strokeStyle = '#9aa6b8'; ctx.lineWidth = 2; ctx.stroke();
    for (let idx = 0; idx < 100; idx++) {
      const c = idx % 10, r = Math.floor(idx / 10), x = B.x + c * B.cs + B.cs / 2, y = B.y + r * B.cs + B.cs / 2;
      const hi = rankOf[idx] < N2, pop = ivPop[idx], rr = B.cs * 0.34 * (1 + 0.4 * Math.sin(pop * Math.PI));
      if (hi) D.glow(x, y, B.cs * 0.7, '#ffb400', 0.4);
      D.sphere(x, y, rr, hi ? '#f26b3a' : '#7f93bd', { gloss: true });
      if (ivFlash[idx] > 0.02) { ctx.strokeStyle = rgbaH('#ffe27a', ivFlash[idx]); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, B.cs * (0.5 + 0.35 * (1 - ivFlash[idx])), 0, TAU); ctx.stroke(); }
    }
    // 광자
    ivPh.forEach((p) => { const y = B.y + p.r * B.cs + B.cs / 2 + (p.clone ? 4 : 0); if (p.x > -30 && p.x < B.w + 24) { wavePacket(B.x + p.x, y, 0, -S.t * 9, RED, 26, 5.5, 1); D.glow(B.x + p.x, y, 10, '#ff6a5a', 0.45); } });
    T(B.x, B.y + B.h + 24, '광자 5개 → 나온 광자 ' + (ivPh.length ? '…' : I.lastG != null ? I.nOut + '개' : '?'), PHONE ? 12.5 : 14, '#26324a', 'left', 800);
    if (I.lastG != null) T(B.x, B.y + B.h + 44, '(그때 예상 배율 ×' + I.lastG.toFixed(1) + ' · N₂ = ' + I.lastN2 + ')', PHONE ? 11 : 12, '#5d6879', 'left', 700);
    D.arrow(B.x - 30, B.y + B.h / 2, B.x - 8, B.y + B.h / 2, { color: '#e2464b', width: 3, head: 9 }); T(B.x - 22, B.y + B.h / 2 - 12, '광자', 11.5, '#c0353b', 'center', 800);
    // N₂, N₁ 막대
    const bx = B.x + B.w + (PHONE ? 22 : 30), bh = B.h, bw = PHONE ? 28 : 36;
    const bar = (x, v, col, name) => { ctx.fillStyle = '#e3e8f2'; D.roundRect(x, B.y, bw, bh, 8); ctx.fill(); const hh = bh * v / 100; ctx.save(); D.roundRect(x, B.y, bw, bh, 8); ctx.clip(); ctx.fillStyle = col; ctx.fillRect(x, B.y + bh - hh, bw, hh); ctx.restore(); T(x + bw / 2, B.y - 8, String(v), 14, '#26324a', 'center', 800); T(x + bw / 2, B.y + bh + 16, name, 13, '#26324a', 'center', 800); };
    bar(bx, N2, '#f26b3a', 'N₂'); bar(bx + bw + 10, N1, '#7f93bd', 'N₁');
    const inv = N2 > N1;
    D.label(bx + bw + 5, B.y + bh + 40, inv ? '밀도 반전 ✔' : N2 === N1 ? 'N₂ = N₁' : '밀도 반전 아님', { size: PHONE ? 11.5 : 13, bg: inv ? '#16a05a' : '#7b8798' });
    // 펌핑 표시
    // 오른쪽(또는 아래): 광자 수 곡선 + 준위 도식
    panel(b.x, b.y, b.w, b.h, 14);
    const cw = PHONE ? 224 : b.w - 28, chh = PHONE ? 150 : 128;
    T(b.x + 14, b.y + 22, '칸을 지날 때 광자 수 (처음 1개)', PHONE ? 12 : 13.5, '#26324a', 'left', 800);
    const ax = axes(b.x + (PHONE ? 38 : 44), b.y + 34, cw - (PHONE ? 30 : 36), chh - (PHONE ? 62 : 56), { xmin: 0, xmax: 10, ymin: 0, ymax: 8, xt: [[0, '0'], [5, '5'], [10, '10']], yt: [[0, '0'], [2, '2'], [4, '4'], [6, '6'], [8, '8']], xl: '지난 칸 수', yl: '광자 수', fs: 11, ylx: 28 });
    ctx.strokeStyle = '#26324a'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(ax.X(0), ax.Y(1)); ctx.lineTo(ax.X(10), ax.Y(1)); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = inv ? '#16a05a' : '#c0353b'; ctx.lineWidth = 3; ctx.beginPath(); let nk = 1;
    for (let c = 0; c <= 10; c++) { if (c > 0) nk *= colFactor(highCol(N2, c - 1)); const y = ax.Y(clamp(nk, 0, 8)); if (c === 0) ctx.moveTo(ax.X(c), y); else ctx.lineTo(ax.X(c), y); }
    ctx.stroke();
    T(ax.x + ax.w - 4, ax.y + 14, '끝에서 ×' + gainOf(N2).toFixed(2), 12, inv ? '#1c7a4a' : '#c0353b', 'right', 800);
    // 준위 도식
    const lv = PHONE ? { x: b.x + 240, y: b.y + 8, w: b.w - 252, h: b.h - 16 } : { x: b.x + 8, y: b.y + 176, w: b.w - 16, h: b.h - 184 };
    drawLevels(lv, I.diag, N2);
    panel(BOT.x, BOT.y, BOT.w, BOT.h, 14);
    textBlock(BOT.x + 16, BOT.y + 28, BOT.w - 32, inv ? '밀도 반전(N₂ > N₁)이면 광자가 지나갈 때마다 유도 방출이 흡수보다 많아서 광자 수가 늘어나요. 이것이 빛의 증폭이에요.' : '열평형에서는 거의 모든 원자가 낮은 준위에 있어서(N₂ < N₁) 지나가는 광자는 흡수되어 줄어들어요. 펌핑으로 높은 준위의 원자를 늘려 보세요.', PHONE ? 13.5 : 15, '#26324a', PHONE ? 20 : 22, 800);
    textBlock(BOT.x + 16, BOT.y + (PHONE ? 98 : 84), BOT.w - 32, '(그림의 광자는 확률적으로 그렸어요. 곡선은 처음 광자 1개의 기댓값이에요.)', 12.5, '#5d6879', 18, 700);
  }
  function drawLevels(r, kind, N2) {
    ctx.fillStyle = '#f7f9fd'; D.roundRect(r.x, r.y, r.w, r.h, 10); ctx.fill();
    const four = kind === '4';
    T(r.x + r.w / 2, r.y + 17, four ? '4준위 도식 (정성)' : '3준위 도식 (정성)', PHONE ? 11.5 : 12.5, '#26324a', 'center', 800);
    const lx0 = r.x + 26, lx1 = r.x + r.w - 10, top = r.y + 30, bot = r.y + r.h - 12, hgt = bot - top;
    const Lv = four ? [{ n: 'E₃', y: top + hgt * 0.04, t: '펌핑 준위' }, { n: 'E₂', y: top + hgt * 0.32, t: '준안정' }, { n: 'E₁', y: top + hgt * 0.7, t: '' }, { n: 'E₀', y: top + hgt * 0.95, t: '' }]
      : [{ n: 'E₃', y: top + hgt * 0.04, t: '펌핑 준위' }, { n: 'E₂', y: top + hgt * 0.4, t: '준안정' }, { n: 'E₁', y: top + hgt * 0.95, t: '바닥' }];
    Lv.forEach((l) => { ctx.strokeStyle = '#26324a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(lx0, l.y); ctx.lineTo(lx1, l.y); ctx.stroke(); T(r.x + 4, l.y + 4, l.n, 11.5, '#26324a', 'left', 800); if (l.t) T(lx1 - 2, l.y - 4, l.t, 10.5, '#5d6879', 'right', 700); });
    const ph = RM ? 0.5 : (S.t * 0.6) % 1;
    const xa = lx0 + (lx1 - lx0) * 0.2, xb = lx0 + (lx1 - lx0) * 0.45, xc = lx0 + (lx1 - lx0) * 0.72;
    const iBot = Lv.length - 1;
    D.arrow(xa, Lv[iBot].y - 3, xa, Lv[0].y + 5, { color: '#ffb400', width: 3, head: 8 });
    ctx.fillStyle = '#c4501b'; ctx.font = D.font(10.5, 800); ctx.textAlign = 'center'; ctx.fillText('펌핑', xa, Lv[iBot].y - 8 - hgt * 0.1);
    D.arrow(xb, Lv[0].y + 5, xb, Lv[1].y - 3, { color: '#9aa6b8', width: 2, head: 6, dash: [3, 3] });
    D.arrow(xc, Lv[1].y + 3, xc, (four ? Lv[2].y : Lv[2].y) - 3, { color: RED, width: 3, head: 8 });
    T(xc + 5, (Lv[1].y + (four ? Lv[2].y : Lv[2].y)) / 2, '레이저', 10.5, RED, 'left', 800);
    if (four) D.arrow(xb, Lv[2].y + 3, xb, Lv[3].y - 3, { color: '#9aa6b8', width: 2, head: 6, dash: [3, 3] });
    // 개체수 점
    const dots = (y, n, col) => { for (let i = 0; i < n; i++) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(lx0 + 8 + (i % 10) * 5.6, y - 6 - Math.floor(i / 10) * 5.6, 2.2, 0, TAU); ctx.fill(); } };
    dots(Lv[1].y, Math.round(N2 / 3), '#f26b3a');
    if (four) { dots(Lv[2].y, Math.max(0, Math.round((100 - N2) / 40)), '#7f93bd'); dots(Lv[3].y, 12, '#7f93bd'); }
    else dots(Lv[2].y, Math.round((100 - N2) / 3), '#7f93bd');
    const msg = four ? '아래 준위(E₁)가 빨리 비어서 반전이 쉬워요' : '바닥(E₁)에서 절반 넘게 올려야 해요';
    T(r.x + r.w / 2, r.y + r.h - 3, msg, PHONE ? 9.5 : 10.5, '#5d6879', 'center', 700);
  }

  /* ================= ③ 공진기 ================= */
  const cvLay = () => PHONE
    ? { c: { x: MA.x, y: MA.y, w: MA.w, h: 180 }, g1: { x: MA.x, y: MA.y + 188, w: MA.w, h: 160 }, g2: { x: MA.x, y: MA.y + 356, w: MA.w, h: 164 } }
    : { c: { x: MA.x, y: MA.y, w: MA.w, h: 196 }, g1: { x: MA.x, y: MA.y + 206, w: 384, h: 208 }, g2: { x: MA.x + 392, y: MA.y + 206, w: 384, h: 208 } };
  function cvGeom() {
    const C = cvLay().c, x0 = C.x + (PHONE ? 40 : 56), Lc = PHONE ? 236 : 396, hT = PHONE ? 28 : 36;
    return { C, x0, x1: x0 + Lc, hT, cy: C.y + C.h * (PHONE ? 0.6 : 0.58), Lc };
  }
  const cvP = () => (S.cv.on ? S.cv.p : 0);
  const cvG = () => gainRT(n2Of(cvP()));
  const cvL = () => lossOf(S.cv.tm);
  const cvOut = () => outOf(S.cv.tm, S.cv.n);
  const cvLasing = () => S.cv.on && cvG() > cvL() && cvOut() >= 0.3;
  function pThreshold(tm) { for (let p = 0; p <= 100; p++) if (gainRT(n2Of(p)) > lossOf(tm)) return p; return null; }
  function stepCavity(dt) {
    const V = S.cv, G = cvGeom();
    const g0 = cvG(), loss = cvL(), seed = V.on ? 0.4 + 0.02 * V.p : 0;
    let left = dt; while (left > 0) { const h = Math.min(left, 0.02); V.n = Math.max(0, V.n + (RTIME * V.n * (g0 / (1 + V.n / NSAT) - loss) + seed) * h); left -= h; }
    V.nD = SciSim.approach(V.nD, V.n, dt, 12);
    V.tAcc += dt;
    if (V.tAcc >= 0.05) { V.tAcc = 0; V.hist.push([S.t, V.n]); while (V.hist.length && S.t - V.hist[0][0] > 6.2) V.hist.shift(); }
    V.lasing = cvLasing();
    if (S.mode !== 'cavity') return;
    const sp = 380, none = V.tm === 'none', tm = TM[V.tm];
    // 거울 축과 나란한 광자 (공진기 안을 왕복)
    const target = none ? 0 : Math.round(Math.min(14, 1.5 * Math.log2(1 + V.n)));
    if (V.axis.length < target && Math.random() < 0.3) V.axis.push({ x: G.x0 + 10 + Math.random() * (G.Lc - 20), dir: Math.random() < 0.5 ? 1 : -1, ph: Math.random() * TAU });
    while (V.axis.length > target + 1) V.axis.splice(Math.floor(Math.random() * V.axis.length), 1);
    for (let i = V.axis.length - 1; i >= 0; i--) {
      const a = V.axis[i]; a.x += a.dir * sp * dt;
      if (a.x >= G.x1) { a.x = G.x1; if (Math.random() < tm) { V.beam.push({ x: G.x1 + 4, y: G.cy + (Math.random() - 0.5) * 6 }); } a.dir = -1; }
      else if (a.x <= G.x0) { a.x = G.x0; a.dir = 1; }
    }
    // 출력 빔 광자
    for (let i = V.beam.length - 1; i >= 0; i--) { V.beam[i].x += sp * dt * 1.1; if (V.beam[i].x > G.C.x + G.C.w - 12) V.beam.splice(i, 1); }
    // 자발 방출한 광자: 방향이 제각각이라 거의 모두 옆으로 빠져나가요
    if (V.on && Math.random() < dt * (3 + 22 * V.p / 100)) {
      const ang = Math.random() * TAU, x = G.x0 + 12 + Math.random() * (G.Lc - 24), y = G.cy + (Math.random() - 0.5) * G.hT * 1.2;
      if (Math.abs(Math.sin(ang)) < 0.05 && !none) V.axis.push({ x, dir: Math.cos(ang) > 0 ? 1 : -1, ph: 0 });
      else V.side.push({ x, y, vx: Math.cos(ang) * 240, vy: Math.sin(ang) * 240, age: 0 });
    }
    for (let i = V.side.length - 1; i >= 0; i--) {
      const s = V.side[i]; s.age += dt; s.x += s.vx * dt; s.y += s.vy * dt;
      const inside = s.x > G.x0 && s.x < G.x1 && Math.abs(s.y - G.cy) < G.hT;
      if (inside && !none && (s.x + s.vx * dt > G.x1 || s.x + s.vx * dt < G.x0)) s.vx = -s.vx;   // 거울에서 반사
      if (s.age > 0.9 || s.y < G.C.y + 30 || s.y > G.C.y + G.C.h - 6) V.side.splice(i, 1);
    }
  }
  function drawCavity() {
    const V = S.cv, L = cvLay(), G = cvGeom(), C = G.C, k = PHONE ? 0.8 : 1, tm = V.tm, none = tm === 'none';
    panel(C.x, C.y, C.w, C.h, 14);
    T(C.x + 14, C.y + 24, '🔴 공진기: 거울 두 장 사이를 광자가 왕복해요', PHONE ? 13 : 15, '#26324a', 'left', 800);
    const on = V.on, pe = cvP() / 100;
    // 매질 (유리관)
    ctx.save();
    const gl = ctx.createLinearGradient(0, G.cy - G.hT, 0, G.cy + G.hT);
    gl.addColorStop(0, rgbaH('#ff7aa8', 0.15 + 0.35 * pe)); gl.addColorStop(0.5, rgbaH('#ffd0e0', 0.2 + 0.5 * pe)); gl.addColorStop(1, rgbaH('#ff7aa8', 0.15 + 0.35 * pe));
    D.shadow(() => { ctx.fillStyle = gl; D.roundRect(G.x0, G.cy - G.hT, G.Lc, G.hT * 2, 12); ctx.fill(); }, { blur: 8, y: 2 });
    ctx.strokeStyle = 'rgba(80,140,200,.75)'; ctx.lineWidth = 3; D.roundRect(G.x0, G.cy - G.hT, G.Lc, G.hT * 2, 12); ctx.stroke(); ctx.restore();
    // 펌핑 전극과 번개
    ctx.fillStyle = '#7b8798'; ctx.fillRect(G.x0 + 30, G.cy - G.hT - 8, 28, 8); ctx.fillRect(G.x0 + 30, G.cy + G.hT, 28, 8);
    if (on) { T(G.x0 + 44, G.cy - G.hT - 14, '⚡ 펌핑', PHONE ? 11.5 : 12.5, '#c4501b', 'center', 800); }
    else T(G.x0 + 44, G.cy - G.hT - 14, '펌핑 꺼짐', PHONE ? 11.5 : 12.5, '#9aa6b8', 'center', 800);
    // 거울
    const mir = (x, partial) => {
      if (none) { ctx.strokeStyle = '#9aa6b8'; ctx.setLineDash([4, 4]); ctx.lineWidth = 2; ctx.strokeRect(x - 5, G.cy - G.hT - 8, 10, G.hT * 2 + 16); ctx.setLineDash([]); return; }
      const gg = ctx.createLinearGradient(x - 6, 0, x + 6, 0); gg.addColorStop(0, partial ? '#dbe9ff' : '#e9edf5'); gg.addColorStop(1, partial ? '#8fb2e8' : '#8a96aa');
      D.shadow(() => { ctx.fillStyle = gg; D.roundRect(x - 6, G.cy - G.hT - 8, 12, G.hT * 2 + 16, 4); ctx.fill(); }, { blur: 6, y: 2 });
    };
    mir(G.x0, false); mir(G.x1, true);
    T(G.x0 - 10, G.cy + G.hT + 24, none ? '(거울 없음)' : '거울 (거의 100 % 반사)', PHONE ? 11 : 12.5, '#26324a', 'left', 800);
    T(G.x1, G.cy + G.hT + 24, none ? '(거울 없음)' : '출력 거울 (투과 ' + (TM[tm] * 100) + ' %)', PHONE ? 11 : 12.5, '#26324a', 'center', 800);
    // 자발 방출 광자 (옆으로 빠져나가요)
    V.side.forEach((s) => { const a = clamp(1 - s.age / 0.9, 0, 1); ctx.fillStyle = rgbaH('#ff8a7a', 0.8 * a); ctx.beginPath(); ctx.arc(s.x, s.y, 3 * k, 0, TAU); ctx.fill(); });
    // 축을 따라 왕복하는 광자
    V.axis.forEach((a) => { wavePacket(a.x, G.cy + ((a.ph * 7) % 9 - 4), 0, -S.t * 9 + a.ph, RED, 22 * k, 4 * k, 0.95); });
    // 출력 빔
    const outP = cvOut(), bi = clamp(Math.pow(outP / 0.9, 0.6), 0, 1);
    if (!none && bi > 0.02) {
      const bx0 = G.x1 + 6, bx1 = C.x + C.w - 10, g = ctx.createLinearGradient(0, G.cy - 7, 0, G.cy + 7);
      g.addColorStop(0, 'rgba(255,60,60,0)'); g.addColorStop(0.5, 'rgba(255,60,60,' + (0.9 * bi) + ')'); g.addColorStop(1, 'rgba(255,60,60,0)');
      ctx.fillStyle = g; ctx.fillRect(bx0, G.cy - 7, bx1 - bx0, 14);
      ctx.fillStyle = 'rgba(255,230,230,' + bi + ')'; ctx.fillRect(bx0, G.cy - 1.5, bx1 - bx0, 3);
      T((bx0 + bx1) / 2, G.cy - 18, '레이저 빔 (평행)', PHONE ? 11.5 : 13, '#c0353b', 'center', 800);
    } else if (none && on) {
      // 거울이 없으면 약한 자발 방출 빛이 사방으로 새요
      [G.x0 - 8, G.x1 + 8].forEach((x, i) => { const g = ctx.createRadialGradient(x, G.cy, 4, x, G.cy, 56); g.addColorStop(0, 'rgba(255,120,120,.35)'); g.addColorStop(1, 'rgba(255,120,120,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, G.cy, 56, 0, TAU); ctx.fill(); });
      T((G.x1 + C.x + C.w) / 2 + 20, G.cy - 18, '약하고 퍼지는 빛', PHONE ? 11.5 : 13, '#9aa6b8', 'center', 800);
    }
    V.beam.forEach((p) => { D.glow(p.x, p.y, 8, '#ff4040', 0.7); });
    // 그래프 1: 공진기 안의 광자 수
    const g1 = L.g1, g2 = L.g2;
    panel(g1.x, g1.y, g1.w, g1.h, 14);
    T(g1.x + 14, g1.y + 22, '공진기 안의 광자 수 n (최근 6초)', PHONE ? 12.5 : 14, '#26324a', 'left', 800);
    const nss = nSS(cvG(), cvL());
    const ymax = Math.max(12, Math.ceil(Math.max(nss * 1.2, ...V.hist.map((h) => h[1]), 1) / 10) * 10);
    const ax1 = axes(g1.x + 48, g1.y + 34, g1.w - 66, g1.h - (PHONE ? 84 : 92), { xmin: -6, xmax: 0, ymin: 0, ymax, xt: [[-6, '−6'], [-4, '−4'], [-2, '−2'], [0, '0 초']], yt: [[0, '0'], [ymax / 2, String(ymax / 2)], [ymax, String(ymax)]], xl: '시간 (s)', yl: '광자 수 n', fs: 11, ylx: 34 });
    if (nss > 0.5) { ctx.strokeStyle = '#16a05a'; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(ax1.x, ax1.Y(nss)); ctx.lineTo(ax1.x + ax1.w, ax1.Y(nss)); ctx.stroke(); ctx.setLineDash([]); T(ax1.x + 6, ax1.Y(nss) - 5, '이득 = 손실이 되는 값', 11, '#1c7a4a', 'left', 800); }
    ctx.save(); ctx.beginPath(); ctx.rect(ax1.x, ax1.y, ax1.w, ax1.h); ctx.clip(); ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 3; ctx.beginPath();
    V.hist.forEach((h, i) => { const x = ax1.X(clamp(h[0] - S.t, -6, 0)), y = ax1.Y(Math.min(ymax, h[1])); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }); ctx.stroke(); ctx.restore();
    T(g1.x + g1.w - 14, g1.y + 22, 'n = ' + V.n.toFixed(1), PHONE ? 12.5 : 14, '#c0353b', 'right', 800);
    T(g1.x + 14, g1.y + g1.h - 8, '한 번 왕복할 때 이득 ' + (cvG() * 100).toFixed(1) + ' % · 손실 ' + (cvL() * 100).toFixed(1) + ' %' + (none ? ' (거울 없음)' : ''), PHONE ? 11.5 : 12.5, cvG() > cvL() ? '#1c7a4a' : '#c0353b', 'left', 800);
    // 그래프 2: 펌핑 세기와 출력
    panel(g2.x, g2.y, g2.w, g2.h, 14);
    T(g2.x + 14, g2.y + 22, '펌핑 세기와 출력 (문턱)', PHONE ? 12.5 : 14, '#26324a', 'left', 800);
    const ax2 = axes(g2.x + 48, g2.y + 34, g2.w - 66, g2.h - (PHONE ? 84 : 92), { xmin: 0, xmax: 100, ymin: 0, ymax: 1.2, xt: [[0, '0'], [25, '25'], [50, '50'], [75, '75'], [100, '100']], yt: [[0, '0'], [0.6, '0.6'], [1.2, '1.2']], xl: '펌핑 세기', yl: '출력 (상대)', fs: 11, ylx: 34 });
    ctx.strokeStyle = '#2f6bff'; ctx.lineWidth = 3; ctx.beginPath();
    for (let p = 0; p <= 100; p += 2) { const o = outOf(tm, nSS(gainRT(1 + 0.75 * p), lossOf(tm))); const y = ax2.Y(Math.min(1.2, o)); if (p === 0) ctx.moveTo(ax2.X(p), y); else ctx.lineTo(ax2.X(p), y); }
    ctx.stroke();
    const pth = none ? null : pThreshold(tm);
    if (pth != null) { ctx.strokeStyle = '#c0353b'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(ax2.X(pth), ax2.y); ctx.lineTo(ax2.X(pth), ax2.y + ax2.h); ctx.stroke(); ctx.setLineDash([]); T(ax2.X(pth) + 5, ax2.y + 14, '문턱 ' + pth, 11.5, '#c0353b', 'left', 800); }
    else T(ax2.x + ax2.w / 2, ax2.y + ax2.h / 2, none ? '거울이 없으면 레이저가 되지 않아요' : '문턱을 넘지 못해요', 12.5, '#c0353b', 'center', 800);
    if (on) D.sphere(ax2.X(V.p), ax2.Y(clamp(cvOut(), 0, 1.2)), 6, '#f26b3a', { gloss: false });
    T(g2.x + g2.w - 14, g2.y + 22, '지금 출력 ' + cvOut().toFixed(2), PHONE ? 12.5 : 14, '#1f4fcf', 'right', 800);
    T(g2.x + 14, g2.y + g2.h - 8, '높은 준위의 원자 N₂ = ' + n2Of(cvP()) + ' (펌핑 ' + (on ? V.p : 0) + ')', PHONE ? 11.5 : 12.5, '#5d6879', 'left', 800);
    panel(BOT.x, BOT.y, BOT.w, BOT.h, 14);
    const msg = none ? '거울이 없으면 빛이 매질을 한 번만 지나가서 거의 증폭되지 않고, 방향이 제각각인 약한 빛이 새어 나가요.'
      : !on ? '펌핑을 켜면 밀도 반전이 만들어지고, 거울 사이를 왕복하는 광자가 유도 방출로 늘어나요.'
        : cvG() <= cvL() ? '이득이 손실보다 작아서 광자 수가 늘지 못해요. 펌핑을 더 세게 하거나 투과율을 낮춰 보세요.'
          : '이득이 손실보다 크면 광자 수가 늘다가 이득 = 손실이 되는 곳에서 일정해져요. 축과 나란한 광자만 남아 평행한 빔이 나가요.';
    textBlock(BOT.x + 16, BOT.y + 28, BOT.w - 32, msg, PHONE ? 13.5 : 15, '#26324a', PHONE ? 20 : 22, 800);
    textBlock(BOT.x + 16, BOT.y + (PHONE ? 98 : 84), BOT.w - 32, '(그림의 광자는 실제보다 훨씬 적게 그렸어요. 출력 거울의 투과율이 클수록 손실이 커서 문턱이 높아져요.)', 12.5, '#5d6879', 18, 700);
  }

  /* ================= ④ 특징과 활용 ================= */
  function drawApps() {
    if (S.ap.sub === 'compare') drawCompare(); else if (S.ap.sub === 'fiber') drawFiber(); else drawSafety();
  }
  const fmtLen = (m) => (m < 1 ? Math.round(m * 100) + ' cm' : m.toFixed(1) + ' m');
  const DIA = { laser: (d) => 1e-3 + 1e-3 * d, flash: (d) => 0.05 + 0.05 * d };
  function drawCompare() {
    const d = S.ap.dist, ph = PHONE;
    const w = ph ? MA.w : (MA.w - 12) / 2, h = ph ? 122 : (MA.h - 12) / 2;
    const R = [0, 1, 2, 3].map((i) => (ph ? { x: MA.x, y: MA.y + i * (h + 8), w, h } : { x: MA.x + (i % 2) * (w + 12), y: MA.y + Math.floor(i / 2) * (h + 12), w, h }));
    const k = ph ? 0.85 : 1;
    // 1) 단색성: 스펙트럼
    let r = R[0]; panel(r.x, r.y, r.w, r.h, 14);
    T(r.x + 12, r.y + 22, '① 단색성: 파장 범위', ph ? 12.5 : 14.5, '#26324a', 'left', 800);
    const sx = r.x + (ph ? 70 : 84), sw = r.w - (ph ? 82 : 100);
    const strip = (y, laser) => {
      const hh = ph ? 22 : 34;
      if (!laser) { for (let x = 0; x < sw; x += 2) { const lam = 400 + 300 * x / sw; ctx.fillStyle = hexOf(wlRGB(lam)); ctx.fillRect(sx + x, y, 2.4, hh); } }
      else { ctx.fillStyle = '#10151f'; ctx.fillRect(sx, y, sw, hh); const lx = sx + (LAM_HENE - 400) / 300 * sw; D.glow(lx, y + hh / 2, 20, '#ff3a3a', 0.8); ctx.fillStyle = '#ff5a4a'; ctx.fillRect(lx - 1.6, y, 3.2, hh); }
      ctx.strokeStyle = '#9aa6b8'; ctx.lineWidth = 1.2; ctx.strokeRect(sx, y, sw, hh);
    };
    const y1 = r.y + (ph ? 38 : 48), y2 = y1 + (ph ? 32 : 52);
    T(r.x + 12, y1 + (ph ? 16 : 22), '백열전구', ph ? 12 : 13, '#5d6879', 'left', 800); strip(y1, false);
    T(r.x + 12, y2 + (ph ? 16 : 22), '레이저', ph ? 12 : 13, '#c0353b', 'left', 800); strip(y2, true);
    if (!ph) { T(sx, y2 + 52, '400 nm', 11.5, '#5d6879', 'left', 700); T(sx + sw, y2 + 52, '700 nm', 11.5, '#5d6879', 'right', 700); T(r.x + r.w / 2, r.y + r.h - 10, '레이저는 거의 한 파장(632.8 nm)만 내요 (선 폭은 과장했어요)', 12, '#26324a', 'center', 800); }
    else T(r.x + r.w - 12, r.y + 22, '거의 한 파장만 내요', 11.5, '#26324a', 'right', 800);
    // 2) 결맞음: 이중 슬릿 무늬
    r = R[1]; panel(r.x, r.y, r.w, r.h, 14);
    T(r.x + 12, r.y + 22, '② 결맞음: 이중 슬릿 뒤의 무늬', ph ? 12.5 : 14.5, '#26324a', 'left', 800);
    const fy = r.y + (ph ? 34 : 42), fh = ph ? 26 : 44, fx = r.x + (ph ? 70 : 84), fw = r.w - (ph ? 82 : 100);
    const fr = (y, V, col, lab) => {
      T(r.x + 12, y + fh * 0.62, lab, ph ? 12 : 13, '#5d6879', 'left', 800);
      for (let x = 0; x < fw; x += 2) { const I = (1 + V * Math.cos(TAU * x / (fw / 7))) / (1 + V); ctx.fillStyle = C.mix('#10151f', col, 0.06 + 0.94 * I); ctx.fillRect(fx + x, y, 2.4, fh); }
      ctx.strokeStyle = '#9aa6b8'; ctx.lineWidth = 1.2; ctx.strokeRect(fx, y, fw, fh);
    };
    fr(fy, 0.12, '#fff1c9', '전구'); fr(fy + fh + (ph ? 8 : 12), 1.0, '#ff5a4a', '레이저');
    if (!ph) T(r.x + r.w / 2, r.y + r.h - 10, '위상이 가지런한(결맞음) 빛일수록 무늬가 또렷해요', 12, '#26324a', 'center', 800);
    else T(r.x + r.w - 12, r.y + 22, '위상이 같아 무늬가 또렷', 11.5, '#26324a', 'right', 800);
    // 3) 직진성
    r = R[2]; panel(r.x, r.y, r.w, r.h, 14);
    T(r.x + 12, r.y + 22, '③ 직진성: ' + d + ' m 떨어진 곳의 빔 지름', ph ? 12.5 : 14.5, '#26324a', 'left', 800);
    const bx0 = r.x + 16, bx1 = r.x + r.w - (ph ? 112 : 130), cyb = r.y + (ph ? 70 : 112), hmax = ph ? 34 : 56;
    const half = (dia) => clamp(dia / 5.05 * hmax, 0, hmax);   // 100 m에서 손전등 빔(5.05 m)이 hmax가 되도록 같은 축척
    const bxAt = (m) => bx0 + (bx1 - bx0) * m / 100;
    ctx.fillStyle = 'rgba(255,214,90,.35)'; ctx.beginPath(); ctx.moveTo(bx0, cyb - half(DIA.flash(0))); ctx.lineTo(bx1, cyb - half(DIA.flash(100))); ctx.lineTo(bx1, cyb + half(DIA.flash(100))); ctx.lineTo(bx0, cyb + half(DIA.flash(0))); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#ff3a3a'; ctx.lineWidth = Math.max(1.4, 2 * half(DIA.laser(100)) + 1.4); ctx.beginPath(); ctx.moveTo(bx0, cyb); ctx.lineTo(bx1, cyb); ctx.stroke();
    const mx = bxAt(d); ctx.strokeStyle = '#26324a'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(mx, cyb - hmax - 8); ctx.lineTo(mx, cyb + hmax + 8); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = '#c4501b'; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.moveTo(mx, cyb - half(DIA.flash(d))); ctx.lineTo(mx, cyb + half(DIA.flash(d))); ctx.stroke();
    T(bx1 + 10, cyb - 8, '레이저 ' + fmtLen(DIA.laser(d)), ph ? 12 : 13.5, '#c0353b', 'left', 800); T(bx1 + 10, cyb + 12, '손전등 ' + fmtLen(DIA.flash(d)), ph ? 12 : 13.5, '#a8620c', 'left', 800);
    if (!ph) T(r.x + r.w / 2, r.y + r.h - 10, '거리 슬라이더로 멀리 보내 보세요 (같은 축척으로 그렸어요)', 12, '#26324a', 'center', 800);
    // 4) 세기
    r = R[3]; panel(r.x, r.y, r.w, r.h, 14);
    T(r.x + 12, r.y + 22, '④ 세기: 단위 면적에 닿는 빛의 파워', ph ? 12.5 : 14.5, '#26324a', 'left', 800);
    const Il = 1e-3 / (Math.PI * Math.pow(0.5e-3, 2)), Ib = 60 / (4 * Math.PI * 1);
    const lg = (v) => clamp(Math.log10(v) / 4, 0, 1);
    const ix = r.x + (ph ? 70 : 84), iw = r.w - (ph ? 82 : 100), iy = r.y + (ph ? 38 : 50), ih = ph ? 20 : 30;
    T(r.x + 12, iy + ih * 0.72, '레이저', ph ? 12 : 13, '#c0353b', 'left', 800); barH(ix, iy, iw, ih, lg(Il), '#e2464b');
    T(r.x + 12, iy + ih + (ph ? 12 : 18) + ih * 0.72, '전구', ph ? 12 : 13, '#a8620c', 'left', 800); barH(ix, iy + ih + (ph ? 12 : 18), iw, ih, lg(Ib), '#f5a623');
    T(ix + 6, iy + ih * 0.72, SCI(Il, 1) + ' W/m²', ph ? 11.5 : 12.5, '#fff', 'left', 800); T(ix + 6, iy + ih + (ph ? 12 : 18) + ih * 0.72, '약 ' + Math.round(Ib) + ' W/m²', ph ? 11.5 : 12.5, lg(Ib) > 0.3 ? '#fff' : '#26324a', 'left', 800);
    if (!ph) { T(r.x + r.w / 2, r.y + r.h - 24, '1 mW 포인터(지름 1 mm) vs 60 W 전구(1 m 거리)', 12, '#5d6879', 'center', 800); T(r.x + r.w / 2, r.y + r.h - 8, '로그 눈금이에요: 작은 파워도 좁게 모이면 훨씬 세요', 12, '#26324a', 'center', 800); }
    panel(BOT.x, BOT.y, BOT.w, BOT.h, 14);
    textBlock(BOT.x + 16, BOT.y + 28, BOT.w - 32, '레이저 빛의 특징: ① 한 파장(단색성) ② 위상이 가지런함(결맞음) ③ 퍼지지 않고 곧게 나감(직진성) ④ 좁은 곳에 모여 센 빛(집속성).', PHONE ? 13.5 : 15, '#26324a', PHONE ? 20 : 22, 800);
    textBlock(BOT.x + 16, BOT.y + (PHONE ? 98 : 84), BOT.w - 32, '이런 특징 덕분에 광통신, 바코드와 광디스크, 레이저 절단과 수술, 거리 측정(LiDAR)에 쓰여요.', 12.5, '#5d6879', 18, 700);
  }

  const bitsA = '1011001110100101';
  function drawFiber() {
    const A = S.ap, ph = PHONE, k = ph ? 0.85 : 1;
    panel(MA.x, MA.y, MA.w, MA.h, 14);
    T(MA.x + 14, MA.y + 24, '🌐 1550 nm 레이저 펄스가 100 km 광섬유를 지나요', ph ? 13 : 15, '#26324a', 'left', 800);
    const x0 = MA.x + (ph ? 52 : 74), x1 = MA.x + MA.w - (ph ? 52 : 74), yF = MA.y + (ph ? 84 : 92), ok = fiberOK(A.amp);
    const xAt = (km) => x0 + (x1 - x0) * km / FIB.L;
    // 송신기·수신기
    D.shadow(() => { ctx.fillStyle = '#3d4658'; D.roundRect(MA.x + 12, yF - 22 * k, 48 * k, 44 * k, 8); ctx.fill(); }, { blur: 6, y: 2 });
    T(MA.x + 12 + 24 * k, yF + 4, '송신', ph ? 11.5 : 12.5, '#fff', 'center', 800);
    D.shadow(() => { ctx.fillStyle = ok ? '#16a05a' : '#c0353b'; D.roundRect(MA.x + MA.w - 12 - 48 * k, yF - 22 * k, 48 * k, 44 * k, 8); ctx.fill(); }, { blur: 6, y: 2 });
    T(MA.x + MA.w - 12 - 24 * k, yF + 4, '수신', ph ? 11.5 : 12.5, '#fff', 'center', 800);
    // 광섬유 (코어와 클래딩)
    ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = '#c7d0e0'; ctx.lineWidth = 16 * k; ctx.beginPath(); ctx.moveTo(x0, yF); ctx.lineTo(x1, yF); ctx.stroke(); ctx.strokeStyle = '#eef2fa'; ctx.lineWidth = 10 * k; ctx.stroke(); ctx.restore();
    // 펄스: 위치마다 세기에 비례하는 밝기 (0 = 꺼짐, 1 = 켜짐)
    const gap = 30 * k, sp = 90 * k, tt = RM ? 0 : S.t * sp, n0 = Math.floor(tt / gap);
    for (let n = n0; n > n0 - Math.ceil((x1 - x0) / gap) - 1; n--) {
      const px = x0 + tt - n * gap; if (px < x0 || px > x1) continue;
      const km = (px - x0) / (x1 - x0) * FIB.L, p = dBlin(fiberDb(A.amp, km)), bit = bitsA[((n % 16) + 16) % 16] === '1';
      if (bit) { D.glow(px, yF, 12 * k, '#ff4040', 0.8 * p); ctx.fillStyle = rgbaH('#ff3a3a', 0.15 + 0.85 * p); ctx.beginPath(); ctx.arc(px, yF, 4.4 * k, 0, TAU); ctx.fill(); }
      else { ctx.strokeStyle = 'rgba(120,130,150,.5)'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(px, yF, 3 * k, 0, TAU); ctx.stroke(); }
    }
    // 광 증폭기
    if (A.amp > 0) {
      const xa = xAt(A.amp); ctx.fillStyle = '#7a3cff'; ctx.beginPath(); ctx.moveTo(xa - 11 * k, yF - 22 * k); ctx.lineTo(xa - 11 * k, yF + 22 * k); ctx.lineTo(xa + 15 * k, yF); ctx.closePath(); ctx.fill();
      T(xa, yF - 30 * k, '광 증폭기 ' + A.amp + ' km', ph ? 11.5 : 12.5, '#5b2db8', 'center', 800);
    }
    T(x0, yF + 38 * k, '0 km', 12, '#5d6879', 'left', 700); T(x1, yF + 38 * k, '100 km', 12, '#5d6879', 'right', 700);
    // 세기 그래프 (dB)
    const gy = MA.y + (ph ? 150 : 160), gh = ph ? 130 : 118, gx = MA.x + 56, gw = MA.w - 80;
    const ax = axes(gx, gy, gw, gh, { xmin: 0, xmax: FIB.L, ymin: -24, ymax: 2, xt: [[0, '0'], [25, '25'], [50, '50'], [75, '75'], [100, '100']], yt: [[0, '0'], [-10, '−10'], [-20, '−20']], xl: '거리 (km)', yl: '세기 (dB)', fs: 11.5, ylx: 38 });
    ctx.fillStyle = 'rgba(192,53,75,.10)'; ctx.fillRect(ax.x, ax.Y(-24), ax.w, ax.Y(FIB.thr) - ax.Y(-24));
    ctx.strokeStyle = '#c0353b'; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(ax.x, ax.Y(FIB.thr)); ctx.lineTo(ax.x + ax.w, ax.Y(FIB.thr)); ctx.stroke(); ctx.setLineDash([]);
    T(ax.x + 6, ax.Y(FIB.thr) + 15, '수신 한계 −10 dB (처음의 1/10)', 11.5, '#c0353b', 'left', 800);
    ctx.strokeStyle = ok ? '#16a05a' : '#2f6bff'; ctx.lineWidth = 3.4; ctx.beginPath();
    if (A.amp > 0) { ctx.moveTo(ax.X(0), ax.Y(0)); ctx.lineTo(ax.X(A.amp), ax.Y(-FIB.alpha * A.amp)); ctx.lineTo(ax.X(A.amp), ax.Y(0)); ctx.lineTo(ax.X(FIB.L), ax.Y(fiberDb(A.amp, FIB.L))); }
    else { ctx.moveTo(ax.X(0), ax.Y(0)); ctx.lineTo(ax.X(FIB.L), ax.Y(-FIB.alpha * FIB.L)); }
    ctx.stroke();
    const endDb = fiberDb(A.amp, FIB.L);
    D.sphere(ax.X(FIB.L), ax.Y(endDb), 6, ok ? '#16a05a' : '#c0353b', { gloss: false });
    T(ax.x + ax.w - 6, ax.y + ax.h - 8, '1 km마다 0.2 dB씩 약해져요', 11.5, '#5d6879', 'right', 700);
    D.label(ax.x + ax.w * 0.5, ax.y + ax.h + (ph ? 48 : 50), ok ? '✅ 수신 성공: 가장 약한 곳도 −10 dB 이상이에요' : '❌ 수신 실패: 어디선가 −10 dB보다 약해져요 (끝 ' + endDb.toFixed(0) + ' dB, 가장 약한 곳 ' + fiberMin(A.amp).toFixed(0) + ' dB)', { size: ph ? 11 : 13, bg: ok ? '#16a05a' : '#c0353b' });
    // 채널과 전송 속도
    const rate = 10 * A.ch;
    T(MA.x + 16, MA.y + MA.h - (ph ? 56 : 38), '파장이 다른 레이저 ' + A.ch + '개 × 10 Gbps = ' + rate + ' Gbps (한 비트 100 ps)', ph ? 12.5 : 14, '#26324a', 'left', 800);
    if (!ph) T(MA.x + 16, MA.y + MA.h - 14, '끝점의 세기 = 처음 세기 × ' + (dBlin(endDb) >= 0.1 ? dBlin(endDb).toFixed(2) : dBlin(endDb).toFixed(2)) + ' (' + Math.round(endDb) + ' dB)', 12.5, '#5d6879', 'left', 700);
    panel(BOT.x, BOT.y, BOT.w, BOT.h, 14);
    textBlock(BOT.x + 16, BOT.y + 28, BOT.w - 32, '광통신은 0과 1을 빛의 꺼짐·켜짐 펄스로 보내요. 광섬유는 코어와 클래딩의 굴절률 차이로 빛을 전반사시켜 멀리까지 보내고, 손실은 광 증폭기로 보충해요.', PHONE ? 13.5 : 15, '#26324a', PHONE ? 20 : 22, 800);
    textBlock(BOT.x + 16, BOT.y + (PHONE ? 98 : 84), BOT.w - 32, '파장 분할 다중화: 한 광섬유에 파장이 다른 레이저를 여러 개 실어 전송량을 늘려요. (예: 40 × 10 Gbps = 400 Gbps)', 12.5, '#5d6879', 18, 700);
  }

  const safeOn = (id) => !!S.ap.safe[id];
  function safeState() {
    const st = { beamEye: !safeOn('r1'), mirror: !safeOn('r2') || safeOn('w2'), shootEye: safeOn('w1'), goggles: safeOn('r3') && !safeOn('w3'), sign: safeOn('r3'), laserOn: !safeOn('r4') };
    st.hz = []; if (st.beamEye) st.hz.push('빔이 눈 높이를 지나가요'); if (st.mirror) st.hz.push('반사면이 있어서 반사광이 눈으로 향해요'); if (st.shootEye) st.hz.push('사람의 눈을 향해 쏘았어요'); if (!st.goggles) st.hz.push('보호 안경을 쓰지 않았어요'); if (st.laserOn) st.hz.push('쓰지 않는데 전원이 켜져 있어요');
    return st;
  }
  const safeOK = () => RULES.every((r) => !!S.ap.safe[r.id] === r.ok);
  function drawSafety() {
    const st = safeState(), ph = PHONE, k = ph ? 0.85 : 1;
    const A = ph ? { x: MA.x, y: MA.y, w: MA.w, h: 300 } : { x: MA.x, y: MA.y, w: 520, h: MA.h }, B = ph ? { x: MA.x, y: MA.y + 308, w: MA.w, h: MA.h - 308 } : { x: MA.x + 532, y: MA.y, w: 244, h: MA.h };
    panel(A.x, A.y, A.w, A.h, 14);
    T(A.x + 14, A.y + 24, '🛡️ 레이저 실험실 안전 점검', ph ? 13.5 : 15, '#26324a', 'left', 800);
    const tx = A.x + 14, ty = A.y + A.h - (ph ? 62 : 96), tw = A.w - 28;
    // 벽, 탁자
    ctx.fillStyle = '#e8edf6'; ctx.fillRect(A.x + 6, A.y + 34, A.w - 12, ty - A.y - 34 + 2);
    ctx.fillStyle = '#b08a5a'; D.roundRect(tx, ty, tw, ph ? 14 : 18, 4); ctx.fill(); ctx.fillStyle = '#8a6a40'; ctx.fillRect(tx + 16, ty + 14, 8, ph ? 44 : 78); ctx.fillRect(tx + tw - 24, ty + 14, 8, ph ? 44 : 78);
    const yEye = ty - (ph ? 100 : 128), yLow = ty - (ph ? 22 : 30);
    // 레이저 장치
    const lx = tx + 26, ly = st.beamEye ? yEye : yLow;
    if (st.beamEye) { ctx.fillStyle = '#8a96aa'; ctx.fillRect(lx - 12, ly + 4, 8, ty - ly - 4); }
    D.shadow(() => { ctx.fillStyle = '#3d4658'; D.roundRect(lx - 24 * k, ly - 12 * k, 50 * k, 24 * k, 6); ctx.fill(); }, { blur: 5, y: 2 });
    ctx.fillStyle = st.laserOn ? '#ff4a4a' : '#7b8798'; ctx.beginPath(); ctx.arc(lx + 18 * k, ly, 4 * k, 0, TAU); ctx.fill();
    if (st.laserOn) D.glow(lx + 18 * k, ly, 14, '#ff3a3a', 0.8);
    T(lx, ly + 28 * k, '레이저' + (st.laserOn ? ' (켜짐)' : ' (꺼짐)'), ph ? 11 : 12.5, st.laserOn ? '#c0353b' : '#5d6879', 'center', 800);
    // 사람
    const hx = tx + tw - (ph ? 40 : 56), hy = yEye - 6;
    ctx.fillStyle = '#3d4658'; D.roundRect(hx - 18 * k, hy + 22 * k, 36 * k, ty - hy - 22 * k, 10); ctx.fill();
    D.sphere(hx, hy, 18 * k, '#f2c9a0', { shadow: true });
    ctx.fillStyle = '#26324a'; ctx.beginPath(); ctx.arc(hx - 8 * k, yEye - 6, 2.4, 0, TAU); ctx.fill();
    if (st.goggles) { ctx.fillStyle = 'rgba(80,200,120,.55)'; D.roundRect(hx - 17 * k, yEye - 13, 18 * k, 14, 5); ctx.fill(); ctx.strokeStyle = '#16a05a'; ctx.lineWidth = 2.2; ctx.stroke(); }
    else if (safeOn('w3')) { ctx.fillStyle = 'rgba(40,40,40,.7)'; D.roundRect(hx - 17 * k, yEye - 13, 18 * k, 14, 5); ctx.fill(); }
    T(hx, ty + (ph ? 26 : 30), '사람', ph ? 11 : 12.5, '#26324a', 'center', 800);
    // 거울과 빔
    const mx = tx + tw * 0.5;
    const beam = (x1, y1, x2, y2, col, w) => { ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = rgbaH(col, 0.35); ctx.lineWidth = w + 5; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.strokeStyle = col; ctx.lineWidth = w; if (!RM) { ctx.setLineDash([10, 8]); ctx.lineDashOffset = -S.t * 60; } ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore(); };
    if (st.mirror) {
      const myy = ly;
      ctx.save(); ctx.translate(mx, myy); ctx.rotate(-Math.PI / 4); D.shadow(() => { ctx.fillStyle = '#dbe6f5'; ctx.fillRect(-4, -22 * k, 8, 44 * k); }, { blur: 4, y: 1 }); ctx.restore();
      T(mx, myy + 38 * k, '거울', ph ? 11 : 12.5, '#26324a', 'center', 800);
      if (st.laserOn) { beam(lx + 26 * k, ly, mx, myy, '#ff3a3a', 3); beam(mx, myy, hx - 12 * k, yEye - 6, '#ff3a3a', 3); }
    } else if (st.laserOn) {
      beam(lx + 26 * k, ly, hx - (st.beamEye ? 20 * k : 0) , ly, '#ff3a3a', 3);
      if (!st.beamEye) { ctx.fillStyle = '#c0353b'; ctx.fillRect(A.x + A.w - 18, ly - 10, 6, 20); }
    }
    if (st.shootEye && st.laserOn) { beam(hx - 90 * k, yEye + 30, hx - 14 * k, yEye - 6, '#ff3a3a', 3); }
    if (st.laserOn && (st.beamEye || st.shootEye || st.mirror)) { D.glow(hx - 10 * k, yEye - 6, 26, '#ff2020', 0.55 + 0.25 * Math.sin(S.t * 8)); }
    // 안전 표지와 눈 높이선
    ctx.strokeStyle = '#9aa6b8'; ctx.setLineDash([4, 5]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(tx + 60, yEye - 6); ctx.lineTo(tx + tw - 70, yEye - 6); ctx.stroke(); ctx.setLineDash([]);
    T(tx + 66, yEye - 12, '눈 높이', ph ? 10.5 : 11.5, '#9aa6b8', 'left', 800);
    if (st.sign) { const sx = tx + tw * 0.74, sy = A.y + 56; ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.moveTo(sx, sy - 18 * k); ctx.lineTo(sx + 20 * k, sy + 16 * k); ctx.lineTo(sx - 20 * k, sy + 16 * k); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#26324a'; ctx.lineWidth = 2.5; ctx.stroke(); T(sx, sy + 11 * k, '!', 18 * k, '#26324a', 'center', 900); T(sx, sy + 32 * k, '레이저 경고', ph ? 10.5 : 11.5, '#26324a', 'center', 800); }
    // 위험 요소 목록
    panel(B.x, B.y, B.w, B.h, 14);
    const px = B.x + 14, pw = B.w - 28; let yy = B.y + 26;
    T(px, yy, st.hz.length ? '⚠️ 위험 요소 ' + st.hz.length + '개' : '✅ 위험 요소 0개', ph ? 14 : 15, st.hz.length ? '#c0353b' : '#1c7a4a', 'left', 800); yy += 12;
    st.hz.forEach((h) => { yy += 10; const hh = textBlock(px, yy + 8, pw, '• ' + h, ph ? 12 : 13, '#26324a', ph ? 16 : 18, 700); yy += hh + 4; });
    if (!st.hz.length) { yy += 26; textBlock(px, yy, pw, '지켜야 할 규칙을 모두 골랐어요!', 13, '#1c7a4a', 18, 800); }
    const ck = RULES.filter((r) => r.ok && safeOn(r.id)).length, bad = RULES.filter((r) => !r.ok && safeOn(r.id)).length;
    T(px, B.y + B.h - 14, '지킬 규칙 ' + ck + ' / 4 · 잘못 고른 것 ' + bad + '개', ph ? 12 : 12.5, '#5d6879', 'left', 800);
    panel(BOT.x, BOT.y, BOT.w, BOT.h, 14);
    textBlock(BOT.x + 16, BOT.y + 28, BOT.w - 32, '레이저 빛은 곧게 나가고 한곳에 모여서 눈의 망막을 다치게 할 수 있어요. 직접 쏘이는 빛뿐 아니라 거울·유리·금속에서 반사한 빛도 위험해요.', PHONE ? 13.5 : 15, '#26324a', PHONE ? 20 : 22, 800);
    textBlock(BOT.x + 16, BOT.y + (PHONE ? 98 : 84), BOT.w - 32, '레이저 포인터는 등급이 있어요. 1 mW 이하(등급 2)도 오래 보면 위험하고, 5 mW 이상(3R 이상)은 순간 노출도 위험해요.', 12.5, '#5d6879', 18, 700);
  }

  /* ---------- 단계 진행(매 프레임) ---------- */
  function stepAll(dt) { stepAtom(dt); stepInvert(dt); stepCavity(dt); }

  /* ---------- 포인터: 공진기 장면에서 출력 그래프를 눌러 펌핑 세기를 골라요 ---------- */
  const cvAx2Rect = () => { const g2 = cvLay().g2; return { x: g2.x + 48, y: g2.y + 34, w: g2.w - 66, h: g2.h - (PHONE ? 84 : 92) }; };
  const inAx2 = (p) => { if (S.mode !== 'cavity') return false; const r = cvAx2Rect(); return p.x > r.x - 8 && p.x < r.x + r.w + 8 && p.y > r.y - 6 && p.y < r.y + r.h + 6; };
  const setPump = (p) => { const r = cvAx2Rect(); const v = clamp(Math.round((p.x - r.x) / r.w * 100), 0, 100); S.cv.p = v; slQ.set(v); };
  let dragPump = false;
  SciSim.pointer(view, {
    down(p) { if (inAx2(p)) { dragPump = true; setPump(p); Sound.click(); return true; } return false; },
    move(p) { if (dragPump) setPump(p); },
    up() { dragPump = false; },
    hover(p) { return inAx2(p) ? 'ew-resize' : 'default'; },
  });

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  function readouts() {
    let a, b, c, L1, L2, L3;
    if (S.mode === 'atom') {
      const A = S.at, st = atState(A.proc, A.tp, atPanels().atom, A);
      L1 = '지금 보는 과정'; a = procName[A.proc];
      L2 = '광자 수'; b = st.from + '개 → ' + st.cnt + '개';
      L3 = 'ΔE = hf'; c = E_HENE.toFixed(2) + ' eV (' + LAM_HENE + ' nm)';
    } else if (S.mode === 'invert') {
      const N2 = ivN2(), N1 = ivN1();
      L1 = '원자 수 N₂ : N₁'; a = N2 + ' : ' + N1;
      L2 = '밀도 반전'; b = N2 > N1 ? '됐어요 (N₂ > N₁)' : '아니에요';
      L3 = '광자 수 배율'; c = '×' + gainOf(N2).toFixed(2) + (N2 > N1 ? ' (증폭)' : ' (감소)');
    } else if (S.mode === 'cavity') {
      L1 = '한 번 왕복할 때 이득 / 손실'; a = (cvG() * 100).toFixed(1) + ' % / ' + (cvL() * 100).toFixed(1) + ' %';
      L2 = '공진기 안의 광자 수 n'; b = S.cv.n.toFixed(1);
      L3 = '출력 (상대)'; c = cvOut().toFixed(2) + (cvLasing() ? ' (레이저 발진)' : '');
    } else if (S.ap.sub === 'compare') {
      L1 = '거리'; a = S.ap.dist + ' m';
      L2 = '레이저 빔 지름'; b = fmtLen(DIA.laser(S.ap.dist));
      L3 = '손전등 빔 지름'; c = fmtLen(DIA.flash(S.ap.dist));
    } else if (S.ap.sub === 'fiber') {
      const amp = S.ap.amp, ok = fiberOK(amp);
      L1 = '광 증폭기'; a = amp > 0 ? amp + ' km 지점' : '없음';
      L2 = '가장 약한 곳의 세기'; b = fiberMin(amp).toFixed(0) + ' dB (' + (ok ? '수신 성공' : '수신 실패') + ')';
      L3 = '전송량'; c = 10 * S.ap.ch + ' Gbps';
    } else {
      const st = safeState();
      L1 = '위험 요소'; a = st.hz.length + '개';
      L2 = '지킬 규칙을 고른 수'; b = RULES.filter((r) => r.ok && safeOn(r.id)).length + ' / 4';
      L3 = '잘못 고른 것'; c = RULES.filter((r) => !r.ok && safeOn(r.id)).length + '개';
    }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }
  function resetCavity() { const V = S.cv; V.on = false; V.p = 90; V.tm = '1'; V.n = 0; V.nD = 0; V.hist = []; V.axis = []; V.side = []; V.beam = []; V.seenTm = { '1': true }; slQ.set(90); }
  function resetInvert() { const I = S.iv; I.p = 0; slP.set(0); ivPh.length = 0; I.nIn = 0; I.nOut = 0; I.shotLow = false; I.shotHigh = false; I.lastG = null; I.diag = '4'; I.seenDiag = { '3': false, '4': true }; }

  /* ================= 미션 ================= */
  const levels = [
    {
      title: '흡수와 방출: 빛이 늘어나는 길목', short: '흡수와 방출', icon: '⚛️', phase: '모형',
      intro: '<p class="si-q">❓ 탐구 질문: 손전등 빛은 금세 퍼지는데 레이저 빛은 왜 멀리까지 한 줄로 갈까? 그 빛은 어떻게 만들까?</p>' +
        '<div class="si-link">🔗 <b>물리학에서</b> 원자의 에너지 준위와 광자의 흡수·방출(ΔE = hf)을, 앞 차시 <b>광전효과</b>에서 광자 한 개가 전자 한 개에게 에너지를 주는 흡수를 배웠어요. 이번에는 짝이 되는 <b>방출</b>을 어떻게 제어해서 빛을 <b>증폭</b>하는지 알아봐요.</div>' +
        '<p>에너지 준위가 E₂ > E₁인 원자는 ΔE = E₂ − E₁ = hf인 광자와만 상호작용해요. ① <b>흡수</b>: E₁ → E₂, 광자가 사라져요. ② <b>자발 방출</b>: E₂ → E₁, 광자가 임의의 방향·위상으로 나와요. ③ <b>유도 방출</b>: 같은 hf의 광자가 곁을 지나가면 E₂ → E₁이 되며 입사 광자와 <b>같은 진동수·위상·방향</b>의 광자가 하나 더 나와요(광자 1개 → 2개). 레이저는 ③을 이용해요.</p>',
      features: ['atom'],
      setup() { S.at.seen = { abs: false, spon: false, stim: false }; S.show.selA = false; startProc('abs'); setScene('atom'); },
      recap: '흡수는 광자를 없애며 원자를 들뜨게 하고, 자발 방출은 임의의 방향·위상으로 광자를 내보내요. 유도 방출은 입사 광자와 진동수·위상·방향이 같은 광자를 하나 더 만들어 광자를 2개로 늘려요. 레이저는 유도 방출로 빛을 증폭해요.',
      summary: '<ul><li>준위 E₂ > E₁, <b>ΔE = E₂ − E₁ = hf</b>. 헬륨-네온 레이저: 1.96 eV ↔ 632.8 nm (λ = 1240 / 1.96).</li><li><b>흡수</b>: E₁ → E₂, 광자 1개 → 0개.</li><li><b>자발 방출</b>: E₂ → E₁ 저절로, 광자 0개 → 1개. 방향·위상이 임의예요.</li><li><b>유도 방출</b>: 지나가는 광자가 들뜬 원자를 자극, E₂ → E₁, 광자 1개 → 2개. 새 광자는 입사 광자와 <b>진동수·위상·방향(편광)이 같아요</b>.</li><li>LASER = Light Amplification by Stimulated Emission of Radiation: 유도 방출에 의한 빛의 증폭.</li></ul>',
      missions: [
        {
          title: '세 과정 모두 시연해 보기',
          goal: '“흡수”, “자발 방출”, “유도 방출”을 차례로 골라 애니메이션을 <b>끝까지</b> 지켜보세요. 광자 수가 어떻게 변하는지 눈여겨봐요.',
          hint: '위쪽 버튼으로 과정을 고르면 저절로 시연돼요. 끝나면 ✅ 표시가 생겨요. 다시 보려면 ▶ 시연을 눌러요.',
          setup() { S.at.seen = { abs: false, spon: false, stim: false }; S.show.selA = false; startProc('abs'); setScene('atom'); },
          check: () => S.at.seen.abs && S.at.seen.spon && S.at.seen.stim,
          hold: 0.3,
          status: () => mark(S.at.seen.abs) + ' 흡수 &nbsp; ' + mark(S.at.seen.spon) + ' 자발 방출 &nbsp; ' + mark(S.at.seen.stim) + ' 유도 방출',
          explain: '<b>흡수</b>는 광자 1개가 사라지고 원자가 E₂로 올라가요. <b>자발 방출</b>은 들뜬 원자가 저절로 내려오며 광자를 임의의 방향·위상으로 내보내요. <b>유도 방출</b>은 지나가는 광자가 들뜬 원자를 자극해서 같은 광자를 하나 더 만들어요. 광자가 늘어나는 것은 유도 방출뿐이에요.',
        },
        {
          title: '과정과 설명 연결하기', manual: true,
          goal: '세 과정의 특징을 떠올리며 문장을 완성하세요.',
          hint: '“임의의 방향”은 자발 방출, “똑같은 광자가 하나 더”는 유도 방출이에요.',
          setup() { S.show.selA = true; SEL_A.reset(); setScene('atom'); },
          check: () => SEL_A.grade(),
          status: () => '고른 문장 ' + SEL_A.count() + ' / 4',
          explain: '흡수는 <b>광자가 사라지는</b> 과정, 자발 방출은 <b>임의의 방향·위상</b>으로 광자가 나오는 과정, 유도 방출은 <b>똑같은 광자가 하나 더</b> 생기는 과정이에요. 레이저는 이 가운데 유도 방출로 빛을 증폭해요.',
        },
        {
          type: 'quiz', title: '유도 방출한 광자의 성질',
          goal: '유도 방출로 새로 나온 광자는 입사 광자와 무엇이 같을까요?',
          setup() { S.show.selA = false; setScene('atom'); },
          choices: ['진동수, 위상, 진행 방향, 편광이 모두 같아요', '진동수만 같고 방향과 위상은 임의예요', '유도 방출은 빛을 흡수해서 사라지게 하는 과정이에요', '진동수와 방향은 같지만 위상은 임의예요'],
          answer: 0,
          feedback: ['', '방향과 위상이 임의인 것은 자발 방출한 광자예요. 유도 방출은 입사 광자를 그대로 복제한 것 같아요.', '그건 흡수예요. 유도 방출은 광자를 사라지게 하는 것이 아니라 하나 더 만들어요.', '위상도 같아요. 위상이 같아서 두 광자의 파동이 가지런히 겹쳐져 센 빛이 돼요.'],
          explain: '유도 방출한 광자는 입사 광자와 <b>진동수·위상·방향·편광이 모두 같아요</b>. 그래서 광자가 늘어날수록 파동이 가지런히 겹쳐 세기가 커지고, 한 방향으로 나아가는 결맞은 빛이 돼요.',
        },
      ],
    },
    {
      title: '밀도 반전: 흡수보다 방출이 많을 때', short: '밀도 반전', icon: '📦', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 유도 방출은 광자를 늘리고 흡수는 광자를 없앤다는 것을 알았어요. 광자가 지나갈 때 둘 중 어느 쪽이 더 자주 일어날까요? 그것은 <b>높은 준위의 원자가 더 많은지</b>에 달려 있어요.</div>' +
        '<p>원자 100개의 상자를 보세요. 높은 준위의 원자 수 N₂, 낮은 준위의 원자 수 N₁이에요. 보통(열평형)은 N₂ ≪ N₁이라 광자가 흡수돼요. 바깥에서 에너지를 주어(<b>펌핑</b>) 원자를 높은 준위로 올려 <b>N₂ > N₁</b>(밀도 반전)을 만들면 유도 방출이 흡수보다 많아져서 빛이 증폭돼요.</p>',
      features: ['invert'],
      setup() { resetInvert(); S.show.selB = false; setScene('invert'); },
      recap: '열평형에서는 낮은 준위의 원자가 훨씬 많아서(N₂ ≪ N₁) 광자가 흡수돼요. 펌핑으로 N₂ > N₁인 밀도 반전을 만들면 유도 방출이 흡수보다 많아져 광자가 지나갈 때마다 늘어나요. 준안정 준위가 있으면 반전을 만들기 쉬워요.',
      summary: '<ul><li><b>밀도 반전</b>: 높은 준위의 원자 수 N₂ > 낮은 준위의 원자 수 N₁. 이때 유도 방출이 흡수보다 많아 빛이 증폭돼요.</li><li>열평형 예: 원자 100개 중 N₂ : N₁ = 1 : 99. 광자를 넣으면 대부분 흡수돼요. 펌핑 후 N₂ = 70, N₁ = 30이면 광자가 지나갈 때마다 늘어나요(1 → 2 → 4 → 8 …).</li><li><b>펌핑</b>: 빛이나 전류로 원자를 높은 준위로 올려 주는 일.</li><li><b>준안정 준위</b>: 원자가 오래 머무는 준위. 3준위·4준위 도식에서 반전을 만들어요. 4준위는 아래 준위가 빨리 비어서 반전이 쉬워요(정성).</li></ul>',
      missions: [
        {
          title: '밀도 반전 만들기',
          goal: '먼저 열평형에서 광자 5개를 넣어 보고, 펌핑 세기를 올려 <b>N₂ > N₁</b>이 되게 한 뒤 다시 광자를 넣어 증폭되는 것을 확인하세요.',
          hint: '“광자 5개 넣기”를 눌러요(펌핑 0). 그다음 펌핑 세기를 70 이상으로 올리면 N₂가 50을 넘어요. 다시 광자를 넣어 보세요.',
          setup() { resetInvert(); S.show.selB = false; setScene('invert'); },
          check: () => ivN2() > ivN1() && S.iv.shotLow && S.iv.shotHigh,
          hold: 0.8,
          status: () => mark(S.iv.shotLow) + ' 열평형에서 광자 넣기 &nbsp; ' + mark(S.iv.shotHigh) + ' 반전 상태에서 광자 넣기 &nbsp; ' + mark(ivN2() > ivN1()) + ' N₂ ' + ivN2() + ' > N₁ ' + ivN1(),
          explain: '열평형(N₂ = 1, N₁ = 99)에서는 지나가는 광자가 대부분 흡수되어 나오는 광자가 거의 없어요. 펌핑으로 N₂를 50보다 크게 만들면(밀도 반전) 광자가 지나가며 늘어나요. N₂ = 70, N₁ = 30이면 상자를 지나는 동안 광자 수가 약 4배가 돼요.',
        },
        {
          title: '증폭 조건 정리하기', manual: true,
          goal: '증폭이 일어나는 조건을 문장으로 완성하세요. 오른쪽 <b>3준위·4준위 도식</b>을 모두 눌러 살펴본 뒤에 확인해요.',
          hint: '증폭하려면 흡수보다 유도 방출이 많아야 해요. 그러려면 N₂와 N₁의 크기 관계가 어때야 할까요? 도식은 “3준위”와 “4준위” 버튼으로 바꿔요.',
          setup() { S.show.selB = true; SEL_B.reset(); S.iv.seenDiag = { '3': false, '4': S.iv.diag === '4' }; if (S.iv.diag === '3') S.iv.seenDiag['3'] = true; setScene('invert'); },
          check() {
            if (!S.iv.seenDiag['3'] || !S.iv.seenDiag['4']) return '“3준위”와 “4준위” 도식을 모두 눌러 살펴보세요.';
            return SEL_B.grade();
          },
          status: () => mark(S.iv.seenDiag['3']) + ' 3준위 &nbsp; ' + mark(S.iv.seenDiag['4']) + ' 4준위 &nbsp; · 고른 문장 ' + SEL_B.count() + ' / 4',
          explain: '빛이 증폭되려면 <b>N₂ > N₁</b>(밀도 반전)이어야 해요. N₂ < N₁이면 흡수가 더 많아 광자가 줄어요. 원자를 높은 준위로 올려 주는 일이 <b>펌핑</b>이에요. 원자가 오래 머무는 <b>준안정 준위</b>가 있으면 윗준위에 원자가 쌓여 밀도 반전을 만들기 쉬워요.',
        },
        {
          type: 'quiz', title: '반전이 아니면 증폭되지 않는 까닭',
          goal: '밀도 반전이 되지 않으면(N₂ < N₁) 빛이 증폭되지 않아요. 그 까닭은?',
          setup() { S.show.selB = false; setScene('invert'); },
          choices: ['유도 방출보다 흡수가 더 많이 일어나서 광자가 늘기보다 줄어들기 때문에', '광자가 원자와 전혀 상호작용하지 않기 때문에', '자발 방출이 너무 많이 일어나서 빛이 퍼지기 때문에', '원자가 광자를 반사해 버리기 때문에'],
          answer: 0,
          feedback: ['', '광자의 에너지가 hf = ΔE이면 원자와 상호작용해요. 문제는 어느 과정이 더 자주 일어나느냐예요.', '자발 방출은 광자를 늘리지만 방향이 임의라서 증폭에 기여하지 않아요. 핵심은 흡수와 유도 방출의 비교예요.', '원자가 광자를 반사하는 것이 아니라 흡수하거나 유도 방출해요.'],
          explain: '광자가 지나갈 때 낮은 준위의 원자는 광자를 <b>흡수</b>하고, 높은 준위의 원자는 <b>유도 방출</b>로 광자를 늘려요. N₂ < N₁이면 흡수가 더 많이 일어나서 광자가 줄어요. N₂ > N₁이어야 순수하게 광자가 늘어나요.',
        },
      ],
    },
    {
      title: '공진기: 거울 사이에서 키우기', short: '공진기', icon: '🔴', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 밀도 반전이면 광자가 늘지만, 상자를 한 번 지나는 동안에는 조금만 늘었어요. 많이 늘리려면 같은 매질을 <b>여러 번</b> 지나가게 하면 돼요. 두 거울 사이에서 광자를 왕복시키는 장치가 <b>공진기</b>예요.</div>' +
        '<p>한쪽 거울은 거의 모두 반사하고, 다른 쪽(출력 거울)은 일부(예: 1 %)를 통과시켜 <b>빔</b>으로 꺼내요. 광자 수는 왕복할 때마다 늘다가 <b>이득 = 손실</b>이 되는 곳에서 일정해져요. 거울 축과 나란하지 않은 광자는 옆으로 빠져나가서 축과 나란한 광자만 남아 <b>직진하는 빔</b>이 돼요.</p>',
      features: ['cavity'],
      setup() { resetCavity(); S.show.selC = false; setScene('cavity'); },
      recap: '공진기의 두 거울 사이를 광자가 왕복하며 유도 방출로 늘어나고, 이득 = 손실에서 일정한 세기가 돼요. 한쪽 거울이 일부를 통과시켜 빔이 나가고, 축과 나란한 광자만 남아 직진성이 생겨요. 펌핑이 문턱을 넘어야 레이저가 돼요.',
      summary: '<ul><li><b>공진기</b>: 두 거울 사이에서 광자가 매질을 여러 번 지나며 증폭돼요. 한쪽 거울은 약간 투과시켜 빔을 꺼내요.</li><li>왕복할 때마다 광자 수가 늘다가(예: 2배씩), 출력 거울로 새는 손실(예: 1 %)과 이득이 같아지면 <b>이득 = 손실</b>에서 일정한 출력이 돼요.</li><li><b>문턱</b>: 이득이 손실보다 커져야 발진해요. 출력 거울의 투과율이 클수록 손실이 커서 문턱이 높아져요.</li><li><b>직진성</b>: 축과 나란하지 않은 자발 방출 광자는 옆으로 빠져나가고, 축과 나란한 광자만 증폭돼 평행한 빔이 돼요. 거울이 없으면 증폭이 거의 안 돼요.</li></ul>',
      missions: [
        {
          title: '레이저 켜서 빔 만들기',
          goal: '“펌핑 켜기”를 눌러 레이저를 켜고, 광자 수가 늘다가 일정해지며 <b>빔이 나오는 것</b>(출력 0.3 이상)을 확인하세요.',
          hint: '출력 거울은 1 %로 두고 펌핑 세기를 90 정도로 해요. 문턱을 넘으면 그래프의 광자 수가 쑥 올라가요.',
          setup() { resetCavity(); S.show.selC = false; setScene('cavity'); },
          check: () => cvLasing(),
          hold: 1.0,
          status: () => mark(S.cv.on) + ' 펌핑 켜짐 &nbsp; ' + mark(cvG() > cvL()) + ' 이득 ' + (cvG() * 100).toFixed(1) + ' % > 손실 ' + (cvL() * 100).toFixed(1) + ' % &nbsp; ' + mark(cvOut() >= 0.3) + ' 출력 ' + cvOut().toFixed(2),
          explain: '펌핑을 켜면 밀도 반전이 생기고, 거울 사이를 왕복하는 광자가 유도 방출로 늘어요. 이득이 손실(출력 거울로 새는 1 % 등)보다 크면 광자 수가 늘다가 <b>이득 = 손실</b>인 곳에서 일정해지고 출력 빔이 나가요. 이득이 손실보다 작은 펌핑에서는 레이저가 되지 않아요(문턱).',
        },
        {
          title: '직진성이 생기는 까닭 정리하기', manual: true,
          goal: '출력 거울의 투과율을 <b>1 %</b>와 <b>10 %</b>로 모두 바꿔 비교한 뒤, 직진성에 대한 문장을 완성하세요.',
          hint: '투과율이 큰 거울은 손실이 커서 같은 펌핑에서 광자가 덜 쌓이고 출력 그래프의 문턱이 오른쪽으로 옮겨 가요. 화면의 옆으로 빠져나가는 점들도 보세요.',
          setup() { S.show.selC = true; SEL_C.reset(); S.cv.seenTm = { [S.cv.tm]: true }; setScene('cavity'); },
          check() {
            if (!S.cv.seenTm['1'] || !S.cv.seenTm['10']) return '출력 거울의 투과율을 1 %와 10 % 모두 골라 비교해 보세요.';
            return SEL_C.grade();
          },
          status: () => mark(!!S.cv.seenTm['1']) + ' 1 % &nbsp; ' + mark(!!S.cv.seenTm['10']) + ' 10 % &nbsp; · 고른 문장 ' + SEL_C.count() + ' / 4',
          explain: '거울 축과 나란하지 않은 광자는 몇 번 왕복하기 전에 옆으로 빠져나가요. <b>축과 나란한 광자만</b> 거울 사이를 계속 왕복하며 증폭되므로 퍼짐이 아주 작은 평행한 빔이 만들어져요. 출력 거울의 투과율이 클수록 손실이 커져서(1 % → 10 %) 같은 펌핑에서 공진기 안의 광자 수는 줄어요.',
        },
        {
          type: 'quiz', title: '거울을 없애면?',
          goal: '공진기에서 거울을 모두 없애면 빛이 약해져요. 그 까닭은?',
          setup() { S.show.selC = false; setScene('cavity'); },
          choices: ['빛이 매질을 한 번만 지나가서 거의 증폭되지 않고, 방향이 제각각인 약한 빛만 남기 때문에', '거울이 직접 빛을 만들어 내는데 거울이 없어지기 때문에', '거울을 없애면 매질의 원자가 사라지기 때문에', '거울을 없애면 밀도 반전이 저절로 사라지기 때문에'],
          answer: 0,
          feedback: ['', '빛을 만드는 것은 매질의 원자예요. 거울은 빛을 되돌려 같은 매질을 여러 번 지나게 해요.', '원자는 그대로 있어요. 달라지는 것은 광자가 매질을 지나는 횟수예요.', '밀도 반전은 펌핑이 만들어요. 거울이 없어도 N₂ > N₁이 될 수 있지만 증폭이 충분하지 않아요.'],
          explain: '거울이 없으면 광자가 매질을 <b>한 번만</b> 지나가요. 한 번 지날 때의 증폭은 작아서 빛이 거의 커지지 않고, 축 방향의 광자가 쌓이지도 않아요. 거울로 광자를 왕복시켜야 같은 매질에서 여러 번 증폭되고 평행한 빔이 만들어져요.',
        },
      ],
    },
    {
      title: '특징과 활용: 광통신과 안전', short: '특징과 활용', icon: '🌐', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 공진기가 만드는 레이저 빛은 한 파장, 같은 위상, 한 방향이라는 것을 알았어요. 이 특징이 어디에 쓰이는지, 그리고 왜 조심해야 하는지 알아봐요. (<b>통합과학의 디지털 신호</b>: 0과 1을 빛의 꺼짐·켜짐 펄스로 보내요.)</div>' +
        '<p>레이저는 <b>단색성·결맞음·직진성·집속성</b> 덕분에 광통신, 바코드와 광디스크, 레이저 절단과 수술, 거리 측정(LiDAR)에 쓰여요. 광통신은 1550 nm 근적외선 레이저 펄스를 광섬유로 보내요. 한편 레이저 빛은 곧고 세서 <b>눈을 다치게 할 수 있으니 안전 수칙</b>을 꼭 지켜야 해요.</p>',
      features: ['apps'],
      setup() { S.ap.sub = 'compare'; S.ap.dist = 100; slD.set(100); S.ap.amp = 0; slA.set(0); S.ap.ch = 1; S.ap.safe = {}; S.ap.seenCmp = true; S.ap.seenFib = false; S.ap.seenSaf = false; S.show.safe = false; setScene('apps'); },
      recap: '레이저는 단색성·결맞음·직진성·집속성이 있어 광통신 등에 쓰여요. 광섬유는 1 km에 0.2 dB씩 약해지므로 광 증폭기로 보충하고, 파장 분할 다중화로 전송량을 늘려요. 레이저는 눈을 다치게 할 수 있어서 안전 수칙을 지켜야 해요.',
      summary: '<ul><li><b>레이저와 전구</b>: 단색성(한 파장), 결맞음(이중 슬릿 무늬가 또렷), 직진성(빔 지름 1 mm가 100 m에서 약 10 cm, 손전등은 몇 m), 집속성(좁은 곳에 모여 세기가 커요).</li><li><b>광통신</b>: 0·1을 빛의 꺼짐·켜짐 펄스로 광섬유(코어·클래딩의 굴절률 차이로 전반사)에 보내요. 1550 nm에서 손실이 가장 작아 약 0.2 dB/km. 50 km에서 10 dB(1/10), 100 km에서 20 dB(1/100)이라 중간에 <b>광 증폭기</b>가 필요해요.</li><li><b>파장 분할 다중화</b>: 파장이 다른 레이저 40개를 한 광섬유에 실으면 40 × 10 Gbps = 400 Gbps.</li><li><b>안전 수칙</b>: 사람·동물의 눈이나 거울·유리·금속 같은 반사면을 향해 쏘지 않기, 빔 높이를 눈보다 낮게, 보호 안경과 경고 표지, 쓰지 않을 때 전원 끄기. 등급이 높을수록(2 → 3R → 4) 위험해요.</li></ul>',
      missions: [
        {
          title: '광통신 설계: 광 증폭기 위치 정하기',
          goal: '“광통신” 장면에서 100 km 광섬유의 신호가 <b>어디에서도 처음의 1/10(−10 dB)보다 약해지지 않도록</b> 광 증폭기 한 개의 위치를 정하세요.',
          hint: '1 km마다 0.2 dB씩 약해져요. 증폭기는 들어온 빛을 처음 세기로 되돌려요. 증폭기 앞 구간과 뒤 구간 모두 −10 dB 이상이 되려면 어디에 두어야 할까요? 그래프의 초록 선이 한계선 위에 있으면 성공이에요.',
          setup() { S.ap.sub = 'fiber'; S.ap.seenFib = true; S.ap.amp = 0; slA.set(0); S.show.safe = false; setScene('apps'); },
          check: () => S.ap.sub === 'fiber' && fiberOK(S.ap.amp),
          hold: 0.8,
          status: () => mark(S.ap.sub === 'fiber' && fiberOK(S.ap.amp)) + ' 증폭기 ' + (S.ap.amp > 0 ? S.ap.amp + ' km' : '없음') + ' · 가장 약한 곳 ' + fiberMin(S.ap.amp).toFixed(0) + ' dB (한계 −10 dB)',
          explain: '광섬유는 1 km마다 0.2 dB씩 약해져서 50 km에서 10 dB(1/10), 100 km에서 20 dB(1/100)이 돼요. 증폭기가 신호를 처음 세기로 되돌린다면 <b>가운데인 50 km</b>에 두어야 앞 구간(−10 dB)과 뒤 구간(−10 dB) 모두 한계 이상이에요. 더 멀리 보내려면 증폭기를 여러 개 두어요.',
        },
        {
          title: '레이저 안전 수칙 고르기', manual: true,
          goal: '“특징 비교” 장면도 살펴본 뒤, <b>안전 점검</b> 장면에서 레이저를 안전하게 다루기 위해 <b>지켜야 하는 규칙만</b> 모두 고르세요.',
          hint: '사람 눈과 반사면, 빔 높이, 보호 장비, 전원을 떠올려 보세요. 잘못 고르면 화면의 위험 요소가 늘어나요. 위험 요소가 0개가 되도록 해요.',
          setup() { S.show.safe = true; S.ap.safe = {}; S.ap.seenCmp = false; S.ap.seenSaf = false; S.ap.sub = 'safety'; S.ap.seenSaf = true; setScene('apps'); },
          check() {
            if (!S.ap.seenCmp) return '“🔍 특징 비교” 장면도 살펴보세요.';
            const miss = RULES.filter((r) => r.ok && !safeOn(r.id)), bad = RULES.filter((r) => !r.ok && safeOn(r.id));
            if (bad.length) return '잘못 고른 것이 ' + bad.length + '개 있어요: “' + bad[0].t + '”는 위험해요.';
            if (miss.length) return '지켜야 할 규칙이 ' + miss.length + '개 더 있어요. 화면의 위험 요소를 보며 찾아 보세요.';
            return true;
          },
          status: () => mark(S.ap.seenCmp) + ' 특징 비교 &nbsp; ' + mark(S.ap.seenSaf) + ' 안전 점검 &nbsp; · 지킬 규칙 ' + RULES.filter((r) => r.ok && safeOn(r.id)).length + ' / 4 · 잘못 고른 것 ' + RULES.filter((r) => !r.ok && safeOn(r.id)).length,
          explain: '레이저 빛은 곧고 세서 눈의 망막 한 점에 모이면 큰 손상을 줄 수 있어요. <b>사람·동물의 눈이나 거울·유리·금속 같은 반사면을 향해 쏘지 않고</b>, 빔 높이는 눈보다 낮게 하며, 보호 안경과 경고 표지를 쓰고, 쓰지 않을 때는 전원을 꺼요. 레이저 포인터를 거울 쪽으로 쏘면 반사광이 눈에 들어갈 수 있어서 안 돼요. 선글라스는 보호 안경이 아니에요.',
        },
        {
          type: 'quiz', title: '구리선 대신 광섬유를 쓰는 까닭',
          goal: '장거리 통신에서 구리선 대신 광섬유를 쓰는 주된 까닭은?',
          setup() { S.show.safe = false; S.ap.sub = 'fiber'; setScene('apps'); },
          choices: ['빛이 전반사로 광섬유 안에 갇혀 손실이 작고 전기 잡음에 강해서, 먼 거리까지 많은 정보를 빠르게 보낼 수 있기 때문에', '광섬유 속에서는 빛이 구리선의 전류보다 훨씬 느려서 안전하기 때문에', '광섬유가 빛의 에너지를 흡수해 열로 바꾸어 신호를 만들기 때문에', '레이저 빛은 파장이 길어서 광섬유를 지나는 동안 저절로 세지기 때문에'],
          answer: 0,
          feedback: ['', '빛은 전선 속 전자의 이동보다 훨씬 빠르게 정보를 실어 날라요. 느려서가 아니에요.', '광섬유는 빛을 흡수하지 않고 전반사로 전달해요. 흡수는 손실의 원인이에요.', '빛은 광섬유를 지나는 동안 조금씩 약해져요. 그래서 광 증폭기가 필요해요.'],
          explain: '광섬유는 코어와 클래딩의 굴절률 차이로 빛을 <b>전반사</b>시켜 가두고, 1550 nm에서 손실이 매우 작아요. 전기 잡음의 영향이 적고 파장 분할 다중화로 많은 정보를 동시에 보낼 수 있어서 대륙 간 해저 케이블까지 광섬유를 써요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hq-laser', mount: '#game', badge: '레이저 탐험가', homeHref: '../../index.html#hq',
    featureLabels: { atom: '⚛️ 두 준위 원자 · 광자', invert: '📦 원자 100개 상자 · 펌핑', cavity: '🔴 공진기 · 출력 그래프', apps: '🌐 특징 비교 · 광통신 · 안전 점검' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  startProc('abs');
  setScene('atom');
  updateCtl();
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    view.apply();
    stepAll(dt);
    ctx.clearRect(0, 0, VW, VH);
    if (S.mode === 'atom') drawAtom(); else if (S.mode === 'invert') drawInvert(); else if (S.mode === 'cavity') drawCavity(); else drawApps();
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, MA, BOT, SEL_A, SEL_B, SEL_C, RULES, slP, slQ, slD, slA, setScene, updateCtl, gainOf, n2Of, gainRT, lossOf, nSS, fiberOK, fiberMin, fiberDb, safeState, safeOK, cvG, cvL, cvOut, cvLasing, pThreshold, ivN2, startProc, fireShot, atState, atPanels, cvLay, cvAx2Rect, ivPh, DIA, procSeg, diagSeg, tmSeg, apSeg, chSeg, TM,
    perfPrep(m, sub) { if (m === 'apps' && sub) { S.ap.sub = sub; updateCtl(); } if (m === 'cavity') { S.cv.on = true; } if (m === 'invert') { S.iv.p = 80; slP.set(80); setInterval(() => fireShot(), 1500); } },
    setSub(sub) { S.ap.sub = sub; updateCtl(); },
    get game() { return game; },
  };

})();
