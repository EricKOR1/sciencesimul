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
     지구과학 Ⅲ. 태양계 천체와 별과 우주의 진화 - 특이 은하의 관측
     [12지구03-04] 외부은하의 자료를 이용하여 특이 은하의 관측적 특징을 추론
     ① 관찰: 전파·적외선·가시광선·X선으로 본 같은 은하   ② 분류: 활동성 은하 5종 · 중심 엔진 모형(시선 방향)
     ③ 분석: 스펙트럼 4종, 선폭으로 속도(v = c Δλ/λ), 적색 편이 z, 크기 한계   ④ 탐구: 은하 충돌과 별 생성 폭발
     은하 그림은 모두 합성·모식도이고, 수치는 교육용 예시 값이에요. 블랙홀 물리나 통일 모형의 세부는 다루지 않아요.
     ========================================================= */
  initStage('#070d1f', 800, 560, 600, 840, 1.25);
  const TX = (x, y, s, size, color, align, weight) => D.text(x, y, s, { size: size || 14, color: color || '#e2e8f0', align: align || 'left', weight: weight || 700 });
  const TXD = (x, y, s, size, color, align, weight) => D.text(x, y, s, { size: size || 14, color: color || '#334155', align: align || 'left', weight: weight || 700 });
  const sqrt = Math.sqrt, log10 = Math.log10, pow = Math.pow, exp = Math.exp;
  const f0 = (x) => String(Math.round(x));
  const f1 = (x) => (Math.round(x * 10) / 10).toFixed(1);
  const sig = (x, n) => { if (!isFinite(x) || x === 0) return '0'; const v = +x.toPrecision(n); return String(v).indexOf('e') >= 0 ? v.toFixed(0) : String(v); };
  const sup = (n) => String(n).replace(/-/g, '⁻').replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
  const sci = (x, n) => { if (x === 0) return '0'; const e = Math.floor(log10(Math.abs(x))); const m = x / pow(10, e); return (+m.toPrecision(n || 2)).toFixed((n || 2) - 1) + '×10' + sup(e); };
  function parseNum(str) {
    let s = String(str).trim().replace(/,/g, '').replace(/\s+/g, '').replace(/(km\/s|km|nm|AU)$/i, '');
    s = s.replace(/[⁻]/g, '-').replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(d));
    s = s.replace(/[×xX*]10\^?\(?(-?\d+)\)?/, 'e$1').replace('−', '-');
    if (/^-?[\d.]+\/[\d.]+$/.test(s)) { const p = s.split('/'); return +p[0] / +p[1]; }
    const m = /^-?(\d+\.?\d*|\.\d+)(e-?\d+)?$/i.exec(s);
    return m ? parseFloat(s) : NaN;
  }
  const mulberry = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const gauss = (x, mu, fwhm) => { const s = fwhm / 2.3548, d = (x - mu) / s; return exp(-0.5 * d * d); };

  /* ---------- 자료 (교육용 예시 값) ---------- */
  const CKM = 3.0e5;                         // 빛의 속력 (km/s)
  const HA = 656.3, HB = 486.1, O3 = 500.7, HG = 434.0;   // 실험실 파장 (nm)
  const ZQ = (562.9 - HB) / HB;              // 퀘이사 3C 273: Hβ 486.1 → 562.9 nm
  const QOBS = (lab) => lab * (1 + ZQ);
  const WID = { normal: 0.3, seyfert: 10 };  // Hα 선폭 (nm)
  const vOf = (w) => CKM * w / HA;           // v = c Δλ / λ
  const V_SEY = vOf(WID.seyfert), V_NOR = vOf(WID.normal);
  const SIZE_KM = CKM * 86400;               // 밝기가 1일 만에 변할 때 크기 한계 (km)
  const AU_KM = 1.496e8;
  const BANDS = {
    radio: { nm: '전파', col: '#f59e0b', wl: '파장 1 mm 이상', see: '양쪽으로 뻗은 제트와 거대한 로브', why: '제트 속 고에너지 전자가 내는 빛(싱크로트론 복사)', ans: '양쪽으로 뻗은 제트와 거대한 로브', tm: -0.8 },
    ir: { nm: '적외선', col: '#fb7185', wl: '파장 약 1 μm ~ 1 mm', see: '따뜻한 먼지가 내는 밝은 띠', why: '데워진 먼지가 내는 열복사', ans: '따뜻한 먼지가 내는 밝은 띠', tm: -4.9 },
    vis: { nm: '가시광선', col: '#facc15', wl: '파장 380 ~ 750 nm', see: '별빛과 어두운 먼지 띠', why: '별이 내는 빛, 먼지 띠는 빛을 가려서 어둡게 보임', ans: '별빛과 어두운 먼지 띠', tm: -6.3 },
    xray: { nm: 'X선', col: '#a78bfa', wl: '파장 약 0.01 ~ 10 nm', see: '고온 가스와 제트', why: '10⁷~10⁸ K의 고온 가스와 제트', ans: '고온 가스와 제트', tm: -9.2 },
  };
  const BAND_ORDER = ['radio', 'ir', 'vis', 'xray'];
  const ATM = [[-10, 0], [-6.6, 0], [-6.4, 0.9], [-6.0, 0.92], [-5.9, 0.5], [-5.8, 0.85], [-5.5, 0.5], [-5.3, 0.2], [-5.1, 0.7], [-4.9, 0.1], [-4.5, 0.05], [-3.6, 0.05], [-3.2, 0.3], [-2.8, 0.6], [-2.4, 0.95], [1.2, 0.95], [1.4, 0.1], [2, 0]];
  const atmAt = (lg) => { for (let i = 1; i < ATM.length; i++) if (lg <= ATM[i][0]) { const a = ATM[i - 1], b = ATM[i]; return a[1] + (b[1] - a[1]) * (lg - a[0]) / (b[0] - a[0]); } return 0; };
  const CARDS = [
    { id: 'c1', letter: '가', ty: 'radio', l: ['핵: 작고 밝은 핵', '모양: 타원 은하, 양쪽에 제트와 큰 로브', '전파 복사가 매우 강해요'] },
    { id: 'c2', letter: '나', ty: 'seyfert', l: ['핵: 매우 밝은 핵', '모양: 나선 은하', '스펙트럼: 넓은 방출선'] },
    { id: 'c3', letter: '다', ty: 'normal', l: ['핵: 평범한 밝기', '모양: 나선 은하', '스펙트럼: 별빛의 연속 스펙트럼 + 흡수선'] },
    { id: 'c4', letter: '라', ty: 'quasar', l: ['별처럼 점으로 보이는 매우 밝은 천체', '주변 은하는 거의 안 보여요', '큰 적색 편이 + 넓은 방출선'] },
    { id: 'c5', letter: '마', ty: 'collide', l: ['핵: 둘로 보이는 은하 한 쌍', '모양: 긴 꼬리와 다리', '적외선이 매우 밝고 푸른 별이 많아요'] },
  ];
  const TYPE_OPTS = [['', '고르세요'], ['seyfert', '세이퍼트 은하'], ['quasar', '퀘이사'], ['radio', '전파 은하'], ['normal', '정상 은하'], ['collide', '충돌 은하']];
  const TYPE_NAME = { seyfert: '세이퍼트 은하', quasar: '퀘이사', radio: '전파 은하', normal: '정상 은하', collide: '충돌 은하' };
  const SPEC = {
    normal: { nm: '정상 은하', col: '#94a3b8', feat: '별빛의 연속 스펙트럼 위의 좁은 흡수선·방출선' },
    seyfert: { nm: '세이퍼트 은하', col: '#22c55e', feat: '연속 스펙트럼 + 강하고 넓은 방출선 (Hβ, [O III], Hα)' },
    quasar: { nm: '퀘이사', col: '#3b82f6', feat: '푸른 쪽이 센 연속 스펙트럼 + 긴 파장으로 이동한 넓은 방출선' },
    radio: { nm: '전파 은하', col: '#f59e0b', feat: '전파 영역에서 매우 강한 복사' },
  };
  const SPEC_ORDER = ['normal', 'seyfert', 'quasar', 'radio'];
  /* 스펙트럼 모양 (상대 세기, 파장 nm) */
  function fluxOf(ty, l) {
    if (ty === 'normal') return 0.5 + 0.00035 * (l - 400) - 0.16 * gauss(l, HB, 0.3) - 0.14 * gauss(l, 589, 0.3) + 0.3 * gauss(l, HA, WID.normal) + 0.1 * gauss(l, 500.7, 0.3);
    if (ty === 'seyfert') return 0.45 + 0.0002 * (l - 400) + 0.5 * gauss(l, HB, WID.seyfert) + 0.38 * gauss(l, O3, 0.4) + 1.0 * gauss(l, HA, WID.seyfert) + 0.3 * gauss(l, HA, 0.3);
    if (ty === 'quasar') return 1.0 - 0.0011 * (l - 400) + 0.22 * gauss(l, QOBS(HG), WID.seyfert) + 0.42 * gauss(l, QOBS(HB), WID.seyfert) + 0.55 * gauss(l, QOBS(HA), WID.seyfert);
    return 0;
  }
  /* 중심 엔진 모형: 시선 각도(제트 축 기준) θ가 60° 이하이면 넓은 방출선이 보여요 */
  const TORUS_ANGLE = 60;
  /* ---------- 은하 충돌 모형 (미리 계산해 두고 재생) ----------
     두 은하의 중심(질량 점)과 그 둘레를 도는 별·가스 입자를 중력으로 계산해요 (2차원, 같은 방향으로 도는 원반).
     별 사이 거리가 매우 멀어 별끼리는 거의 부딪히지 않고, 중력 때문에 조석 꼬리가 생겨요.
     별 생성은 두 은하가 가까울수록 활발해지는 간단한 규칙(가스가 압축되는 정도)으로 정해요. */
  const CM = { NS: 420, NG: 170, DT: 0.02, SUB: 5, STEPS: 2600, EPS: 0.3, Q: 1.6, NU: -130, RF: 2.5, GAM: 0.09, KG: 0.35, DS: 2.0, PB: 0.0008, PA: 0.12, S0: 0.9 };
  function createCollision() {
    const rnd = mulberry(7), P = CM, G = 1, M = 1;
    const p = 2 * P.Q, nu = P.NU * Math.PI / 180, r0 = p / (1 + Math.cos(nu));
    const vr = Math.sqrt(2 / p) * Math.sin(nu), vt = Math.sqrt(2 / p) * (1 + Math.cos(nu));
    const er = [Math.cos(nu), Math.sin(nu)], et = [-Math.sin(nu), Math.cos(nu)];
    const R = [r0 * er[0], r0 * er[1]], V = [vr * er[0] + vt * et[0], vr * er[1] + vt * et[1]];
    const cores = [{ x: R[0] / 2, y: R[1] / 2, vx: V[0] / 2, vy: V[1] / 2 }, { x: -R[0] / 2, y: -R[1] / 2, vx: -V[0] / 2, vy: -V[1] / 2 }];
    const per = P.NS + P.NG, N = per * 2, parts = [];
    for (let gi = 0; gi < 2; gi++) for (let i = 0; i < per; i++) {
      const gas = i >= P.NS;
      let r = gas ? 0.3 + Math.sqrt(rnd()) * 0.9 : 0.12 + (-Math.log(1 - rnd() * 0.95)) * 0.33; r = Math.min(r, 1.15);
      const a = rnd() * Math.PI * 2, c = cores[gi], vc = Math.sqrt(G * M * r * r / Math.pow(r * r + P.EPS * P.EPS, 1.5));
      parts.push({ gi, gas, x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r, vx: c.vx - Math.sin(a) * vc, vy: c.vy + Math.cos(a) * vc });
    }
    const acc = (x, y) => { let ax = 0, ay = 0; for (const c of cores) { const dx = c.x - x, dy = c.y - y, d2 = dx * dx + dy * dy + P.EPS * P.EPS, k = G * M / (d2 * Math.sqrt(d2)); ax += k * dx; ay += k * dy; } return [ax, ay]; };
    const nF = Math.floor(P.STEPS / P.SUB) + 1, pos = new Float32Array(nF * N * 2), cpos = new Float32Array(nF * 4), sep = new Float32Array(nF);
    let f = 0, s = 0, result = null;
    function oneStep() {
      if (s % P.SUB === 0) {
        parts.forEach((q, i) => { pos[(f * N + i) * 2] = q.x; pos[(f * N + i) * 2 + 1] = q.y; });
        cpos[f * 4] = cores[0].x; cpos[f * 4 + 1] = cores[0].y; cpos[f * 4 + 2] = cores[1].x; cpos[f * 4 + 3] = cores[1].y;
        sep[f] = Math.hypot(cores[0].x - cores[1].x, cores[0].y - cores[1].y); f++;
      }
      const ca = cores.map((c, i) => {
        const o = cores[1 - i], dx = o.x - c.x, dy = o.y - c.y, d2 = dx * dx + dy * dy + P.EPS * P.EPS, k = G * M / (d2 * Math.sqrt(d2));
        const d = Math.sqrt(dx * dx + dy * dy), w = Math.exp(-(d / P.RF) * (d / P.RF));      // 가까울 때만 작용하는 마찰(암흑 물질 헤일로가 끼치는 영향의 간단한 모형)
        return [k * dx - P.GAM * w * (c.vx - o.vx) * 0.5, k * dy - P.GAM * w * (c.vy - o.vy) * 0.5];
      });
      cores.forEach((c, i) => { c.vx += ca[i][0] * P.DT; c.vy += ca[i][1] * P.DT; c.x += c.vx * P.DT; c.y += c.vy * P.DT; });
      const sp = Math.hypot(cores[0].x - cores[1].x, cores[0].y - cores[1].y), Dg = Math.exp(-Math.pow(sp / P.DS, 2));
      parts.forEach((q) => {
        const a = acc(q.x, q.y); q.vx += a[0] * P.DT; q.vy += a[1] * P.DT;
        if (q.gas) {       // 가스는 두 은하가 겹칠 때 서로 부딪혀 속도를 잃고 중심으로 모여요
          const d0 = Math.hypot(q.x - cores[0].x, q.y - cores[0].y), d1 = Math.hypot(q.x - cores[1].x, q.y - cores[1].y), c = d0 < d1 ? cores[0] : cores[1];
          q.vx -= P.KG * Dg * (q.vx - c.vx) * P.DT; q.vy -= P.KG * Dg * (q.vy - c.vy) * P.DT;
        }
        q.x += q.vx * P.DT; q.y += q.vy * P.DT;
      });
      s++;
    }
    function finalize() {
    // 별 생성: 가스 입자가 별로 바뀐 프레임 (conv, 안 바뀌면 -1)
    const rr = mulberry(21), conv = new Int32Array(N).fill(-1), sfr = new Float32Array(nF);
    for (let k = 0; k < nF; k++) {
      const D = Math.exp(-Math.pow(sep[k] / P.S0, 2)); let n = 0;
      for (let i = 0; i < N; i++) { if (!parts[i].gas || conv[i] >= 0) continue; if (rr() < P.PB + P.PA * D) { conv[i] = k; n++; } }
      sfr[k] = n;
    }
    const sm = new Float32Array(nF); let pk = 0;
    for (let k = 0; k < nF; k++) { let s = 0, c = 0; for (let j = -12; j <= 12; j++) if (k + j >= 0 && k + j < nF) { s += sfr[k + j]; c++; } sm[k] = s / c; if (sm[k] > sm[pk]) pk = k; }
    // 화면 배율: 입자의 85 %가 들어오는 반지름(천천히 변하게 다듬어요)
    const ext = new Float32Array(nF), hist = new Int32Array(400);
    for (let k = 0; k < nF; k++) {
      hist.fill(0); for (let i = 0; i < N; i++) { const r = Math.hypot(pos[(k * N + i) * 2], pos[(k * N + i) * 2 + 1]); hist[Math.min(399, Math.floor(r * 10))]++; }
      let acc = 0, b = 0; while (b < 399 && acc + hist[b] < N * 0.85) { acc += hist[b]; b++; } ext[k] = (b + 1) / 10;
    }
    const ext2 = new Float32Array(nF); for (let k = 0; k < nF; k++) { let m = 0; for (let j = -25; j <= 25; j++) m = Math.max(m, ext[Math.min(nF - 1, Math.max(0, k + j))]); ext2[k] = m; }
    const ext3 = new Float32Array(nF); for (let k = 0; k < nF; k++) { let a = 0, c = 0; for (let j = -20; j <= 20; j++) { const q = Math.min(nF - 1, Math.max(0, k + j)); a += ext2[q]; c++; } ext3[k] = a / c; }
    result = { N, nF, per, pos, cpos, sep, conv, sfr: sm, peak: pk, ext: ext3, gasFlag: parts.map((q) => q.gas), gi: parts.map((q) => q.gi) };
    }
    /* budgetMs 동안 계산하고, 끝나면 결과를 돌려줘요 (아직이면 null) */
    function advance(budgetMs) {
      const t0 = performance.now();
      while (!result && s <= P.STEPS) { oneStep(); if (performance.now() - t0 > budgetMs) break; }
      if (!result && s > P.STEPS) finalize();
      return result;
    }
    return { advance, get result() { return result; } };
  }
  function buildCollision() { return createCollision().advance(1e9); }

  /* ---------- 상태 ---------- */
  const S = {
    view: 'v1', fade: 0, clock: 0,
    band: 'radio', bw: { radio: 1, ir: 0, vis: 0, xray: 0 }, seen: {}, bandT: 0, match: { radio: '', ir: '', vis: '', xray: '' },
    ang: 30, angD: 30, bl: 1, seenAng: { vis: false, hid: false }, angT: 0, cardSel: ['', '', '', '', ''],
    spec: 'normal', zoom: false, qShift: 0, specF: 1,
    t4: 0, maxT: 0, play: false, pickWin: '', model: null, sbPick: null,
  };
  let game = null;
  const VIEW_LABEL = { v1: '📡 같은 은하를 네 가지 파장으로 보기', v2: '🕳️ 활동성 은하와 중심 엔진', v3: '📈 스펙트럼으로 읽는 특이 은하', v4: '💥 은하 충돌 시뮬레이션' };
  const rr2 = rr;

  /* ======================================================
     1단계: 다파장 관측 (켄타우루스 A형 은하 모식도)
     ====================================================== */
  const IMG = PHONE ? { x: 10, y: 10, w: 580, h: 436 } : { x: 12, y: 12, w: 500, h: 536 };
  const GRA = PHONE ? { x: 10, y: 458, w: 580, h: 372 } : { x: 524, y: 12, w: 264, h: 536 };
  const TJ = -0.62, UJ = [Math.cos(TJ), Math.sin(TJ)], VJ = [-Math.sin(TJ), Math.cos(TJ)];
  const rndS = mulberry(5);
  const STAR_E = Array.from({ length: 260 }, () => { const a = rndS() * TAU, r = 55 * Math.abs((rndS() + rndS() + rndS() - 1.5)) * 1.9; return [Math.cos(a) * r, Math.sin(a) * r * 0.85, 0.7 + rndS() * 1.1, 0.35 + rndS() * 0.5]; });
  const CLUMPS = Array.from({ length: 22 }, () => [(rndS() * 2 - 1) * 92, (rndS() - 0.5) * 9, 4 + rndS() * 8, 0.25 + rndS() * 0.45]);
  const BG_STARS = Array.from({ length: 90 }, () => [rndS(), rndS(), 0.5 + rndS() * 1.1, 0.2 + rndS() * 0.5]);
  const laneAng = Math.atan2(VJ[1], VJ[0]);
  function laneEllipse(cx, cy, k, rx, ry, col, a) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(laneAng); const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx * k); g.addColorStop(0, rgba(col, a)); g.addColorStop(0.65, rgba(col, a * 0.85)); g.addColorStop(1, rgba(col, 0));
    ctx.scale(1, ry / rx); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx * k, 0, TAU); ctx.fill(); ctx.restore();
  }
  function bandLayer(b, cx, cy, k, a) {
    if (a < 0.01) return;
    ctx.save(); ctx.globalAlpha = a;
    if (b === 'vis') {
      ctx.save(); ctx.translate(cx, cy); ctx.scale(1, 0.86); const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 100 * k);
      g.addColorStop(0, 'rgba(255,248,225,1)'); g.addColorStop(0.25, 'rgba(255,225,165,.82)'); g.addColorStop(0.6, 'rgba(240,170,105,.38)'); g.addColorStop(1, 'rgba(220,130,80,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 100 * k, 0, TAU); ctx.fill(); ctx.restore();
      STAR_E.forEach((s) => { ctx.globalAlpha = a * s[3]; ctx.fillStyle = '#ffe9c4'; ctx.fillRect(cx + s[0] * k, cy + s[1] * k, s[2], s[2]); });
      ctx.globalAlpha = a;
      laneEllipse(cx, cy, k, 112, 20, '#1a0f08', 0.55); laneEllipse(cx, cy, k, 104, 11, '#0d0704', 0.7);
      D.glow(cx, cy, 10 * k, '#ffffff', 0.9);
    } else if (b === 'ir') {
      ctx.save(); ctx.translate(cx, cy); ctx.scale(1, 0.86); const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 96 * k);
      g.addColorStop(0, 'rgba(255,150,90,.5)'); g.addColorStop(0.5, 'rgba(180,70,60,.25)'); g.addColorStop(1, 'rgba(120,30,50,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 96 * k, 0, TAU); ctx.fill(); ctx.restore();
      laneEllipse(cx, cy, k, 112, 22, '#ff7a2f', 0.5); laneEllipse(cx, cy, k, 100, 11, '#ffd08a', 0.75);
      CLUMPS.forEach((c) => { const x = cx + (Math.cos(laneAng) * c[0] - Math.sin(laneAng) * c[1]) * k, y = cy + (Math.sin(laneAng) * c[0] + Math.cos(laneAng) * c[1]) * k; D.glow(x, y, c[2] * k, '#ffb35a', c[3]); });
      D.glow(cx, cy, 16 * k, '#fff2c8', 0.95);
    } else if (b === 'radio') {
      ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.32)'; ctx.setLineDash([4, 5]); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(cx, cy, 78 * k, 66 * k, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
      [-1, 1].forEach((sg) => {
        const lx = cx + UJ[0] * 168 * k * sg, ly = cy + UJ[1] * 168 * k * sg;
        ctx.save(); ctx.translate(lx, ly); ctx.rotate(TJ); const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 80 * k);
        g.addColorStop(0, 'rgba(255,230,140,.95)'); g.addColorStop(0.3, 'rgba(255,140,60,.75)'); g.addColorStop(0.65, 'rgba(190,40,90,.45)'); g.addColorStop(1, 'rgba(90,20,120,0)');
        ctx.scale(1, 0.66); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 80 * k, 0, TAU); ctx.fill(); ctx.restore();
        const jg = ctx.createLinearGradient(cx, cy, lx, ly); jg.addColorStop(0, 'rgba(255,240,180,1)'); jg.addColorStop(1, 'rgba(255,150,70,.5)');
        ctx.strokeStyle = jg; ctx.lineWidth = Math.max(2, 3.4 * k); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + UJ[0] * 118 * k * sg, cy + UJ[1] * 118 * k * sg); ctx.stroke();
      });
      D.glow(cx, cy, 14 * k, '#fff0b8', 1);
    } else {
      ctx.save(); ctx.translate(cx, cy); ctx.scale(1, 0.9); const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 112 * k);
      g.addColorStop(0, 'rgba(150,130,255,.55)'); g.addColorStop(0.5, 'rgba(110,90,230,.28)'); g.addColorStop(1, 'rgba(80,60,200,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 112 * k, 0, TAU); ctx.fill(); ctx.restore();
      for (let i = 1; i <= 6; i++) { const d = 22 * i * k, al = 0.95 - i * 0.12; D.glow(cx + UJ[0] * d, cy + UJ[1] * d, (7 + (i % 2) * 3) * k, '#d6ccff', Math.max(0.15, al)); }
      for (let i = 1; i <= 3; i++) { D.glow(cx - UJ[0] * 22 * i * k, cy - UJ[1] * 22 * i * k, 6 * k, '#b4a6ff', 0.3 - i * 0.05); }
      D.glow(cx, cy, 18 * k, '#ffffff', 1);
    }
    ctx.restore();
  }
  function drawV1(t, dt) {
    const k = Math.min(IMG.w / 500, IMG.h / 536), cx = IMG.x + IMG.w / 2, cy = IMG.y + (PHONE ? 190 : 250);
    ctx.save(); rr(IMG.x, IMG.y, IMG.w, IMG.h, 16).clip();
    ctx.fillStyle = '#05070f'; ctx.fillRect(IMG.x, IMG.y, IMG.w, IMG.h);
    BAND_ORDER.forEach((b) => { const w = S.bw[b]; if (w > 0.01) { const tint = { radio: '10,16,48', ir: '40,10,14', vis: '8,10,22', xray: '26,14,60' }[b]; ctx.fillStyle = 'rgba(' + tint + ',' + w * 0.9 + ')'; ctx.fillRect(IMG.x, IMG.y, IMG.w, IMG.h); } });
    BG_STARS.forEach((s) => { ctx.fillStyle = 'rgba(255,255,255,' + s[3] * (0.3 + 0.7 * S.bw.vis) + ')'; ctx.fillRect(IMG.x + s[0] * IMG.w, IMG.y + s[1] * IMG.h, s[2], s[2]); });
    BAND_ORDER.forEach((b) => bandLayer(b, cx, cy, k, S.bw[b]));
    ctx.restore();
    ctx.strokeStyle = BANDS[S.band].col; ctx.lineWidth = 3; rr(IMG.x, IMG.y, IMG.w, IMG.h, 16).stroke();
    const B = BANDS[S.band];
    D.label(IMG.x + 14, IMG.y + 24, '켄타우루스 A형 은하 (합성 모식도)', { bg: 'rgba(15,23,42,.85)', size: PHONE ? 12 : 13, align: 'left', pad: 9 });
    D.label(IMG.x + IMG.w - 14, IMG.y + 24, B.nm + ' · ' + B.wl, { bg: B.col, color: S.band === 'vis' || S.band === 'radio' ? '#1f2937' : '#fff', size: PHONE ? 12 : 13, align: 'right', pad: 9 });
    const ny = IMG.y + IMG.h - (PHONE ? 78 : 86);
    note(IMG.x + 12, ny, IMG.w - 24, '보이는 모습: ' + B.see + '\n무엇이 빛날까? ' + B.why, PHONE ? 12.5 : 13.5, { bg: 'rgba(255,255,255,.93)', border: B.col });
    // 대기 투과 그래프
    panel(GRA.x, GRA.y, GRA.w, GRA.h, { title: '지구 대기를 지나는 정도 (개념도)', tsize: PHONE ? 14 : 13.5 });
    const x0 = GRA.x + 38, x1 = GRA.x + GRA.w - 14, y0 = GRA.y + 44, y1 = GRA.y + (PHONE ? 220 : 236);
    const gx = (lg) => x0 + (x1 - x0) * (lg + 10) / 12, gy = (v) => y1 - (y1 - y0) * v;
    ctx.save(); ctx.fillStyle = '#f8fbff'; ctx.fillRect(x0, y0, x1 - x0, y1 - y0); ctx.strokeStyle = '#e1e8f0'; ctx.lineWidth = 1.2;
    [0, 0.5, 1].forEach((v) => { ctx.beginPath(); ctx.moveTo(x0, gy(v)); ctx.lineTo(x1, gy(v)); ctx.stroke(); TXD(x0 - 6, gy(v) + 4.5, f0(v * 100) + '%', 12, '#64748b', 'right'); });
    ctx.beginPath(); ctx.moveTo(gx(-10), y1); ATM.forEach((p) => ctx.lineTo(gx(p[0]), gy(p[1]))); ctx.lineTo(gx(2), y1); ctx.closePath(); ctx.fillStyle = 'rgba(56,189,248,.22)'; ctx.fill();
    polyline(ATM.map((p) => [gx(p[0]), gy(p[1])]), '#0284c7', 2.6);
    ctx.restore();
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.8; ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
    BAND_ORDER.forEach((b) => {
      const bb = BANDS[b], xx = gx(bb.tm), on = S.band === b;
      ctx.save(); ctx.strokeStyle = bb.col; ctx.lineWidth = on ? 3.4 : 1.6; ctx.setLineDash(on ? [] : [4, 4]); ctx.beginPath(); ctx.moveTo(xx, y0); ctx.lineTo(xx, y1); ctx.stroke(); ctx.restore();
      if (on) { ctx.fillStyle = bb.col; ctx.beginPath(); ctx.arc(xx, gy(atmAt(bb.tm)), 6, 0, TAU); ctx.fill(); ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 1.5; ctx.stroke(); }
      TXD(xx, y1 + (b === 'ir' ? 32 : 17), bb.nm, PHONE ? 12.5 : 12, on ? '#0f172a' : '#64748b', 'center', 800);
    });
    TXD((x0 + x1) / 2, y1 + 50, '짧은 파장  ←  파장  →  긴 파장', 12, '#64748b', 'center', 700);
    const tv = atmAt(B.tm), msg = tv > 0.7 ? '대기를 잘 통과해서 지상 망원경으로도 관측할 수 있어요.' : tv > 0.3 ? '대기가 일부만 통과시켜요.' : '대기가 거의 흡수해서 우주 망원경이 필요해요.';
    drawWrap(GRA.x + 14, y1 + (PHONE ? 76 : 82), B.nm + ': ' + msg, GRA.w - 28, PHONE ? 13 : 13.5, { align: 'left', color: '#0f172a', weight: 800 });
    drawWrap(GRA.x + 14, y1 + (PHONE ? 118 : 146), 'X선과 대부분의 적외선은 지구 대기에 흡수돼서 우주 망원경으로 관측해요.', GRA.w - 28, PHONE ? 12.5 : 13, { align: 'left', color: '#475569', weight: 700 });
    dataTag(GRA.x + GRA.w - 8, GRA.y + GRA.h - 18, '모식도 · 예시 자료');
  }

  /* ======================================================
     2단계: 활동성 은하 카드 5장 + 중심 엔진 모형
     ====================================================== */
  const ENG = PHONE ? { x: 10, y: 10, w: 580, h: 332 } : { x: 12, y: 12, w: 300, h: 536 };
  const cardRect = (i) => (PHONE ? { x: 10, y: 350 + i * 97, w: 580, h: 92 } : { x: 322, y: 12 + i * 108, w: 466, h: 100 });
  const SP_ARMS = [1, 2, 3].map((sd) => { const r = mulberry(sd * 31), a = []; for (let arm = 0; arm < 2; arm++) for (let i = 0; i < 90; i++) { const th = r() * 5.2, rad = 0.12 * Math.exp(0.28 * th) + (r() - 0.5) * 0.05; a.push([Math.cos(th + arm * Math.PI) * rad, Math.sin(th + arm * Math.PI) * rad * 0.9, 0.7 + r() * 0.9, r() < 0.2 ? '#ffb6cc' : '#cfe0ff']); } return a; });
  const COL_TAIL = (() => { const r = mulberry(77), a = []; for (let i = 0; i < 120; i++) { const u = r(), s = r() < 0.5 ? -1 : 1; a.push([s * (0.2 + u * 0.75), (0.28 * Math.sin(u * 3.0 + (s > 0 ? 0 : 2)) * (s > 0 ? 1 : -1)) + (r() - 0.5) * 0.08, 0.7 + r() * 0.9]); } return a; })();
  function thumb(ty, x, y, s, t) {
    ctx.save(); D.shadow(() => { ctx.fillStyle = '#070d1f'; rr(x, y, s, s, 10).fill(); }, { blur: 5, y: 2, color: 'rgba(0,0,0,.4)' });
    rr(x, y, s, s, 10).clip();
    const cx = x + s / 2, cy = y + s / 2, k = s / 100;
    const spiral = (ar, nuc, rot) => { ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot); D.glow(0, 0, 40 * k, '#ffe2b0', 0.35); SP_ARMS[ar].forEach((p) => { ctx.fillStyle = p[3]; ctx.fillRect(p[0] * 40 * k, p[1] * 40 * k, p[2], p[2]); }); ctx.restore(); D.glow(cx, cy, nuc * k, '#ffffff', 0.95); };
    if (ty === 'normal') spiral(0, 9, t * 0.15);
    else if (ty === 'seyfert') { spiral(1, 9, t * 0.15); D.glow(cx, cy, 26 * k, '#9cc4ff', 0.75); D.glow(cx, cy, 12 * k, '#ffffff', 1); }
    else if (ty === 'quasar') { D.glow(cx, cy, 34 * k, '#8fb4ff', 0.55); D.glow(cx, cy, 14 * k, '#ffffff', 1); ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(cx - 40 * k, cy); ctx.lineTo(cx + 40 * k, cy); ctx.moveTo(cx, cy - 40 * k); ctx.lineTo(cx, cy + 40 * k); ctx.stroke(); }
    else if (ty === 'radio') {
      D.glow(cx, cy, 24 * k, '#ffd9a0', 0.6);
      [-1, 1].forEach((sg) => { const lx = cx + sg * 31 * k, ly = cy - sg * 8 * k; D.glow(lx, ly, 22 * k, '#ff7a3d', 0.7); D.glow(lx, ly, 11 * k, '#ffe08a', 0.8); ctx.strokeStyle = 'rgba(255,225,150,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + sg * 22 * k, cy - sg * 6 * k); ctx.stroke(); });
      D.glow(cx, cy, 7 * k, '#ffffff', 1);
    } else {
      D.glow(cx - 16 * k, cy - 6 * k, 18 * k, '#ffe0a8', 0.9); D.glow(cx + 16 * k, cy + 6 * k, 18 * k, '#ffe0a8', 0.9);
      COL_TAIL.forEach((p) => { ctx.fillStyle = '#a9c8ff'; ctx.fillRect(cx + p[0] * 44 * k, cy + p[1] * 44 * k, p[2], p[2]); });
      D.glow(cx, cy, 20 * k, '#7fa8ff', 0.3);
    }
    ctx.restore(); ctx.strokeStyle = 'rgba(148,163,184,.5)'; ctx.lineWidth = 1.5; rr(x, y, s, s, 10).stroke();
  }
  function miniSpec(ty, x, y, w, h) {
    ctx.save(); ctx.fillStyle = '#0b1226'; rr(x, y, w, h, 7).fill(); ctx.restore();
    const pts = [];
    for (let i = 0; i <= 60; i++) {
      const u = i / 60; let v;
      if (ty === 'normal') v = 0.55 + 0.1 * u - 0.12 * (Math.abs(u - 0.2) < 0.012) - 0.1 * (Math.abs(u - 0.55) < 0.012) - 0.14 * (Math.abs(u - 0.8) < 0.012);
      else if (ty === 'seyfert') v = 0.35 + 0.05 * u + 0.35 * exp(-pow((u - 0.2) / 0.05, 2)) + 0.55 * exp(-pow((u - 0.78) / 0.06, 2)) + 0.25 * exp(-pow((u - 0.5) / 0.04, 2));
      else if (ty === 'quasar') v = 0.85 - 0.4 * u + 0.18 * exp(-pow((u - 0.34) / 0.05, 2)) + 0.3 * exp(-pow((u - 0.52) / 0.05, 2)) + 0.4 * exp(-pow((u - 0.86) / 0.06, 2));
      else if (ty === 'radio') v = 0.12 + 0.7 * u * u;
      else v = 0.3 + 0.12 * (1 - u) + 0.55 * u * u;
      pts.push([x + 6 + (w - 12) * u, y + h - 8 - (h - 18) * Math.min(1, v)]);
    }
    polyline(pts, ty === 'radio' ? '#fbbf24' : ty === 'collide' ? '#fb7185' : ty === 'quasar' ? '#93c5fd' : '#e2e8f0', 2.2);
    TX(x + w / 2, y + h + 13, ty === 'radio' ? '전파 영역' : '파장 →', 11.5, '#94a3b8', 'center', 700);
    ctx.strokeStyle = 'rgba(148,163,184,.4)'; ctx.lineWidth = 1.2; rr(x, y, w, h, 7).stroke();
  }
  function drawEngine(t, dt) {
    const E = ENG, k = PHONE ? 0.8 : 1, cx = E.x + E.w / 2, cy = E.y + (PHONE ? 132 : 205);
    panel(E.x, E.y, E.w, E.h, { fill: 'rgba(12,20,48,.9)', title: '중심 엔진 모형 (단면 모식도)', tcolor: '#e2e8f0', tsize: PHONE ? 14 : 13.5 });
    // 제트
    [-1, 1].forEach((sg) => {
      const g = ctx.createLinearGradient(cx, cy, cx, cy - sg * 118 * k); g.addColorStop(0, 'rgba(180,220,255,.7)'); g.addColorStop(1, 'rgba(180,220,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(cx - 4 * k, cy); ctx.lineTo(cx - 14 * k, cy - sg * 118 * k); ctx.lineTo(cx + 14 * k, cy - sg * 118 * k); ctx.lineTo(cx + 4 * k, cy); ctx.closePath(); ctx.fill();
    });
    jets.forEach((j) => { const d = j.s * 112 * k; D.glow(cx + j.off * k * (0.3 + j.s * 0.6), cy - j.side * d, 4 * k, '#dff1ff', 0.8 * (1 - j.s)); });
    // 먼지 고리(단면: 제트 축에서 60°~120° 안쪽)
    const sec = (a0, a1, r0, r1) => { ctx.beginPath(); for (let i = 0; i <= 14; i++) { const a = (a0 + (a1 - a0) * i / 14) * Math.PI / 180; const x = cx + r1 * k * Math.sin(a), y = cy - r1 * k * Math.cos(a); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } for (let i = 14; i >= 0; i--) { const a = (a0 + (a1 - a0) * i / 14) * Math.PI / 180; ctx.lineTo(cx + r0 * k * Math.sin(a), cy - r0 * k * Math.cos(a)); } ctx.closePath(); };
    [[TORUS_ANGLE, 180 - TORUS_ANGLE], [180 + TORUS_ANGLE, 360 - TORUS_ANGLE]].forEach((r) => { ctx.save(); sec(r[0], r[1], 36, 92); const g = ctx.createRadialGradient(cx, cy, 36 * k, cx, cy, 92 * k); g.addColorStop(0, '#6b3f20'); g.addColorStop(1, '#2a1a10'); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = 'rgba(255,170,110,.5)'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore(); });
    TX(cx + 94 * k, cy + 52 * k, '먼지 고리', PHONE ? 12 : 12.5, '#f4b27c', 'left', 800);
    // 강착 원반
    ctx.save(); ctx.translate(cx, cy); const dg = ctx.createRadialGradient(0, 0, 4 * k, 0, 0, 34 * k); dg.addColorStop(0, '#ffffff'); dg.addColorStop(0.35, '#ffd27a'); dg.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.scale(1, 0.16); ctx.fillStyle = dg; ctx.beginPath(); ctx.arc(0, 0, 34 * k, 0, TAU); ctx.fill(); ctx.restore();
    D.sphere(cx, cy, 7 * k, '#05070f', { gloss: false, outline: '#fff7d0', outlineWidth: 1.6 });
    // 빠르게 도는 가스(넓은 선) — 먼지 고리 안쪽
    for (let i = 0; i < 8; i++) { const a = t * 3 + i * 0.8, r = (18 + (i % 3) * 5) * k; D.glow(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.9, 4.6 * k, '#7dd3fc', 0.9); }
    // 느린 가스(좁은 선) — 바깥
    [[-80, -88], [76, -92], [-86, 80], [82, 86]].forEach((p) => D.glow(cx + p[0] * k * 0.9, cy + p[1] * k * 0.9, 9 * k, '#4ade80', 0.35));
    TX(cx - 4 * k, cy - 120 * k, '제트', PHONE ? 12.5 : 12.5, '#bfe3ff', 'right', 800);
    TX(cx + 6 * k, cy + 15 * k, '블랙홀 + 강착 원반', PHONE ? 11.5 : 11.5, '#fde68a', 'left', 800);
    // 관측자
    const th = S.angD * Math.PI / 180, R = 124 * k, ox = cx + R * Math.sin(th), oy = cy - R * Math.cos(th);
    const blocked = S.ang > TORUS_ANGLE;
    ctx.save(); ctx.strokeStyle = blocked ? 'rgba(248,113,113,.9)' : 'rgba(74,222,128,.95)'; ctx.lineWidth = 2.4; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(cx, cy); ctx.stroke(); ctx.restore();
    ctx.save(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ox, oy, 15 * Math.max(0.8, k), 0, TAU); ctx.fill(); ctx.strokeStyle = blocked ? '#ef4444' : '#22c55e'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
    TX(ox, oy + 6, '👁', 16 * Math.max(0.8, k), '#111', 'center', 700);
    // 시선 각도 호
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(cx, cy, 52 * k, -Math.PI / 2, -Math.PI / 2 + th); ctx.stroke(); ctx.restore();
    TX(cx + 22 * k * Math.sin(th / 2 + 0.25), cy - 58 * k * Math.cos(th / 2) - 4, 'θ = ' + f0(S.ang) + '°', PHONE ? 13 : 13.5, '#fff', 'center', 800);
    D.label(cx, E.y + E.h - (PHONE ? 88 : 150), '축에서 보는 각도 θ = ' + f0(S.ang) + '°', { bg: 'rgba(255,255,255,.14)', size: 13, pad: 10 });
    // 관측되는 스펙트럼
    const sx = E.x + 14, sw = E.w - 28, sy = E.y + E.h - (PHONE ? 70 : 128), sh = PHONE ? 62 : 78;
    ctx.fillStyle = '#0b1226'; rr(sx, sy, sw, sh, 9).fill(); ctx.strokeStyle = 'rgba(148,163,184,.4)'; ctx.lineWidth = 1.4; rr(sx, sy, sw, sh, 9).stroke();
    const pts = [];
    for (let i = 0; i <= 80; i++) { const u = i / 80, v = 0.3 + 0.04 * u + 0.18 * exp(-pow((u - 0.3) / 0.012, 2)) + S.bl * 0.55 * exp(-pow((u - 0.7) / 0.1, 2)) + (0.2 + 0.05 * S.bl) * exp(-pow((u - 0.7) / 0.012, 2)); pts.push([sx + 8 + (sw - 16) * u, sy + sh - 10 - (sh - 22) * Math.min(1, v * 1.1)]); }
    polyline(pts, '#e2e8f0', 2.4);
    TX(sx + 10, sy + 14, '관측되는 스펙트럼', 12, '#cbd5e1', 'left', 800);
    TX(sx + sw - 10, sy + 14, blocked ? '좁은 선만 보여요' : '넓은 방출선이 보여요', PHONE ? 12.5 : 12.5, blocked ? '#fca5a5' : '#86efac', 'right', 800);
    TX(sx + 8 + (sw - 16) * 0.7, sy + sh + 14, 'Hα', 12, '#94a3b8', 'center', 700);
  }
  const jets = Array.from({ length: 26 }, (_, i) => ({ s: (i * 0.0385) % 1, side: i % 2 ? 1 : -1, off: (((i * 37) % 11) - 5) * 0.7 }));
  function drawCards(t) {
    CARDS.forEach((c, i) => {
      const R = cardRect(i), sel = S.cardSel[i];
      panel(R.x, R.y, R.w, R.h, { fill: 'rgba(15,23,48,.92)', r: 12, blur: 5 });
      ctx.strokeStyle = sel ? '#22c55e' : 'rgba(148,163,184,.4)'; ctx.lineWidth = sel ? 2.6 : 1.4; rr(R.x, R.y, R.w, R.h, 12).stroke();
      const ts = R.h - 12; thumb(c.ty, R.x + 8, R.y + 6, ts, t);
      D.label(R.x + 20, R.y + 16, c.letter, { bg: '#0ea5e9', size: 13, pad: 8, align: 'left' });
      const tx = R.x + ts + 20, tw = (PHONE ? R.w - ts - 20 - 138 : R.w - ts - 20 - 124);
      let yy = R.y + (PHONE ? 22 : 24);
      c.l.forEach((s) => { yy = drawWrap(tx, yy, s, tw, PHONE ? 12.5 : 13, { align: 'left', color: '#e2e8f0', lh: 1.2 }) + (PHONE ? 20 : 22); });
      miniSpec(c.ty, R.x + R.w - (PHONE ? 126 : 112), R.y + 8, PHONE ? 114 : 100, R.h - 34);
    });
  }
  function drawV2(t, dt) { drawEngine(t, dt); drawCards(t); }

  /* ======================================================
     3단계: 스펙트럼 비교와 계산
     ====================================================== */
  const PL3 = PHONE ? { x: 10, y: 10, w: 580, h: 298 } : { x: 12, y: 12, w: 776, h: 292 };
  const infoRect = (i) => (PHONE ? { x: 10, y: 318 + i * 171, w: 580, h: 163 } : { x: 12 + i * 264, y: 314, w: 248, h: 234 });
  const WAVE_COL = (l) => (l < 440 ? '#8b5cf6' : l < 490 ? '#3b82f6' : l < 565 ? '#22c55e' : l < 590 ? '#eab308' : l < 625 ? '#f97316' : l < 750 ? '#ef4444' : '#7f1d1d');
  function specPlot(ty, zoom) {
    const P = PL3, x0 = P.x + 54, x1 = P.x + P.w - 16, y0 = P.y + 50, y1 = P.y + P.h - (PHONE ? 54 : 50);
    const lo = zoom ? 646 : 400, hi = zoom ? 666 : 800, gx = (l) => x0 + (x1 - x0) * (l - lo) / (hi - lo);
    const ymax = zoom ? 1.95 : ty === 'quasar' ? 1.15 : 1.9, gy = (v) => y1 - (y1 - y0) * clamp(v / ymax, 0, 1);
    panel(P.x, P.y, P.w, P.h, { title: SPEC[ty].nm + (zoom ? ' - Hα 선 확대' : ' - 스펙트럼') + '  (예시)', tsize: PHONE ? 14 : 14.5 });
    ctx.save(); ctx.fillStyle = '#0b1226'; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    ctx.strokeStyle = 'rgba(148,163,184,.18)'; ctx.lineWidth = 1;
    const step = zoom ? 5 : 100; for (let l = Math.ceil(lo / step) * step; l <= hi; l += step) { ctx.beginPath(); ctx.moveTo(gx(l), y0); ctx.lineTo(gx(l), y1); ctx.stroke(); }
    // 무지개 띠
    const sg = ctx.createLinearGradient(x0, 0, x1, 0); for (let i = 0; i <= 10; i++) { const l = lo + (hi - lo) * i / 10; sg.addColorStop(i / 10, l < 380 || l > 750 ? 'rgba(60,60,80,.5)' : WAVE_COL(l)); }
    ctx.globalAlpha = 0.9; ctx.fillStyle = sg; ctx.fillRect(x0, y1 - 8, x1 - x0, 8); ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.rect(x0, y0 - 2, x1 - x0, y1 - y0 + 2); ctx.clip();
    const sm = clamp(S.specF, 0, 1);
    const pts = []; const st = (hi - lo) / ((x1 - x0) * (zoom ? 1 : 3));
    for (let l = lo; l <= hi + 1e-6; l += st) pts.push([gx(l), gy(fluxOf(ty, l) * sm)]);
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.lineTo(x1, y1); ctx.lineTo(x0, y1); ctx.closePath(); ctx.fillStyle = rgba(SPEC[ty].col, 0.2); ctx.fill();
    polyline(pts, SPEC[ty].col === '#94a3b8' ? '#e2e8f0' : SPEC[ty].col, 2.4);
    ctx.restore();
    ctx.save(); ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.8; ctx.strokeRect(x0, y0, x1 - x0, y1 - y0); ctx.restore();
    for (let l = Math.ceil(lo / step) * step; l <= hi; l += step) TXD(gx(l), y1 + 19, f0(l), 12.5, '#64748b', 'center');
    TXD((x0 + x1) / 2, P.y + P.h - 8, '파장 (nm)', 13, '#475569', 'center', 800);
    ctx.save(); ctx.translate(P.x + 15, (y0 + y1) / 2); ctx.rotate(-Math.PI / 2); TXD(0, 0, '상대 세기', 12.5, '#475569', 'center', 800); ctx.restore();
    const lab = (l, s, ty2, dy) => { const yy = gy(fluxOf(ty2 || ty, l) * sm); TX(gx(l), Math.max(y0 + 12, yy - 8 + (dy || 0)), s, 12.5, '#f8fafc', 'center', 800); };
    if (!zoom) {
      if (ty === 'seyfert') { lab(HB, 'Hβ'); lab(O3 + 18, '[O III]', 'seyfert', 4); lab(HA, 'Hα'); }
      else if (ty === 'normal') { ctx.save(); ctx.fillStyle = '#cbd5e1'; [HB, 589, HA].forEach((l) => { TX(gx(l), y0 + 14, l === HB ? 'Hβ' : l === HA ? 'Hα' : 'Na', 12.5, '#cbd5e1', 'center', 700); }); ctx.restore(); TX(x1 - 8, y0 + 32, '선의 폭이 아주 좁아요 (0.3 nm)', 12.5, '#cbd5e1', 'right', 700); }
      else if (ty === 'quasar') {
        [[HG, 'Hγ'], [HB, 'Hβ'], [HA, 'Hα']].forEach(([l, nm]) => {
          const ob = QOBS(l), cur = l + (ob - l) * S.qShift;
          ctx.save(); ctx.setLineDash([3, 4]); ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(gx(l), y0 + 22); ctx.lineTo(gx(l), y1); ctx.stroke(); ctx.restore();
          D.arrow(gx(l), y0 + 36 + (nm === 'Hα' ? 14 : 0), gx(cur), y0 + 36 + (nm === 'Hα' ? 14 : 0), { color: '#fbbf24', width: 2.2, head: 8 });
          TX(gx(l), y0 + 16, nm + ' 실험실 ' + sig(l, 4) + ' nm', 11.5, '#e2e8f0', 'center', 700);
        });
        TX(gx(QOBS(HB)), y1 - 14 - 10, '관측 562.9 nm', 12.5, '#fde68a', 'center', 800);
      } else {
        // 전파 은하: 다른 그림은 drawRadioSpec
      }
    } else {
      const w = WID[ty];
      const hy = gy(ty === 'seyfert' ? 0.45 + 0.0002 * (HA - 400) + 0.5 : 0.5 + 0.00035 * (HA - 400) + 0.15);
      ctx.save(); ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(gx(HA - w / 2), hy); ctx.lineTo(gx(HA + w / 2), hy); ctx.stroke();
      [-1, 1].forEach((sg2) => { ctx.beginPath(); ctx.moveTo(gx(HA + sg2 * w / 2), hy - 6); ctx.lineTo(gx(HA + sg2 * w / 2), hy + 6); ctx.stroke(); }); ctx.restore();
      D.label(gx(HA) + (ty === 'seyfert' ? 0 : 60), hy - (ty === 'seyfert' ? 18 : 26), '선폭 Δλ = ' + w + ' nm', { bg: '#78350f', color: '#fde68a', size: 13.5, pad: 9 });
      TX(gx(HA), y1 - 16, 'Hα 656.3 nm', 12.5, '#e2e8f0', 'center', 800);
    }
    return { x0, x1, y0, y1, gx, gy };
  }
  function drawRadioSpec() {
    const P = PL3, x0 = P.x + 54, x1 = P.x + P.w - 16, y0 = P.y + 50, y1 = P.y + P.h - (PHONE ? 54 : 50);
    panel(P.x, P.y, P.w, P.h, { title: '전파 은하 - 전파 영역의 복사 (예시)', tsize: PHONE ? 14 : 14.5 });
    ctx.save(); ctx.fillStyle = '#0b1226'; ctx.fillRect(x0, y0, x1 - x0, y1 - y0); ctx.restore();
    const gx = (lg) => x0 + (x1 - x0) * (lg + 3) / 4, gy = (lg) => y1 - (y1 - y0) * (lg + 6) / 7;
    ctx.save(); ctx.strokeStyle = 'rgba(148,163,184,.18)'; ctx.lineWidth = 1;
    [-3, -2, -1, 0, 1].forEach((l) => { ctx.beginPath(); ctx.moveTo(gx(l), y0); ctx.lineTo(gx(l), y1); ctx.stroke(); });
    for (let v = -6; v <= 1; v++) { ctx.beginPath(); ctx.moveTo(x0, gy(v)); ctx.lineTo(x1, gy(v)); ctx.stroke(); }
    ctx.restore();
    const line = (off, col, w) => { const pts = []; for (let lg = -3; lg <= 1.001; lg += 0.05) pts.push([gx(lg), gy(0.7 * lg + off)]); polyline(pts, col, w); };
    const sm = clamp(S.specF, 0, 1);
    ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0); ctx.clip();
    ctx.globalAlpha = sm; line(-3, '#94a3b8', 2.4); line(0, '#fbbf24', 3.2); ctx.restore();
    ctx.save(); ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.8; ctx.strokeRect(x0, y0, x1 - x0, y1 - y0); ctx.restore();
    [[-3, '1 mm'], [-2, '1 cm'], [-1, '10 cm'], [0, '1 m'], [1, '10 m']].forEach(([lg, s]) => TXD(gx(lg), y1 + 19, s, 12.5, '#64748b', 'center'));
    TXD((x0 + x1) / 2, P.y + P.h - 8, '파장 (전파 영역, 로그 눈금)', 13, '#475569', 'center', 800);
    ctx.save(); ctx.translate(P.x + 15, (y0 + y1) / 2); ctx.rotate(-Math.PI / 2); TXD(0, 0, '상대 세기 (로그)', 12.5, '#475569', 'center', 800); ctx.restore();
    D.label(gx(-1.2), gy(0.7 * -1.2) - 22, '전파 은하', { bg: '#78350f', color: '#fde68a', size: 13, pad: 9 });
    D.label(gx(-0.2), gy(0.7 * -0.2 - 3) - 22, '정상 은하 (비교)', { bg: '#334155', size: 13, pad: 9 });
    TX(x1 - 8, y0 + 16, '전파 영역에서 매우 강한 복사', 12.5, '#fde68a', 'right', 800);
  }
  const okV = () => { const v = parseNum($('#inV').value); return isFinite(v) && Math.abs(v - V_SEY) / V_SEY <= 0.04; };
  const okZ = () => { const v = parseNum($('#inZ').value); return isFinite(v) && Math.abs(v - ZQ) <= 0.004; };
  const okS = () => { const v = parseNum($('#inS').value); return isFinite(v) && Math.abs(v - SIZE_KM) / SIZE_KM <= 0.04; };
  function infoCard(i, title, lines, big, ok) {
    const R = infoRect(i);
    panel(R.x, R.y, R.w, R.h, { title, tsize: PHONE ? 14 : 14 });
    let y = R.y + 44;
    lines.forEach((s) => { y = drawWrap(R.x + 12, y, s, R.w - 24, PHONE ? 13 : 13, { align: 'left', color: '#334155' }) + (PHONE ? 20 : 20); });
    const by = R.y + R.h - (PHONE ? 30 : 36);
    ctx.save(); ctx.fillStyle = ok ? '#dcfce7' : '#f1f5f9'; rr(R.x + 10, by - 22, R.w - 20, 34, 10).fill(); ctx.strokeStyle = ok ? '#16a34a' : '#cbd5e1'; ctx.lineWidth = 1.8; rr(R.x + 10, by - 22, R.w - 20, 34, 10).stroke(); ctx.restore();
    TXD(R.x + R.w / 2, by + 1, big, PHONE ? 15 : 15, ok ? '#15803d' : '#64748b', 'center', 800);
  }
  function drawV3(t, dt) {
    if (S.spec === 'radio') drawRadioSpec(); else specPlot(S.spec, S.zoom && (S.spec === 'normal' || S.spec === 'seyfert'));
    infoCard(0, '선폭 → 속도', ['v = c × Δλ / λ', 'Hα λ = 656.3 nm, c = 3.0×10⁵ km/s', '정상 은하 Δλ 0.3 nm → 약 ' + f0(Math.round(V_NOR / 10) * 10) + ' km/s', '세이퍼트 은하 Δλ 10 nm → ?'], okV() ? '약 ' + f0(Math.round(V_SEY / 10) * 10) + ' km/s' : '? km/s', okV());
    infoCard(1, '적색 편이 z', ['z = (λ관측 − λ실험실) / λ실험실', '퀘이사 3C 273의 Hβ', '실험실 486.1 nm → 관측 562.9 nm'], okZ() ? 'z = ' + sig(ZQ, 3) : 'z = ?', okZ());
    infoCard(2, '발광 영역의 크기 한계', ['밝기가 1일 만에 변해요 (1일 = 86400 s)', '크기 ≤ 빛이 1일 동안 가는 거리', '= c × 1일'], okS() ? '≈ ' + sci(SIZE_KM, 2) + ' km (약 ' + f0(Math.round(SIZE_KM / AU_KM / 10) * 10) + ' AU)' : '크기 ≤ ? km', okS());
  }

  /* ======================================================
     4단계: 은하 충돌 시뮬레이션 (미리 계산한 결과를 재생)
     ====================================================== */
  const IM4 = PHONE ? { x: 10, y: 10, w: 580, h: 392 } : { x: 12, y: 12, w: 500, h: 536 };
  const GR4 = PHONE ? { x: 10, y: 412, w: 580, h: 224 } : { x: 524, y: 12, w: 264, h: 292 };
  const LG4 = PHONE ? { x: 10, y: 646, w: 580, h: 184 } : { x: 524, y: 314, w: 264, h: 234 };
    let collider = null;
  function ensureModel() { if (!S.model) { if (!collider) collider = createCollision(); S.model = collider.advance(1e9); } return S.model; }
  const frameF = () => { const M = ensureModel(); return clamp(S.t4, 0, 1) * (M.nF - 1); };
  function counts(fi) { const M = S.model; let nb = 0, gas = 0; for (let i = 0; i < M.N; i++) { if (!M.gasFlag[i]) continue; if (M.conv[i] >= 0 && M.conv[i] <= fi) nb++; else gas++; } return { nb, gas }; }
  const cA = (x) => 'rgba(' + x + ')';
  function drawV4(t, dt) {
    const M = ensureModel(), f = frameF(), fi = Math.floor(f), fj = Math.min(M.nF - 1, fi + 1), u = f - fi;
    const cx = IM4.x + IM4.w / 2, cy = IM4.y + IM4.h / 2, SC4 = clamp(IM4.w * 0.46 / (M.ext[fi] * (1 - u) + M.ext[fj] * u + 0.6), 20, PHONE ? 50 : 52);
    ctx.save(); rr(IM4.x, IM4.y, IM4.w, IM4.h, 16).clip();
    const bg = ctx.createRadialGradient(cx, cy, 10, cx, cy, IM4.w * 0.7); bg.addColorStop(0, '#0b1230'); bg.addColorStop(1, '#03050d'); ctx.fillStyle = bg; ctx.fillRect(IM4.x, IM4.y, IM4.w, IM4.h);
    BG_STARS.forEach((s) => { ctx.fillStyle = 'rgba(255,255,255,' + s[3] * 0.6 + ')'; ctx.fillRect(IM4.x + s[0] * IM4.w, IM4.y + s[1] * IM4.h, s[2], s[2]); });
    ctx.globalCompositeOperation = 'lighter';
    const px = (i) => cx + (M.pos[(fi * M.N + i) * 2] * (1 - u) + M.pos[(fj * M.N + i) * 2] * u) * SC4, py = (i) => cy + (M.pos[(fi * M.N + i) * 2 + 1] * (1 - u) + M.pos[(fj * M.N + i) * 2 + 1] * u) * SC4;
    // 가스 (아직 별이 되지 않은 것)
    ctx.fillStyle = 'rgba(176,130,255,.26)';
    for (let i = 0; i < M.N; i++) if (M.gasFlag[i] && !(M.conv[i] >= 0 && M.conv[i] <= fi)) { const x = px(i), y = py(i); ctx.beginPath(); ctx.arc(x, y, 3.6, 0, TAU); ctx.fill(); }
    // 늙은 별
    ctx.fillStyle = 'rgba(255,226,175,.55)';
    for (let i = 0; i < M.N; i++) if (!M.gasFlag[i]) ctx.fillRect(px(i) - 1, py(i) - 1, 2.2, 2.2);
    // 새로 태어난 별: 푸른색 → 시간이 지나면 노란색
    for (let i = 0; i < M.N; i++) {
      if (!(M.gasFlag[i] && M.conv[i] >= 0 && M.conv[i] <= fi)) continue;
      const age = (f - M.conv[i]) / 170, x = px(i), y = py(i);
      if (age < 0.12) { ctx.fillStyle = 'rgba(190,225,255,.5)'; ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU); ctx.fill(); }
      ctx.fillStyle = age < 0.5 ? 'rgba(120,175,255,.8)' : age < 1 ? 'rgba(200,215,255,.6)' : 'rgba(255,226,175,.55)';
      ctx.fillRect(x - 1.2, y - 1.2, age < 0.5 ? 2.8 : 2.2, age < 0.5 ? 2.8 : 2.2);
    }
    // 중심
    [0, 1].forEach((c) => { const x = cx + (M.cpos[fi * 4 + c * 2] * (1 - u) + M.cpos[fj * 4 + c * 2] * u) * SC4, y = cy + (M.cpos[fi * 4 + c * 2 + 1] * (1 - u) + M.cpos[fj * 4 + c * 2 + 1] * u) * SC4; D.glow(x, y, 15, '#fff2c8', 0.9); });
    ctx.restore();
    ctx.strokeStyle = 'rgba(148,163,184,.6)'; ctx.lineWidth = 2; rr(IM4.x, IM4.y, IM4.w, IM4.h, 16).stroke();
    D.label(IM4.x + 14, IM4.y + 24, '나선 은하 2개의 충돌 (모형)', { bg: 'rgba(15,23,42,.85)', size: PHONE ? 12 : 13, align: 'left', pad: 9 });
    D.label(IM4.x + IM4.w - 14, IM4.y + 24, '시간 ' + f0(S.t4 * 100) + '%', { bg: 'rgba(14,165,233,.9)', size: 13, align: 'right', pad: 9 });
    // 적외선 밝기 그래프
    panel(GR4.x, GR4.y, GR4.w, GR4.h, { title: '적외선 밝기 (별 생성률에 비례)', tsize: PHONE ? 13.5 : 13 });
    const x0 = GR4.x + 40, x1 = GR4.x + GR4.w - 14, y0 = GR4.y + 44, y1 = GR4.y + GR4.h - (PHONE ? 40 : 44), ymax = M.sfr[M.peak] * 1.3;
    ctx.save(); ctx.fillStyle = '#f8fbff'; ctx.fillRect(x0, y0, x1 - x0, y1 - y0); ctx.strokeStyle = '#e1e8f0'; ctx.lineWidth = 1.2;
    [0.25, 0.5, 0.75].forEach((v) => { ctx.beginPath(); ctx.moveTo(x0, y1 - (y1 - y0) * v); ctx.lineTo(x1, y1 - (y1 - y0) * v); ctx.stroke(); });
    const lim = Math.floor(clamp(S.maxT, 0, 1) * (M.nF - 1)), pts = [];
    for (let k = 0; k <= lim; k += 2) pts.push([x0 + (x1 - x0) * k / (M.nF - 1), y1 - (y1 - y0) * clamp(M.sfr[k] / ymax, 0, 1)]);
    if (pts.length > 1) { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.lineTo(pts[pts.length - 1][0], y1); ctx.lineTo(x0, y1); ctx.closePath(); ctx.fillStyle = 'rgba(251,146,60,.25)'; ctx.fill(); polyline(pts, '#ea580c', 3); }
    const hx = x0 + (x1 - x0) * clamp(S.t4, 0, 1);
    ctx.strokeStyle = '#0ea5e9'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(hx, y0); ctx.lineTo(hx, y1); ctx.stroke();
    if (S.t4 <= S.maxT + 1e-6) { const hv = M.sfr[Math.round(f)]; ctx.fillStyle = '#ea580c'; ctx.beginPath(); ctx.arc(hx, y1 - (y1 - y0) * clamp(hv / ymax, 0, 1), 5.5, 0, TAU); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); }
    ctx.restore(); ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.8; ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
    ctx.save(); ctx.translate(GR4.x + 14, (y0 + y1) / 2); ctx.rotate(-Math.PI / 2); TXD(0, 0, '밝기 (상대)', 12.5, '#475569', 'center', 800); ctx.restore();
    TXD((x0 + x1) / 2, GR4.y + GR4.h - 10, '시간 (충돌 시작 → 병합 후)', 12.5, '#475569', 'center', 800);
    if (S.maxT < 0.02) TXD((x0 + x1) / 2, (y0 + y1) / 2, '▶ 충돌을 실행하면 그려져요', 13.5, '#94a3b8', 'center', 800);
    // 범례와 숫자
    panel(LG4.x, LG4.y, LG4.w, LG4.h, { title: '지금 은하의 모습' });
    const cn = counts(fi), ly = LG4.y + 46, dx = PHONE ? 190 : 0;
    const row = (i, col, txt) => { const yy = ly + i * 24; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(LG4.x + 22 + (PHONE ? (i % 2) * 290 : 0), (PHONE ? ly + Math.floor(i / 2) * 26 : yy) - 4, 6, 0, TAU); ctx.fill(); TXD(LG4.x + 36 + (PHONE ? (i % 2) * 290 : 0), (PHONE ? ly + Math.floor(i / 2) * 26 : yy), txt, PHONE ? 13 : 13, '#334155', 'left', 700); };
    row(0, '#f5d9a6', '늙은 별 (노란색)'); row(1, '#c3a2ff', '가스 (보라색)'); row(2, '#7fb2ff', '새로 태어난 푸른 별'); row(3, '#f59e0b', '두 은하의 중심');
    TXD(LG4.x + 14, LG4.y + LG4.h - (PHONE ? 48 : 58), '새로 태어난 별: ' + cn.nb + '개', 14.5, '#1d4ed8', 'left', 800);
    TXD(LG4.x + 14, LG4.y + LG4.h - (PHONE ? 24 : 34), '남은 가스 입자: ' + cn.gas + '개', 14.5, '#7c3aed', 'left', 800);
  }

  /* ======================================================
     컨트롤 연결
     ====================================================== */
  const modeSeg = $('#modeSeg'), sAng = $('#sAng'), oAng = $('#oAng'), sT4 = $('#sT4'), oT4 = $('#oT4');
  const BAND_OPTS = [['', '고르세요']].concat(BAND_ORDER.map((b) => [b, BANDS[b].ans]));
  $('#bandRows').innerHTML = BAND_ORDER.map((b, i) => '<div class="row-sel"><b>' + BANDS[b].nm.replace('가시광선', '가시') + '</b><select class="mini-sel" data-b="' + b + '" aria-label="' + BANDS[b].nm + '으로 보이는 구조">' + BAND_OPTS.map((o) => '<option value="' + o[0] + '">' + o[1] + '</option>').join('') + '</select></div>').join('');
  $('#cardRows').innerHTML = CARDS.map((c, i) => '<div class="row-sel"><b>' + c.letter + '</b><select class="mini-sel" data-i="' + i + '" aria-label="카드 ' + c.letter + '의 유형">' + TYPE_OPTS.map((o) => '<option value="' + o[0] + '">' + o[1] + '</option>').join('') + '</select></div>').join('');
  const SB_OPTS = [['A', '푸른 별이 거의 없고 적외선이 약한 붉은 타원 은하'], ['B', '적외선이 매우 밝고 푸른 별 무리가 많은 충돌 은하'], ['C', '밝은 핵과 넓은 방출선이 있는 나선 은하']];
  $('#sbRows').innerHTML = SB_OPTS.map((o) => '<button class="opt" type="button" data-k="' + o[0] + '" style="text-align:left;font-size:14px"><b>' + o[0] + '</b> ' + o[1] + '</button>').join('');

  function setView(v) { if (S.view !== v) { S.view = v; S.fade = 1; parts.clear(); } updateCtl(); }
  function updateCtl() {
    $('#tbLabel').textContent = VIEW_LABEL[S.view];
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !c.dataset.modes.split(' ').includes(S.view); });
    const free = !!(game && game.free);
    $('#matchBox').hidden = !(S.view === 'v1' && (S.matchOn || free));
    $('#cardBox').hidden = !(S.view === 'v2' && (S.cardOn || free));
    $('#vBox').hidden = !(S.view === 'v3' && (S.vOn || free));
    $('#zBox').hidden = !(S.view === 'v3' && (S.zOn || free));
    $('#sbBox').hidden = !(S.view === 'v4' && (S.sbOn || free));
    $('#zoomBox').hidden = !(S.view === 'v3' && (S.spec === 'normal' || S.spec === 'seyfert'));
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.view === S.view));
    if (modeSeg) modeSeg.hidden = !free;
    $$('#bandSeg .opt').forEach((b) => { b.classList.toggle('on', b.dataset.b === S.band); b.classList.toggle('good', !!S.seen[b.dataset.b]); });
    $$('#specSeg .opt').forEach((b) => b.classList.toggle('on', b.dataset.k === S.spec));
    $('#bZoom').classList.toggle('on', S.zoom); $('#bZoom').textContent = S.zoom ? '🔍 확대 중 (누르면 전체)' : '🔍 Hα 선 확대하기';
    $$('#sbRows .opt').forEach((b) => { b.classList.toggle('on', S.sbPick === b.dataset.k); });
    $('#bPlay').textContent = S.play ? '⏸ 멈춤' : (S.t4 >= 0.999 ? '↺ 다시 실행' : '▶ 충돌 실행');
  }
  /* 1단계 */
  function setBand(b) { if (!BANDS[b]) return; S.band = b; S.bandT = 0; updateCtl(); }
  $$('#bandSeg .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); setBand(b.dataset.b); }));
  $$('#bandRows select').forEach((s) => s.addEventListener('change', () => { Sound.click(); S.match[s.dataset.b] = s.value; }));
  /* 2단계 */
  const angOut = (v) => v + '°';
  sAng.addEventListener('input', () => { S.ang = +sAng.value; sAng.style.setProperty('--pct', (S.ang / 90 * 100) + '%'); oAng.textContent = angOut(S.ang); });
  function setAng(v) { S.ang = v; setSlider(sAng, oAng, v, angOut); }
  $$('#cardRows select').forEach((s) => s.addEventListener('change', () => { Sound.click(); S.cardSel[+s.dataset.i] = s.value; }));
  /* 3단계 */
  function setSpec(k) { S.spec = k; S.specF = 0; S.qShift = 0; if (k !== 'normal' && k !== 'seyfert') S.zoom = false; updateCtl(); }
  $$('#specSeg .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); setSpec(b.dataset.k); }));
  $('#bZoom').addEventListener('click', () => { Sound.click(); S.zoom = !S.zoom; S.specF = 0; updateCtl(); });
  ['inV', 'inZ', 'inS'].forEach((id) => $('#' + id).addEventListener('input', () => {}));
  /* 4단계 */
  const t4Out = (v) => f0(v / 10) + '%';
  sT4.addEventListener('input', () => { S.t4 = +sT4.value / 1000; S.play = false; S.maxT = Math.max(S.maxT, S.t4); sT4.style.setProperty('--pct', (+sT4.value / 10) + '%'); oT4.textContent = t4Out(+sT4.value); updateCtl(); });
  function setT4(v) { S.t4 = clamp(v, 0, 1); setSlider(sT4, oT4, Math.round(S.t4 * 1000), t4Out); }
  $('#bPlay').addEventListener('click', () => {
    Sound.click(); ensureModel();
    if (S.t4 >= 0.999) { S.maxT = 0; setT4(0); }
    S.play = !S.play; updateCtl();
  });
  $('#bRestart').addEventListener('click', () => { Sound.click(); S.play = false; S.maxT = 0; setT4(0); updateCtl(); });
  $$('#sbRows .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.sbPick = b.dataset.k; updateCtl(); }));

  /* ---------- 읽기 칸 ---------- */
  function readouts() {
    const v = S.view;
    if (v === 'v1') { const B = BANDS[S.band]; setReadouts(['보는 파장', B.nm, '빛나는 것', B.see, '살펴본 파장', Object.keys(S.seen).filter((k) => S.seen[k]).length + ' / 4']); }
    else if (v === 'v2') setReadouts(['시선 각도 θ', f0(S.ang) + '°', '넓은 방출선', S.ang <= TORUS_ANGLE ? '보여요' : '안 보여요', '분류한 카드', S.cardSel.filter(Boolean).length + ' / 5']);
    else if (v === 'v3') {
      const sp = S.spec;
      setReadouts(['고른 스펙트럼', SPEC[sp].nm, sp === 'quasar' ? 'Hβ 관측 파장' : sp === 'radio' ? '관측한 파장 영역' : 'Hα 선폭', sp === 'quasar' ? '562.9 nm' : sp === 'radio' ? '전파' : WID[sp] + ' nm', '특징', sp === 'seyfert' ? '넓은 방출선' : sp === 'quasar' ? '큰 적색 편이' : sp === 'radio' ? '강한 전파' : '좁은 선']);
    } else { const M = ensureModel(), fi = Math.round(frameF()); setReadouts(['경과 시간', f0(S.t4 * 100) + '%', '새로 태어난 별', counts(fi).nb + '개', '적외선 밝기', f1(M.sfr[fi] / M.sfr[M.peak] * 100) + '%']); }
  }

  /* ======================================================
     단계 · 미션
     ====================================================== */
  function enterLevel(li) {
    clearTimeout(hintTimer); parts.clear(); flash.t = 0; S.play = false;
    if (li === 0) { S.seen = {}; S.match = { radio: '', ir: '', vis: '', xray: '' }; S.matchOn = false; $$('#bandRows select').forEach((s) => { s.value = ''; }); S.bw = { radio: 0, ir: 0, vis: 0, xray: 0 }; setBand('radio'); setView('v1'); showHint('파장 버튼을 눌러 같은 은하를 바꿔 봐요', 5000); }
    else if (li === 1) { S.cardOn = false; S.cardSel = ['', '', '', '', '']; $$('#cardRows select').forEach((s) => { s.value = ''; }); S.seenAng = { vis: false, hid: false }; S.angT = 0; setAng(30); S.angD = 30; setView('v2'); showHint('카드를 살펴보고 시선 각도 슬라이더를 움직여 봐요', 5000); }
    else if (li === 2) { S.vOn = false; S.zOn = false; ['inV', 'inZ', 'inS'].forEach((id) => { $('#' + id).value = ''; }); S.zoom = false; setSpec('normal'); setView('v3'); showHint('스펙트럼을 비교해 봐요', 5000); }
    else { S.sbOn = false; S.sbPick = null; S.maxT = 0; setT4(0); setView('v4'); showHint('▶ 충돌 실행을 눌러 두 은하가 만나게 해요', 5000); }
    updateCtl();
  }
  const tbl = (rows) => '<table class="mini">' + rows.map((r, i) => '<tr>' + r.map((c) => (i === 0 ? '<th>' : '<td>') + c + (i === 0 ? '</th>' : '</td>')).join('') + '</tr>').join('') + '</table>';
  const bandsOK = () => BAND_ORDER.map((b) => S.match[b] === b);
  const cardsOK = () => CARDS.map((c, i) => S.cardSel[i] === c.ty);
  const peakT = () => ensureModel().peak / (ensureModel().nF - 1);

  const levels = [
    {
      title: '다파장 관측: 같은 은하, 다른 모습', short: '다파장 관측', icon: '📡', phase: '관찰', features: ['bands'],
      intro: '<p class="si-q">❓ 탐구 질문: 별처럼 점으로 보이는데 은하 전체보다 밝은 천체는 무엇이며, 은하는 어떻게 다른 모습으로 보일까?</p>' +
        '<div class="si-link">🔗 <b>통합과학에서</b> 빛을 파장별로 나눈 스펙트럼과 흡수선·방출선을 배웠어요. 앞 차시에서는 허블의 분류로 보통의 은하를 살펴봤어요.</div>' +
        '<p>어떤 은하는 중심(핵)에서 <b>은하 전체보다 훨씬 많은 에너지</b>를 내요. 이런 <b>특이 은하</b>를 알아보려면 가시광선뿐 아니라 <b>전파·적외선·X선</b>으로도 관측해야 해요.</p>' +
        '<p>같은 은하(켄타우루스 A형, 모식도)를 <b>전파 · 적외선 · 가시광선 · X선</b>으로 바꿔 보며 무엇이 달라 보이는지 확인해요.</p>',
      setup() { enterLevel(0); },
      recap: '파장마다 빛나는 대상이 달라서, 여러 파장으로 관측해야 은하의 모습을 제대로 알 수 있어요.',
      summary: '<ul><li><b>전파</b>: 은하 양쪽으로 뻗은 <b>제트와 거대한 로브</b>(고에너지 전자의 싱크로트론 복사)</li><li><b>적외선</b>: 데워진 <b>먼지 띠</b>와 별 생성 지역</li><li><b>가시광선</b>: 별빛과, 빛을 가려 어둡게 보이는 먼지 띠</li><li><b>X선</b>: 제트와 10⁷~10⁸ K의 <b>고온 가스</b></li><li>지구 대기는 <b>X선과 대부분의 적외선</b>을 흡수해서 <b>우주 망원경</b>이 필요해요.</li></ul>',
      missions: [
        {
          title: '파장별로 보이는 구조',
          goal: '<b>네 파장을 모두 보고</b>, 파장마다 보이는 구조를 짝지어요.',
          hint: '파장 버튼을 눌러 은하를 바꿔 봐요. 각각 0.5초 이상 보여야 "살펴봄"으로 쳐요. 짝짓기 칸은 네 파장을 모두 본 뒤 열려요.',
          hold: 0.5, setup() { S.matchOn = false; setView('v1'); updateCtl(); },
          status: () => '살펴봄 ' + BAND_ORDER.map((b) => BANDS[b].nm + mark(!!S.seen[b])).join(' ') + ' · 짝짓기 ' + bandsOK().filter(Boolean).length + '/4',
          check: () => BAND_ORDER.every((b) => S.seen[b]) && bandsOK().every(Boolean),
          explain: '<b>전파</b>: 제트와 로브, <b>적외선</b>: 따뜻한 먼지 띠, <b>가시광선</b>: 별빛과 어두운 먼지 띠, <b>X선</b>: 고온 가스와 제트예요.',
        },
        {
          type: 'quiz', title: '여러 파장으로 관측하는 까닭', goal: '특이 은하를 <b>여러 파장</b>으로 관측하는 까닭과, X선 관측에 <b>우주 망원경</b>이 필요한 까닭을 가장 잘 설명한 것은?', setup() { setView('v1'); },
          choices: ['파장이 다르면 은하의 크기가 달라지기 때문이에요. 우주 망원경은 더 크게 보이게 해 줘요', '파장마다 빛나는 물질(별, 먼지, 고온 가스, 고에너지 전자)이 달라서 모습이 달라 보여요. 또 지구 대기가 X선을 흡수해요', '한 가지 파장만으로도 모든 것을 알 수 있지만 사진이 예쁘게 나오기 때문이에요', '가시광선은 은하에서 나오지 않기 때문이에요'],
          answer: 1,
          feedback: ['은하의 크기는 변하지 않아요. 파장마다 보이는 구조가 달라지는 거예요.', '', '한 파장만으로는 제트, 고온 가스, 먼지 같은 구조를 놓쳐요.', '은하의 별들은 가시광선을 많이 내요. 가시광선으로는 별과 먼지 띠를 볼 수 있어요.'],
          explain: '별, 따뜻한 먼지, 10⁷~10⁸ K의 고온 가스, 제트 속 고에너지 전자는 서로 다른 파장의 빛을 내요. 또 지구 대기는 X선과 대부분의 적외선을 흡수하므로 <b>우주 망원경</b>이 필요해요.',
        },
      ],
    },
    {
      title: '활동성 은하: 핵이 밝은 은하', short: '활동성 은하', icon: '🕳️', phase: '탐구', features: ['agn'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 전파·적외선·X선으로 보면 은하의 중심에서 제트와 고온 가스가 보인다는 것을 확인했어요.</div>' +
        '<p><b>활동성 은하</b>의 핵은 아주 작은 영역에서 은하 전체보다 훨씬 많은 에너지를 내요(퀘이사 10¹²~10¹⁴ L☉, 우리은하 약 2×10¹⁰ L☉). 중심에는 질량이 10⁶~10¹⁰ M☉인 <b>초대질량 블랙홀</b>이 있고, 주변 가스가 <b>강착 원반</b>을 이루며 빨려 들어가면서 빛나요(우리은하 중심 블랙홀은 약 4×10⁶ M☉).</p>' +
        '<p><b>세이퍼트 은하</b>, <b>퀘이사</b>, <b>전파 은하</b>를 구별하고, 시선 방향에 따라 <b>넓은 방출선</b>이 보이는 때와 안 보이는 때를 확인해요.</p>',
      setup() { enterLevel(1); },
      recap: '활동성 은하는 중심의 초대질량 블랙홀과 강착 원반 때문에 핵이 매우 밝아요. 세이퍼트 은하, 퀘이사, 전파 은하로 나눠요.',
      summary: '<ul><li><b>세이퍼트 은하</b>: 나선 은하, 밝은 핵, 스펙트럼에 연속 스펙트럼과 강한 <b>넓은 방출선</b></li><li><b>퀘이사</b>: 별처럼 점으로 보이는 매우 밝은 핵, <b>매우 큰 적색 편이</b>, 넓은 방출선</li><li><b>전파 은하</b>: 대부분 타원 은하, 강한 전파, 양쪽으로 <b>제트와 거대한 로브</b></li><li>중심 엔진: <b>초대질량 블랙홀 + 강착 원반 + 제트</b>(+ 먼지 고리). 시선 방향에 따라 넓은 방출선이 가려질 수 있어요.</li></ul>' +
        tbl([['유형', '핵·모양', '스펙트럼'], ['세이퍼트', '나선, 밝은 핵', '넓은 방출선'], ['퀘이사', '별처럼 점', '큰 적색 편이, 넓은 방출선'], ['전파 은하', '타원, 제트·로브', '강한 전파']]),
      missions: [
        {
          title: '은하 카드 5장 분류하기',
          goal: '카드 <b>가~마</b>의 핵 밝기·모양·스펙트럼을 비교해 유형을 골라요. 다 고른 뒤 <b>✔ 확인하기</b>를 눌러요.', manual: true,
          setup() { S.cardOn = true; setView('v2'); updateCtl(); },
          hint: '별처럼 점이면 퀘이사, 타원 + 제트·로브면 전파 은하, 나선 + 넓은 방출선이면 세이퍼트, 긴 꼬리와 푸른 별은 충돌 은하예요.',
          check: () => { if (S.cardSel.some((v) => !v)) return '다섯 장을 모두 골라요.'; const ok = cardsOK(); return ok.every(Boolean) ? true : (ok.filter((v) => !v).length + '장이 알맞지 않아요. 핵의 모양과 스펙트럼의 특징을 다시 살펴봐요.'); },
          explain: '<b>가</b>는 전파 은하, <b>나</b>는 세이퍼트 은하(넓은 방출선), <b>다</b>는 정상 은하, <b>라</b>는 퀘이사(점광원 + 큰 적색 편이), <b>마</b>는 충돌 은하예요.',
        },
        {
          title: '넓은 방출선이 보이는 각도 찾기',
          goal: '<b>시선 각도 θ</b> 슬라이더를 움직여 넓은 방출선이 <b>보이는 때</b>와 <b>안 보이는 때</b>를 모두 확인해요.',
          hint: 'θ는 제트 축에서 잰 각도예요. 작은 각도(위에서 봄)에서는 넓은 선이 보이고, 큰 각도(옆에서 봄)에서는 먼지 고리가 가려요.',
          hold: 0.4, setup() { S.seenAng = { vis: false, hid: false }; S.angT = 0; setView('v2'); updateCtl(); },
          status: () => '보이는 각도 ' + mark(S.seenAng.vis) + ' · 안 보이는 각도 ' + mark(S.seenAng.hid) + ' · θ = ' + f0(S.ang) + '°',
          check: () => S.seenAng.vis && S.seenAng.hid,
          explain: 'θ가 <b>약 60° 이하</b>이면 먼지 고리에 가리지 않고 핵 근처에서 빠르게 도는 가스를 볼 수 있어 <b>넓은 방출선</b>이 보여요. θ가 60°보다 크면 먼지 고리가 가려서 좁은 선만 보여요.',
        },
        {
          type: 'quiz', title: '퀘이사는 별일까?', goal: '퀘이사는 별처럼 점으로 보이지만 <b>별이 아닌</b> 까닭은 무엇일까요?', setup() { setView('v2'); },
          choices: ['점으로 보이는 천체는 모두 별이기 때문이에요', '퀘이사의 스펙트럼선은 매우 큰 적색 편이를 보이고, 아주 멀리 있는 은하의 밝은 핵이기 때문이에요', '퀘이사는 태양계 안에 있는 행성이기 때문이에요', '퀘이사는 전파만 내고 가시광선은 내지 않기 때문이에요'],
          answer: 1,
          feedback: ['점처럼 보이는 것은 아주 멀리 있기 때문일 수 있어요. 스펙트럼으로 별인지 구별해요.', '', '행성은 이렇게 큰 적색 편이를 보이지 않아요. 퀘이사는 아주 먼 곳의 천체예요.', '퀘이사는 가시광선으로도 매우 밝아서 별처럼 보여요.'],
          explain: '퀘이사의 스펙트럼선은 <b>매우 큰 적색 편이</b>를 보여요. 아주 멀리 있는데도 밝게 보이는 은하의 핵이에요. 그래서 별이 아니라 <b>활동성 은하의 핵</b>이에요(다음 단계에서 적색 편이를 계산해요).',
        },
      ],
    },
    {
      title: '스펙트럼으로 읽는 특이 은하', short: '스펙트럼', icon: '📈', phase: '분석', features: ['spectra'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 세이퍼트 은하와 퀘이사의 스펙트럼에 <b>넓은 방출선</b>이 있고, 퀘이사는 적색 편이가 매우 크다는 것을 배웠어요.</div>' +
        '<p>스펙트럼에서 읽을 수 있는 것을 계산해 봐요.</p>' +
        '<ul><li><b>선폭 → 속도</b>(도플러 효과): v = c × Δλ ÷ λ</li><li><b>적색 편이</b>: z = (λ관측 − λ실험실) ÷ λ실험실</li><li><b>크기 한계</b>: 밝기가 하루 만에 변하면 발광 영역의 크기는 빛이 하루 동안 가는 거리보다 클 수 없어요.</li></ul>',
      setup() { enterLevel(2); },
      recap: '넓은 방출선은 핵 주변 가스가 매우 빠르게 움직인다는 뜻이고, 퀘이사의 큰 적색 편이는 아주 먼 천체임을 알려 줘요. 밝기 변화 시간으로 발광 영역의 크기를 어림해요.',
      summary: '<ul><li>선폭 → 속도: <b>v = c × Δλ / λ</b>. Hα(656.3 nm)의 폭이 정상 은하 0.3 nm → 약 140 km/s, 세이퍼트 은하 10 nm → <b>약 4570 km/s</b></li><li>적색 편이: <b>z = (λ관측 − λ실험실) / λ실험실</b>. 퀘이사 3C 273의 Hβ(486.1 nm)가 562.9 nm로 관측 → <b>z = 0.158</b></li><li>크기 한계: 밝기 변화 시간이 1일이면 크기 ≤ c × 1일 = 3×10⁵ km/s × 86400 s ≈ <b>2.6×10¹⁰ km</b>(약 170 AU, 태양계 크기)</li><li>전파 은하는 전파 영역에서 매우 강한 복사를 내요.</li></ul>',
      missions: [
        {
          title: '선폭으로 속도 구하기',
          goal: '세이퍼트 은하의 Hα 선폭은 <b>10 nm</b>예요. <b>v = c × Δλ ÷ λ</b>로 핵 주변 가스의 속도(km/s)를 구해 써요.',
          hint: 'c = 3.0×10⁵ km/s, λ = 656.3 nm, Δλ = 10 nm 이므로 v = 3.0×10⁵ × 10 ÷ 656.3 이에요. 정상 은하(0.3 nm)는 약 140 km/s였어요.',
          hold: 0.4, setup() { S.vOn = true; S.zoom = true; setSpec('seyfert'); S.zoom = true; setView('v3'); updateCtl(); },
          status: () => '세이퍼트 은하의 속도 ' + mark(okV()),
          check: () => okV(),
          explain: 'v = 3.0×10⁵ km/s × 10 nm ÷ 656.3 nm ≈ <b>4570 km/s</b>예요. 정상 은하(약 140 km/s)보다 30배 이상 빨라서, 핵 주변 가스가 매우 빠르게 움직이는 것을 알 수 있어요.',
        },
        {
          title: '적색 편이와 크기 한계 계산',
          goal: '퀘이사 3C 273의 <b>적색 편이 z</b>와, 밝기가 1일 만에 변할 때의 <b>크기 한계(km)</b>를 계산해 써요.',
          hint: 'z = (562.9 − 486.1) ÷ 486.1 이에요. 크기 한계는 3.0×10⁵ km/s × 86400 s 이고, 2.6×10^10 처럼 써도 돼요.',
          hold: 0.4, setup() { S.vOn = true; S.zOn = true; S.zoom = false; setSpec('quasar'); setView('v3'); updateCtl(); },
          status: () => 'z ' + mark(okZ()) + ' · 크기 한계 ' + mark(okS()),
          check: () => okZ() && okS(),
          explain: 'z = (562.9 − 486.1) ÷ 486.1 ≈ <b>0.158</b>이에요(다음 차시에서 거리 계산에 써요). 크기 한계는 3.0×10⁵ × 86400 ≈ <b>2.6×10¹⁰ km</b>로 약 170 AU, 곧 태양계 정도의 작은 영역에서 막대한 에너지가 나와요.',
        },
        {
          type: 'quiz', title: '넓은 선폭이 알려 주는 것', goal: '세이퍼트 은하의 방출선이 <b>넓은</b> 까닭은 무엇일까요?', setup() { setView('v3'); },
          choices: ['핵 주변 가스가 매우 빠르게 움직여 도플러 효과로 파장이 넓게 퍼져요', '은하가 매우 차가워서 선이 퍼져요', '은하가 우리 쪽으로 천천히 다가오고 있어요', '선이 넓을수록 은하가 작아요'],
          answer: 0,
          feedback: ['', '온도가 낮으면 오히려 선이 좁아져요. 넓은 선은 빠른 운동 때문이에요.', '은하 전체가 다가오면 선 전체가 이동해요. 폭이 넓어지는 것은 가스 속도가 다양하기 때문이에요.', '선폭은 은하의 크기가 아니라 가스의 속도 분포를 알려 줘요.'],
          explain: '빠르게 움직이는 가스에서 나온 빛은 어떤 것은 파장이 짧아지고 어떤 것은 길어져서(도플러 효과) 선이 넓어져요. 폭 10 nm는 약 4570 km/s에 해당해요.',
        },
      ],
    },
    {
      title: '은하 충돌과 별 생성 폭발', short: '은하 충돌', icon: '💥', phase: '탐구', features: ['collide'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 활동성 은하의 스펙트럼을 분석했어요. 이번에는 <b>은하끼리 충돌</b>하는 특이한 은하를 살펴봐요.</div>' +
        '<p>은하는 중력으로 서로 끌어당겨 가까워지면 <b>충돌·병합</b>해요(안드로메다 은하와 우리은하도 약 40억~50억 년 뒤에 충돌할 것으로 예상돼요). 충돌하는 은하는 <b>조석 꼬리와 다리</b>가 생기고, 가스가 압축되어 별이 폭발적으로 태어나는 <b>스타버스트</b>가 일어나요.</p>' +
        '<p>나선 은하 2개가 충돌하는 모형(별·가스 입자)을 실행하고, 적외선 밝기가 가장 센 시점을 찾아요. 모형은 간단하게 만든 것이고, 실제로는 수억 년에 걸쳐 일어나요.</p>',
      setup() { enterLevel(3); },
      recap: '은하가 충돌하면 조석 꼬리가 생기고 가스가 압축되어 별 생성이 폭발적으로 늘어나요. 푸른 별과 데워진 먼지 때문에 적외선이 매우 밝아져요.',
      summary: '<ul><li><b>충돌 은하</b>: 조석 꼬리·다리, 가스가 압축되어 <b>별 생성이 폭발적(스타버스트)</b></li><li>새로 태어난 <b>푸른 별</b>과 이 빛으로 <b>데워진 먼지</b> 때문에 <b>적외선이 매우 밝아요</b>.</li><li>별 사이의 거리가 매우 멀어서 은하가 충돌해도 <b>별끼리 부딪힐 확률은 낮아요</b>.</li><li>충돌 후 가스가 소비되면 푸른 별이 사라져 은하가 붉어지고, 병합한 은하는 <b>타원 은하</b>와 비슷한 모양이 돼요.</li></ul>',
      missions: [
        {
          title: '별 생성이 가장 활발한 시점',
          goal: '충돌을 <b>끝까지 실행</b>한 뒤, 시간 슬라이더로 <b>적외선 밝기(별 생성률)가 최대</b>인 시점을 찾아 맞춰요.',
          hint: '▶ 충돌 실행으로 끝까지 재생하면 그래프가 완성돼요. 슬라이더를 움직여 주황색 곡선이 가장 높은 곳에 파란 선을 맞춰요.',
          hold: 0.8, setup() { S.sbOn = false; setView('v4'); updateCtl(); },
          status: () => '끝까지 실행 ' + mark(S.maxT >= 0.98) + ' · 최대 시점 ' + mark(S.maxT >= 0.98 && Math.abs(S.t4 - peakT()) <= 0.05),
          check: () => S.maxT >= 0.98 && Math.abs(S.t4 - peakT()) <= 0.05,
          explain: '두 은하가 가까이 접근해 겹치는 시기에 가스가 압축되어 별 생성률과 적외선 밝기가 <b>최대</b>가 돼요. 그 뒤에는 가스가 소비되어 줄어들어요.',
        },
        {
          title: '스타버스트 은하 찾기', manual: true,
          goal: '세 은하 중 <b>스타버스트 은하</b>(별 생성이 폭발적인 은하)를 골라요. 고른 뒤 <b>✔ 확인하기</b>를 눌러요.',
          setup() { S.sbOn = true; S.sbPick = null; setView('v4'); updateCtl(); },
          hint: '스타버스트 은하는 푸른 별이 많이 태어나고, 그 빛으로 데워진 먼지 때문에 적외선이 매우 밝아요.',
          check: () => (S.sbPick == null ? '하나를 골라요.' : S.sbPick === 'B' ? true : S.sbPick === 'C' ? '밝은 핵과 넓은 방출선은 활동성 은하의 핵(세이퍼트)의 특징이에요. 별 생성이 폭발적인 은하를 찾아봐요.' : '푸른 별이 거의 없고 적외선이 약하면 별이 거의 태어나지 않는 은하예요.'),
          explain: '<b>B</b>가 스타버스트 은하예요. 충돌로 가스가 압축되어 푸른 별이 많이 태어나고, 데워진 먼지가 적외선을 강하게 내요.',
        },
        {
          type: 'quiz', title: '충돌하는 은하의 별과 색', goal: '은하가 충돌해도 <b>별끼리는 거의 부딪히지 않는</b> 까닭과, 충돌 후 가스가 다 쓰이면 은하의 색이 어떻게 변할지 가장 잘 설명한 것은?', setup() { setView('v4'); },
          choices: ['별 크기가 매우 커서 서로 스쳐 지나가요. 가스가 없어지면 은하는 더 푸르러져요', '별 사이의 거리가 별 크기에 비해 매우 멀어서 부딪힐 확률이 낮아요. 가스가 다 쓰이면 푸른 별이 사라져 은하가 붉어져요', '별은 중력을 받지 않기 때문이에요. 가스가 없어지면 색은 변하지 않아요', '별이 충돌하면 모두 폭발하기 때문이에요. 가스가 없어지면 은하는 사라져요'],
          answer: 1,
          feedback: ['별은 은하 크기에 비해 매우 작아요. 그래서 스쳐 지나갈 수 있어요. 새 별이 태어나지 않으면 푸른 별이 사라져요.', '', '별도 중력을 받아서 조석 꼬리가 생겨요. 푸른 별은 수명이 짧아 사라져요.', '별끼리 부딪힐 확률이 매우 낮아요. 은하는 병합해서 타원 은하와 비슷한 모양이 돼요.'],
          explain: '별 사이 거리는 별 크기의 수백만 배라서 별끼리 부딪히는 경우는 드물어요. 충돌 후 가스가 소비되면 새로운 별이 태어나지 않아 수명이 짧은 푸른 별이 사라지고, 은하는 점점 <b>붉어져요</b>(타원 은하와 비슷).',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'he-peculiar-galaxy', mount: '#game', badge: '특이 은하 탐정', homeHref: '../../index.html#he',
    featureLabels: { bands: '📡 파장 바꾸기', agn: '🕳️ 중심 엔진 · 은하 카드', spectra: '📈 스펙트럼 · 계산', collide: '💥 은하 충돌 모형' },
    onFeatures() { updateCtl(); },
    levels,
  });
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setView(b.dataset.view); }));

  /* ---------- 루프 ---------- */
  let lastFree = false, jetAcc = 0;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (!S.model && t > 1.5) { if (!collider) collider = createCollision(); const r = collider.advance(5); if (r) S.model = r; }
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    // 1단계: 파장 전환
    BAND_ORDER.forEach((b) => { S.bw[b] = approach(S.bw[b], S.band === b ? 1 : 0, dt, 7); });
    if (S.view === 'v1') { S.bandT += dt; if (S.bandT > 0.5 && !S.seen[S.band]) { S.seen[S.band] = true; Sound.tick(); updateCtl(); } }
    // 2단계
    S.angD = approach(S.angD, S.ang, dt, 12);
    S.bl = approach(S.bl, S.ang <= TORUS_ANGLE ? 1 : 0, dt, 7);
    jets.forEach((j) => { j.s += dt * 0.35; if (j.s > 1) j.s -= 1; });
    if (S.view === 'v2') { const key = S.ang <= TORUS_ANGLE - 10 ? 'vis' : S.ang >= TORUS_ANGLE + 10 ? 'hid' : null; if (key !== S.angKey) { S.angKey = key; S.angT = 0; } else if (key && !S.seenAng[key]) { S.angT += dt; if (S.angT > 0.4) { S.seenAng[key] = true; Sound.tick(); } } }
    // 3단계
    S.specF = approach(S.specF, 1, dt, 5);
    if (S.spec === 'quasar') S.qShift = approach(S.qShift, 1, dt, 1.6);
    // 4단계
    if (S.play) {
      S.t4 = Math.min(1, S.t4 + dt / 24); S.maxT = Math.max(S.maxT, S.t4);
      setSlider(sT4, oT4, Math.round(S.t4 * 1000), t4Out);
      if (S.t4 >= 1) { S.play = false; updateCtl(); }
    }
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    ctx.fillStyle = '#070d1f'; ctx.fillRect(0, 0, VW, VH);
    const bgG = ctx.createRadialGradient(VW * 0.25, 0, 10, VW * 0.25, 0, VH); bgG.addColorStop(0, 'rgba(70,90,200,.2)'); bgG.addColorStop(1, 'rgba(7,13,31,0)'); ctx.fillStyle = bgG; ctx.fillRect(0, 0, VW, VH);
    if (S.view === 'v1') drawV1(t, dt);
    else if (S.view === 'v2') drawV2(t, dt);
    else if (S.view === 'v3') drawV3(t, dt);
    else drawV4(t, dt);
    parts.draw(ctx);
    drawFlash(dt, 8);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(7,13,31,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, TORUS_ANGLE, V_SEY, ZQ, SIZE_KM, CARDS,
    get game() { return game; }, get model() { return ensureModel(); },
    enterLevel, setView, setBand, setAng, setSpec, setT4, updateCtl, parseNum, peakT,
    busy(li) { if (li === 3) { setT4(0.3); S.play = true; } },
    solveBands() { BAND_ORDER.forEach((b) => { S.match[b] = b; $('#bandRows select[data-b="' + b + '"]').value = b; }); },
    solveCards() { CARDS.forEach((c, i) => { S.cardSel[i] = c.ty; $('#cardRows select[data-i="' + i + '"]').value = c.ty; }); },
  };

})();
