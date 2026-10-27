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
     지구과학 Ⅲ. 태양계 천체와 별과 우주의 진화 - 허블-르메트르 법칙
     [12지구03-05] 허블-르메트르 법칙으로 우주의 팽창을 이해
     ① 관찰: 적색 편이로 후퇴 속도 구하기 (z = Δλ/λ0, v = cz)   ② 분석: 은하 8개의 거리-속도 그래프, 기울기 = 허블 상수
     ③ 계산: v = H₀d, 관측자를 바꿔도 같은 법칙   ④ 추론: 시간을 되감아 우주의 나이 t = 1/H₀ 구하기
     z ≪ 1 에서만 v = cz 를 써요(상대론적 식은 다루지 않아요). 은하 자료는 교육용 예시 값이에요.
     ========================================================= */
  initStage('#070d1f', 800, 560, 600, 840, 1.25);
  const TX = (x, y, s, size, color, align, weight) => D.text(x, y, s, { size: size || 14, color: color || '#e2e8f0', align: align || 'left', weight: weight || 700 });
  const TXD = (x, y, s, size, color, align, weight) => D.text(x, y, s, { size: size || 14, color: color || '#334155', align: align || 'left', weight: weight || 700 });
  const sqrt = Math.sqrt, log10 = Math.log10, pow = Math.pow, exp = Math.exp;
  const f0 = (x) => String(Math.round(x));
  const f1 = (x) => (Math.round(x * 10) / 10).toFixed(1);
  const sig = (x, n) => { if (!isFinite(x) || x === 0) return '0'; const v = +x.toPrecision(n); return String(v).indexOf('e') >= 0 ? v.toFixed(0) : String(v); };
  function parseNum(str) {
    let s = String(str).trim().replace(/,/g, '').replace(/\s+/g, '').replace(/(km\/s|km|Mpc|nm|억년|억|년)$/i, '');
    s = s.replace(/[×xX*]10\^?\(?(-?\d+)\)?/, 'e$1').replace('−', '-');
    if (/^-?[\d.]+\/[\d.]+$/.test(s)) { const p = s.split('/'); return +p[0] / +p[1]; }
    const m = /^-?(\d+\.?\d*|\.\d+)(e-?\d+)?$/i.exec(s);
    return m ? parseFloat(s) : NaN;
  }
  const mulberry = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const gauss = (x, mu, fwhm) => { const s = fwhm / 2.3548, d = (x - mu) / s; return exp(-0.5 * d * d); };
  const smoothS = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };

  /* ---------- 자료 (교육용 예시 값) ---------- */
  const CKM = 3.0e5;                 // 빛의 속력 (km/s)
  const H0 = 70;                     // 허블 상수 (km/s/Mpc)
  const L0 = 393.4;                  // Ca II K선의 실험실 파장 (nm)
  const MPC_KM = 3.086e19, YR_S = 3.156e7;
  const GAL3 = [{ nm: '은하 1', lam: 396.6 }, { nm: '은하 2', lam: 412.6 }, { nm: '은하 3', lam: 400.5 }];
  GAL3.forEach((g) => { g.z = (g.lam - L0) / L0; g.v = CKM * g.z; });
  const DV = [['A', 10, 720], ['B', 25, 1650], ['C', 50, 3600], ['D', 80, 5500], ['E', 120, 8700], ['F', 160, 11000], ['G', 200, 14300], ['H', 250, 17200]].map((a) => ({ k: a[0], d: a[1], v: a[2] }));
  const hubbleTime = (H) => MPC_KM / H / YR_S / 1e8;        // 억 년
  const AGE = { 50: hubbleTime(50), 70: hubbleTime(70), 100: hubbleTime(100) };
  const GC_AGE = 130;                // 가장 오래된 구상 성단 나이 (억 년)
  const PROB = [
    { t: '거리 → 속도', q: 'd = 150 Mpc', a: 150 * H0, unit: 'km/s', tol: 0.02, solve: 'v = H₀ d = 70 km/s/Mpc × 150 Mpc = <b>10500 km/s</b>' },
    { t: '속도 → 거리', q: 'v = 15000 km/s', a: 15000 / H0, unit: 'Mpc', tol: 0.03, solve: 'd = v / H₀ = 15000 km/s ÷ 70 km/s/Mpc ≈ <b>214 Mpc</b>' },
    { t: '은하 1의 거리', q: 'K선 396.6 nm', a: GAL3[0].v / H0, unit: 'Mpc', tol: 0.06, solve: 'z = (396.6 − 393.4) ÷ 393.4 = 0.0081, v = cz ≈ 2440 km/s, d = v / H₀ ≈ <b>35 Mpc</b>' },
    { t: '은하 2의 거리', q: 'K선 412.6 nm', a: GAL3[1].v / H0, unit: 'Mpc', tol: 0.045, solve: 'z = (412.6 − 393.4) ÷ 393.4 = 0.0488, v = cz ≈ 14600 km/s, d = v / H₀ ≈ <b>209 Mpc</b>' },
  ];
  /* 3단계 관측자 모형: 은하 14개 (평면 위의 위치, 단위 = 100 Mpc) */
  const QG = (() => { const r = mulberry(41), a = []; let guard = 0; while (a.length < 14 && guard++ < 4000) { const x = (r() * 2 - 1) * 1.15, y = (r() * 2 - 1) * 0.95; if (a.every((p) => Math.hypot(p[0] - x, p[1] - y) > 0.36)) a.push([x, y]); } return a; })();
  const AMAX = Math.max(...QG.map((p) => Math.max(...QG.map((q) => Math.hypot(p[0] - q[0], p[1] - q[1])))));

  /* ---------- 상태 ---------- */
  const S = {
    view: 'v1', fade: 0, clock: 0,
    gi: 0, lamC: 400, lamD: GAL3[0].lam, rec1: [false, false, false], seenG: {}, shiftT: 0,
    pk: 0, placed: DV.map(() => ({ on: false, x: 0, y: 0 })), H: 40, hOk: false, hLine: false,
    pi: 0, rec3: [false, false, false, false], solveOpen: false, obs: 0, obsSeen: { 0: true }, camX: 0, camY: 0, arrowT: 1, expT: 0,
    H4: 70, rew: 0, rewD: 0, rewEnd: false, pickH: null, ageOk: false, burst: 0, barD: { 50: 0, 70: 0, 100: 0 },
  };
  let game = null;
  const VIEW_LABEL = { v1: '🌈 적색 편이로 후퇴 속도 구하기', v2: '📈 거리와 후퇴 속도의 관계', v3: '🧮 v = H₀d 계산과 관측자 바꾸기', v4: '⏪ 시간을 되감아 우주의 나이 구하기' };

  /* ======================================================
     1단계: 도플러 비유 + Ca II K선 이동 재기
     ====================================================== */
  const ANA = PHONE ? { x: 10, y: 10, w: 580, h: 262 } : { x: 12, y: 12, w: 776, h: 196 };
  const SPE = PHONE ? { x: 10, y: 282, w: 580, h: 548 } : { x: 12, y: 218, w: 776, h: 330 };
  const LAM_LO = 385, LAM_HI = 420;
  const spGeo = () => {
    const x0 = SPE.x + 58, x1 = SPE.x + SPE.w - 22, gx = (l) => x0 + (x1 - x0) * (l - LAM_LO) / (LAM_HI - LAM_LO);
    const hl = PHONE ? 120 : 74, labY0 = SPE.y + 50, labY1 = labY0 + hl, mainY0 = labY1 + (PHONE ? 62 : 54), mainY1 = SPE.y + SPE.h - (PHONE ? 62 : 56);
    return { x0, x1, gx, labY0, labY1, mainY0, mainY1 };
  };
  const lamFromX = (x) => { const G = spGeo(); return clamp(LAM_LO + (x - G.x0) / (G.x1 - G.x0) * (LAM_HI - LAM_LO), LAM_LO, LAM_HI); };
  const fK = (l, c) => 0.86 - 0.55 * gauss(l, c, 1.5) + 0.004 * (l - 385);
  function kPlot(y0, y1, c, col, labelTxt) {
    const G = spGeo(), gy = (v) => y1 - (y1 - y0) * clamp((v - 0.1) / 0.85, 0, 1);
    ctx.save(); ctx.fillStyle = '#0b1226'; ctx.fillRect(G.x0, y0, G.x1 - G.x0, y1 - y0);
    const sg = ctx.createLinearGradient(G.x0, 0, G.x1, 0); sg.addColorStop(0, '#6d28d9'); sg.addColorStop(1, '#7c3aed'); ctx.globalAlpha = 0.28; ctx.fillStyle = sg; ctx.fillRect(G.x0, y0, G.x1 - G.x0, y1 - y0); ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(148,163,184,.2)'; ctx.lineWidth = 1; for (let l = 390; l <= 420; l += 5) { ctx.beginPath(); ctx.moveTo(G.gx(l), y0); ctx.lineTo(G.gx(l), y1); ctx.stroke(); }
    const pts = []; for (let l = LAM_LO; l <= LAM_HI + 1e-6; l += 0.1) pts.push([G.gx(l), gy(fK(l, c))]);
    ctx.beginPath(); ctx.rect(G.x0, y0, G.x1 - G.x0, y1 - y0); ctx.clip(); polyline(pts, col, 2.6); ctx.restore();
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.6; ctx.strokeRect(G.x0, y0, G.x1 - G.x0, y1 - y0);
    TX(G.x1 - 8, y1 - 8, labelTxt, PHONE ? 12.5 : 13, '#e2e8f0', 'right', 800);
  }
  function drawWaves(y, x0, x1, lam, col, t) {
    const pts = []; for (let x = x0; x <= x1; x += 2) pts.push([x, y + 15 * Math.sin(TAU * (x / lam + t * 0.7))]);
    polyline(pts, col, 3.2);
  }
  function drawV1(t, dt) {
    const g = GAL3[S.gi];
    panel(ANA.x, ANA.y, ANA.w, ANA.h, { title: '멀어지는 광원의 빛은 파장이 길어져요 (소리의 도플러 효과와 비슷해요)', tsize: PHONE ? 13 : 14 });
    const r1 = ANA.y + (PHONE ? 100 : 80), r2 = ANA.y + (PHONE ? 192 : 156), xo = ANA.x + 56, xs = ANA.x + ANA.w - (PHONE ? 70 : 90);
    const zv = 0.22 + 3.6 * g.z, lam1 = 34, lam2 = lam1 * (1 + zv);
    ctx.save(); ctx.fillStyle = '#0b1226'; rr(ANA.x + 10, r1 - 27, ANA.w - 20, 54, 10).fill(); rr(ANA.x + 10, r2 - 27, ANA.w - 20, 54, 10).fill(); ctx.restore();
    drawWaves(r1, xo + 24, xs - 26, lam1, '#60a5fa', t); drawWaves(r2, xo + 24, xs - 26 + 0, lam2, '#f87171', t);
    [r1, r2].forEach((y) => { D.sphere(xo, y, 15, '#f1f5f9', { gloss: true }); TX(xo, y + 5, '👁', 14, '#111', 'center', 700); });
    D.glow(xs, r1, 26, '#93c5fd', 0.8); D.sphere(xs, r1, 11, '#bfdbfe', { shadow: true });
    D.glow(xs + 8 * Math.sin(t * 1.5), r2, 26, '#fca5a5', 0.7); D.sphere(xs + 8 * Math.sin(t * 1.5), r2, 11, '#fecaca', { shadow: true });
    D.arrow(xs + 22, r2, xs + 62, r2, { color: '#fbbf24', width: 3.5, head: 11 });
    TX(ANA.x + 22, r1 - 33, '정지한 광원: 파장 λ₀', PHONE ? 12.5 : 13, '#93c5fd', 'left', 800);
    TX(ANA.x + 22, r2 - 33, '멀어지는 광원: 파장이 더 길어요 (적색 편이, 그림은 과장)', PHONE ? 12.5 : 13, '#fca5a5', 'left', 800);
    // 스펙트럼
    const G = spGeo();
    panel(SPE.x, SPE.y, SPE.w, SPE.h, { title: g.nm + '의 스펙트럼: Ca II K선 (λ₀ = 393.4 nm)', tsize: PHONE ? 13.5 : 14.5 });
    kPlot(G.labY0, G.labY1, L0, '#e2e8f0', '실험실(정지한 광원)');
    kPlot(G.mainY0, G.mainY1, S.lamD, '#fb7185', g.nm + ' (관측)');
    // 눈금
    for (let l = 390; l <= 420; l += 5) TXD(G.gx(l), G.mainY1 + 19, String(l), 12.5, '#64748b', 'center');
    TXD((G.x0 + G.x1) / 2, SPE.y + SPE.h - 10, '파장 (nm)', 13, '#475569', 'center', 800);
    // 이동 화살표 (실험실 위치 → 관측 위치)
    ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(226,232,240,.7)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(G.gx(L0), G.labY1); ctx.lineTo(G.gx(L0), G.mainY1); ctx.stroke(); ctx.restore();
    const ay = G.mainY0 + 22; D.arrow(G.gx(L0), ay, G.gx(L0 + (S.lamD - L0) * S.shiftT), ay, { color: '#fbbf24', width: 3, head: 10 });
    // 측정 눈금
    const cx = G.gx(S.lamC), ok = Math.abs(S.lamC - g.lam) <= 0.3;
    ctx.save(); ctx.strokeStyle = ok ? '#22c55e' : '#fde047'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(cx, G.mainY0 - 6); ctx.lineTo(cx, G.mainY1 + 4); ctx.stroke();
    ctx.fillStyle = ok ? '#22c55e' : '#fde047'; ctx.beginPath(); ctx.moveTo(cx, G.mainY1 + 2); ctx.lineTo(cx - 10, G.mainY1 + 16); ctx.lineTo(cx + 10, G.mainY1 + 16); ctx.closePath(); ctx.fill(); ctx.restore();
    D.label(clamp(cx, G.x0 + 60, G.x1 - 60), G.mainY0 - 18, '측정 λ = ' + f1(S.lamC) + ' nm' + (ok ? '  ✓ 선 위' : ''), { bg: ok ? '#15803d' : '#78350f', size: PHONE ? 12.5 : 13.5, pad: 9 });
  }

  /* ======================================================
     2단계: 표준 촛불 + 거리-속도 그래프
     ====================================================== */
  const STD = PHONE ? { x: 10, y: 10, w: 580, h: 168 } : { x: 12, y: 12, w: 776, h: 138 };
  const SCT = PHONE ? { x: 10, y: 188, w: 580, h: 642 } : { x: 12, y: 160, w: 776, h: 388 };
  const sctGeo = () => {
    const x0 = SCT.x + 66, x1 = SCT.x + SCT.w - 24, y0 = SCT.y + 40, y1 = SCT.y + SCT.h - 52, DM = 260, VM = 18000;
    return { x0, x1, y0, y1, DM, VM, gx: (d) => x0 + (x1 - x0) * d / DM, gy: (v) => y1 - (y1 - y0) * v / VM, dOf: (x) => (x - x0) / (x1 - x0) * DM, vOf: (y) => (y1 - y) / (y1 - y0) * VM };
  };
  function drawV2(t, dt) {
    panel(STD.x, STD.y, STD.w, STD.h, { title: '표준 촛불: 광도 L을 아는 천체의 밝기로 거리를 구해요', tsize: PHONE ? 13 : 14 });
    const ex = STD.x + 40, ey = STD.y + (PHONE ? 84 : 68);
    D.sphere(ex, ey, 14, '#e2e8f0'); TXD(ex, ey + 5, '👁', 13, '#111', 'center', 700);
    ctx.save(); ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.moveTo(ex + 18, ey); ctx.lineTo(STD.x + STD.w - 20, ey); ctx.stroke(); ctx.restore();
    const unit = (STD.w - 110) / 10;
    [[1, '1'], [3, '1/9'], [10, '1/100']].forEach(([d, b]) => {
      const x = ex + 30 + d * unit * (d === 10 ? 1 : 1), bb = 1 / (d * d), al = Math.pow(bb, 0.4);
      D.glow(x, ey, 26, '#fbbf24', 0.2 + 0.7 * al); ctx.save(); ctx.globalAlpha = 0.25 + 0.75 * al; D.sphere(x, ey, 10, '#fde68a', { shadow: false }); ctx.restore();
      TXD(x, ey - 26, '거리 ' + d, PHONE ? 12.5 : 13, '#334155', 'center', 800);
      TXD(x, ey + 38, '밝기 ' + b, PHONE ? 12.5 : 13, '#b45309', 'center', 800);
    });
    TXD(STD.x + STD.w - 12, STD.y + STD.h - 10, '같은 광도 → 밝기 b = L / (4πd²): 거리가 10배면 밝기는 1/100', PHONE ? 12 : 13, '#475569', 'right', 800);
    // 산점도
    const G = sctGeo();
    panel(SCT.x, SCT.y, SCT.w, SCT.h, { title: '은하 8개의 거리-후퇴 속도 그래프', tsize: PHONE ? 14 : 14.5 });
    ctx.save(); ctx.fillStyle = '#f8fbff'; ctx.fillRect(G.x0, G.y0, G.x1 - G.x0, G.y1 - G.y0); ctx.strokeStyle = '#e1e8f0'; ctx.lineWidth = 1.2;
    for (let d = 0; d <= G.DM; d += 50) { ctx.beginPath(); ctx.moveTo(G.gx(d), G.y0); ctx.lineTo(G.gx(d), G.y1); ctx.stroke(); TXD(G.gx(d), G.y1 + 19, String(d), 12.5, '#64748b', 'center'); }
    for (let v = 0; v <= G.VM; v += 5000) { ctx.beginPath(); ctx.moveTo(G.x0, G.gy(v)); ctx.lineTo(G.x1, G.gy(v)); ctx.stroke(); TXD(G.x0 - 6, G.gy(v) + 4.5, String(v), 12.5, '#64748b', 'right'); }
    ctx.restore();
    TXD((G.x0 + G.x1) / 2, SCT.y + SCT.h - 10, '거리 d (Mpc)', 13, '#475569', 'center', 800);
    ctx.save(); ctx.translate(SCT.x + 16, (G.y0 + G.y1) / 2); ctx.rotate(-Math.PI / 2); TXD(0, 0, '후퇴 속도 v (km/s)', 13, '#475569', 'center', 800); ctx.restore();
    // 기울기 직선
    if (S.hLine) {
      ctx.save(); ctx.beginPath(); ctx.rect(G.x0, G.y0, G.x1 - G.x0, G.y1 - G.y0); ctx.clip();
      const pts = [[G.gx(0), G.gy(0)]]; const dEnd = Math.min(G.DM, G.VM / S.H); pts.push([G.gx(dEnd), G.gy(S.H * dEnd)]);
      polyline(pts, S.hOk ? '#16a34a' : '#ea580c', 3.4); ctx.restore();
      D.label(G.x0 + 12, G.y0 + 50, '기울기 H = ' + f0(S.H) + ' km/s/Mpc', { bg: '#9a3412', size: 13.5, align: 'left', pad: 9 });
    }
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.8; ctx.strokeRect(G.x0, G.y0, G.x1 - G.x0, G.y1 - G.y0);
    // 점
    DV.forEach((g, i) => {
      const p = S.placed[i]; if (!p.on) return;
      const x = p.x, y = p.y;
      D.shadow(() => { ctx.fillStyle = '#2563eb'; ctx.beginPath(); ctx.arc(x, y, 11, 0, TAU); ctx.fill(); }, { blur: 4, y: 1.5 });
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(x, y, 11, 0, TAU); ctx.stroke();
      TXD(x, y + 4.5, g.k, 12.5, '#fff', 'center', 800);
    });
    // 고른 은하 안내
    const sel = DV[S.pk];
    D.label(G.x0 + 12, G.y0 + 20, '은하 ' + sel.k + ': 거리 ' + sel.d + ' Mpc · 속도 ' + comma(sel.v) + ' km/s' + (S.placed[S.pk].on ? '  ✓' : ''), { bg: '#0f172a', size: PHONE ? 12.5 : 13.5, align: 'left', pad: 9 });
    if (!S.placed.some((p) => p.on)) TXD((G.x0 + G.x1) / 2, (G.y0 + G.y1) / 2, '그래프에서 이 은하의 자리를 눌러 점을 찍어요', 14, '#94a3b8', 'center', 800);
  }
  const placedN = () => S.placed.filter((p) => p.on).length;
  /* 점 8개가 아직 없으면(이어서 하기 등) 제자리에 바로 놓아 둬요 */
  function fillPoints() { const G = sctGeo(); DV.forEach((g, i) => { const p = S.placed[i]; if (!p.on) { p.on = true; p.x = G.gx(g.d); p.y = G.gy(g.v); } }); }
  function placePoint(i, x, y) {
    const G = sctGeo(), g = DV[i], tx = G.gx(g.d), ty = G.gy(g.v), p = S.placed[i];
    p.on = true; p.x = x; p.y = y; p.fly = 0;
    SciSim.tween(p, { x: tx, y: ty }, { duration: 0.45, ease: 'outBack' });
    Sound.success(); parts.burst(tx, ty, { count: 10, speed: 90, colors: ['#2563eb', '#93c5fd', '#fff'], gravity: 0 });
  }

  /* ======================================================
     3단계: 계산 문제 + 관측자 바꾸기 모형
     ====================================================== */
  const PRB = PHONE ? { x: 10, y: 10, w: 580, h: 262 } : { x: 12, y: 12, w: 372, h: 536 };
  const MOD = PHONE ? { x: 10, y: 282, w: 580, h: 322 } : { x: 396, y: 12, w: 392, h: 300 };
  const MIN3 = PHONE ? { x: 10, y: 614, w: 580, h: 216 } : { x: 396, y: 322, w: 392, h: 226 };
  const modScale = () => Math.min(MOD.w * 0.43, MOD.h * 0.43) / (AMAX * 0.62) * 0.9;
  const modPos = (i, a) => { const sc = modScale(), cx = MOD.x + MOD.w / 2, cy = MOD.y + MOD.h / 2 + 8; return { x: cx + (QG[i][0] - S.camX) * sc * a, y: cy + (QG[i][1] - S.camY) * sc * a, d: Math.hypot(QG[i][0] - QG[S.obs][0], QG[i][1] - QG[S.obs][1]) }; };
  function drawProblem() {
    const P = PROB[S.pi], isSp = S.pi >= 2;
    panel(PRB.x, PRB.y, PRB.w, PRB.h, { title: '문제 ' + (S.pi + 1) + '. ' + P.t + (S.rec3[S.pi] ? '  ✓' : ''), tsize: PHONE ? 14 : 15 });
    TXD(PRB.x + 14, PRB.y + 60, 'v = H₀ d  (H₀ = 70 km/s/Mpc, 1 Mpc ≈ 326만 광년)', PHONE ? 13 : 13.5, '#0f172a', 'left', 800);
    const ex = PRB.x + 50, gxp = PRB.x + PRB.w - 56, gy2 = PRB.y + (PHONE ? 130 : 138);
    D.sphere(ex, gy2, 15, '#3b82f6', { shadow: true }); TXD(ex, gy2 + 34, '지구(우리은하)', 12.5, '#334155', 'center', 800);
    D.glow(gxp, gy2, 28, '#f59e0b', 0.5); D.sphere(gxp, gy2, 13, '#fbbf24', { shadow: true }); TXD(gxp, gy2 + 34, '은하', 12.5, '#334155', 'center', 800);
    ctx.save(); ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(ex + 18, gy2); ctx.lineTo(gxp - 18, gy2); ctx.stroke(); ctx.restore();
    const mid = (ex + gxp) / 2;
    if (S.pi === 0) { TXD(mid, gy2 - 12, 'd = 150 Mpc', 15, '#0f172a', 'center', 800); TXD(mid, gy2 + 36, '후퇴 속도 v = ?', 15, '#b91c1c', 'center', 800); }
    else if (S.pi === 1) { TXD(mid, gy2 - 12, '거리 d = ?', 15, '#b91c1c', 'center', 800); TXD(mid, gy2 + 36, 'v = 15000 km/s', 15, '#0f172a', 'center', 800); }
    else { TXD(mid, gy2 - 12, '거리 d = ?', 15, '#b91c1c', 'center', 800); }
    D.arrow(gxp + 2, gy2 - 40, gxp + 40 > PRB.x + PRB.w - 6 ? PRB.x + PRB.w - 6 : gxp + 40, gy2 - 40, { color: '#ef4444', width: 3, head: 9 });
    if (isSp) {
      const g = GAL3[S.pi === 2 ? 0 : 1], y0 = PRB.y + (PHONE ? 168 : 190), y1 = y0 + (PHONE ? 52 : 70), x0 = PRB.x + 16, x1 = PRB.x + PRB.w - 16, gx = (l) => x0 + (x1 - x0) * (l - LAM_LO) / (LAM_HI - LAM_LO);
      ctx.save(); ctx.fillStyle = '#0b1226'; ctx.fillRect(x0, y0, x1 - x0, y1 - y0); ctx.restore();
      [[L0, '#e2e8f0'], [g.lam, '#fb7185']].forEach(([l, c]) => { ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(gx(l), y0 + 4); ctx.lineTo(gx(l), y1 - 4); ctx.stroke(); ctx.restore(); });
      TX(x0, y1 + 36, '실험실 393.4 nm', PHONE ? 12 : 12.5, '#475569', 'left', 800); TX(x1, y1 + 36, '관측 ' + g.lam + ' nm', PHONE ? 12 : 12.5, '#be123c', 'right', 800);
      ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.5; ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
      TXD((x0 + x1) / 2, y1 + 16, 'Ca II K선의 위치 (385 ~ 420 nm)', 12, '#64748b', 'center', 700);
    }
    const by = PRB.y + PRB.h - (PHONE ? 78 : 110);
    drawWrap(PRB.x + 14, by, P.q + (S.pi < 2 ? ' 일 때' : ' 로 관측된 은하의 ') + (S.pi < 2 ? '' : '거리를 구해요'), PRB.w - 28, PHONE ? 13.5 : 14, { align: 'left', color: '#0f172a', weight: 800 });
    if (S.solveOpen) drawWrap(PRB.x + 14, by + 30, P.solve.replace(/<\/?b>/g, '').replace(/÷/g, '/'), PRB.w - 28, PHONE ? 12.5 : 13, { align: 'left', color: '#15803d', weight: 800 });
    else drawWrap(PRB.x + 14, by + 30, S.pi < 2 ? '값을 계산해서 오른쪽 입력창에 써요' : 'z → v = cz → d = v/H₀ 순서로 계산해요', PRB.w - 28, PHONE ? 12.5 : 13, { align: 'left', color: '#64748b', weight: 700 });
  }
  function drawModel(t, dt) {
    ctx.save(); rr(MOD.x, MOD.y, MOD.w, MOD.h, 14).clip();
    const bg = ctx.createRadialGradient(MOD.x + MOD.w / 2, MOD.y + MOD.h / 2, 10, MOD.x + MOD.w / 2, MOD.y + MOD.h / 2, MOD.w * 0.7); bg.addColorStop(0, '#12204a'); bg.addColorStop(1, '#050914'); ctx.fillStyle = bg; ctx.fillRect(MOD.x, MOD.y, MOD.w, MOD.h);
    const a = 1 + 0.12 * (S.expT % 1), fa = Math.min(1, (S.expT % 1) * 6, (1 - (S.expT % 1)) * 6);
    const cx = MOD.x + MOD.w / 2, cy = MOD.y + MOD.h / 2 + 8;
    QG.forEach((q, i) => {
      if (i === S.obs) return; const p = modPos(i, a);
      ctx.globalAlpha = 0.35 + 0.65 * fa;
      const ux = p.x - cx, uy = p.y - cy, L = Math.hypot(ux, uy) || 1, len = 0.5 * L * S.arrowT;
      D.arrow(p.x + ux / L * 12, p.y + uy / L * 12, p.x + ux / L * 12 + ux / L * len, p.y + uy / L * 12 + uy / L * len, { color: '#fbbf24', width: 2.4, head: 8 });
      D.sphere(p.x, p.y, 9, '#fde68a', { shadow: false });
      ctx.globalAlpha = 1;
    });
    const op = modPos(S.obs, a); D.glow(op.x, op.y, 30, '#38bdf8', 0.6); D.sphere(op.x, op.y, 11, '#38bdf8', { shadow: true });
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(op.x, op.y, 17, 0, TAU); ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = 'rgba(148,163,184,.55)'; ctx.lineWidth = 2; rr(MOD.x, MOD.y, MOD.w, MOD.h, 14).stroke();
    D.label(MOD.x + 12, MOD.y + 20, '은하 모형: 은하를 눌러 관측자를 바꿔요', { bg: 'rgba(15,23,42,.85)', size: PHONE ? 12 : 12.5, align: 'left', pad: 9 });
    D.label(MOD.x + MOD.w - 12, MOD.y + MOD.h - 18, '화살표 길이 = 후퇴 속도 (관측자 기준)', { bg: 'rgba(15,23,42,.85)', color: '#fcd34d', size: PHONE ? 12 : 12, align: 'right', pad: 8 });
    TX(op.x, op.y - 24, '관측자', 12.5, '#7dd3fc', 'center', 800);
  }
  function drawMini() {
    panel(MIN3.x, MIN3.y, MIN3.w, MIN3.h, { title: '이 관측자가 본 거리-속도', tsize: PHONE ? 13.5 : 13.5 });
    const x0 = MIN3.x + 52, x1 = MIN3.x + MIN3.w - 18, y0 = MIN3.y + 38, y1 = MIN3.y + MIN3.h - 36;
    const dm = 250, vm = 18000, gx = (d) => x0 + (x1 - x0) * d / dm, gy = (v) => y1 - (y1 - y0) * v / vm;
    ctx.save(); ctx.fillStyle = '#f8fbff'; ctx.fillRect(x0, y0, x1 - x0, y1 - y0); ctx.strokeStyle = '#e1e8f0'; ctx.lineWidth = 1.2;
    [0, 100, 200].forEach((d) => { ctx.beginPath(); ctx.moveTo(gx(d), y0); ctx.lineTo(gx(d), y1); ctx.stroke(); TXD(gx(d), y1 + 16, String(d), 12, '#64748b', 'center'); });
    [0, 6000, 12000, 18000].forEach((v) => { ctx.beginPath(); ctx.moveTo(x0, gy(v)); ctx.lineTo(x1, gy(v)); ctx.stroke(); TXD(x0 - 5, gy(v) + 4, String(v), 11.5, '#64748b', 'right'); });
    ctx.restore();
    polyline([[gx(0), gy(0)], [gx(dm), gy(H0 * dm)]], '#ea580c', 2.2, { alpha: 0.7 });
    QG.forEach((q, i) => { if (i === S.obs) return; const d = Math.hypot(q[0] - QG[S.obs][0], q[1] - QG[S.obs][1]) * 100, v = H0 * d; ctx.fillStyle = '#2563eb'; ctx.beginPath(); ctx.arc(gx(d), gy(v), 5.2, 0, TAU); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke(); });
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.6; ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
    TXD((x0 + x1) / 2, MIN3.y + MIN3.h - 8, '거리 (Mpc)', 12, '#475569', 'center', 800);
    ctx.save(); ctx.translate(MIN3.x + 14, (y0 + y1) / 2); ctx.rotate(-Math.PI / 2); TXD(0, 0, '속도 (km/s)', 12, '#475569', 'center', 800); ctx.restore();
    D.label(x1 - 6, y0 + 16, '원점을 지나는 직선', { bg: '#9a3412', size: 12, align: 'right', pad: 8 });
    dataTag(MIN3.x + MIN3.w - 8, MIN3.y + 18, '모형');
  }
  function drawV3(t, dt) { drawProblem(); drawModel(t, dt); drawMini(); }

  /* ======================================================
     4단계: 시간 되감기와 우주의 나이
     ====================================================== */
  const REW = PHONE ? { x: 10, y: 10, w: 580, h: 340 } : { x: 12, y: 12, w: 776, h: 296 };
  const BAR = PHONE ? { x: 10, y: 360, w: 580, h: 470 } : { x: 12, y: 318, w: 776, h: 230 };
  const rewGeo = () => { const x0 = REW.x + 90, x1 = REW.x + REW.w - 30; return { x0, x1, gx: (d) => x0 + (x1 - x0) * d / 260, y: REW.y + (PHONE ? 180 : 168) }; };
  function drawV4(t, dt) {
    const T = AGE[S.H4], f = S.rewD, G = rewGeo(), y = G.y;
    panel(REW.x, REW.y, REW.w, REW.h, { fill: 'rgba(12,20,48,.92)', title: '시간을 되감기: 모든 은하가 같은 속도로 멀어졌다면?', tcolor: '#e2e8f0', tsize: PHONE ? 13.5 : 14.5 });
    ctx.save(); ctx.strokeStyle = 'rgba(148,163,184,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(G.x0 - 20, y); ctx.lineTo(G.x1 + 10, y); ctx.stroke();
    for (let d = 0; d <= 250; d += 50) { ctx.beginPath(); ctx.moveTo(G.gx(d), y + 6); ctx.lineTo(G.gx(d), y + 14); ctx.stroke(); TX(G.gx(d), y + 30, String(d), 12.5, '#94a3b8', 'center'); }
    ctx.restore();
    TX((G.x0 + G.x1) / 2, y + 50, '우리은하로부터의 거리 (Mpc)', 12.5, '#94a3b8', 'center', 800);
    D.glow(G.x0, y, 26, '#38bdf8', 0.5); D.sphere(G.x0, y, 11, '#38bdf8', { shadow: true }); TX(G.x0, y - 22, '우리은하', 12.5, '#7dd3fc', 'center', 800);
    DV.forEach((g, i) => {
      const dNow = g.d, dPast = dNow * (1 - f), xN = G.gx(dNow), xP = G.gx(dPast), ypos = y - (i % 2 ? 0 : 0);
      ctx.save(); ctx.globalAlpha = 0.35; ctx.strokeStyle = '#fbbf24'; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(xN, y); ctx.lineTo(xP, y); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.arc(xN, y, 4, 0, TAU); ctx.fill(); ctx.restore();
      D.arrow(xP, y - 26, xP + 0.28 * (xN - G.x0) + 18, y - 26, { color: '#fbbf24', width: 2.6, head: 8 });   // 화살표 길이 = 후퇴 속도(되감아도 변하지 않아요)
      D.sphere(xP, y, 9.5, '#fde68a', { shadow: true }); TX(xP, y - 36, g.k, 12.5, '#fde68a', 'center', 800);
    });
    const tt = f * T;
    D.label(REW.x + 14, REW.y + 46, '되감은 시간: ' + f0(tt) + '억 년 전', { bg: '#0ea5e9', size: PHONE ? 13 : 14, align: 'left', pad: 10 });
    drawWrap(REW.x + 14, REW.y + (PHONE ? 250 : 238), f >= 0.995 ? '모든 은하가 한 점에 모였어요! 이때가 팽창이 시작된 때예요.' : '시간을 되감을수록 은하 사이가 가까워져요. 거리 = 현재 거리 × ' + (1 - f).toFixed(2), REW.w - 28, PHONE ? 13.5 : 14, { align: 'left', color: f >= 0.995 ? '#fde68a' : '#cbd5e1', weight: 800 });
    // 나이 막대
    panel(BAR.x, BAR.y, BAR.w, BAR.h, { title: '허블 상수에 따른 우주의 나이 t = 1 / H₀', tsize: PHONE ? 14 : 14.5 });
    const x0 = BAR.x + 86, x1 = BAR.x + BAR.w - 24, mx = 220, gxb = (v) => x0 + (x1 - x0) * v / mx;
    const rowH = PHONE ? 84 : 40;
    [50, 70, 100].forEach((h, i) => {
      const yy = BAR.y + 50 + i * (rowH + 12), on = S.H4 === h, v = S.barD[h], bad = AGE[h] < GC_AGE;
      TXD(x0 - 10, yy + rowH / 2 + 5, 'H₀ = ' + h, PHONE ? 13 : 13.5, on ? '#0f172a' : '#64748b', 'right', 800);
      ctx.save(); ctx.fillStyle = '#eef2f7'; rr(x0, yy, x1 - x0, rowH, 8).fill(); ctx.restore();
      ctx.save(); const g = ctx.createLinearGradient(x0, 0, gxb(220), 0); g.addColorStop(0, bad ? '#f87171' : '#60a5fa'); g.addColorStop(1, bad ? '#dc2626' : '#2563eb'); ctx.fillStyle = g; ctx.globalAlpha = on ? 1 : 0.55; rr(x0, yy, Math.max(4, gxb(v) - x0), rowH, 8).fill(); ctx.restore();
      if (on) { ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2.6; rr(x0 - 2, yy - 2, x1 - x0 + 4, rowH + 4, 10).stroke(); }
      TX(Math.min(gxb(v) - 8, x1 - 8), yy + rowH / 2 + 5, f0(v) + '억 년', PHONE ? 13.5 : 14, '#fff', 'right', 800);
    });
    const gcx = gxb(GC_AGE), by0 = BAR.y + 44, by1 = BAR.y + 50 + 3 * (rowH + 12);
    ctx.save(); ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 3; ctx.setLineDash([7, 5]); ctx.beginPath(); ctx.moveTo(gcx, by0); ctx.lineTo(gcx, by1); ctx.stroke(); ctx.restore();
    D.label(gcx, by1 + 14, '가장 오래된 구상 성단 약 130억 년', { bg: '#15803d', size: PHONE ? 12 : 12.5, pad: 9 });
    const sel = AGE[S.H4];
    drawWrap(BAR.x + 14, by1 + 46, 'H₀ = ' + S.H4 + ' 이면 t = 1/H₀ ≈ ' + f0(sel) + '억 년' + (sel < GC_AGE ? ' → 구상 성단(130억 년)보다 어려요!' : ' → 구상 성단보다 나이가 많아요.'), BAR.w - 28, PHONE ? 13 : 13.5, { align: 'left', color: sel < GC_AGE ? '#b91c1c' : '#0f172a', weight: 800 });
  }

  /* ======================================================
     컨트롤 연결
     ====================================================== */
  const modeSeg = $('#modeSeg'), sLam = $('#sLam'), oLam = $('#oLam'), sH = $('#sH'), oH = $('#oH'), sRew = $('#sRew'), oRew = $('#oRew');
  const inZ = $('#inZ'), inV = $('#inV'), inP = $('#inP'), inAge = $('#inAge');
  $('#gSeg').innerHTML = GAL3.map((g, i) => '<button class="opt" type="button" data-k="' + i + '">' + g.nm + '</button>').join('');
  $('#pSeg').innerHTML = DV.map((g, i) => '<button class="opt" type="button" data-k="' + i + '">' + g.k + '</button>').join('');
  $('#probSeg').innerHTML = PROB.map((p, i) => '<button class="opt" type="button" data-k="' + i + '">문제 ' + (i + 1) + '</button>').join('');
  $('#pickSeg').innerHTML = [50, 70, 100].map((h) => '<button class="opt" type="button" data-k="' + h + '">H₀ = ' + h + '</button>').join('');
  const killTw = (obj, keys) => keys.forEach((k) => { SciSim.tween(obj, { [k]: obj[k] }, { duration: 0.0001 }); });

  function setView(v) { if (S.view !== v) { S.view = v; S.fade = 1; parts.clear(); } updateCtl(); }
  function updateCtl() {
    $('#tbLabel').textContent = VIEW_LABEL[S.view];
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !c.dataset.modes.split(' ').includes(S.view); });
    const free = !!(game && game.free);
    $('#hBox').hidden = !(S.view === 'v2' && (placedN() === 8 || free));
    $('#ageBox').hidden = !(S.view === 'v4' && (S.ageOn || free));
    $('#pickBox').hidden = !(S.view === 'v4' && (S.pickOn || free));
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.view === S.view));
    if (modeSeg) modeSeg.hidden = !free;
    $$('#gSeg .opt').forEach((b) => { const i = +b.dataset.k; b.classList.toggle('on', S.gi === i); b.classList.toggle('good', S.rec1[i]); });
    $$('#pSeg .opt').forEach((b) => { const i = +b.dataset.k; b.classList.toggle('on', S.pk === i); b.classList.toggle('good', S.placed[i].on); });
    $$('#probSeg .opt').forEach((b) => { const i = +b.dataset.k; b.classList.toggle('on', S.pi === i); b.classList.toggle('good', S.rec3[i]); });
    $$('#hSeg .opt').forEach((b) => b.classList.toggle('on', +b.dataset.k === S.H4));
    $$('#pickSeg .opt').forEach((b) => b.classList.toggle('on', S.pickH === +b.dataset.k));
    $('#solveBox').hidden = !S.solveOpen; if (S.solveOpen) $('#solveBox').innerHTML = PROB[S.pi].solve;
    $('#pUnit').textContent = '답 (' + PROB[S.pi].unit + ')';
  }
  /* 1단계 */
  const lamOut = (v) => f1(v) + ' nm';
  function setLamC(v) { S.lamC = clamp(Math.round(v * 10) / 10, LAM_LO, LAM_HI); setSlider(sLam, oLam, S.lamC, lamOut); }
  sLam.addEventListener('input', () => { S.lamC = +sLam.value; sLam.style.setProperty('--pct', ((S.lamC - LAM_LO) / (LAM_HI - LAM_LO)) * 100 + '%'); oLam.textContent = lamOut(S.lamC); });
  function setGal(i) {
    S.gi = i; S.seenG[i] = true; inZ.value = ''; inV.value = '';
    S.lamD = L0; S.shiftT = 0; killTw(S, ['lamD', 'shiftT']);
    SciSim.tween(S, { lamD: GAL3[i].lam }, { duration: 0.9, ease: 'outCubic' }); SciSim.tween(S, { shiftT: 1 }, { duration: 0.9, ease: 'outCubic' });
    updateCtl();
  }
  $$('#gSeg .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); setGal(+b.dataset.k); }));
  function recordG() {
    const g = GAL3[S.gi];
    if (S.rec1[S.gi]) { say(g.nm + '은 이미 기록했어요.', false, 1.8); return; }
    if (Math.abs(S.lamC - g.lam) > 0.3) { Sound.fail(); say('먼저 측정 눈금을 흡수선의 가운데에 맞춰요.', true, 2.6); return; }
    const z = parseNum(inZ.value), v = parseNum(inV.value);
    if (!isFinite(z) || !isFinite(v)) { Sound.fail(); say('z와 v를 숫자로 써요. 예: z = 0.0081, v = 2440', true, 2.8); return; }
    if (Math.abs(z - g.z) > 0.0008) { Sound.fail(); say('z를 다시 계산해 봐요. z = (λ관측 − 393.4) / 393.4 예요.', true, 3.4); return; }
    if (Math.abs(v - g.v) > Math.max(0.05 * g.v, 150)) { Sound.fail(); say('v = c z 에서 c = 3.0×10⁵ km/s 예요. 다시 계산해 봐요.', true, 3.4); return; }
    S.rec1[S.gi] = true; Sound.success(); say(g.nm + ': z = ' + sig(g.z, 2) + ', v = cz ≈ ' + f0(Math.round(g.v / 10) * 10) + ' km/s', false, 3);
    const G = spGeo(); parts.burst(G.gx(g.lam), G.mainY0 + 30, { count: 18, speed: 150, colors: ['#fb7185', '#fde68a', '#fff'] });
    updateCtl();
  }
  $('#bRec1').addEventListener('click', recordG);
  [inZ, inV].forEach((e) => e.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') recordG(); }));
  /* 2단계 */
  function setPk(i) { S.pk = i; updateCtl(); }
  $$('#pSeg .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); setPk(+b.dataset.k); }));
  const hOut = (v) => f0(v) + ' km/s/Mpc';
  sH.addEventListener('input', () => { S.H = +sH.value; sH.style.setProperty('--pct', ((S.H - 30) / 90) * 100 + '%'); oH.textContent = hOut(S.H); });
  function setH(v) { S.H = v; setSlider(sH, oH, v, hOut); }
  /* 3단계 */
  function setProb(i) { S.pi = i; S.solveOpen = false; inP.value = ''; updateCtl(); }
  $$('#probSeg .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); setProb(+b.dataset.k); }));
  function recordP() {
    const P = PROB[S.pi];
    if (S.rec3[S.pi]) { say('이미 푼 문제예요.', false, 1.8); return; }
    const v = parseNum(inP.value);
    if (!isFinite(v) || v <= 0) { Sound.fail(); say('답을 숫자로 써요. 예: 10500', true, 2.4); return; }
    if (Math.abs(v - P.a) / P.a > P.tol) {
      Sound.fail();
      say(S.pi === 1 ? '다시 계산해 봐요. 속도를 H₀로 나누면 거리가 돼요: d = v / H₀' : S.pi === 0 ? '다시 계산해 봐요. v = H₀ × d 예요.' : '먼저 z = (λ관측 − λ₀) / λ₀, 다음 v = cz, 마지막으로 d = v / H₀ 를 계산해요.', true, 3.8); return;
    }
    S.rec3[S.pi] = true; Sound.success(); say('정답! ' + P.solve.replace(/<\/?b>/g, '').replace(/÷/g, '/'), false, 4);
    updateCtl();
  }
  $('#bRec3').addEventListener('click', recordP);
  inP.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') recordP(); });
  $('#bSolve3').addEventListener('click', () => { Sound.click(); S.solveOpen = !S.solveOpen; updateCtl(); });
  function setObs(i) {
    S.obs = i; S.obsSeen[i] = true; S.arrowT = 0;
    killTw(S, ['camX', 'camY', 'arrowT']);
    SciSim.tween(S, { camX: QG[i][0], camY: QG[i][1] }, { duration: 0.7, ease: 'outCubic' }); SciSim.tween(S, { arrowT: 1 }, { duration: 0.9, ease: 'outCubic' });
    Sound.click(); updateCtl();
  }
  $('#bObs').addEventListener('click', () => setObs((S.obs + 1) % QG.length));
  /* 4단계 */
  $$('#hSeg .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.H4 = +b.dataset.k; S.rewEnd = S.rewEnd && S.H4 === 70; S.burst = 0; updateCtl(); }));
  const rewOut = (v) => f0(v / 10) + '%';
  sRew.addEventListener('input', () => { S.rew = +sRew.value / 1000; sRew.style.setProperty('--pct', (+sRew.value / 10) + '%'); oRew.textContent = rewOut(+sRew.value); });
  function setRew(v) { S.rew = clamp(v, 0, 1); setSlider(sRew, oRew, Math.round(S.rew * 1000), rewOut); }
  $$('#pickSeg .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.pickH = +b.dataset.k; updateCtl(); }));
  const okAge = () => { let v = parseNum(inAge.value); if (isFinite(v) && v >= 1e6) v /= 1e8; return isFinite(v) && Math.abs(v - AGE[70]) / AGE[70] <= 0.05; };   // 1.4×10^10 년 처럼 써도 억 년으로 바꿔 줘요

  /* ---------- 포인터 ---------- */
  SciSim.pointer(view, {
    down(p) {
      if (S.view === 'v1') { const G = spGeo(); if (p.x >= G.x0 - 10 && p.x <= G.x1 + 10 && p.y >= G.mainY0 - 40 && p.y <= G.mainY1 + 30) { setLamC(lamFromX(p.x)); return true; } return false; }
      if (S.view === 'v2') {
        const G = sctGeo(); if (p.x < G.x0 - 8 || p.x > G.x1 + 8 || p.y < G.y0 - 8 || p.y > G.y1 + 8) return false;
        const i = S.pk, g = DV[i];
        if (S.placed[i].on) { say('은하 ' + g.k + '는 이미 찍었어요. 다른 은하를 골라요.', false, 1.8); return false; }
        if (Math.abs(p.x - G.gx(g.d)) <= 17 && Math.abs(p.y - G.gy(g.v)) <= 17) { placePoint(i, p.x, p.y); const nx = DV.findIndex((q, j) => !S.placed[j].on); if (nx >= 0) setPk(nx); else updateCtl(); }
        else { Sound.fail(); say('거리 ' + g.d + ' Mpc, 속도 ' + comma(g.v) + ' km/s 의 자리를 눈금에서 찾아봐요.', true, 3); }
        return false;
      }
      if (S.view === 'v3') {
        const a = 1 + 0.12 * (S.expT % 1); let best = -1, bd = 26;
        QG.forEach((q, i) => { const pp = modPos(i, a), d = Math.hypot(pp.x - p.x, pp.y - p.y); if (i !== S.obs && d < bd) { bd = d; best = i; } });
        if (best >= 0) setObs(best);
        return false;
      }
      return false;
    },
    move(p) { if (S.view === 'v1') setLamC(lamFromX(p.x)); },
    up() {},
    hover(p) { return S.view === 'v1' ? 'ew-resize' : S.view === 'v2' || S.view === 'v3' ? 'pointer' : 'default'; },
  });

  /* ---------- 읽기 칸 ---------- */
  function readouts() {
    const v = S.view;
    if (v === 'v1') { const g = GAL3[S.gi]; setReadouts(['고른 은하', g.nm, '관측한 K선', f1(g.lam) + ' nm', '기록한 은하', S.rec1.filter(Boolean).length + ' / 3']); }
    else if (v === 'v2') { const g = DV[S.pk]; setReadouts(['고른 은하', g.k + ' (' + g.d + ' Mpc, ' + comma(g.v) + ' km/s)', '찍은 점', placedN() + ' / 8', '직선의 기울기 H', placedN() === 8 ? f0(S.H) + ' km/s/Mpc' : '-']); }
    else if (v === 'v3') { setReadouts(['문제', PROB[S.pi].t, '푼 문제', S.rec3.filter(Boolean).length + ' / 4', '관측자 은하', '번호 ' + (S.obs + 1) + ' (살펴본 관측자 ' + Object.keys(S.obsSeen).length + '명)']); }
    else { setReadouts(['허블 상수 H₀', S.H4 + ' km/s/Mpc', '우주의 나이 1/H₀', f0(AGE[S.H4]) + '억 년', '되감은 시간', f0(S.rew * AGE[S.H4]) + '억 년']); }
  }

  /* ======================================================
     단계 · 미션
     ====================================================== */
  function enterLevel(li) {
    clearTimeout(hintTimer); parts.clear(); flash.t = 0;
    if (li === 0) { S.rec1 = [false, false, false]; S.seenG = {}; setLamC(400); inZ.value = ''; inV.value = ''; setView('v1'); setGal(0); showHint('측정 눈금을 끌어서 흡수선의 가운데에 맞춰요', 5000); }
    else if (li === 1) { S.placed.forEach((p) => { p.on = false; killTw(p, ['x', 'y']); }); S.hLine = false; setH(40); setPk(0); setView('v2'); showHint('은하를 고르고 그래프에서 자리를 눌러 점을 찍어요', 5000); }
    else if (li === 2) { S.rec3 = [false, false, false, false]; S.obsSeen = { 0: true }; S.solveOpen = false; setProb(0); S.obs = 0; S.camX = QG[0][0]; S.camY = QG[0][1]; S.arrowT = 1; setView('v3'); showHint('문제를 풀고, 은하를 눌러 관측자를 바꿔 봐요', 5000); }
    else { S.H4 = 70; S.rewEnd = false; S.ageOn = false; S.pickOn = false; S.pickH = null; inAge.value = ''; setRew(0); S.rewD = 0; S.burst = 0; Object.keys(S.barD).forEach((k) => { S.barD[k] = 0; }); setView('v4'); showHint('되감기 슬라이더를 끝까지 움직여 봐요', 5000); }
    updateCtl();
  }
  const tbl = (rows) => '<table class="mini">' + rows.map((r, i) => '<tr>' + r.map((c) => (i === 0 ? '<th>' : '<td>') + c + (i === 0 ? '</th>' : '</td>')).join('') + '</tr>').join('') + '</table>';

  const levels = [
    {
      title: '적색 편이: 스펙트럼선이 길어진 만큼', short: '적색 편이', icon: '🌈', phase: '관찰', features: ['redshift'],
      intro: '<p class="si-q">❓ 탐구 질문: 먼 은하일수록 더 빨리 멀어진다면, 우주는 어떻게 변해 왔고 몇 살일까?</p>' +
        '<div class="si-link">🔗 <b>중학교에서</b> 풍선 모형으로 우주가 팽창하고 있고 팽창에는 중심이 없다는 것을 배웠어요. <b>앞 차시에서</b> 퀘이사의 적색 편이 z = 0.158을 계산했어요.</div>' +
        '<p>멀어지는 광원의 빛은 파장이 길어져요(<b>적색 편이</b>). 소리의 도플러 효과와 같아요. 스펙트럼선의 <b>파장이 늘어난 정도</b>는 <b>z = (λ관측 − λ₀) ÷ λ₀</b>이고, z가 매우 작을 때(z ≪ 1) 후퇴 속도는 <b>v = cz</b> (c = 3.0×10⁵ km/s)예요.</p>' +
        '<p>은하 3개의 Ca II K선(실험실 파장 λ₀ = 393.4 nm)이 얼마나 이동했는지 재서 z와 v를 구해요.</p>',
      setup() { enterLevel(0); },
      recap: '후퇴하는 은하의 스펙트럼선은 파장이 길어져요. z = (λ관측 − λ₀)/λ₀ 이고, z ≪ 1 이면 v = cz 예요.',
      summary: '<ul><li><b>적색 편이</b>: 멀어지는 광원의 스펙트럼선이 긴 파장 쪽으로 이동. <b>z = (λ관측 − λ₀) / λ₀ ≈ v / c</b></li><li>z ≪ 1 에서 <b>v = cz</b> (c = 3.0×10⁵ km/s)</li><li>예: Ca II K선(393.4 nm)이 396.6 nm로 관측 → z = 0.0081, v ≈ 2440 km/s / 412.6 nm → z = 0.0488, v ≈ 14600 km/s</li><li>은하가 &quot;빨갛게 변해서&quot; 생기는 것이 아니라 <b>빛의 파장이 늘어나는</b> 것이에요.</li></ul>',
      missions: [
        {
          title: '은하 3개의 후퇴 속도 구하기',
          goal: '은하 3개에서 <b>측정 눈금을 K선에 맞춰</b> λ를 읽고, <b>z</b>와 <b>v = cz</b>를 계산해 기록해요.',
          hint: 'z = (λ관측 − 393.4) ÷ 393.4 예요. 은하 1은 396.6 nm 근처의 흡수선이에요. v = 3.0×10⁵ × z (km/s).',
          hold: 0.3, setup() { setView('v1'); },
          status: () => GAL3.map((g, i) => g.nm + ' ' + mark(S.rec1[i])).join(' · '),
          check: () => S.rec1.every(Boolean),
          explain: '은하 1: z = 0.0081 → <b>2440 km/s</b>, 은하 2: z = 0.0488 → <b>14600 km/s</b>, 은하 3: z = 0.0180 → <b>5400 km/s</b>예요. 선이 더 길게 이동할수록(z가 클수록) 더 빠르게 멀어져요.',
        },
        {
          type: 'quiz', title: '적색 편이의 뜻', goal: '먼 은하의 스펙트럼선이 긴 파장 쪽으로 이동한 까닭을 가장 잘 설명한 것은?', setup() { setView('v1'); },
          choices: ['은하가 붉은색으로 변하기 때문이에요', '은하의 온도가 낮아지기 때문이에요', '은하가 멀어지면서 빛의 파장이 늘어나기 때문이에요(z가 클수록 더 빠르게 멀어져요)', '지구 대기가 붉은빛만 통과시키기 때문이에요'],
          answer: 2,
          feedback: ['색깔이 변하는 것이 아니라 스펙트럼선의 위치(파장)가 이동하는 거예요.', '온도가 같아도 선의 위치가 이동해요. 이동량은 후퇴 속도를 알려 줘요.', '', '지구 대기와 상관없이 실험실 파장에서 이동한 정도를 비교한 거예요.'],
          explain: '멀어지는 광원에서 나온 빛은 파장이 길어져 선이 붉은 쪽으로 이동해요. 이동한 정도 z가 클수록 후퇴 속도 v = cz가 커요.',
        },
      ],
    },
    {
      title: '거리와 후퇴 속도: 원점을 지나는 직선', short: '거리와 속도', icon: '📈', phase: '분석', features: ['plot'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 스펙트럼선의 이동으로 은하의 후퇴 속도(v = cz)를 구했어요. 이번에는 <b>거리</b>를 함께 봐요.</div>' +
        '<p>은하까지의 거리는 광도를 아는 천체(<b>표준 촛불</b>: 세페이드 변광성, Ia형 초신성)의 <b>겉보기 밝기</b>로 구해요. 밝기는 b = L ÷ (4πd²)이므로 같은 광도에서 밝기가 1/100이면 거리는 10배예요.</p>' +
        '<p>은하 A~H의 (거리, 속도) 자료를 그래프에 찍고, 점들이 어떤 관계를 이루는지 알아봐요. (오차 ±10 % 정도의 예시 자료)</p>',
      setup() { enterLevel(1); },
      recap: '거리가 먼 은하일수록 더 빨리 멀어져요. 거리-속도 그래프는 원점을 지나는 직선이고, 기울기가 허블 상수예요.',
      summary: '<ul><li>거리는 <b>표준 촛불</b>의 겉보기 밝기로 구해요: b = L / (4πd²) → 밝기 1/100이면 거리 10배.</li><li>은하 8개(10~250 Mpc)의 거리-후퇴 속도는 <b>원점을 지나는 직선</b>이에요.</li><li><b>허블-르메트르 법칙: v = H₀ d</b> (H₀ ≈ 70 km/s/Mpc, 1 Mpc ≈ 326만 광년). 르메트르(1927)가 이론으로 먼저 유도했고 허블(1929)이 관측으로 확인했어요.</li></ul>' +
        tbl([['은하', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], ['거리(Mpc)'].concat(DV.map((g) => g.d)), ['속도(km/s)'].concat(DV.map((g) => g.v))]),
      missions: [
        {
          title: '은하 8개의 점 찍기',
          goal: '은하 <b>A~H</b>를 하나씩 골라, 그래프에서 <b>(거리, 속도)</b>의 자리를 눌러 점을 찍어요.',
          hint: '은하를 고르면 그래프 위에 그 은하의 거리와 속도가 나와요. 가로축(거리)과 세로축(속도)의 눈금을 읽어 그 자리를 눌러요.',
          hold: 0.4, setup() { setView('v2'); updateCtl(); },
          status: () => '찍은 점 ' + placedN() + ' / 8',
          check: () => placedN() === 8,
          explain: '점 8개가 거의 한 직선 위에 놓였어요. 거리가 멀수록 속도가 커요.',
        },
        {
          title: '직선의 기울기 읽기', manual: true,
          goal: '<b>기울기 슬라이더</b>로 직선을 점들에 맞추고, 기울기(허블 상수)를 읽어요. 맞춘 뒤 <b>✔ 확인하기</b>를 눌러요.',
          setup() { fillPoints(); setView('v2'); S.hLine = true; updateCtl(); },
          hint: '점들이 직선 양쪽에 고르게 놓이도록 맞춰요. 점 C(50 Mpc, 3600 km/s)를 지나면 기울기는 약 70이에요.',
          check: () => (Math.abs(S.H - 70) <= 4 ? true : S.H < 66 ? '직선이 점들보다 아래에 있어요. 기울기를 더 키워 봐요.' : '직선이 점들보다 위에 있어요. 기울기를 줄여 봐요.'),
          explain: '점들을 가장 잘 지나는 직선의 기울기는 약 <b>70 km/s/Mpc</b>예요. 이 값이 <b>허블 상수 H₀</b>예요.',
        },
        {
          type: 'quiz', title: '직선이 원점을 지나는 까닭', goal: '거리-속도 직선이 <b>원점을 지나는</b> 까닭은 무엇일까요?', setup() { setView('v2'); },
          choices: ['거리가 0이면 후퇴 속도도 0이라서, 속도가 거리에 비례하기 때문이에요', '모든 은하가 같은 속도로 멀어지기 때문이에요', '우리은하가 우주의 중심이기 때문이에요', '속도가 클수록 거리가 일정하게 줄어들기 때문이에요'],
          answer: 0,
          feedback: ['', '속도가 모두 같다면 그래프는 수평선이 돼요. 거리에 비례해서 커지는 직선이에요.', '중심이라서가 아니라 어느 은하에서 보아도 이런 관계가 성립해요(다음 단계).', '거리가 멀수록 속도가 커지는 관계예요.'],
          explain: 'v = H₀ d 에서 d = 0이면 v = 0이에요. 후퇴 속도가 거리에 <b>비례</b>하기 때문에 그래프가 원점을 지나는 직선이 돼요.',
        },
      ],
    },
    {
      title: '허블 상수로 계산하기', short: '허블 상수', icon: '🧮', phase: '적용', features: ['calc'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 거리-속도 직선의 기울기가 허블 상수 H₀ ≈ 70 km/s/Mpc임을 알았어요.</div>' +
        '<p><b>v = H₀ d</b>를 이용하면 거리를 알 때 속도를, 속도를 알 때 거리를 구할 수 있어요. 스펙트럼선의 이동으로 속도(v = cz)를 구하면 <b>거리 d = v ÷ H₀</b>를 알 수 있어요.</p>' +
        '<p>계산 문제 4개를 풀고, 오른쪽 은하 모형에서 <b>관측자를 바꿔도</b> 같은 법칙이 성립하는지 확인해 봐요.</p>',
      setup() { enterLevel(2); },
      recap: 'v = H₀d 로 거리와 속도를 서로 구할 수 있어요. 어느 은하에서 보아도 먼 은하가 더 빨리 멀어져서 우주에는 중심이 없어요.',
      summary: '<ul><li><b>v = H₀ d</b>, d = v / H₀ (H₀ ≈ 70 km/s/Mpc)</li><li>d = 150 Mpc → v = 10500 km/s / v = 15000 km/s → d ≈ 214 Mpc</li><li>K선 396.6 nm → z = 0.0081, v ≈ 2440 km/s, d ≈ 35 Mpc / 412.6 nm → z = 0.0488, v ≈ 14600 km/s, d ≈ 209 Mpc</li><li>어느 은하를 관측자로 잡아도 <b>먼 은하일수록 더 빨리 멀어져요</b> → 우주 팽창에는 중심이 없고, 우리은하가 우주의 중심이 아니에요.</li></ul>',
      missions: [
        {
          title: '계산 문제 4개',
          goal: '문제 1~4를 풀어 <b>답을 쓰고 📝 기록</b>해요.',
          hint: '💡 풀이 보기를 누르면 계산 순서가 나와요. 문제 3, 4는 z → v = cz → d = v/H₀ 순서예요.',
          hold: 0.3, setup() { setView('v3'); setProb(0); },
          status: () => PROB.map((p, i) => '문제 ' + (i + 1) + ' ' + mark(S.rec3[i])).join(' · '),
          check: () => S.rec3.every(Boolean),
          explain: '<b>150 Mpc → 10500 km/s</b>, <b>15000 km/s → 약 214 Mpc</b>, 은하 1은 <b>약 35 Mpc</b>, 은하 2는 <b>약 209 Mpc</b>예요.',
        },
        {
          title: '관측자 바꾸기',
          goal: '모형에서 <b>다른 은하를 눌러</b> 관측자를 바꿔요. 서로 다른 관측자 <b>3명 이상</b>에서 같은 직선이 나오는지 확인해요.',
          hint: '은하를 누르거나 🔄 다음 관측자를 눌러요. 어느 관측자에서 보아도 거리-속도 점들이 원점을 지나는 직선 위에 있어요.',
          hold: 0.5, setup() { setView('v3'); S.obsSeen = { [S.obs]: true }; updateCtl(); },
          status: () => '살펴본 관측자 ' + Object.keys(S.obsSeen).length + ' / 3',
          check: () => Object.keys(S.obsSeen).length >= 3,
          explain: '관측자가 바뀌어도 <b>화살표는 관측자에게서 멀어지는 방향</b>이고, 먼 은하일수록 길어요. 모든 관측자에게 같은 법칙이 성립해요.',
        },
        {
          type: 'quiz', title: '우주의 중심', goal: '우리은하에서 보면 모든 먼 은하가 멀어져요. 그렇다면 <b>우리은하가 우주의 중심</b>일까요?', setup() { setView('v3'); },
          choices: ['네, 모든 은하가 우리에게서 멀어지니 우리가 중심이에요', '아니요, 어느 은하에서 보아도 먼 은하일수록 더 빨리 멀어지므로 특별한 중심이 없어요', '아니요, 우리은하는 가장 느리게 움직이는 은하라서 중심이 아니에요', '네, 허블이 우리은하가 중심이라고 확인했어요'],
          answer: 1,
          feedback: ['다른 은하에서 보아도 똑같이 보여요. 풍선 표면의 점들처럼 모든 곳이 같아요.', '', '은하의 속도는 관측자를 기준으로 달라지고, 관측자가 누구든 같은 법칙이에요.', '관측 결과는 우주에 특별한 중심이 없다는 것을 보여 줘요.'],
          explain: '풍선이 부풀 때 어느 점에서 보아도 다른 점들이 거리에 비례해 멀어지는 것과 같아요. 팽창에는 <b>중심이 없어요</b>.',
        },
      ],
    },
    {
      title: '시간 되감기와 우주의 나이', short: '우주의 나이', icon: '⏪', phase: '적용', features: ['age'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 어느 은하든 v = H₀d로 멀어진다는 것을 확인했어요.</div>' +
        '<p>모든 은하가 과거에도 <b>같은 속도</b>로 멀어졌다고 가정하고 시간을 되감아 봐요. 은하가 지금 거리 d에 오는 데 걸린 시간은 <b>t = d ÷ v = 1 ÷ H₀</b>로 거리와 상관없이 같아서, 모든 은하가 한 점에서 출발해요. 이 시간 <b>1/H₀</b>(허블 시간)을 <b>우주의 나이</b>로 어림해요.</p>' +
        '<p>1 Mpc ≈ 3.09×10¹⁹ km, 1년 ≈ 3.15×10⁷ s이므로 H₀ = 70이면 t = 3.09×10¹⁹ ÷ 70 ≈ 4.4×10¹⁷ s ≈ 140억 년이에요.</p>',
      setup() { enterLevel(3); },
      recap: '우주의 나이는 t ≈ 1/H₀ 로 어림해요. H₀ = 70이면 약 140억 년이고, H₀ = 100은 가장 오래된 구상 성단보다 어려져서 모순이에요.',
      summary: '<ul><li>은하가 같은 속도로 멀어졌다면 <b>t = d / v = 1 / H₀</b> (허블 시간) → 우주의 나이를 어림할 수 있어요.</li><li>H₀ = 70 → 약 <b>140억 년</b> / H₀ = 50 → 196억 년 / H₀ = 100 → 98억 년</li><li>가장 오래된 구상 성단의 나이는 약 130억 년이므로 우주가 이보다 어릴 수 없어요 → <b>H₀ = 100(98억 년)은 모순</b>이에요.</li><li>과거에 팽창 속도가 일정하지 않았다면 1/H₀는 <b>근사값</b>이에요.</li></ul>',
      missions: [
        {
          title: 'H₀ = 70 일 때 우주의 나이',
          goal: '<b>H₀ = 70</b>에서 되감기 슬라이더를 <b>끝까지</b> 움직여 은하들이 한 점에 모이는 것을 보고, 우주의 나이를 <b>억 년</b> 단위로 계산해 써요.',
          hint: 't = 1/H₀ = 3.09×10¹⁹ km ÷ 70 km/s ≈ 4.4×10¹⁷ s 이고, 1년 ≈ 3.15×10⁷ s 이므로 약 1.4×10¹⁰ 년 = 140억 년이에요.',
          hold: 0.5, setup() { S.ageOn = true; S.pickOn = false; S.H4 = 70; S.rewEnd = false; setView('v4'); updateCtl(); },
          status: () => '되감기 끝까지 ' + mark(S.rewEnd) + ' · 나이 계산 ' + mark(okAge()),
          check: () => S.rewEnd && okAge(),
          explain: 't = 1/H₀ = 3.09×10¹⁹ km ÷ 70 km/s ≈ 4.4×10¹⁷ s ≈ <b>1.4×10¹⁰ 년 = 140억 년</b>이에요. 되감으면 모든 은하가 한 점에 모여요.',
        },
        {
          title: '모순되는 허블 상수 찾기', manual: true,
          goal: '가장 오래된 구상 성단의 나이(약 130억 년)와 <b>모순되는 H₀</b>를 골라요. 고른 뒤 <b>✔ 확인하기</b>를 눌러요.',
          setup() { S.pickOn = true; S.pickH = null; setView('v4'); updateCtl(); },
          hint: '우주의 나이가 구상 성단의 나이보다 짧으면 모순이에요. H₀가 클수록 우주의 나이는 짧아져요.',
          check: () => (S.pickH == null ? 'H₀ 값을 하나 골라요.' : S.pickH === 100 ? true : S.pickH === 50 ? '196억 년은 구상 성단(130억 년)보다 길어서 모순이 아니에요.' : '140억 년은 구상 성단(130억 년)보다 길어서 모순이 아니에요.'),
          explain: 'H₀ = 100이면 우주의 나이가 약 98억 년인데, 가장 오래된 구상 성단(약 130억 년)보다 어려서 <b>모순</b>이에요. 그래서 H₀는 70 정도여야 해요.',
        },
        {
          type: 'quiz', title: '1/H₀는 정확한 나이일까?', goal: '과거에 팽창 속도가 <b>지금보다 더 빨랐다면</b>, 실제 우주의 나이는 1/H₀와 비교해 어떨까요?', setup() { setView('v4'); },
          choices: ['1/H₀보다 길어요', '1/H₀보다 짧아요 (같은 거리를 더 빨리 와서 시간이 덜 걸려요)', '항상 정확히 1/H₀예요', '속도와 나이는 관계가 없어요'],
          answer: 1,
          feedback: ['과거에 더 빨리 멀어졌다면 지금 거리에 도달하는 데 시간이 덜 걸려요.', '', '1/H₀는 속도가 일정하다고 가정한 근사값이에요. 속도가 변했다면 달라져요.', '같은 거리를 가는 데 걸리는 시간은 속도에 달라져요.'],
          explain: 't = d / v 에서 과거에 더 빨랐다면 같은 거리를 가는 데 시간이 덜 걸려서 실제 나이는 <b>1/H₀보다 짧아요</b>. 그래서 1/H₀는 우주의 나이를 어림하는 근사값이에요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'he-hubble-law', mount: '#game', badge: '팽창 우주 탐험가', homeHref: '../../index.html#he',
    featureLabels: { redshift: '🌈 측정 눈금 · 적색 편이 계산', plot: '📈 거리-속도 그래프 · 표준 촛불', calc: '🧮 계산 문제 · 관측자 바꾸기', age: '⏪ 시간 되감기 · 나이 막대' },
    onFeatures() { updateCtl(); },
    levels,
  });
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setView(b.dataset.view); }));

  /* ---------- 루프 ---------- */
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    S.expT += dt / 6;
    S.rewD = approach(S.rewD, S.rew, dt, 10);
    if (S.view === 'v4' && S.H4 === 70 && S.rew >= 0.995 && !S.rewEnd) { S.rewEnd = true; S.burst = 1; Sound.success(); const G = rewGeo(); parts.burst(G.x0, G.y, { count: 26, speed: 190, colors: ['#fde68a', '#fff', '#38bdf8'], gravity: 0 }); }
    if (S.view === 'v4' && S.H4 !== 70 && S.rew >= 0.995 && !S.burstDone) { /* 다른 H₀ 도 한 점에 모이는 것을 보여 줘요 */ }
    [50, 70, 100].forEach((h) => { S.barD[h] = approach(S.barD[h], AGE[h], dt, 4); });
    if (placedN() === 8 && !S.hLine) { S.hLine = true; updateCtl(); }
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    ctx.fillStyle = '#070d1f'; ctx.fillRect(0, 0, VW, VH);
    const bgG = ctx.createRadialGradient(VW * 0.25, 0, 10, VW * 0.25, 0, VH); bgG.addColorStop(0, 'rgba(70,90,200,.2)'); bgG.addColorStop(1, 'rgba(7,13,31,0)'); ctx.fillStyle = bgG; ctx.fillRect(0, 0, VW, VH);
    if (S.view === 'v1') drawV1(t, dt);
    else if (S.view === 'v2') drawV2(t, dt);
    else if (S.view === 'v3') drawV3(t, dt);
    else drawV4(t, dt);
    parts.draw(ctx);
    drawFlash(dt, S.view === 'v1' ? (PHONE ? 8 : 8) : 8);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(7,13,31,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, GAL3, DV, PROB, AGE, QG, sctGeo, spGeo, rewGeo, modPos,
    get game() { return game; },
    enterLevel, setView, setGal, setLamC, setPk, setProb, setObs, setRew, setH, updateCtl, parseNum, placePoint, recordG, recordP,
    solveG(i) { setGal(i); setLamC(GAL3[i].lam); inZ.value = String(GAL3[i].z); inV.value = String(GAL3[i].v); recordG(); },
    solveAll() { DV.forEach((g, i) => { const G = sctGeo(); S.pk = i; placePoint(i, G.gx(g.d), G.gy(g.v)); }); updateCtl(); },
  };

})();
