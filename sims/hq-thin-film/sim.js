/* =========================================================
   전자기와 양자 Ⅱ. 빛과 정보 통신 - 비누막 간섭 (단원 1차시)
   성취기준 [12전자02-01] 빛의 간섭과 회절을 알고, 홀로그램 등 현대의 정밀 기술에 활용되는 예를 찾을 수 있다.
   ① 모형: 반사와 위상 (줄 파동의 고정단·자유단 ↔ 굴절률이 다른 경계에서 빛의 반사 위상)
   ② 실험: 비누막 관찰 (세워 둔 쐐기 모양 막의 가로 줄무늬, 맨 위의 검은 띠, 시간에 따른 변화)
   ③ 분석: 간섭 조건 (앞면 π 변화 + 광로차 2nt → 보강 2nt = (m+1/2)λ, 상쇄 2nt = mλ)
   ④ 적용: 박막 기술 (무반사 코팅 t = λ/(4n) ≈ 100 nm, 기름막·비눗방울)
   비스듬한 입사의 광로차, 다중 반사, 뉴턴 링 식, 코팅 반사율 계산은 다루지 않아요. (그림의 기울기는 광선을 구분하려고 그린 것이에요.)
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
  const N_SOAP = 1.33;                 // 비눗물의 굴절률
  const N_MG = 1.38, N_GLASS = 1.52;   // 무반사 코팅(MgF₂)과 렌즈 유리의 굴절률
  const S0 = 100;                      // 새로 만든 비누막의 두께 증가율 (nm / cm): 위 0 nm → 8 cm 아래 800 nm
  const H_CM = 8;                      // 비누막의 높이 (cm)
  const TAU_MAX = 60;                  // 시간 흐름의 끝 (초)
  const TAU_DRAIN = 12;                // 두께 증가율 = S0 / (1 + 시간 / TAU_DRAIN)
  const T_BRIGHT = 0.99;               // 합성 진폭이 이 이상이면 '보강'
  const T_DARK = 0.1;                  // 이 이하이면 '상쇄'
  const slopeAt = (tau) => S0 / (1 + tau / TAU_DRAIN);
  const thickAt = (ycm, tau) => ycm * slopeAt(tau);               // 깊이 y(cm)에서 막의 두께 (nm)
  const sinI = (n, t, lam) => Math.pow(Math.sin(TAU * n * t / lam), 2);   // 앞면만 위상 변화: 반사광 세기 ∝ sin²(2πnt/λ)
  const sinA = (n, t, lam) => Math.abs(Math.sin(TAU * n * t / lam));      // 합성 진폭 (A의 2배가 최대)
  const MONO = { '650': 650, '532': 532, '450': 450, '600': 600 };
  const gam = (v) => Math.pow(clamp(v, 0, 1), 1 / 2.2);
  const rgbCss = (c) => 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
  // 백색광에서 두께 t(nm)인 막이 보이는 색 (400~700 nm를 같은 세기로 섞어 계산)
  const LAMS = []; for (let l = 400; l <= 700; l += 10) LAMS.push(l);
  const LCOL = LAMS.map((l) => wlRGB(l).map((v) => Math.pow(v / 255, 2.2)));
  const LREF = [0, 1, 2].map((k) => LCOL.reduce((s, c) => s + c[k], 0));
  function whiteColor(t, n, mode) {            // mode 'film': sin², 'coat': cos²
    const s = [0, 0, 0];
    for (let i = 0; i < LAMS.length; i++) {
      const I = mode === 'coat' ? 1 - sinI(n, t, LAMS[i]) : sinI(n, t, LAMS[i]);
      s[0] += LCOL[i][0] * I; s[1] += LCOL[i][1] * I; s[2] += LCOL[i][2] * I;
    }
    return [0, 1, 2].map((k) => Math.round(255 * gam(s[k] / LREF[k] * 1.5)));
  }
  const WLUT = []; for (let t = 0; t <= 1200; t++) WLUT.push(whiteColor(t, N_SOAP, 'film'));
  function filmRGB(light, t) {
    if (light === 'white') return WLUT[clamp(Math.round(t), 0, 1200)];
    const lam = MONO[light], I = sinI(N_SOAP, t, lam), c = wlRGB(lam);
    const k = 0.05 + 0.95 * I;
    return [Math.round(c[0] * k), Math.round(c[1] * k), Math.round(c[2] * k)];
  }

  /* ---------- 장면 배치 ---------- */
  const MA = PHONE ? { x: 8, y: 8, w: 464, h: 388 } : { x: 12, y: 12, w: 776, h: 414 };
  const BOT = PHONE ? { x: 8, y: 404, w: 464, h: 228 } : { x: 12, y: 436, w: 776, h: 112 };

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'phase', t: 0, fade: 0, dt: 0.016,
    show: { selA: false, selB: false, num: false, selC: false },
    ph: { n1: 1.0, n2: 1.0, rope: 'fixed', rt: 0, seen: { fixed: false, free: false }, seenFlip: false, seenSame: false, hold: 0, holdState: '' },
    fl: { light: '532', tau: 0, play: false, probe: 3.0, drag: false, seenGreen: false, seenWhite: false, maxTau: 0, newCount: 0 },
    cd: { t: 0, tD: 0, lam: 532, found: { 0: false, 1: false, 2: false }, ph: 0 },
    ap: { sub: 'coat', t: 40, tD: 40, found: false, tblOpen: false, seenEx: false, drag: false },
  };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const MODE_LABEL = { phase: '🧵 반사와 위상', film: '🫧 비누막 관찰', cond: '📐 간섭 조건', app: '🔍 박막 기술' };
  const fmt1 = (x) => x.toFixed(1);
  const n2s = (n) => n.toFixed(2);

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
      if (on && sub && S.mode === 'app') on = sub === S.ap.sub;
      const dm = n.getAttribute('data-match');
      if (on && dm) on = !!S.show[dm];
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    ropeSeg.set(S.ph.rope); lgSeg.set(S.fl.light); lamSeg.set(String(S.cd.lam)); apSeg.set(S.ap.sub);
    $('#bPlay').textContent = S.fl.play ? '⏸ 멈추기' : (S.fl.tau >= TAU_MAX ? '▶ 처음부터' : '▶ 시간 흐르게');
    $('#oTau').textContent = Math.round(S.fl.tau) + ' 초';
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));

  /* ---------- 컨트롤 연결 ---------- */
  const ropeSeg = bindSeg('ropeSeg', (v) => { S.ph.rope = v; S.ph.rt = 0; updateCtl(); });
  const lgSeg = bindSeg('lgSeg', (v) => { S.fl.light = v; if (v === '532') S.fl.seenGreen = true; if (v === 'white') S.fl.seenWhite = true; updateCtl(); });
  const lamSeg = bindSeg('lamSeg', (v) => { S.cd.lam = +v; updateCtl(); });
  const apSeg = bindSeg('apSeg', (v) => { S.ap.sub = v; if (v === 'ex') S.ap.seenEx = true; updateCtl(); });
  const slN1 = bindSlider('sN1', (v) => (v / 100).toFixed(2), (v) => { S.ph.n1 = v / 100; });
  const slN2 = bindSlider('sN2', (v) => (v / 100).toFixed(2), (v) => { S.ph.n2 = v / 100; });
  const slT = bindSlider('sT', (v) => v + ' nm', (v) => { S.cd.t = +v; });
  const slTc = bindSlider('sTc', (v) => v + ' nm', (v) => { S.ap.t = +v; });
  $('#bPlay').addEventListener('click', () => {
    Sound.click();
    if (!S.fl.play && S.fl.tau >= TAU_MAX) { S.fl.tau = 0; }
    S.fl.play = !S.fl.play; updateCtl();
  });
  $('#bNew').addEventListener('click', () => { Sound.click(); S.fl.tau = 0; S.fl.play = false; parts.clear(); updateCtl(); });
  $('#inTmin').addEventListener('input', () => { $('#inTmin').classList.remove('ok', 'bad'); });

  const SEL_A = mkSelRows('selA', [
    { q: '줄의 <b>고정단(벽)</b>에서 반사한 펄스는', opts: ['위아래가 뒤집혀요', '그대로예요'], ans: 0 },
    { q: '줄의 <b>자유단(고리)</b>에서 반사한 펄스는', opts: ['위아래가 뒤집혀요', '그대로예요'], ans: 1 },
    { q: '굴절률이 <b>작은 쪽에서 큰 쪽</b>(공기 → 유리)으로 가는 경계에서 반사한 빛은', opts: ['고정단처럼 위상이 π 바뀌어요', '자유단처럼 위상이 그대로예요'], ans: 0 },
    { q: '굴절률이 <b>큰 쪽에서 작은 쪽</b>(유리 → 공기)으로 가는 경계에서 반사한 빛은', opts: ['고정단처럼 위상이 π 바뀌어요', '자유단처럼 위상이 그대로예요'], ans: 1 },
  ]);
  const SEL_B = mkSelRows('selB', [
    { q: '맨 위(t → 0)에서 두 반사광의 <b>광로차</b>는', opts: ['거의 0이에요', '반 파장이에요', '한 파장이에요'], ans: 0 },
    { q: '그런데 반사할 때 위상이 반 파장 바뀌는 쪽은', opts: ['앞면(공기 → 비눗물)만', '뒷면(비눗물 → 공기)만', '앞면과 뒷면 모두'], ans: 0 },
    { q: '그래서 두 반사광은 서로', opts: ['상쇄돼서 검게 보여요', '보강돼서 가장 밝게 보여요', '아무 영향이 없어요'], ans: 0 },
  ]);
  const SEL_C = mkSelRows('selC', [
    { q: '<b>비누막</b>(공기 → 비눗물 → 공기)에서 위상이 π 바뀌는 반사는', opts: ['앞면만', '뒷면만', '앞면과 뒷면 모두'], ans: 0 },
    { q: '<b>무반사 코팅</b>(공기 → MgF₂ → 유리)에서 위상이 π 바뀌는 반사는', opts: ['앞면만', '뒷면만', '앞면과 뒷면 모두'], ans: 2 },
    { q: '코팅에서 두 반사광이 서로 <b>상쇄</b>되는 조건은', opts: ['2nt = mλ', '2nt = (m + ½)λ'], ans: 1 },
    { q: '기름막이 뜬 물웅덩이가 <b>무지갯빛</b>인 까닭은', opts: ['막 두께가 곳곳에서 달라 보강되는 색이 다르기 때문', '기름이 여러 가지 색소를 품고 있기 때문'], ans: 0 },
  ]);

  /* ================= ① 반사와 위상 ================= */
  function phState() {
    const a = S.ph.n1, b = S.ph.n2;
    if (Math.abs(a - b) < 0.025) return 'none';
    return a < b ? 'flip' : 'same';
  }
  const phLay = () => PHONE
    ? { a: { x: MA.x, y: MA.y, w: MA.w, h: 148 }, b: { x: MA.x, y: MA.y + 156, w: MA.w, h: MA.h - 156 } }
    : { a: { x: MA.x, y: MA.y, w: 380, h: MA.h }, b: { x: MA.x + 392, y: MA.y, w: 384, h: MA.h } };
  const RP = { amp: 40, sig: 24, v: 150 };
  function ropePulse(u) { return RP.amp * (PHONE ? 0.72 : 1) * Math.exp(-(u * u) / (RP.sig * RP.sig)); }
  function ropeL() { const a = phLay().a; return a.w - (PHONE ? 70 : 96); }
  function ropeCycle() { return (2 * ropeL() + 200) / RP.v; }
  function stepPhase(dt) {
    const P = S.ph;
    P.rt += dt;
    if (P.rt > ropeCycle()) P.rt = 0;
    const c = -100 + RP.v * P.rt;
    if (c > ropeL() + 70) P.seen[P.rope] = true;
    const st = phState();
    if (S.mode === 'phase') {
      if (st === P.holdState) P.hold += dt; else { P.holdState = st; P.hold = 0; }
      if (P.hold > 0.8) { if (st === 'flip') P.seenFlip = true; if (st === 'same') P.seenSame = true; }
    }
  }
  function drawPanelTitle(p, s, col) { panel(p.x, p.y, p.w, p.h, 14); T(p.x + 14, p.y + 24, s, PHONE ? 14 : 15, col || '#26324a', 'left', 800); }
  function drawPhase() {
    const L = phLay(), P = S.ph;
    /* --- 줄 파동 --- */
    const a = L.a;
    drawPanelTitle(a, '🧵 줄 파동의 반사');
    const Ln = ropeL(), xs = a.x + 12, ym = a.y + (PHONE ? 84 : 158), pol = (PHONE ? 52 : 108);
    const c = -100 + RP.v * P.rt, s = P.rope === 'fixed' ? -1 : 1;
    const yAt = (u) => ropePulse(u - c) + s * ropePulse(2 * Ln - u - c);
    // 벽 또는 기둥+고리
    const xe = xs + Ln;
    if (P.rope === 'fixed') {
      D.shadow(() => { ctx.fillStyle = '#7b8798'; ctx.fillRect(xe, ym - pol, 16, pol * 2); }, { blur: 6, y: 2 });
      ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2;
      for (let k = -pol; k < pol; k += 14) { ctx.beginPath(); ctx.moveTo(xe, ym + k + 14); ctx.lineTo(xe + 16, ym + k); ctx.stroke(); }
      ctx.restore();
    } else {
      ctx.fillStyle = '#9aa6b8'; ctx.fillRect(xe + 6, ym - pol, 5, pol * 2);
      ctx.fillStyle = '#7b8798'; D.roundRect(xe + 1, ym - pol - 6, 15, 8, 3); ctx.fill(); D.roundRect(xe + 1, ym + pol - 2, 15, 8, 3); ctx.fill();
    }
    // 줄: 합성 (진한 회색) + 입사 펄스(파랑) + 반사 펄스(주황)
    const pts = [];
    for (let u = 0; u <= Ln; u += 3) pts.push([xs + u, ym - yAt(u)]);
    pts.push([xe, ym - yAt(Ln)]);
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = '#3d4658'; ctx.lineWidth = 3.4; ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.stroke();
    const seg = (fn, col) => {
      ctx.strokeStyle = col; ctx.lineWidth = 6; let on = false; ctx.beginPath();
      for (let u = 0; u <= Ln; u += 3) { const y = fn(u); if (Math.abs(y) > 1.2) { const px = xs + u, py = ym - y; if (!on) { ctx.moveTo(px, py); on = true; } else ctx.lineTo(px, py); } else on = false; }
      ctx.stroke();
    };
    ctx.globalAlpha = 0.78; seg((u) => ropePulse(u - c), '#2f6bff'); seg((u) => s * ropePulse(2 * Ln - u - c), '#f26b3a'); ctx.globalAlpha = 1;
    ctx.restore();
    if (P.rope === 'free') { // 고리가 기둥 위를 미끄러져요
      ctx.strokeStyle = '#3d4658'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(xe + 8.5, ym - clamp(yAt(Ln), -pol + 8, pol - 8), 7, 0, TAU); ctx.stroke();
    }
    // 설명
    const fixed = P.rope === 'fixed';
    const cx0 = a.x + a.w / 2;
    T(a.x + 14, a.y + a.h - (PHONE ? 30 : 56), fixed ? '고정단: 반사 펄스가 위아래로 뒤집혀요 (위상 π)' : '자유단: 반사 펄스가 그대로예요 (위상 변화 없음)', PHONE ? 13 : 14.5, fixed ? '#c4501b' : '#1c7a4a', 'left', 800);
    T(a.x + 14, a.y + a.h - (PHONE ? 10 : 30), '파랑: 입사 펄스   주황: 반사 펄스   회색: 줄의 모양', PHONE ? 12 : 13, '#5d6879', 'left', 700);
    if (!PHONE) T(a.x + 14, a.y + 46, '왼쪽에서 오는 펄스가 오른쪽 끝에서 반사돼요', 13, '#5d6879', 'left', 700);

    /* --- 빛의 반사 --- */
    const b = L.b;
    drawPanelTitle(b, '💡 두 매질의 경계에서 빛의 반사');
    const st = phState(), th = 24 * rad, sinT = Math.sin(th), cosT = Math.cos(th);
    const mx = b.x + 10, mw = b.w - 20, upT = b.y + 38, upH = PHONE ? 66 : 112, loH = PHONE ? 44 : 84, yI = upT + upH;
    const shade = (n) => { const k = (n - 1) / 1; const r = Math.round(236 - 70 * k), g = Math.round(244 - 56 * k), bl = Math.round(255 - 10 * k); return 'rgb(' + r + ',' + g + ',' + bl + ')'; };
    ctx.fillStyle = shade(P.n1); ctx.fillRect(mx, upT, mw, upH);
    ctx.fillStyle = shade(P.n2); ctx.fillRect(mx, yI, mw, loH);
    ctx.strokeStyle = '#7b8798'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mx, yI); ctx.lineTo(mx + mw, yI); ctx.stroke();
    ctx.strokeStyle = '#c3cbdb'; ctx.lineWidth = 1; ctx.strokeRect(mx, upT, mw, upH + loH);
    const nm = (n) => (Math.abs(n - 1) < 0.03 ? ' (공기)' : Math.abs(n - 1.33) < 0.03 ? ' (물)' : Math.abs(n - 1.5) < 0.03 ? ' (유리)' : '');
    T(mx + 8, upT + 18, 'n₁ = ' + n2s(P.n1) + nm(P.n1), PHONE ? 13 : 14.5, '#26324a', 'left', 800);
    T(mx + 8, yI + 20, 'n₂ = ' + n2s(P.n2) + nm(P.n2), PHONE ? 13 : 14.5, '#26324a', 'left', 800);
    const Ox = mx + mw * 0.5, Lr = (upH - 12) / cosT;
    const ray = (ox, oy, dx, dy, px, py, u0, u1, A, kk, ph, col, al) => {
      ctx.save(); ctx.strokeStyle = col; ctx.globalAlpha = al; ctx.lineWidth = 3.2; ctx.lineCap = 'round'; ctx.beginPath();
      for (let u = u0; u <= u1; u += 2) {
        const w = A * Math.sin(kk * u - TAU * 0.9 * S.t + ph);
        const X = ox + dx * u + px * w, Y = oy + dy * u + py * w;
        if (u === u0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
      }
      ctx.stroke(); ctx.restore();
    };
    const kk = (n) => TAU * n / 36;
    ray(Ox, yI, sinT, cosT, cosT, -sinT, -Lr, 0, 8, kk(P.n1), 0, '#2f6bff', 1);
    // 줄이 위로 가는 쪽에 입사 화살표
    const ax = Ox - sinT * Lr * 0.55, ay = yI - cosT * Lr * 0.55;
    D.arrow(ax - sinT * 6, ay - cosT * 6, ax + sinT * 10, ay + cosT * 10, { color: '#2f6bff', width: 3, head: 11 });
    const rr = st === 'none' ? 0 : Math.min(1, 2.6 * Math.abs(P.n1 - P.n2) / (P.n1 + P.n2));
    const flipPh = st === 'flip' ? Math.PI : 0;
    if (rr > 0) {
      ray(Ox, yI, sinT, -cosT, cosT, sinT, 0, Lr, 8 * rr, kk(P.n1), flipPh, '#f26b3a', 1);
      const bx = Ox + sinT * Lr * 0.55, by = yI - cosT * Lr * 0.55;
      D.arrow(bx - sinT * 6, by + cosT * 6, bx + sinT * 10, by - cosT * 10, { color: '#f26b3a', width: 3, head: 11 });
    }
    // 투과 (스넬 법칙)
    const sT2 = Math.min(0.999, P.n1 * sinT / P.n2), cT2 = Math.sqrt(1 - sT2 * sT2), Lt = (loH - 8) / cT2;
    ray(Ox, yI, sT2, cT2, cT2, -sT2, 0, Lt, 7 * (1 - 0.35 * rr), kk(P.n2), 0, '#2f6bff', 0.55);
    // 배지
    const bw = b.w - 24, by0 = b.y + 38 + upH + loH + 12;
    const txt = st === 'flip' ? '반사 위상 변화: π (반 파장) — 뒤집혀요' : st === 'same' ? '반사 위상 변화: 없음 — 그대로예요' : '굴절률이 같아서 반사가 거의 없어요';
    D.label(b.x + b.w / 2, by0 + 6, txt, { size: PHONE ? 13 : 14.5, bg: st === 'flip' ? '#e8501b' : st === 'same' ? '#1c8a52' : '#7b8798' });
    // 경계에서의 진동 (오실로스코프)
    const ox = b.x + 14, ow = b.w - 28, oy = by0 + 26, oh = b.y + b.h - oy - 10;
    if (oh > 30) {
      ctx.fillStyle = '#f7f9fd'; D.roundRect(ox, oy, ow, oh, 10); ctx.fill();
      const mid = oy + oh / 2, A = Math.min(oh * 0.34, 26);
      ctx.strokeStyle = '#d6dcea'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ox + 4, mid); ctx.lineTo(ox + ow - 4, mid); ctx.stroke();
      const trace = (amp, ph, col) => {
        ctx.strokeStyle = col; ctx.lineWidth = 2.6; ctx.beginPath();
        for (let i = 0; i <= ow - 70; i += 3) { const th2 = TAU * ((i / 70) - 0.9 * S.t); const y = mid - amp * A * Math.sin(th2 + ph); if (i === 0) ctx.moveTo(ox + 62 + i, y); else ctx.lineTo(ox + 62 + i, y); }
        ctx.stroke();
      };
      trace(1, 0, '#2f6bff'); if (rr > 0) trace(rr, flipPh, '#f26b3a');
      T(ox + 8, oy + 16, '입사파', 12.5, '#2f6bff', 'left', 800); T(ox + 8, oy + 34, rr > 0 ? '반사파' : '(없음)', 12.5, '#f26b3a', 'left', 800);
      if (rr > 0) { // 입사파의 마루 기준선
        ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = '#9aa6b8'; ctx.lineWidth = 1;
        const base = 70 * ((0.25 + 0.9 * S.t) % 1);
        for (let xx = ox + 62 + base; xx < ox + ow - 8; xx += 70) { ctx.beginPath(); ctx.moveTo(xx, oy + 4); ctx.lineTo(xx, oy + oh - 4); ctx.stroke(); }
        ctx.restore();
      }
    }
    // 줄과 빛의 대응 표시
    if (st !== 'none') {
      const match = (st === 'flip') === (P.rope === 'fixed');
      if (match && !PHONE) D.label(b.x + b.w - 70, b.y + 22, '줄: ' + (P.rope === 'fixed' ? '고정단' : '자유단') + '과 같아요', { size: 12.5, bg: '#14a058' });
    }
  }

  /* ================= ② 비누막 관찰 ================= */
  const flLay = () => PHONE
    ? { FX: 52, FY: MA.y + 40, FW: 120, FH: 296, WX: 214, WW: 150, RX: 0 }
    : { FX: 78, FY: MA.y + 40, FW: 200, FH: 340, WX: 328, WW: 150, RX: 540 };
  function markLines(light, tau) {          // 막 두께가 mλ/2n (어두움) 또는 (m+½)λ/2n (밝음)인 위치 (cm)
    if (light === 'white') return [];
    const lam = MONO[light], half = lam / (2 * N_SOAP), sl = slopeAt(tau), out = [];
    for (let m = 0; m <= 40; m++) {
      const yd = m * half / sl, yb = (m + 0.5) * half / sl;
      if (yd <= H_CM + 1e-6) out.push({ y: yd, dark: true, t: m * half }); else break;
      if (yb <= H_CM + 1e-6) out.push({ y: yb, dark: false, t: (m + 0.5) * half });
    }
    return out.sort((p, q) => p.y - q.y);
  }
  function stepFilm(dt) {
    const F = S.fl;
    if (F.play) {
      F.tau = Math.min(TAU_MAX, F.tau + dt * 3);
      if (F.tau >= TAU_MAX) { F.play = false; updateCtl(); }
      if (!RM && Math.random() < dt * 6) { const L = flLay(); parts.emit({ x: L.FX + L.FW * (0.2 + Math.random() * 0.6), y: L.FY + L.FH + 6, vy: 40, gravity: 420, life: 0.9, size: 3, color: '#a9d6ff', shape: 'bubble' }); }
    }
    F.maxTau = Math.max(F.maxTau, F.tau);
    if (S.mode === 'film') $('#oTau').textContent = Math.round(F.tau) + ' 초';
  }
  function drawFilm() {
    const L = flLay(), F = S.fl, ppc = L.FH / H_CM, kT = L.WW / 900 ;
    const yOf = (cm) => L.FY + cm * ppc;
    // 틀 뒤 판
    panel(MA.x, MA.y, MA.w, MA.h, 14);
    T(MA.x + 14, MA.y + 24, '🫧 세워 둔 비누막 (옆에서 본 단면은 오른쪽)', PHONE ? 13.5 : 15, '#26324a', 'left', 800);
    // 눈금자
    ctx.save(); ctx.strokeStyle = '#5d6879'; ctx.fillStyle = '#5d6879'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(L.FX - 12, L.FY); ctx.lineTo(L.FX - 12, L.FY + L.FH); ctx.stroke();
    for (let c = 0; c <= H_CM; c++) { ctx.beginPath(); ctx.moveTo(L.FX - 18, yOf(c)); ctx.lineTo(L.FX - 12, yOf(c)); ctx.stroke(); if (c % 2 === 0 || !PHONE) T(L.FX - 22, yOf(c) + 4, String(c), 12, '#5d6879', 'right', 700); }
    ctx.restore();
    T(L.FX - 36, L.FY - 8, 'cm', 12, '#5d6879', 'right', 700);
    // 막 (가로 줄마다 색을 계산)
    D.shadow(() => { ctx.fillStyle = '#222'; D.roundRect(L.FX - 6, L.FY - 6, L.FW + 12, L.FH + 12, 8); ctx.fill(); }, { blur: 10, y: 4 });
    ctx.save(); D.roundRect(L.FX, L.FY, L.FW, L.FH, 4); ctx.clip();
    const rowH = 2;
    for (let y = 0; y < L.FH; y += rowH) {
      const cm = (y + rowH / 2) / ppc, t = thickAt(cm, F.tau);
      ctx.fillStyle = rgbCss(filmRGB(F.light, t)); ctx.fillRect(L.FX, L.FY + y, L.FW, rowH + 0.6);
    }
    const g = ctx.createLinearGradient(L.FX, 0, L.FX + L.FW, 0);
    g.addColorStop(0, 'rgba(255,255,255,.22)'); g.addColorStop(0.18, 'rgba(255,255,255,0)'); g.addColorStop(0.85, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.18)');
    ctx.fillStyle = g; ctx.fillRect(L.FX, L.FY, L.FW, L.FH);
    ctx.restore();
    ctx.strokeStyle = '#6d7686'; ctx.lineWidth = 2.5; D.roundRect(L.FX - 6, L.FY - 6, L.FW + 12, L.FH + 12, 8); ctx.stroke();
    // 단면 (쐐기)
    const wx = L.WX;
    T(wx, MA.y + 24, '단면 (두께를 크게 그렸어요)', PHONE ? 12.5 : 13.5, '#5d6879', 'left', 800);
    ctx.save();
    const wg = ctx.createLinearGradient(wx, 0, wx + L.WW, 0); wg.addColorStop(0, '#bfe3ff'); wg.addColorStop(1, '#8cc6f2');
    ctx.fillStyle = wg; ctx.strokeStyle = '#4e86b3'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(wx, L.FY);
    const nSeg = 40; for (let i = 0; i <= nSeg; i++) { const cm = H_CM * i / nSeg; ctx.lineTo(wx + thickAt(cm, F.tau) * kT, yOf(cm)); }
    ctx.lineTo(wx, L.FY + L.FH); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = '#7b8798'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(wx, L.FY - 6); ctx.lineTo(wx, L.FY + L.FH + 6); ctx.stroke();
    T(wx - 6, L.FY + L.FH + 20, '공기', 12.5, '#5d6879', 'right', 700);
    // 줄 위치 표시
    const marks = markLines(F.light, F.tau);
    let lastY = -99;
    marks.forEach((mk) => {
      const yy = yOf(mk.y), xr = wx + thickAt(mk.y, F.tau) * kT;
      ctx.save(); ctx.strokeStyle = mk.dark ? 'rgba(20,20,40,.55)' : 'rgba(255,190,0,.95)'; ctx.lineWidth = 1.6; ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.moveTo(L.FX + L.FW + 8, yy); ctx.lineTo(xr, yy); ctx.stroke(); ctx.restore();
      if (yy - lastY >= 17) {
        T(xr + 6, yy + 4, Math.round(mk.t) + ' nm', 12, mk.dark ? '#26324a' : '#a06c00', 'left', 800); lastY = yy;
      }
    });
    // 탐침
    const py = yOf(F.probe), pt = thickAt(F.probe, F.tau), pxr = wx + pt * kT;
    ctx.save(); ctx.strokeStyle = '#e8501b'; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(L.FX - 8, py); ctx.lineTo(Math.max(pxr, L.FX + L.FW + 8), py); ctx.stroke(); ctx.restore();
    ctx.fillStyle = '#e8501b'; ctx.beginPath(); ctx.moveTo(L.FX - 8, py); ctx.lineTo(L.FX - 22, py - 9); ctx.lineTo(L.FX - 22, py + 9); ctx.closePath(); ctx.fill();
    D.sphere(pxr, py, 6, '#e8501b', { gloss: false });
    // 위쪽 검은 띠 안내
    const topBlack = F.light === 'white' ? thickAt(1, F.tau) < 90 : true;
    if (topBlack) D.label(L.FX + L.FW / 2, L.FY + 14, '맨 위는 검어요', { size: PHONE ? 12 : 13, bg: 'rgba(255,255,255,.88)', color: '#26324a' });
    // 오른쪽 안내 칸 (태블릿)
    const info = F.light === 'white' ? null : { lam: MONO[F.light] };
    if (!PHONE) {
      const rx = L.RX, rw = MA.x + MA.w - rx - 12, ry = MA.y + 44;
      ctx.fillStyle = '#f7f9fd'; D.roundRect(rx, ry, rw, 236, 12); ctx.fill();
      T(rx + 12, ry + 24, '🔎 줄무늬 읽기', 14.5, '#26324a', 'left', 800);
      if (info) {
        const half = info.lam / (2 * N_SOAP), gap = half / slopeAt(F.tau);
        T(rx + 12, ry + 50, '빛의 파장 ' + info.lam + ' nm', 13.5, wlColor(info.lam), 'left', 800, { stroke: '#fff', strokeWidth: 3 });
        T(rx + 12, ry + 74, '밝은 줄 사이 간격: ' + gap.toFixed(1) + ' cm', 13.5, '#26324a', 'left', 800);
        T(rx + 12, ry + 96, '→ 두께 변화 ' + Math.round(half) + ' nm에 해당', 13.5, '#26324a', 'left', 800);
        const dk = marks.filter((m) => m.dark).map((m) => m.y.toFixed(1));
        T(rx + 12, ry + 124, '어두운 줄의 깊이 (cm)', 13, '#5d6879', 'left', 800);
        for (let i = 0; i * 4 < dk.length && i < 3; i++) T(rx + 12, ry + 144 + i * 18, dk.slice(i * 4, i * 4 + 4).join('  ·  '), 13, '#26324a', 'left', 800);
        T(rx + 12, ry + 200, '짧은 파장일수록 줄 간격이 좁아요', 12.5, '#5d6879', 'left', 700);
      } else {
        const lines = wrap('백색광에는 여러 파장이 섞여 있어요. 파장마다 밝은 위치가 달라서 같은 높이에서도 색이 달라지고 색 띠가 생겨요.', rw - 24, 13.5, 700);
        lines.forEach((s2, i) => T(rx + 12, ry + 52 + i * 20, s2, 13.5, '#26324a', 'left', 700));
      }
    }
    // 광원과 눈
    T(MA.x + MA.w - 20, MA.y + 26, '💡👁', 22, '#26324a', 'right', 700);
    // 아래 설명
    const tau = F.tau, dtxt = tau < 1 ? '새로 만든 막이에요. 위에서 아래로 갈수록 두꺼워요.' : tau >= TAU_MAX ? '막이 아주 얇아졌어요. 곧 터질 거예요.' : '시간이 흐르면 막이 아래로 흘러내려 줄이 내려가고 검은 띠가 넓어져요.';
    panel(BOT.x, BOT.y, BOT.w, BOT.h, 14);
    textBlock(BOT.x + 16, BOT.y + 28, BOT.w - 32, dtxt, PHONE ? 14 : 15, '#26324a', 21, 800);
    textBlock(BOT.x + 16, BOT.y + 28 + (PHONE ? 66 : 48), BOT.w - 32, '막이 얇은 쐐기 모양이라 높이마다 두께가 달라요. 두께에 따라 앞면과 뒷면에서 반사한 두 빛이 보강하거나 상쇄해서 가로 줄무늬가 보여요.', PHONE ? 13 : 13.5, '#5d6879', 19, 700);
  }

  /* ================= ③ 간섭 조건 ================= */
  const cdLay = () => PHONE
    ? { sv: { x: MA.x, y: MA.y, w: MA.w, h: 142 }, osc: { x: MA.x, y: MA.y + 148, w: MA.w, h: 106 }, gr: { x: MA.x + 44, y: MA.y + 282, w: MA.w - 62, h: 62 }, cb: { x: MA.x + 6, y: MA.y + 368, w: MA.w - 70, h: 12 } }
    : { sv: { x: MA.x, y: MA.y, w: 436, h: 236 }, osc: { x: MA.x, y: MA.y + 244, w: 436, h: 170 }, gr: { x: MA.x + 506, y: MA.y + 34, w: 250, h: 190 }, cb: { x: MA.x + 450, y: MA.y + 322, w: 250, h: 22 } };
  function cdState() {
    const C2 = S.cd, a = sinA(N_SOAP, C2.t, C2.lam);
    return { amp: a, kind: a >= T_BRIGHT ? 'bright' : a <= T_DARK ? 'dark' : 'mid', path: 2 * N_SOAP * C2.t, m: 2 * N_SOAP * C2.t / C2.lam };
  }
  // 532 nm에서 보강이 되는 두께 번호 (t = 100, 300, 500 nm 근처) → 0, 1, 2
  function brightIdx(t, lam) {
    const half = lam / (2 * N_SOAP);
    const m = Math.round(t / half - 0.5);
    return m;
  }
  function stepCond(dt) {
    const C2 = S.cd;
    C2.tD = SciSim.approach(C2.tD, C2.t, dt, 12);
    C2.ph += dt;
    if (S.mode === 'cond' && C2.lam === 532) {
      const st = cdState();
      if (st.kind === 'bright') { const m = brightIdx(C2.t, 532); if (m >= 0 && m <= 2) C2.found[m] = true; }
    }
  }
  function drawCond() {
    const L = cdLay(), C2 = S.cd, lam = C2.lam, col = wlColor(lam), st = cdState();
    const tD = C2.tD;
    /* --- 옆에서 본 막과 두 반사광 --- */
    const sv = L.sv; panel(sv.x, sv.y, sv.w, sv.h, 14);
    T(sv.x + 14, sv.y + 22, PHONE ? '두 반사광' : '막의 앞면과 뒷면에서 반사하는 두 빛', PHONE ? 13 : 14.5, '#26324a', 'left', 800);
    const kPx = PHONE ? 0.1 : 0.12, tp = Math.max(2, tD * kPx);
    const yT = sv.y + sv.h * 0.56, th = 26 * rad, tt = Math.asin(Math.sin(th) / N_SOAP);
    const ax = sv.x + sv.w * (PHONE ? 0.3 : 0.28), sx = sv.x + 16, sw = sv.w - 32;
    // 막
    ctx.fillStyle = '#cfe9ff'; ctx.fillRect(sx, yT, sw, tp);
    ctx.strokeStyle = '#6aa6d6'; ctx.lineWidth = 1.5; ctx.strokeRect(sx, yT, sw, tp);
    T(sx + sw - 6, yT + tp + 16, '비눗물 막 n = ' + N_SOAP.toFixed(2), PHONE ? 12 : 13, '#2e6a9a', 'right', 800);
    T(sx + sw - 6, yT - 8, '공기', 12.5, '#5d6879', 'right', 700);
    // 광선
    const Lr = sv.h * 0.32;
    const Bx = ax + tp * Math.tan(tt), Cx = ax + 2 * tp * Math.tan(tt);
    ctx.lineCap = 'round';
    // 입사
    ctx.strokeStyle = col; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(ax - Math.sin(th) * Lr, yT - Math.cos(th) * Lr); ctx.lineTo(ax, yT); ctx.stroke();
    D.arrow(ax - Math.sin(th) * Lr * 0.5 - Math.sin(th) * 6, yT - Math.cos(th) * Lr * 0.5 - Math.cos(th) * 6, ax - Math.sin(th) * Lr * 0.5 + Math.sin(th) * 8, yT - Math.cos(th) * Lr * 0.5 + Math.cos(th) * 8, { color: col, width: 3, head: 10 });
    // 반사 1 (앞면)
    ctx.strokeStyle = '#2f6bff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(ax, yT); ctx.lineTo(ax + Math.sin(th) * Lr, yT - Math.cos(th) * Lr); ctx.stroke();
    // 안으로 들어가 뒷면에서 반사해 나오는 빛 (광로차 2nt 구간 강조)
    ctx.strokeStyle = '#f26b3a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(ax, yT); ctx.lineTo(Bx, yT + tp); ctx.lineTo(Cx, yT); ctx.lineTo(Cx + Math.sin(th) * Lr, yT - Math.cos(th) * Lr); ctx.stroke();
    ctx.save(); ctx.strokeStyle = 'rgba(242,107,58,.28)'; ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(ax, yT); ctx.lineTo(Bx, yT + tp); ctx.lineTo(Cx, yT); ctx.stroke(); ctx.restore();
    D.label(ax + Math.sin(th) * Lr * 0.8 + 6, yT - Math.cos(th) * Lr - 10, '① 앞면 반사  위상 π 변화', { size: PHONE ? 11.5 : 12.5, bg: '#2f6bff', align: 'left' });
    D.label(Math.min(Cx + Math.sin(th) * Lr * 0.9, sv.x + sv.w - 150), yT - Math.cos(th) * Lr * 0.45, '② 뒷면 반사', { size: PHONE ? 11.5 : 12.5, bg: '#f26b3a', align: 'left' });
    if (tp > 12) D.label(ax - 4, yT + tp + 16, '광로차 2nt = ' + Math.round(st.path) + ' nm', { size: PHONE ? 11.5 : 12.5, bg: '#fff', color: '#c4501b', border: '#f26b3a', align: 'left' });
    T(sv.x + sv.w - 14, sv.y + 22, 't = ' + Math.round(C2.t) + ' nm', PHONE ? 13 : 14.5, '#c4501b', 'right', 800);
    if (!PHONE) T(sv.x + 14, sv.y + sv.h - 10, '(두께와 기울기는 구분하려고 크게 그렸어요. 수직 입사로 다뤄요)', 12, '#5d6879', 'left', 700);
    /* --- 합성 (오실로스코프) --- */
    const o = L.osc; panel(o.x, o.y, o.w, o.h, 14);
    const rows = [
      { lab: '① 앞면 반사광', ph: Math.PI, amp: 1, c: '#2f6bff', h: 0.26 },
      { lab: '② 뒷면 반사광', ph: -TAU * st.m, amp: 1, c: '#f26b3a', h: 0.26 },
      { lab: '합성한 빛', ph: null, amp: 0, c: '#7a3cff', h: 0.48 },
    ];
    let cy0 = o.y + 8;
    const wX = o.x + (PHONE ? 100 : 128), wW = o.w - (PHONE ? 100 : 128) - 14, gt = TAU * (C2.ph * 0.9);
    rows.forEach((r) => {
      const hh = (o.h - 20) * r.h, mid = cy0 + hh / 2, A = (o.h - 20) * 0.26 * 0.42;
      ctx.strokeStyle = '#e1e6f0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(wX, mid); ctx.lineTo(wX + wW, mid); ctx.stroke();
      T(o.x + 12, mid + 4, r.lab, PHONE ? 12 : 13, r.c, 'left', 800);
      ctx.strokeStyle = r.c; ctx.lineWidth = 2.6; ctx.beginPath();
      for (let i = 0; i <= wW; i += 3) {
        const x = i / (PHONE ? 54 : 70) * TAU;
        const y1 = Math.sin(x - gt + Math.PI), y2 = Math.sin(x - gt - TAU * st.m);
        const v = r.ph == null ? y1 + y2 : Math.sin(x - gt + r.ph);
        if (i === 0) ctx.moveTo(wX + i, mid - v * A); else ctx.lineTo(wX + i, mid - v * A);
      }
      ctx.stroke();
      if (r.ph == null) {
        const lbl = st.kind === 'bright' ? '보강 · 밝아요' : st.kind === 'dark' ? '상쇄 · 어두워요' : '일부만 보강';
        D.label(o.x + o.w - 80, mid - hh * 0.36, lbl, { size: 12.5, bg: st.kind === 'bright' ? '#14a058' : st.kind === 'dark' ? '#4a5568' : '#c98a00' });
      }
      cy0 += hh + 3;
    });
    /* --- 합성 진폭 그래프 --- */
    const gr = L.gr;
    if (!PHONE) { panel(gr.x - 56, gr.y - 34, gr.w + 66, gr.h + 74, 14); T(gr.x - 44, gr.y - 12, '합성한 빛의 진폭 (A의 배수)', 13.5, '#26324a', 'left', 800); }
    const ax2 = axes(gr.x, gr.y, gr.w, gr.h, { xmin: 0, xmax: 600, ymin: 0, ymax: 2, xt: [[0, '0'], [100, '100'], [200, '200'], [300, '300'], [400, '400'], [500, '500'], [600, '600']], yt: [[0, '0'], [1, '1'], [2, '2']], xl: PHONE ? null : '막 두께 t (nm)', fs: 12 });
    const half = lam / (2 * N_SOAP);
    ctx.save(); ctx.fillStyle = 'rgba(255,190,0,.18)';
    for (let m = 0; (m + 0.5) * half <= 600 + half; m++) { const tb = (m + 0.5) * half; if (tb > 600) break; ctx.fillRect(ax2.X(Math.max(0, tb - 9)), gr.y, ax2.X(Math.min(600, tb + 9)) - ax2.X(Math.max(0, tb - 9)), gr.h); }
    ctx.restore();
    ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath();
    for (let t = 0; t <= 600; t += 4) { const y = 2 * sinA(N_SOAP, t, lam); if (t === 0) ctx.moveTo(ax2.X(t), ax2.Y(y)); else ctx.lineTo(ax2.X(t), ax2.Y(y)); }
    ctx.stroke();
    const cur = 2 * sinA(N_SOAP, tD, lam);
    ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = '#e8501b'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(ax2.X(tD), gr.y); ctx.lineTo(ax2.X(tD), gr.y + gr.h); ctx.stroke(); ctx.restore();
    D.sphere(ax2.X(tD), ax2.Y(cur), 7, '#e8501b', { shadow: true });
    if (PHONE) T(gr.x - 8, gr.y - 8, '합성 진폭 (A의 배수) — 노란 띠: 보강 두께', 12, '#26324a', 'left', 800);
    /* --- 흰빛 색 막대 --- */
    const cb = L.cb;
    if (!PHONE) T(cb.x, cb.y - 10, '백색광에서 막이 보이는 색 (두께에 따라)', 13, '#26324a', 'left', 800);
    for (let i = 0; i < cb.w; i += 2) { ctx.fillStyle = rgbCss(whiteColor(i / cb.w * 600, N_SOAP, 'film')); ctx.fillRect(cb.x + i, cb.y, 2.6, cb.h); }
    ctx.strokeStyle = '#6d7686'; ctx.lineWidth = 1.5; ctx.strokeRect(cb.x, cb.y, cb.w, cb.h);
    const mxp = cb.x + tD / 600 * cb.w;
    ctx.fillStyle = '#e8501b'; ctx.beginPath(); ctx.moveTo(mxp, cb.y + cb.h + 2); ctx.lineTo(mxp - 7, cb.y + cb.h + 13); ctx.lineTo(mxp + 7, cb.y + cb.h + 13); ctx.closePath(); ctx.fill();
    const sw2 = PHONE ? 38 : 46;
    ctx.fillStyle = rgbCss(whiteColor(tD, N_SOAP, 'film')); D.roundRect(PHONE ? cb.x + cb.w + 10 : cb.x + cb.w + 12, cb.y - (PHONE ? 8 : 4), sw2, sw2 * 0.6, 8); ctx.fill(); ctx.strokeStyle = '#6d7686'; ctx.lineWidth = 1.5; ctx.stroke();
    /* --- 아래 설명 --- */
    panel(BOT.x, BOT.y, BOT.w, BOT.h, 14);
    let msg;
    if (st.kind === 'bright') msg = '2nt = ' + Math.round(st.path) + ' nm = ' + (st.m).toFixed(2) + 'λ. 광로차가 (m + ½)λ라서 앞면에서 바뀐 반 파장 위상과 더해져 두 빛이 같은 위상으로 만나요 → 보강!';
    else if (st.kind === 'dark') msg = '2nt = ' + Math.round(st.path) + ' nm = ' + (st.m).toFixed(2) + 'λ. 광로차가 λ의 정수배라서 앞면에서 바뀐 반 파장 위상 때문에 서로 반대 위상으로 만나요 → 상쇄!';
    else msg = '2nt = ' + Math.round(st.path) + ' nm = ' + (st.m).toFixed(2) + 'λ. 보강도 상쇄도 아닌 중간이에요. 두께를 조금 바꾸면 밝기가 오르내려요.';
    textBlock(BOT.x + 16, BOT.y + 28, BOT.w - 32, msg, PHONE ? 14 : 15, '#26324a', 21, 800);
    textBlock(BOT.x + 16, BOT.y + (PHONE ? 106 : 74), BOT.w - 32, '보강: 2nt = (m + ½)λ    상쇄: 2nt = mλ    (m = 0, 1, 2, …)   앞면 반사에서만 위상이 π 바뀌어요.', PHONE ? 13 : 14, '#c4501b', 20, 800);
  }

  /* ================= ④ 박막 기술 ================= */
  function coatR(lam, t) { return 1 - sinI(N_MG, t, lam); }          // 상대 반사 세기 (두 반사광의 세기를 같다고 단순화): cos²(2πnt/λ)
  const apLay = () => PHONE
    ? { sv: { x: MA.x, y: MA.y, w: MA.w, h: 176 }, sp: { x: MA.x + 44, y: MA.y + 208, w: MA.w - 64, h: 68 }, lens: { x: MA.x + 60, y: MA.y + 342 } }
    : { sv: { x: MA.x, y: MA.y, w: 400, h: MA.h }, sp: { x: MA.x + 480, y: MA.y + 60, w: 280, h: 118 }, lens: { x: MA.x + 500, y: MA.y + 296 } };
  function stepApp(dt) {
    const A = S.ap; A.tD = SciSim.approach(A.tD, A.t, dt, 12);
    if (S.mode === 'app' && A.sub === 'coat' && Math.abs(A.t - 99.6) <= 4) A.found = true;
  }
  function drawApp() {
    const L = apLay(), A = S.ap;
    if (A.sub === 'ex') return drawExamples();
    const sv = L.sv; panel(sv.x, sv.y, sv.w, sv.h, 14);
    T(sv.x + 14, sv.y + 22, '렌즈 위의 무반사 코팅', PHONE ? 13 : 14.5, '#26324a', 'left', 800);
    const kPx = PHONE ? 0.22 : 0.62, tp = Math.max(2, A.tD * kPx);
    const yA = sv.y + (PHONE ? 74 : 158), sx = sv.x + 12, sw = sv.w - 24;
    const yG = yA + tp;
    ctx.fillStyle = '#eef6ff'; ctx.fillRect(sx, sv.y + 34, sw, yA - sv.y - 34);
    ctx.fillStyle = '#d6ecff'; ctx.fillRect(sx, yA, sw, tp);
    ctx.fillStyle = '#b9d3ea'; ctx.fillRect(sx, yG, sw, Math.max(0, sv.y + sv.h - (PHONE ? 38 : 46) - yG));
    ctx.strokeStyle = '#7b8798'; ctx.lineWidth = 1.4; ctx.strokeRect(sx, sv.y + 34, sw, sv.h - (PHONE ? 38 : 46) - 34);
    ctx.beginPath(); ctx.moveTo(sx, yA); ctx.lineTo(sx + sw, yA); ctx.moveTo(sx, yG); ctx.lineTo(sx + sw, yG); ctx.stroke();
    T(sx + 8, sv.y + 54, '공기 n = 1.00', 13, '#26324a', 'left', 800);
    T(sx + sw - 8, sv.y + sv.h - (PHONE ? 46 : 54), '유리 n = ' + N_GLASS.toFixed(2), 13, '#26324a', 'right', 800);
    if (tp > 18) T(sx + 8, yA + tp / 2 + 5, 'MgF₂ n = ' + N_MG.toFixed(2), 12.5, '#2e6a9a', 'left', 800);
    else D.label(sx + 74, yA + 8, 'MgF₂ n = ' + N_MG.toFixed(2), { size: 11.5, bg: '#2e6a9a', align: 'left' });
    // 광선 (수직 입사에 가깝게, 구분을 위해 조금 기울여 그려요)
    const th = 14 * rad, tt = Math.asin(Math.sin(th) / N_MG), ax = sx + sw * 0.36, Lr = (yA - sv.y - (PHONE ? 50 : 66));
    const Bx = ax + tp * Math.tan(tt), Cx = ax + 2 * tp * Math.tan(tt);
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#8a6d00'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(ax - Math.sin(th) * Lr, yA - Math.cos(th) * Lr); ctx.lineTo(ax, yA); ctx.stroke();
    D.arrow(ax - Math.sin(th) * Lr * 0.55 - 2, yA - Math.cos(th) * Lr * 0.55 - 6, ax - Math.sin(th) * Lr * 0.55 + 3, yA - Math.cos(th) * Lr * 0.55 + 9, { color: '#8a6d00', width: 3, head: 10 });
    ctx.strokeStyle = '#2f6bff'; ctx.beginPath(); ctx.moveTo(ax, yA); ctx.lineTo(ax + Math.sin(th) * Lr, yA - Math.cos(th) * Lr); ctx.stroke();
    ctx.strokeStyle = '#f26b3a'; ctx.beginPath(); ctx.moveTo(ax, yA); ctx.lineTo(Bx, yG); ctx.lineTo(Cx, yA); ctx.lineTo(Cx + Math.sin(th) * Lr, yA - Math.cos(th) * Lr); ctx.stroke();
    ctx.fillStyle = '#2f6bff'; D.label(ax + Math.sin(th) * Lr + 4, yA - Math.cos(th) * Lr + 4, '① 앞면 반사 π', { size: 12, bg: '#2f6bff', align: 'left' });
    D.label(Math.min(Cx + Math.sin(th) * Lr + 4, sx + sw - 100), yA - Math.cos(th) * Lr * 0.55, '② 뒷면 반사 π', { size: 12, bg: '#f26b3a', align: 'left' });
    D.label(sv.x + sv.w / 2, sv.y + sv.h - (PHONE ? 20 : 24), '코팅 두께 t = ' + Math.round(A.tD) + ' nm', { size: 13, bg: '#26324a' });
    // 스펙트럼
    const sp = L.sp;
    if (!PHONE) { panel(MA.x + 412, MA.y, MA.w - 412, 238, 14); T(sp.x - 44, sp.y - 20, '반사되는 빛의 세기 (파장마다)', 13.5, '#26324a', 'left', 800); }
    else T(sp.x - 36, sp.y - 8, '반사되는 빛의 세기 (파장마다)', 12.5, '#26324a', 'left', 800);
    const ax2 = axes(sp.x, sp.y, sp.w, sp.h, { xmin: 400, xmax: 700, ymin: 0, ymax: 1, xt: [[400, '400'], [450, '450'], [500, '500'], [550, '550'], [600, '600'], [650, '650'], [700, '700']], yt: [[0, '0'], [0.5, '0.5'], [1, '1']], xl: PHONE ? null : '파장 λ (nm)', fs: 12 });
    for (let l = 400; l < 700; l += 4) {
      const r = coatR(l, A.tD), c = wlRGB(l + 2);
      ctx.fillStyle = 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')'; ctx.globalAlpha = 0.9;
      const x0 = ax2.X(l), x1 = ax2.X(l + 4); ctx.fillRect(x0, ax2.Y(r), x1 - x0 + 0.6, ax2.Y(0) - ax2.Y(r));
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#26324a'; ctx.lineWidth = 2.4; ctx.beginPath();
    for (let l = 400; l <= 700; l += 4) { const y = coatR(l, A.tD); if (l === 400) ctx.moveTo(ax2.X(l), ax2.Y(y)); else ctx.lineTo(ax2.X(l), ax2.Y(y)); }
    ctx.stroke();
    ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = '#e8501b'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(ax2.X(550), sp.y); ctx.lineTo(ax2.X(550), sp.y + sp.h); ctx.stroke(); ctx.restore();
    D.sphere(ax2.X(550), ax2.Y(coatR(550, A.tD)), 6, '#e8501b', { gloss: false });
    // 렌즈에서 보이는 색
    if (!PHONE) panel(MA.x + 412, MA.y + 246, MA.w - 412, MA.h - 246, 14);
    const lx = L.lens.x, ly = L.lens.y;
    const reflCol = lensColor(A.tD);
    const rr = PHONE ? 24 : 34;
    T(lx - (PHONE ? 30 : 20), ly - rr - 8, '렌즈 표면에서 반사된 빛', PHONE ? 12 : 13, '#26324a', 'left', 800);
    D.sphere(lx + rr, ly + 6, rr, '#a8b3c4', { shadow: true });
    ctx.fillStyle = rgbCss(lensColorNo()); ctx.beginPath(); ctx.arc(lx + rr, ly + 6, rr - 4, 0, TAU); ctx.fill();
    T(lx + rr, ly + rr + 24, '코팅 없음', 12.5, '#5d6879', 'center', 800);
    const l2x = lx + rr * 2 + (PHONE ? 54 : 72);
    D.sphere(l2x, ly + 6, rr, '#a8b3c4', { shadow: true });
    ctx.fillStyle = rgbCss(reflCol); ctx.beginPath(); ctx.arc(l2x, ly + 6, rr - 4, 0, TAU); ctx.fill();
    T(l2x, ly + rr + 24, '코팅 ' + Math.round(A.tD) + ' nm', 12.5, '#5d6879', 'center', 800);
    // 표
    panel(BOT.x, BOT.y, BOT.w, BOT.h, 14);
    drawTable();
  }
  function lensColorNo() { return [222, 226, 236]; }
  function lensColor(t) {                      // 코팅한 렌즈가 반사하는 색: 파장마다 cos² 비율로 섞고, 코팅 없는 렌즈보다 어둡게
    const s = [0, 0, 0], ref = [0, 0, 0];
    for (let i = 0; i < LAMS.length; i++) { const I = coatR(LAMS[i], t); for (let k = 0; k < 3; k++) { s[k] += LCOL[i][k] * I; ref[k] += LCOL[i][k]; } }
    return [0, 1, 2].map((k) => Math.round(255 * Math.pow(clamp(s[k] / ref[k], 0, 1), 1 / 3.2) * 0.92 + 8));
  }
  function drawTable() {
    const A = S.ap, x = BOT.x + 12, w = BOT.w - 24, rh = PHONE ? 34 : 22, y0 = BOT.y + 8;
    const cols = PHONE ? [0.30, 0.35, 0.35] : [0.26, 0.37, 0.37];
    const hd = ['', '비누막 (공기→비눗물→공기)', '코팅 (공기→MgF₂→유리)'];
    const rowsT = [['앞면 반사', 'π 변화', 'π 변화'], ['뒷면 반사', '변화 없음', 'π 변화'], ['약해지는 조건', '2nt = mλ', '2nt = (m + ½)λ']];
    let cx = x;
    const fs = PHONE ? 11.5 : 12.5;
    for (let r = -1; r < rowsT.length; r++) {
      cx = x; const yy = y0 + (r + 1) * rh;
      ctx.fillStyle = r < 0 ? '#e9eefb' : (r % 2 ? '#f7f9fd' : '#fff'); ctx.fillRect(x, yy, w, rh);
      for (let c = 0; c < 3; c++) {
        const cw = w * cols[c];
        let s = r < 0 ? hd[c] : rowsT[r][c];
        let shown = true;
        if (r >= 0 && c === 2 && !A.tblOpen) { s = '?'; shown = false; }
        const lines = wrap(s, cw - 8, fs, 800);
        lines.slice(0, 2).forEach((ln, i) => T(cx + cw / 2, yy + rh / 2 + 4 - (lines.length > 1 ? 7 - i * 14 : 0), ln, fs, shown ? '#26324a' : '#9aa6b8', 'center', 800));
        cx += cw;
      }
    }
    ctx.strokeStyle = '#c3cbdb'; ctx.lineWidth = 1; ctx.strokeRect(x, y0, w, rh * 4);
    const ty = y0 + rh * 4 + 16;
    const msg = A.tblOpen ? '코팅은 두 반사가 모두 π 바뀌어 위상 변화가 서로 상쇄돼요. 그래서 광로차만 따지면 돼요.' : '코팅 칸의 ?는 위 장면에서 두 반사의 위상 변화를 확인한 뒤 ✍️ 비교하기를 풀면 채워져요.';
    if (BOT.h - rh * 4 - 12 > 30) textBlock(x, ty, w, msg, PHONE ? 13 : 13, '#5d6879', 18, 700);
  }
  function drawExamples() {
    const m = MA; panel(m.x, m.y, m.w, m.h, 14);
    T(m.x + 14, m.y + 24, '🌈 두께가 곳곳에서 다른 얇은 막들', PHONE ? 13.5 : 15, '#26324a', 'left', 800);
    // 기름막이 뜬 물웅덩이
    const cx = m.x + (PHONE ? 118 : 200), cy = m.y + (PHONE ? 110 : 150), rx = PHONE ? 100 : 170, ry = PHONE ? 56 : 82;
    ctx.save();
    ctx.fillStyle = '#3a4455'; ctx.beginPath(); ctx.ellipse(cx, cy, rx + 14, ry + 10, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU); ctx.clip();
    for (let r = rx; r > 0; r -= 2) {          // 바깥쪽부터 칠하고 안쪽 원판으로 덮어요
      const f = r / rx;
      // 가운데가 두껍고 가장자리가 얇은 기름막 + 약간 비틀림
      for (let a0 = 0; a0 < 12; a0++) {
        const a = a0 / 12 * TAU, t = 80 + 640 * Math.pow(1 - f, 1.1) + 60 * Math.sin(a * 2 + S.t * 0.4) * (1 - f);
        ctx.fillStyle = rgbCss(whiteColor(t, 1.47, 'film'));
        ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.ellipse(cx, cy, r + 2.5, (r + 2.5) * ry / rx, 0, a - 0.02, a + TAU / 12 + 0.02); ctx.lineTo(cx, cy); ctx.fill();
      }
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(cx, cy, rx - 4, ry - 3, 0, Math.PI * 1.05, Math.PI * 1.55); ctx.stroke();
    T(cx, cy + ry + 34, '기름막이 뜬 물웅덩이', 13.5, '#26324a', 'center', 800);
    // 비눗방울
    const bx = m.x + (PHONE ? 366 : 540), by = m.y + (PHONE ? 106 : 138), br = PHONE ? 54 : 78;
    ctx.save(); ctx.beginPath(); ctx.arc(bx, by, br, 0, TAU); ctx.clip();
    ctx.fillStyle = '#f4f8ff'; ctx.fillRect(bx - br, by - br, br * 2, br * 2);
    for (let y = -br; y < br; y += 2) {
      const f = (y + br) / (2 * br);
      for (let x = -br; x < br; x += 6) {
        const t = 120 + 520 * f * f + 38 * Math.sin(x * 0.05 + y * 0.03 + S.t * 0.5);
        ctx.fillStyle = rgbCss(whiteColor(t, N_SOAP, 'film')); ctx.globalAlpha = 0.9;
        ctx.fillRect(bx + x, by + y, 6.6, 2.6);
      }
    }
    ctx.globalAlpha = 1; ctx.restore();
    ctx.strokeStyle = 'rgba(120,150,190,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(bx, by, br, 0, TAU); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.ellipse(bx - br * 0.4, by - br * 0.45, br * 0.22, br * 0.1, -0.7, 0, TAU); ctx.fill();
    T(bx, by + br + 22, '비눗방울', 13.5, '#26324a', 'center', 800);
    // 카드
    const cy2 = m.y + (PHONE ? 214 : 288), cw = (m.w - 36) / 2, ch = m.h - (cy2 - m.y) - 12;
    const card = (x, ttl, body) => {
      ctx.fillStyle = '#f7f9fd'; D.roundRect(x, cy2, cw, ch, 12); ctx.fill();
      T(x + 12, cy2 + 24, ttl, PHONE ? 13.5 : 14.5, '#26324a', 'left', 800);
      textBlock(x + 12, cy2 + 48, cw - 24, body, PHONE ? 12.5 : 13.5, '#5d6879', PHONE ? 17 : 19, 700);
    };
    card(m.x + 12, '🎛️ 다이크로익 필터', '여러 겹의 얇은 막을 쌓아 특정한 색만 반사하고 나머지는 통과시켜요.');
    card(m.x + 24 + cw, '📏 간섭계', '막이나 표면의 두께가 파장의 절반만큼 변할 때마다 무늬가 한 줄씩 이동해요. 이것으로 두께를 재요.');
    panel(BOT.x, BOT.y, BOT.w, BOT.h, 14);
    textBlock(BOT.x + 16, BOT.y + 28, BOT.w - 32, '두께가 일정하지 않은 얇은 막에서는 위치마다 보강되는 색이 달라서 무지개 무늬가 보여요. 기름막, 비눗방울의 색은 모두 박막 간섭 때문이에요.', PHONE ? 14 : 15, '#26324a', 21, 800);
  }

  /* ---------- 포인터 ---------- */
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'film') {
        const L = flLay();
        if (p.x > L.FX - 36 && p.x < L.WX + L.WW + 30 && p.y > L.FY - 12 && p.y < L.FY + L.FH + 12) { S.fl.drag = true; S.fl.probe = clamp(Math.round((p.y - L.FY) / (L.FH / H_CM) * 10) / 10, 0, H_CM); Sound.click(); return true; }
      } else if (S.mode === 'cond') {
        const g = cdLay().gr;
        if (p.x > g.x - 6 && p.x < g.x + g.w + 6 && p.y > g.y - 6 && p.y < g.y + g.h + 6) { S.cd.gdrag = true; setT(clamp(Math.round((p.x - g.x) / g.w * 600), 0, 600)); return true; }
      }
      return false;
    },
    move(p) {
      if (S.fl.drag) { const L = flLay(); S.fl.probe = clamp(Math.round((p.y - L.FY) / (L.FH / H_CM) * 10) / 10, 0, H_CM); }
      else if (S.cd.gdrag) { const g = cdLay().gr; setT(clamp(Math.round((p.x - g.x) / g.w * 600), 0, 600)); }
    },
    up() { S.fl.drag = false; S.cd.gdrag = false; },
    hover(p) {
      if (S.mode === 'film') { const L = flLay(); if (p.x > L.FX - 36 && p.x < L.WX + L.WW + 30 && p.y > L.FY - 12 && p.y < L.FY + L.FH + 12) return 'ns-resize'; }
      if (S.mode === 'cond') { const g = cdLay().gr; if (p.x > g.x - 6 && p.x < g.x + g.w + 6 && p.y > g.y - 6 && p.y < g.y + g.h + 6) return 'ew-resize'; }
      return 'default';
    },
  });
  function setT(v) { S.cd.t = v; slT.set(v); }

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  function readouts() {
    let a, b, c, L1, L2, L3;
    if (S.mode === 'phase') {
      const st = phState();
      L1 = '굴절률 n₁ → n₂'; a = n2s(S.ph.n1) + ' → ' + n2s(S.ph.n2);
      L2 = '반사광의 위상 변화'; b = st === 'flip' ? 'π (뒤집힘)' : st === 'same' ? '없음 (0)' : '반사 없음';
      L3 = '줄 파동에서 같은 경우'; c = st === 'flip' ? '고정단' : st === 'same' ? '자유단' : '—';
    } else if (S.mode === 'film') {
      const F = S.fl, t = thickAt(F.probe, F.tau);
      L1 = '탐침 깊이 y'; a = F.probe.toFixed(1) + ' cm';
      L2 = '그곳의 막 두께 t'; b = Math.round(t) + ' nm';
      L3 = '반사광';
      if (F.light === 'white') c = t < 40 ? '검게 보여요' : '색 띠 (여러 색)';
      else { const I = sinI(N_SOAP, t, MONO[F.light]); c = I >= 0.9 ? '밝아요' : I <= 0.1 ? '어두워요' : '중간 밝기'; }
    } else if (S.mode === 'cond') {
      const st = cdState();
      L1 = '막 두께 t'; a = Math.round(S.cd.t) + ' nm';
      L2 = '광로차 2nt'; b = Math.round(st.path) + ' nm (' + st.m.toFixed(2) + 'λ)';
      L3 = '합성한 빛'; c = st.kind === 'bright' ? '보강 (밝음)' : st.kind === 'dark' ? '상쇄 (어두움)' : '중간';
    } else if (S.ap.sub === 'coat') {
      const r = coatR(550, S.ap.t);
      L1 = '코팅 두께 t'; a = Math.round(S.ap.t) + ' nm';
      L2 = '550 nm 반사 세기'; b = Math.round(r * 100) + ' %';
      L3 = '상쇄 조건 2nt = (m+½)λ'; c = r <= 0.01 ? '만족해요' : '아직이에요';
    } else { L1 = '막 두께'; a = '곳곳이 달라요'; L2 = '보강되는 색'; b = '위치마다 달라요'; L3 = '무늬'; c = '무지갯빛'; }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const levels = [
    {
      title: '반사와 위상: 언제 뒤집힐까?', short: '반사와 위상', icon: '🧵', phase: '모형',
      intro: '<p class="si-q">❓ 탐구 질문: 세워 둔 비누막에는 왜 가로 줄무늬가 생기고, 맨 위는 왜 검을까?</p>' +
        '<div class="si-link">🔗 <b>물리학에서</b> 두 파동이 만날 때 경로차에 따라 보강과 상쇄가 일어나는 <b>간섭</b>을 배웠어요(이중 슬릿). 비누막의 줄무늬를 설명하려면 경로차에 더해 <b>반사할 때 일어나는 위상 변화</b>를 알아야 해요.</div>' +
        '<p>줄 파동은 <b>고정된 벽</b>에서 반사하면 위아래가 뒤집히고(위상 π, 반 파장), <b>자유롭게 움직이는 고리</b>에서 반사하면 그대로예요. 빛도 같아요. <b>굴절률이 작은 매질에서 큰 매질</b>의 경계에서 반사하면 위상이 π 바뀌고, 큰 쪽에서 작은 쪽으로 반사하면 바뀌지 않아요.</p>',
      features: ['phase'],
      setup() { S.ph.n1 = 1.0; S.ph.n2 = 1.0; slN1.set(100); slN2.set(100); S.ph.rope = 'fixed'; S.ph.rt = 0; S.ph.seen = { fixed: false, free: false }; S.ph.seenFlip = false; S.ph.seenSame = false; S.ph.hold = 0; S.show.selA = false; setScene('phase'); },
      recap: '굴절률이 작은 매질에서 큰 매질로 가는 경계에서 반사하면 위상이 π(반 파장) 바뀌고, 큰 쪽에서 작은 쪽으로 반사하면 바뀌지 않아요. 반사한다고 항상 뒤집히는 것은 아니에요.',
      summary: '<ul><li><b>줄 파동</b>: 고정단 반사는 위상이 π 바뀌어 뒤집히고, 자유단 반사는 그대로예요.</li><li><b>빛의 반사</b>: 굴절률 <b>작은 쪽 → 큰 쪽</b>(공기 → 유리·물) 경계에서 반사하면 위상이 π(반 파장) 바뀌고, <b>큰 쪽 → 작은 쪽</b>(유리·물 → 공기)에서는 변화가 없어요.</li><li>π의 위상 변화는 <b>반 파장</b>만큼 경로가 달라진 것과 같아요.</li></ul>',
      missions: [
        {
          title: '위상이 뒤집히는 경계 찾기',
          goal: '굴절률 <b>n₁</b>, <b>n₂</b> 슬라이더를 움직여서 반사광의 위상이 <b>뒤집히는(π)</b> 경우와 <b>그대로인</b> 경우를 모두 만들어 보세요.',
          hint: 'n₂를 n₁보다 크게 하면 반사파가 입사파와 반대로 뒤집혀요. n₁을 n₂보다 크게 하면 그대로예요. 각각 1초쯤 유지해요.',
          setup() { S.ph.seenFlip = false; S.ph.seenSame = false; S.ph.hold = 0; S.ph.n1 = 1.0; S.ph.n2 = 1.0; slN1.set(100); slN2.set(100); S.show.selA = false; setScene('phase'); },
          check: () => S.ph.seenFlip && S.ph.seenSame,
          hold: 0.4,
          status: () => mark(S.ph.seenFlip) + ' n₁ &lt; n₂ (위상 π 변화) &nbsp; ' + mark(S.ph.seenSame) + ' n₁ &gt; n₂ (변화 없음) &nbsp; (지금 ' + (phState() === 'flip' ? '뒤집힘' : phState() === 'same' ? '그대로' : '반사 없음') + ')',
          explain: '<b>n₁ &lt; n₂</b>(예: 공기 1.00 → 유리 1.50)이면 반사파가 입사파와 반대로 뒤집혀요. <b>n₁ &gt; n₂</b>이면 그대로예요. n₁ = n₂이면 경계가 없는 것과 같아서 반사가 거의 없어요.',
        },
        {
          title: '줄 파동으로 확인하기', manual: true,
          goal: '줄의 끝을 <b>고정단</b>과 <b>자유단</b>으로 바꿔 가며 반사 펄스를 보고, 빛과 연결한 문장을 완성하세요.',
          hint: '고정단은 벽에 묶인 끝이라 반사 펄스가 뒤집혀요. 굴절률이 큰 매질은 벽처럼 움직이기 어려운 쪽이라고 생각하면 돼요.',
          setup() { S.ph.seen = { fixed: false, free: false }; S.show.selA = true; SEL_A.reset(); S.ph.rope = 'fixed'; S.ph.rt = 0; setScene('phase'); },
          check() {
            if (!S.ph.seen.fixed || !S.ph.seen.free) return '고정단과 자유단에서 반사하는 펄스를 모두 지켜보세요. (' + (S.ph.seen.fixed ? '' : '고정단 ') + (S.ph.seen.free ? '' : '자유단 ') + '아직)';
            return SEL_A.grade();
          },
          status: () => mark(S.ph.seen.fixed) + ' 고정단 관찰 &nbsp; ' + mark(S.ph.seen.free) + ' 자유단 관찰 &nbsp; · 고른 문장 ' + SEL_A.count() + ' / 4',
          explain: '고정단에서는 펄스가 <b>뒤집혀</b> 반사하고(위상 π), 자유단에서는 <b>그대로</b> 반사해요. 빛에서는 굴절률이 큰 매질의 경계가 고정단 같아서, <b>공기 → 유리</b> 반사는 π 변화, <b>유리 → 공기</b> 반사는 변화가 없어요.',
        },
        {
          type: 'quiz', title: '위상이 뒤집히는 쪽은?',
          goal: '빛이 유리로 들어가는 경계(공기 → 유리)와 나오는 경계(유리 → 공기)에서 각각 반사해요. 반사파의 위상이 π 바뀌는 쪽은?',
          setup() { S.show.selA = false; S.ph.n1 = 1.0; S.ph.n2 = 1.5; slN1.set(100); slN2.set(150); setScene('phase'); },
          choices: ['공기에서 유리로 입사해 유리 표면에서 반사할 때', '유리에서 공기로 나가며 유리 안쪽 면에서 반사할 때', '두 경우 모두 항상 위상이 π 바뀐다', '두 경우 모두 위상이 바뀌지 않는다'],
          answer: 0,
          feedback: ['', '굴절률이 큰 쪽에서 작은 쪽으로 반사하는 경우예요. 자유단 반사처럼 위상이 바뀌지 않아요.', '반사한다고 항상 뒤집히는 것은 아니에요. 줄 파동의 자유단을 떠올려 보세요.', '굴절률이 작은 쪽에서 큰 쪽으로 반사할 때는 위상이 π 바뀌어요. 고정단 반사처럼요.'],
          explain: '굴절률이 <b>작은 쪽 → 큰 쪽</b>(공기 → 유리)에서 반사하면 위상이 π 바뀌고, <b>큰 쪽 → 작은 쪽</b>(유리 → 공기)에서는 바뀌지 않아요.',
        },
      ],
    },
    {
      title: '비누막 관찰: 줄무늬의 정체', short: '비누막 관찰', icon: '🫧', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 공기에서 비눗물로 들어가는 앞면 반사는 위상이 π 바뀌고, 비눗물에서 공기로 나가는 뒷면 반사는 바뀌지 않는다는 것을 알았어요.</div>' +
        '<p>비눗물 막을 틀에 세워 두면 중력 때문에 <b>아래로 흘러내려</b> 위는 얇고 아래는 두꺼운 <b>쐐기 모양</b>이 돼요. 이 막에 빛을 비추면 어떤 모습일까요? 빛의 색을 바꾸고, 시간을 흐르게 하며 <b>탐침</b>으로 높이마다 두께를 재 봐요.</p>',
      features: ['film'],
      setup() { S.fl.light = '532'; S.fl.tau = 0; S.fl.play = false; S.fl.probe = 3.0; S.fl.seenGreen = false; S.fl.seenWhite = false; S.fl.maxTau = 0; S.show.selB = false; lgSeg.set('532'); setScene('film'); },
      recap: '세워 둔 비누막은 위가 얇고 아래가 두꺼운 쐐기 모양이라 높이마다 두께가 달라서 가로 줄무늬가 생겨요. 맨 위는 검고, 단색광에서는 한 가지 색 줄무늬, 백색광에서는 색 띠가 보여요.',
      summary: '<ul><li>세워 둔 비누막은 위 0 nm에서 아래로 갈수록 일정하게 두꺼워지는 <b>쐐기</b> 모양이에요. (예: 8 cm 아래에서 800 nm)</li><li>단색광(초록 532 nm)에서는 <b>2 cm마다</b> 같은 줄이 나타나요. 줄 사이 두께 변화 = 200 nm.</li><li>파장이 짧을수록(파랑) 줄 간격이 좁아요. 백색광에서는 파장마다 조건이 달라 <b>색 띠</b>가 생겨요.</li><li>시간이 흐르면 막이 얇아져서 줄이 아래로 내려가고 <b>맨 위의 검은 띠</b>가 넓어져요.</li></ul>',
      missions: [
        {
          title: '줄무늬가 내려가는 모습 보기',
          goal: '<b>초록빛(532 nm)</b>에서 ▶로 시간을 흐르게 해 줄이 <b>아래로 내려가는 것</b>을 보세요(20초 이상). 그리고 <b>백색광</b>으로 바꿔 색 띠를 확인해요.',
          hint: '“초록 532 nm”를 고르고 ▶ 시간 흐르게를 눌러 경과 시간이 20초가 넘게 기다려요. 그다음 “백색광”을 눌러요.',
          setup() { S.fl.light = '532'; S.fl.tau = 0; S.fl.play = false; S.fl.seenGreen = true; S.fl.seenWhite = false; S.fl.maxTau = 0; S.show.selB = false; lgSeg.set('532'); setScene('film'); },
          check: () => S.fl.seenGreen && S.fl.maxTau >= 20 && S.fl.seenWhite,
          hold: 0.4,
          status: () => mark(S.fl.seenGreen) + ' 초록빛 &nbsp; ' + mark(S.fl.maxTau >= 20) + ' 시간 흐름 ' + Math.min(20, Math.round(S.fl.maxTau)) + ' / 20초 &nbsp; ' + mark(S.fl.seenWhite) + ' 백색광 색 띠',
          explain: '막이 흘러내려 얇아지면 같은 두께가 더 아래쪽에 있게 돼서 <b>줄이 아래로 내려가고</b>, 두께가 아주 얇은 <b>검은 영역이 넓어져요</b>. 백색광에는 여러 파장이 섞여 있어서 파장마다 밝아지는 두께가 달라 <b>색 띠</b>가 생겨요.',
        },
        {
          title: '맨 위가 검은 까닭 예측하기', manual: true,
          goal: '맨 위의 가장 얇은 곳(두께 t → 0)이 왜 검은지 세 문장을 완성하세요. 탐침을 맨 위로 옮겨 두께를 확인해 봐요.',
          hint: '두께가 0에 가까우면 앞면과 뒷면이 거의 한 곳이라 광로차 2nt가 0에 가까워요. 반사할 때 위상이 바뀌는 쪽은 굴절률이 작은 쪽에서 큰 쪽으로 가는 앞면이에요.',
          setup() { S.show.selB = true; SEL_B.reset(); S.fl.probe = 0.5; S.fl.tau = 0; S.fl.play = false; setScene('film'); },
          check: () => SEL_B.grade(),
          status: () => '고른 문장 ' + SEL_B.count() + ' / 3',
          explain: '맨 위에서는 광로차 2nt가 거의 0이지만, <b>앞면에서만 위상이 π(반 파장) 바뀌어서</b> 두 반사광이 서로 <b>반대 위상</b>으로 만나 상쇄돼요. 그래서 모든 색이 약해져 <b>검게</b> 보여요. (막이 터지기 직전의 모습이에요)',
        },
        {
          type: 'quiz', title: '줄 간격이 일정한 까닭',
          goal: '단색광에서 줄무늬 간격이 위에서 아래까지 거의 일정해요. 그 까닭은?',
          setup() { S.show.selB = false; S.fl.light = '532'; lgSeg.set('532'); setScene('film'); },
          choices: ['막의 두께가 아래로 갈수록 일정한 비율로 늘어나기 때문에', '아래로 갈수록 빛이 약해지기 때문에', '아래로 갈수록 비눗물의 굴절률이 커지기 때문에', '중력이 빛의 파장을 일정하게 바꾸기 때문에'],
          answer: 0,
          feedback: ['', '빛의 세기가 아니라 막의 두께가 줄을 만들어요.', '막의 굴절률은 높이에 따라 달라지지 않아요.', '중력은 막의 두께 분포에 영향을 줄 뿐 빛의 파장은 바꾸지 않아요.'],
          explain: '두께가 일정한 비율(쐐기)로 늘어나서, 두께가 <b>λ/(2n) = 200 nm</b> 늘 때마다 같은 줄이 나타나요. 그래서 줄 간격이 아래까지 일정해요.',
        },
      ],
    },
    {
      title: '간섭 조건: 두 반사광의 합', short: '간섭 조건', icon: '📐', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 쐐기 모양 비누막에서 높이마다 두께가 달라 줄무늬가 생기고, 맨 위는 검다는 것을 확인했어요. 이번에는 <b>한 점의 두께</b>에서 앞면·뒷면 반사광이 어떻게 합쳐지는지 분석해요.</div>' +
        '<p>앞면에서 반사한 빛 ①은 위상이 <b>π</b> 바뀌어요. 막 속으로 들어가 뒷면에서 반사해 나온 빛 ②는 위상 변화는 없지만 <b>광로차 2nt</b>만큼 더 멀리 와요. (n: 막의 굴절률, t: 두께, λ: 진공에서의 파장) 그래서</p><p style="text-align:center"><b>보강(밝음): 2nt = (m + ½)λ</b><br><b>상쇄(어두움): 2nt = mλ</b> &nbsp;(m = 0, 1, 2, …)</p>',
      features: ['cond'],
      setup() { S.cd.t = 0; S.cd.tD = 0; S.cd.lam = 532; slT.set(0); S.cd.found = { 0: false, 1: false, 2: false }; S.show.num = false; setScene('cond'); },
      recap: '앞면 반사에서만 위상이 π 바뀌므로 보강 조건은 2nt = (m + ½)λ, 상쇄 조건은 2nt = mλ예요. 비눗물 막(n = 1.33)에서 532 nm 빛은 두께 100, 300, 500 nm에서 보강돼요.',
      summary: '<ul><li>앞면 반사: 위상 π 변화. 뒷면 반사: 변화 없음. → 두 반사광에는 항상 <b>반 파장</b>의 차이가 더해져요.</li><li><b>보강(밝음)</b> 2nt = (m + ½)λ, <b>상쇄(어두움)</b> 2nt = mλ (m = 0, 1, 2, …)</li><li>532 nm, n = 1.33: 밝은 곳 t = 100, 300, 500 nm / 어두운 곳 t = 0, 200, 400 nm. 간격 Δt = λ/(2n) = 200 nm.</li><li>같은 두께라도 파장이 다르면 조건이 달라서 백색광에서는 두께에 따라 <b>색이 변해요</b>.</li></ul>',
      missions: [
        {
          title: '보강되는 두께 세 개 찾기',
          goal: '초록빛(532 nm)에서 두께 t를 올려 가며 합성한 빛이 가장 밝아지는(보강) 두께 <b>세 곳</b>을 찾으세요.',
          hint: '파장을 532 nm로 두고 t를 0부터 올려요. 합성 진폭이 2(최대)가 되고 “보강 · 밝아요”가 뜨는 곳이 있어요. 그래프를 눌러도 돼요.',
          setup() { S.cd.lam = 532; S.cd.found = { 0: false, 1: false, 2: false }; S.show.num = false; S.cd.t = 0; slT.set(0); setScene('cond'); },
          check: () => S.cd.found[0] && S.cd.found[1] && S.cd.found[2],
          hold: 0.5,
          status: () => mark(S.cd.found[0]) + ' 첫 번째 &nbsp; ' + mark(S.cd.found[1]) + ' 두 번째 &nbsp; ' + mark(S.cd.found[2]) + ' 세 번째 &nbsp; (532 nm)',
          explain: '2nt = (m + ½)λ에서 t = (m + ½)λ/(2n)이에요. m = 0, 1, 2일 때 <b>t = 100, 300, 500 nm</b>예요. 첫 보강 두께 λ/(4n) = 532/(4 × 1.33) ≈ 100 nm에서 시작해 λ/(2n) ≈ 200 nm씩 늘어나요.',
        },
        {
          title: '600 nm 빛이 약해지는 두께 구하기', manual: true,
          goal: '비눗물 막(n = 1.33)에서 <b>600 nm</b> 빛이 상쇄되어 약해지는 <b>0이 아닌 가장 얇은 두께</b> t를 구해 쓰세요. (nm)',
          hint: '상쇄 조건은 2nt = mλ예요. m = 0은 t = 0이라 제외하고, m = 1일 때를 구해요. 슬라이더로 확인해도 돼요.',
          setup() { S.cd.lam = 600; lamSeg.set('600'); S.show.num = true; $('#inTmin').value = ''; $('#inTmin').classList.remove('ok', 'bad'); setScene('cond'); },
          check() {
            const el = $('#inTmin'), v = parseFloat(el.value);
            const fl = (ok) => { if (!ok && !el.classList.contains('bad')) { el.classList.remove('ok'); void el.offsetWidth; el.classList.add('bad'); } if (ok) { el.classList.remove('bad'); el.classList.add('ok'); } };
            if (!isFinite(v)) return '두께를 nm 단위의 숫자로 써 주세요.';
            const ans = 600 / (2 * N_SOAP);
            if (Math.abs(v - ans) <= 8) { fl(true); return true; }
            fl(false);
            if (Math.abs(v - 600 / (4 * N_SOAP)) <= 8) return '그 값은 600 nm 빛이 가장 강하게 반사되는 두께(2nt = λ/2)예요. 약해지는 조건은 2nt = λ예요.';
            if (Math.abs(v - 1200 / (2 * N_SOAP)) <= 12) return '그건 m = 2일 때예요. 0이 아닌 가장 얇은 두께는 m = 1이에요.';
            return '상쇄 조건 2nt = mλ에서 m = 1일 때 t = λ / (2n)을 계산해 보세요.';
          },
          status: () => '600 nm · n = 1.33 · 상쇄 2nt = mλ',
          explain: '상쇄 조건 2nt = mλ에서 m = 1이면 t = λ/(2n) = 600/(2 × 1.33) ≈ <b>226 nm</b>예요. 그림의 슬라이더를 226 nm로 맞추면 합성 진폭이 0이 되는 것을 볼 수 있어요.',
        },
        {
          type: 'quiz', title: '터지기 전에 검게 보이는 까닭',
          goal: '비누막이 점점 얇아져 두께가 파장보다 훨씬 작아지면, 터지기 직전에 막 전체가 검게 보여요. 그 까닭은?',
          setup() { S.show.num = false; S.cd.lam = 532; lamSeg.set('532'); setScene('cond'); },
          choices: ['광로차가 거의 0이라 두 빛이 같은 위상으로 만나 가장 밝게 보강되기 때문에', '광로차는 거의 0이지만 앞면 반사에서만 위상이 π 바뀌어 모든 색이 상쇄되기 때문에', '막이 너무 얇아서 빛이 반사되지 않고 모두 통과하기 때문에', '막이 마르면서 색소가 사라지기 때문에'],
          answer: 1,
          feedback: ['앞면 반사에서 위상이 π 바뀌는 것을 빠뜨렸어요. 광로차가 0이어도 반 파장 차이가 남아요.', '', '얇은 막도 앞면과 뒷면에서 각각 반사해요. 반사한 두 빛이 상쇄되는 것이 달라요.', '색소가 아니라 간섭 때문이에요. 모든 파장에서 같은 이유로 상쇄돼요.'],
          explain: '두께 t가 거의 0이면 광로차 2nt ≈ 0인데, 앞면 반사에서만 <b>π(반 파장)</b>의 위상 변화가 있어서 두 반사광이 서로 반대 위상으로 만나요. 그래서 <b>모든 파장이 상쇄</b>되어 검게 보여요.',
        },
      ],
    },
    {
      title: '박막 기술: 코팅과 무지개', short: '적용', icon: '🔍', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 비누막의 보강·상쇄 조건(2nt = (m + ½)λ, 2nt = mλ)을 알아냈어요. 이 원리는 <b>카메라 렌즈의 무반사 코팅</b>, 기름막의 무지개 같은 곳에서도 쓰여요.</div>' +
        '<p>렌즈(유리 n = 1.52) 표면에 얇은 MgF₂ 막(n = 1.38)을 입히면 반사를 줄일 수 있어요. 이 막은 앞면(공기 → 막)도 뒷면(막 → 유리)도 모두 <b>굴절률이 작은 쪽에서 큰 쪽</b>으로 가는 반사예요. 그래서 비누막과는 조건이 달라져요!</p>',
      features: ['app'],
      setup() { S.ap.sub = 'coat'; S.ap.t = 40; S.ap.tD = 40; slTc.set(40); S.ap.found = false; S.ap.tblOpen = false; S.ap.seenEx = false; S.show.selC = false; setScene('app'); },
      recap: '무반사 코팅은 앞뒤 반사가 모두 π 바뀌어 위상 변화가 상쇄되므로 광로차만 보면 돼요. 상쇄 조건 2nt = (m + ½)λ에서 가장 얇은 두께는 t = λ/(4n) ≈ 100 nm예요.',
      summary: '<ul><li><b>무반사 코팅</b>: 공기(1.00) → MgF₂(1.38) → 유리(1.52). 앞면·뒷면 반사 모두 π 변화 → 위상 변화는 서로 상쇄되므로 광로차만 봐요.</li><li>상쇄 조건 <b>2nt = (m + ½)λ</b>, 가장 얇은 두께 <b>t = λ/(4n) = 550/(4 × 1.38) ≈ 100 nm</b>. (비누막은 앞면만 π 변화라서 상쇄 조건이 2nt = mλ였어요.)</li><li>가시광선 가운데(550 nm)를 가장 줄이고 양끝(파랑·빨강)은 덜 줄어서 코팅된 렌즈는 <b>푸른 보랏빛</b>으로 보여요. 반사가 줄어든 만큼 투과가 늘어 밝은 상을 얻어요.</li><li>기름막, 비눗방울의 무지개 색, 다이크로익 필터, 간섭계의 두께 측정도 모두 박막 간섭이에요.</li></ul>',
      missions: [
        {
          title: '550 nm 반사가 가장 약한 코팅 두께',
          goal: '코팅 두께 t를 조절해서 <b>550 nm 빛의 반사</b>가 가장 약해지는 <b>가장 얇은 두께</b>를 찾으세요.',
          hint: '“반사되는 빛의 세기” 그래프의 주황색 점이 0까지 내려갈 때예요. 100 nm 근처에서 천천히 움직여 봐요.',
          setup() { S.ap.sub = 'coat'; S.show.selC = false; S.ap.found = false; S.ap.t = 40; S.ap.tD = 40; slTc.set(40); setScene('app'); },
          check: () => S.ap.sub === 'coat' && Math.abs(S.ap.t - 99.6) <= 4,
          hold: 0.6,
          status: () => mark(Math.abs(S.ap.t - 99.6) <= 4) + ' 550 nm 반사 ' + Math.round(coatR(550, S.ap.t) * 100) + ' % (지금 t = ' + Math.round(S.ap.t) + ' nm)',
          explain: '앞뒤 반사가 모두 π 바뀌므로 상쇄 조건은 2nt = (m + ½)λ예요. m = 0일 때 <b>t = λ/(4n) = 550/(4 × 1.38) ≈ 100 nm</b>예요. 이때 550 nm의 반사가 거의 없어져요. 양끝의 파랑과 빨강은 조금 남아서 렌즈가 푸른 보랏빛으로 보여요.',
        },
        {
          title: '비누막과 코팅의 차이 정리', manual: true,
          goal: '🔍 장면에서 두 반사의 위상 변화(π)를 확인하고, 🌈 <b>다른 예</b>도 살펴본 뒤, 문장을 완성해 비누막과 코팅의 조건을 견주세요.',
          hint: '코팅에서는 앞면(공기 → MgF₂)도 뒷면(MgF₂ → 유리)도 작은 쪽에서 큰 쪽으로 가는 반사예요. 위상 변화가 둘 다 있으면 서로 상쇄돼요.',
          setup() { S.show.selC = true; SEL_C.reset(); S.ap.sub = 'coat'; S.ap.seenEx = false; setScene('app'); },
          check() {
            if (!S.ap.seenEx) return '🌈 다른 예 장면도 한 번 살펴보세요.';
            const r = SEL_C.grade();
            if (r === true) S.ap.tblOpen = true;
            return r;
          },
          status: () => mark(S.ap.seenEx) + ' 다른 예 살펴보기 &nbsp; · 고른 문장 ' + SEL_C.count() + ' / 4',
          explain: '<b>비누막</b>은 앞면만 π 바뀌어 상쇄 조건이 2nt = mλ, <b>코팅</b>은 앞뒤 모두 π 바뀌어 위상 변화가 서로 상쇄되므로 상쇄 조건이 2nt = (m + ½)λ예요. 같은 두께의 코팅이라도 550 nm에서 멀어진 파랑·빨강은 조건이 정확히 맞지 않아 덜 줄어요. 기름막의 무지개는 두께가 곳곳에서 달라 보강되는 색이 다르기 때문이에요.',
        },
        {
          type: 'quiz', title: '코팅 렌즈가 보랏빛인 까닭',
          goal: '무반사 코팅을 한 카메라 렌즈에 빛을 비추면 반사되는 빛이 푸른 보랏빛으로 보여요. 그 까닭은?',
          setup() { S.show.selC = false; S.ap.sub = 'coat'; S.ap.t = 100; S.ap.tD = 100; slTc.set(100); setScene('app'); },
          choices: ['보라색 빛은 코팅 막을 만나면 더 강하게 반사되기 때문에', '코팅이 550 nm 근처의 초록·노랑 반사를 가장 많이 줄이고, 파랑·빨강 반사는 덜 줄어서 남기 때문에', '코팅 막이 보라색 물감으로 칠해져 있기 때문에', '코팅 때문에 렌즈가 빛을 모두 흡수하기 때문에'],
          answer: 1,
          feedback: ['모든 색의 반사가 줄어들지만 줄어드는 정도가 달라요. 스펙트럼 그래프를 보세요.', '', '색을 칠한 것이 아니라 간섭 때문에 색이 달라 보이는 거예요.', '빛은 흡수되는 것이 아니라 대부분 렌즈를 통과해서 오히려 상이 밝아져요.'],
          explain: '두께 100 nm 코팅은 가시광선 가운데(550 nm)의 반사를 가장 줄여요. <b>양끝(파랑·빨강)은 조건이 덜 맞아 반사가 조금 남아</b> 두 색이 섞인 푸른 보랏빛으로 보여요. 반사가 줄어든 만큼 투과가 늘어 밝은 상을 얻어요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hq-thin-film', mount: '#game', badge: '박막 간섭 탐험가', homeHref: '../../index.html#hq',
    featureLabels: { phase: '🧵 줄 파동 · 빛의 반사 위상', film: '🫧 쐐기 모양 비누막 · 탐침', cond: '📐 두 반사광의 합성 · 진폭 그래프', app: '🔍 무반사 코팅 · 다른 예' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  setScene('phase');
  updateCtl();
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t; S.dt = dt;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    view.apply();
    stepPhase(dt); stepFilm(dt); stepCond(dt); stepApp(dt);
    ctx.clearRect(0, 0, VW, VH);
    if (S.mode === 'phase') { drawPhase(); drawPhaseBottom(); }
    else if (S.mode === 'film') drawFilm();
    else if (S.mode === 'cond') drawCond();
    else drawApp();
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });
  function drawPhaseBottom() {
    panel(BOT.x, BOT.y, BOT.w, BOT.h, 14);
    const st = phState();
    const m1 = st === 'flip' ? 'n₁ < n₂: 굴절률이 작은 쪽에서 큰 쪽으로 반사 → 위상 π (반 파장) 변화. 줄의 고정단과 같아요.' : st === 'same' ? 'n₁ > n₂: 굴절률이 큰 쪽에서 작은 쪽으로 반사 → 위상 변화 없음. 줄의 자유단과 같아요.' : 'n₁ = n₂: 두 매질이 같아서 경계가 없는 것과 같아요. 슬라이더로 굴절률을 바꿔 보세요.';
    textBlock(BOT.x + 16, BOT.y + 28, BOT.w - 32, m1, PHONE ? 14 : 15, '#26324a', 21, 800);
    textBlock(BOT.x + 16, BOT.y + (PHONE ? 94 : 70), BOT.w - 32, '아래 그래프는 경계에서 입사파와 반사파의 진동을 시간에 따라 그린 거예요. 반사파가 반대로 움직이면 위상이 π(반 파장) 바뀐 거예요.', PHONE ? 13 : 13.5, '#5d6879', 19, 700);
  }

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, MA, BOT, SEL_A, SEL_B, SEL_C, slN1, slN2, slT, slTc, thickAt, slopeAt, sinI, sinA, coatR, cdState, phState, brightIdx, markLines, filmRGB, whiteColor, setScene, updateCtl, flLay, cdLay, phLay, lgSeg, lamSeg, apSeg, ropeSeg, setT,
    get game() { return game; },
  };

})();
