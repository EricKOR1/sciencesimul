/* =========================================================
   전자기와 양자 Ⅲ. 양자와 미시세계 - 중첩과 측정 (단원 2차시)
   성취기준 [12전자03-02] 중첩과 측정을 통한 확률적 상태 변화를 이해하고, 이를 이용한 양자컴퓨터, 양자암호 통신 등의 양자 기술이
   일상생활과 미래 사회에 미칠 영향을 인식할 수 있다. (이 차시: 중첩 · 측정 · 측정 후 상태 변화, 사회 영향은 다음 차시)
   ① 모형: 비트와 큐비트 (평면의 화살표 θ, P0 = cos²θ, P1 = sin²θ, 중첩은 측정 전에 정해지지 않은 상태)
   ② 실험: 측정 (한 번의 결과는 예측 불가, 횟수가 많으면 비율이 확률에 가까워짐)
   ③ 탐구: 다시 측정 (같은 기준이면 같은 결과, 대각선 기준으로 바꾸면 다시 확률적)
   ④ 적용: 큐비트 여러 개 (2ⁿ가지 값의 중첩, 측정하면 한 값만)
   복소수 진폭, 블로흐 구, 얽힘의 수학, 양자 게이트 행렬, 오류 정정은 다루지 않아요.
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
  const MA = PHONE ? { x: 8, y: 8, w: 464, h: 520 } : { x: 12, y: 12, w: 776, h: 414 };
  const BOT = PHONE ? { x: 8, y: 536, w: 464, h: 136 } : { x: 12, y: 436, w: 776, h: 112 };
  const PL = PHONE ? { x: 8, y: 8, w: 464, h: 116 } : { x: 12, y: 12, w: 230, h: 414 };
  const PM = PHONE ? { x: 8, y: 132, w: 464, h: 262 } : { x: 250, y: 12, w: 334, h: 414 };
  const PR = PHONE ? { x: 8, y: 402, w: 464, h: 126 } : { x: 592, y: 12, w: 196, h: 414 };
  const PG = PHONE ? { x: 8, y: 8, w: 464, h: 232 } : { x: 12, y: 12, w: 396, h: 414 };     // 큐비트 여러 개: 격자 칸
  const PB = PHONE ? { x: 8, y: 248, w: 464, h: 280 } : { x: 416, y: 12, w: 372, h: 414 };  // 큐비트 여러 개: 3큐비트 막대 칸
  const C0 = '#3867f4', C1 = '#f26b3a', CP = '#14a058', CM = '#8b5cf6', INK = '#26324a', MUTE = '#5d6879';

  /* ---------- 모형: 모든 숫자가 같은 식에서 나와요 ---------- */
  const cos2 = (deg) => { const c = Math.cos(deg * rad); return c * c; };
  const sin2 = (deg) => { const s = Math.sin(deg * rad); return s * s; };
  const p0Of = (deg) => (deg === 0 ? 1 : deg === 90 ? 0 : cos2(deg));        // 0이 나올 확률
  const pPlusOf = (deg) => cos2(deg - 45);                                  // 대각선 기준에서 + 가 나올 확률
  const f2 = (p) => p.toFixed(2);
  const pc = (p) => (p * 100).toFixed(0) + ' %';
  const pw2 = (n) => Math.pow(2, n);
  const nValTxt = (n) => (n <= 10 ? pw2(n).toLocaleString('ko-KR') : '약 ' + sci(pw2(n), 1));
  const prob3 = (deg) => { const c = cos2(deg), s = sin2(deg); const out = []; for (let k = 0; k < 8; k++) { const w = ((k >> 2) & 1) + ((k >> 1) & 1) + (k & 1); out.push(Math.pow(c, 3 - w) * Math.pow(s, w)); } return out; };
  const bin3 = (k) => ((k >> 2) & 1) + '' + ((k >> 1) & 1) + (k & 1);
  const niceMax = (x) => { const e = Math.pow(10, Math.floor(Math.log10(Math.max(1, x)))); const m = x / e; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * e; };

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'bit', t: 0, fade: 0,
    th: 0, bit: 0, peek: false,
    show: { selA: false, selB: false, selC: false, numIn: false },
    ms: { N: 0, c0: 0, c1: 0, log: [], pred: null, tries: 0, hits: 0, q: 0, fast: false, rate: 0, acc: 0, anim: null, hShown: 10, last: null },
    st: { ang: 30, log: [], zRun: 0, zRes: [], armed: false, erased: false, anim: null, nX: 0 },
    mu: { n: 3, th: 45, shown: 8, meas: 0, res: null, t: 9, seen: {} },
    mx: { n30: 0 },
    seen: { th: {}, n: {} },
  };
  const aSp = new SciSim.Spring(0, { stiffness: 190, damping: 17 });
  const bSp = [new SciSim.Spring(1, { stiffness: 150, damping: 18 }), new SciSim.Spring(0, { stiffness: 150, damping: 18 })];
  const zSp = [0, 1, 2, 3].map(() => new SciSim.Spring(0, { stiffness: 150, damping: 18 }));
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const MODE_LABEL = { bit: '🪙 비트와 큐비트', measure: '📏 측정', again: '🔁 다시 측정', multi: '🧮 큐비트 여러 개' };

  function setScene(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); if (S.mode === 'measure') { const M = S.ms; M.q = 0; M.fast = false; M.acc = 0; M.anim = null; M.pred = null; M.predRes = null; predSeg.set(''); } if (S.mode === 'again') S.st.anim = null; }
    S.mode = mode;
    $('#tbLabel').textContent = MODE_LABEL[mode];
    if (mode === 'bit' || mode === 'measure') aSp.target = S.th; else if (mode === 'again') aSp.target = S.st.ang;
    updateCtl();
  }
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      const dm = n.getAttribute('data-match');
      if (on && dm) on = !!S.show[dm] || (!!game && game.free);
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    bitSeg.set(S.bit); predSeg.set(S.ms.pred == null ? '' : S.ms.pred);
    $$('#preChips button').forEach((b) => b.classList.toggle('on', +b.dataset.t === S.th));
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));

  /* ---------- 컨트롤 ---------- */
  function setTheta(v, fromUI) {
    v = clamp(Math.round(v), 0, 90);
    if (v !== S.th) {
      S.th = v; S.seen.th[v] = true;
      if (S.mode === 'measure') clearStats();
    }
    slT.set(v); aSp.target = S.th; updateCtl();
  }
  const slT = bindSlider('sT', (v) => v + '°', (v) => { setTheta(+v); });
  const slN = bindSlider('sN', (v) => v + '', (v) => { S.mu.n = +v; S.seen.n[v] = true; });
  const slU = bindSlider('sU', (v) => v + '°', (v) => { S.mu.th = +v; });
  const bitSeg = bindSeg('bitSeg', (v) => { S.bit = +v; updateCtl(); });
  const predSeg = bindSeg('predSeg', (v) => { S.ms.pred = +v; updateCtl(); });
  $$('#preChips button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setTheta(+b.dataset.t); }));

  const SEL_A = mkSelRows('selA', [
    { q: 'θ = 0°인 큐비트를 측정하면', opts: ['항상 0이 나와요 (P₀ = 1)', '0과 1이 반반 나와요', '항상 1이 나와요'], ans: 0 },
    { q: 'θ = 45°인 큐비트를 측정하면', opts: ['항상 0이 나와요', '0과 1이 나올 확률이 각각 0.50이에요', '항상 1이 나와요'], ans: 1 },
    { q: 'θ = 90°인 큐비트를 측정하면', opts: ['항상 0이 나와요', '0과 1이 반반 나와요', '항상 1이 나와요 (P₁ = 1)'], ans: 2 },
    { q: '0과 1의 중첩 상태(0° < θ < 90°)에서는', opts: ['0 또는 1 중 하나로 이미 정해져 있어요', '측정하기 전에는 0도 1도 정해지지 않았어요'], ans: 1 },
  ]);
  const SEL_B = mkSelRows('selB', [
    { q: 'θ = 30°에서 한 번의 측정 결과는', opts: ['미리 정확히 알 수 있어요', '미리 알 수 없고 확률만 알 수 있어요'], ans: 1 },
    { q: '그래도 “항상 0이라고 예측”하면 맞힐 확률은', opts: ['50 %', '75 %', '100 %'], ans: 1 },
    { q: '측정 횟수가 많아질수록 0이 나온 비율은', opts: ['예상 확률(0.75)에 가까워져요', '점점 50 %에 가까워져요', '계속 제멋대로 변해요'], ans: 0 },
  ]);
  const SEL_C = mkSelRows('selC', [
    { q: '0 상태(θ = 0°)를 대각선 기준으로 측정하면 +와 −가 나올 확률은', opts: ['각각 50 %예요', '+만 나와요 (100 %)', '−만 나와요 (100 %)'], ans: 0 },
    { q: '그 뒤 원래 기준(0/1 기준)으로 다시 측정하면', opts: ['항상 0이 나와요', '0과 1이 50 %씩 나와요', '항상 1이 나와요'], ans: 1 },
    { q: '처음에 “0이 확실했다”는 정보는', opts: ['그대로 남아 있어요', '대각선 측정 때문에 지워졌어요'], ans: 1 },
  ]);

  /* ---------- 측정 (1~3단계) ---------- */
  function clearStats() { const M = S.ms; M.N = 0; M.c0 = 0; M.c1 = 0; M.log = []; M.q = 0; M.fast = false; M.acc = 0; M.anim = null; M.last = null; aSp.target = S.th; }
  function doMeasure(animate) {
    const M = S.ms, res = Math.random() < p0Of(S.th) ? 0 : 1;
    M.N++; if (res === 0) M.c0++; else M.c1++;
    M.log.push(res); if (M.log.length > 80) M.log.shift();
    M.last = res;
    if (S.th === 30) S.mx.n30 = Math.max(S.mx.n30, M.N);
    if (M.pred != null) {
      if (S.th === 30) { M.tries++; if (res === M.pred) M.hits++; }
      M.predRes = { pred: M.pred, res, t: 0 };
      M.pred = null; predSeg.set('');
    }
    if (animate) {
      M.anim = { t: 0, dur: M.q > 0 ? 0.36 : 0.85, res };
      aSp.target = res === 0 ? 0 : 90;
      const tip = planeTip(res === 0 ? 0 : 90, 1);
      parts.burst(tip.x, tip.y, { count: 10, colors: [res === 0 ? C0 : C1, '#ffd166'], speed: 110, life: 0.5, size: 3, gravity: 0 });
    }
    return res;
  }
  function stepMeasure(dt) {
    const M = S.ms;
    if (M.anim) { M.anim.t += dt; if (M.anim.t >= M.anim.dur) { M.anim = null; aSp.target = S.th; } }
    if (M.predRes) { M.predRes.t += dt; if (M.predRes.t > 3.5) M.predRes = null; }
    if (M.q > 0) {
      if (M.fast) {
        M.acc += M.rate * dt; const k = Math.min(Math.floor(M.acc), M.q); M.acc -= Math.floor(M.acc);
        for (let i = 0; i < k; i++) doMeasure(false);
        M.q -= k; if (M.q <= 0) { M.q = 0; M.fast = false; M.acc = 0; }
      } else if (!M.anim) { M.q--; doMeasure(true); }
    }
    M.hShown = RM ? M.hTarget || 10 : SciSim.approach(M.hShown, M.hTarget || 10, dt, 6);
  }
  function addMeasure(n) {
    const M = S.ms;
    if (n <= 10) { M.q += n; }
    else { M.q += n; M.fast = true; M.rate = Math.max(M.rate || 0, n / 1.6); }
  }
  $('#bM1').addEventListener('click', () => { Sound.click(); addMeasure(1); });
  $('#bM10').addEventListener('click', () => { Sound.click(); addMeasure(10); });
  $('#bM100').addEventListener('click', () => { Sound.click(); addMeasure(100); });
  $('#bM1000').addEventListener('click', () => { Sound.click(); addMeasure(1000); });
  $('#bMClear').addEventListener('click', () => { Sound.click(); clearStats(); });

  /* ---------- 다시 측정 (3단계): 측정하면 상태가 바뀌어요 ---------- */
  function stMeasure(basis) {
    const T3 = S.st; if (T3.anim) return;
    const before = T3.ang; let res, tgt, txt;
    if (basis === 'Z') {
      res = Math.random() < p0Of(T3.ang) ? 0 : 1; tgt = res === 0 ? 0 : 90; txt = String(res);
      T3.zRun++; T3.zRes.push(res);
      if (T3.armed) T3.erased = true;
    } else {
      res = Math.random() < pPlusOf(T3.ang) ? 0 : 1; tgt = res === 0 ? 45 : 135; txt = res === 0 ? '+' : '−';
      T3.zRun = 0; T3.zRes = []; T3.nX++;
      if (before === 0 || before === 90) T3.armed = true;
    }
    T3.ang = tgt; T3.log.push({ b: basis, r: txt, from: before }); if (T3.log.length > 12) T3.log.shift();
    T3.anim = { t: 0, dur: 0.7, basis, txt };
    aSp.target = tgt;
    const tip = planeTip(tgt, 1);
    parts.burst(tip.x, tip.y, { count: 12, colors: [basis === 'Z' ? (res === 0 ? C0 : C1) : (res === 0 ? CP : CM), '#ffd166'], speed: 120, life: 0.55, size: 3.2, gravity: 0 });
  }
  function stPrep(ang) { const T3 = S.st; T3.ang = ang; T3.zRun = 0; T3.zRes = []; T3.armed = false; T3.erased = false; T3.anim = null; T3.log.push({ b: 'P', r: ang + '°', from: ang }); if (T3.log.length > 12) T3.log.shift(); aSp.target = ang; }
  $('#bMz').addEventListener('click', () => { Sound.click(); stMeasure('Z'); });
  $('#bMx').addEventListener('click', () => { Sound.click(); stMeasure('X'); });
  $('#bP30').addEventListener('click', () => { Sound.click(); stPrep(30); });
  $('#bP0').addEventListener('click', () => { Sound.click(); stPrep(0); });
  function stepAgain(dt) { const T3 = S.st; if (T3.anim) { T3.anim.t += dt; if (T3.anim.t >= T3.anim.dur) T3.anim = null; } }

  /* ---------- 큐비트 여러 개 (4단계) ---------- */
  const MU_HOLD = 1.8;
  function muMeasure() {
    const U = S.mu, pr = prob3(U.th); let r = Math.random(), k = 0;
    for (; k < 7; k++) { if (r < pr[k]) break; r -= pr[k]; }
    U.res = k; U.lastRes = k; U.t = 0; U.meas++;
    const bx = muBarX(k);
    parts.burst(bx.x, bx.y, { count: 14, colors: ['#ffd166', C0, C1], speed: 130, life: 0.6, size: 3.4, gravity: 40 });
  }
  $('#bM3').addEventListener('click', () => { Sound.click(); muMeasure(); });
  function stepMulti(dt) {
    const U = S.mu; U.t += dt;
    if (U.res != null && U.t > MU_HOLD) U.res = null;
    U.shown = RM ? pw2(U.n) : SciSim.approach(U.shown, pw2(U.n), dt, 6);
  }

  /* ---------- 그리기 도우미 ---------- */
  function ptitle(P, txt) { T(P.x + 14, P.y + 26, txt, 15, '#d6452f', 'left', 800); }
  function card(P) { panel(P.x, P.y, P.w, P.h, 16, '#fff'); }
  function planeGeom() {
    const R = PHONE ? 88 : 106;
    return { cx: PM.x + PM.w / 2 - (PHONE ? 20 : 0), cy: PM.y + PM.h / 2 + (PHONE ? 14 : 14), R };
  }
  function planeTip(deg, k) { const g = planeGeom(); return { x: g.cx + g.R * (k || 1) * Math.cos(deg * rad), y: g.cy - g.R * (k || 1) * Math.sin(deg * rad) }; }
  const tipColor = (deg) => C.mix(C0, C1, clamp(deg / 90, 0, 1));
  function drawPlane(t, opt) {
    const g = planeGeom(), { cx, cy, R } = g, ang = aSp.value, th = opt.theta;
    card(PM); ptitle(PM, '큐비트 평면');
    // 원과 중첩 영역(0°~90°)
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fillStyle = '#f7f9ff'; ctx.fill(); ctx.strokeStyle = '#cfd8ea'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, -Math.PI / 2, 0); ctx.closePath(); ctx.fillStyle = 'rgba(56,103,244,.07)'; ctx.fill();
    // 0°~90° 테두리: 파랑 → 주황
    const gr = ctx.createLinearGradient(cx + R, cy, cx, cy - R); gr.addColorStop(0, C0); gr.addColorStop(1, C1);
    ctx.lineWidth = 7; ctx.strokeStyle = gr; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2, 0); ctx.stroke();
    ctx.restore();
    // 축
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx - R - 4, cy); ctx.lineTo(cx + R + 4, cy); ctx.moveTo(cx, cy + R + 4); ctx.lineTo(cx, cy - R - 4); ctx.stroke();
    if (opt.diag) {
      ctx.save(); ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(139,92,246,.7)'; ctx.lineWidth = 1.8;
      const d = R + 4; ctx.beginPath(); ctx.moveTo(cx - d * 0.7071, cy + d * 0.7071); ctx.lineTo(cx + d * 0.7071, cy - d * 0.7071); ctx.moveTo(cx + d * 0.7071, cy + d * 0.7071); ctx.lineTo(cx - d * 0.7071, cy - d * 0.7071); ctx.stroke(); ctx.restore();
      const a = planeTip(45, 1.2), b = planeTip(135, 1.2);
      D.label(a.x, a.y, '+', { size: 15, bg: CP, color: '#fff', pad: 8 }); D.label(b.x, b.y, '−', { size: 15, bg: CM, color: '#fff', pad: 8 });
    }
    // 축 이름
    D.label(cx + R + (PHONE ? 22 : 26), cy, '0', { size: 14, bg: C0, color: '#fff', pad: 9 });
    D.label(cx, cy - R - 17, '1', { size: 14, bg: C1, color: '#fff', pad: 9 });
    T(cx + R + (PHONE ? 22 : 26), cy + 24, '0 상태', 13, C0, 'center', 800);
    T(cx + 28, cy - R - 12, '1 상태', 13, C1, 'left', 800);
    // 성분 점선: cos θ, sin θ
    const tip = { x: cx + R * 0.92 * Math.cos(ang * rad), y: cy - R * 0.92 * Math.sin(ang * rad) };
    if (opt.proj) {
      ctx.save(); ctx.setLineDash([4, 4]); ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(56,103,244,.8)'; ctx.beginPath(); ctx.moveTo(tip.x, tip.y); ctx.lineTo(tip.x, cy); ctx.stroke();
      ctx.strokeStyle = 'rgba(242,107,58,.85)'; ctx.beginPath(); ctx.moveTo(tip.x, tip.y); ctx.lineTo(cx, tip.y); ctx.stroke();
      ctx.restore();
    }
    // 각도 호
    if (opt.arc && th > 0.5) {
      ctx.save(); ctx.strokeStyle = '#26324a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, 38, 0, -ang * rad, true); ctx.stroke(); ctx.restore();
      const m = ang / 2 * rad; T(cx + 62 * Math.cos(m), cy - 62 * Math.sin(m) + 5, 'θ = ' + Math.round(th) + '°', 14, INK, 'center', 800, { stroke: '#fff', strokeWidth: 4 });
    }
    // 화살표
    D.arrow(cx, cy, tip.x, tip.y, { color: '#26324a', width: 5, head: 16 });
    D.sphere(cx, cy, 6, '#26324a', { gloss: false });
    D.glow(tip.x + (cx + R * Math.cos(ang * rad) - tip.x) * 0.9, tip.y + (cy - R * Math.sin(ang * rad) - tip.y) * 0.9, 12, tipColor(clamp(ang, 0, 90)), 0.5);
    return g;
  }
  function bar(x, y, w, h, frac, col, label, val, o) {   // 아래쪽이 기준인 세로 막대
    o = o || {};
    D.roundRect(x, y, w, h, 7); ctx.fillStyle = '#eef2fa'; ctx.fill();
    const fh = clamp(frac, 0, 1) * h;
    if (fh > 0.6) { ctx.save(); D.roundRect(x, y, w, h, 7); ctx.clip(); const gg = ctx.createLinearGradient(0, y + h - fh, 0, y + h); gg.addColorStop(0, C.shade(col, 0.25)); gg.addColorStop(1, col); ctx.fillStyle = gg; ctx.fillRect(x, y + h - fh, w, fh); ctx.restore(); }
    if (val != null) T(x + w / 2, y - 8, val, o.vs || 15, INK, 'center', 800);
    if (label) T(x + w / 2, y + h + (o.ly || 20), label, o.ls || 14, col, 'center', 800);
  }
  function hbar(x, y, w, h, frac, col) {
    D.roundRect(x, y, w, h, h / 2); ctx.fillStyle = '#eef2fa'; ctx.fill();
    const fw = clamp(frac, 0, 1) * w;
    if (fw > 0.6) { ctx.save(); D.roundRect(x, y, w, h, h / 2); ctx.clip(); ctx.fillStyle = col; ctx.fillRect(x, y, fw, h); ctx.restore(); }
  }

  /* ---------- 장면 그리기 ---------- */
  const mSp = Array.from({ length: 8 }, () => new SciSim.Spring(0, { stiffness: 140, damping: 17 }));
  function mbGeom() {
    const gap = PHONE ? 7 : 8, w = PB.w - (PHONE ? 36 : 40), bw = Math.floor((w - 7 * gap) / 8);
    return { x0: PB.x + (PHONE ? 18 : 20), bw, gap, top: PB.y + (PHONE ? 70 : 82), h: PHONE ? 100 : 188 };
  }
  function muBarX(k) { const g = mbGeom(); return { x: g.x0 + k * (g.bw + g.gap) + g.bw / 2, y: g.top + g.h * 0.35 }; }
  const bitGeom = () => ({ bx: PL.x + (PHONE ? 16 : 24), by: PL.y + (PHONE ? 42 : 62), bw: PHONE ? 120 : 182, bh: PHONE ? 62 : 128 });
  const stateTxt = (th) => (th === 0 ? '0 상태' : th === 90 ? '1 상태' : '중첩 상태');

  function drawBit(t) {
    // 비트 상자
    card(PL); ptitle(PL, '비트 (스위치)');
    const BG0 = bitGeom(), bx = BG0.bx, by = BG0.by, bw = BG0.bw, bh = BG0.bh;
    D.shadow(() => { D.roundRect(bx, by, bw, bh, 14); const g = ctx.createLinearGradient(0, by, 0, by + bh); g.addColorStop(0, '#dfe6f7'); g.addColorStop(1, '#b9c5e4'); ctx.fillStyle = g; ctx.fill(); }, { blur: 8, y: 3 });
    const open = S.peek;
    ctx.save(); D.roundRect(bx, by, bw, bh, 14); ctx.clip();
    ctx.fillStyle = '#fff'; ctx.fillRect(bx + 8, by + 8, bw - 16, bh - 16);
    T(bx + bw / 2, by + bh / 2 + (PHONE ? 16 : 26), open ? String(S.bit) : '?', PHONE ? 46 : 72, open ? (S.bit ? C1 : C0) : '#8a95a8', 'center', 900);
    ctx.restore();
    const ly = open ? by - (PHONE ? 14 : 30) : by;   // 뚜껑
    D.roundRect(bx - 4, ly, bw + 8, PHONE ? 16 : 26, 8); ctx.fillStyle = '#8e9bc9'; ctx.fill();
    if (!PHONE) T(bx + bw / 2, by + bh + 22, open ? '열어 봐도 값은 그대로예요' : '상자를 눌러 열어 봐요', 13, MUTE, 'center', 800);
    const tx = PHONE ? PL.x + 156 : PL.x + 16, ty = PHONE ? PL.y + 52 : by + bh + 52;
    textBlock(tx, ty, PHONE ? PL.w - 172 : PL.w - 32, (PHONE ? (open ? '열어 봐도 값은 그대로예요. 비트는 열기 전에도 값이 정해져 있어요.' : '비트는 열기 전에도 값이 0 또는 1로 정해져 있어요. 상자를 눌러 열어 봐요.') : '비트는 열어 보기 전에도 값이 0 또는 1로 정해져 있어요.'), PHONE ? 14 : 14.5, INK, PHONE ? 20 : 21, 700);
    if (!PHONE) {
      D.roundRect(PL.x + 12, PL.y + PL.h - 108, PL.w - 24, 96, 12); ctx.fillStyle = '#fff6e6'; ctx.fill();
      T(PL.x + 22, PL.y + PL.h - 86, '🪙 도는 동전과 달라요', 14, '#9a5a00', 'left', 800);
      textBlock(PL.x + 22, PL.y + PL.h - 64, PL.w - 44, '동전은 모를 뿐 이미 정해져 있지만, 중첩 큐비트는 측정 전에 정해지지 않았어요.', 13, '#5a4a2a', 18, 700);
    }
    // 큐비트 평면
    const g = drawPlane(t, { theta: S.th, proj: true, arc: true });
    // 확률 막대
    card(PR); ptitle(PR, '측정하면?');
    const p0 = p0Of(S.th), p1 = 1 - p0;
    bSp[0].target = p0; bSp[1].target = p1; bSp[0].update(0);
    if (!PHONE) {
      const bw2 = 56, bh2 = 188, y0 = PR.y + 70;
      bar(PR.x + 24, y0, bw2, bh2, bSp[0].value, C0, '0이 나올 확률', f2(p0), { ly: 22 });
      bar(PR.x + 116, y0, bw2, bh2, bSp[1].value, C1, '1이 나올 확률', f2(p1), { ly: 22 });
      T(PR.x + 52, y0 + bh2 + 44, 'P₀ = cos²θ', 14.5, C0, 'center', 800); T(PR.x + 144, y0 + bh2 + 44, 'P₁ = sin²θ', 14.5, C1, 'center', 800);
      T(PR.x + PR.w / 2, y0 + bh2 + 72, 'P₀ + P₁ = ' + (p0 + p1).toFixed(2), 15, INK, 'center', 800);
      D.label(PR.x + PR.w / 2, PR.y + PR.h - 30, stateTxt(S.th), { size: 14, bg: S.th === 0 ? C0 : S.th === 90 ? C1 : '#8b5cf6', color: '#fff', pad: 10 });
    } else {
      const x0 = PR.x + 18, w2 = PR.w - 36;
      T(x0, PR.y + 50, '0이 나올 확률  P₀ = cos²θ', 14, C0, 'left', 800); T(x0 + w2, PR.y + 50, f2(p0), 16, INK, 'right', 800); hbar(x0, PR.y + 58, w2, 16, bSp[0].value, C0);
      T(x0, PR.y + 94, '1이 나올 확률  P₁ = sin²θ', 14, C1, 'left', 800); T(x0 + w2, PR.y + 94, f2(p1), 16, INK, 'right', 800); hbar(x0, PR.y + 102, w2, 16, bSp[1].value, C1);
    }
    return g;
  }
  function drawMeasure(t, dt) {
    const M = S.ms;
    card(PL); ptitle(PL, '측정 결과 기록');
    const cols = PHONE ? 20 : 8, rowsMax = PHONE ? 2 : 10, cs = PHONE ? 21 : 25, gx = PL.x + (PHONE ? 14 : 14), gy = PL.y + (PHONE ? 40 : 44);
    const L = M.log, cap = cols * rowsMax, start = Math.max(0, L.length - cap);
    for (let i = 0; i < cap; i++) {
      const x = gx + (i % cols) * (cs + (PHONE ? 1 : 2)), y = gy + Math.floor(i / cols) * (cs + (PHONE ? 1 : 2)), k = start + i;
      D.roundRect(x, y, cs, cs, 5);
      if (k < L.length) { const r = L[k]; ctx.fillStyle = r ? C1 : C0; ctx.fill(); T(x + cs / 2, y + cs / 2 + 5, String(r), 13, '#fff', 'center', 800); if (k === L.length - 1 && !PHONE) { ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2.5; ctx.stroke(); } }
      else { ctx.fillStyle = '#eef2fa'; ctx.fill(); }
    }
    if (!PHONE) textBlock(PL.x + 14, PL.y + PL.h - 36, PL.w - 28, '매번 같은 상태를 새로 준비해서 측정해요.', 13.5, MUTE, 19, 700);
    drawPlane(t, { theta: S.th, proj: true, arc: true });
    const g = planeGeom();
    if (M.anim) { const tip = planeTip(aSp.value, 1.0); D.label(tip.x + (tip.x > g.cx + 4 ? 40 : -40), tip.y - 14, '측정! → ' + M.last, { size: 14, bg: M.last ? C1 : C0, color: '#fff', pad: 8 }); }
    if (M.predRes) { const r = M.predRes, ok = r.pred === r.res, k = Math.min(1, (3.5 - r.t) * 1.4); ctx.save(); ctx.globalAlpha = k; D.label(g.cx, g.cy + g.R + (PHONE ? 26 : 34), '예측 ' + r.pred + ' → 결과 ' + r.res + (ok ? '  맞았어요!' : '  틀렸어요'), { size: 14, bg: ok ? CP : '#e2464b', color: '#fff', pad: 10 }); ctx.restore(); }
    // 횟수 막대
    card(PR); ptitle(PR, '나온 횟수');
    const p0 = p0Of(S.th), p1 = 1 - p0, N = M.N;
    M.hTarget = niceMax(Math.max(8, 1.15 * Math.max(M.c0, M.c1, N * p0, N * p1)));
    const H = M.hShown;
    const expMark = (x, y, w, h, e) => { const yy = y + h - clamp(e / H, 0, 1) * h; ctx.save(); ctx.strokeStyle = '#26324a'; ctx.lineWidth = 2.4; ctx.setLineDash([5, 3]); ctx.beginPath(); ctx.moveTo(x - 5, yy); ctx.lineTo(x + w + 5, yy); ctx.stroke(); ctx.restore(); };
    if (!PHONE) {
      const bw2 = 56, bh2 = 200, y0 = PR.y + 70;
      bar(PR.x + 24, y0, bw2, bh2, M.c0 / H, C0, '0', M.c0 + '회', { ly: 22 }); expMark(PR.x + 24, y0, bw2, bh2, N * p0);
      bar(PR.x + 116, y0, bw2, bh2, M.c1 / H, C1, '1', M.c1 + '회', { ly: 22 }); expMark(PR.x + 116, y0, bw2, bh2, N * p1);
      T(PR.x + 52, y0 + bh2 + 46, N ? pc(M.c0 / N) : '—', 15, C0, 'center', 800); T(PR.x + 144, y0 + bh2 + 46, N ? pc(M.c1 / N) : '—', 15, C1, 'center', 800);
      T(PR.x + PR.w / 2, y0 + bh2 + 72, '점선: 예상 횟수 (N × P)', 13, MUTE, 'center', 700);
      T(PR.x + PR.w / 2, y0 + bh2 + 92, '예상 확률  P₀ = ' + f2(p0) + ' · P₁ = ' + f2(p1), 13, INK, 'center', 800);
    } else {
      const x0 = PR.x + 18, w2 = PR.w - 120, hh = 18;
      [[0, C0, M.c0, p0], [1, C1, M.c1, p1]].forEach(([k, col, c, p], i) => {
        const y = PR.y + 44 + i * 40;
        T(x0, y + 14, String(k), 15, col, 'left', 800); hbar(x0 + 16, y, w2, hh, c / H, col);
        const ex = x0 + 16 + clamp(N * p / H, 0, 1) * w2; ctx.save(); ctx.strokeStyle = '#26324a'; ctx.lineWidth = 2.4; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(ex, y - 4); ctx.lineTo(ex, y + hh + 4); ctx.stroke(); ctx.restore();
        T(x0 + 16 + w2 + 8, y + 14, c + '회 · ' + (N ? pc(c / N) : '—'), 14, INK, 'left', 800);
      });
      T(PR.x + PR.w - 14, PR.y + 24, '점선: 예상 횟수', 12.5, MUTE, 'right', 700);
    }
  }
  function drawAgain(t, dt) {
    const T3 = S.st;
    card(PL); ptitle(PL, '측정 기록');
    const L = T3.log, show = L.slice(-(PHONE ? 3 : 8)).reverse();
    if (!L.length) T(PL.x + 14, PL.y + 62, '아직 측정하지 않았어요', 14, '#8a95a8', 'left', 700);
    show.forEach((e, i) => {
      const y = PL.y + (PHONE ? 38 : 44) + i * (PHONE ? 25 : 44), x = PL.x + 12, w = PL.w - 24;
      D.roundRect(x, y, w, PHONE ? 22 : 38, 9); ctx.fillStyle = i === 0 ? '#fff3d6' : '#f1f4fb'; ctx.fill();
      const lab = e.b === 'P' ? '준비  θ = ' + e.r : e.b === 'Z' ? '0/1 기준 → ' + e.r : '대각선 기준 → ' + e.r;
      T(x + 10, y + (PHONE ? 16 : 24), lab, PHONE ? 14 : 14.5, e.b === 'P' ? MUTE : e.b === 'Z' ? (e.r === '0' ? C0 : C1) : (e.r === '+' ? CP : CM), 'left', 800);
    });
    if (!PHONE) textBlock(PL.x + 14, PL.y + PL.h - 38, PL.w - 28, '맨 위가 가장 최근 측정이에요.', 13.5, MUTE, 19, 700);
    const g = drawPlane(t, { theta: aSp.value, proj: true, arc: true, diag: true });
    D.label(g.cx, g.cy + g.R + (PHONE ? 26 : 34), '현재 상태  θ = ' + Math.round(T3.ang) + '°', { size: 14, bg: '#26324a', color: '#fff', pad: 10 });
    if (T3.anim) { const tip = planeTip(aSp.value, 1.0); D.label(tip.x + (tip.x > g.cx + 4 ? 40 : -40), tip.y - 14, '측정! → ' + T3.anim.txt, { size: 14, bg: '#8b5cf6', color: '#fff', pad: 8 }); }
    // 다음 측정에서의 확률
    card(PR); ptitle(PR, '다음 측정의 확률');
    const a = T3.ang, vals = [p0Of(a), 1 - p0Of(a), pPlusOf(a), 1 - pPlusOf(a)], cols = [C0, C1, CP, CM], labs = ['0', '1', '+', '−'];
    vals.forEach((v, i) => { zSp[i].target = v; });
    if (!PHONE) {
      const bw2 = 30, bh2 = 200, y0 = PR.y + 74, xs = [PR.x + 20, PR.x + 58, PR.x + 112, PR.x + 150];
      vals.forEach((v, i) => { bar(xs[i], y0, bw2, bh2, zSp[i].value, cols[i], labs[i], f2(v), { vs: 13.5, ly: 22 }); });
      T((xs[0] + xs[1] + bw2) / 2, y0 + bh2 + 50, '0/1 기준', 13.5, INK, 'center', 800); T((xs[2] + xs[3] + bw2) / 2, y0 + bh2 + 50, '대각선 기준', 13.5, INK, 'center', 800);
      textBlock(PR.x + 14, y0 + bh2 + 74, PR.w - 28, '막대 높이 = 그 기준으로 측정했을 때 그 결과가 나올 확률', 12.5, MUTE, 17, 700);
    } else {
      const x0 = PR.x + 18, w2 = PR.w - 130;
      vals.forEach((v, i) => { const y = PR.y + 34 + i * 22; T(x0, y + 13, labs[i], 14, cols[i], 'left', 800); hbar(x0 + 18, y, w2, 14, zSp[i].value, cols[i]); T(x0 + 18 + w2 + 8, y + 13, f2(v) + (i < 2 ? '' : ''), 14, INK, 'left', 800); });
      T(PR.x + PR.w - 14, PR.y + 24, '0/1 기준: 0, 1 · 대각선 기준: +, −', 12.5, MUTE, 'right', 700);
    }
  }
  function drawGrid(t, dt) {
    const U = S.mu, n = U.n;
    card(PG); ptitle(PG, '큐비트 ' + n + '개가 가진 값의 수');
    const cols = pw2(Math.ceil(n / 2)), rows = pw2(Math.floor(n / 2));
    const aw = PG.w - 28, ah = PHONE ? 120 : 176, ax = PG.x + 14, ay = PG.y + (PHONE ? 38 : 44);
    const s = Math.min(36, aw / cols, ah / rows), gap = s > 14 ? 3 : s > 8 ? 1.5 : 0.8;
    const gw = cols * s, gh = rows * s, x0 = ax + (aw - gw) / 2, y0 = ay + (ah - gh) / 2;
    const total = pw2(n);
    for (let i = 0; i < total; i++) {
      const k = clamp(U.shown - i, 0, 1); if (k <= 0.02) continue;
      const cx = x0 + (i % cols) * s + s / 2, cy = y0 + Math.floor(i / cols) * s + s / 2, r = (s - gap) / 2 * (0.4 + 0.6 * k);
      ctx.globalAlpha = k; ctx.fillStyle = C.mix(C0, C1, (i / Math.max(1, total - 1)));
      D.roundRect(cx - r, cy - r, r * 2, r * 2, Math.min(4, r * 0.4)); ctx.fill(); ctx.globalAlpha = 1;
    }
    T(PG.x + PG.w / 2, ay + ah + 20, '칸 하나 = 큐비트가 가질 수 있는 값 하나   →   2' + supOf(n) + ' = ' + nValTxt(n) + '가지', PHONE ? 13.5 : 14.5, INK, 'center', 800);
    // 표
    const rowsT = [1, 3, 10, 50, 300];
    const ty = PG.y + (PHONE ? 206 : 262), rh = PHONE ? 0 : 26;
    if (!PHONE) {
      rowsT.forEach((nn, i) => {
        const y = ty + i * rh, hl = nn === n;
        D.roundRect(PG.x + 14, y, PG.w - 28, rh - 4, 8); ctx.fillStyle = hl ? '#fff3d6' : '#f1f4fb'; ctx.fill();
        T(PG.x + 26, y + 18, 'n = ' + nn, 14.5, INK, 'left', 800); T(PG.x + 100, y + 18, '2' + supOf(nn) + ' = ' + nValTxt(nn) + '가지', 14.5, hl ? '#d6452f' : INK, 'left', 800);
      });
      T(PG.x + 26, ty + 5 * rh + 14, '※ 우주의 원자 수는 약 10' + supOf(80) + '개예요. n = 300이면 그보다 많아요.', 13, MUTE, 'left', 700);
    } else {
      T(PG.x + 14, ty, 'n = 50 → 약 ' + sci(pw2(50), 1) + '가지  ·  n = 300 → 약 ' + sci(pw2(300), 1) + '가지', 13.5, INK, 'left', 800);
      T(PG.x + 14, ty + 20, '(우주의 원자 수는 약 10' + supOf(80) + '개)', 13, MUTE, 'left', 700);
    }
  }
  function drawBars3(t, dt) {
    const U = S.mu, g = mbGeom();
    card(PB); ptitle(PB, '3큐비트의 중첩 (θ = ' + U.th + '°)');
    const pr = prob3(U.th);
    T(PB.x + 14, PB.y + (PHONE ? 45 : 56), '값마다 측정에서 나올 확률 (%)', 13, MUTE, 'left', 700);
    for (let k = 0; k < 8; k++) mSp[k].target = U.res == null ? pr[k] : (k === U.res ? 1 : 0);
    const tw = PHONE ? 0 : 0;
    for (let k = 0; k < 8; k++) {
      const x = g.x0 + k * (g.bw + g.gap), isR = U.res === k;
      const col = isR ? '#e2464b' : C.mix(C0, C1, k / 7);
      bar(x, g.top, g.bw, g.h, mSp[k].value, col, bin3(k), (isR ? '100' : (pr[k] * 100).toFixed(1)), { vs: PHONE ? 11.5 : 12.5, ls: PHONE ? 12.5 : 13.5, ly: 20 });
    }
    // 결과 / 비트 비교
    const by = g.top + g.h + (PHONE ? 38 : 44);
    if (U.res != null) { D.label(PB.x + PB.w / 2, by + 6, '측정 결과: ' + bin3(U.res) + '  (8가지 중 딱 1개만 얻어요)', { size: 14, bg: '#e2464b', color: '#fff', pad: 10 }); }
    else D.label(PB.x + PB.w / 2, by + 6, '측정하기 전: 8가지 값이 확률로 중첩', { size: 14, bg: '#8b5cf6', color: '#fff', pad: 10 });
    const ry = by + (PHONE ? 18 : 30), sq = PHONE ? 24 : 28;
    T(PB.x + 18, ry + sq - 8, '비트 3개:', 14, INK, 'left', 800);
    const regVal = U.res != null ? U.res : (S.mu.lastRes != null ? S.mu.lastRes : 5);
    for (let i = 0; i < 3; i++) { const b = (regVal >> (2 - i)) & 1, x = PB.x + 96 + i * 34; D.roundRect(x, ry, sq, sq, 6); ctx.fillStyle = b ? C1 : C0; ctx.fill(); T(x + sq / 2, ry + sq - 8, String(b), 15, '#fff', 'center', 800); }
    T(PB.x + 208, ry + sq - 8, '한 번에 한 값만 저장', 14, MUTE, 'left', 700);
    T(PB.x + 18, ry + sq + (PHONE ? 20 : 26), '큐비트 3개:', 14, INK, 'left', 800);
    T(PB.x + 96, ry + sq + (PHONE ? 20 : 26), U.res != null ? '측정했더니 한 값으로 정해졌어요' : '8가지 값이 한꺼번에 중첩', 14, U.res != null ? '#e2464b' : '#8b5cf6', 'left', 800);
  }

  function caption() {
    const m = S.mode;
    if (m === 'bit') {
      const th = S.th, p0 = p0Of(th);
      if (th === 0) return ['0 상태 (θ = 0°)', '화살표가 오른쪽을 가리켜요. 측정하면 항상 0이 나와요 (P₀ = 1.00, P₁ = 0.00).'];
      if (th === 90) return ['1 상태 (θ = 90°)', '화살표가 위쪽을 가리켜요. 측정하면 항상 1이 나와요 (P₀ = 0.00, P₁ = 1.00).'];
      return ['0과 1의 중첩 상태 (θ = ' + th + '°)', '측정하면 0이 나올 확률은 P₀ = cos²θ = ' + f2(p0) + ', 1이 나올 확률은 P₁ = sin²θ = ' + f2(1 - p0) + '이에요. 측정하기 전에는 0도 1도 정해지지 않았어요.'];
    }
    if (m === 'measure') {
      const M = S.ms, p0 = p0Of(S.th);
      if (!M.N) return ['θ = ' + S.th + '° 큐비트를 측정해요', '매번 같은 상태를 새로 준비해서 측정해요. 한 번의 결과는 예측할 수 없지만, 많이 모으면 비율이 예상 확률에 가까워져요.'];
      return ['측정 ' + M.N + '번', '0이 ' + M.c0 + '번(' + pc(M.c0 / M.N) + '), 1이 ' + M.c1 + '번(' + pc(M.c1 / M.N) + ') 나왔어요. 예상 확률은 P₀ = ' + f2(p0) + ', P₁ = ' + f2(1 - p0) + '이에요. ' + (M.N < 30 ? '횟수가 적으면 예상에서 많이 벗어날 수 있어요.' : '횟수가 많을수록 예상 확률에 가까워져요.')];
    }
    if (m === 'again') {
      const T3 = S.st, last = T3.log[T3.log.length - 1];
      if (!last || last.b === 'P') return ['큐비트를 준비했어요 (θ = ' + T3.ang + '°)', '같은 기준으로 연속해서 측정하면 어떻게 될까요? 기준을 바꾸면요? 측정 버튼을 눌러 알아봐요.'];
      if (last.b === 'Z') return ['0/1 기준 측정 결과: ' + last.r, '측정한 순간 상태가 측정 결과(θ = ' + T3.ang + '°)로 바뀌었어요. 같은 기준으로 다시 측정하면 항상 같은 결과가 나와요.'];
      return ['대각선 기준 측정 결과: ' + last.r, '상태가 θ = ' + T3.ang + '°로 바뀌었어요. 이제 0/1 기준으로 측정하면 0이 나올 확률은 ' + f2(p0Of(T3.ang)) + '로 다시 확률적이에요. 앞의 정보가 사라졌어요.'];
    }
    return ['n = ' + S.mu.n + ' 큐비트', S.mu.n + '개의 큐비트는 2' + supOf(S.mu.n) + ' = ' + nValTxt(S.mu.n) + '가지 값을 한꺼번에 중첩할 수 있어요. 하지만 측정하면 그중 딱 한 값만 얻어요. 비트 ' + S.mu.n + '개는 한 번에 한 값만 저장해요.'];
  }
  function drawBot() {
    const c = caption();
    panel(BOT.x, BOT.y, BOT.w, BOT.h, 14);
    T(BOT.x + 16, BOT.y + 26, c[0], 16, '#d6452f', 'left', 800);
    textBlock(BOT.x + 16, BOT.y + 50, BOT.w - 32, c[1], PHONE ? 14.5 : 15, INK, PHONE ? 21 : 22, 700);
  }

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  function readouts() {
    let a, b, c, L1, L2, L3;
    if (S.mode === 'bit') {
      const p0 = p0Of(S.th);
      L1 = '각도 θ'; a = S.th + '° (' + stateTxt(S.th) + ')';
      L2 = '0이 나올 확률 P₀'; b = f2(p0);
      L3 = '1이 나올 확률 P₁'; c = f2(1 - p0);
    } else if (S.mode === 'measure') {
      const M = S.ms, p0 = p0Of(S.th);
      L1 = '측정 횟수'; a = M.N + '번 (θ = ' + S.th + '°)';
      L2 = '0이 나온 비율'; b = M.N ? pc(M.c0 / M.N) + ' (' + M.c0 + '번)' : '—';
      L3 = '예상 확률 P₀'; c = f2(p0) + ' (' + pc(p0) + ')';
    } else if (S.mode === 'again') {
      const T3 = S.st;
      L1 = '지금 상태'; a = 'θ = ' + T3.ang + '°';
      L2 = '0/1 기준: 0이 나올 확률'; b = f2(p0Of(T3.ang));
      L3 = '대각선 기준: + 가 나올 확률'; c = f2(pPlusOf(T3.ang));
    } else {
      L1 = '큐비트의 수 n'; a = S.mu.n + '개';
      L2 = '가능한 값의 수 2' + supOf(S.mu.n); b = nValTxt(S.mu.n) + '가지';
      L3 = '측정으로 얻는 값'; c = '딱 1개' + (S.mu.res != null ? ' (' + bin3(S.mu.res) + ')' : '');
    }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ---------- 포인터: 화살표 끌기 · 비트 상자 열기 ---------- */
  let dragA = false;
  const nearPlane = (p) => { const g = planeGeom(); return Math.hypot(p.x - g.cx, p.y - g.cy) <= g.R + 24; };
  const angOf = (p) => { const g = planeGeom(); return Math.atan2(g.cy - p.y, p.x - g.cx) / rad; };
  const bitBox = () => { const g = bitGeom(); return { x: g.bx - 6, y: g.by - 30, w: g.bw + 12, h: g.bh + 30 + 24 }; };
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'bit') { const r = bitBox(); if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) { S.peek = !S.peek; Sound.click(); return false; } }
      if ((S.mode === 'bit' || S.mode === 'measure') && nearPlane(p)) { dragA = true; let a = angOf(p); if (a < -45) a = 90; setTheta(clamp(a, 0, 90)); return true; }
      return false;
    },
    move(p) { if (dragA) { let a = angOf(p); if (a < -45) a = 90; setTheta(clamp(a, 0, 90)); } },
    up() { dragA = false; },
    hover(p) { return (S.mode === 'bit' || S.mode === 'measure') && nearPlane(p) ? 'grab' : 'default'; },
  });

  /* ---------- 숫자 입력 채점 ---------- */
  const numKeys = { n3: '', n10: '' };
  ['n3', 'n10'].forEach((id) => $('#' + id).addEventListener('input', () => { $('#' + id).classList.remove('ok', 'bad'); numKeys[id] = ''; }));
  function gradeNums() {
    const rd = (id) => { const raw = $('#' + id).value.replace(/[,\s]/g, ''); return raw === '' ? NaN : parseInt(raw, 10); };
    const a = rd('n3'), b = rd('n10'), okA = a === 8, okB = b === 1024;
    [['n3', okA, a], ['n10', okB, b]].forEach(([id, ok, v]) => {
      const el = $('#' + id), key = el.value + (ok ? '1' : '0');
      if (isNaN(v)) return;
      if (numKeys[id] !== key) { numKeys[id] = key; el.classList.remove('ok', 'bad'); void el.offsetWidth; el.classList.add(ok ? 'ok' : 'bad'); }
    });
    if (isNaN(a) || isNaN(b)) return '두 칸을 모두 채워 보세요.';
    if (!okA) return '큐비트 3개는 2 × 2 × 2 = 8가지예요. 000부터 111까지 세어 보세요.';
    if (!okB) return '큐비트가 하나 늘 때마다 값의 수가 2배가 돼요. 2를 10번 곱하면 얼마일까요? (2¹⁰)';
    return true;
  }

  /* ---------- 미션 ---------- */
  function resetBit() { S.th = 0; slT.set(0); S.bit = 0; S.peek = false; aSp.value = 0; aSp.velocity = 0; aSp.target = 0; S.seen.th = { 0: true }; }
  const levels = [
    {
      title: '비트와 큐비트: 0과 1의 중첩', short: '비트와 큐비트', icon: '🪙', phase: '모형',
      intro: '<p class="si-q">❓ 탐구 질문: 0이면서 동시에 1인 상태가 있다면, 그것을 확인하려고 들여다보는 순간 어떤 일이 일어날까?</p>' +
        '<div class="si-link">🔗 <b>통합과학에서</b> 디지털 정보를 0과 1의 <b>비트</b>로 나타낸다고 배웠어요. 비트는 스위치처럼 늘 0 또는 1이에요. 앞 차시에서 전자는 도착하기 전에는 위치가 정해지지 않았고, 측정하면 한 점으로 정해졌어요. 이 성질을 정보의 단위에 적용한 것이 <b>큐비트</b>예요.</div>' +
        '<p>큐비트의 상태는 평면 위의 <b>화살표(각도 θ)</b>로 그려요. <b>0 상태</b>는 오른쪽(θ = 0°), <b>1 상태</b>는 위쪽(θ = 90°), 그 사이는 0과 1의 <b>중첩 상태</b>예요. 측정했을 때 0이 나올 확률은 P₀ = cos²θ, 1이 나올 확률은 P₁ = sin²θ이고 P₀ + P₁ = 1이에요.</p>' +
        '<p class="ctrl-note">※ 동전 비유의 한계: 공중에서 도는 동전은 “이미 앞면이나 뒷면으로 정해졌지만 우리가 아직 모를 뿐”이에요. 중첩 상태의 큐비트는 그렇지 않아요. 측정하기 전에는 0도 1도 정해지지 않았어요.</p>',
      features: ['bit'],
      setup() { resetBit(); S.show.selA = false; S.show.selB = false; S.show.selC = false; S.show.numIn = false; setScene('bit'); updateCtl(); },
      recap: '비트는 열어 보지 않아도 0 또는 1이 정해져 있지만, 큐비트는 중첩 상태에서 측정하기 전에는 0도 1도 정해지지 않았어요. 각도 θ가 정하는 확률은 P₀ = cos²θ, P₁ = sin²θ예요.',
      summary: '<ul><li><b>비트</b>: 스위치처럼 0 또는 1. 열어 보기 전에도 값이 정해져 있어요.</li><li><b>큐비트</b>: 평면의 화살표(각도 θ). 0 상태 θ = 0°(오른쪽), 1 상태 θ = 90°(위쪽), 그 사이는 0과 1의 <b>중첩 상태</b>.</li><li>측정하면 0이 나올 확률 <b>P₀ = cos²θ</b>, 1이 나올 확률 <b>P₁ = sin²θ</b>, P₀ + P₁ = 1. (θ = 30° → 0.75 : 0.25, θ = 45° → 0.50 : 0.50)</li><li>중첩 상태는 “사실은 0 아니면 1인데 우리가 모를 뿐”이 아니에요. <b>측정하기 전에는 정해지지 않은 상태</b>예요. (도는 동전은 모를 뿐 이미 정해진 것이라 다른 점이에요.)</li></ul>',
      missions: [
        {
          title: 'θ를 30°로 맞춰 확률 읽기',
          goal: '큐비트의 각도를 <b>θ = 30°</b>로 맞추고, 0이 나올 확률 P₀가 <b>0.75</b>가 되는 것을 확인하세요.',
          hint: '슬라이더나 +, − 버튼으로 30°를 맞춰요. 화살표를 직접 끌어도 돼요. 오른쪽 막대에서 P₀가 0.75인지 보세요.',
          setup() { S.show.selA = false; setScene('bit'); },
          check: () => S.mode === 'bit' && S.th === 30,
          hold: 0.8,
          status: () => mark(S.th === 30) + ' θ = ' + S.th + '° &nbsp; P₀ = ' + f2(p0Of(S.th)) + ' (목표 0.75)',
          explain: 'θ = 30°이면 P₀ = cos²30° = (√3/2)² = 0.75, P₁ = sin²30° = 0.25예요. 화살표가 0 상태(오른쪽)에 가까울수록 0이 나올 확률이 커져요.',
        },
        {
          title: '상태와 확률 연결하기', manual: true,
          goal: 'θ를 <b>0°, 45°, 90°</b>로 각각 맞춰 보고, 상태와 측정 결과의 확률을 연결하세요.',
          hint: '“0°, 45°, 90°” 버튼을 눌러 보세요. 막대가 어떻게 달라지는지 보면서 문장을 골라요.',
          setup() { S.seen.th = { [S.th]: true }; S.show.selA = true; SEL_A.reset(); setScene('bit'); },
          check() {
            const need = [0, 45, 90].filter((a) => !S.seen.th[a]);
            if (need.length) return 'θ를 ' + need.map((a) => a + '°').join(', ') + '로도 맞춰 보세요.';
            return SEL_A.grade();
          },
          status: () => mark(!!S.seen.th[0]) + ' 0° &nbsp; ' + mark(!!S.seen.th[45]) + ' 45° &nbsp; ' + mark(!!S.seen.th[90]) + ' 90° &nbsp; · 고른 문장 ' + SEL_A.count() + ' / 4',
          explain: 'θ = 0°는 0 상태(P₀ = 1), θ = 90°는 1 상태(P₁ = 1), θ = 45°는 0과 1이 반반(0.50 : 0.50)인 중첩 상태예요. P₀ = cos²θ와 P₁ = sin²θ를 더하면 항상 1이에요.',
        },
        {
          type: 'quiz', title: '중첩 상태는 사실 0 아니면 1일까?',
          goal: 'θ = 45°인 큐비트는 “사실은 0이나 1 중 하나로 이미 정해져 있는데 우리가 모를 뿐”일까요?',
          setup() { S.show.selA = false; setScene('bit'); },
          choices: ['아니에요. 측정하기 전에는 0도 1도 정해지지 않은 상태이고, 측정하면 확률에 따라 하나로 정해져요', '맞아요. 열어 보기 전에도 이미 0 또는 1이 정해져 있어요', '아니에요. 큐비트는 0과 1을 둘 다 가진 값 두 개이고, 측정하면 두 값을 모두 읽어요', '맞아요. 50 %는 0, 50 %는 1인 큐비트가 섞여 있는 것뿐이에요'],
          answer: 0,
          feedback: ['', '그것은 비트의 성질이에요. 중첩 상태의 큐비트는 측정 전에는 0도 1도 정해져 있지 않아요(도는 동전과는 달라요).', '측정하면 둘 중 하나의 값만 얻어요. 0과 1을 모두 읽을 수는 없어요.', '여러 큐비트가 섞인 것이 아니라 하나의 큐비트가 한 상태(θ = 45°)에 있는 거예요. 측정 전에는 값이 정해지지 않았다는 점이 핵심이에요.'],
          explain: '비트는 열어 보기 전에도 값이 정해져 있어요. 반면 중첩 상태(0° < θ < 90°)의 큐비트는 <b>측정하기 전에는 0도 1도 정해지지 않았고</b>, 측정하면 P₀, P₁의 확률에 따라 둘 중 하나로 정해져요. 앞 차시에서 전자가 도착하기 전에는 위치가 정해지지 않았던 것과 같은 맥락이에요.',
        },
      ],
    },
    {
      title: '측정: 결과는 확률로 정해져요', short: '측정', icon: '📏', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> θ로 확률을 읽는 법을 배웠어요. 이제 직접 측정해 봐요. 앞 차시의 전자처럼, 한 번의 결과는 예측할 수 없고 많이 모아야 확률이 드러날까요?</div>' +
        '<p>θ = 30°인 큐비트를 <b>매번 같은 상태로 새로 준비</b>해서 측정해요. 측정할 때마다 화살표가 0 축 또는 1 축으로 순간 정렬(<b>상태 변화</b>)되고, 결과가 기록에 쌓여요. 10번, 100번, 1000번 측정하면 0이 나온 비율이 어떻게 변하는지 지켜봐요.</p>',
      features: ['measure'],
      setup() { setScene('measure'); clearStats(); setTheta(30); S.ms.tries = 0; S.ms.hits = 0; S.ms.pred = null; S.ms.predRes = null; S.show.selB = false; updateCtl(); },
      recap: '같은 상태를 준비해 측정해도 한 번의 결과는 예측할 수 없지만, 횟수가 많아지면 0이 나온 비율이 P₀ = 0.75에 가까워져요. 한 번의 결과는 확률적이어도 통계는 예측할 수 있어요.',
      summary: '<ul><li>측정하면 화살표(상태)가 0 축 또는 1 축으로 <b>순간 정렬</b>돼요. 결과는 0 또는 1 중 하나뿐이에요.</li><li>θ = 30°: 한 번의 결과는 <b>예측 불가</b>. 100번 측정하면 0이 약 75번, 1이 약 25번 나와요. 횟수가 많을수록 비율이 0.75 : 0.25에 가까워져요.</li><li>매번 “0이라고 예측”해도 맞힐 확률은 최대 75 %예요.</li><li>θ = 45°에서 10번 측정해 0이 3번 나와도 이상하지 않아요(통계적 변동, 확률 약 17 %).</li></ul>',
      missions: [
        {
          title: '100번 측정해 비율 구하기',
          goal: 'θ = 30°에서 <b>100번 이상</b> 측정하고, 0이 나온 비율이 예상 확률 <b>0.75</b>에 가까운지 확인하세요.',
          hint: '“×100”을 누르면 100번을 한꺼번에 측정해요. “측정 1번”을 눌러 한 번씩 보는 것도 좋아요. θ가 30°가 아니면 30°로 맞춰요.',
          setup() { S.show.selB = false; setScene('measure'); },
          check: () => S.mode === 'measure' && S.th === 30 && S.ms.N >= 100 && S.ms.q === 0,
          hold: 0.8,
          status: () => mark(S.th === 30) + ' θ = ' + S.th + '° &nbsp; ' + mark(S.ms.N >= 100) + ' 측정 ' + S.ms.N + ' / 100번 &nbsp; · 0이 나온 비율 ' + (S.ms.N ? pc(S.ms.c0 / S.ms.N) : '—'),
          explain: '10번만 측정하면 비율이 예상(75 %)과 꽤 다를 수 있지만, 100번, 1000번으로 늘리면 0이 나온 비율이 0.75에 가까워져요. 한 번의 결과는 확률적이어도 많이 모으면 통계는 예측대로 나와요.',
        },
        {
          title: '다음 결과 예측하기', manual: true,
          goal: 'θ = 30°에서 “0일 거야” 또는 “1일 거야”를 고른 뒤 “측정 1번”을 눌러 <b>8번</b> 예측해 보고 결과를 정리하세요.',
          hint: '예측 버튼을 고르고 나서 “측정 1번”을 눌러요. 매번 예측을 새로 골라야 해요. 어떻게 예측하면 가장 많이 맞힐까요?',
          setup() { S.ms.tries = 0; S.ms.hits = 0; S.ms.pred = null; S.show.selB = true; SEL_B.reset(); if (S.th !== 30) setTheta(30); setScene('measure'); updateCtl(); },
          check() {
            if (S.ms.tries < 8) return 'θ = 30°에서 예측하고 측정하는 일을 8번 해 보세요. (지금 ' + S.ms.tries + '번)';
            return SEL_B.grade();
          },
          status: () => mark(S.ms.tries >= 8) + ' 예측해 본 횟수 ' + S.ms.tries + ' / 8 &nbsp; · 맞힌 횟수 ' + S.ms.hits + '번 &nbsp; · 고른 문장 ' + SEL_B.count() + ' / 3',
          explain: '한 번의 측정 결과는 <b>미리 알 수 없어요</b>. 매번 “0”이라고 예측해도 맞힐 확률은 75 %가 최고예요. 하지만 100번을 측정하면 0이 약 75번 나온다는 <b>통계는 예측할 수 있어요</b>.',
        },
        {
          type: 'quiz', title: '45°에서 0이 10번 중 3번',
          goal: 'θ = 45°인 큐비트를 10번 측정했더니 0이 3번만 나왔어요. 큐비트의 상태가 이상한 걸까요?',
          setup() { S.show.selB = false; setScene('measure'); },
          choices: ['이상하지 않아요. 확률이 50 %여도 10번 중에는 3번쯤 나올 수 있는 통계적 변동이에요', '이상해요. 50 %이면 반드시 5번씩 나와야 해요', '이상해요. 큐비트가 고장 난 거예요', '이상하지 않아요. 앞의 측정 결과가 다음 결과에 영향을 주기 때문이에요'],
          answer: 0,
          feedback: ['', '확률이 50 %라는 것은 횟수가 아주 많을 때의 비율이 50 %에 가까워진다는 뜻이에요. 10번만으로는 5번이 꼭 나오지 않아요.', '10번 중 3번(약 17 %의 확률로 나오는 정도)은 정상 범위예요. 횟수를 늘려 비율을 확인해 보세요.', '매번 같은 상태를 새로 준비해서 측정하므로 각 결과는 서로 영향을 주지 않아요.'],
          explain: '각 측정은 독립이고 P₀ = 0.50이에요. 10번 중 0이 3번 이하로 나올 확률은 약 17 %로 흔히 일어나는 일이에요. 횟수를 100번, 1000번으로 늘리면 비율이 50 %에 가까워져요.',
        },
      ],
    },
    {
      title: '다시 측정: 측정은 상태를 바꿔요', short: '다시 측정', icon: '🔁', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 측정하면 화살표가 순간 정렬되는 것을 봤어요. 그 상태를 <b>그대로 두고</b> 또 측정하면 어떻게 될까요? 이중 슬릿에서 틈 검출기를 켜자 무늬가 사라졌던 것을 떠올려 봐요.</div>' +
        '<p>이번에는 상태를 다시 준비하지 않고 <b>같은 큐비트를 이어서</b> 측정해요. 측정 기준은 두 가지예요: <b>0/1 기준</b>(결과 0 또는 1)과 <b>대각선 기준</b>(결과 + 또는 −, 기준 축이 45°와 135°). 대각선 기준에서 + 가 나올 확률은 cos²(θ − 45°)예요.</p>',
      features: ['again'],
      setup() { S.st.ang = 30; S.st.log = []; S.st.zRun = 0; S.st.zRes = []; S.st.armed = false; S.st.erased = false; S.st.anim = null; aSp.value = 30; aSp.velocity = 0; S.show.selC = false; setScene('again'); aSp.target = 30; },
      recap: '측정하면 큐비트의 상태가 측정 결과에 해당하는 상태로 바뀌어요. 같은 기준으로 다시 측정하면 항상 같은 결과이지만, 기준을 바꾸어 측정하면 다시 확률적이고 앞의 정보는 사라져요.',
      summary: '<ul><li>0/1 기준으로 측정하면 상태가 θ = 0°(결과 0) 또는 θ = 90°(결과 1)로 <b>바뀌어요</b>. 같은 기준으로 다시 측정하면 항상 <b>같은 결과</b>예요.</li><li>대각선 기준으로 측정하면 상태가 θ = 45°(+) 또는 135°(−)로 바뀌어요. 0 상태를 대각선 기준으로 측정하면 +, −가 <b>50 %씩</b> 나와요.</li><li>그 뒤 0/1 기준으로 다시 측정하면 0과 1이 <b>50 %씩</b>이에요. 처음에 0이 확실했던 정보가 지워졌어요.</li><li>측정은 단순한 관찰이 아니라 <b>상태를 바꾸는 행위</b>예요. (이중 슬릿에서 검출기를 켜면 무늬가 사라진 것과 같은 맥락)</li></ul>',
      missions: [
        {
          title: '같은 기준으로 연속 3번 측정하기',
          goal: '큐비트를 θ = 30°로 준비한 뒤, <b>0/1 기준으로 연속 3번</b> 측정해서 결과를 비교하세요.',
          hint: '“0/1 기준으로 측정”을 3번 눌러요. 첫 번째 결과는 확률로 정해지지만 그다음은 어떻게 될까요? 기록에서 확인해요.',
          setup() { S.st.log = []; S.st.zRun = 0; S.st.zRes = []; S.st.anim = null; S.st.ang = 30; aSp.target = 30; S.show.selC = false; setScene('again'); },
          check: () => S.mode === 'again' && S.st.zRun >= 3,
          hold: 0.6,
          status: () => mark(S.st.zRun >= 3) + ' 같은 기준 연속 측정 ' + S.st.zRun + ' / 3번' + (S.st.zRes.length ? ' &nbsp; (결과: ' + S.st.zRes.join(', ') + ')' : ''),
          explain: '첫 번째 측정에서는 결과가 확률(P₀ = 0.75, P₁ = 0.25)로 정해져요. 하지만 측정한 순간 상태가 그 결과(0 또는 1)에 해당하는 상태로 바뀌었으므로, 같은 기준으로 다시 측정하면 <b>항상 같은 결과</b>가 나와요.',
        },
        {
          title: '기준을 바꾼 측정 결과 예측하기', manual: true,
          goal: '“0 상태로 준비” → “대각선 기준으로 측정” → “0/1 기준으로 측정”을 차례로 해 본 뒤, 확률을 예측해 문장을 완성하세요.',
          hint: '0 상태에서 대각선 기준으로 측정하면 + 와 −가 나올 확률은 cos²(0° − 45°) = 0.50이에요. 상태가 45° 또는 135°로 바뀐 뒤 0/1 기준으로 측정하면 P₀는 얼마일까요?',
          setup() { S.st.log = []; S.st.zRun = 0; S.st.zRes = []; S.st.armed = false; S.st.erased = false; S.st.anim = null; S.show.selC = true; SEL_C.reset(); setScene('again'); },
          check() {
            if (!S.st.erased) return '먼저 “0 상태(0°)로 준비” → “대각선 기준으로 측정” → “0/1 기준으로 측정”을 차례로 해 보세요.';
            return SEL_C.grade();
          },
          status: () => mark(S.st.armed) + ' 대각선 측정 &nbsp; ' + mark(S.st.erased) + ' 다시 0/1 측정 &nbsp; · 고른 문장 ' + SEL_C.count() + ' / 3',
          explain: '0 상태(θ = 0°)를 대각선 기준으로 측정하면 P(+) = cos²45° = 0.50, P(−) = 0.50이에요. 측정 후 상태는 45° 또는 135°가 되고, 다시 0/1 기준으로 측정하면 P₀ = cos²45° = cos²135° = 0.50이에요. 처음에 0이 확실했다는 정보가 <b>지워진</b> 거예요.',
        },
        {
          type: 'quiz', title: '다시 측정하면 왜 같은 결과일까',
          goal: '측정한 뒤 같은 기준으로 다시 측정하면 항상 같은 결과가 나오는 까닭은?',
          setup() { S.show.selC = false; setScene('again'); },
          choices: ['첫 측정으로 큐비트의 상태가 그 측정 결과에 해당하는 상태로 바뀌었기 때문에', '큐비트가 처음부터 그 값으로 정해져 있었기 때문에', '측정 장치가 처음 결과를 기억해서 같은 값을 보여 주기 때문에', '측정하면 큐비트가 사라져서 값이 변하지 않기 때문에'],
          answer: 0,
          feedback: ['', '처음에는 정해져 있지 않았어요(P₀ = 0.75, P₁ = 0.25의 확률이었어요). 측정이 결과를 정한 거예요.', '장치가 기억하는 것이 아니라 큐비트의 상태 자체가 바뀌었어요. 기준을 바꾸면 결과가 다시 확률적이라는 것이 증거예요.', '큐비트는 사라지지 않아요. 상태가 θ = 0° 또는 90°로 바뀌어 남아 있어요.'],
          explain: '측정은 단순한 관찰이 아니라 <b>상태를 바꾸는 행위</b>예요. 측정한 순간 큐비트는 결과에 해당하는 상태(0° 또는 90°)가 되므로 같은 기준으로 다시 측정하면 같은 결과가 나와요. 앞 차시에서 틈 검출기를 켜면 간섭무늬가 사라졌던 것도 “측정이 결과를 바꾼다”는 같은 성질이에요.',
        },
      ],
    },
    {
      title: '큐비트 여러 개: 값의 수는 2배씩', short: '큐비트 여러 개', icon: '🧮', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 큐비트 한 개는 측정하기 전에 0과 1이 중첩돼 있고, 측정하면 한 값만 얻는다는 것을 알았어요. 큐비트가 여러 개이면 어떻게 될까요? 통합과학에서 배운 비트 여러 개와 비교해 봐요.</div>' +
        '<p>큐비트 n개는 <b>2ⁿ가지 값</b>(예: 3개이면 000~111의 8가지)을 한꺼번에 중첩해서 가질 수 있어요. 하지만 측정하면 그중 <b>딱 한 값</b>만 얻어요. 비트 n개는 한 번에 한 값만 저장하지만 큐비트 n개는 2ⁿ가지 값에 걸친 중첩이에요. 그렇다고 양자 컴퓨터가 모든 답을 한꺼번에 읽는 것은 아니에요.</p>',
      features: ['multi'],
      setup() { S.mu.n = 3; slN.set(3); S.mu.th = 45; slU.set(45); S.mu.meas = 0; S.mu.res = null; S.mu.lastRes = null; S.mu.t = 9; S.mu.shown = 8; S.show.numIn = false; setScene('multi'); },
      recap: '큐비트 n개는 2ⁿ가지 값에 걸친 중첩을 만들 수 있어서 n이 늘수록 값의 수가 빠르게 늘어요(n = 10 → 1024, n = 50 → 약 1.1×10¹⁵). 하지만 측정하면 그중 딱 한 값만 얻어요.',
      summary: '<ul><li>큐비트 n개 → <b>2ⁿ가지</b> 값의 중첩: n = 1 → 2, n = 3 → 8, n = 10 → 1,024, n = 50 → 약 1.1×10¹⁵, n = 300 → 약 2×10⁹⁰(우주의 원자 수 약 10⁸⁰보다 많아요).</li><li>3큐비트(000~111): 각 값이 나올 확률이 있고(θ = 45°이면 모두 1/8 = 12.5 %), 측정하면 <b>8가지 중 딱 1개</b>만 얻어요.</li><li>비트 3개는 한 번에 <b>한 값</b>만 저장해요. 큐비트 3개는 8가지 값에 걸쳐 중첩될 수 있어요.</li><li>양자 컴퓨터가 “모든 답을 한꺼번에 읽는” 것은 아니에요. 측정하면 하나만 얻으므로, 원하는 답이 나올 확률이 커지도록 계산을 설계해야 해요.</li></ul>',
      missions: [
        {
          title: '3큐비트의 값 8가지 확인하기',
          goal: '큐비트의 수를 <b>n = 3</b>으로 맞추고, 격자의 칸이 <b>8개</b>인 것을 확인한 뒤 3큐비트를 <b>3번</b> 측정하세요.',
          hint: '“큐비트의 수 n”을 3으로 맞춰요. “3큐비트 측정하기”를 3번 눌러서 매번 얻는 값이 몇 개인지 보세요.',
          setup() { S.mu.meas = 0; S.mu.res = null; S.show.numIn = false; setScene('multi'); },
          check: () => S.mode === 'multi' && S.mu.n === 3 && S.mu.meas >= 3,
          hold: 0.8,
          status: () => mark(S.mu.n === 3) + ' n = ' + S.mu.n + ' (칸 ' + pw2(S.mu.n) + '개) &nbsp; ' + mark(S.mu.meas >= 3) + ' 측정 ' + S.mu.meas + ' / 3번',
          explain: '큐비트 3개는 2 × 2 × 2 = 8가지 값(000~111)에 걸쳐 중첩될 수 있어요. 측정할 때마다 8가지 중 <b>딱 1개</b>의 값만 얻어요. θ = 45°에서는 8가지가 모두 1/8의 확률이라 측정할 때마다 다른 값이 나와요.',
        },
        {
          title: '값의 수 계산하기', manual: true,
          goal: '큐비트 3개와 10개가 가질 수 있는 값의 수를 계산해 입력하세요. n을 10까지 올려 격자를 보고 확인해도 좋아요.',
          hint: '큐비트가 하나 늘 때마다 값의 수가 2배가 돼요. 3개는 2×2×2, 10개는 2를 10번 곱해요.',
          setup() { S.show.numIn = true; $('#n3').value = ''; $('#n10').value = ''; $('#n3').classList.remove('ok', 'bad'); $('#n10').classList.remove('ok', 'bad'); numKeys.n3 = ''; numKeys.n10 = ''; setScene('multi'); },
          check: () => gradeNums(),
          status: () => mark($('#n3').value.trim() !== '') + ' 3큐비트 입력 &nbsp; ' + mark($('#n10').value.trim() !== '') + ' 10큐비트 입력',
          explain: '큐비트 n개의 값의 수는 2ⁿ이에요. n = 3이면 2³ = 8, n = 10이면 2¹⁰ = 1,024예요. n = 50이면 약 1.1×10¹⁵, n = 300이면 약 2×10⁹⁰으로 우주의 원자 수(약 10⁸⁰)보다 많아져요.',
        },
        {
          type: 'quiz', title: '모든 값을 한꺼번에 읽을 수 있을까',
          goal: '큐비트 50개는 약 1.1×10¹⁵가지 값에 걸쳐 중첩될 수 있어요. 그런데 측정하면 이 모든 값의 정보를 한꺼번에 읽을 수 없는 까닭은?',
          setup() { S.show.numIn = false; setScene('multi'); },
          choices: ['측정하면 중첩이 확률에 따라 하나의 값으로 정해져서, 그 값 하나만 얻기 때문에', '큐비트 50개를 한꺼번에 측정하는 장치가 없기 때문에', '큐비트는 값을 저장할 수 없기 때문에', '측정할수록 큐비트의 값이 계속 늘어나기 때문에'],
          answer: 0,
          feedback: ['', '장치의 문제가 아니라 원리의 문제예요. 한 번 측정하면 상태가 하나의 값으로 바뀌어요.', '큐비트는 중첩된 상태를 만들 수 있어요. 문제는 그 상태를 읽는(측정하는) 방식이에요.', '측정하면 값이 늘어나는 것이 아니라 한 값으로 줄어들어요.'],
          explain: '측정하면 중첩 상태가 확률에 따라 <b>한 값으로 바뀌고</b> 나머지 정보는 사라져요. 그래서 양자 컴퓨터는 “모든 답을 한꺼번에 읽는” 것이 아니라, 원하는 답이 높은 확률로 측정되도록 계산 과정을 설계해서 쓰는 거예요. 이것이 다음 차시 양자 컴퓨터의 핵심이에요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hq-superposition', mount: '#game', badge: '큐비트 탐험가', homeHref: '../../index.html#hq',
    featureLabels: { bit: '🪙 비트 상자 · 큐비트 평면 · 확률 막대', measure: '📏 측정 버튼 · 결과 기록 · 횟수 막대', again: '🔁 기준 바꾸기 · 상태 변화 · 측정 기록', multi: '🧮 큐비트 수 · 값의 격자 · 3큐비트 막대' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  resetBit();
  bSp[0].value = 1; bSp[0].target = 1;
  setScene('bit');
  updateCtl();
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    view.apply();
    aSp.update(dt); bSp.forEach((s) => s.update(dt)); zSp.forEach((s) => s.update(dt)); mSp.forEach((s) => s.update(dt));
    if (S.mode === 'measure') stepMeasure(dt); else S.ms.hShown = SciSim.approach(S.ms.hShown, S.ms.hTarget || 10, dt, 6);
    if (S.mode === 'again') stepAgain(dt);
    if (S.mode === 'multi') stepMulti(dt);
    ctx.clearRect(0, 0, VW, VH);
    if (S.mode === 'bit') drawBit(t); else if (S.mode === 'measure') drawMeasure(t, dt); else if (S.mode === 'again') drawAgain(t, dt); else { drawGrid(t, dt); drawBars3(t, dt); }
    drawBot();
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, MA, PL, PM, PR, PG, PB, SEL_A, SEL_B, SEL_C, slT, slN, slU, setScene, updateCtl, setTheta, planeGeom, planeTip, clearStats, addMeasure, stMeasure, stPrep, muMeasure, prob3, p0Of, pPlusOf, aSp, gradeNums, bitBox,
    perfPrep(m) { setScene(m || 'measure'); if (m === 'again') { setInterval(() => { stMeasure(Math.random() < 0.5 ? 'Z' : 'X'); }, 900); } else if (m === 'multi') { setInterval(() => muMeasure(), 1200); } else { addMeasure(1000); setInterval(() => addMeasure(10), 3000); } },
    get game() { return game; },
  };
})();
