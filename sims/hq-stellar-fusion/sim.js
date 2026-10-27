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
     전자기와 양자 Ⅲ. 양자와 미시세계 - 별의 핵융합 (단원 6차시)
     성취기준 [12전자03-05] 별에서 핵융합에 의해 에너지가 생성되고 빛이 방출되는 원리를 알고, 별빛의 스펙트럼에 기반하여 별의 구성 원소를 추리할 수 있다.
     ① 탐구: 핵융합 조건 (쿨롱 장벽 약 0.7 MeV와 열에너지 kT, 터널 효과)
     ② 분석: 질량 결손 (양성자 4개 → 헬륨 핵 1개, Δm = 0.02761 u → 25.7 MeV)
     ③ 분석: 태양의 수지 (L/c², 수소 소모, 수명 어림)
     ④ 모형: 빛의 방출 (광자의 무작위 이동, 표면 온도와 색·스펙트럼, 중력과 압력의 균형)
     양성자–양성자 연쇄·CNO 순환의 세부 반응식, 핵력 모형, 별 내부 구조 방정식, 복사 법칙의 식은 다루지 않아요.
     ========================================================= */

  /* ---------- 상수·모형 (화면의 숫자와 모두 같은 값) ---------- */
  const U_MEV = 931.5, M_P = 1.00728, M_HE = 4.00151;
  const M4P = Math.round(4 * M_P * 1e5) / 1e5;                 // 4.02912 u
  const DM = Math.round((M4P - M_HE) * 1e5) / 1e5;             // 0.02761 u
  const E_FUS = DM * U_MEV;                                    // 25.7 MeV
  const FRAC = DM / M4P;                                       // 0.0069 (0.69 %)
  const EPS = 0.0069;                                          // 질량이 에너지로 바뀌는 비율 (태양의 수지 계산에 써요)
  const C2 = 9.0e16, L_SUN = 3.8e26, M_SUN = 2.0e30, YR = 3.156e7;
  const KE2 = 1.44e6, R_NUC = 2, U2 = KE2 / R_NUC;             // 쿨롱: 1.44 MeV·fm, 2 fm에서 0.72 MeV
  const KB = 8.617e-5;                                         // eV/K
  const E_CARBON = 4;                                          // 탄소 연소 한 번 약 4 eV
  const STARS = { '0.5': { m: 0.5, L: 0.074, name: '0.5 태양질량' }, '1': { m: 1, L: 1, name: '태양' }, '10': { m: 10, L: 4100, name: '10 태양질량' } };
  const gamowLog = (Ek) => -31.29 * Math.sqrt(0.5 / (Ek / 1000)) / Math.LN10;   // 한 번 접근할 때 터널링 확률의 log10 (모형 값)
  function fmtLog(lg) {                                        // 10^lg 를 a×10ⁿ 꼴로
    let e = Math.floor(lg), m = Math.pow(10, lg - e); m = Math.round(m); if (m >= 10) { m = 1; e++; }
    return m + '×10' + supOf(e);
  }
  function fmtE(eV) {
    if (eV >= 1e5) return (eV / 1e6).toFixed(eV < 1e7 ? 2 : 1) + ' MeV';
    if (eV >= 1e3) return (eV / 1e3).toFixed(eV < 1e5 ? 1 : 0) + ' keV';
    if (eV >= 1) return eV.toFixed(eV < 10 ? 2 : 1) + ' eV';
    return eV.toFixed(3) + ' eV';
  }
  const fmtT = (T) => sci(T, 1) + ' K';
  const tOf = (v) => Math.pow(10, v / 100);
  const lifeSec = (f, M, L) => (f / 100) * M * EPS * C2 / L;
  function fmtYears(y) {
    const s = sci(y, 1) + ' 년';
    if (y >= 1e8) return s + ' (약 ' + Math.round(y / 1e8) + '억 년)';
    if (y >= 1e4) return s + ' (약 ' + Math.round(y / 1e4).toLocaleString('ko-KR') + '만 년)';
    return s;
  }
  function starColor(T) {                                      // 표면 온도 → 색 (3500 K 붉은, 5800 K 노란, 1만 K 청백색)
    const A = [[3.5441, [255, 122, 61]], [3.7634, [255, 213, 74]], [4.0, [207, 227, 255]], [4.4771, [150, 185, 255]]];
    const x = Math.log10(T);
    if (x <= A[0][0]) return hexOf(A[0][1]);
    for (let i = 1; i < A.length; i++) if (x <= A[i][0]) { const t = (x - A[i - 1][0]) / (A[i][0] - A[i - 1][0]); return hexOf(A[i - 1][1].map((c, k) => c + (A[i][1][k] - c) * t)); }
    return hexOf(A[3][1]);
  }
  function planck(lamNm, T) {                                   // 상대 세기 (연속 스펙트럼의 모양만 그려요)
    const x = 1.4388e7 / (lamNm * T);
    return 1 / (Math.pow(lamNm, 5) * (Math.exp(Math.min(x, 600)) - 1));
  }

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'cond', t: 0, dt: 0.016, fade: 0,
    show: { selA: false, numB: false, numC: false, selO: false },
    cd: { lv: 600, tn: 'off', seen: {}, an: { ph: 'wait', t: 0, tun: false, u: 0, fuseT: 0 }, readRatio: false },
    ms: { fused: false, anim: null, revealDm: false, conv: false, convT: 0, phi: 0.16 },
    sn: { L: 38, f: 30, star: '1', reveal: false, seen: { '1': true }, hit: false },
    lt: { T: 5800, fu: 100, seen: {}, ph: null, R: 1, wait: 0, nFire: 0 },
  };
  let game = null;
  const MODE_LABEL = { cond: '🌡️ 핵융합 조건', mass: '⚖️ 질량 결손', sun: '☀️ 태양의 수지', light: '✨ 빛의 방출' };
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
    tnSeg.set(S.cd.tn); msSeg.set(S.sn.star); cSeg.set(String(S.lt.T)); tSeg.set(String(S.cd.lv));
    const cb = $('#bConv'); if (cb) cb.disabled = !S.ms.fused;
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));

  /* ---------- 컨트롤 ---------- */
  function markT(v) { const C = S.cd; if (v <= 400) C.seen.low = true; if (Math.abs(v - 718) <= 3) C.seen.sun = true; if (v >= 990) C.seen.high = true; }
  const slT = bindSlider('sT', (v) => fmtT(tOf(v)), (v) => { S.cd.lv = +v; markT(+v); S.cd.an.ph = 'wait'; S.cd.an.t = 0; tSeg.set(String(+v)); });
  const tSeg = bindSeg('tSeg', (v) => { S.cd.lv = +v; slT.set(+v); markT(+v); S.cd.an.ph = 'wait'; S.cd.an.t = 0; });
  const tnSeg = bindSeg('tnSeg', (v) => { S.cd.tn = v; });
  $('#bFuse').addEventListener('click', () => { Sound.click(); startFuse(); });
  $('#bRst').addEventListener('click', () => { Sound.click(); resetMass(); });
  $('#bConv').addEventListener('click', () => { Sound.click(); if (S.ms.fused) { S.ms.conv = true; S.ms.convT = 0; } });
  const slLs = bindSlider('sLs', (v) => (v / 10).toFixed(1) + '×10²⁶ W', (v) => { S.sn.L = +v; });
  const slFr = bindSlider('sFr', (v) => v + ' %', (v) => { S.sn.f = +v; });
  const msSeg = bindSeg('msSeg', (v) => { S.sn.star = v; S.sn.seen[v] = true; });
  const cSeg = bindSeg('cSeg', (v) => { S.lt.T = +v; S.lt.seen[v] = true; });
  const slFu = bindSlider('sFu', (v) => v + ' %', (v) => { S.lt.fu = +v; });
  $('#bPh').addEventListener('click', () => { Sound.click(); newPhoton(); });

  const SEL_A = mkSelRows('selA', [
    { q: '쿨롱 장벽(약 0.72 MeV)은 태양 중심의 열에너지(약 1.3 keV)의 약 몇 배일까요?', opts: ['약 5배', '약 50배', '약 500배', '약 5000배'], ans: 2 },
    { q: '터널 효과가 없다면 양성자가 장벽을 넘어 융합하려면 약 몇 K가 필요할까요?', opts: ['약 10⁷ K', '약 10⁸ K', '약 10¹⁰ K', '약 10¹² K'], ans: 2 },
  ]);
  const NUM_B = mkNum('numB', [
    { q: '질량 결손 Δm = (양성자 4개의 질량 4.02912 u) − (헬륨 핵 1개의 질량 4.00151 u)', unit: 'u', ans: DM, tol: 0.0003, hint: '4.02912 − 4.00151 을 계산해요. 소수 다섯째 자리까지 정확히 빼 보세요.' },
  ]);
  const NUM_C = mkNum('numC', [
    { q: '질량 손실률 m = L / c² (L = 3.8×10²⁶ W, c² = 9.0×10¹⁶ m²/s²)', unit: '× 10⁹ kg/s', get ans() { return S.sn.L / 10 * 1e26 / C2 / 1e9; }, get tol() { return this.ans * 0.04; }, hint: 'L / c² = (3.8×10²⁶) / (9.0×10¹⁶) = 4.2×10⁹ 이에요. 칸에는 4.2처럼 써요.' },
  ]);
  const SEL_O = mkSelRows('selO', [
    { q: '1번째', opts: ['표면(광구)에서 열복사로 빛을 내보내요', '중심에서 핵융합으로 에너지가 만들어져요', '빛이 우주 공간으로 나가요', '복사층에서 광자가 충돌·흡수·재방출을 되풀이하며 이동해요'], ans: 1 },
    { q: '2번째', opts: ['표면(광구)에서 열복사로 빛을 내보내요', '중심에서 핵융합으로 에너지가 만들어져요', '빛이 우주 공간으로 나가요', '복사층에서 광자가 충돌·흡수·재방출을 되풀이하며 이동해요'], ans: 3 },
    { q: '3번째', opts: ['표면(광구)에서 열복사로 빛을 내보내요', '중심에서 핵융합으로 에너지가 만들어져요', '빛이 우주 공간으로 나가요', '복사층에서 광자가 충돌·흡수·재방출을 되풀이하며 이동해요'], ans: 0 },
    { q: '4번째', opts: ['표면(광구)에서 열복사로 빛을 내보내요', '중심에서 핵융합으로 에너지가 만들어져요', '빛이 우주 공간으로 나가요', '복사층에서 광자가 충돌·흡수·재방출을 되풀이하며 이동해요'], ans: 2 },
  ]);

  /* ================= ① 핵융합 조건 ================= */
  const cdLay = () => PHONE
    ? { a: { x: 8, y: 8, w: 464, h: 168 }, b: { x: 8, y: 184, w: 464, h: 280 }, c: { x: 8, y: 472, w: 464, h: 200 } }
    : { a: { x: 12, y: 12, w: 776, h: 166 }, b: { x: 12, y: 188, w: 484, h: 360 }, c: { x: 506, y: 188, w: 282, h: 360 } };
  function cdPhys() {
    const T = tOf(S.cd.lv), Ek = KB * T, contact = Ek >= U2, rmin = Math.max(KE2 / Ek, R_NUC);
    return { T, Ek, contact, rmin, lgr: Math.log10(rmin), lgP: contact ? 0 : gamowLog(Ek) };
  }
  const easeOut = (u) => 1 - (1 - u) * (1 - u);
  function stepCond(dt) {
    const C = S.cd, an = C.an, P = cdPhys();
    an.t += dt;
    const lgEnd = P.contact ? Math.log10(R_NUC) : Math.min(4, P.lgr);
    if (an.ph === 'wait') { if (an.t > 0.5) { an.ph = 'in'; an.t = 0; an.tun = C.tn === 'on' && !P.contact && P.lgr < 4 && Math.random() < 0.3; } an.lg = 4; }
    else if (an.ph === 'in') {
      const u = clamp(an.t / 1.8, 0, 1); an.lg = 4 - (4 - lgEnd) * easeOut(u);
      if (u >= 1) {
        if (P.contact || an.tun) { an.ph = an.tun ? 'tun' : 'fuse'; an.t = 0; if (!an.tun) { an.fuse = true; } }
        else { an.ph = 'out'; an.t = 0; an.from = lgEnd; }
      }
    } else if (an.ph === 'tun') {
      const u = clamp(an.t / 0.9, 0, 1); an.lg = lgEnd - (lgEnd - Math.log10(R_NUC)) * u;
      if (u >= 1) { an.ph = 'fuse'; an.t = 0; an.fuse = true; }
    } else if (an.ph === 'out') {
      const u = clamp(an.t / 1.1, 0, 1); an.lg = an.from + (4 - an.from) * (1 - Math.pow(1 - u, 2)) * 1; if (u >= 1) { an.ph = 'wait'; an.t = 0; }
    } else if (an.ph === 'fuse') {
      if (an.fuse) { an.fuse = false; const g = cdGeom(); parts.burst(g.xA, g.y, { count: 22, colors: ['#ffd54a', '#ff7a3d', '#fff'], speed: 150, life: 0.8, size: 3.4, gravity: 0 }); Sound.success(); }
      an.lg = Math.log10(R_NUC);
      if (an.t > 1.3) { an.ph = 'wait'; an.t = 0; }
    }
  }
  function cdGeom() {
    const A = cdLay().a, y = A.y + (PHONE ? 84 : 92), xA = A.x + 54, xe = A.x + A.w - 44;
    return { A, y, xA, xe, X: (lg) => xA + (lg / 4) * (xe - xA) };
  }
  function drawCond() {
    const { a: A, b: Bp, c: Cc } = cdLay(), C = S.cd, P = cdPhys(), an = C.an, g = cdGeom();
    // ---- A: 양성자 접근 (거리는 로그 눈금) ----
    panel(A.x, A.y, A.w, A.h, 14);
    T(A.x + 14, A.y + 22, '양성자 두 개가 다가가요 (가로축은 거리 r, 로그 눈금)', PHONE ? 12.5 : 14.5, '#26324a', 'left', 800);
    ctx.strokeStyle = '#c3cbd9'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(g.xA, g.y + 26); ctx.lineTo(g.xe + 10, g.y + 26); ctx.stroke();
    [0, 1, 2, 3, 4].forEach((e) => { const x = g.X(e); ctx.fillStyle = '#5d6879'; ctx.fillRect(x - 0.8, g.y + 26, 1.6, 7); T(x, g.y + 48, e === 0 ? '1 fm' : e === 1 ? '10 fm' : e === 2 ? '100 fm' : e === 3 ? '1000 fm' : '10⁴ fm', PHONE ? 11 : 12, '#5d6879', 'center', 700); });
    // 핵력이 작용하는 거리
    const x2 = g.X(Math.log10(R_NUC));
    ctx.strokeStyle = 'rgba(20,160,88,.8)'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x2, g.y - 34); ctx.lineTo(x2, g.y + 26); ctx.stroke(); ctx.setLineDash([]);
    T(x2 + 6, g.y - 36, '약 2 fm: 핵력이 작용해 융합', PHONE ? 11 : 12, '#0f7a42', 'left', 800);
    // 가장 가까운 거리
    if (P.lgr <= 4 && !P.contact) { const xm = g.X(P.lgr); ctx.strokeStyle = 'rgba(226,70,75,.85)'; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(xm, g.y - 26); ctx.lineTo(xm, g.y + 26); ctx.stroke(); ctx.setLineDash([]); D.label(xm, g.y - 40, '가장 가까운 거리 ' + sci(P.rmin, 1) + ' fm', { size: PHONE ? 11 : 12, bg: '#e2464b' }); }
    else if (P.lgr > 4) T(g.xe, g.y - 36, '멀리서 이미 튕겨요 (r ≥ 10⁴ fm)', PHONE ? 11 : 12.5, '#e2464b', 'right', 800);
    // 양성자 A (고정), B (접근)
    const lgB = an.lg == null ? 4 : an.lg;
    const fusedNow = an.ph === 'fuse';
    if (fusedNow) { D.glow(g.xA, g.y, 40, '#ffb400', 0.7 * clamp(1.4 - an.t, 0, 1)); D.sphere(g.xA + 8, g.y, 17, '#e2464b', { shadow: true, text: 'p⁺', textScale: 0.9 }); D.sphere(g.xA - 8, g.y, 17, '#f26b3a', { shadow: true, text: 'p⁺', textScale: 0.9 }); D.label(g.xA + 4, g.y - 40, '융합!', { size: 13, bg: '#14a058' }); }
    else {
      D.sphere(g.xA, g.y, 16, '#e2464b', { shadow: true, text: 'p⁺', textScale: 0.9 });
      const bx = g.X(clamp(lgB, 0, 4)) + 14;
      ctx.globalAlpha = an.ph === 'tun' ? 0.55 : 1; D.sphere(bx, g.y, 16, '#f26b3a', { shadow: true, text: 'p⁺', textScale: 0.9 }); ctx.globalAlpha = 1;
      if (an.ph === 'in' || an.ph === 'out') { const near = clamp((4 - lgB) / 4, 0, 1); D.arrow(bx + 22, g.y - 24, bx + 22 + 12 + near * 22, g.y - 24, { color: '#e2464b', width: 2.6, head: 8 }); }
      if (an.ph === 'tun') D.label(bx, g.y - 40, '터널링!', { size: 13, bg: '#8b5cf6' });
    }
    if (C.tn === 'on' && !P.contact) T(A.x + A.w - 14, A.y + 22, '화면 시연: 터널링을 실제보다 훨씬 자주 보여 줘요', PHONE ? 10.5 : 12, '#7a5bc8', 'right', 800);
    else if (P.contact) T(A.x + A.w - 14, A.y + 22, '열에너지가 장벽보다 커서 그냥 넘어요', PHONE ? 10.5 : 12.5, '#0f7a42', 'right', 800);

    // ---- B: 쿨롱 장벽 로그-로그 그래프 ----
    panel(Bp.x, Bp.y, Bp.w, Bp.h, 14);
    T(Bp.x + 14, Bp.y + 22, '쿨롱 장벽과 열에너지 (두 축 모두 로그 눈금)', PHONE ? 12.5 : 14.5, '#26324a', 'left', 800);
    const pad = PHONE ? { l: 70, r: 14, t: 34, b: 46 } : { l: 80, r: 18, t: 38, b: 54 };
    const ax = axes(Bp.x + pad.l, Bp.y + pad.t, Bp.w - pad.l - pad.r, Bp.h - pad.t - pad.b, { xmin: 0, xmax: 4, ymin: -2, ymax: 7, xt: [[0, '1'], [1, '10'], [2, '100'], [3, '1000'], [4, '10⁴']], yt: [[-2, '0.01 eV'], [0, '1 eV'], [2, '100 eV'], [4, '10 keV'], [6, '1 MeV']], xl: '두 양성자 사이의 거리 r (fm)', yl: '에너지', ylx: 62, fs: 11.5 });
    const lgU = (lr) => Math.log10(KE2) - lr;
    const lgE = Math.log10(P.Ek);
    // 장벽 영역(터널링해야 하는 구간)
    if (!P.contact && P.lgr <= 4) {
      ctx.fillStyle = 'rgba(139,92,246,.22)'; ctx.beginPath(); ctx.moveTo(ax.X(Math.log10(R_NUC)), ax.Y(lgE)); ctx.lineTo(ax.X(Math.log10(R_NUC)), ax.Y(lgU(Math.log10(R_NUC))));
      for (let lr = Math.log10(R_NUC); lr <= P.lgr + 1e-9; lr += 0.02) ctx.lineTo(ax.X(lr), ax.Y(lgU(lr)));
      ctx.lineTo(ax.X(P.lgr), ax.Y(lgE)); ctx.closePath(); ctx.fill();
    }
    ctx.save(); ctx.beginPath(); ctx.rect(ax.x, ax.y, ax.w, ax.h); ctx.clip();
    ctx.strokeStyle = '#7a5bc8'; ctx.lineWidth = 3; ctx.beginPath(); for (let lr = 0; lr <= 4.001; lr += 0.02) { const px = ax.X(lr), py = ax.Y(lgU(lr)); if (lr === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); } ctx.stroke();
    ctx.strokeStyle = '#f26b3a'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(ax.X(0), ax.Y(lgE)); ctx.lineTo(ax.X(4), ax.Y(lgE)); ctx.stroke();
    ctx.strokeStyle = 'rgba(20,160,88,.8)'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(ax.X(Math.log10(R_NUC)), ax.Y(-2)); ctx.lineTo(ax.X(Math.log10(R_NUC)), ax.Y(7)); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    D.sphere(ax.X(Math.log10(R_NUC)), ax.Y(lgU(Math.log10(R_NUC))), 6, '#7a5bc8', { shadow: true });
    D.label(clamp(ax.X(Math.log10(R_NUC)) + 12, ax.x + 70, ax.x + ax.w - 70), ax.Y(lgU(Math.log10(R_NUC))) - 14, '장벽 ' + fmtE(U2), { size: PHONE ? 11.5 : 12.5, bg: '#7a5bc8' });
    if (P.lgr <= 4 && !P.contact) D.sphere(ax.X(P.lgr), ax.Y(lgE), 6, '#e2464b', { shadow: true });
    D.label(ax.x + ax.w - 70, clamp(ax.Y(lgE) + 16, ax.y + 14, ax.y + ax.h - 12), '열에너지 kT = ' + fmtE(P.Ek), { size: PHONE ? 11.5 : 12.5, bg: '#f26b3a' });
    T(ax.x + ax.w - 8, ax.y + 16, '보라 곡선: 양성자 사이의 전기적 위치 에너지', PHONE ? 10.5 : 12, '#7a5bc8', 'right', 800);

    // ---- C: 읽은 값 ----
    panel(Cc.x, Cc.y, Cc.w, Cc.h, 14);
    const fs = PHONE ? 12.5 : 13.5, x0 = Cc.x + 14;
    T(x0, Cc.y + 24, '읽은 값', PHONE ? 13 : 14.5, '#26324a', 'left', 800);
    const bw = Cc.w - 28;
    const bar = (y, lg, col, label) => { T(x0, y, label, fs, '#26324a', 'left', 800); barH(x0, y + 8, bw, 14, clamp((lg + 2) / 9, 0, 1), col); };
    bar(Cc.y + 50, Math.log10(U2), '#7a5bc8', '쿨롱 장벽 ' + fmtE(U2) + ' (r = 2 fm)');
    bar(Cc.y + 94, Math.log10(P.Ek), '#f26b3a', '평균 열에너지 kT = ' + fmtE(P.Ek));
    T(x0, Cc.y + 138, '막대는 로그 눈금 (0.01 eV ~ 10 MeV)', PHONE ? 10.5 : 11.5, '#5d6879', 'left', 700);
    T(x0, Cc.y + 162, '온도 T = ' + fmtT(P.T), fs, '#26324a', 'left', 800);
    T(x0, Cc.y + 184, P.contact ? '장벽을 넘어서 융합해요 (고전적)' : '한 번 접근할 때 터널링 확률(모형): ' + (P.lgP < -150 ? '사실상 0' : fmtLog(P.lgP)), fs - (P.contact ? 0 : 0.5), P.contact ? '#0f7a42' : '#7a5bc8', 'left', 800);
    if (!PHONE) textBlock(x0, Cc.y + 210, bw, '확률은 아주 작아도 태양 중심에는 양성자가 약 10⁵⁶개나 있어서 융합이 꾸준히 일어나요.', 12.5, '#5d6879', 17, 700);
    if (!PHONE) textBlock(x0, Cc.y + 266, bw, '고전적으로는 열에너지 kT가 장벽 0.72 MeV 이상이어야 해서 약 10¹⁰ K가 필요해요.', 12.5, '#5d6879', 17, 700);
  }

  /* ================= ② 질량 결손 ================= */
  const msLay = () => PHONE
    ? { a: { x: 8, y: 8, w: 464, h: 262 }, b: { x: 8, y: 278, w: 464, h: 196 }, c: { x: 8, y: 482, w: 464, h: 190 } }
    : { a: { x: 12, y: 12, w: 420, h: 330 }, b: { x: 444, y: 12, w: 344, h: 330 }, c: { x: 12, y: 352, w: 776, h: 196 } };
  function resetMass() { const M = S.ms; M.fused = false; M.anim = null; M.conv = false; M.convT = 0; M.phi = 0.16; updateCtl(); }
  function startFuse() { const M = S.ms; if (M.fused || M.anim) return; M.anim = { t: 0, burst: false }; }
  function stepMass(dt) {
    const M = S.ms;
    if (M.anim) {
      M.anim.t += dt;
      if (M.anim.t > 1.1 && !M.anim.burst) { M.anim.burst = true; const g = msGeom(); parts.burst(g.lx, g.panY - 20, { count: 24, colors: ['#ffd54a', '#ff7a3d', '#fff'], speed: 190, life: 0.9, size: 3.6, gravity: 0 }); Sound.success(); }
      if (M.anim.t >= 3.0) { M.fused = true; M.anim = null; updateCtl(); }
    }
    M.phi = SciSim.approach(M.phi, M.fused || (M.anim && M.anim.t > 1.4) ? 0 : 0.16, dt, 3.2);
    if (M.conv) M.convT = Math.min(1, M.convT + dt / 1.1);
  }
  function msGeom() {
    const A = msLay().a, cx = A.x + A.w / 2, py = A.y + (PHONE ? 96 : 118), Lb = A.w * 0.36;
    const phi = S.ms.phi;
    const lx = cx - Lb * Math.cos(phi), ly = py + Lb * Math.sin(phi), rx = cx + Lb * Math.cos(phi), ry = py - Lb * Math.sin(phi), drop = PHONE ? 50 : 62;
    return { A, cx, py, Lb, lx, ly, rx, ry, drop, panY: ly + drop };
  }
  const nucleus = (x, y, r, n) => {                                    // 헬륨 핵: 양성자 2개, 중성자 2개
    const o = [[-0.5, -0.5, 1], [0.5, -0.5, 0], [-0.5, 0.5, 0], [0.5, 0.5, 1]];
    o.forEach((q) => D.sphere(x + q[0] * r * 1.55, y + q[1] * r * 1.55, r, q[2] ? '#e2464b' : '#8f9bb3', { shadow: false }));
  };
  function drawMass() {
    const { a: A, b: Bp, c: Cc } = msLay(), M = S.ms, g = msGeom(), fs = PHONE ? 12.5 : 13.5;
    panel(A.x, A.y, A.w, A.h, 14);
    T(A.x + 14, A.y + 22, '입자 저울: 질량 비교', PHONE ? 13 : 14.5, '#26324a', 'left', 800);
    // 저울 받침과 막대
    D.shadow(() => { ctx.fillStyle = '#9aa5b8'; ctx.beginPath(); ctx.moveTo(g.cx, g.py); ctx.lineTo(g.cx - 26, A.y + A.h - 30); ctx.lineTo(g.cx + 26, A.y + A.h - 30); ctx.closePath(); ctx.fill(); ctx.fillRect(g.cx - 70, A.y + A.h - 34, 140, 8); }, { blur: 6, y: 2 });
    ctx.strokeStyle = '#5d6879'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(g.lx, g.ly); ctx.lineTo(g.rx, g.ry); ctx.stroke();
    D.sphere(g.cx, g.py, 8, '#f26b3a');
    const pan = (x, y, ey) => { ctx.strokeStyle = '#9aa5b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 52, ey); ctx.moveTo(x, y); ctx.lineTo(x + 52, ey); ctx.stroke(); ctx.fillStyle = '#b9c3d6'; D.roundRect(x - 62, ey - 2, 124, 10, 5); ctx.fill(); };
    pan(g.lx, g.ly, g.panY); pan(g.rx, g.ry, g.ry + g.drop);
    const r = PHONE ? 8.5 : 11, py = g.panY - r - 4;
    // 왼쪽: 양성자 4개 -> 헬륨 핵
    const anim = M.anim, t = anim ? anim.t : (M.fused ? 9 : 0);
    const protons = [[-0.8, 0], [0.8, 0], [-0.8, -1.7], [0.8, -1.7]];
    if (t < 1.1) {
      const q = easeOut(clamp(t / 1.0, 0, 1)), sp = 1 - q * 0.83;
      protons.forEach((p, i) => D.sphere(g.lx + p[0] * r * 1.45 * (anim ? sp : 1), py + p[1] * r * 0.95 * (anim ? sp * 0.9 + 0.1 : 1) - (anim ? q * 0.6 * r : 0), r, '#e2464b', { shadow: true, text: 'p⁺', textScale: 0.85 }));
    } else nucleus(g.lx, py - r * 0.6, r * 0.9);
    if (anim && t > 1.0 && t < 1.7) D.glow(g.lx, py - r, 60 * (1.7 - t) + 12, '#ffd54a', 0.8);
    // 오른쪽: 헬륨 핵
    nucleus(g.rx, g.ry + g.drop - r - 8 - r * 0.6, r * 0.9);
    T(g.lx, g.ly - 14, (M.fused || t >= 1.1) ? '헬륨 핵 (융합 뒤)' : '양성자 4개', fs, '#26324a', 'center', 800);
    T(g.lx, g.panY + 30, (M.fused || t >= 1.1) ? M_HE.toFixed(5) + ' u' : M4P.toFixed(5) + ' u', fs, '#26324a', 'center', 800);
    T(g.rx, g.ry - 14, '헬륨 핵 1개', fs, '#26324a', 'center', 800);
    T(g.rx, g.ry + g.drop + 30, M_HE.toFixed(5) + ' u', fs, '#26324a', 'center', 800);
    // 방출 에너지
    if (anim && t > 1.1) { const q = clamp((t - 1.1) / 1.4, 0, 1), ex = g.lx + (A.x + A.w * 0.5 - g.lx + 10) * q * 0.9, ey = g.panY - 20 - q * 120; D.glow(ex, ey, 40, '#ffd54a', 0.75); D.sphere(ex, ey, 14, '#ffb400', { shadow: true }); D.label(ex, ey - 26, 'E = 25.7 MeV', { size: 12.5, bg: '#f26b3a' }); }
    else if (M.fused) { const ex = A.x + A.w * 0.5, ey = A.y + 58; D.glow(ex, ey, 40, '#ffd54a', 0.5); D.sphere(ex, ey, 14, '#ffb400', { shadow: true }); T(ex + 22, ey + 4, '방출된 에너지', fs - 0.5, '#c47a00', 'left', 800); }
    T(A.x + 14, A.y + A.h - 8, M.fused ? '융합 뒤에는 양쪽 질량이 같아져요' : '양성자 4개 쪽이 조금 더 무거워요 (차이를 크게 과장해서 그렸어요)', PHONE ? 11.5 : 12.5, '#5d6879', 'left', 700);

    // ---- B: 질량-에너지 막대 ----
    panel(Bp.x, Bp.y, Bp.w, Bp.h, 14);
    T(Bp.x + 14, Bp.y + 22, '질량과 에너지', PHONE ? 13 : 14.5, '#26324a', 'left', 800);
    const bx = Bp.x + 16, bw = Bp.w - 32, pct = FRAC * 100;
    T(bx, Bp.y + 50, '반응 전: 양성자 4개 (100 %)', fs, '#26324a', 'left', 800); barH(bx, Bp.y + 58, bw, 18, 1, '#e2464b');
    const showAfter = M.fused || (anim && t > 1.4);
    T(bx, Bp.y + 100, '반응 후: 헬륨 핵 ' + (100 - pct).toFixed(2) + ' % + 방출 에너지 ' + pct.toFixed(2) + ' %', fs, '#26324a', 'left', 800);
    barH(bx, Bp.y + 108, bw, 18, 1, '#e3e8f2');
    if (showAfter) { ctx.fillStyle = '#8f9bb3'; ctx.fillRect(bx, Bp.y + 108, bw * (1 - FRAC), 18); ctx.fillStyle = '#f26b3a'; ctx.fillRect(bx + bw * (1 - FRAC), Bp.y + 108, bw * FRAC, 18); }
    // 확대(눈금 99 %~100 %)
    const zy = Bp.y + (PHONE ? 150 : 176);
    T(bx, zy - 12, '🔍 오른쪽 끝을 확대해 보면 (눈금 99 % ~ 100 %)', fs - 0.5, '#5d6879', 'left', 800);
    ctx.fillStyle = '#e3e8f2'; ctx.fillRect(bx, zy, bw, 22);
    if (showAfter) { const w1 = (1 - FRAC - 0.99) / 0.01; ctx.fillStyle = '#8f9bb3'; ctx.fillRect(bx, zy, bw * w1, 22); ctx.fillStyle = '#f26b3a'; ctx.fillRect(bx + bw * w1, zy, bw * (FRAC / 0.01), 22); }
    ctx.strokeStyle = '#5d6879'; ctx.lineWidth = 1.2; ctx.strokeRect(bx, zy, bw, 22);
    [99, 99.5, 100].forEach((v) => T(bx + bw * (v - 99) / 1, zy + 38, v + ' %', 11.5, '#5d6879', v === 99 ? 'left' : v === 100 ? 'right' : 'center', 700));
    if (!PHONE) textBlock(bx, zy + 62, bw, '줄어든 질량은 사라진 것이 아니라 에너지로 바뀌어 나가요. 화학 반응에서는 이 차이가 너무 작아서 질량이 보존되는 것처럼 보여요.', 12.5, '#5d6879', 17, 700);

    // ---- C: 변환기 ----
    panel(Cc.x, Cc.y, Cc.w, Cc.h, 14);
    T(Cc.x + 14, Cc.y + 22, 'E = Δm c² 변환기', PHONE ? 13 : 14.5, '#26324a', 'left', 800);
    const reveal = M.revealDm || (game && game.free), cvt = M.conv || (game && game.free && M.fused);
    const x1 = Cc.x + 16;
    T(x1, Cc.y + (PHONE ? 44 : 52), 'Δm = ' + M4P.toFixed(5) + ' − ' + M_HE.toFixed(5) + ' = ' + (reveal ? DM.toFixed(5) + ' u' : '? u'), fs + 0.5, reveal ? '#0f7a42' : '#c47a00', 'left', 800);
    const val = cvt ? (S.ms.conv ? E_FUS * easeOut(M.convT) : E_FUS) : 0;
    T(x1, Cc.y + (PHONE ? 64 : 78), 'E = Δm × 931.5 MeV/u = ' + (cvt ? val.toFixed(1) + ' MeV' : '? MeV'), fs + 0.5, cvt ? '#0f7a42' : '#c47a00', 'left', 800);
    if (!PHONE || true) { const ry = Cc.y + (PHONE ? 82 : 104); T(x1, ry, '핵융합 한 번 25.7 MeV ≈ ' + sci(E_FUS * 1e6 * 1.602e-19, 1) + ' J', fs - 0.5, '#5d6879', 'left', 700); }
    // 로그 비교 막대 (탄소 연소 vs 핵융합)
    const lx0 = PHONE ? Cc.x + 16 : Cc.x + 400, lw = PHONE ? Cc.w - 32 : Cc.w - 416, ly0 = PHONE ? Cc.y + 92 : Cc.y + 44, ldy = PHONE ? 34 : 46;
    const lb = (y, e, col, label) => { barH(lx0, y + 6, lw, 14, cvt ? clamp((Math.log10(e) + 0) / 8, 0, 1) : 0, col); T(lx0, y, label, fs - 0.5, '#26324a', 'left', 800); };
    lb(ly0 + 4, E_CARBON, '#8f9bb3', '탄소 한 개가 타서 CO₂가 될 때: 약 4 eV'); lb(ly0 + 4 + ldy, E_FUS * 1e6, '#f26b3a', '수소 핵 4개의 핵융합: 25.7 MeV');
    if (cvt) T(lx0 + lw, ly0 + 4 + ldy * 2 + 6, '반응 한 번당 약 ' + Math.round(E_FUS * 1e6 / E_CARBON / 1e5) * 10 + '만 배 (막대는 로그 눈금)', PHONE ? 10.5 : 12, '#c0353b', 'right', 800);
    else T(lx0, ly0 + 4 + ldy * 2 + 6, '변환 버튼을 눌러 비교해 보세요', PHONE ? 11 : 12.5, '#5d6879', 'left', 700);
    if (!PHONE) textBlock(x1, Cc.y + 132, 372, '※ 양성자 4개와 헬륨 핵의 질량 차에서 계산한 값이에요. 양전자 2개가 전자 2개와 만나 사라지며 내는 에너지까지 합치면 한 번의 융합에서 나오는 총에너지는 약 26.7 MeV(중성미자가 가져가는 약 0.5 MeV 포함)예요.', 12, '#5d6879', 16.5, 700);
  }

  /* ================= ③ 태양의 수지 ================= */
  const snLay = () => PHONE
    ? { a: { x: 8, y: 8, w: 464, h: 250 }, b: { x: 8, y: 266, w: 464, h: 240 }, c: { x: 8, y: 514, w: 464, h: 158 } }
    : { a: { x: 12, y: 12, w: 380, h: 330 }, b: { x: 402, y: 12, w: 386, h: 330 }, c: { x: 12, y: 352, w: 776, h: 196 } };
  const snL = () => S.sn.L / 10 * 1e26;
  const snStar = () => STARS[S.sn.star];
  const snLife = () => { const st = snStar(), Lw = S.sn.star === '1' ? snL() : st.L * L_SUN; return lifeSec(S.sn.f, st.m * M_SUN, Lw) / YR; };
  function drawSun() {
    const { a: A, b: Bp, c: Cc } = snLay(), N = S.sn, fs = PHONE ? 12.5 : 14;
    panel(A.x, A.y, A.w, A.h, 14);
    T(A.x + 14, A.y + 22, '☀️ 태양이 내보내는 에너지와 줄어드는 질량', PHONE ? 12.5 : 14.5, '#26324a', 'left', 800);
    const sx = A.x + (PHONE ? 62 : 70), sy = A.y + (PHONE ? 100 : 108);
    D.glow(sx, sy, 78, '#ffb400', 0.5 + 0.15 * Math.sin(S.t * 2)); D.sphere(sx, sy, PHONE ? 34 : 42, '#ffb400', { shadow: true });
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + S.t * 0.4 * (RM ? 0 : 1); D.arrow(sx + Math.cos(a) * 50, sy + Math.sin(a) * 50, sx + Math.cos(a) * 68, sy + Math.sin(a) * 68, { color: '#ff9a3d', width: 2.6, head: 7 }); }
    T(sx, sy + (PHONE ? 76 : 84), 'L = ' + sci(snL(), 1) + ' W', PHONE ? 12.5 : 14, '#c47a00', 'center', 800);
    const x0 = A.x + (PHONE ? 126 : 150), w0 = A.w - (PHONE ? 136 : 164), rev = N.reveal || (game && game.free);
    const m = snL() / C2, mh = m / EPS;
    const man = Math.round(m / 1e3 / 1e4 / 10) * 10, ok2 = Math.round(mh / 1e11);
    const rows = [
      ['① 초당 줄어드는 질량', 'm = L / c²', rev ? sci(m, 1) + ' kg/s' : '?', rev ? '(약 ' + man + '만 톤/s)' : ''],
      ['② 하루 동안 줄어드는 질량', 'm × 86400 s', rev ? sci(m * 86400, 1) + ' kg' : '?', ''],
      ['③ 초당 소모하는 수소', 'm / 0.0069', rev ? sci(mh, 1) + ' kg/s' : '?', rev ? '(약 ' + ok2 + '억 톤/s)' : ''],
    ];
    let yy = A.y + 54;
    rows.forEach((r) => {
      T(x0, yy, r[0], fs - 0.5, '#26324a', 'left', 800); T(x0, yy + 21, r[1] + ' =', fs - 0.5, '#5d6879', 'left', 700);
      T(x0 + w0, yy + 21, r[2], fs + 0.5, rev ? '#0f7a42' : '#c47a00', 'right', 800);
      if (r[3]) T(x0 + w0, yy + 39, r[3], fs - 1.5, '#5d6879', 'right', 700);
      yy += 56;
    });
    T(A.x + 14, A.y + A.h - 8, 'c² = 9.0×10¹⁶ m²/s², 질량이 에너지로 바뀌는 비율 0.69 % (≈ 0.0069)', PHONE ? 10.5 : 11.5, '#5d6879', 'left', 700);

    // B: 수명 막대 (로그 눈금)
    panel(Bp.x, Bp.y, Bp.w, Bp.h, 14);
    T(Bp.x + 14, Bp.y + 22, '별의 수명 어림 (눈금은 로그)', PHONE ? 12.5 : 14.5, '#26324a', 'left', 800);
    const ax0 = Bp.x + (PHONE ? 100 : 108), aw = Bp.w - (PHONE ? 118 : 126), top = Bp.y + (PHONE ? 52 : 56), rowH = PHONE ? 30 : 38, chH = rowH * 3 + 8;
    const keys = ['0.5', '1', '10'], LX = (y) => ax0 + clamp((Math.log10(y) - 6) / 6, 0, 1) * aw;
    [6, 7, 8, 9, 10, 11, 12].forEach((e) => { ctx.strokeStyle = '#e3e8f2'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(LX(Math.pow(10, e)), top); ctx.lineTo(LX(Math.pow(10, e)), top + chH); ctx.stroke(); T(LX(Math.pow(10, e)), top + chH + 14, e === 6 ? '100만' : e === 7 ? '1천만' : e === 8 ? '1억' : e === 9 ? '10억' : e === 10 ? '100억' : e === 11 ? '1000억' : '1조', PHONE ? 9.5 : 10.5, '#5d6879', 'center', 700); });
    T(ax0 + aw / 2, top + chH + 30, '수명 (년)', 11.5, '#26324a', 'center', 800);
    keys.forEach((k, i) => {
      const st = STARS[k], Lw = k === '1' ? snL() : st.L * L_SUN, yrs = lifeSec(N.f, st.m * M_SUN, Lw) / YR, y = top + 4 + i * rowH, on = N.star === k;
      T(Bp.x + 14, y + (rowH - 12) / 2 + 5, st.name, PHONE ? 12 : 13.5, on ? '#c47a00' : '#26324a', 'left', 800);
      ctx.fillStyle = on ? '#f26b3a' : '#9aa5b8'; ctx.fillRect(ax0, y, Math.max(0, LX(yrs) - ax0), rowH - 12);
      T(clamp(LX(yrs) + 4, ax0 + 4, Bp.x + Bp.w - 8), y + (rowH - 12) / 2 + 5, sci(yrs, 1) + ' 년', PHONE ? 11.5 : 12.5, on ? '#c47a00' : '#26324a', LX(yrs) + 90 > Bp.x + Bp.w ? 'right' : 'left', 800, LX(yrs) + 90 > Bp.x + Bp.w ? { stroke: '#fff', strokeWidth: 3 } : null);
    });
    ctx.strokeStyle = '#14a058'; ctx.setLineDash([4, 3]); ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(LX(4.6e9), top - 4); ctx.lineTo(LX(4.6e9), top + chH); ctx.stroke(); ctx.setLineDash([]);
    T(LX(4.6e9), top - 8, '태양의 지금 나이 약 46억 년', PHONE ? 10.5 : 11.5, '#0f7a42', 'center', 800);
    // 선택한 별의 계산 과정
    const st = snStar(), Lw = N.star === '1' ? snL() : st.L * L_SUN, E = (N.f / 100) * st.m * M_SUN * EPS * C2, sec = E / Lw;
    const cy0 = top + chH + (PHONE ? 52 : 56);
    T(Bp.x + 14, cy0, st.name + ': 수소의 ' + N.f + ' %를 쓰면', PHONE ? 11.5 : 12.5, '#26324a', 'left', 800);
    T(Bp.x + 14, cy0 + 19, '방출 총에너지 = ' + sci(E, 1) + ' J → 수명 = ' + sci(E, 1) + ' / ' + sci(Lw, 1) + ' W', PHONE ? 11 : 12, '#5d6879', 'left', 700);
    T(Bp.x + 14, cy0 + 38, '= ' + fmtYears(sec / YR), PHONE ? 12.5 : 13.5, '#0f7a42', 'left', 800);

    // C: 표와 해설
    panel(Cc.x, Cc.y, Cc.w, Cc.h, 14);
    const cx = Cc.x + 14, f2 = PHONE ? 11.5 : 13;
    T(cx, Cc.y + 22, '질량이 다른 별의 광도와 수명 (광도는 태양의 몇 배, 값은 통합과학1과 같은 범위)', PHONE ? 11.5 : 13.5, '#26324a', 'left', 800);
    const colx = PHONE ? [cx, cx + 140, cx + 250, cx + 330] : [cx, cx + 200, cx + 340, cx + 500], hy = Cc.y + 46;
    ['별', '광도 L', '수명 (연료 ' + N.f + ' %)', '태양보다'].forEach((h, i) => { if (!PHONE || i < 3) T(colx[i], hy, h, f2 - 0.5, '#5d6879', 'left', 800); });
    keys.forEach((k, i) => {
      const s2 = STARS[k], Lw2 = k === '1' ? snL() : s2.L * L_SUN, y = hy + 22 + i * 22, yrs = lifeSec(N.f, s2.m * M_SUN, Lw2) / YR, on = N.star === k;
      T(colx[0], y, s2.name, f2, on ? '#c47a00' : '#26324a', 'left', 800);
      T(colx[1], y, '태양의 ' + (k === '1' ? (snL() / L_SUN).toFixed(2) : s2.L.toLocaleString('ko-KR')) + '배', f2, on ? '#c47a00' : '#26324a', 'left', 800);
      T(colx[2], y, sci(yrs, 1) + ' 년', f2, on ? '#c47a00' : '#26324a', 'left', 800);
      if (!PHONE) T(colx[3], y, k === '1' ? '—' : (yrs < snLifeSun() ? '수명이 짧아요' : '수명이 길어요'), f2, '#5d6879', 'left', 700);
    });
    const ty = hy + 22 + 3 * 22 + 8;
    textBlock(cx, ty, Cc.w - 28, PHONE ? '태양 질량은 2×10³⁰ kg이라, 초당 줄어드는 약 4×10⁹ kg은 전체의 약 10⁻²¹배예요.' : '태양 질량은 2.0×10³⁰ kg이라 초당 줄어드는 약 4.2×10⁹ kg은 전체의 약 2×10⁻²¹배밖에 안 돼요. 큰 별일수록 연료는 많지만 훨씬 빨리 써서 수명이 짧아요.', PHONE ? 11.5 : 13, '#5d6879', PHONE ? 15 : 18, 700);
  }
  const snLifeSun = () => lifeSec(S.sn.f, M_SUN, snL()) / YR;

  /* ================= ④ 빛의 방출 ================= */
  const ltLay = () => PHONE
    ? { a: { x: 8, y: 8, w: 464, h: 270 }, b: { x: 8, y: 286, w: 464, h: 196 }, c: { x: 8, y: 490, w: 464, h: 182 } }
    : { a: { x: 12, y: 12, w: 400, h: 330 }, b: { x: 424, y: 12, w: 364, h: 330 }, c: { x: 12, y: 352, w: 776, h: 196 } };
  const LELL = 0.034, YR_PER_STEP = 123;                 // 한 걸음의 길이 (반지름 단위), 한 걸음에 해당하는 시간 (년)
  function newPhoton() { const L = S.lt; L.ph = { x: 0, y: 0, steps: 0, trail: [[0, 0]], st: 'walk', t: 0, ex: 0, ey: 0 }; L.nFire++; }
  function stepLight(dt) {
    const L = S.lt; if (!L.ph) newPhoton();
    L.R = SciSim.approach(L.R, 1 + 0.3 * (L.fu - 100) / 50, dt, 2.2);
    const ph = L.ph;
    if (ph.st === 'walk') {
      let n = RM ? 12 : Math.max(1, Math.round(dt * 170));
      for (let i = 0; i < n && ph.st === 'walk'; i++) {
        const a = Math.random() * TAU; ph.x += Math.cos(a) * LELL; ph.y += Math.sin(a) * LELL; ph.steps++;
        if (ph.steps % 3 === 0) { ph.trail.push([ph.x, ph.y]); if (ph.trail.length > 260) ph.trail.shift(); }
        if (Math.hypot(ph.x, ph.y) >= 0.97) { ph.st = 'exit'; ph.t = 0; const rr = Math.hypot(ph.x, ph.y); ph.ex = ph.x / rr; ph.ey = ph.y / rr; Sound.tick(); }
      }
    } else if (ph.st === 'exit') { ph.t += dt; if (ph.t > 2.2) { ph.st = 'done'; ph.t = 0; } }
    else if (ph.st === 'done') { ph.t += dt; if (ph.t > 1.6) newPhoton(); }
  }
  const ltYears = () => { const ph = S.lt.ph; return ph ? ph.steps * YR_PER_STEP : 0; };
  function drawLight() {
    const { a: A, b: Bp, c: Cc } = ltLay(), L = S.lt, ph = L.ph, fs = PHONE ? 12.5 : 13.5;
    panel(A.x, A.y, A.w, A.h, 14);
    T(A.x + 14, A.y + 22, '별의 단면: 중심에서 표면까지', PHONE ? 13 : 14.5, '#26324a', 'left', 800);
    const Rb = (PHONE ? 70 : 88), R = Rb * L.R, cx = A.x + A.w / 2, cy = A.y + A.h / 2 + (PHONE ? 6 : 8);
    const starCol = starColor(L.T);
    // 복사층(바깥)과 핵(안쪽), 광구(가장 바깥 띠)
    const gr = ctx.createRadialGradient(cx - R * 0.25, cy - R * 0.3, R * 0.1, cx, cy, R); gr.addColorStop(0, C.mix(starCol, '#ffffff', 0.45)); gr.addColorStop(1, C.mix(starCol, '#7a3a10', 0.35));
    D.glow(cx, cy, R * 1.5, starCol, 0.35);
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(cx, cy, R - 2, 0, TAU); ctx.stroke();
    D.glow(cx, cy, R * 0.3, '#fff3b0', 0.9);
    ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(122,58,16,.55)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(cx, cy, R * 0.25, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    T(cx, cy + 4, '핵융합', PHONE ? 11.5 : 12.5, '#7a3a10', 'center', 800);
    T(cx + R * 0.62, cy + R * 0.5, '복사층', PHONE ? 11.5 : 12.5, '#fff', 'center', 800, { stroke: 'rgba(122,58,16,.6)', strokeWidth: 3 });
    T(cx - R * 0.74, cy - R * 0.72, '광구 (표면)', PHONE ? 11.5 : 12.5, '#26324a', 'center', 800, { stroke: '#fff', strokeWidth: 3.5 });
    // 광자의 자취
    if (ph) {
      ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.beginPath();
      ph.trail.forEach((p, i) => { const x = cx + p[0] * R, y = cy + p[1] * R; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
      if (ph.st === 'walk') ctx.lineTo(cx + ph.x * R, cy + ph.y * R); ctx.stroke();
      if (ph.st === 'walk') { D.glow(cx + ph.x * R, cy + ph.y * R, 14, '#ffffff', 0.9); D.sphere(cx + ph.x * R, cy + ph.y * R, 4.2, '#ffffff', { gloss: false }); }
      else { const q = clamp(ph.t / 1.2, 0, 1), d = R + q * (Math.min(A.w, A.h) * 0.5 - R + 20); const x = cx + ph.ex * d, y = cy + ph.ey * d; if (ph.st === 'exit') { ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx + ph.ex * R, cy + ph.ey * R); ctx.lineTo(x, y); ctx.stroke(); D.glow(x, y, 16, starCol, 0.9); D.sphere(x, y, 5, '#ffffff', { gloss: false }); } }
    }
    // 중력과 압력
    const gl = 26, pl = 26 * L.fu / 100;
    const angs = [-0.5, 2.7];
    angs.forEach((a) => { const bx = cx + Math.cos(a) * (R + 30), by = cy + Math.sin(a) * (R + 30); D.arrow(bx, by, cx + Math.cos(a) * (R + 30 - gl), cy + Math.sin(a) * (R + 30 - gl), { color: '#5b6cf0', width: 3, head: 9 }); const bx2 = cx + Math.cos(a + 0.5) * (R + 6), by2 = cy + Math.sin(a + 0.5) * (R + 6); D.arrow(bx2, by2, cx + Math.cos(a + 0.5) * (R + 6 + pl), cy + Math.sin(a + 0.5) * (R + 6 + pl), { color: '#e2464b', width: 3, head: 9 }); });
    D.label(A.x + 74, A.y + A.h - 16, '중력 (안쪽으로)', { size: 11.5, bg: '#5b6cf0' }); D.label(A.x + 200, A.y + A.h - 16, '압력 (바깥쪽으로)', { size: 11.5, bg: '#e2464b' });
    const bal = L.fu === 100 ? '균형: 크기가 일정해요' : L.fu > 100 ? '압력이 더 커서 팽창해요' : '중력이 더 커서 수축해요';
    D.label(A.x + A.w - 14, A.y + 24, bal, { size: 12, bg: L.fu === 100 ? '#14a058' : '#c47a00', align: 'right' });
    if (ph && ph.st === 'walk') T(A.x + 14, A.y + A.h - 42, '광자의 이동 시간: 약 ' + Math.max(1, Math.round(ltYears() / 1e4)) + '만 년 경과 (모형)', PHONE ? 11 : 12, '#26324a', 'left', 800);
    else if (ph) T(A.x + 14, A.y + A.h - 42, ph.st === 'exit' ? '표면에서 우주로! 지구까지 약 8분 20초' : '표면까지 약 ' + Math.max(1, Math.round(ph.steps * YR_PER_STEP / 1e4)) + '만 년 걸렸어요', PHONE ? 11 : 12, '#0f7a42', 'left', 800);

    // B: 색과 스펙트럼
    panel(Bp.x, Bp.y, Bp.w, Bp.h, 14);
    T(Bp.x + 14, Bp.y + 22, '표면 온도 ' + L.T.toLocaleString('ko-KR') + ' K 의 별빛', PHONE ? 12.5 : 14.5, '#26324a', 'left', 800);
    const dcx = Bp.x + (PHONE ? 52 : 62), dcy = Bp.y + (PHONE ? 78 : 86);
    D.glow(dcx, dcy, 56, starCol, 0.55); D.sphere(dcx, dcy, PHONE ? 28 : 34, starCol, { shadow: true });
    const label = L.T <= 3600 ? '붉은 별' : L.T <= 6000 ? '노란 별 (태양 같은 별)' : '청백색 별';
    T(dcx + (PHONE ? 44 : 52), dcy - 6, label, PHONE ? 13 : 14.5, '#26324a', 'left', 800);
    T(dcx + (PHONE ? 44 : 52), dcy + 14, L.T >= 10000 ? '표면 온도가 높을수록 푸른빛이 강해요' : L.T <= 3600 ? '표면 온도가 낮을수록 붉은빛이 강해요' : '붉은빛과 푸른빛이 섞여 노랗게 보여요', PHONE ? 10.5 : 11.5, '#5d6879', 'left', 700);
    const gx = Bp.x + (PHONE ? 20 : 24), gw = Bp.w - (PHONE ? 36 : 44), gy = Bp.y + (PHONE ? 122 : 136), gh = PHONE ? 52 : 134;
    const lams = []; for (let l = 300; l <= 1000; l += 10) lams.push(l);
    const vals = lams.map((l) => planck(l, L.T)), vmax = Math.max.apply(null, vals);
    // 가시광선 띠
    for (let px = 0; px < gw; px += 2) { const lam = 300 + (px / gw) * 700; if (lam >= 380 && lam <= 780) { ctx.fillStyle = wlColor(lam); ctx.globalAlpha = 0.28; ctx.fillRect(gx + px, gy, 2, gh); ctx.globalAlpha = 1; } }
    ctx.strokeStyle = '#5d6879'; ctx.lineWidth = 1.4; ctx.strokeRect(gx, gy, gw, gh);
    ctx.strokeStyle = '#26324a'; ctx.lineWidth = 2.6; ctx.beginPath();
    lams.forEach((l, i) => { const x = gx + (l - 300) / 700 * gw, y = gy + gh - 4 - (vals[i] / vmax) * (gh - 12); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }); ctx.stroke();
    [400, 500, 600, 700, 800, 900].forEach((v) => T(gx + (v - 300) / 700 * gw, gy + gh + 14, v + '', 11, '#5d6879', 'center', 700));
    T(gx + gw, gy + gh + 28, '파장 (nm)', 11.5, '#26324a', 'right', 800); T(gx, gy - 6, '세기 (상대)', 11.5, '#26324a', 'left', 800);
    T(gx + (580 - 300) / 700 * gw, gy + gh - 7, '← 가시광선 →', 10.5, '#5d6879', 'center', 700);

    // C: 에너지가 이동하는 길
    panel(Cc.x, Cc.y, Cc.w, Cc.h, 14);
    T(Cc.x + 14, Cc.y + 22, '에너지가 별 밖으로 나가는 길', PHONE ? 12.5 : 14.5, '#26324a', 'left', 800);
    const stages = [['⚛️ 핵융합', '중심 약 1.5×10⁷ K', '에너지를 만들어요'], ['↔ 복사층', '광자가 충돌·흡수·재방출', '수만~수십만 년'], ['🔆 광구', '표면 약 5800 K (태양)', '열복사로 빛 방출'], ['🌌 우주', '지구까지 약 8분 20초', '별빛으로 도착']];
    const cur = !ph ? 0 : ph.st === 'walk' ? (Math.hypot(ph.x, ph.y) < 0.25 ? 0 : 1) : ph.st === 'exit' ? 2 : 3;
    const bw2 = PHONE ? (Cc.w - 28 - 9) / 2 : (Cc.w - 28 - 3 * 22) / 4, bh2 = PHONE ? 62 : 92;
    stages.forEach((s, i) => {
      const x = Cc.x + 14 + (PHONE ? (i % 2) * (bw2 + 9) : i * (bw2 + 22)), y = Cc.y + 36 + (PHONE ? Math.floor(i / 2) * (bh2 + 8) : 4);
      D.shadow(() => { D.roundRect(x, y, bw2, bh2, 12); ctx.fillStyle = i === cur ? '#fff3d6' : '#f3f6fb'; ctx.fill(); }, { blur: 4, y: 1 });
      ctx.strokeStyle = i === cur ? '#f26b3a' : '#d5dbe8'; ctx.lineWidth = i === cur ? 2.4 : 1.2; D.roundRect(x, y, bw2, bh2, 12); ctx.stroke();
      T(x + bw2 / 2, y + (PHONE ? 18 : 24), s[0], PHONE ? 12.5 : 15, '#26324a', 'center', 800);
      T(x + bw2 / 2, y + (PHONE ? 35 : 48), s[1], PHONE ? 10.5 : 11.5, '#5d6879', 'center', 700);
      T(x + bw2 / 2, y + (PHONE ? 50 : 66), s[2], PHONE ? 10.5 : 12, '#7a5bc8', 'center', 800);
      if (!PHONE && i < 3) { const ax1 = x + bw2 + 3, ay = y + bh2 / 2; D.arrow(ax1, ay, ax1 + 16, ay, { color: '#9aa5b8', width: 2.4, head: 7 }); }
    });
    if (!PHONE) textBlock(Cc.x + 14, Cc.y + 148, Cc.w - 28, '중심에서 생긴 고에너지 광자가 입자와 부딪치고 흡수·재방출되며 이리저리 방향을 바꾸다 보니, 표면까지 나오는 데 수만~수십만 년이 걸려요. 표면에서는 열복사로 연속 스펙트럼의 빛이 우주로 나가요.', 13, '#5d6879', 18, 700);
  }

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    if (S.mode === 'cond') {
      const P = cdPhys();
      setReadouts('온도 T', fmtT(P.T), '열에너지 kT', fmtE(P.Ek), '가장 가까운 거리', P.contact ? '2 fm (융합)' : P.lgr > 4 ? '10⁴ fm 밖' : sci(P.rmin, 1) + ' fm');
    } else if (S.mode === 'mass') {
      const M = S.ms, rev = M.revealDm || (game && game.free);
      setReadouts('질량 결손 Δm', rev ? DM.toFixed(5) + ' u' : '계산해 보세요', '방출 에너지', M.conv || (game && game.free && M.fused) ? E_FUS.toFixed(1) + ' MeV' : '—', '핵융합', M.fused ? '일어남' : M.anim ? '진행 중' : '전');
    } else if (S.mode === 'sun') {
      const N = S.sn, rev = N.reveal || (game && game.free);
      setReadouts('질량 손실률 L/c²', rev ? sci(snL() / C2, 1) + ' kg/s' : '계산해 보세요', '선택한 별', snStar().name, '수명 (연료 ' + N.f + ' %)', sci(snLife(), 1) + ' 년');
    } else {
      const L = S.lt;
      setReadouts('표면 온도', L.T.toLocaleString('ko-KR') + ' K', '별의 색', L.T <= 3600 ? '붉은색' : L.T <= 6000 ? '노란색' : '청백색', '핵융합 세기', L.fu + ' % ' + (L.fu === 100 ? '(균형)' : L.fu > 100 ? '(팽창)' : '(수축)'));
    }
  }

  /* ================= 미션 ================= */
  const levels = [
    {
      title: '핵융합 조건: 장벽과 열에너지', short: '핵융합 조건', icon: '🌡️', phase: '탐구',
      intro: '<p class="si-q">❓ 탐구 질문: 별은 어떻게 수십억 년 동안 꺼지지 않고 빛날까? 별빛은 어디에서 오는 걸까?</p>' +
        '<div class="si-link">🔗 <b>통합과학에서</b> 별 속에서 수소 4개가 헬륨 1개로 바뀌는 핵융합(질량이 약 0.7 % 줄어요)을 배웠어요. 앞 차시 <b>터널 효과</b>에서는 에너지가 부족해도 장벽을 확률적으로 통과할 수 있다는 것을 봤어요. 이번 차시에서는 이 두 가지를 정량적으로 이어 봐요.</div>' +
        '<p>두 양성자는 모두 (+)전하라서 서로 밀어내요. 핵력이 작용하는 약 <b>2 fm</b>(2×10⁻¹⁵ m)까지 다가가려면 쿨롱 장벽 <b>약 0.7 MeV</b>를 넘어야 해요. 그런데 태양 중심(1.5×10⁷ K)의 평균 열에너지는 <b>약 1.3 keV</b>밖에 안 돼요. 온도를 올리며 양성자가 얼마나 가까이 가는지 살펴봐요.</p>',
      features: ['cond'],
      setup() { S.show.selA = false; S.cd.seen = {}; markT(S.cd.lv); S.cd.tn = 'off'; setScene('cond'); },
      recap: '두 양성자가 핵융합하려면 쿨롱 장벽(약 0.7 MeV)을 넘어 약 2 fm까지 접근해야 해요. 태양 중심(약 1.5×10⁷ K)의 열에너지 약 1.3 keV는 장벽의 약 1/500밖에 안 돼서 고전적으로는 약 10¹⁰ K가 필요해요. 실제로는 터널 효과로 일부 양성자가 장벽을 통과해 융합해요.',
      summary: '<ul><li>핵융합은 양성자 사이의 전기적 반발(쿨롱 장벽)을 넘어 약 2 fm(2×10⁻¹⁵ m)까지 접근해야 해서 매우 높은 온도와 압력이 필요해요.</li><li>쿨롱 장벽: r = 2 fm에서 ke²/r = 9.0×10⁹ × (1.6×10⁻¹⁹)² / (2×10⁻¹⁵) = 1.2×10⁻¹³ J ≈ <b>0.7 MeV</b>.</li><li>태양 중심(1.5×10⁷ K)의 열에너지 kT = 1.38×10⁻²³ × 1.5×10⁷ ≈ 2.1×10⁻¹⁶ J ≈ <b>1.3 keV</b> → 장벽의 약 1/500. 고전적으로는 약 10¹⁰ K가 필요해요.</li><li><b>터널 효과</b>: 일부 양성자가 장벽을 통과해 융합해요. 확률은 아주 작지만 태양 중심에 양성자가 약 10⁵⁶개나 있어서 꾸준히 일어나요. 터널 효과가 없었다면 태양은 빛나지 못해요.</li></ul>',
      missions: [
        {
          title: '온도를 바꿔 접근 거리 관찰하기',
          goal: '온도를 <b>10⁴ K 이하</b>, <b>태양 중심(1.5×10⁷ K)</b>, <b>10¹⁰ K</b>로 각각 맞추고 양성자가 얼마나 가까이 가는지 살펴보세요.',
          hint: '“자주 쓰는 온도” 버튼을 누르면 빨라요. 온도가 높을수록 가장 가까운 거리가 어떻게 달라지는지, 그래프에서 열에너지 선이 장벽 곡선과 만나는 점을 보세요.',
          setup() { S.show.selA = false; S.cd.seen = {}; setScene('cond'); },
          check: () => !!(S.cd.seen.low && S.cd.seen.sun && S.cd.seen.high),
          hold: 0.5,
          status: () => mark(!!S.cd.seen.low) + ' 10⁴ K 이하 &nbsp; ' + mark(!!S.cd.seen.sun) + ' 태양 중심 &nbsp; ' + mark(!!S.cd.seen.high) + ' 10¹⁰ K &nbsp; · 지금 ' + fmtT(tOf(S.cd.lv)),
          explain: '온도가 낮으면 양성자가 멀리서 튕겨요. 태양 중심(1.5×10⁷ K)에서도 가장 가까운 거리가 약 1.1×10³ fm(1000 fm 남짓)로 핵력이 작용하는 2 fm에는 훨씬 못 미쳐요. 열에너지가 장벽 0.72 MeV에 이르는 약 10¹⁰ K가 되어야 고전적으로 2 fm까지 다가가 융합해요.',
        },
        {
          title: '장벽과 열에너지 비교하기', manual: true,
          goal: '<b>태양 중심(1.5×10⁷ K)</b>으로 온도를 맞춘 뒤, 읽은 값으로 두 문제를 풀어요.',
          hint: '0.72 MeV = 720 keV예요. 열에너지 약 1.3 keV와 나누어 몇 배인지 어림해요. 고전적으로 장벽을 넘으려면 어느 온도에서 열에너지가 0.72 MeV에 이르는지 그래프에서 확인해요.',
          setup() { S.show.selA = true; SEL_A.reset(); setScene('cond'); },
          check() { if (!S.cd.seen.sun) return '먼저 온도를 태양 중심(1.5×10⁷ K)에 맞춰 열에너지를 읽어 보세요.'; return SEL_A.grade(); },
          status: () => mark(!!S.cd.seen.sun) + ' 태양 중심 온도 맞춤 &nbsp; · 고른 문제 ' + SEL_A.count() + ' / 2',
          explain: '장벽 약 720 keV를 태양 중심의 열에너지 약 1.3 keV로 나누면 약 <b>500배</b>예요. 열에너지가 장벽(0.72 MeV)과 비슷해지려면 T = E/k ≈ (7.2×10⁵ eV) / (8.6×10⁻⁵ eV/K) ≈ 8×10⁹ ~ 10¹⁰ K가 필요해요. 그래서 터널 효과가 없다면 태양은 핵융합을 못 해요.',
        },
        {
          type: 'quiz', title: '1.5×10⁷ K에서도 핵융합이 되는 까닭',
          goal: '태양 중심은 1.5×10⁷ K밖에 안 되는데도 핵융합이 일어나요. 그 까닭은?',
          setup() { S.show.selA = false; setScene('cond'); },
          choices: ['별 속은 핵융합이 일어나는 온도보다 충분히 뜨겁기 때문에', '열에너지가 모든 양성자에게 장벽보다 큰 값으로 고르게 나뉘기 때문에', '일부 양성자가 터널 효과로 쿨롱 장벽을 통과하고, 양성자의 수가 엄청나게 많아서 꾸준히 일어나기 때문에', '양성자 사이에는 전기적 반발력이 거의 없기 때문에'],
          answer: 2,
          feedback: ['고전적으로는 약 10¹⁰ K가 필요해요. 태양 중심은 그보다 훨씬 낮아요.', '열에너지는 평균이 약 1.3 keV 정도라서 모든 양성자가 장벽(0.72 MeV)을 넘을 수 없어요.', '', '양성자끼리는 같은 전하라 서로 강하게 밀어내요. 그 장벽을 터널링해서 통과해요.'],
          explain: '평균 열에너지는 장벽의 약 1/500밖에 안 돼서 고전적으로는 융합이 일어나지 않아요. 하지만 양성자가 <b>터널 효과</b>로 장벽을 통과할 확률이 0이 아니고, 태양 중심에는 양성자가 약 10⁵⁶개나 있어서 확률이 아주 작아도 융합이 꾸준히 일어나요.',
        },
      ],
    },
    {
      title: '질량 결손: 줄어든 질량은 에너지로', short: '질량 결손', icon: '⚖️', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 터널 효과로 양성자들이 융합할 수 있다는 것을 알았어요. 그렇다면 융합할 때 에너지는 얼마나 나올까요?</div>' +
        '<p>수소 핵(양성자) 4개가 헬륨 핵 1개로 바뀌면 질량이 조금 <b>줄어요</b>. 줄어든 질량 Δm(<b>질량 결손</b>)은 사라지는 것이 아니라 <b>E = Δm c²</b>의 에너지가 되어 나와요. 1 u(원자 질량 단위)는 931.5 MeV/c²에 해당해서 Δm(u)에 931.5를 곱하면 MeV가 돼요.</p>',
      features: ['mass'],
      setup() { S.show.numB = false; S.ms.revealDm = false; resetMass(); setScene('mass'); },
      recap: '양성자 4개(4.02912 u)가 헬륨 핵 1개(4.00151 u)가 되면 질량이 Δm = 0.02761 u(약 0.69 %) 줄고, 이 질량이 E = Δmc² = 0.02761 × 931.5 ≈ 25.7 MeV의 에너지가 돼요. 화학 반응(약 4 eV)에 비해 반응 한 번당 수백만 배 큰 에너지예요.',
      summary: '<ul><li>핵 질량: 양성자 1.00728 u, 헬륨-4 핵 4.00151 u. 4×1.00728 = 4.02912 u → <b>Δm = 4.02912 − 4.00151 = 0.02761 u</b>(약 0.69 %).</li><li>1 u = 931.5 MeV/c² → <b>E = Δm c² = 0.02761 × 931.5 ≈ 25.7 MeV</b>(≈ 4.1×10⁻¹² J). 이 값은 양성자 4개와 헬륨 핵의 질량 차에서 계산한 값이에요. 양전자 2개가 전자 2개와 만나 사라지며 내는 에너지까지 합친 총에너지는 약 26.7 MeV이고, 중성미자가 가져가는 약 0.5 MeV도 그 안에 들어 있어요.</li><li>질량 · 에너지 막대: 반응 전 100 % → 반응 후 헬륨 핵 99.31 % + 방출 에너지 0.69 %.</li><li>화학 반응(탄소가 타서 CO₂ 될 때 약 4 eV)과 달리 핵반응에서는 질량의 변화를 무시할 수 없어요. 화학 반응에서는 질량이 보존되는 것처럼 보여요.</li></ul>',
      missions: [
        {
          title: '질량 결손 계산하기', manual: true,
          goal: '“핵융합 일으키기”를 눌러 양성자 4개가 헬륨 핵이 되는 것을 보고, 질량 결손 <b>Δm</b>을 계산해 입력하세요.',
          hint: '양성자 4개의 질량 4.02912 u에서 헬륨 핵의 질량 4.00151 u를 빼요. 4.02912 − 4.00151 = ?',
          setup() { S.show.numB = true; NUM_B.reset(); S.ms.revealDm = false; setScene('mass'); },
          check() { if (!S.ms.fused) return '먼저 “핵융합 일으키기”를 눌러 융합이 끝나는 것을 지켜보세요.'; const r = NUM_B.grade(); if (r === true) S.ms.revealDm = true; return r; },
          status: () => mark(S.ms.fused) + ' 핵융합 관찰 &nbsp; ' + mark(NUM_B.count() > 0) + ' Δm 입력',
          explain: '양성자 4개의 질량은 4 × 1.00728 = 4.02912 u이고 헬륨 핵은 4.00151 u예요. 차이 <b>Δm = 0.02761 u</b>가 질량 결손이에요. 반응 전 질량의 0.02761 / 4.02912 ≈ 0.0069, 즉 약 0.69 %가 줄어든 거예요.',
        },
        {
          title: '질량을 에너지로 환산하기',
          goal: '“질량 → 에너지 변환” 버튼으로 <b>E = Δm × 931.5 MeV/u</b>를 계산하고, 방출 에너지를 확인하세요.',
          hint: '먼저 핵융합이 끝나야 변환 버튼이 켜져요. 변환하면 25.7 MeV가 나타나고 화학 반응과 비교하는 막대가 그려져요.',
          setup() { S.show.numB = false; if (!S.ms.fused) { S.ms.conv = false; } setScene('mass'); },
          check: () => S.ms.fused && S.ms.conv && S.ms.convT >= 1,
          hold: 0.5,
          status: () => mark(S.ms.fused) + ' 핵융합 관찰 &nbsp; ' + mark(S.ms.conv && S.ms.convT >= 1) + ' 변환: ' + (S.ms.conv && S.ms.convT >= 1 ? E_FUS.toFixed(1) + ' MeV' : '아직'),
          explain: 'E = Δm c² = 0.02761 u × 931.5 MeV/u ≈ <b>25.7 MeV</b>(약 4.1×10⁻¹² J)예요. 탄소 한 개가 타서 이산화 탄소가 될 때 나오는 약 4 eV의 약 640만 배로, 같은 질량의 연료로 비교하면 수천만 배 이상 차이 나요.',
        },
        {
          type: 'quiz', title: '줄어든 질량은 어디로 갔을까?',
          goal: '핵융합 뒤에 줄어든 질량은 어디로 갔을까요?',
          setup() { S.show.numB = false; setScene('mass'); },
          choices: ['질량은 반응 전후에 늘 같아서 줄어들지 않아요', '에너지로 바뀌어 빛과 열 등으로 나가요 (질량과 에너지는 동등해요)', '그냥 사라져 버려요', '헬륨 핵 속에 숨어 있어서 저울에 안 보여요'],
          answer: 1,
          feedback: ['화학 반응에서는 질량이 보존되는 것처럼 보이지만, 핵반응에서는 질량이 눈에 띄게 줄어요.', '', '사라지는 것이 아니에요. E = Δm c²만큼의 에너지로 바뀌어요.', '헬륨 핵의 질량은 4.00151 u로 이미 측정된 값이고 양성자 4개보다 작아요. 차이는 에너지로 나갔어요.'],
          explain: '질량과 에너지는 서로 바뀔 수 있고, 줄어든 질량 Δm은 <b>E = Δm c²</b>의 에너지로 나가요. 화학 반응에서는 이 질량 변화가 너무 작아서 질량이 보존되는 것처럼 보이지만, 핵융합에서는 약 0.69 %로 뚜렷해요.',
        },
      ],
    },
    {
      title: '태양의 수지: 얼마나 쓰고 얼마나 남을까', short: '태양의 수지', icon: '☀️', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 질량 0.69 %가 에너지로 바뀐다는 것을 계산했어요. 이제 태양이 매초 내보내는 에너지(광도 L = 3.8×10²⁶ W)를 질량으로 바꿔서 <b>태양이 얼마나 쓰고 있는지</b> 알아봐요.</div>' +
        '<p>태양은 매초 L의 에너지를 내보내요. 줄어드는 질량은 <b>m = L / c²</b>이고, 줄어든 질량이 연료 질량의 0.69 %이므로 소모하는 수소는 <b>m / 0.0069</b>예요. 연료 중 일부(예: 10 %)가 핵융합에 쓰인다면 수명은 <b>(방출 총에너지) / L</b>로 어림할 수 있어요.</p>',
      features: ['sun'],
      setup() { S.show.numC = false; S.sn.reveal = false; S.sn.L = 38; slLs.set(38); S.sn.f = 30; slFr.set(30); S.sn.star = '1'; S.sn.seen = { '1': true }; setScene('sun'); },
      recap: '태양은 매초 약 4.2×10⁹ kg(약 420만 톤)의 질량을 에너지로 바꾸고, 약 6.1×10¹¹ kg(약 6억 톤)의 수소를 소모해요. 그래도 태양 질량(2×10³⁰ kg)에 비하면 아주 작아서 연료의 약 10 %를 쓴다고 보면 수명이 약 100억 년이에요. 질량이 큰 별일수록 훨씬 빨리 써서 수명이 짧아요.',
      summary: '<ul><li>태양 광도 L = 3.8×10²⁶ W → 초당 질량 손실 m = L / c² = 3.8×10²⁶ / 9.0×10¹⁶ ≈ <b>4.2×10⁹ kg/s</b>(약 420만 톤/s, 하루 약 3.6×10¹⁴ kg).</li><li>소모하는 수소 = m / 0.0069 ≈ <b>6.1×10¹¹ kg/s</b>(약 6억 톤/s).</li><li>수명 어림(연료의 10 %): E = 0.10 × 2.0×10³⁰ × 0.0069 × 9.0×10¹⁶ ≈ 1.2×10⁴⁴ J → E/L ≈ 3.3×10¹⁷ s ≈ <b>1.0×10¹⁰ 년</b>(약 100억 년, 지금 나이 약 46억 년).</li><li>질량이 큰 별일수록 연료는 많지만 광도가 훨씬 커서 수명이 짧아요(0.5 태양질량 약 700억 년, 10 태양질량 약 2500만 년).</li></ul>',
      missions: [
        {
          title: '질량 손실률 계산하기', manual: true,
          goal: '태양 광도 <b>L = 3.8×10²⁶ W</b>일 때 초당 줄어드는 질량 <b>m = L / c²</b>을 계산해 입력하세요. (c² = 9.0×10¹⁶ m²/s²)',
          hint: '3.8×10²⁶ / 9.0×10¹⁶ = (3.8 / 9.0) × 10¹⁰ = 0.42×10¹⁰ = 4.2×10⁹ kg/s예요. 칸에는 4.2를 써요.',
          setup() { S.show.numC = true; NUM_C.reset(); S.sn.reveal = false; S.sn.L = 38; slLs.set(38); S.sn.star = '1'; msSeg.set('1'); setScene('sun'); },
          check() { const r = NUM_C.grade(); if (r === true) S.sn.reveal = true; return r; },
          status: () => '입력한 칸 ' + NUM_C.count() + ' / 1 &nbsp; · 광도 ' + sci(snL(), 1) + ' W',
          explain: 'm = L / c² = 3.8×10²⁶ / 9.0×10¹⁶ ≈ <b>4.2×10⁹ kg/s</b>(약 420만 톤)예요. 이만큼의 질량이 매초 에너지로 바뀌어요. 줄어드는 질량이 연료의 0.69 %이므로 매초 소모하는 수소는 4.2×10⁹ / 0.0069 ≈ 6.1×10¹¹ kg(약 6억 톤)이에요.',
        },
        {
          title: '태양의 수명 어림하기',
          goal: '“태양(1)”을 고르고 연료로 쓰는 비율을 <b>10 %</b>로 맞춰 수명이 약 100억 년이 되는 것을 확인한 뒤, <b>10 태양질량</b> 별의 수명도 살펴보세요.',
          hint: '광도는 3.8×10²⁶ W로 두어요. “연료로 쓰는 비율” 슬라이더를 10으로 맞추면 태양의 수명이 1.0×10¹⁰ 년이 돼요. 그다음 “10 태양질량” 버튼을 눌러요.',
          setup() { S.show.numC = false; S.sn.seen = { [S.sn.star]: true }; S.sn.hit = false; setScene('sun'); },
          check: () => { const N = S.sn; if (N.star === '1' && N.f === 10 && N.L === 38) N.hit = true; return N.hit && !!N.seen['10']; },
          hold: 0.5,
          status: () => mark(S.sn.hit) + ' 태양 · 광도 3.8 · 10 % → 약 100억 년 &nbsp; ' + mark(!!S.sn.seen['10']) + ' 10 태양질량 확인',
          explain: '연료의 10 %를 쓴다면 방출 총에너지는 0.10 × 2.0×10³⁰ × 0.0069 × 9.0×10¹⁶ ≈ 1.2×10⁴⁴ J이고, 수명은 E / L ≈ 1.2×10⁴⁴ / 3.8×10²⁶ ≈ 3.3×10¹⁷ s ≈ <b>1.0×10¹⁰ 년</b>이에요. 10 태양질량 별은 광도가 약 4100배라 같은 비율을 써도 수명이 약 2.5×10⁷ 년으로 훨씬 짧아요.',
        },
        {
          type: 'quiz', title: '매초 400만 톤씩 줄어도 괜찮은 까닭',
          goal: '태양이 매초 약 400만 톤씩 줄어드는데도 앞으로 수십억 년 더 빛날 수 있는 까닭은?',
          setup() { S.show.numC = false; setScene('sun'); },
          choices: ['태양은 줄어든 만큼 우주에서 새 수소를 빨아들이기 때문에', '태양 질량이 2×10³⁰ kg으로 아주 커서, 초당 줄어드는 양은 전체의 약 10⁻²¹배밖에 안 되기 때문에', '핵융합은 사실 질량이 줄지 않는 반응이기 때문에', '태양이 에너지를 거의 내보내지 않기 때문에'],
          answer: 1,
          feedback: ['태양은 우주에서 수소를 보충받지 않아요. 가지고 있는 수소를 쓰는 거예요.', '', '핵융합에서는 질량이 약 0.69 % 줄어요. 그 질량이 에너지로 나가요.', '태양은 매초 3.8×10²⁶ W나 되는 에너지를 내보내요. 다만 질량이 너무 커서 오래 갈 뿐이에요.'],
          explain: '초당 줄어드는 질량 4.2×10⁹ kg은 태양 질량 2.0×10³⁰ kg의 약 2×10⁻²¹배예요. 연료의 일부(약 10 %)만 쓰더라도 약 100억 년을 쓸 수 있고, 지금까지 쓴 시간은 약 46억 년이라 앞으로 수십억 년 더 빛나요.',
        },
      ],
    },
    {
      title: '빛의 방출: 별빛이 되는 길', short: '빛의 방출', icon: '✨', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 별이 질량 일부를 에너지로 바꾸며 오래 빛난다는 것을 계산했어요. 그 에너지는 어떻게 별 <b>밖으로</b> 나와 우리 눈에 보이는 별빛이 될까요?</div>' +
        '<p>중심에서 생긴 고에너지 광자는 입자와 충돌 · 흡수 · 재방출을 되풀이하며 이리저리 방향을 바꿔서 표면까지 <b>수만~수십만 년</b>이 걸려요. 표면(<b>광구</b>)에서는 열복사로 연속 스펙트럼의 빛이 우주로 나가요(지구까지 약 8분 20초). 표면 온도가 높을수록 푸른빛이 강해요. 한편 별 안에서는 <b>중력(안쪽)</b>과 핵융합이 만드는 <b>압력(바깥쪽)</b>이 균형을 이루어 크기가 일정하게 유지돼요.</p>',
      features: ['light'],
      setup() { S.show.selO = false; S.lt.T = 5800; S.lt.seen = { '5800': true }; S.lt.fu = 100; slFu.set(100); newPhoton(); setScene('light'); },
      recap: '중심의 핵융합으로 생긴 에너지는 복사층에서 광자가 수없이 충돌·흡수·재방출되며 수만~수십만 년에 걸쳐 표면에 이르고, 광구에서 열복사로 우주로 나가요. 표면 온도가 높을수록 푸른빛이 강한 청백색 별, 낮을수록 붉은 별이에요. 중력과 압력이 균형을 이룰 때 별은 오래 안정하게 빛나요.',
      summary: '<ul><li><b>에너지의 이동</b>: 중심핵(약 1.5×10⁷ K)에서 핵융합 → 복사층에서 광자가 충돌 · 흡수 · 재방출을 되풀이하며 수만~수십만 년 → 표면(광구, 약 5800 K)에서 열복사 → 우주로(지구까지 약 8분 20초).</li><li><b>표면 온도와 색</b>: 약 10000 K 이상은 청백색, 약 5800 K는 노란색(태양), 약 3500 K는 붉은색. 온도가 높을수록 연속 스펙트럼에서 푸른 쪽이 강해져요.</li><li><b>힘의 균형</b>: 중력(수축)과 핵융합 압력(팽창)이 균형을 이루면 별은 크기가 일정하게 오래 빛나요. 균형이 깨지면 수축하거나 팽창해요.</li></ul>',
      missions: [
        {
          title: '표면 온도와 별의 색',
          goal: '표면 온도를 <b>3500 K</b>(붉은 별), <b>5800 K</b>(노란 별), <b>10000 K 이상</b>(청백색 별)으로 바꾸며 색과 스펙트럼의 변화를 살펴보세요.',
          hint: '“별의 표면 온도” 버튼을 차례로 눌러요. 오른쪽 그래프에서 온도가 높아질수록 파란색 쪽(왼쪽)의 세기가 어떻게 달라지는지 보세요.',
          setup() { S.show.selO = false; S.lt.seen = { [S.lt.T]: true }; setScene('light'); },
          check: () => !!(S.lt.seen['3500'] && S.lt.seen['5800'] && (S.lt.seen['10000'] || S.lt.seen['30000'])),
          hold: 0.5,
          status: () => mark(!!S.lt.seen['3500']) + ' 3500 K &nbsp; ' + mark(!!S.lt.seen['5800']) + ' 5800 K &nbsp; ' + mark(!!(S.lt.seen['10000'] || S.lt.seen['30000'])) + ' 10000 K 이상',
          explain: '표면 온도가 <b>높을수록</b> 연속 스펙트럼에서 푸른 쪽의 세기가 커져서 청백색으로 보이고, <b>낮을수록</b> 붉은 쪽이 강해서 붉게 보여요. 태양(약 5800 K)은 가시광선 전체에 걸쳐 고르게 세어서 노랗게 보여요.',
        },
        {
          title: '에너지가 나가는 순서 정리하기', manual: true,
          goal: '별의 중심에서 만들어진 에너지가 우주로 나가기까지의 순서를 <b>1번째부터 4번째</b>까지 골라 배열하세요.',
          hint: '광자의 움직임을 지켜보세요. 중심에서 시작해서 복사층을 오래 헤매다가 표면에서 우주로 나가요.',
          setup() { S.show.selO = true; SEL_O.reset(); setScene('light'); },
          check() { const r = SEL_O.grade(); if (r === true) return true; return r; },
          status: () => '고른 순서 ' + SEL_O.count() + ' / 4',
          explain: '<b>핵융합</b>(중심에서 에너지 생성) → <b>복사</b>(복사층에서 광자가 충돌·흡수·재방출하며 이동, 수만~수십만 년) → <b>표면</b>(광구에서 열복사로 빛 방출) → <b>우주</b>(지구까지 약 8분 20초) 순서예요.',
        },
        {
          type: 'quiz', title: '별빛이 되기까지 오래 걸리는 까닭',
          goal: '중심에서 만들어진 에너지가 눈에 보이는 가시광선이 되어 별 밖으로 나오기까지 수만~수십만 년이나 걸리는 까닭은?',
          setup() { S.show.selO = false; setScene('light'); },
          choices: ['광자가 아주 느린 속력으로만 날 수 있기 때문에', '광자가 입자와 충돌 · 흡수 · 재방출을 수없이 되풀이하며 이리저리 방향을 바꾸기 때문에', '중심에서는 빛이 만들어지지 않고 표면에서만 만들어지기 때문에', '별의 크기가 우주만큼 크기 때문에'],
          answer: 1,
          feedback: ['빛의 속력은 같아요. 별 속에서는 직진하지 못하고 무작위로 방향을 바꾸는 것이 문제예요.', '', '핵융합은 중심에서 일어나요. 에너지가 표면까지 나오는 데 오래 걸리는 거예요.', '태양의 반지름은 약 70만 km이고, 곧게 나가면 몇 초면 나올 거리예요.'],
          explain: '별 속은 입자가 빽빽해서 광자가 곧게 나아가지 못하고 충돌 · 흡수 · 재방출을 수없이 되풀이하며 <b>무작위로 걷는 것</b>처럼 나아가요. 그래서 곧게 나가면 몇 초면 될 거리인데도 표면까지 수만~수십만 년이 걸려요. 표면에서 나온 빛은 지구까지 약 8분 20초면 도착해요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hq-stellar-fusion', mount: '#game', badge: '별의 에너지 탐험가', homeHref: '../../index.html#hq',
    featureLabels: { cond: '🌡️ 온도 · 쿨롱 장벽 그래프 · 터널 효과 스위치', mass: '⚖️ 입자 저울 · E = Δmc² 변환기', sun: '☀️ 질량 손실 · 수소 소모 · 수명 계산기', light: '✨ 태양 단면 · 광자 이동 · 별빛 스펙트럼' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  setScene('cond');
  updateCtl();
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t; S.dt = dt;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    view.apply();
    stepCond(dt); stepMass(dt); stepLight(dt);
    ctx.clearRect(0, 0, VW, VH);
    if (S.mode === 'cond') drawCond(); else if (S.mode === 'mass') drawMass(); else if (S.mode === 'sun') drawSun(); else drawLight();
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, MA, SEL_A, SEL_O, NUM_B, NUM_C, slT, slLs, slFr, slFu, setScene, updateCtl, startFuse, resetMass, newPhoton, cdPhys, snLife, DM, E_FUS, FRAC, gamowLog, fmtE, fmtLog, starColor,
    get game() { return game; },
  };

})();
