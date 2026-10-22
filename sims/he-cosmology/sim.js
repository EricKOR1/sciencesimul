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


  /* ---------- 끌어 놓기 도우미 ----------
     카드를 끌어서 칸(bin)에 놓거나, 카드를 누른 뒤 칸을 눌러도 돼요.
     o.items[{id, w, h}]  o.homeOf(it, i) -> {x,y,w,h}   (칸 밖일 때 자리)
     o.slotOf(it, binId, k, list) -> {x,y,w,h}            (칸 안에서 k번째 자리)
     o.binAt(p) -> binId | null                           (포인터 위치가 어느 칸인지)
     o.cap(binId) -> 칸 크기 제한(없으면 무한)               */
  function makeDnD(o) {
    const dn = { items: o.items, sel: null, drag: null, moved: false, order: 0, binAt: o.binAt };
    o.items.forEach((it, i) => {
      const h = o.homeOf(it, i);
      it.x = h.x; it.y = h.y; it.w = h.w; it.h = h.h; it.bin = null; it.lift = 0; it.shake = 0; it.pop = 0; it.seq = 0;
    });
    dn.binList = (b) => o.items.filter((x) => x.bin === b).sort((p, q) => p.seq - q.seq);
    dn.target = (it, i) => {
      if (it.bin == null) return o.homeOf(it, i);
      const list = dn.binList(it.bin);
      return o.slotOf(it, it.bin, list.indexOf(it), list);
    };
    dn.snap = () => o.items.forEach((it, i) => { const t = dn.target(it, i); it.x = t.x; it.y = t.y; it.w = t.w; it.h = t.h; });
    dn.update = (dt) => {
      o.items.forEach((it, i) => {
        if (dn.drag && dn.drag.it === it) { it.lift = approach(it.lift, 1, dt, 14); return; }
        const t = dn.target(it, i);
        it.x = approach(it.x, t.x, dt, 14); it.y = approach(it.y, t.y, dt, 14);
        it.w = approach(it.w, t.w, dt, 14); it.h = approach(it.h, t.h, dt, 14);
        it.lift = approach(it.lift, 0, dt, 12);
        it.shake = Math.max(0, it.shake - dt * 2.2); it.pop = Math.max(0, it.pop - dt * 3);
      });
    };
    /* 그리는 순서: 끄는 카드가 맨 위 */
    dn.drawOrder = () => o.items.slice().sort((a, b) => (dn.drag && dn.drag.it === a ? 1 : 0) - (dn.drag && dn.drag.it === b ? 1 : 0));
    dn.assign = (it, bin) => {
      if (bin != null && o.cap && o.cap(bin) != null) {
        const full = dn.binList(bin).filter((x) => x !== it);
        if (full.length >= o.cap(bin)) { full.slice(0, full.length - o.cap(bin) + 1).forEach((x) => { x.bin = null; x.pop = 1; }); }
      }
      it.bin = bin; it.seq = ++dn.order; it.pop = 1; it.wrong = false;
      o.onChange && o.onChange(it, bin);
    };
    dn.reset = () => { dn.sel = null; dn.drag = null; o.items.forEach((it) => { it.bin = null; it.wrong = false; }); o.onChange && o.onChange(null, null); };
    dn.hit = (p) => {
      for (const it of dn.drawOrder().reverse()) {
        if (p.x >= it.x && p.x <= it.x + it.w && p.y >= it.y && p.y <= it.y + it.h) return it;
      }
      return null;
    };
    dn.down = (p) => {
      const it = dn.hit(p);
      if (it) { dn.drag = { it, ox: p.x - it.x, oy: p.y - it.y, sx: p.x, sy: p.y }; dn.moved = false; return true; }
      const b = o.binAt(p);
      if (b != null && dn.sel) { const s = dn.sel; dn.sel = null; Sound.click(); dn.assign(s, b); }
      return false;
    };
    dn.move = (p) => {
      const d = dn.drag; if (!d) return;
      if (!dn.moved && Math.hypot(p.x - d.sx, p.y - d.sy) > 7) dn.moved = true;
      if (dn.moved) { d.it.x = p.x - d.ox; d.it.y = p.y - d.oy; }
    };
    dn.up = (p) => {
      const d = dn.drag; if (!d) return; dn.drag = null;
      const it = d.it;
      if (!dn.moved) { Sound.click(); dn.sel = dn.sel === it ? null : it; return; }
      const b = o.binAt(p);
      dn.sel = null;
      if (b != null) { Sound.tick(); dn.assign(it, b); }
      else if (it.bin != null) { dn.assign(it, null); }
    };
    return dn;
  }

  /* =========================================================
     지구과학 Ⅲ. 태양계 천체와 별과 우주의 진화 - 우주론의 변천
     [12지구03-05] 우주의 진화에 대한 다양한 설명 체계의 의의를 현대 우주론의 관점에서 비교
     ① 추론: 정적 우주 → 팽창 우주, 빅뱅 우주론과 정상 상태 우주론   ② 분석: 우주 배경 복사 2.7 K, 팽창으로 늘어난 파장
     ③ 추론: 급팽창이 해결하는 지평선 문제   ④ 분석: 가속 팽창(Ia형 초신성)과 관측 가능한 우주
     우주 구성 성분의 비율·암흑 물질 모형 같은 표준 모형의 내용은 다루지 않아요. 가속 팽창의 원인은 '아직 밝혀지지 않았다'까지만 말해요.
     그림은 개념도이고, 수치는 교육용 예시 값이에요.
     ========================================================= */
  initStage('#070d1f', 800, 560, 600, 840, 1.25);
  const TX = (x, y, s, size, color, align, weight) => D.text(x, y, s, { size: size || 14, color: color || '#e2e8f0', align: align || 'left', weight: weight || 700 });
  const TXD = (x, y, s, size, color, align, weight) => D.text(x, y, s, { size: size || 14, color: color || '#334155', align: align || 'left', weight: weight || 700 });
  const sqrt = Math.sqrt, log10 = Math.log10, pow = Math.pow, exp = Math.exp;
  const f0 = (x) => String(Math.round(x));
  const f1 = (x) => (Math.round(x * 10) / 10).toFixed(1);
  const f2 = (x) => (Math.round(x * 100) / 100).toFixed(2);
  const sig = (x, n) => { if (!isFinite(x) || x === 0) return '0'; const v = +x.toPrecision(n); return String(v).indexOf('e') >= 0 ? v.toFixed(0) : String(v); };
  function parseNum(str) {
    let s = String(str).trim().replace(/,/g, '').replace(/\s+/g, '').replace(/(mm|배|배율|억광년|억|%)$/i, '');
    s = s.replace(/[⁻]/g, '-').replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(d));
    s = s.replace(/[×xX*]10\^?\(?(-?\d+)\)?/, 'e$1').replace('−', '-');
    if (/^-?[\d.]+\/[\d.]+$/.test(s)) { const p = s.split('/'); return +p[0] / +p[1]; }
    const m = /^-?(\d+\.?\d*|\.\d+)(e-?\d+)?$/i.exec(s);
    return m ? parseFloat(s) : NaN;
  }
  const mulberry = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const smoothS = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };

  /* ---------- 물리 · 자료 ---------- */
  const H_ = 6.62607015e-34, C_ = 2.99792458e8, K_ = 1.380649e-23;
  const WIEN = 2.9e-3;                       // 빈의 상수 (m·K)
  const T_CMB = 2.725, T_EMIT = 3000;        // 우주 배경 복사의 현재 온도, 방출 당시 온도 (K)
  const LAM_NOW = WIEN / T_CMB, LAM_EMIT = WIEN / T_EMIT;     // m
  const STRETCH = LAM_NOW / LAM_EMIT;        // 파장이 늘어난 배율 ≈ 1100
  const A_MAX = T_EMIT / T_CMB;              // 슬라이더 끝의 팽창 배율
  const planck = (lam, T) => { const x = H_ * C_ / (lam * K_ * T); if (x > 600) return 0; return 2 * H_ * C_ * C_ / pow(lam, 5) / Math.expm1(x); };
  const relI = (lam, T) => planck(lam, T) / planck(2.897772e-3 / T, T);
  const lamTxt = (m) => (m >= 1e-3 ? sig(m * 1e3, 3) + ' mm' : m >= 1e-6 ? sig(m * 1e6, 3) + ' μm' : sig(m * 1e9, 3) + ' nm');
  /* 가속 팽창 개념도: 과거로부터의 시간(억 년 전) → 우주의 상대적 크기 a (현재 = 1, 현재의 팽창 속도는 같게) */
  const H70 = 0.0716;                        // 1/10억 년 단위 (70 km/s/Mpc)
  const AGE_MODELS = {
    decel: { nm: '감속 팽창', col: '#ef4444', a: (x) => pow(Math.max(0, 1 - 1.5 * H70 * x / 10), 2 / 3) },
    const: { nm: '등속 팽창', col: '#eab308', a: (x) => 1 - H70 * x / 10 },
    accel: { nm: '가속 팽창', col: '#2563eb', a: (x) => 1 - H70 * x / 10 + 0.234 * pow(H70 * x / 10, 2) },
  };
  const SN_OBS = { x: 51, a: 1 / 1.5 };      // 적색 편이 0.5인 Ia형 초신성: 빛이 약 51억 년 걸려 도달 (예시)
  const MAG_DIM = 0.25;                      // 예상보다 어두운 정도 (등급)
  const BR_RATIO = pow(10, -0.4 * MAG_DIM), DIST_RATIO = 1 / sqrt(BR_RATIO);
  const OBS_R = { age: 138, now: 465 };      // 억 광년
  /* 증거 카드 6장 */
  const EVID = [
    { id: 'e1', ans: 'S', sh: '별자리 불변', t: '수백 년 동안 별자리의 모양이 거의 변하지 않아 보인다.' },
    { id: 'e2', ans: 'N', sh: '적색 편이', t: '거의 모든 먼 은하의 스펙트럼선이 긴 파장 쪽으로 이동해 있다(적색 편이).' },
    { id: 'e3', ans: 'S', sh: '우주 상수', t: '아인슈타인(1917)은 우주가 수축하지 않도록 방정식에 우주 상수를 넣어 우주를 정적으로 만들었다.' },
    { id: 'e4', ans: 'N', sh: '거리-속도 직선', t: '은하의 후퇴 속도가 거리에 비례한다(허블-르메트르 법칙).' },
    { id: 'e5', ans: 'N', sh: '중심이 없는 팽창', t: '어느 은하에서 보아도 먼 은하일수록 더 빨리 멀어지는 모습이 같다.' },
    { id: 'e6', ans: 'N', sh: '2.7 K 복사', t: '모든 방향에서 거의 같은 2.7 K의 마이크로파 복사가 관측된다(1965년 발견).' },
  ];
  const BIN_NAME = { S: '정적 우주를 지지하는 증거', N: '정적 우주에 반박하는 증거' };
  const SKY = (() => {      // 마이크로파 하늘 지도 무늬 (합성 잡음)
    const W = 300, Hh = 150, c = document.createElement('canvas'); c.width = W; c.height = Hh; const g = c.getContext('2d'), im = g.createImageData(W, Hh), r = mulberry(17), comps = [];
    for (let i = 0; i < 26; i++) comps.push([r() * 0.5 + 0.05, r() * TAU, r() * TAU, r() * TAU, 0.5 + r()]);
    for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
      let v = 0; comps.forEach((q) => { v += q[4] * Math.sin(q[0] * x * 0.25 + q[1]) * Math.cos(q[0] * y * 0.3 + q[2] + q[3] * 0.0); }); v = clamp(v / 6, -1, 1);
      const i = (y * W + x) * 4, t = v * 0.5 + 0.5;
      im.data[i] = Math.round(40 + 215 * t); im.data[i + 1] = Math.round(80 + 100 * (1 - Math.abs(2 * t - 1))); im.data[i + 2] = Math.round(255 - 215 * t); im.data[i + 3] = 255;
    }
    g.putImageData(im, 0, 0); return c;
  })();

  /* ---------- 상태 ---------- */
  const S = {
    view: 'v1', fade: 0, clock: 0,
    cmpOn: false, predPick: null,
    aS: 0, aD: 0, mapAmp: 0.05, mapBig: false, pickC: null, obsA: 0,
    inf: false, tau: 0, tauD: 0, playing: false, seenEnd: { off: false, on: false }, seenOverlap: false,
    curve: null, cp: 0, snT: 0, radPick: null, radShown: false, uni: 0,
  };
  let game = null;
  const VIEW_LABEL = { v1: '🗂 증거 카드로 우주론 고르기', v2: '📡 우주 배경 복사', v3: '🎈 급팽창과 지평선 문제', v4: '🚀 가속 팽창과 관측 가능한 우주' };
  const BGST = Array.from({ length: 70 }, (_, i) => { const r = mulberry(i * 13 + 3); return [r(), r(), r() * 6, 0.6 + r() * 1.4]; });

  /* ======================================================
     1단계: 정적 우주 vs 팽창 우주, 증거 카드 분류
     ====================================================== */
  const ANI = PHONE ? { x: 10, y: 10, w: 580, h: 158 } : { x: 12, y: 12, w: 776, h: 130 };
  const binRect = (b) => { const i = b === 'S' ? 0 : 1; return PHONE ? { x: 10 + i * 295, y: 488, w: 285, h: 342 } : { x: 12 + i * 396, y: 366, w: 380, h: 182 }; };
  const dn1 = makeDnD({
    items: EVID,
    homeOf: (it, i) => (PHONE ? { x: 10 + (i % 2) * 296, y: 180 + Math.floor(i / 2) * 102, w: 284, h: 96 } : { x: 12 + (i % 3) * 263, y: 168 + Math.floor(i / 3) * 100, w: 250, h: 94 }),
    slotOf: (it, b, k) => { const R = binRect(b); return PHONE ? { x: R.x + 10, y: R.y + 62 + k * 44, w: 265, h: 38 } : { x: R.x + 10 + (k % 2) * 186, y: R.y + 58 + Math.floor(k / 2) * 40, w: 176, h: 34 }; },
    binAt: (p) => { for (const b of ['S', 'N']) { const R = binRect(b); if (p.x >= R.x && p.x <= R.x + R.w && p.y >= R.y && p.y <= R.y + R.h) return b; } return null; },
    onChange: () => { updateCtl(); },
  });
  const grouped1 = () => EVID.filter((e) => e.bin != null).length;
  const STAT_STARS = Array.from({ length: 46 }, (_, i) => { const r = mulberry(i * 7 + 11); return [r(), r(), r() * 6, 0.5 + r() * 1.5]; });
  const GRIDG = []; for (let i = -3; i <= 3; i++) for (let j = -1; j <= 1; j++) GRIDG.push([i, j]);
  function drawAni(t) {
    const hw = (ANI.w - 12) / 2;
    [0, 1].forEach((k) => {
      const x = ANI.x + k * (hw + 12), y = ANI.y, w = hw, h = ANI.h;
      ctx.save(); rr(x, y, w, h, 14).clip(); const bg = ctx.createLinearGradient(0, y, 0, y + h); bg.addColorStop(0, '#0b1230'); bg.addColorStop(1, '#03050d'); ctx.fillStyle = bg; ctx.fillRect(x, y, w, h);
      if (k === 0) {
        STAT_STARS.forEach((s) => { ctx.fillStyle = 'rgba(255,255,255,' + (0.35 + 0.5 * (0.5 + 0.5 * Math.sin(t * s[3] + s[2]))) + ')'; ctx.fillRect(x + s[0] * w, y + 24 + s[1] * (h - 30), 2.2, 2.2); });
      } else {
        const tau = (t / 6) % 1, fa = Math.min(1, tau * 5, (1 - tau) * 5), a = 1 + 0.55 * tau, cx = x + w / 2, cy = y + h / 2 + 10, sp = PHONE ? 33 : 46;
        ctx.strokeStyle = 'rgba(120,160,255,' + 0.25 * fa + ')'; ctx.lineWidth = 1.2;
        for (let i = -4; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(cx + i * sp * a, cy - 2 * sp * a); ctx.lineTo(cx + i * sp * a, cy + 2 * sp * a); ctx.stroke(); }
        for (let j = -2; j <= 2; j++) { ctx.beginPath(); ctx.moveTo(cx - 4 * sp * a, cy + j * sp * a); ctx.lineTo(cx + 4 * sp * a, cy + j * sp * a); ctx.stroke(); }
        GRIDG.forEach((g) => { const gx = cx + g[0] * sp * a, gy = cy + g[1] * sp * a; if (gx < x + 6 || gx > x + w - 6 || gy < y + 26) return; ctx.globalAlpha = 0.4 + 0.6 * fa; D.sphere(gx, gy, 5.5, '#fde68a', { shadow: false }); if (g[0] !== 0 || g[1] !== 0) { const L = Math.hypot(g[0], g[1]); D.arrow(gx + g[0] / L * 8, gy + g[1] / L * 8, gx + g[0] / L * (8 + 8 * a), gy + g[1] / L * (8 + 8 * a), { color: '#fbbf24', width: 1.8, head: 5 }); } ctx.globalAlpha = 1; });
      }
      ctx.restore(); ctx.strokeStyle = k === 0 ? 'rgba(148,163,184,.6)' : 'rgba(251,191,36,.7)'; ctx.lineWidth = 2; rr(x, y, w, h, 14).stroke();
      D.label(x + 12, y + 18, k === 0 ? '정적 우주: 별과 은하는 제자리에 있어요' : '팽창 우주: 은하 사이가 멀어져요', { bg: k === 0 ? 'rgba(51,65,85,.9)' : 'rgba(146,64,14,.92)', size: PHONE ? 11.5 : 12.5, align: 'left', pad: 9 });
    });
  }
  function drawEvid(it) {
    const sc = 1 + it.lift * 0.06 + it.pop * 0.08 * Math.sin(it.pop * 3.1), dx = it.shake > 0 ? Math.sin(it.shake * 40) * 5 * it.shake : 0;
    const cx = it.x + it.w / 2 + dx, cy = it.y + it.h / 2, chip = it.bin != null;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.translate(-cx, -cy);
    const border = dn1.sel === it ? '#fde047' : it.wrong ? '#f87171' : chip ? (it.bin === 'S' ? '#94a3b8' : '#fbbf24') : 'rgba(148,163,184,.6)';
    D.shadow(() => { const g = ctx.createLinearGradient(0, it.y, 0, it.y + it.h); g.addColorStop(0, '#16275a'); g.addColorStop(1, '#0b1230'); ctx.fillStyle = g; rr(it.x + dx, it.y, it.w, it.h, chip ? 10 : 12).fill(); }, { blur: it.lift ? 14 : 5, y: it.lift ? 6 : 2, color: 'rgba(0,0,0,.45)' });
    ctx.strokeStyle = border; ctx.lineWidth = dn1.sel === it || it.wrong ? 3 : 2; rr(it.x + dx, it.y, it.w, it.h, chip ? 10 : 12).stroke();
    if (chip) TX(cx, cy + 5, it.sh, PHONE ? 13 : 12.5, '#f1f5f9', 'center', 800);
    else { D.label(it.x + 10 + dx, it.y + 14, it.sh, { bg: '#0ea5e9', size: PHONE ? 11 : 11.5, align: 'left', pad: 7 }); drawWrap(it.x + 10 + dx, it.y + 38 + (PHONE ? 2 : 0), it.t, it.w - 20, PHONE ? 11.5 : 12, { align: 'left', color: '#e2e8f0', lh: 1.25 }); }
    ctx.restore();
  }
  function drawV1(t, dt) {
    drawAni(t);
    TX(PHONE ? 10 : 12, PHONE ? 178 : 158, '증거 카드 6장을 알맞은 상자에 끌어 넣어요', PHONE ? 13 : 13.5, '#cbd5e1', 'left', 800);
    ['S', 'N'].forEach((b) => {
      const R = binRect(b), over = S.over === b, col = b === 'S' ? '#94a3b8' : '#fbbf24';
      ctx.save(); D.shadow(() => { ctx.fillStyle = over ? 'rgba(255,255,255,.16)' : 'rgba(255,255,255,.07)'; rr(R.x, R.y, R.w, R.h, 14).fill(); }, { blur: 6, y: 2, color: 'rgba(0,0,0,.35)' });
      ctx.strokeStyle = col; ctx.lineWidth = over ? 3.5 : 2.4; ctx.setLineDash(over ? [] : [7, 5]); rr(R.x, R.y, R.w, R.h, 14).stroke(); ctx.setLineDash([]);
      ctx.fillStyle = rgba(col, 0.22); rr(R.x + 1.5, R.y + 1.5, R.w - 3, 44, 12).fill(); ctx.restore();
      TX(R.x + R.w / 2, R.y + 29, BIN_NAME[b], PHONE ? 14 : 15, '#fff', 'center', 800);
      const n = dn1.binList(b).length; if (n) D.label(R.x + R.w - 8, R.y + R.h - 14, n + '장', { bg: col === '#94a3b8' ? '#475569' : '#b45309', size: 12.5, align: 'right', pad: 7 });
    });
    dn1.drawOrder().forEach(drawEvid);
  }

  /* ======================================================
     2단계: 우주 배경 복사 (하늘 지도 + 흑체 곡선)
     ====================================================== */
  const SKYP = PHONE ? { x: 10, y: 10, w: 580, h: 270 } : { x: 12, y: 12, w: 384, h: 290 };
  const CRV = PHONE ? { x: 10, y: 290, w: 580, h: 330 } : { x: 408, y: 12, w: 380, h: 290 };
  const INF2 = PHONE ? { x: 10, y: 630, w: 580, h: 200 } : { x: 12, y: 312, w: 776, h: 236 };
  const aOf = (s) => pow(A_MAX, s / 1000);
  const okLam = () => { const v = parseNum($('#inLam').value); return isFinite(v) && Math.abs(v - LAM_NOW * 1e3) <= 0.06; };
  const okStr = () => { const v = parseNum($('#inStr').value); return isFinite(v) && Math.abs(v - STRETCH) / STRETCH <= 0.05; };
  function drawV2(t, dt) {
    // 하늘 지도
    panel(SKYP.x, SKYP.y, SKYP.w, SKYP.h, { fill: 'rgba(12,20,48,.92)', title: '마이크로파 하늘 지도 (전체 하늘, 모식도)', tcolor: '#e2e8f0', tsize: PHONE ? 13.5 : 13.5 });
    const mw = SKYP.w - 40, mh = mw * 0.5, mx = SKYP.x + 20, my = SKYP.y + 40 + (SKYP.h - 40 - mh - (PHONE ? 40 : 52)) / 2;
    ctx.save(); ctx.beginPath(); ctx.ellipse(mx + mw / 2, my + mh / 2, mw / 2, mh / 2, 0, 0, TAU); ctx.clip();
    ctx.fillStyle = '#f59e0b'; ctx.fillRect(mx, my, mw, mh); ctx.globalAlpha = S.mapAmp; ctx.drawImage(SKY, mx, my, mw, mh); ctx.globalAlpha = 1; ctx.restore();
    ctx.strokeStyle = 'rgba(226,232,240,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(mx + mw / 2, my + mh / 2, mw / 2, mh / 2, 0, 0, TAU); ctx.stroke();
    const big = S.mapAmp > 0.5;
    drawWrap(SKYP.x + SKYP.w / 2, SKYP.y + SKYP.h - (PHONE ? 38 : 44), big ? '온도 차이를 10만 배로 키운 그림이에요 (실제 차이는 약 10⁻⁵)' : '실제 모습: 모든 방향에서 거의 같은 온도(약 2.7 K)예요', SKYP.w - 24, PHONE ? 12.5 : 12.5, { align: 'center', color: '#fde68a', weight: 800 });
    // 흑체 곡선
    panel(CRV.x, CRV.y, CRV.w, CRV.h, { title: '우주 배경 복사의 스펙트럼', tsize: PHONE ? 14 : 14 });
    const x0 = CRV.x + 44, x1 = CRV.x + CRV.w - 16, y0 = CRV.y + 40, y1 = CRV.y + CRV.h - 56, LG0 = -7, LG1 = -1.5;
    const gx = (lg) => x0 + (x1 - x0) * (lg - LG0) / (LG1 - LG0), gy = (v) => y1 - (y1 - y0) * v / 1.1;
    ctx.save(); ctx.fillStyle = '#f8fbff'; ctx.fillRect(x0, y0, x1 - x0, y1 - y0); ctx.strokeStyle = '#e1e8f0'; ctx.lineWidth = 1.2;
    [[-7, '0.1 μm'], [-6, '1 μm'], [-5, '10 μm'], [-4, '0.1 mm'], [-3, '1 mm'], [-2, '1 cm']].forEach(([lg, s]) => { ctx.beginPath(); ctx.moveTo(gx(lg), y0); ctx.lineTo(gx(lg), y1); ctx.stroke(); TXD(gx(lg), y1 + 16, s, PHONE ? 11 : 11, '#64748b', 'center'); });
    [0, 0.5, 1].forEach((v) => { ctx.beginPath(); ctx.moveTo(x0, gy(v)); ctx.lineTo(x1, gy(v)); ctx.stroke(); TXD(x0 - 5, gy(v) + 4, f1(v), 11.5, '#64748b', 'right'); });
    ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0); ctx.clip();
    const curve = (T, col, w, dash, al) => { const pts = []; for (let lg = LG0; lg <= LG1 + 1e-6; lg += 0.04) pts.push([gx(lg), gy(Math.min(1.05, relI(pow(10, lg), T)))]); polyline(pts, col, w, { dash, alpha: al }); };
    curve(T_EMIT, '#f97316', 2.4, [6, 5], 0.8);
    const Tc = T_EMIT / S.aD; curve(Tc, '#2563eb', 3.6);
    if (S.obsA > 0.02) { ctx.globalAlpha = S.obsA; for (let lg = -3.9; lg <= -1.95; lg += 0.17) { const v = relI(pow(10, lg), T_CMB); ctx.fillStyle = '#16a34a'; ctx.beginPath(); ctx.arc(gx(lg), gy(v), 4.6, 0, TAU); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.4; ctx.stroke(); } ctx.globalAlpha = 1; }
    ctx.restore(); ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.8; ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
    TXD((x0 + x1) / 2, CRV.y + CRV.h - 8, '파장 (로그 눈금)', 12, '#475569', 'center', 800);
    ctx.save(); ctx.translate(CRV.x + 13, (y0 + y1) / 2); ctx.rotate(-Math.PI / 2); TXD(0, 0, '상대 세기', 12, '#475569', 'center', 800); ctx.restore();
    D.label(x0 + 10, y0 + 16, '방출 당시 (3000 K)', { bg: '#c2410c', size: 11.5, align: 'left', pad: 7 });
    D.label(x1 - 8, y0 + 16, '지금 ' + (S.aS >= 999 ? '2.725' : f1(Tc)) + ' K', { bg: '#1d4ed8', size: 11.5, align: 'right', pad: 7 });
    if (S.obsA > 0.5) D.label((x0 + x1) / 2, y0 + 44, '● 관측값이 곡선과 일치', { bg: '#15803d', size: 11.5, pad: 8 });
    // 정보 판
    panel(INF2.x, INF2.y, INF2.w, INF2.h, { title: '팽창으로 늘어난 파장' });
    const lamNow = WIEN / Tc, a = S.aD;
    const L1 = PHONE ? 52 : 52, ly = INF2.y + 44;
    const lines = [
      ['우주의 팽창 배율 a', '×' + (a >= 100 ? f0(a) : f1(a))],
      ['배경 복사의 온도 T = 3000 K / a', f1(Tc) + ' K'],
      ['꼭짓점 파장 λmax = 2.9×10⁻³ / T', lamTxt(lamNow)],
    ];
    lines.forEach((r, i) => { TXD(INF2.x + 16, ly + i * 30 + 6, r[0], PHONE ? 13 : 14, '#334155', 'left', 700); TXD(INF2.x + INF2.w - 16, ly + i * 30 + 6, r[1], PHONE ? 14.5 : 15.5, '#0f172a', 'right', 800); });
    const ry = ly + 3 * 30 + 4;
    ctx.save(); ctx.fillStyle = okLam() && okStr() ? '#dcfce7' : '#f1f5f9'; rr(INF2.x + 10, ry, INF2.w - 20, PHONE ? 50 : 56, 10).fill(); ctx.restore();
    const msg = okLam() && okStr() ? '방출 당시 λmax = ' + lamTxt(LAM_EMIT) + ' → 지금 ' + lamTxt(LAM_NOW) + ': 약 ' + f0(Math.round(STRETCH / 100) * 100) + '배로 늘어났어요 (마이크로파)' : '슬라이더를 끝까지 움직이고, 입력창에 현재의 λmax(mm)와 파장이 늘어난 배율을 계산해 써요';
    drawWrap(INF2.x + INF2.w / 2, ry + (PHONE ? 20 : 22), msg, INF2.w - 36, PHONE ? 12.5 : 13.5, { align: 'center', color: okLam() && okStr() ? '#15803d' : '#475569', weight: 800 });
  }

  /* ======================================================
     3단계: 급팽창과 지평선 문제 (개념도)
     ====================================================== */
  const DIA = PHONE ? { x: 10, y: 10, w: 580, h: 470 } : { x: 12, y: 12, w: 776, h: 372 };
  const INF3 = PHONE ? { x: 10, y: 490, w: 580, h: 340 } : { x: 12, y: 394, w: 776, h: 154 };
  /* 개념도 값: tau 0(빅뱅 직후) ~ 1(배경 복사 방출) */
  const hor = (tau) => 22 + 128 * tau;                                      // 빛이 간 거리(지평선 반지름)
  const sepOf = (tau, inf) => (inf ? (tau < 0.12 ? 36 + 30 * tau : tau < 0.32 ? 40 + 460 * smoothS((tau - 0.12) / 0.2) : 500 + 30 * (tau - 0.32) / 0.68) : 300 + 220 * tau);
  const contact = (tau, inf) => sepOf(tau, inf) < 2 * hor(tau);
  function tempCol(tau, inf, side) {
    const c0 = side ? '#ef4444' : '#3b82f6';
    if (!inf) return c0;
    return mixc(c0, '#f59e0b', smoothS(tau / 0.12));
  }
  function drawV3(t, dt) {
    const tau = S.tauD, inf = S.inf;
    panel(DIA.x, DIA.y, DIA.w, DIA.h, { fill: 'rgba(12,20,48,.92)', title: (inf ? '급팽창 있음' : '급팽창 없음 (일정한 속도로 팽창)') + ' - 개념도 (축척 아님)', tcolor: inf ? '#fde68a' : '#e2e8f0', tsize: PHONE ? 13.5 : 14.5 });
    const cx = DIA.x + DIA.w / 2, cy = DIA.y + DIA.h / 2 + 6, sc = PHONE ? 0.52 : 0.74, s = sepOf(tau, inf) * sc, h = hor(tau) * sc;
    // 시간 띠
    TX(DIA.x + 16, DIA.y + DIA.h - 18, '빅뱅 직후', 12.5, '#94a3b8', 'left', 800); TX(DIA.x + DIA.w - 16, DIA.y + DIA.h - 18, '약 38만 년 (배경 복사 방출)', 12.5, '#94a3b8', 'right', 800);
    const bx0 = DIA.x + 16, bx1 = DIA.x + DIA.w - 16, by = DIA.y + DIA.h - 36;
    ctx.save(); ctx.fillStyle = 'rgba(148,163,184,.3)'; rr(bx0, by, bx1 - bx0, 8, 4).fill(); ctx.fillStyle = '#0ea5e9'; rr(bx0, by, (bx1 - bx0) * tau, 8, 4).fill(); ctx.restore();
    if (inf && tau > 0.12 && tau < 0.32) D.label(cx, DIA.y + 50, '급팽창! 짧은 시간에 10²⁶배 이상', { bg: '#b45309', size: PHONE ? 13 : 14, pad: 11 });
    // 두 영역
    const xa = cx - s / 2, xb = cx + s / 2, cA = tempCol(tau, inf, 0), cB = tempCol(tau, inf, 1);
    ctx.save(); ctx.beginPath(); ctx.rect(DIA.x + 4, DIA.y + 34, DIA.w - 8, DIA.h - 76); ctx.clip();
    [[xa, cA], [xb, cB]].forEach(([x, c]) => { ctx.fillStyle = rgba(c, 0.13); ctx.beginPath(); ctx.arc(x, cy, h, 0, TAU); ctx.fill(); ctx.strokeStyle = rgba(c, 0.9); ctx.lineWidth = 2.4; ctx.setLineDash([7, 5]); ctx.beginPath(); ctx.arc(x, cy, h, 0, TAU); ctx.stroke(); ctx.setLineDash([]); });
    ctx.restore();
    const ct = contact(tau, inf);
    if (ct) { ctx.save(); ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(xa, cy); ctx.lineTo(xb, cy); ctx.stroke(); ctx.restore(); D.label(cx, cy - h - 22 > DIA.y + 60 ? cy - h - 22 : cy + 52, '두 영역이 서로 신호를 주고받아요 (접촉)', { bg: '#15803d', size: PHONE ? 12 : 13, pad: 10 }); }
    else D.label(cx, cy + Math.max(h, 40) + 28 > DIA.y + DIA.h - 56 ? DIA.y + DIA.h - 66 : cy + Math.max(h, 40) + 28, '두 영역은 서로 신호를 주고받지 못해요', { bg: '#475569', size: PHONE ? 12 : 13, pad: 10 });
    [[xa, cA, 'A'], [xb, cB, 'B']].forEach(([x, c, nm]) => { D.glow(x, cy, 36, c, 0.7); D.sphere(x, cy, 16, c, { shadow: true }); TX(x, cy + 5.5, nm, 14, '#fff', 'center', 800); });
    if (s > 130) { TX(xa, cy - 26, '하늘의 한쪽', 12, '#cbd5e1', 'center', 700); TX(xb, cy - 26, '반대쪽', 12, '#cbd5e1', 'center', 700); }
    // 정보
    panel(INF3.x, INF3.y, INF3.w, INF3.h, { title: '지평선 문제' });
    const col = tau >= 0.98 ? (inf ? '#15803d' : '#b91c1c') : '#334155';
    const txt = inf
      ? '아주 초기에 두 영역은 가까이 있어서 서로 신호를 주고받으며 온도가 같아졌어요. 그 뒤 급팽창으로 멀어져도 온도가 같아요.'
      : '두 영역 사이의 거리가 빛이 간 거리(원)의 두 배보다 멀어서 서로 접촉한 적이 없어요. 그런데 관측하면 온도는 거의 같아요(차이 약 10⁻⁵).';
    drawWrap(INF3.x + 16, INF3.y + 50, txt, INF3.w - 32, PHONE ? 13.5 : 14, { align: 'left', color: '#0f172a', weight: 700 });
    const ty = INF3.y + (PHONE ? 170 : 104);
    D.label(INF3.x + 16, ty, '예상되는 두 영역의 온도: ' + (inf ? '거의 같다 (관측과 일치)' : '서로 다를 것이다 (관측과 모순)'), { bg: tau >= 0.98 ? (inf ? '#15803d' : '#b91c1c') : '#64748b', size: PHONE ? 12.5 : 13.5, align: 'left', pad: 11 });
    if (PHONE) drawWrap(INF3.x + 16, ty + 40, '급팽창(1980년대 구스 등): 약 10⁻³⁶초 무렵 짧은 시간 동안 우주가 10²⁶배 이상 급격히 팽창했다는 설명이에요.', INF3.w - 32, 12.5, { align: 'left', color: '#475569', weight: 700 });
    else drawWrap(INF3.x + 16, ty + 28, '급팽창(1980년대 구스 등): 약 10⁻³⁶초 무렵 짧은 시간 동안 우주가 10²⁶배 이상 급격히 팽창했다는 설명이에요.', INF3.w - 32, 13, { align: 'left', color: '#475569', weight: 700 });
  }

  /* ======================================================
     4단계: 가속 팽창 + 관측 가능한 우주
     ====================================================== */
  const GRF = PHONE ? { x: 10, y: 10, w: 580, h: 430 } : { x: 12, y: 12, w: 470, h: 536 };
  const UNI = PHONE ? { x: 10, y: 450, w: 580, h: 380 } : { x: 494, y: 12, w: 294, h: 536 };
  const grfGeo = () => { const x0 = GRF.x + 56, x1 = GRF.x + GRF.w - 20, y0 = GRF.y + 44, y1 = GRF.y + GRF.h - (PHONE ? 100 : 112), XM = 60, a0 = 0.45, a1 = 1.05; return { x0, x1, y0, y1, gx: (x) => x1 - (x1 - x0) * x / XM, gy: (a) => y1 - (y1 - y0) * (a - a0) / (a1 - a0), XM }; };
  function drawV4(t, dt) {
    const G = grfGeo();
    panel(GRF.x, GRF.y, GRF.w, GRF.h, { title: '우주의 크기 변화: 감속 · 등속 · 가속 (개념도)', tsize: PHONE ? 13.5 : 14 });
    ctx.save(); ctx.fillStyle = '#f8fbff'; ctx.fillRect(G.x0, G.y0, G.x1 - G.x0, G.y1 - G.y0); ctx.strokeStyle = '#e1e8f0'; ctx.lineWidth = 1.2;
    for (let x = 0; x <= G.XM; x += 10) { ctx.beginPath(); ctx.moveTo(G.gx(x), G.y0); ctx.lineTo(G.gx(x), G.y1); ctx.stroke(); TXD(G.gx(x), G.y1 + 17, String(x), 12, '#64748b', 'center'); }
    [0.5, 0.6, 0.7, 0.8, 0.9, 1.0].forEach((a) => { ctx.beginPath(); ctx.moveTo(G.x0, G.gy(a)); ctx.lineTo(G.x1, G.gy(a)); ctx.stroke(); TXD(G.x0 - 6, G.gy(a) + 4.5, f1(a), 12, '#64748b', 'right'); });
    ctx.beginPath(); ctx.rect(G.x0, G.y0, G.x1 - G.x0, G.y1 - G.y0); ctx.clip();
    Object.keys(AGE_MODELS).forEach((k) => {
      const m = AGE_MODELS[k], pts = []; const lim = G.XM * clamp(S.cp, 0, 1);
      for (let x = 0; x <= lim + 1e-6; x += 1) pts.push([G.gx(x), G.gy(clamp(m.a(x), 0.4, 1.1))]);
      if (pts.length > 1) polyline(pts, m.col, S.curve === k ? 5 : 3, { alpha: S.curve && S.curve !== k ? 0.45 : 1 });
    });
    ctx.restore(); ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.8; ctx.strokeRect(G.x0, G.y0, G.x1 - G.x0, G.y1 - G.y0);
    TXD((G.x0 + G.x1) / 2, G.y1 + 38, '과거로부터의 시간 (억 년 전)  ← 과거 · 현재 →', 12.5, '#475569', 'center', 800);
    ctx.save(); ctx.translate(GRF.x + 14, (G.y0 + G.y1) / 2); ctx.rotate(-Math.PI / 2); TXD(0, 0, '우주의 상대적 크기 (현재 = 1)', 12.5, '#475569', 'center', 800); ctx.restore();
    // 범례
    Object.keys(AGE_MODELS).forEach((k, i) => { const m = AGE_MODELS[k]; ctx.fillStyle = m.col; rr(G.x0 + 10 + i * (PHONE ? 130 : 100), G.y0 + 10, 14, 6, 3).fill(); TXD(G.x0 + 30 + i * (PHONE ? 130 : 100), G.y0 + 17, m.nm, PHONE ? 12.5 : 12.5, '#334155', 'left', 800); });
    // 관측점
    const sp = smoothS(S.snT), px = G.gx(SN_OBS.x), py = G.gy(SN_OBS.a);
    if (sp > 0.02) { ctx.save(); ctx.globalAlpha = sp; D.glow(px, py - (1 - sp) * 40, 26, '#a855f7', 0.7); D.sphere(px, py - (1 - sp) * 40, 9, '#a855f7', { shadow: true }); ctx.restore(); if (sp > 0.9) D.label(px, py - 26, '먼 Ia형 초신성 (z = 0.5)', { bg: '#6b21a8', size: PHONE ? 12 : 12.5, pad: 8 }); }
    const by = G.y1 + 60;
    drawWrap(GRF.x + 14, by, '예시: 적색 편이 0.5인 초신성이 예상보다 ' + MAG_DIM.toFixed(2) + '등급 어두워 보여요 → 밝기 비 10^(−0.4×' + MAG_DIM.toFixed(2) + ') = ?, 거리는 몇 배 멀까요?', GRF.w - 28, PHONE ? 12 : 12.5, { align: 'left', color: '#475569', weight: 700 });
    // 관측 가능한 우주
    panel(UNI.x, UNI.y, UNI.w, UNI.h, { fill: 'rgba(12,20,48,.92)', title: '관측 가능한 우주', tcolor: '#e2e8f0', tsize: PHONE ? 14 : 14.5 });
    const ux = UNI.x + UNI.w / 2, uy = UNI.y + (PHONE ? 190 : 250), R = PHONE ? 140 : 112, r = R * OBS_R.age / OBS_R.now, pulse = 1 + 0.02 * Math.sin(t * 1.6), grow = smoothS(S.uni);
    const rO = R * (0.35 + 0.65 * grow);
    D.glow(ux, uy, rO * 1.3, '#6366f1', 0.28);
    ctx.save(); ctx.strokeStyle = '#a5b4fc'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(ux, uy, rO * pulse, 0, TAU); ctx.stroke(); ctx.fillStyle = 'rgba(99,102,241,.14)'; ctx.fill(); ctx.restore();
    ctx.save(); ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2.4; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.arc(ux, uy, r * (0.35 + 0.65 * grow), 0, TAU); ctx.stroke(); ctx.restore();
    D.glow(ux, uy, 18, '#38bdf8', 0.8); D.sphere(ux, uy, 6, '#38bdf8', { shadow: false });
    // 빛이 온 길
    const gax = ux + rO * 0.78, gay = uy - rO * 0.55;
    D.sphere(gax, gay, 6, '#fde68a', { shadow: false });
    ctx.save(); ctx.strokeStyle = 'rgba(253,230,138,.8)'; ctx.lineWidth = 2; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(gax, gay); ctx.lineTo(ux, uy); ctx.stroke(); ctx.restore();
    TX(ux + 8, uy + 22, '우리', 12.5, '#7dd3fc', 'left', 800);
    TX(ux, UNI.y + UNI.h - (PHONE ? 112 : 128), 'c × t = ' + OBS_R.age + '억 광년 (점선 원)', PHONE ? 13 : 12.5, '#fcd34d', 'center', 800);
    TX(ux, UNI.y + UNI.h - (PHONE ? 86 : 100), S.radShown ? '반지름 약 ' + OBS_R.now + '억 광년 (실선 원)' : '관측 가능한 우주(실선 원)의 반지름 = ?', PHONE ? 13 : 12.5, S.radShown ? '#c7d2fe' : '#94a3b8', 'center', 800);
    drawWrap(ux, UNI.y + UNI.h - (PHONE ? 62 : 70), '이동하는 동안 우주가 팽창해서, 처음 빛을 낸 은하는 지금 138억 광년보다 훨씬 멀어졌어요.', UNI.w - 24, PHONE ? 12 : 12, { align: 'center', color: '#cbd5e1', weight: 700, lh: 1.25 });
  }

  /* ======================================================
     컨트롤 연결
     ====================================================== */
  const modeSeg = $('#modeSeg'), sA = $('#sA'), oA = $('#oA'), sTau = $('#sTau'), oTau = $('#oTau');
  const inLam = $('#inLam'), inStr = $('#inStr'), inBr = $('#inBr'), inDist = $('#inDist');
  const PRED_OPTS = ['은하들이 서로 멀어지는 것', '허블-르메트르 법칙이 성립하는 것', '과거 우주의 밀도와 온도', '먼 은하의 스펙트럼선이 적색 편이를 보이는 것'];
  $('#predSeg').innerHTML = PRED_OPTS.map((s, i) => '<button class="opt" type="button" data-k="' + i + '" style="text-align:left;font-size:14px">' + s + '</button>').join('');
  const PICK_OPTS = ['빅뱅 우주론', '정상 상태 우주론', '두 우주론 모두', '정적 우주론'];
  $('#pickSeg').innerHTML = PICK_OPTS.map((s, i) => '<button class="opt" type="button" data-k="' + i + '">' + s + '</button>').join('');
  const RAD_OPTS = ['약 138억 광년', '약 465억 광년', '약 930억 광년', '약 1380억 광년'];
  $('#radSeg').innerHTML = RAD_OPTS.map((s, i) => '<button class="opt" type="button" data-k="' + i + '">' + s + '</button>').join('');
  $('#curveSeg').innerHTML = Object.keys(AGE_MODELS).map((k) => '<button class="opt" type="button" data-k="' + k + '">' + AGE_MODELS[k].nm + '</button>').join('');
  const killTw = (obj, keys) => keys.forEach((k) => { SciSim.tween(obj, { [k]: obj[k] }, { duration: 0.0001 }); });

  function setView(v) { if (S.view !== v) { S.view = v; S.fade = 1; parts.clear(); S.over = null; dn1.drag = null; } updateCtl(); }
  const okBr = () => { const v = parseNum(inBr.value); return isFinite(v) && Math.abs(v - BR_RATIO) <= 0.02; };
  const okDist = () => { const v = parseNum(inDist.value); return isFinite(v) && Math.abs(v - DIST_RATIO) <= 0.02; };
  function updateCtl() {
    $('#tbLabel').textContent = VIEW_LABEL[S.view];
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !c.dataset.modes.split(' ').includes(S.view); });
    const free = !!(game && game.free);
    $('#cmpBox').hidden = !(S.view === 'v1' && (S.cmpOn || free));
    $('#calcBox').hidden = !(S.view === 'v2' && (S.calcOn || free));
    $('#pickBox').hidden = !(S.view === 'v2' && (S.pickOn || free));
    $('#radBox').hidden = !(S.view === 'v4' && (S.radOn || free));
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.view === S.view));
    if (modeSeg) modeSeg.hidden = !free;
    $$('#predSeg .opt').forEach((b) => b.classList.toggle('on', S.predPick === +b.dataset.k));
    $$('#pickSeg .opt').forEach((b) => b.classList.toggle('on', S.pickC === +b.dataset.k));
    $$('#radSeg .opt').forEach((b) => b.classList.toggle('on', S.radPick === +b.dataset.k));
    $$('#curveSeg .opt').forEach((b) => b.classList.toggle('on', S.curve === b.dataset.k));
    $$('#infSeg .opt').forEach((b) => b.classList.toggle('on', (b.dataset.k === 'on') === S.inf));
    $('#bPlay3').textContent = S.playing ? '⏸ 멈춤' : (S.tau >= 0.995 ? '↺ 다시 실행' : '▶ 시간 흐르게 하기');
    $('#bMap').textContent = S.mapBig ? '🔍 실제 모습으로 보기' : '🔍 온도 차이를 크게 보기';
  }
  /* 1단계 */
  $('#bReset1').addEventListener('click', () => { Sound.click(); dn1.reset(); updateCtl(); });
  $$('#predSeg .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.predPick = +b.dataset.k; updateCtl(); }));
  /* 2단계 */
  const aOut = (v) => { const a = aOf(v); return '×' + (a >= 100 ? f0(a) : f1(a)); };
  sA.addEventListener('input', () => { S.aS = +sA.value; sA.style.setProperty('--pct', (S.aS / 10) + '%'); oA.textContent = aOut(S.aS); });
  function setA(v) { S.aS = clamp(v, 0, 1000); setSlider(sA, oA, S.aS, aOut); }
  $('#bMap').addEventListener('click', () => { Sound.click(); S.mapBig = !S.mapBig; SciSim.tween(S, { mapAmp: S.mapBig ? 1 : 0.05 }, { duration: 0.9, ease: 'outCubic' }); updateCtl(); });
  $$('#pickSeg .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.pickC = +b.dataset.k; updateCtl(); }));
  /* 3단계 */
  $$('#infSeg .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); setInf(b.dataset.k === 'on'); }));
  function setInf(on) { S.inf = on; S.playing = false; setTau(0); S.tauD = 0; updateCtl(); }
  const tauOut = (v) => f0(v / 10) + '%';
  sTau.addEventListener('input', () => { S.tau = +sTau.value / 1000; S.playing = false; sTau.style.setProperty('--pct', (+sTau.value / 10) + '%'); oTau.textContent = tauOut(+sTau.value); updateCtl(); });
  function setTau(v) { S.tau = clamp(v, 0, 1); setSlider(sTau, oTau, Math.round(S.tau * 1000), tauOut); }
  $('#bPlay3').addEventListener('click', () => { Sound.click(); if (S.tau >= 0.995) { setTau(0); S.tauD = 0; } S.playing = !S.playing; updateCtl(); });
  /* 4단계 */
  function setCurve(k) { S.curve = k; updateCtl(); }
  $$('#curveSeg .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); setCurve(b.dataset.k); }));
  $$('#radSeg .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.radPick = +b.dataset.k; updateCtl(); }));

  /* ---------- 포인터 ---------- */
  SciSim.pointer(view, {
    down(p) { return S.view === 'v1' ? dn1.down(p) : false; },
    move(p) { if (S.view === 'v1') { dn1.move(p); S.over = dn1.drag && dn1.moved ? dn1.binAt(p) : null; } },
    up(p) { if (S.view === 'v1') dn1.up(p); S.over = null; updateCtl(); },
    hover(p) { return S.view === 'v1' && dn1.hit(p) ? 'grab' : 'default'; },
  });

  /* ---------- 읽기 칸 ---------- */
  function readouts() {
    const v = S.view;
    if (v === 'v1') setReadouts(['상자에 넣은 카드', grouped1() + ' / 6', '알맞은 상자', EVID.filter((e) => e.bin === e.ans).length + '장', '두 가지 우주관', '정적 우주 · 팽창 우주']);
    else if (v === 'v2') { const Tc = T_EMIT / S.aD; setReadouts(['팽창 배율 a', '×' + (S.aD >= 100 ? f0(S.aD) : f1(S.aD)), '배경 복사의 온도', (S.aS >= 999 ? '2.725' : f1(Tc)) + ' K', '꼭짓점 파장 λmax', lamTxt(WIEN / Tc)]); }
    else if (v === 'v3') setReadouts(['급팽창', S.inf ? '있음' : '없음', '경과 시간', f0(S.tau * 100) + '%', '두 영역의 접촉', contact(S.tau, S.inf) ? '접촉함' : '접촉 못 함']);
    else setReadouts(['고른 곡선', S.curve ? AGE_MODELS[S.curve].nm : '-', '밝기 비 · 거리 비', (okBr() ? f2(BR_RATIO) : '?') + ' · ' + (okDist() ? f2(DIST_RATIO) : '?'), '관측 가능한 우주 반지름', S.radShown ? '약 ' + OBS_R.now + '억 광년' : '?']);
  }

  /* ======================================================
     단계 · 미션
     ====================================================== */
  function enterLevel(li) {
    clearTimeout(hintTimer); parts.clear(); flash.t = 0; S.playing = false;
    if (li === 0) { dn1.reset(); S.cmpOn = false; S.predPick = null; setView('v1'); showHint('증거 카드를 두 상자 중 하나로 끌어 넣어요', 5000); }
    else if (li === 1) { S.calcOn = false; S.pickOn = false; S.pickC = null; inLam.value = ''; inStr.value = ''; setA(0); S.aD = 1; S.laD = 0; S.mapBig = false; S.mapAmp = 0.05; killTw(S, ['mapAmp']); S.obsA = 0; setView('v2'); showHint('우주의 팽창 배율 슬라이더를 움직여 봐요', 5000); }
    else if (li === 2) { S.seenEnd = { off: false, on: false }; S.inf = false; setTau(0); S.tauD = 0; setView('v3'); showHint('▶ 시간 흐르게 하기를 눌러 두 영역을 지켜봐요', 5000); }
    else { S.curve = null; S.cp = 0; S.snT = 0; S.radOn = false; S.radPick = null; S.radShown = false; S.uni = 0; inBr.value = ''; inDist.value = ''; killTw(S, ['cp', 'snT', 'uni']); SciSim.tween(S, { cp: 1 }, { duration: 1.6, ease: 'outCubic' }); SciSim.tween(S, { snT: 1 }, { duration: 0.9, delay: 1.6, ease: 'outBack' }); SciSim.tween(S, { uni: 1 }, { duration: 1.8, delay: 0.4, ease: 'outCubic' }); setView('v4'); showHint('세 곡선과 초신성 관측점을 비교해 봐요', 5000); }
    updateCtl();
  }
  const tbl = (rows) => '<table class="mini">' + rows.map((r, i) => '<tr>' + r.map((c) => (i === 0 ? '<th>' : '<td>') + c + (i === 0 ? '</th>' : '</td>')).join('') + '</tr>').join('') + '</table>';

  const levels = [
    {
      title: '정적 우주에서 팽창 우주로', short: '정적→팽창', icon: '🗂', phase: '탐구', features: ['evidence'],
      intro: '<p class="si-q">❓ 탐구 질문: 우주는 영원히 변하지 않는 것일까? 우리는 우주의 어디까지 볼 수 있을까?</p>' +
        '<div class="si-link">🔗 <b>통합과학에서</b> 빅뱅 우주(수소·헬륨이 만들어지고, 약 38만 년 뒤 원자가 생기며 빛이 나아가기 시작)를 배웠어요. <b>앞 차시에서</b>는 허블-르메트르 법칙으로 우주가 팽창한다는 것을 확인했어요.</div>' +
        '<p>20세기 초에는 우주가 <b>변하지 않는다</b>는 <b>정적 우주</b>를 많은 사람이 믿었어요. 아인슈타인(1917)도 우주 상수를 넣어 정적 우주를 유지하려 했어요. 그러다 관측 증거가 쌓여 <b>팽창 우주</b>가 받아들여졌어요.</p>' +
        '<p>증거 카드 6장이 <b>정적 우주를 지지</b>하는지 <b>반박</b>하는지 나눠 봐요. 이렇게 관측 증거로 이론이 바뀌는 과정을 귀납적으로 추론해요.</p>',
      setup() { enterLevel(0); },
      recap: '관측 증거(적색 편이, 거리-속도 직선)가 정적 우주를 반박하고 팽창 우주가 받아들여졌어요. 팽창 우주론은 빅뱅 우주론과 정상 상태 우주론으로 나뉘어요.',
      summary: '<ul><li><b>정적 우주</b>: 우주는 시간에 따라 변하지 않는다. 아인슈타인(1917)이 우주 상수를 도입해 유지하려 했어요.</li><li><b>팽창 우주</b>: 허블-르메트르 법칙(1920년대 후반)과 먼 은하의 적색 편이가 증거예요.</li><li>팽창 우주의 두 설명: <b>빅뱅 우주론</b>(과거에 뜨겁고 밀도 높은 한 점에서 시작해 팽창) vs <b>정상 상태 우주론</b>(팽창하지만 새 물질이 계속 생겨 밀도가 일정)</li><li>두 우주론은 <b>과거 우주의 밀도와 온도</b>를 다르게 예측해요 → 관측으로 판가름할 수 있어요.</li></ul>' +
        tbl([['', '빅뱅 우주론', '정상 상태 우주론'], ['팽창', '한다', '한다'], ['새 물질', '없음', '계속 생김'], ['과거 우주', '뜨겁고 밀도 높음', '지금과 같음']]),
      missions: [
        {
          title: '증거 카드 분류하기', manual: true,
          goal: '증거 카드 6장을 <b>정적 우주를 지지</b>하는 상자와 <b>반박</b>하는 상자로 나눠요. 다 나눈 뒤 <b>✔ 확인하기</b>를 눌러요.',
          setup() { dn1.reset(); setView('v1'); updateCtl(); },
          hint: '우주가 변하지 않는다는 생각을 뒷받침하면 지지, 은하가 멀어지거나 우주가 변해 왔다는 증거면 반박이에요.',
          check: () => {
            if (grouped1() < 6) return '카드 6장을 모두 상자에 넣어요. (' + grouped1() + ' / 6)';
            const bad = EVID.filter((e) => e.bin !== e.ans);
            if (!bad.length) return true;
            bad.forEach((e) => { if (!e.wrong) { e.wrong = true; e.shake = 1; } });
            return bad.length + '장이 알맞지 않은 상자에 있어요. 빨간 테두리의 카드를 다시 생각해 봐요.';
          },
          explain: '<b>별자리 불변</b>과 <b>우주 상수</b>는 정적 우주 쪽이에요. <b>적색 편이, 거리-속도 직선, 중심 없는 팽창, 2.7 K 복사</b>는 우주가 변해 왔다는 증거로 정적 우주를 반박해요.',
        },
        {
          title: '두 우주론의 서로 다른 예측', manual: true,
          goal: '빅뱅 우주론과 정상 상태 우주론이 <b>서로 다르게 예측하는 것</b>을 골라요. 고른 뒤 <b>✔ 확인하기</b>를 눌러요.',
          setup() { S.cmpOn = true; S.predPick = null; setView('v1'); updateCtl(); },
          hint: '둘 다 은하가 멀어지는 팽창을 인정해요. 표에서 서로 다른 칸을 찾아봐요.',
          check: () => (S.predPick == null ? '하나를 골라요.' : S.predPick === 2 ? true : '그것은 두 우주론 모두 설명할 수 있어요. 표에서 서로 다른 칸을 찾아봐요.'),
          explain: '두 우주론 모두 팽창을 인정하지만, 빅뱅 우주론은 <b>과거 우주가 지금보다 뜨겁고 밀도가 높았다</b>고, 정상 상태 우주론은 <b>밀도가 일정</b>하다고 예측해요. 그래서 과거의 흔적을 관측하면 판가름할 수 있어요.',
        },
        {
          type: 'quiz', title: '우주 상수와 허블의 관측', goal: '아인슈타인이 <b>우주 상수</b>를 도입한 까닭과, 허블의 관측이 정적 우주론에 끼친 영향으로 알맞은 것은?', setup() { setView('v1'); },
          choices: ['우주를 더 빨리 팽창시키려고 도입했고, 허블의 관측은 이를 확인했어요', '중력 때문에 우주가 수축하지 않고 정적으로 유지되게 하려고 도입했는데, 허블의 관측으로 우주가 팽창한다는 것이 알려졌어요', '은하가 서로 가까워지는 것을 설명하려고 도입했고, 허블은 우주가 수축한다고 확인했어요', '우주 상수는 허블의 관측 결과를 설명하려고 만든 값이에요'],
          answer: 1,
          feedback: ['우주 상수는 우주가 정적으로 유지되게 하려는 것이었어요. 팽창을 설명하려고 넣은 것이 아니에요.', '', '허블-르메트르 법칙은 은하가 멀어진다는 것을 보여 줘요. 수축이 아니라 팽창이에요.', '우주 상수는 1917년에 도입된 것이고, 허블의 관측(1920년대 후반)은 그 뒤에 나왔어요.'],
          explain: '아인슈타인은 중력으로 우주가 수축하지 않도록 <b>우주 상수</b>를 넣어 정적 우주를 만들었어요. 하지만 허블-르메트르 법칙으로 우주가 <b>팽창</b>한다는 증거가 나오면서 정적 우주론은 받아들여지지 않게 됐어요.',
        },
      ],
    },
    {
      title: '우주 배경 복사: 빅뱅의 식어 가는 잔광', short: '배경 복사', icon: '📡', phase: '분석', features: ['cmb'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 빅뱅 우주론은 과거 우주가 뜨겁고 밀도가 높았다고 예측하는 것을 봤어요.</div>' +
        '<p><b>우주 배경 복사</b>는 1965년에 발견됐어요. 모든 방향에서 거의 같은 온도 <b>2.7 K</b>(2.725 K)의 흑체복사 스펙트럼을 가지며, <b>빅뱅의 식어 가는 잔광</b>으로 빅뱅 우주론만 예측했어요. 통합과학에서 배운 대로 우주는 약 38만 년 뒤 온도가 약 3000 K까지 식어 원자가 만들어졌고, 이때 빛이 나아가기 시작했어요.</p>' +
        '<p>빈의 법칙 <b>λmax = 2.9×10⁻³ ÷ T</b>로 방출 당시와 지금의 꼭짓점 파장을 비교해 우주가 얼마나 팽창했는지 알아봐요.</p>',
      setup() { enterLevel(1); },
      recap: '우주 배경 복사는 빅뱅의 잔광이에요. 팽창으로 파장이 약 1100배 늘어나 지금은 2.7 K의 마이크로파로 관측돼요.',
      summary: '<ul><li><b>우주 배경 복사</b>(1965 발견): 모든 방향에서 거의 같은 <b>2.7 K</b>(2.725 K) 흑체복사 → 빅뱅의 식어 가는 잔광 (온도 차이는 약 10⁻⁵). 빅뱅 우주론만 예측해요.</li><li>지금: λmax = 2.9×10⁻³ ÷ 2.725 ≈ <b>1.06 mm</b>(마이크로파) / 방출 당시(약 38만 년, 약 3000 K): λmax ≈ <b>0.97 μm</b></li><li>파장이 1.06 mm ÷ 0.97 μm ≈ <b>1100배</b>로 늘어났어요 → 그 사이 우주가 약 1100배 팽창했어요.</li><li>그 밖의 증거: 수소 : 헬륨의 질량비가 약 3 : 1(약 75 : 25)</li></ul>',
      missions: [
        {
          title: '늘어난 파장 계산하기',
          goal: '슬라이더를 <b>끝까지</b> 움직여 곡선이 관측값과 일치하게 한 뒤, 지금의 <b>λmax(mm)</b>와 방출 당시보다 파장이 <b>늘어난 배율</b>을 계산해 써요.',
          hint: 'λmax = 2.9×10⁻³ m ÷ 2.725 K ≈ 1.06 mm 이고, 방출 당시는 2.9×10⁻³ ÷ 3000 ≈ 0.97 μm 예요. 1.06 mm ÷ 0.97 μm 를 계산해요.',
          hold: 0.5, setup() { S.calcOn = true; setView('v2'); updateCtl(); },
          status: () => '슬라이더 끝까지 ' + mark(S.aS >= 995) + ' · λmax ' + mark(okLam()) + ' · 늘어난 배율 ' + mark(okStr()),
          check: () => S.aS >= 995 && okLam() && okStr(),
          explain: '지금 λmax = 2.9×10⁻³ ÷ 2.725 ≈ <b>1.06 mm</b>, 방출 당시 λmax ≈ <b>0.97 μm</b>이므로 약 <b>1100배</b> 늘어났어요. 우주가 그만큼 팽창했다는 뜻이에요.',
        },
        {
          title: '배경 복사를 예측한 우주론', manual: true,
          goal: '우주 배경 복사를 <b>예측</b>한 우주론은 무엇일까요? 고른 뒤 <b>✔ 확인하기</b>를 눌러요.',
          setup() { S.pickOn = true; S.pickC = null; setView('v2'); updateCtl(); },
          hint: '과거 우주가 뜨겁고 밀도가 높았다면, 그때의 빛이 식어서 지금도 남아 있어야 해요.',
          check: () => (S.pickC == null ? '하나를 골라요.' : S.pickC === 0 ? true : S.pickC === 1 ? '정상 상태 우주론에서는 과거에도 온도와 밀도가 지금과 같아서 이런 잔광이 필요하지 않아요.' : S.pickC === 2 ? '정상 상태 우주론은 식어 가는 잔광을 예측하지 않았어요.' : '정적 우주론은 이미 반박된 우주론이에요.'),
          explain: '과거에 뜨겁고 밀도가 높았다고 보는 <b>빅뱅 우주론</b>만 식어 가는 잔광(배경 복사)을 예측했고, 관측이 이를 확인해서 빅뱅 우주론이 널리 받아들여지게 됐어요.',
        },
        {
          type: 'quiz', title: '배경 복사가 마이크로파인 까닭', goal: '우주 배경 복사는 처음에 약 3000 K의 빛이었는데, 지금은 <b>마이크로파</b>(약 1 mm)로 관측돼요. 그 까닭은?', setup() { setView('v2'); },
          choices: ['우주가 팽창하면서 빛의 파장이 늘어났기 때문이에요', '빛이 지구 대기에서 흡수되었기 때문이에요', '별이 마이크로파만 내기 때문이에요', '우주가 식으면서 빛이 사라지고 새로운 마이크로파가 생겼기 때문이에요'],
          answer: 0,
          feedback: ['', '지구 대기와는 상관없이, 우주 공간에서 이미 파장이 늘어난 빛이에요.', '배경 복사는 별에서 나온 빛이 아니라 우주 초기의 빛이에요.', '빛이 사라진 것이 아니라 파장이 길어진 거예요. 같은 빛이 팽창하며 늘어났어요.'],
          explain: '우주가 팽창하면서 빛의 파장도 함께 늘어나요(약 1100배). 방출 당시 약 1 μm 정도였던 꼭짓점 파장이 지금은 약 1.06 mm인 <b>마이크로파</b>가 됐고, 온도로는 3000 K에서 2.725 K로 내려간 것에 해당해요.',
        },
      ],
    },
    {
      title: '급팽창: 하늘 전체의 같은 온도', short: '급팽창', icon: '🎈', phase: '모형', features: ['inflation'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 우주 배경 복사가 모든 방향에서 거의 같은 온도(차이 약 10⁻⁵)임을 확인했어요.</div>' +
        '<p>하늘의 <b>정반대 쪽</b>에 있는 두 영역 A, B는 서로 아주 멀리 떨어져 있어요. 우주가 일정한 속도로 팽창했다면 두 영역은 빛이 서로 닿을 만큼의 시간이 없었어요(<b>지평선 문제</b>). 그런데 온도는 거의 같아요.</p>' +
        '<p><b>급팽창</b>(1980년대 구스 등)은 약 10⁻³⁶초 무렵 짧은 시간에 우주가 10²⁶배 이상 급격히 팽창했다는 설명이에요. 원래 가까웠던 작은 영역이 커져서 두 영역이 과거에 접촉했다고 보면 온도가 같은 것을 설명할 수 있어요. 개략적인 개념도로 살펴봐요.</p>',
      setup() { enterLevel(2); },
      recap: '급팽창은 지평선 문제(하늘 전체가 거의 같은 온도인 까닭)를 설명해요. 아주 초기에 작은 영역이 접촉한 뒤 급격히 커졌다고 봐요.',
      summary: '<ul><li><b>지평선 문제</b>: 하늘의 반대쪽 두 영역의 온도가 거의 같은데(차이 약 10⁻⁵), 일정한 속도로 팽창했다면 서로 신호를 주고받을 시간이 없었어요.</li><li><b>급팽창</b>(1980년대 구스 등): 약 10⁻³⁶초 무렵 짧은 시간에 우주가 <b>10²⁶배 이상</b> 급격히 팽창</li><li>원래 가까워 서로 접촉했던 작은 영역이 커져서 온도가 같아요.</li></ul>',
      missions: [
        {
          title: '급팽창 껐다 켜기',
          goal: '<b>급팽창 끄기</b>와 <b>켜기</b> 각각에서 시간을 끝(약 38만 년)까지 흘려보내며, 두 영역의 <b>접촉</b>과 <b>온도</b>를 비교해요.',
          hint: '▶ 시간 흐르게 하기를 눌러 끝까지 보거나, 시간 슬라이더를 끝까지 움직여도 돼요. 급팽창 끄기/켜기 버튼으로 바꿔요.',
          hold: 0.4, setup() { S.seenEnd = { off: false, on: false }; S.inf = false; setTau(0); S.tauD = 0; setView('v3'); updateCtl(); },
          status: () => '급팽창 끄기 ' + mark(S.seenEnd.off) + ' · 급팽창 켜기 ' + mark(S.seenEnd.on),
          check: () => S.seenEnd.off && S.seenEnd.on,
          explain: '급팽창이 <b>없으면</b> 두 영역은 한 번도 접촉하지 못해서 온도가 달라야 하는데 관측과 맞지 않아요. 급팽창이 <b>있으면</b> 아주 초기에 접촉해 온도가 같아졌고, 그 뒤 급팽창으로 멀어져도 온도가 같게 남아요.',
        },
        {
          type: 'quiz', title: '급팽창이 설명하는 것', goal: '급팽창이 설명하는 관측 사실은 무엇일까요?', setup() { setView('v3'); },
          choices: ['은하의 후퇴 속도가 거리에 비례하는 것', '하늘 전체에서 우주 배경 복사의 온도가 거의 같은 것', '먼 초신성이 예상보다 어두운 것', '별의 일생이 질량에 따라 다른 것'],
          answer: 1,
          feedback: ['그것은 허블-르메트르 법칙으로 설명하는 팽창 우주의 증거예요.', '', '그것은 가속 팽창의 증거예요(다음 단계).', '별의 진화는 우주론과 다른 이야기예요.'],
          explain: '급팽창은 서로 신호를 주고받을 수 없었던 하늘의 반대쪽 영역이 <b>거의 같은 온도</b>(차이 약 10⁻⁵)인 까닭을 설명해요. 아주 초기에 가까이 있던 영역이 급격히 커졌기 때문이에요.',
        },
      ],
    },
    {
      title: '가속 팽창과 관측 가능한 우주', short: '가속 팽창', icon: '🚀', phase: '분석', features: ['accel'],
      intro: '<div class="si-link">🔗 <b>앞 단계까지</b> 팽창 우주, 배경 복사, 급팽창을 배웠어요. 우주의 팽창 속도는 시간에 따라 어떻게 변했을까요?</div>' +
        '<p>중력은 팽창을 늦추므로 한때 팽창은 점점 느려진다(감속)고 예상했어요. 그런데 1998년 먼 <b>Ia형 초신성</b>을 관측했더니 예상보다 <b>어둡게</b> 보였어요. 더 멀리 있다는 뜻이고, 우주의 팽창이 <b>가속</b>되고 있다는 증거예요(노벨 물리학상 2011). 가속의 원인은 &quot;암흑 에너지&quot;라고 부르지만 정체는 <b>아직 밝혀지지 않았어요</b>.</p>' +
        '<p>또 우주 나이(138억 년) 동안 빛이 갈 수 있는 거리 안의 영역을 <b>관측 가능한 우주</b>라고 해요.</p>',
      setup() { enterLevel(3); },
      recap: '먼 초신성이 예상보다 어두운 것은 우주의 팽창이 가속되고 있다는 증거예요. 관측 가능한 우주의 반지름은 약 465억 광년이에요.',
      summary: '<ul><li><b>가속 팽창</b>(1998): 먼 Ia형 초신성이 감속 팽창일 때 예상한 값보다 <b>어둡다</b> → 더 멀리 있다 → 팽창이 가속. 원인은 &quot;암흑 에너지&quot;라 부르지만 정체는 아직 몰라요.</li><li>예: 적색 편이 0.5인 초신성이 예상보다 0.25등급 어두움 → 밝기 비 10^(−0.4×0.25) ≈ 0.79 → 거리는 1/√0.79 ≈ <b>1.12배</b></li><li><b>관측 가능한 우주</b>: 우주 나이(138억 년) 동안 빛이 도달할 수 있는 영역. c × t = 138억 광년이지만 이동하는 동안 우주가 팽창해서 현재 그 천체까지의 거리는 약 <b>465억 광년</b> → 반지름 약 465억 광년(지름 약 930억 광년)</li><li>관측자마다 중심이 달라요. 그 너머에도 우주가 있을 수 있지만 빛이 아직 도달하지 못했어요.</li></ul>',
      missions: [
        {
          title: '초신성 관측점과 거리 계산',
          goal: '초신성 관측점에 <b>가장 가까운 곡선</b>을 고르고, 0.25등급 어두운 것에서 <b>밝기 비</b>와 <b>거리 비</b>를 계산해 써요.',
          hint: '밝기 비 = 10^(−0.4 × 0.25) ≈ 0.79 이고, 밝기가 0.79배면 거리는 1/√0.79 ≈ 1.12배예요.',
          hold: 0.5, setup() { S.radOn = false; setView('v4'); updateCtl(); },
          status: () => '곡선 ' + mark(S.curve === 'accel') + ' · 밝기 비 ' + mark(okBr()) + ' · 거리 비 ' + mark(okDist()),
          check: () => S.curve === 'accel' && okBr() && okDist(),
          explain: '관측점은 <b>가속 팽창</b> 곡선 위에 있어요. 밝기 비 10^(−0.4×0.25) ≈ <b>0.79</b>, 거리는 약 <b>1.12배</b> 멀리 있어요. 팽창이 가속되었기 때문에 빛이 더 오래 달려 더 멀리 있게 된 거예요.',
        },
        {
          title: '관측 가능한 우주의 반지름', manual: true,
          goal: '관측 가능한 우주의 <b>반지름</b>으로 알맞은 것을 골라요. 고른 뒤 <b>✔ 확인하기</b>를 눌러요.',
          setup() { S.radOn = true; S.radPick = null; setView('v4'); updateCtl(); },
          hint: '빛이 138억 년 동안 달리는 동안 우주도 팽창했어요. 그래서 지금 그 천체까지의 거리는 138억 광년보다 커요. 지름이 아니라 반지름이에요.',
          check: () => (S.radPick == null ? '하나를 골라요.' : S.radPick === 1 ? (S.radShown = true) : S.radPick === 0 ? 'c × t = 138억 광년은 빛이 달린 거리예요. 이동하는 동안 우주가 팽창해서 지금은 더 멀어요.' : S.radPick === 2 ? '약 930억 광년은 지름이에요. 반지름을 골라야 해요.' : '그렇게 크지는 않아요. 팽창을 고려해도 약 465억 광년이에요.'),
          explain: '관측 가능한 우주의 <b>반지름은 약 465억 광년</b>(지름 약 930억 광년)이에요. c × t = 138억 광년이지만 이동하는 동안 팽창해서 지금 그 천체까지의 거리가 더 커졌어요.',
        },
        {
          type: 'quiz', title: '관측 가능한 우주와 가속 팽창', goal: '관측 가능한 우주의 반지름이 우주 나이 × 빛의 속력보다 <b>큰</b> 까닭과, 가속 팽창의 원인에 대해 옳은 것은?', setup() { setView('v4'); },
          choices: ['빛이 우주 나이보다 오래 달렸기 때문이에요. 가속 팽창의 원인은 이미 모두 밝혀졌어요', '빛이 달리는 동안 우주가 팽창해서 그 천체까지의 거리가 늘어났기 때문이에요. 가속의 원인은 아직 밝혀지지 않았어요', '빛이 팽창하는 우주에서는 더 빠르게 달리기 때문이에요. 가속의 원인은 빅뱅이에요', '관측 가능한 우주의 반지름은 c × t와 항상 같아요'],
          answer: 1,
          feedback: ['빛은 우주 나이 동안만 달릴 수 있어요. 가속의 원인도 아직 이름만 붙인 상태예요.', '', '빛의 속력은 변하지 않아요. 공간이 늘어나서 거리가 커진 거예요.', '팽창 때문에 현재 거리는 c × t보다 커요(약 465억 광년).'],
          explain: '빛이 달리는 동안 <b>우주가 팽창</b>해서 현재 거리가 138억 광년보다 큰 약 465억 광년이 돼요. 가속 팽창의 원인은 &quot;암흑 에너지&quot;라고 부르지만 <b>정체는 아직 밝혀지지 않았어요</b>.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'he-cosmology', mount: '#game', badge: '우주론 탐험가', homeHref: '../../index.html#he',
    featureLabels: { evidence: '🗂 증거 카드 · 두 우주론', cmb: '📡 하늘 지도 · 흑체 곡선', inflation: '🎈 급팽창 개념도', accel: '🚀 팽창 곡선 · 관측 가능한 우주' },
    onFeatures() { updateCtl(); },
    levels,
  });
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setView(b.dataset.view); }));

  /* ---------- 루프 ---------- */
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    // 2단계
    S.laD = approach(S.laD == null ? 0 : S.laD, Math.log(aOf(S.aS)), dt, 8); S.aD = Math.exp(S.laD);
    S.obsA = approach(S.obsA, S.aS >= 995 ? 1 : 0, dt, 4);
    // 3단계
    if (S.playing) { S.tau = Math.min(1, S.tau + dt / 9); setSlider(sTau, oTau, Math.round(S.tau * 1000), tauOut); if (S.tau >= 1) { S.playing = false; updateCtl(); } }
    S.tauD = approach(S.tauD, S.tau, dt, 10);
    if (S.tau >= 0.995) { const k = S.inf ? 'on' : 'off'; if (!S.seenEnd[k]) { S.seenEnd[k] = true; Sound.success(); } }
    // 4단계
    if (S.radPick === 1 && !S.radShown && S.radOn) { /* 정답을 맞힌 뒤에 보여 줘요 */ }
    dn1.update(dt);
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    ctx.fillStyle = '#070d1f'; ctx.fillRect(0, 0, VW, VH);
    BGST.forEach((s) => { ctx.fillStyle = 'rgba(255,255,255,' + (0.15 + 0.4 * (0.5 + 0.5 * Math.sin(t * s[3] + s[2]))) + ')'; ctx.fillRect(s[0] * VW, s[1] * VH, 1.6, 1.6); });
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
    S, VW, VH, EVID, binRect, dn1, grfGeo, A_MAX, STRETCH, LAM_NOW, BR_RATIO, DIST_RATIO, AGE_MODELS, SN_OBS,
    get game() { return game; },
    enterLevel, setView, setA, setInf, setTau, setCurve, updateCtl, parseNum,
    solveCards() { EVID.forEach((e) => dn1.assign(e, e.ans)); dn1.snap(); },
  };

})();
