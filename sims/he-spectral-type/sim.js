(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;

  /* ---------- 상수 · 도우미 ---------- */
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const RM = SciSim.reduceMotion;
  const TAU = Math.PI * 2, DEG = Math.PI / 180;
  const mark = (b) => (b ? '✅' : '⬜');
  const smooth = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const approach = (cur, tgt, dt, rate) => (RM ? tgt : SciSim.approach(cur, tgt, dt, rate));
  const f0 = (x) => String(Math.round(x));
  const f1 = (x) => (Math.round(x * 10) / 10).toFixed(1);
  const f2 = (x) => (Math.round(x * 100) / 100).toFixed(2);
  const comma = (n) => String(Math.round(n)).replace(/(\d)(?=(\d{3})+$)/g, '$1,');
  const wrap360 = (a) => ((a % 360) + 540) % 360 - 180; // -180 ~ 180
  // 받침 유무에 따라 조사 고르기
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
    const f0_ = D.font; D.font = (n, w) => f0_(Math.round(n * FS * 10) / 10, w);
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
        const cand = line ? line + ' ' + w : w;
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
  function drawWrap(x, y, text, maxW, size, o) {
    o = o || {};
    const lines = wrapLines(text, maxW, size, o.weight), lh = size * FS * (o.lh || 1.3);
    lines.forEach((l, i) => D.text(x, y + i * lh, l, { size, weight: o.weight || 700, color: o.color || '#334155', align: o.align || 'center', alpha: o.alpha, stroke: o.stroke, strokeWidth: o.strokeWidth }));
    return y + (lines.length - 1) * lh;
  }
  /* 안내 글 상자 (반투명 판) */
  function note(x, y, w, text, size, o) {
    o = o || {};
    const lines = wrapLines(text, w - 24, size, 700), lh = size * FS * 1.32, h = lines.length * lh + 14;
    D.shadow(() => { ctx.fillStyle = o.bg || 'rgba(255,255,255,.92)'; rr(x, y, w, h, 12).fill(); }, { blur: 5, y: 2 });
    if (o.border) { ctx.strokeStyle = o.border; ctx.lineWidth = 2; rr(x, y, w, h, 12).stroke(); }
    lines.forEach((l, i) => D.text(x + w / 2, y + 12 + size * FS * 0.8 + i * lh, l, { size, weight: 700, color: o.color || '#334155' }));
    return h;
  }
  function panel(x, y, w, h, o) {
    o = o || {};
    D.shadow(() => { ctx.fillStyle = o.fill || 'rgba(255,255,255,.9)'; rr(x, y, w, h, o.r || 14).fill(); }, { blur: 6, y: 2 });
    if (o.line) { ctx.strokeStyle = o.line; ctx.lineWidth = o.lw || 2; rr(x, y, w, h, o.r || 14).stroke(); }
    if (o.title) D.text(x + 12, y + 20, o.title, { size: o.tsize || 14, weight: 800, color: o.tcolor || '#334155', align: 'left' });
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
    const a = clamp(flash.t / 0.4, 0, 1), sz = PHONE ? 13 : 14.5;
    const lines = wrapLines(flash.text, VW - 60, sz, 800), lh = sz * FS * 1.3, h = lines.length * lh + 14;
    ctx.save(); ctx.globalAlpha = a;
    D.shadow(() => { ctx.fillStyle = flash.bg; rr(20, y, VW - 40, h, 12).fill(); }, { blur: 6, y: 2 });
    lines.forEach((l, i) => D.text(VW / 2, y + 7 + sz * FS * 0.95 + i * lh, l, { size: sz, weight: 800, color: '#fff' }));
    ctx.restore();
  }
  function setSlider(input, out, v, fmt) { input.value = v; input.style.setProperty('--pct', ((v - input.min) / (input.max - input.min)) * 100 + '%'); if (out) out.textContent = fmt ? fmt(+input.value) : v; }
  function bindSlider(input, out, fmt, cb) {
    const upd = () => { input.style.setProperty('--pct', ((input.value - input.min) / (input.max - input.min)) * 100 + '%'); if (out) out.textContent = fmt(+input.value); };
    input.addEventListener('input', () => { upd(); cb && cb(+input.value); });
    upd();
  }
  function line(pts, color, w, o) {
    o = o || {};
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = w || 3; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (o.dash) ctx.setLineDash(o.dash);
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke(); ctx.restore();
  }
  /* 별밤 배경 (고정 별) */
  const STARS = [];
  (function () { let s = 12345; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647); for (let i = 0; i < 90; i++) STARS.push([r(), r(), 0.4 + r() * 1.2, r() * 6]); })();
  function drawSpaceBg(t) {
    const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#0b1230'); g.addColorStop(1, '#16224a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
    STARS.forEach((s) => { ctx.globalAlpha = 0.35 + 0.35 * Math.sin(t * 1.3 + s[3]); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s[0] * VW, s[1] * VH, s[2], 0, TAU); ctx.fill(); });
    ctx.globalAlpha = 1;
  }
  /* 두 원판이 겹치는 넓이 비율(작은 원판 기준이 아니라 R1 원판 기준) */
  function lensArea(r1, r2, d) {
    if (d >= r1 + r2) return 0;
    if (d <= Math.abs(r1 - r2)) return Math.PI * Math.min(r1, r2) ** 2;
    const a1 = Math.acos(clamp((d * d + r1 * r1 - r2 * r2) / (2 * d * r1), -1, 1)), a2 = Math.acos(clamp((d * d + r2 * r2 - r1 * r1) / (2 * d * r2), -1, 1));
    return r1 * r1 * a1 + r2 * r2 * a2 - 0.5 * Math.sqrt(Math.max(0, (-d + r1 + r2) * (d + r1 - r2) * (d - r1 + r2) * (d + r1 + r2)));
  }

  /* 달 위상 그리기 (해 방향이 화면 안에서 (lx, ly), 시청자 쪽으로 lz 성분): 밝은 부분만 칠해요 */
  function litSphere(x, y, r, lx, ly, lz, dark, bright) {
    ctx.save();
    ctx.fillStyle = dark || '#39425c'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    const len = Math.hypot(lx, ly, lz) || 1; lx /= len; ly /= len; lz /= len;
    const ang = Math.atan2(ly, lx), sl = Math.hypot(lx, ly);
    ctx.translate(x, y); ctx.rotate(ang);
    const g = ctx.createRadialGradient(r * 0.2, -r * 0.2, r * 0.1, 0, 0, r);
    g.addColorStop(0, shade(bright || '#f3efe0', 0.2)); g.addColorStop(1, bright || '#cfc9b4');
    ctx.fillStyle = g; ctx.beginPath();
    ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, false);   // 해 쪽 반원
    const ex = Math.abs(lz) * r;
    if (lz > 0) ctx.ellipse(0, 0, ex, r, 0, Math.PI / 2, -Math.PI / 2, false); // 시청자 쪽에서 비춤: 터미네이터가 반대편으로 부풀어요
    else ctx.ellipse(0, 0, ex, r, 0, Math.PI / 2, -Math.PI / 2, true);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); ctx.restore();
  }

  /* =========================================================
     지구과학 Ⅲ. 태양계 천체와 별과 우주의 진화 - 별의 분광형
     [12지구03-02] 별의 분광형 결정 및 별의 분류 과정을 이해하고, 흑체복사 법칙을 이용하여 별의 물리량을 추론할 수 있다.
     ① 관찰: 별빛 분해(연속 스펙트럼 + 흡수선)  ② 탐구: 분광형 O B A F G K M 순서
     ③ 분석: 온도에 따른 흡수선 세기 변화  ④ 적용: 분광형 × 광도 계급으로 별 분류
     선의 세기는 온도에 따라 봉우리 모양으로 변하도록 그렸어요(사하 방정식 계산은 다루지 않아요).
     ========================================================= */
  const NM0 = 390, NM1 = 720;
  const gs = (l, c, s) => Math.exp(-0.5 * ((l - c) / s) * ((l - c) / s));
  /* 파장 → 색 */
  const WLC = [];
  (function () {
    for (let i = 0; i <= 660; i++) {
      const l = 380 + i * 0.5;
      let r = 0, g = 0, b = 0;
      if (l < 440) { r = -(l - 440) / 60; b = 1; } else if (l < 490) { g = (l - 440) / 50; b = 1; } else if (l < 510) { g = 1; b = -(l - 510) / 20; }
      else if (l < 580) { r = (l - 510) / 70; g = 1; } else if (l < 645) { r = 1; g = -(l - 645) / 65; } else { r = 1; }
      const f = l < 420 ? 0.5 + 0.5 * (l - 380) / 40 : l > 700 ? 0.55 + 0.45 * Math.max(0, (730 - l) / 30) : 1;
      WLC.push([Math.pow(Math.max(0, r) * f, 0.8), Math.pow(Math.max(0, g) * f, 0.8), Math.pow(Math.max(0, b) * f, 0.8)]);
    }
  })();
  const wlc = (l) => WLC[clamp(Math.round((l - 380) * 2), 0, 660)];
  const planck = (l, T) => 1 / (Math.pow(l, 5) * (Math.exp(1.4388e7 / (l * T)) - 1));

  /* 분광형: 표면 온도(K) 구간과 색 */
  const CLASSES = [
    { k: 'O', lo: 30000, hi: 60000, col: '#7aa2ff', cname: '청색', rep: 35000 },
    { k: 'B', lo: 10000, hi: 30000, col: '#9fc0ff', cname: '청백색', rep: 20000 },
    { k: 'A', lo: 7500, hi: 10000, col: '#e6edff', cname: '백색', rep: 9500 },
    { k: 'F', lo: 6000, hi: 7500, col: '#fff3c4', cname: '황백색', rep: 6700 },
    { k: 'G', lo: 5200, hi: 6000, col: '#ffe066', cname: '황색', rep: 5700 },
    { k: 'K', lo: 3700, hi: 5200, col: '#ffa94d', cname: '주황색', rep: 4400 },
    { k: 'M', lo: 2400, hi: 3700, col: '#ff6b4a', cname: '적색', rep: 3300 },
  ];
  const CLS = {}; CLASSES.forEach((c) => { CLS[c.k] = c; });
  const classOf = (T) => { for (const c of CLASSES) if (T >= c.lo) return c.k; return 'M'; };
  const classCol = (T) => CLS[classOf(T)].col;
  function starColor(T) {                         // 온도에 따라 부드럽게 변하는 별빛 색
    const stops = CLASSES.slice().reverse().map((c) => [c.rep, c.col]);
    if (T <= stops[0][0]) return stops[0][1]; if (T >= stops[stops.length - 1][0]) return stops[stops.length - 1][1];
    for (let i = 0; i < stops.length - 1; i++) if (T <= stops[i + 1][0]) { const t = (Math.log(T) - Math.log(stops[i][0])) / (Math.log(stops[i + 1][0]) - Math.log(stops[i][0])); return SciSim.color.mix(stops[i][1], stops[i + 1][1], t); }
    return '#fff';
  }
  /* 선의 세기 곡선(온도의 봉우리): 최대 높이 1 */
  const peak = (T, T0, sc, sh) => { const d = Math.log10(T / T0); const s = d < 0 ? sc : sh; return Math.exp(-(d * d) / (2 * s * s)); };
  const STR = {
    HeII: (T) => peak(T, 40000, 0.14, 0.2),
    HeI: (T) => peak(T, 20000, 0.17, 0.17),
    H: (T) => peak(T, 9800, 0.19, 0.17),
    CaII: (T) => peak(T, 5200, 0.12, 0.13),
    metal: (T) => peak(T, 4600, 0.2, 0.17),
    TiO: (T) => 1 / (1 + Math.exp((T - 3700) / 230)),
  };
  const SPECIES = [
    { id: 'HeII', name: 'He II (이온화 헬륨)', col: '#a78bfa' },
    { id: 'HeI', name: 'He I (헬륨)', col: '#38bdf8' },
    { id: 'H', name: '수소 발머선', col: '#ef4444' },
    { id: 'CaII', name: 'Ca II H·K (칼슘)', col: '#16a34a' },
    { id: 'metal', name: '중성 금속선', col: '#f59e0b' },
    { id: 'TiO', name: 'TiO 분자 띠', col: '#92400e' },
  ];
  /* 흡수선 목록 [파장 nm, 종, 이름, 상대 깊이, 폭 nm] */
  const LINES = [
    [410.2, 'H', 'Hδ', 0.85, 2.0], [434.0, 'H', 'Hγ', 0.9, 2.2], [486.1, 'H', 'Hβ', 1.0, 2.4], [656.3, 'H', 'Hα', 1.0, 2.8],
    [402.6, 'HeI', 'He I', 0.8, 1.2], [447.1, 'HeI', 'He I', 1.0, 1.4], [471.3, 'HeI', 'He I', 0.55, 1.2], [492.2, 'HeI', 'He I', 0.7, 1.2], [501.6, 'HeI', 'He I', 0.6, 1.2], [587.6, 'HeI', 'He I', 0.8, 1.2], [667.8, 'HeI', 'He I', 0.6, 1.2],
    [420.0, 'HeII', 'He II', 0.55, 1.2], [454.1, 'HeII', 'He II', 0.85, 1.4], [468.6, 'HeII', 'He II', 1.0, 1.6], [541.1, 'HeII', 'He II', 0.75, 1.4], [656.0, 'HeII', 'He II', 0.4, 1.4],
    [393.4, 'CaII', 'Ca II H·K', 1.0, 3.0], [396.8, 'CaII', 'Ca II H·K', 0.95, 3.0],
    [422.7, 'metal', 'Ca I', 0.8, 1.4], [430.8, 'metal', 'G띠', 0.85, 3.0], [438.4, 'metal', 'Fe I', 0.7, 1.4], [441.5, 'metal', 'Fe I', 0.55, 1.4], [466.8, 'metal', 'Fe I', 0.45, 1.2], [495.7, 'metal', 'Fe I', 0.5, 1.2],
    [516.7, 'metal', 'Mg I', 0.9, 1.6], [517.3, 'metal', 'Mg I', 0.8, 1.6], [518.4, 'metal', 'Mg I', 0.85, 1.6], [527.0, 'metal', 'Fe I', 0.6, 1.4], [589.0, 'metal', 'Na I', 0.9, 1.5], [589.6, 'metal', 'Na I', 0.85, 1.5],
  ];
  const TIO = [[495, 7], [517, 8], [541, 9], [567, 10], [585, 9], [616, 14], [667, 10], [705, 16]];
  const LUMW = { I: 0.5, III: 0.75, 'IV-V': 0.9, V: 1.0 };
  const DEPTH = { H: 0.88, HeI: 0.5, HeII: 0.42, CaII: 0.92, metal: 0.62, TiO: 0.8 };
  function lineDepth(sp, T) { return DEPTH[sp] * STR[sp](T); }

  /* 스펙트럼 막대: 가로 W 픽셀의 한 줄 이미지 (연속 스펙트럼 × 흡수선). reveal 0~1: 흡수선이 차례로 어두워져요 */
  const specCache = new Map();
  function specCanvas(T, lum, W, reveal, opts) {
    opts = opts || {};
    const rv = reveal == null ? 1 : reveal;
    const key = [Math.round(T / 20), lum, W, Math.round(rv * 40), opts.noTiO ? 1 : 0, opts.only || ''].join('|');
    if (specCache.has(key)) return specCache.get(key);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = 1;
    const c2 = cv.getContext('2d'), img = c2.createImageData(W, 1);
    const lw = LUMW[lum] || 1, I = [], prof = new Float32Array(W), cont = new Float32Array(W);
    let mx = 0; for (let l = 390; l <= 720; l += 10) mx = Math.max(mx, planck(l, T));
    for (let x = 0; x < W; x++) {
      const l = NM0 + (x + 0.5) / W * (NM1 - NM0), pl = planck(l, T) / mx, col = wlc(l);
      let d = 0;
      LINES.forEach((ln, i) => {
        if (opts.only && opts.only !== ln[1]) return;
        const dep = lineDepth(ln[1], T) * ln[3]; if (dep < 0.01) return;
        const st = smooth(rv * 1.8 - (ln[0] - NM0) / (NM1 - NM0) * 0.8);
        d = 1 - (1 - d) * (1 - dep * st * gs(l, ln[0], ln[4] * lw * 0.9));
      });
      if (!opts.noTiO && (!opts.only || opts.only === 'TiO')) {
        const tio = STR.TiO(T) * DEPTH.TiO;
        if (tio > 0.01) TIO.forEach((b, i) => { const st = smooth(rv * 1.8 - (b[0] - NM0) / (NM1 - NM0) * 0.8); const prof = l >= b[0] ? Math.exp(-(l - b[0]) / (b[1] * 1.4)) : Math.exp(-((b[0] - l) * (b[0] - l)) / 2); d = 1 - (1 - d) * (1 - tio * st * 0.75 * prof * (l >= b[0] - 2 ? 1 : 0.3)); });
      }
      const bright = Math.pow(clamp(pl, 0, 1), 0.38) * 0.95 + 0.05;
      const fade = (1 - d);
      prof[x] = bright * fade; cont[x] = bright;
      img.data[x * 4] = Math.round(255 * col[0] * bright * fade); img.data[x * 4 + 1] = Math.round(255 * col[1] * bright * fade); img.data[x * 4 + 2] = Math.round(255 * col[2] * bright * fade); img.data[x * 4 + 3] = 255;
    }
    c2.putImageData(img, 0, 0);
    cv.prof = prof; cv.cont = cont;
    if (specCache.size > 260) specCache.clear();
    specCache.set(key, cv);
    return cv;
  }
  /* 선의 세기(0~1, 그림에서 보이는 정도) */
  const strengthAt = (sp, T) => STR[sp](T);

  /* 대표 별 자료 (이름, 표면 온도 K, 분광형 표기, 광도 계급, 광도 L/Lsun, 문자열) */
  const STARS6 = [
    { id: 'rigel', name: '리겔', T: 12100, type: 'B8 I', lum: 'I', L: '1.2×10⁵' },
    { id: 'sirius', name: '시리우스 A', T: 9900, type: 'A1 V', lum: 'V', L: '25' },
    { id: 'sun', name: '태양', T: 5800, type: 'G2 V', lum: 'V', L: '1' },
    { id: 'arcturus', name: '아르크투루스', T: 4300, type: 'K1.5 III', lum: 'III', L: '170' },
    { id: 'betel', name: '베텔게우스', T: 3500, type: 'M2 I', lum: 'I', L: '1×10⁵' },
    { id: 'proxima', name: '프록시마', T: 3000, type: 'M5.5 V', lum: 'V', L: '0.0017' },
  ];
  const BY6 = {}; STARS6.forEach((s) => { BY6[s.id] = s; });

  /* ---------- 상태 ---------- */
  const S = {
    view: 'obs', clock: 0,
    // ① 별빛 분해
    star: 'sun', seen: {}, rev: 0, rayT: 1, absPick: null,
    // ② 분광형 정렬
    order: [], rowY: {}, drag: null, sorted: false, pick: { mode: 'B', B: null, K: null }, pickOn: false, tbl: true,
    // ③ 온도
    T: 9000, Tv: 9000, fl3: { peak: false }, unk: null, showUnk: false, ansU: { cls: [], ord: [] },
    // ④ 분류
    cards4: [], d4: null, placed: {}, checked4: false,
  };
  let game = null;
  const clickable = (el, fn) => el.addEventListener('click', () => { Sound.click(); fn(el); });
  const hasF = (n) => (game ? game.has(n) : true);
  const sub = (s) => String(s);
  const fmtK = (T) => comma(Math.round(T / 10) * 10) + ' K';

  /* ======================================================
     ① 별빛 분해
     ====================================================== */
  function layO() {
    if (PHONE) return { app: { x: 8, y: 8, w: VW - 16, h: 150 }, st: { x: 8, y: 166, w: VW - 16, h: 232 }, cards: { x: 8, y: 406, w: VW - 16, h: 346 } };
    return { app: { x: 8, y: 8, w: VW - 16, h: 170 }, st: { x: 8, y: 186, w: VW - 16, h: 190 }, cards: { x: 8, y: 384, w: VW - 16, h: 168 } };
  }
  const axisTicks = (x, y, w, nm0, nm1, step, lab) => {
    for (let nm = Math.ceil(nm0 / step) * step; nm <= nm1; nm += step) {
      const xx = x + (nm - nm0) / (nm1 - nm0) * w; line([[xx, y], [xx, y + 6]], '#94a3b8', 1.4);
      if (lab) D.text(xx, y + 19, String(nm), { size: 12, weight: 700, color: '#94a3b8' });
    }
  };
  /* 스펙트럼 막대 그리기 (x, y, w, h) */
  function drawSpec(T, lum, x, y, w, h, reveal, o) {
    o = o || {};
    const cv = specCanvas(T, lum, Math.round(w), reveal, o);
    ctx.save(); rr(x, y, w, h, o.r == null ? 6 : o.r).clip(); ctx.imageSmoothingEnabled = false; ctx.drawImage(cv, 0, 0, cv.width, 1, x, y, w, h); ctx.restore();
    ctx.strokeStyle = 'rgba(148,163,184,.55)'; ctx.lineWidth = 1.5; rr(x, y, w, h, o.r == null ? 6 : o.r).stroke();
    return cv;
  }
  function drawApparatus(A, t) {
    const T = BY6[S.star].T, rt = S.rayT;
    panel(A.x, A.y, A.w, A.h, { fill: '#0a1130', line: 'rgba(148,163,184,.45)' });
    const cy = A.y + A.h * 0.52, sx = A.x + (PHONE ? 50 : 76), r = PHONE ? 20 : 26, col = starColor(T);
    ctx.save(); rr(A.x, A.y, A.w, A.h, 14).clip();
    STARS.forEach((s) => { ctx.globalAlpha = 0.25 + 0.2 * Math.sin(t + s[3]); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(A.x + s[0] * A.w, A.y + s[1] * A.h, s[2] * 0.7, 0, TAU); ctx.fill(); }); ctx.globalAlpha = 1;
    D.glow(sx, cy, r * 3.2, col, 0.55); D.sphere(sx, cy, r, col, { light: '#ffffff', dark: shade(col, -0.35), gloss: false });
    D.text(sx, cy + r + 22, BY6[S.star].name, { size: 14, weight: 800, color: '#e2e8f0' });
    // 망원경과 흰 빛
    const tx0 = sx + r + 14, px = A.x + (PHONE ? 210 : 300), pw = PHONE ? 64 : 78, ph = PHONE ? 70 : 84;
    ctx.fillStyle = '#334155'; rr(tx0 + 8, cy - 14, (px - pw / 2 - tx0) - 24, 28, 6).fill(); ctx.fillStyle = '#475569'; rr(tx0, cy - 18, 14, 36, 4).fill();
    D.text((tx0 + px - pw / 2) / 2 + 4, cy - 24, '망원경', { size: 12.5, weight: 700, color: '#94a3b8' });
    const ex = px - pw * 0.28;
    ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(tx0 + 14, cy); ctx.lineTo(tx0 + 14 + (ex - tx0 - 14) * clamp(rt * 1.6, 0, 1), cy); ctx.stroke();
    // 프리즘
    ctx.save(); ctx.fillStyle = 'rgba(186,230,253,.35)'; ctx.strokeStyle = 'rgba(224,242,254,.95)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(px, cy - ph / 2); ctx.lineTo(px + pw / 2, cy + ph / 2); ctx.lineTo(px - pw / 2, cy + ph / 2); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    D.text(px, cy + ph / 2 + 20, '프리즘(분광기)', { size: 12.5, weight: 700, color: '#94a3b8' });
    // 무지개 부채꼴
    const ox = px + pw * 0.2, oy = cy + 2, scrX = A.x + A.w - (PHONE ? 90 : 120), len = clamp(rt * 1.2 - 0.3, 0, 1);
    const cols = ['#a855f7', '#6366f1', '#3b82f6', '#22c55e', '#facc15', '#f97316', '#ef4444'];
    const top = A.y + 22, bot = A.y + A.h - 22;
    for (let i = 0; i < 7; i++) {
      const yy = bot - (bot - top) * (i / 6);
      ctx.strokeStyle = cols[i]; ctx.globalAlpha = 0.9; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + (scrX - ox) * len, oy + (yy - oy) * len); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // 스크린
    if (len > 0.9) { const g = ctx.createLinearGradient(0, top, 0, bot); cols.slice().reverse().forEach((c, i) => g.addColorStop(i / 6, c)); ctx.fillStyle = g; rr(scrX, top - 8, 22, bot - top + 16, 6).fill(); }
    D.text(scrX + 11, A.y + A.h - 4, '스펙트럼', { size: 12.5, weight: 700, color: '#94a3b8' });
    D.text(A.x + A.w - 14, A.y + 24, '별빛 = 모든 색이 섞인 빛', { size: 13, weight: 800, color: '#cbd5e1', align: 'right' });
    ctx.restore();
  }
  function drawStrip(P, t, T, lum, rev, title, opts) {
    opts = opts || {};
    panel(P.x, P.y, P.w, P.h, { fill: 'rgba(255,255,255,.96)' });
    D.text(P.x + 14, P.y + 24, title, { size: 14.5, weight: 800, color: '#0f172a', align: 'left' });
    const x = P.x + 16, w = P.w - 32, sy = P.y + 78, sh = PHONE ? 46 : 54;
    // 선 이름표
    const labs = LINES.filter((ln) => lineDepth(ln[1], T) * ln[3] > 0.28 && (ln[2] !== 'Fe I' || false)).sort((a, b) => lineDepth(b[1], T) * b[3] - lineDepth(a[1], T) * a[3]).slice(0, PHONE ? 5 : 8).sort((a, b) => a[0] - b[0]);
    const xs = (nm) => x + (nm - NM0) / (NM1 - NM0) * w;
    let lastX = -99, row = 0, lastName = '', lastNm = -99;
    labs.forEach((ln) => {
      if (ln[2] === lastName && ln[0] - lastNm < 14) return; lastName = ln[2]; lastNm = ln[0]; const xx = xs(ln[0]); row = xx - lastX < 40 ? 1 - row : 0; lastX = xx; D.text(xx, sy - 8 - row * 15, ln[2], { size: 12, weight: 800, color: '#334155' }); line([[xx, sy - 6 - row * 15 + 2], [xx, sy]], 'rgba(51,65,85,.5)', 1); });
    if (STR.TiO(T) > 0.25) { const xx = xs(616); D.text(xx, sy - 8, 'TiO 띠', { size: 12, weight: 800, color: '#92400e' }); }
    const cv = drawSpec(T, lum, x, sy, w, sh, rev);
    axisTicks(x, sy + sh, w, NM0, NM1, 50, true);
    D.text(x + w, sy + sh + 38, '파장 (nm)', { size: 12.5, weight: 700, color: '#64748b', align: 'right' });
    // 세기 그래프
    const gy = sy + sh + 52, gh = P.y + P.h - gy - 10;
    if (gh > 24) {
      ctx.save(); ctx.fillStyle = '#f1f5f9'; rr(x, gy, w, gh, 6).fill();
      ctx.beginPath(); for (let i = 0; i < cv.prof.length; i += 1) { const px = x + i / cv.prof.length * w, py = gy + gh - 4 - cv.prof[i] * (gh - 10); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); for (let i = 0; i < cv.cont.length; i += 4) { const px = x + i / cv.cont.length * w, py = gy + gh - 4 - cv.cont[i] * (gh - 10); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.strokeStyle = 'rgba(100,116,139,.6)'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.4; ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();
      D.text(x + 6, gy + 14, PHONE ? '빛의 세기 (점선: 흡수선 없을 때)' : '빛의 세기: 파란 선 = 별빛, 회색 점선 = 흡수선이 없을 때', { size: 12, weight: 700, color: '#64748b', align: 'left' });
    }
  }
  function drawObs(t, dt) {
    const L = layO(), s = BY6[S.star];
    ctx.fillStyle = '#0b1230'; ctx.fillRect(0, 0, VW, VH);
    drawApparatus(L.app, t);
    drawStrip(L.st, t, s.T, s.lum, S.rev, s.name + ' (표면 온도 약 ' + comma(s.T) + ' K, ' + CLS[classOf(s.T)].cname + ')의 스펙트럼');
    // 별 카드
    const C = L.cards, n = 6, cols = PHONE ? 3 : 6, rowsN = Math.ceil(n / cols), gap = 8;
    const cw = (C.w - gap * (cols - 1)) / cols, ch = PHONE ? 150 : C.h;
    STARS6.forEach((st, i) => {
      const cx = C.x + (i % cols) * (cw + gap), cy = C.y + Math.floor(i / cols) * (ch + gap), sel = st.id === S.star, seen = S.seen[st.id];
      D.shadow(() => { ctx.fillStyle = sel ? '#e0f2fe' : '#ffffff'; rr(cx, cy, cw, ch, 14).fill(); }, { blur: 5, y: 2 });
      ctx.strokeStyle = sel ? '#0ea5e9' : 'rgba(148,163,184,.5)'; ctx.lineWidth = sel ? 3 : 1.5; rr(cx, cy, cw, ch, 14).stroke();
      const col = starColor(st.T);
      ctx.save(); ctx.fillStyle = '#0b1230'; rr(cx + 8, cy + 8, cw - 16, ch * 0.42, 10).fill(); ctx.restore();
      D.glow(cx + cw / 2, cy + 8 + ch * 0.21, 36, col, 0.5); D.sphere(cx + cw / 2, cy + 8 + ch * 0.21, 14, col, { light: '#fff', dark: shade(col, -0.35), gloss: false });
      D.text(cx + cw / 2, cy + ch * 0.42 + 32, st.name, { size: 13.5, weight: 800, color: '#0f172a' });
      D.text(cx + cw / 2, cy + ch * 0.42 + 52, comma(st.T) + ' K', { size: 13, weight: 700, color: '#475569' });
      D.text(cx + cw / 2, cy + ch * 0.42 + 72, CLS[classOf(st.T)].cname, { size: 12.5, weight: 700, color: '#64748b' });
      if (seen) { ctx.save(); ctx.fillStyle = '#16a34a'; ctx.beginPath(); ctx.arc(cx + cw - 16, cy + 16, 10, 0, TAU); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx + cw - 21, cy + 16); ctx.lineTo(cx + cw - 17, cy + 20); ctx.lineTo(cx + cw - 11, cy + 12); ctx.stroke(); ctx.restore(); }
      st._r = { x: cx, y: cy, w: cw, h: ch };
    });
  }

  /* ======================================================
     ② 분광형: 스펙트럼 카드 7장 정렬
     ====================================================== */
  const ORDER7 = ['O', 'B', 'A', 'F', 'G', 'K', 'M'];
  const RNG = { O: '3만 이상', B: '1만~3만', A: '7500~1만', F: '6000~7500', G: '5200~6000', K: '3700~5200', M: '2400~3700' };
  function layS() {
    if (PHONE) return { rows: { x: 8, y: 8, w: VW - 16, h: 402 }, y0: 40, rh: 51, tbl: { x: 8, y: 418, w: VW - 16, h: 334 } };
    return { rows: { x: 8, y: 8, w: 520, h: 544 }, y0: 44, rh: 70, tbl: { x: 536, y: 8, w: VW - 544, h: 544 } };
  }
  function initSort(shuffle) {
    const ids = ORDER7.slice();
    if (shuffle) { for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; } if (ids.join('') === ORDER7.join('')) ids.reverse(); }
    S.order = ids; S.sorted = false; S.rowY = {}; const L = layS(); ids.forEach((id, i) => { S.rowY[id] = L.y0 + i * L.rh; });
    S.pick = { mode: 'B', B: null, K: null };
  }
  const sortedOK = () => S.order.join('') === ORDER7.join('');
  function drawSort(t, dt) {
    const L = layS();
    ctx.fillStyle = '#0b1230'; ctx.fillRect(0, 0, VW, VH);
    panel(L.rows.x, L.rows.y, L.rows.w, L.rows.h, { fill: 'rgba(255,255,255,.96)' });
    D.text(L.rows.x + 14, L.rows.y + 26, S.pickOn ? '스펙트럼을 보고 ' + S.pick.mode + '형 카드를 눌러요' : '카드를 끌어서 온도가 높은 별(위)에서 낮은 별(아래) 순서로', { size: PHONE ? 13 : 14.5, weight: 800, color: '#0f172a', align: 'left' });
    const rx = L.rows.x + 12, rw = L.rows.w - 24, rh = L.rh, ok = sortedOK(), dragId = S.drag && S.drag.id;
    // 칸 표시
    S.order.forEach((id, i) => { const y = L.y0 + i * rh; ctx.fillStyle = i % 2 ? 'rgba(241,245,249,.9)' : 'rgba(248,250,252,.9)'; rr(rx, y, rw, rh - 6, 10).fill(); });
    const draw1 = (id) => {
      const idx = S.order.indexOf(id), ty = L.y0 + idx * rh;
      const cur = id === dragId ? S.rowY[id] : (S.rowY[id] = approach(S.rowY[id], ty, dt, 16));
      const lift = id === dragId ? 1 : 0, c = CLS[id];
      ctx.save(); if (lift) { ctx.shadowColor = 'rgba(15,23,42,.35)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 5; }
      ctx.fillStyle = '#fff'; rr(rx + 2 - lift * 2, cur - lift * 2, rw - 4 + lift * 4, rh - 10 + lift * 3, 10).fill(); ctx.restore();
      const sel = S.pickOn && (S.pick.B === id || S.pick.K === id);
      ctx.strokeStyle = sel ? (S.pick.B === id ? '#2563eb' : '#ea580c') : ok ? '#16a34a' : 'rgba(148,163,184,.65)'; ctx.lineWidth = sel ? 3.5 : 2; rr(rx + 2 - lift * 2, cur - lift * 2, rw - 4 + lift * 4, rh - 10 + lift * 3, 10).stroke();
      ctx.save(); ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.arc(rx + 22, cur + (rh - 10) / 2, 12, 0, TAU); ctx.fill(); ctx.restore();
      D.text(rx + 22, cur + (rh - 10) / 2 + 5, String(idx + 1), { size: 13.5, weight: 800, color: '#fff' });
      const sx = rx + 44, sw = rw - 44 - (PHONE ? 78 : 104), sh = rh - 26;
      drawSpec(c.rep, 'V', sx, cur + 8, sw, sh, 1);
      const lab = S.pickOn ? (S.pick.B === id ? 'B형?' : S.pick.K === id ? 'K형?' : '') : ok ? id + '형' : '?';
      D.text(sx + sw + (PHONE ? 38 : 50), cur + (rh - 10) / 2 + 2, lab || '?', { size: PHONE ? 18 : 22, weight: 800, color: ok ? c.col === '#e6edff' ? '#64748b' : shade(c.col, -0.25) : '#94a3b8' });
      if (ok && !S.pickOn && !PHONE) D.text(sx + sw + (PHONE ? 38 : 50), cur + (rh - 10) / 2 + 20, RNG[c.k] + ' K', { size: 11.5, weight: 700, color: '#64748b' });
      // 파장 눈금 (맨 위 카드에만)
    };
    S.order.filter((id) => id !== dragId).forEach(draw1); if (dragId) draw1(dragId);
    D.text(rx + 44, L.rows.y + L.rows.h - 10, '왼쪽 = 짧은 파장(보라) · 오른쪽 = 긴 파장(빨강)', { size: 12.5, weight: 700, color: '#64748b', align: 'left' });
    if (S.sortFlash > 0) { S.sortFlash -= dt; }
    // 선 세기 표
    const T = L.tbl;
    panel(T.x, T.y, T.w, T.h, { fill: 'rgba(255,255,255,.96)' });
    D.text(T.x + 12, T.y + 26, '대표 선의 세기 (분광형별)', { size: 14, weight: 800, color: '#0f172a', align: 'left' });
    const lw = PHONE ? 118 : 96, cw = (T.w - lw - 16) / 7, y1 = T.y + 44, rh2 = PHONE ? 30 : 38;
    ORDER7.forEach((k, i) => { const x = T.x + 8 + lw + i * cw; D.text(x + cw / 2, y1 + 14, k, { size: 15, weight: 800, color: shade(CLS[k].col, k === 'A' || k === 'F' ? -0.5 : -0.25) }); });
    SPECIES.forEach((sp, r) => {
      const y = y1 + 22 + r * rh2;
      D.text(T.x + 10, y + rh2 / 2 + 3, sp.name.replace(' (이온화 헬륨)', '').replace(' (헬륨)', '').replace(' (칼슘)', ''), { size: PHONE ? 12.5 : 12.5, weight: 800, color: '#334155', align: 'left' });
      ORDER7.forEach((k, i) => {
        const x = T.x + 8 + lw + i * cw, v = STR[sp.id](CLS[k].rep);
        ctx.fillStyle = '#f1f5f9'; rr(x + 2, y + 3, cw - 4, rh2 - 6, 5).fill();
        ctx.fillStyle = rgba(sp.col, 0.12 + 0.88 * v); rr(x + 2, y + 3, cw - 4, rh2 - 6, 5).fill();
        if (v > 0.55) D.text(x + cw / 2, y + rh2 / 2 + 4, '●', { size: 11, weight: 800, color: '#fff' });
      });
    });
    const yb = y1 + 22 + SPECIES.length * rh2 + 10;
    D.text(T.x + 12, yb + 12, '진할수록 선이 강해요 · ● 가장 강한 곳', { size: 12.5, weight: 700, color: '#64748b', align: 'left' });
    const note = ['O: 이온화 헬륨선(He II)', 'B: 중성 헬륨선(He I)', 'A: 수소 발머선이 가장 강함', 'F·G: 칼슘 H·K선, 금속선', 'K: 중성 금속선, 분자선 시작', 'M: 산화 타이타늄(TiO) 띠'];
    if (!PHONE) note.forEach((n2, i) => D.text(T.x + 12, yb + 38 + i * 22, n2, { size: 13, weight: 700, color: '#334155', align: 'left' }));
    if (PHONE) { D.text(T.x + 12, yb + 40, 'He II 454·469 nm · He I 447·588 nm · 수소 발머선 410·434·486·656 nm', { size: 12, weight: 700, color: '#64748b', align: 'left' }); D.text(T.x + 12, yb + 60, 'Ca II H·K 393·397 nm · TiO 띠 495~705 nm', { size: 12, weight: 700, color: '#64748b', align: 'left' }); }
    else D.text(T.x + 12, T.y + T.h - 30, '수소 발머선: 410·434·486·656 nm', { size: 12.5, weight: 700, color: '#64748b', align: 'left' });
    if (!PHONE) D.text(T.x + 12, T.y + T.h - 12, 'Ca II H·K선: 393·397 nm', { size: 12.5, weight: 700, color: '#64748b', align: 'left' });
  }

  /* ======================================================
     ③ 온도와 흡수선
     ====================================================== */
  const TMIN = 3000, TMAX = 35000;
  const UNK = [{ id: 'A', T: 9800, ans: ['A'] }, { id: 'B', T: 5700, ans: ['F', 'G'] }, { id: 'C', T: 3300, ans: ['M'] }];
  function layT() {
    if (PHONE) return { st: { x: 8, y: 8, w: VW - 16, h: 178 }, gr: { x: 8, y: 194, w: VW - 16, h: 206 }, bars: { x: 8, y: 408, w: VW - 16, h: 160 }, unk: { x: 8, y: 576, w: VW - 16, h: 176 } };
    return { st: { x: 8, y: 8, w: VW - 16, h: 172 }, gr: { x: 8, y: 188, w: 520, h: 364 }, bars: { x: 536, y: 188, w: VW - 544, h: 170 }, unk: { x: 536, y: 366, w: VW - 544, h: 186 } };
  }
  function drawTemp(t, dt) {
    const L = layT(), T = S.Tv;
    ctx.fillStyle = '#0b1230'; ctx.fillRect(0, 0, VW, VH);
    drawStrip(L.st, t, T, 'V', 1, 'T = ' + fmtK(T) + ' · ' + classOf(T) + '형(' + CLS[classOf(T)].cname + ')의 스펙트럼');
    // 그래프
    const G = L.gr; panel(G.x, G.y, G.w, G.h, { fill: 'rgba(255,255,255,.96)' });
    D.text(G.x + 12, G.y + 24, '온도에 따른 선의 세기', { size: 14.5, weight: 800, color: '#0f172a', align: 'left' });
    const px0 = G.x + 44, px1 = G.x + G.w - 14, py0 = G.y + 44, py1 = G.y + G.h - 62;
    const xT = (TT) => px0 + (Math.log(TT) - Math.log(TMIN)) / (Math.log(TMAX) - Math.log(TMIN)) * (px1 - px0), yV = (v) => py1 - v * (py1 - py0);
    // 분광형 띠
    ORDER7.slice().reverse().forEach((k) => { const c = CLS[k], a = xT(clamp(c.lo, TMIN, TMAX)), b = xT(clamp(c.hi, TMIN, TMAX)); if (b <= a) return; ctx.fillStyle = rgba(c.col, 0.35); ctx.fillRect(a, py0, b - a, py1 - py0); D.text((a + b) / 2, py1 + 38, k, { size: 14, weight: 800, color: shade(c.col, k === 'A' || k === 'F' ? -0.55 : -0.3) }); });
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(px0, py0); ctx.lineTo(px0, py1); ctx.lineTo(px1, py1); ctx.stroke();
    [0, 0.5, 1].forEach((v) => { D.text(px0 - 6, yV(v) + 4, v === 1 ? '강' : v === 0 ? '약' : '', { size: 12.5, weight: 700, color: '#64748b', align: 'right' }); line([[px0 - 3, yV(v)], [px0, yV(v)]], '#475569', 1.4); });
    [3000, 5000, 10000, 20000, 30000].forEach((TT) => { const x = xT(TT); line([[x, py1], [x, py1 + 6]], '#475569', 1.4); D.text(x, py1 + 20, comma(TT), { size: 12, weight: 700, color: '#475569' }); });
    D.text(px1, G.y + G.h - 6, '표면 온도 (K, 로그 눈금) → 높음', { size: 12, weight: 700, color: '#64748b', align: 'right' });
    SPECIES.forEach((sp) => {
      ctx.strokeStyle = sp.col; ctx.lineWidth = 3; ctx.beginPath();
      for (let i = 0; i <= 120; i++) { const TT = Math.exp(Math.log(TMIN) + (Math.log(TMAX) - Math.log(TMIN)) * i / 120), x = xT(TT), y = yV(STR[sp.id](TT)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
    });
    // 발머선 봉우리 표시
    const hx = xT(9800); ctx.save(); ctx.setLineDash([3, 4]); ctx.strokeStyle = 'rgba(239,68,68,.6)'; ctx.beginPath(); ctx.moveTo(hx, yV(1) - 4); ctx.lineTo(hx, py1); ctx.stroke(); ctx.restore();
    D.text(hx, py0 - 4, '발머선 최대', { size: 12.5, weight: 800, color: '#dc2626' });
    // 현재 온도
    const cx = xT(clamp(T, TMIN, TMAX)); line([[cx, py0 - 2], [cx, py1]], '#0f172a', 2.6);
    SPECIES.forEach((sp) => { const v = STR[sp.id](T); ctx.fillStyle = sp.col; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, yV(v), 5.5, 0, TAU); ctx.fill(); ctx.stroke(); });
    // 범례
    const lx = G.x + G.w - 6, ly = G.y + 20;
    // 오른쪽: 현재 세기 막대
    const B = L.bars; panel(B.x, B.y, B.w, B.h, { fill: 'rgba(255,255,255,.96)' });
    D.text(B.x + 12, B.y + 24, '이 온도에서 선의 세기', { size: 14, weight: 800, color: '#0f172a', align: 'left' });
    const rhh = (B.h - 40) / SPECIES.length;
    SPECIES.forEach((sp, i) => {
      const y = B.y + 34 + i * rhh, bx = B.x + (PHONE ? 130 : 100), bw = B.w - (PHONE ? 130 : 100) - 44, v = STR[sp.id](T);
      D.text(B.x + 10, y + rhh * 0.62, sp.name.replace(' (이온화 헬륨)', '').replace(' (헬륨)', '').replace(' (칼슘)', ''), { size: 12.5, weight: 800, color: '#334155', align: 'left' });
      ctx.fillStyle = '#e2e8f0'; rr(bx, y + 4, bw, rhh - 8, 5).fill();
      ctx.fillStyle = sp.col; rr(bx, y + 4, Math.max(0, bw * v), rhh - 8, 5).fill();
      D.text(bx + bw + 8, y + rhh * 0.62, f0(v * 100) + '%', { size: 12.5, weight: 800, color: '#334155', align: 'left' });
    });
    // 미지의 별
    if (S.showUnk || (game && game.free)) {
      const U = L.unk; panel(U.x, U.y, U.w, U.h, { fill: 'rgba(255,255,255,.96)' });
      D.text(U.x + 12, U.y + 24, '미지의 별 3개의 스펙트럼', { size: 14, weight: 800, color: '#0f172a', align: 'left' });
      const uh = (U.h - 38) / 3;
      UNK.forEach((u, i) => { const y = U.y + 34 + i * uh; D.label(U.x + 26, y + uh / 2 - 3, '별 ' + u.id, { bg: '#334155', size: 13, pad: 8 }); drawSpec(u.T, 'V', U.x + 62, y + 3, U.w - 74, uh - 14, 1, { r: 4 }); });
    } else {
      const U = L.unk; panel(U.x, U.y, U.w, U.h, { fill: 'rgba(255,255,255,.96)' });
      D.text(U.x + 12, U.y + 24, '관찰 메모', { size: 14, weight: 800, color: '#0f172a', align: 'left' });
      const cls = classOf(T), notes = { O: 'He II선이 보여요. 매우 뜨거운 별!', B: 'He I선이 가장 강해요.', A: '수소 발머선이 가장 강해요.', F: '발머선이 약해지고 Ca II H·K선이 강해져요.', G: 'Ca II H·K선과 금속선이 강해요.', K: '금속선이 강하고 TiO가 나타나기 시작해요.', M: 'TiO 띠가 두드러져요.' };
      drawWrap(U.x + U.w / 2, U.y + 56, cls + '형: ' + notes[cls], U.w - 24, 14, { color: '#0f172a', weight: 700 });
    }
  }

  /* ======================================================
     ④ 별의 분류: 분광형(가로) × 광도 계급(세로)
     ====================================================== */
  const RANGE4 = { O: '3만~', B: '1~3만', A: '0.75~1만', F: '0.6~0.75만', G: '0.52~0.6만', K: '0.37~0.52만', M: '~0.37만' };
  const ROWS4 = [{ k: 'I', name: 'I 초거성' }, { k: 'III', name: 'III 거성' }, { k: 'V', name: 'V 주계열성' }];
  const STARS8 = [
    { id: 'sirius', name: '시리우스 A', short: '시리우스', T: 9900, L: '25', row: 'V', type: 'A1 V', wd: '넓음' },
    { id: 'vega', name: '베가', short: '베가', T: 9600, L: '40', row: 'V', type: 'A0 V', wd: '넓음' },
    { id: 'sun', name: '태양', short: '태양', T: 5800, L: '1', row: 'V', type: 'G2 V', wd: '넓음' },
    { id: 'arc', name: '아르크투루스', short: '아르크', T: 4300, L: '170', row: 'III', type: 'K1.5 III', wd: '좁음' },
    { id: 'betel', name: '베텔게우스', short: '베텔', T: 3500, L: '1×10⁵', row: 'I', type: 'M2 I', wd: '아주 좁음' },
    { id: 'rigel', name: '리겔', short: '리겔', T: 12100, L: '1.2×10⁵', row: 'I', type: 'B8 I', wd: '아주 좁음' },
    { id: 'procyon', name: '프로키온 A', short: '프로키온', T: 6500, L: '7', row: 'V', type: 'F5 IV-V', wd: '약간 넓음' },
    { id: 'proxima', name: '프록시마', short: '프록시', T: 3000, L: '0.0017', row: 'V', type: 'M5.5 V', wd: '넓음' },
  ];
  const BY8 = {}; STARS8.forEach((s) => { BY8[s.id] = s; });
  function lay4() {
    if (PHONE) { const lx = 62, cw = (VW - 16 - lx) / 7, top = 8, hh = 50, rh = 100; return { x: 8, y: top, lx, cw, hh, rh, bw: VW - 16, bh: hh + rh * 3 + 6, card: { w: (VW - 16 - 28) / 8, h: 72 }, tray: { x: 8, y: top + hh + rh * 3 + 20, w: VW - 16, h: 760 - (top + hh + rh * 3 + 20) - 8 }, info: { x: 8, y: top + hh + rh * 3 + 8 } }; }
    const lx = 118, cw = (VW - 16 - lx) / 7, top = 8, hh = 54, rh = 92; return { x: 8, y: top, lx, cw, hh, rh, bw: VW - 16, bh: hh + rh * 3 + 6, card: { w: (VW - 16 - 56) / 8 - 0, h: 82 }, tray: { x: 8, y: top + hh + rh * 3 + 14, w: VW - 16, h: 552 - (top + hh + rh * 3 + 14) }, info: { x: 8, y: 0 } };
  }
  const cellRect = (L, ci, ri) => ({ x: L.x + L.lx + ci * L.cw, y: L.y + L.hh + ri * L.rh, w: L.cw, h: L.rh });
  function trayPos(L, i) {
    const cw = L.card.w, ch = L.card.h, T = L.tray, cols = 8, gap = PHONE ? 4 : 8;
    const tw = cols * cw + (cols - 1) * gap, x0 = T.x + (T.w - tw) / 2, y0 = T.y + (PHONE ? 30 : 32);
    return { x: x0 + i * (cw + gap) + cw / 2, y: y0 + ch / 2 };
  }
  function initBoard() {
    const L = lay4(), ids = STARS8.map((s) => s.id);
    for (let i = ids.length - 1; i > 0; i--) { const j = (i * 7 + 3) % (i + 1); [ids[i], ids[j]] = [ids[j], ids[i]]; }
    S.cards4 = ids.map((id, i) => { const p = trayPos(L, i); return { id, x: p.x, y: p.y, tx: p.x, ty: p.y, cell: null, lift: 0, shake: 0, bad: false, ok: false }; });
    S.d4 = null; S.sel4 = null; S.checked4 = false;
  }
  function relayout4() {
    const L = lay4(); let ti = 0;
    S.cards4.forEach((c) => { if (c.cell) { const r = cellRect(L, c.cell[0], c.cell[1]); c.tx = r.x + r.w / 2; c.ty = r.y + r.h / 2; } else { const p = trayPos(L, ti++); c.tx = p.x; c.ty = p.y; } });
  }
  function cardAt4(p) { for (let i = S.cards4.length - 1; i >= 0; i--) { const c = S.cards4[i], L = lay4(); if (Math.abs(p.x - c.x) <= L.card.w / 2 && Math.abs(p.y - c.y) <= L.card.h / 2) return c; } return null; }
  function cellAt4(p) { const L = lay4(); for (let r = 0; r < 3; r++) for (let c = 0; c < 7; c++) { const q = cellRect(L, c, r); if (p.x >= q.x && p.x <= q.x + q.w && p.y >= q.y && p.y <= q.y + q.h) return [c, r]; } return null; }
  function place4(card, cell) {
    if (cell) { const old = S.cards4.find((c) => c !== card && c.cell && c.cell[0] === cell[0] && c.cell[1] === cell[1]); if (old) old.cell = null; }
    card.cell = cell; card.bad = false; card.ok = false; S.checked4 = false; relayout4();
  }
  const correct4 = (c) => { const s = BY8[c.id]; return c.cell && ORDER7[c.cell[0]] === classOf(s.T) && ROWS4[c.cell[1]].k === s.row; };
  function drawBoard(t, dt) {
    const L = lay4();
    ctx.fillStyle = '#0b1230'; ctx.fillRect(0, 0, VW, VH);
    panel(L.x, L.y, L.bw, L.bh, { fill: 'rgba(255,255,255,.96)' });
    // 열 머리글
    ORDER7.forEach((k, ci) => { const r = cellRect(L, ci, 0), c = CLS[k]; ctx.fillStyle = rgba(c.col, 0.5); rr(r.x + 2, L.y + 4, r.w - 4, L.hh - 6, 8).fill(); D.text(r.x + r.w / 2, L.y + (PHONE ? 30 : 24), k, { size: 18, weight: 800, color: shade(c.col, k === 'A' || k === 'F' ? -0.6 : -0.35) }); if (!PHONE) D.text(r.x + r.w / 2, L.y + L.hh - 10, RANGE4[k], { size: 12, weight: 700, color: '#475569' }); });
    D.text(L.x + L.lx / 2, L.y + (PHONE ? 28 : 24), '분광형', { size: 13, weight: 800, color: '#334155' }); D.text(L.x + L.lx / 2, L.y + L.hh - 10, PHONE ? '고온→저온' : '고온 → 저온 (K)', { size: 11.5, weight: 700, color: '#64748b' });
    ROWS4.forEach((row, ri) => { const y = L.y + L.hh + ri * L.rh; ctx.fillStyle = ri % 2 ? 'rgba(241,245,249,.9)' : 'rgba(248,250,252,.9)'; ctx.fillRect(L.x + 4, y, L.bw - 8, L.rh); D.text(L.x + 12, y + L.rh / 2 + 5, PHONE ? row.k : row.name, { size: PHONE ? 16 : 14.5, weight: 800, color: '#0f172a', align: 'left' }); if (PHONE) D.text(L.x + 12, y + L.rh / 2 + 24, row.k === 'I' ? '초거성' : row.k === 'III' ? '거성' : '주계열', { size: 11.5, weight: 700, color: '#475569', align: 'left' }); });
    for (let r = 0; r < 3; r++) for (let c = 0; c < 7; c++) { const q = cellRect(L, c, r), hv = S.d4 && S.d4.hover && S.d4.hover[0] === c && S.d4.hover[1] === r; ctx.strokeStyle = hv ? '#0ea5e9' : 'rgba(148,163,184,.5)'; ctx.lineWidth = hv ? 3 : 1; ctx.setLineDash(hv ? [] : [4, 4]); rr(q.x + 2, q.y + 3, q.w - 4, q.h - 6, 8).stroke(); ctx.setLineDash([]); if (hv) { ctx.fillStyle = 'rgba(14,165,233,.12)'; rr(q.x + 2, q.y + 3, q.w - 4, q.h - 6, 8).fill(); } }
    // 카드 보관함
    const T = L.tray; D.text(T.x + 12, T.y + 18, '별 카드 (끌어서 칸에 놓아요)', { size: 14, weight: 800, color: '#cbd5e1', align: 'left' });
    // 카드
    const dragC = S.d4 && S.d4.c;
    S.cards4.forEach((c) => { if (c !== dragC) { c.x = approach(c.x, c.tx, dt, 16); c.y = approach(c.y, c.ty, dt, 16); } c.lift = approach(c.lift, c === dragC ? 1 : 0, dt, 18); if (c.shake > 0) c.shake = Math.max(0, c.shake - dt); });
    const drawCard = (c) => {
      const s = BY8[c.id], w = L.card.w, h = L.card.h, lift = c.lift, sh = c.shake > 0 ? Math.sin(c.shake * 40) * 5 * c.shake * 4 : 0, cx = c.x + sh, cy = c.y - lift * 6, sel = S.sel4 === c.id;
      D.shadow(() => { ctx.fillStyle = '#fff'; rr(cx - w / 2, cy - h / 2, w, h, 9).fill(); }, { blur: 4 + lift * 10, y: 2 + lift * 6 });
      ctx.strokeStyle = c.bad ? '#dc2626' : c.ok ? '#16a34a' : sel ? '#0ea5e9' : 'rgba(100,116,139,.6)'; ctx.lineWidth = c.bad || c.ok || sel ? 3 : 1.5; rr(cx - w / 2, cy - h / 2, w, h, 9).stroke();
      const col = starColor(s.T); D.sphere(cx - w / 2 + 12, cy - h / 2 + 13, 6, col, { gloss: false });
      D.text(cx - w / 2 + 22, cy - h / 2 + 18, PHONE ? s.short : s.name, { size: PHONE ? 11.5 : 12.5, weight: 800, color: '#0f172a', align: 'left' });
      if (!PHONE) {
        D.text(cx - w / 2 + 8, cy - h / 2 + 36, comma(s.T) + ' K', { size: 12, weight: 700, color: '#334155', align: 'left' });
        D.text(cx - w / 2 + 8, cy - h / 2 + 52, s.L + ' L☉', { size: 12, weight: 700, color: '#334155', align: 'left' });
        const cv = specCanvas(s.T, s.row === 'V' ? 'V' : s.row, 80, 1); ctx.save(); rr(cx - w / 2 + 6, cy + h / 2 - 17, w - 12, 10, 3).clip(); ctx.imageSmoothingEnabled = false; ctx.drawImage(cv, 0, 0, cv.width, 1, cx - w / 2 + 6, cy + h / 2 - 17, w - 12, 10); ctx.restore();
      } else {
        D.text(cx, cy + 6, comma(s.T), { size: 11.5, weight: 700, color: '#334155' });
        D.text(cx, cy + 22, s.L, { size: 10.5, weight: 700, color: '#64748b' });
      }
    };
    S.cards4.filter((c) => c !== dragC).forEach(drawCard); if (dragC) drawCard(dragC);
    // 선택한 카드 정보
    const sc = S.sel4 && BY8[S.sel4];
    const iy = L.tray.y + (PHONE ? 30 : 32) + L.card.h + 30;
    if (sc) { drawWrap(VW / 2, iy, sc.name + ': 표면 온도 ' + comma(sc.T) + ' K · 광도 ' + sc.L + ' L☉ · 흡수선 ' + sc.wd, VW - 40, PHONE ? 13 : 13.5, { color: '#fde68a', weight: 800 }); }
    else D.text(VW / 2, iy, '카드를 누르면 자세한 자료가 보여요', { size: 13, weight: 700, color: '#94a3b8' });
    drawWrap(VW / 2, iy + (PHONE ? 52 : 46), '표면 온도로 열(분광형)을, 광도와 흡수선 폭으로 줄(광도 계급)을 정해요. 광도가 아주 크고 흡수선이 좁으면 초거성이에요.', VW - 60, PHONE ? 12.5 : 13, { color: '#94a3b8', weight: 700 });
  }

  /* ======================================================
     조작 · 포인터
     ====================================================== */
  initStage('#0b1230', 800, 560, 520, 760, 1.2);
  const $sT = $('#sT'), $oT = $('#oT');
  const tFromV = (v) => TMIN * Math.pow(TMAX / TMIN, v / 1000), vFromT = (T) => 1000 * Math.log(T / TMIN) / Math.log(TMAX / TMIN);
  function setView(v) {
    S.view = v;
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.view === v));
    updateCtl();
  }
  function updateCtl() {
    const free = game && game.free;
    $('#modeSeg').hidden = !free;
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !c.dataset.modes.split(' ').includes(S.view); });
    $('#pickBox').hidden = !(S.view === 'sort' && S.pickOn);
    $('#unkBox').hidden = !(S.view === 'temp' && (S.showUnk || free));
    $$('#starSeg .opt').forEach((b) => { b.classList.toggle('on', b.dataset.k === S.star); b.classList.toggle('seen', !!S.seen[b.dataset.k]); });
    $$('#pickSeg .opt').forEach((b) => b.classList.toggle('on', b.dataset.k === S.pick.mode));
    $('#sortNote').textContent = S.pickOn ? '카드의 분광형 글자가 가려져 있어요. 선 패턴으로 찾아요.' : '카드를 위아래로 끌어서 순서를 바꿔요.';
    $('#tbLabel').textContent = S.view === 'obs' ? '🌈 별빛 분해' : S.view === 'sort' ? '🔤 분광형 순서' : S.view === 'temp' ? '🌡️ 온도와 흡수선' : '🗂️ 별 분류판';
  }
  $$('#modeSeg button').forEach((b) => clickable(b, () => { setView(b.dataset.view); enterScene(b.dataset.view); }));

  /* ---- ① ---- */
  let revTw = null, rayTw = null;
  function selectStar(id) {
    if (!BY6[id]) return;
    S.star = id; S.rev = 0; S.rayT = 0;
    if (revTw) revTw.cancel(); if (rayTw) rayTw.cancel();
    rayTw = SciSim.tween(S, { rayT: 1 }, { duration: 0.9, ease: 'outCubic' });
    revTw = SciSim.tween(S, { rev: 1 }, { duration: 1.5, delay: 0.7, ease: 'inOutQuad', onDone: () => { S.seen[id] = true; updateCtl(); } });
    updateCtl();
  }
  $$('#starSeg .opt').forEach((b) => clickable(b, () => selectStar(b.dataset.k)));

  /* ---- ② ---- */
  clickable($('#bShuffle'), () => { initSort(true); });
  $$('#pickSeg .opt').forEach((b) => clickable(b, () => { S.pick.mode = b.dataset.k; updateCtl(); }));

  /* ---- ③ ---- */
  bindSlider($sT, $oT, (v) => comma(Math.round(tFromV(v) / 10) * 10) + ' K', (v) => { S.T = tFromV(v); });
  $$('#presetSeg .opt').forEach((b) => clickable(b, () => { S.T = +b.dataset.t; setSlider($sT, $oT, Math.round(vFromT(S.T)), (v) => comma(Math.round(tFromV(v) / 10) * 10) + ' K'); }));
  $$('#unkBox select[data-i]').forEach((s) => s.addEventListener('change', () => { Sound.click(); S.ansU.cls[s.dataset.i] = s.value || undefined; }));
  $$('#unkBox select[data-j]').forEach((s) => s.addEventListener('change', () => { Sound.click(); S.ansU.ord[s.dataset.j] = s.value || undefined; }));

  /* ---- ④ ---- */
  clickable($('#bReset4'), () => { initBoard(); });

  function enterScene(v) {
    if (v === 'obs') { selectStar(S.star); showHint('별을 눌러 스펙트럼을 비교해 봐요', 4500); }
    if (v === 'sort') { initSort(true); S.pickOn = false; showHint('카드를 끌어서 순서를 바꿔 봐요', 4500); }
    if (v === 'temp') { showHint('슬라이더로 온도를 바꿔 선의 변화를 봐요', 4500); }
    if (v === 'board') { initBoard(); showHint('별 카드를 끌어서 칸에 놓아요', 4500); }
    updateCtl();
  }

  /* ---------- 포인터 ---------- */
  let ptr = null;
  SciSim.pointer(view, {
    down(p) {
      if (S.view === 'obs') {
        for (const st of STARS6) { const r = st._r; if (r && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) { Sound.click(); selectStar(st.id); return false; } }
        return false;
      }
      if (S.view === 'sort') {
        const L = layS();
        if (p.x < L.rows.x || p.x > L.rows.x + L.rows.w || p.y < L.y0 || p.y > L.y0 + 7 * L.rh) return false;
        const idx = Math.floor((p.y - L.y0) / L.rh), id = S.order[clamp(idx, 0, 6)];
        if (S.pickOn) {
          S.pick[S.pick.mode] = id; Sound.click(); updateCtl();
          const want = S.pick.mode; if (id !== want) say('이 카드는 ' + want + '형이 아니에요. ' + (want === 'B' ? '헬륨선이 보이는 뜨거운 별을 찾아요.' : '금속선이 강하고 붉은 영역이 어두운 별을 찾아요.'), true, 2.6); else say(want + '형 카드를 찾았어요!', false, 1.6);
          return false;
        }
        S.drag = { id, dy: p.y - S.rowY[id] }; Sound.tick(); return true;
      }
      if (S.view === 'temp') {
        const L = layT(), G = L.gr;
        if (p.x >= G.x && p.x <= G.x + G.w && p.y >= G.y + 30 && p.y <= G.y + G.h - 30) { ptr = { g: true }; setTFromX(p.x); return true; }
        return false;
      }
      if (S.view === 'board') {
        const c = cardAt4(p), L = lay4();
        if (c) { S.d4 = { c, ox: p.x - c.x, oy: p.y - c.y, sx: p.x, sy: p.y, moved: false, hover: null }; S.cards4.splice(S.cards4.indexOf(c), 1); S.cards4.push(c); Sound.click(); return true; }
        const cell = cellAt4(p);
        if (cell && S.sel4) { const sc = S.cards4.find((q) => q.id === S.sel4); if (sc) { place4(sc, cell); S.sel4 = null; Sound.click(); } }
        return false;
      }
      return false;
    },
    move(p) {
      if (S.view === 'sort' && S.drag) {
        const L = layS(); S.rowY[S.drag.id] = clamp(p.y - S.drag.dy, L.y0 - 6, L.y0 + 6 * L.rh + 6);
        const want = clamp(Math.round((S.rowY[S.drag.id] - L.y0) / L.rh), 0, 6), cur = S.order.indexOf(S.drag.id);
        if (want !== cur) { S.order.splice(cur, 1); S.order.splice(want, 0, S.drag.id); Sound.tick(); }
      } else if (S.view === 'temp' && ptr && ptr.g) setTFromX(p.x);
      else if (S.view === 'board' && S.d4) {
        const c = S.d4.c; c.x = p.x - S.d4.ox; c.y = p.y - S.d4.oy; if (Math.hypot(p.x - S.d4.sx, p.y - S.d4.sy) > 8) S.d4.moved = true; S.d4.hover = cellAt4(p);
      }
    },
    up(p) {
      if (S.view === 'sort') { S.drag = null; }
      else if (S.view === 'temp') ptr = null;
      else if (S.view === 'board' && S.d4) {
        const d = S.d4, c = d.c; S.d4 = null;
        if (!d.moved) { S.sel4 = S.sel4 === c.id ? null : c.id; relayout4(); return; }
        const cell = cellAt4(p); place4(c, cell); S.sel4 = null; Sound.click();
        if (cell) { const r = cellRect(lay4(), cell[0], cell[1]); parts.burst(r.x + r.w / 2, r.y + r.h / 2, { count: 8, speed: 70, life: 0.5, size: 3, colors: ['#38bdf8', '#a5b4fc'] }); }
      }
    },
    hover(p) {
      if (S.view === 'obs') return STARS6.some((st) => st._r && p.x >= st._r.x && p.x <= st._r.x + st._r.w && p.y >= st._r.y && p.y <= st._r.y + st._r.h) ? 'pointer' : 'default';
      if (S.view === 'sort') return S.pickOn ? 'pointer' : 'grab';
      if (S.view === 'board') return cardAt4(p) ? 'grab' : 'default';
      return 'default';
    },
  });
  function setTFromX(x) {
    const L = layT(), G = L.gr, px0 = G.x + 44, px1 = G.x + G.w - 14, f = clamp((x - px0) / (px1 - px0), 0, 1);
    S.T = TMIN * Math.pow(TMAX / TMIN, f); setSlider($sT, $oT, Math.round(f * 1000), (v) => comma(Math.round(tFromV(v) / 10) * 10) + ' K');
  }

  /* ======================================================
     단계(STEP)와 미션
     ====================================================== */
  const tb = (rows) => '<table class="mini">' + rows.map((r, i) => '<tr>' + r.map((c) => (i === 0 ? '<th>' : '<td>') + c + (i === 0 ? '</th>' : '</td>')).join('') + '</tr>').join('') + '</table>';
  function enterLevel(li) {
    clearTimeout(hintTimer);
    S.pickOn = false; S.showUnk = false;
    if (li === 0) { S.seen = {}; setView('obs'); selectStar('sun'); S.seen = {}; showHint('별을 눌러 스펙트럼을 비교해 봐요', 6000); }
    else if (li === 1) { initSort(true); setView('sort'); showHint('카드를 끌어서 순서를 바꿔 봐요', 6000); }
    else if (li === 2) { S.T = 9000; S.Tv = 9000; setSlider($sT, $oT, Math.round(vFromT(9000)), (v) => comma(Math.round(tFromV(v) / 10) * 10) + ' K'); setView('temp'); showHint('슬라이더로 온도를 바꿔 선의 변화를 봐요', 6000); }
    else { initBoard(); setView('board'); showHint('별 카드를 끌어서 칸에 놓아요', 6000); }
    updateCtl();
  }
  const levels = [
    {
      title: '별빛 분해: 연속 스펙트럼과 흡수선', short: '별빛 분해', icon: '🌈', phase: '관찰', features: ['obs'],
      intro: '<p class="si-q">❓ 탐구 질문: 수십 광년 떨어진 별의 온도를 어떻게 알 수 있을까? 별에는 왜 종류가 있을까?</p>' +
        '<div class="si-link">🔗 <b>통합과학에서</b> 빛을 프리즘으로 나누면 연속 스펙트럼이 되고, 원소마다 흡수선의 위치가 달라 별의 성분을 알 수 있다고 배웠어요. <b>중학교에서</b>는 별의 색이 표면 온도와 관계있다는 것도 배웠어요.</div>' +
        '<p>이번 차시에서는 별빛을 분광기(프리즘)로 나누어 <b>스펙트럼</b>을 관찰해요. 별빛은 모든 색이 이어진 <b>연속 스펙트럼</b> 위에 <b>어두운 흡수선</b>이 나타나는 모양이에요. 별마다 밝은 색 영역과 흡수선의 패턴이 달라서, 이것으로 별을 분류해요.</p>',
      setup() { enterLevel(0); },
      recap: '별빛의 스펙트럼은 연속 스펙트럼 위에 어두운 흡수선이 있는 모양이에요. 별마다 밝은 색 영역과 흡수선의 패턴이 달라요. 흡수선은 별 대기의 성분과 온도를 알려 줘요.',
      summary: '<ul><li>별빛을 분광기로 나누면 <b>연속 스펙트럼</b> 위에 <b>흡수선</b>(어두운 선)이 나타나요.</li><li>뜨거운 별은 파란 쪽, 차가운 별은 붉은 쪽의 색이 밝아요. 리겔(약 12100 K)은 청백색, 태양(약 5800 K)은 황색, 프록시마(약 3000 K)는 적색이에요.</li><li>흡수선은 별 안쪽에서 나온 빛이 <b>별의 바깥 대기</b>를 지나며 원소가 특정 파장의 빛을 흡수해서 생겨요. 흡수선으로 대기의 <b>성분과 온도</b>를 알 수 있어요.</li></ul>',
      missions: [
        {
          title: '여섯 별의 스펙트럼 살펴보기',
          goal: '리겔, 시리우스 A, 태양, 아르크투루스, 베텔게우스, 프록시마를 <b>모두 눌러서</b> 스펙트럼의 밝은 색 영역과 어두운 선을 비교해 봐요.',
          hint: '별 카드(또는 별 고르기 버튼)를 누르면 프리즘으로 빛이 나뉘고 흡수선이 하나씩 어두워져요. 선이 다 나타날 때까지 기다리면 ✓가 붙어요.',
          hold: 0.5, setup() { setView('obs'); },
          status: () => '본 별 ' + STARS6.filter((s) => S.seen[s.id]).length + ' / 6 ' + mark(STARS6.every((s) => S.seen[s.id])),
          check: () => STARS6.every((s) => S.seen[s.id]),
          explain: '뜨거운 별(리겔)은 파란 쪽이, 차가운 별(베텔게우스·프록시마)은 붉은 쪽이 더 밝아요. 흡수선의 모양도 달라요. 리겔에는 수소선과 헬륨선, 태양에는 칼슘 H·K선과 금속선이 많고, 베텔게우스와 프록시마에서는 붉은 쪽에 넓은 어두운 띠(TiO)가 보여요.',
        },
        {
          type: 'quiz', title: '흡수선이 알려 주는 것', goal: '스펙트럼의 어두운 흡수선은 어떻게 생기고, 무엇을 알려 줄까요?', setup() { setView('obs'); },
          choices: ['별 안쪽에서 나온 연속 스펙트럼의 빛이 더 차가운 바깥 대기를 지날 때 원소가 특정 파장을 흡수해서 생겨요. 별 대기의 성분과 온도를 알려 줘요', '별이 특정 파장의 빛만 내기 때문에 어두운 선이 생겨요. 별의 나이를 알려 줘요', '지구 대기가 별빛을 흡수해서 생겨요. 별의 성분과는 상관없어요', '별 표면이 어두운 부분이라 생겨요. 별의 크기를 알려 줘요'],
          answer: 0,
          feedback: ['', '별은 거의 모든 파장의 빛을 내요(연속 스펙트럼). 어두운 선은 빛이 빠진 곳이에요.', '지구 대기의 흡수선은 따로 있지만, 별마다 다른 흡수선 패턴은 별 대기에서 생겨요.', '별 전체의 평균 빛에서 특정 파장이 부족해진 것이므로, 어두운 부분이 아니라 원소의 흡수 때문이에요.'],
          explain: '별의 뜨거운 안쪽에서 나온 빛은 연속 스펙트럼이에요. 이 빛이 더 차가운 <b>별의 바깥 대기</b>를 지날 때 각 원소(원자)가 자신만의 파장의 빛을 흡수해 <b>흡수선</b>이 생겨요. 선의 위치는 원소를, 선의 세기는 대기의 온도를 알려 줘요.',
        },
      ],
    },
    {
      title: '분광형: 온도 순서로 늘어놓기', short: '분광형', icon: '🔤', phase: '탐구', features: ['sort'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 별마다 밝은 색 영역과 흡수선 패턴이 다르다는 것을 확인했어요. 이 패턴으로 별을 <b>O, B, A, F, G, K, M</b> 일곱 <b>분광형</b>으로 나눠요. 표면 온도가 높은 쪽(O)에서 낮은 쪽(M) 순서예요.</div>' +
        '<p>분광형별 색: O 청색 · B 청백색 · A 백색 · F 황백색 · G 황색 · K 주황색 · M 적색. 분광형 안에서 숫자 0~9로 더 나누고, 숫자가 작을수록 뜨거워요(태양은 G2).</p>' +
        '<p>스펙트럼 카드 7장을 직접 늘어놓고, 오른쪽 표에서 분광형마다 어떤 선이 강한지 비교해 봐요. (대표 선: He II, He I, 수소 발머선, Ca II H·K선, 금속선, TiO 띠)</p>',
      setup() { enterLevel(1); },
      recap: '분광형은 표면 온도가 높은 순서로 O, B, A, F, G, K, M이에요. 강한 선은 O: He II, B: He I, A: 수소 발머선, F·G: Ca II·금속선, K: 중성 금속선, M: TiO 띠예요.',
      summary: tb([['분광형', '표면 온도(K)', '색', '대표 선'], ['O', '30000 이상', '청색', 'He II(이온화 헬륨)'], ['B', '10000~30000', '청백색', 'He I(헬륨)'], ['A', '7500~10000', '백색', '수소 발머선(가장 강함)'], ['F', '6000~7500', '황백색', 'Ca II H·K, 금속선'], ['G', '5200~6000', '황색', 'Ca II H·K, 금속선'], ['K', '3700~5200', '주황색', '중성 금속선, 분자선 시작'], ['M', '2400~3700', '적색', 'TiO 분자 띠']]) + '<ul><li>선의 세기는 원소가 얼마나 많은지가 아니라 <b>온도</b>에 따라 정해져요.</li><li>대표 별: 태양 G2, 시리우스 A A1, 베가 A0, 아르크투루스 K1.5, 베텔게우스 M2, 프록시마 M5.5.</li></ul>',
      missions: [
        {
          title: '스펙트럼 카드를 O → M 순서로', manual: true,
          goal: '스펙트럼 카드 7장을 <b>끌어서</b> 표면 온도가 높은 별(맨 위)부터 낮은 별(맨 아래) 순서로 놓고 <b>✔ 확인하기</b>를 눌러요.',
          hint: '뜨거운 별은 파란색 쪽이 밝고 차가운 별은 붉은색 쪽이 밝아요. 오른쪽 표에서 어떤 선이 어디서 강한지 보고, 선 패턴도 비교해 봐요.',
          setup() { initSort(true); S.pickOn = false; setView('sort'); updateCtl(); },
          status: () => (sortedOK() ? '순서가 맞아요 ✅' : '카드를 끌어서 정리해 봐요'),
          check: () => { if (sortedOK()) return true; const bad = S.order.filter((id, i) => id !== ORDER7[i]).length; return bad + '장이 제자리가 아니에요. 색(파랑 → 빨강)이 이어지는지, 표의 대표 선이 맞는지 살펴봐요.'; },
          explain: '표면 온도가 높을수록 파란 쪽이 밝고, 낮을수록 붉은 쪽이 밝아요. 그래서 O → B → A → F → G → K → M 순서로 스펙트럼의 밝은 영역이 파랑에서 빨강으로 옮겨 가고, 강한 흡수선도 He II → He I → 수소 → Ca II·금속 → TiO 순서로 바뀌어요.',
        },
        {
          title: 'B형과 K형 카드 찾기',
          goal: '카드가 다시 섞이고 분광형 글자가 가려졌어요. <b>B형</b>(헬륨선이 보이는 뜨거운 별)과 <b>K형</b>(금속선이 강하고 붉은 쪽이 어두운 별)을 찾아 눌러요.',
          hint: 'B형은 He I 선(447, 588 nm 등)이 강하고 푸른색이 밝아요. K형은 Ca II·금속선이 강하고 붉은 쪽에 TiO 띠가 막 나타나기 시작해요. 표를 참고해요.',
          hold: 0.4, setup() { initSort(true); S.pickOn = true; S.pick = { mode: 'B', B: null, K: null }; setView('sort'); updateCtl(); },
          status: () => 'B형 ' + mark(S.pick.B === 'B') + ' · K형 ' + mark(S.pick.K === 'K'),
          check: () => S.pick.B === 'B' && S.pick.K === 'K',
          explain: 'B형(약 10000~30000 K)에서는 <b>중성 헬륨선(He I)</b>이 가장 강하고 수소선도 보여요. K형(약 3700~5200 K)에서는 <b>중성 금속선</b>이 강하고, 붉은 쪽에는 TiO 분자 띠가 나타나기 시작해요.',
        },
        {
          type: 'quiz', title: 'M형에서 발머선이 약한 까닭', goal: '우주에서 가장 많은 원소는 수소인데, M형 별의 스펙트럼에서는 수소 발머선이 약해요. 그 까닭은 무엇일까요?', setup() { S.pickOn = false; setView('sort'); updateCtl(); },
          choices: ['표면 온도가 낮아서 발머선을 만드는 상태(전자가 둘째 준위에 있는 수소)의 원자가 거의 없기 때문이에요', 'M형 별에는 수소가 거의 들어 있지 않기 때문이에요', '발머선은 철 원자가 만드는 선이기 때문이에요', 'M형 별은 너무 어두워서 흡수선이 보이지 않기 때문이에요'],
          answer: 0,
          feedback: ['', '별의 대부분은 수소예요. M형에서도 가장 많은 원소는 수소랍니다. “강한 선 = 많이 든 원소”는 오개념이에요.', '발머선은 수소의 선이에요. 수소 원자의 전자가 둘째 준위에서 위로 올라갈 때 흡수하는 빛이에요.', 'M형에서도 스펙트럼을 얻을 수 있어요. 오히려 TiO 띠 같은 다른 선이 뚜렷해요.'],
          explain: '선의 세기는 원소의 양이 아니라 <b>온도에 따라 그 선을 만드는 상태의 원자가 얼마나 있는지</b>로 정해져요. 발머선은 전자가 둘째 준위에 있는 수소가 흡수하는 선인데, 온도가 낮은 M형에서는 그런 수소 원자가 거의 없어서 약해요. 대신 M형에서는 분자(TiO)가 잘 만들어져 TiO 띠가 두드러져요.',
        },
      ],
    },
    {
      title: '온도와 흡수선: 봉우리 모양', short: '온도와 흡수선', icon: '🌡️', phase: '분석', features: ['temp'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 분광형마다 강한 선이 다르다는 것을 확인했어요. 왜 그럴까요?</div>' +
        '<p>선의 세기는 <b>온도에 따라</b> 그 선을 만들 수 있는 상태의 원자가 얼마나 있는지로 정해져요. 발머선은 전자가 둘째 준위에 있는 수소가 만드는데, 온도가 너무 낮으면 그런 수소가 적고, 너무 높으면 수소가 이온화되어 발머선이 약해져요. 그래서 선의 세기는 어느 온도에서 <b>최대</b>가 되는 <b>봉우리 모양</b>이에요. (사하 방정식 계산은 하지 않아요.)</p>' +
        '<p>온도 슬라이더로 스펙트럼과 선의 세기를 함께 살펴봐요.</p>',
      setup() { enterLevel(2); },
      recap: '각 선의 세기는 온도에 대해 봉우리 모양이에요. 수소 발머선은 약 10000 K(A형)에서 가장 강하고, 더 뜨겁거나 차가우면 약해져요. 선 패턴으로 별의 분광형과 표면 온도를 알 수 있어요.',
      summary: '<ul><li>선의 세기는 온도에 대해 <b>봉우리 모양</b>: He II 약 40000 K, He I 약 20000 K, 수소 발머선 약 10000 K, Ca II H·K선 약 5000 K, 중성 금속선 약 4500 K에서 최대예요. TiO 띠는 약 3700 K보다 낮을 때 강해져요.</li><li>발머선이 같은 세기로 보이는 온도는 최대의 양쪽에 <b>두 개</b>씩 있어서, 한 선만으로는 온도를 정할 수 없고 여러 선의 패턴을 함께 봐야 해요.</li><li>발머선이 강하다고 해서 수소가 더 많은 것은 아니에요.</li></ul>',
      missions: [
        {
          title: '발머선이 가장 강한 온도 찾기',
          goal: '온도 슬라이더로 <b>수소 발머선의 세기가 90 % 이상</b>이 되는 온도를 찾아요. (그래프를 직접 끌어도 돼요.)',
          hint: '그래프에서 빨간 곡선(수소 발머선)의 꼭대기를 찾아요. 약 10000 K 근처예요.',
          hold: 0.7, setup() { S.showUnk = false; setView('temp'); updateCtl(); },
          status: () => '발머선 세기 ' + f0(STR.H(S.T) * 100) + ' % ' + mark(STR.H(S.T) >= 0.9),
          check: () => STR.H(S.T) >= 0.9,
          explain: '수소 발머선은 약 <b>10000 K</b>(A형)에서 가장 강해요. 이보다 차가우면 둘째 준위의 수소 원자가 부족하고, 이보다 뜨거우면 수소가 이온화되어 발머선 흡수가 약해져요.',
        },
        {
          title: '미지의 별 A·B·C 판정', manual: true,
          goal: '스펙트럼 세 장을 보고 <b>분광형</b>을 정하고, 표면 온도가 <b>높은 순서</b>로 A·B·C를 나열해요.',
          hint: '별 A는 수소 발머선이 아주 강해요. 별 B는 Ca II H·K선과 금속선이 강해요. 별 C는 붉은 쪽에 TiO 띠가 있어요. 슬라이더를 움직여 보며 비교해 봐요.',
          setup() { S.showUnk = true; S.ansU = { cls: [], ord: [] }; $$('#unkBox select').forEach((s) => (s.value = '')); setView('temp'); updateCtl(); },
          status: () => '분광형 ' + S.ansU.cls.filter(Boolean).length + ' / 3 · 순서 ' + S.ansU.ord.filter(Boolean).length + ' / 3',
          check: () => {
            if (S.ansU.cls.filter(Boolean).length < 3 || S.ansU.ord.filter(Boolean).length < 3) return '세 별의 분광형과 온도 순서를 모두 골라 주세요.';
            const badC = UNK.filter((u, i) => !u.ans.includes(S.ansU.cls[i]));
            if (badC.length) return '별 ' + badC[0].id + josa('' + badC[0].id, '의/의') + ' 분광형을 다시 생각해 봐요.' + (badC[0].id === 'A' ? ' 발머선이 가장 강한 형은?' : badC[0].id === 'B' ? ' Ca II H·K선과 금속선이 강한 분광형은 F·G예요.' : ' TiO 띠가 두드러지는 분광형은?');
            if (S.ansU.ord.join('') !== 'ABC') return '온도 순서가 달라요. 분광형 순서(O → M)를 떠올려 봐요.';
            return true;
          },
          explain: '별 A는 발머선이 가장 강한 <b>A형</b>(약 9800 K), 별 B는 Ca II H·K선과 금속선이 강한 <b>G형</b>(약 5700 K), 별 C는 TiO 띠가 보이는 <b>M형</b>(약 3300 K)이에요. 온도 순서는 A > B > C예요.',
        },
        {
          type: 'quiz', title: '같은 세기로 보이는 두 온도', goal: '발머선이 같은 세기로 보이는 온도가 최대의 양쪽에 하나씩, 모두 두 개 있어요. 그 까닭은 무엇일까요?', setup() { S.showUnk = false; setView('temp'); updateCtl(); },
          choices: ['선의 세기가 온도에 대해 봉우리 모양이라서, 최대보다 낮은 쪽(둘째 준위 수소 부족)과 높은 쪽(수소 이온화) 모두 세기가 줄어들기 때문이에요', '온도가 높아질수록 선이 계속 강해지기 때문이에요', '온도가 높아질수록 선이 계속 약해지기 때문이에요', '관측할 때 지구 대기가 영향을 주기 때문이에요'],
          answer: 0,
          feedback: ['', '발머선은 약 10000 K까지는 강해지지만 그보다 뜨거워지면 약해져요. 곡선의 모양을 다시 봐요.', '낮은 온도에서는 오히려 선이 약해요. 곡선 전체를 보면 봉우리가 있어요.', '이 곡선은 별 대기의 상태에 따른 변화예요. 지구 대기는 관련이 없어요.'],
          explain: '발머선은 약 10000 K에서 가장 강하고, 낮은 쪽에서는 둘째 준위의 수소가 부족해서, 높은 쪽에서는 수소가 이온화되어 약해져요. 그래서 같은 세기가 <b>두 온도</b>에서 나타나요. 한 가지 선만으로는 온도를 정할 수 없고, 여러 선을 함께 봐야 해요.',
        },
      ],
    },
    {
      title: '별의 분류: 분광형과 광도 계급', short: '별의 분류', icon: '🗂️', phase: '적용', features: ['board'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 흡수선 패턴으로 별의 분광형(표면 온도)을 알 수 있다는 것을 배웠어요. 그런데 같은 분광형이어도 크기가 아주 다른 별이 있어요.</div>' +
        '<p>큰 별(거성·초거성)은 대기 압력이 낮아서 흡수선이 <b>좁고</b>, 주계열성은 흡수선이 <b>넓어요</b>. 이를 나타낸 것이 <b>광도 계급</b>이에요: <b>I 초거성, III 거성, V 주계열성</b>. 분광형과 광도 계급을 함께 써서 별을 분류해요. 예) 태양 <b>G2 V</b>, 베텔게우스 <b>M2 I</b>.</p>' +
        '<p>분광형(가로)과 광도 계급(세로)으로 만든 판에 별 카드 8장을 놓아 봐요.</p>',
      setup() { enterLevel(3); },
      recap: '별은 분광형(표면 온도)과 광도 계급(흡수선 폭·크기)으로 분류해요. 예) 태양 G2 V, 시리우스 A A1 V, 아르크투루스 K1.5 III, 베텔게우스 M2 I. 같은 분광형이면 거성·초거성이 주계열성보다 흡수선이 좁고 더 밝아요.',
      summary: tb([['별', '분광형', '표면 온도(K)', '광도 계급'], ['리겔', 'B8', '12100', 'I 초거성'], ['시리우스 A', 'A1', '9900', 'V 주계열성'], ['베가', 'A0', '9600', 'V'], ['프로키온 A', 'F5', '6500', 'IV-V'], ['태양', 'G2', '5800', 'V'], ['아르크투루스', 'K1.5', '4300', 'III 거성'], ['베텔게우스', 'M2', '3500', 'I 초거성'], ['프록시마', 'M5.5', '3000', 'V']]) + '<ul><li>분광형 표기 = 분광형 문자 + 숫자(0~9, 작을수록 뜨거움) + 광도 계급. 예) <b>G2 V</b></li><li>같은 분광형에서 광도 계급 I·III은 흡수선이 좁고 V는 넓어요.</li></ul>',
      missions: [
        {
          title: '별 카드 8장 분류하기', manual: true,
          goal: '별 카드 8장을 <b>분광형(가로)</b>과 <b>광도 계급(세로)</b>에 맞는 칸에 놓고 <b>✔ 확인하기</b>를 눌러요.',
          hint: '표면 온도로 열을 정해요(O 30000 K 이상, B 1만~3만, A 7500~1만, F 6000~7500, G 5200~6000, K 3700~5200, M 3700 이하). 줄은 흡수선이 아주 좁고 광도가 매우 크면 I, 좁으면 III, 넓으면 V예요. IV-V는 V쪽에 놓아요.',
          setup() { initBoard(); setView('board'); updateCtl(); },
          status: () => '놓은 카드 ' + S.cards4.filter((c) => c.cell).length + ' / 8',
          check: () => {
            if (S.cards4.some((c) => !c.cell)) return '카드 8장을 모두 칸에 놓아 주세요.';
            const bad = S.cards4.filter((c) => !correct4(c));
            S.cards4.forEach((c) => { const ok = correct4(c); if (!ok && !c.bad) { c.bad = true; c.shake = 0.4; } if (ok && !c.ok) c.ok = true; });
            if (!bad.length) { S.checked4 = true; return true; }
            return bad.length + '장이 알맞은 칸이 아니에요 (빨간 테두리). 온도(열)와 광도·흡수선 폭(줄)을 다시 비교해 봐요.';
          },
          explain: '열은 <b>표면 온도</b>(분광형), 줄은 <b>광도 계급</b>이에요. 리겔 B8 I, 베텔게우스 M2 I은 초거성, 아르크투루스 K1.5 III은 거성이고, 시리우스 A A1 V, 베가 A0 V, 프로키온 F5 IV-V, 태양 G2 V, 프록시마 M5.5 V는 주계열성(또는 그에 가까운 별)이에요.',
        },
        {
          type: 'quiz', title: '‘G2 V’의 뜻', goal: '태양의 분광형 표기 <b>G2 V</b>는 무엇을 뜻할까요?', setup() { setView('board'); },
          choices: ['G형(표면 온도 약 5200~6000 K, 황색)에서 숫자 2는 G형 안의 세분(0이 가장 뜨겁고 9가 가장 차가움), V는 광도 계급이 주계열성이라는 뜻이에요', 'G는 지름, 2는 질량(태양의 2배), V는 밝기를 뜻해요', 'G는 거성, 2는 광도 계급, V는 분광형을 뜻해요', 'G는 별의 나이, 2는 반지름, V는 색을 뜻해요'],
          answer: 0,
          feedback: ['', '표기는 분광형(문자+숫자)과 광도 계급(로마 숫자) 순서예요. 질량이나 지름을 나타내는 것이 아니에요.', '거성은 로마 숫자 III이에요. G가 분광형, V가 광도 계급이에요.', '이 표기에는 나이가 들어 있지 않아요. 표면 온도와 광도 계급에 대한 정보예요.'],
          explain: '<b>G</b>는 분광형(표면 온도 5200~6000 K), <b>2</b>는 G형 안에서 0~9로 나눈 세분(숫자가 작을수록 뜨거워 태양은 G형 중 뜨거운 편), <b>V</b>는 광도 계급 주계열성이에요. 태양의 표면 온도는 약 5800 K예요.',
        },
        {
          type: 'quiz', title: '같은 K형인데 아르크투루스는 다른 까닭', goal: '아르크투루스(K1.5 III)는 K형 주계열성보다 흡수선이 좁고 훨씬 밝아요. 그 까닭은 무엇일까요?', setup() { setView('board'); },
          choices: ['거성은 반지름이 커서 대기 압력이 낮아 흡수선이 좁고, 표면적이 커서 같은 온도에서도 훨씬 많은 빛을 내기 때문이에요', '거성은 표면 온도가 주계열성보다 훨씬 높기 때문이에요', '거성은 스스로 빛을 내지 못해 흡수선만 보이기 때문이에요', '거성은 수소가 없어서 선이 좁아지기 때문이에요'],
          answer: 0,
          feedback: ['', '아르크투루스와 K형 주계열성은 표면 온도가 비슷해요(같은 K형). 차이는 크기에서 와요.', '거성도 스스로 핵융합으로 빛을 내요. 크기가 큰 것이 달라요.', '거성에도 수소가 있어요. 흡수선 폭은 대기 압력과 관련 있어요.'],
          explain: '거성(III)은 반지름이 커서 대기의 압력(밀도)이 낮고, 그래서 흡수선이 <b>좁아요</b>. 또 표면적이 커서 같은 온도에서도 더 많은 에너지를 내므로 <b>더 밝아요</b>(L = 4πR²σT⁴는 다음 차시에서 다뤄요).',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'he-spectral-type', mount: '#game', badge: '분광형 탐정', homeHref: '../../index.html#he',
    featureLabels: { obs: '🌈 프리즘 · 스펙트럼 · 별 카드', sort: '🔤 스펙트럼 카드 · 대표 선 표', temp: '🌡️ 온도 슬라이더 · 선의 세기 그래프', board: '🗂️ 분광형 × 광도 계급 분류판' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 루프 ---------- */
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    S.Tv = RM ? S.T : Math.exp(approach(Math.log(S.Tv), Math.log(S.T), dt, 10));
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    if (S.view === 'obs') drawObs(t, dt); else if (S.view === 'sort') drawSort(t, dt); else if (S.view === 'temp') drawTemp(t, dt); else drawBoard(t, dt);
    parts.update(dt); parts.draw(ctx);
    drawFlash(dt, PHONE ? 14 : 12);
    readouts();
  });

  function readouts() {
    const v = S.view;
    if (v === 'obs') { const s = BY6[S.star]; setReadouts(['고른 별', s.name, '표면 온도', comma(s.T) + ' K · ' + CLS[classOf(s.T)].cname, '관찰한 별', STARS6.filter((q) => S.seen[q.id]).length + ' / 6']); }
    else if (v === 'sort') setReadouts(['카드 순서', sortedOK() ? 'O → M (완료)' : '정리하는 중', '단계', S.pickOn ? 'B형·K형 찾기' : '정렬하기', '고른 카드', S.pickOn ? (S.pick.B ? 'B?' : '—') + ' / ' + (S.pick.K ? 'K?' : '—') : '—']);
    else if (v === 'temp') { const T = S.T; setReadouts(['표면 온도', fmtK(T), '분광형', classOf(T) + '형 (' + CLS[classOf(T)].cname + ')', '발머선 세기', f0(STR.H(T) * 100) + ' %']); }
    else { const n = S.cards4.filter((c) => c.cell).length, sc = S.sel4 && BY8[S.sel4]; setReadouts(['놓은 카드', n + ' / 8', '선택한 별', sc ? sc.name : '—', '확인', S.checked4 ? '모두 맞아요' : '확인 전']); }
  }

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, CLS, ORDER7, STR, UNK, STARS6, STARS8, BY8, get game() { return game; },
    classOf, selectStar, initSort, initBoard, place4, relayout4, setView, enterLevel, sortedOK, correct4, updateCtl, specCanvas, lay4, cellRect, layS, layT, cardAt4,
  };
})();
