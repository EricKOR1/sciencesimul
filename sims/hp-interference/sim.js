/* =========================================================
   물리학 Ⅲ. 빛과 물질 - 빛의 간섭 (단원 1차시)
   성취기준 [12물리03-01] 빛의 중첩과 간섭을 통해 빛의 파동성을 알고, 이를 이용한 기술과 현상을 예를 들어 설명할 수 있다.
   ① 관찰: 파동의 중첩 (수면 파문 · 줄 위 펄스)
   ② 실험: 이중 슬릿 (레이저 · 단일/이중 슬릿 · 흰빛 · 입자 모형 비교)
   ③ 분석: 간섭 조건 (경로차 · 무늬 간격 Δx = λL/d · 미지의 레이저 파장)
   ④ 적용: 간섭 기술 (무반사 코팅 · 비눗방울 · 소음 제거 · 간섭계)
   단일 슬릿 회절 세기 분포 · 회절 격자 공식 · 박막 간섭 수식 · 결맞음 길이는 다루지 않아요.
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
  const WV = 6;                       // 수면 파동의 속력 (cm/s) → 파장 = 6 / 진동수
  const FIELD_CM = PHONE ? 30 : 48;   // 수면 화면의 가로 길이 (cm)
  const PULSE = { LEN: 4.0, V: 0.8, SIG: 0.25, AA: 4, AB: 3, T0: 2.44, TEND: 6.2, XA: -0.2, XB: 4.2 };   // 줄 길이(m), 속력(m/s), 펄스 폭(m), 진폭(cm)
  const SAMPLE_X = [1.5, 1.75, 2.0, 2.25, 2.5];                                       // 합을 그릴 위치 (m)
  const TOL_CM = 0.5;                                                              // 합 그리기 허용 오차 (cm)
  const MM = 5;                       // 스크린 눈금: 1 mm = 5 화면 픽셀
  const HALF_MM = 30;                 // 스크린이 보여 주는 범위 (±30 mm)
  const ENV_MM = 24;                  // 무늬 밝기의 바깥쪽 감소 폭 (mm)
  const UNK = { lam: 650, d: 0.20, L: 3.0 };       // 미지의 레이저
  const BASE = { lam: 600, d: 0.30, L: 2.0 };      // 간섭 조건 실험의 기본 조건
  const N_FILM = 1.38;                // 코팅 막 (내부 모형 상수)
  const LAM_GREEN = 550;
  const N_SOAP = 1.33;
  const LAM_LIGO = 1064;

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'wave', wsub: 'ripple', cs: 'path', t: 0, fade: 0,
    showCmp: false, showLink: false,
    rp: { dT: 8, d: 8, fT: 1.5, f: 1.5, ph: 0, lines: false, r1: null, r2: null, dirty: true, hold2: 0, hold6: 0, seen2: false, seen6: false },
    pl: { cfg: 'same', t: 0, playing: true, draw: false, dots: [], solved: { same: false, opp: false }, wait: 0 },
    sl: { lamT: 600, dT: 0.30, LT: 2.0, slits: 2, light: 'laser', part: false, seen: { two: false, one: false, white: false }, hold: 0 },
    sm: { lam: 600, d: 0.30, L: 2.0 },
    cd: { yP: 4.0, drag: null, rows: [], meas: null, seenQ: {}, A: -5, B: 5, mdrag: null },
    tc: { sub: 'coat', thT: 0, th: 0, cw: 'green', seen: { min: false, white: false }, soapT: 600, soap: 600, phT: 0, ph: 0, armT: 0, arm: 0, probe: 0.55, pdrag: false },
    bul: { list: [], hist: new Float32Array(64), n: 0, acc: 0 },
  };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const MODE_LABEL = { wave: '🌊 파동의 중첩', slit: '🔦 이중 슬릿', cond: '📏 간섭 조건', tech: '🛠️ 간섭 기술' };
  const fmt1 = (x) => x.toFixed(1);

  function activeP() {   // 지금 장면에서 쓰는 (목표) 조건
    if (S.mode === 'cond' && S.cs === 'unk') return { lam: UNK.lam, d: UNK.d, L: UNK.L };
    return { lam: S.sl.lamT, d: S.sl.dT, L: S.sl.LT };
  }
  const dxMm = (p) => p.lam * p.L / p.d * 1e-3;               // 무늬 간격 (mm) = λL/d
  const nBright = (p) => 2 * Math.floor(HALF_MM / dxMm(p) + 1e-9) + 1;

  function setScene(mode, sub) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); }
    S.mode = mode;
    if (mode === 'wave' && sub) S.wsub = sub;
    if (mode === 'cond' && sub) S.cs = sub;
    if (mode === 'tech' && sub) S.tc.sub = sub;
    $('#tbLabel').textContent = MODE_LABEL[mode];
    updateCtl();
  }
  function subOf(mode, node) {
    const sub = node.getAttribute('data-sub');
    if (!sub) return true;
    if (mode === 'wave') return sub === S.wsub;
    if (mode === 'tech') return sub === S.tc.sub;
    if (mode === 'slit') return sub === 'vary';
    if (mode === 'cond') return sub === 'vary' ? S.cs !== 'unk' : sub === S.cs;
    return true;
  }
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on) on = subOf(S.mode, n);
      const dm = n.getAttribute('data-match');
      if (on && dm) on = dm === 'cmp' ? S.showCmp : S.showLink;
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    wvSeg.set(S.wsub); pcSeg.set(S.pl.cfg); csSeg.set(S.cs); tcSeg.set(S.tc.sub);
    slSeg.set(S.sl.slits); lgSeg.set(S.sl.light); cwSeg.set(S.tc.cw);
    $('#bLines').classList.toggle('on', S.rp.lines);
    $('#bLines').style.outline = S.rp.lines ? '3px solid var(--subject)' : '';
    $('#bPart').style.outline = S.sl.part ? '3px solid var(--subject)' : '';
    $('#bPlay').innerHTML = S.pl.playing ? '⏸ 멈추기' : '▶ 재생하기';
    $('#bPlay').disabled = S.pl.draw; $('#bRestart').disabled = S.pl.draw;
    $('#pNote').textContent = S.pl.draw ? '두 펄스가 겹친 순간에 멈춰 있어요. 점 5개를 끌어서 합친 줄의 모양을 그려 보세요.' : '두 펄스가 만나는 동안 줄의 모양을 살펴보세요.';
    $('#bMeas').disabled = !!S.cd.meas;
    ['sL', 'sD', 'sS'].forEach((id) => { $('#' + id).disabled = !!S.cd.meas; });
    $$('.nudge[data-for="sL"],.nudge[data-for="sD"],.nudge[data-for="sS"]').forEach((b) => { b.disabled = !!S.cd.meas; });
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));

  /* ---------- 컨트롤 연결 ---------- */
  const wvSeg = bindSeg('wvSeg', (v) => { S.wsub = v; updateCtl(); });
  const pcSeg = bindSeg('pcSeg', (v) => { if (S.pl.draw) { setCfg(v); } else { S.pl.cfg = v; restartPulse(); } updateCtl(); });
  const csSeg = bindSeg('csSeg', (v) => { S.cs = v; S.cd.meas = null; updateCtl(); });
  const tcSeg = bindSeg('tcSeg', (v) => { S.tc.sub = v; updateCtl(); });
  const slSeg = bindSeg('slSeg', (v) => { S.sl.slits = +v; S.bul.hist.fill(0); S.bul.n = 0; updateCtl(); });
  const lgSeg = bindSeg('lgSeg', (v) => { S.sl.light = v; updateCtl(); });
  const cwSeg = bindSeg('cwSeg', (v) => { S.tc.cw = v; updateCtl(); });
  bindSlider('sD1', (v) => v + ' cm', (v) => { S.rp.dT = +v; });
  bindSlider('sF1', (v) => (v / 100).toFixed(2) + ' Hz', (v) => { S.rp.fT = +v / 100; });
  bindSlider('sL', (v) => v + ' nm', (v) => { S.sl.lamT = +v; });
  bindSlider('sD', (v) => (v / 100).toFixed(2) + ' mm', (v) => { S.sl.dT = +v / 100; });
  bindSlider('sS', (v) => (v / 10).toFixed(1) + ' m', (v) => { S.sl.LT = +v / 10; });
  bindSlider('sTh', (v) => v + ' nm', (v) => { S.tc.thT = +v; });
  bindSlider('sBub', (v) => v + ' nm', (v) => { S.tc.soapT = +v; });
  bindSlider('sPh', (v) => v + '°', (v) => { S.tc.phT = +v; });
  bindSlider('sArm', (v) => v + ' nm', (v) => { S.tc.armT = +v; });
  $('#bLines').addEventListener('click', () => { Sound.click(); S.rp.lines = !S.rp.lines; updateCtl(); });
  $('#bPart').addEventListener('click', () => { Sound.click(); S.sl.part = !S.sl.part; S.bul.list.length = 0; S.bul.hist.fill(0); S.bul.n = 0; updateCtl(); });
  $('#bPlay').addEventListener('click', () => { Sound.click(); S.pl.playing = !S.pl.playing; updateCtl(); });
  $('#bRestart').addEventListener('click', () => { Sound.click(); restartPulse(); });
  $('#bMeas').addEventListener('click', () => measure());
  $('#bMClr').addEventListener('click', () => { Sound.click(); S.cd.rows = []; });

  /* ---------- 선택 문장 (미션용) ---------- */
  const CMP = mkSelRows('cmpRows', [
    { q: '총알(입자) 모형이 예측하는 스크린의 모양은?', opts: ['슬릿 바로 뒤의 두 곳에 밝은 줄 2개', '밝고 어두운 줄무늬가 여러 개'], ans: 0 },
    { q: '실제 이중 슬릿 실험에서 레이저로 얻은 모양은?', opts: ['슬릿 바로 뒤의 두 곳에 밝은 줄 2개', '밝고 어두운 줄무늬가 여러 개'], ans: 1 },
    { q: '어두운 줄에서 두 슬릿을 지나온 빛은 어떻게 만날까요?', opts: ['마루와 마루가 만나 보강돼요', '마루와 골이 만나 상쇄돼요', '한 슬릿의 빛은 도착하지 못해요'], ans: 1 },
    { q: '이 실험이 보여 주는 빛의 성질은?', opts: ['파동성', '입자성'], ans: 0 },
  ]);
  const LINK = mkSelRows('linkRows', [
    { q: '무반사 코팅: 막의 위·아래에서 반사된 두 빛이 겹치면', opts: ['보강 간섭해 더 밝아져요', '상쇄 간섭해 반사가 줄어요'], ans: 1 },
    { q: '소음 제거 헤드폰: 소음에 반대 위상의 소리를 더하면', opts: ['보강 간섭해 소리가 커져요', '상쇄 간섭해 소리가 줄어요'], ans: 1 },
    { q: '비눗방울의 색 띠: 막의 두께에 따라', opts: ['보강 간섭하는 빛의 색(파장)이 달라져요', '색소가 있어서 색이 달라져요'], ans: 0 },
    { q: '간섭계: 두 빛의 경로차가 파장보다 훨씬 조금만 변해도', opts: ['간섭 무늬의 밝기가 변해 길이 변화를 알아내요', '무늬가 전혀 변하지 않아요'], ans: 0 },
  ]);

  /* ================= ① 파동의 중첩: 수면 파문 ================= */
  const RF = PHONE ? { x: 12, y: 12, w: 456, h: 392 } : { x: 16, y: 14, w: 768, h: 396 };
  const RPX = RF.w / FIELD_CM;                       // 1 cm = RPX 픽셀
  const CELL = 4;
  const RCW = Math.ceil(RF.w / CELL), RCH = Math.ceil(RF.h / CELL);
  const rcv = document.createElement('canvas'); rcv.width = RCW; rcv.height = RCH;
  const rctx = rcv.getContext('2d'); const rimg = rctx.createImageData(RCW, RCH);
  const RLUT = (() => {   // 높이(−1 ~ 1) → 색 (골: 짙은 남색, 평평: 중간 파랑, 마루: 밝은 하늘색)
    const out = [];
    for (let i = 0; i < 256; i++) {
      const v = i / 255 * 2 - 1;
      const c = v < 0 ? C.hexToRgb(C.mix('#3f86c0', '#07224a', -v)) : C.hexToRgb(C.mix('#3f86c0', '#eaf8ff', v));
      out.push([c.r, c.g, c.b]);
    }
    return out;
  })();
  const SRC_X = PHONE ? 5 : 6;                       // 파원의 위치 (cm)
  const SRC_Y = RF.h / RPX / 2;
  const lamOf = (f) => WV / f;
  function rippleLines(d, lam) {                     // 파원 사이 간격 d 안에서 만들어지는 보강선·상쇄선의 경로차 값 (cm)
    const bright = [], dark = [];
    for (let m = -30; m <= 30; m++) {
      if (Math.abs(m * lam) < d - 1e-6) bright.push(m * lam);
      if (Math.abs((m + 0.5) * lam) < d - 1e-6) dark.push((m + 0.5) * lam);
    }
    return { bright, dark };
  }
  function rebuildRipple() {
    const r = S.rp, n = RCW * RCH;
    if (!r.r1) { r.r1 = new Float32Array(n); r.r2 = new Float32Array(n); }
    const y1 = SRC_Y - r.d / 2, y2 = SRC_Y + r.d / 2;
    for (let j = 0, k = 0; j < RCH; j++) {
      const yy = (j + 0.5) * CELL / RPX;
      for (let i = 0; i < RCW; i++, k++) {
        const xx = (i + 0.5) * CELL / RPX - SRC_X;
        r.r1[k] = Math.hypot(xx, yy - y1); r.r2[k] = Math.hypot(xx, yy - y2);
      }
    }
    r.dirty = false;
  }
  function stepRipple(dt) {
    const r = S.rp;
    r.f = Math.abs(r.f - r.fT) < 0.001 ? r.fT : SciSim.approach(r.f, r.fT, dt, 8);
    const dOld = r.d;
    r.d = Math.abs(r.d - r.dT) < 0.002 ? r.dT : SciSim.approach(r.d, r.dT, dt, 9);
    if (r.d !== dOld || r.dirty) rebuildRipple();
    r.ph = (r.ph + TAU * r.f * dt) % (TAU * 1000);
    const ln = rippleLines(r.dT, lamOf(r.fT));
    r.nB = ln.bright.length; r.nD = ln.dark.length;
    if (S.mode === 'wave' && S.wsub === 'ripple') {
      r.hold2 = r.nD === 2 ? r.hold2 + dt : 0; r.hold6 = r.nD >= 6 ? r.hold6 + dt : 0;
      if (r.hold2 > 0.8) r.seen2 = true;
      if (r.hold6 > 0.8) r.seen6 = true;
    }
  }
  function hyperbolaPath(s, c, x0, y0) {             // 경로차 s(cm)인 곡선을 화면에 그리기 (두 파원이 위·아래에 있음)
    ctx.beginPath();
    if (Math.abs(s) < 1e-9) { ctx.moveTo(RF.x, y0); ctx.lineTo(RF.x + RF.w, y0); return; }
    const a = Math.abs(s) / 2, b = Math.sqrt(Math.max(0, c * c - a * a));
    let first = true;
    for (let u = -3.2; u <= 3.2; u += 0.08) {
      const px = x0 + b * Math.sinh(u) * RPX, py = y0 + (s / 2) * Math.cosh(u) * RPX;
      if (first) { ctx.moveTo(px, py); first = false; } else ctx.lineTo(px, py);
    }
  }
  function drawRipple() {
    const r = S.rp;
    const k = TAU / lamOf(r.f);
    const data = rimg.data; const n = RCW * RCH;
    for (let q = 0; q < n; q++) {
      const v = (Math.cos(k * r.r1[q] - r.ph) + Math.cos(k * r.r2[q] - r.ph)) * 0.5;
      const c = RLUT[(v * 127.5 + 127.5) | 0], o = q * 4;
      data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2]; data[o + 3] = 255;
    }
    rctx.putImageData(rimg, 0, 0);
    ctx.save(); D.roundRect(RF.x, RF.y, RF.w, RF.h, 14); ctx.clip();
    ctx.imageSmoothingEnabled = true; ctx.drawImage(rcv, RF.x, RF.y, RCW * CELL, RCH * CELL);
    const x0 = RF.x + SRC_X * RPX, y0 = RF.y + SRC_Y * RPX, c = r.d / 2;
    if (r.lines) {
      const lam = lamOf(r.f), ln = rippleLines(r.d, lam);
      ctx.lineWidth = 2.6;
      ctx.strokeStyle = 'rgba(255,212,71,.95)';
      ln.bright.forEach((s) => { hyperbolaPath(s, c, x0, y0); ctx.stroke(); });
      ctx.strokeStyle = 'rgba(255,90,118,.95)'; ctx.setLineDash([9, 7]);
      ln.dark.forEach((s) => { hyperbolaPath(s, c, x0, y0); ctx.stroke(); });
      ctx.setLineDash([]);
    }
    ctx.restore();
    // 파원 두 개
    [[-1, '파원 1'], [1, '파원 2']].forEach(([sg, nm]) => {
      const sy = y0 + sg * c * RPX;
      const ring = (S.t * 1.2) % 1;
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.6 * (1 - ring)) + ')'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(x0, sy, 8 + ring * 16, 0, TAU); ctx.stroke();
      D.sphere(x0, sy, 8, '#ff8a3d', { shadow: true });
      T(x0 - 14, sy + 5, nm, 13, '#fff', 'right', 800, { stroke: 'rgba(10,30,60,.75)', strokeWidth: 4 });
    });
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 5]);
    ctx.beginPath(); ctx.moveTo(x0 + 18, y0 - c * RPX); ctx.lineTo(x0 + 18, y0 + c * RPX); ctx.stroke(); ctx.setLineDash([]);
    T(x0 + 24, y0 + 5, 'd = ' + Math.round(r.dT) + ' cm', 13, '#fff', 'left', 800, { stroke: 'rgba(10,30,60,.75)', strokeWidth: 4 });
    // 아래 설명 칸
    const py = RF.y + RF.h + 10, ph = VH - py - 10;
    panel(RF.x, py, RF.w, ph, 14);
    const lam = lamOf(r.fT);
    T(RF.x + 14, py + 24, '파장 λ = ' + lam.toFixed(1) + ' cm  (파동 속력 ' + WV + ' cm/s ÷ 진동수 ' + r.fT.toFixed(2) + ' Hz)', PHONE ? 13 : 14.5, '#26324a', 'left', 800);
    const g = ctx.createLinearGradient(RF.x + 14, 0, RF.x + 14 + 150, 0); g.addColorStop(0, '#07224a'); g.addColorStop(0.5, '#3f86c0'); g.addColorStop(1, '#eaf8ff');
    ctx.fillStyle = g; D.roundRect(RF.x + 14, py + 40, 150, 14, 7); ctx.fill();
    T(RF.x + 14, py + 72, '골', 13, '#5d6879', 'left', 700); T(RF.x + 164, py + 72, '마루', 13, '#5d6879', 'right', 700);
    T(RF.x + 98, py + 72, '잔잔', 13, '#5d6879', 'center', 700);
    const bx = RF.x + (PHONE ? 14 : 190);
    const by = PHONE ? py + 92 : py + 50;
    textBlock(bx, by, RF.w - (bx - RF.x) - 14, '크게 출렁이는 곳 = 보강(마루+마루, 골+골) · 잔잔한 곳 = 상쇄(마루+골). 파원 오른쪽 부분에서 선을 세어요. 보강선 ' + r.nB + '개 · 상쇄선 ' + r.nD + '개', PHONE ? 13 : 14, '#26324a', 18, 700);
  }

  /* ================= ① 파동의 중첩: 줄 위 펄스 ================= */
  const PF = PHONE ? { x: 12, y: 12, w: 456, h: 392 } : { x: 16, y: 14, w: 768, h: 396 };
  const PX0 = PF.x + 36, PXM = (PF.w - 72) / PULSE.LEN;      // 줄의 왼쪽 끝, 1 m당 픽셀
  const PY0 = PF.y + PF.h / 2 + 4, PCM = PHONE ? 19 : 22;    // 줄의 기준선, 1 cm당 픽셀
  const pAt = (x, t) => PULSE.AA * Math.exp(-0.5 * Math.pow((x - (PULSE.XA + PULSE.V * t)) / PULSE.SIG, 2));
  const pBt = (x, t, cfg) => (cfg === 'same' ? 1 : -1) * PULSE.AB * Math.exp(-0.5 * Math.pow((x - (PULSE.XB - PULSE.V * t)) / PULSE.SIG, 2));
  const sumAt = (x, t, cfg) => pAt(x, t) + pBt(x, t, cfg);
  const dotsOf = (cfg) => S.pl.dots[cfg] || (S.pl.dots[cfg] = SAMPLE_X.map(() => ({ y: 0, ok: false })));
  function restartPulse() { S.pl.t = 0; S.pl.playing = true; S.pl.wait = 0; }
  function setCfg(v) { S.pl.cfg = v; }
  function pulseSolved() { return S.pl.solved.same && S.pl.solved.opp; }
  function stepPulse(dt) {
    const p = S.pl;
    if (p.draw) { p.t = PULSE.T0; return; }
    if (!p.playing) return;
    if (p.t >= PULSE.TEND) { p.wait += dt; if (p.wait > 0.9) { p.t = 0; p.wait = 0; } return; }
    p.t = Math.min(PULSE.TEND, p.t + dt);
  }
  function drawPulse() {
    const p = S.pl, t = p.t, cfg = p.cfg;
    panel(PF.x, PF.y, PF.w, PF.h, 14);
    const Xm = (x) => PX0 + x * PXM, Yc = (c) => PY0 - c * PCM;
    ctx.save(); D.roundRect(PF.x, PF.y, PF.w, PF.h, 14); ctx.clip();
    // 눈금
    for (let c = -7; c <= 8; c++) {
      ctx.strokeStyle = c === 0 ? '#9aa6bb' : '#e6ebf4'; ctx.lineWidth = c === 0 ? 2 : 1;
      ctx.beginPath(); ctx.moveTo(PF.x + 6, Yc(c)); ctx.lineTo(PF.x + PF.w - 6, Yc(c)); ctx.stroke();
      if (c % 2 === 0) T(PF.x + 8, Yc(c) - 3, c + ' cm', 12, '#8a95a8', 'left', 700);
    }
    // 줄: 기준선 + 양 끝 고정
    D.shadow(() => { ctx.fillStyle = '#7a8599'; D.roundRect(Xm(0) - 14, PY0 - 16, 10, 32, 3); ctx.fill(); D.roundRect(Xm(PULSE.LEN) + 4, PY0 - 16, 10, 32, 3); ctx.fill(); }, { blur: 4, y: 2 });
    ctx.restore();
    const curve = (fn, color, w, dash, alpha) => {
      ctx.save(); ctx.beginPath(); ctx.rect(Xm(0), PF.y + 4, PXM * PULSE.LEN, PF.h - 8); ctx.clip();
      ctx.strokeStyle = color; ctx.lineWidth = w; ctx.globalAlpha = alpha == null ? 1 : alpha; ctx.lineJoin = 'round'; ctx.setLineDash(dash || []);
      ctx.beginPath();
      for (let x = 0; x <= PULSE.LEN + 1e-9; x += 0.02) { const px = Xm(x), py = Yc(fn(x)); if (x === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
      ctx.stroke(); ctx.restore();
    };
    curve((x) => pAt(x, t), '#2f6df6', 3, [8, 6], 0.9);
    curve((x) => pBt(x, t, cfg), '#e2464b', 3, [8, 6], 0.9);
    const dots = dotsOf(cfg);
    const showSum = !p.draw || p.solved[cfg];
    if (showSum) curve((x) => sumAt(x, t, cfg), '#1b2333', 4.5);
    else {
      T(PF.x + PF.w / 2, PF.y + 28, '파란 펄스 + 빨간 펄스 = ?  (점 5개를 합친 높이로 끌어 주세요)', PHONE ? 13 : 15, '#26324a', 'center', 800);
    }
    // 범례
    const ly = PF.y + PF.h - 14;
    [['#2f6df6', '왼쪽 펄스 (+' + PULSE.AA + ' cm)'], ['#e2464b', '오른쪽 펄스 (' + (cfg === 'same' ? '+' : '−') + PULSE.AB + ' cm)'], ['#1b2333', '실제 줄의 모양 = 합']].forEach((o, i) => {
      const lx = PF.x + 14 + i * (PHONE ? 150 : 200);
      ctx.strokeStyle = o[0]; ctx.lineWidth = i === 2 ? 4.5 : 3; ctx.setLineDash(i === 2 ? [] : [8, 6]); ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + 26, ly); ctx.stroke(); ctx.setLineDash([]);
      T(lx + 32, ly + 5, o[1], PHONE ? 11.5 : 13, '#26324a', 'left', 700);
    });
    if (p.draw) {
      SAMPLE_X.forEach((x, i) => {
        const d = dots[i];
        const ya = pAt(x, t), yb = pBt(x, t, cfg);
        ctx.strokeStyle = 'rgba(80,90,110,.45)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(Xm(x), PF.y + 40); ctx.lineTo(Xm(x), PF.y + PF.h - 34); ctx.stroke(); ctx.setLineDash([]);
        D.sphere(Xm(x), Yc(ya), 5, '#2f6df6', { gloss: false }); D.sphere(Xm(x), Yc(yb), 5, '#e2464b', { gloss: false });
        if (d.ok) { D.check(Xm(x), Yc(d.y), 13, 1); }
        else {
          D.ring(Xm(x), Yc(d.y), 14, S.t + i * 0.2, { color: '#ffb400', width: 3 });
          D.sphere(Xm(x), Yc(d.y), 10, '#ffb400', { shadow: true });
        }
      });
    } else if (p.playing || p.t > 0) {
      T(PF.x + PF.w / 2, PF.y + 28, '두 펄스는 겹쳐도 서로 부딪치지 않고 각자의 모양을 그대로 지나가요', PHONE ? 12.5 : 15, '#26324a', 'center', 800);
    }
    // 아래 설명
    const ov = Math.min(1, Math.max(0, 1 - Math.abs((PULSE.XB - PULSE.V * t) - (PULSE.XA + PULSE.V * t)) / (3 * PULSE.SIG)));
    if (!p.draw && ov > 0.15) {
      const mx = Xm(2.0);
      D.label(mx, PF.y + 56, cfg === 'same' ? '겹친 곳: 변위가 더해져 커져요 (보강)' : '겹친 곳: 변위가 더해져 작아져요 (상쇄)', { bg: cfg === 'same' ? '#14a058' : '#e2464b', size: PHONE ? 12 : 14 });
    }
      // 아래 설명 칸
    const by = PF.y + PF.h + 10, bh = VH - by - 10;
    panel(PF.x, by, PF.w, bh, 14);
    const bx = PF.x + 16, bw = PF.w - 32, fs = PHONE ? 13 : 14.5;
    if (p.draw) {
      textBlock(bx, by + 26, bw, '중첩 원리: 겹친 곳의 변위 = 파란 펄스의 변위 + 빨간 펄스의 변위. 점이 허용 오차 ' + TOL_CM + ' cm 안에 들어오면 초록 체크가 돼요.', fs, '#26324a', 20, 800);
      textBlock(bx, by + 26 + (PHONE ? 66 : 46), bw, '위로 올라간 변위는 +, 아래로 내려간 변위는 −로 더해요.', fs, '#5d6879', 20, 700);
    } else {
      const x0 = 2.0, ya = pAt(x0, t), yb = pBt(x0, t, cfg);
      textBlock(bx, by + 26, bw, '가운데(2.0 m)의 높이: 파란 펄스 ' + ya.toFixed(1) + ' cm + 빨간 펄스 ' + yb.toFixed(1) + ' cm = ' + (ya + yb).toFixed(1) + ' cm', fs, '#26324a', 20, 800);
      textBlock(bx, by + 26 + (PHONE ? 44 : 28), bw, '펄스가 지나가는 동안 높이를 살펴보세요. 방향 버튼으로 같은 방향·반대 방향을 비교해요.', fs, '#5d6879', 20, 700);
    }
  }

  /* ================= ② ③ 이중 슬릿 장치 ================= */
  const SG = PHONE
    ? { xl: 14, xb: 104, ld0: 96, ldK: 55, sw: 26, yc: 276, gw: 86 }
    : { xl: 22, xb: 196, ld0: 150, ldK: 100, sw: 34, yc: 234, gw: 150 };
  const STRIP_H = 2 * HALF_MM * MM;                   // 스크린 띠의 높이 (픽셀)
  const BOT_Y = SG.yc + HALF_MM * MM + 8;             // 아래 설명 칸의 시작
  const patCv = document.createElement('canvas'); patCv.width = 1; patCv.height = STRIP_H;
  const patCtx = patCv.getContext('2d'); const patImg = patCtx.createImageData(1, STRIP_H);
  const Ibuf = new Float32Array(STRIP_H);
  const LAMS = (() => { const a = []; for (let l = 400; l <= 700; l += 20) a.push(l); return a; })();
  const LAM_RGB = LAMS.map((l) => wlRGB(l));
  const LAM_NORM = [0, 1, 2].map((c) => 255 / LAM_RGB.reduce((s, v) => s + v[c], 0));

  function inten(y, lam, d, L, slits) {                 // y(mm)에서의 상대 밝기 (0~1)
    const env = Math.exp(-Math.pow(y / ENV_MM, 2));
    if (slits === 1) return env;
    const a = Math.PI * 1000 * d * y / (lam * L);
    const c = Math.cos(a); return c * c * env;
  }
  const slitXs = (L) => SG.xb + SG.ld0 + (L - 1) * SG.ldK;
  const slitSep = (d) => 8 + 80 * d;                    // 그림 속 슬릿 간격(과장해서 그림)
  function buildPattern(m) {
    const white = S.sl.light === 'white' && !(S.mode === 'cond' && S.cs === 'unk');
    const base = wlRGB(m.lam); const mx = Math.max(base[0], base[1], base[2]) || 1;
    const sl = S.mode === 'cond' ? 2 : S.sl.slits;
    for (let j = 0; j < STRIP_H; j++) {
      const y = (j + 0.5 - STRIP_H / 2) / MM;
      let r, g, b, lum;
      if (white) {
        r = g = b = 0; lum = 0;
        for (let k = 0; k < LAMS.length; k++) {
          const I = inten(y, LAMS[k], m.d, m.L, sl);
          r += I * LAM_RGB[k][0] * LAM_NORM[0]; g += I * LAM_RGB[k][1] * LAM_NORM[1]; b += I * LAM_RGB[k][2] * LAM_NORM[2]; lum += I;
        }
        lum /= LAMS.length; r = Math.min(255, r); g = Math.min(255, g); b = Math.min(255, b);
        const gm = 0.75; r = 255 * Math.pow(r / 255, gm); g = 255 * Math.pow(g / 255, gm); b = 255 * Math.pow(b / 255, gm);
      } else {
        const I = inten(y, m.lam, m.d, m.L, sl); lum = I;
        const k = Math.pow(I, 0.6);
        r = base[0] / mx * 255 * k; g = base[1] / mx * 255 * k; b = base[2] / mx * 255 * k;
      }
      Ibuf[j] = lum;
      const o = j * 4; patImg.data[o] = r; patImg.data[o + 1] = g; patImg.data[o + 2] = b; patImg.data[o + 3] = 255;
    }
    patCtx.putImageData(patImg, 0, 0);
  }

  function smoothParams(dt) {
    const P = activeP(), m = S.sm;
    const ap = (a, b, r) => (Math.abs(a - b) < 1e-3 * Math.max(1, Math.abs(b)) ? b : SciSim.approach(a, b, dt, r));
    m.lam = ap(m.lam, P.lam, 10); m.d = ap(m.d, P.d, 10); m.L = ap(m.L, P.L, 10);
  }
  const settled = () => { const P = activeP(), m = S.sm; return Math.abs(m.lam - P.lam) < 0.5 && Math.abs(m.d - P.d) < 0.002 && Math.abs(m.L - P.L) < 0.01; };

  function drawSlitScene(dt) {
    smoothParams(dt);
    const m = S.sm, yc = SG.yc, xb = SG.xb, xs = slitXs(m.L), sw = SG.sw;
    const cond = S.mode === 'cond', unk = cond && S.cs === 'unk';
    const white = S.sl.light === 'white' && !unk;
    const slits = cond ? 2 : S.sl.slits;
    buildPattern(m);
    const col = white ? '#ffffff' : wlColor(m.lam);
    // 어두운 실험실 바탕
    D.shadow(() => { D.roundRect(10, 10, VW - 20, BOT_Y - 12, 16); ctx.fillStyle = '#0d1530'; ctx.fill(); }, { blur: 10, y: 3 });
    // 레이저
    D.roundRect(SG.xl, yc - 20, 58, 40, 8); ctx.fillStyle = '#4b5878'; ctx.fill();
    D.roundRect(SG.xl + 46, yc - 9, 18, 18, 4); ctx.fillStyle = '#2a3350'; ctx.fill();
    D.glow(SG.xl + 66, yc, 22, col, 0.8);
    T(SG.xl + 29, yc + 5, white ? '흰빛' : '레이저', 13, '#fff', 'center', 800);
    // 빛줄기: 레이저 → 가림판 (가림판 왼쪽 면에서 끝나요)
    const bx0 = SG.xl + 66, bx1 = xb - 7, hb = 30;
    const g = ctx.createLinearGradient(0, yc - hb, 0, yc + hb);
    g.addColorStop(0, C.rgba(col, 0)); g.addColorStop(0.5, C.rgba(col, 0.62)); g.addColorStop(1, C.rgba(col, 0));
    ctx.fillStyle = g; ctx.fillRect(bx0, yc - hb, bx1 - bx0, hb * 2);
    ctx.save(); ctx.beginPath(); ctx.rect(bx0, yc - hb, bx1 - bx0, hb * 2); ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    for (let k = 0; k < 6; k++) { const px = bx0 + (((S.t * 90) + k * (bx1 - bx0) / 6) % (bx1 - bx0)); ctx.fillRect(px, yc - 2, 10, 4); }
    ctx.restore();
    // 슬릿 위치
    const dd = slitSep(m.d), y1 = yc - dd / 2, y2 = yc + dd / 2, sh = 3.5;
    const open1 = true, open2 = slits === 2;
    // 파면: 열린 슬릿에서 퍼져 나가는 원호 (스크린 왼쪽 면까지만)
    const lamD = Math.max(12, m.lam / 25), ph = (S.t * 38) % lamD;
    ctx.save();
    ctx.beginPath();
    const fan = (x) => (x - xb) * 0.35 + 26;
    ctx.moveTo(xb + 7, yc - fan(xb + 7)); ctx.lineTo(xs - 1, yc - fan(xs - 1)); ctx.lineTo(xs - 1, yc + fan(xs - 1)); ctx.lineTo(xb + 7, yc + fan(xb + 7)); ctx.closePath(); ctx.clip();
    ctx.lineWidth = 2; ctx.strokeStyle = C.rgba(col, 0.42);
    [[y1, open1], [y2, open2]].forEach(([sy, on]) => {
      if (!on) return;
      for (let r = ph; r < xs - xb + 40; r += lamD) { ctx.beginPath(); ctx.arc(xb + 7, sy, r, -1.25, 1.25); ctx.stroke(); }
    });
    ctx.restore();
    // 가림판 (슬릿 구멍만 열려 있어요)
    const wallTop = yc - 120, wallBot = yc + 120, wx = xb - 7, ww = 14;
    const seg = (a, b) => { if (b > a) { ctx.fillStyle = '#c9d2e4'; ctx.fillRect(wx, a, ww, b - a); } };
    D.shadow(() => {
      seg(wallTop, y1 - sh); seg(y1 + sh, y2 - sh); seg(y2 + sh, wallBot);
      if (!open2) { ctx.fillStyle = '#c9d2e4'; ctx.fillRect(wx, y2 - sh, ww, sh * 2); }
    }, { color: 'rgba(0,0,0,.5)', blur: 8, y: 2 });
    if (!open2) { ctx.fillStyle = '#e2464b'; ctx.fillRect(wx + 2, y2 - sh, ww - 4, sh * 2); }
    // 슬릿 구멍의 빛
    [[y1, open1], [y2, open2]].forEach(([sy, on]) => { if (on) { D.glow(xb + 7, sy, 16, col, 0.9); } });
    T(xb, wallTop - 8, '슬릿(가는 틈)', 13, '#cfd8ee', 'center', 800);
    // 스크린 + 눈금 + 세기 그래프
    const sx = xs, stripX = sx, top = yc - STRIP_H / 2;
    D.shadow(() => { ctx.fillStyle = '#05070d'; ctx.fillRect(stripX - 2, top - 2, sw + 4, STRIP_H + 4); }, { color: 'rgba(0,0,0,.6)', blur: 8, y: 2 });
    ctx.imageSmoothingEnabled = true; ctx.drawImage(patCv, stripX, top, sw, STRIP_H);
    ctx.strokeStyle = '#8fa0c4'; ctx.lineWidth = 1.5; ctx.strokeRect(stripX - 0.5, top - 0.5, sw + 1, STRIP_H + 1);
    T(stripX + sw / 2, top - 8, '스크린', 13, '#cfd8ee', 'center', 800);
    // 눈금자 (1 mm = 6 px)
    const rx = stripX + sw + 2;
    ctx.strokeStyle = '#cfd8ee'; ctx.fillStyle = '#cfd8ee'; ctx.lineWidth = 1;
    for (let mm = -HALF_MM; mm <= HALF_MM; mm++) {
      const yy = yc + mm * MM; const big = mm % 10 === 0, mid = mm % 5 === 0;
      ctx.beginPath(); ctx.moveTo(rx, yy); ctx.lineTo(rx + (big ? 9 : mid ? 6 : 3), yy); ctx.stroke();
      if (big) T(rx + 12, yy + 4.5, (mm > 0 ? '+' : '') + mm, 13, '#cfd8ee', 'left', 700);
    }
    T(rx + 12, top - 8, 'mm', 13, '#cfd8ee', 'left', 700);
    // 세기 그래프
    const gx0 = rx + 46, gw = Math.min(SG.gw, VW - 24 - gx0);
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx0, top); ctx.lineTo(gx0, top + STRIP_H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(gx0, top);
    for (let j = 0; j < STRIP_H; j += 2) ctx.lineTo(gx0 + Ibuf[j] * gw, top + j);
    ctx.lineTo(gx0, top + STRIP_H); ctx.closePath();
    ctx.fillStyle = C.rgba(col, 0.28); ctx.fill(); ctx.strokeStyle = C.rgba(col, 0.95); ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
    T(gx0 + gw / 2, top - 8, '빛의 세기', 13, '#cfd8ee', 'center', 800);
    // 무늬 간격 표시 (측정 중이거나 조건 탐구에서)
    if (cond && S.cd.meas) drawCaliper();
    if (cond && S.cs === 'path') drawPathLines(m, xs, dd);
    if (unk) drawMarkers(m, xs);
    // 그림에 대한 안내
    if (PHONE) T(VW / 2, 28, '슬릿 간격·파장은 크게 과장해 그렸어요', 12.5, '#9fb0d2', 'center', 700);
    else T(VW - 24, 30, '※ 슬릿 간격과 파장은 보기 쉽게 크게 그렸어요 (스크린 눈금은 실제 크기)', 13, '#9fb0d2', 'right', 700);
    // 아래 설명 칸
    drawSlitBottom(m, slits, white, unk);
  }

  function drawCaliper() {
    const me = S.cd.meas, p = me.cfg, dx = dxMm(p);
    const k = SciSim.ease.inOutCubic(Math.min(1, me.t / 0.9));
    const xs = slitXs(S.sm.L), yc = SG.yc, x = xs - 12;
    const yA = yc, yB = yc - dx * MM * k;
    ctx.strokeStyle = '#ffd447'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(x - 8, yA); ctx.lineTo(x + 6, yA); ctx.moveTo(x - 8, yB); ctx.lineTo(x + 6, yB); ctx.moveTo(x - 4, yA); ctx.lineTo(x - 4, yB); ctx.stroke();
    if (k > 0.98) D.label(x - 12, (yA + yB) / 2 - (dx * MM < 28 ? 22 : 0), 'Δx = ' + dx.toFixed(1) + ' mm', { bg: '#ffd447', color: '#3a2b00', size: 13, align: 'right' });
  }
  function drawPathLines(m, xs, dd) {
    const yc = SG.yc, yP = S.cd.yP, dxm = dxMm({ lam: m.lam, d: m.d, L: m.L });
    const py = yc + yP * MM;
    const x0 = SG.xb + 7;
    [[yc - dd / 2, '#6fb4ff'], [yc + dd / 2, '#ff8f8f']].forEach(([sy, c]) => {
      ctx.strokeStyle = c; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(x0, sy); ctx.lineTo(xs, py); ctx.stroke();
    });
    D.ring(xs, py, 11, S.t, { color: '#ffb400', width: 3 });
    D.sphere(xs, py, 7, '#ffb400', { shadow: true });
    D.label(xs - 20, py - 18, 'P', { bg: '#ffb400', color: '#3a2b00', size: 14 });
  }
  function drawMarkers(m, xs) {
    const yc = SG.yc, c = S.cd;
    [['A', c.A, '#38bdf8'], ['B', c.B, '#f472b6']].forEach(([nm, y, col]) => {
      const py = yc + y * MM;
      ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(xs - 40, py); ctx.lineTo(xs + SG.sw + 4, py); ctx.stroke(); ctx.setLineDash([]);
      D.sphere(xs - 44, py, 11, col, { shadow: true }); T(xs - 44, py + 5, nm, 13, '#fff', 'center', 800);
    });
  }

  function drawSlitBottom(m, slits, white, unk) {
    const y = BOT_Y, h = VH - y - 10, x = 12, w = VW - 24;
    panel(x, y, w, h, 14);
    const p = { lam: m.lam, d: m.d, L: m.L };
    const fs = PHONE ? 13 : 14.5;
    if (S.mode === 'slit') {
      if (S.sl.part) { drawBullets(x + 8, y + 8, Math.min(w - 16, PHONE ? 456 : 410), h - 16); return; }
      const tx = x + 16;
      const nb = nBright({ lam: S.sl.lamT, d: S.sl.dT, L: S.sl.LT });
      let msg;
      if (slits === 1) msg = '슬릿 1개: 스크린에는 한 덩어리의 밝은 띠만 생겨요. 어두운 줄무늬는 없어요.';
      else if (white) msg = '흰빛: 가운데만 흰색이고 양옆은 색 띠예요. 파장(색)마다 밝은 줄의 간격이 달라서 색이 갈라져요.';
      else msg = '슬릿 2개: 스크린에 밝은 줄 ' + nb + '개와 그 사이의 어두운 줄이 번갈아 생겨요.';
      textBlock(tx, y + 26, w - 32, msg, fs, '#26324a', 20, 800);
      if (!PHONE) textBlock(tx, y + 26 + 44, w - 32, '레이저 ' + S.sl.lamT + ' nm · 슬릿 간격 ' + S.sl.dT.toFixed(2) + ' mm · 스크린 거리 ' + S.sl.LT.toFixed(1) + ' m', 14, '#5d6879', 20, 700);
      return;
    }
    // 간섭 조건 장면
    if (S.cs === 'path') drawPathMeter(x, y, w, h, m);
    else if (S.cs === 'table') drawTable(x, y, w, h);
    else drawUnkInfo(x, y, w, h, m);
  }

  /* ---- 경로차 미터 ---- */
  const PD_MAX = 4;
  function pathRatio(m) { return S.cd.yP / dxMm({ lam: m.lam, d: m.d, L: m.L }); }   // 경로차 ÷ 파장 (부호 있음)
  function drawPathMeter(x, y, w, h, m) {
    const r = Math.abs(pathRatio(m)), lam = m.lam;
    const tx = x + 16, tw = w - 32;
    const bright = Math.abs(r - Math.round(r)) < 0.1, dark = Math.abs(r * 2 - Math.round(r * 2)) < 0.2 && !bright && Math.abs(r - Math.floor(r) - 0.5) < 0.1;
    T(tx, y + 24, '경로차 (슬릿 1 → P) − (슬릿 2 → P) = ' + r.toFixed(2) + ' λ  (= ' + Math.round(r * lam) + ' nm)', PHONE ? 13 : 15, '#26324a', 'left', 800);
    const ax0 = tx + 8, ax1 = tx + tw - 8, ay = y + (PHONE ? 70 : 52);
    const X = (v) => ax0 + (ax1 - ax0) * Math.min(v, PD_MAX) / PD_MAX;
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ax0, ay); ctx.lineTo(ax1, ay); ctx.stroke();
    for (let v = 0; v <= PD_MAX + 1e-9; v += 0.5) {
      const isInt = Math.abs(v - Math.round(v)) < 1e-9;
      ctx.strokeStyle = isInt ? '#ffb400' : '#5b8def'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(X(v), ay - 7); ctx.lineTo(X(v), ay + 7); ctx.stroke();
      T(X(v), ay + 23, (isInt ? v : v) + (v === 0 ? '' : 'λ'), 12.5, isInt ? '#b57a00' : '#3a63bf', 'center', 800);
    }
    D.sphere(X(r), ay, 8, bright ? '#ffb400' : dark ? '#3a63bf' : '#8a95a8', { shadow: true });
    const msg = bright ? '경로차가 파장의 정수배 → 마루와 마루가 만나요 → 보강 (밝음)' : dark ? '경로차가 파장의 반정수배 → 마루와 골이 만나요 → 상쇄 (어두움)' : '경로차가 중간 값이에요. 정수배이면 밝고, 반정수배이면 어두워요.';
    textBlock(tx, y + (PHONE ? 112 : 92), tw, msg, PHONE ? 13 : 14.5, bright ? '#b57a00' : dark ? '#3a63bf' : '#5d6879', 20, 800);
  }

  /* ---- 측정표 ---- */
  const rowKey = (c) => c.lam + '|' + c.d.toFixed(2) + '|' + c.L.toFixed(1);
  const BASE_KEY = rowKey(BASE);
  const nDiff = (c) => (c.lam !== BASE.lam ? 1 : 0) + (Math.abs(c.d - BASE.d) > 1e-6 ? 1 : 0) + (Math.abs(c.L - BASE.L) > 1e-6 ? 1 : 0);
  const isBase = (c) => rowKey(c) === BASE_KEY;
  function measure() {
    if (S.cd.meas || S.mode !== 'cond' || S.cs !== 'table') return;
    const c = { lam: S.sl.lamT, d: S.sl.dT, L: S.sl.LT };
    if (nDiff(c) > 1 && !(game && game.free)) { SciSim.toast('한 번에 하나만 바꿔요. 두 가지 이상 바꾸면 어떤 요인 때문인지 알 수 없어요.', 'bad'); Sound.fail(); return; }
    if (!settled()) { showHint('무늬가 자리를 잡은 뒤에 측정해요.', 2200); return; }
    Sound.click();
    S.cd.meas = { t: 0, cfg: c }; updateCtl();
  }
  function stepMeas(dt) {
    const me = S.cd.meas; if (!me) return;
    me.t += dt;
    if (me.t > 1.7) {
      const c = me.cfg, dx = Math.round(dxMm(c) * 10) / 10;
      const row = { lam: c.lam, d: c.d, L: c.L, dx };
      const k = rowKey(c), i = S.cd.rows.findIndex((r) => rowKey(r) === k);
      if (i >= 0) S.cd.rows[i] = row; else S.cd.rows.push(row);
      S.cd.meas = null; Sound.success(); parts.burst(slitXs(S.sm.L) - 12, SG.yc - 30, { count: 8, speed: 90, size: 3, colors: ['#ffd447', '#ff8f8f', '#6fb4ff'], gravity: 80 });
      updateCtl();
    }
  }
  function drawTable(x, y, w, h) {
    const fs = PHONE ? 12.5 : 13.5, rh = PHONE ? 22 : 17;
    const cols = PHONE ? [0, 0.30, 0.50, 0.66, 0.84] : [0, 0.30, 0.42, 0.55, 0.69, 0.84];
    const heads = PHONE ? ['바꾼 조건', 'λ (nm)', 'd (mm)', 'L (m)', 'Δx (mm)'] : ['바꾼 조건', 'λ (nm)', 'd (mm)', 'L (m)', 'Δx (mm)', '기본의 몇 배'];
    const x0 = x + 14, tw = w - 28;
    heads.forEach((s, i) => T(x0 + tw * cols[i], y + 18, s, fs, '#5d6879', i ? 'center' : 'left', 800, i ? { } : {}));
    ctx.strokeStyle = '#dde4ef'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0, y + 24); ctx.lineTo(x0 + tw, y + 24); ctx.stroke();
    const base = S.cd.rows.find(isBase);
    const maxRows = Math.floor((h - 30) / rh);
    const rows = S.cd.rows.slice(-maxRows);
    if (!rows.length) T(x0, y + 24 + rh, '아직 측정한 기록이 없어요. 📏 무늬 간격 측정하기를 눌러요.', fs, '#8a95a8', 'left', 700);
    rows.forEach((r, i) => {
      const yy = y + 24 + (i + 1) * rh - 3;
      const what = isBase(r) ? '기본' : r.lam !== BASE.lam ? '파장만' : Math.abs(r.d - BASE.d) > 1e-6 ? '슬릿 간격만' : Math.abs(r.L - BASE.L) > 1e-6 ? '스크린 거리만' : '여러 개';
      const cell = [what, String(r.lam), r.d.toFixed(2), r.L.toFixed(1), r.dx.toFixed(1), base ? (r.dx / base.dx).toFixed(2) + '배' : '—'];
      cell.forEach((s, k) => { if (k < heads.length) T(x0 + tw * cols[k], yy, s, fs, k === 4 ? '#b57a00' : '#26324a', k ? 'center' : 'left', 800); });
    });
  }
  function drawUnkInfo(x, y, w, h, m) {
    const c = S.cd, dist = Math.abs(c.B - c.A), p = UNK, dxT = dxMm(p);
    const n = Math.round(dist / dxT);
    const tx = x + 16, tw = w - 32, fs = PHONE ? 13 : 14.5;
    T(tx, y + 24, '표지 A·B 사이 거리 = ' + dist.toFixed(1) + ' mm', fs, '#26324a', 'left', 800);
    if (n >= 1) {
      T(tx, y + 24 + 24, '밝은 줄 사이 ' + n + '칸 → 한 칸(무늬 간격) Δx = ' + dist.toFixed(1) + ' ÷ ' + n + ' = ' + (dist / n).toFixed(1) + ' mm', fs, '#b57a00', 'left', 800);
    } else T(tx, y + 24 + 24, '두 표지를 서로 다른 밝은 줄에 맞춰 보세요 (표지는 밝은 줄에 자석처럼 붙어요).', fs, '#5d6879', 'left', 700);
    textBlock(tx, y + 24 + 48, tw, '구한 Δx와 d = 0.20 mm, L = 3.0 m로 파장을 구해 오른쪽 칸에 nm 단위로 써요.', PHONE ? 12.5 : 14, '#5d6879', 19, 700);
  }

  /* ---- 총알(입자) 모형 카드 ---- */
  function drawBullets(x, y, w, h) {
    const b = S.bul, gy = y + 28 + (h - 40) / 2, gx = x + 26, bxm = x + w * 0.45, sxm = x + w - 30;
    D.roundRect(x, y, w, h, 12); ctx.fillStyle = '#f3f6fc'; ctx.fill();
    T(x + 10, y + 18, '총알(입자) 모형의 예측 (모식도)', 13, '#26324a', 'left', 800);
    // 총
    ctx.fillStyle = '#6a7488'; D.roundRect(x + 6, gy - 8, 24, 16, 4); ctx.fill();
    // 가림판
    const sd = 14, sh2 = 4;
    const open2 = S.sl.slits === 2;
    ctx.fillStyle = '#9aa6bb';
    const wallA = y + 28, wallB = y + h - 18;
    ctx.fillRect(bxm - 4, wallA, 8, (gy - sd - sh2) - wallA);
    ctx.fillRect(bxm - 4, gy - sd + sh2, 8, (gy + sd - sh2) - (gy - sd + sh2));
    ctx.fillRect(bxm - 4, gy + sd + sh2, 8, wallB - (gy + sd + sh2));
    if (!open2) { ctx.fillStyle = '#e2464b'; ctx.fillRect(bxm - 4, gy + sd - sh2, 8, sh2 * 2); }
    // 스크린
    ctx.fillStyle = '#26324a'; ctx.fillRect(sxm, y + 28, 8, h - 40);
    // 총알: 슬릿 구멍을 지나면 직진
    if (S.mode === 'slit' && !RM) {
      const bdt = Math.min(0.05, S.dt || 0.016);
      b.acc += bdt * 30;
      while (b.acc >= 1) {
        b.acc -= 1;
        const a = rnd(-0.12, 0.12);
        b.list.push({ x: gx + 12, y: gy, a, vx: 230, pass: null, dead: 0 });
      }
    }
    for (let i = b.list.length - 1; i >= 0; i--) {
      const u = b.list[i];
      if (u.dead) { u.dead += Math.min(0.05, S.dt || 0.016); if (u.dead > 0.2) b.list.splice(i, 1); continue; }
      u.x += u.vx * Math.min(0.05, S.dt || 0.016); u.y = gy + Math.tan(u.a) * (u.x - (gx + 12));
      if (u.pass === null && u.x >= bxm - 4) {
        const ok = Math.abs(u.y - (gy - sd)) < sh2 || (open2 && Math.abs(u.y - (gy + sd)) < sh2);
        u.pass = ok;
        if (!ok) { u.dead = 0.001; parts.emit({ x: u.x, y: u.y, vx: -40, vy: rnd(-30, 30), life: 0.35, size: 2.2, color: '#e2464b' }); continue; }
      }
      if (u.x >= sxm) {
        const bin = Math.max(0, Math.min(63, Math.floor((u.y - (y + 28)) / (h - 40) * 64)));
        b.hist[bin] += 1; b.n++; b.list.splice(i, 1); continue;
      }
      D.sphere(u.x, u.y, 3, '#ffb400', { gloss: false });
    }
    // 쌓인 총알 (두 줄)
    let mx = 1; for (let i = 0; i < 64; i++) mx = Math.max(mx, b.hist[i]);
    for (let i = 0; i < 64; i++) if (b.hist[i] > 0) { ctx.fillStyle = 'rgba(255,180,0,' + Math.min(1, b.hist[i] / mx) + ')'; ctx.fillRect(sxm + 8, y + 28 + i * (h - 40) / 64, 8, (h - 40) / 64 + 0.5); }
    T(sxm - 6, y + h - 6, '스크린', 12.5, '#5d6879', 'right', 700);
    T(bxm, y + h - 6, open2 ? '슬릿 2개' : '슬릿 1개', 12.5, '#5d6879', 'center', 700);
    if (VW - 24 - (x + w + 10) > 100) textBlock(x + w + 10, y + 22, VW - 24 - (x + w + 10) - 6, '총알은 슬릿을 곧게 지나가서 두 줄만 생겨요. 줄무늬는 생기지 않아요.', 13, '#26324a', 18, 800);
  }

  /* ================= ④ 간섭 기술과 현상 ================= */
  const TL = PHONE ? { x: 12, y: 12, w: 456, h: 300 } : { x: 12, y: 12, w: 470, h: 402 };     // 왼쪽(그림)
  const TR = PHONE ? { x: 12, y: 322, w: 456, h: 158 } : { x: 494, y: 12, w: 294, h: 402 };   // 오른쪽(파형·그래프)
  const TB = PHONE ? { x: 12, y: 490, w: 456, h: 140 } : { x: 12, y: 424, w: 776, h: 124 };   // 아래(설명)
  const coatR = (t, lam) => { const c = Math.cos(TAU * N_FILM * t / lam); return c * c; };   // 코팅 없을 때를 1로 본 반사 세기
  const coatPct = (t) => (S.tc.cw === 'green' ? coatR(t, LAM_GREEN) : coatWhiteLum(t)) * 100;
  function coatWhiteLum(t) { let s = 0; LAMS.forEach((l) => { s += coatR(t, l); }); return s / LAMS.length; }
  function spectrumRGB(fn) {   // 파장별 세기 함수 → 합성 색 (흰빛 = 모든 파장이 1일 때)
    let r = 0, g = 0, b = 0;
    LAMS.forEach((l, k) => { const I = fn(l); r += I * LAM_RGB[k][0] * LAM_NORM[0]; g += I * LAM_RGB[k][1] * LAM_NORM[1]; b += I * LAM_RGB[k][2] * LAM_NORM[2]; });
    const gm = 0.8;
    return [r, g, b].map((v) => Math.round(255 * Math.pow(Math.min(255, v) / 255, gm)));
  }
  const rgbStr = (c) => 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';

  function stepTech(dt) {
    const t = S.tc;
    t.th = Math.abs(t.th - t.thT) < 0.05 ? t.thT : SciSim.approach(t.th, t.thT, dt, 12);
    t.soap = Math.abs(t.soap - t.soapT) < 0.5 ? t.soapT : SciSim.approach(t.soap, t.soapT, dt, 6);
    t.ph = Math.abs(t.ph - t.phT) < 0.3 ? t.phT : SciSim.approach(t.ph, t.phT, dt, 10);
    t.arm = Math.abs(t.arm - t.armT) < 0.3 ? t.armT : SciSim.approach(t.arm, t.armT, dt, 10);
    if (S.mode === 'tech' && t.sub === 'coat') {
      if (t.cw === 'green' && coatR(t.thT, LAM_GREEN) * 100 <= 2) t.seen.min = true;
      if (t.cw === 'white' && Math.abs(t.thT - 100) <= 8) t.seen.white = true;
    }
  }
  function drawTech() {
    panel(TL.x, TL.y, TL.w, TL.h, 14); panel(TR.x, TR.y, TR.w, TR.h, 14); panel(TB.x, TB.y, TB.w, TB.h, 14);
    const sub = S.tc.sub;
    if (sub === 'coat') drawCoat(); else if (sub === 'soap') drawSoap(); else if (sub === 'phone') drawPhone(); else drawLigo();
  }
  function rayLine(x1, y1, x2, y2, col, w, alpha, arrow) {
    ctx.save(); ctx.globalAlpha = alpha == null ? 1 : alpha; ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    if (arrow) { const a = Math.atan2(y2 - y1, x2 - x1), mx = (x1 + x2) / 2, my = (y1 + y2) / 2; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(mx + Math.cos(a) * 7, my + Math.sin(a) * 7); ctx.lineTo(mx - Math.cos(a) * 5 + Math.sin(a) * 5, my - Math.sin(a) * 5 - Math.cos(a) * 5); ctx.lineTo(mx - Math.cos(a) * 5 - Math.sin(a) * 5, my - Math.sin(a) * 5 + Math.cos(a) * 5); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  }
  function waveStrip(x, y, w, h, fn, col, label, lw) {   // 파형 한 줄 (fn(u) → −1~1)
    ctx.save();
    ctx.fillStyle = '#f7f9fd'; D.roundRect(x, y, w, h, 8); ctx.fill();
    ctx.strokeStyle = '#cdd6e6'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 4, y + h / 2); ctx.lineTo(x + w - 4, y + h / 2); ctx.stroke();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.strokeStyle = col; ctx.lineWidth = lw || 3; ctx.lineJoin = 'round'; ctx.beginPath();
    for (let i = 0; i <= 80; i++) { const u = i / 80, py = y + h / 2 - fn(u) * (h / 2 - 5); if (i === 0) ctx.moveTo(x + u * w, py); else ctx.lineTo(x + u * w, py); }
    ctx.stroke(); ctx.restore();
    T(x + 8, y + 15, label, PHONE ? 11.5 : 12.5, '#5d6879', 'left', 800);
  }

  /* ---- 무반사 코팅 ---- */
  function drawCoat() {
    const tc = S.tc, th = tc.th, white = tc.cw === 'white';
    const lam = white ? LAM_GREEN : LAM_GREEN;
    const col = white ? '#ffffff' : wlColor(LAM_GREEN);
    const sc = PHONE ? 0.42 : 0.5;                       // 막 두께 1 nm = sc 픽셀
    const y0 = TL.y + (PHONE ? 112 : 172), thp = th * sc, y1 = y0 + thp, yb = TL.y + TL.h - 8;
    const ax = TL.x + TL.w * 0.4;
    // 공기 / 막 / 유리
    ctx.save(); D.roundRect(TL.x, TL.y, TL.w, TL.h, 14); ctx.clip();
    const gsky = ctx.createLinearGradient(0, TL.y, 0, y0); gsky.addColorStop(0, '#f4f8ff'); gsky.addColorStop(1, '#e3edfb'); ctx.fillStyle = gsky; ctx.fillRect(TL.x, TL.y, TL.w, y0 - TL.y);
    const gg = ctx.createLinearGradient(0, y1, 0, yb); gg.addColorStop(0, '#b9d6e8'); gg.addColorStop(1, '#8fb8d2'); ctx.fillStyle = gg; ctx.fillRect(TL.x, y1, TL.w, yb - y1);
    if (thp > 0.3) { ctx.fillStyle = 'rgba(255,196,77,.85)'; ctx.fillRect(TL.x, y0, TL.w, thp); ctx.strokeStyle = '#d98d12'; ctx.lineWidth = 1.5; ctx.strokeRect(TL.x, y0, TL.w, thp); }
    ctx.strokeStyle = '#4b6b88'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(TL.x, y1); ctx.lineTo(TL.x + TL.w, y1); ctx.stroke();
    T(TL.x + TL.w - 10, y0 - 8, '공기', 13, '#5d6879', 'right', 800);
    T(TL.x + TL.w - 10, y1 + 20, '유리 렌즈', 13, '#36556f', 'right', 800);
    if (thp >= 18) T(TL.x + TL.w - 10, y0 + thp / 2 + 5, '코팅 막', 13, '#7a4b00', 'right', 800);
    // 광선
    const ti = 20 * rad, tr = Math.asin(Math.sin(ti) / N_FILM), tg = Math.asin(Math.sin(ti) / 1.5);
    const R = PHONE ? 80 : 118;
    const A = [ax, y0], Bp = [ax + thp * Math.tan(tr), y1], Cp = [ax + 2 * thp * Math.tan(tr), y0];
    const rPct = coatPct(th);
    rayLine(A[0] - Math.sin(ti) * R, A[1] - Math.cos(ti) * R, A[0], A[1], col, 4, 1, true);
    rayLine(A[0], A[1], A[0] + Math.sin(ti) * R, A[1] - Math.cos(ti) * R, '#ff7a45', 3, 0.95, true);          // ① 윗면 반사
    if (thp > 0.8) {
      rayLine(A[0], A[1], Bp[0], Bp[1], col, 3, 0.9, true);
      rayLine(Bp[0], Bp[1], Cp[0], Cp[1], col, 3, 0.9, true);
      rayLine(Cp[0], Cp[1], Cp[0] + Math.sin(ti) * R * 0.95, Cp[1] - Math.cos(ti) * R * 0.95, '#3a8dff', 3, 0.95, true);   // ② 아랫면 반사
      rayLine(Bp[0], Bp[1], Bp[0] + Math.sin(tg) * 80, Bp[1] + Math.cos(tg) * Math.min(80, yb - Bp[1] - 2), col, 3, 0.45);
    } else {
      rayLine(A[0], A[1], A[0] + Math.sin(tg) * 80, A[1] + Math.cos(tg) * 80, col, 3, 0.45);
    }
    // 합쳐진 반사광 (밝기가 반사 세기에 비례)
    const ex = A[0] + Math.sin(ti) * R + (Cp[0] - A[0]) * 0.5, ey = A[1] - Math.cos(ti) * R;
    D.glow(ex, ey, 34, white ? '#ffffff' : col, 0.75 * Math.min(1, rPct / 100));
    D.label(ex + 6, ey - 20, '반사광 ' + Math.round(rPct) + ' %', { bg: rPct <= 2 ? '#14a058' : '#26324a', size: 13 });
    ctx.restore();
    if (thp > 0.8) { D.label(A[0] - 16, A[1] - 22, '①', { bg: '#ff7a45', size: 13 }); D.label(Cp[0] + 40, Cp[1] - 22 - 28, '②', { bg: '#3a8dff', size: 13 }); }
    T(TL.x + 12, TL.y + 24, PHONE ? '코팅 단면 (빛은 비스듬히 그렸어요)' : '렌즈 표면의 코팅 단면 (거의 수직으로 들어오는 빛을 비스듬히 그렸어요)', PHONE ? 11.5 : 13, '#5d6879', 'left', 700);
    // 오른쪽: 파형
    const phi = TAU * N_FILM * th / LAM_GREEN * 2;         // 두 반사파의 위상 차이 (4π n t / λ)
    const wx = TR.x + 12, ww = TR.w - 24, sh = PHONE ? 38 : 88, gap = PHONE ? 6 : 14;
    const ky = TAU * 2, ph0 = S.t * 5;
    let wy = TR.y + (PHONE ? 8 : 38);
    if (!PHONE) T(TR.x + 12, TR.y + 24, '초록빛(550 nm)의 반사파', 14, '#26324a', 'left', 800);
    waveStrip(wx, wy, ww, sh, (u) => Math.cos(ky * u - ph0), '#ff7a45', '① 윗면에서 반사');
    wy += sh + gap;
    waveStrip(wx, wy, ww, sh, (u) => Math.cos(ky * u - ph0 + phi), '#3a8dff', '② 아랫면에서 반사 (더 먼 길)');
    wy += sh + gap;
    waveStrip(wx, wy, ww, sh, (u) => (Math.cos(ky * u - ph0) + Math.cos(ky * u - ph0 + phi)) / 2, '#1b2333', '①+② 겹친 파동', 4.5);
    // 아래: 스펙트럼 + 설명
    const ax0 = TB.x + 56, ay0 = TB.y + (PHONE ? 30 : 30), aw = PHONE ? 220 : 330, ah = TB.h - 66;
    const ao = axes(ax0, ay0, aw, ah, { xmin: 400, xmax: 700, ymin: 0, ymax: 1, xt: [[400, '400'], [500, '500'], [600, '600'], [700, '700 nm']], yt: [[0, '0'], [1, '100%']], fs: 12, ylx: 44 });
    ctx.save(); ctx.beginPath(); ctx.rect(ao.x, ao.y, ao.w, ao.h); ctx.clip();
    ctx.beginPath(); ctx.moveTo(ao.X(400), ao.Y(0));
    for (let l = 400; l <= 700; l += 5) ctx.lineTo(ao.X(l), ao.Y(coatR(th, l)));
    ctx.lineTo(ao.X(700), ao.Y(0)); ctx.closePath();
    const sg = ctx.createLinearGradient(ao.X(400), 0, ao.X(700), 0);
    for (let l = 400; l <= 700; l += 50) sg.addColorStop((l - 400) / 300, wlColor(l));
    ctx.globalAlpha = 0.85; ctx.fillStyle = sg; ctx.fill(); ctx.globalAlpha = 1; ctx.strokeStyle = '#26324a'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
    if (!white) { ctx.strokeStyle = '#14a058'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(ao.X(LAM_GREEN), ao.y); ctx.lineTo(ao.X(LAM_GREEN), ao.y + ao.h); ctx.stroke(); ctx.setLineDash([]); }
    T(ao.x + ao.w / 2, TB.y + 14, '파장별 반사 세기 (코팅 없을 때 = 100 %)', 12.5, '#26324a', 'center', 800);
    const sx = ao.x + ao.w + (PHONE ? 12 : 24), swid = TB.x + TB.w - 14 - sx;
    const refl = spectrumRGB((l) => coatR(th, l));
    if (white) { ctx.fillStyle = rgbStr(refl); D.roundRect(sx, TB.y + 14, 46, 30, 8); ctx.fill(); ctx.strokeStyle = '#cdd6e6'; ctx.lineWidth = 1.5; ctx.stroke(); T(sx + 54, TB.y + 34, '흰빛이 반사되어 보이는 색', 13, '#26324a', 'left', 800); }
    const msg = white
      ? (th === 0 ? '코팅이 없으면 모든 색이 같은 비율로 반사돼요.' : '코팅 두께에 따라 줄어드는 색이 달라서, 반사광은 약간 푸르거나 보랏빛으로 보여요.')
      : (rPct <= 2 ? '두 반사파가 반대 위상으로 만나 상쇄돼요! 막 속 파장(약 400 nm)의 1/4쯤 되는 두께예요.' : '두 반사파의 위상 차이가 ' + Math.round(((phi * 180 / Math.PI) % 360 + 360) % 360) + '°예요. 180°에 가까울수록 상쇄돼요.');
    textBlock(sx, TB.y + (white ? 66 : 36), swid, msg, PHONE ? 12.5 : 14, rPct <= 2 && !white ? '#14a058' : '#26324a', 18, 800);
  }

  /* ---- 비눗방울 ---- */
  const soapCv = document.createElement('canvas'); soapCv.width = 1; soapCv.height = 300;
  const soapCtx = soapCv.getContext('2d'); const soapImg = soapCtx.createImageData(1, 300);
  const soapR = (t, lam) => { const s = Math.sin(TAU * N_SOAP * t / lam); return s * s; };   // 비눗물 막: 반사 세기 (두께 0이면 검게 보임)
  const soapT = (yf, tb) => tb * Math.pow(yf, 1.15) + 25 * Math.sin(S.t * 0.9 + yf * 11) * yf * yf;
  function soapGeo() { const fw = PHONE ? 190 : 230, fh = PHONE ? 250 : 330; return { fw, fh, fx: TL.x + TL.w / 2 - fw / 2, fy: TL.y + (PHONE ? 46 : 54) }; }
  function drawSoap() {
    const tb = S.tc.soap;
    const { fw, fh, fx, fy } = soapGeo();
    for (let j = 0; j < 300; j++) {
      const yf = (j + 0.5) / 300, t = soapT(yf, tb), c = spectrumRGB((l) => soapR(t, l));
      const o = j * 4; soapImg.data[o] = c[0]; soapImg.data[o + 1] = c[1]; soapImg.data[o + 2] = c[2]; soapImg.data[o + 3] = 255;
    }
    soapCtx.putImageData(soapImg, 0, 0);
    T(TL.x + TL.w / 2, TL.y + 22, '세워 둔 비눗물 막 (위쪽은 얇고 아래쪽은 두꺼워요)', PHONE ? 12 : 14, '#5d6879', 'center', 800);
    D.shadow(() => { ctx.fillStyle = '#10141f'; D.roundRect(fx - 10, fy - 8, fw + 20, fh + 16, 12); ctx.fill(); }, { blur: 8, y: 3 });
    ctx.save(); D.roundRect(fx, fy, fw, fh, 6); ctx.clip(); ctx.imageSmoothingEnabled = true; ctx.drawImage(soapCv, fx, fy, fw, fh);
    const gl = ctx.createLinearGradient(fx, 0, fx + fw, 0); gl.addColorStop(0, 'rgba(255,255,255,.35)'); gl.addColorStop(0.25, 'rgba(255,255,255,0)'); gl.addColorStop(1, 'rgba(255,255,255,.08)'); ctx.fillStyle = gl; ctx.fillRect(fx, fy, fw, fh);
    ctx.restore();
    // 두께 눈금 (왼쪽)
    for (let k = 0; k <= 4; k++) { const yf = k / 4, yy = fy + yf * fh; ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(fx - 20, yy); ctx.lineTo(fx - 12, yy); ctx.stroke(); T(fx - 24, yy + 4.5, Math.round(tb * Math.pow(yf, 1.15)) + '', 12.5, '#5d6879', 'right', 700); }
    T(fx - 24, fy - 14, '두께(nm)', 12.5, '#5d6879', 'right', 700);
    // 탐침
    const pf = S.tc.probe, py = fy + pf * fh, pt = soapT(pf, tb);
    ctx.strokeStyle = '#ffb400'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(fx - 8, py); ctx.lineTo(fx + fw + 8, py); ctx.stroke();
    D.sphere(fx + fw + 14, py, 10, '#ffb400', { shadow: true });
    T(fx + fw + 14, py - 16, '끌어 보세요', 12, '#b57a00', 'center', 800);
    // 오른쪽: 이 두께의 반사 스펙트럼
    T(TR.x + 12, TR.y + 24, '탐침 위치의 두께 ' + Math.round(pt) + ' nm', PHONE ? 12.5 : 14, '#26324a', 'left', 800);
    const ao = axes(TR.x + 40, TR.y + (PHONE ? 38 : 50), TR.w - 56, PHONE ? 74 : 190, { xmin: 400, xmax: 700, ymin: 0, ymax: 1, xt: [[400, '400'], [550, '550'], [700, '700 nm']], yt: [[0, '0'], [1, '100%']], fs: 12, ylx: 34 });
    ctx.save(); ctx.beginPath(); ctx.rect(ao.x, ao.y, ao.w, ao.h); ctx.clip();
    ctx.beginPath(); ctx.moveTo(ao.X(400), ao.Y(0)); for (let l = 400; l <= 700; l += 4) ctx.lineTo(ao.X(l), ao.Y(soapR(pt, l))); ctx.lineTo(ao.X(700), ao.Y(0)); ctx.closePath();
    const sg = ctx.createLinearGradient(ao.X(400), 0, ao.X(700), 0); for (let l = 400; l <= 700; l += 50) sg.addColorStop((l - 400) / 300, wlColor(l));
    ctx.globalAlpha = 0.85; ctx.fillStyle = sg; ctx.fill(); ctx.globalAlpha = 1; ctx.strokeStyle = '#26324a'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    const c = spectrumRGB((l) => soapR(pt, l));
    ctx.fillStyle = rgbStr(c); D.roundRect(TR.x + 14, ao.y + ao.h + (PHONE ? 22 : 42), 44, 28, 8); ctx.fill(); ctx.strokeStyle = '#cdd6e6'; ctx.lineWidth = 1.5; ctx.stroke();
    T(TR.x + 66, ao.y + ao.h + (PHONE ? 41 : 61), '보이는 색', 13, '#26324a', 'left', 800);
    const msg = pt < 25 ? '아주 얇은 곳은 위·아래 반사광이 서로 상쇄돼서 검게 보여요.' : '두께가 달라지면 보강되는 빛의 파장(색)이 달라져서 색 띠가 생겨요. 막이 흘러내리면 띠도 움직여요.';
    textBlock(TB.x + 16, TB.y + 28, TB.w - 32, msg, PHONE ? 12.5 : 14.5, '#26324a', 20, 800);
    textBlock(TB.x + 16, TB.y + (PHONE ? 78 : 72), TB.w - 32, '비눗방울과 기름막의 무지개색도 같은 원리예요. 흰빛에는 여러 파장이 섞여 있어서 두께마다 보강되는 색이 달라요.', PHONE ? 12 : 13.5, '#5d6879', 19, 700);
  }

  /* ---- 소음 제거 헤드폰 ---- */
  function drawPhone() {
    const phs = S.tc.ph * rad, ph0 = S.t * 6, k = TAU * 3;
    const left = TL.x + 16, w = TL.w - 32, sh = PHONE ? 62 : 100, gap = PHONE ? 8 : 14;
    let y = TL.y + (PHONE ? 38 : 48);
    T(TL.x + 14, TL.y + 24, '소음 + 헤드폰이 낸 반대 소리 = 귀에 들리는 소리', PHONE ? 12.5 : 14.5, '#26324a', 'left', 800);
    waveStrip(left, y, w, sh, (u) => Math.cos(k * u - ph0), '#e2464b', '🔊 바깥 소음');
    y += sh + gap;
    waveStrip(left, y, w, sh, (u) => Math.cos(k * u - ph0 + phs), '#2f6df6', '🎧 헤드폰이 낸 소리 (위상 ' + Math.round(S.tc.phT) + '°)');
    y += sh + gap;
    waveStrip(left, y, w, sh, (u) => (Math.cos(k * u - ph0) + Math.cos(k * u - ph0 + phs)) / 2, '#14a058', '👂 귀에 들리는 소리 (합)', 4.5);
    const left_ = Math.abs(Math.cos(phs / 2));          // 남은 소음의 크기 (소음만 있을 때 = 1)
    // 오른쪽: 남은 소음 막대
    const bx = TR.x + (PHONE ? 30 : 60), bw = PHONE ? TR.w - 60 : TR.w - 120, by = TR.y + (PHONE ? 50 : 70), bh = PHONE ? 26 : 250;
    T(TR.x + TR.w / 2, TR.y + 26, '귀에 남은 소음', 14.5, '#26324a', 'center', 800);
    if (PHONE) {
      ctx.fillStyle = '#e8edf6'; D.roundRect(bx, by, bw, bh, 8); ctx.fill();
      ctx.fillStyle = left_ < 0.03 ? '#14a058' : '#e2464b'; D.roundRect(bx, by, Math.max(0, bw * left_), bh, 8); ctx.fill();
      T(bx + bw / 2, by + bh + 28, Math.round(left_ * 100) + ' %', 20, '#26324a', 'center', 800);
    } else {
      ctx.fillStyle = '#e8edf6'; D.roundRect(bx, by, bw, bh, 10); ctx.fill();
      const hh = bh * left_;
      ctx.fillStyle = left_ < 0.03 ? '#14a058' : '#e2464b'; D.roundRect(bx, by + bh - hh, bw, hh, 10); ctx.fill();
      T(bx + bw / 2, by + bh + 36, Math.round(left_ * 100) + ' %', 26, '#26324a', 'center', 800);
      T(bx + bw / 2, by + bh + 58, '(소음만 있을 때 = 100 %)', 12.5, '#5d6879', 'center', 700);
    }
    const msg = left_ < 0.03 ? '반대 위상(180°)의 소리가 마루와 골이 만나게 해서 소리가 상쇄돼요. 헤드폰은 마이크로 소음을 듣고 반대 위상의 소리를 내요.' : '위상이 180°에서 멀어질수록 상쇄가 덜 되어 소음이 남아요. 0°(같은 위상)이면 오히려 두 배로 커져요.';
    textBlock(TB.x + 16, TB.y + 30, TB.w - 32, msg, PHONE ? 12.5 : 14.5, '#26324a', 20, 800);
  }

  /* ---- 간섭계 (LIGO) ---- */
  function drawLigo() {
    const arm = S.tc.arm, dxp = arm * 0.05;                       // 거울 이동 (1 nm = 0.05 픽셀로 크게 그림)
    const cx = TL.x + (PHONE ? 150 : 170), cy = TL.y + (PHONE ? 160 : 205), L0 = PHONE ? 150 : 200, L1 = PHONE ? 110 : 150;
    const mx = cx + L0 + dxp, my = cy - L1;
    T(TL.x + 14, TL.y + 24, '마이컬슨 간섭계 모식도 (거울 이동은 크게 과장해서 그렸어요)', PHONE ? 11.5 : 13.5, '#5d6879', 'left', 800);
    const col = '#e2464b', col2 = '#ff9a3c';
    // 레이저 → 분광기
    const lx = TL.x + 28;
    D.roundRect(lx - 14, cy - 14, 34, 28, 6); ctx.fillStyle = '#4b5878'; ctx.fill(); T(lx + 3, cy + 5, '레이저', 11.5, '#fff', 'center', 800);
    rayLine(lx + 20, cy, cx, cy, col, 4, 0.9);
    // 가는 팔: 오른쪽, 위쪽
    rayLine(cx, cy - 4, mx - 7, cy - 4, col, 3, 0.9); rayLine(mx - 7, cy + 4, cx, cy + 4, col2, 3, 0.9);
    rayLine(cx - 4, cy, cx - 4, my + 7, col, 3, 0.9); rayLine(cx + 4, my + 7, cx + 4, cy, col2, 3, 0.9);
    // 합쳐진 빛 → 검출기
    const dy = cy + (PHONE ? 100 : 140);
    rayLine(cx, cy, cx, dy - 26, '#ff6a6a', 5, 0.35 + 0.6 * ligoI(arm));
    // 분광기
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.PI / 4); D.roundRect(-4, -26, 8, 52, 2); ctx.fillStyle = 'rgba(150,200,255,.75)'; ctx.fill(); ctx.strokeStyle = '#4b6b88'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
    // 거울
    D.shadow(() => { ctx.fillStyle = '#8791a5'; ctx.fillRect(mx - 3, cy - 24, 8, 48); ctx.fillRect(cx - 24, my - 5, 48, 8); }, { blur: 4, y: 2 });
    T(mx + 14, cy + 4, '거울 1', 12.5, '#26324a', 'left', 800); T(cx + 30, my + 4, '거울 2', 12.5, '#26324a', 'left', 800); T(cx + 12, cy + 38, '빛 가르개', 12.5, '#26324a', 'left', 800);
    T((cx + mx) / 2, cy + 22, '팔 1', 12.5, '#5d6879', 'center', 700);
    if (arm > 0) { rayLine(cx + L0, cy - 30, mx, cy - 30, '#14a058', 2.5, 1); T(mx + 6, cy - 36, 'ΔL = ' + Math.round(S.tc.armT) + ' nm', 12.5, '#14a058', 'left', 800); }
    // 검출기 (밝기)
    const I = ligoI(arm);
    D.glow(cx, dy, 60, '#ff5a5a', 0.5 * I);
    ctx.fillStyle = C.mix('#2a1215', '#ff6a6a', I); ctx.beginPath(); ctx.arc(cx, dy, 24, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#26324a'; ctx.lineWidth = 3; ctx.stroke();
    T(cx + 36, dy + 5, '검출기', 12.5, '#26324a', 'left', 800);
    // 오른쪽: 밝기-길이 변화 그래프
    T(TR.x + 12, TR.y + 24, '검출기의 밝기 ↔ 팔 길이 변화', PHONE ? 12.5 : 14, '#26324a', 'left', 800);
    const ao = axes(TR.x + 40, TR.y + (PHONE ? 36 : 50), TR.w - 56, PHONE ? 80 : 200, { xmin: 0, xmax: 600, ymin: 0, ymax: 1, xt: [[0, '0'], [266, '266'], [532, '532 nm']], yt: [[0, '어둠'], [1, '밝음']], fs: 12, ylx: 38 });
    ctx.save(); ctx.beginPath(); ctx.rect(ao.x, ao.y, ao.w, ao.h); ctx.clip();
    ctx.beginPath(); for (let v = 0; v <= 600; v += 5) { const px = ao.X(v), py = ao.Y(ligoI(v)); if (v === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
    ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
    D.sphere(ao.X(arm), ao.Y(I), 7, '#ffb400', { shadow: true });
    textBlock(TB.x + 16, TB.y + 28, TB.w - 32, '한쪽 팔이 ΔL만큼 길어지면 빛이 왕복하며 2ΔL만큼 더 가요. 레이저 파장 ' + LAM_LIGO + ' nm의 1/4인 266 nm만 늘어나도 왕복 경로차가 반 파장이 되어 상쇄(어두움)돼요.', PHONE ? 12 : 14, '#26324a', 19, 800);
    textBlock(TB.x + 16, TB.y + (PHONE ? 96 : 76), TB.w - 32, 'LIGO는 팔 길이가 4 km인 간섭계예요. 간섭 무늬의 밝기 변화로 양성자 지름보다 작은 길이 변화까지 알아냈어요.', PHONE ? 12 : 13.5, '#5d6879', 19, 700);
  }
  function ligoI(dl) { const c = Math.cos(TAU * dl / LAM_LIGO); return c * c; }      // 검출기 밝기 (ΔL = 0이면 가장 밝음)

  /* ================= 포인터 (점·표지·탐침 끌기) ================= */
  function soapProbe() { const g = soapGeo(); return { x: g.fx + g.fw + 14, y: g.fy + S.tc.probe * g.fh, g }; }
  const markerY = (k) => SG.yc + (k === 'A' ? S.cd.A : S.cd.B) * MM;
  function nearestBright(y, p) {   // 가장 가까운 밝은 줄의 위치 (mm)
    const dx = dxMm(p); return Math.round(y / dx) * dx;
  }
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'wave' && S.wsub === 'pulse' && S.pl.draw) {
        const dots = dotsOf(S.pl.cfg); let best = -1, bd = 1e9;
        SAMPLE_X.forEach((x, i) => {
          if (dots[i].ok) return;
          const dx = p.x - (PX0 + x * PXM), dy = p.y - (PY0 - dots[i].y * PCM), dd = Math.hypot(dx, dy);
          if (dd < 28 && dd < bd) { bd = dd; best = i; }
        });
        if (best >= 0) { S.pl.drag = best; Sound.click(); return true; }
        return false;
      }
      if (S.mode === 'cond' && S.cs === 'path') {
        const m = S.sm, xs = slitXs(m.L), py = SG.yc + S.cd.yP * MM;
        if (Math.hypot(p.x - xs, p.y - py) < 26) { S.cd.drag = true; Sound.click(); return true; }
        return false;
      }
      if (S.mode === 'cond' && S.cs === 'unk') {
        const xs = slitXs(UNK.L);
        for (const k of ['A', 'B']) if (Math.hypot(p.x - (xs - 44), p.y - markerY(k)) < 26) { S.cd.mdrag = k; Sound.click(); return true; }
        return false;
      }
      if (S.mode === 'tech' && S.tc.sub === 'soap') {
        const pr = soapProbe();
        if (Math.hypot(p.x - pr.x, p.y - pr.y) < 28 || (Math.abs(p.y - pr.y) < 14 && p.x > pr.g.fx - 20 && p.x < pr.g.fx + pr.g.fw + 30)) { S.tc.pdrag = true; return true; }
      }
      return false;
    },
    move(p) {
      if (S.pl.drag != null) {
        const dots = dotsOf(S.pl.cfg), i = S.pl.drag;
        dots[i].y = clamp(Math.round((PY0 - p.y) / PCM * 10) / 10, -8.5, 8.5);
      } else if (S.cd.drag) {
        const m = S.sm, p0 = { lam: m.lam, d: m.d, L: m.L }, dxm = dxMm(p0);
        let y = clamp((p.y - SG.yc) / MM, -HALF_MM + 0.5, HALF_MM - 0.5);
        const q = y / dxm, h = Math.round(q * 2) / 2;
        if (Math.abs(q - h) < 0.1) y = h * dxm;                    // 정수배·반정수배 가까이에서는 자석처럼 붙어요
        S.cd.yP = clamp(y, -HALF_MM + 0.3, HALF_MM - 0.3);
      } else if (S.cd.mdrag) {
        let y = clamp((p.y - SG.yc) / MM, -HALF_MM + 0.3, HALF_MM - 0.3);
        const nb = nearestBright(y, UNK);
        if (Math.abs(y - nb) < Math.min(1.6, 0.16 * dxMm(UNK)) && Math.abs(nb) < HALF_MM) y = nb;
        if (S.cd.mdrag === 'A') S.cd.A = y; else S.cd.B = y;
      } else if (S.tc.pdrag) {
        const g = soapGeo(); S.tc.probe = clamp((p.y - g.fy) / g.fh, 0.02, 0.98);
      }
    },
    up() {
      if (S.pl.drag != null) {
        const cfg = S.pl.cfg, dots = dotsOf(cfg), i = S.pl.drag; S.pl.drag = null;
        const want = sumAt(SAMPLE_X[i], PULSE.T0, cfg);
        if (Math.abs(dots[i].y - want) <= TOL_CM) {
          dots[i].ok = true; dots[i].y = want; Sound.success();
          parts.burst(PX0 + SAMPLE_X[i] * PXM, PY0 - want * PCM, { count: 8, speed: 90, size: 3, colors: ['#14a058', '#ffd447'], gravity: 80 });
          if (dots.every((d) => d.ok)) S.pl.solved[cfg] = true;
        } else { Sound.fail(); showHint('조금 더 위(또는 아래)예요. 파란 점과 빨간 점의 높이를 더해 보세요.', 2600); }
      }
      S.cd.drag = false; S.cd.mdrag = null; S.tc.pdrag = false;
    },
    hover(p) {
      if (S.mode === 'wave' && S.wsub === 'pulse' && S.pl.draw) return 'grab';
      if (S.mode === 'cond' && S.cs === 'path') { const m = S.sm; return Math.hypot(p.x - slitXs(m.L), p.y - (SG.yc + S.cd.yP * MM)) < 26 ? 'grab' : 'default'; }
      return 'default';
    },
  });

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  function brightWord(r) { return Math.abs(r - Math.round(r)) < 0.1 ? '밝음(보강)' : Math.abs(r * 2 - Math.round(r * 2)) < 0.2 && Math.abs(r - Math.floor(r) - 0.5) < 0.1 ? '어두움(상쇄)' : '중간'; }
  function readouts() {
    let a, b, c, L1, L2, L3;
    const m = S.sm;
    if (S.mode === 'wave' && S.wsub === 'ripple') {
      L1 = '파원 간격 d'; a = Math.round(S.rp.dT) + ' cm'; L2 = '파장 λ'; b = lamOf(S.rp.fT).toFixed(1) + ' cm'; L3 = '오른쪽 선의 수'; c = '보강 ' + S.rp.nB + ' · 상쇄 ' + S.rp.nD;
    } else if (S.mode === 'wave') {
      L1 = '시간'; a = S.pl.t.toFixed(1) + ' 초'; L2 = '오른쪽 펄스'; b = S.pl.cfg === 'same' ? '같은 방향' : '반대 방향';
      if (S.pl.draw) { const dots = dotsOf(S.pl.cfg); L3 = '맞춘 점'; c = dots.filter((d) => d.ok).length + ' / ' + SAMPLE_X.length; }
      else { L3 = '가운데(2.0 m) 높이'; c = sumAt(2.0, S.pl.t, S.pl.cfg).toFixed(1) + ' cm'; }
    } else if (S.mode === 'slit') {
      L1 = '파장 λ'; a = S.sl.light === 'white' ? '여러 색' : S.sl.lamT + ' nm'; L2 = 'd · L'; b = S.sl.dT.toFixed(2) + ' mm · ' + S.sl.LT.toFixed(1) + ' m';
      L3 = '밝은 줄 사이 간격'; c = S.sl.slits === 1 ? '무늬 없음' : S.sl.light === 'white' ? '색마다 달라요' : dxMm({ lam: S.sl.lamT, d: S.sl.dT, L: S.sl.LT }).toFixed(1) + ' mm';
    } else if (S.mode === 'cond' && S.cs === 'path') {
      const r = pathRatio(m); L1 = '경로차'; a = Math.abs(r).toFixed(2) + ' λ'; L2 = 'P의 위치'; b = (S.cd.yP >= 0 ? '+' : '−') + Math.abs(S.cd.yP).toFixed(1) + ' mm'; L3 = 'P의 밝기'; c = brightWord(Math.abs(r));
    } else if (S.mode === 'cond' && S.cs === 'table') {
      L1 = '지금 조건'; a = S.sl.lamT + ' nm · ' + S.sl.dT.toFixed(2) + ' mm · ' + S.sl.LT.toFixed(1) + ' m'; L2 = '기록한 횟수'; b = S.cd.rows.length + '번';
      const last = S.cd.rows[S.cd.rows.length - 1]; L3 = '마지막 Δx'; c = last ? last.dx.toFixed(1) + ' mm' : '—';
    } else if (S.mode === 'cond') {
      const dist = Math.abs(S.cd.B - S.cd.A), n = Math.round(dist / dxMm(UNK));
      L1 = 'A–B 거리'; a = dist.toFixed(1) + ' mm'; L2 = '밝은 줄 칸 수'; b = n + '칸'; L3 = '한 칸 (Δx)'; c = n >= 1 ? (dist / n).toFixed(1) + ' mm' : '—';
    } else if (S.tc.sub === 'coat') {
      L1 = '코팅 두께'; a = Math.round(S.tc.thT) + ' nm'; L2 = '반사광 세기'; b = Math.round(coatPct(S.tc.thT)) + ' %'; L3 = '비추는 빛'; c = S.tc.cw === 'green' ? '초록 550 nm' : '흰빛';
    } else if (S.tc.sub === 'soap') {
      const pt = soapT(S.tc.probe, S.tc.soapT); let best = 400, bv = -1; for (let l = 400; l <= 700; l += 5) { const v = soapR(pt, l); if (v > bv) { bv = v; best = l; } }
      L1 = '탐침 위치의 두께'; a = Math.round(pt) + ' nm'; L2 = '막 아래쪽 두께'; b = Math.round(S.tc.soapT) + ' nm'; L3 = '가장 세게 반사되는 파장'; c = pt < 25 ? '없음(검게 보임)' : best + ' nm 근처';
    } else if (S.tc.sub === 'phone') {
      const lf = Math.abs(Math.cos(S.tc.phT * rad / 2));
      L1 = '반대 소리의 위상'; a = Math.round(S.tc.phT) + '°'; L2 = '귀에 남은 소음'; b = Math.round(lf * 100) + ' %'; L3 = '겹침의 종류'; c = lf < 0.03 ? '상쇄' : lf > 0.97 ? '보강' : '부분 상쇄';
    } else {
      L1 = '한쪽 팔의 길이 변화'; a = Math.round(S.tc.armT) + ' nm'; L2 = '왕복 경로차'; b = Math.round(2 * S.tc.armT) + ' nm'; L3 = '검출기 밝기'; c = Math.round(ligoI(S.tc.armT) * 100) + ' %';
    }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const rowsHas = (f) => S.cd.rows.some(f);
  const onlyLam = (r) => r.lam !== BASE.lam && Math.abs(r.d - BASE.d) < 1e-6 && Math.abs(r.L - BASE.L) < 1e-6;
  const onlyD = (r) => r.lam === BASE.lam && Math.abs(r.d - BASE.d) > 1e-6 && Math.abs(r.L - BASE.L) < 1e-6;
  const onlyL = (r) => r.lam === BASE.lam && Math.abs(r.d - BASE.d) < 1e-6 && Math.abs(r.L - BASE.L) > 1e-6;
  function setSlider(id, v) { const mu = Sound.muted; Sound.muted = true; const el = $('#' + id); el.value = v; el.dispatchEvent(new Event('input')); Sound.muted = mu; }
  function resetSlit(slits, light) {
    S.sl.lamT = BASE.lam; S.sl.dT = BASE.d; S.sl.LT = BASE.L; S.sl.slits = slits; S.sl.light = light;
    setSlider('sL', 600); setSlider('sD', 30); setSlider('sS', 20);
    S.sl.lamT = BASE.lam; S.sl.dT = BASE.d; S.sl.LT = BASE.L;
  }
  function resetSlitSeen() { S.sl.seen = { two: false, one: false, white: false }; S.sl.hold = 0; }
  const UNK_SOLVED = { ok: false };

  const levels = [
    {
      title: '파동의 중첩: 두 파동이 만나면?', short: '파동의 중첩', icon: '🌊', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 빛 두 줄기를 겹치면 더 밝아지기만 할까? 어두운 곳이 생길 수도 있을까?</p>' +
        '<div class="si-link">🔗 <b>중학교 「빛과 파동」에서</b> 파동의 진폭·진동수·파장을 배웠어요. 이번에는 파동 두 개가 <b>한곳에서 만나면</b> 어떻게 되는지 알아봐요.</div>' +
        '<p>수면 위의 두 파원이 만드는 물결과, 줄 위에서 마주 보고 오는 두 펄스를 관찰해요. 파동이 한곳에서 겹치는 것을 <b>중첩</b>이라고 해요.</p>',
      features: ['wave'],
      setup() { S.pl.draw = false; S.showCmp = false; S.showLink = false; S.wsub = 'ripple'; S.rp.dT = 8; S.rp.fT = 1.5; setSlider('sD1', 8); setSlider('sF1', 150); restartPulse(); setScene('wave', 'ripple'); },
      recap: '두 파동이 만나면 변위가 더해져요(중첩). 마루와 마루가 만나면 커지고(보강), 마루와 골이 만나면 작아져요(상쇄). 겹친 뒤에도 파동은 그대로 지나가요.',
      summary: '<ul><li><b>중첩</b>: 파동이 한곳에서 만나면 그 곳의 변위는 각 파동이 만드는 변위의 <b>합</b>이에요.</li><li><b>보강 간섭</b>: 마루+마루(또는 골+골) → 변위가 커져요. <b>상쇄 간섭</b>: 마루+골 → 변위가 작아져요.</li><li>두 파원 사이의 간격이 클수록 보강선·상쇄선이 많아져요. (예: 파장 4.0 cm, 간격 8 cm → 보강선 3개 · 상쇄선 4개)</li><li>두 펄스는 겹쳐도 <b>부딪쳐 튕기지 않고</b> 각자 원래 모양으로 계속 나아가요.</li></ul>',
      missions: [
        {
          title: '파원 간격과 선의 수',
          goal: '파원 간격을 바꿔서 <b>상쇄선(잔잔한 선)이 2개</b>인 때와 <b>6개 이상</b>인 때를 모두 만들어 보세요.',
          hint: '간격을 줄이면 선이 적어지고, 늘리면 많아져요. 📐 버튼으로 선을 표시하면 세기 쉬워요. 진동수를 높여 파장을 짧게 해도 선이 많아져요.',
          setup() { S.pl.draw = false; S.rp.seen2 = false; S.rp.seen6 = false; S.rp.hold2 = 0; S.rp.hold6 = 0; setScene('wave', 'ripple'); },
          check: () => S.rp.seen2 && S.rp.seen6,
          hold: 0.3,
          status: () => '상쇄선 지금 <b>' + S.rp.nD + '</b>개 &nbsp; ' + mark(S.rp.seen2) + ' 2개 &nbsp; ' + mark(S.rp.seen6) + ' 6개 이상',
          explain: '파원 사이의 거리가 파장에 비해 클수록 두 파원에서 온 물결의 <b>경로차</b>가 여러 값을 가져서 보강선·상쇄선이 많아져요. 진동수 1.00 Hz(파장 6.0 cm)에서는 간격이 4~8 cm이면 상쇄선이 2개이고, 16 cm이면 6개예요.',
        },
        {
          title: '두 펄스의 합 그리기', manual: true,
          goal: '두 펄스가 겹친 순간이에요. 노란 점 5개를 <b>파란 펄스 + 빨간 펄스</b>의 높이에 맞게 끌어 놓으세요. <b>같은 방향</b>과 <b>반대 방향</b> 모두 해요.',
          hint: '점 아래 세로선에서 파란 점과 빨간 점의 높이(cm)를 눈금으로 읽어 더해요. 반대 방향이면 빨간 점이 아래쪽(−)이라 더하면 작아져요.',
          setup() { S.pl.draw = true; S.pl.solved = { same: false, opp: false }; S.pl.dots = {}; S.pl.drag = null; S.pl.cfg = 'same'; S.pl.playing = false; S.pl.t = PULSE.T0; setScene('wave', 'pulse'); updateCtl(); },
          check() {
            if (S.pl.solved.same && S.pl.solved.opp) return true;
            if (!S.pl.solved.same && !S.pl.solved.opp) return '아직 두 경우 모두 맞추지 못했어요. 노란 점을 모두 맞춰 보세요.';
            return S.pl.solved.same ? '“반대 방향” 경우도 점 5개를 맞춰 보세요.' : '“같은 방향” 경우도 점 5개를 맞춰 보세요.';
          },
          status: () => mark(S.pl.solved.same) + ' 같은 방향 &nbsp; ' + mark(S.pl.solved.opp) + ' 반대 방향 &nbsp; (지금 ' + (S.pl.cfg === 'same' ? '같은 방향' : '반대 방향') + ': ' + dotsOf(S.pl.cfg).filter((d) => d.ok).length + '/5)',
          explain: '겹친 곳의 변위는 <b>각 펄스 변위의 합</b>이에요(중첩 원리). 같은 방향이면 합이 커져서 가운데(2.0 m)의 높이가 약 4.3 cm가 되고, 반대 방향이면 서로 상쇄되어 약 0.6 cm로 작아져요. 만난 뒤에는 각자 원래 모양으로 계속 나아가요.',
        },
        {
          type: 'quiz', title: '상쇄되는 곳의 에너지',
          goal: '수면에서 두 물결이 상쇄되어 잔잔해진 곳이 있어요. 그곳의 파동 에너지는 어떻게 된 걸까요?',
          setup() { S.pl.draw = false; S.pl.playing = true; S.pl.dots = {}; setScene('wave', 'ripple'); updateCtl(); },
          choices: ['두 파동이 부딪쳐 에너지가 사라져요', '그곳은 잔잔하지만 에너지는 사라지지 않고, 크게 출렁이는 곳(보강)으로 더 모여요', '두 파동이 서로 튕겨 나가 되돌아가요', '물이 줄어들어서 파동이 없어져요'],
          answer: 1,
          feedback: ['에너지는 사라지지 않아요. 잔잔한 선 옆에서 크게 출렁이는 선이 있는 걸 보세요.', '', '줄 위 펄스에서 보았듯이 파동은 부딪쳐 튕기지 않고 그대로 지나가요.', '물의 양은 그대로예요. 두 파동의 변위가 더해져서 0에 가까울 뿐이에요.'],
          explain: '상쇄는 두 파동의 <b>변위가 더해져 0이 되는 것</b>이지 에너지가 없어지는 것이 아니에요. 에너지는 보강이 일어나는 곳으로 더 모여서, 전체 에너지는 보존돼요.',
        },
      ],
    },
    {
      title: '이중 슬릿: 빛도 간섭할까?', short: '이중 슬릿', icon: '🔦', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 파동은 만나면 보강과 상쇄를 일으켜 줄무늬를 만든다는 것을 봤어요. 빛이 파동이라면 빛도 줄무늬를 만들 수 있을 거예요.</div>' +
        '<p><b>레이저</b> 빛을 가늘고 가까운 <b>슬릿 두 개</b>에 통과시키고, 스크린에 생기는 모양을 관찰해요. 빛이 알갱이(총알)라면 어떤 모양이 생길지도 비교해 봐요.</p>',
      features: ['slit', 'part'],
      setup() { S.pl.draw = false; S.showCmp = false; resetSlit(2, 'laser'); S.sl.part = false; resetSlitSeen(); setScene('slit'); },
      recap: '이중 슬릿을 지난 빛은 스크린에 밝고 어두운 줄무늬(간섭 무늬)를 만들어요. 입자라면 두 줄만 생겨야 하므로, 이것은 빛이 파동이라는 증거예요.',
      summary: '<ul><li>레이저를 <b>이중 슬릿</b>에 비추면 스크린에 <b>밝고 어두운 줄무늬</b>(간섭 무늬)가 번갈아 생겨요. 슬릿이 1개이면 줄무늬 없이 한 덩어리의 띠만 생겨요.</li><li>빛이 <b>총알(입자)</b>이라면 슬릿 뒤 <b>두 줄</b>만 생겨야 해요. 줄무늬는 <b>빛의 파동성</b>의 증거예요.</li><li>밝은 줄 = 두 슬릿의 빛이 <b>보강</b>, 어두운 줄 = <b>상쇄</b>(마루와 골이 만남).</li><li>흰빛은 가운데만 흰색이고 양옆은 <b>색 띠</b>예요. 파장마다 밝은 줄의 간격이 달라서예요.</li></ul>',
      missions: [
        {
          title: '무늬 관찰하기',
          goal: '레이저로 <b>슬릿 2개</b>, <b>슬릿 1개</b>, 그리고 <b>흰빛(슬릿 2개)</b>의 스크린 모양을 차례로 관찰하세요.',
          hint: '“열린 슬릿” 버튼으로 1개/2개를, “빛의 종류” 버튼으로 레이저/흰빛을 바꿔요. 무늬가 자리를 잡을 때까지 잠깐 기다려요.',
          setup() { S.showCmp = false; resetSlit(2, 'laser'); S.sl.part = false; resetSlitSeen(); setScene('slit'); },
          check: () => S.sl.seen.two && S.sl.seen.one && S.sl.seen.white,
          hold: 0.3,
          status: () => mark(S.sl.seen.two) + ' 슬릿 2개 (줄무늬) &nbsp; ' + mark(S.sl.seen.one) + ' 슬릿 1개 (한 덩어리) &nbsp; ' + mark(S.sl.seen.white) + ' 흰빛 (색 띠)',
          explain: '슬릿 2개이면 밝은 줄과 어두운 줄이 번갈아 나타나고, 슬릿 1개이면 줄무늬가 없어요. 흰빛에는 여러 파장이 섞여 있어서 파장마다 밝은 줄의 위치가 달라 <b>가운데만 흰색이고 양옆은 색 띠</b>가 돼요.',
        },
        {
          title: '입자 모형과 비교하기', manual: true,
          goal: '총알(입자) 모형과 실제 결과를 비교하고, 이 실험이 빛의 어떤 성질을 보여 주는지 <b>네 문장</b>을 골라 완성하세요.',
          hint: '아래 칸에서 슬릿 2개로 총알을 쏘면 어떤 모양이 생기는지 보세요. 실제 레이저 결과는 위쪽 스크린이에요.',
          setup() { resetSlit(2, 'laser'); S.sl.part = true; S.bul.list.length = 0; S.bul.hist.fill(0); S.bul.n = 0; S.showCmp = true; CMP.reset(); setScene('slit'); updateCtl(); },
          check: () => CMP.grade(null, '빨간 칸을 다시 골라 보세요. 총알은 곧게 가므로 슬릿 바로 뒤 두 곳에만 쌓여요.'),
          status: () => '고른 문장 ' + CMP.count() + ' / 4',
          explain: '입자라면 슬릿 뒤에 <b>밝은 줄 2개</b>만 생기지만, 실제로는 <b>밝고 어두운 줄무늬</b>가 생겨요. 어두운 줄에서는 두 슬릿의 빛이 마루와 골로 만나 <b>상쇄</b>되어 서로 지워 줘요. 이런 간섭은 파동만 보여 주므로 빛은 <b>파동성</b>을 가져요.',
        },
      ],
    },
    {
      title: '간섭 조건: 어디가 밝고 어두울까?', short: '간섭 조건', icon: '📏', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 스크린의 밝은 줄은 두 슬릿의 빛이 보강하는 곳, 어두운 줄은 상쇄하는 곳임을 알았어요. 이제 <b>어디서</b> 보강하고 상쇄하는지 수로 알아봐요.</div>' +
        '<p>스크린의 한 점 P까지 두 슬릿에서 가는 거리의 차이가 <b>경로차</b>예요. 경로차가 파장 λ의 몇 배인지에 따라 밝기가 결정돼요. 그리고 밝은 줄 사이 간격 <b>Δx</b>가 무엇에 따라 달라지는지 측정해 봐요.</p>',
      features: ['cond'],
      setup() { resetSlit(2, 'laser'); S.sl.part = false; S.cd.yP = 7; S.cd.rows = []; S.cd.meas = null; S.cd.seenQ = {}; S.showCmp = false; setScene('cond', 'path'); },
      recap: '경로차가 파장의 정수배(mλ)이면 밝고, 반정수배((m+½)λ)이면 어두워요. 밝은 줄 사이 간격은 Δx = λL/d로, 파장과 스크린 거리에 비례하고 슬릿 간격에 반비례해요.',
      summary: '<ul><li>경로차 = 0, λ, 2λ, … (mλ) → 마루와 마루가 만나 <b>보강</b> → <b>밝은 줄</b></li><li>경로차 = λ/2, 3λ/2, … ((m+½)λ) → 마루와 골이 만나 <b>상쇄</b> → <b>어두운 줄</b></li><li>밝은 줄 사이 간격 <b>Δx = λL/d</b> (λ: 파장, L: 스크린 거리, d: 슬릿 간격). 예) 600 nm, 2.0 m, 0.30 mm → <b>4.0 mm</b></li><li>d를 절반으로 → Δx 2배 · L을 2배로 → Δx 2배 · λ를 2배로 → Δx 2배. 파란빛(짧은 파장)은 빨간빛보다 간격이 좁아요.</li><li>Δx를 재면 파장도 구할 수 있어요. 예) d = 0.20 mm, L = 3.0 m, Δx = 9.75 mm → <b>λ = 650 nm</b></li></ul>',
      missions: [
        {
          title: '경로차와 밝기',
          goal: '주황색 점 P를 끌어서 경로차가 <b>0</b>, <b>0.5 λ</b>, <b>1 λ</b>인 곳을 차례로 찾고, 밝은지 어두운지 확인하세요.',
          hint: 'P를 스크린 가운데(0 mm)에서 위나 아래로 조금씩 끌어요. 정수배, 반정수배 근처에서는 점이 자석처럼 붙어요.',
          setup() { resetSlit(2, 'laser'); S.cd.yP = 7; S.cd.seenQ = {}; setScene('cond', 'path'); },
          check: () => S.cd.seenQ[0] && S.cd.seenQ[0.5] && S.cd.seenQ[1],
          hold: 0.3,
          status: () => '경로차 ' + Math.abs(pathRatio(S.sm)).toFixed(2) + ' λ &nbsp; ' + mark(S.cd.seenQ[0]) + ' 0 (밝음) &nbsp; ' + mark(S.cd.seenQ[0.5]) + ' 0.5 λ (어두움) &nbsp; ' + mark(S.cd.seenQ[1]) + ' 1 λ (밝음)',
          explain: '경로차가 <b>0</b>이면 두 빛이 같은 위상으로 만나 가장 밝고(스크린 가운데), <b>0.5 λ</b>이면 마루와 골이 만나 어두우며, <b>1 λ</b>이면 다시 같은 위상이 되어 첫 번째 밝은 줄이에요. 이 값들이 일반적으로 mλ(밝음), (m+½)λ(어두움)이에요.',
        },
        {
          title: '무늬 간격에 영향을 주는 요인',
          goal: '기본 조건(600 nm · 0.30 mm · 2.0 m)을 먼저 측정한 뒤, <b>파장 · 슬릿 간격 · 스크린 거리</b>를 각각 하나씩만 바꾸어 측정하세요.',
          hint: '먼저 기본 조건에서 📏 측정하기를 눌러요. 그 다음 슬라이더 하나만 바꾸고 측정하고, 다시 기본으로 돌려 놓고 다른 하나를 바꿔요.',
          setup() { resetSlit(2, 'laser'); S.cd.rows = []; S.cd.meas = null; setScene('cond', 'table'); },
          check: () => rowsHas(isBase) && rowsHas(onlyLam) && rowsHas(onlyD) && rowsHas(onlyL),
          hold: 0.6,
          status: () => mark(rowsHas(isBase)) + ' 기본 &nbsp; ' + mark(rowsHas(onlyLam)) + ' 파장만 &nbsp; ' + mark(rowsHas(onlyD)) + ' 슬릿 간격만 &nbsp; ' + mark(rowsHas(onlyL)) + ' 스크린 거리만',
          explain: '기본은 <b>4.0 mm</b>예요. 슬릿 간격을 절반(0.15 mm)으로 하면 8.0 mm, 스크린 거리를 절반(1.0 m)으로 하면 2.0 mm, 파장을 450 nm로 하면 3.0 mm가 돼요. 무늬 간격 Δx는 λ와 L에 비례하고 d에 반비례해요(Δx = λL/d).',
        },
        {
          title: '미지의 레이저 파장 구하기', manual: true,
          goal: '표지 A·B를 밝은 줄에 맞춰 무늬 간격 Δx를 재고, 이 레이저의 <b>파장(nm)</b>을 구해 칸에 쓰세요. (d = 0.20 mm, L = 3.0 m)',
          hint: 'Δx = λL/d 이므로 λ = Δx × d ÷ L 이에요. 단위를 mm로 맞추면 결과가 mm로 나와요. 1 mm = 1,000,000 nm예요.',
          setup() { S.cd.A = -5; S.cd.B = 5; $('#inLam').value = ''; $('#inLam').classList.remove('ok', 'bad'); setScene('cond', 'unk'); },
          check() {
            const el = $('#inLam'); const v = parseFloat(el.value);
            const flag = (ok) => { if (!ok && !el.classList.contains('bad')) { el.classList.remove('ok'); void el.offsetWidth; el.classList.add('bad'); } if (ok) { el.classList.remove('bad'); el.classList.add('ok'); } };
            if (!isFinite(v)) return '구한 파장을 nm 단위의 숫자로 써 주세요.';
            if (Math.abs(v - 650) <= 12) { flag(true); return true; }
            flag(false);
            if (v > 0 && v < 5) return '단위를 확인해 보세요. 1 μm = 1000 nm 예요.';
            if (Math.abs(v - 650) <= 80) return '가까워요! 표지를 밝은 줄에 정확히 붙인 뒤 Δx = (거리) ÷ (칸 수)로 다시 계산해 보세요.';
            return '다시 계산해 보세요. λ = Δx × d ÷ L 이고, Δx는 밝은 줄 한 칸의 간격이에요.';
          },
          status: () => 'A–B ' + Math.abs(S.cd.B - S.cd.A).toFixed(1) + ' mm · ' + Math.round(Math.abs(S.cd.B - S.cd.A) / dxMm(UNK)) + '칸',
          explain: '밝은 줄 한 칸의 간격은 <b>Δx = 9.75 mm</b>예요. λ = Δx × d ÷ L = 9.75 mm × 0.20 mm ÷ 3.0 m = 6.5 × 10⁻⁴ mm = <b>650 nm</b> (빨간빛)이에요. 파장이 너무 짧아 직접 잴 수 없어도 간섭 무늬 간격으로 알아낼 수 있어요.',
        },
      ],
    },
    {
      title: '간섭 기술: 빛을 겹쳐 쓰는 방법', short: '간섭 기술', icon: '🛠️', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 간섭이 경로차와 파장으로 결정됨을 알았어요. 이 원리는 생활 곳곳과 첨단 기술에 쓰여요.</div>' +
        '<p><b>무반사 코팅</b>, <b>비눗방울</b>의 색, <b>소음 제거 헤드폰</b>(소리의 간섭), 아주 작은 길이 변화를 재는 <b>간섭계</b>를 살펴보고, 각각 보강인지 상쇄인지 연결해 봐요.</p>',
      features: ['tech'],
      setup() { S.showLink = false; S.tc.thT = 0; S.tc.cw = 'green'; S.tc.seen = { min: false, white: false }; setSlider('sTh', 0); setScene('tech', 'coat'); },
      recap: '간섭은 빛과 소리 모두에서 일어나요. 반사광을 상쇄해 없애거나(무반사 코팅), 소음을 상쇄하거나(헤드폰), 보강되는 색이 두께마다 달라 색 띠가 생기고(비눗방울), 경로차 변화로 길이를 재요(간섭계).',
      summary: '<ul><li><b>무반사 코팅</b>: 막 위·아래에서 반사한 두 빛이 상쇄되도록 막 속 파장의 1/4쯤 되는 두께(초록빛 기준 약 100 nm)로 코팅해요. 가운데 색은 사라지고 양 끝 색이 남아 렌즈가 푸르스름하게 보여요.</li><li><b>비눗방울의 색</b>: 막의 두께에 따라 보강되는 파장이 달라 색 띠가 생겨요.</li><li><b>소음 제거 헤드폰</b>: 마이크로 소음을 듣고 반대 위상(180°)의 소리를 내 상쇄해요.</li><li><b>간섭계</b>: 경로차가 파장의 몇 분의 1만 변해도 무늬의 밝기가 변해서 아주 작은 길이 변화를 재요 (LIGO: 팔 길이 4 km).</li></ul>',
      missions: [
        {
          title: '무반사 코팅 만들기',
          goal: '초록빛(550 nm)의 반사가 <b>2 % 이하</b>가 되도록 코팅 두께를 맞추고, 그 두께에서 <b>흰빛</b>으로 바꿔 반사광의 색을 확인하세요.',
          hint: '두께 슬라이더를 0에서 천천히 키우면서 반사광 세기가 가장 작아지는 곳을 찾아요. 약 100 nm 근처예요. 그 상태에서 흰빛 버튼을 눌러요.',
          setup() { S.tc.cw = 'green'; S.tc.seen = { min: false, white: false }; setScene('tech', 'coat'); updateCtl(); },
          check: () => S.tc.seen.min && S.tc.seen.white,
          hold: 0.4,
          status: () => '반사광 ' + Math.round(coatPct(S.tc.thT)) + ' % &nbsp; ' + mark(S.tc.seen.min) + ' 초록빛 2 % 이하 &nbsp; ' + mark(S.tc.seen.white) + ' 같은 두께에서 흰빛 확인',
          explain: '두께가 약 100 nm(막 속 파장 약 400 nm의 1/4)일 때, 막의 위·아래에서 반사한 두 빛이 <b>반 파장</b>만큼 어긋나 <b>상쇄</b>돼요. 흰빛에서는 초록빛만 가장 잘 사라지고 파란색·보라색과 빨간색이 조금 남아서 반사광이 푸르스름·보랏빛으로 보여요.',
        },
        {
          title: '현상과 간섭의 종류 연결하기', manual: true,
          goal: '네 가지 기술·현상이 보강과 상쇄 중 무엇을 이용하는지 문장을 골라 완성하세요. 위의 버튼으로 각 장면을 직접 살펴봐도 좋아요.',
          hint: '🔍 코팅 → 반사를 줄였죠? 🎧 헤드폰 → 소음이 줄었죠? 🫧 비눗방울은 두께마다 색이 달랐고, 🛰️ 간섭계는 밝기가 변했어요.',
          setup() { S.showLink = true; LINK.reset(); setScene('tech', 'ligo'); updateCtl(); },
          check: () => LINK.grade(null, '빨간 칸을 다시 골라 보세요. 각 장면에서 빛(소리)이 어떻게 겹치는지 떠올려 보세요.'),
          status: () => '고른 문장 ' + LINK.count() + ' / 4',
          explain: '무반사 코팅과 소음 제거 헤드폰은 <b>상쇄 간섭</b>으로 반사광·소음을 없애요. 비눗방울은 두께에 따라 <b>보강되는 색이 달라서</b> 색 띠가 생기고, 간섭계는 경로차가 조금만 변해도 <b>밝기가 변하는 것</b>으로 길이 변화를 재요.',
        },
        {
          type: 'quiz', title: '카메라 렌즈가 푸르게 보이는 까닭',
          goal: '무반사 코팅된 카메라 렌즈를 비스듬히 보면 푸르스름하거나 보랏빛으로 보여요. 그 까닭은?',
          setup() { setScene('tech', 'coat'); },
          choices: ['코팅에 푸른 물감이 들어 있어서', '코팅은 가운데 색(초록)의 반사를 가장 잘 없애고 양 끝(파랑·보라, 빨강)은 덜 없애서 남은 반사광이 푸르스름·보랏빛이어서', '렌즈가 파란빛만 통과시켜서', '코팅이 모든 색의 반사를 똑같이 보강해서'],
          answer: 1,
          feedback: ['코팅의 색은 물감이 아니라 빛의 간섭 때문에 생겨요. 흰빛 모드에서 반사광의 색을 다시 보세요.', '', '렌즈는 거의 모든 색을 통과시켜요. 반사광의 색을 설명하는 문제예요.', '코팅은 반사를 줄이는(상쇄) 장치예요. 보강이 아니에요.'],
          explain: '코팅 두께는 한 파장(초록)에 맞춰져 있어서 그 색의 반사를 가장 잘 없애요. 다른 색은 덜 없어지기 때문에 <b>남은 반사광이 보라·푸른빛</b>으로 보여요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hp-interference', mount: '#game', badge: '간섭 박사', homeHref: '../../index.html#hp',
    featureLabels: { wave: '💧 수면 파문 · 줄 위 펄스', slit: '🔦 레이저 · 이중 슬릿 · 스크린', part: '🔫 총알(입자) 모형', cond: '📏 경로차 · 무늬 간격 측정', tech: '🛠️ 코팅 · 비눗방울 · 헤드폰 · 간섭계' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  setScene('wave', 'ripple');
  updateCtl();
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t; S.dt = dt;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    view.apply();
    stepRipple(dt); stepPulse(dt); stepMeas(dt); stepTech(dt);
    ctx.clearRect(0, 0, VW, VH);
    if (S.mode === 'wave') { if (S.wsub === 'ripple') drawRipple(); else drawPulse(); }
    else if (S.mode === 'slit' || S.mode === 'cond') {
      drawSlitScene(dt);
      // 관찰 기록
      if (S.mode === 'slit' && settled()) {
        const k = S.sl.slits === 1 ? 'one' : S.sl.light === 'white' ? 'white' : 'two';
        S.sl.hold = S.sl._k === k ? S.sl.hold + dt : 0; S.sl._k = k;
        if (S.sl.hold > 0.8) S.sl.seen[k] = true;
      }
      if (S.mode === 'cond' && S.cs === 'path' && settled()) {
        const r = Math.abs(pathRatio(S.sm));
        [0, 0.5, 1].forEach((q) => { if (Math.abs(r - q) < 0.03) S.cd.seenQ[q] = true; });
      }
    } else drawTech();
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, SG, MM, PULSE, SAMPLE_X, PX0, PXM, PY0, PCM, UNK, BASE, slitXs, dxMm, setScene, measure, rippleLines, lamOf, sumAt, dotsOf, coatR, soapGeo, CMP, LINK, pathRatio, settled,
    get game() { return game; },
  };

})();
