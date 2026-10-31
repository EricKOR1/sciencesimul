/* =========================================================
   행성우주과학 Ⅱ. 태양과 별의 관측 - 변광성과 초신성 (7차시)
   성취기준 [12행우02-05] 광도곡선의 특징을 비교하여 맥동변광성과 폭발 변광성을 구분하고, 폭발 변광성 중 초신성 관측 자료를 통해 알 수 있는 과학적 사실을 추론할 수 있다. (변광성)
   ① 관찰: 광도 곡선 (시간–등급, 주기·진폭 읽기, 등급은 클수록 어두움)
   ② 분석: 분류하기 (맥동 변광성 / 폭발 변광성, 판별 기준; 식변광성은 참고로 구별)
   ③ 분석: 주기 읽기 (δ Cep, RR Lyr, 미라를 같은 시간 눈금으로)
   ④ 분석: 초신성 (거리 지수 M = m + 5 − 5 log d, 광도, 스펙트럼선 이동으로 속도)
   다루지 않음: 맥동의 기작, 초신성의 종류와 폭발 과정, 신성의 폭주 핵융합 모델, 변광 원인의 물리.
   ========================================================= */
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
  const f3 = (x) => (Math.round(x * 1000) / 1000).toFixed(3);
  const comma = (n) => String(Math.round(n)).replace(/(\d)(?=(\d{3})+$)/g, '$1,');
  const clickable = (el, fn) => el.addEventListener('click', () => { Sound.click(); fn(el); });

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
  /* D.text 짧은 호출: T(x, y, 글, 크기, 색, 정렬, 굵기, 추가옵션) */
  const T = (x, y, s, size, color, align, weight, extra) => D.text(x, y, s, Object.assign({ size: size || 14, color: color || '#26324a', align: align || 'left', weight: weight || 800 }, extra));

  /* 글자 줄바꿈 (한국어: 공백 단위, 너무 긴 단어는 글자 단위) */
  const WRAPC = new Map();
  function wrapLines(text, maxW, size, weight) {
    const ck = text + '|' + Math.round(maxW) + '|' + size + '|' + (weight || 700) + '|' + FS;
    const hit = WRAPC.get(ck); if (hit) return hit;
    const res = wrapLines0(text, maxW, size, weight);
    if (WRAPC.size > 600) WRAPC.clear();
    WRAPC.set(ck, res); return res;
  }
  function wrapLines0(text, maxW, size, weight) {
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
  /* 줄바꿈 글 그리기: 마지막 줄의 baseline y를 돌려줘요 */
  function drawWrap(x, y, text, maxW, size, o) {
    o = o || {};
    const lines = wrapLines(text, maxW, size, o.weight), lh = size * FS * (o.lh || 1.3);
    lines.forEach((l, i) => D.text(x, y + i * lh, l, { size, weight: o.weight || 700, color: o.color || '#334155', align: o.align || 'left', alpha: o.alpha, stroke: o.stroke, strokeWidth: o.strokeWidth }));
    return y + (lines.length - 1) * lh;
  }
  function panel(x, y, w, h, o) {
    o = o || {};
    const pf = !o.fill || /^rgba\(255,255,255/.test(o.fill) ? '#ffffff' : o.fill;
    D.shadow(() => { ctx.fillStyle = pf; rr(x, y, w, h, o.r || 14).fill(); }, { blur: 6, y: 2, color: 'rgba(20,40,80,.16)' });
    if (o.line) { ctx.strokeStyle = o.line; ctx.lineWidth = o.lw || 2; rr(x, y, w, h, o.r || 14).stroke(); }
    if (o.title) D.text(x + 12, y + 20 * FS, o.title, { size: o.tsize || 14, weight: 800, color: o.tcolor || '#334155', align: 'left' });
  }
  /* 안내 글 상자 */
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
  function showHint(msg, ms) { const h = $('#stageHint'); if (!h) return; h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 3800); }
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
  /* 숫자 입력 읽기 / 입력 칸 표시 */
  const numOf = (id) => { const e = $('#' + id); if (!e) return null; const v = e.value.trim().replace(/[−–]/g, '-').replace(/,(?=\d{3}(?!\d))/g, '').replace(',', '.'); return v === '' || !isFinite(+v) ? null : +v; };
  const fbIn = (id, ok) => { const e = $('#' + id); if (!e) return; if (ok) { e.classList.remove('bad'); e.classList.add('ok'); } else if (!e.classList.contains('bad')) { e.classList.remove('ok'); void e.offsetWidth; e.classList.add('bad'); } };
  const clrIn = (...ids) => ids.forEach((id) => { const e = $('#' + id); if (e) { e.value = ''; e.classList.remove('ok', 'bad'); } });
  /* 별밤 배경 (고정 별) */
  const STARS = [];
  (function () { let s = 12345; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647); for (let i = 0; i < 110; i++) STARS.push([r(), r(), 0.4 + r() * 1.2, r() * 6]); })();
  function spaceBg(x, y, w, h, t, top, bottom) {
    ctx.save(); rr(x, y, w, h, 0); ctx.clip();
    const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, top || '#0b1230'); g.addColorStop(1, bottom || '#16224a');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    STARS.forEach((s) => { ctx.globalAlpha = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 1.5 + s[3])); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + s[0] * w, y + s[1] * h, s[2], 0, TAU); ctx.fill(); });
    ctx.globalAlpha = 1; ctx.restore();
  }
  /* 태양 */
  function sunDraw(x, y, r) { D.glow(x, y, r * 3.2, '#ffd447', 0.5); D.sphere(x, y, r, '#ffb703', { gloss: true, light: '#fff3b0', dark: '#e07b00' }); }
  /* 작은 자료 표 한 칸 글자: 가운데 정렬 */
  const tc = (x, y, s, size, color, weight) => T(x, y, s, size, color, 'center', weight);

  /* 케플러 방정식 */
  function kepE(M, e) { let E = M + e * Math.sin(M); for (let i = 0; i < 14; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E)); return E; }
  /* ---------- 공통 도우미 2 ---------- */
  const sup = (n) => String(n).split('').map((c) => ({ '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' }[c])).join('');
  const sci = (x, d) => { if (!(x > 0)) return '0'; let e = Math.floor(Math.log10(x)), m = x / Math.pow(10, e); const dd = d == null ? 1 : d; if (+m.toFixed(dd) >= 10) { m /= 10; e += 1; } return m.toFixed(dd) + '×10' + sup(e); };
  const outlineT = (x, y, s, size, color, align) => T(x, y, s, size, color || '#e2e8f0', align || 'left', 800, { stroke: 'rgba(5,10,30,.75)', strokeWidth: 4 });
  const near = (x, v, tol) => x != null && Math.abs(x - v) <= tol;
  const nearRel = (x, v, r) => x != null && Math.abs(x - v) <= Math.abs(v) * r;
  const fN = (x, d) => (Math.round(x * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d);
  /* 흑체 복사 느낌의 별 색 (T: K) */
  function starColor(T_) {
    const t = clamp((T_ - 2500) / (7500 - 2500), 0, 1);
    const stops = [[0, [255, 120, 60]], [0.2, [255, 165, 90]], [0.45, [255, 210, 140]], [0.65, [255, 238, 205]], [0.8, [255, 250, 240]], [1, [215, 230, 255]]];
    for (let i = 1; i < stops.length; i++) if (t <= stops[i][0]) { const a = stops[i - 1], b = stops[i], k = (t - a[0]) / (b[0] - a[0]); return 'rgb(' + a[1].map((v, j) => Math.round(v + (b[1][j] - v) * k)).join(',') + ')'; }
    return 'rgb(215,230,255)';
  }
  /* 가로 막대 하나 (눈금 안에서만): 값 v를 [0, vmax] 눈금에 */
  function hbar(x, y, w, h, v, vmax, color) {
    const ww = clamp(v / vmax, 0, 1) * w;
    ctx.fillStyle = 'rgba(100,116,139,.12)'; rr(x, y, w, h, h / 2).fill();
    if (ww > 0.5) { ctx.save(); rr(x, y, w, h, h / 2); ctx.clip(); const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, shade(color, 0.25)); g.addColorStop(1, shade(color, -0.12)); ctx.fillStyle = g; ctx.fillRect(x, y, ww, h); ctx.restore(); }
  }
  /* 위치 이동하는 상태값 (여러 개의 부드러운 값) */
  const sm = (o, k, tgt, dt, rate) => { o[k] = approach(o[k], tgt, dt, rate || 10); return o[k]; };
  /* 가운데 정렬 안내 줄 */
  function chip(x, y, text, o) { o = o || {}; return D.label(x, y, text, Object.assign({ bg: '#1e293b', color: '#fff', size: 13 }, o)); }
  /* 숫자 굴러가기 표시용 */
  const roll = (cur, tgt, dt) => (RM ? tgt : (Math.abs(tgt - cur) < Math.abs(tgt) * 0.0005 ? tgt : cur + (tgt - cur) * (1 - Math.exp(-6 * dt))));
  /* 카드 눌림 효과 있는 사각 버튼 영역 판정 */
  const inR = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  /* 시드 난수 */
  function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  /* =========================================================
     카드 분류기: 카드를 눌러(또는 끌어서) 상자에 넣어요.
     cfg: { items:[{id,label,sub,text,bin,open}], bins:[{label,sub,color}], chipCols, minRows,
            layout():{grid:{x,y,w,h,cols,cardH,gap}, detail:{x,y,w,h}, bins:[{x,y,w,h}]},
            onOpen(item), onPlace(item,bin), onChange(), placeholder, detailFn(item)->{title,body} }
     ========================================================= */
  function makeClassifier(cfg) {
    const C = {
      cfg, sel: -1, drag: null, seq: 0, hoverBin: -1,
      items: cfg.items.map((it, i) => Object.assign({ idx: i, loc: null, open: true, x: -999, y: 0, w: 100, h: 50, seq: 0, lift: 0, wrong: false, flip: 1, fresh: 0 }, it)),
    };
    const LT = () => cfg.layout();
    C.reset = function () { C.sel = -1; C.drag = null; C.seq = 0; C.items.forEach((it) => { it.loc = null; it.wrong = false; it.x = -999; }); };
    function gridSlot(L, i) {
      const g = L.grid, cw = (g.w - g.gap * (g.cols - 1)) / g.cols, col = i % g.cols, row = Math.floor(i / g.cols);
      return { x: g.x + col * (cw + g.gap), y: g.y + row * (g.cardH + g.gap), w: cw, h: g.cardH };
    }
    function binArea(L, b) {
      const r = L.bins[b], head = (cfg.bins[b].sub ? 46 : 34) * (PHONE ? 1.05 : 1);
      return { x: r.x + 8, y: r.y + head, w: r.w - 16, h: r.h - head - 8 };
    }
    function chipSlot(L, b, k, n) {
      const a = binArea(L, b), cols = cfg.chipCols || 1, gap = 4, minRows = cfg.minRows || 3;
      const rows = Math.max(Math.ceil(n / cols), minRows), ch = clamp((a.h - gap * (rows - 1)) / rows, 24, 38), cw = (a.w - gap * (cols - 1)) / cols;
      return { x: a.x + (k % cols) * (cw + gap), y: a.y + Math.floor(k / cols) * (ch + gap), w: cw, h: ch };
    }
    C.targets = function () {
      const L = LT(), res = new Map();
      C.items.forEach((it, i) => { if (it.loc == null) res.set(it, gridSlot(L, i)); });
      cfg.bins.forEach((_, b) => {
        const arr = C.items.filter((it) => it.loc === b).sort((p, q) => p.seq - q.seq);
        arr.forEach((it, k) => res.set(it, chipSlot(L, b, k, arr.length)));
      });
      return res;
    };
    C.binAt = function (p) { const L = LT(); for (let b = 0; b < L.bins.length; b++) { const r = L.bins[b]; if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) return b; } return -1; };
    C.place = function (it, b) {
      if (!it.open) return false;
      it.loc = b; it.seq = ++C.seq; it.wrong = false; C.sel = -1; it.fresh = 1; Sound.click();
      cfg.onPlace && cfg.onPlace(it, b); cfg.onChange && cfg.onChange();
      return true;
    };
    C.unplace = function (it) { it.loc = null; it.wrong = false; cfg.onChange && cfg.onChange(); };
    C.hit = function (p) {
      // 위에 그려지는 순서의 반대로 찾기
      const order = C.items.slice().sort((a, b) => (a.lift + (a.idx === C.sel ? 1 : 0)) - (b.lift + (b.idx === C.sel ? 1 : 0)));
      for (let i = order.length - 1; i >= 0; i--) { const it = order[i]; if (it.x < -500) continue; if (p.x >= it.x && p.x <= it.x + it.w && p.y >= it.y && p.y <= it.y + it.h) return it; }
      return null;
    };
    C.down = function (p) {
      const it = C.hit(p);
      if (!it) {
        const b = C.binAt(p);
        if (b >= 0 && C.sel >= 0) { C.place(C.items[C.sel], b); }
        else if (b < 0) C.sel = -1;
        return false;
      }
      C.drag = { it, sx: p.x, sy: p.y, ox: p.x - it.x, oy: p.y - it.y, moved: false };
      return true;
    };
    C.move = function (p) {
      const d = C.drag; if (!d) return;
      if (!d.moved && Math.hypot(p.x - d.sx, p.y - d.sy) > 9 && d.it.open) { d.moved = true; C.sel = d.it.idx; }
      if (d.moved) { d.it.x = p.x - d.ox; d.it.y = p.y - d.oy; C.hoverBin = C.binAt(p); }
    };
    C.up = function (p) {
      const d = C.drag; C.drag = null; C.hoverBin = -1; if (!d) return;
      const it = d.it;
      if (d.moved) {
        const b = C.binAt(p);
        if (b >= 0) C.place(it, b); else C.sel = -1;
        return;
      }
      if (!it.open) { cfg.onOpen && cfg.onOpen(it); return; }
      if (it.loc != null) { C.unplace(it); C.sel = it.idx; Sound.click(); return; }
      C.sel = C.sel === it.idx ? -1 : it.idx; Sound.click();
    };
    C.isRight = function (it) { return it.loc != null && (it.oks ? it.oks.indexOf(it.loc) >= 0 : it.loc === it.bin); };
    C.counts = function () { return { placed: C.items.filter((i) => i.loc != null).length, right: C.items.filter((i) => C.isRight(i)).length }; };
    C.draw = function (dt, o) {
      o = o || {};
      const L = LT(), tg = C.targets();
      // 상자
      cfg.bins.forEach((bn, b) => {
        const r = L.bins[b], hot = C.hoverBin === b || (C.sel >= 0 && !C.drag);
        D.shadow(() => { ctx.fillStyle = 'rgba(255,255,255,.96)'; rr(r.x, r.y, r.w, r.h, 14).fill(); }, { blur: 6, y: 2 });
        ctx.fillStyle = rgba(bn.color, hot ? 0.2 : 0.1); rr(r.x, r.y, r.w, r.h, 14).fill();
        ctx.strokeStyle = bn.color; ctx.lineWidth = C.hoverBin === b ? 4 : 2; if (!(C.hoverBin === b)) ctx.setLineDash(hot ? [7, 5] : []); rr(r.x, r.y, r.w, r.h, 14).stroke(); ctx.setLineDash([]);
        T(r.x + r.w / 2, r.y + 22 * FS, bn.label, 15, shade(bn.color, -0.35), 'center', 800);
        if (bn.sub) T(r.x + r.w / 2, r.y + 40 * FS, bn.sub, 12.5, '#5a6679', 'center', 700);
      });
      // 빈 칸 표시
      C.items.forEach((it, i) => { const s = gridSlot(L, i); ctx.strokeStyle = 'rgba(100,116,139,.35)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.5; rr(s.x, s.y, s.w, s.h, 10).stroke(); ctx.setLineDash([]); });
      // 카드
      const order = C.items.slice().sort((a, b) => (a.lift + (a.idx === C.sel ? 1 : 0)) - (b.lift + (b.idx === C.sel ? 1 : 0)));
      order.forEach((it) => {
        const t = tg.get(it) || { x: it.x, y: it.y, w: it.w, h: it.h };
        const dragging = C.drag && C.drag.it === it && C.drag.moved;
        if (it.x < -500) { it.x = t.x; it.y = t.y; it.w = t.w; it.h = t.h; }
        if (!dragging) { it.x = approach(it.x, t.x, dt, 14); it.y = approach(it.y, t.y, dt, 14); it.w = approach(it.w, t.w, dt, 14); it.h = approach(it.h, t.h, dt, 14); }
        it.lift = approach(it.lift, dragging ? 1 : 0, dt, 18); it.fresh = Math.max(0, it.fresh - dt * 2.4);
        it.flip = approach(it.flip, it.open ? 1 : 0, dt, 9);
        drawItem(it, it.idx === C.sel, dragging, o);
      });
      // 자세히 상자
      const dt_ = L.detail;
      if (dt_) {
        panel(dt_.x, dt_.y, dt_.w, dt_.h, { r: 12, line: '#cbd5e1', lw: 1.5 });
        const it = C.sel >= 0 ? C.items[C.sel] : null;
        if (!it) drawWrap(dt_.x + 14, dt_.y + 24 * FS, cfg.placeholder || '카드를 눌러 보세요.', dt_.w - 28, 13.5, { color: '#64748b' });
        else {
          const dd = cfg.detailFn(it);
          T(dt_.x + 14, dt_.y + 22 * FS, dd.title, 14.5, '#1e293b', 'left', 800);
          drawWrap(dt_.x + 14, dt_.y + 22 * FS + 22 * FS, dd.body, dt_.w - 28, 13.5, { color: dd.color || '#334155' });
        }
      }
    };
    function drawItem(it, selected, dragging, o) {
      const w = it.w, h = it.h, chip = it.loc != null, x = it.x, y = it.y;
      const bn = chip ? cfg.bins[it.loc] : null;
      const sc = 1 + 0.04 * it.lift + (selected ? 0.02 : 0), cx = x + w / 2, cy = y + h / 2;
      ctx.save(); ctx.translate(cx, cy); const fx = Math.max(0.05, Math.abs(2 * it.flip - 1)), faceOpen = it.flip > 0.5; ctx.scale(sc * (chip ? 1 : fx), sc); ctx.translate(-cx, -cy);
      D.shadow(() => {
        ctx.fillStyle = chip ? mixc('#ffffff', bn.color, 0.18) : (faceOpen ? '#ffffff' : (it.mine ? '#3b5bdb' : '#475569'));
        rr(x, y, w, h, chip ? 9 : 11).fill();
      }, { blur: 4 + it.lift * 10, y: 2 + it.lift * 6, color: 'rgba(15,23,42,.28)' });
      ctx.lineWidth = selected ? 3.5 : 1.8;
      ctx.strokeStyle = it.wrong ? '#e2464b' : selected ? '#f59e0b' : chip ? bn.color : (faceOpen ? '#cbd5e1' : (it.mine ? '#93c5fd' : '#64748b'));
      rr(x, y, w, h, chip ? 9 : 11).stroke();
      if (it.fresh > 0) { ctx.strokeStyle = rgba('#14a058', it.fresh); ctx.lineWidth = 4; rr(x - 3, y - 3, w + 6, h + 6, 12).stroke(); }
      if (!chip && !faceOpen) {
        T(x + w / 2, y + h * 0.5 - 2, it.closedLabel || '?', 14, '#fff', 'center', 800);
        T(x + w / 2, y + h * 0.5 + 16 * FS, it.mine ? '눌러서 열기' : '다른 모둠', 12.5, 'rgba(255,255,255,.85)', 'center', 700);
        if (it.mine) { ctx.strokeStyle = rgba('#fde68a', 0.6 + 0.4 * Math.sin(SciSim.time() * 4)); ctx.lineWidth = 3; rr(x - 2, y - 2, w + 4, h + 4, 12).stroke(); }
      } else if (chip) {
        ctx.save(); rr(x, y, w, h, 9); ctx.clip();
        T(x + w / 2, y + h / 2 + 5 * Math.min(1.25, FS), it.chip || it.label, h < 30 ? 13 : 14, '#1e293b', 'center', 800);
        ctx.restore();
      } else {
        if (it.thumb) {
          ctx.save(); rr(x, y, w, h, 11); ctx.clip(); it.thumb(x + 6, y + 6, w - 12, h - 34 * Math.min(FS, 1.15)); ctx.restore();
          T(x + w / 2, y + h - 10, it.label, PHONE ? 11.5 : 12.5, '#1e293b', 'center', 800);
        } else {
        if (it.icon) T(x + 8, y + h * 0.5 + 8, it.icon, 22, '#000', 'left', 700);
        const tx = x + (it.icon ? 40 : 10);
        ctx.save(); rr(x, y, w, h, 11); ctx.clip();
        T(tx, it.sub ? y + h * 0.4 : y + h * 0.5 + 5 * FS, it.label, 14, '#1e293b', 'left', 800);
        if (it.sub) T(tx, y + h * 0.4 + 16 * FS, it.sub, 12.5, '#64748b', 'left', 700);
        ctx.restore();
        }
      }
      ctx.restore();
    }
    return C;
  }

  initStage('#e8eef8', 800, 620, 480, 860, 1.25);
  if (PHONE) view.canvas.style.touchAction = 'pan-y';

  /* ================= 광도 곡선 자료 ================= */
  const sm01 = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
  const fr1 = (x) => ((x % 1) + 1) % 1;
  const saw = (P, rise, off) => (t) => { const ph = fr1((t + (off || 0)) / P); return ph < rise ? sm01(ph / rise) : 1 - sm01((ph - rise) / (1 - rise)); };   // 1 = 가장 밝음
  const dcepB = saw(5.366, 0.2), rrB = saw(0.567, 0.15);
  const MIRA_T = [-158, 172, 494, 846, 1175], MIRA_MX = [3.0, 3.4, 2.4, 3.2, 2.0], MIRA_MN = [9.5, 10.1, 9.2, 9.9];
  function miraMag(t) {
    let k = 0; while (k < MIRA_T.length - 2 && t >= MIRA_T[k + 1]) k++;
    const a = MIRA_T[k], b = MIRA_T[k + 1], d = b - a, tm = a + 0.56 * d, u = t - a;
    return t < tm ? lerp(MIRA_MX[k], MIRA_MN[k], sm01((t - a) / (tm - a))) : lerp(MIRA_MN[k], MIRA_MX[k + 1], sm01((t - tm) / (b - tm)));
  }
  const SSB = [12, 60, 109, 160];
  function sscygMag(t) {
    for (let i = 0; i < SSB.length; i++) {
      const u = t - SSB[i];
      if (u >= 0 && u < 1.5) return 12 - 3.5 * sm01(u / 1.5);
      if (u >= 1.5 && u < 9) return 8.5 + 0.7 * (u - 1.5) / 7.5;
      if (u >= 9 && u < 12) return 9.2 + 2.8 * sm01((u - 9) / 3);
    }
    return 12;
  }
  const bump = (x) => Math.pow(Math.max(0, 1 - (x / 0.075) * (x / 0.075)), 1.5);
  const phd = (a, c) => { const d = Math.abs(fr1(a) - c); return Math.min(d, 1 - d); };
  const CURVES = {
    dcep: { id: 'dcep', name: 'δ Cep', full: '세페우스자리 델타', kind: 0, t0: 0, t1: 20, mB: 3.4, mD: 4.5, P: 5.366, lo: 3.5, hi: 4.4, mag: (t) => 4.4 - 0.9 * dcepB(t), col: '#fde68a', unit: '일', note: '상승이 빠르고 하강이 느린 비대칭 톱니 모양' },
    rrlyr: { id: 'rrlyr', name: 'RR Lyr', full: '거문고자리 RR', kind: 0, t0: 0, t1: 3, mB: 7.0, mD: 8.2, P: 0.567, lo: 7.1, hi: 8.1, mag: (t) => 8.1 - 1.0 * rrB(t), col: '#fef3c7', unit: '일', note: '주기 0.567일(약 13.6시간)로 아주 빠르게 반복' },
    mira: { id: 'mira', name: '미라', full: '고래자리 미라(o Cet)', kind: 0, t0: 0, t1: 1000, mB: 1.8, mD: 10.3, P: 332, lo: 2.0, hi: 10.1, mag: miraMag, col: '#fca5a5', unit: '일', note: '진폭이 매우 크고 주기·최대 밝기가 매번 조금씩 달라요' },
    v1500: { id: 'v1500', name: 'V1500 Cyg', full: '1975년 백조자리 신성', kind: 1, t0: 0, t1: 200, mB: 1.5, mD: 14.6, mag: (t) => (t < 10 ? 14 : t < 13 ? 14 - 12 * sm01((t - 10) / 3) : 2 + 5.5 * (1 - Math.exp(-(t - 13) / 45))), col: '#fdba74', unit: '일', note: '며칠 만에 약 12등급 밝아졌다가 몇 달에 걸쳐 어두워져요(단순화한 곡선)' },
    sscyg: { id: 'sscyg', name: 'SS Cyg', full: '백조자리 SS(왜소 신성)', kind: 1, t0: 0, t1: 200, mB: 8.0, mD: 12.6, mag: sscygMag, col: '#a5f3fc', unit: '일', note: '약 50일마다 12 → 8.5등급 폭발이 되풀이돼요' },
    sn87a: { id: 'sn87a', name: 'SN 1987A', full: '대마젤란 은하의 초신성', kind: 1, t0: 0, t1: 250, mB: 2.0, mD: 7.2, d: 5.1e4, dTxt: '51 kpc', m: 2.9, tp: 85, mag: (t) => (t < 2 ? 6.0 + 0.35 * t : t < 85 ? 6.7 - 3.8 * sm01((t - 2) / 83) : 2.9 + 0.0121 * (t - 85)), col: '#c4b5fd', unit: '일', note: '약 3개월(85일)에 최대 약 2.9등급, 맨눈으로 보였어요(단순화한 곡선)' },
    sn11fe: { id: 'sn11fe', name: 'SN 2011fe', full: 'M101 은하의 초신성', kind: 1, t0: 0, t1: 60, mB: 8.6, mD: 18.2, d: 6.4e6, dTxt: '6.4 Mpc', m: 9.9, tp: 17, mag: (t) => (t < 0.3 ? 18.2 : t < 17 ? Math.min(18.2, 9.9 - 5 * Math.log10(t / 17)) : t < 32 ? 9.9 + 0.0667 * (t - 17) : 10.9 + 0.045 * (t - 32)), col: '#93c5fd', unit: '일', note: '약 17일 동안 밝아져 최대 9.9등급, 이후 서서히 어두워져요' },
    algol: { id: 'algol', name: 'Algol', full: '페르세우스자리 알골', kind: 2, t0: 0, t1: 10, mB: 2.0, mD: 3.6, P: 2.867, mag: (t) => 2.12 + 1.28 * bump(phd((t - 1) / 2.867, 0)) + 0.1 * bump(phd((t - 1) / 2.867, 0.5)), col: '#d8b4fe', unit: '일', note: '평평하다가 규칙적으로 깊게 한 번, 얕게 한 번 어두워져요' },
  };
  const KIND = [{ n: '맥동 변광성', sub: '별이 규칙적으로 부풀었다 줄어요', c: '#d97706' }, { n: '폭발 변광성', sub: '갑자기 밝아진 뒤 어두워져요', c: '#dc2626' }, { n: '식변광성 (참고)', sub: '별이 서로를 가려서 어두워져요', c: '#7c3aed' }];
  const ORDER = ['dcep', 'rrlyr', 'mira', 'v1500', 'sscyg', 'sn87a', 'sn11fe', 'algol'];
  const CLS_ORDER = ['algol', 'v1500', 'dcep', 'sn11fe', 'mira', 'sscyg', 'rrlyr', 'sn87a'];
  const brightOf = (c, t) => clamp((c.mD - c.mag(t)) / (c.mD - c.mB), 0, 1);
  const SNd = { rest: 635.5, obs: 614.5 };
  SNd.f = (SNd.obs - SNd.rest) / SNd.rest; SNd.v = Math.abs(SNd.f) * 299792.458; SNd.perDay = SNd.v * 86400;
  const snAbs = (c) => c.m + 5 - 5 * Math.log10(c.d), snL = (c) => Math.pow(10, 0.4 * (4.83 - snAbs(c)));
  const SNE = 3.828e26, SN_DAYS30 = 2.592e6;
  const FACTS = [
    { t: '최대일 때 은하 하나에 견줄 만큼(약 40억 L☉) 밝아요', ok: true },
    { t: '스펙트럼선이 초속 약 1만 km로 바깥층이 퍼져 나감을 알려 줘요', ok: true },
    { t: '초신성마다 최대 광도가 달라요 (SN 1987A는 2011fe보다 약 25배 어두워요)', ok: true },
    { t: '최대 광도가 거의 같은 부류는 먼 은하까지의 거리를 재는 데 쓰여요', ok: true },
    { t: '같은 별에서 약 50일마다 되풀이돼요', ok: false },
    { t: '별이 규칙적으로 부풀었다 줄어드는 현상이에요', ok: false },
  ];

  /* ================= 상태 ================= */
  const S = {
    view: 'curves', fade: 0, clock: 0,
    cu: { sel: 0, tool: 0, tm: [0.28, 0.68], mm: [0.3, 0.7], sweep: 0, hold: 0, perOk: false, ampOk: false, drag: -1 },
    cl: { crit: [false, false, false, false], ok: false },
    pe: { sc: 1, ord: [], ordOk: false, rrOk: false },
    sn: { sel: 0, mOk: false, lOk: false, facts: Array(6).fill(false), picked: false },
    flags: { calcPer: false, calcAmp: false, crit: false, ord: false, calcRR: false, calcSN: false, calcSNL: false, fact: false },
  };
  let game = null;
  const FREE = () => !!(game && game.free);
  const CU = S.cu, CL = S.cl, PE = S.pe, SN = S.sn;
  const VIEW_LABEL = { curves: '📈 광도 곡선 (세로축: 겉보기 등급)', classify: '🗂 변광성 분류하기', periods: '⏱ 같은 시간 눈금으로 비교', sn: '💥 초신성의 광도와 속도' };
  const modeBtns = $$('#modeSeg button');
  function chkIn(id, ok) { const e = $('#' + id); if (!e) return; if (ok) fbIn(id, true); else e.classList.remove('ok', 'bad'); }
  const numM = (id) => { const e = $('#' + id); if (!e) return null; const v = e.value.trim().replace('−', '-').replace(/[−–]/g, '-').replace(/,(?=\d{3}(?!\d))/g, '').replace(',', '.'); return v === '' || !isFinite(+v) ? null : +v; };
  const ptsBurst = (x, y) => parts.burst(x, y, { count: 14, speed: 140, life: 0.7, size: 4, gravity: 200 });
  function darkBox(r, t) {
    D.shadow(() => { ctx.fillStyle = '#0b1230'; rr(r.x, r.y, r.w, r.h, 14).fill(); }, { blur: 6, y: 2 });
    ctx.save(); rr(r.x, r.y, r.w, r.h, 14); ctx.clip(); spaceBg(r.x, r.y, r.w, r.h, t, '#0b1230', '#16224a');
  }
  const lbl = (x, y, s_, size, color, align) => T(x, y, s_, size, color, align || 'left', 800, { stroke: 'rgba(255,255,255,.92)', strokeWidth: 4 });
  function niceTicks(a, b, n) {
    const span = b - a, raw = span / n, mag = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / mag, st = (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * mag, out = [];
    for (let v = Math.ceil(a / st - 1e-9) * st; v <= b + 1e-9; v += st) out.push(+v.toFixed(6));
    return out;
  }
  const fTick = (v) => (Math.abs(v - Math.round(v)) < 1e-6 ? String(Math.round(v)) : String(+v.toFixed(2)));

  /* ---------- 곡선 그리기 (등급이 클수록 위쪽 = 더 어두움) ---------- */
  function cGeom(c, R, o) {
    const ix = R.x + o.l, iw = R.w - o.l - o.r, top = R.y + o.t, ph = R.h - o.t - o.b, t0 = o.t0 != null ? o.t0 : c.t0, t1 = o.t1 != null ? o.t1 : c.t1;
    return { ix, iw, top, ph, t0, t1, X: (t) => ix + (t - t0) / (t1 - t0) * iw, Y: (m) => top + ph * (1 - (m - c.mB) / (c.mD - c.mB)), tOf: (x) => t0 + (x - ix) / iw * (t1 - t0), mOf: (y) => c.mB + (1 - (y - top) / ph) * (c.mD - c.mB) };
  }
  function curvePts(c, g, n) { const pts = []; for (let i = 0; i <= n; i++) { const t = g.t0 + (g.t1 - g.t0) * i / n; pts.push([g.X(t), g.Y(clamp(c.mag(t), c.mB, c.mD))]); } return pts; }
  function drawAxes(c, g, o) {
    o = o || {};
    ctx.fillStyle = 'rgba(100,116,139,.06)'; rr(g.ix, g.top, g.iw, g.ph, 6).fill();
    // 밝기 띠: 위 = 어두움, 아래 = 밝음
    const gr = ctx.createLinearGradient(0, g.top, 0, g.top + g.ph); gr.addColorStop(0, '#334155'); gr.addColorStop(1, '#fde68a'); ctx.fillStyle = gr; rr(g.ix - 12, g.top, 7, g.ph, 3).fill();
    niceTicks(c.mB, c.mD, 5).forEach((v) => { const y = g.Y(v); ctx.strokeStyle = 'rgba(148,163,184,.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(g.ix, y); ctx.lineTo(g.ix + g.iw, y); ctx.stroke(); T(g.ix - 18, y + 4, fTick(v), 11.5, '#64748b', 'right', 700); });
    niceTicks(g.t0, g.t1, PHONE ? 4 : 6).forEach((v) => { const x = g.X(v); ctx.strokeStyle = 'rgba(148,163,184,.35)'; ctx.beginPath(); ctx.moveTo(x, g.top); ctx.lineTo(x, g.top + g.ph); ctx.stroke(); if (!o.noTime) T(x, g.top + g.ph + 15 * FS, fTick(v), 11.5, '#64748b', 'center', 700); });
    if (!o.noTitle) {
      T(g.ix + g.iw / 2, g.top + g.ph + 32 * FS, '시간 (' + c.unit + ')', 12, '#475569', 'center', 800);
      ctx.save(); ctx.translate(g.ix - (PHONE ? 60 : 50), g.top + g.ph / 2); ctx.rotate(-Math.PI / 2); T(0, 0, g.ph < 170 ? '등급' : '겉보기 등급 (클수록 어두움)', 11.5, '#475569', 'center', 800); ctx.restore();
      T(g.ix - 8, g.top - 12, '어두움 ↑', 11, '#334155', 'right', 800); T(g.ix - 8, g.top + g.ph + 14, '밝음 ↓', 11, '#b45309', 'right', 800);
    }
  }

  /* ---------- 별 그림 ---------- */
  function drawStar(c, R, t, tc, dark) {
    const b = brightOf(c, tc), cx = R.x + R.w / 2, cy = R.y + R.h / 2;
    if (c.id === 'dcep' || c.id === 'rrlyr' || c.id === 'mira') {
      const base = c.id === 'mira' ? 30 : 24, rr0 = base * (1 + (c.id === 'mira' ? 0.45 : 0.12) * (b - 0.5)), col = c.id === 'mira' ? mixc('#fb923c', '#fecaca', b * 0.5) : mixc('#fde68a', '#fffbeb', b);
      D.glow(cx, cy, rr0 * (1.6 + 2.4 * b), col, 0.25 + 0.55 * b); D.sphere(cx, cy, rr0, col, { gloss: false, light: '#ffffff', dark: mixc(col, '#92400e', 0.35) });
      ctx.strokeStyle = 'rgba(148,163,184,.4)'; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.arc(cx, cy, base * 1.18, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      outlineT(cx, R.y + R.h - 14, b > 0.5 ? '크고 밝은 때' : '작고 어두운 때', 11.5, '#e2e8f0', 'center');
    } else if (c.id === 'algol') {
      const th = TAU * fr1((tc - 1) / 2.867), x1 = -26 * Math.sin(th), x2 = 40 * Math.sin(th), z1 = -Math.cos(th), z2 = Math.cos(th);
      const items = [{ z: z1, f: () => { D.glow(cx + x1, cy, 40, '#bfdbfe', 0.5); D.sphere(cx + x1, cy, 14, '#dbeafe', { gloss: false, light: '#ffffff', dark: '#93c5fd' }); } }, { z: z2, f: () => D.sphere(cx + x2, cy, 22, '#c2410c', { gloss: false, light: '#fb923c', dark: '#7c2d12' }) }];
      items.sort((p, q) => p.z - q.z).forEach((i) => i.f());
      outlineT(cx, R.y + R.h - 14, '두 별이 서로를 가려요', 11.5, '#e2e8f0', 'center');
    } else if (c.id === 'sn87a' || c.id === 'sn11fe') {
      // 은하와 초신성
      ctx.save(); ctx.translate(cx, cy + 6); ctx.rotate(-0.5);
      const g = ctx.createRadialGradient(0, 0, 2, 0, 0, c.id === 'sn11fe' ? 62 : 54); g.addColorStop(0, 'rgba(254,243,199,.95)'); g.addColorStop(0.35, 'rgba(147,197,253,.45)'); g.addColorStop(1, 'rgba(147,197,253,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, c.id === 'sn11fe' ? 62 : 54, c.id === 'sn11fe' ? 62 : 30, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(191,219,254,.35)'; ctx.lineWidth = 3; [0, Math.PI].forEach((s0) => { ctx.beginPath(); for (let i = 0; i <= 30; i++) { const a = s0 + i * 0.16, r = 6 + i * 1.7; const x = r * Math.cos(a), y = r * Math.sin(a) * (c.id === 'sn11fe' ? 1 : 0.55); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); });
      ctx.restore();
      const sx = cx + 30, sy = cy - 22, e = 0.15 + 0.85 * b;
      D.glow(sx, sy, 10 + 40 * e, '#ffffff', 0.35 + 0.6 * e); D.sphere(sx, sy, 2 + 5 * e, '#ffffff', { gloss: false });
      if (e > 0.7) { ctx.strokeStyle = 'rgba(255,255,255,' + (0.5 * e).toFixed(2) + ')'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(sx - 26 * e, sy); ctx.lineTo(sx + 26 * e, sy); ctx.moveTo(sx, sy - 26 * e); ctx.lineTo(sx, sy + 26 * e); ctx.stroke(); }
      outlineT(cx, R.y + R.h - 14, c.id === 'sn11fe' ? 'M101 은하 (6.4 Mpc)' : '대마젤란 은하 (51 kpc)', 11.5, '#e2e8f0', 'center');
    } else {
      // 신성 · 왜소 신성
      const sy = cy - 4, e = b;
      if (c.id === 'v1500') {
        const tt = clamp(tc - 13, 0, 200);
        if (tc > 13) { ctx.strokeStyle = 'rgba(253,186,116,' + clamp(0.8 - tt / 120, 0.1, 0.8).toFixed(2) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, sy, 14 + tt * 0.28, 0, TAU); ctx.stroke(); }
      } else { ctx.strokeStyle = 'rgba(103,232,249,' + (0.25 + 0.5 * e).toFixed(2) + ')'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(cx, sy, 40, 11, 0, 0, TAU); ctx.stroke(); }
      D.glow(cx, sy, 14 + 56 * e, '#ffedd5', 0.3 + 0.6 * e); D.sphere(cx, sy, 5 + 6 * e, '#fff7ed', { gloss: false, light: '#ffffff', dark: '#fdba74' });
      outlineT(cx, R.y + R.h - 14, e > 0.5 ? '폭발: 아주 밝아요!' : '평소에는 어두워요', 11.5, '#e2e8f0', 'center');
    }
  }

  /* =========================================================
     ① 광도 곡선
     ========================================================= */
  function LCu() {
    return PHONE ? { P: { x: 8, y: 8, w: 464, h: 320 }, St: { x: 8, y: 336, w: 464, h: 124 }, Th: { x: 8, y: 468, w: 464, h: 384 } }
      : { P: { x: 208, y: 8, w: 582, h: 336 }, St: { x: 10, y: 8, w: 190, h: 336 }, Th: { x: 10, y: 352, w: 780, h: 260 } };
  }
  const PO = () => ({ l: PHONE ? 76 : 66, r: 16, t: 48 * FS, b: 46 * FS });
  const thumbRect = (i) => {
    const { Th } = LCu();
    if (PHONE) { const cw = (Th.w - 8) / 2, ch = 90; return { x: Th.x + (i % 2) * (cw + 8), y: Th.y + Math.floor(i / 2) * (ch + 6), w: cw, h: ch }; }
    const cw = (Th.w - 24) / 4, ch = 124; return { x: Th.x + (i % 4) * (cw + 8), y: Th.y + Math.floor(i / 4) * (ch + 8), w: cw, h: ch };
  };
  function drawThumb(c, x, y, w, h, selected, o) {
    ctx.fillStyle = '#f8fafc'; rr(x, y, w, h, 8).fill();
    const g = cGeom(c, { x, y, w, h }, { l: 6, r: 6, t: 6, b: 6 }), pts = curvePts(c, g, Math.max(30, Math.round(g.iw)));
    line(pts, c.kind === 0 ? '#d97706' : c.kind === 1 ? '#dc2626' : '#7c3aed', 2.2);
  }
  function drawCurves(dt, t) {
    const { P, St, Th } = LCu(), c = CURVES[ORDER[CU.sel]];
    // 시간 흐름
    if (CU.hold > 0) { CU.hold -= dt; if (CU.hold <= 0) CU.sweep = 0; } else { CU.sweep += dt / (RM ? 1e9 : 9); if (CU.sweep >= 1) { CU.sweep = 1; CU.hold = 0.8; } }
    const tc = c.t0 + (c.t1 - c.t0) * CU.sweep;
    // ---- 별 그림
    darkBox(St, t);
    if (PHONE) drawStar(c, { x: St.x + St.w * 0.5, y: St.y, w: St.w * 0.5, h: St.h }, t, tc); else drawStar(c, St, t, tc);
    ctx.restore();
    outlineT(St.x + 12, St.y + 24 * FS, c.name, 14.5, '#fef9c3', 'left');
    outlineT(St.x + 12, St.y + 44 * FS, '지금 ' + (c.t1 > 100 ? f0(tc) : f1(tc)) + c.unit, 12, '#cbd5e1', 'left');
    if (PHONE) drawWrap(St.x + 12, St.y + 68 * FS, c.note, St.w * 0.46, 11.5, { color: '#cbd5e1', weight: 700 });
    else { const nl = wrapLines(c.note, St.w - 24, 11.5, 700).length; drawWrap(St.x + 12, St.y + St.h - 40 * FS - (nl - 1) * 11.5 * FS * 1.3, c.note, St.w - 24, 11.5, { color: '#cbd5e1', weight: 700 }); }
    // ---- 곡선
    panel(P.x, P.y, P.w, P.h, { r: 14 });
    T(P.x + 14, P.y + 24 * FS, '📈 ' + c.name + ' (' + c.full + ')', PHONE ? 13 : 14.5, '#1e293b', 'left', 800);
    const g = cGeom(c, P, PO());
    drawAxes(c, g);
    line(curvePts(c, g, Math.round(g.iw)), c.kind === 0 ? '#d97706' : c.kind === 1 ? '#dc2626' : '#7c3aed', 3);
    // 지나온 부분 강조 + 현재 점
    const tcl = clamp(tc, g.t0, g.t1), mnow = clamp(c.mag(tcl), c.mB, c.mD);
    ctx.strokeStyle = 'rgba(245,158,11,.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(g.X(tcl), g.top); ctx.lineTo(g.X(tcl), g.top + g.ph); ctx.stroke();
    D.glow(g.X(tcl), g.Y(mnow), 16, '#f59e0b', 0.6); D.sphere(g.X(tcl), g.Y(mnow), 5.5, '#f59e0b', { gloss: false, outline: '#fff', outlineWidth: 1.5 });
    // 재는 선
    if (CU.tool === 0) {
      CU.tm.forEach((f, i) => { const x = g.ix + f * g.iw; ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 2.6; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(x, g.top); ctx.lineTo(x, g.top + g.ph); ctx.stroke(); ctx.setLineDash([]); D.sphere(x, g.top + 8, 6, '#2563eb', { gloss: false, outline: '#fff' }); });
      const dtv = Math.abs(CU.tm[1] - CU.tm[0]) * (g.t1 - g.t0), xm = g.ix + (CU.tm[0] + CU.tm[1]) / 2 * g.iw;
      D.label(clamp(xm, g.ix + 70, g.ix + g.iw - 70), g.top + g.ph - 16, 'Δt = ' + (dtv >= 100 ? f0(dtv) : f2(dtv)) + ' ' + c.unit, { bg: '#1d4ed8', size: PHONE ? 12.5 : 13.5 });
    } else {
      CU.mm.forEach((f) => { const y = g.top + f * g.ph; ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 2.6; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(g.ix, y); ctx.lineTo(g.ix + g.iw, y); ctx.stroke(); ctx.setLineDash([]); D.sphere(g.ix + g.iw - 8, y, 6, '#7c3aed', { gloss: false, outline: '#fff' }); });
      const m1 = g.mOf(g.top + CU.mm[0] * g.ph), m2 = g.mOf(g.top + CU.mm[1] * g.ph);
      D.label(g.ix + g.iw / 2, g.top + (CU.mm[0] + CU.mm[1]) / 2 * g.ph, 'Δ등급 = ' + f2(Math.abs(m1 - m2)), { bg: '#6d28d9', size: PHONE ? 12.5 : 13.5 });
    }
    // ---- 곡선 카드
    ORDER.forEach((id, i) => {
      const r = thumbRect(i), cc = CURVES[id], sel = CU.sel === i;
      D.shadow(() => { ctx.fillStyle = '#fff'; rr(r.x, r.y, r.w, r.h, 12).fill(); }, { blur: 4, y: 2, color: 'rgba(20,40,80,.14)' });
      ctx.strokeStyle = sel ? '#f59e0b' : '#e2e8f0'; ctx.lineWidth = sel ? 3.5 : 1.5; rr(r.x, r.y, r.w, r.h, 12).stroke();
      drawThumb(cc, r.x + 6, r.y + 6, r.w - 12, r.h - 34 * Math.min(FS, 1.15));
      T(r.x + r.w / 2, r.y + r.h - 10, cc.name, PHONE ? 12 : 13, '#1e293b', 'center', 800);
    });
  }
  function cuDown(p) {
    for (let i = 0; i < 8; i++) { const r = thumbRect(i); if (inR(p, r)) { if (CU.sel !== i) { CU.sel = i; CU.sweep = 0; CU.hold = 0; CU.tm = [0.28, 0.68]; CU.mm = [0.3, 0.7]; Sound.click(); updateCtl(); } return false; } }
    const c = CURVES[ORDER[CU.sel]], g = cGeom(c, LCu().P, PO());
    if (p.x >= g.ix - 6 && p.x <= g.ix + g.iw + 6 && p.y >= g.top - 6 && p.y <= g.top + g.ph + 6) {
      if (CU.tool === 0) { const f = clamp((p.x - g.ix) / g.iw, 0, 1); CU.drag = Math.abs(CU.tm[0] - f) <= Math.abs(CU.tm[1] - f) ? 0 : 1; CU.tm[CU.drag] = f; }
      else { const f = clamp((p.y - g.top) / g.ph, 0, 1); CU.drag = Math.abs(CU.mm[0] - f) <= Math.abs(CU.mm[1] - f) ? 0 : 1; CU.mm[CU.drag] = f; }
      return true;
    }
    return false;
  }
  function cuMove(p) {
    const c = CURVES[ORDER[CU.sel]], g = cGeom(c, LCu().P, PO());
    if (CU.drag < 0) return;
    if (CU.tool === 0) CU.tm[CU.drag] = clamp((p.x - g.ix) / g.iw, 0, 1); else CU.mm[CU.drag] = clamp((p.y - g.top) / g.ph, 0, 1);
  }

  /* =========================================================
     ② 분류하기
     ========================================================= */
  function LCl() {
    return PHONE ? { grid: { x: 8, y: 8, w: 464, h: 408, cols: 2, cardH: 96, gap: 6 }, detail: null, bins: [{ x: 8, y: 424, w: 150, h: 428 }, { x: 165, y: 424, w: 150, h: 428 }, { x: 322, y: 424, w: 150, h: 428 }] }
      : { grid: { x: 10, y: 8, w: 780, h: 250, cols: 4, cardH: 118, gap: 8 }, detail: null, bins: [{ x: 10, y: 268, w: 252, h: 344 }, { x: 274, y: 268, w: 252, h: 344 }, { x: 538, y: 268, w: 252, h: 344 }] };
  }
  const cCl = makeClassifier({
    items: CLS_ORDER.map((id) => { const c = CURVES[id]; return { label: c.name, chip: c.name, bin: c.kind, thumb: (x, y, w, h) => { ctx.fillStyle = '#f8fafc'; rr(x, y, w, h, 7).fill(); const g = cGeom(c, { x, y, w, h }, { l: 5, r: 5, t: 5, b: 5 }); line(curvePts(c, g, Math.max(30, Math.round(g.iw))), '#475569', 2.2); } }; }),
    bins: KIND.map((k) => ({ label: k.n, sub: PHONE ? null : k.sub, color: k.c })),
    chipCols: 1, minRows: 4, layout: LCl, onChange() { updateCtl(); },
  });
  const clsRight = () => cCl.counts().right === 8;
  function drawClassify(dt, t) { cCl.draw(dt); }

  /* =========================================================
     ③ 주기 읽기
     ========================================================= */
  const PER = ['dcep', 'rrlyr', 'mira'];
  const SCALES = [2, 20, 1000];
  function LPe() { return PHONE ? { P: { x: 8, y: 8, w: 464, h: 844 } } : { P: { x: 10, y: 8, w: 780, h: 604 } }; }
  function drawPeriods(dt, t) {
    const { P } = LPe();
    panel(P.x, P.y, P.w, P.h, { r: 14 });
    const win = SCALES[PE.sc];
    T(P.x + 14, P.y + 24 * FS, '⏱ 세 맥동 변광성을 같은 시간 눈금(' + win + '일)으로', PHONE ? 13 : 14.5, '#1e293b', 'left', 800);
    const sh = PHONE ? 226 : 160, top0 = P.y + 42 * FS, l = PHONE ? 52 : 148;
    PER.forEach((id, i) => {
      const c = CURVES[id], y0 = top0 + i * (sh + (PHONE ? 6 : 10)), R = { x: P.x + 8, y: y0, w: P.w - 16, h: sh };
      ctx.fillStyle = '#f8fafc'; rr(R.x, R.y, R.w, R.h, 10).fill(); ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1.5; rr(R.x, R.y, R.w, R.h, 10).stroke();
      const g = cGeom(c, R, { l: l + 12, r: 14, t: PHONE ? 52 : 14, b: i === 2 ? (PHONE ? 46 : 34) : 14, t0: 0, t1: win });
      const ordIdx = PE.ord.indexOf(i === 0 ? 0 : i === 1 ? 1 : 2);
      // 이름 · 진폭 · (주기)
      const showP = PE.ordOk || FREE();
      if (PHONE) { T(R.x + 12, R.y + 24, c.name, 14, '#1e293b', 'left', 800); T(R.x + 12, R.y + 44, '진폭 ' + f1(c.hi - c.lo) + '등급' + (showP ? ' · 주기 ' + c.P + '일' : ''), 12, '#475569', 'left', 800); }
      else { T(R.x + 12, R.y + 34, c.name, 15, '#1e293b', 'left', 800); T(R.x + 12, R.y + 56, c.full, 11.5, '#64748b', 'left', 700); T(R.x + 12, R.y + 88, '진폭 ' + f1(c.hi - c.lo) + '등급', 13, '#475569', 'left', 800); T(R.x + 12, R.y + 110, showP ? '주기 ' + c.P + '일' : '주기 ?', 14, showP ? '#15803d' : '#94a3b8', 'left', 800); }
      drawAxes(c, g, { noTitle: true, noTime: i < 2 });
      ctx.save(); rr(g.ix, g.top, g.iw, g.ph, 6); ctx.clip();
      const cyc = win / c.P, dense = cyc / g.iw > 0.2;
      if (dense) {
        ctx.fillStyle = 'rgba(217,119,6,.35)'; ctx.fillRect(g.ix, g.Y(c.hi), g.iw, g.Y(c.lo) - g.Y(c.hi));
        ctx.strokeStyle = '#d97706'; ctx.lineWidth = 1.5; ctx.strokeRect(g.ix, g.Y(c.hi), g.iw, g.Y(c.lo) - g.Y(c.hi));
        lbl(g.ix + g.iw / 2, g.top + g.ph / 2 + 4, '너무 빨리 변해서 띠로 보여요 (' + f0(cyc) + '번 반복)', PHONE ? 11.5 : 12.5, '#92400e', 'center');
      } else line(curvePts(c, g, Math.round(g.iw * 1.5)), '#d97706', 2.6);
      ctx.restore();
      if (i === 2) T(g.ix + g.iw / 2, g.top + g.ph + 30 * FS, '시간 (일)', 12, '#475569', 'center', 800);
    });
    if (PE.ordOk || FREE()) drawWrap(P.x + 14, PHONE ? P.y + P.h - 84 : P.y + P.h - 22 * FS, '주기: RR Lyr 0.567일 < δ Cep 5.366일 < 미라 332일. 주기가 가장 긴 미라의 진폭(8.1등급)이 가장 크지만, RR Lyr(1.0)와 δ Cep(0.9)는 주기가 10배 가까이 달라도 진폭이 비슷해요.', P.w - 28, PHONE ? 11.5 : 12.5, { color: '#0369a1', weight: 800 });
  }

  /* =========================================================
     ④ 초신성
     ========================================================= */
  function LSn() {
    return PHONE ? { I: { x: 8, y: 8, w: 464, h: 128 }, C: { x: 8, y: 144, w: 464, h: 240 }, A: { x: 8, y: 392, w: 464, h: 216 }, V: { x: 8, y: 616, w: 464, h: 228 } }
      : { I: { x: 10, y: 8, w: 440, h: 190 }, C: { x: 10, y: 206, w: 440, h: 406 }, A: { x: 458, y: 8, w: 332, h: 300 }, V: { x: 458, y: 316, w: 332, h: 296 } };
  }
  function drawSn(dt, t) {
    const { I, C: Cc, A, V } = LSn(), c = CURVES[SN.sel === 0 ? 'sn11fe' : 'sn87a'], is11 = SN.sel === 0;
    if (CU.hold > 0) { CU.hold -= dt; if (CU.hold <= 0) CU.sweep = 0; } else { CU.sweep += dt / (RM ? 1e9 : 10); if (CU.sweep >= 1) { CU.sweep = 1; CU.hold = 1; } }
    const tc = c.t0 + (c.t1 - c.t0) * CU.sweep;
    darkBox(I, t); drawStar(c, I, t, tc); ctx.restore();
    outlineT(I.x + 12, I.y + 24 * FS, c.name + ' (' + c.full + ')', PHONE ? 12.5 : 13.5, '#fef9c3', 'left'); outlineT(I.x + 12, I.y + 44 * FS, '폭발 후 ' + f0(tc) + '일', 12, '#cbd5e1', 'left');
    // ---- 곡선
    panel(Cc.x, Cc.y, Cc.w, Cc.h, { r: 14 });
    T(Cc.x + 14, Cc.y + 24 * FS, '📈 ' + c.name + ' 광도 곡선', PHONE ? 13 : 14.5, '#1e293b', 'left', 800);
    const g = cGeom(c, Cc, PO());
    drawAxes(c, g); line(curvePts(c, g, Math.round(g.iw)), '#2563eb', 3);
    const px = g.X(c.tp), py = g.Y(c.m);
    ctx.strokeStyle = 'rgba(37,99,235,.5)'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, g.top + g.ph); ctx.moveTo(g.ix, py); ctx.lineTo(px, py); ctx.stroke(); ctx.setLineDash([]);
    D.sphere(px, py, 6, '#2563eb', { gloss: false, outline: '#fff', outlineWidth: 1.5 });
    D.label(clamp(px + 4, g.ix + 80, g.ix + g.iw - 80), py + 26, '최대 m = ' + f1(c.m) + ' (' + c.tp + '일째)', { bg: '#1d4ed8', size: PHONE ? 12 : 13 });
    if (is11) {
      const x2 = g.X(32), y1 = g.Y(9.9), y2 = g.Y(10.9);
      ctx.strokeStyle = '#b45309'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px, y1); ctx.lineTo(x2 + 10, y1); ctx.stroke(); ctx.setLineDash([]);
      D.arrow(x2 + 10, y1 + 2, x2 + 10, y2 - 2, { color: '#b45309', width: 2.5, head: 7 });
      lbl(x2 + 18, (y1 + y2) / 2 + 4, '1등급', PHONE ? 11.5 : 12.5, '#92400e', 'left');
      lbl(g.ix + g.iw - 8, g.top + 40, '최대 후 15일 동안 1등급 어두워져요', PHONE ? 11 : 12, '#92400e', 'right');
    }
    const tcl = clamp(tc, g.t0, g.t1); D.glow(g.X(tcl), g.Y(clamp(c.mag(tcl), c.mB, c.mD)), 14, '#f59e0b', 0.6); D.sphere(g.X(tcl), g.Y(clamp(c.mag(tcl), c.mB, c.mD)), 5, '#f59e0b', { gloss: false, outline: '#fff' });
    // ---- 거리 지수 · 광도
    const Mabs = snAbs(c), L = snL(c);
    const shownM = (is11 ? SN.mOk : true) || FREE(), shownL = (is11 ? SN.lOk : true) || FREE();
    panel(A.x, A.y, A.w, A.h, { r: 14 });
    T(A.x + 14, A.y + 24 * FS, '🧮 최대 밝기에서 광도까지', PHONE ? 13 : 14.5, '#1e293b', 'left', 800);
    const sz = PHONE ? 12 : 13;
    const rowsA = [['최대 겉보기 등급 m', f1(c.m), true], ['거리 d', c.dTxt, true], ['M = m + 5 − 5 log d', shownM ? sg(Mabs, 1) : '?', shownM], ['L = 10^(0.4 × (4.83 − M))', shownL ? (L >= 1e9 ? f1(L / 1e9) + '×10⁹ L☉' : f1(L / 1e8) + '×10⁸ L☉') : '?', shownL]];
    let yy = A.y + 52 * FS;
    rowsA.forEach((r) => { T(A.x + 14, yy, r[0], sz, '#475569', 'left', 800); T(A.x + A.w - 14, yy, r[1], sz + 2, r[2] ? (r[0][0] === 'M' || r[0][0] === 'L' ? '#15803d' : '#1e293b') : '#94a3b8', 'right', 800); yy += (PHONE ? 25 : 28) * FS; });
    if (is11 && shownL && PHONE) drawWrap(A.x + 14, yy + 2, '약 30일 동안 낸 빛 에너지 ≈ ' + sci(L * SNE * SN_DAYS30, 1) + ' J', A.w - 28, 11.5, { color: '#b45309', weight: 800 });
    else if (is11 && shownL) drawWrap(A.x + 14, yy + 2, '약 30일 동안 낸 빛 에너지 ≈ ' + sci(L * SNE * SN_DAYS30, 1) + ' J (태양이 약 ' + f1(L * SN_DAYS30 / 3.156e7 / 1e8) + '억 년 동안 내는 에너지)', A.w - 28, PHONE ? 11.5 : 12.5, { color: '#b45309', weight: 800 });
    else if (!is11) drawWrap(A.x + 14, yy + 2, PHONE ? 'SN 2011fe보다 약 ' + f0(Math.pow(10, 0.4 * Math.abs(snAbs(CURVES.sn11fe) - Mabs))) + '배 어두워요' : 'SN 2011fe보다 ' + f1(Math.abs(snAbs(CURVES.sn11fe) - Mabs)) + '등급 어두워요(약 ' + f0(Math.pow(10, 0.4 * Math.abs(snAbs(CURVES.sn11fe) - Mabs))) + '분의 1). 초신성마다 최대 광도가 달라요.', A.w - 28, PHONE ? 11.5 : 12.5, { color: '#b45309', weight: 800 });
    // ---- 스펙트럼선
    panel(V.x, V.y, V.w, V.h, { r: 14 });
    T(V.x + 14, V.y + 24 * FS, '🌈 스펙트럼선 이동으로 속도 재기 (SN 2011fe)', PHONE ? 12 : 13.5, '#1e293b', 'left', 800);
    const sx = V.x + 16, sw = V.w - 32, sy = V.y + 40 * FS, sh2 = PHONE ? 34 : 38, X = (nm) => sx + (nm - 600) / 50 * sw;
    const gr = ctx.createLinearGradient(sx, 0, sx + sw, 0); ['#fbbf24', '#fb923c', '#ef4444', '#b91c1c'].forEach((col, i, a) => gr.addColorStop(i / (a.length - 1), col)); ctx.fillStyle = gr; rr(sx, sy, sw, sh2, 8).fill();
    const ph = 0.5 + 0.5 * Math.sin(t * 1.4), shown = clamp(CU.sweep * 2, 0, 1), obsX = lerpN2(X(SNd.rest), X(SNd.obs), is11 ? Math.max(shown, 0.001) : 1);
    ctx.strokeStyle = '#fff'; ctx.setLineDash([4, 3]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(SNd.rest), sy - 4); ctx.lineTo(X(SNd.rest), sy + sh2 + 4); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#0f172a'; ctx.fillRect(obsX - 3, sy, 6, sh2);
    D.arrow(X(SNd.rest) - 5, sy + sh2 + 14, obsX + 2, sy + sh2 + 14, { color: '#2563eb', width: 2.5, head: 8 });
    T(X(SNd.rest), sy + sh2 + 34 * Math.min(FS, 1.1), '정지 ' + f1(SNd.rest) + ' nm', 11.5, '#475569', 'center', 800); T(X(SNd.obs) - 4, sy + sh2 + 52 * Math.min(FS, 1.1), '관측 ' + f1(SNd.obs) + ' nm (청색 이동)', 11.5, '#1d4ed8', 'center', 800);
    const vy = sy + sh2 + 76 * Math.min(FS, 1.12);
    T(V.x + 14, vy, 'Δλ / λ = (' + f1(SNd.obs) + ' − ' + f1(SNd.rest) + ') / ' + f1(SNd.rest) + ' = ' + sg(SNd.f, 3), sz, '#334155', 'left', 800);
    T(V.x + 14, vy + 22 * FS, 'v = ' + fN(Math.abs(SNd.f), 3) + ' × 3.0×10⁵ km/s ≈ 1×10⁴ km/s', sz + 1, '#15803d', 'left', 800);
    T(V.x + 14, vy + 44 * FS, '하루에 약 9×10⁸ km씩 바깥층이 퍼져 나가요', sz, '#b45309', 'left', 800);
  }
  const lerpN2 = (a, b, k) => a + (b - a) * k;
  const sg = (x, d) => (x < 0 ? '−' : '') + fN(Math.abs(x), d);

  /* ================= 화면 전환 · 조작 ================= */
  function setView(v) {
    if (S.view !== v) { S.view = v; S.fade = 1; parts.clear(); CU.sweep = 0; CU.hold = 0; if (v === 'sn') { CU.sweep = 0; } }
    updateCtl();
  }
  function updateCtl() {
    const free = FREE();
    $('#modeSeg').hidden = !free;
    modeBtns.forEach((b) => b.classList.toggle('on', b.dataset.view === S.view));
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !c.dataset.modes.split(' ').includes(S.view); });
    $('#calcPer').hidden = !(S.view === 'curves' && (S.flags.calcPer || free)); $('#calcAmp').hidden = !(S.view === 'curves' && (S.flags.calcAmp || free));
    $('#critBox').hidden = !(S.view === 'classify' && (S.flags.crit || free)); $('#noteCls').hidden = !(S.view === 'classify' && !(S.flags.crit || free));
    $('#ordBox').hidden = !(S.view === 'periods' && (S.flags.ord || free)); $('#calcRR').hidden = !(S.view === 'periods' && (S.flags.calcRR || free));
    $('#calcSN').hidden = !(S.view === 'sn' && (S.flags.calcSN || free)); $('#calcSNL').hidden = !(S.view === 'sn' && (S.flags.calcSNL || free)); $('#factBox').hidden = !(S.view === 'sn' && (S.flags.fact || free));
    $('#tbLabel').textContent = VIEW_LABEL[S.view];
    $$('#grpTool .opt').forEach((b) => b.classList.toggle('on', +b.dataset.k === CU.tool));
    $$('#grpCrit .opt').forEach((b) => b.classList.toggle('on', CL.crit[+b.dataset.k]));
    $$('#grpScale .opt').forEach((b) => b.classList.toggle('on', +b.dataset.k === PE.sc));
    $$('#grpOrd .opt').forEach((b) => { const k = +b.dataset.k, pos = PE.ord.indexOf(k); b.classList.toggle('on', pos >= 0); b.disabled = pos >= 0; b.innerHTML = (pos >= 0 ? (pos + 1) + '번째<br>' : '') + ['δ Cep', 'RR Lyr', '미라'][k]; });
    $$('#grpSN .opt').forEach((b) => b.classList.toggle('on', +b.dataset.k === SN.sel));
    $$('#grpFact .opt').forEach((b) => b.classList.toggle('on', SN.facts[+b.dataset.k]));
  }
  FACTS.forEach((f, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'opt'; b.dataset.k = i; b.textContent = f.t; b.style.fontSize = '13px'; b.style.textAlign = 'left'; b.style.padding = '8px 10px'; $('#grpFact').appendChild(b); });
  $('#grpFact').style.gridTemplateColumns = '1fr';
  modeBtns.forEach((b) => clickable(b, () => setView(b.dataset.view)));
  $$('#grpTool .opt').forEach((b) => clickable(b, () => { CU.tool = +b.dataset.k; updateCtl(); }));
  $$('#grpCrit .opt').forEach((b) => clickable(b, () => { CL.crit[+b.dataset.k] = !CL.crit[+b.dataset.k]; updateCtl(); }));
  $$('#grpScale .opt').forEach((b) => clickable(b, () => { PE.sc = +b.dataset.k; updateCtl(); }));
  $$('#grpOrd .opt').forEach((b) => clickable(b, () => { const k = +b.dataset.k; if (!PE.ord.includes(k)) PE.ord.push(k); updateCtl(); }));
  clickable($('#bOrdReset'), () => { PE.ord = []; PE.ordOk = false; updateCtl(); });
  $$('#grpSN .opt').forEach((b) => clickable(b, () => { SN.sel = +b.dataset.k; CU.sweep = 0; CU.hold = 0; updateCtl(); }));
  $$('#grpFact .opt').forEach((b) => clickable(b, () => { SN.facts[+b.dataset.k] = !SN.facts[+b.dataset.k]; updateCtl(); }));
  $('#inPer').addEventListener('input', () => { const v = numOf('inPer'); CU.perOk = v != null && v >= 5.1 && v <= 5.7; chkIn('inPer', CU.perOk); });
  $('#inAmp').addEventListener('input', () => { const v = numOf('inAmp'); CU.ampOk = v != null && v >= 0.8 && v <= 1.0; chkIn('inAmp', CU.ampOk); });
  $('#inRR').addEventListener('input', () => { const v = numOf('inRR'); PE.rrOk = v != null && v >= 1.7 && v <= 1.9; chkIn('inRR', PE.rrOk); });
  $('#inSNM').addEventListener('input', () => { const v = numM('inSNM'); const was = SN.mOk; SN.mOk = v != null && Math.abs(v - snAbs(CURVES.sn11fe)) <= 0.25; chkIn('inSNM', SN.mOk); if (SN.mOk && !was) ptsBurst(LSn().A.x + LSn().A.w / 2, LSn().A.y + 110); });
  $('#inSNL').addEventListener('input', () => { const v = numM('inSNL'); const was = SN.lOk; const L9 = snL(CURVES.sn11fe) / 1e9; SN.lOk = v != null && v >= L9 * 0.88 && v <= L9 * 1.13; chkIn('inSNL', SN.lOk); if (SN.lOk && !was) ptsBurst(LSn().A.x + LSn().A.w / 2, LSn().A.y + 140); });

  SciSim.pointer(view, {
    down(p) { if (S.view === 'curves') return cuDown(p); if (S.view === 'classify') { const r = cCl.down(p); updateCtl(); return r; } return false; },
    move(p) { if (S.view === 'curves') cuMove(p); else if (S.view === 'classify') cCl.move(p); },
    up(p) { if (S.view === 'curves') CU.drag = -1; else if (S.view === 'classify') { cCl.up(p); updateCtl(); } },
    hover(p) {
      if (S.view === 'classify') return cCl.hit(p) ? 'pointer' : '';
      if (S.view === 'curves') { for (let i = 0; i < 8; i++) if (inR(p, thumbRect(i))) return 'pointer'; const g = cGeom(CURVES[ORDER[CU.sel]], LCu().P, PO()); if (p.x > g.ix && p.x < g.ix + g.iw && p.y > g.top && p.y < g.top + g.ph) return CU.tool ? 'ns-resize' : 'ew-resize'; }
      return '';
    },
  });

  /* ================= 미션 ================= */
  const nCrit = () => CL.crit.filter(Boolean).length;
  const critOk = () => CL.crit[0] && CL.crit[2] && !CL.crit[1] && !CL.crit[3];
  const sn11 = CURVES.sn11fe, sn11M = snAbs(sn11), sn11L = snL(sn11);
  const levels = [
    {
      title: '광도 곡선: 시간에 따른 밝기', short: '광도 곡선', icon: '📈', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 별의 밝기가 변하는 것은 모두 같은 현상일까? 초신성의 빛은 무엇을 알려 줄까?</p>' +
        '<div class="si-link">🔗 <b>이 단원 앞 차시들에서</b> 겉보기 등급과 절대 등급(M = m + 5 − 5 log d)을 배웠고, <b>통합과학</b>에서는 초신성이 무거운 원소를 우주로 퍼뜨린다고 배웠어요. 이번에는 밝기가 시간에 따라 변하는 별 <b>변광성</b>의 <b>광도 곡선</b>을 읽어요.</div>' +
        '<p>광도 곡선은 가로축이 시간, 세로축이 겉보기 등급이에요. 등급은 <b>클수록 어두우므로</b> 이 그래프에서는 <b>위쪽이 더 어두워요</b>(눈금 방향 주의!). 곡선 8개를 살펴보며 주기가 보이는지, 얼마나 변하는지, 갑자기 밝아지는지 알아봐요. (변광의 원인이 되는 물리는 다루지 않아요.)</p>',
      features: ['curves'],
      setup() { setView('curves'); },
      recap: '광도 곡선에서 주기(같은 모양이 반복되는 간격)와 진폭(최대와 최소 등급의 차)을 읽을 수 있어요. 등급은 클수록 어두워요.',
      summary: '<ul><li><b>광도 곡선</b>: 시간에 따른 겉보기 등급 그래프. 등급은 <b>클수록 어두워서</b> 이 그래프의 위쪽이 더 어두운 때예요. (논문에서는 밝은 쪽이 위로 가게 뒤집어 그리기도 해서 눈금 방향을 먼저 확인해요.)</li><li><b>주기</b> = 같은 모양이 반복되는 간격, <b>진폭</b> = 최대와 최소 등급의 차. δ Cep는 주기 약 5.4일(5.366일), 진폭 0.9등급(3.5 ~ 4.4등급)이에요.</li><li>δ Cep는 밝아지는 부분이 빠르고 어두워지는 부분이 느린 <b>비대칭 톱니 모양</b>이에요.</li></ul>',
      missions: [
        {
          title: 'δ Cep의 주기 읽기',
          goal: '곡선 카드에서 <b>δ Cep</b>의 곡선을 열고, 같은 모양이 반복되는 간격 <b>주기 P(일)</b>를 재서 입력하세요.',
          hint: '"시간 재기"의 파란 선 두 개를 이웃한 두 꼭대기(가장 어두운 때)에 맞추면 Δt가 나와요. 20일 동안 같은 모양이 약 3.7번 반복돼요.',
          setup() { CU.sel = 0; CU.tool = 0; CU.perOk = false; S.flags.calcPer = true; clrIn('inPer'); setView('curves'); },
          check: () => CU.perOk && CU.sel === 0,
          hold: 0.5,
          status: () => mark(CU.sel === 0) + ' δ Cep 곡선 &nbsp; ' + mark(CU.perOk) + ' P = ' + ($('#inPer').value.trim() || '—') + ' 일',
          explain: 'δ Cep의 주기는 약 <b>5.4일</b>(5.366일)이에요. 20일 동안 같은 모양이 약 3.7번 반복돼요.',
        },
        {
          title: 'δ Cep의 진폭 읽기', manual: true,
          goal: '같은 곡선에서 <b>최대와 최소 등급의 차(진폭)</b>를 재서 입력하고 확인을 누르세요.',
          hint: '"등급 재기"의 보라 선 두 개를 가장 어두울 때(약 4.4)와 가장 밝을 때(약 3.5)에 맞춰요. 차는 4.4 − 3.5 = 0.9예요.',
          setup() { CU.sel = 0; CU.tool = 1; CU.ampOk = false; S.flags.calcAmp = true; clrIn('inAmp'); setView('curves'); },
          check() { if (CU.ampOk && CU.sel === 0) return true; if (CU.sel !== 0) return 'δ Cep 곡선을 열어 주세요.'; return numOf('inAmp') == null ? '진폭을 입력해 주세요.' : '아직 알맞지 않아요. 가장 어두운 등급(약 4.4)과 가장 밝은 등급(약 3.5)의 차를 구해 보세요.'; },
          status: () => mark(CU.ampOk) + ' 진폭 = ' + ($('#inAmp').value.trim() || '—') + ' 등급',
          explain: '진폭 = 4.4 − 3.5 = <b>0.9등급</b>이에요. 밝기로는 약 2.3배(2.512^0.9) 변해요.',
        },
        {
          type: 'quiz', title: '곡선 위쪽은 더 밝을까?',
          goal: '이 광도 곡선에서 곡선이 <b>위로 올라간 부분</b>은 별이 어떤 때일까요?',
          setup() { setView('curves'); },
          choices: ['등급 숫자가 커진 때라서 더 어두운 때예요', '위로 올라갈수록 별이 더 밝아진 때예요', '위아래는 밝기와 상관이 없어요', '별이 지구에서 더 가까워진 때예요'],
          answer: 0,
          feedback: ['', '등급은 클수록 어두워요. 세로축의 위쪽은 등급이 큰 쪽이라 더 어두운 때예요. 축 옆의 "어두움 ↑" 표시를 확인하세요.', '세로축은 겉보기 등급이라 밝기를 나타내요. 위쪽이 어두운 쪽이에요.', '곡선은 별까지의 거리가 아니라 겉보기 밝기의 변화를 나타내요.'],
          explain: '등급은 <b>클수록 어두워요</b>. 그래서 이 그래프에서 위로 올라간 부분은 더 어두운 때이고, 아래로 내려간 부분이 더 밝은 때예요.',
        },
      ],
    },
    {
      title: '분류하기: 맥동과 폭발', short: '분류하기', icon: '🗂', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 곡선에서 주기와 진폭을 읽었어요. 이제 8개 곡선을 <b>모양</b>으로 비교해 변광성의 종류를 가려요.</div>' +
        '<p>별이 규칙적으로 부풀었다 줄어들면서 밝기가 변하는 <b>맥동 변광성</b>과, 갑자기 폭발해 밝아진 뒤 어두워지는 <b>폭발 변광성</b>을 구분해요. (맥동의 기작과 초신성의 종류·폭발 과정은 다루지 않아요.) 알골처럼 별이 서로를 가려서 어두워지는 <b>식변광성</b>은 참고로 따로 구별해요.</p>',
      features: ['classify'],
      setup() { setView('classify'); },
      recap: '규칙적으로 반복되면 맥동 변광성, 갑자기 밝아진 뒤 어두워지기만 하면 폭발 변광성이에요. 반복되어도 폭발인 왜소 신성이 있어요.',
      summary: '<ul><li><b>맥동 변광성</b>(δ Cep, RR Lyr, 미라): 같은 모양이 <b>규칙적으로 반복</b>돼요.</li><li><b>폭발 변광성</b>(신성, 왜소 신성, 초신성): <b>갑자기 밝아진 뒤 어두워지기만</b> 해요. 신성은 한 번 폭발하면 다시 폭발하지 않고, 초신성은 은하 하나만큼 밝아요(신성은 최대 절대 등급 약 −7 ~ −9, 초신성은 약 −15 ~ −20).</li><li>왜소 신성(SS Cyg)은 약 50일마다 폭발이 되풀이되지만 모양이 규칙적인 맥동이 아니라 <b>갑작스러운 증광 후 감소</b>라서 폭발 변광성이에요.</li><li><b>식변광성</b>(알골)은 별 자체가 변하는 것이 아니라 두 별이 서로를 가려서 어두워져요(곡선에 주 극소와 부 극소가 번갈아 나타나요).</li></ul>',
      missions: [
        {
          title: '곡선 8개 분류하기', manual: true,
          goal: '곡선 카드 8장을 <b>맥동 변광성 · 폭발 변광성 · 식변광성</b> 상자에 알맞게 넣고 확인하세요.',
          hint: '같은 모양이 규칙적으로 반복되는 곡선은 맥동, 갑자기 밝아진 뒤 어두워지기만 하는 곡선은 폭발이에요. 평평하다가 번갈아 깊게·얕게 어두워지는 곡선은 식변광성이에요.',
          setup() { cCl.reset(); setView('classify'); },
          check() {
            const n = cCl.counts();
            if (n.placed < 8) return '아직 상자에 넣지 않은 카드가 ' + (8 - n.placed) + '장 있어요.';
            cCl.items.forEach((i) => { i.wrong = !cCl.isRight(i); });
            return n.right === 8 ? true : '빨간 테두리 카드 ' + (8 - n.right) + '장이 알맞지 않아요. 반복되는지, 갑자기 밝아지는지 다시 보세요.';
          },
          status: () => mark(cCl.counts().placed === 8) + ' 넣은 카드 ' + cCl.counts().placed + ' / 8 &nbsp; ' + mark(cCl.counts().right === 8) + ' 맞게 ' + cCl.counts().right + ' / 8',
          explain: '<b>맥동</b>: δ Cep, RR Lyr, 미라. <b>폭발</b>: V1500 Cyg(신성), SS Cyg(왜소 신성), SN 1987A, SN 2011fe(초신성). <b>식변광성</b>: 알골(별이 서로를 가려 어두워져요).',
        },
        {
          title: '판별 기준 2개 고르기',
          goal: '맥동 변광성과 폭발 변광성을 구분하는 데 쓸 <b>판별 기준 2개</b>를 고르세요.',
          hint: '곡선 모양에서 "같은 모양이 반복되는가"와 "갑자기 밝아진 뒤 어두워지기만 하는가"를 살펴봐요. 별 이름이나 그림의 길이는 기준이 못 돼요.',
          setup() { CL.crit = [false, false, false, false]; S.flags.crit = true; setView('classify'); },
          check: () => critOk(),
          hold: 0.5,
          status: () => mark(nCrit() === 2) + ' 고른 기준 ' + nCrit() + ' / 2 &nbsp; ' + mark(critOk()) + ' 알맞은 기준',
          explain: '<b>주기적 반복 여부</b>와 <b>갑작스러운 증광 뒤 단조 감소</b>가 기준이에요. 증광 속도가 매우 빠르고(며칠 이내) 다시 같은 모양으로 반복되지 않으면 폭발 변광성이에요.',
        },
        {
          type: 'quiz', title: '반복되는 왜소 신성은?',
          goal: '왜소 신성(SS Cyg)은 약 50일마다 <b>폭발이 되풀이돼요</b>. 그런데도 폭발 변광성으로 분류하는 까닭은?',
          setup() { setView('classify'); },
          choices: ['곡선이 규칙적인 부풀음이 아니라 갑자기 밝아진 뒤 어두워지는 모양이기 때문이에요', '반복되는 별은 모두 맥동 변광성이기 때문이에요', '왜소 신성은 한 번만 폭발하기 때문이에요', '왜소 신성은 밝기가 변하지 않기 때문이에요'],
          answer: 0,
          feedback: ['', '반복된다고 맥동은 아니에요. 맥동은 매끄럽게 오르내리고, 왜소 신성은 평소에 어둡다가 갑자기 밝아지고 어두워지는 모양이에요.', 'SS Cyg는 되풀이하지만 모양이 갑작스러운 증광과 감소예요. 한 번만 폭발하는 것은 신성이에요.', '곡선을 보면 12등급에서 8.5등급까지 크게 변해요.'],
          explain: '판별은 <b>반복 여부</b>만이 아니라 <b>곡선의 모양</b>으로 해요. 왜소 신성은 평소 어둡다가 갑자기 밝아진 뒤 어두워지기만 하고, 맥동 변광성은 매끄럽게 오르내려요.',
        },
      ],
    },
    {
      title: '주기 읽기: 세 맥동 변광성', short: '주기 읽기', icon: '⏱', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 맥동 변광성은 같은 모양이 규칙적으로 반복된다고 분류했어요. 맥동 변광성이라도 <b>주기</b>가 별마다 아주 달라요.</div>' +
        '<p>δ Cep(5.4일), RR Lyr(0.57일), 미라(332일)를 <b>같은 시간 눈금</b>으로 겹쳐 보며 주기와 진폭을 비교해요. 시간 눈금(2일·20일·1000일)을 바꾸면 곡선이 어떻게 보이는지 살펴봐요. (맥동이 일어나는 원인은 다루지 않아요. 세페이드의 주기-광도 관계는 Ⅲ단원에서 써요.)</p>',
      features: ['periods'],
      setup() { setView('periods'); },
      recap: '맥동 변광성의 주기는 0.57일부터 332일까지 달라요. 주기는 시간 눈금을 맞춰 비교해야 보여요.',
      summary: '<ul><li><b>RR Lyr</b>: 주기 0.567일(약 13.6시간), 7.1 ~ 8.1등급 → 하루에 약 1.8번(1 / 0.567) 밝아졌다 어두워져요.</li><li><b>δ Cep</b>: 주기 5.366일, 3.5 ~ 4.4등급(진폭 0.9). <b>미라</b>: 주기 332일, 2.0 ~ 10.1등급(진폭 8.1), 주기와 최대 밝기가 매번 조금씩 달라요.</li><li>세 별 중 주기가 가장 긴 미라의 진폭이 가장 커요. 하지만 RR Lyr(1.0)와 δ Cep(0.9)는 주기가 10배 가까이 달라도 진폭이 비슷해서, 주기와 진폭이 언제나 비례하는 것은 아니에요.</li><li>시간 눈금이 맞지 않으면 주기를 읽을 수 없어요(빠른 변광은 띠로, 느린 변광은 직선으로 보여요).</li></ul>',
      missions: [
        {
          title: '주기가 짧은 순서로 배열하기', manual: true,
          goal: '세 곡선을 보고 <b>주기가 짧은 별부터</b> 차례로 눌러 순서를 정하세요. (시간 눈금을 바꿔 보세요)',
          hint: '2일 눈금에서는 RR Lyr가 여러 번 반복되고, 20일 눈금에서는 δ Cep가 몇 번 반복돼요. 1000일 눈금에서야 미라의 반복이 보여요.',
          setup() { PE.ord = []; PE.ordOk = false; S.flags.ord = true; setView('periods'); },
          check() {
            if (PE.ord.length < 3) return '세 별을 모두 눌러 순서를 정해 주세요.';
            const ok = PE.ord[0] === 1 && PE.ord[1] === 0 && PE.ord[2] === 2;
            if (ok) { PE.ordOk = true; return true; }
            return '순서가 알맞지 않아요. 한 번 반복에 걸리는 시간이 가장 짧은 별부터 골라 보세요. "다시 고르기"로 처음부터 할 수 있어요.';
          },
          status: () => mark(PE.ord.length === 3) + ' 고른 별 ' + PE.ord.length + ' / 3 &nbsp; ' + mark(PE.ordOk) + ' 순서 맞음',
          explain: '주기는 <b>RR Lyr(0.567일) → δ Cep(5.366일) → 미라(332일)</b> 순서로 길어져요. 세 별의 주기가 600배 가까이 차이 나요.',
        },
        {
          title: 'RR Lyr의 하루 변광 횟수',
          goal: 'RR Lyr의 주기는 <b>0.567일</b>이에요. <b>하루 동안 몇 번</b> 밝아졌다 어두워지는지 계산해 입력하세요.',
          hint: '횟수 = 1일 / 주기 = 1 / 0.567 ≈ 1.76번이에요. (약 1.8번)',
          setup() { PE.rrOk = false; S.flags.calcRR = true; clrIn('inRR'); PE.sc = 0; setView('periods'); },
          check: () => PE.rrOk,
          hold: 0.4,
          status: () => mark(PE.rrOk) + ' 횟수 = ' + ($('#inRR').value.trim() || '—') + ' 번/일',
          explain: '1 / 0.567 ≈ <b>1.8번</b>이에요. 2일 눈금에서 RR Lyr의 곡선이 약 3.5번 반복되는 것과 같아요.',
        },
      ],
    },
    {
      title: '초신성: 광도 곡선에서 알아내기', short: '초신성', icon: '💥', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계들에서</b> 초신성이 폭발 변광성임을 알았어요. 이제 <b>거리 지수</b>(M = m + 5 − 5 log d), 광도(L / L☉ = 10^(0.4 (4.83 − M))), <b>도플러 효과</b>(Δλ / λ = v / c)로 초신성에서 <b>어떤 사실을 알 수 있는지</b> 추론해요.</div>' +
        '<p>M101 은하의 SN 2011fe(6.4 Mpc)와 대마젤란 은하의 SN 1987A(51 kpc)의 최대 밝기와 거리로 절대 등급과 광도를 구하고, 스펙트럼선의 이동으로 방출 물질의 속도를 읽어요. (초신성의 종류와 폭발 과정은 다루지 않고 관측 사실만 다뤄요.)</p>',
      features: ['sn'],
      setup() { setView('sn'); },
      recap: '초신성은 최대일 때 은하 하나에 견줄 만큼 밝고, 바깥층이 초속 약 1만 km로 퍼져 나가며, 초신성마다 최대 광도가 달라요.',
      summary: '<ul><li><b>SN 2011fe</b>(m = 9.9, d = 6.4 Mpc): M = 9.9 + 5 − 5 log(6.4×10⁶) ≈ <b>−19.1</b> → L = 10^(0.4 × (4.83 + 19.1)) ≈ <b>3.8×10⁹ L☉</b>(태양의 약 40억 배, 은하 하나의 광도에 견줄 정도). 약 30일 동안 낸 빛 에너지는 약 3.8×10⁴² J로 태양이 약 3억 년 동안 내는 에너지예요.</li><li><b>SN 1987A</b>(m = 2.9, d = 51 kpc): M ≈ <b>−15.6</b>으로 SN 2011fe보다 약 3.5등급(약 25배) 어두워요 → 초신성마다 최대 광도가 달라요.</li><li><b>방출 물질의 속도</b>: 스펙트럼선이 Δλ / λ ≈ −0.033만큼 청색으로 이동 → v = 0.033 × 3.0×10⁵ km/s ≈ <b>1×10⁴ km/s</b>(하루 약 9×10⁸ km 팽창). 별의 바깥층이 우주로 흩어져 무거운 원소를 성간 공간에 보태요.</li><li>최대 광도가 거의 같은 부류의 초신성은 먼 은하까지의 거리를 재는 <b>표준 촛불</b>로 쓰여요.</li></ul>',
      missions: [
        {
          title: 'SN 2011fe의 절대 등급',
          goal: '<b>SN 2011fe</b>를 고르고, 최대 겉보기 등급 m = 9.9와 거리 d = 6.4 Mpc(6.4×10⁶ pc)로 <b>절대 등급 M</b>을 구해 입력하세요.',
          hint: 'M = m + 5 − 5 log d = 9.9 + 5 − 5 × log(6.4×10⁶) = 14.9 − 5 × 6.806 = 14.9 − 34.03 ≈ −19.1이에요.',
          setup() { SN.sel = 0; SN.mOk = false; S.flags.calcSN = true; clrIn('inSNM'); setView('sn'); },
          check: () => SN.mOk && SN.sel === 0,
          hold: 0.4,
          status: () => mark(SN.sel === 0) + ' SN 2011fe &nbsp; ' + mark(SN.mOk) + ' M = ' + ($('#inSNM').value.trim() || '—'),
          explain: 'M = 9.9 + 5 − 5 log(6.4×10⁶) ≈ <b>−19.1</b>이에요. 태양의 절대 등급(4.83)보다 약 24등급 밝아요.',
        },
        {
          title: '광도를 태양 광도로 바꾸기',
          goal: 'M = −19.1을 <b>L / L☉ = 10^(0.4 × (4.83 − M))</b>에 넣어 SN 2011fe의 광도를 <b>10⁹ L☉</b> 단위로 입력하세요.',
          hint: '4.83 − (−19.1) = 23.9, 0.4 × 23.9 = 9.58이에요. 10^9.58 ≈ 3.8×10⁹이므로 입력값은 약 3.8이에요.',
          setup() { SN.sel = 0; SN.lOk = false; S.flags.calcSNL = true; clrIn('inSNL'); setView('sn'); },
          check: () => SN.lOk && SN.sel === 0,
          hold: 0.4,
          status: () => mark(SN.lOk) + ' L = ' + ($('#inSNL').value.trim() || '—') + ' ×10⁹ L☉',
          explain: 'L ≈ <b>3.8×10⁹ L☉</b>(태양의 약 40억 배)예요. 은하 하나가 내는 빛의 몇 분의 1에 해당하는 엄청난 광도예요.',
        },
        {
          title: '초신성이 알려 주는 사실 고르기', manual: true,
          goal: '초신성의 관측 자료에서 알 수 있는 사실 <b>4개</b>를 고르고 확인하세요. (6개 중 2개는 틀려요)',
          hint: '광도 값(은하 하나에 견줄 정도), 스펙트럼선 이동(바깥층의 속도), 두 초신성의 최대 광도 비교, 그리고 먼 은하의 거리 측정에 쓰는 것을 떠올려 보세요. 맥동이나 50일 반복은 초신성이 아니에요.',
          setup() { SN.facts.fill(false); S.flags.fact = true; setView('sn'); },
          check() {
            const n = SN.facts.filter(Boolean).length;
            if (n !== 4) return '사실 카드를 정확히 4개 골라 주세요. (지금 ' + n + '개)';
            const ok = FACTS.every((f, i) => f.ok === SN.facts[i]);
            return ok ? true : '틀린 카드가 섞여 있어요. 초신성은 한 번 폭발하는 사건이고, 맥동이나 주기적 반복과는 달라요.';
          },
          status: () => mark(SN.facts.filter(Boolean).length === 4) + ' 고른 카드 ' + SN.facts.filter(Boolean).length + ' / 4',
          explain: '초신성은 <b>은하 하나에 견줄 만큼 밝고</b>, 스펙트럼선의 이동으로 바깥층이 <b>초속 약 1만 km</b>로 퍼져 나가는 것을 알 수 있어요. <b>초신성마다 최대 광도가 달라요</b>(2011fe는 1987A보다 약 25배 밝아요). 최대 광도가 거의 같은 부류는 먼 은하의 <b>거리를 재는 표준 촛불</b>로 쓰여요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hu-variable-stars', mount: '#game', badge: '변광성 탐정', homeHref: '../../index.html#hu',
    featureLabels: { curves: '📈 광도 곡선 8개 · 재는 도구', classify: '🗂 곡선 분류 상자 · 판별 기준', periods: '⏱ 세 맥동 변광성 시간 눈금 비교', sn: '💥 초신성 광도 계산 · 스펙트럼선 이동' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ================= 읽음 칸 ================= */
  function readouts() {
    const v = S.view, free = FREE();
    if (v === 'curves') {
      const c = CURVES[ORDER[CU.sel]], g = cGeom(c, LCu().P, PO()), dtv = Math.abs(CU.tm[1] - CU.tm[0]) * (g.t1 - g.t0), dm = Math.abs(CU.mm[1] - CU.mm[0]) * (c.mD - c.mB);
      setReadouts(['고른 별', c.name, CU.tool ? '등급 차 Δ등급' : '시간 간격 Δt', CU.tool ? f2(dm) + '등급' : (dtv >= 100 ? f0(dtv) : f2(dtv)) + c.unit, '종류', KIND[c.kind].n]);
    } else if (v === 'classify') { const n = cCl.counts(); setReadouts(['넣은 카드', n.placed + ' / 8', '알맞게 넣은 카드', n.right + ' / 8', '상자', '3개']); }
    else if (v === 'periods') setReadouts(['시간 눈금', SCALES[PE.sc] + '일', '고른 순서', PE.ord.length ? PE.ord.map((k) => ['δ Cep', 'RR Lyr', '미라'][k]).join(' → ') : '—', '주기 순서', PE.ordOk || free ? '맞음' : '?']);
    else { const c = CURVES[SN.sel === 0 ? 'sn11fe' : 'sn87a'], show = SN.sel === 1 || (SN.mOk || free); setReadouts(['고른 초신성', c.name, '절대 등급 M', show ? sg(snAbs(c), 1) : '?', '광도 L', SN.sel === 1 || SN.lOk || free ? f1(snL(c) / 1e9) + '×10⁹ L☉' : '?']); }
  }

  /* ================= 루프 ================= */
  updateCtl();
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    view.apply();
    ctx.fillStyle = '#e8eef8'; ctx.fillRect(0, 0, VW, VH);
    switch (S.view) {
      case 'curves': drawCurves(dt, t); break;
      case 'classify': drawClassify(dt, t); break;
      case 'periods': drawPeriods(dt, t); break;
      default: drawSn(dt, t);
    }
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(232,238,248,' + (S.fade * 0.85).toFixed(3) + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = approach(S.fade, 0, dt, 9); }
    drawFlash(dt, PHONE ? 14 : 12);
    readouts();
  });

  window.__sim = { S, VW, VH, get game() { return game; }, setView, updateCtl, CURVES, ORDER, CLS_ORDER, CU, CL, PE, SN, cCl, FACTS, thumbRect, LCu, LCl, LPe, LSn, cGeom, snAbs, snL, SNd, brightOf };
})();
