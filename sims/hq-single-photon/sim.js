/* =========================================================
   전자기와 양자 Ⅲ. 양자와 미시세계 - 한 알씩 이중 슬릿 (단원 1차시)
   성취기준 [12전자03-01] 단일 양자 수준의 이중 슬릿 실험을 통해서 입자-파동 이중성을 확인하고, 단일 양자의 분포에 대한
   실험 결과를 확률 파동의 간섭을 토대로 해석할 수 있다.
   ① 실험: 한 알씩 (스크린에 점 하나로 도착, 위치는 예측 불가, 총알 모형과 비교)
   ② 실험: 무늬 쌓기 (10 → 10000개, 도착 확률 = 간섭무늬, 가속 전압과 파장, 한 틈만 열기)
   ③ 탐구: 어느 틈? (틈 검출기 on/off, 확률의 합 vs 진폭의 합의 제곱, 광자 버전)
   ④ 적용: 드브로이 파장 (λ = h/p, 전자·중성자·C60·야구공)
   파동 함수 식, 슈뢰딩거 방정식, 보른 규칙의 적분, 무늬 간격 공식의 반복 계산은 다루지 않아요.
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
  const H_P = 6.626e-34, M_E = 9.109e-31, Q_E = 1.602e-19;

  /* ---------- 장치 배치 (u: 전자가 가는 방향, v: 옆으로 벗어난 위치. 가로 화면은 u→오른쪽, 세로 화면은 u→아래쪽) ---------- */
  const MA = PHONE ? { x: 8, y: 8, w: 464, h: 520 } : { x: 12, y: 12, w: 776, h: 414 };
  const BOT = PHONE ? { x: 8, y: 536, w: 464, h: 136 } : { x: 12, y: 436, w: 776, h: 112 };
  const VR = 190;                    // 스크린의 반 길이(칸)
  const SLV = 50, SLW = 30;          // 틈 A(−50), 틈 B(+50)의 위치와 틈 하나의 폭
  const LL = 240;                    // 이중 슬릿 ~ 스크린 거리
  const GE = PHONE ? { ug: 48, ub: 92, fv0: 348, fvL: 60, h0: 420, hL: 80 } : { ug: 84, ub: 196, fv0: 456, fvL: 106, h0: 584, hL: 176 };
  GE.us = GE.ub + LL;
  const OR = PHONE ? { x: MA.x + MA.w / 2, y: MA.y + 6 } : { x: MA.x, y: MA.y + 222 };
  const pt = PHONE ? (u, v) => ({ x: OR.x + v, y: OR.y + u }) : (u, v) => ({ x: OR.x + u, y: OR.y + v });
  const toUV = (p) => (PHONE ? { u: p.y - OR.y, v: p.x - OR.x } : { u: p.x - OR.x, v: p.y - OR.y });
  function UV(fn) {
    ctx.save();
    if (PHONE) ctx.transform(0, 1, 1, 0, OR.x, OR.y); else ctx.translate(OR.x, OR.y);
    fn(); ctx.restore();
  }
  const NB = 127, BW = 2 * VR / NB;  // 히스토그램 칸 수와 폭
  const binOf = (v) => clamp(Math.floor((v + VR) / BW), 0, NB - 1);

  /* ---------- 물리 모형 (화면의 모든 숫자와 같은 값) ---------- */
  const lamNm = (V) => H_P / Math.sqrt(2 * M_E * Q_E * V) * 1e9;       // 전자의 드브로이 파장(nm) = h / p, p = √(2meV)
  const lamTxt = (nm) => (nm >= 0.1 ? nm.toFixed(2) : nm.toFixed(3)) + ' nm';
  const PH_NM = 633;                                                    // 광자 버전: 붉은 레이저의 파장
  const lamVis = (cfg) => (cfg.kind === 'ph' ? 8.8 : 72 * lamNm(cfg.V));   // 화면 규모에서의 파장(칸)
  const openSlits = (cfg) => (cfg.slits === 'A' ? [-SLV] : [-SLV, SLV]);
  function ampAt(sv, u, v, lam) {               // 틈 하나가 (u, v)에 만드는 확률 파동의 진폭(틈 폭에 의한 퍼짐)
    const dy = v - sv, r = Math.hypot(u, dy);
    if (r < 1) return 1;
    const x = Math.PI * SLW * (dy / r) / lam;
    return Math.abs(x) < 1e-6 ? 1 : Math.sin(x) / x;
  }
  // 진폭을 더한 뒤 제곱(interf = true) 또는 틈마다 제곱한 값을 더함(확률의 합)
  function fieldI(u, v, cfg, lam, interf) {
    const k = TAU / lam; let re = 0, im = 0, sm = 0;
    for (const sv of openSlits(cfg)) {
      const r = Math.hypot(u, v - sv), a = ampAt(sv, u, v, lam);
      re += a * Math.cos(k * r); im += a * Math.sin(k * r); sm += a * a;
    }
    return interf ? re * re + im * im : sm;
  }
  const cfgKey = (c) => [c.kind, c.kind === 'e' ? c.V : 0, c.slits, c.det ? 1 : 0].join('|');
  const effCfg = (c) => ({ kind: c.kind, V: c.V, slits: c.slits, det: c.det && c.slits === 'both' });
  const distCache = {};
  const PSTEP = 0.5, NP = Math.round(2 * VR / PSTEP) + 1;
  function mkCdf(pdf) {
    let s = 0; for (let i = 0; i < pdf.length; i++) s += pdf[i];
    const cdf = new Float64Array(pdf.length); let a = 0;
    for (let i = 0; i < pdf.length; i++) { a += pdf[i] / s; cdf[i] = a; }
    cdf[cdf.length - 1] = 1; return { cdf, sum: s };
  }
  function distFor(c0) {
    const cfg = effCfg(c0), key = cfgKey(cfg);
    if (distCache[key]) return distCache[key];
    const lam = lamVis(cfg);
    const interf = !cfg.det;
    const pdf = new Float64Array(NP), pA = new Float64Array(NP), pB = new Float64Array(NP);
    let mx = 0;
    for (let i = 0; i < NP; i++) {
      const v = -VR + i * PSTEP;
      pdf[i] = fieldI(LL, v, cfg, lam, interf); mx = Math.max(mx, pdf[i]);
      if (cfg.det) { pA[i] = ampAt(-SLV, LL, v, lam) ** 2; pB[i] = ampAt(SLV, LL, v, lam) ** 2; }
    }
    const d = { key, cfg, lam, maxI: mx, interf };
    if (cfg.det) {
      const a = mkCdf(pA), b = mkCdf(pB);
      d.cdfA = a.cdf; d.cdfB = b.cdf;
      for (let i = 0; i < NP; i++) pdf[i] = (pA[i] / a.sum + pB[i] / b.sum) / 2;    // 두 틈을 반반씩 지난 전자들의 분포
      const m = mkCdf(pdf); d.cdf = m.cdf; d.pdf = pdf;
    } else { const m = mkCdf(pdf); d.cdf = m.cdf; d.pdf = pdf; }
    // 히스토그램 칸마다 도착 확률
    let tot = 0; for (let i = 0; i < NP; i++) tot += d.pdf[i];
    d.binP = new Float64Array(NB);
    for (let i = 0; i < NP; i++) d.binP[binOf(-VR + i * PSTEP)] += d.pdf[i] / tot;
    d.binMax = Math.max.apply(null, Array.from(d.binP));
    distCache[key] = d; return d;
  }
  function sampleCdf(cdf) {
    const r = Math.random(); let lo = 0, hi = cdf.length - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (cdf[m] < r) lo = m + 1; else hi = m; }
    return clamp(-VR + lo * PSTEP - Math.random() * PSTEP, -VR, VR);
  }
  // 확률 파동 그림(슬릿 뒤 공간의 도착 확률 분포) - 스크린에서의 값과 같은 식
  const fieldCv = document.createElement('canvas'); fieldCv.width = LL; fieldCv.height = 2 * VR;
  const fctx = fieldCv.getContext('2d');
  let fieldKey = '';
  function buildField(cfg) {
    const d = distFor(cfg), key = d.key;
    if (fieldKey === key) return;
    fieldKey = key;
    const img = fctx.createImageData(LL, 2 * VR), px = img.data, c = d.cfg, lam = d.lam;
    const rgb = c.kind === 'ph' ? [255, 110, 80] : [96, 170, 255];
    for (let iv = 0; iv < 2 * VR; iv++) {
      const v = -VR + iv + 0.5;
      for (let iu = 0; iu < LL; iu++) {
        const u = iu + 0.5, I = fieldI(u, v, c, lam, d.interf);
        const val = Math.min(1, I / d.maxI), fade = Math.min(1, u / 36);
        const o = (iv * LL + iu) * 4;
        px[o] = rgb[0]; px[o + 1] = rgb[1]; px[o + 2] = rgb[2]; px[o + 3] = Math.round(Math.pow(val, 0.8) * fade * 235);
      }
    }
    fctx.putImageData(img, 0, 0);
  }

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'shoot', t: 0, fade: 0,
    cfg: { kind: 'e', V: 50, slits: 'both', det: false },
    data: null, queue: 0, acc: 0, fly: [], flash: [],
    show: { bullet: false, wave: false, cmp: false, selA: false, selP: false, selW: false, dblIn: false, dblPick: false },
    waveA: 0, hShown: 10,
    pred: null, predLog: [], predNote: null,
    mx: { detOn: 0, detOff: 0, single: 0, photon: 0, v500: 0, v100: 0, v50: 0 },
    seen: { wave: false, cmp: false, f2: false },
    d: { sel: 'e', f: { e: 1, n: 1, c: 1, b: 1 }, pick: {}, revealed: false, seen: {} },
  };
  let game = null;
  let predDrag = false;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const MODE_LABEL = { shoot: '🎯 한 알씩', pattern: '📊 무늬 쌓기', which: '🔍 어느 틈?', dbl: '📐 드브로이 파장' };
  const kindName = () => (S.cfg.kind === 'ph' ? '광자' : '전자');
  const cur = () => effCfg(S.cfg);

  function newData() {
    const cv = document.createElement('canvas'); cv.width = GE.fvL * 2; cv.height = VR * 4;
    return { N: 0, bins: new Uint32Array(NB), slit: { A: 0, B: 0 }, cv, c: cv.getContext('2d'), last: [], maxBin: 0 };
  }
  function resetData() {
    S.queue = 0; S.acc = 0; S.rate = 0; S.fly = []; S.flash = []; parts.clear(); S.data = newData(); S.predNote = null;
  }
  function setCfg(patch) {
    const before = cfgKey(effCfg(S.cfg)) + '|' + S.cfg.det;
    Object.assign(S.cfg, patch);
    if (S.cfg.slits !== 'both') S.cfg.det = false;
    if (before !== cfgKey(effCfg(S.cfg)) + '|' + S.cfg.det) resetData();
    updateCtl();
  }
  function normalizeFor(mode) {
    if (mode === 'shoot') setCfg({ kind: 'e', slits: 'both', det: false });
    else if (mode === 'pattern') setCfg({ kind: 'e', det: false });
    else if (mode === 'which') setCfg({ slits: 'both', V: 100 });
  }
  function setScene(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); S.fly = []; S.queue = 0; S.acc = 0; S.rate = 0; predDrag = false; }
    S.mode = mode;
    if (mode !== 'dbl') normalizeFor(mode);
    $('#tbLabel').textContent = MODE_LABEL[mode];
    updateCtl();
  }
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      const dm = n.getAttribute('data-match');
      if (on && dm) on = !!S.show[dm] || (!!game && game.free && (dm === 'selA' || dm === 'selP' || dm === 'selW' || dm === 'dblPick'));
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    vSeg.set(S.cfg.V); slSeg.set(S.cfg.slits); kSeg.set(S.cfg.kind); fSeg.set(String(S.d.f[S.d.sel]));
    const tg = (id, on, txt) => { const b = $('#' + id); b.classList.toggle('on', !!on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); if (txt) b.textContent = txt; };
    tg('bBullet', S.show.bullet); tg('bWave', S.show.wave); tg('bCmp', S.show.cmp);
    tg('bDet', S.cfg.det, S.cfg.det ? '👁️ 틈 검출기 끄기 (지금: 켜짐)' : '👁️ 틈 검출기 켜기 (지금: 꺼짐)');
    $('#hShoot').textContent = '⚡ ' + kindName() + ' 쏘기';
    $$('#addChips button').forEach((b) => { b.textContent = '+' + (+b.dataset.n >= 1000 ? (+b.dataset.n).toLocaleString('ko-KR') : b.dataset.n); });
    $$('#pickChips button').forEach((b) => b.classList.toggle('on', !!S.d.pick[b.dataset.p]));
    $$('#modeSeg button').forEach((b) => { b.disabled = false; });
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));

  /* ---------- 컨트롤 ---------- */
  const vSeg = bindSeg('vSeg', (v) => { setCfg({ V: +v }); });
  const slSeg = bindSeg('slSeg', (v) => { setCfg({ slits: v }); });
  const kSeg = bindSeg('kSeg', (v) => { setCfg({ kind: v }); });
  const fSeg = bindSeg('fSeg', (v) => { S.d.f[S.d.sel] = +v; if (+v === 2 && S.d.sel === 'e') S.seen.f2 = true; updateCtl(); });
  const fire = (n) => { S.queue += n; S.rate = Math.max(S.rate || 0, n <= 12 ? 2.4 : Math.min(9000, n / (n > 2000 ? 3 : 2))); };
  $('#bS1').addEventListener('click', () => { Sound.click(); fire(1); });
  $('#bS10').addEventListener('click', () => { Sound.click(); fire(10); });
  $$('#addChips button').forEach((b) => b.addEventListener('click', () => { Sound.click(); fire(+b.dataset.n); }));
  $('#bClear').addEventListener('click', () => { Sound.click(); resetData(); showHint('스크린을 깨끗이 지웠어요.', 1800); });
  $('#bBullet').addEventListener('click', () => { Sound.click(); S.show.bullet = !S.show.bullet; updateCtl(); });
  $('#bWave').addEventListener('click', () => { Sound.click(); S.show.wave = !S.show.wave; if (S.show.wave) S.seen.wave = true; updateCtl(); });
  $('#bCmp').addEventListener('click', () => { Sound.click(); S.show.cmp = !S.show.cmp; if (S.show.cmp) S.seen.cmp = true; updateCtl(); });
  $('#bDet').addEventListener('click', () => { Sound.click(); setCfg({ det: !S.cfg.det }); });
  $$('#pickChips button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.d.pick[b.dataset.p] = !S.d.pick[b.dataset.p]; updateCtl(); }));

  const SEL_A = mkSelRows('selA', [
    { q: '여러 번 쏘아 보니, 점이 찍히는 위치는', opts: ['매번 달라서 미리 알 수 없어요', '언제나 같아서 미리 알 수 있어요'], ans: 0 },
    { q: '전자 한 개가 스크린에 도착한 모습은', opts: ['무늬 모양으로 퍼진 파동 덩어리', '작은 점 하나'], ans: 1 },
  ]);
  const SEL_P = mkSelRows('selP', [
    { q: '줄무늬에서 어두운 곳은', opts: ['전자가 도착할 확률이 아주 작은 곳', '전자가 도착했지만 보이지 않는 곳', '전자가 한꺼번에 모여 있는 곳'], ans: 0 },
    { q: '줄무늬에서 밝은 곳은', opts: ['전자가 도착할 확률이 큰 곳', '전자가 서로 부딪쳐 튕겨 나온 곳', '전자가 도착하지 않는 곳'], ans: 0 },
    { q: '가속 전압을 높이면(파장이 짧아지면) 줄무늬 간격은', opts: ['좁아져요', '넓어져요', '변하지 않아요'], ans: 0 },
    { q: '틈을 한 개만 열면 스크린에는', opts: ['줄무늬 없이 한 덩어리로 퍼져요', '더 선명한 줄무늬가 생겨요', '전자가 도착하지 않아요'], ans: 0 },
  ]);
  const SEL_W = mkSelRows('selW', [
    { q: '틈 검출기를 끄고 많이 쏘면 스크린에는', opts: ['간섭 줄무늬', '두 덩어리'], ans: 0 },
    { q: '틈 검출기를 켜고 많이 쏘면 스크린에는', opts: ['간섭 줄무늬', '두 덩어리'], ans: 1 },
    { q: '두 덩어리가 되는 계산은', opts: ['틈마다의 확률을 더해요', '두 틈의 파동 진폭을 더한 뒤 제곱해요'], ans: 0 },
    { q: '줄무늬가 되는 계산은', opts: ['틈마다의 확률을 더해요', '두 틈의 파동 진폭을 더한 뒤 제곱해요'], ans: 1 },
    { q: '광자(레이저)를 한 개씩 쏘아도 결과는', opts: ['전자와 같은 방식으로 나타나요', '광자는 입자가 아니라서 달라요'], ans: 0 },
  ]);
  const SEL_D = mkSelRows('selD', [
    { q: '이 전자의 속력을 2배로 하면 드브로이 파장은', opts: ['2배가 돼요', '변하지 않아요', '1/2배가 돼요'], ans: 2 },
  ]);

  /* ---------- 입자 (전자 · 중성자 · C60 · 야구공) ---------- */
  const PD = 1e-7;                 // 모형 이중 슬릿 간격 d = 100 nm
  const PTH = 1e-6;                // 무늬를 볼 수 있는 한계: λ / d 가 10⁻⁶ 이상
  const PART = [
    { id: 'e', name: '전자', sub: '50 V로 가속', m: M_E, v0: Math.sqrt(2 * Q_E * 50 / M_E), col: '#7fe3ff' },
    { id: 'n', name: '중성자', sub: '열중성자', m: 1.675e-27, v0: 2200, col: '#c4b5fd' },
    { id: 'c', name: 'C₆₀ 분자', sub: '탄소 60개', m: 1.2e-24, v0: 200, col: '#fbbf24' },
    { id: 'b', name: '야구공', sub: '투수의 공', m: 0.145, v0: 40, col: '#fb7185' },
  ];
  const pv = (p) => p.v0 * S.d.f[p.id];
  const pMom = (p) => p.m * pv(p);
  const pLam = (p) => H_P / pMom(p);
  const pRatio = (p) => pLam(p) / PD;
  const pCan = (p) => pRatio(p) >= PTH;
  const fmtLam = (l) => (l >= 1e-11 ? lamTxt(l * 1e9) : l >= 1e-13 ? (l * 1e12).toFixed(1) + ' pm' : sci(l, 1) + ' m');
  const fmtV = (v) => (v >= 1e5 ? sci(v, 1) + ' m/s' : Math.round(v).toLocaleString('ko-KR') + ' m/s');
  const pickOK = () => PART.every((p) => !!S.d.pick[p.id] === pCan(p));

  /* ---------- 전자(또는 광자) 한 개씩 쏘기 ---------- */
  const T1 = 0.55, T2 = 0.75;          // 전자총 → 틈, 틈 → 스크린 걸리는 시간(초)
  function landNow(v, slit) {          // 스크린에 한 점으로 도착
    const D0 = S.data, c = D0.c, ph = S.cfg.kind === 'ph';
    D0.N++; const bi = binOf(v); D0.bins[bi]++; D0.maxBin = Math.max(D0.maxBin, D0.bins[bi]);
    if (slit) D0.slit[slit]++;
    D0.last.push(v); if (D0.last.length > 10) D0.last.shift();
    const x = rnd(3, GE.fvL - 3) * 2, y = (v + VR) * 2;
    c.save(); c.globalCompositeOperation = 'lighter';
    if (D0.N <= 300) { c.fillStyle = ph ? 'rgba(255,120,90,.85)' : 'rgba(90,255,170,.85)'; c.beginPath(); c.arc(x, y, D0.N <= 60 ? 4.4 : 3, 0, TAU); c.fill(); }
    else { c.fillStyle = ph ? 'rgba(255,120,90,.5)' : 'rgba(90,255,170,.5)'; c.fillRect(x - 1.3, y - 1.3, 2.6, 2.6); }
    c.restore();
    // 기록(미션용): 설정별 가장 많이 쌓은 개수
    const cf = cur(), n = D0.N, M = S.mx;
    if (cf.kind === 'ph') M.photon = Math.max(M.photon, n);
    else if (cf.slits === 'A') M.single = Math.max(M.single, n);
    else if (cf.det) M.detOn = Math.max(M.detOn, n);
    else { M.detOff = Math.max(M.detOff, n); if (cf.V === 500) M.v500 = Math.max(M.v500, n); if (cf.V === 100) M.v100 = Math.max(M.v100, n); if (cf.V === 50) M.v50 = Math.max(M.v50, n); }
    S.flash.push({ v, t: 0, ph });
    if (S.flash.length > 30) S.flash.shift();
    if (S.pred) {                      // 예측 비교
      const err = Math.abs(S.pred.v - v);
      S.predLog.push({ pred: S.pred.v, v, err, near: err <= 12 });
      S.predNote = { pred: S.pred.v, v, err, t: 0 };
      S.pred = null;
    }
    return bi;
  }
  function pickOne(cf) {
    const d = distFor(cf);
    if (cf.det) { const s = Math.random() < 0.5 ? 'A' : 'B'; return { v: sampleCdf(s === 'A' ? d.cdfA : d.cdfB), slit: s }; }
    return { v: sampleCdf(d.cdf), slit: null };
  }
  function stepShots(dt) {
    const cf = cur();
    if (S.queue > 0) {
      const rate = S.rate || 2.4;
      S.acc += rate * dt;
      let k = Math.min(Math.floor(S.acc), S.queue); S.acc -= Math.floor(S.acc);
      S.queue -= k; if (S.queue <= 0) { S.queue = 0; S.rate = 0; }
      for (let i = 0; i < k; i++) {
        const s = pickOne(cf);
        if (rate <= 16 && S.fly.length < 24) {
          S.fly.push({ t: 0, v: s.v, slit: s.slit, cf, ph: cf.kind === 'ph', det: false });
        } else {
          if (s.slit) S.data.slit[s.slit]++;
          const sl = s.slit; landNow(s.v, null); if (sl) { /* 검출 횟수는 위에서 이미 셈 */ }
          if (i === 0 && !RM) parts.emit({ x: pt(GE.us + 6, s.v).x, y: pt(GE.us + 6, s.v).y, vx: 0, vy: 0, life: 0.35, size: 6, color: cf.kind === 'ph' ? '#ff9a80' : '#8fffc4', shape: 'circle' });
        }
      }
    }
    // 날아가는 중인 전자
    for (let i = S.fly.length - 1; i >= 0; i--) {
      const f = S.fly[i], t0 = f.t; f.t += dt;
      if (f.slit && t0 < T1 && f.t >= T1) {          // 틈 검출기가 어느 틈인지 기록
        S.data.slit[f.slit]++; S.flash.push({ slitDet: f.slit, t: 0 });
        if (!RM) { const p = pt(GE.ub, f.slit === 'A' ? -SLV : SLV); parts.emit({ x: p.x, y: p.y, vx: 0, vy: 0, life: 0.4, size: 9, color: '#ffd166', shape: 'circle' }); }
      }
      if (f.t >= T1 + T2) { landNow(f.v, null); S.fly.splice(i, 1); }
    }
    S.flash.forEach((fl) => { fl.t += dt; });
    S.flash = S.flash.filter((fl) => fl.t < (fl.slitDet ? 0.7 : 0.8));
    if (S.predNote) { S.predNote.t += dt; if (S.predNote.t > 4) S.predNote = null; }
  }

  /* ---------- 그리기 ---------- */
  const LIGHT = '#dbe4ff', DIM = '#8e9bc9';
  function darkPanel(r) {
    D.shadow(() => {
      D.roundRect(r.x, r.y, r.w, r.h, 16);
      const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h); g.addColorStop(0, '#182046'); g.addColorStop(1, '#0d1330');
      ctx.fillStyle = g; ctx.fill();
    }, { blur: 10, y: 3 });
  }
  function tip(text, u, v, o) { const p = pt(u, v); return D.label(p.x, p.y, text, Object.assign({ size: 13, bg: 'rgba(255,255,255,.14)', color: LIGHT, pad: 7 }, o)); }
  function drawGun(ph) {
    UV(() => {
      const u1 = GE.ug, u0 = GE.ug - (PHONE ? 34 : 58);
      const g = ctx.createLinearGradient(0, -20, 0, 20);
      if (ph) { g.addColorStop(0, '#ff9b8a'); g.addColorStop(1, '#9c2c2c'); } else { g.addColorStop(0, '#9fb0d8'); g.addColorStop(1, '#46517a'); }
      D.roundRect(u0, -20, u1 - u0, 40, 9); ctx.fillStyle = g; ctx.fill();
      ctx.fillStyle = '#2a3157'; ctx.fillRect(u1 - 2, -7, 12, 14);
      ctx.fillStyle = ph ? '#ffd0c4' : '#bfefff'; ctx.fillRect(u0 + 8, -4, 8, 8);
      if (ph) { ctx.fillStyle = 'rgba(160,170,200,.55)'; ctx.fillRect(u1 + 14, -24, 5, 48); ctx.fillRect(u1 + 24, -24, 5, 48); }
    });
    const lab = ph ? '레이저 + 감쇠 필터' : '전자총';
    if (PHONE) tip(lab, GE.ug - 18, 82); else tip(lab, GE.ug - (ph ? 2 : 22), -50);
  }
  function drawWall(cf) {
    UV(() => {
      const g = ctx.createLinearGradient(GE.ub - 6, 0, GE.ub + 6, 0); g.addColorStop(0, '#d5dcf2'); g.addColorStop(1, '#7a86ad');
      ctx.fillStyle = g; ctx.beginPath(); ctx.rect(GE.ub - 6, -VR, 12, 2 * VR);
      openSlits(cf).forEach((sv) => ctx.rect(GE.ub - 7, sv - SLW / 2, 14, SLW));
      ctx.fill('evenodd');
      if (cf.slits === 'A') {            // 닫힌 틈 B
        ctx.fillStyle = '#e2464b'; ctx.fillRect(GE.ub - 7, SLV - SLW / 2, 14, SLW);
      }
    });
    const side = PHONE ? 1 : -1;
    [['A', -SLV], ['B', SLV]].forEach(([nm, sv]) => {
      const p = pt(GE.ub, sv);
      const closed = nm === 'B' && cf.slits === 'A';
      D.label(p.x + (PHONE ? 0 : -22), p.y + (PHONE ? -22 : 0), closed ? '틈 B 닫힘' : '틈 ' + nm, { size: 13, bg: closed ? 'rgba(226,70,75,.85)' : 'rgba(255,255,255,.16)', color: closed ? '#fff' : LIGHT, pad: 6 });
    });
    const tp = pt(GE.ub, PHONE ? -VR - 8 : -VR - 14);
    if (PHONE) { const q = pt(GE.ub + 26, 140); D.label(q.x, q.y, '이중 슬릿', { size: 13, bg: 'rgba(255,255,255,.14)', color: LIGHT, pad: 7 }); }
    else D.label(tp.x, tp.y, '이중 슬릿', { size: 13, bg: 'rgba(255,255,255,.14)', color: LIGHT, pad: 7 });
    if (!PHONE) { const gp = pt(GE.us + 6, -VR - 14); D.label(gp.x - 22, gp.y, '스크린(옆모습)', { size: 13, bg: 'rgba(255,255,255,.14)', color: LIGHT, pad: 7 }); }
    else { const gp = pt(GE.us - 18, 132); D.label(gp.x, gp.y, '스크린(옆모습)', { size: 13, bg: 'rgba(255,255,255,.14)', color: LIGHT, pad: 7 }); }
  }
  function drawScreenStrip(ph) {
    UV(() => {
      const g = ctx.createLinearGradient(GE.us, 0, GE.us + 12, 0);
      g.addColorStop(0, ph ? '#7a2a22' : '#1f7a55'); g.addColorStop(1, ph ? '#3a1210' : '#0b3a2a');
      ctx.fillStyle = g; ctx.fillRect(GE.us, -VR, 12, 2 * VR);
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.2; ctx.strokeRect(GE.us, -VR, 12, 2 * VR);
    });
  }
  function drawFlights() {
    S.fly.forEach((f) => {
      const cf = f.cf, ph = f.ph, col = ph ? '#ff8a6a' : '#7fe3ff';
      const sv = f.slit === 'A' ? -SLV : f.slit === 'B' ? SLV : null;
      const open = openSlits(cf);
      if (f.t < T1) {
        const p = SciSim.ease.inOutSine(f.t / T1), u = GE.ug + 10 + (GE.ub - GE.ug - 10) * p;
        UV(() => {
          if (sv != null || open.length === 1) {                 // 한 틈으로 가는 길이 정해진 경우
            const tv = sv != null ? sv : open[0];
            D.glow(u, tv * p, 14, col, 0.5); D.sphere(u, tv * p, 4.5, ph ? '#ff6a4a' : '#43b7ff', { gloss: false });
          } else {                                                // 두 틈: 몸이 둘로 나뉜 것처럼
            const sp = clamp((p - 0.55) / 0.45, 0, 1), ea = 1 - sp * 0.5;
            ctx.save(); ctx.globalAlpha = ea;
            D.glow(u, SLV * sp, 14, col, 0.5); D.sphere(u, SLV * sp, 4.5, ph ? '#ff6a4a' : '#43b7ff', { gloss: false });
            if (sp > 0) { D.glow(u, -SLV * sp, 14, col, 0.5); D.sphere(u, -SLV * sp, 4.5, ph ? '#ff6a4a' : '#43b7ff', { gloss: false }); }
            ctx.restore();
          }
        });
      } else {
        const q = clamp((f.t - T1) / T2, 0, 1);
        UV(() => {
          ctx.save(); ctx.beginPath(); ctx.rect(GE.ub, -VR, LL, 2 * VR); ctx.clip();
          ctx.strokeStyle = col; ctx.lineCap = 'round';
          (sv != null ? [sv] : open).forEach((s0) => {
            const rT = Math.hypot(LL, f.v - s0), R = rT * SciSim.ease.outQuad(q);
            ctx.globalAlpha = 0.55 * (1 - 0.7 * q); ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(GE.ub, s0, R, -Math.PI / 2, Math.PI / 2); ctx.stroke();
            ctx.globalAlpha = 0.25 * (1 - q); ctx.lineWidth = 7;
            ctx.beginPath(); ctx.arc(GE.ub, s0, Math.max(0, R - 9), -Math.PI / 2, Math.PI / 2); ctx.stroke();
          });
          ctx.restore();
        });
      }
    });
  }
  function drawFlashes() {
    S.flash.forEach((fl) => {
      if (fl.slitDet) {
        const p = pt(GE.ub, fl.slitDet === 'A' ? -SLV : SLV), k = 1 - fl.t / 0.7;
        const q = pt(GE.ub + 18, (fl.slitDet === 'A' ? -SLV - 30 : SLV + 30)); D.label(q.x, q.y, '감지!', { size: 13, bg: 'rgba(255,209,102,' + (0.9 * k) + ')', color: '#3a2a00', pad: 6 });
        return;
      }
      const p = pt(GE.us + 6, fl.v), k = 1 - fl.t / 0.8;
      D.glow(p.x, p.y, 16 * (1.4 - k * 0.6), fl.ph ? '#ff9a80' : '#8fffc4', 0.85 * k);
    });
  }
  function drawFV(cf) {
    const D0 = S.data, ph = cf.kind === 'ph';
    UV(() => {
      ctx.fillStyle = '#04070f'; D.roundRect(GE.fv0 - 2, -VR - 2, GE.fvL + 4, 2 * VR + 4, 5); ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.rect(GE.fv0, -VR, GE.fvL, 2 * VR); ctx.clip();
      ctx.drawImage(D0.cv, GE.fv0, -VR, GE.fvL, 2 * VR);
      if (S.mode === 'shoot' && S.show.bullet) {                 // 총알 모형의 예상: 틈 바로 뒤 두 줄
        [-SLV, SLV].forEach((sv) => { ctx.fillStyle = 'rgba(255,190,70,.28)'; ctx.fillRect(GE.fv0, sv - SLW / 2, GE.fvL, SLW); ctx.strokeStyle = 'rgba(255,190,70,.9)'; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5; ctx.strokeRect(GE.fv0 + 0.5, sv - SLW / 2, GE.fvL - 1, SLW); ctx.setLineDash([]); });
      }
      if (S.pred) { ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(GE.fv0, S.pred.v); ctx.lineTo(GE.fv0 + GE.fvL, S.pred.v); ctx.stroke(); ctx.setLineDash([]); }
      if (S.predNote) { const k = 1 - S.predNote.t / 4; ctx.globalAlpha = Math.min(1, k * 1.5); ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(GE.fv0, S.predNote.pred); ctx.lineTo(GE.fv0 + GE.fvL, S.predNote.pred); ctx.stroke(); ctx.globalAlpha = 1; }
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.2; D.roundRect(GE.fv0 - 2, -VR - 2, GE.fvL + 4, 2 * VR + 4, 5); ctx.stroke();
      // 눈금
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.4;
      [-150, -100, -50, 0, 50, 100, 150].forEach((tv) => { ctx.beginPath(); ctx.moveTo(GE.fv0 - 2, tv); ctx.lineTo(GE.fv0 + (tv % 100 === 0 ? 9 : 5), tv); ctx.stroke(); });
    });
    // 제목과 눈금 숫자
    if (PHONE) {
      T(OR.x, pt(GE.fv0 + GE.fvL, 0).y + 15, '스크린 정면', 13, LIGHT, 'center', 800);
      [-150, 0, 150].forEach((tv) => { const p = pt(GE.fv0 + 12, tv); T(p.x, p.y + 4, (tv > 0 ? '+' : tv < 0 ? '−' : '') + Math.abs(tv), 12, 'rgba(255,255,255,.75)', 'left', 700, { baseline: 'alphabetic' }); });
    } else {
      const tp = pt(GE.fv0 + GE.fvL / 2, -VR - 14); D.label(tp.x, tp.y, '스크린 정면', { size: 13, bg: 'rgba(255,255,255,.14)', color: LIGHT, pad: 7 });
      [-150, 0, 150].forEach((tv) => { const p = pt(GE.fv0 + 11, tv); T(p.x, p.y + 4, (tv > 0 ? '+' : tv < 0 ? '−' : '') + Math.abs(tv), 12, 'rgba(255,255,255,.75)', 'left', 700); });
    }
  }
  function drawBulletEdge() {
    if (!(S.mode === 'shoot' && S.show.bullet)) return;
    UV(() => {
      [-SLV, SLV].forEach((sv) => {
        ctx.strokeStyle = 'rgba(255,190,70,.9)'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]);
        ctx.beginPath(); ctx.moveTo(GE.ub + 6, sv); ctx.lineTo(GE.us, sv); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(255,190,70,.95)'; ctx.fillRect(GE.us - 3, sv - SLW / 2, 6, SLW);
      });
    });
    const p = pt(GE.fv0 + GE.fvL / 2, -SLV - 24);
    D.label(p.x, p.y, '총알이라면 두 줄에만', { size: 13, bg: 'rgba(255,190,70,.95)', color: '#3a2a00', pad: 7 });
  }
  function drawPred() {
    const mk = (v, a) => { const p = pt(GE.us + 6, v); ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(p.x, p.y, 9, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, TAU); ctx.fillStyle = '#ffd166'; ctx.fill(); ctx.restore(); return p; };
    if (S.pred) { const p = mk(S.pred.v, 1); const q = pt(GE.us + 22, S.pred.v); if (!PHONE) D.label(p.x - 66, p.y, '내 예측', { size: 13, bg: '#ffd166', color: '#3a2a00', pad: 6 }); else D.label(p.x + 52, p.y, '내 예측', { size: 13, bg: '#ffd166', color: '#3a2a00', pad: 6 }); }
    if (S.predNote) {
      const n = S.predNote, k = Math.min(1, (1 - n.t / 4) * 1.6);
      mk(n.pred, k);
      const a = pt(GE.us + 6, n.pred), b = pt(GE.us + 6, n.v);
      ctx.save(); ctx.globalAlpha = k; ctx.strokeStyle = '#ffd166'; ctx.setLineDash([4, 4]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.restore();
      const mid = pt(GE.us + 6, (n.pred + n.v) / 2);
      ctx.save(); ctx.globalAlpha = k; D.label(mid.x + (PHONE ? 56 : -76), mid.y + (PHONE ? 0 : 0), '예측과 ' + Math.round(n.err) + '칸 차이', { size: 13, bg: 'rgba(255,255,255,.92)', color: '#3a2a00', pad: 6 }); ctx.restore();
    }
  }

  /* 오른쪽(세로 화면에서는 아래쪽) 칸: 도착 횟수 히스토그램 또는 도착 기록 */
  const niceMax = (x) => { const e = Math.pow(10, Math.floor(Math.log10(Math.max(1, x)))); const m = x / e; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * e; };
  function drawHist(cf, dt) {
    const D0 = S.data, d = distFor(cf), N = D0.N, ph = cf.kind === 'ph';
    const cmpOn = S.mode === 'which' && S.show.cmp;
    const dSum = distFor({ kind: cf.kind, V: cf.V, slits: 'both', det: true }), dInt = distFor({ kind: cf.kind, V: cf.V, slits: 'both', det: false });
    let peak = D0.maxBin;
    const peakOf = (dd) => N * dd.binMax;
    if (S.show.wave) peak = Math.max(peak, peakOf(d));
    if (cmpOn) peak = Math.max(peak, peakOf(dSum), peakOf(dInt));
    const target = niceMax(Math.max(8, peak * 1.15));
    S.hShown = RM ? target : SciSim.approach(S.hShown, target, dt, 6);
    const H = S.hShown;
    UV(() => {
      D.shadow(() => { D.roundRect(GE.h0 - 10, -VR - 2, GE.hL + 20, 2 * VR + 4, 10); ctx.fillStyle = '#fbfcff'; ctx.fill(); }, { blur: 6, y: 1 });
      ctx.save(); ctx.beginPath(); ctx.rect(GE.h0, -VR, GE.hL, 2 * VR); ctx.clip();
      ctx.strokeStyle = '#e3e8f2'; ctx.lineWidth = 1;
      [0.5, 1].forEach((f) => { const uu = GE.h0 + (target * f / H) * GE.hL; ctx.beginPath(); ctx.moveTo(uu, -VR); ctx.lineTo(uu, VR); ctx.stroke(); });
      ctx.fillStyle = ph ? 'rgba(255,122,92,.88)' : 'rgba(79,124,255,.88)';
      for (let i = 0; i < NB; i++) {
        const c = D0.bins[i]; if (!c) continue;
        const len = Math.min(GE.hL, c / H * GE.hL);
        ctx.fillRect(GE.h0, -VR + i * BW, len, BW - 0.5);
      }
      const curve = (dd, col, lw, dash) => {
        ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.setLineDash(dash || []); ctx.lineJoin = 'round'; ctx.beginPath();
        for (let i = 0; i < NB; i++) { const uu = GE.h0 + Math.min(GE.hL, N * dd.binP[i] / H * GE.hL), vv = -VR + (i + 0.5) * BW; if (i === 0) ctx.moveTo(uu, vv); else ctx.lineTo(uu, vv); }
        ctx.stroke(); ctx.setLineDash([]);
      };
      if (cmpOn) { curve(dSum, '#6b7280', 2.4, [6, 4]); curve(dInt, '#8b5cf6', 2.6); }
      else if (S.show.wave) curve(d, '#e2464b', 2.6);
      ctx.restore();
      ctx.strokeStyle = '#5d6879'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(GE.h0, -VR); ctx.lineTo(GE.h0, VR); ctx.stroke();
    });
    // 눈금과 제목
    const tk = (f) => { const val = Math.round(target * f), uu = GE.h0 + (val / H) * GE.hL; return { val, uu }; };
    [0.5, 1].forEach((f) => {
      const t = tk(f); if (t.uu > GE.h0 + GE.hL + 1) return;
      if (PHONE) { const p = pt(t.uu, VR - 3); T(p.x, p.y + 4, String(t.val), 13, '#5d6879', 'right', 800, { stroke: '#fbfcff', strokeWidth: 4 }); }
      else { const p = pt(t.uu, -VR + 16); T(p.x, p.y, String(t.val), 13, '#5d6879', t.uu > GE.h0 + GE.hL - 14 ? 'right' : 'center', 800, { stroke: '#fbfcff', strokeWidth: 4 }); }
    });
    if (PHONE) {
      ctx.save(); const p = pt(GE.h0 + GE.hL / 2, -VR - 22); ctx.translate(p.x, p.y); ctx.rotate(-Math.PI / 2); T(0, 0, '도착 횟수 →', 13, LIGHT, 'center', 800); ctx.restore();
    } else { const p = pt(GE.h0 + GE.hL / 2, -VR - 14); D.label(p.x, p.y, '도착 횟수 (칸마다)', { size: 13, bg: 'rgba(255,255,255,.14)', color: LIGHT, pad: 7 }); }
  }
  function drawTicker() {
    const D0 = S.data, r = PHONE ? { x: MA.x + 48, y: pt(GE.h0 - 10, 0).y, w: 384, h: GE.hL + 20 } : { x: pt(GE.h0 - 10, 0).x, y: OR.y - VR - 2, w: GE.hL + 20, h: 2 * VR + 4 };
    D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 10); ctx.fillStyle = '#fbfcff'; ctx.fill(); }, { blur: 6, y: 1 });
    const L = D0.last.slice().reverse(), n0 = D0.N;
    const fmt = (v) => (v >= 0 ? '+' : '−') + Math.round(Math.abs(v));
    if (!PHONE) {
      const p = pt(GE.h0 + GE.hL / 2, -VR - 14); D.label(p.x, p.y, '도착 위치 기록', { size: 13, bg: 'rgba(255,255,255,.14)', color: LIGHT, pad: 7 });
      T(r.x + r.w / 2, r.y + 24, '스크린 가운데에서 몇 칸?', 13, '#5d6879', 'center', 800);
      if (!L.length) T(r.x + r.w / 2, r.y + 110, '아직 도착한 전자가 없어요', 14, '#8a95a8', 'center', 700);
      L.forEach((v, i) => {
        const y = r.y + 54 + i * 33;
        T(r.x + 14, y, (n0 - i) + '번째', 14, '#5d6879', 'left', 700);
        T(r.x + r.w - 14, y, fmt(v), 17, i === 0 ? '#e2464b' : '#26324a', 'right', 800);
        ctx.strokeStyle = '#e3e8f2'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(r.x + 10, y + 10); ctx.lineTo(r.x + r.w - 10, y + 10); ctx.stroke();
      });
    } else {
      T(r.x + 10, r.y + 20, '도착 위치 기록 (가운데에서 몇 칸?)', 13, '#5d6879', 'left', 800);
      if (!L.length) T(r.x + 10, r.y + 48, '아직 도착한 전자가 없어요', 14, '#8a95a8', 'left', 700);
      else textBlock(r.x + 10, r.y + 46, r.w - 20, L.map(fmt).join('   '), 17, '#26324a', 24, 800);
    }
  }

  /* ---------- 드브로이 파장 장면 ---------- */
  const dblRow = (i) => (PHONE ? { x: MA.x + 8, y: MA.y + 8 + i * 64, w: MA.w - 16, h: 58 } : { x: MA.x + 8, y: MA.y + 40 + i * 52, w: MA.w - 16, h: 48 });
  function partIcon(p, x, y, t) {
    if (p.id === 'e') { D.glow(x, y, 16, '#7fe3ff', 0.7); D.sphere(x, y, 4.5, '#43b7ff', { gloss: false }); }
    else if (p.id === 'n') { D.sphere(x, y, 8, '#aab0c8', { shadow: true }); }
    else if (p.id === 'c') {
      D.sphere(x, y, 14, '#6f6a8a', { shadow: true, gloss: false });
      for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + 0.4; D.sphere(x + Math.cos(a) * 8, y + Math.sin(a) * 8, 4, '#c8c3e2', { gloss: false }); }
      D.sphere(x, y, 4, '#c8c3e2', { gloss: false });
    } else {
      D.sphere(x, y, 17, '#fff7ea', { shadow: true });
      ctx.save(); ctx.strokeStyle = '#d6453d'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(x - 20, y, 17, -0.9, 0.9); ctx.stroke(); ctx.beginPath(); ctx.arc(x + 20, y, 17, Math.PI - 0.9, Math.PI + 0.9); ctx.stroke(); ctx.restore();
    }
  }
  const lx = (l) => Math.log10(l);
  function drawDbl(t) {
    darkPanel(MA);
    const sel = S.d.sel, rev = S.d.revealed || (game && game.free);
    // 표
    if (!PHONE) {
      const hy = MA.y + 28;
      [['입자', 28], ['질량 m', 188], ['속력 v', 292], ['운동량 p = mv', 386], ['파장 λ = h/p', 508], ['λ / d', 610], ['무늬', 684]].forEach(([s, x]) => T(MA.x + x, hy, s, 13, DIM, x === 28 ? 'left' : 'left', 800));
    }
    PART.forEach((p, i) => {
      const r = dblRow(i), on = p.id === sel;
      D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.fillStyle = on ? 'rgba(242,107,58,.2)' : 'rgba(255,255,255,.06)'; ctx.fill();
      if (on) { ctx.strokeStyle = '#f26b3a'; ctx.lineWidth = 2.4; ctx.stroke(); }
      const ok = pCan(p);
      const verdict = rev ? (ok ? '✅ 가능' : '❌ 불가') : '?';
      if (!PHONE) {
        partIcon(p, r.x + 30, r.y + r.h / 2, t);
        T(r.x + 62, r.y + 21, p.name, 15, LIGHT, 'left', 800); T(r.x + 62, r.y + 39, p.sub, 12.5, DIM, 'left', 700);
        T(r.x + 180, r.y + 30, sci(p.m, 1) + ' kg', 14, LIGHT, 'left', 700);
        T(r.x + 284, r.y + 30, fmtV(pv(p)), 14, LIGHT, 'left', 700);
        T(r.x + 378, r.y + 30, sci(pMom(p), 1) + ' kg·m/s', 14, LIGHT, 'left', 700);
        T(r.x + 500, r.y + 30, fmtLam(pLam(p)), 15, '#ffb48a', 'left', 800);
        T(r.x + 598, r.y + 30, sci(pRatio(p), 1), 14, LIGHT, 'left', 700);
        T(r.x + 664, r.y + 30, verdict, 14, rev ? (ok ? '#7dffb0' : '#ff9aa0') : DIM, 'left', 800);
      } else {
        partIcon(p, r.x + 30, r.y + r.h / 2, t);
        T(r.x + 62, r.y + 20, p.name, 15, LIGHT, 'left', 800); T(r.x + 62 + (p.id === 'c' ? 92 : p.id === 'b' ? 56 : p.id === 'n' ? 64 : 40), r.y + 20, '(' + p.sub + ')', 12.5, DIM, 'left', 700);
        T(r.x + 62, r.y + 38, 'm ' + sci(p.m, 1) + ' kg · v ' + fmtV(pv(p)), 12.5, LIGHT, 'left', 700);
        T(r.x + 62, r.y + 54, 'p ' + sci(pMom(p), 1) + ' · λ', 12.5, LIGHT, 'left', 700);
        T(r.x + 158, r.y + 54, fmtLam(pLam(p)), 13.5, '#ffb48a', 'left', 800);
        T(r.x + r.w - 12, r.y + 20, verdict, 13.5, rev ? (ok ? '#7dffb0' : '#ff9aa0') : DIM, 'right', 800);
        T(r.x + r.w - 12, r.y + 54, 'λ/d ' + sci(pRatio(p), 1), 12.5, DIM, 'right', 700);
      }
    });
    // 로그 눈금 막대
    const gx0 = PHONE ? MA.x + 24 : MA.x + 34, gx1 = PHONE ? MA.x + MA.w - 24 : MA.x + MA.w - 34;
    const gy = PHONE ? MA.y + 468 : MA.y + 370;
    const X = (l) => gx0 + (clamp(lx(l), -35, -7) + 35) / 28 * (gx1 - gx0);
    const thrL = PTH * PD;                // 무늬 한계 파장 = 10⁻¹³ m
    const top = gy - (PHONE ? 150 : 100);
    D.roundRect(gx0, top, X(thrL) - gx0, gy - top, 6); ctx.fillStyle = 'rgba(226,70,75,.2)'; ctx.fill();
    D.roundRect(X(thrL), top, gx1 - X(thrL), gy - top, 6); ctx.fillStyle = 'rgba(80,220,140,.2)'; ctx.fill();
    ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2.2; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(X(thrL), top - 4); ctx.lineTo(X(thrL), gy + 6); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = '#8e9bc9'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(gx0, gy); ctx.lineTo(gx1, gy); ctx.stroke();
    [-35, -28, -21, -14, -7].forEach((e) => { const x = X(Math.pow(10, e)); ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x, gy + 6); ctx.stroke(); T(x, gy + 22, '10' + supOf(e), 13, DIM, e === -35 ? 'left' : e === -7 ? 'right' : 'center', 800); });
    T((gx0 + gx1) / 2, gy + 40, '드브로이 파장 λ (m, 로그 눈금)', 13, LIGHT, 'center', 800);
    T(gx0 + 4, top - (PHONE ? 26 : 8), '◀ 무늬를 볼 수 없어요 (λ/d < 10' + supOf(-6) + ')', 13, '#ff9aa0', 'left', 800);
    T(gx1 - 4, top - 8, '무늬를 볼 수 있어요 (λ/d ≥ 10' + supOf(-6) + ') ▶', 13, '#7dffb0', 'right', 800);
    // 핀
    const pinH = PHONE ? { e: 64, n: 102, c: 26, b: 26 } : { e: 26, n: 26, c: 26, b: 26 };
    const pinDx = PHONE ? { e: 0, n: 0, c: 0, b: 0 } : { e: -9, n: 33, c: 0, b: 0 };
    PART.forEach((p) => {
      const x = X(pLam(p)), h = pinH[p.id], on = p.id === sel;
      ctx.strokeStyle = p.col; ctx.lineWidth = on ? 3 : 2; ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x, gy - h); ctx.stroke();
      D.sphere(x, gy - h - 5, on ? 7 : 5.5, p.col, { gloss: false });
      const name = p.id === 'e' ? '전자' : p.id === 'n' ? '중성자' : p.id === 'c' ? 'C₆₀' : '야구공';
      D.label(x + pinDx[p.id], gy - h - 22, name, { size: 13, bg: p.col, color: '#1b2333', pad: 6, border: on ? '#fff' : null });
    });
    // 아래 안내
    const bt = BOT;
    panel(bt.x, bt.y, bt.w, bt.h, 14);
    textBlock(bt.x + 14, bt.y + 28, bt.w - 28, '슬릿 간격 d = 100 nm(나노 격자)로 가정해요. λ가 d의 10' + supOf(-6) + '배보다 작으면 무늬 사이의 각도가 너무 작아 관찰할 수 없어요(모형 기준). 일상 물체의 파동성이 느껴지지 않는 까닭이에요.', 15, '#26324a', 22, 700);
  }

  /* ---------- 장면 그리기 · 설명 · 읽음 칸 ---------- */
  const stageOf = (N) => (N < 30 ? 0 : N < 300 ? 1 : N < 3000 ? 2 : 3);
  const STAGE_NAME = ['점이 무질서해요', '줄 모양 경향이 희미해요', '줄무늬가 보여요', '간섭무늬가 선명해요'];
  function patternName() {
    const cf = cur(), N = S.data.N;
    if (N < 30) return '아직 알 수 없어요';
    if (cf.slits === 'A') return '한 덩어리로 퍼져요';
    if (cf.det) return N < 100 ? '아직 알 수 없어요' : '두 덩어리';
    return STAGE_NAME[stageOf(N)];
  }
  function caption() {
    const cf = cur(), N = S.data.N, nm = kindName();
    if (S.mode === 'shoot') {
      const b = S.show.bullet ? '총알(고전 입자)이라면 틈 바로 뒤의 두 줄에만 도착할 거예요. ' : '';
      if (N === 0) return ['전자 한 알씩 쏘아 보기', b + '전자를 쏘면 스크린에 어떤 모양이 생길까요? 먼저 “1개 쏘기” 버튼을 눌러 봐요.'];
      if (N < 10) return ['점 하나로 도착해요', b + '전자 한 개는 스크린에 작은 점 하나로 도착해요(입자성). 다음 점이 어디에 찍힐지 예측해 보세요.'];
      return ['위치는 매번 달라요', b + '점이 찍히는 위치가 매번 달라요. 점이 10개 정도로는 어떤 규칙이 있는지 알기 어려워요. 총알 모형의 예상과 비교해 보세요.'];
    }
    if (S.mode === 'pattern') {
      if (cf.slits === 'A') return ['한 틈만 열면', '틈을 하나만 열면 점이 틈 A 뒤쪽을 중심으로 한 덩어리로 퍼져요. 줄무늬는 두 틈이 모두 열려야 생겨요.'];
      const w = S.show.wave ? ' 히스토그램의 빨간 곡선은 도착 확률이에요.' : '';
      return [STAGE_NAME[stageOf(N)], ['점 몇 개로는 어디에 많이 찍히는지 알 수 없어요. 계속 쏘아 보세요.', '점이 100개쯤 쌓이면 줄 모양의 경향이 희미하게 보이기 시작해요.' + w, '점이 1000개쯤 쌓이면 밝고 어두운 줄무늬가 보여요. 한 알씩 쏘았는데도 무늬가 생겼어요!' + w, '점이 10000개쯤 쌓이면 간섭무늬가 선명해요. 어두운 곳에는 전자가 거의 도착하지 않아요.' + w][stageOf(N)]];
    }
    if (S.mode === 'which') {
      const s = S.data.slit;
      if (cf.det) return ['틈 검출기 켬', '검출기가 전자가 지나간 틈을 기록해요(A ' + s.A + '개, B ' + s.B + '개). 어느 틈인지 알면 스크린에는 두 덩어리, 즉 틈마다의 확률을 더한 분포가 쌓여요.' + (S.show.cmp ? ' 회색 점선이 확률의 합, 보라색 곡선이 진폭의 합의 제곱이에요.' : '')];
      return ['틈 검출기 끔', nm + '는 두 틈을 모두 지난 것처럼 행동해요. 두 틈의 파동 진폭을 더한 뒤 제곱한 무늬가 쌓여요.' + (S.show.cmp ? ' 회색 점선이 확률의 합, 보라색 곡선이 진폭의 합의 제곱이에요.' : '')];
    }
    return ['', ''];
  }
  function drawBot() {
    const c = caption();
    panel(BOT.x, BOT.y, BOT.w, BOT.h, 14);
    T(BOT.x + 16, BOT.y + 26, c[0], 16, '#d6452f', 'left', 800);
    textBlock(BOT.x + 16, BOT.y + 50, BOT.w - 32, c[1], PHONE ? 14.5 : 15, '#26324a', PHONE ? 21 : 22, 700);
  }
  function drawLab(dt, t) {
    const cf = cur();
    darkPanel(MA);
    const wantWave = S.show.wave && S.mode !== 'shoot';
    S.waveA = RM ? (wantWave ? 1 : 0) : SciSim.approach(S.waveA, wantWave ? 1 : 0, dt, 6);
    if (S.waveA > 0.01) { buildField(cf); UV(() => { ctx.globalAlpha = S.waveA; ctx.drawImage(fieldCv, GE.ub, -VR, LL, 2 * VR); }); }
    drawBulletEdge();
    drawWall(cf);
    drawGun(cf.kind === 'ph');
    drawScreenStrip(cf.kind === 'ph');
    drawFlights();
    drawFlashes();
    drawFV(cf);
    if (S.mode === 'shoot') drawTicker(); else drawHist(cf, dt);
    drawPred();
    // 검출기 표시
    if (cf.det) {
      [-SLV, SLV].forEach((sv) => {
        const p = pt(GE.ub + 16, sv);
        D.sphere(p.x, p.y, 6.5, '#ffd166', { gloss: false });
        ctx.save(); ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, 10 + 2 * Math.sin(t * 5), 0, TAU); ctx.globalAlpha = 0.5; ctx.stroke(); ctx.restore();
      });
    }
    drawBot();
  }

  let rlast = '';
  const fmtPos = (v) => (v >= 0 ? '+' : '−') + Math.round(Math.abs(v)) + '칸';
  function readouts() {
    let a, b, c, L1, L2, L3;
    if (S.mode === 'dbl') {
      const p = PART.find((q) => q.id === S.d.sel);
      L1 = '고른 입자'; a = p.name + ' (v ' + fmtV(pv(p)) + ')';
      L2 = '운동량 p = mv'; b = sci(pMom(p), 1) + ' kg·m/s';
      L3 = '파장 λ = h/p'; c = fmtLam(pLam(p));
    } else {
      const cf = cur(), D0 = S.data;
      L1 = '도착한 ' + kindName() + ' 수'; a = D0.N.toLocaleString('ko-KR') + '개';
      if (S.mode === 'which' && cf.det) { L2 = '틈 검출 기록'; b = '틈 A ' + D0.slit.A + ' · 틈 B ' + D0.slit.B; }
      else { L2 = '드브로이 파장 λ'; b = cf.kind === 'ph' ? PH_NM + ' nm (붉은 빛)' : lamTxt(lamNm(cf.V)) + ' (' + cf.V + ' V)'; }
      if (S.mode === 'shoot') { L3 = '마지막 도착 위치'; c = D0.last.length ? fmtPos(D0.last[D0.last.length - 1]) : '—'; }
      else { L3 = '스크린의 모습'; c = patternName(); }
    }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ---------- 포인터: 스크린을 눌러 도착 위치 예측하기 · 표에서 입자 고르기 ---------- */
  const inPredZone = (p) => { if (S.mode !== 'shoot') return false; const q = toUV(p); return q.u > GE.us - 16 && q.u < GE.fv0 + GE.fvL + 4 && Math.abs(q.v) <= VR + 4; };
  const setPred = (p) => { const q = toUV(p); S.pred = { v: Math.round(clamp(q.v, -VR, VR)) }; };
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'dbl') {
        for (let i = 0; i < PART.length; i++) { const r = dblRow(i); if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) { S.d.sel = PART[i].id; Sound.click(); updateCtl(); break; } }
        return false;
      }
      if (inPredZone(p)) { predDrag = true; setPred(p); Sound.click(); return true; }
      return false;
    },
    move(p) { if (predDrag) setPred(p); },
    up() { predDrag = false; },
    hover(p) { return inPredZone(p) ? 'crosshair' : S.mode === 'dbl' ? 'pointer' : 'default'; },
  });

  /* ---------- 미션 ---------- */
  function enter(mode, cfg, show) {
    S.cfg = Object.assign({ kind: 'e', V: 50, slits: 'both', det: false }, cfg || {});
    Object.assign(S.show, { bullet: false, wave: false, cmp: false, selA: false, selP: false, selW: false, dblIn: false, dblPick: false }, show || {});
    S.pred = null; S.predLog = []; predDrag = false;
    setScene(mode); resetData(); updateCtl();
  }
  let numKey = '';
  $('#nLam').addEventListener('input', () => { $('#nLam').classList.remove('ok', 'bad'); numKey = ''; });
  function gradeNum() {
    const el = $('#nLam'), raw = el.value.trim().replace(',', '.');
    if (!raw) return '먼저 파장을 nm 단위로 입력해 보세요.';
    const x = parseFloat(raw), ok = isFinite(x) && x >= 0.165 && x <= 0.18, key = raw + (ok ? '1' : '0');
    if (key !== numKey) { numKey = key; el.classList.remove('ok', 'bad'); void el.offsetWidth; el.classList.add(ok ? 'ok' : 'bad'); }
    return ok ? true : '전자의 운동량 p = 3.8×10⁻²⁴ kg·m/s를 λ = h/p에 넣어 보세요. (h = 6.63×10⁻³⁴ J·s, 1 nm = 10⁻⁹ m)';
  }
  const nameOfPicked = () => PART.filter((p) => S.d.pick[p.id]).map((p) => (p.id === 'c' ? 'C₆₀' : p.name)).join(' · ') || '없음';

  const levels = [
    {
      title: '한 알씩: 점으로 도착하는 전자', short: '한 알씩', icon: '🎯', phase: '실험',
      intro: '<p class="si-q">❓ 탐구 질문: 전자를 한 알씩 쏘아도 간섭무늬가 생긴다면, 전자는 대체 어떻게 두 틈을 지난 걸까?</p>' +
        '<div class="si-link">🔗 <b>물리학에서</b> 전자도 파장(드브로이 λ = h/p)을 가져 이중 슬릿에서 간섭무늬를 만든다는 것을, 이 과목의 <b>광전 효과</b>에서는 빛이 광자라는 알갱이처럼 행동한다는 것을 배웠어요. 이번에는 전자나 광자를 <b>한 알씩</b> 쏘면 어떤 일이 벌어지는지 모의실험으로 확인해요.</div>' +
        '<p>전자총에서 전자를 쏘면 형광 스크린에 <b>점 하나</b>가 반짝 찍혀요. 전자 한 개는 언제나 한 점으로 도착해요(<b>입자성</b>). 그런데 그 점이 어디에 찍힐지 미리 알 수 있을까요? 총알이라면 틈 바로 뒤의 두 줄에만 도착할 텐데, 전자는 어떨까요?</p>' +
        '<p class="ctrl-note">※ 모의 장치는 화면에 보이도록 규모를 키운 값이에요. 실제 실험은 마이크로미터 크기의 슬릿으로 해요(1961년 외른손의 전자 이중 슬릿, 1989년 도노무라 등의 전자 한 개씩 실험).</p>',
      features: ['shoot'],
      setup() { enter('shoot'); },
      recap: '전자 한 개는 스크린에 늘 작은 점 하나로 도착해요(입자성). 그런데 점이 찍히는 위치는 매번 달라서 한 개의 도착 위치는 미리 알 수 없어요.',
      summary: '<ul><li>전자(또는 광자)를 한 알씩 쏘면 스크린에는 매번 <b>점 하나</b>가 찍혀요 → 입자성.</li><li>점이 찍히는 위치는 매번 달라서, 한 개의 도착 위치는 <b>미리 알 수 없어요</b>. 알 수 있는 것은 도착 <b>확률</b>뿐이에요.</li><li>총알(고전 입자)이라면 틈 바로 뒤의 두 줄에만 도착해요. 전자도 그럴까요? → 다음 단계에서 점을 많이 쌓아 확인해요.</li><li>※ 전자는 “무늬 모양의 작은 파동 덩어리”로 도착하지 않아요. 언제나 한 점으로 도착해요.</li></ul>',
      missions: [
        {
          title: '전자 10개 쏘아 보기',
          goal: '전자를 <b>10개</b> 쏘아서 스크린에 점이 어떻게 찍히는지 지켜보세요. (오른쪽 “도착 위치 기록”도 함께 봐요.)',
          hint: '“10개 쏘기”를 누르면 전자가 한 알씩 날아가요. 총알 모형 예상 보기를 켜서 비교해도 좋아요.',
          setup() { S.show.selA = false; setScene('shoot'); },
          check: () => S.mode === 'shoot' && S.data.N >= 10,
          hold: 0.6,
          status: () => mark(S.data.N >= 10) + ' 도착한 전자 ' + S.data.N + ' / 10개',
          explain: '전자총에서 전자를 한 개씩 쏘면 스크린에는 매번 <b>작은 점 하나</b>가 반짝 찍혀요. 전자는 늘 한 점에 도착하므로 입자처럼 행동하는 거예요. 그리고 점이 찍히는 위치는 매번 달라요.',
        },
        {
          title: '다음 점의 위치를 예측해 보기', manual: true,
          goal: '스크린을 눌러 “다음 점은 여기!”라고 <b>예측</b>한 뒤 전자를 쏘세요. <b>3번</b> 해 보고 결과를 정리하세요.',
          hint: '오른쪽 검은 스크린(또는 옆모습 막대)의 한 곳을 누르면 노란 표시가 생겨요. 그다음 “1개 쏘기”를 눌러 예측과 비교해요.',
          setup() { S.show.selA = true; SEL_A.reset(); S.pred = null; S.predLog = []; S.predNote = null; setScene('shoot'); },
          check() {
            if (S.predLog.length < 3) return '스크린을 눌러 예측한 뒤 쏘는 일을 3번 해 보세요. (지금 ' + S.predLog.length + '번)';
            return SEL_A.grade();
          },
          status: () => mark(S.predLog.length >= 3) + ' 예측해 본 횟수 ' + S.predLog.length + ' / 3 &nbsp; · 예측과 12칸 이내로 가까웠던 횟수 ' + S.predLog.filter((q) => q.near).length + '번 &nbsp; · 고른 문장 ' + SEL_A.count() + ' / 2',
          explain: '예측한 곳 근처에 점이 찍히는 일이 있어도 그것은 우연이에요. 같은 장치에서 같은 방법으로 쏘아도 도착 위치는 매번 달라서 <b>한 개의 위치는 미리 알 수 없어요</b>. 그리고 도착한 모습은 퍼진 파동이 아니라 언제나 <b>작은 한 점</b>이에요.',
        },
        {
          type: 'quiz', title: '전자 한 개의 도착 위치',
          goal: '전자 한 개가 스크린에 도착할 위치를 정확히 예측할 수 있을까요?',
          setup() { S.show.selA = false; setScene('shoot'); },
          choices: ['없어요. 위치는 매번 달라서 어디에 도착할 가능성이 큰지(확률)만 말할 수 있어요', '있어요. 전자총의 속도를 정확히 알면 총알처럼 계산할 수 있어요', '있어요. 전자는 무늬 모양의 작은 파동 덩어리로 도착하니까요', '있어요. 전자는 두 틈 바로 뒤의 두 줄 가운데 한 곳에 도착하니까요'],
          answer: 0,
          feedback: ['', '같은 속도로 쏘아도 도착 위치가 매번 달라요. 전자는 총알처럼 정해진 길을 따라가지 않아요.', '전자는 스크린에 늘 한 점으로 도착해요. 무늬는 점이 아주 많이 쌓인 뒤에 나타나요.', '직접 확인했듯이 점은 두 줄 밖과 두 줄 사이에도 찍혀요. 총알 모형으로는 설명되지 않아요.'],
          explain: '같은 방법으로 쏘아도 한 개의 도착 위치는 매번 달라서 정확히 예측할 수 없어요. 알 수 있는 것은 <b>어디에 도착할 확률이 큰가</b>뿐이에요. 한 개의 전자는 항상 작은 한 점으로 도착해요.',
        },
      ],
    },
    {
      title: '무늬 쌓기: 점이 모여 간섭무늬가 돼요', short: '무늬 쌓기', icon: '📊', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 전자는 한 점으로 도착하지만 한 개의 위치는 예측할 수 없다는 것을 알았어요. 그럼 점을 아주 많이 쌓으면 어떤 모양이 될까요?</div>' +
        '<p>10개 → 100개 → 1000개 → 10000개로 점을 쌓아 보세요. 오른쪽 히스토그램은 칸마다 도착한 횟수예요. <b>🌊 확률 파동 · 확률 곡선</b>을 켜면 도착 확률의 분포가 겹쳐 보여요. 가속 전압을 바꾸면 전자의 파장 λ = h/p가 달라지고, 틈을 하나만 열면 어떻게 되는지도 확인해요.</p>',
      features: ['pattern'],
      setup() { enter('pattern'); },
      recap: '한 알씩 쏘아도 수천 개가 쌓이면 밝고 어두운 줄무늬(간섭무늬)가 생겨요. 줄무늬는 전자가 도착할 확률의 분포와 같고, 어두운 곳은 전자가 도착할 확률이 아주 작은 곳이에요.',
      summary: '<ul><li>점이 쌓이는 모습: 10개 → 무질서 · 100개 → 희미한 줄 경향 · 1000개 → 줄무늬 · 10000개 → 선명한 간섭무늬.</li><li><b>한 알씩 쏘는데도 간섭무늬</b>가 생겨요. 전자들이 서로 부딪쳐서 생기는 것이 아니에요.</li><li>줄무늬 = <b>도착 확률의 분포</b>. 밝은 곳은 도착 확률이 큰 곳, 어두운 곳은 거의 0인 곳이에요. 확률은 (파동 진폭의 합)²에 비례해요.</li><li>가속 전압이 높을수록 λ = h/p가 짧아져 줄무늬 간격이 좁아져요(50 V: 0.17 nm, 100 V: 0.12 nm, 500 V: 0.055 nm).</li><li>틈을 하나만 열면 줄무늬 없이 한 덩어리로 퍼져요.</li></ul>',
      missions: [
        {
          title: '줄무늬가 보일 때까지 쏘기',
          goal: '두 틈을 열어 두고, 스크린에 점이 <b>1000개</b> 이상 쌓이게 하세요. 줄무늬가 서서히 나타나는 모습을 지켜봐요.',
          hint: '“+100”, “+1000”을 눌러 한꺼번에 쏠 수 있어요. 점이 100개일 때와 1000개일 때를 비교해 보세요.',
          setup() { S.show.selP = false; setScene('pattern'); },
          check: () => S.mode === 'pattern' && cur().slits === 'both' && S.data.N >= 1000,
          hold: 0.8,
          status: () => mark(S.data.N >= 1000) + ' 쌓인 점 ' + S.data.N.toLocaleString('ko-KR') + ' / 1,000개 &nbsp; ' + mark(cur().slits === 'both') + ' 두 틈 열림',
          explain: '점이 10개일 때는 무질서해 보이지만, 100개쯤에서 줄 모양의 경향이 희미하게 보이고 1000개에서는 줄무늬가, 10000개에서는 선명한 간섭무늬가 나타나요. 전자는 한 알씩 도착했는데도 파동의 간섭무늬가 생긴 거예요.',
        },
        {
          title: '무늬의 의미 정리하기', manual: true,
          goal: '가속 전압을 <b>500 V</b>로 바꿔 300개 이상, <b>틈 A만</b> 열어 100개 이상 쏘고, <b>🌊 확률 곡선</b>도 켜 본 뒤 문장을 완성하세요.',
          hint: '전압과 틈을 바꾸면 화면이 지워지고 새로 쌓여요. 500 V에서 “+100”을 3번, 틈 A만 열고 “+100”을 1번 눌러요.',
          setup() { S.mx.v500 = 0; S.mx.single = 0; S.seen.wave = false; S.show.wave = false; S.show.selP = true; SEL_P.reset(); setCfg({ V: 50, slits: 'both' }); setScene('pattern'); },
          check() {
            if (S.mx.v500 < 300) return '가속 전압을 500 V로 바꿔 300개 이상 쏘아 보세요. (지금 ' + S.mx.v500 + '개)';
            if (S.mx.single < 100) return '열어 둔 틈을 “틈 A만”으로 바꿔 100개 이상 쏘아 보세요. (지금 ' + S.mx.single + '개)';
            if (!S.seen.wave) return '“🌊 확률 파동 · 확률 곡선 보기”를 켜서 막대와 곡선을 비교해 보세요.';
            return SEL_P.grade();
          },
          status: () => mark(S.mx.v500 >= 300) + ' 500 V ' + Math.min(S.mx.v500, 300) + ' / 300 &nbsp; ' + mark(S.mx.single >= 100) + ' 틈 A만 ' + Math.min(S.mx.single, 100) + ' / 100 &nbsp; ' + mark(S.seen.wave) + ' 확률 곡선 &nbsp; · 고른 문장 ' + SEL_P.count() + ' / 4',
          explain: '줄무늬는 전자가 도착할 <b>확률의 분포</b>예요. 밝은 곳은 확률이 큰 곳, 어두운 곳은 확률이 거의 0인 곳이지 전자가 숨어 있는 곳이 아니에요. 전압이 높으면 전자의 운동량이 커서 파장이 짧아지므로 줄무늬 간격이 좁아져요. 틈을 하나만 열면 두 틈의 파동이 겹치지 않아 간섭이 없고 한 덩어리로 퍼져요.',
        },
        {
          type: 'quiz', title: '전자끼리 부딪쳐서 무늬가 생긴다?',
          goal: '“전자들이 서로 부딪쳐서 줄무늬가 생긴다”는 설명이 틀린 까닭은?',
          setup() { S.show.selP = false; setScene('pattern'); },
          choices: ['전자를 한 알씩 따로 쏘아도 점이 쌓이면 같은 무늬가 생겨서, 다른 전자와 부딪칠 일이 없기 때문에', '전자는 서로 끌어당기기 때문에 부딪치지 않아요', '전자는 부딪치면 오히려 줄무늬가 사라지기 때문에', '줄무늬는 전자가 아니라 스크린이 만들기 때문에'],
          answer: 0,
          feedback: ['', '전자 사이에는 척력이 작용하지만, 핵심은 전자가 한 알씩만 있어도 무늬가 생긴다는 점이에요.', '이 실험에서 전자끼리의 충돌은 관련이 없어요. 한 알씩 쏘아도 같은 결과가 나온다는 사실이 증거예요.', '스크린은 도착한 위치를 보여 줄 뿐이에요. 무늬는 도착 확률의 분포예요.'],
          explain: '시간 간격을 충분히 두고 전자를 <b>한 알씩</b> 쏘면 어떤 순간에도 장치 안에는 전자가 한 개뿐이에요. 그런데도 점이 쌓이면 같은 간섭무늬가 생겨요. 그러므로 무늬는 전자들의 충돌이 아니라 <b>한 개의 전자가 가진 확률 파동의 간섭</b>으로 설명해야 해요.',
        },
      ],
    },
    {
      title: '어느 틈? 알고 나면 무늬가 사라져요', short: '어느 틈?', icon: '🔍', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 한 알씩 쏘아도 점이 쌓이면 간섭무늬가 생긴다는 것을 알았어요. 간섭이 생기려면 전자가 두 틈을 <b>모두</b> 지난 것처럼 행동해야 해요. 그럼 “이 전자가 어느 틈을 지났는지” 알아내려고 하면 어떻게 될까요?</div>' +
        '<p><b>👁️ 틈 검출기</b>를 켜면 각 전자가 지나간 틈이 기록돼요. 검출기를 켠 채로, 그리고 끈 채로 점을 쌓아 스크린을 비교해 보세요. 확률(틈마다의 확률의 합)과 확률 파동(두 틈의 진폭의 합의 제곱)을 비교해 보면 그 까닭이 보여요. 광자(레이저 빛을 아주 약하게 해서 한 개씩)로도 해 봐요.</p>',
      features: ['which'],
      setup() { enter('which', { V: 100 }, { wave: true }); },
      recap: '어느 틈을 지났는지 검출하면 스크린에서 간섭무늬가 사라지고 두 덩어리(틈마다의 확률의 합)만 남아요. 알아보려는 순간 결과가 바뀌어요. 광자도 마찬가지예요.',
      summary: '<ul><li>검출기를 <b>끄면</b>: 전자는 두 틈을 모두 지난 것처럼 행동해요 → <b>진폭을 더한 뒤 제곱</b> → 간섭무늬.</li><li>검출기를 <b>켜면</b>: 어느 틈을 지났는지 알 수 있어요 → 틈마다의 <b>확률을 더함</b> → 두 덩어리(총알 모형과 같은 결과).</li><li>측정(관찰)이 결과를 바꿔요. 전자가 검출기에 맞아서 튕겨 나가기 때문이 아니라, 경로를 알면 두 경로의 파동이 하나의 확률로 겹쳐지지 않기 때문이에요(정성적 설명).</li><li>광자를 한 개씩 쏘아도 결과는 같아요. 입자-파동 이중성은 빛과 전자 모두의 성질이에요.</li></ul>',
      missions: [
        {
          title: '검출기를 켜고 꺼서 비교하기',
          goal: '틈 검출기를 <b>끈 채로 300개</b>, <b>켠 채로 300개</b> 이상 쏘아서 스크린의 모양을 비교하세요.',
          hint: '“+100”을 3번씩 눌러요. 검출기를 켜거나 끄면 스크린이 지워지고 새로 쌓여요. 파란 막대가 어떻게 달라지나요?',
          setup() { S.mx.detOn = 0; S.mx.detOff = 0; S.show.wave = true; S.show.selW = false; setCfg({ kind: 'e', slits: 'both', V: 100, det: false }); setScene('which'); },
          check: () => S.mx.detOff >= 300 && S.mx.detOn >= 300,
          hold: 0.6,
          status: () => mark(S.mx.detOff >= 300) + ' 검출기 끔 ' + Math.min(S.mx.detOff, 300) + ' / 300 &nbsp; ' + mark(S.mx.detOn >= 300) + ' 검출기 켬 ' + Math.min(S.mx.detOn, 300) + ' / 300',
          explain: '검출기를 끄면 점이 <b>줄무늬</b>로 쌓이고, 켜면 틈 A와 틈 B 뒤에 <b>두 덩어리</b>로 쌓여요. 어느 틈을 지났는지 알게 되는 순간 간섭무늬가 사라져요. 관찰하는 방법에 따라 같은 전자가 다른 결과를 만들어요.',
        },
        {
          title: '무늬가 생기고 사라지는 조건 정리하기', manual: true,
          goal: '광자(레이저)로도 <b>300개</b> 이상 쏘고, “📈 두 가지 계산 곡선 비교”를 켜 본 뒤 문장을 완성하세요.',
          hint: '“쏘는 입자”에서 광자를 고르고 “+100”을 3번 눌러요. 곡선 비교를 켜면 회색 점선과 보라색 곡선이 보여요.',
          setup() { S.mx.photon = 0; S.seen.cmp = false; S.show.cmp = false; S.show.selW = true; SEL_W.reset(); setScene('which'); },
          check() {
            if (S.mx.photon < 300) return '쏘는 입자를 “광자 (레이저)”로 바꿔 300개 이상 쏘아 보세요. (지금 ' + S.mx.photon + '개)';
            if (!S.seen.cmp) return '“📈 두 가지 계산 곡선 비교하기”를 켜 보세요.';
            return SEL_W.grade();
          },
          status: () => mark(S.mx.photon >= 300) + ' 광자 ' + Math.min(S.mx.photon, 300) + ' / 300 &nbsp; ' + mark(S.seen.cmp) + ' 곡선 비교 &nbsp; · 고른 문장 ' + SEL_W.count() + ' / 5',
          explain: '검출기를 끄면 두 경로의 <b>진폭을 더한 뒤 제곱</b>하므로 보강·상쇄가 일어나 줄무늬가 생겨요. 켜면 어느 경로인지 알 수 있어서 <b>경로마다의 확률을 더하게</b> 되고 간섭항이 없어져 두 덩어리가 돼요. 광자도 같은 규칙을 따라요.',
        },
        {
          type: 'quiz', title: '검출기를 켜면 무늬가 사라지는 까닭',
          goal: '틈 검출기를 켜면 간섭무늬가 사라지는 까닭을 가장 알맞게 설명한 것은?',
          setup() { S.show.selW = false; setScene('which'); },
          choices: ['어느 틈을 지났는지 알 수 있게 되어, 두 경로의 파동이 겹쳐 간섭하지 않고 경로마다의 확률이 더해지기 때문에', '전자가 검출기에 세게 부딪쳐 튕겨 나가 스크린에 도착하지 못하기 때문에', '검출기가 전자를 느리게 해서 파장이 길어지기 때문에', '전자가 두 개로 쪼개져서 한쪽만 남기 때문에'],
          answer: 0,
          feedback: ['', '전자는 스크린에 그대로 도착해요(도착 개수는 그대로예요). 바뀌는 것은 도착 위치의 분포예요. 정성적으로 “측정이 상태를 바꾼다”고 이해해요.', '무늬가 사라져도 전자의 가속 전압(파장)은 그대로예요. 달라지는 것은 경로를 알 수 있느냐예요.', '전자는 쪼개지지 않아요. 언제나 한 개가 한 점에 도착해요.'],
          explain: '검출기를 켜면 전자가 어느 틈을 지났는지 알 수 있어요. 그러면 두 경로가 한 상태로 겹쳐 있지 않고, 경로마다의 <b>확률을 더한 분포(두 덩어리)</b>가 돼요. 이것이 양자 세계의 기묘함이에요: <b>관찰하면 결과가 바뀌어요</b>. 다음 차시에서 이것을 큐비트의 “측정”으로 일반화해요.',
        },
      ],
    },
    {
      title: '드브로이 파장: 왜 야구공은 간섭하지 않을까', short: '드브로이 파장', icon: '📐', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 전자와 광자가 입자이면서 파동처럼 간섭한다는 것을 보았어요. 그렇다면 야구공도 파동일까요? 파장은 드브로이 관계식 <b>λ = h/p</b> (h = 6.63×10⁻³⁴ J·s, p = mv)로 구해요.</div>' +
        '<p>전자 · 중성자 · C₆₀ 분자 · 야구공의 파장을 비교해 보세요. 이중 슬릿 간격을 d = 100 nm로 가정할 때, 파장이 너무 짧으면(λ/d가 10⁻⁶ 미만) 간섭무늬를 볼 수 없어요(모형 기준). 표에서 입자 줄을 눌러 고르면 속력 배율도 바꿀 수 있어요.</p>',
      features: ['dbl'],
      setup() { enter('dbl', {}, { dblPick: true }); S.d.pick = {}; S.d.revealed = false; S.d.sel = 'e'; S.d.f = { e: 1, n: 1, c: 1, b: 1 }; updateCtl(); },
      recap: '모든 물질은 λ = h/p의 파장을 가져요. 전자 · 중성자 · C₆₀은 파장이 충분해서 간섭무늬를 볼 수 있지만, 야구공은 파장이 약 10⁻³⁴ m로 너무 짧아 일상에서 파동성을 느낄 수 없어요.',
      summary: '<ul><li><b>드브로이 관계식 λ = h/p</b> (p = mv). 운동량이 클수록 파장이 짧아요.</li><li>전자(50 V): p = 3.8×10⁻²⁴ kg·m/s → λ = 0.17 nm · 열중성자(2.2 km/s): 약 0.18 nm · C₆₀(200 m/s): 2.8×10⁻¹² m = 2.8 pm(1999년 간섭 관찰) · 야구공(0.145 kg, 40 m/s): 1.1×10⁻³⁴ m.</li><li>속력이 2배이면 p가 2배이므로 λ는 <b>1/2배</b>가 돼요.</li><li>파장이 장치의 슬릿 간격에 비해 너무 짧으면(모형: λ/d &lt; 10⁻⁶) 무늬를 볼 수 없어요. 야구공도 파동성이 있지만 관찰할 수 없을 뿐이에요.</li><li>정리: 전자와 광자는 <b>도착할 때는 입자</b>(한 점), <b>도착 확률은 파동</b>(간섭). 확률 ∝ (파동 진폭의 합)².</li></ul>',
      missions: [
        {
          title: '간섭무늬를 볼 수 있는 입자 고르기',
          goal: '표의 파장 λ와 아래 눈금을 보고, 이중 슬릿(d = 100 nm)에서 <b>간섭무늬를 볼 수 있는 입자</b>를 모두 고르세요.',
          hint: '눈금에서 입자의 핀이 노란 점선(λ/d = 10⁻⁶)의 오른쪽(초록색 영역)에 있으면 무늬를 볼 수 있어요. 입자 줄을 눌러 속력도 바꿔 보세요.',
          setup() { S.show.dblPick = true; S.show.dblIn = false; setScene('dbl'); },
          check() { const ok = pickOK(); if (ok) S.d.revealed = true; return ok; },
          hold: 0.8,
          status: () => mark(pickOK()) + ' 고른 입자: ' + nameOfPicked(),
          explain: '전자(0.17 nm), 중성자(0.18 nm), C₆₀(2.8 pm)은 λ가 충분해서 간섭무늬를 볼 수 있어요(C₆₀은 1999년에 실제로 관찰). 야구공은 λ가 약 10⁻³⁴ m로 d보다 10²⁷배나 짧아 어떤 장치로도 무늬를 볼 수 없어요.',
        },
        {
          title: '드브로이 파장 계산하기', manual: true,
          goal: '전자(50 V, 속력 × 1)의 운동량은 p = 3.8×10⁻²⁴ kg·m/s예요. <b>λ = h/p</b>를 계산해 nm로 입력하고, 속력이 2배일 때도 고르세요.',
          hint: 'λ = 6.63×10⁻³⁴ ÷ 3.8×10⁻²⁴ ≈ 1.7×10⁻¹⁰ m예요. 1 nm = 10⁻⁹ m이므로 0.17 nm! 표에서 전자 줄을 누르고 × 2를 눌러 확인해도 좋아요.',
          setup() { S.show.dblPick = false; S.show.dblIn = true; SEL_D.reset(); $('#nLam').value = ''; $('#nLam').classList.remove('ok', 'bad'); numKey = ''; S.d.sel = 'e'; S.d.f.e = 1; updateCtl(); setScene('dbl'); },
          check() { const n = gradeNum(); if (n !== true) return n; return SEL_D.grade(); },
          status: () => mark($('#nLam').value.trim() !== '') + ' 파장 입력 &nbsp; · 고른 문장 ' + SEL_D.count() + ' / 1',
          explain: 'p = 3.8×10⁻²⁴ kg·m/s이므로 λ = h/p = 6.63×10⁻³⁴ / 3.8×10⁻²⁴ ≈ 1.7×10⁻¹⁰ m = <b>0.17 nm</b>예요. 원자 크기(약 0.1 nm)와 비슷해서 결정이나 나노 슬릿에서 간섭해요. 속력이 2배이면 p가 2배이므로 λ는 <b>1/2배</b>(0.087 nm)가 돼요.',
        },
        {
          type: 'quiz', title: '야구공은 왜 무늬를 만들지 못할까',
          goal: '야구공이 이중 슬릿을 지나도 간섭무늬를 만들지 못하는 까닭은?',
          setup() { S.show.dblPick = false; S.show.dblIn = false; setScene('dbl'); },
          choices: ['야구공에도 파동성이 있지만 파장이 약 10⁻³⁴ m로 너무 짧아서 무늬를 관찰할 수 없기 때문에', '야구공은 입자라서 파동성이 전혀 없기 때문에', '야구공의 속력이 너무 커서 파장이 아주 길어지기 때문에', '야구공은 너무 커서 틈을 지나갈 수 없기 때문에'],
          answer: 0,
          feedback: ['', '모든 물질은 파장 λ = h/p를 가져요. 다만 야구공은 파장이 너무 짧아 파동성을 관찰할 수 없을 뿐이에요.', '속력이 클수록 운동량이 커서 파장은 오히려 짧아져요.', '틈에 못 지나가는 것은 크기의 문제일 뿐이에요. 파동성을 관찰할 수 없는 근본 이유는 질량이 커서 파장이 극히 짧기 때문이에요.'],
          explain: '야구공(0.145 kg, 40 m/s)의 운동량은 5.8 kg·m/s로 매우 커서 λ = h/p ≈ 1.1×10⁻³⁴ m(원자핵 크기의 10⁻¹⁹배)밖에 되지 않아요. 파동성이 사라진 것이 아니라 <b>너무 짧은 파장 때문에 관찰할 수 없는 것</b>이에요. 일상에서 물체의 파동성을 느낄 수 없는 까닭이에요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hq-single-photon', mount: '#game', badge: '이중성 탐험가', homeHref: '../../index.html#hq',
    featureLabels: { shoot: '🎯 전자총 · 스크린 · 총알 모형 예상', pattern: '📊 점 쌓기 · 도착 횟수 막대 · 확률 곡선', which: '🔍 틈 검출기 · 광자 · 곡선 비교', dbl: '📐 입자별 드브로이 파장 표' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  resetData();
  setScene('shoot');
  updateCtl();
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    view.apply();
    stepShots(dt);
    ctx.clearRect(0, 0, VW, VH);
    if (S.mode === 'dbl') drawDbl(t); else drawLab(dt, t);
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, MA, BOT, GE, VR, OR, pt, toUV, PART, SEL_A, SEL_P, SEL_W, SEL_D, fire, setCfg, setScene, updateCtl, distFor, lamNm, lamTxt, pickOK, pCan, pLam, pMom, fmtLam, cur, resetData, patternName, stageOf,
    perfPrep() { setScene('pattern'); S.show.wave = true; setInterval(() => { if (S.queue < 50) fire(300); }, 700); },
    get game() { return game; },
  };
})();
