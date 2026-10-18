/* =========================================================
   물리학 Ⅲ. 빛과 물질 - 빛의 입자성 (단원 3차시)
   성취기준 [12물리03-03] 빛과 물질의 이중성이 전자 현미경과 영상 정보 저장 등 다양한 분야에 활용됨을 설명할 수 있다. (빛의 입자성 · 이미지 센서)
   ① 실험: 광전 효과 (파장·세기 → 광전류, 정지 전압)
   ② 분석: 진동수와 세기 (세기–광전류, 진동수–최대 운동 에너지 그래프, 한계 진동수)
   ③ 모형: 광자 모형 (hf = W + E_k)
   ④ 적용: 이미지 센서와 영상 저장 (8×8 화소, 광자 수 → 전자 수 → 0~255 → 2진수)
   콤프턴 산란 · 광전 효과 곡선 유도 · 흑체 복사는 다루지 않아요. 물질의 파동성은 다음 차시(물질파)에서 다뤄요.
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
  const EVNM = 1240;                  // 광자 에너지(eV) = 1240 ÷ 파장(nm)
  const HJ = 6.63e-34, QE = 1.6e-19;  // 플랑크 상수 h (J·s), 1 eV = 1.6 × 10⁻¹⁹ J
  const MET = { Na: { name: '나트륨', W: 2.3, col: '#d9c27a' }, Zn: { name: '아연', W: 4.3, col: '#9fb0c4' } };   // 일함수 W (eV)
  const I_UNIT = 1.0;                 // 세기 1당 광전류 (μA): 광전류 = 세기 × 1.0 μA
  const LAM_MIN = 200, LAM_MAX = 700;
  const FULL_WELL = 1000;             // 화소 하나가 모을 수 있는 전자 수 (이 수에서 밝기 값 255)
  const RATE = { bright: 80, dark: 20 };   // 가장 밝은 화소에 도착하는 광자 수 (개/ms)
  const EXPO = [1, 2, 4, 8, 16, 32, 64];   // 노출 시간 (ms)
  const NPX = 8;                      // 센서는 8 × 8 화소
  const eph = (lam) => EVNM / lam;
  const emitsAt = (lam, m) => eph(lam) - MET[m].W > 1e-9;
  const ekAt = (lam, m) => Math.max(0, eph(lam) - MET[m].W);
  const freqOf = (lam) => eph(lam) * QE / HJ;          // 진동수 (Hz)
  const f0Of = (m) => MET[m].W * QE / HJ;              // 한계 진동수 (Hz)
  const lam0Of = (m) => EVNM / MET[m].W;               // 한계 파장 (nm)
  const f14 = (f) => (f / 1e14);
  const fmtF = (f) => (f / 1e14).toFixed(1) + '×10¹⁴ Hz';
  const SCENE = [   // 장면의 밝기 (0~1): 달이 뜬 밤하늘 아래 언덕
    '0.12 0.12 0.15 0.18 0.15 0.12 0.12 0.30',
    '0.12 0.30 0.62 0.70 0.62 0.15 0.12 0.12',
    '0.15 0.62 1.00 1.00 1.00 0.62 0.12 0.12',
    '0.15 0.70 1.00 1.00 1.00 0.70 0.15 0.12',
    '0.12 0.62 1.00 1.00 1.00 0.62 0.12 0.18',
    '0.12 0.15 0.62 0.70 0.62 0.15 0.12 0.12',
    '0.30 0.30 0.30 0.35 0.30 0.30 0.35 0.30',
    '0.30 0.35 0.30 0.30 0.35 0.30 0.30 0.30',
  ].map((r) => r.split(' ').map(Number));

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'exp', t: 0, fade: 0, dt: 0.016, lam: 400, s: 5, metal: 'Na', showCmp: false, showEk: false, showLam3: false,
    ex: { el: [], acc: 0, I: 0, V: 0, arr: 0, dotPh: 0, hold: 0, key: '', seen: { R: false, G: false, V: false } },
    gr: { A: { lam: null, metal: null, pts: [] }, B: { Na: [], Zn: [] }, mark: { Na: 8.0, Zn: 8.0 }, mdrag: false, found: { Na: false, Zn: false }, hold: { Na: 0, Zn: 0 } },
    md: { el: [], ph: [], acc: 0, hist: [], seen530: false, stat: { emitted: 0, absorbed: 0 } },
    se: { exp: 3, scene: 'bright', prog: 1, bayer: false, sel: null, seed: 7, counts: null, vals: null, retake: 0, ok: { bright: false, dark: false }, hold: 0, hist: [] },
  };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const MODE_LABEL = { exp: '💡 광전 효과', graph: '📈 진동수·세기', model: '🔬 광자 모형', sensor: '📷 이미지 센서' };

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
      if (on && dm) on = dm === 'cmp' ? S.showCmp : dm === 'ek' ? S.showEk : S.showLam3;
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    mtSeg.set(S.metal); seSeg.set(S.se.scene);
    $$('#coSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.v === S.lam));
    $('#bBayer').style.outline = S.se.bayer ? '3px solid var(--subject)' : '';
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));

  /* ---------- 컨트롤 연결 ---------- */
  const slLam = bindSlider('sLam', (v) => v + ' nm', (v) => { S.lam = +v; updateCtl(); });
  const slInt = bindSlider('sInt', (v) => String(v), (v) => { S.s = +v; });
  const slEx = bindSlider('sEx', (v) => EXPO[+v] + ' ms', (v) => { S.se.exp = +v; retake(); });
  const mtSeg = bindSeg('mtSeg', (v) => { S.metal = v; updateCtl(); });
  const seSeg = bindSeg('seSeg', (v) => { S.se.scene = v; retake(); updateCtl(); });
  const coSeg = $$('#coSeg button');
  coSeg.forEach((b) => b.addEventListener('click', () => { Sound.click(); S.lam = +b.dataset.v; slLam.set(S.lam); updateCtl(); }));
  function setLam(v) { S.lam = v; slLam.set(v); updateCtl(); }
  function setInt(v) { S.s = v; slInt.set(v); }
  $('#bBayer').addEventListener('click', () => { Sound.click(); S.se.bayer = !S.se.bayer; updateCtl(); });
  $('#bShot').addEventListener('click', () => { Sound.click(); S.se.seed = (S.se.seed * 7 + 13) % 100003; retake(true); });
  $('#bPtA').addEventListener('click', () => addPointA());
  $('#bPtB').addEventListener('click', () => addPointB());
  $('#bPtClr').addEventListener('click', () => { Sound.click(); S.gr.A = { lam: null, metal: null, pts: [] }; S.gr.B = { Na: [], Zn: [] }; });

  /* ---------- 선택 문장 (미션용) ---------- */
  const CMP = mkSelRows('cmpRows', [
    { q: '파동 모형의 예측: 빨간빛도 세기를 충분히 키우면 전자가', opts: ['튀어나올 거예요', '튀어나오지 않을 거예요'], ans: 0 },
    { q: '실험 결과: 가장 센 빨간빛(650 nm)에서는', opts: ['전자가 튀어나와요', '전자가 튀어나오지 않아요'], ans: 1 },
    { q: '실험 결과: 가장 센 초록빛(510 nm)에서는', opts: ['전자가 튀어나와요', '전자가 튀어나오지 않아요'], ans: 0 },
    { q: '실험 결과: 가장 센 보라빛(400 nm)에서는', opts: ['전자가 튀어나와요', '전자가 튀어나오지 않아요'], ans: 0 },
    { q: '예측과 실험 결과를 비교하면 파동 모형은', opts: ['실험 결과를 설명해요', '빛의 색(진동수)에 따른 차이를 설명하지 못해요'], ans: 1 },
  ]);

  /* ================= ① 광전 효과 실험 장치 ================= */
  const EX = PHONE
    ? { tube: { x: 30, y: 196, w: 420, h: 150 }, em: { x: 84, w: 16, y: 232, h: 80 }, co: { x: 396, w: 14, y: 232, h: 80 }, lamp: { x: 372, y: 78 }, am: { x: 124, y: 536, r: 54 }, vm: { x: 356, y: 536, r: 54 }, card: { x: 12, y: 372, w: 456, h: 100 } }
    : { tube: { x: 250, y: 150, w: 340, h: 185 }, em: { x: 296, w: 16, y: 190, h: 100 }, co: { x: 548, w: 14, y: 190, h: 100 }, lamp: { x: 560, y: 46 }, am: { x: 260, y: 466, r: 58 }, vm: { x: 560, y: 466, r: 58 }, card: { x: 16, y: 14, w: 318, h: 118 } };
  const faceX = EX.em.x + EX.em.w, tgt = { x: faceX, y: EX.em.y + EX.em.h * 0.36 };
  const WIRE = PHONE
    ? [[EX.co.x + 7, EX.em.y + EX.em.h], [EX.co.x + 7, 440], [250, 440], [250, 536], [EX.am.x + EX.am.r + 4, 536], [EX.am.x - EX.am.r - 4, 536], [60, 536], [60, 440], [EX.em.x + 8, 440], [EX.em.x + 8, EX.em.y + EX.em.h]]
    : [[EX.co.x + 7, EX.em.y + EX.em.h], [EX.co.x + 7, 404], [380, 404], [380, 466], [EX.am.x + EX.am.r + 4, 466], [EX.am.x - EX.am.r - 4, 466], [150, 466], [150, 404], [EX.em.x + 8, 404], [EX.em.x + 8, EX.em.y + EX.em.h]];
  const WIRE2 = PHONE
    ? [[[EX.vm.x - EX.vm.r - 4, 536], [250, 536]], [[EX.vm.x + EX.vm.r + 4, 536], [444, 536], [444, 440], [EX.co.x + 7, 440]]]
    : [[[EX.vm.x - EX.vm.r - 4, 466], [380, 466]], [[EX.vm.x + EX.vm.r + 4, 466], [660, 466], [660, 404], [EX.co.x + 7, 404]]];
  const lamPx = () => S.lam / 9;      // 그림에서 파장 1 nm당 화면 길이 (파동이 길수록 파장이 긴 빛)

  function stepExp(dt) {
    const e = S.ex, m = S.metal;
    const em = emitsAt(S.lam, m), ek = ekAt(S.lam, m);
    e.I = SciSim.approach(e.I, em ? S.s * I_UNIT : 0, dt, 9); if (Math.abs(e.I - (em ? S.s * I_UNIT : 0)) < 0.02) e.I = em ? S.s * I_UNIT : 0;
    e.V = SciSim.approach(e.V, ek, dt, 9); if (Math.abs(e.V - ek) < 0.005) e.V = ek;
    e.dotPh = (e.dotPh + dt * (0.15 + 0.12 * e.I)) % 1;
    if (S.mode === 'exp') {
      if (em && !RM) e.acc += dt * 1.3 * S.s;
      while (em && e.acc >= 1) {
        e.acc -= 1;
        const sp = 70 + 170 * Math.sqrt(ek), ang = rnd(-0.17, 0.17);
        e.el.push({ x: faceX + 5, y: tgt.y + rnd(-14, 14), vx: sp, vy: sp * ang });
      }
      if (!em) e.acc = 0;
      // 관찰 기록 (세기 최대에서 세 가지 색)
      const k = S.s === 10 ? (S.lam >= 620 ? 'R' : (S.lam >= 500 && S.lam <= 530) ? 'G' : (S.lam >= 380 && S.lam <= 430) ? 'V' : '') : '';
      e.hold = k && k === e.key ? e.hold + dt : 0; e.key = k;
      if (k && e.hold > 0.9) e.seen[k] = true;
    }
    for (let i = e.el.length - 1; i >= 0; i--) {
      const u = e.el[i]; u.x += u.vx * dt; u.y += u.vy * dt;
      if (u.x >= EX.co.x) { e.el.splice(i, 1); e.arr++; if (!RM && Math.random() < 0.4) parts.emit({ x: EX.co.x + 4, y: u.y, vx: 40, vy: rnd(-20, 20), life: 0.3, size: 2.5, color: '#7bdcff' }); }
      else if (u.y < EX.tube.y + 10 || u.y > EX.tube.y + EX.tube.h - 10) e.el.splice(i, 1);
    }
  }
  function waveBeam() {
    const lx = EX.lamp.x, ly = EX.lamp.y, dx = tgt.x - lx, dy = tgt.y - ly, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
    const col = wlColor(S.lam), amp = 1.5 + 0.95 * S.s, lp = lamPx();
    ctx.save();
    ctx.beginPath(); ctx.rect(faceX, 4, VW - faceX - 4, VH - 8); ctx.clip();           // 빛은 금속판의 오른쪽 면에서 멈춰요
    const g = ctx.createLinearGradient(lx, ly, tgt.x, tgt.y); g.addColorStop(0, C.rgba(col, 0.1)); g.addColorStop(1, C.rgba(col, 0.28));
    ctx.fillStyle = g; ctx.beginPath(); const bw = 22;
    ctx.moveTo(lx + nx * bw, ly + ny * bw); ctx.lineTo(tgt.x + nx * bw, tgt.y + ny * bw); ctx.lineTo(tgt.x - nx * bw, tgt.y - ny * bw); ctx.lineTo(lx - nx * bw, ly - ny * bw); ctx.closePath(); ctx.fill();
    for (let k = -1; k <= 1; k++) {
      ctx.strokeStyle = C.rgba(col, 0.95); ctx.lineWidth = 2.4; ctx.beginPath();
      for (let u = 26; u <= len + 40; u += 3) {
        const off = k * 11 + amp * Math.sin(TAU * (u - 130 * S.t) / lp);
        const px = lx + ux * u + nx * off, py = ly + uy * u + ny * off;
        if (u === 26) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    ctx.restore();
    return { ux, uy };
  }
  function drawExp() {
    const e = S.ex, m = S.metal, mt = MET[m], T0 = EX.tube;
    const em = emitsAt(S.lam, m), col = wlColor(S.lam);
    // 어두운 실험대
    D.shadow(() => { D.roundRect(8, 8, VW - 16, VH - 16, 16); ctx.fillStyle = '#0f1a33'; ctx.fill(); }, { blur: 10, y: 3 });
    // 전선
    ctx.strokeStyle = '#6a7488'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath(); WIRE.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
    WIRE2.forEach((w) => { ctx.beginPath(); w.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke(); });
    // 진공관
    D.roundRect(T0.x, T0.y, T0.w, T0.h, 36); ctx.fillStyle = 'rgba(160,200,255,.10)'; ctx.fill(); ctx.strokeStyle = 'rgba(190,220,255,.75)'; ctx.lineWidth = 3; ctx.stroke();
    T(T0.x + T0.w / 2, T0.y + T0.h - 10, '진공관 (공기를 뺀 유리관)', 13, 'rgba(210,225,250,.85)', 'center', 700);
    // 빛이 들어오는 창
    const tw = (T0.y - EX.lamp.y) / (tgt.y - EX.lamp.y), wx = EX.lamp.x + tw * (tgt.x - EX.lamp.x);
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(wx - 20, T0.y - 3, 40, 6);
    // 램프
    D.glow(EX.lamp.x, EX.lamp.y, 60, col, 0.5);
    ctx.save(); ctx.translate(EX.lamp.x, EX.lamp.y); ctx.rotate(Math.atan2(tgt.y - EX.lamp.y, tgt.x - EX.lamp.x));
    D.roundRect(-34, -17, 42, 34, 8); ctx.fillStyle = '#4b5878'; ctx.fill(); ctx.fillStyle = col; ctx.fillRect(8, -12, 6, 24);
    ctx.restore();
    T(EX.lamp.x + (PHONE ? -2 : 10), EX.lamp.y - 26, S.lam < 380 ? '자외선 램프 ' + S.lam + ' nm' : '램프 ' + S.lam + ' nm', 13, '#cfd8ee', PHONE ? 'center' : 'left', 800);
    waveBeam();
    // 금속판 (빛 받는 면), 집전판
    D.shadow(() => { ctx.fillStyle = mt.col; D.roundRect(EX.em.x, EX.em.y, EX.em.w, EX.em.h, 3); ctx.fill(); }, { blur: 6, y: 2, color: 'rgba(0,0,0,.5)' });
    ctx.fillStyle = '#9aa6bb'; D.roundRect(EX.co.x, EX.co.y, EX.co.w, EX.co.h, 3); ctx.fill();
    T(EX.em.x + EX.em.w / 2, EX.em.y - 10, mt.name + '판', 13, '#ffe28a', 'center', 800);
    T(EX.co.x + EX.co.w / 2, EX.co.y - 10, '집전판', 13, '#cfd8ee', 'center', 800);
    if (em) D.glow(tgt.x, tgt.y, 30, '#7bdcff', 0.35);
    // 전자
    e.el.forEach((u) => { D.sphere(u.x, u.y, 4, '#4aa8ff', { gloss: false }); });
    // 전선 속 전류(전자) 흐름
    if (e.I > 0.05) {
      let tot = 0; const seg = []; for (let i = 1; i < WIRE.length; i++) { const l = Math.hypot(WIRE[i][0] - WIRE[i - 1][0], WIRE[i][1] - WIRE[i - 1][1]); seg.push(l); tot += l; }
      const n = Math.max(3, Math.round(4 + e.I * 1.2));
      for (let k = 0; k < n; k++) {
        let q = ((e.dotPh + k / n) % 1) * tot, i = 0; while (i < seg.length - 1 && q > seg[i]) { q -= seg[i]; i++; }
        const f = q / seg[i]; D.sphere(WIRE[i][0] + (WIRE[i + 1][0] - WIRE[i][0]) * f, WIRE[i][1] + (WIRE[i + 1][1] - WIRE[i][1]) * f, 3.4, '#4aa8ff', { gloss: false });
      }
    }
    // 계기: 광전류계, 전압계
    D.dial(EX.am.x, EX.am.y, EX.am.r, e.I, 0, 10, { label: 'μA', color: '#e2464b', ticks: 5 });
    T(EX.am.x, EX.am.y + EX.am.r + 20, '광전류  ' + e.I.toFixed(1) + ' μA', 13.5, '#cfd8ee', 'center', 800);
    D.dial(EX.vm.x, EX.vm.y, EX.vm.r, e.V, 0, 4, { label: 'V', color: '#14a058', ticks: 4 });
    T(EX.vm.x, EX.vm.y + EX.vm.r + 20, '정지 전압  ' + e.V.toFixed(2) + ' V', 13.5, '#cfd8ee', 'center', 800);
    // 비교 카드
    const cd = EX.card;
    panel(cd.x, cd.y, cd.w, cd.h, 12, 'rgba(255,255,255,.96)');
    const fs = PHONE ? 12.5 : 13.5;
    T(cd.x + 12, cd.y + 22, '🌊 파동 모형의 예측', fs, '#3a63bf', 'left', 800);
    textBlock(cd.x + 12, cd.y + 42, cd.w - 24, '빛이 세질수록 전자가 받는 에너지가 커져서, 센 빛이면 어떤 색이든 언젠가 전자가 튀어나올 거예요.', fs - 0.5, '#26324a', 17, 700);
    const res = em ? '전자가 튀어나와요' : '전자가 튀어나오지 않아요';
    T(cd.x + 12, cd.y + cd.h - 12, '🔬 실험 결과: ' + S.lam + ' nm · 세기 ' + S.s + ' → ' + res, fs, em ? '#14a058' : '#e2464b', 'left', 800);
  }

  /* ================= ② 세기·진동수 그래프 ================= */
  const GA = PHONE ? { x: 62, y: 46, w: 378, h: 190 } : { x: 66, y: 62, w: 292, h: 262 };
  const GB = PHONE ? { x: 62, y: 322, w: 378, h: 190 } : { x: 452, y: 62, w: 316, h: 262 };
  const GBX = [3, 16], GBY = [0, 4.5];
  const axA = () => axes(GA.x, GA.y, GA.w, GA.h, { xmin: 0, xmax: 10, ymin: 0, ymax: 10, xt: [0, 2, 4, 6, 8, 10].map((v) => [v, String(v)]), yt: [0, 2, 4, 6, 8, 10].map((v) => [v, String(v)]), xl: '빛의 세기', yl: '광전류 (μA)', fs: 13, ylx: 40 });
  const axB = () => axes(GB.x, GB.y, GB.w, GB.h, { xmin: GBX[0], xmax: GBX[1], ymin: GBY[0], ymax: GBY[1], xt: [4, 6, 8, 10, 12, 14, 16].map((v) => [v, String(v)]), yt: [0, 1, 2, 3, 4].map((v) => [v, String(v)]), xl: '진동수 (×10¹⁴ Hz)', yl: '최대 운동 에너지 (eV)', fs: 13, ylx: 40 });
  function addPointA() {
    if (S.mode !== 'graph') return;
    const m = S.metal, lam = S.lam, A = S.gr.A;
    if (!emitsAt(lam, m)) { SciSim.toast('이 빛에서는 전자가 나오지 않아요. 파장을 줄여 보세요.', 'bad'); Sound.fail(); return; }
    if (A.lam !== null && (A.lam !== lam || A.metal !== m)) { A.pts = []; SciSim.toast('파장이나 금속이 바뀌어서 점을 새로 찍어요.'); }
    A.lam = lam; A.metal = m;
    const pt = { s: S.s, I: S.s * I_UNIT, t: S.t, landed: false }, i = A.pts.findIndex((p) => p.s === S.s);
    if (i >= 0) A.pts[i] = pt; else A.pts.push(pt);
    Sound.click();
  }
  function addPointB() {
    if (S.mode !== 'graph') return;
    const arr = S.gr.B[S.metal], lam = S.lam;
    const pt = { lam, f: f14(freqOf(lam)), ek: ekAt(lam, S.metal), t: S.t, landed: false }, i = arr.findIndex((p) => p.lam === lam);
    if (i >= 0) arr[i] = pt; else arr.push(pt);
    Sound.click();
  }
  const dropY = (p, fy, top) => { const k = Math.min(1, Math.max(0, (S.t - p.t) / 0.55)); return top + (fy - top) * SciSim.ease.outBounce(k); };
  function landFx(p, x, y) { if (!p.landed && S.t - p.t > 0.5) { p.landed = true; parts.burst(x, y, { count: 7, speed: 70, size: 2.6, colors: ['#ffd447', '#ff7a45'], gravity: 60, life: 0.5 }); } }
  function stepGraph(dt) {
    ['Na', 'Zn'].forEach((m) => {
      const near = S.mode === 'graph' && S.metal === m && Math.abs(S.gr.mark[m] - f14(f0Of(m))) <= 0.3 && bracket(m);
      S.gr.hold[m] = near ? S.gr.hold[m] + dt : 0;
      if (S.gr.hold[m] > 0.5 && !S.gr.found[m]) { S.gr.found[m] = true; S.gr.mark[m] = Math.round(f14(f0Of(m)) * 1000) / 1000; Sound.success(); }
    });
  }
  function drawGraph() {
    const g = S.gr, mt = MET[S.metal];
    panel(8, 8, VW - 16, VH - 16, 16, '#ffffff');
    const col = { Na: '#e8903a', Zn: '#3b78d8' };
    // 그래프 A
    T(GA.x + GA.w / 2, GA.y - 22, PHONE ? '① 세기 → 광전류' : '① 빛의 세기 → 광전류 (파장은 고정)', PHONE ? 13 : 14.5, '#26324a', 'center', 800);
    const A = axA();
    if (g.A.pts.length >= 2) { ctx.strokeStyle = 'rgba(232,144,58,.55)'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(A.X(0), A.Y(0)); ctx.lineTo(A.X(10), A.Y(10 * I_UNIT)); ctx.stroke(); ctx.setLineDash([]); }
    g.A.pts.forEach((p) => { const x = A.X(p.s), y = dropY(p, A.Y(p.I), GA.y - 24); D.sphere(x, y, 7, '#e8903a', { shadow: true }); landFx(p, x, y); });
    // 지금 세기 표시
    ctx.fillStyle = '#ffb400'; ctx.beginPath(); ctx.moveTo(A.X(S.s), A.y + A.h - 1); ctx.lineTo(A.X(S.s) - 6, A.y + A.h + 9); ctx.lineTo(A.X(S.s) + 6, A.y + A.h + 9); ctx.closePath(); ctx.fill();
    if (g.A.lam !== null) T(GA.x + 8, GA.y + 20, MET[g.A.metal].name + ' · ' + g.A.lam + ' nm', 12.5, '#b57a00', 'left', 800);
    // 그래프 B
    T(GB.x + GB.w / 2, GB.y - 22, PHONE ? '② 진동수 → 최대 운동 에너지' : '② 진동수 → 전자의 최대 운동 에너지', PHONE ? 13 : 14.5, '#26324a', 'center', 800);
    const B = axB();
    ['Na', 'Zn'].forEach((m) => {
      const arr = g.B[m].slice().sort((a, b) => a.f - b.f);
      if (arr.length >= 2) { ctx.strokeStyle = C.rgba(col[m], 0.55); ctx.lineWidth = 2; ctx.beginPath(); arr.forEach((p, i) => (i ? ctx.lineTo(B.X(p.f), B.Y(p.ek)) : ctx.moveTo(B.X(p.f), B.Y(p.ek)))); ctx.stroke(); }
      arr.forEach((p) => { const x = B.X(p.f), y = dropY(p, B.Y(p.ek), GB.y - 24); D.sphere(x, y, 7, col[m], { shadow: true }); landFx(p, x, y); });
    });
    const fnow = f14(freqOf(S.lam));
    ctx.fillStyle = '#ffb400'; ctx.beginPath(); ctx.moveTo(B.X(fnow), B.y + B.h - 1); ctx.lineTo(B.X(fnow) - 6, B.y + B.h + 9); ctx.lineTo(B.X(fnow) + 6, B.y + B.h + 9); ctx.closePath(); ctx.fill();
    // 한계 진동수 표지
    const mk = g.mark[S.metal], mx = B.X(mk), f0n = f14(f0Of(S.metal)), ok = g.found[S.metal] && Math.abs(mk - f0n) <= 0.3;
    ctx.strokeStyle = ok ? '#14a058' : '#ff7a45'; ctx.lineWidth = 2.6; ctx.setLineDash([7, 5]); ctx.beginPath(); ctx.moveTo(mx, B.y); ctx.lineTo(mx, B.y + B.h); ctx.stroke(); ctx.setLineDash([]);
    D.sphere(mx, B.y + 2, 9, ok ? '#14a058' : '#ff7a45', { shadow: true });
    D.label(clamp(mx, B.x + 60, B.x + B.w - 60), B.y + 28, (ok ? '한계 진동수 f₀ = ' + f0n.toFixed(1) : '표지 ' + mk.toFixed(1)) + '×10¹⁴ Hz', { bg: ok ? '#14a058' : '#ff7a45', size: 12.5 });
    if (ok) D.check(mx, B.y + B.h - 18, 11, 1);
    // 아래 설명
    const by = PHONE ? 548 : GA.y + GA.h + 70, bh = VH - by - 16;
    ctx.fillStyle = '#f5f8fd'; D.roundRect(20, by, VW - 40, bh, 12); ctx.fill();
    const fs = PHONE ? 12.5 : 14;
    const em = emitsAt(S.lam, S.metal), ek = ekAt(S.lam, S.metal);
    const h1 = textBlock(32, by + 24, VW - 64, mt.name + ' · ' + S.lam + ' nm(' + fmtF(freqOf(S.lam)) + ') · 세기 ' + S.s + ' → ' + (em ? '광전류 ' + (S.s * I_UNIT).toFixed(1) + ' μA, 최대 운동 에너지 ' + ek.toFixed(2) + ' eV' : '전자가 나오지 않아요 (광전류 0)'), fs, em ? '#26324a' : '#e2464b', 19, 800);
    textBlock(32, by + 24 + h1 + 8, VW - 64, '왼쪽: 세기를 바꾸며 점을 찍으면 원점을 지나는 직선이에요. 오른쪽: 진동수를 바꾸며 점을 찍으면 한계 진동수 위에서만 올라가는 직선이에요.' + (PHONE ? '' : ' 금속을 바꾸면 한계 진동수의 위치가 달라져요.'), PHONE ? 12 : 13.5, '#5d6879', 19, 700);
  }

  /* ================= ③ 광자 모형 ================= */
  const MS = PHONE ? { x: 8, y: 8, w: 464, h: 330 } : { x: 12, y: 12, w: 512, h: 536 };
  const MC = PHONE ? { x: 8, y: 346, w: 464, h: 286 } : { x: 536, y: 12, w: 252, h: 536 };
  const SLAB = { y: MS.y + MS.h - (PHONE ? 70 : 130), h: PHONE ? 44 : 56 };
  const LSRC = PHONE ? { x: MS.x + 44, y: MS.y + 50 } : { x: MS.x + 56, y: MS.y + 70 };
  const SLOTS = [0.2, 0.4, 0.6, 0.8].map((k) => MS.x + MS.w * k);
  const EY = SLAB.y - 10;                         // 슬롯의 전자 중심 y
  function mdInit() {
    const m = S.md; m.el = SLOTS.map((x) => ({ x, present: true, back: 0, shake: 0, fade: 1 })); m.ph = []; m.fly = []; m.pop = []; m.acc = 0; m.rate = 0; m.hist = []; m.stat = { emitted: 0, absorbed: 0 };
  }
  mdInit();
  function stepModel(dt) {
    const m = S.md;
    const em = emitsAt(S.lam, S.metal), ek = ekAt(S.lam, S.metal), E = eph(S.lam);
    m.el.forEach((e) => { if (!e.present) { e.back -= dt; if (e.back <= 0) { e.present = true; e.fade = 0; } } else e.fade = Math.min(1, e.fade + dt * 3); e.shake = Math.max(0, e.shake - dt); });
    if (S.mode === 'model') {
      const alive = m.el.filter((e) => e.present);
      if (alive.length && !RM) m.acc += dt * (1.2 + S.s * 1.0);
      while (m.acc >= 1 && alive.length) {
        m.acc -= 1;
        const e = alive[Math.floor(Math.random() * alive.length)], i = m.el.indexOf(e);
        const dx = e.x - LSRC.x, dy = EY - 6 - LSRC.y, d = Math.hypot(dx, dy), sp = 330;
        m.ph.push({ x: LSRC.x, y: LSRC.y, vx: dx / d * sp, vy: dy / d * sp, slot: i, bounce: false, life: 0 });
      }
      if (!alive.length) m.acc = 0;
    }
    for (let i = m.ph.length - 1; i >= 0; i--) {
      const p = m.ph[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.life += dt;
      if (p.bounce) { p.vx *= Math.exp(-2 * dt); p.vy += 420 * dt; if (p.life > 1.2 || p.y > MS.y + MS.h) m.ph.splice(i, 1); continue; }
      const e = m.el[p.slot];
      if (Math.hypot(p.x - e.x, p.y - (EY - 6)) < 10) {
        if (!e.present) { m.ph.splice(i, 1); continue; }
        if (em) {
          e.present = false; e.back = 1.3;
          const a = rnd(-1.25, -0.85), sp = 70 + 150 * Math.sqrt(ek);
          m.fly.push({ x: e.x, y: EY, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, ek, life: 0 });
          m.stat.emitted++; m.hist.push(S.t);
          parts.burst(e.x, EY, { count: 8, speed: 110, size: 3, colors: ['#ffd447', '#7bdcff', '#ffffff'], gravity: 0, life: 0.45 });
          if (S.md.popT == null || S.t - S.md.popT > 0.9) { m.pop.push({ x: e.x, y: EY - 24, t: S.t, txt: 'E_k = ' + ek.toFixed(2) + ' eV', col: '#14a058' }); m.popT = S.t; }
          if (S.lam >= 530 && S.metal === 'Na') S.md.seen530 = true;
          m.ph.splice(i, 1);
        } else {
          e.shake = 0.35; m.stat.absorbed++;
          p.bounce = true; p.life = 0; p.vx = -p.vx * 0.5 + rnd(-30, 30); p.vy = -Math.abs(p.vy) * 0.5;
          parts.burst(p.x, p.y, { count: 5, speed: 60, size: 2.4, colors: ['#ff8a8a', '#ffb4a2'], gravity: 40, life: 0.4 });
          if (m.popT == null || S.t - m.popT > 0.9) { m.pop.push({ x: e.x, y: EY - 26, t: S.t, txt: '에너지 부족', col: '#e2464b' }); m.popT = S.t; }
        }
      }
    }
    for (let i = m.fly.length - 1; i >= 0; i--) { const f = m.fly[i]; f.x += f.vx * dt; f.y += f.vy * dt; f.life += dt; if (f.y < MS.y + 6 || f.x > MS.x + MS.w || f.x < MS.x) m.fly.splice(i, 1); }
    for (let i = m.pop.length - 1; i >= 0; i--) if (S.t - m.pop[i].t > 1.2) m.pop.splice(i, 1);
    while (m.hist.length && S.t - m.hist[0] > 2) m.hist.shift();
    m.rate = m.hist.length / 2;
  }
  function drawModel() {
    const m = S.md, mt = MET[S.metal], E = eph(S.lam), W = mt.W, em = E - W > 1e-9, ek = Math.max(0, E - W);
    const col = wlColor(S.lam);
    // 왼쪽: 광자와 전자
    D.shadow(() => { D.roundRect(MS.x, MS.y, MS.w, MS.h, 14); ctx.fillStyle = '#0f1a33'; ctx.fill(); }, { blur: 10, y: 3 });
    ctx.save(); D.roundRect(MS.x, MS.y, MS.w, MS.h, 14); ctx.clip();
    // 금속판
    const sg = ctx.createLinearGradient(0, SLAB.y, 0, SLAB.y + SLAB.h); sg.addColorStop(0, C.shade(mt.col, 0.25)); sg.addColorStop(1, C.shade(mt.col, -0.25));
    ctx.fillStyle = sg; ctx.fillRect(MS.x + 12, SLAB.y, MS.w - 24, SLAB.h);
    T(MS.x + MS.w / 2, SLAB.y + SLAB.h / 2 + 5, mt.name + '판  (일함수 W = ' + W + ' eV)', 13.5, '#2a2a2a', 'center', 800);
    // 광원
    D.glow(LSRC.x, LSRC.y, 46, col, 0.5);
    D.roundRect(LSRC.x - 28, LSRC.y - 16, 40, 32, 8); ctx.fillStyle = '#4b5878'; ctx.fill(); ctx.fillStyle = col; ctx.fillRect(LSRC.x + 12, LSRC.y - 11, 6, 22);
    T(LSRC.x + 6, LSRC.y - 24, '광원 ' + S.lam + ' nm', 13, '#cfd8ee', 'center', 800);
    // 전자 (판 위에 앉아 있는 전자)
    m.el.forEach((e) => {
      if (!e.present && e.back > 0) { ctx.strokeStyle = 'rgba(120,180,255,.35)'; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.arc(e.x, EY, 9, 0, TAU); ctx.stroke(); ctx.setLineDash([]); return; }
      const sh = e.shake > 0 ? Math.sin(S.t * 60) * 3 * (e.shake / 0.35) : 0;
      ctx.globalAlpha = e.fade; D.sphere(e.x + sh, EY, 9, '#4aa8ff', { shadow: true, text: 'e⁻', textScale: 0.95 }); ctx.globalAlpha = 1;
    });
    // 광자: 에너지 알갱이 + 짧은 파동 꼬리
    m.ph.forEach((p) => {
      const sp = Math.hypot(p.vx, p.vy) || 1, ux = p.vx / sp, uy = p.vy / sp;
      if (!p.bounce) { ctx.strokeStyle = C.rgba(col, 0.7); ctx.lineWidth = 2; ctx.beginPath(); for (let u = 0; u <= 30; u += 3) { const off = 3.5 * Math.sin(u * 0.55 - S.t * 18); const px = p.x - ux * u - uy * off, py = p.y - uy * u + ux * off; if (u === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); } ctx.stroke(); }
      D.glow(p.x, p.y, 13, col, 0.8); D.sphere(p.x, p.y, 5.5, col, { gloss: false });
    });
    // 튀어나간 전자
    m.fly.forEach((f) => { D.glow(f.x, f.y, 14, '#7bdcff', 0.5); D.sphere(f.x, f.y, 6.5, '#4aa8ff', { gloss: false }); });
    m.pop.forEach((q) => { const k = (S.t - q.t) / 1.2; T(q.x, q.y - k * 22, q.txt, 13.5, q.col, 'center', 800, { stroke: 'rgba(8,14,32,.85)', strokeWidth: 4, alpha: 1 - k * 0.7 }); });
    ctx.restore();
    T(MS.x + 16, MS.y + MS.h - 12, '광자 1개는 전자 1개에게만 에너지를 줘요   ·   초당 튀어나온 전자 ' + m.rate.toFixed(1) + '개', PHONE ? 12 : 13.5, '#cfd8ee', 'left', 700);
    // 오른쪽: 에너지 막대
    panel(MC.x, MC.y, MC.w, MC.h, 14);
    T(MC.x + MC.w / 2, MC.y + 26, '에너지 비교 (eV)', 14.5, '#26324a', 'center', 800);
    const cx0 = MC.x + (PHONE ? 60 : 52), cw = MC.w - (PHONE ? 90 : 70), ch = PHONE ? 150 : 300, cy0 = MC.y + 54;
    const EM = 6.5, Yv = (v) => cy0 + ch - v / EM * ch;
    for (let v = 0; v <= 6; v++) { ctx.strokeStyle = v === 0 ? '#8a95a8' : '#e6ebf4'; ctx.lineWidth = v === 0 ? 2 : 1; ctx.beginPath(); ctx.moveTo(cx0, Yv(v)); ctx.lineTo(cx0 + cw, Yv(v)); ctx.stroke(); T(cx0 - 8, Yv(v) + 4.5, String(v), 12.5, '#5d6879', 'right', 700); }
    const bw = Math.min(70, cw * 0.32), b1 = cx0 + cw * 0.04, b2 = cx0 + cw * 0.58;
    // 광자 에너지 막대
    ctx.fillStyle = col; D.roundRect(b1, Yv(E), bw, Yv(0) - Yv(E), 6); ctx.fill();
    T(b1 + bw / 2, Yv(0) + 18, '광자 hf', 13, '#26324a', 'center', 800);
    T(b1 + bw / 2, Yv(E) - 8, E.toFixed(2), 13.5, '#26324a', 'center', 800);
    // 일함수 + 운동 에너지 막대
    ctx.fillStyle = '#9aa6bb'; D.roundRect(b2, Yv(W), bw, Yv(0) - Yv(W), 6); ctx.fill();
    T(b2 + bw / 2, Yv(W / 2) + 5, 'W', 15, '#fff', 'center', 800);
    if (em) { ctx.fillStyle = '#14a058'; ctx.fillRect(b2, Yv(E), bw, Yv(W) - Yv(E)); if (Yv(W) - Yv(E) > 16) T(b2 + bw / 2, (Yv(W) + Yv(E)) / 2 + 5, 'E_k', 13, '#fff', 'center', 800); }
    T(b2 + bw / 2, Yv(0) + 18, '일함수 W + E_k', 13, '#26324a', 'center', 800);
    ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 2.2; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(cx0, Yv(W)); ctx.lineTo(cx0 + cw, Yv(W)); ctx.stroke(); ctx.setLineDash([]);
    // 계산
    const ty = PHONE ? cy0 + ch + 36 : cy0 + ch + 44, fs = PHONE ? 13 : 13.5, lh = PHONE ? 20 : 21;
    T(MC.x + 14, ty, 'f = ' + fmtF(freqOf(S.lam)), fs, '#26324a', 'left', 800);
    T(MC.x + 14, ty + lh, 'hf = ' + EVNM + ' ÷ ' + S.lam + ' = ' + E.toFixed(2) + ' eV', fs, '#26324a', 'left', 800);
    T(MC.x + 14, ty + lh * 2, em ? 'E_k = hf − W = ' + E.toFixed(2) + ' − ' + W + ' = ' + ek.toFixed(2) + ' eV' : 'hf < W → 전자가 나오지 않아요', fs, em ? '#14a058' : '#e2464b', 'left', 800);
    if (!PHONE) textBlock(MC.x + 14, ty + lh * 3 + 6, MC.w - 28, '세기가 커지면 광자 수가 늘어 튀어나오는 전자의 수가 늘지만, 광자 1개의 에너지는 그대로예요.', 12.5, '#5d6879', 18, 700);
  }

  /* ================= ④ 이미지 센서 (8 × 8 화소) ================= */
  const CELL_S = PHONE ? 24 : 28;
  const PNL = PHONE
    ? [{ x: 8, y: 8 }, { x: 244, y: 8 }, { x: 8, y: 264 }]
    : [{ x: 12, y: 12 }, { x: 270, y: 12 }, { x: 528, y: 12 }];
  const PW = PHONE ? 228 : 260, PH_ = PHONE ? 250 : 292;
  const gridXY = (k) => ({ x: PNL[k].x + (PW - NPX * CELL_S) / 2, y: PNL[k].y + 34 });
  const BAY = (r, c) => (r % 2 === 0 ? (c % 2 === 0 ? 'R' : 'G') : (c % 2 === 0 ? 'G' : 'B'));
  const BAYC = { R: 'rgba(230,70,70,.32)', G: 'rgba(60,170,90,.32)', B: 'rgba(60,110,230,.32)' };
  const expMs = () => EXPO[S.se.exp];
  const muOf = (r, c) => RATE[S.se.scene] * SCENE[r][c] * expMs();            // 화소에 도착하는 광자 수의 평균
  const valOf = (n) => Math.min(255, Math.round(255 * Math.min(n, FULL_WELL) / FULL_WELL));
  function computeCounts() {
    const rnd2 = mulberry32(S.se.seed), cnt = [];
    for (let r = 0; r < NPX; r++) { cnt.push([]); for (let c = 0; c < NPX; c++) {
      const mu = muOf(r, c); let n;
      if (mu < 30) { const Lm = Math.exp(-mu); let k = 0, p = 1; do { k++; p *= rnd2(); } while (p > Lm); n = k - 1; }
      else n = Math.max(0, Math.round(mu + Math.sqrt(mu) * gauss(rnd2)));
      cnt[r].push(n);
    } }
    S.se.counts = cnt;
  }
  function seStatus() {
    const vmax = Math.min(255, 255 * muOf(3, 3) / FULL_WELL);            // 가장 밝은 화소의 (잡음 없는) 값
    return vmax >= 255 ? 'sat' : vmax < 128 ? 'dark' : 'ok';
  }
  function retake(again) { S.se.prog = 0; S.se.hold = 0; computeCounts(); if (again) Sound.tick(); }
  retake();
  function stepSensor(dt) {
    const se = S.se;
    if (S.mode !== 'sensor') return;
    se.prog = Math.min(1, se.prog + dt / (RM ? 0.01 : 1.4));
    if (se.prog < 1 && !RM) {                     // 광자가 센서 화소로 떨어져요 (대표로 몇 개만)
      se.dropAcc = (se.dropAcc || 0) + dt * 90;
      const g = gridXY(1);
      while (se.dropAcc >= 1) {
        se.dropAcc -= 1;
        let tot = 0, pick = Math.random();
        for (let r = 0; r < NPX; r++) for (let c = 0; c < NPX; c++) tot += muOf(r, c);
        let acc = 0, rr = 0, cc = 0; const want = pick * tot;
        outer: for (let r = 0; r < NPX; r++) for (let c = 0; c < NPX; c++) { acc += muOf(r, c); if (acc >= want) { rr = r; cc = c; break outer; } }
        parts.emit({ x: g.x + cc * CELL_S + rnd(6, CELL_S - 6), y: g.y - 28, vx: 0, vy: 260, life: 0.1 + (28 + rr * CELL_S + CELL_S / 2) / 260, size: 2.2, color: '#ffe28a', fade: false });
      }
    }
    if (se.prog >= 1) {
      const st = seStatus();
      se.hold = st === 'ok' ? se.hold + dt : 0;
      if (se.hold > 1.0) se.ok[se.scene] = true;
    }
  }
  function drawPanelFrame(k, title) {
    const p = PNL[k];
    panel(p.x, p.y, PW, PH_, 12);
    T(p.x + PW / 2, p.y + 22, title, PHONE ? 13 : 14, '#26324a', 'center', 800);
  }
  function drawSensor() {
    const se = S.se, st = seStatus();
    // 1. 장면
    drawPanelFrame(0, PHONE ? '① 장면 (실제 밝기)' : '① 장면의 실제 밝기');
    const g0 = gridXY(0), g1 = gridXY(1), g2 = gridXY(2);
    for (let r = 0; r < NPX; r++) for (let c = 0; c < NPX; c++) {
      const L = SCENE[r][c] * (se.scene === 'dark' ? 0.55 : 1); const v = Math.round(255 * Math.min(1, L));
      ctx.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')'; ctx.fillRect(g0.x + c * CELL_S, g0.y + r * CELL_S, CELL_S, CELL_S);
    }
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 1.5; ctx.strokeRect(g0.x, g0.y, NPX * CELL_S, NPX * CELL_S);
    T(PNL[0].x + PW / 2, g0.y + NPX * CELL_S + 20, se.scene === 'dark' ? '🌙 어두운 밤 (광자가 적게 와요)' : '☀️ 밝은 장면', PHONE ? 12 : 13, '#5d6879', 'center', 700);
    // 2. 센서
    drawPanelFrame(1, PHONE ? '② 센서의 화소' : '② 센서: 화소마다 전자를 모아요');
    for (let r = 0; r < NPX; r++) for (let c = 0; c < NPX; c++) {
      const x = g1.x + c * CELL_S, y = g1.y + r * CELL_S, n = se.counts[r][c] * se.prog, fill = Math.min(1, n / FULL_WELL);
      ctx.fillStyle = '#eef2fa'; ctx.fillRect(x, y, CELL_S, CELL_S);
      ctx.fillStyle = fill >= 1 ? '#e2464b' : '#4aa8ff'; ctx.fillRect(x, y + CELL_S * (1 - fill), CELL_S, CELL_S * fill);
      if (se.bayer) { ctx.fillStyle = BAYC[BAY(r, c)]; ctx.fillRect(x, y, CELL_S, CELL_S); }
      ctx.strokeStyle = 'rgba(70,80,100,.35)'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, CELL_S - 1, CELL_S - 1);
    }
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 1.5; ctx.strokeRect(g1.x, g1.y, NPX * CELL_S, NPX * CELL_S);
    T(PNL[1].x + PW / 2, g1.y + NPX * CELL_S + 20, se.bayer ? '빨강·초록·파랑 필터가 화소마다 씌워져요' : '파란 막대 = 모인 전자의 수', PHONE ? 12 : 13, '#5d6879', 'center', 700);
    // 3. 찍힌 사진 (화소값)
    const p3 = PNL[2];
    drawPanelFrame(2, PHONE ? '③ 찍힌 사진 (0~255)' : '③ 찍힌 사진: 화소마다 0~255');
    for (let r = 0; r < NPX; r++) for (let c = 0; c < NPX; c++) {
      const v = valOf(se.counts[r][c] * se.prog), x = g2.x + c * CELL_S, y = g2.y + r * CELL_S;
      ctx.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')'; ctx.fillRect(x, y, CELL_S, CELL_S);
      T(x + CELL_S / 2, y + CELL_S / 2 + 4.5, String(v), 12.5, v > 128 ? '#1b2333' : '#ffffff', 'center', 800);
      if (se.sel && se.sel.r === r && se.sel.c === c) { ctx.strokeStyle = '#ff7a45'; ctx.lineWidth = 3; ctx.strokeRect(x + 1.5, y + 1.5, CELL_S - 3, CELL_S - 3); }
    }
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 1.5; ctx.strokeRect(g2.x, g2.y, NPX * CELL_S, NPX * CELL_S);
    T(p3.x + PW / 2, g2.y + NPX * CELL_S + 20, '숫자를 누르면 2진수로 보여 줘요', PHONE ? 12 : 13, '#5d6879', 'center', 700);
    // 아래 설명 칸 (태블릿) / 오른쪽 아래 (휴대폰)
    const ix = PHONE ? 244 : 12, iy = PHONE ? 264 : PNL[0].y + PH_ + 10, iw = PHONE ? 228 : VW - 24, ih = PHONE ? 250 : VH - iy - 12;
    panel(ix, iy, iw, ih, 12);
    const fs = PHONE ? 12.5 : 14.5;
    const msg = se.prog < 1 ? '노출 중… 광자가 화소에 도착해 전자를 만들어요.' : st === 'ok' ? '✅ 알맞은 노출이에요. 밝은 곳도 어두운 곳도 값이 잘 구분돼요.' : st === 'sat' ? '⚠️ 너무 밝아요. 전자가 가득 차서(빨간 막대) 값이 255로 같아져요.' : '⚠️ 너무 어두워요. 광자 수가 적어서 값이 작고, 화소마다 들쭉날쭉해져요(잡음).';
    const tw = PHONE ? iw - 28 : 520;
    textBlock(ix + 14, iy + 26, tw, msg, fs, st === 'ok' && se.prog >= 1 ? '#14a058' : '#e2464b', 20, 800);
    const sel = se.sel;
    if (sel) {
      const n = se.counts[sel.r][sel.c], v = valOf(n), bits = v.toString(2).padStart(8, '0');
      textBlock(ix + 14, iy + (PHONE ? 78 : 56), tw, '화소(' + (sel.r + 1) + '행 ' + (sel.c + 1) + '열): 광자 → 전자 ' + Math.min(n, FULL_WELL) + '개 → 값 ' + v + ' → 2진수', fs - (PHONE ? 0.5 : 0), '#26324a', 20, 800);
      const bw = PHONE ? 20 : 30, bx = ix + 14, by = iy + (PHONE ? 130 : 96);
      for (let b = 0; b < 8; b++) { ctx.fillStyle = bits[b] === '1' ? '#14a058' : '#e8edf6'; D.roundRect(bx + b * (bw + 4), by, bw, bw + 8, 6); ctx.fill(); T(bx + b * (bw + 4) + bw / 2, by + bw / 2 + 9, bits[b], PHONE ? 14 : 17, bits[b] === '1' ? '#fff' : '#8a95a8', 'center', 800); }
      T(bx, by + bw + 30, v + ' = ' + bits + '(2)  → 파일에는 0과 1로 저장돼요', PHONE ? 12 : 13.5, '#5d6879', 'left', 700);
    } else {
      textBlock(ix + 14, iy + (PHONE ? 78 : 56), tw, '빛(광자) → 전자 → 전압 → 0~255의 숫자(8비트) → 0과 1의 파일. 사진 속 화소를 눌러 보세요.', fs - 1, '#5d6879', 20, 700);
    }
    if (!PHONE) {
      const cx1 = 560;
      textBlock(cx1, iy + 34, VW - cx1 - 24, '이 모형에서는 광자 1개가 전자 1개를 만들어요. 전자 ' + FULL_WELL + '개가 모이면 값이 255예요. 가장 밝은 화소에 오는 광자: ' + RATE[se.scene] + '개/ms × ' + expMs() + ' ms = ' + RATE[se.scene] * expMs() + '개', 13.5, '#5d6879', 19, 700);
    }
  }

  /* ================= 포인터 ================= */
  const gbX = (v) => GB.x + (v - GBX[0]) / (GBX[1] - GBX[0]) * GB.w;
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'graph') {
        if (Math.abs(p.x - gbX(S.gr.mark[S.metal])) < 20 && p.y > GB.y - 18 && p.y < GB.y + GB.h) { S.gr.mdrag = true; Sound.click(); return true; }
      } else if (S.mode === 'sensor') {
        const g = gridXY(2);
        const c = Math.floor((p.x - g.x) / CELL_S), r = Math.floor((p.y - g.y) / CELL_S);
        if (r >= 0 && r < NPX && c >= 0 && c < NPX) { S.se.sel = { r, c }; Sound.click(); }
      }
      return false;
    },
    move(p) { if (S.gr.mdrag) S.gr.mark[S.metal] = clamp(Math.round(((p.x - GB.x) / GB.w * (GBX[1] - GBX[0]) + GBX[0]) * 10) / 10, GBX[0], GBX[1]); },
    up() { S.gr.mdrag = false; },
    hover(p) { if (S.mode === 'graph' && Math.abs(p.x - gbX(S.gr.mark[S.metal])) < 20 && p.y > GB.y - 18 && p.y < GB.y + GB.h) return 'ew-resize'; return 'default'; },
  });

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  function readouts() {
    let a, b, c, L1, L2, L3;
    const E = eph(S.lam), mt = MET[S.metal];
    if (S.mode === 'exp') {
      L1 = '빛 (파장 · 진동수)'; a = S.lam + ' nm · ' + fmtF(freqOf(S.lam)); L2 = '광전류'; b = S.ex.I.toFixed(1) + ' μA'; L3 = '정지 전압'; c = S.ex.V.toFixed(2) + ' V';
    } else if (S.mode === 'graph') {
      L1 = '지금 빛'; a = S.lam + ' nm · 세기 ' + S.s; L2 = '찍은 점'; b = '왼쪽 ' + S.gr.A.pts.length + ' · 오른쪽 ' + (S.gr.B.Na.length + S.gr.B.Zn.length); L3 = '한계 진동수 표지'; c = S.gr.mark[S.metal].toFixed(1) + '×10¹⁴ Hz';
    } else if (S.mode === 'model') {
      L1 = '광자 1개의 에너지 hf'; a = E.toFixed(2) + ' eV'; L2 = '일함수 W (' + mt.name + ')'; b = mt.W + ' eV'; L3 = '남는 에너지 E_k'; c = E - mt.W > 1e-9 ? (E - mt.W).toFixed(2) + ' eV' : '방출 안 돼요';
    } else {
      const st = seStatus(); L1 = '노출 시간'; a = expMs() + ' ms'; L2 = '가장 밝은 화소의 값'; b = Math.min(255, Math.round(255 * muOf(3, 3) / FULL_WELL)) + (st === 'sat' ? ' (포화)' : ''); L3 = '사진의 상태'; c = S.se.prog < 1 ? '노출 중…' : st === 'ok' ? '알맞아요' : st === 'sat' ? '너무 밝아요' : '너무 어두워요';
    }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  function setSlider(id, v) { const mu = Sound.muted; Sound.muted = true; const el = $('#' + id); el.value = v; el.dispatchEvent(new Event('input')); Sound.muted = mu; }
  const bracket = (m) => S.gr.B[m].some((p) => p.ek === 0) && S.gr.B[m].some((p) => p.ek > 0);
  const nB = (m, emit) => S.gr.B[m].filter((p) => (p.ek > 0) === emit).length;
  const lamN = Math.round(lam0Of('Na') / 10) * 10, lamZ = Math.round(lam0Of('Zn') / 10) * 10;
  const levels = [
    {
      title: '광전 효과: 빛이 전자를 꺼낼까?', short: '광전 효과', icon: '💡', phase: '실험',
      intro: '<p class="si-q">❓ 탐구 질문: 아주 센 빨간 불빛은 금속에서 전자를 못 꺼내는데, 약한 파란 불빛은 꺼내는 건 왜일까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시에서</b> 간섭 무늬로 빛이 파동임을 확인했어요. 이번에는 빛이 금속에서 <b>전자를 꺼내는</b> 실험을 하고, 파동 모형으로 설명이 되는지 살펴봐요. (통합과학의 전자와 전류를 이어서 써요.)</div>' +
        '<p>진공관 속 금속판에 빛을 비추면 전자(광전자)가 튀어나올 수 있어요. 이것이 <b>광전 효과</b>예요. 전자가 집전판에 닿으면 <b>광전류</b>가 흐르고, 전압계의 <b>정지 전압</b>은 전자의 최대 운동 에너지(eV)를 알려 줘요.</p>',
      features: ['exp'],
      setup() { S.ex.seen = {}; S.ex.hold = 0; S.showCmp = false; S.metal = 'Na'; setLam(500); setInt(5); slInt.set(5); setScene('exp'); },
      recap: '나트륨에서는 빛의 세기가 아무리 세도 빨간빛은 전자를 꺼내지 못하고, 초록빛·보라빛은 약해도 전자를 꺼내요. 파동 모형의 예측과 달라요.',
      summary: '<ul><li><b>광전 효과</b>: 금속에 빛을 비추면 전자(광전자)가 튀어나오는 현상. 튀어나온 전자가 흐르면 광전류가 돼요.</li><li>나트륨(Na)에 <b>세기를 가장 세게</b> 해도 650 nm(빨강)에서는 전자가 나오지 않지만, 510 nm(초록)·400 nm(보라)에서는 전자가 나와요.</li><li><b>파동 모형</b>은 “빛이 세면 에너지가 커서 언젠가는 전자가 나온다”고 예측해서 실험 결과와 어긋나요.</li></ul>',
      missions: [
        {
          title: '세 가지 색으로 비교하기',
          goal: '빛의 세기를 <b>가장 세게(10)</b> 하고 <b>빨강 · 초록 · 보라</b>빛을 차례로 비추어, 전자가 나오는지 관찰하세요.',
          hint: '세기 슬라이더를 10으로 올린 뒤 🔴 🟢 🟣 버튼을 차례로 눌러요. 각 색을 1초쯤 비춰요.',
          setup() { S.ex.seen = {}; S.ex.hold = 0; S.showCmp = false; S.metal = 'Na'; setLam(500); setInt(5); slInt.set(5); setScene('exp'); },
          check: () => S.ex.seen.R && S.ex.seen.G && S.ex.seen.V,
          hold: 0.3,
          status: () => mark(S.ex.seen.R) + ' 빨강(세기 10) &nbsp; ' + mark(S.ex.seen.G) + ' 초록(세기 10) &nbsp; ' + mark(S.ex.seen.V) + ' 보라(세기 10)' + (S.s !== 10 ? ' &nbsp; (세기를 10으로)' : ''),
          explain: '세기가 10(가장 센 빛)이어도 <b>650 nm 빨간빛</b>에서는 전자가 나오지 않아요. 반면 510 nm 초록빛과 400 nm 보라빛에서는 전자가 나오고, 보라빛일수록 정지 전압(전자의 최대 운동 에너지)이 커요.',
        },
        {
          title: '예측과 실험 결과 비교하기', manual: true,
          goal: '파동 모형이 예측한 것과 실험 결과를 비교해 <b>다섯 문장</b>을 완성하세요.',
          hint: '앞에서 세기를 가장 세게 했을 때 빨강·초록·보라에서 전자가 나왔는지 떠올려 보세요. 위 장치에서 다시 확인해도 돼요.',
          setup() { S.showCmp = true; CMP.reset(); setScene('exp'); updateCtl(); },
          check: () => CMP.grade(null, '빨간 칸을 다시 골라 보세요. 장치에서 세기 10으로 650 · 510 · 400 nm를 다시 비춰 보면 알 수 있어요.'),
          status: () => '고른 문장 ' + CMP.count() + ' / 5',
          explain: '파동 모형은 “세기가 충분히 크면 어떤 색에서든 전자가 나온다”고 예측해요. 그러나 실험에서는 <b>빨간빛(650 nm)은 가장 세게 해도</b> 전자가 나오지 않았어요. 빛의 색(진동수)에 따른 차이를 파동 모형은 설명하지 못해요.',
        },
        {
          type: 'quiz', title: '파동 모형으로 설명이 안 되는 까닭',
          goal: '빨간빛은 아무리 세도 전자가 나오지 않는 것을 파동 모형이 설명하지 못하는 까닭은?',
          setup() { S.showCmp = false; setScene('exp'); updateCtl(); },
          choices: ['파동 모형에서는 빛이 세져도 전자가 받는 에너지가 변하지 않아서', '파동 모형에서는 센 빛이면 색과 상관없이 충분한 에너지를 줄 수 있어 전자가 나와야 하는데, 실제로는 진동수가 낮으면 나오지 않아서', '빨간빛은 에너지가 전혀 없어서', '빨간빛은 금속에 반사되어 되돌아가서'],
          answer: 1,
          feedback: ['파동 모형에서는 오히려 세기가 클수록 에너지가 커져요. 그래서 예측이 틀린 거예요.', '', '빨간빛도 에너지는 있어요. 다만 전자 하나를 꺼내는 데는 부족해요.', '반사는 이 실험의 핵심이 아니에요. 장치에서는 빛이 금속판에 닿아요.'],
          explain: '파동 모형으로는 센 빛이면 시간이 지나 전자가 에너지를 모아 튀어나올 수 있어야 해요. 그러나 실험에서는 <b>진동수가 어떤 값(한계 진동수)보다 작으면</b> 빛이 아무리 세도 전자가 나오지 않았어요. 새로운 설명이 필요해요.',
        },
      ],
    },
    {
      title: '진동수와 세기: 무엇이 달라질까?', short: '진동수·세기', icon: '📈', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 빛의 색(진동수)에 따라 전자가 나오기도 하고 안 나오기도 했어요. 이제 <b>세기</b>와 <b>진동수</b>가 각각 무엇을 바꾸는지 그래프로 확인해요.</div>' +
        '<p>두 개의 그래프를 점으로 완성해요. ① 파장을 고정하고 <b>세기</b>를 바꾸어 <b>광전류</b>를 찍고, ② 세기를 두고 <b>진동수</b>를 바꾸어 <b>전자의 최대 운동 에너지</b>를 찍어요. 전자가 나오기 시작하는 진동수가 <b>한계 진동수</b>예요. 금속도 바꾸어 비교해요.</p>',
      features: ['graph', 'metal'],
      setup() { S.metal = 'Na'; setLam(400); setInt(5); S.gr.A = { lam: null, metal: null, pts: [] }; S.gr.B = { Na: [], Zn: [] }; S.gr.mark = { Na: 8.0, Zn: 8.0 }; S.gr.found = { Na: false, Zn: false }; setScene('graph'); },
      recap: '세기를 키우면 광전류(전자의 수)는 커지지만 전자의 최대 운동 에너지는 그대로예요. 진동수가 한계 진동수보다 커야만 전자가 나오고, 진동수가 클수록 최대 운동 에너지가 커져요.',
      summary: '<ul><li>빛의 <b>세기 ↑</b> → 튀어나오는 전자의 수(<b>광전류</b>) ↑. 그래프는 원점을 지나는 직선이고, 전자의 최대 운동 에너지는 <b>변하지 않아요</b>. 예) 나트륨 400 nm: 세기 1당 1.0 μA</li><li><b>진동수 ↑</b> → 전자의 <b>최대 운동 에너지</b> ↑ (한계 진동수 위에서만 올라가는 직선)</li><li><b>한계 진동수</b> f₀: 나트륨 ' + fmtF(f0Of('Na')) + '(한계 파장 약 ' + lamN + ' nm), 아연 ' + fmtF(f0Of('Zn')) + '(약 ' + lamZ + ' nm). f₀ 아래에서는 빛이 아무리 세도 전자가 나오지 않아요. 금속마다 f₀가 달라요.</li></ul>',
      missions: [
        {
          title: '두 그래프의 점 찍기',
          goal: '왼쪽: 같은 파장에서 세기를 바꾸며 <b>점 4개</b>. 오른쪽: 나트륨에서 파장을 바꾸며 <b>점 4개</b>(전자가 나오는 빛 3개 이상, 안 나오는 빛 1개 이상)를 찍으세요.',
          hint: '파장은 400 nm로 두고 세기를 바꿔 가며 📍세기–전류 점 찍기를 눌러요. 오른쪽은 세기는 그대로 두고 파장을 바꾸며 📍진동수–에너지 점 찍기를 눌러요. 600 nm 같은 긴 파장도 하나 찍어요.',
          setup() { S.metal = 'Na'; setLam(400); setInt(5); S.gr.A = { lam: null, metal: null, pts: [] }; S.gr.B = { Na: [], Zn: [] }; setScene('graph'); },
          check: () => S.gr.A.pts.length >= 4 && S.gr.B.Na.length >= 4 && nB('Na', true) >= 3 && nB('Na', false) >= 1,
          hold: 0.6,
          status: () => mark(S.gr.A.pts.length >= 4) + ' 세기–전류 점 ' + S.gr.A.pts.length + '/4 &nbsp; ' + mark(S.gr.B.Na.length >= 4 && nB('Na', true) >= 3 && nB('Na', false) >= 1) + ' 진동수–에너지 점 ' + S.gr.B.Na.length + '/4 (나옴 ' + nB('Na', true) + ' · 안 나옴 ' + nB('Na', false) + ')',
          explain: '왼쪽 그래프는 <b>원점을 지나는 직선</b>이에요. 세기가 2배가 되면 광전류도 2배가 되지만(400 nm에서 세기 5 → 5.0 μA, 세기 10 → 10.0 μA) 전자의 에너지는 그대로예요. 오른쪽 그래프는 한계 진동수 아래에서는 0이고, 그 위에서 진동수와 함께 올라가는 직선이에요.',
        },
        {
          title: '한계 진동수 읽기',
          goal: '오른쪽 그래프에서 주황색 표지를 끌어 <b>나트륨</b>과 <b>아연</b> 각각의 <b>한계 진동수</b>(전자가 나오기 시작하는 진동수)에 맞추세요.',
          hint: '점의 에너지가 0에서 올라가기 시작하는 곳이 한계 진동수예요. 금속을 바꿔 가며 그 금속의 점을 찍어야 해요. 아연은 자외선(약 250 nm) 점도 찍어 보세요.',
          setup() { setScene('graph'); S.gr.found = { Na: false, Zn: false }; },
          check: () => S.gr.found.Na && S.gr.found.Zn,
          hold: 0.3,
          status: () => mark(S.gr.found.Na) + ' 나트륨 ' + (bracket('Na') ? '' : '(점을 찍어요)') + ' &nbsp; ' + mark(S.gr.found.Zn) + ' 아연 ' + (bracket('Zn') ? '' : '(점을 찍어요)'),
          explain: '한계 진동수는 나트륨이 <b>' + fmtF(f0Of('Na')) + '</b>(약 ' + lamN + ' nm), 아연이 <b>' + fmtF(f0Of('Zn')) + '</b>(약 ' + lamZ + ' nm)예요. 아연은 가시광선으로는 전자가 나오지 않고 자외선이 필요해요. 금속마다 전자를 꺼내는 데 필요한 에너지가 달라요.',
        },
        {
          type: 'quiz', title: '세기를 키우면 무엇이 변할까?',
          goal: '같은 색의 빛에서 세기를 <b>2배</b>로 키웠을 때 변하는 것과 변하지 않는 것으로 옳은 것은?',
          setup() { setScene('graph'); },
          choices: ['전자의 수(광전류)도, 전자의 최대 운동 에너지도 모두 2배가 돼요', '전자의 수(광전류)는 2배가 되지만, 전자의 최대 운동 에너지는 그대로예요', '전자의 최대 운동 에너지만 2배가 돼요', '둘 다 변하지 않아요'],
          answer: 1,
          feedback: ['오른쪽 그래프를 보세요. 진동수가 같으면 에너지 점이 같은 높이에 있어요.', '', '에너지는 진동수에 따라 변하지, 세기에 따라 변하지 않아요.', '세기가 커지면 광전류 그래프가 올라갔어요.'],
          explain: '세기는 <b>빛(광자)의 수</b>를 정해요. 세기가 2배이면 튀어나오는 전자도 2배(광전류 2배)지만, 전자 하나가 얻는 에너지는 진동수가 같으면 <b>그대로</b>예요. 전자의 최대 운동 에너지는 진동수가 정해요.',
        },
      ],
    },
    {
      title: '광자 모형: 에너지 알갱이', short: '광자 모형', icon: '🔬', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 세기는 전자의 수를, 진동수는 전자의 에너지를 정한다는 것을 확인했어요. 파동 모형으로는 설명이 안 되었죠. 아인슈타인은 빛이 <b>에너지 알갱이</b>로 이루어졌다고 설명했어요.</div>' +
        '<p>진동수가 f인 빛은 에너지 <b>E = hf</b>인 알갱이(<b>광자</b>)의 흐름이에요. 전자 하나가 광자 하나를 통째로 흡수해서, 금속에서 벗어나는 데 필요한 에너지 <b>일함수 W</b>를 쓰고 남는 에너지가 운동 에너지가 돼요: <b>hf = W + E<sub>k</sub></b>. (h = 6.63 × 10⁻³⁴ J·s, 1 eV = 1.6 × 10⁻¹⁹ J, 광자 에너지(eV) = 1240 ÷ 파장(nm))</p>',
      features: ['model'],
      setup() { S.showEk = false; S.showLam3 = false; S.metal = 'Na'; setLam(400); setInt(5); mdInit(); setScene('model'); },
      recap: '빛은 에너지 hf인 광자의 흐름이에요. 광자 하나의 에너지가 일함수 W보다 작으면 광자가 아무리 많아도 전자가 나오지 못해요. 나오는 전자의 운동 에너지는 hf − W예요.',
      summary: '<ul><li><b>광자</b>: 에너지 E = hf인 빛의 알갱이. 전자 1개는 광자 1개를 흡수해요. h = 6.63 × 10⁻³⁴ J·s, 1 eV = 1.6 × 10⁻¹⁹ J, E(eV) = 1240 ÷ λ(nm)</li><li><b>hf = W + E<sub>k</sub></b>: 일함수 W를 이기고 남은 에너지가 운동 에너지예요. 나트륨(W = 2.3 eV)에 400 nm(3.10 eV) → E<sub>k</sub> = <b>0.80 eV</b></li><li>hf &lt; W이면 광자가 아무리 많이(세기가 세게) 와도 전자가 나오지 못해요. 나트륨에서 전자가 나오는 가장 긴 파장은 <b>530 nm</b>(540 nm는 2.296 eV로 W에 못 미쳐요).</li><li>세기 ↑ = 광자 수 ↑ = 튀어나오는 전자 수 ↑, 광자 하나의 에너지는 그대로예요.</li></ul>',
      missions: [
        {
          title: '운동 에너지 계산하기', manual: true,
          goal: '나트륨(W = 2.3 eV)에 <b>400 nm</b> 빛을 비출 때 튀어나오는 전자의 운동 에너지 E<sub>k</sub>를 <b>eV</b> 단위로 구해 칸에 쓰세요.',
          hint: '광자 에너지 hf = 1240 ÷ 400 = 3.10 eV예요. 여기서 일함수 W = 2.3 eV를 빼요.',
          setup() { S.showLam3 = false; S.showEk = true; S.metal = 'Na'; setLam(400); setInt(5); $('#inEk').value = ''; $('#inEk').classList.remove('ok', 'bad'); setScene('model'); updateCtl(); },
          check() {
            const el = $('#inEk'), v = parseFloat(el.value);
            const flag = (ok) => { if (!ok && !el.classList.contains('bad')) { el.classList.remove('ok'); void el.offsetWidth; el.classList.add('bad'); } if (ok) { el.classList.remove('bad'); el.classList.add('ok'); } };
            if (S.lam !== 400 || S.metal !== 'Na') return '파장을 400 nm, 금속을 나트륨으로 맞춰야 해요.';
            if (!isFinite(v)) return 'E_k를 eV 단위의 숫자로 써 주세요.';
            if (Math.abs(v - 0.8) <= 0.03) { flag(true); return true; }
            flag(false);
            if (Math.abs(v - 3.1) < 0.06) return '3.10 eV는 광자 하나의 에너지예요. 일함수 W를 빼야 해요.';
            if (Math.abs(v - 2.3) < 0.06) return '2.3 eV는 일함수 W예요. 전자의 운동 에너지는 hf − W예요.';
            return '다시 계산해 보세요. E_k = hf − W = 1240 ÷ 400 − 2.3 이에요.';
          },
          status: () => '광자 ' + eph(S.lam).toFixed(2) + ' eV − W ' + MET[S.metal].W + ' eV',
          explain: '광자 에너지 hf = 1240 ÷ 400 = 3.10 eV, 일함수 W = 2.3 eV이므로 <b>E<sub>k</sub> = hf − W = 3.10 − 2.3 = 0.80 eV</b>예요. 앞에서 전압계(정지 전압)가 보여 준 0.80 V와 같아요.',
        },
        {
          title: '전자가 나오는 가장 긴 파장 찾기', manual: true,
          goal: '나트륨에서 <b>전자가 튀어나오는 가장 긴 파장</b>을 찾아 칸에 쓰세요. 파장 슬라이더는 10 nm씩 움직여요.',
          hint: '700 nm에서 시작해 파장을 조금씩 줄여 보며 광자 에너지 막대가 일함수(W) 선을 넘는 순간을 찾아요. 막대가 W 선과 같거나 낮으면 전자가 나오지 않아요.',
          setup() { S.showEk = false; S.showLam3 = true; S.metal = 'Na'; setLam(600); setInt(5); S.md.seen530 = false; $('#inLam3').value = ''; $('#inLam3').classList.remove('ok', 'bad'); mdInit(); setScene('model'); updateCtl(); },
          check() {
            const el = $('#inLam3'), v = parseFloat(el.value);
            const flag = (ok) => { if (!ok && !el.classList.contains('bad')) { el.classList.remove('ok'); void el.offsetWidth; el.classList.add('bad'); } if (ok) { el.classList.remove('bad'); el.classList.add('ok'); } };
            if (!isFinite(v)) return '파장을 nm 단위의 숫자로 써 주세요.';
            if (Math.abs(v - 530) < 1) { if (!S.md.seen530) return '직접 530 nm로 맞추어 전자가 튀어나오는 것을 확인해 보세요.'; flag(true); return true; }
            flag(false);
            if (Math.abs(v - 540) < 1) return '540 nm에서는 hf = 1240 ÷ 540 = 2.296 eV로 W(2.3 eV)에 아주 조금 못 미쳐요. 전자가 나오지 않아요. 한 칸 줄여 보세요.';
            if (v > 540) return '그 파장에서는 전자가 나오지 않아요. 슬라이더로 확인해 보세요.';
            return '그보다 더 긴 파장에서도 전자가 나와요. 파장을 늘려 가며 마지막으로 전자가 나오는 곳을 찾아요.';
          },
          status: () => mark(S.md.seen530) + ' 530 nm에서 방출 확인 &nbsp; (지금 ' + S.lam + ' nm: ' + (emitsAt(S.lam, S.metal) ? '나옴' : '안 나옴') + ')',
          explain: '나트륨의 한계 파장은 1240 ÷ 2.3 ≈ 539 nm예요. 슬라이더에서 <b>530 nm</b>는 hf = 2.34 eV로 W보다 커서(E<sub>k</sub> = 0.04 eV) 전자가 나오지만, 540 nm는 2.296 eV로 W보다 작아서 나오지 못해요. 한계 진동수에 해당하는 값이에요.',
        },
        {
          type: 'quiz', title: '빛이 입자라면 간섭 무늬는?',
          goal: '광전 효과는 빛이 알갱이(광자)임을 보여 줘요. 그런데 앞 차시의 이중 슬릿 실험에서는 간섭 무늬가 생겼어요. 이 둘을 모두 설명하는 말은?',
          setup() { S.showEk = false; S.showLam3 = false; setScene('model'); updateCtl(); },
          choices: ['빛은 상황에 따라 파동처럼도, 입자(광자)처럼도 행동해요', '광전 효과가 틀렸고 빛은 파동일 뿐이에요', '이중 슬릿 실험이 틀렸고 빛은 입자일 뿐이에요', '빛의 색에 따라 파동이거나 입자예요'],
          answer: 0,
          feedback: ['', '두 실험 모두 반복해서 확인된 결과예요. 둘 다 맞아요.', '두 실험 모두 반복해서 확인된 결과예요. 둘 다 맞아요.', '같은 빛이 실험 상황에 따라 다른 모습을 보여요. 색과는 상관없어요.'],
          explain: '간섭과 회절은 빛의 <b>파동성</b>을, 광전 효과는 <b>입자성</b>(광자)을 보여 줘요. 빛은 상황에 따라 두 성질을 모두 나타내는데, 이를 빛의 <b>이중성</b>이라고 해요. 다음 차시에서는 전자 같은 물질도 파동처럼 행동하는 것을 알아봐요.',
        },
      ],
    },
    {
      title: '이미지 센서: 광자를 숫자로', short: '이미지 센서', icon: '📷', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 광자 하나가 전자 하나를 만들 수 있음을 알았어요. 디지털 카메라와 스마트폰의 <b>이미지 센서</b>는 이 원리로 사진을 찍어 <b>영상 정보</b>를 저장해요.</div>' +
        '<p>센서는 아주 많은 <b>화소</b>로 이루어져요. 화소마다 도착한 광자 수만큼 전자가 모이고, 그 양이 <b>0~255</b>의 숫자(밝기 값)가 돼요. 이 숫자들이 0과 1의 파일로 저장돼요. 여기서는 8 × 8 화소의 작은 센서로 <b>노출 시간</b>을 바꾸며 사진을 찍어 봐요.</p>',
      features: ['sensor'],
      setup() { S.se.ok = { bright: false, dark: false }; S.se.scene = 'bright'; S.se.exp = 1; S.se.sel = null; setSlider('sEx', 1); seSeg.set('bright'); retake(); setScene('sensor'); },
      recap: '이미지 센서는 화소마다 광자를 받아 전자를 모으고, 그 양을 0~255의 숫자로 바꿔 저장해요. 광자가 너무 적으면 어둡고 잡음이 많고, 너무 많으면 포화돼요.',
      summary: '<ul><li><b>이미지 센서(CMOS·CCD)</b>: 화소마다 광자를 받아 전자를 만들고, 전자의 수(밝기 ∝ 광자 수)를 전압으로 읽어 0~255(8비트)의 숫자로 바꿔요. 이 숫자들이 0과 1의 영상 파일로 저장돼요.</li><li>노출 시간이 짧거나 어두운 장면이면 광자가 적어 사진이 어둡고 <b>잡음</b>이 많아요. 광자의 수는 통계적으로 흔들리기 때문이에요.</li><li>너무 오래 노출하면 전자가 가득 차서 <b>포화</b>(값 255)돼요. 이 모형에서는 가장 밝은 화소의 값이 128~254일 때 알맞아요(밝은 장면 8 ms, 어두운 장면 32 ms).</li><li>색은 화소 앞의 빨강·초록·파랑 필터로 나눠 받아요. 태양 전지와 자동문의 광센서도 같은 원리예요.</li></ul>',
      missions: [
        {
          title: '노출을 맞춰 선명하게 찍기',
          goal: '<b>밝은 장면</b>과 <b>어두운 장면</b> 각각에서, 노출 시간을 바꿔 가장 밝은 화소의 값이 <b>128~254</b>가 되는 <b>알맞은 노출</b>을 찾으세요.',
          hint: '너무 어두우면 노출 시간을 늘리고, 빨간 막대(포화)가 생기면 줄여요. 어두운 장면은 밝은 장면보다 더 오래 노출해야 해요.',
          setup() { S.se.ok = { bright: false, dark: false }; S.se.scene = 'bright'; S.se.exp = 1; S.se.sel = null; setSlider('sEx', 1); seSeg.set('bright'); retake(); setScene('sensor'); },
          check: () => S.se.ok.bright && S.se.ok.dark,
          hold: 0.3,
          status: () => mark(S.se.ok.bright) + ' 밝은 장면 &nbsp; ' + mark(S.se.ok.dark) + ' 어두운 장면 &nbsp; (지금 ' + (S.se.scene === 'bright' ? '밝은' : '어두운') + ' 장면 · ' + expMs() + ' ms: ' + (S.se.prog < 1 ? '노출 중' : seStatus() === 'ok' ? '알맞음' : seStatus() === 'sat' ? '포화' : '어두움') + ')',
          explain: '밝은 장면에서는 가장 밝은 화소에 1 ms당 ' + RATE.bright + '개의 광자가 와서 <b>' + 8 + ' ms</b>면 ' + RATE.bright * 8 + '개(값 ' + valOf(RATE.bright * 8) + ')로 알맞고, 16 ms는 포화돼요. 어두운 장면은 ' + RATE.dark + '개/ms이므로 <b>' + 32 + ' ms</b>(' + RATE.dark * 32 + '개, 값 ' + valOf(RATE.dark * 32) + ')가 알맞아요. 광자가 많이 모일수록 잡음이 상대적으로 줄어요.',
        },
        {
          type: 'quiz', title: '센서와 광전 효과',
          goal: '디지털 카메라의 이미지 센서, 태양 전지, 자동문의 광센서가 <b>공통으로 이용하는 원리</b>는?',
          setup() { setScene('sensor'); },
          choices: ['빛(광자)이 물질에서 전자를 만들어 전기 신호를 얻는 것', '빛이 렌즈에서 굴절하는 것', '빛이 슬릿을 지나며 간섭하는 것', '빛이 전선을 데워서 저항이 변하는 것'],
          answer: 0,
          feedback: ['', '굴절은 렌즈가 상을 맺게 하는 원리예요. 센서가 신호를 만드는 원리는 아니에요.', '간섭은 빛의 파동성이에요. 센서는 광자가 전자를 만드는 입자성을 이용해요.', '이 장치들은 열이 아니라 광자가 만든 전자의 수를 읽어요.'],
          explain: '이미지 센서, 태양 전지, 자동문 센서는 모두 <b>광자가 전자를 만드는 광전 효과</b>(반도체에서는 광전 효과와 같은 원리)를 이용해요. 받은 광자 수가 전자 수, 곧 전기 신호의 크기를 정해요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hp-photon', mount: '#game', badge: '광자 박사', homeHref: '../../index.html#hp',
    featureLabels: { exp: '💡 광전 효과 실험 장치 · 전류계 · 전압계', graph: '📈 세기·진동수 그래프', metal: '🧪 금속 바꾸기 (Na · Zn)', model: '🔬 광자 모형 · 에너지 막대', sensor: '📷 8×8 이미지 센서' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  setScene('exp');
  updateCtl();
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t; S.dt = dt;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    view.apply();
    stepExp(dt); stepGraph(dt); stepModel(dt); stepSensor(dt);
    ctx.clearRect(0, 0, VW, VH);
    if (S.mode === 'exp') drawExp(); else if (S.mode === 'graph') drawGraph(); else if (S.mode === 'model') drawModel(); else drawSensor();
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, GA, GB, GBX, PNL, CELL_S, EX, MS, eph, ekAt, emitsAt, freqOf, f0Of, lam0Of, setLam, setInt, setScene, addPointA, addPointB, retake, seStatus, valOf, muOf, expMs, gridXY, CMP, EXPO, RATE, FULL_WELL, mdInit, slEx, bracket,
    get game() { return game; },
  };

})();
