/* =========================================================
   전자기와 양자 Ⅱ. 빛과 정보 통신 - 광전효과와 기술 (단원 5차시)
   성취기준 [12전자02-04] 광전효과에서 빛과 물질이 상호작용하는 방식을 알고, 디지털 영상 정보, 광센서, 태양전지 등
   광전효과와 관련된 다양한 기술을 조사할 수 있다.
   ① 실험: 정지 전압 (광전관: 파장·세기·역전압, 광자 1개 - 전자 1개의 흡수)
   ② 분석: 그래프 분석 (f-V₀ 그래프의 기울기 h/e, 절편 W)
   ③ 모형: 광자와 전류 (N = P/(hf), 양자 효율 1 %일 때의 광전류)
   ④ 적용: 광전 기술 (이미지 센서, 광센서, 태양전지)
   광전효과의 양자역학적 유도, 이미지 센서 회로 설계, 태양전지 등가 회로 방정식, 콤프턴 산란은 다루지 않아요.
   (그림의 광자·전자 수는 실제보다 훨씬 적게 그렸어요.)
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
      if (ctx.measureText(t).width > maxW && line) {
        if (/[.,;:!?)%]/.test(ch)) { line = t; continue; }                       // 문장부호가 줄 맨 앞에 오지 않게
        const m = /[A-Za-z0-9_.(]+$/.exec(line);                                  // 숫자·영문 덩어리(예: 5.0)는 쪼개지 않기
        if (m && m.index > 0 && /[A-Za-z0-9_]/.test(ch)) { out.push(line.slice(0, m.index)); line = m[0] + ch; }
        else { out.push(line); line = ch.trim() === '' ? '' : ch; }
      } else line = t;
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
  const HC = 1240;                    // eV·nm
  const CL = 3.0e8;                   // 빛의 속력 (m/s)
  const QE = 1.6e-19;                 // 전자의 전하량 (C)
  const ETA = 0.01;                   // 양자 효율 1 %
  const W_NA = 2.3;                   // 나트륨의 일함수 (eV)
  const METALS = { Cs: { name: '세슘', W: 2.1, col: '#8b5cf6' }, Na: { name: '나트륨', W: 2.3, col: '#f26b3a' }, Zn: { name: '아연', W: 4.3, col: '#0ea5e9' } };
  const MA = PHONE ? { x: 8, y: 8, w: 464, h: 520 } : { x: 12, y: 12, w: 776, h: 414 };
  const BOT = PHONE ? { x: 8, y: 536, w: 464, h: 136 } : { x: 12, y: 436, w: 776, h: 112 };
  const ephOf = (lam) => HC / lam;                                     // 광자 에너지 (eV)
  const fOf = (lam) => CL / (lam * 1e-9);                              // 진동수 (Hz)
  const ekOf = (lam, W) => Math.max(0, ephOf(lam) - (W == null ? W_NA : W));   // 최대 운동 에너지 (eV) = V₀ (V)
  const LAM0 = HC / W_NA;                                              // 나트륨의 문턱 파장 (≈ 539 nm)
  const isatOf = (lam, P) => (lam > LAM0 ? 0 : ETA * P * lam / HC * 1e3);   // 포화 광전류 (μA), P: 광원 출력 (mW)
  const MINU = 0.15;                                                   // 광전자의 운동 에너지는 최대의 15 %~100 %로 분포해요
  const currentAt = (lam, P, V) => { const ek = ekOf(lam); if (ek <= 0) return 0; if (V >= Math.round(ek * 100) / 100 - 1e-9) return 0; return isatOf(lam, P) * clamp((1 - V / ek) / (1 - MINU), 0, 1); };   // 표에 쓴 V₀(소수 둘째 자리)에서 전류가 0이 돼요
  const nPhot = (lam, P) => (P * 1e-3) / (ephOf(lam) * QE);            // 초당 광자 수
  const iPhoto = (lam, P) => (lam > LAM0 ? 0 : nPhot(lam, P) * ETA * QE * 1e6);   // 광전류 (μA)
  const WLS = [300, 350, 400, 450, 500, 550];
  const ROW = WLS.map((l) => ({ lam: l, f: +(fOf(l) / 1e14).toFixed(1), v: ekOf(l) > 0 ? +ekOf(l).toFixed(2) : null }));
  const SLOPE = HC * 1e-9 / CL;                                       // h/e (V·s) ≈ 4.13×10⁻¹⁵
  const SLOPE14 = SLOPE * 1e14;                                       // V per (10¹⁴ Hz)
  // 이미지 센서
  const TEXP = [0.5, 0.7, 1, 1.4, 2, 2.8, 4, 5.6, 8, 11, 16, 22, 32, 45, 64, 90, 125, 180, 250];   // 노출 시간 (ms)
  const NFULL = 400;                                                   // 이 화소는 전자 400개가 쌓이면 255
  const RATE = { day: 100, night: 1 };                                 // 밝기 1인 칸에 초당 쌓이는 전자 (개/ms)
  const GW = 12, GH = 9, TGT = { x: 8, y: 2 };
  const lumAt = (x, y) => {
    const dm = Math.hypot(x - 8, y - 2);
    if (dm <= 1.55) return 1.0;
    if (y >= 7 - Math.round(1.2 * Math.sin(x * 0.7 + 0.5))) return 0.12;
    return 0.22 + 0.04 * y + (dm < 3.2 ? 0.2 : 0);
  };
  const neOf = (L, mode, ti) => L * RATE[mode] * TEXP[ti];
  const digOf = (L, mode, ti) => Math.round(255 * Math.min(1, neOf(L, mode, ti) / NFULL) + 1e-9);
  const fmtT = (t) => (t < 10 ? t.toFixed(1) : String(t)) + ' ms';
  const EG = 1.1, LAMG = HC / EG;                                      // 규소의 띠 간격, 흡수 한계 파장 (≈ 1127 nm)
  const luxI = (lux) => lux / 100;                                     // 광센서의 광전류 (μA): 100 lx당 1 μA

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'tube', t: 0, fade: 0,
    show: { rec: false, int: false, metal: false, icpt: false, inH: false, inN: false, selA: false, selB: false },
    tb: { lam: 400, V: 0, k: 1, rec: [], seenInt: false, kMin: 1, kMax: 1, longHold: 0, seenLong: false, el: [], ph: [], acc: 0, needle: 0, flash: 0, msgT: 0 },
    gr: { pts: [false, false, false, false, false], fly: [], line: 0, metal: 'Na', seenMetals: {} },
    pn: { lam: 400, P: 1.0, solved: false, cyc: 0, cycDone: 0 },
    te: { sub: 'sensor', day: 'day', ti: 2, lux: 600, thr: 200, solLam: 700, seenLamp: false, seenLampOn: false, seenLampOff: false, seenOn: false, seenOff: false, lampOn: false, solT: 0 },
  };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const MODE_LABEL = { tube: '🔦 정지 전압', graph: '📈 그래프 분석', photon: '🧮 광자와 전류', tech: '📷 광전 기술' };
  const mkNote = (id, txt) => { const n = $('#' + id); if (n) n.textContent = txt; };
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
      if (on && sub) on = sub.split(' ').indexOf(S.te.sub) >= 0;
      const dm = n.getAttribute('data-match');
      if (on && dm) on = !!S.show[dm] || (!!game && game.free && (dm === 'rec' || dm === 'int' || dm === 'metal'));
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    teSeg.set(S.te.sub); daySeg.set(S.te.day); metalSeg.set(S.gr.metal);
    $$('#ptChips button').forEach((b) => { const i = +b.dataset.i; b.classList.toggle('done', i < 5 && S.gr.pts[i]); });
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));

  /* ---------- 컨트롤 연결 ---------- */
  const teSeg = bindSeg('teSeg', (v) => { S.te.sub = v; if (v === 'lamp') S.te.seenLamp = true; parts.clear(); updateCtl(); });
  const daySeg = bindSeg('daySeg', (v) => { S.te.day = v; updateCtl(); });
  const metalSeg = bindSeg('metalSeg', (v) => { S.gr.metal = v; S.gr.seenMetals[v] = true; updateCtl(); });
  const slL = bindSlider('sL', (v) => v + ' nm', (v) => { S.tb.lam = +v; });
  const slR = bindSlider('sR', (v) => (v / 100).toFixed(2) + ' V', (v) => { S.tb.V = v / 100; });
  const slK = bindSlider('sK', (v) => '×' + (v / 10).toFixed(1), (v) => { S.tb.k = v / 10; trackK(); });
  const slL2 = bindSlider('sL2', (v) => v + ' nm', (v) => { S.pn.lam = +v; });
  const slP = bindSlider('sP', (v) => (v / 10).toFixed(1) + ' mW', (v) => { S.pn.P = v / 10; });
  const slT = bindSlider('sT', (v) => fmtT(TEXP[+v]), (v) => { S.te.ti = +v; });
  const slX = bindSlider('sX', (v) => v + ' lx', (v) => { S.te.lux = +v; });
  const slH = bindSlider('sH', (v) => v + ' lx', (v) => { S.te.thr = +v; });
  const slS = bindSlider('sS', (v) => v + ' nm', (v) => { S.te.solLam = +v; });
  function trackK() { const T = S.tb; if (T.lam <= LAM0) { T.kMin = Math.min(T.kMin, T.k); T.kMax = Math.max(T.kMax, T.k); if (T.kMax - T.kMin >= 1.5) T.seenInt = true; } }
  $('#bRec').addEventListener('click', () => { Sound.click(); recordV0(); });
  $$('#ptChips button').forEach((b) => b.addEventListener('click', () => { Sound.click(); plotPoint(+b.dataset.i); }));
  const inH = $('#inH'), inW = $('#inW'), inN = $('#inN');
  [inH, inW, inN].forEach((e) => e.addEventListener('input', () => e.classList.remove('ok', 'bad')));

  const SEL_A = mkSelRows('selA', [
    { q: '광원의 <b>세기를 키우면</b> 광전류는', opts: ['커져요', '그대로예요', '작아져요'], ans: 0 },
    { q: '광원의 <b>세기를 키우면</b> 정지 전압 V₀는', opts: ['커져요', '그대로예요', '작아져요'], ans: 1 },
    { q: '파장이 <b>540 nm보다 긴</b> 빛은 세기를 아무리 키워도', opts: ['광전류가 조금씩 흘러요', '광전자가 방출되지 않아요', '정지 전압이 커져요'], ans: 1 },
  ]);
  const SEL_B = mkSelRows('selB', [
    { q: '<b>700 nm</b>(빨강) 빛은 규소 태양전지(띠 간격 1.1 eV)를', opts: ['작동시켜요', '작동시키지 못해요'], ans: 0 },
    { q: '<b>2000 nm</b> 적외선은 규소 태양전지를', opts: ['작동시켜요', '작동시키지 못해요'], ans: 1 },
    { q: '<b>자동 점멸등</b>은 주변 조도가 문턱보다 낮아지면 광전류가 줄어서 램프가', opts: ['켜져요', '꺼져요'], ans: 0 },
    { q: '<b>이미지 센서</b>가 빛을 영상의 밝기 값으로 바꾸는 순서는', opts: ['광자 → 전자 → 전압 → 디지털 값', '전압 → 광자 → 전자 → 디지털 값', '디지털 값 → 전압 → 전자 → 광자'], ans: 0 },
  ]);

  /* ---------- 그리기 도우미 ---------- */
  const rgbaH = (hex, a) => C.rgba(hex, a);
  const hexOf = (c) => '#' + c.map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
  const lightCol = (lam) => (lam < 380 ? '#a78bfa' : lam > 780 ? '#b45353' : wlColor(lam));
  function barH(x, y, w, h, frac, col, bg) {
    ctx.fillStyle = bg || '#e3e8f2'; D.roundRect(x, y, w, h, h / 2); ctx.fill();
    const fw = clamp(frac, 0, 1) * w;
    if (fw > 0.5) { ctx.save(); D.roundRect(x, y, w, h, h / 2); ctx.clip(); ctx.fillStyle = col; ctx.fillRect(x, y, fw, h); ctx.restore(); }
  }
  function photon(x, y, col, r) {
    D.glow(x, y, (r || 7) * 2.6, col, 0.55);
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r || 4.4, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, y, (r || 4.4) * 0.5, 0, TAU); ctx.stroke();
  }
  function electron(x, y, r) { D.sphere(x, y, r || 5, '#2f6bff', { gloss: true }); ctx.fillStyle = '#fff'; ctx.font = D.font((r || 5) * 1.5, 900); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('−', x, y + 0.5); ctx.textBaseline = 'alphabetic'; }
  const SCI = (x, d) => sci(x, d);
  function dial(cx, cy, r, frac, label) {
    ctx.save();
    D.shadow(() => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill(); }, { blur: 6, y: 2 });
    ctx.strokeStyle = '#5d6879'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#9aa6b8';
    for (let i = 0; i <= 10; i++) { const a = (-150 + i * 12) * rad - Math.PI / 2 + 0.0; const ca = Math.cos(a), sa = Math.sin(a); ctx.beginPath(); ctx.moveTo(cx + ca * r * 0.78, cy + sa * r * 0.78); ctx.lineTo(cx + ca * r * 0.92, cy + sa * r * 0.92); ctx.stroke(); }
    const a = (-60 + 120 * clamp(frac, 0, 1)) * rad - Math.PI / 2;
    ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx, cy + r * 0.2); ctx.lineTo(cx + Math.cos(a) * r * 0.82, cy + Math.sin(a) * r * 0.82); ctx.stroke();
    ctx.fillStyle = '#26324a'; ctx.beginPath(); ctx.arc(cx, cy + r * 0.2, 3.5, 0, TAU); ctx.fill();
    T(cx, cy - r * 0.18, label, r * 0.5, '#26324a', 'center', 900);
    ctx.restore();
  }

  /* ================= ① 정지 전압 (광전관) ================= */
  const tbLay = () => PHONE
    ? { a: { x: MA.x, y: MA.y, w: MA.w, h: 332 }, b: { x: MA.x, y: MA.y + 340, w: MA.w, h: MA.h - 340 } }
    : { a: { x: MA.x, y: MA.y, w: 548, h: MA.h }, b: { x: MA.x + 560, y: MA.y, w: 216, h: MA.h } };
  function tbGeom() {
    const A = tbLay().a;
    const x1 = A.x + A.w * 0.08, x2 = A.x + A.w * 0.92, y1 = A.y + A.h * (PHONE ? 0.34 : 0.3), y2 = A.y + A.h * (PHONE ? 0.66 : 0.62);
    const xc = x1 + (x2 - x1) * 0.2, xa = x2 - (x2 - x1) * 0.1, yc = (y1 + y2) / 2, ph = (y2 - y1) * 0.4;
    const yw = A.y + A.h * (PHONE ? 0.85 : 0.84);
    return { A, x1, x2, y1, y2, xc, xa, yc, ph, d: xa - xc, yw, lamp: { x: A.x + A.w * 0.075, y: A.y + (PHONE ? 62 : 70) } };
  }
  const ZERO_I = 0.005;               // 전류계가 0.00 μA로 읽히는 한계
  const tbIsat = () => isatOf(S.tb.lam, S.tb.k);
  const tbI = () => currentAt(S.tb.lam, S.tb.k, S.tb.V);
  const tbEk = () => ekOf(S.tb.lam);
  const KAPPA = 27800;
  function stepTube(dt) {
    const T_ = S.tb, G = tbGeom();
    T_.needle = SciSim.approach(T_.needle, tbI() / 20, dt, 8);
    if (S.mode !== 'tube') return;
    T_.msgT = Math.max(0, T_.msgT - dt);
    // 긴 파장 관찰 시간
    if (T_.lam > LAM0 && T_.k >= 2) T_.longHold += dt; else T_.longHold = 0;
    if (T_.longHold > 1.0) T_.seenLong = true;
    // 광자 (그림에서는 실제보다 훨씬 적게)
    const rate = RM ? 3 : 3.5 * T_.k * (T_.lam / 400);
    T_.acc += rate * dt;
    while (T_.acc >= 1) {
      T_.acc -= 1;
      if (T_.ph.length < 40) T_.ph.push({ x: G.lamp.x + 14, y: G.lamp.y + 10, tx: G.xc - 2, ty: G.yc + (Math.random() - 0.5) * G.ph * 1.5, p: 0 });
    }
    const ek = tbEk();
    for (let i = T_.ph.length - 1; i >= 0; i--) {
      const p = T_.ph[i]; const L = Math.hypot(p.tx - (G.lamp.x + 14), p.ty - (G.lamp.y + 10));
      p.p += dt * 330 / L;
      if (p.p >= 1) {
        T_.ph.splice(i, 1);
        parts.burst(p.tx + 3, p.ty, { count: 4, colors: [lightCol(T_.lam)], speed: 40, life: 0.35, size: 2.4, gravity: 0, shape: 'circle' });
        if (ek > 0 && T_.el.length < 60) T_.el.push({ x: 4, y: p.ty, v: Math.sqrt(2 * KAPPA * ek * (MINU + (1 - MINU) * Math.random())), ek0: 0, back: false });
        else parts.emit({ x: p.tx - 4, y: p.ty, vx: -35, vy: (Math.random() - 0.5) * 50, life: 0.6, size: 3, color: lightCol(T_.lam), shape: 'circle' });
      }
    }
    const a = KAPPA * T_.V / G.d;   // 역전압이 만드는 감속 (eV·px⁻¹ × 비례상수)
    for (let i = T_.el.length - 1; i >= 0; i--) {
      const e = T_.el[i];
      e.v -= a * dt; e.x += e.v * dt;
      if (e.x >= G.d) { T_.el.splice(i, 1); parts.burst(G.xa, G.yc + (e.y - G.yc), { count: 3, colors: ['#2f6bff'], speed: 30, life: 0.3, size: 2, gravity: 0 }); }
      else if (e.x <= 0 && e.v < 0) T_.el.splice(i, 1);
    }
  }
  function recordV0() {
    const T_ = S.tb, ek = tbEk();
    if (ek <= 0) return showHint('이 파장에서는 광전자가 나오지 않아서 정지 전압이 없어요. 파장을 540 nm보다 짧게 해 보세요.');
    if (tbI() >= ZERO_I) return showHint('아직 광전류가 흘러요. 전류가 0이 될 때까지 역전압을 더 올려 보세요.');
    if (T_.V - ek > 0.06) return showHint('전압이 너무 높아요. 전류가 처음 0이 되는 가장 작은 역전압이 정지 전압 V₀예요.');
    const key = Math.round(T_.lam / 10);
    const ex = T_.rec.find((r) => Math.round(r.lam / 10) === key);
    if (ex) { ex.V = T_.V; ex.lam = T_.lam; } else T_.rec.push({ lam: T_.lam, V: T_.V });
    Sound.success(); const G = tbGeom();
    parts.burst(G.A.x + G.A.w * 0.5, G.A.y + 30, { count: 14, colors: [lightCol(T_.lam), '#ffb400'], speed: 130, life: 0.7 });
    showHint(T_.lam + ' nm: V₀ = ' + T_.V.toFixed(2) + ' V 기록!');
  }
  const recFor = (lam) => S.tb.rec.find((r) => Math.round(r.lam / 10) === Math.round(lam / 10));
  function drawTube() {
    const T_ = S.tb, L = tbLay(), G = tbGeom(), A = L.a, B = L.b, k = PHONE ? 0.8 : 1;
    panel(A.x, A.y, A.w, A.h, 14);
    T(A.x + 14, A.y + 24, '🔦 광전관: 금속판에 빛을 비추고 역전압으로 막아 보기', PHONE ? 13 : 15, '#26324a', 'left', 800);
    const col = lightCol(T_.lam), ek = tbEk();
    // 광원과 빛줄기
    ctx.save();
    const bx = G.lamp.x + 14, by = G.lamp.y + 10, tx = G.xc - 2, ty = G.yc;
    const g = ctx.createLinearGradient(bx, by, tx, ty); g.addColorStop(0, rgbaH(col, 0.55)); g.addColorStop(1, rgbaH(col, 0.18));
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(bx - 4, by - 6); ctx.lineTo(bx + 8, by + 8); ctx.lineTo(tx, ty + G.ph * 0.85); ctx.lineTo(tx, ty - G.ph * 0.85); ctx.closePath(); ctx.fill();
    ctx.restore();
    D.shadow(() => { ctx.fillStyle = '#3d4658'; D.roundRect(G.lamp.x - 22 * k, G.lamp.y - 12 * k, 44 * k, 28 * k, 8); ctx.fill(); }, { blur: 6, y: 2 });
    D.glow(G.lamp.x + 14, G.lamp.y + 10, 24, col, 0.85); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(G.lamp.x + 14, G.lamp.y + 10, 7 * k, 0, TAU); ctx.fill();
    T(G.lamp.x - 2, G.lamp.y - 20 * k, T_.lam + ' nm' + (T_.lam < 380 ? ' (자외선)' : ''), PHONE ? 12 : 13, '#26324a', 'center', 800);
    // 유리관
    D.shadow(() => { D.roundRect(G.x1, G.y1, G.x2 - G.x1, G.y2 - G.y1, 34 * k); ctx.fillStyle = 'rgba(190,225,250,.35)'; ctx.fill(); }, { blur: 10, y: 3 });
    ctx.strokeStyle = 'rgba(80,140,200,.7)'; ctx.lineWidth = 3; D.roundRect(G.x1, G.y1, G.x2 - G.x1, G.y2 - G.y1, 34 * k); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(G.x1 + 30, G.y1 + 5, (G.x2 - G.x1) - 60, 3);
    // 음극(나트륨)과 양극
    const plate = (x, lab, c1, c2, left) => {
      const gg = ctx.createLinearGradient(x - 6, 0, x + 6, 0); gg.addColorStop(0, c1); gg.addColorStop(1, c2);
      D.shadow(() => { ctx.fillStyle = gg; D.roundRect(x - 6, G.yc - G.ph, 12, G.ph * 2, 4); ctx.fill(); }, { blur: 5, y: 2 });
    };
    plate(G.xc, '', '#f7c56a', '#d9922e', true); plate(G.xa, '', '#c4cddc', '#8a96aa', false);
    T(G.xc, G.y1 - 8, '음극', PHONE ? 12 : 13.5, '#a8620c', 'center', 800); T(G.xa, G.y1 - 8, '양극', PHONE ? 12 : 13.5, '#4d596c', 'center', 800);
    T(G.xc, G.y2 + 17, '나트륨', PHONE ? 11.5 : 12.5, '#a8620c', 'center', 800);
    // 광자·광전자
    T_.ph.forEach((p) => { const x = (G.lamp.x + 14) + (p.tx - (G.lamp.x + 14)) * p.p, y = (G.lamp.y + 10) + (p.ty - (G.lamp.y + 10)) * p.p; photon(x, y, col, 4.2 * k); });
    T_.el.forEach((e) => electron(G.xc + e.x, e.y, 5 * k));
    // 전위 표시 (역전압이 만드는 경사)
    if (T_.V > 0.004) {
      const vv = clamp(T_.V / 2.5, 0, 1);
      ctx.save(); ctx.strokeStyle = 'rgba(226,70,75,.55)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(G.xc + 8, G.yc + G.ph + 10); ctx.lineTo(G.xa - 8, G.yc + G.ph + 10 - vv * 22 * k); ctx.stroke(); ctx.restore();
      T((G.xc + G.xa) / 2, G.yc + G.ph + 8 - vv * 11 * k - 6, '역전압이 전자를 밀어내요', PHONE ? 11 : 12, '#c0353b', 'center', 800);
    }
    // 회로
    ctx.save(); ctx.strokeStyle = '#3d4658'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const xm1 = G.xc + G.d * 0.27, xm2 = G.xc + G.d * 0.74, yw = G.yw;
    ctx.beginPath(); ctx.moveTo(G.xc, G.yc + G.ph); ctx.lineTo(G.xc, yw); ctx.lineTo(xm1 - 34 * k, yw); ctx.moveTo(xm1 + 34 * k, yw); ctx.lineTo(xm2 - 10, yw);
    ctx.moveTo(xm2 + 10, yw); ctx.lineTo(G.xa, yw); ctx.lineTo(G.xa, G.yc + G.ph); ctx.stroke();
    // 전지 기호 (양극이 − 쪽)
    ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(xm2 - 10, yw - 18 * k); ctx.lineTo(xm2 - 10, yw + 18 * k); ctx.stroke();
    ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(xm2 + 10, yw - 10 * k); ctx.lineTo(xm2 + 10, yw + 10 * k); ctx.stroke();
    ctx.restore();
    T(xm2 - 22, yw - 14 * k, '+', 14, '#c0353b', 'center', 900); T(xm2 + 22, yw - 14 * k, '−', 14, '#1f4fcf', 'center', 900);
    T(xm2, yw + 34 * k, '역전압 ' + T_.V.toFixed(2) + ' V', PHONE ? 12.5 : 14, '#c0353b', 'center', 800);
    T(xm2, yw + 50 * k, '(양극을 −로)', PHONE ? 10.5 : 12, '#5d6879', 'center', 700);
    const Inow = tbI();
    dial(xm1, yw, 30 * k, T_.needle, 'μA');
    T(xm1, yw + 34 * k + 12, 'I = ' + Inow.toFixed(2) + ' μA', PHONE ? 12.5 : 14, Inow >= ZERO_I ? '#26324a' : '#1c7a4a', 'center', 800);
    if (ek > 0 && Inow < ZERO_I && T_.V > 0) D.label(G.xc + G.d / 2, G.y1 + 18 * k, '전류가 0이에요 ✔', { size: PHONE ? 12 : 13, bg: '#16a05a' });
    if (ek <= 0) D.label(G.xc + G.d / 2, G.y1 + 18 * k, '광전자가 나오지 않아요 (540 nm보다 길어요)', { size: PHONE ? 11.5 : 13, bg: '#7b8798' });
    // 오른쪽(또는 아래) 패널
    panel(B.x, B.y, B.w, B.h, 14);
    const px = B.x + 14, pw = PHONE ? 226 : B.w - 28; let yy = B.y + 26;
    T(px, yy, '광자 한 개 → 전자 한 개', PHONE ? 13.5 : 14, '#26324a', 'left', 800); yy += PHONE ? 22 : 24;
    const eph = ephOf(T_.lam), rc = recFor(T_.lam);
    const line = (a, b, c) => { T(px, yy, a, PHONE ? 12.5 : 13, '#5d6879', 'left', 700); T(px + pw, yy, b, PHONE ? 13 : 13.5, c || '#26324a', 'right', 800); yy += PHONE ? 20 : 22; };
    line('광자 에너지 hf', eph.toFixed(2) + ' eV');
    line('일함수 W (나트륨)', W_NA.toFixed(2) + ' eV');
    if (rc) line('E_k,max = eV₀', rc.V.toFixed(2) + ' eV', '#1c7a4a');
    else line('E_k,max = hf − W', ek > 0 ? '? (V₀를 재요)' : '방출 없음', ek > 0 ? '#9aa6b8' : '#c0353b');
    if (rc) { textBlock(px, yy + 2, pw, 'hf − W = ' + eph.toFixed(2) + ' − ' + W_NA.toFixed(2) + ' = ' + ekOf(T_.lam).toFixed(2) + ' eV 와 같아요.', PHONE ? 12 : 12.5, '#1c7a4a', 17, 800); yy += 34; }
    const rx = PHONE ? B.x + 258 : px, rw = PHONE ? B.w - 272 : pw; let ry = PHONE ? B.y + 26 : yy + 6;
    T(rx, ry, '📋 측정한 V₀', PHONE ? 13 : 13.5, '#26324a', 'left', 800); ry += 4;
    const rows = T_.rec.slice().sort((a, b) => a.lam - b.lam);
    if (!rows.length) textBlock(rx, ry + 18, rw, '“V₀ 기록”을 누르면 여기에 쌓여요.', 12.5, '#9aa6b8', 17, 700);
    rows.slice(0, PHONE ? 6 : 6).forEach((r) => { ry += PHONE ? 21 : 22; T(rx, ry + 6, r.lam + ' nm', 13, '#26324a', 'left', 800); T(rx + rw, ry + 6, r.V.toFixed(2) + ' V', 13, '#1c7a4a', 'right', 800); });
    // 아래 설명
    panel(BOT.x, BOT.y, BOT.w, BOT.h, 14);
    const msg = ek <= 0 ? '파장이 540 nm보다 길면 광자 한 개의 에너지가 일함수보다 작아서 세기를 아무리 키워도 전자가 나오지 않아요.'
      : T_.V < 0.005 ? '역전압이 0일 때는 나온 전자가 모두 양극에 닿아 광전류가 흘러요. 역전압을 올려 전류가 0이 되는 순간을 찾아요.'
        : Inow < ZERO_I ? '운동 에너지가 가장 큰 전자도 양극에 닿지 못해요. 이때의 전압이 정지 전압 V₀이고, eV₀ = E_k,max예요.'
          : '운동 에너지가 작은 전자는 역전압에 막혀 돌아가고, 큰 전자만 양극에 닿아요. 전압을 더 올려요.';
    textBlock(BOT.x + 16, BOT.y + 28, BOT.w - 32, msg, PHONE ? 13.5 : 15, '#26324a', PHONE ? 20 : 22, 800);
    textBlock(BOT.x + 16, BOT.y + (PHONE ? 98 : 84), BOT.w - 32, '(그림의 광자와 전자 수는 실제보다 훨씬 적게 그렸어요. 화면에 보이는 방출은 모두 광자 1개가 전자 1개를 내보낸 거예요.)', 12.5, '#5d6879', 18, 700);
  }

  /* ================= ② 그래프 분석 ================= */
  const grLay = () => PHONE
    ? { a: { x: MA.x, y: MA.y, w: MA.w, h: 300 }, b: { x: MA.x, y: MA.y + 308, w: MA.w, h: MA.h - 308 } }
    : { a: { x: MA.x, y: MA.y, w: 504, h: MA.h }, b: { x: MA.x + 516, y: MA.y, w: 260, h: MA.h } };
  const FMAX = 12, VMIN = -4.8, VMAX = 2.4;
  function grAxes() {
    const A = grLay().a;
    return { x: A.x + (PHONE ? 52 : 62), y: A.y + 44, w: A.w - (PHONE ? 70 : 84), h: A.h - (PHONE ? 100 : 118) };
  }
  const gX = (f) => { const g = grAxes(); return g.x + f / FMAX * g.w; };
  const gY = (v) => { const g = grAxes(); return g.y + (VMAX - v) / (VMAX - VMIN) * g.h; };
  const rowPos = (i) => { const B = grLay().b, rh = PHONE ? 22 : 31; return { x: B.x + 14, y: B.y + (PHONE ? 70 : 84) + i * rh, rh }; };
  function plotPoint(i) {
    const G = S.gr, r = ROW[i];
    if (r.v == null) { showHint('550 nm는 문턱 파장(540 nm)보다 길어서 광전자가 나오지 않아요. V₀가 없으니 점을 찍을 수 없어요.'); return; }
    if (G.pts[i] || G.fly.some((f) => f.i === i)) return;
    const rp = rowPos(i); const B = grLay().b;
    G.fly.push({ i, t: 0, x0: B.x + B.w - 40, y0: rp.y + 6 });
    updateCtl();
  }
  function stepGraph(dt) {
    const G = S.gr;
    for (let i = G.fly.length - 1; i >= 0; i--) {
      const f = G.fly[i]; f.t += dt / (RM ? 0.05 : 0.75);
      if (f.t >= 1) {
        G.fly.splice(i, 1); G.pts[f.i] = true;
        const r = ROW[f.i]; parts.burst(gX(r.f), gY(r.v), { count: 10, colors: ['#f26b3a', '#ffb400'], speed: 90, life: 0.5, gravity: 0, size: 3 });
        Sound.success(); updateCtl();
      }
    }
    const all = G.pts.every((x) => x);
    G.line = SciSim.approach(G.line, all ? 1 : 0, dt, 2.2);
  }
  const grAll = () => S.gr.pts.every((x) => x);
  function drawGraph() {
    const G = S.gr, L = grLay(), A = L.a, B = L.b, ax = grAxes();
    panel(A.x, A.y, A.w, A.h, 14);
    T(A.x + 14, A.y + 24, '📈 진동수와 정지 전압 (나트륨)', PHONE ? 13.5 : 15, '#26324a', 'left', 800);
    const xt = []; for (let f = 0; f <= FMAX; f += 2) xt.push([f, String(f)]);
    const yt = []; for (let v = -4; v <= 2; v += 1) yt.push([v, String(v)]);
    const g = axes(ax.x, ax.y, ax.w, ax.h, { xmin: 0, xmax: FMAX, ymin: VMIN, ymax: VMAX, xt, yt, xl: '진동수 f (×10¹⁴ Hz)', yl: '정지 전압 V₀ (V)', fs: PHONE ? 11.5 : 12, ylx: PHONE ? 36 : 40 });
    // f축 (V₀ = 0)
    ctx.strokeStyle = '#26324a'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(g.x, gY(0)); ctx.lineTo(g.x + g.w, gY(0)); ctx.stroke();
    // 금속별 직선
    const drawLine = (W, col, lw, alpha, dashLow) => {
      const f0 = W / SLOPE14;
      ctx.save(); ctx.beginPath(); ctx.rect(g.x, g.y, g.w, g.h); ctx.clip();
      ctx.globalAlpha = alpha; ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round';
      ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(gX(0), gY(-W)); ctx.lineTo(gX(f0), gY(0)); ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(gX(f0), gY(0)); ctx.lineTo(gX(FMAX), gY(SLOPE14 * FMAX - W)); ctx.stroke();
      ctx.restore();
    };
    if (S.show.metal || (game && game.free)) {
      Object.keys(METALS).forEach((k) => { if (k !== 'Na') drawLine(METALS[k].W, METALS[k].col, G.metal === k ? 3.4 : 1.8, G.metal === k ? 1 : 0.5); });
    }
    // 나트륨 직선 (점 5개를 모두 찍은 뒤 자라나요)
    if (G.line > 0.01) {
      const pts = ROW.filter((r) => r.v != null); const cx = (gX(pts[0].f) + gX(pts[pts.length - 1].f)) / 2;
      ctx.save(); ctx.beginPath(); ctx.rect(g.x, g.y, g.w, g.h); ctx.clip();
      const f0 = W_NA / SLOPE14, fm = (pts[0].f + pts[pts.length - 1].f) / 2, half = (FMAX * 0.62) * G.line;
      const fa = Math.max(0, fm - half), fb = Math.min(FMAX, fm + half);
      ctx.strokeStyle = METALS.Na.col; ctx.lineWidth = (G.metal === 'Na' || !S.show.metal) ? 3.4 : 1.8; ctx.lineCap = 'round';
      const seg = (a, b, dash) => { if (b <= a) return; ctx.setLineDash(dash ? [5, 5] : []); ctx.beginPath(); ctx.moveTo(gX(a), gY(SLOPE14 * a - W_NA)); ctx.lineTo(gX(b), gY(SLOPE14 * b - W_NA)); ctx.stroke(); };
      seg(fa, Math.min(fb, f0), true); seg(Math.max(fa, f0), fb, false); ctx.setLineDash([]);
      ctx.restore();
    }
    // 절편 표시
    if (S.show.icpt || (game && game.free)) {
      if (G.line > 0.9) {
        const f0 = W_NA / SLOPE14;
        D.sphere(gX(f0), gY(0), 6, '#16a05a', { gloss: false }); D.label(gX(f0) - 4, gY(0) + 18, 'f₀ ≈ ' + f0.toFixed(1), { size: PHONE ? 11.5 : 12.5, bg: '#16a05a', align: 'left' });
        D.sphere(gX(0), gY(-W_NA), 6, '#16a05a', { gloss: false }); D.label(gX(0) + 10, gY(-W_NA) + 2, 'V₀ 절편 −' + W_NA.toFixed(1) + ' V', { size: PHONE ? 11.5 : 12.5, bg: '#16a05a', align: 'left' });
      }
    }
    // 측정점
    ROW.forEach((r, i) => { if (G.pts[i] && r.v != null) { D.sphere(gX(r.f), gY(r.v), 6.2, '#f26b3a', { shadow: true }); } });
    // 날아가는 점
    G.fly.forEach((f) => { const r = ROW[f.i], u = SciSim.ease.inOutCubic(Math.min(1, f.t)); const x = f.x0 + (gX(r.f) - f.x0) * u, y = f.y0 + (gY(r.v) - f.y0) * u - Math.sin(u * Math.PI) * 40; D.sphere(x, y, 6.5, '#ffb400', { shadow: true }); });
    // 금속 범례
    if (S.show.metal || (game && game.free)) {
      const lx = g.x + g.w - 8; let ly = g.y + g.h - 52;
      ['Cs', 'Na', 'Zn'].forEach((k, i) => { T(lx, ly + i * 17, '— ' + METALS[k].name + ' W = ' + METALS[k].W.toFixed(1) + ' eV', PHONE ? 11 : 12, METALS[k].col, 'right', 800); });
    }
    if (PHONE) T(A.x + A.w - 14, A.y + A.h - 12, '직선의 기울기 = h/e', 11.5, '#5d6879', 'right', 800);
    // 표
    panel(B.x, B.y, B.w, B.h, 14);
    T(B.x + 14, B.y + 24, '📋 측정 자료 (나트륨)', PHONE ? 13.5 : 14.5, '#26324a', 'left', 800);
    const cx = [B.x + 14, B.x + B.w * 0.36, B.x + B.w * 0.68];
    ['파장 λ', 'f = c/λ', 'V₀'].forEach((h, i) => T(cx[i], B.y + (PHONE ? 52 : 62), h, PHONE ? 12 : 13, '#5d6879', 'left', 800));
    T(B.x + 14, B.y + (PHONE ? 66 : 76), '(f 단위 10¹⁴ Hz, c = 3.0×10⁸ m/s)', PHONE ? 10.5 : 11, '#9aa6b8', 'left', 700);
    ROW.forEach((r, i) => {
      const p = rowPos(i);
      if (G.pts[i]) { ctx.fillStyle = 'rgba(242,107,58,.12)'; D.roundRect(B.x + 6, p.y - 4, B.w - 12, p.rh - 4, 8); ctx.fill(); }
      T(cx[0], p.y + 13, r.lam + ' nm', PHONE ? 12.5 : 14, '#26324a', 'left', 800); T(cx[1], p.y + 13, r.f.toFixed(1), PHONE ? 12.5 : 14, '#26324a', 'left', 800);
      T(cx[2], p.y + 13, r.v == null ? '방출 없음' : r.v.toFixed(2) + ' V', PHONE ? 12 : 13.5, r.v == null ? '#c0353b' : '#26324a', 'left', 800);
    });
    const yb = rowPos(5).y + rowPos(5).rh + 6;
    if (!PHONE) textBlock(B.x + 14, yb + 8, B.w - 28, grAll() ? '점 5개가 한 직선 위에 놓여요! 기울기 = h/e, f축과 만나는 점 f₀에서 W = hf₀예요.' : '아래 칩을 눌러 한 점씩 그래프에 찍어 보세요. 550 nm는 문턱 파장보다 길어요.', PHONE ? 12 : 13, '#26324a', PHONE ? 17 : 18, 800);
    panel(BOT.x, BOT.y, BOT.w, BOT.h, 14);
    const mt = G.metal;
    const bm = (S.show.metal || (game && game.free)) ? '금속이 달라도 직선의 기울기는 같아요(h/e). 일함수 W가 클수록 직선이 오른쪽으로 옮겨 가요: ' + METALS[mt].name + ' W = ' + METALS[mt].W.toFixed(1) + ' eV, f₀ = ' + (METALS[mt].W / SLOPE14).toFixed(1) + '×10¹⁴ Hz.'
      : 'eV₀ = hf − W 이므로 V₀ = (h/e) f − W/e 예요. f–V₀ 그래프는 기울기가 h/e인 직선이에요.';
    textBlock(BOT.x + 16, BOT.y + 28, BOT.w - 32, bm, PHONE ? 13.5 : 15, '#26324a', PHONE ? 20 : 22, 800);
    textBlock(BOT.x + 16, BOT.y + (PHONE ? 98 : 84), BOT.w - 32, '직선의 기울기와 절편에서 플랑크 상수 h와 일함수 W를 구할 수 있어요. (점 사이의 변화량을 이용해요.)', 12.5, '#5d6879', 18, 700);
  }

  /* ================= ③ 광자와 전류 ================= */
  const pnLay = () => PHONE
    ? { a: { x: MA.x, y: MA.y, w: MA.w, h: 300 }, b: { x: MA.x, y: MA.y + 308, w: MA.w, h: MA.h - 308 } }
    : { a: { x: MA.x, y: MA.y, w: 500, h: MA.h }, b: { x: MA.x + 512, y: MA.y, w: 264, h: MA.h } };
  const pnN = () => nPhot(S.pn.lam, S.pn.P);
  const pnI = () => iPhoto(S.pn.lam, S.pn.P);
  const pnPh = [];
  let pnAcc = 0;
  function stepPhoton(dt) {
    if (S.mode !== 'photon') return;
    const P = S.pn, A = pnLay().a;
    const rate = RM ? 2 : 3 + 6 * clamp(pnN() / 4e15, 0, 1);
    pnAcc += rate * dt;
    const lx = A.x + (PHONE ? 54 : 70), ly = A.y + (PHONE ? 70 : 82), py = A.y + (PHONE ? 170 : 236);
    while (pnAcc >= 1) { pnAcc -= 1; if (pnPh.length < 30) pnPh.push({ p: 0, tx: A.x + (PHONE ? 60 : 70) + Math.random() * (PHONE ? 170 : 200) }); }
    for (let i = pnPh.length - 1; i >= 0; i--) {
      const q = pnPh[i]; const L = Math.hypot(q.tx - lx, py - ly); q.p += dt * 300 / L;
      if (q.p >= 1) { pnPh.splice(i, 1); parts.emit({ x: q.tx, y: py - 3, vx: (Math.random() - 0.5) * 30, vy: -20, life: 0.4, size: 2.6, color: lightCol(P.lam), shape: 'circle' }); }
    }
    // 광자 100개 → 전자 1개
    if (P.lam <= LAM0) {
      P.cyc += dt * 28;
      if (P.cyc >= 100) { P.cyc = 0; P.cycDone++; const g = pnGrid(); parts.burst(g.x + g.w / 2, g.y + g.h / 2, { count: 10, colors: ['#2f6bff', '#8ab4ff'], speed: 120, life: 0.7, gravity: 0, size: 3 }); S.pn.eBall = { x: g.x + g.w / 2, y: g.y + g.h / 2, t: 0 }; }
    } else P.cyc = 0;
    if (P.eBall) { P.eBall.t += dt / 0.9; if (P.eBall.t >= 1) P.eBall = null; }
  }
  function pnGrid() {
    const A = pnLay().a; const s = PHONE ? 12 : 15;
    return { x: A.x + A.w - (PHONE ? 148 : 188), y: A.y + (PHONE ? 112 : 180), w: 10 * s, h: 10 * s, s };
  }
  function drawPhoton() {
    const P = S.pn, L = pnLay(), A = L.a, B = L.b, k = PHONE ? 0.8 : 1;
    panel(A.x, A.y, A.w, A.h, 14);
    T(A.x + 14, A.y + 24, '🧮 광원의 출력과 파장 → 광자 수 → 광전류', PHONE ? 13 : 15, '#26324a', 'left', 800);
    const col = lightCol(P.lam), eph = ephOf(P.lam), em = P.lam <= LAM0;
    const lx = A.x + (PHONE ? 54 : 70), ly = A.y + (PHONE ? 70 : 82), py = A.y + (PHONE ? 170 : 236);
    // 빛줄기
    const g = ctx.createLinearGradient(lx, ly, lx, py); g.addColorStop(0, rgbaH(col, 0.5)); g.addColorStop(1, rgbaH(col, 0.15));
    ctx.fillStyle = g; const px0 = A.x + (PHONE ? 52 : 62), px1 = A.x + (PHONE ? 240 : 280);
    ctx.beginPath(); ctx.moveTo(lx - 8, ly + 8); ctx.lineTo(lx + 8, ly + 8); ctx.lineTo(px1, py); ctx.lineTo(px0, py); ctx.closePath(); ctx.fill();
    D.shadow(() => { ctx.fillStyle = '#3d4658'; D.roundRect(lx - 26 * k, ly - 18 * k, 52 * k, 30 * k, 8); ctx.fill(); }, { blur: 6, y: 2 });
    D.glow(lx, ly + 8, 22, col, 0.85); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(lx, ly + 8, 7 * k, 0, TAU); ctx.fill();
    T(lx, ly - 24 * k, P.lam + ' nm · ' + P.P.toFixed(1) + ' mW', PHONE ? 12 : 13.5, '#26324a', 'center', 800);
    // 금속판
    const pg = ctx.createLinearGradient(0, py, 0, py + 22); pg.addColorStop(0, '#f7c56a'); pg.addColorStop(1, '#c98626');
    D.shadow(() => { ctx.fillStyle = pg; D.roundRect(px0 - 8, py, px1 - px0 + 16, 22 * k, 5); ctx.fill(); }, { blur: 6, y: 2 });
    T((px0 + px1) / 2, py + 22 * k + 17, '금속판 (나트륨 W = 2.3 eV)', PHONE ? 11.5 : 13, '#a8620c', 'center', 800);
    pnPh.forEach((q) => photon(lx + (q.tx - lx) * q.p, ly + 8 + (py - ly - 8) * q.p, col, 4 * k));
    // 광자 에너지 표시
    D.label((px0 + px1) / 2, py - 18 * k, 'hf = ' + eph.toFixed(2) + ' eV' + (em ? '' : ' < W'), { size: PHONE ? 12 : 13.5, bg: em ? '#3d4658' : '#c0353b' });
    // 100개 → 1개
    const gr = pnGrid();
    T(gr.x + gr.w / 2, gr.y - 12, '광자 100개 → 전자 1개', PHONE ? 11.5 : 13, '#26324a', 'center', 800);
    for (let i = 0; i < 100; i++) {
      const cx = gr.x + (i % 10) * gr.s + gr.s / 2, cy = gr.y + Math.floor(i / 10) * gr.s + gr.s / 2;
      const lit = em && i < P.cyc;
      ctx.fillStyle = lit ? col : '#e3e8f2'; ctx.beginPath(); ctx.arc(cx, cy, gr.s * 0.32, 0, TAU); ctx.fill();
      if (lit) { ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1; ctx.stroke(); }
    }
    if (!em) T(gr.x + gr.w / 2, gr.y + gr.h / 2 + 4, '전자가 나오지 않아요', PHONE ? 11.5 : 13, '#c0353b', 'center', 800);
    ctx.strokeStyle = '#9aa6b8'; ctx.lineWidth = 2; D.roundRect(gr.x - 4, gr.y - 4, gr.w + 8, gr.h + 8, 8); ctx.stroke();
    if (P.eBall) { const u = SciSim.ease.outCubic(P.eBall.t); electron(P.eBall.x + (PHONE ? 70 : 90) * u, P.eBall.y - 10 * u * (1 - u) * 4, 6 * k); }
    T(gr.x + gr.w / 2, gr.y + gr.h + 22, '전자 ' + P.cycDone + '개 방출', PHONE ? 11.5 : 12.5, '#1f4fcf', 'center', 800);
    // 전류계 (계산을 마친 뒤)
    if (P.solved) { const Ia = pnI(); dial(A.x + (PHONE ? 64 : 84), A.y + A.h - (PHONE ? 52 : 74), 30 * k, Ia / 6, 'μA'); T(A.x + (PHONE ? 64 : 84), A.y + A.h - (PHONE ? 10 : 22), 'I = ' + Ia.toFixed(1) + ' μA', PHONE ? 12.5 : 14, '#26324a', 'center', 800); }
    // 계산 패널
    panel(B.x, B.y, B.w, B.h, 14);
    const qx = B.x + 14, qw = B.w - 28; let yy = B.y + 28;
    T(qx, yy, '계산 순서', PHONE ? 14 : 15, '#26324a', 'left', 800); yy += PHONE ? 24 : 30;
    let si = 0;
    const step = (no, name, formula, val, ok) => {
      const cx0 = PHONE ? qx + (si % 2) * 226 : qx, cy0 = PHONE ? B.y + 54 + Math.floor(si / 2) * 74 : yy; si++;
      D.sphere(cx0 + 10, cy0 - 5, 10, '#f26b3a', { gloss: false, text: String(no) });
      T(cx0 + 28, cy0, name, PHONE ? 12.5 : 13.5, '#26324a', 'left', 800);
      T(cx0 + 28, cy0 + (PHONE ? 16 : 19), formula, PHONE ? 11 : 12, '#5d6879', 'left', 700);
      if (PHONE) T(cx0 + 28, cy0 + 36, val, 13, ok === false ? '#9aa6b8' : '#1c7a4a', 'left', 800);
      else T(cx0 + qw, cy0 + 40, val, 15, ok === false ? '#9aa6b8' : '#1c7a4a', 'right', 800);
      if (!PHONE) yy += 62;
    };
    const Jph = eph * QE;
    step(1, '광자 하나의 에너지', 'hf = 1240 / λ (eV)', eph.toFixed(2) + ' eV = ' + SCI(Jph, 2) + ' J');
    const N = pnN();
    step(2, '초당 광자 수', 'N = P / (hf)', P.solved ? SCI(N, 1) + ' 개/s' : '? (직접 계산해요)', P.solved);
    step(3, '전자로 바뀌는 수 (1 %)', '전자 수 = N × 0.01', P.solved ? (em ? SCI(N * ETA, 1) : '0') + ' 개/s' : '?', P.solved);
    step(4, '광전류', 'I = (전자 수) × e', P.solved ? pnI().toFixed(1) + ' μA' : '?', P.solved);
    if (!em && !PHONE) textBlock(qx, yy - 6, qw, '파장이 540 nm보다 길어서 광자 하나의 에너지가 W보다 작아요. 광자 수가 많아도 전자가 나오지 않아 I = 0이에요.', PHONE ? 12 : 12.5, '#c0353b', 17, 800);
    panel(BOT.x, BOT.y, BOT.w, BOT.h, 14);
    textBlock(BOT.x + 16, BOT.y + 28, BOT.w - 32, em ? '같은 출력이라도 파장이 길수록 광자 하나의 에너지가 작아서 광자가 더 많이 들어와요. 광자 100개 중 1개만 전자를 내보낸다고 하면 광전류가 정해져요.' : '문턱 파장(약 540 nm)보다 긴 빛은 광자 하나로 전자를 떼어 낼 수 없어요. 광전류는 0이에요.', PHONE ? 13.5 : 15, '#26324a', PHONE ? 20 : 22, 800);
    textBlock(BOT.x + 16, BOT.y + (PHONE ? 98 : 84), BOT.w - 32, '(양자 효율 1 %는 예시 값이에요. 광자 한 개는 전자 한 개에만 에너지를 통째로 줘요.)', 12.5, '#5d6879', 18, 700);
  }

  /* ================= ④ 광전 기술 ================= */
  const teLay = () => PHONE
    ? { a: { x: MA.x, y: MA.y, w: MA.w, h: 288 }, b: { x: MA.x, y: MA.y + 296, w: MA.w, h: MA.h - 296 } }
    : { a: { x: MA.x, y: MA.y, w: 420, h: MA.h }, b: { x: MA.x + 432, y: MA.y, w: 344, h: MA.h } };
  const mkRand = (n) => mulberry32(n);
  const gammaV = (v) => Math.pow(clamp(v / 255, 0, 1), 1 / 2.2);
  const grayCss = (v) => { const g = Math.round(255 * gammaV(v)); return 'rgb(' + g + ',' + g + ',' + g + ')'; };
  let noiseSeed = 1, noiseAt = 0, noiseGrid = [];
  function stepTech(dt) {
    const E = S.te;
    if (S.mode === 'tech' && E.sub === 'sensor' && S.t - noiseAt > 0.12) {
      noiseAt = S.t; noiseSeed++; const rnd = mkRand(noiseSeed * 7919);
      noiseGrid = []; for (let i = 0; i < GW * GH; i++) { let u = 0; while (u === 0) u = rnd(); noiseGrid.push(Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * rnd())); }
    }
    if (S.mode === 'tech' && E.sub === 'solar') {
      const ok = E.solLam <= LAMG;
      if (ok) E.seenOn = true; else E.seenOff = true;
      E.solT += dt;
    }
    E.lampOn = E.lux < E.thr;
    if (S.mode === 'tech' && E.sub === 'lamp') { E.seenLamp = true; if (E.lampOn) E.seenLampOn = true; else E.seenLampOff = true; }
  }
  const dTarget = () => digOf(lumAt(TGT.x, TGT.y), S.te.day, S.te.ti);
  function drawTech() {
    if (S.te.sub === 'sensor') drawSensor(); else if (S.te.sub === 'lamp') drawLamp(); else drawSolar();
  }
  function drawSensor() {
    const E = S.te, L = teLay(), A = L.a, B = L.b, k = PHONE ? 0.8 : 1;
    panel(A.x, A.y, A.w, A.h, 14);
    T(A.x + 14, A.y + 24, '📷 이미지 센서가 찍은 영상 (' + (E.day === 'day' ? '밝은 낮' : '어두운 밤') + ')', PHONE ? 13 : 15, '#26324a', 'left', 800);
    const cs = PHONE ? 24 : 31, gx = A.x + (A.w - GW * cs) / 2, gy = A.y + 38;
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
      const Lm = lumAt(x, y), Ne = neOf(Lm, E.day, E.ti), D0 = digOf(Lm, E.day, E.ti);
      const sg = 255 * Math.sqrt(Math.min(Ne, NFULL)) / NFULL;
      const v = clamp(D0 + sg * (noiseGrid[y * GW + x] || 0) * (D0 >= 255 ? 0.4 : 1), 0, 255);
      ctx.fillStyle = grayCss(v); ctx.fillRect(gx + x * cs, gy + y * cs, cs, cs);
    }
    ctx.strokeStyle = '#5d6879'; ctx.lineWidth = 2; ctx.strokeRect(gx, gy, GW * cs, GH * cs);
    const tx = gx + TGT.x * cs, ty = gy + TGT.y * cs;
    ctx.strokeStyle = '#ffb400'; ctx.lineWidth = 3; ctx.strokeRect(tx, ty, cs, cs);
    D.label(tx + cs / 2, ty - 12, '확대한 화소', { size: PHONE ? 11 : 12, bg: '#ffb400', color: '#26324a' });
    let yy = gy + GH * cs + 22;
    T(A.x + 14, yy, '노출 시간 ' + fmtT(TEXP[E.ti]) + ' · ' + (E.day === 'day' ? '밝은 곳' : '어두운 곳'), PHONE ? 12.5 : 14, '#26324a', 'left', 800); yy += PHONE ? 8 : 12;
    // 베이어 배열
    const bx = A.x + A.w - (PHONE ? 62 : 90), by = yy - (PHONE ? 22 : 24);
    ['#ff5a4d', '#2fd66b', '#2fd66b', '#4a7dff'].forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(bx + (i % 2) * 20, by + Math.floor(i / 2) * 20, 18, 18); });
    T(bx - 6, by + 15, 'R G', 11, '#5d6879', 'right', 800); T(bx - 6, by + 35, 'G B', 11, '#5d6879', 'right', 800);
    if (!PHONE) textBlock(A.x + 14, yy + 22, A.w - 118, '화소마다 R·G·B 필터 중 하나를 씌워서 한 가지 색의 빛만 세요 (베이어 배열).', 12.5, '#5d6879', 16, 700);
    else T(A.x + 14, yy + 14, 'R·G·B 필터', 11.5, '#5d6879', 'left', 700);
    // 화소 한 개 확대
    panel(B.x, B.y, B.w, B.h, 14);
    const Lm = lumAt(TGT.x, TGT.y), Ne = neOf(Lm, E.day, E.ti), Dv = dTarget(), Vp = Math.min(1, Ne / NFULL);
    const px = B.x + 14, pw = B.w - 28;
    T(px, B.y + 24, '🔍 화소 한 개가 하는 일', PHONE ? 13.5 : 15, '#26324a', 'left', 800);
    if (PHONE) {
      // 가로 배치
      const y0 = B.y + 62, wx = B.x + 20, ww = 120, wh = 90;
      drawWell(wx, y0, ww, wh, Ne, Lm);
      T(wx + ww / 2, y0 + wh + 16, '전자 ' + Math.round(Math.min(Ne, 1e5)) + '개', 12.5, '#1f4fcf', 'center', 800);
      T(wx + ww / 2, y0 + wh + 32, '잡음 ±' + Math.round(Math.sqrt(Ne)) + '개 (● = 8개)', 11.5, '#c4501b', 'center', 800);
      const vx = B.x + 160;
      T(vx, y0 + 12, '전압 ' + Vp.toFixed(2) + ' V', 13, '#26324a', 'left', 800); barH(vx, y0 + 20, 140, 14, Vp, '#16a05a');
      T(vx, y0 + 62, '디지털 값 ' + Dv, 14, '#26324a', 'left', 900);
      for (let i = 0; i < 8; i++) { const bit = (Dv >> (7 - i)) & 1; ctx.fillStyle = bit ? '#16a05a' : '#e3e8f2'; D.roundRect(vx + i * 19, y0 + 72, 17, 22, 4); ctx.fill(); T(vx + i * 19 + 8.5, y0 + 88, String(bit), 12, bit ? '#fff' : '#9aa6b8', 'center', 800); }
      T(vx, y0 + 112, '8비트 0~255', 11, '#5d6879', 'left', 700);
    } else {
      const wx = px + 8, wy = B.y + 68, ww = 150, wh = 102;
      drawWell(wx, wy, ww, wh, Ne, Lm);
      T(wx + ww + 16, wy + 28, '전자 ' + Math.round(Ne) + '개', 15, '#1f4fcf', 'left', 800);
      T(wx + ww + 16, wy + 50, '잡음 ±√N ≈ ' + Math.round(Math.sqrt(Ne)) + '개', 13, '#c4501b', 'left', 800);
      T(wx + ww + 16, wy + 72, '잡음 비율 ' + (Ne > 0 ? Math.round(100 / Math.sqrt(Math.max(Ne, 1))) : 0) + ' %', 13, '#5d6879', 'left', 700);
      T(wx + ww + 16, wy + 98, '● 1개 = 전자 8개', 11.5, '#5d6879', 'left', 700);
      D.arrow(B.x + B.w / 2, wy + wh + 28, B.x + B.w / 2, wy + wh + 50, { color: '#9aa6b8', width: 3 });
      let y2 = wy + wh + 62;
      T(px, y2, '축전기 전압 (예: 전자 ' + NFULL + '개 = 1.0 V)', 12.5, '#5d6879', 'left', 700); y2 += 8;
      barH(px, y2, pw, 20, Vp, '#16a05a'); T(px + 8, y2 + 15, Vp.toFixed(2) + ' V', 13, Vp > 0.12 ? '#fff' : '#26324a', 'left', 800); y2 += 36;
      D.arrow(B.x + B.w / 2, y2 - 8, B.x + B.w / 2, y2 + 10, { color: '#9aa6b8', width: 3 }); y2 += 30;
      T(px, y2, '아날로그–디지털 변환 (8비트)', 12.5, '#5d6879', 'left', 700); y2 += 10;
      for (let i = 0; i < 8; i++) { const bit = (Dv >> (7 - i)) & 1; ctx.fillStyle = bit ? '#16a05a' : '#e3e8f2'; D.roundRect(px + i * (pw / 8), y2, pw / 8 - 4, 30, 6); ctx.fill(); T(px + i * (pw / 8) + (pw / 8 - 4) / 2, y2 + 21, String(bit), 15, bit ? '#fff' : '#9aa6b8', 'center', 800); }
      y2 += 52; T(px, y2, '디지털 값 = ' + Dv + ' (0~255)', 18, '#26324a', 'left', 900);
    }
    panel(BOT.x, BOT.y, BOT.w, BOT.h, 14);
    const night = E.day === 'night';
    textBlock(BOT.x + 16, BOT.y + 28, BOT.w - 32, night ? '밤에는 들어오는 광자가 적어서 전자가 조금만 쌓여요. 전자 수 N의 흔들림은 √N이라서, N이 작을수록 상대적인 잡음이 커져 영상이 지글거려요.' : '노출 시간 동안 들어온 광자 수에 비례해 전자가 쌓이고, 전압으로 읽어 0~255의 디지털 값으로 바꿔요. 전자가 가득 차면 255에서 포화돼요.', PHONE ? 13.5 : 15, '#26324a', PHONE ? 20 : 22, 800);
    textBlock(BOT.x + 16, BOT.y + (PHONE ? 98 : 84), BOT.w - 32, '(영상의 밝기는 사람의 눈에 맞게 보정해서 그렸어요. 이 화소는 전자 ' + NFULL + '개가 쌓이면 255가 되는 예시예요.)', 12.5, '#5d6879', 18, 700);
  }
  function drawWell(x, y, w, h, Ne, Lm) {
    // 광자가 내리고 전자가 쌓이는 광다이오드 그림 (반복 재생)
    const ph = RM ? 1 : clamp((S.t % 2.4) / 1.6, 0, 1), fill = Math.min(1, Ne / NFULL) * SciSim.ease.outCubic(ph);
    ctx.save(); ctx.fillStyle = '#eef2fa'; D.roundRect(x, y, w, h, 8); ctx.fill(); ctx.strokeStyle = '#5d6879'; ctx.lineWidth = 2.5; ctx.stroke();
    const fh = (h - 8) * fill; ctx.save(); D.roundRect(x + 3, y + 3, w - 6, h - 6, 6); ctx.clip();
    const gg = ctx.createLinearGradient(0, y + h - fh, 0, y + h); gg.addColorStop(0, 'rgba(47,107,255,.35)'); gg.addColorStop(1, 'rgba(47,107,255,.6)'); ctx.fillStyle = gg; ctx.fillRect(x, y + h - 3 - fh, w, fh);
    const nd = Math.min(60, Math.round(Math.min(Ne, NFULL) * SciSim.ease.outCubic(ph) / 8));
    const rr = mulberry32(99);
    for (let i = 0; i < nd; i++) { const ex = x + 8 + rr() * (w - 16), ey = y + h - 8 - rr() * Math.max(2, fh - 8); ctx.fillStyle = '#2f6bff'; ctx.beginPath(); ctx.arc(ex, ey, 3.2, 0, TAU); ctx.fill(); }
    ctx.restore();
    // 색 필터와 광자
    ctx.fillStyle = '#2fd66b'; ctx.globalAlpha = 0.85; ctx.fillRect(x, y - 8, w, 6); ctx.globalAlpha = 1;
    const np = Math.min(8, Math.ceil(Lm * (E_day() === 'day' ? 6 : 1.4)));
    if (!RM) for (let i = 0; i < np; i++) { const u = ((S.t * 0.7 + i / np) % 1), px_ = x + 12 + ((i * 37) % (w - 24)); ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.arc(px_, y - 38 + u * 30, 3.4, 0, TAU); ctx.fill(); }
    T(x + w / 2, y - 14, 'G 필터', 10.5, '#16a05a', 'center', 800);
    ctx.restore();
  }
  const E_day = () => S.te.day;

  function drawLamp() {
    const E = S.te, L = teLay(), A = L.a, B = L.b, k = PHONE ? 0.8 : 1;
    const AW = PHONE ? A.w : A.w + B.w + 12, AH = MA.h;
    panel(A.x, A.y, AW, AH, 14);
    T(A.x + 14, A.y + 24, '💡 광센서로 켜지고 꺼지는 자동 점멸등', PHONE ? 13 : 15, '#26324a', 'left', 800);
    const day = clamp(E.lux / 1000, 0, 1);
    const sx = A.x + 12, sy = A.y + 38, sw = AW - 24, sh = PHONE ? 190 : 168;
    ctx.save(); D.roundRect(sx, sy, sw, sh, 10); ctx.clip();
    const mc = (a, b, t) => 'rgb(' + a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',') + ')';
    const g = ctx.createLinearGradient(0, sy, 0, sy + sh); g.addColorStop(0, mc([12, 18, 48], [96, 170, 245], Math.pow(day, 0.7))); g.addColorStop(1, mc([30, 38, 70], [190, 225, 252], Math.pow(day, 0.7)));
    ctx.fillStyle = g; ctx.fillRect(sx, sy, sw, sh);
    if (day < 0.5) { ctx.fillStyle = 'rgba(255,255,255,' + (0.9 - day * 1.6) + ')'; [[0.1, 0.2], [0.25, 0.1], [0.4, 0.3], [0.55, 0.12], [0.75, 0.25], [0.9, 0.1]].forEach(([a, b]) => { ctx.beginPath(); ctx.arc(sx + sw * a, sy + sh * b, 1.8, 0, TAU); ctx.fill(); }); }
    const sunx = sx + sw * 0.2, suny = sy + sh * (0.75 - 0.5 * day);
    D.glow(sunx, suny, 46, day > 0.3 ? '#ffd34d' : '#dfe8ff', 0.8); D.sphere(sunx, suny, 15, day > 0.3 ? '#ffd34d' : '#e8eefc', {});
    ctx.fillStyle = mc([20, 30, 40], [90, 140, 90], day); ctx.beginPath(); ctx.moveTo(sx, sy + sh); ctx.lineTo(sx, sy + sh * 0.78); ctx.quadraticCurveTo(sx + sw * 0.3, sy + sh * 0.6, sx + sw * 0.55, sy + sh * 0.8); ctx.quadraticCurveTo(sx + sw * 0.8, sy + sh * 0.95, sx + sw, sy + sh * 0.76); ctx.lineTo(sx + sw, sy + sh); ctx.closePath(); ctx.fill();
    // 가로등
    const lx = sx + sw * 0.78, ly = sy + sh * 0.84;
    ctx.fillStyle = '#aab4c6'; ctx.fillRect(lx - 3, ly - 70 * k, 6, 70 * k); D.roundRect(lx - 20 * k, ly - 78 * k, 40 * k, 12 * k, 5); ctx.fill();
    if (E.lampOn) { D.glow(lx, ly - 62 * k, 70 * k, '#ffe27a', 0.95); ctx.fillStyle = '#ffe27a'; ctx.beginPath(); ctx.arc(lx, ly - 64 * k, 8 * k, 0, TAU); ctx.fill(); }
    else { ctx.fillStyle = '#c7ccd6'; ctx.beginPath(); ctx.arc(lx, ly - 64 * k, 8 * k, 0, TAU); ctx.fill(); }
    ctx.restore();
    D.label(lx, sy + sh + 14, E.lampOn ? '점멸등 켜짐' : '점멸등 꺼짐', { size: PHONE ? 12 : 13, bg: E.lampOn ? '#ffb400' : '#7b8798', color: E.lampOn ? '#26324a' : '#fff' });
    // 회로 블록도
    const by = sy + sh + (PHONE ? 38 : 46), bw = (sw - 60) / 3, bh = PHONE ? 62 : 74;
    const Iph = luxI(E.lux), Ith = luxI(E.thr);
    const box = (i, ttl, sub, col) => { const bx = sx + i * (bw + 30); D.shadow(() => { ctx.fillStyle = '#fff'; D.roundRect(bx, by, bw, bh, 10); ctx.fill(); }, { blur: 6, y: 2 }); ctx.strokeStyle = col; ctx.lineWidth = 2.5; D.roundRect(bx, by, bw, bh, 10); ctx.stroke(); T(bx + bw / 2, by + 22, ttl, PHONE ? 12.5 : 14, '#26324a', 'center', 800); T(bx + bw / 2, by + 42, sub, PHONE ? 11.5 : 12.5, col, 'center', 800); return bx; };
    box(0, '광센서 (광다이오드)', '광전류 ' + Iph.toFixed(1) + ' μA', '#2f6bff');
    box(1, '비교 회로', 'I < ' + Ith.toFixed(1) + ' μA ?', '#7a3cff');
    box(2, '점멸등', E.lampOn ? '켜짐' : '꺼짐', E.lampOn ? '#d99a00' : '#7b8798');
    for (let i = 0; i < 2; i++) D.arrow(sx + (i + 1) * bw + i * 30 + 2, by + bh / 2, sx + (i + 1) * (bw + 30) - 2, by + bh / 2, { color: '#9aa6b8', width: 3, head: 9 });
    let yy = by + bh + (PHONE ? 22 : 28);
    T(sx, yy, '광전류 (조도에 비례, 100 lx당 1 μA)', PHONE ? 12 : 13, '#26324a', 'left', 800); yy += 8;
    const bwid = sw; barH(sx, yy, bwid, 18, Iph / 10, '#2f6bff');
    const tx = sx + clamp(Ith / 10, 0, 1) * bwid; ctx.strokeStyle = '#c0353b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(tx, yy - 6); ctx.lineTo(tx, yy + 24); ctx.stroke();
    T(tx, yy + 38, '문턱 ' + E.thr + ' lx', PHONE ? 11.5 : 12.5, '#c0353b', 'center', 800);
    panel(BOT.x, BOT.y, BOT.w, BOT.h, 14);
    textBlock(BOT.x + 16, BOT.y + 28, BOT.w - 32, '광센서는 빛(광자)을 전기 신호(광전류)로 바꿔요. 조도가 문턱보다 낮아지면 점멸등이 저절로 켜지고, 밝아지면 꺼져요.', PHONE ? 13.5 : 15, '#26324a', PHONE ? 20 : 22, 800);
    textBlock(BOT.x + 16, BOT.y + (PHONE ? 98 : 84), BOT.w - 32, '자동문의 적외선 센서, 연기 감지기, 조도계도 같은 원리로 빛을 전기 신호로 바꿔요.', 12.5, '#5d6879', 18, 700);
  }

  function drawSolar() {
    const E = S.te, L = teLay(), A = L.a, B = L.b, k = PHONE ? 0.8 : 1;
    const lam = E.solLam, eph = ephOf(lam), ok = lam <= LAMG, col = lightCol(lam);
    panel(A.x, A.y, A.w, A.h, 14);
    T(A.x + 14, A.y + 24, '☀️ 태양전지의 광자 흡수', PHONE ? 13.5 : 15, '#26324a', 'left', 800);
    // 띠 도식: 아래 가전자대, 위 전도대
    const bx = A.x + 28, bw = A.w - 56, by0 = A.y + 56, bh = PHONE ? 190 : 270;
    const eMax = 4.2, yE = (e) => by0 + bh - (e / eMax) * (bh - 20) - 6;   // e: 전도대 아래쪽을 기준으로 한 에너지 (eV)
    const yV = yE(0), yCb = yE(EG);
    ctx.fillStyle = 'rgba(122,60,255,.18)'; ctx.fillRect(bx, yV, bw, by0 + bh - yV); ctx.fillStyle = 'rgba(47,107,255,.14)'; ctx.fillRect(bx, by0, bw, yCb - by0);
    ctx.strokeStyle = '#7a3cff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(bx, yV); ctx.lineTo(bx + bw, yV); ctx.stroke();
    ctx.strokeStyle = '#2f6bff'; ctx.beginPath(); ctx.moveTo(bx, yCb); ctx.lineTo(bx + bw, yCb); ctx.stroke();
    T(bx + 8, by0 + bh - 12, '가전자대 (전자가 가득)', PHONE ? 11.5 : 12.5, '#5b2db8', 'left', 800); T(bx + 8, by0 + 16, '전도대 (전류를 만드는 전자)', PHONE ? 11.5 : 12.5, '#1f4fcf', 'left', 800);
    // 띠 간격 표시
    const gx = bx + bw - 44; D.arrow(gx, yV - 2, gx, yCb + 2, { color: '#c0353b', width: 2.4, head: 8 }); D.arrow(gx, yCb + 2, gx, yV - 2, { color: '#c0353b', width: 2.4, head: 8 });
    D.label(gx - 8, (yV + yCb) / 2, '띠 간격 1.1 eV', { size: PHONE ? 11.5 : 13, bg: '#c0353b', align: 'right' });
    // 광자 화살표 (입사 광자 에너지 = 화살표 길이)
    const phx = bx + bw * 0.34, top = clamp(yV - (eph / eMax) * (bh - 20), by0 - 4, yV);
    const cyc = RM ? 0.7 : (E.solT % 2.6) / 2.6;
    const pyy = yV - (yV - top) * clamp(cyc / 0.55, 0, 1);
    ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(phx, yV); ctx.lineTo(phx, yV - eph / eMax * (bh - 20)); ctx.stroke(); ctx.setLineDash([]);
    if (eph / eMax * (bh - 20) > bh + 20) { /* 범위를 넘어가요 */ }
    // 움직이는 광자/전자
    if (ok) {
      const u = clamp(cyc / 0.55, 0, 1);
      if (cyc < 0.55) { photon(phx - 40 + 40 * u, yV + 40 - 40 * u - (yV - yCb) * 0, col, 5); }
      const eu = clamp((cyc - 0.35) / 0.4, 0, 1), e2 = SciSim.ease.outCubic(eu);
      if (cyc > 0.3) { electron(phx, yV - (yV - yCb + 14) * e2, 7 * k); ctx.strokeStyle = '#c0353b'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(phx, yV, 7 * k, 0, TAU); ctx.stroke(); T(phx + 14, yV - 3, '양공', 11.5, '#c0353b', 'left', 800); }
      if (cyc > 0.75) { const ru = (cyc - 0.75) / 0.25; electron(phx + (bx + bw * 0.7 - phx) * ru, yCb - 14 - 0, 6 * k); }
    } else {
      const u = (cyc * 1.2) % 1;
      ctx.strokeStyle = rgbaH(col, 0.5); ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.moveTo(phx - 90 * k, yV + 34); ctx.lineTo(phx + 130 * k, yV + 34); ctx.stroke(); ctx.setLineDash([]);
      photon(phx - 90 * k + 220 * k * u, yV + 34, col, 6.5);
    }
    T(phx + 10, Math.max(by0 + 40, clamp(yV - eph / eMax * (bh - 20), by0 - 4, yV) - 8), 'hf = ' + eph.toFixed(2) + ' eV', PHONE ? 12.5 : 14, ok ? '#1c7a4a' : '#c0353b', 'left', 800);
    D.label(bx + bw * 0.34, by0 + bh + 20, ok ? '✅ hf ≥ 1.1 eV: 전자–양공 쌍이 생겨요' : '❌ hf < 1.1 eV: 에너지가 모자라 그냥 통과해요', { size: PHONE ? 11.5 : 13.5, bg: ok ? '#16a05a' : '#c0353b' });
    // 오른쪽 정보
    panel(B.x, B.y, B.w, B.h, 14);
    const px = B.x + 14, pw = B.w - 28; let yy = B.y + 28;
    T(px, yy, '파장 ' + lam + ' nm (' + (lam < 380 ? '자외선' : lam > 780 ? '적외선' : '가시광선') + ')', PHONE ? 14 : 15, '#26324a', 'left', 800); yy += PHONE ? 22 : 28;
    const row = (a, b, c) => { T(px, yy, a, PHONE ? 12.5 : 13, '#5d6879', 'left', 700); T(px + pw, yy, b, PHONE ? 13 : 14, c || '#26324a', 'right', 800); yy += PHONE ? 20 : 24; };
    row('광자 에너지 hf', eph.toFixed(2) + ' eV'); row('규소의 띠 간격', '1.1 eV'); row('흡수할 수 있는 파장', '약 1130 nm 이하'); row('전자–양공 쌍', ok ? '생겨요' : '안 생겨요', ok ? '#1c7a4a' : '#c0353b');
    if (ok) row('남는 에너지 (열)', (eph - EG).toFixed(2) + ' eV'); else row('전기 에너지로', '바뀌지 않아요', '#c0353b');
    yy += 6;
    textBlock(px, yy, pw, '☀️ 1 m² 패널: 1000 W/m² × 1 m² × 20 % = 200 W', PHONE ? 12.5 : 13.5, '#26324a', 18, 800);
    panel(BOT.x, BOT.y, BOT.w, BOT.h, 14);
    textBlock(BOT.x + 16, BOT.y + 28, BOT.w - 32, ok ? '광자 하나가 전자 하나에게 에너지를 주어 가전자대의 전자를 전도대로 올려요. 이 전자와 양공이 p-n 접합의 전기장에 밀려 전류가 돼요.' : '광자 에너지가 띠 간격보다 작으면 전자가 전도대로 올라가지 못해요. 규소 태양전지는 파장이 약 1130 nm보다 긴 적외선으로는 작동하지 않아요.', PHONE ? 13.5 : 15, '#26324a', PHONE ? 20 : 22, 800);
    textBlock(BOT.x + 16, BOT.y + (PHONE ? 98 : 84), BOT.w - 32, '(광자 에너지가 띠 간격보다 커도 광자 하나는 전자 하나에게만 에너지를 줘요. 남는 에너지는 열이 돼요.)', 12.5, '#5d6879', 18, 700);
  }

  /* ---------- 포인터 (그래프 장면: 표의 줄을 누르면 점이 찍혀요) ---------- */
  const rowAt = (p) => { if (S.mode !== 'graph') return -1; const B = grLay().b; for (let i = 0; i < ROW.length; i++) { const r = rowPos(i); if (p.x > B.x + 6 && p.x < B.x + B.w - 6 && p.y > r.y - 4 && p.y < r.y + r.rh - 4) return i; } return -1; };
  SciSim.pointer(view, {
    down(p) { const i = rowAt(p); if (i >= 0) { Sound.click(); plotPoint(i); return true; } return false; },
    hover(p) { return rowAt(p) >= 0 ? 'pointer' : 'default'; },
  });

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  function readouts() {
    let a, b, c, L1, L2, L3;
    if (S.mode === 'tube') {
      const T_ = S.tb;
      L1 = '파장 · 광자 에너지'; a = T_.lam + ' nm · ' + ephOf(T_.lam).toFixed(2) + ' eV';
      L2 = '역전압 → 광전류'; b = T_.V.toFixed(2) + ' V → ' + tbI().toFixed(2) + ' μA';
      L3 = '기록한 정지 전압 V₀'; c = T_.rec.length + '개';
    } else if (S.mode === 'graph') {
      const n = S.gr.pts.filter(Boolean).length;
      L1 = '그래프에 찍은 점'; a = n + ' / 5';
      L2 = '직선의 식'; b = 'V₀ = (h/e)·f − W/e';
      L3 = '금속'; c = (S.show.metal || (game && game.free)) ? METALS[S.gr.metal].name + ' (W = ' + METALS[S.gr.metal].W.toFixed(1) + ' eV)' : '나트륨 (W = 2.3 eV)';
    } else if (S.mode === 'photon') {
      const P = S.pn;
      L1 = '광자 하나의 에너지 hf'; a = ephOf(P.lam).toFixed(2) + ' eV';
      L2 = '초당 광자 수 N'; b = P.solved ? SCI(pnN(), 1) + ' 개/s' : '직접 계산해요';
      L3 = '광전류 I'; c = P.solved ? pnI().toFixed(1) + ' μA' : '?';
    } else if (S.te.sub === 'sensor') {
      const E = S.te, Ne = neOf(lumAt(TGT.x, TGT.y), E.day, E.ti);
      L1 = '노출 시간'; a = fmtT(TEXP[E.ti]);
      L2 = '확대한 화소의 전자 수'; b = Math.round(Ne) + '개';
      L3 = '그 화소의 디지털 값'; c = dTarget() + ' / 255';
    } else if (S.te.sub === 'lamp') {
      const E = S.te;
      L1 = '조도'; a = E.lux + ' lx';
      L2 = '광센서의 광전류'; b = luxI(E.lux).toFixed(1) + ' μA';
      L3 = '점멸등'; c = E.lampOn ? '켜짐' : '꺼짐';
    } else {
      const E = S.te;
      L1 = '파장 · 광자 에너지'; a = E.solLam + ' nm · ' + ephOf(E.solLam).toFixed(2) + ' eV';
      L2 = '규소 태양전지'; b = E.solLam <= LAMG ? '작동해요' : '작동하지 못해요';
      L3 = '1 m² 패널 출력'; c = E.solLam <= LAMG ? '최대 200 W' : '0 W';
    }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }
  function resetTube() { const T_ = S.tb; T_.lam = 400; T_.V = 0; T_.k = 1; T_.rec = []; T_.seenInt = false; T_.kMin = 1; T_.kMax = 1; T_.longHold = 0; T_.seenLong = false; T_.el.length = 0; T_.ph.length = 0; slL.set(400); slR.set(0); slK.set(10); }
  function resetGraph() { const G = S.gr; G.pts = [false, false, false, false, false]; G.fly = []; G.line = 0; G.metal = 'Na'; G.seenMetals = {}; }
  function resetPn() { S.pn.lam = 400; S.pn.P = 1.0; S.pn.solved = false; S.pn.cyc = 0; S.pn.cycDone = 0; S.pn.eBall = null; pnPh.length = 0; slL2.set(400); slP.set(10); inN.value = ''; inN.classList.remove('ok', 'bad'); }
  const numFB = (el, ok) => { if (ok) { el.classList.remove('bad'); el.classList.add('ok'); } else if (!el.classList.contains('bad')) { el.classList.remove('ok'); void el.offsetWidth; el.classList.add('bad'); } };

  /* ================= 미션 ================= */
  const levels = [
    {
      title: '정지 전압: 전자를 막는 전압', short: '정지 전압', icon: '🔦', phase: '실험',
      intro: '<p class="si-q">❓ 탐구 질문: 빛이 센서에 닿으면 어떻게 사진의 밝기 숫자로 바뀔까?</p>' +
        '<div class="si-link">🔗 <b>물리학에서</b> 광전 효과의 실험 사실과 광자 모형(hf = W + E_k)을 배웠어요. 앞 차시의 간섭·회절·편광 같은 <b>파동 모형</b>만으로는 설명할 수 없는 현상이에요. 이번에는 이것을 <b>측정 자료와 그래프</b>로 확인하고 기술로 연결해요.</div>' +
        '<p><b>광전관</b>의 음극(나트륨, 일함수 W = 2.3 eV)에 빛을 비추면 광자 한 개가 전자 한 개에게 에너지를 통째로 줘요(<b>흡수</b>). 전자는 W만큼을 쓰고 남은 만큼이 운동 에너지가 돼요: <b>E_k,max = hf − W</b>. 양극에 <b>역전압</b>을 걸어 가장 빠른 전자까지 막는 전압이 <b>정지 전압 V₀</b>이고, eV₀ = E_k,max예요.</p>',
      features: ['tube'],
      setup() { resetTube(); S.show.rec = true; S.show.int = false; S.show.selA = false; setScene('tube'); },
      recap: '광자 한 개가 전자 한 개에게 에너지를 통째로 주고(흡수), 전자의 최대 운동 에너지는 E_k,max = hf − W예요. 정지 전압 V₀는 eV₀ = E_k,max로 파장이 짧을수록 커요. 세기를 키우면 광전류만 커지고 V₀는 그대로예요.',
      summary: '<ul><li><b>흡수</b>: 광자 1개가 전자 1개에게 에너지를 통째로 줘요. <b>hf = W + E_k,max</b> (W: 일함수).</li><li><b>정지 전압 V₀</b>: 가장 빠른 광전자까지 막는 역전압. <b>eV₀ = E_k,max = hf − W</b>. 나트륨(W = 2.3 eV): 400 nm → 0.80 V, 500 nm → 0.18 V.</li><li>빛의 <b>세기</b>를 키우면 광자 수가 늘어 <b>광전류만 커지고</b> 정지 전압은 변하지 않아요. 약한 빛도 hf ≥ W이면 곧바로 전자가 나와요.</li><li>파장이 문턱 파장(나트륨 약 540 nm)보다 길면 hf < W라서 세기를 아무리 키워도 광전자가 나오지 않아요.</li></ul>',
      missions: [
        {
          title: '파장 세 가지의 정지 전압 재기',
          goal: '파장을 바꿔 가며 <b>역전압을 올려</b> 광전류가 처음 0이 되는 정지 전압 V₀를 찾고, “V₀ 기록”을 눌러 <b>서로 다른 파장 3개</b>를 기록하세요.',
          hint: '파장은 540 nm보다 짧게 해요(예: 400 nm). 역전압을 천천히 올리다가 전류계가 0.00 μA가 되는 가장 작은 전압에서 “V₀ 기록”을 눌러요. 0.01 V 단위로 맞출 수 있어요.',
          setup() { S.tb.rec = []; S.show.rec = true; S.show.int = false; S.show.selA = false; setScene('tube'); },
          check: () => S.tb.rec.length >= 3,
          hold: 0.3,
          status: () => mark(S.tb.rec.length >= 1) + ' 첫 번째 &nbsp; ' + mark(S.tb.rec.length >= 2) + ' 두 번째 &nbsp; ' + mark(S.tb.rec.length >= 3) + ' 세 번째' + (S.tb.rec.length ? ' &nbsp; (' + S.tb.rec.slice().sort((a, b) => a.lam - b.lam).map((r) => r.lam + ' nm: ' + r.V.toFixed(2) + ' V').join(', ') + ')' : ''),
          explain: '광전자의 운동 에너지는 최대 E_k,max = hf − W예요. 역전압 V가 <b>eV = E_k,max</b>가 되면 가장 빠른 전자도 양극에 닿지 못해서 광전류가 0이 돼요. 이때의 V가 정지 전압 V₀예요. 400 nm에서는 3.10 − 2.30 = <b>0.80 V</b>, 500 nm에서는 2.48 − 2.30 = <b>0.18 V</b>예요. 파장이 짧을수록 광자 에너지가 커서 V₀도 커요.',
        },
        {
          title: '세기와 긴 파장의 효과 예측하기', manual: true,
          goal: '광원의 <b>세기</b>를 바꿔 광전류와 정지 전압이 어떻게 달라지는지 살펴보고, 파장을 <b>540 nm보다 길게</b> 해서 광전자가 나오는지 확인한 뒤 문장을 완성하세요.',
          hint: '파장 400 nm에서 세기를 ×1에서 ×3 이상으로 바꿔 보세요. 전류가 0이 되는 전압을 다시 찾으면 어떨까요? 그다음 파장을 580 nm로 하고 세기를 ×2 이상으로 1초 넘게 지켜봐요.',
          setup() { S.show.int = true; S.show.rec = true; S.show.selA = true; SEL_A.reset(); S.tb.seenInt = false; S.tb.kMin = S.tb.k; S.tb.kMax = S.tb.k; S.tb.seenLong = false; S.tb.longHold = 0; setScene('tube'); },
          check() {
            if (!S.tb.seenInt) return '파장을 540 nm보다 짧게 하고 세기를 1.5 이상 바꿔서 광전류가 어떻게 변하는지 보세요.';
            if (!S.tb.seenLong) return '파장을 540 nm보다 길게 하고 세기를 ×2 이상으로 해서 1초 넘게 지켜보세요.';
            return SEL_A.grade();
          },
          status: () => mark(S.tb.seenInt) + ' 세기 바꿔 보기 &nbsp; ' + mark(S.tb.seenLong) + ' 긴 파장 관찰 &nbsp; · 고른 문장 ' + SEL_A.count() + ' / 3',
          explain: '세기를 키우면 광자의 <b>개수</b>가 늘어서 방출되는 전자도 많아지므로 <b>광전류가 커져요</b>. 하지만 광자 하나의 에너지 hf는 파장이 정하므로 전자의 최대 운동 에너지, 곧 <b>정지 전압 V₀는 그대로</b>예요. 문턱 파장(약 540 nm)보다 긴 빛은 광자 하나의 에너지가 W보다 작아서 세기를 아무리 키워도 광전자가 <b>나오지 않아요</b>.',
        },
        {
          type: 'quiz', title: '파동 모형으로는 설명이 안 되는 까닭',
          goal: '파동 모형이라면 빛의 세기를 키울수록 전자가 받는 에너지(운동 에너지)가 커져야 해요. 그런데 실험에서는 정지 전압이 그대로예요. 그 까닭은?',
          setup() { S.show.selA = false; setScene('tube'); },
          choices: ['전자 한 개는 광자 한 개의 에너지 hf만 받는데, 세기를 키우면 광자의 수만 늘고 광자 하나의 에너지는 그대로이기 때문에', '약한 빛도 시간이 지나면 에너지가 쌓여서 결국 전자가 나오기 때문에', '세기를 키우면 빛의 파장이 길어지기 때문에', '세기를 키워도 전자는 항상 같은 개수만 나오기 때문에'],
          answer: 0,
          feedback: ['', '약한 빛이라도 hf ≥ W이면 곧바로 나오고, hf < W이면 오래 비춰도 안 나와요. 에너지가 쌓이는 것이 아니에요.', '세기와 파장은 서로 다른 양이에요. 세기를 키워도 파장은 그대로예요.', '세기를 키우면 광자 수가 늘어서 나오는 전자의 개수(광전류)도 늘어요.'],
          explain: '빛은 에너지 덩어리인 <b>광자</b>로 에너지를 전달해요. 전자 한 개는 광자 한 개의 에너지 hf를 <b>통째로</b> 받고, 세기를 키우면 <b>광자의 수</b>만 늘어요(광전류 증가). 그래서 전자의 최대 운동 에너지 hf − W와 정지 전압은 변하지 않고, 약한 빛이 에너지를 서서히 쌓아 전자를 내보내는 일도 없어요.',
        },
      ],
    },
    {
      title: '그래프 분석: 기울기와 절편', short: '그래프 분석', icon: '📈', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 정지 전압이 eV₀ = hf − W로 정해지고, 세기와 상관없으며, 문턱 파장보다 긴 빛에서는 광전자가 나오지 않는다는 것을 확인했어요. 이제 측정 자료를 <b>f–V₀ 그래프</b>에 옮겨 h와 W를 구해요.</div>' +
        '<p>eV₀ = hf − W를 정리하면 <b>V₀ = (h/e)·f − W/e</b>예요. f를 가로, V₀를 세로로 하면 직선이 되고 <b>기울기 = h/e</b>, f축과 만나는 점은 <b>문턱 진동수 f₀ = W/h</b>, V₀축과 만나는 점은 <b>−W/e</b>예요. 파장은 f = c/λ로 바꿔서 찍어요.</p>',
      features: ['graph'],
      setup() { resetGraph(); S.show.metal = false; S.show.icpt = false; S.show.inH = false; inH.value = ''; inW.value = ''; setScene('graph'); updateCtl(); },
      recap: 'f–V₀ 그래프는 직선이에요. 기울기 = h/e ≈ 4.1×10⁻¹⁵ V·s로 h ≈ 6.6×10⁻³⁴ J·s, f축 절편 f₀ ≈ 5.6×10¹⁴ Hz에서 W = hf₀ ≈ 2.3 eV를 구해요. 금속이 달라도 기울기는 같고 절편만 달라요.',
      summary: '<ul><li><b>V₀ = (h/e)·f − W/e</b>: f–V₀ 그래프는 직선이에요.</li><li><b>기울기 = h/e</b> = (1.83 − 0.80) V / (10.0 − 7.5)×10¹⁴ Hz ≈ 4.1×10⁻¹⁵ V·s → <b>h = e × 기울기 ≈ 6.6×10⁻³⁴ J·s</b>.</li><li><b>f축 절편</b> = 문턱 진동수 f₀ = W/h ≈ 5.6×10¹⁴ Hz → W = hf₀ ≈ <b>2.3 eV</b>. <b>V₀축 절편</b> = −W/e = −2.3 V.</li><li>금속이 달라도 직선의 <b>기울기는 같고</b>(h/e는 상수), 절편만 달라서 직선이 평행해요. 세슘 W ≈ 2.1 eV, 아연 W ≈ 4.3 eV(자외선만), 백금 W ≈ 5.6 eV.</li></ul>',
      missions: [
        {
          title: '측정점 5개 그래프에 찍기',
          goal: '표의 파장 <b>300~500 nm</b> 다섯 개를 하나씩 눌러 (f, V₀) 점으로 그래프에 찍으세요. 점들이 어떤 모양으로 놓이는지 보세요.',
          hint: '아래 “점 찍기” 칩의 파장을 눌러요. 550 nm는 전자가 나오지 않아서(V₀ 없음) 점을 찍을 수 없어요. f = c/λ는 표에 계산해 두었어요.',
          setup() { resetGraph(); S.show.metal = false; S.show.icpt = false; S.show.inH = false; setScene('graph'); updateCtl(); },
          check: () => grAll() && S.gr.line > 0.95,
          hold: 0.4,
          status: () => ROW.slice(0, 5).map((r, i) => mark(S.gr.pts[i]) + r.lam).join(' &nbsp; ') + ' &nbsp; (' + S.gr.pts.filter(Boolean).length + ' / 5)',
          explain: '다섯 점이 <b>한 직선</b> 위에 놓여요. V₀ = (h/e)f − W/e이기 때문이에요. 진동수가 클수록(파장이 짧을수록) 정지 전압이 일정하게 커져요. 직선을 f가 작은 쪽으로 늘려 보면 f축과 만나는 점(문턱 진동수)이 있고, 그보다 작은 진동수에서는 V₀가 음수라서 광전자가 나오지 않아요.',
        },
        {
          title: '플랑크 상수 h와 일함수 W 구하기', manual: true,
          goal: '직선의 <b>기울기</b>로 h를 구하고(h = e × 기울기, e = 1.6×10⁻¹⁹ C), f축과 만나는 점 f₀를 이용한 <b>W (eV)</b>를 써 넣으세요.',
          hint: '두 점 (7.5, 0.80)과 (10.0, 1.83)을 쓰면 기울기 = (1.83 − 0.80) / (2.5×10¹⁴) V·s예요. W는 W = hf₀(eV)이고, 그래프에 표시한 V₀축 절편의 크기와도 같아요.',
          setup() { S.show.inH = true; S.show.icpt = true; inH.value = ''; inW.value = ''; inH.classList.remove('ok', 'bad'); inW.classList.remove('ok', 'bad'); setScene('graph'); updateCtl(); },
          check() {
            if (!grAll()) return '먼저 점 5개를 모두 찍어 직선을 만들어 주세요.';
            const h = parseFloat(inH.value), W = parseFloat(inW.value);
            if (!isFinite(h) || !isFinite(W)) { return 'h와 W를 모두 숫자로 써 주세요.'; }
            const okH = h >= 6.2 && h <= 7.0, okW = W >= 2.1 && W <= 2.5;
            numFB(inH, okH); numFB(inW, okW);
            if (!okH) {
              if (h >= 3.8 && h <= 4.5) return 'h가 아니라 기울기 값(4.1×10⁻¹⁵ V·s)이에요. h = e × 기울기 = 1.6×10⁻¹⁹ × 4.1×10⁻¹⁵ 를 계산해 보세요.';
              return 'h = e × 기울기예요. 기울기 = (1.83 − 0.80) V / (2.5×10¹⁴ Hz)를 먼저 구해 보세요. 답은 ×10⁻³⁴ J·s 단위로 써요.';
            }
            if (!okW) return 'W = hf₀를 eV로 바꿔요. 그래프에 표시된 V₀축 절편(−W/e)의 크기를 읽어도 돼요.';
            return true;
          },
          status: () => mark(grAll()) + ' 직선 완성 &nbsp; · h = ' + (inH.value || '?') + ' ×10⁻³⁴ J·s &nbsp; W = ' + (inW.value || '?') + ' eV',
          explain: '기울기 = (1.83 − 0.80) / (2.5×10¹⁴) ≈ <b>4.1×10⁻¹⁵ V·s</b>이고, h = e × 기울기 = 1.6×10⁻¹⁹ × 4.1×10⁻¹⁵ ≈ <b>6.6×10⁻³⁴ J·s</b>예요. f축 절편 f₀ ≈ 5.6×10¹⁴ Hz에서 W = hf₀ = 6.6×10⁻³⁴ × 5.6×10¹⁴ / 1.6×10⁻¹⁹ ≈ <b>2.3 eV</b>이고, V₀축 절편 −2.3 V의 크기와 같아요.',
        },
        {
          type: 'quiz', title: '금속이 달라도 직선이 평행한 까닭',
          goal: '세슘, 나트륨, 아연의 f–V₀ 직선은 모두 평행해요. 그 까닭은?',
          setup() { S.show.metal = true; S.show.inH = false; setScene('graph'); updateCtl(); },
          choices: ['기울기가 금속과 무관한 상수 h/e이기 때문에 (금속마다 W만 달라서 절편만 달라져요)', '모든 금속의 일함수가 같기 때문에', '금속마다 빛의 속력이 같아서', '기울기가 금속의 일함수 W와 같기 때문에'],
          answer: 0,
          feedback: ['', '일함수는 금속마다 달라요(세슘 2.1, 나트륨 2.3, 아연 4.3 eV). 달라서 직선의 위치(절편)가 달라요.', '기울기와 빛의 속력은 관계가 없어요. f = c/λ는 파장을 진동수로 바꿀 때만 써요.', '일함수 W는 절편을 정해요. 기울기는 W와 무관한 h/e예요.'],
          explain: 'V₀ = (h/e)f − W/e에서 <b>기울기 h/e</b>는 플랑크 상수와 전자의 전하로 정해지는 상수라서 금속과 무관해요. 금속마다 다른 것은 일함수 W뿐이라서 <b>절편(−W/e)과 문턱 진동수 f₀ = W/h</b>만 달라지고, 직선은 평행하게 옮겨 가요.',
        },
      ],
    },
    {
      title: '광자와 전류: 개수를 세어 보기', short: '광자와 전류', icon: '🧮', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> f–V₀ 그래프로 h와 W를 구했어요. 이번에는 빛의 세기가 <b>광자의 개수</b>에 해당한다는 것을 이용해 광전류의 크기를 계산해요.</div>' +
        '<p>광원의 출력이 P일 때 1초에 나오는 광자 수는 <b>N = P / (hf)</b>예요. 출력이 같아도 파장이 길면 광자 하나의 에너지 hf가 작아서 광자 수가 더 많아요. 광자 100개 중 1개가 전자 1개를 내보낸다면(양자 효율 1 %) 전자 수 = N × 0.01이고, <b>광전류 I = (전자 수) × e</b>예요.</p>',
      features: ['photon'],
      setup() { resetPn(); S.show.inN = true; setScene('photon'); updateCtl(); },
      recap: '초당 광자 수는 N = P/(hf)예요. 400 nm, 1.0 mW이면 N ≈ 2.0×10¹⁵ 개/s이고, 양자 효율 1 %일 때 광전류는 약 3.2 μA예요. 같은 출력에서는 파장이 길수록 광자가 많지만, 문턱 파장보다 길면 광전류는 0이에요.',
      summary: '<ul><li>광자 하나의 에너지 <b>hf = 1240/λ (eV)</b>. 400 nm → 3.10 eV = 4.96×10⁻¹⁹ J.</li><li>초당 광자 수 <b>N = P/(hf)</b>: 1.0 mW, 400 nm → 1.0×10⁻³ / 4.96×10⁻¹⁹ ≈ <b>2.0×10¹⁵ 개/s</b>.</li><li>양자 효율 1 %: 전자 수 = N × 0.01 = 2.0×10¹³ 개/s → <b>I = 2.0×10¹³ × 1.6×10⁻¹⁹ ≈ 3.2 μA</b>.</li><li>같은 출력에서 파장이 길수록 hf가 작아 광자 수가 늘어요. 하지만 문턱 파장(540 nm)보다 길면 전자가 나오지 않아 I = 0이에요.</li></ul>',
      missions: [
        {
          title: '초당 광자 수 계산하기', manual: true,
          goal: '<b>400 nm, 1.0 mW</b> 빛이 1초에 보내는 광자 수 N = P/(hf)를 계산해 <b>×10¹⁵ 개/s</b> 단위로 쓰세요. (hf = 3.10 eV, 1 eV = 1.6×10⁻¹⁹ J)',
          hint: 'hf = 3.10 × 1.6×10⁻¹⁹ J = 4.96×10⁻¹⁹ J이에요. P = 1.0 mW = 1.0×10⁻³ W를 hf로 나누어요.',
          setup() { S.pn.solved = false; S.pn.lam = 400; S.pn.P = 1.0; slL2.set(400); slP.set(10); inN.value = ''; inN.classList.remove('ok', 'bad'); S.show.inN = true; setScene('photon'); updateCtl(); },
          check() {
            if (S.pn.lam !== 400 || Math.abs(S.pn.P - 1.0) > 0.001) return '파장을 400 nm, 출력을 1.0 mW로 맞춘 뒤 계산해 주세요.';
            const v = parseFloat(inN.value);
            if (!isFinite(v)) return '숫자로 써 주세요. (예: 1.5)';
            const ans = pnN() / 1e15, ok = Math.abs(v - ans) <= ans * 0.05;
            numFB(inN, ok);
            if (!ok) { if (v > 1e5 || v < 1e-3) return '단위를 확인하세요. ×10¹⁵ 개/s의 앞부분 숫자만 쓰면 돼요. (예: 4.5×10¹⁵ → 4.5)'; return 'N = P/(hf)예요. hf = 4.96×10⁻¹⁹ J, P = 1.0×10⁻³ W를 다시 계산해 보세요.'; }
            S.pn.solved = true; return true;
          },
          status: () => '400 nm · 1.0 mW · hf = ' + ephOf(400).toFixed(2) + ' eV &nbsp; N = ' + (inN.value || '?') + ' ×10¹⁵ 개/s',
          explain: 'hf = 3.10 eV = 3.10 × 1.6×10⁻¹⁹ J = <b>4.96×10⁻¹⁹ J</b>이므로 N = P/(hf) = 1.0×10⁻³ / 4.96×10⁻¹⁹ ≈ <b>2.0×10¹⁵ 개/s</b>예요. 아주 약해 보이는 1 mW 빛에도 1초에 광자가 천조 개 넘게 들어 있어요.',
        },
        {
          title: '광전류 3.2 μA 만들기',
          goal: '파장과 출력 슬라이더를 조절해서 <b>광전류가 3.2 μA</b>가 되도록 해 보세요. (양자 효율 1 %)',
          hint: '400 nm에서 출력 1.0 mW이면 3.2 μA예요. 다른 조합도 있어요. 파장이 길면 광자 수가 늘지만 540 nm를 넘으면 광전류가 0이에요.',
          setup() { S.show.inN = false; S.pn.lam = 450; S.pn.P = 1.0; slL2.set(450); slP.set(10); setScene('photon'); updateCtl(); },   // 앞 미션의 400 nm · 1.0 mW(= 3.2 μA)에서 시작하면 이미 성공이라 다른 값으로 시작해요
          check: () => S.pn.solved && pnI().toFixed(1) === '3.2',
          hold: 0.8,
          status: () => mark(pnI().toFixed(1) === '3.2') + ' 광전류 ' + pnI().toFixed(1) + ' μA / 목표 3.2 μA (' + S.pn.lam + ' nm, ' + S.pn.P.toFixed(1) + ' mW)',
          explain: 'I = N × 0.01 × e = (P/(hf)) × 0.01 × e예요. 400 nm에서는 1.0 mW → <b>3.2 μA</b>예요. 출력을 2배로 하면 광자 수와 광전류도 2배가 되고, 파장이 길어지면 hf가 작아 같은 출력에 광자가 더 많이 필요해서 전류가 늘어요(문턱 파장 540 nm 이하에서만).',
        },
        {
          type: 'quiz', title: '같은 1 mW인데 광자 수가 다른 까닭',
          goal: '출력이 같은 1 mW일 때 500 nm 빛이 400 nm 빛보다 초당 광자 수가 더 많아요. 그 까닭은?',
          setup() { S.show.inN = false; setScene('photon'); },
          choices: ['500 nm 광자는 에너지가 더 작아서, 같은 에너지를 내려면 광자가 더 많이 필요하기 때문에', '500 nm 빛이 더 세기 때문에', '파장이 길수록 광자 하나의 에너지가 더 크기 때문에', '출력이 같으면 광자 수도 반드시 같기 때문에'],
          answer: 0,
          feedback: ['', '출력(1초에 나르는 에너지)이 같으니 어느 쪽이 더 센 것은 아니에요.', '반대예요. E = hf = hc/λ라서 파장이 길수록 광자 하나의 에너지는 작아요.', '출력은 (광자 수) × (광자 하나의 에너지)예요. 광자 에너지가 다르면 광자 수가 달라요.'],
          explain: '출력 P = N × hf예요. 500 nm 광자의 에너지(2.48 eV)가 400 nm 광자(3.10 eV)보다 작으므로, 같은 P에서 N = P/(hf)는 500 nm 쪽이 더 커요. 그래서 광전류도 (문턱 파장보다 짧은 범위에서는) 500 nm 쪽이 더 커요.',
        },
      ],
    },
    {
      title: '광전 기술: 빛을 전기 신호로', short: '광전 기술', icon: '📷', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 광자 하나가 전자 하나에게 에너지를 주는 <b>흡수</b>와, 광자 수가 전류를 정한다는 것을 알았어요. 같은 원리가 디지털 카메라, 광센서, 태양전지에 쓰여요.</div>' +
        '<p><b>이미지 센서</b>의 화소는 노출 시간 동안 들어온 광자 수에 비례해 전자를 모으고, 그 전압을 8비트(0~255)의 디지털 값으로 바꿔요. <b>광센서</b>는 광전류의 크기로 밝기를 알아내고, <b>태양전지</b>는 반도체 속에서 광자 하나가 전자–양공 쌍을 만들어 전류를 내요.</p>',
      features: ['tech'],
      setup() { S.te.sub = 'sensor'; S.te.day = 'day'; S.te.ti = 2; slT.set(2); S.te.lux = 600; S.te.thr = 200; slX.set(600); slH.set(200); S.te.solLam = 700; slS.set(700); S.te.seenLamp = S.te.seenLampOn = S.te.seenLampOff = S.te.seenOn = S.te.seenOff = false; S.show.selB = false; setScene('tech'); },
      recap: '이미지 센서는 광자 수에 비례하는 전자를 모아 0~255의 디지털 값으로 바꾸고, 어두운 장면에서는 전자 수가 적어 잡음 비율이 커져요. 광센서는 광전류로 밝기를 읽고, 태양전지는 띠 간격(1.1 eV)보다 큰 에너지의 광자만 흡수해 전기를 만들어요.',
      summary: '<ul><li><b>이미지 센서</b>: 화소 = 광다이오드 + 축전기. 노출 시간 동안 광자 수에 비례해 전자가 쌓임 → 전압으로 읽음 → 8비트 디지털 값(0~255). R/G/B 필터(베이어 배열)로 색을 구분해요.</li><li>어두운 장면은 전자 수 N이 작아서 잡음(약 √N)의 비율이 커져요. 센서가 크거나 노출 시간이 길면 광자가 많이 들어와 잡음이 줄어요.</li><li><b>광센서</b>: 조도에 비례하는 광전류로 밝기를 읽어요. 자동 점멸등은 어두워져 광전류가 문턱보다 작아지면 켜져요. 자동문, 연기 감지기도 광센서예요.</li><li><b>태양전지</b>: 규소의 띠 간격 1.1 eV 이상의 광자(파장 ≈ 1130 nm 이하)가 전자–양공 쌍을 만들어요. 1 m², 1000 W/m², 효율 20 % → 200 W.</li></ul>',
      missions: [
        {
          title: '화소 밝기 값 128 만들기',
          goal: '낮 장면에서 <b>노출 시간</b>을 조절해 노란 테두리 화소(달의 한가운데)의 디지털 값을 <b>128 (±5)</b>로 맞춰 보세요.',
          hint: '이 화소는 전자 400개가 쌓이면 255가 돼요. 낮에는 1 ms마다 전자가 100개씩 쌓이니, 128이 되려면 전자가 약 200개 쌓여야 해요.',
          setup() { S.te.sub = 'sensor'; S.te.day = 'day'; S.te.ti = 2; slT.set(2); S.show.selB = false; setScene('tech'); },
          check: () => S.te.sub === 'sensor' && S.te.day === 'day' && Math.abs(dTarget() - 128) <= 5,
          hold: 0.8,
          status: () => mark(S.te.sub === 'sensor' && S.te.day === 'day' && Math.abs(dTarget() - 128) <= 5) + ' 디지털 값 ' + dTarget() + ' / 목표 128 (±5) · 노출 ' + fmtT(TEXP[S.te.ti]),
          explain: '쌓이는 전자 수는 광자 수에 비례하고, 광자 수는 노출 시간에 비례해요. 낮에는 이 화소에 1 ms마다 전자가 100개씩 쌓이니 <b>2 ms</b>면 200개, 전자 400개일 때 255이므로 약 <b>128</b>이에요. 4 ms 이상이면 가득 차서 255로 포화돼요.',
        },
        {
          title: '광전 기술 문장 완성하기', manual: true,
          goal: '<b>광센서</b> 장면에서 점멸등이 켜지고 꺼지는 것을, <b>태양전지</b> 장면에서 작동하는 파장과 못 하는 파장을 모두 본 뒤 문장을 완성하세요.',
          hint: '“광센서”에서 조도 슬라이더를 문턱보다 낮췄다가 높여 보세요. “태양전지”에서 파장을 1130 nm보다 짧게, 길게 바꿔 봐요. 이미지 센서의 흐름은 앞 장면의 오른쪽 그림을 보세요.',
          setup() { S.show.selB = true; SEL_B.reset(); S.te.seenLamp = S.te.seenLampOn = S.te.seenLampOff = S.te.seenOn = S.te.seenOff = false; setScene('tech'); },
          check() {
            if (!S.te.seenLampOn || !S.te.seenLampOff) return '“💡 광센서” 장면에서 조도를 바꿔 점멸등이 켜질 때와 꺼질 때를 모두 확인하세요.';
            if (!S.te.seenOn || !S.te.seenOff) return '“☀️ 태양전지” 장면에서 파장을 바꿔 작동하는 경우와 작동하지 못하는 경우를 모두 확인하세요.';
            return SEL_B.grade();
          },
          status: () => mark(S.te.seenLampOn && S.te.seenLampOff) + ' 광센서 &nbsp; ' + mark(S.te.seenOn && S.te.seenOff) + ' 태양전지 &nbsp; · 고른 문장 ' + SEL_B.count() + ' / 4',
          explain: '<b>700 nm</b>(1.77 eV)는 띠 간격 1.1 eV보다 커서 규소 태양전지가 작동해요. <b>2000 nm</b>(0.62 eV)는 1.1 eV보다 작아서 전자–양공 쌍을 만들지 못해요. 자동 점멸등은 어두워지면 광전류가 줄고, 문턱보다 작아지면 램프가 켜져요. 이미지 센서는 <b>광자 → 전자 → 전압 → 디지털 값</b> 순서로 바꿔요.',
        },
        {
          type: 'quiz', title: '밤 사진에 잡음이 많은 까닭',
          goal: '어두운 곳에서 찍은 사진에는 지글거리는 잡음이 많아요. 이미지 센서의 원리로 볼 때 그 까닭은?',
          setup() { S.show.selB = false; S.te.sub = 'sensor'; S.te.day = 'night'; S.te.ti = 13; slT.set(13); setScene('tech'); },
          choices: ['어두우면 들어오는 광자가 적어서 쌓이는 전자 수가 작고, 전자 수의 흔들림(√N)이 차지하는 비율이 커지기 때문에', '어두우면 센서가 전자를 더 많이 만들어서 넘치기 때문에', '어두운 빛은 파장이 길어서 전자를 더 세게 때리기 때문에', '어두우면 센서의 화소가 저절로 줄어들기 때문에'],
          answer: 0,
          feedback: ['', '어두우면 전자가 오히려 적게 쌓여요. 넘치는 것은 아주 밝은 곳에서 일어나요.', '어두운 것은 광자 수가 적다는 뜻이지, 파장이 길다는 뜻이 아니에요.', '화소 수는 변하지 않아요. 화소마다 쌓이는 전자 수가 작아지는 것이 문제예요.'],
          explain: '쌓이는 전자 수 N은 광자 수에 비례하고, N의 흔들림은 대략 √N이에요. 상대적인 잡음 √N/N = 1/√N이므로 어두운 곳(N이 작음)일수록 잡음 비율이 커요. 노출 시간을 늘리거나 센서가 커서 광자를 많이 모으면 잡음이 줄어요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hq-photoelectric', mount: '#game', badge: '광전효과 탐험가', homeHref: '../../index.html#hq',
    featureLabels: { tube: '🔦 광전관 · 역전압 · 전류계', graph: '📈 f–V₀ 그래프 · 표', photon: '🧮 광자 수 · 광전류 계산', tech: '📷 이미지 센서 · 광센서 · 태양전지' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  setScene('tube');
  updateCtl();
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    view.apply();
    stepTube(dt); stepGraph(dt); stepPhoton(dt); stepTech(dt);
    ctx.clearRect(0, 0, VW, VH);
    if (S.mode === 'tube') drawTube(); else if (S.mode === 'graph') drawGraph(); else if (S.mode === 'photon') drawPhoton(); else drawTech();
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, MA, BOT, SEL_A, SEL_B, ROW, METALS, slL, slR, slK, slL2, slP, slT, slX, slH, slS, setScene, updateCtl, tbI, currentAt, ekOf, ephOf, isatOf, iPhoto, nPhot, dTarget, digOf, neOf, lumAt, plotPoint, recordV0, teSeg, daySeg, metalSeg, gX, gY, grAxes, pnN, pnI, LAM0,
    perfPrep(m, sub) { if (m === 'tech' && sub) { S.te.sub = sub; updateCtl(); } },
    setSub(sub) { S.te.sub = sub; updateCtl(); },
    get game() { return game; },
  };

})();
