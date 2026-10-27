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


  /* ======================================================
     별 관련 공통 도구 (H-R도 틀, 색, 숫자)
     ====================================================== */
  const TX = (x, y, s, size, color, align, weight) => D.text(x, y, s, { size: size || 14, color: color || '#e2e8f0', align: align || 'left', weight: weight || 700 });
  const TXD = (x, y, s, size, color, align, weight) => D.text(x, y, s, { size: size || 14, color: color || '#334155', align: align || 'left', weight: weight || 700 });
  const sqrt = Math.sqrt, log10 = Math.log10, pow = Math.pow;
  const sig = (x, n) => { if (!isFinite(x) || x === 0) return '0'; const v = +x.toPrecision(n); return String(v).indexOf('e') >= 0 ? v.toFixed(0) : String(v); };
  const sup = (n) => String(n).replace(/-/g, '⁻').replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
  const sci = (x, n) => { if (x === 0) return '0'; const e = Math.floor(log10(Math.abs(x))); const m = x / pow(10, e); return (+m.toPrecision(n || 2)).toFixed((n || 2) - 1) + '×10' + sup(e); };
  const f0 = (x) => String(Math.round(x));
  const kfmt = (T) => comma(T) + ' K';
  const Lfmt = (L) => (L >= 10000 || L < 0.001 ? sci(L, 2) : sig(L, 2)) + ' L☉';
  const TSUN = 5800;
  const radiusOf = (T, L) => sqrt(L) / pow(T / TSUN, 2);          // R / R☉
  const r2 = (x) => sig(x, 2);
  function parseNum(str) {
    let s = String(str).trim().replace(/,/g, '').replace(/\s+/g, '');
    s = s.replace(/[⁻]/g, '-').replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(d));
    s = s.replace(/[×xX*]10\^?\(?(-?\d+)\)?/, 'e$1').replace('−', '-');
    if (/^-?[\d.]+\/[\d.]+$/.test(s)) { const p = s.split('/'); return +p[0] / +p[1]; }
    const m = /^-?(\d+\.?\d*|\.\d+)(e-?\d+)?$/i.exec(s);
    return m ? parseFloat(s) : NaN;
  }
  /* 연수 입력: 100억, 400만, 1억 2천만, 1e10, 4×10^6 */
  function parseYears(str) {
    let s = String(str).trim().replace(/,/g, '').replace(/\s+/g, '').replace(/년$/, '');
    const v = parseNum(s); if (isFinite(v)) return v;
    const U = { '억': 1e8, '천만': 1e7, '백만': 1e6, '만': 1e4, '천': 1e3 };
    const re = /([\d.]+)(억|천만|백만|만|천)?/g; let m, tot = 0, any = false, used = 0;
    while ((m = re.exec(s)) !== null) { if (m[0] === '') { re.lastIndex++; continue; } any = true; used += m[0].length; tot += parseFloat(m[1]) * (m[2] ? U[m[2]] : 1); }
    return any && used === s.length ? tot : NaN;
  }
  const BBC = [[1500, '#ff6a00'], [2000, '#ff8a12'], [2500, '#ffa43d'], [3000, '#ffb46b'], [3500, '#ffc48a'], [4000, '#ffd1a3'], [4500, '#ffdcb8'], [5000, '#ffe4ce'], [5800, '#fff1e6'], [6500, '#fff9fb'], [7000, '#f5f3ff'], [8000, '#e4eaff'], [9000, '#d7e3ff'], [10000, '#ccdbff'], [15000, '#b9cfff'], [25000, '#a5c0ff'], [40000, '#9bb8ff'], [150000, '#8fb0ff']];
  function bbColor(T) {
    if (T <= BBC[0][0]) return BBC[0][1];
    for (let i = 1; i < BBC.length; i++) if (T <= BBC[i][0]) return mixc(BBC[i - 1][1], BBC[i][1], (T - BBC[i - 1][0]) / (BBC[i][0] - BBC[i - 1][0]));
    return BBC[BBC.length - 1][1];
  }
  /* 점 색: 흰 바탕에서도 잘 보이도록 채도를 조금 높여요 */
  const dotColor = (T) => { const c = bbColor(T); return T < 5200 ? mixc(c, '#f97316', 0.45) : T < 7200 ? mixc(c, '#f59e0b', 0.5) : mixc(c, '#3b82f6', 0.55); };

  /* 분광형 */
  const CLS = [
    { k: 'O', hi: 150000, lo: 30000, col: '#7f9bff', txt: '30,000 K 이상' },
    { k: 'B', hi: 30000, lo: 10000, col: '#9db8ff', txt: '10,000 ~ 30,000 K' },
    { k: 'A', hi: 10000, lo: 7500, col: '#cfdcff', txt: '7,500 ~ 10,000 K' },
    { k: 'F', hi: 7500, lo: 6000, col: '#f4efe6', txt: '6,000 ~ 7,500 K' },
    { k: 'G', hi: 6000, lo: 5200, col: '#ffeab8', txt: '5,200 ~ 6,000 K' },
    { k: 'K', hi: 5200, lo: 3700, col: '#ffcf94', txt: '3,700 ~ 5,200 K' },
    { k: 'M', hi: 3700, lo: 2000, col: '#ffa86b', txt: '3,700 K 미만' },
  ];
  /* 주계열 곡선(질량-광도-온도 표, 예시): [T, log L] */
  const MSP = [[3000, -2.77], [3800, -1.4], [5800, 0], [9900, 1.398], [16000, 2.699], [25000, 3.778], [32000, 4.699]].map((p) => [log10(p[0]), p[1]]);
  function msLog(lt) {
    const n = MSP.length;
    let i = 0; while (i < n - 2 && lt > MSP[i + 1][0]) i++;
    const a = MSP[i], b = MSP[i + 1];
    return a[1] + (b[1] - a[1]) * (lt - a[0]) / (b[0] - a[0]);
  }
  const DEV = 1.0, DEVWD = 2.5;                       // 주계열 곡선에서 허용하는 폭(10의 거듭제곱 지수)
  /* 별의 종류: H-R도 위 위치로 정해요 (주계열 곡선에서 벗어난 정도) */
  function kindOf(T, L) {
    const dev = log10(L) - msLog(log10(T));
    if (dev > DEV) return log10(L) >= 3.8 ? 'super' : 'giant';
    if (dev < -DEVWD) return 'wd';
    return 'ms';
  }
  const KIND_NAME = { ms: '주계열성', giant: '거성', super: '초거성', wd: '백색 왜성' };

  /* H-R도 틀: P={x,y,w,h}, cfg={Tmax,Tmin,Lmin,Lmax(log10),title,contours[],xticks[]} → 좌표 변환 */
  function hrFrame(P, cfg) {
    const x0 = P.x + (cfg.l == null ? 64 : cfg.l), x1 = P.x + P.w - 18, y0 = P.y + (cfg.t == null ? 62 : cfg.t), y1 = P.y + P.h - (cfg.b == null ? 46 : cfg.b);
    const lTmax = log10(cfg.Tmax), lTmin = log10(cfg.Tmin), XR = lTmax - lTmin, YR = cfg.Lmax - cfg.Lmin;
    const G = {
      x0, x1, y0, y1, cfg,
      gx: (T) => x0 + (x1 - x0) * (lTmax - log10(T)) / XR,
      gy: (L) => y1 - (y1 - y0) * (log10(L) - cfg.Lmin) / YR,
      gyl: (lg) => y1 - (y1 - y0) * (lg - cfg.Lmin) / YR,
      tOf: (x) => pow(10, lTmax - (x - x0) / (x1 - x0) * XR),
      lgOf: (y) => cfg.Lmin + (y1 - y) / (y1 - y0) * YR,
      inside: (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1,
    };
    if (cfg.noDraw) return G;
    panel(P.x, P.y, P.w, P.h, { title: cfg.title, tsize: 14.5 });
    ctx.save();
    ctx.fillStyle = '#f8fbff'; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    ctx.lineWidth = 1.2; ctx.strokeStyle = '#e1e8f0';
    for (let e = Math.ceil(cfg.Lmin); e <= cfg.Lmax; e++) { const yy = G.gyl(e); ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x1, yy); ctx.stroke(); }
    cfg.xticks.forEach((T) => { const xx = G.gx(T); ctx.beginPath(); ctx.moveTo(xx, y0); ctx.lineTo(xx, y1); ctx.stroke(); });
    ctx.restore();
    // 분광형 띠 (온도 눈금 위)
    CLS.forEach((c) => {
      const hi = Math.min(c.hi, cfg.Tmax), lo = Math.max(c.lo, cfg.Tmin);
      if (hi <= lo) return;
      const a = G.gx(hi), b = G.gx(lo);
      ctx.fillStyle = c.col; ctx.fillRect(a, y0 - 22, b - a, 20);
      ctx.strokeStyle = 'rgba(100,116,139,.5)'; ctx.lineWidth = 1; ctx.strokeRect(a, y0 - 22, b - a, 20);
      if (b - a > 16) TXD((a + b) / 2, y0 - 7, c.k, 13.5, '#334155', 'center', 800);
    });
    G.frameEnd = () => {
      ctx.save(); ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.8; ctx.strokeRect(x0, y0, x1 - x0, y1 - y0); ctx.restore();
      cfg.xticks.forEach((T) => TXD(G.gx(T), y1 + 17, comma(T), 12, '#64748b', 'center'));
      for (let e = Math.ceil(cfg.Lmin); e <= cfg.Lmax; e++) TXD(x0 - 6, G.gyl(e) + 4.5, e === 0 ? '1' : '10' + sup(e), 12, '#64748b', 'right');
      TXD((x0 + x1) / 2, P.y + P.h - 8, '표면 온도 (K) ← 높음 · 낮음 →   (로그 눈금)', 12.5, '#475569', 'center', 800);
      ctx.save(); ctx.translate(P.x + 14, (y0 + y1) / 2); ctx.rotate(-Math.PI / 2); TXD(0, 0, '광도 (L☉ = 1, 로그 눈금)', 12.5, '#475569', 'center', 800); ctx.restore();
      TXD(x0 - 6, y0 - 8, '분광형', 11.5, '#64748b', 'right', 700);
    };
    return G;
  }
  /* 반지름 등값선: L = R²(T/T☉)⁴ */
  function drawContours(G, list, o) {
    o = o || {};
    ctx.save(); ctx.beginPath(); ctx.rect(G.x0, G.y0, G.x1 - G.x0, G.y1 - G.y0); ctx.clip();
    list.forEach((R) => {
      const pts = [];
      for (let px = G.x0; px <= G.x1 + 0.1; px += 4) { const T = G.tOf(px); pts.push([px, G.gyl(2 * log10(R) + 4 * log10(T / TSUN))]); }
      polyline(pts, o.color || '#94a3b8', 1.6, { dash: [6, 5], alpha: o.alpha == null ? 0.9 : o.alpha });
    });
    ctx.restore();
    list.forEach((R) => {
      // 그림 상자 안에서 오른쪽부터 훑어, 별 점과 겹치지 않는 첫 자리에 이름표
      let best = null;
      for (let px = G.x1 - 4; px >= G.x0 + 4 && !best; px -= 3) {
        const T = G.tOf(px), yy = G.gyl(2 * log10(R) + 4 * log10(T / TSUN));
        if (!(yy > G.y0 + 12 && yy < G.y1 - 12)) continue;
        const bx0 = px - 112, bx1 = px + 4, by0 = yy - 24, by1 = yy + 4;
        if ((o.avoid || []).some((a) => a[0] > bx0 - 8 && a[0] < bx1 + 8 && a[1] > by0 - 8 && a[1] < by1 + 8)) continue;
        best = [px, yy];
      }
      if (best) D.label(best[0] - 4, best[1] - 11, 'R = ' + sig(R, 3) + ' R☉', { bg: '#f1f5f9', color: '#475569', size: 11.5, pad: 6, border: '#cbd5e1', align: 'right' });
    });
  }
  function drawStarDot(x, y, T, r, o) {
    o = o || {};
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    D.glow(x, y, r * 2.4, dotColor(T), 0.35);
    D.sphere(x, y, r, dotColor(T), { outline: o.outline || '#334155', outlineWidth: o.sel ? 2.4 : 1.4, gloss: false });
    ctx.restore();
  }

  /* =========================================================
     지구과학 Ⅲ. 태양계 천체와 별과 우주의 진화 - H-R도와 주계열성
     [12지구03-03] 별의 분광형과 광도 자료로 H-R도를 작성하고 해석
     ① 분석: 별 카드 20장의 자료 모으기   ② 기록: H-R도에 별을 찍어 띠 모양 찾기
     ③ 분석: 반지름 등값선과 별의 집단   ④ 탐구: 질량에 따른 주계열성의 물리량과 수명
     진화 경로(전주계열·후주계열)는 다음 차시에서 다루고, 질량-광도 관계의 지수식은 다루지 않아요.
     ========================================================= */
  initStage('#0e1730', 800, 560, 600, 840, 1.25);

  /* ---------- 자료 (예시): 이름, 분광형, 온도 K, 광도 L☉ ---------- */
  const SD = [
    ['리겔', 'B8', 12100, 1.2e5], ['데네브', 'A2', 8500, 2e5], ['안타레스', 'M1', 3400, 7.6e4], ['베텔게우스', 'M2', 3500, 1e5],
    ['스피카', 'B1', 22400, 1.2e4], ['알데바란', 'K5', 3900, 440], ['아르크투루스', 'K1', 4300, 170], ['카펠라', 'G8', 5000, 79],
    ['폴룩스', 'K0', 4700, 43], ['시리우스 A', 'A1', 9900, 25], ['베가', 'A0', 9600, 40], ['알타이르', 'A7', 7700, 11],
    ['프로키온 A', 'F5', 6500, 7], ['태양', 'G2', 5800, 1], ['센타우루스 α A', 'G2', 5800, 1.5], ['센타우루스 α B', 'K1', 5200, 0.5],
    ['바너드별', 'M4', 3100, 0.0035], ['프록시마', 'M5.5', 3000, 0.0017], ['시리우스 B', 'DA', 25000, 0.025], ['프로키온 B', 'DQ', 7700, 0.0005],
  ].map((a, i) => ({ i, name: a[0], sp: a[1], T: a[2], L: a[3], R: radiusOf(a[2], a[3]), kind: kindOf(a[2], a[3]), o: 0, f: 0, tf: 0, anim: { v: 0 }, fails: 0 }));
  const SBN = {}; SD.forEach((s) => { SBN[s.name] = s; });
  const sIdx = (n) => SBN[n].i;
  const QUEUE = ['태양', '베텔게우스', '시리우스 B', '시리우스 A', '알데바란', '프록시마', '리겔', '베가', '폴룩스', '프로키온 B', '센타우루스 α A', '아르크투루스', '바너드별', '스피카', '카펠라', '알타이르', '프로키온 A', '데네브', '안타레스', '센타우루스 α B'].map(sIdx);
  const RADII = [0.01, 1, 10, 100, 1000];
  /* 3단계 문제: 반지름 읽기 4개, 종류 분류 8개 */
  const RQ = ['태양', '폴룩스', '베텔게우스', '시리우스 B'].map(sIdx);
  const CQ = ['안타레스', '태양', '시리우스 B', '아르크투루스', '베가', '프로키온 B', '바너드별', '폴룩스'].map(sIdx);
  const CKIND = (s) => (s.kind === 'super' || s.kind === 'giant' ? 'big' : s.kind);
  const nearestR = (R) => RADII.reduce((b, r) => (Math.abs(log10(R / r)) < Math.abs(log10(R / b)) ? r : b), RADII[0]);
  /* 4단계: 질량-물리량 표 (예시) */
  const MT = [[0.5, 0.04, 3800], [1, 1, 5800], [2, 25, 9900], [5, 500, 16000], [10, 6000, 25000], [20, 5e4, 32000]];
  function massData(M) {
    const lm = log10(M); let i = 0;
    while (i < MT.length - 2 && lm > log10(MT[i + 1][0])) i++;
    const a = MT[i], b = MT[i + 1], u = clamp((lm - log10(a[0])) / (log10(b[0]) - log10(a[0])), 0, 1);
    const L = pow(10, lerp(log10(a[1]), log10(b[1]), u)), T = pow(10, lerp(log10(a[2]), log10(b[2]), u));
    return { L, T, R: radiusOf(T, L), t: 1e10 * M / L };
  }
  const MASSES = [0.5, 1, 2, 5, 10, 20];
  const fmtYears = (t) => {
    if (t >= 1e8) { const n = t / 1e8; return (n >= 1000 ? comma(+n.toPrecision(3)) : sig(n, 3)) + '억 년'; }
    const n = t / 1e4; return (n >= 1000 ? comma(+n.toPrecision(2)) : sig(n, 3)) + '만 년';
  };
  const NEAR = { ms: 90, big: 1, wd: 9 };

  /* ---------- 상태 ---------- */
  const S = {
    view: 'v1', clock: 0, fade: 0,
    open: {}, sel: null, match: {},
    placed: {}, cur: 0, aim: null, guide: false, done2: 0, zonesOn: false, zoneSel: {}, bandA: 0,
    rMode: false, cMode: false, rIdx: 0, cIdx: 0, rOk: {}, cOk: {}, cnt: 'mine', hover: null, hoverT: 0,
    M: 1, lmd: 0, lifeOn: false, lifeRec: {}, tr: [],
  };
  let game = null;
  const VIEW_LABEL = { v1: '🗂️ 별 카드 20장: 분광형·온도·광도', v2: '📈 별을 찍어 H-R도 그리기', v3: '🧭 반지름 등값선과 별의 집단', v4: '⚖️ 질량이 다른 주계열성' };
  const HRC = { Tmax: 40000, Tmin: 2400, Lmin: -4, Lmax: 6, xticks: [30000, 10000, 6000, 4000, 3000] };

  /* ---------- 배치 ---------- */
  const LAY = PHONE ? {
    grid: { x: 12, y: 10, cols: 4, w: 138, h: 100, gx: 8, gy: 8 }, ruler: { x: 10, y: 552, w: 580, h: 278 },
    plot2: { x: 10, y: 130, w: 580, h: 700 }, card2: { x: 10, y: 10, w: 580, h: 110 },
    plot3: { x: 10, y: 10, w: 580, h: 820 }, plot4: { x: 10, y: 10, w: 580, h: 540 }, strip4: { x: 10, y: 560, w: 580, h: 270 },
  } : {
    grid: { x: 12, y: 12, cols: 5, w: 144, h: 78, gx: 14, gy: 10 }, ruler: { x: 12, y: 368, w: 776, h: 180 },
    plot2: { x: 12, y: 12, w: 776, h: 536 }, card2: null,
    plot3: { x: 12, y: 12, w: 776, h: 536 }, plot4: { x: 12, y: 12, w: 776, h: 400 }, strip4: { x: 12, y: 422, w: 776, h: 126 },
  };
  const cardRect = (i) => { const g = LAY.grid, c = i % g.cols, r = Math.floor(i / g.cols); return { x: g.x + c * (g.w + g.gx), y: g.y + r * (g.h + g.gy), w: g.w, h: g.h }; };

  /* ======================================================
     1단계: 별 카드 20장 + 광도 로그 눈금
     ====================================================== */
  const freeOn = () => !!(game && game.free);
  const lgFloor = (L) => Math.floor(log10(L) + 1e-9);
  function drawCard(s, t) {
    const R = cardRect(s.i), cx = R.x + R.w / 2, cy = R.y + R.h / 2, sx = Math.max(0.03, Math.abs(Math.cos(s.f * Math.PI)));
    const back = s.f > 0.5, sel = S.sel === s.i;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(sx, 1); ctx.translate(-cx, -cy);
    const bc = dotColor(s.T);
    D.shadow(() => { ctx.fillStyle = back ? '#fff' : '#eaf0fa'; rr(R.x, R.y, R.w, R.h, 12).fill(); }, { blur: sel ? 10 : 4, y: 2 });
    ctx.strokeStyle = sel ? '#0ea5e9' : back ? bc : '#c3cfe0'; ctx.lineWidth = sel ? 3.5 : 2; rr(R.x, R.y, R.w, R.h, 12).stroke();
    if (!back) {
      D.glow(R.x + R.w / 2, R.y + R.h * 0.4, 22, '#94a3b8', 0.3);
      ctx.save(); ctx.fillStyle = '#94a3b8'; ctx.translate(R.x + R.w / 2, R.y + R.h * 0.4); ctx.beginPath(); for (let k = 0; k < 10; k++) { const rad = k % 2 ? 6 : 14, a = (k / 10) * TAU - Math.PI / 2; ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad); } ctx.closePath(); ctx.fill(); ctx.restore();
      TXD(R.x + R.w / 2, R.y + R.h - (PHONE ? 22 : 14), s.name, PHONE ? 13 : 13.5, '#334155', 'center', 800);
    } else {
      ctx.save(); ctx.scale(1, 1);
      D.sphere(R.x + 16, R.y + 17, 7, bc, { gloss: false, outline: '#475569', outlineWidth: 1 });
      ctx.save(); ctx.font = D.font(13.5, 800); const nw = ctx.measureText(s.name).width; ctx.restore();
      TXD(R.x + 30, R.y + (PHONE ? 22 : 21), s.name, Math.min(13.5, 13.5 * (R.w - 38) / Math.max(1, nw)), '#0f172a', 'left', 800);
      const rows = [['분광형', s.sp], ['온도', kfmt(s.T)], ['광도', Lfmt(s.L)]];
      const rh = PHONE ? 21 : 15.5, y0 = R.y + (PHONE ? 44 : 37);
      rows.forEach((rw, j) => {
        TXD(R.x + 10, y0 + j * rh, rw[0], PHONE ? 12 : 11.5, '#64748b', 'left', 700);
        TXD(R.x + R.w - 9, y0 + j * rh, rw[1], PHONE ? 12.5 : 12, '#0f172a', 'right', 800);
      });
      ctx.restore();
    }
    ctx.restore();
  }
  function drawV1(t, dt) {
    SD.forEach((s) => drawCard(s, t));
    const Rp = LAY.ruler;
    panel(Rp.x, Rp.y, Rp.w, Rp.h, { title: '광도의 로그 눈금: 눈금 한 칸 = 10배', tsize: 14.5 });
    const ax0 = Rp.x + 34, ax1 = Rp.x + Rp.w - 34, ay = Rp.y + (PHONE ? 130 : 84);
    const gl = (lg) => ax0 + (ax1 - ax0) * (lg + 4) / 10;
    ctx.save(); ctx.strokeStyle = '#475569'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(ax0, ay); ctx.lineTo(ax1, ay); ctx.stroke();
    for (let e = -4; e <= 6; e++) {
      const x = gl(e); ctx.strokeStyle = '#475569'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, ay - 9); ctx.lineTo(x, ay + 9); ctx.stroke();
      if (e < 6) for (let m = 2; m <= 9; m++) { const xm = gl(e + log10(m)); ctx.strokeStyle = '#b6c2d3'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(xm, ay - 4); ctx.lineTo(xm, ay + 4); ctx.stroke(); }
      TXD(x, ay + 26, e === 0 ? '1' : '10' + sup(e), PHONE ? 12 : 12.5, '#475569', 'center', 800);
    }
    ctx.restore();
    // 열어 본 별 표시
    SD.forEach((s) => {
      if (!S.open[s.i]) return;
      const x = gl(log10(s.L)), sel = S.sel === s.i;
      const yy = ay - 14 - (sel ? 0 : 0);
      D.sphere(x, yy, sel ? 8 : 6, dotColor(s.T), { gloss: false, outline: sel ? '#0ea5e9' : '#475569', outlineWidth: sel ? 2.5 : 1.2 });
    });
    const sel = S.sel != null ? SD[S.sel] : null;
    if (sel) {
      const x = gl(log10(sel.L)), lg = lgFloor(sel.L);
      ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = '#0ea5e9'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x, ay - 22); ctx.lineTo(x, ay + 9); ctx.stroke(); ctx.restore();
      D.label(clamp(x, Rp.x + 70, Rp.x + Rp.w - 70), ay - 42, sel.name + '  L = ' + Lfmt(sel.L), { bg: '#0f172a', color: '#fff', size: 12.5, pad: 8 });
      TXD(Rp.x + Rp.w / 2, ay + (PHONE ? 54 : 50), '10' + sup(lg) + ' 과 10' + sup(lg + 1) + ' 사이에 있어요', 14, '#0369a1', 'center', 800);
    } else TXD(Rp.x + Rp.w / 2, ay + (PHONE ? 54 : 50), '별 카드를 눌러 광도가 눈금의 어디에 있는지 봐요', 14, '#64748b', 'center', 800);
    drawWrap(Rp.x + Rp.w / 2, Rp.y + Rp.h - (PHONE ? 62 : 22), '눈금이 한 칸 올라갈 때마다 광도는 10배가 돼요. 광도가 100만 배(10⁶) 차이 나도 한 그래프에 그릴 수 있어요.', Rp.w - 40, PHONE ? 13.5 : 13, { color: '#475569' });
  }

  /* ======================================================
     H-R도 공통: 별 점 위치, 영역(zone) 그리기
     ====================================================== */
  const HRCFG2 = (title) => Object.assign({}, HRC, { title: title });
  const geom = (P) => hrFrame(P, Object.assign({ noDraw: true }, HRC));
  /* 영역 다각형(자료 좌표): 주계열 / 거성 / 초거성 / 백색 왜성 — kindOf()와 같은 기준 */
  const ZONES = (() => {
    const lts = []; for (let i = 0; i <= 120; i++) lts.push(log10(HRC.Tmax) - (log10(HRC.Tmax) - log10(HRC.Tmin)) * i / 120);
    const build = (lo, hi, ok) => {
      const up = [], dn = [];
      lts.forEach((lt) => { const a = lo(lt), b = hi(lt); if (a < b - 1e-6 && ok(lt)) { up.push([lt, b]); dn.push([lt, a]); } });
      return up.concat(dn.reverse());
    };
    const LT = HRC.Lmax, LB = HRC.Lmin;
    return {
      ms: { poly: build((lt) => msLog(lt) - DEV, (lt) => msLog(lt) + DEV, () => true), col: '#3b82f6', num: 3, at: [log10(17000), msLog(log10(17000)) - 0.1] },
      giant: { poly: build((lt) => msLog(lt) + DEV, (lt) => 3.8, () => true), col: '#f59e0b', num: 2, at: [log10(3200), 2.6] },
      super: { poly: build((lt) => Math.max(msLog(lt) + DEV, 3.8), (lt) => LT, () => true), col: '#ef4444', num: 1, at: [log10(5200), 5.5] },
      wd: { poly: build((lt) => LB, (lt) => msLog(lt) - DEVWD, (lt) => lt >= log10(5200)), col: '#8b5cf6', num: 4, at: [log10(14000), -3.3] },
    };
  })();
  function drawZones(G, alpha, showNames) {
    ctx.save(); ctx.beginPath(); ctx.rect(G.x0, G.y0, G.x1 - G.x0, G.y1 - G.y0); ctx.clip();
    Object.keys(ZONES).forEach((k) => {
      const z = ZONES[k];
      ctx.beginPath(); z.poly.forEach((p, i) => { const x = G.gx(pow(10, p[0])), y = G.gyl(p[1]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath();
      ctx.fillStyle = rgba(z.col, alpha); ctx.fill();
      ctx.setLineDash([6, 4]); ctx.strokeStyle = rgba(z.col, 0.85); ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
    });
    ctx.restore();
    Object.keys(ZONES).forEach((k) => {
      const z = ZONES[k], x = G.gx(pow(10, z.at[0])), y = G.gyl(z.at[1]), ok = S.zoneSel[k] === k;
      D.sphere(x, y, 14, ok ? '#16a34a' : z.col, { gloss: false, text: String(z.num), outline: '#fff', outlineWidth: 2 });
      if (ok && showNames) D.label(x + 20, y, KIND_NAME[k], { bg: '#fff', color: '#0f172a', size: 12.5, pad: 7, align: 'left', border: '#16a34a' });
    });
  }
  function drawBand(G, a) {
    if (a <= 0.01) return;
    const z = ZONES.ms;
    ctx.save(); ctx.beginPath(); ctx.rect(G.x0, G.y0, G.x1 - G.x0, G.y1 - G.y0); ctx.clip();
    ctx.beginPath(); z.poly.forEach((p, i) => { const x = G.gx(pow(10, p[0])), y = G.gyl(p[1]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath();
    ctx.fillStyle = rgba('#3b82f6', 0.13 * a); ctx.fill();
    ctx.restore();
  }
  const starXY = (G, s) => [G.gx(s.T), G.gy(s.L)];
  const starTip = (G, s, x, y) => {
    const txt = s.name + ' · ' + s.sp + ' · ' + kfmt(s.T) + ' · ' + Lfmt(s.L);
    const w = txt.length * 7.2 + 18, bx = clamp(x, G.x0 + w / 2 + 2, G.x1 - w / 2 - 2);
    D.label(bx, y - 22 < G.y0 + 10 ? y + 24 : y - 22, txt, { bg: '#0f172a', color: '#fff', size: 12.5, pad: 8 });
  };

  /* ======================================================
     2단계: 별을 찍어 H-R도 그리기
     ====================================================== */
  const curIdx = () => { while (S.cur < QUEUE.length && S.placed[QUEUE[S.cur]]) S.cur++; return S.cur < QUEUE.length ? QUEUE[S.cur] : -1; };
  const placedN = () => SD.filter((s) => S.placed[s.i]).length;
  function curCardRect(G) { return PHONE ? LAY.card2 : { x: G.x0 + 8, y: G.y1 - 98, w: 210, h: 90 }; }
  function drawCurCard(G, t) {
    const ci = curIdx(), r = curCardRect(G);
    if (PHONE) panel(r.x, r.y, r.w, r.h, { fill: 'rgba(255,255,255,.95)' });
    else D.shadow(() => { ctx.fillStyle = 'rgba(255,255,255,.97)'; rr(r.x, r.y, r.w, r.h, 12).fill(); }, { blur: 6, y: 2 });
    ctx.strokeStyle = '#0ea5e9'; ctx.lineWidth = 2.5; rr(r.x, r.y, r.w, r.h, 12).stroke();
    if (ci < 0) { TXD(r.x + r.w / 2, r.y + r.h / 2 + 5, '별 20개를 모두 찍었어요!', PHONE ? 17 : 14.5, '#15803d', 'center', 800); return; }
    const s = SD[ci];
    TXD(r.x + 12, r.y + 20, '지금 찍을 별 (' + (placedN() + 1) + ' / 20)', 12, '#0369a1', 'left', 800);
    D.sphere(r.x + 26, r.y + (PHONE ? 58 : 50), PHONE ? 14 : 12, dotColor(s.T), { gloss: true, outline: '#475569', outlineWidth: 1.2 });
    TXD(r.x + (PHONE ? 50 : 46), r.y + (PHONE ? 56 : 48), s.name, PHONE ? 20 : 16, '#0f172a', 'left', 800);
    TXD(r.x + (PHONE ? 50 : 46), r.y + (PHONE ? 82 : 66), '분광형 ' + s.sp + ' · ' + kfmt(s.T), PHONE ? 14.5 : 12.5, '#334155', 'left', 700);
    TXD(r.x + (PHONE ? 50 : 46), r.y + (PHONE ? 100 : 82), '광도 ' + Lfmt(s.L), PHONE ? 14.5 : 12.5, '#334155', 'left', 700);
  }
  function drawV2(t, dt) {
    const P = LAY.plot2, G = hrFrame(P, HRCFG2('H-R도: 가로 = 표면 온도(분광형), 세로 = 광도'));
    drawBand(G, S.bandA);
    if (S.zonesOn || freeOn()) drawZones(G, 0.16, true);
    // 찍힌 별
    SD.forEach((s) => {
      if (!S.placed[s.i]) return;
      const [ex, ey] = starXY(G, s), v = s.anim.v, x = lerp(s.sx == null ? ex : s.sx, ex, v), y = lerp(s.sy == null ? ey : s.sy, ey, v);
      drawStarDot(x, y, s.T, 6.5, { sel: S.hover === s.i });
    });
    G.frameEnd();
    // 마지막으로 찍은 별 이름표
    const ci = curIdx(), cs = ci >= 0 ? SD[ci] : null;
    if (S.hover != null && S.placed[S.hover] && S.hoverT > 0) { const s = SD[S.hover], p = starXY(G, s); starTip(G, s, p[0], p[1]); }
    if (cs && (S.guide || cs.fails >= 2)) {
      const [gx, gy] = starXY(G, cs);
      D.glow(gx, gy, 26, '#22c55e', 0.5); D.ring(gx, gy, 13, t, { color: '#16a34a', speed: 1.1, width: 3 });
      ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = 'rgba(22,163,74,.7)'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(gx, G.y1); ctx.lineTo(gx, gy); ctx.moveTo(G.x0, gy); ctx.lineTo(gx, gy); ctx.stroke(); ctx.restore();
    }
    drawCurCard(G, t);
    // 조준 (십자선 + 값)
    if (S.aim && cs) {
      const a = S.aim;
      if (G.inside(a.x, a.y)) {
        ctx.save(); ctx.strokeStyle = 'rgba(15,23,42,.65)'; ctx.lineWidth = 1.6; ctx.setLineDash([6, 4]);
        ctx.beginPath(); ctx.moveTo(a.x, G.y0); ctx.lineTo(a.x, G.y1); ctx.moveTo(G.x0, a.y); ctx.lineTo(G.x1, a.y); ctx.stroke(); ctx.restore();
        D.sphere(a.x, a.y, 8, dotColor(cs.T), { gloss: false, outline: '#0ea5e9', outlineWidth: 2.5 });
        const T = G.tOf(a.x), L = pow(10, G.lgOf(a.y));
        const txt = 'T = ' + comma(Math.round(T / 100) * 100) + ' K · L = ' + Lfmt(L);
        D.label(clamp(a.x + (a.x > G.x1 - 190 ? -100 : 100), G.x0 + 95, G.x1 - 95), a.y < G.y0 + 40 ? a.y + 28 : a.y - 26, txt, { bg: '#0ea5e9', color: '#fff', size: 12.5, pad: 8 });
      }
    }
  }

  /* ======================================================
     3단계: 반지름 등값선과 별의 집단
     ====================================================== */
  const kindsCount = () => { const c = { ms: 0, big: 0, wd: 0 }; SD.forEach((s) => { c[CKIND(s)]++; }); return c; };
  function drawCountInset(G) {
    const w = PHONE ? 196 : 214, h = 108, x = G.x0 + 8, y = G.gyl(2.5);
    D.shadow(() => { ctx.fillStyle = 'rgba(255,255,255,.96)'; rr(x, y, w, h, 12).fill(); }, { blur: 5, y: 2 });
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.5; rr(x, y, w, h, 12).stroke();
    const mine = S.cnt === 'mine', c = mine ? kindsCount() : NEAR, tot = mine ? 20 : 100;
    TXD(x + 10, y + 17, mine ? '내가 그린 별 ' + tot + '개' : '태양 근처 별 ' + tot + '개 (예시)', 12, '#334155', 'left', 800);
    [['ms', '주계열', '#3b82f6'], ['big', '거성·초거성', '#f59e0b'], ['wd', '백색 왜성', '#8b5cf6']].forEach((r, i) => {
      const yy = y + 30 + i * 25, n = c[r[0]], frac = n / tot;
      TXD(x + 10, yy + 12, r[1], 11.5, '#475569', 'left', 700);
      const bx = x + 84, bw = w - 94;
      ctx.fillStyle = '#e8eef6'; rr(bx, yy, bw, 16, 6).fill();
      if (frac * bw > 1) { ctx.save(); rr(bx, yy, bw, 16, 6).clip(); ctx.fillStyle = r[2]; ctx.fillRect(bx, yy, bw * frac, 16); ctx.restore(); }
      TXD(bx + Math.max(bw * frac + 4, 6), yy + 12.5, n + '개 (' + Math.round(frac * 100) + '%)', 11, '#0f172a', 'left', 800);
    });
  }
  function drawV3(t, dt) {
    const P = LAY.plot3, G = hrFrame(P, HRCFG2('반지름 등값선: 같은 선 위의 별은 반지름이 같아요'));
    drawContours(G, RADII, { avoid: SD.map((s) => starXY(G, s)) });
    SD.forEach((s) => { const [x, y] = starXY(G, s); drawStarDot(x, y, s.T, 6.5, { sel: S.hover === s.i }); });
    G.frameEnd();
    // 문제로 주어진 별 강조
    let qs = null;
    if ((S.rMode || freeOn()) && S.rIdx < RQ.length) qs = SD[RQ[S.rIdx]]; else if ((S.cMode || freeOn()) && S.cIdx < CQ.length) qs = SD[CQ[S.cIdx]];
    if (qs) {
      const [x, y] = starXY(G, qs);
      D.glow(x, y, 30, '#0ea5e9', 0.55); D.ring(x, y, 14, t, { color: '#0284c7', speed: 1.1, width: 3 });
      D.label(clamp(x, G.x0 + 40, G.x1 - 40), y < G.y0 + 40 ? y + 26 : y - 24, qs.name, { bg: '#0284c7', color: '#fff', size: 13, pad: 8 });
    }
    if (S.rMode || freeOn()) RQ.forEach((i, k) => { if (S.rOk[i]) { const s = SD[i], [x, y] = starXY(G, s); D.label(x + 12, y + 18, 'R ≈ ' + sig(nearestR(s.R), 3) + ' R☉', { bg: '#dcfce7', color: '#166534', size: 11.5, pad: 6, border: '#86efac', align: 'left' }); } });
    if (S.hover != null && S.hoverT > 0) { const s = SD[S.hover], [x, y] = starXY(G, s); starTip(G, s, x, y); }
    drawCountInset(G);
  }

  /* ======================================================
     4단계: 주계열성의 질량과 물리량
     ====================================================== */
  const lifeShown = (M) => !!(game && game.free) || S.lifeRec[M] || (S.lifeRec[1] && S.lifeRec[5] && S.lifeRec[20]);
  function drawV4(t, dt) {
    const P = LAY.plot4, G = hrFrame(P, HRCFG2('주계열 위의 별: 질량이 클수록 왼쪽 위로'));
    // 주계열 곡선
    const pts = []; for (let i = 0; i <= 80; i++) { const lt = lerp(log10(32000), log10(3000), i / 80); pts.push([G.gx(pow(10, lt)), G.gyl(msLog(lt))]); }
    ctx.save(); ctx.beginPath(); ctx.rect(G.x0, G.y0, G.x1 - G.x0, G.y1 - G.y0); ctx.clip(); polyline(pts, '#60a5fa', 5, { alpha: 0.35 }); ctx.restore();
    SD.forEach((s) => { const [x, y] = starXY(G, s); drawStarDot(x, y, s.T, 4.5, { alpha: 0.4 }); });
    // 표의 질량 눈금
    MT.forEach((m) => {
      const x = G.gx(m[2]), y = G.gy(m[1]);
      ctx.save(); ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 2; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 4.5, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore();
      TXD(x + 9, y + 15, sig(m[0], 2) + ' M☉', 11.5, '#1d4ed8', 'left', 800);
    });
    G.frameEnd();
    // 별 점 (부드럽게 이동)
    const Md = pow(10, S.lmd), d = massData(Md), tx = G.gx(d.T), ty = G.gy(d.L);
    S.tr.forEach((p, i) => { ctx.fillStyle = 'rgba(14,165,233,' + (0.05 + 0.4 * i / S.tr.length) + ')'; ctx.beginPath(); ctx.arc(G.gx(p[0]), G.gy(p[1]), 3 + 2 * i / S.tr.length, 0, TAU); ctx.fill(); });
    D.glow(tx, ty, 34, bbColor(d.T), 0.7); D.sphere(tx, ty, 10 + 4 * clamp(log10(Md + 0.5), 0, 1.4), dotColor(d.T), { gloss: true, outline: '#0f172a', outlineWidth: 2 });
    D.label(clamp(tx + 56, G.x0 + 60, G.x1 - 60), clamp(ty - 28, G.y0 + 12, G.y1 - 10), 'M = ' + sig(S.M, 3) + ' M☉', { bg: '#0f172a', color: '#fff', size: 12.5, pad: 8 });
    // 읽기 판
    const Sp = LAY.strip4, md = massData(S.M);
    panel(Sp.x, Sp.y, Sp.w, Sp.h, { fill: 'rgba(255,255,255,.96)' });
    const cards = [['질량 M', sig(S.M, 3) + ' M☉', '#0f172a'], ['광도 L', Lfmt(md.L), '#b45309'], ['표면 온도 T', kfmt(Math.round(md.T / 10) * 10), '#0369a1'], ['반지름 R', r2(md.R) + ' R☉', '#7c3aed']];
    const cols = PHONE ? 2 : 4, cw = (Sp.w - 24 - (cols - 1) * 8) / cols, chh = PHONE ? 64 : 48;
    cards.forEach((c, i) => {
      const x = Sp.x + 12 + (i % cols) * (cw + 8), y = Sp.y + 12 + Math.floor(i / cols) * (chh + 8);
      ctx.fillStyle = '#f1f5f9'; rr(x, y, cw, chh, 10).fill();
      TXD(x + 10, y + 17, c[0], 12, '#64748b', 'left', 700); TXD(x + 10, y + chh - 9, c[1], PHONE ? 19 : 17, c[2], 'left', 800);
    });
    // 수명 막대
    const ly = PHONE ? Sp.y + 12 + 2 * (chh + 8) + 22 : Sp.y + 12 + chh + 22, lx0 = Sp.x + 34, lx1 = Sp.x + Sp.w - 34;
    const gl = (lg) => lx0 + (lx1 - lx0) * (lg - 6) / 5.4;
    const show = lifeShown(S.M);
    TXD(lx0, ly - 4, '주계열에 머무는 시간(수명) t = 10¹⁰년 × M / L', 12.5, '#334155', 'left', 800);
    ctx.fillStyle = '#e8eef6'; rr(lx0, ly + 4, lx1 - lx0, 16, 6).fill();
    if (show) { const w = Math.max(0, gl(clamp(log10(md.t), 6, 11.4)) - lx0); ctx.save(); rr(lx0, ly + 4, lx1 - lx0, 16, 6).clip(); ctx.fillStyle = '#0ea5e9'; ctx.fillRect(lx0, ly + 4, w, 16); ctx.restore(); }
    [6, 7, 8, 9, 10, 11].forEach((e) => { const x = gl(e); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, ly + 4); ctx.lineTo(x, ly + 24); ctx.stroke(); TXD(x, ly + 37, ['100만', '1000만', '1억', '10억', '100억', '1000억'][e - 6], PHONE ? 10.5 : 11, '#64748b', 'center', 700); });
    TXD(lx1, ly - 4, show ? 't = ' + fmtYears(md.t) : 't = ?  (계산해 보세요)', 13.5, show ? '#0369a1' : '#94a3b8', 'right', 800);
  }

  /* ======================================================
     컨트롤 연결
     ====================================================== */
  const modeSeg = $('#modeSeg'), sMass = $('#sMass'), oMass = $('#oMass'), inLife = $('#inLife');
  const MATCH_ORDER = [4, 0, 6, 2, 5, 1, 3];
  $('#matchRows').innerHTML = CLS.map((c) => '<div class="mrow" data-k="' + c.k + '"><span>' + c.k + '</span><select class="mini-sel" data-k="' + c.k + '" aria-label="' + c.k + '형의 온도 범위"><option value="">고르세요</option>' + MATCH_ORDER.map((i) => '<option value="' + CLS[i].k + '">' + CLS[i].txt + '</option>').join('') + '</select></div>').join('');
  const ZONE_NUMS = [['super', 1], ['giant', 2], ['ms', 3], ['wd', 4]];
  $('#zoneRows').innerHTML = ZONE_NUMS.map((z) => '<div class="mrow" data-z="' + z[0] + '"><span>' + '①②③④'[z[1] - 1] + '</span><select class="mini-sel" data-z="' + z[0] + '" aria-label="영역 ' + z[1] + '의 이름"><option value="">고르세요</option><option value="ms">주계열</option><option value="giant">거성</option><option value="super">초거성</option><option value="wd">백색 왜성</option></select></div>').join('');
  $('#radChips').innerHTML = RADII.map((r) => '<button class="opt" type="button" data-r="' + r + '">' + sig(r, 3) + ' R☉</button>').join('');
  $('#clsChips').innerHTML = [['big', '거성·초거성'], ['ms', '주계열'], ['wd', '백색 왜성']].map((c) => '<button class="opt" type="button" data-c="' + c[0] + '">' + c[1] + '</button>').join('');
  $('#massChips').innerHTML = MASSES.map((m) => '<button class="opt" type="button" data-m="' + m + '">' + m + ' M☉</button>').join('');

  const matchOk = (k) => S.match[k] === k;
  const matchN = () => CLS.filter((c) => matchOk(c.k)).length;
  const openN = () => Object.keys(S.open).length;
  const zoneN = () => ZONE_NUMS.filter((z) => S.zoneSel[z[0]] === z[0]).length;
  const rN = () => Object.keys(S.rOk).length, cN = () => Object.keys(S.cOk).length;

  function setView(v) { if (S.view !== v) { S.view = v; S.fade = 1; parts.clear(); S.aim = null; S.hover = null; } updateCtl(); }
  function updateCtl() {
    $('#tbLabel').textContent = VIEW_LABEL[S.view];
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !c.dataset.modes.split(' ').includes(S.view); });
    const free = !!(game && game.free);
    $('#zoneBox').hidden = !(S.view === 'v2' && (S.zonesOn || free));
    $('#radBox').hidden = !(S.view === 'v3' && (S.rMode || free));
    $('#clsBox').hidden = !(S.view === 'v3' && (S.cMode || free));
    $('#lifeBox').hidden = !(S.view === 'v4' && (S.lifeOn || free));
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.view === S.view));
    if (modeSeg) modeSeg.hidden = !free;
    $$('#matchRows .mrow').forEach((r) => r.classList.toggle('ok', matchOk(r.dataset.k)));
    $$('#matchRows select').forEach((s) => { s.value = S.match[s.dataset.k] || ''; });
    $$('#zoneRows .mrow').forEach((r) => r.classList.toggle('ok', S.zoneSel[r.dataset.z] === r.dataset.z));
    $$('#zoneRows select').forEach((s) => { s.value = S.zoneChoice && S.zoneChoice[s.dataset.z] || ''; });
    $('#oCur').textContent = placedN() + ' / 20';
    const ci = S.view === 'v2' ? curIdx() : -1;
    $('#curNote').innerHTML = ci >= 0 ? '<b>' + SD[ci].name + '</b> (' + SD[ci].sp + '형, ' + kfmt(SD[ci].T) + ', L = ' + Lfmt(SD[ci].L) + ')의 자리를 H-R도에서 찾아 눌러요. <b>온도는 오른쪽으로 갈수록 낮아져요.</b>' : '별 20개를 모두 찍었어요! 띠 모양을 찾아봐요.';
    $('#bGuide').textContent = S.guide ? '💡 자리 숨기기' : '💡 자리 알려 주기';
    $('#radNote').innerHTML = S.rIdx < RQ.length ? '<b>' + SD[RQ[S.rIdx]].name + '</b> (파랗게 깜박여요)은 어느 반지름 등값선 가까이에 있을까요? (' + rN() + ' / 4)' : '반지름을 4개 모두 읽었어요!';
    $('#clsNote').innerHTML = S.cIdx < CQ.length ? '<b>' + SD[CQ[S.cIdx]].name + '</b> (파랗게 깜박여요)은 어떤 별일까요? (' + cN() + ' / 8)' : '별 8개를 모두 분류했어요!';
    $$('#radChips .opt').forEach((b) => { b.disabled = S.rIdx >= RQ.length; });
    $$('#clsChips .opt').forEach((b) => { b.disabled = S.cIdx >= CQ.length; });
    $$('#cntChips .opt').forEach((b) => b.classList.toggle('on', b.dataset.k === S.cnt));
    $$('#massChips .opt').forEach((b) => { b.classList.toggle('on', Math.abs(+b.dataset.m - S.M) < 1e-6); b.classList.toggle('good', !!S.lifeRec[+b.dataset.m] && [1, 5, 20].indexOf(+b.dataset.m) >= 0); });
    const md = massData(S.M);
    $('#lifeNote').innerHTML = '지금 <b>M = ' + sig(S.M, 3) + ' M☉</b>, <b>L = ' + Lfmt(md.L) + '</b>. 수명을 년 단위로 써요. (예: 100억, 1e8, 4×10^6)';
  }
  /* 1단계 */
  $$('#matchRows select').forEach((s) => s.addEventListener('change', () => {
    const k = s.dataset.k; S.match[k] = s.value || undefined;
    if (s.value === k) { Sound.tick(); } else if (s.value) Sound.fail();
    updateCtl();
  }));
  /* 2단계 */
  $('#bGuide').addEventListener('click', () => { Sound.click(); S.guide = !S.guide; updateCtl(); });
  $('#bClear').addEventListener('click', () => { Sound.click(); clearPlot(); });
  function clearPlot() { S.placed = {}; S.cur = 0; S.done2 = 0; S.bandA = 0; S.guide = false; S.zoneSel = {}; S.zoneChoice = {}; SD.forEach((s) => { s.fails = 0; s.anim.v = 0; }); parts.clear(); updateCtl(); }
  $$('#zoneRows select').forEach((s) => s.addEventListener('change', () => {
    S.zoneChoice = S.zoneChoice || {}; S.zoneChoice[s.dataset.z] = s.value || undefined;
    S.zoneSel[s.dataset.z] = s.value ? (s.value === s.dataset.z ? s.dataset.z : 'x') : undefined;
    if (s.value === s.dataset.z) Sound.tick(); else if (s.value) Sound.fail();
    updateCtl();
  }));
  function placeStar(s, p, G) {
    S.placed[s.i] = true; const cr = curCardRect(G);
    s.sx = p ? p.x : cr.x + cr.w / 2; s.sy = p ? p.y : cr.y + cr.h / 2; s.anim.v = 0;
    SciSim.tween(s.anim, { v: 1 }, { duration: 0.6, ease: 'outBack' });
    const [ex, ey] = starXY(G, s);
    setTimeout(() => { if (S.view === 'v2') parts.burst(ex, ey, { count: 12, speed: 100, size: 3, life: 0.6, colors: [dotColor(s.T), '#fff', '#fde68a'] }); }, 380);
    Sound.success();
    if (placedN() === 20 && !S.done2) {
      S.done2 = 1; S.bandA = 0; SciSim.tween(S, { bandA: 1 }, { duration: 1.2, ease: 'outCubic' });
      say('20개를 모두 찍었어요! 왼쪽 위에서 오른쪽 아래로 이어지는 띠가 보여요.', false, 4.5);
    } else say(s.name + ' 정확해요!', false, 1.4);
    updateCtl();
  }
  function attemptPlace(p) {
    const ci = curIdx(); if (ci < 0) return false;
    const G = geom(LAY.plot2); if (!G.inside(p.x, p.y)) return false;
    const s = SD[ci], dT = Math.abs(log10(G.tOf(p.x)) - log10(s.T)), dL = Math.abs(G.lgOf(p.y) - log10(s.L));
    if (dT <= 0.05 && dL <= 0.4) { placeStar(s, p, G); return true; }
    s.fails++; Sound.fail();
    say(dT > 0.05 ? '온도(가로)가 달라요. ' + s.name + '은(는) ' + kfmt(s.T) + '예요. 온도가 높을수록 왼쪽이에요.' : '광도(세로)가 달라요. ' + s.name + '의 광도는 ' + Lfmt(s.L) + '예요.', true, 3.4);
    if (s.fails >= 2) say('초록색 표시가 나타났어요. 그 자리를 눌러 봐요.', true, 3);
    updateCtl(); return false;
  }
  /* 3단계 */
  $$('#radChips .opt').forEach((b) => b.addEventListener('click', () => answerR(+b.dataset.r)));
  $$('#clsChips .opt').forEach((b) => b.addEventListener('click', () => answerC(b.dataset.c)));
  $$('#cntChips .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.cnt = b.dataset.k; updateCtl(); }));
  function answerR(r) {
    if (S.rIdx >= RQ.length) return; const s = SD[RQ[S.rIdx]], right = nearestR(s.R);
    if (r === right) { S.rOk[s.i] = true; S.rIdx++; Sound.success(); say(s.name + ': 반지름이 약 ' + sig(right, 3) + ' R☉인 등값선 가까이에 있어요.', false, 2.6); const G = geom(LAY.plot3), [x, y] = starXY(G, s); parts.burst(x, y, { count: 12, speed: 100, size: 3, life: 0.6, colors: ['#22c55e', '#fff', '#fde68a'] }); }
    else { Sound.fail(); say(r > right ? '더 작은 등값선이에요. 등값선은 오른쪽 위로 갈수록 큰 별이에요.' : '더 큰 등값선이에요. 별 점이 어느 점선 위(또는 가장 가까이)에 있는지 봐요.', true, 3.2); }
    updateCtl();
  }
  function answerC(k) {
    if (S.cIdx >= CQ.length) return; const s = SD[CQ[S.cIdx]], right = CKIND(s);
    if (k === right) { S.cOk[s.i] = true; S.cIdx++; Sound.success(); say(s.name + ': ' + (right === 'big' ? '거성·초거성' : KIND_NAME[right]) + '이에요!', false, 2); const G = geom(LAY.plot3), [x, y] = starXY(G, s); parts.burst(x, y, { count: 12, speed: 100, size: 3, life: 0.6, colors: ['#22c55e', '#fff', '#fde68a'] }); }
    else { Sound.fail(); say(right === 'big' ? '온도에 비해 광도가 훨씬 커요(오른쪽 위). 반지름이 큰 별이에요.' : right === 'wd' ? '온도에 비해 광도가 훨씬 작아요(왼쪽 아래). 반지름이 아주 작은 별이에요.' : '이 별은 왼쪽 위에서 오른쪽 아래로 이어진 띠 위에 있어요.', true, 3.4); }
    updateCtl();
  }
  /* 4단계 */
  const slOf = (M) => Math.round(1000 * Math.log(M / 0.5) / Math.log(40));
  const massOut = (M) => sig(M, 3) + ' M☉';
  function setMass(M) { S.M = M; sMass.value = slOf(M); sMass.style.setProperty('--pct', (slOf(M) / 10) + '%'); oMass.textContent = massOut(M); updateCtl(); }
  sMass.addEventListener('input', () => {
    let M = 0.5 * pow(40, +sMass.value / 1000);
    const pre = MASSES.find((m) => Math.abs(m - M) / m < 0.02); if (pre) M = pre;
    S.M = M; sMass.style.setProperty('--pct', (+sMass.value / 10) + '%'); oMass.textContent = massOut(M); updateCtl();
  });
  $$('#massChips .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMass(+b.dataset.m); }));
  function recordLife() {
    const M = [1, 5, 20].find((m) => Math.abs(S.M - m) < 1e-6);
    if (!M) { Sound.fail(); say('질량을 1, 5, 20 M☉ 중 하나로 맞춰요.', true, 2.4); return; }
    const md = massData(M), v = parseYears(inLife.value);
    if (!isFinite(v) || v <= 0) { Sound.fail(); say('연수를 숫자로 써요. 예: 100억, 1e8, 4×10^6', true, 2.6); return; }
    if (Math.abs(v - md.t) / md.t > 0.1) { Sound.fail(); say('다시 계산해 봐요. t = 10¹⁰년 × ' + sig(M, 3) + ' / ' + sig(md.L, 3) + ' 이에요.', true, 3.4); return; }
    S.lifeRec[M] = true; Sound.success(); say('M = ' + M + ' M☉의 수명은 약 ' + fmtYears(md.t) + '이에요!', false, 3); inLife.value = ''; updateCtl();
  }
  $('#bLife').addEventListener('click', recordLife);
  inLife.addEventListener('keydown', (e) => { if (e.key === 'Enter') recordLife(); });
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setView(b.dataset.view); }));

  /* ---------- 포인터 ---------- */
  function hitStar(G, p, all) { let best = null, bd = 15; SD.forEach((s) => { if (!all && !S.placed[s.i]) return; const [x, y] = starXY(G, s), d = Math.hypot(x - p.x, y - p.y); if (d < bd) { bd = d; best = s.i; } }); return best; }
  const cardAt = (p) => SD.find((s) => { const r = cardRect(s.i); return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h; });
  function openCard(s) {
    if (!S.open[s.i]) { S.open[s.i] = true; s.tf = 1; Sound.tick(); const r = cardRect(s.i); parts.burst(r.x + r.w / 2, r.y + r.h / 2, { count: 10, speed: 90, size: 3, life: 0.5, colors: [dotColor(s.T), '#fff'] }); }
    S.sel = s.i; updateCtl();
  }
  SciSim.pointer(view, {
    down(p) {
      if (S.view === 'v1') { const s = cardAt(p); if (s) { openCard(s); } return false; }
      if (S.view === 'v2') {
        const G = geom(LAY.plot2);
        if (curIdx() < 0) { const h = hitStar(G, p); if (h != null) { S.hover = h; S.hoverT = 3; } return false; }
        if (G.inside(p.x, p.y)) { S.aim = { x: p.x, y: p.y }; return true; }
        return false;
      }
      if (S.view === 'v3') { const G = geom(LAY.plot3), h = hitStar(G, p, true); if (h != null) { S.hover = h; S.hoverT = 3; } return false; }
      return false;
    },
    move(p) { if (S.view === 'v2' && S.aim) S.aim = { x: p.x, y: p.y }; },
    up(p) {
      if (S.view === 'v2' && S.aim) { const a = S.aim; S.aim = null; if (!attemptPlace(a)) { const h = hitStar(geom(LAY.plot2), a); if (h != null) { S.hover = h; S.hoverT = 3; } } }
    },
    hover(p) {
      if (S.view === 'v1') return cardAt(p) ? 'pointer' : 'default';
      if (S.view === 'v2') { const G = geom(LAY.plot2); S.hover = hitStar(G, p); S.hoverT = S.hover != null ? 1 : 0; return G.inside(p.x, p.y) ? 'crosshair' : 'default'; }
      if (S.view === 'v3') { const G = geom(LAY.plot3); S.hover = hitStar(G, p, true); S.hoverT = S.hover != null ? 1 : 0; return S.hover != null ? 'pointer' : 'default'; }
      return 'default';
    },
  });

  /* ---------- 읽기 칸 ---------- */
  function readouts() {
    const v = S.view;
    if (v === 'v1') { const s = S.sel != null ? SD[S.sel] : null; setReadouts(['열어 본 카드', openN() + ' / 20', '고른 별', s ? s.name + ' (' + s.sp + ')' : '—', '온도 · 광도', s ? kfmt(s.T) + ' · ' + Lfmt(s.L) : '—']); }
    else if (v === 'v2') setReadouts(['찍은 별', placedN() + ' / 20', '이름표 붙인 영역', zoneN() + ' / 4', '다음 별', curIdx() >= 0 ? SD[curIdx()].name : '모두 찍었어요']);
    else if (v === 'v3') setReadouts(['읽은 반지름', rN() + ' / 4', '분류한 별', cN() + ' / 8', '고른 개수 막대', S.cnt === 'mine' ? '내가 그린 20개' : '태양 근처 100개']);
    else { const md = massData(S.M); setReadouts(['질량 · 광도', sig(S.M, 3) + ' M☉ · ' + Lfmt(md.L), '온도 · 반지름', kfmt(Math.round(md.T / 10) * 10) + ' · ' + r2(md.R) + ' R☉', '수명', lifeShown(S.M) ? fmtYears(md.t) : '?']); }
  }

  /* ======================================================
     단계 · 미션
     ====================================================== */
  function enterLevel(li) {
    clearTimeout(hintTimer); parts.clear(); flash.t = 0; S.aim = null;
    if (li === 0) { setView('v1'); showHint('별 카드를 눌러 자료를 확인해요', 5000); }
    else if (li === 1) { S.zonesOn = false; setView('v2'); showHint('별이 있을 자리를 눌러 H-R도에 찍어요', 5000); }
    else if (li === 2) { S.rMode = false; S.cMode = false; setView('v3'); showHint('점선은 반지름이 같은 별들을 이은 선이에요', 5000); }
    else { S.lifeOn = false; setView('v4'); setMass(1); showHint('질량 슬라이더로 별을 주계열 위에 놓아 봐요', 5000); }
    updateCtl();
  }
  const tbl = (rows) => '<table class="mini">' + rows.map((r, i) => '<tr>' + r.map((c) => (i === 0 ? '<th>' : '<td>') + c + (i === 0 ? '</th>' : '</td>')).join('') + '</tr>').join('') + '</table>';

  const levels = [
    {
      title: '자료 모으기: 분광형·온도·광도', short: '자료 모으기', icon: '🗂️', phase: '분석', features: ['cards'],
      intro: '<p class="si-q">❓ 탐구 질문: 별을 온도와 밝기로 늘어놓으면 어떤 무늬가 나타날까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시에서</b> 스펙트럼으로 별의 <b>분광형</b>(O B A F G K M, 오른쪽으로 갈수록 저온)을 정하고, 흑체복사 법칙으로 온도·광도·반지름의 관계(L = 4πR²σT⁴)를 배웠어요. 중학교에서는 별의 색과 밝기를 배웠어요.</div>' +
        '<p><b>H-R도</b>(헤르츠스프룽-러셀도)는 별의 <b>표면 온도(분광형)</b>와 <b>광도</b>를 두 축으로 하는 그래프예요. 먼저 별 20개의 자료를 모아요.</p>' +
        '<p>광도는 태양을 1로 두고 비교해요. 값이 수억 배 차이 나므로 <b>한 칸이 10배</b>인 <b>로그 눈금</b>을 써요.</p>',
      setup() { enterLevel(0); },
      recap: '분광형은 O → M으로 갈수록 표면 온도가 낮아져요. 광도는 차이가 매우 커서 로그 눈금으로 나타내요.',
      summary: '<ul><li>분광형과 표면 온도: O(3만 K 이상) · B(1만~3만 K) · A(7500~1만 K) · F(6000~7500 K) · G(5200~6000 K) · K(3700~5200 K) · M(3700 K 미만). 태양은 G2형(약 5800 K)이에요.</li><li>광도는 태양을 1(L☉)로 두고 나타내요. 별에 따라 약 10⁻⁴ ~ 10⁶ L☉로 달라서 <b>로그 눈금</b>(한 칸 = 10배)을 써요.</li></ul>',
      missions: [
        {
          title: '카드 열고 분광형 짝짓기',
          goal: '별 카드를 <b>5장 이상</b> 눌러 분광형·온도·광도를 확인하고, <b>분광형 O~M 일곱 가지</b>에 알맞은 온도 범위를 짝지어요.',
          hint: '카드의 분광형과 온도를 함께 보면 규칙이 보여요. 분광형이 O → M으로 갈수록 온도가 낮아져요.',
          hold: 0.5, setup() { S.open = {}; S.sel = null; S.match = {}; SD.forEach((q) => { q.tf = 0; q.f = 0; }); setView('v1'); updateCtl(); },
          status: () => '열어 본 카드 ' + openN() + ' / 5 ' + mark(openN() >= 5) + ' · 짝짓기 ' + matchN() + ' / 7 ' + mark(matchN() === 7),
          check: () => openN() >= 5 && matchN() === 7,
          explain: 'O → B → A → F → G → K → M 으로 갈수록 표면 온도가 낮아져요. O형은 약 3만 K 이상, M형은 약 3700 K 미만이에요. 태양은 G2형이라 약 5800 K예요. (백색 왜성의 DA·DQ는 별의 마지막 단계를 나타내는 따로 정한 분광형이에요.)',
        },
        {
          type: 'quiz', title: '왜 로그 눈금일까?', goal: '광도가 큰 별과 작은 별을 한 그래프에 그리려면 왜 <b>로그 눈금</b>이 필요할까요?', setup() { setView('v1'); },
          choices: ['광도가 약 4억 배나 차이 나서, 보통 눈금에서는 작은 별과 큰 별을 한 그래프에 모두 나타낼 수 없기 때문이에요', '로그 눈금을 쓰면 별의 온도가 더 정확해지기 때문이에요', '광도가 큰 별일수록 더 정확하게 측정되기 때문이에요', '그래프를 예쁘게 보이게 하기 위해서예요'],
          answer: 0,
          feedback: ['', '로그 눈금은 온도가 아니라 값이 넓게 퍼진 광도를 나타내려고 써요.', '측정의 정확도와는 관계가 없어요. 값이 넓게 퍼져 있는 것이 이유예요.', '보기 좋게 하려는 것이 아니라 넓은 범위를 한 그래프에 담으려는 거예요.'],
          explain: '가장 밝은 별(2×10⁵ L☉)과 가장 어두운 별(5×10⁻⁴ L☉)은 약 4억 배나 차이 나요. 로그 눈금은 한 칸마다 10배가 되어 이렇게 넓은 범위도 한 그래프에 나타낼 수 있어요.',
        },
      ],
    },
    {
      title: 'H-R도 그리기: 띠 모양 찾기', short: 'H-R도 그리기', icon: '📈', phase: '기록', features: ['plot'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 별 20개의 분광형(온도)과 광도 자료를 모으고 로그 눈금을 알아봤어요.</div>' +
        '<p>이제 별을 하나씩 <b>H-R도</b>에 찍어요. <b>가로축은 표면 온도(분광형)로 오른쪽으로 갈수록 낮아지고</b>, 세로축은 광도(로그 눈금)예요.</p>' +
        '<p>별이 있을 자리를 누르면(누른 채 움직이면 눈금 값이 보여요) 그 자리에 점이 찍혀요. 20개를 모두 찍으면 어떤 무늬가 나타날까요?</p>',
      setup() { enterLevel(1); },
      recap: 'H-R도에서 별들은 왼쪽 위에서 오른쪽 아래로 이어진 띠(주계열)와 오른쪽 위(거성·초거성), 왼쪽 아래(백색 왜성)에 모여 있어요.',
      summary: '<ul><li><b>H-R도</b>: 가로축 = 표면 온도(분광형, 오른쪽으로 갈수록 저온), 세로축 = 광도(로그 눈금).</li><li>왼쪽 위에서 오른쪽 아래로 이어진 띠가 <b>주계열</b>, 오른쪽 위가 <b>거성·초거성</b>, 왼쪽 아래가 <b>백색 왜성</b>이에요.</li><li>오른쪽 위의 별은 온도가 낮은데 광도가 매우 커서 반지름이 커요. (L = 4πR²σT⁴)</li></ul>',
      missions: [
        {
          title: '별 20개를 H-R도에 찍기',
          goal: '카드 속 별을 하나씩 H-R도의 알맞은 자리에 찍어 <b>20개</b>를 모두 찍어요.',
          hint: '가로 = 표면 온도(오른쪽이 저온), 세로 = 광도예요. 💡 <b>자리 알려 주기</b> 버튼을 눌러도 돼요.',
          hold: 0.6, setup() { clearPlot(); S.zonesOn = false; setView('v2'); },
          status: () => '찍은 별 ' + placedN() + ' / 20',
          check: () => placedN() === 20,
          explain: '별을 모두 찍으면 <b>왼쪽 위에서 오른쪽 아래로 이어지는 띠</b>가 나타나요. 별들은 아무 곳에나 있지 않고 몇 개의 집단으로 모여 있어요.',
        },
        {
          title: '영역 이름표 붙이기',
          goal: 'H-R도의 영역 <b>①~④</b>에 알맞은 이름(주계열·거성·초거성·백색 왜성)을 골라요. 그리고 <b>✔ 확인하기</b>를 눌러요.', manual: true,
          hint: '띠 모양으로 이어진 곳이 주계열이에요. 오른쪽 위는 온도가 낮은데 아주 밝은 별이고, 왼쪽 아래는 온도가 높은데 어두운 별이에요.',
          setup() { SD.forEach((q) => { if (!S.placed[q.i]) { S.placed[q.i] = true; q.anim.v = 1; } }); S.done2 = 1; S.bandA = 1; S.zoneSel = {}; S.zoneChoice = {}; S.zonesOn = true; setView('v2'); updateCtl(); },
          check: () => {
            if (ZONE_NUMS.some((z) => !(S.zoneChoice && S.zoneChoice[z[0]]))) return '네 영역의 이름을 모두 골라요.';
            const bad = ZONE_NUMS.filter((z) => S.zoneSel[z[0]] !== z[0]);
            return bad.length ? '영역 ' + bad.map((z) => '①②③④'[z[1] - 1]).join(', ') + '의 이름이 아직 맞지 않아요. 광도와 온도를 다시 봐요.' : true;
          },
          explain: '<b>주계열</b>은 띠 모양 영역(별의 대부분), <b>거성</b>은 띠 위쪽 오른쪽, <b>초거성</b>은 맨 위 오른쪽, <b>백색 왜성</b>은 띠 아래 왼쪽이에요.',
        },
        {
          type: 'quiz', title: '오른쪽 위의 별', goal: 'H-R도 <b>오른쪽 위</b>에 있는 별은 왜 크기가 클까요?', setup() { S.zonesOn = true; setView('v2'); },
          choices: ['온도는 낮은데 광도가 매우 커서, L = 4πR²σT⁴ 에 따라 반지름이 아주 커야 하기 때문이에요', '온도가 높아서 반지름이 크기 때문이에요', '광도가 작아서 반지름이 크기 때문이에요', '오른쪽의 별은 지구에서 가까워서 크게 보이기 때문이에요'],
          answer: 0,
          feedback: ['', '오른쪽 위의 별은 온도가 높은 것이 아니라 낮아요(오른쪽으로 갈수록 저온).', '오른쪽 위의 별은 광도가 작은 것이 아니라 매우 커요.', '광도와 온도는 별 자체의 값이에요. 거리와는 관계가 없어요.'],
          explain: '단위 면적당 내는 에너지(σT⁴)는 작은데 별 전체의 광도 L은 크므로, 겉넓이(4πR²)가 매우 커야 해요. 그래서 오른쪽 위의 별은 <b>반지름이 큰 거성·초거성</b>이에요.',
        },
      ],
    },
    {
      title: '별의 집단: 크기와 개수', short: '별의 집단', icon: '🧭', phase: '분석', features: ['contour'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 별 20개를 H-R도에 찍어 띠와 몇 개의 집단을 찾았어요.</div>' +
        '<p>L = 4πR²σT⁴ 에서 <b>L/L☉ = (R/R☉)²(T/T☉)⁴</b> 이므로, 반지름이 같은 별들은 H-R도에서 한 줄 위에 놓여요. 이 점선이 <b>반지름 등값선</b>이에요. 오른쪽 위로 갈수록 큰 별이에요.</p>' +
        '<p>등값선으로 별의 반지름을 읽고, 별을 거성·주계열성·백색 왜성으로 나눠 봐요. 그래프의 개수 막대로 종류별 별의 수도 비교해요.</p>',
      setup() { enterLevel(2); },
      recap: '같은 반지름의 별은 H-R도의 등값선 위에 놓여요. 거성은 반지름이 크고, 백색 왜성은 반지름이 아주 작아요.',
      summary: '<ul><li>반지름 등값선: R = 0.01, 1, 10, 100, 1000 R☉. 오른쪽 위로 갈수록 반지름이 커요.</li><li>태양 ≈ 1 R☉, 폴룩스 ≈ 10 R☉, 베텔게우스 ≈ 870 R☉(1000 R☉ 가까이), 시리우스 B ≈ 0.0085 R☉(지구와 비슷)예요.</li><li>백색 왜성은 온도가 높아도 반지름이 아주 작아 광도가 작아요.</li><li>태양 근처의 별 100개 중에는 <b>주계열성이 약 90 %</b>예요. 눈에 잘 띄는 밝은 별만 고르면 거성이 많아 보여요.</li></ul>',
      missions: [
        {
          title: '등값선으로 반지름 읽기',
          goal: '파랗게 깜박이는 별이 어느 <b>반지름 등값선 가까이</b>에 있는지 골라요. 별 <b>4개</b>를 읽어요.',
          hint: '별 점 가까이를 지나는 점선의 이름(R = … R☉)을 봐요. 등값선 사이에 있으면 더 가까운 쪽을 골라요.',
          hold: 0.5, setup() { S.rMode = true; S.cMode = false; S.rIdx = 0; S.rOk = {}; S.cIdx = 0; S.cOk = {}; setView('v3'); updateCtl(); },
          status: () => '읽은 별 ' + rN() + ' / 4',
          check: () => rN() >= 4,
          explain: '태양은 1 R☉ 선 위에 있고, 폴룩스는 약 10 R☉, 베텔게우스는 약 870 R☉로 1000 R☉ 선 가까이에 있어요. 시리우스 B는 약 0.0085 R☉로 0.01 R☉ 선 가까이에 있어요.',
        },
        {
          title: '별의 종류 분류하기',
          goal: '파랗게 깜박이는 별 <b>8개</b>가 거성·초거성, 주계열성, 백색 왜성 중 무엇인지 위치를 보고 골라요.',
          hint: '띠 위에 있으면 주계열성, 오른쪽 위에 있으면 거성·초거성, 왼쪽 아래에 있으면 백색 왜성이에요.',
          hold: 0.5, setup() { S.rMode = true; S.cMode = true; S.cIdx = 0; S.cOk = {}; if (S.rIdx < RQ.length) { RQ.forEach((i) => { S.rOk[i] = true; }); S.rIdx = RQ.length; } setView('v3'); updateCtl(); },
          status: () => '분류한 별 ' + cN() + ' / 8',
          check: () => cN() >= 8,
          explain: '거성·초거성(안타레스, 아르크투루스, 폴룩스), 주계열성(태양, 베가, 바너드별), 백색 왜성(시리우스 B, 프로키온 B)으로 나뉘어요. 개수 막대를 보면 우리가 고른 밝은 별 20개 중에는 거성이 많지만, 태양 근처 별 100개 중에는 주계열성이 약 90 %예요.',
        },
        {
          type: 'quiz', title: '어두운 백색 왜성', goal: '백색 왜성은 온도가 <b>높은데도</b> 왜 어두울까요?', setup() { S.rMode = true; S.cMode = true; setView('v3'); },
          choices: ['반지름이 매우 작아서 겉넓이가 작기 때문이에요', '온도가 낮아서 광도가 작기 때문이에요', '반지름이 매우 커서 에너지가 퍼지기 때문이에요', '백색 왜성은 빛을 내지 않기 때문이에요'],
          answer: 0,
          feedback: ['', '백색 왜성은 온도가 낮은 것이 아니라 높아요. 그래도 어두운 까닭을 생각해 봐요.', '반지름이 크면 오히려 밝아져요. 백색 왜성은 반지름이 아주 작아요.', '백색 왜성은 남은 열로 빛을 내요. 다만 겉넓이가 작아 어두워요.'],
          explain: '백색 왜성은 단위 면적당 에너지(σT⁴)는 크지만 반지름이 지구 정도로 아주 작아 겉넓이(4πR²)가 작으므로 광도가 작아요.',
        },
      ],
    },
    {
      title: '주계열의 성질: 질량과 수명', short: '주계열 성질', icon: '⚖️', phase: '탐구', features: ['mass'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 별의 대부분이 H-R도의 띠인 <b>주계열</b>에 있다는 것을 확인했어요.</div>' +
        '<p>같은 주계열이라도 별의 <b>질량</b>에 따라 H-R도 위의 자리가 달라요. 질량 슬라이더로 별을 주계열 위에 놓고 광도 L, 온도 T, 반지름 R을 읽어요.</p>' +
        '<p>별의 수명은 연료(질량)를 쓰는 속도(광도)로 정해져요. 단순하게 <b>t ≈ 10¹⁰년 × (M/M☉) ÷ (L/L☉)</b> 로 어림해요. (예시 값이에요.)</p>',
      setup() { enterLevel(3); },
      recap: '주계열에서 질량이 클수록 왼쪽 위(고온·고광도)에 놓이고, 광도가 훨씬 커서 수명은 짧아요.',
      summary: tbl([['질량 M☉', 'L/L☉', 'T (K)', 'R/R☉', '수명'], ['0.5', '0.04', '3800', '0.43', '1250억 년'], ['1', '1', '5800', '1.0', '100억 년'], ['2', '25', '9900', '1.7', '8억 년'], ['5', '500', '16000', '2.9', '1억 년'], ['10', '6000', '25000', '4.2', '1700만 년'], ['20', '5×10⁴', '32000', '7.3', '400만 년']]) +
        '<ul><li>질량이 클수록 주계열 위에서 왼쪽 위(고온·고광도)에 놓여요.</li><li>수명 t ≈ 10¹⁰년 × M ÷ L. 무거운 별은 연료는 많지만 광도가 훨씬 커서 <b>더 빨리</b> 연료를 써요. (예시 값, 대략)</li></ul>',
      missions: [
        {
          title: '질량 20 M☉ 별 놓기',
          goal: '질량을 <b>20 M☉</b>로 맞춰 별이 주계열 위 어디에 놓이는지 확인해요.',
          hint: '질량 슬라이더를 오른쪽 끝까지 움직이거나 20 M☉ 버튼을 눌러요. 별은 왼쪽 위로 올라가요.',
          hold: 0.8, setup() { S.lifeOn = false; setView('v4'); },
          status: () => '질량 ' + sig(S.M, 3) + ' M☉ ' + mark(Math.abs(S.M - 20) < 1e-6) + ' · 별이 왼쪽 위에 도착 ' + mark(Math.abs(S.lmd - log10(20)) < 0.01),
          check: () => Math.abs(S.M - 20) < 1e-6 && Math.abs(S.lmd - log10(20)) < 0.01,
          explain: '20 M☉ 별은 약 5×10⁴ L☉, 32000 K로 <b>주계열의 왼쪽 위</b>에 놓여요. 질량이 클수록 고온·고광도예요. 반지름은 약 7.3 R☉예요.',
        },
        {
          title: '수명 계산하기',
          goal: '질량을 <b>1, 5, 20 M☉</b>로 맞추고, 광도 L을 읽어 <b>t = 10¹⁰년 × M ÷ L</b>을 계산해 기록해요.',
          hint: '1 M☉: L = 1 이라 t = 10¹⁰년(100억 년). 5 M☉: L = 500, 20 M☉: L = 5×10⁴ 이에요. 100억, 1e8, 4×10^6 처럼 써도 돼요.',
          hold: 0.5, setup() { S.lifeOn = true; S.lifeRec = {}; inLife.value = ''; setView('v4'); updateCtl(); },
          status: () => [1, 5, 20].map((m) => m + ' M☉ ' + mark(!!S.lifeRec[m])).join(' · '),
          check: () => [1, 5, 20].every((m) => S.lifeRec[m]),
          explain: '1 M☉: 10¹⁰ × 1 ÷ 1 = <b>100억 년</b>, 5 M☉: 10¹⁰ × 5 ÷ 500 = <b>1억 년</b>, 20 M☉: 10¹⁰ × 20 ÷ (5×10⁴) = <b>400만 년</b>이에요. 질량이 클수록 수명이 짧아요.',
        },
        {
          type: 'quiz', title: '무거운 별의 수명', goal: '<b>무거운 별이 오래 산다</b>고 생각하는 친구에게 가장 알맞은 설명은?', setup() { S.lifeOn = true; setView('v4'); },
          choices: ['무거운 별은 연료는 많지만 광도가 훨씬 커서 연료를 빨리 써요. 그래서 수명이 짧아요', '무거운 별은 연료가 많아서 항상 더 오래 살아요', '질량과 수명은 관계가 없어요', '무거운 별은 광도가 작아서 연료를 천천히 써요'],
          answer: 0,
          feedback: ['', '연료(질량)가 많은 것은 맞지만, 광도가 질량보다 훨씬 더 크게 늘어요. 수명 = 연료 ÷ 소모 속도를 다시 생각해 봐요.', '수명은 t ≈ 10¹⁰ × M ÷ L 이라서 질량과 광도 모두에 달라요.', '무거운 별은 광도가 훨씬 커요(20 M☉는 약 5×10⁴ L☉).'],
          explain: '20 M☉ 별은 연료가 태양의 20배지만 광도는 약 5만 배라서 수명이 400만 년으로 태양(100억 년)보다 훨씬 짧아요. 무거운 별일수록 빨리 연료를 써요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'he-hr-diagram', mount: '#game', badge: 'H-R도 작성가', homeHref: '../../index.html#he',
    featureLabels: { cards: '🗂️ 별 카드 20장 · 광도 로그 눈금', plot: '📈 H-R도 · 영역 이름표', contour: '🧭 반지름 등값선 · 개수 막대', mass: '⚖️ 질량 슬라이더 · 수명 계산' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 루프 ---------- */
  let lastFree = false, trT = 0, lastLmd = 0;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    SD.forEach((s) => { s.f = approach(s.f, s.tf, dt, 10); if (Math.abs(s.f - s.tf) < 0.004) s.f = s.tf; });
    if (S.hoverT > 0) S.hoverT -= dt;
    // 4단계: 별이 부드럽게 이동
    S.lmd = approach(S.lmd, log10(S.M), dt, 7); if (Math.abs(S.lmd - log10(S.M)) < 0.0008) S.lmd = log10(S.M);
    if (S.view === 'v4') { trT += dt; if (trT > 0.04) { trT = 0; if (Math.abs(S.lmd - lastLmd) > 0.002) { const d = massData(pow(10, S.lmd)); S.tr.push([d.T, d.L]); if (S.tr.length > 22) S.tr.shift(); } else if (S.tr.length) S.tr.shift(); lastLmd = S.lmd; } } else S.tr.length = 0;
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    ctx.fillStyle = '#0e1730'; ctx.fillRect(0, 0, VW, VH);
    const bgG = ctx.createRadialGradient(VW * 0.2, 0, 10, VW * 0.2, 0, VH); bgG.addColorStop(0, 'rgba(56,90,180,.25)'); bgG.addColorStop(1, 'rgba(14,23,48,0)'); ctx.fillStyle = bgG; ctx.fillRect(0, 0, VW, VH);
    if (S.view === 'v1') drawV1(t, dt);
    else if (S.view === 'v2') drawV2(t, dt);
    else if (S.view === 'v3') drawV3(t, dt);
    else drawV4(t, dt);
    parts.draw(ctx);
    drawFlash(dt, S.view === 'v1' ? LAY.ruler.y + 6 : PHONE && S.view === 'v2' ? LAY.card2.y + LAY.card2.h + 8 : S.view === 'v4' ? LAY.plot4.y + 40 : 8);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(14,23,48,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, LAY, SD, QUEUE, CQ, RQ, geom, ZONES, massData, kindOf, nearestR, parseYears, fmtYears, MT, HRC,
    get game() { return game; },
    enterLevel, setView, updateCtl, setMass, attemptPlace, placeStar, curIdx, answerR, answerC, openCard, recordLife, clearPlot, starXY,
    posOf(i) { const G = geom(LAY.plot2); return starXY(G, SD[i]); },
    placeAll() { const G = geom(LAY.plot2); SD.forEach((s) => { if (!S.placed[s.i]) { S.placed[s.i] = true; s.anim.v = 1; } }); S.done2 = 1; S.bandA = 1; updateCtl(); },
    openAll() { SD.forEach((s) => { S.open[s.i] = true; s.tf = 1; s.f = 1; }); S.sel = 13; updateCtl(); },
    matchAll() { CLS.forEach((c) => { S.match[c.k] = c.k; }); updateCtl(); },
    zonesAll() { S.zoneChoice = {}; ZONE_NUMS.forEach((z) => { S.zoneChoice[z[0]] = z[0]; S.zoneSel[z[0]] = z[0]; }); updateCtl(); },
  };

})();
