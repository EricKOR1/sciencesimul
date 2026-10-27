(function () {
  'use strict';
  const { $, $$, clamp, Sound, toast } = SciSim;

  /* ---------- 상수 · 도우미 ---------- */
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const RM = SciSim.reduceMotion;
  const TAU = Math.PI * 2;
  const mark = (b) => (b ? '✅' : '⬜');
  const smooth = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const comma = (n) => String(Math.round(n)).replace(/(\d)(?=(\d{3})+$)/g, '$1,');
  const rnd = (a, b) => a + Math.random() * (b - a);
  const approach = (cur, tgt, dt, rate) => (RM ? tgt : SciSim.approach(cur, tgt, dt, rate));
  // 받침 유무에 따라 조사 고르기: josa('사과', '이/가') -> '가'
  const josa = (word, pair) => {
    const ch = String(word).charCodeAt(String(word).length - 1);
    const has = ch >= 0xac00 && ch <= 0xd7a3 && (ch - 0xac00) % 28 !== 0;
    const [a, b] = pair.split('/');
    return has ? a : b;
  };

  let view, ctx, D, VW, VH, FS;
  const parts = new SciSim.Particles();
  function initStage(bg, tw, th, pw, ph, fs) {
    VW = PHONE ? pw : tw; VH = PHONE ? ph : th; FS = PHONE ? (fs || 1.25) : 1;
    view = SciSim.stage($('#cv'), { width: VW, height: VH, background: bg });
    ctx = view.ctx; D = SciSim.draw(ctx);
    const f0 = D.font; D.font = (n, w) => f0(Math.round(n * FS * 10) / 10, w);
  }
  const rr = (x, y, w, h, r) => { D.roundRect(x, y, w, h, r); return ctx; };
  const shade = (c, a) => SciSim.color.shade(c, a);
  const rgba = (c, a) => SciSim.color.rgba(c, a);
  const mixc = (a, b, t) => SciSim.color.mix(a, b, clamp(t, 0, 1));

  /* 글자 줄바꿈 (한국어: 공백 단위, 너무 긴 단어는 글자 단위) */
  function wrapLines(text, maxW, size, weight) {
    ctx.save(); ctx.font = D.font(size, weight || 700);
    const out = []; let line = '';
    String(text).split('\n').forEach((para, pi) => {
      if (pi > 0) { out.push(line); line = ''; }
      para.split(' ').forEach((w) => {
        let cand = line ? line + ' ' + w : w;
        if (ctx.measureText(cand).width <= maxW) { line = cand; return; }
        if (line) { out.push(line); line = ''; }
        if (ctx.measureText(w).width <= maxW) { line = w; return; }
        let cur = '';
        for (const ch of w) { if (ctx.measureText(cur + ch).width > maxW) { out.push(cur); cur = ch; } else cur += ch; }
        line = cur;
      });
    });
    out.push(line); ctx.restore();
    return out.filter((l, i) => l !== '' || i < out.length - 1);
  }
  /* 줄바꿈해서 그리기: align center/left, 반환 = 마지막 y */
  function drawWrap(x, y, text, maxW, size, o) {
    o = o || {};
    const lines = wrapLines(text, maxW, size, o.weight), lh = size * FS * (o.lh || 1.3);
    lines.forEach((l, i) => D.text(x, y + i * lh, l, { size, weight: o.weight || 700, color: o.color || '#334155', align: o.align || 'center', alpha: o.alpha }));
    return y + (lines.length - 1) * lh;
  }
  /* 말풍선(안내 글) : 반투명 흰 판 + 글 */
  function note(x, y, w, text, size, o) {
    o = o || {};
    const lines = wrapLines(text, w - 24, size, 700), lh = size * FS * 1.32, h = lines.length * lh + 14;
    D.shadow(() => { ctx.fillStyle = o.bg || 'rgba(255,255,255,.92)'; rr(x, y, w, h, 12).fill(); }, { blur: 5, y: 2 });
    if (o.border) { ctx.strokeStyle = o.border; ctx.lineWidth = 2; rr(x, y, w, h, 12).stroke(); }
    lines.forEach((l, i) => D.text(x + w / 2, y + 12 + size * FS * 0.8 + i * lh, l, { size, weight: 700, color: o.color || '#334155' }));
    return h;
  }


  /* 읽음 칸 3개 */
  const rdEls = [1, 2, 3].map((i) => [$('#l' + i), $('#v' + i)]);
  let rdLast = '';
  function setReadouts(a) {
    const key = a.join('|'); if (key === rdLast) return; rdLast = key;
    for (let i = 0; i < 3; i++) { rdEls[i][0].textContent = a[i * 2]; rdEls[i][1].textContent = a[i * 2 + 1]; }
  }
  let hintTimer = null;
  function showHint(msg, ms) { const h = $('#stageHint'); if (!h) return; h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4200); }
  /* 캔버스 위 일시 메시지 */
  const flash = { text: '', t: 0, bg: '#15803d' };
  function say(text, bad, sec) { flash.text = text; flash.t = sec || 2.8; flash.bg = bad ? '#b91c1c' : '#15803d'; }
  function drawFlash(dt, y) {
    if (flash.t <= 0) return;
    flash.t -= dt;
    const a = clamp(flash.t / 0.4, 0, 1);
    const lines = wrapLines(flash.text, VW - 60, PHONE ? 13 : 14.5, 800), lh = (PHONE ? 13 : 14.5) * FS * 1.3, h = lines.length * lh + 14;
    ctx.save(); ctx.globalAlpha = a;
    D.shadow(() => { ctx.fillStyle = flash.bg; rr(VW / 2 - (VW - 40) / 2, y, VW - 40, h, 12).fill(); }, { blur: 6, y: 2 });
    lines.forEach((l, i) => D.text(VW / 2, y + 7 + (PHONE ? 13 : 14.5) * FS * 0.95 + i * lh, l, { size: PHONE ? 13 : 14.5, weight: 800, color: '#fff' }));
    ctx.restore();
  }



  const colorStops = (stops, t) => {
    t = clamp(t, 0, 1); const n = stops.length - 1, k = Math.min(n - 1, Math.floor(t * n)), u = t * n - k;
    return mixc(stops[k], stops[k + 1], u);
  };
  /* 흰 판 (그래프·장면 바탕) */
  function panel(x, y, w, h, o) {
    o = o || {};
    D.shadow(() => { ctx.fillStyle = o.fill || 'rgba(255,255,255,.94)'; rr(x, y, w, h, o.r || 14).fill(); }, { blur: o.blur == null ? 6 : o.blur, y: 2 });
    if (o.border) { ctx.strokeStyle = o.border; ctx.lineWidth = 2; rr(x, y, w, h, o.r || 14).stroke(); }
    if (o.title) D.text(x + 12, y + 21, o.title, { size: o.tsize || 14.5, weight: 800, color: o.tcolor || '#334155', align: 'left' });
  }
  /* '예시 자료' 꼬리표 */
  function dataTag(x, y, txt, align) {
    D.label(x, y, txt || '예시 자료', { bg: '#fff7e0', color: '#a16207', size: 12.5, pad: 7, border: '#f2d38a', align: align || 'right' });
  }
  /* 그래프 틀: R={x,y,w,h} 안쪽 여백으로 그림 상자를 만들고 눈금을 그려요. 반환 {gx, gy, x0, x1, y0, y1} */
  function plotFrame(R, o) {
    const x0 = R.x + (o.l == null ? 46 : o.l), x1 = R.x + R.w - (o.r == null ? 16 : o.r), y0 = R.y + (o.t == null ? 34 : o.t), y1 = R.y + R.h - (o.b == null ? 34 : o.b);
    const fx = o.fx || ((v) => v), fy = o.fy || ((v) => v);
    const ax0 = fx(o.xmin), ax1 = fx(o.xmax), ay0 = fy(o.ymin), ay1 = fy(o.ymax);
    const gx = (v) => x0 + (x1 - x0) * clamp((fx(v) - ax0) / (ax1 - ax0), 0, 1);
    const gy = (v) => (o.yDown ? y0 + (y1 - y0) * clamp((fy(v) - ay0) / (ay1 - ay0), 0, 1) : y1 - (y1 - y0) * clamp((fy(v) - ay0) / (ay1 - ay0), 0, 1));
    if (o.noDraw) return { gx, gy, x0, x1, y0, y1 };
    ctx.save();
    ctx.fillStyle = o.bg || '#f8fbff'; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    ctx.lineWidth = 1.2; ctx.strokeStyle = '#e1e8f0';
    (o.xticks || []).forEach((v) => { const xx = gx(v); ctx.beginPath(); ctx.moveTo(xx, y0); ctx.lineTo(xx, y1); ctx.stroke(); });
    (o.yticks || []).forEach((v) => { const yy = gy(v); ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x1, yy); ctx.stroke(); });
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.8; ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
    ctx.restore();
    const ts = o.size || 12.5;
    (o.xticks || []).forEach((v, i) => D.text(gx(v), (o.xTop ? y0 - 7 : y1 + 15 * FS * 0.92), (o.xfmt ? o.xfmt(v, i) : String(v)), { size: ts, weight: 700, color: '#64748b' }));
    (o.yticks || []).forEach((v, i) => D.text(x0 - 6, gy(v) + 4.5, (o.yfmt ? o.yfmt(v, i) : String(v)), { size: ts, weight: 700, color: '#64748b', align: 'right' }));
    if (o.xlabel) D.text((x0 + x1) / 2, R.y + R.h - 4, o.xlabel, { size: 13, weight: 800, color: '#475569' });
    if (o.ylabel) { ctx.save(); ctx.translate(R.x + 12, (y0 + y1) / 2); ctx.rotate(-Math.PI / 2); D.text(0, 0, o.ylabel, { size: 13, weight: 800, color: '#475569' }); ctx.restore(); }
    return { gx, gy, x0, x1, y0, y1 };
  }
  /* 선 그리기 */
  function polyline(pts, color, w, o) {
    o = o || {};
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = w || 3; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (o.dash) ctx.setLineDash(o.dash);
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke(); ctx.restore();
  }
  const clickable = (el, fn) => el.addEventListener('click', () => { Sound.click(); fn(el); });
  function setSlider(input, out, v, fmt) { input.value = v; input.style.setProperty('--pct', ((v - input.min) / (input.max - input.min)) * 100 + '%'); if (out) out.textContent = fmt ? fmt(v) : v; }
  /* 슬라이더 연결 */
  function bindSlider(input, out, fmt, cb) {
    const upd = () => { input.style.setProperty('--pct', ((input.value - input.min) / (input.max - input.min)) * 100 + '%'); if (out) out.textContent = fmt(+input.value); };
    input.addEventListener('input', () => { upd(); cb && cb(+input.value); });
    upd();
  }

  /* 체크 칸 (✅ 대신 그림으로) */
  function chkBox(x, y, ok, s) {
    s = s || 15; const top = y - s + 3;
    ctx.save(); ctx.fillStyle = ok ? '#16a34a' : '#fff'; ctx.strokeStyle = ok ? '#16a34a' : '#94a3b8'; ctx.lineWidth = 2;
    rr(x, top, s, s, 4).fill(); rr(x, top, s, s, 4).stroke();
    if (ok) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(x + s * 0.24, top + s * 0.54); ctx.lineTo(x + s * 0.43, top + s * 0.74); ctx.lineTo(x + s * 0.78, top + s * 0.28); ctx.stroke(); }
    ctx.restore();
  }


  /* =========================================================
     지구과학 Ⅲ. 태양계 천체와 별과 우주의 진화 - 흑체복사와 별의 물리량
     [12지구03-02] 흑체복사 법칙(빈의 변위 법칙, 슈테판-볼츠만 법칙)으로 별의 물리량을 추론
     ① 관찰: 달군 금속 공과 온도별 플랑크 곡선   ② 분석: 곡선의 꼭짓점 파장 읽기(λmax·T = 2.9×10⁻³ m·K)
     ③ 분석: E = σT⁴, L = 4πR²σT⁴ (반지름·온도 슬라이더)   ④ 적용: L과 T로 별의 반지름 구하기
     플랑크 곡선은 플랑크 식으로 그리지만 식을 직접 계산하게 하지는 않고, 곡선의 모양과 꼭짓점만 읽어요.
     ========================================================= */
  initStage('#0e1730', 800, 560, 600, 840, 1.25);
  const TX = (x, y, s, size, color, align, weight) => D.text(x, y, s, { size: size || 14, color: color || '#e2e8f0', align: align || 'left', weight: weight || 700 });
  const TXD = (x, y, s, size, color, align, weight) => D.text(x, y, s, { size: size || 14, color: color || '#334155', align: align || 'left', weight: weight || 700 });
  const sqrt = Math.sqrt, log10 = Math.log10, pow = Math.pow;

  /* ---------- 물리 ---------- */
  const H_ = 6.62607015e-34, C_ = 2.99792458e8, K_ = 1.380649e-23, SIGMA = 5.670374e-8;
  const WIEN = 2.9e-3;                 // 빈의 상수 (m·K), 교과서 값
  const RSUN = 6.96e8;                 // 태양 반지름 (m)
  const TSUN = 5800;                   // L = (R/R☉)²(T/T☉)⁴ 에 쓰는 태양 표면 온도 (K)
  const planck = (lamNm, T) => { const l = lamNm * 1e-9, x = H_ * C_ / (l * K_ * T); if (x > 600) return 0; return 2 * H_ * C_ * C_ / pow(l, 5) / Math.expm1(x); };
  const lamMax = (T) => WIEN / T * 1e9;                                   // nm
  const pkVal = (T) => planck(2.897772e-3 / T * 1e9, T);                  // 실제 곡선의 꼭짓점 세기
  const PKREF = pkVal(10000);
  const lgI = (lam, T) => { const v = planck(lam, T) / PKREF; return v > 1e-30 ? log10(v) : -30; };   // 로그 눈금용
  const relI = (lam, T) => Math.min(1, planck(lam, T) / pkVal(T));       // 꼭짓점 = 1
  const sig = (x, n) => { if (!isFinite(x) || x === 0) return '0'; const v = +x.toPrecision(n); return String(v).indexOf('e') >= 0 ? v.toFixed(0) : String(v); };
  const sup = (n) => String(n).replace(/-/g, '⁻').replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
  const sci = (x, n) => { if (x === 0) return '0'; const e = Math.floor(log10(Math.abs(x))); const m = x / pow(10, e); return (+m.toPrecision(n || 2)).toFixed((n || 2) - 1) + '×10' + sup(e); };
  const f0 = (x) => String(Math.round(x));
  const f1 = (x) => (Math.round(x * 10) / 10).toFixed(1);
  const kfmt = (T) => comma(T) + ' K';
  const r2 = (x) => sig(x, 2);
  /* 숫자 입력 읽기: 1e10, 8.5×10^-3, 8.5x10⁻³, 1/9, 0.11 */
  function parseNum(str) {
    let s = String(str).trim().replace(/,/g, '').replace(/\s+/g, '');
    s = s.replace(/[⁻]/g, '-').replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(d));
    s = s.replace(/(켈빈|배|K|R☉|R⊙|R)$/i, '');
    s = s.replace(/[×xX*]10\^?\(?(-?\d+)\)?/, 'e$1').replace('−', '-');
    if (/^-?[\d.]+\/[\d.]+$/.test(s)) { const p = s.split('/'); return +p[0] / +p[1]; }
    const m = /^-?(\d+\.?\d*|\.\d+)(e-?\d+)?$/i.exec(s);
    return m ? parseFloat(s) : NaN;
  }
  /* 흑체의 색 (표면 온도 → 눈에 보이는 색, 근사표) */
  const BBC = [[1500, '#ff6a00'], [2000, '#ff8a12'], [2500, '#ffa43d'], [3000, '#ffb46b'], [3500, '#ffc48a'], [4000, '#ffd1a3'], [4500, '#ffdcb8'], [5000, '#ffe4ce'], [5800, '#fff1e6'], [6500, '#fff9fb'], [7000, '#f5f3ff'], [8000, '#e4eaff'], [9000, '#d7e3ff'], [10000, '#ccdbff'], [15000, '#b9cfff'], [25000, '#a5c0ff'], [40000, '#9bb8ff']];
  function bbColor(T) {
    if (T <= BBC[0][0]) return BBC[0][1];
    for (let i = 1; i < BBC.length; i++) if (T <= BBC[i][0]) return mixc(BBC[i - 1][1], BBC[i][1], (T - BBC[i - 1][0]) / (BBC[i][0] - BBC[i - 1][0]));
    return BBC[BBC.length - 1][1];
  }
  const VIS_LO = 380, VIS_HI = 750;
  const visPow = (T) => { let s = 0; for (let l = VIS_LO; l <= VIS_HI; l += 30) s += planck(l, T); return s; };
  const LV1 = log10(visPow(1500)), LV2 = log10(visPow(7000));
  const brightOf = (T) => 0.18 + 0.82 * clamp((log10(visPow(T)) - LV1) / (LV2 - LV1), 0, 1);   // 눈에 보이는 밝기(0~1)
  const colorName = (T) => (T < 1900 ? '어두운 붉은색' : T < 2800 ? '주황색' : T < 4300 ? '노란빛 주황색' : T < 6300 ? '노란빛 흰색' : T < 7600 ? '흰색' : '청백색');
  const regionName = (lam) => (lam > VIS_HI ? '적외선 쪽' : lam < VIS_LO ? '자외선 쪽' : '가시광선');

  /* ---------- 천체 자료 (예시) ---------- */
  const STARS = {
    sun: { name: '태양', T: 5800, L: 1, col: '#f59e0b', dark: '#b45309' },
    sirA: { name: '시리우스 A', T: 9900, L: 25, col: '#3b82f6', dark: '#1d4ed8' },
    bet: { name: '베텔게우스', T: 3500, L: 1e5, col: '#ef4444', dark: '#b91c1c' },
    sirB: { name: '시리우스 B', T: 25000, L: 0.025, col: '#60a5fa', dark: '#1d4ed8' },
    man: { name: '사람 몸', T: 310, col: '#a855f7', dark: '#7e22ce' },
  };
  const radiusOf = (s) => sqrt(s.L) / pow(s.T / TSUN, 2);        // R / R☉
  const REF_T = [3500, 5800, 9900], REF_COL = ['#ef4444', '#d97706', '#2563eb'];
  const T0 = 6000;                                               // 3단계 기준별의 표면 온도
  const EARTH_R = 6.371e6 / RSUN;                                // 지구 반지름 (R☉)
  const SOL_NOTE = '별의 자료는 교육용 예시 값이에요.';

  /* ---------- 상태 ---------- */
  const S = {
    view: 'v1', clock: 0, fade: 0,
    T1: 5800, Td: 5800, visit: {}, visT: {},
    obj: 'sun', lam: 1000, lamD: 1000, rec: {}, manPick: null, manSeen: false, foundT: 0,
    R3: 1, T3: T0, R3d: 1, T3d: T0, lE: 0, lL: 0, calcOn: false, ptT: 0,
    sel4: 'sirA', rec4: {}, ord: [], solveOpen: false, ordOn: false, discD: {},
  };
  let game = null;
  const VIEW_LABEL = { v1: '🔥 달군 금속 공과 플랑크 곡선', v2: '📏 곡선의 꼭짓점 파장 읽기', v3: '🔆 반지름·온도와 별의 에너지', v4: '📐 광도와 온도로 반지름 구하기' };

  /* ---------- 배치 ---------- */
  const LAY = PHONE ? {
    v1: { ball: { x: 10, y: 10, w: 580, h: 250 }, plot: { x: 10, y: 270, w: 580, h: 560 } },
    v2: { left: { x: 10, y: 10, w: 580, h: 232 }, plot: { x: 10, y: 252, w: 580, h: 578 } },
    v3: { scene: { x: 10, y: 10, w: 580, h: 330 }, bars: { x: 10, y: 350, w: 580, h: 480 } },
    v4: { cards: { x: 10, y: 10, w: 580, h: 150 }, size: { x: 10, y: 170, w: 580, h: 660 } },
  } : {
    v1: { ball: { x: 12, y: 12, w: 250, h: 536 }, plot: { x: 272, y: 12, w: 516, h: 536 } },
    v2: { left: { x: 12, y: 12, w: 250, h: 536 }, plot: { x: 272, y: 12, w: 516, h: 536 } },
    v3: { scene: { x: 12, y: 12, w: 300, h: 536 }, bars: { x: 322, y: 12, w: 466, h: 536 } },
    v4: { cards: { x: 12, y: 12, w: 776, h: 188 }, size: { x: 12, y: 210, w: 776, h: 338 } },
  };

  /* ======================================================
     그림: 스펙트럼 그래프 틀 (가로 파장, 세로 세기)
     ====================================================== */
  const UVIR = (x0, x1, xmax, y0) => {
    const gx = (l) => x0 + (x1 - x0) * l / xmax;
    const a = gx(VIS_LO), b = gx(VIS_HI);
    return { a, b, mid: (a + b) / 2, gx };
  };
  function specPlot(P, o) {
    const x0 = P.x + 58, x1 = P.x + P.w - 18, y0 = P.y + 54, y1 = P.y + P.h - 58;
    panel(P.x, P.y, P.w, P.h, { title: o.title, tsize: 14.5 });
    const gx = (l) => x0 + (x1 - x0) * l / o.xmax;
    const log = o.mode === 'log', ymin = -4.8, ymax = 0.3;
    const gy = log ? (v) => y1 - (y1 - y0) * (v - ymin) / (ymax - ymin) : (v) => y1 - (y1 - y0) * v / 1.12;
    ctx.save();
    ctx.fillStyle = '#f8fbff'; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    // 가시광선 영역 띠
    const ax = gx(VIS_LO), bx = gx(VIS_HI);
    const g = ctx.createLinearGradient(ax, 0, bx, 0);
    ['#8b5cf6', '#3b82f6', '#22c55e', '#facc15', '#f97316', '#ef4444'].forEach((c, i, a) => g.addColorStop(i / (a.length - 1), c));
    ctx.globalAlpha = 0.13; ctx.fillStyle = g; ctx.fillRect(ax, y0, Math.max(2, bx - ax), y1 - y0); ctx.globalAlpha = 1;
    ctx.fillStyle = g; ctx.fillRect(ax, y1 - 9, Math.max(2, bx - ax), 9);
    // 격자
    ctx.lineWidth = 1.2; ctx.strokeStyle = '#e1e8f0';
    o.xticks.forEach((v) => { const xx = gx(v); ctx.beginPath(); ctx.moveTo(xx, y0); ctx.lineTo(xx, y1); ctx.stroke(); });
    const yt = log ? [0, -1, -2, -3, -4] : [0, 0.5, 1];
    yt.forEach((v) => { const yy = gy(v); ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x1, yy); ctx.stroke(); });
    ctx.restore();
    // 곡선 (그림 상자 안에서만)
    ctx.save(); ctx.beginPath(); ctx.rect(x0, y0 - 2, x1 - x0, y1 - y0 + 2); ctx.clip();
    (o.curves || []).forEach((c) => {
      const pts = [];
      for (let px = x0; px <= x1 + 0.1; px += 2.5) {
        const l = Math.max(8, (px - x0) / (x1 - x0) * o.xmax);
        pts.push([px, gy(log ? lgI(l, c.T) : relI(l, c.T))]);
      }
      if (c.halo) polyline(pts, c.halo, c.w + 5, { alpha: 0.45 });
      polyline(pts, c.col, c.w || 3, { dash: c.dash, alpha: c.alpha });
    });
    ctx.restore();
    ctx.save(); ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.8; ctx.strokeRect(x0, y0, x1 - x0, y1 - y0); ctx.restore();
    o.xticks.forEach((v) => TXD(gx(v), y1 + 22 * (FS > 1 ? 0.95 : 1), o.xfmt(v), 12.5, '#64748b', 'center'));
    yt.forEach((v) => TXD(x0 - 6, gy(v) + 4.5, log ? (v === 0 ? '1' : '10' + sup(v)) : String(v), 12.5, '#64748b', 'right'));
    TXD((x0 + x1) / 2, P.y + P.h - 8, o.xlabel, 13, '#475569', 'center', 800);
    ctx.save(); ctx.translate(P.x + 14, (y0 + y1) / 2); ctx.rotate(-Math.PI / 2); TXD(0, 0, o.ylabel, 12.5, '#475569', 'center', 800); ctx.restore();
    // 자외선 | 가시광선 | 적외선
    const sz = 12.5, uvx = (x0 + ax) / 2;
    if (bx - ax < 60) {          // 가시광선 띠가 아주 좁을 때: 이름표 겹침 방지
      TXD(x0 + 2, y0 - 8, '자외선 · 가시광선', sz, '#15803d', 'left', 800);
      TXD((x0 + x1) / 2, y0 - 8, '적외선', sz, '#dc2626', 'center', 800);
    } else {
      if (ax - x0 > 44) TXD(uvx, y0 - 8, '자외선', sz, '#7c3aed', 'center', 800);
      else TXD(x0 + 2, y0 - 8, '자외선', sz, '#7c3aed', 'left', 800);
      TXD((ax + bx) / 2, y0 - 8, '가시광선', sz, '#15803d', 'center', 800);
      TXD(Math.max(bx + 4, (bx + x1) / 2 - 22), y0 - 8, '적외선', sz, '#dc2626', 'left', 800);
    }
    return { gx, gy, x0, x1, y0, y1 };
  }

  /* ======================================================
     1단계: 달군 금속 공 + 플랑크 곡선
     ====================================================== */
  function drawHeater(cx, y, w, T, t) {
    const hot = clamp((T - 1500) / 8500, 0, 1);
    D.shadow(() => { ctx.fillStyle = '#475569'; rr(cx - w / 2, y, w, 26, 8).fill(); }, { blur: 6, y: 3 });
    ctx.fillStyle = '#64748b'; rr(cx - w / 2 + 4, y + 4, w - 8, 8, 4).fill();
    // 가열 코일
    ctx.save(); ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = mixc('#7c2d12', '#ffd9a8', 0.25 + hot * 0.75);
    ctx.beginPath(); const n = 10;
    for (let i = 0; i <= n; i++) { const xx = cx - w / 2 + 12 + (w - 24) * i / n, yy = y + 9 + (i % 2 ? 7 : 0); i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
    ctx.stroke(); ctx.restore();
    D.glow(cx, y + 12, w * 0.55, '#fb923c', 0.15 + hot * 0.4);
  }
  function drawBall(cx, cy, r, T, t, glowK) {
    const bc = bbColor(T), br = brightOf(T);
    D.glow(cx, cy, r * (1.5 + br * 1.7) * (glowK || 1), bc, 0.18 + br * 0.55);
    const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r);
    const core = mixc('#4a2218', bc, br), edge = mixc('#1f1410', bc, br * 0.8);
    g.addColorStop(0, mixc(core, '#ffffff', 0.35 * br)); g.addColorStop(0.6, core); g.addColorStop(1, edge);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,' + (0.18 + 0.25 * br) + ')';
    ctx.beginPath(); ctx.ellipse(cx - r * 0.35, cy - r * 0.45, r * 0.3, r * 0.16, -0.6, 0, TAU); ctx.fill();
  }
  function ballPos() { const B = LAY.v1.ball; return { cx: PHONE ? B.x + 88 : B.x + B.w / 2, cy: PHONE ? B.y + 112 : B.y + 178, r: PHONE ? 44 : 60 }; }
  function colorStrip(x, y, w, h, T) {
    for (let i = 0; i < w; i += 2) { ctx.fillStyle = bbColor(1500 + 8500 * i / w); ctx.fillRect(x + i, y, 2.2, h); }
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1.5; rr(x, y, w, h, 4).stroke();
    const mx = x + w * clamp((T - 1500) / 8500, 0, 1);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(mx, y - 1); ctx.lineTo(mx - 6, y - 10); ctx.lineTo(mx + 6, y - 10); ctx.closePath(); ctx.fill();
    TX(x, y + h + 15, '1500 K', 11.5, '#94a3b8', 'left'); TX(x + w, y + h + 15, '10000 K', 11.5, '#94a3b8', 'right');
  }
  function drawV1(t, dt) {
    const G = LAY.v1, B = G.ball, T = S.Td;
    panel(B.x, B.y, B.w, B.h, { fill: 'rgba(255,255,255,.07)', blur: 0, r: 16 });
    TX(B.x + 14, B.y + 24, '🔥 금속 공을 달구는 중', 14.5, '#cbd5e1');
    const { cx, cy, r } = ballPos();
    drawBall(cx, cy, r, T, t);
    drawHeater(cx, cy + r + 18, r * 2 + 30, T, t);
    // 전선 · 집게
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, cy - r - 2); ctx.lineTo(cx, cy - r - 30); ctx.stroke();
    // 온도
    const tx = PHONE ? B.x + 190 : B.x + B.w / 2, ty = PHONE ? B.y + 60 : B.y + 62;
    TX(tx, ty - (PHONE ? 10 : 20), '표면 온도', 13.5, '#94a3b8', PHONE ? 'left' : 'center');
    const shown = Math.abs(T - S.T1) < 5 ? S.T1 : Math.round(T / 10) * 10;
    TX(tx, ty + (PHONE ? 20 : 8), kfmt(shown), PHONE ? 30 : 28, '#fff', PHONE ? 'left' : 'center', 800);
    const ly = PHONE ? B.y + 108 : B.y + 330, lx = PHONE ? B.x + 190 : B.x + 18;
    TX(lx, ly, '빛깔', 13, '#94a3b8');
    TX(lx, ly + 22, colorName(Math.round(T / 100) * 100), 16, '#f8fafc', 'left', 800);
    TX(lx, ly + 54, '꼭짓점이 있는 영역', 13, '#94a3b8');
    TX(lx, ly + 76, regionName(lamMax(T)), 16, '#f8fafc', 'left', 800);
    if (!PHONE) drawWrap(B.x + B.w / 2, B.y + 436, '뜨거워질수록 공의 빛깔이 붉은색 → 주황색 → 흰색 → 청백색으로 변해요.', B.w - 28, 13.5, { color: '#cbd5e1' });
    if (!PHONE) { TX(B.x + 18, B.y + 478, '온도와 빛깔', 13, '#94a3b8'); colorStrip(B.x + 18, B.y + 494, B.w - 36, 14, T); }
    else { TX(B.x + 190, B.y + 202, '온도와 빛깔', 12.5, '#94a3b8'); colorStrip(B.x + 190, B.y + 216, 380, 12, T); }
    // 곡선
    const curves = REF_T.map((tt, i) => ({ T: tt, col: REF_COL[i], w: 2.2, dash: [7, 5], alpha: 0.85 }));
    curves.push({ T: T, col: '#0f172a', w: 3.6, halo: bbColor(T) === '#ccdbff' ? '#93b4ff' : mixc(bbColor(T), '#ff7a00', 0.35) });
    const pl = specPlot(G.plot, {
      title: '플랑크 곡선: 파장별 복사 세기', xmax: 2500, xticks: [0, 500, 1000, 1500, 2000, 2500], xfmt: (v) => v, xlabel: '파장 λ (nm)',
      ylabel: '복사 세기 (로그 눈금, 한 칸 = 10배)', mode: 'log', curves,
    });
    // 기준 곡선 이름표 (오른쪽 끝)
    REF_T.forEach((tt, i) => {
      const lp = 2250, yy = pl.gy(lgI(lp, tt));
      D.label(pl.x1 - 8, yy - 17, comma(tt) + ' K', { bg: REF_COL[i], color: '#fff', size: 12, pad: 6, align: 'right' });
    });
    // 꼭짓점 표시
    const lp = lamMax(T), px = pl.gx(lp), py = pl.gy(lgI(lp, T));
    ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, pl.y1); ctx.stroke(); ctx.restore();
    D.sphere(px, py, 7, '#fff', { outline: '#0f172a', outlineWidth: 2.5, gloss: false });
    D.label(px + 10, Math.max(pl.y0 + 12, py - 20), '꼭짓점', { bg: '#0f172a', color: '#fff', size: 12, pad: 6, align: 'left' });
  }

  /* ======================================================
     2단계: 빈의 변위 법칙 - 꼭짓점 파장 읽기
     ====================================================== */
  const foundOf = (k) => { const o = STARS[k], p = lamMax(o.T); return Math.abs(S.lam - p) <= 0.03 * p; };
  const lamTxt = (nm) => (nm >= 1000 ? sig(nm / 1000, 3) + ' μm' : f0(nm) + ' nm');
  function drawPerson(cx, cy, s, t) {
    D.glow(cx, cy, s * 1.5, '#f97316', 0.5);
    const g = ctx.createRadialGradient(cx, cy - s * 0.2, s * 0.1, cx, cy, s * 1.1);
    g.addColorStop(0, '#fde047'); g.addColorStop(0.45, '#fb923c'); g.addColorStop(1, '#a21caf');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy - s * 0.78, s * 0.28, 0, TAU); ctx.fill();
    rr(cx - s * 0.42, cy - s * 0.46, s * 0.84, s * 1.0, s * 0.22).fill();
    rr(cx - s * 0.3, cy + s * 0.45, s * 0.26, s * 0.62, s * 0.1).fill(); rr(cx + s * 0.04, cy + s * 0.45, s * 0.26, s * 0.62, s * 0.1).fill();
  }
  function drawV2(t, dt) {
    const G = LAY.v2, Lf = G.left, o = STARS[S.obj], man = S.obj === 'man';
    panel(Lf.x, Lf.y, Lf.w, Lf.h, { fill: 'rgba(255,255,255,.07)', blur: 0, r: 16 });
    TX(Lf.x + 14, Lf.y + 24, man ? '🧍 적외선 카메라로 본 사람' : '🔭 관측 대상', 14.5, '#cbd5e1');
    const dx = PHONE ? Lf.x + 86 : Lf.x + Lf.w / 2, dy = PHONE ? Lf.y + 98 : Lf.y + 108;
    if (man) drawPerson(dx, dy, PHONE ? 36 : 44, t);
    else {
      const bc = bbColor(o.T);
      D.glow(dx, dy, 78, bc, 0.5); D.sphere(dx, dy, PHONE ? 38 : 46, bc, { gloss: true });
    }
    TX(dx, dy + (PHONE ? 62 : 82), o.name, 16, '#fff', 'center', 800);
    const rec = S.rec[S.obj];
    const tTxt = man ? '체온 310 K (37 °C)' : rec ? '표면 온도 ' + kfmt(rec.T) : '표면 온도 ? K';
    TX(dx, dy + (PHONE ? 84 : 104), tTxt, 14, rec || man ? '#86efac' : '#94a3b8', 'center', 800);
    // 법칙 상자
    const fx = PHONE ? Lf.x + 176 : Lf.x + 14, fy = PHONE ? Lf.y + 40 : Lf.y + 232, fw = PHONE ? Lf.w - 190 : Lf.w - 28;
    D.shadow(() => { ctx.fillStyle = 'rgba(255,255,255,.93)'; rr(fx, fy, fw, PHONE ? 52 : 62, 12).fill(); }, { blur: 5, y: 2 });
    TXD(fx + fw / 2, fy + 21, '빈의 변위 법칙', 13, '#64748b', 'center', 800);
    TXD(fx + fw / 2, fy + (PHONE ? 43 : 48), 'λmax · T = 2.9×10⁻³ m·K', PHONE ? 16 : 15.5, '#0f172a', 'center', 800);
    // 기록표
    const ty0 = PHONE ? Lf.y + 112 : Lf.y + 320, tx0 = PHONE ? Lf.x + 176 : Lf.x + 14, tw = PHONE ? Lf.w - 190 : Lf.w - 28, rh = PHONE ? 31 : 38;
    ctx.fillStyle = 'rgba(255,255,255,.1)'; rr(tx0, ty0, tw, rh * 4 + 4, 10).fill();
    TX(tx0 + 12, ty0 + rh * 0.68, '천체', 12.5, '#94a3b8'); TX(tx0 + tw * 0.56, ty0 + rh * 0.68, 'λmax', 12.5, '#94a3b8', 'center'); TX(tx0 + tw - 10, ty0 + rh * 0.68, 'T', 12.5, '#94a3b8', 'right');
    ['sun', 'sirA', 'bet'].forEach((k, i) => {
      const yy = ty0 + rh * (i + 1) + rh * 0.68, r = S.rec[k], sel = S.obj === k;
      if (sel) { ctx.fillStyle = 'rgba(255,255,255,.12)'; rr(tx0 + 3, ty0 + rh * (i + 1) + 2, tw - 6, rh - 2, 7).fill(); }
      TX(tx0 + 12, yy, STARS[k].name, PHONE ? 13 : 13.5, sel ? '#fff' : '#cbd5e1', 'left', 800);
      TX(tx0 + tw * 0.56, yy, r ? f0(r.lam) + ' nm' : '—', 13.5, r ? '#fff' : '#64748b', 'center', 800);
      TX(tx0 + tw - 10, yy, r ? comma(r.T) : '—', 13.5, r ? '#86efac' : '#64748b', 'right', 800);
    });
    if (!PHONE) drawWrap(Lf.x + Lf.w / 2, Lf.y + 500, '꼭짓점의 파장이 짧을수록 더 뜨거운 천체예요.', Lf.w - 24, 13, { color: '#94a3b8' });
    // 그래프
    const xmax = man ? 20000 : 1600;
    const xt = man ? [0, 5000, 10000, 15000, 20000] : [0, 400, 800, 1200, 1600];
    const pl = specPlot(G.plot, {
      title: o.name + '의 복사 곡선', xmax, xticks: xt, xfmt: (v) => (man ? v / 1000 : v), xlabel: man ? '파장 λ (μm)' : '파장 λ (nm)',
      ylabel: '상대 세기 (꼭짓점 = 1)', mode: 'rel', curves: [{ T: o.T, col: o.col, w: 4, halo: mixc(o.col, '#ffffff', 0.5) }],
    });
    // 눈금(커서)
    const lam = S.lam, cx = pl.gx(lam), iv = relI(lam, o.T), cy = pl.gy(iv), fd = foundOf(S.obj);
    ctx.save(); ctx.strokeStyle = fd ? '#16a34a' : '#0f172a'; ctx.lineWidth = fd ? 2.6 : 2; ctx.setLineDash(fd ? [] : [6, 4]);
    ctx.beginPath(); ctx.moveTo(cx, pl.y0); ctx.lineTo(cx, pl.y1); ctx.stroke(); ctx.restore();
    if (fd) { D.glow(cx, cy, 30, '#22c55e', 0.5); D.ring(cx, cy, 16, t, { color: '#16a34a', speed: 1.2, width: 2.5 }); }
    D.sphere(cx, cy, 7, fd ? '#16a34a' : '#fff', { outline: '#0f172a', outlineWidth: 2.5, gloss: false });
    const lbl = 'λ = ' + lamTxt(lam) + ' · 세기 ' + (Math.round(iv * 100) / 100).toFixed(2);
    const bw = 205 * (PHONE ? 1.05 : 1), bx = clamp(cx - bw / 2, pl.x0 + 4, pl.x1 - bw - 4);
    D.label(bx + bw / 2, pl.y0 + 16, lbl, { bg: fd ? '#15803d' : '#0f172a', color: '#fff', size: 12.5, pad: 8 });
    if (fd) D.label(clamp(cx, pl.x0 + 50, pl.x1 - 50), pl.y0 + 42, '꼭짓점이에요! 이때의 λmax를 써요', { bg: '#dcfce7', color: '#166534', size: 12, pad: 8, border: '#86efac' });
    // 사람 몸: 가시광선 영역이 얼마나 좁은지 표시
    if (man) D.label(pl.gx(VIS_HI) + 16, pl.y1 - 24, '← 가시광선 (거의 없음)', { bg: '#f1f5f9', color: '#475569', size: 12, pad: 7, align: 'left' });
  }

  /* ======================================================
     3단계: 슈테판-볼츠만 법칙 - 별 모형
     ====================================================== */
  const E0 = SIGMA * pow(T0, 4), L0W = 4 * Math.PI * RSUN * RSUN * E0;     // 기준별의 E (W/m²), L (W)
  const rat = (x) => (x >= 1000 ? f0(x) : x >= 100 ? f0(x) : sig(x, 3));
  function logBar(x, y, w, h, lv, col) {
    ctx.fillStyle = '#e8eef6'; rr(x, y, w, h, 8).fill();
    const v = clamp(lv, -3, 3), bw = w * (v + 3) / 6;
    if (bw > 1) { ctx.save(); rr(x, y, w, h, 8).clip(); const g = ctx.createLinearGradient(x, y, x, y + h); g.addColorStop(0, shade(col, 0.25)); g.addColorStop(1, col); ctx.fillStyle = g; ctx.fillRect(x, y, bw, h); ctx.restore(); }
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.5; rr(x, y, w, h, 8).stroke();
    for (let k = -3; k <= 3; k++) {
      const xx = x + w * (k + 3) / 6;
      ctx.strokeStyle = k === 0 ? '#0f172a' : 'rgba(100,116,139,.55)'; ctx.lineWidth = k === 0 ? 2.4 : 1; ctx.beginPath(); ctx.moveTo(xx, y + (k === 0 ? -5 : 0)); ctx.lineTo(xx, y + h + (k === 0 ? 5 : 0)); ctx.stroke();
      TXD(xx, y + h + 17, k === 0 ? '1' : k < 0 ? '1/' + pow(10, -k) : String(pow(10, k)), 11.5, k === 0 ? '#0f172a' : '#64748b', k === -3 ? 'left' : k === 3 ? 'right' : 'center', k === 0 ? 800 : 700);
    }
  }
  function v3Patch(r) { const Sc = LAY.v3.scene, cx = Sc.x + Sc.w / 2, cy = Sc.y + (PHONE ? 176 : 232), ang = -0.9; return { px: cx + Math.cos(ang) * r, py: cy + Math.sin(ang) * r, ang }; }
  function drawV3(t, dt) {
    const G = LAY.v3, Sc = G.scene, Bp = G.bars;
    panel(Sc.x, Sc.y, Sc.w, Sc.h, { fill: 'rgba(255,255,255,.07)', blur: 0, r: 16 });
    TX(Sc.x + 14, Sc.y + 24, '⭐ 별 모형 (점선 = 기준별)', 14.5, '#cbd5e1');
    const cx = Sc.x + Sc.w / 2, cy = Sc.y + (PHONE ? 176 : 232), rpx = PHONE ? 34 : 32;
    const r = rpx * S.R3d, bc = bbColor(S.T3d);
    D.glow(cx, cy, r * 2.1 + 10, bc, 0.35);
    ctx.save(); ctx.setLineDash([6, 5]); ctx.strokeStyle = 'rgba(226,232,240,.8)'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(cx, cy, rpx, 0, TAU); ctx.stroke(); ctx.restore();
    D.sphere(cx, cy, r, bc, { gloss: true });
    // 1 m² 조각
    const { px, py, ang } = v3Patch(r);
    ctx.save(); ctx.translate(px, py); ctx.rotate(ang + Math.PI / 2);
    ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2; ctx.fillRect(-10, -10, 20, 14); ctx.strokeRect(-10, -10, 20, 14); ctx.restore();
    const lx = clamp(px + 36, Sc.x + 52, Sc.x + Sc.w - 50), ly = Math.max(Sc.y + 46, py - 34);
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(lx, ly + 10); ctx.stroke();
    D.label(lx, ly, '겉면 1 m²', { bg: '#fff', color: '#0f172a', size: 12, pad: 7 });
    const by = Sc.y + Sc.h - (PHONE ? 62 : 82);
    TX(Sc.x + Sc.w / 2, by, 'R = ' + sig(S.R3, 2) + ' R☉', 15.5, '#fff', 'center', 800);
    TX(Sc.x + Sc.w / 2, by + 26, 'T = ' + kfmt(S.T3), 15.5, '#fde68a', 'center', 800);
    if (!PHONE) TX(Sc.x + Sc.w / 2, by + 50, '기준별: R = 1 R☉ , T = ' + comma(T0) + ' K', 12.5, '#94a3b8', 'center');
    // 막대
    panel(Bp.x, Bp.y, Bp.w, Bp.h, { title: '별이 내는 에너지 (기준별 = 1)', tsize: 14.5 });
    const bx = Bp.x + 26, bw = Bp.w - 52, rh = PHONE ? 140 : 140;
    const Et_ = pow(S.T3 / T0, 4), Lt_ = S.R3 * S.R3 * Et_;
    const Er = Math.abs(S.lE - log10(Et_)) < 0.002 ? Et_ : pow(10, S.lE), Lr = Math.abs(S.lL - log10(Lt_)) < 0.002 ? Lt_ : pow(10, S.lL);
    const rows = [
      { y: Bp.y + 50, name: '단위 면적당 방출 에너지  E = σT⁴', lv: S.lE, col: '#f59e0b', txt: 'E = ' + rat(Er) + ' 배  (' + sci(E0 * Er, 2) + ' W/m²)' },
      { y: Bp.y + 50 + rh, name: '별 전체의 광도  L = 4πR²σT⁴', lv: S.lL, col: '#e11d48', txt: 'L = ' + rat(Lr) + ' 배  (' + sci(L0W * Lr, 2) + ' W)' },
    ];
    rows.forEach((rw) => {
      TXD(bx, rw.y, rw.name, 14.5, '#334155', 'left', 800);
      logBar(bx, rw.y + 12, bw, 28, rw.lv, rw.col);
      TXD(bx, rw.y + 76, rw.txt, 16.5, '#0f172a', 'left', 800);
    });
    D.label(bx + bw / 2, Bp.y + 50 + rh * 2 - 6, '가로 눈금은 로그(한 칸 = 10배)', { bg: '#f1f5f9', color: '#475569', size: 11.5, pad: 7 });
    const tr = S.T3 / T0, rr_ = S.R3, ee = pow(tr, 4);
    const ly0 = Bp.y + 50 + rh * 2 + 22;
    TXD(bx, ly0, 'T는 기준의 ×' + sig(tr, 3) + '  →  E는 ×' + rat(ee) + '   ((T 비)⁴)', 14.5, '#b45309', 'left', 800);
    TXD(bx, ly0 + 26, 'R는 기준의 ×' + sig(rr_, 3) + '  →  겉넓이는 ×' + rat(rr_ * rr_) + '   ((R 비)²)', 14.5, '#be123c', 'left', 800);
    TXD(bx, ly0 + 52, 'L = 겉넓이 비 × E 비 = ×' + rat(rr_ * rr_ * ee), 14.5, '#0f172a', 'left', 800);
  }

  /* ======================================================
     4단계: 광도와 온도로 반지름 구하기
     ====================================================== */
  const ORDER4 = ['sirA', 'bet', 'sirB'];
  S.disc = { sirA: { v: 0 }, bet: { v: 0 }, sirB: { v: 0 } };
  const rpx4 = (R) => (PHONE ? 0.82 : 1) * (18 + 15 * (log10(R) + 2.5));
  const Lfmt = (L) => (L >= 1000 ? sci(L, 2) : sig(L, 2)) + ' L☉';
  function drawV4(t, dt) {
    const G = LAY.v4, Cd = G.cards, Sz = G.size;
    const gap = 10, cw = (Cd.w - gap * 2) / 3;
    ORDER4.forEach((k, i) => {
      const o = STARS[k], x = Cd.x + i * (cw + gap), y = Cd.y, sel = S.sel4 === k, rec = S.rec4[k] != null;
      D.shadow(() => { ctx.fillStyle = '#fff'; rr(x, y, cw, Cd.h, 14).fill(); }, { blur: sel ? 10 : 5, y: 3 });
      ctx.strokeStyle = sel ? '#0ea5e9' : '#cbd5e1'; ctx.lineWidth = sel ? 3.5 : 2; rr(x, y, cw, Cd.h, 14).stroke();
      D.sphere(x + 26, y + 28, PHONE ? 11 : 14, bbColor(o.T), { gloss: true });
      TXD(x + (PHONE ? 44 : 50), y + 34, o.name, PHONE ? 14.5 : 17, '#0f172a', 'left', 800);
      const rows = [['표면 온도 T', comma(o.T) + ' K'], ['광도 L', Lfmt(o.L)]];
      rows.forEach((rw, j) => {
        TXD(x + 14, y + (PHONE ? 62 : 72) + j * (PHONE ? 26 : 30), rw[0], PHONE ? 12.5 : 13.5, '#64748b', 'left', 700);
        TXD(x + cw - 12, y + (PHONE ? 62 : 72) + j * (PHONE ? 26 : 30), rw[1], PHONE ? 13.5 : 15.5, '#0f172a', 'right', 800);
      });
      const ry = y + Cd.h - (PHONE ? 30 : 36);
      ctx.fillStyle = rec ? '#dcfce7' : '#f1f5f9'; rr(x + 10, ry - 20, cw - 20, PHONE ? 36 : 42, 10).fill();
      TXD(x + cw / 2, ry + (PHONE ? 4 : 6), rec ? 'R = ' + r2(S.rec4[k]) + ' R☉  ✓' : 'R = ?  R☉', PHONE ? 15 : 17.5, rec ? '#15803d' : '#64748b', 'center', 800);
      if (sel && !rec) D.ring(x + cw / 2, ry, 2, t, { color: '#0ea5e9', speed: 0.8, width: 2 });
    });
    panel(Sz.x, Sz.y, Sz.w, Sz.h, { title: '별의 크기 비교 (그림의 크기는 반지름의 로그에 비례해요)', tsize: PHONE ? 13 : 14.5 });
    const items = [{ k: 'earth', name: '지구 (참고)', R: EARTH_R, col: '#38bdf8' }, { k: 'sun', name: '태양 (참고)', R: 1, col: '#fbbf24' }];
    ORDER4.forEach((k) => items.push({ k, name: STARS[k].name, R: radiusOf(STARS[k]), col: bbColor(STARS[k].T) }));
    const gp = PHONE ? 16 : 22, big = rpx4(radiusOf(STARS.bet));
    let total = gp * (items.length - 1); items.forEach((it) => { total += 2 * rpx4(it.R); });
    let cxp = Sz.x + (Sz.w - total) / 2, cyp = Sz.y + 56;
    items.forEach((it) => {
      const rf = rpx4(it.R);
      let cx, cy, lx, ly, al;
      if (PHONE) { cx = Sz.x + 124; cy = cyp + rf; cyp += 2 * rf + gp; lx = Sz.x + 250; ly = cy - 4; al = 'left'; }
      else { cx = cxp + rf; cxp += 2 * rf + gp; cy = Sz.y + 40 + big; lx = cx; ly = cy + big + 20; al = 'center'; }
      const isStar = ORDER4.indexOf(it.k) >= 0, rec = isStar ? S.rec4[it.k] != null : true;
      let r = rf;
      if (isStar) { const v = S.disc[it.k].v; r = rec ? 18 + (rf - 18) * Math.max(0, v) : 20; }
      if (isStar && !rec) {
        ctx.save(); ctx.setLineDash([5, 5]); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke(); ctx.restore();
        TXD(cx, cy + 7, '?', 20, '#94a3b8', 'center', 800);
      } else {
        D.glow(cx, cy, r * 1.35, it.col, 0.22);
        D.sphere(cx, cy, Math.max(2, r), it.col, { gloss: r > 6 });
      }
      TXD(lx, ly, it.name, PHONE ? 16 : 13.5, isStar ? '#0f172a' : '#64748b', al, 800);
      TXD(lx, ly + (PHONE ? 22 : 19), isStar ? (rec ? 'R = ' + r2(S.rec4[it.k]) + ' R☉' : 'R = ?') : 'R = ' + (it.k === 'sun' ? '1' : r2(it.R)) + ' R☉', PHONE ? 14.5 : 13, '#475569', al, 700);
    });
    TXD(Sz.x + Sz.w / 2, Sz.y + Sz.h - 14, 'R/R☉ = √(L/L☉) / (T/T☉)² , T☉ = 5800 K', PHONE ? 13 : 14, '#0f172a', 'center', 800);
  }

  /* ======================================================
     컨트롤 연결
     ====================================================== */
  const sT1 = $('#sT1'), oT1 = $('#oT1'), sLam = $('#sLam'), oLam = $('#oLam'), sR3 = $('#sR3'), oR3 = $('#oR3'), sT3 = $('#sT3'), oT3 = $('#oT3');
  const inT = $('#inT'), inL3 = $('#inL3'), inR = $('#inR'), modeSeg = $('#modeSeg');
  const objBtns = $$('#objSeg .opt'), starBtns = $$('#starSeg .opt');

  function setView(v) { if (S.view !== v) { S.view = v; S.fade = 1; parts.clear(); } updateCtl(); }
  function updateCtl() {
    $('#tbLabel').textContent = VIEW_LABEL[S.view];
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !c.dataset.modes.split(' ').includes(S.view); });
    const free = !!(game && game.free);
    $('#manBox').hidden = !(S.view === 'v2' && S.obj === 'man' && (S.manOn || free));
    $('#tBox').hidden = !(S.view === 'v2' && S.obj !== 'man');
    $('#calcBox').hidden = !(S.view === 'v3' && (S.calcOn || free));
    $('#ordBox4').hidden = !(S.view === 'v4' && (S.ordOn || free || allRec4()));
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.view === S.view));
    if (modeSeg) modeSeg.hidden = !free;
    objBtns.forEach((b) => b.classList.toggle('on', b.dataset.k === S.obj));
    objBtns.forEach((b) => { const k = b.dataset.k; b.classList.toggle('good', k !== 'man' && !!S.rec[k]); });
    starBtns.forEach((b) => { b.classList.toggle('on', b.dataset.k === S.sel4); b.classList.toggle('good', S.rec4[b.dataset.k] != null); });
    $$('#manOpts .opt').forEach((b, i) => { b.classList.toggle('on', S.manPick === i); });
    $$('#ordBtns .opt').forEach((b) => { b.classList.toggle('picked', S.ord.indexOf(b.dataset.k) >= 0); b.disabled = S.ord.indexOf(b.dataset.k) >= 0; });
    $('#ordList').innerHTML = S.ord.map((k, i) => '<span class="tag">' + (i + 1) + '. ' + STARS[k].name + '</span>').join('') || '<span style="color:var(--muted);font-weight:600">아직 고르지 않았어요</span>';
    $('#solveBox').hidden = !S.solveOpen;
    if (S.solveOpen) $('#solveBox').innerHTML = solveHTML(S.sel4);
  }
  const allRec4 = () => ORDER4.every((k) => S.rec4[k] != null);

  /* 1단계 */
  bindSlider(sT1, oT1, (v) => kfmt(v), (v) => { S.T1 = v; });
  $$('.opt[data-t]').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.T1 = +b.dataset.t; setSlider(sT1, oT1, S.T1, kfmt); }));
  /* 2단계 */
  function setLamRange() {
    const man = S.obj === 'man';
    sLam.min = man ? 500 : 100; sLam.max = man ? 20000 : 1600; sLam.step = man ? 10 : 1;
    $('#lamNote').textContent = man ? '사람 몸의 곡선도 꼭짓점을 찾아 눈금을 맞춰 봐요. 그래프를 직접 눌러도 돼요.' : '곡선에서 세기가 가장 센 곳(꼭짓점)에 눈금을 맞춰요. 그래프를 직접 눌러도 돼요.';
  }
  const lamOut = (v) => lamTxt(v);
  function setLam(v) { S.lam = clamp(Math.round(v), +sLam.min, +sLam.max); setSlider(sLam, oLam, S.lam, lamOut); }
  bindSlider(sLam, oLam, lamOut, (v) => { S.lam = v; });
  function setObj(k) {
    if (!STARS[k]) return; S.obj = k; setLamRange(); setLam(k === 'man' ? 4000 : 1000); S.fade = 0.6; inT.value = ''; updateCtl();
  }
  objBtns.forEach((b) => b.addEventListener('click', () => { Sound.click(); setObj(b.dataset.k); }));
  function recordT() {
    if (S.obj === 'man') { say('사람 몸은 아래 문제에서 다뤄요.', true, 2); return; }
    const o = STARS[S.obj], pk = lamMax(o.T);
    if (Math.abs(S.lam - pk) > 0.03 * pk) { Sound.fail(); say('먼저 눈금을 곡선의 꼭짓점에 맞춰요.', true, 2.4); return; }
    const v = parseNum(inT.value);
    if (!isFinite(v) || v <= 0) { Sound.fail(); say('온도를 숫자로 써요. 예: 5800', true, 2.2); return; }
    const calc = WIEN / (S.lam * 1e-9);
    if (Math.abs(v - calc) / calc > 0.03) { Sound.fail(); say('다시 계산해 봐요. λmax = ' + sci(S.lam * 1e-9, 2) + ' m 이므로 T = 2.9×10⁻³ / (이 값) 이에요.', true, 4); return; }
    S.rec[S.obj] = { lam: S.lam, T: o.T };
    Sound.success(); say(o.name + '의 표면 온도는 약 ' + kfmt(o.T) + '예요!', false, 2.6);
    const g = LAY.v2.left; parts.burst(g.x + (PHONE ? 86 : g.w / 2), g.y + (PHONE ? 98 : 108), { count: 16, speed: 140, colors: [bbColor(o.T), '#fff', '#fde68a'] });
    updateCtl();
  }
  $('#bT').addEventListener('click', recordT);
  inT.addEventListener('keydown', (e) => { if (e.key === 'Enter') recordT(); });
  const MAN_OPTS = [
    ['사람 몸(약 310 K)은 λmax ≈ 9.4 μm로, 세기가 가장 센 복사가 적외선 영역에 있기 때문이에요.', true, ''],
    ['사람 몸은 온도가 낮아서 복사를 전혀 하지 않기 때문이에요.', false, '모든 물체는 온도에 맞는 복사를 해요. 사람 몸도 310 K에 해당하는 곡선이 있어요.'],
    ['사람 몸속에 적외선을 만드는 특별한 기관이 있기 때문이에요.', false, '특별한 기관이 아니라 온도 310 K인 물체라면 누구나 이런 복사를 내요.'],
    ['온도가 낮을수록 꼭짓점 파장이 짧아져 적외선이 되기 때문이에요.', false, '반대예요. 온도가 낮을수록 꼭짓점 파장은 길어져요.'],
  ];
  $('#manOpts').innerHTML = MAN_OPTS.map((o, i) => '<button class="opt" type="button" data-i="' + i + '" style="text-align:left;font-size:14px">' + o[0] + '</button>').join('');
  $$('#manOpts .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.manPick = +b.dataset.i; updateCtl(); }));
  /* 3단계 */
  const R3out = (v) => sig(v, 2) + ' R☉', T3out = (v) => kfmt(v);
  bindSlider(sR3, oR3, R3out, (v) => { S.R3 = v; });
  bindSlider(sT3, oT3, T3out, (v) => { S.T3 = v; });
  function setRT(R, T) { S.R3 = R; S.T3 = T; setSlider(sR3, oR3, R, R3out); setSlider(sT3, oT3, T, T3out); }
  $('#bReset3').addEventListener('click', () => { Sound.click(); setRT(1, T0); });
  /* 4단계 */
  function setSel4(k) { S.sel4 = k; S.solveOpen = false; inR.value = ''; updateCtl(); }
  starBtns.forEach((b) => b.addEventListener('click', () => { Sound.click(); setSel4(b.dataset.k); }));
  function solveHTML(k) {
    const o = STARS[k], a = sqrt(o.L), b = pow(o.T / TSUN, 2);
    const Ls = o.L >= 1000 ? sci(o.L, 2) : sig(o.L, 3);
    return '① √(L/L☉) = √' + (o.L >= 1000 ? '(' + Ls + ')' : Ls) + ' = <b>' + sig(a, 3) + '</b><br>② (T/T☉)² = (' + comma(o.T) + ' / 5800)² = <b>' + sig(b, 3) + '</b><br>③ R/R☉ = ' + sig(a, 3) + ' / ' + sig(b, 3) + ' ≈ <b>' + r2(radiusOf(o)) + '</b>';
  }
  $('#bSolve').addEventListener('click', () => { Sound.click(); S.solveOpen = !S.solveOpen; updateCtl(); });
  function recordR() {
    const k = S.sel4, o = STARS[k];
    if (S.rec4[k] != null) { say(o.name + '의 반지름은 이미 기록했어요.', false, 1.8); return; }
    const v = parseNum(inR.value), R = radiusOf(o);
    if (!isFinite(v) || v <= 0) { Sound.fail(); say('반지름을 숫자로 써요. 예: 1.7 또는 8.5×10^-3', true, 2.4); return; }
    if (Math.abs(v - R) / R > 0.06) {
      Sound.fail();
      const tooBig = v > R;
      say('다시 계산해 봐요. ' + (tooBig ? '값이 너무 커요. ' : '값이 너무 작아요. ') + '(T/T☉)를 제곱하는 것을 잊지 않았나요?', true, 3.6); return;
    }
    S.rec4[k] = R; Sound.success();
    SciSim.tween(S.disc[k], { v: 1 }, { duration: 0.8, ease: 'outBack' });
    say(o.name + '의 반지름은 약 ' + r2(R) + ' R☉예요!', false, 2.8);
    updateCtl();
  }
  $('#bR').addEventListener('click', recordR);
  inR.addEventListener('keydown', (e) => { if (e.key === 'Enter') recordR(); });
  $('#ordBtns').innerHTML = ORDER4.map((k) => '<button class="opt" type="button" data-k="' + k + '">' + STARS[k].name + '</button>').join('');
  $$('#ordBtns .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); if (S.ord.indexOf(b.dataset.k) < 0) S.ord.push(b.dataset.k); updateCtl(); }));
  $('#bOrdReset').addEventListener('click', () => { Sound.click(); S.ord = []; updateCtl(); });
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setView(b.dataset.view); }));

  /* ---------- 포인터 ---------- */
  const inPlot2 = (p) => { const P = LAY.v2.plot; return p.x >= P.x + 40 && p.x <= P.x + P.w && p.y >= P.y + 40 && p.y <= P.y + P.h - 40; };
  function lamFromX(x) {
    const P = LAY.v2.plot, x0 = P.x + 58, x1 = P.x + P.w - 18, xmax = S.obj === 'man' ? 20000 : 1600;
    return clamp((x - x0) / (x1 - x0), 0, 1) * xmax;
  }
  SciSim.pointer(view, {
    down(p) {
      if (S.view === 'v2' && inPlot2(p)) { setLam(lamFromX(p.x)); return true; }
      if (S.view === 'v4') {
        const Cd = LAY.v4.cards, gap = 10, cw = (Cd.w - gap * 2) / 3;
        if (p.y >= Cd.y && p.y <= Cd.y + Cd.h) { const i = Math.floor((p.x - Cd.x) / (cw + gap)); if (i >= 0 && i < 3 && p.x - Cd.x - i * (cw + gap) <= cw) { Sound.click(); setSel4(ORDER4[i]); } }
      }
      return false;
    },
    move(p) { if (S.view === 'v2') setLam(lamFromX(p.x)); },
    up() {},
    hover(p) { return S.view === 'v2' && inPlot2(p) ? 'ew-resize' : S.view === 'v4' && p.y < LAY.v4.cards.h + 12 ? 'pointer' : 'default'; },
  });

  /* ---------- 읽기 칸 ---------- */
  function readouts() {
    const v = S.view;
    if (v === 'v1') setReadouts(['표면 온도', kfmt(S.T1), '빛깔', colorName(S.T1), '꼭짓점이 있는 영역', regionName(lamMax(S.T1))]);
    else if (v === 'v2') {
      const o = STARS[S.obj], iv = relI(S.lam, o.T);
      setReadouts(['파장 눈금 λ', lamTxt(S.lam), '그 파장의 상대 세기', (Math.round(iv * 100) / 100).toFixed(2), '기록한 별', ['sun', 'sirA', 'bet'].filter((k) => S.rec[k]).length + ' / 3']);
    } else if (v === 'v3') {
      const ee = pow(S.T3 / T0, 4);
      setReadouts(['E (단위 면적당)', '×' + rat(ee), 'L (별 전체)', '×' + rat(S.R3 * S.R3 * ee), '반지름 · 온도', sig(S.R3, 2) + ' R☉ · ' + kfmt(S.T3)]);
    } else {
      const o = STARS[S.sel4];
      setReadouts(['고른 별', o.name, 'T · L', comma(o.T) + ' K · ' + Lfmt(o.L), '기록한 반지름', ORDER4.filter((k) => S.rec4[k] != null).length + ' / 3']);
    }
  }

  /* ======================================================
     단계 · 미션
     ====================================================== */
  function enterLevel(li) {
    clearTimeout(hintTimer); parts.clear(); flash.t = 0;
    if (li === 0) { S.visit = {}; S.visT = {}; setView('v1'); showHint('온도 버튼을 눌러 곡선의 꼭짓점을 따라가 봐요', 5000); }
    else if (li === 1) { S.manOn = false; setView('v2'); setObj('sun'); showHint('눈금을 곡선의 꼭짓점에 맞춰요', 5000); }
    else if (li === 2) { S.calcOn = false; setRT(1, T0); setView('v3'); S.R3d = S.R3; S.T3d = S.T3; showHint('온도와 반지름 슬라이더를 움직여 막대를 비교해요', 5000); }
    else { S.ordOn = false; setView('v4'); showHint('별 카드를 눌러 하나씩 계산해 봐요', 5000); }
    updateCtl();
  }
  const tbl = (rows) => '<table class="mini">' + rows.map((r, i) => '<tr>' + r.map((c) => (i === 0 ? '<th>' : '<td>') + c + (i === 0 ? '</th>' : '</td>')).join('') + '</tr>').join('') + '</table>';
  const vals4 = ORDER4.map((k) => [STARS[k].name, comma(STARS[k].T) + ' K', Lfmt(STARS[k].L), r2(radiusOf(STARS[k])) + ' R☉']);

  const levels = [
    {
      title: '흑체복사: 온도와 빛의 색', short: '흑체복사', icon: '🔥', phase: '관찰', features: ['heat'],
      intro: '<p class="si-q">❓ 탐구 질문: 별빛의 색과 밝기만으로 별의 온도와 크기를 알 수 있을까?</p>' +
        '<div class="si-link">🔗 <b>통합과학·중학교에서</b> 별의 색이 표면 온도와 관계있다는 것(붉은 별은 차갑고 푸른 별은 뜨거워요)과 스펙트럼을 배웠어요.</div>' +
        '<p>이번 차시에서는 별을 <b>흑체</b>로 보고 온도에 따라 빛이 어떻게 달라지는지 알아봐요. <b>흑체</b>는 들어오는 복사를 모두 흡수하고, 온도에 따라서만 연속 스펙트럼으로 복사하는 이상적인 물체예요. 별은 흑체에 가까워요.</p>' +
        '<p>금속 공을 달구면서 오른쪽의 <b>플랑크 곡선</b>(파장별 복사 세기)이 어떻게 변하는지 관찰해요.</p>',
      setup() { enterLevel(0); },
      recap: '온도가 높을수록 모든 파장에서 복사가 세지고, 곡선의 꼭짓점(가장 센 파장)이 짧은 파장 쪽으로 가요.',
      summary: '<ul><li><b>흑체</b>: 들어오는 복사를 모두 흡수하고 온도에만 따라 연속 스펙트럼을 복사하는 이상적인 물체. 별은 흑체에 가까워요.</li><li>온도가 높을수록 ① 모든 파장에서 복사 세기가 커지고 ② 꼭짓점(복사 에너지가 가장 센 파장 λmax)이 <b>짧은 파장</b> 쪽으로 이동해요.</li><li>그래서 뜨거운 물체는 붉은색 → 주황색 → 흰색 → 청백색으로 보여요.</li></ul>',
      missions: [
        {
          title: '온도에 따른 곡선의 변화',
          goal: '온도를 <b>3500 K → 5800 K → 9900 K</b>로 맞추며 굵은 곡선의 <b>꼭짓점</b>이 어디로 움직이는지 살펴봐요.',
          hint: '온도 버튼(3500·5800·9900 K)을 눌러 보세요. 공의 빛깔과 곡선의 꼭짓점이 함께 움직여요.',
          hold: 0.3, setup() { S.visit = {}; S.visT = {}; S.T1 = 2500; S.Td = 2500; setSlider(sT1, oT1, 2500, kfmt); setView('v1'); },
          status: () => REF_T.map((t) => comma(t) + ' K ' + mark(S.visit[t])).join(' · '),
          check: () => REF_T.every((t) => S.visit[t]),
          explain: '온도가 높아질수록 <b>① 곡선 전체가 위로 올라가요</b>(모든 파장에서 복사가 세져요). <b>② 꼭짓점이 짧은 파장 쪽으로 이동해요</b>. 그래서 공의 빛깔이 붉은색에서 청백색으로 변해요.',
        },
        {
          type: 'quiz', title: '흑체복사 이해하기', goal: '흑체복사에 대한 설명으로 옳은 것은 무엇일까요?', setup() { setView('v1'); },
          choices: ['흑체의 복사 곡선은 온도에 따라서만 정해지고, 물질이 달라도 같은 온도면 같아요', '같은 온도라도 흑체를 이루는 물질에 따라 곡선이 서로 달라요', '흑체는 검은색 빛만 내보내는 물체예요', '온도가 높아져도 꼭짓점 파장은 변하지 않아요'],
          answer: 0,
          feedback: ['', '흑체복사는 물질과 관계없이 온도에만 달라져요. 그래서 별을 흑체로 보고 온도를 알아낼 수 있어요.', '흑체는 빛을 모두 흡수한다는 뜻이에요. 뜨거워지면 붉은색·흰색·청백색 빛을 내요.', '온도가 높아지면 꼭짓점은 짧은 파장 쪽으로 이동해요. 방금 곡선에서 확인했어요.'],
          explain: '<b>흑체</b>는 복사를 모두 흡수하고, 온도에만 따라 복사해요. 같은 온도라면 물질이 달라도 같은 곡선을 그려요.',
        },
      ],
    },
    {
      title: '빈의 변위 법칙: 꼭짓점 파장으로 온도 구하기', short: '빈의 법칙', icon: '📏', phase: '분석', features: ['wien'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 온도가 높을수록 곡선의 꼭짓점이 짧은 파장 쪽으로 움직이는 것을 봤어요.</div>' +
        '<p>꼭짓점 파장 λmax와 온도 T 사이에는 <b>빈의 변위 법칙 λmax · T = 2.9×10⁻³ m·K</b>가 성립해요. 따라서 <b>T = 2.9×10⁻³ ÷ λmax</b>로 표면 온도를 구할 수 있어요.</p>' +
        '<p>예) λmax = 400 nm = 4.0×10⁻⁷ m 이면 T = 2.9×10⁻³ ÷ 4.0×10⁻⁷ ≈ 7250 K. 파장 단위(nm → m)에 주의해요(1 nm = 10⁻⁹ m).</p>',
      setup() { enterLevel(1); },
      recap: 'λmax · T = 2.9×10⁻³ m·K 이므로, 꼭짓점 파장이 짧을수록 표면 온도가 높아요.',
      summary: '<ul><li><b>빈의 변위 법칙</b>: λmax · T = 2.9×10⁻³ m·K</li><li>태양 λmax ≈ 500 nm → 약 5800 K, 시리우스 A ≈ 293 nm(자외선 쪽) → 약 9900 K, 베텔게우스 ≈ 829 nm(적외선 쪽) → 약 3500 K</li><li>사람 몸(약 310 K)은 λmax ≈ 9.4 μm로 <b>적외선</b>을 가장 세게 내요.</li></ul>' +
        tbl([['천체', 'λmax', '표면 온도'], ['태양', '500 nm', '5800 K'], ['시리우스 A', '293 nm', '9900 K'], ['베텔게우스', '829 nm', '3500 K'], ['사람 몸', '9.4 μm', '310 K']]),
      missions: [
        {
          title: '별 3개의 표면 온도 구하기',
          goal: '<b>태양, 시리우스 A, 베텔게우스</b>의 곡선에서 눈금을 꼭짓점에 맞춰 λmax를 읽고, <b>T = 2.9×10⁻³ ÷ λmax</b>로 계산해 기록해요.',
          hint: '파장을 m로 바꿔요: 500 nm = 5.0×10⁻⁷ m. 파장이 짧은 별일수록 더 뜨거워요.',
          hold: 0.3, setup() { S.manOn = false; S.rec = {}; inT.value = ''; setView('v2'); setObj('sun'); },
          status: () => ['sun', 'sirA', 'bet'].map((k) => STARS[k].name + ' ' + mark(!!S.rec[k])).join(' · '),
          check: () => ['sun', 'sirA', 'bet'].every((k) => S.rec[k]),
          explain: '태양 λmax ≈ 500 nm → T ≈ 5800 K, 시리우스 A λmax ≈ 293 nm → T ≈ 9900 K, 베텔게우스 λmax ≈ 829 nm → T ≈ 3500 K예요. 시리우스 A의 꼭짓점은 자외선 영역에 있고, 베텔게우스의 꼭짓점은 적외선 영역에 있어요.',
        },
        {
          title: '사람 몸이 내는 빛',
          goal: '<b>사람 몸</b>(약 310 K)의 곡선을 보고, 사람 몸이 가시광선이 아닌 <b>적외선</b>을 내는 까닭을 골라요.', manual: true,
          setup() { S.manOn = true; S.manPick = null; setView('v2'); setObj('man'); },
          hint: 'λmax = 2.9×10⁻³ ÷ 310 K ≈ 9.4×10⁻⁶ m 이에요. 이 파장은 가시광선(380~750 nm)보다 훨씬 길어요.',
          check: () => (S.manPick == null ? '까닭을 하나 골라요.' : MAN_OPTS[S.manPick][1] ? true : MAN_OPTS[S.manPick][2]),
          explain: '사람 몸은 약 310 K이므로 λmax = 2.9×10⁻³ ÷ 310 ≈ <b>9.4 μm</b>(적외선)예요. 가시광선은 거의 내지 않아서 적외선 카메라로 체온을 잴 수 있어요.',
        },
        {
          type: 'quiz', title: '붉은 별과 푸른 별', goal: '붉은 별이 푸른 별보다 <b>더 차가운</b> 까닭은 무엇일까요?', setup() { setView('v2'); },
          choices: ['붉은 별은 꼭짓점 파장이 길어서 T = 2.9×10⁻³ ÷ λmax 의 값이 작기 때문이에요', '붉은 별은 빛이 약해서 온도가 낮기 때문이에요', '붉은 별은 꼭짓점 파장이 짧아서 온도가 낮기 때문이에요', '별의 색은 온도와 관계가 없어요'],
          answer: 0,
          feedback: ['', '밝기는 온도뿐 아니라 별의 크기에도 달라져요. 색(꼭짓점 파장)이 온도를 알려 줘요.', '꼭짓점 파장이 짧을수록 온도가 높아요. 붉은 별은 파장이 긴 쪽에 꼭짓점이 있어요.', '꼭짓점 파장이 온도를 정해 주므로 별의 색은 표면 온도와 관계가 깊어요.'],
          explain: '붉은 별은 꼭짓점이 긴 파장(붉은색~적외선)에 있으므로 T = 2.9×10⁻³ ÷ λmax 가 작아요. 푸른 별은 꼭짓점이 짧은 파장에 있어 더 뜨거워요.',
        },
      ],
    },
    {
      title: '슈테판-볼츠만 법칙: 온도와 반지름이 정하는 광도', short: '슈테판-볼츠만', icon: '🔆', phase: '분석', features: ['sb'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 꼭짓점 파장으로 별의 표면 온도를 구했어요. 이번에는 별이 내는 <b>에너지의 양</b>을 알아봐요.</div>' +
        '<p>흑체가 <b>단위 면적당 1초에 내는 에너지</b>는 <b>E = σT⁴</b> (σ = 5.67×10⁻⁸ W/m²·K⁴)이에요. 별 전체가 내는 에너지인 <b>광도</b>는 겉넓이 4πR²를 곱한 <b>L = 4πR²σT⁴</b>예요.</p>' +
        '<p>기준별(R = 1 R☉, T = 6000 K)과 비교하며 R과 T가 에너지에 어떻게 영향을 주는지 막대로 확인해요.</p>',
      setup() { enterLevel(2); },
      recap: 'E = σT⁴ 이고 L = 4πR²σT⁴ 이므로, 광도는 반지름의 제곱과 온도의 네제곱에 비례해요.',
      summary: '<ul><li><b>슈테판-볼츠만 법칙</b>: 단위 면적당 방출 에너지 E = σT⁴ (σ = 5.67×10⁻⁸ W/m²·K⁴)</li><li>별의 광도 <b>L = 4πR²σT⁴</b> → L ∝ R²T⁴</li><li>온도가 2배 → E는 2⁴ = 16배, 반지름이 2배 → L은 2² = 4배</li><li>태양(R = 6.96×10⁸ m, T = 5800 K): L ≈ 3.9×10²⁶ W</li></ul>',
      missions: [
        {
          title: '온도를 2배로 올리기',
          goal: '반지름은 그대로 두고 <b>온도를 기준별의 2배(12000 K)</b>로 올려요. 단위 면적당 에너지 E가 몇 배가 되는지 막대로 확인해요.',
          hint: '온도 슬라이더를 오른쪽 끝(12000 K)까지 움직여요. 반지름은 1 R☉로 둬요.',
          hold: 0.8, setup() { S.calcOn = false; setRT(1, T0); setView('v3'); },
          status: () => 'T ×' + sig(S.T3 / T0, 3) + ' ' + mark(S.T3 === 2 * T0) + ' · R ×' + sig(S.R3, 2) + ' ' + mark(S.R3 === 1) + ' · E ×' + rat(pow(S.T3 / T0, 4)),
          check: () => S.T3 === 2 * T0 && S.R3 === 1 && Math.abs(S.lE - 4 * log10(2)) < 0.01,
          explain: 'E = σT⁴ 이므로 T가 2배가 되면 E는 2⁴ = <b>16배</b>가 돼요. 반지름이 같으니 광도 L도 16배예요.',
        },
        {
          title: '반지름 3배, 온도 1/3배인 별',
          goal: '반지름이 기준별의 <b>3배</b>이고 온도가 <b>1/3배</b>인 별의 광도는 기준별의 몇 배일까요? 계산해서 쓰고 <b>✔ 확인하기</b>를 눌러요.', manual: true,
          setup() { S.calcOn = true; inL3.value = ''; setView('v3'); },
          hint: 'L ∝ R²T⁴ 이에요. 슬라이더를 R = 3 R☉, T = 2000 K 로 맞추면 막대로 확인할 수 있어요.',
          check: () => {
            const v = parseNum(inL3.value); if (!isFinite(v)) return '광도 비를 숫자로 써요. 예: 0.5 또는 1/2';
            if (Math.abs(v - 1 / 9) / (1 / 9) <= 0.04) return true;
            if (v > 1) return '반지름이 커서 광도가 커지지만 온도의 네제곱 효과가 더 커요. (1/3)⁴ = 1/81 도 곱해 봐요.';
            return 'L ∝ R²T⁴ 이므로 3² × (1/3)⁴ 를 계산해 봐요.';
          },
          explain: 'L ∝ R²T⁴ 이므로 3² × (1/3)⁴ = 9 × 1/81 = <b>1/9 ≈ 0.11배</b>예요. 반지름이 커도 온도가 많이 낮으면 어두워요.',
        },
        {
          type: 'quiz', title: '반지름과 광도', goal: '온도가 같을 때 별의 반지름이 <b>2배</b>이면 광도는 몇 배가 될까요?', setup() { setView('v3'); },
          choices: ['2배', '4배', '8배', '16배'], answer: 1,
          feedback: ['광도는 겉넓이(4πR²)에 비례해요. 반지름이 2배면 겉넓이는 2배가 아니에요.', '', '반지름이 2배일 때 부피는 8배지만, 별빛은 겉면에서 나와서 겉넓이(4πR²)에 비례해요.', '16배는 온도가 2배일 때 E(σT⁴)가 커지는 배수예요.'],
          explain: 'L = 4πR²σT⁴ 에서 R이 2배면 겉넓이가 2² = <b>4배</b>가 되므로 광도도 4배예요.',
        },
      ],
    },
    {
      title: '광도와 온도로 별의 반지름 추론', short: '별의 반지름', icon: '📐', phase: '적용', features: ['radius'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> L = 4πR²σT⁴ 을 배웠어요. 빈의 법칙으로 온도를, 별빛의 세기로 광도를 알면 <b>반지름을 거꾸로 구할 수 있어요</b>.</div>' +
        '<p>태양과 비교하면 <b>L/L☉ = (R/R☉)²(T/T☉)⁴</b> (T☉ = 5800 K)이므로 <b>R/R☉ = √(L/L☉) ÷ (T/T☉)²</b> 예요.</p>' +
        '<p>시리우스 A, 베텔게우스, 시리우스 B의 자료로 반지름을 구해 크기를 비교해요.</p>',
      setup() { enterLevel(3); },
      recap: 'R/R☉ = √(L/L☉) ÷ (T/T☉)² 로 광도와 온도에서 별의 반지름을 추론할 수 있어요.',
      summary: '<ul><li>R/R☉ = √(L/L☉) ÷ (T/T☉)² (T☉ = 5800 K)</li><li>온도가 낮은데 매우 밝은 별은 반지름이 아주 크고, 온도가 높은데 매우 어두운 별은 반지름이 아주 작아요.</li></ul>' + tbl([['별', '온도', '광도', '반지름']].concat(vals4)),
      missions: [
        {
          title: '별 3개의 반지름 계산',
          goal: '시리우스 A, 베텔게우스, 시리우스 B의 <b>반지름(R☉ 단위)</b>을 계산해서 기록해요.',
          hint: '💡 풀이 보기를 누르면 단계별 계산이 나와요. 아주 작거나 큰 값은 8.5×10^-3 처럼 써도 돼요.',
          hold: 0.3, setup() { S.ordOn = false; S.rec4 = {}; ORDER4.forEach((k) => { S.disc[k].v = 0; }); S.solveOpen = false; inR.value = ''; setView('v4'); },
          status: () => ORDER4.map((k) => STARS[k].name + ' ' + mark(S.rec4[k] != null)).join(' · '),
          check: () => allRec4(),
          explain: '시리우스 A: √25 ÷ (9900/5800)² ≈ <b>1.7 R☉</b>, 베텔게우스: √(1.0×10⁵) ÷ (3500/5800)² ≈ <b>870 R☉</b>, 시리우스 B: √0.025 ÷ (25000/5800)² ≈ <b>0.0085 R☉</b>(지구와 비슷한 크기)예요.',
        },
        {
          title: '크기 순서 정렬',
          goal: '세 별을 <b>반지름이 작은 별부터</b> 차례로 눌러요. 그리고 <b>✔ 확인하기</b>를 눌러요.', manual: true,
          setup() { ORDER4.forEach((k) => { if (S.rec4[k] == null) { S.rec4[k] = radiusOf(STARS[k]); S.disc[k].v = 1; } }); S.ordOn = true; S.ord = []; setView('v4'); },
          hint: '시리우스 B가 가장 작고, 베텔게우스가 가장 커요.',
          check: () => (S.ord.length < 3 ? '세 별을 모두 눌러요.' : S.ord[0] === 'sirB' && S.ord[1] === 'sirA' && S.ord[2] === 'bet' ? true : '순서가 달라요. 계산한 반지름 값을 비교해 봐요.'),
          explain: '작은 순서는 <b>시리우스 B(0.0085 R☉) &lt; 시리우스 A(1.7 R☉) &lt; 베텔게우스(870 R☉)</b>예요. 베텔게우스는 시리우스 B보다 약 10만 배 커요.',
        },
        {
          type: 'quiz', title: '온도와 반지름', goal: '온도가 낮은데도 매우 밝은 별은 <b>반지름이 어떨까요?</b>', setup() { setView('v4'); },
          choices: ['반지름이 매우 커요 (표면이 아주 넓어서 많은 에너지를 내요)', '반지름이 아주 작아요', '온도가 낮을수록 반지름은 작아요', '밝기와 반지름은 관계가 없어요'],
          answer: 0,
          feedback: ['', '반지름이 작으면 겉넓이가 작아 많은 에너지를 낼 수 없어요. 온도가 낮은 별이 밝으려면 큰 겉넓이가 필요해요.', '온도와 반지름은 따로 정해져요. 베텔게우스는 온도가 낮아도 반지름이 아주 커요.', 'L = 4πR²σT⁴ 이므로 광도는 반지름의 제곱에 비례해요.'],
          explain: '베텔게우스는 3500 K로 차갑지만 광도가 10만 L☉예요. L ∝ R²T⁴ 에서 T가 낮으면 R이 아주 커야 하므로 반지름이 약 870 R☉나 돼요. 반대로 온도가 높은데 어두운 시리우스 B는 반지름이 아주 작아요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'he-blackbody', mount: '#game', badge: '별빛 해석가', homeHref: '../../index.html#he',
    featureLabels: { heat: '🔥 금속 공 · 플랑크 곡선', wien: '📏 파장 눈금 · 온도 계산', sb: '🔆 별 모형 · 에너지 막대', radius: '📐 별 카드 · 크기 비교' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 루프 ---------- */
  let lastFree = false, phAcc = 0;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    S.Td = approach(S.Td, S.T1, dt, 8);
    REF_T.forEach((tt) => { if (S.T1 === tt && Math.abs(S.Td - tt) < 40) { S.visT[tt] = (S.visT[tt] || 0) + dt; if (S.visT[tt] > 0.3 && !S.visit[tt]) { S.visit[tt] = true; Sound.tick(); } } });
    S.R3d = approach(S.R3d, S.R3, dt, 8); S.T3d = approach(S.T3d, S.T3, dt, 8);
    const Et = pow(S.T3 / T0, 4), Lt = S.R3 * S.R3 * Et;
    S.lE = approach(S.lE, log10(Et), dt, 7); S.lL = approach(S.lL, log10(Lt), dt, 7);
    // 빛 알갱이 (복사)
    if (!RM) {
      if (S.view === 'v1') {
        const bp = ballPos(), br = brightOf(S.Td); phAcc += dt * (6 + 36 * br);
        while (phAcc >= 1) { phAcc -= 1; const a = rnd(0, TAU), sp = rnd(70, 130); parts.emit({ x: bp.cx + Math.cos(a) * bp.r, y: bp.cy + Math.sin(a) * bp.r, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rnd(0.6, 1.0), size: 2.6, color: bbColor(S.Td), shape: 'circle' }); }
      } else if (S.view === 'v3') {
        const rpx = PHONE ? 34 : 32, pp = v3Patch(rpx * S.R3d), rate = clamp(5 * pow(10, S.lE), 0, 110);
        phAcc += dt * rate;
        while (phAcc >= 1) { phAcc -= 1; const a = pp.ang + rnd(-0.28, 0.28), sp = rnd(90, 150); parts.emit({ x: pp.px, y: pp.py, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rnd(0.7, 1.1), size: 2.4, color: bbColor(S.T3d), shape: 'circle' }); }
      }
    }
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    ctx.fillStyle = '#0e1730'; ctx.fillRect(0, 0, VW, VH);
    const bgG = ctx.createRadialGradient(VW * 0.2, 0, 10, VW * 0.2, 0, VH); bgG.addColorStop(0, 'rgba(56,90,180,.25)'); bgG.addColorStop(1, 'rgba(14,23,48,0)'); ctx.fillStyle = bgG; ctx.fillRect(0, 0, VW, VH);
    if (S.view === 'v1') drawV1(t, dt);
    else if (S.view === 'v2') drawV2(t, dt);
    else if (S.view === 'v3') drawV3(t, dt);
    else drawV4(t, dt);
    parts.draw(ctx);
    drawFlash(dt, S.view === 'v4' ? LAY.v4.size.y + 30 : 8);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(14,23,48,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, LAY, STARS, planck, lamMax, radiusOf, parseNum, MAN_OPTS,
    get game() { return game; },
    enterLevel, setView, setObj, setLam, setRT, recordT, recordR, updateCtl,
    setT1(v) { S.T1 = v; setSlider(sT1, oT1, v, kfmt); S.Td = v; },
    solveStar(k) { setSel4(k); inR.value = String(radiusOf(STARS[k])); recordR(); },
    solveT(k) { setObj(k); setLam(Math.round(lamMax(STARS[k].T))); inT.value = String(STARS[k].T); recordT(); },
  };

})();
