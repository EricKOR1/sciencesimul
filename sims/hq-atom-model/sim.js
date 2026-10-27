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
     전자기와 양자 Ⅲ. 양자와 미시세계 - 불확정성과 원자 모형 (단원 4차시)
     성취기준 [12전자03-04] 현대의 원자모형을 불확정성 원리와 확률을 기반으로 설명하고, 보어의 원자모형과 비교할 수 있다.
     ① 탐구: 불확정성 (슬릿이 좁을수록 Δp가 커져요. Δx·Δp ≥ ħ/2 를 정성적으로, 크기 어림)
     ② 분석: 보어 모형 (궤도 r = 0.053n² nm, Eₙ = −13.6/n² eV, 장점과 한계)
     ③ 모형: 확률 구름 (수소 바닥 상태에서 전자의 위치를 측정한 점들, 거리별 발견 확률)
     ④ 분석: 모형 비교 (표와 문장 카드)
     슈뢰딩거 방정식, 파동 함수의 해, 오비탈, 양자수 l·m·s, 스핀, 전자 배치는 다루지 않아요.
     ========================================================= */

  /* ---------- 상수·모형 (화면의 숫자와 모두 같은 값) ---------- */
  const HBAR = 1.0546e-34, ME = 9.109e-31;
  const LAM_E = 0.17;                         // 50 V 전자의 드브로이 파장 (nm)
  const A0 = 0.0529;                          // 보어 반지름 (nm)
  const V1 = 2.2e6;                           // 보어 모형 바닥 상태 전자의 속력 (m/s)
  const BALL = { m: 0.145, dx: 1e-3 };        // 야구공: 0.145 kg, Δx = 1 mm
  const dxOf = (v) => Math.round(v) / 100;    // 슬라이더 값 → Δx (nm)
  const dpMin = (dxnm) => HBAR / (2 * dxnm * 1e-9);
  const dvMin = (dxnm) => dpMin(dxnm) / ME;
  const ballDp = () => HBAR / (2 * BALL.dx), ballDv = () => ballDp() / BALL.m;
  const sinc2 = (s) => (Math.abs(s) < 1e-6 ? 1 : Math.pow(Math.sin(s) / s, 2));
  const slitI = (dxnm, sinT) => sinc2(Math.PI * (dxnm / LAM_E) * sinT);   // 단일 슬릿의 세기 분포(모형)
  const theta1 = (dxnm) => (LAM_E / dxnm >= 1 ? 90 : Math.asin(LAM_E / dxnm) / rad);
  const EN = (n) => -13.6 / (n * n);
  const HLINES = { '3-2': { ni: 3, nf: 2, name: 'Hα' }, '4-2': { ni: 4, nf: 2, name: 'Hβ' }, '5-2': { ni: 5, nf: 2, name: 'Hγ' }, '2-1': { ni: 2, nf: 1, name: '자외선' } };
  const trE = (k) => 13.6 * (1 / (HLINES[k].nf * HLINES[k].nf) - 1 / (HLINES[k].ni * HLINES[k].ni));
  const trLam = (k) => 1240 / trE(k);
  const cdf = (x) => 1 - Math.exp(-2 * x) * (1 + 2 * x + 2 * x * x);   // 바닥 상태: r ≤ x·a₀ 에서 발견될 확률
  const NB = 15, BW = 0.02;                   // 히스토그램 구간 15개, 폭 0.02 nm
  const RING = [A0, 2 * A0, 3 * A0];
  const RING_T = ['0.053', '0.11', '0.16'];
  const sampleR = () => (A0 / 2) * (-Math.log(1 - Math.random()) - Math.log(1 - Math.random()) - Math.log(1 - Math.random()));

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'unc', t: 0, fade: 0,
    show: { numA: false, selB: false, selC: false, selT: false, selK: false },
    un: { dx: 0.5, seenN: false, seenW: false, dots: [], fly: [], queue: 0, qt: 0, reveal: false, acc: 0 },
    bo: { key: null, tp: 0, ang: 0.6, fired: {}, ph: null, n: 1, nShow: 1, lines: [], seenClasses: false },
    cl: { n: 0, pend: 0, hist: new Array(NB).fill(0), over: 0, c: [0, 0, 0], ring: true, flash: null, ymax: 5 },
    cm: { ang: 0, dotT: 0 },
  };
  let game = null;
  const MODE_LABEL = { unc: '🎚️ 불확정성', bohr: '🪐 보어 모형', cloud: '☁️ 확률 구름', cmp: '⚖️ 모형 비교' };
  function setScene(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); }
    S.mode = mode;
    $('#tbLabel').textContent = MODE_LABEL[mode];
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
    trSeg.set(S.bo.key || '');
    const rb = $('#bRing'); if (rb) rb.classList.toggle('btn-primary', S.cl.ring);
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));

  /* ---------- 컨트롤 ---------- */
  const slX = bindSlider('sX', (v) => dxOf(v).toFixed(2) + ' nm', (v) => {
    const U = S.un; U.dx = dxOf(v); U.dots.length = 0; U.fly.length = 0;
    if (U.dx <= 0.30) U.seenN = true; if (U.dx >= 0.80) U.seenW = true;
  });
  $('#bShot').addEventListener('click', () => { Sound.click(); S.un.queue += 10; });
  const trSeg = bindSeg('trSeg', (k) => startTr(k));
  $('#bClrSp').addEventListener('click', () => { Sound.click(); S.bo.lines.length = 0; S.bo.fired = {}; S.bo.key = null; S.bo.ph = null; S.bo.n = 1; S.bo.nShow = 1; updateCtl(); });
  function startTr(k) {
    const B = S.bo, h = HLINES[k];
    B.key = k; B.tp = 0; B.n = h.ni; B.nShow = h.ni; B.ang = rnd(-2.6, -0.5); B.ph = null; B.fired[k] = false; updateCtl();
  }
  const clAdd = (n) => { S.cl.pend += n; };
  $('#bM1').addEventListener('click', () => { Sound.click(); clAdd(1); });
  $('#bM100').addEventListener('click', () => { Sound.click(); clAdd(100); });
  $('#bM1k').addEventListener('click', () => { Sound.click(); clAdd(1000); });
  $('#bM10k').addEventListener('click', () => { Sound.click(); clAdd(10000); });
  $('#bRing').addEventListener('click', () => { Sound.click(); S.cl.ring = !S.cl.ring; updateCtl(); });
  $('#bClrC').addEventListener('click', () => { Sound.click(); resetCloud(); });

  const NUM_A = mkNum('numA', [
    { q: '전자를 <b>Δx = 0.10 nm</b>에 가두면 Δp ≥ 5.3×10⁻²⁵ kg·m/s (전자의 질량 m = 9.11×10⁻³¹ kg)예요. 속도의 불확정도 Δv = Δp / m 의 최솟값은?', unit: '× 10⁵ m/s', ans: 5.8, tol: 0.15, hint: 'Δv = Δp / m = (5.3×10⁻²⁵) / (9.11×10⁻³¹) 을 계산해요. 결과를 ×10⁵ 단위로 써요.' },
  ]);
  const SEL_B = mkSelRows('selB', [
    { q: '수소의 선스펙트럼 파장을 잘 설명해요', opts: ['보어 모형의 맞는 점', '보어 모형의 한계'], ans: 0 },
    { q: '에너지 준위가 E<sub>n</sub> = −13.6/n² eV처럼 띄엄띄엄해요', opts: ['보어 모형의 맞는 점', '보어 모형의 한계'], ans: 0 },
    { q: '궤도 위 전자의 위치와 속도를 <b>동시에 정확히</b> 안다고 가정해요', opts: ['보어 모형의 맞는 점', '보어 모형의 한계'], ans: 1 },
    { q: '전자가 여러 개인 원자(중성 헬륨 등)의 스펙트럼은 보어 식으로 맞게 계산되지 않아요', opts: ['보어 모형의 맞는 점', '보어 모형의 한계'], ans: 1 },
    { q: '원자의 크기가 궤도 반지름으로 딱 정해진다고 봐요', opts: ['보어 모형의 맞는 점', '보어 모형의 한계'], ans: 1 },
    { q: '준위 사이를 전이할 때 hf = ΔE인 광자가 나온다고 설명해요', opts: ['보어 모형의 맞는 점', '보어 모형의 한계'], ans: 0 },
  ]);
  const SEL_C = mkSelRows('selC', [
    { q: '점을 1000개 이상 쌓은 히스토그램에서 <b>발견 횟수가 가장 많은 거리</b>는?', opts: ['약 0.026 nm', '약 0.053 nm', '약 0.11 nm', '약 0.16 nm'], ans: 1 },
  ]);
  const TBL = [
    { label: '전자의 위치', opts: [{ b: '확률 분포(구름)', m: '정해진 궤도' }, { b: '정해진 궤도', m: '확률 분포(구름)' }], ans: 1 },
    { label: '불확정성 원리', opts: [{ b: '위배돼요', m: '반영해요' }, { b: '반영해요', m: '위배돼요' }], ans: 0 },
    { label: '에너지 준위', opts: [{ b: '연속적이에요', m: '띄엄띄엄 유지' }, { b: '띄엄띄엄해요', m: '띄엄띄엄 유지' }, { b: '띄엄띄엄해요', m: '연속적이에요' }], ans: 1 },
    { label: '선스펙트럼 설명', opts: [{ b: '수소만 잘 설명', m: '더 많은 원자 설명' }, { b: '모든 원자 설명', m: '수소만 설명' }], ans: 0 },
    { label: '가장 가능성 높은 거리', opts: [{ b: '0.053 nm', m: '0.11 nm' }, { b: '0.053 nm', m: '0.053 nm' }, { b: '0.053 nm', m: '0.053 nm 안쪽만' }], ans: 1 },
  ];
  const SEL_T = mkSelRows('selT', TBL.map((r) => ({
    q: '<b>' + r.label + '</b>', ans: r.ans,
    opts: r.opts.map((o) => '보어: ' + o.b + ' / 현대: ' + o.m),
  })));
  const CARDS = [
    { q: '전자가 정해진 원 궤도를 돌아요', ans: 0 },
    { q: '전자를 발견될 확률의 분포로 나타내요', ans: 1 },
    { q: '위치와 속도를 동시에 정확히 아는 경로를 가정해요', ans: 0 },
    { q: '불확정성 원리를 바탕으로 해요', ans: 1 },
    { q: '수소의 에너지가 E<sub>n</sub> = −13.6/n² eV로 띄엄띄엄해요', ans: 2 },
    { q: '수소의 바닥 상태에서 전자가 가장 많이 발견되는 거리가 0.053 nm예요', ans: 2 },
    { q: '수소 말고 헬륨 같은 원자의 스펙트럼도 설명하는 방향으로 이어져요', ans: 1 },
    { q: '원자의 크기가 궤도 반지름으로 딱 정해진다고 봐요', ans: 0 },
  ];
  const SEL_K = mkSelRows('selK', CARDS.map((c) => ({ q: c.q, ans: c.ans, opts: ['보어 모형만', '현대 원자 모형만', '두 모형 모두'] })));

  function resetCloud() {
    const L = S.cl; L.n = 0; L.pend = 0; L.hist.fill(0); L.over = 0; L.c = [0, 0, 0]; L.flash = null; L.ymax = 5;
    cloudCtx.clearRect(0, 0, cloudCv.width, cloudCv.height);
  }

  /* ---------- 전자 구름 오프스크린 ---------- */
  const CS = PHONE ? 260 : 340;                           // 구름 그림의 한 변 (가상 픽셀)
  const CPPN = CS / 0.5;                                  // 가상 픽셀 / nm (한 변 = 0.5 nm)
  const cloudCv = document.createElement('canvas'); cloudCv.width = CS * 2; cloudCv.height = CS * 2;
  const cloudCtx = cloudCv.getContext('2d');
  const staticCv = document.createElement('canvas'); staticCv.width = 240; staticCv.height = 240;
  (function () {
    const g = staticCv.getContext('2d'); const rand = mulberry32(7); g.fillStyle = 'rgba(47,107,255,.42)';
    for (let i = 0; i < 4200; i++) {
      const r = (A0 / 2) * (-Math.log(1 - rand()) - Math.log(1 - rand()) - Math.log(1 - rand()));
      const ct = 2 * rand() - 1, st = Math.sqrt(1 - ct * ct), ph = rand() * TAU;
      const x = r * st * Math.cos(ph), y = r * st * Math.sin(ph);
      g.fillRect(120 + x * 480 - 1, 120 + y * 480 - 1, 2, 2);
    }
  })();
  // 점 하나 측정: 반환 {x, y} (그림 좌표, nm)
  function measureOne() {
    const L = S.cl, r = sampleR(), ct = 2 * Math.random() - 1, st = Math.sqrt(1 - ct * ct), ph = Math.random() * TAU;
    const x = r * st * Math.cos(ph), y = r * st * Math.sin(ph);
    L.n++;
    const bi = Math.floor(r / BW); if (bi < NB) L.hist[bi]++; else L.over++;
    RING.forEach((R, i) => { if (r <= R) L.c[i]++; });
    cloudCtx.fillStyle = 'rgba(47,107,255,.45)';
    const px = CS + x * CPPN * 2, py = CS + y * CPPN * 2;
    if (px > 0 && px < CS * 2 && py > 0 && py < CS * 2) cloudCtx.fillRect(px - 2, py - 2, 4, 4);
    return { x, y };
  }

  /* ---------- 위치 ---------- */
  const unLay = () => PHONE
    ? { a: { x: 8, y: 8, w: 464, h: 250 }, b: { x: 8, y: 266, w: 464, h: 190 }, c: { x: 8, y: 464, w: 464, h: 208 } }
    : { a: { x: 12, y: 12, w: 520, h: 326 }, b: { x: 544, y: 12, w: 244, h: 326 }, c: { x: 12, y: 350, w: 776, h: 198 } };
  function unGeom() {
    const L = unLay().a, kk = L.h / 326;
    const cy = L.y + L.h / 2 + 8 * kk;
    const sx = L.x + L.w - 46, wx = L.x + (PHONE ? 112 : 150), srcx = L.x + 34;
    const H = L.h / 2 - 30 * kk, Lg = sx - wx;
    return { L, kk, cy, sx, wx, srcx, H, Lg, slit: (12 + (S.un.dx - 0.1) / 0.9 * 92) * kk };
  }
  // 스크린 위 위치 y(px)에서 상대 세기
  const unIAt = (g, y) => { const th = Math.atan2(y, g.Lg); return slitI(S.un.dx, Math.sin(th)); };
  function unSampleY(g) {
    for (let k = 0; k < 200; k++) { const y = (Math.random() * 2 - 1) * g.H; if (Math.random() < unIAt(g, y)) return y; }
    return 0;
  }
  function stepUnc(dt) {
    const U = S.un, g = unGeom();
    U.acc += dt * (S.mode === 'unc' ? 1.3 : 0);
    while (U.acc >= 1) { U.acc -= 1; if (U.fly.length < 12) U.fly.push({ t: 0, y: unSampleY(g) }); }
    if (U.queue > 0) { U.qt -= dt; if (U.qt <= 0) { U.qt = 0.11; U.queue--; U.fly.push({ t: 0, y: unSampleY(g) }); } }
    for (let i = U.fly.length - 1; i >= 0; i--) {
      const f = U.fly[i]; f.t += dt / 0.9;
      if (f.t >= 1) {
        U.fly.splice(i, 1);
        if (S.mode === 'unc') { U.dots.push({ y: f.y, dx: Math.random() * 28, a: 1 }); if (U.dots.length > 600) U.dots.shift(); parts.burst(g.sx + 14, g.cy + f.y, { count: 5, colors: ['#ffd54a', '#fff'], speed: 60, life: 0.4, size: 2, gravity: 0 }); }
      }
    }
  }

  /* ================= ① 불확정성 ================= */
  function drawUnc() {
    const { a: A, b: B, c: Cc } = unLay(), g = unGeom(), U = S.un, kk = g.kk;
    panel(A.x, A.y, A.w, A.h, 14);
    T(A.x + 14, A.y + 22, '슬릿을 지나는 전자 (슬릿 폭 Δx = 위치의 불확정도)', PHONE ? 13 : 14.5, '#26324a', 'left', 800);
    const cy = g.cy, lam = 16 * kk + 4;
    // 전자총
    D.shadow(() => { D.roundRect(g.srcx - 24, cy - 17, 34, 34, 8); ctx.fillStyle = '#5d6879'; ctx.fill(); }, { blur: 6, y: 2 });
    ctx.fillStyle = '#ffd54a'; ctx.fillRect(g.srcx + 10, cy - 5, 8, 10);
    T(g.srcx - 7, cy + 33, '전자총', 12.5, '#5d6879', 'center', 800);
    // 들어오는 평면 파동(앞면)
    ctx.save(); ctx.strokeStyle = 'rgba(56,103,244,.45)'; ctx.lineWidth = 2;
    const off = RM ? 0 : (S.t * 46) % lam;
    for (let x = g.srcx + 20 + off; x < g.wx - 4; x += lam) { ctx.beginPath(); ctx.moveTo(x, cy - 40 * kk - 18); ctx.lineTo(x, cy + 40 * kk + 18); ctx.stroke(); }
    ctx.restore();
    // 슬릿 뒤 퍼지는 파동
    ctx.save(); ctx.beginPath(); ctx.rect(g.wx + 4, A.y + 30, g.sx - g.wx - 3, A.h - 36); ctx.clip();
    const phase = RM ? 0 : (S.t * 46) % lam;
    for (let k = 0; k < 24; k++) {
      const r = phase + k * lam + 6; if (r > g.Lg * 1.6) break;
      for (let a = -88; a <= 88; a += 3) {
        const I = slitI(U.dx, Math.sin(a * rad));
        const al = Math.pow(I, 0.7) * 0.75 * (1 - r / (g.Lg * 1.7));
        if (al < 0.03) continue;
        ctx.strokeStyle = 'rgba(56,103,244,' + al.toFixed(3) + ')'; ctx.lineWidth = 2.6;
        ctx.beginPath(); ctx.arc(g.wx, cy, r, a * rad - 0.026, a * rad + 0.026); ctx.stroke();
      }
    }
    ctx.restore();
    // 슬릿이 있는 벽 (벽은 막고, 슬릿만 열려 있어요)
    D.shadow(() => {
      ctx.fillStyle = '#6b7488';
      ctx.fillRect(g.wx - 6, A.y + 30, 12, cy - g.slit - (A.y + 30));
      ctx.fillRect(g.wx - 6, cy + g.slit, 12, A.y + A.h - 30 - (cy + g.slit));
    }, { blur: 6, y: 2 });
    // Δx 표시
    D.arrow(g.wx - 18, cy + g.slit, g.wx - 18, cy - g.slit, { color: '#e2464b', width: 2.2, head: 8 });
    D.arrow(g.wx - 18, cy - g.slit, g.wx - 18, cy + g.slit, { color: '#e2464b', width: 2.2, head: 8 });
    D.label(g.wx - 44, cy, 'Δx', { size: 13, bg: '#e2464b' });
    // 스크린과 세기 곡선
    ctx.fillStyle = '#26324a'; ctx.fillRect(g.sx - 1.5, cy - g.H, 3, g.H * 2);
    const Wm = 66 * kk + 8;
    ctx.beginPath(); ctx.moveTo(g.sx, cy - g.H);
    for (let y = -g.H; y <= g.H; y += 3) ctx.lineTo(g.sx - unIAt(g, y) * Wm, cy + y);
    ctx.lineTo(g.sx, cy + g.H); ctx.closePath(); ctx.fillStyle = 'rgba(56,103,244,.16)'; ctx.fill();
    ctx.strokeStyle = '#3867f4'; ctx.lineWidth = 2; ctx.beginPath();
    for (let y = -g.H; y <= g.H; y += 3) { const x = g.sx - unIAt(g, y) * Wm; if (y === -g.H) ctx.moveTo(x, cy + y); else ctx.lineTo(x, cy + y); }
    ctx.stroke();
    T(g.sx - Wm - 4, cy - g.H - 8, '도착 확률', 12.5, '#3867f4', 'center', 800);
    // 첫 어두운 곳
    const t1 = theta1(U.dx);
    if (t1 < 89) { const yy = g.Lg * Math.tan(t1 * rad); if (yy < g.H) [-1, 1].forEach((s) => { D.arrow(g.sx - 22, cy + s * yy, g.sx - 2, cy + s * yy, { color: '#8b5cf6', width: 2, head: 7 }); }); }
    // 도착한 점
    U.dots.forEach((d) => { ctx.fillStyle = 'rgba(255,170,0,.9)'; ctx.beginPath(); ctx.arc(g.sx + 5 + d.dx, cy + d.y, 2.1, 0, TAU); ctx.fill(); });
    // 날아가는 전자
    U.fly.forEach((f) => {
      let x, y;
      if (f.t < 0.5) { const q = f.t / 0.5; x = g.srcx + 20 + (g.wx - g.srcx - 20) * q; y = cy; }
      else { const q = (f.t - 0.5) / 0.5; x = g.wx + (g.sx + 14 - g.wx) * q; y = cy + f.y * q; }
      D.glow(x, y, 11, '#ffd54a', 0.7); D.sphere(x, y, 4.2, '#ffb400');
    });
    // 슬릿 뒤 운동량 화살표(길이 ∝ Δp)
    const dp = dpMin(U.dx), alen = clamp(dp / dpMin(0.1) * 54 * kk, 4, 60 * kk);
    D.arrow(g.wx + 22, cy, g.wx + 22, cy - alen, { color: '#14a058', width: 2.4, head: 7 });
    D.arrow(g.wx + 22, cy, g.wx + 22, cy + alen, { color: '#14a058', width: 2.4, head: 7 });
    T(g.wx + 30, cy - alen - 6, 'Δpᵧ', 12.5, '#0f7a42', 'left', 800);
    T(A.x + 14, A.y + A.h - 9, '초록 화살표 = 운동량의 불확정도(진행 방향에 수직인 성분)', PHONE ? 11.5 : 12.5, '#5d6879', 'left', 700);
    ctx.restore();

    // B: Δx · Δp 그래프
    panel(B.x, B.y, B.w, B.h, 14);
    T(B.x + 12, B.y + 22, 'Δx 와 Δp 의 관계', PHONE ? 13 : 14.5, '#26324a', 'left', 800);
    const ax = axes(B.x + (PHONE ? 70 : 52), B.y + 40, B.w - (PHONE ? 100 : 78), B.h - (PHONE ? 98 : 96), { xmin: 0, xmax: 1.0, ymin: 0, ymax: 6, xt: [[0, '0'], [0.5, '0.5'], [1.0, '1.0']], yt: [[0, '0'], [2, '2'], [4, '4'], [6, '6']], xl: 'Δx (nm)', yl: 'Δp (×10⁻²⁵ kg·m/s)', ylx: 32, fs: 12 });
    const dpv = (x) => dpMin(x) / 1e-25;
    const xmin = Math.max(0.0001, HBAR / (2 * 6e-25) / 1e-9);
    ctx.save(); ctx.beginPath(); ctx.rect(ax.x, ax.y, ax.w, ax.h); ctx.clip();
    ctx.beginPath(); ctx.moveTo(ax.X(xmin), ax.Y(0)); ctx.lineTo(ax.X(xmin), ax.Y(6));
    for (let x = xmin; x <= 1.0; x += 0.01) ctx.lineTo(ax.X(x), ax.Y(Math.min(6, dpv(x))));
    ctx.lineTo(ax.X(1), ax.Y(0)); ctx.closePath(); ctx.fillStyle = 'rgba(226,70,75,.10)'; ctx.fill();
    ctx.beginPath(); for (let x = xmin; x <= 1.0; x += 0.01) { const px = ax.X(x), py = ax.Y(dpv(x)); if (x === xmin) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
    ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 2.6; ctx.stroke();
    const px = ax.X(U.dx), py = ax.Y(dpv(U.dx));
    ctx.fillStyle = 'rgba(20,160,88,.22)'; ctx.fillRect(ax.X(0), py, px - ax.X(0), ax.Y(0) - py);
    ctx.setLineDash([5, 4]); ctx.strokeStyle = '#14a058'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(px, ax.Y(0)); ctx.lineTo(px, py); ctx.lineTo(ax.X(0), py); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    D.sphere(px, py, 7, '#e2464b', { shadow: true });
    T(ax.x + ax.w - 6, ax.y + ax.h * 0.42, '곡선 위쪽만 가능', PHONE ? 11.5 : 12.5, '#e2464b', 'right', 800);
    T(ax.x + ax.w - 6, ax.y + ax.h * 0.42 + 16, 'Δx·Δp ≥ ħ/2', PHONE ? 12 : 13, '#0f7a42', 'right', 800);
    T(B.x + B.w / 2, B.y + B.h - 8, '초록 직사각형의 넓이 = ħ/2 (일정)', PHONE ? 11.5 : 12.5, '#0f7a42', 'center', 800);

    // C: 크기 어림 표
    panel(Cc.x, Cc.y, Cc.w, Cc.h, 14);
    T(Cc.x + 14, Cc.y + 22, '크기 어림: Δx·Δp ≥ ħ/2 (ħ = h/2π = 1.05×10⁻³⁴ J·s)', PHONE ? 13 : 14.5, '#26324a', 'left', 800);
    const fs = PHONE ? 12.5 : 14;
    const cols = PHONE ? [Cc.x + 12, Cc.x + 112, Cc.x + 214, Cc.x + 342] : [Cc.x + 16, Cc.x + 170, Cc.x + 340, Cc.x + 560];
    const hy = Cc.y + 48;
    ['입자', '가둔 폭 Δx', 'Δp 의 최솟값', 'Δv = Δp/m'].forEach((h, i) => T(cols[i], hy, h, fs - 0.5, '#5d6879', 'left', 800));
    ctx.fillStyle = '#e3e8f2'; ctx.fillRect(Cc.x + 10, hy + 7, Cc.w - 20, 1.5);
    const r1 = hy + 30, r2 = hy + 64;
    T(cols[0], r1, '전자', fs, '#26324a', 'left', 800);
    T(cols[1], r1, dxOf(+$('#sX').value).toFixed(2) + ' nm', fs, '#26324a', 'left', 800);
    T(cols[2], r1, '≥ ' + sci(dp, 1) + ' kg·m/s', fs, '#26324a', 'left', 800);
    if (U.reveal || (game && game.free)) T(cols[3], r1, '≥ ' + sci(dvMin(U.dx), 1) + ' m/s', fs, '#0f7a42', 'left', 800);
    else T(cols[3], r1, '직접 계산해 보세요', fs, '#c47a00', 'left', 800);
    T(cols[0], r2, '야구공', fs, '#26324a', 'left', 800);
    T(cols[1], r2, '1 mm', fs, '#26324a', 'left', 800);
    T(cols[2], r2, '≥ ' + sci(ballDp(), 1) + ' kg·m/s', fs, '#26324a', 'left', 800);
    T(cols[3], r2, '≥ ' + sci(ballDv(), 1) + ' m/s', fs, '#0f7a42', 'left', 800);
    const ty = r2 + 26;
    textBlock(Cc.x + 14, ty, Cc.w - 28, PHONE ? '야구공(0.145 kg)은 ħ가 너무 작아서 불확정도가 관측할 수 없을 만큼 작아요. 이것은 측정 장비의 서투름이 아니라 자연의 성질이에요.' : '야구공(0.145 kg)은 ħ가 너무 작아서 Δv가 관측할 수 없을 만큼 작아요. 원자 속 전자는 달라요. 이것은 측정 장비가 서툴러서가 아니라 자연의 성질이에요.', PHONE ? 12 : 13.5, '#5d6879', PHONE ? 16 : 18, 700);
  }

  /* ================= ② 보어 모형 ================= */
  const boLay = () => PHONE
    ? { a: { x: 8, y: 8, w: 464, h: 252 }, b: { x: 8, y: 268, w: 464, h: 240 }, c: { x: 8, y: 516, w: 464, h: 156 } }
    : { a: { x: 12, y: 12, w: 380, h: 326 }, b: { x: 402, y: 12, w: 386, h: 326 }, c: { x: 12, y: 350, w: 776, h: 198 } };
  const ORB = [0, 16, 44, 74, 102, 130];
  function stepBohr(dt) {
    const B = S.bo;
    if (B.key) {
      B.tp += dt;
      const h = HLINES[B.key];
      if (B.tp < 1.5) { B.n = h.ni; B.nShow = h.ni; }
      else {
        B.nShow = SciSim.approach(B.nShow, h.nf, dt, 7);
        if (!B.fired[B.key]) {
          B.fired[B.key] = true; B.n = h.nf; B.ph = { x: 0, t: 0, key: B.key };
          const lam = trLam(B.key); const dup = B.lines.some((l) => l.key === B.key);
          if (!dup) B.lines.push({ key: B.key, lam, name: h.name });
          Sound.tick();
        }
      }
      if (B.ph) { B.ph.t += dt; B.ph.x = B.ph.t * 170; if (B.ph.t > 1.6) B.ph = null; }
    }
  }
  function drawBohr() {
    const { a: A, b: Bp, c: Cc } = boLay(), B = S.bo;
    const kk = PHONE ? 0.8 : 1;
    panel(A.x, A.y, A.w, A.h, 14);
    T(A.x + 14, A.y + 22, '보어 모형: 정해진 궤도를 도는 전자', PHONE ? 13 : 14.5, '#26324a', 'left', 800);
    const cx = A.x + A.w / 2, cy = A.y + A.h / 2 + 12;
    for (let n = 1; n <= 5; n++) {
      const R = ORB[n] * kk;
      ctx.strokeStyle = n === Math.round(B.nShow) || n === B.n ? 'rgba(56,103,244,.8)' : 'rgba(93,104,121,.38)'; ctx.lineWidth = n === B.n ? 2.2 : 1.4; ctx.setLineDash(n === B.n ? [] : [4, 4]);
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      if (n >= 2) T(cx + R * Math.cos(-0.95) + 3, cy + R * Math.sin(-0.95) - 2, 'n=' + n, 12, '#5d6879', 'left', 800, { stroke: '#fff', strokeWidth: 3 });
    }
    T(cx, cy + ORB[1] * kk + 16, 'n=1', 12, '#5d6879', 'center', 800, { stroke: '#fff', strokeWidth: 3 });
    D.glow(cx, cy, 20, '#ff7a45', 0.5); D.sphere(cx, cy, 5.5, '#e2464b', { shadow: true });
    // 전자 (반지름이 n에 따라 부드럽게 이동)
    const Rn = (nn) => { const i = clamp(nn, 1, 5), lo = Math.floor(i), hi = Math.min(5, lo + 1); return (ORB[lo] + (ORB[hi] - ORB[lo]) * (i - lo)) * kk; };
    const ang = B.ang + S.t * 3.2 / Math.pow(Math.max(1, B.nShow), 1.5) * (RM ? 0 : 1);
    const er = Rn(B.nShow), ex = cx + er * Math.cos(ang), ey = cy + er * Math.sin(ang);
    const exc = B.key && B.nShow > HLINES[B.key].nf + 0.05;
    if (exc) D.glow(ex, ey, 22, '#ffb400', 0.7);
    D.sphere(ex, ey, 6, '#3867f4', { shadow: true });
    // 방출 광자
    if (B.ph) {
      ctx.save(); D.roundRect(A.x, A.y, A.w, A.h, 14); ctx.clip();
      const lam = trLam(B.ph.key), col = lam < 380 ? '#8b5cf6' : wlColor(lam), a0 = -1.2;
      const x0 = cx + Math.cos(a0) * 24, y0 = cy + Math.sin(a0) * 24, ds = B.ph.x;
      ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.globalAlpha = 1;
      ctx.beginPath();
      for (let s = -26; s <= 26; s += 2) { const env = Math.exp(-Math.pow(s / 14, 2)), w = 6 * env * Math.sin(s * 0.45 - B.ph.t * 12), pos = ds + s; const xx = x0 + Math.cos(a0) * pos - Math.sin(a0) * w, yy = y0 + Math.sin(a0) * pos + Math.cos(a0) * w; if (s === -26) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy); }
      ctx.stroke(); ctx.restore(); ctx.restore();
    }
    const k = B.key;
    if (k) T(A.x + 14, A.y + A.h - 10, 'n = ' + HLINES[k].ni + ' → ' + HLINES[k].nf + (B.tp < 1.5 ? ' (들뜬 상태에서 기다리는 중)' : ' (전이!)'), PHONE ? 12.5 : 13.5, '#26324a', 'left', 800);
    else T(A.x + 14, A.y + A.h - 10, '오른쪽 위 버튼에서 전이를 골라 보세요', PHONE ? 12 : 13, '#5d6879', 'left', 700);
    T(A.x + A.w - 12, A.y + 22, 'rₙ = 0.053n² nm', PHONE ? 11.5 : 12.5, '#5d6879', 'right', 700);

    // B: 에너지 준위 도표 + 방출선 막대
    panel(Bp.x, Bp.y, Bp.w, Bp.h, 14);
    T(Bp.x + 14, Bp.y + 22, '에너지 준위 Eₙ = −13.6/n² (eV)', PHONE ? 12.5 : 14.5, '#26324a', 'left', 800);
    const dg = { x: Bp.x + 24, y: Bp.y + 40, w: Bp.w - 48, h: PHONE ? 126 : 206 };
    const Ey = (E) => dg.y + dg.h - (E + 13.6) / 13.6 * (dg.h - 10) - 6;
    const lx0 = dg.x + 40, lx1 = dg.x + dg.w * 0.5;
    const lab = []; for (let n = 1; n <= 6; n++) lab.push({ n, y: Ey(EN(n)) });
    for (let i = lab.length - 2; i >= 0; i--) { const need = lab[i + 1].y + 0; lab[i].ly = lab[i].y; }
    // 라벨 y 간격 벌리기 (위에서 아래로)
    let lastY = -1e9; const order = lab.slice().sort((a, b) => a.y - b.y);
    order.forEach((o) => { o.ly = Math.max(o.y, lastY + (PHONE ? 13 : 15)); lastY = o.ly; });
    for (let n = 1; n <= 6; n++) {
      const y = Ey(EN(n)), on = n === B.n;
      ctx.strokeStyle = on ? '#3867f4' : '#7f93bd'; ctx.lineWidth = on ? 3.2 : 2; ctx.beginPath(); ctx.moveTo(lx0, y); ctx.lineTo(lx1, y); ctx.stroke();
      const o = lab[n - 1];
      ctx.strokeStyle = '#c3cbd9'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(lx1, y); ctx.lineTo(lx1 + 10, o.ly - 4); ctx.stroke();
      T(lx1 + 14, o.ly, 'n=' + n + '   ' + EN(n).toFixed(n < 4 ? 1 : 2).replace('-', '−') + ' eV', PHONE ? 11.5 : 12.5, on ? '#3867f4' : '#5d6879', 'left', 800);
    }
    ctx.strokeStyle = '#c3cbd9'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(lx0, Ey(0)); ctx.lineTo(lx1, Ey(0)); ctx.stroke(); ctx.setLineDash([]);
    T(lx0 - 6, Ey(0) + 4, '0', 12, '#5d6879', 'right', 800);
    // 지금까지 일어난 전이 화살표
    Object.keys(HLINES).forEach((key, i) => {
      if (!B.lines.some((l) => l.key === key) && B.key !== key) return;
      const h = HLINES[key], lam = trLam(key), col = lam < 380 ? '#8b5cf6' : wlColor(lam);
      const ax0 = lx0 + 10 + i * ((lx1 - lx0 - 20) / 3);
      D.arrow(ax0, Ey(EN(h.ni)) + 2, ax0, Ey(EN(h.nf)) - 2, { color: col, width: 3, head: 9, alpha: B.key === key ? 1 : 0.6 });
    });
    if (k && B.tp >= 1.5) {
      D.label(dg.x + dg.w * 0.27, Ey(-8.2), 'ΔE = ' + trE(k).toFixed(2) + ' eV → ' + Math.round(trLam(k)) + ' nm' + (trLam(k) < 380 ? ' (자외선)' : ''), { size: PHONE ? 12 : 13.5, bg: '#26324a', color: '#fff' });
    }
    // 스펙트럼 막대
    const sy = Bp.y + Bp.h - (PHONE ? 52 : 50), sx0 = Bp.x + 20, sw = Bp.w - 40;
    const sX = (lam) => sx0 + (lam - 380) / 400 * sw;
    ctx.save(); D.roundRect(sx0, sy, sw, 22, 6); ctx.clip();
    ctx.fillStyle = '#10151f'; ctx.fillRect(sx0, sy, sw, 22);
    ctx.restore();
    B.lines.forEach((l) => { if (l.lam < 380 || l.lam > 780) return; ctx.fillStyle = wlColor(l.lam); ctx.fillRect(sX(l.lam) - 1.8, sy, 3.6, 22); });
    ctx.strokeStyle = '#5d6879'; ctx.lineWidth = 1.2; D.roundRect(sx0, sy, sw, 22, 6); ctx.stroke();
    [400, 500, 600, 700].forEach((v) => T(sX(v), sy + 36, v + '', 11.5, '#5d6879', 'center', 700));
    B.lines.forEach((l) => { if (l.lam >= 380 && l.lam <= 780) T(sX(l.lam), sy - 5, l.name, 12, wlColor(l.lam) === '#ffffff' ? '#26324a' : '#26324a', 'center', 800); });
    if (B.lines.some((l) => l.lam < 380)) T(sx0 + sw, sy - 5, '자외선은 눈에 안 보여요', 11.5, '#8b5cf6', 'right', 800);
    T(sx0, sy - 5, 'nm', 11.5, '#5d6879', 'left', 700);

    // C: 점검 (왼쪽) / 불확정성과 속도 (오른쪽)
    panel(Cc.x, Cc.y, Cc.w, Cc.h, 14);
    const half = PHONE ? Cc.w : 392, lx = Cc.x + 12;
    T(lx, Cc.y + 20, '한계 점검: 궤도 위의 전자', PHONE ? 12.5 : 14, '#26324a', 'left', 800);
    // 속력 막대 + 불확실한 폭
    const bw = (PHONE ? Cc.w - 40 : 340), by = Cc.y + (PHONE ? 38 : 54), dvv = dvMin(0.1);
    barH(lx, by, bw, 18, 1, '#3867f4');
    const wdv = clamp(dvv / V1, 0, 1) * bw;
    ctx.save(); D.roundRect(lx, by, bw, 18, 9); ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    for (let x = lx + bw - wdv; x < lx + bw; x += 6) { ctx.beginPath(); ctx.moveTo(x, by + 18); ctx.lineTo(x + 8, by); ctx.lineTo(x + 11, by); ctx.lineTo(x + 3, by + 18); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    T(lx + 8, by + 13.5, 'v₁ = 2.2×10⁶ m/s', 12.5, '#fff', 'left', 800);
    T(lx + bw - wdv / 2, by + 36, 'Δv ≥ 5.8×10⁵ m/s ≈ ' + Math.round(dvv / V1 * 100) + ' %', PHONE ? 11.5 : 12.5, '#c0353b', 'center', 800);
    if (!PHONE) {
      textBlock(lx, by + 62, 350, '전자를 원자 크기(Δx = 0.10 nm)에 가두면 속도가 v의 약 ' + Math.round(dvv / V1 * 100) + ' %나 불확실해요. 위치와 속도를 동시에 아는 궤도는 불확정성 원리와 맞지 않아요.', 13, '#5d6879', 18, 700);
    }
    // 분류 열
    const colx = PHONE ? [Cc.x + 12, Cc.x + 238] : [Cc.x + 408, Cc.x + 600], cw = PHONE ? 218 : 182, cy0 = PHONE ? Cc.y + 96 : Cc.y + 20;
    T(colx[0], cy0, '✅ 맞는 점', PHONE ? 12 : 13, '#0f7a42', 'left', 800);
    T(colx[1], cy0, '⚠️ 한계', PHONE ? 12 : 13, '#c0353b', 'left', 800);
    const SHORT = ['수소 선스펙트럼 파장', '준위 Eₙ = −13.6/n² eV', '위치·속도를 동시에 앎', '여러 전자 원자는 못 설명', '크기가 궤도로 딱 정해짐', '전이 때 hf = ΔE 광자'];
    const cnt = [0, 0];
    SHORT.forEach((s, i) => {
      const v = SEL_B.vals[i]; if (v === undefined || v === '') return;
      const c = +v, yy = cy0 + 8 + cnt[c] * (PHONE ? 15 : 19); cnt[c]++;
      const bad = SEL_B.sels[i].classList.contains('bad');
      T(colx[c], yy + 11, s, PHONE ? 10.5 : 11.5, bad ? '#c0353b' : c === 0 ? '#0f7a42' : '#26324a', 'left', 800);
    });
    if (cnt[0] + cnt[1] === 0) T(colx[0], cy0 + 22, '문장을 나누면 여기에 모여요', PHONE ? 11 : 12, '#9aa5b8', 'left', 700);
  }

  /* ================= ③ 확률 구름 ================= */
  const clLay = () => PHONE
    ? { a: { x: 8, y: 8, w: 464, h: 296 }, b: { x: 8, y: 312, w: 464, h: 210 }, c: { x: 8, y: 530, w: 464, h: 142 } }
    : { a: { x: 12, y: 12, w: 380, h: 398 }, b: { x: 402, y: 12, w: 386, h: 398 }, c: { x: 12, y: 422, w: 776, h: 126 } };
  function stepCloud(dt) {
    const L = S.cl;
    if (L.flash) { L.flash.t += dt; if (L.flash.t > 0.8) L.flash = null; }
    if (L.pend > 0) {
      const rate = Math.max(160, L.pend * 2.2) * dt;
      let k = Math.max(1, Math.round(rate));
      if (L.pend < 1) k = 0;
      k = Math.min(k, L.pend);
      let last = null;
      for (let i = 0; i < k; i++) last = measureOne();
      L.pend -= k;
      if (last && k <= 2) { L.flash = { x: last.x, y: last.y, t: 0 }; Sound.tick(); }
    }
  }
  function drawCloud() {
    const { a: A, b: Bp, c: Cc } = clLay(), L = S.cl;
    panel(A.x, A.y, A.w, A.h, 14);
    T(A.x + 14, A.y + 22, '전자의 위치를 측정한 결과 (점 1개 = 측정 1번)', PHONE ? 12.5 : 14.5, '#26324a', 'left', 800);
    const cx = A.x + A.w / 2, cy = A.y + 28 + (A.h - 28) / 2;
    const ox = cx - CS / 2, oy = cy - CS / 2;
    ctx.fillStyle = '#fbfcff'; ctx.fillRect(ox, oy, CS, CS);
    ctx.drawImage(cloudCv, ox, oy, CS, CS);
    ctx.strokeStyle = '#c3cbd9'; ctx.lineWidth = 1.2; ctx.strokeRect(ox, oy, CS, CS);
    if (L.ring) {
      RING.forEach((R, i) => {
        ctx.strokeStyle = i === 0 ? 'rgba(226,70,75,.95)' : 'rgba(93,104,121,.55)'; ctx.lineWidth = i === 0 ? 2 : 1.3; ctx.setLineDash(i === 0 ? [6, 4] : [3, 4]);
        ctx.beginPath(); ctx.arc(cx, cy, R * CPPN, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        const lxx = cx + R * CPPN * Math.cos(0.8), lyy = cy + R * CPPN * Math.sin(0.8);
        if (i === 0) D.label(cx, cy - R * CPPN - 13, '보어 반지름 0.053 nm', { size: PHONE ? 11 : 12, bg: '#e2464b' });
        else T(lxx + 3, lyy + 12, RING_T[i] + ' nm', 11.5, '#5d6879', 'left', 800, { stroke: '#fff', strokeWidth: 3 });
      });
    }
    D.sphere(cx, cy, 3.5, '#e2464b');
    if (L.flash) { const f = L.flash, q = f.t / 0.8; const fx = cx + f.x * CPPN, fy = cy + f.y * CPPN; ctx.strokeStyle = 'rgba(255,170,0,' + (1 - q).toFixed(2) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(fx, fy, 4 + q * 20, 0, TAU); ctx.stroke(); D.sphere(fx, fy, 3.2, '#ffb400'); }
    T(ox + CS - 4, oy + CS - 8, '한 변 0.5 nm', 12, '#5d6879', 'right', 700);
    T(A.x + 14, A.y + A.h - 8, '측정 횟수 ' + L.n.toLocaleString('ko-KR') + '번' + (L.pend > 0.5 ? ' (+' + Math.ceil(L.pend).toLocaleString('ko-KR') + ' 진행 중)' : ''), PHONE ? 12.5 : 13.5, '#26324a', 'left', 800);

    // B: 거리별 히스토그램
    panel(Bp.x, Bp.y, Bp.w, Bp.h, 14);
    T(Bp.x + 14, Bp.y + 22, '핵에서의 거리 r 별 발견 횟수', PHONE ? 12.5 : 14.5, '#26324a', 'left', 800);
    const exp = [], N = Math.max(L.n, 1);
    for (let j = 0; j < NB; j++) exp.push(N * (cdf((j + 1) * BW / A0) - cdf(j * BW / A0)));
    const mx = Math.max(5, Math.max.apply(null, L.hist), Math.max.apply(null, exp)) * 1.12;
    const stp = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000].find((q) => mx / q <= 5) || 5000;
    const ytarget = Math.ceil(mx / stp) * stp;
    L.ymax = SciSim.approach(L.ymax, ytarget, S.dt || 0.016, 6);
    const ym = L.ymax, yticks = []; for (let v = 0; v <= ytarget + 1e-9; v += stp) yticks.push([v, v.toLocaleString('ko-KR')]);
    const pad = PHONE ? { l: 52, r: 16, t: 34, b: 52 } : { l: 56, r: 18, t: 38, b: 56 };
    const ax = axes(Bp.x + pad.l, Bp.y + pad.t, Bp.w - pad.l - pad.r, Bp.h - pad.t - pad.b, { xmin: 0, xmax: NB * BW, ymin: 0, ymax: ym, xt: [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3].map((v) => [v, v.toFixed(2)]), yt: yticks.filter((q) => q[0] <= ym * 1.0001), xl: 'r (nm)', yl: '발견 횟수', ylx: 38, fs: 11.5 });
    ctx.save(); ctx.beginPath(); ctx.rect(ax.x, ax.y - 2, ax.w, ax.h + 2); ctx.clip();
    for (let j = 0; j < NB; j++) {
      const h = L.hist[j]; if (!h) continue;
      const x0 = ax.X(j * BW) + 1, x1 = ax.X((j + 1) * BW) - 1, y0 = ax.Y(Math.min(h, ym));
      ctx.fillStyle = 'rgba(56,103,244,.78)'; ctx.fillRect(x0, y0, x1 - x0, ax.Y(0) - y0);
    }
    ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath();
    for (let j = 0; j < NB; j++) { const px = ax.X((j + 0.5) * BW), py = ax.Y(Math.min(exp[j], ym)); if (j === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
    ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    T(Bp.x + 14, Bp.y + Bp.h - 9, '■ 파란 막대: 측정 결과', PHONE ? 11.5 : 12.5, '#3867f4', 'left', 800);
    T(Bp.x + Bp.w - 14, Bp.y + Bp.h - 9, '┅ 빨간 점선: 확률 분포(모형)', PHONE ? 11.5 : 12.5, '#e2464b', 'right', 800);
    if (L.over > 0) T(Bp.x + Bp.w - 22, Bp.y + 46, '0.30 nm 넘게 멀리: ' + L.over + '번', 11.5, '#5d6879', 'right', 700);

    // C: 누적 확률
    panel(Cc.x, Cc.y, Cc.w, Cc.h, 14);
    T(Cc.x + 14, Cc.y + 22, 'r 이내에서 발견된 비율 (측정 결과 / 모형 값)', PHONE ? 12.5 : 14, '#26324a', 'left', 800);
    const theory = RING.map((R, i) => cdf(i + 1) * 100);
    const bw = PHONE ? 200 : 300, bx = Cc.x + (PHONE ? 112 : 130);
    for (let i = 0; i < 3; i++) {
      const yy = Cc.y + 40 + i * (PHONE ? 31 : 27), pm = L.n > 0 ? L.c[i] / L.n * 100 : 0;
      T(Cc.x + 14, yy + 14, 'r ≤ ' + RING_T[i] + ' nm', PHONE ? 12 : 13.5, '#26324a', 'left', 800);
      barH(bx, yy + 2, bw, 14, pm / 100, '#3867f4');
      ctx.fillStyle = '#e2464b'; ctx.fillRect(bx + theory[i] / 100 * bw - 1.5, yy - 2, 3, 22);
      T(bx + bw + 10, yy + 14, (L.n > 0 ? Math.round(pm) + ' %' : '-') + ' / ' + Math.round(theory[i]) + ' %', PHONE ? 12 : 13.5, '#26324a', 'left', 800);
    }
    if (!PHONE) textBlock(Cc.x + 560, Cc.y + 44, 206, '에너지는 여전히 띄엄띄엄해요. E₁ = −13.6 eV, E₂ = −3.4 eV', 13, '#5d6879', 18, 700);
  }

  /* ================= ④ 모형 비교 ================= */
  const cmLay = () => PHONE
    ? { p1: { x: 8, y: 8, w: 228, h: 168 }, p2: { x: 244, y: 8, w: 228, h: 168 }, tb: { x: 8, y: 184, w: 464, h: 488 } }
    : { p1: { x: 12, y: 12, w: 380, h: 190 }, p2: { x: 408, y: 12, w: 380, h: 190 }, tb: { x: 12, y: 212, w: 776, h: 336 } };
  function drawCmp() {
    const { p1, p2, tb } = cmLay(), M = S.cm;
    M.ang += 0.016 * 2.4 * (RM ? 0 : 1);
    [p1, p2].forEach((p) => panel(p.x, p.y, p.w, p.h, 14));
    T(p1.x + p1.w / 2, p1.y + 22, '보어 모형', PHONE ? 13 : 15, '#3867f4', 'center', 800);
    T(p2.x + p2.w / 2, p2.y + 22, '현대 원자 모형', PHONE ? 13 : 15, '#8b5cf6', 'center', 800);
    const c1 = { x: p1.x + p1.w / 2, y: p1.y + p1.h / 2 + 14 }, c2 = { x: p2.x + p2.w / 2, y: p2.y + p2.h / 2 + 14 };
    const R0 = PHONE ? 38 : 56;
    ctx.strokeStyle = 'rgba(56,103,244,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(c1.x, c1.y, R0, 0, TAU); ctx.stroke();
    D.glow(c1.x, c1.y, 18, '#ff7a45', 0.5); D.sphere(c1.x, c1.y, 5, '#e2464b');
    D.sphere(c1.x + R0 * Math.cos(M.ang), c1.y + R0 * Math.sin(M.ang), 6, '#3867f4', { shadow: true });
    T(c1.x, p1.y + p1.h - 10, '정해진 궤도', PHONE ? 12 : 13.5, '#26324a', 'center', 800);
    const sz = PHONE ? 112 : 132;
    ctx.drawImage(staticCv, c2.x - sz / 2, c2.y - sz / 2, sz, sz);
    D.sphere(c2.x, c2.y, 3.2, '#e2464b');
    ctx.strokeStyle = 'rgba(226,70,75,.8)'; ctx.lineWidth = 1.4; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(c2.x, c2.y, 0.0529 * 480 * sz / 240, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    T(c2.x, p2.y + p2.h - 10, '발견될 확률 분포', PHONE ? 12 : 13.5, '#26324a', 'center', 800);
    // 표
    panel(tb.x, tb.y, tb.w, tb.h, 14);
    const c0 = tb.x + 14, cw1 = PHONE ? 100 : 190, cx1 = c0 + cw1, cwm = (tb.w - 28 - cw1) / 2, cx2 = cx1 + cwm;
    const rh = (tb.h - 84) / 5, hy0 = tb.y + 42;
    T(c0, tb.y + 26, '항목', PHONE ? 12 : 13.5, '#5d6879', 'left', 800);
    T(cx1 + cwm / 2, tb.y + 26, '보어 모형', PHONE ? 13 : 14.5, '#3867f4', 'center', 800);
    T(cx2 + cwm / 2, tb.y + 26, '현대 원자 모형', PHONE ? 13 : 14.5, '#8b5cf6', 'center', 800);
    ctx.fillStyle = '#e3e8f2'; ctx.fillRect(tb.x + 10, tb.y + 36, tb.w - 20, 1.5);
    TBL.forEach((r, i) => {
      const y0 = hy0 + i * rh, v = SEL_T.vals[i];
      if (i % 2 === 0) { ctx.fillStyle = 'rgba(227,232,242,.35)'; ctx.fillRect(tb.x + 8, y0 + 2, tb.w - 16, rh - 4); }
      const lines = wrap(r.label, cw1 - 8, PHONE ? 12 : 13.5, 800);
      lines.forEach((ln, k) => T(c0, y0 + rh / 2 + 4 - (lines.length - 1) * 8 + k * 16, ln, PHONE ? 12 : 13.5, '#26324a', 'left', 800));
      const has = v !== undefined && v !== '';
      const ok = has && SEL_T.sels[i].classList.contains('ok'), bad = has && SEL_T.sels[i].classList.contains('bad');
      const col = ok ? '#0f7a42' : bad ? '#c0353b' : '#26324a';
      [[cx1, 'b'], [cx2, 'm']].forEach(([xx, key]) => {
        if (!has) { T(xx + cwm / 2, y0 + rh / 2 + 5, '?', 18, '#9aa5b8', 'center', 800); return; }
        const s = r.opts[+v][key], ls = wrap(s, cwm - 12, PHONE ? 11.5 : 13.5, 800);
        ls.forEach((ln, k) => T(xx + cwm / 2, y0 + rh / 2 + 4 - (ls.length - 1) * 8 + k * 16, ln, PHONE ? 11.5 : 13.5, col, 'center', 800));
      });
    });
    if (SEL_K.count() > 0 || S.show.selK) {
      const right = SEL_K.right(), tot = CARDS.length;
      D.label(tb.x + tb.w - 12, tb.y + tb.h - 20, '문장 카드 ' + SEL_K.count() + ' / ' + tot + '장 나눔 · 맞은 카드 ' + right + '장', { size: 12.5, bg: '#26324a', align: 'right' });
    }
  }

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    if (S.mode === 'unc') {
      const U = S.un, t1 = theta1(U.dx);
      setReadouts('슬릿 폭 Δx', U.dx.toFixed(2) + ' nm', 'Δp 의 최솟값', sci(dpMin(U.dx), 1) + ' kg·m/s', '첫 어두운 곳 각도', t1 >= 89 ? '90° (모든 방향)' : Math.round(t1) + '°');
    } else if (S.mode === 'bohr') {
      const B = S.bo, k = B.key;
      setReadouts('전이', k ? 'n = ' + HLINES[k].ni + ' → ' + HLINES[k].nf : '고르기', '광자 에너지 ΔE', k ? trE(k).toFixed(2) + ' eV' : '—', '파장 λ', k ? Math.round(trLam(k)) + ' nm' + (trLam(k) < 380 ? ' (자외선)' : '') : '—');
    } else if (S.mode === 'cloud') {
      const L = S.cl;
      setReadouts('측정 횟수', L.n.toLocaleString('ko-KR') + '번', 'r ≤ 0.053 nm', L.n ? Math.round(L.c[0] / L.n * 100) + ' % (모형 32 %)' : '—', 'r ≤ 0.16 nm', L.n ? Math.round(L.c[2] / L.n * 100) + ' % (모형 94 %)' : '—');
    } else {
      setReadouts('표 맞은 칸', SEL_T.right() + ' / 5', '카드 맞은 수', SEL_K.right() + ' / 8', '비교 항목', '5가지');
    }
  }

  /* ================= 미션 ================= */
  const levels = [
    {
      title: '불확정성: 좁게 가둘수록 퍼져요', short: '불확정성', icon: '🎚️', phase: '탐구',
      intro: '<p class="si-q">❓ 탐구 질문: 원자 속 전자는 행성처럼 정해진 궤도를 돌고 있을까?</p>' +
        '<div class="si-link">🔗 <b>물리학에서</b> 보어 모형으로 수소의 에너지 준위 Eₙ = −13.6/n² eV와 선스펙트럼을 설명했어요. 앞 차시 <b>이중 슬릿</b>에서는 전자의 도착 위치가 확률로 정해지고, 전자도 슬릿에서 회절한다는 것을 봤어요.</div>' +
        '<p>슬릿 폭 Δx는 <b>전자의 위치를 얼마나 좁게 정했는지</b>(위치의 불확정도)를 뜻해요. 폭이 좁을수록 슬릿 뒤에서 전자의 진행 방향이 더 넓게 퍼져요. 즉 <b>운동량의 불확정도 Δp가 커져요.</b> 두 불확정도는 <b>Δx · Δp ≥ ħ/2</b> (ħ = h/2π = 1.05×10⁻³⁴ J·s)를 만족해요.</p>',
      features: ['unc'],
      setup() { S.show.numA = false; S.un.reveal = false; S.un.seenN = false; S.un.seenW = false; setScene('unc'); },
      recap: '위치를 좁게 정할수록(Δx가 작을수록) 운동량이 더 불확실해져요(Δp가 커져요). 두 불확정도의 곱은 ħ/2보다 작아질 수 없어요(Δx·Δp ≥ ħ/2). 이것은 측정 장비의 한계가 아니라 자연의 성질이에요.',
      summary: '<ul><li><b>불확정성 원리</b>: 위치의 불확정도 Δx와 운동량의 불확정도 Δp는 <b>Δx · Δp ≥ ħ/2</b>를 만족해요(ħ = h/2π = 1.05×10⁻³⁴ J·s). 둘을 동시에 임의로 정확히 정할 수 없어요.</li><li>슬릿 폭이 <b>좁을수록</b> 슬릿 뒤의 퍼짐(Δp)이 <b>커져요</b>(회절).</li><li>크기 어림: 전자를 Δx = 0.10 nm에 가두면 Δp ≥ 5.3×10⁻²⁵ kg·m/s, Δv ≥ 5.8×10⁵ m/s. 야구공(Δx = 1 mm)은 Δv ≥ 3.6×10⁻³¹ m/s라 관측할 수 없어요.</li><li>측정 장비를 더 좋게 만들어도 이 한계는 없어지지 않아요. 자연의 성질이에요.</li></ul>',
      missions: [
        {
          title: '슬릿을 좁혔다 넓혀 보기',
          goal: '슬릿 폭 Δx를 <b>0.30 nm 이하</b>로 줄였다가 <b>0.80 nm 이상</b>으로 넓히며 전자의 퍼짐이 어떻게 달라지는지 관찰하세요.',
          hint: '“슬릿 폭 Δx” 슬라이더를 왼쪽 끝으로 밀면 0.10 nm예요. 퍼짐은 오른쪽 스크린의 도착 확률 곡선(파란색)과 파동 모양으로 볼 수 있어요.',
          setup() { S.show.numA = false; S.un.seenN = S.un.dx <= 0.30; S.un.seenW = S.un.dx >= 0.80; setScene('unc'); },
          check: () => S.un.seenN && S.un.seenW,
          hold: 0.4,
          status: () => mark(S.un.seenN) + ' Δx ≤ 0.30 nm &nbsp; ' + mark(S.un.seenW) + ' Δx ≥ 0.80 nm &nbsp; · 지금 Δx = ' + S.un.dx.toFixed(2) + ' nm',
          explain: '슬릿이 좁을수록 전자의 위치가 좁게 정해지는 대신, 슬릿을 나온 뒤 진행 방향이 넓게 퍼져요(운동량이 불확실해져요). 슬릿이 넓으면 위치는 덜 정해지지만 거의 곧게 나아가요. 위치와 운동량의 불확정도는 한쪽을 줄이면 다른 쪽이 늘어나는 관계예요.',
        },
        {
          title: '불확정도 크기 어림하기', manual: true,
          goal: '슬라이더를 <b>Δx = 0.10 nm</b>에 맞추고, 표의 Δp를 이용해 전자의 속도 불확정도 Δv의 최솟값을 구하세요.',
          hint: 'Δv = Δp / m, m = 9.11×10⁻³¹ kg이에요. Δp = 5.3×10⁻²⁵ kg·m/s를 m으로 나누면 5.8×10⁵ m/s예요. “× 10⁵” 칸에는 5.8을 써요.',
          setup() { S.show.numA = true; NUM_A.reset(); S.un.reveal = false; setScene('unc'); },
          check() { const r = NUM_A.grade(); if (r === true) S.un.reveal = true; return r; },
          status: () => '입력한 칸 ' + NUM_A.count() + ' / 1 &nbsp; · 지금 Δx = ' + S.un.dx.toFixed(2) + ' nm',
          explain: 'Δx = 0.10 nm이면 Δp ≥ ħ/(2Δx) = 1.05×10⁻³⁴ / (2×1.0×10⁻¹⁰) = 5.3×10⁻²⁵ kg·m/s예요. Δv = Δp/m = 5.3×10⁻²⁵ / 9.11×10⁻³¹ ≈ <b>5.8×10⁵ m/s</b>예요. 원자 속에서 전자를 이만큼 좁은 곳에 두면 속도가 이 정도로 불확실할 수밖에 없어요.',
        },
        {
          type: 'quiz', title: '야구공에서는 왜 안 보일까?',
          goal: '야구공은 Δx = 1 mm로 위치를 정해도 속도의 불확정도가 거의 0이에요(Δv ≥ 3.6×10⁻³¹ m/s). 그 까닭은?',
          setup() { S.show.numA = false; setScene('unc'); },
          choices: ['측정 기계를 더 좋게 만들면 전자도 위치와 운동량을 둘 다 정확히 알 수 있어요', '야구공에는 불확정성 원리가 적용되지 않아요', 'ħ가 너무 작아서 일상 크기의 물체에서는 불확정도가 관측할 수 없을 만큼 작아요', '야구공은 너무 무거워서 위치를 정할 수 없어요'],
          answer: 2,
          feedback: ['불확정성 원리는 측정 기계의 서투름 때문이 아니라 자연의 성질이에요. 기계를 아무리 좋게 만들어도 Δx·Δp ≥ ħ/2는 깨지지 않아요.', '원리는 모든 물체에 적용돼요. 다만 야구공에서는 그 효과가 관측할 수 없을 만큼 작아요.', '', '야구공의 위치는 얼마든지 정확히 정할 수 있어요. 문제는 ħ(≈10⁻³⁴)가 너무 작아 Δv가 사실상 0이라는 점이에요.'],
          explain: '불확정성 원리는 야구공에도 똑같이 적용돼요. 하지만 ħ = 1.05×10⁻³⁴ J·s가 너무 작아서, 야구공의 Δv는 3.6×10⁻³¹ m/s밖에 안 돼서 관측할 수 없어요. 전자처럼 아주 가벼운 입자를 아주 좁은 곳에 둘 때 비로소 눈에 띄는 효과가 나타나요.',
        },
      ],
    },
    {
      title: '보어 모형: 궤도와 에너지 준위', short: '보어 모형', icon: '🪐', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 위치를 좁게 가두면 속도가 크게 불확실해진다는 것을 알았어요. 그렇다면 <b>정해진 궤도</b>를 도는 보어 모형의 전자는 괜찮을까요?</div>' +
        '<p>보어 모형: 전자는 반지름 <b>rₙ = 0.053n² nm</b>인 궤도만 돌고, 에너지는 <b>Eₙ = −13.6/n² eV</b>예요. 높은 궤도에서 낮은 궤도로 전이하면 <b>hf = ΔE</b>인 광자가 나오고, 이것이 수소의 선스펙트럼이에요. 모형이 <b>맞는 점</b>과 <b>한계</b>를 구분해 봐요.</p>',
      features: ['bohr'],
      setup() { S.show.selB = false; S.bo.key = null; S.bo.lines.length = 0; S.bo.fired = {}; S.bo.n = 1; S.bo.nShow = 1; S.bo.ph = null; setScene('bohr'); },
      recap: '보어 모형은 수소의 에너지 준위와 선스펙트럼 파장을 잘 설명하지만, 위치와 속도를 동시에 아는 궤도를 가정하기 때문에 불확정성 원리와 맞지 않고, 전자가 여러 개인 원자의 스펙트럼도 설명하지 못해요.',
      summary: '<ul><li><b>보어 모형</b>: 궤도 반지름 rₙ = 0.053n² nm, 에너지 Eₙ = −13.6/n² eV(E₁ = −13.6, E₂ = −3.4, E₃ = −1.51 eV), 전이할 때 hf = ΔE인 광자가 나와요.</li><li>3→2: ΔE = 13.6(1/4 − 1/9) = 1.89 eV → λ = 1240/1.89 ≈ 656 nm (Hα). 4→2: 2.55 eV, 486 nm (Hβ). 5→2: 434 nm (Hγ). 2→1: 10.2 eV, 122 nm (자외선).</li><li><b>맞는 점</b>: 수소의 선스펙트럼 파장과 에너지 준위를 잘 설명해요.</li><li><b>한계</b>: 위치와 속도를 동시에 아는 궤도(전자를 0.10 nm에 가두면 Δv가 v₁ = 2.2×10⁶ m/s의 약 26 %), 전자가 여러 개인 원자의 스펙트럼 설명 불가, 원자 크기가 궤도 반지름으로 딱 정해진다는 점.</li></ul>',
      missions: [
        {
          title: '3→2 전이로 수소의 붉은 선 만들기',
          goal: '전이 버튼에서 <b>3→2</b>와 <b>4→2</b>를 차례로 골라 광자가 나오는 것을 지켜보세요. 광자 에너지와 파장을 읽어요.',
          hint: '버튼을 누르면 전자가 먼저 높은 궤도에 있다가 아래 궤도로 내려오며 광자를 내보내요. 3→2는 붉은색(Hα), 4→2는 청록색(Hβ)이에요.',
          setup() { S.show.selB = false; S.bo.seenClasses = false; setScene('bohr'); },
          check: () => !!S.bo.fired['3-2'] && !!S.bo.fired['4-2'],
          hold: 0.5,
          status: () => mark(!!S.bo.fired['3-2']) + ' 3→2 ' + (S.bo.fired['3-2'] ? '(1.89 eV, 656 nm)' : '') + ' &nbsp; ' + mark(!!S.bo.fired['4-2']) + ' 4→2 ' + (S.bo.fired['4-2'] ? '(2.55 eV, 486 nm)' : ''),
          explain: '3→2 전이: ΔE = 13.6 × (1/4 − 1/9) = <b>1.89 eV</b>이고, λ = 1240/1.89 ≈ <b>656 nm</b>(붉은색, Hα)예요. 4→2는 2.55 eV, 486 nm(Hβ)예요. 이 파장들은 실제 수소 방전관의 선과 잘 맞아서, 보어 모형은 수소 선스펙트럼을 잘 설명해요.',
        },
        {
          title: '보어 모형의 장점과 한계 나누기', manual: true,
          goal: '아래 문장 6개를 <b>맞는 점</b>과 <b>한계</b>로 나누세요. 아래 점검 칸의 속도 막대도 읽어 보세요.',
          hint: '“위치와 속도를 동시에 안다”는 앞 단계의 불확정성 원리와 어울릴까요? 수소의 선스펙트럼과 준위는 모형이 잘 설명하는 부분이에요.',
          setup() { S.show.selB = true; SEL_B.reset(); setScene('bohr'); },
          check: () => SEL_B.grade(),
          status: () => '나눈 문장 ' + SEL_B.count() + ' / 6',
          explain: '<b>맞는 점</b>: 수소의 선스펙트럼 파장, 띄엄띄엄한 에너지 준위, hf = ΔE인 광자 방출. <b>한계</b>: 궤도는 전자의 위치와 속도를 동시에 정확히 안다고 가정하지만 Δx = 0.10 nm에 가두면 Δv가 5.8×10⁵ m/s(v₁의 약 26 %)나 불확실해서 불확정성 원리와 맞지 않아요. 또 전자가 여러 개인 원자(중성 헬륨 등)의 스펙트럼은 보어 식으로 계산한 값과 맞지 않고, 원자의 크기가 궤도 반지름으로 딱 정해진다는 점도 현대 모형과 달라요.',
        },
        {
          type: 'quiz', title: '잘 맞는데 왜 고쳐야 할까?',
          goal: '보어 모형이 수소의 선스펙트럼을 잘 설명하는데도 수정이 필요한 까닭은?',
          setup() { S.show.selB = false; setScene('bohr'); },
          choices: ['수소의 선스펙트럼 파장이 실제와 전혀 달랐기 때문에', '정해진 궤도(위치와 속도를 동시에 아는 경로)는 불확정성 원리와 맞지 않고, 여러 전자를 가진 원자의 스펙트럼은 설명하지 못하기 때문에', '에너지 준위가 띄엄띄엄하다는 것이 틀렸기 때문에', '원자핵이 전자를 끌어당기지 않는다는 것이 밝혀졌기 때문에'],
          answer: 1,
          feedback: ['수소의 선 파장은 보어 모형과 아주 잘 맞아요. 그래서 큰 성공이었어요.', '', '띄엄띄엄한 에너지 준위는 현대 모형에서도 그대로 유지돼요.', '핵과 전자 사이의 전기력은 그대로예요. 달라진 것은 전자를 “궤도”로 그리느냐 “확률 분포”로 그리느냐예요.'],
          explain: '보어 모형은 수소 선스펙트럼을 잘 설명했지만, 전자가 정해진 궤도를 돈다는 그림은 위치와 속도를 동시에 정확히 알 수 있다는 뜻이라 불확정성 원리와 맞지 않아요. 또 전자가 둘 이상인 원자의 스펙트럼을 설명하지 못해요. 그래서 전자를 “발견될 확률 분포”로 나타내는 현대 원자 모형으로 발전했어요.',
        },
      ],
    },
    {
      title: '확률 구름: 전자는 어디에 있을까', short: '확률 구름', icon: '☁️', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 정해진 궤도라는 그림이 불확정성 원리와 맞지 않는다는 것을 알았어요. 그럼 수소 원자 속 전자는 <b>어디에</b> 있을까요?</div>' +
        '<p>수소 원자가 가장 낮은 에너지 상태(바닥 상태, n = 1)에 있을 때 전자의 <b>위치를 한 번 측정</b>하면 점이 하나 찍혀요. 같은 상태를 준비해 여러 번 측정하면 매번 다른 곳에서 발견돼요. 점을 많이 모으면 중심이 진하고 바깥으로 흐려지는 <b>구름 모양</b>이 되어요. 이것은 전자가 번져 있는 것이 아니라 <b>발견될 확률의 분포</b>예요.</p>',
      features: ['cloud'],
      setup() { S.show.selC = false; resetCloud(); setScene('cloud'); },
      recap: '바닥 상태의 전자 위치를 한 번 측정하면 한 점에서 발견되고, 많이 모으면 구형의 확률 분포(전자 구름)가 보여요. 핵으로부터 거리 r에서 발견될 확률이 가장 큰 곳은 0.053 nm(보어 반지름)이지만 더 가깝거나 먼 곳에서도 발견돼요. 에너지는 여전히 띄엄띄엄해요.',
      summary: '<ul><li>수소 바닥 상태: 위치를 한 번 측정하면 <b>한 점</b>, 여러 번 모으면 <b>구름 모양의 확률 분포</b>(구면 대칭).</li><li>거리 r별 발견 횟수 히스토그램의 최댓값은 <b>0.053 nm</b>(보어 반지름과 같아요). 하지만 더 가깝거나 멀리서도 발견돼요.</li><li>누적 확률(모형 값): r ≤ 0.053 nm에서 32 %, r ≤ 0.11 nm에서 76 %, r ≤ 0.16 nm에서 94 %.</li><li>구름은 “전자가 번져 있다”가 아니라 “발견될 확률의 분포”예요. 에너지는 여전히 띄엄띄엄해요(E₁ = −13.6 eV, E₂ = −3.4 eV).</li></ul>',
      missions: [
        {
          title: '전자 구름 만들기',
          goal: '“측정” 버튼으로 점을 <b>1000개 이상</b> 쌓아 구름이 어떤 모양이 되는지 살펴보세요.',
          hint: '+1000 버튼을 한 번 누르면 돼요. 먼저 +1을 몇 번 눌러 점이 매번 다른 곳에 찍히는 것도 보세요.',
          setup() { S.show.selC = false; setScene('cloud'); },
          check: () => S.cl.n >= 1000 && S.cl.pend < 1,
          hold: 0.5,
          status: () => mark(S.cl.n >= 1000) + ' 측정 ' + S.cl.n.toLocaleString('ko-KR') + ' / 1,000번',
          explain: '한 번의 측정에서는 전자가 한 점에서만 발견되고, 그 위치는 매번 달라요. 하지만 1000번쯤 모으면 중심이 진하고 바깥으로 흐려지는 둥근 구름이 보여요. 이것이 바닥 상태 전자의 <b>확률 분포</b>예요.',
        },
        {
          title: '가장 많이 발견되는 거리 읽기', manual: true,
          goal: '히스토그램에서 핵으로부터의 거리 r 가운데 <b>발견 횟수가 가장 많은 거리</b>를 읽으세요.',
          hint: '파란 막대 중 가장 높은 구간의 가운데가 몇 nm인지 가로축에서 읽어요. 점을 더 쌓으면 막대가 빨간 점선에 가까워져요.',
          setup() { S.show.selC = true; SEL_C.reset(); setScene('cloud'); },
          check() { if (S.cl.n < 1000) return '먼저 점을 1000개 이상 쌓아서 히스토그램을 만들어 보세요.'; return SEL_C.grade(); },
          status: () => '쌓은 점 ' + S.cl.n.toLocaleString('ko-KR') + '개 · 고른 문장 ' + SEL_C.count() + ' / 1',
          explain: '거리별 발견 횟수가 가장 많은 곳은 <b>0.053 nm</b>로 보어 반지름과 같아요. 보어 모형은 전자가 항상 0.053 nm 거리에 있다고 했지만, 현대 모형에서는 0.053 nm가 “가장 발견되기 쉬운 거리”일 뿐이고 그보다 가깝거나 먼 곳에서도 발견돼요.',
        },
        {
          type: 'quiz', title: '전자 구름의 정체',
          goal: '사진처럼 보이는 전자 구름은 무엇을 뜻할까요?',
          setup() { S.show.selC = false; setScene('cloud'); },
          choices: ['전자가 매우 빠르게 돌아서 구름처럼 번져 보이는 것이에요', '전자 한 개가 실제로 구름처럼 퍼져서 원자 전체에 퍼져 있는 모습이에요', '전자가 여러 개로 쪼개져서 동시에 여러 곳에 있는 모습이에요', '한 번 측정하면 한 점에서 발견되고, 여러 번 모으면 발견될 확률의 분포가 구름 모양으로 나타나는 것이에요'],
          answer: 3,
          feedback: ['빨리 도는 전자가 번져 보이는 것이 아니에요. 같은 상태를 준비해 위치를 한 번씩 측정한 결과를 모은 분포예요.', '측정하면 항상 한 점에서만 발견돼요. 구름은 많은 측정 결과를 모은 확률 분포예요.', '전자는 쪼개지지 않아요. 측정할 때마다 한 점에서 발견되고, 그 위치가 확률적으로 달라질 뿐이에요.', ''],
          explain: '위치를 한 번 측정하면 전자는 항상 <b>한 점</b>에서 발견돼요. 같은 상태를 준비해 수없이 반복하면 점들이 구름 모양으로 모여요. 구름의 진한 곳일수록 발견될 확률이 커요. 구름은 전자가 번져 있는 모습이 아니라 <b>확률 분포</b>예요.',
        },
      ],
    },
    {
      title: '모형 비교: 보어와 현대 원자 모형', short: '모형 비교', icon: '⚖️', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 보어 모형은 궤도, 현대 원자 모형은 확률 분포로 전자를 나타낸다는 것을 봤어요. 둘을 항목별로 <b>비교</b>해 봐요.</div>' +
        '<p>비교할 항목: 전자의 위치 · 불확정성 원리 · 에너지 준위 · 선스펙트럼 · 가장 가능성 높은 거리. 현대 원자 모형은 보어 모형을 <b>모두 버린 것이 아니라</b>, 맞는 부분(에너지 준위)은 이어받고 궤도라는 그림만 확률 분포로 바꾼 모형이에요.</p>',
      features: ['cmp'],
      setup() { S.show.selT = false; S.show.selK = false; setScene('cmp'); },
      recap: '보어 모형은 정해진 궤도를 가정하고 현대 원자 모형은 불확정성 원리에 따라 전자를 확률 분포로 나타내요. 두 모형 모두 에너지 준위는 띄엄띄엄하고, 수소의 가장 가능성 높은 거리는 0.053 nm지만 의미가 달라요.',
      summary: '<ul><li><b>전자의 위치</b>: 보어 = 정해진 궤도 / 현대 = 발견될 확률의 분포(전자 구름).</li><li><b>불확정성 원리</b>: 보어 = 위배(위치·속도를 동시에 가정) / 현대 = 반영.</li><li><b>에너지 준위</b>: 둘 다 띄엄띄엄(Eₙ = −13.6/n² eV, 수소).</li><li><b>선스펙트럼</b>: 보어 = 수소만 잘 설명 / 현대 = 더 많은 원자를 설명할 수 있는 방향.</li><li><b>수소 바닥 상태의 반지름 0.053 nm</b>: 보어 = 전자가 항상 있는 거리 / 현대 = 가장 발견되기 쉬운 거리(그보다 가깝거나 멀리서도 발견).</li><li>현대 모형은 보어 모형을 완전히 버린 것이 아니라 에너지 준위 같은 일부는 유지하고 궤도 개념을 고친 것이에요.</li></ul>',
      missions: [
        {
          title: '비교표 완성하기', manual: true,
          goal: '다섯 항목마다 보어 모형과 현대 원자 모형의 특징이 맞게 짝지어진 문장을 고르세요. 고르면 표가 채워져요.',
          hint: '앞 단계들에서 본 것을 떠올려요: 궤도 vs 구름, 불확정성 원리, 띄엄띄엄한 에너지, 0.053 nm의 의미.',
          setup() { S.show.selT = true; S.show.selK = false; SEL_T.reset(); setScene('cmp'); },
          check: () => SEL_T.grade(),
          status: () => '고른 항목 ' + SEL_T.count() + ' / 5',
          explain: '전자의 위치는 보어 모형에서는 <b>정해진 궤도</b>, 현대 모형에서는 <b>확률 분포</b>예요. 보어 모형은 불확정성 원리와 맞지 않고 현대 모형은 이를 반영해요. 에너지 준위는 둘 다 띄엄띄엄하고, 수소의 0.053 nm는 보어 모형에서는 “전자가 항상 있는 거리”, 현대 모형에서는 “가장 발견되기 쉬운 거리”라서 숫자는 같아도 뜻이 달라요.',
        },
        {
          title: '문장 카드 나누기',
          goal: '문장 카드 8장을 <b>보어 모형만</b> · <b>현대 원자 모형만</b> · <b>두 모형 모두</b>로 나누세요.',
          hint: '“궤도”, “동시에 정확히”, “크기가 딱 정해짐”은 보어 모형이에요. “확률”, “불확정성”은 현대 모형이에요. 에너지 준위와 0.053 nm는 두 모형이 함께 가진 점이에요.',
          setup() { S.show.selT = false; S.show.selK = true; SEL_K.reset(); setScene('cmp'); },
          check: () => SEL_K.right() === CARDS.length,
          hold: 0.4,
          status: () => '나눈 카드 ' + SEL_K.count() + ' / 8 · 맞은 카드 ' + SEL_K.right() + ' / 8',
          explain: '<b>보어 모형만</b>: 정해진 원 궤도, 위치·속도를 동시에 아는 경로, 크기가 궤도 반지름으로 딱 정해짐. <b>현대 모형만</b>: 확률 분포, 불확정성 원리, 다른 원자로 확장. <b>두 모형 모두</b>: 수소의 띄엄띄엄한 에너지 준위, 가장 가능성 높은 거리 0.053 nm.',
        },
        {
          type: 'quiz', title: '보어 모형을 완전히 버렸을까?',
          goal: '현대 원자 모형은 보어 모형을 완전히 버린 모형일까요?',
          setup() { S.show.selT = false; S.show.selK = false; setScene('cmp'); },
          choices: ['아니다. 띄엄띄엄한 에너지 준위 같은 일부는 유지하고, 정해진 궤도라는 그림을 확률 분포로 고쳤다', '그렇다. 에너지 준위도 연속적이라는 것으로 바뀌었다', '그렇다. 보어 모형의 어떤 부분도 맞지 않는다', '아니다. 현대 모형도 전자가 정해진 궤도를 돈다고 본다'],
          answer: 0,
          feedback: ['', '에너지 준위가 띄엄띄엄하다는 것은 현대 모형에서도 그대로예요. 그래서 선스펙트럼을 설명할 수 있어요.', '수소의 에너지 준위와 선스펙트럼 같은 부분은 보어 모형이 맞았어요.', '현대 모형은 전자의 위치를 정해진 궤도가 아니라 확률 분포로 나타내요.'],
          explain: '현대 원자 모형은 보어 모형이 맞았던 <b>양자화된 에너지 준위</b>를 이어받으면서, 틀린 부분인 <b>정해진 궤도</b>를 불확정성 원리에 맞는 <b>확률 분포</b>로 바꾼 모형이에요. 과학 모형은 이렇게 맞는 부분은 남기고 한계를 고치며 발전해요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hq-atom-model', mount: '#game', badge: '원자 모형 탐험가', homeHref: '../../index.html#hq',
    featureLabels: { unc: '🎚️ 슬릿 폭 Δx · 불확정성 그래프', bohr: '🪐 보어 궤도 · 에너지 준위 도표', cloud: '☁️ 전자 위치 측정 · 히스토그램', cmp: '⚖️ 비교표 · 문장 카드' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  setScene('unc');
  updateCtl();
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t; S.dt = dt;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    view.apply();
    stepUnc(dt); stepBohr(dt); stepCloud(dt);
    ctx.clearRect(0, 0, VW, VH);
    if (S.mode === 'unc') drawUnc(); else if (S.mode === 'bohr') drawBohr(); else if (S.mode === 'cloud') drawCloud(); else drawCmp();
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, MA, SEL_B, SEL_C, SEL_T, SEL_K, NUM_A, TBL, CARDS, slX, setScene, updateCtl, startTr, measureOne, resetCloud, clAdd, dpMin, dvMin, cdf, trE, trLam, theta1,
    get game() { return game; },
  };

})();
