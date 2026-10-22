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
     지구과학 Ⅲ. 태양계 천체와 별과 우주의 진화 - 허블의 은하 분류
     [12지구03-04] 허블의 은하 분류 체계에 따른 은하의 특징을 비교
     ① 관찰: 은하 12장을 모양별로 묶기   ② 분류: 타원 은하 En 재기 · 소리굽쇠 도표에 나선 은하 놓기
     ③ 분석: 유형별 성간 물질·푸른 별·별의 나이   ④ 탐구: 빅데이터·AI로 은하 분류 (훈련 8개 · 시험 4개)
     허블 분류는 모양에 따른 형태학적 분류예요. 은하의 그림은 모두 합성 이미지이고, 수치는 교육용 예시 값이에요.
     ========================================================= */
  initStage('#070d1f', 800, 560, 600, 840, 1.25);
  const TX = (x, y, s, size, color, align, weight) => D.text(x, y, s, { size: size || 14, color: color || '#e2e8f0', align: align || 'left', weight: weight || 700 });
  const TXD = (x, y, s, size, color, align, weight) => D.text(x, y, s, { size: size || 14, color: color || '#334155', align: align || 'left', weight: weight || 700 });
  const sqrt = Math.sqrt, log10 = Math.log10, pow = Math.pow;
  const f0 = (x) => String(Math.round(x));
  const f1 = (x) => (Math.round(x * 10) / 10).toFixed(1);
  function parseNum(str) {
    let s = String(str).trim().replace(/,/g, '').replace(/\s+/g, '').replace(/[%％]/g, '');
    s = s.replace(/[×xX*]10\^?\(?(-?\d+)\)?/, 'e$1').replace('−', '-');
    if (/^-?[\d.]+\/[\d.]+$/.test(s)) { const p = s.split('/'); return +p[0] / +p[1]; }
    const m = /^-?(\d+\.?\d*|\.\d+)(e-?\d+)?$/i.exec(s);
    return m ? parseFloat(s) : NaN;
  }
  const mulberry = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

  /* ---------- 은하 그림(합성) ---------- */
  const SPR = {};
  const PITCH = { a: 9, b: 16, c: 26 }, BULGE = { a: 0.26, b: 0.17, c: 0.09 }, BARL = { a: 0.44, b: 0.39, c: 0.34 };
  /* spec: {t:'E', n, seed} | {t:'S0'} | {t:'S', arm:'a|b|c', bar:bool} | {t:'Irr', seed} */
  function specKey(sp) { return [sp.t, sp.n == null ? '' : sp.n, sp.arm || '', sp.bar ? 'B' : '', sp.seed || 1].join('_'); }
  function genSprite(sp) {
    const SZ = 192, c = document.createElement('canvas'); c.width = c.height = SZ;
    const g = c.getContext('2d'), R = SZ * 0.46, cx = SZ / 2, cy = SZ / 2, rnd = mulberry((sp.seed || 1) * 7919 + 13);
    const gs = () => (rnd() + rnd() + rnd() + rnd() - 2) / 0.58;      // 정규 분포 비슷
    const blob = (x, y, r, col, a) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, rgba(col, a)); gr.addColorStop(1, rgba(col, 0)); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); };
    const dot = (x, y, r, col, a) => { g.globalAlpha = a; g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.globalAlpha = 1; };
    g.globalCompositeOperation = 'lighter';
    if (sp.t === 'E') {
      const q = 1 - (sp.n || 0) / 10;
      g.save(); g.translate(cx, cy); g.scale(1, q);
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, R);
      gr.addColorStop(0, 'rgba(255,244,222,0.98)'); gr.addColorStop(0.22, 'rgba(255,222,170,0.8)'); gr.addColorStop(0.6, 'rgba(244,166,104,0.48)'); gr.addColorStop(0.88, 'rgba(225,130,80,0.2)'); gr.addColorStop(1, 'rgba(210,110,70,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill();
      for (let i = 0; i < 160; i++) { const a = rnd() * TAU, r = R * Math.pow(rnd(), 1.6) * 0.95; dot(Math.cos(a) * r, Math.sin(a) * r, 0.7 + rnd() * 0.8, '#ffe2b8', 0.35 + rnd() * 0.4); }
      g.restore();
    } else if (sp.t === 'S0') {
      const gr = g.createRadialGradient(cx, cy, 0, cx, cy, R);
      gr.addColorStop(0, 'rgba(255,240,205,0.5)'); gr.addColorStop(0.7, 'rgba(250,205,140,0.3)'); gr.addColorStop(1, 'rgba(240,170,110,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.fill();
      blob(cx, cy, R * 0.42, '#fff0cc', 1); blob(cx, cy, R * 0.22, '#ffffff', 0.9);
      for (let i = 0; i < 120; i++) { const a = rnd() * TAU, r = R * Math.sqrt(rnd()) * 0.9; dot(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0.7 + rnd() * 0.6, '#ffe6bd', 0.3 + rnd() * 0.3); }
    } else if (sp.t === 'S') {
      const k = Math.tan(PITCH[sp.arm] * Math.PI / 180), bl = BULGE[sp.arm] * R / 0.46 * 0.46;
      const Lb = BARL[sp.arm] * R, rb = sp.bar ? Lb : bl * 1.25, thMax = Math.log(R / rb) / k;
      const dg = g.createRadialGradient(cx, cy, 0, cx, cy, R);
      dg.addColorStop(0, 'rgba(255,232,180,0.34)'); dg.addColorStop(0.8, 'rgba(200,215,255,0.12)'); dg.addColorStop(1, 'rgba(200,215,255,0)');
      g.fillStyle = dg; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.fill();
      const N = sp.arm === 'a' ? 560 : sp.arm === 'b' ? 520 : 480;
      for (let arm = 0; arm < 2; arm++) {
        for (let i = 0; i < 60; i++) { const th = rnd() * thMax, r = rb * Math.exp(k * th), an = th + arm * Math.PI; blob(cx + Math.cos(an) * r, cy + Math.sin(an) * r, 6 + r * 0.07, '#7fa8ff', 0.1); }
        for (let i = 0; i < N; i++) {
          const th = rnd() * thMax, r = rb * Math.exp(k * th), an = th + arm * Math.PI, w = 2.2 + r * 0.075;
          const x = cx + Math.cos(an) * r + gs() * w, y = cy + Math.sin(an) * r + gs() * w;
          const u = rnd(); dot(x, y, 0.8 + rnd() * 1.1, u < 0.1 ? '#ff9ec0' : u < 0.35 ? '#ffffff' : '#bcd6ff', 0.55 + rnd() * 0.4);
        }
      }
      if (sp.bar) {
        g.save(); g.translate(cx, cy); g.scale(1, 0.26);
        const bg = g.createRadialGradient(0, 0, 0, 0, 0, Lb * 1.15);
        bg.addColorStop(0, 'rgba(255,236,190,1)'); bg.addColorStop(0.6, 'rgba(255,205,130,0.7)'); bg.addColorStop(1, 'rgba(255,190,110,0)');
        g.fillStyle = bg; g.beginPath(); g.arc(0, 0, Lb * 1.15, 0, TAU); g.fill(); g.restore();
      }
      blob(cx, cy, bl * 1.7, '#fff0cc', 1); blob(cx, cy, bl * 0.8, '#ffffff', 0.9);
    } else {      // Irr
      for (let c2 = 0; c2 < 8; c2++) {
        const a = rnd() * TAU, d = R * 0.62 * Math.sqrt(rnd()), ox = cx + Math.cos(a) * d, oy = cy + Math.sin(a) * d * 0.85, s = R * (0.1 + rnd() * 0.16);
        blob(ox, oy, s * 1.6, '#8fb4ff', 0.18);
        for (let i = 0; i < 70; i++) { const u = rnd(); dot(ox + gs() * s, oy + gs() * s, 0.8 + rnd() * 1.3, u < 0.15 ? '#ff9ec0' : u < 0.5 ? '#ffffff' : '#bcd6ff', 0.5 + rnd() * 0.45); }
      }
      blob(cx - R * 0.1, cy, R * 0.45, '#ffe6b8', 0.12);
    }
    return c;
  }
  const sprite = (sp) => { const k = specKey(sp); return SPR[k] || (SPR[k] = genSprite(sp)); };
  /* 은하 그리기: size = 그림 크기, ang = 면 안에서 도는 각, tilt = 기울어 보이는 정도(1 = 정면, 0.1 = 옆모습) */
  function drawGal(sp, cx, cy, size, ang, tilt, alpha) {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(1, tilt || 1); ctx.rotate(ang || 0);
    if (alpha != null) ctx.globalAlpha = alpha;
    ctx.drawImage(sprite(sp), -size / 2, -size / 2, size, size); ctx.restore();
    if (sp.edge) {       // 옆에서 본 나선 은하: 가운데 먼지 띠
      ctx.save(); ctx.globalAlpha = (alpha == null ? 1 : alpha) * 0.7; ctx.strokeStyle = '#0a0f22'; ctx.lineWidth = Math.max(1.5, size * 0.016); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cx - size * 0.4, cy + 0.5); ctx.lineTo(cx + size * 0.4, cy - 0.5); ctx.stroke(); ctx.restore();
    }
  }
  /* 카드 바탕 */
  function galCard(x, y, w, h, o) {
    o = o || {};
    D.shadow(() => { const g = ctx.createLinearGradient(x, y, x, y + h); g.addColorStop(0, '#12204a'); g.addColorStop(1, '#070d1f'); ctx.fillStyle = g; rr(x, y, w, h, o.r || 12).fill(); }, { blur: o.lift ? 14 : 6, y: o.lift ? 6 : 2, color: 'rgba(0,0,0,.45)' });
    ctx.strokeStyle = o.border || 'rgba(148,163,184,.55)'; ctx.lineWidth = o.bw || 2; rr(x, y, w, h, o.r || 12).stroke();
  }

  /* ---------- 은하 자료 ---------- */
  const GRP = {
    E: { name: '타원형', desc: '매끈한 타원 모양', col: '#f59e0b' },
    S: { name: '나선형', desc: '나선팔이 휘감김', col: '#3b82f6' },
    B: { name: '막대 나선형', desc: '중심에 막대', col: '#8b5cf6' },
    I: { name: '불규칙형', desc: '일정한 모양 없음', col: '#10b981' },
  };
  const GRP_ORDER = ['E', 'S', 'B', 'I'];
  /* 1단계 12장 (섞인 순서) */
  const G1 = [
    { id: 'p1', g: 'S', sp: { t: 'S', arm: 'b', seed: 3 }, tilt: 1, ph: 0.4 },
    { id: 'p2', g: 'E', sp: { t: 'E', n: 4, seed: 2 }, tilt: 1, ph: 0 },
    { id: 'p3', g: 'I', sp: { t: 'Irr', seed: 5 }, tilt: 1, ph: 1.0 },
    { id: 'p4', g: 'B', sp: { t: 'S', arm: 'c', bar: true, seed: 8 }, tilt: 1, ph: 2.1 },
    { id: 'p5', g: 'E', sp: { t: 'E', n: 1, seed: 4 }, tilt: 1, ph: 0 },
    { id: 'p6', g: 'S', sp: { t: 'S', arm: 'c', seed: 9 }, tilt: 1, ph: 1.3 },
    { id: 'p7', g: 'B', sp: { t: 'S', arm: 'a', bar: true, seed: 6 }, tilt: 1, ph: 0.9 },
    { id: 'p8', g: 'I', sp: { t: 'Irr', seed: 12 }, tilt: 1, ph: 0 },
    { id: 'p9', g: 'E', sp: { t: 'E', n: 6, seed: 7 }, tilt: 1, ph: 0 },
    { id: 'p10', g: 'S', sp: { t: 'S', arm: 'a', seed: 14 }, tilt: 1, ph: 2.6 },
    { id: 'p11', g: 'B', sp: { t: 'S', arm: 'b', bar: true, seed: 15 }, tilt: 1, ph: 1.7 },
    { id: 'p12', g: 'I', sp: { t: 'Irr', seed: 21 }, tilt: 1, ph: 0 },
  ];
  /* 2단계: 타원 은하 3개 (a = 10 눈금) */
  const ELL = [{ nm: '은하 가', n: 4, b: 6 }, { nm: '은하 나', n: 2, b: 8 }, { nm: '은하 다', n: 7, b: 3 }];
  /* 2단계: 소리굽쇠에 놓을 나선 은하 6개 */
  const G2 = [
    { id: 'f1', slot: 'SB-c', sp: { t: 'S', arm: 'c', bar: true, seed: 31 }, tilt: 0.88, ph: 0.2 },
    { id: 'f2', slot: 'S-a', sp: { t: 'S', arm: 'a', seed: 32 }, tilt: 0.9, ph: 1.4 },
    { id: 'f3', slot: 'SB-a', sp: { t: 'S', arm: 'a', bar: true, seed: 33 }, tilt: 0.85, ph: 2.2 },
    { id: 'f4', slot: 'S-c', sp: { t: 'S', arm: 'c', seed: 34 }, tilt: 0.92, ph: 0.8 },
    { id: 'f5', slot: 'S-b', sp: { t: 'S', arm: 'b', seed: 35 }, tilt: 0.9, ph: 1.9 },
    { id: 'f6', slot: 'SB-b', sp: { t: 'S', arm: 'b', bar: true, seed: 36 }, tilt: 0.86, ph: 0.6 },
  ];
  const SLOTS = ['S-a', 'S-b', 'S-c', 'SB-a', 'SB-b', 'SB-c'];
  const SLOT_NAME = { 'S-a': 'Sa', 'S-b': 'Sb', 'S-c': 'Sc', 'SB-a': 'SBa', 'SB-b': 'SBb', 'SB-c': 'SBc' };
  /* 3단계: 유형별 특징 (예시 값) */
  const TY3 = [
    { k: 'E', nm: '타원 E', ism: 0, blue: 0, sf: 0, age: [0, 5, 95], sp: { t: 'E', n: 3, seed: 41 }, tilt: 1, col: '#f59e0b', clr: '붉은색' },
    { k: 'S0', nm: '렌즈형 S0', ism: 1, blue: 2, sf: 0.5, age: [2, 13, 85], sp: { t: 'S0', seed: 42 }, tilt: 0.55, col: '#f97316', clr: '붉은색~노란색' },
    { k: 'Sa', nm: '나선 Sa', ism: 5, blue: 10, sf: 2, age: [8, 22, 70], sp: { t: 'S', arm: 'a', seed: 43 }, tilt: 0.9, col: '#eab308', clr: '노란색' },
    { k: 'Sb', nm: '나선 Sb', ism: 8, blue: 20, sf: 4, age: [15, 30, 55], sp: { t: 'S', arm: 'b', seed: 44 }, tilt: 0.9, col: '#22c55e', clr: '노란색~푸른색' },
    { k: 'Sc', nm: '나선 Sc', ism: 15, blue: 35, sf: 7, age: [25, 35, 40], sp: { t: 'S', arm: 'c', seed: 45 }, tilt: 0.9, col: '#3b82f6', clr: '푸른색' },
    { k: 'Irr', nm: '불규칙 Irr', ism: 25, blue: 60, sf: 8, age: [45, 35, 20], sp: { t: 'Irr', seed: 46 }, tilt: 1, col: '#8b5cf6', clr: '푸른색' },
  ];
  const METRIC = {
    ism: { nm: '성간 물질 비율', unit: '%', max: 30, step: 5, key: 'ism', btn: '성간 물질' },
    blue: { nm: '푸른 별 비율', unit: '%', max: 70, step: 10, key: 'blue', btn: '푸른 별' },
    sf: { nm: '별 형성 활발도(예시 지수)', unit: '', max: 10, step: 2, key: 'sf', btn: '별 형성' },
  };
  const ASK3 = [['Sa', 5], ['Sc', 15], ['Irr', 25]];       // 표에 채울 성간 물질 비율
  /* 4단계: AI 분류용 은하 12개 (특징 2개 + 이름표) */
  const G4 = [
    { id: 1, role: 'train', y: 'E', fx: 0.0, fb: 0.1, sp: { t: 'E', n: 0, seed: 51 }, tilt: 1, ph: 0 },
    { id: 2, role: 'train', y: 'S', fx: 0.06, fb: 0.76, sp: { t: 'S', arm: 'c', seed: 52 }, tilt: 0.94, ph: 0.5 },
    { id: 3, role: 'train', y: 'E', fx: 0.3, fb: 0.16, sp: { t: 'E', n: 3, seed: 53 }, tilt: 1, ph: 0 },
    { id: 4, role: 'train', y: 'S', fx: 0.4, fb: 0.8, sp: { t: 'S', arm: 'c', bar: true, seed: 54 }, tilt: 0.6, ph: 1.6 },
    { id: 5, role: 'train', y: 'E', fx: 0.5, fb: 0.08, sp: { t: 'E', n: 5, seed: 55 }, tilt: 1, ph: 0 },
    { id: 6, role: 'train', y: 'S', fx: 0.58, fb: 0.64, sp: { t: 'S', arm: 'b', seed: 56 }, tilt: 0.42, ph: 2.4 },
    { id: 7, role: 'train', y: 'E', fx: 0.6, fb: 0.24, sp: { t: 'E', n: 6, seed: 57 }, tilt: 1, ph: 0 },
    { id: 8, role: 'train', y: 'S', fx: 0.15, fb: 0.58, sp: { t: 'S', arm: 'b', seed: 58 }, tilt: 0.85, ph: 1.1 },
    { id: 9, role: 'test', y: 'E', fx: 0.2, fb: 0.12, sp: { t: 'E', n: 2, seed: 59 }, tilt: 1, ph: 0 },
    { id: 10, role: 'test', y: 'S', fx: 0.3, fb: 0.72, sp: { t: 'S', arm: 'c', seed: 60 }, tilt: 0.7, ph: 0.3 },
    { id: 11, role: 'test', y: 'S', fx: 0.35, fb: 0.33, sp: { t: 'S', arm: 'a', seed: 61 }, tilt: 0.65, ph: 1.9, why: '팽대부가 크고 붉은 나선 은하(Sa)라서 타원 은하처럼 붉게 보여요' },
    { id: 12, role: 'test', y: 'S', fx: 0.88, fb: 0.3, sp: { t: 'S', arm: 'b', seed: 62, edge: true }, tilt: 0.12, ph: 0, edge: true, why: '옆에서 보면 납작한 타원 은하와 비슷하게 보여요' },
  ];
  G4.forEach((g) => { if (g.edge) g.sp.edge = true; });
  const LBL = { E: '타원', S: '나선' };
  const GCOL = { E: '#f59e0b', S: '#3b82f6' };

  /* ---------- 상태 ---------- */
  const S = {
    view: 'v1', fade: 0, clock: 0,
    gi: 0, ha: 5, hb: 5, hd: 5, bd: 5, grab: null, recE: [false, false, false], matchT: 0, matchOk: false,
    metric: 'ism', sel3: 'Sc', bh: TY3.map(() => 0), age: [0, 0, 0], tbl: ['', '', ''], match3: ['', '', ''],
    lab: {}, trained: false, training: 0, path: [], w: [0, 0, 0], wd: [0, 0, 0], pred: {}, flip: {}, acc: null, accShown: 0, nCorrect: 0,
    over: null, visited: {},
  };
  let game = null;
  const VIEW_LABEL = { v1: '🌌 은하 사진 12장을 모양별로 묶기', v2: '📏 타원 은하의 a와 b 재기', v2f: '🍴 소리굽쇠 도표에 은하 놓기', v3: '📊 은하 유형별 특징 비교', v4: '🤖 AI로 은하 분류하기' };
  const gLabel = (id) => (G4.find((g) => g.id === id) || {}).id;

  /* ---------- 끌어 놓기: 1단계 (모양별 묶기) ---------- */
  const binRect = (i) => (PHONE ? { x: 10 + (i % 2) * 295, y: 254 + Math.floor(i / 2) * 290, w: 285, h: 282 } : { x: 470 + (i % 2) * 160, y: 12 + Math.floor(i / 2) * 272, w: 154, h: 262 });
  const dn1 = makeDnD({
    items: G1,
    homeOf: (it, i) => (PHONE ? { x: 10 + (i % 6) * 96, y: 46 + Math.floor(i / 6) * 100, w: 92, h: 92 } : { x: 12 + (i % 4) * 106, y: 62 + Math.floor(i / 4) * 110, w: 100, h: 100 }),
    slotOf: (it, b, k) => {
      const R = binRect(GRP_ORDER.indexOf(b)), ts = PHONE ? 64 : 44, gp = 4, cols = Math.floor((R.w - 4) / (ts + gp)), tw = cols * (ts + gp) - gp;
      return { x: R.x + (R.w - tw) / 2 + (k % cols) * (ts + gp), y: R.y + (PHONE ? 70 : 62) + Math.floor(k / cols) * (ts + gp), w: ts, h: ts };
    },
    binAt: (p) => { for (let i = 0; i < 4; i++) { const R = binRect(i); if (p.x >= R.x && p.x <= R.x + R.w && p.y >= R.y && p.y <= R.y + R.h) return GRP_ORDER[i]; } return null; },
    onChange: () => { updateCtl(); },
  });
  const grouped1 = () => G1.filter((g) => g.bin != null).length;
  const right1 = () => G1.filter((g) => g.bin === g.g).length;

  /* ---------- 끌어 놓기: 2단계 (소리굽쇠) ---------- */
  function forkGeom() {
    if (PHONE) {
      const SS = 104, ys = { S: 300, SB: 486 }, xs = [196, 330, 464];
      const slots = {}; SLOTS.forEach((id) => { const [pr, ch] = id.split('-'), c = 'abc'.indexOf(ch); slots[id] = { x: xs[c] - SS / 2, y: ys[pr] - SS / 2, w: SS, h: SS }; });
      return { SS, slots, J: { x: 118, y: 240 }, prongUp: { x1: 150, y: ys.S, x2: 590 }, prongLo: { x1: 150, y: ys.SB, x2: 590 }, ey: 96, ex: (i) => 20 + i * 71, es: 58, s0: { x: 40, y: 212, s: 56 }, tray: (i) => ({ x: 14 + i * 96, y: 650, w: 90, h: 90 }), trayTitleY: 626, legendY: 780, ys };
    }
    const SS = 84, ys = { S: 130, SB: 372 }, xs = [520, 628, 736];
    const slots = {}; SLOTS.forEach((id) => { const [pr, ch] = id.split('-'), c = 'abc'.indexOf(ch); slots[id] = { x: xs[c] - SS / 2, y: ys[pr] - SS / 2, w: SS, h: SS }; });
    return { SS, slots, J: { x: 418, y: 252 }, prongUp: { x1: 462, y: ys.S, x2: 790 }, prongLo: { x1: 462, y: ys.SB, x2: 790 }, ey: 234, ex: (i) => 18 + i * 40, es: 36, s0: { x: 360, y: 228, s: 48 }, tray: (i) => ({ x: 113 + i * 98, y: 462, w: 84, h: 84 }), trayTitleY: 452, legendY: 60, ys };
  }
  const FG = forkGeom();
  const dn2 = makeDnD({
    items: G2,
    homeOf: (it, i) => FG.tray(i),
    slotOf: (it, b) => FG.slots[b],
    cap: () => 1,
    binAt: (p) => { for (const id of SLOTS) { const R = FG.slots[id]; if (p.x >= R.x - 6 && p.x <= R.x + R.w + 6 && p.y >= R.y - 6 && p.y <= R.y + R.h + 6) return id; } return null; },
    onChange: () => { updateCtl(); },
  });
  const right2 = () => G2.filter((g) => g.bin === g.slot).length;
  const placed2 = () => G2.filter((g) => g.bin != null).length;

  /* ======================================================
     1단계 그림: 은하 12장 + 상자 4개
     ====================================================== */
  const galAng = (g, extra) => (g.sp.t === 'S' || g.sp.t === 'S0' ? S.clock * 0.16 + g.ph + (extra || 0) : g.sp.t === 'E' ? 0.0 : 0);
  function drawItemCard(it, dn, o) {
    o = o || {};
    const sc = 1 + it.lift * 0.07 + it.pop * 0.1 * Math.sin(it.pop * 3.1);
    const dx = it.shake > 0 ? Math.sin(it.shake * 40) * 5 * it.shake : 0;
    const cx = it.x + it.w / 2 + dx, cy = it.y + it.h / 2;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.translate(-cx, -cy);
    const border = dn.sel === it ? '#fde047' : it.wrong ? '#f87171' : (o.border ? o.border(it) : 'rgba(148,163,184,.55)');
    galCard(it.x + dx, it.y, it.w, it.h, { border, bw: dn.sel === it || it.wrong ? 3 : 2, lift: it.lift, r: it.w > 60 ? 12 : 8 });
    const g = it.sp ? it : it;
    drawGal(g.sp, cx, cy, it.w * 0.98, galAng(g), g.tilt);
    if (o.label) o.label(it, cx, cy);
    ctx.restore();
  }
  function drawV1(t, dt) {
    TX(PHONE ? 10 : 12, PHONE ? 30 : 38, '은하 사진 12장 (합성 이미지) - 비슷한 모양끼리 끌어서 상자에 넣어요', PHONE ? 13.5 : 14.5, '#cbd5e1', 'left', 800);
    // 상자
    GRP_ORDER.forEach((b, i) => {
      const R = binRect(i), G = GRP[b], over = S.over === b;
      ctx.save();
      D.shadow(() => { ctx.fillStyle = over ? 'rgba(255,255,255,.17)' : 'rgba(255,255,255,.07)'; rr(R.x, R.y, R.w, R.h, 14).fill(); }, { blur: 6, y: 2, color: 'rgba(0,0,0,.35)' });
      ctx.strokeStyle = G.col; ctx.lineWidth = over ? 3.5 : 2.4; ctx.setLineDash(over ? [] : [7, 5]); rr(R.x, R.y, R.w, R.h, 14).stroke(); ctx.setLineDash([]);
      ctx.fillStyle = rgba(G.col, 0.26); rr(R.x + 1.5, R.y + 1.5, R.w - 3, PHONE ? 54 : 48, 12).fill();
      ctx.restore();
      TX(R.x + R.w / 2, R.y + (PHONE ? 24 : 21), G.name, PHONE ? 15 : 15.5, '#fff', 'center', 800);
      TX(R.x + R.w / 2, R.y + (PHONE ? 46 : 40), G.desc, PHONE ? 11.5 : 12.5, '#e2e8f0', 'center', 700);
      const n = dn1.binList(b).length;
      if (n) D.label(R.x + R.w - 8, R.y + R.h - 14, n + '장', { bg: G.col, size: 12.5, align: 'right', pad: 7 });
    });
    dn1.drawOrder().forEach((it) => drawItemCard(it, dn1));
    if (!PHONE && !dn1.drag && !G1.some((g) => g.bin != null)) {
      const hy = PHONE ? 240 : 410;
      note(PHONE ? 10 : 12, hy, PHONE ? 580 : 446, '💡 사진을 상자에 끌어 놓거나, 사진을 누른 뒤 상자를 눌러도 돼요. 상자 안의 사진을 다시 끌어 옮길 수도 있어요.', 13.5, { bg: 'rgba(255,255,255,.9)' });
    }
  }

  /* ======================================================
     2단계 그림 (a): 타원 은하의 a, b 재기
     ====================================================== */
  const U2 = PHONE ? 22 : 24;
  const mc = () => ({ cx: PHONE ? 300 : 396, cy: PHONE ? 380 : 306 });
  function drawV2(t, dt) {
    const { cx, cy } = mc(), e = ELL[S.gi], q = e.b / 10;
    // 모눈종이
    ctx.save(); ctx.strokeStyle = 'rgba(148,163,184,.14)'; ctx.lineWidth = 1;
    const gx0 = PHONE ? 10 : 12, gx1 = PHONE ? 590 : 788, gy0 = PHONE ? 70 : 64, gy1 = PHONE ? 700 : 548;
    for (let x = cx % U2; x < gx1; x += U2) if (x > gx0) { ctx.beginPath(); ctx.moveTo(x, gy0); ctx.lineTo(x, gy1); ctx.stroke(); }
    for (let y = cy % U2; y < gy1; y += U2) if (y > gy0) { ctx.beginPath(); ctx.moveTo(gx0, y); ctx.lineTo(gx1, y); ctx.stroke(); }
    ctx.restore();
    const size = 10 * U2 / 0.46;
    D.glow(cx, cy, 10 * U2 * 1.1, '#f59e0b', 0.12);
    drawGal({ t: 'E', n: e.n, seed: 2 + S.gi * 3 }, cx, cy, size, 0, 1);
    // 가장자리(점선 타원)
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.setLineDash([6, 6]); ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.ellipse(cx, cy, 10 * U2, e.b * U2, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
    // 눈금자
    ctx.save(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + 12.5 * U2, cy); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy - 11 * U2); ctx.stroke();
    for (let i = 1; i <= 12; i++) {
      const L = i % 5 === 0 ? 9 : 5;
      ctx.beginPath(); ctx.moveTo(cx + i * U2, cy); ctx.lineTo(cx + i * U2, cy + L); if (i <= 11) { ctx.moveTo(cx, cy - i * U2); ctx.lineTo(cx - L, cy - i * U2); } ctx.stroke();
      if (i % 2 === 0) { TX(cx + i * U2, cy + 24, String(i), 12.5, '#94a3b8', 'center'); if (i <= 10) TX(cx - 14, cy - i * U2 + 4.5, String(i), 12.5, '#94a3b8', 'right'); }
    }
    ctx.restore();
    // 손잡이
    const A = { x: cx + S.hd * U2, y: cy }, B = { x: cx, y: cy - S.bd * U2 };
    const okA = Math.abs(S.ha - 10) <= 0.5, okB = Math.abs(S.hb - e.b) <= 0.5;
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = '#fb923c'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(A.x, A.y); ctx.stroke();
    ctx.strokeStyle = '#22d3ee'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(B.x, B.y); ctx.stroke(); ctx.restore();
    D.sphere(cx, cy, 4.5, '#fff', { gloss: false });
    const hh = (P, col, ok, txt, side) => {
      D.glow(P.x, P.y, 26, col, ok ? 0.55 : 0.28);
      D.sphere(P.x, P.y, 11, col, { shadow: true, outline: ok ? '#22c55e' : '#fff', outlineWidth: 2.5 });
      D.label(P.x + (side === 'r' ? 0 : 38), P.y + (side === 'r' ? 28 : 0), txt, { bg: 'rgba(15,23,42,.92)', color: col, size: 13.5, border: col, pad: 8 });
    };
    hh(A, '#fb923c', okA, 'a = ' + f1(S.ha), 'r'); hh(B, '#22d3ee', okB, 'b = ' + f1(S.hb), 'u');
    TX(cx + 14, cy - 12, 'O', 12.5, '#cbd5e1', 'left');
    // 안내 판
    TX(PHONE ? 10 : 12, PHONE ? 36 : 36, e.nm + ' - 점선(은하의 가장자리)에 두 손잡이를 맞춰요', PHONE ? 14 : 15, '#e2e8f0', 'left', 800);
    const by = PHONE ? 722 : 0;
    if (PHONE) {
      note(10, by, 580, 'a: 장반경(긴 반지름) · b: 단반경(짧은 반지름)\nEn 의 n = 10 × (1 - b/a)', 14, { bg: 'rgba(255,255,255,.92)' });
    } else {
      note(12, 468, 300, 'a: 장반경(긴 반지름) · b: 단반경(짧은 반지름)\nEn 의 n = 10 × (1 - b/a)', 13.5, { bg: 'rgba(255,255,255,.92)' });
    }
    // 기록 칩
    const cy0 = PHONE ? 66 : 12;
    ELL.forEach((x, i) => {
      const cxp = PHONE ? 10 + i * 196 : 580 + (i === 0 ? 0 : 0), yy = PHONE ? 780 : 470 + i * 28;
      D.label(PHONE ? 10 + i * 196 : 788, PHONE ? 800 : yy, (S.recE[i] ? '✓ ' : '') + x.nm + (S.recE[i] ? ' = E' + x.n : ''), { bg: S.recE[i] ? '#15803d' : 'rgba(255,255,255,.14)', color: '#fff', size: 13, align: PHONE ? 'left' : 'right', pad: 9 });
    });
    if (S.matchT > 0.01) { const a = smooth(S.matchT); ctx.save(); ctx.globalAlpha = a; D.label(cx, cy + e.b * U2 + 40, '✓ 가장자리에 맞았어요: b/a = ' + (e.b / 10).toFixed(1), { bg: '#15803d', size: 13.5, pad: 10 }); ctx.restore(); }
  }

  /* ======================================================
     2단계 그림 (b): 소리굽쇠 도표
     ====================================================== */
  function drawV2f(t, dt) {
    const G = FG;
    // 줄기: 타원 은하 E0~E7
    TX(PHONE ? 10 : 18, PHONE ? 40 : 212, PHONE ? '타원 은하 E0 ~ E7 (둥근 것부터 납작한 것까지)' : '타원 은하 E0 ~ E7', PHONE ? 13 : 13.5, '#fbbf24', 'left', 800);
    for (let i = 0; i < 8; i++) {
      const x = G.ex(i), y = G.ey;
      galCard(x, y, G.es, G.es, { r: 6, border: 'rgba(251,191,36,.55)', bw: 1.5 });
      drawGal({ t: 'E', n: i, seed: 70 + i }, x + G.es / 2, y + G.es / 2, G.es * 0.98, 0, 1);
      TX(x + G.es / 2, y + G.es + 15, 'E' + i, PHONE ? 12 : 12.5, '#fbbf24', 'center', 800);
    }
    // 줄기 선과 갈라지는 가지
    const J = G.J;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(251,191,36,.7)';
    const stemY = G.ey + G.es + (PHONE ? 26 : 26);
    ctx.beginPath();
    if (PHONE) { ctx.moveTo(20, stemY); ctx.lineTo(20 + 7 * 71 + 58, stemY); ctx.stroke(); }
    else { ctx.moveTo(14, stemY); ctx.lineTo(J.x, J.y > stemY ? J.y : stemY); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(147,197,253,.8)';
    const up = G.prongUp, lo = G.prongLo;
    ctx.beginPath(); ctx.moveTo(J.x, J.y); ctx.bezierCurveTo(J.x + 22, J.y - 6, up.x1 - 30, up.y + 10, up.x1, up.y); ctx.lineTo(up.x2, up.y); ctx.stroke();
    ctx.strokeStyle = 'rgba(196,181,253,.85)';
    ctx.beginPath(); ctx.moveTo(J.x, J.y); ctx.bezierCurveTo(J.x + 22, J.y + 6, lo.x1 - 30, lo.y - 10, lo.x1, lo.y); ctx.lineTo(lo.x2, lo.y); ctx.stroke();
    ctx.restore();
    // S0
    const s0 = G.s0;
    galCard(s0.x, s0.y, s0.s, s0.s, { r: 8, border: 'rgba(251,146,60,.8)', bw: 2 });
    drawGal({ t: 'S0', seed: 71 }, s0.x + s0.s / 2, s0.y + s0.s / 2, s0.s * 0.98, S.clock * 0.2, 0.62);
    TX(s0.x + s0.s / 2, s0.y + s0.s + 16, 'S0 렌즈형', 12.5, '#fb923c', 'center', 800);
    if (PHONE) { TX(G.J.x + 4, G.J.y - 10, '', 12, '#fff'); }
    TX(up.x1 + (PHONE ? 4 : 0), up.y - G.SS / 2 - 10, '나선 은하 S (막대 없음)', 13.5, '#93c5fd', 'left', 800);
    TX(lo.x1 + (PHONE ? 4 : 0), lo.y - G.SS / 2 - 10, '막대 나선 은하 SB (중심에 막대)', 13.5, '#c4b5fd', 'left', 800);
    // 칸
    SLOTS.forEach((id) => {
      const R = G.slots[id], over = S.over === id, occupied = dn2.items.some((x) => x.bin === id);
      ctx.save(); ctx.fillStyle = over ? 'rgba(255,255,255,.2)' : 'rgba(255,255,255,.08)'; ctx.strokeStyle = over ? '#fde047' : 'rgba(226,232,240,.65)'; ctx.lineWidth = over ? 3 : 2; ctx.setLineDash(occupied ? [] : [6, 5]);
      rr(R.x, R.y, R.w, R.h, 10).fill(); rr(R.x, R.y, R.w, R.h, 10).stroke(); ctx.restore();
      TX(R.x + R.w / 2, R.y + R.h + (PHONE ? 20 : 17), SLOT_NAME[id], PHONE ? 14 : 14, id.startsWith('SB') ? '#c4b5fd' : '#93c5fd', 'center', 800);
    });
    // 기준 안내
    if (PHONE) {
      TX(300, 640 - 0, '아래 사진 6장을 알맞은 칸에 끌어 놓아요', 13.5, '#cbd5e1', 'center', 800);
      note(10, 756, 580, '판정 기준: 팽대부가 크고 팔이 촘촘하면 a, 팽대부가 작고 팔이 느슨하면 c · 중심에 막대가 있으면 SB', 12.5, { bg: 'rgba(255,255,255,.92)' });
    } else {
      TX(400, G.trayTitleY - 0, '아래 사진 6장을 알맞은 칸에 끌어 놓아요', 13.5, '#cbd5e1', 'center', 800);
      D.arrow(478, 22, 780, 22, { color: '#94a3b8', width: 2.5, head: 10 });
      TX(480, 46, '팽대부 큼 · 팔 촘촘 (a)', 12.5, '#94a3b8', 'left', 800); TX(780, 46, '팽대부 작음 · 팔 느슨 (c)', 12.5, '#94a3b8', 'right', 800);
    }
    dn2.drawOrder().forEach((it) => drawItemCard(it, dn2));
  }

  /* ======================================================
     3단계 그림: 유형별 막대 그래프 + 선택한 은하
     ====================================================== */
  const C3 = PHONE ? { x: 10, y: 10, w: 580, h: 400 } : { x: 12, y: 12, w: 468, h: 536 };
  const P3 = PHONE ? { x: 10, y: 420, w: 580, h: 410 } : { x: 490, y: 12, w: 298, h: 536 };
  const bar3 = () => { const x0 = C3.x + 56, x1 = C3.x + C3.w - 14, y0 = C3.y + 54, y1 = C3.y + C3.h - (PHONE ? 62 : 76); return { x0, x1, y0, y1, sw: (x1 - x0) / 6 }; };
  function drawV3(t, dt) {
    const m = METRIC[S.metric], B = bar3();
    panel(C3.x, C3.y, C3.w, C3.h, { title: '유형별 ' + m.nm + (m.unit ? ' (%)' : ''), tsize: 15 });
    ctx.save(); ctx.fillStyle = '#f8fbff'; ctx.fillRect(B.x0, B.y0, B.x1 - B.x0, B.y1 - B.y0);
    ctx.strokeStyle = '#e1e8f0'; ctx.lineWidth = 1.2;
    for (let v = 0; v <= m.max + 0.01; v += m.step) { const y = B.y1 - (B.y1 - B.y0) * v / m.max; ctx.beginPath(); ctx.moveTo(B.x0, y); ctx.lineTo(B.x1, y); ctx.stroke(); TXD(B.x0 - 6, y + 4.5, String(v), 12.5, '#64748b', 'right'); }
    ctx.restore();
    TY3.forEach((ty, i) => {
      const cx = B.x0 + (i + 0.5) * B.sw, bw = B.sw * 0.58, h = (B.y1 - B.y0) * clamp(S.bh[i], 0, 1), sel = S.sel3 === ty.k;
      ctx.save();
      const g = ctx.createLinearGradient(cx - bw / 2, 0, cx + bw / 2, 0); g.addColorStop(0, shade(ty.col, 0.18)); g.addColorStop(1, shade(ty.col, -0.15));
      ctx.fillStyle = g; if (h > 0.5) { rr(cx - bw / 2, B.y1 - h, bw, h, 5).fill(); }
      if (sel) { ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2.5; rr(cx - bw / 2 - 3, B.y1 - Math.max(h, 2) - 3, bw + 6, Math.max(h, 2) + 6, 7).stroke(); }
      ctx.restore();
      TXD(cx, B.y1 + 18, ty.k, PHONE ? 13.5 : 13.5, sel ? '#0f172a' : '#475569', 'center', 800);
      if (sel) { const v = ty[S.metric]; D.label(cx, Math.max(B.y0 + 12, B.y1 - h - 18), v + m.unit, { bg: '#0f172a', size: 13.5, pad: 7 }); }
    });
    ctx.save(); ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.8; ctx.strokeRect(B.x0, B.y0, B.x1 - B.x0, B.y1 - B.y0); ctx.restore();
    TXD((B.x0 + B.x1) / 2, C3.y + C3.h - 24, '막대를 누르면 값과 은하 모습이 나와요', 13, '#475569', 'center', 800);
    dataTag(C3.x + C3.w - 10, C3.y + 22);
    // 선택한 은하
    const ty = TY3.find((x) => x.k === S.sel3) || TY3[0];
    panel(P3.x, P3.y, P3.w, P3.h, { title: ty.nm + ' 은하' });
    const pcx = PHONE ? P3.x + 110 : P3.x + P3.w / 2, pcy = PHONE ? P3.y + 130 : P3.y + 128;
    ctx.save(); ctx.fillStyle = '#070d1f'; rr(pcx - 84, pcy - 84, 168, 168, 16).fill(); ctx.restore();
    drawGal(ty.sp, pcx, pcy, 164, ty.sp.t === 'E' ? 0 : S.clock * 0.18, ty.tilt);
    const tx = PHONE ? P3.x + 214 : P3.x + 14, ty0 = PHONE ? P3.y + 56 : P3.y + 232;
    const lw = PHONE ? P3.w - 228 : P3.w - 28;
    TXD(tx, ty0, '별의 나이 (예시)', 14, '#334155', 'left', 800);
    const bx = tx, by = ty0 + 10, bwid = lw, bhh = 24;
    const tot = S.age[0] + S.age[1] + S.age[2] || 1; let acc = 0;
    const cols = ['#3b82f6', '#fbbf24', '#ef4444'];
    ctx.save(); rr(bx, by, bwid, bhh, 8).clip();
    S.age.forEach((a, i) => { const w = bwid * a / tot; ctx.fillStyle = cols[i]; ctx.fillRect(bx + bwid * acc / tot, by, w + 0.5, bhh); acc += a; });
    ctx.restore(); ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.5; rr(bx, by, bwid, bhh, 8).stroke();
    ['젊은 별(푸른색)', '중간', '늙은 별(붉은색)'].forEach((s, i) => {
      const yy = by + bhh + 22 + i * 21;
      ctx.fillStyle = cols[i]; rr(bx, yy - 11, 14, 14, 4).fill();
      TXD(bx + 22, yy, s + '  ' + f0(ty.age[i]) + '%', PHONE ? 12 : 13, '#334155', 'left', 800);
    });
    const ly = by + bhh + 22 + 3 * 21 + 14;
    drawWrap(tx, ly + 4, '은하의 색: ' + ty.clr, lw, PHONE ? 12.5 : 13.5, { align: 'left', color: '#0f172a', weight: 800 });
    const note2 = ty.k === 'E' ? '늙은 붉은 별이 대부분이고 새 별이 거의 안 태어나요.' : ty.k === 'S0' ? '원반은 있지만 나선팔이 없고, 성간 물질이 적어요.' : ty.k === 'Irr' ? '젊은 푸른 별과 성간 물질이 많아요.' : '팽대부는 늙은 붉은 별, 나선팔은 젊은 푸른 별과 성간 물질이 많아요.';
    drawWrap(tx, ly + 28, note2, lw, PHONE ? 12.5 : 13.5, { align: 'left', color: '#475569', weight: 700 });
  }

  /* ======================================================
     4단계 그림: AI 분류 (특징 평면 + 은하 카드)
     ====================================================== */
  const PL4 = PHONE ? { x: 10, y: 10, w: 580, h: 424 } : { x: 12, y: 12, w: 462, h: 536 };
  const plot4 = () => { const x0 = PL4.x + 58, x1 = PL4.x + PL4.w - 18, y0 = PL4.y + 46, y1 = PL4.y + PL4.h - 62; return { x0, x1, y0, y1, gx: (v) => x0 + (x1 - x0) * v, gy: (v) => y1 - (y1 - y0) * v }; };
  const card4 = (g) => {
    const tr = G4.filter((x) => x.role === g.role), i = tr.indexOf(g);
    if (PHONE) return g.role === 'train' ? { x: 12 + (i % 4) * 144, y: 468 + Math.floor(i / 4) * 96, w: 136, h: 90, th: 64 } : { x: 12 + i * 144, y: 676, w: 136, h: 96, th: 64 };
    return g.role === 'train' ? { x: 486 + (i % 4) * 76, y: 38 + Math.floor(i / 4) * 94, w: 72, h: 88, th: 64 } : { x: 486 + (i % 4) * 76, y: 258, w: 72, h: 118, th: 64 };
  };
  const mlabel = (g) => (g.role === 'train' ? S.lab[g.id] : null);
  function drawV4(t, dt) {
    const P = plot4(), W = S.wd;
    panel(PL4.x, PL4.y, PL4.w, PL4.h, { title: '특징 평면: 은하 12개의 위치' });
    ctx.save(); ctx.fillStyle = '#f8fbff'; ctx.fillRect(P.x0, P.y0, P.x1 - P.x0, P.y1 - P.y0); ctx.restore();
    // 모델이 나눈 두 영역(훈련 뒤)
    if (S.trained && S.training <= 0) {
      ctx.save(); ctx.beginPath(); ctx.rect(P.x0, P.y0, P.x1 - P.x0, P.y1 - P.y0); ctx.clip();
      const N = 28;
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
        const fx = (i + 0.5) / N, fb = (j + 0.5) / N, sc = W[0] * fx + W[1] * fb + W[2];
        ctx.fillStyle = sc > 0 ? 'rgba(59,130,246,.15)' : 'rgba(245,158,11,.17)';
        ctx.fillRect(P.gx(i / N), P.gy((j + 1) / N), (P.x1 - P.x0) / N + 0.6, (P.y1 - P.y0) / N + 0.6);
      }
      ctx.restore();
    }
    ctx.save(); ctx.strokeStyle = '#e1e8f0'; ctx.lineWidth = 1.2;
    for (let v = 0; v <= 1.001; v += 0.2) { ctx.beginPath(); ctx.moveTo(P.gx(v), P.y0); ctx.lineTo(P.gx(v), P.y1); ctx.moveTo(P.x0, P.gy(v)); ctx.lineTo(P.x1, P.gy(v)); ctx.stroke(); }
    ctx.restore();
    for (let v = 0; v <= 1.001; v += 0.2) { TXD(P.gx(v), P.y1 + 17, f1(v), 12.5, '#64748b', 'center'); TXD(P.x0 - 6, P.gy(v) + 4.5, f1(v), 12.5, '#64748b', 'right'); }
    TXD((P.x0 + P.x1) / 2, PL4.y + PL4.h - 8, '납작한 정도 (0: 둥글다 ~ 1: 납작하다)', 13, '#475569', 'center', 800);
    ctx.save(); ctx.translate(PL4.x + 14, (P.y0 + P.y1) / 2); ctx.rotate(-Math.PI / 2); TXD(0, 0, '푸른 정도 (0: 붉다 ~ 1: 푸르다)', 12.5, '#475569', 'center', 800); ctx.restore();
    // 경계선
    const hasLine = S.training > 0 || S.trained;
    if (hasLine) {
      ctx.save(); ctx.beginPath(); ctx.rect(P.x0, P.y0, P.x1 - P.x0, P.y1 - P.y0); ctx.clip();
      const pts = [];
      if (Math.abs(W[1]) > 1e-3) { [0, 1].forEach((fx) => { const fb = -(W[0] * fx + W[2]) / W[1]; pts.push([P.gx(fx), P.gy(fb)]); }); }
      if (pts.length) polyline(pts, '#0f172a', 3.4, {});
      ctx.restore();
    }
    ctx.save(); ctx.beginPath(); ctx.rect(P.x0, P.y0, P.x1 - P.x0, P.y1 - P.y0); ctx.clip();
    if (S.trained && S.training <= 0) { TXD(P.x0 + 8, P.y1 - 10, '영역: 아래쪽 = AI가 타원으로 분류', 12.5, '#b45309', 'left', 800); TXD(P.x1 - 8, P.y0 + 18, '위쪽 = AI가 나선으로 분류', 12.5, '#1d4ed8', 'right', 800); }
    ctx.restore();
    ctx.save(); ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.8; ctx.strokeRect(P.x0, P.y0, P.x1 - P.x0, P.y1 - P.y0); ctx.restore();
    // 점
    G4.forEach((g) => {
      const x = P.gx(g.fx), y = P.gy(g.fb), isTest = g.role === 'test', shown = isTest ? (S.flip[g.id] || 0) > 0.55 : true;
      let fill = '#94a3b8', ring = '#fff';
      if (!isTest) { const l = S.lab[g.id]; if (l) fill = GCOL[l]; if (S.trained && S.training <= 0 && S.pred[g.id]) ring = S.pred[g.id] === g.y ? '#16a34a' : '#dc2626'; }
      else if (shown) { fill = GCOL[S.pred[g.id]]; ring = S.pred[g.id] === g.y ? '#16a34a' : '#dc2626'; }
      ctx.save();
      if (isTest && !shown) { ctx.setLineDash([4, 3]); ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(x, y, 12, 0, TAU); ctx.fill(); ctx.stroke(); }
      else { D.shadow(() => { ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(x, y, 12.5, 0, TAU); ctx.fill(); }, { blur: 4, y: 1.5 }); ctx.strokeStyle = ring; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 12.5, 0, TAU); ctx.stroke(); }
      ctx.restore();
      TXD(x, y + 4.5, String(g.id), 12.5, isTest && !shown ? '#475569' : '#fff', 'center', 800);
    });
    // 범례
    const lgx = P.x0 + 6, lgy = PL4.y + 30;
    // 카드 영역
    const tTrain = PHONE ? 450 : 30;
    TX(card4(G4[0]).x, PHONE ? 454 : 30, '훈련 은하 8개 (눌러서 이름표 달기)', PHONE ? 13.5 : 13, '#cbd5e1', 'left', 800);
    G4.filter((g) => g.role === 'train').forEach((g) => {
      const c = card4(g), l = S.lab[g.id], col = l ? GCOL[l] : null;
      const ok = S.trained && S.training <= 0;
      galCard(c.x, c.y, c.w, c.h, { r: 10, border: col || 'rgba(148,163,184,.55)', bw: col ? 3 : 2 });
      drawGal(g.sp, c.x + c.w / 2, c.y + 36, c.th, galAng(g), g.tilt);
      TX(c.x + 5, c.y + 12, String(g.id), 12.5, '#fde68a', 'left', 800);
      D.label(c.x + c.w / 2, c.y + c.h - 13, l ? LBL[l] : '이름표?', { bg: l ? col : 'rgba(255,255,255,.16)', size: 12, pad: 7 });
      if (ok && S.pred[g.id]) { ctx.save(); ctx.fillStyle = S.pred[g.id] === g.y ? '#16a34a' : '#dc2626'; ctx.beginPath(); ctx.arc(c.x + c.w - 11, c.y + 11, 8, 0, TAU); ctx.fill(); TX(c.x + c.w - 11, c.y + 15.5, S.pred[g.id] === g.y ? '✓' : '✗', 12, '#fff', 'center', 800); ctx.restore(); }
    });
    TX(card4(G4[8]).x, PHONE ? 668 : 250, '시험 은하 4개 (AI가 예측)', PHONE ? 13.5 : 13, '#cbd5e1', 'left', 800);
    G4.filter((g) => g.role === 'test').forEach((g) => {
      const c = card4(g), fl = S.flip[g.id] || 0, sx = Math.max(0.04, Math.abs(Math.cos(fl * Math.PI)));
      const front = fl > 0.5, cx = c.x + c.w / 2;
      ctx.save(); ctx.translate(cx, 0); ctx.scale(sx, 1); ctx.translate(-cx, 0);
      galCard(c.x, c.y, c.w, c.h, { r: 10, border: front ? (S.pred[g.id] === g.y ? '#16a34a' : '#dc2626') : 'rgba(148,163,184,.55)', bw: front ? 3 : 2 });
      if (!front) { TX(cx, c.y + c.h / 2 + 14, '?', 38, '#64748b', 'center', 800); TX(c.x + 5, c.y + 12, String(g.id), 12.5, '#fde68a', 'left', 800); }
      else {
        drawGal(g.sp, cx, c.y + 36, c.th, galAng(g), g.tilt);
        TX(c.x + 5, c.y + 12, String(g.id), 12.5, '#fde68a', 'left', 800);
        D.label(cx, c.y + 80, 'AI: ' + LBL[S.pred[g.id]], { bg: GCOL[S.pred[g.id]], size: 11.5, pad: 6 });
        D.label(cx, c.y + 104, (S.pred[g.id] === g.y ? '정답 ' : '정답: ') + (S.pred[g.id] === g.y ? '✓' : LBL[g.y]), { bg: S.pred[g.id] === g.y ? '#15803d' : '#b91c1c', size: 11.5, pad: 6 });
      }
      ctx.restore();
    });
    // 정확도 판
    const ay = PHONE ? 780 : 392, ah = PHONE ? 50 : 156;
    if (PHONE) {
      note(10, 782, 580, S.trained && S.training <= 0 ? '정확도(%) = 맞힌 수 / 전체 × 100  →  12개 중 ' + S.nCorrect + '개 맞힘' : '이름표를 모두 달고 🧠 훈련하기를 눌러요', 13, { bg: 'rgba(255,255,255,.92)' });
    } else {
      panel(486, ay, 302, ah, { title: '정확도' });
      if (S.trained && S.training <= 0) {
        TXD(498, ay + 50, '정확도(%) = 맞힌 수 / 전체 × 100', 13, '#334155', 'left', 800);
        TXD(498, ay + 78, '12개 중 ' + S.nCorrect + '개를 맞혔어요', 15, '#0f172a', 'left', 800);
        TXD(498, ay + 100, '(훈련 8개 + 시험 4개)', 12.5, '#64748b', 'left', 700);
        TXD(498, ay + 132, 'AI의 정확도를 입력창에 써 보세요 →', 12.5, '#b45309', 'left', 800);
      } else {
        drawWrap(498, ay + 48, S.training > 0 ? '경계선이 데이터를 따라 움직이며 학습하는 중이에요...' : '① 훈련 은하 8개에 이름표 달기\n② 🧠 훈련하기\n③ 시험 은하 4개 결과 보기', 302 - 24, 13, { align: 'left', color: '#334155' });
      }
    }
  }

  /* ======================================================
     컨트롤 연결
     ====================================================== */
  const inN = $('#inN'), inAcc = $('#inAcc'), modeSeg = $('#modeSeg');
  const killTw = (obj, keys) => keys.forEach((k) => { const v = obj[k]; SciSim.tween(obj, { [k]: v }, { duration: 0.0001 }); });
  function setView(v) { if (S.view !== v) { S.view = v; S.fade = 1; parts.clear(); S.over = null; dn1.drag = null; dn2.drag = null; } updateCtl(); }
  function updateCtl() {
    $('#tbLabel').textContent = VIEW_LABEL[S.view];
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !c.dataset.modes.split(' ').includes(S.view); });
    const free = !!(game && game.free);
    $('#tblBox').hidden = !(S.view === 'v3' && (S.tblOn || free));
    $('#matchBox').hidden = !(S.view === 'v3' && (S.matchOn || free));
    $('#accBox').hidden = !(S.view === 'v4' && (S.revealed || free));
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.view === S.view));
    if (modeSeg) modeSeg.hidden = !free;
    $$('#gSeg .opt').forEach((b) => { const i = +b.dataset.k; b.classList.toggle('on', S.gi === i); b.classList.toggle('good', S.recE[i]); });
    $$('#mSeg .opt').forEach((b) => b.classList.toggle('on', b.dataset.k === S.metric));
    const lab = G4.filter((g) => g.role === 'train' && S.lab[g.id]).length;
    $('#bTrain').disabled = S.training > 0 || (lab < 8);
    $('#bTrain').textContent = S.training > 0 ? '⏳ 학습 중...' : S.trained ? '🧠 다시 훈련하기' : '🧠 훈련하기 (' + lab + '/8)';
  }
  /* 1단계 */
  $('#bReset1').addEventListener('click', () => { Sound.click(); dn1.reset(); updateCtl(); });
  /* 2단계 (a) */
  function setGal(i) {
    S.gi = i; S.ha = 5; S.hb = 5; S.hd = 5; S.bd = 5; inN.value = ''; S.matchOk = false; updateCtl();
  }
  $$('#gSeg .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); setGal(+b.dataset.k); }));
  function recordN() {
    const e = ELL[S.gi];
    if (S.recE[S.gi]) { say(e.nm + '는 이미 기록했어요.', false, 1.8); return; }
    if (Math.abs(S.ha - 10) > 0.5 || Math.abs(S.hb - e.b) > 0.5) { Sound.fail(); say('먼저 두 손잡이를 점선(은하의 가장자리)에 맞춰요.', true, 2.6); return; }
    const v = parseNum(inN.value);
    if (!isFinite(v)) { Sound.fail(); say('n을 숫자로 써요. 예: 4', true, 2.2); return; }
    const calc = 10 * (1 - S.hb / S.ha);
    if (Math.abs(v - calc) > 0.4) { Sound.fail(); say('다시 계산해 봐요. b/a = ' + f1(S.hb) + '/' + f1(S.ha) + ' 이므로 n = 10 × (1 - b/a) 예요.', true, 3.6); return; }
    S.recE[S.gi] = true; Sound.success(); say(e.nm + '는 타원 은하 E' + e.n + '예요! (b/a = ' + (e.b / 10).toFixed(1) + ')', false, 2.8);
    const c = mc(); parts.burst(c.cx, c.cy, { count: 20, speed: 160, colors: ['#fbbf24', '#fff', '#fb923c'] });
    updateCtl();
  }
  $('#bN').addEventListener('click', recordN);
  inN.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') recordN(); });
  /* 2단계 (b) */
  $('#bReset2').addEventListener('click', () => { Sound.click(); dn2.reset(); updateCtl(); });
  /* 3단계 */
  $$('#mSeg .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.metric = b.dataset.k; updateCtl(); }));
  ['a', 'b', 'c'].forEach((k, i) => $('#in3' + k).addEventListener('input', (ev) => { S.tbl[i] = ev.target.value; }));
  const MATCH_ROWS = [['타원 은하', 'old'], ['나선 은하', 'mix'], ['불규칙 은하', 'young']];
  const MATCH_OPTS = [['', '고르세요'], ['old', '늙은 붉은 별이 대부분, 새 별 형성 거의 없음'], ['mix', '팽대부는 늙은 별, 나선팔은 젊은 푸른 별과 성간 물질'], ['young', '젊은 푸른 별과 성간 물질이 매우 많음']];
  $('#matchRows').innerHTML = MATCH_ROWS.map((r, i) => '<div class="row-sel"><b>' + r[0] + '</b><select class="mini-sel" data-i="' + i + '" aria-label="' + r[0] + '의 별">' + MATCH_OPTS.map((o) => '<option value="' + o[0] + '">' + o[1] + '</option>').join('') + '</select></div>').join('');
  $$('#matchRows select').forEach((s) => s.addEventListener('change', () => { Sound.click(); S.match3[+s.dataset.i] = s.value; }));
  /* 4단계 */
  function trainPath(labels) {
    const tr = G4.filter((g) => g.role === 'train'), n = tr.length;
    let w1 = 0.9, w2 = -1.1, b = 0.3; const path = [];
    for (let i = 0; i < 400; i++) {
      let g1 = 0, g2 = 0, gb = 0;
      tr.forEach((g) => { const y = labels[g.id] === 'S' ? 1 : 0, p = 1 / (1 + Math.exp(-clamp(w1 * g.fx + w2 * g.fb + b, -30, 30))), e = p - y; g1 += e * g.fx; g2 += e * g.fb; gb += e; });
      w1 -= 1.2 * (g1 / n + 0.02 * w1); w2 -= 1.2 * (g2 / n + 0.02 * w2); b -= 1.2 * (gb / n);
      path.push([w1, w2, b]);
    }
    const out = []; for (let k = 0; k <= 40; k++) out.push(path[Math.min(399, Math.round(Math.pow(k / 40, 2) * 399))]);
    return out;
  }
  const scoreOf = (w, g) => w[0] * g.fx + w[1] * g.fb + w[2];
  function startTraining() {
    const lab = G4.filter((g) => g.role === 'train' && S.lab[g.id]).length;
    if (lab < 8) { say('먼저 훈련 은하 8개에 이름표를 모두 달아요.', true, 2.4); return; }
    if (S.training > 0) return;
    resetFlips();
    S.path = trainPath(S.lab); S.training = 1e-4; S.tProg = 0; S.trained = true; S.revealed = false; S.w = S.path[S.path.length - 1].slice();
    Sound.click(); updateCtl();
  }
  function resetFlips() { G4.filter((g) => g.role === 'test').forEach((g) => { S.flip[g.id] = 0; }); killTw(S.flip, G4.filter((g) => g.role === 'test').map((g) => g.id)); G4.filter((g) => g.role === 'test').forEach((g) => { S.flip[g.id] = 0; }); }
  function finishTraining() {
    S.training = 0; S.wd = S.w.slice();
    S.pred = {}; let ok = 0;
    G4.forEach((g) => { S.pred[g.id] = scoreOf(S.w, g) > 0 ? 'S' : 'E'; if (S.pred[g.id] === g.y) ok++; });
    S.nCorrect = ok; S.acc = ok / G4.length * 100;
    const tests = G4.filter((g) => g.role === 'test');
    tests.forEach((g, i) => SciSim.tween(S.flip, { [g.id]: 1 }, { duration: 0.55, delay: 0.25 + i * 0.4, ease: 'outCubic', onDone: () => { Sound.tick(); if (i === tests.length - 1) { S.revealed = true; Sound.success(); updateCtl(); const P = plot4(); parts.burst(P.gx(0.5), P.gy(0.5), { count: 16, speed: 150, colors: ['#3b82f6', '#f59e0b', '#fff'] }); } } }));
    updateCtl();
  }
  function resetAI() {
    S.lab = {}; S.trained = false; S.training = 0; S.revealed = false; S.pred = {}; S.acc = null; S.nCorrect = 0; S.w = [0, 0, 0]; S.wd = [0, 0, 0]; resetFlips();
    G4.forEach((g) => { g.wrong = false; }); inAcc.value = ''; updateCtl();
  }
  $('#bTrain').addEventListener('click', startTraining);
  $('#bReset4').addEventListener('click', () => { Sound.click(); resetAI(); });

  /* ---------- 포인터 ---------- */
  function binOver(p) { return S.view === 'v1' ? dn1.binAt(p) : S.view === 'v2f' ? dn2.binAt(p) : null; }
  SciSim.pointer(view, {
    down(p) {
      if (S.view === 'v1') return dn1.down(p);
      if (S.view === 'v2f') return dn2.down(p);
      if (S.view === 'v2') {
        const { cx, cy } = mc(), A = { x: cx + S.ha * U2, y: cy }, B = { x: cx, y: cy - S.hb * U2 };
        const dA = Math.hypot(p.x - A.x, p.y - A.y), dB = Math.hypot(p.x - B.x, p.y - B.y);
        if (dA <= 30 && dA <= dB) { S.grab = 'a'; moveHandle(p); return true; }
        if (dB <= 30) { S.grab = 'b'; moveHandle(p); return true; }
        // 눈금자 근처를 눌러도 가까운 손잡이가 와요
        if (Math.abs(p.y - cy) < 26 && p.x > cx) { S.grab = 'a'; moveHandle(p); return true; }
        if (Math.abs(p.x - cx) < 26 && p.y < cy) { S.grab = 'b'; moveHandle(p); return true; }
        return false;
      }
      if (S.view === 'v3') {
        const B = bar3();
        if (p.x >= B.x0 && p.x <= B.x1 && p.y >= C3.y + 30 && p.y <= B.y1 + 30) { const i = clamp(Math.floor((p.x - B.x0) / B.sw), 0, 5); if (S.sel3 !== TY3[i].k) { Sound.click(); setSel3(TY3[i].k); } }
        return false;
      }
      if (S.view === 'v4') {
        if (S.training > 0 || S.trained) return false;
        for (const g of G4) {
          if (g.role !== 'train') continue; const c = card4(g);
          if (p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h) { cycleLabel(g); return false; }
        }
      }
      return false;
    },
    move(p) {
      if (S.view === 'v1') dn1.move(p), S.over = dn1.drag && dn1.moved ? dn1.binAt(p) : null;
      else if (S.view === 'v2f') dn2.move(p), S.over = dn2.drag && dn2.moved ? dn2.binAt(p) : null;
      else if (S.view === 'v2') moveHandle(p);
    },
    up(p) {
      if (S.view === 'v1') dn1.up(p); else if (S.view === 'v2f') dn2.up(p); else if (S.view === 'v2') S.grab = null;
      S.over = null; updateCtl();
    },
    hover(p) { if (S.view === 'v1' || S.view === 'v2f') return (S.view === 'v1' ? dn1 : dn2).hit(p) ? 'grab' : 'default'; if (S.view === 'v3' || S.view === 'v4') return 'pointer'; return 'default'; },
  });
  function moveHandle(p) {
    const { cx, cy } = mc();
    if (S.grab === 'a') S.ha = clamp(Math.round((p.x - cx) / U2 * 2) / 2, 1, 12.5);
    else if (S.grab === 'b') S.hb = clamp(Math.round((cy - p.y) / U2 * 2) / 2, 0.5, 11);
  }
  function cycleLabel(g) {
    Sound.click(); const l = S.lab[g.id]; g.wrong = false;
    S.lab[g.id] = l === 'E' ? 'S' : l === 'S' ? undefined : 'E'; if (!S.lab[g.id]) delete S.lab[g.id];
    updateCtl();
  }
  function setSel3(k) { S.sel3 = k; S.visited[k] = true; const ty = TY3.find((x) => x.k === k); SciSim.tween(S.age, { 0: ty.age[0], 1: ty.age[1], 2: ty.age[2] }, { duration: 0.6, ease: 'outCubic' }); }

  /* ---------- 읽기 칸 ---------- */
  function readouts() {
    const v = S.view;
    if (v === 'v1') setReadouts(['상자에 넣은 은하', grouped1() + ' / 12', '알맞은 상자', right1() + '장', '상자 이름', '모양에 따라 4가지']);
    else if (v === 'v2') setReadouts(['장반경 a', f1(S.ha) + ' 눈금', '단반경 b', f1(S.hb) + ' 눈금', 'b / a', (S.hb / S.ha).toFixed(2)]);
    else if (v === 'v2f') setReadouts(['소리굽쇠에 놓은 은하', placed2() + ' / 6', '알맞은 자리', right2() + '장', '분류 기준', '팽대부 · 나선팔 · 막대']);
    else if (v === 'v3') { const ty = TY3.find((x) => x.k === S.sel3), m = METRIC[S.metric]; setReadouts(['고른 유형', ty.nm, m.nm, ty[S.metric] + m.unit, '은하의 색', ty.clr]); }
    else setReadouts(['이름표를 단 훈련 은하', G4.filter((g) => g.role === 'train' && S.lab[g.id]).length + ' / 8', 'AI 모델', S.training > 0 ? '학습 중' : S.trained ? '훈련 완료' : '훈련 전', '맞힌 은하', S.revealed ? S.nCorrect + ' / 12' : '-']);
  }

  /* ======================================================
     단계 · 미션
     ====================================================== */
  function enterLevel(li) {
    clearTimeout(hintTimer); parts.clear(); flash.t = 0;
    if (li === 0) { dn1.reset(); setView('v1'); showHint('비슷한 모양끼리 상자에 끌어 넣어요', 5000); }
    else if (li === 1) { S.recE = [false, false, false]; setGal(0); dn2.reset(); S.fade = 1; setView('v2'); showHint('두 손잡이를 점선에 맞춰 a와 b를 재요', 5000); }
    else if (li === 2) { S.tblOn = false; S.matchOn = false; S.tbl = ['', '', '']; S.match3 = ['', '', '']; ['a', 'b', 'c'].forEach((k) => { $('#in3' + k).value = ''; }); $$('#matchRows select').forEach((s) => { s.value = ''; }); S.metric = 'ism'; S.visited = {}; setSel3('Sc'); setView('v3'); showHint('막대를 눌러 유형별 값을 읽어요', 5000); }
    else { resetAI(); setView('v4'); showHint('훈련 은하를 눌러 이름표를 달아요', 5000); }
    updateCtl();
  }
  const tbl = (rows) => '<table class="mini">' + rows.map((r, i) => '<tr>' + r.map((c) => (i === 0 ? '<th>' : '<td>') + c + (i === 0 ? '</th>' : '</td>')).join('') + '</tr>').join('') + '</table>';
  const tblOK = () => ASK3.map((r, i) => { const v = parseNum(S.tbl[i]); return isFinite(v) && Math.abs(v - r[1]) <= 1; });
  const MATCH_OK = () => MATCH_ROWS.map((r, i) => S.match3[i] === r[1]);

  const levels = [
    {
      title: '은하의 모양: 비슷한 것끼리 묶기', short: '은하의 모양', icon: '🌌', phase: '관찰', features: ['group'],
      intro: '<p class="si-q">❓ 탐구 질문: 수천억 개의 은하는 모두 같은 모양일까? 모양을 보면 무엇을 알 수 있을까?</p>' +
        '<div class="si-link">🔗 <b>중학교에서</b> 우리은하와 성운·성단을 배웠어요. 이번 차시에서는 우리은하 <b>밖</b>의 은하를 살펴봐요.</div>' +
        '<p><b>외부 은하</b>는 우리은하 밖에 있는 은하예요. 1924년 허블이 안드로메다 은하 속 <b>세페이드 변광성</b>으로 거리를 구해 우리은하 밖에 있다는 것을 확인했어요. 외부 은하는 모양이 다양해요.</p>' +
        '<p>합성한 은하 사진 12장을 <b>비슷한 모양끼리</b> 네 상자(타원형 · 나선형 · 막대 나선형 · 불규칙형)에 끌어 넣어 봐요.</p>',
      setup() { enterLevel(0); },
      recap: '외부 은하는 모양에 따라 타원형, 나선형, 막대 나선형, 불규칙형으로 나눌 수 있어요.',
      summary: '<ul><li><b>외부 은하</b>: 우리은하 밖에 있는 은하. 허블이 안드로메다 은하의 세페이드 변광성으로 거리를 구해(우리은하 지름 약 10만 광년보다 훨씬 먼 약 250만 광년) 우리은하 밖의 은하임을 확인했어요(1924년).</li><li>은하의 모양은 크게 <b>타원형 · 나선형 · 막대 나선형 · 불규칙형</b>으로 나눌 수 있어요.</li><li>우리은하는 중심에 막대가 있는 <b>막대 나선 은하</b>(SBbc)예요.</li></ul>',
      missions: [
        {
          title: '은하 12장 묶기',
          goal: '은하 사진 12장을 <b>비슷한 모양끼리</b> 네 상자에 넣어요. 다 넣은 뒤 <b>✔ 확인하기</b>를 눌러요.', manual: true,
          setup() { dn1.reset(); setView('v1'); },
          hint: '매끈한 타원은 타원형, 팔이 휘감기면 나선형, 중심에 막대가 보이면 막대 나선형, 정해진 모양이 없으면 불규칙형이에요.',
          check: () => {
            if (grouped1() < 12) return '사진 12장을 모두 상자에 넣어요. (' + grouped1() + ' / 12)';
            const bad = G1.filter((g) => g.bin !== g.g);
            if (!bad.length) return true;
            bad.forEach((g) => { if (!g.wrong) { g.wrong = true; g.shake = 1; } });
            return bad.length + '장이 알맞지 않은 상자에 있어요. 빨간 테두리의 사진을 다시 살펴봐요.';
          },
          explain: '타원 모양 <b>3장</b>, 나선팔이 있는 <b>3장</b>, 중심에 막대가 있는 나선 은하 <b>3장</b>, 모양이 제각각인 <b>불규칙 은하 3장</b>으로 나뉘어요.',
        },
        {
          type: 'quiz', title: '우리은하 밖의 은하', goal: '허블은 안드로메다 은하가 <b>우리은하 밖에 있다</b>는 것을 어떻게 확인했을까요?', setup() { setView('v1'); },
          choices: ['안드로메다 은하가 우리은하보다 훨씬 크게 보였기 때문이에요', '안드로메다 은하가 나선 모양이어서 우리은하와 모양이 달랐기 때문이에요', '안드로메다 은하 속 세페이드 변광성으로 구한 거리가 우리은하의 크기보다 훨씬 멀었기 때문이에요', '안드로메다 은하가 움직이지 않는 것을 관측했기 때문이에요'],
          answer: 2,
          feedback: ['보이는 크기는 거리에 따라 달라서 크기만으로는 우리은하 밖인지 알 수 없어요.', '우리은하도 나선 모양(막대 나선)이에요. 모양만으로는 우리은하 안팎을 구별할 수 없어요.', '', '은하의 위치는 거리를 구해야 알 수 있어요. 움직임이 아니라 거리가 핵심이에요.'],
          explain: '세페이드 변광성은 변광 주기로 진짜 밝기를 알 수 있어서 거리를 구할 수 있어요. 안드로메다 은하까지는 약 250만 광년으로, 우리은하 지름(약 10만 광년)보다 훨씬 멀어요. 그래서 우리은하 <b>밖</b>의 은하(외부 은하)라는 것이 확인됐어요.',
        },
      ],
    },
    {
      title: '허블 분류: 타원 은하와 소리굽쇠 도표', short: '허블 분류', icon: '🍴', phase: '탐구', features: ['measure', 'fork'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 은하를 모양에 따라 네 무리로 묶어 봤어요.</div>' +
        '<p>허블은 은하를 모양에 따라 <b>타원 은하(E)</b>, <b>렌즈형 은하(S0)</b>, <b>나선 은하(S)</b>, <b>막대 나선 은하(SB)</b>, <b>불규칙 은하(Irr)</b>로 분류했어요. 이를 한 장의 <b>소리굽쇠 도표</b>로 나타내요.</p>' +
        '<p><b>타원 은하 En</b>의 n은 <b>n = 10 × (1 − b/a)</b>예요 (a: 장반경, b: 단반경). 둥글수록 E0, 납작할수록 E7이에요. 나선 은하는 <b>팽대부가 클수록, 나선팔이 촘촘할수록 a</b>, 팽대부가 작고 팔이 느슨할수록 c예요.</p>',
      setup() { enterLevel(1); },
      recap: '허블 분류는 은하의 모양에 따른 형태학적 분류예요. 타원 은하는 En(n = 10(1 − b/a)), 나선 은하는 Sa~Sc와 SBa~SBc로 나눠요.',
      summary: '<ul><li><b>타원 은하 En</b>: n = 10 × (1 − b/a) (a 장반경, b 단반경). E0(둥글다) ~ E7(납작하다).</li><li><b>렌즈형 S0</b>: 나선팔이 없는 원반 + 팽대부. 타원 은하와 나선 은하 사이에 둬요.</li><li><b>나선 은하 Sa·Sb·Sc</b>: 팽대부가 클수록, 나선팔이 촘촘할수록 a에 가까워요. 중심에 막대가 있으면 <b>SBa·SBb·SBc</b>.</li><li><b>불규칙 은하 Irr</b>: 일정한 모양이 없어요.</li><li>허블 분류는 <b>모양에 따른 형태학적 분류</b>이며 은하의 진화 순서를 뜻하지 않아요.</li><li>우리은하는 SBbc(지름 약 10만 광년), 안드로메다 은하는 Sb(거리 약 250만 광년, 지름 약 22만 광년), 대마젤란 은하는 Irr, M87은 E0~E1이에요.</li></ul>',
      missions: [
        {
          title: '타원 은하의 En 구하기',
          goal: '은하 3개에서 <b>손잡이를 점선에 맞춰</b> a와 b를 잰 뒤, <b>n = 10 × (1 − b/a)</b>를 계산해 기록해요.',
          hint: 'a = 10 눈금인 은하에서 b = 6 이면 n = 10 × (1 − 0.6) = 4, 즉 E4예요. 손잡이는 끌어서 점선 위에 올려 둬요.',
          hold: 0.3, setup() { setView('v2'); },
          status: () => ELL.map((e, i) => e.nm + ' ' + mark(S.recE[i])).join(' · '),
          check: () => S.recE.every(Boolean),
          explain: '은하 가: b/a = 0.6 → <b>E4</b>, 은하 나: b/a = 0.8 → <b>E2</b>, 은하 다: b/a = 0.3 → <b>E7</b>이에요. 납작할수록 n이 커져요.',
        },
        {
          title: '소리굽쇠 도표에 나선 은하 놓기',
          goal: '나선 은하 6장을 <b>알맞은 칸</b>(Sa·Sb·Sc·SBa·SBb·SBc)에 놓고 <b>✔ 확인하기</b>를 눌러요.', manual: true,
          setup() { dn2.reset(); setView('v2f'); },
          hint: '먼저 중심에 막대가 있는지로 S와 SB를 나누고, 팽대부 크기와 나선팔이 감긴 정도로 a·b·c를 정해요.',
          check: () => {
            if (placed2() < 6) return '6장을 모두 칸에 놓아요. (' + placed2() + ' / 6)';
            const bad = G2.filter((g) => g.bin !== g.slot);
            if (!bad.length) return true;
            bad.forEach((g) => { if (!g.wrong) { g.wrong = true; g.shake = 1; } });
            return bad.length + '장이 알맞지 않은 칸에 있어요. 빨간 테두리의 사진을 다시 살펴봐요.';
          },
          explain: '막대가 있는 3장은 SB, 없는 3장은 S예요. 팽대부가 크고 팔이 촘촘한 것이 a, 팽대부가 작고 팔이 느슨하게 풀린 것이 c예요.',
        },
        {
          type: 'quiz', title: '허블 분류의 뜻', goal: '허블의 은하 분류 체계에 대한 설명으로 옳은 것은 무엇일까요?', setup() { setView('v2f'); },
          choices: ['E에서 S로 은하가 진화하는 순서를 나타내요', '은하의 질량에 따라 나눈 분류예요', '은하의 모양에 따라 나눈 형태학적 분류예요', '은하가 우리에게서 멀어지는 속도에 따라 나눈 분류예요'],
          answer: 2,
          feedback: ['소리굽쇠 도표는 모양을 늘어놓은 것이지 진화 순서가 아니에요.', '질량을 재서 나눈 분류가 아니라 사진에 보이는 모양으로 나눈 분류예요.', '', '속도와는 관계없어요. 허블 분류는 눈에 보이는 모양을 기준으로 해요.'],
          explain: '허블 분류는 <b>모양(형태)</b>으로 나눈 형태학적 분류예요. 모양에는 성간 물질의 비율, 별의 나이 같은 은하의 성질이 함께 나타나서 다음 단계에서 비교해 봐요.',
        },
      ],
    },
    {
      title: '은하의 특징: 성간 물질과 별의 나이', short: '은하의 특징', icon: '📊', phase: '분석', features: ['compare'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 은하를 모양에 따라 E, S0, S, SB, Irr로 분류했어요.</div>' +
        '<p>모양이 다른 은하는 <b>성간 물질의 비율</b>, <b>구성 천체의 나이</b>, <b>별 형성</b>도 달라요. 유형별 막대 그래프(예시 값)를 읽고 비교해 봐요.</p>' +
        '<p>젊고 푸른 별은 수명이 수백만~수천만 년으로 짧아서, 푸른 별이 많다는 것은 <b>최근에 별이 태어났다</b>는 증거예요.</p>',
      setup() { enterLevel(2); },
      recap: '타원 은하는 늙은 붉은 별이 많고 성간 물질이 거의 없어요. 나선팔과 불규칙 은하는 성간 물질이 많아 젊은 푸른 별이 많아요.',
      summary: '<ul><li>성간 물질 비율(예시): E 거의 0 % &lt; S0 약 1 % &lt; Sa 약 5 % &lt; Sb 약 8 % &lt; Sc 약 15 % &lt; Irr 약 25 %</li><li><b>타원 은하</b>: 늙은 붉은 별(수십억~100억 년)이 대부분, 성간 물질이 거의 없고 새 별 형성이 거의 없어서 <b>붉게</b> 보여요.</li><li><b>나선 은하</b>: 팽대부는 늙은 붉은 별, <b>나선팔</b>에는 젊은 푸른 별과 성간 물질이 있고 별 형성이 활발해요.</li><li><b>불규칙 은하</b>: 젊은 푸른 별과 성간 물질이 많아요.</li><li>크기·질량은 타원 은하가 왜소한 것부터 거대한 것까지 매우 다양해요.</li></ul>' +
        tbl([['유형', '성간 물질', '주 구성 별', '색'], ['E', '거의 0 %', '늙은 붉은 별', '붉음'], ['S0', '약 1 %', '늙은 별', '붉음~노랑'], ['Sa~Sc', '5~15 %', '팽대부: 늙은 별 / 팔: 젊은 별', '노랑~푸름'], ['Irr', '약 25 %', '젊은 푸른 별', '푸름']]),
      missions: [
        {
          title: '막대 그래프에서 값 읽기',
          goal: '<b>성간 물질 비율</b> 그래프의 막대를 눌러 <b>Sa · Sc · Irr</b>의 값을 읽어 오른쪽 표에 써요.',
          hint: '막대를 누르면 값이 나와요. 눈금선을 보고 읽어도 돼요. 단위는 %예요.',
          hold: 0.5, setup() { S.tblOn = true; S.metric = 'ism'; setView('v3'); updateCtl(); },
          status: () => ASK3.map((r, i) => r[0] + ' ' + mark(tblOK()[i])).join(' · '),
          check: () => tblOK().every(Boolean),
          explain: '성간 물질 비율은 <b>Sa 약 5 %, Sc 약 15 %, Irr 약 25 %</b>예요. 모양이 불규칙하거나 나선팔이 느슨할수록 성간 물질이 많아요.',
        },
        {
          title: '은하 유형과 별의 나이 짝짓기',
          goal: '<b>타원 · 나선 · 불규칙</b> 은하에 알맞은 별의 특징을 골라요. 다 고른 뒤 <b>✔ 확인하기</b>를 눌러요.', manual: true,
          setup() { S.tblOn = true; S.matchOn = true; setView('v3'); updateCtl(); },
          hint: '푸른 별은 수명이 짧아서 새로 태어난 별이에요. 성간 물질이 많은 은하에서 별이 태어나요.',
          check: () => { if (S.match3.some((v) => !v)) return '세 줄을 모두 골라요.'; const ok = MATCH_OK(); return ok.every(Boolean) ? true : (ok.filter((v) => !v).length + '개가 알맞지 않아요. 성간 물질의 비율과 별의 색을 떠올려 봐요.'); },
          explain: '타원 은하는 <b>늙은 붉은 별</b>이 대부분, 나선 은하는 팽대부의 늙은 별과 <b>나선팔의 젊은 푸른 별</b>, 불규칙 은하는 <b>젊은 푸른 별과 성간 물질</b>이 많아요.',
        },
        {
          type: 'quiz', title: '은하가 붉거나 푸른 까닭', goal: '타원 은하가 <b>붉게</b> 보이는 까닭은 무엇일까요?', setup() { setView('v3'); },
          choices: ['타원 은하는 우리에게서 빠르게 멀어지고 있기 때문이에요', '성간 물질이 많아 붉게 물들기 때문이에요', '새로운 별이 거의 태어나지 않아 수명이 짧은 푸른 별은 이미 사라지고, 늙은 붉은 별이 남았기 때문이에요', '타원 은하는 온도가 낮은 별만 만들기 때문이에요'],
          answer: 2,
          feedback: ['색은 은하를 이루는 별의 나이와 관계가 깊어요. 멀어지는 속도 때문이 아니에요.', '타원 은하에는 성간 물질이 거의 없어요. 성간 물질이 많은 쪽은 나선팔과 불규칙 은하예요.', '', '별은 새로 태어날 때 다양한 질량으로 만들어져요. 푸른 별이 오래 살지 못하는 것이 핵심이에요.'],
          explain: '푸른 별은 수명이 수백만~수천만 년이에요. 타원 은하는 성간 물질이 거의 없어 새로운 별이 태어나지 않으므로 푸른 별은 이미 사라지고 <b>늙은 붉은 별</b>이 남았어요. 반대로 나선팔이 푸른 것은 그곳에서 지금도 별이 태어나기 때문이에요.',
        },
      ],
    },
    {
      title: '빅데이터와 AI로 은하 분류하기', short: 'AI 분류', icon: '🤖', phase: '탐구', features: ['ai'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 모양과 색이 은하의 유형을 알려 준다는 것을 확인했어요.</div>' +
        '<p>요즘에는 수백만 개의 은하 사진이 쌓여서 사람이 모두 볼 수 없어요. 그래서 <b>빅데이터와 인공지능(AI)</b>으로 은하를 분류해요. AI는 <b>훈련 데이터 → 규칙 → 예측</b> 순서로 일해요.</p>' +
        '<p>은하마다 두 가지 특징(<b>납작한 정도</b>, <b>푸른 정도</b>)이 있어요. 훈련 은하 8개에 <b>타원/나선</b> 이름표를 달아 가르치면 AI가 두 무리를 나누는 <b>경계선</b>을 학습하고, 시험 은하 4개를 예측해요.</p>',
      setup() { enterLevel(3); },
      recap: 'AI는 이름표가 붙은 훈련 데이터에서 규칙을 배워 새 은하를 분류해요. 훈련에 없던 유형은 잘못 분류할 수 있어요.',
      summary: '<ul><li>빅데이터 시대에는 은하가 수백만 개라서 사람이 모두 분류하기 어려워 <b>AI</b>를 이용해요.</li><li>AI 분류: <b>훈련 데이터(이름표가 붙은 은하) → 규칙(경계선) → 예측(새 은하)</b></li><li><b>정확도(%) = 맞힌 수 ÷ 전체 × 100</b> (예: 12개 중 10개 → 약 83 %)</li><li>오분류 예: 옆에서 본 나선 은하는 납작한 타원 은하처럼 보이고, 붉은 Sa 은하는 타원 은하처럼 보여요. 훈련 데이터에 없던 경우는 틀리기 쉬워요.</li></ul>',
      missions: [
        {
          title: '훈련 데이터에 이름표 달기',
          goal: '훈련 은하 8개를 눌러 <b>타원/나선</b> 이름표를 달아요. 다 단 뒤 <b>✔ 확인하기</b>를 눌러요.', manual: true,
          setup() { if (S.trained) resetAI(); setView('v4'); },
          hint: '카드를 누를 때마다 이름표가 타원 → 나선 → 없음으로 바뀌어요. 매끈하고 붉으면 타원, 팔이 있고 푸르면 나선이에요.',
          check: () => {
            const tr = G4.filter((g) => g.role === 'train'); const un = tr.filter((g) => !S.lab[g.id]);
            if (un.length) return '이름표를 달지 않은 은하가 ' + un.length + '개 있어요.';
            const bad = tr.filter((g) => S.lab[g.id] !== g.y);
            if (!bad.length) return true;
            bad.forEach((g) => { if (!g.wrong) { g.wrong = true; } });
            return bad.length + '개의 이름표가 달라요. 모양과 색을 다시 살펴봐요.';
          },
          explain: '이름표는 훈련 데이터의 <b>정답</b>이에요. 타원 4개(붉고 매끈), 나선 4개(푸르고 팔이 있음)를 맞게 달아야 AI가 올바른 규칙을 배워요. 이름표가 틀리면 AI도 엉뚱한 규칙을 배워요.',
        },
        {
          title: 'AI의 정확도 계산하기',
          goal: '<b>🧠 훈련하기</b>를 눌러 AI를 훈련하고, 시험 결과가 나오면 <b>정확도(%)</b>를 계산해 써요.',
          hint: '정확도(%) = 맞힌 수 ÷ 전체 × 100 예요. 전체는 훈련 8개 + 시험 4개 = 12개이고, 맞힌 수는 ✓ 표시를 세어요.',
          hold: 0.4, setup() { setView('v4'); },
          status: () => '훈련 ' + mark(S.trained && S.training <= 0) + ' · 시험 결과 ' + mark(S.revealed) + ' · 정확도 ' + mark(S.revealed && isFinite(parseNum(inAcc.value)) && Math.abs(parseNum(inAcc.value) - S.acc) <= 1.5),
          check: () => S.revealed && isFinite(parseNum(inAcc.value)) && Math.abs(parseNum(inAcc.value) - S.acc) <= 1.5,
          explain: '12개 중 10개를 맞혔으므로 정확도는 10 / 12 × 100 ≈ <b>83 %</b>예요. 훈련 은하는 모두 맞혔고, 시험 은하 4개 중 2개(옆에서 본 나선 은하, 붉은 Sa 은하)를 타원으로 잘못 분류했어요.',
        },
        {
          type: 'quiz', title: 'AI 분류의 장점과 한계', goal: 'AI가 <b>옆에서 본 나선 은하</b>를 타원 은하로 잘못 분류한 까닭과, 천문학에서 AI를 쓰는 까닭을 가장 잘 설명한 것은?', setup() { setView('v4'); },
          choices: ['AI는 은하를 볼 수 없어서 항상 무작위로 분류해요', '옆에서 보면 납작한 타원 은하와 비슷해 보이는데, 훈련 데이터에 그런 사례가 없었어요. 그래도 AI는 수백만 개의 은하를 빠르게 분류할 수 있어요', '훈련 은하의 수가 많을수록 정확도는 항상 100 %가 돼요', '사람이 분류하면 항상 틀리기 때문에 AI를 써요'],
          answer: 1,
          feedback: ['AI는 훈련 데이터에서 배운 규칙으로 분류해요. 무작위가 아니에요.', '', '훈련 데이터에 없던 유형이나 관측 방향 때문에 모양이 달라 보이는 경우에는 데이터가 많아도 틀릴 수 있어요.', '사람도 잘 분류하지만 수백만 개를 모두 볼 수 없어서 AI의 도움을 받는 거예요.'],
          explain: 'AI는 <b>훈련 데이터에 없던 유형</b>(옆모습의 나선 은하)이나 관측 방향 때문에 모양이 달라 보이는 경우에 틀리기 쉬워요. 그래도 사람이 볼 수 없는 수백만 개의 은하를 빠르게 분류할 수 있어서 빅데이터 시대에 꼭 필요해요. 결과는 사람이 다시 확인해야 해요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'he-galaxy-types', mount: '#game', badge: '은하 분류 박사', homeHref: '../../index.html#he',
    featureLabels: { group: '🖼️ 은하 사진 · 상자', measure: '📏 눈금자 손잡이', fork: '🍴 소리굽쇠 도표', compare: '📊 유형별 막대 그래프', ai: '🤖 AI 분류 모형' },
    onFeatures() { updateCtl(); },
    levels,
  });
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setView(b.dataset.view); }));

  /* ---------- 루프 ---------- */
  let lastFree = false, matchHold = 0;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    S.hd = approach(S.hd, S.ha, dt, 16); S.bd = approach(S.bd, S.hb, dt, 16);
    const okNow = S.view === 'v2' && Math.abs(S.ha - 10) <= 0.5 && Math.abs(S.hb - ELL[S.gi].b) <= 0.5;
    S.matchT = approach(S.matchT, okNow ? 1 : 0, dt, 8);
    if (okNow && !S.matchOk) { S.matchOk = true; Sound.tick(); } else if (!okNow) S.matchOk = false;
    const m = METRIC[S.metric];
    TY3.forEach((ty, i) => { S.bh[i] = approach(S.bh[i], clamp(ty[S.metric] / m.max, 0, 1), dt, 6); });
    if (S.training > 0) {
      S.tProg = Math.min(1, (S.tProg || 0) + dt / 1.9);
      const f = S.tProg * (S.path.length - 1), i0 = Math.floor(f), i1 = Math.min(S.path.length - 1, i0 + 1), u = f - i0;
      S.wd = [0, 1, 2].map((k) => S.path[i0][k] + (S.path[i1][k] - S.path[i0][k]) * u);
      S.training = Math.max(1e-4, S.training);
      if (S.tProg >= 1) { finishTraining(); }
    }
    dn1.update(dt); dn2.update(dt);
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    ctx.fillStyle = '#070d1f'; ctx.fillRect(0, 0, VW, VH);
    // 별 배경 (한 번만 정해 둔 점)
    ctx.fillStyle = 'rgba(255,255,255,.5)'; BGSTARS.forEach((s) => { ctx.globalAlpha = 0.25 + 0.5 * (0.5 + 0.5 * Math.sin(t * s[3] + s[2])); ctx.fillRect(s[0] * VW, s[1] * VH, 1.6, 1.6); }); ctx.globalAlpha = 1;
    const bgG = ctx.createRadialGradient(VW * 0.25, 0, 10, VW * 0.25, 0, VH); bgG.addColorStop(0, 'rgba(70,90,200,.22)'); bgG.addColorStop(1, 'rgba(7,13,31,0)'); ctx.fillStyle = bgG; ctx.fillRect(0, 0, VW, VH);
    if (S.view === 'v1') drawV1(t, dt);
    else if (S.view === 'v2') drawV2(t, dt);
    else if (S.view === 'v2f') drawV2f(t, dt);
    else if (S.view === 'v3') drawV3(t, dt);
    else drawV4(t, dt);
    parts.draw(ctx);
    drawFlash(dt, S.view === 'v3' || S.view === 'v4' ? 8 : PHONE ? 8 : 8);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(7,13,31,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });
  const BGSTARS = (() => { const r = mulberry(99), a = []; for (let i = 0; i < 70; i++) a.push([r(), r(), r() * 6, 0.6 + r() * 1.4]); return a; })();

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, U2, mc, G1, G2, G4, ELL, TY3, FG, dn1, dn2, GRP_ORDER, SLOTS, card4, binRect, plot4, bar3,
    get game() { return game; },
    enterLevel, setView, setGal, recordN, startTraining, resetAI, cycleLabel, setSel3, updateCtl, parseNum,
    solveGroups() { G1.forEach((g) => { dn1.assign(g, g.g); }); dn1.snap(); },
    solveFork() { G2.forEach((g) => { dn2.assign(g, g.slot); }); dn2.snap(); },
    solveLabels() { G4.filter((g) => g.role === 'train').forEach((g) => { S.lab[g.id] = g.y; }); updateCtl(); },
    solveMeasure(i) { setGal(i); S.ha = S.hd = 10; S.hb = S.bd = ELL[i].b; inN.value = String(ELL[i].n); recordN(); },
  };

})();
