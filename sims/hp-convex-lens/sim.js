/* =========================================================
   물리학 Ⅲ. 빛과 물질 - 볼록렌즈와 상 (단원 2차시)
   성취기준 [12물리03-02] 빛의 굴절을 이용하여 볼록렌즈에서 상이 맺히는 과정을 설명하고,
                          반도체와 디스플레이 제작 공정에서 중요하게 활용됨을 인식할 수 있다.
   ① 모형: 굴절과 렌즈 (프리즘 조각 → 곡면 렌즈, 초점 F)
   ② 탐구: 광선 추적 (세 주광선으로 상의 위치·크기·방향, 실상/허상)
   ③ 실험: 상의 위치와 초점거리 (광학대 · 스크린 · 먼 풍경 · 같은 크기의 상)
   ④ 적용: 노광 공정 (포토리소그래피: 마스크 → 축소 투영 렌즈 → 웨이퍼)
   결상 공식 · 렌즈 제작자 공식 · 복합 렌즈는 다루지 않아요. 상의 위치와 크기는 작도와 직접 측정으로만 구해요.
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
  const N_GLASS = 1.5;                 // 유리의 굴절률 (굴절 모형 상수)
  const RMIN = 6, RMAX = 14;           // 렌즈 곡률 반지름 범위 (cm)
  const APER = 0.38;                   // 렌즈 반지름 높이 = 0.38 R
  const RAYH = 0.3;                    // 평행 광선이 들어오는 최대 높이 = 0.3 R
  const F_TOL = 1.0;                   // 초점 표지 허용 오차 (cm)
  const F_BENCH = 10.0;                // 광학대 렌즈의 초점거리 (cm, 학생에게는 비공개)
  const F_LITHO = 7.2;                 // 노광 투영 렌즈의 초점거리 (cm)
  const A_LITHO = 36.0;                // 마스크~렌즈 거리 (cm)  → 상(웨이퍼)은 렌즈에서 9.0 cm, 크기는 1/4
  const OBJ_H = 2.5;                   // 물체(화살표) 높이 (cm)
  const BEN_D = 8;                     // 광학대 렌즈의 유효 지름 (cm)
  const BLUR_OK = 0.25;                // 선명하다고 보는 번짐 지름 (cm): 번짐 지름 = D × |스크린 − 상| ÷ 상까지 거리
  const F_TR = 10.0;                   // 광선 추적 장면의 초점거리 (cm)
  const LITHO_W = [500, 250, 120, 60, 30, 14];   // 웨이퍼에 그릴 선의 폭 (nm)
  const WL_NAME = { '436': '436 nm', '365': '365 nm 자외선', '193': '193 nm 심자외선', '13.5': '13.5 nm 극자외선' };
  const ORDER = ['웨이퍼 세척', '감광제 도포', '노광', '현상', '식각', '감광제 제거'];   // 올바른 공정 순서
  const SHUF = [3, 1, 5, 0, 4, 2];                                                      // 카드가 놓이는 순서(섞인 것)

  /* ---------- 장면 배치 ---------- */
  const BP = PHONE ? { x: 8, y: 8, w: 464, h: 312, LX: 168, AY: 168, PXC: 3.1 } : { x: 12, y: 12, w: 776, h: 414, LX: 270, AY: 222, PXC: 5.6 };
  const BOT = PHONE ? { x: 8, y: 330, w: 464, h: 300 } : { x: 12, y: 436, w: 776, h: 112 };
  const KY = 2.4;                      // 광학대 그림에서 세로 방향을 가로의 2.4배로 늘려 그려요 (작은 물체를 보기 쉽게)
  const PYC = BP.PXC * KY;             // 세로 1 cm = PYC 픽셀
  const LENS_HALF = (BP.AY - BP.y - 14) / PYC;     // 광선 추적 장면에서 렌즈(주평면)의 반지름 (cm)
  const xOf = (cm) => BP.LX + cm * BP.PXC;
  const yOf = (cm) => BP.AY - cm * PYC;

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'refract', t: 0, fade: 0, dt: 0.016,
    rf: { view: 'lens', R: 10, RT: 10, flag: 4.0, drag: false, morph: 1, norm: false, seenPrism: false, hP: 0, foundA: false, foundB: false, hA: 0, hB: 0, cache: null },
    tr: { a: 30, rays: { 1: false, 2: false, 3: false }, handle: { x: 7, y: -5 }, hDrag: false, found: false, odrag: false, visited: {}, imgX: 0, imgY: 0, imgS: 1, showTbl: false, fAt: 0 },
    bn: { a: 30, aT: 30, sx: 20, far: false, cover: false, drag: null, rows: [], sharp: 0, blur: 0, img: { x: 0, s: 0 }, showNum: false, ptsInfo: 0 },
    lt: { sub: 'flow', wl: '13.5', w: 6.0, order: [], ordOK: false, ordPlay: 0, expo: 0, wdrag: false, sharp: false, done: false },
  };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const MODE_LABEL = { refract: '🔺 굴절과 렌즈', trace: '🧭 광선 추적', bench: '🔬 상 실험', litho: '🏭 노광 공정' };
  const fmt1 = (x) => x.toFixed(1);

  function setScene(mode, sub) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); }
    S.mode = mode;
    if (mode === 'litho' && sub) S.lt.sub = sub;
    $('#tbLabel').textContent = MODE_LABEL[mode];
    updateCtl();
  }
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      const sub = n.getAttribute('data-sub');
      if (on && sub && S.mode === 'litho') on = sub === S.lt.sub;
      const dm = n.getAttribute('data-match');
      if (on && dm) on = dm === 'tbl' ? S.tr.showTbl : S.bn.showNum;
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    vwSeg.set(S.rf.view); lthSeg.set(S.lt.sub); wlSeg.set(S.lt.wl);
    $('#bNorm').style.outline = S.rf.norm ? '3px solid var(--subject)' : '';
    $('#bFar').style.outline = S.bn.far ? '3px solid var(--subject)' : '';
    $('#bCover').style.outline = S.bn.cover ? '3px solid var(--subject)' : '';
    $$('#rySeg button').forEach((b) => b.classList.toggle('on', !!S.tr.rays[b.dataset.v]));
    $$('#ordChips button').forEach((b) => { b.disabled = S.lt.order.indexOf(+b.dataset.v) >= 0 || S.lt.ordOK; b.classList.toggle('done', S.lt.order.indexOf(+b.dataset.v) >= 0); });
    const a2 = $('#sA2'); a2.disabled = S.bn.far; $$('.nudge[data-for="sA2"]').forEach((b) => { b.disabled = S.bn.far; });
    $('#oSc').textContent = S.bn.sx.toFixed(1) + ' cm';
    $('#ordNote').textContent = S.lt.ordOK ? '✅ 순서가 맞아요! 아래 그림에서 단계마다 웨이퍼의 단면이 어떻게 변하는지 보세요.' : S.lt.order.length ? '지금까지 ' + S.lt.order.length + '장을 골랐어요. 다음 순서의 카드를 눌러요.' : '웨이퍼에 회로를 만드는 순서대로 카드를 눌러요.';
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));

  /* ---------- 컨트롤 연결 ---------- */
  const vwSeg = bindSeg('vwSeg', (v) => { setView(v); });
  const lthSeg = bindSeg('lthSeg', (v) => { S.lt.sub = v; updateCtl(); });
  const wlSeg = bindSeg('wlSeg', (v) => { S.lt.wl = v; S.lt.expo = 0; updateCtl(); });
  const slR = bindSlider('sR', (v) => v + ' cm', (v) => { S.rf.RT = +v; });
  const slA = bindSlider('sA', (v) => v + ' cm', (v) => { setObj(+v); });
  const slA2 = bindSlider('sA2', (v) => (+v).toFixed(1) + ' cm', (v) => { S.bn.a = +v; });
  const slW = bindSlider('sW', (v) => (v / 10).toFixed(1) + ' cm', (v) => { S.lt.w = +v / 10; S.lt.expo = 0; });
  $('#bNorm').addEventListener('click', () => { Sound.click(); S.rf.norm = !S.rf.norm; updateCtl(); });
  $('#bFar').addEventListener('click', () => { Sound.click(); S.bn.far = !S.bn.far; updateCtl(); });
  $('#bCover').addEventListener('click', () => { Sound.click(); S.bn.cover = !S.bn.cover; updateCtl(); });
  $('#bScL').addEventListener('click', () => { Sound.tick(); S.bn.sx = clampSx(Math.round((S.bn.sx - 0.1) * 10) / 10); updateCtl(); });
  $('#bScR').addEventListener('click', () => { Sound.tick(); S.bn.sx = clampSx(Math.round((S.bn.sx + 0.1) * 10) / 10); updateCtl(); });
  $('#bRec').addEventListener('click', () => recordRow());
  $('#bRecClr').addEventListener('click', () => { Sound.click(); S.bn.rows = []; });
  $('#bOrdClr').addEventListener('click', () => { Sound.click(); if (!S.lt.ordOK) S.lt.order = []; updateCtl(); });
  $$('#rySeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); toggleRay(+b.dataset.v); }));
  const ordHost = $('#ordChips');
  SHUF.forEach((k) => {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.v = String(k); b.textContent = ORDER[k];
    b.addEventListener('click', () => pickOrder(k)); ordHost.appendChild(b);
  });
  const clampSx = (v) => Math.max(4, Math.min(40, v));

  /* ---------- 표 (2단계 미션) ---------- */
  const TBL_ROWS = [
    { a: 30, lab: 'a = 30 cm (2f보다 멀리)', z: 0 },
    { a: 20, lab: 'a = 20 cm (2f 위치)', z: 1 },
    { a: 15, lab: 'a = 15 cm (f와 2f 사이)', z: 2 },
    { a: 5, lab: 'a = 5 cm (f보다 가까이)', z: 3 },
  ];
  const TBL_O1 = ['실상', '허상'], TBL_O2 = ['축소 · 거꾸로', '같은 크기 · 거꾸로', '확대 · 거꾸로', '확대 · 바로'];
  const TBL = (() => {
    const host = $('#tblRows'), s1 = [], s2 = [], vals = {}, okS = {};
    TBL_ROWS.forEach((r, i) => {
      const row = document.createElement('div'); row.className = 'sel-row';
      row.innerHTML = '<div class="q">' + r.lab + '</div>';
      const two = document.createElement('div'); two.className = 'sel-2';
      [[TBL_O1, s1], [TBL_O2, s2]].forEach(([opts, arr], k) => {
        const sel = document.createElement('select'); sel.className = 'sel-in'; sel.setAttribute('aria-label', r.lab + (k ? ' 크기와 방향' : ' 상의 종류'));
        sel.innerHTML = '<option value="">— 고르기 —</option>' + opts.map((o, j) => '<option value="' + j + '">' + o + '</option>').join('');
        sel.addEventListener('change', () => { vals[i + ':' + k] = sel.value; sel.classList.remove('ok', 'bad'); delete okS[i + ':' + k]; Sound.click(); });
        two.appendChild(sel); arr.push(sel);
      });
      row.appendChild(two); host.appendChild(row);
    });
    return {
      reset() { Object.keys(vals).forEach((k) => delete vals[k]); Object.keys(okS).forEach((k) => delete okS[k]); s1.concat(s2).forEach((s) => { s.value = ''; s.classList.remove('ok', 'bad'); }); },
      count() { return Object.keys(vals).filter((k) => vals[k] !== '').length; },
      grade() {
        const miss = TBL_ROWS.length * 2 - this.count();
        if (miss) return '아직 고르지 않은 칸이 ' + miss + '개 있어요.';
        let bad = 0;
        TBL_ROWS.forEach((r, i) => {
          const ans = imgKind(r.a);
          [[s1[i], +vals[i + ':0'] === ans.k1, i + ':0'], [s2[i], +vals[i + ':1'] === ans.k2, i + ':1']].forEach(([sel, ok, key]) => {
            if (!ok) bad++;
            if (!ok && okS[key] !== false) { sel.classList.remove('ok', 'bad'); void sel.offsetWidth; sel.classList.add('bad'); }
            if (ok) { sel.classList.remove('bad'); sel.classList.add('ok'); }
            okS[key] = ok;
          });
        });
        return bad ? '빨간 칸을 다시 골라 보세요. 물체를 그 위치로 옮겨서 상을 확인해 보세요.' : true;
      },
    };
  })();

  /* ================= ① 굴절과 렌즈 (실제 굴절 광선 추적) ================= */
  const RP = PHONE ? { x: 8, y: 8, w: 464, h: 312, LX: 120, AY: 164, PXR: 11.2 } : { x: 12, y: 12, w: 776, h: 414, LX: 230, AY: 219, PXR: 24 };
  const rX = (cm) => RP.LX + cm * RP.PXR, rY = (cm) => RP.AY - cm * RP.PXR;
  const X_START = -(RP.LX - RP.x - 22) / RP.PXR;                 // 광선이 시작하는 x (cm)
  const X_END = (RP.x + RP.w - 6 - RP.LX) / RP.PXR;
  const sagOf = (R, y) => R - Math.sqrt(R * R - y * y);
  function lensPolys(R, view) {
    const a = APER * R, s = sagOf(R, a);
    const xl = (y) => -s + sagOf(R, y), xr = (y) => s - sagOf(R, y);
    const polys = [];
    if (view === 'lens') {
      const N = 48, p = [];
      for (let i = 0; i <= N; i++) { const y = -a + 2 * a * i / N; p.push([xl(y), y]); }
      for (let i = N; i >= 0; i--) { const y = -a + 2 * a * i / N; p.push([xr(y), y]); }
      polys.push(p);
    } else {
      const M = 5;
      for (let j = 0; j < M; j++) {
        const e0 = -a + 2 * a * j / M, e1 = -a + 2 * a * (j + 1) / M;
        polys.push([[xl(e0), e0], [xl(e1), e1], [xr(e1), e1], [xr(e0), e0]]);
      }
    }
    return polys;
  }
  function traceRay(y0, polys) {      // 실제 스넬 법칙으로 따라가는 광선 (모든 경계에서 굴절)
    let px = X_START, py = y0, dx = 1, dy = 0, inside = false;
    const pts = [[px, py]], hits = [];
    for (let it = 0; it < 14; it++) {
      let best = null;
      for (const poly of polys) {
        for (let i = 0; i < poly.length; i++) {
          const A = poly[i], B = poly[(i + 1) % poly.length];
          const ex = B[0] - A[0], ey = B[1] - A[1];
          const den = dx * ey - dy * ex;
          if (Math.abs(den) < 1e-12) continue;
          const t = ((A[0] - px) * ey - (A[1] - py) * ex) / den;
          const u = ((A[0] - px) * dy - (A[1] - py) * dx) / den;
          if (t > 1e-6 && u >= -1e-9 && u <= 1 + 1e-9 && (!best || t < best.t)) best = { t, nx: ey, ny: -ex };
        }
      }
      if (!best) break;
      const hx = px + dx * best.t, hy = py + dy * best.t;
      pts.push([hx, hy]);
      let nl = Math.hypot(best.nx, best.ny), nx = best.nx / nl, ny = best.ny / nl;
      if (nx * dx + ny * dy > 0) { nx = -nx; ny = -ny; }
      const ci = -(nx * dx + ny * dy), eta = inside ? N_GLASS : 1 / N_GLASS;
      const k = 1 - eta * eta * (1 - ci * ci);
      hits.push({ x: hx, y: hy, nx, ny });
      if (k < 0) { dx += 2 * ci * nx; dy += 2 * ci * ny; }
      else { const c2 = eta * ci - Math.sqrt(k); dx = eta * dx + c2 * nx; dy = eta * dy + c2 * ny; inside = !inside; }
      const dl = Math.hypot(dx, dy); dx /= dl; dy /= dl;
      px = hx + dx * 1e-5; py = hy + dy * 1e-5;
    }
    // 마지막 방향으로 오른쪽 끝(또는 위·아래 끝)까지
    let tEnd = (X_END - px) / (dx > 1e-6 ? dx : 1e-6);
    if (dy > 1e-6) tEnd = Math.min(tEnd, (RP.AY - RP.y) / RP.PXR / dy + 2); else if (dy < -1e-6) tEnd = Math.min(tEnd, (RP.y + RP.h - RP.AY) / RP.PXR / -dy + 2);
    pts.push([px + dx * Math.max(0, tEnd), py + dy * Math.max(0, tEnd)]);
    return { pts, hits, dx, dy, lastX: px, lastY: py };
  }
  function focalOf(R) {               // 축 가까이 지나는 광선이 축을 지나는 곳 = 초점거리 f (cm)
    const polys = lensPolys(R, 'lens'); let s = 0, n = 0;
    [0.05, -0.05].forEach((k) => {
      const r = traceRay(k * R, polys);
      if (Math.abs(r.dy) > 1e-9) { const t = -r.lastY / r.dy; s += r.lastX + r.dx * t; n++; }
    });
    return n ? s / n : R;
  }
  const rafCache = {};
  const fOf = (R) => { const k = Math.round(R * 20); return rafCache[k] != null ? rafCache[k] : (rafCache[k] = focalOf(k / 20)); };
  function rayHeights(R, view) {
    if (view === 'prism') { const a = APER * R; return [0, 1, 2, 3, 4].map((j) => -a + 2 * a * (j + 0.5) / 5); }
    return [-3, -2, -1, 0, 1, 2, 3].map((k) => k / 3 * RAYH * R);
  }
  function setView(v) {
    if (S.rf.view === v) return;
    S.rf.view = v; S.rf.morph = RM ? 1 : 0; Sound.click(); updateCtl();
  }
  function stepRefract(dt) {
    const r = S.rf;
    r.R = Math.abs(r.R - r.RT) < 0.02 ? r.RT : SciSim.approach(r.R, r.RT, dt, 9);
    r.morph = RM ? 1 : SciSim.approach(r.morph, 1, dt, 5); if (r.morph > 0.995) r.morph = 1;
    if (S.mode === 'refract') {
      r.hP = r.view === 'prism' ? r.hP + dt : 0; if (r.hP > 1.2) r.seenPrism = true;
      const f = fOf(r.RT), near = r.view === 'lens' && r.morph >= 1 && Math.abs(r.flag - f) <= F_TOL;
      r.hA = near && r.RT >= 10 ? r.hA + dt : 0; r.hB = near && r.RT <= 7 ? r.hB + dt : 0;
      if (r.hA > 0.5) r.foundA = true; if (r.hB > 0.5) r.foundB = true;
    }
  }
  function fillGlass(polys, alpha) {
    polys.forEach((p, i) => {
      ctx.beginPath(); p.forEach((q, k) => (k ? ctx.lineTo(rX(q[0]), rY(q[1])) : ctx.moveTo(rX(q[0]), rY(q[1])))); ctx.closePath();
      const g = ctx.createLinearGradient(0, rY(APER * 14), 0, rY(-APER * 14)); g.addColorStop(0, 'rgba(190,225,255,' + alpha + ')'); g.addColorStop(1, 'rgba(120,175,230,' + alpha + ')');
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = 'rgba(40,80,130,' + Math.min(1, alpha + 0.2) + ')'; ctx.lineWidth = polys.length > 1 ? 2 : 2.4; ctx.stroke();
    });
  }
  function drawRefract(dt) {
    const r = S.rf, R = r.R, view = r.view;
    D.shadow(() => { D.roundRect(RP.x, RP.y, RP.w, RP.h, 14); ctx.fillStyle = '#0f1a33'; ctx.fill(); }, { blur: 10, y: 3 });
    ctx.save(); D.roundRect(RP.x, RP.y, RP.w, RP.h, 14); ctx.clip();
    // 광축 + 눈금
    ctx.strokeStyle = 'rgba(190,205,235,.5)'; ctx.lineWidth = 1.4; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.moveTo(RP.x + 4, RP.AY); ctx.lineTo(RP.x + RP.w - 4, RP.AY); ctx.stroke(); ctx.setLineDash([]);
    for (let c = 0; c <= Math.floor(X_END); c++) {
      ctx.strokeStyle = 'rgba(190,205,235,.65)'; ctx.lineWidth = 1.2;
      const big = c % 5 === 0;
      ctx.beginPath(); ctx.moveTo(rX(c), RP.AY); ctx.lineTo(rX(c), RP.AY + (big ? 9 : 5)); ctx.stroke();
      if (big && c > 0) T(rX(c), RP.AY + 24, c + '', 12.5, 'rgba(210,222,245,.9)', 'center', 700);
    }
    T(RP.x + RP.w - 12, RP.y + RP.h - 12, '축 위의 눈금: 렌즈 중심에서의 거리 (cm)', 12.5, 'rgba(210,222,245,.85)', 'right', 700);
    // 렌즈
    const polysT = lensPolys(R, view), polysO = lensPolys(R, view === 'lens' ? 'prism' : 'lens');
    if (r.morph < 1) fillGlass(polysO, 0.6 * (1 - r.morph));
    fillGlass(polysT, 0.62 * (0.4 + 0.6 * r.morph));
    // 광선
    const rays = rayHeights(R, view).map((h) => traceRay(h, polysT));
    const ra = r.morph * r.morph;
    ctx.globalAlpha = ra;
    rays.forEach((tr, i) => {
      ctx.strokeStyle = '#ffd447'; ctx.lineWidth = 2.6; ctx.lineJoin = 'round'; ctx.beginPath();
      tr.pts.forEach((q, k) => (k ? ctx.lineTo(rX(q[0]), rY(q[1])) : ctx.moveTo(rX(q[0]), rY(q[1])))); ctx.stroke();
      if (!RM) {   // 빛 알갱이가 광선을 따라 움직여요
        let tot = 0; const seg = []; for (let k = 1; k < tr.pts.length; k++) { const l = Math.hypot(tr.pts[k][0] - tr.pts[k - 1][0], tr.pts[k][1] - tr.pts[k - 1][1]); seg.push(l); tot += l; }
        const sp = 3.2;
        for (let q = (S.t * 5) % sp; q < tot; q += sp) {
          let u = q, k = 0; while (k < seg.length - 1 && u > seg[k]) { u -= seg[k]; k++; }
          const f = seg[k] > 0 ? u / seg[k] : 0;
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(rX(tr.pts[k][0] + (tr.pts[k + 1][0] - tr.pts[k][0]) * f), rY(tr.pts[k][1] + (tr.pts[k + 1][1] - tr.pts[k][1]) * f), 3, 0, TAU); ctx.fill();
        }
      }
      if (r.norm && (i === (view === 'lens' ? 5 : 3))) {   // 법선 (경계에 수직인 점선)
        tr.hits.forEach((h) => {
          ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.6; ctx.setLineDash([4, 4]);
          ctx.beginPath(); ctx.moveTo(rX(h.x - h.nx * 1.4), rY(h.y - h.ny * 1.4)); ctx.lineTo(rX(h.x + h.nx * 1.4), rY(h.y + h.ny * 1.4)); ctx.stroke(); ctx.setLineDash([]);
          D.sphere(rX(h.x), rY(h.y), 3.4, '#ff7a45', { gloss: false });
        });
      }
    });
    ctx.globalAlpha = 1;
    if (r.norm) T(rX(0), rY(APER * R) - 14, '점선 = 법선 (경계에 수직인 선)', 13, '#ffffff', 'center', 800);
    // 렌즈 이름표
    T(rX(0), rY(-APER * R) + 24, view === 'prism' ? '프리즘 조각 5개를 쌓은 모양' : '볼록렌즈', 13.5, '#cfd8ee', 'center', 800);
    // 평행 광선 발사 표시
    T(RP.x + 14, RP.AY - RAYH * R * RP.PXR - 12, '평행 광선', 14, '#ffe28a', 'left', 800);
    ctx.restore();
    // 초점 표지 (깃발)
    const f = fOf(R), found = Math.abs(r.flag - f) <= F_TOL && view === 'lens';
    const fx = rX(r.flag), fy = RP.AY;
    ctx.strokeStyle = found ? '#2ee59d' : '#ff7a45'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(fx, fy + 4); ctx.lineTo(fx, fy - 56); ctx.stroke();
    ctx.fillStyle = found ? '#2ee59d' : '#ff7a45'; ctx.beginPath(); ctx.moveTo(fx, fy - 56); ctx.lineTo(fx + 34, fy - 46); ctx.lineTo(fx, fy - 36); ctx.closePath(); ctx.fill();
    T(fx + 6, fy - 40, 'F', 13, '#fff', 'left', 800);
    D.sphere(fx, fy, 5.5, found ? '#2ee59d' : '#ff7a45', { gloss: false });
    if (found || (game && game.free)) {
      if (found) D.ring(fx, fy, 16, S.t, { color: '#2ee59d', width: 2.5 });
      const sx0 = rX(0), ay = RP.AY + 62;
      D.arrow(sx0, ay, rX(f), ay, { color: '#7bdcff', width: 2.6, head: 10 });
      D.label((sx0 + rX(f)) / 2, ay + 16, '초점거리 f = ' + f.toFixed(1) + ' cm', { bg: '#1f6f9a', size: 13 });
    }
    // 아래 설명
    panel(BOT.x, RP.y + RP.h + 10, BOT.w, VH - (RP.y + RP.h + 10) - 10, 14);
    const by = RP.y + RP.h + 10, fs = PHONE ? 13 : 14.5;
    const msg = view === 'prism'
      ? '빛은 공기에서 유리로 들어갈 때 법선 쪽으로, 유리에서 공기로 나올 때는 법선에서 멀어지는 쪽으로 꺾여요(굴절). 위쪽 프리즘은 아래로, 아래쪽 프리즘은 위로 빛을 꺾어서 광선이 한 점 쪽으로 모여요. 가운데 조각은 평평해서 꺾이지 않아요.'
      : '볼록렌즈는 가운데가 두꺼워서 프리즘 조각을 촘촘히 쌓은 것과 같아요. 평행 광선이 렌즈의 양쪽 면에서 굴절해 한 점(초점 F)에 모여요. 렌즈 중심에서 초점까지의 거리가 초점거리 f예요.';
    textBlock(BOT.x + 16, by + 26, BOT.w - 32, msg, fs, '#26324a', 20, 800);
  }

  /* ================= 공통 그리기 도우미 (광학대) ================= */
  const XL_CM = (BP.x + 6 - BP.LX) / BP.PXC, XR_CM = (BP.x + BP.w - 6 - BP.LX) / BP.PXC;     // 장면의 왼쪽·오른쪽 끝 (cm)
  const cx = (cm) => xOf(cm), cy = (cm) => yOf(cm);
  function polyline(pts, color, w, dash, alpha) {
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.globalAlpha = alpha == null ? 1 : alpha; ctx.setLineDash(dash || []);
    ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(cx(q[0]), cy(q[1])) : ctx.moveTo(cx(q[0]), cy(q[1])))); ctx.stroke(); ctx.restore();
  }
  function pulsesOn(pts, color, speed, spacing) {    // 빛 알갱이가 꺾은선을 따라 움직여요
    if (RM) return;
    let tot = 0; const seg = [];
    for (let k = 1; k < pts.length; k++) { const l = Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]); seg.push(l); tot += l; }
    for (let q = (S.t * speed) % spacing; q < tot; q += spacing) {
      let u = q, k = 0; while (k < seg.length - 1 && u > seg[k]) { u -= seg[k]; k++; }
      const f = seg[k] > 0 ? u / seg[k] : 0;
      const x = pts[k][0] + (pts[k + 1][0] - pts[k][0]) * f, y = pts[k][1] + (pts[k + 1][1] - pts[k][1]) * f;
      if (cx(x) < BP.x + 4 || cx(x) > BP.x + BP.w - 4 || cy(y) < BP.y + 4 || cy(y) > BP.y + BP.h - 4) continue;
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(cx(x), cy(y), 3, 0, TAU); ctx.fill();
    }
  }
  function lensShape(xc, hPx, thick, fill) {
    ctx.beginPath(); ctx.moveTo(xc, BP.AY - hPx);
    ctx.quadraticCurveTo(xc + thick * 1.1, BP.AY, xc, BP.AY + hPx);
    ctx.quadraticCurveTo(xc - thick * 1.1, BP.AY, xc, BP.AY - hPx); ctx.closePath();
    const g = ctx.createLinearGradient(xc - thick, 0, xc + thick, 0); g.addColorStop(0, 'rgba(205,232,255,.75)'); g.addColorStop(0.5, 'rgba(150,200,245,.55)'); g.addColorStop(1, 'rgba(120,175,230,.75)');
    ctx.fillStyle = fill || g; ctx.fill(); ctx.strokeStyle = 'rgba(180,215,255,.95)'; ctx.lineWidth = 2.2; ctx.stroke();
  }
  // 화살표 모양 물체(깃발 달림) 그리기: 높이 hPx(양수), sy=+1 바로 / −1 거꾸로, sf=+1 깃발 오른쪽 / −1 왼쪽
  function objShape(x, y0, hPx, sy, sf, color, lw) {
    const h = hPx, up = -sy;     // 화면 y는 아래로 증가
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = lw || Math.max(2, h * 0.09); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y0 + up * h * 0.85); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y0 + up * h); ctx.lineTo(x - h * 0.18, y0 + up * h * 0.72); ctx.lineTo(x + h * 0.18, y0 + up * h * 0.72); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x, y0 + up * h * 0.52); ctx.lineTo(x + sf * h * 0.42, y0 + up * h * 0.42); ctx.lineTo(x, y0 + up * h * 0.32); ctx.closePath(); ctx.fill();
  }
  function blurred(px, alpha, fn) {   // 번짐(흐림) 효과: 그림자를 이용해 어느 브라우저에서나 같은 모양으로
    if (px < 0.7) { ctx.save(); ctx.globalAlpha = alpha; fn(); ctx.restore(); return; }
    const sc = view.scale * view.dpr;
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(-5000, 0);
    ctx.shadowColor = 'rgba(255,226,120,.95)'; ctx.shadowOffsetX = 5000 * sc; ctx.shadowOffsetY = 0; ctx.shadowBlur = px * sc * 1.6;
    fn(); ctx.restore();
  }

  /* ================= ② 광선 추적 ================= */
  const imgOf = (a, f) => (Math.abs(a - f) < 1e-9 ? null : { b: a * f / (a - f) });
  function imgKind(a) {      // 표의 정답: k1 0=실상 1=허상, k2 = TBL_O2의 번호
    if (a < F_TR) return { k1: 1, k2: 3 };
    if (a > 2 * F_TR + 1e-9) return { k1: 0, k2: 0 };
    if (Math.abs(a - 2 * F_TR) < 1e-9) return { k1: 0, k2: 1 };
    return { k1: 0, k2: 2 };
  }
  const zoneOf = (a) => (a > 2 * F_TR + 1e-9 ? 0 : Math.abs(a - 2 * F_TR) < 1e-9 ? 1 : a > F_TR + 1e-9 ? 2 : a < F_TR - 1e-9 ? 3 : -1);
  const aValid = (a) => Math.abs(a - F_TR) < 1e-9 || OBJ_H * F_TR / Math.abs(a - F_TR) <= LENS_HALF - 0.4;   // 광선 ③이 렌즈 안에 들어올 수 있는 거리
  function setObj(raw) {
    let a = clamp(Math.round(raw), 5, 40);
    if (!aValid(a)) a = S.tr.a === F_TR ? (raw > F_TR ? 12 : 8) : F_TR;     // 초점 가까이(9·11 cm)는 초점(10 cm)에 붙어요
    slA.set(a);
    if (a === S.tr.a) return;
    S.tr.a = a; updateTrNote();
  }
  function toggleRay(k) { S.tr.rays[k] = !S.tr.rays[k]; updateCtl(); updateTrNote(); }
  function updateTrNote() {
    const el = $('#trNote'); if (!el) return;
    el.textContent = Math.abs(S.tr.a - F_TR) < 1e-9 ? '물체가 초점(F)에 있어요. 렌즈를 지난 광선이 평행해서 만나지 않아요.' : '물체(화살표)를 끌어도 돼요. 광선들이 만나는 곳에 상이 생겨요.';
  }
  function principal(a) {     // 세 주광선의 꺾은선 (cm 좌표)
    const f = F_TR, H = OBJ_H, im = imgOf(a, f), XE = XR_CM, out = [];
    const xe = XE;
    out.push({ k: 1, color: '#ff7a45', solid: [[[-a, H], [0, H], [xe, H * (1 - xe / f)]]], dashed: im && a < f ? [[[0, H], [im.b, -H * im.b / a]]] : [] });
    out.push({ k: 2, color: '#45c0ff', solid: [[[-a, H], [0, 0], [xe, -H * xe / a]]], dashed: im && a < f ? [[[-a, H], [im.b, -H * im.b / a]]] : [] });
    if (Math.abs(a - f) > 1e-9) {
      const y3 = H * f / (f - a);
      const sol = [[[-a, H], [0, y3], [xe, y3]]], das = [];
      if (a < f) { das.push([[-f, 0], [-a, H]]); das.push([[0, y3], [im.b, y3]]); }
      out.push({ k: 3, color: '#7dff9b', solid: sol, dashed: das });
    } else out.push({ k: 3, color: '#7dff9b', solid: [], dashed: [] });
    return out;
  }
  function stepTrace(dt) {
    const t = S.tr;
    const z = zoneOf(t.a); if (z >= 0) t.visited[z] = true;
    const im = imgOf(t.a, F_TR);
    const tb = im ? im.b : 0, ty = im ? -OBJ_H * im.b / t.a : 0;
    if (!im) { t.tx = 0; t.ty = 0; }
    t.ix = t.ix == null ? tb : SciSim.approach(t.ix, tb, dt, 11);
    t.iy = t.iy == null ? ty : SciSim.approach(t.iy, ty, dt, 11);
    if (Math.abs(t.ix - tb) < 0.005) t.ix = tb; if (Math.abs(t.iy - ty) < 0.005) t.iy = ty;
  }
  function trueTip(a) { const im = imgOf(a, F_TR); return im ? { x: im.b, y: -OBJ_H * im.b / a } : null; }
  function benchFrame() {      // 어두운 광학대 배경 + 축 + 눈금
    D.shadow(() => { D.roundRect(BP.x, BP.y, BP.w, BP.h, 14); ctx.fillStyle = '#0f1a33'; ctx.fill(); }, { blur: 10, y: 3 });
    ctx.save(); D.roundRect(BP.x, BP.y, BP.w, BP.h, 14); ctx.clip();
    ctx.strokeStyle = 'rgba(190,205,235,.5)'; ctx.lineWidth = 1.4; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.moveTo(BP.x + 4, BP.AY); ctx.lineTo(BP.x + BP.w - 4, BP.AY); ctx.stroke(); ctx.setLineDash([]);
    for (let c = -Math.floor(-XL_CM / 5) * 5; c <= XR_CM; c += 5) {
      ctx.strokeStyle = 'rgba(190,205,235,.65)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(cx(c), BP.AY); ctx.lineTo(cx(c), BP.AY + (c % 10 === 0 ? 9 : 5)); ctx.stroke();
      if (c % 10 === 0 && c !== 0) T(cx(c), BP.AY + 22, Math.abs(c) + '', 12.5, 'rgba(210,222,245,.9)', 'center', 700);
    }
    T(BP.x + BP.w - 12, BP.y + BP.h - 10, '※ 세로 방향은 ' + KY + '배로 늘려 그렸어요 (거리 눈금은 실제 비율)', 12.5, 'rgba(210,222,245,.75)', 'right', 700);
    return () => ctx.restore();
  }
  function drawTrace() {
    const t = S.tr, a = t.a, f = F_TR, H = OBJ_H;
    const end = benchFrame();
    // 초점(F), 2F 표시
    [-1, 1].forEach((sg) => {
      [[1, 'F'], [2, '2F']].forEach(([k, nm]) => {
        const x = cx(sg * k * f);
        ctx.strokeStyle = '#ffd447'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, BP.AY - 7); ctx.lineTo(x, BP.AY + 7); ctx.stroke();
        D.sphere(x, BP.AY, 3.6, '#ffd447', { gloss: false });
        T(x, BP.AY - 14, nm, 13.5, '#ffe28a', 'center', 800);
      });
    });
    // 렌즈(주평면)
    ctx.strokeStyle = 'rgba(150,185,235,.45)'; ctx.lineWidth = 1.2; ctx.setLineDash([5, 6]); ctx.beginPath(); ctx.moveTo(cx(0), BP.y + 4); ctx.lineTo(cx(0), BP.y + BP.h - 4); ctx.stroke(); ctx.setLineDash([]);
    lensShape(cx(0), LENS_HALF * PYC, 9);
    T(cx(0), BP.AY + LENS_HALF * PYC - 6, '볼록렌즈 (광선은 가운데 면에서 꺾어 그려요)', 12.5, '#cfd8ee', 'center', 700);
    // 광선
    const pr = principal(a);
    pr.forEach((r) => {
      if (!t.rays[r.k]) return;
      r.solid.forEach((p) => { polyline(p, r.color, 2.6, null, 0.95); pulsesOn(p, '#fff', 6, 5); });
      r.dashed.forEach((p) => polyline(p, r.color, 2.2, [6, 6], 0.8));
    });
    // 물체 (램프로 비추는 화살표)
    const ox = cx(-a);
    D.glow(ox, cy(H / 2), 36, '#ffe9a0', 0.4);
    objShape(ox, BP.AY, H * PYC, 1, 1, '#ffd447');
    T(ox, BP.AY + 22, '물체', 13, '#ffe28a', 'center', 800);
    // 상
    const im = imgOf(a, f), tip = trueTip(a);
    const showImg = t.showImg === true || t.found;
    if (im && showImg && Math.abs(t.ix) < 160) {
      const real = a > f, ix = cx(t.ix), ih = Math.abs(t.iy) * PYC;
      if (cx(t.ix) > BP.x + 8 && cx(t.ix) < BP.x + BP.w - 8) {
        ctx.save(); if (!real) ctx.setLineDash([5, 4]);
        objShape(ix, BP.AY, ih, real ? -1 : 1, real ? -1 : 1, real ? '#5ef2c6' : 'rgba(150,255,230,.8)');
        ctx.restore();
        D.label(ix, real ? BP.AY + ih + 22 : BP.AY - ih - 18, real ? '실상' : '허상', { bg: real ? '#14a058' : '#7c5cff', size: 13 });
      } else {
        D.label(real ? BP.x + BP.w - 70 : BP.x + 70, BP.AY - 56, real ? '상이 화면 밖 (아주 멀리)' : '허상이 화면 밖', { bg: '#7c5cff', size: 13 });
      }
    } else if (!im && showImg) {
      D.label(cx(f * 1.55), BP.AY - 56, '상이 맺히지 않아요', { bg: '#e2464b', size: 14 });
    }
    // 상 끝점 찾기 손잡이 (1번 미션)
    if (t.handleOn && !t.found) {
      const hx = cx(t.handle.x), hy = cy(t.handle.y);
      D.ring(hx, hy, 14, S.t, { color: '#ffb400', width: 3 });
      D.sphere(hx, hy, 9, '#ffb400', { shadow: true });
      T(hx, hy - 20, '상의 끝점은 어디?', 13, '#ffe28a', 'center', 800);
    }
    end();
    // 설명 칸
    const by = BOT.y, bh = BOT.h;
    panel(BOT.x, by, BOT.w, bh, 14);
    const fs = PHONE ? 13 : 14.5, tx = BOT.x + 16;
    T(tx, by + 26, '물체 거리 a = ' + a + ' cm  (f = ' + f.toFixed(0) + ' cm, 2f = ' + (2 * f).toFixed(0) + ' cm)', fs, '#26324a', 'left', 800);
    if (!im) textBlock(tx, by + 52, BOT.w - 32, '물체가 초점에 있으면 렌즈를 지난 광선들이 서로 평행해서 한 점에서 만나지 않아요. 그래서 상이 맺히지 않아요.', fs, '#e2464b', 20, 800);
    else if (showImg) {
      const real = a > f, b = Math.abs(im.b), m = b / a;
      T(tx, by + 52, real ? '작도로 찾은 상: 렌즈 오른쪽 ' + b.toFixed(1) + ' cm, 물체의 ' + m.toFixed(2) + '배, 거꾸로 선 실상' : '작도로 찾은 상: 렌즈 왼쪽 ' + b.toFixed(1) + ' cm, 물체의 ' + m.toFixed(2) + '배, 바로 선 허상', fs, real ? '#14a058' : '#7c5cff', 'left', 800);
      textBlock(tx, by + 78, BOT.w - 32, real ? '굴절한 광선이 실제로 만나는 곳이라 스크린에 맺혀요.' : '굴절한 광선이 퍼져서 만나지 않아요. 렌즈 안쪽으로 연장한 점선이 만나는 곳에 허상이 보여요.', PHONE ? 12.5 : 13.5, '#5d6879', 19, 700);
    } else textBlock(tx, by + 52, BOT.w - 32, '세 주광선: ① 광축에 평행하게 들어가면 렌즈를 지나 초점을 지나요 ② 렌즈 중심을 지나면 그대로 직진해요 ③ 앞쪽 초점을 지나 들어가면 렌즈를 지나 광축에 평행해져요.', PHONE ? 12.5 : 13.5, '#5d6879', 19, 700);
  }

  /* ================= ③ ④ 광학대 (상 실험 · 노광 장치) ================= */
  const benchGeom = (a, f, far, H) => {
    if (far) return { b: f, yi: 0, m: 0 };
    const b = a * f / (a - f); return { b, yi: -H * b / a, m: b / a };
  };
  function drawBlurSpot(x, y, lenPx) {
    ctx.fillStyle = 'rgba(255,240,170,.95)'; D.roundRect(x - 3, y - lenPx / 2 - 1.5, 6, lenPx + 3, 3); ctx.fill();
  }
  function benchScene(cfg) {   // cfg: {f, a, far, cover, sx, H, litho}
    const f = cfg.f, H = cfg.H, g = benchGeom(cfg.a, f, cfg.far, H);
    const Dm = BEN_D, dEff = cfg.cover ? Dm / 2 : Dm;
    const yTop = Dm / 2, yBot = cfg.cover ? 0 : -Dm / 2;
    const end = benchFrame();
    // 렌즈 + 조리개 판
    const lh = 6.3 * PYC;
    lensShape(cx(0), lh, 8);
    ctx.fillStyle = '#3a4560'; ctx.fillRect(cx(0) - 4, BP.AY - lh - 3, 8, lh - yTop * PYC + 3); ctx.fillRect(cx(0) - 4, BP.AY + yTop * PYC, 8, lh - yTop * PYC + 3);
    T(cx(0), BP.AY - lh - 10, cfg.litho ? '축소 투영 렌즈' : '볼록렌즈', 13, '#cfd8ee', 'center', 800);
    // 빛의 길 (물체 → 렌즈 → 스크린)
    const xs = cfg.sx, col = cfg.litho ? '#9fd0ff' : '#ffe9a0';
    const topL = [0, yTop], botL = [0, yBot];
    const tipObj = cfg.far ? null : [-cfg.a, H];
    const lineTo = (L, x) => [x, L[1] + (g.yi - L[1]) * x / g.b];
    // 렌즈 왼쪽: 원뿔 (물체 끝점 → 렌즈 구경) 또는 평행 광선 띠
    ctx.save();
    ctx.beginPath(); ctx.rect(BP.x + 2, BP.y + 2, BP.w - 4, BP.h - 4); ctx.clip();
    ctx.fillStyle = C.rgba(col, 0.16);
    ctx.beginPath();
    if (cfg.far) { ctx.moveTo(cx(XL_CM), cy(yTop)); ctx.lineTo(cx(0), cy(yTop)); ctx.lineTo(cx(0), cy(yBot)); ctx.lineTo(cx(XL_CM), cy(yBot)); }
    else { ctx.moveTo(cx(tipObj[0]), cy(tipObj[1])); ctx.lineTo(cx(0), cy(topL[1])); ctx.lineTo(cx(0), cy(botL[1])); }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.rgba(col, 0.2); ctx.beginPath();
    const pt = lineTo(topL, xs), pb = lineTo(botL, xs);
    ctx.moveTo(cx(0), cy(topL[1])); ctx.lineTo(cx(xs), cy(pt[1])); ctx.lineTo(cx(xs), cy(pb[1])); ctx.lineTo(cx(0), cy(botL[1])); ctx.closePath(); ctx.fill();
    const edge = (p, q) => polyline([p, q], col, 2.2, null, 0.9);
    if (cfg.far) { edge([XL_CM, yTop], [0, yTop]); edge([XL_CM, yBot], [0, yBot]); } else { edge(tipObj, topL); edge(tipObj, botL); }
    edge(topL, [xs, pt[1]]); edge(botL, [xs, pb[1]]);
    if (cfg.far) { for (let k = 0; k < 3; k++) { const yy = yBot + (yTop - yBot) * (k + 0.5) / 3; pulsesOn([[XL_CM, yy], [0, yy], lineTo([0, yy], xs)], '#fff', 8, 6); } }
    else pulsesOn([tipObj, [0, (yTop + yBot) / 2], lineTo([0, (yTop + yBot) / 2], xs)], '#fff', 8, 6);
    ctx.restore();
    // 카드로 가리기
    if (cfg.cover) {
      D.shadow(() => { ctx.fillStyle = '#d9a35a'; D.roundRect(cx(0) - 10, BP.AY + 2, 20, lh + 6, 3); ctx.fill(); }, { blur: 6, y: 2 });
      T(cx(0) + 18, BP.AY + lh * 0.55, '카드', 13, '#ffe0a8', 'left', 800);
    }
    // 스크린 / 웨이퍼 판
    const sxp = cx(xs);
    D.shadow(() => { ctx.fillStyle = cfg.litho ? '#8791a5' : '#e8edf6'; D.roundRect(sxp - 2, BP.AY - 9 * PYC, 9, 18 * PYC, 3); ctx.fill(); }, { blur: 8, y: 2, color: 'rgba(0,0,0,.5)' });
    const blur = dEff * Math.abs(xs - g.b) / g.b;
    // 번짐 점 (스크린에 닿는 빛 묶음의 크기)
    const yc0 = (pt[1] + pb[1]) / 2;
    drawBlurSpot(sxp - 2, cy(yc0), Math.abs(pt[1] - pb[1]) * PYC);
    // 초점 부근 표시
    return { end, blur, g, sharp: blur <= BLUR_OK, dEff, sxp };
  }
  function drawObjectBench(cfg) {
    const ox = cx(-cfg.a);
    if (cfg.far) {
      const x0 = BP.x + 16;
      D.shadow(() => { ctx.fillStyle = '#7ec4ff'; D.roundRect(x0, BP.AY - 44, 54, 88, 6); ctx.fill(); }, { blur: 6, y: 2 });
      ctx.fillStyle = '#4caf6a'; ctx.beginPath(); ctx.moveTo(x0, BP.AY + 44); ctx.lineTo(x0 + 18, BP.AY + 4); ctx.lineTo(x0 + 34, BP.AY + 30); ctx.lineTo(x0 + 44, BP.AY + 14); ctx.lineTo(x0 + 54, BP.AY + 44); ctx.closePath(); ctx.fill();
      D.sphere(x0 + 38, BP.AY - 26, 8, '#ffd447', { gloss: false });
      T(x0 + 27, BP.AY + 64, '먼 풍경', 13, '#cfd8ee', 'center', 800); T(x0 + 27, BP.AY + 80, 'a ≈ ∞', 13, '#cfd8ee', 'center', 700);
      return;
    }
    if (cfg.litho) {   // 마스크: 회로가 그려진 투명판
      D.glow(ox - 26, BP.AY, 60, '#9fd0ff', 0.35);
      ctx.fillStyle = 'rgba(40,52,84,.9)'; ctx.fillRect(ox - 3, BP.AY - cfg.H * PYC, 8, cfg.H * 2 * PYC);
      for (let k = -2; k <= 2; k++) { ctx.fillStyle = '#c8e4ff'; ctx.fillRect(ox - 3, BP.AY + (k * 0.38 - 0.1) * cfg.H * PYC, 8, 0.2 * cfg.H * PYC); }
      T(ox, BP.AY + cfg.H * PYC + 20, '마스크', 13, '#cfd8ee', 'center', 800);
      T(ox - 18, BP.AY - cfg.H * PYC - 10, '광원 →', 13, '#9fd0ff', 'center', 800);
      return;
    }
    D.glow(ox - 18, BP.AY - cfg.H * PYC / 2, 40, '#ffe9a0', 0.4);
    D.roundRect(ox - 34, BP.AY - 14, 20, 28, 5); ctx.fillStyle = '#6a7488'; ctx.fill();
    objShape(ox, BP.AY, cfg.H * PYC, 1, 1, '#ffd447');
    T(ox, BP.AY - cfg.H * PYC - 12, '물체(램프)', 13, '#ffe28a', 'center', 800);
  }
  function dimLine(x1, x2, y, label, color) {
    ctx.strokeStyle = color; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.moveTo(x1, y - 5); ctx.lineTo(x1, y + 5); ctx.moveTo(x2, y - 5); ctx.lineTo(x2, y + 5); ctx.stroke();
    D.label((x1 + x2) / 2, y + 17, label, { bg: color, size: 13, color: '#0f1a33' });
  }
  function drawInsets(cfg, res) {
    const w = PHONE ? 86 : 118, h = PHONE ? 100 : 132, y = BP.y + 12;
    const xa = BP.x + 12, xb = BP.x + BP.w - w - 12;
    [[xa, '물체의 모양'], [xb, cfg.litho ? '웨이퍼 위의 상' : '스크린에 맺힌 상']].forEach(([x, nm]) => {
      ctx.fillStyle = 'rgba(8,14,32,.88)'; D.roundRect(x, y, w, h, 10); ctx.fill(); ctx.strokeStyle = 'rgba(160,185,235,.5)'; ctx.lineWidth = 1.4; ctx.stroke();
      T(x + w / 2, y + 16, nm, PHONE ? 11.5 : 12.5, '#cfd8ee', 'center', 800);
    });
    const mH = cfg.far ? 0.6 * cfg.H : cfg.H * res.g.m;                               // 상의 높이 (cm)
    const k = Math.min(PHONE ? 16 : 28, (h - 40) / Math.max(cfg.H, mH));              // 두 그림에 같은 눈금을 써서 크기를 비교할 수 있어요
    const bl = res.blur * k, al = (cfg.cover ? 0.5 : 1) * clamp(1 - res.blur * 0.25, 0.35, 1);
    const ax = xa + w / 2, bx = xb + w / 2, top = y + 28;
    if (!cfg.far) objShape(ax, top + cfg.H * k + 6, cfg.H * k, 1, 1, '#ffd447');
    else { ctx.fillStyle = '#7ec4ff'; ctx.fillRect(ax - 22, top, 44, h - 36); ctx.fillStyle = '#4caf6a'; ctx.beginPath(); ctx.moveTo(ax - 22, top + h - 36); ctx.lineTo(ax - 8, top + h - 62); ctx.lineTo(ax + 4, top + h - 48); ctx.lineTo(ax + 12, top + h - 56); ctx.lineTo(ax + 22, top + h - 36); ctx.closePath(); ctx.fill(); }
    ctx.save(); ctx.beginPath(); ctx.rect(xb + 2, y + 24, w - 4, h - 28); ctx.clip();
    if (cfg.far) blurred(bl, al, () => { const hh = 0.6 * cfg.H * k; ctx.fillStyle = '#e8c870'; ctx.fillRect(bx - hh * 0.4, top + 6 + hh * 0.35, hh * 0.8, hh * 0.65); ctx.beginPath(); ctx.moveTo(bx - hh * 0.4, top + 6 + hh * 0.35); ctx.lineTo(bx + hh * 0.4, top + 6 + hh * 0.35); ctx.lineTo(bx, top + 6); ctx.closePath(); ctx.fill(); });
    else blurred(bl, al, () => objShape(bx, top + 6, mH * k, -1, -1, '#ffe9a0'));
    ctx.restore();
    if (!cfg.far) T(xb + w / 2, y + h + 16, '크기: 물체의 ' + res.g.m.toFixed(2) + '배', 12.5, '#cfd8ee', 'center', 800);
    else T(xb + w / 2, y + h + 16, '아주 작은 거꾸로 상', 12.5, '#cfd8ee', 'center', 800);
  }

  function benchCfg() { return { f: F_BENCH, a: S.bn.far ? 1e6 : S.bn.a, far: S.bn.far, cover: S.bn.cover, sx: S.bn.sx, H: OBJ_H, litho: false }; }
  function benchState() {
    const cfg = benchCfg(), g = benchGeom(cfg.a, cfg.f, cfg.far, cfg.H);
    const blur = (cfg.cover ? BEN_D / 2 : BEN_D) * Math.abs(cfg.sx - g.b) / g.b;
    return { cfg, g, blur, sharp: blur <= BLUR_OK };
  }
  function recordRow() {
    const st = benchState();
    if (S.mode !== 'bench') return;
    if (!st.sharp) { SciSim.toast('스크린을 움직여 상이 선명해졌을 때 기록해요.', 'bad'); Sound.fail(); return; }
    if (S.bn.rows.length >= 7) S.bn.rows.shift();
    const row = { a: S.bn.far ? null : S.bn.a, b: Math.round(S.bn.sx * 10) / 10, m: S.bn.far ? null : Math.round(st.g.m * 100) / 100 };
    const i = S.bn.rows.findIndex((r) => (r.a == null && row.a == null) || (r.a != null && row.a != null && Math.abs(r.a - row.a) < 0.5));
    if (i >= 0) S.bn.rows[i] = row; else S.bn.rows.push(row);
    Sound.success();
    parts.burst(cx(S.bn.sx), BP.AY, { count: 10, speed: 110, size: 3, colors: ['#ffe28a', '#7dff9b', '#7bdcff'], gravity: 90 });
  }
  function drawBench() {
    const cfg = benchCfg();
    const res = benchScene(cfg);
    drawObjectBench(cfg);
    // 거리 표시선
    if (!cfg.far) dimLine(cx(-cfg.a), cx(0), BP.AY + 44, 'a = ' + cfg.a.toFixed(1) + ' cm', '#ffd447');
    dimLine(cx(0), cx(cfg.sx), BP.AY + 74, 'b = ' + cfg.sx.toFixed(1) + ' cm', '#7bdcff');
    res.end();
    // 스크린 손잡이 표시
    T(res.sxp + 2, BP.AY - 9 * PYC - 8, '스크린', 13, '#cfd8ee', 'center', 800);
    if (res.sharp) D.label(res.sxp + 2, BP.AY - 9 * PYC - 30, '선명해요!', { bg: '#14a058', size: 13 });
    drawInsets(cfg, res);
    drawBenchBottom(res);
  }
  function drawBenchBottom(res) {
    const by = BOT.y, fs = PHONE ? 12.5 : 13.5;
    panel(BOT.x, by, BOT.w, BOT.h, 14);
    const x0 = BOT.x + 14, tw = BOT.w - 28;
    const heads = ['물체 거리 a (cm)', '스크린 거리 b (cm)', '상의 크기 (물체 = 1)'];
    const cols = [0, 0.34, 0.68];
    heads.forEach((s, i) => T(x0 + tw * cols[i], by + 20, s, fs, '#5d6879', 'left', 800));
    ctx.strokeStyle = '#dde4ef'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0, by + 27); ctx.lineTo(x0 + tw, by + 27); ctx.stroke();
    const rh = PHONE ? 24 : 17, maxR = Math.floor((BOT.h - 34) / rh);
    const rows = S.bn.rows.slice(-maxR);
    if (!rows.length) T(x0, by + 27 + rh, '아직 기록이 없어요. 상이 선명할 때 📏 기록하기를 눌러요.', fs, '#8a95a8', 'left', 700);
    rows.forEach((r, i) => {
      const yy = by + 27 + (i + 1) * rh - 2;
      [r.a == null ? '∞ (먼 풍경)' : r.a.toFixed(1), r.b.toFixed(1), r.m == null ? '—' : r.m.toFixed(2)].forEach((s, k) => T(x0 + tw * cols[k], yy, s, fs, '#26324a', 'left', 800));
    });
  }

  /* ---- 노광 장치 ---- */
  const wlVal = () => +S.lt.wl;
  const printable = (w) => w >= wlVal();
  function stepLitho(dt) {
    const l = S.lt;
    const g = benchGeom(A_LITHO, F_LITHO, false, 6);
    const blur = BEN_D * Math.abs(l.w - g.b) / g.b;
    l.sharp = blur <= BLUR_OK; l.blur = blur;
    if (S.mode === 'litho' && l.sub === 'proj') { l.expo = l.sharp ? Math.min(1, l.expo + dt / 1.4) : Math.max(0, l.expo - dt * 2.5); }
    l.done = l.sharp && l.expo >= 1 && LITHO_W.every((w) => printable(w));
    l.okSharp = l.sharp && l.expo >= 1;
    if (l.sub === 'flow' && l.ordOK) l.ordPlay = Math.min(6.5, l.ordPlay + dt * 0.9);
  }
  function drawLitho(dt) {
    if (S.lt.sub === 'flow') { drawFlow(); return; }
    const l = S.lt, H = 6;
    const cfg = { f: F_LITHO, a: A_LITHO, far: false, cover: false, sx: l.w, H, litho: true };
    const res = benchScene(cfg);
    drawObjectBench(cfg);
    dimLine(cx(-A_LITHO), cx(0), BP.AY + 44, 'a = ' + A_LITHO.toFixed(0) + ' cm', '#ffd447');
    dimLine(cx(0), cx(l.w), BP.AY + 74, 'b = ' + l.w.toFixed(1) + ' cm', '#7bdcff');
    res.end();
    T(res.sxp + 2, BP.AY - 9 * PYC - 8, '웨이퍼', 13, '#cfd8ee', 'center', 800);
    if (res.sharp) D.label(res.sxp + 2, BP.AY - 9 * PYC - 30, '초점이 맞아요!', { bg: '#14a058', size: 13 });
    // 웨이퍼 확대 그림
    const w = PHONE ? 196 : 270, h = PHONE ? 190 : 214, x = BP.x + BP.w - w - 10, y = BP.y + 10;
    ctx.fillStyle = 'rgba(8,14,32,.92)'; D.roundRect(x, y, w, h, 10); ctx.fill(); ctx.strokeStyle = 'rgba(160,185,235,.5)'; ctx.lineWidth = 1.4; ctx.stroke();
    T(x + w / 2, y + 18, '웨이퍼 위에 인쇄된 선 (확대)', PHONE ? 11.5 : 12.5, '#cfd8ee', 'center', 800);
    const rh = (h - 36) / LITHO_W.length;
    LITHO_W.forEach((wd, i) => {
      const yy = y + 28 + i * rh + rh / 2, ok = printable(wd) && l.sharp && l.expo >= 1, tried = l.sharp;
      T(x + 10, yy + 4, wd + ' nm', PHONE ? 11.5 : 12.5, '#cfd8ee', 'left', 800);
      const lw = 2 + 2.2 * Math.log10(wd);
      const draw = () => { ctx.fillStyle = '#9fe8ff'; for (let k = 0; k < 4; k++) ctx.fillRect(x + (PHONE ? 66 : 84) + k * (lw * 2 + 8), yy - rh * 0.33, lw, rh * 0.66); };
      if (printable(wd) && l.sharp) { ctx.globalAlpha = l.expo; draw(); ctx.globalAlpha = 1; } else { blurred(6, l.sharp ? 0.15 + 0.35 * l.expo : 0.3, draw); }
      const stx = x + w - (PHONE ? 54 : 70);
      if (l.sharp && l.expo >= 1) { T(stx, yy + 4, ok ? '✓ 인쇄' : '✗ 번짐', PHONE ? 11.5 : 12.5, ok ? '#5ef2c6' : '#ff8a8a', 'left', 800); }
    });
    // 아래 설명
    const by = BOT.y; panel(BOT.x, by, BOT.w, BOT.h, 14);
    const fs = PHONE ? 13 : 14.5, tx = BOT.x + 16;
    const g = res.g;
    T(tx, by + 24, '쓰는 빛: ' + WL_NAME[l.wl] + ' → 이 모형에서는 ' + l.wl + ' nm보다 가는 선은 인쇄할 수 없어요', fs, '#26324a', 'left', 800);
    T(tx, by + 50, '마스크의 회로는 ' + (1 / g.m).toFixed(0) + '배 크게 그려져 있고, 렌즈가 ' + (1 / g.m).toFixed(0) + '분의 1로 줄여서 웨이퍼에 맺어요 (상 크기 = 마스크의 ' + g.m.toFixed(2) + '배).', PHONE ? 12 : 13.5, '#5d6879', 'left', 700);
    T(tx, by + 76, l.sharp ? (l.done ? '가장 가는 선(14 nm)까지 모두 인쇄됐어요!' : '선명해요. 더 가는 선을 찍으려면 더 짧은 파장을 써요.') : '웨이퍼가 상이 맺히는 곳에서 벗어나 있어요. 위치를 조절해 보세요.', fs, l.done ? '#14a058' : '#26324a', 'left', 800);
  }

  /* ---- 공정 순서 ---- */
  function pickOrder(k) {
    const l = S.lt;
    if (l.ordOK || l.order.indexOf(k) >= 0) return;
    Sound.click();
    l.order.push(k);
    if (l.order.length === ORDER.length) {
      if (l.order.every((v, i) => v === i)) { l.ordOK = true; l.ordPlay = 0; Sound.success(); }
      else { SciSim.toast('순서가 달라요. 감광제를 바르고 빛을 쪼이고 씻어내는 흐름을 떠올려 보세요.', 'bad'); Sound.fail(); setTimeout(() => { if (!S.lt.ordOK) { S.lt.order = []; updateCtl(); } }, 900); }
    }
    updateCtl();
  }
  function wafer(x, y, w, stage, alpha) {   // 웨이퍼 단면: stage 0~5
    const hs = 30, ho = 12, hr = 20;
    const base = y + hs + ho + hr;     // 맨 아래
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.fillStyle = '#8a95a8'; ctx.fillRect(x, base - hs, w, hs);                        // 실리콘
    const gaps = [[0.22, 0.38], [0.62, 0.78]];                                          // 회로가 생길 틈 (비율)
    // 산화막
    const oxy = base - hs - ho;
    ctx.fillStyle = '#6aa8e8';
    if (stage >= 4) { let px = x; gaps.forEach(([a, b]) => { ctx.fillRect(px, oxy, x + w * a - px, ho); px = x + w * b; }); ctx.fillRect(px, oxy, x + w - px, ho); }
    else ctx.fillRect(x, oxy, w, ho);
    // 감광제
    const ry = oxy - hr;
    if (stage >= 1 && stage <= 4) {
      ctx.fillStyle = '#f06292';
      if (stage >= 3) { let px = x; gaps.forEach(([a, b]) => { ctx.fillRect(px, ry, x + w * a - px, hr); px = x + w * b; }); ctx.fillRect(px, ry, x + w - px, hr); }
      else ctx.fillRect(x, ry, w, hr);
      if (stage === 2) { ctx.fillStyle = '#ffe28a'; gaps.forEach(([a, b]) => ctx.fillRect(x + w * a, ry, w * (b - a), hr)); }
    }
    if (stage === 2) {   // 마스크와 빛
      const my = ry - 34; ctx.fillStyle = '#4b5878';
      let px = x; gaps.forEach(([a, b]) => { ctx.fillRect(px, my, x + w * a - px, 6); px = x + w * b; }); ctx.fillRect(px, my, x + w - px, 6);
      gaps.forEach(([a, b]) => { for (let k = 0; k < 2; k++) { const ax = x + w * (a + (b - a) * (k + 0.5) / 2); D.arrow(ax, my - 22, ax, ry - 2, { color: '#7bdcff', width: 2.4, head: 8 }); } });
      T(x + w / 2, my - 28, '마스크 + 빛', 12.5, '#cfd8ee', 'center', 800);
    }
    if (stage === 0) { ctx.fillStyle = 'rgba(255,255,255,.5)'; for (let k = 0; k < 4; k++) ctx.fillRect(x + w * (0.12 + k * 0.25), oxy + 2, 8, 3); }
    ctx.restore();
  }
  const STAGE_TXT = ['웨이퍼 세척: 먼지와 기름을 씻어 내요.', '감광제 도포: 빛에 반응하는 막을 얇게 발라요.', '노광: 마스크를 통과한 빛이 감광제의 일부를 바꿔요.', '현상: 빛을 받은 부분의 감광제가 녹아 없어져요.', '식각: 드러난 산화막을 깎아 내요.', '감광제 제거: 남은 감광제를 씻어 내면 회로 무늬가 남아요.'];
  function drawFlow() {
    const l = S.lt;
    panel(BP.x, BP.y, BP.w, BP.h, 14);
    const cols = PHONE ? 2 : 3, rows = PHONE ? 3 : 2, gw = (BP.w - 16) / cols, gh = (BP.h - 16) / rows;
    for (let i = 0; i < 6; i++) {
      const c = i % cols, r = Math.floor(i / cols), x = BP.x + 8 + c * gw, y = BP.y + 8 + r * gh;
      ctx.fillStyle = '#f5f8fd'; D.roundRect(x + 4, y + 4, gw - 8, gh - 8, 10); ctx.fill();
      const picked = l.order[i];
      D.sphere(x + 20, y + 22, 11, l.ordOK ? '#14a058' : picked != null ? '#3867f4' : '#b9c3d6', { gloss: false }); T(x + 20, y + 27, String(i + 1), 13, '#fff', 'center', 800);
      if (l.ordOK) {
        const k = clamp(l.ordPlay - i * 0.5, 0, 1), ez = SciSim.ease.outCubic(k);
        T(x + 40, y + 27, ORDER[i], PHONE ? 13 : 14.5, '#26324a', 'left', 800, { alpha: ez });
        wafer(x + gw * 0.12, y + gh * (PHONE ? 0.36 : 0.38), gw * 0.76, i, ez);
        if (k > 0.3 && !PHONE) textBlock(x + 14, y + gh - 36, gw - 28, STAGE_TXT[i].replace(/^[^:]+: /, ''), 12.5, '#5d6879', 15, 700);
      } else if (picked != null) {
        T(x + 40, y + 27, ORDER[picked], PHONE ? 13 : 14.5, '#26324a', 'left', 800);
        T(x + gw / 2, y + gh / 2 + 10, '?', 44, '#c3cbdb', 'center', 800);
      } else T(x + gw / 2, y + gh / 2 + 10, (i + 1) + '번째', PHONE ? 15 : 18, '#c3cbdb', 'center', 800);
    }
    const by = BOT.y; if (!PHONE) { panel(BOT.x, by, BOT.w, BOT.h, 14); textBlock(BOT.x + 16, by + 28, BOT.w - 32, l.ordOK ? '노광에서 마스크의 큰 회로 무늬를 투영 렌즈로 줄여 감광제에 맺고, 현상·식각을 거치면 웨이퍼 위에 아주 작은 회로가 만들어져요. 이 과정을 층마다 반복해 반도체를 만들어요. 디스플레이의 박막 회로도 같은 방식으로 만들어요.' : '오른쪽 카드를 순서대로 눌러 보세요. 맞게 고르면 단계마다 웨이퍼 단면이 어떻게 바뀌는지 보여 줘요.', 14.5, '#26324a', 21, 800); }
    else { panel(BOT.x, BOT.y, BOT.w, 120, 14); textBlock(BOT.x + 14, BOT.y + 26, BOT.w - 28, l.ordOK ? STAGE_TXT.map((s, i) => (i + 1) + '. ' + s).join('\n') : '카드를 순서대로 눌러 보세요.', 12.5, '#26324a', 19, 800); }
  }

  /* ================= 포인터 ================= */
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'refract') {
        const fx = rX(S.rf.flag);
        if (Math.abs(p.x - fx) < 34 && p.y > RP.AY - 70 && p.y < RP.AY + 16) { S.rf.drag = true; Sound.click(); return true; }
      } else if (S.mode === 'trace') {
        const t = S.tr;
        if (t.handleOn && !t.found && Math.hypot(p.x - cx(t.handle.x), p.y - cy(t.handle.y)) < 28) { t.hDrag = true; Sound.click(); return true; }
        if (Math.abs(p.x - cx(-t.a)) < 26 && p.y > BP.AY - OBJ_H * PYC - 16 && p.y < BP.AY + 20) { t.odrag = true; Sound.click(); return true; }
      } else if (S.mode === 'bench') {
        const b = S.bn;
        if (Math.abs(p.x - cx(b.sx)) < 18 && Math.abs(p.y - BP.AY) < 9 * PYC + 8) { b.drag = 'scr'; Sound.click(); return true; }
        if (!b.far && Math.abs(p.x - cx(-b.a)) < 28 && Math.abs(p.y - BP.AY) < 44) { b.drag = 'obj'; Sound.click(); return true; }
      } else if (S.mode === 'litho' && S.lt.sub === 'proj') {
        if (Math.abs(p.x - cx(S.lt.w)) < 20 && Math.abs(p.y - BP.AY) < 9 * PYC + 8) { S.lt.wdrag = true; Sound.click(); return true; }
      }
      return false;
    },
    move(p) {
      if (S.rf.drag) { S.rf.flag = clamp(Math.round((p.x - RP.LX) / RP.PXR * 10) / 10, 1.5, X_END - 0.5); }
      else if (S.tr.hDrag) { S.tr.handle = { x: clamp((p.x - BP.LX) / BP.PXC, 1.5, XR_CM - 1), y: clamp((BP.AY - p.y) / PYC, -40, 40) }; }
      else if (S.tr.odrag) { setObj(clamp((BP.LX - p.x) / BP.PXC, 5, 40)); }
      else if (S.bn.drag === 'scr') { S.bn.sx = clampSx(Math.round((p.x - BP.LX) / BP.PXC * 10) / 10); updateCtl(); }
      else if (S.bn.drag === 'obj') { const a = clamp(Math.round((BP.LX - p.x) / BP.PXC * 2) / 2, 14, 40); S.bn.a = a; slA2.set(a); }
      else if (S.lt.wdrag) { const w = clamp(Math.round((p.x - BP.LX) / BP.PXC * 10) / 10, 4, 24); if (w !== S.lt.w) { S.lt.w = w; S.lt.expo = 0; slW.set(Math.round(w * 10)); } }
    },
    up() {
      if (S.tr.hDrag) {
        S.tr.hDrag = false;
        const t = S.tr, tip = trueTip(t.a);
        if (tip && Math.hypot(t.handle.x - tip.x, t.handle.y - tip.y) <= 1.9) {
          if (t.rays[1] && t.rays[2] && t.rays[3] && t.a === 30) {
            t.found = true; t.handle = { x: tip.x, y: tip.y }; Sound.success();
            parts.burst(cx(tip.x), cy(tip.y), { count: 18, speed: 150, size: 3.5 }); updateTrNote();
          } else showHint('세 광선을 모두 그린 뒤 광선이 만나는 곳에 놓아요. (물체 거리는 a = 30 cm)', 3200);
        }
      }
      S.rf.drag = false; S.tr.odrag = false; S.bn.drag = null; S.lt.wdrag = false;
    },
    hover(p) {
      if (S.mode === 'refract' && Math.abs(p.x - rX(S.rf.flag)) < 34 && p.y > RP.AY - 70 && p.y < RP.AY + 16) return 'grab';
      if (S.mode === 'trace' && Math.abs(p.x - cx(-S.tr.a)) < 26 && Math.abs(p.y - BP.AY) < 40) return 'grab';
      if (S.mode === 'bench' && Math.abs(p.x - cx(S.bn.sx)) < 18 && Math.abs(p.y - BP.AY) < 9 * PYC) return 'ew-resize';
      return 'default';
    },
  });

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  function readouts() {
    let a, b, c, L1, L2, L3;
    if (S.mode === 'refract') {
      const f = fOf(S.rf.RT), found = (game && game.free) || (S.rf.view === 'lens' && Math.abs(S.rf.flag - f) <= F_TOL);
      L1 = '곡률 반지름 R'; a = S.rf.RT + ' cm'; L2 = '초점 표지의 위치'; b = '렌즈에서 ' + S.rf.flag.toFixed(1) + ' cm'; L3 = '초점거리 f'; c = found ? f.toFixed(1) + ' cm' : '찾아 보세요';
    } else if (S.mode === 'trace') {
      const t = S.tr, im = imgOf(t.a, F_TR);
      L1 = '물체 거리 a'; a = t.a + ' cm'; L2 = '상의 위치'; L3 = '상의 종류 · 크기';
      if (!im) { b = '맺히지 않아요'; c = '—'; }
      else if (t.found || t.showImg === true) { const m = Math.abs(im.b) / t.a; b = (t.a > F_TR ? '렌즈 오른쪽 ' : '렌즈 왼쪽 ') + Math.abs(im.b).toFixed(1) + ' cm'; c = (t.a > F_TR ? '실상 · ' : '허상 · ') + m.toFixed(2) + '배'; }
      else { b = '작도해 보세요'; c = '—'; }
    } else if (S.mode === 'bench') {
      const st = benchState();
      L1 = '물체 거리 a'; a = S.bn.far ? '∞ (먼 풍경)' : S.bn.a.toFixed(1) + ' cm'; L2 = '스크린 거리 b'; b = S.bn.sx.toFixed(1) + ' cm'; L3 = '상의 상태'; c = st.sharp ? '선명 · 크기 ' + (S.bn.far ? '아주 작아요' : st.g.m.toFixed(2) + '배') : '흐려요';
    } else {
      const l = S.lt;
      L1 = '웨이퍼 거리'; a = l.w.toFixed(1) + ' cm'; L2 = '인쇄 가능한 최소 선폭'; b = l.wl + ' nm'; L3 = '인쇄된 선'; c = l.sharp && l.expo >= 1 ? LITHO_W.filter(printable).length + ' / ' + LITHO_W.length + '개' : (l.sharp ? '노광 중…' : '초점이 안 맞아요');
      if (l.sub === 'flow') { L1 = '고른 카드'; a = l.order.length + ' / 6장'; L2 = '순서'; b = l.ordOK ? '맞아요' : '고르는 중'; L3 = '노광에서 쓰는 장치'; c = '마스크 · 렌즈'; }
    }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const rowNear = (a0) => S.bn.rows.some((r) => r.a != null && Math.abs(r.a - a0) <= 1.0);
  const rowFar = () => S.bn.rows.find((r) => r.a == null);
  const rowSame = () => S.bn.rows.find((r) => r.a != null && Math.abs(r.m - 1) <= 0.06);
  function setupTrace(a, showImg, handle) {
    S.tr.rays = { 1: false, 2: false, 3: false }; S.tr.found = false; S.tr.showImg = showImg; S.tr.handleOn = !!handle; S.tr.handle = { x: 7, y: -7 };
    setObj(a); S.tr.ix = null; S.tr.iy = null; updateTrNote(); setScene('trace'); S.tr.showTbl = false; updateCtl();
  }
  const levels = [
    {
      title: '굴절과 렌즈: 빛은 어떻게 모일까?', short: '굴절과 렌즈', icon: '🔺', phase: '모형',
      intro: '<p class="si-q">❓ 탐구 질문: 돋보기로 햇빛을 모아 종이를 태울 수 있는 까닭은? 렌즈로 만든 상은 어디에 맺힐까?</p>' +
        '<div class="si-link">🔗 <b>중학교에서</b> 빛이 두 물질의 경계에서 꺾이는 <b>굴절</b>과, 볼록 렌즈가 빛을 모으는 것을 배웠어요. 이번에는 광선을 따라가며 상이 만들어지는 과정을 설명해 봐요.</div>' +
        '<p>유리에서는 빛이 공기보다 느려서 경계에서 꺾여요. 렌즈를 <b>프리즘 조각</b>이 쌓인 모양으로 보면 평행 광선이 한 점으로 모이는 까닭이 보여요. 모이는 점이 <b>초점 F</b>, 렌즈 중심에서 초점까지의 거리가 <b>초점거리 f</b>예요.</p>',
      features: ['refract'],
      setup() { S.rf.view = 'lens'; S.rf.RT = 10; S.rf.R = 10; S.rf.flag = 4; S.rf.norm = false; S.rf.seenPrism = false; S.rf.foundA = false; S.rf.foundB = false; slR.set(10); setScene('refract'); },
      recap: '빛은 유리 경계에서 굴절하고, 볼록렌즈는 가운데가 두꺼워 평행 광선을 한 점(초점 F)으로 모아요. 렌즈가 더 볼록할수록 초점거리가 짧아요.',
      summary: '<ul><li><b>굴절</b>: 빛이 속력이 다른 물질의 경계에서 꺾이는 현상. 공기에서 유리로 들어갈 때는 법선 쪽으로 꺾여요.</li><li>볼록렌즈는 프리즘 조각을 쌓은 것과 같아서 평행 광선이 렌즈의 두 면에서 굴절해 한 점(<b>초점 F</b>)에 모여요.</li><li>렌즈 중심에서 초점까지의 거리가 <b>초점거리 f</b>예요. 곡률 반지름 R이 10 cm인 렌즈는 f가 ' + fOf(10).toFixed(1) + ' cm, R이 7 cm인 렌즈는 f가 ' + fOf(7).toFixed(1) + ' cm로, 더 볼록할수록 f가 짧아요.</li></ul>',
      missions: [
        {
          title: '평행 광선의 초점 찾기',
          goal: '<b>프리즘 조각</b>에서 광선이 꺾이는 것을 보고, <b>곡면 렌즈</b>에서 깃발(초점 표지)을 광선이 모이는 곳에 놓으세요. 그리고 렌즈를 더 볼록하게(R ≤ 7 cm) 하고도 초점을 찾아요.',
          hint: '🔺 프리즘 조각을 잠깐 보고 🔍 볼록렌즈로 바꿔요. 깃발을 끌어 광선이 가장 가늘게 모이는 곳에 놓아요. 곡률 반지름 R 슬라이더를 줄이면 더 볼록해져요.',
          setup() { S.rf.view = 'lens'; S.rf.morph = 1; S.rf.flag = 4; S.rf.seenPrism = false; S.rf.foundA = false; S.rf.foundB = false; S.rf.RT = 10; S.rf.R = 10; slR.set(10); setScene('refract'); },
          check: () => S.rf.seenPrism && S.rf.foundA && S.rf.foundB,
          hold: 0.4,
          status: () => mark(S.rf.seenPrism) + ' 프리즘 조각 관찰 &nbsp; ' + mark(S.rf.foundA) + ' 초점 찾기 (R ≥ 10 cm) &nbsp; ' + mark(S.rf.foundB) + ' 더 볼록한 렌즈(R ≤ 7 cm)에서 초점 찾기',
          explain: '위쪽 조각은 빛을 아래로, 아래쪽 조각은 위로 꺾어 광선이 한 점으로 모여요. 곡률 반지름 R = 10 cm이면 f는 ' + fOf(10).toFixed(1) + ' cm이고, 더 볼록한 R = 7 cm이면 f가 ' + fOf(7).toFixed(1) + ' cm로 짧아져요. 렌즈가 더 휘어 있으면 빛을 더 크게 꺾기 때문이에요.',
        },
        {
          type: 'quiz', title: '볼록렌즈가 빛을 모으는 까닭',
          goal: '볼록렌즈가 평행 광선을 한 점에 모을 수 있는 까닭은?',
          setup() { setScene('refract'); },
          choices: ['렌즈가 빛을 빨아들여서 한곳에 모으기 때문에', '렌즈의 곡면에서 빛이 굴절해 가운데(두꺼운) 쪽으로 꺾이기 때문에', '빛이 렌즈 안에서 반사되어 한곳으로 모이기 때문에', '빛이 렌즈를 지나면서 빨라져서'],
          answer: 1,
          feedback: ['렌즈는 빛을 빨아들이지 않아요. 광선은 렌즈를 지난 뒤에도 계속 나아가요.', '', '모으는 것은 렌즈의 표면에서 일어나는 굴절이에요. 광선이 렌즈 안에서 반사되지는 않아요.', '유리 안에서 빛은 오히려 느려지고, 그래서 경계에서 꺾여요.'],
          explain: '렌즈의 곡면에서 빛이 <b>굴절</b>하고, 가운데가 두꺼운 모양이라 광선이 광축 쪽으로 꺾여 한 점에 모여요. 빛을 빨아들이거나 반사해서 모으는 것이 아니에요.',
        },
      ],
    },
    {
      title: '광선 추적: 상은 어디에 생길까?', short: '광선 추적', icon: '🧭', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 렌즈가 굴절로 평행 광선을 초점 F에 모은다는 것을 알았어요. 이제 물체의 한 점에서 나온 빛이 어디로 모이는지 <b>광선을 직접 그려</b> 알아봐요.</div>' +
        '<p>상을 찾을 때는 규칙이 분명한 <b>세 광선</b>만 그려요. ① 광축에 평행하게 들어가면 <b>초점을 지나요</b> ② 렌즈 중심을 지나면 <b>그대로 직진해요</b> ③ 앞쪽 초점을 지나 들어가면 <b>광축에 평행하게 나와요</b>. 세 광선이 만나는 점이 상이에요.</p>',
      features: ['trace'],
      setup() { S.tr.visited = {}; S.tr.showTbl = false; setupTrace(30, false, true); },
      recap: '세 주광선이 만나는 점이 상이에요. 물체가 2f 밖에 있으면 축소된 거꾸로 선 실상, f와 2f 사이이면 확대된 실상이고, f 안쪽이면 스크린에 맺히지 않고 확대된 바로 선 허상이 보여요.',
      summary: '<ul><li>세 주광선: ① 광축에 평행 → 굴절 후 <b>초점</b>을 지나요 ② <b>렌즈 중심</b>을 지나면 직진 ③ 앞쪽 초점을 지나면 굴절 후 <b>광축에 평행</b>.</li><li>세 광선이 실제로 만나는 곳에 <b>실상</b>(스크린에 맺히고 거꾸로 서 있음)이 생겨요. 예) f = 10 cm, a = 30 cm → 상은 렌즈에서 15 cm, 0.5배.</li><li>a = 2f(20 cm) → 같은 크기의 실상(상 20 cm) · f &lt; a &lt; 2f(15 cm) → 확대된 실상(상 30 cm, 2배)</li><li>a = f이면 광선이 평행해 상이 맺히지 않아요. a &lt; f(5 cm)이면 광선이 퍼져서 렌즈 쪽에서 <b>확대된 바로 선 허상</b>(상 10 cm, 2배)이 보여요(돋보기).</li></ul>',
      missions: [
        {
          title: '세 광선으로 상 찾기',
          goal: '물체가 <b>a = 30 cm</b>에 있어요. <b>① ② ③ 광선을 모두 그리고</b>, 광선이 만나는 곳에 주황색 점을 끌어다 놓으세요.',
          hint: '버튼 ①②③을 눌러 광선을 하나씩 켜요. 세 광선이 렌즈 오른쪽의 한 점에서 만나요. 그 점으로 주황색 점을 끌어 놓아요.',
          setup() { setupTrace(30, false, true); },
          check: () => S.tr.found,
          hold: 0.5,
          status: () => mark(S.tr.rays[1] && S.tr.rays[2] && S.tr.rays[3]) + ' 광선 3개 그리기 &nbsp; ' + mark(S.tr.found) + ' 상의 끝점 찾기' + (S.tr.a !== 30 ? ' &nbsp; (물체를 a = 30 cm로 되돌려요)' : ''),
          explain: '세 광선은 렌즈에서 오른쪽 <b>15 cm</b>에서 만나요. 상은 물체의 <b>0.5배</b> 크기로 <b>거꾸로</b> 서 있는 <b>실상</b>이에요. 물체가 2f(20 cm)보다 멀면 상이 축소돼요.',
        },
        {
          title: '상의 종류 표 만들기', manual: true,
          goal: '물체를 <b>네 구간</b>(2f 밖 · 2f · f와 2f 사이 · f 안쪽)으로 옮겨 보며 상을 관찰하고, 표의 칸을 모두 채우세요.',
          hint: '물체 거리를 30 · 20 · 15 · 5 cm로 바꾸고 상의 방향·크기·실선/점선을 살펴요. 점선 화살표는 허상이에요.',
          setup() { S.tr.visited = {}; TBL.reset(); setupTrace(30, true, false); S.tr.rays = { 1: true, 2: true, 3: true }; S.tr.showTbl = true; updateCtl(); },
          check() {
            const miss = TBL_ROWS.filter((r) => !S.tr.visited[r.z]);
            if (miss.length) return '아직 관찰하지 않은 구간이 있어요: ' + miss.map((r) => 'a = ' + r.a + ' cm').join(', ') + '. 물체를 그 구간으로 옮겨 상을 확인해 보세요.';
            return TBL.grade();
          },
          status: () => '관찰한 구간 ' + TBL_ROWS.filter((r) => S.tr.visited[r.z]).length + ' / 4 &nbsp; · 고른 칸 ' + TBL.count() + ' / 8',
          explain: '<b>30 cm</b>(2f 밖): 축소 · 거꾸로 · 실상(상 15 cm). <b>20 cm</b>(2f): 같은 크기 · 거꾸로 · 실상(상 20 cm). <b>15 cm</b>(f와 2f 사이): 확대 · 거꾸로 · 실상(상 30 cm). <b>5 cm</b>(f 안쪽): 확대 · 바로 · 허상(렌즈 왼쪽 10 cm). 실상은 스크린에 맺히고, 허상은 맺히지 않아요.',
        },
        {
          type: 'quiz', title: '초점 안쪽에서는 왜 스크린에 안 맺힐까?',
          goal: '물체를 초점 안쪽(a = 5 cm)에 두면 스크린에 상이 맺히지 않아요. 그 까닭은?',
          setup() { S.tr.showTbl = false; setupTrace(5, true, false); S.tr.rays = { 1: true, 2: true, 3: true }; updateCtl(); },
          choices: ['렌즈가 너무 가까워서 빛이 렌즈를 통과하지 못해서', '렌즈를 지난 광선이 퍼져 나가서 한 점에서 만나지 않아서', '물체가 작아서 굴절이 일어나지 않아서', '초점 안쪽에서는 빛이 반사되어 되돌아가서'],
          answer: 1,
          feedback: ['빛은 렌즈를 통과해요. 통과한 광선이 어디로 가는지 점선을 보세요.', '', '물체의 크기와 상관없이 굴절은 일어나요.', '렌즈를 지난 광선은 앞으로 계속 나아가요. 광선들이 퍼진다는 점이 중요해요.'],
          explain: '물체가 초점 안쪽에 있으면 렌즈를 지난 광선들이 <b>퍼져 나가서 실제로는 만나지 않아요</b>. 그 광선들을 거꾸로 연장한 점선이 만나는 곳에 <b>허상</b>이 보여요. 돋보기로 글자를 볼 때가 이 경우예요.',
        },
      ],
    },
    {
      title: '초점거리 찾기: 직접 재 보기', short: '초점거리', icon: '🔬', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 렌즈의 초점 위치를 알고 광선을 그려 상의 위치를 찾았어요. 이번에는 초점거리를 모르는 렌즈로 <b>스크린에 실제 상</b>을 맺히게 해서 위치를 재고, 초점거리를 구해 봐요.</div>' +
        '<p>광학대 위에 램프(물체)와 볼록렌즈, 스크린이 있어요. 스크린을 움직여 상이 <b>선명해지는 위치</b>를 찾고 거리를 기록해요. 렌즈의 초점거리는 비공개예요. ① <b>먼 풍경</b>의 상이 맺히는 거리 ② <b>같은 크기</b>의 상이 맺히는 위치를 이용해 구해 봐요.</p>',
      features: ['bench'],
      setup() { S.bn.a = 30; S.bn.sx = 20; S.bn.far = false; S.bn.cover = false; S.bn.rows = []; S.bn.showNum = false; slA2.set(30); setScene('bench'); },
      recap: '스크린에서 상이 선명한 위치를 찾으면 상 거리를 잴 수 있어요. 먼 풍경의 상 거리가 곧 초점거리 f이고, 물체와 상이 같은 크기일 때 물체 거리 = 상 거리 = 2f예요.',
      summary: '<ul><li>스크린을 움직이면 상이 선명한 위치가 있어요. 그 위치를 조금만 벗어나도 광선이 한 점에서 만나지 않아 상이 흐려져요.</li><li>물체 거리 a = 30 cm → 상 15 cm(축소) · a = 20 cm → 상 20 cm(같은 크기) · a = 15 cm → 상 30 cm(확대)</li><li>방법 ①: <b>먼 풍경</b>(a ≈ ∞)의 선명한 상이 맺히는 거리 = <b>f</b></li><li>방법 ②: 물체와 상이 <b>같은 크기</b>일 때 a = b = 2f이므로 <b>f = (그 거리) ÷ 2</b> (예: 20.0 cm ÷ 2 = 10.0 cm)</li><li>렌즈의 일부를 가려도 상 전체가 그대로 맺히고 다만 <b>어두워져요</b>.</li></ul>',
      missions: [
        {
          title: '선명한 상 세 번 찾기',
          goal: '물체 거리를 <b>a ≈ 30 cm, 20 cm, 15 cm</b>로 하고, 각각 스크린을 옮겨 상이 <b>선명</b>할 때 📏 기록하기를 누르세요.',
          hint: '물체 거리 슬라이더로 a를 맞추고, 스크린을 천천히 움직여 “선명해요!”가 뜨는 곳을 찾아요. 스크린 미세 조정 버튼(0.1 cm)을 쓰면 편해요.',
          setup() { S.bn.rows = []; S.bn.far = false; S.bn.cover = false; S.bn.a = 30; slA2.set(30); S.bn.sx = 8; setScene('bench'); S.bn.showNum = false; updateCtl(); },
          check: () => rowNear(30) && rowNear(20) && rowNear(15),
          hold: 0.5,
          status: () => mark(rowNear(30)) + ' a ≈ 30 cm &nbsp; ' + mark(rowNear(20)) + ' a ≈ 20 cm &nbsp; ' + mark(rowNear(15)) + ' a ≈ 15 cm &nbsp; (지금 ' + (benchState().sharp ? '선명' : '흐림') + ')',
          explain: '물체가 렌즈에서 멀수록 상은 렌즈에 가깝게 작게, 가까울수록 멀리 크게 생겨요. 이 렌즈에서는 a = 30 cm일 때 상이 15 cm, a = 20 cm일 때 20 cm, a = 15 cm일 때 30 cm에서 선명해요.',
        },
        {
          title: '두 가지 방법으로 초점거리 구하기', manual: true,
          goal: '방법 ① <b>먼 풍경</b>의 선명한 상 거리와, 방법 ② <b>같은 크기의 상</b>이 맺히는 거리(a와 b)를 기록한 뒤, 초점거리 f를 구해 두 칸에 쓰세요.',
          hint: '① 먼 풍경 보기를 누르고 스크린을 움직여 선명한 위치를 기록해요. ② a를 조절해 “상의 크기 ÷ 물체 크기”가 1.00이 되는 선명한 상을 기록하고, f = (a + b) ÷ 4로 구해요.',
          setup() { S.bn.cover = false; S.bn.showNum = true; setScene('bench'); $('#inFA').value = ''; $('#inFB').value = ''; ['inFA', 'inFB'].forEach((i) => $('#' + i).classList.remove('ok', 'bad')); updateCtl(); },
          check() {
            const A = parseFloat($('#inFA').value), B = parseFloat($('#inFB').value);
            const fl = (id, ok) => { const el = $('#' + id); if (!ok && !el.classList.contains('bad')) { el.classList.remove('ok'); void el.offsetWidth; el.classList.add('bad'); } if (ok) { el.classList.remove('bad'); el.classList.add('ok'); } };
            if (!rowFar()) return '먼저 “먼 풍경 보기”로 선명한 상을 찾고 📏 기록하세요.';
            if (!rowSame()) return '물체 거리 a를 조절해 상의 크기 ÷ 물체 크기가 1.00 가까이 되는 선명한 상을 찾고 📏 기록하세요.';
            if (!isFinite(A) || !isFinite(B)) return '두 칸에 초점거리(cm)를 숫자로 써 주세요.';
            const okA = Math.abs(A - F_BENCH) <= 0.6, okB = Math.abs(B - F_BENCH) <= 0.6;
            fl('inFA', okA); fl('inFB', okB);
            if (okA && okB) return true;
            return (okA ? '' : '방법 ①의 값을 다시 확인해 보세요. 먼 풍경의 선명한 상 거리가 f예요. ') + (okB ? '' : '방법 ②의 값을 다시 확인해 보세요. f = (a + b) ÷ 4예요.');
          },
          status: () => mark(!!rowFar()) + ' 먼 풍경 기록 &nbsp; ' + mark(!!rowSame()) + ' 같은 크기 기록',
          explain: '먼 풍경(a ≈ ∞)의 상은 초점에 맺혀서 <b>b = f = 10.0 cm</b>예요. 같은 크기의 상은 a = b = 20.0 cm일 때이고, 이는 2f이므로 <b>f = 20.0 ÷ 2 = 10.0 cm</b>예요. 서로 다른 방법으로 같은 값이 나왔어요.',
        },
        {
          type: 'quiz', title: '렌즈 아래쪽을 가리면?',
          goal: '렌즈의 <b>아래쪽 절반</b>을 카드로 가리면(🃏 버튼) 스크린의 상은 어떻게 될까요? 직접 확인해 보세요.',
          setup() { S.bn.showNum = false; S.bn.cover = false; setScene('bench'); updateCtl(); },
          choices: ['상의 아래쪽 절반이 사라져요', '상은 전체가 그대로 맺히고 어두워져요', '상이 위아래로 뒤집혀요', '상이 아예 맺히지 않아요'],
          answer: 1,
          feedback: ['물체의 한 점에서 나온 빛은 렌즈 전체로 퍼져 와서, 렌즈 어느 부분을 지나도 같은 점에 모여요. 다시 확인해 보세요.', '', '상의 방향은 가리는 것과 상관없어요.', '렌즈의 윗부분을 지난 광선만으로도 상이 맺혀요.'],
          explain: '물체의 한 점에서 나온 빛은 렌즈의 <b>모든 부분</b>을 지나 같은 상의 점에 모여요. 일부를 가리면 모이는 빛의 양이 줄어 <b>상이 어두워질 뿐</b>, 상의 일부가 사라지지는 않아요.',
        },
      ],
    },
    {
      title: '노광 공정: 렌즈로 회로 찍기', short: '노광 공정', icon: '🏭', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 볼록렌즈로 스크린에 선명한 상을 맺히게 했어요. 반도체와 디스플레이를 만드는 공장에서는 이 원리로 <b>아주 작은 회로</b>를 찍어 내요.</div>' +
        '<p>이 과정을 <b>포토리소그래피(노광 공정)</b>라고 해요. 웨이퍼에 빛에 반응하는 감광제를 바르고, <b>회로가 그려진 마스크</b>를 통과한 빛을 투영 렌즈로 <b>줄여서</b> 맺히게 해요. 대략적인 흐름을 순서대로 살펴보고, 렌즈로 상을 웨이퍼에 맺히게 해 봐요.</p>',
      features: ['litho'],
      setup() { S.lt.sub = 'flow'; S.lt.order = []; S.lt.ordOK = false; S.lt.ordPlay = 0; S.lt.wl = '436'; S.lt.w = 6.0; S.lt.expo = 0; slW.set(60); setScene('litho'); },
      recap: '노광 공정은 마스크의 회로를 투영 렌즈로 줄여 웨이퍼에 맺는 과정이에요. 상이 맺히는 위치에 웨이퍼를 두어야 하고, 파장이 짧은 빛일수록 더 가는 선을 인쇄할 수 있어요.',
      summary: '<ul><li><b>공정 순서</b>: 웨이퍼 세척 → 감광제 도포 → <b>노광</b> → 현상 → 식각 → 감광제 제거 (이후 층마다 반복)</li><li>노광: 마스크(물체)의 큰 회로를 투영 렌즈로 <b>1/4로 축소</b>해 웨이퍼(스크린)에 맺어요. 마스크 36 cm, 웨이퍼 9.0 cm일 때 선명해요.</li><li>이 모형에서는 <b>파장보다 가는 선</b>은 인쇄되지 않아요. 436 nm → 500 nm 선만, 193 nm → 250 nm 선까지, 13.5 nm → 14 nm 선까지 가능해요.</li><li>그래서 더 미세한 회로를 만들려고 <b>파장이 짧은 빛</b>(심자외선 193 nm, 극자외선 13.5 nm)을 써요. 간섭·회절 때문에 파장보다 훨씬 가는 선은 만들기 어려워요. 디스플레이의 박막 회로도 비슷하게 만들어요.</li></ul>',
      missions: [
        {
          title: '공정 순서 정하기', manual: true,
          goal: '웨이퍼에 회로를 만드는 <b>여섯 단계</b> 카드를 순서대로 눌러서 배열하세요.',
          hint: '깨끗이 씻고(1) → 감광제를 바르고(2) → 빛을 쪼이고(3) → 빛 받은 부분을 녹이고(4) → 드러난 곳을 깎고(5) → 남은 감광제를 지워요(6).',
          setup() { S.lt.order = []; S.lt.ordOK = false; S.lt.ordPlay = 0; setScene('litho', 'flow'); updateCtl(); },
          check: () => (S.lt.ordOK ? true : S.lt.order.length === ORDER.length ? '순서가 달라요. 다시 골라 보세요.' : '카드 ' + (ORDER.length - S.lt.order.length) + '장을 더 골라야 해요.'),
          status: () => '고른 카드 ' + S.lt.order.length + ' / 6',
          explain: '웨이퍼 세척 → 감광제 도포 → <b>노광</b> → 현상 → 식각 → 감광제 제거 순서예요. 노광에서 빛을 받은 감광제가 현상에서 녹고, 식각에서 드러난 막이 깎여서 회로 무늬가 남아요. 층마다 이 과정을 반복해요.',
        },
        {
          title: '웨이퍼에 상 맺고 가는 선까지 찍기',
          goal: '마스크는 렌즈에서 <b>36 cm</b>에 있어요. 웨이퍼를 움직여 <b>초점을 맞추고</b>, 빛의 파장을 바꿔서 <b>14 nm 선까지 모두 인쇄</b>되게 하세요.',
          hint: '웨이퍼를 마스크 쪽에서 오른쪽으로 옮겨 “초점이 맞아요!”가 뜨는 곳을 찾아요. 그다음 파장을 193 nm, 13.5 nm로 바꿔요. 14 nm 선은 13.5 nm 빛으로만 인쇄돼요.',
          setup() { S.lt.w = 6.0; slW.set(60); S.lt.wl = '436'; S.lt.expo = 0; setScene('litho', 'proj'); updateCtl(); },
          check: () => S.lt.done,
          hold: 0.6,
          status: () => mark(S.lt.sharp) + ' 초점이 맞아요 &nbsp; ' + mark(S.lt.wl === '13.5') + ' 극자외선 13.5 nm &nbsp; ' + mark(S.lt.done) + ' 14 nm 선까지 인쇄',
          explain: '마스크 36 cm에서 렌즈를 지난 빛은 렌즈 오른쪽 <b>9.0 cm</b>에 선명한 상을 맺고, 크기는 <b>1/4로 줄어요</b>. 웨이퍼가 그 위치에 있어야 회로가 또렷이 찍혀요. 이 모형에서는 파장보다 가는 선은 인쇄할 수 없어서, 14 nm 선은 13.5 nm 빛으로만 찍을 수 있어요.',
        },
        {
          type: 'quiz', title: '짧은 파장의 빛을 쓰는 까닭',
          goal: '반도체 공정에서 점점 더 <b>파장이 짧은 빛</b>(193 nm → 13.5 nm)을 쓰는 까닭은?',
          setup() { setScene('litho', 'proj'); },
          choices: ['짧은 파장의 빛이 더 밝아서', '파장이 짧을수록 회절·간섭으로 번지는 정도가 작아서 더 가는 선을 또렷이 찍을 수 있어서', '짧은 파장의 빛이 감광제를 더 빨리 녹여서', '파장이 짧으면 렌즈의 초점거리가 길어져서'],
          answer: 1,
          feedback: ['밝기가 아니라 얼마나 가는 선까지 또렷이 찍느냐가 문제예요. 파장을 바꿔 인쇄된 선의 개수를 비교해 보세요.', '', '감광제의 반응 속도가 아니라 해상 능력의 문제예요.', '초점거리는 렌즈가 정해요. 파장이 아니라 인쇄할 수 있는 선의 굵기가 달라져요.'],
          explain: '빛은 파동이라 좁은 틈이나 가는 무늬를 지나면 간섭·회절로 퍼져요(앞 차시 간섭). <b>파장이 짧을수록 덜 퍼져서</b> 더 가는 선을 또렷이 찍을 수 있어서, 더 미세한 회로를 만들려고 짧은 파장의 빛을 써요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hp-convex-lens', mount: '#game', badge: '렌즈 박사', homeHref: '../../index.html#hp',
    featureLabels: { refract: '🔺 프리즘 조각 · 볼록렌즈 · 초점 표지', trace: '🧭 세 주광선 작도 · 상의 종류 표', bench: '🔬 광학대 · 스크린 · 기록표', litho: '🏭 공정 순서 · 마스크와 투영 렌즈' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  setScene('refract');
  updateCtl();
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t; S.dt = dt;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    view.apply();
    stepRefract(dt); stepTrace(dt); stepLitho(dt);
    ctx.clearRect(0, 0, VW, VH);
    if (S.mode === 'refract') drawRefract(dt);
    else if (S.mode === 'trace') drawTrace();
    else if (S.mode === 'bench') drawBench();
    else drawLitho(dt);
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, BP, RP, F_TR, F_BENCH, F_LITHO, A_LITHO, LITHO_W, ORDER, SHUF, TBL, TBL_ROWS, fOf, principal, trueTip, benchState, benchGeom, setObj, recordRow, pickOrder, toggleRay, setScene, imgKind, cx, cy, rX, rY, slA, slA2, slW, lensPolys, traceRay, rayHeights,
    get game() { return game; },
  };

})();
