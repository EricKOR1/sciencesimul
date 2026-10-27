/* 전자기와 양자 Ⅲ. 양자와 미시세계 - 공통 도우미 (이 차시 안에 포함) */
(function () {
  'use strict';
  const PH0 = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PH0 ? 480 : 800, VH = PH0 ? 680 : 560;
  const BG = '#eef2fa';
  /* ===== 공통 도우미 ===== */
  const { $, $$, clamp, Sound } = SciSim;
  const C = SciSim.color;
  const PHONE = PH0;
  const RM = SciSim.reduceMotion;
  const TAU = Math.PI * 2;
  const rad = Math.PI / 180;
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
  const pow10s = (e) => '10' + supOf(e);
  // 파장(nm) → 색 (가시광선 근사)
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
  const hexOf = (c) => '#' + c.map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
  const wlColor = (wl) => hexOf(wlRGB(wl));
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function gauss(rand) { rand = rand || Math.random; let u = 0; while (u === 0) u = rand(); const v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); }

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
  function mkSelRows(hostId, rows, onChange) {
    const host = $('#' + hostId); const sels = []; const vals = {}; const okS = {};
    rows.forEach((r, i) => {
      const row = document.createElement('div'); row.className = 'sel-row';
      row.innerHTML = '<div class="q">' + r.q + '</div>';
      const sel = document.createElement('select'); sel.className = 'sel-in'; sel.setAttribute('aria-label', r.q.replace(/<[^>]+>/g, ''));
      sel.innerHTML = '<option value="">— 고르기 —</option>' + r.opts.map((o, j) => '<option value="' + j + '">' + o + '</option>').join('');
      sel.addEventListener('change', () => { vals[i] = sel.value; sel.classList.remove('ok', 'bad'); delete okS[i]; Sound.click(); onChange && onChange(i, sel.value); });
      row.appendChild(sel); host.appendChild(row); sels.push(sel);
    });
    const ok = (i) => vals[i] !== undefined && vals[i] !== '' && +vals[i] === rows[i].ans;
    return {
      sels, vals, rows, ok,
      reset() { Object.keys(vals).forEach((k) => delete vals[k]); Object.keys(okS).forEach((k) => delete okS[k]); sels.forEach((s) => { s.value = ''; s.classList.remove('ok', 'bad'); }); },
      count() { return rows.filter((r, i) => vals[i] !== undefined && vals[i] !== '').length; },
      right() { return rows.filter((r, i) => ok(i)).length; },
      grade(missMsg, badMsg) {
        const miss = rows.filter((r, i) => vals[i] === undefined || vals[i] === '').length;
        if (miss) return missMsg || ('아직 고르지 않은 문장이 ' + miss + '개 있어요.');
        let bad = 0;
        rows.forEach((r, i) => {
          const o = ok(i);
          if (!o) bad++;
          if (!o && okS[i] !== false) { sels[i].classList.remove('ok', 'bad'); void sels[i].offsetWidth; sels[i].classList.add('bad'); }
          if (o) { sels[i].classList.remove('bad'); sels[i].classList.add('ok'); }
          okS[i] = o;
        });
        return bad ? (badMsg || '빨간 칸을 다시 골라 보세요.') : true;
      },
    };
  }
  // 숫자 입력 묶음: rows = [{q, unit, ans, tol(절댓값), hint}]
  function mkNum(hostId, rows, onChange) {
    const host = $('#' + hostId); const ins = []; const okS = {};
    rows.forEach((r, i) => {
      const row = document.createElement('div'); row.className = 'num-row';
      row.innerHTML = '<div class="q">' + r.q + '</div><div class="num-line"><input class="num-in" type="text" inputmode="decimal" autocomplete="off" aria-label="' + r.q.replace(/<[^>]+>/g, '') + '" placeholder="?"><span class="un">' + (r.unit || '') + '</span></div>';
      const inp = row.querySelector('input');
      inp.addEventListener('input', () => { inp.classList.remove('ok', 'bad'); delete okS[i]; onChange && onChange(i, inp.value); });
      host.appendChild(row); ins.push(inp);
    });
    const val = (i) => { const s = (ins[i].value || '').trim().replace(/[−–]/g, '-').replace(/,(?=\d{3}(?!\d))/g, '').replace(',', '.').replace(/\s+/g, ''); if (s === '') return null; const v = Number(s); return isFinite(v) ? v : NaN; };
    const ok = (i) => { const v = val(i); return v != null && !isNaN(v) && Math.abs(v - rows[i].ans) <= rows[i].tol + 1e-12; };
    return {
      ins, val, ok,
      reset() { ins.forEach((s) => { s.value = ''; s.classList.remove('ok', 'bad'); }); Object.keys(okS).forEach((k) => delete okS[k]); },
      count() { return rows.filter((r, i) => val(i) != null).length; },
      right() { return rows.filter((r, i) => ok(i)).length; },
      grade() {
        let miss = 0, nan = 0, bad = 0, msg = '';
        rows.forEach((r, i) => { const v = val(i); if (v == null) miss++; else if (isNaN(v)) nan++; });
        if (miss) return '숫자를 모두 입력하세요. (빈 칸 ' + miss + '개)';
        if (nan) return '숫자만 입력하세요. 예: 5.8';
        rows.forEach((r, i) => {
          const o = ok(i);
          if (!o) { bad++; if (!msg && r.hint) msg = r.hint; }
          if (!o && okS[i] !== false) { ins[i].classList.remove('ok', 'bad'); void ins[i].offsetWidth; ins[i].classList.add('bad'); }
          if (o) { ins[i].classList.remove('bad'); ins[i].classList.add('ok'); }
          okS[i] = o;
        });
        return bad ? (msg || '빨간 칸의 값을 다시 계산해 보세요.') : true;
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
  function barH(x, y, w, h, frac, col, bg) {
    ctx.fillStyle = bg || '#e3e8f2'; D.roundRect(x, y, w, h, h / 2); ctx.fill();
    const fw = clamp(frac, 0, 1) * w;
    if (fw > 0.5) { ctx.save(); D.roundRect(x, y, w, h, h / 2); ctx.clip(); ctx.fillStyle = col; ctx.fillRect(x, y, fw, h); ctx.restore(); }
  }
  // 영역 (태블릿 / 휴대폰)
  const MA = PHONE ? { x: 8, y: 8, w: 464, h: 664 } : { x: 12, y: 12, w: 776, h: 536 };
  // 읽음 칸 / 부가 도우미
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  let rlast = '';
  function setReadouts(L1, a, L2, b, L3, c) {
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }
  const koJosa = (w, a, b) => { const c = (w || '').charCodeAt((w || '').length - 1); const has = c >= 0xAC00 && c <= 0xD7A3 && ((c - 0xAC00) % 28) !== 0; return has ? a : b; };
  // 큰 원 안쪽에 들어가는 반짝임
  function sparkle(x, y, n, col) { if (RM) return; parts.burst(x, y, { count: n || 10, colors: col || ['#ffd54a', '#ffffff', '#ff9a5a'], speed: 110, life: 0.6, size: 3, gravity: 0 }); }


  /* =========================================================
     전자기와 양자 Ⅲ. 양자와 미시세계 - 터널 효과 (단원 5차시)
     성취기준 [12전자03-03] 터널 효과를 설명하고, 관련된 현상과 기술을 조사하여 발표할 수 있다.
     ① 모형: 고전과 양자 (공은 에너지가 부족하면 항상 되돌아오지만, 전자의 확률 파동은 장벽 안으로 스며들어 반대편에 남아요)
     ② 탐구: 장벽과 확률 (두께·높이·입자에 따른 모형 투과 확률, 100만 번 시도, 로그 그래프)
     ③ 적용: 주사 터널링 현미경 (거리 0.1 nm당 전류 1/10, 원자 배열 이미지)
     ④ 적용: 소자와 별 (트랜지스터 누설, 플래시 메모리, 알파 붕괴·핵융합)
     투과 확률을 구하는 식은 화면과 문구에 쓰지 않고, 시뮬레이션이 주는 '모형 값'만 읽어요. 슈뢰딩거 방정식 풀이는 다루지 않아요.
     ========================================================= */

  /* ---------- 상수·모형 (화면의 숫자와 모두 같은 값) ---------- */
  const KAP = 5.123, MPRO = 1836.15;                                   // 모형 상수 (표시하지 않음)
  const kapOf = (dV, m) => KAP * Math.sqrt(dV * m);                    // 장벽 안에서 파동이 줄어드는 정도 (nm⁻¹)
  const log10T = (d, dV, m) => -2 * kapOf(dV, m) * d / Math.LN10;      // 투과 확률의 상용로그
  const Tof = (d, dV, m) => Math.exp(-2 * kapOf(dV, m) * d);
  const NTRY = 1000000;                                                // 한 번에 시도하는 횟수
  const massOf = (p) => (p === 'p' ? MPRO : 1);
  const d1 = (v) => v / 10;                                            // 두께 슬라이더 값 → nm
  function fmtPct(lgT) {                                               // 투과 확률(%)을 보기 좋게
    const lg = lgT + 2;
    if (lg >= -6) { const v = Math.pow(10, lg); return (v >= 10 ? String(Math.round(v)) : Number(v.toPrecision(1)).toString()) + ' %'; }
    if (lg < -30) return '사실상 0 % (약 ' + pow10s(Math.round(lg)) + ' %)';
    return '약 ' + pow10s(Math.round(lg)) + ' %';
  }
  function fmtMeasured(count) {
    if (count === 0) return '0번 (0 %)';
    const pct = count / NTRY * 100;
    return count.toLocaleString('ko-KR') + '번 (' + Number(pct.toPrecision(2)).toString() + ' %)';
  }
  function binom(N, p) {                                               // 이항분포 표본 (근사)
    if (p <= 0) return 0;
    const mu = N * p;
    if (mu < 30) { const L = Math.exp(-mu); let k = 0, q = 1; do { k++; q *= Math.random(); } while (q > L && k < 200); return k - 1; }
    return Math.max(0, Math.min(N, Math.round(mu + Math.sqrt(mu * (1 - p)) * gauss())));
  }
  const I0 = 3.0, GAP0 = 0.5;                                          // 탐침: 거리 0.5 nm에서 전류 3 nA, 0.1 nm 멀어질 때마다 1/10
  const curOf = (gap) => I0 * Math.pow(10, -(gap - GAP0) / 0.1);       // nA
  const fmtI = (I) => (I >= 1 ? I.toFixed(1) + ' nA' : I >= 0.001 ? Math.round(I * 1000) + ' pA' : (I * 1000).toFixed(1) + ' pA');
  const leakOf = (t) => Math.pow(10, 5 - t);                           // 게이트 누설 전류 (5 nm일 때를 1로)
  const LEAK_WARN = 1000;                                              // 과열 경고 기준 (5 nm일 때의 1000배)
  const fmtLeak = (x) => '×' + Number(x.toPrecision(1)).toLocaleString('ko-KR');

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'cq', t: 0, dt: 0.016, fade: 0,
    show: { selQ: false, selP: false, selK: false },
    cq: { ball: null, bTry: 0, bPass: 0, shots: [], eN: 0, eP: 0, queue: 0, qt: 0, e100: 0, bHist: [], eHist: [] },
    pr: { v: 5, vh: '1', part: 'e', due: 0, run: null, rec: {}, last: null },
    st: { z: 0.5, gapV: 70, mode: 'ch', scan: null, guess: null, seenG: {}, parked: null, el: [] },
    dv: { sub: 'leak', t: 5, el: [], flash: { bit: 0, el: [] }, nat: { run: null, t: 0, alpha: null }, seenSub: { leak: true } },
  };
  let game = null;
  const MODE_LABEL = { cq: '⚽ 고전과 양자', prob: '📉 장벽과 확률', stm: '🔬 터널링 현미경', dev: '💾 소자와 별' };
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
      if (on && sub) on = sub.split(' ').indexOf(S.dv.sub) >= 0;
      const dm = n.getAttribute('data-match');
      if (on && dm) on = !!S.show[dm] || (!!game && game.free);
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    hSeg.set(S.pr.vh); pSeg.set(S.pr.part); mSeg.set(S.st.mode); subSeg.set(S.dv.sub);
    const sb = $('#bScan'); if (sb) sb.textContent = S.st.scan && S.st.scan.on ? '⏹ 스캔 멈추기' : '🔍 스캔 시작';
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));

  /* ---------- 컨트롤 ---------- */
  $('#bBall').addEventListener('click', () => { Sound.click(); rollBall(); });
  $('#bE1').addEventListener('click', () => { Sound.click(); S.cq.queue += 1; });
  $('#bE100').addEventListener('click', () => { Sound.click(); S.cq.queue += 100; S.cq.e100++; });
  $('#bClrQ').addEventListener('click', () => { Sound.click(); const Q = S.cq; Q.ball = null; Q.bTry = 0; Q.bPass = 0; Q.shots.length = 0; Q.eN = 0; Q.eP = 0; Q.queue = 0; Q.e100 = 0; Q.bHist.length = 0; Q.eHist.length = 0; });
  const slT = bindSlider('sT', (v) => d1(v).toFixed(1) + ' nm', (v) => { S.pr.v = +v; schedRun(); });
  const hSeg = bindSeg('hSeg', (v) => { S.pr.vh = v; schedRun(); });
  const pSeg = bindSeg('pSeg', (v) => { S.pr.part = v; schedRun(); });
  const slZ = bindSlider('sZ', (v) => (v / 100).toFixed(2) + ' nm', (v) => { S.st.gapV = +v; S.st.seenG[v] = true; stopScan(true); });
  const mSeg = bindSeg('mSeg', (v) => { S.st.mode = v; stopScan(true); });
  $('#bScan').addEventListener('click', () => { Sound.click(); const sc = S.st.scan; if (sc && sc.on) { sc.on = false; updateCtl(); } else startScan(); });
  const subSeg = bindSeg('subSeg', (v) => { S.dv.sub = v; S.dv.seenSub[v] = true; parts.clear(); updateCtl(); });
  const slL = bindSlider('sL', (v) => (v / 10).toFixed(1) + ' nm', (v) => { S.dv.t = v / 10; });
  $('#bWr').addEventListener('click', () => { Sound.click(); flashWrite(); });
  $('#bEr').addEventListener('click', () => { Sound.click(); flashErase(); });
  $('#bNat').addEventListener('click', () => { Sound.click(); startNat(); });

  const SEL_Q = mkSelRows('selQ', [
    { q: '에너지가 부족한 <b>공</b>이 언덕을 넘을 확률은', opts: ['0 %예요 (항상 되돌아와요)', '아주 작지만 0은 아니에요', '50 %예요'], ans: 0 },
    { q: '에너지가 부족한 <b>전자</b>가 장벽 반대편에서 발견될 확률은', opts: ['0 %예요', '100 %예요', '작지만 0이 아니에요'], ans: 2 },
    { q: '전자가 장벽을 통과하는 방식은', opts: ['장벽에 구멍을 뚫어요', '확률 파동이 장벽 안에서 줄어들면서도 반대편까지 이어져 확률적으로 통과해요', '몰래 에너지를 얻어서 넘어가요'], ans: 1 },
  ]);
  const SEL_P = mkSelRows('selP', [
    { q: '장벽 안에서 확률 파동의 크기는', opts: ['일정해요', '점점 커져요', '지수적으로 급격히 줄어들어요'], ans: 2 },
    { q: '장벽이 두꺼울수록 반대편에 남는 파동은', opts: ['더 작아져요', '더 커져요', '그대로예요'], ans: 0 },
    { q: '그래서 반대편에서 발견될 확률은', opts: ['두께와 관계없이 일정해요', '두께가 커질수록 급격히 작아져요', '두께가 커질수록 커져요'], ans: 1 },
  ]);
  const CARDS = [
    { q: '주사 터널링 현미경(STM)이 표면의 원자를 보는 데 써요', ans: 0, short: 'STM으로 원자 보기' },
    { q: '플래시 메모리에 전자를 넣고 빼서 정보를 저장해요', ans: 0, short: '플래시 메모리 쓰기' },
    { q: '터널 다이오드가 전자 회로에서 빠른 스위칭에 쓰여요', ans: 0, short: '터널 다이오드' },
    { q: '트랜지스터를 작게 만들수록 게이트 누설 전류가 늘어 발열이 커져요', ans: 1, short: '게이트 누설·발열' },
    { q: '칩 속 얇은 절연막에서 전자가 새어 나와 저장한 정보가 서서히 사라져요', ans: 1, short: '절연막 누설로 정보 손실' },
    { q: '태양 중심에서 양성자들이 장벽을 터널링해 핵융합이 일어나요', ans: 0, short: '태양의 핵융합' },
  ];
  const SEL_K = mkSelRows('selK', CARDS.map((c) => ({ q: c.q, ans: c.ans, opts: ['유용하게 쓰여요', '문제가 돼요'] })));

  /* ---------- 위치 ---------- */
  const cqLay = () => PHONE
    ? { a: { x: 8, y: 8, w: 464, h: 206 }, b: { x: 8, y: 222, w: 464, h: 250 }, c: { x: 8, y: 480, w: 464, h: 192 } }
    : { a: { x: 12, y: 12, w: 380, h: 330 }, b: { x: 402, y: 12, w: 386, h: 330 }, c: { x: 12, y: 350, w: 776, h: 198 } };

  /* ================= ① 고전과 양자 ================= */
  const BALL_FRAC = 0.55;                       // 공이 가진 에너지는 꼭대기까지 필요한 에너지의 55 %
  function ballGeom() {
    const A = cqLay().a, gy = A.y + A.h * (PHONE ? 0.62 : 0.66), xc = A.x + A.w * 0.62, Hh = PHONE ? 62 : 108, ws = A.w * 0.12;
    return { A, gy, xc, Hh, ws, g: 260, r: 9, x0: A.x + 34 };
  }
  const hillH = (G, x) => G.Hh * Math.exp(-0.5 * Math.pow((x - G.xc) / G.ws, 2));
  const hillP = (G, x) => -hillH(G, x) * (x - G.xc) / (G.ws * G.ws);
  const hillPP = (G, x) => hillH(G, x) * (Math.pow((x - G.xc) / G.ws, 2) - 1) / (G.ws * G.ws);
  function rollBall() {
    const G = ballGeom(), Q = S.cq;
    Q.ball = { x: G.x0, vx: Math.sqrt(2 * G.g * BALL_FRAC * G.Hh), hmax: 0, done: false, back: false };
  }
  function stepBall(dt) {
    const Q = S.cq, b = Q.ball; if (!b || b.done) return;
    const G = ballGeom();
    const n = 8, h = dt / n;
    for (let i = 0; i < n; i++) {
      const hp = hillP(G, b.x), hpp = hillPP(G, b.x), den = 1 + hp * hp;
      const ax = -G.g * hp / den - hp * hpp * b.vx * b.vx / den;
      b.vx += ax * h; b.x += b.vx * h;
      b.hmax = Math.max(b.hmax, hillH(G, b.x));
    }
    if (b.vx < 0) b.back = true;
    if (b.x < G.A.x + 14 && b.back) { b.done = true; Q.bTry++; Q.bHist.push(false); if (Q.bHist.length > 20) Q.bHist.shift(); sparkle(b.x + 6, G.gy - G.r, 6, ['#9aa5b8', '#fff']); }
    else if (b.x > G.xc + 3.2 * G.ws) { b.done = true; Q.bTry++; Q.bPass++; Q.bHist.push(true); if (Q.bHist.length > 20) Q.bHist.shift(); }
  }
  function qGeom() {
    const B = cqLay().b, d = 0.2;
    const cy = B.y + (PHONE ? 112 : 152), xl = B.x + B.w * 0.46, dpx = d * (PHONE ? 200 : 180), xr = xl + dpx;
    return { B, cy, xl, xr, dpx, d, left: B.x + 16, right: B.x + B.w - 16, bh: PHONE ? 130 : 190 };
  }
  function stepShots(dt) {
    const Q = S.cq, g = qGeom(), T0 = Tof(g.d, 1, 1);
    if (Q.queue > 0) { Q.qt -= dt; if (Q.qt <= 0) { Q.qt = Q.queue > 5 ? 0.035 : 0.2; Q.queue--; Q.shots.push({ t: 0, pass: Math.random() < T0, dy: rnd(-14, 14) }); } }
    for (let i = Q.shots.length - 1; i >= 0; i--) {
      const s = Q.shots[i]; s.t += dt / 1.0;
      if (s.t >= 1) {
        Q.shots.splice(i, 1); Q.eN++; Q.eHist.push(!!s.pass); if (Q.eHist.length > 100) Q.eHist.shift();
        if (s.pass) { Q.eP++; if (S.mode === 'cq') parts.burst(g.right - 6, g.cy + s.dy, { count: 8, colors: ['#ffb400', '#fff', '#3867f4'], speed: 90, life: 0.5, size: 3, gravity: 0 }); }
      }
    }
  }
  function shotPos(s, g) {
    const x0 = g.left + 6, xb = g.xl - 6;
    if (s.t < 0.45) { const q = s.t / 0.45; return { x: x0 + (xb - x0) * q, y: g.cy + s.dy, a: 1 }; }
    const q = (s.t - 0.45) / 0.55;
    if (s.pass) return { x: g.xr + 6 + (g.right - g.xr - 6) * q, y: g.cy + s.dy, a: 1 };
    return { x: xb - (xb - x0) * q * 0.85, y: g.cy + s.dy, a: 1 - q * 0.7 };
  }
  function drawWave(g, T0, t, ampS) {
    const lamp = 26, k = TAU / lamp, w = 5.2, amp0 = (PHONE ? 30 : 34) * (ampS || 1), kap = -0.5 * Math.log(T0) / g.dpx, rT = Math.sqrt(1 - T0), tt = RM ? 0 : t * w;
    ctx.save(); ctx.lineWidth = 2.6; ctx.lineJoin = 'round'; ctx.strokeStyle = '#3867f4';
    ctx.beginPath();
    for (let x = g.left; x <= g.xl; x += 2) { const u = x - g.xl; const y = amp0 * 0.5 * (Math.cos(k * u - tt) + rT * Math.cos(k * u + tt + 0.6)); if (x === g.left) ctx.moveTo(x, g.cy - y); else ctx.lineTo(x, g.cy - y); }
    ctx.stroke();
    ctx.strokeStyle = '#8b5cf6'; ctx.beginPath();
    for (let x = g.xl; x <= g.xr; x += 1.5) { const u = x - g.xl; const y = amp0 * 0.7 * Math.exp(-kap * u) * Math.cos(tt + 0.9); if (x === g.xl) ctx.moveTo(x, g.cy - y); else ctx.lineTo(x, g.cy - y); }
    ctx.stroke();
    ctx.strokeStyle = '#14a058'; ctx.beginPath();
    for (let x = g.xr; x <= g.right; x += 2) { const u = x - g.xr; const y = amp0 * 0.7 * Math.sqrt(T0) * Math.cos(k * u - tt + 0.9); if (x === g.xr) ctx.moveTo(x, g.cy - y); else ctx.lineTo(x, g.cy - y); }
    ctx.stroke();
    ctx.restore();
  }
  function drawBarrier(g, label) {
    const top = g.cy - g.bh / 2, bot = g.cy + g.bh / 2, w = g.xr - g.xl;
    D.shadow(() => { const gr = ctx.createLinearGradient(0, top, 0, bot); gr.addColorStop(0, '#c7b2f4'); gr.addColorStop(1, '#a98be6'); ctx.fillStyle = gr; ctx.fillRect(g.xl, top, w, bot - top); }, { blur: 6, y: 2 });
    ctx.strokeStyle = '#7a5bc8'; ctx.lineWidth = 1.6; ctx.strokeRect(g.xl, top, w, bot - top);
    ctx.strokeStyle = 'rgba(93,104,121,.45)'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(g.left, g.cy); ctx.lineTo(g.right, g.cy); ctx.stroke(); ctx.setLineDash([]);
    if (label) T(g.xl + w / 2, top - 6, label, PHONE ? 11.5 : 12.5, '#5b3fb0', 'center', 800);
  }
  function drawCq() {
    const { a: A, b: Bp, c: Cc } = cqLay(), Q = S.cq, G = ballGeom();
    // ---- A: 공과 언덕 ----
    panel(A.x, A.y, A.w, A.h, 14);
    T(A.x + 14, A.y + 22, '⚽ 고전: 공과 언덕', PHONE ? 13 : 14.5, '#26324a', 'left', 800);
    ctx.beginPath(); ctx.moveTo(A.x + 6, G.gy + 40);
    for (let x = A.x + 6; x <= A.x + A.w - 6; x += 3) ctx.lineTo(x, G.gy - hillH(G, x));
    ctx.lineTo(A.x + A.w - 6, G.gy + 40); ctx.closePath();
    const gr = ctx.createLinearGradient(0, G.gy - G.Hh, 0, G.gy + 40); gr.addColorStop(0, '#9bd08a'); gr.addColorStop(1, '#6aa75c'); ctx.fillStyle = gr; ctx.fill();
    ctx.strokeStyle = '#4b8a40'; ctx.lineWidth = 2; ctx.beginPath(); for (let x = A.x + 6; x <= A.x + A.w - 6; x += 3) { const y = G.gy - hillH(G, x); if (x === A.x + 6) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke();
    // 꼭대기 높이와 공이 도달한 높이
    ctx.strokeStyle = '#e2464b'; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(G.xc - 70, G.gy - G.Hh); ctx.lineTo(G.xc + 70, G.gy - G.Hh); ctx.stroke(); ctx.setLineDash([]);
    T(G.xc + 72, G.gy - G.Hh + 4, '꼭대기', 12, '#e2464b', 'left', 800);
    const b = Q.ball;
    if (b) {
      if (b.hmax > 2) { ctx.strokeStyle = '#3867f4'; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(G.xc - 55, G.gy - b.hmax); ctx.lineTo(G.xc + 55, G.gy - b.hmax); ctx.stroke(); ctx.setLineDash([]); }
      const hp = hillP(G, b.x), nrm = Math.sqrt(1 + hp * hp), bx = b.x - hp / nrm * G.r, by = G.gy - hillH(G, b.x) - G.r / nrm;
      D.sphere(bx, by, G.r, '#f26b3a', { shadow: true });
    } else D.sphere(G.x0, G.gy - G.r, G.r, '#f26b3a', { shadow: true });
    if (b && b.done && !b.back) { /* 넘은 경우는 없음 */ }
    // 에너지 막대
    const ey = A.y + A.h - (PHONE ? 36 : 50), bw = A.w - 150;
    T(A.x + 14, ey + 11, '가진 에너지', 12.5, '#26324a', 'left', 800); barH(A.x + 116, ey, bw, 13, BALL_FRAC, '#3867f4');
    T(A.x + 14, ey + 30, '꼭대기까지 필요', 12.5, '#26324a', 'left', 800); barH(A.x + 116, ey + 19, bw, 13, 1, '#e2464b');
    if (!PHONE) T(A.x + A.w - 14, A.y + 22, '필요한 에너지 > 가진 에너지', 12.5, '#e2464b', 'right', 800);

    // ---- B: 전자의 확률 파동 ----
    const g = qGeom(), T0 = Tof(g.d, 1, 1);
    panel(Bp.x, Bp.y, Bp.w, Bp.h, 14);
    T(Bp.x + 14, Bp.y + 22, '🔵 양자: 전자의 확률 파동', PHONE ? 13 : 14.5, '#26324a', 'left', 800);
    drawBarrier(g, '장벽');
    drawWave(g, T0, S.t);
    T(g.left, g.cy - g.bh / 2 - 6 + 0, '입사 + 반사', PHONE ? 11.5 : 12.5, '#3867f4', 'left', 800);
    T(g.right, g.cy - g.bh / 2 - 6, '약한 파동', PHONE ? 11.5 : 12.5, '#0f7a42', 'right', 800);
    T(g.xl + (g.xr - g.xl) / 2, g.cy + g.bh / 2 + 16, '장벽 안: 줄어들어요', PHONE ? 11.5 : 12.5, '#7a5bc8', 'center', 800);
    Q.shots.forEach((s) => { const p = shotPos(s, g); ctx.globalAlpha = p.a; D.glow(p.x, p.y, 10, '#ffd54a', 0.7); D.sphere(p.x, p.y, 4.4, '#3867f4'); ctx.globalAlpha = 1; });
    T(Bp.x + 14, Bp.y + Bp.h - (PHONE ? 30 : 36), '장벽 두께 0.2 nm · 입자 에너지는 장벽 높이보다 1.0 eV 낮아요', PHONE ? 11.5 : 12.5, '#5d6879', 'left', 700);
    T(Bp.x + 14, Bp.y + Bp.h - 12, '오른쪽에서 발견: ' + Q.eP + ' / ' + Q.eN + '개', PHONE ? 13 : 14.5, '#0f7a42', 'left', 800);

    // ---- C: 비교 ----
    panel(Cc.x, Cc.y, Cc.w, Cc.h, 14);
    const fs = PHONE ? 12.5 : 13.5;
    const c1 = Cc.x + 14, c2 = PHONE ? Cc.x + 14 : Cc.x + 300, r1 = Cc.y + 24, r2 = PHONE ? Cc.y + 96 : Cc.y + 24;
    const sq = (x, y, arr, cols, pitch, size) => { arr.forEach((v, i) => { ctx.fillStyle = v ? '#14a058' : '#cdd5e2'; ctx.fillRect(x + (i % cols) * pitch, y + Math.floor(i / cols) * pitch, size, size); }); };
    T(c1, r1, '⚽ 공 (고전)', fs + 0.5, '#26324a', 'left', 800);
    T(c1, r1 + 22, '굴린 횟수 ' + Q.bTry + '번 · 넘은 횟수 ' + Q.bPass + '번', fs, '#26324a', 'left', 800);
    T(c1, r1 + 42, Q.bTry ? '확률 ' + Math.round(Q.bPass / Q.bTry * 100) + ' % (에너지 보존)' : '확률 0 % (에너지 보존)', fs, '#e2464b', 'left', 800);
    if (!PHONE) { ctx.strokeStyle = '#e3e8f2'; ctx.lineWidth = 1; ctx.strokeRect(c1, r1 + 56, 20 * 12 - 1, 12); }
    sq(c1, PHONE ? r1 + 50 : r1 + 56, Q.bHist, 20, PHONE ? 12 : 12, PHONE ? 10 : 10);
    T(c2, r2, '🔵 전자 (양자)', fs + 0.5, '#26324a', 'left', 800);
    T(c2, r2 + 22, '쏜 개수 ' + Q.eN + '개 · 반대편에서 발견 ' + Q.eP + '개', fs, '#26324a', 'left', 800);
    T(c2, r2 + 42, Q.eN ? '발견 비율 ' + Math.round(Q.eP / Q.eN * 100) + ' % (모형 값 ' + fmtPct(log10T(0.2, 1, 1)) + ')' : '모형 값 ' + fmtPct(log10T(0.2, 1, 1)), fs, '#0f7a42', 'left', 800);
    sq(c2, r2 + (PHONE ? 52 : 56), Q.eHist, 25, PHONE ? 10 : 11, PHONE ? 8.5 : 9.5);
    if (!PHONE) { const ly = r2 + 56 + 4 * 11 + 8; ctx.fillStyle = '#14a058'; ctx.fillRect(c2, ly, 10, 10); T(c2 + 15, ly + 9, '반대편에서 발견', 12, '#5d6879', 'left', 700); ctx.fillStyle = '#cdd5e2'; ctx.fillRect(c2 + 112, ly, 10, 10); T(c2 + 127, ly + 9, '되돌아옴 (최근 100개)', 12, '#5d6879', 'left', 700); }
    if (!PHONE) textBlock(Cc.x + 590, r1 - 6, 174, '공은 에너지가 부족하면 확률이 0 %지만, 전자는 0 %가 아니에요. 한 개씩은 예측할 수 없어도 많이 쏘면 일부가 반대편에 나타나요.', 13, '#5d6879', 18, 700);
    else T(Cc.x + 14, Cc.y + Cc.h - 10, '공은 0 %, 전자는 작지만 0 %가 아니에요.', 12, '#5d6879', 'left', 700);
  }

  /* ================= ② 장벽과 확률 ================= */
  const prLay = () => PHONE
    ? { a: { x: 8, y: 8, w: 464, h: 176 }, b: { x: 8, y: 192, w: 464, h: 262 }, c: { x: 8, y: 462, w: 464, h: 210 } }
    : { a: { x: 12, y: 12, w: 776, h: 188 }, b: { x: 12, y: 210, w: 390, h: 338 }, c: { x: 412, y: 210, w: 376, h: 338 } };
  const prDv = () => +S.pr.vh;
  const prLg = (v) => log10T(d1(v), prDv(), massOf(S.pr.part));
  const REC_V = [2, 5, 10];
  function schedRun() { S.pr.due = S.t + 0.45; S.pr.run = null; }
  function stepPr(dt) {
    const P = S.pr;
    if (P.due && S.t >= P.due && S.mode === 'prob') {
      P.due = 0;
      const key = P.v, p = Tof(d1(P.v), prDv(), massOf(P.part));
      P.run = { t: 0, count: binom(NTRY, p), v: key, vh: P.vh, part: P.part };
    }
    if (P.run) {
      P.run.t += dt / 0.9;
      if (P.run.t >= 1) {
        const r = P.run; P.run = null;
        P.last = { count: r.count, v: r.v, vh: r.vh, part: r.part };
        if (r.part === 'e' && r.vh === '1' && REC_V.indexOf(r.v) >= 0) P.rec[r.v] = r.count;
        Sound.tick();
        if (S.mode === 'prob') { const g = prGeom(); if (r.count > 0) sparkle(g.xr + 60, g.cy, 10); }
      }
    }
  }
  function prGeom() {
    const A = prLay().a, cy = A.y + A.h / 2 + (PHONE ? 16 : 20), pxn = PHONE ? 140 : 190;
    const d = d1(S.pr.v), xl = A.x + (PHONE ? 150 : 250), dpx = d * pxn, xr = xl + dpx;
    return { A, cy, xl, xr, dpx, d, left: A.x + 16, right: A.x + A.w - 16, bh: PHONE ? 88 : 112, pxn };
  }
  function drawPr() {
    const { a: A, b: Bp, c: Cc } = prLay(), P = S.pr, g = prGeom();
    const lg = prLg(P.v), T0 = Math.pow(10, lg), m = massOf(P.part);
    // A: 장벽과 파동
    panel(A.x, A.y, A.w, A.h, 14);
    T(A.x + 14, A.y + 22, (P.part === 'e' ? '전자' : '양성자') + '가 두께 ' + g.d.toFixed(1) + ' nm 장벽을 만났을 때의 확률 파동 (모형)', PHONE ? 12.5 : 14.5, '#26324a', 'left', 800);
    drawBarrier(g, '두께 ' + g.d.toFixed(1) + ' nm');
    // 장벽 안에서 줄어드는 정도: 투과 확률 T0 에서 정해진 값
    const T0w = Math.max(T0, 1e-300);
    const kapPx = -0.5 * Math.log(T0w) / Math.max(g.dpx, 1);
    const lamp = 26, k = TAU / lamp, tt = RM ? 0 : S.t * 5.2, amp0 = 30;
    ctx.save(); ctx.lineWidth = 2.6; ctx.lineJoin = 'round'; ctx.strokeStyle = '#3867f4'; ctx.beginPath();
    for (let x = g.left; x <= g.xl; x += 2) { const u = x - g.xl; const y = amp0 * 0.5 * (Math.cos(k * u - tt) + Math.sqrt(Math.max(0, 1 - T0)) * Math.cos(k * u + tt + 0.6)); if (x === g.left) ctx.moveTo(x, g.cy - y); else ctx.lineTo(x, g.cy - y); }
    ctx.stroke(); ctx.strokeStyle = '#8b5cf6'; ctx.beginPath();
    for (let x = g.xl; x <= g.xr; x += 1.5) { const u = x - g.xl; const y = amp0 * 0.7 * Math.exp(-Math.min(60, kapPx * u)) * Math.cos(tt + 0.9); if (x === g.xl) ctx.moveTo(x, g.cy - y); else ctx.lineTo(x, g.cy - y); }
    ctx.stroke(); ctx.strokeStyle = '#14a058'; ctx.beginPath();
    for (let x = g.xr; x <= g.right; x += 2) { const u = x - g.xr; const y = amp0 * 0.7 * Math.sqrt(T0) * Math.cos(k * u - tt + 0.9); if (x === g.xr) ctx.moveTo(x, g.cy - y); else ctx.lineTo(x, g.cy - y); }
    ctx.stroke(); ctx.restore();
    T(g.left, g.cy - g.bh / 2 - 6, '입사 + 반사', PHONE ? 11.5 : 12.5, '#3867f4', 'left', 800);
    T(g.right, g.cy - g.bh / 2 - 6, T0 < 1e-9 ? '남은 파동: 사실상 없어요' : '남은 파동: 통과 확률이 클수록 커요', PHONE ? 11.5 : 12.5, '#0f7a42', 'right', 800);
    // 100만 번 시도 진행
    const px = A.x + A.w - 16;
    if (P.run) { barH(px - 160, A.y + A.h - 26, 160, 10, P.run.t, '#3867f4'); T(px - 170, A.y + A.h - 17, NTRY.toLocaleString('ko-KR') + '번 시도 중…', 12.5, '#3867f4', 'right', 800); }
    else if (P.due) T(px, A.y + A.h - 17, '곧 100만 번을 시도해요…', 12.5, '#5d6879', 'right', 700);
    else if (P.last) T(px, A.y + A.h - 17, NTRY.toLocaleString('ko-KR') + '번 시도 → 통과 ' + P.last.count.toLocaleString('ko-KR') + '번', 13, '#0f7a42', 'right', 800);

    // B: 로그 그래프
    panel(Bp.x, Bp.y, Bp.w, Bp.h, 14);
    T(Bp.x + 14, Bp.y + 22, '장벽 두께와 통과 확률 (세로축은 로그 눈금)', PHONE ? 12.5 : 14, '#26324a', 'left', 800);
    const pad = PHONE ? { l: 78, r: 14, t: 36, b: 56 } : { l: 84, r: 20, t: 40, b: 60 };
    const ax = axes(Bp.x + pad.l, Bp.y + pad.t, Bp.w - pad.l - pad.r, Bp.h - pad.t - pad.b, { xmin: 0, xmax: 1.5, ymin: -8, ymax: 2, xt: [0, 0.5, 1.0, 1.5].map((v) => [v, v.toFixed(1)]), yt: [[2, '100 %'], [0, '1 %'], [-2, '0.01 %'], [-4, '10⁻⁴ %'], [-6, '10⁻⁶ %'], [-8, '10⁻⁸ %']], xl: '장벽 두께 d (nm)', yl: '통과 확률', ylx: 62, fs: 11.5 });
    ctx.save(); ctx.beginPath(); ctx.rect(ax.x, ax.y, ax.w, ax.h); ctx.clip();
    ctx.strokeStyle = P.part === 'e' ? '#3867f4' : '#e2464b'; ctx.lineWidth = 2.6; ctx.beginPath(); let started = false, allLow = true;
    for (let v = 1; v <= 15; v += 0.25) { const y = clamp(prLg(v) + 2, -8, 2); if (y > -8 + 1e-9) allLow = false; const px2 = ax.X(d1(v)), py = ax.Y(y); if (!started) { ctx.moveTo(px2, py); started = true; } else ctx.lineTo(px2, py); }
    ctx.stroke();
    ctx.restore();
    // 모형 점 (0.2, 0.5, 1.0 nm)
    REC_V.forEach((v) => {
      const y = prLg(v) + 2, px2 = ax.X(d1(v)), inR = y >= -8;
      ctx.strokeStyle = 'rgba(93,104,121,.5)'; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(px2, ax.Y(2)); ctx.lineTo(px2, ax.Y(-8)); ctx.stroke(); ctx.setLineDash([]);
      if (inR) { D.sphere(px2, ax.Y(y), 4.5, '#8b5cf6'); }
    });
    const cyv = prLg(P.v) + 2, cxp = ax.X(d1(P.v));
    if (cyv >= -8) { D.sphere(cxp, ax.Y(cyv), 7, '#e2464b', { shadow: true }); const lb = fmtPct(prLg(P.v)); D.label(clamp(cxp + 8, ax.x + 60, ax.x + ax.w - 60), clamp(ax.Y(cyv) - 18, ax.y + 14, ax.y + ax.h - 14), lb, { size: 12.5, bg: '#e2464b' }); }
    else { ctx.fillStyle = '#e2464b'; ctx.beginPath(); ctx.moveTo(cxp - 8, ax.Y(-8) - 14); ctx.lineTo(cxp + 8, ax.Y(-8) - 14); ctx.lineTo(cxp, ax.Y(-8) - 2); ctx.closePath(); ctx.fill(); D.label(clamp(cxp, ax.x + 70, ax.x + ax.w - 70), ax.Y(-8) - 28, '그래프 아래로 벗어나요 ▼', { size: 11.5, bg: '#e2464b' }); }
    if (allLow) T(ax.x + ax.w / 2, ax.y + ax.h / 2, '곡선 전체가 그래프 아래예요', 13, '#e2464b', 'center', 800);

    // C: 기록
    panel(Cc.x, Cc.y, Cc.w, Cc.h, 14);
    T(Cc.x + 14, Cc.y + 22, '기록: 전자 · 장벽 높이 1.0 eV', PHONE ? 12.5 : 14, '#26324a', 'left', 800);
    const fs = PHONE ? 12 : 13.5;
    const cx0 = Cc.x + 14, cx1 = Cc.x + (PHONE ? 74 : 84), cx2 = Cc.x + (PHONE ? 230 : 232), cx3 = Cc.x + (PHONE ? 350 : 316);
    T(cx0, Cc.y + 48, '두께', fs - 0.5, '#5d6879', 'left', 800); T(cx1, Cc.y + 48, '100만 번 중 통과', fs - 0.5, '#5d6879', 'left', 800); T(cx3, Cc.y + 48, '모형 값', fs - 0.5, '#5d6879', 'left', 800);
    ctx.fillStyle = '#e3e8f2'; ctx.fillRect(Cc.x + 10, Cc.y + 55, Cc.w - 20, 1.5);
    REC_V.forEach((v, i) => {
      const y = Cc.y + 80 + i * 30, c = P.rec[v];
      T(cx0, y, d1(v).toFixed(1) + ' nm', fs, '#26324a', 'left', 800);
      if (c === undefined) T(cx1, y, '아직 측정 안 했어요', fs, '#9aa5b8', 'left', 700);
      else T(cx1, y, fmtMeasured(c), fs, '#0f7a42', 'left', 800);
      T(cx3, y, fmtPct(log10T(d1(v), 1, 1)), fs, '#7a5bc8', 'left', 800);
    });
    const ly = Cc.y + 80 + 3 * 30 + 6;
    ctx.fillStyle = '#e3e8f2'; ctx.fillRect(Cc.x + 10, ly - 18, Cc.w - 20, 1.5);
    if (P.last) {
      const lv = P.last; const lgv = log10T(d1(lv.v), +lv.vh, massOf(lv.part));
      T(cx0, ly + 4, '방금 시도: ' + (lv.part === 'e' ? '전자' : '양성자') + ' · 두께 ' + d1(lv.v).toFixed(1) + ' nm · 높이 ' + (+lv.vh).toFixed(1) + ' eV', fs - 0.5, '#26324a', 'left', 800);
      T(cx0, ly + 26, '통과 ' + (lv.count === 0 ? '0번' : lv.count.toLocaleString('ko-KR') + '번') + ' · 모형 확률 ' + fmtPct(lgv), fs, '#0f7a42', 'left', 800);
    } else T(cx0, ly + 6, '슬라이더를 움직이면 100만 번을 시도해요', fs - 0.5, '#5d6879', 'left', 700);
    if (!PHONE) textBlock(Cc.x + 14, Cc.y + Cc.h - 54, Cc.w - 28, '두께가 두 배가 되면 확률은 반이 아니라 수십~수백 배로 줄어요. 양성자(질량이 전자의 약 1800배)는 같은 조건에서도 사실상 0이에요.', 12.5, '#5d6879', 17, 700);
  }

  /* ================= ③ 주사 터널링 현미경 ================= */
  const AT = { cols: 7, rows: 4, sp: 0.25, ox: 0.125, oy: 0.125, W: 1.75, H: 1.0, hA: 0.10, sg: 0.06, px: 0.025 };
  const NXP = Math.round(AT.W / AT.px), NYP = Math.round(AT.H / AT.px);
  const VACS = [[1, 1], [2, 2], [4, 1], [5, 2], [4, 2]];
  const VAC = VACS[Math.floor(Math.random() * VACS.length)];
  const PARK = { i: 3, j: 1 };
  const atX = (i) => AT.ox + AT.sp * i, atY = (j) => AT.oy + AT.sp * j;
  function hAt(x, y) {
    let h = 0;
    for (let i = 0; i < AT.cols; i++) for (let j = 0; j < AT.rows; j++) {
      if (i === VAC[0] && j === VAC[1]) continue;
      const dx = x - atX(i), dy = y - atY(j); if (Math.abs(dx) > 0.3 || Math.abs(dy) > 0.3) continue;
      h += AT.hA * Math.exp(-(dx * dx + dy * dy) / (2 * AT.sg * AT.sg));
    }
    return h;
  }
  const parkX = () => atX(PARK.i), parkY = () => atY(PARK.j);
  const hPark = () => hAt(parkX(), parkY());
  function pixelVal(mode, h, z) {
    if (mode === 'ch') { const I = curOf(z - h), lo = Math.log10(curOf(z)), hi = Math.log10(curOf(z - AT.hA)); return { I, b: clamp((Math.log10(I) - lo) / (hi - lo), 0, 1), tr: Math.log10(I) }; }
    return { I: I0, b: clamp(h / AT.hA, 0, 1), tr: h + GAP0 };
  }
  function startScan() {
    const St = S.st;
    St.guess = null;
    St.scan = { on: true, k: 0, mode: St.mode, z: St.gapV / 100 + hPark(), img: new Float32Array(NXP * NYP).fill(-1), trace: [], done: false, rowTr: [] };
    updateCtl();
  }
  function stopScan(clear) {
    const St = S.st;
    if (St.scan) { St.scan.on = false; if (clear) { St.scan = null; St.guess = null; } }
    updateCtl();
  }
  function stepScan(dt) {
    const sc = S.st.scan; if (!sc || !sc.on) return;
    const n = Math.max(1, Math.round(dt * 700));
    for (let q = 0; q < n && sc.k < NXP * NYP; q++) {
      const ix = sc.k % NXP, iy = Math.floor(sc.k / NXP), x = (ix + 0.5) * AT.px, y = (iy + 0.5) * AT.px;
      const h = hAt(x, y), pv = pixelVal(sc.mode, h, sc.z);
      sc.img[sc.k] = pv.b;
      if (ix === 0) sc.rowTr = [];
      sc.rowTr.push(pv.tr);
      sc.k++;
    }
    if (sc.k >= NXP * NYP) { sc.on = false; sc.done = true; Sound.success(); updateCtl(); }
  }
  const stLay = () => PHONE
    ? { a: { x: 8, y: 8, w: 464, h: 188 }, b: { x: 8, y: 204, w: 464, h: 144 }, c: { x: 8, y: 356, w: 464, h: 316 } }
    : { a: { x: 12, y: 12, w: 380, h: 258 }, b: { x: 402, y: 12, w: 386, h: 258 }, c: { x: 12, y: 280, w: 776, h: 268 } };
  function tipState() {
    const sc = S.st.scan;
    if (sc && (sc.on || sc.done)) {
      const k = Math.min(sc.k, NXP * NYP - 1), ix = k % NXP, iy = Math.floor(k / NXP);
      const x = sc.done ? parkX() : (ix + 0.5) * AT.px, y = sc.done ? parkY() : (iy + 0.5) * AT.px;
      const h = hAt(x, y);
      if (sc.mode === 'cc') { return { x, y, z: h + GAP0, gap: GAP0, I: I0, scanning: sc.on }; }
      return { x, y, z: sc.z, gap: sc.z - h, I: curOf(sc.z - h), scanning: sc.on };
    }
    const gap = S.st.gapV / 100, z = gap + hPark();
    return { x: parkX(), y: parkY(), z, gap, I: curOf(gap), scanning: false };
  }
  function stepStmEl(dt) {
    if (S.mode !== 'stm') return;
    const ts = tipState(), rate = clamp(4 * Math.sqrt(Math.max(ts.I, 0.0005)), 0.3, 20) * dt;
    if (Math.random() < rate) S.st.el.push({ t: 0, dx: rnd(-0.04, 0.04) });
    for (let i = S.st.el.length - 1; i >= 0; i--) { S.st.el[i].t += dt / 0.45; if (S.st.el[i].t >= 1) S.st.el.splice(i, 1); }
  }
  function drawStm() {
    const { a: A, b: Bp, c: Cc } = stLay(), St = S.st, ts = tipState();
    // ---- A: 옆에서 본 탐침 ----
    panel(A.x, A.y, A.w, A.h, 14);
    T(A.x + 14, A.y + 22, '탐침과 표면 (옆에서 본 단면)', PHONE ? 12.5 : 14.5, '#26324a', 'left', 800);
    const ppn = Math.min((A.w - 40) / AT.W, (A.h - (PHONE ? 100 : 118)) / 1.0), x0 = A.x + (A.w - AT.W * ppn) / 2, base = A.y + A.h - (PHONE ? 40 : 46);
    const X = (nm) => x0 + nm * ppn, Y = (nm) => base - nm * ppn;
    // 표면 단면
    ctx.beginPath(); ctx.moveTo(X(0), base + 14);
    for (let u = 0; u <= AT.W + 1e-9; u += 0.01) ctx.lineTo(X(u), Y(hAt(u, ts.y)));
    ctx.lineTo(X(AT.W), base + 14); ctx.closePath(); ctx.fillStyle = '#c9d2e3'; ctx.fill();
    ctx.strokeStyle = '#7f93bd'; ctx.lineWidth = 1.6; ctx.stroke();
    // 원자 (가장 가까운 원자 줄)
    let jn = 0, bd = 9; for (let j = 0; j < AT.rows; j++) { const dd = Math.abs(ts.y - atY(j)); if (dd < bd) { bd = dd; jn = j; } }
    const rA = 0.085;
    for (let i = 0; i < AT.cols; i++) {
      if (i === VAC[0] && jn === VAC[1]) { ctx.strokeStyle = 'rgba(93,104,121,.55)'; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(X(atX(i)), Y(AT.hA - rA), rA * ppn, 0, TAU); ctx.stroke(); ctx.setLineDash([]); continue; }
      ctx.globalAlpha = bd < 0.07 ? 1 : 0.4; D.sphere(X(atX(i)), Y(AT.hA - rA), rA * ppn, '#5b7bd4'); ctx.globalAlpha = 1;
    }
    // 탐침
    const tx = X(ts.x), ty = Y(ts.z);
    const tip = () => { ctx.beginPath(); ctx.moveTo(tx - 4, ty); ctx.lineTo(tx + 4, ty); ctx.lineTo(tx + 26, ty - 62); ctx.lineTo(tx - 26, ty - 62); ctx.closePath(); };
    D.shadow(() => { tip(); const gr = ctx.createLinearGradient(tx - 26, 0, tx + 26, 0); gr.addColorStop(0, '#c0c8d6'); gr.addColorStop(0.5, '#eef2f8'); gr.addColorStop(1, '#9aa5b8'); ctx.fillStyle = gr; ctx.fill(); }, { blur: 6, y: 3 });
    ctx.fillStyle = '#9aa5b8'; ctx.fillRect(tx - 26, ty - 76, 52, 14);
    // 터널 전자
    St.el.forEach((e) => { const ey = ty + (Y(hAt(ts.x + e.dx, ts.y)) - ty) * e.t, ex = tx + e.dx * ppn * 0.6; ctx.globalAlpha = Math.sin(e.t * Math.PI); D.sphere(ex, ey, 2.8, '#ffb400', { gloss: false }); ctx.globalAlpha = 1; });
    // 거리 표시
    const surfY = Y(hAt(ts.x, ts.y));
    if (surfY - ty > 12) { D.arrow(tx + 34, surfY, tx + 34, ty, { color: '#e2464b', width: 2, head: 7 }); D.arrow(tx + 34, ty, tx + 34, surfY, { color: '#e2464b', width: 2, head: 7 }); D.label(tx + 34 + 46, (surfY + ty) / 2, ts.gap.toFixed(2) + ' nm', { size: 12.5, bg: '#e2464b' }); }
    D.label(A.x + A.w - 14, A.y + 24, ts.scanning ? '스캔 중' : St.scan && St.scan.done ? '스캔 완료' : '탐침 고정', { size: 12, bg: ts.scanning ? '#14a058' : '#5d6879', align: 'right' });
    T(A.x + 14, A.y + A.h - 10, '탐침 전류 I = ' + fmtI(ts.I) + (St.scan && St.scan.mode === 'cc' && (St.scan.on || St.scan.done) ? ' (일정)' : ''), PHONE ? 12.5 : 14, '#26324a', 'left', 800);

    // ---- B: 거리에 따른 전류 (로그) ----
    panel(Bp.x, Bp.y, Bp.w, Bp.h, 14);
    T(Bp.x + 14, Bp.y + 22, '거리와 터널 전류 (세로축은 로그 눈금)', PHONE ? 12.5 : 14, '#26324a', 'left', 800);
    const pad = PHONE ? { l: 62, r: 16, t: 34, b: 44 } : { l: 68, r: 20, t: 38, b: 52 };
    const ax = axes(Bp.x + pad.l, Bp.y + pad.t, Bp.w - pad.l - pad.r, Bp.h - pad.t - pad.b, { xmin: 0.4, xmax: 0.8, ymin: -3, ymax: 2, xt: [0.4, 0.5, 0.6, 0.7, 0.8].map((v) => [v, v.toFixed(1)]), yt: [[2, '100 nA'], [1, '10 nA'], [0, '1 nA'], [-1, '0.1 nA'], [-2, '10 pA'], [-3, '1 pA']], xl: '탐침과 표면 사이의 거리 (nm)', ylx: 56, fs: 11.5 });
    ctx.strokeStyle = '#3867f4'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(ax.X(0.4), ax.Y(Math.log10(curOf(0.4)))); ctx.lineTo(ax.X(0.8), ax.Y(Math.log10(curOf(0.8)))); ctx.stroke();
    const gx = clamp(ts.gap, 0.4, 0.8), gy = Math.log10(curOf(gx));
    ctx.strokeStyle = 'rgba(226,70,75,.6)'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(ax.X(gx), ax.Y(-3)); ctx.lineTo(ax.X(gx), ax.Y(gy)); ctx.lineTo(ax.X(0.4), ax.Y(gy)); ctx.stroke(); ctx.setLineDash([]);
    D.sphere(ax.X(gx), ax.Y(gy), 6.5, '#e2464b', { shadow: true });
    T(ax.x + ax.w - 6, ax.y + 16, '0.1 nm 멀어지면 전류가 1/10', PHONE ? 11.5 : 12.5, '#c0353b', 'right', 800);

    // ---- C: 스캔 이미지 ----
    panel(Cc.x, Cc.y, Cc.w, Cc.h, 14);
    const sc = St.scan;
    T(Cc.x + 14, Cc.y + 22, '전류 지도: 밝을수록 ' + ((sc ? sc.mode : St.mode) === 'ch' ? '전류가 커요' : '표면이 높아요'), PHONE ? 12.5 : 14.5, '#26324a', 'left', 800);
    const pxs = PHONE ? Math.floor((Cc.w - 24) / NXP) : Math.floor(Math.min((Cc.w * 0.5 - 30) / NXP, (Cc.h - 56) / NYP));
    const ix0 = Cc.x + 14, iy0 = Cc.y + 34, iw = pxs * NXP, ih = pxs * NYP;
    ctx.fillStyle = '#1b1410'; ctx.fillRect(ix0, iy0, iw, ih);
    if (sc) {
      for (let k = 0; k < sc.k; k++) {
        const v = sc.img[k]; if (v < 0) continue;
        const r = Math.round(40 + 215 * v), gg = Math.round(25 + 175 * v * v + 25 * v), bb = Math.round(20 + 70 * Math.pow(v, 3));
        ctx.fillStyle = 'rgb(' + r + ',' + gg + ',' + bb + ')'; ctx.fillRect(ix0 + (k % NXP) * pxs, iy0 + Math.floor(k / NXP) * pxs, pxs + 0.6, pxs + 0.6);
      }
      if (sc.on) { const k = sc.k, ix = k % NXP, iy = Math.floor(k / NXP); ctx.strokeStyle = '#4ee0ff'; ctx.lineWidth = 1.6; ctx.strokeRect(ix0 + ix * pxs - 1, iy0 + iy * pxs - 1, pxs + 2, pxs + 2); ctx.beginPath(); ctx.moveTo(ix0, iy0 + iy * pxs + pxs); ctx.lineTo(ix0 + iw, iy0 + iy * pxs + pxs); ctx.strokeStyle = 'rgba(78,224,255,.3)'; ctx.stroke(); }
    } else T(ix0 + iw / 2, iy0 + ih / 2, '“스캔 시작”을 누르면 이미지가 그려져요', PHONE ? 12.5 : 14, '#d9c9a8', 'center', 800);
    ctx.strokeStyle = '#7f93bd'; ctx.lineWidth = 1.5; ctx.strokeRect(ix0, iy0, iw, ih);
    if (St.guess) { const gxp = ix0 + St.guess.x / AT.W * iw, gyp = iy0 + St.guess.y / AT.H * ih; ctx.strokeStyle = '#4ee0ff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(gxp, gyp, pxs * 2.6, 0, TAU); ctx.stroke(); D.label(gxp, gyp - pxs * 2.6 - 12, '내가 고른 자리', { size: 11.5, bg: '#0e7490' }); }
    St.imgRect = { x: ix0, y: iy0, w: iw, h: ih };
    const mc0 = sc ? sc.mode : St.mode;
    // 줄 그래프 (현재 줄의 값)
    if (PHONE) { textBlock(Cc.x + 14, iy0 + ih + 22, Cc.w - 28, mc0 === 'ch' ? '탐침 높이를 일정하게 두고 훑으면 원자 위에서 전류가 크고, 원자 사이에서 작아요.' : '전류를 일정하게 유지하도록 탐침을 오르내리면, 그 높이 변화가 표면의 높낮이예요.', 12, '#5d6879', 16, 700); return; }
    const tx0 = PHONE ? Cc.x + 14 : ix0 + iw + 26, tw = PHONE ? Cc.w - 28 : Cc.x + Cc.w - tx0 - 16, ty0 = PHONE ? iy0 + ih + 30 : iy0 + 14, th = PHONE ? 42 : 120;
    const mc = sc ? sc.mode : St.mode;
    T(tx0, ty0 - 8, mc === 'ch' ? '지금 줄의 전류 (로그 눈금)' : '지금 줄에서 탐침이 오르내린 높이', PHONE ? 11.5 : 13, '#26324a', 'left', 800);
    ctx.fillStyle = '#fbfcff'; ctx.fillRect(tx0, ty0, tw, th); ctx.strokeStyle = '#c3cbd9'; ctx.lineWidth = 1.2; ctx.strokeRect(tx0, ty0, tw, th);
    if (sc && sc.rowTr && sc.rowTr.length > 1) {
      const lo = mc === 'ch' ? Math.log10(curOf(sc.z)) - 0.15 : GAP0 - 0.01, hi = mc === 'ch' ? Math.log10(curOf(sc.z - AT.hA)) + 0.15 : GAP0 + AT.hA + 0.01;
      ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 2; ctx.beginPath();
      sc.rowTr.forEach((v, i) => { const px2 = tx0 + (i + 0.5) / NXP * tw, py = ty0 + th - clamp((v - lo) / (hi - lo), 0, 1) * th; if (i === 0) ctx.moveTo(px2, py); else ctx.lineTo(px2, py); });
      ctx.stroke();
    }
    if (!PHONE) textBlock(tx0, ty0 + th + 22, tw, (mc === 'ch' ? '탐침 높이를 일정하게 두고 훑으면 원자 위에서 전류가 크고, 원자 사이에서 작아요.' : '전류를 일정하게 유지하도록 탐침을 오르내리면, 그 높이 변화가 표면의 높낮이예요.'), 13, '#5d6879', 18, 700);
  }
  function stPointer() {
    SciSim.pointer(view, {
      down(p) {
        if (S.mode !== 'stm') return false;
        const r = S.st.imgRect; if (!r) return false;
        if (p.x < r.x || p.x > r.x + r.w || p.y < r.y || p.y > r.y + r.h) return false;
        const sc = S.st.scan; if (!sc || !sc.done) { showHint('먼저 스캔을 끝까지 해 보세요.'); return false; }
        S.st.guess = { x: (p.x - r.x) / r.w * AT.W, y: (p.y - r.y) / r.h * AT.H }; Sound.click(); return true;
      },
      move(p) { const r = S.st.imgRect; if (r && S.st.scan && S.st.scan.done) S.st.guess = { x: clamp((p.x - r.x) / r.w * AT.W, 0, AT.W), y: clamp((p.y - r.y) / r.h * AT.H, 0, AT.H) }; },
      up() {},
      hover(p) { const r = S.st.imgRect; return S.mode === 'stm' && r && S.st.scan && S.st.scan.done && p.x > r.x && p.x < r.x + r.w && p.y > r.y && p.y < r.y + r.h ? 'crosshair' : 'default'; },
    });
  }
  stPointer();

  /* ================= ④ 소자와 별 ================= */
  const dvLay = () => PHONE
    ? { p: { x: 8, y: 8, w: 464, h: 262 }, q: { x: 8, y: 278, w: 464, h: 170 }, c: { x: 8, y: 456, w: 464, h: 216 } }
    : { p: { x: 12, y: 12, w: 470, h: 336 }, q: { x: 494, y: 12, w: 294, h: 336 }, c: { x: 12, y: 358, w: 776, h: 190 } };
  function flashWrite() { const F = S.dv.flash; if (F.bit === 1 || F.busy) return; F.busy = 'w'; F.tp = 0; }
  function flashErase() { const F = S.dv.flash; if (F.bit === 0 || F.busy) return; F.busy = 'e'; F.tp = 0; }
  function startNat() { const N = S.dv.nat; N.run = { t: 0 }; N.alpha = null; }
  function stepDev(dt) {
    const V = S.dv;
    if (S.mode === 'dev' && V.sub === 'leak') {
      const L = leakOf(V.t), rate = (0.5 + 3.2 * Math.log10(L)) * dt;
      if (Math.random() < rate) V.el.push({ t: 0, x: rnd(0.08, 0.92) });
      for (let i = V.el.length - 1; i >= 0; i--) { V.el[i].t += dt / 0.8; if (V.el[i].t >= 1) V.el.splice(i, 1); }
    }
    const F = V.flash;
    if (F.busy) {
      F.tp += dt / 1.8;
      if (F.tp >= 1) { F.bit = F.busy === 'w' ? 1 : 0; F.busy = null; Sound.tick(); }
    }
    const N = V.nat;
    if (N.run) {
      N.run.t += dt;
      if (N.run.t > 4.2) { N.run = null; N.alpha = null; }
    }
  }
  function drawDev() {
    const { p: Pp, q: Qp, c: Cc } = dvLay(), V = S.dv;
    const fs = PHONE ? 12 : 13.5;
    if (V.sub === 'leak') drawLeak(Pp, Qp, fs);
    else if (V.sub === 'flash') drawFlash(Pp, Qp, fs);
    else drawNat(Pp, Qp, fs);
    // C: 설명 + 분류
    panel(Cc.x, Cc.y, Cc.w, Cc.h, 14);
    const half = PHONE ? Cc.w - 28 : 420;
    const titles = { leak: '트랜지스터의 누설 전류', flash: '플래시 메모리', nat: '알파 붕괴와 별의 핵융합' };
    const body = {
      leak: '게이트 절연막이 몇 nm로 얇아지면 전자가 절연막을 터널링해 새어요(누설 전류). 두께가 줄수록 누설이 급격히 늘어 전력이 낭비되고 열이 나요. 그래서 새로운 재료(고유전체)와 구조를 써요.',
      flash: '전자가 아주 얇은 절연막을 터널링해 부유 게이트에 들어가면 0과 1을 저장해요. 장점: 전원이 꺼져도 정보가 남아요. 한계: 반복해서 쓰면 절연막이 낡아 전자가 새고 정보가 사라질 수 있어요.',
      nat: '알파 붕괴: 핵 속의 알파 입자가 장벽을 터널링해 아주 가끔 튀어나와요. 별의 핵융합(다음 차시): 양성자 두 개가 서로 밀어내는 장벽을 터널링해 융합해요.',
    };
    T(Cc.x + 14, Cc.y + 22, titles[V.sub], PHONE ? 12.5 : 14.5, '#26324a', 'left', 800);
    textBlock(Cc.x + 14, Cc.y + 46, half, body[V.sub], PHONE ? 12 : 13.5, '#5d6879', PHONE ? 16 : 19, 700);
    const cx = PHONE ? Cc.x + 14 : Cc.x + 450, cy = PHONE ? Cc.y + 132 : Cc.y + 22, cw = PHONE ? 214 : 160;
    T(cx, cy, '✅ 유용하게 쓰여요', fs - 0.5, '#0f7a42', 'left', 800); T(cx + cw + (PHONE ? 10 : 6), cy, '⚠️ 문제가 돼요', fs - 0.5, '#c0353b', 'left', 800);
    const cnt = [0, 0];
    CARDS.forEach((c, i) => {
      const v = SEL_K.vals[i]; if (v === undefined || v === '') return;
      const col = +v, yy = cy + 18 + cnt[col] * (PHONE ? 15 : 19); cnt[col]++;
      const bad = SEL_K.sels[i].classList.contains('bad');
      T(cx + col * (cw + (PHONE ? 10 : 6)), yy, c.short, PHONE ? 11 : 12.5, bad ? '#c0353b' : col === 0 ? '#0f7a42' : '#26324a', 'left', 800);
    });
    if (cnt[0] + cnt[1] === 0) T(cx, cy + 20, '카드를 나누면 여기에 모여요', PHONE ? 11 : 12.5, '#9aa5b8', 'left', 700);
  }
  function drawLeak(Pp, Qp, fs) {
    const V = S.dv, t = V.t, L = leakOf(t), warn = L >= LEAK_WARN - 1e-9;
    panel(Pp.x, Pp.y, Pp.w, Pp.h, 14);
    T(Pp.x + 14, Pp.y + 22, '트랜지스터 단면 (게이트 · 절연막 · 실리콘)', PHONE ? 12.5 : 14.5, '#26324a', 'left', 800);
    const gx = Pp.x + 30, gw = Pp.w - 60, gy = Pp.y + (PHONE ? 52 : 62);
    const gh = PHONE ? 34 : 44, shh = PHONE ? 56 : 80, ppn = (Pp.h - (gy - Pp.y) - gh - shh - (PHONE ? 30 : 34)) / 5, oh = t * ppn, sy = gy + gh + oh;
    // 열 후광
    if (L > 30) { ctx.save(); D.roundRect(Pp.x, Pp.y, Pp.w, Pp.h, 14); ctx.clip(); D.glow(Pp.x + Pp.w / 2, gy + gh + oh / 2, Pp.w * 0.55, '#ff6a3d', clamp(Math.log10(L) / 4.5, 0, 0.55)); ctx.restore(); }
    D.shadow(() => { ctx.fillStyle = '#9aa5b8'; D.roundRect(gx, gy, gw, gh, 6); ctx.fill(); }, { blur: 5, y: 2 });
    T(gx + gw / 2, gy + gh / 2 + 5, '금속 게이트', 13, '#fff', 'center', 800);
    ctx.fillStyle = 'rgba(250,200,90,.85)'; ctx.fillRect(gx, gy + gh, gw, oh); ctx.strokeStyle = '#d99a2b'; ctx.lineWidth = 1.2; ctx.strokeRect(gx, gy + gh, gw, oh);
    T(gx + 8, gy + gh + Math.min(oh - 4, 15), '절연막 ' + t.toFixed(1) + ' nm', 12.5, '#7a4a00', 'left', 800);
    D.shadow(() => { ctx.fillStyle = '#7f93bd'; D.roundRect(gx, sy, gw, shh, 6); ctx.fill(); }, { blur: 5, y: 2 });
    T(gx + gw / 2, sy + shh - 10, '실리콘 (전자가 많아요)', 12.5, '#fff', 'center', 800);
    // 머물러 있는 전자들
    for (let i = 0; i < 9; i++) { const ex = gx + gw * (0.08 + 0.1 * i), ey = sy + 14 + 9 * Math.sin(S.t * 1.6 + i * 1.7) * (RM ? 0 : 1) + (i % 2) * 10; D.sphere(ex, ey, 4.5, '#3867f4', { gloss: false }); }
    // 터널링 전자
    V.el.forEach((e) => { const ex = gx + gw * e.x, ey = sy - oh * e.t - (e.t < 0.05 ? 0 : 0); ctx.globalAlpha = 0.3 + 0.7 * Math.sin(e.t * Math.PI); D.glow(ex, ey, 12, '#ffb400', 0.7); D.sphere(ex, ey, 4.5, '#3867f4', { gloss: false }); ctx.globalAlpha = 1; });
    T(Pp.x + 14, Pp.y + Pp.h - 10, '절연막이 얇을수록 노란 빛을 내며 새어 나가는(터널링) 전자가 늘어요', PHONE ? 11 : 12.5, '#5d6879', 'left', 700);
    // Q: 누설 막대
    panel(Qp.x, Qp.y, Qp.w, Qp.h, 14);
    T(Qp.x + 14, Qp.y + 22, '누설 전류 (5.0 nm일 때를 1로)', PHONE ? 12.5 : 14, '#26324a', 'left', 800);
    const bx = Qp.x + (PHONE ? 70 : 54), by = Qp.y + 40, bw = Qp.w - (PHONE ? 100 : 78), bh = Qp.h - (PHONE ? 100 : 104);
    if (PHONE) {
      // 가로 막대 (로그)
      const lx = Qp.x + 20, lw = Qp.w - 40, ly = Qp.y + 60;
      barH(lx, ly, lw, 22, Math.log10(L) / 4, warn ? '#e2464b' : '#f2a03a');
      [0, 1, 2, 3, 4].forEach((e) => { const xx = lx + lw * e / 4; ctx.fillStyle = '#5d6879'; ctx.fillRect(xx - 0.8, ly + 24, 1.6, 6); T(xx, ly + 44, e === 0 ? '1' : e === 1 ? '10' : e === 2 ? '100' : e === 3 ? '1000' : '10000', 11.5, '#5d6879', 'center', 700); });
      ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(lx + lw * 0.75, ly - 6); ctx.lineTo(lx + lw * 0.75, ly + 30); ctx.stroke(); ctx.setLineDash([]);
      T(lx + lw * 0.75, ly - 10, '과열 경고 기준', 11.5, '#e2464b', 'center', 800);
      D.label(Qp.x + Qp.w / 2, Qp.y + Qp.h - 56, '누설 ' + fmtLeak(L) + (warn ? '  🔥 과열 경고' : '  정상 범위'), { size: 14, bg: warn ? '#e2464b' : '#14a058' });
    } else {
      const ytop = by, ybot = by + bh;
      ctx.fillStyle = '#eef2fa'; ctx.fillRect(bx, ytop, 60, bh);
      const ly2 = (e) => ybot - bh * e / 4;
      [0, 1, 2, 3, 4].forEach((e) => { ctx.strokeStyle = '#e3e8f2'; ctx.beginPath(); ctx.moveTo(bx - 4, ly2(e)); ctx.lineTo(bx + 150, ly2(e)); ctx.stroke(); T(bx - 8, ly2(e) + 4, e === 0 ? '1' : e === 1 ? '10' : e === 2 ? '100' : e === 3 ? '1000' : '10000', 11.5, '#5d6879', 'right', 700); });
      const hh = bh * Math.log10(L) / 4;
      ctx.fillStyle = warn ? '#e2464b' : '#f2a03a'; D.roundRect(bx + 8, ybot - Math.max(hh, 0.0001), 44, Math.max(hh, 1), 4); ctx.fill();
      ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(bx - 4, ly2(3)); ctx.lineTo(bx + 150, ly2(3)); ctx.stroke(); ctx.setLineDash([]);
      T(bx + 66, ly2(3) - 6, '과열 경고 기준', 12, '#e2464b', 'left', 800);
      D.label(Qp.x + Qp.w / 2, Qp.y + Qp.h - 30, '누설 ' + fmtLeak(L) + (warn ? ' 🔥 과열 경고' : ' 정상 범위'), { size: 13.5, bg: warn ? '#e2464b' : '#14a058' });
    }
  }
  function drawFlash(Pp, Qp, fs) {
    const F = S.dv.flash;
    panel(Pp.x, Pp.y, Pp.w, Pp.h, 14);
    T(Pp.x + 14, Pp.y + 22, '플래시 메모리 셀 단면', PHONE ? 12.5 : 14.5, '#26324a', 'left', 800);
    const gx = Pp.x + 36, gw = Pp.w - 72, y0 = Pp.y + (PHONE ? 46 : 56);
    const h1 = PHONE ? 34 : 42, h2 = PHONE ? 38 : 50, ox = 10, h3 = PHONE ? 62 : 80;
    // 제어 게이트, 부유 게이트, 터널 절연막, 실리콘
    D.shadow(() => { ctx.fillStyle = '#9aa5b8'; D.roundRect(gx, y0, gw, h1, 6); ctx.fill(); }, { blur: 5, y: 2 }); T(gx + gw / 2, y0 + h1 / 2 + 5, '제어 게이트', 13, '#fff', 'center', 800);
    const fy = y0 + h1 + 8; ctx.fillStyle = 'rgba(138,92,246,.85)'; D.roundRect(gx + 24, fy, gw - 48, h2, 6); ctx.fill(); T(gx + gw / 2, fy + 14, '부유 게이트 (전자를 가둬 저장)', 12.5, '#fff', 'center', 800);
    const oy = fy + h2; ctx.fillStyle = 'rgba(250,200,90,.9)'; ctx.fillRect(gx + 24, oy, gw - 48, ox); T(gx + gw - 30, oy + ox + 14, '얇은 절연막 (터널링)', 11.5, '#7a4a00', 'right', 800);
    const sy = oy + ox + 4; D.shadow(() => { ctx.fillStyle = '#7f93bd'; D.roundRect(gx, sy, gw, h3, 6); ctx.fill(); }, { blur: 5, y: 2 }); T(gx + gw / 2, sy + h3 - 10, '실리콘 (전자가 있어요)', 12.5, '#fff', 'center', 800);
    // 부유 게이트 안의 전자 수 (비트에 따라)
    const nIn = F.bit === 1 ? 6 : 0;
    const q = F.busy ? F.tp : 0;
    const baseN = (n, yy, alpha) => { for (let i = 0; i < n; i++) { const ex = gx + 60 + (gw - 120) * (i + 0.5) / 6, ey = yy + (i % 2) * 7; ctx.globalAlpha = alpha; D.sphere(ex, ey, 5, '#3867f4', { gloss: false }); ctx.globalAlpha = 1; } };
    if (F.busy === 'w') {
      baseN(6 - Math.floor(q * 6.99), sy + 16, 1);
      for (let i = 0; i < 6; i++) { const lq = clamp(q * 1.4 - i * 0.12, 0, 1), ex = gx + 60 + (gw - 120) * (i + 0.5) / 6, ey = sy + 14 - (sy + 14 - (fy + h2 - 12)) * lq; if (lq > 0 && lq < 1) { D.glow(ex, ey, 11, '#ffb400', 0.7); D.sphere(ex, ey, 5, '#3867f4', { gloss: false }); } else if (lq >= 1) D.sphere(ex, fy + h2 - 12 + (i % 2) * 7 * 0, 5, '#3867f4', { gloss: false }); }
    } else if (F.busy === 'e') {
      for (let i = 0; i < 6; i++) { const lq = clamp(q * 1.4 - i * 0.12, 0, 1), ex = gx + 60 + (gw - 120) * (i + 0.5) / 6, ey = (fy + h2 - 12) + (sy + 14 - (fy + h2 - 12)) * lq; if (lq < 1) { if (lq > 0) D.glow(ex, ey, 11, '#ffb400', 0.7); D.sphere(ex, ey, 5, '#3867f4', { gloss: false }); } }
      baseN(Math.floor(q * 6.99), sy + 16, 1);
    } else {
      if (F.bit === 1) for (let i = 0; i < 6; i++) D.sphere(gx + 60 + (gw - 120) * (i + 0.5) / 6, fy + h2 - 12, 5, '#3867f4', { gloss: false });
      baseN(F.bit === 1 ? 0 : 0, sy + 16, 1);
    }
    // 실리콘 안의 전자 (지금 상태가 0이면 아래에 있음)
    if (!F.busy) { const nn = F.bit === 1 ? 0 : 6; baseN(nn, sy + 16, 1); }
    T(Pp.x + 14, Pp.y + Pp.h - 10, F.busy ? (F.busy === 'w' ? '전자가 절연막을 터널링해 부유 게이트로 들어가요…' : '전자가 절연막을 터널링해 실리콘으로 돌아가요…') : '아래 버튼으로 쓰기 · 지우기를 해 보세요', PHONE ? 11.5 : 12.5, '#5d6879', 'left', 700);
    // Q: 비트
    panel(Qp.x, Qp.y, Qp.w, Qp.h, 14);
    T(Qp.x + 14, Qp.y + 22, '저장된 정보', PHONE ? 12.5 : 14.5, '#26324a', 'left', 800);
    const bitNow = F.busy ? (F.busy === 'w' ? 0 : 1) : F.bit;
    const bxx = Qp.x + Qp.w / 2, byy = Qp.y + Qp.h / 2 - 6;
    D.shadow(() => { D.roundRect(bxx - 46, byy - 40, 92, 80, 16); ctx.fillStyle = bitNow ? '#14a058' : '#9aa5b8'; ctx.fill(); }, { blur: 8, y: 3 });
    T(bxx, byy + 20, String(bitNow), 56, '#fff', 'center', 900);
    T(bxx, Qp.y + Qp.h - (PHONE ? 20 : 30), F.bit === 1 ? '전자가 갇혀 있어요 → 1' : '전자가 없어요 → 0', PHONE ? 12.5 : 13.5, '#26324a', 'center', 800);
    if (!PHONE) T(bxx, Qp.y + Qp.h - 12, '전원이 꺼져도 유지돼요', 12.5, '#5d6879', 'center', 700);
  }
  function drawNat(Pp, Qp, fs) {
    const N = S.dv.nat;
    panel(Pp.x, Pp.y, Pp.w, Pp.h, 14);
    T(Pp.x + 14, Pp.y + 22, '방사성 알파 붕괴: 핵 속의 알파 입자', PHONE ? 12.5 : 14.5, '#26324a', 'left', 800);
    const wx0 = Pp.x + 26, wx1 = Pp.x + Pp.w - 26, wl = Pp.x + Pp.w * 0.42, wr = wl + (PHONE ? 74 : 96);
    const bt = Pp.y + (PHONE ? 66 : 74), fl = bt + (PHONE ? 92 : 124), base = fl + 24;
    // 핵 속(우물)과 장벽
    ctx.fillStyle = 'rgba(255,170,90,.18)'; ctx.fillRect(wx0, fl - 90 * 0 - (PHONE ? 66 : 90), wl - wx0, (PHONE ? 66 : 90));
    ctx.fillStyle = 'rgba(167,139,230,.35)'; ctx.beginPath(); ctx.moveTo(wl, fl); ctx.lineTo(wl, bt); ctx.lineTo(wr, bt); ctx.lineTo(wr, fl); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#7a5bc8'; ctx.lineWidth = 2.6; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(wx0, fl); ctx.lineTo(wl, fl); ctx.lineTo(wl, bt); ctx.lineTo(wr, bt); ctx.lineTo(wr, fl); ctx.lineTo(wx1, fl); ctx.stroke();
    T(wl + (wr - wl) / 2, bt - 7, '장벽', 12.5, '#5b3fb0', 'center', 800);
    const ay = fl - (PHONE ? 34 : 48);
    ctx.strokeStyle = '#3867f4'; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(wx0, ay); ctx.lineTo(wx1, ay); ctx.stroke(); ctx.setLineDash([]);
    T(wx1, ay + 16, '알파 입자의 에너지', PHONE ? 11 : 12, '#3867f4', 'right', 800); T(wx1, ay + 31, '(장벽보다 낮아요)', PHONE ? 11 : 12, '#3867f4', 'right', 800);
    T((wx0 + wl) / 2, base + 4, '핵 속', 12.5, '#5d6879', 'center', 800); T((wr + wx1) / 2, base + 4, '핵 밖', 12.5, '#5d6879', 'center', 800);
    const run = N.run, lo = wx0 + 16, hi = wl - 14;
    let ax = (lo + hi) / 2, alpha = 1, msg = '“▶ 시연 보기”를 눌러 보세요', col = '#5d6879';
    if (run) {
      const t = run.t;
      if (t < 2.6) { ax = lo + (hi - lo) * (0.5 + 0.5 * Math.sin(t * 6.5)); msg = '아주 많이 시도하는 중… (대부분 튕겨서 되돌아와요)'; }
      else if (t < 3.2) { ax = hi + (wr + 10 - hi) * (t - 2.6) / 0.6; alpha = 0.45; msg = '장벽 속으로 스며들어요…'; col = '#7a5bc8'; }
      else { ax = wr + 10 + (wx1 - wr - 26) * clamp((t - 3.2) / 0.9, 0, 1); msg = '터널링으로 핵 밖에 나왔어요!'; col = '#14a058'; }
      if (t >= 3.2 && t < 3.26) sparkle(ax, ay, 12);
    }
    ctx.globalAlpha = alpha; D.glow(ax, ay, 16, '#ffb400', 0.6); D.sphere(ax, ay, 7.5, '#e2464b', { shadow: true }); ctx.globalAlpha = 1;
    D.label(Pp.x + Pp.w / 2, Pp.y + Pp.h - 20, msg, { size: PHONE ? 11.5 : 12.5, bg: col });
    // Q: 별의 핵융합 예고
    panel(Qp.x, Qp.y, Qp.w, Qp.h, 14);
    T(Qp.x + 14, Qp.y + 22, '별의 핵융합 (다음 차시 예고)', PHONE ? 12.5 : 14, '#26324a', 'left', 800);
    const ccx = Qp.x + Qp.w / 2, ccy = Qp.y + (PHONE ? 80 : 130);
    const sw = Math.sin(S.t * 2.4) * 6;
    D.glow(ccx, ccy, 70, '#ffb400', 0.45);
    D.sphere(ccx - 52 + sw, ccy, 20, '#e2464b', { shadow: true, text: 'p⁺', textScale: 0.9 }); D.sphere(ccx + 52 - sw, ccy, 20, '#e2464b', { shadow: true, text: 'p⁺', textScale: 0.9 });
    T(ccx, ccy + 6, '⇄', 22, '#7a5bc8', 'center', 800);
    textBlock(Qp.x + 14, Qp.y + (PHONE ? 116 : 190), Qp.w - 28, '양성자끼리는 밀어내서 가까이 가기 어려워요. 그래도 일부는 이 장벽을 터널링해 융합해요. 터널 효과가 없었다면 태양은 빛나지 못해요.', PHONE ? 12 : 13.5, '#5d6879', PHONE ? 16 : 19, 700);
  }

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    if (S.mode === 'cq') {
      const Q = S.cq;
      setReadouts('공: 넘은 횟수', Q.bPass + ' / ' + Q.bTry + '번', '전자: 반대편에서 발견', Q.eP + ' / ' + Q.eN + '개', '전자 모형 확률', fmtPct(log10T(0.2, 1, 1)));
    } else if (S.mode === 'prob') {
      const P = S.pr;
      setReadouts('설정', (P.part === 'e' ? '전자' : '양성자') + ' · ' + (+P.vh).toFixed(1) + ' eV · ' + d1(P.v).toFixed(1) + ' nm', '모형 통과 확률', fmtPct(prLg(P.v)), '100만 번 중 통과', P.last && P.last.v === P.v && P.last.vh === P.vh && P.last.part === P.part ? P.last.count.toLocaleString('ko-KR') + '번' : '시도 중이거나 대기 중');
    } else if (S.mode === 'stm') {
      const ts = tipState();
      setReadouts('탐침과 표면 사이 거리', ts.gap.toFixed(2) + ' nm', '터널 전류', fmtI(ts.I), '스캔', S.st.scan ? (S.st.scan.done ? '완료' : Math.round(S.st.scan.k / (NXP * NYP) * 100) + ' %') : '안 했어요');
    } else {
      const V = S.dv, F = V.flash;
      if (V.sub === 'leak') setReadouts('절연막 두께', V.t.toFixed(1) + ' nm', '누설 전류(5 nm일 때 = 1)', fmtLeak(leakOf(V.t)), '상태', leakOf(V.t) >= LEAK_WARN - 1e-9 ? '🔥 과열 경고' : '정상 범위');
      else if (V.sub === 'flash') setReadouts('저장된 비트', String(F.busy ? '…' : F.bit), '전자', F.bit === 1 && !F.busy ? '부유 게이트에 갇힘' : '실리콘에 있음', '쓰기 방법', '터널링');
      else setReadouts('알파 붕괴', '장벽을 터널링', '별의 핵융합', '양성자가 터널링', '다음 차시', '별의 핵융합');
    }
  }

  /* ================= 미션 ================= */
  const levels = [
    {
      title: '고전과 양자: 장벽을 만났을 때', short: '고전과 양자', icon: '⚽', phase: '모형',
      intro: '<p class="si-q">❓ 탐구 질문: 벽을 넘을 에너지가 없는 입자가 벽 반대편에서 발견될 수 있을까?</p>' +
        '<div class="si-link">🔗 <b>물리학에서</b> 역학적 에너지 보존을 배웠어요. 언덕을 넘으려면 운동 에너지가 위치 에너지 증가분(mgh) 이상이어야 해요. 앞 차시들에서는 전자의 위치가 <b>확률 파동</b>으로 나타난다는 것을 봤어요. 이제 이 두 생각을 같은 장벽에 적용해 봐요.</div>' +
        '<p><b>공</b>: 에너지가 부족하면 꼭대기에 오르지 못하고 <b>항상 되돌아와요</b>(확률 0 %). <b>전자</b>: 확률 파동이 장벽에 부딪혀 대부분 반사되지만, 일부는 장벽 안으로 지수적으로 줄어들며 스며들어 반대편에 약한 파동이 남아요. 그래서 반대편에서 발견될 확률이 <b>0이 아니에요</b>. 이것이 <b>터널 효과</b>예요.</p>',
      features: ['cq'],
      setup() { S.show.selQ = false; setScene('cq'); },
      recap: '에너지가 부족한 공은 에너지 보존 때문에 항상 장벽(언덕)을 넘지 못해요. 하지만 전자의 확률 파동은 장벽 안으로 스며들어 반대편에 약한 파동이 남아서, 에너지가 부족해도 반대편에서 발견될 확률이 0이 아니에요. 이것이 터널 효과예요.',
      summary: '<ul><li><b>고전</b>: 운동 에너지가 장벽 꼭대기의 위치 에너지보다 작으면 에너지 보존 때문에 넘지 못하고 되돌아와요(확률 0 %).</li><li><b>양자</b>: 확률 파동은 장벽에 부딪히면 대부분 반사되지만, 장벽 안으로 <b>지수적으로 줄어들며</b> 스며들고 반대편에 약한 파동이 남아요. 반대편에서 발견될 확률이 0이 아니에요.</li><li><b>터널 효과</b>: 에너지가 부족해 고전적으로는 불가능한 장벽 통과가 확률적으로 일어나는 현상이에요. 장벽에 구멍을 뚫거나 에너지를 몰래 얻는 것이 아니에요.</li><li>모형 값: 두께 0.2 nm 장벽(전자의 에너지가 장벽보다 1.0 eV 낮을 때)에서 약 13 %. 100개를 쏘면 일부만 반대편에 도착해요.</li></ul>',
      missions: [
        {
          title: '공과 전자를 같은 장벽에 보내기',
          goal: '“공 굴리기”로 공을 한 번 굴리고, “전자 100개”로 전자를 <b>100개</b> 쏘아 반대편에 몇 개가 나타나는지 보세요.',
          hint: '공은 항상 되돌아와요. 전자는 한 개씩은 예측할 수 없지만 100개를 쏘면 일부가 오른쪽에서 발견돼요. 전자 쏘기는 몇 초 걸려요.',
          setup() { S.show.selQ = false; setScene('cq'); },
          check: () => S.cq.bTry >= 1 && S.cq.eN >= 100,
          hold: 0.6,
          status: () => mark(S.cq.bTry >= 1) + ' 공 굴리기 ' + S.cq.bTry + '번 &nbsp; ' + mark(S.cq.eN >= 100) + ' 전자 ' + Math.min(S.cq.eN, 100) + ' / 100개 (반대편 ' + S.cq.eP + '개)',
          explain: '공은 운동 에너지가 꼭대기까지 필요한 에너지의 55 %뿐이라 올라가다 멈추고 되돌아와요. 전자는 같은 상황에서도 확률 파동이 장벽을 스며들어 100개 중 평균 13개쯤 반대편에서 발견돼요(이번 결과는 매번 조금씩 달라요).',
        },
        {
          title: '고전과 양자의 결과 비교하기', manual: true,
          goal: '공과 전자의 결과를 비교하며 문장 3개를 완성하세요.',
          hint: '공의 반대편 도착 횟수는 늘 0이었어요. 전자는 100개 중 몇 개가 도착했나요? 그리고 “터널 효과”는 어떤 현상인지 떠올려 봐요.',
          setup() { S.show.selQ = true; SEL_Q.reset(); setScene('cq'); },
          check() { if (S.cq.bTry < 1 || S.cq.eN < 1) return '먼저 공과 전자를 모두 쏘아 결과를 확인하세요.'; return SEL_Q.grade(); },
          status: () => '고른 문장 ' + SEL_Q.count() + ' / 3',
          explain: '에너지가 부족한 <b>공</b>이 언덕을 넘을 확률은 0 %예요. 에너지가 부족한 <b>전자</b>도 반대편에서 발견될 확률은 0이 아니라 <b>작지만 0이 아니에요</b>. 터널 효과는 장벽에 구멍을 뚫거나 몰래 에너지를 얻는 것이 아니라, 확률 파동이 장벽 안에서 줄어들면서도 반대편까지 이어져 <b>확률적으로 통과</b>하는 현상이에요.',
        },
        {
          type: 'quiz', title: '고전 입자가 장벽을 못 넘는 까닭',
          goal: '공은 왜 꼭대기까지 오르지 못하고 되돌아올까요?',
          setup() { S.show.selQ = false; setScene('cq'); },
          choices: ['장벽이 입자를 미는 힘이 입자의 힘보다 언제나 크기 때문에', '운동 에너지가 장벽 꼭대기의 위치 에너지보다 작으면 에너지 보존 때문에 꼭대기에 오르지 못하기 때문에', '입자가 너무 작아서 장벽에 부딪히지 못하기 때문에', '터널 효과란 입자가 장벽에 구멍을 뚫어 지나가는 것이라 공은 구멍을 못 뚫기 때문에'],
          answer: 1,
          feedback: ['힘의 크기가 아니라 에너지로 설명해요. 올라갈수록 위치 에너지가 늘고 운동 에너지가 줄어요.', '', '공은 언덕에 부딪히며 올라가요. 입자의 크기 때문이 아니라 에너지가 부족해서예요.', '터널 효과는 구멍을 뚫는 것이 아니에요. 확률 파동이 장벽 안으로 스며들어 반대편에서 발견될 확률이 생기는 현상이에요.'],
          explain: '고전역학에서는 <b>에너지 보존</b>이 성립해요. 언덕을 오르면 운동 에너지가 위치 에너지로 바뀌는데, 운동 에너지가 꼭대기의 위치 에너지(mgh)보다 작으면 중간에서 운동 에너지가 0이 되어 되돌아와요. 양자역학에서는 입자의 위치가 확률로 정해지므로 이 확률적 통과가 가능해요.',
        },
      ],
    },
    {
      title: '장벽과 확률: 두께에 따라 급감해요', short: '장벽과 확률', icon: '📉', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 전자의 확률 파동이 장벽 안에서 줄어들며 반대편에 약하게 남는 것을 봤어요. 그 파동이 얼마나 줄어드는지에 따라 <b>통과 확률</b>이 달라져요.</div>' +
        '<p>장벽 두께 · 높이 · 입자의 종류를 바꾸면서 <b>100만 번 시도</b>했을 때 몇 번이나 통과하는지 측정해 봐요. 식은 쓰지 않고 시뮬레이션의 <b>모형 값</b>만 읽어요. 통과 확률은 두께가 늘어날수록, 장벽이 높을수록, 입자가 무거울수록 <b>급격히</b> 작아져요. 세로축이 로그 눈금이라 직선처럼 줄어드는 그래프가 돼요.</p>',
      features: ['prob'],
      setup() { S.show.selP = false; S.pr.rec = {}; S.pr.last = null; setScene('prob'); schedRun(); },
      recap: '장벽을 통과할 확률은 장벽이 두꺼울수록 급격히 작아져요. 두께가 2배가 되면 반이 아니라 수십~수백 배로 줄어요(0.5 nm에서 약 0.6 %, 1.0 nm에서 약 0.004 %). 장벽이 높거나 입자가 무거울수록 더 작아져서 양성자는 같은 조건에서 사실상 0이에요.',
      summary: '<ul><li>모형 값(전자, 장벽이 입자 에너지보다 1.0 eV 높을 때): 두께 0.2 nm에서 약 13 %, 0.5 nm에서 약 0.6 %, 1.0 nm에서 약 0.004 %.</li><li>두께가 2배가 되면 확률은 반 정도가 아니라 <b>수십~수백 배</b> 급감해요. 로그 눈금 그래프에서 직선처럼 내려가요.</li><li>장벽이 높을수록, 입자의 질량이 클수록 확률이 급격히 작아져요. 양성자는 같은 조건에서 전자보다 수십 자릿수 작아 사실상 0이에요.</li><li>일상 크기의 물체는 확률이 너무 작아서(10 아래의 수십 자릿수) 관찰되지 않아요.</li></ul>',
      missions: [
        {
          title: '두께별 통과 확률 측정하기',
          goal: '입자는 <b>전자</b>, 장벽 높이는 <b>1.0 eV</b>로 두고 두께를 <b>0.2 nm, 0.5 nm, 1.0 nm</b>로 바꾸며 100만 번 시도의 결과를 기록하세요.',
          hint: '슬라이더를 움직이고 잠깐 기다리면 100만 번 시도가 자동으로 시작돼요. 전자와 1.0 eV가 선택돼 있는지 확인하세요. 오른쪽 기록 표에 결과가 채워져요.',
          setup() { S.show.selP = false; S.pr.rec = {}; S.pr.vh = '1'; S.pr.part = 'e'; updateCtl(); schedRun(); setScene('prob'); },
          check: () => REC_V.every((v) => S.pr.rec[v] !== undefined),
          hold: 0.5,
          status: () => REC_V.map((v) => mark(S.pr.rec[v] !== undefined) + ' ' + d1(v).toFixed(1) + ' nm' + (S.pr.rec[v] !== undefined ? ' (' + S.pr.rec[v].toLocaleString('ko-KR') + '번)' : '')).join(' &nbsp; '),
          explain: '두께가 0.2 → 0.5 → 1.0 nm로 늘면 100만 번 중 통과 횟수가 약 13만 번 → 약 6천 번 → 수십 번으로 급격히 줄어요(모형 값 13 % → 0.6 % → 0.004 %). 두께가 5배(0.2 → 1.0 nm)가 되었을 뿐인데 확률은 3000배 넘게 줄었어요.',
        },
        {
          title: '두꺼울수록 어려운 까닭 정리하기', manual: true,
          goal: '그래프와 오른쪽 파동 그림을 보며 문장 3개를 완성하세요.',
          hint: '장벽 안의 보라색 파동이 어떻게 변하는지, 장벽 오른쪽 초록 파동의 크기가 두께에 따라 어떻게 달라지는지 살펴보세요.',
          setup() { S.show.selP = true; SEL_P.reset(); setScene('prob'); },
          check: () => SEL_P.grade(),
          status: () => '고른 문장 ' + SEL_P.count() + ' / 3',
          explain: '장벽 안에서 확률 파동은 <b>지수적으로 급격히 줄어들어요</b>. 장벽이 두꺼울수록 반대편에 닿는 파동이 더 작아지고, 그래서 반대편에서 발견될 확률도 <b>급격히 작아져요</b>. 로그 눈금 그래프에서 확률이 거의 직선으로 내려가는 것이 이 때문이에요.',
        },
        {
          type: 'quiz', title: '두께가 2배가 되면?',
          goal: '장벽 두께를 0.5 nm에서 1.0 nm로 2배 늘렸어요. 통과 확률은 어떻게 될까요?',
          setup() { S.show.selP = false; setScene('prob'); },
          choices: ['정확히 반(약 0.3 %)으로 줄어요', '거의 달라지지 않아요', '두 배로 늘어요', '반 정도가 아니라 훨씬 급격히 줄어요 (약 0.6 % → 약 0.004 %)'],
          answer: 3,
          feedback: ['확률은 두께에 반비례하는 것이 아니에요. 그래프에서 0.5 nm와 1.0 nm의 값을 비교해 보세요.', '두께가 늘면 확률은 크게 달라져요. 그래프를 다시 읽어 보세요.', '장벽이 두꺼워지면 통과가 더 어려워져요.', ''],
          explain: '0.5 nm에서 약 0.6 %였던 확률이 1.0 nm에서는 약 0.004 %로, <b>150배 가까이</b> 줄어요. 장벽 안에서 파동이 지수적으로 줄어들기 때문이에요. 그래서 일상 크기의 두꺼운 벽은 사실상 통과할 수 없어요.',
        },
      ],
    },
    {
      title: '터널링 현미경: 원자를 보는 눈', short: '터널링 현미경', icon: '🔬', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 장벽 두께가 조금만 늘어도 통과 확률이 급격히 줄어든다는 것을 알았어요. 이 민감함을 이용해 원자를 보는 장치가 <b>주사 터널링 현미경(STM)</b>이에요.</div>' +
        '<p>뾰족한 금속 탐침을 시료 표면에 0.5 nm 안팎까지 가까이 대고 작은 전압을 걸면, 탐침과 표면 사이의 진공(장벽)을 <b>전자가 터널링</b>해서 전류(수 nA)가 흘러요. 거리가 <b>0.1 nm만 늘어도 전류가 약 1/10로</b> 줄어서 원자 한 개 크기의 높낮이까지 구별해요(1981년 개발, 비니히와 로러의 노벨상).</p>',
      features: ['stm'],
      setup() { stopScan(true); S.st.seenG = {}; S.st.gapV = 70; slZ.set(70); setScene('stm'); },
      recap: '탐침과 표면 사이의 거리가 0.1 nm 늘 때마다 터널 전류가 약 1/10로 줄어요. 이 민감함 덕분에 STM은 원자 한 개 높이 차이까지 구별해요. 탐침을 훑으면 원자 위에서는 전류가 크고 원자 사이에서는 작아서 원자 배열 이미지를 얻어요.',
      summary: '<ul><li><b>STM</b>: 뾰족한 금속 탐침을 표면에 약 0.5 nm까지 접근시키고 작은 전압(예: 0.1 V)을 걸면 진공 장벽을 전자가 터널링해 전류(수 nA)가 흘러요. 1981년 개발(비니히 · 로러).</li><li>모형 값: 거리 0.5 nm에서 3 nA, <b>0.1 nm 멀어질 때마다 전류가 약 1/10</b>(0.6 nm → 0.3 nA, 0.7 nm → 0.03 nA).</li><li><b>일정 높이 모드</b>: 탐침 높이를 고정하고 훑으면 원자 위에서 전류가 크고 원자 사이에서 작아요 → 전류 지도가 원자 배열 이미지.</li><li><b>일정 전류 모드</b>: 전류가 일정하도록 탐침 높이를 조절하면 그 높이 변화가 표면의 높낮이 지도예요.</li></ul>',
      missions: [
        {
          title: '거리를 바꿔 터널 전류 관찰하기',
          goal: '탐침과 표면 사이 거리를 <b>0.50 nm</b>와 <b>0.60 nm</b>로 각각 맞추고 전류를 비교하세요.',
          hint: '“탐침과 표면 사이의 거리” 슬라이더(+, − 버튼도 돼요)로 0.50과 0.60 nm를 맞춰요. 0.1 nm 멀어지면 전류가 몇 분의 1이 되는지 읽어요.',
          setup() { stopScan(true); S.st.seenG = {}; setScene('stm'); },
          check: () => !!S.st.seenG[50] && !!S.st.seenG[60],
          hold: 0.4,
          status: () => mark(!!S.st.seenG[50]) + ' 0.50 nm (' + fmtI(curOf(0.5)) + ') &nbsp; ' + mark(!!S.st.seenG[60]) + ' 0.60 nm (' + fmtI(curOf(0.6)) + ') · 지금 ' + fmtI(curOf(S.st.gapV / 100)),
          explain: '거리가 0.50 nm일 때 3 nA이던 전류가 0.60 nm에서는 <b>0.3 nA</b>(1/10)로 줄어요. 0.1 nm씩 멀어질 때마다 전류가 1/10씩 줄어서, 원자 한 개 높이 정도의 작은 차이(0.1 nm 안팎)도 전류에서는 크게 다르게 나타나요.',
        },
        {
          title: '빠진 원자 한 개 찾기', manual: true,
          goal: '“스캔 시작”으로 표면을 훑어 이미지를 만들고, <b>원자가 빠진 자리</b> 한 곳을 이미지에서 눌러 고르세요.',
          hint: '밝은 점이 원자예요. 원자가 줄지어 있는데 한 곳만 어두운 빈자리가 있어요. 스캔이 끝난 뒤 그 어두운 자리를 눌러요.',
          setup() { if (!S.st.scan || !S.st.scan.done) { stopScan(true); } S.st.guess = null; setScene('stm'); },
          check() {
            const sc = S.st.scan; if (!sc || !sc.done) return '먼저 “스캔 시작”을 눌러 이미지를 끝까지 만들어 보세요.';
            const g = S.st.guess; if (!g) return '이미지에서 원자가 빠진 어두운 자리를 눌러 고르세요.';
            const dd = Math.hypot(g.x - atX(VAC[0]), g.y - atY(VAC[1]));
            return dd <= 0.12 ? true : '그곳에는 원자가 있어요. 밝은 점이 줄지은 곳에서 어두운 빈자리를 찾아보세요.';
          },
          status: () => mark(!!(S.st.scan && S.st.scan.done)) + ' 스캔 완료 &nbsp; ' + mark(!!S.st.guess) + ' 자리 고르기',
          explain: '탐침 높이를 일정하게 두고 훑으면 원자 위에서는 거리가 가까워 전류가 크고(밝음), 원자가 없는 자리에서는 거리가 멀어 전류가 작아요(어두움). 이렇게 전류 지도에서 원자 하나의 빈자리까지 찾아낼 수 있어요.',
        },
        {
          type: 'quiz', title: '원자 한 개의 높이 차이도 보는 까닭',
          goal: 'STM이 원자 한 개 정도의 아주 작은 높이 차이까지 구별할 수 있는 까닭은?',
          setup() { setScene('stm'); },
          choices: ['탐침이 표면을 눌러서 원자를 하나씩 세기 때문에', '탐침에서 나온 빛이 원자에 반사되어 되돌아오기 때문에', '거리가 조금만 달라져도 터널 전류가 크게(1/10씩) 달라지기 때문에', '원자가 탐침에 달라붙어 전류가 늘어나기 때문에'],
          answer: 2,
          feedback: ['탐침은 표면에 닿지 않아요. 0.5 nm쯤 떨어진 채로 전류만 재요.', 'STM은 빛이 아니라 터널링하는 전자의 전류를 이용해요.', '', '탐침과 표면은 떨어져 있고 접촉하지 않아요. 전자가 진공 틈을 터널링해요.'],
          explain: '터널 전류는 거리에 <b>지수적으로</b> 민감해서 0.1 nm만 멀어져도 약 1/10로 줄어요. 그래서 원자 하나의 높이 차이도 전류 차이로 크게 나타나고, 그것을 이용해 표면의 원자 배열을 이미지로 만들어요.',
        },
      ],
    },
    {
      title: '소자와 별: 쓸모와 골칫거리', short: '소자와 별', icon: '💾', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> STM이 터널 효과를 이용하는 것을 봤어요. 터널 효과는 <b>유용할 때도, 문제가 될 때도</b> 있어요. 반도체 소자와 방사성 붕괴, 별에서 어떻게 나타나는지 살펴봐요.</div>' +
        '<p>트랜지스터의 <b>게이트 절연막</b>이 1~2 nm까지 얇아지면 전자가 절연막을 터널링해 <b>누설 전류</b>가 늘어 발열이 커져요. 반면 <b>플래시 메모리</b>는 전자를 얇은 절연막 너머로 터널링시켜 0과 1을 저장해요. 자연에서는 <b>알파 붕괴</b>와 <b>별의 핵융합</b>이 터널 효과 덕분에 일어나요.</p>',
      features: ['dev'],
      setup() { S.show.selK = false; S.dv.sub = 'leak'; S.dv.t = 5; slL.set(50); S.dv.seenSub = { leak: true }; setScene('dev'); },
      recap: '트랜지스터를 작게 만들어 절연막이 1~2 nm로 얇아지면 터널링 누설 전류가 급증해 발열이 커져요. 플래시 메모리는 전자가 얇은 절연막을 터널링하는 것으로 정보를 쓰고 지워요. 알파 붕괴와 별의 핵융합도 터널 효과로 일어나요.',
      summary: '<ul><li><b>소자 소형화의 문제</b>: 게이트 절연막이 1~2 nm로 얇아지면 전자가 터널링해 누설 전류가 급증하고 발열과 전력 낭비가 커져요 → 고유전체 같은 새 재료와 구조로 대응.</li><li><b>플래시 메모리</b>: 전자가 얇은 절연막을 터널링해 부유 게이트에 들어가거나 나오는 것으로 0과 1을 저장(전원이 꺼져도 유지). 한계: 반복하면 절연막이 낡아 전자가 샐 수 있어요.</li><li><b>자연</b>: 방사성 알파 붕괴(핵 속 알파 입자의 터널링), 별의 핵융합(양성자 두 개가 척력 장벽을 터널링, 다음 차시).</li><li>터널 다이오드, STM처럼 터널 효과를 이용하는 기술도 있어요.</li></ul>',
      missions: [
        {
          title: '누설이 문제되기 시작하는 두께 찾기',
          goal: '게이트 절연막 두께를 줄이다가 <b>🔥 과열 경고가 처음 켜지는 가장 두꺼운 두께</b>에 맞추세요.',
          hint: '누설 전류가 5.0 nm일 때의 1000배 이상이 되면 경고가 켜져요. 경고가 꺼져 있는 값 중 가장 얇은 값의 바로 아래 값이에요. 슬라이더를 0.5 nm씩 움직여 보세요.',
          setup() { S.show.selK = false; S.dv.sub = 'leak'; S.dv.seenSub.leak = true; setScene('dev'); },
          check: () => S.dv.sub === 'leak' && Math.abs(S.dv.t - 2.0) < 1e-6,
          hold: 0.6,
          status: () => mark(S.dv.sub === 'leak' && Math.abs(S.dv.t - 2.0) < 1e-6) + ' 지금 ' + S.dv.t.toFixed(1) + ' nm: 누설 ' + fmtLeak(leakOf(S.dv.t)) + (leakOf(S.dv.t) >= LEAK_WARN - 1e-9 ? ' (🔥 경고)' : ' (정상)'),
          explain: '절연막이 얇아질수록 터널링 확률이 급격히 커져서 누설 전류가 급증해요. 모형에서는 <b>2.0 nm</b>에서 누설이 5.0 nm일 때의 1000배가 되어 과열 경고가 처음 켜져요(2.5 nm는 약 300배로 아직 정상). 실제 소자도 1~2 nm 수준에서 누설이 큰 문제가 되어 새로운 재료와 구조를 써요.',
        },
        {
          title: '현상과 기술 카드 나누기', manual: true,
          goal: '터널 효과와 관련된 현상·기술 6장을 <b>유용하게 쓰여요</b>와 <b>문제가 돼요</b>로 나누세요. “플래시”, “알파·핵융합” 장면도 살펴봐요.',
          hint: '원자를 보는 STM, 정보를 저장하는 플래시 메모리, 에너지를 내는 핵융합은 쓸모가 있어요. 전자가 원치 않게 새는 것은 문제예요.',
          setup() { S.show.selK = true; SEL_K.reset(); S.dv.seenSub = { [S.dv.sub]: true }; setScene('dev'); },
          check() {
            if (!S.dv.seenSub.flash || !S.dv.seenSub.nat) return '“플래시”와 “알파·핵융합” 장면도 눌러서 살펴보세요.';
            return SEL_K.grade();
          },
          status: () => mark(!!S.dv.seenSub.flash) + ' 플래시 &nbsp; ' + mark(!!S.dv.seenSub.nat) + ' 알파·핵융합 &nbsp; · 나눈 카드 ' + SEL_K.count() + ' / 6',
          explain: '<b>유용</b>: STM(원자 관찰), 플래시 메모리(전자를 터널링시켜 정보 저장), 터널 다이오드, 태양의 핵융합(별이 빛나게 해요). <b>문제</b>: 트랜지스터 게이트 누설과 발열, 얇은 절연막에서 전자가 새어 저장한 정보가 사라지는 것. 플래시 메모리의 쓰기는 터널링을 이용한다는 장점이 있지만, 반복하면 절연막이 낡아 전자가 새는 한계도 있어요.',
        },
        {
          type: 'quiz', title: '작을수록 더 새는 까닭',
          goal: '트랜지스터를 더 작게 만들수록 누설 전류가 커지는 까닭은?',
          setup() { S.show.selK = false; S.dv.sub = 'leak'; setScene('dev'); },
          choices: ['절연막이 얇아지면 전자가 터널링할 확률이 급격히 커지기 때문에', '작은 트랜지스터는 전자가 더 무거워지기 때문에', '절연막이 얇아지면 전자가 느려져 더 오래 머물기 때문에', '작을수록 전자가 장벽을 넘을 에너지를 얻는 경우가 많아지기 때문에'],
          answer: 0,
          feedback: ['', '전자의 질량은 변하지 않아요. 달라지는 것은 장벽(절연막)의 두께예요.', '속도 때문이 아니에요. 통과 확률이 장벽 두께에 따라 달라져요.', '에너지를 얻어 넘는 것이 아니라 에너지가 부족해도 확률적으로 통과하는 터널 효과예요.'],
          explain: '터널링 확률은 장벽(절연막)이 얇아질수록 <b>급격히</b> 커져요. 절연막이 5 nm에서 1~2 nm로 얇아지면 누설 전류가 수천 배 늘어 발열과 전력 낭비가 커지고, 이것이 소자 소형화의 한계 중 하나예요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hq-tunneling', mount: '#game', badge: '터널 탐험가', homeHref: '../../index.html#hq',
    featureLabels: { cq: '⚽ 공과 언덕 · 🔵 전자의 확률 파동', prob: '📉 100만 번 시도 · 로그 그래프', stm: '🔬 STM 탐침 · 스캔 이미지', dev: '💾 트랜지스터 · 플래시 · 알파 붕괴' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  setScene('cq');
  updateCtl();
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t; S.dt = dt;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    view.apply();
    stepBall(dt); stepShots(dt); stepPr(dt); stepScan(dt); stepStmEl(dt); stepDev(dt);
    ctx.clearRect(0, 0, VW, VH);
    if (S.mode === 'cq') drawCq(); else if (S.mode === 'prob') drawPr(); else if (S.mode === 'stm') drawStm(); else drawDev();
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, MA, SEL_Q, SEL_P, SEL_K, CARDS, slT, slZ, slL, setScene, updateCtl, rollBall, Tof, log10T, fmtPct, leakOf, curOf, hAt, VAC, AT, NXP, NYP, startScan, atX, atY, stLay, REC_V, schedRun,
    get game() { return game; },
  };

})();
