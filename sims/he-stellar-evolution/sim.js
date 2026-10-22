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
    { k: 'G', hi: 6000, lo: 5300, col: '#ffeab8', txt: '5,300 ~ 6,000 K' },
    { k: 'K', hi: 5300, lo: 3700, col: '#ffcf94', txt: '3,700 ~ 5,300 K' },
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
     지구과학 Ⅲ. 태양계 천체와 별과 우주의 진화 - 별의 진화 경로
     [12지구03-03] 다양한 질량을 가진 별의 진화 과정을 H-R도에 나타내고 해석
     ① 탐구: 성간 구름 → 원시별 → 주계열 진입(핵융합 시작)   ② 분석: 태양 정도 별의 주계열 이후 경로와 내부 구조
     ③ 분석: 큰 별의 초신성 폭발과 남은 천체   ④ 종합: 성간 물질로 돌아가는 순환과 세 질량의 경로 비교
     내부 구조는 수소·헬륨·탄소와 산소·철 층 정도로만 나타내고, 주계열 이후의 구체적 핵반응 단계는 다루지 않아요.
     ========================================================= */
  initStage('#0a1128', 800, 560, 600, 840, 1.25);

  /* ---------- H-R도 경로 (T K, L L☉) : 대략적인 예시 경로 ---------- */
  const TRK = {
    pre1: [[4000, 50], [4050, 20], [4150, 6], [4350, 2], [4700, 1.2], [5200, 0.9], [5700, 0.7]],
    pre5: [[4200, 900], [4250, 650], [5000, 540], [8000, 505], [12000, 500], [16000, 500]],
    pre15: [[4400, 1.5e4], [6000, 1.6e4], [12000, 1.8e4], [30000, 2e4]],
    sun2: [[5800, 1], [5500, 2], [4000, 1000], [5000, 50], [3300, 5000], [100000, 3000], [30000, 0.1], [10000, 0.0012]],
    m15: [[30000, 2e4], [25000, 6e4], [10000, 1e5], [3500, 1e5]],
    m30: [[38000, 1.5e5], [30000, 3e5], [10000, 3.5e5], [3600, 3.5e5]],
    full1: [[5700, 0.7], [5800, 1], [5500, 2], [4000, 1000], [5000, 50], [3300, 5000], [100000, 3000], [30000, 0.1], [10000, 0.0012]],
    full5: [[16000, 500], [12000, 1500], [4300, 2200], [90000, 4000], [35000, 0.2]],
    full15: [[30000, 2e4], [25000, 6e4], [10000, 1e5], [3500, 1e5]],
  };
  Object.keys(TRK).forEach((k) => { TRK[k] = TRK[k].map((p) => [log10(p[0]), log10(p[1])]); });
  /* Catmull-Rom 곡선: s = 0 ~ (점 개수 − 1) */
  function splineAt(P, s) {
    const n = P.length - 1; s = clamp(s, 0, n);
    const i = Math.min(n - 1, Math.floor(s)), u = s - i;
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(n, i + 2)];
    const cr = (a, b, c, d, t) => 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
    return [cr(p0[0], p1[0], p2[0], p3[0], u), cr(p0[1], p1[1], p2[1], p3[1], u)];
  }
  const EVC = { Tmax: 150000, Tmin: 2400, Lmin: -4, Lmax: 6, xticks: [100000, 30000, 10000, 5000, 3000], l: 56 };
  const visR = (R) => 8 + 98 * log10(1 + R) / 3;                 // 그림 속 별 반지름 (로그 비례)
  const C1 = '#f59e0b', C5 = '#16a34a', C15 = '#e11d48', C30 = '#7c3aed';
  const MCOL = { 1: C1, 5: C5, 15: C15, 30: C30 };

  /* 1단계: 전주계열 */
  const D1 = { 1: 3e7, 5: 1.2e6, 15: 6e4 };                     // 원시별 단계 길이 (년)
  const PRE = { 1: 'pre1', 5: 'pre5', 15: 'pre15' };
  const ZAMS = { 1: [5700, 0.7], 5: [16000, 500], 15: [30000, 2e4] };
  const fmtYears = (t) => {
    if (t >= 1e8) { const n = t / 1e8; return (n >= 1000 ? comma(+n.toPrecision(3)) : sig(n, 3)) + '억 년'; }
    const n = t / 1e4; return (n >= 1000 ? comma(+n.toPrecision(2)) : sig(n, 3)) + '만 년';
  };
  const tcOf = (p) => pow(10, 1 + 6 * pow(clamp(p, 0, 1), 1.4));   // 중심 온도 (K)
  /* 2단계: 태양 정도의 별 (주계열 이후) */
  const W2 = [
    { k: 'ms', name: '주계열(현재)' }, { k: 'ms', name: '주계열 끝' }, { k: 'rg', name: '적색 거성' }, { k: 'hb', name: '수평 가지' },
    { k: 'agb', name: '점근거성가지' }, { k: 'pn', name: '행성상 성운 중심별' }, { k: 'wd', name: '백색 왜성' }, { k: 'wd', name: '식어 가는 백색 왜성' },
  ];
  const ST_NAMES = { ms: '주계열', rg: '적색 거성', hb: '수평 가지', agb: '점근거성가지', pn: '행성상 성운', wd: '백색 왜성' };
  const ST_AT = { ms: 0, rg: 2, hb: 3, agb: 4, pn: 5, wd: 6 };
  const ST_ORDER = ['ms', 'rg', 'hb', 'agb', 'pn', 'wd'];
  const LY_H = [1, 1, 1, 1, 1, 0, 0, 0], LY_HE = [0.22, 0.32, 0.07, 0.22, 0.12, 0, 0, 0], LY_CO = [0, 0, 0, 0.06, 0.06, 1, 1, 1];
  const interp = (arr, s) => { const i = Math.min(arr.length - 2, Math.floor(clamp(s, 0, arr.length - 1))), u = clamp(s, 0, arr.length - 1) - i; return lerp(arr[i], arr[i + 1], u); };
  const star2 = (s) => { const p = splineAt(TRK.sun2, s), T = pow(10, p[0]), L = pow(10, p[1]); return { T, L, R: radiusOf(T, L) }; };
  const nearestSt = (s) => Math.round(clamp(s, 0, 7));
  /* 3단계: 큰 별의 최후 */
  const fateOf = (M) => (M < 8 ? 'wd' : M < 25 ? 'ns' : 'bh');
  const FATE_NAME = { wd: '백색 왜성', ns: '중성자별', bh: '블랙홀' };
  const coreMass = (M) => (M < 8 ? 0.5 + 0.06 * M : M < 25 ? 1.35 + 0.04 * (M - 8) : 3 + 0.4 * (M - 25));   // 남은 중심핵의 질량 (예시)
  const trkOf = (M) => (M < 8 ? 'sun2' : M < 25 ? 'm15' : 'm30');
  const LAYERS = [['h', '수소 층', '#fb923c'], ['he', '헬륨 층', '#fde047'], ['co', '탄소·산소 층', '#60a5fa'], ['hv', '더 무거운 원소 층', '#a78bfa'], ['fe', '철 핵', '#94a3b8']];
  /* 4단계: 세 질량 비교 */
  const T4 = { 1: { trk: 'full1', life: 1e10, ms: 2, name: '1 M☉', col: C1, end: '행성상 성운 + 백색 왜성' }, 5: { trk: 'full5', life: 1e8, ms: 1, name: '5 M☉', col: C5, end: '행성상 성운 + 백색 왜성' }, 15: { trk: 'full15', life: 7.5e6, ms: 1, name: '15 M☉', col: C15, end: '초신성 폭발 → 중성자별' } };
  function s4Of(k, t) {                                          // 시각 t(년)에서 경로 위 위치 s
    const o = T4[k], P = TRK[o.trk], n = P.length - 1, tot = o.life / 0.91, f = t / tot;
    if (f <= 0.91) return o.ms * f / 0.91;
    return Math.min(n, o.ms + (n - o.ms) * (f - 0.91) / 0.09);
  }
  const doneAt = (k) => T4[k].life / 0.91 * 1.0;                // 일생이 끝나는 때(년)

  /* ---------- 상태 ---------- */
  const S = {
    view: 'v1', clock: 0, fade: 0,
    m1: 1, p1: 0, play1: false, ign: {}, wasIgn: {},
    s2: 0, s2d: 0, maxS2: 0, rgRec: false,
    M3: 15, u3: 0, play3: false, pred: null, runM: null, fateOk: {}, runPred: null,
    tau: 6.3, play4: false, pairSel: {}, ringShown: false, nebT: 0,
    ordOn: false, ordKind: null, ord: [],
  };
  let game = null;
  const VIEW_LABEL = { v1: '🌌 성간 구름이 원시별이 되기까지', v2: '🔴 태양 정도의 별: 주계열 이후', v3: '💥 질량에 따른 별의 최후', v4: '♻️ 성간 물질의 순환과 세 별의 비교' };

  /* ---------- 배치 ---------- */
  const LAY = PHONE ? {
    v1: { sc: { x: 10, y: 10, w: 580, h: 330 }, hr: { x: 10, y: 350, w: 580, h: 480 } },
    v2: { sc: { x: 10, y: 10, w: 580, h: 380 }, hr: { x: 10, y: 400, w: 580, h: 430 } },
    v3: { sc: { x: 10, y: 10, w: 580, h: 400 }, hr: { x: 10, y: 420, w: 580, h: 410 } },
    v4: { sc: { x: 10, y: 10, w: 580, h: 320 }, hr: { x: 10, y: 340, w: 580, h: 350 }, bars: { x: 10, y: 700, w: 580, h: 130 } },
  } : {
    v1: { sc: { x: 12, y: 12, w: 336, h: 536 }, hr: { x: 358, y: 12, w: 430, h: 536 } },
    v2: { sc: { x: 12, y: 12, w: 336, h: 536 }, hr: { x: 358, y: 12, w: 430, h: 536 } },
    v3: { sc: { x: 12, y: 12, w: 336, h: 536 }, hr: { x: 358, y: 12, w: 430, h: 536 } },
    v4: { sc: { x: 12, y: 12, w: 336, h: 536 }, hr: { x: 358, y: 12, w: 430, h: 384 }, bars: { x: 358, y: 406, w: 430, h: 142 } },
  };
  const evGeom = (P) => hrFrame(P, Object.assign({ noDraw: true }, EVC));

  /* ======================================================
     H-R도 패널과 경로 그리기
     ====================================================== */
  function drawMSCurve(G) {
    const pts = []; for (let i = 0; i <= 60; i++) { const lt = lerp(log10(40000), log10(3000), i / 60); pts.push([G.gx(pow(10, lt)), G.gyl(msLog(lt))]); }
    ctx.save(); ctx.beginPath(); ctx.rect(G.x0, G.y0, G.x1 - G.x0, G.y1 - G.y0); ctx.clip(); polyline(pts, '#93c5fd', 7, { alpha: 0.35 }); ctx.restore();
    const lx = G.gx(14000), ly = G.gyl(msLog(log10(14000)));
    TXD(lx + 10, ly - 8, '주계열', 12, '#3b82f6', 'left', 800);
  }
  const trkPts = (G, P, s0, s1, step) => { const out = []; for (let s = s0; s <= s1 + 1e-6; s += step || 0.05) { const p = splineAt(P, Math.min(s, P.length - 1)); out.push([G.gx(pow(10, p[0])), G.gyl(p[1])]); } return out; };
  function drawTrack(G, P, sMax, col, w, o) {
    o = o || {};
    ctx.save(); ctx.beginPath(); ctx.rect(G.x0 - 4, G.y0 - 4, G.x1 - G.x0 + 8, G.y1 - G.y0 + 8); ctx.clip();
    if (o.ghost) polyline(trkPts(G, P, 0, P.length - 1), col, 2, { dash: [3, 6], alpha: 0.35 });
    if (sMax > 0.01) polyline(trkPts(G, P, 0, sMax), col, w || 3.5, { alpha: o.alpha == null ? 0.95 : o.alpha });
    ctx.restore();
  }
  function trackDot(G, P, s, col, r, o) {
    o = o || {};
    const p = splineAt(P, s), x = G.gx(pow(10, p[0])), y = G.gyl(p[1]);
    if (o.alpha === 0) return [x, y];
    ctx.save(); if (o.alpha != null) ctx.globalAlpha = o.alpha;
    D.glow(x, y, (r || 7) * 3.2, col, 0.55); D.sphere(x, y, r || 7, col, { outline: '#0f172a', outlineWidth: 2, gloss: true });
    ctx.restore();
    return [x, y];
  }
  const markPt = (G, T, L, txt, col, dx, dy, o) => {
    const x = G.gx(T), y = G.gy(L);
    ctx.save(); ctx.fillStyle = '#fff'; ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(x, y, 4.5, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore();
    if (txt) D.label(clamp(x + (dx || 10), G.x0 + 40, G.x1 - 40), clamp(y + (dy || -14), G.y0 + 12, G.y1 - 10), txt, Object.assign({ bg: col, color: '#fff', size: 11.5, pad: 6, align: (dx || 10) < 0 ? 'right' : 'left' }, o || {}));
  };
  function snIcon(x, y, r, t, a) {
    ctx.save(); ctx.globalAlpha = a == null ? 1 : a;
    D.glow(x, y, r * 3, '#fde68a', 0.6);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2;
    ctx.beginPath(); for (let k = 0; k < 16; k++) { const rad = k % 2 ? r * 0.45 : r, ang = (k / 16) * TAU + t * 0.4; ctx.lineTo(x + Math.cos(ang) * rad, y + Math.sin(ang) * rad); } ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  /* ======================================================
     1단계: 성간 구름 → 원시별
     ====================================================== */
  const BLOBS = Array.from({ length: 18 }, (_, i) => ({ a: rnd(0, TAU), r: rnd(0.12, 0.95), s: rnd(0.28, 0.5), c: i % 3, k: rnd(0.6, 1.3) }));
  const SPACE_STARS = Array.from({ length: 36 }, () => ({ x: Math.random(), y: Math.random(), r: rnd(0.6, 1.6), a: rnd(0.25, 0.8) }));
  S.spin = 0;
  function spaceBG(R) {
    ctx.save(); ctx.beginPath(); rr(R.x, R.y, R.w, R.h, 16).clip();
    const g = ctx.createLinearGradient(0, R.y, 0, R.y + R.h); g.addColorStop(0, '#070d22'); g.addColorStop(1, '#101a3d'); ctx.fillStyle = g; ctx.fillRect(R.x, R.y, R.w, R.h);
    SPACE_STARS.forEach((s) => { ctx.fillStyle = 'rgba(255,255,255,' + s.a + ')'; ctx.beginPath(); ctx.arc(R.x + s.x * R.w, R.y + s.y * R.h, s.r, 0, TAU); ctx.fill(); });
    ctx.restore();
    ctx.strokeStyle = 'rgba(148,163,184,.25)'; ctx.lineWidth = 1.5; rr(R.x, R.y, R.w, R.h, 16).stroke();
  }
  const rsOf = (m) => (m === 1 ? 14 : m === 5 ? 20 : 27);
  const zamsColor = (m) => bbColor(ZAMS[m][0]);
  function drawGauge(x, y0, y1, p, ign) {
    // 중심 온도 로그 눈금 (10 K ~ 10⁸ K)
    const w = 18, lg = log10(tcOf(p)), gy = (v) => y1 - (y1 - y0) * (v - 1) / 7;
    D.shadow(() => { ctx.fillStyle = '#e2e8f0'; rr(x - w / 2, y0, w, y1 - y0, 9).fill(); }, { blur: 4, y: 1 });
    ctx.save(); rr(x - w / 2, y0, w, y1 - y0, 9).clip();
    const g = ctx.createLinearGradient(0, y1, 0, y0); g.addColorStop(0, '#60a5fa'); g.addColorStop(0.5, '#fbbf24'); g.addColorStop(1, '#ef4444');
    ctx.fillStyle = g; ctx.fillRect(x - w / 2, gy(lg), w, y1 - gy(lg)); ctx.restore();
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 1.5; rr(x - w / 2, y0, w, y1 - y0, 9).stroke();
    [1, 2, 3, 4, 5, 6, 8].forEach((e) => { const yy = gy(e); ctx.strokeStyle = 'rgba(71,85,105,.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - w / 2 - 4, yy); ctx.lineTo(x - w / 2, yy); ctx.stroke(); TX(x - w / 2 - 8, yy + 4, '10' + sup(e), 11, '#94a3b8', 'right', 700); });
    const ty = gy(7);
    ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 62, ty); ctx.lineTo(x + w / 2 + 6, ty); ctx.stroke(); ctx.restore();
    D.label(x - w / 2 - 8, ty, ign ? '1000만 K 도달' : '1000만 K (핵융합)', { bg: '#14532d', color: '#bbf7d0', size: 11.5, pad: 7, align: 'right' });
    D.sphere(x, gy(lg), 7, ign ? '#22c55e' : '#fbbf24', { outline: '#fff', outlineWidth: 2, gloss: false });
  }
  function drawV1(t, dt) {
    const G = LAY.v1, Sc = G.sc, m = S.m1, p = S.p1;
    spaceBG(Sc);
    TX(Sc.x + 14, Sc.y + 26, '별이 태어나는 곳', 14.5, '#cbd5e1');
    const cx = PHONE ? Sc.x + 200 : Sc.x + 150, cy = PHONE ? Sc.y + 166 : Sc.y + 262, Rc0 = PHONE ? 104 : 118, rs = rsOf(m);
    const Rc = rs + (Rc0 - rs) * pow(1 - clamp(p, 0, 1), 1.7), flat = 1 - 0.5 * p;
    // 구름 덩어리
    BLOBS.forEach((b) => {
      const a = b.a + S.spin * b.k, x = cx + Math.cos(a) * b.r * Rc, y = cy + Math.sin(a) * b.r * Rc * flat, rad = Math.max(6, b.s * Rc);
      const col = b.c === 0 ? '#a07a9a' : b.c === 1 ? '#7a8fbf' : '#c98f7a';
      D.glow(x, y, rad, mixc(col, '#ffcf99', p * 0.7), 0.2 + 0.16 * (1 - p * 0.5));
    });
    ctx.save(); ctx.setLineDash([4, 6]); ctx.strokeStyle = 'rgba(203,213,225,.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(cx, cy, Rc, Rc * flat, 0, 0, TAU); ctx.stroke(); ctx.restore();
    // 중심(원시별)
    const pe = p * p, coreR = lerp(3, rs, clamp(p * 1.05, 0, 1) * clamp(p * 1.05, 0, 1)), tcol = mixc('#ff6a3d', zamsColor(m), clamp(pe * 1.4, 0, 1));
    D.glow(cx, cy, 14 + rs * 3.2 * pe + 26 * p, tcol, 0.25 + 0.6 * p);
    if (p > 0.04) D.sphere(cx, cy, coreR, tcol, { gloss: coreR > 8, outline: p >= 1 ? '#fff' : null, outlineWidth: 2 });
    if (p >= 1) { D.glow(cx, cy, rs * 4.4, zamsColor(m), 0.65); D.ring(cx, cy, rs + 6, t, { color: '#fde68a', speed: 0.9, width: 2.5 }); }
    // 문구
    const ign = p >= 1;
    D.label(cx, Sc.y + 52, ign ? '핵융합 시작! 주계열성이 되었어요' : p > 0.02 ? '중력으로 수축 중 (수축 에너지로 빛나요)' : '성간 분자운 조각', { bg: ign ? '#15803d' : '#1e293b', color: '#fff', size: 13, pad: 10 });
    drawGauge(Sc.x + Sc.w - 38, Sc.y + 96, Sc.y + Sc.h - 120 + (PHONE ? 70 : 0), p, ign);
    TX(Sc.x + Sc.w - 38, Sc.y + 82, '중심 온도 (K)', 11.5, '#cbd5e1', 'center', 800);
    const ty = Sc.y + Sc.h - (PHONE ? 20 : 78);
    TX(Sc.x + 14, ty - (PHONE ? 22 : 22), '질량 ' + m + ' M☉ · 중심 온도 ' + sci(tcOf(p), 2) + ' K', 13.5, '#f1f5f9', 'left', 800);
    TX(Sc.x + 14, ty + (PHONE ? 0 : 2), '경과 시간 ' + (p >= 1 ? fmtYears(D1[m]) : fmtYears(Math.max(1, D1[m] * pow(p, 1.5)))) + (p >= 1 ? ' (전주계열 기간)' : ''), 13.5, '#fde68a', 'left', 800);
    if (!PHONE) TX(Sc.x + 14, ty + 26, '시간은 줄여서 보여 줘요', 12, '#94a3b8', 'left', 700);
    // H-R도
    const P = G.hr, H = hrFrame(P, Object.assign({ title: 'H-R도에서의 이동' }, EVC));
    drawMSCurve(H);
    [1, 5, 15].forEach((k) => { if (S.ign[k] && k !== m) drawTrack(H, TRK[PRE[k]], TRK[PRE[k]].length - 1, MCOL[k], 3, { alpha: 0.5 }); });
    const PT = TRK[PRE[m]], sn = (PT.length - 1) * p;
    drawTrack(H, PT, sn, MCOL[m], 4, { ghost: true });
    H.frameEnd();
    ZAMS && [1, 5, 15].forEach((k) => markPt(H, ZAMS[k][0], ZAMS[k][1], k === m ? '영년 주계열 ' + k + ' M☉' : k + ' M☉', MCOL[k], k === 1 ? 12 : -10, k === 1 ? 14 : -14, { size: 11 }));
    trackDot(H, PT, sn, MCOL[m], 7.5);
  }

  /* ======================================================
     2단계: 태양 정도의 별 - 주계열 이후 (내부 구조 포함)
     ====================================================== */
  function drawLowStar(cx, cy, s, t, rMax) {
    const st = star2(s), r0 = visR(st.R), r = Math.min(r0, rMax || 999);
    const hA = clamp(interp(LY_H, s), 0, 1), he = interp(LY_HE, s), co = interp(LY_CO, s);
    const nebA = clamp(s - 4, 0, 1);                                    // 행성상 성운
    if (s > 4) {
      const nr = lerp(visR(star2(4).R) * 0.9, Math.min(rMax ? rMax * 1.5 : 160, 168), clamp((s - 4) / 3, 0, 1));
      const gA = 0.42 * nebA * (s > 6.2 ? clamp(1 - (s - 6.2) / 1.2, 0.25, 1) : 1);
      ctx.save();
      const g = ctx.createRadialGradient(cx, cy, nr * 0.55, cx, cy, nr);
      g.addColorStop(0, 'rgba(94,234,212,0)'); g.addColorStop(0.7, 'rgba(94,234,212,' + gA + ')'); g.addColorStop(0.92, 'rgba(167,243,208,' + gA * 1.1 + ')'); g.addColorStop(1, 'rgba(94,234,212,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, nr, 0, TAU); ctx.fill();
      for (let k = 0; k < 10; k++) { const a = k / 10 * TAU + t * 0.05; D.glow(cx + Math.cos(a) * nr * 0.82, cy + Math.sin(a) * nr * 0.82, nr * 0.2, '#99f6e4', 0.18 * nebA); }
      ctx.restore();
    }
    const sc = bbColor(st.T);
    D.glow(cx, cy, r * 1.9 + 8, sc, 0.3 + (s > 4.7 ? 0.25 : 0));
    // 단면: 바깥층 → 헬륨 → 탄소·산소
    if (hA > 0.02) {
      const g = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.3, r * 0.1, cx, cy, r);
      g.addColorStop(0, mixc('#fb923c', sc, 0.35)); g.addColorStop(1, mixc('#c2410c', sc, 0.25));
      ctx.globalAlpha = hA; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = sc; ctx.lineWidth = 3; ctx.globalAlpha = hA * 0.8; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
    }
    if (he > 0.01 && hA > 0.02) { ctx.globalAlpha = hA; ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.arc(cx, cy, Math.max(2, r * he), 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
    if (co > 0.01) {
      const cr = co >= 0.99 ? r : Math.max(2, r * co);
      const g2 = ctx.createRadialGradient(cx - cr * 0.3, cy - cr * 0.3, cr * 0.1, cx, cy, cr);
      g2.addColorStop(0, s >= 5 ? '#e0f2fe' : '#93c5fd'); g2.addColorStop(1, '#3b82f6');
      ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(cx, cy, cr, 0, TAU); ctx.fill();
      if (co >= 0.99) { ctx.strokeStyle = sc; ctx.lineWidth = 2; ctx.stroke(); }
    }
    return st;
  }
  function legend2(x, y, s, w) {
    const items = [];
    if (interp(LY_H, s) > 0.5) items.push(['수소 바깥층', '#fb923c']);
    if (interp(LY_HE, s) > 0.02 && interp(LY_H, s) > 0.5) items.push(['헬륨 층·핵', '#fde047']);
    if (interp(LY_CO, s) > 0.02) items.push([interp(LY_CO, s) > 0.9 ? '탄소·산소 핵' : '탄소·산소 핵', '#60a5fa']);
    if (s > 4.2) items.push(['날아간 바깥층(성운)', '#5eead4']);
    let yy = y;
    items.forEach((it) => { ctx.fillStyle = it[1]; rr(x, yy - 10, 14, 14, 4).fill(); TX(x + 20, yy + 2, it[0], 12.5, '#e2e8f0', 'left', 700); yy += 20; });
  }
  function drawV2(t, dt) {
    const G = LAY.v2, Sc = G.sc, s = S.s2d, ni = nearestSt(s);
    spaceBG(Sc);
    TX(Sc.x + 14, Sc.y + 26, '태양 정도의 별 (1 M☉)', 14.5, '#cbd5e1');
    const cx = Sc.x + Sc.w / 2, cy = Sc.y + (PHONE ? 150 : 190);
    const st = drawLowStar(cx, cy, s, t, PHONE ? 112 : 118);
    D.label(cx, Sc.y + 54, W2[ni].name, { bg: '#0f172a', color: '#fff', size: 15, pad: 12, border: '#475569' });
    // 정보
    const by = Sc.y + (PHONE ? 300 : 338);
    TX(Sc.x + 14, by, 'T = ' + kfmt(Math.round(st.T / 100) * 100) + ' · L = ' + Lfmt(st.L), 13.5, '#f1f5f9', 'left', 800);
    const rShow = S.rgRec || (game && game.free);
    TX(Sc.x + 14, by + 24, rShow ? '반지름 R = ' + r2(st.R) + ' R☉' + (st.R > 20 ? ' (약 ' + sig(st.R / 215, 2) + ' AU)' : '') : '반지름 R = ?  (계산해 봐요)', 13.5, rShow ? '#fde68a' : '#94a3b8', 'left', 800);
    legend2(PHONE ? Sc.x + 340 : Sc.x + 14, PHONE ? by : by + 52, s);
    // H-R도
    const H = hrFrame(G.hr, Object.assign({ title: '태양 정도 별의 H-R도 경로' }, EVC));
    drawMSCurve(H);
    drawTrack(H, TRK.sun2, S.maxS2, C1, 4);
    H.frameEnd();
    for (let k = 0; k < 8; k++) {
      if (k > S.maxS2 + 0.02 || k === 1 || k === 7) continue;
      const p = TRK.sun2[k]; const T = pow(10, p[0]), L = pow(10, p[1]);
      const dx = [10, 0, -12, 12, -12, -12, 12, 0][k], dy = [-14, 0, -16, -14, -14, 16, -14, 0][k];
      markPt(H, T, L, W2[k].name === '주계열(현재)' ? '주계열' : W2[k].name, '#92400e', dx, dy, { size: 11 });
    }
    trackDot(H, TRK.sun2, s, C1, 7.5);
  }

  /* ======================================================
     3단계: 질량에 따른 별의 최후
     ====================================================== */
  const smoothS = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
  const hiParams = (M) => (M < 25 ? { rz: 34, rsg: 104, trk: 'm15' } : { rz: 41, rsg: 112, trk: 'm30' });
  const sHigh = (u) => (u < 0.25 ? u / 0.25 : u < 0.6 ? 1 + 2 * (u - 0.25) / 0.35 : 3);
  S.snFired = false; S.flash = 0;
  function drawOnion(ix, iy, ir, u, t, lx) {
    const nL = 1 + 4 * clamp((u - 0.3) / 0.3, 0, 1), fadeOut = u > 0.7 ? clamp(1 - (u - 0.7) / 0.06, 0, 1) : 1;
    const fr = [1, 0.78, 0.58, 0.4, 0.2], collapse = clamp((u - 0.62) / 0.08, 0, 1);
    fr[4] = lerp(0.2, 0.05, collapse); fr[3] = lerp(0.4, 0.2, collapse * 0.8);
    ctx.save(); ctx.globalAlpha = fadeOut;
    D.glow(ix, iy, ir * 1.4, '#818cf8', 0.18);
    for (let i = 0; i < 5; i++) {
      const a = clamp(nL - i, 0, 1); if (a <= 0.01) continue;
      ctx.globalAlpha = fadeOut * (i === 0 ? 1 : a);
      ctx.fillStyle = LAYERS[i][2]; ctx.beginPath(); ctx.arc(ix, iy, Math.max(2, ir * fr[i]), 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(15,23,42,.45)'; ctx.lineWidth = 1.2; ctx.stroke();
    }
    ctx.globalAlpha = fadeOut;
    if (u >= 0.62 && u < 0.7) { for (let k = 0; k < 8; k++) { const a = k / 8 * TAU + t * 0.5; D.arrow(ix + Math.cos(a) * (ir + 26), iy + Math.sin(a) * (ir + 26), ix + Math.cos(a) * (ir + 4), iy + Math.sin(a) * (ir + 4), { color: '#fca5a5', width: 3, head: 9 }); } }
    ctx.restore();
    // 이름표
    if (fadeOut > 0.05) LAYERS.forEach((l, i) => {
      const a = clamp(nL - i, 0, 1) * fadeOut; if (a <= 0.01) return;
      const yy = iy - 40 + i * 20;
      ctx.globalAlpha = a; ctx.fillStyle = l[2]; rr(lx, yy - 10, 14, 14, 4).fill(); TX(lx + 20, yy + 2, l[1], 12.5, '#e2e8f0', 'left', 700); ctx.globalAlpha = 1;
    });
  }
  function drawRemnant(cx, cy, kind, a, t) {
    ctx.save(); ctx.globalAlpha = a;
    if (kind === 'ns') {
      D.glow(cx, cy, 42, '#93c5fd', 0.55);
      const ang = t * 5; ctx.strokeStyle = 'rgba(191,219,254,.85)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      [0, Math.PI].forEach((o) => { ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ang + o) * 46, cy + Math.sin(ang + o) * 46); ctx.stroke(); });
      D.sphere(cx, cy, 7, '#e0f2fe', { gloss: false, outline: '#bfdbfe', outlineWidth: 2 });
    } else {
      D.glow(cx, cy, 52, '#fb923c', 0.35);
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.35); ctx.strokeStyle = '#fdba74'; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(0, 0, 40, 11, 0, 0, TAU); ctx.stroke(); ctx.strokeStyle = '#fff7ed'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 0, 40, 11, 0, 0, TAU); ctx.stroke(); ctx.restore();
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(cx, cy, 17, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, 20, 0, TAU); ctx.stroke();
    }
    ctx.restore();
  }
  function drawHighStar(cx, cy, u, M, fate, t, Sc) {
    const hp = hiParams(M), P = TRK[hp.trk], sp = sHigh(u), pp = splineAt(P, sp), T = pow(10, pp[0]), sc = bbColor(T);
    let r = u < 0.25 ? lerp(hp.rz, hp.rz * 1.15, u / 0.25) : u < 0.6 ? lerp(hp.rz * 1.15, hp.rsg, smoothS((u - 0.25) / 0.35)) : hp.rsg;
    const post = clamp((u - 0.7) / 0.12, 0, 1), jit = u >= 0.62 && u < 0.7 && !RM ? Math.sin(t * 60) * 2.2 : 0;
    r = r * (1 + post * 0.8) * (1 + (u >= 0.6 && u < 0.7 ? 0.015 * Math.sin(t * 9) : 0));
    // 초신성 충격파
    if (u >= 0.7) {
      const tt = clamp((u - 0.7) / 0.28, 0, 1);
      for (let k = 0; k < 3; k++) { const rad = tt * 250 - k * 34; if (rad <= 4) continue; ctx.save(); ctx.globalAlpha = (1 - tt) * (0.85 - k * 0.2); ctx.strokeStyle = k === 0 ? '#fffbeb' : '#fde68a'; ctx.lineWidth = 5 - k * 1.3; ctx.beginPath(); ctx.arc(cx, cy, rad, 0, TAU); ctx.stroke(); ctx.restore(); }
      const ng = ctx.createRadialGradient(cx, cy, 8, cx, cy, 40 + 150 * tt); ng.addColorStop(0, 'rgba(251,146,60,.0)'); ng.addColorStop(0.6, 'rgba(244,114,182,' + 0.28 * (1 - tt * 0.5) + ')'); ng.addColorStop(1, 'rgba(251,146,60,0)');
      ctx.fillStyle = ng; ctx.beginPath(); ctx.arc(cx, cy, 40 + 150 * tt, 0, TAU); ctx.fill();
    }
    const starA = u >= 0.7 ? 1 - post : 1;
    if (starA > 0.02) {
      ctx.save(); ctx.globalAlpha = starA;
      D.glow(cx + jit, cy, r * 1.8, sc, 0.35);
      const g = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.3, r * 0.1, cx, cy, r);
      g.addColorStop(0, mixc(sc, '#ffffff', 0.35)); g.addColorStop(1, mixc(sc, '#7f1d1d', T < 6000 ? 0.45 : 0.1));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx + jit, cy, r, 0, TAU); ctx.fill();
      ctx.restore();
    }
    if (u >= 0.8) drawRemnant(cx, cy, fate, clamp((u - 0.8) / 0.1, 0, 1), t);
    // 단면 (중심부 확대)
    if (u >= 0.3) {
      const ir = PHONE ? 46 : 70, ix = Sc.x + (PHONE ? 80 : 102), iy = PHONE ? Sc.y + 318 : Sc.y + 392;
      TX(ix, iy - ir - 10, '중심부 단면 (확대)', 12.5, '#cbd5e1', 'center', 800);
      drawOnion(ix, iy, ir, u, t, ix + ir + 22);
    }
    return { T, r };
  }
  function drawV3(t, dt) {
    const G = LAY.v3, Sc = G.sc, M = S.M3, fate = fateOf(M), u = S.u3;
    spaceBG(Sc);
    TX(Sc.x + 14, Sc.y + 26, '처음 질량 ' + sig(M, 3) + ' M☉ 인 별', 14.5, '#cbd5e1');
    const cx = Sc.x + Sc.w / 2, cy = Sc.y + (PHONE ? 142 : 168);
    let stage;
    if (fate === 'wd') {
      const s = u * 6; drawLowStar(cx, cy, s, t, PHONE ? 112 : 118);
      stage = W2[nearestSt(s)].name;
    } else {
      drawHighStar(cx, cy, u, M, fate, t, Sc);
      stage = u < 0.25 ? '주계열' : u < 0.6 ? '초거성으로 팽창' : u < 0.7 ? '중심핵 붕괴' : u < 0.8 ? '초신성 폭발!' : FATE_NAME[fate];
    }
    D.label(cx, Sc.y + 52, u <= 0 && !S.play3 ? '주계열 (시작)' : stage, { bg: '#0f172a', color: '#fff', size: 14.5, pad: 12, border: '#475569' });
    if (S.flash > 0.01) { ctx.fillStyle = 'rgba(255,255,255,' + S.flash * 0.9 + ')'; rr(Sc.x, Sc.y, Sc.w, Sc.h, 16).fill(); }
    // 결과 문구
    if (u >= 0.97) {
      const cm = coreMass(M), txt = fate === 'wd' ? '행성상 성운 + 백색 왜성 (남은 핵 약 ' + sig(cm, 2) + ' M☉)' : fate === 'ns' ? '초신성 → 중성자별 (남은 핵 약 ' + sig(cm, 2) + ' M☉)' : '초신성 → 블랙홀 (남은 핵 약 ' + sig(cm, 2) + ' M☉)';
      D.label(cx, cy + (PHONE ? 118 : 128), txt, { bg: '#15803d', color: '#fff', size: 12.5, pad: 10 });
    }
    // 최후 천체 구간 막대 (처음 질량, 로그 눈금 1 ~ 40 M☉)
    const bx = Sc.x + 18, bw = Sc.w - 36, by = Sc.y + Sc.h - (PHONE ? 34 : 40), gm = (m) => bx + bw * log10(m) / log10(40);
    [[1, 8, '#f59e0b', '백색 왜성'], [8, 25, '#a855f7', '중성자별'], [25, 40, '#334155', '블랙홀']].forEach((sg) => {
      ctx.fillStyle = sg[2]; const a = gm(sg[0]), b = gm(sg[1]); ctx.fillRect(a, by, b - a, 16);
      TX((a + b) / 2, by + 12.5, sg[3], 11.5, '#fff', 'center', 800);
    });
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.strokeRect(bx, by, bw, 16);
    [8, 25].forEach((m) => TX(gm(m), by + 30, String(m), 11.5, '#94a3b8', 'center', 700));
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(gm(M), by - 1); ctx.lineTo(gm(M) - 6, by - 11); ctx.lineTo(gm(M) + 6, by - 11); ctx.closePath(); ctx.fill();
    TX(bx, by - 16, '처음 질량(M☉, 로그 눈금)에 따른 최후', 12, '#94a3b8', 'left', 700);
    // H-R도
    const H = hrFrame(G.hr, Object.assign({ title: '대표 경로: ' + (M < 8 ? '1' : M < 25 ? '15' : '30') + ' M☉ 별' }, EVC));
    drawMSCurve(H);
    const P = TRK[trkOf(M)], sMax = fate === 'wd' ? 6 : 3, sNow = fate === 'wd' ? u * 6 : sHigh(u);
    drawTrack(H, P, sNow, MCOL[M < 8 ? 1 : M < 25 ? 15 : 30], 4, { ghost: true });
    H.frameEnd();
    if (fate === 'wd') { [[0, '주계열'], [2, '적색 거성'], [4, '점근거성가지'], [5, '성운 중심별'], [6, '백색 왜성']].forEach((k) => { if (sNow >= k[0] - 0.01) { const p = P[k[0]]; markPt(H, pow(10, p[0]), pow(10, p[1]), k[1], '#92400e', [10, -12, -12, 12, 12][[0, 2, 4, 5, 6].indexOf(k[0])], [-14, -16, -14, 16, -14][[0, 2, 4, 5, 6].indexOf(k[0])], { size: 11 }); } }); }
    else { const p0 = P[0], p3 = P[3]; markPt(H, pow(10, p0[0]), pow(10, p0[1]), '주계열', '#be123c', 10, 16, { size: 11 }); if (sNow >= 2.9) markPt(H, pow(10, p3[0]), pow(10, p3[1]), '초거성', '#be123c', -12, 18, { size: 11 }); }
    const col = MCOL[M < 8 ? 1 : M < 25 ? 15 : 30];
    if (fate !== 'wd' && u >= 0.7) { const end = splineAt(P, 3), ex = H.gx(pow(10, end[0])), ey = H.gyl(end[1]); snIcon(ex, ey, 11 + 8 * (1 - clamp((u - 0.7) / 0.3, 0, 1)), t, clamp(1 - (u - 0.85) / 0.15, 0.25, 1)); D.label(clamp(ex, H.x0 + 40, H.x1 - 40), ey + 26, '초신성', { bg: '#b45309', color: '#fff', size: 11.5, pad: 6 }); }
    else trackDot(H, P, sNow, col, 7.5);
  }

  /* ======================================================
     4단계: 물질 순환 + 세 질량의 경로
     ====================================================== */
  const RING = [
    { k: 'ism', name: '성간 물질' }, { k: 'proto', name: '원시별' }, { k: 'ms', name: '주계열성' }, { k: 'late', name: '거성·초거성' }, { k: 'end', name: '행성상 성운·초신성' },
  ];
  function ringIcon(k, x, y, r, t) {
    ctx.save();
    if (k === 'ism') { [[-0.35, 0.1, 0.55], [0.3, -0.15, 0.5], [0.05, 0.3, 0.48]].forEach((b) => D.glow(x + b[0] * r, y + b[1] * r, r * b[2] * 1.5, '#c4a0b8', 0.5)); }
    else if (k === 'proto') { D.glow(x, y, r * 1.1, '#fb923c', 0.55); ctx.strokeStyle = 'rgba(253,186,116,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, r * 0.9, r * 0.28, 0.3, 0, TAU); ctx.stroke(); D.sphere(x, y, r * 0.3, '#fb923c', { gloss: false }); }
    else if (k === 'ms') D.sphere(x, y, r * 0.55, '#fde047', { gloss: true });
    else if (k === 'late') { D.sphere(x, y, r * 0.8, '#ef4444', { gloss: true }); D.sphere(x, y, r * 0.2, '#fde68a', { gloss: false }); }
    else { ctx.strokeStyle = 'rgba(94,234,212,.9)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, r * 0.72, 0, TAU); ctx.stroke(); snIcon(x, y, r * 0.38, t, 1); }
    ctx.restore();
  }
  function drawRing(Sc, t) {
    const rx = Sc.x + Sc.w / 2, ry = Sc.y + (PHONE ? 170 : 250), RR = PHONE ? 90 : 108, nr = PHONE ? 27 : 31;
    const shown = S.ringShown || (game && game.free);
    const ang = (i) => -Math.PI / 2 + i * TAU / 5;
    // 화살표 호
    for (let i = 0; i < 5; i++) {
      const a0 = ang(i) + 0.42, a1 = ang(i + 1) - 0.42, last = i === 4;
      ctx.save(); ctx.strokeStyle = shown ? (last ? '#4ade80' : '#7dd3fc') : 'rgba(148,163,184,.35)'; ctx.lineWidth = last ? 4 : 3; ctx.setLineDash(shown ? [] : [4, 6]); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(rx, ry, RR, a0, a1); ctx.stroke(); ctx.restore();
      if (shown) {
        ctx.save(); ctx.fillStyle = last ? '#4ade80' : '#7dd3fc'; const hx = rx + Math.cos(a1) * RR, hy = ry + Math.sin(a1) * RR, ta = a1 + Math.PI / 2;
        ctx.beginPath(); ctx.moveTo(hx + Math.cos(ta) * 10, hy + Math.sin(ta) * 10); ctx.lineTo(hx + Math.cos(ta + 2.5) * 8, hy + Math.sin(ta + 2.5) * 8); ctx.lineTo(hx + Math.cos(ta - 2.5) * 8, hy + Math.sin(ta - 2.5) * 8); ctx.closePath(); ctx.fill(); ctx.restore();
        if (!RM) for (let k = 0; k < 3; k++) { const f = ((t * 0.22 + k / 3) % 1), a = lerp(a0, a1, f); D.sphere(rx + Math.cos(a) * RR, ry + Math.sin(a) * RR, 3.4, last ? '#bbf7d0' : '#e0f2fe', { gloss: false }); }
      }
    }
    // 마디
    for (let i = 0; i < 5; i++) {
      const x = rx + Math.cos(ang(i)) * RR, y = ry + Math.sin(ang(i)) * RR;
      ctx.fillStyle = 'rgba(15,23,42,.92)'; ctx.beginPath(); ctx.arc(x, y, nr, 0, TAU); ctx.fill();
      ctx.strokeStyle = shown ? '#7dd3fc' : '#64748b'; ctx.lineWidth = 2.5; ctx.stroke();
      if (shown) {
        ringIcon(RING[i].k, x, y, nr, t);
        const below = Math.sin(ang(i)) > 0.2, sideX = Math.cos(ang(i)), ty = y + (below ? nr + 17 : -nr - 8);
        const ax = sideX > 0.3 ? 'left' : sideX < -0.3 ? 'right' : 'center', tx = x + (ax === 'left' ? 0 : ax === 'right' ? 0 : 0);
        TX(clamp(tx, Sc.x + 60, Sc.x + Sc.w - 60), ty, RING[i].name, PHONE ? 12.5 : 13, '#e2e8f0', 'center', 800);
      } else TX(x, y + 7, String(i + 1), 20, '#cbd5e1', 'center', 800);
    }
    TX(rx, ry - 6, shown ? '별은 죽으면서' : '순서를 정해요', 13, '#cbd5e1', 'center', 700);
    TX(rx, ry + 14, shown ? '성간 물질로 돌아가요' : '(아래에서 차례로 눌러요)', 13, shown ? '#86efac' : '#94a3b8', 'center', 800);
  }
  function drawV4(t, dt) {
    const G = LAY.v4, Sc = G.sc;
    spaceBG(Sc);
    TX(Sc.x + 14, Sc.y + 26, '별과 성간 물질의 순환', 14.5, '#cbd5e1');
    drawRing(Sc, t);
    drawWrap(Sc.x + Sc.w / 2, Sc.y + Sc.h - (PHONE ? 44 : 72), '행성상 성운과 초신성 폭발은 별 속에서 만든 헬륨·탄소·산소·철 등을 성간 물질로 돌려줘요. 태양은 이전 세대 별이 남긴 물질로 만들어졌어요.', Sc.w - 36, PHONE ? 12.5 : 13, { color: '#cbd5e1' });
    // H-R도
    const tNow = pow(10, S.tau);
    const H = hrFrame(G.hr, Object.assign({ title: '세 별의 H-R도 경로 (같은 시각)' }, EVC));
    drawMSCurve(H);
    [1, 5, 15].forEach((k) => { const o = T4[k], P = TRK[o.trk]; drawTrack(H, P, s4Of(k, tNow), o.col, 4, { ghost: true }); });
    H.frameEnd();
    [1, 5, 15].forEach((k) => {
      const o = T4[k], P = TRK[o.trk], sK = s4Of(k, tNow), dead = k === 15 && tNow >= doneAt(15);
      const z = P[0]; markPt(H, pow(10, z[0]), pow(10, z[1]), null, o.col);
      if (dead) { const e = splineAt(P, P.length - 1), ex = H.gx(pow(10, e[0])), ey = H.gyl(e[1]); snIcon(ex, ey, 11, t, 1); D.label(clamp(ex, H.x0 + 44, H.x1 - 44), ey + 24, '15 M☉: 초신성', { bg: o.col, color: '#fff', size: 11.5, pad: 6 }); }
      else { const [x, y] = trackDot(H, P, sK, o.col, 7); D.label(clamp(x + (k === 1 ? 14 : k === 5 ? 14 : 14), H.x0 + 24, H.x1 - 30), y + (k === 15 ? -15 : 15), k + ' M☉', { bg: o.col, color: '#fff', size: 11.5, pad: 6, align: 'left' }); }
    });
    // 수명 막대
    const B = G.bars; panel(B.x, B.y, B.w, B.h, { title: '주계열에 머무는 시간 (로그 눈금)', tsize: 13.5 });
    const bx = B.x + (PHONE ? 78 : 84), bw = B.w - (PHONE ? 78 : 84) - 20, gl = (lg) => bx + bw * (lg - 6) / 4.4;
    [1, 5, 15].forEach((k, i) => {
      const o = T4[k], y = B.y + 36 + i * (PHONE ? 22 : 24);
      TXD(B.x + 12, y + 12, o.name, 13, '#334155', 'left', 800);
      ctx.fillStyle = '#e8eef6'; ctx.fillRect(bx, y, bw, 16);
      const w = Math.max(0, gl(clamp(log10(o.life), 6, 10.4)) - bx); ctx.fillStyle = o.col; ctx.fillRect(bx, y, w, 16);
      TXD(bx + w + 4, y + 12.5, fmtYears(o.life), 11.5, '#0f172a', w > bw * 0.7 ? 'right' : 'left', 800);
    });
    const cxl = clamp(gl(S.tau), bx, bx + bw);
    ctx.save(); ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(cxl, B.y + 30); ctx.lineTo(cxl, B.y + 36 + 3 * (PHONE ? 22 : 24) - 4); ctx.stroke(); ctx.restore();
    [6, 7, 8, 9, 10].forEach((e) => TXD(gl(e), B.y + B.h - 8, ['100만', '1000만', '1억', '10억', '100억'][e - 6], 11, '#64748b', 'center', 700));
  }

  /* ======================================================
     컨트롤 연결
     ====================================================== */
  const modeSeg = $('#modeSeg'), sP1 = $('#sP1'), oP1 = $('#oP1'), sS2 = $('#sS2'), oS2 = $('#oS2'), sM3 = $('#sM3'), oM3 = $('#oM3'), sT4 = $('#sT4'), oT4 = $('#oT4'), inRg = $('#inRg');
  const ORD = {
    mass: { view: 'v1', head: '🕒 원시별 단계가 오래 걸린 질량부터 눌러요', show: ['15', '1', '5'], items: { 1: '1 M☉', 5: '5 M☉', 15: '15 M☉' }, answer: ['1', '5', '15'] },
    stage: { view: 'v2', head: '🕒 일어나는 순서대로 눌러요', show: ['agb', 'ms', 'wd', 'hb', 'pn', 'rg'], items: ST_NAMES, answer: ST_ORDER },
    layer: { view: 'v3', head: '🧅 바깥에서 안쪽 순서로 눌러요', show: ['co', 'fe', 'h', 'hv', 'he'], items: { h: '수소 층', he: '헬륨 층', co: '탄소·산소 층', hv: '더 무거운 원소 층', fe: '철 핵' }, answer: ['h', 'he', 'co', 'hv', 'fe'] },
    ring: { view: 'v4', head: '♻️ 순환 고리의 순서대로 눌러요', show: ['late', 'ism', 'end', 'ms', 'proto'], items: { ism: '성간 물질', proto: '원시별', ms: '주계열성', late: '거성·초거성', end: '행성상 성운·초신성' }, answer: ['ism', 'proto', 'ms', 'late', 'end'] },
  };
  function setOrd(kind) {
    S.ordKind = kind; S.ord = []; S.ordOn = !!kind;
    if (kind) { const o = ORD[kind]; $('#ordHead').textContent = o.head; $('#ordBtns').innerHTML = o.show.map((k) => '<button class="opt" type="button" data-k="' + k + '">' + o.items[k] + '</button>').join(''); $$('#ordBtns .opt').forEach((b) => b.addEventListener('click', () => ordPick(b.dataset.k))); }
    updateCtl();
  }
  function ordPick(k) {
    if (!S.ordKind || S.ord.indexOf(k) >= 0) return; Sound.click(); S.ord.push(k);
    if (S.ordKind === 'ring' && S.ord.length === 5 && ordOk()) { S.ringShown = true; Sound.success(); say('순환 고리가 완성됐어요!', false, 2.4); }
    updateCtl();
  }
  const ordOk = () => !!S.ordKind && S.ord.length === ORD[S.ordKind].answer.length && S.ord.every((k, i) => k === ORD[S.ordKind].answer[i]);
  $('#bOrdReset').addEventListener('click', () => { Sound.click(); S.ord = []; if (S.ordKind === 'ring') S.ringShown = false; updateCtl(); });
  $('#stageSeg').innerHTML = ST_ORDER.map((k) => '<button class="opt" type="button" data-k="' + k + '">' + ST_NAMES[k] + '</button>').join('');
  const PAIR_OPTS = [['', '고르세요'], ['a', '행성상 성운 + 백색 왜성 · 주계열 수명 약 100억 년'], ['b', '행성상 성운 + 백색 왜성 · 주계열 수명 약 1억 년'], ['c', '초신성 → 중성자별 · 주계열 수명 약 750만 년']];
  const PAIR_ANS = { 1: 'a', 5: 'b', 15: 'c' };
  $('#pairRows').innerHTML = [1, 5, 15].map((m) => '<div style="display:grid;grid-template-columns:54px 1fr;gap:6px;align-items:center;font-weight:800"><span style="color:' + MCOL[m] + '">' + m + ' M☉</span><select class="mini-sel" data-m="' + m + '" aria-label="' + m + ' M☉ 별의 최후와 수명" style="font-size:13px;min-height:50px">' + PAIR_OPTS.map((o) => '<option value="' + o[0] + '">' + o[1] + '</option>').join('') + '</select></div>').join('');
  $$('#pairRows select').forEach((s) => s.addEventListener('change', () => { S.pairSel[s.dataset.m] = s.value || undefined; Sound.click(); updateCtl(); }));
  const pairOk = () => [1, 5, 15].every((m) => S.pairSel[m] === PAIR_ANS[m]);

  function setView(v) { if (S.view !== v) { S.view = v; S.fade = 1; parts.clear(); } updateCtl(); }
  function updateCtl() {
    $('#tbLabel').textContent = VIEW_LABEL[S.view];
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !c.dataset.modes.split(' ').includes(S.view); });
    const free = !!(game && game.free);
    $('#rgBox').hidden = !(S.view === 'v2' && (S.rgOn || free));
    $('#pairBox').hidden = !(S.view === 'v4' && (S.pairOn || free));
    $('#ordBox').hidden = !(S.ordOn && S.ordKind && ORD[S.ordKind].view === S.view);
    if (S.ordKind) { $$('#ordBtns .opt').forEach((b) => { b.classList.toggle('picked', S.ord.indexOf(b.dataset.k) >= 0); b.disabled = S.ord.indexOf(b.dataset.k) >= 0; }); $('#ordList').innerHTML = S.ord.map((k, i) => '<span class="tag">' + (i + 1) + '. ' + ORD[S.ordKind].items[k] + '</span>').join('') || '<span style="color:var(--muted);font-weight:600">아직 고르지 않았어요</span>'; }
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.view === S.view));
    if (modeSeg) modeSeg.hidden = !free;
    $$('#massSeg1 .opt').forEach((b) => { b.classList.toggle('on', +b.dataset.m === S.m1); b.classList.toggle('good', !!S.ign[+b.dataset.m]); });
    $$('#stageSeg .opt').forEach((b) => b.classList.toggle('on', W2[nearestSt(S.s2)].k === b.dataset.k));
    $$('#massSeg3 .opt').forEach((b) => { b.classList.toggle('on', Math.abs(+b.dataset.m - S.M3) < 1e-6); b.classList.toggle('good', !!S.fateOk[+b.dataset.m]); });
    $$('#predSeg .opt').forEach((b) => b.classList.toggle('on', b.dataset.f === S.pred));
    $('#bPlay3').disabled = !S.pred || S.play3;
    $('#bPlay3').textContent = S.play3 ? '진행 중…' : '▶ 결과 보기';
    $('#bPlay4').textContent = S.play4 ? '⏸ 멈추기' : '▶ 시간 흐르게 하기';
    $$('#pairRows select').forEach((s) => { s.value = S.pairSel[s.dataset.m] || ''; });
    oP1.textContent = Math.round(S.p1 * 100) + ' %'; oS2.textContent = W2[nearestSt(S.s2)].name; oM3.textContent = sig(S.M3, 3) + ' M☉'; oT4.textContent = fmtYears(pow(10, S.tau));
  }
  /* 1단계 */
  const cloudPos = () => { const Sc = LAY.v1.sc; return { cx: PHONE ? Sc.x + 200 : Sc.x + 150, cy: PHONE ? Sc.y + 166 : Sc.y + 262, R0: PHONE ? 104 : 118 }; };
  function setP1(p) { S.p1 = clamp(p, 0, 1); sP1.value = Math.round(S.p1 * 100); sP1.style.setProperty('--pct', Math.round(S.p1 * 100) + '%'); updateCtl(); }
  function setM1(m) { S.m1 = m; S.play1 = false; setP1(0); updateCtl(); }
  $$('#massSeg1 .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); setM1(+b.dataset.m); }));
  $('#bStart1').addEventListener('click', () => { Sound.click(); if (S.p1 >= 1) setP1(0); S.play1 = true; updateCtl(); });
  $('#bReset1').addEventListener('click', () => { Sound.click(); S.play1 = false; setP1(0); });
  sP1.addEventListener('input', () => { S.play1 = false; S.p1 = +sP1.value / 100; sP1.style.setProperty('--pct', sP1.value + '%'); updateCtl(); });
  sP1.style.setProperty('--pct', '0%');
  /* 2단계 */
  function setS2(s) { S.s2 = clamp(s, 0, 7); sS2.value = Math.round(S.s2 * 100); sS2.style.setProperty('--pct', (S.s2 / 7 * 100) + '%'); updateCtl(); }
  sS2.addEventListener('input', () => { S.s2 = +sS2.value / 100; sS2.style.setProperty('--pct', (S.s2 / 7 * 100) + '%'); updateCtl(); });
  $$('#stageSeg .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); setS2(ST_AT[b.dataset.k]); }));
  function recordRg() {
    const st = star2(2);
    if (nearestSt(S.s2) !== 2 || Math.abs(S.s2 - 2) > 0.2) { Sound.fail(); say('먼저 단계를 적색 거성에 맞춰요.', true, 2.4); return; }
    const v = parseNum(inRg.value);
    if (!isFinite(v) || v <= 0) { Sound.fail(); say('반지름을 숫자로 써요. 예: 66', true, 2.2); return; }
    if (Math.abs(v - st.R) / st.R > 0.08) { Sound.fail(); say('다시 계산해 봐요. √L ≈ ' + sig(sqrt(st.L), 3) + ', (T/5800)² ≈ ' + sig(pow(st.T / TSUN, 2), 3) + ' 이에요.', true, 3.6); return; }
    S.rgRec = true; Sound.success(); say('적색 거성의 반지름은 약 ' + r2(st.R) + ' R☉예요! (약 ' + sig(st.R / 215, 2) + ' AU)', false, 3.4); updateCtl();
  }
  $('#bRg').addEventListener('click', recordRg);
  inRg.addEventListener('keydown', (e) => { if (e.key === 'Enter') recordRg(); });
  /* 3단계 */
  const slM3 = (M) => Math.round(1000 * Math.log(M) / Math.log(40));
  function resetRun3() { S.play3 = false; S.u3 = 0; S.snFired = false; S.flash = 0; parts.clear(); }
  function setM3(M, fromSlider) {
    S.M3 = M; resetRun3();
    if (!fromSlider) sM3.value = slM3(M);
    sM3.style.setProperty('--pct', (slM3(M) / 10) + '%'); updateCtl();
  }
  sM3.addEventListener('input', () => { let M = pow(40, +sM3.value / 1000); const pre = [1, 15, 30].find((m) => Math.abs(m - M) / m < 0.03); if (pre) M = pre; setM3(M, true); });
  $$('#massSeg3 .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); setM3(+b.dataset.m); }));
  $$('#predSeg .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.pred = b.dataset.f; updateCtl(); }));
  function playRun3() {
    if (!S.pred || S.play3) return;
    S.runM = S.M3; S.runPred = S.pred; S.u3 = 0; S.snFired = false; S.flash = 0; parts.clear(); S.play3 = true; Sound.click(); updateCtl();
  }
  $('#bPlay3').addEventListener('click', playRun3);
  function finishRun3() {
    const M = S.runM, fate = fateOf(M), ok = S.runPred === fate; S.play3 = false;
    if (ok) { if ([1, 15, 30].indexOf(M) >= 0) S.fateOk[M] = true; Sound.success(); say('예측이 맞았어요! ' + sig(M, 3) + ' M☉ 별은 ' + (fate === 'wd' ? '행성상 성운과 백색 왜성' : fate === 'ns' ? '초신성 폭발 후 중성자별' : '초신성 폭발 후 블랙홀') + '이 돼요.', false, 4); }
    else { Sound.fail(); say('예측과 달랐어요. 결과는 ' + FATE_NAME[fate] + '이에요. 다시 예측해 봐요.', true, 4); S.pred = null; }
    updateCtl();
  }
  /* 4단계 */
  const tauOf = (v) => v / 10;
  sT4.addEventListener('input', () => { S.play4 = false; S.tau = tauOf(+sT4.value); sT4.style.setProperty('--pct', ((+sT4.value - 60) / 43 * 100) + '%'); updateCtl(); });
  function setTau(tt) { S.tau = clamp(tt, 6, 10.3); sT4.value = Math.round(S.tau * 10); sT4.style.setProperty('--pct', ((S.tau - 6) / 4.3 * 100) + '%'); updateCtl(); }
  $('#bPlay4').addEventListener('click', () => { Sound.click(); if (S.tau >= 10.29) setTau(6); S.play4 = !S.play4; updateCtl(); });
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setView(b.dataset.view); }));

  /* ---------- 읽기 칸 ---------- */
  function readouts() {
    const v = S.view;
    if (v === 'v1') setReadouts(['중심 온도', sci(tcOf(S.p1), 2) + ' K', '질량', S.m1 + ' M☉', '상태', S.p1 >= 1 ? '핵융합 시작 (주계열)' : S.p1 > 0 ? '중력 수축 중' : '성간 분자운']);
    else if (v === 'v2') { const st = star2(S.s2d); setReadouts(['단계', W2[nearestSt(S.s2)].name, 'T · L', kfmt(Math.round(star2(S.s2).T / 100) * 100) + ' · ' + Lfmt(star2(S.s2).L), '반지름', S.rgRec || (game && game.free) ? r2(star2(S.s2).R) + ' R☉' : '?']); }
    else if (v === 'v3') { const M = S.M3, fate = fateOf(M); setReadouts(['처음 질량', sig(M, 3) + ' M☉', '최후 (대략)', S.u3 >= 0.97 ? FATE_NAME[fate] : '?', '남은 중심핵(대략)', S.u3 >= 0.97 ? sig(coreMass(M), 2) + ' M☉' : '?']); }
    else { const t = pow(10, S.tau), ph = (k) => (t < T4[k].life ? '주계열' : t < doneAt(k) ? '주계열 이후' : k === 15 ? '초신성 폭발' : '백색 왜성'); setReadouts(['경과 시간', fmtYears(t), '1 M☉ · 5 M☉', ph(1) + ' · ' + ph(5), '15 M☉', ph(15)]); }
  }

  /* ======================================================
     단계 · 미션
     ====================================================== */
  function enterLevel(li) {
    clearTimeout(hintTimer); parts.clear(); flash.t = 0; S.play1 = false; S.play3 = false; S.play4 = false; S.flash = 0; S.ordOn = false;
    if (li === 0) { S.p1 = 0; setM1(1); setView('v1'); showHint('질량을 고르고 ▶ 수축 시작을 눌러요', 5000); }
    else if (li === 1) { S.rgOn = false; S.s2d = 0; S.maxS2 = 0; setS2(0); setView('v2'); showHint('시간 슬라이더를 움직여 별의 일생을 따라가요', 5000); }
    else if (li === 2) { S.pred = null; setM3(15); setView('v3'); showHint('처음 질량과 최후를 예측한 뒤 결과를 확인해요', 5000); }
    else { S.pairOn = false; setTau(6.3); setView('v4'); showHint('경과 시간을 늘리며 세 별을 비교해요', 5000); }
    updateCtl();
  }
  const tbl = (rows) => '<table class="mini">' + rows.map((r, i) => '<tr>' + r.map((c) => (i === 0 ? '<th>' : '<td>') + c + (i === 0 ? '</th>' : '</td>')).join('') + '</tr>').join('') + '</table>';

  const levels = [
    {
      title: '원시별: 구름에서 별로', short: '원시별', icon: '🌌', phase: '탐구', features: ['cloud'],
      intro: '<p class="si-q">❓ 탐구 질문: 별은 어디서 태어나고 어떻게 늙어 가며, 죽은 뒤에는 어디로 돌아갈까?</p>' +
        '<div class="si-link">🔗 <b>통합과학·앞 차시에서</b> 별 속에서 수소 핵융합으로 에너지가 만들어지는 것과, H-R도에서 별 대부분이 주계열에 모여 있고 질량이 클수록 주계열 위에서 왼쪽 위에 있다는 것을 배웠어요.</div>' +
        '<p>이번 차시에서는 별이 태어나서 죽을 때까지 <b>H-R도 위를 어떻게 움직이는지</b> 따라가요. 먼저 별이 태어나는 <b>성간 분자운</b>의 한 조각이 <b>중력으로 수축</b>해 <b>원시별(전주계열)</b>이 되고, 중심 온도가 약 <b>1000만 K</b>에 이르러 수소 핵융합이 시작되면 <b>주계열성</b>이 되는 과정을 관찰해요.</p>',
      setup() { enterLevel(0); },
      recap: '원시별은 중력 수축으로 빛나다가 중심 온도가 약 1000만 K가 되면 핵융합을 시작해 주계열성이 돼요. 질량이 클수록 전주계열 기간이 짧아요.',
      summary: '<ul><li><b>전주계열</b>: 성간 분자운 조각이 중력으로 수축 → <b>원시별</b>(수축 에너지로 빛나요).</li><li>중심 온도가 약 <b>1000만 K</b>에 이르면 수소 핵융합이 시작 → <b>영년 주계열(ZAMS)</b>에 도달해 주계열성이 돼요.</li>' +
        tbl([['질량', '전주계열 기간(대략)', '주계열 도달 위치(T, L)'], ['1 M☉', '약 3,000만 년', '약 5700 K, 0.7 L☉'], ['5 M☉', '약 120만 년', '약 16000 K, 500 L☉'], ['15 M☉', '약 6만 년', '약 30000 K, 2×10⁴ L☉']]) + '<li>질량이 클수록 더 왼쪽 위(고온·고광도)에서 주계열에 도달하고, 전주계열 기간은 짧아요.</li></ul>',
      missions: [
        {
          title: '세 질량의 별을 주계열에 도달시키기',
          goal: '구름 조각의 질량을 <b>1, 5, 15 M☉</b>로 바꿔 가며 수축시키고, 중심 온도가 <b>1000만 K</b>에 이르러 핵융합이 시작되는 것을 <b>세 번</b> 확인해요.',
          hint: '질량을 고르고 ▶ 수축 시작을 눌러요. 슬라이더를 오른쪽 끝까지 움직여도 돼요.',
          hold: 0.3, setup() { setView('v1'); },
          status: () => [1, 5, 15].map((m) => m + ' M☉ ' + mark(!!S.ign[m])).join(' · '),
          check: () => S.ign[1] && S.ign[5] && S.ign[15],
          explain: '원시별은 중력 수축으로 중심 온도가 올라요. <b>중심 온도가 약 1000만 K</b>가 되면 수소 핵융합이 시작되고 <b>주계열성</b>이 돼요. 질량이 클수록 H-R도에서 더 왼쪽 위(고온·고광도)에서 주계열에 도달해요.',
        },
        {
          title: '전주계열 기간 비교하기',
          goal: '원시별 단계가 <b>오래 걸린 질량부터</b> 차례로 눌러요. 그리고 <b>✔ 확인하기</b>를 눌러요.', manual: true,
          setup() { setView('v1'); setOrd('mass'); },
          hint: '별이 주계열에 도달했을 때 화면에 보인 경과 시간을 비교해 봐요.',
          check: () => (S.ord.length < 3 ? '세 질량을 모두 눌러요.' : ordOk() ? true : '순서가 달라요. 질량이 클수록 중력이 강해 더 빨리 수축해서 기간이 짧아요.'),
          explain: '<b>1 M☉(약 3,000만 년) &gt; 5 M☉(약 120만 년) &gt; 15 M☉(약 6만 년)</b> 순이에요. 질량이 클수록 전주계열 기간이 짧아요.',
        },
        {
          type: 'quiz', title: '원시별의 에너지', goal: '핵융합이 시작되기 전의 <b>원시별</b>이 빛나는 에너지는 어디에서 나올까요?', setup() { setView('v1'); },
          choices: ['중력 수축으로 줄어드는 구름의 위치 에너지(수축 에너지)', '중심부의 수소 핵융합 에너지', '주변 별에서 받은 빛 에너지', '중심부의 헬륨 핵융합 에너지'],
          answer: 0,
          feedback: ['', '수소 핵융합은 중심 온도가 약 1000만 K에 이른 뒤에 시작돼요. 원시별은 아직 핵융합 전이에요.', '원시별은 스스로 빛을 내요. 에너지원은 별 안에 있어요.', '헬륨 핵융합은 별이 주계열을 떠난 뒤에 일어나요.'],
          explain: '원시별은 수축하면서 중력 에너지를 열로 바꿔 빛나요. 중심 온도가 약 1000만 K에 이르러 <b>수소 핵융합</b>이 시작되면 오랫동안 안정하게 빛나는 <b>주계열성</b>이 돼요.',
        },
      ],
    },
    {
      title: '주계열 이후: 태양 정도 별의 일생', short: '주계열 이후', icon: '🔴', phase: '분석', features: ['post'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 별이 원시별을 거쳐 주계열에 도달하는 것을 봤어요. 주계열은 별 일생에서 가장 긴 시기(약 90 %)예요.</div>' +
        '<p>태양 정도의 별은 중심핵의 수소가 바닥나면 <b>핵이 수축하고 바깥층이 크게 팽창</b>해 <b>적색 거성</b>이 돼요. 이후 수평 가지 → 점근거성가지를 거쳐 바깥층을 날려 <b>행성상 성운</b>을 만들고, 중심핵은 <b>백색 왜성</b>이 돼요.</p>' +
        '<p>시간 슬라이더를 움직여 H-R도 경로와 <b>내부 구조</b>를 따라가요. (주계열 이후의 구체적인 핵반응 단계는 다루지 않고, 층의 이름만 봐요.)</p>',
      setup() { enterLevel(1); },
      recap: '태양 정도의 별은 주계열 → 적색 거성 → 수평 가지 → 점근거성가지 → 행성상 성운 → 백색 왜성으로 진화해요. 적색 거성은 온도가 낮아도 반지름이 커서 밝아요.',
      summary: '<ul><li>태양 정도의 별: <b>주계열 → 적색 거성 → 수평 가지 → 점근거성가지 → 행성상 성운(중심별) → 백색 왜성</b></li><li>적색 거성: 핵은 수축하고 바깥층은 팽창 → 표면 온도는 낮아지고 반지름은 약 100배 가까이 커져 광도가 커져요. (약 4000 K, 1000 L☉, 약 66 R☉)</li><li>바깥층은 우주 공간으로 날아가 행성상 성운이 되고, 중심핵은 지구만 한 크기의 백색 왜성이 돼요(밀도 약 10⁹ kg/m³).</li><li>H-R도에서는 주계열 → 오른쪽 위(거성) → 왼쪽으로 이동 → 왼쪽 아래(백색 왜성)로 움직여요.</li></ul>',
      missions: [
        {
          title: '6단계 순서 정렬하기',
          goal: '시간 슬라이더를 끝까지 움직여 본 뒤, 태양 정도의 별이 겪는 <b>6단계를 일어나는 순서대로</b> 눌러요. 그리고 <b>✔ 확인하기</b>를 눌러요.', manual: true,
          setup() { S.rgOn = false; setView('v2'); setOrd('stage'); },
          hint: '시간 슬라이더를 처음부터 끝까지 천천히 움직이면 H-R도 위에 지나간 단계의 이름표가 생겨요.',
          check: () => (S.maxS2 < 6.8 ? '먼저 시간 슬라이더를 끝까지 움직여 모든 단계를 살펴봐요.' : S.ord.length < 6 ? '6단계를 모두 눌러요.' : ordOk() ? true : '순서가 달라요. 이름표가 생긴 순서를 다시 확인해 봐요.'),
          explain: '순서는 <b>주계열 → 적색 거성 → 수평 가지 → 점근거성가지 → 행성상 성운 → 백색 왜성</b>이에요. 별은 주계열에서 오른쪽 위로 올라가 거성이 되고, 마지막에는 왼쪽 아래의 백색 왜성이 돼요.',
        },
        {
          title: '적색 거성의 반지름 계산하기',
          goal: '단계를 <b>적색 거성</b>에 맞춰 L과 T를 읽고, <b>R/R☉ = √(L/L☉) ÷ (T/T☉)²</b>로 반지름을 계산해 기록해요.',
          hint: '적색 거성은 T = 4000 K, L = 1000 L☉예요. √1000 ≈ 31.6, (4000/5800)² ≈ 0.476 이에요.',
          hold: 0.3, setup() { S.rgOn = true; S.ordOn = false; setView('v2'); updateCtl(); },
          status: () => '반지름 기록 ' + mark(S.rgRec),
          check: () => S.rgRec,
          explain: 'R/R☉ = √1000 ÷ (4000/5800)² ≈ 31.6 ÷ 0.476 ≈ <b>66 R☉</b>예요. 이것은 약 0.3 AU로, 태양의 66배이고 수성 궤도(0.39 AU) 가까이 닿는 크기예요.',
        },
        {
          type: 'quiz', title: '적색 거성이 밝은 까닭', goal: '적색 거성은 표면 온도가 <b>낮은데도</b> 태양보다 훨씬 밝아요. 그 까닭은 무엇일까요?', setup() { S.rgOn = true; setView('v2'); },
          choices: ['반지름이 매우 커서 겉넓이가 넓기 때문이에요 (L = 4πR²σT⁴)', '표면 온도가 태양보다 훨씬 높기 때문이에요', '질량이 태양의 수백 배로 늘어났기 때문이에요', '핵융합이 완전히 멈추어 에너지가 한꺼번에 나오기 때문이에요'],
          answer: 0,
          feedback: ['', '적색 거성은 표면 온도가 낮아져요(약 4000 K). 밝은 까닭은 다른 데 있어요.', '별은 바깥층을 잃기도 하지만 질량이 늘어나지는 않아요. 커지는 것은 반지름이에요.', '핵 바깥의 껍질에서는 계속 에너지가 나와요. 광도가 큰 까닭은 겉넓이예요.'],
          explain: '단위 면적당 내는 에너지(σT⁴)는 작아지지만 반지름이 약 66배(겉넓이 약 4400배)로 커져서 광도 L이 약 1000배가 돼요.',
        },
      ],
    },
    {
      title: '큰 별의 최후: 초신성과 남은 천체', short: '큰 별의 최후', icon: '💥', phase: '분석', features: ['sn'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 태양 정도의 별은 행성상 성운과 백색 왜성으로 끝나는 것을 봤어요.</div>' +
        '<p>질량이 약 <b>8 M☉ 이상</b>인 큰 별은 초거성 단계를 지나며 중심핵에 <b>철</b>이 쌓여요. 철핵은 핵융합으로 에너지를 더 얻을 수 없어 중력으로 <b>붕괴</b>하고, 별이 <b>초신성</b>으로 폭발해요. 남은 중심핵의 질량이 약 1.4~3 M☉이면 <b>중성자별</b>, 그보다 크면 <b>블랙홀</b>이 돼요(처음 질량 대략 25 M☉ 이상).</p>' +
        '<p>처음 질량을 정하고 별의 최후를 <b>예측</b>한 뒤, ▶ 결과 보기로 확인해요.</p>',
      setup() { enterLevel(2); },
      recap: '처음 질량이 약 8 M☉ 미만이면 백색 왜성, 그 이상이면 초신성 폭발 후 중성자별(약 8~25 M☉) 또는 블랙홀(약 25 M☉ 이상)이 돼요.',
      summary: '<ul><li>큰 별(약 8 M☉ 이상)은 H-R도에서 <b>주계열 → 오른쪽의 초거성</b>으로 거의 수평 이동한 뒤, 중심핵이 붕괴해 <b>초신성</b>으로 폭발해요.</li><li>초신성 직전 내부는 양파 껍질처럼 <b>바깥에서 안쪽으로 수소 → 헬륨 → 탄소·산소 → 더 무거운 원소 → 철 핵</b> 층이 있어요.</li><li>철은 핵융합을 해도 에너지를 얻지 못해 철 핵이 쌓이면 중력 붕괴가 일어나요.</li>' +
        tbl([['처음 질량(대략)', '최후'], ['약 8 M☉ 미만', '행성상 성운 + 백색 왜성'], ['약 8 ~ 25 M☉', '초신성 → 중성자별 (남은 핵 1.4 ~ 3 M☉, 지름 약 20 km)'], ['약 25 M☉ 이상', '초신성 → 블랙홀']]) + '</ul>',
      missions: [
        {
          title: '별의 최후 예측하고 확인하기',
          goal: '처음 질량이 <b>1, 15, 30 M☉</b>인 별의 최후를 각각 <b>예측</b>하고, <b>▶ 결과 보기</b>로 확인해요. (예측이 맞아야 해요)',
          hint: '약 8 M☉ 미만은 백색 왜성, 약 8~25 M☉는 중성자별, 약 25 M☉ 이상은 블랙홀이 돼요.',
          hold: 0.3, setup() { S.ordOn = false; setView('v3'); },
          status: () => [1, 15, 30].map((m) => m + ' M☉ ' + mark(!!S.fateOk[m])).join(' · '),
          check: () => S.fateOk[1] && S.fateOk[15] && S.fateOk[30],
          explain: '<b>1 M☉</b>은 행성상 성운과 <b>백색 왜성</b>, <b>15 M☉</b>은 초신성 폭발 후 남은 핵이 약 1.6 M☉인 <b>중성자별</b>, <b>30 M☉</b>은 남은 핵이 3 M☉를 넘어 <b>블랙홀</b>이 돼요. (질량 경계는 대략적인 값이에요.)',
        },
        {
          title: '초신성 직전 내부 층 순서',
          goal: '초신성 직전 큰 별의 내부 층을 <b>바깥에서 안쪽 순서로</b> 눌러요. 그리고 <b>✔ 확인하기</b>를 눌러요.', manual: true,
          setup() { setView('v3'); if (S.M3 < 8) setM3(15); setOrd('layer'); },
          hint: '15 M☉ 별의 결과를 끝까지 보면 중심부 단면에 층 이름이 나타나요. 가장 안쪽이 철 핵이에요.',
          check: () => (S.ord.length < 5 ? '다섯 층을 모두 눌러요.' : ordOk() ? true : '순서가 달라요. 가장 바깥은 수소 층이고 가장 안쪽은 철 핵이에요.'),
          explain: '바깥에서 안쪽으로 <b>수소 → 헬륨 → 탄소·산소 → 더 무거운 원소 → 철 핵</b> 층이에요. 안쪽일수록 무거운 원소가 모여 있어요.',
        },
        {
          type: 'quiz', title: '초신성 폭발의 까닭', goal: '큰 별의 중심핵이 붕괴해 초신성이 되는 까닭은 무엇일까요?', setup() { S.ordOn = false; setView('v3'); },
          choices: ['철은 핵융합을 해도 에너지를 얻을 수 없어서, 철 핵이 쌓이면 중력을 견디지 못하고 붕괴하기 때문이에요', '철이 너무 가벼워서 별 밖으로 날아가기 때문이에요', '별의 수소가 다 떨어지면 모든 별이 곧바로 초신성이 되기 때문이에요', '질량이 작은 별도 철 핵까지 핵융합을 해서 폭발하기 때문이에요'],
          answer: 0,
          feedback: ['', '철은 오히려 무거운 원소예요. 철 핵은 중심에 쌓여요.', '태양 정도의 별은 초신성이 되지 않고 행성상 성운과 백색 왜성이 돼요. 초신성은 약 8 M☉ 이상인 큰 별에서 일어나요.', '질량이 작은 별은 철 핵이 만들어지는 단계까지 가지 못해요. 약 8 M☉ 이상의 큰 별만 가능해요.'],
          explain: '철은 핵융합을 해도 에너지가 나오지 않아요. 중심핵에 철이 쌓이면 압력을 만들 에너지원이 없어 중력으로 <b>붕괴</b>하고, 바깥층이 폭발하는 <b>초신성</b>이 돼요. 이런 일은 약 8 M☉ 이상인 큰 별에서 일어나요.',
        },
      ],
    },
    {
      title: '물질 순환: 성간 물질로 돌아가요', short: '물질 순환', icon: '♻️', phase: '적용', features: ['cycle'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 별이 질량에 따라 행성상 성운이나 초신성으로 끝나는 것을 봤어요.</div>' +
        '<p>별은 죽으면서 별 속에서 만든 헬륨·탄소·산소·철 등을 <b>성간 물질</b>로 돌려보내요. 이 물질로 다음 세대의 별과 행성이 태어나요. 우리 몸과 지구에 있는 무거운 원소도 오래전 별에서 온 거예요. 태양에 철 같은 무거운 원소가 있는 것은 이전 세대 별이 남긴 물질로 만들어졌다는 뜻이에요.</p>' +
        '<p>세 질량(1, 5, 15 M☉)의 경로와 수명을 한 H-R도에서 비교하며 <b>순환 고리</b>를 완성해요.</p>',
      setup() { enterLevel(3); },
      recap: '별은 성간 물질에서 태어나 질량에 따라 다른 경로로 진화하고, 죽을 때 무거운 원소를 성간 물질로 돌려보내요. 무거운 별일수록 수명이 짧고 빨리 돌려줘요.',
      summary: '<ul><li><b>물질 순환</b>: 성간 물질 → 원시별 → 주계열성 → 거성·초거성 → 행성상 성운·초신성 → 성간 물질</li><li>별 속에서 만든 헬륨·탄소·산소·철 등이 성간 물질에 섞여 다음 세대의 별과 행성의 재료가 돼요. 태양은 이전 세대 별이 남긴 물질로 만들어진 별이에요.</li>' +
        tbl([['처음 질량', '주계열 수명(대략)', '최후'], ['1 M☉', '약 100억 년', '행성상 성운 + 백색 왜성'], ['5 M☉', '약 1억 년', '행성상 성운 + 백색 왜성'], ['15 M☉', '약 750만 년', '초신성 → 중성자별']]) + '<li>무거운 별일수록 수명이 짧고, 무거운 원소를 성간 물질로 더 빨리 돌려줘요.</li></ul>',
      missions: [
        {
          title: '순환 고리 완성하고 경로 짝짓기',
          goal: '① <b>순환 고리 5단계</b>를 순서대로 눌러 고리를 완성하고, ② 세 질량(1·5·15 M☉)의 <b>최후와 주계열 수명</b>을 짝지어요. 그리고 <b>✔ 확인하기</b>를 눌러요.', manual: true,
          setup() { S.pairOn = true; setView('v4'); setOrd('ring'); },
          hint: '경과 시간 슬라이더를 늘려 보면 15 M☉ 별이 가장 먼저 초신성이 되고, 1 M☉ 별은 가장 오래 주계열에 머물러요.',
          check: () => (S.ord.length < 5 ? '순환 고리의 5단계를 모두 눌러요.' : !ordOk() ? '고리의 순서가 달라요. 성간 물질에서 시작해 별이 태어나 죽어서 다시 성간 물질로 돌아가요.' : [1, 5, 15].some((m) => !S.pairSel[m]) ? '세 질량의 최후와 수명을 모두 골라요.' : pairOk() ? true : '짝이 맞지 않는 질량이 있어요. 질량이 클수록 수명이 짧아요.'),
          explain: '고리: <b>성간 물질 → 원시별 → 주계열성 → 거성·초거성 → 행성상 성운·초신성 → 성간 물질</b>. 1 M☉는 약 100억 년 뒤 백색 왜성, 5 M☉는 약 1억 년 뒤 백색 왜성, 15 M☉는 약 750만 년 만에 초신성이 돼요.',
        },
        {
          type: 'quiz', title: '무거운 원소는 어디서 왔을까?', goal: '<b>오래 사는 별</b>과 <b>빨리 죽는 별</b> 중 철 같은 무거운 원소를 성간 물질에 더 빨리 돌려주는 별과 그 까닭은?', setup() { S.pairOn = true; setView('v4'); },
          choices: ['질량이 큰 별이에요. 수명이 짧고 초신성 폭발로 무거운 원소를 성간 물질에 빨리 돌려줘요', '질량이 작은 별이에요. 오래 살아서 더 많은 원소를 만들어요', '모든 별은 같은 시간에 원소를 돌려줘요', '우리 몸의 무거운 원소는 모두 빅뱅 때 만들어졌어요'],
          answer: 0,
          feedback: ['', '질량이 작은 별은 수명이 길어서 원소를 돌려주는 때도 아주 늦어요. 또 철까지 만들지도 못해요.', '수명은 질량에 따라 크게 달라요(15 M☉ 약 750만 년, 1 M☉ 약 100억 년).', '빅뱅 때는 주로 수소와 헬륨이 만들어졌어요. 탄소·산소·철 같은 무거운 원소는 별 속과 초신성에서 만들어졌어요.'],
          explain: '큰 별은 수명이 짧고 초신성 폭발로 철 등 무거운 원소를 성간 물질로 돌려줘요. 우리 몸과 지구의 무거운 원소는 오래전 별에서 온 물질이에요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'he-stellar-evolution', mount: '#game', badge: '별의 일생 해설가', homeHref: '../../index.html#he',
    featureLabels: { cloud: '🌌 성간 구름 · 중심 온도 계기', post: '🔴 시간 슬라이더 · 내부 단면 · H-R 경로', sn: '💥 최후 예측 · 초신성 · 양파 구조', cycle: '♻️ 순환 고리 · 세 별의 경로 비교' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 루프 ---------- */
  let lastFree = false, gasAcc = 0;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    // 1단계: 수축
    S.spin += dt * (0.12 + 0.9 * S.p1 * S.p1);
    if (S.play1) {
      S.p1 = RM ? 1 : Math.min(1, S.p1 + dt / 7); sP1.value = Math.round(S.p1 * 100); sP1.style.setProperty('--pct', Math.round(S.p1 * 100) + '%'); oP1.textContent = Math.round(S.p1 * 100) + ' %';
      if (S.p1 >= 1) S.play1 = false;
    }
    if (S.p1 >= 1 && !S.ign[S.m1]) {
      S.ign[S.m1] = true; Sound.success(); const cp = cloudPos();
      parts.burst(cp.cx, cp.cy, { count: 36, speed: 200, size: 4, life: 1, colors: ['#fde68a', '#fff', '#fb923c', '#7dd3fc'] });
      say(S.m1 + ' M☉ 별이 주계열에 도달했어요! (전주계열 기간 약 ' + fmtYears(D1[S.m1]) + ')', false, 4); updateCtl();
    }
    if (S.view === 'v1' && !RM && S.p1 < 1) {
      const cp = cloudPos(), rs = rsOf(S.m1), Rc = rs + (cp.R0 - rs) * pow(1 - S.p1, 1.7); gasAcc += dt * (22 + (S.play1 ? 18 : 0));
      while (gasAcc >= 1) { gasAcc -= 1; const a = rnd(0, TAU), x = cp.cx + Math.cos(a) * Rc * 1.1, y = cp.cy + Math.sin(a) * Rc * 1.1 * (1 - 0.5 * S.p1), sp = 40 + 70 * S.p1; parts.emit({ x, y, vx: -Math.cos(a) * sp, vy: -Math.sin(a) * sp * (1 - 0.5 * S.p1), life: Math.max(0.3, Rc * 1.05 / sp), size: 2.2, color: '#d8b4c8', shape: 'circle', fade: true }); }
    }
    // 2단계
    S.s2d = approach(S.s2d, S.s2, dt, 5); if (Math.abs(S.s2d - S.s2) < 0.004) S.s2d = S.s2;
    S.maxS2 = Math.max(S.maxS2, S.s2d);
    // 3단계
    if (S.play3) {
      const fate = fateOf(S.runM); S.u3 = RM ? 1 : Math.min(1, S.u3 + dt / (fate === 'wd' ? 10 : 9));
      if (S.u3 >= 1) finishRun3();
    }
    if (S.view === 'v3') {
      const fate = fateOf(S.M3);
      if (fate !== 'wd' && S.u3 >= 0.7 && !S.snFired) { S.snFired = true; S.flash = 1; Sound.level(); const Sc = LAY.v3.sc, cx = Sc.x + Sc.w / 2, cy = Sc.y + (PHONE ? 142 : 168); parts.burst(cx, cy, { count: 70, speed: 280, size: 4, life: 1.3, colors: ['#fde68a', '#fff', '#fb923c', '#f472b6'], gravity: 0 }); }
      if (S.u3 < 0.69) S.snFired = false;
    }
    S.flash = approach(S.flash, 0, dt, 3.2); if (S.flash < 0.01) S.flash = 0;
    // 4단계
    if (S.play4) { S.tau = Math.min(10.3, S.tau + dt * (RM ? 5 : 0.3)); sT4.value = Math.round(S.tau * 10); sT4.style.setProperty('--pct', ((S.tau - 6) / 4.3 * 100) + '%'); oT4.textContent = fmtYears(pow(10, S.tau)); if (S.tau >= 10.3) { S.play4 = false; updateCtl(); } }
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    ctx.fillStyle = '#0a1128'; ctx.fillRect(0, 0, VW, VH);
    if (S.view === 'v1') drawV1(t, dt);
    else if (S.view === 'v2') drawV2(t, dt);
    else if (S.view === 'v3') drawV3(t, dt);
    else drawV4(t, dt);
    parts.draw(ctx);
    drawFlash(dt, PHONE ? VH - 56 : VH - 50);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(10,17,40,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, LAY, TRK, star2, fateOf, coreMass, s4Of, doneAt, ORD, PAIR_ANS,
    get game() { return game; },
    enterLevel, setView, updateCtl, setM1, setP1, setS2, setM3, setTau, playRun3, finishRun3, recordRg, setOrd, ordPick, ordOk,
    setU3(u) { S.play3 = false; S.u3 = u; },
    igniteAll() { [1, 5, 15].forEach((m) => { S.ign[m] = true; }); updateCtl(); },
  };

})();
