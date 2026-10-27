/* =========================================================
   행성우주과학 Ⅰ. 우주탐사와 행성계 - 생명가능지대 (7차시)
   성취기준 [12행우01-05] 외계 행성계 탐사의 원리를 이해하고, 외계 행성에 생명체가 존재할 수 있는 조건과 외계 생명체의 존재 가능성에 대해 논증할 수 있다. (생명가능지대·외계 생명)
   ① 모형: 별과 지대 (L = R²(T/5800)⁴, HZ = 0.95√L ~ 1.4√L AU)
   ② 탐구: 별의 온도 (M·K·G·F형의 HZ, 수명, 단점)
   ③ 분석: 행성 판정 (S = L/a², T_eq = 255 K × S^¼)
   ④ 적용: 외계 생명 (증거 카드, 주장–근거–추론, N = 별 수 × 비율)
   다루지 않음: 기후 모델 계산, 조석 가열의 정량, 생물 지표 가스의 화학, 드레이크 방정식의 전개(간이 추정만).
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
        if (it.icon) T(x + 8, y + h * 0.5 + 8, it.icon, 22, '#000', 'left', 700);
        const tx = x + (it.icon ? 40 : 10);
        ctx.save(); rr(x, y, w, h, 11); ctx.clip();
        T(tx, it.sub ? y + h * 0.4 : y + h * 0.5 + 5 * FS, it.label, 14, '#1e293b', 'left', 800);
        if (it.sub) T(tx, y + h * 0.4 + 16 * FS, it.sub, 12.5, '#64748b', 'left', 700);
        ctx.restore();
      }
      ctx.restore();
    }
    return C;
  }

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

  initStage('#e8eef8', 800, 620, 480, 860, 1.25);
  if (PHONE) view.canvas.style.touchAction = 'pan-y';

  /* ================= 자료 ================= */
  const Lof = (T_, R_) => R_ * R_ * Math.pow(T_ / 5800, 4);
  const hzIn = (L_) => 0.95 * Math.sqrt(L_), hzOut = (L_) => 1.4 * Math.sqrt(L_);
  const Teq = (S_) => 255 * Math.pow(S_, 0.25);
  const STAR = [
    { n: 'M형', T: 3000, R: 0.15, M: 0.12, c: '#f87171', note: '조석 고정과 강한 플레어가 단점이에요' },
    { n: 'K형', T: 4500, R: 0.7, M: 0.7, c: '#fb923c', note: '수명이 길고 비교적 안정적이에요' },
    { n: 'G형 (태양)', T: 5800, R: 1, M: 1, c: '#fbbf24', note: '우리 태양이에요 (수명 약 100억 년)' },
    { n: 'F형', T: 6500, R: 1.3, M: 1.3, c: '#fde68a', note: 'HZ가 넓지만 수명이 짧아요' },
  ];
  STAR.forEach((s) => { s.L = Lof(s.T, s.R); s.in = hzIn(s.L); s.out = hzOut(s.L); s.life = 10 * s.M / s.L; });   // life: 수명 (Gyr)
  const lifeTxt = (g) => '약 ' + (g >= 100 ? f0(Math.round(g / 10) * 10) : g >= 20 ? f0(g) : f1(g)) + ' Gyr';
  const PLN5 = [
    { n: '프록시마 b', star: '프록시마 센타우리 (M형)', L: 0.0017, a: 0.0485, c: '#f87171' },
    { n: '트라피스트-1 e', star: '트라피스트-1 (M형)', L: 0.00055, a: 0.0292, c: '#fb923c' },
    { n: '케플러-452 b', star: '케플러-452 (G형)', L: 1.2, a: 1.046, c: '#fbbf24' },
    { n: '트라피스트-1 b', star: '트라피스트-1 (M형)', L: 0.00055, a: 0.0115, c: '#fb923c' },
    { n: '페가수스자리 51번 별 b', star: '페가수스자리 51번 별 (G형)', L: 1.3, a: 0.0529, c: '#fde68a' },
  ];
  PLN5.forEach((p) => { p.S = p.L / (p.a * p.a); p.T = Teq(p.S); p.inHz = p.a >= hzIn(p.L) && p.a <= hzOut(p.L); p.short = p.n.replace('페가수스자리 51번 별', '51 Peg'); });
  const EV = [
    { n: '별이 아주 많아요', sub: '은하 별 약 2×10¹¹개', bin: 0, t: '우리은하에 별이 약 2×10¹¹개 있고, 그중 10~30 %에 생명가능지대의 지구 크기 행성이 있다는 추정이 있어요. 가능한 장소가 많아요.' },
    { n: '액체 물이 필요해요', sub: '지구 생명의 조건', bin: 0, t: '지구의 모든 생명은 액체 물이 필요해요. 그래서 액체 물이 있을 수 있는 곳(생명가능지대)을 먼저 찾아요.' },
    { n: '극한 환경의 생물', sub: '열수구·남극 얼음 속', bin: 0, t: '깊은 바다의 열수구나 남극 얼음 속에서도 생물이 살아요. 생명이 살 수 있는 조건이 생각보다 넓어요.' },
    { n: '지하 바다', sub: '엔셀라두스·유로파', bin: 0, t: '토성의 위성 엔셀라두스와 목성의 위성 유로파는 얼음 지각 아래에 바다가 있어요. 생명가능지대 밖에도 액체 물이 있을 수 있어요.' },
    { n: '발생 확률을 몰라요', sub: '표본이 지구 하나뿐', bin: 1, t: '생명이 생길 확률을 알려면 비교할 사례가 필요한데, 생명이 확인된 곳은 지구 하나뿐이라 확률을 정할 수 없어요.' },
    { n: '직접 증거가 없어요', sub: '외계 생명은 아직 미발견', bin: 1, t: '지금까지 외계 생명의 직접 증거는 발견되지 않았어요.' },
    { n: '생체 지표 탐색', sub: '대기의 산소·메테인', bin: 2, t: '망원경으로 외계 행성 대기에 산소와 메테인이 함께 있는지 등 생체 지표를 조사하고 있어요. 앞으로 확인할 수 있는 방법이에요.' },
    { n: 'HZ 안이라도 몰라요', sub: '대기·자기장·질량 필요', bin: 1, t: '생명가능지대 안이어도 대기, 자기장, 알맞은 질량이 없으면 액체 물이 없을 수 있어요. HZ는 가능성일 뿐이에요.' },
  ];
  const EVBIN = [{ label: '👍 가능성을 높이는 근거', color: '#16a34a' }, { label: '⚠ 한계와 불확실성', color: '#dc2626' }, { label: '🔭 앞으로 알아낼 방법', color: '#2563eb' }];
  const CLAIMS = ['외계 생명은 반드시 존재해요', '존재할 가능성은 있지만 아직 증거는 없어요', '외계 생명은 절대 존재하지 않아요'];
  const FOR_IDX = [0, 1, 2, 3], AGAINST_IDX = [4, 5, 7];
  const nsTxt = (v) => f1(v) + '×10¹¹ 개';

  /* ================= 상태 ================= */
  const S = {
    view: 'zone', clock: 0, fade: 0,
    zn: { T: 5800, R: 1, d: 1, ok: false, wH: 0, wC: 0, wO: 1, drag: false },
    cm: { Tc: 5800, ok: false, pick: -1, pickOk: false, vals: [false, false, false, false] },
    pl: { sel: -1, show: PLN5.map(() => false), sOk: false },
    ev: { claim: -1, fr: -1, ag: -1, tilt: 0, ok: false },
    dk: { ns: 1, fr: 0.1, p: -6, ok: false, roll: 0 },
    flags: { calcHz: false, calcCmp: false, pickCmp: false, calcS: false, claim: false, calcN: false },
  };
  let game = null;
  const FREE = () => !!(game && game.free);
  const VIEW_LABEL = { zone: '🌞 별과 생명가능지대', compare: '🌡 별의 온도와 생명가능지대', planets: '🪐 외계 행성 5개 판정', evidence: '⚖ 외계 생명의 증거', drake: '🔢 HZ 지구형 행성은 몇 개?' };
  const modeBtns = $$('#modeSeg button');

  /* =========================================================
     ① 별과 지대: 광도 L, 생명가능지대 띠, 행성 표면 상태
     ========================================================= */
  const ZN = S.zn;
  const znL = () => Lof(ZN.T, ZN.R);
  const znS = () => znL() / (ZN.d * ZN.d);
  const znState = () => { const L_ = znL(); return ZN.d < hzIn(L_) ? 0 : ZN.d > hzOut(L_) ? 2 : 1; };       // 0 증발 1 액체 2 얼음
  const STN = ['너무 뜨거워요: 물이 증발', '액체 물이 있을 수 있어요', '너무 추워요: 물이 얼음'];
  function LZn() { return PHONE ? { P: { x: 8, y: 8, w: 464, h: 420 }, I: { x: 8, y: 436, w: 464, h: 416 } } : { P: { x: 10, y: 8, w: 780, h: 336 }, I: { x: 10, y: 352, w: 780, h: 260 } }; }
  function znGeom() { const { P } = LZn(), ix = P.x + 44, iw = P.w - 44 - 20, ay = P.y + P.h * (PHONE ? 0.52 : 0.52); return { P, ix, iw, ay, X: (d) => ix + (Math.log10(d) + 2) / 2.8 * iw }; }
  const hzShow = () => ZN.ok || FREE();
  function drawPlanetIcon(x, y, r, t, wH, wC, wO) {
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    g.addColorStop(0, mixc('#7dd3fc', '#bae6fd', 0.4)); g.addColorStop(1, '#1d4ed8'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    ctx.fillStyle = 'rgba(34,197,94,.75)'; ctx.beginPath(); ctx.ellipse(x - r * 0.25, y - r * 0.15, r * 0.35, r * 0.22, 0.4, 0, TAU); ctx.ellipse(x + r * 0.35, y + r * 0.3, r * 0.25, r * 0.16, -0.3, 0, TAU); ctx.fill();
    if (wH > 0.01) { const h = ctx.createRadialGradient(x, y, r * 0.1, x, y, r); h.addColorStop(0, rgba('#fb923c', 0.65 * wH)); h.addColorStop(1, rgba('#b91c1c', 0.85 * wH)); ctx.fillStyle = h; ctx.fillRect(x - r, y - r, 2 * r, 2 * r); ctx.fillStyle = rgba('#e5e7eb', 0.5 * wH); for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(x - r * 0.5 + i * r * 0.33, y - r * 0.3 + Math.sin(t * 2 + i) * r * 0.1, r * 0.18, 0, TAU); ctx.fill(); } }
    if (wC > 0.01) { ctx.fillStyle = rgba('#f8fafc', 0.85 * wC); ctx.fillRect(x - r, y - r, 2 * r, 2 * r); ctx.strokeStyle = rgba('#93c5fd', 0.8 * wC); ctx.lineWidth = 1.5; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x + i * r * 0.4 - r * 0.3, y - r); ctx.lineTo(x + i * r * 0.4 + r * 0.3, y + r); ctx.stroke(); } }
    const sh = ctx.createRadialGradient(x - r * 0.4, y - r * 0.45, r * 0.1, x, y, r * 1.1); sh.addColorStop(0, 'rgba(255,255,255,.3)'); sh.addColorStop(0.6, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.45)'); ctx.fillStyle = sh; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    ctx.restore();
  }
  function drawZone(dt, t) {
    const { P, ix, iw, ay, X } = znGeom(), I = LZn().I, L_ = znL(), st = znState();
    sm(ZN, 'wH', st === 0 ? 1 : 0, dt, 8); sm(ZN, 'wC', st === 2 ? 1 : 0, dt, 8);
    D.shadow(() => { ctx.fillStyle = '#0b1230'; rr(P.x, P.y, P.w, P.h, 14).fill(); }, { blur: 6, y: 2 });
    ctx.save(); rr(P.x, P.y, P.w, P.h, 14); ctx.clip(); spaceBg(P.x, P.y, P.w, P.h, t, '#0b1230', '#16224a'); ctx.fillStyle = 'rgba(8,14,40,.4)'; ctx.fillRect(P.x, P.y, P.w, P.h);
    // HZ 띠
    const x0 = X(hzIn(L_)), x1 = X(hzOut(L_)), top = P.y + 40 * FS, bot = P.y + P.h - (PHONE ? 150 : 96);
    const g = ctx.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, 'rgba(74,222,128,.38)'); g.addColorStop(0.5, 'rgba(34,197,94,.5)'); g.addColorStop(1, 'rgba(74,222,128,.3)');
    ctx.fillStyle = g; ctx.fillRect(clamp(x0, ix, ix + iw), top, clamp(x1, ix, ix + iw) - clamp(x0, ix, ix + iw), bot - top);
    ctx.strokeStyle = 'rgba(134,239,172,.9)'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]); [x0, x1].forEach((x) => { if (x >= ix && x <= ix + iw) { ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, bot); ctx.stroke(); } }); ctx.setLineDash([]);
    outlineT(clamp((x0 + x1) / 2, ix + 50, ix + iw - 50), top + 16, '생명가능지대 (HZ)', PHONE ? 11.5 : 13, '#bbf7d0', 'center');
    if (hzShow()) outlineT(clamp((x0 + x1) / 2, ix + 70, ix + iw - 70), top + 34 * Math.min(FS, 1.15), f2(hzIn(L_)) + ' ~ ' + f2(hzOut(L_)) + ' AU', PHONE ? 11.5 : 12.5, '#dcfce7', 'center');
    // 축
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ix, bot); ctx.lineTo(ix + iw, bot); ctx.stroke();
    [0.01, 0.1, 1, 5].forEach((d) => { const x = X(d); ctx.beginPath(); ctx.moveTo(x, bot - 5); ctx.lineTo(x, bot + 5); ctx.stroke(); outlineT(x, bot + 20, d + ' AU', 11.5, '#cbd5e1', 'center'); });
    // 태양계 행성 (참고)
    [['금성', 0.723], ['지구', 1], ['화성', 1.524]].forEach(([n, d]) => { const x = X(d); D.sphere(x, bot, 4.5, '#94a3b8', { gloss: false }); if (!PHONE || n === '지구') outlineT(x, bot - 10, n, 11, '#cbd5e1', 'center'); });
    // 별
    const sr = 12 + 20 * Math.sqrt(ZN.R) * 0.8, sc = starColor(ZN.T);
    D.glow(ix - 10, bot - 40, sr * 3, sc, 0.45); D.sphere(ix - 10, bot - 40, sr, sc, { gloss: true, light: '#ffffff', dark: shade(sc, -0.3) });
    ctx.restore();
    outlineT(P.x + 14, P.y + 24 * FS, '🌞 중심별 둘레의 어느 거리에서 액체 물이 있을 수 있을까?', PHONE ? 11.5 : 13.5, '#e2e8f0', 'left');
    // 내 행성 (끌어 보세요)
    const px = X(ZN.d), py = bot - (PHONE ? 70 : 78);
    D.dashedLine(px, py + 28, px, bot, { color: 'rgba(226,232,240,.6)', width: 1.5, dash: [3, 4] });
    D.shadow(() => drawPlanetIcon(px, py, PHONE ? 24 : 26, t, ZN.wH, ZN.wC, 1), { blur: 6, y: 3 });
    D.ring(px, py, 32, t, { color: '#fbbf24', width: 2, speed: 1.2 });
    outlineT(px, py - 38, '← 끌어 보세요 →', 11.5, '#fde68a', 'center');
    // 세 가지 상태 카드
    const cw = (P.w - 24 - 16) / 3, cy0 = P.y + P.h - (PHONE ? 118 : 66);
    STN.forEach((s_, i) => {
      const x = P.x + 12 + i * (cw + 8), on = st === i, col = ['#dc2626', '#16a34a', '#2563eb'][i];
      ctx.fillStyle = on ? rgba(col, 0.9) : 'rgba(255,255,255,.12)'; rr(x, cy0, cw, PHONE ? 54 : 46, 10).fill();
      ctx.strokeStyle = on ? '#fff' : 'rgba(255,255,255,.25)'; ctx.lineWidth = on ? 2.5 : 1; rr(x, cy0, cw, PHONE ? 54 : 46, 10).stroke();
      T(x + cw / 2, cy0 + 20 * Math.min(FS, 1.1), ['🔥 증발', '💧 액체 물', '🧊 얼음'][i], 13.5, '#fff', 'center', 800);
      T(x + cw / 2, cy0 + 38 * Math.min(FS, 1.1), ['S가 커요', 'S 약 0.5~1.1', 'S가 작아요'][i], 11.5, on ? '#fff' : '#cbd5e1', 'center', 700);
    });
    // 정보 판
    panel(I.x, I.y, I.w, I.h, { r: 14 });
    T(I.x + 14, I.y + 24 * FS, '🌡 별의 광도와 생명가능지대', 14.5, '#1e293b', 'left', 800);
    let yy = I.y + 50 * FS;
    const rows = [['표면 온도 T / 반지름 R', f0(ZN.T) + ' K / ' + f2(ZN.R) + ' R☉'], ['광도 L = R² (T / 5800)⁴', f3(L_) + ' L☉'], ['HZ 안쪽 0.95√L, 바깥쪽 1.4√L', hzShow() ? f2(hzIn(L_)) + ' ~ ' + f2(hzOut(L_)) + ' AU' : '?'], ['내 행성: 거리 d / 받는 복사 S = L / d²', f2(ZN.d) + ' AU / ' + (znS() >= 100 ? f0(znS()) : f2(znS()))], ['평형 온도 T_eq = 255 K × S^¼', f0(Teq(znS())) + ' K (' + f0(Teq(znS()) - 273) + ' ℃)']];
    rows.forEach((r) => { T(I.x + 14, yy, r[0], PHONE ? 12.5 : 13.5, '#475569', 'left', 800); T(I.x + I.w - 14, yy, r[1], PHONE ? 12.5 : 13.5, '#1e293b', 'right', 800); yy += (PHONE ? 25 : 27) * FS; });
    yy = drawWrap(I.x + 14, yy + 2, '🔎 ' + STN[st] + '. 태양계(L = 1)에서는 지구가 띠 안에 있고, 금성은 안쪽 밖, 화성은 바깥쪽 가장자리 밖이에요.', I.w - 28, 13, { color: '#0369a1', weight: 800 });
    drawWrap(I.x + 14, yy + 20 * FS, '평형 온도는 알베도 0.3을 가정한 값이에요. 온실 효과가 있으면 지구처럼 약 +33 K 더 따뜻해질 수 있어요.', I.w - 28, 12.5, { color: '#64748b' });
  }
  function znDown(p) { const g = znGeom(); if (p.x >= g.ix - 12 && p.x <= g.ix + g.iw + 12 && p.y >= g.P.y + 30 && p.y <= g.P.y + g.P.h - (PHONE ? 100 : 56)) { znMove(p); return true; } return false; }
  function znMove(p) { const g = znGeom(); const lg = clamp((p.x - g.ix) / g.iw * 2.8 - 2, -1.9, 0.78); ZN.d = Math.round(Math.pow(10, lg) * 1000) / 1000; }
  function znSetStar(k) { const s = STAR[k]; ZN.T = s.T; ZN.R = s.R; setSlider($('#sT'), $('#oT'), s.T, (v) => f0(v) + ' K'); setSlider($('#sR'), $('#oR'), s.R, (v) => f2(v) + ' R☉'); updateCtl(); }
  const znPreset = () => STAR.findIndex((s) => Math.abs(s.T - ZN.T) < 1 && Math.abs(s.R - ZN.R) < 0.001);
  const isK = () => Math.abs(ZN.T - 4500) <= 100 && Math.abs(ZN.R - 0.7) <= 0.051;
  const hzOK = () => isK() && nearRel(numOf('inHi'), hzIn(znL()), 0.08) && nearRel(numOf('inHo'), hzOut(znL()), 0.08);

  /* =========================================================
     ② 별의 온도: M · K · G · F형의 생명가능지대
     ========================================================= */
  const CM = S.cm;
  function LCm() { return PHONE ? { P: { x: 8, y: 8, w: 464, h: 520 }, I: { x: 8, y: 536, w: 464, h: 316 } } : { P: { x: 10, y: 8, w: 780, h: 424 }, I: { x: 10, y: 440, w: 780, h: 172 } }; }
  function cmGeom() { const { P } = LCm(), lw = PHONE ? 92 : 150, rw = PHONE ? 0 : 104, ix = P.x + lw, iw = P.w - lw - rw - 14, top = P.y + 44 * FS, rh = (P.h - 44 * FS - 40) / 5; return { P, ix, iw, top, rh, X: (d) => ix + (Math.log10(d) + 2) / 2.5 * iw }; }
  const cmRows = () => STAR.concat([{ n: '내 별', T: CM.Tc, R: 1, L: Lof(CM.Tc, 1), in: hzIn(Lof(CM.Tc, 1)), out: hzOut(Lof(CM.Tc, 1)), c: starColor(CM.Tc), M: Math.pow(Lof(CM.Tc, 1), 1 / 3.5) }]);
  function drawCompare(dt, t) {
    const g = cmGeom(), { P, ix, iw, top, rh, X } = g, I = LCm().I, rows = cmRows(), shown = CM.ok || FREE();
    panel(P.x, P.y, P.w, P.h, { r: 14 });
    T(P.x + 14, P.y + 24 * FS, '🌡 별이 뜨거울수록 생명가능지대가 멀어져요 (로그 눈금)', PHONE ? 12.5 : 14.5, '#1e293b', 'left', 800);
    // 지구 궤도
    const ex = X(1); D.dashedLine(ex, top - 6, ex, P.y + P.h - 34, { color: '#2563eb', width: 2, dash: [4, 4] }); T(ex, P.y + P.h - 20, '지구 궤도 1 AU', 12, '#1d4ed8', 'center', 800);
    [0.01, 0.1, 1].forEach((d) => { const x = X(d); T(x, P.y + P.h - 6, d + '', 11, '#64748b', 'center', 700); });
    rows.forEach((s, i) => {
      const y = top + i * rh, mid = y + rh / 2;
      ctx.fillStyle = i % 2 ? 'rgba(100,116,139,.05)' : 'rgba(100,116,139,.09)'; rr(P.x + 8, y + 2, P.w - 16, rh - 4, 10).fill();
      const sr = clamp(7 + 9 * Math.sqrt(s.R), 7, 20); D.sphere(P.x + 28, mid, sr * (PHONE ? 0.8 : 1), s.c, { gloss: true, light: '#fff', dark: shade(s.c, -0.3) });
      T(P.x + 50, mid - 2, s.n, PHONE ? 12 : 14, '#1e293b', 'left', 800);
      T(P.x + 50, mid + 15 * Math.min(FS, 1.1), (i < 4 ? f0(s.T) + ' K' : f0(CM.Tc) + ' K') + ' · L ' + (s.L < 0.01 ? f3(s.L) : f2(s.L)), PHONE ? 10 : 11.5, '#64748b', 'left', 700);
      // 띠
      const bx0 = X(s.in), bx1 = X(s.out), bh = Math.min(rh * 0.38, 22);
      ctx.fillStyle = 'rgba(100,116,139,.12)'; rr(ix, mid - bh / 2, iw, bh, bh / 2).fill();
      const gg = ctx.createLinearGradient(bx0, 0, bx1, 0); gg.addColorStop(0, '#86efac'); gg.addColorStop(1, '#16a34a');
      D.shadow(() => { ctx.fillStyle = gg; rr(Math.max(ix, bx0), mid - bh / 2, Math.max(2, Math.min(ix + iw, bx1) - Math.max(ix, bx0)), bh, bh / 2).fill(); }, { blur: 4, y: 1 });
      if (shown || i === 4) T((bx0 + bx1) / 2, mid - bh / 2 - 4, (s.in < 0.1 ? f3(s.in) + ' ~ ' + f3(s.out) : f2(s.in) + ' ~ ' + f2(s.out)) + ' AU', PHONE ? 10.5 : 11.5, '#166534', 'center', 800, { stroke: 'rgba(255,255,255,.9)', strokeWidth: 3 });
      if (!PHONE) {
        const life = i < 4 ? s.life : 10 * s.M / s.L;
        T(P.x + P.w - 12, mid - 2, '수명 ' + lifeTxt(life), 12.5, '#334155', 'right', 800);
        T(P.x + P.w - 12, mid + 15, i === 0 ? '조석 고정·플레어' : i === 3 ? '수명이 짧아요' : i === 4 ? '(R = 1 R☉ 고정)' : '', 11, '#b45309', 'right', 800);
      }
    });
    panel(I.x, I.y, I.w, I.h, { r: 14 });
    T(I.x + 14, I.y + 24 * FS, '📌 표면 온도 → 광도 → 생명가능지대', 14.5, '#1e293b', 'left', 800);
    let yy = drawWrap(I.x + 14, I.y + 50 * FS, 'L ∝ T⁴이라 별이 뜨거울수록 광도가 크게 늘어 HZ가 멀어지고 폭도 넓어져요. 하지만 질량이 큰 별은 수명이 짧아요(지구에 복잡한 생물이 나타나기까지 수십억 년이 걸렸어요).', I.w - 28, 13.5, { color: '#334155' });
    drawWrap(I.x + 14, yy + 22 * FS, 'M형: 띠가 별에 아주 가까워 행성이 조석 고정(한쪽 면만 별을 향함)되고 플레어를 강하게 받아요. (Gyr = 10억 년)', I.w - 28, 13, { color: '#b45309', weight: 800 });
    if (PHONE) { const y2 = I.y + I.h - 80; rows.forEach((s, i) => { T(I.x + 14, y2 + i * 15 * FS * 0.9, s.n + ' 수명 ' + lifeTxt(i < 4 ? s.life : 10 * s.M / s.L), 11.5, '#475569', 'left', 700); }); }
  }

  /* =========================================================
     ③ 행성 판정: S = L / a², T_eq
     ========================================================= */
  const PL = S.pl;
  function LPl() {
    if (PHONE) return { grid: { x: 8, y: 8, w: 464, cols: 2, cardH: 46, gap: 6 }, bins: [{ x: 8, y: 166, w: 228, h: 122 }, { x: 244, y: 166, w: 228, h: 122 }], D: { x: 8, y: 296, w: 464, h: 556 } };
    const bw = (780 - 8) / 2;
    return { grid: { x: 10, y: 8, w: 780, cols: 3, cardH: 52, gap: 8 }, bins: [{ x: 10, y: 128, w: bw, h: 140 }, { x: 10 + bw + 8, y: 128, w: bw, h: 140 }], D: { x: 10, y: 276, w: 780, h: 336 } };
  }
  const cPl = makeClassifier({
    items: PLN5.map((p) => ({ label: p.short, sub: 'L ' + (p.L < 0.01 ? p.L : f2(p.L)) + ' · a ' + p.a + ' AU', bin: p.inHz ? 0 : 1, open: true, chip: p.short, icon: '🪐' })),
    bins: [{ label: '💧 생명가능지대 안', color: '#16a34a' }, { label: '🔥🧊 생명가능지대 밖', color: '#dc2626' }],
    chipCols: 1, minRows: 3,
    layout: () => { const L = LPl(); return { grid: L.grid, bins: L.bins }; },
    onPlace(it, b) {
      it.wrong = b !== it.bin;
      if (it.wrong) { say('「' + it.label + '」은(는) 그 상자가 아니에요. a가 HZ(0.95√L ~ 1.4√L) 안인지 비교해 보세요.', true, 3.4); Sound.fail(); }
      else parts.burst(it.x + it.w / 2, it.y + it.h / 2, { count: 10, speed: 120, colors: ['#16a34a', '#fbbf24'] });
    },
    onChange() { updateCtl(); },
  });
  const plOK = () => cPl.items.every((i) => i.loc != null && cPl.isRight(i));
  const plRevealed = (i) => PL.show[i] || FREE();
  function drawPlanets(dt, t) {
    const L = LPl(), Dp = L.D, i0 = cPl.sel, p = i0 >= 0 ? PLN5[i0] : null;
    panel(Dp.x, Dp.y, Dp.w, Dp.h, { r: 14 });
    if (!p) {
      T(Dp.x + 14, Dp.y + 24 * FS, '🔎 행성 카드를 눌러 보세요', 14.5, '#1e293b', 'left', 800);
      drawWrap(Dp.x + 14, Dp.y + 52 * FS, '카드의 중심별 광도 L과 궤도 반지름 a로 받는 복사 S = L / a²을 구하고, 생명가능지대(S 약 0.5~1.1) 안인지 판정해요.', Dp.w - 28, 13.5, { color: '#64748b' });
    } else {
      T(Dp.x + 14, Dp.y + 24 * FS, '🪐 ' + p.n, 15.5, '#1e293b', 'left', 800);
      T(Dp.x + Dp.w - 14, Dp.y + 24 * FS, p.star, PHONE ? 11 : 12.5, '#64748b', 'right', 700);
      // 로그 축 그림: 별(L)과 행성 위치, HZ 띠
      const ix = Dp.x + 30, iw = Dp.w - 60, ay = Dp.y + (PHONE ? 130 : 120), X = (a) => ix + (Math.log10(a) + 2.2) / 3.2 * iw;
      const x0 = X(hzIn(p.L)), x1 = X(hzOut(p.L));
      ctx.fillStyle = 'rgba(100,116,139,.07)'; rr(ix - 10, ay - 56, iw + 20, 100, 10).fill();
      ctx.fillStyle = 'rgba(34,197,94,.3)'; ctx.fillRect(clamp(x0, ix, ix + iw), ay - 52, Math.max(2, clamp(x1, ix, ix + iw) - clamp(x0, ix, ix + iw)), 76);
      T((x0 + x1) / 2, ay - 56 + 14, 'HZ', 12, '#166534', 'center', 800);
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ix, ay + 24); ctx.lineTo(ix + iw, ay + 24); ctx.stroke();
      [0.01, 0.1, 1].forEach((d) => { const x = X(d); ctx.beginPath(); ctx.moveTo(x, ay + 20); ctx.lineTo(x, ay + 28); ctx.stroke(); T(x, ay + 42, d + ' AU', 11.5, '#64748b', 'center', 700); });
      const sc = starColor(p.T0 || 3000);
      D.glow(ix, ay + 24, 24, p.c, 0.5); D.sphere(ix, ay + 24, 8, p.c, { gloss: true });
      const px = X(p.a), py = ay - 6 + Math.sin(t * 2) * 1.5;
      D.dashedLine(px, py + 12, px, ay + 24, { color: '#64748b', width: 1.5, dash: [3, 3] });
      const inz = p.inHz;
      D.shadow(() => D.sphere(px, py, 11, inz ? '#38bdf8' : '#f97316', { gloss: true }), { blur: 4, y: 2 });
      T(clamp(px, ix + 40, ix + iw - 40), py - 18, p.short + ' (a = ' + p.a + ' AU)', 12, '#1e293b', 'center', 800, { stroke: 'rgba(255,255,255,.9)', strokeWidth: 4 });
      let yy = ay + 70 * FS;
      const rev = plRevealed(i0);
      const rows = [['받는 복사 S = L / a² = ' + (p.L < 0.01 ? p.L : f2(p.L)) + ' / ' + p.a + '²', rev ? (p.S >= 100 ? f0(p.S) : f2(p.S)) : '?'], ['평형 온도 T_eq = 255 K × S^¼', rev ? f0(p.T) + ' K (' + f0(p.T - 273) + ' ℃)' : '?'], ['HZ 범위 0.95√L ~ 1.4√L', rev ? f3(hzIn(p.L)) + ' ~ ' + f3(hzOut(p.L)) + ' AU' : '?']];
      rows.forEach((r) => { T(Dp.x + 14, yy, r[0], PHONE ? 12 : 13.5, '#475569', 'left', 800); T(Dp.x + Dp.w - 14, yy, r[1], PHONE ? 12 : 13.5, rev ? '#15803d' : '#94a3b8', 'right', 800); yy += (PHONE ? 25 : 27) * FS; });
      if (rev) {
        const msg = p.inHz ? '→ a가 HZ 안이에요. 단, 대기가 없으면 표면 온도는 T_eq와 달라요.' : (p.a < hzIn(p.L) ? '→ HZ보다 안쪽이라 너무 뜨거워요 (S가 커요).' : '→ HZ보다 바깥쪽이라 너무 추워요.');
        yy = drawWrap(Dp.x + 14, yy + 2, msg, Dp.w - 28, 13, { color: '#0369a1', weight: 800 });
        if (p.T < 273 && p.inHz) drawWrap(Dp.x + 14, yy + 18 * FS, 'T_eq가 273 K보다 낮아도 온실 효과로 약 +30 K 올라갈 수 있어요.', Dp.w - 28, 12.5, { color: '#b45309', weight: 800 });
      } else drawWrap(Dp.x + 14, yy + 2, '직접 계산하거나 🧮 버튼으로 계산 결과를 확인해요.', Dp.w - 28, 13, { color: '#b45309', weight: 800 });
    }
    cPl.draw(dt, {});
  }

  /* =========================================================
     ④ 외계 생명: 증거 저울, 간이 추정
     ========================================================= */
  const EVS = S.ev;
  function LEv() {
    if (PHONE) return { grid: { x: 8, y: 8, w: 464, cols: 2, cardH: 44, gap: 6 }, bins: [0, 1, 2].map((i) => ({ x: 8, y: 210 + i * 108, w: 464, h: 102 })), E: { x: 8, y: 536, w: 464, h: 316 } };
    const bw = (780 - 16) / 3;
    return { grid: { x: 10, y: 8, w: 780, cols: 4, cardH: 52, gap: 8 }, bins: [0, 1, 2].map((i) => ({ x: 10 + i * (bw + 8), y: 128, w: bw, h: 150 })), E: { x: 10, y: 286, w: 780, h: 326 } };
  }
  const cEv = makeClassifier({
    items: EV.map((e) => ({ label: e.n, sub: e.sub, bin: e.bin, open: true, chip: e.n })),
    bins: EVBIN,
    chipCols: PHONE ? 2 : 1, minRows: PHONE ? 2 : 3,
    layout: () => { const L = LEv(); return { grid: L.grid, bins: L.bins }; },
    onPlace(it, b) {
      it.wrong = b !== it.bin;
      if (it.wrong) { say('「' + it.label + '」은(는) 그 상자가 아니에요. 가능성을 높이는지, 한계인지, 앞으로 알아낼 방법인지 생각해 보세요.', true, 3.6); Sound.fail(); }
      else parts.burst(it.x + it.w / 2, it.y + it.h / 2, { count: 10, speed: 120, colors: [EVBIN[b].color, '#fbbf24'] });
    },
    onChange() { updateCtl(); },
  });
  const evClsOK = () => cEv.items.every((i) => i.loc != null && cEv.isRight(i));
  const evCount = (b) => cEv.items.filter((i) => i.loc === b).length;
  const evSentence = () => (EVS.claim >= 0 ? '나는 "' + CLAIMS[EVS.claim] + '"고 생각해요. ' : '') + (EVS.fr >= 0 ? '왜냐하면 "' + EV[FOR_IDX[EVS.fr]].n + '"는 근거가 있기 때문이에요. ' : '') + (EVS.ag >= 0 ? '다만 "' + EV[AGAINST_IDX[EVS.ag]].n + '"는 한계라서 더 알아봐야 해요.' : '');
  function drawEvidence(dt, t) {
    const L = LEv(), E = L.E;
    panel(E.x, E.y, E.w, E.h, { r: 14 });
    const it = cEv.sel >= 0 ? EV[cEv.sel] : null;
    T(E.x + 14, E.y + 24 * FS, it ? '🃏 ' + it.n : '🃏 증거 카드를 눌러 보세요', 14.5, '#1e293b', 'left', 800);
    const lw = PHONE ? E.w - 28 : E.w * 0.56;
    let yy = drawWrap(E.x + 14, E.y + 50 * FS, it ? it.t : '카드마다 외계 생명의 가능성을 높이는 근거인지, 한계인지, 앞으로 알아낼 방법인지 분류해요.', lw, 13.5, { color: it ? '#334155' : '#64748b' });
    // 저울
    const nL = evCount(0), nR = evCount(1), tgt = clamp((nL - nR) * 4, -14, 14) * DEG;
    EVS.tilt = approach(EVS.tilt, tgt, dt, 4);
    const px = PHONE ? E.x + E.w / 2 : E.x + E.w * 0.78, py = PHONE ? E.y + E.h - 92 : E.y + 96, BL = PHONE ? 112 : 130;
    const yl = py + Math.sin(EVS.tilt) * BL, yr = py - Math.sin(EVS.tilt) * BL, xl = px - Math.cos(EVS.tilt) * BL, xr = px + Math.cos(EVS.tilt) * BL;
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(px, py + (PHONE ? 70 : 150)); ctx.lineTo(px, py); ctx.stroke();
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(xl, yl); ctx.lineTo(xr, yr); ctx.stroke();
    D.sphere(px, py, 8, '#475569', { gloss: true });
    [[xl, yl, '👍', nL, '#16a34a'], [xr, yr, '⚠', nR, '#dc2626']].forEach(([x, y, ic, n, c]) => {
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 28, y + 38); ctx.moveTo(x, y); ctx.lineTo(x + 28, y + 38); ctx.stroke();
      ctx.fillStyle = rgba(c, 0.18); rr(x - 34, y + 36, 68, 28, 10).fill(); ctx.strokeStyle = c; ctx.lineWidth = 2; rr(x - 34, y + 36, 68, 28, 10).stroke();
      T(x, y + 55, ic + ' ' + n + '장', 13, '#1e293b', 'center', 800);
    });
    if (!PHONE) drawWrap(E.x + E.w * 0.56 + 14, E.y + E.h - 40, '증거의 무게를 어떻게 평가하느냐에 따라 사람마다 다르게 판단할 수 있어요.', E.w * 0.42, 12, { color: '#64748b' });
    // 문장
    const s = evSentence();
    const sy = Math.max(yy + 26 * FS, E.y + (PHONE ? 120 : 150));
    if (EVS.claim >= 0 || EVS.fr >= 0 || EVS.ag >= 0) {
      ctx.fillStyle = 'rgba(14,165,233,.09)'; rr(E.x + 10, sy - 16, lw + 8, PHONE ? 118 : 108, 10).fill();
      T(E.x + 18, sy + 2, '✍ 내가 만든 논증', 13, '#0369a1', 'left', 800);
      drawWrap(E.x + 18, sy + 24 * FS, s, lw - 8, 13, { color: '#0f172a', weight: 800 });
    } else if (evClsOK()) drawWrap(E.x + 14, sy, '👏 분류 완료! 오른쪽 아래 도구에서 주장 · 근거 · 한계를 골라 문장을 만들어요.', lw, 13, { color: '#15803d', weight: 800 });
    cEv.draw(dt, {});
  }

  /* ---- 간이 추정 ---- */
  const DK = S.dk;
  function LDk() { return PHONE ? { A: { x: 8, y: 8, w: 464, h: 480 }, B: { x: 8, y: 496, w: 464, h: 356 } } : { A: { x: 10, y: 8, w: 780, h: 310 }, B: { x: 10, y: 326, w: 780, h: 286 } }; }
  const dkN = () => DK.ns * 1e11 * DK.fr;
  function drawDrake(dt, t) {
    const { A, B } = LDk(), N = dkN(), shown = DK.ok || FREE();
    DK.roll = roll(DK.roll, N, dt); if (DK.roll === 0) DK.roll = N;
    panel(A.x, A.y, A.w, A.h, { r: 14 });
    T(A.x + 14, A.y + 24 * FS, '🔢 우리은하에 HZ 지구형 행성은 몇 개나 있을까?', PHONE ? 13 : 14.5, '#1e293b', 'left', 800);
    // 별 100개 점
    const gx = A.x + 20, gy = A.y + 44 * FS, cols = 25, gw = PHONE ? A.w - 40 : 360, step = gw / cols, filled = Math.round(DK.fr * 100);
    for (let i = 0; i < 100; i++) { const x = gx + (i % cols) * step + step / 2, y = gy + Math.floor(i / cols) * step + step / 2; const on = i < filled; ctx.fillStyle = on ? '#16a34a' : '#cbd5e1'; ctx.beginPath(); ctx.arc(x, y, on ? step * 0.34 : step * 0.26, 0, TAU); ctx.fill(); }
    const gyEnd = gy + 4 * step;
    T(gx, gyEnd + 16, '별 100개 중 초록 ' + filled + '개 = HZ 지구형 행성이 있는 별', 12.5, '#475569', 'left', 800);
    // 식
    const by = PHONE ? gyEnd + 40 : gy + 6, bx = PHONE ? A.x + 14 : A.x + 410, bw = PHONE ? A.w - 28 : 360;
    const box = (x, y, w, h, ic, a, b, c, hl) => { D.shadow(() => { ctx.fillStyle = hl ? '#dcfce7' : '#fff'; rr(x, y, w, h, 12).fill(); }, { blur: 5, y: 2 }); ctx.strokeStyle = hl ? '#16a34a' : '#cbd5e1'; ctx.lineWidth = 2; rr(x, y, w, h, 12).stroke(); T(x + 12, y + 22 * Math.min(FS, 1.1), ic + ' ' + a, 12.5, '#64748b', 'left', 800); T(x + w - 12, y + h - 12, b, 16, c, 'right', 800); };
    box(bx, by, bw, PHONE ? 54 : 62, '⭐', '우리은하의 별 수', nsTxt(DK.ns), '#1e293b');
    T(bx + bw / 2, by + (PHONE ? 74 : 84), '×', 20, '#475569', 'center', 800);
    box(bx, by + (PHONE ? 84 : 94), bw, PHONE ? 54 : 62, '🌍', 'HZ 지구형 행성이 있는 별의 비율', f2(DK.fr), '#1e293b');
    T(bx + bw / 2, by + (PHONE ? 158 : 178), '=', 20, '#475569', 'center', 800);
    box(bx, by + (PHONE ? 168 : 188), bw, PHONE ? 58 : 66, '🪐', 'N: HZ 지구형 행성 수', shown ? sci(DK.roll, 1) + ' 개' : '?', shown ? '#15803d' : '#94a3b8', shown);
    // 아래 판
    panel(B.x, B.y, B.w, B.h, { r: 14 });
    T(B.x + 14, B.y + 24 * FS, '🧬 그중 생명이 있는 행성은? N × p', 14.5, '#1e293b', 'left', 800);
    let yy = B.y + 52 * FS;
    const p = Math.pow(10, DK.p), live = N * p;
    yy = drawWrap(B.x + 14, yy, '생명이 생길 확률 p는 지구 한 곳의 사례뿐이라 아무도 몰라요. 슬라이더를 움직여 보세요.', B.w - 28, 13.5, { color: '#334155' });
    const ax = B.x + 36, aw = B.w - 96, ay = yy + 54 * FS;
    // 로그 막대: 1개 ~ 10^11개
    const X = (v) => ax + clamp((Math.log10(Math.max(v, 1e-2)) + 2) / 13, 0, 1) * aw;
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + aw, ay); ctx.stroke();
    [-2, 0, 3, 6, 9, 11].forEach((e) => { const x = X(Math.pow(10, e)); ctx.beginPath(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.moveTo(x, ay - 5); ctx.lineTo(x, ay + 5); ctx.stroke(); T(x, ay + 22, e === -2 ? '0.01' : e === 0 ? '1' : '10' + sup(e), 11.5, '#64748b', 'center', 700); });
    ctx.fillStyle = 'rgba(220,38,38,.12)'; ctx.fillRect(ax, ay - 14, X(1) - ax, 28); T(ax + 4, ay + 40, PHONE ? '빨간 구간: 1개 미만 (우리뿐일 수도)' : '1개 미만: 우리뿐일 수도', 11.5, '#b91c1c', 'left', 800);
    const mx = X(live); D.shadow(() => D.sphere(mx, ay, 9, '#16a34a', { gloss: true }), { blur: 5, y: 2 });
    D.label(clamp(mx, ax + 60, ax + aw - 60), ay - 34, '생명이 있는 행성 ' + (live >= 1e4 ? sci(live, 1) : live >= 10 ? comma(live) : f2(live)) + '개', { bg: '#16a34a', size: 12.5 });
    yy = ay + 52 * FS;
    yy = drawWrap(B.x + 14, yy, 'p = 10' + sup(DK.p) + '이면 ' + (live >= 1e4 ? sci(live, 1) : live >= 10 ? comma(live) : f2(live)) + '개예요. p가 10⁻¹²이면 0.04개(없을 수도), 1에 가까우면 수백억 개예요.', B.w - 28, 13.5, { color: '#0369a1', weight: 800 });
    drawWrap(B.x + 14, yy + 22 * FS, '그래서 HZ 행성이 아무리 많아도 "외계 생명이 있다"고 단정할 수 없고, 반대로 "없다"고도 말할 수 없어요. 증거가 더 필요해요.', B.w - 28, 13.5, { color: '#b45309', weight: 800 });
  }

  /* =========================================================
     컨트롤 · 입력 · 장면 전환
     ========================================================= */
  function setView(v) {
    if (S.view !== v) { S.view = v; S.fade = 1; parts.clear(); }
    updateCtl();
  }
  const mkOpts = (id, arr, fn) => { const g = $(id); arr.forEach((t_, i) => { const e = document.createElement('button'); e.type = 'button'; e.className = 'opt'; e.dataset.k = i; e.style.textAlign = 'left'; e.style.padding = '6px 10px'; e.textContent = t_; g.appendChild(e); clickable(e, () => fn(i)); }); g.style.gridTemplateColumns = '1fr'; };
  mkOpts('#grpClaim', CLAIMS.map((c) => '주장: ' + c), (i) => { EVS.claim = i; updateCtl(); });
  mkOpts('#grpFor', FOR_IDX.map((i) => '근거: ' + EV[i].n), (i) => { EVS.fr = i; updateCtl(); });
  mkOpts('#grpAgainst', AGAINST_IDX.map((i) => '한계: ' + EV[i].n), (i) => { EVS.ag = i; updateCtl(); });
  const cmpOK = () => CM.vals.every(Boolean);
  const dkOK = () => Math.abs(DK.ns - 2) < 0.01 && Math.abs(DK.fr - 0.2) < 0.011 && near(numOf('inN'), 4, 0.2);
  function updateCtl() {
    const free = FREE();
    $('#modeSeg').hidden = !free;
    modeBtns.forEach((b) => b.classList.toggle('on', b.dataset.view === S.view));
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !c.dataset.modes.split(' ').includes(S.view); });
    $('#calcHz').hidden = !(S.view === 'zone' && (S.flags.calcHz || free));
    $('#calcCmp').hidden = !(S.view === 'compare' && (S.flags.calcCmp || free));
    $('#pickCmp').hidden = !(S.view === 'compare' && (S.flags.pickCmp || free));
    $('#calcS').hidden = !(S.view === 'planets' && (S.flags.calcS || free));
    $('#claimBox').hidden = !(S.view === 'evidence' && S.flags.claim && evClsOK());
    $('#evNote').hidden = !(S.view === 'evidence' && !(S.flags.claim && evClsOK()));
    $('#calcN').hidden = !(S.view === 'drake' && (S.flags.calcN || free));
    $('#tbLabel').textContent = VIEW_LABEL[S.view];
    const pi = znPreset();
    $$('#grpStar .opt').forEach((b) => b.classList.toggle('on', +b.dataset.k === pi));
    $$('#grpPick .opt').forEach((b) => b.classList.toggle('on', +b.dataset.k === CM.pick));
    $$('#grpClaim .opt').forEach((b) => b.classList.toggle('on', +b.dataset.k === EVS.claim));
    $$('#grpFor .opt').forEach((b) => b.classList.toggle('on', +b.dataset.k === EVS.fr));
    $$('#grpAgainst .opt').forEach((b) => b.classList.toggle('on', +b.dataset.k === EVS.ag));
    $('#bCalc').disabled = cPl.sel < 0 || (cPl.sel === 0 && !PL.sOk && !free);
    $('#bCalc').title = cPl.sel === 0 && !PL.sOk ? '프록시마 b는 직접 계산해 보세요' : '';
  }
  const sl = (id, oid, fmt, cb) => bindSlider($(id), $(oid), fmt, cb);
  sl('#sT', '#oT', (v) => f0(v) + ' K', (v) => { ZN.T = v; updateCtl(); });
  sl('#sR', '#oR', (v) => f2(v) + ' R☉', (v) => { ZN.R = v; updateCtl(); });
  sl('#sTc', '#oTc', (v) => f0(v) + ' K', (v) => { CM.Tc = v; });
  sl('#sNs', '#oNs', nsTxt, (v) => { DK.ns = v; });
  sl('#sFr', '#oFr', (v) => f2(v), (v) => { DK.fr = v; });
  sl('#sP', '#oP', (v) => '10' + sup(v), (v) => { DK.p = v; });
  modeBtns.forEach((b) => clickable(b, () => setView(b.dataset.view)));
  $$('#grpStar .opt').forEach((b) => clickable(b, () => znSetStar(+b.dataset.k)));
  $$('#grpPick .opt').forEach((b) => clickable(b, () => { CM.pick = +b.dataset.k; updateCtl(); }));
  clickable($('#bCalc'), () => { if (cPl.sel >= 0 && (cPl.sel !== 0 || PL.sOk || FREE())) { PL.show[cPl.sel] = true; updateCtl(); } });
  ['inHi', 'inHo'].forEach((id) => $('#' + id).addEventListener('input', () => { if (hzOK()) { ZN.ok = true; fbIn('inHi', true); fbIn('inHo', true); } }));
  [0, 1, 2, 3].forEach((i) => $('#inC' + i).addEventListener('input', () => { if (nearRel(numOf('inC' + i), STAR[i].in, 0.08)) { CM.vals[i] = true; fbIn('inC' + i, true); if (cmpOK()) CM.ok = true; } }));
  $('#inS').addEventListener('input', () => { if (near(numOf('inS'), PLN5[0].S, 0.04)) { PL.sOk = true; PL.show[0] = true; fbIn('inS', true); updateCtl(); } });
  $('#inN').addEventListener('input', () => { if (dkOK()) { DK.ok = true; fbIn('inN', true); } });
  ['sNs', 'sFr'].forEach((id) => $('#' + id).addEventListener('input', () => { if (DK.ok && !dkOK()) DK.ok = false; }));

  SciSim.pointer(view, {
    down(p) {
      switch (S.view) {
        case 'zone': return znDown(p);
        case 'planets': { const r = cPl.down(p); updateCtl(); return r; }
        case 'evidence': { const r = cEv.down(p); updateCtl(); return r; }
        default: return false;
      }
    },
    move(p) { if (S.view === 'zone') znMove(p); else if (S.view === 'planets') cPl.move(p); else if (S.view === 'evidence') cEv.move(p); },
    up(p) { if (S.view === 'planets') { cPl.up(p); updateCtl(); } else if (S.view === 'evidence') { cEv.up(p); updateCtl(); } },
    hover(p) {
      if (S.view === 'planets') return cPl.hit(p) ? 'pointer' : '';
      if (S.view === 'evidence') return cEv.hit(p) ? 'pointer' : '';
      if (S.view === 'zone') { const g = znGeom(); return p.x > g.ix - 12 && p.x < g.ix + g.iw + 12 && p.y > g.P.y + 30 && p.y < g.P.y + g.P.h - 56 ? 'ew-resize' : ''; }
      return '';
    },
  });

  /* ================= 미션 ================= */
  const levels = [
    {
      title: '별과 지대: 광도로 생명가능지대 찾기', short: '별과 지대', icon: '🌞', phase: '모형',
      intro: '<p class="si-q">❓ 탐구 질문: 중심별이 달라지면 생명이 살 수 있는 궤도도 달라질까? 우리는 우주에서 혼자일까?</p>' +
        '<div class="si-link">🔗 <b>지구시스템과학에서</b> 지구가 받는 복사 S = 1361 / d²(W/m²)와 액체 물이 있는 범위(생명가능지대)를 배웠어요. 이번에는 <b>별의 표면 온도와 반지름</b>으로 광도 L을 구해 어느 별에서나 생명가능지대(HZ)를 계산해요.</div>' +
        '<p>광도는 <b>L = R² (T / 5800)⁴</b>(태양 = 1)이고, 모형의 HZ는 <b>안쪽 0.95√L, 바깥쪽 1.4√L (AU)</b>예요. 연구에 따라 값이 조금씩 달라요. 별을 바꿔 띠가 어떻게 움직이는지 보고, 행성을 끌어 표면 상태를 확인해요.</p>',
      features: ['zone'],
      setup() { znSetStar(2); setView('zone'); },
      recap: 'HZ는 √L에 비례해서 별이 밝을수록 멀어져요. 액체 물이 있을 수 있는 범위로 정하는 까닭은 물이 생명 현상의 필수 요소이기 때문이에요.',
      summary: '<ul><li><b>광도 L = R² (T / 5800)⁴</b> (L☉ 단위). 받는 복사 <b>S = L / a²</b>(a: AU)이고, HZ는 S가 약 0.5 ~ 1.1인 범위: 안쪽 <b>0.95√L</b>, 바깥쪽 <b>1.4√L</b> AU (연구에 따라 달라요).</li><li>태양(L = 1)의 HZ는 약 0.95 ~ 1.4 AU: 지구는 안, 금성(0.72 AU)은 안쪽 밖, 화성(1.52 AU)은 바깥쪽 밖이에요. K형(L = 0.18)은 0.40 ~ 0.59 AU.</li><li>안쪽보다 가까우면 물이 증발하고, 바깥쪽보다 멀면 얼어요. 평형 온도 T_eq = 255 K × S^¼ (알베도 0.3, 지구 255 K).</li><li>HZ는 <b>액체 물이 존재할 수 있는 범위</b>로 정해요. 물은 생명 현상의 용매이자 필수 요소이기 때문이에요.</li></ul>',
      missions: [
        {
          title: 'K형 별의 생명가능지대 계산하기',
          goal: '별을 <b>K형</b>(표면 온도 4500 K, 반지름 0.7 R☉)으로 맞추고, 생명가능지대의 <b>안쪽·바깥쪽 경계(AU)</b>를 계산해 입력하세요.',
          hint: 'L = 0.7² × (4500 / 5800)⁴ ≈ 0.18, √L ≈ 0.42예요. 안쪽 0.95 × 0.42 ≈ 0.40 AU, 바깥쪽 1.4 × 0.42 ≈ 0.59 AU예요. K형 버튼을 누르면 별이 맞춰져요.',
          setup() { znSetStar(2); ZN.ok = false; S.flags.calcHz = true; clrIn('inHi', 'inHo'); setView('zone'); },
          check: () => hzOK(),
          hold: 0.6,
          status: () => mark(isK()) + ' K형 별 (L = ' + f2(znL()) + ') &nbsp; ' + mark(hzOK()) + ' HZ ' + ($('#inHi').value.trim() || '—') + ' ~ ' + ($('#inHo').value.trim() || '—') + ' AU',
          explain: 'K형 별은 L ≈ 0.18이라 √L ≈ 0.42예요. HZ는 <b>0.40 ~ 0.59 AU</b>로 태양의 0.95 ~ 1.4 AU보다 별에 훨씬 가까워요. HZ의 위치는 별의 광도(√L)에 비례해요.',
        },
        {
          type: 'quiz', title: '왜 "액체 물"이 있는 범위일까?',
          goal: '생명가능지대를 <b>액체 물이 존재할 수 있는 범위</b>로 정하는 까닭은?',
          setup() { setView('zone'); },
          choices: ['물은 생명 현상이 일어나는 용매이자 필수 요소여서, 지구 생명의 조건을 기준으로 삼아요', '액체 물이 있으면 반드시 생명이 있기 때문이에요', '물이 없는 행성에는 생명이 절대 있을 수 없다고 증명됐기 때문이에요', '물은 별빛을 강하게 반사해서 관측하기 쉽기 때문이에요'],
          answer: 0,
          feedback: ['', '액체 물은 생명의 필요 조건일 뿐이에요. 물이 있어도 생명이 있다고 단정할 수 없어요.', '아직 지구 생명 하나만 알아서 "절대 불가능"이라고 증명된 적은 없어요. 지금은 지구 생명의 조건을 기준으로 해요.', 'HZ의 기준은 관측 편의가 아니라 생명 현상에 필요한 물이에요.'],
          explain: '지구의 모든 생명은 <b>액체 물</b>이 필요해요. 그래서 알려진 유일한 사례(지구)를 기준으로 액체 물이 있을 수 있는 거리를 생명가능지대로 삼아요.',
        },
      ],
    },
    {
      title: '별의 온도: M·K·G·F형 비교', short: '별의 온도', icon: '🌡', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 별이 밝을수록 HZ가 멀어진다는 것을 알았어요. 별의 표면 온도가 다르면 광도가 크게 달라져요(L ∝ T⁴). 별 4종(M·K·G·F형)의 <b>HZ 띠를 나란히</b> 비교해 봐요. (탐구 활동: 중심별의 표면 온도에 따른 생명가능지대 추론하기)</div>' +
        '<p>온도 슬라이더로 <b>내가 만든 별</b>을 가열해 띠가 바깥으로 움직이는 것도 확인하고, 띠의 폭과 별의 수명을 비교해요.</p>',
      features: ['compare'],
      setup() { setView('compare'); },
      recap: '뜨거운 별일수록 HZ가 멀어지고 넓어져요. 하지만 수명이 짧고, 차가운 M형은 HZ가 별에 가까워 조석 고정과 플레어가 단점이에요.',
      summary: () => '<ul><li><b>HZ 안쪽 경계</b>: ' + STAR.map((s) => s.n.replace(' (태양)', '') + ' ' + (s.in < 0.1 ? f3(s.in) : f2(s.in)) + ' AU').join(' · ') + '. 별이 뜨거울수록 HZ가 멀어지고 폭이 넓어져요.</li><li>수명(Gyr = 10억 년): ' + STAR.map((s) => s.n.replace(' (태양)', '') + ' ' + lifeTxt(s.life)).join(' · ') + '. 질량이 큰 별은 수명이 짧아요(지구에 복잡한 생물이 나타나기까지 수십억 년).</li><li><b>M형</b>: HZ가 별에 아주 가까워 행성이 <b>조석 고정</b>(한쪽 면만 별을 향함)되고 별의 <b>플레어</b>를 강하게 받는 단점이 있어요.</li><li>표면 온도 → 광도(L ∝ T⁴) → HZ(∝ √L)로 이어져요.</li></ul>',
      missions: [
        {
          title: '네 별의 HZ 안쪽 경계 계산하기',
          goal: '표의 광도 L로 네 별(M·K·G·F형)의 <b>HZ 안쪽 경계 0.95√L (AU)</b>를 계산해 입력하세요.',
          hint: 'M형: √0.0016 = 0.04 → 0.038, K형: √0.18 = 0.42 → 0.40, G형: 0.95, F형: √2.7 = 1.64 → 1.55예요.',
          setup() { CM.ok = false; CM.vals = [false, false, false, false]; S.flags.calcCmp = true; clrIn('inC0', 'inC1', 'inC2', 'inC3'); setView('compare'); },
          check: () => cmpOK(),
          hold: 0.6,
          status: () => CM.vals.map((v, i) => mark(v) + ' ' + STAR[i].n.replace(' (태양)', '')).join(' &nbsp; '),
          explain: '안쪽 경계는 <b>M형 0.038 AU, K형 0.40 AU, G형 0.95 AU, F형 1.55 AU</b>예요. 뜨거운 별일수록 HZ가 멀리 있어요.',
        },
        {
          title: '별에 가장 가까운 HZ는?', manual: true,
          goal: '네 별 중 <b>생명가능지대가 별에 가장 가까운</b> 별을 고르세요.',
          hint: '표면 온도가 가장 낮고 광도 L이 가장 작은 별이에요. 띠가 지구 궤도(1 AU)보다 훨씬 안쪽에 있어요.',
          setup() { CM.pick = -1; S.flags.pickCmp = true; setView('compare'); },
          check() { if (CM.pick < 0) return '별을 하나 골라 주세요.'; return CM.pick === 0 ? true : CM.pick === 3 ? 'F형은 가장 뜨거워서 HZ가 가장 멀어요. 반대로 생각해 보세요.' : '표를 보면 더 차갑고 어두운 별이 있어요.'; },
          status: () => '고른 별 ' + (CM.pick < 0 ? '—' : STAR[CM.pick].n.replace(' (태양)', '')),
          explain: '<b>M형</b>의 HZ는 0.038 ~ 0.056 AU로 수성 궤도(0.39 AU)보다도 안쪽이에요. 그래서 행성이 조석 고정되고 플레어의 영향을 많이 받는 단점이 있어요.',
        },
        {
          type: 'quiz', title: '뜨거운 별의 HZ가 먼 까닭',
          goal: '표면 온도가 높은 별일수록 생명가능지대가 <b>멀어지는 까닭</b>은?',
          setup() { setView('compare'); },
          choices: ['광도가 T⁴에 비례해 커져서, 같은 복사를 받는 거리가 √L만큼 멀어지기 때문이에요', '뜨거운 별은 중력이 약해서 행성이 멀리 밀려나기 때문이에요', '뜨거운 별은 수명이 길어서 행성이 천천히 멀어지기 때문이에요', '표면 온도는 HZ와 관계가 없어요'],
          answer: 0,
          feedback: ['', '행성의 궤도는 그대로예요. HZ의 위치만 별의 밝기에 따라 달라져요.', '뜨거운 별은 질량이 커서 수명이 오히려 짧아요(F형 약 5 Gyr).', '표면 온도는 광도 L ∝ T⁴를 정하고 HZ는 √L에 비례해요.'],
          explain: 'L ∝ R² T⁴이라 온도가 높으면 광도가 크게 늘고, 같은 복사 S를 받는 거리는 <b>√L</b>에 비례해 멀어져요. 단, F형은 HZ가 넓지만 수명이 짧고, M형은 조석 고정·플레어가 단점이에요.',
        },
      ],
    },
    {
      title: '행성 판정: 받는 복사로 HZ 안 밖 가리기', short: '행성 판정', icon: '🪐', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계들에서</b> 별마다 HZ 위치가 다르다는 것을 알았어요. 앞 차시에서 찾은 <b>실제 외계 행성</b> 5개가 HZ 안에 있는지 판정해 봐요. 행성이 받는 복사 <b>S = L / a²</b>(지구 = 1)과 <b>평형 온도 T_eq = 255 K × S<sup>1/4</sup></b>를 계산해요.</div>' +
        '<p>카드의 중심별 광도 L과 궤도 반지름 a로 S를 구하고, S가 약 0.5 ~ 1.1이면 생명가능지대 안이에요(경계 포함).</p>',
      features: ['planets'],
      setup() { setView('planets'); },
      recap: 'S = L / a²가 약 0.5 ~ 1.1이면 HZ 안이에요. 프록시마 b·트라피스트-1 e·케플러-452 b가 안, 트라피스트-1 b·51 Peg b는 밖이에요.',
      summary: () => '<ul><li><b>S = L / a²</b>, <b>T_eq = 255 K × S^¼</b>: ' + PLN5.map((p) => p.short + ' S ' + (p.S >= 100 ? f0(p.S) : f2(p.S)) + ' (T_eq ' + f0(p.T) + ' K)').join(' · ') + '.</li><li>HZ 안(S 약 0.5 ~ 1.1): 프록시마 b · 트라피스트-1 e · 케플러-452 b(안쪽 경계). 밖: 트라피스트-1 b(너무 뜨거움) · 51 Peg b(S 약 465, 너무 뜨거움).</li><li>T_eq가 273 K보다 낮아도 온실 효과로 약 +30 K 올라갈 수 있어요(지구는 +33 K).</li><li><b>HZ 안이라고 반드시 생명이 있는 것은 아니에요</b>. 대기·자기장·질량이 있어야 액체 물이 유지돼요.</li></ul>',
      missions: [
        {
          title: '프록시마 b가 받는 복사 S 계산하기',
          goal: '<b>프록시마 b</b>(별의 광도 L = 0.0017, 궤도 반지름 a = 0.0485 AU)가 받는 복사 <b>S = L / a²</b>을 계산해 입력하세요.',
          hint: 'S = 0.0017 / 0.0485² = 0.0017 / 0.00235 ≈ 0.72예요. 지구가 받는 복사(1)의 약 72 %예요.',
          setup() { cPl.reset(); cPl.sel = 0; PL.show = PLN5.map(() => false); PL.sOk = false; S.flags.calcS = true; clrIn('inS'); setView('planets'); },
          check: () => PL.sOk,
          hold: 0.5,
          status: () => mark(PL.sOk) + ' S = ' + ($('#inS').value.trim() || '—'),
          explain: 'S = 0.0017 / 0.0485² ≈ <b>0.72</b>이고 T_eq = 255 × 0.72^¼ ≈ <b>235 K</b>예요. HZ 범위(S 0.5 ~ 1.1) 안이에요.',
        },
        {
          title: '5개 행성의 HZ 안 / 밖 판정', manual: true,
          goal: '행성 카드 5장을 <b>생명가능지대 안</b>과 <b>밖</b> 상자로 나누세요. (🧮 버튼으로 S를 확인할 수 있어요)',
          hint: 'S가 약 0.5 ~ 1.1이면 안이에요. 트라피스트-1 b(S 약 4.2)와 51 Peg b(S 약 465)는 너무 뜨거워요.',
          setup() { cPl.reset(); setView('planets'); },
          check() {
            const pl = cPl.items.filter((i) => i.loc != null).length;
            if (pl < 5) return '아직 상자에 넣지 않은 카드가 ' + (5 - pl) + '장 있어요.';
            const bad = cPl.items.filter((i) => !cPl.isRight(i));
            return bad.length ? '빨간 테두리 카드 ' + bad.length + '장이 알맞지 않아요. S를 계산해 비교해 보세요.' : true;
          },
          status: () => mark(cPl.counts().placed === 5) + ' 분류 ' + cPl.counts().placed + ' / 5 &nbsp; ' + mark(cPl.counts().right === 5) + ' 맞게 ' + cPl.counts().right + ' / 5',
          explain: '<b>안 3개</b>: 프록시마 b(S 0.72), 트라피스트-1 e(S 0.65), 케플러-452 b(S 1.10, 안쪽 경계). <b>밖 2개</b>: 트라피스트-1 b(S 4.2), 51 Peg b(S 465).',
        },
        {
          type: 'quiz', title: 'HZ 안의 행성에는 생명이 있을까?',
          goal: '행성이 <b>생명가능지대 안</b>에 있다는 것은 무엇을 뜻할까요?',
          setup() { setView('planets'); },
          choices: ['액체 물이 있을 수 있는 거리라는 뜻이고, 대기·자기장 등 다른 조건도 필요해요', '그 행성에는 반드시 생명이 있다는 뜻이에요', '표면 온도가 항상 15 ℃라는 뜻이에요', 'HZ 밖의 행성에는 액체 물이 절대 없다는 뜻이에요'],
          answer: 0,
          feedback: ['', 'HZ는 가능성일 뿐이에요. 생명이 있는지는 다른 증거가 필요해요.', 'T_eq가 같아도 대기의 온실 효과에 따라 표면 온도는 달라져요.', '엔셀라두스·유로파처럼 HZ 밖에도 얼음 아래 바다가 있을 수 있어요.'],
          explain: 'S가 지구와 비슷해도 <b>대기가 없으면</b> 표면 온도는 많이 달라요(온실 효과). HZ는 생명의 <b>가능성</b>을 가리키는 지표예요.',
        },
      ],
    },
    {
      title: '외계 생명: 증거로 논증하기', short: '외계 생명', icon: '⚖', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계들에서</b> 외계 행성을 찾고 HZ 안에 있는지 판정했어요. 이제 <b>외계 생명이 존재할 수 있을까?</b>를 증거로 논증해 봐요. 정답을 외우는 것이 아니라 <b>주장 – 근거 – 한계</b>를 연결하는 활동이에요.</div>' +
        '<p>증거 카드 8장을 <b>가능성을 높이는 근거 · 한계와 불확실성 · 앞으로 알아낼 방법</b>으로 나누고, 논증 문장을 만든 뒤 간이 추정(N = 별 수 × 비율)으로 숫자가 무엇을 말하고 무엇을 말하지 못하는지 확인해요.</p>',
      features: ['evidence', 'drake'],
      setup() { setView('evidence'); },
      recap: '행성의 수는 가능성을 높이지만, 생명이 생길 확률과 직접 증거가 없어서 "있다"도 "없다"도 단정할 수 없어요.',
      summary: '<ul><li><b>가능성을 높이는 근거</b>: 별이 약 2×10¹¹개, HZ 지구형 행성 10~30 % 추정 · 지구 생명은 액체 물 필요 · 극한 환경에도 생물 · 엔셀라두스·유로파 지하 바다.</li><li><b>한계</b>: 생명이 생길 확률을 모름(표본 지구 하나) · 직접 증거 없음 · HZ 안이라도 액체 물 보장 못 함. <b>앞으로 알아낼 방법</b>: 대기의 생체 지표(산소·메테인) 탐색.</li><li><b>간이 추정 N = 별 수 × 비율</b>: 2×10¹¹ × 0.2 = <b>4×10¹⁰개</b>. 하지만 생명이 생길 확률 p를 모르므로 N × p는 0개에서 수백억 개까지 어떤 값도 가능해요.</li><li>좋은 논증: "<b>존재할 가능성은 있지만 아직 증거는 없다</b>"처럼 증거와 연결된 주장.</li></ul>',
      missions: [
        {
          title: '증거 분류하고 논증 문장 만들기', manual: true,
          goal: '증거 카드 8장을 세 상자로 나눈 뒤, <b>주장 · 근거 · 한계</b>를 하나씩 골라 증거와 연결된 문장을 완성하세요.',
          hint: '주장은 "존재할 가능성은 있지만 아직 증거는 없어요"처럼 증거에 맞는 표현이어야 해요. 근거는 가능성을 높이는 카드, 한계는 한계 카드에서 골라요.',
          setup() { cEv.reset(); EVS.claim = -1; EVS.fr = -1; EVS.ag = -1; S.flags.claim = true; setView('evidence'); },
          check() {
            const pl = cEv.items.filter((i) => i.loc != null).length;
            if (pl < 8) return '아직 상자에 넣지 않은 카드가 ' + (8 - pl) + '장 있어요.';
            const bad = cEv.items.filter((i) => !cEv.isRight(i));
            if (bad.length) return '빨간 테두리 카드 ' + bad.length + '장이 알맞지 않아요.';
            if (EVS.claim < 0 || EVS.fr < 0 || EVS.ag < 0) return '주장 · 근거 · 한계를 하나씩 모두 골라 주세요.';
            if (EVS.claim === 0) return '"반드시 존재한다"고 하려면 직접 증거가 필요해요. 지금은 증거가 없어요.';
            if (EVS.claim === 2) return '"절대 존재하지 않는다"고 하려면 모든 곳을 조사해야 해요. 그럴 근거도 없어요.';
            EVS.ok = true; return true;
          },
          status: () => mark(evClsOK()) + ' 분류 ' + cEv.counts().right + ' / 8 &nbsp; ' + mark(EVS.claim === 1) + ' 주장 &nbsp; ' + mark(EVS.fr >= 0) + ' 근거 &nbsp; ' + mark(EVS.ag >= 0) + ' 한계',
          explain: '근거 4장(별의 수·물·극한 생물·지하 바다)은 가능성을 높이고, 3장(확률 불명·직접 증거 없음·HZ의 한계)은 한계예요. 그래서 <b>"존재할 가능성은 있지만 아직 증거는 없다"</b>가 증거와 연결된 주장이에요.',
        },
        {
          title: 'HZ 지구형 행성의 수 어림하기',
          goal: '별 수를 <b>2×10¹¹개</b>, 비율을 <b>0.2</b>로 맞추고 <b>N = 별 수 × 비율</b>을 <b>×10¹⁰ 개</b> 단위로 계산해 입력하세요.',
          hint: 'N = 2×10¹¹ × 0.2 = 4×10¹⁰개예요. ×10¹⁰ 단위로는 4를 입력해요.',
          setup() { DK.ns = 1; DK.fr = 0.1; setSlider($('#sNs'), $('#oNs'), 1, nsTxt); setSlider($('#sFr'), $('#oFr'), 0.1, (v) => f2(v)); DK.ok = false; S.flags.calcN = true; clrIn('inN'); setView('drake'); },
          check: () => dkOK(),
          hold: 0.6,
          status: () => mark(Math.abs(DK.ns - 2) < 0.01) + ' 별 수 2×10¹¹ &nbsp; ' + mark(Math.abs(DK.fr - 0.2) < 0.011) + ' 비율 0.2 &nbsp; ' + mark(near(numOf('inN'), 4, 0.2)) + ' N ' + ($('#inN').value.trim() || '—') + '×10¹⁰',
          explain: 'N = 2×10¹¹ × 0.2 = <b>4×10¹⁰개</b>예요. 그런데 이 중 몇 곳에 생명이 있는지는 생명이 생길 확률 p를 알아야 하는데, 아무도 몰라요.',
        },
        {
          type: 'quiz', title: 'HZ 행성이 많으면 외계 생명이 있을까?',
          goal: 'HZ에 있는 행성이 <b>수백억 개</b>나 되어도 "외계 생명이 있다"고 단정할 수 없는 까닭은?',
          setup() { setView('drake'); },
          choices: ['생명이 생길 확률을 모르고, 비교할 표본이 지구 하나뿐이라 숫자만으로는 결론 낼 수 없어요', 'HZ 행성은 모두 가짜로 밝혀졌기 때문이에요', '우주에는 지구 말고는 물이 전혀 없기 때문이에요', '이미 외계 생명이 없다는 직접 증거가 발견됐기 때문이에요'],
          answer: 0,
          feedback: ['', 'HZ 행성 후보는 관측으로 확인된 것이에요. 문제는 생명이 있는지를 모른다는 점이에요.', '엔셀라두스·유로파처럼 태양계 안에도 지하 바다가 있어요.', '"없다"는 증거도 없어요. 직접 증거가 없을 뿐이에요.'],
          explain: 'N × p에서 <b>p(생명이 생길 확률)</b>를 모르면 결과는 0개에서 수백억 개까지 어떤 값도 될 수 있어요. 그래서 "있을 수 있다"와 "있다"를 구분해서 말해야 해요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hu-habitable-zone', mount: '#game', badge: '외계 생명 탐구자', homeHref: '../../index.html#hu',
    featureLabels: { zone: '🌞 별과 HZ 띠 · 행성 끌기', compare: '🌡 별 4종 HZ 비교 · 내 별', planets: '🪐 행성 5개 카드 · S 계산', evidence: '⚖ 증거 카드 · 저울 · 논증 만들기', drake: '🔢 간이 추정 N · p 슬라이더' },
    onFeatures() { updateCtl(); },
    levels,
  });
  levels.forEach((lv) => { if (typeof lv.summary === 'function') lv.summary = lv.summary(); });

  /* ================= 읽음 칸 ================= */
  function readouts() {
    const v = S.view;
    if (v === 'zone') setReadouts(['광도 L', f3(znL()) + ' L☉', '내 행성이 받는 복사 S', znS() >= 100 ? f0(znS()) : f2(znS()), '행성의 상태', ['증발', '액체 물 가능', '얼음'][znState()]]);
    else if (v === 'compare') { const r = cmRows()[4], inz = r.in <= 1 && 1 <= r.out; setReadouts(['내 별의 온도', f0(CM.Tc) + ' K', '내 별의 HZ', f2(r.in) + ' ~ ' + f2(r.out) + ' AU', '지구 궤도(1 AU)', inz ? 'HZ 안' : r.in > 1 ? 'HZ보다 안쪽' : 'HZ보다 바깥쪽']); }
    else if (v === 'planets') { const c = cPl.counts(); setReadouts(['분류한 카드', c.placed + ' / 5', '맞게 분류', c.right + ' / 5', '고른 행성', cPl.sel >= 0 ? PLN5[cPl.sel].short : '—']); }
    else if (v === 'evidence') { const c = cEv.counts(); setReadouts(['분류한 카드', c.placed + ' / 8', '맞게 분류', c.right + ' / 8', '고른 카드', cEv.sel >= 0 ? EV[cEv.sel].n : '—']); }
    else setReadouts(['우리은하의 별 수', nsTxt(DK.ns), 'HZ 지구형 행성 비율', f2(DK.fr), 'N = 별 수 × 비율', DK.ok || FREE() ? sci(dkN(), 1) + ' 개' : '?']);
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
      case 'zone': drawZone(dt, t); break;
      case 'compare': drawCompare(dt, t); break;
      case 'planets': drawPlanets(dt, t); break;
      case 'evidence': drawEvidence(dt, t); break;
      default: drawDrake(dt, t);
    }
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(232,238,248,' + (S.fade * 0.85).toFixed(3) + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = approach(S.fade, 0, dt, 9); }
    drawFlash(dt, PHONE ? 14 : 12);
    readouts();
  });

  window.__sim = { S, VW, VH, get game() { return game; }, setView, updateCtl, STAR, PLN5, EV, ZN, CM, PL, EVS, DK, cPl, cEv, hzOK, znL, znSetStar, evClsOK, plOK, dkOK, hzIn, hzOut, znGeom, LPl, LEv };


})();
