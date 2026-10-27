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
     전자기와 양자 Ⅲ. 양자와 미시세계 - 별빛 스펙트럼 (단원 7차시)
     성취기준 [12전자03-05] 별에서 핵융합에 의해 에너지가 생성되고 빛이 방출되는 원리를 알고, 별빛의 스펙트럼에 기반하여 별의 구성 원소를 추리할 수 있다.
     ① 탐구: 준위 확인 (선의 파장 → 광자 에너지 E = 1240/λ → 에너지 준위 그림)
     ② 실험: 방출과 흡수 (연속 · 방출선 · 흡수선, 같은 파장에 생기는 까닭)
     ③ 분석: 별빛 분석 (뜨거운 광구 + 더 차가운 대기 → 흡수선, 기준 파장표와 대조)
     ④ 적용: 원소 추리 (선 이동은 정성적으로, 선의 세기 ≠ 함량)
     리드베리 식, 선폭·선 세기의 정량 분석, 분광형 상세 기준, 도플러 이동의 계산은 다루지 않아요.
     ========================================================= */

  /* ---------- 상수·모형 (화면의 숫자와 모두 같은 값) ---------- */
  const LAM0 = 380, LAM1 = 780;
  const XL = [653, 477, 413];                                    // 미지의 원소 X의 방출선(nm)
  const evOf = (lam) => 1240 / lam;
  const XE = [1.9, 2.6, 3.0];                                    // 각 선의 광자 에너지(eV, 0.1 eV 눈금) = 에너지 준위 E₂, E₃, E₄
  const EMAX = 3.6;
  const REF = {
    H: { name: '수소', col: '#e2464b', lines: [410.2, 434.0, 486.1, 656.3] },
    He: { name: '헬륨', col: '#e08a1e', lines: [447.1, 501.6, 587.6, 667.8] },
    Na: { name: '나트륨', col: '#b58a00', lines: [589.0, 589.6] },
    Ca: { name: '칼슘', col: '#14a058', lines: [393.4, 396.8] },
    Mg: { name: '마그네슘', col: '#3867f4', lines: [517.3, 518.4] },
  };
  const STAR = {
    A: { name: '별 A', lines: [656.3, 486.1, 434.0] },
    B: { name: '별 B', lines: [589.0, 589.6, 393.4, 396.8] },
    C: { name: '별 C', lines: [587.6, 667.8, 656.3, 486.1] },
    S: { name: '태양', lines: [656.3, 486.1, 589.0, 589.6, 393.4, 396.8, 517.3, 518.4] },
  };
  const D_SHIFT = 0.7;                                           // 별 D: 수소선이 모두 +0.7 nm 이동
  const sH = (T) => Math.exp(-Math.pow(Math.log10(T) - 4.0, 2) / (2 * 0.27 * 0.27));
  const sHe = (T) => Math.exp(-Math.pow(Math.log10(T) - 4.34, 2) / (2 * 0.15 * 0.15));
  const sMol = (T) => clamp((4200 - T) / 1200, 0, 1);
  const lamX = (bar, lam) => bar.x + (lam - LAM0) / (LAM1 - LAM0) * bar.w;
  const nameOf = (l) => (l >= 1000 ? Math.round(l) : l);

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'level', t: 0, dt: 0.016, fade: 0, cur: 550,
    show: { numA: false, selB: false, selD: false, selI: false, selM: false },
    lv: { rec: {}, E: [null, null, null], drag: -1, dragY: 0, dragX: 0, revealE: false, done: false, ping: 0 },
    ea: { src: 'bulb', seen: { bulb: true }, ovl: false, mask: false, pred: [], ph: [], flash: [], sc: [], acc: 0, ok: false },
    sa: { star: 'A', el: {}, seenS: { A: true } },
    nf: { view: 'D', T: 10000, seenD: false, seenT: false, hot: false, cool: false },
  };
  let game = null;
  const MODE_LABEL = { level: '📏 준위 확인', ea: '🔦 방출과 흡수', star: '⭐ 별빛 분석', infer: '🔎 원소 추리' };
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
      if (on && sub) on = sub.split(' ').indexOf(S.nf.view) >= 0;
      const dm = n.getAttribute('data-match');
      if (on && dm) on = !!S.show[dm] || (!!game && game.free);
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    srcSeg.set(S.ea.src); stSeg.set(S.sa.star); vwSeg.set(S.nf.view);
    $$('#elSeg button').forEach((b) => b.classList.toggle('on', !!S.sa.el[b.dataset.v]));
    const ob = $('#bOvl'); if (ob) { ob.classList.toggle('btn-primary', S.ea.ovl); ob.hidden = S.ea.src !== 'abs'; }
    const cb = $('#bClrP'); if (cb) cb.hidden = !(S.ea.mask && S.ea.src === 'abs');
    const rb = $('#bRec'); if (rb) rb.disabled = nearLine() == null;
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));

  /* ---------- 컨트롤 ---------- */
  const slW = bindSlider('sW', (v) => v + ' nm', (v) => { S.cur = +v; updateCtl(); });
  const setCur = (lam) => { S.cur = clamp(Math.round(lam), LAM0, LAM1); slW.set(S.cur); updateCtl(); };
  function nearLine() { if (S.mode !== 'level') return null; const i = XL.findIndex((l) => Math.abs(l - S.cur) <= 2); return i >= 0 ? i : null; }
  $('#bRec').addEventListener('click', () => { const i = nearLine(); if (i == null) return; Sound.click(); if (!S.lv.rec[i]) { S.lv.rec[i] = true; S.lv.ping = 1; Sound.tick(); } });
  const srcSeg = bindSeg('srcSeg', (v) => { S.ea.src = v; S.ea.seen[v] = true; S.ea.ph.length = 0; S.ea.flash.length = 0; S.ea.sc.length = 0; updateCtl(); });
  $('#bOvl').addEventListener('click', () => { Sound.click(); S.ea.ovl = !S.ea.ovl; updateCtl(); });
  $('#bClrP').addEventListener('click', () => { Sound.click(); S.ea.pred.length = 0; });
  const stSeg = bindSeg('stSeg', (v) => { S.sa.star = v; S.sa.seenS[v] = true; });
  $$('#elSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.sa.el[b.dataset.v] = !S.sa.el[b.dataset.v]; updateCtl(); }));
  const vwSeg = bindSeg('vwSeg', (v) => { S.nf.view = v; if (v === 'D') S.nf.seenD = true; else S.nf.seenT = true; updateCtl(); });
  const slTm = bindSlider('sTm', (v) => (v * 100).toLocaleString('ko-KR') + ' K', (v) => { const N = S.nf; N.T = v * 100; if (N.T >= 25000) N.hot = true; if (N.T <= 3600) N.cool = true; });

  const NUM_A = mkNum('numA', XL.map((l, i) => ({ q: l + ' nm 선의 광자 에너지', unit: 'eV', ans: XE[i], tol: 0.03, hint: 'E(eV) = 1240 / λ(nm)예요. 예) 653 nm → 1240 / 653 ≈ 1.90 eV. 소수 둘째 자리까지 구해 보세요.' })));
  const OPT_EL = ['수소', '헬륨', '헬륨과 수소', '나트륨과 칼슘', '마그네슘'];
  const SEL_B = mkSelRows('selB', [
    { q: '<b>별 A</b>의 흡수선 656.3 · 486.1 · 434.0 nm는 어떤 원소의 선일까요?', opts: OPT_EL, ans: 0 },
    { q: '<b>별 B</b>의 흡수선 589.0/589.6 · 393.4 · 396.8 nm는?', opts: OPT_EL, ans: 3 },
    { q: '<b>별 C</b>의 흡수선 587.6 · 667.8 nm와 수소선(656.3 · 486.1 nm)은?', opts: OPT_EL, ans: 2 },
  ]);
  const OPT_EL2 = ['수소', '헬륨', '나트륨', '칼슘', '마그네슘'];
  const SEL_D = mkSelRows('selD', [
    { q: '태양의 흡수선 <b>656.3 · 486.1 nm</b>', opts: OPT_EL2, ans: 0 },
    { q: '태양의 흡수선 <b>589.0 / 589.6 nm</b> (아주 가까운 두 줄)', opts: OPT_EL2, ans: 2 },
    { q: '태양의 흡수선 <b>393.4 / 396.8 nm</b>', opts: OPT_EL2, ans: 3 },
    { q: '태양의 흡수선 <b>517.3 / 518.4 nm</b>', opts: OPT_EL2, ans: 4 },
  ]);
  const SEL_I = mkSelRows('selI', [
    { q: '<b>별 D</b>: 선의 패턴은 수소와 같은데 선 전체가 붉은 쪽으로 약간 이동했어요. 이 별은?', opts: ['수소가 없는 새로운 별이에요', '수소이며, 별이 우리에게서 멀어지고 있어요', '선이 이동했으니 수소가 아닌 다른 원소예요'], ans: 1 },
    { q: '<b>온도가 매우 높은 별(약 30,000 K)</b>에서 수소선이 약하고 헬륨선이 강한 까닭은?', opts: ['수소가 적고 헬륨이 많아서예요', '높은 온도에서 수소 원자가 이온화되어 흡수선이 약해지기 때문이에요', '별이 너무 어두워서 수소선이 안 보여요'], ans: 1 },
  ]);
  const SEL_M = mkSelRows('selM', [
    { q: '별의 스펙트럼에서 어떤 원소의 선이 약하다면 그 원소가 적다고 단정할 수 있을까요?', opts: ['단정할 수 있어요', '단정하면 안 돼요. 온도에 따라 원자의 들뜸 · 이온화 상태가 달라서 선의 세기도 달라져요'], ans: 1 },
    { q: '이 모형에서 수소 흡수선이 가장 강한 표면 온도는 약 몇 K일까요?', opts: ['약 3,500 K', '약 10,000 K', '약 30,000 K'], ans: 1 },
  ]);

  /* ---------- 스펙트럼 막대 도우미 ---------- */
  function drawBar(bar, kind, lines, o) {
    o = o || {};
    ctx.save(); D.roundRect(bar.x, bar.y, bar.w, bar.h, 6); ctx.clip();
    if (kind === 'rainbow') { for (let px = 0; px < bar.w; px += 2) { ctx.fillStyle = wlColor(LAM0 + (px + 1) / bar.w * (LAM1 - LAM0)); ctx.fillRect(bar.x + px, bar.y, 2.3, bar.h); } }
    else { ctx.fillStyle = '#10151f'; ctx.fillRect(bar.x, bar.y, bar.w, bar.h); }
    (o.bands || []).forEach((b) => { const x0 = lamX(bar, b.a), x1 = lamX(bar, b.b); ctx.fillStyle = 'rgba(10,12,20,' + (0.62 * b.s).toFixed(3) + ')'; ctx.fillRect(x0, bar.y, x1 - x0, bar.h); });
    lines.forEach((l) => {
      const x = lamX(bar, l.lam), s = l.s == null ? 1 : l.s; if (s < 0.03) return;
      if (kind === 'rainbow') { const w = 1.6 + 2.6 * s; ctx.fillStyle = 'rgba(8,10,18,' + (0.4 + 0.55 * s).toFixed(3) + ')'; ctx.fillRect(x - w / 2, bar.y, w, bar.h); }
      else { const col = wlColor(l.lam); ctx.fillStyle = C.rgba(col, 0.22 * s); ctx.fillRect(x - 5, bar.y, 10, bar.h); ctx.fillStyle = col; ctx.fillRect(x - 1.4, bar.y, 2.8, bar.h); ctx.fillStyle = 'rgba(255,255,255,' + (0.5 * s).toFixed(2) + ')'; ctx.fillRect(x - 0.5, bar.y, 1, bar.h); }
    });
    const g = ctx.createLinearGradient(0, bar.y, 0, bar.y + bar.h); g.addColorStop(0, 'rgba(255,255,255,.22)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(bar.x, bar.y, bar.w, bar.h);
    ctx.restore();
    ctx.strokeStyle = '#5d6879'; ctx.lineWidth = 1.4; D.roundRect(bar.x, bar.y, bar.w, bar.h, 6); ctx.stroke();
  }
  function barTicks(bar, fs) {
    [400, 500, 600, 700].forEach((v) => { const x = lamX(bar, v); ctx.fillStyle = '#5d6879'; ctx.fillRect(x - 0.7, bar.y + bar.h, 1.4, 5); T(x, bar.y + bar.h + 17, v + '', fs || 12, '#5d6879', 'center', 700); });
    T(bar.x + bar.w, bar.y + bar.h + 17, 'nm', fs || 12, '#5d6879', 'right', 700);
  }
  function drawRuler(bar, lam, label, hot) {
    const x = lamX(bar, lam);
    ctx.strokeStyle = hot ? '#e2464b' : '#26324a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, bar.y - 8); ctx.lineTo(x, bar.y + bar.h + 5); ctx.stroke();
    ctx.fillStyle = hot ? '#e2464b' : '#26324a'; ctx.beginPath(); ctx.moveTo(x - 6, bar.y - 14); ctx.lineTo(x + 6, bar.y - 14); ctx.lineTo(x, bar.y - 6); ctx.closePath(); ctx.fill();
    D.label(clamp(x, bar.x + 44, bar.x + bar.w - 44), bar.y - 26, label, { size: 12.5, bg: hot ? '#e2464b' : '#26324a' });
  }
  const starLines = (k) => STAR[k].lines.map((l) => ({ lam: l, s: 1 }));
  const xLines = () => XL.map((l) => ({ lam: l, s: 1 }));

  /* ================= ① 준위 확인 ================= */
  const lvLay = () => PHONE
    ? { a: { x: 8, y: 8, w: 464, h: 150 }, b: { x: 8, y: 166, w: 464, h: 262 }, c: { x: 8, y: 436, w: 464, h: 236 } }
    : { a: { x: 12, y: 12, w: 776, h: 156 }, b: { x: 12, y: 178, w: 396, h: 370 }, c: { x: 420, y: 178, w: 368, h: 370 } };
  const lvBar = () => { const A = lvLay().a; return { x: A.x + 26, y: A.y + 72, w: A.w - 52, h: 38 }; };
  function lvDiag() {
    const B = lvLay().b, w = PHONE ? 176 : 190;
    const d = { x: B.x + (PHONE ? 56 : 62), y: B.y + 50, w, h: B.h - (PHONE ? 80 : 84) };
    d.yE = (E) => d.y + d.h - (E / EMAX) * d.h; d.Ey = (y) => (d.y + d.h - y) / d.h * EMAX;
    return d;
  }
  const tokRect = (i) => { const d = lvDiag(), E = S.lv.E[i], y = E == null ? d.y + 26 + i * 38 : d.yE(E); return { x: d.x + d.w + 12, y: y - 14, w: PHONE ? 100 : 108, h: 28 }; };
  function levelsOK() { return XE.every((e, i) => S.lv.E[i] != null && Math.abs(S.lv.E[i] - e) < 0.06); }
  function drawLevel() {
    const { a: A, b: Bp, c: Cc } = lvLay(), bar = lvBar(), L = S.lv;
    // A: 분광기에서 본 X의 선
    panel(A.x, A.y, A.w, A.h, 14);
    T(A.x + 14, A.y + 24, '분광기로 본 미지의 원소 X 방전관 (밝은 선 = 방출선)', PHONE ? 12.5 : 14.5, '#26324a', 'left', 800);
    drawBar(bar, 'dark', xLines()); barTicks(bar, PHONE ? 11 : 12);
    const ni = nearLine();
    drawRuler(bar, S.cur, ni != null ? '선 발견! ' + XL[ni] + ' nm' : 'λ = ' + S.cur + ' nm', ni != null);
    XL.forEach((l, i) => { if (L.rec[i]) { const x = lamX(bar, l), y = bar.y + bar.h + 34; ctx.fillStyle = wlColor(l); D.roundRect(x - 26, y - 11, 52, 20, 10); ctx.fill(); T(x, y + 4, l + ' nm', 11.5, '#10151f', 'center', 800); D.arrow(x, y - 12, x, bar.y + bar.h + 6, { color: '#26324a', width: 1.4, head: 5 }); } });
    if (L.ping > 0.01) { const ii = nearLine(); if (ii != null) { ctx.strokeStyle = 'rgba(255,213,74,' + L.ping.toFixed(2) + ')'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(lamX(bar, XL[ii]), bar.y + bar.h / 2, 8 + (1 - L.ping) * 22, 0, TAU); ctx.stroke(); } }

    // B: 에너지 준위 그림
    const d = lvDiag();
    panel(Bp.x, Bp.y, Bp.w, Bp.h, 14);
    T(Bp.x + 14, Bp.y + 24, '에너지 준위 그림 (바닥 준위 E₁ = 0)', PHONE ? 12.5 : 14.5, '#26324a', 'left', 800);
    ctx.fillStyle = '#fbfcff'; ctx.fillRect(d.x, d.y, d.w, d.h); ctx.strokeStyle = '#c3cbd9'; ctx.lineWidth = 1.2; ctx.strokeRect(d.x, d.y, d.w, d.h);
    for (let e = 0; e <= 3.5; e += 0.5) { const y = d.yE(e); ctx.strokeStyle = '#eef1f7'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(d.x, y); ctx.lineTo(d.x + d.w, y); ctx.stroke(); T(d.x - 8, y + 4, e.toFixed(1), 11.5, '#5d6879', 'right', 700); }
    T(Bp.x + 14, d.y - 8, 'E (eV)', 12, '#26324a', 'left', 800);
    ctx.strokeStyle = '#26324a'; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.moveTo(d.x, d.yE(0)); ctx.lineTo(d.x + d.w, d.yE(0)); ctx.stroke();
    T(d.x + d.w - 4, d.yE(0) - 6, 'E₁ = 0 (바닥)', 12, '#26324a', 'right', 800);
    XL.forEach((l, i) => {
      const E = L.E[i]; if (E == null || L.drag === i) return;
      const y = d.yE(E), ok = Math.abs(E - XE[i]) < 0.06, col = wlColor(l);
      ctx.strokeStyle = ok ? '#14a058' : '#5d6879'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(d.x, y); ctx.lineTo(d.x + d.w, y); ctx.stroke();
      const ax = d.x + 26 + i * 40; D.arrow(ax, y + 2, ax, d.yE(0) - 3, { color: col === '#ffffff' ? '#888' : col, width: 3, head: 9 });
      T(d.x + d.w - 4, y - 6, 'E = ' + E.toFixed(2) + ' eV', 12, ok ? '#0f7a42' : '#26324a', 'right', 800);
    });
    // 이름표(끌 수 있어요)
    XL.forEach((l, i) => {
      const r = tokRect(i), lift = L.drag === i ? 1 : 0, E = L.E[i];
      let x = r.x, y = r.y;
      if (lift) { x = L.dragX - r.w / 2; y = L.dragY - r.h / 2; }
      const col = wlColor(l);
      D.shadow(() => { D.roundRect(x, y - lift * 3, r.w, r.h, 9); ctx.fillStyle = col; ctx.fill(); }, { blur: lift ? 12 : 5, y: lift ? 6 : 2 });
      ctx.strokeStyle = 'rgba(16,21,31,.55)'; ctx.lineWidth = 1.4; D.roundRect(x, y - lift * 3, r.w, r.h, 9); ctx.stroke();
      T(x + r.w / 2, y - lift * 3 + 19, l + ' nm 선 ↕', PHONE ? 12 : 13, '#10151f', 'center', 800);
      if (E != null && !lift) { ctx.strokeStyle = 'rgba(93,104,121,.5)'; ctx.setLineDash([3, 3]); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(d.x + d.w, d.yE(E)); ctx.lineTo(x, y + r.h / 2); ctx.stroke(); ctx.setLineDash([]); }
    });
    if (L.E.every((e) => e == null)) T(Bp.x + 14, Bp.y + Bp.h - 12, '오른쪽 이름표를 끌어 알맞은 높이(E)에 놓아요', PHONE ? 11.5 : 12.5, '#5d6879', 'left', 700);
    else T(Bp.x + 14, Bp.y + Bp.h - 12, levelsOK() ? '준위 그림 완성! 세 선이 모두 맞아요' : '화살표 한 개 = 선 한 개 (E에서 바닥으로 내려오는 전이)', PHONE ? 11.5 : 12.5, levelsOK() ? '#0f7a42' : '#5d6879', 'left', 800);

    // C: 방전관과 기록표
    panel(Cc.x, Cc.y, Cc.w, Cc.h, 14);
    T(Cc.x + 14, Cc.y + 24, '방전관과 기록', PHONE ? 12.5 : 14.5, '#26324a', 'left', 800);
    const tx0 = Cc.x + 22, tw = Cc.w - 44, ty = Cc.y + (PHONE ? 38 : 58), th = PHONE ? 22 : 40;
    ctx.fillStyle = '#9aa5b8'; ctx.fillRect(tx0 - 10, ty + th / 2 - 5, 14, 10); ctx.fillRect(tx0 + tw - 4, ty + th / 2 - 5, 14, 10);
    D.shadow(() => { D.roundRect(tx0, ty, tw, th, th / 2); ctx.fillStyle = 'rgba(214,228,250,.7)'; ctx.fill(); }, { blur: 5, y: 2 });
    const fl = 0.55 + 0.25 * Math.sin(S.t * 9 * (RM ? 0 : 1)); ctx.save(); D.roundRect(tx0, ty, tw, th, th / 2); ctx.clip();
    const gg = ctx.createLinearGradient(tx0, 0, tx0 + tw, 0); gg.addColorStop(0, 'rgba(255,90,90,' + fl + ')'); gg.addColorStop(0.5, 'rgba(120,120,255,' + fl + ')'); gg.addColorStop(1, 'rgba(190,120,255,' + fl + ')');
    ctx.fillStyle = gg; ctx.fillRect(tx0, ty, tw, th); ctx.restore();
    T(Cc.x + Cc.w / 2, ty + th + (PHONE ? 14 : 18), '기체 X 방전관 (낮은 압력)', PHONE ? 11 : 12.5, '#5d6879', 'center', 700);
    const fs = PHONE ? 12 : 13.5, ry = ty + th + (PHONE ? 34 : 54);
    const c0 = Cc.x + 14, c1 = Cc.x + (PHONE ? 74 : 86), c2 = Cc.x + (PHONE ? 190 : 214);
    T(c0, ry, '선', fs - 0.5, '#5d6879', 'left', 800); T(c1, ry, '파장 λ', fs - 0.5, '#5d6879', 'left', 800); T(c2, ry, '광자 에너지 E = 1240/λ', fs - 0.5, '#5d6879', 'left', 800);
    ctx.fillStyle = '#e3e8f2'; ctx.fillRect(Cc.x + 10, ry + 7, Cc.w - 20, 1.5);
    XL.forEach((l, i) => {
      const y = ry + (PHONE ? 24 : 30) + i * (PHONE ? 22 : 30);
      ctx.fillStyle = L.rec[i] ? wlColor(l) : '#d5dbe8'; ctx.beginPath(); ctx.arc(c0 + 8, y - 4, 7, 0, TAU); ctx.fill();
      T(c1, y, L.rec[i] ? l + ' nm' : '? (눈금자로 찾기)', fs, L.rec[i] ? '#26324a' : '#9aa5b8', 'left', 800);
      const rev = L.revealE || (game && game.free);
      T(c2, y, rev ? evOf(l).toFixed(2) + ' eV' : '? eV', fs, rev ? '#0f7a42' : '#c47a00', 'left', 800);
    });
    const py = ry + (PHONE ? 24 : 30) + 3 * (PHONE ? 22 : 30) + (PHONE ? 0 : 6);
    if (L.done || (game && game.free && levelsOK())) {
      ctx.fillStyle = '#e3e8f2'; ctx.fillRect(Cc.x + 10, py - 14, Cc.w - 20, 1.5);
      T(c0, py + (PHONE ? 2 : 4), '준위 차로 예측한 선 (눈에 안 보이는 적외선)', fs - 0.5, '#26324a', 'left', 800);
      [['E₃ → E₂', 0.7], ['E₄ → E₃', 0.4], ['E₄ → E₂', 1.1]].forEach((q, k) => { const y = py + (PHONE ? 18 : 26) + k * (PHONE ? 16 : 22); T(c0, y, q[0] + ': ' + q[1].toFixed(2) + ' eV → ' + Math.round(1240 / q[1]) + ' nm', fs - 0.5, '#7a5bc8', 'left', 800); });
    } else if (!PHONE) textBlock(c0, py + 6, Cc.w - 28, '선이 연속이 아니라 몇 개뿐이라는 것은 원자의 에너지 준위가 띄엄띄엄하다는 증거예요.', 12.5, '#5d6879', 18, 700);
  }
  function stepLevel(dt) { const L = S.lv; if (L.ping > 0) L.ping = Math.max(0, L.ping - dt * 1.6); }

  /* ================= ② 방출과 흡수 ================= */
  const eaLay = () => PHONE
    ? { a: { x: 8, y: 8, w: 464, h: 262 }, b: { x: 8, y: 278, w: 464, h: 394 } }
    : { a: { x: 12, y: 12, w: 776, h: 292 }, b: { x: 12, y: 314, w: 776, h: 234 } };
  function eaGeom() {
    const A = eaLay().a, w = A.w, cy = A.y + (PHONE ? 140 : 160);
    return { A, cy, xs: A.x + w * 0.1, xc0: A.x + w * 0.2, xc1: A.x + w * 0.4, xsl: A.x + w * 0.46, xp0: A.x + w * 0.58, xp1: A.x + w * 0.67, xsc: A.x + w * 0.93, H: PHONE ? 62 : 74 };
  }
  const eaBar = () => { const B = eaLay().b; return { x: B.x + 28, y: B.y + (PHONE ? 66 : 56), w: B.w - 56, h: PHONE ? 52 : 54 }; };
  const yScr = (g, lam) => g.cy - (lam - 580) / 200 * g.H;
  function eaLines() { return S.ea.src === 'tube' ? xLines() : []; }
  function spawnPhoton() {
    const E = S.ea, g = eaGeom();
    if (E.src === 'tube') {
      const lam = XL[Math.floor(Math.random() * 3)];
      E.ph.push({ lam, t: 0, x0: g.xc0 + Math.random() * (g.xc1 - g.xc0), y0: g.cy + rnd(-18, 18), type: 'tube', fwd: Math.random() < 0.55, ang: rnd(-1.2, 1.2) });
    } else {
      const lam = Math.random() < 0.3 ? XL[Math.floor(Math.random() * 3)] + rnd(-1.5, 1.5) : rnd(390, 770);
      E.ph.push({ lam, t: 0, x0: g.xs, y0: g.cy + rnd(-10, 10), type: E.src });
    }
  }
  function photonPos(p, g) {
    // 경로: 광원 → 슬릿 → 프리즘 입구 → 프리즘 출구 → 스크린
    const pts = [[p.x0, p.y0], [g.xsl, g.cy], [g.xp0, g.cy], [g.xp1, g.cy], [g.xsc, yScr(g, p.lam)]];
    const lens = []; let tot = 0; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); lens.push(l); tot += l; }
    let d = clamp(p.t, 0, 1) * tot;
    for (let i = 0; i < lens.length; i++) { if (d <= lens[i] || i === lens.length - 1) { const q = lens[i] ? d / lens[i] : 1; return { x: pts[i][0] + (pts[i + 1][0] - pts[i][0]) * q, y: pts[i][1] + (pts[i + 1][1] - pts[i][1]) * q, seg: i, tot }; } d -= lens[i]; }
    return { x: g.xsc, y: yScr(g, p.lam), seg: 3, tot };
  }
  function stepEa(dt) {
    const E = S.ea, g = eaGeom();
    if (S.mode !== 'ea') { E.ph.length = 0; return; }
    E.acc += dt * (RM ? 5 : 12);
    while (E.acc >= 1) { E.acc -= 1; if (E.ph.length < 70) spawnPhoton(); }
    const cmid = (g.xc0 + g.xc1) / 2;
    for (let i = E.ph.length - 1; i >= 0; i--) {
      const p = E.ph[i];
      if (p.type === 'tube' && !p.fwd) { p.life = (p.life || 0) + dt; p.sx = p.x0 + Math.cos(p.ang) * p.life * 90; p.sy = p.y0 + Math.sin(p.ang) * p.life * 90; if (p.life > 0.7) E.ph.splice(i, 1); continue; }
      const pos = photonPos(p, g);
      p.t += dt * 230 / pos.tot;
      if (p.type === 'abs' && !E.mask) {
        const hit = XL.some((l) => Math.abs(l - p.lam) <= 3.5);
        if (hit && pos.x >= cmid && pos.seg === 0) { E.flash.push({ x: cmid + rnd(-26, 26), y: g.cy + rnd(-22, 22), t: 0, lam: p.lam }); E.ph.splice(i, 1); continue; }
      }
      if (p.t >= 1) E.ph.splice(i, 1);
    }
    for (let i = E.flash.length - 1; i >= 0; i--) { const f = E.flash[i]; f.t += dt / 0.8; if (f.t >= 1) E.flash.splice(i, 1); }
  }
  function drawEa() {
    const { a: A, b: Bp } = eaLay(), E = S.ea, g = eaGeom(), bar = eaBar();
    panel(A.x, A.y, A.w, A.h, 14);
    const tt = { bulb: '백열전구: 모든 색이 연속으로 나와요', tube: '방전관 X: 몇 가지 색의 빛만 나와요', abs: '전구 빛이 차가운 X 기체를 지나가요' };
    T(A.x + 14, A.y + 24, tt[E.src], PHONE ? 12.5 : 14.5, '#26324a', 'left', 800);
    // 광원
    const light = E.src === 'tube';
    if (!light) { D.glow(g.xs - 6, g.cy, 52, '#ffd54a', 0.75); D.sphere(g.xs - 6, g.cy, PHONE ? 16 : 20, '#fff2a8', { shadow: true }); ctx.fillStyle = '#9aa5b8'; ctx.fillRect(g.xs - 10, g.cy + (PHONE ? 16 : 20), 8, 14); T(g.xs - 6, g.cy + 52, '전구', 12, '#5d6879', 'center', 800); }
    // 기체 상자 / 방전관
    const cellH = PHONE ? 78 : 96;
    if (E.src === 'abs' || light) {
      D.shadow(() => { D.roundRect(g.xc0, g.cy - cellH / 2, g.xc1 - g.xc0, cellH, 12); ctx.fillStyle = light ? 'rgba(250,200,210,.45)' : 'rgba(214,228,250,.55)'; ctx.fill(); }, { blur: 5, y: 2 });
      ctx.strokeStyle = '#8aa0c8'; ctx.lineWidth = 1.8; D.roundRect(g.xc0, g.cy - cellH / 2, g.xc1 - g.xc0, cellH, 12); ctx.stroke();
      const nAt = 6; for (let i = 0; i < nAt; i++) { const ax = g.xc0 + (g.xc1 - g.xc0) * (0.18 + 0.64 * ((i * 0.618) % 1)), ay = g.cy + (((i * 0.37 + 0.13) % 1) - 0.5) * (cellH - 30); D.sphere(ax, ay, PHONE ? 6 : 7.5, light ? '#f26b3a' : '#7f93bd', { gloss: true }); if (light) D.glow(ax, ay, 22, '#ff8a7a', 0.45 + 0.2 * Math.sin(S.t * 8 + i)); }
      T((g.xc0 + g.xc1) / 2, g.cy + cellH / 2 + 18, light ? '기체 X (전기로 들뜸)' : '차가운 기체 X', PHONE ? 11.5 : 12.5, '#5d6879', 'center', 800);
    }
    // 슬릿과 프리즘
    ctx.fillStyle = '#6b7488'; ctx.fillRect(g.xsl - 4, g.cy - 60, 8, 60 - 5); ctx.fillRect(g.xsl - 4, g.cy + 5, 8, 55);
    T(g.xsl, g.cy - 66, '슬릿', 11.5, '#5d6879', 'center', 800);
    D.shadow(() => { ctx.beginPath(); ctx.moveTo(g.xp0, g.cy + 44); ctx.lineTo((g.xp0 + g.xp1) / 2 + 6, g.cy - 50); ctx.lineTo(g.xp1 + 12, g.cy + 44); ctx.closePath(); ctx.fillStyle = 'rgba(190,225,245,.7)'; ctx.fill(); ctx.strokeStyle = '#6aa3c8'; ctx.lineWidth = 2; ctx.stroke(); }, { blur: 6, y: 2 });
    T((g.xp0 + g.xp1) / 2 + 6, g.cy + 62, '프리즘', 12, '#5d6879', 'center', 800);
    ctx.fillStyle = '#26324a'; ctx.fillRect(g.xsc - 2, g.cy - g.H - 14, 4, g.H * 2 + 28); T(g.xsc, g.cy + g.H + 30, '스크린', 11.5, '#5d6879', 'center', 800);
    // 프리즘 뒤의 색 퍼짐(빛줄기)
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,235,150,.5)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(g.xsl, g.cy); ctx.lineTo(g.xp0 + 8, g.cy); ctx.stroke();
    const fan = (lam, a) => { const y = yScr(g, lam); ctx.strokeStyle = C.rgba(wlColor(lam), a); ctx.lineWidth = E.src === 'tube' ? 3.4 : 2.6; ctx.beginPath(); ctx.moveTo(g.xp1 + 6, g.cy); ctx.lineTo(g.xsc - 3, y); ctx.stroke(); ctx.fillStyle = C.rgba(wlColor(lam), Math.min(1, a * 2.5)); ctx.fillRect(g.xsc + 3, y - 1.8, 12, 3.6); };
    if (E.src === 'tube') XL.forEach((l) => fan(l, 0.55));
    else for (let lam = 390; lam <= 770; lam += 8) { if (E.src === 'abs' && !E.mask && XL.some((l) => Math.abs(l - lam) <= 5)) continue; fan(lam, 0.22); }
    ctx.restore();
    // 광자들
    E.ph.forEach((p) => {
      if (p.type === 'tube' && !p.fwd) { const a = 1 - p.life / 0.7; ctx.globalAlpha = Math.max(0, a); D.glow(p.sx, p.sy, 10, wlColor(p.lam), 0.7); D.sphere(p.sx, p.sy, 2.6, wlColor(p.lam), { gloss: false }); ctx.globalAlpha = 1; return; }
      const pos = photonPos(p, g), col = wlColor(p.lam); D.glow(pos.x, pos.y, 9, col, 0.65); D.sphere(pos.x, pos.y, 2.9, col, { gloss: false });
    });
    // 흡수되어 들뜬 원자의 섬광
    E.flash.forEach((f) => { const q = f.t; ctx.globalAlpha = 1 - q; D.glow(f.x, f.y, 22 + q * 16, wlColor(f.lam), 0.85); ctx.globalAlpha = 1; if (q < 0.55) D.sphere(f.x, f.y, 8, '#ffb400', { gloss: false }); });
    if (E.mask && E.src === 'abs') { D.label(A.x + A.w / 2, A.y + A.h - 22, '🔒 흡수선이 어디에 생길지 먼저 예측해 보세요 (아래 스펙트럼 막대를 눌러요)', { size: PHONE ? 11.5 : 13, bg: '#7a5bc8' }); }
    else if (E.src === 'abs') T(A.x + A.w / 2, A.y + A.h - 16, '일부 색의 광자는 X 원자에 흡수되어 앞으로 나가지 못해요', PHONE ? 11 : 12.5, '#5d6879', 'center', 800);
    else if (E.src === 'tube') T(A.x + A.w / 2, A.y + A.h - 16, 'X 원자는 정해진 몇 가지 색의 빛만 내보내요', PHONE ? 11 : 12.5, '#5d6879', 'center', 800);
    else T(A.x + A.w / 2, A.y + A.h - 16, '백열전구의 빛은 프리즘을 지나면 모든 색이 끊김 없이 이어져요', PHONE ? 11 : 12.5, '#5d6879', 'center', 800);

    // B: 스펙트럼
    panel(Bp.x, Bp.y, Bp.w, Bp.h, 14);
    const name = { bulb: '연속 스펙트럼', tube: '방출선 스펙트럼 (밝은 선)', abs: E.mask ? '연속 스펙트럼 (흡수선은 아직 안 보여요)' : '흡수선 스펙트럼 (어두운 선)' }[E.src];
    T(Bp.x + 14, Bp.y + 24, '스크린에 나타난 스펙트럼: ' + name, PHONE ? 12.5 : 14.5, '#26324a', 'left', 800);
    const kind = E.src === 'tube' ? 'dark' : 'rainbow';
    const showLines = E.src === 'tube' ? xLines() : (E.src === 'abs' && !E.mask ? xLines() : []);
    drawBar(bar, kind, showLines); barTicks(bar, PHONE ? 11 : 12);
    // 예측 표시
    if (E.mask && E.src === 'abs') {
      E.pred.forEach((lam) => { const x = lamX(bar, lam); ctx.fillStyle = '#7a5bc8'; ctx.beginPath(); ctx.moveTo(x - 7, bar.y - 12); ctx.lineTo(x + 7, bar.y - 12); ctx.lineTo(x, bar.y - 2); ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(122,91,200,.7)'; ctx.setLineDash([3, 3]); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x, bar.y); ctx.lineTo(x, bar.y + bar.h); ctx.stroke(); ctx.setLineDash([]); T(x, bar.y - 18, lam + ' nm', 11.5, '#5b3fb0', 'center', 800); });
      T(Bp.x + 14, bar.y + bar.h + 50, '표시한 곳: ' + E.pred.length + ' / 3개', PHONE ? 12.5 : 13.5, '#7a5bc8', 'left', 800);
    }
    // 방출선 겹쳐 보기
    if (E.src === 'abs' && E.ovl && !E.mask) {
      const bar2 = { x: bar.x, y: bar.y + bar.h + (PHONE ? 54 : 46), w: bar.w, h: 34 };
      T(bar2.x, bar2.y - 6, '아래: 방전관 X의 방출선도 같은 위치예요', PHONE ? 11.5 : 12.5, '#26324a', 'left', 800);
      drawBar(bar2, 'dark', xLines());
      XL.forEach((l) => { const x = lamX(bar, l); ctx.strokeStyle = 'rgba(226,70,75,.8)'; ctx.setLineDash([4, 3]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, bar.y); ctx.lineTo(x, bar2.y + bar2.h); ctx.stroke(); ctx.setLineDash([]); T(x, bar2.y + bar2.h + 16, l + ' nm', 12, '#c0353b', 'center', 800); });
    }
    if (!(E.src === 'abs' && E.ovl && !E.mask) && !(E.mask && E.src === 'abs')) {
      const msg = { bulb: '모든 파장이 이어져 있어서 끊김이 없어요. 뜨거운 고체나 밀도가 높은 기체가 내는 빛이에요.', tube: '뜨겁고 얇은 기체는 653 · 477 · 413 nm의 방출선만 내요. 원소마다 선의 위치가 달라서 “원소의 지문”이에요.', abs: '연속 스펙트럼에서 653 · 477 · 413 nm만 어두워요. 방출선과 같은 위치에 흡수선이 생겨요. (“방출선 겹쳐 보기”를 눌러 보세요)' }[E.src];
      textBlock(Bp.x + 16, bar.y + bar.h + (PHONE ? 54 : 52), Bp.w - 32, msg, PHONE ? 12.5 : 14, '#5d6879', PHONE ? 18 : 20, 700);
    }
  }
  function eaPointer(p) {
    if (S.mode !== 'ea' || !(S.ea.mask && S.ea.src === 'abs')) return false;
    const bar = eaBar(); if (p.x < bar.x - 6 || p.x > bar.x + bar.w + 6 || p.y < bar.y - 24 || p.y > bar.y + bar.h + 8) return false;
    const lam = Math.round(LAM0 + (p.x - bar.x) / bar.w * (LAM1 - LAM0)), E = S.ea;
    const k = E.pred.findIndex((q) => Math.abs(q - lam) <= 8);
    if (k >= 0) E.pred.splice(k, 1); else if (E.pred.length < 3) E.pred.push(clamp(lam, LAM0, LAM1)); else showHint('표시는 3개까지예요. 표시를 눌러 지우거나 “표시 지우기”를 눌러요.');
    Sound.click(); return true;
  }
  function predOK() { const E = S.ea; if (E.pred.length < 3) return false; const used = {}; return XL.every((l) => { const k = E.pred.findIndex((q, i) => !used[i] && Math.abs(q - l) <= 9); if (k < 0) return false; used[k] = true; return true; }); }

  /* ================= ③ 별빛 분석 ================= */
  const saLay = () => PHONE
    ? { a: { x: 8, y: 8, w: 464, h: 168 }, c: { x: 8, y: 184, w: 464, h: 488 } }
    : { a: { x: 12, y: 12, w: 776, h: 156 }, c: { x: 12, y: 178, w: 776, h: 370 } };
  const saBars = () => {
    const Cc = saLay().c, x0 = Cc.x + (PHONE ? 62 : 108), w = Cc.w - (PHONE ? 76 : 128);
    const star = { x: x0, y: Cc.y + (PHONE ? 70 : 78), w, h: PHONE ? 40 : 48 };
    const rows = Object.keys(REF).map((k, i) => ({ k, x: x0, y: star.y + star.h + (PHONE ? 44 : 40) + i * (PHONE ? 42 : 38), w, h: PHONE ? 24 : 22 }));
    return { star, rows, Cc };
  };
  function drawStar() {
    const { a: A } = saLay(), { star: bar, rows, Cc } = saBars(), Sa = S.sa, st = STAR[Sa.star];
    // A: 별빛이 만들어지는 과정
    panel(A.x, A.y, A.w, A.h, 14);
    T(A.x + 14, A.y + 24, '별빛에 어두운 선이 생기는 곳: 별의 바깥 대기', PHONE ? 12.5 : 14.5, '#26324a', 'left', 800);
    const cx = A.x + (PHONE ? 50 : 76), cy = A.y + (PHONE ? 90 : 84), R = PHONE ? 24 : 34;
    const ring = R + (PHONE ? 15 : 18);
    D.glow(cx, cy, ring * 1.8, '#ffd54a', 0.35);
    ctx.fillStyle = 'rgba(255,170,120,.35)'; ctx.beginPath(); ctx.arc(cx, cy, ring, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(226,100,60,.55)'; ctx.setLineDash([4, 3]); ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]);
    D.sphere(cx, cy, R, '#ffe08a', { shadow: true });
    T(cx, cy + 4, '광구', 12, '#7a3a10', 'center', 800);
    for (let i = 0; i < 5; i++) { const a = -0.9 + i * 1.8 / 4 * 0.9 + 0.5, ar = ring - 7; D.sphere(cx + Math.cos(a) * ar, cy + Math.sin(a) * ar, 3.6, '#e2464b', { gloss: false }); }
    T(cx, A.y + A.h - 8, '더 차가운 바깥 대기', PHONE ? 11 : 12, '#a1431c', 'center', 800);
    // 흐름: 연속 스펙트럼 → 흡수 → 선이 있는 스펙트럼
    const m1 = { x: A.x + (PHONE ? 112 : 170), y: A.y + (PHONE ? 58 : 56), w: PHONE ? 150 : 250, h: PHONE ? 26 : 30 }, m2 = { x: m1.x, y: m1.y + m1.h + (PHONE ? 36 : 34), w: m1.w, h: m1.h };
    T(m1.x, m1.y - 7, '광구에서 나온 빛: 연속 스펙트럼', PHONE ? 11.5 : 12.5, '#26324a', 'left', 800); drawBar(m1, 'rainbow', []);
    T(m2.x, m2.y - 7, '지구에 도착한 ' + st.name + '의 빛: 어두운 선이 생겼어요', PHONE ? 11.5 : 12.5, '#26324a', 'left', 800); drawBar(m2, 'rainbow', starLines(Sa.star));
    D.arrow(m1.x + m1.w / 2, m1.y + m1.h + 3, m1.x + m1.w / 2, m2.y - 19, { color: '#7a5bc8', width: 2.4, head: 7 });
    if (!PHONE) textBlock(A.x + 490, A.y + 56, 270, '뜨거운 광구는 연속 스펙트럼의 빛을 내고, 더 차가운 바깥 대기의 원자가 특정 파장의 빛을 흡수해서 어두운 선을 남겨요. 이 선의 파장 패턴을 원소의 지문과 비교하면 대기 속 원소를 알 수 있어요.', 13, '#5d6879', 18, 700);

    // C: 스펙트럼과 기준선 비교
    panel(Cc.x, Cc.y, Cc.w, Cc.h, 14);
    T(Cc.x + 14, Cc.y + 24, st.name + '의 스펙트럼과 원소별 기준선 (같은 눈금)', PHONE ? 12.5 : 14.5, '#26324a', 'left', 800);
    const near = st.lines.filter((l) => Math.abs(l - S.cur) <= 2.2);
    drawBar(bar, 'rainbow', starLines(Sa.star)); barTicks(bar, PHONE ? 10.5 : 12);
    T(Cc.x + 14, bar.y + bar.h / 2 + 5, st.name, PHONE ? 12 : 14, '#26324a', 'left', 800);
    // 기준선 막대
    rows.forEach((r) => {
      const R2 = REF[r.k], on = !!Sa.el[r.k];
      ctx.fillStyle = on ? C.rgba(R2.col, 0.14) : 'rgba(0,0,0,0)'; if (on) ctx.fillRect(Cc.x + 8, r.y - 6, Cc.w - 16, r.h + 12);
      T(Cc.x + 14, r.y + r.h / 2 + 5, R2.name, PHONE ? 12 : 13.5, on ? R2.col : '#26324a', 'left', 800);
      drawBar(r, 'dark', R2.lines.map((l) => ({ lam: l, s: 1 })));
      const txt = R2.lines.map((l) => l.toFixed(1)).join(' · ');
      T(r.x, r.y + r.h + 13, txt, PHONE ? 10 : 11.5, '#5d6879', 'left', 700);
    });
    // 겹쳐 보기: 선택한 원소의 기준선을 별 스펙트럼 위로 늘여 그리기
    Object.keys(REF).forEach((k) => { if (!Sa.el[k]) return; REF[k].lines.forEach((l) => { const x = lamX(bar, l); ctx.strokeStyle = REF[k].col; ctx.setLineDash([4, 3]); ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(x, bar.y - 4); ctx.lineTo(x, rows[Object.keys(REF).indexOf(k)].y + rows[0].h); ctx.stroke(); ctx.setLineDash([]); }); });
    // 눈금자
    const nn = near.length ? near[0] : null;
    drawRuler(bar, S.cur, nn != null ? '선 발견! ' + near.map((l) => l.toFixed(1)).join(' / ') + ' nm' : 'λ = ' + S.cur + ' nm', nn != null);
    ctx.strokeStyle = 'rgba(38,50,74,.5)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(lamX(bar, S.cur), bar.y + bar.h + 5); ctx.lineTo(lamX(bar, S.cur), rows[rows.length - 1].y + rows[0].h + 4); ctx.stroke();
    if (Sa.star === 'S') { T(Cc.x + Cc.w - 14, Cc.y + 24, '※ 태양: 헬륨선은 흡수선으로 거의 안 보여요', PHONE ? 10.5 : 12, '#5d6879', 'right', 700); }
    T(Cc.x + Cc.w - 14, Cc.y + Cc.h - 12, '눈금자는 스펙트럼 막대를 눌러서 옮길 수 있어요', PHONE ? 10.5 : 12, '#5d6879', 'right', 700);
  }
  function starPointer(p) {
    if (S.mode !== 'star') return false;
    const { star: bar } = saBars(); if (p.x < bar.x - 6 || p.x > bar.x + bar.w + 6 || p.y < bar.y - 30 || p.y > bar.y + bar.h + 12) return false;
    setCur(LAM0 + (p.x - bar.x) / bar.w * (LAM1 - LAM0)); return true;
  }

  /* ================= ④ 원소 추리 ================= */
  const nfLay = () => PHONE
    ? { a: { x: 8, y: 8, w: 464, h: 300 }, b: { x: 8, y: 316, w: 464, h: 190 }, c: { x: 8, y: 514, w: 464, h: 158 } }
    : { a: { x: 12, y: 12, w: 776, h: 232 }, b: { x: 12, y: 254, w: 384, h: 294 }, c: { x: 406, y: 254, w: 382, h: 294 } };
  function drawInfer() {
    const { a: A, b: Bp, c: Cc } = nfLay(), N = S.nf, fs = PHONE ? 12 : 13.5;
    panel(A.x, A.y, A.w, A.h, 14); panel(Bp.x, Bp.y, Bp.w, Bp.h, 14); panel(Cc.x, Cc.y, Cc.w, Cc.h, 14);
    const bx = A.x + 26, bw = (N.view === 'D' && !PHONE) ? 440 : A.w - 52;
    if (N.view === 'D') {
      T(A.x + 14, A.y + 24, '별 D의 스펙트럼: 수소선과 같은 패턴인데 위치가 조금 달라요', PHONE ? 12.5 : 14.5, '#26324a', 'left', 800);
      const obs = { x: bx, y: A.y + (PHONE ? 62 : 66), w: bw, h: PHONE ? 34 : 40 }, ref = { x: bx, y: obs.y + obs.h + (PHONE ? 44 : 46), w: bw, h: PHONE ? 26 : 30 };
      T(obs.x, obs.y - 8, '별 D (관측)', fs, '#26324a', 'left', 800); drawBar(obs, 'rainbow', REF.H.lines.map((l) => ({ lam: l + D_SHIFT, s: 1 })));
      T(ref.x, ref.y - 8, '수소의 기준선 (실험실에서 잰 값)', fs, '#26324a', 'left', 800); drawBar(ref, 'dark', REF.H.lines.map((l) => ({ lam: l, s: 1 })));
      REF.H.lines.forEach((l) => { const x1 = lamX(obs, l + D_SHIFT), x2 = lamX(ref, l); ctx.strokeStyle = 'rgba(226,70,75,.55)'; ctx.setLineDash([3, 3]); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x1, obs.y + obs.h); ctx.lineTo(x2, ref.y); ctx.stroke(); ctx.setLineDash([]); });
      barTicks(ref, PHONE ? 10.5 : 11.5);
      // 확대 창: Hα 부근
      const z = { x: PHONE ? A.x + 120 : A.x + 520, y: PHONE ? ref.y + ref.h + 48 : A.y + 96, w: PHONE ? 330 : 236, h: PHONE ? 30 : 36 }, z0 = 645, z1 = 670;
      T(z.x, z.y - 22, '🔍 656 nm 부근 확대 (645~670 nm)', fs - 0.5, '#26324a', 'left', 800);
      const ZX = (l) => z.x + (l - z0) / (z1 - z0) * z.w;
      ctx.fillStyle = '#10151f'; ctx.fillRect(z.x, z.y, z.w, z.h);
      ctx.fillStyle = C.rgba(wlColor(656.3), 0.9); ctx.fillRect(ZX(656.3) - 1.4, z.y, 2.8, z.h); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(ZX(656.3), z.y - 6); ctx.lineTo(ZX(656.3), z.y + z.h + 6); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#ff5a5a'; ctx.fillRect(ZX(656.3 + D_SHIFT) - 1.4, z.y, 2.8, z.h);
      ctx.strokeStyle = '#26324a'; ctx.lineWidth = 1.4; ctx.strokeRect(z.x, z.y, z.w, z.h);
      D.arrow(ZX(656.3) + 2, z.y + z.h + 14, ZX(656.3 + D_SHIFT) - 2, z.y + z.h + 14, { color: '#e2464b', width: 2.4, head: 7 });
      T(ZX(656.3) - 4, z.y + z.h + 32, '기준 656.3', 11.5, '#5d6879', 'right', 800); T(ZX(656.3 + D_SHIFT) + 6, z.y + z.h + 32, '별 D 657.0 nm', 11.5, '#c0353b', 'left', 800); T(z.x + z.w, z.y - 8, '(+0.7 nm)', 11.5, '#c0353b', 'right', 800);
      // B: 멀어지는 별
      T(Bp.x + 14, Bp.y + 24, '선이 모두 같은 쪽으로 이동하면', PHONE ? 12.5 : 14.5, '#26324a', 'left', 800);
      const ex = Bp.x + 40, ey = Bp.y + (PHONE ? 100 : 130), sx = Bp.x + Bp.w - 70 - (RM ? 0 : (S.t * 8) % 24);
      D.sphere(ex, ey, 18, '#3867f4', { shadow: true }); T(ex, ey + 38, '지구', 12, '#26324a', 'center', 800);
      D.sphere(sx, ey, 24, '#ffd54a', { shadow: true }); T(sx, ey + 44, '별 D', 12, '#26324a', 'center', 800);
      D.arrow(sx + 30, ey, sx + 62, ey, { color: '#e2464b', width: 3, head: 9 }); T(sx + 46, ey - 12, '멀어져요', 11.5, '#c0353b', 'center', 800);
      ctx.strokeStyle = '#ff6a6a'; ctx.lineWidth = 2; ctx.beginPath(); for (let x = ex + 26; x < sx - 30; x += 2) { const y = ey + Math.sin((x - ex) / 9 - S.t * 6 * (RM ? 0 : 1)) * 7 * Math.min(1, (x - ex - 20) / 30); if (x === ex + 26) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke();
      textBlock(Bp.x + 14, Bp.y + (PHONE ? 148 : 190), Bp.w - 28, '별이 우리에게서 멀어지면 빛의 파장이 길어져 선 전체가 붉은 쪽으로 이동해요(정성적). 이동한 양으로 속도를 계산하지는 않아요.', PHONE ? 11.5 : 13, '#5d6879', PHONE ? 15 : 18, 700);
      // C: 정리
      T(Cc.x + 14, Cc.y + 24, '별 D에서 알 수 있는 것', PHONE ? 12.5 : 14.5, '#26324a', 'left', 800);
      ['선의 패턴(위치 사이의 간격)이 수소와 같아요 → 수소예요', '선 전체가 같은 방향(붉은 쪽)으로 이동했어요', '→ 새로운 원소가 아니라 별이 멀어지고 있다는 뜻이에요'].forEach((s, i) => { if (!PHONE || i < 3) textBlock(Cc.x + 14, Cc.y + 52 + i * (PHONE ? 34 : 50), Cc.w - 28, '• ' + s, PHONE ? 11.5 : 13.5, i === 2 ? '#c0353b' : '#26324a', PHONE ? 15 : 18, 800); });
    } else {
      const T0 = N.T;
      T(A.x + 14, A.y + 24, '표면 온도 ' + T0.toLocaleString('ko-KR') + ' K 인 별의 스펙트럼 (수소의 양은 모든 온도에서 같다고 가정)', PHONE ? 12 : 14.5, '#26324a', 'left', 800);
      const bar = { x: bx, y: A.y + (PHONE ? 74 : 78), w: bw, h: PHONE ? 54 : 64 };
      const hS = sH(T0), heS = sHe(T0), mS = sMol(T0);
      const lines = REF.H.lines.map((l) => ({ lam: l, s: hS })).concat(REF.He.lines.map((l) => ({ lam: l, s: heS })));
      const bands = mS > 0.02 ? [{ a: 540, b: 560, s: mS }, { a: 580, b: 610, s: mS }, { a: 620, b: 650, s: mS }, { a: 700, b: 780, s: mS }] : [];
      drawBar(bar, 'rainbow', lines, { bands }); barTicks(bar, PHONE ? 10.5 : 12);
      REF.H.lines.forEach((l) => T(lamX(bar, l), bar.y - 6, '수소', 10.5, REF.H.col, 'center', 800));
      REF.He.lines.forEach((l) => T(lamX(bar, l), bar.y - 18, '헬륨', 10.5, REF.He.col, 'center', 800));
      if (bands.length) T(lamX(bar, 650), bar.y + bar.h + 34, '← 분자 흡수 띠 (온도가 낮은 별)', 11.5, '#5d6879', 'center', 800);
      const note = T0 >= 25000 ? '수소가 이온화되어 수소선이 약해지고 헬륨선이 강해졌어요 (수소가 적은 것이 아니에요)' : T0 <= 3600 ? '온도가 낮아 분자 흡수 띠가 나타나고 수소선이 약해요' : T0 >= 8000 && T0 <= 13000 ? '이 온도에서 수소 흡수선이 가장 강해요' : '수소선이 어느 정도 보여요. 온도에 따라 선의 세기가 달라져요';
      textBlock(A.x + 14, A.y + A.h - (PHONE ? 70 : 44), A.w - 28, note, PHONE ? 12.5 : 14, '#7a5bc8', PHONE ? 17 : 19, 800);
      // B: 선의 세기 그래프
      T(Bp.x + 14, Bp.y + 24, '온도에 따른 선의 세기 (같은 수소 양)', PHONE ? 12.5 : 14, '#26324a', 'left', 800);
      [['수소선', REF.H.col], ['헬륨선', REF.He.col], ['분자 띠', '#9aa5b8']].forEach((q, i) => { const lx = Bp.x + 16 + i * (PHONE ? 90 : 96), ly = Bp.y + 40; ctx.fillStyle = q[1]; ctx.fillRect(lx, ly - 4, 14, 4); T(lx + 19, ly + 2, q[0], 11.5, q[1] === '#9aa5b8' ? '#5d6879' : q[1], 'left', 800); });
      const ax = axes(Bp.x + (PHONE ? 46 : 52), Bp.y + 56, Bp.w - (PHONE ? 66 : 76), Bp.h - (PHONE ? 106 : 112), { xmin: Math.log10(3000), xmax: Math.log10(30000), ymin: 0, ymax: 1.05, xt: [3000, 5000, 10000, 20000, 30000].map((v) => [Math.log10(v), v >= 10000 ? v / 1000 + 'k' : v / 1000 + 'k']), yt: [[0, '0'], [0.5, '0.5'], [1, '1']], xl: '표면 온도 (K, 로그 눈금)', yl: '선의 세기', ylx: 34, fs: 11 });
      const curve = (fn, col) => { ctx.strokeStyle = col; ctx.lineWidth = 2.4; ctx.beginPath(); for (let v = 3000; v <= 30000; v *= 1.03) { const px = ax.X(Math.log10(v)), py = ax.Y(fn(v)); if (v === 3000) ctx.moveTo(px, py); else ctx.lineTo(px, py); } ctx.stroke(); };
      curve(sH, REF.H.col); curve(sHe, REF.He.col); curve(sMol, '#9aa5b8');
      const cxp = ax.X(Math.log10(T0)); ctx.strokeStyle = 'rgba(38,50,74,.6)'; ctx.setLineDash([4, 3]); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(cxp, ax.y); ctx.lineTo(cxp, ax.y + ax.h); ctx.stroke(); ctx.setLineDash([]);
      D.sphere(cxp, ax.Y(hS), 5.5, REF.H.col); D.sphere(cxp, ax.Y(heS), 5.5, REF.He.col);
            // C: 읽은 값
      T(Cc.x + 14, Cc.y + 24, '지금 온도에서 읽은 값 (모형)', PHONE ? 12.5 : 14, '#26324a', 'left', 800);
      const rows2 = [['수소선의 세기', hS, REF.H.col], ['헬륨선의 세기', heS, REF.He.col], ['분자 띠의 세기', mS, '#8f9bb3']];
      rows2.forEach((r, i) => { const y = Cc.y + 50 + i * (PHONE ? 30 : 44); T(Cc.x + 14, y, r[0], fs, '#26324a', 'left', 800); barH(Cc.x + 14, y + 8, Cc.w - 28, 14, r[1], r[2]); });
      if (!PHONE) textBlock(Cc.x + 14, Cc.y + 190, Cc.w - 28, '선이 보이는지는 원소의 양뿐 아니라 별의 표면 온도(원자의 들뜸 · 이온화 상태)에도 달려 있어요. 그래서 선의 세기만으로 함량을 단정하면 안 돼요.', 13, '#5d6879', 18, 700);
    }
  }

  /* ---------- 포인터 ---------- */
  function lvPointer(p) {
    const L = S.lv, bar = lvBar();
    for (let i = 0; i < 3; i++) { const r = tokRect(i); if (p.x >= r.x - 4 && p.x <= r.x + r.w + 4 && p.y >= r.y - 6 && p.y <= r.y + r.h + 6) { L.drag = i; L.dragX = p.x; L.dragY = p.y; L.E[i] = L.E[i]; Sound.click(); return 'tok'; } }
    if (p.x >= bar.x - 6 && p.x <= bar.x + bar.w + 6 && p.y >= bar.y - 30 && p.y <= bar.y + bar.h + 14) { setCur(LAM0 + (p.x - bar.x) / bar.w * (LAM1 - LAM0)); return 'bar'; }
    return null;
  }
  let ptrKind = null;
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'level') { ptrKind = lvPointer(p); return !!ptrKind; }
      if (S.mode === 'star') { ptrKind = starPointer(p) ? 'bar' : null; return !!ptrKind; }
      if (S.mode === 'ea') { eaPointer(p); return false; }
      return false;
    },
    move(p) {
      const L = S.lv;
      if (ptrKind === 'tok' && L.drag >= 0) { L.dragX = p.x; L.dragY = p.y; }
      else if (ptrKind === 'bar') { if (S.mode === 'level') { const bar = lvBar(); setCur(LAM0 + clamp((p.x - bar.x) / bar.w, 0, 1) * (LAM1 - LAM0)); } else if (S.mode === 'star') { const { star: bar } = saBars(); setCur(LAM0 + clamp((p.x - bar.x) / bar.w, 0, 1) * (LAM1 - LAM0)); } }
    },
    up(p) {
      const L = S.lv;
      if (ptrKind === 'tok' && L.drag >= 0) {
        const d = lvDiag(), i = L.drag;
        if (p.x >= d.x - 12 && p.x <= d.x + d.w + 130 && p.y >= d.y - 4 && p.y <= d.y + d.h + 4) { L.E[i] = clamp(Math.round(d.Ey(p.y) * 10) / 10, 0.1, EMAX); Sound.tick(); if (levelsOK()) { L.done = true; sparkle(d.x + d.w / 2, d.y + d.h * 0.4, 18); } }
        else L.E[i] = null;
        L.drag = -1;
      }
      ptrKind = null;
    },
    hover(p) { if (S.mode === 'level') { for (let i = 0; i < 3; i++) { const r = tokRect(i); if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) return 'grab'; } } return 'default'; },
  });

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    if (S.mode === 'level') {
      const ni = nearLine();
      setReadouts('눈금자 λ', S.cur + ' nm', '광자 에너지 E = 1240/λ', evOf(S.cur).toFixed(2) + ' eV', '기록한 선', Object.keys(S.lv.rec).length + ' / 3개' + (ni != null ? ' · 선 발견!' : ''));
    } else if (S.mode === 'ea') {
      const E = S.ea; setReadouts('광원', { bulb: '백열전구', tube: '방전관 X', abs: '전구 + X 기체' }[E.src], '스펙트럼', { bulb: '연속', tube: '방출선 3개', abs: E.mask ? '예측해 보세요' : '흡수선 3개' }[E.src], '선의 파장', E.src === 'bulb' ? '—' : E.src === 'abs' && E.mask ? '—' : '653 · 477 · 413 nm');
    } else if (S.mode === 'star') {
      const st = STAR[S.sa.star], near = st.lines.filter((l) => Math.abs(l - S.cur) <= 2.2);
      setReadouts('보는 별', st.name, '눈금자 λ', S.cur + ' nm' + (near.length ? ' (선 ' + near.map((l) => l.toFixed(1)).join('/') + ')' : ''), '흡수선의 수', st.lines.length + '개');
    } else {
      const N = S.nf;
      if (N.view === 'D') setReadouts('별 D', '수소선 패턴', '선 이동', '+0.7 nm (붉은 쪽)', '의미', '멀어지는 중');
      else setReadouts('표면 온도', N.T.toLocaleString('ko-KR') + ' K', '수소선의 세기', sH(N.T).toFixed(2), '헬륨선의 세기', sHe(N.T).toFixed(2));
    }
  }

  /* ================= 미션 ================= */
  const levels = [
    {
      title: '준위 확인: 선에서 에너지 준위로', short: '준위 확인', icon: '📏', phase: '탐구',
      intro: '<p class="si-q">❓ 탐구 질문: 별에 가 보지 않고도 별에 어떤 원소가 있는지, 원자 속 에너지가 어떻게 생겼는지 알 수 있을까?</p>' +
        '<div class="si-link">🔗 <b>통합과학에서</b> 분광기로 원소마다 선스펙트럼이 달라 “원소의 지문”이라는 것을, <b>물리학</b>에서는 수소의 Eₙ = −13.6/n² eV로 준위를 계산하는 것을 배웠어요. 이번에는 반대로 <b>관찰한 선의 파장에서 준위를 직접 찾아내요.</b></div>' +
        '<p>원자가 높은 준위에서 낮은 준위로 내려올 때 <b>ΔE = hf = hc/λ</b>인 광자가 나와요. 편하게 <b>E(eV) ≈ 1240 / λ(nm)</b>로 계산해요. 미지의 원소 X의 방전관에서 나오는 선 3개를 찾아 파장을 읽고, 광자 에너지를 구해 <b>에너지 준위 그림</b>을 완성해 봐요.</p>',
      features: ['level'],
      setup() { S.show.numA = false; S.lv = { rec: {}, E: [null, null, null], drag: -1, dragY: 0, dragX: 0, revealE: false, done: false, ping: 0 }; NUM_A.reset(); setCur(550); setScene('level'); },
      recap: '선스펙트럼의 한 선은 두 에너지 준위 사이의 전이예요. 파장 λ에서 광자 에너지 E = 1240/λ(eV)를 구하면 바닥 준위 위의 준위가 하나씩 정해져요(X: 1.90 · 2.60 · 3.00 eV). 선이 몇 개뿐인 것은 에너지 준위가 띄엄띄엄하기 때문이에요.',
      summary: '<ul><li>선스펙트럼의 한 선 = 두 에너지 준위 사이의 전이, <b>ΔE = hf = hc/λ</b>, 편하게 <b>E(eV) ≈ 1240 / λ(nm)</b>.</li><li>미지의 원소 X의 가시광선 방출선: 653 nm(적), 477 nm(청), 413 nm(보라) → E = 1.90, 2.60, 3.00 eV.</li><li>바닥 준위(E₁ = 0)로 내려오는 전이로 보면 들뜬 준위는 E₂ = 1.90 eV, E₃ = 2.60 eV, E₄ = 3.00 eV.</li><li>준위들 사이의 다른 전이(E₃→E₂: 0.70 eV → 1771 nm, E₄→E₃: 0.40 eV → 3100 nm, E₄→E₂: 1.10 eV → 1127 nm)는 적외선이라 눈에 보이지 않아요.</li><li>선이 연속이 아니라 몇 개뿐인 것은 <b>에너지 준위가 띄엄띄엄</b>하다는 증거예요.</li></ul>',
      missions: [
        {
          title: '선 3개의 광자 에너지 구하기', manual: true,
          goal: '눈금자를 움직여 방출선 <b>3개</b>를 찾아 기록하고, 각 선의 광자 에너지를 <b>E = 1240 / λ</b>로 구해 입력하세요.',
          hint: '스펙트럼 막대를 누르거나 슬라이더를 움직여 눈금자를 밝은 선에 맞추면 “선 발견!”이 떠요. 그때 “이 선 기록하기”를 눌러요. 선은 붉은색 · 청색 · 보라색 쪽에 있어요.',
          setup() { S.show.numA = true; NUM_A.reset(); S.lv.rec = {}; S.lv.revealE = false; setScene('level'); },
          check() { if (Object.keys(S.lv.rec).length < 3) return '먼저 눈금자로 방출선 3개를 모두 찾아 “이 선 기록하기”를 눌러 주세요.'; const r = NUM_A.grade(); if (r === true) S.lv.revealE = true; return r; },
          status: () => '기록한 선 ' + Object.keys(S.lv.rec).length + ' / 3 &nbsp; · 입력한 값 ' + NUM_A.count() + ' / 3',
          explain: '방출선은 <b>653 · 477 · 413 nm</b>예요. E = 1240/λ이므로 1240/653 ≈ <b>1.90 eV</b>, 1240/477 ≈ <b>2.60 eV</b>, 1240/413 ≈ <b>3.00 eV</b>이에요. 파장이 짧을수록(푸른빛일수록) 광자 에너지가 커요.',
        },
        {
          title: '에너지 준위 그림 완성하기',
          goal: '오른쪽 이름표 3개를 끌어서, 각 선에 해당하는 <b>준위의 높이(E)</b>에 놓으세요. 바닥 준위(E₁ = 0) 위에 3개의 준위가 생겨요.',
          hint: '653 nm 선의 광자 에너지가 1.90 eV이므로 E₂ = 1.90 eV 높이에 놓아요. 477 nm는 2.60 eV, 413 nm는 3.00 eV예요. 0.1 eV 눈금에 맞춰져요.',
          setup() { S.show.numA = false; S.lv.E = [null, null, null]; S.lv.done = false; setScene('level'); },
          check: () => levelsOK(),
          hold: 0.5,
          status: () => XL.map((l, i) => mark(S.lv.E[i] != null && Math.abs(S.lv.E[i] - XE[i]) < 0.06) + ' ' + l + ' nm' + (S.lv.E[i] != null ? ' (' + S.lv.E[i].toFixed(2) + ' eV)' : '')).join(' &nbsp; '),
          explain: '각 선은 들뜬 준위에서 바닥 준위로 내려오는 전이라고 보면 준위의 에너지가 광자 에너지와 같아요: <b>E₂ = 1.90 eV, E₃ = 2.60 eV, E₄ = 3.00 eV</b>. 이 준위들 사이의 전이(예: E₃ → E₂는 0.70 eV → 1771 nm)는 적외선이라 눈에 보이지 않아요.',
        },
        {
          type: 'quiz', title: '선이 몇 개뿐인 까닭',
          goal: '원자가 모든 색의 빛을 내지 않고 몇 개의 선만 내는 까닭은?',
          setup() { S.show.numA = false; setScene('level'); },
          choices: ['원자는 모든 파장의 빛을 내지만 눈에는 몇 개만 보이기 때문에', '유리관이 다른 색의 빛을 걸러 내기 때문에', '원자의 에너지 준위가 띄엄띄엄해서, 준위 사이의 에너지 차이에 해당하는 파장의 빛만 나오기 때문에', '전자가 연속적인 에너지를 가지지만 일부만 밝게 보이기 때문에'],
          answer: 2,
          feedback: ['원자는 모든 파장의 빛을 내지 않아요. 준위 차이에 해당하는 파장만 나와요.', '선의 위치는 원소 자체가 정해요. 유리관은 선택적으로 거르지 않아요.', '', '전자의 에너지는 연속적이지 않고 띄엄띄엄해요. 그래서 선이 몇 개뿐이에요.'],
          explain: '원자의 에너지 준위는 <b>띄엄띄엄(양자화)</b>해서 전자가 준위 사이를 오갈 때 ΔE = hf인 광자만 나와요. 그래서 연속 스펙트럼이 아닌 몇 개의 선스펙트럼이 되고, 선의 위치는 원소마다 달라요.',
        },
      ],
    },
    {
      title: '방출과 흡수: 같은 자리의 선', short: '방출과 흡수', icon: '🔦', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 원소 X의 방출선(653 · 477 · 413 nm)과 준위를 찾았어요. 같은 원자가 빛을 <b>흡수</b>할 때는 어디에 선이 생길까요? (앞에서 <b>레이저</b>의 흡수 · 방출 과정도 배웠어요.)</div>' +
        '<p>세 가지 광원을 비교해요. ① 뜨거운 고체인 백열전구는 <b>연속 스펙트럼</b>, ② 뜨겁고 얇은 기체(방전관 X)는 <b>방출선</b>, ③ 연속 스펙트럼의 빛이 <b>차가운 기체</b>를 지나면 기체가 특정 파장의 빛을 흡수해서 같은 위치에 어두운 <b>흡수선</b>이 생겨요(키르히호프). 흡수된 광자는 원자를 들뜨게 하고, 곧 임의의 방향으로 다시 나와서 앞으로 오는 빛은 줄어요.</p>',
      features: ['ea'],
      setup() { S.ea.src = 'bulb'; S.ea.seen = { bulb: true }; S.ea.mask = false; S.ea.ovl = false; S.ea.pred.length = 0; S.ea.ph.length = 0; setScene('ea'); },
      recap: '백열전구는 연속 스펙트럼, 뜨겁고 얇은 기체는 방출선, 연속 스펙트럼의 빛이 차가운 기체를 지나면 같은 파장에 흡수선이 생겨요. 흡수선과 방출선의 파장이 같은 것은 같은 두 준위 사이의 전이이기 때문이에요.',
      summary: '<ul><li><b>연속 스펙트럼</b>: 뜨거운 고체 · 밀한 기체(백열전구).</li><li><b>방출선 스펙트럼</b>: 뜨겁고 얇은 기체(방전관). X의 선은 653 · 477 · 413 nm.</li><li><b>흡수선 스펙트럼</b>: 연속 스펙트럼의 빛이 차가운 기체를 지날 때, 같은 파장(653 · 477 · 413 nm)이 흡수되어 어두운 선이 생겨요.</li><li>흡수한 원자는 들뜨고, 곧 임의의 방향으로 광자를 내보내서 앞으로 오는 빛은 줄어들어요.</li><li>방출선과 흡수선은 <b>같은 두 준위 사이의 전이</b>라서 파장이 같아요.</li></ul>',
      missions: [
        {
          title: '세 종류의 스펙트럼 만들기',
          goal: '<b>백열전구</b>, <b>방전관 X</b>, <b>전구 + X 기체</b>를 차례로 골라 연속 · 방출선 · 흡수선 스펙트럼을 모두 만들어 보세요.',
          hint: '위쪽 “광원 고르기”에서 세 가지를 모두 눌러요. 전구 + X 기체에서는 광자가 기체를 지나며 일부가 사라지는 것을 볼 수 있어요.',
          setup() { S.ea.mask = false; S.ea.seen = { [S.ea.src]: true }; setScene('ea'); },
          check: () => !!(S.ea.seen.bulb && S.ea.seen.tube && S.ea.seen.abs),
          hold: 0.6,
          status: () => mark(!!S.ea.seen.bulb) + ' 연속 &nbsp; ' + mark(!!S.ea.seen.tube) + ' 방출선 &nbsp; ' + mark(!!S.ea.seen.abs) + ' 흡수선',
          explain: '백열전구는 <b>연속 스펙트럼</b>을, 방전관 X는 653 · 477 · 413 nm의 <b>방출선</b>을 만들어요. 전구의 빛이 차가운 X 기체를 지나면 X 원자가 같은 세 파장의 광자를 흡수해서 연속 스펙트럼에 <b>어두운 흡수선</b> 3개가 생겨요.',
        },
        {
          title: '흡수선의 위치 예측하기', manual: true,
          goal: '전구 + X 기체의 스펙트럼에서 흡수선이 생길 곳을 <b>3곳</b> 예측해, 스펙트럼 막대를 눌러 표시하세요.',
          hint: '흡수선은 같은 원자의 방출선과 같은 파장에 생겨요. 방전관 X에서 본 선의 파장 653 · 477 · 413 nm 근처(±9 nm)를 눌러 보세요. 표시를 다시 누르면 지워져요.',
          setup() { S.ea.src = 'abs'; S.ea.seen.abs = true; S.ea.mask = true; S.ea.ovl = false; S.ea.pred.length = 0; S.ea.ph.length = 0; setScene('ea'); },
          check() {
            const E = S.ea;
            if (E.pred.length < 3) return '스펙트럼 막대를 눌러 흡수선이 생길 곳을 3곳 표시하세요. (지금 ' + E.pred.length + '곳)';
            if (!predOK()) { const n = XL.filter((l) => E.pred.some((q) => Math.abs(q - l) <= 9)).length; return '맞게 표시한 곳은 ' + n + '곳이에요. 방전관 X에서 본 방출선의 파장을 떠올려 보세요.'; }
            E.mask = false; return true;
          },
          status: () => '표시한 곳 ' + S.ea.pred.length + ' / 3' + (S.ea.mask ? '' : ' (공개됨)'),
          explain: '흡수선은 방출선과 <b>같은 파장(653 · 477 · 413 nm)</b>에 생겨요. 이제 흡수선이 공개되었어요. “방출선 겹쳐 보기”를 눌러 방출선과 흡수선이 같은 자리인지 확인해 보세요.',
        },
        {
          type: 'quiz', title: '흡수선이 방출선과 같은 파장인 까닭',
          goal: '흡수선이 방출선과 같은 파장에 생기는 까닭은?',
          setup() { S.ea.mask = false; S.ea.src = 'abs'; S.ea.seen.abs = true; S.ea.ovl = true; setScene('ea'); },
          choices: ['흡수된 빛은 다른 파장의 빛으로 바뀌어 나가기 때문에', '같은 두 에너지 준위 사이의 전이라서, 올라갈 때 흡수하는 광자와 내려올 때 내는 광자의 에너지가 같기 때문에', '전구 빛에는 원래 그 파장의 빛이 없기 때문에', '기체 원자가 그 파장의 빛을 거울처럼 반사하기 때문에'],
          answer: 1,
          feedback: ['흡수된 광자는 원자를 들뜨게 해요. 파장이 바뀌는 것이 아니라 에너지가 원자에게 가요.', '', '전구는 연속 스펙트럼이라 모든 파장의 빛이 있어요. 기체가 일부를 흡수해서 줄어든 거예요.', '반사하는 것이 아니라 흡수하고 곧 임의의 방향으로 다시 내보내서 앞으로는 줄어요.'],
          explain: '원자는 두 준위 사이의 에너지 차 <b>ΔE = hf</b>인 광자만 흡수하거나 방출해요. 올라갈 때(흡수)와 내려올 때(방출)의 에너지 차가 같으므로 <b>같은 파장</b>에서 선이 생겨요. 흡수한 원자는 곧 임의의 방향으로 광자를 내보내서 앞으로 오는 빛이 줄어들어 어두운 선이 돼요.',
        },
      ],
    },
    {
      title: '별빛 분석: 어두운 선을 읽자', short: '별빛 분석', icon: '⭐', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 연속 스펙트럼의 빛이 차가운 기체를 지나면 흡수선이 생긴다는 것을 알았어요. <b>앞 차시에서</b> 별의 뜨거운 광구가 연속 스펙트럼의 빛을 낸다는 것도 배웠어요.</div>' +
        '<p>별은 뜨거운 <b>광구</b>가 연속 스펙트럼의 빛을 내고, 그 빛이 더 <b>차가운 바깥 대기</b>를 지나며 대기 속 원소가 특정 파장을 흡수해 어두운 선이 생겨요. 별빛의 어두운 선 하나하나의 파장을 <b>원소별 기준선</b>(수소 · 헬륨 · 나트륨 · 칼슘 · 마그네슘)과 대조해서 별 대기에 있는 원소를 알아내요. (헬륨은 1868년 일식 때 태양 스펙트럼에서 지구에 알려지지 않은 노란 선 587.6 nm로 먼저 발견되어 태양의 신 Helios에서 이름이 붙었어요.)</p>',
      features: ['star'],
      setup() { S.show.selB = false; S.show.selD = false; S.sa.star = 'A'; S.sa.seenS = { A: true }; S.sa.el = {}; setScene('star'); },
      recap: '별빛은 뜨거운 광구의 연속 스펙트럼이 더 차가운 바깥 대기를 지나며 흡수선이 생긴 것이에요. 어두운 선의 파장을 원소별 기준선과 하나씩 대조하면 별 대기 속 원소를 알 수 있어요(태양: 수소 · 나트륨 · 칼슘 · 마그네슘 등).',
      summary: '<ul><li>별의 <b>뜨거운 광구</b>는 연속 스펙트럼의 빛을 내고, 더 <b>차가운 바깥 대기</b>의 원소가 같은 파장의 빛을 흡수해 어두운 선을 만들어요.</li><li>기준 파장(nm): 수소 410.2 · 434.0 · 486.1 · 656.3 / 헬륨 447.1 · 501.6 · 587.6 · 667.8 / 나트륨 589.0 · 589.6 / 칼슘 393.4 · 396.8 / 마그네슘 517.3 · 518.4.</li><li>별 A: 656.3 · 486.1 · 434.0 → 수소. 별 B: 589.0/589.6 · 393.4 · 396.8 → 나트륨 · 칼슘. 별 C: 587.6 · 667.8 + 수소선 → 헬륨 · 수소.</li><li>태양의 대표 흡수선: 수소 656.3 · 486.1, 나트륨 589.0 · 589.6, 칼슘 393.4 · 396.8, 마그네슘 517.3.</li></ul>',
      missions: [
        {
          title: '별 A · B · C의 원소 판별',
          goal: '별 A · B · C의 흡수선 파장을 기준선과 대조해 각 별의 원소를 알아내세요.',
          hint: '“원소의 기준선 겹치기” 버튼으로 수소 · 헬륨 · 나트륨 · 칼슘을 겹쳐 보면 별의 어두운 선과 기준선이 같은 자리에 있는지 눈으로 확인돼요. 별은 위쪽 버튼으로 바꿔요.',
          setup() { S.show.selB = true; S.show.selD = false; SEL_B.reset(); S.sa.seenS = { [S.sa.star]: true }; setScene('star'); },
          check: () => SEL_B.right() === 3,
          hold: 0.4,
          status: () => '맞은 별 ' + SEL_B.right() + ' / 3 &nbsp; · 고른 별 ' + SEL_B.count() + ' / 3',
          explain: '<b>별 A</b>의 656.3 · 486.1 · 434.0 nm는 수소 기준선과 같아서 수소예요. <b>별 B</b>의 589.0/589.6 nm는 나트륨, 393.4 · 396.8 nm는 칼슘이에요. <b>별 C</b>는 587.6 · 667.8 nm가 헬륨선이고 656.3 · 486.1 nm는 수소선이라 헬륨과 수소가 함께 있어요.',
        },
        {
          title: '태양의 흡수선 대조 기록하기', manual: true,
          goal: '<b>태양</b> 스펙트럼의 어두운 선 4묶음이 각각 어떤 원소의 선인지 기준선과 대조해 고르세요.',
          hint: '위에서 “태양”을 고른 뒤 원소 기준선을 겹쳐 보세요. 589.0/589.6 nm는 아주 가까운 두 줄이에요.',
          setup() { S.show.selB = false; S.show.selD = true; SEL_D.reset(); S.sa.star = 'S'; stSeg.set('S'); S.sa.seenS = { S: true }; setScene('star'); },
          check: () => SEL_D.grade(),
          status: () => '고른 묶음 ' + SEL_D.count() + ' / 4',
          explain: '태양의 흡수선: <b>656.3 · 486.1 nm = 수소</b>, <b>589.0/589.6 nm = 나트륨</b>, <b>393.4/396.8 nm = 칼슘</b>, <b>517.3/518.4 nm = 마그네슘</b>이에요. 이처럼 선을 하나하나 기준 파장표와 대조해서 별에 있는 원소를 알아내요.',
        },
        {
          type: 'quiz', title: '어두운 선은 별의 어느 층에서?',
          goal: '별빛의 어두운 선은 별의 어느 부분에서 만들어질까요?',
          setup() { S.show.selB = false; S.show.selD = false; setScene('star'); },
          choices: ['별의 가장 안쪽 중심핵에서', '뜨겁고 밀도가 높은 광구 자체에서', '광구 바깥의 더 차가운 기체층(대기)에서', '별빛이 지나오는 우주 공간의 먼지에서'],
          answer: 2,
          feedback: ['중심핵은 에너지를 만드는 곳이에요. 선은 별빛이 바깥 층을 지나며 생겨요.', '광구는 뜨겁고 밀해서 연속 스펙트럼의 빛을 내요. 선을 만드는 곳은 그 바깥이에요.', '', '우주 공간의 영향은 매우 작아요. 별의 선은 별 자신의 대기가 만들어요.'],
          explain: '뜨거운 광구에서 나온 연속 스펙트럼의 빛이 <b>더 차가운 바깥 대기</b>를 지나며, 대기 속 원소가 자기 선의 파장만 흡수해서 어두운 선이 생겨요. 그래서 흡수선의 파장 패턴으로 별 <b>대기</b>의 원소를 알 수 있어요.',
        },
      ],
    },
    {
      title: '원소 추리: 어려운 사례들', short: '원소 추리', icon: '🔎', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 선의 파장을 기준선과 대조해 별의 원소를 알아냈어요. 하지만 실제 별빛은 더 까다로워요. 두 가지 어려운 사례를 풀어 봐요.</div>' +
        '<p>① <b>별 D</b>: 선의 패턴은 수소와 같은데 선 전체가 약간 <b>붉은 쪽으로 이동</b>했어요. ② <b>선의 세기</b>: 선이 보이는지는 원소의 양뿐 아니라 별의 <b>표면 온도</b>(원자의 들뜸 · 이온화 상태)에도 달려 있어요. 아주 뜨거운 별(약 30,000 K)에서는 수소가 이온화되어 수소선이 약해지고 헬륨선이 강해지고, 아주 차가운 별(약 3,500 K)에서는 분자 흡수 띠가 나타나요.</p>',
      features: ['infer'],
      setup() { S.show.selI = false; S.show.selM = false; S.nf.view = 'D'; S.nf.seenD = true; S.nf.seenT = false; S.nf.hot = false; S.nf.cool = false; S.nf.T = 10000; slTm.set(100); vwSeg.set('D'); setScene('infer'); },
      recap: '선 전체가 같은 방향으로 이동한 별은 같은 원소라도 별이 움직이고 있다는 뜻이에요(붉은 쪽이면 멀어짐). 선의 세기는 원소의 양뿐 아니라 표면 온도에도 달려 있어서, 선이 약하거나 안 보인다고 그 원소가 적다고 단정하면 안 돼요. 선스펙트럼은 원자의 에너지 준위가 양자화되어 있다는 증거예요.',
      summary: '<ul><li><b>별 D</b>: 선의 패턴은 수소와 같고 656.3 nm가 657.0 nm에서 보여요. 선 전체가 같은 방향(붉은 쪽)으로 이동했으므로 새 원소가 아니라 별이 우리에게서 멀어지고 있어요(정성적).</li><li><b>고온 별</b>(약 30,000 K): 수소가 이온화되어 수소선이 약해지고 헬륨선이 강해져요. 수소가 적은 것이 아니에요.</li><li><b>저온 별</b>(약 3,500 K): 분자 흡수 띠가 나타나요.</li><li>선의 세기 ≠ 함량. 이 모형에서 수소 흡수선은 표면 온도 약 10,000 K에서 가장 강해요.</li><li>선스펙트럼은 원자의 <b>에너지 준위가 양자화</b>되어 있다는 증거이고, 이를 이용해 별의 구성 원소를 알아내요.</li></ul>',
      missions: [
        {
          title: '별 D와 높은 온도의 별 판별하기',
          goal: '<b>별 D</b>와 <b>표면 온도 25,000 K 이상</b>인 별의 스펙트럼을 살펴보고, 두 사례에 대한 문장을 골라 완성하세요.',
          hint: '“별 D” 화면에서 기준 656.3 nm와 별 D의 선 위치를 비교해요. “온도와 선의 세기”에서 슬라이더를 30,000 K 쪽으로 밀면 수소선과 헬륨선이 어떻게 달라지는지 보여요.',
          setup() { S.show.selI = true; S.show.selM = false; SEL_I.reset(); S.nf.seenD = S.nf.view === 'D'; S.nf.hot = S.nf.view === 'T' && S.nf.T >= 25000; setScene('infer'); },
          check: () => S.nf.seenD && S.nf.hot && SEL_I.right() === 2,
          hold: 0.4,
          status: () => mark(S.nf.seenD) + ' 별 D 확인 &nbsp; ' + mark(S.nf.hot) + ' 25,000 K 이상 확인 &nbsp; · 맞은 문제 ' + SEL_I.right() + ' / 2',
          explain: '<b>별 D</b>는 선 패턴이 수소와 같고 선 전체가 붉은 쪽으로 이동했어요. 수소이며 별이 우리에게서 멀어지고 있다는 뜻이에요(정성적). <b>고온 별</b>에서는 수소가 이온화되어 수소선이 약해지고 헬륨선이 강해져요. 수소가 적어서가 아니라 온도 때문이에요.',
        },
        {
          title: '선의 세기와 함량의 관계', manual: true,
          goal: '“온도와 선의 세기” 화면에서 슬라이더를 움직여 보고, 선의 세기와 원소의 양에 대한 문장 2개를 완성하세요.',
          hint: '수소의 양은 모든 온도에서 같다고 가정한 모형이에요. 그래도 수소선의 세기는 온도에 따라 크게 달라져요. 가장 강한 곳은 오른쪽 그래프에서 볼 수 있어요.',
          setup() { S.show.selI = false; S.show.selM = true; SEL_M.reset(); S.nf.view = 'T'; S.nf.seenT = true; vwSeg.set('T'); updateCtl(); setScene('infer'); },
          check() { if (!S.nf.seenT) return '“온도와 선의 세기” 화면을 열어 슬라이더를 움직여 보세요.'; return SEL_M.grade(); },
          status: () => mark(S.nf.seenT) + ' 온도 슬라이더 확인 &nbsp; · 고른 문장 ' + SEL_M.count() + ' / 2',
          explain: '이 모형에서 수소의 양은 같지만 수소 흡수선은 표면 온도 약 <b>10,000 K</b>에서 가장 강하고, 온도가 더 낮거나 높으면 약해져요. 그러므로 <b>선의 세기만으로 함량을 단정하면 안 돼요.</b> 선의 세기는 원소의 양과 별의 표면 온도(들뜸 · 이온화 상태)에 함께 달려 있어요.',
        },
        {
          type: 'quiz', title: '수소선이 안 보이면 수소가 없을까?',
          goal: '어떤 별의 스펙트럼에서 수소선이 거의 보이지 않아요. 그 별에 수소가 없다고 결론 내려도 될까요?',
          setup() { S.show.selI = false; S.show.selM = false; setScene('infer'); },
          choices: ['그렇다. 수소선이 없으면 수소가 없다는 뜻이다', '아니다. 표면 온도가 아주 높거나 낮으면 수소가 있어도 수소선이 약해질 수 있다', '그렇다. 별은 항상 수소선이 가장 강하게 나타난다', '아니다. 수소선이 안 보이는 것은 별이 멀어지고 있다는 뜻이다'],
          answer: 1,
          feedback: ['선이 약한 것이 곧 원소가 없다는 뜻은 아니에요. 온도에 따라 수소의 들뜸 · 이온화 상태가 달라져요.', '', '별의 온도에 따라 수소선의 세기는 크게 달라요.', '선이 모두 같은 방향으로 이동하는 것이 별의 운동을 알려 줘요. 선이 약한 것과는 달라요.'],
          explain: '아주 뜨거운 별에서는 수소가 <b>이온화</b>되어 수소선이 약해지고, 아주 차가운 별에서는 분자 띠가 나타나요. 그래서 선이 약하거나 안 보여도 그 원소가 없다고 단정할 수 없어요. 선의 세기는 함량과 표면 온도에 함께 달려 있어요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hq-star-spectrum', mount: '#game', badge: '별빛 해독가', homeHref: '../../index.html#hq',
    featureLabels: { level: '📏 눈금자 · 에너지 준위 그림', ea: '🔦 광원 · 프리즘 · 스펙트럼', star: '⭐ 별 스펙트럼 · 원소 기준선', infer: '🔎 별 D · 온도와 선의 세기' },
    onFeatures() { updateCtl(); },
    onMissionStart() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  setScene('level');
  updateCtl();
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t; S.dt = dt;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    view.apply();
    stepLevel(dt); stepEa(dt);
    ctx.clearRect(0, 0, VW, VH);
    if (S.mode === 'level') drawLevel(); else if (S.mode === 'ea') drawEa(); else if (S.mode === 'star') drawStar(); else drawInfer();
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, MA, SEL_B, SEL_D, SEL_I, SEL_M, NUM_A, XL, XE, STAR, REF, slW, slTm, setScene, updateCtl, setCur, nearLine, levelsOK, predOK, lvDiag, tokRect, eaBar, saBars, lvBar, sH, sHe, sMol,
    get game() { return game; },
  };

})();
